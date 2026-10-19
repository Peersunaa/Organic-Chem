// Orgo Learn: router, Home, lesson player, IUPAC toggle, weak-spot panel.
import { ready, setDrawStyle } from './engine/chem.js';
import * as store from './engine/store.js';
import { generatorForSkill } from './engine/generators.js';
import { renderStep, renderProblems, h, rich, setIupacMode } from './engine/steps.js';
import { skillLabel } from './engine/skills.js';
import { LESSONS, PLANNED } from './lessons/index.js';
import { buildHub } from './hub-view.js';

const app = document.getElementById('app');
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
let chemReady = false;
const chemP = ready().then(() => { chemReady = true; });

const ORBIT = '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><ellipse cx="16" cy="16" rx="13" ry="6" fill="none" stroke="currentColor" stroke-width="1.6" transform="rotate(-30 16 16)"/><circle cx="16" cy="16" r="3.2" fill="currentColor"/><circle cx="26" cy="10.4" r="2.6" class="e-dot"/></svg>';
const LOCK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

function header(extra) {
  const mode = store.getIupac();
  const sw = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(mode === 'old'), id: 'iupac-switch', title: 'Choose which naming style is shown' });
  const paint = () => { const old = store.getIupac() === 'old'; sw.setAttribute('aria-checked', String(old)); sw.innerHTML = `<span class="sw-track"><span class="sw-knob"></span></span><span class="sw-label">${old ? 'Old' : 'New'} IUPAC</span>`; };
  paint();
  sw.addEventListener('click', () => { store.setIupac(store.getIupac() === 'old' ? 'new' : 'old'); setIupacMode(store.getIupac()); paint(); });
  const brand = h('a', { class: 'brand', href: '#home', 'aria-label': 'Orgo Learn home' });
  brand.innerHTML = ORBIT + '<span>Orgo Learn</span>';
  return h('header', { class: 'top' }, brand, extra || null, sw);
}

function mount(...nodes) {
  app.innerHTML = '';
  const wrap = h('div', { class: 'wrap' });
  nodes.forEach((n) => wrap.append(n));
  app.append(wrap);
  window.scrollTo(0, 0);
  setIupacMode(store.getIupac());
}

// ---------------------------------------------------------------- Home
function stepLabel(L) {
  const p = store.getProgress(L.id);
  const total = L.steps.length + 2;
  return { p, total, started: p.done.length > 0 || p.idx > 0 };
}

function home() {
  const L = LESSONS.find((l) => !store.getProgress(l.id).complete) || LESSONS[LESSONS.length - 1];
  const s = stepLabel(L);
  const complete = store.getProgress(L.id).complete;
  const courseDone = LESSONS.every((l) => store.getProgress(l.id).complete);
  const hero = h('section', { class: 'hero' },
    h('p', { class: 'eyebrow' }, 'McMurry, chapters 1–6'),
    h('h1', {}, 'Act first, then read.'),
    h('p', { class: 'lede' }, 'Every idea starts with a question or a structure to build. The explanation arrives after you have committed to an answer.'),
    courseDone
      ? h('div', { class: 'done-note', id: 'course-complete' },
        h('p', {}, h('b', {}, 'Course complete.'), ` All ${LESSONS.length} lessons are done.`),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn primary', id: 'open-practice' }, 'Open Practice / weak spots'),
          h('a', { class: 'btn ghost', href: '#lesson-' + LESSONS[LESSONS.length - 1].id, id: 'continue-btn' }, `Review lesson ${LESSONS[LESSONS.length - 1].id}`)))
      : h('a', { class: 'btn primary big', href: '#lesson-' + L.id, id: 'continue-btn' }, complete ? `Review lesson ${L.id}` : s.started ? `Continue lesson ${L.id}` : `Start lesson ${L.id}`),
    courseDone ? null : h('p', { class: 'muted small' }, complete ? 'Lesson complete.' : s.started ? `Step ${Math.min(s.p.idx + 1, s.total)} of ${s.total}: ${L.title}` : `${L.title} · ${L.minutes} min`));

  // weak spots
  const ws = store.weakSpots();
  const panel = h('section', { class: 'panel', 'aria-labelledby': 'ws-h' }, h('h2', { id: 'ws-h' }, 'Weak spots'));
  if (!ws.length) panel.append(h('p', { class: 'muted' }, 'Slips you make show up here, ranked by how recent they are. Each one gets a practice set built from fresh molecules.'));
  else {
    const list = h('ul', { class: 'ws-list' });
    ws.forEach((w) => {
      const li = h('li', { class: 'ws' },
        h('div', { class: 'ws-main' }, h('b', {}, skillLabel(w.skill)), h('span', { class: 'muted small' }, `${w.count} recent slip${w.count === 1 ? '' : 's'}`), w.last && w.last.diagnosis ? h('span', { class: 'ws-last small' }, w.last.diagnosis) : null),
        h('a', { class: 'btn small', href: '#practise-' + w.skill }, 'Practise this'));
      list.append(li);
    });
    panel.append(list);
  }

  if (courseDone) {
    // one practice link per lesson: the first skill of that lesson that its own mastery generator serves
    const seen = new Set(), items = [];
    LESSONS.forEach((l) => {
      const sk = l.steps.map((st) => st.skill).find((k) => k && generatorForSkill(k) === l.mastery.generator && !seen.has(k));
      if (sk) { seen.add(sk); items.push(h('li', {}, h('a', { href: '#practise-' + sk }, skillLabel(sk)))); }
    });
    panel.append(h('details', { class: 'practice-all', open: 'open' }, h('summary', {}, 'Practise a skill'), h('ul', { class: 'practice-list' }, items)));
  }
  const lessons = h('section', { class: 'lessons', 'aria-labelledby': 'ls-h' }, h('h2', { id: 'ls-h' }, 'Lessons'));
  const ul = h('ol', { class: 'lesson-list' });
  LESSONS.forEach((l) => {
    const pr = store.getProgress(l.id);
    const total = l.steps.length + 2;
    const pct = pr.complete ? 100 : Math.round((pr.done.length / total) * 100);
    ul.append(h('li', {}, h('a', { class: 'lesson', href: '#lesson-' + l.id },
      h('span', { class: 'num' }, l.id),
      h('span', { class: 'ltxt' }, h('b', {}, l.title), h('span', { class: 'muted small' }, `Chapter ${l.chapter} · ${l.sections.length > 1 && l.sections[0] !== l.sections[l.sections.length - 1] ? `sections ${l.sections[0]}–${l.sections[l.sections.length - 1]}` : `section ${l.sections[0]}`} · ${l.minutes} min`),
        pct ? h('span', { class: 'mini', role: 'img', 'aria-label': `${pct}% done` }, h('i', { style: `width:${pct}%` })) : null),
      h('span', { class: 'chip ' + (pr.complete ? 'ok' : 'next') }, pr.complete ? 'Done' : pr.done.length ? 'In progress' : 'Next'))));
  });
  PLANNED.forEach((l) => {
    const li = h('li', {}, h('div', { class: 'lesson locked', 'aria-disabled': 'true' },
      h('span', { class: 'num' }, l.id), h('span', { class: 'ltxt' }, h('b', {}, l.title), h('span', { class: 'muted small' }, 'Coming soon')),
      h('span', { class: 'chip lock', html: LOCK + '<span class="sr-only">Locked</span>' })));
    ul.append(li);
  });
  lessons.append(ul);
  const rx = h('section', { class: 'panel', 'aria-labelledby': 'rx-h' }, h('h2', { id: 'rx-h' }, 'Reactions'),
    h('p', { class: 'muted' }, 'Every reagent on one card: what it does, a worked example, three facts and how to answer the exam question.'),
    h('a', { class: 'btn primary', href: '#reactions', id: 'open-reactions' }, 'Open the reaction cards'));
  mount(header(), hero, h('div', { class: 'cols' }, lessons, h('div', { class: 'side' }, rx, panel)));
  const op = document.getElementById('open-practice');
  if (op) op.addEventListener('click', () => { const t = panel.querySelector('summary') || panel; panel.scrollIntoView?.({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' }); t.focus?.({ preventScroll: true }); });
}

// ---------------------------------------------------------------- Lesson player
// "Last step" recap: after Continue, the learner sees the question they just answered,
// its answer and the one-line reason, so the next step builds on something visible.
const noMol = (s) => String(s || '').replace(/<mol\b[^>]*?(?:label="([^"]*)")?[^>]*>\s*<\/mol>/g, (m, l) => (l ? ' ' + l : '')).replace(/<\/?p>/g, ' ').trim();
const MINUS = (v) => (typeof v === 'number' && v < 0 ? '−' + -v : String(v));
function recapOf(step) {
  const correct = (step.options || []).find((o) => o.correct);
  const ans = (o) => (!o ? '' : o.text || o.label || (o.smiles ? `<mol smiles="${o.smiles}"></mol>` : ''));
  switch (step.type) {
    case 'predict': return { q: step.prompt, a: ans(correct), note: step.reveal || correct?.why };
    case 'choice': return { q: step.prompt, a: ans(correct), note: step.worked || correct?.why };
    case 'input': return { q: step.prompt, a: step.skill === 'formal-charge' && step.answer > 0 ? '+' + step.answer : MINUS(step.answer), note: step.confirm || step.worked };
    case 'try': return { q: step.prompt, a: '', note: step.confirm || step.worked };
    case 'worked': return { q: step.problem, a: step.moves?.length ? step.moves[step.moves.length - 1].then : '', note: step.rule };
    case 'explain': return { q: '', a: '', note: step.html, idea: true };
    default: return null;
  }
}
let recapOpen = true; // remembered while the page is open
function recapCard(step) {
  const r = recapOf(step);
  if (!r || !(r.q || r.note)) return null;
  const body = h('div', { class: 'recap-body' });
  if (r.q) body.append(rich(noMol(r.q), 'p', 'recap-q'));
  if (r.a) body.append(rich('<b>Answer:</b> ' + r.a, 'p', 'recap-a'));
  if (r.note) body.append(rich(r.idea ? r.note : noMol(r.note), 'div', 'recap-note'));
  const more = h('button', { type: 'button', class: 'recap-more', 'aria-expanded': 'false' }, 'Show all');
  more.addEventListener('click', () => { const on = body.classList.toggle('full'); more.textContent = on ? 'Show less' : 'Show all'; more.setAttribute('aria-expanded', String(on)); });
  body.append(more);
  requestAnimationFrame(() => { if (![...body.querySelectorAll('.recap-q, .recap-note')].some((e) => e.scrollHeight > e.clientHeight + 1)) more.hidden = true; });
  const d = h('details', { class: 'recap' }, h('summary', {}, r.idea ? 'Last step: the key idea' : 'Last step'), body);
  if (recapOpen) d.open = true;
  d.addEventListener('toggle', () => { recapOpen = d.open; });
  return d;
}

function lessonView(L, startId) {
  setDrawStyle(L.drawing || 'full');
  const steps = [...L.steps,
    { id: 'mastery', type: 'mastery', skill: 'mastery', mastery: L.mastery },
    { id: 'useit', type: 'useit', skill: 'useit', useIt: L.useIt }];
  const pr = store.getProgress(L.id);
  let idx = Math.max(0, Math.min(pr.idx || 0, steps.length - 1));
  // #lesson-NN/sK (the reaction hub's links): open at step sK as a visit. Nothing is marked done and the saved resume point does not move.
  const deepAt = startId ? steps.findIndex((s) => s.id === startId) : -1;
  const deep = deepAt >= 0;
  if (deep) idx = deepAt;
  const resumeIdx = Math.max(0, Math.min(pr.idx || 0, steps.length - 1));
  const done = new Set(pr.done);

  const crumb = h('a', { class: 'back-home', href: '#home' }, '← All lessons');
  const title = h('h1', { class: 'ltitle' }, h('span', { class: 'num' }, L.id), L.title);
  const count = h('span', { class: 'muted small', id: 'step-count' });
  const fill = h('i');
  const track = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(steps.length), 'aria-label': 'Lesson progress' }, fill, h('b', { class: 'e-dot' }));
  const host = h('div', { class: 'step', id: 'step-host' });
  const recapSlot = h('div', { class: 'recap-slot' });
  const card = h('article', { class: 'card', 'aria-live': 'off' }, recapSlot, host);
  const back = h('button', { type: 'button', class: 'btn ghost', id: 'back-btn' }, 'Back');
  const next = h('button', { type: 'button', class: 'btn primary', id: 'next-btn' }, 'Continue');
  const foot = h('div', { class: 'foot' }, back, next);

  const paint = () => {
    const n = steps.filter((s) => done.has(s.id)).length;
    fill.style.width = (n / steps.length) * 100 + '%';
    track.style.setProperty('--p', (n / steps.length) * 100 + '%');
    track.setAttribute('aria-valuenow', String(n));
    count.textContent = `Step ${idx + 1} of ${steps.length}`;
    back.disabled = idx === 0;
    const last = idx === steps.length - 1;
    next.hidden = last;
    next.disabled = !done.has(steps[idx].id);
  };
  const save = () => store.setProgress(L.id, { idx: deep ? resumeIdx : idx, done: [...done] });

  const ctxFor = (step) => ({
    lessonId: L.id,
    mistake: (skill, stepId, diagnosis) => store.logMistake({ skill, stepId, lessonId: L.id, diagnosis }),
    win: (skill) => store.logWin(skill),
    done: () => {
      done.add(step.id); save(); paint();
      if (step.type !== 'explain' && step.type !== 'useit') next.focus({ preventScroll: true });
    },
    complete: () => { store.setProgress(L.id, { complete: true, idx: steps.length - 1, done: steps.map((s) => s.id) }); location.hash = '#home'; }
  });

  const show = async () => {
    const step = steps[idx];
    save(); paint();
    if (!chemReady) { host.innerHTML = '<p class="muted">Loading chemistry engine…</p>'; try { await chemP; } catch (e) { host.innerHTML = '<p class="fb bad">The chemistry engine could not load. Reload the page to try again.</p>'; return; } }
    recapSlot.innerHTML = '';
    const prev = steps[idx - 1];
    if (prev && done.has(prev.id) && step.type !== 'useit') { const rc = recapCard(prev); if (rc) recapSlot.append(rc); }
    renderStep(step, ctxFor(step), host);
    setIupacMode(store.getIupac());
    if (!reduceMotion()) { host.classList.remove('enter'); void host.offsetWidth; host.classList.add('enter'); }
    paint();
  };
  next.addEventListener('click', () => { if (idx < steps.length - 1) { idx++; show(); card.scrollIntoView?.({ block: 'start', behavior: 'auto' }); } });
  back.addEventListener('click', () => { if (idx > 0) { idx--; show(); } });

  mount(header(), h('div', { class: 'lhead' }, crumb, title, h('div', { class: 'prow' }, track, count)), card, foot);
  show();
}

function practice(skill) {
  setDrawStyle(['skeletal-fg', 'alkane-names', 'chairs', 'alkene-names', 'mechanism-basics', 'markovnikov', 'alkene-additions-2', 'resonance', 'directors', 'stereo-relationships'].includes(generatorForSkill(skill)) ? 'skeletal' : 'full');
  const host = h('div', { class: 'step' });
  const card = h('article', { class: 'card' }, host);
  const ctx = {
    lessonId: 'practice',
    mistake: (sk, stepId, diagnosis) => store.logMistake({ skill: sk, stepId, lessonId: 'practice', diagnosis }),
    win: (sk) => store.logWin(sk),
    done: () => host.append(h('a', { class: 'btn primary', href: '#home' }, 'Back to home'))
  };
  mount(header(), h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'Practise: ' + skillLabel(skill))), card);
  chemP.then(() => { renderProblems({ count: 3, generator: generatorForSkill(skill), skill }, ctx, host); setIupacMode(store.getIupac()); });
}

// ---------------------------------------------------------------- Reaction hub
function hub() {
  setDrawStyle('skeletal');
  mount(header(), h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'Reactions'),
    h('p', { class: 'lede' }, 'One card for each reagent. Read the three facts, look at the example, then use the steps on a question.')), buildHub(chemP));
}

// ---------------------------------------------------------------- Router
function route() {
  const hash = location.hash.replace(/^#/, '');
  let m;
  if ((m = /^lesson-(\d+)(?:\/(s\d+))?$/.exec(hash))) {
    const L = LESSONS.find((l) => l.id === m[1]);
    if (L) return lessonView(L, m[2]);
  }
  if (hash === 'reactions') return hub();
  if ((m = /^practise-([a-z0-9-]+)$/.exec(hash))) return practice(m[1]);
  home();
}
window.addEventListener('hashchange', route);
route();
