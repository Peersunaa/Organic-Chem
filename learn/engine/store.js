// localStorage wrapper. Every access is wrapped; falls back to memory.
const KEY = 'orgo-learn-v1';
const DAY = 86400000;
let state = null;

function fresh() { return { v: 1, iupac: 'new', caveman: false, progress: {}, log: [], wins: [], ui: {}, mock: { bp: null, current: null, last: null, history: [] } }; }

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (s && s.v === 1) return Object.assign(fresh(), s); }
  } catch (e) { /* storage blocked */ }
  return fresh();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
function st() { return state || (state = load()); }

export function getIupac() { return st().iupac; }
export function setIupac(v) { st().iupac = v; save(); }
export function getCaveman() { return st().caveman === true; }
export function setCaveman(v) { st().caveman = !!v; save(); }

/** Small remembered UI choices (a card left open or closed), keyed by string. */
export function getUi(key) { const u = st().ui; return u ? u[key] : undefined; }
export function setUi(key, v) { const s = st(); (s.ui ||= {})[key] = v; save(); }

export function getProgress(id) { return st().progress[id] || { idx: 0, done: [], complete: false }; }
export function setProgress(id, patch) {
  const s = st();
  s.progress[id] = Object.assign(getProgress(id), patch);
  save();
}

export function logMistake({ skill, stepId, lessonId, diagnosis }) {
  const s = st();
  s.log.push({ skill, stepId, lessonId, diagnosis, t: Date.now() });
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
  save();
}
export function logWin(skill) {
  const s = st();
  s.wins.push({ skill, t: Date.now() });
  if (s.wins.length > 400) s.wins.splice(0, s.wins.length - 400);
  save();
}
export function getLog() { return st().log.slice(); }

/** Every skill with its decayed mistake score ({ skill: { skill, score, count, last } }), before any filtering or ranking. */
function skillMap(now) {
  const s = st();
  const w = (t) => Math.pow(0.5, (now - t) / (7 * DAY));
  const map = {};
  for (const e of s.log) {
    const m = (map[e.skill] ||= { skill: e.skill, score: 0, count: 0, last: null });
    m.score += w(e.t);
    if (now - e.t < 30 * DAY) m.count++;
    m.last = e;
  }
  for (const e of s.wins) if (map[e.skill]) map[e.skill].score -= 0.7 * w(e.t);
  return map;
}
/** Skills ranked by recent mistakes (half-life one week), reduced by recent correct practice. */
export function weakSpots(now = Date.now()) {
  return Object.values(skillMap(now)).filter((m) => m.score > 0.3 && m.count > 0).sort((a, b) => b.score - a.score).slice(0, 5);
}

/** { skill: score } for every skill with a positive weak-spot score (all of them, not only the top five): the mock midterm weights its sections with this. */
export function skillScores(now = Date.now()) {
  const out = {};
  for (const m of Object.values(skillMap(now))) if (m.score > 0.3 && m.count > 0) out[m.skill] = m.score;
  return out;
}

/** Mock midterm: { bp (the editable blueprint), current (the open sitting), last (the latest marked paper), history (small table of attempts) }. */
export function getMock() { const m = st().mock; return m ? { bp: m.bp || null, current: m.current || null, last: m.last || null, history: Array.isArray(m.history) ? m.history.slice() : [] } : { bp: null, current: null, last: null, history: [] }; }
export function setMock(patch) { const s = st(); s.mock = Object.assign(getMock(), patch); if (s.mock.history.length > 20) s.mock.history.splice(0, s.mock.history.length - 20); save(); }

export function resetAll() { state = fresh(); save(); }
