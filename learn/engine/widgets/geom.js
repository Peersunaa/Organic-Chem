// Small 3D geometry helpers shared by the newman-rotator, chair-flip widgets and the tests. Pure functions, no DOM.
export const RAD = Math.PI / 180;
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a) => mul(a, 1 / len(a));
export const mean = (pts) => mul(pts.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / pts.length);

/** Angle (degrees, 0..180) at b between a-b-c. */
export function angleDeg(a, b, c) {
  const u = sub(a, b), v = sub(c, b);
  return Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (len(u) * len(v))))) / RAD;
}
/** Angle (degrees, 0..180) between two vectors. */
export function vecAngle(u, v) { return Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (len(u) * len(v))))) / RAD; }

/** IUPAC dihedral p0-p1-p2-p3 in degrees, (-180, 180]. */
export function dihedral(p0, p1, p2, p3) {
  const b0 = sub(p1, p0), b1 = sub(p2, p1), b2 = sub(p3, p2);
  const n1 = cross(b0, b1), n2 = cross(b1, b2);
  return Math.atan2(dot(unit(b1), cross(n1, n2)), dot(n1, n2)) / RAD;
}
export const mod360 = (x) => ((x % 360) + 360) % 360;

/** Rodrigues rotation of point p by deg about the line through `origin` with unit direction `axis`. */
export function rotateAbout(p, origin, axis, deg) {
  const a = deg * RAD, c = Math.cos(a), s = Math.sin(a);
  const v = sub(p, origin);
  const r = add(add(mul(v, c), mul(cross(axis, v), s)), mul(axis, dot(axis, v) * (1 - c)));
  return add(r, origin);
}

/** Parse a V2000 molblock into { atoms:[{el,x,y,z}], bonds:[[i,j,order]] } (0-based). */
export function parseMol(mb) {
  const lines = mb.split('\n');
  const n = parseInt(lines[3].slice(0, 3), 10), nb = parseInt(lines[3].slice(3, 6), 10);
  const atoms = [], bonds = [];
  for (let i = 0; i < n; i++) {
    const l = lines[4 + i];
    atoms.push({ el: l.slice(31, 34).trim(), x: parseFloat(l.slice(0, 10)), y: parseFloat(l.slice(10, 20)), z: parseFloat(l.slice(20, 30)) });
  }
  for (let i = 0; i < nb; i++) {
    const l = lines[4 + n + i];
    bonds.push([parseInt(l.slice(0, 3), 10) - 1, parseInt(l.slice(3, 6), 10) - 1, parseInt(l.slice(6, 9), 10)]);
  }
  return { atoms, bonds };
}
export const P = (a) => [a.x, a.y, a.z];
export function neighbours(bonds, n) {
  const nb = Array.from({ length: n }, () => []);
  for (const [i, j] of bonds) { nb[i].push(j); nb[j].push(i); }
  return nb;
}

const pad = (v, w, d) => v.toFixed(d).padStart(w, ' ');
/** V2000 molblock text for a list of atoms (any extra fields ignored) and bonds, for 3Dmol. */
export function toMolblock(atoms, bonds) {
  const L = ['', '  orgo-learn', ''];
  L.push(String(atoms.length).padStart(3) + String(bonds.length).padStart(3) + '  0  0  0  0  0  0  0  0999 V2000');
  for (const a of atoms) L.push(pad(a.x, 10, 4) + pad(a.y, 10, 4) + pad(a.z, 10, 4) + ' ' + a.el.padEnd(3) + ' 0  0  0  0  0  0  0  0  0  0  0  0');
  for (const [i, j, o] of bonds) L.push(String(i + 1).padStart(3) + String(j + 1).padStart(3) + String(o || 1).padStart(3) + '  0');
  L.push('M  END');
  return L.join('\n');
}
