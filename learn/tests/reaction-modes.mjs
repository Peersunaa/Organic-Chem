// Reaction modes (engine/generators-reaction-modes.js; generators and skills guess-reagent, guess-reactant, stereo-outcome, two-step, wont-work; landing #reactions-practice).
//  (1) wiring: skills, labels and rules, generator registry, router and links in app.js / hub-view.js, the CSS block, the TAXONOMY list of run.mjs, MODE_COUNTS;
//  (2) 200 seeded problems per mode: exactly one right option, 4 distinct options, hints, worked text, every wrong option carries its own specific line (`lead`),
//      every drawn SMILES parses in JS RDKit and in Python RDKit (tools/check_hub.py);
//  (3) guess-reagent: the right reagent and the shown product are the engine's (recomputed here by calling the engines directly); EVERY wrong reagent is run on the same
//      substrate and its product shares no compound with the shown one;
//  (4) guess-reactant: the right starting material gives the shown product, every other drawn starting material gives a product that shares nothing with it (or does not react);
//  (5) stereo-outcome: the label of the engine product (stereocentres, meso, racemic, one C=C geometry, cis/trans) is read back in Python RDKit (centres, achiral, E/Z, ring cis/trans in 3D);
//  (6) two-step: the right pair composes the engines to the shown final product; every wrong pair is run on the engines and either fails at a step or ends at a different compound;
//  (7) wont-work: 15 to 25 curated cases; every option of every case is checked with the engine (or the hub card) that the case names; problems take 3 that work and 1 that fails;
//  (8) the counts: how many problems each mode can make, and the distinct (substrate, reagent, product) triples; MODE_COUNTS must equal them.
// Run on its own with `node learn/tests/reaction-modes.mjs`, or as part of run.mjs.
import { ready, canon, rdkit, analyze } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HUB_BY_ID } from '../engine/reaction-hub.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import { DRILL } from '../engine/generators-predict.js';
import * as R from '../engine/reactions.js';
import { CARDS, applyCard } from '../engine/synthesis.js';
import { ACID, reaction as acidReaction } from '../engine/acidbase.js';
import { skillLabel, skillRule, SKILLS } from '../engine/skills.js';
import * as M from '../engine/generators-reaction-modes.js';
import * as store from '../engine/store.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.join(HERE, '..', 'tools');
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const parts = (list) => list.flatMap((s) => String(s).split('.'));
const keyOf = (list) => parts(list).map((s) => R.stereoKey(s)).sort();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const disjoint = (a, b) => !a.some((k) => b.includes(k));

/** The engine's products for (card, substrate, reagent id, halide), by calling the engines directly (not the drill's solve): a list of SMILES, or throws. */
function engineProducts(id, sub, rg, hal) {
  switch (id) {
    case 'eas-bromination': case 'eas-nitration': case 'eas-sulfonation': case 'fc-alkylation': case 'fc-acylation':
    case 'director-activating': case 'director-halogen': case 'director-meta': {
      if (canon(sub) === R.BENZENE) { const q = R.predictEAS(sub, rg, hal); if (!q.ok) throw new Error(q.why); return q.products; }
      const q = R.predictSubst(sub, rg, hal);
      if (!q.ok) throw new Error(q.why);
      return q.products;
    }
    case 'side-chain-kmno4': { const r = R.oxidizeSideChain(sub); if (!r.ok) throw new Error(r.why); return [r.product]; }
    case 'nitro-reduction': { const r = R.reduceNitro(sub); if (!r) throw new Error('no nitro group'); return [r]; }
    case 'side-chain-h2pd': { const r = R.hydrogenate(sub, 'H2_Pd'); if (!r.ok || !r.reacts) throw new Error('no reaction'); return [r.product]; }
    case 'alkene-hx': case 'alkene-hydration': { const r = R.predict(sub, rg); if (r.outcome === 'mixture') throw new Error('mixture'); return r.products; }
    case 'alkene-x2': case 'alkene-h2-pd': case 'alkene-kmno4-base': case 'alkene-kmno4-acid': case 'alkene-epoxide': case 'alkene-epoxide-diol': return R.predictAdd(sub, rg).products;
    case 'alkyne-hx-1': case 'alkyne-hx-2': case 'alkyne-x2-1': case 'alkyne-x2-2': case 'alkyne-hydration': case 'alkyne-lindlar': case 'alkyne-h2-pd': {
      const r = R.predictAlkyne(sub, rg);
      if (r.outcome !== 'single') throw new Error('mixture');
      return r.products;
    }
    case 'alkyne-acetylide': {
      const rx = Object.values(CARDS).find((c) => c.kind === 'rx' && c.smiles === hal);
      const r = R.runSequence(sub, ['NaNH2', rx.id]);
      if (!r.ok) throw new Error('acetylide step failed');
      return [r.final.smiles];
    }
    case 'diene-hx': return R.predictDiene(sub, rg).products;
    default: {
      if (DRILL[id] && DRILL[id].fixed) {         // fixed-answer card: the answer IS the hub card's example for that substrate
        const c = HUB_BY_ID[id], ex = [c.example, c.example2].filter(Boolean).find((x) => x.substrate === sub);
        if (!ex) throw new Error('not the example of the card');
        return ex.product.split('.');
      }
      throw new Error('no engine call for ' + id);
    }
  }
}
const variantOf = (id, rg, hal) => DRILL[id].variants.find((v) => v.id === rg && (v.halide || null) === (hal || null));
const hasMol = (smi, smarts) => { const m = rdkit().get_mol(smi); const q = rdkit().get_qmol(smarts); try { const j = JSON.parse(m.get_substruct_match(q)); return !!(j && j.atoms && j.atoms.length); } finally { m.delete(); q.delete(); } };

export async function reactionModes({ ok, eq }) {
  await ready();
  const app = fs.readFileSync(path.join(HERE, '..', 'app.js'), 'utf8');
  const hubView = fs.readFileSync(path.join(HERE, '..', 'hub-view.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
  const runSrc = fs.readFileSync(path.join(HERE, 'run.mjs'), 'utf8');

  // ---- (1) wiring
  eq(M.MODE_IDS, ['guess-reagent', 'guess-reactant', 'stereo-outcome', 'two-step', 'wont-work'], 'the five modes');
  const LABELS = { 'guess-reagent': 'Which reagent?', 'guess-reactant': 'Which starting material?', 'stereo-outcome': 'What stereochemistry forms?', 'two-step': 'Two-step roadmap', 'wont-work': 'Which one will not work?' };
  for (const m of M.MODE_IDS) {
    ok(skillLabel(m) === LABELS[m] && skillRule(m).length > 80 && SKILLS[m], `${m}: skill label and rule`);
    ok(generatorForSkill(m) === m && GENERATORS[m] === true, `${m}: the skill is served by its own generator`);
    ok(M.MODE_INFO[m].label === LABELS[m] && M.MODE_INFO[m].blurb.length > 20, `${m}: landing label and blurb`);
    ok(new RegExp(`'${m}'`).test(runSrc), `${m}: listed in the TAXONOMY of run.mjs`);
    store.resetAll();
    store.logMistake({ skill: m, stepId: 'mastery', lessonId: 'practice', diagnosis: 'x' });
    ok(store.weakSpots().some((w) => w.skill === m), `${m}: a slip shows up as a weak spot (served by #practise-${m})`);
    store.resetAll();
  }
  ok(/hash === 'reactions-practice'\) return reactionsPractice\(\)/.test(app) && /function reactionsPractice\(\)/.test(app), 'router serves #reactions-practice');
  ok(/\^practise-\(\[a-z0-9-\]\+\)\$/.test(app), 'router still serves #practise-<skill> (one route for every mode)');
  ok(/id: 'open-reaction-modes'/.test(app) && /href: '#reactions-practice'/.test(app), "home's Reactions panel links to #reactions-practice");
  ok(/id: 'hub-practise'/.test(hubView) && /href: '#reactions-practice'/.test(hubView), "the hub's jump bar links to #reactions-practice");
  ok(/MODE_IDS\.includes\(generatorForSkill\(skill\)\)/.test(app), 'the practice view draws the modes skeletal');
  ok(/'#practise-guess-reagent\/' \+ c\.id/.test(hubView) && /practise-guess-reagent\\\/\(\[a-z0-9-\]\+\)/.test(app), 'each engine card on the hub opens "which reagent?" limited to that card');
  ok(/\/\* reaction modes \*\//.test(indexHtml) && /\.rm-mode\b/.test(indexHtml), 'the CSS block /* reaction modes */');
  eq(M.ENGINE_CARDS.length, 28, '28 engine cards (the ten fixed-answer cards have no engine)');
  for (const id of ['clemmensen', 'birch', 'diels-alder']) ok(!M.ENGINE_CARDS.includes(id), `${id}: a fixed-answer card is not an engine card`);
  ok(Object.values(M.REP).flat().every((id) => M.ENGINE_CARDS.includes(id)), 'the wrong-reagent pools use engine cards only');
  eq(M.GUESS_REAGENT_CARDS.length, 26, '26 cards can be practised as "which reagent?" (hub button)');
  for (const id of M.ENGINE_CARDS) {
    const n = M.allCombos([id]).filter((c) => M.buildGuessReagent(c, () => 0.5)).length;
    ok(M.GUESS_REAGENT_CARDS.includes(id) ? n > 0 : n === 0, `${id}: ${n} "which reagent?" problems, and it is ${M.GUESS_REAGENT_CARDS.includes(id) ? '' : 'not '}offered on the hub`);
  }

  // the label shown without the engine equals the label the drill's solve returns, for every combo
  let labelBad = 0;
  for (const c of M.allCombos()) { const S = M.solveForModes(c.cardId, c.sub, c.v); if (S.ok && S.label !== M.variantLabel(c.cardId, c.v)) { labelBad++; ok(false, `${c.cardId} ${c.v.id}: variantLabel ${M.variantLabel(c.cardId, c.v)} != solve label ${S.label}`); } }
  ok(labelBad === 0, 'variantLabel equals the drill label for every combo');

  // ---- (2) generate 200 problems per mode
  const rng = mulberry32(20261020);
  const probs = {};
  for (const m of M.MODE_IDS) probs[m] = generate(m, 200, { rng });
  const all = M.MODE_IDS.flatMap((m) => probs[m]);
  const mols = new Set();
  const addMol = (s) => { if (s) String(s).split('.').forEach((x) => mols.add(x)); };
  for (const m of M.MODE_IDS) {
    const list = probs[m];
    eq(list.length, 200, `${m}: 200 problems generated`);
    let consecutive = 0;
    for (const [i, p] of list.entries()) {
      const t = `${m} #${i} ${p.card} ${p.substrate || p.caseId}`;
      ok(p.kind === 'choice' && p.skill === m && p.mode === m && HUB_BY_ID[p.card], `${t}: kind, skill, card`);
      ok(p.options.length === 4, `${t}: 4 options (${p.options.length})`);
      eq(p.options.filter((o) => o.correct).length, 1, `${t}: exactly one right option`);
      ok(p.options.find((o) => o.correct).text === p.answer, `${t}: answer names the right option`);
      ok(Array.isArray(p.hints) && p.hints.length === 2 && p.hints.every((x) => x.length > 25), `${t}: two hints`);
      ok(typeof p.worked === 'string' && p.worked.length > 40 && typeof p.derive === 'string' && p.derive.length > 20, `${t}: worked and derive text`);
      ok(typeof p.promptHtml === 'string' && p.promptHtml.length > 20 && p.prompt.length > 10, `${t}: prompt`);
      const drawn = p.options.some((o) => o.smiles);
      if (drawn) {
        ok(p.options.every((o) => o.smiles), `${t}: all options are drawings`);
        eq(p.options.map((o) => o.text), p.options.map((_, k) => 'Option ' + 'ABCD'[k]), `${t}: option labels`);
        const keys = p.options.map((o) => parts([o.smiles]).map((x) => canon(x)).sort().join('.'));
        eq(new Set(keys).size, 4, `${t}: four different drawings`);
      } else {
        eq(new Set(p.options.map((o) => o.text)).size, 4, `${t}: four different texts`);
        ok(p.options.every((o) => o.text.length >= 3), `${t}: option texts`);
      }
      for (const o of p.options) {
        addMol(o.smiles);
        if (o.correct) ok(/^Yes/.test(o.why), `${t}: right option explains itself`);
        else {
          ok(typeof o.lead === 'string' && o.lead.length >= 25 && o.lead.length <= 400, `${t}: wrong option has its own specific line (${o.lead})`);
          ok(typeof o.more === 'string' && o.more.length > 10 && o.why.startsWith(o.lead), `${t}: wrong option keeps the longer reason as more`);
          ok(!/undefined|\[object|\bNaN\b|\bnull\b/.test(o.lead + o.more), `${t}: no placeholder text in the feedback (${o.lead})`);
        }
      }
      if (p.equation) { p.equation.reactants.forEach(addMol); p.equation.products.forEach(addMol); }
      (p.products || []).forEach(addMol); addMol(p.intermediate);
      const id = (q) => [q.card, q.substrate, q.reagent, q.halide, q.reagent2, q.halide2].join('|');
      if (i && p.mode !== 'wont-work' && id(p) === id(list[i - 1])) consecutive++;
    }
    ok(consecutive === 0, `${m}: the same problem never comes twice in a row`);
  }
  M.WONT_CASES.forEach((c) => [...c.works, ...c.fails].forEach((o) => addMol(o.smiles)));
  for (const s of mols) ok(canon(s) !== null, `${s} parses in RDKit (JS)`);

  // ---- Python RDKit read-back of every drawn molecule
  const uniq = [...mols];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-modes-'));
  const py = new Map();
  try {
    const inp = path.join(tmp, 'in.json'), outp = path.join(tmp, 'out.json');
    fs.writeFileSync(inp, JSON.stringify({ cases: [{ id: 'all', smiles: uniq }] }));
    execFileSync('python3', ['-I', path.join(TOOLS, 'check_hub.py'), inp, outp], { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 1 << 26 });
    JSON.parse(fs.readFileSync(outp, 'utf8')).cases[0].mols.forEach((m) => py.set(m.smiles, m));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  eq(py.size, uniq.length, 'Python read every drawn molecule');
  ok([...py.values()].every((m) => m.ok), 'every drawn molecule parses in Python RDKit');

  // ---- (3) guess-reagent
  let wrongReagents = 0;
  for (const [i, p] of probs['guess-reagent'].entries()) {
    const t = `guess-reagent #${i} ${p.card} ${p.substrate} ${p.reagent}`;
    const v = variantOf(p.card, p.reagent, p.halide);
    ok(!!v && !DRILL[p.card].fixed, `${t}: an engine card variant`);
    let want;
    try { want = engineProducts(p.card, p.substrate, p.reagent, p.halide); } catch (e) { ok(false, `${t}: the engine threw ${e.message}`); continue; }
    ok(same(keyOf(want), keyOf(p.products)), `${t}: the shown product is the engine product`);
    ok(same(keyOf(p.equation.products), keyOf(want)) && p.equation.reactants[0] === p.substrate && p.equation.cond === '?', `${t}: the equation draws substrate -> product with the reagent hidden`);
    ok(!same(keyOf(want), keyOf([p.substrate])), `${t}: the reaction changes the substrate`);
    const S = M.solveForModes(p.card, p.substrate, v);
    const right = p.options.find((o) => o.correct);
    eq(right.text, S.label, `${t}: the right reagent is the drill label of this combo`);
    const grp = HUB_BY_ID[p.card].group;
    for (const o of p.options.filter((x) => !x.correct)) {
      wrongReagents++;
      let prod;
      try { prod = engineProducts(o.ref.card, p.substrate, o.ref.reagent, o.ref.halide); } catch (e) { ok(false, `${t}: wrong reagent ${o.text} has no engine product (${e.message})`); continue; }
      ok(disjoint(keyOf(prod), keyOf(want)), `${t}: wrong reagent ${o.text} gives a DIFFERENT product on this substrate`);
      ok(!same(keyOf(prod), keyOf([p.substrate])), `${t}: wrong reagent ${o.text} really reacts`);
      ok(HUB_BY_ID[o.ref.card].group === grp, `${t}: wrong reagent comes from the same group`);
      ok(o.text !== right.text, `${t}: wrong reagent label differs`);
      eq(o.text, M.solveForModes(o.ref.card, p.substrate, variantOf(o.ref.card, o.ref.reagent, o.ref.halide)).label, `${t}: wrong reagent label is the drill label`);
      ok(o.lead.includes(o.text) && /shows|product/.test(o.lead), `${t}: the line names the reagent and the fact of the product (${o.lead})`);
    }
  }
  ok(wrongReagents === 600, `600 wrong reagents were each recomputed (${wrongReagents})`);

  // ---- (4) guess-reactant
  let wrongStarts = 0;
  for (const [i, p] of probs['guess-reactant'].entries()) {
    const t = `guess-reactant #${i} ${p.card} ${p.reagent}`;
    const v = variantOf(p.card, p.reagent, p.halide);
    const S = M.solveForModes(p.card, p.substrate, v);
    eq(p.equation.cond, S.label, `${t}: the reagent is the drill label`);
    ok(p.equation.reactants.length === 0 && same(keyOf(p.equation.products), keyOf(p.products)), `${t}: the equation draws the product after the reagent`);
    const right = p.options.find((o) => o.correct);
    eq(right.smiles, p.substrate, `${t}: the right option is the substrate`);
    let want;
    try { want = engineProducts(p.card, p.substrate, p.reagent, p.halide); } catch (e) { ok(false, `${t}: engine threw ${e.message}`); continue; }
    ok(same(keyOf(want), keyOf(p.products)) && !same(keyOf(want), keyOf([p.substrate])), `${t}: the shown product is the engine product of the right substrate`);
    for (const o of p.options) {
      let prod;
      try { prod = engineProducts(p.card, o.smiles, p.reagent, p.halide); } catch (e) { ok(false, `${t}: ${o.smiles} has no engine product (${e.message})`); continue; }
      if (o.correct) { ok(same(keyOf(prod), keyOf(p.products)), `${t}: ${o.smiles} gives exactly the shown product`); continue; }
      wrongStarts++;
      ok(disjoint(keyOf(prod), keyOf(p.products)), `${t}: wrong start ${o.smiles} gives a DIFFERENT product (shares nothing with the shown one)`);
      ok(DRILL[p.card].subs.includes(o.smiles), `${t}: wrong start comes from the card's pool`);
    }
  }
  ok(wrongStarts === 600, `600 wrong starting materials were each recomputed (${wrongStarts})`);

  // ---- (5) stereo-outcome
  const stats = { meso: 0, racemic: 0, single: 0, none: 0, syn: 0, anti: 0, ring: 0, ez: 0, acyclicMeso: 0 };
  for (const [i, p] of probs['stereo-outcome'].entries()) {
    const t = `stereo-outcome #${i} ${p.card} ${p.substrate} ${p.reagent}`;
    let want;
    try { want = engineProducts(p.card, p.substrate, p.reagent, p.halide); } catch (e) { ok(false, `${t}: engine threw ${e.message}`); continue; }
    ok(same(keyOf(want), keyOf(p.products)), `${t}: the product read is the engine product`);
    ok(/Indicate any appropriate stereochemistry/.test(p.promptHtml) && p.equation.products.length === 0, `${t}: exam phrasing, substrate and reagent only`);
    const card = HUB_BY_ID[p.card];
    const T = p.stereo;
    ok(T.G === null || T.G === card.facts.space, `${t}: the syn/anti label is the card's own space fact`);
    // the read-back in Python
    const ms = p.products.map((x) => py.get(x));
    if (ms.length !== 1) { ok(T.C === 'none', `${t}: several products carry no stereo label`); stats.none++; continue; }
    const m = ms[0];
    const nC = m.centres.length + m.unassigned;
    eq(nC, T.nCenters, `${t}: stereocentres counted in Python (${m.centres.join('')}, ${m.unassigned} open) = ${T.nCenters}`);
    if (T.C === 'meso') { ok(nC >= 2 && m.achiral && m.unassigned === 0, `${t}: meso = achiral with 2+ specified centres`); stats.meso++; }
    if (T.C === 'racemic') { ok((nC === 1) || (nC >= 2 && !m.achiral), `${t}: racemic = chiral (one centre, or no internal mirror plane)`); stats.racemic++; }
    if (T.C === 'single') { ok(nC === 0 && m.ez.length > 0, `${t}: single = no centre, a fixed C=C geometry (${m.ez})`); stats.single++; }
    if (T.C === 'none') { ok(nC === 0 && m.ez.length === 0, `${t}: none = no centre and no E/Z`); stats.none++; }
    eq(T.ez, m.ez.length > 0, `${t}: E/Z presence read in Python`);
    if (T.G) {
      stats[T.G]++;
      if (/\d/.test(p.substrate) && m.cistrans && p.card !== 'alkene-epoxide') { stats.ring++; eq(m.cistrans, T.G === 'syn' ? 'cis' : 'trans', `${t}: ${T.G} addition gives ${T.G === 'syn' ? 'cis' : 'trans'} on the ring (3D read-back)`); }
      if (p.card.startsWith('alkyne')) { stats.ez++; ok(m.ez.includes(T.G === 'syn' ? 'Z' : 'E'), `${t}: ${T.G} addition to an alkyne gives ${T.G === 'syn' ? 'Z' : 'E'} (${m.ez})`); }
      if (p.substrate === 'C/C=C/C' || p.substrate === 'C/C=C\\C') {
        const E = p.substrate === 'C/C=C/C', meso = (E && T.G === 'anti') || (!E && T.G === 'syn');
        stats.acyclicMeso++;
        eq(T.C, meso ? 'meso' : 'racemic', `${t}: ${E ? 'E' : 'Z'}-but-2-ene with a ${T.G} addition is ${meso ? 'meso' : 'a racemate'}`);
      }
    }
    // options: exactly one carries the true (G, C); each wrong option differs in at least one facet
    const rightO = p.options.find((o) => o.correct);
    ok(rightO.G === T.G && rightO.C === T.C, `${t}: the right option is the true (cis/trans, kind)`);
    for (const o of p.options.filter((x) => !x.correct)) ok(o.G !== T.G || o.C !== T.C, `${t}: a wrong option differs from the truth in at least one facet`);
  }
  ok(stats.meso >= 5 && stats.racemic >= 15 && stats.single >= 8 && stats.none >= 25 && stats.syn >= 10 && stats.anti >= 20 && stats.ring >= 8 && stats.ez >= 10 && stats.acyclicMeso >= 4,
    `stereo labels of every kind were read back (${JSON.stringify(stats)})`);

  // ---- (6) two-step
  const tstats = { fail: 0, differ: 0, templates: new Set(), swapped: 0 };
  const chainRun = (start, steps) => {
    let cur = start;
    for (let k = 0; k < steps.length; k++) {
      let prod;
      try { prod = engineProducts(steps[k].card, cur, steps[k].reagent, steps[k].halide); } catch (e) { return { ok: false, at: k + 1 }; }
      if (same(keyOf(prod), keyOf([cur]))) return { ok: false, at: k + 1 };
      if (k === 0 && steps.length > 1 && prod.length !== 1) return { ok: false, at: 1 };   // a mixture cannot feed the next step
      if (k === steps.length - 1) return { ok: true, final: prod, p1: cur === start ? null : cur };
      cur = prod[0];
    }
    return { ok: false, at: 0 };
  };
  for (const [i, p] of probs['two-step'].entries()) {
    const t = `two-step #${i} ${p.template} ${p.substrate}`;
    tstats.templates.add(p.template);
    const rightO = p.options.find((o) => o.correct);
    const run = chainRun(p.substrate, rightO.steps);
    ok(run.ok, `${t}: the right pair runs on the engines`);
    if (!run.ok) continue;
    ok(same(keyOf(run.final), keyOf(p.products)) && same(keyOf(p.equation.products), keyOf(p.products)) && p.equation.reactants[0] === p.substrate, `${t}: the right pair composes to the shown final product`);
    const p1 = engineProducts(rightO.steps[0].card, p.substrate, rightO.steps[0].reagent, rightO.steps[0].halide);
    ok(p1.length === 1 && canon(p1[0]) === canon(p.intermediate), `${t}: the intermediate is the engine's first product`);
    ok(M.TEMPLATE_BY_ID[p.template].A === rightO.steps[0].card && M.TEMPLATE_BY_ID[p.template].B === rightO.steps[1].card, `${t}: the right pair follows the template`);
    ok(rightO.text.split('<br>').length === 2 && rightO.text.includes(p.labels[0]) && rightO.text.includes(p.labels[1]), `${t}: the right option names both reagents in order`);
    for (const o of p.options.filter((x) => !x.correct)) {
      const r = chainRun(p.substrate, o.steps);
      if (!r.ok) { tstats.fail++; continue; }
      tstats.differ++;
      ok(disjoint(keyOf(r.final), keyOf(p.products)), `${t}: wrong pair "${o.text}" ends at a different compound`);
    }
    if (p.options.some((o) => o.kind2 === 'swapped')) tstats.swapped++;
    for (const o of p.options) ok(o.steps.length === 2 && o.text.split('<br>').length === 2, `${t}: every option is an ordered pair`);
  }
  ok(tstats.templates.size >= 14 && tstats.swapped >= 80 && tstats.fail >= 60 && tstats.differ >= 60, `two-step: ${tstats.templates.size} templates, ${tstats.swapped} swapped-order options, ${tstats.fail} wrong pairs fail, ${tstats.differ} end elsewhere`);

  // ---- (7) wont-work
  ok(M.WONT_CASES.length >= 15 && M.WONT_CASES.length <= 25, `wont-work has 15 to 25 curated cases (${M.WONT_CASES.length})`);
  eq(new Set(M.WONT_CASES.map((c) => c.id)).size, M.WONT_CASES.length, 'wont-work case ids are unique');
  const checkOpt = (c, o, works) => {
    const k = c.check, t = `${c.id} ${o.smiles || o.text || o.acid}`;
    const expect = (cond, msg) => ok(cond === works, `${t}: ${works ? 'works' : 'fails'} per the engine (${msg})`);
    switch (k.kind) {
      case 'subst': { const q = R.predictSubst(o.smiles, k.reagent, k.halide); expect(q.ok, q.ok ? 'ok' : q.code); if (!works) ok(['deactivated', 'amine'].includes(q.code), `${t}: refused for a taught reason (${q.code})`); break; }
      case 'halide': { const q = R.predictEAS(R.BENZENE, 'RCl', o.smiles); expect(q.ok, q.ok ? 'ok' : q.code); if (!works) ok(['rearranges', 'arylHalide', 'vinylicHalide'].includes(q.code), `${t}: refused for a taught reason (${q.code})`); break; }
      case 'hydrogenate': { const r = R.hydrogenate(o.smiles, 'H2_Pd'); expect(r.ok && r.reacts, 'H2_Pd'); break; }
      case 'oxidize': { const r = R.oxidizeSideChain(o.smiles); expect(r.ok && r.reacts, 'KMnO4'); break; }
      case 'benzylicH': expect(hasMol(o.smiles, '[CX4;!H0]-c'), 'benzylic H'); break;
      case 'carbinolH': expect(hasMol(o.smiles, '[CX4;!H0]-[OX2H]'), 'H on the C-OH carbon'); break;
      case 'acetylide': { let good = true; try { R.acetylideOf(o.smiles); } catch (e) { good = false; } expect(good, 'terminal'); break; }
      case 'acetylideHalide': { const card = Object.values(CARDS).find((x) => x.kind === 'rx' && x.smiles === o.smiles); ok(!!card, `${t}: a halide card`); const r = applyCard({ kind: 'acetylide', smiles: R.acetylideOf('CC#C') }, card.id); expect(r.ok, r.ok ? 'ok' : r.code); if (!works) eq(r.code, 'notPrimary', `${t}: refused as not primary`); break; }
      case 'lindlar': { const r = R.predictAlkyne(o.smiles, 'H2_Lindlar'); expect(r.stereo === 'Z', String(r.stereo)); break; }
      case 'hydrationTarget': {
        const target = canon(o.smiles);
        const made = DRILL['alkyne-hydration'].subs.filter((a) => { try { return R.predictAlkyne(a, 'H2O_Hg').products.includes(target); } catch (e) { return false; } });
        expect(made.length > 0 && /^C.*C\(C\)=O$|C\(C\)=O/.test(o.smiles), `${made.length} terminal/symmetric alkynes give it`);
        if (!works) ok(hasMol(o.smiles, '[CX3H1]=O'), `${t}: the failing target is an aldehyde`);
        else ok(hasMol(o.smiles, '[CH3]C(=O)[#6]'), `${t}: the working targets are methyl ketones`);
        break;
      }
      case 'acid': { const r = acidReaction(o.acid, k.base); expect(r.favoured === 'right', `favoured ${r.favoured}`); break; }
      case 'br2': { let good = true; try { R.predictAdd(o.smiles, 'Br2'); } catch (e) { good = false; } expect(good, 'Br2 adds'); break; }
      case 'directs': { const q = R.predictSubst(o.smiles, k.reagent, null); expect(q.ok && q.rels && q.rels.join() === 'ortho,para', q.ok ? String(q.rels) : q.code); break; }
      case 'text': break;
      default: ok(false, `${c.id}: unknown check ${k.kind}`);
    }
  };
  const kindsSeen = new Set();
  for (const c of M.WONT_CASES) {
    ok(HUB_BY_ID[c.card], `${c.id}: links to a hub card`);
    ok(c.works.length >= 3 && c.fails.length >= 1, `${c.id}: at least 3 that work and 1 that fails`);
    ok(c.stem.length > 30 && c.ask.includes('<b>not</b>') && c.hint.length > 20, `${c.id}: stem, ask and hint`);
    ok(c.fails.every((f) => typeof f.reason === 'string' && f.reason.length >= 50), `${c.id}: every failing option has its taught reason`);
    const all = [...c.works, ...c.fails];
    const type = (o) => (o.smiles ? 'smiles' : o.acid ? 'acid' : 'text');
    eq(new Set(all.map(type)).size, 1, `${c.id}: all options are of one kind`);
    eq(new Set(all.map((o) => o.smiles || o.text || o.acid)).size, all.length, `${c.id}: options are all different`);
    kindsSeen.add(c.check.kind);
    for (const o of c.works) checkOpt(c, o, true);
    for (const o of c.fails) checkOpt(c, o, false);
  }
  // the two text-only checks: the hub cards say what the options say
  {
    const cr = HUB_BY_ID['oxidation-cr'].reagent, pcc = HUB_BY_ID['oxidation-pcc'].reagent;
    const c = M.WONT_CASES.find((x) => x.id === 'primary-alcohol-to-acid');
    ok(c.works.every((w) => cr.includes(w.text.split(',')[0].split(' ')[0].replace('Na₂Cr₂O₇', 'Na₂Cr₂O₇'))), 'the working oxidants are the ones on the Cr(VI) card');
    ok(/PCC/.test(pcc) && c.fails.every((f) => f.text.startsWith('PCC')), 'the failing reagent is the PCC card');
    ok(/1° alcohol → CARBOXYLIC ACID/.test(HUB_BY_ID['oxidation-cr'].facts.where) && /aldehyde \(it stops there\)/.test(HUB_BY_ID['oxidation-pcc'].facts.where), 'the hub cards state the reasons');
    ok(/3° alcohol → no reaction/.test(HUB_BY_ID['oxidation-pcc'].facts.where), 'the PCC card says a 3° alcohol does not react');
  }
  ok(kindsSeen.size >= 12, `the cases use ${kindsSeen.size} different engine checks`);
  for (const [i, p] of probs['wont-work'].entries()) {
    const t = `wont-work #${i} ${p.caseId}`;
    const c = M.WONT_CASES.find((x) => x.id === p.caseId);
    const label = (o) => o.smiles || o.text || acidLabel(o.acid);
    const failLabels = c.fails.map(label), workLabels = c.works.map(label);
    const right = p.options.find((o) => o.correct), wrong = p.options.filter((o) => !o.correct);
    ok(failLabels.includes(right.smiles || right.text), `${t}: the right answer is one that FAILS`);
    ok(wrong.every((o) => workLabels.includes(o.smiles || o.text)), `${t}: the three others WORK`);
    const f = c.fails.find((x) => label(x) === (right.smiles || right.text));
    ok(right.why.includes(f.reason), `${t}: the diagnosis is the case's reason`);
  }
  function acidLabel(a) { return `${ACID[a].haLabel} (pKa ${ACID[a].pkaText})`; }
  eq(new Set(probs['wont-work'].map((p) => p.caseId)).size, M.WONT_CASES.length, 'the 200 problems visit every case');

  // ---- (8) counts
  const rng0 = () => 0.5;
  const eng = M.allCombos();
  const nReagent = eng.filter((c) => M.buildGuessReagent(c, rng0)).length;
  const nReactant = eng.filter((c) => M.buildGuessReactant(c, rng0)).length;
  const nStereo = M.allCombos(M.STEREO_CARDS).filter((c) => M.buildStereoOutcome(c, rng0)).length;
  let nChains = 0; const chainTriples = new Set();
  for (const tpl of M.TEMPLATES) for (const ch of M.chainsOf(tpl)) {
    if (!M.buildTwoStep(ch, rng0)) continue;
    nChains++;
    const run = chainRun(ch.start, [{ card: ch.a.cardId, reagent: ch.a.v.id, halide: ch.a.v.halide || null }, { card: ch.b.cardId, reagent: ch.b.v.id, halide: ch.b.v.halide || null }]);
    chainTriples.add(`${canon(ch.start)}|${ch.a.cardId}:${ch.a.v.id}:${ch.a.v.halide || ''}>${ch.b.cardId}:${ch.b.v.id}:${ch.b.v.halide || ''}|${keyOf(run.final).join('.')}`);
  }
  const single = new Set();
  for (const c of eng) { const S = M.solveForModes(c.cardId, c.sub, c.v); if (S.ok && S.reacts) single.add(`${canon(c.sub)}|${S.label}|${S.key.join('.')}`); }
  const wontProblems = M.WONT_CASES.reduce((n, c) => n + (c.works.length * (c.works.length - 1) * (c.works.length - 2) / 6) * c.fails.length, 0);
  const counts = { 'guess-reagent': nReagent, 'guess-reactant': nReactant, 'stereo-outcome': nStereo, 'two-step': nChains, 'wont-work': wontProblems };
  for (const m of M.MODE_IDS) eq(M.MODE_COUNTS[m], counts[m], `MODE_COUNTS['${m}'] is the number of problems the mode can make`);
  const triples = single.size + chainTriples.size;
  // 28 engine cards x their substrate pools x reagent variants give `single` distinct (substrate, reagent, product) triples; the two-step chains add `chainTriples`.
  ok(single.size >= 1000, `at least 1000 distinct single-step (substrate, reagent, product) triples (${single.size})`);
  ok(chainTriples.size >= 500, `at least 500 distinct two-step (substrate, reagent pair, product) triples (${chainTriples.size})`);
  ok(triples >= 1500, `at least 1500 distinct (substrate, reagent, product) triples in all (${triples})`);
  return { counts, triples, single: single.size, chains: chainTriples.size, wrongReagents, wrongStarts, stats, tstats: { fail: tstats.fail, differ: tstats.differ, swapped: tstats.swapped, templates: tstats.templates.size }, cases: M.WONT_CASES.map((c) => c.id) };
}

// run alone: node learn/tests/reaction-modes.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  const r = await reactionModes({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed`);
  console.log(JSON.stringify(r, null, 1));
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
