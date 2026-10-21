// The morph component on the pages (learn/morph/morph.js draws; this file places it):
//   morphGroup(key, {labels, autoplay, title})   the builder's result panel (and the table's side panel, which shares it) and the hub cards: one live morph per
//                                                major product (ortho and para side by side), a Replay button and a Slow / Normal speed switch (kept in storage)
//   hubPlay(key)                                 "Play the change" under a hub card's worked example: opens a morphGroup and plays it
//   playInto(span, key, productSmiles, {onEnd})  a table cell: the product drawing in `span` becomes the morph, plays once, then the drawing comes back
// Every piece loads morphs.json on first use, and shows nothing (keeps the plain drawings) for a pair with no morph.
import { h } from '../engine/steps.js';
import { loadMorphs, viewOf, morph, frameSvg, staticPair, reduceMotion } from './morph.js';

const KEY = 'orgo.morph.v1';
export const SPEEDS = { normal: 1600, slow: 2900 };
const getSpeed = () => { try { return (JSON.parse(localStorage.getItem(KEY) || '{}') || {}).speed === 'slow' ? 'slow' : 'normal'; } catch (e) { return 'normal'; } };
const setSpeed = (s) => { try { localStorage.setItem(KEY, JSON.stringify({ speed: s })); } catch (e) { /* storage blocked: the choice lasts this page only */ } };

/** The entry for a key, or null (data missing or pair not covered). */
export async function entryFor(key) {
  const d = await loadMorphs();
  return d && d[key] ? d[key] : null;
}

/**
 * morphGroup(key, {labels: {smiles: label}, autoplay = true, title}) -> a <figure> that fills itself when the data arrives (removed when there is no morph).
 * .destroy() stops every animation (the builder calls it through its widgets list).
 */
export function morphGroup(key, opts = {}) {
  const fig = h('figure', { class: 'mo-group', 'data-morph': key, 'aria-label': 'The change, animated: the starting material turns into the product' });
  const players = [];
  let speed = getSpeed();
  const reduced = reduceMotion();
  fig.destroy = () => { players.forEach((p) => p.destroy()); players.length = 0; };
  entryFor(key).then((e) => {
    if (!e) { fig.remove(); return; }
    const list = [e, ...(e.alt || [])].map((x) => viewOf(e, x.prod.smiles)).filter(Boolean);
    const grid = h('div', { class: 'mo-grid' + (list.length > 1 ? ' is-many' : '') });
    const hosts = list.map((v) => {
      const host = h('div', { class: 'mo-host' + (reduced ? ' is-still' : '') });
      const lab = opts.labels && opts.labels[v.prod.smiles];
      grid.append(h('div', { class: 'mo-cell' }, host, lab ? h('span', { class: 'mo-lab small muted' }, lab) : null));
      return [host, v];
    });
    const replay = h('button', { type: 'button', class: 'btn small mo-replay', 'data-morph-replay': '' }, '↻ Replay');
    const slow = h('button', { type: 'button', class: 'btn small ghost mo-speed', 'aria-pressed': String(speed === 'slow') }, 'Slow');
    const cap = h('figcaption', { class: 'mo-cap' }, h('span', { class: 'hub-label' }, opts.title || 'The change'), h('span', { class: 'mo-btns' }, replay, reduced ? null : slow));
    fig.append(cap, grid);
    // hosts must be in the page before they are measured: start on the next frame
    requestAnimationFrame(() => {
      hosts.forEach(([host, v]) => players.push(morph(host, v, { duration: SPEEDS[speed], autoplay: opts.autoplay !== false, reduced })));
    });
    replay.addEventListener('click', () => players.forEach((p) => p.play()));
    slow.addEventListener('click', () => {
      speed = speed === 'slow' ? 'normal' : 'slow';
      setSpeed(speed);
      slow.setAttribute('aria-pressed', String(speed === 'slow'));
      players.forEach((p) => { p.setDuration(SPEEDS[speed]); p.play(); });
    });
    fig.play = () => players.forEach((p) => p.play());
  });
  return fig;
}

/** "Play the change" under a hub card's worked example: the button opens the morph below it and plays; pressing it again replays. */
export function hubPlay(key) {
  const box = h('div', { class: 'mo-hub' });
  const btn = h('button', { type: 'button', class: 'btn small ghost mo-hubbtn', 'aria-expanded': 'false', 'data-morph-play': key }, '▶ Play the change');
  let grp = null;
  btn.addEventListener('click', () => {
    if (grp && grp.isConnected) { if (grp.play) grp.play(); return; }
    grp = morphGroup(key, { title: 'The change' });
    box.append(grp);
    btn.setAttribute('aria-expanded', 'true');
    btn.textContent = '↻ Play the change again';
  });
  box.append(btn);
  return box;
}

/**
 * playInto(span, key, productSmiles, {onEnd, duration}) -> Promise<boolean> (false when there is no morph for this product: nothing changed).
 * The span's drawing becomes the morph, plays once (no chip: the column head names the reagent), then the original drawing is put back.
 * Reduced motion: the product with its changed bonds glowing, for two seconds.
 */
export async function playInto(span, key, productSmiles, opts = {}) {
  const e = await entryFor(key);
  const v = e && viewOf(e, productSmiles);
  if (!v || span.dataset.morphing) return false;
  const keep = span.innerHTML;
  span.dataset.morphing = '1';
  span.classList.add('is-morphing');
  const done = () => { span.innerHTML = keep; delete span.dataset.morphing; span.classList.remove('is-morphing'); if (opts.onEnd) opts.onEnd(); };
  if (reduceMotion()) {
    span.innerHTML = frameSvg(v, 1, { px: span.getBoundingClientRect().width || 80, highlight: true, still: true });
    setTimeout(done, 2000);
    return true;
  }
  morph(span, v, { duration: opts.duration || 1500, chip: false, onEnd: () => setTimeout(done, 350) });
  return true;
}
export { staticPair };
