// Orgo Learn: router, Home, lesson player, IUPAC toggle, weak-spot panel.
import { ready, setDrawStyle } from './engine/chem.js';
import * as store from './engine/store.js';
import { generatorForSkill } from './engine/generators.js';
import { practiceConfig } from './engine/naming-custom.js';
import { renderStep, renderProblems, h, rich, setIupacMode, closeMolTags } from './engine/steps.js';
import { skillLabel } from './engine/skills.js';
import { MODE_IDS, MODE_INFO, MODE_COUNTS, setModeCard } from './engine/generators-reaction-modes.js';
import { HUB_BY_ID } from './engine/reaction-hub.js';
import { LESSONS, PLANNED } from './lessons/index.js';
import { buildHub } from './hub-view.js';
import { buildPastpaper } from './pastpaper-view.js';
import { momentFor } from './engine/stereo-moments.js';
import { stereoBlock } from './stereo-view.js';
import * as voice from './engine/voice.js';
import { attachGlossary, glossaryView, GLOSSARY } from './engine/glossary.js';
import { recapCard as prereqCard } from './engine/recap.js';
import { FIGURES } from './figures/figures.js';
import { figureCard } from './figures/figure-card.js';

const app = document.getElementById('app');
// A press of Check with nothing entered is not a slip: it must not count as a weak spot.
const EMPTY_CHECK = /^(Draw at least|Tap (the|each|one|at least)|Mark every|Fill in every|Type your answer|Choose at least|Your two picks are right|Enter a number)/;
const logSlip = (e) => { if (!EMPTY_CHECK.test(String(e.diagnosis || '').trim())) store.logMistake(e); };
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
      h('a', { class: 'btn ghost', href: '#practise-predict-product', id: 'open-drill' }, 'Drill: predict the product'),
      h('a', { class: 'btn ghost', href: '#reactions-practice', id: 'open-reaction-modes' }, 'Reaction modes: five ways to practise'),
      h('a', { class: 'btn ghost', href: '#lesson-17', id: 'open-lesson-17' }, 'Lesson 17: Predict the product')));
  const pp = h('section', { class: 'panel', 'aria-labelledby': 'pp-h' }, h('h2', { id: 'pp-h' }, 'Past papers'),
    h('p', { class: 'muted' }, 'The midterm questions by topic: what each one asks, the steps to answer it, and where to learn it.'),
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn primary', href: '#pastpaper', id: 'open-pastpaper' }, 'Open past papers')));
  const gl = h('section', { class: 'panel', 'aria-labelledby': 'gl-h' }, h('h2', { id: 'gl-h' }, 'Glossary'),
    h('p', { class: 'muted' }, `${GLOSSARY.length} short definitions: nucleophile, sp³, resonance, R/S and more. In a lesson, tap any dotted word to see its meaning.`),
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn primary', href: '#glossary', id: 'open-glossary' }, 'Open the glossary')));
  mount(header(), hero, h('div', { class: 'cols' }, lessons, h('div', { class: 'side' }, rx, pp, gl, panel)));
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
  if (r.idea) { body.classList.add('full'); more.hidden = true; }   // the key idea of an explain step is never cut off: the next step may need a number from it
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
  let glossaryStop = null; // stops the term-button observer of the step on screen
  let figure;  // the chapter's "See the idea" figure card (built once per visit, so its open state and animation survive Back / Continue)
  const figId = Object.keys(FIGURES).find((k) => FIGURES[k].lesson === L.id);
  let prereq; // the "what you need from earlier lessons" card (built once per visit, so a toggle survives Back / Continue)
  const ctxFor = (step) => ({
    lessonId: L.id,
    mistake: (skill, stepId, diagnosis) => logSlip({ skill, stepId, lessonId: L.id, diagnosis }),
    win: (skill) => store.logWin(skill),
    done: () => {
      done.add(step.id); save(); paint();
      if (stereoNode) stereoNode.hidden = false;
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
  setDrawStyle((['skeletal-fg', 'alkane-names', 'chairs', 'alkene-names', 'mechanism-basics', 'markovnikov', 'alkene-additions-2', 'resonance', 'directors', 'stereo-relationships', 'predict-product'].includes(generatorForSkill(skill)) || MODE_IDS.includes(generatorForSkill(skill))) ? 'skeletal' : 'full');
  const host = h('div', { class: 'step' });
  const card = h('article', { class: 'card' }, host);
  const ctx = {
    lessonId: 'practice',
    mistake: (sk, stepId, diagnosis) => logSlip({ skill: sk, stepId, lessonId: 'practice', diagnosis }),
    win: (sk) => store.logWin(sk),
    done: () => host.append(h('a', { class: 'btn primary', href: '#home' }, 'Back to home'))
  };
  mount(header(), h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: MODE_IDS.includes(skill) ? '#reactions-practice' : '#home' }, MODE_IDS.includes(skill) ? '← Reaction modes' : '← Home'), h('h1', { class: 'ltitle' }, 'Practise: ' + skillLabel(skill)), cardId && HUB_BY_ID[cardId] ? h('p', { class: 'muted small', id: 'practice-card' }, 'Only this reagent: ' + HUB_BY_ID[cardId].reagent) : null), card);
  const pc = skill === 'naming-levels' ? practiceConfig() : { count: 3, timer: 0 };   // the naming drill's settings choose the count and the timer
  chemP.then(() => { renderProblems({ count: pc.count, timer: pc.timer, generator: generatorForSkill(skill), skill }, ctx, host); setIupacMode(store.getIupac()); });
}

// ---------------------------------------------------------------- Reaction hub
function hub(anchor) {
  setDrawStyle('skeletal');
  mount(header(), h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'Reactions'),
    h('p', { class: 'lede' }, 'One card for each reagent. Read the three facts, look at the example, then use the steps on a question.'),
    h('a', { class: 'btn primary', href: '#practise-predict-product', id: 'drill-predict' }, 'Drill: predict the product')), buildHub(chemP, anchor));
}

// ---------------------------------------------------------------- Reaction modes (landing page of the five practice modes)
function reactionsPractice() {
  setDrawStyle('skeletal');
  const modes = MODE_IDS.map((id) => h('a', { class: 'rm-mode', href: '#practise-' + id, id: 'rm-' + id },
    h('span', { class: 'rm-count' }, `${MODE_COUNTS[id]} problems`), h('b', {}, MODE_INFO[id].label), h('span', { class: 'muted small' }, MODE_INFO[id].blurb)));
  mount(header(), h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'Reaction modes'),
    h('p', { class: 'lede' }, 'Five ways to practise the reagent cards. Every product is worked out by the same engines as the lessons; each wrong answer tells you the fact it misses.'),
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn ghost', href: '#reactions', id: 'rm-cards' }, 'Open the reaction cards'), h('a', { class: 'btn ghost', href: '#practise-predict-product', id: 'rm-predict' }, 'Drill: predict the product'))),
    h('div', { class: 'rm-grid' }, modes));
}

// ---------------------------------------------------------------- Past papers
function pastpaper() {
  mount(header(), h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'Past papers, by topic'),
    h('p', { class: 'lede' }, 'Each midterm question from the workbook, in plain words, with the steps to answer it and a link to where you learn it.'),
    h('p', { class: 'muted small' }, 'This page covers only the sections on this midterm (A1, A2, A3, A5 HBr, B1, B2, B3, B4, B6).'),
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn primary', href: '#reactions', id: 'pp-reactions' }, 'Reactions'), h('a', { class: 'btn ghost', href: '#practise-predict-product', id: 'pp-drill' }, 'Drill'))), buildPastpaper(chemP));
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
  if (hash === 'reactions') return hub();
  if ((m = /^reactions\/([a-z0-9-]+)$/.exec(hash))) return hub(m[1]);
  if (hash === 'pastpaper') return pastpaper();
  if (hash === 'reactions-practice') return reactionsPractice();
  if ((m = /^practise-guess-reagent\/([a-z0-9-]+)$/.exec(hash))) return practice('guess-reagent', m[1]);
  if (hash === 'glossary') return glossary();
  if ((m = /^practise-([a-z0-9-]+)$/.exec(hash))) return practice(m[1]);
  home();
}
window.addEventListener('hashchange', route);
route();
