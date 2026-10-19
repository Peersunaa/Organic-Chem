// Piece 4 (3D stereo toggle): the "See it in 3D" button under a lesson step that has a moment in engine/stereo-moments.js.
// It opens the existing model3d viewer inline (toggle open / closed): one viewer, or two side by side (stacked on phones) when the moment has a contrast.
// model3d already handles reduced motion and the flat-drawing fallback when WebGL is missing.
import { h } from './engine/steps.js';
import model3d from './engine/widgets/model3d.js';
import { viewerSpecs } from './engine/stereo-moments.js';

let uid = 0;
export function stereoBlock(moment) {
  const id = 'st3-' + moment.id + '-' + ++uid;
  const btn = h('button', { type: 'button', class: 'btn small ghost st3-btn', 'aria-expanded': 'false', 'aria-controls': id }, 'See it in 3D');
  const panel = h('div', { class: 'st3-panel', id, hidden: 'hidden' });
  let live = [];
  const close = () => { live.forEach((v) => { try { v.destroy(); } catch (e) { /* ignore */ } }); live = []; panel.innerHTML = ''; panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'See it in 3D'; };
  const open = () => {
    panel.innerHTML = '';
    panel.hidden = false;   // visible BEFORE the viewers start: 3Dmol sizes its canvas from the box it is created in
    panel.append(h('p', { class: 'st3-title' }, moment.title));
    const grid = h('div', { class: 'st3-grid' });
    panel.append(grid);
    viewerSpecs(moment).forEach((s) => {
      const box = h('div', { class: 'widget st3-view' });
      grid.append(h('figure', { class: 'st3-fig' }, box, h('figcaption', { class: 'st3-cap' }, s.caption)));
      live.push(model3d.mount(box, { mol: s.model }, { onResult() {} }));
    });
    btn.setAttribute('aria-expanded', 'true'); btn.textContent = 'Hide the 3D view';
  };
  btn.addEventListener('click', () => (panel.hidden ? open() : close()));
  return h('div', { class: 'st3', 'data-moment': moment.id }, btn, panel);
}
