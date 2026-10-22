// Lesson 15: chirality, optical activity and R/S. Pure logic (no DOM), shared by the widgets, the mastery generator `rs` and the tests.
//   - sp3 centres and their R/S labels come from engine/cip.js (rules 1-3), checked against Python rdCIPLabeler / FindMolChiralCenters in the tests
//   - wedge/dash drawings are made from an RDKit 2D layout and a wedge assignment that is VERIFIED by reading the picture back (tetrahedron sign)
//   - mirror images of 3D models are the same coordinates reflected through a plane; Kabsch (Horn quaternion) superposition over every atom pairing
//     that respects elements and bonds decides "superimposable or not"
//   - specific rotation [a]D = a / (l x c)
import { rdkit, canon, analyze } from './chem.js';
import { tetraInfo, chiralCenters, readGraph, compare, sphereSets, usesDuplicate, symOf, condensed } from './cip.js';
import { parseMol } from './widgets/geom.js';

// ------------------------------------------------------------------------------------------------ small vector helpers
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const det3 = (a, b, c) => a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
const SUBS = '₀₁₂₃₄₅₆₇₈₉';

/**
 * Handedness of a tetrahedron from four group vectors listed by CIP priority (1,2,3,4). Right-handed coordinates, z toward the viewer.
 * Looking with group 4 pointing away, 1 -> 2 -> 3 clockwise (R) gives a NEGATIVE triple product (checked on the 3D models and against RDKit in the tests).
 */
export function tetraLabel(v1, v2, v3, v4) {
  const s = det3(sub3(v1, v4), sub3(v2, v4), sub3(v3, v4));
  return { s, label: s < 0 ? 'R' : 'S' };
}

// ------------------------------------------------------------------------------------------------ SMILES atom spans
/** [start,end) of each atom token of a SMILES, in atom-index order (organic-subset atoms and [bracket atoms]). */
export function atomSpans(smi) {
  const out = [];
  let i = 0;
  while (i < smi.length) {
    const ch = smi[i];
    if (ch === '[') { const j = smi.indexOf(']', i); out.push({ s: i, e: j + 1 }); i = j + 1; continue; }
    if (ch === '%') { i += 3; continue; }
    const two = smi.slice(i, i + 2);
    if (two === 'Cl' || two === 'Br') { out.push({ s: i, e: i + 2 }); i += 2; continue; }
    if ('BCNOPSFIbcnops'.includes(ch)) { out.push({ s: i, e: i + 1 }); i++; continue; }
    i++;
  }
  return out;
}
/** The same molecule written with the stereocentre's hydrogen as an explicit atom right after the centre (same neighbour order, so the same configuration). */
export function explicitH(smiles, atom) {
  const sp = atomSpans(smiles)[atom];
  const tok = smiles.slice(sp.s, sp.e);
  const m = /^\[C(@@?)H\]$/.exec(tok);
  if (!m) return { smiles, map: (i) => i, hIdx: null };
  return { smiles: smiles.slice(0, sp.s) + `[C${m[1]}]([H])` + smiles.slice(sp.e), map: (i) => (i > atom ? i + 1 : i), hIdx: atom + 1 };
}
/** The enantiomer's SMILES (every @ swapped with @@). Single-centre molecules only. */
export function flipStereo(smiles) { return smiles.replace(/@@/g, '\u0001').replace(/@/g, '@@').replace(/\u0001/g, '@'); }

// ------------------------------------------------------------------------------------------------ molblock helpers
export function parseMolblock(mb) {
  const L = mb.split('\n');
  const n = parseInt(L[3].slice(0, 3), 10), nb = parseInt(L[3].slice(3, 6), 10);
  const atoms = [], bonds = [];
  for (let i = 0; i < n; i++) { const l = L[4 + i]; atoms.push({ el: l.slice(31, 34).trim(), x: parseFloat(l.slice(0, 10)), y: parseFloat(l.slice(10, 20)), z: parseFloat(l.slice(20, 30)) }); }
  for (let i = 0; i < nb; i++) { const l = L[4 + n + i]; bonds.push({ a: parseInt(l.slice(0, 3), 10) - 1, b: parseInt(l.slice(3, 6), 10) - 1, order: parseInt(l.slice(6, 9), 10), flag: parseInt(l.slice(9, 12) || '0', 10) || 0 }); }
  return { atoms, bonds };
}
export function writeMolblock(atoms, bonds) {
  const L = ['', '  orgo-learn', '', `${String(atoms.length).padStart(3)}${String(bonds.length).padStart(3)}  0  0  0  0  0  0  0  0999 V2000`];
  for (const a of atoms) L.push(`${a.x.toFixed(4).padStart(10)}${a.y.toFixed(4).padStart(10)}${(a.z || 0).toFixed(4).padStart(10)} ${a.el.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`);
  for (const b of bonds) L.push(`${String(b.a + 1).padStart(3)}${String(b.b + 1).padStart(3)}${String(b.order).padStart(3)}${String(b.flag || 0).padStart(3)}`);
  L.push('M  END', '');
  return L.join('\n');
}

// ------------------------------------------------------------------------------------------------ wedge / dash drawings
/**
 * An exam-style drawing of ONE stereocentre of `smiles`: the layout is RDKit's (the centre's hydrogen is drawn as an atom, so the four bonds fan out
 * about 90 degrees apart); the wedge/dash flags are assigned here and then read back geometrically to prove they give the configuration of the SMILES.
 *   opts.atom   which centre (default: the first one with a configuration)
 *   opts.style  'low'  the lowest-priority group is the only wedge or dash; the other three are plain bonds
 *               'two'  one wedge and one dash on two neighbouring bonds, the lowest-priority group is a PLAIN bond
 *   opts.lowOn  'wedge' | 'dash' ('low' style only): which one the lowest-priority group gets (the picture is mirrored when needed)
 *   opts.pair   ('two' style) 0|1|2: which neighbouring pair of the three higher groups carries the wedge and dash
 * Returns { molblock, atoms:[{el,x,y}], bonds, center, groups:[{sub, atom, rank, flag:'wedge'|'dash'|'plain', label}], label, lowFlag, style, info }.
 */
export function wedgeDrawing(smiles, opts = {}) {
  const R = rdkit();
  const all = tetraInfo(smiles);
  const T = opts.atom != null ? all.find((x) => x.atom === opts.atom) : all.find((x) => x.center && x.label);
  if (!T || !T.label) return null;
  const ex = explicitH(smiles, T.atom);
  const m = R.get_mol(ex.smiles, JSON.stringify({ removeHs: false }));
  if (!m) return null;
  let parsed;
  try { m.set_new_coords(); parsed = parseMolblock(m.get_molblock()); } finally { m.delete(); }
  const { atoms, bonds } = parsed;
  const c = ex.map(T.atom);
  const draw = T.subs.map((s, k) => ({ sub: k, atom: s.atom === null ? ex.hIdx : ex.map(s.atom), rank: T.rank[k], label: s.label }));
  const style = opts.style || 'low';
  const lowSub = draw.find((g) => g.rank === 4);
  const vec = (g, flip) => [(flip ? -1 : 1) * (atoms[g.atom].x - atoms[c].x), atoms[g.atom].y - atoms[c].y];
  const angleOf = (g, flip) => { const v = vec(g, flip); return Math.atan2(v[1], v[0]); };
  const readLabel = (zOf, flip) => {
    const V = (r) => { const g = draw.find((x) => x.rank === r); const v = vec(g, flip); return [v[0], v[1], zOf(g) * 1.5]; };
    return tetraLabel(V(1), V(2), V(3), V(4)).label;
  };
  let flip = false, zOf, flags = {};
  if (style === 'low') {
    const want = opts.lowOn === 'dash' ? -1 : 1;
    const tryZ = (f, zv) => (g) => (g === lowSub ? zv : 0);
    if (readLabel(tryZ(false, want), false) === T.label) { zOf = tryZ(false, want); flip = false; }
    else { flip = true; zOf = tryZ(true, want); if (readLabel(zOf, true) !== T.label) return null; }
    flags[lowSub.atom] = want === 1 ? 'wedge' : 'dash';
  } else {
    // the three higher groups ordered by drawing angle; pick two neighbouring ones
    const hi = draw.filter((g) => g !== lowSub).sort((p, q) => angleOf(p, false) - angleOf(q, false));
    // only bonds that sit next to each other in the picture (never two opposite bonds, which RDKit and readers treat as contradictory)
    const sep = (p, q) => { const d = Math.abs(angleOf(p, false) - angleOf(q, false)) % (2 * Math.PI); return Math.min(d, 2 * Math.PI - d); };
    const pairs = [[hi[0], hi[1]], [hi[1], hi[2]], [hi[2], hi[0]]].filter(([p, q]) => sep(p, q) < Math.PI * 0.72);
    const [a, b] = pairs[(opts.pair || 0) % pairs.length];
    const tz = (w, d) => (g) => (g === w ? 1 : g === d ? -1 : 0);
    if (readLabel(tz(a, b), false) === T.label) { zOf = tz(a, b); flags[a.atom] = 'wedge'; flags[b.atom] = 'dash'; }
    else { zOf = tz(b, a); flags[b.atom] = 'wedge'; flags[a.atom] = 'dash'; }
    if (readLabel(zOf, false) !== T.label) return null;
  }
  const A = atoms.map((a) => ({ el: a.el, x: (flip ? -1 : 1) * a.x, y: a.y }));
  const B = bonds.map((b) => {
    const nb = { ...b, flag: 0 };
    if (b.a === c && flags[b.b]) nb.flag = flags[b.b] === 'wedge' ? 1 : 6;
    else if (b.b === c && flags[b.a]) { nb.a = b.b; nb.b = b.a; nb.flag = flags[b.a] === 'wedge' ? 1 : 6; }
    return nb;
  });
  const groups = draw.map((g) => ({ ...g, flag: flags[g.atom] || 'plain' }));
  return { molblock: writeMolblock(A, B), atoms: A, bonds: B, center: c, groups, label: T.label, lowFlag: groups.find((g) => g.rank === 4).flag, style, info: T, smiles, flip };
}

/** Read the configuration of a wedge drawing back from its coordinates and wedge flags alone: { label, s } (wedge = toward the viewer). */
export function drawnLabel(dr) {
  const z = {};
  for (const b of dr.bonds) if (b.a === dr.center && b.flag) z[b.b] = b.flag === 1 ? 1 : -1;
  const V = (r) => { const g = dr.groups.find((x) => x.rank === r); return [dr.atoms[g.atom].x - dr.atoms[dr.center].x, dr.atoms[g.atom].y - dr.atoms[dr.center].y, (z[g.atom] || 0) * 1.5]; };
  return tetraLabel(V(1), V(2), V(3), V(4));
}

/** Direction in which 1 -> 2 -> 3 runs on a flat drawing (y up in molblock coordinates): 'ccw' or 'cw'. `pos(rank)` = [x,y]. */
export function turnOf(p1, p2, p3) {
  const a = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1]);
  return { area: a, dir: a > 0 ? 'ccw' : 'cw' };
}

// ------------------------------------------------------------------------------------------------ the R/S reading rules, derived from a picture
/**
 * What the learner should conclude from a picture where group 4 sits at `lowFlag` ('wedge' toward you, 'dash' away, 'plain' in the page plane)
 * and 1 -> 2 -> 3 turns `dir` on the page.
 *   dash  -> read it directly (cw = R)
 *   wedge -> reverse (cw = S)
 *   plain -> not directly readable: swap 4 with the group on the dash (or wedge), read, then reverse once because of the swap
 */
export function readRule(lowFlag, dir) {
  const direct = dir === 'cw' ? 'R' : 'S';
  const other = direct === 'R' ? 'S' : 'R';
  if (lowFlag === 'dash') return { label: direct, reverse: false };
  if (lowFlag === 'wedge') return { label: other, reverse: true };
  return null;
}

// ------------------------------------------------------------------------------------------------ 3D models: groups, geometry, rotations
/** Groups of the centre of a 3D model entry from data/3d/chiral.js; `which` 'molblock' (as made) or 'mirror' (reflected through x = 0). */
export function model3dInfo(entry, which = 'molblock') {
  const T = tetraInfo(entry.smiles).find((x) => x.center && x.label);
  const mol = parseMol(entry[which]);
  const c = entry.center;
  const nb = mol.bonds.filter((b) => b[0] === c || b[1] === c).map((b) => (b[0] === c ? b[1] : b[0]));
  const hs = nb.filter((i) => mol.atoms[i].el === 'H');
  const groups = T.subs.map((s, k) => ({ sub: k, atom: s.atom === null ? hs[0] : s.atom, rank: T.rank[k], label: s.label }));
  const label = which === 'mirror' ? (T.label === 'R' ? 'S' : 'R') : T.label;
  return { info: T, mol, center: c, groups, label };
}
/** The label read back from the 3D coordinates (an independent geometric reading). */
export function geomLabel(atoms, center, groups) {
  const V = (r) => { const g = groups.find((x) => x.rank === r); const a = atoms[g.atom], o = atoms[center]; return [a.x - o.x, a.y - o.y, a.z - o.z]; };
  return tetraLabel(V(1), V(2), V(3), V(4));
}

export const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
export const matMul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
export const matVec = (A, v) => [A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2], A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2], A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]];
export function rotAxisAngle(axis, ang) {
  const n = Math.hypot(...axis) || 1, [x, y, z] = axis.map((v) => v / n), c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
  return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
}
export const rotX = (a) => rotAxisAngle([1, 0, 0], a);
export const rotY = (a) => rotAxisAngle([0, 1, 0], a);
/** { axis, angle } of a proper rotation matrix. */
export function axisAngle(R) {
  const tr = R[0][0] + R[1][1] + R[2][2];
  const angle = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)));
  if (angle < 1e-9) return { axis: [0, 0, 1], angle: 0 };
  let axis = [R[2][1] - R[1][2], R[0][2] - R[2][0], R[1][0] - R[0][1]];
  const n = Math.hypot(...axis);
  if (n < 1e-9) { // 180 degrees: take the largest diagonal term
    const d = [R[0][0], R[1][1], R[2][2]], k = d.indexOf(Math.max(...d));
    axis = [0, 0, 0]; axis[k] = Math.sqrt(Math.max(0, (d[k] + 1) / 2));
    for (let j = 0; j < 3; j++) if (j !== k) axis[j] = R[k][j] / (2 * axis[k]);
    return { axis, angle };
  }
  return { axis: axis.map((v) => v / n), angle };
}
/** Smallest rotation that turns the direction `u` into the direction `v`. */
export function rotBetween(u, v) {
  const un = u.map((x) => x / Math.hypot(...u)), vn = v.map((x) => x / Math.hypot(...v));
  const cr = [un[1] * vn[2] - un[2] * vn[1], un[2] * vn[0] - un[0] * vn[2], un[0] * vn[1] - un[1] * vn[0]];
  const d = un[0] * vn[0] + un[1] * vn[1] + un[2] * vn[2];
  if (Math.hypot(...cr) < 1e-9) return d > 0 ? I3 : rotAxisAngle(Math.abs(un[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], Math.PI);
  return rotAxisAngle(cr, Math.atan2(Math.hypot(...cr), d));
}
/** Which way group 4 points for a viewer on +z: 'toward' (within 50 degrees of the viewer), 'away' (within 50 degrees of straight back), else 'side'. */
export function pointing(v) {
  const cos = v[2] / (Math.hypot(...v) || 1);
  return cos > Math.cos(50 * Math.PI / 180) ? 'toward' : cos < -Math.cos(50 * Math.PI / 180) ? 'away' : 'side';
}

// ------------------------------------------------------------------------------------------------ mirror images and superposition
/** Reflect through the plane x = 0. */
export const reflectAtoms = (atoms) => atoms.map((a) => ({ ...a, x: -a.x }));
export const centroid = (pts) => [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / pts.length);

function jacobiEigen(Min) {
  const n = Min.length, A = Min.map((r) => r.slice()), V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (off < 1e-24) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-18) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  return { values: A.map((r, i) => r[i]), vectors: V };
}
/** Best PROPER rotation R (Horn's quaternion method) with R p_i ~ q_i for centred point lists; returns { R, rmsd }. */
export function kabsch(P, Q) {
  const cp = centroid(P), cq = centroid(Q);
  const p = P.map((v) => sub3(v, cp)), q = Q.map((v) => sub3(v, cq));
  let Sxx = 0, Sxy = 0, Sxz = 0, Syx = 0, Syy = 0, Syz = 0, Szx = 0, Szy = 0, Szz = 0;
  p.forEach((a, i) => { const b = q[i]; Sxx += a[0] * b[0]; Sxy += a[0] * b[1]; Sxz += a[0] * b[2]; Syx += a[1] * b[0]; Syy += a[1] * b[1]; Syz += a[1] * b[2]; Szx += a[2] * b[0]; Szy += a[2] * b[1]; Szz += a[2] * b[2]; });
  const N = [
    [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
    [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
    [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
    [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz]
  ];
  const { values, vectors } = jacobiEigen(N);
  const k = values.indexOf(Math.max(...values));
  const [w, x, y, z] = [0, 1, 2, 3].map((r) => vectors[r][k]);
  const R = [
    [w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z]
  ];
  let sum = 0;
  p.forEach((a, i) => { const r = matVec(R, a), d = sub3(r, q[i]); sum += d[0] * d[0] + d[1] * d[1] + d[2] * d[2]; });
  return { R, rmsd: Math.sqrt(sum / P.length), cp, cq };
}

/** Atom pairings that keep elements AND bonds (graph automorphisms of the bond graph): perm[i] = the atom that atom i is matched to. */
export function automorphisms(atoms, bonds, limit = 20000) {
  const n = atoms.length;
  const adj = Array.from({ length: n }, () => new Set());
  bonds.forEach(([a, b]) => { adj[a].add(b); adj[b].add(a); });
  const perm = new Array(n).fill(-1), used = new Array(n).fill(false), out = [];
  const rec = (i) => {
    if (out.length >= limit) return;
    if (i === n) { out.push(perm.slice()); return; }
    for (let j = 0; j < n; j++) {
      if (used[j] || atoms[j].el !== atoms[i].el || adj[j].size !== adj[i].size) continue;
      let good = true;
      for (let k = 0; k < i && good; k++) if (adj[i].has(k) !== adj[j].has(perm[k])) good = false;
      if (!good) continue;
      perm[i] = j; used[j] = true; rec(i + 1); used[j] = false; perm[i] = -1;
    }
  };
  rec(0);
  return out;
}
/** Every pairing that only respects elements (the generous version used by the tests for small molecules). */
export function elementPairings(atoms, limit = 50000) {
  const n = atoms.length, perm = new Array(n).fill(-1), used = new Array(n).fill(false), out = [];
  const rec = (i) => {
    if (out.length >= limit) return;
    if (i === n) { out.push(perm.slice()); return; }
    for (let j = 0; j < n; j++) { if (used[j] || atoms[j].el !== atoms[i].el) continue; perm[i] = j; used[j] = true; rec(i + 1); used[j] = false; }
  };
  rec(0);
  return out;
}

/**
 * Try to lay molecule B (e.g. the mirror image, in its current pose) on molecule A (current pose). Both are lists of {el,x,y,z} for the SAME atom list
 * (same elements, same bonds). Over every allowed pairing the best proper rotation is found; the winner has the smallest RMSD.
 * Returns { rmsd, R, perm, dist:[distance of each B atom from its partner after the rotation], mismatched:[B atom indices > 0.4 A off], match: boolean, cp, cq }.
 */
export function superpose(A, B, bonds, opts = {}) {
  const perms = opts.pairings || automorphisms(A, bonds);
  const PA = A.map((a) => [a.x, a.y, a.z]), PB = B.map((a) => [a.x, a.y, a.z]);
  let best = null;
  for (const perm of perms) {
    const Q = perm.map((j) => PA[j]);
    const r = kabsch(PB, Q);
    if (!best || r.rmsd < best.rmsd - 1e-12) best = { ...r, perm };
  }
  const dist = PB.map((p, i) => { const r = matVec(best.R, sub3(p, best.cp)), q = sub3(PA[best.perm[i]], best.cq); return Math.hypot(...sub3(r, q)); });
  const mismatched = dist.map((d, i) => (d > 0.4 ? i : -1)).filter((i) => i >= 0);
  return { rmsd: best.rmsd, R: best.R, perm: best.perm, dist, mismatched, match: best.rmsd < 0.05, cp: best.cp, cq: best.cq };
}

/** Check a candidate mirror plane through three atoms: which atoms lie in it, and does reflecting through it map the molecule onto itself? */
export function planeCheck(atoms, trio) {
  const P = atoms.map((a) => [a.x, a.y, a.z]);
  const [a, b, c] = trio.map((i) => P[i]);
  let nrm = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
  const nl = Math.hypot(...nrm); nrm = nrm.map((v) => v / nl);
  const signed = (p) => nrm[0] * (p[0] - a[0]) + nrm[1] * (p[1] - a[1]) + nrm[2] * (p[2] - a[2]);
  const refl = P.map((p) => { const d = signed(p); return [p[0] - 2 * d * nrm[0], p[1] - 2 * d * nrm[1], p[2] - 2 * d * nrm[2]]; });
  const inPlane = P.map((p, i) => (Math.abs(signed(p)) < 0.1 ? i : -1)).filter((i) => i >= 0);
  const map = refl.map((r, i) => P.findIndex((p, j) => atoms[j].el === atoms[i].el && Math.hypot(...sub3(p, r)) < 0.25));
  return { inPlane, symmetric: map.every((j) => j >= 0), map, normal: nrm, point: a };
}
/** All planes through three atoms that are a mirror plane of the molecule (used to find the symmetry plane of an achiral model). */
export function mirrorPlanes(atoms) {
  const n = atoms.length, found = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    const P = [atoms[i], atoms[j], atoms[k]].map((a) => [a.x, a.y, a.z]);
    const u = sub3(P[1], P[0]), v = sub3(P[2], P[0]);
    if (Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) < 0.2) continue;
    const r = planeCheck(atoms, [i, j, k]);
    if (r.symmetric) found.push({ trio: [i, j, k], inPlane: r.inPlane });
  }
  const seen = new Set();
  return found.filter((f) => { const key = f.inPlane.join(','); if (seen.has(key)) return false; seen.add(key); return true; });
}

// ------------------------------------------------------------------------------------------------ optical activity
export const roundTo = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
/** [a]D = observed rotation / (path length in dm x concentration in g/mL). */
export function specificRotation(alpha, lengthDm, grams, mL) { return alpha / (lengthDm * (grams / mL)); }
/** Observed rotation from a known specific rotation. */
export function observedRotation(spec, lengthDm, grams, mL) { return spec * lengthDm * (grams / mL); }
export const signed = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x);

// ------------------------------------------------------------------------------------------------ explanations for wrong answers
/** Number of non-hydrogen atoms in a group (duplicates not counted): "size". */
export function groupSize(node) { return node.h || node.dupe ? 0 : 1 + node.kids.reduce((s, k) => s + groupSize(k), 0); }
const ZSUM = { H: 1, C: 6, N: 7, O: 8, F: 9, P: 15, S: 16, Cl: 17, Br: 35, I: 53 };
const setSum = (set) => set.split(/[()\s,]+/).filter(Boolean).reduce((s, x) => s + (ZSUM[x] || 0), 0);
const NAMES = { H: 'hydrogen', C: 'carbon', N: 'nitrogen', O: 'oxygen', Cl: 'chlorine', Br: 'bromine', F: 'fluorine', S: 'sulfur' };
const lab = (s) => (s.label === 'H' ? 'H' : s.label);

/** Why group `lo` ranks below group `hi` (both entries of tetraInfo().subs), as a diagnosis for a learner who got them the wrong way round. */
export function whyOutranks(hi, lo) {
  const c = compare(hi.node, lo.node);
  const hiSym = symOf(hi.node.z), loSym = symOf(lo.node.z);
  if (c.sphere <= 1) {
    if (lo.atom === null) return `Hydrogen has the lowest atomic number of all, so it is always last: ${lab(hi)} outranks H.`;
    if (hi.atom === null) return `Hydrogen always comes last, so ${lab(lo)} outranks H.`;
    if (groupSize(lo.node) > groupSize(hi.node)) return `You ranked by size, not atomic number. Only the atom bonded to the center counts first: ${hiSym} (atomic number ${hi.node.z}) outranks ${loSym} (${lo.node.z}), even though ${lab(lo)} is the bigger group.`;
    return `Compare the atoms bonded directly to the center: ${hiSym} (atomic number ${hi.node.z}) outranks ${loSym} (${lo.node.z}). The higher atomic number wins at the first atom, before you look at anything else.`;
  }
  const hiSet = sphereSets(hi.node, c.sphere)[c.sphere - 2], loSet = sphereSets(lo.node, c.sphere)[c.sphere - 2];
  const hiDup = usesDuplicate(hi.node, c.sphere), loDup = usesDuplicate(lo.node, c.sphere);
  if (hiDup && !loDup) {
    const first = sphereSets(hi.node, 2)[0];
    const bond = /O/.test(first) && hi.node.kids.some((k) => k.dupe && k.z === 8) ? 'C=O' : hi.node.kids.some((k) => k.dupe && k.z === 6) ? 'C=C' : 'double bond';
    return `Duplicate the ${bond}: ${lab(hi)} counts as ${first}, because each end of a double bond also counts the atom at the other end. Written that way ${hiSet} outranks ${loSet}.`;
  }
  if (setSum(loSet) > setSum(hiSet)) return `You compared the sum of the atoms; compare the highest atom first. The first atoms tie, so line up the attached atoms from the highest down: ${hiSet} beats ${loSet} at the first point of difference, even though ${lab(lo)} has the larger total.`;
  if (groupSize(lo.node) > groupSize(hi.node)) return `You ranked by size, not by atomic number. The first atoms tie (both ${hiSym}), so compare the atoms attached to them, highest first: ${hiSet} beats ${loSet}. A longer group does not win by being longer.`;
  return `The first atoms tie (both are ${hiSym}), so compare the atoms attached to them, highest first, and stop at the first difference: ${hiSet} beats ${loSet}${c.sphere > 2 ? ' (go further out until the sets differ)' : ''}.`;
}
/** Diagnosis when the learner gave priority `k` (1-4) to sub `chosen`; truth: T = tetraInfo entry. */
export function rankDiagnosis(T, chosen, k) {
  const truthK = T.order[k - 1];          // the sub that really is number k
  const trueRank = T.rank[chosen];
  const a = T.subs[chosen], b = T.subs[truthK];
  if (trueRank < k) return whyOutranks(a, b).replace(/^/, `${lab(a)} actually ranks higher than the one you put at ${k}. `);
  return whyOutranks(b, a);
}

/** "A, B, C, D" for the four groups on a centre (priority order), or a plain phrase when a group is too long to read (ring paths). */
export function groupList(T) {
  const labs = T.order.map((i) => T.subs[i].label);
  return labs.every((l) => l.length <= 12) ? labs.join(', ') : 'among them the two different ways round the ring';
}
// ------------------------------------------------------------------------------------------------ why a carbon is (not) a chirality centre
const ringAtoms = (g, v) => {
  // atoms on any ring through v (cheap: v is on a ring when it can be reached again from a neighbour without using the edge it left by)
  const inRing = (a, b) => { const seen = new Set([a]); const q = [b]; seen.add(b); while (q.length) { const x = q.shift(); for (const { to } of g.atoms[x].nbrs) { if (x === b && to === a) continue; if (to === a) return true; if (!seen.has(to)) { seen.add(to); q.push(to); } } } return false; };
  return g.atoms[v].nbrs.filter((n) => inRing(v, n.to)).map((n) => n.to);
};
/** { center:boolean, why } for a tap on `atom` of `smiles`. */
export function centerReason(smiles, atom) {
  const g = readGraph(smiles);
  const at = g.atoms[atom];
  const T = tetraInfo(smiles).find((x) => x.atom === atom);
  if (T && T.center) {
    return { center: true, why: `Yes: this carbon is bonded to four different groups (${groupList(T)}), so it is a chirality center.` };
  }
  if (at.z !== 6) return { center: false, why: `That is a ${NAMES[at.sym] || at.sym} atom. The chirality centers in this lesson are sp³ carbons.` };
  if (at.nbrs.some((n) => n.bo > 1)) {
    const tr = at.nbrs.some((n) => n.bo === 3);
    return { center: false, why: `This carbon is sp${tr ? '' : '²'} (it has a ${tr ? 'triple' : 'double'} bond, or sits in a benzene ring), so it has only ${tr ? 'two' : 'three'} groups around it. Only sp³ carbons with four groups can be chirality centers.` };
  }
  if (at.impH >= 2) return { center: false, why: `This carbon carries ${at.impH === 3 ? 'three' : 'two'} hydrogens (${at.impH === 3 ? 'a CH₃' : 'a CH₂'}): two or more of its groups are identical, so it cannot be a chirality center.` };
  if (T && T.tie) {
    // find the identical pair
    const s = T.subs; let pair = null;
    for (let i = 0; i < 4 && !pair; i++) for (let j = i + 1; j < 4 && !pair; j++) if (compare(s[i].node, s[j].node).cmp === 0) pair = [i, j];
    const ring = ringAtoms(g, atom);
    if (pair && ring.length >= 2 && pair.every((i) => ring.includes(s[i].atom))) return { center: false, why: 'Two of the groups are the two directions around the ring, and going either way round you meet exactly the same atoms. They count as identical groups, so this carbon is not a chirality center.' };
    if (pair) return { center: false, why: `Two of the four groups are the same: both are ${s[pair[0]].label}. A chirality center needs four different groups.` };
  }
  return { center: false, why: 'This carbon does not have four different groups on it.' };
}


// ================================================================================================================================
// Lesson 16: stereochemical RELATIONSHIPS (identical / enantiomers / diastereomers / constitutional isomers), meso compounds, mirror planes.
// Everything is computed from canonical isomeric SMILES (RDKit): same constitution = equal canonical SMILES without stereo; identical = equal
// isomeric canonical SMILES; enantiomers = B equals the mirror image of A (every @ swapped with @@) and A is chiral; otherwise diastereomers.
// Python RDKit repeats all of it independently in tools/check_relationships.py (EnumerateStereoisomers + inverting every centre).
// ================================================================================================================================
/** The mirror image of a SMILES: every tetrahedral tag inverted (E/Z is unchanged: a mirror image does not turn cis into trans). */
export const mirrorSmiles = (smiles) => flipStereo(smiles);
/** Canonical isomeric SMILES (null if invalid). */
export const isoCanon = (smiles) => canon(smiles);
/** Canonical SMILES with ALL stereo removed (the constitution). */
export function flatSmiles(smiles) {
  const R = rdkit();
  const m = R.get_mol(smiles);
  if (!m) return null;
  try { return m.get_smiles(JSON.stringify({ doIsomericSmiles: false })); } finally { m.delete(); }
}
/** Hill-order molecular formula string with a charge suffix, from RDKit atom data (hydrogens counted). */
export function formulaKey(smiles) {
  const info = analyze(smiles);
  if (!info) return null;
  const cnt = {};
  info.atoms.forEach((a) => { cnt[a.sym] = (cnt[a.sym] || 0) + 1; if (a.impH) cnt.H = (cnt.H || 0) + a.impH; });
  const rest = Object.keys(cnt).filter((k) => k !== 'C' && k !== 'H').sort();
  const seq = (cnt.C ? ['C'] : []).concat(cnt.H ? ['H'] : []).concat(rest);
  return seq.map((k) => k + (cnt[k] > 1 ? cnt[k] : '')).join('') + (info.netCharge ? `/${info.netCharge}` : '');
}
/** Chirality centres (book definition, cip.js rules 1-3) that the SMILES leaves unassigned. */
export function unassignedCenters(smiles) {
  const T = tetraInfo(smiles);
  return T ? T.filter((t) => t.center && !t.label).map((t) => t.atom) : [];
}
/** Is the molecule its own mirror image? (equal isomeric canonical SMILES) */
export function isAchiral(smiles) { const a = isoCanon(smiles); return a !== null && a === isoCanon(mirrorSmiles(smiles)); }
/**
 * Meso compound = has chirality centres, every one assigned, AND is identical to its own mirror image (so it is achiral and optically inactive).
 * Centres use the book definition (cip.js), so cis/trans-1,4-dimethylcyclohexane (no centres) is not "meso".
 */
export function isMeso(smiles) {
  const T = tetraInfo(smiles);
  if (!T) return false;
  const centers = T.filter((t) => t.center);
  if (centers.length < 2 || centers.some((t) => !t.label)) return false;
  return isAchiral(smiles);
}
/** Chiral = not identical to its mirror image. */
export const isChiral = (smiles) => isoCanon(smiles) !== null && !isAchiral(smiles);
/**
 * How are two drawn molecules related? Returns { kind, ...facts } with kind one of
 *   'identical'        same molecule (also: the same meso compound drawn two ways)
 *   'enantiomers'      B is the mirror image of A and A is chiral
 *   'diastereomers'    same constitution, stereoisomers, not mirror images (includes cis/trans)
 *   'constitutional'   same molecular formula, different connectivity
 *   'different'        different molecular formulas (not isomers)
 *   'unspecified'      a chirality centre is left open in A or B (cannot be judged)
 * facts: sameConstitution, mirrorOfA, chiralA, chiralB, mesoA, mesoB, nCenters.
 */
export function relationship(a, b) {
  const A = isoCanon(a), B = isoCanon(b);
  if (A === null || B === null) return { kind: 'invalid' };
  const facts = { sameFormula: formulaKey(a) === formulaKey(b), sameConstitution: flatSmiles(a) === flatSmiles(b) };
  if (!facts.sameFormula) return { kind: 'different', ...facts };
  if (!facts.sameConstitution) return { kind: 'constitutional', ...facts };
  if (unassignedCenters(a).length || unassignedCenters(b).length) return { kind: 'unspecified', ...facts };
  const M = isoCanon(mirrorSmiles(a));
  const out = { ...facts, mirrorOfA: M, chiralA: A !== M, chiralB: B !== isoCanon(mirrorSmiles(b)), mesoA: isMeso(a), mesoB: isMeso(b), nCenters: chiralCenters(a).length };
  if (A === B) return { kind: 'identical', ...out };
  if (M === B && out.chiralA) return { kind: 'enantiomers', ...out };
  return { kind: 'diastereomers', ...out };
}

// ------------------------------------------------------------------------------------------------ planes of symmetry (3D)
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit3 = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
/** Reflect points through the plane { x : n . x = d } (n need not be a unit vector). */
export function reflectPoint(p, n, d) { const u = unit3(n), k = 2 * (dot3(u, p) - d / (Math.hypot(...n) || 1)); return [p[0] - k * u[0], p[1] - k * u[1], p[2] - k * u[2]]; }
/**
 * Does reflecting the molecule through the plane n . x = d map it onto itself? Every atom's image must lie within `tol` A of an atom of the same
 * element that is not already taken. Returns { symmetric, map (atom -> partner), off:[atoms with no partner], reflected:[[x,y,z]], onPlane:[atoms within tol of the plane] }.
 */
export function planeMaps(atoms, n, d, tol = 0.3) {
  const P = atoms.map((a) => [a.x, a.y, a.z]);
  const u = unit3(n), dn = d / (Math.hypot(...n) || 1);
  const reflected = P.map((p) => reflectPoint(p, u, dn));
  const map = new Array(atoms.length).fill(-1), taken = new Set();
  // closest pairs first, so two atoms never claim the same partner
  const pairs = [];
  reflected.forEach((r, i) => P.forEach((p, j) => { if (atoms[j].el === atoms[i].el) { const dist = Math.hypot(...sub3(p, r)); if (dist <= tol) pairs.push([dist, i, j]); } }));
  pairs.sort((x, y) => x[0] - y[0]);
  for (const [, i, j] of pairs) if (map[i] < 0 && !taken.has(j)) { map[i] = j; taken.add(j); }
  const off = map.map((j, i) => (j < 0 ? i : -1)).filter((i) => i >= 0);
  const onPlane = P.map((p, i) => (Math.abs(dot3(u, p) - dn) <= tol ? i : -1)).filter((i) => i >= 0);
  return { symmetric: off.length === 0, map, off, reflected, onPlane };
}
/**
 * EVERY mirror plane of a molecule. A mirror plane that has an atom off it is the perpendicular bisector of that atom and its image, so
 * trying the bisector plane of each pair of same-element atoms finds all of them (a plane through all atoms would need a flat molecule).
 * Returns [{ n (unit), d, onPlane:[atoms], pair:[i,j] }] without duplicates.
 */
export function symmetryPlanes(atoms, tol = 0.2) {
  const out = [], seen = new Set();
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
    if (atoms[i].el !== atoms[j].el) continue;
    const a = [atoms[i].x, atoms[i].y, atoms[i].z], b = [atoms[j].x, atoms[j].y, atoms[j].z];
    if (Math.hypot(...sub3(a, b)) < 0.3) continue;
    let n = unit3(sub3(b, a)); let d = dot3(n, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
    if (n[0] < -1e-9 || (Math.abs(n[0]) <= 1e-9 && (n[1] < -1e-9 || (Math.abs(n[1]) <= 1e-9 && n[2] < 0)))) { n = n.map((x) => -x); d = -d; }
    const r2 = (x) => String(Math.round(x * 100) / 100 + 0); // + 0 turns -0 into 0, so one plane never gets two keys
    const key = n.map(r2).join(',') + '|' + r2(d);
    if (seen.has(key)) continue;
    seen.add(key);
    const r = planeMaps(atoms, n, d, tol);
    if (r.symmetric) out.push({ n, d, onPlane: r.onPlane, pair: [i, j] });
  }
  return out;
}
/**
 * Three starting orientations for the symmetry-plane widget, from the bond between two atoms (the C2-C3 bond of the meso compounds):
 *  0 perpendicular to the bond,  1 containing the bond and the atom `via`,  2 containing the bond, at right angles to plane 1.
 * Each is { n (unit normal), label }. The learner chooses one and slides it along its normal (offset in A from the centre of the molecule).
 */
export function planeFrames(atoms, axis, via) {
  const P = (i) => [atoms[i].x, atoms[i].y, atoms[i].z];
  const u = unit3(sub3(P(axis[1]), P(axis[0])));
  const n1 = unit3(cross3(u, sub3(P(via), P(axis[0]))));
  const n2 = unit3(cross3(u, n1));
  return [{ n: u, id: 'across' }, { n: n1, id: 'along-a' }, { n: n2, id: 'along-b' }];
}
/** Centre of the atoms (the plane offset is measured from here). */
export function molCentre(atoms) { return centroid(atoms.map((a) => [a.x, a.y, a.z])); }
