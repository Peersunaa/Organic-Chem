// Lesson 15 checks: chirality centers and R/S labels (engine/cip.js tetrahedral rules 1-3) against Python RDKit (rdCIPLabeler.AssignCIPLabels for R/S,
// FindMolChiralCenters(includeUnassigned=True, useLegacyImplementation=False) for centers), a hand-checked fixture + OPSIN names, wedge/dash drawings read back
// from their own coordinates AND by Python RDKit, true 3D mirror images (reflected coordinates, CIP from the 3D structure inverts) and Kabsch superposition
// (about 0 for the achiral model, clearly more than 0 for chiral ones, also over every element-respecting atom pairing), the rs-assigner / mirror-pair /
// stereocenter-finder logic, the `rs` mastery generator, and the lesson's own claims.
// Run on its own with `node learn/tests/lesson15.mjs`, or as part of run.mjs.
import { ready, rdkit, canon, svgPick } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import CHIRAL from '../data/3d/chiral.js';
import { tetraInfo, chiralCenters, readGraph } from '../engine/cip.js';
import * as CH from '../engine/chirality.js';
import { RS_POOL, CENTER_POOL, rsName, otherLabel } from '../engine/generators-rs.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import { checkInput } from '../engine/steps.js';
import * as RA from '../engine/widgets/rs-assigner.js';
import * as SF from '../engine/widgets/stereocenter-finder.js';
import * as MP from '../engine/widgets/mirror-pair.js';
import { WIDGETS } from '../engine/widgets/index.js';
import { skillLabel, skillRule } from '../engine/skills.js';
import { Pose } from '../engine/widgets/spin3d.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.join(HERE, '..', 'tools');

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function htmlStrings(o, out = []) {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => htmlStrings(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => htmlStrings(x, out));
  return out;
}
const wordsOf = (html) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const plain = (s) => s.replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<');
const orderOf = (T) => T.order.map((i) => T.subs[i].label).join(' > ');
const dirWord = { cw: 'clockwise', ccw: 'counterclockwise' };
const LETTER = { cw: 'R', ccw: 'S' };

export async function lesson15({ ok, eq }) {
  await ready();
  const R = rdkit();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-rs-'));
  const pyJson = (script, data) => {
    const inp = path.join(tmp, 'in-' + script + '.json'), out = path.join(tmp, 'out-' + script + '.json');
    fs.writeFileSync(inp, JSON.stringify(data));
    execFileSync('python3', [path.join(TOOLS, script + '.py'), inp, out], { stdio: ['ignore', 'ignore', 'ignore'] });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const L = LESSONS.find((x) => x.id === '15');
  const stats = { fixture: 0, cip: 0, centers: 0, mirror: 0, kabsch: 0, wedge: 0, drawings: 0, names: 0 };
  const smilesSet = new Set();
  const need = (s) => { smilesSet.add(s); return s; };
  const wedgeJobs = [];                 // { mb, center, want, id }
  const queue = [];                     // OPSIN: { name, smiles, label }
  const expectOpsin = (name, smiles, label) => queue.push({ name, smiles, label });
  const pickRng = mulberry32(20261014);

  // ===================================================================================================================
  // (1) hand-checked fixture: engine labels + centers + ranking text; Python and OPSIN checked below
  const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'rs.json'), 'utf8'));
  const nFix = fx.cases.length + fx.centers.length;
  ok(nFix >= 20 && fx.cases.length >= 20, `rs fixture has at least 20 hand-checked cases (${fx.cases.length} configurations + ${fx.centers.length} center counts)`);
  for (const c of fx.cases) {
    need(c.smiles);
    const T = tetraInfo(c.smiles).filter((x) => x.center);
    eq(T.length, 1, `fixture ${c.smiles}: exactly one center`);
    eq(T[0].label, c.label, `fixture ${c.smiles}: engine label vs hand-checked`);
    if (c.order) eq(orderOf(T[0]), c.order, `fixture ${c.smiles}: ranking text`);
    const mirror = CH.flipStereo(c.smiles);
    need(mirror);
    eq(tetraInfo(mirror).find((x) => x.center).label, otherLabel(c.label), `fixture ${c.smiles}: swapping @ and @@ flips the label`);
    expectOpsin(c.name.new, c.smiles, 'fixture new'); if (c.name.old !== c.name.new) expectOpsin(c.name.old, c.smiles, 'fixture old');
    stats.fixture++;
  }
  for (const c of fx.centers) { need(c.smiles); eq(chiralCenters(c.smiles), c.centers, `fixture centers ${c.smiles}`); stats.fixture++; }
  // the molecules named in the brief
  const have = (s, l) => fx.cases.some((c) => c.smiles === s && c.label === l);
  ok(have('C[C@@H](O)CC', 'R') && have('C[C@H](O)CC', 'S') && have('CC[C@@H](C)Br', 'R') && have('C[C@H](N)C(=O)O', 'S') && have('OC[C@@H](O)C=O', 'R') && have('C[C@@H](O)C(=O)O', 'R') && have('CCC[C@H](C)CC', 'R'), 'fixture has (R)/(S)-butan-2-ol, (R)-2-bromobutane, (S)-alanine, (R)-glyceraldehyde, (R)-lactic acid, (R)-3-methylhexane');
  const cs = Object.fromEntries(fx.centers.map((c) => [c.smiles, c.centers.length]));
  ok(cs['CCC(C)Cl'] === 1 && cs['CC(C)O'] === 0 && cs['CCC(O)CC'] === 0 && cs['CC1CCCCC1'] === 0 && cs['CC1(O)CCCCC1'] === 0 && cs['CC1CCCCC1=O'] === 1 && cs['CC(C)Cc1ccc(cc1)C(C)C(=O)O'] === 1 && cs['CC1=CCC(CC1=O)C(C)=C'] === 1, 'fixture: 2-chlorobutane 1, propan-2-ol 0, pentan-3-ol 0, methylcyclohexane 0, 1-methylcyclohexanol 0, 2-methylcyclohexanone 1, ibuprofen 1, carvone 1');

  // ===================================================================================================================
  // (2) the pool of small chiral molecules (about 40) and the "find the centers" pool
  {
    ok(RS_POOL.length >= 40, `pool has about 40 chiral molecules (${RS_POOL.length})`);
    ok(new Set(RS_POOL.map((e) => e.id)).size === RS_POOL.length && new Set(RS_POOL.map((e) => canon(e.smiles.replace(/@@?/g, '')))).size === RS_POOL.length, 'pool molecules are all different');
    let carbonyl = 0, alkene = 0, quat = 0;
    for (const e of RS_POOL) {
      for (const smi of [e.smiles, CH.flipStereo(e.smiles)]) {
        need(smi);
        const T = tetraInfo(smi).filter((x) => x.center);
        ok(T.length === 1 && T[0].label && T[0].firstDiff.every((d) => d >= 1), `pool ${smi}: one center with a label`);
        const g = readGraph(smi);
        ok(g.atoms.every((a) => ['C', 'H', 'O', 'N', 'Cl', 'Br'].includes(a.sym)), `pool ${smi}: only C, H, O, N, Cl, Br`);
        const nm = rsName(e, T[0].label);
        expectOpsin(nm.new, smi, 'pool new'); if (nm.old !== nm.new) expectOpsin(nm.old, smi, 'pool old');
      }
      eq([tetraInfo(e.smiles).find((x) => x.center).label, tetraInfo(CH.flipStereo(e.smiles)).find((x) => x.center).label].sort(), ['R', 'S'], `pool ${e.id}: the two enantiomers are R and S`);
      if (e.carbonyl) carbonyl++; if (e.alkene) alkene++; if (e.quaternary) quat++;
      ok(/^[a-z0-9,\- ]+$/.test(e.new) && e.old.length > 2, `pool ${e.id} names present`);
    }
    ok(carbonyl >= 8 && alkene >= 4 && quat >= 3, `pool has carbonyl (${carbonyl}), C=C (${alkene}) and no-hydrogen (${quat}) examples`);
    for (const e of CENTER_POOL) { need(e.smiles); eq(chiralCenters(e.smiles).length, e.n, `center pool ${e.smiles}`); }
    ok(CENTER_POOL.length >= 25 && CENTER_POOL.some((e) => e.n === 0) && CENTER_POOL.some((e) => e.n === 2), 'center pool mixes 0, 1 and 2 centers');
  }

  // ===================================================================================================================
  // (3) thousands of random centers: four groups chosen from 24 different ones, either chirality tag (JS tetrahedral rules vs Python)
  {
    const GROUPS = ['C', 'CC', 'CCC', 'C(C)C', 'C(C)(C)C', 'O', 'N', 'Cl', 'Br', 'C=O', 'C(=O)O', 'C=C', 'CO', 'C#N', 'C(C)=O', 'CCl', 'CBr', 'CN', 'OC', 'CC=C', 'c1ccccc1', 'C(=O)OC', 'CCO', 'C(=O)N'];
    const rng = mulberry32(777);
    let n = 0;
    while (n < 1500) {
      const g = () => GROUPS[Math.floor(rng() * GROUPS.length)];
      const withH = rng() < 0.75;
      const tag = rng() < 0.5 ? '@' : '@@';
      const smi = withH ? `[C${tag}H](${g()})(${g()})${g()}` : `[C${tag}](${g()})(${g()})(${g()})${g()}`;
      need(smi); n++;
    }
  }

  // ===================================================================================================================
  // (4) wedge / dash drawings: generated from RDKit layouts; geometry read back from the picture itself, and by Python RDKit from the molblock
  const drawings = [];
  {
    const specs = [['low', 'wedge', 0], ['low', 'dash', 0], ['two', 'wedge', 0], ['two', 'wedge', 1], ['two', 'wedge', 2]];
    for (const e of RS_POOL) for (const smi of [e.smiles, CH.flipStereo(e.smiles)]) for (const [style, lowOn, pair] of specs) {
      const d = CH.wedgeDrawing(smi, { style, lowOn, pair });
      if (!d) { ok(false, `drawing made for ${smi} ${style} ${lowOn} ${pair}`); continue; }
      drawings.push({ d, smi, style, lowOn, pair });
      const T = tetraInfo(smi).find((x) => x.center);
      eq(d.label, T.label, `drawing ${smi}: label of the SMILES`);
      eq(CH.drawnLabel(d).label, T.label, `drawing ${smi} ${style}/${lowOn}/${pair}: configuration read back from coordinates + wedge flags`);
      wedgeJobs.push({ mb: d.molblock, center: d.center, want: T.label, id: `${smi} ${style}/${lowOn}/${pair}` });
      // flag structure: every flagged bond starts at the center (narrow end), wedge = toward you
      const flagged = d.bonds.filter((b) => b.flag);
      ok(flagged.every((b) => b.a === d.center), `drawing ${smi}: wedge/dash narrow end at the center`);
      if (style === 'low') {
        ok(flagged.length === 1 && flagged[0].b === d.groups.find((g) => g.rank === 4).atom, `drawing ${smi}: only group 4 is a wedge or dash`);
        eq(d.lowFlag, lowOn, `drawing ${smi}: group 4 on a ${lowOn} as asked`);
      } else {
        ok(flagged.length === 2 && flagged.filter((b) => b.flag === 1).length === 1 && flagged.filter((b) => b.flag === 6).length === 1, `drawing ${smi}: one wedge and one dash`);
        eq(d.lowFlag, 'plain', `drawing ${smi}: group 4 is a plain bond`);
        const ang = (b) => Math.atan2(d.atoms[b.b].y - d.atoms[d.center].y, d.atoms[b.b].x - d.atoms[d.center].x);
        let sep = Math.abs(ang(flagged[0]) - ang(flagged[1])) % (2 * Math.PI); sep = Math.min(sep, 2 * Math.PI - sep);
        ok(sep < Math.PI * 0.72, `drawing ${smi}: wedge and dash sit next to each other (${(sep * 180 / Math.PI).toFixed(0)} deg)`);
      }
      // no overlapping atoms, the four bonds at the center fan out
      let minD = 99;
      for (let i = 0; i < d.atoms.length; i++) for (let j = i + 1; j < d.atoms.length; j++) minD = Math.min(minD, Math.hypot(d.atoms[i].x - d.atoms[j].x, d.atoms[i].y - d.atoms[j].y));
      ok(minD > 0.9, `drawing ${smi} ${style}: atoms do not overlap (closest ${minD.toFixed(2)})`);
      const angs = d.groups.map((g) => Math.atan2(d.atoms[g.atom].y - d.atoms[d.center].y, d.atoms[g.atom].x - d.atoms[d.center].x)).sort((p, q) => p - q);
      const gaps = angs.map((a, i) => ((angs[(i + 1) % 4] - a + 2 * Math.PI) % (2 * Math.PI)));
      ok(Math.min(...gaps) > 0.7, `drawing ${smi}: bonds at the center are at least 40 degrees apart`);
      stats.drawings++;
    }
    // the rendering keeps the written wedges and the layout (svgPick with useMolBlockWedging), checked on a sample
    let svgChecked = 0;
    for (const { d, smi } of drawings.filter((_, i) => i % 9 === 0)) {
      const pk = svgPick(d.molblock, { width: 340, height: 240, keepHs: true, molBlockWedging: true });
      // positions: x_pts = a x + b with a > 0 and y_pts = -a y + b' (the picture is not rotated or mirrored)
      const cIdx = d.atoms.map((a, i) => (a.el === 'C' ? i : -1)).filter((i) => i >= 0); // carbons have no label, so their positions are exact
      const xs = cIdx.map((i) => d.atoms[i].x), ys = cIdx.map((i) => d.atoms[i].y), px = cIdx.map((i) => pk.pts[i].x * 3.4), py = cIdx.map((i) => pk.pts[i].y * 2.4);
      const fit = (u, v) => { const n = u.length, mu = u.reduce((s, x) => s + x, 0) / n, mv = v.reduce((s, x) => s + x, 0) / n; let num = 0, den = 0; u.forEach((x, i) => { num += (x - mu) * (v[i] - mv); den += (x - mu) ** 2; }); const a = num / den; const res = Math.max(...u.map((x, i) => Math.abs(v[i] - (mv + a * (x - mu))))); return { a, res }; };
      const fx1 = fit(xs, px), fy1 = fit(ys, py);
      ok(fx1.a > 0 && fy1.a < 0 && Math.abs(fx1.a + fy1.a) < 0.05 * fx1.a && fx1.res < 3 && fy1.res < 3, `render ${smi}: picture keeps the layout (no flip, no rotation)`);
      // dash and wedge shapes: the flagged bond's class carries a filled wedge ('Z') or many short dashes
      const flagged = d.bonds.findIndex((b) => b.flag);
      const idx = d.bonds[flagged];
      const re = new RegExp(`<path class='bond-${flagged} [^']*' d='([^']*)'`, 'g');
      const paths = [...pk.svg.matchAll(re)].map((m) => m[1]);
      if (idx.flag === 1) ok(paths.some((p) => / Z$/.test(p.trim())), `render ${smi}: the wedge bond is drawn as a filled wedge`);
      else ok(paths.length >= 4, `render ${smi}: the dash bond is drawn as several dashes (${paths.length})`);
      // direction read from the screen positions equals the direction read from the molblock
      const P = (r) => { const g = d.groups.find((x) => x.rank === r); return [pk.pts[g.atom].x * 3.4, -pk.pts[g.atom].y * 2.4]; };
      const screen = CH.turnOf(P(1), P(2), P(3)).dir;
      const page = CH.turnOf(...[1, 2, 3].map((r) => { const g = d.groups.find((x) => x.rank === r); return [d.atoms[g.atom].x, d.atoms[g.atom].y]; })).dir;
      eq(screen, page, `render ${smi}: clockwise/counterclockwise on screen = in the molblock`);
      svgChecked++;
    }
    stats.wedge = drawings.length;
    ok(svgChecked >= 40, `rendering checked on ${svgChecked} drawings`);
  }

  // ===================================================================================================================
  // (5) 3D models and their mirror images (data/3d/chiral.js)
  const models3d = {};
  const modelIds = Object.keys(CHIRAL);
  {
    ok(modelIds.length >= 7, `chiral 3D models exist (${modelIds.length})`);
    for (const id of modelIds) {
      const e = CHIRAL[id];
      const a = CH.parseMolblock(e.molblock), b = CH.parseMolblock(e.mirror);
      eq(b.atoms.length, a.atoms.length, `${id}: mirror has the same atoms`);
      ok(a.atoms.every((p, i) => p.el === b.atoms[i].el && Math.abs(b.atoms[i].x + p.x) < 2e-4 && Math.abs(b.atoms[i].y - p.y) < 2e-4 && Math.abs(b.atoms[i].z - p.z) < 2e-4), `${id}: the mirror image is the model reflected through x = 0, atom by atom`);
      eq(JSON.stringify(b.bonds.map((x) => [x.a, x.b, x.order])), JSON.stringify(a.bonds.map((x) => [x.a, x.b, x.order])), `${id}: same bonds`);
      eq(a.atoms.filter((p) => p.el !== 'H').length, readGraph(e.smiles).atoms.length, `${id}: heavy atoms keep the SMILES numbering`);
      models3d['m:' + id] = e.molblock; models3d['x:' + id] = e.mirror;
      need(e.smiles);
      if (e.achiral) {
        ok(e.center === null && e.label === null && tetraInfo(e.smiles).every((x) => !x.center), `${id}: achiral, no center`);
      } else {
        const T = tetraInfo(e.smiles).find((x) => x.center);
        eq(T.atom, e.center, `${id}: center index`); eq(T.label, e.label, `${id}: label of the model's SMILES`);
        // an independent geometric reading of the coordinates (tetrahedron sign) and of the reflected ones
        const mi = CH.model3dInfo(e, 'molblock'), mm = CH.model3dInfo(e, 'mirror');
        eq(CH.geomLabel(mi.mol.atoms.map((p) => p), mi.center, mi.groups).label, e.label, `${id}: geometry of the model gives ${e.label}`);
        eq(CH.geomLabel(mm.mol.atoms, mm.center, mm.groups).label, otherLabel(e.label), `${id}: geometry of the mirror image gives the opposite letter`);
        eq(mm.label, otherLabel(e.label), `${id}: mirror label`);
        stats.mirror += 2;
      }
    }
  }

  // ===================================================================================================================
  // (6) Kabsch superposition: ~0 for the achiral model, clearly > 0 for chiral ones; every pairing that respects elements; planes of symmetry
  {
    const rows = [];
    for (const id of modelIds) {
      const j = MP.judgeModel(id);
      rows.push(`${id}:${j.rmsd.toFixed(2)}`);
      if (CHIRAL[id].achiral) ok(j.match && j.rmsd < 0.01 && j.mismatched.length === 0, `${id} (achiral): Kabsch RMSD ~0 (${j.rmsd.toExponential(1)})`);
      else ok(!j.match && j.rmsd > 0.3 && j.mismatched.length >= 2, `${id} (chiral): Kabsch RMSD clearly above 0 (${j.rmsd.toFixed(2)}), ${j.mismatched.length} atoms off`);
      eq(MP.judgeModel(id).chiral, !CHIRAL[id].achiral, `${id}: judge says chiral = ${!CHIRAL[id].achiral}`);
      stats.kabsch++;
    }
    // generous pairing (every pairing that only respects elements) on the small models
    for (const id of ['chfclbr', 'ch2clbr', 'alanine']) {
      const m = MP.modelOf(id);
      const A = new Pose(m.atoms), B = new Pose(m.mirror);
      const pairings = CH.elementPairings(m.atoms);
      const r = CH.superpose(A.atoms(), B.atoms(), m.bonds, { pairings });
      const rg = CH.superpose(A.atoms(), B.atoms(), m.bonds);
      if (CHIRAL[id].achiral) ok(r.rmsd < 0.01 && rg.rmsd < 0.01, `${id}: element-only pairings (${pairings.length}) also give RMSD ~0`);
      else ok(r.rmsd > 0.3, `${id}: even over ${pairings.length} element-respecting pairings the mirror image does not fit (RMSD ${r.rmsd.toFixed(2)})`);
      ok(r.rmsd <= rg.rmsd + 1e-9, `${id}: the generous search is never worse than the bond-respecting one`);
      stats.kabsch++;
    }
    // Kabsch itself: a rotated + shifted copy fits perfectly; a reflected chiral copy does not; the rotation is proper
    {
      const m = MP.modelOf('alanine');
      const P = m.atoms.map((a) => [a.x, a.y, a.z]);
      const rot = CH.matMul(CH.rotAxisAngle([0.3, -0.7, 0.2], 1.1), CH.rotAxisAngle([1, 0, 0], 0.4));
      const Q = P.map((p) => { const r = CH.matVec(rot, p); return [r[0] + 3, r[1] - 2, r[2] + 0.5]; });
      const k = CH.kabsch(P, Q);
      ok(k.rmsd < 1e-6, `kabsch: a rotated and shifted copy fits (${k.rmsd.toExponential(1)})`);
      const det = k.R[0][0] * (k.R[1][1] * k.R[2][2] - k.R[1][2] * k.R[2][1]) - k.R[0][1] * (k.R[1][0] * k.R[2][2] - k.R[1][2] * k.R[2][0]) + k.R[0][2] * (k.R[1][0] * k.R[2][1] - k.R[1][1] * k.R[2][0]);
      ok(Math.abs(det - 1) < 1e-9, 'kabsch: rotation is proper (determinant +1)');
      ok(CH.kabsch(P, P.map((p) => [-p[0], p[1], p[2]])).rmsd > 0.3, 'kabsch: a reflected chiral copy cannot be fitted by a rotation');
      stats.kabsch += 3;
      const { axis, angle } = CH.axisAngle(rot);
      const back = CH.matVec(CH.rotAxisAngle(axis, angle), [1, 2, 3]), direct = CH.matVec(rot, [1, 2, 3]);
      ok(Math.hypot(...back.map((x, i) => x - direct[i])) < 1e-9, 'axisAngle reproduces the rotation');
      const u = [0.2, -0.5, 0.8], Rb = CH.rotBetween(u, [0, 0, -1]); const w = CH.matVec(Rb, u); const wl = Math.hypot(...w);
      ok(Math.abs(w[0]) < 1e-9 && Math.abs(w[1]) < 1e-9 && w[2] < 0 && Math.abs(wl - Math.hypot(...u)) < 1e-9, 'rotBetween turns a vector onto -z');
    }
    // symmetry planes
    {
      const pl = CH.mirrorPlanes(MP.modelOf('ch2clbr').atoms);
      ok(pl.length === 1 && pl[0].inPlane.slice().sort().join() === '0,1,2', 'CH2ClBr has exactly one mirror plane: through Cl, C, Br');
      for (const id of modelIds.filter((x) => !CHIRAL[x].achiral)) eq(CH.mirrorPlanes(MP.modelOf(id).atoms).length, 0, `${id}: no plane of symmetry`);
      stats.kabsch += 1 + modelIds.length - 1;
    }
  }

  // ===================================================================================================================
  // (7) rs-assigner logic on every 3D model (both enantiomers) and on every wedge drawing
  {
    let checks3d = 0;
    const rnd = mulberry32(5);
    const randRot = () => CH.matMul(CH.rotAxisAngle([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], rnd() * 6.28), CH.rotAxisAngle([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], rnd() * 6.28));
    for (const id of modelIds.filter((x) => !CHIRAL[x].achiral)) for (const which of ['molblock', 'mirror']) {
      const S = RA.build({ mode: '3d', model: id, which });
      const want = which === 'mirror' ? otherLabel(CHIRAL[id].label) : CHIRAL[id].label;
      eq(S.truth, want, `${id}/${which}: rs-assigner truth`);
      // ranking taps
      for (let n = 1; n <= 4; n++) {
        const right = S.T.order[n - 1];
        ok(RA.gradeRankTap(S, n, right).ok, `${id}: tap ${n} accepted`);
        for (let k = 0; k < 4; k++) if (k !== right) { const r = RA.gradeRankTap(S, n, k); ok(!r.ok && r.diagnosis.length > 30, `${id}: wrong tap ${k} for priority ${n} explained`); }
      }
      const a = S.mol.atoms, c = a[S.center], g4 = a[S.groups.find((g) => g.rank === 4).atom];
      const v4 = [g4.x - c.x, g4.y - c.y, g4.z - c.z];
      const away = CH.rotBetween(v4, [0, 0, -1]), toward = CH.rotBetween(v4, [0, 0, 1]);
      eq(RA.lowPointing(S, away), 'away', `${id}/${which}: Point 4 away puts group 4 behind`);
      eq(RA.lowPointing(S, toward), 'toward', `${id}/${which}: rotated to the front, group 4 points toward the viewer`);
      eq(LETTER[RA.viewDirection(S, away).dir], want, `${id}/${which}: with 4 away, the on-screen direction of 1-2-3 gives ${want} (the RDKit label)`);
      eq(LETTER[RA.viewDirection(S, toward).dir], otherLabel(want), `${id}/${which}: with 4 toward the viewer the same reading is reversed`);
      for (let t = 0; t < 40; t++) {
        const rot = randRot();
        const p = RA.lowPointing(S, rot), dd = RA.viewDirection(S, rot);
        if (p === 'away') ok(LETTER[dd.dir] === want, `${id}/${which}: random pose, 4 away -> reading = label`);
        else if (p === 'toward') ok(LETTER[dd.dir] === otherLabel(want), `${id}/${which}: random pose, 4 toward -> reading reversed`);
        // the closing sentence the widget shows must be true for the pose the learner answered in
        if (p === 'away') { const t = RA.explainTruth(S, { dir: dd.dir, low: p, swapped: false }); ok(t.includes(`turns ${dirWord[dd.dir]}`) && t.includes(`which is ${want}`) && LETTER[dd.dir] === want, `${id}: explanation for 4 away is true`); }
        if (p === 'toward') { const t = RA.explainTruth(S, { dir: dd.dir, low: p, swapped: false }); ok(/reversed/.test(t) && t.endsWith(`${want}.`) && LETTER[dd.dir] !== want, `${id}: explanation for 4 toward you says reversed`); }
        checks3d++;
      }
      // answers and diagnoses
      ok(RA.gradeLabel(S, want, { dir: 'cw', low: 'away', swapped: false }).ok, `${id}: the right letter is accepted`);
      const wrongL = otherLabel(want);
      const tw = RA.gradeLabel(S, wrongL, { dir: wrongL === 'R' ? 'cw' : 'ccw', low: 'toward', swapped: false });
      ok(!tw.ok && /Group 4 is pointing toward you: reverse your answer/.test(tw.diagnosis), `${id}: forgetting to reverse with 4 toward you says "Group 4 is pointing toward you: reverse your answer"`);
      const aw = RA.gradeLabel(S, wrongL, { dir: wrongL === 'R' ? 'ccw' : 'cw', low: 'away', swapped: false });
      ok(!aw.ok && /clockwise means R/.test(aw.diagnosis), `${id}: a wrong letter with 4 away restates the clockwise/counterclockwise rule`);
      ok(/Group 4 is neither toward nor away/.test(RA.gradeLabel(S, wrongL, { dir: 'cw', low: 'side', swapped: false }).diagnosis), `${id}: sideways group 4 is flagged`);
      ok(RA.gradeOrient(S, 'toward', 'away').diagnosis.length > 20 && RA.gradeOrient(S, 'away', 'away').ok, `${id}: orientation question graded`);
      ok(!RA.gradeDirection(S, 'cw', { dir: 'ccw', area: 1 }).ok && RA.gradeDirection(S, 'cw', { dir: 'cw', area: 1 }).ok && /line up/.test(RA.gradeDirection(S, 'cw', { dir: 'cw', area: 0.001 }).diagnosis), `${id}: direction question graded (and a degenerate view is not graded)`);
    }
    ok(checks3d >= 400, `rs-assigner: ${checks3d} random poses checked against the RDKit label`);
    // the named diagnoses
    {
      const Sg = RA.build({ mode: '3d', model: 'glyceraldehyde', which: 'molblock' });
      const sub = (lab) => Sg.T.subs.findIndex((s) => s.label === lab);
      eq(orderOf(Sg.T), 'OH > CHO > CH₂OH > H', 'glyceraldehyde ranking');
      const dup = RA.gradeRankTap(Sg, 2, sub('CH₂OH'));
      ok(!dup.ok && /Duplicate the C=O: CHO counts as \(O,O,H\)/.test(dup.diagnosis), `diagnosis: "Duplicate the C=O: CHO counts as (O,O,H)" (${dup.diagnosis.slice(0, 80)})`);
      const Sc = RA.build({ mode: '3d', model: '2-chlorobutane', which: 'molblock' });
      const size = RA.gradeRankTap(Sc, 1, Sc.T.subs.findIndex((s) => s.label === 'CH₂CH₃'));
      ok(!size.ok && /You ranked by size, not atomic number/.test(size.diagnosis), `diagnosis: "You ranked by size, not atomic number" (${size.diagnosis.slice(0, 90)})`);
      const hfirst = RA.gradeRankTap(Sc, 1, Sc.T.subs.findIndex((s) => s.label === 'H'));
      ok(!hfirst.ok && /Hydrogen/.test(hfirst.diagnosis), 'diagnosis: hydrogen is always last');
      const sum = RA.gradeRankTap(RA.build({ mode: '3d', model: 'butan-2-ol', which: 'molblock' }), 2, RA.build({ mode: '3d', model: 'butan-2-ol', which: 'molblock' }).T.subs.findIndex((s) => s.label === 'CH₃'));
      ok(!sum.ok && sum.diagnosis.length > 30, 'diagnosis: methyl above ethyl is explained');
      stats.cip += 4;
    }
    // wedge drawings: reading rules (wedge -> reverse, plain -> swap and reverse once)
    let w = 0;
    for (const { d, smi, style, lowOn, pair } of drawings) {
      const S = RA.build({ mode: 'wedge', smiles: smi, style, lowOn, pair });
      const want = S.truth;
      eq(S.lowFlag, d.lowFlag, `${smi}: assigner uses the same drawing`);
      const dir = RA.pageDirection(S, null).dir;
      if (S.lowFlag === 'dash') eq(CH.readRule('dash', dir).label, want, `${smi} ${style}: 4 on a dash -> read directly`);
      else if (S.lowFlag === 'wedge') {
        eq(CH.readRule('wedge', dir).label, want, `${smi} ${style}: 4 on a wedge -> reverse`);
        const r = RA.gradeLabel(S, otherLabel(want), { dir, low: 'wedge', swapped: false });
        ok(!r.ok && /reverse your answer/.test(r.diagnosis), `${smi}: wedge diagnosis`);
      } else {
        const dash = RA.dashedGroup(S);
        ok(!!dash, `${smi}: a dashed group exists for the swap trick`);
        const dirSwapped = RA.pageDirection(S, [4, dash.rank]).dir;
        eq(CH.readRule('dash', dirSwapped).label === 'R' ? 'S' : 'R', want, `${smi} ${style}: swap 4 with the dashed group, read, reverse once`);
        const r = RA.gradeLabel(S, otherLabel(want), { dir: dirSwapped, low: 'dash', swapped: true });
        ok(!r.ok && /swapped two groups/.test(r.diagnosis), `${smi}: swap diagnosis`);
        ok(RA.gradeLabel(S, want, { dir: dirSwapped, low: 'dash', swapped: true }).ok, `${smi}: swap answer accepted`);
      }
      eq(RA.gradePosition(S, S.lowFlag).ok, true, `${smi}: position question`);
      w++;
    }
    stats.wedge += w;
  }

  // ===================================================================================================================
  // (8) stereocenter-finder
  {
    const rounds = [...CENTER_POOL.map((e) => e.smiles), ...fx.centers.map((c) => c.smiles)];
    let wrongTaps = 0;
    for (const smi of new Set(rounds)) {
      const want = SF.expected(smi);
      if (want.length) ok(SF.grade(smi, want, false).ok, `finder ${smi}: the centers are accepted`);
      else ok(SF.grade(smi, [], true).ok, `finder ${smi}: "No chirality center" is accepted`);
      ok(SF.grade(smi, [], false).empty === true, `finder ${smi}: nothing tapped is not graded`);
      const g = readGraph(smi);
      g.atoms.forEach((a, i) => {
        if (want.includes(i)) return;
        const r = SF.grade(smi, want.concat([i]), false);
        ok(!r.ok && r.diagnosis.length > 25 && r.wrong.includes(i), `finder ${smi}: tapping atom ${i + 1} (${a.sym}) is explained`);
        wrongTaps++;
      });
      if (want.length) {
        ok(!SF.grade(smi, [], true).ok && /four different groups/.test(SF.grade(smi, [], true).diagnosis), `finder ${smi}: "No chirality center" is refused when there is one`);
        ok(!SF.grade(smi, want.slice(1), false).ok || want.length === 1, `finder ${smi}: a missed center is noticed`);
      }
      stats.centers++;
    }
    // the reasons name the real cause
    const reason = (smi, atom) => CH.centerReason(smi, atom).why;
    ok(/oxygen/.test(reason('CCC(C)O', 4)), 'finder reason: an oxygen atom');
    ok(/sp²/.test(reason('CC1CCCCC1=O', 6)) && /sp²/.test(reason('CC(C)Cc1ccc(cc1)C(C)C(=O)O', 5)), 'finder reason: C=O and benzene carbons are sp2');
    ok(/three hydrogens/.test(reason('CCC(C)O', 0)) && /two hydrogens/.test(reason('CCC(C)O', 1)), 'finder reason: CH3 and CH2');
    ok(/Two of the four groups are the same/.test(reason('CC(C)O', 1)) && /CH₃/.test(reason('CC(C)O', 1)), 'finder reason: propan-2-ol, two CH3');
    ok(/same atoms/.test(reason('CC1CCCCC1', 1)) && /same atoms/.test(reason('CC1(O)CCCCC1', 1)), 'finder reason: identical ring directions');
    ok(/Yes: this carbon is bonded to four different groups/.test(reason('CCC(C)O', 2)), 'finder reason: a real center');
    ok(wrongTaps > 150, `finder: ${wrongTaps} wrong taps all explained`);
  }

  // ===================================================================================================================
  // (9) the `rs` mastery generator
  const genStats = {};
  {
    ok(GENERATORS.rs === true && generatorForSkill('rs') === 'rs' && generatorForSkill('chirality') === 'rs' && generatorForSkill('ez') === 'alkene-names', 'generator registry routes chirality and rs to `rs`');
    const probs = generate('rs', 420);
    ok(probs.length === 420, 'rs makes 420 problems');
    const poolIds = new Set(), centerSmiles = new Set();
    for (const p of probs) {
      const key = p.kind === 'widget' ? p.widget : p.name ? (p.skill === 'rs' ? 'name' : 'mirror') : /Calculate/.test(p.prompt) ? 'alpha' : 'sign';
      genStats[key] = (genStats[key] || 0) + 1;
      ok(p.prompt && p.derive && p.hints.length === 2 && p.hints.every((x) => x.length > 5) && ['chirality', 'rs'].includes(p.skill), 'rs gen fields');
      if (p.kind === 'widget' && p.widget === 'stereocenter-finder') {
        const smi = p.config.rounds[0].smiles; need(smi); centerSmiles.add(smi);
        eq(p.centers, chiralCenters(smi), 'finder problem answer = centers');
        ok(SF.grade(smi, p.centers, p.centers.length === 0).ok, 'finder problem solvable');
      } else if (p.kind === 'widget') {
        const smi = p.config.smiles; need(smi);
        const S = RA.build(p.config);
        eq(S.truth, p.answer, 'rs problem: assigner truth = answer');
        eq(S.truth, tetraInfo(smi).find((x) => x.center).label, 'rs problem: label from the SMILES');
        wedgeJobs.push({ mb: S.drawing.molblock, center: S.drawing.center, want: S.truth, id: 'gen ' + smi });
        ok(['full', 'quick'].includes(p.config.flow), 'rs problem flow');
        const e = RS_POOL.find((x) => canon(x.smiles.replace(/@@?/g, '')) === canon(smi.replace(/@@?/g, ''))); ok(!!e, 'rs problem molecule is from the pool'); if (e) poolIds.add(e.id);
      } else if (p.name) {
        need(p.smiles);
        const T = tetraInfo(p.smiles).find((x) => x.center);
        const e = RS_POOL.find((x) => canon(x.smiles.replace(/@@?/g, '')) === canon(p.smiles.replace(/@@?/g, '')));
        poolIds.add(e.id);
        const stub = { answer: p.answer, accept: p.accept, name: true, diagnose: p.wrong, fallback: p.fallback, skill: p.skill };
        const nm = (l) => rsName(e, l);
        if (p.skill === 'rs') {
          eq(p.answer, nm(T.label).new, 'name problem answer = (label)-name');
          ok(checkInput(stub, nm(T.label).new).ok && checkInput(stub, nm(T.label).old.toUpperCase()).ok, 'name problem accepts both styles');
          ok(!checkInput(stub, nm(otherLabel(T.label)).new).ok && /not/.test(checkInput(stub, nm(otherLabel(T.label)).new).diagnosis), 'name problem: the wrong letter is explained');
          ok(!checkInput(stub, e.new).ok && /needs \(R\) or \(S\)/.test(checkInput(stub, e.new).diagnosis), 'name problem: a missing prefix is explained');
        } else {
          eq(p.answer, nm(otherLabel(T.label)).new, 'mirror problem answer = the opposite letter');
          ok(checkInput(stub, nm(otherLabel(T.label)).new).ok && checkInput(stub, nm(otherLabel(T.label)).old).ok, 'mirror problem accepts both styles');
          ok(!checkInput(stub, nm(T.label).new).ok && /mirror image/.test(checkInput(stub, nm(T.label).new).diagnosis), 'mirror problem: the shown molecule\'s own name is explained');
          ok(p.promptHtml.includes(`new="${nm(T.label).new}"`), 'mirror problem prompt names the molecule shown (through the toggle)');
        }
        for (const nn of [nm(T.label), nm(otherLabel(T.label))]) { expectOpsin(nn.new, null, 'gen name'); }
        expectOpsin(p.answer, null, 'gen answer');
      } else if (/Calculate/.test(p.prompt)) {
        const d = p.data;
        const exact = CH.specificRotation(d.alpha, d.lengthDm, d.grams, d.mL);
        ok(Math.abs(p.answer - exact) <= 0.05 + 1e-9 && p.tolerance === 0.1, `alpha problem: answer ${p.answer} == ${exact.toFixed(3)} (+-0.1 accepted)`);
        const stub = { answer: p.answer, accept: p.accept, tolerance: p.tolerance, diagnose: p.wrong, fallback: p.fallback, skill: p.skill };
        ok(checkInput(stub, String(p.answer)).ok && checkInput(stub, String(exact.toFixed(2))).ok && checkInput(stub, String(p.answer + 0.09)).ok && checkInput(stub, String(p.answer - 0.09)).ok, 'alpha problem: within 0.1 accepted');
        ok(!checkInput(stub, String(p.answer + 0.3)).ok && !checkInput(stub, String(-p.answer)).ok, 'alpha problem: 0.3 off and the wrong sign are refused');
        ok(Math.sign(p.answer) === Math.sign(d.alpha), 'alpha problem: sign of [a] = sign of the observed rotation');
        ok(d.lengthDm > 0 && d.grams > 0 && d.mL > 0, 'alpha problem data positive');
      } else {
        const T = tetraInfo(p.smiles).find((x) => x.center); need(p.smiles);
        const m = /\[α\]D = ([+\u2212])?(\d+(?:\.\d+)?)/.exec(p.prompt);
        ok(m && p.answer === (m[1] === '+' ? -1 : 1) * Number(m[2]), 'sign problem: enantiomer has the opposite sign');
        ok(p.prompt.includes(`the (${T.label}) form`) && p.prompt.includes(`(${otherLabel(T.label)}) form`), 'sign problem names the shown and the opposite form correctly');
      }
    }
    ok(poolIds.size >= 30, `the generator reaches ${poolIds.size} of ${RS_POOL.length} pool molecules in 420 problems`);
    ok(centerSmiles.size >= 15, `find-the-centers draws from ${centerSmiles.size} molecules`);
    ok(['stereocenter-finder', 'rs-assigner', 'name', 'mirror', 'alpha', 'sign'].every((k) => genStats[k] > 20), `rs mixes all six tasks ${JSON.stringify(genStats)}`);
    const run = () => generate('rs', 6).map((p) => (p.config && (p.config.smiles || (p.config.rounds && p.config.rounds[0].smiles))) || p.smiles || p.prompt).join('|');
    ok(new Set([run(), run(), run(), run(), run()]).size > 1, 'rs is fresh each run');
    ok(generate('rs', 12, { skill: 'rs' }).every((p) => p.skill === 'rs') && generate('rs', 12, { skill: 'chirality' }).every((p) => p.skill === 'chirality'), 'weak-spot practice serves only the asked skill');
    ok(skillLabel('rs').length > 5 && skillRule('rs').length > 60 && skillLabel('chirality').length > 5 && skillRule('chirality').length > 60, 'skills rs and chirality have labels and rules');
    ok(WIDGETS['mirror-pair'] && WIDGETS['rs-assigner'] && WIDGETS['stereocenter-finder'] && ['mirror-pair', 'rs-assigner', 'stereocenter-finder'].every((k) => typeof WIDGETS[k].mount === 'function'), 'the three widgets are registered');
  }

  // ===================================================================================================================
  // (10) the lesson itself
  {
    const l = L;
    ok(l && l.steps.length >= 16 && l.steps.length <= 20, `L15 has 16-20 steps (${l && l.steps.length})`);
    ok(l.drawing === 'skeletal' && l.chapter === 6 && l.minutes >= 28 && l.minutes <= 30, 'L15 drawing skeletal, chapter 6, 28-30 min');
    eq(l.sections, ['6.1', '6.2', '6.3', '6.4', '6.5'], 'L15 sections');
    eq(l.mastery, { count: 3, generator: 'rs' }, 'L15 mastery uses rs');
    ok(l.steps[0].type === 'predict' && l.steps[1].type === 'predict' && l.steps.findIndex((s) => s.type === 'explain') > 1, 'L15 predicts (hands, then molecules) before it explains');
    ok(l.steps.every((s) => ['chirality', 'rs'].includes(s.skill)), 'L15 skill tags');
    ok(l.steps.some((s) => s.skill === 'chirality') && l.steps.some((s) => s.skill === 'rs'), 'L15 covers chirality and rs');
    const wd = (s) => s.widget;
    ok(l.steps.filter((s) => wd(s) === 'rs-assigner' && s.config.mode === '3d').length >= 3, 'L15: several full R/S assignments on 3D models');
    ok(l.steps.filter((s) => wd(s) === 'rs-assigner' && s.config.mode === 'wedge').length >= 2, 'L15: several wedge drawings');
    ok(l.steps.filter((s) => wd(s) === 'stereocenter-finder').length >= 2, 'L15: the tap task on several molecules');
    ok(l.steps.some((s) => wd(s) === 'mirror-pair' && !s.config.mode) && l.steps.some((s) => wd(s) === 'mirror-pair' && s.config.mode === 'plane'), 'L15: mirror-pair superposition and the symmetry-plane check');
    ok(l.steps.some((s) => s.type === 'worked') && l.steps.some((s) => s.type === 'input' && s.name), 'L15: a worked example and a typed (R)/(S) name');
    ok(l.steps.some((s) => s.type === 'input' && s.tolerance === 0.1), 'L15: [a]D calculation with a tolerance of 0.1');
    for (const s of l.steps.filter((x) => x.type === 'explain')) ok(wordsOf(s.html) <= 80, `${s.id} explain <= 80 words (${wordsOf(s.html)})`);
    // (a) mirror-pair step: models exist, verdicts computed
    const mp = l.steps.find((s) => wd(s) === 'mirror-pair' && !s.config.mode);
    eq(mp.config.models.map((m) => !MP.judgeModel(m).chiral), [false, true, false], 'L15 s03: CHFClBr chiral, CH2ClBr achiral, butan-2-ol chiral (Kabsch)');
    // (b) finder steps
    const f1 = l.steps.find((s) => s.id === 's05'), f2 = l.steps.find((s) => s.id === 's06');
    eq(f1.config.rounds.map((r) => chiralCenters(r.smiles).length), [1, 0, 0], 'L15 s05: butan-2-ol 1, propan-2-ol 0, pentan-3-ol 0');
    eq(f2.config.rounds.map((r) => chiralCenters(r.smiles).length), [0, 0, 1, 1], 'L15 s06: methylcyclohexane 0, 1-methylcyclohexanol 0, 2-methylcyclohexanone 1, ibuprofen 1');
    for (const s of [f1, f2]) for (const r of s.config.rounds) need(r.smiles);
    // (c) plane step
    {
      const s = l.steps.find((x) => wd(x) === 'mirror-pair' && x.config.mode === 'plane');
      const m = MP.modelOf(s.config.model); const pl = CH.mirrorPlanes(m.atoms);
      ok(pl.length === 1 && pl[0].inPlane.map((i) => m.atoms[i].el).sort().join() === 'Br,C,Cl', 'L15 s07: the plane contains C, Cl and Br');
      ok(/C, Cl and Br/.test(s.confirm), 'L15 s07 confirm names the in-plane atoms');
    }
    // (d) [a]D
    {
      const s = l.steps.find((x) => x.id === 's10');
      const val = CH.specificRotation(-1.30, 20.0 / 10, 2.40, 12.0);
      ok(Math.abs(val - s.answer) < 1e-9 && s.answer === -3.25, `L15 s10: [a]D recomputed = ${val}`);
      ok(checkInput(s, '-3.25').ok && checkInput(s, '-3.3').ok && checkInput(s, '-3.2').ok && checkInput(s, '−3.3').ok && !checkInput(s, '-3.4').ok && !checkInput(s, '3.25').ok, 'L15 s10: accepts within 0.1, refuses 0.15+ off and the wrong sign');
      ok(s.diagnose.every((d) => !checkInput(s, String(d.match)).ok && checkInput(s, String(d.match)).diagnosis === d.why), 'L15 s10: every wrong value routes to its reason');
      ok(Math.abs(CH.specificRotation(-1.30, 20.0, 2.40, 12.0) - -0.325) < 1e-9, 'L15 s10: the cm trap value -0.325');
      ok(Math.abs(-1.30 / 2.00 - -0.65) < 1e-9 && Math.abs(-1.30 / 0.2 - -6.5) < 1e-9, 'L15 s10: the other trap values');
    }
    // (e) limonene and carvone: both R
    {
      const s = l.steps.find((x) => x.id === 's11');
      eq(s.figures.map((f) => tetraInfo(f.smiles).find((x) => x.center).label), ['R', 'R'], 'L15 s11: limonene and carvone are both R');
      s.figures.forEach((f) => need(f.smiles));
      ok(/\+/.test(s.figures[0].label) && /\u2212|-/.test(s.figures[1].label), 'L15 s11: limonene (+), carvone (-)');
    }
    // (f) rs-assigner steps: truth, ranking text and directions are what the confirm text says
    const facts = [['s12', 'R', 'Br > Cl > F > H', 'cw'], ['s14', 'S', 'OH > CH₂CH₃ > CH₃ > H', 'ccw'], ['s15', 'R', 'OH > CHO > CH₂OH > H', 'cw']];
    for (const [id, label, order, dir] of facts) {
      const s = l.steps.find((x) => x.id === id);
      const S = RA.build(s.config);
      eq(S.truth, label, `L15 ${id}: label`);
      eq(orderOf(S.T), order, `L15 ${id}: ranking`);
      const away = CH.rotBetween([...(() => { const a = S.mol.atoms, c = a[S.center], g = a[S.groups.find((g2) => g2.rank === 4).atom]; return [g.x - c.x, g.y - c.y, g.z - c.z]; })()], [0, 0, -1]);
      eq(RA.viewDirection(S, away).dir, dir, `L15 ${id}: direction with 4 away`);
      const txt = plain(s.confirm);
      ok(new RegExp(`${label}\\.?$`).test(txt.trim()), `L15 ${id}: confirm ends with ${label}`);
      ok(txt.includes(dirWord[dir]), `L15 ${id}: confirm says ${dirWord[dir]}`);
      need(CHIRAL[s.config.model].smiles);
    }
    // the first three confirm texts quote their ranking in order (ignoring the "(C,H,H)" sets)
    ok(plain(l.steps.find((x) => x.id === 's12').confirm).startsWith('Br (35) > Cl (17) > F (9) > H (1)'), 'L15 s12: atomic numbers quoted are right (Br 35, Cl 17, F 9, H 1)');
    ok(plain(l.steps.find((x) => x.id === 's14').confirm).startsWith('OH (O) > CH₂CH₃ (C,H,H) > CH₃ (H,H,H) > H'), 'L15 s14: attached sets quoted');
    ok(plain(l.steps.find((x) => x.id === 's15').confirm).startsWith('OH > CHO (O,O,H) > CH₂OH (O,H,H) > H'), 'L15 s15: CHO (O,O,H) vs CH2OH (O,H,H)');
    // (g) wedge steps
    {
      const s16 = l.steps.find((x) => x.id === 's16'), s18 = l.steps.find((x) => x.id === 's18');
      const S16 = RA.build(s16.config), S18 = RA.build(s18.config);
      eq([S16.truth, S16.lowFlag, RA.pageDirection(S16, null).dir, orderOf(S16.T)], ['R', 'wedge', 'ccw', 'Br > CH₂CH₃ > CH₃ > H'], 'L15 s16: R, 4 on a wedge, 1-2-3 counterclockwise');
      eq([S18.truth, S18.lowFlag, RA.pageDirection(S18, [4, RA.dashedGroup(S18).rank]).dir, orderOf(S18.T), RA.dashedGroup(S18).label], ['S', 'plain', 'cw', 'NH₂ > CO₂H > CH₃ > H', 'CH₃'], 'L15 s18: S, 4 plain, after the swap with the dashed CH3 it runs clockwise');
      ok(/counterclockwise/.test(plain(s16.confirm)) && /<b>R<\/b>/.test(s16.confirm) && /clockwise/.test(plain(s18.confirm)) && /<b>S<\/b>/.test(s18.confirm), 'L15 s16/s18 confirm texts state the computed facts');
      need(s16.config.smiles); need(s18.config.smiles);
      // s17: swapping two groups gives the enantiomer
      const s17 = l.steps.find((x) => x.id === 's17');
      eq(s17.smiles, s16.config.smiles, 'L15 s17 shows the s16 molecule');
      eq(tetraInfo(CH.flipStereo(s17.smiles)).find((x) => x.center).label, 'S', 'L15 s17: the swapped molecule is (S)');
      ok(/\(S\)/.test(s17.options.find((o) => o.correct).text), 'L15 s17 correct option says (S)');
      // swapping two substituents really gives the enantiomer: check with RDKit coordinates (swap Br and H of the 3D 2-bromobutane)
      const e = CHIRAL['2-bromobutane'], mi = CH.model3dInfo(e);
      const atoms = mi.mol.atoms.map((p) => ({ ...p })); const gBr = mi.groups.find((g) => g.rank === 1).atom, gH = mi.groups.find((g) => g.rank === 4).atom;
      const tmpP = { x: atoms[gBr].x, y: atoms[gBr].y, z: atoms[gBr].z };
      ['x', 'y', 'z'].forEach((k) => { atoms[gBr][k] = atoms[gH][k]; atoms[gH][k] = tmpP[k]; });
      eq(CH.geomLabel(atoms, mi.center, mi.groups).label, 'S', 'swapping Br and H in the 3D coordinates inverts R to S');
      stats.mirror += 1;
    }
    // (h) worked example: every claim recomputed
    {
      const w = l.steps.find((x) => x.type === 'worked');
      const cfg = w.moves[0].visual.config;
      ok(w.moves.every((m) => m.visual === undefined || (m.visual.config.smiles === cfg.smiles && m.visual.config.style === cfg.style && m.visual.config.lowOn === cfg.lowOn)), 'L15 worked: every picture is the same drawing');
      const S = RA.build({ mode: 'wedge', smiles: cfg.smiles, style: cfg.style, lowOn: cfg.lowOn });
      eq(orderOf(S.T), 'OH > CO₂H > CH₃ > H', 'L15 worked: ranking');
      eq([S.lowFlag, RA.pageDirection(S, null).dir, S.truth], ['dash', 'cw', 'R'], 'L15 worked: H on a dash, clockwise, R');
      ok(plain(w.moves[0].options.find((o) => o.correct).text) === 'OH > CO₂H > CH₃ > H', 'L15 worked: the correct ranking option');
      ok(/dash/.test(w.moves[1].options.find((o) => o.correct).text) && /Clockwise/.test(w.moves[2].options.find((o) => o.correct).text) && /^R:/.test(w.moves[3].options.find((o) => o.correct).text), 'L15 worked: dash, clockwise, R');
      need(cfg.smiles);
    }
    // (i) the typed name
    {
      const s = l.steps.find((x) => x.id === 's20');
      need(s.smiles);
      const T = tetraInfo(s.smiles).find((x) => x.center);
      eq(T.label, 'R', 'L15 s20 molecule is R');
      const e = RS_POOL.find((x) => x.id === 'butan-2-ol');
      eq([s.answer, s.accept[0]], [rsName(e, 'R').new, rsName(e, 'R').old], 'L15 s20 answers = pool names');
      ok(checkInput(s, s.answer).ok && checkInput(s, s.accept[0]).ok && checkInput(s, s.answer.toUpperCase()).ok && checkInput(s, ' (r) butan 2 ol ').ok, 'L15 s20 accepts both styles');
      ok(!checkInput(s, '(S)-butan-2-ol').ok && !checkInput(s, 'butan-2-ol').ok, 'L15 s20 refuses the wrong letter and a missing prefix');
      for (const d of s.diagnose) { const r = checkInput(s, d.match); ok(!r.ok && r.diagnosis === d.why, `L15 s20 diagnose ${d.match}`); }
      expectOpsin(s.answer, s.smiles, 's20 new'); expectOpsin(s.accept[0], s.smiles, 's20 old');
    }
    // (j) <name new old> tags: both styles are the same compound in OPSIN
    const tagChecks = [];
    for (const s of l.steps) for (const str of htmlStrings(s)) for (const m of str.matchAll(/<name new="([^"]*)" old="([^"]*)"/g)) tagChecks.push({ id: s.id, n: m[1], o: m[2] });
    ok(tagChecks.length >= 8, `L15 renders names through <name new old> (${tagChecks.length} tags)`);
    tagChecks.forEach((t) => { expectOpsin(t.n, null, 'tag new'); expectOpsin(t.o, null, 'tag old'); });
    for (const s of l.steps) {
      const shown = htmlStrings({ ...s, config: undefined, visual: undefined, diagnose: undefined, answer: undefined, accept: undefined }).join(' ').replace(/<name[^>]*><\/name>/g, '');
      ok(!/\b(?:but|prop|pent|hex)an-\d-(?:ol|one)\b|\b\d-(?:but|prop|pent|hex)an(?:ol|one)\b/.test(shown), `${s.id} has no hard-coded style-dependent name outside <name>`);
    }
    // (k) book problems by number only, from chapter 6, real numbers from ch6
    {
      const b = l.useIt.book;
      const want = ['6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7', '6.8', '6.9', '6.10', '6.11', '6.22', '6.24', '6.25', '6.26', '6.27', '6.28', '6.29', '6.30', '6.31', '6.32', '6.33', '6.34', '6.35', '6.36', '6.37', '6.38', '6.39', '6.40', '6.41', '6.42'];
      ok(want.every((p) => b.includes(p)), 'L15 useIt: in-chapter 6.1-6.11, visualizing 6.22/6.24/6.25, identifying centers 6.26-6.32, optical activity 6.33-6.35, assigning R,S 6.36-6.42');
      ok(b.every((p) => /^6\.\d+$/.test(p)) && l.useIt.endFrom === 21, 'L15 useIt: chapter 6 numbers, end of chapter from 6.21');
      ok(!b.some((p) => ['6.12', '6.13', '6.14', '6.15', '6.16', '6.17', '6.18', '6.19', '6.20', '6.43', '6.44', '6.45', '6.46', '6.47', '6.48', '6.49', '6.50'].includes(p)), 'L15 useIt: leaves diastereomers, meso and relationships for Lesson 16');
      ok(!/(?:^|\D)(?:Problem|problem)\s+6\.\d+:/.test(l.useIt.note), 'L15 useIt note refers to problems only by number and topic');
    }
  }

  // ===================================================================================================================
  // (11) Python RDKit: R/S (new CIP labeler), chirality centers (FindMolChiralCenters, new implementation), wedge molblocks, 3D models
  {
    const list = [...smilesSet];
    const ref = pyJson('check_rs', { smiles: list, wedges: wedgeJobs.map((j) => j.mb), models: models3d });
    let labelled = 0, centerN = 0, bad = 0;
    for (const s of list) {
      const r = ref.smiles[s];
      if (!r) { ok(false, `RDKit parses ${s}`); continue; }
      const T = tetraInfo(s);
      const mine = {}; T.filter((x) => x.label).forEach((x) => { mine[String(x.atom)] = x.label; labelled++; });
      const same = JSON.stringify(mine) === JSON.stringify(r.cip) && JSON.stringify(chiralCenters(s)) === JSON.stringify(r.centers);
      if (!same) bad++;
      ok(same, `CIP agrees with Python RDKit for ${s}: mine ${JSON.stringify(mine)}/${JSON.stringify(chiralCenters(s))} RDKit ${JSON.stringify(r.cip)}/${JSON.stringify(r.centers)}`);
      centerN += r.centers.length;
      stats.cip++;
    }
    ok(labelled >= 1200 && bad === 0, `Python RDKit comparison: ${labelled} R/S labels and ${centerN} centers over ${list.length} molecules (${bad} disagreements)`);
    // the brief's statements about RDKit itself
    ok(ref.smiles['C[C@@H](O)CC'].cip['1'] === 'R' && ref.smiles['C[C@H](O)CC'].cip['1'] === 'S' && ref.smiles['CC[C@@H](C)Br'].cip['2'] === 'R' && ref.smiles['C[C@H](N)C(=O)O'].cip['1'] === 'S' && ref.smiles['OC[C@@H](O)C=O'].cip['2'] === 'R' && ref.smiles['C[C@@H](O)C(=O)O'].cip['1'] === 'R' && ref.smiles['CCC[C@H](C)CC'].cip['3'] === 'R', 'Python RDKit: (R)/(S)-butan-2-ol, (R)-2-bromobutane, (S)-alanine, (R)-glyceraldehyde, (R)-lactic acid, (R)-3-methylhexane');
    ok(['CC(C)O', 'CCC(O)CC', 'CC1CCCCC1', 'CC1(O)CCCCC1'].every((s) => ref.smiles[s].centers.length === 0) && ref.smiles['CCC(C)Cl'].centers.length === 1 && ref.smiles['CC1CCCCC1=O'].centers.length === 1 && ref.smiles['CC(C)Cc1ccc(cc1)C(C)C(=O)O'].centers.length === 1 && ref.smiles['CC1=CCC(CC1=O)C(C)=C'].centers.length === 1, 'Python RDKit: propan-2-ol, pentan-3-ol, methylcyclohexane, 1-methylcyclohexanol none; 2-chlorobutane, 2-methylcyclohexanone, ibuprofen, carvone one');
    // wedge molblocks read back by RDKit
    let wOk = 0;
    wedgeJobs.forEach((j, i) => {
      const r = ref.wedges[i];
      const got = r && r.cip[String(j.center)];
      if (got === j.want) wOk++;
      ok(got === j.want, `Python RDKit reads the wedge drawing ${j.id} as ${j.want} (got ${got})`);
    });
    stats.wedge += wOk;
    // 3D models: configuration read from the coordinates; the mirror gives the opposite letter
    for (const id of modelIds) {
      const e = CHIRAL[id];
      const a = ref.models['m:' + id], b = ref.models['x:' + id];
      if (e.achiral) { ok(Object.keys(a.cip).length === 0 && Object.keys(b.cip).length === 0, `Python RDKit: ${id} (achiral) and its mirror image have no label`); }
      else {
        eq(a.cip[String(e.center)], e.label, `Python RDKit: 3D ${id} is ${e.label}`);
        eq(b.cip[String(e.center)], otherLabel(e.label), `Python RDKit: the reflected ${id} is ${otherLabel(e.label)}`);
        stats.mirror += 2;
      }
    }
  }

  // ===================================================================================================================
  // (12) OPSIN: every name means the structure it came from
  {
    const uniq = [...new Set(queue.map((q) => q.name))];
    const res = pyJson('check_names', uniq);
    let n = 0, good = 0;
    for (const q of queue) {
      n++;
      const out = res[q.name];
      const match = !!out && (q.smiles === null ? canon(out) !== null : canon(out) === canon(q.smiles));
      if (match) good++;
      ok(match, `OPSIN round-trip (${q.label}): "${q.name}" -> ${out || 'unparsed'} expected ${q.smiles === null ? '(any structure)' : canon(q.smiles)}`);
    }
    // both styles of every <name> tag are one compound in OPSIN
    const l = L;
    for (const s of l.steps) for (const str of htmlStrings(s)) for (const m of str.matchAll(/<name new="([^"]*)" old="([^"]*)"/g)) {
      const a = res[m[1]], b = res[m[2]];
      ok(!!a && !!b && canon(a) === canon(b), `${s.id} tag ${m[1]} / ${m[2]}: both styles are the same compound in OPSIN`);
    }
    stats.names = good;
    ok(n >= 150 && good === n, `OPSIN agreed on all ${n} names`);
    console.log(`  Lesson 15: fixture ${stats.fixture} cases (${fx.cases.length} configurations + ${fx.centers.length} center counts); Python RDKit agreement ${stats.cip} molecules/answers; mirror/Kabsch checks ${stats.mirror + stats.kabsch}; wedge drawing checks ${stats.wedge} (${stats.drawings} drawings, each read back geometrically and by Python); OPSIN ${good}/${n} names; generator mix ${JSON.stringify(genStats)}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

// run alone: node learn/tests/lesson15.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await lesson15({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
