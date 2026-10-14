// Lesson 12 checks: alkynes (engine/reactions-alkynes.js, engine/synthesis.js, McMurry 4.11), checked five ways:
//   (1) every mechanism step (HX + alkyne, acetylide formation + alkylation) balances in atoms and charge, chains to the next step and is reproduced by its arrows; the arrow grader
//       accepts the right arrows and gives a specific diagnosis for the typical wrong ones (wrong carbon for H, arrow from an atom without electrons, reversed arrows);
//   (2) an independent Python RDKit recompute (tools/check_alkynes.py: RWMol edits, bond stereo set explicitly, geometry read from a 3D embedding, new CIP labeler) for every
//       alkyne x reagent case of the lab pool (well over 30);
//   (3) a hand-checked fixture (tests/fixtures/alkynes.json: 29 cases, incl. the 10 named in the brief and the book's own examples), whose names are verified with OPSIN;
//   (4) the acid-base step (NaNH2 deprotonates a terminal alkyne, HO- does not) recomputed from the Lesson 03 pKa table, the 3D model of but-2-yne (angles about 180 degrees)
//       and the Lindlar product (Z)-but-2-ene, the synthesis planner (the engine RUNS sequences; every wrong card has its diagnosis), the extended reaction-lab, the `alkynes` generator;
//   (5) the lesson's own steps (drawn answers recomputed from the engine, mechanisms, text limited to McMurry 4.11).
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
import { nameBothAny, nameAny, chainName } from '../engine/naming-chain.js';
import { ezInfo } from '../engine/cip.js';
import * as eqw from '../engine/widgets/equilibrium-arrow.js';
import { ACID, ACIDS, reaction as acidReaction } from '../engine/acidbase.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import { ALKYNE_TASKS, synthesisPuzzle } from '../engine/generators-alkynes.js';
import { solutionPlan } from '../engine/widgets/synthesis-planner.js';
import models from '../data/3d/models.js';
import { modelAngle } from '../engine/widgets/model3d.js';
import { skillLabel, skillRule } from '../engine/skills.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const flat = (s) => MC.canonFlat(s);
const strings = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach((x) => strings(x, out)); else if (o && typeof o === 'object') Object.values(o).forEach((x) => strings(x, out)); return out; };
const molsIn = (html) => [...String(html).matchAll(/<mol smiles="([^"]+)"(?: label="([^"]*)")?/g)].map((m) => ({ smiles: m[1], label: m[2] || '' }));
const tallyKey = (list) => JSON.stringify(Object.entries(MC.tallyOf(list).c).sort());

export async function lesson12({ ok, eq }) {
  await ready();
  const L = LESSONS.find((l) => l.id === '12');
  const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'alkynes.json'), 'utf8'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-alkyne-'));
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

  // ================================================================ 0. registration and shape
  ok(!!L && L.slug === 'alkynes' && L.drawing === 'skeletal', 'L12 registered, skeletal drawing');
  ok(L.steps.length >= 16 && L.steps.length <= 20, `L12 has 16-20 steps (${L.steps.length})`);
  ok(L.minutes >= 25 && L.minutes <= 30, 'L12 25-30 minutes');
  eq(L.sections, ['4.11'], 'L12 covers McMurry 4.11 only');
  ok(L.mastery.generator === 'alkynes' && GENERATORS.alkynes === true && L.mastery.count === 3, 'L12 mastery generator is `alkynes`');
  ok(['4.16', '4.17', '4.18', '4.19', '4.20'].every((x) => L.useIt.book.includes(x)) && L.useIt.book.every((x) => /^\d+\.\d+$/.test(x)), 'L12 useIt: in-chapter 4.16-4.20, numbers only');
  ok(L.useIt.book.every((x) => { const n = Number(x.split('.')[1]); return x.startsWith('4.') && n >= 16 && n <= 60; }), 'L12 useIt numbers are Chapter 4 items');
  // the end-of-chapter items named in the note really mention alkynes in the book text
  {
    const bookPath = '/tmp/claude-0/-home-user-Organic-Chem/cf94e48a-a808-537f-854f-a886a3dca214/scratchpad/book/ch4.txt';
    if (fs.existsSync(bookPath)) {
      const book = fs.readFileSync(bookPath, 'utf8');
      for (const n of ['4.16', '4.17', '4.18', '4.19', '4.20', '4.22', '4.24', '4.28', '4.30', '4.37', '4.38', '4.43', '4.45', '4.46', '4.47', '4.59']) ok(new RegExp('^(Problem )?' + n.replace('.', '\\.') + '\\b', 'm').test(book), `book Chapter 4 has item ${n}`);
      ok(/4\.46 How would you prepare cis-but-2-ene starting from propyne/.test(book) && /4\.47 Using but-1-yne/.test(book), 'book 4.46 / 4.47 are the multi-step alkyne plans');
    }
  }
  ok(generatorForSkill('alkynes') === 'alkynes' && generatorForSkill('acetylides') === 'alkynes', 'weak spots alkynes / acetylides are practised with the alkynes generator');
  ok(skillLabel('alkynes') !== 'alkynes' && skillLabel('acetylides') !== 'acetylides' && skillRule('alkynes').length > 40 && skillRule('acetylides').length > 40, 'skill labels and rules exist');

  // ================================================================ 1. mechanisms: balance, arrows, diagnoses
  const TERMINAL_OR_SYM = R.LAB_ALKYNES.filter((a) => { const s = R.alkyneSites(a.smiles); return s.ok && (s.terminal !== null || s.bothTerminal || (() => { try { R.alkyneHXMechanism(a.smiles, 'Br'); return true; } catch (e) { return false; } })()); });
  let nMech = 0, nSteps = 0;
  for (const a of TERMINAL_OR_SYM) for (const X of ['Cl', 'Br', 'I']) {
    const m = R.alkyneHXMechanism(a.smiles, X);
    const errs = MC.checkMechanism(m);
    ok(!errs.length, `HX mechanism ${a.id} + H${X}: ${errs.join('; ')}`);
    eq(m.steps.length, 2, `${a.id}: HX mechanism has 2 steps`);
    // the product is the engine's 1-equivalent product (flat: no E/Z is claimed for the vinylic halide)
    eq(flat(m.products[0]), flat(R.predictAlkyne(a.smiles, 'H' + X + '_1').products[0]), `${a.id} + H${X}: mechanism product = engine product`);
    // cation is a vinylic cation with + on the Markovnikov carbon
    const cat = m.steps[0].after.find((x) => x.includes('+'));
    ok(!!cat && analyze(cat).atoms.filter((x) => x.fc === 1).length === 1, `${a.id}: one cation centre`);
    for (const st of m.steps) { const g = arrow.grade(MC.stepConfig(st), st.arrows); ok(g.ok, `${a.id} + H${X}: the stored arrows grade as right`); nSteps++; }
    nMech++;
  }
  // Markovnikov carbon: + sits on the carbon with more carbon neighbours
  {
    const m = R.alkyneHXMechanism('CCCCC#C', 'Br');
    const cat = analyze(m.steps[0].after.find((x) => x.includes('+')));
    const pos = cat.atoms.find((x) => x.fc === 1);
    eq(pos.nbrs.length, 2, 'hex-1-yne: the + carbon is bonded to two atoms (the butyl chain and the =CH2), i.e. the internal carbon');
    const st = m.steps[0], cfg = MC.stepConfig(st);
    ok(!!cfg.regio && cfg.regio.bondWord === 'triple bond' && /Markovnikov/.test(cfg.regio.wrongWhy), 'terminal alkyne step 1 asks which carbon bonds to H, with a Markovnikov diagnosis');
    const [hC, pC] = cfg.regio.pi, H = cfg.regio.H;
    const wrong = [{ from: { bond: [hC, pC] }, to: { bond: [pC, H] } }, st.arrows[1]];
    const g = arrow.grade(cfg, wrong);
    ok(!g.ok && g.code === 'regio' && /wrong carbon/.test(g.diagnosis), 'H on the wrong carbon: ' + g.diagnosis);
    ok(arrow.grade(cfg, st.arrows).ok, 'right carbon is accepted');
    const noBond = [st.arrows[0]];
    const g2 = arrow.grade(cfg, noBond);
    ok(!g2.ok && g2.code === 'missing', 'only the π arrow drawn: the missing H–Br arrow is reported');
    const bad = arrow.badStart(cfg, H);
    ok(/not at H|H⁺/.test(bad), 'an arrow cannot start at H+: ' + bad);
  }
  {
    const m = R.alkyneHXMechanism('CC#CC', 'Br');
    ok(!MC.stepConfig(m.steps[0]).regio, 'symmetrical internal alkyne: no regiochemistry question (either carbon is right)');
    ok(MC.checkMechanism(m).length === 0, 'but-2-yne + HBr mechanism checks');
  }
  for (const bad of ['CC#CCCC', 'CC=C', 'CCCC']) { let t = false; try { R.alkyneHXMechanism(bad, 'Br'); } catch (e) { t = true; } ok(t, `HX mechanism refuses ${bad}`); }
  // acetylide formation + alkylation
  const RX_OK = ['CBr', 'CCBr', 'CCCBr', 'CCCCBr', 'CCCl', 'CI'];
  let nAlk = 0;
  for (const a of R.LAB_ALKYNES.filter((x) => R.isTerminal(x.smiles))) for (const rx of RX_OK) {
    const m = R.acetylideAlkylationMechanism(a.smiles, rx);
    const errs = MC.checkMechanism(m);
    ok(!errs.length, `acetylide mechanism ${a.id} + ${rx}: ${errs.join('; ')}`);
    eq(m.steps.length, 2, 'acetylide mechanism: formation + alkylation');
    // step 1 arrows: N lone pair -> H, C-H bond -> C ; step 2: acetylide lone pair -> C of R-X, C-X bond -> X
    const [s1, s2] = m.steps;
    const sc1 = MC.buildScene(s1), sc2 = MC.buildScene(s2);
    eq(s1.arrows.map((x) => (x.from.lp != null ? 'lp:' + sc1.atoms[x.from.lp].el : 'bond:' + x.from.bond.map((i) => sc1.atoms[i].el).sort().join('')) + '>' + (x.to.atom != null ? sc1.atoms[x.to.atom].el : '?')), ['lp:N>H', 'bond:CH>C'], `${a.id}: step 1 arrows are lp(N) -> H and C-H -> C`);
    const X = analyze(rx).atoms.find((x) => ['Cl', 'Br', 'I'].includes(x.sym)).sym;
    eq(s2.arrows.map((x) => (x.from.lp != null ? 'lp:' + sc2.atoms[x.from.lp].el + sc2.atoms[x.from.lp].charge : 'bond:' + x.from.bond.map((i) => sc2.atoms[i].el).sort().join('')) + '>' + (x.to.atom != null ? sc2.atoms[x.to.atom].el : '?')), ['lp:C-1>C', `bond:${['C', X].sort().join('')}>${X}`], `${a.id}: step 2 arrows are lp(acetylide C) -> C of R-X and C-X -> X`);
    // the product alkyne is what the engine says; the leaving group is X-
    eq(m.products.slice().sort(), [canon(R.alkylateAcetylide(R.acetylideOf(a.smiles), rx)), canon(`[${X}-]`)].sort(), `${a.id} + ${rx}: products = alkylated alkyne + X-`);
    for (const st of m.steps) ok(arrow.grade(MC.stepConfig(st), st.arrows).ok, `${a.id} + ${rx}: stored arrows grade as right`);
    nAlk++;
  }
  {
    const m = R.acetylideAlkylationMechanism('C#C', 'CBr');
    const cfg2 = MC.stepConfig(m.steps[1]);
    const [A1, A2] = m.steps[1].arrows;
    // wrong: both arrows start at atoms without electrons / reversed direction / only one arrow
    const g1 = arrow.grade(cfg2, [A1]);
    ok(!g1.ok && g1.code === 'missing', 'step 2: only the lone-pair arrow -> the C-Br arrow is missing');
    const g2 = arrow.grade(cfg2, [{ from: A2.from, to: { atom: A1.from.lp } }, A1]);
    ok(!g2.ok, 'step 2: the C-Br electrons sent to the acetylide carbon are rejected: ' + g2.diagnosis);
    const g3 = arrow.grade(cfg2, [{ from: { lp: A2.to.atom }, to: { atom: A1.to.atom } }, A2]);
    ok(!g3.ok, 'step 2: an arrow from Br instead of from the acetylide carbon is rejected');
    const cfg1 = MC.stepConfig(m.steps[0]);
    const gH = arrow.badStart(cfg1, m.steps[0].arrows[0].to.atom);
    ok(/H⁺|not at H/.test(gH), 'step 1: arrows do not start at H+');
    nSteps += 4;
  }
  // only primary and methyl halides
  for (const [rx, cls] of [['CBr', 'methyl'], ['CCBr', 'primary'], ['CCCCl', 'primary'], ['CC(C)Br', 'secondary'], ['CCC(C)Br', 'secondary'], ['CC(C)(C)Br', 'tertiary'], ['CC(C)CBr', 'primary']]) eq(R.halideClass(rx), cls, `halide class of ${rx}`);
  for (const rx of ['CC(C)Br', 'CC(C)(C)Br', 'CCC(C)Cl']) { let t = false; try { R.acetylideAlkylationMechanism('CC#C', rx); } catch (e) { t = /primary/.test(e.message); } ok(t, `acetylide mechanism refuses ${rx} (not primary)`); }
  { let t = false; try { R.acetylideAlkylationMechanism('CC#CC', 'CBr'); } catch (e) { t = true; } ok(t, 'an internal alkyne has no acidic H: no acetylide mechanism'); }
  console.log(`  mechanisms: ${nMech} HX + alkyne, ${nAlk} acetylide formation + alkylation (every step balanced, chained, reproduced by its arrows; ${nSteps} arrow gradings)`);

  // ================================================================ 2. independent Python RDKit recompute
  const cases = [];
  for (const a of R.LAB_ALKYNES) for (const k of R.ALKYNE_KEYS) cases.push({ alkyne: a.smiles, key: k, id: a.id });
  for (const sm of ['CCC(C)CC#C', 'CC(C)C#C', 'CCCCCC#C']) for (const k of R.ALKYNE_KEYS) cases.push({ alkyne: sm, key: k, id: sm });
  const pyr = py('check_alkynes.py', cases.map((c) => ({ alkyne: c.alkyne, key: c.key })), 'alk');
  let agree = 0, refusedAgree = 0, stereoChecked = 0, ezAgree = 0;
  cases.forEach((c, i) => {
    const r = pyr[i];
    let pred = null, err = null;
    try { pred = R.predictAlkyne(c.alkyne, c.key); } catch (e) { err = e.message; }
    const tag = `${c.id} + ${c.key}`;
    if (r.refused) {
      ok(!!err && /^excluded/.test(err), `${tag}: Python refuses (${r.refused}) and so does the engine (${err})`);
      if (err) refusedAgree++;
      return;
    }
    ok(!err, `${tag}: engine predicts (${err})`);
    if (err) return;
    eq(pred.products, r.products.map((p) => canon(p)).sort(), `${tag}: engine products equal the RDKit recompute`);
    eq(pred.outcome, r.outcome, `${tag}: outcome (single / mixture)`);
    ok(r.balanced, `${tag}: Python says every product = alkyne + reagent atoms`);
    // atom balance in the engine's own equation (when it has one)
    if (pred.equation) eq(tallyKey(pred.equation.lhs), tallyKey(pred.equation.rhs), `${tag}: equation balances`);
    else for (const p of pred.products) ok(tallyKey([...pred.equation ? [] : [c.alkyne, 'O']]) === tallyKey([p]), `${tag}: mixture member ${p} = alkyne + H2O`);
    if (r.stereo) {
      stereoChecked++;
      eq(pred.stereo, r.stereo, `${tag}: stereo label`);
      eq(r.cip, r.stereo, `${tag}: RDKit's CIP labeler agrees (${r.cip})`);
      ok(r.stereo === 'E' ? Math.abs(r.dihedral) > 170 : Math.abs(r.dihedral) < 10, `${tag}: 3D dihedral ${r.dihedral && r.dihedral.toFixed(1)} fits ${r.stereo}`);
      // the engine's CIP reading of its own SMILES (cip.js) gives the same letter
      const e = ezInfo(pred.products[0]).find((x) => x.label);
      eq(e && e.label, r.stereo, `${tag}: engine ezInfo letter`);
      ezAgree++;
    } else if (pred.rx.kind === 'lindlar' || (pred.rx.kind === 'X2' && pred.rx.equiv === 1)) {
      ok(pred.stereo === null, `${tag}: no geometry claimed`);
    }
    pred.names.forEach((nn, k) => { if (nn) nameQueue.push({ name: nn.new, smiles: pred.products[k], label: `${tag} engine new` }, { name: nn.old, smiles: pred.products[k], label: `${tag} engine old` }); });
    agree++;
  });
  console.log(`  RDKit cross-checks (lesson 12): ${agree} alkyne x reagent cases agree, ${refusedAgree} refusals agree, ${stereoChecked} stereo cases checked in 3D and with the new CIP labeler`);
  ok(agree >= 100, `at least 30 (here ${agree}) alkyne x reagent cases cross-checked`);
  ok(stereoChecked >= 20, `stereo cases checked in 3D (${stereoChecked})`);

  // ================================================================ 3. the hand-checked fixture
  ok(fx.length >= 18, `fixture has at least 18 cases (${fx.length})`);
  const need = ['propyne-hbr1', 'propyne-hbr2', 'butyne-hydration', 'hex3yne-hydration', 'butyne2-lindlar', 'butyne2-pd', 'propyne-acetylide-propylbromide', 'acetylene-acetylide-methyl', 'hexyne-br2-1', 'hexyne-cl2-2'];
  for (const id of need) ok(fx.some((f) => f.id === id), `fixture includes ${id}`);
  let fxMatch = 0;
  for (const f of fx) {
    let got, outcome = 'single';
    if (f.cards) {
      const g = R.gradeSequence(f.start, f.products[0].smiles, f.cards);
      ok(g.ok, `fixture ${f.id}: the planner reaches the target (${g.diagnosis})`);
      got = [g.run && g.run.final.smiles];
    } else {
      const pred = R.predictAlkyne(f.alkyne, f.key);
      got = pred.products; outcome = pred.outcome;
      if (!f.id.includes('methylhexyne')) { const nb = nameBothAny(pred.products[0]); ok(!!nb, `${f.id}: the engine names its product`); }
      pred.names.forEach((n, k) => { if (n) { nameQueue.push({ name: n.new, smiles: pred.products[k], label: `${f.id} engine new` }); nameQueue.push({ name: n.old, smiles: pred.products[k], label: `${f.id} engine old` }); } });
    }
    const want = f.products.map((p) => canon(p.smiles)).sort();
    eq(got.map((x) => canon(x)).sort(), want, `fixture ${f.id}`);
    eq(outcome, f.outcome, `fixture outcome ${f.id}`);
    if (JSON.stringify(got.map((x) => canon(x)).sort()) === JSON.stringify(want)) fxMatch++;
    f.products.forEach((p) => nameQueue.push({ name: p.name, smiles: p.smiles, label: `fixture ${f.id}` }));
  }
  ok(fx.filter((f) => /^\(E\)|^\(Z\)/.test(f.products[0].name)).length >= 5, 'fixture has stereo cases ((E)- and (Z)- names, checked by OPSIN)');
  // the engine's name pair for the fixture entries that the book names
  {
    const nm = (smi) => nameBothAny(smi);
    eq(nm('C=C(C)Br'), { new: '2-bromoprop-1-ene', old: '2-bromo-1-propene' }, 'name of 2-bromopropene');
    eq(nm('CC(C)(Br)Br').new, '2,2-dibromopropane', 'name of 2,2-dibromopropane');
    eq(nm('CCCC/C(Br)=C\\Br').new, '(E)-1,2-dibromohex-1-ene', 'name (E)-1,2-dibromohex-1-ene');
    eq(nm('CCCC/C(Br)=C\\Br').old, '(E)-1,2-dibromo-1-hexene', 'old name (E)-1,2-dibromo-1-hexene');
    eq(nm('CCCCC(Cl)(Cl)C(Cl)Cl').new, '1,1,2,2-tetrachlorohexane', 'name 1,1,2,2-tetrachlorohexane');
    eq(nm('CCC(C)=O'), { new: 'butan-2-one', old: '2-butanone' }, 'ketone names');
    eq(nm('CCC(=O)CCC').new, 'hexan-3-one', 'hexan-3-one');
    eq(nm('C/C=C\\C').new, '(Z)-but-2-ene', '(Z)-but-2-ene (hydrocarbon engine)');
    eq(nm('CC#CCCC').new, 'hex-2-yne', 'hex-2-yne');
    eq(nm('CC(=O)C').new, 'propan-2-one', 'propan-2-one');
    ok(chainName('CC(C)CBr') === null && chainName('C1CCCCC1Br') === null && chainName('CCO') === null && chainName('CC=CC=O') === null, 'chainName refuses branches, rings, OH and aldehydes');
    ok(nameAny('CCC(C)CC(C)=O') === null, 'branched ketones are not named (out of scope)');
  }
  // refused inputs
  for (const bad of ['C=C', 'CCCC', 'C1CC#CC1', 'C#CC=C', 'CC#CC#C', 'c1ccccc1C#C', 'CC#C[Br]', 'not a smiles', '']) ok(!R.alkyneSites(bad).ok, `alkyneSites refuses ${bad}: ${R.alkyneSites(bad).reason}`);
  for (const [a, k] of [['C#C', 'H2O_Hg'], ['CC#CCCC', 'HBr_1'], ['CC#CCCC', 'HCl_2'], ['CC#CCCC', 'HI_1']]) { let t = false; try { R.predictAlkyne(a, k); } catch (e) { t = /^excluded/.test(e.message); } ok(t, `predictAlkyne refuses ${a} + ${k}`); }
  ok(R.alkyneSites('C#C').bothTerminal && R.alkyneSites('CC#C').terminal === 2 && R.alkyneSites('CC#CC').terminal === null, 'terminal / internal / acetylene read from the structure');

  // answers: one correct, distinct, every wrong answer has its own why
  {
    let n = 0;
    for (const a of R.LAB_ALKYNES) for (const k of R.ALKYNE_LAB_KEYS) {
      let pred; try { pred = R.predictAlkyne(a.smiles, k); } catch (e) { continue; }
      const ch = R.alkyneChoices(pred);
      if (ch.length < 4) { ok(a.id === 'acetylene' && ch.length >= 3, `${a.id} + ${k}: only acetylene has fewer than 4 answers (${ch.length})`); continue; }
      ok(ch.length === 4 && ch.filter((o) => o.correct).length === 1, `${a.id} + ${k}: 4 answers, one right`);
      ok(new Set(ch.map((o) => o.smiles.map((s) => canon(s)).sort().join('+'))).size === 4, `${a.id} + ${k}: four different answers`);
      ok(ch.every((o) => o.why && o.why.length > 20), `${a.id} + ${k}: every answer has a reason`);
      ok(new Set(ch.filter((o) => !o.correct).map((o) => o.why)).size === 3, `${a.id} + ${k}: the reasons differ`);
      eq(ch.find((o) => o.correct).smiles.map((s) => canon(s)).sort(), pred.products, `${a.id} + ${k}: the right answer is the engine product`);
      // distractors are real molecules; none of them is the product
      for (const o of ch.filter((x) => !x.correct)) ok(o.smiles.every((s) => canon(s)) && o.smiles.map((s) => canon(s)).sort().join() !== pred.products.join(), `${a.id} + ${k}: distractor ${o.kind} differs from the product`);
      n++;
    }
    ok(n >= 30, `answer sets checked for ${n} lab combinations`);
  }
  // reagents that make a given product
  eq(R.alkyneReagentsFor('CCCCC#C', [canon('CCCCC(C)=O')]), ['H2O_Hg'], 'only hydration turns hex-1-yne into hexan-2-one');
  eq(R.alkyneReagentsFor('CC#CC', [canon('C/C=C\\C')]), ['H2_Lindlar'], 'only Lindlar turns but-2-yne into (Z)-but-2-ene');

  // ================================================================ 4. the acid-base step (computed from the Lesson 03 table)
  {
    eq(ACID.acetylene.pka, 25, 'table: acetylene 25');
    eq(ACID.ammonia.pka, 36, 'table: ammonia 36');
    eq(ACID.water.pka, 15.74, 'table: water 15.74');
    eq(R.ALKENE_PKA, 44, 'McMurry 4.11: alkene C–H pKa about 44');
    ok(ACID.water.pka < ACID.acetylene.pka && ACID.acetylene.pka < ACID.ammonia.pka && ACID.ammonia.pka < R.ALKENE_PKA, 'order of acidity: water < alkyne < ammonia < alkene');
    const nh2 = R.deprotonates('ammonia'), oh = R.deprotonates('water');
    ok(nh2.ok && nh2.favoured === 'right', 'NaNH2 (NH3 pKa ≈ 36) deprotonates a terminal alkyne (25): the products side is favoured');
    ok(!oh.ok && oh.favoured === 'left', 'HO- (water 15.74) does not: the reactant side is favoured');
    eq(R.ALKYNE_BASES.filter((b) => R.deprotonates(b.id).ok).map((b) => b.id), ['ammonia'], 'of the five bases in the table only amide ion deprotonates a terminal alkyne');
    // independent: the favoured side = the weaker acid, recomputed directly from the pKa numbers
    for (const b of R.ALKYNE_BASES) eq(R.deprotonates(b.id).ok, ACID[b.id].pka > ACID.acetylene.pka, `${b.id}: deprotonation iff the conjugate acid's pKa exceeds 25`);
    // equilibrium-arrow widget logic with the lesson's two pairs
    for (const [a, b, side] of [['acetylene', 'ammonia', 'right'], ['acetylene', 'water', 'left']]) {
      const cfg = { a, b };
      eq(eqw.solution(cfg), { acids: ['L0', 'R1'], side }, `equilibrium-arrow ${a}/${b}: favoured side ${side}`);
      ok(eqw.ACID_KEYS.every((k) => eqw.tapSpecies(cfg, k).ok) && eqw.gradeSide(cfg, side).ok && !eqw.gradeSide(cfg, side === 'left' ? 'right' : 'left').ok, `equilibrium-arrow ${a}/${b} graded`);
      const rx = acidReaction(a, b);
      ok(MC.balanced(rx.reactants, rx.products), `${rx.text} balances`);
    }
    // the planner agrees: NaNH2 makes the acetylide, NaOH is refused with the pKa reason, an internal alkyne has no acidic H
    const a1 = R.applyCard({ kind: 'neutral', smiles: canon('CC#C') }, 'NaNH2');
    ok(a1.ok && a1.state.kind === 'acetylide' && a1.state.smiles === canon('CC#[C-]') && /36/.test(a1.note) && /25/.test(a1.note), 'planner: NaNH2 + propyne -> acetylide, with the pKa numbers');
    const a2 = R.applyCard({ kind: 'neutral', smiles: canon('CC#C') }, 'NaOH');
    ok(!a2.ok && a2.code === 'weakBase' && /15\.74/.test(a2.diag) && /25/.test(a2.diag), 'planner: NaOH + propyne refused with the pKa reason: ' + a2.diag);
    const a3 = R.applyCard({ kind: 'neutral', smiles: canon('CC#CC') }, 'NaNH2');
    ok(!a3.ok && a3.code === 'noH' && /internal/.test(a3.diag), 'planner: NaNH2 + internal alkyne: no acidic H');
    ok(R.acetylideOf('CC#C') === 'CC#[C-]' && R.acetylideOf('C#C') === '[C-]#C', 'acetylide anions from the terminal alkyne');
  }

  // ================================================================ 5. 3D models
  {
    const mb = models['but-2-yne'].molblock;
    const A1 = modelAngle(mb, 1, 0, 2), A2 = modelAngle(mb, 2, 1, 3);
    ok(A1 > 178 && A2 > 178, `but-2-yne model: C–C≡C angles ${A1.toFixed(1)}° and ${A2.toFixed(1)}° (about 180°)`);
    const lines = mb.split('\n'); const n = parseInt(lines[3].slice(0, 3), 10);
    const P = (i) => [0, 10, 20].map((o) => parseFloat(lines[4 + i].slice(o, o + 10)));
    const sub = (a, b) => a.map((v, i) => v - b[i]); const norm = (a) => Math.hypot(...a);
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const sym = []; for (let i = 0; i < n; i++) sym.push(lines[4 + i].slice(31, 34).trim());
    eq(sym.slice(0, 4), ['C', 'C', 'C', 'C'], 'but-2-yne atoms 0-3 are carbons');
    // collinear: the other two carbons lie on the line through C1 and C2
    const d = sub(P(2), P(1)); const dev = [0, 3].map((i) => norm(cross(sub(P(i), P(1)), d)) / norm(d));
    ok(dev.every((x) => x < 0.05), `the four carbons are collinear (distance from the C2–C3 axis ${dev.map((x) => x.toFixed(3)).join(', ')} Å)`);
    const len = (m, i, j) => { const l = m.split('\n'); const p = (k) => [0, 10, 20].map((o) => parseFloat(l[4 + k].slice(o, o + 10))); return norm(sub(p(i), p(j))); };
    const triple = len(mb, 1, 2), dbl = len(models['cis-but-2-ene'].molblock, 1, 2);
    ok(triple < 1.25 && dbl > 1.30 && triple < dbl, `C≡C ${triple.toFixed(2)} Å is shorter than C=C ${dbl.toFixed(2)} Å`);
    // (Z)-but-2-ene: cis dihedral near 0 and C–C=C angles near 120
    const mz = models['cis-but-2-ene'].molblock;
    const Q = (i) => { const l = mz.split('\n'); return [0, 10, 20].map((o) => parseFloat(l[4 + i].slice(o, o + 10))); };
    const b1 = sub(Q(1), Q(0)), b2 = sub(Q(2), Q(1)), b3 = sub(Q(3), Q(2));
    const n1 = cross(b1, b2), n2 = cross(b2, b3); const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const dih = Math.acos(Math.max(-1, Math.min(1, dot(n1, n2) / (norm(n1) * norm(n2))))) * 180 / Math.PI;
    ok(dih < 10, `the (Z)-but-2-ene model is cis: C–C=C–C dihedral ${dih.toFixed(1)}°`);
    const ang = modelAngle(mz, 1, 0, 2);
    ok(ang > 115 && ang < 132, `(Z)-but-2-ene: C–C=C angle ${ang.toFixed(1)}° (near 120°)`);
    eq(canon(models['cis-but-2-ene'].smiles), canon(R.predictAlkyne('CC#CC', 'H2_Lindlar').products[0]), 'the cis-but-2-ene model is the Lindlar product');
    eq(canon(models['but-2-yne'].smiles), canon('CC#CC'), 'the but-2-yne model is but-2-yne');
  }

  // ================================================================ 6. the synthesis planner
  {
    const lab = (id) => R.CARDS[id].label;
    ok(R.CARD_IDS.length >= 10 && R.CARD_IDS.every((id) => R.CARDS[id].label), 'cards have labels');
    // every fixture plan runs; each step shows what it made
    for (const f of fx.filter((x) => x.cards)) {
      const run = R.runSequence(f.start, f.cards);
      ok(run.ok && run.steps.every((s) => s.ok && s.note), `plan ${f.id} runs step by step with a note each`);
    }
    // the lesson's puzzle (s18)
    const s18 = stepOf('s18');
    const sol = solutionPlan(s18.config);
    eq(sol, ['NaNH2', 'PrBr', 'H2_Lindlar'], 's18: the shortest plan is NaNH2, 1-bromopropane, H2/Lindlar');
    const all = R.solveSequences(s18.config.start, s18.config.target, s18.config.deck, 4);
    ok(all.length >= 1 && all.every((p) => R.gradeSequence(s18.config.start, s18.config.target, p).ok), 's18: every solution found is accepted by the grader');
    eq(canon(s18.config.target), canon(R.predictAlkyne('CC#CCCC', 'H2_Lindlar').products[0]), 's18 target = (Z)-hex-2-ene from the engine');
    // one wrong order first, then right: each wrong plan has its own diagnosis
    const G = (ids) => R.gradeSequence(s18.config.start, s18.config.target, ids);
    const wrongs = [
      [['PrBr', 'NaNH2', 'H2_Lindlar'], 'step', /BEFORE|first/i, 'halide before the base'],
      [['NaNH2', 'iPrBr', 'H2_Lindlar'], 'step', /secondary/, 'secondary halide'],
      [['NaOH', 'PrBr', 'H2_Lindlar'], 'step', /15\.74/, 'hydroxide'],
      [['NaNH2', 'PrBr', 'H2_Pd'], 'wrong', /Pd\/C/, 'Pd/C goes to the alkane'],
      [['NaNH2', 'PrBr', 'H2O_Hg'], 'step', /mixture/i, 'hydration of unsymmetrical hex-2-yne'],
      [['NaNH2', 'PrBr'], 'wrong', /Lindlar/, 'stopped at the alkyne'],
      [['NaNH2'], 'anion', /alkyl halide/, 'ends at the anion'],
      [['H2_Lindlar', 'NaNH2', 'PrBr'], 'step', /.+/, 'Lindlar first gives propene, which has no acidic H'],
      [[], 'empty', /at least one/, 'empty plan']
    ];
    for (const [ids, code, rx, label] of wrongs) { const g = G(ids); ok(!g.ok && g.code === code && rx.test(g.diagnosis), `s18 wrong plan (${label}): ${g.code}: ${g.diagnosis}`); }
    ok(G(['NaNH2', 'PrBr', 'H2_Lindlar']).ok, 's18 right plan accepted');
    // specific diagnoses named in the brief
    {
      const g1 = R.gradeSequence('C#C', 'CCCCC(C)=O', ['NaNH2', 'BuBr', 'H2_Lindlar']);
      ok(!g1.ok && /Lindlar gives the alkene, not a ketone/.test(g1.diagnosis), 'wrong card: "Lindlar gives the alkene, not a ketone"');
      const g2 = R.gradeSequence('CC#C', 'CC#CC(C)C', ['NaNH2', 'iPrBr']);
      ok(!g2.ok && /secondary alkyl halide will not work with an acetylide/.test(g2.diagnosis), 'wrong card: "a secondary halide will not work with an acetylide"');
      const g3 = R.gradeSequence('CC#C', 'CCCCC(C)=O', ['NaNH2', 'PrBr', 'H2O_Hg']);
      ok(!g3.ok && /MIXTURE/.test(g3.diagnosis), 'hex-2-yne + hydration is a mixture, so propyne cannot give hexan-2-one this way');
      const g4 = R.gradeSequence('C#C', 'CCCCC(C)=O', ['NaNH2', 'EtBr', 'H2O_Hg']);
      ok(!g4.ok && /too short/.test(g4.diagnosis), 'a short chain is flagged: ' + g4.diagnosis);
      const g5 = R.gradeSequence('C#C', 'CCCCC(C)=O', ['NaNH2', 'BuBr', 'H2O_Hg', 'HBr_1']);
      ok(!g5.ok, 'an extra card after the target is reached is refused (nothing left to react with, or a different product)');
      const g6 = R.gradeSequence('CC#C', 'CC/C=C\\CC', ['NaNH2', 'EtBr', 'H2_Lindlar']);
      ok(!g6.ok && /too short/.test(g6.diagnosis), 'ethyl bromide adds too few carbons for hex-2-ene');
    }
    // acid undoing an acetylide: allowed in the run, flagged as a wasted step
    {
      const g = R.gradeSequence('CC#C', 'CC(C)=O', ['NaNH2', 'H2O_Hg']);
      ok(!g.ok && g.code === 'wrong' && /acid \(or water\) undoes an acetylide/.test(g.diagnosis), 'NaNH2 then water/acid: the acid gives the acetylide its H back, the plan is not the target, and the diagnosis says why: ' + g.diagnosis);
      const run = R.runSequence('CC#C', ['NaNH2', 'H2O_Hg']);
      ok(run.steps[1].reverted && /stronger acid/.test(run.steps[1].note), 'the reverted step explains: water is a far stronger acid than the alkyne');
    }
    // each card has a use somewhere: its diagnosis exists for a wrong use
    const probe = [
      ['CC#C', 'NaOH', 'weakBase'], ['CC#C', 'CH3Br', 'noAnion'], ['CC#CC', 'NaNH2', 'noH'], ['C=CCC', 'H2_Lindlar', 'nothing'], ['CCCC', 'H2_Pd', 'nothing'], ['CCC(C)=O', 'HBr_1', 'noAlkyne'],
      ['C#C', 'H2O_Hg', 'excluded'], ['CC#CCCC', 'H2O_Hg', 'mixture'], ['CC#CCCC', 'HBr_1', 'excluded']
    ];
    for (const [sm, card, code] of probe) { const r = R.applyCard({ kind: 'neutral', smiles: canon(sm) }, card); ok(!r.ok && r.code === code && r.diag.length > 30, `applyCard(${sm}, ${card}) -> ${code}`); }
    for (const [card, code] of [['iPrBr', 'notPrimary'], ['tBuBr', 'notPrimary'], ['NaNH2', 'repeat'], ['H2_Lindlar', 'anion']]) { const r = R.applyCard({ kind: 'acetylide', smiles: canon('CC#[C-]') }, card); ok(!r.ok && r.code === code, `applyCard(acetylide, ${card}) -> ${code}`); }
    { const r = R.applyCard({ kind: 'neutral', smiles: canon('CCCC=C') }, 'H2_Pd'); ok(r.ok && r.state.smiles === canon('CCCCC'), 'Pd/C also hydrogenates an alkene'); }
    // widget code
    ok(typeof WIDGETS['synthesis-planner'].mount === 'function' && typeof WIDGETS['reaction-lab'].mount === 'function', 'widgets registered');
    void lab;
  }

  // ================================================================ 7. reaction-lab pool
  {
    const lab = stepOf('s19');
    ok(lab.config.alkynes.every((id) => R.ALKYNE_BY_ID[id]) && lab.config.reagents.every((k) => R.ALKYNE_RXN[k]), 's19 lab alkynes and reagents exist');
    ok(lab.config.need === 2 && lab.config.alkynes.length >= 4, 's19: need 2 right predictions, several alkynes');
    let combos = 0;
    for (const id of lab.config.alkynes) for (const k of lab.config.reagents) { const p = R.predictAlkyne(R.ALKYNE_BY_ID[id].smiles, k); ok(p.products.length >= 1, `lab ${id} + ${k} predicts`); combos++; }
    eq(combos, lab.config.alkynes.length * lab.config.reagents.length, 'every lab combination of the lesson is inside the engine (none is refused)');
    for (const a of R.LAB_ALKYNES) { const nb = nameBothAny(a.smiles); ok(!!nb, `lab name of ${a.id}`); nameQueue.push({ name: nb.new, smiles: a.smiles, label: 'lab alkyne new' }, { name: nb.old, smiles: a.smiles, label: 'lab alkyne old' }); if (a.id !== 'acetylene') eq(nb.new, a.id, `lab id ${a.id} is its new IUPAC name`); else eq(nb.new, 'ethyne', 'acetylene is ethyne in IUPAC'); }
  }

  // ================================================================ 8. the `alkynes` generator
  {
    const rng = mulberry32(12);
    const probs = generate('alkynes', 150, { rng });
    const kinds = {};
    ok(probs.length === 150, 'generator makes 150 problems');
    for (const p of probs) {
      const tag = p.kind + ':' + (p.widget || (p.options ? 'choice' : 'input'));
      kinds[tag] = (kinds[tag] || 0) + 1;
      ok(['alkynes', 'acetylides'].includes(p.skill), 'problem skill is alkynes or acetylides');
      ok(Array.isArray(p.hints) && p.hints.length === 2 && p.hints.every((x) => x.length > 20) && p.derive && p.derive.length > 20, `problem has 2 hints and a derivation (${p.prompt.slice(0, 40)})`);
      if (p.kind === 'choice') {
        ok(p.options.filter((o) => o.correct).length === 1 && p.options.length === 4 && p.options.every((o) => o.why && o.why.length > 15), `choice: one correct of 4 with whys (${p.prompt.slice(0, 50)})`);
        if (p.key && p.products && p.options[0].products) {
          // product task: the right answer is the engine's product set (stereo included), four distinct answers
          const pred = R.predictAlkyne(p.alkyne, p.key);
          const right = p.options.find((o) => o.correct);
          eq(right.products.map((s) => canon(s)).sort(), pred.products, `product task ${p.alkyne} + ${p.key}`);
          eq(new Set(p.options.map((o) => o.products.map((s) => canon(s)).sort().join('+'))).size, 4, 'four distinct answers');
          for (const o of p.options) for (const s of o.products) ok(canon(s) !== null, 'option structures parse');
        } else if (p.key && p.equation && p.equation.cond === '?') {
          const right = p.options.find((o) => o.correct);
          const want = R.ALKYNE_RXN[p.key].label;
          eq(right.text, want, `reagent task ${p.alkyne}: the right answer is the reagent that makes the target`);
          eq(R.alkyneReagentsFor(p.alkyne, p.products, R.ALKYNE_KEYS).includes(p.key), true, 'the reagent really gives the target');
          // every other reagent shown gives something else
          for (const o of p.options.filter((x) => !x.correct)) {
            const k = R.ALKYNE_KEYS.find((kk) => R.ALKYNE_RXN[kk].label === o.text);
            ok(!!k, `reagent option ${o.text} exists`);
            let other = null; try { other = R.predictAlkyne(p.alkyne, k).products; } catch (e) { other = null; }
            ok(other && other.join() !== p.products.map((s) => canon(s)).sort().join(), `wrong reagent ${o.text} does not give the target`);
          }
        } else {
          // acidity (which base)
          const right = p.options.find((o) => o.correct);
          const b = R.ALKYNE_BASES.find((x) => x.label === right.text);
          ok(!!b && R.deprotonates(b.id).ok, 'acidity task: the right base deprotonates the alkyne');
          for (const o of p.options.filter((x) => !x.correct)) { const wb = R.ALKYNE_BASES.find((x) => x.label === o.text); ok(!!wb && !R.deprotonates(wb.id).ok, `wrong base ${o.text} does not`); }
        }
      } else if (p.kind === 'widget' && p.widget === 'synthesis-planner') {
        ok(p.config.deck.length >= 5 && p.config.deck.length <= 8, `planner deck of ${p.config.deck.length} cards`);
        ok(p.solution.length >= 2 && p.solution.length <= 3, 'planner puzzle has 2 or 3 steps');
        const g = R.gradeSequence(p.start, p.target, p.solution);
        ok(g.ok, `planner puzzle is solved by its own plan (${p.solution.join(', ')}) -> ${g.diagnosis}`);
        ok(p.solution.every((id) => p.config.deck.includes(id)), 'the plan uses cards of the deck');
        ok(R.solveSequences(p.start, p.target, p.config.deck, 3).every((s) => R.gradeSequence(p.start, p.target, s).ok), 'every solution the solver finds is graded right');
        ok(new Set(p.config.deck).size === p.config.deck.length, 'no duplicate cards in the deck');
        // a deliberately wrong plan (halide first) is rejected
        const bad = [p.solution[1], p.solution[0], ...p.solution.slice(2)];
        ok(!R.gradeSequence(p.start, p.target, bad).ok, 'halide before NaNH2 is rejected');
      } else if (p.kind === 'widget' && p.widget === 'equilibrium-arrow') {
        const rx = acidReaction(p.config.a, p.config.b);
        eq(p.config.a, 'acetylene', 'equilibrium task starts from acetylene');
        eq(rx.favoured, ACID[p.config.b].pka > 25 ? 'right' : 'left', `equilibrium task acetylene/${p.config.b}: favoured side from the pKa table`);
      }
    }
    for (const t of ['choice:choice', 'widget:synthesis-planner', 'widget:equilibrium-arrow']) ok(kinds[t] > 0, `all kinds appear: ${t}`);
    const big = generate('alkynes', 500, { rng: mulberry32(7) });
    const seen = new Set(big.filter((p) => p.key && p.options && p.options[0] && p.options[0].products).map((p) => p.key));
    ok(seen.size >= 11, `product problems cover ${seen.size} reagent keys`);
    ok(new Set(probs.filter((p) => p.alkyne).map((p) => p.alkyne)).size >= 6, 'alkynes vary');
    ok(big.some((p) => p.stereo === 'Z') && big.some((p) => p.stereo === 'E'), 'both Lindlar (Z) and anti-addition (E) stereo problems occur');
    ok(big.some((p) => p.key && /_2$/.test(p.key)) && big.some((p) => p.key && /_1$/.test(p.key)), '1 and 2 equivalent problems occur');
    ok(big.some((p) => p.key === 'H2O_Hg') && big.some((p) => p.key === 'H2_Pd') && big.some((p) => p.key === 'H2_Lindlar'), 'hydration, Pd/C and Lindlar problems occur');
    for (const skill of ['alkynes', 'acetylides']) {
      const ps = generate('alkynes', 30, { skill, rng: mulberry32(5) });
      ok(ps.every((q) => q.skill === skill), `skill ${skill} serves only ${skill} problems`);
    }
    const a = generate('alkynes', 6).map((q) => q.prompt + JSON.stringify(q.config || '')).join('|'), b = generate('alkynes', 6).map((q) => q.prompt + JSON.stringify(q.config || '')).join('|');
    ok(a !== b, 'fresh problems on each run');
    eq(ALKYNE_TASKS.slice().sort(), ['acidity', 'product', 'reagent', 'synthesis'], 'four tasks: product, reagent, synthesis puzzle, acidity');
    const puz = []; const r2 = mulberry32(3); for (let i = 0; i < 60; i++) puz.push(synthesisPuzzle(r2));
    ok(puz.every((z) => z.solution.length >= 2 && z.solution.length <= 3), 'puzzles are 2 or 3 steps');
    ok(new Set(puz.map((z) => z.solution.join())).size >= 12, 'puzzles vary');
    console.log(`  alkynes generator: ${probs.length} problems (${JSON.stringify(kinds)})`);
  }

  // ================================================================ 9. the lesson's own steps
  {
    ok(L.steps.every((s) => !JSON.stringify(s).includes('undefined')), 'L12 no undefined text');
    const text = JSON.stringify(L);
    ok(!/hydroboration|Na\/NH3|sodium in ammonia|dissolving metal|anti-Markovnikov hydration|\bE2\b|elimination/i.test(text.replace(/anti-Markovnikov orientation|anti-Markovnikov/g, '')), 'L12 stays inside McMurry 4.11 (no hydroboration, no Na/NH3, no E2)');
    ok(!/\d+\s?%/.test(text), 'L12 quotes no percentages');
    // pKa values quoted are the table values (and the book's 44 for an alkene)
    const quoted = [...strings(L.steps).join(' ').matchAll(/pKa (?:≈ )?(\d+(?:\.\d+)?)/g)].map((m) => m[1]);
    const allowed = new Set(['25', '36', '15.74', '44']);
    ok(quoted.length >= 6 && quoted.every((q) => allowed.has(q)), `L12 only quotes table pKa values (${[...new Set(quoted)].join(', ')})`);
    // skills: only those of the taxonomy (run.mjs checks the set); the new ones are used
    ok(L.steps.some((s) => s.skill === 'alkynes') && L.steps.some((s) => s.skill === 'acetylides') && L.steps.some((s) => s.skill === 'synthesis') && L.steps.some((s) => s.skill === 'pka-direction'), 'L12 trains alkynes, acetylides, synthesis and pka-direction');
    // predict-first on HBr regiochemistry and on 1 vs 2 equivalents
    ok(stepOf('s05').type === 'predict' && stepOf('s06').type === 'predict' && /one<\/b> equivalent/.test(stepOf('s05').prompt) && /two<\/b> equivalents/.test(stepOf('s06').prompt), 'predict-first: HBr regiochemistry (s05) and 2 equivalents (s06)');
    ok(L.steps.findIndex((s) => s.type === 'predict') === 0 && L.steps.findIndex((s) => s.type === 'explain') > 0, 'L12 predicts before it explains');
    // hydration: enol -> ketone, where the C=O ends up
    ok(/enol/.test(stepOf('s09').prompt) && stepOf('s09').options.some((o) => o.correct && o.smiles === 'CCC(C)=O'), 's09 hydration: the learner picks butan-2-one');
    ok(/tautomer/.test(stepOf('s10').html) && /⇌/.test(stepOf('s10').html) && /strongly on the ketone/.test(stepOf('s10').html), 's10 presents the enol/ketone tautomerism as an equilibrium that strongly favours the ketone');
    // Lindlar vs Pd/C trap with the 3D Z product
    ok(stepOf('s11').visual.config.mol === 'cis-but-2-ene' && stepOf('s11').options.some((o) => /Pd\/C/.test(o.text)) && stepOf('s11').options.some((o) => /Lindlar/.test(o.text)), 's11: Lindlar vs Pd/C choice with the 3D (Z)-but-2-ene');
    // 3D steps
    eq([stepOf('s02').visual.config.mol, stepOf('s02').visual.config.compare], ['but-2-yne', 'cis-but-2-ene'], 's02 compares the but-2-yne and (Z)-but-2-ene models');
    // acidity with the Lesson 03 widget
    eq(L.steps.filter((s) => s.widget === 'equilibrium-arrow').map((s) => [s.config.a, s.config.b]), [['acetylene', 'ammonia'], ['acetylene', 'water']], 's12 / s13: equilibrium-arrow with NH2- and HO-');
    for (const sid of ['s12', 's13']) { const s = stepOf(sid); const rx = acidReaction(s.config.a, s.config.b); eq(s.reaction.reactants.map(canon), rx.reactants.map(canon), `${sid} reactants`); eq(s.reaction.products.map(canon), rx.products.map(canon), `${sid} products`); ok(MC.balanced(s.reaction.reactants, s.reaction.products), `${sid} balances`); }
    // the answers that are drawn structures: recomputed from the engine
    for (const sid of ['s05', 's06', 's08', 's09', 's11']) {
      const st = stepOf(sid);
      for (const o of st.options) {
        const [alkyne, key, kind] = o.chk;
        const pred = R.predictAlkyne(alkyne, key);
        const D = R.alkyneChoices(pred, { n: 5 });
        let want = D.find((x) => x.kind === kind);
        if (!want && kind === 'major') want = D[0];
        ok(!!want, `${sid} kind ${kind} exists in the engine`);
        const drawn = o.smiles ? [o.smiles] : molsIn(o.text).map((m) => m.smiles);
        if (sid !== 's11') eq(drawn.map((x) => canon(x)).sort(), (want ? want.smiles : []).map((x) => canon(x)).sort(), `${sid} ${kind}: drawn answer = engine answer`);
        if (sid !== 's11') eq(!!o.correct, want.correct, `${sid} ${kind}: correctness`);
        else eq(!!o.correct, key === 'H2_Lindlar', 's11 only Lindlar is right');
        if (o.smiles && o.label) nameQueue.push({ name: o.label, smiles: o.smiles, label: `${sid} label` });
        molsIn(o.text || '').forEach((m) => nameQueue.push({ name: m.label, smiles: m.smiles, label: `${sid} mol label` }));
      }
    }
    eq(stepOf('s08').options.filter((o) => o.correct).map((o) => canon(o.smiles)), [canon('Br/C=C(/Br)CCCC')], 's08 the right answer is (E)-1,2-dibromohex-1-ene (anti)');
    ok(stepOf('s08').options.some((o) => canon(o.smiles) === canon('Br/C=C(\\Br)CCCC') && !o.correct), 's08 the (Z) isomer is a distractor');
    // s16 plans via the planner
    for (const o of stepOf('s16').options) {
      const c = o.chk, g = R.gradeSequence(c.start, c.target, c.cards);
      eq(g.ok, c.ok, `s16 option "${o.text.slice(0, 40)}"`);
      eq(o.correct === true, c.ok, 's16 only the working route is right');
      if (!c.ok) eq(g.run.steps.find((s) => !s.ok).code, c.code, `s16 route fails with ${c.code}`);
    }
    // mechanisms in s07 and s15: built from the engine and chain-checked
    for (const sid of ['s07', 's15']) {
      const st = stepOf(sid);
      const mech = st.config.mech;
      eq(MC.checkMechanism(mech), [], `${sid} mechanism checks`);
      ok(MC.balanced(st.reaction.reactants, st.reaction.products), `${sid} reaction balances`);
    }
    eq(flat(stepOf('s07').config.mech.products[0]), flat('C=C(C)Br'), 's07 product is 2-bromopropene');
    eq(stepOf('s07').config.mech.steps.length, 2, 's07: two steps');
    eq(stepOf('s15').config.mech.steps.map((s) => s.arrows.length), [2, 2], 's15: four arrows, two per step');
    eq(stepOf('s15').config.mech.products.slice().sort(), [canon('CC#C'), canon('[Br-]')].sort(), 's15 ends at propyne + Br-');
    eq(stepOf('s15').config.mode, 'draw', 's15: the learner draws the acetylide arrows');
    // worked example: the moves lead to the engine product
    {
      const w = stepOf('s17');
      ok(w.type === 'worked' && w.moves.length >= 3 && w.moves.every((m) => m.options.filter((x) => x.correct).length === 1), 's17 worked example with learner-chosen moves');
      const g = R.gradeSequence('C#C', 'CCCCC(C)=O', ['NaNH2', 'BuBr', 'H2O_Hg']);
      ok(g.ok, 's17: the sequence of the last move works');
      eq(canon(w.moves[2].figure.smiles), canon(R.predictAlkyne('CCCCC#C', 'H2O_Hg').products[0]), 's17 final figure = hydration of hex-1-yne');
      eq(R.predictAlkyne('CC#CCCC', 'H2O_Hg').outcome, 'mixture', 's17: hex-2-yne gives a mixture (the trap in move 1)');
      eq(R.predictAlkyne('CCCCC#C', 'H2O_Hg').outcome, 'single', 's17: hex-1-yne gives one methyl ketone');
    }
    // s18 is the planner; s19 the lab
    ok(stepOf('s18').widget === 'synthesis-planner' && stepOf('s19').widget === 'reaction-lab' && stepOf('s15').widget === 'mechanism-player', 'planner, lab and mechanism-player steps');
    ok(stepOf('s18').config.deck.every((id) => R.CARDS[id]) && new Set(stepOf('s18').config.deck).size === stepOf('s18').config.deck.length, 's18 deck of known, distinct cards');
    // s04 typed name
    {
      const s = stepOf('s04'); const nb = nameBothAny(s.smiles);
      ok(s.answer === nb.new && s.accept.includes(nb.old), 's04 answer and accepted old name come from the naming engine');
      nameQueue.push({ name: nb.new, smiles: s.smiles, label: 's04 new' }, { name: nb.old, smiles: s.smiles, label: 's04 old' });
    }
    // <name> tags and <mol> labels: both styles are the same compound for OPSIN, and the engine writes exactly this pair
    for (const s of L.steps) for (const str of strings(s)) {
      for (const m of str.matchAll(/<name new="([^"]*)" old="([^"]*)"/g)) {
        nameQueue.push({ name: m[1], smiles: null, label: `${s.id} name tag new`, pair: m[2] }, { name: m[2], smiles: null, label: `${s.id} name tag old`, pair: m[1] });
      }
      for (const m of molsIn(str)) if (m.label && /^\(?[EZ]?\)?-?[0-9a-z,\-]+(ene|yne|ane|one)$/.test(m.label) && !/\s/.test(m.label)) nameQueue.push({ name: m.label, smiles: m.smiles, label: `${s.id} <mol> label` });
    }
    // every drawn answer in the lesson is a molecule and the graded text names real book problems only
    for (const s of L.steps) for (const str of strings(s)) for (const m of molsIn(str)) ok(canon(m.smiles) !== null, `${s.id} mol ${m.smiles} parses`);
  }

  // ================================================================ 10. OPSIN round trips (one batch)
  {
    const res2 = opsin(nameQueue.map((q) => q.name));
    let n = 0, good = 0;
    for (const q of nameQueue) {
      n++;
      const out = res2[q.name];
      if (q.smiles === null) { const o2 = res2[q.pair]; const match = !!out && !!o2 && canon(out) === canon(o2); if (match) good++; ok(match, `OPSIN: name tag "${q.name}" and "${q.pair}" are the same compound`); continue; }
      const match = !!out && canon(out) === canon(q.smiles);
      if (match) good++;
      ok(match, `OPSIN round-trip (${q.label}): "${q.name}" -> ${out || 'unparsed'} expected ${canon(q.smiles)}`);
    }
    console.log(`  OPSIN round-trips (lesson 12): ${good}/${n} names (${new Set(nameQueue.map((q) => q.name)).size} distinct); fixture matches ${fxMatch}/${fx.length}`);
    ok(n >= 150 && good === n, `OPSIN agreed on all ${n} names`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
