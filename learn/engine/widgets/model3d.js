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

/**
 * Make the molecule fill about `frac` of the viewer (its bounding sphere, so it still fits after a turn). 3Dmol's own zoomTo leaves small molecules tiny:
 * water came out about 40 px wide in a 260 px box. We read the screen size of the atom centres, work out pixels per angstrom, and zoom by the missing factor.
 * `pad` = atom radius in angstroms (about 0.45 for ball and stick, about 1.5 when the atoms are drawn space-filling).
 */
export function fillView(v, box, frac = 0.7, pad = 0.45) {
  try {
    v.zoomTo();
    const A = v.selectedAtoms({});
    const W = box.clientWidth, H = box.clientHeight;
    if (!A.length || !W || !H) return;
    const pts = v.modelToScreen(A.map((a) => ({ x: a.x, y: a.y, z: a.z })));
    const rng = (arr) => Math.max(...arr) - Math.min(...arr);
    const dx = rng(A.map((a) => a.x)), dy = rng(A.map((a) => a.y));
    const px = dx >= dy ? rng(pts.map((p) => p.x)) / dx : rng(pts.map((p) => p.y)) / dy;   // pixels per angstrom in the starting view
    if (!(px > 0) || !isFinite(px)) return;
    const c = [0, 1, 2].map((k) => A.reduce((s, a) => s + [a.x, a.y, a.z][k], 0) / A.length);
    const R = Math.max(...A.map((a) => Math.hypot(a.x - c[0], a.y - c[1], a.z - c[2]))) + pad;
    const f = (frac * Math.min(W, H)) / 2 / (R * px);
    if (f > 1.02 || f < 0.98) v.zoom(Math.max(0.4, Math.min(8, f)), 0);
  } catch (e) { /* the default zoom is still a working view */ }
}

export function modelAngle(molblock, center, a, b) {
  const lines = molblock.split('\n');
  const n = parseInt(lines[3].slice(0, 3), 10);
  const P = (i) => { const l = lines[4 + i]; return [parseFloat(l.slice(0, 10)), parseFloat(l.slice(10, 20)), parseFloat(l.slice(20, 30))]; };
  const c = P(center), u = P(a).map((v, i) => v - c[i]), w = P(b).map((v, i) => v - c[i]);
  const dot = u.reduce((s, v, i) => s + v * w[i], 0);
  return (Math.acos(Math.max(-1, Math.min(1, dot / (Math.hypot(...u) * Math.hypot(...w))))) * 180) / Math.PI;
}

/**
 * Lesson 13: the pi cloud of a flat six-carbon ring, as translucent spheres above and below the ring plane (two doughnut-shaped clouds, McMurry Figure 5.1b).
 * Computed from the molblock: the first six atoms must be the ring carbons in order. Returns {center, normal, spheres:[{x,y,z,r}]}; 12 spheres per face along the ring.
 */
export function piCloud(molblock, height = 0.95, radius = 0.5) {
  const lines = molblock.split('\n');
  const P = [0, 1, 2, 3, 4, 5].map((i) => { const l = lines[4 + i]; return [parseFloat(l.slice(0, 10)), parseFloat(l.slice(10, 20)), parseFloat(l.slice(20, 30))]; });
  const c = [0, 1, 2].map((k) => P.reduce((s, p) => s + p[k], 0) / 6);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const u = sub(P[2], P[0]), w = sub(P[4], P[0]);
  const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  const len = Math.hypot(...n); const normal = n.map((v) => v / len);
  const ring = [];
  for (let i = 0; i < 6; i++) { ring.push(P[i]); ring.push(P[i].map((v, k) => (v + P[(i + 1) % 6][k]) / 2)); }
  const spheres = [];
  for (const side of [1, -1]) for (const p of ring) spheres.push({ x: p[0] + side * height * normal[0], y: p[1] + side * height * normal[1], z: p[2] + side * height * normal[2], r: radius });
  return { center: c, normal, spheres };
}

/**
 * Lesson 08: the empty p orbital of a flat carbocation, as two translucent coral blobs standing above and below the + carbon (the plane's normal), plus the unit normal
 * (pointing up the screen, +y) so a label can sit above the top blob. Computed from the molblock: `center` = the + carbon's atom index, `ref` = two of its neighbours.
 * Returns {center, normal, spheres:[{x,y,z,r}]}.
 */
export function pLobes(molblock, center, ref) {
  const lines = molblock.split('\n');
  const P = (i) => { const l = lines[4 + i]; return [parseFloat(l.slice(0, 10)), parseFloat(l.slice(10, 20)), parseFloat(l.slice(20, 30))]; };
  const c = P(center), u = P(ref[0]).map((v, k) => v - c[k]), w = P(ref[1]).map((v, k) => v - c[k]);
  let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  const len = Math.hypot(...n) || 1; n = n.map((v) => v / len);
  if (n[1] < 0) n = n.map((v) => -v);
  const spheres = [];
  for (const side of [1, -1]) [[0.85, 0.4], [1.35, 0.52], [1.85, 0.4]].forEach(([d, r]) => spheres.push({ x: c[0] + side * d * n[0], y: c[1] + side * d * n[1], z: c[2] + side * d * n[2], r }));
  return { center: c, normal: n, spheres };
}

export default {
  id: 'model3d',
  mount(host, config) {
    const ids = [config.mol].concat(config.compare ? [config.compare] : []);
    host.innerHTML = `<div class="m3"><div class="m3-views"></div>
      <div class="m3-bar"><button type="button" class="btn small" data-m="stick" aria-pressed="true">Ball and stick</button>
      <button type="button" class="btn small" data-m="sphere" aria-pressed="false">Space-filling</button>${config.pi ? '<button type="button" class="btn small" data-pi="1" aria-pressed="false">Show the π cloud</button>' : ''}
      <span class="m3-note">Drag to rotate, pinch or scroll to zoom.</span></div></div>`;
    const views = host.querySelector('.m3-views');
    const bar = host.querySelector('.m3-bar');
    const fallback = (why) => {
      if (config.pi) why += ' Above and below the flat ring sit two doughnut-shaped π clouds.';
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
    // the molecule fills about 70% of the view (space-filling atoms are fat, so they get a wider margin); linked viewers move together, so the smallest fit wins
    const refit = () => {
      const pad = style === 'sphere' ? 1.5 : 0.45;
      const boxes = [...views.querySelectorAll('.m3-view')];
      // two viewers are linked (one camera for both): fit the first and let the link carry it to the second
      (viewers.length === 2 && viewers[0].linkViewer ? viewers.slice(0, 1) : viewers).forEach((v, k) => fillView(v, boxes[k] || boxes[0], 0.7, pad));
      viewers.forEach((v) => { try { v.render(); } catch (e) { /* ignore */ } });
    };
    loadLib().then(($3Dmol) => {
      try {
        ids.forEach((id) => {
          const box = document.createElement('div');
          box.className = 'm3-view';
          views.appendChild(box);
          const v = $3Dmol.createViewer(box, { backgroundAlpha: 0, antialias: true });
          v.addModel(models[id].molblock, 'sdf');
          // labels: { atomIndex: 'text' } on the atom, or { atomIndex: { text, up } } `up` angstroms above it along the flat plane's normal (config.lobes), so an atom hidden in the middle of the model still has a readable label
          if (config.labels && id === config.mol) for (const [idx, lab] of Object.entries(config.labels)) {
            const at = v.selectedAtoms({ index: Number(idx) })[0];
            if (!at) continue;
            const text = typeof lab === 'string' ? lab : lab.text;
            let position = at;
            if (typeof lab === 'object' && lab.up && config.lobes) { const n = pLobes(models[id].molblock, config.lobes.center, config.lobes.ref).normal; position = { x: at.x + n[0] * lab.up, y: at.y + n[1] * lab.up, z: at.z + n[2] * lab.up }; }
            v.addLabel(text, { fontSize: 14, backgroundOpacity: 0.6, position });
          }
          if (config.lobes && id === config.mol) pLobes(models[id].molblock, config.lobes.center, config.lobes.ref).spheres.forEach((sp) => v.addSphere({ center: { x: sp.x, y: sp.y, z: sp.z }, radius: sp.r, color: 0xe2614a, alpha: 0.92 }));
          v.zoomTo();
          viewers.push(v);
        });
        if (viewers.length === 2 && viewers[0].linkViewer) viewers[0].linkViewer(viewers[1]);
        if (config.spin) viewers.forEach((v) => v.spin('y', 0.6));
        apply();
        refit();
      } catch (e) { viewers.length = 0; fallback('3D view failed to start, so this is the flat drawing.'); }
    }).catch(() => fallback('3D view could not load, so this is the flat drawing.'));
    // Lesson 13: config.pi shows two translucent doughnut-shaped clouds (above and below the ring) on request
    let piOn = false;
    const paintPi = () => {
      viewers.forEach((v, k) => {
        if (k !== 0) return;
        try {
          v.removeAllShapes();
          if (config.lobes) pLobes(models[config.mol].molblock, config.lobes.center, config.lobes.ref).spheres.forEach((sp) => v.addSphere({ center: { x: sp.x, y: sp.y, z: sp.z }, radius: sp.r, color: 0xe2614a, alpha: 0.92 }));
          if (piOn) piCloud(models[config.mol].molblock).spheres.forEach((sp) => v.addSphere({ center: { x: sp.x, y: sp.y, z: sp.z }, radius: sp.r, color: 0x2bb3c0, alpha: 0.32 }));
          v.render();
        } catch (e) { /* shapes are optional */ }
      });
      bar.querySelectorAll('[data-pi]').forEach((b) => b.setAttribute('aria-pressed', String(piOn)));
    };
    bar.addEventListener('click', (e) => {
      const pb = e.target.closest('[data-pi]');
      if (pb) { piOn = !piOn; paintPi(); return; }
      const b = e.target.closest('[data-m]'); if (b) { style = b.dataset.m; apply(); refit(); }
    });
    return { destroy() { viewers.forEach((v) => { try { v.clear(); } catch (e) { /* ignore */ } }); } };
  }
};
