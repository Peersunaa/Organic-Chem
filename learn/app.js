// Orgo Learn: router, Home, lesson player, IUPAC toggle, weak-spot panel.
import { ready, setDrawStyle } from './engine/chem.js';
import * as store from './engine/store.js';
import { generatorForSkill } from './engine/generators.js';
import { practiceConfig } from './engine/naming-custom.js';
import { renderStep, renderProblems, h, rich, setIupacMode, closeMolTags } from './engine/steps.js';
import { skillLabel } from './engine/skills.js';
import { MODE_IDS, MODE_INFO, setModeCard } from './engine/generators-reaction-modes.js';
import * as RX from './engine/reactions-custom.js';
import { reactionSettingsCard } from './reactions-settings-view.js';
import { HUB_BY_ID } from './engine/reaction-hub.js';
import { LESSONS, PLANNED } from './lessons/index.js';
import { buildHub } from './hub-view.js';
import { buildPastpaper } from './pastpaper-view.js';
import { mockView } from './mock-view.js';
import { momentFor } from './engine/stereo-moments.js';
import { stereoBlock } from './stereo-view.js';
import * as voice from './engine/voice.js';
import { attachGlossary, glossaryView, GLOSSARY } from './engine/glossary.js';
import { recapCard as prereqCard } from './engine/recap.js';
import { FIGURES } from './figures/figures.js';
import { figureCard } from './figures/figure-card.js';
import { scenePage, scenesList, sceneBlock } from './scenes/scene-view.js';
import { sceneForStep } from './scenes/scene-index.js';
import { builderPage } from './builder-view.js';
import { tablesPage } from './tables-view.js';
import { masterPage, overallText } from './master-view.js';
import { progress as masteryProgress } from './engine/master.js';
import { TYPE_BY_ID, typesForLesson } from './data/question-types.js';

const app = document.getElementById('app');
const logSlip = store.logSlip;   // a press of Check with nothing entered is not a slip (store.EMPTY_CHECK)
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
  // Caveman: short, plain wording on the reaction cards, the player's why lines and the drill feedback (engine/voice.js; the views repaint themselves)
  const cav = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(voice.cavemanOn()), id: 'caveman-switch', title: 'Short, plain wording on reaction cards, mechanism notes and drill feedback' });
  const paintCav = () => { cav.setAttribute('aria-checked', String(voice.cavemanOn())); cav.innerHTML = '<span class="sw-track"><span class="sw-knob"></span></span><span class="sw-label">Caveman</span>'; };
  paintCav();
  cav.addEventListener('click', () => voice.setCaveman(!voice.cavemanOn()));
  const offVoice = voice.onVoiceChange(() => { if (!cav.isConnected) { offVoice(); return; } paintCav(); });
  const brand = h('a', { class: 'brand', href: '#home', 'aria-label': 'Orgo Learn home' });
  brand.innerHTML = ORBIT + '<span>Orgo Learn</span>';
  return h('header', { class: 'top' }, brand, extra || null, h('a', { class: 'btn small ghost hdr-gloss', href: '#glossary', id: 'hdr-glossary' }, 'Glossary'), h('div', { class: 'switches' }, sw, cav));
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

/** "Last slip" link back to the lesson step where the mistake happened (a loose explanation without its question would only confuse). */
function whereLink(w) {
  const l = w.last && LESSONS.find((x) => x.id === w.last.lessonId);
  const st = l && l.steps.find((x) => x.id === w.last.stepId);
  return st ? h('a', { class: 'ws-last small', href: `#lesson-${l.id}/${st.id}` }, `Last slip: Lesson ${Number(l.id)}, step ${Number(st.id.slice(1))}`) : null;
}

/** Home's "Mastery course" panel: the question-type ladder with the overall count. */
function masterHome() {
  const P = masteryProgress();
  return h('section', { class: 'panel', 'aria-labelledby': 'ms-home-h' }, h('h2', { id: 'ms-home-h' }, 'Mastery course'),
    h('p', { class: 'muted' }, 'Every question type on the midterm: recognise it, the procedure, what earns the marks, three worked examples, then practise to five in a row.'),
    h('p', { class: 'small ms-home-n', id: 'ms-home-n' }, overallText(P)),
    h('span', { class: 'ms-bar', role: 'img', 'aria-label': `${P.pct}% of the question types mastered` }, h('i', { style: `width:${P.pct}%` })),
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn primary', href: '#master', id: 'open-master' }, 'Open the mastery course')));
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
        h('div', { class: 'ws-main' }, h('b', {}, skillLabel(w.skill)), h('span', { class: 'muted small' }, `${w.count} recent slip${w.count === 1 ? '' : 's'}`), whereLink(w)),
        h('a', { class: 'btn small', href: '#practise-' + w.skill }, 'Practise this'));
      list.append(li);
    });
    panel.append(list);
  }
  panel.append(h('p', { class: 'small ws-drill' }, h('a', { class: 'btn small ghost', href: '#practise-predict-product', id: 'ws-drill-predict' }, 'Drill: predict the product'), h('span', { class: 'muted' }, ' Mixed reactions, all from the reaction cards.')));
  panel.append(h('p', { class: 'small ws-drill' }, h('a', { class: 'btn small ghost', href: '#practise-naming-levels', id: 'ws-drill-naming' }, 'Drill: naming by level'), h('span', { class: 'muted' }, ' Five level presets, from alkanes to stereo names, plus a tricky set, or build your own mix of settings.')));
  panel.append(h('p', { class: 'small ws-drill' }, h('a', { class: 'btn small ghost', href: '#practise-stereo-projections', id: 'ws-drill-projections' }, 'Drill: stereo across projections'), h('span', { class: 'muted' }, ' Fischer, Newman, wedge and named drawings: the same compound or not?')));

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
    ul.append(h('li', {}, h('a', { class: 'lesson' + (l.id === L.id ? ' is-current' : ''), href: '#lesson-' + l.id },
      h('span', { class: 'num' }, l.id),
      h('span', { class: 'ltxt' }, h('b', {}, l.title), h('span', { class: 'muted small' }, `${l.sections && l.sections.length ? `Chapter ${l.chapter} · ${l.sections.length > 1 && l.sections[0] !== l.sections[l.sections.length - 1] ? `sections ${l.sections[0]}–${l.sections[l.sections.length - 1]}` : `section ${l.sections[0]}`}` : 'Review · all reactions'} · ${l.minutes} min`),
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
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn primary', href: '#reactions', id: 'open-reactions' }, 'Open the reaction cards'),
      h('a', { class: 'btn ghost', href: '#scenes', id: 'open-scenes' }, 'Watch how each reagent works'),
      h('a', { class: 'btn ghost', href: '#practise-predict-product', id: 'open-drill' }, 'Drill: predict the product'),
      h('a', { class: 'btn ghost', href: '#reactions-practice', id: 'open-reaction-modes' }, 'Reaction modes: five ways to practise'),
      h('a', { class: 'btn ghost', href: '#lesson-17', id: 'open-lesson-17' }, 'Lesson 17: Predict the product')));
  const pp = h('section', { class: 'panel', 'aria-labelledby': 'pp-h' }, h('h2', { id: 'pp-h' }, 'Past papers'),
    h('p', { class: 'muted' }, 'The midterm questions by topic: what each one asks, the steps to answer it, and where to learn it.'),
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn primary', href: '#pastpaper', id: 'open-pastpaper' }, 'Open past papers')));
  const mk = store.getMock(), mkOpen = mk.current && mk.current.status === 'open';
  const mkLeft = mkOpen ? Math.max(0, Math.round((mk.current.startedAt + mk.current.minutes * 60000 - Date.now()) / 60000)) : 0;
  const mockPanel = h('section', { class: 'panel', 'aria-labelledby': 'mock-h' }, h('h2', { id: 'mock-h' }, 'Mock midterm'),
    h('p', { class: 'muted' }, mkOpen ? `A paper is in progress, about ${mkLeft} min left on the clock.` : 'A timed paper in the midterm’s own mix of sections, fresh molecules every time, marked at the end with the fact you missed and where to learn it.'),
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn primary', href: '#mock', id: 'open-mock' }, mkOpen ? 'Resume the paper' : 'Open the mock midterm'),
      !mkOpen && mk.last ? h('a', { class: 'btn ghost', href: '#mock/script', id: 'open-mock-script' }, 'My last marked script') : null));
  const gl = h('section', { class: 'panel', 'aria-labelledby': 'gl-h' }, h('h2', { id: 'gl-h' }, 'Glossary'),
    h('p', { class: 'muted' }, `${GLOSSARY.length} short definitions: nucleophile, sp³, resonance, R/S and more. In a lesson, tap any dotted word to see its meaning.`),
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn primary', href: '#glossary', id: 'open-glossary' }, 'Open the glossary')));
  // the reaction builder: any substrate tile + any reagent tile -> the products, the professor's rule, the mechanism; chain the product into the next step
  const bld = h('section', { class: 'panel', 'aria-labelledby': 'bld-home-h' }, h('h2', { id: 'bld-home-h' }, 'Reaction builder'),
    h('p', { class: 'muted' }, 'Pick a starting material and a reagent, see what forms and why (the professor’s ring rules included), then use the product for the next step.'),
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn primary', href: '#build', id: 'open-builder' }, 'Open the reaction builder'), h('a', { class: 'btn ghost', href: '#table', id: 'open-tables' }, 'Reaction tables')));
  mount(header(), hero, h('div', { class: 'cols' }, lessons, h('div', { class: 'side' }, masterHome(), bld, rx, pp, mockPanel, gl, panel)));
  const op = document.getElementById('open-practice');
  if (op) op.addEventListener('click', () => { const t = panel.querySelector('summary') || panel; panel.scrollIntoView?.({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' }); t.focus?.({ preventScroll: true }); });
}

// ---------------------------------------------------------------- Lesson player
// "Last step" recap: after Continue, the learner sees the question they just answered,
// its answer and the one-line reason, so the next step builds on something visible.
const noMol = (s) => String(s || '').replace(/<mol\b[^>]*?(?:label="([^"]*)")?[^>]*>\s*<\/mol>/g, (m, l) => (l ? ' ' + l : '')).replace(/<\/?p>/g, ' ').trim();
const MINUS = (v) => (typeof v === 'number' && v < 0 ? '−' + -v : String(v));
function recapOf(step) {
  // a step may word its own recap (a "what you learned" line): its stem or text can name controls that are not on the next screen (novice re-test 3, finding 1)
  if (step.recap) return { q: step.recap.q || '', a: step.recap.a || '', note: step.recap.note || '', idea: !!step.recap.idea };
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
  if (r.note) body.append(rich(r.idea ? r.note : noMol(r.note), 'div', 'recap-note' + (r.idea ? ' idea' : '')));   // an explain step's idea keeps its paragraphs, lists and drawings as blocks
  const more = h('button', { type: 'button', class: 'recap-more', 'aria-expanded': 'false' }, 'Show all');
  more.addEventListener('click', () => { const on = body.classList.toggle('full'); more.textContent = on ? 'Show less' : 'Show all'; more.setAttribute('aria-expanded', String(on)); });
  body.append(more);
  // the key idea of an explain step shows in full up to about eight lines; a longer one (the four reaction kinds with eight drawings) is cut there with "Show all",
  // so the next question is never pushed below the fold (novice re-test 2026-10-20, #4)
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

  let stereoNode = null;   // the "See it in 3D" block of the current step (Piece 4), if it has one
  let sceneNode = null;    // the "Watch the scene" block of the current step (scenes/), if its mechanism has an animated scene
  let glossaryStop = null; // stops the term-button observer of the step on screen
  let figure;  // the chapter's "See the idea" figure card (built once per visit, so its open state and animation survive Back / Continue)
  const figId = Object.keys(FIGURES).find((k) => FIGURES[k].lesson === L.id);
  let prereq; // the "what you need from earlier lessons" card (built once per visit, so a toggle survives Back / Continue)
  const ctxFor = (step) => ({
    lessonId: L.id,
    passed: done.has(step.id),   // the step was finished before (mastery says so instead of looking like lost progress)
    mistake: (skill, stepId, diagnosis) => logSlip({ skill, stepId, lessonId: L.id, diagnosis }),
    win: (skill) => store.logWin(skill),
    done: () => {
      done.add(step.id); save(); paint();
      if (stereoNode) stereoNode.hidden = false;
      if (sceneNode) sceneNode.hidden = false;
      if (step.type !== 'explain' && step.type !== 'useit') next.focus({ preventScroll: true });
    },
    complete: () => { store.setProgress(L.id, { complete: true, idx: steps.length - 1, done: steps.map((s) => s.id) }); location.hash = '#home'; }
  });

  const show = async () => {
    const step = steps[idx];
    save(); paint();
    if (!chemReady) {
      // the question text needs no chemistry: show it at once, and say the pictures are on their way
      const words = (t) => { const d = document.createElement('div'); d.innerHTML = closeMolTags(String(t || '')); d.querySelectorAll('mol, molpair, svg, figure').forEach((x) => x.remove()); d.querySelectorAll('name').forEach((n) => n.replaceWith(n.getAttribute('new') || '')); return d.textContent.replace(/\s+/g, ' ').trim(); };
      const quick = words(step.prompt || step.problem || step.html);
      host.innerHTML = '';
      if (quick) host.append(h('h2', { class: 'prompt' }, quick));
      host.append(h('p', { class: 'muted' }, 'Loading chemistry engine… the pictures appear in a moment.'));
      try { await chemP; } catch (e) { host.innerHTML = '<p class="fb bad">The chemistry engine could not load. Reload the page to try again.</p>'; return; } }
    recapSlot.innerHTML = '';
    if (glossaryStop) { glossaryStop(); glossaryStop = null; }
    if (idx === 0) { if (prereq === undefined) prereq = prereqCard(L.id); if (prereq) recapSlot.append(prereq); }
    // the chapter figure sits above the step named by FIGURES[..].beforeStep (default: step 1), so it never shows words the learner has not met yet
    if (figId && step.id === (FIGURES[figId].beforeStep || steps[0].id)) { if (figure === undefined) figure = figureCard(figId, { key: 'lesson-' + L.id, open: true }); if (figure) recapSlot.append(figure); }
    const prev = steps[idx - 1];
    if (prev && done.has(prev.id) && step.type !== 'useit') { const rc = recapCard(prev); if (rc) recapSlot.append(rc); }
    stereoNode = null;
    renderStep(step, ctxFor(step), host);
    glossaryStop = attachGlossary(host);   // first use of each glossary term in the step becomes a tap-for-meaning button
    // Piece 4: where the 3D shape decides the answer, a "See it in 3D" button under the step. A question that asks for the answer stays unspoiled until it is answered.
    const moment = momentFor(L.id, step.id);
    if (moment) { stereoNode = stereoBlock(moment); stereoNode.hidden = !(step.type === 'try' || done.has(step.id)); host.append(stereoNode); }
    // the animated scene for the same mechanism: "Watch the scene" beside the 3D button, unspoiled in the same way
    sceneNode = null;
    const sceneKey = sceneForStep(L.id, step.id);
    if (sceneKey) {
      sceneNode = sceneBlock(sceneKey); sceneNode.hidden = !(step.type === 'try' || done.has(step.id));
      if (stereoNode) { const row = h('div', { class: 'extras' }); stereoNode.replaceWith(row); row.append(stereoNode, sceneNode); } else host.append(sceneNode);
    }
    if (step.type === 'useit') {   // the question types this lesson teaches, as links into the mastery course
      const mt = typesForLesson(L.id);
      if (mt.length) host.append(h('div', { class: 'ms-lesson-links' }, h('p', { class: 'small muted' }, 'Master this question type:'), h('div', { class: 'ms-links' }, mt.map((t) => h('a', { class: 'btn small ghost', href: '#master/' + t.id }, t.title)))));
    }
    if ((L.id === '13' || L.id === '14') && step.type === 'useit') host.append(h('p', { class: 'small bld-lesson-link' }, h('a', { class: 'btn small ghost', href: '#build', id: 'bld-lesson-link' }, 'Try any ring + reagent in the reaction builder'), h('span', { class: 'muted' }, ' The professor’s rules for two groups, ipso removal and blocking groups.')));
    setIupacMode(store.getIupac());
    if (!reduceMotion()) { host.classList.remove('enter'); void host.offsetWidth; host.classList.add('enter'); }
    paint();
  };
  next.addEventListener('click', () => { if (idx < steps.length - 1) { idx++; show(); card.scrollIntoView?.({ block: 'start', behavior: 'auto' }); } });
  back.addEventListener('click', () => { if (idx > 0) { idx--; show(); } });

  mount(header(), h('div', { class: 'lhead' }, crumb, title, h('div', { class: 'prow' }, track, count)), card, foot);
  show();
}

function practice(skill, cardId = null) {
  if (MODE_IDS.includes(skill)) setModeCard(cardId && HUB_BY_ID[cardId] ? cardId : null);
  const rxPage = RX.PRACTICE_MODES.includes(skill) || skill === RX.MIX_ID;   // a reaction practice page: it has the settings card (except the one limited to a hub card)
  const rxLimited = rxPage && !!(cardId && HUB_BY_ID[cardId] && skill === 'guess-reagent');
  if (rxPage && !rxLimited) RX.beginReactionSession(); else RX.endReactionSession();
  setDrawStyle((['halides', 'skeletal-fg', 'alkane-names', 'chairs', 'alkene-names', 'mechanism-basics', 'markovnikov', 'alkene-additions-2', 'resonance', 'directors', 'stereo-relationships', 'predict-product'].includes(generatorForSkill(skill)) || generatorForSkill(skill) === 'huckel' || MODE_IDS.includes(generatorForSkill(skill)) || rxPage) ? 'skeletal' : 'full');
  const host = h('div', { class: 'step' });
  const card = h('article', { class: 'card' }, host);
  const ctx = {
    lessonId: 'practice',
    mistake: (sk, stepId, diagnosis, card) => logSlip({ skill: sk, stepId, lessonId: 'practice', diagnosis, card }),
    win: (sk, card) => store.logWin(sk, card),
    done: () => host.append(h('a', { class: 'btn primary', href: rxPage ? '#reactions-practice' : '#home' }, rxPage ? 'Back to reaction modes' : 'Back to home'))
  };
  const again = () => window.dispatchEvent(new Event('hashchange'));   // Start: this page again, with the settings now in force
  const toMix = () => { if (location.hash === '#practise-' + RX.MIX_ID) again(); else location.hash = '#practise-' + RX.MIX_ID; };
  const rxCard = rxPage && !rxLimited ? reactionSettingsCard({ where: skill === RX.MIX_ID ? 'mix' : 'practice', playId: skill, onStart: again, onStartMix: toMix }) : null;
  const title = skill === RX.MIX_ID ? 'Mixed reaction session' : skillLabel(skill);
  mount(header(), h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: rxPage ? '#reactions-practice' : '#home' }, rxPage ? '← Reaction modes' : '← Home'), h('h1', { class: 'ltitle' }, 'Practise: ' + title), cardId && HUB_BY_ID[cardId] ? h('p', { class: 'muted small', id: 'practice-card' }, 'Only this reagent: ' + HUB_BY_ID[cardId].reagent) : null, rxLimited ? h('p', { class: 'muted small' }, h('a', { href: '#practise-guess-reagent' }, 'Practise every reagent, with the settings')) : null), rxCard, card);
  const pc = skill === 'naming-levels' ? practiceConfig() : rxPage && !rxLimited ? RX.practiceConfig() : { count: 3, timer: 0 };   // the naming drill's and the reaction pages' settings choose the count and the timer
  chemP.then(() => { renderProblems({ count: pc.count, endless: pc.endless, timer: pc.timer, generator: generatorForSkill(skill), skill }, ctx, host); setIupacMode(store.getIupac()); });
}

// ---------------------------------------------------------------- Reaction hub
function hub(anchor) {
  setDrawStyle('skeletal');
  mount(header(), h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'Reactions'),
    h('p', { class: 'lede' }, 'One card for each reagent. Read the three facts, look at the example, then use the steps on a question.'),
    h('a', { class: 'btn primary', href: '#practise-predict-product', id: 'drill-predict' }, 'Drill: predict the product')), hubWithBuilder(buildHub(chemP, anchor)));
}
/** The hub's sticky jump bar also links to the reaction builder. */
function hubWithBuilder(node) {
  const row = node.querySelector('.hub-jumprow');
  if (row) row.append(h('a', { class: 'btn small ghost hub-builder', href: '#build', id: 'hub-builder' }, 'Builder'));
  return node;
}

// ---------------------------------------------------------------- Reaction builder (#build)
function buildView() {
  setDrawStyle('skeletal');
  mount(header(), ...builderPage(chemP));
}

// ---------------------------------------------------------------- Reaction tables (#table)
function tablesView() {
  setDrawStyle('skeletal');
  mount(header(), ...tablesPage(chemP));
}

// ---------------------------------------------------------------- Mechanism scenes (scenes/): the list and one scene
function scenesView() {
  setDrawStyle('skeletal');
  mount(header(), ...scenesList());
}
function sceneView(id) {
  setDrawStyle('skeletal');
  mount(header(), ...scenePage(id));
}

// ---------------------------------------------------------------- Reaction modes (landing page of the six practice modes, with their settings)
function reactionsPractice() {
  setDrawStyle('skeletal');
  const info = (id) => MODE_INFO[id] || { label: RX.PRACTICE_LABEL[id], blurb: RX.PRACTICE_BLURB[id] };
  const counts = RX.reactionCounts();
  const countText = (n) => (n ? `${n.toLocaleString('en')} problem${n === 1 ? '' : 's'}` : 'None for these settings');
  const modes = RX.PRACTICE_MODES.map((id) => h('a', { class: 'rm-mode' + (counts[id] ? '' : ' rm-zero'), href: '#practise-' + id, id: 'rm-' + id, 'data-mode': id },
    h('span', { class: 'rm-count', 'aria-live': 'polite' }, countText(counts[id])), h('b', {}, info(id).label), h('span', { class: 'muted small' }, info(id).blurb)));
  const refresh = (S) => { const c = RX.reactionCounts(S); modes.forEach((a) => { const n = c[a.dataset.mode]; a.classList.toggle('rm-zero', !n); a.firstChild.textContent = countText(n); }); };
  const card = reactionSettingsCard({ where: 'landing', playId: RX.MIX_ID, onChange: refresh, onStartMix: () => { location.hash = '#practise-' + RX.MIX_ID; } });
  mount(header(), h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'Reaction modes'),
    h('p', { class: 'lede' }, 'Six ways to practise the reagent cards. Every product is worked out by the same engines as the lessons; each wrong answer tells you the fact it misses.'),
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn ghost', href: '#reactions', id: 'rm-cards' }, 'Open the reaction cards'), h('a', { class: 'btn ghost', href: '#practise-predict-product', id: 'rm-predict' }, 'Drill: predict the product'))),
    card, h('div', { class: 'rm-grid' }, modes));
}

// ---------------------------------------------------------------- Question-type mastery course (#master, #master/<typeId>: master-view.js)
function masterView(typeId) {
  const t = typeId && TYPE_BY_ID[typeId];
  setDrawStyle(t && t.group === 'bonding' ? 'full' : 'skeletal');
  mount(header(), ...masterPage(chemP, typeId));
}

// ---------------------------------------------------------------- Past papers
function pastpaper() {
  mount(header(), h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'Past papers, by topic'),
    h('p', { class: 'lede' }, 'Each midterm question from the workbook, in plain words, with the steps to answer it and a link to where you learn it.'),
    h('p', { class: 'muted small' }, 'This page covers only the sections on this midterm (A1, A2, A3, A5 HBr, B1, B2, B3, B4, B6).'),
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn primary', href: '#reactions', id: 'pp-reactions' }, 'Reactions'), h('a', { class: 'btn ghost', href: '#practise-predict-product', id: 'pp-drill' }, 'Drill'), h('a', { class: 'btn ghost', href: '#mock', id: 'pp-mock' }, 'Mock midterm'))), buildPastpaper(chemP));
}

// ---------------------------------------------------------------- Mock midterm (start screen, sitting, marked script: mock-view.js)
function mock(which) {
  const env = { mount, header, chemP, setDrawStyle, rerun: (w) => mockView(w, env) };
  mockView(which, env);
}

// ---------------------------------------------------------------- Glossary
function glossary() {
  mount(header(), h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'Glossary'),
    h('p', { class: 'lede' }, 'Every term the lessons use, in one plain sentence. Inside a lesson, tap a dotted word to see the same definition without leaving the step.')), glossaryView());
}

// ---------------------------------------------------------------- Router
function route() {
  const hash = location.hash.replace(/^#/, '');
  let m;
  if ((m = /^lesson-(\d+)(?:\/(s\d+))?$/.exec(hash))) {
    const L = LESSONS.find((l) => l.id === m[1]);
    if (L) return lessonView(L, m[2]);
  }
  if (hash === 'scenes') return scenesView();
  if ((m = /^scene\/([a-z0-9-]+)$/.exec(hash))) return sceneView(m[1]);
  if (hash === 'reactions') return hub();
  if (hash === 'build') return buildView();
  if (hash === 'table') return tablesView();
  if ((m = /^reactions\/([a-z0-9-]+)$/.exec(hash))) return hub(m[1]);
  if ((m = /^master(?:\/([a-z0-9-]+))?$/.exec(hash))) return masterView(m[1]);
  if (hash === 'pastpaper') return pastpaper();
  if ((m = /^mock(?:\/(script))?$/.exec(hash))) return mock(m[1] ? 'script' : 'main');
  if (hash === 'reactions-practice') return reactionsPractice();
  if ((m = /^practise-guess-reagent\/([a-z0-9-]+)$/.exec(hash))) return practice('guess-reagent', m[1]);
  if (hash === 'glossary') return glossary();
  if ((m = /^practise-([a-z0-9-]+)$/.exec(hash))) return practice(m[1]);
  home();
}
window.addEventListener('hashchange', route);
route();
