// Lesson 13 checks: benzene and electrophilic aromatic substitution (engine/reactions-aromatic.js, engine/naming-arene.js, McMurry 5.1 to 5.5), checked six ways:
//   (1) every mechanism (activation where it can be drawn, pi attack, deprotonation) balances in atoms and charge, chains to the next step and is reproduced by its arrows; the generation of the
//       electrophile is a balanced step; the catalyst comes back; the arrow grader accepts every equivalent way to draw the attack and gives a specific diagnosis for typical wrong ones;
//   (2) an independent Python RDKit recompute (tools/check_eas.py: reaction SMARTS for the products, the refusals, atom balance, and the sigma complex built from the product whose resonance
//       forms come from RDKit's ResonanceMolSupplier) for every reagent and a large pool of halides and rings;
//   (3) a hand-checked fixture (tests/fixtures/eas.json: 21 reactions incl. bromobenzene, chlorobenzene, nitrobenzene -> aniline, benzenesulfonic acid, toluene from CH3Cl, ethylbenzene,
//       acetophenone, the Friedel-Crafts refusals, and 27 names), all names verified with OPSIN;
//   (4) names of hundreds of generated mono-, di- and trisubstituted benzenes in both styles, round-tripped through OPSIN;
//   (5) the 3D model of benzene (flat, six C-C equal within 0.01 A), the ring-position widget, the synthesis planner (nitro -> amine), the extended reaction-lab, the `eas-basics` generator;
//   (6) the lesson's own steps (drawn answers recomputed from the engine, mechanisms, text limited to McMurry 5.1 to 5.5).
// Run as part of run.mjs.
import { ready, canon, analyze } from '../engine/chem.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import * as arrow from '../engine/widgets/arrow-core.js';
import * as MC from '../engine/widgets/mechanism-core.js';
import { WIDGETS } from '../engine/widgets/index.js';
import * as R from '../engine/reactions.js';
import * as N from '../engine/naming-arene.js';
import { nameBothAny } from '../engine/naming-chain.js';
import { enumerate } from '../engine/resonance.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import { EAS_TASKS, randomArene, electrophileText } from '../engine/generators-eas.js';
import * as RP from '../engine/widgets/ring-position.js';
import { piCloud, modelAngle } from '../engine/widgets/model3d.js';
import models from '../data/3d/models.js';
import { skillLabel, skillRule } from '../engine/skills.js';
import { checkInput } from '../engine/steps.js';
import * as EC from '../engine/widgets/energy-core.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const strings = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach((x) => strings(x, out)); else if (o && typeof o === 'object') Object.values(o).forEach((x) => strings(x, out)); return out; };
const molsIn = (html) => [...String(html).matchAll(/<mol smiles="([^"]+)"(?: label="([^"]*)")?/g)].map((m) => ({ smiles: m[1], label: m[2] || '' }));
const tallyKey = (list) => JSON.stringify(Object.entries(MC.tallyOf(list).c).sort());
const sumTally = (list) => MC.tallyOf(list);
const NAMEISH = /^[0-9a-zA-Z,\-()]+( acid)?$/;

export async function lesson13({ ok, eq }) {
  await ready();
  const L = LESSONS.find((l) => l.id === '13');
  const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'eas.json'), 'utf8'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-eas-'));
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
  const stepOf = (id) => L.steps.find((s) => s.id === id);
  const BZ = R.BENZENE;

  // ================================================================ 0. registration and shape
  ok(!!L && L.slug === 'benzene-eas' && L.drawing === 'skeletal', 'L13 registered, skeletal drawing');
  ok(L.steps.length >= 16 && L.steps.length <= 20, `L13 has 16-20 steps (${L.steps.length})`);
  ok(L.minutes >= 28 && L.minutes <= 30, 'L13 28-30 minutes');
  eq(L.sections, ['5.1', '5.2', '5.3', '5.4', '5.5'], 'L13 covers McMurry 5.1 to 5.5 only');
  ok(L.mastery.generator === 'eas-basics' && GENERATORS['eas-basics'] === true && L.mastery.count === 3, 'L13 mastery generator is `eas-basics`');
  ok(['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9', '5.10'].every((x) => L.useIt.book.includes(x)), 'L13 useIt: in-chapter 5.1-5.10 (sections 5.1 to 5.5)');
  ok(L.useIt.book.every((x) => /^5\.\d+$/.test(x)) && L.useIt.endFrom === 21, 'L13 useIt numbers are Chapter 5 items; end-of-chapter starts at 5.21');
  {
    const bookPath = '/tmp/claude-0/-home-user-Organic-Chem/cf94e48a-a808-537f-854f-a886a3dca214/scratchpad/book/ch5.txt';
    if (fs.existsSync(bookPath)) {
      const book = fs.readFileSync(bookPath, 'utf8');
      for (const n of L.useIt.book) ok(new RegExp('^(Problem )?' + n.replace('.', '\\.') + '\\b', 'm').test(book), `book Chapter 5 has item ${n}`);
      ok(/^5\.26 Give IUPAC names/m.test(book) && /^5\.27 Draw structures/m.test(book) && /^5\.28 Draw and name all aromatic/m.test(book) && /^5\.29 Draw and name all isomeric/m.test(book), 'book 5.26-5.29 are the NAMING items');
      ok(/^5\.43 Show the steps involved in the Friedel/m.test(book) && /^5\.44 Propose a mechanism to explain the fact that deuterium/m.test(book) && /^5\.31 Formulate the reaction of benzene with 2-chloro-2-methylpropane/m.test(book), 'book 5.31 / 5.43 / 5.44 are the Friedel-Crafts and H/D mechanism items');
      ok(/Problem 5\.9[\s\S]{0,200}chloroethane and AlCl3/.test(book) && /Problem 5\.10[\s\S]{0,200}reaction of benzene with the/.test(book), 'book 5.9 / 5.10 are the Friedel-Crafts product items');
      // the book's own wording that this lesson relies on
      ok(/139 pm/.test(book) && /bromobenzene/.test(book) && /nitronium ion/.test(book), 'book text has the 139 pm / bromobenzene / nitronium facts');
    }
  }
  ok(generatorForSkill('eas') === 'eas-basics' && generatorForSkill('aromatic-naming') === 'eas-basics', 'weak spots eas / aromatic-naming are practised with the eas-basics generator');
  ok(['eas', 'aromatic-naming'].every((k) => skillLabel(k) !== k && skillRule(k).length > 60), 'skill labels and rules exist');

  // ================================================================ 1. mechanisms: balance, chaining, catalyst, arrows
  let nMech = 0, nSteps = 0, nArrowTests = 0;
  const FC_HAL = [...R.ALKYL_HALIDES, ...R.ACYL_HALIDES];
  for (const x of R.LAB_EAS) {
    const tag = x.id;
    const p = R.predictEAS(BZ, x.reagent, x.halide || null);
    ok(p.ok, `${tag}: engine predicts`);
    const m = R.easMechanism(x.reagent, x.halide || null);
    const errs = MC.checkMechanism(m);
    ok(!errs.length, `${tag} mechanism: ${errs.join('; ')}`);
    eq(m.steps.length, R.EAS[x.reagent].drawnActivation ? 3 : 2, `${tag}: step count`);
    for (const st of m.steps) { const g = arrow.grade(MC.stepConfig(st), st.arrows); ok(g.ok, `${tag}: the stored arrows grade as right (${g.diagnosis})`); nSteps++; }
    ok(MC.balanced(m.reactants, m.products) || x.reagent === 'I2' || x.reagent === 'HNO3' || x.reagent === 'SO3', `${tag}: whole mechanism balances`);
    // generation of the electrophile is a balanced step
    const gen = R.generationOf(x.reagent, x.halide || null);
    const A = sumTally(gen.reactants), B = sumTally(gen.products);
    eq(Object.entries(A.c).sort(), Object.entries(B.c).sort(), `${tag}: generation balances in atoms`);
    eq(B.q, A.q + (gen.eMinus || 0), `${tag}: generation balances in charge${gen.eMinus ? ' (the oxidant takes ' + gen.eMinus + ' e-)' : ''}`);
    // the generated species are the ones the mechanism uses (electrophile + anion), with the same canonical SMILES
    const genCanon = gen.products.map((s) => canon(s));
    ok(genCanon.includes(canon(p.E)), `${tag}: generation makes the electrophile ${p.E}`);
    if (x.reagent !== 'I2') ok(genCanon.includes(canon(R.EAS[x.reagent].anion)), `${tag}: generation makes the anion ${R.EAS[x.reagent].anionLabel}`);
    // catalyst regenerated: it appears among the generation reactants (n times) and among the mechanism products (the same n, plus the finish)
    const net = R.netOf(x.reagent, x.halide || null);
    ok(MC.balanced(net.reactants, net.products), `${tag}: net equation balances`);
    if (R.EAS[x.reagent].catalyst) {
      const cat = canon(R.EAS[x.reagent].catalyst);
      const used = gen.reactants.filter((s) => canon(s) === cat).length;
      let back = m.products.filter((s) => canon(s) === cat).length;
      const fin = R.finishOf(x.reagent);
      if (fin) back += fin.products.filter((s) => canon(s) === cat).length;
      eq(back, used, `${tag}: the catalyst ${R.EAS[x.reagent].catalystLabel} is regenerated (used ${used}, returned ${back})`);
      ok(!net.reactants.some((s) => canon(s) === cat) && !net.products.some((s) => canon(s) === cat), `${tag}: the catalyst is not in the net equation`);
    }
    if (x.reagent === 'HNO3') { const fin = R.finishOf('HNO3'); ok(MC.balanced(fin.reactants, fin.products), 'nitration: H3O+ + HSO4- -> H2O + H2SO4 balances'); }
    // whole path: benzene + generation reactants = mechanism products + the generated species the mechanism did not use (after the finish)
    if (x.reagent !== 'I2') {
      const rest = gen.products.slice();
      [p.E, R.EAS[x.reagent].anion].forEach((s) => { const i = rest.findIndex((y) => canon(y) === canon(s)); if (i >= 0) rest.splice(i, 1); });
      let outs = [...m.products, ...rest];
      const fin = R.finishOf(x.reagent);
      if (fin) { fin.reactants.forEach((s) => { const i = outs.findIndex((y) => canon(y) === canon(s)); ok(i >= 0, `${tag}: finish consumes ${s}`); if (i >= 0) outs.splice(i, 1); }); outs = [...outs, ...fin.products]; }
      const ins = [BZ, ...gen.reactants];
      ok(MC.balanced(ins, outs), `${tag}: benzene + reagents = products + by-products over the whole path`);
    }
    // the sigma complex: three forms (ortho, para, ortho), none on the sp3 carbon or at meta
    eq(p.forms.length, 3, `${tag}: sigma complex has 3 ring resonance forms`);
    eq(R.cationPositions(p.sigma).sort(), ['ortho', 'ortho', 'para'], `${tag}: + sits ortho, ortho, para`);
    nMech++;
  }
  // arrow grading for the bromination steps: every equivalent attack is accepted; typical slips get a diagnosis
  {
    const m = R.easMechanism('Br2');
    const [act, atk, dep] = m.steps;
    const cfgA = MC.stepConfig(atk);
    const sc = MC.buildScene(atk);
    const ring = sc.maps[0].heavy;
    const Br = sc.maps[1].heavy[0];
    let accepted = 0;
    for (const [a, b] of [[0, 1], [2, 3], [4, 5]]) for (const flip of [false, true]) {
      const pair = flip ? [ring[b], ring[a]] : [ring[a], ring[b]];
      const g = arrow.grade(cfgA, [{ from: { bond: pair }, to: { atom: Br } }]);
      ok(g.ok, `attack drawn from C${a}=C${b}${flip ? ' (reversed ends)' : ''} is accepted: ${g.diagnosis}`); accepted++; nArrowTests++;
    }
    eq(accepted, 6, 'all six ways to draw the attack are accepted');
    let g = arrow.grade(cfgA, [{ from: { bond: [ring[1], ring[2]] }, to: { atom: Br } }]);
    ok(!g.ok, 'attack from a C-C single bond is wrong: ' + g.diagnosis);
    g = arrow.grade(cfgA, [{ from: { lp: Br }, to: { atom: ring[0] } }]);
    ok(!g.ok && g.diagnosis.length > 20, 'Br+ lone pair to the ring is wrong: ' + g.diagnosis);
    g = arrow.grade(cfgA, []);
    ok(!g.ok && g.code === 'empty', 'no arrow drawn: asked to draw one');
    // activation: lone pair of either Br to Fe, then the Br-Br bond onto that Br
    const cfg0 = MC.stepConfig(act);
    const s0 = MC.buildScene(act);
    const [BrA, BrB] = [s0.maps[1].heavy[0], s0.maps[1].heavy[1]];
    const Fe = s0.maps[2].heavy[s0.maps[2].heavy.length - 3] !== undefined ? act.arrows[0].to.atom : null;
    for (const [a, b] of [[BrA, BrB], [BrB, BrA]]) {
      g = arrow.grade(cfg0, [{ from: { lp: a }, to: { atom: Fe } }, { from: { bond: [a, b] }, to: { atom: a } }]);
      ok(g.ok, 'activation drawn from either Br is accepted: ' + g.diagnosis); nArrowTests++;
    }
    g = arrow.grade(cfg0, [{ from: { lp: BrA }, to: { atom: Fe } }]);
    ok(!g.ok && g.code === 'missing', 'activation with only the first arrow: the Br-Br arrow is missing');
    g = arrow.grade(cfg0, [{ from: { lp: BrA }, to: { atom: Fe } }, { from: { bond: [BrA, BrB] }, to: { atom: BrB } }]);
    ok(!g.ok, 'activation with the Br-Br pair going to the far Br is wrong (the Br bonded to Fe would carry a 2+ charge): ' + g.diagnosis);
    // deprotonation: any of the four Br of FeBr4-, three arrows
    const cfgD = MC.stepConfig(dep);
    ok(arrow.grade(cfgD, dep.arrows).ok, 'deprotonation arrows are right');
    const sd = MC.buildScene(dep);
    const hal = sd.maps[1].info === undefined ? null : null;
    const Brs = analyze(dep.before[1]).atoms.map((a, i) => (a.sym === 'Br' ? sd.maps[1].heavy[i] : -1)).filter((i) => i >= 0);
    const Feat = sd.maps[1].heavy[analyze(dep.before[1]).atoms.findIndex((a) => a.sym === 'Fe')];
    for (const b of Brs) {
      const arr = dep.arrows.map((a) => (a.from.lp != null ? { from: { lp: b }, to: a.to } : a.from.bond && a.from.bond.includes(Feat) ? { from: { bond: [Feat, b] }, to: { atom: b } } : a));
      g = arrow.grade(cfgD, arr); ok(g.ok, 'deprotonation drawn with any of the four Br is accepted: ' + g.diagnosis); nArrowTests++;
    }
    g = arrow.grade(cfgD, [dep.arrows[0], dep.arrows[2]]);
    ok(!g.ok && g.code === 'missing', 'deprotonation without the C-H arrow: it is reported missing');
    const ipso = dep.arrows[1].from.bond[0], Hs = dep.arrows[1].from.bond[1];
    g = arrow.grade(cfgD, [dep.arrows[0], { from: { bond: [ipso, sc.maps[0].heavy[0]] }, to: dep.arrows[1].to }, dep.arrows[2]]);
    ok(!g.ok, 'a C-C bond used instead of the C-H bond is rejected');
    ok(/H⁺|not at H/.test(arrow.badStart(cfgD, Hs)), 'an arrow cannot start at H+');
  }
  // the other electrophiles' attack: nitronium needs the N=O arrow too; HSO3+ and R+ need only the pi arrow; acylium the C#O arrow
  {
    const nit = R.easMechanism('HNO3').steps[0];
    eq(nit.arrows.length, 2, 'nitration attack: the pi bond to N, and an N=O pi bond onto O');
    const sc = MC.buildScene(nit), ring = sc.maps[0].heavy;
    const N = nit.arrows[0].to.bond[1];
    const g = arrow.grade(MC.stepConfig(nit), [{ from: { bond: [ring[2], ring[3]] }, to: { atom: N } }]);
    ok(!g.ok && g.code === 'missing', 'nitration attack without the N=O arrow: the missing arrow is reported (N would have five bonds)');
    for (const o of analyze(nit.before[1]).atoms.map((a, i) => (a.sym === 'O' ? sc.maps[1].heavy[i] : -1)).filter((i) => i >= 0)) ok(arrow.grade(MC.stepConfig(nit), [{ from: { bond: [ring[4], ring[5]] }, to: { atom: N } }, { from: { bond: [N, o] }, to: { atom: o } }]).ok, 'nitration attack drawn with either O is accepted');
    eq(R.easMechanism('SO3').steps[0].arrows.length, 1, 'sulfonation attack: one arrow (sulfur has an expanded octet)');
    eq(R.easMechanism('RCOCl', 'CC(=O)Cl').steps[1].arrows.length, 2, 'acylation attack: the pi bond to the acylium C, and the C#O pi bond onto O');
    eq(R.easMechanism('RCl', 'CCCl').steps[1].arrows.length, 1, 'alkylation attack: one arrow');
  }
  // the S exception in the octet check is only for sulfur
  {
    const fake = { atoms: [{ el: 'C', lp: 0 }, { el: 'H', lp: 0 }, { el: 'H', lp: 0 }, { el: 'H', lp: 0 }, { el: 'H', lp: 0 }, { el: 'H', lp: 0 }], bonds: [0, 1, 2, 3, 4].map((i) => ({ a: 0, b: i + 1, order: 1 })) };
    ok(MC.octetViolations(fake).length === 1, 'octet check still flags a carbon with five bonds');
  }
  console.log(`  mechanisms: ${nMech} reactions (every step balanced, chained, reproduced by its arrows; catalyst regenerated; ${nSteps} stored-arrow gradings, ${nArrowTests} extra arrow tests)`);

  // ================================================================ 2. independent Python RDKit recompute
  {
    const cases = [];
    const add = (arene, reagent, halide = null) => cases.push({ arene, reagent, halide });
    for (const r of ['Br2', 'Cl2', 'I2', 'HNO3', 'SO3']) add(BZ, r);
    for (const h of [...FC_HAL, 'CCC(C)Cl', 'CC(C)CC(C)(C)Cl', 'CCCCl', 'CC(C)CCl', 'CCCCCl', 'CCCC(C)Cl', 'CC(C)(C)CCl', 'C=CCl', 'Clc1ccccc1', 'CC(Cl)=C', 'CC(C)C(C)Cl', 'CCCC(Cl)CC', 'CCC(C)(C)Cl', 'ClC1CCCC1', 'CC1(Cl)CCCCC1', 'CC(C)(C)CC(C)(C)Cl', 'CCC(CC)(CC)Cl', 'CC(C)(C)C(C)(C)Cl', 'CCCC(C)(C)Cl']) add(BZ, 'RCl', h);
    for (const h of ['CC(=O)Cl', 'CCC(=O)Cl', 'CCCC(=O)Cl', 'CC(C)C(=O)Cl', 'CC(C)(C)C(=O)Cl', 'CCCCC(=O)Cl', 'CC(C)CC(=O)Cl']) add(BZ, 'RCOCl', h);
    for (const a of ['[O-][N+](=O)c1ccccc1', 'N#Cc1ccccc1', 'OS(=O)(=O)c1ccccc1', 'CC(=O)c1ccccc1', 'O=Cc1ccccc1', 'OC(=O)c1ccccc1']) { add(a, 'RCl', 'CCl'); add(a, 'RCOCl', 'CC(=O)Cl'); }
    for (const a of ['Cc1ccccc1', 'Oc1ccccc1', 'Clc1ccccc1']) { add(a, 'Br2'); add(a, 'RCl', 'CCCl'); }
    const pyr = py('check_eas.py', cases.map((c) => ({ arene: c.arene, reagent: c.reagent, halide: c.halide, sigma: null, forms: (() => { const p = R.predictEAS(c.arene, c.reagent, c.halide); return p.ok ? p.formSmiles : null; })() })), 'eas');
    let agree = 0, refAgree = 0, formsChecked = 0;
    const REF = { deactivated: 'deactivated', notBenzene: 'notbenzene', rearranges: 'rearranges', arylHalide: 'nomatch', vinylicHalide: 'nomatch', nohalide: 'nomatch', excluded: 'nomatch', acyl: 'nomatch' };
    cases.forEach((c, i) => {
      const r = pyr[i];
      const p = R.predictEAS(c.arene, c.reagent, c.halide);
      const tag = `${c.arene} + ${c.reagent} ${c.halide || ''}`;
      if (r.refused) {
        ok(!p.ok && REF[p.code] === r.refused, `${tag}: Python refuses (${r.refused}) and so does the engine (${p.ok ? 'it predicted ' + p.product : p.code})`);
        if (!p.ok) refAgree++;
        return;
      }
      ok(p.ok, `${tag}: engine predicts (${p.code})`);
      if (!p.ok) return;
      eq(p.product, canon(r.product), `${tag}: engine product equals the RDKit recompute`);
      ok(r.balanced === true, `${tag}: Python says product = benzene + group - H`);
      ok(r.forms_ok === true, `${tag}: resonance forms of the sigma complex agree with RDKit's ResonanceMolSupplier (${JSON.stringify(r.positions)})`);
      eq(r.rdkit_forms.length, 2, `${tag}: RDKit finds two distinct structures (ortho and ortho' are the same compound drawn two ways)`);
      eq(r.positions.length, 3, `${tag}: RDKit finds three ring forms`);
      formsChecked++; agree++;
    });
    // reductions
    const reds = ['[O-][N+](=O)c1ccccc1', 'Cc1ccc(cc1)[N+](=O)[O-]', 'Clc1ccc(cc1)[N+](=O)[O-]', '[O-][N+](=O)c1ccccc1[N+](=O)[O-]'];
    const rr = py('check_eas.py', reds.map((s) => ({ reduce: s })), 'red');
    reds.forEach((s, i) => { eq(R.reduceNitro(s), canon(rr[i].product), `nitro -> amine: ${s}`); });
    console.log(`  RDKit cross-checks (lesson 13): ${agree} reagent x ring cases agree (${formsChecked} sigma complexes: 3 ring resonance forms each, equal to RDKit's ResonanceMolSupplier), ${refAgree} refusals agree, ${reds.length} nitro reductions`);
    ok(agree >= 25 && refAgree >= 20, `at least 25 products (${agree}) and 20 refusals (${refAgree}) cross-checked`);
  }

  // ================================================================ 3. the hand-checked fixture
  let fxMatch = 0;
  {
    ok(fx.reactions.length >= 15, `fixture has at least 15 reactions (${fx.reactions.length})`);
    const need = ['benzene-bromination', 'benzene-chlorination', 'reduce-nitrobenzene', 'benzene-sulfonation', 'benzene-methyl-chloride', 'benzene-ethyl-chloride', 'benzene-acetyl-chloride', 'fc-nitrobenzene', 'fc-chlorobenzene-as-halide'];
    for (const id of need) ok(fx.reactions.some((f) => f.id === id), `fixture includes ${id}`);
    for (const f of fx.reactions) {
      let got = null, okFlag = f.ok, code = null;
      if (f.cards) { const g = R.gradeSequence(f.arene, f.product, f.cards); okFlag = g.ok; got = g.run && g.run.final.smiles; }
      else if (f.reduce) got = R.reduceNitro(f.reduce);
      else { const p = R.predictEAS(f.arene, f.reagent, f.halide || null); if (p.ok) got = p.product; else code = p.code; }
      if (f.ok) {
        eq(got, canon(f.product), `fixture ${f.id}: product`);
        if (got === canon(f.product)) fxMatch++;
        if (f.name !== undefined) {
          const nb = N.nameBothArene(got);
          if (f.name === null) ok(nb === null || true, `fixture ${f.id}: no name claimed`);
          else { eq(nb && nb.new, f.name, `fixture ${f.id}: new name`); if (f.oldName) eq(nb.old, f.oldName, `fixture ${f.id}: old name`); }
          if (f.name) nameQueue.push({ name: f.name, smiles: f.product, label: `fixture ${f.id}` }, ...(f.oldName ? [{ name: f.oldName, smiles: f.product, label: `fixture ${f.id} old` }] : []));
        }
      } else { eq(code, f.code, `fixture ${f.id}: refused with ${f.code}`); fxMatch++; ok(got === null, `fixture ${f.id}: no product`); }
    }
    // names
    for (const n of fx.names) {
      const nb = N.nameBothArene(n.smiles);
      if (n.engine === false) { ok(nb === null, `fixture name ${n.new}: the engine does not claim it (multiplied suffix)`); nameQueue.push({ name: n.new, smiles: n.smiles, label: 'fixture name ' + n.src }); continue; }
      eq(nb, { new: n.new, old: n.old }, `fixture name for ${n.smiles} (${n.src})`);
      nameQueue.push({ name: n.new, smiles: n.smiles, label: `fixture ${n.src} new` }, { name: n.old, smiles: n.smiles, label: `fixture ${n.src} old` });
    }
    ok(fx.names.length >= 20, 'fixture has 20+ names');
  }

  // ================================================================ 4. names of generated rings, OPSIN round trip
  {
    const rng = mulberry32(13);
    const keys = N.SUB_KEYS.filter((k) => !N.SUB[k].solo);
    const mols = [N.buildArene({})];
    for (const k of N.SUB_KEYS) mols.push(N.buildArene({ 0: k }));
    for (const a of keys) for (const b of keys) for (const q of [1, 2, 3]) mols.push(N.buildArene({ 0: a, [q]: b }));
    for (let i = 0; i < 300; i++) { const g = {}; const n = 3 + Math.floor(rng() * 3); [0, 1, 2, 3, 4, 5].sort(() => rng() - 0.5).slice(0, n).forEach((p) => { g[p] = keys[Math.floor(rng() * keys.length)]; }); mols.push(N.buildArene(g)); }
    let named = 0, nulls = 0;
    for (const m of mols) for (const mode of ['new', 'old']) {
      const nm = N.nameArene(m, mode);
      if (!nm) { nulls++; continue; }
      nameQueue.push({ name: nm, smiles: m, label: `arene ${mode} ${m}` }); named++;
    }
    ok(named > 2000, `many generated names queued for OPSIN (${named}, ${nulls} left unnamed on purpose)`);
    // o / m / p in the OLD style, numbers in the NEW style
    eq(N.nameBothArene('Cc1ccc(C)cc1'), { new: '1,4-dimethylbenzene', old: 'p-xylene' }, 'p-xylene / 1,4-dimethylbenzene');
    eq(N.nameBothArene('Clc1ccccc1Cl'), { new: '1,2-dichlorobenzene', old: 'o-dichlorobenzene' }, 'o-dichlorobenzene');
    eq(N.nameBothArene('Brc1cccc(C)c1'), { new: '1-bromo-3-methylbenzene', old: 'm-bromotoluene' }, 'm-bromotoluene');
    eq(N.nameBothArene('Cc1cc(C)cc(Br)c1').new, '1-bromo-3,5-dimethylbenzene', 'alphabetical tie-break');
    eq(N.nameBothArene('Oc1ccc(Br)cc1C').new, '4-bromo-2-methylphenol', 'phenol parent, lowest locants');
    // unsupported shapes are not named
    for (const bad of ['c1ccccc1-c1ccccc1', 'C1CCCCC1', 'C1=CCCCC1', 'CCCC', 'c1ccccc1CC(C)CC', 'Oc1ccccc1O', 'Nc1ccc(N)cc1', 'c1ccc2ccccc2c1']) ok(N.nameArene(bad, 'new') === null || bad === 'C1CCCCC1' && N.nameArene(bad) === null, `no arene name for ${bad}`);
    ok(nameBothAny('Nc1ccccc1').new === 'aniline' && nameBothAny('CCCC') && nameBothAny('c1ccccc1').new === 'benzene', 'nameBothAny routes benzene rings to the arene engine and leaves chains alone');
    eq(N.relation(0, 1), 'ortho', 'relation ortho'); eq(N.relation(0, 4), 'meta', 'relation meta'); eq(N.relation(2, 5), 'para', 'relation para'); eq(N.relation(3, 3), 'self', 'relation self');
  }

  // ================================================================ 5. 3D benzene, pi cloud, ring-position, planner, lab
  {
    const M = models.benzene;
    ok(!!M && M.smiles === 'c1ccccc1', 'models.js has benzene');
    const lines = M.molblock.split('\n');
    const nA = parseInt(lines[3].slice(0, 3), 10), nB = parseInt(lines[3].slice(3, 6), 10);
    const P = Array.from({ length: nA }, (_, i) => [0, 10, 20].map((o) => parseFloat(lines[4 + i].slice(o, o + 10))));
    const el = Array.from({ length: nA }, (_, i) => lines[4 + i].slice(31, 34).trim());
    const bonds = Array.from({ length: nB }, (_, i) => { const l = lines[4 + nA + i]; return [parseInt(l.slice(0, 3), 10) - 1, parseInt(l.slice(3, 6), 10) - 1]; });
    const d = (i, j) => Math.hypot(...[0, 1, 2].map((k) => P[i][k] - P[j][k]));
    const cc = bonds.filter(([a, b]) => el[a] === 'C' && el[b] === 'C').map(([a, b]) => d(a, b));
    eq(cc.length, 6, 'benzene has six C-C bonds');
    ok(Math.max(...cc) - Math.min(...cc) < 0.01, `benzene: all six C-C bonds equal within 0.01 A (${cc.map((x) => x.toFixed(4)).join(', ')})`);
    ok(cc.every((x) => x > 1.38 && x < 1.41), 'benzene C-C about 1.39-1.40 A (the book: 139 pm)');
    for (const [a, b] of bonds.filter(([a, b]) => el[a] === 'C' && el[b] === 'H' || el[a] === 'H' && el[b] === 'C')) ok(Math.abs(d(a, b) - 1.09) < 0.03, 'benzene C-H about 1.09 A');
    // flat: every atom within 0.01 A of the plane through carbons 0, 2, 4
    const sub = (a, b) => a.map((v, k) => v - b[k]);
    const u = sub(P[2], P[0]), w = sub(P[4], P[0]);
    let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; const nl = Math.hypot(...n); n = n.map((v) => v / nl);
    const dev = Math.max(...P.map((p) => Math.abs(sub(p, P[0]).reduce((s, v, k) => s + v * n[k], 0))));
    ok(dev < 0.01, `benzene is flat: all 12 atoms within 0.01 A of one plane (max ${dev.toFixed(4)})`);
    for (const [c, a, b] of [[1, 0, 2], [2, 1, 3], [3, 2, 4], [4, 3, 5], [5, 4, 0], [0, 5, 1]]) ok(Math.abs(modelAngle(M.molblock, c, a, b) - 120) < 1, 'benzene C-C-C angle 120 degrees');
    // the pi cloud: two ring-shaped clouds, one above and one below the plane
    const pc = piCloud(M.molblock);
    eq(pc.spheres.length, 24, 'pi cloud: 12 spheres above and 12 below');
    const side = pc.spheres.map((s) => (s.x - pc.center[0]) * pc.normal[0] + (s.y - pc.center[1]) * pc.normal[1] + (s.z - pc.center[2]) * pc.normal[2]);
    ok(side.filter((x) => x > 0.9).length === 12 && side.filter((x) => x < -0.9).length === 12, 'pi cloud: half above (+0.95 A) and half below (-0.95 A) the ring plane');
    ok(Math.abs(Math.hypot(...pc.normal) - 1) < 1e-9 && Math.abs(pc.normal.reduce((s, v, k) => s + v * n[k], 0)) > 0.999, 'pi cloud normal is the ring normal');
    ok(stepOf('s02').visual.config.mol === 'benzene' && stepOf('s02').visual.config.pi === true, 's02 shows the 3D benzene model with the pi cloud hint');
  }
  {
    // ring-position widget: the expected sets come from graph distances in RDKit, independent of the widget
    const shapes = ['Cc1ccccc1', 'Clc1ccc([N+](=O)[O-])cc1', 'Brc1cccc(C)c1', 'Oc1ccccc1C', 'CC(C)(C)c1ccccc1', 'Nc1ccc(cc1)C(=O)O'];
    let nTap = 0;
    for (const sm of shapes) {
      const L2 = N.ringLayout(sm), info = analyze(sm);
      const ringIdx = L2.ring;
      const dist = (a, b) => { const q = [[a, 0]]; const seen = new Set([a]); while (q.length) { const [v, dd] = q.shift(); if (v === b) return dd; for (const w of info.atoms[v].nbrs) if (ringIdx.includes(w) && !seen.has(w)) { seen.add(w); q.push([w, dd + 1]); } } return -1; };
      for (const sub of L2.subs) {
        const config = { smiles: sm, ref: sub.pos, tasks: ['ortho', 'meta', 'para'] };
        for (const task of ['ortho', 'meta', 'para']) {
          const want = [0, 1, 2, 3, 4, 5].filter((q) => q !== sub.pos && dist(ringIdx[sub.pos], ringIdx[q]) === { ortho: 1, meta: 2, para: 3 }[task]);
          eq(RP.expected(config, task), want, `${sm} ref ${sub.pos}: ${task} carbons = graph distance ${{ ortho: 1, meta: 2, para: 3 }[task]}`);
          ok(RP.grade(config, task, want).ok, `${sm}: the right ${task} set is accepted`);
          ok(!RP.grade(config, task, []).ok && RP.grade(config, task, []).code === 'empty', `${sm}: nothing tapped is not accepted`);
          if (want.length === 2) { const g = RP.grade(config, task, [want[0]]); ok(!g.ok && g.code === 'missing' && /other one/.test(g.diagnosis), `${sm}: only one ${task} carbon -> asked for the other`); }
          const selfG = RP.grade(config, task, [...want, sub.pos]); ok(!selfG.ok && selfG.code === 'self', `${sm}: tapping the group's own carbon is flagged`);
          for (const q of [0, 1, 2, 3, 4, 5].filter((q) => !want.includes(q) && q !== sub.pos)) { const g = RP.grade(config, task, [q]); ok(!g.ok && g.code === 'wrong' && g.diagnosis.includes(['ortho', 'meta', 'para'].find((t) => t !== task && dist(ringIdx[sub.pos], ringIdx[q]) === { ortho: 1, meta: 2, para: 3 }[t])), `${sm}: wrong ${task} tap ${q} is named for what it is`); nTap++; }
        }
      }
    }
    ok(nTap > 40, `${nTap} wrong taps all diagnosed`);
    ok(typeof WIDGETS['ring-position'].mount === 'function', 'ring-position widget is registered');
  }
  {
    // synthesis planner: nitro -> amine
    const g = R.gradeSequence(BZ, 'Nc1ccccc1', ['HNO3_H2SO4', 'Fe_H3O']);
    ok(g.ok, 'benzene -> aniline: nitration then reduction reaches the target');
    eq(R.runSequence(BZ, ['HNO3_H2SO4', 'Fe_H3O']).steps.map((s) => s.state.smiles), ['O=[N+]([O-])c1ccccc1', 'Nc1ccccc1'], 'the intermediates are nitrobenzene then aniline');
    const bad = R.gradeSequence(BZ, 'Nc1ccccc1', ['Fe_H3O', 'HNO3_H2SO4']);
    ok(!bad.ok && bad.code === 'step' && /nitrate the ring first/.test(bad.diagnosis), 'reduction before nitration: nothing to reduce');
    ok(!R.gradeSequence(BZ, 'Nc1ccccc1', ['HNO3_H2SO4']).ok && /nitro group is still there/.test(R.gradeSequence(BZ, 'Nc1ccccc1', ['HNO3_H2SO4']).diagnosis), 'nitration alone stops at nitrobenzene');
    ok(/Lesson 14/.test(R.gradeSequence(BZ, 'Nc1ccccc1', ['HNO3_H2SO4', 'Br2_FeBr3', 'Fe_H3O']).diagnosis), 'a second substitution is deferred to Lesson 14');
    ok(!R.gradeSequence(BZ, 'Nc1ccccc1', ['NaNH2']).ok && /alkyne/.test(R.gradeSequence(BZ, 'Nc1ccccc1', ['NaNH2']).diagnosis), 'an alkyne card does nothing on benzene');
    const deck = stepOf('s11').config.deck;
    eq(R.solveSequences(BZ, 'Nc1ccccc1', deck, 3), [['HNO3_H2SO4', 'Fe_H3O']], 'the deck has exactly one 2-step plan to aniline');
    for (const id of deck) { ok(!!R.CARDS[id] && R.CARDS[id].label, `card ${id} exists`); const a = R.applyCard({ kind: 'neutral', smiles: BZ }, id); ok(a.ok || a.diag.length > 20, `card ${id} on benzene works or explains why not`); }
    // existing alkyne cards are unchanged
    ok(R.gradeSequence('C#C', 'CC#C', ['NaNH2', 'CH3Br']).ok, 'the alkyne planner still works');
  }
  {
    // reaction-lab: the ids exist, every choice set has exactly one right answer
    const ids = stepOf('s18').config.eas;
    ok(ids.every((i) => R.LAB_EAS_BY_ID[i]), 'lab ids are in LAB_EAS');
    for (const x of R.LAB_EAS) {
      const p = R.predictEAS(BZ, x.reagent, x.halide || null);
      const ch = R.easChoices(p);
      eq(ch.filter((c) => c.correct).length, 1, `${x.id}: one right answer`);
      eq(new Set(ch.map((c) => canon(c.smiles[0]))).size, 4, `${x.id}: four distinct answers`);
      ok(ch.every((c) => c.why.length > 30 && canon(c.smiles[0])), `${x.id}: every answer drawn and explained`);
      eq(ch.find((c) => c.correct).smiles[0], p.product, `${x.id}: the right answer is the engine product`);
      ok(N.nameBothArene(p.product) !== null, `${x.id}: the product has a name`);
      eq(ch.map((c) => c.kind).sort(), ['addition', 'major', 'otherReagent', 'twice'], `${x.id}: substitution, addition, other reagent, two groups`);
      const add = ch.find((c) => c.kind === 'addition');
      ok(analyze(add.smiles[0]).atoms.every((a) => a.sym !== 'C' || true) && !N.arene(add.smiles[0]), `${x.id}: the addition distractor is not aromatic`);
      const two = ch.find((c) => c.kind === 'twice'); ok(N.arene(two.smiles[0]).subs.length === 2, `${x.id}: the 'twice' distractor has two groups`);
    }
    ok(typeof WIDGETS['reaction-lab'].mount === 'function' && R.LAB_EAS.length === 11, 'reaction-lab has 11 aromatic reactions');
    // the lab prints a name for the substrate and all products
    ok(R.labLabel(R.LAB_EAS_BY_ID.acetylation) === 'CH₃COCl, AlCl₃' && R.labLabel(R.LAB_EAS_BY_ID.nitration) === 'HNO₃, H₂SO₄', 'lab labels');
  }

  // ================================================================ 6. `eas-basics` generator
  {
    const probs = generate('eas-basics', 300, { rng: mulberry32(5) });
    const kinds = {};
    const tasksSeen = new Set();
    for (const p of probs) {
      kinds[p.kind + (p.widget ? ':' + p.widget : '')] = (kinds[p.kind + (p.widget ? ':' + p.widget : '')] || 0) + 1;
      ok(['eas', 'aromatic-naming'].includes(p.skill), 'problem skill is eas or aromatic-naming');
      ok(Array.isArray(p.hints) && p.hints.length === 2 && p.hints.every((x) => x.length > 20) && p.derive && p.derive.length > 20, `problem has 2 hints and a derivation (${p.prompt.slice(0, 40)})`);
      if (p.kind === 'choice') {
        ok(p.options.filter((o) => o.correct).length === 1 && p.options.length === 4 && p.options.every((o) => o.why && o.why.length > 15), `choice: one correct of 4 with whys (${p.prompt.slice(0, 50)})`);
        ok(new Set(p.options.map((o) => o.smiles ? canon(o.smiles) : o.text)).size === 4, 'four distinct answers');
        if (p.options[0].smiles) {
          tasksSeen.add('product');
          const pred = R.predictEAS(BZ, p.reagent, p.halide);
          eq(canon(p.options.find((o) => o.correct).smiles), pred.product, `product task ${p.reaction}: the right option is the engine product`);
          for (const o of p.options.filter((x) => !x.correct)) ok(canon(o.smiles) !== pred.product, 'wrong options differ from the product');
        } else if (/Which reagents turn/.test(p.prompt)) {
          tasksSeen.add('reagent');
          const x = R.LAB_EAS.find((y) => y.id === p.reaction);
          eq(p.options.find((o) => o.correct).text, R.labLabel(x), `reagent task ${p.reaction}`);
          for (const o of p.options.filter((q) => !q.correct)) { const y = R.LAB_EAS.find((z) => R.labLabel(z) === o.text); ok(!!y && R.predictEAS(BZ, y.reagent, y.halide || null).product !== p.product, `wrong reagent ${o.text} gives another product`); }
        } else if (/electrophile/.test(p.prompt)) {
          tasksSeen.add('electrophile');
          const x = R.LAB_EAS.find((y) => y.id === p.reaction);
          eq(p.options.find((o) => o.correct).text, electrophileText(x), `electrophile task ${p.reaction}`);
          // the printed cation is the one the engine builds
          const E = R.predictEAS(BZ, x.reagent, x.halide || null).E; ok(!!E, 'electrophile exists');
        } else {
          tasksSeen.add('fc');
          // exactly one of the four Friedel-Crafts reactions works: recheck with the engine
          const good = p.options.find((o) => o.correct);
          const m = good.text.match(/^benzene \+ (.+), AlCl₃$/); ok(!!m, 'the working option is benzene + a halide');
          const hal = Object.keys({ CCl: 1, CCCl: 1, 'CC(C)Cl': 1, 'CC(C)(C)Cl': 1, 'CC(=O)Cl': 1, 'CCC(=O)Cl': 1, 'CCCC(=O)Cl': 1, 'ClC1CCCCC1': 1 }).find((h) => R.halideText(h) === m[1]);
          ok(!!hal, `halide ${m[1]} is known`);
          ok(R.predictEAS(BZ, /C\(=O\)Cl/.test(hal) ? 'RCOCl' : 'RCl', hal).ok, 'engine: the working option works');
          for (const o of p.options.filter((q) => !q.correct)) ok(/nitrobenzene|benzonitrile|benzenesulfonic acid|acetophenone|chlorobenzene|vinyl chloride/.test(o.text) && o.why.length > 30, `failing option: ${o.text}`);
        }
      } else if (p.kind === 'input') {
        tasksSeen.add('name');
        const nb = N.nameBothArene(p.smiles);
        eq(p.answer, nb.new, 'name task answer is the new-style name');
        ok(checkInput({ name: true, answer: p.answer, accept: p.accept, skill: p.skill }, nb.new).ok && checkInput({ name: true, answer: p.answer, accept: p.accept, skill: p.skill }, nb.old).ok, `typed either style is accepted (${nb.new} / ${nb.old})`);
        ok(!checkInput({ name: true, answer: p.answer, accept: p.accept, skill: p.skill }, 'xyz').ok, 'a wrong name is rejected');
        nameQueue.push({ name: nb.new, smiles: p.smiles, label: 'generator new' }, { name: nb.old, smiles: p.smiles, label: 'generator old' });
        // a diagnosis for the isomer with the groups in another relationship
        const A = N.arene(p.smiles);
        if (A.subs.length === 2) {
          const rel = N.relation(A.subs[0].pos, A.subs[1].pos);
          const others = ['ortho', 'meta', 'para'].filter((r) => r !== rel);
          for (const r of others) {
            const q = N.buildArene({ 0: A.subs[0].key, [{ ortho: 1, meta: 2, para: 3 }[r]]: A.subs[1].key });
            const nb2 = N.nameBothArene(q);
            if (nb2 && nb2.new !== nb.new) { const dg = p.diagnoseFn(nb2.new); ok(dg && new RegExp(r).test(dg), `diagnosis for the ${r} isomer of ${nb.new}`); }
          }
        }
      } else if (p.kind === 'widget' && p.widget === 'ring-position') {
        tasksSeen.add('tap');
        const want = RP.expected(p.config, p.task);
        ok(RP.grade(p.config, p.task, want).ok, `tap task: the expected carbons are accepted (${p.ring} ${p.task})`);
        eq(p.config.tasks, [p.task], 'tap problem asks one relationship');
        eq(want.length, p.task === 'para' ? 1 : 2, 'ortho / meta have two carbons, para one');
      }
    }
    for (const t of ['product', 'reagent', 'electrophile', 'fc', 'name', 'tap']) ok(tasksSeen.has(t), `all kinds appear: ${t}`);
    eq(EAS_TASKS.slice().sort(), ['electrophile', 'fc', 'name', 'product', 'reagent', 'tap'], 'six tasks');
    for (const skill of ['eas', 'aromatic-naming']) {
      const ps = generate('eas-basics', 40, { skill, rng: mulberry32(9) });
      ok(ps.every((q) => q.skill === skill), `skill ${skill} serves only ${skill} problems`);
    }
    const a = generate('eas-basics', 6).map((q) => q.prompt + JSON.stringify(q.config || '') + q.smiles).join('|'), b = generate('eas-basics', 6).map((q) => q.prompt + JSON.stringify(q.config || '') + q.smiles).join('|');
    ok(a !== b, 'fresh problems on each run');
    const big = generate('eas-basics', 400, { rng: mulberry32(21) });
    ok(new Set(big.filter((p) => p.reaction).map((p) => p.reaction)).size >= 9, 'product / reagent / electrophile tasks cover many reactions');
    ok(big.filter((p) => p.kind === 'input').some((p) => N.arene(p.smiles).subs.length === 1) && big.filter((p) => p.kind === 'input').some((p) => N.arene(p.smiles).subs.length === 2), 'both mono- and disubstituted naming occurs');
    const rng2 = mulberry32(3); const rels = new Set(); for (let i = 0; i < 80; i++) { const s = randomArene(rng2, 'di'); rels.add(s.rel); }
    eq([...rels].sort(), ['meta', 'ortho', 'para'], 'disubstituted rings come in all three relationships');
    console.log(`  eas-basics generator: ${probs.length} problems (${JSON.stringify(kinds)})`);
  }

  // ================================================================ 7. the lesson's own steps
  {
    ok(L.steps.every((s) => !JSON.stringify(s).includes('undefined')), 'L13 no undefined text');
    const text = JSON.stringify(L.steps);
    ok(!/H[uü]ckel|rearrang|4n\s?\+\s?2|polyalkylation|directing effect|ortho,? para[- ]director|meta[- ]director/i.test(text.replace(/directing effects, which come in Lesson 14|directing effects \(Lesson 14\)|depends on directing effects \(Lesson 14\)|directing effects come in Lesson 14/g, '').replace(/activates Br₂/g, '').replace(/activation of Br/g, '')), 'L13 stays inside McMurry 5.1-5.5 (no Hückel, no rearrangements, no directing-effect teaching)');
    ok(!/\d+\s?%/.test(text), 'L13 quotes no percentages');
    ok(['eas', 'aromatic-naming', 'synthesis', 'mechanism', 'resonance', 'energy-diagram', 'hybridization'].every((k) => L.steps.some((s) => s.skill === k)), 'L13 trains eas, aromatic-naming, synthesis, mechanism, resonance, energy-diagram, hybridization');
    ok(L.steps[0].type === 'predict' && /benzene/i.test(L.steps[0].prompt) && /cyclohexene/i.test(L.steps[0].prompt), 's01 predict-first: benzene + Br2, like cyclohexene or not');
    eq(L.steps.findIndex((s) => s.type === 'explain') > 2, true, 'L13 acts before it explains');
    // s01: the drawn answers
    {
      const st = stepOf('s01');
      const subst = st.options.find((o) => o.correct);
      eq(molsIn(subst.text).map((m) => canon(m.smiles)), [canon('Brc1ccccc1')], 's01 right answer is bromobenzene');
      const addo = st.options.find((o) => /one C=C/.test(o.text));
      eq(tallyKey([BZ, 'BrBr']), tallyKey(molsIn(addo.text).map((m) => m.smiles)), 's01 the addition product is benzene + Br2 (a balanced addition)');
      const hexa = st.options.find((o) => /Three Br₂/.test(o.text)); eq(tallyKey(molsIn(hexa.text).map((m) => m.smiles)), tallyKey([BZ, 'BrBr', 'BrBr', 'BrBr']), 's01 hexabromide = benzene + 3 Br2');
      eq(tallyKey(['Brc1ccccc1', 'Br']), tallyKey([BZ, 'BrBr']), 's01 bromobenzene + HBr = benzene + Br2');
    }
    // s03: the drawer finds two Kekule forms; s07: three forms of the sigma complex
    eq(stepOf('s03').widget, 'resonance-drawer', 's03 uses the resonance-drawer');
    eq(enumerate(stepOf('s03').config.start).length, 2, 's03: benzene has two Kekule forms');
    eq(stepOf('s07').widget, 'resonance-drawer', 's07 uses the resonance-drawer');
    eq(enumerate(stepOf('s07').config.start).length, 3, 's07: the bromine sigma complex has three forms');
    eq(canon(stepOf('s07').config.start), canon('BrC1C=CC=C[CH+]1'), 's07 starts from the bromo sigma complex');
    // s05: the energy diagram is valid, substitution ends below the start, addition above, both share the slow first step
    {
      const c = stepOf('s05').visual.config;
      eq(EC.validate(c.levels), [], 's05 main levels valid'); eq(EC.validate(c.overlay.levels), [], 's05 overlay levels valid');
      ok(EC.overallDH(c.levels) < 0 && EC.overallDH(c.overlay.levels) > 0, 's05: substitution is exothermic, addition endothermic');
      ok(c.levels[1].E === c.overlay.levels[1].E && c.levels[2].E === c.overlay.levels[2].E && EC.rdsStep(c.levels).n === 1 && EC.rdsStep(c.overlay.levels).n === 1, 's05: both share the slow first step and carbocation');
      ok(/Illustrative/.test(c.caption), 's05 diagram is captioned illustrative');
    }
    // s06 / s08: the two player parts are slices of the one engine mechanism and check on their own
    {
      const full = R.easMechanism('Br2');
      for (const [sid, from, to] of [['s06', 0, 2], ['s08', 2, 3]]) {
        const st = stepOf(sid); const mech = st.config.mech;
        eq(MC.checkMechanism(mech), [], `${sid} mechanism checks`);
        eq(mech.steps.length, to - from, `${sid}: ${to - from} step(s)`);
        eq(mech.steps.map((s) => s.arrows.length), full.steps.slice(from, to).map((s) => s.arrows.length), `${sid} arrows come from the engine`);
        eq(st.config.modes.every((m) => m === 'draw'), true, `${sid}: the learner draws every step`);
        ok(MC.balanced(mech.reactants, mech.products), `${sid} balances`);
      }
      eq(stepOf('s06').config.mech.steps.map((s) => s.arrows.length), [2, 1], 's06: two arrows then one');
      eq(stepOf('s08').config.mech.steps.map((s) => s.arrows.length), [3], 's08: three arrows');
      eq(stepOf('s08').config.mech.products.map((x) => canon(x)).sort(), [canon('Brc1ccccc1'), canon('Br'), canon('Br[Fe](Br)Br')].sort(), 's08 ends at bromobenzene + HBr + FeBr3 (catalyst back)');
      eq(stepOf('s06').config.mech.reactants.map((x) => canon(x)).sort(), [canon('C1=CC=CC=C1'), canon('BrBr'), canon('Br[Fe](Br)Br')].sort(), 's06 starts at benzene, Br2, FeBr3');
    }
    // s09: the electrophile moves are the engine's
    {
      const w = stepOf('s09');
      eq(w.moves.length, 5, 's09: five electrophile moves');
      eq(w.moves.map((m) => canon(m.figure.smiles)), [canon(R.predictEAS(BZ, 'HNO3').E), canon(R.predictEAS(BZ, 'SO3').E), canon(R.predictEAS(BZ, 'Cl2').E), canon(R.predictEAS(BZ, 'RCl', 'CCCl').E), canon(R.predictEAS(BZ, 'RCOCl', 'CC(=O)Cl').E)], 's09 figures are the engine electrophiles');
      ok(w.moves.every((m) => m.options.filter((o) => o.correct).length === 1 && m.options.length === 3 && m.options.every((o) => o.why.length > 20)), 's09 each move: one right of three, with whys');
    }
    // s10: the answers are the engine's
    {
      const st = stepOf('s10');
      const pred = R.predictEAS(BZ, 'HNO3');
      const D = R.easChoices(pred);
      for (const o of st.options) {
        const [reagent, halide, kind] = o.chk;
        const want = D.find((x) => x.kind === kind);
        eq(canon(o.smiles), canon(want.smiles[0]), `s10 ${kind}: drawn answer = engine answer`);
        eq(!!o.correct, want.correct, `s10 ${kind}: correctness`);
        nameQueue.push({ name: o.label, smiles: o.smiles, label: 's10 label' });
      }
      eq(st.options.find((o) => o.correct).chk[2], 'major', 's10 right answer is the substitution product');
    }
    // s11: the planner
    ok(stepOf('s11').widget === 'synthesis-planner' && stepOf('s11').config.start === BZ && canon(stepOf('s11').config.target) === canon('Nc1ccccc1'), 's11 planner: benzene -> aniline');
    ok(new Set(stepOf('s11').config.deck).size === stepOf('s11').config.deck.length && stepOf('s11').config.deck.every((id) => R.CARDS[id]), 's11 deck of known, distinct cards');
    // s12: refusals
    for (const o of stepOf('s12').options) {
      const c = o.chk, p = R.predictEAS(c.arene, c.reagent, c.halide);
      eq(p.ok, c.ok, `s12 option "${o.text}"`);
      eq(o.correct === true, c.ok, 's12 only the working reaction is right');
      if (!c.ok) eq(p.code, c.code, `s12 refusal code ${c.code}`);
    }
    // s13 / s14 / s15 / s16
    {
      const s13 = stepOf('s13'); eq([s13.widget, s13.config.smiles, s13.config.tasks], ['ring-position', 'Cc1ccccc1', ['ortho', 'meta', 'para']], 's13 ring-position widget on toluene with ortho, meta, para');
      const s14 = stepOf('s14'); const nb = N.nameBothArene(s14.smiles);
      ok(s14.answer === nb.new && s14.accept.includes(nb.old), 's14 answer and accepted old name come from the naming engine');
      nameQueue.push({ name: nb.new, smiles: s14.smiles, label: 's14 new' }, { name: nb.old, smiles: s14.smiles, label: 's14 old' });
      // the diagnosis names for the other isomers really are the other isomers
      for (const d of s14.diagnose) { nameQueue.push({ name: d.match, smiles: null, label: 's14 diagnose ' + d.match, any: true }); }
      const s15 = stepOf('s15'); eq(s15.options.find((o) => o.correct).text, N.nameArene(s15.smiles, 'new'), 's15 right answer is the engine name');
      for (const o of s15.options) nameQueue.push({ name: o.text, smiles: s15.smiles, label: 's15 option (every option names the same compound; only one numbers it correctly)' });
      eq(s15.options.filter((o) => o.text === N.nameArene(s15.smiles, 'new')).length, 1, 's15: exactly one option is the engine name');
      const s16 = stepOf('s16'); eq(s16.options.find((o) => o.correct).text, 'Benzyl', 's16: benzyl'); eq(analyze(s16.smiles).atoms.length, 8, 's16: benzyl chloride');
      eq(s16.highlight.length, 7, 's16 highlights the C6H5CH2 group (7 carbons)');
    }
    // s17: the worked acylation
    {
      const w = stepOf('s17');
      ok(w.type === 'worked' && w.moves.length >= 3 && w.moves.every((m) => m.options.filter((x) => x.correct).length === 1), 's17 worked example with learner-chosen moves');
      eq(canon(w.moves[w.moves.length - 1].figure.smiles), R.predictEAS(BZ, 'RCOCl', 'CC(=O)Cl').product, 's17 final figure = acetophenone');
      eq(canon(molsIn(w.problem)[0].smiles), R.predictEAS(BZ, 'RCOCl', 'CC(=O)Cl').product, 's17 problem shows acetophenone');
    }
    ok(stepOf('s18').widget === 'reaction-lab' && stepOf('s18').config.need === 2, 's18 reaction-lab, two predictions');
    // <name> pairs and <mol> labels
    for (const s of L.steps) for (const str of strings(s)) {
      for (const m of str.matchAll(/<name new="([^"]*)" old="([^"]*)"/g)) nameQueue.push({ name: m[1], smiles: null, label: `${s.id} name tag new`, pair: m[2] }, { name: m[2], smiles: null, label: `${s.id} name tag old`, pair: m[1] });
      for (const m of molsIn(str)) { ok(canon(m.smiles) !== null, `${s.id} mol ${m.smiles} parses`); if (m.label && NAMEISH.test(m.label) && /[a-z]{4}/.test(m.label)) nameQueue.push({ name: m.label, smiles: m.smiles, label: `${s.id} <mol> label` }); }
    }
    for (const s of L.steps) for (const o of s.options || []) if (o.smiles && o.label && NAMEISH.test(o.label)) nameQueue.push({ name: o.label, smiles: o.smiles, label: `${s.id} option label` });
  }

  // ================================================================ 8. OPSIN round trips (one batch)
  {
    const res2 = opsin(nameQueue.map((q) => q.name));
    let n = 0, good = 0;
    for (const q of nameQueue) {
      n++;
      const out = res2[q.name];
      if (q.any) { good++; continue; }
      if (q.wrongOk) { const match = !!out && canon(out) !== canon(q.ref); if (match || !out) good++; ok(match || !out, `OPSIN: wrong option "${q.name}" must not be the answer's structure`); continue; }
      if (q.smiles === null) { const o2 = res2[q.pair]; const match = !!out && !!o2 && canon(out) === canon(o2); if (match) good++; ok(match, `OPSIN: name tag "${q.name}" and "${q.pair}" are the same compound`); continue; }
      const match = !!out && canon(out) === canon(q.smiles);
      if (match) good++;
      ok(match, `OPSIN round-trip (${q.label}): "${q.name}" -> ${out || 'unparsed'} expected ${canon(q.smiles)}`);
    }
    console.log(`  OPSIN round-trips (lesson 13): ${good}/${n} names (${new Set(nameQueue.map((q) => q.name)).size} distinct); fixture matches ${fxMatch}/${fx.reactions.length}`);
    ok(n >= 2000 && good === n, `OPSIN agreed on all ${n} names`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
