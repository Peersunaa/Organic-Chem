// Mock midterm engine (#mock): blueprint arithmetic, weak-spot weighting, seeded paper building, marking, and the store-backed sitting (resume, history).
// Pure logic: no DOM. mock-view.js draws it; tests/mock.mjs checks it.
//
//   blueprint  bp = { minutes, weighted, sections: [{ id, count, marks }] }   (data/mock-blueprint.js has the defaults and presets)
//   plan       planPaper(bp, scores) -> { minutes, weighted, sections: [{ id, count, base, marks, feedCounts }] }   the counts AFTER weighting, fixed for the sitting
//   paper      buildPaper(plan, seed) -> { seed, plan, sections, questions }   the same (plan, seed) always gives the same paper (generators are fed a seeded rng,
//              and Math.random is pointed at it while a paper is built), so a reload rebuilds exactly the questions the learner was answering
//   question   { id: 'B3.4', no: '6d', sec, secNo, marks, skill, v } where v is the view model: mode 'choice' | 'input' plus everything needed to draw and grade it
//   answers    { [question id]: option index (choice) | typed text (input) }
import { SECTIONS, SECTION_BY_ID, DEFAULT_MINUTES, LIMITS, PRESETS, PRESET_BY_ID } from '../data/mock-blueprint.js';
import { generate } from './generators.js';
import { makePredictProblem, problemFor, DRILL, solveCard } from './generators-predict.js';
import { invalidateResolution } from './naming-custom.js';
import { checkInput } from './steps.js';
import { gradePair } from './widgets/relationship-drill.js';
import { KIND_ORDER, KIND_LABEL } from './stereoisomers.js';
import { chiralCenters } from './cip.js';
import { LESSONS } from '../lessons/index.js';
import { HUB_BY_ID } from './reaction-hub.js';
import { skillLabel, skillRule } from './skills.js';
import * as store from './store.js';

// ================================================================================================ seeded randomness
export function mulberry32(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash32(str) { let hh = 2166136261; for (let i = 0; i < str.length; i++) { hh ^= str.charCodeAt(i); hh = Math.imul(hh, 16777619); } return hh >>> 0; }
export const newSeed = () => Math.floor(Math.random() * 2147483647) + 1;
function withRandom(rng, fn) { const orig = Math.random; Math.random = rng; try { return fn(); } finally { Math.random = orig; } }

// ================================================================================================ the blueprint
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const int = (v, d) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : d);

export function defaultBp() { return { minutes: DEFAULT_MINUTES, weighted: false, sections: SECTIONS.map((s) => ({ id: s.id, count: s.count, marks: s.marks })) }; }
/** A blueprint from a preset (marks back to their defaults; the weighting choice is kept). */
export function presetBp(id, keep = {}) {
  const P = PRESET_BY_ID[id] || PRESET_BY_ID.full;
  return { minutes: P.minutes, weighted: !!keep.weighted, sections: SECTIONS.map((s) => ({ id: s.id, count: P.counts[s.id] || 0, marks: s.marks })) };
}
/** Clean blueprint from anything (a stored object, a half-edited one): every field is clamped, every section is present, unknown sections are dropped. */
export function normalizeBp(raw) {
  const R = raw && typeof raw === 'object' ? raw : {};
  const by = Object.fromEntries((Array.isArray(R.sections) ? R.sections : []).filter((x) => x && SECTION_BY_ID[x.id]).map((x) => [x.id, x]));
  return {
    minutes: clamp(Math.round(int(R.minutes, DEFAULT_MINUTES) / LIMITS.minuteStep) * LIMITS.minuteStep, LIMITS.minutes[0], LIMITS.minutes[1]),
    weighted: R.weighted === true,
    sections: SECTIONS.map((s) => ({ id: s.id, count: clamp(int(by[s.id] && by[s.id].count, s.count), LIMITS.count[0], LIMITS.count[1]), marks: clamp(int(by[s.id] && by[s.id].marks, s.marks), LIMITS.marks[0], LIMITS.marks[1]) }))
  };
}
/** Which preset the blueprint equals (counts, marks and time), or null. */
export function matchPreset(bp) {
  const b = normalizeBp(bp);
  return (PRESETS.find((P) => { const q = presetBp(P.id); return q.minutes === b.minutes && q.sections.every((s, i) => s.count === b.sections[i].count && s.marks === b.sections[i].marks); }) || {}).id || null;
}
export function bpTotals(bp) {
  const sections = bp.sections.map((s) => ({ id: s.id, count: s.count, marks: s.marks, total: s.count * s.marks }));
  return { questions: sections.reduce((a, s) => a + s.count, 0), marks: sections.reduce((a, s) => a + s.total, 0), minutes: bp.minutes, sections };
}

// ================================================================================================ weighting toward weak spots
/** A section's weak-spot score: the sum of the decayed mistake scores of the skills it can produce (scores = store.skillScores()). */
export function sectionWeakness(secId, scores) { return SECTION_BY_ID[secId].skills.reduce((a, k) => a + (scores[k] || 0), 0); }
/** The per-section band: within +-50% of the blueprint count, whole questions. A section with 0 or 1 question cannot move. */
export function bandOf(count) { return { lo: Math.ceil(count * (1 - LIMITS.weightBand)), hi: Math.floor(count * (1 + LIMITS.weightBand)) }; }
/**
 * Shift questions toward the sections with the weakest skills, keeping the TOTAL unchanged and every section inside its band.
 * One question at a time moves from the section whose weakness per question is lowest to the one that gains most (w / (n + 1)), while that is a strict gain
 * (so the result is a proportional split, not "everything to the worst section"). With no weak spots nothing moves.
 */
export function weightedCounts(bp, scores, sectionLoss = null) {
  // `sectionLoss` ({ A1: marks lost, ... }, from lossFromMarked) replaces the skill scores: a retake is weighted by the marks THIS paper lost, section by section
  const weak = (id) => (sectionLoss ? sectionLoss[id] || 0 : sectionWeakness(id, scores || {}));
  const secs = bp.sections.map((s) => ({ id: s.id, base: s.count, n: s.count, w: weak(s.id), ...bandOf(s.count) }));
  for (let guard = 0; guard < 500; guard++) {
    let r = null, d = null;
    for (const s of secs) {
      if (s.w > 0 && s.n < s.hi && (!r || s.w / (s.n + 1) > r.w / (r.n + 1) + 1e-12)) r = s;
    }
    if (!r) break;
    for (const s of secs) {
      if (s !== r && s.n > s.lo && (!d || s.w / s.n < d.w / d.n - 1e-12)) d = s;
    }
    if (!d || !(r.w / (r.n + 1) > d.w / d.n + 1e-9)) break;
    r.n++; d.n--;
  }
  return Object.fromEntries(secs.map((s) => [s.id, s.n]));
}
/** What the weighting would change (for the start screen): [{ id, from, to }] for sections whose count moves. */
export function weightingPreview(bp, scores, loss = null) {
  const c = weightedCounts(bp, scores, loss ? loss.sections : null);
  return bp.sections.filter((s) => c[s.id] !== s.count).map((s) => ({ id: s.id, from: s.count, to: c[s.id] }));
}

/** Split n questions between a section's feeds in proportion to their weights (largest remainder; ties go to the earlier feed). */
export function splitFeeds(weights, n) {
  const tot = weights.reduce((a, b) => a + b, 0) || 1;
  const q = weights.map((w) => (n * w) / tot);
  const out = q.map(Math.floor);
  let left = n - out.reduce((a, b) => a + b, 0);
  q.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f || a.i - b.i).forEach(({ i }) => { if (left > 0) { out[i]++; left--; } });
  return out;
}
const feedWeight = (feed, scores, weighted) => { if (!weighted) return feed.w; const s = feed.skills.reduce((a, k) => a + ((scores || {})[k] || 0), 0); return feed.w * (1 + (2 * s) / (s + 1)); };

/** The plan for one sitting: counts after weighting (when bp.weighted), how each section's questions split between its feeds, marks, time. Sections with 0 questions are left out. */
export function planPaper(bp0, scores = null, loss = null) {
  const bp = normalizeBp(bp0);
  const weighted = bp.weighted && (!!scores || !!loss);
  if (loss) scores = loss.skills;                     // a retake: the feeds are weighted by the marks lost on each skill of the last paper too
  const counts = weighted ? weightedCounts(bp, scores, loss ? loss.sections : null) : Object.fromEntries(bp.sections.map((s) => [s.id, s.count]));
  return {
    minutes: bp.minutes, weighted,
    sections: bp.sections.filter((s) => counts[s.id] > 0).map((s) => ({
      id: s.id, count: counts[s.id], base: s.count, marks: s.marks,
      feedCounts: splitFeeds(SECTION_BY_ID[s.id].feeds.map((f) => feedWeight(f, scores, weighted)), counts[s.id])
    }))
  };
}
/**
 * The marks a marked paper lost: { sections: { id: marks lost }, skills: { skill: marks lost } } (lost marks = the section's weak-spot score). Only wrong or blank answers lose marks,
 * so a section that scored full marks has no weakness and can only give questions away.
 */
export function lossFromMarked(marked) {
  const sections = {}, skills = {};
  marked.items.forEach((it) => {
    const lost = it.marks - it.got;
    if (lost <= 0) return;
    sections[it.sec] = (sections[it.sec] || 0) + lost;
    skills[it.skill] = (skills[it.skill] || 0) + lost;
  });
  return { sections, skills };
}
export function planTotals(plan) { return { questions: plan.sections.reduce((a, s) => a + s.count, 0), marks: plan.sections.reduce((a, s) => a + s.count * s.marks, 0), minutes: plan.minutes }; }

// ================================================================================================ turning a generated problem into a question the paper can show and grade
const RS_OPTS = ['R', 'S'];
/** The view model of a generated problem, or null when it cannot be answered on a page with no feedback (tap-and-draw widgets). */
/** The identity of a reaction question for "not twice in one paper": card + substrate + reagent(s) (+ the case and failing option of a will-not-work question). Two modes asking about the same substrate and reagent share a key. '' when the problem has no card. */
export function dedupeKey(p) {
  if (!p || !p.card) return '';
  const sub = Array.isArray(p.substrate) ? p.substrate.join('.') : p.substrate || '';
  return [p.card, sub, p.caseId || '', p.reagent || '', p.halide || '', p.reagent2 || '', p.halide2 || '', typeof p.fails === 'string' ? p.fails + '+' + (p.works || []).slice().sort().join(',') : ''].join('|');
}
export function adapt(p) {
  const base = { skill: p.skill, dk: dedupeKey(p), dk1: p.reagent2 ? dedupeKey({ ...p, reagent2: '', halide2: '' }) : '', promptHtml: p.promptHtml || null, prompt: p.prompt || '', derive: p.derive || '', deriveHtml: p.deriveHtml || '', worked: p.worked || '', hints: p.hints || [], card: p.card || null, smiles: null, highlight: [], equation: p.equation || null, extra: null };
  if (p.kind === 'choice' && Array.isArray(p.options) && p.options.some((o) => o.correct)) {
    return { ...base, mode: 'choice', smiles: p.smiles || null, highlight: p.highlight || [],
      options: p.options.map((o) => ({ text: o.text || '', smiles: o.smiles || null, raw: !!o.raw, correct: !!o.correct, lead: o.lead || null, more: o.more || '', why: o.why || '' })) };
  }
  if (p.kind === 'input' && p.answer !== undefined && p.answer !== null) {
    return { ...base, mode: 'input', smiles: p.smiles || null, highlight: p.highlight || [], visual: undefined,
      input: { answer: p.answer, accept: p.accept, name: p.name, smiles: p.name ? p.smiles : undefined, noForms: p.noForms, diagnoseFn: p.diagnoseFn, diagnose: p.wrong, fallback: p.fallback || p.derive, skill: p.skill, formula: p.formula, tolerance: p.tolerance } };
  }
  if (p.kind === 'widget' && p.widget === 'projection-pair' && p.config && p.config.options) {
    const c = p.config;
    return { ...base, mode: 'choice', extra: { type: 'proj', a: c.a, b: c.b }, options: c.options.map((o) => ({ text: o.text, smiles: null, raw: false, correct: o.id === c.answer, lead: null, more: '', why: (c.whys && c.whys[o.id]) || p.derive || '' })) };
  }
  if (p.kind === 'widget' && p.widget === 'relationship-drill' && p.config && p.config.pairs && p.config.pairs.length === 1) {
    const pair = p.config.pairs[0], kinds = p.config.kinds || KIND_ORDER;
    const truth = gradePair(pair, kinds[0]).truth;
    return { ...base, mode: 'choice', extra: { type: 'pair', a: pair.a, b: pair.b, rotateB: pair.rotateB || 0, title: pair.title || '' },
      options: kinds.map((k) => { const g = gradePair(pair, k); return { text: KIND_LABEL[k] || k, smiles: null, raw: false, correct: k === truth, lead: null, more: '', why: g.ok ? (g.confirm || '') : g.diagnosis }; }) };
  }
  if (p.kind === 'widget' && p.widget === 'rs-assigner' && p.config && p.config.mode === 'wedge') {
    return { ...base, mode: 'choice', smiles: p.config.smiles,
      options: RS_OPTS.map((l) => ({ text: l, smiles: null, raw: false, correct: l === p.answer, lead: null, more: '', why: l === p.answer ? p.derive : `Not ${l}. ${p.derive}` })) };
  }
  if (p.kind === 'widget' && p.widget === 'stereocenter-finder' && p.config && p.config.rounds && p.config.rounds.length === 1 && Array.isArray(p.centers)) {
    const smi = p.config.rounds[0].smiles;
    return { ...base, mode: 'input', smiles: smi, prompt: 'How many chirality centers does this molecule have? Write 0 if there are none.', promptHtml: null,
      input: { answer: chiralCenters(smi).length, accept: undefined, name: false, fallback: p.derive, skill: p.skill } };
  }
  return null;
}

// ================================================================================================ drawing the questions of a paper
/** An HBr-on-an-alkene problem whose product has a stereocentre (a racemic pair forms), from the predict-product drill's own alkene-hx card. */
let hbrCombos = null;
export function hbrCombosList() {
  if (hbrCombos) return hbrCombos;
  const entry = DRILL['alkene-hx'];
  hbrCombos = [];
  for (const sub of entry.subs) {
    const v = entry.variants.find((x) => x.id === 'HBr');
    try { const S = solveCard('alkene-hx', sub, v, () => 0.5); if (S.products.some((s) => chiralCenters(s).length > 0)) hbrCombos.push({ sub, v }); } catch (e) { /* an excluded substrate */ }
  }
  return hbrCombos;
}
function hbrProblem(rng) {
  const list = hbrCombosList();
  for (let i = 0; i < 20; i++) {
    const c = list[Math.floor(rng() * list.length)];
    const p = problemFor('alkene-hx', c.sub, c.v, rng);
    if (p) return p;
  }
  return null;
}
const fingerprint = (v) => `${v.skill}|${v.smiles || ''}|${v.prompt}|${v.equation ? JSON.stringify(v.equation) : ''}|${v.extra ? JSON.stringify(v.extra) : ''}|${(v.options || []).map((o) => o.smiles || o.text).join('~')}`;
function one(feed, rng, last) {
  if (feed.pick === 'hbr') return hbrProblem(rng);
  if (feed.gen === 'predict-product') return makePredictProblem(rng, last);
  return generate(feed.gen, 1, { rng, skill: feed.skill || null, settings: feed.settings || null, isolated: true })[0];
}
/** n distinct, answerable questions (view models) from one feed. Throws if the feed cannot supply them. */
export function drawFeed(feed, n, rng, used = new Set()) {
  const out = [];
  let last = {};
  withRandom(rng, () => {
    if (feed.gen === 'naming-levels') invalidateResolution();
    for (let tries = 0; out.length < n && tries < 600; tries++) {
      let p;
      try { p = one(feed, rng, last); } catch (e) { continue; }
      if (!p) continue;
      const v = adapt(p);
      if (!v) continue;
      if (!feed.skills.includes(v.skill)) continue;   // a problem outside the skills the blueprint lists for this feed is never used
      const key = fingerprint(v), dk = v.dk ? 'dk:' + v.dk : '', dk1 = v.dk1 ? 'dk:' + v.dk1 : '';
      // not the same drawing, and not the same card + substrate + reagent in another dress (guess-reagent after predict-product); a two-step question also uses up its first step
      if (used.has(key) || (dk && used.has(dk)) || (dk1 && used.has(dk1))) continue;
      used.add(key); if (dk) used.add(dk); if (dk1) used.add(dk1); out.push(v); last = { card: p.card, group: p.group };
    }
  });
  if (out.length < n) throw new Error(`mock: ${feed.gen} could not supply ${n} questions`);
  return out;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
export function buildPaper(plan, seed) {
  const used = new Set();
  const questions = [], sections = [];
  plan.sections.forEach((ps, si) => {
    const sec = SECTION_BY_ID[ps.id];
    const items = [];
    sec.feeds.forEach((feed, fi) => {
      const n = ps.feedCounts[fi];
      if (!n) return;
      const rng = mulberry32((Math.imul(seed >>> 0, 2654435761) + hash32(ps.id) + fi * 7919) >>> 0);
      drawFeed(feed, n, rng, used).forEach((v, j) => items.push({ v, pos: (j + 0.5) / n, fi }));
    });
    items.sort((a, b) => a.pos - b.pos || a.fi - b.fi);
    const first = questions.length;
    items.forEach((it, i) => questions.push({ id: `${ps.id}.${i + 1}`, no: `${si + 1}${LETTERS[i]}`, sec: ps.id, secNo: si + 1, marks: ps.marks, skill: it.v.skill, v: it.v }));
    sections.push({ id: ps.id, no: si + 1, title: sec.title, instruction: sec.instruction, note: sec.note || '', count: ps.count, marks: ps.marks, total: ps.count * ps.marks, first, last: questions.length - 1 });
  });
  return { seed, plan, sections, questions };
}

// ================================================================================================ answers and marking
/** The answer value that is right for a question: an option index (choice) or the typed text (input). Used by the tests. */
export function correctValue(q) { return q.v.mode === 'choice' ? q.v.options.findIndex((o) => o.correct) : String(q.v.input.answer); }
/** A value that is certainly wrong. */
export function wrongValue(q) { return q.v.mode === 'choice' ? q.v.options.findIndex((o) => !o.correct) : 'no such answer 000'; }
const blank = (val) => val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
/** Grade one answer: { answered, ok, diagnosis } (the diagnosis names the fact missed; '' when right or unanswered). */
export function gradeAnswer(q, val) {
  if (blank(val)) return { answered: false, ok: false, diagnosis: '' };
  if (q.v.mode === 'choice') {
    const o = q.v.options[Number(val)];
    if (!o) return { answered: false, ok: false, diagnosis: '' };
    if (o.correct) return { answered: true, ok: true, diagnosis: '' };
    return { answered: true, ok: false, diagnosis: [o.lead, o.more].filter(Boolean).join(' ') || o.why || '' };
  }
  const r = checkInput(q.v.input, String(val));
  return { answered: true, ok: !!r.ok, diagnosis: r.ok ? '' : r.diagnosis || '' };
}
/** Mark a paper: total, per-section marks and one item per question. All or nothing per question; a blank answer scores 0. */
export function markPaper(paper, answers) {
  const items = paper.questions.map((q) => {
    const g = gradeAnswer(q, answers ? answers[q.id] : undefined);
    return { id: q.id, no: q.no, sec: q.sec, marks: q.marks, skill: q.skill, got: g.ok ? q.marks : 0, ok: g.ok, answered: g.answered, diagnosis: g.diagnosis, value: answers ? answers[q.id] : undefined };
  });
  const sections = paper.sections.map((s) => {
    const its = items.slice(s.first, s.last + 1);
    return { id: s.id, no: s.no, title: s.title, n: its.length, correct: its.filter((x) => x.ok).length, got: its.reduce((a, x) => a + x.got, 0), max: s.total };
  });
  return { got: items.reduce((a, x) => a + x.got, 0), max: sections.reduce((a, s) => a + s.max, 0), n: items.length, correct: items.filter((x) => x.ok).length, answered: items.filter((x) => x.answered).length, sections, items };
}

// ================================================================================================ links from a marked question
const lessonStepLink = (id, step) => ({ href: `#lesson-${id}/${step}`, label: `Lesson ${Number(id)}, step ${Number(String(step).slice(1))}` });
/** Where to go after a miss: the lesson step, the reaction-hub card (when the question has one) and the practice mode for its skill. */
export function linksFor(q) {
  const card = q.v.card && HUB_BY_ID[q.v.card] ? HUB_BY_ID[q.v.card] : null;
  let lesson = null;
  if (card && card.lesson) lesson = lessonStepLink(card.lesson.id, card.lesson.step);
  else for (const L of LESSONS) { const st = L.steps.find((x) => x.skill === q.skill); if (st) { lesson = lessonStepLink(L.id, st.id); break; } }
  return {
    lesson,
    card: card ? { href: `#reactions/${card.id}`, label: `Card: ${card.reagent.length > 34 ? card.reagent.slice(0, 32) + '…' : card.reagent}` } : null,
    practise: { href: `#practise-${q.skill}`, label: `Practise: ${skillLabel(q.skill)}` },
    rule: skillRule(q.skill)
  };
}

// ================================================================================================ the sitting (store-backed)
/** Open a sitting: a fresh plan and seed, the clock started, saved so a reload resumes it. */
export function startSitting(bp, { seed = newSeed(), scores = null, loss = null, now = Date.now() } = {}) {
  // a weighted retake (bp.retake, set by bpFromPlan) is weighted by the marks the last paper lost, not by the long-run log
  if (!loss && bp && bp.retake && bp.weighted) loss = lossFromLastPaper();
  const plan = planPaper(bp, scores, loss);
  const sess = { seed, plan, startedAt: now, minutes: plan.minutes, answers: {}, status: 'open' };
  store.setMock({ bp: normalizeBp(bp), current: sess });
  return sess;
}
export function currentSitting() { return store.getMock().current; }
export function saveAnswer(sess, qid, val) {
  if (blank(val)) delete sess.answers[qid]; else sess.answers[qid] = val;
  store.setMock({ current: sess });
}
/** The marks lost on the last marked paper (rebuilt from its seed and answers), or null when there is none. */
export function lossFromLastPaper() {
  const last = store.getMock().last;
  if (!last || !last.plan) return null;
  try { return lossFromMarked(markPaper(buildPaper(last.plan, last.seed), last.answers)); } catch (e) { return null; }
}
export const remainingMs = (sess, now = Date.now()) => sess.startedAt + sess.minutes * 60000 - now;
export function abandonSitting() { store.setMock({ current: null }); }

/**
 * Submit: mark, log every miss to the weak-spot log with its skill (and every right answer as a win), append to the history, keep the paper as `last`, close the sitting.
 * `paper` is buildPaper(sess.plan, sess.seed). Returns the marks.
 */
export function submitSitting(sess, paper, { now = Date.now(), timedOut = false } = {}) {
  const res = markPaper(paper, sess.answers);
  res.items.forEach((it) => {
    if (it.ok) store.logWin(it.skill);
    else store.logMistake({ skill: it.skill, stepId: 'mock', lessonId: 'mock', diagnosis: it.diagnosis || 'Not answered in the mock midterm.' });
  });
  const used = Math.max(0, Math.min(sess.minutes * 60, Math.round((now - sess.startedAt) / 1000)));
  const entry = { t: now, seed: sess.seed, got: res.got, max: res.max, n: res.n, correct: res.correct, minutes: sess.minutes, used, weighted: !!sess.plan.weighted, timedOut: !!timedOut, sections: res.sections.map((s) => ({ id: s.id, got: s.got, max: s.max })) };
  const m = store.getMock();
  store.setMock({ current: null, last: { seed: sess.seed, plan: sess.plan, startedAt: sess.startedAt, finishedAt: now, answers: sess.answers, timedOut: !!timedOut }, history: m.history.concat([entry]) });
  return res;
}
export function lastResult() { return store.getMock().last; }
export function history() { return store.getMock().history; }
export { SECTIONS, SECTION_BY_ID, PRESETS, LIMITS, DEFAULT_MINUTES };

/** The blueprint a plan came from (counts BEFORE weighting, marks, minutes), so a retake can start from the same blueprint. */
export function bpFromPlan(plan, weighted = false) {
  const by = Object.fromEntries(plan.sections.map((s) => [s.id, s]));
  const bp = normalizeBp({ minutes: plan.minutes, weighted, sections: SECTIONS.map((s) => ({ id: s.id, count: by[s.id] ? by[s.id].base : 0, marks: by[s.id] ? by[s.id].marks : s.marks })) });
  if (weighted) bp.retake = true;                      // startSitting then weights by the marks the last paper lost
  return bp;
}
