// Alkene additions II (McMurry 4.4 to 4.7): halogens, hydrogen, epoxidation, epoxide opening, KMnO4 (basic: cis-diol; acidic: cleavage), radical polymers.
// Re-exported by engine/reactions.js (extends it additively; nothing of Lesson 09 changes).
//
// The new thing here is STEREOCHEMISTRY. The products are built from the geometry of the alkene:
//   * RDKit draws the alkene flat (a ring flat, E/Z as written); each C=C carbon then has three neighbours around it, seen from the "top" face.
//   * A reagent adds a group to the TOP or the BOTTOM face of a carbon. Looking at the new group from outside, the other three neighbours run
//     counter-clockwise (SMILES "@") when it comes from the top, clockwise ("@@") from the bottom.
//   * anti addition = one group on each face; syn addition = both on the same face. That alone fixes cis/trans, meso/racemic, and so on.
// Everything is graded by canonical isomeric SMILES; because every starting material here is achiral (or racemic), a chiral product forms as a
// racemate, so a chiral answer is accepted as either enantiomer (stereoKey: the smaller of canon(s) and canon(mirror(s))).
//
// Overall equations balance atoms and charge for the ORGANIC part. KMnO4 and RCO3H are shown the usual way, as "[O]" (one O atom from the oxidant),
// plus H2O where the equation needs it; for RCO3H an exact version with meta-chloroperoxybenzoic acid / meta-chlorobenzoic acid is also given.
import { canon, rdkit, coords2d } from './chem.js';
import * as G from './stereo-graph.js';
import { buildScene } from './widgets/mechanism-core.js';

// ---------------------------------------------------------------- reagents
export const REAGENTS2 = {
  Br2: { id: 'Br2', kind: 'halogen', X: 'Br', label: 'Br₂, CH₂Cl₂', short: 'Br₂', reactant: 'BrBr', rel: 'anti' },
  Cl2: { id: 'Cl2', kind: 'halogen', X: 'Cl', label: 'Cl₂, CH₂Cl₂', short: 'Cl₂', reactant: 'ClCl', rel: 'anti' },
  H2: { id: 'H2', kind: 'hydrogen', label: 'H₂, Pd/C', short: 'H₂/Pd', reactant: '[H][H]', rel: 'syn' },
  RCO3H: { id: 'RCO3H', kind: 'epoxide', label: 'RCO₃H (e.g. mCPBA)', short: 'RCO₃H', reactant: '[O]', rel: 'syn' },
  RCO3H_H3O: { id: 'RCO3H_H3O', kind: 'epoxide-diol', label: 'RCO₃H, then H₃O⁺', short: 'RCO₃H, then H₃O⁺', reactant: '[O]', rel: 'anti' },
  KMnO4_OH: { id: 'KMnO4_OH', kind: 'diol-syn', label: 'KMnO₄, OH⁻, H₂O', short: 'KMnO₄ / OH⁻', reactant: '[O]', rel: 'syn' },
  KMnO4_H: { id: 'KMnO4_H', kind: 'cleavage', label: 'KMnO₄, H₃O⁺', short: 'KMnO₄ / H₃O⁺', reactant: '[O]', rel: null }
};
export const REAGENT_IDS2 = ['Br2', 'Cl2', 'H2', 'RCO3H', 'RCO3H_H3O', 'KMnO4_OH', 'KMnO4_H'];
export const OXIDANT = '[O]';

/** The alkenes of the extended lab (also used by the mastery generator): rings and acyclic, E/Z written out where it matters. */
export const LAB_ALKENES2 = [
  { id: 'cyclopentene', smiles: 'C1=CCCC1' },
  { id: 'cyclohexene', smiles: 'C1=CCCCC1' },
  { id: '1-methylcyclohexene', smiles: 'CC1=CCCCC1' },
  { id: '1,2-dimethylcyclohexene', smiles: 'CC1=C(C)CCCC1' },
  { id: 'propene', smiles: 'CC=C' },
  { id: '2-methylpropene', smiles: 'CC(C)=C' },
  { id: 'hex-1-ene', smiles: 'CCCCC=C' },
  { id: '2-methylbut-2-ene', smiles: 'CC=C(C)C' },
  { id: '(E)-but-2-ene', smiles: 'C/C=C/C' },
  { id: '(Z)-but-2-ene', smiles: 'C/C=C\\C' }
];
export const ALKENE2_BY_ID = Object.fromEntries(LAB_ALKENES2.map((a) => [a.id, a]));

// ---------------------------------------------------------------- reading an alkene
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const unit = (v) => { const l = Math.hypot(v.x, v.y) || 1; return { x: v.x / l, y: v.y / l }; };

/** True when the bond c1-c2 lies in a ring (it can be left without disconnecting c1 from c2). */
function inRing(g, c1, c2) {
  const seen = new Set([c1]);
  const q = [c1];
  while (q.length) {
    const v = q.shift();
    for (const w of G.neighbours(g, v)) {
      if ((v === c1 && w === c2) || (v === c2 && w === c1)) continue;
      if (seen.has(w)) continue;
      if (w === c2) return true;
      seen.add(w); q.push(w);
    }
  }
  return false;
}
function ringSizeOf(g, c1, c2) {
  const dist = { [c1]: 0 };
  const q = [c1];
  while (q.length) {
    const v = q.shift();
    for (const w of G.neighbours(g, v)) {
      if ((v === c1 && w === c2) || (v === c2 && w === c1)) continue;
      if (dist[w] != null) continue;
      dist[w] = dist[v] + 1;
      if (w === c2) return dist[w] + 1;
      q.push(w);
    }
  }
  return 0;
}

/**
 * Facts about a simple alkene: a hydrocarbon with ONE C=C (acyclic or a ring of 3-7 members, or a larger ring only when its geometry is written).
 * {ok:true, g, c1, c2, ring, ringSize, stereogenic, specified, centers} or {ok:false, reason}.
 * opts.allowCenters: accept alkenes that already contain a stereocentre (fine for cleavage; additions would give diastereomers, so they are refused).
 */
export function alkeneInfo(smiles, opts = {}) {
  if (typeof smiles !== 'string' || !smiles) return { ok: false, reason: 'no structure' };
  if (/[a-z]/.test(smiles.replace(/Cl|Br/g, ''))) return { ok: false, reason: 'it has an aromatic ring (Chapter 5)' };
  let g;
  try { g = G.parse(smiles); } catch (e) { return { ok: false, reason: 'not a valid structure' }; }
  if (!canon(smiles)) return { ok: false, reason: 'not a valid structure' };
  if (g.atoms.some((a) => a.el !== 'C' || a.q !== 0)) return { ok: false, reason: 'only hydrocarbons without charges are covered' };
  if (g.bonds.some((b) => b.o > 2)) return { ok: false, reason: 'no triple or aromatic bonds here' };
  const dbl = g.bonds.filter((b) => b.o === 2);
  if (dbl.length !== 1) return { ok: false, reason: dbl.length ? 'only one C=C is covered here' : 'there is no C=C' };
  const { a: c1, b: c2 } = dbl[0];
  const Rk = rdkit();
  const m = Rk.get_mol(smiles);
  let json;
  try { json = JSON.parse(m.get_json()).molecules[0]; } finally { m.delete(); }
  const centers = stereoCounts(smiles)[0];
  if (centers > 0 && !opts.allowCenters) return { ok: false, reason: 'it already has a stereocentre, so the product would be a mixture of diastereomers (Chapter 6)' };
  const ring = inRing(g, c1, c2);
  const ringSize = ring ? ringSizeOf(g, c1, c2) : 0;
  const bondJ = json.bonds.find((b) => b.bo === 2);
  const specified = !!(bondJ && bondJ.stereo && bondJ.stereo !== 'unspecified');
  const ranks = (json.extensions && json.extensions[0] && json.extensions[0].cipRanks) || [];
  // stereogenic C=C: each carbon has two different groups (a hydrogen counts as a group)
  const different = (c, other) => {
    const nb = G.neighbours(g, c).filter((k) => k !== other);
    const h = g.atoms[c].h;
    if (h >= 2) return false;
    if (h === 1) return true;
    return nb.length === 2 && ranks[nb[0]] !== ranks[nb[1]];
  };
  const stereogenic = !ring && different(c1, c2) && different(c2, c1);
  return { ok: true, smiles, g, c1, c2, ring, ringSize, stereogenic, specified, centers, json };
}

/** Neighbours of an sp2 carbon c in the order they run COUNTER-CLOCKWISE when seen from above the drawing plane, starting at `partner`. */
function sp2Order(info, pos, c, partner) {
  const { g } = info;
  const nbs = G.neighbours(g, c);
  const h = g.atoms[c].h;
  const ang = (k) => Math.atan2(pos[k].y - pos[c].y, pos[k].x - pos[c].x);
  const aP = ang(partner);
  const items = nbs.map((k) => ({ tok: k, a: ang(k) }));
  if (h === 1 && nbs.length === 2) {
    const o = nbs.find((k) => k !== partner);
    const u = unit(sub(pos[partner], pos[c])), w = unit(sub(pos[o], pos[c]));
    items.push({ tok: 'H', a: Math.atan2(-(u.y + w.y), -(u.x + w.x)) });
  } else if (h === 2 && nbs.length === 1) {
    items.push({ tok: 'H', a: aP + (2 * Math.PI) / 3 }, { tok: 'H', a: aP - (2 * Math.PI) / 3 });
  } else if (!(h === 0 && nbs.length === 3)) throw new Error('not a planar sp2 carbon');
  const rel = (a) => (((a - aP) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return items.sort((p, q) => rel(p.a) - rel(q.a)).map((it) => it.tok);
}

// ---------------------------------------------------------------- building products
const newAtom = (g, a) => { g.atoms.push({ q: 0, h: 0, bracket: false, ...a }); return g.atoms.length - 1; };
const newBond = (g, a, b, o = 1) => { g.bonds.push({ a, b, o }); };

/** Put a group X on carbon c from the top ('top') or bottom face and record the chirality that geometry gives. */
function attach(info, pos, c, partner, X, face) {
  const order = sp2Order(info, pos, c, partner);
  const toks = [X, ...order];
  if (toks.filter((t) => t === 'H').length > 1) { delete info.work.atoms[c].chi; return; } // two identical hydrogens: not a stereocentre
  info.work.atoms[c].chi = { nb: toks, tag: face === 'top' ? '@' : '@@' };
}

function startWork(info) {
  const w = G.clone(info.g);
  info.work = w;
  info.pos = coords2d(info.smiles);
  return w;
}

/** Stereocentre counts of a SMILES: [all potential centres, centres left unspecified]. Uses RDKit's new stereo perception, which also sees pseudo-asymmetric centres. */
function stereoCounts(smiles) {
  const Rk = rdkit();
  Rk.use_legacy_stereo_perception(false);
  try {
    const m = Rk.get_mol(smiles);
    try { const d = JSON.parse(m.get_descriptors()); return [d.NumAtomStereoCenters || 0, d.NumUnspecifiedAtomStereoCenters || 0]; } finally { m.delete(); }
  } finally { Rk.use_legacy_stereo_perception(true); }
}

/**
 * Write the product and canonicalise it. A product with a single stereocentre is a racemate and is drawn flat (no marks); a product with several
 * centres keeps the marks (the RELATIVE configuration is the point). Refuses a product with a stereocentre the two C=C carbons did not make.
 */
function finish(g) {
  const w = G.write(g);
  let smiles = canon(w.smiles);
  const [n, unspecified] = stereoCounts(smiles);
  if (unspecified > 0 && n > 1) throw new Error('excluded: a further stereocentre would appear, so the product would be a mixture of diastereomers (Chapter 6)');
  if (n === 1) smiles = canon(w.smiles.replace(/@@?/g, ''));
  return { smiles, written: w.smiles, order: w.order, nCenters: n };
}

/** Add X (an element) across the double bond. faces = [face on c1, face on c2]. */
function addPairX(info, X, faces, opts = {}) {
  const g = startWork(info);
  const { c1, c2, pos } = info;
  const a1 = newAtom(g, { el: X, h: opts.h || 0 }), a2 = newAtom(g, { el: X, h: opts.h || 0 });
  newBond(g, c1, a1); newBond(g, c2, a2);
  G.bondOf(g, c1, c2).o = 1;
  attach(info, pos, c1, c2, a1, faces[0]);
  attach(info, pos, c2, c1, a2, faces[1]);
  return { g, a1, a2 };
}

function addHydrogens(info, faces) {
  const g = startWork(info);
  const { c1, c2, pos } = info;
  G.bondOf(g, c1, c2).o = 1;
  const before = [g.atoms[c1].h, g.atoms[c2].h];
  attach(info, pos, c1, c2, 'H', faces[0]);
  attach(info, pos, c2, c1, 'H', faces[1]);
  g.atoms[c1].h = before[0] + 1; g.atoms[c2].h = before[1] + 1;
  [c1, c2].forEach((c) => { if (g.atoms[c].chi && g.atoms[c].h !== 1) delete g.atoms[c].chi; });
  return { g };
}

function addEpoxide(info) {
  const g = startWork(info);
  const { c1, c2, pos } = info;
  const o = newAtom(g, { el: 'O' });
  newBond(g, c1, o); newBond(g, c2, o);
  G.bondOf(g, c1, c2).o = 1;
  attach(info, pos, c1, c2, o, 'top');
  attach(info, pos, c2, c1, o, 'top');
  return { g, o };
}

/** Cleavage: each C=C carbon becomes C=O (ketone), CO2H (acid; the C-H becomes C-OH) or CO2 (=CH2). */
function cleaveGraph(info) {
  const g = G.clone(info.g);
  const { c1, c2 } = info;
  g.bonds.splice(g.bonds.indexOf(G.bondOf(g, c1, c2)), 1);
  const ends = [];
  for (const c of [c1, c2]) {
    const h = g.atoms[c].h;
    const o1 = newAtom(g, { el: 'O' }); newBond(g, c, o1, 2);
    let kind = 'ketone';
    if (h === 1) { const o2 = newAtom(g, { el: 'O', h: 1 }); newBond(g, c, o2); kind = 'acid'; }
    else if (h === 2) { const o2 = newAtom(g, { el: 'O' }); newBond(g, c, o2, 2); kind = 'co2'; }
    g.atoms[c].h = 0;
    ends.push({ atom: c, kind, nH: h });
  }
  return { g, ends };
}

// ---------------------------------------------------------------- epoxide opening
/** Ring oxygen and carbons of a (three-membered) epoxide, or null. */
export function epoxideParts(g) {
  for (let o = 0; o < g.atoms.length; o++) {
    if (g.atoms[o].el !== 'O') continue;
    const nb = G.neighbours(g, o);
    if (nb.length === 2 && nb.every((k) => g.atoms[k].el === 'C') && G.bondOf(g, nb[0], nb[1])) return { o, c: nb };
  }
  return null;
}

/**
 * Acid-catalysed opening of an epoxide by water: the ring is protonated, water attacks one carbon FROM THE BACK (inversion there), so the two OH
 * groups end up anti: a trans-1,2-diol from an epoxycycloalkane. Water attacks the carbon with more carbon neighbours (ties: the first).
 * Returns {smiles (canonical, isomeric), diol} or throws.
 */
export function openEpoxide(epoxide) {
  const g = G.parse(epoxide);
  const ep = epoxideParts(g);
  if (!ep) throw new Error('excluded: no epoxide ring');
  const cn = (c) => G.neighbours(g, c).filter((k) => g.atoms[k].el === 'C').length;
  const [ca, cb] = cn(ep.c[0]) >= cn(ep.c[1]) ? ep.c : [ep.c[1], ep.c[0]];
  const w = G.clone(g);
  w.bonds.splice(w.bonds.indexOf(G.bondOf(w, ca, ep.o)), 1);
  const o2 = newAtom(w, { el: 'O', h: 1 });
  newBond(w, ca, o2);
  w.atoms[ep.o].h = 1;
  const A = w.atoms[ca];
  if (A.chi) { A.chi = { nb: A.chi.nb.map((t) => (t === ep.o ? o2 : t)), tag: A.chi.tag === '@' ? '@@' : '@' }; } // back-side attack = inversion
  const f = finish(w);
  return { smiles: f.smiles, attacked: ca, nCenters: f.nCenters };
}

// ---------------------------------------------------------------- stereo comparison
/** Enantiomer-blind key of a (possibly multi-part) structure: the smaller of canon(s) and canon(mirror(s)), per part. */
export function stereoKey(smiles) {
  return canon(smiles).split('.').map((p) => { const a = canon(p), b = canon(G.mirror(p)); return a < b ? a : b; }).sort().join('.');
}
/** Do two product lists describe the same compounds, accepting either enantiomer of a racemic product? */
export function sameProducts(a, b) {
  const ka = a.map(stereoKey).sort(), kb = b.map(stereoKey).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
}
/** Strictly the same stereo-defined compounds (no enantiomer leniency). */
export function sameExact(a, b) {
  const ka = a.map((s) => canon(s)).sort(), kb = b.map((s) => canon(s)).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
}
/** Is this compound chiral (its mirror image is a different compound)? */
export const isChiral = (smiles) => canon(smiles) !== canon(G.mirror(smiles));

// ---------------------------------------------------------------- the prediction
const atomCounts = (smiles) => {
  const Rk = rdkit();
  const m0 = Rk.get_mol(smiles);
  const mb = m0.add_hs(); m0.delete();
  const m = Rk.get_mol(mb, JSON.stringify({ removeHs: false }));
  try { const c = {}; JSON.parse(m.get_json()).molecules[0].atoms.forEach((a) => { c[a.z ?? 6] = (c[a.z ?? 6] || 0) + 1; }); return c; } finally { m.delete(); }
};
const sumCounts = (list) => list.reduce((t, s) => { for (const [k, v] of Object.entries(atomCounts(s))) t[k] = (t[k] || 0) + v; return t; }, {});

/** Overall equation of an addition/oxidation. Each side lists SMILES; '[O]' is one oxygen atom from the oxidant (KMnO4, RCO3H). */
function overallEquation(alkene, reagent, products) {
  const R = REAGENTS2[reagent];
  const prods = products.slice();
  if (R.kind === 'halogen') return { lhs: [alkene, R.reactant], rhs: prods, note: 'exact' };
  if (R.kind === 'hydrogen') return { lhs: [alkene, R.reactant], rhs: prods, note: 'exact (the Pd catalyst is not written)' };
  if (R.kind === 'epoxide') {
    return { lhs: [alkene, OXIDANT], rhs: prods, note: 'organic part: [O] stands for the oxygen the peracid transfers (RCO₃H becomes RCO₂H)', exact: { lhs: [alkene, 'OOC(=O)c1cccc(Cl)c1'], rhs: [...prods, 'OC(=O)c1cccc(Cl)c1'] } };
  }
  if (R.kind === 'epoxide-diol') return { lhs: [alkene, OXIDANT, 'O'], rhs: prods, note: 'organic part: [O] from the peracid, then H₂O adds to the epoxide (H₃O⁺ is a catalyst)' };
  if (R.kind === 'diol-syn') return { lhs: [alkene, OXIDANT, 'O'], rhs: prods, note: 'organic part: [O] stands for the oxidant (MnO₄⁻ is reduced); OH⁻ is not consumed overall' };
  // cleavage: add as many [O] as needed, water out where an =CH2 end becomes CO2
  const cnt = (list) => sumCounts(list);
  const A = cnt([alkene]), P = cnt(prods);
  const water = ((A[1] || 0) - (P[1] || 0)) / 2;
  const nO = (P[8] || 0) + water - (A[8] || 0);
  if (!Number.isInteger(water) || water < 0 || nO < 0) throw new Error('cleavage equation does not balance');
  return { lhs: [alkene, ...Array(nO).fill(OXIDANT)], rhs: [...prods, ...Array(water).fill('O')], nO, note: 'organic part: each [O] is one oxygen atom from MnO₄⁻' };
}

/**
 * predictAdd(alkene, reagent) -> {
 *   alkene, reagent, R, info, kind, products:[canonical isomeric SMILES, sorted], racemic (a chiral product forms as a racemate), nCenters,
 *   rel: 'anti'|'syn'|null (how the two new groups add), ring: 'trans'|'cis'|null (their relationship on a ring), equation, mech (bromonium/chloronium for X2) }
 * Throws Error('excluded: ...') for an alkene outside the lesson.
 */
export function predictAdd(alkene, reagent) {
  const R = REAGENTS2[reagent];
  if (!R) throw new Error('unknown reagent ' + reagent);
  const cleave = R.kind === 'cleavage';
  const info = alkeneInfo(alkene, { allowCenters: cleave });
  if (!info.ok) throw new Error('excluded: ' + info.reason);
  if (cleave) {
    const { g, ends } = cleaveGraph(info);
    const w = G.write(g);
    const products = w.smiles.split('.').map((s) => canon(s)).sort();
    return { alkene, reagent, R, info, kind: 'cleavage', products, racemic: false, nCenters: 0, rel: null, ring: null, ends, equation: overallEquation(alkene, reagent, products) };
  }
  if (info.stereogenic && !info.specified) throw new Error('excluded: this C=C can be E or Z and the product depends on which; write the geometry (for example C/C=C/C)');
  if (info.ring && info.ringSize >= 8 && !info.specified) throw new Error('excluded: a large ring could hold a cis or a trans C=C');
  let built, rel = R.rel;
  if (R.kind === 'halogen') built = addPairX(info, R.X, ['top', 'bottom']).g;
  else if (R.kind === 'hydrogen') built = addHydrogens(info, ['top', 'top']).g;
  else if (R.kind === 'epoxide') built = addEpoxide(info).g;
  else if (R.kind === 'diol-syn') { built = addPairX(info, 'O', ['top', 'top'], { h: 1 }).g; }
  else if (R.kind === 'epoxide-diol') {
    // a genuine two-step chain: build the epoxide, then open the epoxide's own SMILES with water
    const ep = finish(addEpoxide(info).g);
    const open = openEpoxide(ep.smiles);
    return finishPrediction(alkene, reagent, R, info, [open.smiles], open.nCenters, rel);
  }
  const f = finish(built);
  return finishPrediction(alkene, reagent, R, info, [f.smiles], f.nCenters, rel);
}

function finishPrediction(alkene, reagent, R, info, products, nCenters, rel) {
  const p = products[0];
  // single-stereocentre products are drawn flat and are racemic; products with several centres are racemic when chiral
  const racemic = nCenters === 1 || (nCenters > 1 && isChiral(p));
  const out = { alkene, reagent, R, info, kind: R.kind, products, racemic, nCenters, rel, ring: null };
  // relationship of the two new groups on a ring (computed from the product, not typed): cis/trans for a ring alkene with two stereocentres
  if (info.ring && nCenters === 2 && rel) out.ring = rel === 'anti' ? 'trans' : 'cis';
  out.equation = overallEquation(alkene, reagent, products);
  if (R.kind === 'halogen') Object.defineProperty(out, 'mech', { get: () => halogenMechanism(alkene, R.X), enumerable: false }); // built on demand
  return out;
}

/** The stereochemical alternative to the right answer: the same reagent with syn and anti swapped (null when it gives the same compound). */
export function oppositeStereo(alkene, reagent) {
  const R = REAGENTS2[reagent];
  const info = alkeneInfo(alkene);
  if (!info.ok || R.rel == null) return null;
  const syn = R.rel === 'syn';
  let g;
  const flip = syn ? ['top', 'bottom'] : ['top', 'top']; // the opposite of the real outcome
  if (R.kind === 'halogen') g = addPairX(info, R.X, flip).g;
  else if (R.kind === 'hydrogen') g = addHydrogens(info, ['top', 'bottom']).g;
  else if (R.kind === 'epoxide') return null; // no anti epoxide exists
  else g = addPairX(info, 'O', flip, { h: 1 }).g;
  try { return finish(g).smiles; } catch (e) { return null; }
}

// ---------------------------------------------------------------- the bromonium (chloronium) mechanism, in mechanism-player format
const ENDINGS = { Br: 'bromonium', Cl: 'chloronium' };
export const onium = (X) => ENDINGS[X];

/**
 * Two steps (McMurry Fig. 4.3): (1) the π bond attacks X-X; X⁻ leaves and the X atom that was attacked also bonds to the other carbon, giving a
 * three-membered cyclic onium ion (X bridges both carbons, on ONE face); (2) X⁻ attacks one carbon from the face opposite the bridge and the
 * C-X⁺ bond to that carbon breaks. Result: the two X atoms are anti. `equiv` lists the swaps (carbon ends, the two X of X2) that give the same
 * mechanism, so the arrow grader accepts them.
 */
export function halogenMechanism(alkene, X) {
  const info = alkeneInfo(alkene);
  if (!info.ok) throw new Error('excluded: ' + info.reason);
  const { c1, c2 } = info;
  // the onium ion: X+ on the top face of both carbons
  const og = startWork(info);
  const xi = newAtom(og, { el: X, q: 1 });
  newBond(og, c1, xi); newBond(og, c2, xi);
  G.bondOf(og, c1, c2).o = 1;
  attach(info, info.pos, c1, c2, xi, 'top');
  attach(info, info.pos, c2, c1, xi, 'top');
  const ow = G.write(og);
  let oniumSmiles = ow.smiles;
  const nOnium = stereoCounts(oniumSmiles)[0];
  if (nOnium < 2) oniumSmiles = oniumSmiles.replace(/@@?/g, ''); // no stereo to show (one or no centre)
  const posOf = (k) => ow.order.indexOf(k);          // graph index -> atom number in the onium SMILES
  const X2 = X + X;
  // ---- step 1
  const st1 = { before: [alkene, X2], layout: [{}, {}], arrows: [], after: [oniumSmiles, `[${X}-]`], label: '' };
  const sc1 = buildScene(st1);
  const XA = sc1.maps[1].heavy[0], XB = sc1.maps[1].heavy[1];
  st1.arrows = [
    { from: { bond: [c1, c2] }, to: { bond: [c1, XA] }, note: `The π electrons form a bond to the ${X} nearer the alkene. Point at that ${X}; the other ${X} leaves as ${X}⁻.`, why: `The π pair attacks the nearer ${X} of ${X}₂ and forms a new C–${X} bond. This starts the bridge across the C=C.` },
    { from: { bond: [XA, XB] }, to: { atom: XB }, why: `The ${X}–${X} bond pair leaves with the far ${X}, which departs as ${X}⁻ (a good leaving group).` },
    { from: { lp: XA }, to: { atom: c2 }, note: `A lone pair on that ${X} bonds to the OTHER carbon of the former C=C. That closes the three-membered ring.`, why: `A lone pair on the bonded ${X} reaches the other carbon, closing a three-membered ring: the ${onium(X)} ion with ${X}⁺.` }
  ];
  st1.equiv = [{ [c1]: c2, [c2]: c1 }, { [XA]: XB, [XB]: XA }, { [c1]: c2, [c2]: c1, [XA]: XB, [XB]: XA }];
  st1.label = `The π bond attacks one ${X} of ${X2}; its ${X}–${X} pair leaves as ${X}⁻, and a lone pair on the attacked ${X} bonds to the second carbon. The ${X} now bridges both carbons on ONE face: a cyclic ${onium(X)} ion (a ring with a positive ${X}).`;
  // ---- step 2: X- attacks the carbon with more carbon neighbours from the back; same product as anti addition
  const cn = (c) => G.neighbours(info.g, c).length;
  const [ca, cb] = cn(c1) >= cn(c2) ? [c1, c2] : [c2, c1];
  const pg = G.clone(og);
  const xminus = newAtom(pg, { el: X, q: 0 });
  pg.bonds.splice(pg.bonds.indexOf(G.bondOf(pg, ca, xi)), 1);
  newBond(pg, ca, xminus);
  pg.atoms[xi].q = 0;
  // the attacked carbon: the new X replaces the bridge on the opposite face (inversion); the other carbon keeps the bridging X (now a neutral C-X)
  const A = pg.atoms[ca];
  if (A.chi) A.chi = { nb: A.chi.nb.map((t) => (t === xi ? xminus : t)), tag: A.chi.tag === '@' ? '@@' : '@' };
  const pw = G.write(pg);
  let prodSmiles = canon(pw.smiles);
  const nProd = stereoCounts(prodSmiles)[0];
  if (nProd < 2) prodSmiles = prodSmiles.replace(/@@?/g, '');
  const iA = posOf(ca), iX = posOf(xi), iB = posOf(cb);
  const st2 = { before: [oniumSmiles, `[${X}-]`], layout: [{}, {}], arrows: [], after: [prodSmiles], label: '' };
  const sc2 = buildScene(st2);
  const Xm = sc2.maps[1].heavy[0];
  st2.arrows = [
    { from: { lp: Xm }, to: { atom: iA }, note: `${X}⁻ attacks a ring carbon from the face OPPOSITE the bridging ${X} (the back).`, why: `A lone pair on ${X}⁻ attacks a ring carbon from the back, opposite the bridge, and forms a new C–${X} bond.` },
    { from: { bond: [iA, iX] }, to: { atom: iX }, why: `The C–${X}⁺ bond pair leaves with the bridging ${X}, which becomes neutral. The ring opens and the two ${X} atoms end up anti.` }
  ];
  st2.equiv = [{ [iA]: iB, [iB]: iA }];
  st2.label = `${X}⁻ cannot reach the front face, which the bridging ${X} blocks, so it attacks a ring carbon from the BACK. The C–${X}⁺ bond to that carbon breaks and the ring opens. The two ${X} atoms are on opposite faces: anti addition.`;
  return { reactants: [alkene, X2], products: [prodSmiles], steps: [st1, st2], onium: oniumSmiles };
}

// ---------------------------------------------------------------- wrong answers (all computed)
const flatAlkane = (alkene) => predictAdd(alkene, 'H2').products[0];
/**
 * The four answers for "what is the product?": the right one plus three distractors, each with its own `why`.
 * Each: {smiles:[...], correct, kind, why}. `kinds` can force which wrong answers to use.
 */
export function productChoices2(pred, opts = {}) {
  const { alkene, reagent, R } = pred;
  const rightKey = pred.products.map(stereoKey).sort().join('|');
  const cand = [];
  const push = (kind, products, why) => {
    if (!products || !products.length) return;
    const key = products.map(stereoKey).sort().join('|');
    if (key === rightKey || cand.some((c) => c.key === key)) return;
    cand.push({ smiles: products, correct: false, kind, why, key });
  };
  const opp = oppositeStereo(alkene, reagent);
  const tryReagent = (id) => { try { return predictAdd(alkene, id).products; } catch (e) { return null; } };
  const withX = (X) => tryReagent(X === 'Br' ? 'Br2' : 'Cl2');
  if (opp && (R.kind === 'halogen' || R.kind === 'hydrogen' || R.kind === 'diol-syn' || R.kind === 'epoxide-diol')) {
    const why = R.kind === 'halogen'
      ? `This puts the two ${R.X} atoms on the SAME face (syn). ${R.X}₂ adds anti: the ${onium(R.X)} ion blocks one face, so ${R.X}⁻ must attack from the opposite face.`
      : R.kind === 'hydrogen'
        ? 'This puts the two H atoms on opposite faces (anti). Hydrogenation is syn: both H atoms are delivered from the catalyst surface, which touches only one face of the alkene.'
        : R.kind === 'diol-syn'
          ? 'This is the trans (anti) diol, the product of the epoxide route. KMnO₄ in base adds both OH groups to the SAME face (syn), so the diol is cis.'
          : 'This is the cis (syn) diol, the KMnO₄ product. Here water attacks the protonated epoxide from the back, so the two OH groups end up anti (trans).';
    push('wrongStereo', [opp], why);
  }
  if (R.kind === 'epoxide') {
    const cis = tryReagent('KMnO4_OH');
    push('diol', cis, 'This is a diol, which has two OH groups. A peroxyacid transfers just ONE oxygen atom, giving the ring (epoxide); the diol needs a second step (H₃O⁺) or a different reagent.');
  }
  if (R.kind === 'epoxide-diol') {
    const ep = tryReagent('RCO3H');
    push('epoxide', ep, 'This is the epoxide, the product of the first step only. The second reagent, H₃O⁺, opens the ring with water and gives the diol.');
  }
  if (R.kind === 'diol-syn') {
    push('cleavage', tryReagent('KMnO4_H'), 'This is what KMnO₄ does in ACID (it cuts the C=C). In basic solution KMnO₄ stops at the diol.');
    push('epoxide', tryReagent('RCO3H'), 'KMnO₄ puts an OH on each carbon. This answer keeps one O joining both carbons (an epoxide), the peroxyacid product.');
  }
  if (R.kind === 'cleavage') {
    push('diol', tryReagent('KMnO4_OH'), 'This is the diol that KMnO₄ gives in BASIC solution. In acid or neutral solution the oxidation goes further and the C=C is cut.');
    push('epoxide', tryReagent('RCO3H'), 'This is an epoxide, the peroxyacid product. KMnO₄ in acid breaks the C=C completely.');
  }
  if (R.kind === 'halogen') {
    const other = R.X === 'Br' ? 'Cl' : 'Br';
    push('wrongHalogen', withX(other), `The halogen that adds is the one in the reagent (${R.X}₂), not ${other}.`);
    push('alkane', tryReagent('H2'), 'This is the alkane from adding H₂. Br₂ and Cl₂ add two halogen atoms, not two H atoms.');
    push('epoxide', tryReagent('RCO3H'), 'This puts an oxygen across the C=C (an epoxide), the peroxyacid product. Halogens add two halogen atoms.');
  }
  if (R.kind === 'hydrogen') {
    push('dihalide', tryReagent('Br2'), 'This adds two Br atoms (the Br₂ product). H₂ over Pd adds two H atoms and gives the alkane.');
    push('epoxide', tryReagent('RCO3H'), 'This puts an O across the C=C. H₂ over Pd only adds two H atoms.');
  }
  if (R.kind === 'epoxide') push('dihalide', tryReagent('Br2'), 'This adds two Br atoms. A peroxyacid adds one O atom.');
  if (R.kind === 'epoxide-diol' || R.kind === 'diol-syn') push('alkane', tryReagent('H2'), 'This adds two H atoms (hydrogenation). The reagents here add oxygen.');
  push('unchanged', [canon(alkene)], 'That is the starting alkene again. These are additions or oxidations: the C=C is used up (or cut).');
  const order = opts.kinds || null;
  let pool = cand;
  if (order) pool = order.map((k) => cand.find((c) => c.kind === k)).filter(Boolean);
  const n = opts.n || 4;
  const right = { smiles: pred.products.slice(), correct: true, kind: 'major', why: rightWhy(pred) };
  return [right, ...pool.slice(0, n - 1).map(({ key, ...rest }) => rest)];
}

/** One sentence on why the right answer is right (stereo included). */
export function rightWhy(pred) {
  const { R } = pred;
  const rac = pred.racemic ? ' (formed as a racemate: the mirror image forms equally, so either drawing is correct)' : '';
  const ringTxt = pred.ring ? ` On the ring the two new groups end up ${pred.ring}.` : '';
  switch (R.kind) {
    case 'halogen': return `Yes. ${R.X}₂ adds anti: a ${onium(R.X)} ion forms, then ${R.X}⁻ attacks from the back face.${ringTxt}${rac}`;
    case 'hydrogen': return `Yes. H₂ adds syn: both H atoms come from the catalyst surface, to the same face.${ringTxt}${rac}`;
    case 'epoxide': return `Yes. A peroxyacid gives an epoxide (one O across the C=C). The alkene geometry is kept: a cis alkene gives a cis epoxide, a trans alkene a trans one.${rac}`;
    case 'epoxide-diol': return `Yes. The peroxyacid makes the epoxide; H₃O⁺ and water open it from the back, so the two OH groups are anti (trans on a ring).${rac}`;
    case 'diol-syn': return `Yes. KMnO₄ in base puts both OH groups on the same face (syn): a cis diol on a ring.${rac}`;
    default: return 'Yes. KMnO₄ in acid cuts the C=C: =CR₂ becomes a ketone, =CHR a carboxylic acid, =CH₂ becomes CO₂.';
  }
}

/** Which of these reagents give exactly this product (as a stereochemical match)? */
export function reagentsFor(alkene, productSmiles, candidates = REAGENT_IDS2) {
  const key = [productSmiles].flat().map(stereoKey).sort().join('|');
  return candidates.filter((id) => { try { return predictAdd(alkene, id).products.map(stereoKey).sort().join('|') === key; } catch (e) { return false; } });
}

// ---------------------------------------------------------------- KMnO4 cleavage helpers (used by the cleave-it widget)
export const END_KIND = { ketone: 'ketone', acid: 'carboxylic acid', co2: 'carbon dioxide (CO₂)' };
/** What each end of the C=C becomes in KMnO4/H3O+ (computed from the number of H on the carbon). */
export function cleavageEnds(alkene) {
  const info = alkeneInfo(alkene, { allowCenters: true });
  if (!info.ok) throw new Error('excluded: ' + info.reason);
  const { ends } = cleaveGraph(info);
  return { info, ends, products: predictAdd(alkene, 'KMnO4_H').products };
}

// ---------------------------------------------------------------- polymers (McMurry 4.7)
export const MONOMERS = [
  { id: 'ethylene', smiles: 'C=C', polymer: 'polyethylene', abbr: 'PE', name: 'ethylene' },
  { id: 'propylene', smiles: 'CC=C', polymer: 'polypropylene', abbr: 'PP', name: 'propylene' },
  { id: 'vinyl-chloride', smiles: 'C=CCl', polymer: 'poly(vinyl chloride)', abbr: 'PVC', name: 'vinyl chloride (chloroethylene)' },
  { id: 'styrene', smiles: 'C=Cc1ccccc1', polymer: 'polystyrene', abbr: 'PS', name: 'styrene' },
  { id: 'tetrafluoroethylene', smiles: 'FC(F)=C(F)F', polymer: 'Teflon (polytetrafluoroethylene)', abbr: 'PTFE', name: 'tetrafluoroethylene' }
];
export const MONOMER_BY_ID = Object.fromEntries(MONOMERS.map((m) => [m.id, m]));

/**
 * The repeat unit of the addition polymer of a vinyl monomer: the π bond is used up, and each former C=C carbon gets a bond to its neighbour in the
 * chain (written as * ). Formula = the monomer's formula (nothing is lost in an addition polymer).
 */
export function repeatUnit(monomer) {
  const g = G.parse(monomer);
  const dbl = g.bonds.filter((b) => b.o === 2 && g.atoms[b.a].el !== 'O' && !g.atoms[b.a].ar);
  if (dbl.length !== 1) throw new Error('excluded: one C=C needed');
  const b = dbl[0];
  b.o = 1;
  for (const c of [b.a, b.b]) { const s = g.atoms.length; g.atoms.push({ el: '*', q: 0, h: 0, bracket: false }); g.bonds.push({ a: c, b: s, o: 1 }); }
  return canon(G.write(g, { start: g.atoms[b.a].h >= g.atoms[b.b].h ? b.a : b.b }).smiles);
}
/** Wrong repeat units for the same monomer, each with its reason. */
export function repeatChoices(monomer) {
  const right = repeatUnit(monomer);
  const g0 = G.parse(monomer);
  const out = [{ smiles: right, correct: true, kind: 'repeat', why: 'Yes. The π bond is used up: each former C=C carbon forms a single bond to a neighbour in the chain. The repeat unit has exactly the atoms of the monomer.' }];
  const add = (kind, smiles, why) => { const c = smiles && canon(smiles); if (c && !out.some((o) => o.smiles === c)) out.push({ smiles: c, correct: false, kind, why }); };
  add('monomer', canon(monomer), 'This is the monomer itself, with its C=C. In the polymer that π bond is gone: its electrons make the bonds that link the units together.');
  // the alkane: monomer + H2 (a small molecule, not a chain)
  const h2 = predictAdd2Flat(monomer);
  add('alkane', h2, 'This is the alkane you would get by adding H₂. Polymerisation joins monomers to each other; it does not add H₂.');
  // C=C kept inside the chain, two H fewer
  const g = G.clone(g0);
  const b = g.bonds.find((x) => x.o === 2 && !g.atoms[x.a].ar && g.atoms[x.a].el === 'C' && g.atoms[x.b].el === 'C');
  const drop = [];
  for (const c of [b.a, b.b]) {
    const s = g.atoms.length; g.atoms.push({ el: '*', q: 0, h: 0, bracket: false }); g.bonds.push({ a: c, b: s, o: 1 });
    if (g.atoms[c].h > 0) g.atoms[c].h -= 1;
    else { const t = G.neighbours(g, c).find((k) => k !== b.a && k !== b.b && k !== s && G.neighbours(g, k).length === 1 && g.atoms[k].el !== '*'); if (t != null) drop.push(t); } // no H to lose: lose a terminal substituent (F, Cl ...)
  }
  if (drop.length) {
    const keep = g.atoms.map((_, i) => i).filter((i) => !drop.includes(i));
    const map = new Map(keep.map((o, n) => [o, n]));
    g.atoms = keep.map((i) => g.atoms[i]);
    g.bonds = g.bonds.filter((x) => map.has(x.a) && map.has(x.b)).map((x) => ({ ...x, a: map.get(x.a), b: map.get(x.b) }));
  }
  add('doubleBondKept', canon(G.write(g).smiles), 'This keeps the C=C but has two atoms fewer than the monomer. An addition polymer loses nothing: the repeat unit has exactly the atoms of the monomer, with the C=C turned into a C–C single bond.');
  return out;
}
const predictAdd2Flat = (monomer) => {
  const g = G.parse(monomer);
  const b = g.bonds.find((x) => x.o === 2 && !g.atoms[x.a].ar && g.atoms[x.a].el === 'C' && g.atoms[x.b].el === 'C');
  b.o = 1; g.atoms[b.a].h += 1; g.atoms[b.b].h += 1;
  return canon(G.write(g).smiles);
};
/** Atoms of a repeat unit without the * ends, as a plain formula-comparable SMILES (the * atoms become H). */
export function repeatFormulaSmiles(unit) {
  const g = G.parse(unit);
  const keep = g.atoms.map((a, i) => i).filter((i) => g.atoms[i].el !== '*');
  const map = new Map(keep.map((o, n) => [o, n]));
  const out = { atoms: keep.map((i) => ({ ...g.atoms[i], h: g.atoms[i].h })), bonds: [] };
  g.bonds.forEach((b) => { if (map.has(b.a) && map.has(b.b)) out.bonds.push({ a: map.get(b.a), b: map.get(b.b), o: b.o }); });
  g.bonds.forEach((b) => { const star = g.atoms[b.a].el === '*' ? b.a : g.atoms[b.b].el === '*' ? b.b : -1; if (star >= 0) { const real = star === b.a ? b.b : b.a; out.atoms[map.get(real)].h += 1; out.atoms[map.get(real)].bracket = true; } });
  return G.write(out).smiles;
}

/** The radical polymerisation steps of ethylene started by benzoyl peroxide (McMurry 4.7), as balanced SMILES steps. */
export const RADICAL_STEPS = [
  { id: 'initiator', name: 'Radical formation', lhs: ['O=C(c1ccccc1)OOC(=O)c1ccccc1'], rhs: ['[O]C(=O)c1ccccc1', '[O]C(=O)c1ccccc1'], text: 'Heating breaks the weak O–O bond of benzoyl peroxide. Each O keeps one electron: two benzoyloxy radicals.' },
  { id: 'initiation', name: 'Initiation', lhs: ['[O]C(=O)c1ccccc1', 'C=C'], rhs: ['O=C(c1ccccc1)OC[CH2]'], text: 'A benzoyloxy radical adds to the C=C: one π electron pairs with its odd electron to form the C–O bond, the other stays on the other carbon (a carbon radical).' },
  { id: 'propagation', name: 'Propagation', lhs: ['O=C(c1ccccc1)OC[CH2]', 'C=C'], rhs: ['O=C(c1ccccc1)OCCC[CH2]'], text: 'The carbon radical adds to another ethylene and the chain grows by two carbons, again ending in a radical. This repeats hundreds or thousands of times.' },
  { id: 'termination', name: 'Termination', lhs: ['O=C(c1ccccc1)OC[CH2]', 'O=C(c1ccccc1)OC[CH2]'], rhs: ['O=C(c1ccccc1)OCCCCOC(=O)c1ccccc1'], text: 'Two growing chains meet and their odd electrons pair up to make a C–C bond. No radical is left, so the chains stop growing.' }
];

export { mirror } from './stereo-graph.js';
