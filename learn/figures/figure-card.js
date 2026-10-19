// "See the idea" card: one crafted chapter figure (figures/figures.js) as a collapsible <details>.
// The SVG is fetched by its relative path and inlined (so the app's CSS variables reach it); if the fetch fails the card
// shows the figure's title and hint as text. Open/closed is remembered in the store (store.getUi / setUi, key "fig:<key>").
import * as store from '../engine/store.js';
import { FIGURES } from './figures.js';

const cache = new Map();   // file -> Promise<string>
/** Fetch (once per page) the SVG text of a figure file; rejects on any failure or a non-SVG answer. */
export function loadSvg(file) {
  if (!cache.has(file)) {
    const p = fetch(file).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then((t) => { if (!/^\s*<svg\b/.test(t)) throw new Error('not an svg'); return t; });
    p.catch(() => cache.delete(file));
    cache.set(file, p);
  }
  return cache.get(file);
}

/** figureCard('ch4', { key: 'lesson-09', open: true }) -> <details class="fig-card"> (or null for an unknown id).
 *  `open` is the default state for a visitor who has not chosen yet; the visitor's choice wins and is stored. */
export function figureCard(id, { key = id, open = false } = {}) {
  const f = FIGURES[id];
  if (!f) return null;
  const storeKey = 'fig:' + key;
  let want = open;
  try { const v = store.getUi(storeKey); if (typeof v === 'boolean') want = v; else if (open) store.setUi(storeKey, true); } catch (e) { /* storage blocked */ }
  const body = document.createElement('div');
  body.className = 'fig-body';
  const frame = document.createElement('div');
  frame.className = 'fig-frame';
  frame.setAttribute('data-figure', id);
  body.append(frame);
  const sum = document.createElement('summary');
  sum.textContent = 'See the idea';
  const d = document.createElement('details');
  d.className = 'fig-card';
  d.setAttribute('data-figure', id);
  d.append(sum, body);
  let started = false;
  const start = () => {
    if (started) return; started = true;
    frame.classList.add('is-loading');
    loadSvg(f.file).then((svg) => { frame.classList.remove('is-loading'); frame.innerHTML = svg; })
      .catch(() => {
        frame.classList.remove('is-loading'); frame.classList.add('is-text');
        const t = document.createElement('p'); t.className = 'fig-fallback';
        const b = document.createElement('b'); b.textContent = f.title;
        t.append(b, ' ' + f.hint);
        frame.replaceChildren(t);
      });
  };
  d.addEventListener('toggle', () => {
    try { store.setUi(storeKey, d.open); } catch (e) { /* ignore */ }
    if (d.open) start();
  });
  if (want) { d.open = true; start(); }
  return d;
}
