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
//  (8) the counts: how many problems each mode can make, and the distinct (substrate, reagent, product) triples; MODE_COUNTS must equal them;
//  (9) the settings of the six reaction practice pages (reactionSettings below): static pools equal the builders, 120 seeded settings combinations, relaxation, presets, mixed sessions, live counts.
// Run on its own with `node learn/tests/reaction-modes.mjs`, or as part of run.mjs.
import { ready, canon, rdkit, analyze } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HUB_BY_ID } from '../engine/reaction-hub.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import { DRILL, drillCombos, solveCard, problemFor } from '../engine/generators-predict.js';
import * as C from '../engine/reactions-custom.js';
import * as A from '../engine/reaction-attrs.js';
import { POOL_DATA } from '../engine/reaction-pools.js';
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
  const okReagent = eng.filter((c) => M.buildGuessReagent(c, rng0)), okReactant = eng.filter((c) => M.buildGuessReactant(c, rng0));
  const okStereo = M.allCombos(M.STEREO_CARDS).map((c) => ({ c, p: M.buildStereoOutcome(c, rng0) })).filter((x) => x.p);
  const nReagent = okReagent.length, nReactant = okReactant.length, nStereo = okStereo.length;
  const okChains = [];
  let nChains = 0; const chainTriples = new Set();
  for (const tpl of M.TEMPLATES) for (const ch of M.chainsOf(tpl)) {
    const tp = M.buildTwoStep(ch, rng0);
    if (!tp) continue;
    okChains.push({ ch, p: tp });
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
  await reactionSettings({ ok, eq }, { okReagent, okReactant, okStereo, okChains });
  return { counts, triples, single: single.size, chains: chainTriples.size, wrongReagents, wrongStarts, stats, tstats: { fail: tstats.fail, differ: tstats.differ, swapped: tstats.swapped, templates: tstats.templates.size }, cases: M.WONT_CASES.map((c) => c.id) };
}

// ======================================================================================================================================
// The settings of the six reaction practice pages (engine/reactions-custom.js, engine/reaction-attrs.js, engine/reaction-pools.js, reactions-settings-view.js)
//   (1) wiring: card families, labels, groups, curated-case tags, router, CSS, generators; (2) the static pools equal what the builders can make, row for row, with the right stereo tag;
//   (3) the substrate class is read back with RDKit; (4) 120 seeded settings combinations: every problem satisfies the filters in force, or the page reports the relaxation;
//   (5) the relaxation order; (6) presets round-trip; (7) the mixed session interleaves the modes; (8) live counts equal the filtered pool sizes (10 random settings);
//   (9) weak-spot weighting, endless and timer, the card markup, the lessons left alone.
// ======================================================================================================================================
async function reactionSettings({ ok, eq }, built) {
  const { okReagent, okReactant, okStereo, okChains } = built;
  const appSrc = fs.readFileSync(path.join(HERE, '..', 'app.js'), 'utf8');
  const stepsSrc = fs.readFileSync(path.join(HERE, '..', 'engine', 'steps.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
  const MODES6 = ['predict-product', 'guess-reagent', 'guess-reactant', 'stereo-outcome', 'two-step', 'wont-work'];
  const FAM = A.FAMILY_OF;
  const choose3 = (n) => (n * (n - 1) * (n - 2)) / 6;
  const rng0 = () => 0.5;
  store.resetAll();

  // ---- (1) wiring
  eq(C.PRACTICE_MODES, MODES6, 'six practice modes (the predict drill and the five reaction modes)');
  eq(A.CARD_IDS.length, 38, '38 hub cards');
  eq(A.FAMILY_IDS.length, 9, 'nine reagent families');
  eq(A.SUBSTRATE_IDS, ['alkenes', 'cycloalkenes', 'alkynes', 'dienes', 'arenes', 'alcohols'], 'six substrate classes');
  ok(A.CARD_IDS.every((id) => FAM[id] && A.FAMILY_IDS.includes(FAM[id]) && A.CARD_LABEL[id] && A.CARD_LABEL[id].length <= 24), 'every card has a family and a short label');
  ok(A.FAMILY_IDS.every((f) => A.CARD_IDS.some((id) => FAM[id] === f)), 'every family has at least one card');
  eq(Object.keys(FAM).length, 38, 'the family table has exactly the 38 cards');
  eq(A.CARD_GROUPS.flatMap((g) => g.cards).sort(), A.CARD_IDS.slice().sort(), 'the card groups hold every card once');
  eq(A.CARD_GROUPS.map((g) => g.cards.length), [18, 9, 9, 2], 'groups: aromatics 18, alkenes 9, alkynes 9, dienes 2');
  const FAM_SPOT = { 'alkene-hx': 'hx', 'alkene-hydration': 'hx', 'diene-hx': 'hx', 'alkene-x2': 'x2', 'alkene-epoxide-diol': 'x2', 'alkene-h2-pd': 'syn', 'alkene-kmno4-base': 'syn', 'alkene-epoxide': 'syn',
    'alkene-kmno4-acid': 'oxid', 'oxidation-pcc': 'oxid', 'oxidation-cr': 'oxid', 'alkyne-lindlar': 'alkyne', 'alkyne-acetylide': 'alkyne', 'eas-nitration': 'eas', 'fc-acylation': 'eas', 'director-meta': 'directors',
    'side-chain-kmno4': 'sidechain', 'nitro-reduction': 'sidechain', 'clemmensen': 'hubonly', 'diels-alder': 'hubonly', 'alkyne-hydroboration': 'hubonly' };
  for (const [id, f] of Object.entries(FAM_SPOT)) eq(FAM[id], f, `${id} is in the ${f} family`);
  eq(A.CARD_IDS.filter((id) => FAM[id] === 'hubonly').every((id) => DRILL[id].fixed), true, 'hub-only facts are cards with no engine model');
  ok(M.WONT_CASES.every((c) => C.WONT_META[c.id] && A.SUBSTRATE_IDS.includes(C.WONT_META[c.id].cls) && ['easy', 'medium', 'hard'].includes(C.WONT_META[c.id].diff)), 'every curated case is tagged with a substrate class and a difficulty');
  eq(C.RELAX_ORDER, ['difficulty', 'stereo', 'substrates', 'families', 'cards'], 'relaxation order: least important first');
  ok(generatorForSkill(C.MIX_ID) === C.MIX_ID && GENERATORS[C.MIX_ID] === true, 'the mixed session has its own generator');
  ok(/import \{ reactionSettingsCard \} from '\.\/reactions-settings-view\.js'/.test(appSrc) && /reactionSettingsCard\(\{ where: 'landing'/.test(appSrc) && /where: skill === RX\.MIX_ID \? 'mix' : 'practice'/.test(appSrc), 'app.js mounts the settings card on the landing page and on every practice page');
  ok(/RX\.beginReactionSession\(\)/.test(appSrc) && /RX\.practiceConfig\(\)/.test(appSrc) && /endless: pc\.endless/.test(appSrc), 'the practice page reads the count, timer and endless choice from the settings');
  ok(/\^practise-\(\[a-z0-9-\]\+\)\$/.test(appSrc) && /'#practise-' \+ RX\.MIX_ID/.test(appSrc), 'the mixed session is served by the same #practise-<skill> route');
  ok(/\/\* reaction settings card/.test(indexHtml) && /\.rs-card\b/.test(indexHtml) && /\.rs-cardstoggle\b/.test(indexHtml) && /\.rs-mini\b/.test(indexHtml), 'CSS block for the reaction settings card');
  ok(/cfg\.endless === true/.test(stepsSrc) && /rs-end/.test(stepsSrc) && /ctx\.mistake\(p\.skill, 'mastery', opt && opt\.lead \? opt\.lead : why, p\.card\)/.test(stepsSrc), 'the problem runner has an endless mode and logs slips against the card');
  const view = fs.readFileSync(path.join(HERE, '..', 'reactions-settings-view.js'), 'utf8');
  ok(/export function reactionSettingsCard/.test(view) && /C\.settingsCardHtml/.test(view) && /dataset\.gall/.test(view), 'the settings view paints the pure card markup');
  ok(C.isUnfiltered(C.defaultSettings()) && C.defaultSettings().count === 10 && C.defaultSettings().timer === 0 && C.defaultSettings().modes.length === 0 && C.defaultSettings().weak === false, 'defaults: no filter, 10 problems, no timer, no mixed modes, no weighting');
  const ns = C.normalizeSettings({ substrates: ['bogus'], families: [], cards: ['nope', 'alkene-hx'], stereo: 'x', difficulty: 'z', modes: ['wont-work', 'bad', 'guess-reagent'], count: 7, timer: 5, weak: 'yes' });
  eq([ns.substrates.length, ns.families.length, ns.cards, ns.stereo, ns.difficulty, ns.modes, ns.count, ns.timer, ns.weak], [6, 9, ['alkene-hx'], 'any', '', ['guess-reagent', 'wont-work'], 10, 0, false], 'normalizeSettings repairs every field (and keeps the modes in order)');
  eq(C.normalizeSettings({ count: 0 }).count, 0, 'count 0 means endless');
  eq(C.normalizeSettings(null).count, 10, 'normalizeSettings(null) gives the defaults');
  // storage under ui.reactions
  C.setCurrentSettings({ substrates: ['alkenes'], count: 20, timer: 90 });
  eq(store.getUi('reactions').substrates, ['alkenes'], 'the settings live in the store as ui.reactions');
  eq([C.currentSettings().count, C.currentSettings().timer, C.practiceConfig().endless], [20, 90, false], 'currentSettings and practiceConfig read ui.reactions');
  C.setCurrentSettings({ count: 0 });
  eq(C.practiceConfig(), { count: 0, endless: true, timer: 0 }, 'count 0 is endless in the practice config');
  store.resetAll();

  // ---- (2) the static pools equal what the builders can make
  const subKey = (cardId, sub, v) => `${cardId}|${sub}|${DRILL[cardId].variants.indexOf(v)}`;
  const stOf = (cardId, sub, v) => A.productStereo(M.solveForModes(cardId, sub, v).products);
  const poolMap = (mode) => {
    const m = new Map(), dup = [];
    for (const [cardId, rows] of Object.entries(POOL_DATA[mode])) for (let i = 0; i < rows.length; i += 3) {
      const k = `${cardId}|${DRILL[cardId].subs[rows[i]]}|${rows[i + 1]}`;
      if (m.has(k)) dup.push(k);
      m.set(k, rows[i + 2] === 1);
    }
    return { m, dup };
  };
  const okPredict = [];
  for (const c of drillCombos()) {
    let p = null;
    try { p = problemFor(c.card, c.sub, c.variant, rng0); } catch (e) { p = null; }
    if (p) okPredict.push({ cardId: c.card, sub: c.sub, v: c.variant, st: A.productStereo(solveCard(c.card, c.sub, c.variant, rng0).products) });
  }
  const lists = {
    'predict-product': okPredict,
    'guess-reagent': okReagent.map((c) => ({ ...c, st: stOf(c.cardId, c.sub, c.v) })),
    'guess-reactant': okReactant.map((c) => ({ ...c, st: stOf(c.cardId, c.sub, c.v) })),
    'stereo-outcome': okStereo.map((x) => ({ ...x.c, st: x.p.stereo.C !== 'none' }))
  };
  for (const mode of Object.keys(lists)) {
    const want = new Map(lists[mode].map((c) => [subKey(c.cardId, c.sub, c.v), c.st]));
    const { m, dup } = poolMap(mode);
    eq(dup, [], `${mode}: the pool has no repeated row`);
    eq([...m.keys()].sort(), [...want.keys()].sort(), `${mode}: the static pool is exactly what the builder can make (${want.size} problems)`);
    eq([...m].filter(([k, v]) => want.get(k) !== v).length, 0, `${mode}: every pool row carries the right stereo tag`);
  }
  {
    const want = new Map(okChains.map(({ ch, p }) => [`${ch.t.id}|${ch.start}|${DRILL[ch.t.A].variants.indexOf(ch.a.v)}|${DRILL[ch.t.B].variants.indexOf(ch.b.v)}`, A.productStereo(p.products)]));
    const got = new Map();
    for (const [tid, rows] of Object.entries(POOL_DATA['two-step'])) for (let i = 0; i < rows.length; i += 4) got.set(`${tid}|${DRILL[M.TEMPLATE_BY_ID[tid].A].subs[rows[i]]}|${rows[i + 1]}|${rows[i + 2]}`, rows[i + 3] === 1);
    eq([...got.keys()].sort(), [...want.keys()].sort(), `two-step: the static pool is exactly the chains the builder can make (${want.size})`);
    eq([...got].filter(([k, v]) => want.get(k) !== v).length, 0, 'two-step: every pool row carries the right stereo tag');
  }
  eq(C.poolItems('wont-work').reduce((n, it) => n + it.n, 0), M.MODE_COUNTS['wont-work'], 'wont-work: the cases stand for the mode count');
  for (const m of ['guess-reagent', 'guess-reactant', 'stereo-outcome', 'two-step']) eq(C.poolItems(m).length, M.MODE_COUNTS[m], `${m}: the pool is MODE_COUNTS long`);
  ok(C.poolItems('predict-product').length === okPredict.length && okPredict.length >= 1500, `predict-product: ${okPredict.length} problems`);
  // stereo tags read back on known cases
  for (const [prods, want] of [[['BrC1CCCCC1Br'], true], [['CC(C)Br'], false], [['CC(Br)CC'], true], [['C/C=C/C'], true], [['CC=C'], false], [['CCCC'], false], [['CC(C)Br', 'CC(Br)CC'], true]]) eq(A.productStereo(prods), want, `productStereo ${prods.join(' + ')} is ${want}`);

  // ---- (3) the substrate class, read back with RDKit
  const nMatch = (smi, sma) => { const m = rdkit().get_mol(smi), q = rdkit().get_qmol(sma); try { return JSON.parse(m.get_substruct_matches(q)).length; } finally { m.delete(); q.delete(); } };
  const rdClass = (smi) => {
    if (nMatch(smi, '[CX4;!$(C=O)][OX2H]')) return 'alcohols';
    if (nMatch(smi, 'a')) return 'arenes';
    if (nMatch(smi, 'C#C')) return 'alkynes';
    const n = nMatch(smi, 'C=C');
    return n >= 2 ? 'dienes' : n === 1 ? (nMatch(smi, 'C=@C') ? 'cycloalkenes' : 'alkenes') : 'alkenes';
  };
  const allSubs = [...new Set(A.CARD_IDS.flatMap((id) => DRILL[id].subs))];
  const badClass = allSubs.filter((s) => A.substrateClass(s) !== rdClass(s));
  eq(badClass, [], `substrateClass agrees with RDKit on all ${allSubs.length} substrates`);
  eq(new Set(allSubs.map(A.substrateClass)).size, 6, 'all six substrate classes occur in the pools');
  const tiers = { easy: 0, medium: 0, hard: 0 };
  allSubs.forEach((s) => { tiers[A.difficultyOf(s)]++; });
  ok(tiers.easy > 20 && tiers.medium > 5 && tiers.hard >= 2, `difficulty tiers all occur (${JSON.stringify(tiers)})`);
  eq([A.difficultyOf('CC=C'), A.difficultyOf('c1ccccc1'), A.difficultyOf('Cc1ccccc1'), A.difficultyOf('CC(C)=C(C)C'), A.difficultyOf('CC1=C(C)CCCC1')], ['easy', 'easy', 'easy', 'hard', 'hard'], 'difficulty: textbook substrates are easy, crowded ones hard');
  const diffOf = (c) => A.difficultyOf(c);

  // ---- (4) 120 seeded settings combinations
  const rs = mulberry32(20261020);
  const pickR = (a) => a[Math.floor(rs() * a.length)];
  const subset = (arr, min = 1) => { const a = arr.filter(() => rs() < 0.45); return a.length >= min ? a : min ? [pickR(arr)] : []; };
  const randSettings = () => C.normalizeSettings({
    substrates: rs() < 0.55 ? subset(A.SUBSTRATE_IDS) : undefined, families: rs() < 0.5 ? subset(A.FAMILY_IDS) : undefined, cards: rs() < 0.35 ? subset(A.CARD_IDS) : undefined,
    stereo: pickR(A.STEREO_IDS), difficulty: pickR(A.DIFF_IDS), modes: rs() < 0.5 ? subset(MODES6, 0) : [], weak: rs() < 0.3, count: pickR(C.COUNT_IDS), timer: pickR(C.TIMER_IDS)
  });
  const hasStereo = (p) => (p.skill === 'stereo-outcome' ? p.stereo.C !== 'none' : p.skill === 'wont-work' ? false : A.productStereo(p.products));
  const stat = { asked: 0, relaxed: 0, skipped: 0, problems: 0, byMode: {}, filtered: 0 };
  const problemOk = (p, F, res, t) => {
    ok(res.modes.includes(p.skill), `${t}: ${p.skill} is one of the modes in play (${res.modes.join()})`);
    const cards = [p.card, p.card2].filter(Boolean);
    ok(cards.some((c) => F.cards.includes(c) && F.families.includes(FAM[c])), `${t}: a card of the problem (${cards.join()}) is a chosen card in a chosen family`);
    const cls = p.skill === 'wont-work' ? C.WONT_META[p.caseId].cls : rdClass(p.substrate);
    ok(F.substrates.includes(cls), `${t}: substrate class ${cls} is chosen`);
    const dif = p.skill === 'wont-work' ? C.WONT_META[p.caseId].diff : diffOf(p.substrate);
    ok(!F.difficulty || dif === F.difficulty, `${t}: difficulty ${dif} is the one asked`);
    const st = hasStereo(p);
    ok(F.stereo === 'any' || (F.stereo === 'has') === st, `${t}: stereo ${st} matches the "${F.stereo}" filter`);
    ok(p.options.filter((o) => o.correct).length === 1 && p.options.length >= 3 && p.options.length <= 4, `${t}: ${p.skill}/${p.card} has one right option of 3-4 (${p.options.length} options, ${p.options.filter((o) => o.correct).length} right)`);
    eq(p.relaxed, res.relaxed, `${t}: the problem records what was relaxed`);
    eq(p.settingsNote, res.message, `${t}: the problem carries the notice`);
  };
  C.endReactionSession();
  const rngG = mulberry32(77);
  for (let i = 0; i < 120; i++) {
    const S = randSettings();
    const playId = pickR([...MODES6, C.MIX_ID]);
    const res = C.resolveReactions(S, playId);
    const F = res.eff, t = `combo #${i} (${playId}, ${C.summaryOf(S)})`;
    stat.asked++;
    if (res.relaxed.length) { stat.relaxed++; ok(res.message.length > 30 && res.changes.length === res.relaxed.length && res.relaxed.every((k) => C.RELAX_ORDER.includes(k)), `${t}: the relaxation is reported`); }
    else eq(F, C.filterOf(S), `${t}: nothing relaxed means the filter is the one asked`);
    if (res.skipped.length) { stat.skipped++; ok(res.message.length > 20 && res.skipped.every((m) => !res.modes.includes(m)), `${t}: a left-out mode is reported`); }
    if (!isUnfilteredF(F)) stat.filtered++;
    ok(res.modes.length >= 1, `${t}: some mode has a problem`);
    const ps = C.generateReactions(playId, 3, { rng: rngG, settings: S });
    eq(ps.length, 3, `${t}: three problems`);
    ps.forEach((p, j) => { stat.problems++; stat.byMode[p.skill] = (stat.byMode[p.skill] || 0) + 1; problemOk(p, F, res, `${t} #${j}`); });
  }
  function isUnfilteredF(F) { return F.substrates.length === 6 && F.families.length === 9 && F.cards.length === 38 && F.stereo === 'any' && F.difficulty === ''; }
  ok(stat.relaxed >= 8 && stat.asked - stat.relaxed >= 40, `the 120 combinations include ${stat.relaxed} relaxed and ${stat.asked - stat.relaxed} met as asked`);
  ok(stat.skipped >= 5, `${stat.skipped} combinations left a mode out`);
  ok(stat.filtered >= 80, `${stat.filtered} combinations really filtered`);
  ok(MODES6.every((m) => stat.byMode[m] > 0), `every mode produced problems (${JSON.stringify(stat.byMode)})`);

  // ---- (5) the relaxation order
  const relax = (raw, play) => C.resolveReactions(C.normalizeSettings(raw), play);
  eq(relax({ substrates: ['arenes'], families: ['x2'] }, 'guess-reagent').relaxed, ['substrates'], 'arenes with the X₂ family: the substrate class goes (it is less important than the family)');
  eq(relax({ stereo: 'has' }, 'wont-work').relaxed, ['stereo'], 'wont-work has no stereo to show: the stereo filter goes');
  eq(relax({ substrates: ['alcohols'], difficulty: 'hard' }, 'predict-product').relaxed, ['difficulty'], 'no hard alcohol: difficulty goes first');
  eq(relax({ substrates: ['alcohols'], families: ['x2'], cards: ['alkyne-hx-1'] }, 'guess-reagent').relaxed, ['substrates', 'families'], 'when no single setting frees a problem, they go together in order');
  const r3 = relax({ substrates: ['alcohols'], families: ['x2'], cards: ['alkyne-hx-1'] }, 'guess-reagent');
  ok(/Substrate class: Alcohols \(oxidation cards\) → all/.test(r3.message) && /Reagent family: X₂ \(anti\) → all/.test(r3.message) && r3.changes.length === 2, `the notice names each change: ${r3.message}`);
  eq(relax({ substrates: ['alkenes'], stereo: 'has', difficulty: 'hard' }, 'stereo-outcome').relaxed, ['difficulty'], 'the first relaxed setting is the least important (no hard alkene has stereo)');
  const meetable = relax({ substrates: ['alkenes'], stereo: 'has' }, 'stereo-outcome');
  eq([meetable.relaxed, meetable.skipped, meetable.message], [[], [], ''], 'settings that can be met report nothing');
  const mixRes = relax({ substrates: ['arenes'], modes: ['guess-reagent', 'stereo-outcome'] }, C.MIX_ID);
  eq([mixRes.relaxed, mixRes.skipped, mixRes.modes], [[], ['stereo-outcome'], ['guess-reagent']], 'a mixed-session mode with nothing to ask is left out, not relaxed');
  ok(/What stereochemistry forms\? has no problem for these settings, so the session leaves it out/.test(mixRes.message), `and the notice says so: ${mixRes.message}`);
  const allDead = relax({ substrates: ['alcohols'], stereo: 'has', difficulty: 'hard', families: ['hubonly'], cards: ['clemmensen'] }, 'two-step');
  ok(allDead.modes.includes('two-step') && allDead.relaxed.length >= 1, 'an impossible stack of settings still ends with a problem to ask');

  // ---- (6) presets round-trip
  store.resetAll();
  eq(C.listPresets().map((p) => p.name), ['Alkenes only', 'Aromatics only', 'Stereo outcomes', 'Everything mixed'], 'the four built-in presets');
  const ao = C.loadPreset('Aromatics only', { count: 20, timer: 60 }), ke = C.loadPreset('Alkenes only'), so = C.loadPreset('Stereo outcomes'), em = C.loadPreset('Everything mixed');
  eq([ao.substrates, ao.count, ao.timer, ao.preset], [['arenes'], 20, 60, 'Aromatics only'], 'Aromatics only: arenes, and the count and timer already chosen are kept');
  eq(ke.substrates, ['alkenes', 'cycloalkenes'], 'Alkenes only: alkenes and cycloalkenes');
  eq([so.stereo, so.modes], ['has', ['stereo-outcome']], 'Stereo outcomes: only where the product has stereo, in the stereo mode');
  eq([em.modes, C.isUnfiltered(em)], [MODES6, true], 'Everything mixed: all six modes, no filter');
  ok(C.reactionCounts(ao)['stereo-outcome'] === 0 && C.reactionCounts(ao)['guess-reagent'] > 500, 'Aromatics only: counts follow the preset');
  const mine = C.normalizeSettings({ substrates: ['alkynes', 'dienes'], families: ['hx', 'alkyne'], cards: ['alkyne-hx-1', 'diene-hx', 'alkene-hx'], stereo: 'none', difficulty: 'easy', modes: ['two-step', 'guess-reactant'], count: 5, timer: 90, weak: true });
  eq(C.savePreset('My mix', mine), { ok: true, name: 'My mix' }, 'a preset saves');
  eq(C.listPresets().map((p) => p.name).slice(4), ['My mix'], 'it is listed after the built-ins');
  eq(C.loadPreset('my mix'), { ...mine, preset: 'My mix' }, 'it loads back equal (every field), whatever the case of the name');
  ok(!C.loadPreset('My mix').builtin, 'saved presets are not built-in');
  eq(C.savePreset('Alkenes only', mine).ok, false, 'a built-in name cannot be taken');
  eq(C.savePreset('  ', mine).ok, false, 'a name is required');
  C.savePreset('My mix', C.normalizeSettings({ count: 20 }));
  eq([C.listPresets().length, C.loadPreset('My mix').count], [5, 20], 'saving under the same name replaces it');
  eq(C.deletePreset('Aromatics only'), false, 'a built-in cannot be deleted');
  eq(C.deletePreset('My mix'), true, 'a saved preset deletes');
  eq([C.listPresets().length, C.loadPreset('My mix')], [4, null], 'and is gone');
  const stored = JSON.parse(JSON.stringify(store.getUi('reactions-presets') || []));
  eq(stored, [], 'nothing left in ui.reactions-presets');
  const ch = C.changeSettings(C.loadPreset('Aromatics only'), { stereo: 'has' });
  eq([ch.preset, ch.stereo], [undefined, 'has'], 'changing a filter leaves the preset name');
  eq(C.changeSettings(C.loadPreset('Aromatics only'), { count: 5 }).preset, 'Aromatics only', 'changing the count keeps it');

  // ---- (7) the mixed session interleaves the modes
  const mixS = C.normalizeSettings({ modes: ['guess-reagent', 'guess-reactant', 'stereo-outcome', 'two-step'] });
  C.endReactionSession();
  const seq = C.generateReactions(C.MIX_ID, 12, { rng: mulberry32(5), settings: mixS }).map((p) => p.skill);
  eq(seq, Array.from({ length: 12 }, (_, i) => mixS.modes[i % 4]), 'a mixed session takes the chosen modes in turn');
  C.endReactionSession();
  const one = [];
  for (let i = 0; i < 8; i++) one.push(C.generateReactions(C.MIX_ID, 1, { rng: mulberry32(100 + i), settings: mixS })[0].skill);
  eq(one, Array.from({ length: 8 }, (_, i) => mixS.modes[i % 4]), 'one problem at a time (as the practice page asks) continues the same rotation');
  C.endReactionSession();
  const all6 = C.generateReactions(C.MIX_ID, 12, { rng: mulberry32(6), settings: C.loadPreset('Everything mixed') }).map((p) => p.skill);
  eq(all6, [...MODES6, ...MODES6], 'Everything mixed: all six modes in turn');
  eq(C.generateReactions(C.MIX_ID, 6, { rng: mulberry32(7), settings: C.normalizeSettings({}) }).map((p) => p.skill), MODES6, 'a mixed session with no mode chosen uses all six');
  C.endReactionSession();
  const skipS = C.normalizeSettings({ substrates: ['arenes'], modes: ['guess-reagent', 'stereo-outcome', 'two-step'] });
  eq(C.generateReactions(C.MIX_ID, 6, { rng: mulberry32(8), settings: skipS }).map((p) => p.skill), ['guess-reagent', 'two-step', 'guess-reagent', 'two-step', 'guess-reagent', 'two-step'], 'a mode with nothing to ask drops out of the rotation');
  C.endReactionSession();
  // the same cards never twice in a row inside a mode
  const run = C.generateReactions('guess-reagent', 40, { rng: mulberry32(9), settings: C.normalizeSettings({}) });
  ok(run.every((p, i) => i === 0 || p.card !== run[i - 1].card), 'a card is never asked twice in a row');
  ok(new Set(run.map((p) => p.card)).size >= 12, `40 problems visit ${new Set(run.map((p) => p.card)).size} different cards`);
  C.endReactionSession();

  // ---- (8) live counts equal the filtered pool sizes
  const indItems = {
    'predict-product': okPredict.map((c) => ({ cards: [c.cardId], sub: c.sub, st: c.st })),
    'guess-reagent': lists['guess-reagent'].map((c) => ({ cards: [c.cardId], sub: c.sub, st: c.st })),
    'guess-reactant': lists['guess-reactant'].map((c) => ({ cards: [c.cardId], sub: c.sub, st: c.st })),
    'stereo-outcome': lists['stereo-outcome'].map((c) => ({ cards: [c.cardId], sub: c.sub, st: c.st })),
    'two-step': okChains.map(({ ch, p }) => ({ cards: [ch.t.A, ch.t.B], sub: ch.start, st: A.productStereo(p.products) }))
  };
  for (const list of Object.values(indItems)) for (const it of list) { it.cls = rdClass(it.sub); it.diff = diffOf(it.sub); it.n = 1; }
  indItems['wont-work'] = M.WONT_CASES.map((c) => ({ cards: [c.card], cls: C.WONT_META[c.id].cls, diff: C.WONT_META[c.id].diff, st: false, n: choose3(c.works.length) * c.fails.length }));
  const passInd = (it, F) => F.substrates.includes(it.cls) && it.cards.some((c) => F.cards.includes(c) && F.families.includes(FAM[c])) && (F.stereo === 'any' || (F.stereo === 'has') === it.st) && (!F.difficulty || it.diff === F.difficulty);
  eq(C.reactionCounts(C.defaultSettings()), M.MODE_COUNTS['wont-work'] && { 'predict-product': okPredict.length, 'guess-reagent': M.MODE_COUNTS['guess-reagent'], 'guess-reactant': M.MODE_COUNTS['guess-reactant'], 'stereo-outcome': M.MODE_COUNTS['stereo-outcome'], 'two-step': M.MODE_COUNTS['two-step'], 'wont-work': M.MODE_COUNTS['wont-work'] }, 'unfiltered counts: the pools in full');
  const rc = mulberry32(31415);
  let nonzero = 0, zero = 0;
  for (let i = 0; i < 10; i++) {
    const S = C.normalizeSettings({
      substrates: rc() < 0.7 ? A.SUBSTRATE_IDS.filter(() => rc() < 0.5) : undefined, families: rc() < 0.6 ? A.FAMILY_IDS.filter(() => rc() < 0.5) : undefined,
      cards: rc() < 0.4 ? A.CARD_IDS.filter(() => rc() < 0.5) : undefined, stereo: A.STEREO_IDS[Math.floor(rc() * 3)], difficulty: A.DIFF_IDS[Math.floor(rc() * 4)]
    });
    const F = C.filterOf(S), got = C.reactionCounts(S);
    const want = Object.fromEntries(MODES6.map((m) => [m, indItems[m].filter((it) => passInd(it, F)).reduce((n, it) => n + it.n, 0)]));
    eq(got, want, `live counts #${i} equal the filtered pool sizes (${C.summaryOf(S)})`);
    eq(C.reactionCounts(S), got, `live counts #${i} are stable (cached)`);
    Object.values(want).forEach((n) => { if (n) nonzero++; else zero++; });
  }
  ok(nonzero >= 15 && zero >= 3, `the 10 count checks cover non-empty (${nonzero}) and empty (${zero}) modes`);
  for (const m of MODES6) {
    const F = C.filterOf(C.normalizeSettings({ substrates: ['arenes'] }));
    eq(C.countFor(m, F), indItems[m].filter((it) => passInd(it, F)).reduce((n, it) => n + it.n, 0), `${m}: the arenes count`);
  }

  // ---- (9) weak spots, the card, the lessons
  store.resetAll();
  for (let i = 0; i < 3; i++) store.logMistake({ skill: 'guess-reagent', stepId: 'mastery', lessonId: 'practice', diagnosis: 'x', card: 'alkene-x2' });
  store.logMistake({ skill: 'guess-reagent', stepId: 'mastery', lessonId: 'practice', diagnosis: 'x' });
  ok(store.cardScores()['alkene-x2'] > 2 && Object.keys(store.cardScores()).length === 1, 'the mistake log gives a score per card (a slip logged without a card counts for none)');
  ok(C.hasWeakData(), 'weak data is found');
  const share = (settings, n, seed) => { C.endReactionSession(); const ps = C.generateReactions('guess-reagent', n, { rng: mulberry32(seed), settings }); return ps.filter((p) => p.card === 'alkene-x2').length / n; };
  const plain = share(C.normalizeSettings({}), 200, 11), weighted = share(C.normalizeSettings({ weak: true }), 200, 11);
  ok(weighted > 0.15 && weighted > 3 * plain, `weighting toward weak spots: alkene-x2 is ${(weighted * 100).toFixed(0)}% of problems, against ${(plain * 100).toFixed(0)}% without it`);
  store.logWin('guess-reagent', 'alkene-x2'); store.logWin('guess-reagent', 'alkene-x2'); store.logWin('guess-reagent', 'alkene-x2'); store.logWin('guess-reagent', 'alkene-x2');
  ok(!store.cardScores()['alkene-x2'] || store.cardScores()['alkene-x2'] < 1.5, 'practising a card right lowers its weak-spot score');
  store.resetAll();
  eq(store.cardScores(), {}, 'no slips, no scores');
  eq(C.hasWeakData(), false, 'no weak data after a reset');
  // the filters hold on the real route (generate with a skill) and not in the lessons (no skill)
  C.setCurrentSettings({ substrates: ['arenes'], modes: ['guess-reagent', 'predict-product'] });
  C.beginReactionSession();
  const viaSkill = generate('predict-product', 12, { skill: 'predict-product', rng: mulberry32(3) });
  ok(viaSkill.every((p) => A.substrateClass(p.substrate) === 'arenes'), 'generate(predict-product, skill) obeys the stored settings');
  const viaMix = generate(C.MIX_ID, 6, { skill: C.MIX_ID, rng: mulberry32(4) });
  eq(viaMix.map((p) => p.skill), ['predict-product', 'guess-reagent', 'predict-product', 'guess-reagent', 'predict-product', 'guess-reagent'], 'generate(reaction-mix) is the rotation of the chosen modes');
  const lesson = generate('predict-product', 80, { rng: mulberry32(5) });
  ok(lesson.some((p) => A.substrateClass(p.substrate) !== 'arenes'), 'a lesson (no skill) is not filtered by the settings');
  const lessonModes = generate('guess-reagent', 80, { rng: mulberry32(5) });
  ok(lessonModes.some((p) => A.substrateClass(p.substrate) !== 'arenes'), 'the plain mode generator is not filtered either');
  // the settings are read once when a session starts: a change waits for Start
  C.setCurrentSettings({ substrates: ['alkynes'] });
  ok(generate('guess-reagent', 6, { skill: 'guess-reagent', rng: mulberry32(6) }).every((p) => A.substrateClass(p.substrate) === 'arenes'), 'a change in the card does not alter the session in progress');
  C.beginReactionSession();
  ok(generate('guess-reagent', 6, { skill: 'guess-reagent', rng: mulberry32(6) }).every((p) => A.substrateClass(p.substrate) === 'alkynes'), 'Start picks the new settings up');
  // a hub card limits "which reagent?" and the settings step aside
  M.setModeCard('eas-nitration');
  ok(generate('guess-reagent', 5, { skill: 'guess-reagent', rng: mulberry32(7) }).every((p) => p.card === 'eas-nitration'), 'the hub card limit wins over the settings');
  M.setModeCard(null);
  C.endReactionSession();
  store.resetAll();

  // ---- the card markup
  const S0 = C.defaultSettings();
  const html = C.settingsCardHtml(S0, { open: true, where: 'practice' });
  const chips = (g) => (html.match(new RegExp(`data-g="${g}"`, 'g')) || []).length;
  eq([chips('substrates'), chips('families'), chips('cards'), chips('stereo'), chips('difficulty'), chips('modes'), chips('count'), chips('timer'), chips('weak')], [6, 9, 38, 3, 4, 6, 4, 3, 1], 'the card has a chip for every choice (38 cards)');
  eq([(html.match(/data-gall=/g) || []).length, (html.match(/data-gnone=/g) || []).length], [4, 4], 'each card group has All and None');
  ok(['Alkenes only', 'Aromatics only', 'Stereo outcomes', 'Everything mixed'].every((n) => html.includes(`data-preset="${n}"`)), 'the four built-in presets are chips');
  ok(html.includes('aria-expanded="true"') && !/id="rs-body" hidden/.test(html) && /id="rs-cards" hidden/.test(html), 'open card, cards list closed until asked');
  ok(/id="rs-body" hidden/.test(C.settingsCardHtml(S0, { open: false })) && /aria-expanded="false"/.test(C.settingsCardHtml(S0, { open: false })), 'a closed card hides its body');
  ok(/class="btn primary nl-start">Start</.test(html) && /rs-startmix"\s+disabled/.test(html), 'practice page: Start, and the mixed session needs a mode');
  const withModes = C.settingsCardHtml(C.normalizeSettings({ modes: ['wont-work', 'two-step'] }), { open: true, where: 'practice' });
  ok(/rs-startmix">Start mixed session \(2 modes\)/.test(withModes), 'the mixed-session button counts the chosen modes');
  ok(!/nl-start/.test(C.settingsCardHtml(S0, { open: true, where: 'landing' })) && /btn primary rs-startmix/.test(C.settingsCardHtml(S0, { open: true, where: 'landing' })), 'landing page: the mixed-session button only');
  ok(!/rs-startmix/.test(C.settingsCardHtml(S0, { open: true, where: 'mix' })) && /nl-start/.test(C.settingsCardHtml(S0, { open: true, where: 'mix' })), 'mixed session page: Start only');
  const sel = C.normalizeSettings({ substrates: ['arenes'], stereo: 'has', difficulty: 'hard', count: 0, timer: 60, weak: true, cards: ['eas-nitration', 'alkene-hx'] });
  const html2 = C.settingsCardHtml(sel, { open: true, where: 'practice', report: C.resolveReactions(sel, 'guess-reagent'), dirty: true, error: 'Oops <b>', hasWeakData: false });
  const pressed = (g, v) => new RegExp(`data-g="${g}" data-v="${v}" aria-pressed="true"`).test(html2);
  ok(pressed('substrates', 'arenes') && !pressed('substrates', 'alkenes') && pressed('stereo', 'has') && pressed('difficulty', 'hard') && pressed('count', '0') && pressed('timer', '60') && pressed('weak', '1') && pressed('cards', 'eas-nitration') && !pressed('cards', 'eas-bromination'), 'chips show what is chosen (aria-pressed)');
  ok(/Individual cards <span class="nl-hint">2 of 38/.test(html2) && /Changed: press Start/.test(html2) && /class="nl-err"[^>]*>Oops &lt;b&gt;/.test(html2) && /No slips logged against a card yet/.test(html2), 'the cards count, the dirty note, the escaped error and the weak-spot note');
  ok(/class="nl-note rs-note"/.test(html2) && /These settings cannot all be met/.test(html2), 'a relaxation notice is shown above the settings');
  ok(/Aromatics only|Custom/.test(C.summaryOf(sel)) && /endless/.test(C.summaryOf(sel)) && /60 s each/.test(C.summaryOf(sel)) && /weak spots/.test(C.summaryOf(sel)), 'the collapsed card summarises the settings');
  const named = C.settingsCardHtml(C.loadPreset('Aromatics only'), { open: true });
  ok(/data-preset="Aromatics only" aria-pressed="true"/.test(named), 'the loaded preset is shown as chosen');
  const saved = C.settingsCardHtml(S0, { open: true, presets: [...C.listPresets(), { name: 'Mine <x>', builtin: false }] });
  ok(/data-del="Mine &lt;x&gt;"/.test(saved) && /aria-label="Delete preset Mine &lt;x&gt;"/.test(saved), 'saved presets carry a delete button and are escaped');
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
