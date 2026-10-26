// Lesson 06 checks: 3D geometry (ethane dihedrals, chair angles, axial/equatorial roles, ring flip, cis/trans), the
// newman-rotator and chair-flip logic, the `chairs` mastery generator (rule re-derived by building both chairs in 3D),
// and the lesson's own steps. Run on its own with `node learn/tests/lesson06.mjs`, or as part of run.mjs.
import { ready, rdkit, canon } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import models from '../data/3d/models.js';
import * as G3 from '../engine/widgets/geom.js';
import * as NC from '../engine/widgets/newman-core.js';
import * as NR from '../engine/widgets/newman-rotator.js';
import * as CC from '../engine/widgets/chair-core.js';
import * as CF from '../engine/widgets/chair-flip.js';
import * as GC from '../engine/generators-chairs.js';
import { generate, generatorForSkill } from '../engine/generators.js';
import { checkInput } from '../engine/steps.js';
import { skillLabel } from '../engine/skills.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R2 = (x) => Math.round(x * 100) / 100;

/** Plane normal of an ordered ring by Newell's method (independent of chair-core's axis formula). */
function newell(pts) {
  const c = G3.mean(pts); let n = [0, 0, 0];
  pts.forEach((p, i) => { n = G3.add(n, G3.cross(G3.sub(p, c), G3.sub(pts[(i + 1) % pts.length], c))); });
  return G3.unit(n);
}
const angToAxis = (v, n) => { const a = G3.vecAngle(v, n); return Math.min(a, 180 - a); };

/** Wedge/dash route: 2D depiction from RDKit, read the flags on the two exocyclic stereo bonds -> cis or trans. */
function wedgeLabel(smiles) {
  const m = rdkit().get_mol(smiles);
  try {
    m.set_new_coords();
    const L = m.get_molblock().split('\n'); const n = +L[3].slice(0, 3), nb = +L[3].slice(3, 6);
    const ringAtoms = new Set();
    const bonds = [];
    for (let i = 0; i < nb; i++) { const l = L[4 + n + i]; bonds.push([+l.slice(0, 3) - 1, +l.slice(3, 6) - 1, +l.slice(9, 12)]); }
    const j = JSON.parse(m.get_json()).molecules[0];
    // ring atoms of the six-membered ring: atoms with two ring bonds; use the SSSR from RDKit's ring info through the json "extensions"? simpler: exocyclic = bond end whose atom is not in any cycle (DFS)
    const adj = Array.from({ length: n }, () => []);
    bonds.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
    // a bond is in a ring if removing it leaves its ends connected
    const inRing = ([a, b]) => { const seen = new Set([a]); const st = [a]; while (st.length) { const x = st.pop(); for (const y of adj[x]) { if ((x === a && y === b) || (x === b && y === a)) continue; if (!seen.has(y)) { seen.add(y); st.push(y); } } } return seen.has(b); };
    const flagged = bonds.filter((b) => b[2] === 1 || b[2] === 6);
    if (flagged.length !== 2 || flagged.some((b) => inRing(b))) return null; // must be exactly the two substituent bonds
    return flagged[0][2] === flagged[1][2] ? 'cis' : 'trans';
  } finally { m.delete(); }
}

export async function lesson06(h) {
  const { ok, eq } = h;
  await ready();
  const L = LESSONS.find((l) => l.id === '06');
  const t0 = Date.now();

  // ------------------------------------------------------------ ethane and bromoethane: dihedrals from the real coordinates
  {
    const nbOf = (id) => { const mb = G3.parseMol(models[id].molblock); return G3.neighbours(mb.bonds, mb.atoms.length); };
    const all9 = (model, pts) => { const c = model.cfg; const fr = model.nb[c.front].filter((j) => j !== c.back), bk = model.nb[c.back].filter((j) => j !== c.front); const out = []; for (const a of fr) for (const b of bk) out.push(G3.dihedral(pts[a], pts[c.front], pts[c.back], pts[b])); return out; };
    const near = (x, targets, tol) => targets.some((t) => Math.abs(((x - t + 540) % 360) - 180) <= tol || Math.abs(Math.abs(x - t) % 360) <= tol || Math.abs(Math.abs(x - t) - 360) <= tol);
    const wrap = (d) => ((d % 360) + 360) % 360;
    for (const id of ['ethane', 'bromoethane']) {
      const cfg = NR.MOLS[id];
      const TOL = id === 'ethane' ? 1.5 : 4; // bromoethane's C-C-Br angle is not exactly tetrahedral, so its H-C-C-H dihedrals sit a few degrees off 60
      const nb = nbOf(id);
      const els = G3.parseMol(models[id].molblock).atoms.map((a) => a.el);
      ok(canon(models[id].molblock) === canon(models[id].smiles), `${id} 3D model matches its SMILES`);
      ok(els[cfg.front] === 'C' && els[cfg.back] === 'C' && nb[cfg.front].includes(cfg.back) && nb[cfg.front].includes(cfg.refFront) && nb[cfg.back].includes(cfg.refBack), `${id} widget atom indices: C-C bond, reference atoms on the right carbons`);
      ok(els[cfg.refBack] === 'H' && (id === 'ethane' ? els[cfg.refFront] === 'H' : els[cfg.refFront] === 'Br'), `${id} reference atoms are ${id === 'ethane' ? 'H and H' : 'Br and H'}`);
      const model = NC.setup(models[id].molblock, cfg);
      ok([...model.rot].every((j) => els[j] === 'H' && nb[cfg.back].includes(j)) && model.rot.size === 3, `${id} only the three rear hydrogens rotate`);
      // the embedded conformer itself is staggered
      const base = G3.parseMol(models[id].molblock).atoms.map(G3.P);
      const d0 = all9(model, base);
      ok(d0.every((d) => near(d, [60, -60, 180], 2)), `${id} RDKit conformer is staggered: all nine H-C-C-X dihedrals are 60/-60/180 (got ${d0.map((d) => Math.round(d)).join(',')})`);
      // rotating the back group by theta: staggered 60/180/300 and eclipsed 0/120/240 for the reference pair, and all nine dihedrals follow
      for (const th of [60, 180, 300]) {
        const pts = NC.poseAt(model, th);
        ok(Math.abs(((NC.thetaOf(model, pts) - th + 540) % 360) - 180) < 0.01, `${id} theta ${th} produced by rotating the coordinates`);
        ok(all9(model, pts).every((d) => near(d, [60, -60, 180], TOL)), `${id} staggered at theta=${th}: nine dihedrals are 60/-60/180 within ${TOL} (got ${all9(model, pts).map(Math.round)})`);
      }
      for (const th of [0, 120, 240]) {
        const pts = NC.poseAt(model, th);
        const d = all9(model, pts);
        ok(d.filter((x) => Math.abs(x) < TOL).length === 3 && d.every((x) => near(x, [0, 120, -120], TOL)), `${id} eclipsed at theta=${th}: three dihedrals are 0, the rest +/-120 within ${TOL} (got ${d.map(Math.round)})`);
      }
      // rotation is rigid: every bond length and bond angle unchanged
      for (const th of [17, 83, 211]) {
        const pts = NC.poseAt(model, th);
        const bl = model.bonds.map(([a, b]) => G3.len(G3.sub(pts[a], pts[b])));
        const bl0 = model.bonds.map(([a, b]) => G3.len(G3.sub(model.base[a], model.base[b])));
        ok(bl.every((x, i) => Math.abs(x - bl0[i]) < 1e-9), `${id} rotation keeps bond lengths (theta ${th})`);
        const ang = (P) => model.rot.size && [...model.rot].map((j) => G3.angleDeg(P[j], P[cfg.back], P[cfg.front]));
        ok(ang(pts).every((x, i) => Math.abs(x - ang(model.base)[i]) < 1e-6), `${id} rotation keeps X-C-C angles (theta ${th})`);
      }
      ok(NC.poseAt(model, model.theta0).every((p, i) => G3.len(G3.sub(p, model.base[i])) < 1e-6), `${id} poseAt(theta0) gives back the embedded geometry`);
      // Newman projection derived from the rotated coordinates: staggered = 60 degrees between a front and the nearest rear bond; eclipsed = 0
      const sep = (nm) => Math.min(...nm.front.flatMap((f) => nm.back.map((b) => { const d = Math.abs(f.ang - b.ang) % 360; return Math.min(d, 360 - d); })));
      ok(Math.abs(sep(NC.newman(model, NC.poseAt(model, 60))) - 60) < TOL && Math.abs(sep(NC.newman(model, NC.poseAt(model, 0)))) < TOL, `${id} Newman: staggered gives 60 degree gaps, eclipsed 0`);
      // Newman angle of the rear reference bond relative to the front one equals -theta (clockwise dihedral)
      for (const th of [25, 100, 200, 333]) {
        const nm = NC.newman(model, NC.poseAt(model, th));
        const f = nm.front.find((x) => x.i === cfg.refFront).ang, b = nm.back.find((x) => x.i === cfg.refBack).ang;
        ok(Math.abs(((b - f + th + 540) % 360) - 180) < 0.01, `${id} Newman screen angle follows the dihedral at ${th}`);
      }
      ok(nm3(NC.newman(model, NC.poseAt(model, 60))), `${id} three front and three rear bonds in the projection`);
    }
    function nm3(n) { return n.front.length === 3 && n.back.length === 3; }
    // the molblock handed to 3Dmol (toMolblock) is valid and describes the same molecule, for every pose we send it
    for (const id of ['ethane', 'bromoethane']) {
      const mdl = NC.setup(models[id].molblock, NR.MOLS[id]);
      for (const th of [0, 60, 100, 250]) { const sc = NR.sceneAt(mdl, th); ok(canon(G3.toMolblock(sc.atoms, sc.bonds)) === canon(models[id].smiles), `${id} scene at ${th} deg -> molblock for 3Dmol is ${models[id].smiles}`); }
    }
    {
      const mm = CC.load('methylcyclohexane');
      for (const t of [0, 0.4, 1]) { const sc = CF.chairScene(mm, t, { reveal: true }); ok(sc.atoms.every((a) => Number.isFinite(a.x + a.y + a.z)), `chair scene at t=${t} has finite coordinates`); if (t === 0 || t === 1) ok(canon(G3.toMolblock(sc.atoms, sc.bonds)) === canon(mm.entry.smiles), `chair scene at t=${t} -> molblock for 3Dmol is methylcyclohexane`); }
    }
    // energy model
    eq([0, 30, 60, 90, 120, 180, 240, 300].map((t) => R2(NC.energy(t, 12))), [12, 6, 0, 6, 12, 0, 12, 0], 'ethane E = 6(1+cos 3 theta) at 0,30,60,90,120,180,240,300');
    const curve = Array.from({ length: 361 }, (_, t) => NC.energy(t, 12));
    ok(Math.abs(Math.max(...curve) - 12) < 1e-9 && Math.abs(Math.min(...curve)) < 1e-9, 'ethane curve: minimum 0, maximum 12 kJ/mol');
    ok(Math.abs(NC.energy(0, 12) / 3 - 4.0) < 1e-9, 'ethane: 12 kJ/mol = 3 x 4.0 kJ/mol H-H eclipsing');
    ok(NC.EMAX.ethane === 12 && NC.EMAX.bromoethane === 15 && NR.MOLS.ethane.emax === 12 && NR.MOLS.bromoethane.emax === 15, 'barriers: ethane 12, bromoethane 15.0 kJ/mol');
    // lock grading: the staggered minimum and eclipsed maximum are found, anything else is refused with a diagnosis
    for (const t of [60, 180, 300, 57, 64]) ok(NC.lockGrade(t, 'min').ok && !NC.lockGrade(t, 'max').ok, `lock min accepts ${t}`);
    for (const t of [0, 120, 240, 360, 355, 124]) ok(NC.lockGrade(t, 'max').ok && !NC.lockGrade(t, 'min').ok, `lock max accepts ${t}`);
    for (const t of [30, 90, 150]) ok(!NC.lockGrade(t, 'min').ok && !NC.lockGrade(t, 'max').ok && NC.lockGrade(t, 'min').diagnosis.length > 40, `neither lock accepts ${t}, with a diagnosis`);
    ok(/eclipsed|crowded/.test(NC.lockGrade(0, 'min').diagnosis) && /staggered|far/.test(NC.lockGrade(60, 'max').diagnosis), 'lock diagnoses name the opposite extreme');
  }

  // ------------------------------------------------------------ cyclopropane and the two 1,2-dimethylcyclopropanes
  {
    for (const id of ['cyclopropane', 'cis-dmcp', 'trans-dmcp']) ok(canon(models[id].molblock) === canon(models[id].smiles), `${id} 3D model has the stereochemistry of its SMILES`);
    const cp = G3.parseMol(models.cyclopropane.molblock).atoms.map(G3.P);
    const a60 = [[0, 1, 2], [1, 2, 0], [2, 0, 1]].map(([a, b, c]) => G3.angleDeg(cp[a], cp[b], cp[c]));
    ok(a60.every((x) => Math.abs(x - 60) < 1), `cyclopropane C-C-C angles 60 (${a60.map(R2)})`);
    for (const [id, want] of [['cis-dmcp', 'cis'], ['trans-dmcp', 'trans']]) {
      const mb = G3.parseMol(models[id].molblock); const P = mb.atoms.map(G3.P);
      const ring = [1, 2, 3]; const n = newell(ring.map((i) => P[i]));
      const side = (c, m) => Math.sign(G3.dot(G3.sub(P[m], P[c]), n));
      const s1 = side(1, 0), s2 = side(3, 4);
      ok(mb.atoms[0].el === 'C' && mb.atoms[4].el === 'C' && (s1 === s2 ? 'cis' : 'trans') === want, `${id} methyls on ${want === 'cis' ? 'the same face' : 'opposite faces'} of the ring plane`);
    }
    ok(models['cis-dmcp'].smiles !== models['trans-dmcp'].smiles && canon(models['cis-dmcp'].smiles) !== canon(models['trans-dmcp'].smiles), 'cis and trans 1,2-dimethylcyclopropane are different stereoisomers');
  }

  // ------------------------------------------------------------ chair models (data/3d/chairs.js)
  const ids = Object.keys(CC.CHAIRS);
  ok(ids.length === 8 && ['cyclohexane', 'methylcyclohexane', ...['12', '13', '14'].flatMap((p) => ['cis', 'trans'].map((r) => `dm-${r}-${p}`))].every((i) => ids.includes(i)), 'chair models: cyclohexane, methylcyclohexane and the six dimethylcyclohexanes');
  for (const id of ids) {
    const m = CC.load(id), e = m.entry;
    const t = `chair ${id}`;
    ok(canon(e.a) === canon(e.smiles) && canon(e.b) === canon(e.smiles), `${t}: both conformers keep the stereochemistry of ${e.smiles} (canonical isomeric SMILES from the 3D coordinates)`);
    const bb = G3.parseMol(e.b);
    ok(JSON.stringify(bb.atoms.map((a) => a.el)) === JSON.stringify(m.els) && JSON.stringify(bb.bonds) === JSON.stringify(m.bonds), `${t}: chairs a and b share atom order and bonds (b is the ring-flipped a)`);
    ok(e.ring.length === 6 && e.ring.every((a, k) => m.nb[a].includes(e.ring[(k + 1) % 6]) && m.els[a] === 'C'), `${t}: ring atom list is a six-carbon cycle`);
    for (const w of ['a', 'b']) {
      const pts = CC.coords(m, w);
      const ang = CC.ringAngles(pts, m.ring);
      ok(ang.every((x) => x >= 109 && x <= 113), `${t}/${w}: ring C-C-C angles 109-113 (${ang.map(R2)})`);
      const tor = m.ring.map((_, k) => G3.dihedral(...[0, 1, 2, 3].map((o) => pts[m.ring[(k + o) % 6]])));
      ok(tor.every((x, k) => Math.abs(x) > 40 && Math.abs(x) < 65 && x * tor[(k + 1) % 6] < 0), `${t}/${w}: ring torsions alternate +/-(40-65) (chair): ${tor.map(Math.round)}`);
      const N = newell(m.ring.map((i) => pts[i]));
      const rows = CC.substituents(m, pts, CC.refAxis(m));
      ok(rows.length === 12, `${t}/${w}: twelve ring substituent positions`);
      // each ring carbon has exactly one axial and one equatorial neighbour
      ok(m.ring.every((c) => rows.filter((r) => r.carbon === c).map((r) => r.role).sort().join('') === 'ae'), `${t}/${w}: every ring carbon has one axial and one equatorial bond`);
      for (const r of rows) {
        const v = G3.sub(pts[r.atom], pts[r.carbon]);
        const a = angToAxis(v, N);
        if (m.els[r.atom] === 'H') {
          if (r.role === 'a') ok(a <= 15, `${t}/${w}: axial H on C${r.pos + 1} parallel to the ring axis (${R2(a)} deg from it)`);
          else ok(a >= 55 && a <= 90, `${t}/${w}: equatorial H on C${r.pos + 1} is not parallel to the ring axis (${R2(a)} deg)`);
        } else if (r.role === 'a') ok(a <= 20, `${t}/${w}: axial substituent atom ${r.atom} within 20 deg of the ring axis (${R2(a)})`);
        else ok(a >= 55, `${t}/${w}: equatorial substituent atom ${r.atom} is not parallel to the axis (${R2(a)})`);
      }
      // the six axial bonds alternate up / down around the ring (3 up, 3 down)
      const axSigns = m.ring.map((c) => Math.sign(G3.dot(G3.sub(pts[rows.find((r) => r.carbon === c && r.role === 'a').atom], pts[c]), N)));
      ok(axSigns.every((x, k) => x !== axSigns[(k + 1) % 6]), `${t}/${w}: axial bonds alternate up/down around the ring`);
    }
    // ring flip: every position swaps role, every group keeps its face (up stays up)
    const ra = CC.roleMap(m, 'a'), rb = CC.roleMap(m, 'b');
    ok(Object.keys(ra).every((k) => ra[k].role !== rb[k].role), `${t}: ring flip swaps axial and equatorial for every substituent atom`);
    ok(Object.keys(ra).every((k) => ra[k].face === rb[k].face), `${t}: ring flip keeps every group on its face (up stays up)`);
    // interpolation endpoints are the two real conformers
    ok(CC.blend(m, 0).every((p, i) => G3.len(G3.sub(p, m.A[i])) < 1e-12) && CC.blend(m, 1).every((p, i) => G3.len(G3.sub(p, m.B[i])) < 1e-12) && CC.blend(m, 0.5).every((p) => p.every(Number.isFinite)), `${t}: flip animation runs from conformer a to conformer b`);
  }
  // methylcyclohexane: axial-methyl vs equatorial-methyl models (angle of the methyl bond to the ring normal)
  {
    const m = CC.load('methylcyclohexane'); const me = m.entry.subs[0];
    const bond = (w) => { const P = CC.coords(m, w); const c = m.nb[me].find((j) => m.ring.includes(j)); return G3.sub(P[me], P[c]); };
    const Na = newell(m.ring.map((i) => m.A[i])), Nb = newell(m.ring.map((i) => m.B[i]));
    ok(angToAxis(bond('a'), Na) >= 55, `equatorial-methyl chair: methyl bond ${R2(angToAxis(bond('a'), Na))} deg from the ring normal (not parallel)`);
    ok(angToAxis(bond('b'), Nb) <= 15, `axial-methyl chair: methyl bond ${R2(angToAxis(bond('b'), Nb))} deg from the ring normal (parallel, within 15)`);
    ok(CC.heavySubs(m, 'a')[0].role === 'e' && CC.heavySubs(m, 'b')[0].role === 'a', 'chair-core agrees: a = equatorial methyl, b = axial methyl');
    ok(m.entry.eA < m.entry.eB, `MMFF puts the equatorial-methyl chair lower (${m.entry.eA} < ${m.entry.eB} kcal/mol); book: 7.6 kJ/mol, about 95% equatorial`);
    // 1,3-diaxial contacts: axial chair has two axial H on C3 and C5 close to the methyl; equatorial chair has none
    const dp = CC.diaxialPartners(m, 'b', me);
    ok(dp.length === 2 && dp.every((p) => p.dist < 3.1), `axial methyl has two 1,3-diaxial H atoms within 3.1 A (${dp.map((p) => R2(p.dist))})`);
    const c1 = m.nb[me].find((j) => m.ring.includes(j)); const pos1 = m.ring.indexOf(c1);
    const rowsB = CC.substituents(m, m.B, CC.refAxis(m));
    ok(dp.every((p) => { const r = rowsB.find((x) => x.atom === p.atom); return r.role === 'a' && m.els[p.atom] === 'H' && [2, 4].includes((r.pos - pos1 + 6) % 6); }), 'the diaxial H atoms are axial H on the ring carbons two places from C1 (C3 and C5), same face');
    ok(CC.diaxialPartners(m, 'a', me).length === 0, 'equatorial methyl has no 1,3-diaxial partners');
    // in the equatorial chair the axial H atoms on C3 and C5 (same face) are far from the methyl
    const rowsA = CC.substituents(m, m.A, CC.refAxis(m));
    const faceMe = CC.heavySubs(m, 'a')[0].face;
    const dEq = Math.min(...rowsA.filter((r) => m.els[r.atom] === 'H' && r.role === 'a' && [2, 4].includes((r.pos - pos1 + 6) % 6)).map((r) => G3.len(G3.sub(m.A[r.atom], m.A[me]))));
    ok(dEq > 3.3 && Math.min(...dp.map((p) => p.dist)) < dEq - 0.5 && faceMe !== 0, `equatorial methyl is far from the axial H atoms on C3/C5 (${R2(dEq)} A) while the axial methyl is close (${R2(Math.min(...dp.map((p) => p.dist)))} A)`);
  }
  // cis/trans labels and the diequatorial rule, from three independent routes
  const wedgeChecks = [];
  for (const p of ['12', '13', '14']) for (const rel of ['cis', 'trans']) {
    const id = `dm-${rel}-${p}`, m = CC.load(id), pos = m.entry.positions;
    ok(m.entry.rel === rel && pos === `1,${p[1]}`, `${id}: declared as ${rel}-${pos}`);
    // (1) 3D faces from both chairs (up stays up, so the label is the same in a and b)
    ok(CC.cisTrans(m, 'a') === rel && CC.cisTrans(m, 'b') === rel, `${id}: both substituents on ${rel === 'cis' ? 'the same' : 'opposite'} face(s) in both chairs (3D)`);
    // (2) independent plane normal (Newell) for the faces
    for (const w of ['a', 'b']) {
      const P = CC.coords(m, w); const N = newell(m.ring.map((i) => P[i]));
      const sides = m.entry.subs.map((s) => { const c = m.nb[s].find((j) => m.ring.includes(j)); return Math.sign(G3.dot(G3.sub(P[s], P[c]), N)); });
      ok((sides[0] === sides[1] ? 'cis' : 'trans') === rel, `${id}/${w}: faces by the ring mean plane say ${rel}`);
    }
    // (3) RDKit wedge drawing of the SMILES
    ok(wedgeLabel(m.entry.smiles) === rel, `${id}: RDKit wedge/dash depiction of ${m.entry.smiles} reads as ${rel}`);
    // the rule, measured on the coordinates
    const both = CC.canBothEquatorial(m);
    ok(both === GC.canDiequatorial(pos, rel), `${id}: measured diequatorial chair exists = ${both}, rule says ${GC.canDiequatorial(pos, rel)}`);
    ok(CC.pattern(m, 'a') !== CC.pattern(m, 'b') && [CC.pattern(m, 'a'), CC.pattern(m, 'b')].sort().join() === GC.chairPatterns(pos, rel).slice().sort().join(), `${id}: chair patterns ${CC.pattern(m, 'a')}/${CC.pattern(m, 'b')} = ${GC.chairPatterns(pos, rel)}`);
    const eA = m.entry.eA, eB = m.entry.eB;
    if (both) ok(CC.pattern(m, 'a') === 'ee' && eA < eB, `${id}: the diequatorial chair is the lower-energy one in MMFF (${eA} < ${eB})`);
  }
  eq(GC.DIEQ, { '1,2': 'trans', '1,3': 'cis', '1,4': 'trans' }, 'rule: trans-1,2, cis-1,3, trans-1,4 can be diequatorial');
  // the six rule-lab tabs are exactly the six models
  const lab = L.steps.find((s) => s.id === 's16').config.models;
  ok(lab.length === 6 && new Set(lab).size === 6 && lab.every((i) => CC.CHAIRS[i]), 'rule-lab lists the six dimethylcyclohexane models');

  // ------------------------------------------------------------ widget logic
  {
    const m = CC.load('cyclohexane');
    const rows = CC.substituents(m, m.A, CC.refAxis(m));
    const ax = rows.filter((r) => r.role === 'a'), eqs = rows.filter((r) => r.role === 'e');
    ok(ax.length === 6 && eqs.length === 6, 'cyclohexane chair: six axial and six equatorial hydrogens');
    ok(CF.TAP_TASKS.map((x) => x.role).join('') === 'ae', 'tap task order: axial then equatorial');
    ok(ax.every((r) => CF.gradeTap(m, 'a', r.atom, 'a').ok && !CF.gradeTap(m, 'a', r.atom, 'e').ok), 'tap: every axial H is accepted for the axial task and refused for the equatorial one');
    ok(eqs.every((r) => CF.gradeTap(m, 'a', r.atom, 'e').ok && !CF.gradeTap(m, 'a', r.atom, 'a').ok), 'tap: every equatorial H is accepted for the equatorial task and refused for the axial one');
    ok(!CF.gradeTap(m, 'a', m.ring[0], 'a').ok && /carbon/.test(CF.gradeTap(m, 'a', m.ring[0], 'a').diagnosis), 'tap: a ring carbon is refused with a message');
    ok(eqs.every((r) => CF.gradeTap(m, 'a', r.atom, 'a').diagnosis.length > 60) && ax.every((r) => CF.gradeTap(m, 'a', r.atom, 'e').diagnosis.length > 60), 'tap: wrong taps get a measured diagnosis');
    const mm = CC.load('methylcyclohexane');
    ok(CC.heavySubs(mm, 'a')[0].role === 'e' && CC.heavySubs(mm, 'b')[0].role === 'a', 'flip-identify: first chair equatorial methyl, flipped chair axial methyl (both answers reachable)');
    const sb = L.steps.find((s) => s.id === 's14').visual.config;
    ok(CC.CHAIRS[sb.model] && sb.order.join() === 'b,a' && CC.heavySubs(mm, sb.order[0])[0].role === 'a', 'side-by-side: Chair 1 is the axial-methyl chair, Chair 2 the equatorial');
    // scene builder: colours only when revealed, axial H coloured differently from equatorial H
    const hid = CF.chairScene(m, 0, { reveal: false }), shown = CF.chairScene(m, 0, { reveal: true });
    ok(Object.keys(hid.colors).length === 0 && Object.keys(shown.colors).length === 12, 'chair scene: colours hidden until revealed, then all 12 H coloured');
    ok(ax.every((r) => shown.colors[r.atom] === CF.AX) && eqs.every((r) => shown.colors[r.atom] === CF.EQ) && CF.AX !== CF.EQ, 'chair scene: axial H and equatorial H have different colours');
    const sc = CF.chairScene(mm, 1, { reveal: true, diaxial: { atoms: [mm.entry.subs[0]] } });
    ok(sc.lines.filter((l) => l.color === CF.CROWD).length === 2 && sc.rings.length === 2, 'chair scene: two 1,3-diaxial contact lines on the axial chair');
    ok(CF.chairScene(mm, 0, { reveal: true, diaxial: { atoms: [mm.entry.subs[0]] } }).lines.filter((l) => l.color === CF.CROWD).length === 0, 'chair scene: none on the equatorial chair');
    // newman-rotator scene: front and rear hydrogens coloured differently
    const em = NC.setup(models.ethane.molblock, NR.MOLS.ethane); const es = NR.sceneAt(em, 60);
    ok(es.atoms.length === 8 && es.bonds.length === 7 && [2, 3, 4].every((i) => es.colors[i] === NR.FRONT_H) && [5, 6, 7].every((i) => es.colors[i] === NR.BACK_H), 'newman scene: 8 atoms, 7 bonds, front/rear hydrogens coloured differently');
    // the step configs reach their targets
    const nr = L.steps.filter((s) => (s.widget === 'newman-rotator') || (s.visual && s.visual.widget === 'newman-rotator'));
    ok(nr.length === 3, 'three newman-rotator steps');
    for (const s of nr) {
      const c = s.widget ? s.config : s.visual.config;
      ok(NR.MOLS[c.mol] && NC.EMAX[c.mol] === NR.MOLS[c.mol].emax, `${s.id}: newman config molecule known`);
      for (const k of c.need || []) {
        ok(NR.grade(c, k, k === 'min' ? 60 : 0).ok, `${s.id}: lock ${k} is reachable`);
        ok(!NR.grade(c, k, c.start).ok, `${s.id}: the starting angle ${c.start} is not already the ${k}`);
      }
    }
    const s6 = L.steps.find((s) => s.id === 's06');
    ok(NR.grade(s6.config, 'max', 0).ok && !NR.grade(s6.config, 'min', 0).ok && s6.config.energy === true, 's06: bromoethane peak lockable, curve shown');
  }

  // ------------------------------------------------------------ the lesson's own steps
  {
    ok(L.minutes >= 25 && L.minutes <= 30 && L.drawing === 'skeletal' && L.steps.length >= 15 && L.steps.length <= 18, `L06: ${L.steps.length} steps, ${L.minutes} min, skeletal`);
    ok(L.sections.join() === '2.5,2.8,2.9,2.10,2.11', 'L06 covers McMurry 2.5 and 2.8-2.11 only');
    ok(L.mastery.generator === 'chairs' && L.mastery.count === 3, 'L06 mastery uses the chairs generator');
    const types = new Set(L.steps.map((s) => s.type));
    ok(['predict', 'try', 'explain', 'input', 'choice', 'worked'].every((t) => types.has(t)), 'L06 uses every step type');
    // act before explain: no explain card before something has been answered; explain cards follow graded/predict steps
    ok(L.steps[0].type !== 'explain' && L.steps.every((s, i) => s.type !== 'explain' || (i > 0 && L.steps[i - 1].type !== 'explain')), 'L06: explain cards never lead and never come back to back');
    const wordsIn = (html) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    L.steps.filter((s) => s.type === 'explain').forEach((s) => ok(wordsIn(s.html) <= 80, `L06/${s.id} explain <= 80 words (${wordsIn(s.html)})`));
    // gauche is not taught (the book does not cover butane gauche/anti)
    const alltext = JSON.stringify(L);
    ok(!/gauche|anti conformation|anti-periplanar/i.test(alltext), 'L06 does not teach gauche/anti');
    // every smiles in step fields parses
    const smiles = [];
    for (const s of L.steps) {
      if (s.smiles) smiles.push([s.id, s.smiles]);
      (s.figures || []).forEach((f) => smiles.push([s.id, f.smiles]));
      (s.options || []).forEach((o) => o.smiles && smiles.push([s.id, o.smiles]));
    }
    smiles.forEach(([id, sm]) => ok(canon(sm) !== null, `L06/${id} smiles ${sm} parses`));
    // numbers asked for in the lesson are recomputed
    const s4 = L.steps.find((s) => s.id === 's04'), s5 = L.steps.find((s) => s.id === 's05');
    const peak = Math.max(...Array.from({ length: 361 }, (_, t) => NC.energy(t, 12))) - Math.min(...Array.from({ length: 361 }, (_, t) => NC.energy(t, 12)));
    ok(s4.answer === Math.round(peak) && s4.visual.config.mol === 'ethane', `s04 barrier ${s4.answer} = curve peak - minimum (${R2(peak)})`);
    ok(s5.answer === Math.round(peak / 3) && /three/.test(s5.prompt) && NC.energy(0, 12) / 3 === 4, 's05: 12 / 3 = 4.0 kJ/mol per eclipsed H-H pair');
    ok(L.steps.find((s) => s.id === 's07').options.find((o) => o.correct).text === 'About 99%', 's07: about 99% staggered (book)');
    ok(/7\.6/.test(L.steps.find((s) => s.id === 's14').reveal) && /95%/.test(L.steps.find((s) => s.id === 's14').reveal), 's14 reveal states 7.6 kJ/mol and about 95%');
    // s08 visual: cis then trans models exist and are the two stereoisomers
    const v8 = L.steps.find((s) => s.id === 's08').visual.config;
    ok(v8.mol === 'cis-dmcp' && v8.compare === 'trans-dmcp', 's08 compares the cis and trans models');
    // s09: the correct name round-trips through OPSIN to the drawn molecule (canonical isomeric SMILES); the other names do not
    const s9 = L.steps.find((s) => s.id === 's09');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-l06-'));
    try {
      const inp = path.join(tmp, 'in.json'), out = path.join(tmp, 'out.json');
      fs.writeFileSync(inp, JSON.stringify(s9.options.map((o) => o.opsin)));
      execFileSync('python3', [path.join(HERE, '..', 'tools', 'check_names.py'), inp, out], { stdio: ['ignore', 'ignore', 'ignore'] });
      const res = JSON.parse(fs.readFileSync(out, 'utf8'));
      const want = canon(s9.smiles);
      s9.options.forEach((o) => {
        const got = res[o.opsin] ? canon(res[o.opsin]) : null;
        ok(got !== null, `s09 OPSIN parses "${o.opsin}"`);
        const sameRing = got && canon(res[o.opsin].replace(/@/g, '')) === canon(s9.smiles.replace(/@/g, ''));
        if (o.correct) ok(got === want, `s09 correct name "${o.opsin}" = the drawing by canonical isomeric SMILES (${got} vs ${want})`);
        else ok(got !== want, `s09 wrong name "${o.opsin}" is a different compound from the drawing`);
        // the cis-1,4 distractor is the same constitution but the other stereoisomer
        if (!o.correct && /1-chloro-4-methyl/.test(o.opsin)) ok(sameRing && got !== want, 's09 cis-1,4 distractor: same constitution, other stereoisomer');
      });
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    ok(wedgeLabel(s9.smiles) === 'trans', 's09 drawing really is trans in its wedge/dash depiction');
    // worked step: every move has exactly one correct option (generic check) and ends on the diequatorial chair; trans-1,4 can be diequatorial
    const s18 = L.steps.find((s) => s.id === 's18');
    ok(wedgeLabel(s18.smiles) === 'trans' && GC.canDiequatorial('1,4', 'trans') && CC.canBothEquatorial(CC.load('dm-trans-14')), 's18: trans-1,4 drawing is trans and can be diequatorial');
    // useIt
    ok(['2.12', '2.24', '2.28', '2.52', '2.61'].every((n) => L.useIt.book.includes(n)) && !L.useIt.book.some((n) => ['2.18', '2.19', '2.62'].includes(n)), 'L06 useIt lists problems of 2.5, 2.8-2.11 and the conformations/cis-trans exercise set');
    ok(skillLabel('chairs') !== 'chairs' && skillLabel('conformations') !== 'conformations', 'skill labels for conformations and chairs');
  }

  // ------------------------------------------------------------ chairs generator
  {
    ok(JSON.stringify(GC.A_ORDER) === JSON.stringify(['H', 'F', 'Cl', 'OH', 'Me', 'Et', 'iPr', 'tBu']), 'A-value order H < F < Cl < OH < Me < Et < iPr < tBu');
    const LIT = { H: 0, F: 0.25, Cl: 0.53, OH: 0.87, Me: 1.74, Et: 1.79, iPr: 2.21, tBu: 4.9 }; // literature A-values, kcal/mol (rounded)
    ok(GC.A_ORDER.every((g, i) => i === 0 || LIT[g] > LIT[GC.A_ORDER[i - 1]]), 'order agrees with literature A-values (strictly increasing)');
    ok(GC.rank('tBu') > GC.rank('iPr') && GC.rank('iPr') > GC.rank('Et') && GC.rank('Et') > GC.rank('Me') && GC.rank('Me') > GC.rank('OH') && GC.rank('OH') > GC.rank('Cl'), 'rank follows A_ORDER');
    const keys = Object.keys(GC.GROUPS);
    for (const x of keys) for (const y of keys) {
      if (x === y) continue;
      const gap = Math.abs(LIT[x] - LIT[y]);
      ok(GC.bigger(x, y) === (LIT[x] > LIT[y] ? x : y), `bigger(${x},${y}) agrees with the A-values`);
      ok(GC.tooClose(x, y) === (gap < 0.4), `${x}/${y} is skipped as too close exactly when the A-value gap < 0.4 (${R2(gap)})`);
    }
    for (const g of keys) ok(canon(GC.GROUPS[g].smi.length ? 'C' + GC.GROUPS[g].smi : 'C') !== null, `group ${g} smiles attaches to a carbon`);
    // 50 problems per mode, every answer recomputed
    for (const skill of [null, 'chairs', 'conformations']) {
      const probs = generate('chairs', 50, { skill });
      ok(probs.length === 50, `chairs generator ${skill} gives 50 problems`);
      const kinds = new Set();
      for (const p of probs) {
        kinds.add(p.task);
        ok(p.prompt && p.derive && p.hints.length === 2 && p.hints.every((x) => x.length > 8), `chairs ${skill}/${p.task} fields`);
        ok(p.skill === (['energy', 'brEclipse'].includes(p.task) ? 'conformations' : 'chairs') && (skill === null || p.skill === skill), `chairs ${skill}/${p.task} skill tag`);
        if (p.smiles) ok(canon(p.smiles) !== null, `chairs ${p.task} smiles parses ${p.smiles}`);
        if (p.kind === 'choice') {
          ok(p.options.filter((o) => o.correct).length === 1 && p.options.every((o) => o.why && o.why.length > 20), `chairs ${p.task} one correct option, a why on each`);
        } else {
          ok(checkInput({ answer: p.answer, diagnose: p.wrong }, String(p.answer)).ok, `chairs ${p.task} answer accepted`);
          (p.wrong || []).forEach((w) => ok(!checkInput({ answer: p.answer, diagnose: p.wrong }, String(w.match)).ok, `chairs ${p.task} wrong ${w.match} refused`));
        }
        if (p.task === 'bothEq') {
          const yes = GC.canDiequatorial(p.pattern, p.rel);
          ok(p.options.find((o) => o.correct).text.startsWith(yes ? 'Yes' : 'No') && p.smiles === GC.ringSmiles(p.pattern, p.groups[0], p.groups[1], p.rel), `chairs bothEq answer by the rule (${p.pattern} ${p.rel} -> ${yes})`);
          ok(wedgeLabel(p.smiles) === p.rel, `chairs bothEq drawing ${p.smiles} reads as ${p.rel}`);
        }
        if (p.task === 'cisTrans') {
          ok(p.options.find((o) => o.correct).text.startsWith(p.rel) && wedgeLabel(p.smiles) === p.rel, `chairs cisTrans answer ${p.rel} matches the wedge drawing`);
        }
        if (p.task === 'whichEq') {
          const [X, Y] = p.groups; const big = LIT[X] > LIT[Y] ? X : Y;
          ok(!GC.canDiequatorial(p.pattern, p.rel) && X !== Y && !GC.tooClose(X, Y) && Math.abs(LIT[X] - LIT[Y]) >= 0.4, `chairs whichEq: one-axial isomer, groups ${X}/${Y} clearly different in size`);
          ok(p.options.find((o) => o.correct).text.toLowerCase().includes(GC.GROUPS[big].phrase.slice(4).toLowerCase()), `chairs whichEq: bigger group ${big} is the correct answer`);
          ok(p.options.filter((o) => !o.correct).every((o) => o.why.length > 40), 'chairs whichEq wrong options explained');
        }
        if (p.task === 'energy') { const th = Number(/θ = (\d+)°/.exec(p.prompt)[1]); ok(p.answer === Math.round(6 * (1 + Math.cos(3 * th * Math.PI / 180))), `chairs energy at ${th} deg = ${p.answer}`); }
        if (p.task === 'brEclipse') {
          const B = Number(/is ([\d.]+) kJ/.exec(p.prompt)[1]), hh = Number(/worth ([\d.]+) kJ/.exec(p.prompt)[1]);
          ok(Math.abs(p.answer - (B - 2 * hh)) < 1e-9 && p.answer > hh, `chairs brEclipse ${B} - 2 x ${hh} = ${p.answer}`);
        }
      }
      if (skill === null) ok(['bothEq', 'whichEq', 'cisTrans', 'energy', 'brEclipse'].every((k) => kinds.has(k)), 'default mix covers every chairs task');
      if (skill === 'chairs') ok(['bothEq', 'whichEq', 'cisTrans'].every((k) => kinds.has(k)) && !kinds.has('energy'), 'skill chairs covers the three ring tasks');
    }
    const r1 = generate('chairs', 6).map((p) => p.smiles).join(), r2 = generate('chairs', 6).map((p) => p.smiles).join();
    ok(r1.length > 0 && r2.length > 0, 'fresh runs generated');
    ok(generatorForSkill('chairs') === 'chairs' && generatorForSkill('conformations') === 'chairs', 'practice mode routes chairs and conformations to the chairs generator');

    // ---- the rule and the labels, checked by BUILDING both chairs in 3D for every pattern, cis/trans and group pair
    const pairs = []; for (let i = 0; i < keys.length; i++) for (let j = i; j < keys.length; j++) pairs.push([keys[i], keys[j]]);
    const items = [];
    for (const pat of GC.PATTERNS) for (const rel of ['cis', 'trans']) for (const [X, Y] of pairs) items.push({ pat, rel, X, Y, smiles: GC.ringSmiles(pat, X, Y, rel) });
    // wedge drawing for the whole pool (cheap, all ordered pairs)
    let wedgeOK = 0, wedgeN = 0;
    for (const pat of GC.PATTERNS) for (const rel of ['cis', 'trans']) for (const X of keys) for (const Y of keys) { wedgeN++; if (wedgeLabel(GC.ringSmiles(pat, X, Y, rel)) === rel) wedgeOK++; }
    ok(wedgeOK === wedgeN, `wedge drawings of all ${wedgeN} generator molecules read as their cis/trans label (${wedgeOK}/${wedgeN})`);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-chairs-'));
    let built = 0, rawFlip = 0, mismatches = 0;
    try {
      const inp = path.join(tmp, 'in.json'), out = path.join(tmp, 'out.json');
      fs.writeFileSync(inp, JSON.stringify([...new Set(items.map((i) => i.smiles))]));
      execFileSync('python3', ['-I', path.join(HERE, '..', 'tools', 'chairs.py'), inp, out], { stdio: ['ignore', 'ignore', 'inherit'], timeout: 280000 });
      const res = JSON.parse(fs.readFileSync(out, 'utf8'));
      for (const it of items) {
        const r = res[it.smiles]; const t = `3D ${it.rel}-${it.pat} ${it.X}/${it.Y}`;
        ok(r && r.ok, `${t}: both chairs built (${r && r.err})`);
        if (!r || !r.ok) continue;
        built++; if (!r.relaxed_b) rawFlip++;
        const m = CC.fromEntry({ a: r.a, b: r.b, ring: r.ring, smiles: it.smiles }, t);
        const want = GC.canDiequatorial(it.pat, it.rel);
        const measured = CC.canBothEquatorial(m);
        if (measured !== want) mismatches++;
        ok(measured === want, `${t}: both-equatorial chair exists = ${measured} (measured), rule = ${want}`);
        const pa = CC.pattern(m, 'a'), pb = CC.pattern(m, 'b');
        ok([pa, pb].sort().join() === GC.chairPatterns(it.pat, it.rel).slice().sort().join(), `${t}: measured chair patterns ${pa}/${pb} = ${GC.chairPatterns(it.pat, it.rel)}`);
        ok(CC.cisTrans(m, 'a') === it.rel && CC.cisTrans(m, 'b') === it.rel, `${t}: label ${it.rel} matches the faces of the built chairs`);
        ok(r.label === it.rel, `${t}: label ${it.rel} matches a fresh RDKit embedding (ring plane): ${r.label}`);
        ok(canon(r.a) === canon(it.smiles) && canon(r.b) === canon(it.smiles), `${t}: built chairs have the isomeric SMILES of the problem`);
        // ae isomers: the larger group is equatorial in the chair where the smaller group is axial, and these are both chairs of the same molecule
        if (!want && it.X !== it.Y && !GC.tooClose(it.X, it.Y)) {
          const subs = (w) => CC.heavySubs(m, w).map((s) => s.role);
          ok(['a', 'b'].every((w) => subs(w).sort().join('') === 'ae'), `${t}: every chair has one axial and one equatorial group`);
        }
      }
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    console.log(`  chairs 3D check: ${built}/${items.length} generator molecules built as two chairs (${rawFlip} second chairs are raw geometric flips of crowded diaxial forms), rule mismatches: ${mismatches}; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}

// run on its own
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await lesson06({ ok, eq });
  console.log(`\nlesson06: ${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, 40).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
