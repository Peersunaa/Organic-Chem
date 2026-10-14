// Widget: solid 3D molecule (3Dmol.js, WebGL). Falls back to the RDKit 2D depiction.
import models from '../../data/3d/models.js';
import { svg as rdSvg } from '../chem.js';

const SRC = 'https://cdn.jsdelivr.net/npm/3dmol@2.5.5/build/3Dmol-min.js';
const COLORS = { H: 0xffffff, C: 0x3a3a3a, O: 0xe02222, N: 0x2c5fe0, F: 0x4fbf5f, Cl: 0x2fa84f, Br: 0x9b4b22, S: 0xe0c020, P: 0xe08020 };
let lib = null;

export function loadLib() {
  if (lib) return lib;
  lib = new Promise((res, rej) => {
    if (window.$3Dmol) return res(window.$3Dmol);
    const s = document.createElement('script');
    s.src = SRC; s.onload = () => (window.$3Dmol ? res(window.$3Dmol) : rej(new Error('3Dmol missing'))); s.onerror = () => rej(new Error('3Dmol failed'));
    document.head.appendChild(s);
  });
  return lib;
}

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
}

export function modelAngle(molblock, center, a, b) {
  const lines = molblock.split('\n');
  const n = parseInt(lines[3].slice(0, 3), 10);
  const P = (i) => { const l = lines[4 + i]; return [parseFloat(l.slice(0, 10)), parseFloat(l.slice(10, 20)), parseFloat(l.slice(20, 30))]; };
  const c = P(center), u = P(a).map((v, i) => v - c[i]), w = P(b).map((v, i) => v - c[i]);
  const dot = u.reduce((s, v, i) => s + v * w[i], 0);
  return (Math.acos(dot / (Math.hypot(...u) * Math.hypot(...w))) * 180) / Math.PI;
}

export default {
  id: 'model3d',
  mount(host, config) {
    const ids = [config.mol].concat(config.compare ? [config.compare] : []);
    host.innerHTML = `<div class="m3"><div class="m3-views"></div>
      <div class="m3-bar"><button type="button" class="btn small" data-m="stick" aria-pressed="true">Ball and stick</button>
      <button type="button" class="btn small" data-m="sphere" aria-pressed="false">Space-filling</button>
      <span class="m3-note">Drag to rotate, pinch or scroll to zoom.</span></div></div>`;
    const views = host.querySelector('.m3-views');
    const bar = host.querySelector('.m3-bar');
    const fallback = (why) => {
      views.innerHTML = ids.map((id) => `<div class="m3-fb">${rdSvg(models[id].smiles, { width: 220, height: 160 })}</div>`).join('') + `<p class="m3-note">${why}</p>`;
      bar.hidden = true;
    };
    if (!webglOK()) { fallback('3D view is not available on this device, so this is the flat drawing.'); return { destroy() {} }; }
    const viewers = [];
    let style = config.style || 'stick';
    const apply = () => {
      viewers.forEach((v, k) => {
        const sty = style === 'sphere' ? { sphere: { scale: 1, colorscheme: { prop: 'elem', map: COLORS } } }
          : { stick: { radius: 0.13, colorscheme: { prop: 'elem', map: COLORS } }, sphere: { scale: 0.27, colorscheme: { prop: 'elem', map: COLORS } } };
        v.setStyle({}, sty);
        if (k === 0 && config.highlight) v.setStyle({ index: config.highlight }, { stick: { radius: 0.13, color: 0xf2b33d }, sphere: { scale: style === 'sphere' ? 1 : 0.32, color: 0xf2b33d } });
        v.render();
      });
      bar.querySelectorAll('[data-m]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === style)));
    };
    loadLib().then(($3Dmol) => {
      try {
        ids.forEach((id) => {
          const box = document.createElement('div');
          box.className = 'm3-view';
          views.appendChild(box);
          const v = $3Dmol.createViewer(box, { backgroundAlpha: 0, antialias: true });
          v.addModel(models[id].molblock, 'sdf');
          if (config.labels && id === config.mol) for (const [idx, text] of Object.entries(config.labels)) { const at = v.selectedAtoms({ index: Number(idx) })[0]; if (at) v.addLabel(text, { fontSize: 14, backgroundOpacity: 0.6, position: at }); }
          v.zoomTo();
          viewers.push(v);
        });
        if (viewers.length === 2 && viewers[0].linkViewer) viewers[0].linkViewer(viewers[1]);
        if (config.spin) viewers.forEach((v) => v.spin('y', 0.6));
        apply();
      } catch (e) { viewers.length = 0; fallback('3D view failed to start, so this is the flat drawing.'); }
    }).catch(() => fallback('3D view could not load, so this is the flat drawing.'));
    bar.addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) { style = b.dataset.m; apply(); } });
    return { destroy() { viewers.forEach((v) => { try { v.clear(); } catch (e) { /* ignore */ } }); } };
  }
};
