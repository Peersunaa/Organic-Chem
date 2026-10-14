// Pure model for the chair-flip widget: measure the real RDKit/MMFF chair coordinates (data/3d/chairs.js).
// Axial/equatorial roles, faces (up/down), cis/trans, 1,3-diaxial partners and the ring-flip interpolation are all
// computed from coordinates; nothing about which atom is axial is typed in.
import chairs from '../../data/3d/chairs.js';
import { parseMol, P, neighbours, sub, add, mul, dot, unit, len, mean, angleDeg, vecAngle } from './geom.js';

export const CHAIRS = chairs;

const cache = new Map();
/** Parsed pair for a model id: { id, entry, n, bonds, els, nb, ring, A:[xyz], B:[xyz] }. */
export function load(id) {
  if (cache.has(id)) return cache.get(id);
  const e = chairs[id];
  if (!e) throw new Error('unknown chair model ' + id);
  const o = fromEntry(e, id);
  cache.set(id, o);
  return o;
}
/** Same, for any { a, b (molblocks, same atom order), ring } entry (the tests build fresh chairs with tools/chairs.py). */
export function fromEntry(e, id = 'entry') {
  const a = parseMol(e.a), b = parseMol(e.b);
  return { id, entry: e, n: a.atoms.length, bonds: a.bonds, els: a.atoms.map((x) => x.el), nb: neighbours(a.bonds, a.atoms.length), ring: e.ring, A: a.atoms.map(P), B: b.atoms.map(P) };
}
export const coords = (m, which) => (which === 'b' ? m.B : m.A);

/** Unit ring axis for a set of coordinates: mean of alternate ring carbons minus mean of the others (the C3 axis of a chair). */
export function ringAxis(pts, ring) {
  return unit(sub(mean([ring[0], ring[2], ring[4]].map((i) => pts[i])), mean([ring[1], ring[3], ring[5]].map((i) => pts[i]))));
}
export const ringCentre = (pts, ring) => mean(ring.map((i) => pts[i]));

/** The six ring C-C-C angles (degrees) of a conformer. */
export function ringAngles(pts, ring) { return ring.map((_, k) => angleDeg(pts[ring[(k + 5) % 6]], pts[ring[k]], pts[ring[(k + 1) % 6]])); }

/**
 * Every non-ring neighbour of a ring carbon (H and substituents) with its role.
 * On each ring carbon the bond closer to the ring axis is axial, the other equatorial.
 * Returns [{ atom, carbon, pos (0-5 position in the ring order), role:'a'|'e', angle (deg between the bond and the ring axis, 0..90), face:+1|-1 }]
 */
export function substituents(m, pts, axis) {
  const ax = axis || ringAxis(pts, m.ring);
  const out = [];
  m.ring.forEach((c, pos) => {
    const subs = m.nb[c].filter((j) => !m.ring.includes(j));
    const rows = subs.map((s) => {
      const v = sub(pts[s], pts[c]);
      return { atom: s, carbon: c, pos, angle: Math.min(vecAngle(v, ax), 180 - vecAngle(v, ax)), face: Math.sign(dot(v, ax)) };
    });
    const k = rows.reduce((b, r, i) => (r.angle < rows[b].angle ? i : b), 0);
    rows.forEach((r, i) => { r.role = i === k ? 'a' : 'e'; out.push(r); });
  });
  return out;
}
/** One fixed axis (the one of conformer a) so that 'face' means the same thing in both chairs: up stays up through a ring flip. */
export const refAxis = (m) => ringAxis(m.A, m.ring);
export function roleMap(m, which) { const r = {}; substituents(m, coords(m, which), refAxis(m)).forEach((s) => { r[s.atom] = s; }); return r; }

/** Heavy (non-H) substituents on the ring, in ring order, with roles in conformer `which`. */
export function heavySubs(m, which) { return substituents(m, coords(m, which), refAxis(m)).filter((s) => m.els[s.atom] !== 'H'); }

/** 'cis' if the two heavy ring substituents lie on the same face of the ring (sign of the bond along the ring axis), 'trans' otherwise. */
export function cisTrans(m, which = 'a') {
  const h = heavySubs(m, which);
  if (h.length !== 2) return null;
  return h[0].face === h[1].face ? 'cis' : 'trans';
}

/** Pattern string of the two heavy substituents in a conformer, e.g. 'ee', 'aa', 'ae' (ring order). */
export function pattern(m, which) { return heavySubs(m, which).map((s) => s.role).join(''); }

/** True if some chair (a or b) puts every heavy substituent equatorial, measured from the coordinates. */
export function canBothEquatorial(m) { return ['a', 'b'].some((w) => heavySubs(m, w).length > 0 && heavySubs(m, w).every((s) => s.role === 'e')); }

/**
 * 1,3-diaxial partners of an axial substituent: the axial H atoms on the two ring carbons 1,3 to it, which lie on the same face.
 * Returns [{atom, dist}] with the distance from the substituent's first atom to that H (Angstrom).
 */
export function diaxialPartners(m, which, subAtom) {
  const pts = coords(m, which);
  const all = substituents(m, pts, refAxis(m));
  const me = all.find((s) => s.atom === subAtom);
  if (!me || me.role !== 'a') return [];
  return all.filter((s) => m.els[s.atom] === 'H' && s.role === 'a' && s.face === me.face && ((s.pos - me.pos + 6) % 6 === 2 || (me.pos - s.pos + 6) % 6 === 2))
    .map((s) => ({ atom: s.atom, dist: len(sub(pts[s.atom], pts[subAtom])) }));
}

/** Ease + linear blend of the two conformers (same atom order). t 0 -> a, 1 -> b. */
export function blend(m, t) { return m.A.map((p, i) => add(mul(p, 1 - t), mul(m.B[i], t))); }
export const ease = (t) => t * t * (3 - 2 * t);
