// Mock midterm checks (data/mock-blueprint.js, engine/mock.js, engine/generators-huckel.js, mock-view.js, route #mock, the home panel, the CSS block).
//  (1) blueprint: counts, marks and sections sum to the planned paper (29 questions, 78 marks, 90 min); sections match the past-paper sections; presets; the
//      editable blueprint is clamped; every generator a feed names is in the registry and produces answerable questions whose skills the feed lists;
//  (2) 20 seeded papers: question count and per-section counts (and per-feed counts) match the plan, numbering 1a, 1b ..., unique questions, one right option,
//      the same seed rebuilds the same paper; the presets build too;
//  (3) weighting toward weak spots: total unchanged, every section within +-50% of its count, empty sections stay empty, no weak spots changes nothing,
//      a weak section gains, a weighted plan builds a paper with the weighted counts;
//  (4) marking: all-correct = full marks, all-wrong = 0, blank = 0, per-section marks add up;
//  (5) the sitting: answers saved and restored, the paper rebuilt from the saved plan and seed is the same, submit logs every miss to the weak-spot log with its skill,
//      the history appends, abandon clears;
//  (6) the Hückel generator against an independent hand table; the adapters (projection pair, relationship pair, R/S, centre count);
//  (7) wiring read from the source: router, home panel, past-paper link, CSS block, skill label.
// Run on its own with `node learn/tests/mock.mjs`, or as part of run.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ready } from '../engine/chem.js';
import { generate, GENERATORS, generatorForSkill } from '../engine/generators.js';
import { SECTIONS, SECTION_BY_ID, PRESETS, LIMITS, DEFAULT_MINUTES } from '../data/mock-blueprint.js';
import { PASTPAPER } from '../data/pastpaper.js';
import * as M from '../engine/mock.js';
import * as store from '../engine/store.js';
import { skillLabel, skillRule, SKILLS } from '../engine/skills.js';
import { HUCKEL_POOL, huckelInfo } from '../engine/generators-huckel.js';
import { tetraInfo, chiralCenters } from '../engine/cip.js';
import { DRILL } from '../engine/generators-predict.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (...p) => fs.readFileSync(path.join(HERE, '..', ...p), 'utf8');
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const paperJson = (p) => JSON.stringify(p.questions.map((q) => [q.id, q.no, q.marks, q.skill, q.v]));

// independent hand table for the Hückel pool: ring atoms, pi electrons, class (written out from the textbook rule, not from the generator)
const HAND = {
  benzene: [6, 6, 'aromatic'], cyclobutadiene: [4, 4, 'anti'], 'cyclopropenyl-cation': [3, 2, 'aromatic'], 'cyclopropenyl-anion': [3, 4, 'anti'],
  'cyclopentadienyl-anion': [5, 6, 'aromatic'], 'cyclopentadienyl-cation': [5, 4, 'anti'], tropylium: [7, 6, 'aromatic'], 'cycloheptatrienyl-anion': [7, 8, 'anti'],
  'cot-dianion': [8, 10, 'aromatic'], pyrrole: [5, 6, 'aromatic'], furan: [5, 6, 'aromatic'], thiophene: [5, 6, 'aromatic'], pyridine: [6, 6, 'aromatic'],
  'cyclohexa-1,3-diene': [6, 4, 'non'], cyclopentadiene: [5, 4, 'non'], cycloheptatriene: [7, 6, 'non'], cot: [8, 8, 'non']
};

export async function mock({ ok, eq }) {
  await ready();
  const mkRng = M.mulberry32;

  // ================================================================ (1) blueprint
  const def = M.defaultBp();
  const tot = M.bpTotals(def);
  eq([tot.questions, tot.marks, tot.minutes], [29, 78, 90], 'default blueprint: 29 questions, 78 marks, 90 minutes');
  eq(SECTIONS.map((s) => s.id), ['A1', 'A2', 'A3', 'A5', 'B1', 'B2', 'B3', 'B4', 'B6'], 'blueprint sections in the midterm order');
  eq(SECTIONS.map((s) => s.id), PASTPAPER.map((s) => s.id), 'blueprint sections are the past-paper sections');
  eq(SECTIONS.map((s) => [s.id, s.count, s.marks]), [['A1', 4, 2], ['A2', 5, 2], ['A3', 3, 3], ['A5', 1, 4], ['B1', 1, 2], ['B2', 2, 2], ['B3', 8, 3], ['B4', 3, 3], ['B6', 2, 4]], 'default counts and marks per section');
  eq(DEFAULT_MINUTES, 90, 'default time limit');
  ok(!SECTIONS.some((s) => ['A4', 'B5'].includes(s.id)), 'no A4 or B5 section');
  for (const s of SECTIONS) {
    ok(s.instruction && s.instruction.length > 20, `${s.id}: instruction`);
    ok(s.feeds.length >= 1 && s.feeds.every((f) => f.w > 0 && f.skills.length >= 1), `${s.id}: feeds with weights and skills`);
    ok(sameJson(s.skills.slice().sort(), [...new Set(s.feeds.flatMap((f) => f.skills))].sort()), `${s.id}: skills are the union of the feeds' skills`);
    for (const f of s.feeds) {
      ok(GENERATORS[f.gen] === true, `${s.id}: generator ${f.gen} is in the registry`);
      for (const k of f.skills) ok(SKILLS[k] && skillLabel(k) !== k && skillRule(k).length > 40, `${s.id}: skill ${k} has a label and a rule`);
    }
  }
  ok(/^B3$/.test(SECTION_BY_ID.B3.id) && SECTION_BY_ID.B3.instruction === 'Write the structure of the major product. Indicate stereochemistry where necessary.', 'B3 uses the workbook wording');
  eq(SECTION_BY_ID.A1.feeds[0].settings.qtypes, ['type'], 'A1 asks you to type the name');
  eq(SECTION_BY_ID.B1.feeds[0].settings.qtypes, ['fix'], 'B1 is the fix-a-wrong-name type');
  ok(SECTION_BY_ID.A1.feeds[0].settings.classes.includes('mixed') && SECTION_BY_ID.A1.feeds[0].settings.stereo === 'any', 'A1 settings: mixed classes, stereo any');
  eq(SECTION_BY_ID.B2.feeds[0].gen, 'huckel', 'B2 is fed by the Hückel generator');
  eq(SECTION_BY_ID.B3.feeds.map((f) => f.gen), ['predict-product', 'guess-reagent'], 'B3 = predict-product + guess-reagent');
  eq(SECTION_BY_ID.B6.feeds.map((f) => f.gen), ['stereo-outcome', 'two-step'], 'B6 = stereo-outcome + two-step');

  // presets
  eq(PRESETS.map((p) => p.id), ['full', 'half', 'reactions', 'stereo-naming'], 'four presets');
  eq(PRESETS.map((p) => p.label), ['Full paper (90 min)', 'Half paper (45 min)', 'Reactions only', 'Stereo and naming only'], 'preset labels');
  for (const P of PRESETS) {
    const bp = M.presetBp(P.id);
    ok(Object.keys(P.counts).every((id) => SECTION_BY_ID[id]), `${P.id}: only known sections`);
    ok(bp.sections.every((s) => s.count >= LIMITS.count[0] && s.count <= LIMITS.count[1] && s.marks === SECTION_BY_ID[s.id].marks), `${P.id}: counts in limits, default marks`);
    eq(M.matchPreset(bp), P.id, `${P.id}: recognised as itself`);
    ok(M.bpTotals(bp).questions >= 1 && bp.minutes === P.minutes, `${P.id}: has questions and its time`);
  }
  eq(M.bpTotals(M.presetBp('full')), tot, 'the full preset is the default blueprint');
  eq(M.bpTotals(M.presetBp('half')).questions, 17, 'half paper: 17 questions');
  eq(M.presetBp('half').minutes, 45, 'half paper: 45 minutes');
  eq(M.presetBp('reactions').sections.filter((s) => s.count).map((s) => s.id), ['A5', 'B3', 'B6'], 'reactions only: A5, B3, B6');
  eq(M.presetBp('stereo-naming').sections.filter((s) => s.count).map((s) => s.id), ['A1', 'A2', 'A3', 'B1'], 'stereo and naming only: A1, A2, A3, B1');
  const edited = M.normalizeBp({ minutes: 999, weighted: 'yes', sections: [{ id: 'A1', count: 99, marks: 0 }, { id: 'ZZ', count: 5 }, { id: 'B3', count: -3, marks: 'x' }] });
  eq([edited.minutes, edited.weighted, edited.sections.find((s) => s.id === 'A1').count, edited.sections.find((s) => s.id === 'A1').marks, edited.sections.find((s) => s.id === 'B3').count, edited.sections.find((s) => s.id === 'B3').marks, edited.sections.length], [180, false, 15, 1, 0, 3, 9], 'normalizeBp clamps counts, marks and time, drops unknown sections');
  ok(M.matchPreset(M.normalizeBp({ ...def, minutes: 95 })) === null, 'an edited blueprint matches no preset');

  // every generator a feed uses produces answerable questions with listed skills
  for (const s of SECTIONS) for (const f of s.feeds) {
    let qs = null;
    try { qs = M.drawFeed(f, 3, mkRng(41)); } catch (e) { qs = null; }
    ok(qs && qs.length === 3, `${s.id}/${f.gen}: produces 3 answerable questions`);
    for (const v of qs || []) {
      ok(f.skills.includes(v.skill), `${s.id}/${f.gen}: skill ${v.skill} is listed`);
      ok(v.mode === 'choice' ? v.options.filter((o) => o.correct).length === 1 && v.options.length >= 2 : v.input && v.input.answer !== undefined, `${s.id}/${f.gen}: one right option or an answer`);
      ok(v.prompt || v.promptHtml, `${s.id}/${f.gen}: has a prompt`);
    }
  }
  const hb = M.hbrCombosList();
  ok(hb.length >= 3 && hb.every((c) => DRILL['alkene-hx'].subs.includes(c.sub) && c.v.id === 'HBr'), 'A5 draws HBr on alkenes from the alkene-hx card');
  ok(hb.every((c) => c.sub.includes('=')), 'A5 substrates are alkenes');
  for (let i = 0; i < 12; i++) {
    const [q] = M.drawFeed(SECTION_BY_ID.A5.feeds[0], 1, mkRng(900 + i));
    ok(q.card === 'alkene-hx' && /HBr/.test(q.equation.cond) && chiralCenters(q.options.find((o) => o.correct).smiles.split('.')[0]).length >= 1, `A5 question ${i}: HBr on an alkene, and the product has a stereocentre`);
  }
  for (let i = 0; i < 6; i++) {
    const [q] = M.drawFeed(SECTION_BY_ID.B1.feeds[0], 1, mkRng(700 + i));
    ok(/is not the correct name/.test(q.prompt) && q.mode === 'input', `B1 question ${i}: fix a wrong name, typed`);
    const [a] = M.drawFeed(SECTION_BY_ID.A1.feeds[0], 1, mkRng(600 + i));
    ok(a.mode === 'input' && a.input.name === true, `A1 question ${i}: typed IUPAC name`);
  }

  // ================================================================ (2) twenty seeded papers
  const plan = M.planPaper(def);
  eq(plan.sections.map((s) => [s.id, s.count]), SECTIONS.map((s) => [s.id, s.count]), 'unweighted plan = blueprint counts');
  for (const ps of plan.sections) eq(ps.feedCounts.reduce((a, b) => a + b, 0), ps.count, `${ps.id}: feed counts add up`);
  eq(plan.sections.find((s) => s.id === 'B3').feedCounts, [5, 3], 'B3: five predict-product, three guess-reagent');
  eq(plan.sections.find((s) => s.id === 'A2').feedCounts, [2, 2, 1], 'A2: two R/S, two relationships, one projections');
  const papers = [];
  for (let seed = 1; seed <= 20; seed++) {
    const P = M.buildPaper(plan, seed * 7919);
    papers.push(P);
    eq(P.questions.length, 29, `seed ${seed}: 29 questions`);
    for (const ps of plan.sections) eq(P.questions.filter((q) => q.sec === ps.id).length, ps.count, `seed ${seed}: ${ps.id} has ${ps.count} questions`);
    eq(P.questions.reduce((a, q) => a + q.marks, 0), 78, `seed ${seed}: 78 marks`);
    eq(new Set(P.questions.map((q) => q.id)).size, 29, `seed ${seed}: question ids are unique`);
    eq(P.questions.map((q) => q.no).slice(0, 6), ['1a', '1b', '1c', '1d', '2a', '2b'], `seed ${seed}: numbered 1a, 1b, ... per section`);
    eq(P.questions.filter((q) => q.sec === 'B3').map((q) => q.no), ['7a', '7b', '7c', '7d', '7e', '7f', '7g', '7h'], `seed ${seed}: B3 is question 7, parts a to h`);
    for (const q of P.questions) ok(SECTION_BY_ID[q.sec].skills.includes(q.skill), `seed ${seed} ${q.id}: skill ${q.skill} belongs to ${q.sec}`);
    const keys = P.questions.map((q) => `${q.skill}|${q.v.smiles || ''}|${q.v.prompt}|${JSON.stringify(q.v.equation || '')}|${JSON.stringify(q.v.extra || '')}|${(q.v.options || []).map((o) => o.smiles || o.text).join('~')}`);
    eq(new Set(keys).size, 29, `seed ${seed}: no question appears twice`);
    for (const q of P.questions) {
      ok(q.v.mode === 'choice' ? q.v.options.filter((o) => o.correct).length === 1 : q.v.mode === 'input', `seed ${seed} ${q.id}: one right answer`);
      if (q.v.mode === 'choice') ok(q.v.options.every((o) => o.correct || o.why || o.lead), `seed ${seed} ${q.id}: every wrong option says what it missed`);
    }
    // each section's block of questions is contiguous and in the paper's order
    eq(P.sections.map((s) => [s.id, s.count]), plan.sections.map((s) => [s.id, s.count]), `seed ${seed}: section list`);
  }
  for (const seed of [1, 2, 3]) ok(paperJson(M.buildPaper(plan, seed * 7919)) === paperJson(papers[seed - 1]), `seed ${seed}: the same seed rebuilds the same paper`);
  ok(paperJson(papers[0]) !== paperJson(papers[1]), 'different seeds give different papers');
  // the kinds of question a paper holds: names typed, options picked
  const kinds = new Set(papers.flatMap((p) => p.questions.map((q) => q.v.mode)));
  ok(kinds.has('choice') && kinds.has('input'), 'papers hold both picked and typed answers');
  // presets and edited blueprints build too
  for (const P of PRESETS) {
    for (const seed of [11, 12]) {
      const pl = M.planPaper(M.presetBp(P.id));
      const paper = M.buildPaper(pl, seed);
      eq(paper.questions.length, M.bpTotals(M.presetBp(P.id)).questions, `${P.id} seed ${seed}: question count`);
      for (const ps of pl.sections) eq(paper.questions.filter((q) => q.sec === ps.id).length, ps.count, `${P.id} seed ${seed}: ${ps.id} count`);
    }
  }

  // ================================================================ (3) weighting
  const allSkills = [...new Set(SECTIONS.flatMap((s) => s.skills))];
  const r = mkRng(2024);
  let moved = 0, trials = 0;
  for (let t = 0; t < 120; t++) {
    const bp = M.normalizeBp({ minutes: 60, sections: SECTIONS.map((s) => ({ id: s.id, count: t % 3 === 0 ? s.count : Math.floor(r() * 13), marks: s.marks })) });
    const scores = {};
    allSkills.forEach((k) => { if (r() < 0.35) scores[k] = 0.4 + r() * 4; });
    const c = M.weightedCounts(bp, scores);
    const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    eq(total(c), bp.sections.reduce((a, s) => a + s.count, 0), `weighting trial ${t}: total unchanged`);
    let within = true, empty = true;
    for (const s of bp.sections) {
      const lo = Math.ceil(s.count * 0.5), hi = Math.floor(s.count * 1.5);
      if (c[s.id] < lo || c[s.id] > hi) within = false;
      if (s.count === 0 && c[s.id] !== 0) empty = false;
      ok(c[s.id] >= Math.min(s.count, 1) || s.count === 0, `weighting trial ${t}: ${s.id} never drops to nothing`);
    }
    ok(within, `weighting trial ${t}: every section within +-50% of its count`);
    ok(empty, `weighting trial ${t}: empty sections stay empty`);
    trials++; if (bp.sections.some((s) => c[s.id] !== s.count)) moved++;
    // a section's weakness only ever pulls questions toward weaker sections: no section with zero weakness gains while one with weakness could
    for (const s of bp.sections) if (M.sectionWeakness(s.id, scores) === 0) ok(c[s.id] <= s.count, `weighting trial ${t}: ${s.id} has no weak spots and gains nothing`);
  }
  ok(moved > 40, `weighting moves questions in most trials (${moved} of ${trials})`);
  eq(M.weightedCounts(def, {}), Object.fromEntries(SECTIONS.map((s) => [s.id, s.count])), 'no weak spots: counts unchanged');
  const b3 = M.weightedCounts(def, { 'guess-reagent': 3 });
  eq([b3.B3, b3.A1 + b3.A2 + b3.A3 + b3.A5 + b3.B1 + b3.B2 + b3.B4 + b3.B6], [12, 17], 'a weak B3 skill pulls B3 up to its +50% ceiling (12), the others give 4 up');
  eq(Object.keys(b3).length, 9, 'weighted counts name every section');
  const wp = M.weightedCounts(def, { chirality: 2, rs: 2, 'stereo-relationships': 1 });
  ok(wp.A2 > 5 && wp.A2 <= 7, `weak stereo skills raise A2 (${wp.A2}) but never past 150%`);
  ok(M.weightingPreview(def, { 'guess-reagent': 3 }).some((x) => x.id === 'B3' && x.from === 8 && x.to === 12), 'the preview names the sections that move');
  // a weighted plan builds a paper with the weighted counts, and says so
  const wbp = { ...def, weighted: true };
  const wplan = M.planPaper(wbp, { 'guess-reagent': 3, naming: 0 });
  eq(wplan.sections.find((s) => s.id === 'B3').count, 12, 'weighted plan: B3 has 12');
  eq(wplan.weighted, true, 'weighted plan is flagged');
  eq(M.planTotals(wplan).questions, 29, 'weighted plan: total unchanged');
  eq(wplan.sections.find((s) => s.id === 'B3').base, 8, 'weighted plan remembers the blueprint count');
  eq(wplan.sections.find((s) => s.id === 'B3').feedCounts.reduce((a, b) => a + b, 0), 12, 'weighted plan: B3 feed counts add up');
  ok(wplan.sections.find((s) => s.id === 'B3').feedCounts[1] > 3, 'weighted plan: the weak feed (guess-reagent) gets more than its usual 3');
  ok(!M.planPaper(wbp, null).weighted && M.planTotals(M.planPaper(wbp, null)).questions === 29, 'weighted blueprint with no scores plans the plain paper');
  for (const seed of [5, 6]) {
    const P = M.buildPaper(wplan, seed);
    eq(P.questions.length, 29, `weighted seed ${seed}: 29 questions`);
    eq(P.questions.filter((q) => q.sec === 'B3').length, 12, `weighted seed ${seed}: 12 B3 questions`);
    for (const ps of wplan.sections) eq(P.questions.filter((q) => q.sec === ps.id).length, ps.count, `weighted seed ${seed}: ${ps.id}`);
    eq(M.bpFromPlan(wplan).sections.find((s) => s.id === 'B3').count, 8, 'bpFromPlan restores the blueprint count');
  }
  // feed splitting
  eq(M.splitFeeds([1, 1], 5), [3, 2], 'splitFeeds: equal weights, 5 -> 3 + 2');
  eq(M.splitFeeds([5, 3], 8), [5, 3], 'splitFeeds: 5:3 of 8');
  eq(M.splitFeeds([2, 2, 1], 5), [2, 2, 1], 'splitFeeds: 2:2:1 of 5');
  eq(M.splitFeeds([2, 1], 3), [2, 1], 'splitFeeds: 2:1 of 3');
  eq(M.splitFeeds([1], 7), [7], 'splitFeeds: one feed');

  // ================================================================ (4) marking
  for (let i = 0; i < papers.length; i++) {
    const P = papers[i];
    const right = {}, wrong = {};
    for (const q of P.questions) { right[q.id] = M.correctValue(q); wrong[q.id] = M.wrongValue(q); }
    const full = M.markPaper(P, right), none = M.markPaper(P, wrong), blank = M.markPaper(P, {});
    eq([full.got, full.max, full.correct], [78, 78, 29], `paper ${i + 1}: all correct = 78 of 78`);
    eq([none.got, none.correct], [0, 0], `paper ${i + 1}: all wrong = 0`);
    eq([blank.got, blank.answered], [0, 0], `paper ${i + 1}: blank = 0`);
    ok(full.sections.every((s) => s.got === s.max) && none.sections.every((s) => s.got === 0), `paper ${i + 1}: per-section marks`);
    ok(none.items.every((x) => x.answered && x.diagnosis.length > 3), `paper ${i + 1}: every wrong answer says what was missed`);
    ok(blank.items.every((x) => !x.answered && x.diagnosis === ''), `paper ${i + 1}: blank answers are unanswered`);
    const mixed = {}; P.questions.forEach((q, k) => { mixed[q.id] = k % 2 ? right[q.id] : wrong[q.id]; });
    const mm = M.markPaper(P, mixed);
    eq(mm.got, P.questions.filter((q, k) => k % 2).reduce((a, q) => a + q.marks, 0), `paper ${i + 1}: a half-right paper scores the right ones' marks`);
    eq(mm.sections.reduce((a, s) => a + s.got, 0), mm.got, `paper ${i + 1}: section marks add up to the total`);
  }
  {   // typed answers: the right text is accepted whatever its spacing or case, and a blank or space-only box is unanswered
    const P = papers[0];
    const q = P.questions.find((x) => x.v.mode === 'input' && x.v.input.name);
    ok(M.gradeAnswer(q, '   ').answered === false && M.gradeAnswer(q, '').answered === false && M.gradeAnswer(q, undefined).answered === false, 'a blank typed answer is unanswered');
    ok(M.gradeAnswer(q, String(q.v.input.answer).toUpperCase()).ok, 'a typed name is accepted in capitals');
    ok(M.gradeAnswer(q, '99').ok === false, 'a wrong typed answer is wrong');
    const c = P.questions.find((x) => x.v.mode === 'choice');
    ok(M.gradeAnswer(c, 99).answered === false && M.gradeAnswer(c, null).answered === false, 'an option index that does not exist is unanswered');
  }
  // links from a question: lesson step, practice mode, hub card where there is one
  {
    const P = papers[0];
    for (const q of P.questions) {
      const L = M.linksFor(q);
      ok(L.practise.href === '#practise-' + q.skill && /^#practise-[a-z0-9-]+$/.test(L.practise.href), `${q.id}: practice link`);
      ok(generatorForSkill(q.skill) && GENERATORS[generatorForSkill(q.skill)] === true, `${q.id}: its practice mode is a real generator (${generatorForSkill(q.skill)})`);
      ok(!L.lesson || /^#lesson-\d\d\/s\d+$/.test(L.lesson.href), `${q.id}: lesson link looks right`);
      if (q.v.card) ok(L.card && L.card.href === '#reactions/' + q.v.card, `${q.id}: hub card link`);
      ok(L.rule.length > 40, `${q.id}: carries the skill's rule`);
    }
    ok(P.questions.some((q) => M.linksFor(q).lesson), 'at least one question links to a lesson step');
  }

  // ================================================================ (5) the sitting: save, restore, submit, history
  store.resetAll();
  eq(M.currentSitting(), null, 'no sitting at first');
  const t0 = 1_800_000_000_000;
  const bpH = M.presetBp('half');
  const sess = M.startSitting(bpH, { seed: 4242, now: t0 });
  const P0 = M.buildPaper(sess.plan, sess.seed);
  eq([sess.minutes, sess.status, Object.keys(sess.answers).length], [45, 'open', 0], 'a sitting opens with the preset time and no answers');
  eq(M.remainingMs(sess, t0 + 5 * 60000), 40 * 60000, 'the clock counts down from the start');
  ok(M.remainingMs(sess, t0 + 46 * 60000) < 0, 'the clock runs out after the time limit');
  const q1 = P0.questions[0], q2 = P0.questions.find((q) => q.v.mode === 'choice'), q3 = P0.questions[P0.questions.length - 1];
  M.saveAnswer(sess, q1.id, 'some typed name');
  M.saveAnswer(sess, q2.id, 1);
  M.saveAnswer(sess, q3.id, M.correctValue(q3));
  M.saveAnswer(sess, q3.id, '');   // clearing a box un-answers it
  const back = M.currentSitting();
  eq(back.answers, { [q1.id]: 'some typed name', [q2.id]: 1 }, 'answers are saved and restored (a cleared box is dropped)');
  eq([back.seed, back.startedAt, back.minutes], [4242, t0, 45], 'seed, start time and limit are restored');
  ok(paperJson(M.buildPaper(back.plan, back.seed)) === paperJson(P0), 'the paper rebuilt from the saved plan and seed is the same paper');
  eq(M.markPaper(P0, back.answers).answered, 2, 'two answers survive the reload');
  // a stored blueprint is kept
  eq(store.getMock().bp.minutes, 45, 'the blueprint is stored with the sitting');
  // submit: wrong answers go to the weak-spot log under the question's skill, right ones are wins
  const sub = (() => {
    const s2 = M.currentSitting();
    P0.questions.slice(0, 6).forEach((q) => M.saveAnswer(s2, q.id, M.correctValue(q)));
    P0.questions.slice(6, 12).forEach((q) => M.saveAnswer(s2, q.id, M.wrongValue(q)));
    return M.submitSitting(M.currentSitting(), P0, { now: t0 + 30 * 60000 });
  })();
  eq(sub.correct, 6, 'six right answers marked');
  const log = store.getLog().filter((e) => e.lessonId === 'mock');
  eq(log.length, P0.questions.length - 6, 'every wrong or blank question is logged as a mistake');
  ok(log.every((e) => e.stepId === 'mock' && e.skill && e.diagnosis.length > 0), 'logged mistakes carry the skill and a diagnosis');
  const wrongSkills = new Set(P0.questions.slice(6).map((q) => q.skill));
  ok([...wrongSkills].every((k) => log.some((e) => e.skill === k)), 'every missed skill is in the weak-spot log');
  eq(M.currentSitting(), null, 'submitting closes the sitting');
  const hist = M.history();
  eq(hist.length, 1, 'the history has one attempt');
  eq([hist[0].got, hist[0].max, hist[0].n, hist[0].correct, hist[0].minutes, hist[0].used, hist[0].timedOut, hist[0].weighted], [sub.got, sub.max, 17, 6, 45, 1800, false, false], 'history entry: score, size, time used');
  eq(hist[0].sections.map((s) => s.id), P0.sections.map((s) => s.id), 'history entry lists every section');
  eq(hist[0].sections.reduce((a, s) => a + s.got, 0), sub.got, 'history sections add up to the score');
  const last = M.lastResult();
  ok(last && last.seed === 4242 && paperJson(M.buildPaper(last.plan, last.seed)) === paperJson(P0), 'the last paper is kept and rebuilds');
  eq(M.markPaper(M.buildPaper(last.plan, last.seed), last.answers).got, sub.got, 'the marked script re-marks to the same score');
  // the scores the log gives the weighting
  const sc = store.skillScores();
  const rightSkills = new Set(P0.questions.slice(0, 6).map((q) => q.skill));
  const pureWrong = [...wrongSkills].filter((k) => !rightSkills.has(k));
  ok(pureWrong.length > 0 && pureWrong.every((k) => sc[k] > 0.3), 'skills that were missed and not also answered right have a weak-spot score');
  const wr = M.planPaper({ ...M.presetBp('full'), weighted: true }, sc);
  eq(M.planTotals(wr).questions, 29, 'a retake weighted by the real log keeps 29 questions');
  ok(wr.sections.some((s) => s.count !== s.base), 'the real log moves some counts');
  for (const s of wr.sections) ok(s.count >= Math.ceil(s.base / 2) && s.count <= Math.floor(s.base * 1.5), `retake: ${s.id} within +-50%`);
  // a second attempt appends; the history keeps the order
  const s3 = M.startSitting(M.presetBp('reactions'), { seed: 99, now: t0 + 3600000 });
  const P3 = M.buildPaper(s3.plan, s3.seed);
  M.submitSitting(s3, P3, { now: t0 + 3600000 + 46 * 60000, timedOut: true });
  const h2 = M.history();
  eq([h2.length, h2[1].timedOut, h2[1].used, h2[1].n], [2, true, 45 * 60, 14], 'the history appends: a timed-out attempt is flagged and capped at the limit');
  ok(h2[0].t < h2[1].t, 'history is in order');
  eq(store.getMock().last.seed, 99, 'last is the latest paper');
  // abandon
  M.startSitting(M.presetBp('half'), { seed: 5, now: t0 });
  M.abandonSitting();
  eq([M.currentSitting(), M.history().length], [null, 2], 'abandon closes the sitting and adds no attempt');
  // the history is capped
  for (let i = 0; i < 25; i++) store.setMock({ history: store.getMock().history.concat([{ t: i, got: 0, max: 1, n: 1, correct: 0, minutes: 10, used: 1, weighted: false, timedOut: false, sections: [] }]) });
  eq(store.getMock().history.length, 20, 'the history keeps the latest 20');
  store.resetAll();
  eq(store.getMock(), { bp: null, current: null, last: null, history: [] }, 'reset clears the mock state');

  // ================================================================ (6) the Hückel generator and the adapters
  for (const e of HUCKEL_POOL) {
    const I = huckelInfo(e.smiles, e.planar !== false), H = HAND[e.id];
    ok(H !== undefined, `Hückel pool ${e.id} is in the hand table`);
    eq([I.n, I.pi, I.cls], H, `Hückel ${e.id}: ring size, pi electrons and class match the hand table`);
  }
  eq(HUCKEL_POOL.length, Object.keys(HAND).length, 'the hand table covers the pool');
  ok(HUCKEL_POOL.some((e) => HAND[e.id][2] === 'aromatic') && HUCKEL_POOL.some((e) => HAND[e.id][2] === 'anti') && HUCKEL_POOL.some((e) => HAND[e.id][2] === 'non'), 'the pool has aromatic, anti-aromatic and non-aromatic rings');
  ok(HUCKEL_POOL.some((e) => e.id === 'cot-dianion') && HUCKEL_POOL.some((e) => e.id === 'cyclobutadiene') && HUCKEL_POOL.some((e) => e.id === 'benzene'), 'the pool has the workbook B2 rings');
  eq(generatorForSkill('aromaticity'), 'huckel', 'aromaticity is served by the huckel generator');
  eq(skillLabel('aromaticity'), 'Aromaticity (Hückel’s rule)', 'aromaticity skill label');
  {
    const hs = generate('huckel', 80, { rng: mkRng(7) });
    let c = 0, n = 0;
    for (const p of hs) {
      const H = HAND[p.hid];
      ok(p.skill === 'aromaticity' && !!H, `Hückel problem on ${p.hid}`);
      if (p.kind === 'input') { n++; eq(p.answer, H[1], `Hückel count ${p.hid}: answer is the hand-counted pi electrons`); ok(H[2] !== 'non' && !p.wrong.some((w) => w.match === p.answer), `Hückel count ${p.hid}: a wrong list never contains the answer`); }
      else {
        c++;
        eq(p.options.filter((o) => o.correct).length, 1, `Hückel class ${p.hid}: one right option`);
        const right = p.options.find((o) => o.correct).text;
        ok(right.startsWith({ aromatic: 'Aromatic', anti: 'Anti-aromatic', non: 'Not aromatic' }[H[2]]), `Hückel class ${p.hid}: the right option is ${H[2]}`);
        ok(p.options.every((o) => o.why && o.why.length > 20), `Hückel class ${p.hid}: every option has a reason`);
      }
      ok(p.hints.length === 2 && p.derive.length > 20, `Hückel ${p.hid}: hints and a worked line`);
    }
    ok(c > 20 && n > 10, `Hückel generator mixes class questions (${c}) and counts (${n})`);
  }
  {   // adapters: every kind a paper can hold is graded against the generator's own answer
    const cnt = { proj: 0, pair: 0, rs: 0, centers: 0 };
    for (const g of ['stereo-projections', 'stereo-relationships', 'rs']) {
      for (const p of generate(g, 60, { rng: mkRng(31) })) {
        const v = M.adapt(p);
        if (p.kind === 'widget' && p.widget === 'projection-pair') {
          ok(v && v.extra.type === 'proj' && v.options.find((o) => o.correct).text === p.config.options.find((o) => o.id === p.config.answer).text, 'projection pair adapts with its right option'); cnt.proj++;
        } else if (p.kind === 'widget' && p.widget === 'relationship-drill') {
          ok(v && v.extra.type === 'pair' && v.options.length === 4 && v.options.filter((o) => o.correct).length === 1, 'relationship pair adapts with one right option');
          const label = { identical: 'The same compound', enantiomers: 'Enantiomers', diastereomers: 'Diastereomers', constitutional: 'Constitutional isomers' }[p.answer];
          eq(v.options.find((o) => o.correct).text, label, 'relationship pair: the right option is the generator answer'); cnt.pair++;
        } else if (p.kind === 'widget' && p.widget === 'rs-assigner') {
          const lab = tetraInfo(p.config.smiles).find((x) => x.center).label;
          eq([v.options.find((o) => o.correct).text, p.answer], [lab, lab], 'R/S adapter: the right option is the CIP label of the drawing'); cnt.rs++;
        } else if (p.kind === 'widget' && p.widget === 'stereocenter-finder') {
          eq(v.input.answer, chiralCenters(p.config.rounds[0].smiles).length, 'centre-count adapter: the answer is the number of chirality centres'); cnt.centers++;
          ok(M.gradeAnswer({ v }, String(v.input.answer)).ok && !M.gradeAnswer({ v }, '9').ok, 'centre-count adapter grades typed numbers');
        }
      }
    }
    ok(cnt.proj > 0 && cnt.pair > 0 && cnt.rs > 0 && cnt.centers > 0, `all four widget adapters were exercised (${JSON.stringify(cnt)})`);
    ok(M.adapt({ kind: 'widget', widget: 'ring-position', config: {} }) === null && M.adapt({ kind: 'widget', widget: 'synthesis-planner', config: {} }) === null, 'tap-and-draw widgets are not offered');
  }

  // ================================================================ (7) wiring (read from the source)
  const app = read('app.js'), view = read('mock-view.js'), html = read('index.html');
  ok(/\^mock\(\?:\\\/\(script\)\)\?\$/.test(app) && /mockView\(/.test(app) && /from '\.\/mock-view\.js'/.test(app), 'router serves #mock and #mock/script with the mock view');
  ok(/id: 'open-mock'/.test(app) && /href: '#mock'/.test(app) && /'Mock midterm'/.test(app), 'home screen has a Mock midterm panel linking to #mock');
  ok(/id: 'pp-mock'/.test(app) && /'#mock'/.test(app.slice(app.indexOf('function pastpaper'))), 'the past-paper page links to the mock midterm');
  ok(/rx, pp, mockPanel/.test(app), 'the Mock midterm panel sits beside Past papers');
  ok(/Retake weighted to my weak spots/.test(view) && /Submit the paper\?/.test(view) && /role: 'timer'/.test(view) && /answered/.test(view), 'view: retake button, submit confirmation, clock and answered count');
  ok(!/\b(alert|confirm|prompt)\(/.test(view.replace(/h\('[a-z0-9]+'[^)]*\)/g, '')), 'view: no alert / confirm / prompt dialogs');
  ok(/M\.submitSitting\(/.test(view) && /M\.saveAnswer\(/.test(view) && /remainingMs/.test(view) && /finish\(true\)/.test(view), 'view: submit, save as you go, auto-submit at time out');
  ok(/aria-pressed/.test(view) && /aria-live/.test(view), 'view: pressed states and a live count');
  eq((html.match(/\/\* mock midterm \*\//g) || []).length, 1, 'index.html has one "/* mock midterm */" CSS block');
  const css = html.slice(html.indexOf('/* mock midterm */'), html.indexOf('/* what-if row'));
  ok(css.length > 2000 && !/#[0-9a-fA-F]{3,6}\b/.test(css), 'mock CSS uses the colour tokens only (no hex colours)');
  ok(!/@import|font-family\s*:\s*['"]/.test(css), 'mock CSS adds no new fonts');
  ok(/position: sticky/.test(css) && /min-height: 44px/.test(css), 'mock CSS: sticky header and 44px targets');
  const used = [...new Set((view.match(/mk-[a-z0-9-]+/g) || []))].filter((c) => !/^mk-(h|sh|s|rules-h|bp-h|hist-h|sum-h|cf-h|cf-d)$/.test(c));
  const hooks = new Set(['mk-ans-none', 'mk-d2', 'mk-secs', 'mk-blueprint', 'mk-sit', 'mk-summary']);   // class names that only mark an element for the tests / scripts
  for (const c of used) ok(css.includes('.' + c) || hooks.has(c) || /^mk-s-/.test(c), `CSS styles .${c}`);
  return { papers: papers.length };
}

// run alone: node learn/tests/mock.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  const r = await mock({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed; ${r.papers} papers`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
