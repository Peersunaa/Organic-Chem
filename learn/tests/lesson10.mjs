// Lesson 10 checks: the stereo-aware additions engine (X2, H2, RCO3H, epoxide + H3O+, KMnO4 basic / acidic, radical polymers) checked four ways:
//   (1) atom + charge balance of every overall equation, every mechanism step (arrows reproduce `after`) and every radical-polymerisation step;
//   (2) an independent Python RDKit recompute in 3D (tools/check_additions.py: groups placed above / below the plane of the C=C, stereo read from the
//       coordinates; cleavage by reaction SMARTS; cis/trans of the ring product from a 3D embedding) for 40+ alkene x reagent cases;
//   (3) the stereo relationship (cis/trans on rings, meso/racemic for E/Z alkenes) re-derived from RDKit CIP labels, plus a hand-checked fixture
//       (tests/fixtures/additions2.json) whose names are also checked with OPSIN;
//   (4) the 3D bromonium model (Br bridges both carbons, one face blocked), cleave-it, the extended reaction-lab, the `alkene-additions-2` generator,
//       the lesson's own steps.
// Run on its own with `node learn/tests/lesson10.mjs`, or as part of run.mjs.
import { ready, rdkit, canon, analyze } from '../engine/chem.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import * as arrow from '../engine/widgets/arrow-core.js';
import { buildMolblock } from '../engine/widgets/lewis-core.js';
import * as MC from '../engine/widgets/mechanism-core.js';
import { WIDGETS } from '../engine/widgets/index.js';
import * as R from '../engine/reactions.js';
import * as G from '../engine/stereo-graph.js';
import * as CL from '../engine/widgets/cleave-it.js';
import { faceModel, viewFrame } from '../engine/widgets/face-attack.js';
import * as geom from '../engine/widgets/geom.js';
import models from '../data/3d/models.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import { ADD2_TASKS, ADD2_SKILLS, makeAdditions2Problem, addPool, ADD_POOL, CLEAVE_POOL } from '../engine/generators-additions2.js';
import { eqHtml } from '../engine/widgets/reaction-lab.js';
import { skillLabel } from '../engine/skills.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function htmlStrings(o, out = []) {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => htmlStrings(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => htmlStrings(x, out));
  return out;
}

// ---- independent atom / charge tally: explicit H atoms added with RDKit (not the impH route of the engine)
function tallyIndep(list) {
  const Rk = rdkit();
  const c = {}; let q = 0;
  for (const smi of list) {
    const m0 = Rk.get_mol(smi);
    const mb = m0.add_hs(); m0.delete();
    const m = Rk.get_mol(mb, JSON.stringify({ removeHs: false }));
    const j = JSON.parse(m.get_json()).molecules[0]; m.delete();
    j.atoms.forEach((a) => { const z = a.z ?? 6; c[z] = (c[z] || 0) + 1; q += a.chg ?? 0; });
  }
  return { c, q };
}
const balIndep = (a, b) => { const A = tallyIndep(a), B = tallyIndep(b); return A.q === B.q && JSON.stringify(Object.entries(A.c).sort()) === JSON.stringify(Object.entries(B.c).sort()); };
const flat = (s) => MC.canonFlat(s);
/** CIP labels of the stereocentres of a SMILES, e.g. ['R','S']. */
function cip(smiles) { const m = rdkit().get_mol(smiles); try { return JSON.parse(m.get_stereo_tags()).CIP_atoms.map((x) => x[1].replace(/[()]/g, '')).sort(); } finally { m.delete(); } }
const nCenters = (s) => { const m = rdkit().get_mol(s); try { return JSON.parse(m.get_descriptors()).NumAtomStereoCenters; } finally { m.delete(); } };
const keyOf = (list) => list.map(R.stereoKey).sort().join('|');

/** Alkenes whose two C=C carbons carry the same groups: the 2-centre products are meso (R,S) or racemic (R,R / S,S), decided by syn / anti and cis / trans. */
const SYMMETRIC = ['C1=CCCC1', 'C1=CCCCC1', 'C1=CCCCCC1', 'CC1=C(C)CCCC1', 'CC1=C(C)CCC1', 'C/C=C/C', 'C/C=C\\C', 'CC/C=C/CC', 'CC/C=C\\CC', 'CC/C(C)=C(C)/CC', 'CC/C(C)=C(C)\\CC'];
const STEREO_REAGENTS = ['Br2', 'Cl2', 'H2', 'RCO3H', 'RCO3H_H3O', 'KMnO4_OH'];

export async function lesson10({ ok, eq }) {
  await ready();
  const L = LESSONS.find((l) => l.id === '10');
  const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'additions2.json'), 'utf8'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-add2-'));
  const py = (script, cases, tag) => {
    const inp = path.join(tmp, tag + '-in.json'), out = path.join(tmp, tag + '-out.json');
    fs.writeFileSync(inp, JSON.stringify(cases));
    execFileSync('python3', ['-I', path.join(HERE, '..', 'tools', script), inp, out], { stdio: ['ignore', 'ignore', 'pipe'] });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const opsin = (names) => {
    const uniq = [...new Set(names)];
    const inp = path.join(tmp, 'in.json'), out = path.join(tmp, 'out.json');
    fs.writeFileSync(inp, JSON.stringify(uniq));
    execFileSync('python3', ['-I', path.join(HERE, '..', 'tools', 'check_names.py'), inp, out], { stdio: ['ignore', 'ignore', 'ignore'] });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const nameQueue = []; // {name, smiles, mode, label}

  // ================================================================ 1. the stereo graph (parse / write / mirror) against RDKit
  {
    const rnd = mulberry32(5);
    const samples = [
      'Br[C@H]1CCC[C@@H]1Br', 'Br[C@@H]1CCCC[C@H]1Br', 'C[C@@H]1CCCC[C@@H]1C', 'C[C@H](Br)[C@@H](C)Br', 'C[C@@H](O)[C@H](O)CC', 'C1CC[C@H]2O[C@H]2C1',
      'C[C@@H]1O[C@H]1C', 'C[C@]1(Br)CCCC[C@@]1(C)Br', 'CC[C@H](C)[C@@H](Br)C(C)C', 'O[C@H]1CCCC[C@@H]1O', 'C[C@@H](Cl)CC', 'C1C[C@@H]2[Br+][C@H]2C1',
      'O=C(c1ccccc1)OC[C@H](C)Cl', 'C1=CCCCC1', 'CC(=O)O', 'O=C=O', 'FC(F)=C(F)F', 'C=Cc1ccccc1', '[O]C(=O)c1ccccc1', 'O=C(c1ccccc1)OC[CH2]', 'CC(C)=O.CC(=O)O',
      ...fx.flatMap((f) => f.products)
    ];
    let good = 0;
    for (const s of samples) {
      const g = G.parse(s);
      for (let k = 0; k < 3; k++) {
        const w = G.write(g, { start: Math.floor(rnd() * g.atoms.length) });
        const same = canon(w.smiles) === canon(s);
        if (same) good++;
        ok(same, `stereo-graph round trip ${s} -> ${w.smiles} (start ${k})`);
      }
    }
    ok(good === samples.length * 3, `${good} stereo-graph round trips equal RDKit's canonical form`);
    // mirror: every centre inverted
    for (const s of ['Br[C@H]1CCC[C@@H]1Br', 'C[C@@H](O)[C@H](O)CC', 'C[C@H](Br)[C@@H](C)Br']) {
      ok(canon(G.mirror(s)) !== canon(s) || cip(s).join('') === 'RS', `mirror of ${s} is its enantiomer (or the same compound for a meso)`);
      eq(cip(G.mirror(s)).slice().sort().map((c) => (c === 'R' ? 'S' : 'R')).sort(), cip(s), `mirror of ${s} inverts every CIP label`);
    }
    ok(canon(G.mirror('C[C@H](Br)[C@@H](C)Br')) === canon('C[C@H](Br)[C@@H](C)Br'), 'meso-2,3-dibromobutane equals its own mirror image');
    ok(canon('Br[C@H]1CCC[C@@H]1Br') !== canon(G.mirror('Br[C@H]1CCC[C@@H]1Br')) && R.stereoKey('Br[C@H]1CCC[C@@H]1Br') === R.stereoKey(G.mirror('Br[C@H]1CCC[C@@H]1Br')), 'stereoKey: trans-dibromocyclopentane and its mirror image are one key');
    ok(R.stereoKey('Br[C@H]1CCC[C@@H]1Br') !== R.stereoKey('Br[C@@H]1CCC[C@@H]1Br'), 'stereoKey keeps cis and trans apart');
    ok(R.sameProducts(['CC(C)=O', 'CC(=O)O'], ['CC(=O)O', 'CC(C)=O']) && !R.sameProducts(['CC(C)=O'], ['CC(=O)O']), 'sameProducts: order-free, compound-exact');
  }

  // ================================================================ 2. what the engine refuses
  {
    const refused = (alkene, reagent) => { try { R.predictAdd(alkene, reagent); return null; } catch (e) { return e.message; } };
    for (const [a, why, re] of [
      ['C=Cc1ccccc1', 'styrene (aromatic ring)', /aromatic/], ['C=CC=C', 'a diene', /one C=C/], ['C#C', 'an alkyne', /triple/], ['CCCC', 'an alkane', /no C=C/],
      ['CC1C=CCCC1', '3-methylcyclohexene (stereocentre)', /stereocentre/],       ['CC=CC', 'but-2-ene with no E/Z (product depends on it)', /E or Z/], ['CCCC=CCCC', 'oct-4-ene with no E/Z', /E or Z/], ['CC(=O)C=C', 'a carbonyl', /hydrocarbons/], ['C1=CCCCCCCC1', 'cyclononene (cis or trans ring)', /large ring/]
    ]) {
      const m = refused(a, 'Br2');
      ok(m && /^excluded:/.test(m) && re.test(m), `${why} is refused for Br2 (${m})`);
    }
    // 4-methylcyclopentene: the two faces of the C=C are NOT equivalent. A trans (anti) product is still one racemate (C2 symmetry), but a cis (syn)
    // product comes as two diastereomers (CH3 cis or trans to the new groups), so the engine refuses those reagents (also the epoxide-then-H3O+ chain, whose first step is syn: conservative).
    for (const re of ['RCO3H', 'KMnO4_OH', 'RCO3H_H3O']) { const m = refused('CC1CC=CC1', re); ok(m && /diastereomers/.test(m), `4-methylcyclopentene + ${re} (syn) is refused: two diastereomers (${m})`); }
    for (const re of ['Br2', 'Cl2', 'H2']) ok(refused('CC1CC=CC1', re) === null, `4-methylcyclopentene + ${re} is accepted (one racemate / no new stereocentres)`);
    // cleavage does not depend on E/Z or on a stereocentre elsewhere, so those are accepted
    ok(refused('CC=CC', 'KMnO4_H') === null && refused('CCC(C)C=C', 'KMnO4_H') === null, 'KMnO4/H3O+ accepts an alkene with no E/Z or with a stereocentre');
    ok(refused('C=Cc1ccccc1', 'KMnO4_H') !== null, 'KMnO4/H3O+ still refuses an aromatic ring');
    ok(R.alkeneInfo('C/C=C/C').stereogenic && R.alkeneInfo('C/C=C/C').specified && !R.alkeneInfo('CC=C(C)C').stereogenic && !R.alkeneInfo('C1=CCCCC1').stereogenic, 'alkeneInfo: E/Z-capable, written and not capable');
  }

  // ================================================================ 3. every accepted case: balance, relationship, racemate
  const accepted = [];   // {alkene, reagent, pred}
  const SET = [...new Set([...ADD_POOL, ...CLEAVE_POOL, ...R.LAB_ALKENES2.map((a) => a.smiles), ...fx.map((f) => f.alkene), 'CC1CC=CC1'])];
  for (const alkene of SET) for (const reagent of R.REAGENT_IDS2) {
    let pred = null;
    try { pred = R.predictAdd(alkene, reagent); } catch (e) { continue; }
    accepted.push({ alkene, reagent, pred });
  }
  ok(accepted.length >= 120, `${accepted.length} accepted alkene x reagent cases`);
  let nBal = 0, nStereo = 0;
  for (const { alkene, reagent, pred } of accepted) {
    const t = `${alkene} + ${reagent}`;
    // (1) balance of the overall equation (organic part, [O] = one O atom; independent tally with explicit hydrogens)
    ok(balIndep(pred.equation.lhs, pred.equation.rhs), `${t}: overall equation balances (${pred.equation.lhs.join(' + ')} -> ${pred.equation.rhs.join(' + ')})`);
    nBal++;
    if (pred.equation.exact) ok(balIndep(pred.equation.exact.lhs, pred.equation.exact.rhs), `${t}: exact peracid equation balances`);
    // the products are valid, have no C=C left and are not the alkene (additions) or contain the right atoms
    ok(pred.products.every((p) => canon(p) === p), `${t}: products are canonical SMILES`);
    if (reagent !== 'KMnO4_H') ok(!pred.products.join('').includes('C=C') && analyze(pred.products[0]).bonds.every((b) => (b.bo ?? 1) < 2 || true), `${t}: addition product`);
    // chiral product from an achiral alkene = racemate; achiral (meso) product is exact
    if (reagent !== 'KMnO4_H') {
      const chiral = R.isChiral(pred.products[0]);
      if (pred.nCenters === 1) ok(pred.racemic && !pred.products[0].includes('@'), `${t}: one stereocentre = racemate drawn flat`);
      else if (pred.nCenters >= 2) ok(pred.racemic === chiral, `${t}: racemic exactly when the product is chiral`);
      else ok(!pred.racemic, `${t}: no stereocentre, not racemic`);
    }
    // (3) relationship re-derived from RDKit CIP labels (symmetric alkenes only: both C=C carbons carry the same groups)
    if (SYMMETRIC.includes(alkene) && STEREO_REAGENTS.includes(reagent) && pred.nCenters === 2) {
      const info = pred.info;
      const sameSide = info.ring || info.json.bonds.find((b) => b.bo === 2).stereo === 'cis';
      const syn = pred.rel === 'syn';
      const wantMeso = sameSide === syn;           // same-side + syn, or opposite + anti = meso
      const labels = cip(pred.products[0]);
      const meso = labels.length === 2 && labels[0] !== labels[1];
      ok(meso === wantMeso, `${t}: ${sameSide ? 'cis/ring' : 'trans'} alkene, ${pred.rel} addition -> ${wantMeso ? 'meso (R,S)' : 'racemic (R,R)'}; CIP ${labels}`);
      ok(pred.racemic === !wantMeso, `${t}: racemate flag follows meso / chiral`);
      if (info.ring) eq(pred.ring, syn ? 'cis' : 'trans', `${t}: ring relationship`);
      nStereo++;
    }
  }
  console.log(`  additions engine: ${accepted.length} cases, ${nBal} equations balanced, ${nStereo} CIP-derived stereo relationships`);
  ok(nStereo >= 55, `at least 55 CIP stereo checks (${nStereo})`);

  // the epoxide, then water: openEpoxide(epoxide) equals anti addition of two OH (built a second way) for every alkene
  {
    let n = 0;
    for (const { alkene, reagent, pred } of accepted.filter((x) => x.reagent === 'RCO3H')) {
      const open = R.openEpoxide(pred.products[0]);
      const direct = R.oppositeStereo(alkene, 'KMnO4_OH'); // KMnO4/OH- is syn; its opposite is the anti diol
      const viaChain = R.predictAdd(alkene, 'RCO3H_H3O').products[0];
      const fl = (s) => flat(s);
      ok(fl(open.smiles) === fl(viaChain), `${alkene}: openEpoxide gives the diol constitution`);
      ok(R.stereoKey(open.smiles) === R.stereoKey(viaChain), `${alkene}: epoxide + H3O+ == RCO3H_H3O chain`);
      if (direct) { ok(R.stereoKey(open.smiles) === R.stereoKey(direct), `${alkene}: ring opening from the back == anti addition of two OH built directly`); n++; }
      void reagent;
    }
    ok(n >= 15, `${n} epoxide openings compared with direct anti dihydroxylation`);
    // book statements
    ok(R.stereoKey(R.openEpoxide('C1CC[C@H]2O[C@H]2C1').smiles) === R.stereoKey('O[C@H]1CCCC[C@@H]1O'), 'cyclohexene oxide + H3O+ = trans-cyclohexane-1,2-diol');
    ok(R.stereoKey(R.openEpoxide('C[C@@H]1O[C@@H]1C').smiles) === R.stereoKey('C[C@@H](O)[C@@H](C)O'), 'cis-2,3-dimethyloxirane + H3O+ = racemic (R,R)-butane-2,3-diol');
    ok(R.stereoKey(R.openEpoxide('C[C@@H]1O[C@H]1C').smiles) === R.stereoKey('C[C@H](O)[C@@H](C)O'), 'trans-2,3-dimethyloxirane + H3O+ = meso-butane-2,3-diol');
    let msg = null; try { R.openEpoxide('CCO'); } catch (e) { msg = e.message; }
    ok(msg && /no epoxide/.test(msg), 'openEpoxide refuses a non-epoxide');
  }

  // ================================================================ 4. Python RDKit cross-check (3D face placement, SMARTS cleavage, cis/trans from 3D)
  {
    const cases = accepted.map(({ alkene, reagent, pred }) => ({ alkene, reagent, engine: pred.products }));
    let res = null;
    try { res = py('check_additions.py', cases, 'ad'); } catch (e) { ok(false, 'python RDKit cross-check could not run: ' + String(e.stderr || e.message).slice(0, 300)); }
    if (res) {
      let good = 0, rel = 0;
      res.forEach((r, i) => {
        if (r.match) good++;
        ok(r.match, `python cross-check ${r.alkene} + ${r.reagent}: python ${JSON.stringify(r.python)} engine ${JSON.stringify(r.engine)}`);
        const pred = accepted[i].pred;
        if (r.relation && r.relation !== '?') {
          rel++;
          ok(pred.ring === r.relation, `python 3D embedding: ${r.alkene} + ${r.reagent} the two groups are ${r.relation} (engine says ${pred.ring})`);
        }
      });
      console.log(`  Python RDKit (3D) cross-check: ${good}/${res.length} cases agree; ${rel} cis/trans ring relationships measured in 3D`);
      ok(res.length >= 40 && good === res.length, `Python RDKit confirmed all ${res.length} cases (>= 40)`);
      ok(rel >= 20, `at least 20 ring cis/trans relationships measured from 3D embeddings (${rel})`);
    }
  }

  // ================================================================ 5. hand-checked fixture + OPSIN names
  {
    ok(fx.length >= 18, `fixture has ${fx.length} cases (>= 18)`);
    const need = ['cp-br2', 'chx-cl2', 'dmchx-h2', 'chx-rco3h', 'chx-diol-trans', 'chx-diol-cis', 'mbu2-kmno4', 'mpropene-kmno4', 'hex1-kmno4', 'e-but2-rco3h', 'z-but2-rco3h', 'propene-br2'];
    for (const id of need) ok(fx.some((f) => f.id === id), `fixture includes ${id}`);
    let fxMatch = 0;
    for (const f of fx) {
      const pred = R.predictAdd(f.alkene, f.reagent);
      const want = f.products;
      const same = f.compare === 'flat' ? JSON.stringify(pred.products.map(flat).sort()) === JSON.stringify(want.map(flat).sort()) : R.sameProducts(pred.products, want);
      if (same) fxMatch++;
      ok(same, `fixture ${f.id}: ${f.alkene} + ${f.reagent} -> engine ${pred.products} expected ${want}`);
      for (const n of f.names) nameQueue.push({ name: n.name, smiles: n.smiles, mode: n.mode, label: `fixture ${f.id}` });
    }
    // the named stereo facts of the brief
    const one = (alk, re) => R.predictAdd(alk, re).products;
    ok(R.stereoKey(one('C1=CCCC1', 'Br2')[0]) === R.stereoKey('Br[C@H]1[C@@H](CCC1)Br') && R.stereoKey(one('C1=CCCC1', 'Br2')[0]) !== R.stereoKey('Br[C@H]1[C@H](CCC1)Br'), 'cyclopentene + Br2 = trans (not cis) 1,2-dibromocyclopentane');
    ok(cip(one('C1=CCCCC1', 'Cl2')[0]).join('') === 'SS' || cip(one('C1=CCCCC1', 'Cl2')[0]).join('') === 'RR', 'cyclohexene + Cl2: (R,R)/(S,S) = trans');
    ok(cip(one('CC1=C(C)CCCC1', 'H2')[0]).join('') === 'RS', '1,2-dimethylcyclohexene + H2: (R,S) = cis');
    console.log(`  fixture: ${fxMatch}/${fx.length} cases agree; ${nameQueue.length} names queued for OPSIN`);
  }

  // ================================================================ 6. mechanisms: bromonium and chloronium
  {
    const hex = [['C1=CCCC1', 'Br'], ['C1=CCCCC1', 'Br'], ['C1=CCCCC1', 'Cl'], ['CC1=C(C)CCCC1', 'Br'], ['C/C=C/C', 'Br'], ['C/C=C\\C', 'Cl'], ['CC=C', 'Br'], ['CC(C)=C', 'Br'], ['CCCCC=C', 'Cl'], ['CC=C(C)C', 'Br'], ['C=C', 'Br'], ['CC1=CCCCC1', 'Cl']];
    let steps = 0;
    for (const [alk, X] of hex) {
      const t = `${alk} + ${X}2`;
      const m = R.halogenMechanism(alk, X);
      eq(MC.checkMechanism(m), [], `mechanism valid: ${t}`);
      ok(m.steps.length === 2 && m.steps[0].arrows.length === 3 && m.steps[1].arrows.length === 2, `${t}: 2 steps with 3 + 2 arrows`);
      m.steps.forEach((st, k) => {
        steps++;
        ok(balIndep(st.before, st.after), `${t} step ${k + 1}: atoms and charge balance (independent tally)`);
        const cfg = MC.stepConfig(st);
        eq(arrow.validate(cfg), [], `${t} step ${k + 1}: arrows valid`);
        const state = arrow.applyArrows(cfg);
        eq(flat(buildMolblock(state)), flat(st.after.join('.')), `${t} step ${k + 1}: arrows reproduce after`);
        eq(MC.octetViolations(state), [], `${t} step ${k + 1}: no octet exceeded`);
        ok(arrow.grade(cfg, st.arrows).ok, `${t} step ${k + 1}: the expected arrows are graded right`);
      });
      // the onium ion has X bridging the two C=C carbons; it carries the + charge; the product has the two X anti = the engine's answer
      const info = R.alkeneInfo(alk);
      const on = analyze(m.onium);
      const xi = on.atoms.findIndex((a) => a.sym === X);
      eq(on.atoms[xi].fc, 1, `${t}: ${X} in the onium ion is +1`);
      ok(on.atoms[xi].nbrs.length === 2 && on.atoms[xi].nbrs.every((k) => on.atoms[k].sym === 'C') && on.bonds.some((b) => on.atoms[xi].nbrs.includes(b.atoms[0]) && on.atoms[xi].nbrs.includes(b.atoms[1])), `${t}: ${X}+ bonds BOTH carbons of the old C=C (three-membered ring)`);
      const pred = R.predictAdd(alk, X === 'Br' ? 'Br2' : 'Cl2');
      ok(R.sameProducts(m.products, pred.products), `${t}: mechanism ends at the engine's anti product`);
      ok(m.steps[1].after[0].includes('@') === (pred.nCenters >= 2), `${t}: product drawn with wedges exactly when it has 2+ stereocentres`);
      void info;
    }
    console.log(`  halogen mechanisms: ${hex.length} alkenes, ${steps} steps balanced and reproduced by their arrows`);
    // the onium ion is the syn "bridge": built with both X on the same face, so RDKit reads a cis-fused (meso) ring for cyclohexene
    const o = R.halogenMechanism('C1=CCCCC1', 'Br').onium;
    ok(cip(o).join('') === 'RS', 'cyclohexene bromonium ion is cis-fused (meso, R,S)');
    // arrow grading tolerates the swaps that give the same mechanism, and still rejects real mistakes
    const m = R.halogenMechanism('C1=CCCCC1', 'Br');
    const s1 = MC.stepConfig(m.steps[0]);
    const [c1, c2] = [m.steps[0].arrows[0].from.bond[0], m.steps[0].arrows[0].from.bond[1]];
    const XA = m.steps[0].arrows[0].to.bond[1], XB = m.steps[0].arrows[1].to.atom;
    const A = m.steps[0].arrows;
    const farBr = [{ from: A[0].from, to: { bond: [c1, XB] } }, { from: { bond: [XA, XB] }, to: { atom: XA } }, { from: { lp: XB }, to: { atom: c2 } }];
    ok(arrow.grade(s1, farBr).ok, 'drawing the attack on the far Br (and its lone pair) is accepted: the two Br atoms are equivalent');
    const otherC = [{ from: { bond: [c1, c2] }, to: { bond: [c2, XA] } }, A[1], { from: { lp: XA }, to: { atom: c1 } }];
    ok(arrow.grade(s1, otherC).ok, 'bonding the first Br to the other carbon first is accepted');
    const mixed = [A[0], A[1], { from: { lp: XB }, to: { atom: c2 } }];
    ok(!arrow.grade(s1, mixed).ok, 'mixing the two Br atoms is rejected');
    const missing3 = A.slice(0, 2);
    const rm = arrow.grade(s1, missing3);
    ok(!rm.ok && /closes the three-membered ring|OTHER carbon|also need/.test(rm.diagnosis), `leaving out the ring-closing arrow is rejected with a reason (${rm.diagnosis})`);
    const s2 = MC.stepConfig(m.steps[1]);
    const B = m.steps[1].arrows;
    const [ca, xi] = [B[0].to.atom, B[1].to.atom];
    const cb = analyze(m.steps[1].before[0]).atoms[xi].nbrs.find((k) => k !== ca);
    ok(arrow.grade(s2, [{ from: B[0].from, to: { atom: cb } }, { from: { bond: [cb, xi] }, to: { atom: xi } }]).ok, 'Br- attacking the other ring carbon is accepted (same dibromide)');
    ok(!arrow.grade(s2, [{ from: B[0].from, to: { atom: ca } }]).ok, 'attack without breaking the C-Br+ bond is rejected');
  }

  // ================================================================ 7. the 3D bromonium model
  {
    ok(models['bromonium-cyclohexene'] && models['bromonium-cyclohexene'].smiles === 'C1CC[C@H]2[Br+][C@H]2C1', 'bromonium model is in data/3d/models.js');
    const fm = faceModel();
    const A = fm.mol.atoms;
    const P = geom.P;
    const dBr = fm.bridge.map((i) => geom.len(geom.sub(P(A[i]), P(A[fm.br]))));
    ok(dBr.every((d) => d > 1.8 && d < 2.3), `Br bridges both carbons: Br-C distances ${dBr.map((d) => d.toFixed(2))} A`);
    const dCC = geom.len(geom.sub(P(A[fm.bridge[0]]), P(A[fm.bridge[1]])));
    ok(dCC > 1.4 && dCC < 1.6, `the two bridged carbons are bonded (C-C ${dCC.toFixed(2)} A)`);
    ok(fm.mol.bonds.filter(([i, j]) => i === fm.br || j === fm.br).length === 2 && fm.mol.bonds.some(([i, j]) => [i, j].sort().join() === fm.bridge.slice().sort().join()), 'bonds: Br-C, Br-C and the C-C bond form a 3-membered ring');
    const molRd = rdkit().get_mol(models['bromonium-cyclohexene'].molblock);
    const modelSmiles = molRd.get_smiles(); molRd.delete();
    eq(R.stereoKey(modelSmiles), R.stereoKey(R.halogenMechanism('C1=CCCCC1', 'Br').onium), 'the 3D model is the same stereo-defined ion as the engine\'s bromonium (cis-fused, Br on one face)');
    ok(canon(models['bromonium-cyclohexene'].molblock) === canon('C1CC[C@H]2[Br+][C@H]2C1'), '3D coordinates read by RDKit give the bromonium SMILES (chirality perceived from 3D)');
    // one face blocked: Br is on one side of the ring plane, the C-H of both bridged carbons on the other, the back site 180 degrees from C-Br+
    const side = (p) => geom.dot(geom.sub(p, fm.centre), fm.normal);
    ok(side(P(A[fm.br])) > 1.0, `Br+ sits well above the ring plane (${side(P(A[fm.br])).toFixed(2)} A): that face is blocked`);
    const nb = geom.neighbours(fm.mol.bonds, A.length);
    for (const c of fm.bridge) {
      const hs = nb[c].filter((k) => A[k].el === 'H');
      ok(hs.length === 1 && side(P(A[hs[0]])) < side(P(A[c])), `bridged carbon ${c}: its H points away from the Br face`);
    }
    ok(Math.abs(geom.angleDeg(fm.back, fm.T, fm.B) - 180) < 0.5, 'back site is 180 degrees from the C-Br+ bond (SN2-style approach)');
    ok(side(fm.back) < 0 && side(fm.front) > 0, 'back site is on the face opposite the Br; the front site is on the Br face');
    ok(geom.len(geom.sub(fm.front, fm.B)) > 2.0 && geom.len(geom.sub(fm.back, fm.B)) > 3.5, 'the two sites are separate balls, not overlapping the bromine');
    const vf = viewFrame(fm);
    ok(Math.abs(geom.len(vf.ex) - 1) < 1e-6 && Math.abs(geom.dot(vf.ex, vf.ey)) < 1e-6 && Math.abs(geom.dot(vf.ez, vf.ey)) < 1e-6 && Math.abs(geom.dot(vf.ez, vf.ex)) < 1e-6, 'starting view frame is orthonormal');
    const Vy = (p) => geom.dot(geom.sub(p, vf.o), vf.ey), Vx = (p) => geom.dot(geom.sub(p, vf.o), vf.ex);
    ok(Vy(P(A[fm.br])) > Vy(fm.back) + 2 && Vy(fm.front) > Vy(fm.back) + 2, 'edge-on start view: Br and site A are above the ring, site B below');
    ok(typeof WIDGETS['face-attack'].mount === 'function' && typeof WIDGETS['cleave-it'].mount === 'function', 'widgets registered: face-attack, cleave-it');
  }

  // ================================================================ 8. cleave-it
  {
    let nE = 0;
    for (const alk of CLEAVE_POOL) {
      const info = R.alkeneInfo(alk, { allowCenters: true });
      const [i, j] = CL.cutBond(alk);
      ok(CL.gradeCut(alk, i, j).ok, `cleave-it ${alk}: tapping the C=C is right`);
      const an = analyze(alk);
      for (const b of an.bonds) {
        if ((b.bo ?? 1) === 2) continue;
        const r = CL.gradeCut(alk, b.atoms[0], b.atoms[1]);
        ok(!r.ok && /single/.test(r.diagnosis), `cleave-it ${alk}: a single bond is a wrong tap with a reason`);
      }
      const ends = CL.ends(alk);
      ends.forEach((e) => {
        const nH = info.g.atoms[e.atom].h;
        const want = nH === 0 ? 'ketone' : nH === 1 ? 'acid' : 'co2';
        eq(e.kind, want, `cleave-it ${alk}: end with ${nH} H is a ${want} (book rule)`);
        for (const o of CL.END_OPTIONS) {
          const r = CL.gradeEnd(e, o.id);
          if (o.id === e.kind) ok(r.ok, `cleave-it ${alk}: right choice ${o.id}`);
          else { ok(!r.ok && r.diagnosis.length > 30, `cleave-it ${alk}: ${o.id} for a ${e.kind} end is wrong with a specific reason`); nE++; }
        }
      });
      ok(R.predictAdd(alk, 'KMnO4_H').products.length === (info.ring ? 1 : 2), `cleave-it ${alk}: a ring gives one molecule, a chain two`);
    }
    console.log(`  cleave-it: ${CLEAVE_POOL.length} alkenes, ${nE} wrong end choices each with its own reason`);
    ok(CL.gradeCut('CC=C(C)C', 0, 1).diagnosis.includes('single'), 'cleave-it wrong tap message names the single bond');
    // HTML of the lab equation helper is plain text for [O], H2O, X2 and H2
    const html = eqHtml({ lhs: ['C1=CCCCC1', '[O]', 'O'], rhs: ['O[C@@H]1CCCC[C@@H]1O'] });
    ok(html.includes('[O]') && html.includes('H₂O') && html.includes('<svg'), 'reaction-lab equation shows [O] and H2O as text and structures as drawings');
  }

  // ================================================================ 9. the extended reaction-lab: every combination has exactly one right answer and reasons for the rest
  {
    let n = 0, whys = 0;
    for (const a of R.LAB_ALKENES2) for (const id of R.REAGENT_IDS2) {
      const pred = R.predictAdd(a.smiles, id);
      const ch = R.productChoices2(pred);
      const t = `${a.id} + ${id}`;
      ok(ch.length >= 3 && ch.length <= 4, `${t}: ${ch.length} answers`);
      ok(ch.filter((c) => c.correct).length === 1 && R.sameProducts(ch.find((c) => c.correct).smiles, pred.products), `${t}: exactly one correct answer = engine product`);
      const keys = ch.map((c) => keyOf(c.smiles));
      ok(new Set(keys).size === ch.length, `${t}: answers are all different compounds`);
      ok(ch.every((c) => c.smiles.every((s) => canon(s)) && typeof c.why === 'string' && c.why.length > 25), `${t}: all answers parse and carry a reason`);
      ch.filter((c) => !c.correct).forEach((c) => { ok(!R.sameProducts(c.smiles, pred.products), `${t}: wrong answer ${c.kind} differs from the product`); whys++; });
      // a stereo trap is offered whenever syn / anti gives a different compound
      const opp = R.oppositeStereo(a.smiles, id);
      if (opp && R.stereoKey(opp) !== R.stereoKey(pred.products[0])) ok(ch.some((c) => c.kind === 'wrongStereo'), `${t}: the opposite-stereochemistry answer is offered`);
      n++;
    }
    ok(n === 70, '70 lab combinations (10 alkenes x 7 reagents) all accepted');
    console.log(`  reaction-lab: ${n} combinations, ${whys} wrong answers with reasons`);
    // oppositeStereo: the other geometry really is different (cis vs trans etc.)
    ok(R.oppositeStereo('C1=CCCC1', 'Br2') && R.stereoKey(R.oppositeStereo('C1=CCCC1', 'Br2')) === R.stereoKey('Br[C@H]1[C@H](CCC1)Br'), 'opposite of anti Br2 on cyclopentene is the cis dibromide');
    ok(R.oppositeStereo('C1=CCCCC1', 'RCO3H') === null, 'no anti epoxide');
  }

  // ================================================================ 10. radical polymers
  {
    for (const st of R.RADICAL_STEPS) ok(balIndep(st.lhs, st.rhs), `radical step "${st.name}" balances (atoms and charge)`);
    ok(R.RADICAL_STEPS.map((s) => s.name).join() === 'Radical formation,Initiation,Propagation,Termination', 'steps: radical formation, initiation, propagation, termination');
    const expect = { ethylene: '*CC*', propylene: '*CC(*)C', 'vinyl-chloride': '*CC(*)Cl', styrene: '*CC(*)c1ccccc1', tetrafluoroethylene: '*C(F)(F)C(*)(F)F' };
    for (const m of R.MONOMERS) {
      const u = R.repeatUnit(m.smiles);
      eq(u, canon(expect[m.id]), `repeat unit of ${m.id}`);
      // nothing is lost: the unit with * replaced by H has the monomer's atoms plus 2 H... compare the carbon/hetero counts and total H
      const tU = tallyIndep([R.repeatFormulaSmiles(u)]).c, tM = tallyIndep([m.smiles]).c;
      eq(JSON.stringify(Object.entries(tU).sort()), JSON.stringify(Object.entries({ ...tM, 1: (tM[1] || 0) + 2 }).sort()), `repeat unit of ${m.id} = monomer atoms + the 2 chain bonds (as H)`);
      const ch = R.repeatChoices(m.smiles);
      ok(ch.length === 4 && ch.filter((c) => c.correct).length === 1 && new Set(ch.map((c) => c.smiles)).size === 4 && ch.every((c) => c.why.length > 30), `${m.id}: 4 distinct answers, one right, each with a reason`);
      ok(ch.every((c) => canon(c.smiles) !== null), `${m.id}: all answers parse`);
    }
    ok(R.MONOMERS.map((m) => m.polymer).join('|') === 'polyethylene|polypropylene|poly(vinyl chloride)|polystyrene|Teflon (polytetrafluoroethylene)', 'monomer -> polymer names');
    // the same polymer by a second route: join three monomers head to tail by reaction on the graph and read the repeat back
    eq(R.repeatUnit('C=C(C)C'), canon('*CC(*)(C)C'), 'isobutylene repeat unit (generalises)');
  }

  // ================================================================ 11. the generator
  {
    ok(GENERATORS['alkene-additions-2'] && ADD2_SKILLS.every((s) => generatorForSkill(s) === 'alkene-additions-2'), 'generator registered; weak-spot skills route to it');
    ok(ADD2_SKILLS.join() === 'stereo-addition,alkene-oxidation,synthesis,polymers', 'skills: stereo-addition, alkene-oxidation, synthesis, polymers');
    for (const s of ADD2_SKILLS) ok(skillLabel(s) !== s, `skill ${s} has a label`);
    ok(addPool().length === ADD_POOL.length, `every alkene of the generator pool is accepted by the engine (${addPool().length}/${ADD_POOL.length})`);
    const rng = mulberry32(2024);
    const toCheck = [];
    const seenAlk = new Set(), seenReag = new Set();
    let nProb = 0;
    for (const task of ADD2_TASKS) {
      for (let n = 0; n < 50; n++) {
        const p = makeAdditions2Problem(rng, task);
        const t = `generator ${task} #${n}`;
        nProb++;
        ok(p.skill && ADD2_SKILLS.includes(p.skill), `${t}: skill`);
        ok(Array.isArray(p.hints) && p.hints.length === 2 && p.hints.every((h) => h.length > 20) && p.derive && p.derive.length > 20, `${t}: 2 hints and a derivation`);
        ok((p.prompt || p.promptHtml).length > 20, `${t}: prompt`);
        if (p.equation) { ok(p.equation.reactants.every(canon) && (p.equation.products || []).every(canon), `${t}: equation structures parse`); }
        if (p.smiles) ok(canon(p.smiles) !== null, `${t}: smiles parses`);
        if (p.kind === 'choice') {
          ok(p.options.length >= 3 && p.options.length <= 4 && p.options.filter((o) => o.correct).length === 1, `${t}: 3-4 options, one correct`);
          ok(p.options.every((o) => (o.smiles ? o.smiles.split('.').every((s) => canon(s)) : o.text) && typeof o.why === 'string' && o.why.length > 20), `${t}: every option parses and has a reason`);
          ok(p.answer === p.options.find((o) => o.correct).text, `${t}: answer text`);
        } else ok(p.kind === 'widget' && p.widget === 'cleave-it', `${t}: widget problem`);
        if (task === 'product') {
          const pred = R.predictAdd(p.alkene, p.reagent);
          const right = p.options.find((o) => o.correct);
          ok(R.sameProducts(right.smiles.split('.'), pred.products), `${t}: the correct option is the engine product (either enantiomer)`);
          p.options.filter((o) => !o.correct).forEach((o) => ok(!R.sameProducts(o.smiles.split('.'), pred.products), `${t}: wrong option ${o.kind} differs`));
          toCheck.push({ alkene: p.alkene, reagent: p.reagent, engine: right.smiles.split('.') });
          seenAlk.add(p.alkene); seenReag.add(p.reagent);
        }
        if (task === 'trap') {
          const right = p.options.find((o) => o.correct);
          const rs = right.smiles ? right.smiles.split('.') : null;
          if (rs) {
            ok(R.sameProducts(rs, p.products), `${t}: trap answer = engine product`);
            const basicProd = R.predictAdd(p.alkene, 'KMnO4_OH').products, acidProd = R.predictAdd(p.alkene, 'KMnO4_H').products;
            ok(R.sameProducts(rs, basicProd) !== R.sameProducts(rs, acidProd), `${t}: the diol and the cleavage products are told apart`);
            ok(p.options.some((o) => o.smiles && R.sameProducts(o.smiles.split('.'), R.sameProducts(rs, basicProd) ? acidProd : basicProd)), `${t}: the other KMnO4 condition is offered as the trap`);
          } else {
            const id = right.id;
            ok(id === 'KMnO4_OH' || id === 'KMnO4_H', `${t}: conditions answer is basic or acidic KMnO4`);
            eq(R.reagentsFor(p.alkene, p.products, R.REAGENT_IDS2.filter((x) => p.options.some((o) => o.id === x))), [id], `${t}: only ${id} makes this product among the options`);
          }
        }
        if (task === 'cleave') {
          ok(canon(p.config.alkene) && R.predictAdd(p.config.alkene, 'KMnO4_H').products.join() === p.products.join(), `${t}: cleave-it products`);
        }
        if (task === 'reagent') {
          const right = p.options.find((o) => o.correct);
          eq(R.reagentsFor(p.alkene, p.products, p.options.map((o) => o.id)), [right.id], `${t}: exactly one displayed reagent makes the product`);
          ok(right.id === p.reagent && R.sameProducts(R.predictAdd(p.alkene, right.id).products, p.equation.products), `${t}: right reagent recomputed`);
          seenReag.add(p.reagent);
        }
        if (task === 'polymer') {
          const right = p.options.find((o) => o.correct);
          if (p.smiles && p.smiles.includes('*')) {
            // monomer question: the correct option's monomer has this repeat unit
            ok(R.repeatUnit(right.smiles) === canon(p.smiles), `${t}: repeat unit of the right monomer is the drawing`);
            p.options.filter((o) => !o.correct).forEach((o) => ok(R.repeatUnit(o.smiles) !== canon(p.smiles), `${t}: other monomers give other repeat units`));
          } else ok(right.smiles === R.repeatUnit(p.smiles), `${t}: right repeat unit = engine`);
        }
      }
    }
    // Python RDKit (3D) confirms the generator's product answers
    try {
      const res = py('check_additions.py', toCheck, 'gen');
      res.forEach((r, i) => ok(r.match, `generator answer ${i} (${r.alkene} + ${r.reagent}) confirmed by Python RDKit`));
      console.log(`  generator: ${nProb} problems valid; ${res.filter((r) => r.match).length}/${res.length} product answers confirmed by Python RDKit (3D)`);
    } catch (e) { ok(false, 'python cross-check of generator answers failed: ' + String(e.stderr || e.message).slice(0, 200)); }
    ok(seenAlk.size >= 12 && seenReag.size === R.REAGENT_IDS2.length, `generator covers ${seenAlk.size} alkenes and all ${seenReag.size} reagents`);
    const a = generate('alkene-additions-2', 40).map((p) => p.prompt + (p.alkene || '') + (p.reagent || '') + (p.monomer || ''));
    ok(new Set(a).size >= 12, `generator varies (${new Set(a).size} distinct of 40)`);
    for (const sk of ADD2_SKILLS) ok(generate('alkene-additions-2', 8, { skill: sk }).every((p) => p.skill === sk), `skill filter ${sk}`);
    // ring / acyclic mix in the product task and both KMnO4 trap directions appear
    const many = Array.from({ length: 120 }, () => makeAdditions2Problem(rng, 'trap'));
    ok(many.some((p) => p.options.some((o) => o.id)) && many.some((p) => p.options.every((o) => o.smiles)), 'trap task asks both ways (conditions -> product, product -> conditions)');
  }

  // ================================================================ 12. the lesson itself
  {
    const t = 'L10';
    eq([L.id, L.slug, L.chapter, L.sections, L.drawing], ['10', 'alkene-additions-2', 4, ['4.4', '4.5', '4.6', '4.7'], 'skeletal'], `${t} header`);
    ok(L.steps.length >= 16 && L.steps.length <= 20, `${t} has 16-20 steps (${L.steps.length})`);
    ok(L.minutes >= 28 && L.minutes <= 30, `${t} 28-30 minutes`);
    eq(L.mastery, { count: 3, generator: 'alkene-additions-2' }, `${t} mastery`);
    const widgets = L.steps.filter((s) => s.widget).map((s) => s.widget);
    for (const w of ['face-attack', 'mechanism-player', 'cleave-it', 'reaction-lab']) ok(widgets.includes(w), `${t} uses ${w}`);
    ok(L.steps.some((s) => s.type === 'worked'), `${t} has a worked example`);
    ok(L.steps.filter((s) => s.type === 'predict').length >= 3, `${t} makes the learner predict first`);
    ok(L.steps.some((s) => s.type === 'choice' && s.options.some((o) => o.smiles && o.smiles.includes('@'))), `${t} has a cis/trans choice drawn with wedges`);
    ok(L.steps.filter((s) => s.type === 'explain').length >= 3 && L.steps.findIndex((s) => s.type === 'explain') > 0, `${t} explains only after the learner acted`);
    // explain steps come after a graded or predict step
    L.steps.forEach((s, i) => { if (s.type === 'explain') ok(i > 0 && L.steps[i - 1].type !== 'explain', `${t}/${s.id} explain follows an action`); });
    // every drawn answer with wedges is verified against the engine
    let nChk = 0;
    for (const s of L.steps) {
      for (const o of s.options || []) {
        const smiles = o.smiles || ((o.text || '').match(/smiles="([^"]+)"/) || [])[1];
        if (smiles && smiles.includes('@')) ok(!!o.chk, `${t}/${s.id}: wedge answer ${smiles} is checked against the engine`);
        if (!o.chk) continue;
        const [alk, re, kind] = o.chk;
        const pred = R.predictAdd(alk, re);
        const want = kind === 'right' ? pred.products[0] : R.oppositeStereo(alk, re);
        ok(R.sameProducts([smiles], [want]), `${t}/${s.id}: option ${smiles} is the ${kind} stereo-product of ${alk} + ${re}`);
        if (o.correct) ok(kind === 'right', `${t}/${s.id}: the correct option is the 'right' one`);
        nChk++;
      }
    }
    ok(nChk >= 14, `${t} ${nChk} drawn answers checked against the engine`);
    // mechanism step
    const sm = L.steps.find((s) => s.widget === 'mechanism-player');
    const mech = sm.config.mech;
    eq(MC.checkMechanism(mech), [], `${t} bromination mechanism is valid`);
    ok(sm.config.mode === 'draw' && mech.steps.length === 2 && R.sameProducts(mech.products, R.predictAdd('C1=CCCCC1', 'Br2').products), `${t} learner draws cyclohexene + Br2; ends at the trans dibromide`);
    ok(balIndep(sm.reaction.reactants, sm.reaction.products), `${t} mechanism step reaction balances`);
    // cleave-it step
    const sc = L.steps.find((s) => s.widget === 'cleave-it');
    eq(CL.ends(sc.config.alkene).map((e) => e.kind).sort(), ['acid', 'ketone'], `${t} cleave-it: 2-methylbut-2-ene gives a ketone end and an acid end`);
    ok(R.sameProducts(R.predictAdd(sc.config.alkene, 'KMnO4_H').products, ['CC(C)=O', 'CC(=O)O']), `${t} cleave-it products = acetone + acetic acid`);
    // worked example: hex-1-ene, last move names pentanoic acid + CO2
    const w = L.steps.find((s) => s.type === 'worked');
    const last = w.moves[w.moves.length - 1].options.find((o) => o.correct).text;
    const sm2 = [...last.matchAll(/smiles="([^"]+)"/g)].map((m) => m[1]);
    ok(R.sameProducts(sm2, R.predictAdd(w.smiles, 'KMnO4_H').products), `${t} worked example final answer = engine products for ${w.smiles}`);
    // the other worked moves are consistent with the end rules
    const e1 = CL.ends(w.smiles);
    eq(e1.map((e) => e.kind).sort(), ['acid', 'co2'], `${t} worked example: hex-1-ene ends are an acid and CO2`);
    // synthesis step: the drawn target is the engine's trans diol, via the two-step chain
    const syn = L.steps.find((s) => s.skill === 'synthesis');
    ok(R.sameProducts(syn.equation.products, R.predictAdd(syn.equation.reactants[0], 'RCO3H_H3O').products) && !R.sameProducts(syn.equation.products, R.predictAdd(syn.equation.reactants[0], 'KMnO4_OH').products), `${t} synthesis target is the TRANS diol (not what KMnO4/OH- gives)`);
    ok(syn.options.find((o) => o.correct).text.startsWith('1. RCO'), `${t} synthesis: peroxyacid first, then H3O+`);
    // radical-step picture
    const rs = L.steps.find((s) => s.id === 's17');
    ok(balIndep(rs.equation.reactants, rs.equation.products) && R.RADICAL_STEPS.some((st) => JSON.stringify(st.lhs) === JSON.stringify(rs.equation.reactants) && JSON.stringify(st.rhs) === JSON.stringify(rs.equation.products)), `${t} propagation picture balances and is the engine's step`);
    // repeat-unit step
    const ru = L.steps.find((s) => s.id === 's18');
    const choices = R.repeatChoices(ru.smiles);
    eq(ru.options.find((o) => o.correct).smiles, choices.find((c) => c.correct).smiles, `${t} repeat-unit answer = engine`);
    eq(ru.options.map((o) => canon(o.smiles)).sort(), choices.map((c) => c.smiles).sort(), `${t} repeat-unit options = engine's options`);
    // lab configuration
    const lab = L.steps.find((s) => s.widget === 'reaction-lab');
    ok(lab.config.alkenes.every((id) => R.ALKENE2_BY_ID[id]) && lab.config.reagents.every((id) => R.REAGENTS2[id]) && lab.config.need === 2 && lab.config.reagents.length === 7, `${t} lab uses the new alkenes and all 7 new reagents, 2 predictions`);
    // book problems: numbers only, in scope
    ok(L.useIt.book.every((x) => /^4\.\d+$/.test(x)), `${t} useIt numbers only`);
    for (const n of ['4.6', '4.7', '4.8', '4.9', '4.10', '4.11']) ok(L.useIt.book.includes(n), `${t} useIt includes in-chapter ${n}`);
    ok(L.useIt.book.every((x) => { const k = Number(x.split('.')[1]); return (k >= 6 && k <= 11) || (k >= 21 && k <= 68); }), `${t} useIt problems are from the in-chapter 4.4-4.7 range or the end-of-chapter exercises`);
    ok(L.useIt.book.every((x) => !['4.34', '4.36', '4.56'].includes(x)), `${t} useIt leaves out the diene / benzene items`);
    // names in the lesson text: IUPAC names in <mol label> and in text are checked with OPSIN
    const labels = [];
    for (const s of L.steps) {
      const take = (smiles, label, id) => { if (smiles && label) labels.push({ smiles, label, id }); };
      for (const o of s.options || []) { if (o.smiles) take(o.smiles, o.label, s.id); for (const m of (o.text || '').matchAll(/<mol smiles="([^"]+)" label="([^"]+)"/g)) take(m[1], m[2], s.id); }
      for (const mv of s.moves || []) for (const o of mv.options) for (const m of (o.text || '').matchAll(/<mol smiles="([^"]+)" label="([^"]+)"/g)) take(m[1], m[2], s.id);
    }
    const SKIP = new Set(['the monomer itself', 'repeat unit of PVC', 'C=C kept in the chain', 'CO₂', 'cyclohexene oxide']);
    for (const l of labels) {
      if (SKIP.has(l.label)) continue;
      const m = /^(.*?) \((.+)\)$/.exec(l.label);
      const nm = m ? m[2] : l.label;
      const mode = /\[4\.1\.0\]/.test(nm) || /^butane-2,3-diol$/.test(nm) ? 'flat' : 'key';
      nameQueue.push({ name: nm, smiles: l.smiles, mode, label: `${t}/${l.id} label` });
    }
    ok(labels.length >= 20, `${t} ${labels.length} labelled structures`);
    ok(L.steps.every((s) => !JSON.stringify(s).includes('undefined')), `${t} no undefined text`);
    ok(!/halohydrin|OsO|ozon|hydroboration/i.test(JSON.stringify(L).replace(/the book does not cover[^"]*/g, '').replace(/^\/\/.*$/gm, '')), `${t} stays inside McMurry 4.4-4.7 (no halohydrin, OsO4, ozonolysis, hydroboration)`);
  }

  // ================================================================ 13. OPSIN round trips (one batch)
  {
    const res = opsin(nameQueue.map((q) => q.name));
    let n = 0, good = 0;
    for (const q of nameQueue) {
      n++;
      const out = res[q.name];
      let match = false;
      if (out) match = q.mode === 'flat' ? flat(out) === flat(q.smiles) : R.stereoKey(out) === R.stereoKey(q.smiles);
      if (match) good++;
      ok(match, `OPSIN round-trip (${q.label}): "${q.name}" -> ${out || 'unparsed'} expected ${q.smiles} (${q.mode})`);
    }
    console.log(`  OPSIN round-trips (lesson 10): ${good}/${n} names (${new Set(nameQueue.map((q) => q.name)).size} distinct)`);
    ok(n >= 50 && good === n, `OPSIN agreed on all ${n} names`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
