// Question-type mastery course (#master), logic only: no DOM. master-view.js draws it; tests/master.mjs checks it.
//   examples   exampleProblems(type) -> the three worked examples of a type. Each is generate(...) with a FIXED seed (data/question-type-seeds.js, chosen by tools/pick_master_seeds.mjs),
//              so the page and the tests see the same problem every time, and every answer is the engine's.
//   practice   pickSource(type, rng) / practiceArgs(type) -> the { generator, skill, settings, tasks } of the next practice problem (renderProblems' cfg.next), sources weighted by w.
//   mastery    store ui key 'master': { [typeId]: { streak, best, shown, good, mastered, masteredAt, book } }. Five first-try answers in a row (MASTERY_STREAK) masters a type; a miss
//              resets the run but never un-masters it. progress() counts the live types; nextType() walks the ladder order of data/question-types.js.
import * as store from './store.js';
import { generate } from './generators.js';
import { mulberry32, adapt } from './mock.js';
import { endReactionSession } from './reactions-custom.js';
import { invalidateResolution } from './naming-custom.js';
import { TYPES, GROUPS, TYPE_BY_ID, liveTypes } from '../data/question-types.js';
import { SEEDS } from '../data/question-type-seeds.js';

export const MASTERY_STREAK = 5;
export const EXAMPLES = 3;

// ================================================================================================ sources and examples
/** The reaction engines take the practice-page settings from the store unless they are told otherwise: the course always passes its own (the defaults), so a learner's saved settings never change a question type. */
const RX_GENS = new Set(['predict-product', 'guess-reagent', 'guess-reactant', 'stereo-outcome', 'two-step', 'wont-work']);
/** The generate() options of a source of a type. */
export function sourceArgs(source) {
  return { skill: source.skill || null, tasks: source.tasks || null, settings: source.settings || (RX_GENS.has(source.gen) ? {} : null) };
}
/** A widget problem the mock paper can show as a pick-one or a typed answer (a pair of drawings to name the relationship of, a wedge drawing to call R or S, a count of centres) becomes that:
 *  the worked examples are read-only, so they use the paper's own adapters. Any other problem is returned as it is. */
export function readOnly(p) {
  if (!p || p.kind !== 'widget') return p;
  const v = adapt(p);
  if (!v) return p;
  return { kind: v.mode, skill: p.skill, card: p.card, prompt: v.prompt, promptHtml: v.promptHtml || null, smiles: v.smiles, highlight: v.highlight, equation: v.equation, extra: v.extra, derive: v.derive, deriveHtml: v.deriveHtml,
    options: v.options, answer: v.input ? v.input.answer : undefined, accept: v.input ? v.input.accept : undefined, name: v.input ? !!v.input.name : false };
}
/** One problem from a source with a fixed seed. Deterministic: the engines' session memory is cleared first, Math.random follows the same seeded stream (as in a mock paper), and nothing is remembered afterwards. */
export function buildExample(source, seed) {
  endReactionSession(); invalidateResolution();
  const rng = mulberry32(seed), orig = Math.random;
  Math.random = rng;
  try { return readOnly(generate(source.gen, 1, { ...sourceArgs(source), rng, isolated: true })[0]); } finally { Math.random = orig; endReactionSession(); invalidateResolution(); }
}
/** The worked examples of a type (up to three; a type with no usable source has none). */
export function exampleProblems(type) {
  const out = [];
  (SEEDS[type.id] || []).slice(0, EXAMPLES).forEach((e) => { out.push(buildExample(type.sources[e.src], e.seed)); });
  return out;
}

/** A source of the type, chosen by weight w. rng() in [0, 1). */
export function pickSource(type, rng = Math.random) {
  const total = type.sources.reduce((s, x) => s + (x.w || 1), 0);
  let r = rng() * total;
  for (const s of type.sources) { r -= s.w || 1; if (r < 0) return s; }
  return type.sources[type.sources.length - 1];
}
/** What renderProblems' cfg.next must return for the next practice problem of the type. */
export function practiceArgs(type, rng = Math.random) {
  const s = pickSource(type, rng);
  return { generator: s.gen, ...sourceArgs(s) };
}

// ================================================================================================ mastery state
const blank = () => ({ streak: 0, best: 0, shown: 0, good: 0, mastered: false, masteredAt: null, book: [] });
const all = () => { const m = store.getUi('master'); return m && typeof m === 'object' ? m : {}; };
const put = (id, s) => { store.setUi('master', { ...all(), [id]: s }); return s; };
/** The saved state of a type (a fresh one when nothing is saved). */
export function getState(id) {
  const s = all()[id];
  return s && typeof s === 'object' ? { ...blank(), ...s, book: Array.isArray(s.book) ? s.book.slice() : [] } : blank();
}
/** One practice problem settled. counted = right on the first answer. Returns the new state. */
export function recordResult(id, counted, now = Date.now()) {
  const s = getState(id);
  s.shown++;
  if (counted) {
    s.streak++; s.good++; s.best = Math.max(s.best, s.streak);
    if (s.streak >= MASTERY_STREAK && !s.mastered) { s.mastered = true; s.masteredAt = now; }
  } else s.streak = 0;
  return put(id, s);
}
/** Start the run again (the page's reset); mastered stays. */
export function resetStreak(id) { const s = getState(id); s.streak = 0; return put(id, s); }
/** Tick or untick a book problem; returns whether it is ticked now. */
export function toggleBook(id, number) {
  const s = getState(id), n = String(number), i = s.book.indexOf(n);
  if (i >= 0) s.book.splice(i, 1); else s.book.push(n);
  put(id, s);
  return i < 0;
}
/** { total, mastered, pct, groups: { [groupId]: { total, mastered } } } over the live types. */
export function progress() {
  const live = liveTypes(), groups = {};
  GROUPS.forEach((g) => { groups[g.id] = { total: 0, mastered: 0 }; });
  let mastered = 0;
  live.forEach((t) => { const m = getState(t.id).mastered; groups[t.group].total++; if (m) { mastered++; groups[t.group].mastered++; } });
  return { total: live.length, mastered, pct: live.length ? Math.round((mastered / live.length) * 100) : 0, groups };
}
/** The next live type in ladder order, or null after the last. */
export function nextType(id) { const live = liveTypes(), i = live.findIndex((t) => t.id === id); return i >= 0 && i < live.length - 1 ? live[i + 1] : null; }
/** The live type before this one, or null before the first. */
export function prevType(id) { const live = liveTypes(), i = live.findIndex((t) => t.id === id); return i > 0 ? live[i - 1] : null; }
export { TYPES, TYPE_BY_ID };
