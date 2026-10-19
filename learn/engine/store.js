// localStorage wrapper. Every access is wrapped; falls back to memory.
const KEY = 'orgo-learn-v1';
const DAY = 86400000;
let state = null;

function fresh() { return { v: 1, iupac: 'new', caveman: false, progress: {}, log: [], wins: [], ui: {} }; }

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

/** Skills ranked by recent mistakes (half-life one week), reduced by recent correct practice. */
export function weakSpots(now = Date.now()) {
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
  return Object.values(map).filter((m) => m.score > 0.3 && m.count > 0).sort((a, b) => b.score - a.score).slice(0, 5);
}

export function resetAll() { state = fresh(); save(); }
