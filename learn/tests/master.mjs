// Question-type mastery course checks (data/question-types.js, data/question-type-seeds.js, engine/master.js, the `tasks` / `settings` options of generate(), master-view.js, the #master routes).
//  (1) the generators' new `tasks` option: an unknown task name throws "unknown task X", a pinned task is the only one drawn, nothing changes when it is absent; `settings` reach the reaction engines;
//  (2) the data: groups and types have every field in the right shape, section ids exist in the mock blueprint, book numbers exist in the book map or a lesson's Use-it list, every lesson step /
//      reaction card / scene a type links to is real, no SMILES pasted into the prose;
//  (3) every live type: each source makes problems that can be answered (a right option, an answer or a widget config); the three worked examples exist, are the same every time, and read as an
//      answer plus a worked line;
//  (4) the streak logic on a fresh store: four then a miss, five masters, a later miss keeps it mastered, book ticks persist, progress and the ladder order, the lesson / skill lookups;
//  (5) wiring read from the source: routes, home panel, lesson links, the mock script link, the CSS block, steps.js honouring cfg.next / onSettled.
// Run on its own with `node learn/tests/master.mjs`, or as part of run.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ready } from '../engine/chem.js';
import { generate, GENERATORS } from '../engine/generators.js';
import { GROUPS, TYPES, TYPE_BY_ID, LIVE_STAGE, liveTypes, typesForLesson, typesForSkill } from '../data/question-types.js';
import { SEEDS } from '../data/question-type-seeds.js';
import { SECTION_IDS } from '../data/mock-blueprint.js';
import { LESSONS } from '../lessons/index.js';
import { HUB_BY_ID } from '../engine/reaction-hub.js';
import { SCENE_BY_ID } from '../scenes/scene-index.js';
import * as store from '../engine/store.js';
import * as MS from '../engine/master.js';
import { mulberry32 } from '../engine/mock.js';
import { endReactionSession } from '../engine/reactions-custom.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (...p) => fs.readFileSync(path.join(HERE, '..', ...p), 'utf8');
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
const strList = (a, lo, hi) => Array.isArray(a) && a.length >= lo && a.length <= hi && a.every(nonEmpty);

/** The numbers of the end-of-chapter problems the book map lists: a category lists its first four and a count, so the run first .. first + count - 1 exists. */
function bookMapNumbers() {
  const map = JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', 'analysis', 'book-problem-map.json'), 'utf8'));
  const out = new Set();
  for (const ch of Object.values(map.chapters)) {
    for (const cat of Object.values(ch.end_of_chapter_by_category || {})) {
      const first = cat.problems && cat.problems[0];
      if (!first) continue;
      const [c, n] = first.split('.').map(Number);
      for (let i = 0; i < Math.max(cat.count || 1, cat.problems.length); i++) out.add(`${c}.${n + i}`);
      cat.problems.forEach((p) => out.add(p));
    }
  }
  return out;
}
const usable = (p) => !!p && (p.prompt || p.promptHtml) && (
  p.kind === 'choice' ? Array.isArray(p.options) && p.options.filter((o) => o.correct).length === 1
    : p.kind === 'input' ? p.answer !== undefined && p.answer !== null && String(p.answer) !== ''
      : !!(p.config || p.widget || p.visual));

export async function master({ ok, eq }) {
  await ready();
  const seen = (rng, n, gen, opts) => { endReactionSession(); return generate(gen, n, { ...opts, rng, isolated: true }); };

  // ================================================================ (1) the generators' `tasks` and `settings` options
  {
    const TABLES = { 'shape-basic': ['hyb', 'sigma'], 'acid-base': ['direction', 'lewis'], 'skeletal-fg': ['hcount', 'find'], 'alkane-names': ['name', 'pick'], chairs: ['bothEq', 'energyAngle'], 'alkene-names': ['ez', 'cistrans'],
      'mechanism-basics': ['rds', 'hx1'], markovnikov: ['product', 'rank'], 'alkene-additions-2': ['product', 'reagent'], resonance: ['draw', 'count'], alkynes: ['product', 'acidity'], 'eas-basics': ['product', 'fc'],
      directors: ['classify', 'order'], rs: ['rs', 'mirror'], 'stereo-relationships': ['rel', 'meso'], fischer: ['rs-h', 'manip'], huckel: ['class', 'count'], 'lewis-basic': ['lp', 'valence'] };
    for (const [g, names] of Object.entries(TABLES)) {
      let msg = '';
      try { generate(g, 1, { tasks: ['no-such-task'], rng: mulberry32(1), isolated: true }); } catch (e) { msg = e.message; }
      eq(msg, 'unknown task no-such-task', `${g}: an unknown task name throws "unknown task X"`);
      let pinned = true;
      for (const t of names) { try { const ps = generate(g, 2, { tasks: [t], rng: mulberry32(2), isolated: true }); pinned = pinned && ps.length === 2 && ps.every((p) => p.prompt || p.promptHtml || p.config); } catch (e) { pinned = false; msg = `${t}: ${e.message}`; } }
      ok(pinned, `${g}: every pinned task makes problems ${msg}`);
      eq(JSON.stringify(generate(g, 3, { rng: mulberry32(9), isolated: true })), JSON.stringify(generate(g, 3, { tasks: null, rng: mulberry32(9), isolated: true })), `${g}: nothing changes when tasks is absent`);
    }
    const hk = (t) => generate('huckel', 14, { tasks: [t], rng: mulberry32(4), isolated: true });
    ok(hk('count').every((p) => p.type === 'count') && hk('class').every((p) => p.type !== 'count'), 'huckel: tasks pins the count questions or the class questions');
    ok(generate('lewis-basic', 12, { tasks: ['valence'], rng: mulberry32(5) }).every((p) => p.skill === 'valence-electrons'), 'lewis-basic: tasks pins the valence-electron question');
    ok(generate('markovnikov', 12, { tasks: ['rank'], skill: 'markovnikov', rng: mulberry32(6), isolated: true }).every((p) => p.skill === 'carbocations'), 'tasks wins over skill');
    const px = seen(mulberry32(3), 6, 'predict-product', { skill: 'predict-product', settings: { cards: ['alkene-x2'] } });
    ok(px.length === 6 && px.every((p) => p.card === 'alkene-x2'), 'predict-product: partial settings { cards } reach the reaction engine');
    const gr = seen(mulberry32(3), 4, 'guess-reagent', { skill: 'guess-reagent', settings: { cards: ['alkene-hx'] } });
    ok(gr.length === 4 && gr.every((p) => p.card === 'alkene-hx'), 'guess-reagent: partial settings reach the reaction engine');
  }

  // ================================================================ (2) the data
  eq(new Set(GROUPS.map((g) => g.id)).size, GROUPS.length, 'group ids are unique');
  ok(GROUPS.every((g) => nonEmpty(g.id) && nonEmpty(g.title) && nonEmpty(g.blurb)), 'every group has an id, title and blurb');
  eq(new Set(TYPES.map((t) => t.id)).size, TYPES.length, 'type ids are unique');
  ok(TYPES.length >= 30, `the ladder has ${TYPES.length} types`);
  const bookNums = bookMapNumbers();
  for (const L of LESSONS) ((L.useIt && L.useIt.book) || []).forEach((b) => bookNums.add(b));
  const proseBad = /\[C@|smiles\s*=/i;
  for (const t of TYPES) {
    const w = `type ${t.id}`;
    ok(/^[a-z0-9-]+$/.test(t.id), `${w}: id is a slug`);
    ok(GROUPS.some((g) => g.id === t.group), `${w}: group exists`);
    ok(Number.isInteger(t.stage) && t.stage >= 1 && t.stage <= 4, `${w}: stage 1-4`);
    ok(nonEmpty(t.title) && nonEmpty(t.short), `${w}: title and short label`);
    ok(Number.isInteger(t.chapter) && t.chapter >= 1 && t.chapter <= 6, `${w}: chapter 1-6`);
    ok(t.section === 'any' || (Array.isArray(t.section) && t.section.length > 0 && t.section.every((s) => SECTION_IDS.includes(s))), `${w}: section ids are in the mock blueprint (or "any")`);
    ok(Number.isInteger(t.weight) && t.weight >= 1 && t.weight <= 4, `${w}: weight 1-4`);
    ok(nonEmpty(t.recognise) && t.recognise.length >= 40, `${w}: recognise is a real sentence`);
    ok(strList(t.cues, 1, 8), `${w}: cues`);
    ok(strList(t.procedure, 3, 7), `${w}: procedure has 3-7 steps`);
    ok(strList(t.marks, 2, 4) && t.marks.every((m) => /^\d+ marks?: /.test(m)), `${w}: 2-4 mark lines, each starting "N mark(s):"`);
    ok(t.traps === undefined || strList(t.traps, 1, 6), `${w}: traps`);
    ok(Array.isArray(t.sources) && t.sources.length > 0 && t.sources.every((s) => nonEmpty(s.gen) && s.w > 0 && (!s.tasks || strList(s.tasks, 1, 20))), `${w}: sources have a generator and a weight`);
    ok(Array.isArray(t.book) && t.book.length > 0 && t.book.every((b) => /^[1-6]\.\d+$/.test(b)), `${w}: book numbers look like 4.12`);
    for (const b of t.book) ok(bookNums.has(b), `${w}: book problem ${b} exists in the book map or a lesson's Use-it list`);
    for (const l of t.lessons) { const L = LESSONS.find((x) => x.id === l.id); ok(!!L && L.steps.some((s) => s.id === l.step), `${w}: lesson ${l.id} ${l.step} is a real step`); }
    for (const c of t.cards) ok(!!HUB_BY_ID[c], `${w}: card ${c} exists`);
    for (const c of t.scenes) ok(!!SCENE_BY_ID[c], `${w}: scene ${c} exists`);
    ok(![t.recognise, ...t.procedure, ...t.marks, ...(t.traps || []), ...t.cues].some((s) => proseBad.test(s)), `${w}: no SMILES pasted into the prose`);
    ok(Array.isArray(SEEDS[t.id]) && SEEDS[t.id].length <= 3 && SEEDS[t.id].every((e) => Number.isInteger(e.seed) && e.seed > 0 && e.src >= 0 && e.src < t.sources.length), `${w}: seeds point at real sources`);
  }

  // ================================================================ (3) every live type: practice sources and worked examples
  const live = liveTypes();
  ok(live.length > 0 && live.length === TYPES.filter((t) => t.stage <= LIVE_STAGE).length, `${live.length} live types`);
  for (const t of live) {
    const w = `type ${t.id}`;
    t.sources.forEach((s, i) => {
      ok(!!GENERATORS[s.gen], `${w}: source ${i} generator ${s.gen} is registered`);
      let ps = [], err = '';
      try { ps = seen(mulberry32(11 + i), 3, s.gen, MS.sourceArgs(s)); } catch (e) { err = e.message; }
      ok(ps.length === 3 && ps.every(usable), `${w}: source ${i} (${s.gen}) makes 3 answerable problems ${err}`);
    });
    const a = MS.exampleProblems(t), b = MS.exampleProblems(t);
    eq(a.length, 3, `${w}: three worked examples`);
    ok(JSON.stringify(a) === JSON.stringify(b), `${w}: the examples are the same every time`);
    a.forEach((p, i) => {
      ok(p.kind === 'input' || p.kind === 'choice', `${w}: example ${i + 1} is a typed or picked answer (${p.kind})`);
      ok(usable(p), `${w}: example ${i + 1} has a prompt and one right answer`);
      ok(nonEmpty(p.derive) || nonEmpty(p.deriveHtml), `${w}: example ${i + 1} has a worked line`);
    });
    const args = MS.practiceArgs(t, mulberry32(3));
    ok(t.sources.some((s) => s.gen === args.generator) && 'settings' in args && 'tasks' in args && 'skill' in args, `${w}: practiceArgs gives { generator, skill, settings, tasks }`);
  }
  {   // pickSource follows the weights
    const t = TYPE_BY_ID['predict-hx'], rng = mulberry32(8), n = { 0: 0, 1: 0 };
    for (let i = 0; i < 4000; i++) n[t.sources.indexOf(MS.pickSource(t, rng))]++;
    const share = n[0] / 4000, want = t.sources[0].w / t.sources.reduce((s, x) => s + x.w, 0);
    ok(Math.abs(share - want) < 0.04, `pickSource: weights respected (${share.toFixed(2)} vs ${want.toFixed(2)})`);
  }

  // ================================================================ (4) streaks, mastery, progress
  try { store.resetAll(); } catch (e) { /* memory fallback */ }
  {
    const id = live[0].id;
    eq(MS.getState(id), { streak: 0, best: 0, shown: 0, good: 0, mastered: false, masteredAt: null, book: [] }, 'a fresh type has no run');
    for (let i = 0; i < 4; i++) MS.recordResult(id, true);
    let s = MS.recordResult(id, false);
    eq([s.streak, s.best, s.mastered, s.shown, s.good], [0, 4, false, 5, 4], 'four right then a miss: run 0, best 4, not mastered');
    for (let i = 0; i < 4; i++) s = MS.recordResult(id, true);
    ok(!s.mastered && s.streak === 4, 'four in a row is not enough');
    s = MS.recordResult(id, true, 1234);
    ok(s.mastered === true && s.masteredAt === 1234 && s.streak === 5 && s.best === 5, 'five in a row masters the type and stamps the time');
    s = MS.recordResult(id, false);
    ok(s.mastered === true && s.streak === 0 && s.masteredAt === 1234, 'a later miss resets the run but keeps the mastery');
    MS.recordResult(id, true); MS.resetStreak(id);
    eq(MS.getState(id).streak, 0, 'resetStreak ends the run');
    ok(MS.toggleBook(id, '4.1') === true && MS.getState(id).book.includes('4.1'), 'ticking a book problem saves it');
    ok(MS.toggleBook(id, '4.2') === true && MS.toggleBook(id, '4.1') === false, 'toggleBook ticks and unticks');
    eq(MS.getState(id).book, ['4.2'], 'unticking removes only that one');
    const other = live[1].id;
    eq(MS.getState(other).streak, 0, 'another type is untouched');
    const P = MS.progress();
    eq([P.total, P.mastered, P.pct], [live.length, 1, Math.round(100 / live.length)], 'progress counts the live types and the mastered ones');
    eq(Object.keys(P.groups).sort(), GROUPS.map((g) => g.id).sort(), 'progress has every group');
    eq(Object.values(P.groups).reduce((a, g) => a + g.total, 0), live.length, 'group totals add up');
    eq(P.groups[live[0].group].mastered, 1, 'the group of the mastered type counts it');
    ok(MS.nextType(live[0].id) === live[1] && MS.nextType(live[live.length - 1].id) === null && MS.nextType('nope') === null, 'nextType walks the ladder and ends');
    ok(MS.prevType(live[1].id) === live[0] && MS.prevType(live[0].id) === null, 'prevType is the reverse');
    ok(liveTypes().every((t) => t.stage <= LIVE_STAGE) && typesForLesson('09').length > 0 && typesForLesson('09').every((t) => t.stage <= LIVE_STAGE && t.lessons.some((l) => l.id === '09')), 'typesForLesson returns live types of that lesson');
    ok(typesForSkill('predict-product').length > 0 && typesForSkill('predict-product').every((t) => t.stage <= LIVE_STAGE), 'typesForSkill returns live types');
    ok(typesForSkill('anything', 'alkene-hx').some((t) => t.id === 'predict-hx'), 'typesForSkill finds a type by reaction card');
    store.resetAll();
  }

  // ================================================================ (5) wiring (read from the source)
  const app = read('app.js'), view = read('master-view.js'), html = read('index.html'), mockView = read('mock-view.js'), steps = read('engine', 'steps.js');
  ok(/\^master\(\?:/.test(app) && /masterView\(/.test(app) && /masterPage\(chemP, typeId\)/.test(app), 'router serves #master and #master/<type>');
  ok(/id: 'open-master'/.test(app) && /href: '#master'/.test(app) && /Open the mastery course/.test(app), 'home screen has a Mastery course panel linking to #master');
  ok(/masterHome\(\), bld, rx/.test(app), 'the Mastery course panel is first in the side column');
  ok(/ms-lesson-links/.test(app) && /Master this question type:/.test(app) && /typesForLesson\(L\.id\)/.test(app), 'the Use-it step links to its question types');
  ok(/Master this type/.test(mockView) && /typesForSkill\(q\.skill/.test(mockView), 'the marked script links a missed question to its type');
  ok(/cfg\.next/.test(steps) && /cfg\.onSettled/.test(steps) && /cfg\.status/.test(steps) && /settle\(false\)/.test(steps) && /settle\(counts\)/.test(steps), 'steps.js honours cfg.next, cfg.onSettled and cfg.status');
  ok(/id: 'ms-start'/.test(view) && /id: 'ms-overall'/.test(view) && /'ms-type-'/.test(view) && /'ms-book-'/.test(view), 'the view has the ids the tests and the page use');
  ok(/Practise to mastery/.test(view) && /Recognise it/.test(view) && /What earns the marks/.test(view) && /Book problems \(McMurry\)/.test(view) && /Mastered: five in a row\./.test(view), 'the view has every panel');
  ok(/store\.logSlip/.test(view) && /lessonId: 'master'/.test(view), 'practice slips go to the weak-spot log through the empty-check filter');
  ok(!/\b(alert|confirm|prompt)\(/.test(view.replace(/h\('[a-z0-9]+'[^)]*\)/g, '')), 'view: no alert / confirm / prompt dialogs');
  eq((html.match(/\/\* question-type mastery course \*\//g) || []).length, 1, 'index.html has one "/* question-type mastery course */" CSS block');
  const css = html.slice(html.indexOf('/* question-type mastery course */'), html.indexOf('/* mock midterm */'));
  ok(css.length > 1500 && !/#[0-9a-fA-F]{3,6}\b/.test(css), 'mastery CSS uses the colour tokens only (no hex colours)');
  ok(/\.ms-dots i\.on/.test(css) && /\.ms-dots\.is-m/.test(css) && /@media \(max-width: 460px\)/.test(css), 'mastery CSS: the dot strip, the mastered state and a phone layout');
  for (const c of ['ms-overall', 'ms-bar', 'ms-group', 'ms-list', 'ms-type', 'ms-t', 'ms-chips', 'ms-st', 'ms-dots', 'ms-ul', 'ms-traps', 'ms-top', 'ms-examples', 'ms-ex', 'ms-answer', 'ms-streak', 'ms-run', 'ms-banner', 'ms-book', 'ms-bk', 'ms-links', 'ms-lesson-links', 'ms-foot']) ok(css.includes('.' + c), `CSS styles .${c}`);
  for (const c of ['ms-overall', 'ms-group', 'ms-list', 'ms-type', 'ms-dots', 'ms-ex', 'ms-book', 'ms-bk', 'ms-links', 'ms-foot', 'ms-banner']) ok((view + app).includes(c), `the view uses .${c}`);
  return { live: live.length };
}

// run alone: node learn/tests/master.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  const r = await master({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed; ${r.live} live types`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 60)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
