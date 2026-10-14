// Lesson 09 checks: the reactions engine (HX addition + acid-catalysed hydration, Markovnikov) checked three ways, namely
//   (1) every generated mechanism: atoms + charge balance of every step, steps chain, applying the arrows reproduces `after`;
//   (2) an independent Python RDKit recompute (tools/check_markovnikov.py: reaction SMARTS for both regiochemistries + a carbocation-substitution count)
//       for 40+ alkenes x 4 reagents, compared by canonical SMILES;
//   (3) a hand-checked fixture (tests/fixtures/markovnikov.json) whose names are also checked with OPSIN.
// Plus: regiochemistry-aware arrow grading, the 3D carbocation (planarity), the energy pathways, the cation-rank and reaction-lab logic,
// the `markovnikov` mastery generator, and the lesson's own steps.
// Run on its own with `node learn/tests/lesson09.mjs`, or as part of run.mjs.
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
import * as EC from '../engine/widgets/energy-core.js';
import * as CR from '../engine/widgets/cation-rank.js';
import { WIDGETS } from '../engine/widgets/index.js';
import * as R from '../engine/reactions.js';
import models from '../data/3d/models.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import { MARK_TASKS, MARK_SKILLS, makeMarkovnikovProblem, regioAlkenes, describeDiff } from '../engine/generators-markovnikov.js';
import { skillLabel } from '../engine/skills.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function htmlStrings(o, out = []) {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => htmlStrings(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => htmlStrings(x, out));
  return out;
}
const words = (html) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

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

/** 50+ simple alkenes: acyclic and rings, every substitution pattern. Those whose major cation could rearrange are refused by the engine and tested separately. */
export const POOL = [
  'C=C', 'CC=C', 'CCC=C', 'CC=CC', 'CC(C)=C', 'CCCC=C', 'CCC=CC', 'CCC(C)=C', 'CC=C(C)C', 'CCCCC=C', 'CCCC=CC', 'CCC=CCC',
  'CCCC(C)=C', 'CCC=C(C)C', 'CC=C(C)CC', 'CC(C)=C(C)C', 'C=C(C)C(C)C', 'CC(C)CC=C', 'CC=C(CC)CC', 'CCCCCC=C', 'CCCCC=CC', 'CCCC=CCC',
  'CCCC=CCCC', 'C=C(C)CC(C)(C)C', 'CC(C)=CC(C)(C)C', 'CCC(C)=CC', 'CC=CC(C)(C)C', 'CC(C)=CCC', 'CCC(CC)=C', 'CCCC(CC)=C',
  'C1=CCCC1', 'C1=CCCCC1', 'C1=CCCCCC1', 'CC1=CCCC1', 'CC1=CCCCC1', 'CC1=C(C)CCCC1', 'CC1CC=CCC1', 'C=C1CCCCC1', 'C=C1CCCC1', 'CC=C1CCCCC1',
  'CC(C)=C1CCCCC1', 'CCC1=CCCCC1', 'CC1=CCC(C)CC1', 'C=C(C)CCC', 'CC=CCC(C)C', 'CCCCCCC=C', 'CCCCCCCC=C', 'CC1=CCCC(C)C1', 'CC1(C)CCCC=C1'.replace('CC1(C)CCCC=C1', 'C1=CCCC(C)(C)C1')
];

export async function lesson09({ ok, eq }) {
  await ready();
  const L = LESSONS.find((l) => l.id === '09');
  const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'markovnikov.json'), 'utf8'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-mark-'));
  /** names -> SMILES by OPSIN (tools/check_names.py) */
  const opsin = (names) => {
    const uniq = [...new Set(names)];
    const inp = path.join(tmp, 'in.json'), out = path.join(tmp, 'out.json');
    fs.writeFileSync(inp, JSON.stringify(uniq));
    execFileSync('python3', ['-I', path.join(HERE, '..', 'tools', 'check_names.py'), inp, out], { stdio: ['ignore', 'ignore', 'ignore'] });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const nameQueue = []; // {name, smiles, label}: every product / alkene name is checked against OPSIN in one batch at the end
  const expectName = (name, smiles, label) => nameQueue.push({ name, smiles, label });

  // ================================================================ 1. alkene facts and the engine's refusals
  {
    const s = R.alkeneSites('CC(C)=C');
    eq(s.ok && s.carbons, [1, 3], 'alkeneSites: 2-methylpropene C=C carbons');
    eq([s.nH[3], s.nH[1], s.cls[3], s.cls[1]], [2, 0, 1, 3], 'alkeneSites: CH2 has 2 H / class 1, C(CH3)2 has 0 H / class 3');
    for (const x of fx.excluded) {
      let msg = null;
      try { R.predict(x.alkene, 'HBr'); } catch (e) { msg = e.message; }
      ok(msg && /^excluded:/.test(msg), `${x.name} is refused by predict() (${msg})`);
    }
    ok(!R.alkeneSites('C=Cc1ccccc1').ok && /aromatic/.test(R.alkeneSites('C=Cc1ccccc1').reason), 'styrene refused: aromatic');
    ok(!R.alkeneSites('CCCC').ok && !R.alkeneSites('C=CC=C').ok && !R.alkeneSites('C#C').ok && !R.alkeneSites('CC(=O)C=C').ok, 'alkanes, dienes, alkynes and carbonyls refused');
    ok(R.rearrangementRisk('C=CC(C)C', 1, 0) && R.rearrangementRisk('C=CC(C)(C)C', 1, 0) && R.rearrangementRisk('CCC(C)C=C', 3, 4), 'rearrangement risk flagged for 3-methylbut-1-ene, 3,3-dimethylbut-1-ene, 3-methylpent-1-ene');
    ok(!R.rearrangementRisk('CC(C)=C', 1, 3) && !R.rearrangementRisk('CCCC=C', 3, 4), 'no false alarm for 2-methylpropene / pent-1-ene');
    // class definitions recomputed from the cations themselves
    for (const [smi, want] of [['[CH3+]', 0], ['C[CH2+]', 1], ['CC[CH2+]', 1], ['C[CH+]C', 2], ['[CH+]1CCCCC1', 2], ['C[C+](C)C', 3], ['C[C+]1CCCCC1', 3]]) eq(R.cationClass(smi), want, `cationClass ${smi}`);
    for (const [c, list] of Object.entries(R.CATION_POOL)) for (const e of list) eq(R.cationClass(e.smiles), Number(c), `CATION_POOL class ${c}: ${e.smiles}`);
  }

  // ================================================================ 2. every generated mechanism (1)
  const accepted = [];   // [alkene, reagent, pred]
  let nMech = 0, nSteps = 0;
  for (const alkene of [...POOL, ...R.LAB_ALKENES.map((a) => a.smiles)]) {
    let refused = false;
    for (const reagent of R.REAGENT_IDS) {
      let pred = null;
      try { pred = R.predict(alkene, reagent); } catch (e) { refused = true; continue; }
      accepted.push([alkene, reagent, pred]);
      for (const o of pred.options) {
        const t = `${alkene} + ${reagent} (H on ${o.hC}, + on ${o.pC})`;
        const m = o.mech;
        eq(MC.checkMechanism(m), [], `mechanism valid: ${t}`);
        nMech++;
        ok(m.steps.length === (R.REAGENTS[reagent].kind === 'HX' ? 2 : 3), `${t}: ${m.steps.length} steps`);
        m.steps.forEach((st, k) => {
          nSteps++;
          ok(balIndep(st.before, st.after), `${t} step ${k + 1}: atoms and charge balance (independent tally)`);
          // applying the arrows reproduces `after` (own route, not checkMechanism)
          const cfg = MC.stepConfig(st);
          eq(arrow.validate(cfg), [], `${t} step ${k + 1}: arrows valid`);
          const state = arrow.applyArrows(cfg);
          eq(canon(buildMolblock(state)), canon(st.after.join('.')), `${t} step ${k + 1}: arrows reproduce after`);
          eq(MC.octetViolations(state), [], `${t} step ${k + 1}: no octet exceeded`);
        });
        // the first step puts the + charge on pC and H on hC, and the class of the cation is read from its own structure
        eq(R.cationClass(o.cation), o.cls, `${t}: class of the cation structure = class from the alkene`);
        eq(o.mech.steps[0].after[0], o.cation, `${t}: cation is step 1's first product`);
        ok(balIndep([alkene, R.REAGENTS[reagent].reactant === 'O' ? 'O' : R.REAGENTS[reagent].reactant], [o.product]) , `${t}: overall alkene + HX/H2O = product`);
      }
      // the stored outcome follows the cation classes
      const cls = pred.options.map((o) => o.cls);
      if (pred.outcome === 'single') ok(pred.options.length === 1 && pred.major.length === 1, `${alkene}: single`);
      if (pred.outcome === 'markovnikov') ok(cls[0] !== cls[1] && pred.major[0].cls === Math.max(...cls) && pred.minor.cls === Math.min(...cls), `${alkene}: markovnikov picks the larger class`);
      if (pred.outcome === 'mixture') ok(cls[0] === cls[1] && pred.products.length === 2, `${alkene}: mixture = equal classes, two products`);
    }
    if (refused) ok(!POOL.includes(alkene) || R.alkeneSites(alkene).ok, `${alkene} refused for a reason`);
  }
  const accAlkenes = new Set(accepted.map((x) => x[0]));
  ok(accAlkenes.size >= 40, `at least 40 alkenes accepted (${accAlkenes.size})`);
  console.log(`  reactions engine: ${accAlkenes.size} alkenes x 4 reagents, ${nMech} mechanisms, ${nSteps} steps checked`);
  // an invalid `added` must be caught by checkMechanism
  {
    const m = R.buildMechanism('CC(C)=C', 'H2O', 3, 1);
    const bad = JSON.parse(JSON.stringify(m)); delete bad.steps[2].added;
    ok(MC.checkMechanism(bad).some((e) => /not the previous after/.test(e)), 'step 3 without `added` is rejected (before must be the previous after)');
    const bad2 = JSON.parse(JSON.stringify(m)); bad2.steps[2].added = ['Cl'];
    ok(MC.checkMechanism(bad2).length > 0, 'a wrong `added` species is rejected');
    // a tampered arrow is caught
    const bad3 = JSON.parse(JSON.stringify(R.buildMechanism('CC(C)=C', 'HBr', 3, 1))); bad3.steps[0].arrows.pop();
    ok(MC.checkMechanism(bad3).length > 0, 'a missing arrow is caught by checkMechanism');
  }

  // ================================================================ 3. Python RDKit cross-check (2): reaction SMARTS + substitution count
  {
    const cases = accepted.map(([alkene, reagent, pred]) => ({ alkene, reagent, engine: pred.products }));
    const inp = path.join(tmp, 'mk-in.json'), out = path.join(tmp, 'mk-out.json');
    fs.writeFileSync(inp, JSON.stringify(cases));
    let res = null;
    try {
      execFileSync('python3', ['-I', path.join(HERE, '..', 'tools', 'check_markovnikov.py'), inp, out], { stdio: ['ignore', 'ignore', 'pipe'] });
      res = JSON.parse(fs.readFileSync(out, 'utf8'));
    } catch (e) { ok(false, 'python RDKit cross-check could not run: ' + String(e.stderr || e.message).slice(0, 300)); }
    if (res) {
      let good = 0;
      res.forEach((r, i) => {
        const [alkene, reagent, pred] = accepted[i];
        if (r.match) good++;
        ok(r.match, `python cross-check ${alkene} + ${reagent}: python ${JSON.stringify(r.python)} route2 ${JSON.stringify(r.route2)} engine ${JSON.stringify(r.engine)}`);
        // cation classes: the engine's (class, product) pairs equal the python substitution counts
        const mine = pred.options.map((o) => `${o.cls}:${canon(o.product)}`).sort();
        const theirs = r.cations.map((c) => `${c.class}:${canon(c.product)}`).sort();
        eq([...new Set(mine)], [...new Set(theirs)], `python cation (class, product) pairs ${alkene} + ${reagent}`);
      });
      const nA = new Set(res.map((r) => r.alkene)).size;
      ok(nA >= 40, `python cross-check covered ${nA} alkenes (need 40)`);
      console.log(`  python RDKit cross-check: ${good}/${res.length} cases (${nA} alkenes x ${new Set(res.map((r) => r.reagent)).size} reagents) agree`);
    }
  }

  // ================================================================ 4. hand-checked fixture (3)
  {
    ok(fx.cases.length >= 15, `fixture has ${fx.cases.length} cases (>= 15)`);
    const need = [['CC(C)=C', 'HBr', 'CC(C)(C)Br'], ['CC=C', 'HCl', 'CC(C)Cl'], ['CC1=CCCCC1', 'HBr', 'CC1(Br)CCCCC1'], ['CC1=CCCCC1', 'H2O', 'CC1(O)CCCCC1'], ['CC=C(C)C', 'HCl', 'CCC(C)(C)Cl'], ['C=C', 'HI', 'CCI']];
    for (const [a, r, p] of need) ok(fx.cases.some((c) => canon(c.alkene) === canon(a) && c.reagent === r && c.products.length === 1 && canon(c.products[0]) === canon(p)), `fixture contains ${a} + ${r} -> ${p}`);
    ok(fx.cases.some((c) => c.alkene === 'CCC=CC' && c.reagent === 'HBr' && c.outcome === 'mixture' && c.names.slice().sort().join() === '2-bromopentane,3-bromopentane'), 'fixture contains pent-2-ene + HBr -> 2- and 3-bromopentane');
    ok(fx.excluded.some((x) => x.name === 'styrene'), 'fixture excludes styrene');
    for (const c of fx.cases) {
      const t = `fixture ${c.alkeneName} + ${c.reagent}`;
      const pred = R.predict(c.alkene, c.reagent);
      eq(pred.products, c.products.map((s) => canon(s)).sort(), `${t}: products`);
      eq(pred.outcome, c.outcome, `${t}: outcome`);
      c.products.forEach((p, i) => expectName(c.names[i], p, `${t} product`));
      expectName(c.alkeneName, c.alkene, `${t} alkene`);
    }
    console.log(`  fixture: ${fx.cases.length} hand-checked cases, ${fx.excluded.length} exclusions`);
  }

  // ================================================================ 5. regiochemistry-aware arrow grading
  {
    let nReg = 0, nEither = 0;
    for (const [alkene, reagent, pred] of accepted) {
      const step = pred.major[0].mech.steps[0];
      const cfg = MC.stepConfig(step);
      const t = `${alkene} + ${reagent}`;
      ok(arrow.grade(cfg, cfg.arrows).ok, `${t}: the stored arrows are graded ok`);
      if (pred.outcome === 'markovnikov') {
        nReg++;
        ok(!!step.regio && cfg.regio === step.regio, `${t}: step 1 carries regio data`);
        const rg = step.regio;
        const [hC, pC] = rg.pi;
        eq([hC, pC], [pred.major[0].hC, pred.major[0].pC], `${t}: regio.pi = [H carbon, + carbon] of the major cation`);
        const second = cfg.arrows.find((a) => a.from.bond && a.from.bond.includes(rg.H) === true);
        // the learner's version: H bonds to the WRONG carbon
        const wrongArrow = { from: { bond: [pC, hC] }, to: { bond: [pC, rg.H] } };
        const g = arrow.grade(cfg, [wrongArrow, second]);
        ok(!g.ok && g.code === 'regio', `${t}: wrong carbon -> code regio (${g.code})`);
        ok(/wrong carbon/.test(g.diagnosis) && /less stable carbocation/.test(g.diagnosis) && /(primary|secondary|tertiary)/.test(g.diagnosis), `${t}: specific diagnosis names the less stable cation`);
        ok(g.diagnosis.includes(R.CLASS_NAME[pred.minor.cls]) && g.diagnosis.includes(R.CLASS_NAME[pred.major[0].cls]), `${t}: diagnosis states both classes (${R.CLASS_NAME[pred.minor.cls]} vs ${R.CLASS_NAME[pred.major[0].cls]})`);
        // the right carbon in the learner's form (to:{bond:[carbon,H]}) is accepted; an arrow aimed at the bare atom H is read as the expected one
        ok(arrow.grade(cfg, [{ from: { bond: [hC, pC] }, to: { bond: [hC, rg.H] } }, second]).ok, `${t}: right carbon accepted`);
        ok(arrow.grade(cfg, [{ from: { bond: [hC, pC] }, to: { atom: rg.H } }, second]).ok, `${t}: bare-H form accepted`);
        // the wrong end with the second arrow missing still gets the regiochemistry message first
        ok(arrow.grade(cfg, [wrongArrow]).code === 'regio', `${t}: wrong carbon is reported even with one arrow`);
        // the buttons the learner sees name both carbons with different H counts
        ok(rg.ends.length === 2 && rg.ends[0].text !== rg.ends[1].text && rg.ends.every((e) => /the carbon with/.test(e.text)), `${t}: chooser labels differ`);
      } else {
        nEither++;
        ok(!step.regio, `${t}: ${pred.outcome} -> no regio restriction (either end is fine)`);
        const other = cfg.arrows[0];
        const H = other.to.bond[1], [hC, pC] = [other.to.bond[0], other.from.bond.find((c) => c !== other.to.bond[0])];
        const second = cfg.arrows[1];
        ok(arrow.grade(cfg, [{ from: { bond: [hC, pC] }, to: { atom: H } }, second]).ok, `${t}: bare-H arrow accepted`);
        if (pred.outcome === 'mixture') ok(arrow.grade(cfg, [{ from: { bond: [hC, pC] }, to: { bond: [hC, H] } }, second]).ok, `${t}: mixture, the stored end is fine`);
      }
      // a missing second arrow and a stray arrow are still diagnosed
      const part = arrow.grade(cfg, [cfg.arrows[0]]);
      ok(!part.ok && part.code !== 'ok', `${t}: one arrow is not enough`);
    }
    ok(nReg >= 20 && nEither >= 10, `grading tested on ${nReg} regiospecific and ${nEither} symmetric / mixture cases`);
    // Lesson 08 behaviour is unchanged: no regio field, bare-H form accepted
    const hcl = MC.stepConfig(R.buildMechanism('C=C', 'HCl', 0, 1).steps[0]);
    ok(arrow.grade(hcl, hcl.arrows).ok && !('regio' in hcl), 'ethylene + HCl: no regio data, grades as in Lesson 08');
  }

  // ================================================================ 6. products offered as answers
  {
    let nCh = 0;
    for (const [alkene, reagent, pred] of accepted) {
      const ch = R.productChoices(pred);
      const t = `${alkene} + ${reagent}`;
      nCh++;
      ok(ch.filter((c) => c.correct).length === 1 && ch.length >= 3 && ch.length <= 4, `${t}: one correct of ${ch.length}`);
      ok(ch.every((c) => c.why && c.why.length > 20 && c.smiles.every((s) => canon(s))), `${t}: every option has a why and valid SMILES`);
      eq(ch.find((c) => c.correct).smiles.map((s) => canon(s)).sort(), pred.products, `${t}: correct option = predicted products`);
      const keys = ch.map((c) => c.smiles.map((s) => canon(s)).sort().join('.'));
      ok(new Set(keys).size === ch.length, `${t}: options are distinct`);
      for (const c of ch.filter((x) => !x.correct)) {
        if (c.kind === 'onlyOne') ok(pred.outcome === 'mixture' && c.smiles.length === 1 && pred.products.includes(canon(c.smiles[0])), `${t}: 'only one' = one of the two products`);
        else ok(c.smiles.some((s) => !pred.products.includes(canon(s))), `${t}: distractor ${c.kind} is not the answer`);
        if (c.kind === 'anti') { ok(pred.outcome === 'markovnikov' && canon(c.smiles[0]) === pred.minor.product, `${t}: anti-Markovnikov distractor is the other orientation`); ok(/wrong carbon/.test(c.why) && /less stable carbocation/.test(c.why), `${t}: anti diagnosis`); }
        if (c.kind === 'unchanged') ok(canon(c.smiles[0]) === canon(alkene), `${t}: unchanged = the alkene`);
        if (c.kind === 'wrongAtom' && R.REAGENTS[reagent].kind === 'HX') ok(analyze(c.smiles[0]).atoms.some((a) => a.sym !== 'C' && a.sym !== R.REAGENTS[reagent].X), `${t}: wrong-atom has a different halogen`);
      }
    }
    // a hydration alkane distractor really is the alkane (H added to both carbons)
    eq(R.distractors(R.predict('CC(C)=C', 'H2O')).wrongAtom, [canon('CC(C)C')], 'hydration wrong-atom = isobutane');
    ok(nCh >= 100, `product choices checked for ${nCh} reactions`);
  }

  // ================================================================ 7. 3D carbocation and energy pathways
  {
    const m = models['tert-butyl-cation'], iso = models['isobutane'];
    ok(m && iso && m.smiles === 'C[C+](C)C', '3D models: tert-butyl cation and isobutane exist');
    const parse = (mb) => { const lines = mb.split('\n'); const n = parseInt(lines[3].slice(0, 3), 10); const atoms = []; for (let i = 0; i < n; i++) { const l = lines[4 + i]; atoms.push({ p: [0, 10, 20].map((o) => parseFloat(l.slice(o, o + 10))), el: l.slice(31, 34).trim() }); } return atoms; };
    const sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0), cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = (a) => Math.hypot(...a);
    const ang = (c, a, b) => { const u = sub(a, c), w = sub(b, c); return (Math.acos(dot(u, w) / (norm(u) * norm(w))) * 180) / Math.PI; };
    const cat = parse(m.molblock);
    ok(cat.length === 13 && cat[1].el === 'C', 'cation: 13 atoms, atom 1 is the central carbon (the lesson highlights atom 1)');
    ok(/M\s+CHG\s+1\s+2\s+1/.test(m.molblock), 'cation molblock carries the +1 charge on the central carbon (atom 2 of 13)');
    const nb = [0, 2, 3].map((i) => cat[i].p), c0 = cat[1].p;
    const ca = ang(c0, nb[0], nb[1]) + ang(c0, nb[0], nb[2]) + ang(c0, nb[1], nb[2]);
    ok(Math.abs(ca - 360) < 3, `cation C-C-C angles add to 360 (planar sp2): ${ca.toFixed(1)}`);
    const nrm = cross(sub(nb[1], nb[0]), sub(nb[2], nb[0]));
    const dist = Math.abs(dot(sub(c0, nb[0]), nrm)) / norm(nrm);
    ok(dist < 0.05, `central carbon lies in the plane of its three neighbours (distance ${dist.toFixed(3)} A)`);
    for (const [i, j] of [[0, 2], [0, 3], [2, 3]]) ok(Math.abs(ang(c0, cat[i].p, cat[j].p) - 120) < 4, `cation angle ${i}-C-${j} near 120 (${ang(c0, cat[i].p, cat[j].p).toFixed(1)})`);
    const al = parse(iso.molblock);
    const nbIso = [0, 2, 3].map((i) => al[i].p), hIso = al.find((a, i) => a.el === 'H' && i > 3);
    const s3 = ang(al[1].p, nbIso[0], nbIso[1]) + ang(al[1].p, nbIso[0], nbIso[2]) + ang(al[1].p, nbIso[1], nbIso[2]);
    ok(s3 < 340 && s3 > 320, `isobutane central carbon is pyramidal/tetrahedral: C-C-C angles add to ${s3.toFixed(1)} (< 340)`);
    const nrmI = cross(sub(nbIso[1], nbIso[0]), sub(nbIso[2], nbIso[0]));
    ok(Math.abs(dot(sub(al[1].p, nbIso[0]), nrmI)) / norm(nrmI) > 0.3, 'isobutane: central carbon sits out of the plane of its three carbon neighbours');
    ok(!!hIso, 'isobutane has the H on the central carbon');
    // the lesson's model step: central carbon highlighted
    const s5 = L.steps.find((s) => s.id === 's05');
    ok(s5.visual.config.mol === 'tert-butyl-cation' && s5.visual.config.compare === 'isobutane', 'L09 s05 compares the cation with isobutane');
    eq(s5.visual.config.highlight, [1], 'L09 s05 highlights atom 1 (the central carbon)');
    ok(WIDGETS['model3d'] && models[s5.visual.config.mol] && models[s5.visual.config.compare], 'L09 s05 models exist');

    // energy pathways: valid, consistent, and ordered by cation class (lower cation -> lower TS1 -> smaller Eact)
    const lv = [1, 2, 3].map((c) => R.pathwayLevels(c));
    lv.forEach((l, i) => { eq(EC.validate(l), [], `pathway ${i + 1}° levels valid`); ok(EC.consistent(l), `pathway ${i + 1}° consistent (step 1 is the slow step)`); });
    ok(lv[2][2].E < lv[1][2].E && lv[1][2].E < lv[0][2].E, 'cation energy: 3° < 2° < 1°');
    ok(lv[2][1].E < lv[1][1].E && lv[1][1].E < lv[0][1].E, 'TS1: 3° < 2° < 1°');
    const e1 = lv.map((l) => EC.steps(l)[0].eact);
    ok(e1[2] < e1[1] && e1[1] < e1[0], `Eact(step 1) falls with class: ${e1.join(' > ')}`);
    // the classes come from the engine, not from typing: 2-methylpropene + HBr has a 3° and a 1° cation
    const pr = R.predict('CC(C)=C', 'HBr');
    eq(pr.options.map((o) => o.cls).sort(), [1, 3], '2-methylpropene: cations 1° and 3°');
    const s7 = L.steps.find((s) => s.id === 's07');
    eq(s7.visual.config.levels, R.pathwayLevels(pr.major[0].cls, { R: 'alkene + HBr', I: '3° carbocation', P: 'alkyl bromide' }), 'L09 s07 solid curve = pathway of the major cation class');
    eq(s7.visual.config.overlay.levels.map((l) => l.E), R.pathwayLevels(pr.minor.cls).map((l) => l.E), 'L09 s07 dashed curve = pathway of the minor cation class');
    ok(s7.visual.config.mode === 'view' && /Illustrative/.test(s7.visual.config.caption), 'L09 s07 diagram is view-only and captioned illustrative');
    ok(s7.worked.includes(String(e1[2])) && s7.worked.includes(String(e1[0])), `L09 s07 worked answer quotes Eact ${e1[2]} and ${e1[0]}`);
    ok(typeof WIDGETS['energy-diagram'].mount === 'function', 'energy-diagram registered');
  }

  // ================================================================ 8. widgets: cation-rank, reaction-lab
  {
    ok(WIDGETS['cation-rank'] && WIDGETS['reaction-lab'] && typeof WIDGETS['cation-rank'].mount === 'function' && typeof WIDGETS['reaction-lab'].mount === 'function', 'cation-rank and reaction-lab are registered');
    const rng = mulberry32(9);
    for (let n = 0; n < 60; n++) {
      const items = R.rankItems(rng);
      const classes = items.map((it) => R.cationClass(it.smiles)).sort();
      eq(classes, [0, 1, 2, 3], `rank round ${n}: one cation of each class`);
      const sol = CR.solution(items);
      ok(CR.gradeAll(items, sol).ok, `rank round ${n}: solution accepted`);
      eq(sol, R.rankOrder(items), `rank round ${n}: widget solution = engine ranking`);
      ok(!CR.gradeAll(items, [...sol].reverse()).ok, `rank round ${n}: reversed order rejected`);
      const g = CR.gradeTap(items, [], sol[3]);
      ok(!g.ok && /more stable one still waiting/.test(g.diagnosis) && /alkyl groups donate/i.test(g.diagnosis), `rank round ${n}: the least stable first is diagnosed`);
      ok(g.diagnosis.includes(R.CLASS_NAME[0]) && g.diagnosis.includes(R.CLASS_NAME[3]), `rank round ${n}: diagnosis names the classes`);
      // ties in a partial ranking: after taking the 3° cation, the 1° cation before the 2° is still wrong
      ok(!CR.gradeTap(items, [sol[0]], sol[2]).ok && CR.gradeTap(items, [sol[0]], sol[1]).ok, `rank round ${n}: 2° before 1°`);
    }
    // ties are allowed in either order
    const tie = [{ smiles: 'C[CH+]C' }, { smiles: '[CH+]1CCCCC1' }, { smiles: 'C[C+](C)C' }];
    ok(CR.gradeAll(tie, [2, 0, 1]).ok && CR.gradeAll(tie, [2, 1, 0]).ok && !CR.gradeAll(tie, [0, 2, 1]).ok, 'two 2° cations may be ranked in either order');
  }

  // ================================================================ 9. the `markovnikov` generator
  {
    ok(GENERATORS['markovnikov'] && generatorForSkill('markovnikov') === 'markovnikov' && generatorForSkill('carbocations') === 'markovnikov', 'generator registered; weak-spot skills route to it');
    ok(MARK_SKILLS.includes('markovnikov') && MARK_SKILLS.includes('carbocations') && skillLabel('markovnikov') !== 'markovnikov' && skillLabel('carbocations') !== 'carbocations', 'skill labels exist');
    ok(regioAlkenes().length >= 6 && regioAlkenes().every((a) => { const s = R.alkeneSites(a.smiles); return s.cls[s.carbons[0]] !== s.cls[s.carbons[1]]; }), 'regiospecific alkene pool');
    const rng = mulberry32(2024);
    const seen = new Set(), seenSkill = new Set();
    const pyCases = [];
    let total = 0;
    for (const task of MARK_TASKS) {
      for (let n = 0; n < 50; n++) {
        const p = makeMarkovnikovProblem(rng, task);
        total++; seen.add(task); seenSkill.add(p.skill);
        const t = `generator ${task} #${n}`;
        ok(p.prompt && p.hints.length === 2 && p.hints.every((h) => h.length > 10) && p.derive.length > 20, `${t}: prompt, 2 hints, derive`);
        ok(['markovnikov', 'carbocations'].includes(p.skill), `${t}: skill ${p.skill}`);
        if (task === 'product') {
          const cor = p.options.filter((o) => o.correct);
          ok(p.options.length === 4 && cor.length === 1 && new Set(p.options.map((o) => canon(o.smiles))).size === 4 && p.options.every((o) => o.why.length > 15 && canon(o.smiles)), `${t}: four distinct drawn options, one correct, every why`);
          eq(p.options.map((o) => o.kind).sort(), ['anti', 'major', 'unchanged', 'wrongAtom'], `${t}: Markovnikov, anti-Markovnikov, wrong atom, unchanged`);
          const pred = R.predict(p.alkene, p.reagent);
          eq([canon(cor[0].smiles)], pred.products, `${t}: correct option = engine product`);
          pyCases.push({ alkene: p.alkene, reagent: p.reagent, engine: [cor[0].smiles] });
          ok(p.equation.reactants[0] === p.alkene && p.answer === cor[0].text, `${t}: equation and answer`);
          const anti = p.options.find((o) => o.kind === 'anti');
          ok(/wrong carbon/.test(anti.why) && /less stable carbocation/.test(anti.why), `${t}: anti-Markovnikov choice gets the specific diagnosis`);
        }
        if (task === 'rank') {
          eq(p.config.items.map((it) => R.cationClass(it.smiles)).sort(), [0, 1, 2, 3], `${t}: four classes`);
          eq(CR.solution(p.config.items), p.order, `${t}: order`);
          ok(CR.gradeAll(p.config.items, p.order).ok && p.kind === 'widget' && p.widget === 'cation-rank' && p.skill === 'carbocations', `${t}: widget kind, solution accepted`);
        }
        if (task === 'arrows') {
          const c = p.config;
          eq(arrow.validate(c), [], `${t}: arrows valid`);
          ok(arrow.grade(c, c.arrows).ok && !arrow.grade(c, []).ok, `${t}: solution ok, empty rejected`);
          eq(canon(buildMolblock(arrow.applyArrows(c))), canon(c.products.join('.')), `${t}: arrows give the cation + anion/water`);
          ok(!!c.regio, `${t}: regiochemistry-aware (regio data)`);
          const [hC, pC] = c.regio.pi;
          const bad = arrow.grade(c, [{ from: { bond: [pC, hC] }, to: { bond: [pC, c.regio.H] } }, c.arrows[1]]);
          ok(bad.code === 'regio' && /wrong carbon/.test(bad.diagnosis), `${t}: wrong end diagnosed`);
          ok(p.config.atoms.length > 3 && new Set(c.atoms.map((a) => a.x.toFixed(2) + ',' + a.y.toFixed(2))).size === c.atoms.length, `${t}: atom positions distinct`);
        }
        if (task === 'reactant') {
          const cor = p.options.filter((o) => o.correct);
          ok(p.options.length === 4 && cor.length === 1 && new Set(p.options.map((o) => canon(o.smiles))).size === 4, `${t}: four distinct alkenes, one correct`);
          for (const o of p.options) {
            const pr = R.predict(o.smiles, p.reagent);
            if (o.correct) eq(pr.products, [canon(p.product)], `${t}: correct alkene gives exactly the target`);
            else { ok(!pr.products.includes(canon(p.product)), `${t}: distractor does not give the target`); ok(/Not this one\./.test(o.why) && o.why.length > 40, `${t}: distractor why`); }
          }
          pyCases.push({ alkene: cor[0].smiles, reagent: p.reagent, engine: [p.product] });
        }
      }
    }
    ok(seen.size === MARK_TASKS.length && seenSkill.has('markovnikov') && seenSkill.has('carbocations'), 'every task and skill is generated');
    const a = generate('markovnikov', 30).map((p) => p.prompt + JSON.stringify(p.equation || p.smiles || p.config?.items || ''));
    ok(new Set(a).size >= 10, `generator varies (${new Set(a).size} distinct of 30)`);
    for (const sk of MARK_SKILLS) ok(generate('markovnikov', 8, { skill: sk }).every((p) => p.skill === sk || (sk === 'markovnikov' && p.skill === 'markovnikov')), `skill filter ${sk}`);
    // every generated product / reactant answer is re-derived in Python RDKit
    try {
      const inp = path.join(tmp, 'g-in.json'), out = path.join(tmp, 'g-out.json');
      fs.writeFileSync(inp, JSON.stringify(pyCases));
      execFileSync('python3', ['-I', path.join(HERE, '..', 'tools', 'check_markovnikov.py'), inp, out], { stdio: ['ignore', 'ignore', 'pipe'] });
      const res = JSON.parse(fs.readFileSync(out, 'utf8'));
      res.forEach((r, i) => ok(r.match, `generator answer ${i} (${r.alkene} + ${r.reagent}) confirmed by Python RDKit`));
      console.log(`  generator answers confirmed by Python RDKit: ${res.filter((r) => r.match).length}/${res.length}`);
    } catch (e) { ok(false, 'python cross-check of generator answers failed: ' + String(e.stderr || e.message).slice(0, 200)); }
    // describeDiff is computed from structures
    ok(/2 carbons/.test(describeDiff('CC(C)(C)Br', 'CCBr')) && /not a ring/.test(describeDiff('ClC1CCCCC1', 'CCCCCCCl')) && /is a ring/.test(describeDiff('CCCCCCCl', 'ClC1CCCCC1')), 'describeDiff mentions carbon count / ring');
    ok(/primary|secondary|tertiary/.test(describeDiff('CC(C)(C)Br', 'CC(C)CBr')), 'describeDiff names the carbon class');
    ok(total === MARK_TASKS.length * 50, `generated ${total} problems`);
  }

  // ================================================================ 10. the lesson
  {
    const t = 'L09';
    ok(L && L.id === '09' && L.slug === 'alkene-additions-1', `${t} registered`);
    ok(L.steps.length >= 16 && L.steps.length <= 20, `${t} has 16-20 steps (${L.steps.length})`);
    ok(L.minutes >= 25 && L.minutes <= 30, `${t} 25-30 minutes`);
    ok(L.drawing === 'skeletal' && L.chapter === 4, `${t} skeletal drawing, chapter 4`);
    eq(L.sections, ['4.1', '4.2', '4.3'], `${t} sections`);
    eq(L.mastery, { count: 3, generator: 'markovnikov' }, `${t} mastery`);
    ok(L.steps[0].type === 'predict', `${t} starts with a prediction`);
    const firstExplain = L.steps.findIndex((s) => s.type === 'explain');
    ok(firstExplain >= 3, `${t} the first explain card comes after the learner has acted on 3 steps (${firstExplain})`);
    ok(L.steps.filter((s) => s.type === 'predict').length >= 4, `${t} several predict-first steps`);
    // book problems exist in the chapter text
    eq(L.useIt.book, ['4.1', '4.2', '4.3', '4.4', '4.5', '4.23', '4.39', '4.42', '4.55', '4.60'], `${t} book problems`);
    ok(L.useIt.endFrom === 21, `${t} end-of-chapter exercises start at 4.21`);
    try {
      const txt = fs.readFileSync('/tmp/claude-0/-home-user-Organic-Chem/cf94e48a-a808-537f-854f-a886a3dca214/scratchpad/book/ch4.txt', 'utf8');
      const nums = new Set([...txt.matchAll(/^4\.(\d+) /gm)].map((m) => Number(m[1])));
      const inChap = [...txt.matchAll(/^Problem 4\.(\d+)$/gm)].map((m) => Number(m[1]));
      for (const b of L.useIt.book) { const n = Number(b.split('.')[1]); ok(n >= 21 ? nums.has(n) : inChap.includes(n), `${t} book problem ${b} exists in the chapter text`); }
      ok(/What alkenes would you start with to prepare the following alkyl halides/.test(txt) && /^4\.42 What alkenes would you hydrate/m.test(txt) && /^4\.60 Draw an energy diagram for the addition of HBr to pent-1-ene/m.test(txt) && /^4\.55 Reaction of 2-methylpropene with CH3OH/m.test(txt), `${t} spot checks: 4.2 reactants, 4.42 hydrate, 4.55 CH3OH analogue, 4.60 energy diagram`);
    } catch (e) { /* the book text is not part of the repo; skip when it is absent */ }
    const by = (w) => L.steps.filter((s) => s.widget === w);
    eq(by('mechanism-player').map((s) => s.config.mode), ['draw', 'draw'], `${t} two drawn mechanisms (HBr, hydration)`);
    eq(by('cation-rank').length, 1, `${t} one carbocation ranking`);
    eq(by('reaction-lab').length, 1, `${t} one reaction-lab step`);
    ok(by('reaction-lab')[0].config.need === 2, `${t} the lab needs two correct predictions`);
    ok(L.steps.some((s) => s.type === 'worked'), `${t} has a worked example`);
    ok(L.steps.some((s) => s.visual && s.visual.widget === 'energy-diagram' && s.visual.config.overlay), `${t} energy diagram with two pathways`);
    ok(L.steps.some((s) => s.visual && s.visual.widget === 'model3d' && s.visual.config.mol === 'tert-butyl-cation'), `${t} 3D carbocation`);
    for (const s of L.steps) ok(s.skill && ['markovnikov', 'carbocations', 'mechanism', 'energy-diagram', 'curved-arrows'].includes(s.skill), `${t}/${s.id} skill ${s.skill}`);
    for (const s of L.steps) if (s.type === 'explain') ok(words(s.html) <= 80, `${t}/${s.id} explain <= 80 words (${words(s.html)})`);

    // ---- s01: predicted products are the engine's
    const optSmiles = (s) => s.options.map((o) => ({ o, smiles: ((/<mol smiles="([^"]+)"/.exec(o.text) || [])[1]) || null }));
    const s1 = L.steps.find((s) => s.id === 's01');
    const p1 = R.predict('CC(C)=C', 'HBr');
    const s1o = optSmiles(s1);
    eq(canon(s1o.find((x) => x.o.correct).smiles), p1.products[0], `${t} s01 correct option = engine product`);
    eq(canon(s1o.find((x) => x.smiles && !x.o.correct).smiles), p1.minor.product, `${t} s01 distractor = the anti-Markovnikov orientation`);
    eq(s1.equation.reactants, ['CC(C)=C', 'Br'], `${t} s01 equation`);
    // ---- s02: the highlighted atoms are the two C=C carbons
    const s2 = L.steps.find((s) => s.id === 's02');
    const sites2 = R.alkeneSites(s2.smiles);
    eq(s2.highlight, sites2.carbons, `${t} s02 highlights the two C=C carbons`);
    eq([sites2.nH[2] > sites2.nH[1], sites2.cls[1] > sites2.cls[2]], [true, true], `${t} s02: the =CH carbon (idx 2) has more H and the CH3 carbon (idx 1) the larger cation class`);
    eq(R.predict(s2.smiles, 'HBr').products, [canon('CC1(Br)CCCCC1')], `${t} s02 product is 1-bromo-1-methylcyclohexane`);
    // ---- s03: ranking items
    const s3 = L.steps.find((s) => s.id === 's03');
    eq(s3.config.items.map((it) => R.cationClass(it.smiles)).sort(), [0, 1, 2, 3], `${t} s03 ranks one cation of each class`);
    ok(CR.gradeAll(s3.config.items, CR.solution(s3.config.items)).ok && CR.solution(s3.config.items).join() !== [0, 1, 2, 3].join(), `${t} s03 solution accepted and the first order is not already the answer`);
    // ---- s08 / s11: mechanisms
    const s8 = L.steps.find((s) => s.id === 's08'), s11 = L.steps.find((s) => s.id === 's11');
    const m8 = s8.config.mech, m11 = s11.config.mech;
    eq(MC.checkMechanism(m8), [], `${t} s08 mechanism valid`);
    eq(MC.checkMechanism(m11), [], `${t} s11 mechanism valid`);
    eq([m8.steps.length, m11.steps.length], [2, 3], `${t} s08 has 2 steps, s11 has 3`);
    eq(m8.steps[0].after[0], 'C[C+](C)C', `${t} s08 step 1 makes the tert-butyl cation`);
    eq(m8.products, ['CC(C)(C)Br'], `${t} s08 product`);
    eq(m11.products.map((x) => canon(x)).sort(), ['CC(C)(C)O', '[OH3+]'].map((x) => canon(x)).sort(), `${t} s11 ends with tert-butyl alcohol and H3O+`);
    eq([m11.steps[0].after[0], m11.steps[1].after[0].includes('[OH2+]'), m11.steps[2].after.some((x) => canon(x) === canon('[OH3+]'))], ['C[C+](C)C', true, true], `${t} s11: cation -> oxonium -> alcohol + H3O+ (catalyst regenerated)`);
    ok(balIndep(s8.reaction.reactants, s8.reaction.products) && balIndep(['CC(C)=C', 'O'], ['CC(C)(C)O']), `${t} s08 / s11 reactions balance`);
    const st1 = m8.steps[0];
    eq([R.alkeneSites('CC(C)=C').nH[st1.regio.pi[0]], R.alkeneSites('CC(C)=C').nH[st1.regio.pi[1]]], [2, 0], `${t} s08 regio: H goes to the CH2 carbon (2 H), + on the carbon with no H`);
    ok(by('mechanism-player').every((s) => s.reaction && s.hints.length === 2), `${t} mechanism steps have a reaction and hints`);
    // ---- s09 wording matches the engine's diagnosis
    const s9 = L.steps.find((s) => s.id === 's09');
    ok(s9.options.find((o) => o.correct).text.includes('wrong carbon') && /primary/.test(s9.options.find((o) => o.correct).text), `${t} s09 names the wrong carbon / primary cation`);
    // ---- s10: hydration
    const s10 = L.steps.find((s) => s.id === 's10');
    const p10 = R.predict('CC1=CCCCC1', 'H2O');
    const s10o = optSmiles(s10);
    eq(canon(s10o.find((x) => x.o.correct).smiles), p10.products[0], `${t} s10 correct option = engine hydration product`);
    eq(canon(s10o.filter((x) => x.smiles && !x.o.correct)[0].smiles), p10.minor.product, `${t} s10 distractor = anti-Markovnikov alcohol`);
    // ---- s14: mixture
    const s14 = L.steps.find((s) => s.id === 's14');
    const p14 = R.predict('CCC=CC', 'HBr');
    eq(p14.outcome, 'mixture', `${t} s14 is a mixture case`);
    ok(/2-bromopentane/.test(s14.options.find((o) => o.correct).text) && /3-bromopentane/.test(s14.options.find((o) => o.correct).text), `${t} s14 correct option names both bromides`);
    eq(p14.products, [canon('CCC(Br)CC'), canon('CCCC(C)Br')].sort(), `${t} s14 products are 2- and 3-bromopentane`);
    eq(p14.options.map((o) => o.cls), [2, 2], `${t} s14 both cations secondary`);
    // ---- s15: worked example, figures are the engine's own species
    const s15 = L.steps.find((s) => s.id === 's15');
    const p15 = R.predict('CC=C(C)C', 'HCl');
    eq(canon(s15.moves[2].figure.smiles), p15.major[0].cation, `${t} s15 cation figure = engine cation`);
    eq(p15.major[0].cls, 3, `${t} s15 cation is tertiary`);
    const m15 = optSmiles({ options: s15.moves[3].options });
    eq(canon(m15.find((x) => x.o.correct).smiles), p15.products[0], `${t} s15 product`);
    eq(canon(m15.find((x) => x.smiles && !x.o.correct && /anti-Markovnikov/.test(x.o.why)).smiles), p15.minor.product, `${t} s15 distractor = anti-Markovnikov product`);
    const sites15 = R.alkeneSites('CC=C(C)C');
    eq([sites15.nH[sites15.carbons[0]], sites15.nH[sites15.carbons[1]]], [1, 0], `${t} s15: the =CH carbon has 1 H, the C(CH3)2 carbon none`);
    // ---- s16 / s17: predict the reactant
    for (const [id, reagent] of [['s16', 'HCl'], ['s17', 'H2O']]) {
      const s = L.steps.find((x) => x.id === id);
      const target = canon(s.smiles);
      const os = optSmiles(s);
      const good = os.filter((x) => R.predict(x.smiles, reagent).products.length === 1 && R.predict(x.smiles, reagent).products[0] === target);
      eq(good.length, 1, `${t} ${id}: exactly one alkene gives exactly the target`);
      ok(good[0].o.correct, `${t} ${id}: and it is the marked one`);
      for (const x of os.filter((y) => !y.o.correct)) ok(!R.predict(x.smiles, reagent).products.every((p) => p === target), `${t} ${id}: distractor ${x.smiles} does not give only the target`);
      ok(os.every((x) => canon(x.smiles)), `${t} ${id}: options parse`);
    }
    const s17 = L.steps.find((s) => s.id === 's17');
    const mix = R.predict('CCC=CC', 'H2O');
    ok(mix.outcome === 'mixture' && mix.products.includes(canon(s17.smiles)), `${t} s17 pent-2-ene gives a mixture that includes the target (the teaching trap)`);
    // ---- s18: the lab
    const s18 = L.steps.find((s) => s.id === 's18');
    ok(s18.config.need === 2 && R.LAB_ALKENES.length === 10 && R.REAGENT_IDS.length === 4, `${t} s18 lab: 10 alkenes, 4 reagents, 2 predictions`);
    for (const a of R.LAB_ALKENES) { const nm = R.alkeneName(a.smiles); ok(nm && nm.new && nm.old, `lab alkene ${a.id} has both IUPAC names`); expectName(nm.new, a.smiles, `lab alkene ${a.id} (new IUPAC)`); expectName(nm.old, a.smiles, `lab alkene ${a.id} (old IUPAC)`); }
    eq(R.REAGENTS.H2O.label, 'H₂O, H₂SO₄ (cat.)', 'hydration reagent label');
    ok(!htmlStrings(L).concat(htmlStrings(R.REAGENTS)).join(' ').includes('H₃SO₄'), 'no H₃SO₄ typo anywhere in the lesson or reagents');
    // ---- text hygiene: the topics that must NOT appear, and the ones that must
    const prose = htmlStrings(L.steps).join(' ').replace(/<[^>]+>/g, ' ');
    ok(!/peroxide|rearrang|hydride shift|methyl shift|radical/i.test(prose), `${t} no peroxide / rearrangement chemistry`);
    ok(/Markovnikov/.test(prose) && /regiospecific/.test(prose) && /sp²/.test(prose) && /empty/.test(prose) && /inductive/.test(prose) && /catalyst/.test(prose) && /oxonium/.test(prose) && /mixture/.test(prose) && /3° > 2° > 1°/.test(prose), `${t} covers Markovnikov, regiospecific, sp² empty p orbital, inductive effect, catalyst, oxonium, mixture, 3° > 2° > 1°`);
    ok(/H went to the wrong carbon/.test(prose) || L.steps.some((s) => s.id === 's09'), `${t} has the anti-Markovnikov diagnosis step`);
    // smiles in text parse; inline SVG balanced; mol labels that are names are OPSIN-checked
    const molTags = [];
    for (const str of htmlStrings(L.steps)) {
      for (const m of str.matchAll(/<mol smiles="([^"]+)"(?: label="([^"]*)")?/g)) { ok(canon(m[1]) !== null, `${t} smiles ${m[1]} parses`); if (m[2]) molTags.push([m[2], m[1]]); }
      const open = (str.match(/<svg\b/g) || []).length, close = (str.match(/<\/svg>/g) || []).length;
      ok(open === close, `${t} inline SVG tags balance`);
    }
    for (const [name, smi] of molTags) expectName(name, smi, `${t} <mol label>`);
    for (const s of L.steps) {
      for (const f of [].concat(s.equation || [], s.moves ? s.moves.map((m) => m.equation).filter(Boolean) : [])) ok([...f.reactants, ...f.products].every((x) => canon(x)), `${t} ${s.id} equation smiles parse`);
      for (const m of s.moves || []) if (m.figure) ok(canon(m.figure.smiles), `${t} ${s.id} figure parses`);
      if (s.smiles) ok(canon(s.smiles), `${t} ${s.id} smiles parses`);
    }
    // hydration of a name that appears in the prose: product names stated in options/whys
    for (const [name, smi] of [['2-bromopentane', 'CCCC(C)Br'], ['3-bromopentane', 'CCC(Br)CC'], ['pentan-2-ol', 'CCCC(C)O'], ['pentan-3-ol', 'CCC(O)CC'], ['propan-2-ol', 'CC(C)O'], ['cyclohexanol', 'OC1CCCCC1'], ['chlorocyclohexane', 'ClC1CCCCC1'], ['2-chloro-2-methylbutane', 'CCC(C)(C)Cl']]) expectName(name, smi, `${t} name in prose`);
  }

  // ================================================================ OPSIN (one batch): every product, alkene and label name means the structure it came from
  {
    let good = 0, n = 0;
    try {
      const res = opsin(nameQueue.map((q) => q.name));
      for (const q of nameQueue) {
        const out = res[q.name];
        if (q.label.endsWith('<mol label>') && !out) continue; // a caption that is not a name (e.g. "the carbocation")
        n++;
        const match = !!out && canon(out) === canon(q.smiles);
        if (match) good++;
        ok(match, `OPSIN round-trip (${q.label}): "${q.name}" -> ${out || 'unparsed'} expected ${canon(q.smiles)}`);
      }
      console.log(`  OPSIN: ${good}/${n} names (fixture products, alkenes, lesson labels) match their structures`);
      ok(n >= 40, `OPSIN checked ${n} names`);
    } catch (e) { ok(false, 'OPSIN check could not run: ' + String(e.message).slice(0, 200)); }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

// run alone: node learn/tests/lesson09.mjs
if (process.argv[1] && process.argv[1].endsWith('lesson09.mjs')) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await lesson09({ ok, eq });
  console.log(`${pass} checks passed, ${fail} failed`);
  failures.slice(0, 40).forEach((f) => console.log(' FAIL ' + f));
  if (fail) process.exit(1);
}
