// Lesson 17 checks: "Predict the product" (review lesson). Nothing chemical in the lesson is typed by hand: every drawn answer was produced by the engines the mixed drill uses
// (engine/generators-predict.js -> reactions*.js; the ten workbook B3.1 cards use the hub card's own example). A step's `chk` names the engine call that produced its correct
// answer, and this file RECOMPUTES it (canonical SMILES; either mirror image when the product forms as a racemate).
//  (1) schema of every step (fields per type, one correct option, a why on every option, two hints + worked, explain <= 80 words, parts 1 to 4, step counts per part);
//  (2) every SMILES parses in RDKit, every <mol> tag is closed, names carry both IUPAC styles;
//  (3) every correct answer equals the engine's (drill solveCard, predictSubst, an independent RDKit reaction for the oxidation and the parent Diels-Alder), no wrong
//      answer equals the right one, and fixed-answer cards equal the hub card's example product;
//  (4) every #reactions/<id> link is a hub card, every #lesson-NN/sK link is a real step, all 38 hub cards are reached in Part 2, each card step names its own card in its reveal;
//  (5) reaction-lab steps use ids and reagent keys the lab knows, and every combination runs in the engines without an error;
//  (6) recap entries, mastery generator, registry.
// Run on its own with `node learn/tests/lesson17.mjs` (from learn/), or wire it into run.mjs.
import { ready, rdkit, canon } from '../engine/chem.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import { HUB_CARDS, HUB_BY_ID } from '../engine/reaction-hub.js';
import { DRILL, solveCard } from '../engine/generators-predict.js';
import * as R from '../engine/reactions.js';
import { SKILLS } from '../engine/skills.js';
import { RECAP } from '../engine/recap.js';
import { generate, generatorForSkill } from '../engine/generators.js';
import { molProblem } from './text.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const strip = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const words = (h) => strip(h).split(' ').filter(Boolean).length;
function strings(o, out = []) {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => strings(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => strings(x, out));
  return out;
}
const flat = (list) => list.flatMap((s) => s.split('.'));
const keyOf = (list) => flat(list).map((s) => canon(s)).sort().join('.');
const mirrorKey = (list) => flat(list).map((s) => { try { return canon(R.mirror(s)); } catch (e) { return canon(s); } }).sort().join('.');

/** Run an RDKit reaction on reactant SMILES and return the set of canonical products (independent of every engine in the course). */
function runRxn(smarts, reactants) {
  const rd = rdkit();
  const rxn = rd.get_rxn(smarts);
  const ml = new rd.MolList();
  reactants.forEach((s) => ml.append(rd.get_mol(s)));
  const res = rxn.run_reactants(ml, 50);
  const out = new Set();
  for (let i = 0; i < res.size(); i++) { const pl = res.get(i); while (!pl.at_end()) { const m = pl.next(); out.add(canon(m.get_smiles())); m.delete(); } }
  return out;
}

export async function lesson17({ ok, eq }) {
  await ready();
  const L = LESSONS.find((x) => x.id === '17');
  ok(!!L, 'lesson 17 is registered');
  if (!L) return;
  let nChk = 0, nSmiles = 0, nLinks = 0, nWrong = 0;

  // ------------------------------------------------------------------ (6a) lesson header
  eq([L.slug, L.chapter, L.sections], ['predict-product', 'review', []], 'L17 slug, chapter and sections');
  ok(L.title === 'Predict the product' && L.minutes >= 35 && L.minutes <= 50, `L17 title and about 40 minutes (${L.minutes})`);
  ok(L.goals.length >= 2 && L.goals.length <= 4 && /by reasoning/.test(L.goals[0]), 'L17 goals');
  eq(L.mastery, { count: 5, generator: 'predict-product' }, 'L17 mastery is 5 problems from predict-product');
  ok(Array.isArray(L.useIt.book) && L.useIt.book.length === 0 && /Reactions drill/.test(L.useIt.note) && /B3/.test(L.useIt.note), 'L17 useIt: no book problems, a note to the drill and the B3 items');
  ok(generatorForSkill('predict-product') === 'predict-product', 'the predict-product skill is served by the predict-product generator');
  const mp = generate('predict-product', 5, {});
  ok(mp.length === 5 && mp.every((p) => p.options && p.options.filter((o) => o.correct).length === 1), 'the mastery generator makes 5 problems with one right answer each');

  // ------------------------------------------------------------------ (1) schema
  const ids = new Set();
  const byPart = { 1: [], 2: [], 3: [], 4: [] };
  const taxSrc = fs.readFileSync(path.join(HERE, 'run.mjs'), 'utf8');
  const taxM = /const TAXONOMY = new Set\(\[([^\]]*)\]/.exec(taxSrc);
  const TAX = taxM ? new Set([...taxM[1].matchAll(/'([^']+)'/g)].map((m) => m[1])) : null;
  for (const s of L.steps) {
    const t = `L17/${s.id}`;
    ok(/^s\d\d$/.test(s.id) && !ids.has(s.id), `${t} unique id`); ids.add(s.id);
    ok(['predict', 'choice', 'try', 'worked', 'explain'].includes(s.type), `${t} type ${s.type}`);
    ok(s.skill && SKILLS[s.skill], `${t} skill ${s.skill} is in the skills table`);
    if (TAX) ok(TAX.has(s.skill), `${t} skill ${s.skill} is in run.mjs's taxonomy`);
    ok([1, 2, 3, 4].includes(s.part), `${t} part ${s.part}`);
    byPart[s.part] && byPart[s.part].push(s);
    if (s.type === 'predict' || s.type === 'choice') {
      ok(s.options.filter((o) => o.correct).length === 1, `${t} exactly one correct option`);
      ok(s.options.length >= 3 && s.options.length <= 4, `${t} three or four options`);
      ok(s.options.every((o) => typeof o.why === 'string' && o.why.trim().length > 15), `${t} every option has a specific why`);
      ok(s.options.every((o) => o.text || o.smiles), `${t} options have content`);
      ok(new Set(s.options.map((o) => o.text || o.smiles)).size === s.options.length, `${t} options are all different`);
    }
    if (s.type === 'predict') ok(typeof s.reveal === 'string' && s.reveal.length > 30, `${t} reveal`);
    if (s.type === 'choice' || s.type === 'try') {
      ok(Array.isArray(s.hints) && s.hints.length === 2 && s.hints.every((x) => x.length > 15), `${t} two hints`);
      ok(typeof s.worked === 'string' && s.worked.length > 20, `${t} worked`);
    }
    if (s.type === 'explain') ok(words(s.html) <= 80 && words(s.html) >= 25, `${t} explain is 25 to 80 words (${words(s.html)})`);
    if (s.type === 'worked') {
      ok(s.moves.length >= 3, `${t} moves`);
      s.moves.forEach((m, i) => {
        ok(m.options.filter((o) => o.correct).length === 1, `${t} move ${i} one correct`);
        ok(m.options.every((o) => o.why && o.why.length > 15), `${t} move ${i} whys`);
      });
      ok(typeof s.rule === 'string' && s.rule.length > 30, `${t} rule`);
    }
    // the player's rules about text
    for (const str of strings(s)) {
      if (/<mol/.test(str)) { const pr = molProblem(str); ok(pr === null, `${t}: ${pr}`); }
      ok(!/—/.test(str), `${t}: no em dash`);
      ok(!/\bhub\b/i.test(strip(str)) || /#reactions/.test(str), `${t}: learner-facing text does not say "hub"`);
    }
  }
  eq([byPart[1].length, byPart[3].length, byPart[4].length], [9, 7, 3], 'step counts: Part 1 = 9 (3 x worked, explain, predict), Part 3 = 7 exceptions, Part 4 = 3 exam items');
  ok(byPart[2].length >= 38 + 4, `Part 2 has a step for every one of the 38 cards plus labs and kinds (${byPart[2].length})`);
  eq(byPart[1].map((s) => s.type), ['worked', 'explain', 'predict', 'worked', 'explain', 'predict', 'worked', 'explain', 'predict'], 'Part 1: worked, explain, predict for each question');
  ok(byPart[3].every((s) => s.type === 'choice'), 'Part 3: one choice step each');
  ok(byPart[4].every((s) => s.type === 'predict' && /Write the structure of the major organic product/.test(strip(s.prompt))), 'Part 4: predict steps in workbook phrasing');
  ok(byPart[4].filter((s) => /indicate stereochemistry/.test(strip(s.prompt))).length === 2, 'Part 4: the alkene and the alkyne say "indicate stereochemistry"');
  const order = L.steps.map((s) => s.part);
  ok(order.every((p, i) => i === 0 || p >= order[i - 1]), 'the four parts come in order');

  // ------------------------------------------------------------------ (2) SMILES
  const checkSmiles = (smi, label) => { nSmiles++; ok(smi && flat([smi]).every((x) => canon(x) !== null), `${label}: ${smi} parses`); };
  for (const s of L.steps) {
    const t = `L17/${s.id}`;
    if (s.smiles) checkSmiles(s.smiles, `${t} smiles`);
    if (s.equation) { s.equation.reactants.forEach((x) => checkSmiles(x, `${t} equation`)); ok(typeof s.equation.cond === 'string' && s.equation.cond.length > 1, `${t} equation condition`); }
    for (const o of s.options || []) if (o.smiles) checkSmiles(o.smiles, `${t} option`);
    for (const m of s.moves || []) { if (m.figure) checkSmiles(m.figure.smiles, `${t} figure`); }
    for (const str of strings(s)) {
      for (const m of str.matchAll(/smiles="([^"]+)"/g)) checkSmiles(m[1], `${t} <mol>`);
      for (const m of str.matchAll(/<name new="([^"]*)" old="([^"]*)"/g)) ok(m[1].length > 2 && m[2].length > 2, `${t} name tag has both styles (${m[1]} / ${m[2]})`);
    }
  }

  // ------------------------------------------------------------------ (3) engine answers
  const drillOpts = (s) => s.options.map((o) => ({ correct: !!o.correct, smiles: o.smiles || (/smiles="([^"]+)"/.exec(o.text || '') || [])[1] }));
  const variantOf = (c) => DRILL[c.card].variants.find((v) => v.id === c.v && (!c.halide || v.halide === c.halide));
  const compareToEngine = (t, opts, products, racemic) => {
    const right = opts.filter((o) => o.correct);
    ok(right.length === 1, `${t}: one right drawing`);
    const rk = keyOf([right[0].smiles]);
    ok(rk === keyOf(products) || (racemic && rk === mirrorKey(products)), `${t}: the right drawing ${right[0].smiles} equals the engine product ${products.join(' + ')}`);
    for (const o of opts.filter((x) => !x.correct)) {
      nWrong++;
      const wk = keyOf([o.smiles]);
      ok(wk !== rk && !(racemic && wk === mirrorKey([right[0].smiles])), `${t}: wrong drawing ${o.smiles} differs from the right one`);
    }
    nChk++;
  };
  for (const s of L.steps) {
    const t = `L17/${s.id}`;
    const c = s.chk;
    if (c && c.card) {
      const v = variantOf(c);
      ok(!!v, `${t}: drill variant ${c.v} exists for ${c.card}`);
      const S = solveCard(c.card, c.sub, v, () => 0.5);
      compareToEngine(t, drillOpts(s), S.products, S.racemic);
      if (c.v === 'fixed') {
        const card = HUB_BY_ID[c.card];
        const ex = [card.example, card.example2].filter(Boolean).find((e) => e.substrate === c.sub);
        ok(!!ex, `${t}: fixed card ${c.card} is drawn from one of the hub card's examples`);
        if (ex) { const rs = drillOpts(s).filter((o) => o.correct).map((o) => o.smiles); ok(keyOf(ex.product.split('.')) === keyOf(rs) || (S.racemic && mirrorKey(ex.product.split('.')) === keyOf(rs)), `${t}: the right drawing equals the hub card's example product`); }
      }
      // the equation shows the engine's own reagent text
      if (s.equation) eq(s.equation.reactants, c.sub.split('.'), `${t}: the drawn substrate is the checked substrate`);
      else eq(s.smiles, c.sub, `${t}: the drawn substrate is the checked substrate`);
    }
    if (c && c.engine === 'subst') {
      const p = R.predictSubst(c.sub, c.reagent, null);
      ok(p.ok, `${t}: predictSubst accepts ${c.sub} + ${c.reagent}`);
      compareToEngine(t, drillOpts(s), p.products, false);
      eq(keyOf([c.answer]), keyOf(p.products), `${t}: recorded answer = engine`);
    }
    if (c && c.engine === 'oxidise') {
      // independent derivation: a primary alcohol CH2-OH loses two H and becomes CH=O (PCC, no water)
      const prods = runRxn('[CH2:1][OH:2]>>[CH:1]=[O:2]', [c.sub]);
      ok(prods.size === 1 && [...prods][0] === canon(c.answer), `${t}: PCC product ${c.answer} equals the independent RDKit oxidation ${[...prods]}`);
      compareToEngine(t, drillOpts(s), [c.answer], false);
      // the acid is the Cr(VI) / water product of the hub card (example 2 of oxidation-cr is butan-1-ol)
      const cr = HUB_BY_ID['oxidation-cr'];
      ok(cr.example2.substrate === c.sub && drillOpts(s).some((o) => !o.correct && keyOf([o.smiles]) === keyOf([cr.example2.product])), `${t}: the butanoic acid distractor is the hub's Cr(VI) example product`);
    }
    if (c && c.engine === 'diels-alder-parent') {
      const prods = runRxn('[C:1]=[C:2][C:3]=[C:4].[C:5]=[C:6]>>[C:1]1[C:2]=[C:3][C:4][C:6][C:5]1', [c.diene, c.dienophile]);
      ok(prods.size === 1 && [...prods][0] === canon(c.answer), `${t}: the Diels-Alder product ${c.answer} equals the independent RDKit reaction ${[...prods]}`);
      compareToEngine(t, drillOpts(s), [c.answer], false);
    }
  }
  // Part 1 worked move with an engine answer
  for (const s of L.steps) for (const [i, m] of (s.moves || []).entries()) if (m.chk) {
    const t = `L17/${s.id} move ${i}`;
    const v = variantOf(m.chk);
    const S = solveCard(m.chk.card, m.chk.sub, v, () => 0.5);
    const right = m.options.find((o) => o.correct);
    const sm = /smiles="([^"]+)"/.exec(right.text)[1];
    ok(keyOf([sm]) === keyOf(S.products) && canon(m.chk.answer) === canon(sm), `${t}: right drawing ${sm} equals the engine product ${S.products}`);
    for (const o of m.options.filter((x) => !x.correct)) { nWrong++; ok(keyOf([/smiles="([^"]+)"/.exec(o.text)[1]]) !== keyOf([sm]), `${t}: a wrong drawing differs`); }
    nChk++;
  }
  ok(L.steps.filter((s) => s.chk).length >= 40, `most steps carry an engine check (${L.steps.filter((s) => s.chk).length})`);
  // fixed hub answers must not be a distractor here (the drill's own checks cover them): every drawing in a step is a different compound
  for (const s of L.steps) if (s.type === 'predict' || s.type === 'choice') {
    const list = drillOpts(s).filter((o) => o.smiles);
    if (list.length) ok(new Set(list.map((o) => keyOf([o.smiles]))).size === list.length, `L17/${s.id}: all drawn options are different compounds`);
  }

  // ------------------------------------------------------------------ (4) links and coverage
  const reactionLinks = new Set(), p2cards = new Set();
  for (const s of L.steps) {
    const t = `L17/${s.id}`;
    for (const str of strings(s)) {
      for (const m of str.matchAll(/href="#reactions\/([a-z0-9-]+)"/g)) {
        nLinks++; ok(!!HUB_BY_ID[m[1]], `${t}: #reactions/${m[1]} is a hub card`);
        reactionLinks.add(m[1]); if (s.part === 2) p2cards.add(m[1]);
      }
      for (const m of str.matchAll(/href="#lesson-(\d+)\/(s\d+)"/g)) {
        nLinks++;
        const T = LESSONS.find((x) => x.id === m[1]);
        ok(T && T.steps.some((x) => x.id === m[2]), `${t}: #lesson-${m[1]}/${m[2]} is a real step`);
        ok(T && parseInt(m[1], 10) < 17, `${t}: lesson links point to earlier lessons`);
      }
    }
    if (s.part === 2 && s.chk && s.chk.card) {
      p2cards.add(s.chk.card);
      ok(new RegExp(`href="#reactions/${s.chk.card}"`).test(s.reveal), `${t}: the reveal links its own card ${s.chk.card}`);
      ok(/Q1/.test(s.reveal) && /Q2/.test(s.reveal) && /Q3/.test(s.reveal) && /Kind of product/.test(s.reveal), `${t}: the reveal names Q1, Q2, Q3 and the kind of product`);
    }
  }
  // the Diels-Alder parent step (no engine card) links its card in the reveal
  const da = L.steps.find((s) => s.chk && s.chk.engine === 'diels-alder-parent');
  ok(da && /href="#reactions\/diels-alder"/.test(da.reveal) && /Q1/.test(da.reveal) && /Q3/.test(da.reveal), 'the parent Diels-Alder step links its card and names the questions');
  const ids38 = HUB_CARDS.map((c) => c.id);
  eq(ids38.length, 38, 'the hub has 38 cards');
  const missing = ids38.filter((id) => !p2cards.has(id));
  eq(missing, [], 'Part 2 reaches all 38 hub cards (missing: ' + missing.join(', ') + ')');
  const p2steps = L.steps.filter((s) => s.part === 2 && s.type === 'predict');
  const cardOfStep = p2steps.map((s) => (s.chk && s.chk.card) || (/#reactions\/([a-z0-9-]+)/.exec(s.reveal) || [])[1]);
  eq(cardOfStep.length, 38, 'Part 2 has exactly 38 predict steps, one per card');
  eq([...new Set(cardOfStep)].sort(), ids38.slice().sort(), 'each hub card has exactly one Part 2 predict step');
  // Part 3 and 4 cards are real too
  for (const id of reactionLinks) ok(!!HUB_BY_ID[id], `link target ${id}`);
  // the section order of the brief
  const pos = (id) => L.steps.findIndex((s) => s.part === 2 && ((s.chk && s.chk.card === id) || new RegExp(`#reactions/${id}"`).test(s.reveal || '')));
  const order2 = ['alkene-hx', 'alkene-hydration', 'alkene-x2', 'alkene-epoxide-diol', 'alkene-h2-pd', 'alkene-kmno4-base', 'alkene-epoxide', 'alkene-hydroboration', 'alkene-kmno4-acid', 'alkyne-hx-1', 'diene-hx', 'diels-alder', 'eas-bromination', 'director-activating', 'side-chain-kmno4', 'oxidation-pcc'];
  ok(order2.every((id, i) => i === 0 || pos(id) > pos(order2[i - 1])), 'Part 2 runs: HX and water, anti, syn, alkynes, dienes, benzene, directors, side chains, alcohols');

  // ------------------------------------------------------------------ (5) labs
  const labs = L.steps.filter((s) => s.type === 'try');
  ok(labs.length >= 4 && labs.every((s) => s.widget === 'reaction-lab' && s.part === 2), `Part 2 closes its groups with reaction-lab steps (${labs.length})`);
  let combos = 0;
  for (const s of labs) {
    const c = s.config, t = `L17/${s.id}`;
    ok(c.need >= 2, `${t}: need at least 2 right predictions`);
    if (c.alkenes) {
      ok(c.alkenes.every((id) => R.ALKENE2_BY_ID[id] || R.ALKENE_BY_ID[id]), `${t}: alkene ids exist`);
      for (const id of c.alkenes) for (const r of c.reagents) {
        const smi = (R.ALKENE2_BY_ID[id] || R.ALKENE_BY_ID[id]).smiles;
        let res = null, err = null;
        try { res = R.REAGENTS[r] ? R.predict(smi, r) : R.REAGENTS2[r] ? R.predictAdd(smi, r) : null; } catch (e) { err = e.message; }
        ok(!err && res && res.products && res.products.length >= 1, `${t}: ${id} + ${r} runs in the engine ${err || ''}`); combos++;
      }
    } else if (c.alkynes) {
      for (const id of c.alkynes) for (const r of c.reagents) {
        let res = null, err = null;
        try { res = R.predictAlkyne(R.ALKYNE_BY_ID[id].smiles, r); } catch (e) { err = e.message; }
        ok(!err && res && res.products && res.products.length >= 1, `${t}: ${id} + ${r} runs ${err || ''}`); combos++;
      }
    } else if (c.dienes) {
      for (const id of c.dienes) for (const r of c.reagents) {
        let res = null, err = null;
        try { res = R.predictDiene(R.DIENE_BY_ID[id].smiles, r); } catch (e) { err = e.message; }
        ok(!err && res && res.products && res.products.length >= 1, `${t}: ${id} + ${r} runs ${err || ''}`); combos++;
      }
    } else if (c.subst) {
      ok(c.subst.arenes.every((id) => R.LAB_SUBST_BY_ID[id]) && c.subst.reagents.every((id) => R.LAB_EAS_BY_ID[id]), `${t}: ring and reagent ids exist`);
      for (const id of c.subst.arenes) for (const r of c.subst.reagents) {
        const e = R.LAB_EAS_BY_ID[r];
        let err = null;
        try { R.predictSubst(R.LAB_SUBST_BY_ID[id].smiles, e.reagent, e.halide || null); } catch (x) { err = x.message; }
        ok(!err, `${t}: ${id} + ${r} runs (a refusal is fine, an error is not) ${err || ''}`); combos++;
      }
    } else ok(false, `${t}: unknown lab configuration`);
  }

  // ------------------------------------------------------------------ (6b) recap
  const rc = RECAP['17'];
  ok(Array.isArray(rc) && rc.length >= 2 && rc.length <= 4, `RECAP has 2 to 4 entries for lesson 17 (${rc && rc.length})`);
  if (rc) {
    for (const f of rc) {
      const T = LESSONS.find((x) => x.id === f.n);
      ok(T && parseInt(f.n, 10) < 17 && T.steps.some((x) => x.id === f.step), `recap L17: #lesson-${f.n}/${f.step} is a real step of an earlier lesson`);
      ok(f.fact.length >= 25 && f.fact.length <= 190 && !/\n/.test(f.fact) && molProblem(f.fact) === null, `recap L17: one line (${f.fact.length} characters)`);
    }
    ok(['08', '09', '10'].every((n) => rc.some((f) => f.n === n)), 'recap L17 covers arrows (08), Markovnikov (09) and syn/anti (10)');
    ok(rc.some((f) => f.n === '13' || f.n === '14'), 'recap L17 covers the ring lessons (13 or 14)');
  }

  console.log(`  Lesson 17: ${L.steps.length} steps (Part 1: ${byPart[1].length}, Part 2: ${byPart[2].length}, Part 3: ${byPart[3].length}, Part 4: ${byPart[4].length}); ${nChk} engine-checked answers with ${nWrong} wrong drawings compared; ${nSmiles} SMILES parsed; ${nLinks} links resolved; ${combos} lab combinations run; ${p2cards.size}/38 cards reached in Part 2`);
}

// run alone: node tests/lesson17.mjs (from learn/)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await lesson17({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
