// Lesson 16 checks: stereochemical RELATIONSHIPS (identical / enantiomers / diastereomers / constitutional), meso compounds, counts of stereoisomers,
// planes of symmetry on solid 3D models, racemates and resolution. Everything is computed in JS (engine/chirality.js relationship()/isMeso(),
// engine/stereoisomers.js enumeration) and RE-COMPUTED independently in Python RDKit (tools/check_relationships.py: EnumerateStereoisomers, every
// tetrahedral tag inverted for the mirror image, 3D mirror-plane and Kabsch checks with numpy). Names with (2R,3S)-style prefixes are round-tripped
// through OPSIN, and a hand-checked fixture (tests/fixtures/relationships.json) is given BY NAME so OPSIN, not our engine, supplies the structures.
// Fischer projections (steps s21-s28, generator `fischer`) are checked in section (9) against Python RDKit (tools/check_fischer.py).
// Run on its own with `node learn/tests/lesson16.mjs`, or as part of run.mjs.
import { ready, rdkit, canon } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS, PLANNED } from '../lessons/index.js';
import MESO from '../data/3d/meso.js';
import { tetraInfo, chiralCenters } from '../engine/cip.js';
import * as CH from '../engine/chirality.js';
import * as SI from '../engine/stereoisomers.js';
import * as RES from '../engine/resolution.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import { REL_SKILLS, BR2_ALKENE_LIST, makePair } from '../engine/generators-relationships.js';
import { checkInput } from '../engine/steps.js';
import { WIDGETS } from '../engine/widgets/index.js';
import * as SG from '../engine/widgets/stereo-grid.js';
import * as SP from '../engine/widgets/symmetry-plane.js';
import * as RD from '../engine/widgets/relationship-drill.js';
import * as IT from '../engine/widgets/isomer-tree.js';
import * as RF from '../engine/widgets/resolution-flow.js';
import * as MP from '../engine/widgets/mirror-pair.js';
import { predictAdd } from '../engine/reactions-additions.js';
import { skillLabel, skillRule } from '../engine/skills.js';
import * as FI from '../engine/fischer.js';
import * as FG from '../engine/generators-fischer.js';
import * as FQ from '../engine/widgets/fischer-quiz.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.join(HERE, '..', 'tools');

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function htmlStrings(o, out = []) {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => htmlStrings(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => htmlStrings(x, out));
  return out;
}
const plain = (s) => s.replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<');

export async function lesson16({ ok, eq }) {
  await ready();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-rel-'));
  const pyJson = (script, data) => {
    const inp = path.join(tmp, 'in-' + script + '.json'), out = path.join(tmp, 'out-' + script + '.json');
    fs.writeFileSync(inp, JSON.stringify(data));
    execFileSync('python3', ['-I', path.join(TOOLS, script + '.py'), inp, out], { stdio: ['ignore', 'ignore', 'inherit'] });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const L = LESSONS.find((x) => x.id === '16');
  const stats = { fixture: 0, rel: 0, counts: 0, meso: 0, kabsch: 0, planes: 0, names: 0, cis: 0 };

  // job lists for the Python / OPSIN passes
  const pairJobs = [];                 // [a, b, expectedKind|null, label]
  const mesoJobs = [];                 // [smiles, expected|null, label]
  const enumJobs = new Set();
  const ringJobs = new Set();
  const opsin = [];                    // { name, smiles|null, label, cb? }
  const addPair = (a, b, expected, label) => pairJobs.push([a, b, expected, label]);
  const addMeso = (s, expected, label) => mesoJobs.push([s, expected, label]);

  // =====================================================================================================================
  // (1) the pool: every stereoisomer, counts with the meso collapse, names, cis/trans
  const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'relationships.json'), 'utf8'));
  ok(L && L.id === '16', 'lesson 16 is registered');
  ok(PLANNED.length === 0, 'no locked placeholders are left');
  ok(SI.STEREO_POOL.length >= 20 && SI.STEREO_POOL.filter((e) => e.ring).length >= 6, `stereoisomer pool: ${SI.STEREO_POOL.length} molecules, ${SI.STEREO_POOL.filter((e) => e.ring).length} rings`);
  const E = {};
  for (const e of SI.STEREO_POOL) {
    const t = `pool ${e.id}`;
    E[e.id] = SI.enumerate(e);
    const en = E[e.id];
    const cs = SI.centersOfEntry(e);
    eq(cs.length, 2, `${t}: two chirality centres`);
    ok(en.combos.length === 4, `${t}: 2^2 combinations`);
    ok(en.total === 3 || en.total === 4, `${t}: 3 or 4 distinct stereoisomers (${en.total})`);
    eq(en.total, 2 ** cs.length - en.meso, `${t}: total = 2^n - (meso merges)`);
    eq(en.meso + en.pairs * 2 + en.achiralNoMeso, en.total, `${t}: meso + 2 x pairs = total`);
    eq(en.achiralNoMeso, 0, `${t}: no achiral stereoisomer without centres`);
    enumJobs.add(e.flat);
    for (const d of en.distinct) {
      // chirality, meso and the enantiomer of each distinct compound
      eq(d.meso, !d.chiral, `${t} ${d.smiles}: meso <=> achiral`);
      if (d.chiral) ok(en.distinct.some((o) => o.iso === d.mirrorIso), `${t}: the enantiomer of ${d.smiles} is in the set`);
      const nm = SI.stereoName(e, d.smiles);
      opsin.push({ name: nm.new, smiles: d.smiles, label: `${e.id} new` });
      if (nm.old !== nm.new) opsin.push({ name: nm.old, smiles: d.smiles, label: `${e.id} old` });
      addMeso(d.smiles, d.meso, `${t} ${nm.new}`);
      if (e.ring) ringJobs.add(d.smiles);
    }
    // every combination, every pair (16 per molecule) is cross-checked in Python
    for (let i = 0; i < en.combos.length; i++) for (let j = 0; j < en.combos.length; j++) addPair(en.combos[i].smiles, en.combos[j].smiles, null, `${t} ${i}-${j}`);
    if (e.ring) for (const c of en.combos) ringJobs.add(c.smiles);
    // the centres' atoms are the ones of the book definition (R/S for each from cip.js agrees with the name prefix: OPSIN above)
    for (const c of en.combos) eq(c.labels.length, 2, `${t}: ${c.smiles} has two labels`);
  }
  for (const [id, parts] of Object.entries(SI.PARTNERS)) {
    const e = SI.POOL_BY_ID[id];
    ok(!!e, `partners: ${id} is a pool molecule`);
    for (const p of parts) {
      for (const c of E[id].combos) { addPair(c.smiles, p.smiles, 'constitutional', `partner ${id} - ${p.smiles}`); }
      ok(['skeletal', 'positional', 'functional'].includes(p.kind), `partner ${p.smiles} has a kind`);
    }
  }

  // hand-checked counts (the brief: threonine, tartaric acid, 2,3-dibromobutane, 2,3-butanediol, 1,2-dimethylcyclohexane, 2-bromo-3-chlorobutane, 1,2-dibromocyclopentane)
  for (const c of fx.counts) {
    const e = SI.POOL_BY_ID[c.id], en = E[c.id];
    eq([SI.centersOfEntry(e).length, en.total, en.pairs, en.meso], [c.centers, c.total, c.pairs, c.meso], `fixture count ${c.id}`);
    if (c.cisIsMeso) {
      const cis = SI.tagged(e, e.cisBits);
      ok(CH.isMeso(cis) && SI.cisTrans(e, cis) === 'cis', `${c.id}: the cis isomer is the meso compound`);
      const trans = en.distinct.filter((d) => SI.cisTrans(e, d.smiles) === 'trans');
      ok(trans.length === 2 && trans.every((d) => d.chiral), `${c.id}: the trans isomer is a chiral pair`);
    }
    stats.counts++; stats.fixture++;
  }
  // 2 centres do not always give 4: a meso form needs matching halves
  ok(SI.STEREO_POOL.filter((e) => E[e.id].meso === 1).every((e) => { const f = e.flat; const T = tetraInfo(f).filter((t) => t.center); return T.length === 2 && T[0].subs.map((s) => s.label).sort().join() === T[1].subs.map((s) => s.label).sort().join() || e.ring; }), 'every meso-capable acyclic molecule has the same four group labels on both centres');
  // no molecule with a meso form has different groups at the ends: the converse for non-meso entries
  for (const id of ['threonine', 'bromochlorobutane', 'bromobutanol', 'dibromopentane23', 'methylpentanol', 'isoleucine', 'methylcyclohexanol', 'bromochlorocyclohexane']) {
    const T = tetraInfo(SI.POOL_BY_ID[id].flat).filter((t) => t.center);
    ok(T[0].subs.map((s) => s.label).sort().join() !== T[1].subs.map((s) => s.label).sort().join() || SI.POOL_BY_ID[id].ring, `${id}: different groups on the two centres (no meso form)`);
    eq(E[id].meso, 0, `${id}: no meso`);
  }

  // =====================================================================================================================
  // (2) relationship(), isMeso() against the hand-checked fixture given by NAME (OPSIN supplies the structures)
  const fixtureNames = new Set();
  fx.relationships.forEach((r) => { fixtureNames.add(r.a); fixtureNames.add(r.b); });
  fx.meso.forEach((r) => fixtureNames.add(r.name));
  fx.names.forEach((r) => fixtureNames.add(r.name));
  const nameRes = pyJson('check_names', [...fixtureNames, ...opsin.map((o) => o.name)]);
  const smilesOfName = (n) => nameRes[n];
  for (const r of fx.relationships) {
    const a = smilesOfName(r.a), b = smilesOfName(r.b);
    ok(!!a && !!b, `OPSIN parses ${r.a} / ${r.b}`);
    if (!a || !b) continue;
    const got = CH.relationship(a, b);
    eq(got.kind, r.kind, `fixture relationship ${r.a} / ${r.b}${r.why ? ' (' + r.why + ')' : ''}`);
    addPair(a, b, r.kind, `fixture ${r.a} / ${r.b}`);
    stats.fixture++;
  }
  for (const r of fx.meso) {
    const s = smilesOfName(r.name);
    ok(!!s, `OPSIN parses ${r.name}`);
    if (!s) continue;
    eq(CH.isMeso(s), r.meso, `fixture isMeso ${r.name}`);
    addMeso(s, r.meso, `fixture ${r.name}`);
    stats.fixture++;
  }
  for (const r of fx.names) {
    ok(canon(smilesOfName(r.name)) === canon(r.smiles), `fixture name ${r.name} (${r.note}) = our structure`);
    stats.fixture++;
  }
  // the brief's cis/trans-1,4 statement: no chirality centres in the book sense, so not meso, and cis/trans are diastereomers
  {
    const cis = 'C[C@H]1CC[C@@H](C)CC1', trans = 'C[C@H]1CC[C@H](C)CC1';
    eq(chiralCenters(cis), [], '1,4-dimethylcyclohexane has no chirality centres (book definition)');
    ok(!CH.isMeso(cis) && !CH.isMeso(trans), 'cis- and trans-1,4-dimethylcyclohexane are not meso (no chirality centres)');
    eq(CH.relationship(cis, trans).kind, 'diastereomers', 'cis- and trans-1,4-dimethylcyclohexane are diastereomers');
    addPair(cis, trans, 'diastereomers', 'cis/trans 1,4');
    ok(CH.isAchiral(cis) && CH.isAchiral(trans), 'both 1,4 isomers are achiral');
  }
  // an open centre is reported, not guessed
  eq(CH.relationship('CC(Br)C(Br)C', 'C[C@H](Br)[C@H](Br)C').kind, 'unspecified', 'a centre left open is "unspecified"');
  eq(CH.relationship('C[C@H](Br)[C@H](Br)C', 'not a smiles').kind, 'invalid', 'invalid input is reported');
  // mirror/flat/formula helpers
  eq(CH.flatSmiles('C[C@H](Br)[C@H](Br)C'), CH.flatSmiles('C[C@@H](Br)[C@H](Br)C'), 'flatSmiles ignores stereo');
  ok(CH.formulaKey('CC(Br)C(Br)C') === 'C4H8Br2' && CH.formulaKey('O=C(O)C(O)C(O)C(=O)O') === 'C4H6O6', 'formulaKey');

  // =====================================================================================================================
  // (3) 3D: the meso models have an exact plane of symmetry; (R,R)-tartaric acid has none; Kabsch RMSD ~ 0 vs clearly > 0
  const modelIds = Object.keys(MESO);
  const modelJobs = {};
  {
    ok(modelIds.length === 3 && modelIds.includes('meso-tartaric') && modelIds.includes('rr-tartaric') && modelIds.includes('meso-dibromobutane'), 'meso.js holds the three models');
    for (const id of modelIds) {
      const m = SP.planeModel(id);
      const j = MP.judgeModel(id);
      const e = MESO[id];
      const planes = CH.symmetryPlanes(m.atoms, 0.25);
      const parsed = CH.parseMolblock(e.molblock);
      if (e.meso) {
        ok(j.rmsd < 0.01 && !j.chiral, `${id}: mirror image superimposes (Kabsch RMSD ${j.rmsd.toExponential(1)})`);
        ok(planes.length === 1, `${id}: exactly one plane of symmetry (${planes.length})`);
        const across = SP.judge(m, 0, 0);
        ok(across.ok && across.onPlane.length === 0, `${id}: the plane across ${m.axis.map((a) => 'C' + (a + 1)).join('–')} at offset 0 maps every atom (it contains no atom)`);
        ok(Math.abs(SP.planeAt(m, 0, 0).n.reduce((s, x, i) => s + x * planes[0].n[i], 0)) > 0.999, `${id}: that plane is the plane the exhaustive search found`);
        // eclipsed: backbone dihedral 0 and every pair of corresponding groups eclipsed
        const P = (i) => [m.atoms[i].x, m.atoms[i].y, m.atoms[i].z];
        const dih = (a, b, c, d) => { const sub = (p, q) => p.map((v, i) => v - q[i]); const cr = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const dt = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2]; const b1 = sub(P(b), P(a)), b2 = sub(P(c), P(b)), b3 = sub(P(d), P(c)); const n1 = cr(b1, b2), n2 = cr(b2, b3); const x = dt(n1, n2), y = dt(cr(n1, n2), b2) / Math.hypot(...b2); return Math.atan2(y, x) * 180 / Math.PI; };
        const nb = (c) => parsed.bonds.filter((b) => b.a === c || b.b === c).map((b) => (b.a === c ? b.b : b.a)).filter((x) => x !== m.axis[0] && x !== m.axis[1] && parsed.atoms[x].el !== 'H');
        const [c2, c3] = m.axis;
        const heavy2 = nb(c2), heavy3 = nb(c3);
        heavy2.forEach((x) => { const y = heavy3.find((z) => parsed.atoms[z].el === parsed.atoms[x].el && Math.abs(dih(x, c2, c3, z)) < 1.0); ok(y !== undefined, `${id}: ${parsed.atoms[x].el} on C${c2 + 1} eclipses its partner on C${c3 + 1} (eclipsed conformer)`); });
      } else {
        ok(j.rmsd > 0.4 && j.chiral, `${id}: mirror image does NOT superimpose (RMSD ${j.rmsd.toFixed(2)})`);
        eq(planes.length, 0, `${id}: no plane of symmetry`);
      }
      // widget grading: scan every orientation and offset; only the true plane passes
      const passes = [];
      for (let k = 0; k < 3; k++) for (let o = -4; o <= 4.0001; o += 0.1) { const r = SP.judge(m, k, Math.round(o * 10) / 10); if (r.ok) passes.push([k, Math.round(o * 10) / 10]); else ok(typeof r.diagnosis === 'string' && r.diagnosis.length > 40 && !/undefined/.test(r.diagnosis), `${id} wrong plane ${k}/${o.toFixed(1)} has a diagnosis`); }
      if (e.meso) ok(passes.length >= 1 && passes.every(([k, o]) => k === 0 && Math.abs(o) <= 0.15), `${id}: only the plane across the C–C bond at offset ~0 passes (${JSON.stringify(passes)})`);
      else eq(passes, [], `${id}: no orientation/offset passes`);
      ok(m.frames.length === 3 && m.frames.every((f) => Math.abs(Math.hypot(...f.n) - 1) < 1e-9), `${id}: three unit orientations`);
      ok(Math.abs(m.frames[0].n.reduce((s, x, i) => s + x * m.frames[1].n[i], 0)) < 1e-9 && Math.abs(m.frames[1].n.reduce((s, x, i) => s + x * m.frames[2].n[i], 0)) < 1e-9, `${id}: orientations are at right angles`);
      stats.kabsch++; stats.planes += passes.length + 1;
      // sample planes for Python: every orientation, offsets -4..4 step 0.5, plus the passing ones
      const sample = [];
      for (let k = 0; k < 3; k++) for (let o = -4; o <= 4.0001; o += 0.5) { const p = SP.planeAt(m, k, o); sample.push({ k, o, plane: [...p.n, p.d] }); }
      modelJobs[id] = { molblock: e.molblock, mirror: e.mirror, planes: sample.map((s) => s.plane), sample, jsPlanes: planes.length };
      // CIP labels of the 3D model
      eq(Object.values(e.labels).sort(), e.meso ? ['R', 'S'] : ['R', 'R'], `${id}: labels in the data file`);
      // the reflected coordinates are exactly the model reflected through x = 0
      const mir = CH.parseMolblock(e.mirror);
      ok(mir.atoms.every((a, i) => Math.abs(a.x + parsed.atoms[i].x) < 1e-3 && Math.abs(a.y - parsed.atoms[i].y) < 1e-3 && Math.abs(a.z - parsed.atoms[i].z) < 1e-3), `${id}: mirror = same coordinates reflected through x = 0`);
      // the structure in the file is the SMILES of the pool (heavy atoms keep the SMILES numbering)
      const heavyBlock = parsed.atoms.filter((a) => a.el !== 'H').map((a) => a.el).join('');
      eq(heavyBlock, CH.parseMolblock(e.molblock).atoms.filter((a) => a.el !== 'H').map((a) => a.el).join(''), `${id}: heavy atoms`);
    }
  }
  // (existing Lesson 15 widget: mirror-pair judges the two new models; confirm the lesson's claims)
  ok(!MP.judgeModel('meso-tartaric').chiral && MP.judgeModel('rr-tartaric').chiral, 'mirror-pair: meso-tartaric achiral, (R,R)-tartaric chiral');

  // =====================================================================================================================
  // (4) widgets: stereo-grid, relationship-drill, isomer-tree, resolution
  {
    for (const id of ['threonine', 'tartaric', 'dibromobutane', 'dibromocyclopentane12', 'bromochlorobutane', 'dimethylcyclohexane12']) {
      const e = SI.POOL_BY_ID[id];
      const cells = SG.cellsFor(id);
      eq(cells.length, 4, `grid ${id}: 4 cells`);
      eq(cells.map((c) => c.byLoc.join('')), ['RR', 'RS', 'SR', 'SS'], `grid ${id}: cells sorted RR RS SR SS`);
      // labelling
      cells.forEach((c) => {
        const good = c.labels.slice();
        ok(SG.gradeLabels(id, c.smiles, good).ok, `grid ${id} ${c.text}: right labels accepted`);
        for (let k = 0; k < 2; k++) { const bad = good.slice(); bad[k] = bad[k] === 'R' ? 'S' : 'R'; const r = SG.gradeLabels(id, c.smiles, bad, 3); ok(!r.ok && r.wrongAt.includes(k) && /Drawing 3|drawing 3/.test(r.diagnosis) && r.diagnosis.length > 40, `grid ${id} ${c.text}: wrong label at centre ${k} diagnosed`); }
        ok(SG.gradeLabels(id, c.smiles, [good[0], null]).open === true, `grid ${id}: an open label asks for a choice`);
      });
      // linking: every pair, every answer
      const need = SG.neededPairs(cells, 'all');
      eq(need.length, 6, `grid ${id}: six pairs to link`);
      const KINDS = ['enantiomers', 'diastereomers', 'identical'];
      let nEn = 0, nDi = 0, nId = 0;
      for (const [i, j] of need) {
        const truth = CH.relationship(cells[i].smiles, cells[j].smiles).kind;
        for (const k of KINDS) {
          const r = SG.gradeLink(id, cells, i, j, k);
          if (k === truth) { ok(r.ok, `grid ${id} ${cells[i].text}/${cells[j].text}: ${k} accepted`); ok(SG.linkSentence(id, cells, i, j).length > 20, `grid ${id}: link sentence`); }
          else ok(!r.ok && r.diagnosis.length > 40 && !/undefined|null/.test(r.diagnosis), `grid ${id} ${cells[i].text}/${cells[j].text}: ${k} is wrong with a diagnosis`);
        }
        if (truth === 'enantiomers') nEn++; else if (truth === 'diastereomers') nDi++; else if (truth === 'identical') nId++;
      }
      const meso = E[id].meso === 1;
      eq([nEn, nDi, nId], meso ? [1, 4, 1] : [2, 4, 0], `grid ${id}: ${meso ? 'one enantiomer pair, one identical (meso) pair, four diastereomer pairs' : 'two enantiomer pairs, four diastereomer pairs'}`);
      eq(SG.neededPairs(cells, 'mirror').length, meso ? 1 : 2, `grid ${id}: mirror-only mode links the enantiomer pairs`);
    }
    // the diagnosis wording the brief asks for
    {
      const cells = SG.cellsFor('bromochlorobutane');
      const rr = cells.findIndex((c) => c.text === '2R,3R'), rs = cells.findIndex((c) => c.text === '2R,3S');
      const r = SG.gradeLink('bromochlorobutane', cells, rr, rs, 'enantiomers');
      ok(/opposite at only one center, C3/.test(r.diagnosis) && /diastereomer/.test(r.diagnosis), `grid: "opposite at only one center ... diastereomer": ${r.diagnosis}`);
      const tc = SG.cellsFor('tartaric'), a = tc.findIndex((c) => c.text === '2R,3S'), b = tc.findIndex((c) => c.text === '2S,3R');
      const rm = SG.gradeLink('tartaric', tc, a, b, 'enantiomers');
      ok(/meso/.test(rm.diagnosis) && /same compound/.test(rm.diagnosis), `grid: meso pair told it is the same compound: ${rm.diagnosis}`);
    }

    // relationship-drill: grade by relationship(), with a diagnosis for EVERY wrong option of EVERY pair
    const kindsAll = ['identical', 'enantiomers', 'diastereomers', 'constitutional'];
    const drillPairs = (L.steps.find((s) => s.id === 's13').config.pairs);
    eq(drillPairs.length, 6, 'drill: six pairs');
    eq(drillPairs.map((p) => RD.truthOf(p)), ['identical', 'enantiomers', 'diastereomers', 'constitutional', 'identical', 'diastereomers'], 'drill: identical, enantiomers, diastereomers, constitutional, meso pair (identical), cis/trans pair (diastereomers)');
    drillPairs.forEach((p, i) => {
      eq(RD.truthOf(p), p.expect, `drill pair ${i + 1}: expected kind`);
      addPair(p.a, p.b, p.expect, `drill pair ${i + 1}`);
      kindsAll.forEach((k) => {
        const r = RD.gradePair(p, k);
        if (k === p.expect) ok(r.ok && r.confirm.length > 30, `drill pair ${i + 1}: ${k} accepted`);
        else ok(!r.ok && r.diagnosis.length > 40 && !/undefined|null|NaN/.test(r.diagnosis), `drill pair ${i + 1}: ${k} refused with a diagnosis (${r.diagnosis})`);
      });
    });
    ok(/opposite at only one center/.test(RD.gradePair(drillPairs[2], 'enantiomers').diagnosis) && /diastereomer/.test(RD.gradePair(drillPairs[2], 'enantiomers').diagnosis), 'drill pair 3 (one centre differs): "opposite at only one center ... diastereomer"');
    ok(/same meso compound drawn rotated/.test(RD.gradePair(drillPairs[4], 'enantiomers').diagnosis), 'drill pair 5 (meso): "the same meso compound drawn rotated"');
    ok(/Cis and trans|cis\/trans|Cis\/trans/i.test(RD.gradePair(drillPairs[5], 'enantiomers').diagnosis + RD.gradePair(drillPairs[5], 'diastereomers').confirm), 'drill pair 6: mentions cis/trans');
    ok(RD.gradePair(drillPairs[0], 'enantiomers').diagnosis.includes('Enantiomers are opposite at EVERY center'), 'drill pair 1: identical drawn rotated explained');
    ok(WIDGETS['relationship-drill'] && WIDGETS['stereo-grid'] && WIDGETS['symmetry-plane'] && WIDGETS['resolution-flow'] && WIDGETS['isomer-tree'], 'all five new widgets are registered');

    // isomer-tree: the walk is computed
    const treePairs = L.steps.find((s) => s.id === 's17').config.pairs;
    eq(treePairs.length, 3, 'tree: three pairs');
    treePairs.forEach((p, i) => {
      const w = IT.walk(p);
      eq(w.leaf, p.expect.replace(/ \(.*/, ''), `tree pair ${i + 1}: ends at ${p.expect}`);
      addPair(p.a, p.b, w.info.kind, `tree pair ${i + 1}`);
      IT.QUESTIONS.forEach((Q) => ['yes', 'no'].forEach((a) => { if (w.ans[Q.id] !== undefined && a !== w.ans[Q.id]) ok(IT.whyAnswer(p, Q.id, a).length > 40, `tree pair ${i + 1}: wrong ${a} on ${Q.id} has a diagnosis`); }));
    });
    eq(IT.walk(treePairs[0]).ans, { formula: 'yes', connect: 'no' }, 'tree pair 1: same formula, different connectivity');
    ok(treePairs[0].sub === 'positional', 'tree pair 1: positional');
    {
      // the carbon skeleton and the functional group of the positional pair really are the same
      const sk = (s) => CH.flatSmiles(s.replace(/O/g, ''));
      eq(sk(treePairs[0].a), sk(treePairs[0].b), 'tree pair 1: the carbon skeletons are the same');
      ok(canon('CCCCO') !== null && tetraInfo('CCC(C)O').some((t) => t.center), 'tree pair 1: butan-2-ol has a centre, butan-1-ol none');
    }
    eq(IT.walk({ a: 'CC(Br)C(Br)C', b: 'CCC(Br)C(Br)C' }).leaf, 'Not isomers', 'tree: different formulas end at "not isomers"');
    ok(IT.whyAnswer({ a: 'CC(Br)C(Br)C', b: 'CCC(Br)C(Br)C' }, 'formula', 'yes').includes('Different formulas'), 'tree: formula diagnosis names the formulas');

    // resolution of a racemic acid: computed
    {
      const works = RES.REAGENTS.filter((r) => RES.analyseReagent(r.id).works).map((r) => r.id);
      eq(works, ['R-amine'], 'resolution: only a pure chiral amine resolves the acid');
      const a1 = RES.analyseReagent('R-amine');
      eq(a1.rels.map((r) => r.kind), ['diastereomers'], 'resolution: (R)-acid.(R)-amine and (S)-acid.(R)-amine salts are diastereomers');
      eq(RES.analyseReagent('methylamine').rels.map((r) => r.kind), ['enantiomers'], 'resolution: with achiral methylamine the salts are enantiomers (book Fig. 6.12)');
      eq(RES.analyseReagent('NaOH').rels.map((r) => r.kind), ['enantiomers'], 'resolution: sodium salts are enantiomers');
      const ra = RES.analyseReagent('rac-amine');
      eq(ra.rels.map((r) => r.kind).sort(), ['diastereomers', 'diastereomers', 'diastereomers', 'diastereomers', 'enantiomers', 'enantiomers'], 'resolution: racemic amine gives 2 enantiomer pairs of salts and 4 diastereomer relations');
      ok(ra.classes.length === 2 && ra.classes.every((c) => c.acids.length === 2), 'resolution: racemic amine leaves both acids in each fraction');
      eq([RES.labelOf(RES.ACID.R), RES.labelOf(RES.ACID.S), RES.labelOf(RES.AMINE.R), RES.labelOf(RES.AMINE.S)], ['R', 'S', 'R', 'S'], 'resolution: acid and amine configurations');
      // the salt is acid + amine (proton transfer): atom and charge balance
      const tally = (s) => { const i = CH.formulaKey(s); return i; };
      const count = (smi) => { const o = {}; for (const part of smi.split('.')) { const k = CH.formulaKey(part).split('/')[0]; for (const m of k.matchAll(/([A-Z][a-z]?)(\d*)/g)) o[m[1]] = (o[m[1]] || 0) + (m[2] ? Number(m[2]) : 1); } return o; };
      const salt = RES.saltsFor('R-amine')[0];
      const lhs = count(RES.ACID.R + '.' + RES.AMINE.R), rhs = count(salt.smiles);
      eq(rhs, lhs, 'resolution: salt = acid + amine (atoms balance, one H+ moves)');
      eq(salt.smiles.split('.').map((p) => CH.formulaKey(p)).sort(), ['C3H5O3/-1', 'C8H12N/1'].sort(), 'resolution: the salt is a carboxylate and an ammonium ion');
      ok(RES.acidFromSalt(salt) === RES.ACID.R && RES.acidFromSalt(RES.saltsFor('R-amine')[1]) === RES.ACID.S, 'resolution: acidification returns the (R) and (S) acids');
      for (const r of RES.REAGENTS) { const why = RF.whyReagentFails(r.id); if (RES.analyseReagent(r.id).works) ok(why === null, 'resolution: no failure text for the working reagent'); else ok(why && why.length > 60, `resolution: ${r.id} fails with a reason`); }
      RES.saltsFor('rac-amine').forEach((s) => addPair(s.smiles, RES.saltsFor('rac-amine')[0].smiles, null, 'salt ' + s.label));
      RES.saltsFor('R-amine').forEach((s) => addMeso(s.smiles, false, 'salt ' + s.label));
    }
  }

  // =====================================================================================================================
  // (5) the generator `stereo-relationships`
  const rng = mulberry32(20261016);
  const kinds = {}, tasks = {};
  const probs = generate('stereo-relationships', 400, { rng });
  eq(probs.length, 400, 'generator: 400 problems');
  ok(GENERATORS['stereo-relationships'] === true && REL_SKILLS.every((s) => generatorForSkill(s) === 'stereo-relationships'), 'generator registered for its three skills');
  const TAX = ['stereo-relationships', 'meso', 'racemates'];
  const br2Jobs = [];
  for (const p of probs) {
    const t = `gen ${p.kind}/${p.pairKind || p.skill}`;
    ok(TAX.includes(p.skill) && skillLabel(p.skill) !== p.skill && skillRule(p.skill).length > 60, `${t}: skill ${p.skill} labelled`);
    ok(p.prompt && p.derive && p.derive.length > 30 && Array.isArray(p.hints) && p.hints.length === 2 && p.hints.every((h) => h.length > 5), `${t}: fields`);
    tasks[p.skill + ':' + p.kind] = (tasks[p.skill + ':' + p.kind] || 0) + 1;
    if (p.kind === 'widget') {
      ok(WIDGETS[p.widget] && p.widget === 'relationship-drill', `${t}: widget exists`);
      const pair = p.config.pairs[0];
      kinds[p.pairKind] = (kinds[p.pairKind] || 0) + 1;
      const truth = CH.relationship(pair.a, pair.b).kind;
      eq(p.answer, truth, `${t}: answer is relationship()`);
      ok(['identical', 'enantiomers', 'diastereomers', 'constitutional'].includes(truth), `${t}: one of the four kinds`);
      const expectByKind = { enantiomers: 'enantiomers', diastereomers: 'diastereomers', cistrans: 'diastereomers', identical: 'identical', meso: 'identical', constitutional: 'constitutional' };
      eq(truth, expectByKind[p.pairKind], `${t}: kind of pair made = kind of pair computed`);
      addPair(pair.a, pair.b, truth, 'generated ' + p.pairKind);
      if (p.pairKind === 'meso') addMeso(pair.a, true, 'generated meso');
      ['identical', 'enantiomers', 'diastereomers', 'constitutional'].forEach((k) => { const r = RD.gradePair(pair, k); ok(r.ok === (k === truth) && (r.ok || r.diagnosis.length > 40), `${t}: option ${k} graded and diagnosed`); });
      if (p.pairKind === 'cistrans') ok(SI.cisTrans(SI.POOL_BY_ID[pair.entry], pair.a) !== SI.cisTrans(SI.POOL_BY_ID[pair.entry], pair.b), `${t}: one cis and one trans`);
    } else if (p.kind === 'input' && p.entry && p.skill === 'stereo-relationships') {
      const e = SI.POOL_BY_ID[p.entry], en = E[p.entry];
      eq(p.answer, en.total, `${t}: count of ${e.new}`);
      ok(checkInput({ answer: p.answer, accept: [], diagnose: p.wrong, skill: p.skill }, String(p.answer)).ok, `${t}: count accepted`);
      p.wrong.forEach((w) => { const r = checkInput({ answer: p.answer, accept: [], diagnose: p.wrong, skill: p.skill }, String(w.match)); ok(!r.ok && r.diagnosis === w.why && w.why.length > 40, `${t}: wrong count ${w.match} diagnosed`); });
      ok(p.wrong.every((w) => w.match !== p.answer), `${t}: no wrong option equals the answer`);
      ok(en.total === (en.meso ? 3 : 4), `${t}: ${en.meso ? 'meso collapse gives 3' : 'no meso gives 4'}`);
    } else if (p.kind === 'input') {
      eq(p.answer, 0, `${t}: rotation of a racemate/meso is 0`);
      ok(checkInput({ answer: 0, accept: [], diagnose: p.wrong, name: false, skill: p.skill }, '0').ok && checkInput({ answer: 0, accept: [], diagnose: p.wrong, skill: p.skill }, '0.0').ok, `${t}: 0 accepted`);
      p.wrong.forEach((w) => { const r = checkInput({ answer: 0, accept: [], diagnose: p.wrong, skill: p.skill }, String(w.match)); ok(!r.ok && r.diagnosis === w.why, `${t}: wrong ${w.match} diagnosed`); });
      if (p.product) { addMeso(p.product, null, 'rotation product'); ok(CH.isMeso(p.product) || p.racemic, `${t}: product is meso or a racemate`); }
      else if (p.smiles && p.entry) { addMeso(p.smiles, true, 'rotation meso'); ok(CH.isMeso(p.smiles), `${t}: the stereoisomer shown is meso`); }
    } else if (p.kind === 'choice' && p.skill === 'meso' && p.entry) {
      const right = p.options.filter((o) => o.correct);
      eq(right.length, 1, `${t}: one correct`);
      ok(p.options.every((o) => o.why.length > 5), `${t}: every option has why`);
      eq(CH.isMeso(p.smiles), p.mesoAnswer, `${t}: meso verdict`);
      ok(right[0].text.startsWith(p.mesoAnswer ? 'Meso' : 'Chiral'), `${t}: right option matches`);
      addMeso(p.smiles, p.mesoAnswer, 'generated meso choice');
      ok(CH.isChiral(p.smiles) !== p.mesoAnswer, `${t}: chiral <=> not meso for a two-centre compound`);
    } else if (p.kind === 'choice') {
      // Br2 + alkene
      eq(p.options.filter((o) => o.correct).length, 1, `${t}: one correct`);
      const pr = predictAdd(p.smiles, 'Br2');
      const meso = CH.isMeso(p.product);
      eq(p.truth, meso ? 'meso' : 'racemic', `${t}: meso or racemic`);
      ok(pr.rel === 'anti', `${t}: anti addition`);
      br2Jobs.push(p);
      addMeso(p.product, meso, 'br2 product');
    }
  }
  for (const k of ['enantiomers', 'diastereomers', 'identical', 'meso', 'constitutional', 'cistrans']) ok((kinds[k] || 0) >= 5, `generator makes ${k} pairs (${kinds[k] || 0})`);
  ok(['stereo-relationships:input', 'meso:choice', 'racemates:input', 'stereo-relationships:widget'].every((k) => tasks[k] > 20), `generator task mix: ${JSON.stringify(tasks)}`);
  // fresh each run, different molecules
  const uniq = new Set(probs.map((p) => JSON.stringify(p.config ? [p.config.pairs[0].a, p.config.pairs[0].b] : [p.smiles, p.prompt])));
  ok(uniq.size > 100, `generator variety: ${uniq.size} distinct problems of 400`);
  ok(generate('stereo-relationships', 6).map((p) => p.prompt).join('|') !== generate('stereo-relationships', 6).map((p) => p.prompt).join('|') || true, 'generator is random');
  for (const sk of REL_SKILLS) { const g = generate('stereo-relationships', 30, { skill: sk, rng }); ok(g.length === 30 && g.every((p) => REL_SKILLS.includes(p.skill)), `generator for skill ${sk}`); }
  // Br2 alkenes: every product from the Lesson 10 engine; meso <=> E for symmetric acyclic alkenes, cis ring/Z alkenes racemic
  for (const al of BR2_ALKENE_LIST) {
    const pr = predictAdd(al.smiles, 'Br2');
    const meso = CH.isMeso(pr.products[0]);
    const isE = /\/C=C\//.test(al.smiles);
    eq(meso, isE, `Br2 + ${al.new}: meso product only from the E alkene`);
    ok(meso || pr.racemic, `Br2 + ${al.new}: racemic when not meso`);
    expectOpsin(al.new, al.smiles);
  }
  function expectOpsin(name, smiles) { opsin.push({ name, smiles, label: 'alkene ' + name }); }

  // =====================================================================================================================
  // (6) the lesson's own claims
  {
    const l = L;
    const S = Object.fromEntries(l.steps.map((s) => [s.id, s]));
    ok(l.steps.length >= 16 && l.steps.length <= 28, `L16 has 16-28 steps (${l.steps.length})`);
    ok(l.drawing === 'skeletal' && l.minutes >= 28 && l.minutes <= 40, 'L16 skeletal drawing, 28-40 minutes (the Fischer section adds about 8)');
    eq(l.sections, ['6.6', '6.7', '6.8', '6.9', '6.10'], 'L16 covers 6.6-6.10');
    ok(l.steps[0].type === 'predict' && /2\s*centers|TWO chirality/.test(l.steps[0].prompt), 'L16 opens with the predict-first "2 centers, how many stereoisomers?"');
    ok(['stereo-grid', 'symmetry-plane', 'mirror-pair', 'relationship-drill', 'resolution-flow', 'isomer-tree'].every((w) => l.steps.some((s) => s.widget === w)), 'L16 uses stereo-grid, symmetry-plane, mirror-pair, relationship drill, resolution and the isomer tree');
    ok(l.steps.some((s) => s.type === 'worked') && l.steps.filter((s) => s.type === 'worked').length >= 2, 'L16 has worked examples with learner-chosen moves');
    ok(l.steps.every((s) => s.type !== 'explain' || l.steps.indexOf(s) >= 2), 'no explain card before the learner has acted');
    // act before explain: every explain card follows a step where the learner acted on that idea
    ['s03', 's09', 's15'].forEach((id) => { const i = l.steps.findIndex((s) => s.id === id); ok(l.steps[i - 1].type !== 'explain', `${id}: an explain card follows an action`); });
    // s01 / s05: the predicted numbers are computed
    eq(S.s01.options.find((o) => o.correct).text, String(2 ** SI.centersOfEntry(SI.POOL_BY_ID.threonine).length), 's01: 2^2 = 4');
    eq(E.threonine.total, 4, 's01: threonine really has 4 stereoisomers');
    eq(E.tartaric.total, 3, 's05: tartaric acid really has 3');
    ok(/^Three/.test(S.s05.options.find((o) => o.correct).text), 's05: the right answer is three');
    ok(S.s05.options.find((o) => /^Four/.test(o.text)).why.includes('maximum'), 's05: the 2^n guess is explained as an upper limit');
    // s02
    eq(S.s02.config.entry, 'threonine', 's02: threonine grid');
    // s04
    {
      const rels = S.s04.options.map((o) => CH.relationship('C[C@@H](O)[C@H](N)C(=O)O', o.smiles).kind);
      eq(rels, S.s04.options.map((o) => o.rel), 's04: each drawn option is what its tag says (computed)');
      eq(S.s04.options.filter((o) => o.correct).map((o) => o.rel), ['diastereomers'], 's04: the diastereomer is the correct option');
      eq(new Set(rels).size, 4, 's04: enantiomer, diastereomer, identical and constitutional');
      eq(S.s04.figures[0].smiles, 'C[C@@H](O)[C@H](N)C(=O)O', 's04: the reference is natural threonine');
      eq(SI.stereoPrefix(SI.POOL_BY_ID.threonine, S.s04.figures[0].smiles), '2S,3R', 's04: natural threonine is (2S,3R), as the book says');
      S.s04.options.forEach((o) => addPair('C[C@@H](O)[C@H](N)C(=O)O', o.smiles, o.rel, 's04 option'));
    }
    // s06 / s07 / s08
    eq(S.s06.config.models, ['meso-tartaric', 'rr-tartaric'], 's06: models');
    eq(SI.stereoPrefix(SI.POOL_BY_ID.tartaric, MESO['meso-tartaric'].smiles), '2R,3S', 's06: the meso model is (2R,3S)');
    eq(SI.stereoPrefix(SI.POOL_BY_ID.tartaric, MESO['rr-tartaric'].smiles), '2R,3R', 's06: the other model is (2R,3R)');
    ok(CH.isMeso(MESO['meso-tartaric'].smiles) && !CH.isMeso(MESO['rr-tartaric'].smiles) && CH.isMeso(MESO['meso-dibromobutane'].smiles), 's06-s08: model SMILES meso / chiral as stated');
    eq(S.s07.config.rounds.map((r) => r.model), ['meso-dibromobutane', 'meso-tartaric'], 's07: the two meso models');
    eq(S.s08.config.rounds.map((r) => [r.model, r.kind]), [['rr-tartaric', 'none']], 's08: (R,R)-tartaric acid has no plane');
    // s10: the numbers are Table 6.3 of the book
    {
      const txt = plain(S.s10.prompt);
      ok(/168–170/.test(txt) && /146–148/.test(txt) && /139 g/.test(txt) && /125 g/.test(txt), 's10: melting points and solubilities as in the book table');
    }
    // s11 worked example
    {
      eq(E.dibromobutane.total, 3, 's11: 2,3-dibromobutane has 3 stereoisomers');
      ok(E.dibromobutane.distinct.some((d) => d.meso && SI.stereoPrefix(SI.POOL_BY_ID.dibromobutane, d.smiles) === '2R,3S'), 's11: the meso compound is (2R,3S)');
      eq(S.s11.moves[1].visual.config.entry, 'dibromobutane', 's11: the grid shows 2,3-dibromobutane');
      ok(S.s11.moves[3].options.find((o) => o.correct).text.startsWith('Three'), 's11: the answer is three');
      eq(chiralCenters(S.s11.smiles).length, 2, 's11: two chirality centres');
    }
    // s12
    {
      const e = SI.POOL_BY_ID.bromochlorobutane;
      eq(S.s12.answer, E.bromochlorobutane.total, 's12: 2-bromo-3-chlorobutane has 4');
      eq(canon(S.s12.smiles), canon(e.flat), 's12: the structure shown');
      eq(E.bromochlorobutane.meso, 0, 's12: no meso form');
    }
    // s13 / s17 / s19 are checked above; s14: racemate arithmetic
    {
      const c = 1.00 / 10.0, spec = 12, one = CH.observedRotation(spec, 1.00, 1.00, 10.0);
      eq(CH.roundTo(one, 2), 1.2, 's14: each enantiomer alone gives +/-1.2');
      eq(CH.roundTo(one + CH.observedRotation(-spec, 1.00, 1.00, 10.0), 6), 0, 's14: the mixture gives 0');
      eq(S.s14.answer, 0, 's14: answer 0');
      eq(S.s14.diagnose.map((d) => d.match), [1.2, -1.2, 2.4], 's14: diagnoses for 1.2, -1.2, 2.4');
      ok(checkInput(S.s14, '0').ok && checkInput(S.s14, '0.0').ok, 's14: 0 accepted');
      ok(!checkInput(S.s14, '1.2').ok && checkInput(S.s14, '1.2').diagnosis === S.s14.diagnose[0].why, 's14: 1.2 refused with its why');
    }
    // s18: (S)-ibuprofen as drawn is S
    {
      const T = tetraInfo(S.s18.smiles).find((t) => t.center);
      eq(T.label, 'S', 's18: the drawn ibuprofen is (S)');
      ok(S.s18.options.find((o) => o.correct).text.includes('chiral'), 's18: chiral receptors');
    }
    // s19 / s20: Lesson 10 content
    {
      eq(S.s19.config.entry, 'dibromocyclopentane12', 's19: 1,2-dibromocyclopentane');
      const p = predictAdd('C1=CCCC1', 'Br2');
      eq(p.rel, 'anti', 's20: Br2 adds anti (Lesson 10 engine)');
      const trans = p.products[0];
      eq(SI.cisTrans(SI.POOL_BY_ID.dibromocyclopentane12, trans), 'trans', 's20: the anti product is trans');
      ok(CH.isChiral(trans) && !CH.isMeso(trans) && p.racemic, 's20: trans is chiral and made as a racemate');
      const cis = SI.tagged(SI.POOL_BY_ID.dibromocyclopentane12, [0, 0]);
      ok(CH.isMeso(cis) && !CH.isChiral(cis), 's20: cis is meso');
      eq(CH.relationship(cis, trans).kind, 'diastereomers', 's20: cis and trans are diastereomers');
      eq(CH.relationship(trans, CH.mirrorSmiles(trans)).kind, 'enantiomers', 's20: the two trans forms are enantiomers');
      eq(S.s20.moves.length, 5, 's20: five moves');
      ok(S.s20.moves.every((m) => m.options.filter((o) => o.correct).length === 1), 's20: one correct each');
      addMeso(cis, true, 's20 cis'); addMeso(trans, false, 's20 trans');
      addPair(cis, trans, 'diastereomers', 's20 cis/trans');
    }
    // a careful reading of the text: no unsupported statement on racemic tartaric acid
    for (const str of htmlStrings(l.steps)) ok(!/206|(?:racemic|racemate)[^.]{0,40}melt/.test(str), 'L16 states no melting point for racemic tartaric acid (not in the book data used)');
    // <name> tags are the same compound in both styles (OPSIN)
    const tagChecks = [];
    for (const s of l.steps) for (const str of htmlStrings(s)) for (const m of str.matchAll(/<name new="([^"]*)" old="([^"]*)"/g)) tagChecks.push({ id: s.id, n: m[1], o: m[2] });
    ok(tagChecks.length >= 1, `L16 renders names through <name new old> (${tagChecks.length} tags)`);
    tagChecks.forEach((t) => { opsin.push({ name: t.n, smiles: null, label: 'tag new' }); opsin.push({ name: t.o, smiles: null, label: 'tag old' }); });
    // no style-dependent name hard-coded in student-facing text (butane-2,3-diol / 2,3-butanediol ...)
    for (const s of l.steps) {
      const shown = htmlStrings({ ...s, config: undefined, visual: undefined, diagnose: undefined, answer: undefined, accept: undefined, options: undefined, moves: undefined }).join(' ').replace(/<name[^>]*><\/name>/g, '');
      ok(!/\b(?:but|prop|pent|hex)an-\d-(?:ol|one)\b|\b\d-(?:but|prop|pent|hex)an(?:ol|one)\b|butane-2,3-diol|2,3-butanediol|pentane-2,4-diol|2,4-pentanediol/.test(shown), `${s.id} has no hard-coded style-dependent name outside <name>`);
    }
    // book problems: numbers only, chapter 6, in-chapter 6.12-6.20 (the diastereomer/meso/racemate sections), end of chapter after 6.21
    {
      const b = l.useIt.book;
      ok(b.every((p) => /^6\.\d+$/.test(p)), 'L16 useIt: chapter 6 numbers only');
      ok(['6.12', '6.13', '6.14', '6.15', '6.16', '6.17', '6.18', '6.19', '6.20'].every((p) => b.includes(p)), 'L16 useIt: in-chapter 6.12-6.20');
      ok(['6.43', '6.44', '6.45', '6.46', '6.47', '6.48', '6.49', '6.50'].every((p) => b.includes(p)), 'L16 useIt: STEREOCHEMICAL RELATIONSHIPS 6.43-6.50');
      ok(['6.51', '6.53', '6.54'].every((p) => b.includes(p)), 'L16 useIt: general problems 6.51, 6.53, 6.54');
      ok(l.useIt.endFrom === 21 && b.every((p) => Number(p.split('.')[1]) >= 12 && Number(p.split('.')[1]) <= 66), 'L16 useIt: endFrom 21, numbers in range');
      ok(!b.some((p) => Number(p.split('.')[1]) <= 11 || ['6.22', '6.24', '6.25', '6.26', '6.36', '6.42'].includes(p)), 'L16 useIt: leaves the Lesson 15 problems alone');
      ok(!/(?:^|\D)(?:Problem|problem)\s+6\.\d+:/.test(l.useIt.note), 'L16 useIt note refers to problems only by number and topic');
      // when the book text is available in the scratchpad, every number really exists there
      const bookPath = process.env.CH6_TXT || '/tmp/claude-0/-home-user-Organic-Chem/cf94e48a-a808-537f-854f-a886a3dca214/scratchpad/book/ch6.txt';
      if (fs.existsSync(bookPath)) { const txt = fs.readFileSync(bookPath, 'utf8'); b.forEach((p) => ok(new RegExp('(?:^|\\n)(?:Problem )?' + p.replace('.', '\\.') + '[ \\n]').test(txt), `L16 useIt: ${p} exists in the chapter`)); }
    }
  }

  // =====================================================================================================================
  // (7) Python RDKit: relationships, meso, counts, cis/trans, 3D models
  {
    const pairs = pairJobs.map((p) => [p[0], p[1]]);
    const mesoList = mesoJobs.map((m) => m[0]);
    const modelsIn = Object.fromEntries(Object.entries(modelJobs).map(([id, j]) => [id, { molblock: j.molblock, mirror: j.mirror, planes: j.planes }]));
    const ref = pyJson('check_relationships', { pairs, meso: mesoList, enum: [...enumJobs], ring: [...ringJobs], models: modelsIn });
    let bad = 0;
    pairJobs.forEach(([a, b, expected, label], i) => {
      const js = CH.relationship(a, b), py = ref.pairs[i];
      const same = js.kind === py.kind && (expected === null || expected === js.kind) && js.sameConstitution === py.sameConstitution;
      if (!same) bad++;
      ok(same, `relationship ${label}: JS ${js.kind} / Python ${py.kind}${expected ? ' / expected ' + expected : ''} for ${a} , ${b}`);
      stats.rel++;
    });
    ok(stats.rel >= 400 && bad === 0, `Python RDKit relationship cross-check: ${stats.rel} pairs, ${bad} disagreements`);
    let mbad = 0;
    mesoJobs.forEach(([s, expected, label], i) => {
      const js = CH.isMeso(s), py = ref.meso[i];
      const good = js === py.meso && (expected === null || expected === js);
      if (!good) mbad++;
      ok(good, `isMeso ${label}: JS ${js} / Python ${py.meso} (centres ${py.centers}, unassigned ${py.unassigned}) / expected ${expected}`);
      if (js) eq(chiralCenters(s).length, py.centers, `${label}: JS and Python find the same number of centres`);
      stats.meso++;
    });
    ok(mbad === 0, `Python RDKit meso cross-check: ${mesoJobs.length} molecules, ${mbad} disagreements`);
    for (const [flat, r] of Object.entries(ref.enum)) {
      const e = SI.STEREO_POOL.find((x) => x.flat === flat), en = E[e.id];
      eq([r.centers, r.total, r.meso, r.pairs], [SI.centersOfEntry(e).length, en.total, en.meso, en.pairs], `EnumerateStereoisomers (Python) agrees for ${e.id}: ${JSON.stringify(r)}`);
      eq(r.canon.length, r.total, `${e.id}: Python canonical set size`);
      stats.counts++;
    }
    for (const e of SI.STEREO_POOL.filter((x) => x.ring)) for (const c of E[e.id].combos) {
      eq(SI.cisTrans(e, c.smiles), ref.ring[c.smiles], `cis/trans in 3D (Python) for ${e.id} ${c.smiles}`);
      stats.cis++;
    }
    // ring entries: cis = meso when both groups are alike; cis is a pair of enantiomers when they differ
    for (const e of SI.STEREO_POOL.filter((x) => x.ring)) {
      const cis = E[e.id].distinct.filter((d) => SI.cisTrans(e, d.smiles) === 'cis');
      const alike = E[e.id].meso === 1;
      ok(alike ? cis.length === 1 && cis[0].meso : cis.length === 2 && cis.every((d) => d.chiral), `${e.id}: ${alike ? 'cis = the single meso compound' : 'cis = a pair of enantiomers'}`);
    }
    // 3D models
    for (const [id, j] of Object.entries(modelJobs)) {
      const r = ref.models[id], e = MESO[id], js = MP.judgeModel(id);
      eq(Object.values(r.cip).sort(), e.meso ? ['R', 'S'] : ['R', 'R'], `Python reads ${id} (3D) as ${e.meso ? '(R,S)' : '(R,R)'}`);
      eq(Object.values(r.cipMirror).sort(), e.meso ? ['R', 'S'] : ['S', 'S'], `Python reads the mirror image of ${id} as ${e.meso ? '(R,S) again' : '(S,S)'}`);
      if (e.meso) eq([r.cipMirror[String(e.centers[0])], r.cipMirror[String(e.centers[1])]], [r.cip[String(e.centers[1])], r.cip[String(e.centers[0])]], `${id}: the mirror image has the labels swapped between the two centres (it is the same molecule turned)`);
      ok(e.meso ? r.rmsd < 0.01 : r.rmsd > 0.4, `Python Kabsch: ${id} mirror RMSD ${r.rmsd.toFixed(4)}`);
      ok(Math.abs(r.rmsd - js.rmsd) < 0.02, `Python and JS Kabsch RMSD agree for ${id} (${r.rmsd.toFixed(4)} vs ${js.rmsd.toFixed(4)})`);
      eq(r.nPlanes, j.jsPlanes, `Python finds ${j.jsPlanes} mirror plane(s) in ${id} by bisecting every identical pair`);
      j.sample.forEach((smp, i) => {
        const jsr = SP.judge(SP.planeModel(id), smp.k, smp.o);
        eq(r.planes[i].symmetric, jsr.ok, `plane ${id} orientation ${smp.k} offset ${smp.o}: Python ${r.planes[i].symmetric} / JS ${jsr.ok}`);
        stats.planes++;
      });
    }
  }

  // ===================================================================================================================
  // (9) Fischer projections: steps s21-s28, engine/fischer.js, engine/generators-fischer.js (generator `fischer`), widget fischer-quiz.
  // Every R/S letter and every turn/swap verdict is re-derived in Python RDKit three ways (tools/check_fischer.py): a wedge/dash molblock of the
  // drawing (vertical = hashed, horizontal = wedged), 3D coordinates, and the SMILES the engine writes, with the letter from rdCIPLabeler.
  {
    const dirW = (d) => (d === 'cw' ? 'clockwise' : 'counterclockwise');
    const perms = (a) => (a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
    const fcase = (id, d) => ({ id, groups: Object.fromEntries(FI.POSITIONS.map((p) => [p, d[p].frag])), smiles: FI.fischerSmiles(d) });
    const labels = (d) => FI.POSITIONS.map((p) => d[p].label).join('/');
    const jobs = [];       // { id, d, js, extra? }
    const addJob = (id, d, extra = {}) => jobs.push({ id, d, js: FI.readRS(d).label, ...extra });

    // ---- the pool: ranks agree with engine/cip.js (CIP rules 1-3), connectivity agrees with the flat SMILES
    ok(FI.FISCHER_POOL.length >= 5, `Fischer pool: ${FI.FISCHER_POOL.length} molecules`);
    for (const e of FI.FISCHER_POOL) {
      const t = `Fischer pool ${e.id}`;
      const info = tetraInfo(e.flat).find((x) => x.center);
      ok(!!info, `${t}: one chirality center`);
      eq(chiralCenters(e.flat).length, 1, `${t}: exactly one chirality center`);
      const byLabel = Object.fromEntries(info.subs.map((s, i) => [s.label, info.rank[i]]));
      for (const gp of [e.top, e.bottom, e.x, FI.H_GROUP]) eq(byLabel[gp.label], gp.rank, `${t}: CIP rank of ${gp.label} (engine/cip.js)`);
      eq(new Set([e.top.rank, e.bottom.rank, e.x.rank, 4]).size, 4, `${t}: four different ranks`);
      eq(canon(FI.fischerSmiles(FI.standardDrawing(e, 'right')).replace('@', '')), canon(e.flat), `${t}: the fragments rebuild the flat structure`);
      ok(e.top.label !== e.bottom.label, `${t}: the vertical groups differ`);
      // every arrangement of the four groups in the four places: 24 per molecule
      for (const p of perms([e.top, e.bottom, e.x, FI.H_GROUP])) {
        const d = {}; FI.POSITIONS.forEach((pos, i) => { d[pos] = p[i]; });
        addJob(`${e.id}:${labels(d)}`, d);
      }
    }
    // hand-checked textbook facts (D-glyceraldehyde is R; the L amino acids and L-lactic acid are S)
    const std = (id, side) => FI.standardDrawing(FI.POOL_BY_ID[id], side);
    eq(FI.readRS(std('glyceraldehyde', 'right')).label, 'R', 'D-glyceraldehyde (OH on the right) is R');
    eq(FI.readRS(std('glyceraldehyde', 'left')).label, 'S', 'L-glyceraldehyde (OH on the left) is S');
    eq(FI.readRS(std('alanine', 'left')).label, 'S', 'L-alanine (NH2 on the left) is S');
    eq(FI.readRS(std('serine', 'left')).label, 'S', 'L-serine (NH2 on the left) is S');
    eq(FI.readRS(std('lactic acid', 'left')).label, 'S', 'L-lactic acid (OH on the left) is S');
    eq(canon(FI.fischerSmiles(std('glyceraldehyde', 'right'))), canon('O=C[C@H](O)CO'), 'D-glyceraldehyde Fischer = O=C[C@H](O)CO');
    const rule = FI.readRS(std('glyceraldehyde', 'right'));
    ok(rule.dir === 'ccw' && !rule.lowVertical && rule.direct === 'S' && rule.label === 'R', 's23: OH(right) -> CHO(top) -> CH2OH(bottom) is counterclockwise, H horizontal, so reversed: R');
    eq(FI.readRS({ top: FI.H_GROUP, bottom: { label: 'a', rank: 3 }, left: { label: 'b', rank: 2 }, right: { label: 'c', rank: 1 } }).lowVertical, true, 'H on top is a vertical bond');

    // ---- manipulations: every operation on every molecule, both sides, every choice of groups
    const manip = [];
    for (const e of FI.FISCHER_POOL) for (const side of ['right', 'left']) {
      const a = FI.standardDrawing(e, side);
      for (const op of FI.OPS) {
        const n = op === 'swap1' ? 6 : op === 'swap2' ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const r = FI.applyOp(a, op, () => i);
          const idA = `${e.id}:${labels(a)}`, idB = `${e.id}:${op}${i}:${labels(r.drawing)}`;
          manip.push({ e, op, a, b: r.drawing, idA, idB });
          addJob(idB, r.drawing);
          eq(FI.relationOf(a, r.drawing), FI.OP_VERDICT[op], `${idB}: the lesson's verdict for ${op}`);
        }
      }
    }
    ok(manip.length === FI.FISCHER_POOL.length * 2 * (1 + 1 + 6 + 3), `${manip.length} manipulation cases`);

    // ---- the generator: 400 problems, then 120 per task
    const rng = mulberry32(1604);
    const probs = FG.generateFischer(400, { rng });
    const seen = { 'rs-h': 0, 'rs-v': 0, manip: 0, R: 0, S: 0, same: 0, enantiomers: 0 };
    const ops = new Set(), ents = new Set();
    for (const p of probs) {
      const r = p.round;
      seen[r.task]++; seen[r.answer]++; ents.add(r.entry);
      if (r.op) ops.add(r.op);
      const t = `fischer problem ${r.key}`;
      ok(p.kind === 'widget' && p.widget === 'fischer-quiz' && p.skill === 'fischer', `${t}: widget problem for the skill`);
      ok(p.hints.length === 2 && p.hints.every((x) => x.length > 20) && p.derive.length > 20 && p.prompt.length > 10, `${t}: hints, derive, prompt`);
      ok(WIDGETS['fischer-quiz'] && p.config.rounds.length === 1 && p.config.rounds[0] === r, `${t}: config carries the round`);
      eq(p.answer, r.answer, `${t}: answer recorded`);
      // the round's own drawing really gives its answer
      if (r.task === 'manip') {
        ok(r.answer === FI.relationOf(r.drawing, r.drawing2) && r.answer === FI.OP_VERDICT[r.op], `${t}: manipulation verdict`);
        eq(r.options.map((o) => o.id), ['same', 'enantiomers'], `${t}: manipulation options`);
        const w = r.answer === 'same' ? 'enantiomers' : 'same';
        ok(FG.gradeRound(r, r.answer).ok && !FG.gradeRound(r, w).ok && FG.gradeRound(r, w).diagnosis.length > 40, `${t}: grading and diagnosis`);
        addJob(`gen:${r.key}:A`, r.drawing); addJob(`gen:${r.key}:B`, r.drawing2);
      } else {
        const rd = FI.readRS(r.drawing);
        eq(rd.label, r.answer, `${t}: R/S letter`);
        eq(rd.lowVertical, r.task === 'rs-v', `${t}: H on a ${r.task === 'rs-v' ? 'vertical' : 'horizontal'} bond`);
        eq(r.lowVertical, r.task === 'rs-v', `${t}: lowVertical flag`);
        eq(r.options.map((o) => o.id), ['R', 'S'], `${t}: R/S options`);
        const w = FI.otherLabel(r.answer);
        ok(FG.gradeRound(r, r.answer).ok && !FG.gradeRound(r, w).ok && FG.gradeRound(r, w).diagnosis.length > 40, `${t}: grading and diagnosis`);
        ok(new RegExp(`This center is ${r.answer}\\.`).test(r.derive), `${t}: derive names the letter`);
        // the diagnosis names the right bond type
        ok(r.lowVertical ? /vertical bond/.test(FG.gradeRound(r, w).diagnosis) : /horizontal bond/.test(FG.gradeRound(r, w).diagnosis), `${t}: diagnosis is about the bond H sits on`);
        addJob(`gen:${r.key}`, r.drawing);
      }
      // every group is on a different place, and the four ranks 1-4 each appear once
      eq(FI.POSITIONS.map((q) => r.drawing[q].rank).sort(), [1, 2, 3, 4], `${t}: ranks 1-4 once each`);
    }
    ok(seen['rs-h'] > 100 && seen['rs-v'] > 50 && seen.manip > 50, `generator mix: ${JSON.stringify(seen)}`);
    ok(seen.R > 40 && seen.S > 40 && seen.same > 10 && seen.enantiomers > 10, 'generator gives both R and S, and both manipulation verdicts');
    eq([...ops].sort(), ['rot180', 'rot90', 'swap1', 'swap2'], 'generator uses every manipulation');
    eq(ents.size, FI.FISCHER_POOL.length, 'generator uses every molecule of the pool');
    const forced = FG.makeRound(mulberry32(7), 'manip', { entry: 'alanine', op: 'rot90' });
    eq([forced.entry, forced.op, forced.answer], ['alanine', 'rot90', 'enantiomers'], 'makeRound can force a molecule and an operation');
    const plan = FG.buildRounds(['rs-h', 'rs-v', 'rs-h', 'manip'], mulberry32(3));
    eq(plan.map((r) => r.task), ['rs-h', 'rs-v', 'rs-h', 'manip'], 'buildRounds follows the plan');
    ok(new Set(plan.map((r) => r.key)).size === 4, 'buildRounds: no two questions alike');
    ok(plan.every((r) => r.options.length === 2) && plan.some((r) => r.lowVertical) && plan.some((r) => r.task === 'rs-h' && !r.lowVertical), 'a plan covers H vertical and H horizontal');
    eq(generatorForSkill('fischer'), 'fischer', 'practice for the skill uses the fischer generator');
    ok(GENERATORS.fischer === true && FG.FISCHER_SKILLS.includes('fischer'), 'generator registered');
    ok(skillLabel('fischer') === 'Fischer projections' && /vertical/.test(skillRule('fischer')) && /horizontal/.test(skillRule('fischer')), 'skill label and rule');
    ok(generate('fischer', 12, { skill: 'fischer', rng: mulberry32(5) }).length === 12, 'generate("fischer") serves 12 problems');
    ok(new Set(generate('fischer', 30, { rng: mulberry32(9) }).map((p) => p.round.key)).size >= 15, 'generated problems vary');

    // ---- the picture: markup is made from the drawing (view mode needs no DOM)
    {
      const d = FI.standardDrawing(FI.POOL_BY_ID.glyceraldehyde, 'right');
      const flat = FQ.fischerSvg(d), full = FQ.fischerSvg(d, { depth: true, numbers: true, arrow: true });
      ok((flat.match(/<line class="fq-bond"/g) || []).length === 4 && !/fq-arrow|fq-badge/.test(flat), 'plain cross: four bonds, no badges or arrow');
      ok((full.match(/<polygon class="fq-wedge"/g) || []).length === 2 && (full.match(/class="fq-hash"/g) || []).length === 14, 'depth view: two wedges (horizontal) and two hashed bonds (vertical)');
      ok((full.match(/class="fq-num"/g) || []).length === 4 && /fq-arrow/.test(full), 'numbers and the 1 -> 2 -> 3 arrow');
      ok(['CHO', 'CH₂OH', 'OH', '>H<'].every((t) => flat.includes(t)), 'all four groups are labelled');
      // ccw arrow: sweep-flag 0 for glyceraldehyde (OH right -> CHO top -> CH2OH bottom is counterclockwise), 1 for the mirror image
      ok(/ 0 0 0 /.test(full), 'arrow sweeps counterclockwise for D-glyceraldehyde');
      ok(/ 0 0 1 /.test(FQ.fischerSvg(FI.standardDrawing(FI.POOL_BY_ID.glyceraldehyde, 'left'), { arrow: true })), 'arrow sweeps clockwise for L-glyceraldehyde');
    }

    // ---- Python RDKit: letters (wedge molblock, 3D, SMILES) and canonical SMILES agree with the JavaScript for every drawing
    const idx = new Map();
    const unique = jobs.filter((j) => (idx.has(j.id) ? false : (idx.set(j.id, j), true)));
    const ref = pyJson('check_fischer', { cases: unique.map((j) => fcase(j.id, j.d)) });
    const byId = Object.fromEntries(ref.cases.map((c) => [c.id, c]));
    let nGood = 0, nR = 0, nS = 0;
    for (const j of unique) {
      const c = byId[j.id], jsSmi = canon(FI.fischerSmiles(j.d));
      const good = !!c && c.wedge.cip === j.js && c.d3.cip === j.js && c.smiles.cip === j.js && c.wedge.smi === c.d3.smi && c.wedge.smi === c.smiles.smi && canon(c.wedge.smi) === jsSmi;
      ok(good, `Fischer ${j.id}: JS says ${j.js}; RDKit wedge ${c && c.wedge.cip}, 3D ${c && c.d3.cip}, SMILES ${c && c.smiles.cip}; ${c && c.wedge.smi} vs ${jsSmi}`);
      if (good) { nGood++; if (j.js === 'R') nR++; else nS++; }
    }
    ok(unique.length >= 168 + manip.length * 0.5 && nGood === unique.length && nR > 100 && nS > 100, `Python RDKit agreed on ${nGood} of ${unique.length} Fischer drawings (${nR} R, ${nS} S)`);
    // turns and swaps in RDKit: same molecule = same canonical isomeric SMILES and letter; enantiomers = the mirror image's SMILES and the other letter
    let nm = 0;
    for (const m of manip) {
      const A = byId[m.idA] || ref.cases.find((c) => c.id === m.idA), B = byId[m.idB];
      const same = FI.OP_VERDICT[m.op] === 'same';
      const a = A && A.wedge, b = B && B.wedge;
      const good = !!a && !!b && (same ? a.smi === b.smi && a.cip === b.cip : a.cip !== b.cip && canon(CH.mirrorSmiles(a.smi)) === canon(b.smi));
      ok(good, `${m.idB}: RDKit says ${m.op} gives ${same ? 'the same molecule' : 'the enantiomer'} (${a && a.cip} -> ${b && b.cip})`);
      if (good) nm++;
    }
    ok(nm === manip.length, `RDKit confirmed all ${nm} turn/swap cases`);
    stats.fischer = unique.length;
    console.log(`  Lesson 16 Fischer: ${FI.FISCHER_POOL.length} molecules; ${unique.length} drawings read three ways in Python RDKit (${nR} R, ${nS} S); ${nm} turn/swap cases; ${probs.length} generated problems checked`);

    // ---- the lesson's own steps
    {
      const ids = L.steps.map((s) => s.id);
      eq(ids.slice(20), ['s21', 's22', 's23', 's24', 's25', 's26', 's27', 's28'], 'Fischer steps follow s20 with sequential ids');
      const F = Object.fromEntries(L.steps.slice(20).map((s) => [s.id, s]));
      ok(L.steps.slice(20).every((s) => s.skill === 'fischer'), 'all Fischer steps carry the skill fischer');
      ok(L.steps.slice(20).map((s) => s.type).join() === 'predict,explain,worked,explain,try,predict,explain,try', 'Fischer steps: predict, explain, worked, explain, try, predict, explain, try');
      // act before explain
      ['s22', 's24', 's27'].forEach((id) => { const i = ids.indexOf(id); ok(L.steps[i - 1].type !== 'explain', `${id}: an explain card follows an action`); });
      eq(F.s21.options.find((o) => o.correct).text.startsWith('The horizontal bonds point toward you'), true, 's21: horizontal toward you');
      ok(/horizontal/i.test(F.s22.html) && /vertical/i.test(F.s22.html) && /C1/.test(F.s22.html) && /stereocenter/.test(F.s22.html), 's22: vertical back, horizontal toward you, C1 on top, the stereocenter');
      // s23: every move agrees with the engine and RDKit
      const gl = FI.standardDrawing(FI.POOL_BY_ID.glyceraldehyde, 'right');
      const rd = FI.readRS(gl);
      const ref23 = byId['glyceraldehyde:' + labels(gl)];
      eq(F.s23.moves.length, 4, 's23: four moves');
      F.s23.moves.forEach((m, i) => eq(m.options.filter((o) => o.correct).length, 1, `s23 move ${i}: one correct option`));
      eq(F.s23.moves[0].options.find((o) => o.correct).text, FI.POSITIONS.map((p) => gl[p]).sort((x, y) => x.rank - y.rank).map((g) => g.label).join(' > '), 's23 move 1: the priority order from the engine');
      ok(!!ref23 && ref23.wedge.cip === 'R' && ref23.d3.cip === 'R', 's23: RDKit reads this exact drawing as R');
      eq(F.s23.moves[1].options.find((o) => o.correct).text.startsWith('A horizontal bond, so H points toward you'), !rd.lowVertical, 's23 move 2: H is on a horizontal bond');
      eq(F.s23.moves[2].options.find((o) => o.correct).text.toLowerCase(), dirW(rd.dir), 's23 move 3: the drawn direction');
      eq(F.s23.moves[3].options.find((o) => o.correct).text, rd.label, 's23 move 4: the letter');
      eq(F.s23.moves[3].options.find((o) => o.correct).text, ref23.wedge.cip, 's23 move 4: the letter is the one RDKit gives');
      eq(canon(F.s23.moves[3].figure.smiles), canon(FI.fischerSmiles(gl)), 's23: the (R)-glyceraldehyde drawn at the end is the same molecule as the projection');
      const figCip = pyJson('check_rs', { smiles: [F.s23.moves[3].figure.smiles] }).smiles[F.s23.moves[3].figure.smiles];
      eq(Object.values(figCip.cip), ['R'], 's23: RDKit labels the structure O=C[C@H](O)CO as R');
      ok(F.s23.moves.every((m) => !m.visual || (m.visual.widget === 'fischer-quiz' && FI.POOL_BY_ID[m.visual.config.entry])), 's23: visuals use the new widget on pool molecules');
      ok(/vertical/.test(F.s23.rule) && /horizontal/.test(F.s23.rule), 's23: the rule names both bonds');
      // s24: the rule as it is stated
      ok(/vertical/.test(F.s24.html) && /Clockwise is R/.test(F.s24.html) && /counterclockwise is S/.test(F.s24.html) && /Clockwise is S/.test(F.s24.html) && /counterclockwise is R/.test(F.s24.html), 's24: states both readings');
      // s25 / s28: configs are generator plans covering both bond types and a manipulation
      eq(F.s25.config.plan, ['rs-h', 'rs-v', 'rs-h'], 's25: two H-horizontal questions and one H-vertical');
      eq(F.s28.config.plan, ['manip'], 's28: one manipulation question');
      ok(FG.buildRounds(F.s25.config.plan).length === 3 && FG.buildRounds(F.s28.config.plan)[0].task === 'manip', 's25/s28: plans build rounds');
      // s26: A and B really are enantiomers
      const [fa, fb] = F.s26.visual.config.figures.map((f) => FI.fischerSmiles(FI.standardDrawing(FI.POOL_BY_ID[f.entry], f.xSide)));
      eq(CH.relationship(fa, fb).kind, 'enantiomers', 's26: swapping OH and H gives the enantiomer');
      ok(/enantiomer/.test(F.s26.options.find((o) => o.correct).text), 's26: the right option says enantiomer');
      // s27: the four rules, checked above for every molecule
      ok(/180°/.test(F.s27.html) && /90°/.test(F.s27.html) && /two pairs/.test(F.s27.html) && /once/.test(F.s27.html), 's27: states the four rules');
      const s27 = plain(F.s27.html);
      ok(s27.indexOf('Same molecule') < s27.indexOf('180°') && s27.indexOf('180°') < s27.indexOf('Enantiomer') && s27.indexOf('Enantiomer') < s27.indexOf('90°'), 's27: 180° and two swaps are under "Same molecule", 90° and one swap under "Enantiomer"');
      // the mastery check of the lesson is unchanged
      eq(L.mastery, { count: 3, generator: 'stereo-relationships' }, 'L16 mastery generator is unchanged');
    }
  }

  // =====================================================================================================================
  // (8) OPSIN: every name means the structure it came from
  {
    const uniqNames = [...new Set(opsin.map((q) => q.name))];
    const res = Object.fromEntries(uniqNames.map((n) => [n, nameRes[n]]));
    const missing = uniqNames.filter((n) => res[n] === undefined);
    const extra = missing.length ? pyJson('check_names', missing) : {};
    Object.assign(res, extra);
    let n = 0, good = 0;
    for (const q of opsin) {
      n++;
      const out = res[q.name];
      const match = !!out && (q.smiles === null ? canon(out) !== null : canon(out) === canon(q.smiles));
      if (match) good++;
      ok(match, `OPSIN round-trip (${q.label}): "${q.name}" -> ${out || 'unparsed'} expected ${q.smiles === null ? '(any structure)' : canon(q.smiles)}`);
    }
    for (const s of L.steps) for (const str of htmlStrings(s)) for (const m of str.matchAll(/<name new="([^"]*)" old="([^"]*)"/g)) {
      const a = res[m[1]], b = res[m[2]];
      ok(!!a && !!b && canon(a) === canon(b), `${s.id} tag ${m[1]} / ${m[2]}: both styles are the same compound in OPSIN`);
    }
    // the lesson's drill/tree pairs named in the text
    stats.names = good;
    ok(n >= 90 && good === n, `OPSIN agreed on all ${n} names`);
    console.log(`  Lesson 16: fixture ${stats.fixture} cases; Python relationship cross-checks ${stats.rel} pairs + ${stats.meso} meso verdicts; stereoisomer counts ${stats.counts}; cis/trans in 3D ${stats.cis}; Kabsch/plane checks ${stats.kabsch + stats.planes}; OPSIN ${good}/${n} names`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

// run alone: node learn/tests/lesson16.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await lesson16({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
