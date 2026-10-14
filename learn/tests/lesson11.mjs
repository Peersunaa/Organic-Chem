// Lesson 11 checks: resonance (engine/resonance.js) and conjugated dienes + HX (engine/reactions-dienes.js), checked four ways:
//   (1) every resonance set the lesson or the `resonance` generator uses is proved against Python RDKit's ResonanceMolSupplier (tools/check_resonance.py):
//       each form must appear among RDKit's (canonical SMILES with charges AND by atom index), RDKit must not have extra ones, and the number of forms
//       quoted in the lesson (4 for the benzyl cation, 3 for the pentadienyl cation, 2 for benzene) must equal RDKit's count;
//   (2) the "not a valid resonance form" traps (atom moved, five bonds, charge changed) are judged by engine/resonance.js and re-judged by RDKit
//       (parses? same skeleton? same total charge?), and the learner's arrows are diagnosed (arrow from a sigma bond, atom moved, five bonds ...);
//   (3) diene + HX: atom/charge balance and arrows of every mechanism, an independent Python recompute from reaction SMARTS (tools/check_dienes.py),
//       a hand-checked fixture (tests/fixtures/dienes.json) whose names are also checked with OPSIN;
//   (4) the 3D model of buta-1,3-diene (s-trans dihedral about 180 degrees, four carbons coplanar), the resonance-drawer judging logic, the extended
//       reaction-lab, the `resonance` generator, the lesson's own steps.
// Run as part of run.mjs (or `node learn/tests/run.mjs` filters nothing; this file can also be run alone: `node learn/tests/lesson11.mjs`).
import { ready, rdkit, canon, analyze } from '../engine/chem.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import * as arrow from '../engine/widgets/arrow-core.js';
import * as MC from '../engine/widgets/mechanism-core.js';
import { WIDGETS } from '../engine/widgets/index.js';
import { formScene, judgeArrows } from '../engine/widgets/resonance-drawer.js';
import { sceneFromSmiles } from '../engine/widgets/arrow-core.js';
import * as RS from '../engine/resonance.js';
import * as R from '../engine/reactions.js';
import * as GR from '../engine/generators-resonance.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import models from '../data/3d/models.js';
import { skillLabel } from '../engine/skills.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const flat = (s) => MC.canonFlat(s);
const strings = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach((x) => strings(x, out)); else if (o && typeof o === 'object') Object.values(o).forEach((x) => strings(x, out)); return out; };
const molsIn = (html) => [...String(html).matchAll(/<mol smiles="([^"]+)"(?: label="([^"]*)")?/g)].map((m) => ({ smiles: m[1], label: m[2] || '' }));

export async function lesson11({ ok, eq }) {
  await ready();
  const L = LESSONS.find((l) => l.id === '11');
  const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'dienes.json'), 'utf8'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-res-'));
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
  const nameQueue = [];

  ok(!!L && L.slug === 'resonance-dienes' && L.drawing === 'skeletal', 'L11 registered, skeletal drawing');
  ok(L.steps.length >= 16 && L.steps.length <= 20, `L11 has 16-20 steps (${L.steps.length})`);
  ok(L.minutes >= 25 && L.minutes <= 30, 'L11 25-30 minutes');
  ok(L.mastery.generator === 'resonance' && GENERATORS.resonance === true, 'L11 mastery generator is `resonance`');
  ok(['4.12', '4.13', '4.14', '4.15'].every((x) => L.useIt.book.includes(x)) && L.useIt.book.every((x) => /^\d+\.\d+$/.test(x)), 'L11 useIt: in-chapter 4.12-4.15, numbers only');
  ok(L.sections.join() === '4.8,4.9,4.10', 'L11 covers 4.8-4.10');
  ok(generatorForSkill('resonance') === 'resonance' && generatorForSkill('dienes') === 'resonance', 'weak spots resonance / dienes are practised with the resonance generator');
  ok(!!skillLabel('resonance') && skillLabel('dienes') !== 'dienes', 'skill labels for resonance and dienes');

  // ================================================================ 1. resonance sets against RDKit
  const SYS = new Map();
  const addSys = (id, start, o = {}) => { if (!SYS.has(id)) SYS.set(id, { id, start, ...o }); };
  for (const s of GR.ALL_SYSTEMS) addSys(s.id, s.start, { fold: !!s.fold, sep: s.fam === 'amide' });
  for (const st of L.steps.filter((x) => x.widget === 'resonance-drawer')) addSys('lesson-' + st.id, st.config.start, { fold: !!st.config.fold, mode: st.config.start === 'C1=CC=CC=C1' ? 'kekule' : 'default', sep: false });
  addSys('benzene', 'C1=CC=CC=C1', { mode: 'kekule' });
  const cases = [], mine = {};
  for (const sys of SYS.values()) {
    const forms = RS.enumerate(sys.start, { fold: sys.fold });
    mine[sys.id] = forms;
    cases.push({ id: sys.id, start: forms[0].state, forms: forms.map((f) => f.state), mode: sys.mode, sep: sys.sep, fold: sys.fold });
  }
  const res = py('check_resonance.py', cases, 'res');
  let rdOK = 0;
  for (const sys of SYS.values()) {
    const r = res[sys.id], n = mine[sys.id].length;
    ok(r && r.ok, `RDKit agrees with the resonance set of ${sys.id} (${sys.start}): ${r ? JSON.stringify({ c: r.claimed_count, r: r.rdkit_count, miss: r.missing_in_rdkit, extra: r.missing_in_claimed, a: r.claimed_smiles, b: r.rdkit_smiles }) : 'no result'}`);
    ok(r && r.claimed_count === n && r.rdkit_count === n, `${sys.id}: ${n} forms = RDKit's count ${r && r.rdkit_count}`);
    if (r && r.ok) rdOK++;
  }
  console.log(`  RDKit resonance cross-checks (lesson 11): ${rdOK}/${SYS.size} systems agree (forms, canonical SMILES with charges, atom-index patterns, counts)`);
  // the numbers the lesson quotes
  const stepOf = (id) => L.steps.find((s) => s.id === id);
  eq(mine['lesson-s06'].length, 4, 'benzyl cation: 4 forms (+ on CH2, ortho, para, ortho)');
  eq(res['lesson-s06'].rdkit_count, 4, 'RDKit also counts 4 for the benzyl cation');
  eq(mine['lesson-s02'].length, 2, 'allyl cation: 2 forms');
  eq(mine['lesson-s04'].length, 2, 'acetate: 2 forms');
  eq(mine['lesson-s08'].length, 2, 'benzene: 2 Kekule forms');
  eq(res['lesson-s08'].rdkit_count, 2, 'RDKit KEKULE_ALL gives 2 forms for benzene');
  eq(stepOf('s07').answer, mine['pentadienyl-cation'].length, 's07 pentadienyl answer = enumerated forms');
  eq(stepOf('s07').answer, res['pentadienyl-cation'].rdkit_count, 's07 pentadienyl answer = RDKit count');
  eq(stepOf('s07').resonanceCount.start, GR.ALL_SYSTEMS.find((x) => x.id === 'pentadienyl-cation').start, 's07 counted structure');
  eq(canon(molsIn(stepOf('s07').prompt)[0].smiles), canon('[CH2+]C=CC=C'), 's07 shows the pentadienyl cation it counts');
  ok(/Four forms/.test(stepOf('s06').confirm) && /Kekulé/.test(JSON.stringify(L)) && !/Kelulé|Kekule\b/.test(JSON.stringify(L)), 'the lesson says four forms for the benzyl cation and spells Kekulé');
  // the engine's own rule check accepts every form it enumerates, and the benzyl cation never puts + on a meta carbon
  for (const sys of SYS.values()) for (const f of mine[sys.id]) ok(RS.compareForm(sys.start, f.smiles).ok, `${sys.id}: form ${f.smiles} passes compareForm`);
  {
    const f = mine['benzyl-cation'], meta = [3, 5];     // atoms of [CH2+]C1=CC=CC=C1: 0 CH2, 1 ipso, 2 ortho, 3 meta, 4 para, 5 meta, 6 ortho
    ok(f.every((x) => meta.every((m) => x.state.charge[m] === 0)), 'benzyl cation: the + charge never reaches a meta carbon');
    eq(f.map((x) => x.state.charge.indexOf(1)).sort(), [0, 2, 4, 6], 'benzyl cation: + on CH2, ortho, para, ortho');
  }
  // hybrid: allyl cation has two half charges and two half double bonds
  {
    const h = RS.hybridOf(mine['allyl-cation']);
    eq(h.charge, [0.5, 0, 0.5], 'allyl hybrid: + shared half and half');
    eq(h.bonds.map((b) => b.order), [1.5, 1.5], 'allyl hybrid: both C-C bonds are 1.5');
    ok(RS.partialLabel(0.5).startsWith('δ+') && RS.partialLabel(-0.5).startsWith('δ'), 'partial charge labels');
    const hb = RS.hybridOf(mine['benzene']);
    ok(hb.bonds.every((b) => b.order === 1.5), 'benzene hybrid: six bonds of order 1.5');
  }

  // ================================================================ 2. arrows -> forms, diagnoses
  const sceneOf = (smi) => sceneFromSmiles([{ smiles: smi }]);
  const heavyOf = (smi) => analyze(smi).atoms.length;
  let arrowRuns = 0;
  for (const sys of SYS.values()) {
    const forms = mine[sys.id];
    const base = sceneOf(sys.start), heavy = heavyOf(sys.start);
    // every form is reached from its parent with the arrows the engine found, judged exactly as the widget judges
    const found = [0];
    forms.slice(1).forEach((f, k) => {
      const parent = forms[f.parent];
      const scene = formScene(base, heavy, parent.state);
      const r = judgeArrows({ scene, heavy, forms, found: [], current: f.parent, fold: !!sys.fold, word: sys.id }, f.via);
      ok(r.ok && r.idx === forms.indexOf(f), `${sys.id}: arrows reach form ${forms.indexOf(f)} (${f.smiles}) -> ${r.ok ? 'ok' : r.diagnosis}`);
      arrowRuns++;
      // already found -> dup
      const d = judgeArrows({ scene, heavy, forms, found: [forms.indexOf(f)], current: f.parent, fold: !!sys.fold, word: sys.id }, f.via);
      ok(!d.ok && d.code === 'dup', `${sys.id}: finding form ${forms.indexOf(f)} twice is reported`);
    });
    // "find all forms" the way the learner does, always from the newest form
    let cur = 0; const have = [0];
    for (let guard = 0; guard < 12 && have.length < forms.length; guard++) {
      const moves = RS.movesFrom(forms[cur].state);
      const sc = formScene(base, heavy, forms[cur].state);
      let next = null;
      for (const m of moves) {
        const r = judgeArrows({ scene: sc, heavy, forms, found: have, current: cur, fold: !!sys.fold, word: sys.id }, m.arrows);
        if (r.ok) { next = r.idx; break; }
      }
      if (next == null) { cur = have[(have.indexOf(cur) + 1) % have.length]; continue; }
      have.push(next); cur = next;
    }
    eq(have.length, forms.length, `${sys.id}: all ${forms.length} forms found by drawing arrows`);
  }
  console.log(`  resonance arrows applied: ${arrowRuns} form-to-form drawings judged like the widget`);
  // diagnoses of wrong arrows (specific, not "wrong")
  {
    const smi = '[CH2+]C=C', sc = sceneOf(smi);                 // 0 C+, 1 C, 2 C, then H atoms
    const hOn = (i) => sc.atoms.findIndex((a, j) => a.el === 'H' && sc.bonds.some((b) => (b.a === i && b.b === j) || (b.b === i && b.a === j)));
    const judge = (arrows) => RS.applyAndCheck(sc, arrows);
    let r = judge([{ from: { bond: [1, 0] }, to: { atom: 0 } }]);
    ok(!r.ok && r.code === 'sigma' && /Arrows must start at a lone pair or a π bond, not a σ bond/.test(r.diagnosis), 'arrow from a C-C sigma bond: ' + r.diagnosis);
    r = judge([{ from: { bond: [0, hOn(0)] }, to: { atom: 2 } }]);
    ok(!r.ok && r.code === 'sigma' && /moves an H atom|different molecule/.test(r.diagnosis), 'arrow from a C-H bond is a moved atom: ' + r.diagnosis);
    r = judge([{ from: { bond: [1, 2] }, to: { bond: [0, 2] } }]);
    ok(!r.ok && r.code === 'moved' && /moved an atom/.test(r.diagnosis) && /different molecule, not a resonance form/.test(r.diagnosis), 'arrow that bonds two atoms that were not bonded: ' + r.diagnosis);
    r = judge([]);
    ok(!r.ok && r.code === 'empty', 'no arrows');
    r = judge([{ from: { bond: [1, 2] }, to: { bond: [0, 1] } }]);
    ok(r.ok && r.code === 'ok', 'the correct allyl arrow is accepted');
    r = judge([{ from: { bond: [1, 2] }, to: { atom: 1 } }, { from: { bond: [1, 2] }, to: { atom: 2 } }]);
    ok(!r.ok, 'the same pi pair used twice is refused: ' + r.diagnosis);
    r = judge([{ from: { lp: 0 }, to: { atom: 1 } }]);
    ok(!r.ok && /lone pair/.test(r.diagnosis), 'C+ has no lone pair to move: ' + r.diagnosis);
    // acetate: first arrow only -> carbon has five bonds
    const ac = sceneOf('CC(=O)[O-]');
    const Om = ac.atoms.findIndex((a) => a.el === 'O' && a.charge === -1), C = 1;
    r = RS.applyAndCheck(ac, [{ from: { lp: Om }, to: { bond: [Om, C] } }]);
    ok(!r.ok && r.code === 'octet' && /This carbon now has 5 bonds/.test(r.diagnosis), 'only the lone-pair arrow draws a carbon with 5 bonds: ' + r.diagnosis);
    const Oe = ac.atoms.findIndex((a, i) => a.el === 'O' && i !== Om);
    r = RS.applyAndCheck(ac, [{ from: { lp: Om }, to: { bond: [Om, C] } }, { from: { bond: [C, Oe] }, to: { atom: Oe } }]);
    ok(r.ok, 'acetate with both arrows is accepted');
    // not the same thing as an arrow that creates a sigma bond between far-apart atoms
    r = RS.applyAndCheck(ac, [{ from: { lp: Om }, to: { bond: [Om, 0] } }]);
    ok(!r.ok && r.code === 'moved', 'lone pair aimed at the CH3 carbon makes a new sigma bond: ' + r.diagnosis);
  }
  // compareForm: each trap, all three families
  const trapCases = [];
  const trapExpect = [];
  const addTrap = (id, start, cand, code) => { trapCases.push({ id, start, trap: cand }); trapExpect.push({ id, start, cand, code }); };
  for (const s of GR.RES_POOL) {
    const f = mine[s.id];
    addTrap(s.id + ':ok', s.start, f[1].smiles, 'ok');
    addTrap(s.id + ':moved', s.start, s.moved, 'moved');
    addTrap(s.id + ':octet', s.start, GR.octetTrap(f[1].state), 'octet');
    addTrap(s.id + ':charge', s.start, GR.chargeTrap(f[1].state), 'charge');
  }
  for (const s of GR.LONG_POOL) {
    addTrap(s.id + ':octet', s.start, GR.octetTrap(mine[s.id][1].state), 'octet');
    addTrap(s.id + ':charge', s.start, GR.chargeTrap(mine[s.id][1].state), 'charge');
    mine[s.id].slice(1).forEach((f, k) => addTrap(s.id + ':ok' + k, s.start, f.smiles, 'ok'));
  }
  // the lesson's own options
  for (const sid of ['s05', 's17']) {
    const st = stepOf(sid);
    st.options.forEach((o, k) => addTrap(sid + ':opt' + k, st.smiles, o.smiles, o.chk.code));
  }
  const tr = py('check_resonance.py', trapCases, 'traps');
  for (const t of trapExpect) {
    const mineR = RS.compareForm(t.start, t.cand);
    eq(mineR.code, t.code, `trap ${t.id}: ${t.cand} judged '${t.code}' by the engine`);
    ok(mineR.diagnosis.length > 20, `trap ${t.id}: has a diagnosis`);
    const r = tr[t.id];
    if (t.code === 'ok') ok(r.parses && r.skeleton_same && r.charge_same && r.formula_same, `RDKit agrees ${t.id} is a valid form (parses, same skeleton, same charge)`);
    if (t.code === 'moved') ok(r.parses && r.formula_same && r.skeleton_same === false && r.charge_same, `RDKit agrees ${t.id} moved an atom (same formula and charge, different skeleton)`);
    if (t.code === 'octet') ok(r.parses === false, `RDKit refuses ${t.id} (a carbon or nitrogen with too many bonds)`);
    if (t.code === 'charge') ok(r.parses && r.skeleton_same && r.formula_same && r.charge_same === false, `RDKit agrees ${t.id} has the same skeleton but a different total charge`);
  }
  console.log(`  resonance traps judged: ${trapExpect.length} candidates (valid, atom moved, five bonds, charge changed), each re-judged by RDKit`);
  ok(/Charge not conserved/.test(RS.compareForm('CC(=O)[O-]', '[CH3][C]([O])=[O]').diagnosis), 'charge trap says "Charge not conserved"');
  ok(/5 bonds/.test(RS.compareForm('CC(=O)[O-]', '[CH3][C](=[O])=[O]').diagnosis), 'octet trap says the carbon has 5 bonds');
  ok(/moved/.test(RS.compareForm('CC(=O)[O-]', '[CH2-]C(=O)O').diagnosis), 'moved trap says an atom moved');

  // ================================================================ 3. dienes + HX
  const HXS = ['HCl', 'HBr', 'HI'];
  const dc = [];
  for (const d of R.LAB_DIENES) for (const x of HXS) dc.push({ diene: d.smiles, X: R.HX[x].X, reagent: x, id: d.id });
  const pyd = py('check_dienes.py', dc.map((c) => ({ diene: c.diene, X: c.X })), 'dienes');
  let dOK = 0;
  dc.forEach((c, i) => {
    const pred = R.predictDiene(c.diene, c.reagent);
    // (a) every mechanism balances and its arrows reproduce each step
    for (const o of pred.orientations) for (const m of [o.mech12, o.mech14]) {
      const errs = MC.checkMechanism(m);
      ok(!errs.length, `${c.id} + ${c.reagent}: mechanism checks (${errs.join('; ')})`);
    }
    const mm = pred.major[0];
    eq(mm.mech14.steps.length, 3, `${c.id} ${c.reagent}: 1,4 route = protonation, resonance, halide`);
    eq(mm.mech12.steps.length, 2, `${c.id} ${c.reagent}: 1,2 route = protonation, halide`);
    ok(mm.mech14.steps[1].isResonance && /Resonance/.test(mm.mech14.steps[1].label), `${c.id}: step 2 is the resonance step`);
    // the resonance step turns the cation into its resonance form, and RS.enumerate agrees with it
    const pair = RS.enumerate(mm.cation).map((f) => flat(f.smiles));
    ok(pair.length === 2 && pair.includes(flat(mm.cation)) && pair.includes(flat(mm.cationResonance)), `${c.id}: cation and resonance form are the 2 forms found by the resonance engine`);
    const pyr = pyd[i];
    // (b) independent Python recompute
    eq(pred.products, pyr.products.map(flat), `${c.id} + ${c.reagent}: products equal the RDKit-SMARTS recompute`);
    ok(pyr.major.map((k) => flat(pyr.orientations[k].p12)).includes(pred.add12) && pyr.major.map((k) => flat(pyr.orientations[k].p14)).includes(pred.add14), `${c.id} ${c.reagent}: the 1,2 and 1,4 products are among the recomputed ones`);
    eq(R.dieneChoices(pred)[0].smiles.slice().sort(), pred.products, `${c.id}: the right answer is the product set`);
    if (pyr.products.map(flat).join() === pred.products.join()) dOK++;
    // (c) formula: every product = diene + HX
    const sortedTally = (list) => JSON.stringify(Object.entries(MC.tallyOf(list).c).sort());
    for (const p of pred.products) eq(sortedTally([p]), sortedTally([c.diene, c.X]), `${c.id} ${c.reagent}: product ${p} = diene + HX (atoms balance)`);
  });
  console.log(`  diene + HX products equal the independent RDKit-SMARTS recompute: ${dOK}/${dc.length} (${R.LAB_DIENES.length} dienes x 3 acids)`);
  // fixture, names with OPSIN
  for (const f of fx) {
    const pred = R.predictDiene(f.diene, f.reagent);
    eq(pred.products, f.products.map((p) => flat(p.smiles)).sort(), `fixture: ${f.diene} + ${f.reagent}`);
    eq(pred.outcome, f.outcome, `fixture outcome ${f.diene}`);
    f.products.forEach((p) => nameQueue.push({ name: p.name, smiles: p.smiles, label: `fixture ${f.reagent} + ${f.diene}` }));
    f.optional = !!f.optional;
  }
  ok(fx.some((f) => f.diene === 'C=CC=C' && f.products.length === 2) && fx.some((f) => f.diene === 'C1=CC=CCC1' && f.products.length === 1) && fx.some((f) => f.diene === 'C=C(C)C=C'), 'fixture covers butadiene (2 products), cyclohexa-1,3-diene (1) and isoprene');
  for (const d of R.LAB_DIENES) { nameQueue.push({ name: d.name.new, smiles: d.smiles, label: 'diene new name' }); nameQueue.push({ name: d.name.old, smiles: d.smiles, label: 'diene old name' }); }
  // refused inputs
  for (const bad of ['C=CCC=C', 'C=C=CC', 'C=C', 'C#CC=C', 'C=Cc1ccccc1', 'CCO', 'C=CC=CC=C']) ok(!R.dieneSites(bad).ok, `dieneSites refuses ${bad}: ${R.dieneSites(bad).reason}`);
  ok(R.dieneSites('C=CC=C').ok && R.dieneSites('C1=CC=CCC1').ok, 'dieneSites accepts conjugated dienes');
  // symmetric dienes accept the mirror-image drawing of step 1; the wrong carbon of the C=C gets the regiochemistry diagnosis
  {
    const m = R.dieneMechanism('C=CC=C', 'HBr', '1,4');
    const st = m.steps[0], cfg = MC.stepConfig(st), H = st.regio.H;
    ok(cfg.regio && cfg.regio.alt && cfg.equiv, 'butadiene step 1 carries regio, regio.alt and equiv');
    const mirror = st.arrows.map((a) => ({ from: a.from.bond ? { bond: a.from.bond.map((x) => ({ 0: 3, 1: 2, 2: 1, 3: 0 })[x] ?? x) } : a.from, to: a.to.bond ? { bond: a.to.bond.map((x) => ({ 0: 3, 1: 2, 2: 1, 3: 0 })[x] ?? x) } : a.to }));
    ok(arrow.grade(cfg, st.arrows).ok, 'step 1 as written is graded right');
    ok(arrow.grade(cfg, mirror).ok, 'step 1 drawn on the other C=C of the symmetric diene is graded right too');
    const wrong = [{ from: { bond: [0, 1] }, to: { bond: [1, H] } }, st.arrows[1]];
    const g = arrow.grade(cfg, wrong);
    ok(!g.ok && g.code === 'regio' && /non-allylic/.test(g.diagnosis), 'H on the inner carbon: ' + g.diagnosis);
    const wrongMirror = [{ from: { bond: [3, 2] }, to: { bond: [2, H] } }, st.arrows[1]];
    const g2 = arrow.grade(cfg, wrongMirror);
    ok(!g2.ok && g2.code === 'regio', 'H on the inner carbon of the other C=C: ' + g2.diagnosis);
    // resonance step: one arrow, bond -> bond
    const s2 = m.steps[1];
    eq(s2.arrows.length, 1, 'resonance step has one arrow');
    ok(arrow.grade(MC.stepConfig(s2), s2.arrows).ok, 'resonance arrow graded right');
    // the learner's resonance arrow reproduces the other form
    eq(flat(MC.stepResult(s2) && R.dieneMechanism('C=CC=C', 'HBr', '1,4').steps[1].after.find((x) => x.includes('+'))), flat('[CH2+]C=CC'), 'butadiene cation resonance form is CH2+-CH=CH-CH3');
  }
  // energy levels for the allylic path are valid and lower than the non-allylic one
  {
    const a = R.allylicLevels(true), n = R.allylicLevels(false);
    ok(a[2].E < n[2].E && a[1].E < n[1].E, 'illustrative allylic path sits below the non-allylic path');
  }

  // ================================================================ 4. the 3D model
  {
    const mb = models['buta-1-3-diene'].molblock;
    const lines = mb.split('\n'); const n = parseInt(lines[3].slice(0, 3), 10);
    const P = (i) => [0, 10, 20].map((o) => parseFloat(lines[4 + i].slice(o, o + 10)));
    const sub = (a, b) => a.map((v, i) => v - b[i]);
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const norm = (a) => Math.hypot(...a);
    const sym = []; for (let i = 0; i < n; i++) sym.push(lines[4 + i].slice(31, 34).trim());
    eq(sym.slice(0, 4), ['C', 'C', 'C', 'C'], 'model atoms 0-3 are the four carbons');
    const b1 = sub(P(1), P(0)), b2 = sub(P(2), P(1)), b3 = sub(P(3), P(2));
    const n1 = cross(b1, b2), n2 = cross(b2, b3);
    const cosd = dot(n1, n2) / (norm(n1) * norm(n2));
    const sign = dot(cross(n1, n2), b2) >= 0 ? 1 : -1;
    const dih = Math.abs((sign * Math.acos(Math.max(-1, Math.min(1, cosd))) * 180) / Math.PI);
    ok(dih > 170, `buta-1,3-diene model is s-trans: C1=C2-C3=C4 dihedral ${dih.toFixed(1)} degrees (about 180)`);
    const nn = cross(sub(P(1), P(0)), sub(P(2), P(0))); const dist = Math.abs(dot(sub(P(3), P(0)), nn)) / norm(nn);
    ok(dist < 0.05, `the four carbons are coplanar (C4 lies ${dist.toFixed(3)} A from the C1-C2-C3 plane)`);
    // C=C ~1.34, C2-C3 ~1.45-1.47, shorter than a normal C-C (about 1.53)
    const len = (i, j) => norm(sub(P(i), P(j)));
    ok(len(0, 1) < 1.38 && len(2, 3) < 1.38 && len(1, 2) < 1.50 && len(1, 2) > len(0, 1), `bond lengths C=C ${len(0, 1).toFixed(2)}, C-C ${len(1, 2).toFixed(2)}`);
    const st = stepOf('s10');
    ok(st.visual && st.visual.widget === 'model3d' && st.visual.config.mol === 'buta-1-3-diene' && models[st.visual.config.mol], 's10 uses the buta-1,3-diene 3D model');
    eq(st.visual.config.highlight, [0, 1, 2, 3], 's10 highlights the four carbons');
    const m2 = analyze(models['buta-1-3-diene'].smiles); eq(m2.atoms.length, 4, 'model SMILES is butadiene');
  }

  // ================================================================ 5. lesson steps
  {
    ok(L.steps.every((s) => !JSON.stringify(s).includes('undefined')), 'L11 no undefined text');
    const t11 = JSON.stringify(L).replace(/the book does not cover[^"]*/g, '');
    ok(!/kinetic control|thermodynamic control|Diels|radical anion/i.test(t11), 'L11 stays inside McMurry 4.8-4.10 (no kinetic/thermodynamic control, no Diels-Alder)');
    ok(!/\d+\s?%/.test(t11), 'L11 quotes no percentages (the book gives ratios that depend on temperature, which is not taught)');
    ok(/Kekulé/.test(t11), 'spelled Kekulé');
    eq(L.steps.filter((s) => s.widget === 'resonance-drawer').map((s) => s.config.name), ['allyl cation', 'acetate ion', 'benzyl cation', 'benzene'], 'resonance-drawer for allyl cation, acetate, benzyl cation, benzene');
    ok(L.steps.some((s) => s.id === 's01' && s.type === 'predict' && /allyl/.test(s.prompt) && /propyl/.test(s.prompt)), 'predict-first: allyl vs propyl cation');
    ok(L.steps.filter((s) => s.type === 'choice' && s.options.some((o) => o.chk && o.chk.code)).length >= 2, 'two valid / NOT-valid resonance trap sets');
    ok(L.steps.filter((s) => s.widget === 'mechanism-player').length === 2 && L.steps.some((s) => s.widget === 'reaction-lab') && L.steps.some((s) => s.type === 'worked'), 'mechanism drawn by the learner (2), worked example, reaction lab');
    ok(L.steps.some((s) => s.visual && s.visual.widget === 'model3d'), '3D model step');
    // the not-valid step really has exactly one invalid option (octet) and three valid ones
    const s17 = stepOf('s17');
    eq(s17.options.filter((o) => o.correct).map((o) => o.chk.code), ['octet'], 's17 the NOT-valid answer is the five-bond carbon');
    eq(s17.options.filter((o) => !o.correct).map((o) => o.chk.code), ['ok', 'ok', 'ok'], 's17 the other three are valid forms');
    const s05 = stepOf('s05');
    eq(s05.options.filter((o) => o.correct).map((o) => o.chk.code), ['ok'], 's05 the valid form is the right answer');
    eq(s05.options.filter((o) => !o.correct).map((o) => o.chk.code).sort(), ['charge', 'moved', 'octet'], 's05 the traps: atom moved, five bonds, changed charge');
    // raw options really cannot be parsed by RDKit and all others can
    for (const sid of ['s05', 's17']) for (const o of stepOf(sid).options) ok(!!o.raw === (o.chk.code === 'octet') && (o.raw ? canon(o.smiles) === null : canon(o.smiles) !== null), `${sid} option ${o.label}: raw only for the structure RDKit refuses`);
    // diene answer options
    for (const sid of ['s15', 's16']) {
      const st = stepOf(sid);
      for (const o of st.options) {
        const pred = R.predictDiene(o.chk.diene, o.chk.reagent);
        const D = R.dieneChoices(pred, { n: 5 });
        const want = D.find((x) => x.kind === o.chk.kind);
        ok(!!want, `${sid} kind ${o.chk.kind} exists in the engine`);
        const got = molsIn(o.text).map((m) => flat(m.smiles)).sort();
        eq(got, want.smiles.map(flat).sort(), `${sid} ${o.chk.kind} option structures = engine answer`);
        eq(!!o.correct, want.correct, `${sid} ${o.chk.kind} correctness`);
        molsIn(o.text).forEach((m) => nameQueue.push({ name: m.label.replace(/\s*\(1,[24]\)$/, ''), smiles: m.smiles, label: `${sid} ${o.chk.kind}` }));
      }
    }
    // s12 cations
    const s12 = stepOf('s12');
    const pb = R.predictDiene('C=CC=C', 'HBr');
    eq(flat(s12.options[s12.options.findIndex((o) => o.correct)].smiles), flat(pb.major[0].cation), 's12 correct cation = engine allylic cation');
    eq(flat(s12.options.find((o) => o.chk && o.chk.nonAllylic).smiles), flat('[CH2+]CC=C'), 's12 non-allylic cation');
    ok(R.dieneChoices(pb).some((o) => o.kind === 'nonallylic'), 's12 non-allylic cation is a distractor of the engine');
    ok(analyze(s12.options.find((o) => o.correct).smiles).atoms.filter((a) => a.fc === 1).length === 1, 's12 one cation centre');
    // s11 names
    nameQueue.push({ name: '3-bromobut-1-ene', smiles: 'C=CC(C)Br', label: 's11 text' }, { name: '1-bromobut-2-ene', smiles: 'CC=CCBr', label: 's11 text' });
    eq(pb.products, [flat('C=CC(C)Br'), flat('CC=CCBr')].sort(), 's11 products are 3-bromobut-1-ene and 1-bromobut-2-ene');
    // s18 worked: penta-1,3-diene + HCl -> one product
    const pw = R.predictDiene('CC=CC=C', 'HCl');
    eq(pw.outcome, 'single', 's18 penta-1,3-diene + HCl gives one product');
    eq(pw.products, [flat('CC=CC(C)Cl')], 's18 product is 4-chloropent-2-ene');
    const w = stepOf('s18');
    eq(w.moves[3].options.find((o) => o.correct).text.includes('CC=CC(C)Cl'), true, 's18 last move names the engine product');
    nameQueue.push({ name: '4-chloropent-2-ene', smiles: 'CC=CC(C)Cl', label: 's18' });
    // mechanisms in s13 / s14: built from the engine and chain-checked; s13 mirror; reaction field products equal the mechanism products
    for (const sid of ['s13', 's14']) {
      const st = stepOf(sid);
      const mech = st.config.mech;
      eq(MC.checkMechanism(mech), [], `${sid} mechanism checks`);
      eq(flat(mech.products[0]), flat(st.reaction.products[0]), `${sid} reaction products = mechanism products`);
    }
    eq(stepOf('s14').config.modes, ['watch', 'draw'], 's14 watches step 1 and draws step 2');
    eq(stepOf('s13').config.mech.steps.length, 3, 's13 draws all three steps of the 1,4 route');
    // reaction-lab dienes
    const lab = stepOf('s19');
    ok(lab.config.dienes.length >= 2 && lab.config.dienes.length <= 3 && lab.config.dienes.every((id) => R.DIENE_BY_ID[id]), 's19 lab offers 2-3 dienes');
    ok(lab.config.reagents.every((r) => R.HX[r]), 's19 lab reagents are HCl / HBr / HI');
    ok(typeof WIDGETS['reaction-lab'].mount === 'function' && typeof WIDGETS['resonance-drawer'].mount === 'function', 'widgets registered');
    // every <mol> label that is a name is checked with OPSIN below
    for (const s of L.steps) for (const str of strings(s)) for (const m of molsIn(str)) if (/^[0-9a-z,\-]+(ene|yne|ane|diene|oxide|ol)$/.test(m.label) || /chloro|bromo|ene$/.test(m.label)) {
      if (/\(1,[24]\)|\s/.test(m.label)) continue;
      nameQueue.push({ name: m.label, smiles: m.smiles, label: `${s.id} <mol> label` });
    }
  }

  // ================================================================ 6. the `resonance` generator
  {
    const rng = mulberry32(11);
    const kinds = {};
    const probs = generate('resonance', 150, { rng });
    ok(probs.length === 150, 'generator makes 150 problems');
    for (const p of probs) {
      kinds[p.kind + ':' + (p.widget || (p.options ? 'choice' : 'input'))] = (kinds[p.kind + ':' + (p.widget || (p.options ? 'choice' : 'input'))] || 0) + 1;
      ok(['resonance', 'dienes'].includes(p.skill), 'problem skill is resonance or dienes');
      ok(Array.isArray(p.hints) && p.hints.length === 2 && p.hints.every((x) => x.length > 20) && p.derive && p.derive.length > 20, 'problem has 2 hints and a worked derivation');
      if (p.kind === 'choice') {
        ok(p.options.filter((o) => o.correct).length === 1 && p.options.length === 4 && p.options.every((o) => o.why && o.why.length > 10), `choice: one correct of 4 with whys (${p.prompt.slice(0, 40)})`);
        if (p.system) {
          const sys = GR.ALL_SYSTEMS.find((s) => s.id === p.system);
          eq(p.start, sys.start, 'problem starts from its system');
          for (const o of p.options) {
            const r = RS.compareForm(p.start, o.smiles);
            eq(r.code, o.code, `option ${o.kind} judged ${o.code}`);
            if (p.prompt.startsWith('Which of these is a valid')) eq(o.correct, r.ok, 'valid-task: the correct option is the only valid form');
            else eq(o.correct, !r.ok, 'invalid-task: the correct option is the only invalid structure');
            ok(!!o.raw === (canon(o.smiles) === null), 'raw flag set exactly when RDKit refuses the structure');
          }
          if (p.prompt.startsWith('Which of these is a valid')) eq(p.options.filter((o) => o.code === 'ok').length, 1, 'valid-task has exactly one valid option');
          else eq(p.options.filter((o) => o.code === 'ok').length, 3, 'invalid-task has three valid options');
          eq(new Set(p.options.map((o) => o.smiles)).size, 4, 'four distinct drawings');
        } else {
          const pred = R.predictDiene(p.diene, p.reagent);
          const right = p.options.find((o) => o.correct);
          eq(right.products.map(flat).sort(), pred.products, 'products task: the right answer is the engine product set');
          eq(new Set(p.options.map((o) => o.products.map(flat).sort().join('+'))).size, 4, 'four distinct answer sets');
          for (const o of p.options) for (const m of molsIn(o.text)) ok(canon(m.smiles) !== null, 'option structures parse');
        }
      } else if (p.kind === 'input') {
        const sys = GR.ALL_SYSTEMS.find((s) => s.id === p.system);
        eq(p.answer, RS.enumerate(sys.start, { fold: !!sys.fold }).length, `count task ${p.system}: answer = enumerated forms`);
        eq(p.answer, res[sys.id].rdkit_count, `count task ${p.system}: answer = RDKit's count`);
        ok(p.wrong.every((w) => w.match !== p.answer), 'count task: diagnoses are for wrong numbers');
      } else if (p.kind === 'widget') {
        eq(p.widget, 'resonance-drawer', 'draw task uses the resonance-drawer');
        const sys = GR.RES_POOL.find((s) => s.id === p.system);
        eq(p.config.start, sys.start, 'draw task start');
        const forms = RS.enumerate(sys.start, { fold: !!sys.fold });
        eq(forms.length, p.nForms, 'draw task: number of forms');
        // the learner can solve it: arrows from the start reach another form
        const base = sceneOf(sys.start), heavy = heavyOf(sys.start);
        const sc = formScene(base, heavy, forms[0].state);
        const r = judgeArrows({ scene: sc, heavy, forms, found: [0], current: 0, fold: !!sys.fold, word: sys.name }, forms[1].via);
        ok(r.ok, `draw task ${sys.id}: first form is reachable (${r.diagnosis || 'ok'})`);
        ok(p.config.need === 1, 'draw task needs one new form');
        // every system in the pool is checked against RDKit above
        ok(res[sys.id] && res[sys.id].ok, `draw task ${sys.id} verified against RDKit`);
      }
    }
    const seen = new Set(probs.filter((p) => p.system).map((p) => p.system));
    ok(seen.size >= 12, `systems reached by the generator: ${seen.size}`);
    ok(new Set(probs.filter((p) => p.diene).map((p) => p.diene + p.reagent)).size >= 8, 'diene + HX problems vary');
    const t = new Set(probs.map((p) => (p.kind === 'widget' ? 'draw' : p.kind === 'input' ? 'count' : p.system ? (p.prompt.startsWith('Which of these is a valid') ? 'valid' : 'invalid') : 'products')));
    eq([...t].sort(), ['count', 'draw', 'invalid', 'products', 'valid'], 'all five tasks appear');
    for (const skill of ['resonance', 'dienes']) {
      const ps = generate('resonance', 30, { skill, rng: mulberry32(5) });
      ok(ps.every((p) => p.skill === skill), `skill ${skill} serves only ${skill} problems`);
    }
    const a = generate('resonance', 6).map((p) => p.prompt + (p.start || '') + (p.diene || '')).join('|'), b = generate('resonance', 6).map((p) => p.prompt + (p.start || '') + (p.diene || '')).join('|');
    ok(a !== b, 'fresh problems on each run');
    // radicals are not in the pool (RDKit does not enumerate them)
    ok(GR.ALL_SYSTEMS.every((s) => analyze(s.start).atoms.every((x) => Number.isInteger(x.lp))), 'no radical in the pool (every atom has a whole number of lone pairs)');
    console.log(`  resonance generator: ${probs.length} problems (${JSON.stringify(kinds)})`);
  }

  // ================================================================ 7. OPSIN round trips (one batch)
  {
    const res2 = opsin(nameQueue.map((q) => q.name));
    let n = 0, good = 0;
    for (const q of nameQueue) {
      n++;
      const out = res2[q.name];
      const match = !!out && flat(out) === flat(q.smiles);
      if (match) good++;
      ok(match, `OPSIN round-trip (${q.label}): "${q.name}" -> ${out || 'unparsed'} expected ${q.smiles}`);
    }
    console.log(`  OPSIN round-trips (lesson 11): ${good}/${n} names (${new Set(nameQueue.map((q) => q.name)).size} distinct)`);
    ok(n >= 40 && good === n, `OPSIN agreed on all ${n} names`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
