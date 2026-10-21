// Mixed predict-the-product drill checks (engine/generators-predict.js, generator `predict-product`, route #practise-predict-product).
//  (1) wiring: skill tag, label, generator registry, routes and links in app.js, every hub card has a drill entry, nothing excluded;
//  (2) 200 seeded problems + every (card, substrate, reagent) pair: exactly one right option, 3 or 4 options, no duplicate drawing (the mirror image of a racemic
//      product counts as the right drawing), every option parses in RDKit (JS) AND in Python RDKit (tools/check_hub.py), every wrong option names the missed fact
//      (adds / where / space) and starts its `why` with ONE SPECIFIC LINE naming the real atom, group or position of that problem (`lead`; the longer reason is `more`; no generic "Slip on ..." opener), hints are a pair, `worked` walks the three facts, consecutive problems use different cards;
//  (3) the right option equals the engine product, recomputed here by calling the engines directly from the problem's card id, substrate and reagent
//      (canonical isomeric SMILES; a racemic product may be drawn as either mirror image);
//  (4) stereo: the card's own `space` (syn / anti) is read back in Python (cis / trans on a ring from 3D coordinates, meso or chiral for but-2-ene, E / Z of an alkyne
//      product) and must match; a chiral product with specified centres is flagged racemic; a wrong "space" option has the same atoms as the right one;
//      The ten workbook B3.1 cards have no engine model: their DRILL entries are `fixed: true`, and for them the right option must equal the hub card's own
//      example product (card.example, or card.example2 for the second substrate), canonical SMILES. Everything else (parse, distinct, tagged wrong options) is the same;
//  (4b) alkene-hydroboration: the right option is read back in 3D as the TRANS isomer (OH trans to CH3) and the "space" distractor as CIS;
//  (5) each card's drill answer for the hub card's own example equals the hub card's example product (the fact lives once).
// Run on its own with `node learn/tests/predict.mjs`, or as part of run.mjs.
import { ready, canon } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HUB_CARDS, HUB_BY_ID, HUB_GROUPS } from '../engine/reaction-hub.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import { DRILL, DRILL_IDS, DRILL_EXCLUDED, PREDICT_SKILLS, drillCombos, solveCard, problemFor } from '../engine/generators-predict.js';
import * as R from '../engine/reactions.js';
import { CARDS } from '../engine/synthesis.js';
import { skillLabel, skillRule, SKILLS } from '../engine/skills.js';
import * as store from '../engine/store.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.join(HERE, '..', 'tools');
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const comps = (smiles) => smiles.split('.').map((s) => canon(s)).sort();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const mirrorComps = (list) => list.map((s) => canon(R.mirror(s))).sort();
/** a wrong option's first line must name something concrete: an atom, a group, a bond or a position word */
const CONCRETE = /(Br|Cl|OH|CH₃|CO₂H|NO₂|SO₃H|NH₂|H₂|carbon|face|Markovnikov|meta|ortho|para|ring|C=C|C=O|C≡C|alkene|alkane|alkyne|alkyl|ketone|aldehyde|enol|epoxide|diol|cation|syn|anti|cis|trans|geminal|R group|\bH\b|\bD\b|\bO\b)/;
const SLIP_START = { adds: 'Slip on WHAT adds', where: 'Slip on WHERE it adds', space: 'Slip on HOW it adds in space' };

/** The engine's products for a problem, computed from the card id, substrate and reagent (the hub test's engine calls, not the generator's choice helpers). */
function engineProducts(p) {
  const id = p.card, sub = p.substrate, rg = p.reagent, hal = p.halide;
  switch (id) {
    case 'eas-bromination': case 'eas-nitration': case 'eas-sulfonation': case 'fc-alkylation': case 'fc-acylation':
    case 'director-activating': case 'director-halogen': case 'director-meta': {
      const can = canon(sub);
      if (can === R.BENZENE) return R.predictEAS(sub, rg, hal).products;
      const q = R.predictSubst(sub, rg, hal);
      return q.ok ? q.products : null;
    }
    case 'side-chain-kmno4': return [R.oxidizeSideChain(sub).product];
    case 'nitro-reduction': return [R.reduceNitro(sub)];
    case 'side-chain-h2pd': return [R.hydrogenate(sub, 'H2_Pd').product];
    case 'alkene-hx': case 'alkene-hydration': return R.predict(sub, rg).products;
    case 'alkene-x2': case 'alkene-h2-pd': case 'alkene-kmno4-base': case 'alkene-kmno4-acid': case 'alkene-epoxide': case 'alkene-epoxide-diol': return R.predictAdd(sub, rg).products;
    case 'alkyne-hx-1': case 'alkyne-hx-2': case 'alkyne-x2-1': case 'alkyne-x2-2': case 'alkyne-hydration': case 'alkyne-lindlar': case 'alkyne-h2-pd': return R.predictAlkyne(sub, rg).products;
    case 'alkyne-acetylide': {
      const rx = Object.values(CARDS).find((c) => c.kind === 'rx' && c.smiles === hal);
      const r = R.runSequence(sub, ['NaNH2', rx.id]);
      return r.ok ? [r.final.smiles] : null;
    }
    case 'diene-hx': return R.predictDiene(sub, rg).products;
    default: {
      // fixed-answer card (no engine): the answer IS the hub card's example for that substrate
      if (DRILL[id] && DRILL[id].fixed) {
        const c = HUB_BY_ID[id], ex = [c.example, c.example2].filter(Boolean).find((x) => x.substrate === sub);
        return ex ? ex.product.split('.') : null;
      }
      throw new Error('no engine call for ' + id);
    }
  }
}

export async function predict({ ok, eq }) {
  await ready();

  // ---- (1) wiring
  ok(PREDICT_SKILLS.includes('predict-product') && generatorForSkill('predict-product') === 'predict-product', 'skill predict-product is served by the predict-product generator');
  ok(GENERATORS['predict-product'] === true, 'GENERATORS lists predict-product');
  ok(skillLabel('predict-product') === 'Predict the product' && skillRule('predict-product').length > 40 && SKILLS['predict-product'], 'skill label and rule');
  eq(DRILL_EXCLUDED, [], 'no hub card is left out of the drill (every card has an engine model)');
  eq(DRILL_IDS.slice().sort(), HUB_CARDS.map((c) => c.id).sort(), 'every hub card has a drill entry');
  eq(Object.keys(DRILL).sort(), HUB_CARDS.map((c) => c.id).sort(), 'the drill has no stale card');
  for (const id of DRILL_IDS) {
    const e = DRILL[id];
    if (e.fixed) {   // fixed-answer card: one substrate per hub example
      eq(e.subs, [HUB_BY_ID[id].example, HUB_BY_ID[id].example2].filter(Boolean).map((x) => x.substrate), `${id}: fixed entry has one substrate per hub example`);
      ok(new Set(e.subs.map((x) => canon(x))).size === e.subs.length, `${id}: no substrate listed twice`);
    } else {
      ok(new Set(e.subs.map((x) => canon(x))).size === e.subs.length, `${id}: no substrate listed twice (as different SMILES of one compound)`);
      ok(e.subs.length >= 3 && e.subs.length <= 80, `${id}: 3 to 80 substrates (${e.subs.length}; the pools were widened for the reaction modes)`);
    }
  }
  eq(DRILL_IDS.filter((id) => DRILL[id].fixed).sort(), ['alkene-hydroboration', 'alkyne-hydroboration', 'alkyne-kmno4-hot', 'amine-in-acid', 'benzylic-bromination', 'birch', 'clemmensen', 'desulfonation', 'diels-alder', 'oxidation-cr', 'oxidation-pcc'].sort(), 'the ten B3.1 cards and hot KMnO₄ on an alkyne are the fixed-answer drill entries');
  const app = fs.readFileSync(path.join(HERE, '..', 'app.js'), 'utf8');
  ok(/\^practise-\(\[a-z0-9-\]\+\)\$/.test(app), 'router serves #practise-<skill>');
  ok(/id: 'drill-predict'/.test(app) && (app.match(/#practise-predict-product/g) || []).length >= 3, 'the hub, the home Reactions panel and the weak-spot panel link to #practise-predict-product');
  ok(/'stereo-relationships', 'predict-product'\]\.includes\(generatorForSkill\(skill\)\)/.test(app), 'the practice view draws the drill skeletal');
  ok(/mistake: \(sk, stepId, diagnosis(?:, card)?\) => (?:store\.logMistake|logSlip)\(\{ skill: sk, stepId, lessonId: 'practice', diagnosis(?:, card)? \}\)/.test(app), 'practice logs every slip with its skill');
  store.resetAll();
  store.logMistake({ skill: 'predict-product', stepId: 'mastery', lessonId: 'practice', diagnosis: 'x' });
  ok(store.weakSpots().some((w) => w.skill === 'predict-product'), 'a predict-product slip shows up as a weak spot');
  store.resetAll();

  // ---- generate: 200 seeded problems, plus every pair of every card
  const rng = mulberry32(20261019);
  const first = generate('predict-product', 200, { rng });
  const second = generate('predict-product', 25, { rng });   // a second call must not start with the card the first call ended on
  eq(first.length, 200, '200 problems generated');
  const probs = [...first, ...second];
  const combos = drillCombos();
  const comboProbs = [];
  for (const c of combos) {
    let p = null;
    try { p = problemFor(c.card, c.sub, c.variant, mulberry32(c.sub.length * 31 + c.vi)); } catch (e) { ok(false, `${c.card} ${c.sub} ${c.variant.id}: threw ${e.message}`); continue; }
    ok(!!p, `${c.card} ${c.sub} ${c.variant.id}${c.variant.halide ? ' ' + c.variant.halide : ''}: has at least two usable wrong answers`);
    if (p) comboProbs.push(p);
  }
  const all = [...probs, ...comboProbs];

  // consecutive problems use different cards, and the mix covers the groups
  for (let i = 1; i < probs.length; i++) if (probs[i].card === probs[i - 1].card) ok(false, `problem ${i}: same card twice in a row (${probs[i].card})`);
  ok(true, 'checked consecutive cards');
  eq([...new Set(first.map((p) => p.group))].sort(), HUB_GROUPS.map((g) => g.id).sort(), 'the 200 problems cover all four groups');
  const seenCards = new Set(first.map((p) => p.card));
  ok(seenCards.size >= HUB_CARDS.length - 2, `the 200 problems cover almost every card (${seenCards.size} of ${HUB_CARDS.length})`);
  let groupRuns = 0; for (let i = 1; i < first.length; i++) if (first[i].group === first[i - 1].group) groupRuns++;
  ok(groupRuns < 120, `groups are mixed (${groupRuns} same-group neighbours in 199)`);

  // ---- (2) per-problem structure
  const factsSeen = new Set();
  const mols = new Set();
  for (const [i, p] of all.entries()) {
    const t = `${p.card} ${p.substrate} ${p.reagent}${p.halide ? ' ' + p.halide : ''} #${i}`;
    ok(p.kind === 'choice' && p.skill === 'predict-product' && HUB_BY_ID[p.card], `${t}: kind, skill, card`);
    ok(p.options.length >= 3 && p.options.length <= 4, `${t}: 3 or 4 options (${p.options.length})`);
    eq(p.options.filter((o) => o.correct).length, 1, `${t}: exactly one right option`);
    eq(p.options.map((o) => o.text), p.options.map((_, k) => 'Option ' + 'ABCD'[k]), `${t}: option labels`);
    ok(p.options.find((o) => o.correct).text === p.answer, `${t}: answer names the right option`);
    ok(/^[^]*\+ <b>[^<]+<\/b>\. Which is the major product( \(or products\))?\?/.test(p.promptHtml), `${t}: prompt reads "<substrate> + <reagent>. Which is the major product?"`);
    ok(p.equation && p.equation.reactants[0] === p.substrate && p.equation.cond, `${t}: equation row shows the substrate and the reagent`);
    ok(Array.isArray(p.hints) && p.hints.length === 2 && p.hints.every((x) => x.length > 20), `${t}: two hints`);
    ok(typeof p.worked === 'string' && /1\. What adds:/.test(p.worked) && /2\. Where:/.test(p.worked) && /3\. In space:/.test(p.worked) && p.derive === p.worked, `${t}: worked walks the three facts`);
    const f = HUB_BY_ID[p.card].facts;
    ok(p.worked.includes(f.adds) && p.worked.includes(f.where), `${t}: worked uses the hub card's facts`);
    for (const o of p.options) {
      ok(typeof o.smiles === 'string' && o.smiles.length > 0, `${t}: option has a drawing`);
      o.smiles.split('.').forEach((s) => { ok(canon(s) !== null, `${t}: ${s} parses in RDKit (JS)`); mols.add(s); });
      if (!o.correct) {
        ok(['adds', 'where', 'space'].includes(o.fact), `${t}: wrong option has a fact (${o.fact})`);
        ok(typeof o.lead === 'string' && o.lead.length >= 25 && o.lead.length <= 260 && o.why.startsWith(o.lead), `${t}: wrong option has a specific first line (lead) and the why starts with it`);
        ok(!/^Slip on /.test(o.why), `${t}: wrong option's why does not open with the generic slip sentence`);
        ok(CONCRETE.test(o.lead), `${t}: the first line names a concrete group, atom or position: ${o.lead}`);
        ok(!/the group (meta|ortho|para)/.test(o.lead) && !/X/.test(o.lead), `${t}: the first line has the real group substituted in: ${o.lead}`);
        ok(typeof o.more === 'string' && (o.more === '' || o.why.endsWith(o.more)), `${t}: the longer reason is kept as \`more\``);
        factsSeen.add(o.fact);
      } else ok(/^Yes\./.test(o.why), `${t}: right option explains itself`);
    }
    // no duplicate drawings; the mirror image of a racemic product is the right drawing, so it cannot be a wrong one
    const right = p.options.find((o) => o.correct);
    const keys = p.options.map((o) => comps(o.smiles).join('.'));
    eq(new Set(keys).size, keys.length, `${t}: no duplicate options`);
    if (p.racemic) ok(!p.options.some((o) => !o.correct && same(comps(o.smiles), mirrorComps(comps(right.smiles)))), `${t}: no wrong option is the mirror image of a racemic product`);
  }
  eq([...factsSeen].sort(), ['adds', 'space', 'where'], 'wrong options cover all three facts');

  // ---- (3) the right option is the engine's product
  for (const [i, p] of all.entries()) {
    const t = `${p.card} ${p.substrate} ${p.reagent}${p.halide ? ' ' + p.halide : ''} #${i}`;
    let want;
    try { want = engineProducts(p); } catch (e) { ok(false, `${t}: engine threw ${e.message}`); continue; }
    ok(!!want, `${t}: the engine models it`);
    if (!want) continue;
    const w = want.flatMap((x) => comps(x)).sort();
    const have = comps(p.options.find((o) => o.correct).smiles);
    ok(same(w, have) || (p.racemic && same(mirrorComps(w), have)), `${t}: right option ${JSON.stringify(have)} equals engine product ${JSON.stringify(w)}`);
    ok(same(p.products.flatMap((x) => comps(x)).sort(), w), `${t}: problem.products is the engine product`);
  }

  // ---- (4) Python read-back of every drawn molecule
  const uniq = [...mols];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-predict-'));
  const py = new Map();
  try {
    const inp = path.join(tmp, 'in.json'), outp = path.join(tmp, 'out.json');
    fs.writeFileSync(inp, JSON.stringify({ cases: [{ id: 'all', smiles: uniq }] }));
    execFileSync('python3', ['-I', path.join(TOOLS, 'check_hub.py'), inp, outp], { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 1 << 26 });
    JSON.parse(fs.readFileSync(outp, 'utf8')).cases[0].mols.forEach((m) => py.set(m.smiles, m));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  eq(py.size, uniq.length, 'Python read every drawn molecule');
  ok([...py.values()].every((m) => m.ok), 'every option molecule parses in Python RDKit');
  const rd = (list) => list.split('.').map((s) => py.get(s));
  const flatKey = (list) => rd(list).map((m) => m.flat).sort().join('.');

  let hydroChecked = 0, ringChecked = 0, mesoChecked = 0, ezChecked = 0, chiralChecked = 0, spaceChecked = 0;
  for (const [i, p] of all.entries()) {
    const t = `${p.card} ${p.substrate} ${p.reagent} #${i}`;
    const card = HUB_BY_ID[p.card];
    const right = p.options.find((o) => o.correct);
    const ms = rd(right.smiles);
    // a chiral product with specified centres is flagged racemic (the lessons teach: achiral reagents make racemates)
    for (const m of ms) if (m.centres.length && !m.achiral) { chiralChecked++; ok(p.racemic, `${t}: a chiral product (${m.smiles}) is flagged racemic`); }
    if (p.racemic) ok(ms.some((m) => (m.centres.length && !m.achiral) || m.unassigned > 0), `${t}: racemic flag only on a chiral product`);
    // the card's syn / anti, read back
    if (['alkene-x2', 'alkene-h2-pd', 'alkene-kmno4-base', 'alkene-epoxide', 'alkene-epoxide-diol'].includes(p.card)) {
      const two = ms.find((m) => m.centres.length === 2);
      if (two && f2(card) !== null) {
        const ringSub = /\d/.test(p.substrate);
        if (ringSub && two.cistrans && p.card !== 'alkene-epoxide') { ringChecked++; eq(two.cistrans, card.facts.space === 'syn' ? 'cis' : 'trans', `${t}: ${card.facts.space} addition gives ${card.facts.space === 'syn' ? 'cis' : 'trans'} on the ring`); }
        if (p.substrate === 'C/C=C/C' || p.substrate === 'C/C=C\\C') {
          mesoChecked++;
          const E = p.substrate === 'C/C=C/C', anti = card.facts.space === 'anti';
          eq(two.achiral, (E && anti) || (!E && !anti), `${t}: ${E ? 'E' : 'Z'}-but-2-ene with a ${card.facts.space} addition is ${((E && anti) || (!E && !anti)) ? 'meso' : 'chiral (racemate)'}`);
        }
        if (p.substrate === 'C/C=C/CC' || p.substrate === 'C/C=C\\CC') ok(!two.achiral, `${t}: two different ends give a chiral product`);
      }
    }
    // alkene-hydroboration (fixed answer): H and OH add syn, so the OH is TRANS to the CH3. Read back in 3D from the drawn option, not from the card's words.
    if (p.card === 'alkene-hydroboration') {
      const two = ms.find((m) => m.centres.length === 2);
      hydroChecked++;
      ok(!!two && two.cistrans === 'trans', `${t}: the right option has the OH trans to the CH₃ (${two && two.cistrans})`);
      const sp = p.options.filter((x) => x.fact === 'space');
      eq(sp.length, 1, `${t}: one "space" distractor`);
      for (const o of sp) { const m = rd(o.smiles).find((x) => x.centres.length === 2); ok(!!m && m.cistrans === 'cis', `${t}: the "space" distractor has the OH cis to the CH₃ (${m && m.cistrans})`); }
    }
    if (p.card === 'alkyne-x2-1') { ezChecked++; eq(ms.flatMap((m) => m.ez), ['E'], `${t}: anti addition of X₂ gives the (E) dihaloalkene`); }
    if (p.card === 'alkyne-lindlar') {
      const both = !p.substrate.endsWith('#C');
      ezChecked++; eq(ms.flatMap((m) => m.ez), both ? ['Z'] : [], `${t}: syn addition gives the (Z) alkene ${both ? '' : '(a terminal alkyne has no cis/trans)'}`);
    }
    // a wrong "space" option has the same atoms as the right one (only the faces differ)
    for (const o of p.options.filter((x) => x.fact === 'space')) { spaceChecked++; eq(flatKey(o.smiles), flatKey(right.smiles), `${t}: a wrong "space" option differs only in stereochemistry`); }
  }
  ok(hydroChecked >= 1, `alkene-hydroboration was read back in 3D (${hydroChecked})`);
  // (ring was 20 before the ten fixed-answer cards joined the 200 random draws: they now take a quarter of the draws; every card x substrate pair is also read back once)
  ok(ringChecked >= 12 && mesoChecked >= 8 && ezChecked >= 15 && chiralChecked >= 10 && spaceChecked >= 40, `stereo read-backs ran (ring ${ringChecked}, meso ${mesoChecked}, E/Z ${ezChecked}, chiral ${chiralChecked}, space ${spaceChecked})`);

  // ---- (5) the drill agrees with the hub's own example for every card
  for (const c of HUB_CARDS) {
    const e = DRILL[c.id];
    const S = solveCard(c.id, c.example.substrate, e.variants[e.ex], mulberry32(5));
    const want = c.example.product.split('.').map((s) => canon(s)).sort();
    const have = S.products.flatMap((x) => comps(x)).sort();
    ok(same(want, have) || (S.racemic && same(want, mirrorComps(have))), `${c.id}: the drill's answer for the card's example ${JSON.stringify(have)} equals the hub example ${JSON.stringify(want)}`);
  }

  // ---- how many different problems the drill can make
  const triples = combos.length;
  ok(triples >= 200, `at least 200 distinct (card, substrate, reagent) problems (${triples})`);
  return { triples, cards: DRILL_IDS.length };
}
function f2(card) { return ['syn', 'anti'].includes(card.facts.space) ? card.facts.space : null; }

// run alone: node learn/tests/predict.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  const r = await predict({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed; ${r.triples} (card, substrate, reagent) triples over ${r.cards} cards`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
