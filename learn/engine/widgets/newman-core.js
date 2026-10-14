// Pure model for the newman-rotator widget: rotate the real RDKit-embedded coordinates about the C-C bond.
// Nothing is hand-drawn: the dihedral, the Newman angles and the energy are all derived from the rotated coordinates.
import { parseMol, P, neighbours, sub, add, mul, dot, cross, unit, len, dihedral, rotateAbout, mod360, RAD } from './geom.js';

/** Three-fold torsional energy (kJ/mol): E = (Emax/2)(1 + cos 3θ). Ethane Emax = 12 (3 x 4.0 H-H eclipsing), bromoethane 15.0. */
export const energy = (theta, emax = 12) => (emax / 2) * (1 + Math.cos(3 * theta * RAD));
export const EMAX = { ethane: 12, bromoethane: 15 };

/**
 * cfg: { front, back, refFront, refBack, emax } - atom indices in the molblock. The back carbon and every atom
 * reached from it without passing the front carbon rotate; the front carbon and its groups stay still.
 */
export function setup(molblock, cfg) {
  const m = parseMol(molblock);
  const n = m.atoms.length;
  const nb = neighbours(m.bonds, n);
  const rot = new Set([cfg.back]);
  const stack = [cfg.back];
  while (stack.length) { const a = stack.pop(); for (const j of nb[a]) if (j !== cfg.front && !rot.has(j)) { rot.add(j); stack.push(j); } }
  rot.delete(cfg.back); // the back carbon sits on the axis and does not move
  const base = m.atoms.map(P);
  const axis = unit(sub(base[cfg.back], base[cfg.front]));
  // orient: C-C along +x (front carbon at the left), the reference front substituent up (+y): a side view of the molecule
  const up0 = sub(base[cfg.refFront], base[cfg.front]);
  const ey = unit(sub(up0, mul(axis, dot(up0, axis))));
  const ez = cross(axis, ey);
  const mid = mul(add(base[cfg.front], base[cfg.back]), 0.5);
  const oriented = base.map((p) => { const d = sub(p, mid); return [dot(d, axis), dot(d, ey), dot(d, ez)]; });
  const model = { n, bonds: m.bonds, els: m.atoms.map((a) => a.el), nb, rot, cfg, base: oriented, axis: [1, 0, 0] };
  model.theta0 = dihedralOf(model, oriented);
  // which way does the dihedral grow when the back group is turned +1 degree about +x?
  model.sign = mod360(dihedralOf(model, pose(model, 1, true)) - model.theta0) < 180 ? 1 : -1;
  return model;
}

function dihedralOf(model, pts) {
  const c = model.cfg;
  return mod360(dihedral(pts[c.refFront], pts[c.front], pts[c.back], pts[c.refBack]));
}
/** Coordinates after turning the back group by `deg` about the C-C axis (raw rotation angle). */
export function pose(model, deg, raw = false) {
  const c = model.cfg;
  const o = model.base[c.back];
  return model.base.map((p, i) => (model.rot.has(i) ? rotateAbout(p, o, model.axis, raw ? deg : model.sign * (deg - model.theta0)) : p));
}
/** Coordinates for a requested reference dihedral θ (degrees) between refFront-front-back-refBack. */
export function poseAt(model, theta) { return pose(model, mod360(theta)); }
export function thetaOf(model, pts) { return dihedralOf(model, pts); }

/**
 * Newman projection angles, viewing from the front carbon along the C-C bond: screen angle (degrees, counter-clockwise
 * from "right", y up) of every substituent, derived from the projected 3D coordinates. The reference front substituent is at 90 deg.
 * Returns { front:[{i,ang}], back:[{i,ang}] }.
 */
export function newman(model, pts) {
  const c = model.cfg;
  const a = unit(sub(pts[c.back], pts[c.front]));
  const proj = (i, from) => { const d = sub(pts[i], pts[from]); return sub(d, mul(a, dot(d, a))); };
  const up = unit(proj(c.refFront, c.front));
  const right = cross(a, up); // viewing along +a with up on screen up: right = a x up
  const ang = (v) => mod360(Math.atan2(dot(v, up), dot(v, right)) / RAD);
  const pick = (carbon, other) => model.nb[carbon].filter((j) => j !== other).map((j) => ({ i: j, ang: ang(proj(j, carbon)) }));
  return { front: pick(c.front, c.back), back: pick(c.back, c.front) };
}

/** Grade a "lock" press: kind 'min' (staggered) or 'max' (eclipsed). tol in degrees about the exact angle. */
export function lockGrade(theta, kind, emax = 12, tol = 6) {
  const t = mod360(theta);
  const offStag = Math.min(...[60, 180, 300].map((s) => Math.abs(t - s)));
  const offEcl = Math.min(...[0, 120, 240, 360].map((s) => Math.abs(t - s)));
  const E = energy(t, emax);
  if (kind === 'min') {
    if (offStag <= tol) return { ok: true, diagnosis: '' };
    if (offEcl <= tol) return { ok: false, diagnosis: `That is the opposite extreme: at ${Math.round(t)}° each rear C–H sits directly behind a front C–H (eclipsed, as crowded as it gets). The most comfortable arrangement has every rear bond halfway between two front bonds.` };
    return { ok: false, diagnosis: `Close but not there: at ${Math.round(t)}° the rear bonds are still ${Math.round(offStag)}° away from the gaps between the front bonds (${E.toFixed(1)} kJ/mol). Keep turning until each rear C–H bisects the gap between two front C–H bonds.` };
  }
  if (offEcl <= tol) return { ok: true, diagnosis: '' };
  if (offStag <= tol) return { ok: false, diagnosis: `That is the opposite extreme: at ${Math.round(t)}° the rear C–H bonds are as far from the front ones as they can get (staggered, the comfortable arrangement). The most crowded one has each rear bond hidden directly behind a front bond.` };
  return { ok: false, diagnosis: `Not quite: at ${Math.round(t)}° the rear bonds are still ${Math.round(offEcl)}° from lining up behind the front bonds (${E.toFixed(1)} kJ/mol). Turn until each rear C–H is hidden exactly behind a front C–H.` };
}
