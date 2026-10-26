// Electrophilic aromatic substitution on rings with one, two or more groups: the professor's rules (study-guide/prof/p07 to p11), on top of
// engine/reactions-aromatic.js (Lessons 13 and 14). Pure logic, no DOM. Every product is BUILT here by editing the molecule graph of the substrate
// (a group added at a ring position, a group removed, a D put in), then written as canonical SMILES by RDKit; no product SMILES is typed.
//
//   ringScan(smiles)          the benzene ring, the groups on it (class, rank, ortho/para or meta), D atoms, open positions
//   orient(scan, opts)        WHERE E+ goes: the professor's rules, in order
//                               1. one group: its own direction (o/p or meta)
//                               2. o/p directors beat meta directors ("all o,p directors dominate over meta directors")
//                               3. different classes: the superior class decides (NH2, OH, NR2 > OR, OCOR, NHCOR > R, Ar > halogens > meta)
//                               4. same class: a mixture of every position those groups point to ("horrible mixtures")
//                               5. a meta director meta to an o/p director: E+ goes ORTHO to the meta director ("ortho effect")
//                               6. the carbon between two groups that are meta to each other: low (minor) unless it is the only place left
//   substituteRing(sub, E)    the products with shares {products:[{smiles, share, label}], rule, why, warnings, noReaction?}
//   ipso / deuteration / desulfonation / Friedel-Crafts limits and carbocation rearrangement (1-chloropropane -> isopropylbenzene)
// Shares are the professor's numbers where he gives them (page 8 partial rate factors for nitration, page 9 examples, page 11 benzoyl chloride),
// otherwise null (the UI then says "major", "minor" or "mixture").
import { rdkit, canon, SYMBOL } from './chem.js';
import { toSmiles } from './resonance.js';
import { findRing, relation } from './naming-arene.js';
import { ringGroups, DIRECTORS } from './reactions-aromatic.js';

// ---------------------------------------------------------------- a small molecule graph that keeps D (deuterium) atoms
/** {el[], h[], q[], bonds:[{a,b,o}]} from SMILES; Kekule bond orders (RDKit's JSON); a [2H] atom has el 'D'. */
export function readG(smiles) {
  let m = null;
  try { m = rdkit().get_mol(smiles); } catch (e) { m = null; }
  if (!m) return null;
  try {
    const j = JSON.parse(m.get_json()).molecules[0];
    const el = [], h = [], q = [];
    j.atoms.forEach((a) => { const z = a.z ?? 6; el.push(z === 1 && a.isotope === 2 ? 'D' : SYMBOL[z] || '?'); h.push(a.impHs ?? 0); q.push(a.chg ?? 0); });
    if (el.includes('?')) return null;
    return { el, h, q, bonds: (j.bonds || []).map((b) => ({ a: b.atoms[0], b: b.atoms[1], o: b.bo ?? 1 })) };
  } finally { m.delete(); }
}
export const cloneG = (G) => ({ el: G.el.slice(), h: G.h.slice(), q: G.q.slice(), bonds: G.bonds.map((b) => ({ ...b })) });
export const nbrsG = (G, i) => G.bonds.filter((b) => b.a === i || b.b === i).map((b) => (b.a === i ? b.b : b.a));
export const bondG = (G, i, j) => G.bonds.find((b) => (b.a === i && b.b === j) || (b.a === j && b.b === i)) || null;
/** Canonical SMILES of a graph (RDKit), or null. */
export function writeG(G) {
  const st = { el: G.el.map((e) => (e === 'D' ? '2H' : e)), impH: G.h, charge: G.q, bonds: G.bonds.map((b) => ({ a: b.a, b: b.b, order: b.o })) };
  return canon(toSmiles(st));
}
/** Remove a set of atoms; returns {G, map(old -> new)}. */
export function dropG(G, drop) {
  const keep = G.el.map((_, i) => i).filter((i) => !drop.has(i));
  const idx = new Map(keep.map((o, k) => [o, k]));
  return { G: { el: keep.map((o) => G.el[o]), h: keep.map((o) => G.h[o]), q: keep.map((o) => G.q[o]), bonds: G.bonds.filter((b) => !drop.has(b.a) && !drop.has(b.b)).map((b) => ({ a: idx.get(b.a), b: idx.get(b.b), o: b.o })) }, map: idx };
}
/** Join fragment F (a closed-shell molecule H-R, atom `fAt` is the one that bonds) to atom `at` of G: one H leaves each side (or the D on `at`). */
export function joinG(G, at, F, fAt = 0) {
  const out = cloneG(G);
  const dOn = nbrsG(out, at).find((k) => out.el[k] === 'D');
  const off = out.el.length;
  F.el.forEach((e, i) => { out.el.push(e); out.h.push(F.h[i]); out.q.push(F.q[i]); });
  F.bonds.forEach((b) => out.bonds.push({ a: b.a + off, b: b.b + off, o: b.o }));
  if (out.h[off + fAt] > 0) out.h[off + fAt] -= 1;
  out.bonds.push({ a: at, b: off + fAt, o: 1 });
  if (dOn !== undefined) return dropG(out, new Set([dOn])).G;
  out.h[at] -= 1;
  return out;
}
const fragOf = (smiles) => { const F = readG(smiles); if (!F) throw new Error('bad fragment ' + smiles); return F; };

// ---------------------------------------------------------------- the groups (professor's three classes, and his ranking inside them)
/** cls = the professor's class (1 strongly activating o/p, 2 alkyl/aryl and halogens, 3 meta directors); rank orders the hierarchy on page 9. */
const CLASS_OF = {
  NH2: { cls: 1, rank: 6 }, NHR: { cls: 1, rank: 6 }, NR2: { cls: 1, rank: 6 }, OH: { cls: 1, rank: 6 },
  OR: { cls: 1, rank: 5 }, OCOR: { cls: 1, rank: 5 }, NHCOR: { cls: 1, rank: 5 },
  alkyl: { cls: 2, rank: 4 }, phenyl: { cls: 2, rank: 4 }, alkenyl: { cls: 2, rank: 4 }, alkylX: { cls: 2, rank: 4 },
  F: { cls: 2, rank: 3 }, Cl: { cls: 2, rank: 3 }, Br: { cls: 2, rank: 3 }, I: { cls: 2, rank: 3 }
};
const META_IDS = ['NO2', 'CN', 'SO3H', 'CHO', 'COR', 'COOH', 'COOR', 'NR3', 'CX3'];
const LABEL = { OCOR: '–OCOR', alkenyl: '–CH=CH₂', alkylX: '–CH₂X', CX3: '–CX₃', NH3: '–NH₃⁺' };
export const CLASS_NAME = { 1: 'class 1 (strongly activating, ortho/para)', 2: 'class 2 (alkyl groups and halogens, ortho/para)', 3: 'class 3 (meta directors, deactivating)' };
export const CLASS_SHORT = { 1: 'class 1', 2: 'class 2', 3: 'class 3' };
export const isAmine = (id) => ['NH2', 'NHR', 'NR2'].includes(id);

/** Text for an alkyl group, from its atoms (–CH₃, –CH₂CH₃, –CH(CH₃)₂, –C(CH₃)₃, else –R). */
function alkylText(G, att, comp) {
  const cs = comp.filter((i) => G.el[i] === 'C');
  if (cs.length !== comp.length) return '–R';
  const cn = nbrsG(G, att).filter((k) => G.el[k] === 'C').length;   // includes the ring carbon
  if (cs.length === 1) return '–CH₃';
  if (cs.length === 2) return '–CH₂CH₃';
  if (cs.length === 3) return cn === 2 ? '–CH₂CH₂CH₃' : '–CH(CH₃)₂';
  if (cs.length === 4 && cn === 4) return '–C(CH₃)₃';
  return '–R';
}
/** Classify one group (atoms `comp`, bonded to the ring at `att`): the course table (DIRECTORS, by SMARTS on the one-group model ring), else the extra groups here. */
function classify(G, ring, p, att, comp) {
  // the one-group model: the ring plus this group only (D atoms dropped), so the table's SMARTS see exactly this group
  const keep = new Set([...ring, ...comp].filter((i) => G.el[i] !== 'D'));
  const drop = new Set(G.el.map((_, i) => i).filter((i) => !keep.has(i)));
  const { G: M, map } = dropG(G, drop);
  ring.forEach((r) => { const k = map.get(r); const lost = nbrsG(G, r).filter((x) => drop.has(x)).length; M.h[k] += lost; });
  const mono = writeG(M);
  let id = null;
  const P = mono ? ringGroups(mono) : { ok: false };
  if (P.ok && P.subs.length === 1) id = P.subs[0].id;
  const out = { pos: p, att, comp, model: mono };
  if (id) {
    const tBu = id === 'alkyl' && G.h[att] === 0 && nbrsG(G, att).filter((k) => G.el[k] === 'C' && !ring.includes(k) && G.h[k] === 3).length === 3 && comp.length === 4;
    const label = id === 'alkyl' ? alkylText(G, att, comp) : DIRECTORS[id].label;
    if (META_IDS.includes(id)) return { ...out, id, cls: 3, rank: 1, dir: 'm', label, name: DIRECTORS[id].name, tBu: false };
    return { ...out, id, ...CLASS_OF[id], dir: 'op', label, name: DIRECTORS[id].name, tBu };
  }
  // groups the course table does not list
  const a = G.el[att];
  const nb = nbrsG(G, att).filter((k) => !ring.includes(k));
  if (a === 'O' && nb.length === 1 && G.el[nb[0]] === 'C' && nbrsG(G, nb[0]).some((k) => G.el[k] === 'O' && bondG(G, nb[0], k).o === 2)) return { ...out, id: 'OCOR', ...CLASS_OF.OCOR, dir: 'op', label: LABEL.OCOR, name: 'acyloxy (ester O)' };
  if (a === 'C') {
    const multi = nb.some((k) => bondG(G, att, k).o >= 2);
    const hal = nb.filter((k) => ['F', 'Cl', 'Br', 'I'].includes(G.el[k])).length;
    if (!multi && hal >= 2) return { ...out, id: 'CX3', cls: 3, rank: 1, dir: 'm', label: LABEL.CX3, name: 'trihalomethyl' };
    if (!multi && comp.every((i) => ['C', 'D', 'F', 'Cl', 'Br', 'I', 'O'].includes(G.el[i]))) return { ...out, id: 'alkylX', ...CLASS_OF.alkylX, dir: 'op', label: hal === 1 && comp.length === 2 ? '–CH₂' + G.el[nb.find((k) => G.el[k] !== 'C')] : '–R', name: 'substituted alkyl' };
    if (multi && nb.some((k) => G.el[k] === 'C' && bondG(G, att, k).o >= 2) && comp.every((i) => G.el[i] === 'C')) return { ...out, id: 'alkenyl', ...CLASS_OF.alkenyl, dir: 'op', label: LABEL.alkenyl, name: 'alkenyl' };
  }
  return null;
}

/**
 * ringScan(smiles) -> {ok:true, G, ring:[6 atom indices], groups:[...], dpos:Set(ring positions carrying D), open:[ring positions without a group]} or {ok:false, code, why}.
 */
export function ringScan(smiles) {
  const G = readG(smiles);
  if (!G) return { ok: false, code: 'parse', why: 'That structure cannot be read.' };
  const info = { atoms: G.el.map((sym, idx) => ({ idx, sym, nbrs: nbrsG(G, idx) })), bonds: G.bonds.map((b) => ({ atoms: [b.a, b.b], bo: b.o })) };
  const ring = findRing(info);
  if (!ring) return { ok: false, code: 'noRing', why: 'There is no benzene ring in this molecule.' };
  const ringSet = new Set(ring);
  const groups = [], dpos = new Set(), taken = new Set(ring);
  for (let p = 0; p < 6; p++) {
    const extra = nbrsG(G, ring[p]).filter((k) => !ringSet.has(k));
    const ds = extra.filter((k) => G.el[k] === 'D');
    const heavy = extra.filter((k) => G.el[k] !== 'D');
    ds.forEach((k) => taken.add(k));
    if (ds.length) dpos.add(p);
    if (heavy.length > 1 || (heavy.length && ds.length)) return { ok: false, code: 'fused', why: 'A ring carbon with two outside bonds (a fused ring) is not modelled.' };
    if (!heavy.length) continue;
    const att = heavy[0];
    const comp = new Set([att]); const st = [att];
    while (st.length) { const v = st.pop(); for (const w of nbrsG(G, v)) if (!ringSet.has(w) && !comp.has(w)) { comp.add(w); st.push(w); } }
    if ([...comp].some((v) => taken.has(v))) return { ok: false, code: 'fused', why: 'Two groups on this ring are joined to each other (a fused ring): not modelled.' };
    comp.forEach((v) => taken.add(v));
    const g = classify(G, ring, p, att, [...comp]);
    if (!g) return { ok: false, code: 'unknownGroup', why: 'This ring carries a group that is not in the professor’s three classes (or the course table), so where E⁺ goes is not modelled.' };
    groups.push(g);
  }
  if (taken.size !== G.el.length) return { ok: false, code: 'fragments', why: 'Only one molecule at a time, please.' };
  return { ok: true, G, ring, groups, dpos, open: [0, 1, 2, 3, 4, 5].filter((q) => !groups.some((g) => g.pos === q)) };
}

// ---------------------------------------------------------------- where E+ goes
const OP = ['ortho', 'para'];
const relText = (g, q) => `${relation(g.pos, q)} to ${g.label}`;
export function targetsOf(g, open) { return open.filter((q) => (g.dir === 'm' ? relation(g.pos, q) === 'meta' : OP.includes(relation(g.pos, q)))); }
/** Is ring position q squeezed between two groups that are meta to each other (the 2-position of a 1,3-disubstituted ring)? */
export function isBetween(groups, q) {
  const os = groups.filter((g) => relation(g.pos, q) === 'ortho');
  return os.some((a, i) => os.some((b, j) => j > i && relation(a.pos, b.pos) === 'meta'));
}
const uniq = (a) => [...new Set(a)];

/**
 * orient(scan, {amineAcid}) -> {cands:[ring positions], rule, leaders:[groups], between:[positions], oePairs, why}
 *   amineAcid: in strong acid (HNO3, SO3, D2SO4 in H2SO4) an amine N is protonated (-NH3+, -NR2H+): a meta director (the hub's "amine in acid" card).
 */
export function orient(scan, opts = {}) {
  const groups = scan.groups.map((g) => (opts.amineAcid && isAmine(g.id) ? { ...g, cls: 3, rank: 1, dir: 'm', protonated: true, label: g.id === 'NH2' ? '–NH₃⁺' : g.id === 'NHR' ? '–NH₂R⁺' : '–NHR₂⁺' } : g));
  const open = scan.open;
  if (!groups.length) return { groups, cands: open.slice(), rule: 'benzene', leaders: [], between: [] };
  const op = groups.filter((g) => g.dir === 'op'), mg = groups.filter((g) => g.dir === 'm');
  let cands, rule, leaders, oePairs = [];
  if (op.length) {
    const top = Math.min(...op.map((g) => g.cls));
    leaders = op.filter((g) => g.cls === top);
    cands = uniq(leaders.flatMap((g) => targetsOf(g, open)));
    if (groups.length === 1) rule = 'single-op';
    else if (leaders.length > 1) rule = 'same-class';
    else if (op.length > 1) rule = 'superior-class';
    else rule = 'op-over-meta';
    // do all groups agree? (then it is simply reinforcement, whatever the classes)
    const all = groups.map((g) => targetsOf(g, open));
    if (groups.length > 1 && cands.length && cands.every((q) => all.every((t) => t.includes(q))) && all.every((t) => t.every((q) => cands.includes(q)))) rule = 'reinforce';
    oePairs = mg.flatMap((M) => leaders.filter((D) => relation(M.pos, D.pos) === 'meta').map((D) => [M, D]));
    if (oePairs.length) {
      const oe = cands.filter((q) => oePairs.some(([M, D]) => relation(M.pos, q) === 'ortho' && targetsOf(D, open).includes(q)));
      if (oe.length) { cands = oe; rule = 'ortho-effect'; }
    }
  } else {
    leaders = mg;
    cands = uniq(mg.flatMap((g) => targetsOf(g, open)));
    rule = mg.length === 1 ? 'single-meta' : 'meta-meta';
  }
  const between = cands.filter((q) => isBetween(groups, q));
  return { groups, cands, rule, leaders, between, oePairs };
}

// ---------------------------------------------------------------- the professor's numbers
/** key of a ring position: its relation to every group, written id:relation, sorted (equivalent positions get the same key). */
const posKey = (groups, q) => groups.map((g) => `${g.id}:${relation(g.pos, q)}`).sort().join('|');
const K = (...pairs) => pairs.map(([id, rel]) => `${id}:${rel}`).sort().join('|');
/** Page 9 examples: isomer percentages for E+ on rings with two groups (his numbers as written; positions with 0 are left out). */
const P9 = [
  { smiles: 'COc1ccccc1F', name: 'o-fluoroanisole', shares: [[K(['OR', 'ortho'], ['F', 'meta']), 66], [K(['OR', 'para'], ['F', 'meta']), 31]], note: 'superior class: OCH₃ (class 1) beats F (class 2)' },
  { smiles: 'OC(=O)c1cccc(Br)c1', name: '3-bromobenzoic acid', shares: [[K(['COOH', 'ortho'], ['Br', 'para']), 87], [K(['COOH', 'ortho'], ['Br', 'ortho']), 13]], note: 'Br (an o,p director) beats COOH (meta)' },
  { smiles: 'Cc1ccccc1Cl', name: 'o-chlorotoluene', shares: [[K(['alkyl', 'meta'], ['Cl', 'ortho']), 19], [K(['alkyl', 'para'], ['Cl', 'meta']), 17], [K(['alkyl', 'meta'], ['Cl', 'para']), 43], [K(['alkyl', 'ortho'], ['Cl', 'meta']), 21]], note: 'same class (CH₃ and Cl): a mixture' },
  { smiles: 'Cc1ccc(Cl)cc1', name: 'p-chlorotoluene', shares: [[K(['alkyl', 'ortho'], ['Cl', 'meta']), 58], [K(['alkyl', 'meta'], ['Cl', 'ortho']), 42]], note: 'same class (CH₃ and Cl): a mixture' },
  { smiles: 'OC(=O)c1ccccc1C(=O)O', name: 'phthalic acid', shares: [[K(['COOH', 'ortho'], ['COOH', 'meta']), 50], [K(['COOH', 'meta'], ['COOH', 'para']), 50]], note: 'same class (two COOH): a mixture' },
  { smiles: 'COc1ccccc1NC(C)=O', name: '2-methoxyacetanilide', shares: [[K(['NHCOR', 'ortho'], ['OR', 'meta']), 2], [K(['NHCOR', 'meta'], ['OR', 'para']), 14], [K(['NHCOR', 'para'], ['OR', 'meta']), 84], [K(['NHCOR', 'meta'], ['OR', 'ortho']), 0]], note: 'same class (NHCOCH₃ and OCH₃): a mixture' },
  { smiles: 'Clc1cccc(Cl)c1', name: 'm-dichlorobenzene', shares: [[K(['Cl', 'ortho'], ['Cl', 'ortho']), 4], [K(['Cl', 'ortho'], ['Cl', 'para']), 96], [K(['Cl', 'meta'], ['Cl', 'meta']), 0]], note: 'the carbon between the two Cl: low' },
  { smiles: 'Cc1cccc(Cl)c1', name: 'm-chlorotoluene', shares: [[K(['alkyl', 'ortho'], ['Cl', 'ortho']), 9], [K(['alkyl', 'ortho'], ['Cl', 'para']), 59], [K(['alkyl', 'para'], ['Cl', 'ortho']), 32]], note: 'the carbon between CH₃ and Cl: low' }
];
let P9_BY = null;
const p9For = (can) => { if (!P9_BY) P9_BY = Object.fromEntries(P9.map((e) => [canon(e.smiles), e])); return P9_BY[can] || null; };
export const PROF_P9 = P9;
/** Page 8: partial rate factors for nitration (relative to one position of benzene = 1), and protodedeuteration of anisole. */
const PRF = [
  { smiles: 'Cc1ccccc1', kind: 'nitro', f: { ortho: 47, meta: 3, para: 62 } },
  { smiles: 'CC(C)(C)c1ccccc1', kind: 'nitro', f: { ortho: 5.5, meta: 4, para: 75 } },
  { smiles: 'ClCc1ccccc1', kind: 'nitro', f: { ortho: 0.29, meta: 0.14, para: 0.95 } },
  { smiles: 'Fc1ccccc1', kind: 'nitro', f: { ortho: 0.06, meta: 0, para: 0.8 } },
  { smiles: 'Clc1ccccc1', kind: 'nitro', f: { ortho: 0.03, meta: 0.0009, para: 0.14 } },
  { smiles: 'Brc1ccccc1', kind: 'nitro', f: { ortho: 0.03, meta: 0.0011, para: 0.11 } },
  { smiles: 'Ic1ccccc1', kind: 'nitro', f: { ortho: 0.2, meta: 0.01, para: 0.6 } },
  { smiles: 'O=[N+]([O-])c1ccccc1', kind: 'nitro', f: { ortho: 1.8e-6, meta: 28e-6, para: 0.2e-6 } },
  { smiles: 'CCOC(=O)c1ccccc1', kind: 'nitro', f: { ortho: 1e-4, meta: 2.5e-4, para: 0.24e-4 } },
  { smiles: 'COc1ccccc1', kind: 'D', f: { ortho: 6e4, meta: 0.3, para: 2e4 } }
];
let PRF_BY = null;
const prfFor = (can, kind) => { if (!PRF_BY) PRF_BY = Object.fromEntries(PRF.map((e) => [canon(e.smiles) + '|' + e.kind, e])); return PRF_BY[can + '|' + kind] || null; };
export const PROF_PRF = PRF;
/** Page 11: toluene + benzoyl chloride / AlCl3: 9 % ortho, 1 % meta, 90 % para. */
const BULKY_NUMBERS = [{ smiles: 'Cc1ccccc1', reagent: 'PhCOCl', f: { ortho: 9, meta: 1, para: 90 } }];
/** Page 10 yields the professor quotes (isolated product). */
const YIELDS = [
  { smiles: 'O=Cc1ccccc1', kind: 'nitro', text: '75–84 % yield, 1 isomer (page 10)' },
  { smiles: 'O=[N+]([O-])c1ccccc1', kind: 'Br', text: '60–75 % yield, 1 isomer (page 10)' },
  { smiles: 'Brc1ccccc1', kind: 'nitro', text: '72 % of pure para product after recrystallisation (page 10)' },
  { smiles: 'Clc1ccccc1', kind: 'Br', text: '60 % of pure para product after recrystallisation (page 10)' }
];
const yieldFor = (can, kind) => { const y = YIELDS.find((x) => canon(x.smiles) === can && x.kind === kind); return y ? y.text : null; };

// ---------------------------------------------------------------- the electrophiles
/**
 * kind: what the ring gains. frag = the closed-shell molecule H-G whose atom `at` bonds to the ring (one H leaves it). bulky: mainly para with an o/p director.
 * acid: run in strong acid (an amine N is protonated). weak: a weak electrophile that needs an activated or at least not deactivated ring.
 */
export const ELECTROPHILES = {
  Br: { kind: 'Br', frag: 'Br', E: 'Br⁺', text: 'Br' },
  Cl: { kind: 'Cl', frag: 'Cl', E: 'Cl⁺', text: 'Cl' },
  I: { kind: 'I', frag: 'I', E: 'I⁺', text: 'I', weak: true },
  nitro: { kind: 'nitro', frag: '[N+](=O)[O-]', E: 'NO₂⁺', text: 'NO₂', acid: true },
  sulfo: { kind: 'sulfo', frag: 'S(=O)(=O)O', E: 'HSO₃⁺', text: 'SO₃H', acid: true, bulky: true },
  D: { kind: 'D', frag: '[2H]', E: 'D⁺', text: 'D', acid: true },
  CH2Cl: { kind: 'CH2Cl', frag: 'CCl', E: '⁺CH₂Cl (from CH₂O, HCl, ZnCl₂)', text: 'CH₂Cl', fc: true }
};

// ---------------------------------------------------------------- products
/** Put fragment F (atom fAt bonds) on ring position q. */
function placeAt(scan, q, F, fAt = 0) { return writeG(joinG(scan.G, scan.ring[q], F, fAt)); }
function relLabel(groups, q) { return groups.length ? groups.map((g) => relText(g, q)).join(', ') : 'any ring carbon (all six are alike)'; }

/** Merge positions that give the same compound; shares are per compound. */
function collect(scan, positions, F, fAt, shareOf, labelOf) {
  const out = [];
  for (const q of positions) {
    const smi = placeAt(scan, q, F, fAt);
    if (!smi) continue;
    const s = shareOf(q);
    const prev = out.find((p) => p.smiles === smi);
    if (prev) { if (prev.share != null && s != null && prev.sumShares) prev.share += s; prev.positions.push(q); continue; }
    out.push({ smiles: smi, share: s, label: labelOf(q), positions: [q], sumShares: false });
  }
  return out;
}

const pct = (x) => Math.round(x * 10) / 10;
const RULE = {
  benzene: { name: 'Benzene: all six ring carbons are alike', cave: 'Benzene: six C all same.' },
  'single-op': { name: 'Ortho, para director', cave: 'o,p director: E⁺ go ortho and para.' },
  'single-meta': { name: 'Meta-orienting compound: pure compound, high yield (1 isomer)', cave: 'Meta director: one isomer, meta.' },
  'superior-class': { name: 'Different classes: the superior class dominates', cave: 'Different class: stronger class boss.' },
  'op-over-meta': { name: 'All o,p directors dominate over meta directors', cave: 'o,p director beat meta director.' },
  'same-class': { name: 'Same class: horrible mixtures!', cave: 'Same class: big mixture.' },
  reinforce: { name: 'The groups agree: they point to the same carbons', cave: 'Groups agree. Same carbons.' },
  'ortho-effect': { name: 'Ortho effect: E⁺ goes ortho to the meta director', cave: 'Ortho effect: E⁺ go ortho to meta group.' },
  'meta-meta': { name: 'Two meta directors: same class, a mixture of their meta positions', cave: 'Two meta groups: their meta spots.' },
  equivalent: { name: 'Same class, but every place they point to is the same compound', cave: 'Same class, but all spots same product.' },
  'between-low': { name: 'Substitution at the carbon between 2 substituents: low', cave: 'Between two groups: low.' }
};
export const RING_RULES = RULE;

/** The sentence that explains WHERE (class, hierarchy, the named rule). */
function whereWhy(o, E) {
  const g = o.groups, L = o.leaders;
  const lab = (x) => `${x.label} (${CLASS_SHORT[x.cls]})`;
  switch (o.rule) {
    case 'benzene': return `Benzene has six identical C–H carbons, so ${E.E} can replace any one of them: one product.`;
    case 'single-op': return `${lab(g[0])} is an ortho/para director (${CLASS_NAME[g[0].cls]})${g[0].rank === 3 ? '; halogens are the professor’s ortho/para directing but DEACTIVATING group, so the ring reacts more slowly than benzene' : g[0].cls === 1 ? ' and activates the ring strongly' : ' and activates the ring'}. In ortho or para attack one σ-complex form puts the + on the carbon that holds the group, which the group stabilises; meta attack cannot do that. So ${E.E} goes ortho and para.`;
    case 'single-meta': return `${lab(g[0])} is a meta director (class 3, deactivating). Ortho or para attack would put the + next to the group’s δ+ atom; meta attack avoids it. The professor: a meta-orienting compound gives one isomer in high yield.`;
    case 'superior-class': return `Two o/p directors from different classes: ${L.map(lab).join(' and ')} outranks ${g.filter((x) => !L.includes(x)).map(lab).join(' and ')}. The professor’s hierarchy is NH₂, OH, NR₂ > OR, OCOR, NHCOR > R, Ar > halogens > meta directors, and the superior class decides.`;
    case 'op-over-meta': return `${lab(L[0])} is an ortho/para director and ${g.filter((x) => x.dir === 'm').map(lab).join(' and ')} a meta director. The professor: all o,p directors dominate over meta directors, so ${L[0].label} decides.`;
    case 'same-class': return `${L.map(lab).join(' and ')} are in the same class, so neither wins: E⁺ goes to every place either one points to. The professor calls this a horrible mixture.`;
    case 'reinforce': return `The groups (${g.map(lab).join(', ')}) all point to the same carbons, so there is no conflict.`;
    case 'ortho-effect': return `${o.oePairs.map(([M, D]) => `${M.label} (meta director) is meta to ${D.label} (o/p director)`).join('; ')}. The professor’s ortho effect: the incoming E⁺ goes ORTHO to the meta-directing group rather than para to it.`;
    case 'meta-meta': return `Only meta directors on the ring (${g.map(lab).join(', ')}): each sends E⁺ meta to itself, and the two are the same class, so every such place is used.`;
    default: return '';
  }
}

/**
 * substituteRing(substrate, Ekey | electrophile object, opts) -> {ok, products:[{smiles, share, label, minor?}], rule, ruleName, why, warnings, scan, orient}
 *   opts.fragment / opts.fragAt: a Friedel-Crafts group (alkyl or acyl) given as a closed-shell molecule and its bonding atom; opts.reagent: reagent id (benzoyl chloride numbers)
 *   opts.bulky, opts.label (E+ text)
 */
export function substituteRing(substrate, Ekey, opts = {}) {
  const E = typeof Ekey === 'string' ? ELECTROPHILES[Ekey] : Ekey;
  const scan = ringScan(substrate);
  if (!scan.ok) return { ok: false, code: scan.code, why: scan.why };
  const can = canon(substrate);
  const F = opts.fragment ? opts.fragment : fragOf(E.frag);
  const fAt = opts.fragAt || 0;
  const bulky = !!(opts.bulky || E.bulky);
  const warnings = [];
  const o = orient(scan, { amineAcid: !!E.acid });
  if (o.groups.some((g) => g.protonated)) warnings.push({ id: 'amine-acid', text: 'In strong acid the amine N is protonated (–NH₃⁺ or –NR₂H⁺): it becomes a meta director. That is why this ring is treated as meta-directing here (the hub card “amine in acid”).' });
  if (!o.cands.length) return { ok: false, code: 'crowded', why: 'There is no open ring carbon that these groups send E⁺ to.' };
  const groups = o.groups;
  // shares: the professor's numbers where he gives them
  let shareOf = () => null, source = null;
  let positions = o.cands.slice();
  const p9 = groups.length >= 2 ? p9For(can) : null;
  const prf = groups.length === 1 ? prfFor(can, E.kind) : null;
  const bn = groups.length === 1 && opts.reagent ? BULKY_NUMBERS.find((x) => canon(x.smiles) === can && x.reagent === opts.reagent) : null;
  if (p9) {
    const tab = Object.fromEntries(p9.shares);
    positions = positions.filter((q) => tab[posKey(groups, q)] !== 0);
    shareOf = (q) => (tab[posKey(groups, q)] ?? null);
    source = `professor’s example, page 9 (${p9.name}: ${p9.note})`;
  } else if (prf || bn) {
    const f = (prf || bn).f;
    const g = groups[0];
    const counts = { ortho: 0, meta: 0, para: 0 };
    scan.open.forEach((q) => { counts[relation(g.pos, q)]++; });
    const tot = (prf ? ['ortho', 'meta', 'para'].reduce((s, r) => s + f[r] * counts[r], 0) : 100);
    positions = scan.open.filter((q) => (prf ? f[relation(g.pos, q)] * counts[relation(g.pos, q)] / tot >= 0.005 : f[relation(g.pos, q)] > 0));
    shareOf = (q) => { const r = relation(g.pos, q); return prf ? pct((100 * f[r] * counts[r]) / tot) : f[r]; };
    source = prf ? (E.kind === 'D' ? 'professor’s page 8: relative rates of D exchange at each position of anisole' : 'professor’s page 8: partial rate factors for nitration (rate at one position, benzene = 1)') : 'professor’s page 11: toluene + benzoyl chloride, AlCl₃';
  }
  // bulky electrophiles (acylium, t-butyl cation, HSO3+) with ONE o/p director: mainly para
  let bulkyApplied = false;
  if (bulky && groups.length === 1 && groups[0].dir === 'op' && !bn) {
    const g = groups[0];
    const para = positions.filter((q) => relation(g.pos, q) === 'para');
    if (para.length) {
      bulkyApplied = true;
      if (opts.paraOnly) positions = para;
    }
  }
  const labelOf = (q) => relLabel(groups, q);
  const products = collect(scan, positions, F, fAt, shareOf, labelOf);
  // minor / major marks
  products.forEach((p) => {
    const q = p.positions[0];
    p.between = o.between.includes(q);
    if (p.share != null) { p.minor = p.share < 15; }
    else if (bulkyApplied) { p.minor = relation(groups[0].pos, q) !== 'para'; if (!p.minor) p.major = true; }
    else if (p.between && products.some((x) => !o.between.includes(x.positions[0]))) p.minor = true;
    else if (groups.length === 1 && groups[0].dir === 'm') p.major = true;
  });
  // a t-butyl group is bulky: little substitution right next to it (page 8: t-butylbenzene, ortho 5.5 against para 75)
  const tbs = groups.filter((g) => g.tBu);
  if (tbs.length && products.some((p) => p.share == null)) {
    const nextTo = (p) => tbs.some((g) => relation(g.pos, p.positions[0]) === 'ortho');
    if (products.some(nextTo) && products.some((p) => !nextTo(p))) {
      products.forEach((p) => { if (nextTo(p)) { p.minor = true; p.major = false; } });
      warnings.push({ id: 'tbu-ortho', text: 'The t-butyl group is bulky, so E⁺ seldom goes right next to it (the professor’s page 8: t-butylbenzene nitrates ortho 5.5 against para 75). The place next to the smaller group wins; that is what makes t-butyl a good blocking group.' });
    }
  }
  // the between rule, said once
  let rule = o.rule;
  if ((rule === 'same-class' || rule === 'meta-meta') && products.length === 1) rule = 'equivalent';
  if (o.between.length && products.some((p) => p.between)) {
    const only = products.every((p) => p.between);
    warnings.push({ id: 'between-low', text: only ? 'The only carbon left is between two groups that are meta to each other. The professor: substitution there is normally LOW, so this reaction is slow; it is still the one place E⁺ can go here.' : 'The carbon between two groups that are meta to each other gets little product: E⁺ is unlikely to enter between two groups (the professor’s rule).' });
  }
  products.sort((a, b) => ((b.share ?? (b.minor ? -1 : b.major ? 101 : 50)) - (a.share ?? (a.minor ? -1 : a.major ? 101 : 50))));
  products.forEach((p) => { delete p.sumShares; });
  let why = rule === 'equivalent' ? `${o.leaders.map((x) => `${x.label} (${CLASS_SHORT[x.cls]})`).join(' and ')} are the same class and point to different carbons, but by symmetry every one of those carbons gives the same compound: one product.` : whereWhy(o, E);
  if (bulkyApplied || bn) why += opts.bulkyText || ' The electrophile here is bulky, so the crowded ortho positions lose out: mainly para (the professor: the bulky acylation agent forms more para with an o,p director).';
  const y = yieldFor(can, E.kind);
  if (y) warnings.push({ id: 'yield', text: 'Professor: ' + y + '.' });
  return {
    ok: true, scan, orient: o, rule, ruleName: RULE[rule] ? RULE[rule].name : rule, ruleCave: RULE[rule] ? RULE[rule].cave : '', why, source, warnings, products, bulky: bulkyApplied || !!bn,
    leaders: o.leaders.map((g) => ({ id: g.id, label: g.label, cls: g.cls, dir: g.dir }))
  };
}

// ---------------------------------------------------------------- the professor's second nitration (page 9: p-bromotoluene -> 2,3-dinitro-4-bromotoluene)
/**
 * When every mono-nitration product of a ring nitrates AGAIN by the ortho effect to the SAME dinitro compound, that compound is what excess HNO3 gives.
 * p-Bromotoluene: both 4-bromo-2-nitrotoluene and 4-bromo-3-nitrotoluene go on to 2,3-dinitro-4-bromotoluene, the professor's example. Returns the product or null.
 */
export function secondNitration(monoProducts) {
  const seconds = [];
  for (const m of monoProducts) {
    const r = substituteRing(m, 'nitro');
    if (!r.ok || r.rule !== 'ortho-effect' || r.products.length !== 1) return null;
    seconds.push(r.products[0].smiles);
  }
  const u = uniq(seconds);
  return u.length === 1 ? u[0] : null;
}

// ---------------------------------------------------------------- ipso substitution (blocking groups), deuteration, desulfonation
/**
 * Replace every t-butyl and/or SO3H group on the ring by H (H+, ipso) or D (D2SO4, D2O). which: 'both' | 'SO3H'.
 * Returns {smiles, removed:[labels]} or null when there is nothing to remove.
 */
export function ipsoRemove(substrate, which = 'both', withD = false) {
  const scan = ringScan(substrate);
  if (!scan.ok) return null;
  const hit = scan.groups.filter((g) => g.id === 'SO3H' || (which === 'both' && g.tBu));
  if (!hit.length) return null;
  let G = scan.G;
  const drop = new Set(hit.flatMap((g) => g.comp));
  const ringAtoms = hit.map((g) => scan.ring[g.pos]);
  const { G: G2, map } = dropG(G, drop);
  ringAtoms.forEach((r) => { const k = map.get(r); if (withD) { G2.el.push('D'); G2.h.push(0); G2.q.push(0); G2.bonds.push({ a: k, b: G2.el.length - 1, o: 1 }); } else G2.h[k] += 1; });
  return { smiles: writeG(G2), removed: hit.map((g) => g.tBu ? 't-butyl' : 'SO₃H'), groups: hit };
}
/** Every ring C-H exchanged for C-D (benzene with excess D2O, D2SO4: C6D6 on the professor's page 3). */
export function perdeuterate(substrate) {
  const scan = ringScan(substrate);
  if (!scan.ok) return null;
  const G = cloneG(scan.G);
  scan.open.forEach((q) => { const r = scan.ring[q]; if (G.h[r] > 0) { G.h[r] -= 1; G.el.push('D'); G.h.push(0); G.q.push(0); G.bonds.push({ a: r, b: G.el.length - 1, o: 1 }); } });
  return writeG(G);
}
/** Does the molecule contain D? */
export const hasD = (smiles) => /\[2H\]/.test(smiles || '');

// ---------------------------------------------------------------- Friedel-Crafts: the carbocation (and its rearrangement)
const carbonNbrs = (G, i) => nbrsG(G, i).filter((k) => G.el[k] === 'C');
/**
 * The carbocation a Friedel-Crafts alkylating agent gives, after the best 1,2-H or 1,2-CH3 shift (only shifts to a MORE substituted cation count).
 *   source: {type:'halide', smiles} (R-X + AlCl3 or FeCl3), {type:'alkene', smiles} (HF, BF3: H+ adds Markovnikov), {type:'alcohol', smiles} (BF3).
 * Returns {frag:G of R-H (closed shell), at: the cation carbon, cls0, cls, shifted:'H'|'CH3'|null, cationBefore, cationAfter (SMILES)}.
 */
export function fcCation(source) {
  const G0 = readG(source.smiles);
  if (!G0) throw new Error('bad alkylating agent');
  let G = cloneG(G0), at = -1;
  if (source.type === 'halide' || source.type === 'alcohol') {
    const x = G.el.findIndex((e, i) => (source.type === 'halide' ? ['Cl', 'Br', 'I', 'F'].includes(e) : e === 'O' && G.h[i] === 1));
    at = nbrsG(G, x)[0];
    const r = dropG(G, new Set([x])); G = r.G; at = r.map.get(at); G.h[at] += 1;   // R-H with the H where X was
  } else {
    const b = G.bonds.find((y) => y.o === 2 && G.el[y.a] === 'C' && G.el[y.b] === 'C');
    const [c1, c2] = [b.a, b.b];
    const n1 = carbonNbrs(G, c1).length, n2 = carbonNbrs(G, c2).length;
    at = n1 >= n2 ? c1 : c2;
    const other = at === c1 ? c2 : c1;
    b.o = 1; G.h[other] += 1; G.h[at] += 1;   // H+ on the less substituted carbon, the + on the other; as R-H the cation carbon gets an H back
  }
  const cationSmiles = (H, c) => { const C = cloneG(H); C.h[c] -= 1; C.q[c] = 1; return writeG(C); };
  const before = cationSmiles(G, at);
  const cls0 = carbonNbrs(G, at).length;
  let best = { G, at, cls: cls0, shifted: null };
  for (const k of carbonNbrs(G, at)) {
    // 1,2-H shift: the + moves to k (k must have an H to give)
    if (G.h[k] > 0) { const c = carbonNbrs(G, k).length; if (c > best.cls) best = { G, at: k, cls: c, shifted: 'H' }; }
    // 1,2-CH3 shift: a methyl on k moves to the old cation carbon
    for (const m of carbonNbrs(G, k)) {
      if (m === at || G.h[m] !== 3 || carbonNbrs(G, m).length !== 1) continue;
      const H = cloneG(G);
      const bi = H.bonds.findIndex((y) => (y.a === k && y.b === m) || (y.a === m && y.b === k));
      H.bonds.splice(bi, 1); H.bonds.push({ a: at, b: m, o: 1 });
      // as R-H: the old cation carbon keeps its H count minus the one the methyl replaced; k gains one H
      H.h[at] -= 1; H.h[k] += 1;
      const c = carbonNbrs(H, k).length;
      if (c > best.cls) best = { G: H, at: k, cls: c, shifted: 'CH3' };
    }
  }
  return { frag: best.G, at: best.at, cls0, cls: best.cls, shifted: best.shifted, cationBefore: before, cationAfter: cationSmiles(best.G, best.at) };
}
/** The acyl group of an acid chloride or anhydride, as the aldehyde R-CHO (the carbonyl C bonds to the ring). */
export function acylFrag(smiles) {
  const G = readG(smiles);
  const c = G.el.findIndex((e, i) => e === 'C' && nbrsG(G, i).some((k) => G.el[k] === 'O' && bondG(G, i, k).o === 2) && nbrsG(G, i).some((k) => G.el[k] === 'Cl' || (G.el[k] === 'O' && bondG(G, i, k).o === 1)));
  const lg = nbrsG(G, c).find((k) => G.el[k] === 'Cl' || (G.el[k] === 'O' && bondG(G, c, k).o === 1));
  // drop the leaving group (Cl, or the O-C(=O)R half of the anhydride)
  const drop = new Set([lg]);
  if (G.el[lg] === 'O') { const st = [lg]; while (st.length) { const v = st.pop(); for (const w of nbrsG(G, v)) if (w !== c && !drop.has(w)) { drop.add(w); st.push(w); } } }
  const r = dropG(G, drop);
  const at = r.map.get(c);
  r.G.h[at] += 1;
  return { frag: r.G, at };
}

/** Class (1, 2, 3) and summary of the ring's groups for the energy sketch: 'activating' | 'halogen' | 'meta' | 'benzene'. */
export function ringKind(scan, amineAcid = false) {
  if (!scan || !scan.ok || !scan.groups.length) return 'benzene';
  const o = orient(scan, { amineAcid });
  const L = o.leaders[0];
  if (!L) return 'benzene';
  if (L.dir === 'm') return 'meta';
  return L.rank === 3 ? 'halogen' : 'activating';
}
