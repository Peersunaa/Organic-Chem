// Shared helpers for the Lesson 15 solid-3D widgets (mirror-pair, rs-assigner).
// The camera never moves: the widget keeps its own rotation matrix for each molecule and re-shows the rotated coordinates, so "toward the viewer"
// is simply +z, on both back ends (3Dmol and the flat SVG fallback of view3d.js). A transparent overlay catches mouse and touch drags (and the
// arrow keys) and turns the molecule; it replaces the back end's own dragging, which keeps the two back ends identical.
import { I3, matMul, matVec, rotX, rotY, centroid } from '../chirality.js';

export const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

/** A molecule with its own orientation. atoms: [{el,x,y,z}] in model coordinates. */
export class Pose {
  constructor(atoms) {
    this.base = atoms;
    this.c = centroid(atoms.map((a) => [a.x, a.y, a.z]));
    this.rot = I3;
  }
  /** Atoms in view coordinates (centred, rotated). */
  atoms(rot = this.rot) {
    return this.base.map((a) => { const p = matVec(rot, [a.x - this.c[0], a.y - this.c[1], a.z - this.c[2]]); return { ...a, x: p[0], y: p[1], z: p[2] }; });
  }
  turn(dx, dy) { this.rot = matMul(rotX(dy), matMul(rotY(dx), this.rot)); }
  reset() { this.rot = I3; }
}

/** Overlay that turns a Pose by dragging (mouse, touch, pen) or the arrow keys. `onTurn()` is called after every change. */
export function attachSpin(box, pose, onTurn, label) {
  const ov = document.createElement('div');
  ov.className = 'spin-overlay';
  ov.tabIndex = 0;
  ov.setAttribute('role', 'group');
  ov.setAttribute('aria-label', label || 'Molecule model. Drag to turn it, or use the arrow keys.');
  box.append(ov);
  let last = null;
  ov.addEventListener('pointerdown', (e) => { last = { x: e.clientX, y: e.clientY }; try { ov.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } ov.classList.add('grab'); });
  ov.addEventListener('pointermove', (e) => {
    if (!last) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    pose.turn(dx * 0.012, dy * 0.012);
    onTurn();
  });
  const end = () => { last = null; ov.classList.remove('grab'); };
  ov.addEventListener('pointerup', end); ov.addEventListener('pointercancel', end);
  ov.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-0.18, 0], ArrowRight: [0.18, 0], ArrowUp: [0, -0.18], ArrowDown: [0, 0.18] }[e.key];
    if (!k) return;
    e.preventDefault(); pose.turn(k[0], k[1]); onTurn();
  });
  return ov;
}

/** Animate `fn(t)` for t from 0 to 1 over `ms` (instantly under reduced motion). */
export function animate(ms, fn, done) {
  if (reduceMotion()) { fn(1); done && done(); return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    fn(e);
    if (k < 1) requestAnimationFrame(step); else done && done();
  };
  requestAnimationFrame(step);
}

/** Bonds of a parsed molblock as [i,j] pairs plus orders. */
export const bondPairs = (bonds) => bonds.map((b) => [b[0], b[1]]);

/** A polyline arc (view coordinates) sweeping through p1, p2, p3 (2D points) around their centroid, going `dir` ('cw'|'ccw', y up). Returns {pts:[[x,y]...], tip:{at:[x,y], dir:[dx,dy]}}. */
export function arcThrough(p1, p2, p3, dir, steps = 28) {
  const c = [(p1[0] + p2[0] + p3[0]) / 3, (p1[1] + p2[1] + p3[1]) / 3];
  const ang = (p) => Math.atan2(p[1] - c[1], p[0] - c[0]);
  const rad = (p) => Math.hypot(p[0] - c[0], p[1] - c[1]);
  const s = dir === 'ccw' ? 1 : -1;
  const TAU = 2 * Math.PI;
  const mod = (x) => ((x % TAU) + TAU) % TAU;
  const d2 = mod((ang(p2) - ang(p1)) * s), d3 = mod((ang(p3) - ang(p1)) * s);
  const r = [rad(p1), rad(p2), rad(p3)];
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = ang(p1) + s * t * d3;
    const u = t * d3;
    const rr = u <= d2 ? r[0] + (r[1] - r[0]) * (d2 ? u / d2 : 1) : r[1] + (r[2] - r[1]) * ((d3 - d2) ? (u - d2) / (d3 - d2) : 1);
    pts.push([c[0] + rr * Math.cos(a), c[1] + rr * Math.sin(a)]);
  }
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  return { pts, centre: c, tip: { at: b, dir: [b[0] - a[0], b[1] - a[1]] } };
}
