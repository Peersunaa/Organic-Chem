// Settings of the six reaction practice pages (#reactions-practice and #practise-predict-product, -guess-reagent, -guess-reactant, -stereo-outcome, -two-step, -wont-work,
// plus the mixed session #practise-reaction-mix). Kept in the store as `ui.reactions`.
//   Settings: substrate class (multi), reagent family (multi), individual cards (multi, 38), stereo outcome (any / only where the product shows stereo / none),
//   difficulty (any / easy / medium / hard), modes of a mixed session (multi, round-robin), count (5, 10, 20 or endless), timer (off, 60 s, 90 s), weak-spot weighting.
//   Presets: four built in (Alkenes only, Aromatics only, Stereo outcomes, Everything mixed) plus any the learner saves.
// How a problem is made
//   1. Every mode has a POOL of the problems it can make: the (card, substrate, reagent) combos whose builder returns a problem (static, engine/reaction-pools.js; the tests
//      recompute every pool with the builders and fail when one is stale), each tagged here with its substrate class, difficulty tier, cards, reagent family and whether the product shows stereo.
//   2. The settings filter the pool: an item stays when one of its cards is among the chosen cards AND in a chosen family, its substrate is in a chosen class, its stereo tag
//      and difficulty match. Counts (the landing page) are the sizes of these filtered pools.
//   3. A problem is a card picked among those that still have items (weighted toward the cards the learner slips on, when asked), then an item of that card, then the mode's own
//      builder (generators-predict.js / generators-reaction-modes.js) makes the question: every answer is the engines', never the pool's.
// Impossible combinations: if no mode being practised has a problem, the least important setting is relaxed (difficulty, then stereo, substrate class, reagent family, individual
//   cards), one at a time and then together; the page shows what changed. A mixed-session mode with no problem for the settings is left out, and the page says so.
import * as store from './store.js';
import { HUB_BY_ID } from './reaction-hub.js';
import { DRILL, problemFor } from './generators-predict.js';
import * as M from './generators-reaction-modes.js';
import {
  PRACTICE_MODES, MIX_ID, PRACTICE_LABEL, PRACTICE_BLURB, SUBSTRATE_IDS, SUBSTRATE_LABEL, FAMILY_IDS, FAMILY_LABEL, CARD_IDS, CARD_LABEL, CARD_GROUPS, DIFF_IDS, DIFF_LABEL, STEREO_IDS,
  familyOfCard, substrateClass, difficultyOf
} from './reaction-attrs.js';
import { POOL_DATA } from './reaction-pools.js';

export { PRACTICE_MODES, MIX_ID, PRACTICE_LABEL, PRACTICE_BLURB, SUBSTRATE_IDS, SUBSTRATE_LABEL, FAMILY_IDS, FAMILY_LABEL, CARD_IDS, CARD_LABEL, CARD_GROUPS, DIFF_IDS, DIFF_LABEL, STEREO_IDS };
export const STEREO_SHORT = { any: 'Any', has: 'Only with stereo', none: 'None' };
export const STEREO_FULL = { any: 'Any problem', has: 'Only problems whose product has stereo to show', none: 'Only problems with no stereo to show' };
export const COUNT_IDS = [5, 10, 20, 0];
export const COUNT_LABEL = { 5: '5', 10: '10', 20: '20', 0: 'Endless' };
export const TIMER_IDS = [0, 60, 90];
export const TIMER_LABEL = { 0: 'Off', 60: '60 s', 90: '90 s' };
/** Which settings are relaxed first when no problem fits: the least important first. */
export const RELAX_ORDER = ['difficulty', 'stereo', 'substrates', 'families', 'cards'];
export const RELAX_LABEL = { difficulty: 'Difficulty', stereo: 'Stereo outcome', substrates: 'Substrate class', families: 'Reagent family', cards: 'Individual cards' };

// ============================================================================================================
// Settings
// ============================================================================================================
const only = (list, valid, fallback) => { const a = Array.isArray(list) ? valid.filter((x) => list.includes(x)) : []; return a.length ? a : fallback.slice(); };
const one = (v, valid, fallback) => (valid.includes(v) ? v : fallback);
/** Clean settings from anything (a stored object, a saved preset): every field is checked, so a stale or hand-edited value can never break the page. */
export function normalizeSettings(raw) {
  const R = raw && typeof raw === 'object' ? raw : {};
  const S = {
    substrates: only(R.substrates, SUBSTRATE_IDS, SUBSTRATE_IDS),
    families: only(R.families, FAMILY_IDS, FAMILY_IDS),
    cards: only(R.cards, CARD_IDS, CARD_IDS),
    stereo: one(R.stereo, STEREO_IDS, 'any'),
    difficulty: one(R.difficulty, DIFF_IDS, ''),
    modes: Array.isArray(R.modes) ? PRACTICE_MODES.filter((m) => R.modes.includes(m)) : [],
    count: COUNT_IDS.includes(Number(R.count)) ? Number(R.count) : 10,
    timer: TIMER_IDS.includes(Number(R.timer)) ? Number(R.timer) : 0,
    weak: R.weak === true
  };
  if (typeof R.preset === 'string' && R.preset.trim()) S.preset = R.preset.trim().slice(0, 24);
  return S;
}
export const defaultSettings = () => normalizeSettings({});
/** The same settings with `patch` applied; a change to anything that decides which problems appear leaves the preset name (the count and timer do not). */
export function changeSettings(S, patch) {
  const next = { ...S, ...patch };
  if (Object.keys(patch).some((k) => !['count', 'timer', 'preset'].includes(k)) && !('preset' in patch)) delete next.preset;
  return normalizeSettings(next);
}
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
/** True when the settings leave every problem in (no filter at all). */
export function isUnfiltered(S) {
  return sameList(S.substrates, SUBSTRATE_IDS) && sameList(S.families, FAMILY_IDS) && sameList(S.cards, CARD_IDS) && S.stereo === 'any' && S.difficulty === '';
}

// ---- presets
export const BUILTIN_PRESETS = [
  { name: 'Alkenes only', builtin: true, settings: { substrates: ['alkenes', 'cycloalkenes'] } },
  { name: 'Aromatics only', builtin: true, settings: { substrates: ['arenes'] } },
  { name: 'Stereo outcomes', builtin: true, settings: { stereo: 'has', modes: ['stereo-outcome'] } },
  { name: 'Everything mixed', builtin: true, settings: { modes: PRACTICE_MODES.slice() } }
];
const PRESETS_KEY = 'reactions-presets';
const savedPresets = () => { try { const a = store.getUi(PRESETS_KEY); return Array.isArray(a) ? a.filter((x) => x && typeof x.name === 'string' && x.settings) : []; } catch (e) { return []; } };
export const cleanName = (s) => String(s || '').replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
const sameName = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
/** Built-in presets first, then the learner's. */
export function listPresets() { return BUILTIN_PRESETS.map((b) => ({ name: b.name, builtin: true })).concat(savedPresets().map((x) => ({ name: x.name, builtin: false }))); }
/** Save the settings under a name (a saved preset of that name is replaced; the built-ins cannot be overwritten). Returns { ok, name?, error? }. */
export function savePreset(name, S) {
  const nm = cleanName(name);
  if (!nm) return { ok: false, error: 'Give the preset a name first.' };
  if (BUILTIN_PRESETS.some((b) => sameName(b.name, nm))) return { ok: false, error: `${nm} is a built-in preset and cannot be replaced. Pick another name.` };
  const clean = normalizeSettings(S); clean.preset = nm;
  const rest = savedPresets().filter((x) => !sameName(x.name, nm));
  rest.push({ name: nm, settings: clean });
  try { store.setUi(PRESETS_KEY, rest); } catch (e) { return { ok: false, error: 'This browser would not store the preset.' }; }
  return { ok: true, name: nm };
}
/** The settings of a preset (built-in or saved), or null. A built-in keeps the count and timer in `keep` (a saved preset brings its own). */
export function loadPreset(name, keep = {}) {
  const b = BUILTIN_PRESETS.find((x) => sameName(x.name, name));
  if (b) return normalizeSettings({ ...b.settings, count: keep.count, timer: keep.timer, weak: keep.weak, preset: b.name });
  const s = savedPresets().find((x) => sameName(x.name, name));
  return s ? normalizeSettings({ ...s.settings, preset: s.name }) : null;
}
/** Delete a saved preset (the built-ins cannot be deleted). */
export function deletePreset(name) {
  if (BUILTIN_PRESETS.some((b) => sameName(b.name, name))) return false;
  const all = savedPresets(); const rest = all.filter((x) => !sameName(x.name, name));
  if (rest.length === all.length) return false;
  try { store.setUi(PRESETS_KEY, rest); } catch (e) { return false; }
  return true;
}

const KEY = 'reactions';
/** The settings in force: the stored ones, or the defaults. */
export function currentSettings() {
  let raw = null;
  try { raw = store.getUi(KEY); } catch (e) { raw = null; }
  return normalizeSettings(raw);
}
export function setCurrentSettings(S) {
  const clean = normalizeSettings(S);
  try { store.setUi(KEY, clean); } catch (e) { /* storage blocked: the page still works for this visit */ }
  return clean;
}
/** What the practice page needs from the settings: how many problems (0 = endless) and the timer. */
export function practiceConfig() { const S = currentSettings(); return { count: S.count, endless: S.count === 0, timer: S.timer }; }

// ============================================================================================================
// The pools: every problem each mode can make, with the tags the settings filter on
// ============================================================================================================
/** Which hub group, substrate class and difficulty the curated cases of "which one will not work?" belong to (the options of a case differ, the case does not). */
export const WONT_META = {
  'fc-alkylation-deactivated': { cls: 'arenes', diff: 'medium' }, 'fc-acylation-deactivated': { cls: 'arenes', diff: 'medium' }, 'fc-amine': { cls: 'arenes', diff: 'hard' },
  'fc-rearrangement': { cls: 'arenes', diff: 'hard' }, 'fc-vinyl-aryl-halide': { cls: 'arenes', diff: 'hard' }, 'h2pd-ring-alone': { cls: 'arenes', diff: 'easy' },
  'kmno4-no-benzylic-h': { cls: 'arenes', diff: 'easy' }, 'nbs-no-benzylic-h': { cls: 'arenes', diff: 'medium' }, 'pcc-tertiary-alcohol': { cls: 'alcohols', diff: 'easy' },
  'acetylide-internal-alkyne': { cls: 'alkynes', diff: 'easy' }, 'acetylide-hindered-halide': { cls: 'alkynes', diff: 'hard' }, 'lindlar-terminal-no-cis': { cls: 'alkynes', diff: 'medium' },
  'hydration-no-aldehyde': { cls: 'alkynes', diff: 'medium' }, 'hydroxide-pka': { cls: 'alkynes', diff: 'easy' }, 'bromine-without-catalyst': { cls: 'alkenes', diff: 'easy' },
  'nitration-directing': { cls: 'arenes', diff: 'easy' }, 'primary-alcohol-to-acid': { cls: 'alcohols', diff: 'easy' }
};
const choose3 = (n) => (n * (n - 1) * (n - 2)) / 6;
const COMBO_MODES = ['predict-product', 'guess-reagent', 'guess-reactant', 'stereo-outcome'];
const poolCache = {};
/** The items of a mode: { mode, bucket, cards, group, sub, cls, diff, st, n, key, ... } (n = problems the item stands for; a case of "will not work" stands for all its option mixes). */
export function poolItems(mode) {
  if (poolCache[mode]) return poolCache[mode];
  const out = [];
  if (COMBO_MODES.includes(mode)) {
    const data = POOL_DATA[mode] || {};
    for (const cardId of Object.keys(data)) {
      const e = DRILL[cardId], rows = data[cardId];
      for (let i = 0; i < rows.length; i += 3) {
        const sub = e.subs[rows[i]], v = e.variants[rows[i + 1]];
        out.push({ mode, bucket: cardId, cards: [cardId], group: HUB_BY_ID[cardId].group, sub, v, cls: substrateClass(sub), diff: difficultyOf(sub), st: rows[i + 2] === 1, n: 1, key: `${mode}|${cardId}|${rows[i]}|${rows[i + 1]}` });
      }
    }
  } else if (mode === 'two-step') {
    const data = POOL_DATA['two-step'] || {};
    for (const tid of Object.keys(data)) {
      const t = M.TEMPLATE_BY_ID[tid], rows = data[tid];
      for (let i = 0; i < rows.length; i += 4) {
        const sub = DRILL[t.A].subs[rows[i]];
        out.push({ mode, bucket: tid, cards: [t.A, t.B], group: HUB_BY_ID[t.A].group, sub, t, a: DRILL[t.A].variants[rows[i + 1]], b: DRILL[t.B].variants[rows[i + 2]], cls: substrateClass(sub), diff: difficultyOf(sub), st: rows[i + 3] === 1, n: 1, key: `${mode}|${tid}|${rows[i]}|${rows[i + 1]}|${rows[i + 2]}` });
      }
    }
  } else if (mode === 'wont-work') {
    for (const c of M.WONT_CASES) {
      const meta = WONT_META[c.id] || { cls: 'alkenes', diff: 'medium' };
      out.push({ mode, bucket: c.id, cards: [c.card], group: HUB_BY_ID[c.card].group, sub: null, c, cls: meta.cls, diff: meta.diff, st: false, n: choose3(c.works.length) * c.fails.length, key: `${mode}|${c.id}` });
    }
  }
  return (poolCache[mode] = out);
}

// ---- filtering
/** The part of the settings that decides which problems appear. */
export const filterOf = (S) => ({ substrates: S.substrates, families: S.families, cards: S.cards, stereo: S.stereo, difficulty: S.difficulty });
const fkey = (F) => `${F.substrates.join()}|${F.families.join()}|${F.cards.join()}|${F.stereo}|${F.difficulty}`;
/** Does an item satisfy the filter? One of its cards must be chosen AND in a chosen family. */
export function passes(item, F) {
  if (!F.substrates.includes(item.cls)) return false;
  if (!item.cards.some((c) => F.cards.includes(c) && F.families.includes(familyOfCard(c)))) return false;
  if (F.stereo === 'has' && !item.st) return false;
  if (F.stereo === 'none' && item.st) return false;
  if (F.difficulty && item.diff !== F.difficulty) return false;
  return true;
}
const filtered = new Map();
const filteredItems = (mode, F) => {
  const k = `${mode}#${fkey(F)}`;
  let r = filtered.get(k);
  if (!r) { r = poolItems(mode).filter((it) => passes(it, F)); if (filtered.size > 400) filtered.clear(); filtered.set(k, r); }
  return r;
};
/** How many problems a mode can make under a filter (cached). */
export function countFor(mode, F) { return filteredItems(mode, F).reduce((n, it) => n + it.n, 0); }
/** { mode: problems } for the six modes under the settings (the landing page's live counts). */
export function reactionCounts(S = currentSettings()) {
  const F = filterOf(normalizeSettings(S));
  return Object.fromEntries(PRACTICE_MODES.map((m) => [m, countFor(m, F)]));
}

// ============================================================================================================
// Impossible combinations
// ============================================================================================================
const describe = (F, key) => {
  if (key === 'difficulty') return DIFF_LABEL[F.difficulty];
  if (key === 'stereo') return STEREO_SHORT[F.stereo];
  if (key === 'substrates') return F.substrates.length === SUBSTRATE_IDS.length ? 'all' : F.substrates.map((x) => SUBSTRATE_LABEL[x]).join(', ');
  if (key === 'families') return F.families.length === FAMILY_IDS.length ? 'all' : F.families.map((x) => FAMILY_LABEL[x]).join(', ');
  return F.cards.length === CARD_IDS.length ? 'all 38' : `${F.cards.length} cards`;
};
const dropKey = (F, key) => {
  const N = { ...F };
  if (key === 'difficulty') N.difficulty = '';
  else if (key === 'stereo') N.stereo = 'any';
  else if (key === 'substrates') N.substrates = SUBSTRATE_IDS.slice();
  else if (key === 'families') N.families = FAMILY_IDS.slice();
  else if (key === 'cards') N.cards = CARD_IDS.slice();
  return N;
};
const sameKey = (A, B, key) => describe(A, key) === describe(B, key);
const anyIn = (F, play) => play.some((m) => countFor(m, F) > 0);
const listOf = (ids) => ids.length === 1 ? PRACTICE_LABEL[ids[0]] : ids.slice(0, -1).map((m) => PRACTICE_LABEL[m]).join(', ') + ' and ' + PRACTICE_LABEL[ids[ids.length - 1]];

/** The modes a page practises: its own, or (the mixed session) the chosen ones, all six when none is chosen. */
export function playModes(playId, S) {
  if (playId === MIX_ID) return S.modes.length ? S.modes.slice() : PRACTICE_MODES.slice();
  return PRACTICE_MODES.includes(playId) ? [playId] : PRACTICE_MODES.slice();
}
const resolveCache = new Map();
/**
 * Settings that can be met, or the nearest ones that can: { requested, eff (a filter), relaxed: [keys], changes, skipped: [modes], modes: [modes with a problem], message }.
 * A mode with no problem is skipped; when every mode being practised has none, one setting is relaxed (RELAX_ORDER), then all of them together.
 */
export function resolveReactions(S0, playId = MIX_ID) {
  const S = normalizeSettings(S0);
  const play = playModes(playId, S);
  const ck = `${playId}|${play.join()}|${fkey(filterOf(S))}`;
  if (resolveCache.has(ck)) return resolveCache.get(ck);
  const F0 = filterOf(S);
  let eff = F0; const relaxed = [];
  if (!anyIn(F0, play)) {
    let done = false;
    for (const key of RELAX_ORDER) {
      const N = dropKey(F0, key);
      if (sameKey(F0, N, key)) continue;
      if (anyIn(N, play)) { eff = N; relaxed.push(key); done = true; break; }
    }
    if (!done) {
      let cur = F0;
      for (const key of RELAX_ORDER) {
        const N = dropKey(cur, key);
        if (sameKey(cur, N, key)) continue;
        cur = N; relaxed.push(key);
        if (anyIn(cur, play)) break;
      }
      eff = cur;
    }
  }
  const modes = play.filter((m) => countFor(m, eff) > 0), skipped = play.filter((m) => !modes.includes(m));
  const changes = relaxed.map((k) => ({ key: k, label: RELAX_LABEL[k], from: describe(F0, k), to: describe(eff, k) }));
  const parts = [];
  if (relaxed.length) parts.push(`No problem in ${listOf(play)} fits every setting. I relaxed the least important ${relaxed.length > 1 ? 'ones' : 'one'}: ${changes.map((c) => `${c.label}: ${c.from} → ${c.to}`).join('; ')}.`);
  if (skipped.length && modes.length) parts.push(`${listOf(skipped)} ${skipped.length > 1 ? 'have' : 'has'} no problem for ${relaxed.length ? 'these settings either' : 'these settings'}, so the session leaves ${skipped.length > 1 ? 'them' : 'it'} out.`);
  const res = { requested: S, eff, relaxed, changes, skipped, modes, message: parts.join(' ') };
  if (resolveCache.size > 300) resolveCache.clear();
  resolveCache.set(ck, res);
  return res;
}
/** The report the page shows above the problems for this page and the settings in force. */
export function reactionReport(playId, S = currentSettings()) { return resolveReactions(S, playId); }

// ============================================================================================================
// Generating
// ============================================================================================================
let sess = null, snap = null;
/** Start a session (a page load, the Start button): the settings are read once, so a change in the card waits for Start, and the round-robin begins at the first mode. */
export function beginReactionSession() { snap = currentSettings(); sess = null; }
/** Forget the session (the next problem reads the stored settings again). */
export function endReactionSession() { snap = null; sess = null; }
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function weightedPick(rng, entries) {
  const t = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * t;
  for (const [v, w] of entries) { r -= w; if (r <= 0) return v; }
  return entries[entries.length - 1][0];
}
/** The weight of a card in a weak-spot session: 1, plus up to 8 for the cards the learner slips on (score from the mistake log, half-life one week). */
export const weakWeight = (score) => 1 + Math.min(8, 3 * (score || 0));
function buildItem(item, rng) {
  switch (item.mode) {
    case 'predict-product': return problemFor(item.bucket, item.sub, item.v, rng);
    case 'guess-reagent': return M.buildGuessReagent({ cardId: item.bucket, sub: item.sub, v: item.v }, rng);
    case 'guess-reactant': return M.buildGuessReactant({ cardId: item.bucket, sub: item.sub, v: item.v }, rng);
    case 'stereo-outcome': return M.buildStereoOutcome({ cardId: item.bucket, sub: item.sub, v: item.v }, rng);
    case 'two-step': return M.buildTwoStep({ t: item.t, start: item.sub, a: { cardId: item.t.A, v: item.a }, b: { cardId: item.t.B, v: item.b } }, rng);
    default: return M.buildWontWork(item.c, rng);
  }
}
/** One item of the mode under the filter: a card first (never the one just used when another is left; weighted toward weak cards when asked), then an item of that card. */
function pickItem(rng, mode, F, S, last, scores) {
  const items = filteredItems(mode, F);
  const buckets = new Map();
  for (const it of items) { if (!buckets.has(it.bucket)) buckets.set(it.bucket, []); buckets.get(it.bucket).push(it); }
  let ids = [...buckets.keys()];
  if (!ids.length) return null;
  const others = ids.filter((b) => b !== last.bucket);
  if (others.length) ids = others;
  const off = ids.filter((b) => buckets.get(b)[0].group !== last.group);
  if (off.length && off.length < ids.length && rng() < 0.7) ids = off;
  const wOf = (b) => (S.weak ? weakWeight(Math.max(...buckets.get(b)[0].cards.map((c) => scores[c] || 0))) : 1);
  const bucket = weightedPick(rng, ids.map((b) => [b, wOf(b)]));
  const list = buckets.get(bucket);
  // a stereo question that has something to show is asked about three times in four (as before)
  if (mode === 'stereo-outcome' && F.stereo === 'any') return weightedPick(rng, list.map((it) => [it, it.st ? 1 : 0.35]));
  const fresh = list.filter((it) => it.key !== last.key);
  return pick(rng, fresh.length ? fresh : list);
}
/**
 * `count` problems for a page. playId = a mode id (that mode alone) or MIX_ID (the chosen modes in turn). Every problem satisfies `report.eff`.
 * Returns the problems; the report is reactionReport(playId, settings).
 */
export function generateReactions(playId, count, { rng = Math.random, settings = null } = {}) {
  const S = settings ? normalizeSettings(settings) : snap || currentSettings();
  const res = resolveReactions(S, playId);
  const key = `${playId}|${fkey(res.eff)}|${res.modes.join()}|${S.weak}`;
  if (!sess || sess.key !== key) sess = { key, i: 0, last: {} };
  const scores = S.weak ? safeScores() : {};
  const out = [];
  for (let n = 0; n < count; n++) {
    const mode = res.modes[sess.i++ % res.modes.length];
    const last = sess.last[mode] || {};
    let p = null;
    for (let tries = 0; tries < 60 && !p; tries++) {
      const item = pickItem(rng, mode, res.eff, S, tries < 20 ? last : {}, scores);
      if (!item) break;
      try { p = buildItem(item, rng); } catch (e) { p = null; }
      if (p) sess.last[mode] = { bucket: item.bucket, group: item.group, key: item.key };
    }
    if (!p) throw new Error('reactions-custom: no problem for ' + mode);
    p.relaxed = res.relaxed.slice(); p.settingsNote = res.message;
    out.push(p);
  }
  return out;
}
const safeScores = () => { try { return store.cardScores(); } catch (e) { return {}; } };
/** Does the learner have slips logged against cards (so the weak-spot weighting changes anything)? */
export function hasWeakData() { return Object.keys(safeScores()).length > 0; }

// ============================================================================================================
// The settings card (markup; pure, tested without a DOM). The DOM glue is reactions-settings-view.js.
// ============================================================================================================
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const labelList = (ids, labels, all, max = 2) => (ids.length === all ? 'all' : ids.length > max ? ids.slice(0, max).map((x) => labels[x]).join(', ') + ` +${ids.length - max}` : ids.map((x) => labels[x]).join(', '));
/** One line that says what the settings are (shown on the collapsed card). */
export function summaryOf(S) {
  const bits = [S.preset ? S.preset : isUnfiltered(S) ? 'Everything' : 'Custom'];
  if (S.substrates.length !== SUBSTRATE_IDS.length) bits.push(labelList(S.substrates, SUBSTRATE_LABEL, SUBSTRATE_IDS.length));
  if (S.families.length !== FAMILY_IDS.length) bits.push(`${S.families.length} famil${S.families.length === 1 ? 'y' : 'ies'}`);
  if (S.cards.length !== CARD_IDS.length) bits.push(`${S.cards.length} cards`);
  if (S.stereo !== 'any') bits.push(STEREO_SHORT[S.stereo] + ' stereo');
  if (S.difficulty) bits.push(DIFF_LABEL[S.difficulty]);
  if (S.modes.length) bits.push(S.modes.length === PRACTICE_MODES.length ? 'all modes mixed' : `${S.modes.length} mode${S.modes.length === 1 ? '' : 's'} mixed`);
  bits.push(S.count ? `${S.count} problems` : 'endless');
  if (S.timer) bits.push(`${S.timer} s each`);
  if (S.weak) bits.push('weak spots');
  return bits.join(' · ');
}
const chip = (g, v, label, on, extra = '') => `<button type="button" class="nl-chip" data-g="${g}" data-v="${esc(String(v))}" aria-pressed="${on ? 'true' : 'false'}"${extra}>${esc(label)}</button>`;
const grp = (g, title, ids, labels, on, kind, hint) => `<div class="nl-group" role="group" aria-label="${esc(title)}"><p class="nl-label">${esc(title)}${hint ? ` <span class="nl-hint">${esc(hint)}</span>` : kind === 'multi' ? ' <span class="nl-hint">pick any</span>' : ''}</p><div class="nl-chips">${ids.map((id) => chip(g, id, labels[id], on(id))).join('')}</div></div>`;

/**
 * The markup of the whole card for the given settings.
 * ui = { open, cardsOpen, presets, report, dirty, error, where: 'landing' | 'practice' | 'mix', hasWeakData }
 */
export function settingsCardHtml(S, ui = {}) {
  const open = !!ui.open; const presets = ui.presets || listPresets(); const where = ui.where || 'practice';
  const built = presets.filter((p) => p.builtin).map((p) => `<button type="button" class="nl-chip" data-preset="${esc(p.name)}" aria-pressed="${S.preset === p.name ? 'true' : 'false'}">${esc(p.name)}</button>`).join('');
  const saved = presets.filter((p) => !p.builtin).map((p) => `<span class="nl-pset"><button type="button" class="nl-chip" data-preset="${esc(p.name)}" aria-pressed="${S.preset === p.name ? 'true' : 'false'}">${esc(p.name)}</button><button type="button" class="nl-x" data-del="${esc(p.name)}" aria-label="Delete preset ${esc(p.name)}">×</button></span>`).join('');
  const sub = `<b>${esc(S.preset || (isUnfiltered(S) ? 'Everything' : 'Custom'))}</b> ${S.preset ? 'A preset.' : isUnfiltered(S) ? 'Every card, every substrate.' : 'Your own mix of settings.'}`;
  const cardGroups = CARD_GROUPS.map((g) => {
    const on = g.cards.filter((c) => S.cards.includes(c)).length;
    return `<div class="nl-group rs-cardgroup" role="group" aria-label="${esc(g.label)} cards"><p class="nl-label rs-glabel"><span>${esc(g.label)} <span class="nl-hint">${on} of ${g.cards.length}</span></span><span class="rs-gbtns"><button type="button" class="rs-mini" data-gall="${g.id}">All</button><button type="button" class="rs-mini" data-gnone="${g.id}">None</button></span></p><div class="nl-chips">${g.cards.map((c) => chip('cards', c, CARD_LABEL[c], S.cards.includes(c))).join('')}</div></div>`;
  }).join('');
  const cardsOpen = !!ui.cardsOpen;
  const cardsBlock = `<div class="nl-group"><button type="button" class="rs-cardstoggle" aria-expanded="${cardsOpen ? 'true' : 'false'}" aria-controls="rs-cards"><span class="nl-label">Individual cards <span class="nl-hint">${S.cards.length} of ${CARD_IDS.length}</span></span><span class="nl-chev" aria-hidden="true"></span></button><div class="rs-cards" id="rs-cards"${cardsOpen ? '' : ' hidden'}>${cardGroups}</div></div>`;
  const modeIds = PRACTICE_MODES; const nm = S.modes.length;
  const startLabel = where === 'landing' ? '' : 'Start';
  const mixBtn = where === 'mix' ? '' : `<button type="button" class="btn ${where === 'landing' ? 'primary' : 'ghost'} rs-startmix"${nm ? '' : ' disabled'}>Start mixed session${nm ? ` (${nm} mode${nm === 1 ? '' : 's'})` : ''}</button>`;
  const weakNote = S.weak && !ui.hasWeakData ? '<span class="nl-dirty">No slips logged against a card yet, so this changes nothing for now.</span>' : '';
  const body = `<div class="nl-body" id="rs-body"${open ? '' : ' hidden'}>
    <div class="nl-group"><p class="nl-label">Presets</p><div class="nl-chips" role="group" aria-label="Choose a preset">${built}</div>${saved ? `<div class="nl-saved">${saved}</div>` : ''}
      <form class="nl-save"><input class="nl-name" type="text" maxlength="24" autocomplete="off" placeholder="Name this mix" aria-label="Preset name" /><button type="submit" class="btn small">Save preset</button></form></div>
    <p class="nl-sub">${sub}</p>
    ${grp('substrates', 'Substrate class', SUBSTRATE_IDS, SUBSTRATE_LABEL, (id) => S.substrates.includes(id), 'multi')}
    ${grp('families', 'Reagent family', FAMILY_IDS, FAMILY_LABEL, (id) => S.families.includes(id), 'multi')}
    ${cardsBlock}
    ${grp('stereo', 'Stereo outcome', STEREO_IDS, STEREO_SHORT, (id) => S.stereo === id, 'one', 'does the product show stereo?')}
    ${grp('difficulty', 'Difficulty', DIFF_IDS, DIFF_LABEL, (id) => S.difficulty === id, 'one', 'easy: textbook substrates, hard: crowded ones')}
    ${grp('modes', 'Modes of a mixed session', modeIds, PRACTICE_LABEL, (id) => S.modes.includes(id), 'multi', 'taken in turn')}
    ${grp('count', 'Problems', COUNT_IDS, COUNT_LABEL, (id) => S.count === Number(id), 'one')}
    ${grp('timer', 'Timer per problem', TIMER_IDS, TIMER_LABEL, (id) => S.timer === Number(id), 'one')}
    <div class="nl-group" role="group" aria-label="Weak spots"><p class="nl-label">Weak spots</p><div class="nl-chips">${chip('weak', '1', 'Weight toward my weak spots', S.weak)}</div></div>
    <div class="nl-actions">${startLabel ? `<button type="button" class="btn primary nl-start">${startLabel}</button>` : ''}${mixBtn}${ui.dirty ? '<span class="nl-dirty">Changed: press Start to use these settings.</span>' : ''}${weakNote}</div>
    ${ui.error ? `<p class="nl-err" role="status">${esc(ui.error)}</p>` : ''}
  </div>`;
  const note = ui.report && ui.report.message ? `<p class="nl-note rs-note" role="status"><b>${ui.report.relaxed.length ? 'These settings cannot all be met.' : 'Some modes have nothing to ask.'}</b> ${esc(ui.report.message)}</p>` : '';
  return `<div class="nl-top"><button type="button" class="nl-toggle" aria-expanded="${open ? 'true' : 'false'}" aria-controls="rs-body"><span class="nl-ttl">Settings</span><span class="nl-sum">${esc(summaryOf(S))}</span><span class="nl-chev" aria-hidden="true"></span></button></div>${note}${body}`;
}
