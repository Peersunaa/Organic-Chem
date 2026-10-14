// CIP sequence rules for double bonds (Lesson 07): E/Z from a SMILES, with the reasoning kept so a widget can show it.
//   Rule 1: higher atomic number wins.
//   Rule 2: on a tie, compare the SETS of atoms attached, sphere by sphere, at the first point of difference (never a sum).
//   Rule 3: a double bond counts as two single bonds: each end gets a duplicate of the other atom (C=O gives O,O / C,C),
//           a triple bond gives two duplicates.
// Only these rules are implemented (they settle every alkene in the course). When they cannot separate two groups the two
// groups are the same constitution (or need rules this course does not teach), and ezInfo reports `tie: true`.
// The tests compare every label with RDKit's new CIP labeler (Python rdCIPLabeler) on thousands of alkenes.
import { rdkit } from './chem.js';

export const ZNUM = { H: 1, B: 5, C: 6, N: 7, O: 8, F: 9, Si: 14, P: 15, S: 16, Cl: 17, Br: 35, I: 53 };
const SYM = Object.fromEntries(Object.entries(ZNUM).map(([s, z]) => [z, s]));
export const symOf = (z) => SYM[z] || '?';

/** Atoms and bonds of a SMILES from RDKit's JSON (atom indices are those of the SMILES as written). */
export function readGraph(smiles) {
  const m = rdkit().get_mol(smiles);
  if (!m) return null;
  try {
    const j = JSON.parse(m.get_json()).molecules[0];
    const atoms = j.atoms.map((a, idx) => ({ idx, z: a.z ?? 6, sym: symOf(a.z ?? 6), impH: a.impHs ?? 0, chg: a.chg ?? 0, nbrs: [] }));
    const bonds = (j.bonds || []).map((b) => ({ a: b.atoms[0], b: b.atoms[1], bo: b.bo ?? 1, stereo: b.stereo || 'unspecified', sa: b.stereoAtoms ? b.stereoAtoms[0] : null, sb: b.stereoAtoms ? b.stereoAtoms[1] : null }));
    for (const b of bonds) { atoms[b.a].nbrs.push({ to: b.b, bo: b.bo }); atoms[b.b].nbrs.push({ to: b.a, bo: b.bo }); }
    return { atoms, bonds };
  } finally { m.delete(); }
}

// ---- hierarchical digraph
const dupe = (z) => ({ z, kids: [], dupe: true, idx: null });
function buildNode(g, v, parent, bo, path) {
  const a = g.atoms[v];
  const kids = [];
  for (const { to, bo: b } of a.nbrs) {
    if (to === parent) continue;
    if (path.has(to)) kids.push(dupe(g.atoms[to].z));
    else kids.push(buildNode(g, to, v, b, new Set([...path, to])));
    for (let i = 1; i < b; i++) kids.push(dupe(g.atoms[to].z));
  }
  for (let i = 0; i < a.impH; i++) kids.push({ z: 1, kids: [], idx: null, h: true });
  for (let i = 1; i < bo; i++) kids.push(dupe(g.atoms[parent].z));
  return { z: a.z, kids, idx: v, dupe: false, bo };
}
function sortedKids(n) {
  if (!n._s) n._s = n.kids.slice().sort((x, y) => -compare(x, y).cmp);
  return n._s;
}

/** Compare two branches by the sphere rules. cmp > 0 when A outranks B. `sphere` is where they first differ (1 = the atoms themselves). */
export function compare(A, B) {
  if (A.z !== B.z) return { cmp: Math.sign(A.z - B.z), sphere: 1 };
  let LA = [A], LB = [B], sphere = 1;
  while (LA.some((n) => n.kids.length) || LB.some((n) => n.kids.length)) {
    sphere++;
    const KA = LA.map(sortedKids), KB = LB.map(sortedKids);
    for (let i = 0; i < Math.max(KA.length, KB.length); i++) {
      const ka = KA[i] || [], kb = KB[i] || [];
      for (let j = 0; j < Math.max(ka.length, kb.length); j++) {
        const za = ka[j] ? ka[j].z : 0, zb = kb[j] ? kb[j].z : 0;
        if (za !== zb) return { cmp: Math.sign(za - zb), sphere };
      }
    }
    LA = KA.flat(); LB = KB.flat();
  }
  return { cmp: 0, sphere };
}

/** Substituents of double-bond carbon `a` (the partner `b` excluded): each {atom: index|null for H, node}. */
function substituents(g, a, b) {
  const out = [];
  for (const { to, bo } of g.atoms[a].nbrs) if (to !== b) out.push({ atom: to, node: buildNode(g, to, a, bo, new Set([a, to])) });
  for (let i = 0; i < g.atoms[a].impH; i++) out.push({ atom: null, node: { z: 1, kids: [], idx: null, h: true } });
  return out;
}

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n) => (n > 1 ? String(n).split('').map((d) => SUBS[d]).join('') : '');
/** Condensed formula of a group, e.g. CH₂CH₃, CH(CH₃)₂, CH=CH₂, C≡N (duplicates are not written). */
export function condensed(node, bo = 1) {
  const real = node.kids.filter((k) => !k.dupe && !k.h);
  const nH = node.kids.filter((k) => k.h).length;
  const sym = symOf(node.z);
  const head = sym + (nH ? 'H' + sub(nH) : '');
  const ord = (k) => k.bo || 1;
  const mark = (o) => (o === 2 ? '=' : o === 3 ? '≡' : '');
  const parts = real.map((k) => ({ s: mark(ord(k)) + condensed(k, ord(k)), k }));
  if (!parts.length) return head;
  parts.sort((x, y) => (y.k.z - x.k.z) || (x.s.length - y.s.length) || (x.s < y.s ? -1 : x.s > y.s ? 1 : 0));
  const groups = [];
  parts.forEach((p) => { const prev = groups[groups.length - 1]; if (prev && prev.s === p.s) prev.n++; else groups.push({ s: p.s, n: 1 }); });
  let out = head;
  groups.forEach((gp, i) => { out += (i < groups.length - 1 || gp.n > 1) ? '(' + gp.s + ')' + sub(gp.n) : gp.s; });
  return out;
}

/** "(C,C,H)": the atoms attached to the node, highest first (duplicates included, as the rules count them). */
export function attachedSet(node) {
  return '(' + sortedKids(node).map((k) => symOf(k.z)).join(',') + ')';
}
/** The sets of attached atoms sphere by sphere: sphere 2 = atoms on the first atom, sphere 3 = atoms on those, ... */
export function sphereSets(node, upTo) {
  const out = [];
  let level = [node];
  for (let s = 2; s <= upTo; s++) {
    const kids = level.map(sortedKids);
    out.push(kids.filter((k) => k.length).map((k) => '(' + k.map((x) => symOf(x.z)).join(',') + ')').join(' ') || '–');
    level = kids.flat();
  }
  return out;
}
/** True when a duplicate atom (from a double or triple bond) is part of the first `upTo` spheres of the node. */
export function usesDuplicate(node, upTo) {
  let level = [node];
  for (let s = 2; s <= upTo; s++) {
    const kids = level.map(sortedKids).flat();
    if (kids.some((k) => k.dupe)) return true;
    level = kids;
  }
  return false;
}

function ringSize(g, bond) {
  // shortest ring through the bond (BFS from b to a without using the bond itself), or 0
  const dist = new Map([[bond.b, 0]]); const q = [bond.b];
  while (q.length) {
    const v = q.shift();
    for (const { to } of g.atoms[v].nbrs) {
      if ((v === bond.b && to === bond.a)) continue;
      if (!dist.has(to)) { dist.set(to, dist.get(v) + 1); q.push(to); }
    }
  }
  return dist.has(bond.a) ? dist.get(bond.a) + 1 : 0;
}

/**
 * Every C=C of the molecule with its CIP reading:
 * { a, b, ends:[{atom, subs:[{atom|null, node, label}], hi, lo, tie, sphere}], capable, ring, label:'E'|'Z'|null, bond }
 *   capable: each carbon has two different groups (and the double bond is not in a ring smaller than 8, and not cumulated)
 *   label  : only when the SMILES fixes the geometry
 */
export function ezInfo(smiles) {
  const g = readGraph(smiles);
  if (!g) return null;
  const out = [];
  for (const bd of g.bonds) {
    if (bd.bo !== 2 || g.atoms[bd.a].z !== 6 || g.atoms[bd.b].z !== 6) continue;
    const ends = [[bd.a, bd.b], [bd.b, bd.a]].map(([a, b]) => {
      const subs = substituents(g, a, b);
      subs.forEach((s) => { s.label = s.atom === null ? 'H' : condensed(s.node); });
      let hi = 0, tie = true, sphere = 1;
      if (subs.length === 2) {
        const c = compare(subs[0].node, subs[1].node);
        tie = c.cmp === 0; sphere = c.sphere;
        hi = c.cmp >= 0 ? 0 : 1;
      }
      return { atom: a, subs, hi, lo: 1 - hi, tie, sphere, nsubs: subs.length };
    });
    const cumulated = [bd.a, bd.b].some((v) => g.atoms[v].nbrs.some((n) => n.bo === 2 && !(n.to === bd.a || n.to === bd.b)));
    const rs = ringSize(g, bd);
    const capable = ends.every((e) => e.nsubs === 2 && !e.tie) && !cumulated && (rs === 0 || rs >= 8);
    let label = null;
    if (capable && (bd.stereo === 'cis' || bd.stereo === 'trans')) {
      // sa/sb are the reference neighbours on the a and b ends; cis = same side
      const [ea, eb] = ends; // ea belongs to atom bd.a
      const hiA = ea.subs[ea.hi].atom, hiB = eb.subs[eb.hi].atom;
      const sideA = hiA === bd.sa ? 0 : 1;
      const sideB = hiB === bd.sb ? (bd.stereo === 'cis' ? 0 : 1) : (bd.stereo === 'cis' ? 1 : 0);
      label = sideA === sideB ? 'Z' : 'E';
    }
    out.push({ a: bd.a, b: bd.b, ends, capable, ring: rs, cumulated, label, bond: bd });
  }
  return out;
}

/** Which two atoms of the bond sit on the same side? Used by the 3D check and the drawing test. */
export function higherAtoms(smiles, a, b) {
  const info = ezInfo(smiles).find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  if (!info) return null;
  return info.ends.map((e) => e.subs[e.hi].atom);
}
