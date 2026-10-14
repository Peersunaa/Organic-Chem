// Shared molecule viewer for the 3D widgets. Same scene description, two back ends:
//   '3dmol'  solid WebGL ball-and-stick (3Dmol.js from the CDN; drag to rotate, pinch/scroll to zoom, tap an atom to pick)
//   'svg'    flat orthographic projection of the SAME 3D coordinates (drag to rotate, pinch to zoom, tap to pick),
//            used when WebGL or 3Dmol is unavailable. It is a real fallback: every widget keeps working.
//
// scene = { atoms:[{el,x,y,z}], bonds:[[i,j]], colors:{idx:'#rrggbb'}, rings:[idx], lines:[{a:[x,y,z],b:[x,y,z],dashed,color}],
//           labels:[{p:[x,y,z],text}], pickable:[idx]|true, tags:{idx:'accessible name'} }
import { loadLib } from './model3d.js';
import { toMolblock } from './geom.js';

export const CPK = { H: '#f2f5f6', C: '#3a3a3a', O: '#e02222', N: '#2c5fe0', F: '#4fbf5f', Cl: '#2fa84f', Br: '#9b4b22', S: '#e0c020', P: '#e08020' };
const SVG_R = { H: 0.30, C: 0.42, O: 0.42, N: 0.42, F: 0.38, Cl: 0.5, Br: 0.55, S: 0.5, P: 0.5 };
const NS = 'http://www.w3.org/2000/svg';

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
}
const hexNum = (s) => parseInt(String(s).replace('#', ''), 16);
const colorOf = (scene, i) => (scene.colors && scene.colors[i]) || CPK[scene.atoms[i].el] || '#888888';

function svgBackend(box, opts, state) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'v3-svg');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', opts.label || 'Molecule model, flat projection of the 3D coordinates. Drag to rotate.');
  svg.setAttribute('viewBox', '0 0 300 260');
  svg.style.touchAction = 'none';
  box.append(svg);
  const view = { yaw: 0, pitch: 0, zoom: 1 };
  let scene = null, fit = null;
  const rot = (p) => {
    const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw), cx = Math.cos(view.pitch), sx = Math.sin(view.pitch);
    const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy;
    return [x1, p[1] * cx - z1 * sx, p[1] * sx + z1 * cx];
  };
  const draw = () => {
    if (!scene) return;
    const A = scene.atoms;
    if (!fit) {
      const c = [0, 1, 2].map((k) => A.reduce((s, a) => s + [a.x, a.y, a.z][k], 0) / A.length);
      const r = Math.max(...A.map((a) => Math.hypot(a.x - c[0], a.y - c[1], a.z - c[2]))) + 0.6;
      fit = { c, k: 138 / r };
    }
    const k = fit.k * view.zoom;
    const T = (a) => { const q = rot([a.x - fit.c[0], a.y - fit.c[1], a.z - fit.c[2]]); return { x: 150 + q[0] * k, y: 130 - q[1] * k, z: q[2] }; };
    const pts = A.map(T);
    const parts = [];
    const isPick = (i) => scene.pickable === true || (scene.pickable && scene.pickable.includes(i));
    // depth-sorted bonds + atoms
    const items = [];
    (scene.rings || []).forEach((i) => items.push({ z: pts[i].z - 0.01, s: `<circle cx="${pts[i].x.toFixed(1)}" cy="${pts[i].y.toFixed(1)}" r="${(SVG_R[A[i].el] || 0.4) * k * 1.8 + 3}" class="v3-ring"/>` }));
    scene.bonds.forEach(([i, j]) => {
      const a = pts[i], b = pts[j];
      items.push({ z: (a.z + b.z) / 2 - 0.2, s: `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" class="v3-bond" style="stroke-width:${Math.max(2, 0.17 * k).toFixed(1)}"/>` });
    });
    A.forEach((a, i) => {
      const r = (SVG_R[a.el] || 0.4) * k * 0.78 * (1 + 0.07 * pts[i].z);
      const pick = isPick(i);
      const tag = (scene.tags && scene.tags[i]) || `${a.el} atom ${i + 1}`;
      items.push({ z: pts[i].z, s: `<circle cx="${pts[i].x.toFixed(1)}" cy="${pts[i].y.toFixed(1)}" r="${r.toFixed(1)}" fill="${colorOf(scene, i)}" class="v3-atom${pick ? ' pick' : ''}" data-i="${i}"${pick ? ` tabindex="0" role="button" aria-label="${tag}"` : ''}><title>${tag}</title></circle>` });
    });
    (scene.lines || []).forEach((l) => {
      const a = T({ x: l.a[0], y: l.a[1], z: l.a[2] }), b = T({ x: l.b[0], y: l.b[1], z: l.b[2] });
      items.push({ z: -99, s: `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" class="v3-line" stroke="${l.color || 'currentColor'}"${l.dashed ? ' stroke-dasharray="5 4"' : ''}/>` });
    });
    items.sort((p, q) => p.z - q.z);
    items.forEach((it) => parts.push(it.s));
    (scene.labels || []).forEach((l) => { const t = T({ x: l.p[0], y: l.p[1], z: l.p[2] }); parts.push(`<text x="${t.x.toFixed(1)}" y="${t.y.toFixed(1)}" class="v3-label">${l.text}</text>`); });
    svg.innerHTML = parts.join('');
  };
  // drag to rotate, pinch to zoom, tap to pick
  const ptrs = new Map();
  let moved = 0, pinch0 = 0, zoom0 = 1;
  svg.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (ptrs.size === 2) { const [p, q] = [...ptrs.values()]; pinch0 = Math.hypot(p.x - q.x, p.y - q.y); zoom0 = view.zoom; } try { svg.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
  svg.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) view.zoom = Math.max(0.5, Math.min(3, zoom0 * d / pinch0)); moved += 9; }
    else { moved += Math.abs(dx) + Math.abs(dy); view.yaw += dx * 0.012; view.pitch = Math.max(-1.4, Math.min(1.4, view.pitch + dy * 0.012)); }
    draw();
  });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; };
  svg.addEventListener('pointerup', (e) => {
    const wasTap = moved < 6 && ptrs.size <= 1;
    up(e);
    if (wasTap) { const t = document.elementFromPoint(e.clientX, e.clientY); const el = t && t.closest && t.closest('.v3-atom.pick'); if (el && svg.contains(el)) opts.onPick && opts.onPick(Number(el.dataset.i)); }
  });
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('pick')) { e.preventDefault(); opts.onPick && opts.onPick(Number(e.target.dataset.i)); } });
  svg.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); view.zoom = Math.max(0.5, Math.min(3, view.zoom * (e.deltaY < 0 ? 1.1 : 0.9))); draw(); } }, { passive: false });
  return {
    kind: 'svg',
    show(s) { scene = s; draw(); },
    destroy() { svg.remove(); }
  };
}

function dmolBackend(box, opts, $3Dmol) {
  const v = $3Dmol.createViewer(box, { backgroundAlpha: 0, antialias: true });
  let first = true, scene = null;
  const render = () => {
    v.removeAllModels(); v.removeAllShapes(); v.removeAllLabels();
    v.addModel(toMolblock(scene.atoms, scene.bonds), 'sdf');
    const byColor = {};
    scene.atoms.forEach((a, i) => { (byColor[colorOf(scene, i)] = byColor[colorOf(scene, i)] || []).push(i); });
    for (const [col, idx] of Object.entries(byColor)) v.setStyle({ index: idx }, { stick: { radius: 0.13, color: hexNum(col) }, sphere: { scale: 0.27, color: hexNum(col) } });
    (scene.rings || []).forEach((i) => { const a = scene.atoms[i]; v.addSphere({ center: { x: a.x, y: a.y, z: a.z }, radius: 0.62, color: 0xf2b33d, alpha: 0.38 }); });
    (scene.lines || []).forEach((l) => v.addLine({ start: { x: l.a[0], y: l.a[1], z: l.a[2] }, end: { x: l.b[0], y: l.b[1], z: l.b[2] }, color: l.color && l.color !== 'currentColor' ? l.color : '#8a9ea5', dashed: !!l.dashed, dashLength: 0.25, gapLength: 0.18 }));
    (scene.labels || []).forEach((l) => v.addLabel(l.text, { position: { x: l.p[0], y: l.p[1], z: l.p[2] }, fontSize: 13, backgroundOpacity: 0.55, inFront: true }));
    if (scene.pickable) v.setClickable(scene.pickable === true ? {} : { index: scene.pickable }, true, (atom) => { if (atom && opts.onPick) opts.onPick(atom.index); });
    if (first || opts.refit) { v.zoomTo(); first = false; }
    v.render();
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { try { v.resize(); v.render(); } catch (e) { /* ignore */ } }).observe(box);
  return {
    kind: '3dmol',
    show(s) { scene = s; render(); },
    destroy() {
      try { v.clear(); } catch (e) { /* ignore */ }
      try { const c = v.getCanvas && v.getCanvas(); const gl = c && (c.getContext('webgl2') || c.getContext('webgl')); const x = gl && gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { /* ignore */ }
    }
  };
}

// Steps replace their host without calling destroy(); release the WebGL context of any viewer whose element has left the page.
const live = new Set();
function sweep() { for (const v of [...live]) if (!v.box.isConnected) { try { v.destroy(); } catch (e) { /* ignore */ } live.delete(v); } }

/**
 * Create a viewer inside `host` (a block element; give it a height in CSS via class v3).
 * opts: { onPick(atomIndex), label, forceSvg }. Returns { show(scene), kind (after ready), ready:Promise, destroy() }.
 */
export function createView(host, opts = {}) {
  const box = document.createElement('div');
  box.className = 'v3';
  host.append(box);
  sweep();
  let backend = null, last = null, dead = false;
  const api = {
    kind: null,
    show(scene) { last = scene; if (backend) { try { backend.show(scene); } catch (e) { toSvg(); } } },
    destroy() { dead = true; if (backend) backend.destroy(); box.remove(); },
    box
  };
  live.add(api);
  const toSvg = () => {
    if (backend) { try { backend.destroy(); } catch (e) { /* ignore */ } }
    box.innerHTML = '';
    backend = svgBackend(box, opts);
    api.kind = 'svg';
    box.dataset.kind = 'svg';
    if (last) backend.show(last);
  };
  api.ready = (async () => {
    if (opts.forceSvg || !webglOK()) { toSvg(); return api; }
    box.dataset.kind = 'loading';
    try {
      const $3Dmol = await loadLib();
      if (dead) return api;
      box.innerHTML = '';
      backend = dmolBackend(box, opts, $3Dmol);
      api.kind = '3dmol'; box.dataset.kind = '3dmol';
      if (last) backend.show(last);
    } catch (e) { if (!dead) toSvg(); }
    return api;
  })();
  return api;
}
