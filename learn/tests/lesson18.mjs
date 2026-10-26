// Lesson 18 checks: "Substitution and elimination" (McMurry ch. 7, sections 7.1 to 7.9; engine/reactions-halides.js, engine/generators-halides.js). Nothing chemical in the lesson is typed
// by hand: a drawn answer was produced by the engine, and an option's `chk` names the engine call and the wrong-answer kind, which this file RECOMPUTES (canonical SMILES).
//  (1) registration, schema, step types in order (act first: every explain follows an action), skills, useIt, no scene wiring yet (the `// scene NN` comments only);
//  (2) the three mechanism steps (SN2, SN1, E2): checkMechanism, stored arrows graded right, step and arrow counts, products, balanced reactions;
//  (3) every drawn / chk answer recomputed through the engine (SN2 inversion, SN1 racemate, E2 Zaitsev and the chair rule, E1, Grignard + D2O, alcohol + PBr3), the decision table,
//      the leaving-group, class, solvent, rate and counting steps recomputed from their tables;
//  (4) the energy diagrams validate (real hills, a real valley, the first SN1 hill the highest, the overlay has the same number of levels);
//  (5) the chair model of s21 (trans- and cis-1-bromo-2-methylcyclohexane): roles and the H-C-C-Br dihedrals MEASURED from the coordinates, against the engine's chair rule;
//  (6) the `halides` generator: 60 problems per task family with every answer recomputed, the 7.9 pairs it may ask, skills, pinned tasks, hints and derive lines;
//  (7) caveman twins line up, recap card, glossary terms, hub links, text limited to McMurry 7.1-7.9, names checked with OPSIN.
// Run on its own with `node tests/lesson18.mjs` (from learn/), or as part of run.mjs.
import { optionNames, optionSmiles, checkInput } from '../engine/steps.js';
import { ready, canon } from '../engine/chem.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import * as arrow from '../engine/widgets/arrow-core.js';
import * as MC from '../engine/widgets/mechanism-core.js';
import * as EC from '../engine/widgets/energy-core.js';
import * as CC from '../engine/widgets/chair-core.js';
import * as G3 from '../engine/widgets/geom.js';
import { WIDGETS } from '../engine/widgets/index.js';
import * as R from '../engine/reactions.js';
import { nameMol } from '../engine/generators-naming-levels.js';
import { tetraInfo } from '../engine/cip.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import { HALIDE_SKILLS, HALIDE_TASKS, whichCases } from '../engine/generators-halides.js';
import { skillLabel, skillRule } from '../engine/skills.js';
import { RECAP } from '../engine/recap.js';
import { GLOSSARY, termsIn } from '../engine/glossary.js';
import { HUB_CARDS, HUB_BY_ID } from '../engine/reaction-hub.js';
import { SCENES } from '../scenes/scene-index.js';
import { ACID } from '../engine/acidbase.js';
import { molProblem } from './text.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const strings = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach((x) => strings(x, out)); else if (o && typeof o === 'object') Object.values(o).forEach((x) => strings(x, out)); return out; };
const visible = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach((x) => visible(x, out)); else if (o && typeof o === 'object') Object.entries(o).forEach(([k, x]) => { if (k !== 'chk') visible(x, out); }); return out; };
const BAD_TEXT = /undefined|\[object|\bNaN\b(?![₀-₉])/;
const molsIn = (html) => [...String(html).matchAll(/<mol smiles="([^"]+)"(?: label="([^"]*)")?/g)].map((m) => ({ smiles: m[1], label: m[2] || '' }));
const strip = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const words = (h) => strip(h).split(' ').filter(Boolean).length;
const tryOf = (f) => { try { return f(); } catch (e) { return null; } };
const canonList = (xs) => xs.map((s) => canon(s)).sort();
const drawnOf = (o) => (o.smiles ? [o.smiles] : molsIn(o.text || '').map((m) => m.smiles));

export async function lesson18({ ok, eq }) {
  await ready();
  const L = LESSONS.find((l) => l.id === '18');
  const src = fs.readFileSync(path.join(HERE, '..', 'lessons', '18-substitution-elimination.js'), 'utf8');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-l18-'));
  const opsin = (names) => {
    const uniq = [...new Set(names)];
    const inp = path.join(tmp, 'in.json'), out = path.join(tmp, 'out.json');
    fs.writeFileSync(inp, JSON.stringify(uniq));
    execFileSync('python3', ['-I', path.join(HERE, '..', 'tools', 'check_names.py'), inp, out], { stdio: ['ignore', 'ignore', 'ignore'] });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const nameQueue = [];
  const stepOf = (id) => L.steps.find((s) => s.id === id);

  // ================================================================ 1. registration, schema, order
  ok(!!L && L.slug === 'substitution-elimination' && L.drawing === 'skeletal' && L.chapter === 7, 'L18 registered, skeletal drawing, chapter 7');
  eq(L.sections, ['7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '7.7', '7.8', '7.9'], 'L18 covers McMurry 7.1 to 7.9');
  eq(L.steps.map((s) => s.id), Array.from({ length: 30 }, (_, i) => 's' + String(i + 1).padStart(2, '0')), 'L18 has thirty steps s01-s30');
  ok(L.minutes >= 35 && L.minutes <= 45, 'L18 35-45 minutes');
  ok(L.mastery.generator === 'halides' && L.mastery.count === 3 && GENERATORS.halides === true, 'L18 mastery generator is `halides`, three problems');
  eq(L.useIt.book.slice(0, 9), ['7.25', '7.29', '7.30', '7.31', '7.32', '7.34', '7.44', '7.45', '7.51'], 'L18 useIt: the assigned problems first');
  eq(L.useIt.book.slice(9), ['7.9', '7.14', '7.16', '7.19', '7.47', '7.55'], 'L18 useIt: then the in-chapter and general problems');
  ok(L.useIt.book.every((x) => /^7\.\d+$/.test(x) && Number(x.split('.')[1]) >= 1 && Number(x.split('.')[1]) <= 63) && new Set(L.useIt.book).size === L.useIt.book.length, 'L18 useIt numbers are Chapter 7 items, numbers only, no repeats');
  ok(L.useIt.endFrom === 20 && typeof L.useIt.note === 'string' && L.useIt.note.length > 100, 'L18 useIt splits in-chapter and end-of-chapter at 20 and has a note');
  eq(L.steps.map((s) => s.type).join(' '), 'predict input explain predict try predict explain input choice choice choice predict try predict explain input try predict try explain choice predict explain worked choice predict explain predict explain input', 'L18 step types in order');
  for (const k of ['sn2', 'sn1', 'e2', 'e1', 'sub-vs-elim', 'grignard', 'halide-naming']) { ok(generatorForSkill(k) === 'halides', `skill ${k} is practised with the halides generator`); ok(skillLabel(k) !== k && skillRule(k).length > 60, `skill ${k} has a label and a rule`); }
  ok(L.steps.every((s) => ['halide-naming', 'sn2', 'sn1', 'e2', 'e1', 'sub-vs-elim', 'grignard', 'mechanism', 'energy-diagram'].includes(s.skill)), 'L18 skills are chapter-7 skills, mechanism or energy-diagram');
  ['sn2', 'sn1', 'e2', 'e1', 'sub-vs-elim', 'grignard', 'halide-naming', 'mechanism', 'energy-diagram'].forEach((k) => ok(L.steps.some((s) => s.skill === k), `L18 trains ${k}`));
  // act first: the lesson opens with a prediction, and an explain card never follows another explain card
  ok(L.steps[0].type === 'predict' && L.steps.findIndex((s) => s.type === 'explain') >= 2, 'L18 predicts before it explains');
  ok(L.steps.every((s, i) => s.type !== 'explain' || (i > 0 && L.steps[i - 1].type !== 'explain')), 'L18 no explain card follows another explain card (the learner acts in between)');
  // scene hooks: comments only (scenes 22-25 are piece 3)
  for (const [step, scene] of [['s06', 22], ['s13', 23], ['s19', 24], ['s23', 25]]) ok(new RegExp(`// scene ${scene} [^\\n]*\\n\\s*caveman:[^\\n]*\\n\\s*id: '${step}'`).test(src), `the // scene ${scene} comment sits right before step ${step}`);
  ok(SCENES.every((s) => !/^2[2-5]-/.test(s.id)) && !SCENES.some((s) => s.lesson.some((l) => l.id === '18')), 'no scene 22-25 is wired yet (piece 3)');
  // every graded step: one correct option, a why on each, two hints, worked, options of similar length
  for (const s of L.steps) {
    const t = s.id;
    if (s.options) {
      ok(s.options.filter((o) => o.correct).length === 1 && s.options.length === 4, `${t}: four options, one correct`);
      ok(s.options.every((o) => o.why && strip(o.why).length >= 40 || o.correct), `${t}: every wrong option explains itself in 40+ characters`);
      const names = optionNames(s.options);
      ok(new Set(names.filter(Boolean)).size === names.filter(Boolean).length, `${t}: option names are distinct`);
    }
    if (['choice', 'input', 'try'].includes(s.type)) ok(s.hints.length === 2 && s.hints.every((h) => h.length > 20) && s.worked.length > 40, `${t}: two hints and a worked answer`);
    if (s.type === 'predict') ok(s.reveal.length > 40, `${t}: reveal after the guess`);
    if (s.type === 'explain') ok(words(s.html) <= 80, `${t}: explain card of at most 80 words (${words(s.html)})`);
  }
  {
    // the right answer is not the longest text option more than half the time, and the correct position moves
    let longest = 0, n = 0;
    for (const s of L.steps.filter((x) => x.options && !x.options.some((o) => o.smiles || /<mol/.test(o.text || '')))) { const lens = s.options.map((o) => strip(o.text).length); n++; const ci = s.options.findIndex((o) => o.correct); if (lens[ci] === Math.max(...lens) && lens.filter((x) => x === lens[ci]).length === 1) longest++; }
    ok(n >= 5 && longest / n <= 0.5, `the correct text option is rarely the strictly longest (${longest} of ${n})`);
    const pos = L.steps.filter((x) => x.options).map((s) => s.options.findIndex((o) => o.correct));
    ok(new Set(pos).size >= 3, `the correct option is not always in the same place (${pos.join(',')})`);
  }
  ok(!JSON.stringify(L).includes('undefined') && !/\bNaN\b/.test(JSON.stringify(L)), 'L18 no undefined text');

  // ================================================================ 2. the three mechanisms
  {
    const bal = (st) => MC.balanced(st.reaction.reactants, st.reaction.products);
    for (const sid of ['s05', 's13', 's19']) {
      const st = stepOf(sid), mech = st.config.mech;
      eq(MC.checkMechanism(mech), [], `${sid} mechanism checks (atoms and charge, chaining, arrows reproduce the products)`);
      ok(bal(st), `${sid} reaction balances`);
      for (const step of mech.steps) { const g = arrow.grade(MC.stepConfig(step), step.arrows); ok(g.ok, `${sid}: the stored arrows grade as right`); }
      ok(st.widget === 'mechanism-player' && st.config.whatIf === false, `${sid} is a mechanism-player step`);
    }
    const m5 = stepOf('s05').config.mech, m13 = stepOf('s13').config.mech, m19 = stepOf('s19').config.mech;
    eq(m5.steps.length, 1, 's05: SN2 is one step');
    eq(m5.steps[0].arrows.length, 2, 's05: two arrows');
    eq(m5.products.slice().sort(), [canon('CO'), canon('[Br-]')].sort(), 's05 ends at CH3OH + Br-');
    eq(stepOf('s05').config.mode, 'draw', 's05: the learner draws it');
    eq(m13.steps.length, 3, 's13: SN1 with water is three steps');
    eq(m13.steps.map((s) => s.arrows.length), [1, 1, 2], 's13: 1 + 1 + 2 arrows');
    eq(stepOf('s13').config.modes, ['watch', 'draw', 'watch'], 's13: watch, draw the attack, watch');
    eq(m13.steps[0].after.slice().sort(), [canon('C[C+](C)C'), canon('[Br-]')].sort(), 's13 step 1 makes the t-butyl cation and Br-');
    eq(canon(m13.products[0]), canon('CC(C)(C)O'), 's13 ends at 2-methylpropan-2-ol');
    eq(m19.steps.length, 1, 's19: E2 is one step');
    eq(m19.steps[0].arrows.length, 3, 's19: three arrows');
    eq(m19.products.slice().sort(), [canon('C=CC'), canon('O'), canon('[Br-]')].sort(), 's19 ends at propene + H2O + Br-');
    ok(!!m19.steps[0].equiv && m19.steps[0].equiv.length >= 4, 's19: equiv lists the equivalent H atoms and CH3 groups, so any beta H is accepted');
    // the equivalent-arrow variants are accepted: take the second H of the same CH3
    {
      const st = m19.steps[0], cfg = MC.stepConfig(st);
      const h1 = st.arrows[0].to.atom, alt = st.equiv.find((e) => e[h1] != null);
      ok(!!alt, 's19: an equivalent hydrogen exists');
      if (alt) {
        const h2 = alt[h1], K = st.arrows[1].from.bond[1];
        const drawn = [{ ...st.arrows[0], to: { atom: h2 } }, { from: { bond: [h2, K] }, to: st.arrows[1].to }, st.arrows[2]];
        ok(arrow.grade(cfg, drawn).ok, 's19: the other H on the same CH3 is accepted');
      }
    }
    // a wrong draw gets a diagnosis (arrow from H+ / backwards)
    {
      const st = m5.steps[0], cfg = MC.stepConfig(st);
      const wrongArrows = [st.arrows[1], st.arrows[0]];
      ok(!arrow.grade(cfg, [st.arrows[0]]).ok, 's05: one arrow alone is not enough');
      ok(arrow.grade(cfg, [st.arrows[0]]).diagnosis.length > 15, 's05: the missing arrow is explained');
      void wrongArrows;
    }
    // watch step labels (the caption of each step) say what the slow step is
    ok(/slow/.test(m13.steps[0].label) && /k\[RX\]/.test(m13.steps[0].label), 's13 step 1 says slow and rate = k[RX]');
    ok(/k\[RX\]\[Nu\]/.test(m5.steps[0].label) && m19.steps[0].arrows.some((a) => /k\[RX\]\[base\]/.test(a.why)), 'the SN2 caption and the E2 arrow notes give their rate laws');
  }

  // ================================================================ 3. every drawn answer, recomputed
  const D = (pred) => R.halideChoices(pred, { n: 40 });
  function wantFor(c) {
    const pick = (pred) => {
      const list = D(pred);
      if (c.kind === 'major') return list[0];
      if (c.kind === 'enant') return { smiles: [pred.products[c.idx]], correct: false };
      return list.filter((x) => x.kind === c.kind)[c.nth || 0];
    };
    switch (c.call) {
      case 'sn2': return pick(R.predictSN2(...c.args));
      case 'sn1': return pick(R.predictSN1(...c.args));
      case 'e2': return pick(R.predictE2(...c.args));
      case 'e1': return pick(R.predictE1(...c.args));
      case 'grignard': return pick(R.grignard(...c.args));
      case 'alcohol': return pick(R.fromAlcohol(...c.args));
      default: return null;
    }
  }
  let nChk = 0;
  for (const s of L.steps) {
    const lists = s.type === 'worked' ? s.moves.map((m) => m.options) : s.options ? [s.options] : [];
    for (const opts of lists) for (const o of opts) {
      const c = o.chk;
      ok(!!c, `${s.id}: every option carries its engine check`);
      if (!c) continue;
      nChk++;
      if (c.call === 'text') { ok(!o.correct, `${s.id}: a hand-reasoned distractor is never the right answer`); continue; }
      if (['sn2', 'sn1', 'e2', 'e1', 'grignard', 'alcohol'].includes(c.call)) {
        const want = wantFor(c);
        ok(!!want, `${s.id} kind ${c.kind} exists in the engine`);
        if (!want) continue;
        if (drawnOf(o).length) eq(canonList(drawnOf(o)), canonList(want.smiles), `${s.id} ${c.kind}: drawn answer = engine answer`);
        eq(!!o.correct, !!want.correct, `${s.id} ${c.kind}: correctness`);
        molsIn(o.text || '').forEach((m) => m.label && nameQueue.push({ name: m.label, smiles: m.smiles, label: `${s.id} mol label` }));
        if (o.smiles && o.label) nameQueue.push({ name: o.label, smiles: o.smiles, label: `${s.id} option label` });
        // an (R) / (S) in a label is the letter cip.js reads from the drawing
        for (const [smi, lab] of [...molsIn(o.text || '').map((m) => [m.smiles, m.label]), ...(o.smiles ? [[o.smiles, o.label || '']] : [])]) {
          const m = /^\(([RS])\)-/.exec(lab);
          if (m) { const cs = tetraInfo(smi).filter((t) => t.center); eq(cs.map((t) => t.label), [m[1]], `${s.id}: label "${lab}" matches the drawing's CIP letter`); }
        }
      }
    }
  }
  ok(nChk >= 60, `${nChk} options carry an engine check`);
  // s01 classes
  for (const o of stepOf('s01').options) eq(!!o.correct, R.halideSites(o.chk.sub).cls === o.chk.cls, `s01 class ${o.chk.cls}`);
  eq(R.halideSites('CCC(C)Br').cls, 2, 's01: 2-bromobutane is a 2° halide');
  // s02 the name comes from the naming engine and OPSIN
  {
    const s = stepOf('s02');
    eq(s.answer, nameMol(s.smiles, 'new'), 's02 answer = the naming engine, new style');
    eq(nameMol(s.smiles, 'old'), s.answer, 's02 the old style gives the same name');
    nameQueue.push({ name: s.answer, smiles: s.smiles, label: 's02' });
    ok(checkInput(s, 'bromo-4-methylpentane').ok === false && checkInput(s, '2-Bromo-4-methylpentane').ok && checkInput(s, '2 bromo 4 methyl pentane').ok, 's02 typed answer: case, spaces and hyphens do not matter');
    for (const d of s.diagnose) ok(checkInput(s, d.match).diagnosis === d.why, `s02 diagnosis for ${d.match}`);
    ok(R.halideSites(s.smiles).cls === 2, 's02 the molecule is a 2° bromide');
  }
  // s04: the text options are reasoned; the right one is the engine's product
  eq(R.predictSN2('CBr', 'HO').product, 'CO', 's04: HO- + CH3Br gives CH3OH');
  // s06: (R) bromide + I- -> (S) iodide, letters from cip.js, priorities keep their order
  {
    const p = R.predictSN2('CC[C@@H](C)Br', 'I');
    eq([p.labels.before, p.labels.after, p.inverted, p.sameOrder], ['R', 'S', true, true], 's06: (R)-2-bromobutane gives (S)-2-iodobutane, inverted');
  }
  // s08 / s16 rate arithmetic
  eq(stepOf('s08').answer, 2 * 3, 's08: SN2 rate x2 x3 = 6');
  eq(stepOf('s16').answer, 2, 's16: SN1 rate follows [RX] only: x2 (the nucleophile factor of 1/2 changes nothing)');
  for (const sid of ['s08', 's16']) { const s = stepOf(sid); ok(checkInput(s, String(s.answer)).ok && s.diagnose.every((d) => !checkInput(s, String(d.match)).ok && checkInput(s, String(d.match)).diagnosis === d.why), `${sid}: the answer is accepted, every wrong number routes to its own why`); }
  ok(stepOf('s08').diagnose.some((d) => d.match === 2 + 3) && stepOf('s16').diagnose.some((d) => d.match === 2 * 0.5), 's08 catches 2+3, s16 catches 2×1/2');
  // s09: the SN2 ladder
  {
    const s = stepOf('s09'), rows = s.options.map((o) => ({ o, sub: o.chk.sub, feasible: !!tryOf(() => R.predictSN2(o.chk.sub, 'I')), cls: R.halideSites(o.chk.sub).cls }));
    const best = rows.filter((r) => r.feasible).reduce((b, r) => (r.cls < b.cls ? r : b));
    ok(rows.find((r) => r.o.correct) === best, 's09: the right answer is the SN2-feasible halide with the lowest class (methyl)');
    eq(rows.filter((r) => !r.feasible).map((r) => r.sub).sort(), ['Brc1ccccc1', 'CC(C)(C)Br'], 's09: the 3° halide and the aryl halide cannot do SN2 (engine refusal)');
    eq(new Set(rows.map((r) => r.cls)).size >= 3, true, 's09: the options span several classes');
  }
  // s10: leaving groups
  {
    const s = stepOf('s10'), RANK = ['I', 'Br', 'Cl', 'F', 'HO', 'NH2'];
    const best = s.options[0].chk.ids.slice().sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b))[0];
    for (const o of s.options) { eq(!!o.correct, o.chk.best === best, `s10 ${o.chk.best}`); eq(R.betterLeaving(best, o.chk.best), o.chk.best === best ? null : best, `s10: betterLeaving(${best}, ${o.chk.best})`); }
    ok(ACID.hcl.pka === -7 && ACID.water.pka === 15.74, 's10: the pKa values quoted (HCl -7, water 15.74) are the Lesson 03 table values');
    eq(R.LEAVING.map((l) => l.id), RANK, 'LEAVING runs I Br Cl F HO NH2');
  }
  // s11: strong anionic nucleophile in a polar aprotic solvent
  {
    const s = stepOf('s11');
    const fast = s.options.filter((o) => R.NUCLEOPHILES[o.chk.nu].nuc === 'strong' && o.chk.solvent === 'aprotic');
    eq(fast.length, 1, 's11: exactly one flask has a strong nucleophile in an aprotic solvent');
    ok(fast[0].correct && /DMSO/.test(fast[0].text), 's11: it is the right answer (NaCN in DMSO)');
    ok(!R.NUCLEOPHILES.CN.protic && R.NUCLEOPHILES.CN.nuc === 'strong' && R.NUCLEOPHILES.MeOH.nuc === 'weak' && R.NUCLEOPHILES.MeOH.protic && R.NUCLEOPHILES.H2O.nuc === 'weak', 's11: CN- strong, CH3OH and H2O weak (engine table)');
    ok(R.predictSN2('CCCCBr', 'CN').product === 'CCCCC#N', 's11: 1-bromobutane + CN- is a plain SN2');
  }
  // s12 / s14 / s22: the SN1 and E1 outcomes
  {
    eq(R.predictSN1('CC(C)(C)Br', 'H2O').products, ['CC(C)(C)O'], 's12: tBuBr + H2O gives tBuOH');
    ok(!!tryOf(() => R.predictSN2('CC(C)(C)Br', 'HO')) === false, 's12: SN2 is refused at a 3° carbon (the prompt says so)');
    const p14 = R.predictSN1('CCC[C@](C)(Br)CC', 'H2O');
    ok(p14.racemic && p14.products.length === 2, 's14: the alcohol is a racemate');
    eq(p14.products.length, 2, 's14: both enantiomers');
    const d22 = R.decide('CC(C)(C)Br', 'EtOH');
    eq(d22.mechs, ['SN1', 'E1'], 's22: ethanol with no base gives SN1 and E1');
    eq(d22.products.map((x) => canon(x.smiles)), [canon('CCOC(C)(C)C'), canon('C=C(C)C')], 's22: the ether and the alkene');
    for (const o of stepOf('s22').options.slice(0, 3)) {
      const c = o.chk;
      if (c.only === undefined) { ok(!!o.correct && JSON.stringify(c.mechs) === JSON.stringify(d22.mechs), 's22: both products is right'); eq(canonList(drawnOf(o)), canonList(d22.products.map((x) => x.smiles)), 's22: both drawn'); }
      else { ok(!o.correct, 's22: a single product is wrong'); eq(canonList(drawnOf(o)), [canon(d22.products[c.only].smiles)], `s22: only the ${c.only ? 'alkene' : 'ether'}`); }
    }
  }
  // s18 / s25: Zaitsev counts
  {
    const p = R.predictE2('CCC(C)(C)Br', 'KOH');
    const sub = (smi) => p.alkenes.find((a) => canon(a.smiles) === canon(smi)).subst;
    eq([sub('CC=C(C)C'), sub('C=C(C)CC')], [3, 2], 's18: 2-methylbut-2-ene has three carbon groups on the C=C, 2-methylbut-1-ene two');
    eq(p.major, ['CC=C(C)C'], 's18: Zaitsev alkene is major');
  }
  // s24 / s25: the decision table
  for (const sid of ['s24', 's25']) {
    const lists = stepOf(sid).type === 'worked' ? stepOf(sid).moves.map((m) => m.options) : [stepOf(sid).options];
    for (const opts of lists) {
      const [sub, reagent] = opts[0].chk.args;
      const d = R.decide(sub, reagent);
      ok(d.ok && !d.noReaction, `${sid}: decide(${sub}, ${reagent}) reacts`);
      for (const o of opts) {
        const want = o.chk.major;
        if (o.chk.wrongAlkene) { ok(!o.correct && d.major === 'E2' && d.products.some((x) => x.role === 'minor' && canon(x.smiles) === canon('C=C(C)CC')), `${sid}: the minor-alkene distractor names the real minor alkene`); continue; }
        eq(!!o.correct, want !== null && d.major === want, `${sid} ${sub} + ${reagent}: option ${want} correctness`);
      }
      ok(opts.filter((o) => o.correct).length === 1, `${sid}: one right mechanism`);
    }
  }
  eq(R.decide('CCC(C)Br', 'NaOEt').major, 'E2', 's24 move 1: 2° + NaOEt is E2');
  eq([R.decide('CC(C)(Br)c1ccccc1', 'MeOH').major, R.halideSites('CC(C)(Br)c1ccccc1').benzylic, R.halideSites('CC(C)(Br)c1ccccc1').cls], ['SN1', true, 3], 's24 move 2: a 3° benzylic halide in methanol is SN1');
  eq(R.decide('CCCCBr', 'CN').major, 'SN2', 's24 move 3: 1° + NaCN is SN2');
  eq(R.decide('CCC(C)(C)Br', 'NaOMe').major, 'E2', 's25: 3° + NaOCH3 is E2');
  ok(ACID.hcn.pka === 9.31, 's24: HCN pKa 9.31 is the table value');
  // s26: Grignard + D2O
  { const g = R.grignard('BrC1CCCCC1'); eq(g.protonolysis.D2O, canon('[2H]C1CCCCC1'), 's26: deuteriocyclohexane'); ok(/\[2H\]/.test(g.protonolysis.D2O) && g.protonolysis.H2O === 'C1CCCCC1', 's26: D2O puts D, H2O would put H'); }
  // s28: (S)-pentan-2-ol + PBr3 -> (R)-2-bromopentane, the letters from cip.js
  { const f = R.fromAlcohol('CCC[C@H](C)O', 'PBr3'); eq([f.labels.before, f.labels.after, f.inverted, f.sameOrder, f.product], ['S', 'R', true, true, 'CCC[C@@H](C)Br'], 's28: (S) alcohol gives (R) bromide with inversion'); }
  // s30: monochlorination of 2-methylpentane
  {
    const list = R.monohalogenation('CCCC(C)C', 'Cl');
    eq(list.length, 5, 's30: five different monochloro products');
    eq(stepOf('s30').answer, list.length, 's30 answer = the engine count');
    eq(list.filter((e) => e.chiral).length, 3, 's30: three of them are chiral (said in the confirm line)');
    ok(/Three of the five/.test(stepOf('s30').confirm), 's30 confirm states the chiral count');
    eq(list.reduce((n, e) => n + e.nH, 0), 14, 's30: all fourteen H atoms of C6H14 are accounted for');
  }

  // ================================================================ 4. the energy diagrams
  {
    const s15 = stepOf('s15').visual.config, s17 = stepOf('s17'), ref = s17.visual.config;
    for (const [lv, name] of [[s15.levels, 's15 main'], [s15.overlay.levels, 's15 overlay'], [s17.config.levels, 's17 tasks'], [ref.levels, 's17 SN2 reference']]) eq(EC.validate(lv), [], `${name}: valid levels (real hills, a real valley)`);
    eq(s15.overlay.levels.length, s15.levels.length, 's15: the overlay has the same number of levels (the widget throws otherwise)');
    ok(s15.overlay.levels[1].E > s15.levels[1].E && s15.overlay.levels[2].E > s15.levels[2].E, 's15: the 2° cation and its hill sit higher than the 3° ones');
    const sn1 = s17.config.levels;
    eq(EC.steps(sn1).length, 2, 's17: SN1 has two steps');
    eq(EC.rdsStep(sn1).n, 1, 's17: the first hill is the rate-determining step');
    ok(EC.consistent(sn1), 's17: the highest hill also has the largest Eact');
    eq(EC.steps(ref.levels).length, 1, 's17 reference: SN2 has one step and no intermediate');
    eq(EC.intermediateIndexes(ref.levels), [], 's17 reference: no valley');
    eq(EC.intermediateIndexes(sn1).length, 1, 's17: one valley, the carbocation');
    ok(/llustrative/.test(s17.config.caption) && /llustrative/.test(ref.caption) && /llustrative/.test(s15.caption), 'the energy numbers are captioned illustrative');
    // every task of s17 is answerable (computed in energy-core)
    for (const t of s17.config.tasks) { const name = typeof t === 'string' ? t : t.task; ok(['ts', 'intermediate', 'rds', 'nsteps'].includes(name), `s17 task ${name} exists`); }
    ok(EC.gradeTask(sn1, 'nsteps', 2).ok === true && EC.gradeTask(sn1, 'rds', EC.rdsStep(sn1).ts).ok === true, 's17: the widget grades 2 steps and the first hill as right');
    ok(WIDGETS['energy-diagram'] && WIDGETS['chair-flip'] && WIDGETS['mechanism-player'], 'the widgets of L18 are registered');
  }

  // ================================================================ 5. the chair model of s21
  {
    const v = stepOf('s21').visual;
    eq([v.widget, v.config.mode, v.config.model, v.config.highlight], ['chair-flip', 'explore', 'bm-trans-12', 3], 's21 shows the trans model, Br circled');
    const tr = CC.load('bm-trans-12'), ci = CC.load('bm-cis-12');
    const poolStereo = (id) => R.E2_RING_POOL.filter((h) => h.id.startsWith('(1') && h.id.endsWith('-1-bromo-2-methylcyclohexane')).filter((h) => h.ring === id).map((h) => canon(h.smiles));
    ok(poolStereo('trans').includes(canon(tr.entry.smiles)), 'bm-trans-12 is trans-1-bromo-2-methylcyclohexane (one enantiomer of the pool entry)');
    ok(poolStereo('cis').includes(canon(ci.entry.smiles)), 'bm-cis-12 is cis-1-bromo-2-methylcyclohexane (one enantiomer of the pool entry)');
    for (const [m, rel] of [[tr, 'trans'], [ci, 'cis']]) {
      ok(canon(m.entry.a) === canon(m.entry.smiles) && canon(m.entry.b) === canon(m.entry.smiles), `${m.id}: both conformers keep the stereochemistry (read back from the 3D coordinates)`);
      eq(m.els[3], 'Br', `${m.id}: atom 3 is the Br`); eq(m.els[0], 'C', `${m.id}: atom 0 is the CH3`);
      eq(CC.cisTrans(m, 'a'), rel, `${m.id}: measured as ${rel}`);
    }
    // roles from the coordinates
    eq([CC.pattern(tr, 'a'), CC.pattern(tr, 'b')], ['ee', 'aa'], 'trans: one chair is diequatorial, the other diaxial');
    eq([CC.pattern(ci, 'a'), CC.pattern(ci, 'b')], ['ea', 'ae'], 'cis: every chair has one axial group');
    const c1 = 2, br = 3;
    const dihedrals = (m, w) => { const pts = CC.coords(m, w); return m.nb[c1].filter((k) => m.ring.includes(k)).map((b) => ({ beta: b, withR: m.nb[b].some((k) => !m.ring.includes(k) && m.els[k] === 'C'), d: m.nb[b].filter((k) => m.els[k] === 'H').map((h) => Math.abs(G3.dihedral(pts[h], pts[b], pts[c1], pts[br]))) })); };
    const brAxial = (m) => ['a', 'b'].find((w) => CC.heavySubs(m, w).find((s) => m.els[s.atom] === 'Br').role === 'a');
    // trans: with the Br axial the CH3 is axial too, the H on that carbon is equatorial (not anti), and only the CH2 neighbour has an anti H
    {
      const w = brAxial(tr), rows = dihedrals(tr, w);
      const me = rows.find((r) => r.withR), ch2 = rows.find((r) => !r.withR);
      ok(CC.pattern(tr, w) === 'aa', 'trans: the Br-axial chair is the diaxial one');
      ok(me.d.length === 1 && me.d.every((x) => x < 100), `trans, Br axial: the H on the CH3 carbon is not anti to the Br (dihedral ${me.d.map(Math.round)})`);
      ok(ch2.d.some((x) => x > 160), `trans, Br axial: the CH2 neighbour has an H anti to the Br (dihedral ${ch2.d.map(Math.round)})`);
      const other = dihedrals(tr, w === 'a' ? 'b' : 'a');
      ok(other.every((r) => r.d.every((x) => x < 100)), 'trans, Br equatorial: no H anywhere is anti to the Br');
      const pred = R.predictE2('C[C@H]1CCCC[C@@H]1Br', 'KOH');
      ok(pred.major.length === 1 && pred.minor.length === 0 && pred.ringBlocked.length === 1, 'engine: trans gives one alkene and the Zaitsev alkene is blocked');
      eq(canon(pred.ringBlocked[0].smiles), canon('CC1=CCCCC1'), 'engine: the blocked alkene is 1-methylcyclohexene, the one through the CH3 carbon');
      eq(canon(pred.major[0].replace('@@', '@')) === canon('C[C@H]1C=CCCC1') || canon(pred.major[0]) === canon('C[C@@H]1C=CCCC1'), true, 'engine: the alkene that forms is 3-methylcyclohexene (through the CH2 neighbour)');
    }
    // cis: with the Br axial the CH3 is equatorial, so the H on the CH3 carbon is axial and anti: both alkenes can form
    {
      const w = brAxial(ci), rows = dihedrals(ci, w);
      ok(rows.every((r) => r.d.some((x) => x > 160)), `cis, Br axial: both neighbours have an anti H (${rows.map((r) => r.d.map(Math.round))})`);
      const pred = R.predictE2('C[C@H]1CCCC[C@H]1Br', 'KOH');
      ok(pred.alkenes.length === 2 && pred.ringBlocked.length === 0 && pred.major[0] === canon('CC1=CCCCC1'), 'engine: cis gives both alkenes, 1-methylcyclohexene (Zaitsev) major');
    }
    ok(['a', 'b'].every((w) => CC.heavySubs(tr, w).length === 2), 'two heavy substituents (CH3 and Br) in each chair');
  }

  // ================================================================ 6. the `halides` generator
  {
    const BOOK_SKILLS = new Set(HALIDE_SKILLS);
    eq(HALIDE_TASKS.slice().sort(), ['e1', 'e2', 'grignard', 'leaving', 'name', 'prep', 'rate', 'sn1', 'sn2', 'which'], 'ten task families');
    eq(HALIDE_SKILLS.slice().sort(), ['e1', 'e2', 'grignard', 'halide-naming', 'sn1', 'sn2', 'sub-vs-elim'], 'seven skills');
    const NUC_NONBASIC = new Set(['I', 'CN', 'N3', 'MeS', 'HS', 'AcO']);
    const kinds = {};
    const common = (p, tag) => {
      ok(BOOK_SKILLS.has(p.skill), `${tag}: skill ${p.skill} is a chapter-7 skill`);
      ok(Array.isArray(p.hints) && p.hints.length === 2 && p.hints.every((x) => x.length > 20), `${tag}: two hints`);
      ok(typeof p.derive === 'string' && p.derive.length > 50, `${tag}: a derive line (${p.derive ? p.derive.length : 0})`);
      ok(!BAD_TEXT.test(JSON.stringify(p)), `${tag}: no undefined text`);
      if (p.kind === 'choice') {
        ok(p.options.filter((o) => o.correct).length === 1 && p.options.every((o) => o.why && o.why.length > 15), `${tag}: one correct option, a why on each`);
        ok(p.options.length === (p.task === 'which' ? 5 : 4), `${tag}: ${p.options.length} options`);
        ok(p.options.every((o) => !o.smiles || canon(o.smiles) !== null) && p.options.every((o) => molsIn(o.text || '').every((m) => canon(m.smiles) !== null)), `${tag}: every drawn option parses`);
        ok(molProblem(p.options.map((o) => o.text || '').join(' ')) === null, `${tag}: no open <mol> tag`);
      }
    };
    const distinct = (p, tag) => eq(new Set(p.options.map((o) => canonList(drawnOf(o)).join('+'))).size, 4, `${tag}: four different drawings`);
    const right = (p) => p.options.find((o) => o.correct);
    const gen = (task, n, seed) => generate('halides', n, { rng: mulberry32(seed), tasks: [task] });
    for (const task of HALIDE_TASKS) {
      const ps = gen(task, 60, 18);
      eq(ps.length, 60, `${task}: 60 problems`);
      for (const [i, p] of ps.entries()) {
        const tag = `${task} #${i}`;
        kinds[task + ':' + p.kind] = (kinds[task + ':' + p.kind] || 0) + 1;
        if (task !== 'name') common(p, tag);
        eq(p.task, task, `${tag}: the problem says which task it is`);
        if (task === 'sn2') {
          const pred = R.predictSN2(p.sub, p.nu);
          eq(canonList(right(p).products), canonList(pred.products), `${tag}: SN2 right answer = engine`);
          eq(canonList(drawnOf(right(p))), canonList(pred.products), `${tag}: the drawn right answer is the engine's`);
          distinct(p, tag);
          ok(!/ with /.test('') && /SN2/.test(p.derive) && /back-side attack/.test(p.derive), `${tag}: derive states the procedure`);
          if (pred.inverted) { ok(p.options.some((o) => o.kind === 'retention') && p.options.some((o) => o.kind === 'racemic'), `${tag}: a stereo problem offers retention and racemate`); ok(p.derive.includes(`(${pred.labels.before}) becomes (${pred.labels.after})`), `${tag}: derive gives the flipped letters`); }
          ok(R.halideSites(p.sub).cls <= 2 && !(R.halideSites(p.sub).cls === 2 && !R.NUCLEOPHILES[p.nu].protic && R.NUCLEOPHILES[p.nu].base === 'strong'), `${tag}: SN2 asked only for methyl / 1° / 2° with a nucleophile that is not a strong base on 2°`);
        } else if (task === 'sn1') {
          const pred = R.predictSN1(p.sub, p.nu);
          eq(canonList(right(p).products), canonList(pred.products), `${tag}: SN1 right answer = engine`);
          distinct(p, tag);
          if (pred.racemic) ok(right(p).products.length === 2 && p.options.some((o) => o.kind === 'oneEnantiomer' && o.products.length === 1 && pred.products.map(canon).includes(canon(o.products[0]))), `${tag}: a racemate problem offers a single enantiomer as the trap`);
          ok(/SN1/.test(p.derive) && /carbocation/.test(p.derive), `${tag}: derive states the procedure`);
        } else if (task === 'e2') {
          const pred = R.predictE2(p.sub, p.base);
          eq(canonList(right(p).products), canonList(pred.major), `${tag}: E2 right answer = engine Zaitsev product`);
          distinct(p, tag);
          if (pred.ringBlocked.length) { const nb = p.options.find((o) => o.kind === 'notAnti'); ok(!!nb && pred.ringBlocked.some((b) => canon(b.smiles) === canon(nb.products[0])), `${tag}: the chair rule problem offers the blocked alkene as the trap`); ok(/trans/.test(p.derive), `${tag}: derive states the ring rule`); }
          ok(/E2/.test(p.derive) && /anti/.test(p.derive), `${tag}: derive states the procedure`);
        } else if (task === 'e1') {
          const pred = R.predictE1(p.sub);
          eq(canonList(right(p).products), canonList(pred.major), `${tag}: E1 right answer = engine`);
          distinct(p, tag);
          ok(p.options.filter((o) => !o.correct).every((o) => o.products.every((x) => canon(x) !== canon(pred.major[0]))), `${tag}: no wrong option is the right alkene`);
          ok(/E1/.test(p.derive) && /carbocation/.test(p.derive), `${tag}: derive states the procedure`);
        } else if (task === 'which') {
          const d = R.decide(p.sub, p.reagent), s = R.halideSites(p.sub);
          const want = d.noReaction ? 'No reaction' : d.major;
          eq(right(p).text, want, `${tag}: which-mechanism answer = decide()`);
          eq(p.options.map((o) => o.text), ['SN1', 'SN2', 'E1', 'E2', 'No reaction'], `${tag}: the five options`);
          ok(p.reagent !== 'HO', `${tag}: never aqueous NaOH (1° and 2° + NaOH is a mixture)`);
          ok(!(s.cls === 3 && NUC_NONBASIC.has(p.reagent)), `${tag}: never a 3° halide with CN- and the like`);
          ok(!(s.cls <= 2 && !s.benzylic && !s.vinylic && !s.aryl && ['H2O', 'MeOH', 'EtOH'].includes(p.reagent)), `${tag}: never a methyl / 1° / 2° halide with a weak nucleophile`);
          ok(!((s.vinylic || s.aryl) && R.BASES[p.reagent]), `${tag}: an sp² halide is never asked with a base`);
          ok(p.derive.includes(d.reason) && /Class the carbon/.test(p.derive), `${tag}: derive states the procedure and the table line`);
        } else if (task === 'rate') {
          if (p.variant === 'arithmetic') {
            const ans = p.mech === 'SN2' ? p.a * p.b : p.a;
            eq(p.answer, ans, `${tag}: ${p.mech} rate factor ${p.a} × ${p.b} -> ${ans}`);
            ok(p.wrong.every((w) => w.match !== p.answer && w.why.length > 20) && checkInput({ answer: p.answer, accept: p.accept, diagnose: p.wrong }, String(p.answer)).ok, `${tag}: the answer is accepted, the wrong numbers have their own why`);
            ok(p.mech === 'SN1' ? p.wrong.some((w) => w.match === p.a * p.b) || p.b === 1 : p.wrong.some((w) => w.match === p.a + p.b), `${tag}: the classic wrong number is caught`);
          } else {
            const effectOf = (text, sub) => {
              const X = R.halideSites(sub).X, cls = R.halideSites(sub).cls;
              let m;
              if ((m = /leaving group from (\w+) to (\w+)/.exec(text))) return R.betterLeaving(m[2], m[1]) === m[2] ? 'faster' : 'slower';
              if (/DMSO/.test(text)) return p.mech === 'SN2' ? 'faster' : 'slower';
              if (/Double the concentration of the nucleophile/.test(text)) return p.mech === 'SN2' ? 'faster' : 'same';
              if (/Halve the concentration of the nucleophile/.test(text)) return p.mech === 'SN2' ? 'slower' : 'same';
              if (/Double the concentration of the alkyl halide/.test(text)) return 'faster';
              if (/Halve the concentration of the alkyl halide/.test(text)) return 'slower';
              if (/stronger nucleophile/.test(text)) return 'same';
              if (/3° isomer in place of this 2°/.test(text)) return cls === 2 ? 'faster' : 'bad';
              if (/2° isomer in place of this 3°/.test(text)) return cls === 3 ? 'slower' : 'bad';
              if (/2° isomer in place of this halide/.test(text)) return cls === 1 ? 'slower' : 'bad';
              if (/3° halide in place of this halide/.test(text)) return cls === 1 ? 'slower' : 'bad';
              void X;
              return 'unknown';
            };
            const eff = p.options.map((o) => effectOf(o.text, p.sub));
            ok(!eff.includes('unknown') && !eff.includes('bad'), `${tag}: every change has a recomputed effect (${eff})`);
            eq(eff.filter((e) => e === 'faster').length, 1, `${tag}: exactly one change speeds the reaction up`);
            eq(eff[p.options.findIndex((o) => o.correct)], 'faster', `${tag}: the right answer is the one that speeds it up`);
            ok(p.derive.includes(p.mech === 'SN2' ? 'k[RX][Nu]' : 'k[RX]'), `${tag}: derive states the rate law`);
          }
        } else if (task === 'leaving') {
          const RANK = ['I', 'Br', 'Cl', 'F', 'HO', 'NH2'];
          const best = p.ids.slice().sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b))[0];
          eq(p.best, best, `${tag}: best leaving group of ${p.ids}`);
          eq(new Set(p.ids).size, 4, `${tag}: four different ions`);
          eq(right(p).text, R.LEAVING.find((l) => l.id === best).label, `${tag}: the right option is ${best}`);
        } else if (task === 'name') {
          ok(p.skill === 'halide-naming' && p.kind === 'input' ? checkInput({ answer: p.answer, accept: p.accept, name: p.name, smiles: p.smiles, skill: p.skill }, p.answer).ok : p.skill === 'halide-naming', `${tag}: naming problem, typed answer accepted`);
          ok(!!R.halideSites(p.smiles || 'CC', { any: true }) || p.options, `${tag}: a halide`);
          if (p.smiles) ok(/[Fl|Br|I]|Cl|Br|F|I/.test(p.smiles), `${tag}: the molecule has a halogen`);
        } else if (task === 'grignard') {
          if (p.variant === 'product') {
            const pred = R.grignard(p.sub);
            eq(canonList(right(p).products), canonList([pred.protonolysis[p.water]]), `${tag}: Grignard + ${p.water} right answer = engine`);
            distinct(p, tag);
            ok(/Mg/.test(p.derive) && /strong base/.test(p.derive), `${tag}: derive states the procedure`);
          } else {
            const bad = p.options.filter((o) => o.correct);
            eq(bad.length, 1, `${tag}: one halide cannot make a Grignard reagent`);
            ok(tryOf(() => R.grignard(bad[0].smiles)) === null, `${tag}: grignard() refuses the right option`);
            ok(p.options.filter((o) => !o.correct).every((o) => tryOf(() => R.grignard(o.smiles)) && tryOf(() => R.grignard(o.smiles)).ok), `${tag}: grignard() accepts the other three`);
            ok(/acidic H/.test(p.derive), `${tag}: derive states the reason`);
          }
        } else if (task === 'prep') {
          if (p.variant === 'alcohol') {
            const pred = R.fromAlcohol(p.sub, p.reagent);
            eq(canonList(right(p).products), canonList(pred.products), `${tag}: alcohol -> halide right answer = engine`);
            distinct(p, tag);
            if (pred.inverted) ok(p.derive.includes(`(${pred.labels.before}) becomes (${pred.labels.after})`) && p.options.some((o) => o.kind === 'retention'), `${tag}: derive gives the flipped letters and retention is offered`);
            ok(/SN[12]/.test(p.derive), `${tag}: derive names the mechanism`);
          } else {
            const list = R.monohalogenation(p.alkane, p.X);
            eq(p.answer, p.variant === 'chiral' ? list.filter((e) => e.chiral).length : list.length, `${tag}: ${p.variant} count for ${p.alkane} + ${p.X}2`);
            ok(p.answer >= 1 && checkInput({ answer: p.answer, accept: [], diagnose: p.wrong }, String(p.answer)).ok, `${tag}: the number is accepted`);
          }
        }
      }
    }
    // variety
    const gens = HALIDE_TASKS.map((t) => gen(t, 150, 7));
    const by = (t) => gens[HALIDE_TASKS.indexOf(t)];
    ok(new Set(by('sn2').map((p) => p.sub)).size >= 12 && new Set(by('sn2').map((p) => p.nu)).size >= 7, 'sn2: many halides and nucleophiles');
    ok(by('sn2').some((p) => p.pred.inverted) && by('sn2').some((p) => !p.pred.inverted), 'sn2: stereo and flat problems both occur');
    ok(by('sn1').some((p) => p.racemic) && by('sn1').some((p) => !p.racemic) && new Set(by('sn1').map((p) => p.nu)).size === 3, 'sn1: racemic and flat problems, three solvents');
    ok(by('e2').some((p) => p.ring && p.blocked) && by('e2').some((p) => !p.ring) && new Set(by('e2').map((p) => p.base)).size === 3, 'e2: chair-rule problems, plain problems, all three bases');
    ok(new Set(by('e1').map((p) => p.sub)).size >= 4, 'e1: several halides');
    ok(new Set(by('which').map((p) => p.cat)).size === 8 && ['SN1', 'SN2', 'E2', 'none'].every((m) => by('which').some((p) => p.expect === m)), 'which: all eight cells of the table and all four answers occur');
    ok(by('rate').some((p) => p.variant === 'arithmetic' && p.mech === 'SN1') && by('rate').some((p) => p.variant === 'arithmetic' && p.mech === 'SN2') && by('rate').some((p) => p.variant === 'change' && p.mech === 'SN1') && by('rate').some((p) => p.variant === 'change' && p.mech === 'SN2'), 'rate: arithmetic and "which change" for SN1 and SN2');
    ok(new Set(by('leaving').map((p) => p.best)).size >= 3, 'leaving: different best ions');
    ok(by('grignard').some((p) => p.variant === 'product' && p.water === 'D2O') && by('grignard').some((p) => p.variant === 'product' && p.water === 'H2O') && by('grignard').some((p) => p.variant === 'trap'), 'grignard: D2O, H2O and the "which cannot" trap');
    ok(by('prep').some((p) => p.variant === 'alcohol') && by('prep').some((p) => p.variant === 'count') && by('prep').some((p) => p.variant === 'chiral'), 'prep: alcohol, count and chiral-count problems');
    ok(by('name').every((p) => p.skill === 'halide-naming') && by('name').some((p) => p.kind === 'input'), 'name: halide naming problems');
    // the table cells the `which` task may ask
    const cases = whichCases();
    ok(cases.length >= 100 && new Set(cases.map((c) => c.cat)).size === 8, `the which task has ${cases.length} cases in eight cells of the 7.9 table`);
    for (const c of cases) { const d = R.decide(c.sub, c.reagent); ok((d.noReaction ? 'none' : d.major) === c.expect, `which case ${c.sub} + ${c.reagent}: ${c.expect}`); }
    ok(cases.every((c) => c.reagent !== 'HO'), 'which cases never use NaOH');
    // skills and pinned tasks
    for (const skill of HALIDE_SKILLS) {
      const ps = generate('halides', 40, { skill, rng: mulberry32(5) });
      ok(ps.every((q) => q.skill === skill), `skill ${skill} serves only ${skill} problems`);
    }
    for (const t of ['rate', 'prep', 'sn2']) ok(generate('halides', 30, { rng: mulberry32(2), tasks: [t] }).every((q) => q.task === t), `pinned task ${t} serves only ${t}`);
    ok(!!tryOf(() => generate('halides', 1, { tasks: ['nope'] })) === false, 'an unknown task throws');
    eq(new Set(generate('halides', 400, { rng: mulberry32(9) }).map((p) => p.task)).size, 10, 'an unpinned run draws every task');
    const a = generate('halides', 6).map((q) => q.prompt).join('|'), b = generate('halides', 6).map((q) => q.prompt).join('|');
    ok(a !== b, 'fresh problems on each run');
    console.log(`  halides generator: ${HALIDE_TASKS.length * 60} problems (${JSON.stringify(kinds)})`);
  }

  // ================================================================ 7. caveman, recap, glossary, hub, text, names
  for (const s of L.steps) {
    const cv = s.caveman;
    ok(cv && typeof cv === 'object' && Object.keys(cv).length > 0, `${s.id}: has a caveman twin`);
    if (!cv) continue;
    if (s.options && cv.options) eq(cv.options.length, s.options.length, `${s.id}: caveman options line up`);
    if (s.options) ok(!!cv.options && cv.options.every((x) => x && x.why), `${s.id}: every option has a caveman why`);
    if (['choice', 'input', 'try'].includes(s.type)) { ok(cv.hints && cv.hints.length === 2, `${s.id}: two caveman hints`); ok(!!cv.worked, `${s.id}: caveman worked answer`); }
    if (s.type === 'predict') ok(!!cv.prompt && !!cv.reveal, `${s.id}: caveman prompt and reveal`);
    if (s.type === 'explain') ok(!!cv.html, `${s.id}: caveman html`);
    if (s.type === 'worked') { ok(!!cv.problem && !!cv.rule && cv.moves.length === s.moves.length, `${s.id}: caveman problem, rule and moves`); s.moves.forEach((m, k) => eq(cv.moves[k].options.length, m.options.length, `${s.id} move ${k}: caveman options line up`)); }
    // the same drawings in the caveman text (a <mol> in the prompt must survive)
    if (cv.prompt && s.prompt) eq(molsIn(cv.prompt).map((m) => m.smiles), molsIn(s.prompt).map((m) => m.smiles), `${s.id}: the caveman prompt keeps the same drawings`);
  }
  // recap card
  {
    const rc = RECAP['18'];
    ok(rc && rc.length >= 3 && rc.length <= 4, 'recap L18: 3 or 4 facts');
    for (const f of rc) {
      const T = LESSONS.find((x) => x.id === f.n);
      ok(T && parseInt(f.n, 10) < 18 && T.steps.some((x) => x.id === f.step), `recap L18: #lesson-${f.n}/${f.step} is a real step of an earlier lesson`);
      ok(f.fact.length >= 25 && f.fact.length <= 190 && !/\n/.test(f.fact) && molProblem(f.fact) === null, `recap L18: one line (${f.fact.length} characters)`);
    }
    ok(['08', '09', '06', '15'].every((n) => rc.some((f) => f.n === n)), 'recap L18 covers arrows (08), carbocations (09), chairs (06) and R/S (15)');
    eq(LESSONS.find((x) => x.id === '08').steps.find((x) => x.id === rc.find((f) => f.n === '08').step).skill, 'curved-arrows', 'the Lesson 08 link is the arrow-grammar card');
    eq(LESSONS.find((x) => x.id === '06').steps.find((x) => x.id === rc.find((f) => f.n === '06').step).skill, 'chairs', 'the Lesson 06 link is a chairs step');
  }
  // glossary: the seven new terms, the leaving group term from before, no duplicate ids, found in the lesson text
  {
    const ids = ['zaitsev', 'antiperiplanar', 'solvolysis', 'protic', 'aprotic', 'grignard', 'inversion', 'leavinggroup'];
    ids.forEach((id) => ok(GLOSSARY.some((g) => g.id === id), `glossary has ${id}`));
    ok(new Set(GLOSSARY.map((g) => g.id)).size === GLOSSARY.length && GLOSSARY.length === 85, `glossary: 85 unique terms, seven of them new (${GLOSSARY.length})`);
    ok(GLOSSARY.filter((g) => ids.includes(g.id)).every((g) => g.def.length <= 140 && g.forms.length >= 1), 'new glossary terms: at most 140 characters, forms listed');
    const text = L.steps.flatMap((s) => strings(s)).map(strip).join(' ') + ' ' + strip(L.useIt.note);
    const found = new Set(termsIn(text));
    for (const id of ['protic', 'aprotic', 'inversion', 'grignard', 'leavinggroup', 'carbocation', 'racemate', 'zaitsev', 'nucleophile']) ok(found.has(id), `glossary term ${id} occurs in the lesson text`);
    eq(termsIn('an aprotic solvent')[0], 'aprotic', '"aprotic solvent" is read as the aprotic term, not the protic one');
    eq(termsIn('a protic solvent')[0], 'protic', '"protic solvent" is read as the protic term');
    eq(termsIn('anti-periplanar H and Br')[0], 'antiperiplanar', '"anti-periplanar" is read as its own term first');
  }
  // hub links
  {
    const link = { 'sn2-cn': ['s11', undefined], 'sn2-i': ['s06', 's05'], 'sn2-oh': ['s04', 's05'], 'sn2-rs': ['s11', undefined], 'sn1-solvolysis': ['s12', 's13'], 'e2-zaitsev': ['s18', 's19'], 'e2-chair': ['s21', undefined], 'e1-heat': ['s22', undefined], 'grignard-d2o': ['s26', undefined], 'halide-from-alcohol': ['s28', undefined] };
    eq(Object.keys(link), HUB_CARDS.filter((c) => c.group === 'halide').map((c) => c.id), 'the ten halide cards');
    for (const [id, [step, mech]] of Object.entries(link)) {
      const c = HUB_BY_ID[id];
      eq([c.lesson && c.lesson.id, c.lesson && c.lesson.step, c.mech], ['18', step, mech], `${id}: lesson link`);
      ok(!!stepOf(step), `${id}: step ${step} exists`);
      if (mech) ok(stepOf(mech).widget === 'mechanism-player', `${id}: mechanism step ${mech} is a mechanism-player step`);
    }
  }
  // text: McMurry 7.1-7.9 only, no percentages, table pKa values only
  {
    const all = visible(L).join(' ');
    ok(!/E1cB|Hofmann|bulky base|rearrang|hydride shift|methyl shift|Wagner/i.test(all), 'L18 stays inside the book scope (no E1cB, no Hofmann, no rearrangements)');
    ok(!/\d+\s?%/.test(all), 'L18 quotes no percentages');
    const quoted = [...strings(L.steps).join(' ').matchAll(/pKa (?:≈ )?([−-]?\d+(?:\.\d+)?)/g)].map((m) => m[1]);
    ok(quoted.length >= 3 && quoted.every((q) => ['−7', '15.74', '9.31'].includes(q)), `L18 only quotes table pKa values (${[...new Set(quoted)].join(', ')})`);
    for (const s of L.steps) for (const str of strings(s)) { const pr = molProblem(str); ok(pr === null, `${s.id}: ${pr}`); for (const m of molsIn(str)) ok(canon(m.smiles) !== null, `${s.id} mol ${m.smiles} parses`); }
    // the plan's two worked mechanisms exist as steps and the lesson names SN1, SN2, E1 and E2
    ok(['SN1', 'SN2', 'E1', 'E2'].every((m) => all.includes(m)), 'L18 names all four mechanisms');
    for (const s of L.steps) for (const str of strings(s)) for (const m of str.matchAll(/<name new="([^"]*)" old="([^"]*)"/g)) nameQueue.push({ name: m[1], smiles: null, pair: m[2], label: `${s.id} name tag new` }, { name: m[2], smiles: null, pair: m[1], label: `${s.id} name tag old` });
  }
  // OPSIN round trips (one batch)
  {
    const partial = (smi) => { if (!smi) return false; const n = tetraInfo(smi).filter((t) => t.center).length; return (smi.match(/@@?/g) || []).length < n; };   // a drawing with an unmarked stereocentre has a flat name
    const queue = nameQueue.map((q) => ({ ...q, name: q.name.replace(/\s*\(unchanged\)\s*$/, '') })).filter((q) => !/deuterio|magnesium|^trans-|^cis-/.test(q.name) && !partial(q.smiles));
    const res = opsin(queue.map((q) => q.name));
    let good = 0;
    for (const q of queue) {
      const out = res[q.name];
      if (q.smiles === null) { const o2 = res[q.pair]; const m = !!out && !!o2 && canon(out) === canon(o2); if (m) good++; ok(m, `OPSIN: name tag "${q.name}" and "${q.pair}" are the same compound`); continue; }
      const m = !!out && canon(out) === canon(q.smiles);
      if (m) good++;
      ok(m, `OPSIN round-trip (${q.label}): "${q.name}" -> ${out || 'unparsed'} expected ${canon(q.smiles)}`);
    }
    console.log(`  OPSIN round-trips (lesson 18): ${good}/${queue.length} names (${new Set(queue.map((q) => q.name)).size} distinct)`);
    ok(queue.length >= 25 && good === queue.length, `OPSIN agreed on all ${queue.length} names`);
  }
  console.log(`  Lesson 18: ${L.steps.length} steps, ${nChk} engine-checked options`);
  fs.rmSync(tmp, { recursive: true, force: true });
}

// run alone: node tests/lesson18.mjs (from learn/)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await lesson18({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
