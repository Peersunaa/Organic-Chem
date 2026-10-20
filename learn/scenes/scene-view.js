// Mechanism scenes: the interactive player (widget `mech-scene`), the #scene/<id> page, the #scenes list, and the small toggles that open a scene
// inline (reaction hub cards, lesson steps).
//
// Widget: registered in engine/widgets/index.js as 'mech-scene', config { scene: '<id or short id>', logSlips?: false }.
//   A lesson step can use it as a `visual` (or as a `try` widget: ctx.onResult({ok}) fires on the quiz answer; pass logSlips:false there, because the step grader logs the slip).
//   Standalone (hub, #scene page) a wrong quiz answer is logged as a slip under the scene's skill (scene-index.js) with the card id.
// The scene (scenes/scenes/<id>.json) and its layout (scenes/layouts/<id>.json) are fetched relative to this file and kept in memory.
//
// Controls: the timeline scrubber (a range input with a 44 px thumb and a tick at every beat), Play / Pause, Prev beat / Next beat (each plays that beat and stops at its end),
// speed 0.5x / 1x / 1.5x, the layer switch (Arrows / Orbitals / Both), a legend, the stereo callout, one end quiz and chips to the what-if scenes.
// Keys: Space play / pause, Left / Right previous / next beat, Home / End first / last beat. Touch: drag the scrubber.
// prefers-reduced-motion: nothing tweens; each beat is one still frame (its end state, arrows drawn), the scrubber steps beat by beat and Play advances a beat every few seconds.
import { h } from '../engine/steps.js';
import { cavemanOn, onVoiceChange } from '../engine/voice.js';
import { annotateLine } from '../engine/glossary.js';
import * as store from '../engine/store.js';
import { STEREO_MOMENTS } from '../engine/stereo-moments.js';
import { stereoBlock } from '../stereo-view.js';
import { renderScene, captionFor, whyLines, beatAt, sceneDuration } from './scene-engine.js';
import { SCENES, SCENE_BY_ID, sceneId, shortId, neighbours, sceneNumber } from './scene-index.js';

const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

// ------------------------------------------------------------------ loading (cached in memory)
const cache = new Map();
async function getJson(rel) {
  const r = await fetch(new URL(rel, import.meta.url));
  if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + rel);
  return r.json();
}
export function loadScene(id) {
  if (!cache.has(id)) {
    const p = Promise.all([getJson(`scenes/${id}.json`), getJson(`layouts/${id}.json`)]).then(([scene, layout]) => ({ scene, layout }));
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return cache.get(id);
}

// remembered while the page is open
let LAYER = 'both', SPEED = 1;
let uid = 0;

const LAYER_LABEL = { arrows: 'Arrows', orbitals: 'Orbitals', both: 'Both' };
const SPEEDS = [0.5, 1, 1.5];

// ------------------------------------------------------------------ the legend
function legend() {
  const sw = (svg) => h('span', { class: 'ms-sw', html: `<svg viewBox="0 0 40 24" width="40" height="24" aria-hidden="true">${svg}</svg>` });
  const row = (svg, text) => h('li', {}, sw(svg), h('span', {}, text));
  return h('details', { class: 'ms-legend' }, h('summary', {}, 'What am I looking at?'),
    h('ul', {},
      row('<circle cx="14" cy="12" r="4" fill="var(--electron)"/><circle cx="26" cy="12" r="4" fill="var(--electron)"/>', 'Amber: electrons. A pair of dots travels along each curved arrow.'),
      row('<circle cx="20" cy="12" r="9" fill="var(--accent)" fill-opacity=".14" stroke="var(--accent)" stroke-width="2.5"/>', 'Teal: the nucleophile, the electron-rich side, and − charges.'),
      row('<circle cx="20" cy="12" r="9" fill="var(--bad)" fill-opacity=".14" stroke="var(--bad)" stroke-width="2.5"/>', 'Coral: the electrophile, the electron-poor side, + charges and empty orbitals.'),
      row('<line x1="4" y1="12" x2="36" y2="12" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/><line x1="4" y1="12" x2="36" y2="12" stroke="var(--electron)" stroke-width="6" stroke-opacity=".4" stroke-linecap="round"/>', 'A new bond fades in with an amber glow. A breaking bond fades out.'),
      row('<ellipse cx="20" cy="12" rx="15" ry="8" fill="none" stroke="var(--bad)" stroke-width="2" stroke-dasharray="5 4"/>', 'A dashed p orbital is empty. A solid amber lobe holds electrons.')));
}

// ------------------------------------------------------------------ the widget
function mountScene(host, config = {}, ctx = {}) {
  const id = sceneId(config.scene);
  host.innerHTML = '';
  const root = h('div', { class: 'ms', 'data-gl-skip': '' });
  host.append(root);
  if (!id) { root.append(h('p', { class: 'fb bad' }, 'There is no such scene.')); return { destroy() {} }; }
  root.append(h('p', { class: 'muted ms-loading' }, 'Loading the scene…'));
  let dead = false, raf = 0, timer = 0, offVoice = null, mql = null, stopGloss = null;
  const inst = {
    destroy() {
      dead = true; cancelAnimationFrame(raf); clearTimeout(timer);
      if (offVoice) offVoice();
      if (mql && mql.removeEventListener) mql.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onHide);
    }
  };
  const onHide = () => { if (document.hidden) pauseFn && pauseFn(); };
  document.addEventListener('visibilitychange', onHide);
  let pauseFn = null;
  let onMotion = () => {};
  loadScene(id).then(({ scene, layout }) => { if (!dead) build(scene, layout); }).catch(() => { if (!dead) { root.innerHTML = ''; root.append(h('p', { class: 'fb bad' }, 'The scene could not load. Reload the page to try again.')); } });

  function build(scene, layout) {
    root.innerHTML = '';
    const beats = scene.beats, N = beats.length, dur = sceneDuration(scene);
    const S = { t: 0, beat: 0, playing: false, speed: SPEED, layer: LAYER, stopAt: null, last: 0, reduced: reduceMotion(), shown: -1, sig: '', why: null, reached: false };

    // ---- structure
    const stage = h('div', { class: 'ms-stage' });
    const stageWrap = h('div', { class: 'ms-stagewrap', tabindex: '0', role: 'group', 'aria-label': 'Animated mechanism. Space plays or pauses. Left and right arrows step through the beats.' }, stage);
    const count = h('p', { class: 'ms-count' });
    const cap = h('p', { class: 'ms-cap' });
    const why = h('p', { class: 'ms-why' });
    const sr = h('p', { class: 'sr-only', 'aria-live': 'polite' });
    const capBox = h('div', { class: 'ms-capbox' }, count, cap, why, sr);
    const range = h('input', { type: 'range', class: 'ms-range', 'aria-label': 'Timeline', min: '0', max: String(dur), step: '0.05', value: '0' });
    const marks = h('div', { class: 'ms-marks', 'aria-hidden': 'true' });
    // a tick at every beat: at its start time on the scrubber, or evenly spaced when the scrubber steps beat by beat
    const buildMarks = () => marks.replaceChildren(...beats.map((b, k) => { const m = h('i', {}); m.style.setProperty('--f', String(S.reduced ? (N > 1 ? k / (N - 1) : 0) : b.t0 / dur)); return m; }));
    const line = h('div', { class: 'ms-line' }, marks, range);
    const mk = (cls, label, text) => { const b = h('button', { type: 'button', class: 'btn ' + cls, 'aria-label': label }, text); return b; };
    const prevB = mk('small ghost ms-prev', 'Previous beat', '◀ Beat');
    const playB = mk('small primary ms-play', 'Play', 'Play');
    const nextB = mk('small ghost ms-next', 'Next beat', 'Beat ▶');
    const speed = h('select', { class: 'ms-speed', 'aria-label': 'Speed' }, SPEEDS.map((s) => h('option', { value: String(s) }, s + '×')));
    speed.value = String(S.speed);
    const row1 = h('div', { class: 'ms-ctl' }, prevB, playB, nextB, h('label', { class: 'ms-speedlab' }, h('span', { class: 'sr-only' }, 'Speed'), speed));
    const layerBtns = ['arrows', 'orbitals', 'both'].map((k) => { const b = h('button', { type: 'button', class: 'btn small ms-layer', 'aria-pressed': String(S.layer === k), 'data-layer': k }, LAYER_LABEL[k]); b.addEventListener('click', () => setLayer(k)); return b; });
    const layerRow = h('div', { class: 'ms-layers', role: 'group', 'aria-label': 'Layers' }, h('span', { class: 'ms-layers-k' }, 'Show'), layerBtns);
    root.append(stageWrap, capBox, line, row1, layerRow, legend());

    // stereo callout
    if (scene.stereoCallout) {
      const sc = scene.stereoCallout;
      const moment = sc.stereoMoment ? STEREO_MOMENTS.find((m) => m.id === sc.stereoMoment) : null;
      root.append(h('aside', { class: 'ms-stereo' }, h('h3', {}, 'Stereochemistry'), h('p', { class: 'ms-stereo-t' }, sc.title), h('p', {}, sc.text.replace(/\s*Ghost option for the implementer[^"]*"[^"]*"[^.]*\./, '')), moment ? stereoBlock(moment) : null));
    }
    // quiz
    const quiz = buildQuiz(scene, id, config, ctx);
    quiz.hidden = true;
    root.append(quiz);
    // what-if chips
    if (scene.whatIf && scene.whatIf.length) {
      const chips = h('div', { class: 'ms-chips' }, scene.whatIf.map((w) => h('a', { class: 'btn small ghost ms-chip', href: '#scene/' + shortId(w) }, (SCENE_BY_ID[w] || { title: w }).title)));
      root.append(h('div', { class: 'ms-whatif' }, h('p', { class: 'ms-whatif-q' }, 'What if it were a different reagent?'), chips));
    }

    // ---- painting
    const sceneOpts = () => ({ layer: S.layer, caveman: cavemanOn() });
    function curT() { return S.reduced ? beats[S.beat].t0 : S.t; }
    function paint() {
      const t = curT();
      const { i, p } = beatAt(scene, t);
      S.beat = i;
      stage.innerHTML = renderScene(scene, layout, t, { ...sceneOpts(), static: S.reduced });
      // caption: changes only when the beat (or layer / voice) changes
      const o = sceneOpts();
      const capText = captionFor(scene, i, o);
      const sig = i + '|' + capText;
      if (sig !== S.sig) {
        S.sig = sig;
        if (stopGloss) { stopGloss(); stopGloss = null; }
        cap.textContent = capText;
        cap.classList.remove('is-in'); void cap.offsetWidth; if (!S.reduced) cap.classList.add('is-in');
        stopGloss = annotateLine(cap);
        count.textContent = `Beat ${i + 1} of ${N}`;
        sr.textContent = `Beat ${i + 1} of ${N}. ${capText}`;
        S.why = null;
      }
      // why line: the latest arrow that has started (all of them in reduced motion)
      const lines = whyLines(scene, i, p, { static: S.reduced, caveman: cavemanOn() });
      const wtext = S.reduced ? lines.join(' ') : lines.length ? lines[lines.length - 1] : '';
      if (wtext !== S.why) { S.why = wtext; why.textContent = wtext; }
      // timeline
      if (S.reduced) { range.max = String(N - 1); range.step = '1'; range.value = String(i); } else { range.max = String(dur); range.step = '0.05'; range.value = String(t); }
      const frac = S.reduced ? (N > 1 ? i / (N - 1) : 0) : t / dur;
      range.style.setProperty('--ff', frac.toFixed(4));
      range.setAttribute('aria-valuetext', `Beat ${i + 1} of ${N}, ${Math.round(t)} s: ${capText}`);
      prevB.disabled = S.reduced ? i === 0 : t <= 0.01;
      nextB.disabled = i >= N - 1 && (S.reduced || t >= beats[N - 1].t1 - 0.01);
      playB.textContent = S.playing ? 'Pause' : (S.reduced ? (i >= N - 1 ? 'Replay' : 'Play') : (t >= dur - 0.01 ? 'Replay' : 'Play'));
      playB.setAttribute('aria-label', playB.textContent);
      // the quiz shows once the last beat has begun
      if (!S.reached && i >= N - 1 && (S.reduced || t >= beats[N - 1].t0)) { S.reached = true; quiz.hidden = false; }
    }

    // ---- playback
    function stopTimers() { cancelAnimationFrame(raf); clearTimeout(timer); }
    function pause() { S.playing = false; stopTimers(); paint(); }
    pauseFn = pause;
    function tick(ts) {
      if (!S.playing || dead) return;
      if (!root.isConnected) { inst.destroy(); return; }
      const dt = Math.min(0.3, (ts - S.last) / 1000);
      S.last = ts;
      const limit = S.stopAt != null ? S.stopAt : dur;
      S.t = Math.min(limit, S.t + dt * S.speed);
      if (S.t >= limit - 1e-6) { S.t = limit; S.stopAt = null; S.playing = false; paint(); return; }
      paint();
      raf = requestAnimationFrame(tick);
    }
    function playMotion() {
      stopTimers();
      S.playing = true; S.last = performance.now();
      raf = requestAnimationFrame(tick);
      paint();
    }
    function stepTimer() {
      // reduced motion: one still frame per beat, advancing by itself every few seconds
      clearTimeout(timer);
      if (!S.playing) return;
      timer = setTimeout(() => {
        if (!S.playing) return;
        if (S.beat >= N - 1) { S.playing = false; paint(); return; }
        S.beat++; paint(); stepTimer();
      }, Math.max(3500, (beats[S.beat].t1 - beats[S.beat].t0 + beats[S.beat].hold) * 700 / S.speed));
    }
    function play() {
      if (S.reduced) {
        if (S.beat >= N - 1) S.beat = 0;
        S.playing = true; paint(); stepTimer(); return;
      }
      if (S.t >= dur - 0.01) S.t = 0;
      S.stopAt = null;
      playMotion();
    }
    function toggle() { S.playing ? pause() : play(); }
    /** Jump to beat j and play it, stopping at its end (a still frame in reduced motion). */
    function goBeat(j) {
      j = Math.max(0, Math.min(N - 1, j));
      stopTimers(); S.playing = false;
      if (S.reduced) { S.beat = j; paint(); return; }
      S.t = beats[j].t0; S.stopAt = beats[j].t1;
      playMotion();
    }
    function prevBeat() {
      const { i, p } = beatAt(scene, S.reduced ? beats[S.beat].t0 : S.t);
      if (S.reduced) return goBeat(i - 1);
      goBeat(S.t - beats[i].t0 > 0.5 ? i : i - 1);
    }
    function nextBeat() { const { i } = beatAt(scene, S.reduced ? beats[S.beat].t0 : S.t); goBeat(i + 1 > N - 1 ? N - 1 : (S.t >= beats[i].t0 && S.t < beats[i].t1 - 0.01 && !S.reduced && !S.playing ? i : i + 1)); }
    function setLayer(k) {
      S.layer = LAYER = k;
      layerBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layer === k)));
      S.sig = '';
      paint();
    }

    // ---- events
    playB.addEventListener('click', toggle);
    prevB.addEventListener('click', prevBeat);
    nextB.addEventListener('click', nextBeat);
    speed.addEventListener('change', () => { S.speed = SPEED = Number(speed.value); if (S.reduced && S.playing) stepTimer(); });
    range.addEventListener('input', () => {
      stopTimers(); S.playing = false; S.stopAt = null;
      if (S.reduced) { S.beat = Math.round(Number(range.value)); } else S.t = Number(range.value);
      paint();
    });
    range.addEventListener('keydown', (e) => {
      // keyboard on the scrubber snaps to beat starts
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); const { i } = beatAt(scene, curT()); stopTimers(); S.playing = false; S.stopAt = null; if (S.reduced) S.beat = Math.max(0, i - 1); else S.t = beats[Math.max(0, S.t - beats[i].t0 > 0.05 ? i : i - 1)].t0; paint(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); const { i } = beatAt(scene, curT()); stopTimers(); S.playing = false; S.stopAt = null; if (S.reduced) S.beat = Math.min(N - 1, i + 1); else S.t = beats[Math.min(N - 1, i + 1)].t0; paint(); }
      if (e.key === 'Home') { e.preventDefault(); stopTimers(); S.playing = false; S.beat = 0; S.t = 0; paint(); }
      if (e.key === 'End') { e.preventDefault(); stopTimers(); S.playing = false; S.beat = N - 1; S.t = beats[N - 1].t1; paint(); }
    });
    root.addEventListener('keydown', (e) => {
      const tag = e.target && e.target.tagName;
      if (e.key === ' ' && !(tag === 'BUTTON' || tag === 'SUMMARY' || tag === 'A' || tag === 'SELECT' || tag === 'TEXTAREA' || (tag === 'INPUT' && e.target.type !== 'range'))) { e.preventDefault(); toggle(); return; }
      if (e.target === stageWrap) {
        if (e.key === 'ArrowRight') { e.preventDefault(); nextBeat(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); prevBeat(); } else if (e.key === 'Home') { e.preventDefault(); goBeat(0); } else if (e.key === 'End') { e.preventDefault(); goBeat(N - 1); }
      }
    });
    // glossary taps inside the caption (the lessons' own handler does the same job; this stops the double toggle)
    root.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.gl-term');
      const pops = () => root.querySelectorAll('.gl-term[aria-expanded="true"]');
      if (btn) {
        e.stopPropagation();
        const pop = document.getElementById(btn.getAttribute('aria-controls'));
        const open = btn.getAttribute('aria-expanded') !== 'true';
        pops().forEach((b) => { const pp = document.getElementById(b.getAttribute('aria-controls')); if (pp) pp.hidden = true; b.setAttribute('aria-expanded', 'false'); });
        if (pop) { pop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); }
      }
    });
    offVoice = onVoiceChange(() => { if (!root.isConnected) return; S.sig = ''; paint(); });
    onMotion = () => { const r = reduceMotion(); if (r === S.reduced) return; stopTimers(); S.playing = false; S.reduced = r; if (!r) S.t = beats[S.beat].t0; buildMarks(); paint(); };
    mql = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { return null; } })();
    if (mql && mql.addEventListener) mql.addEventListener('change', onMotion);
    buildMarks();
    paint();
  }
  return inst;
}

// ------------------------------------------------------------------ the end quiz
function buildQuiz(scene, id, config, ctx) {
  const q = scene.quiz;
  const entry = SCENE_BY_ID[id] || {};
  // shuffle once per mount so the right answer is not always first
  const opts = q.options.map((o) => o).sort(() => Math.random() - 0.5);
  const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
  let solved = false, told = false;
  const list = h('div', { class: 'opts', role: 'group', 'aria-label': 'Answers' });
  const btns = opts.map((o) => {
    const b = h('button', { type: 'button', class: 'opt ms-opt' }, o.text);
    b.addEventListener('click', () => {
      if (solved) return;
      if (o.correct) {
        solved = true;
        b.classList.add('good');
        btns.forEach((x) => { x.disabled = true; });
        fb.className = 'fb ok'; fb.textContent = o.why;
        if (!told && ctx && typeof ctx.onResult === 'function') { told = true; ctx.onResult({ ok: true }); }
      } else {
        b.classList.add('bad'); b.disabled = true;
        fb.className = 'fb bad'; fb.textContent = o.why;
        if (config.logSlips !== false) { try { store.logMistake({ skill: entry.skill || 'mechanism', stepId: 'scene-' + shortId(id), lessonId: 'scenes', diagnosis: o.why, card: scene.reagentCard }); } catch (e) { /* storage blocked: the slip is just not kept */ } }
        if (ctx && typeof ctx.onResult === 'function') ctx.onResult({ ok: false, diagnosis: o.why });
      }
    });
    return b;
  });
  btns.forEach((b) => list.append(b));
  return h('section', { class: 'ms-quiz', 'aria-label': 'Check yourself' }, h('h3', {}, 'Check yourself'), h('p', { class: 'ms-quiz-q' }, q.q), list, fb);
}

// ------------------------------------------------------------------ inline toggles (hub cards, lesson steps)
/** A button that opens the scene right under it (in `panel`, which the caller places) and closes it again. */
export function sceneToggle(id, { label = 'Watch the scene', cls = 'btn small ghost ms-open' } = {}) {
  const sid = sceneId(id);
  const panelId = 'ms-panel-' + sid + '-' + ++uid;
  const button = h('button', { type: 'button', class: cls, 'aria-expanded': 'false', 'aria-controls': panelId }, label);
  const panel = h('div', { class: 'ms-panel', id: panelId, hidden: 'hidden' });
  let live = null;
  const close = () => { if (live) { live.destroy(); live = null; } panel.innerHTML = ''; panel.hidden = true; button.setAttribute('aria-expanded', 'false'); button.textContent = label; };
  const open = () => {
    panel.hidden = false;
    live = mountScene(panel, { scene: sid }, {});
    button.setAttribute('aria-expanded', 'true'); button.textContent = 'Hide the scene';
  };
  button.addEventListener('click', () => (panel.hidden ? open() : close()));
  return { button, panel, close };
}
/** "Watch the scene" under a lesson step: the same block shape as the 3D button (stereoBlock), so the two sit side by side. */
export function sceneBlock(id) {
  const { button, panel } = sceneToggle(id, { label: 'Watch the scene' });
  return h('div', { class: 'ms-watch', 'data-scene': sceneId(id) }, button, panel);
}

// ------------------------------------------------------------------ pages
/** #scene/<id>: the whole scene, wide, with Prev / Next scene. Returns the nodes app.js mounts under the header. */
export function scenePage(any) {
  const id = sceneId(any);
  if (!id) return [h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#scenes' }, '← How each reagent works'), h('h1', { class: 'ltitle' }, 'No such scene')), h('p', { class: 'muted' }, 'Pick one from the list.')];
  const entry = SCENE_BY_ID[id], nb = neighbours(id);
  const link = (sid, dir) => (sid ? h('a', { class: 'btn ghost ms-nav-' + dir, href: '#scene/' + shortId(sid) }, dir === 'prev' ? '← ' + SCENE_BY_ID[sid].title : SCENE_BY_ID[sid].title + ' →') : h('span', {}));
  const body = h('article', { class: 'card ms-page' });
  const lede = h('p', { class: 'lede ms-lede' });
  loadScene(id).then(({ scene }) => { lede.textContent = scene.intent.replace(/^After this scene the learner can say:\s*/, '').replace(/^"|"$/g, ''); }).catch(() => {});
  mountScene(body, { scene: id }, {});
  const cardLink = entry.cards.length ? h('a', { class: 'btn small ghost', href: '#reactions/' + entry.cards[0] }, 'See the reaction card') : null;
  const lessonLink = entry.lesson.length ? h('a', { class: 'btn small ghost', href: `#lesson-${entry.lesson[0].id}/${entry.lesson[0].step}` }, `Lesson ${Number(entry.lesson[0].id)}, step ${Number(entry.lesson[0].step.slice(1))}`) : null;
  return [
    h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#scenes' }, '← How each reagent works'), h('h1', { class: 'ltitle' }, h('span', { class: 'num' }, String(sceneNumber(id)).padStart(2, '0')), entry.title), h('p', { class: 'muted small' }, 'Reagent: ' + entry.reagent), lede, h('div', { class: 'rx-btns' }, cardLink, lessonLink)),
    body,
    h('nav', { class: 'ms-nav', 'aria-label': 'Scenes' }, link(nb.prev, 'prev'), link(nb.next, 'next'))
  ];
}

/** #scenes: 16 tiles, each with the engine's own first frame as its thumbnail. */
export function scenesList() {
  const grid = h('div', { class: 'ms-grid' });
  SCENES.forEach((s) => {
    const thumb = h('div', { class: 'ms-thumb', 'aria-hidden': 'true' });
    const tile = h('a', { class: 'ms-tile', href: '#scene/' + shortId(s.id), 'data-scene': s.id }, thumb, h('span', { class: 'ms-tile-n' }, String(sceneNumber(s.id)).padStart(2, '0')), h('b', { class: 'ms-tile-t' }, s.title), h('span', { class: 'muted small' }, s.reagent));
    grid.append(tile);
    loadScene(s.id).then(({ scene, layout }) => { thumb.innerHTML = renderScene(scene, layout, 0, { static: true, layer: 'both', thumb: true }); }).catch(() => {});
  });
  return [
    h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'How each reagent works'),
      h('p', { class: 'lede' }, 'Sixteen short animations, one per reagent. Scrub the timeline, switch the electron-pushing arrows and the orbitals on or off, and answer one question at the end.'),
      h('div', { class: 'rx-btns' }, h('a', { class: 'btn ghost', href: '#reactions' }, 'Open the reaction cards'))),
    grid
  ];
}

export default { id: 'mech-scene', mount: mountScene };
