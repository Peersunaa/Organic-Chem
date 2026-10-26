// Alkyl halides (McMurry 7.1 to 7.9): SN2, SN1, E2, E1, the choice between them, Grignard reagents, halides from alcohols, radical monohalogenation.
// Re-exported by engine/reactions.js (extends it additively; nothing of the earlier lessons changes). BOOK SCOPE ONLY: no E1cB, no Hofmann (bulky-base)
// products, no carbocation rearrangements (a substrate whose cation could shift an H or CH3 to a more stable cation is refused, as in Lesson 09).
//
// Built the way reactions-additions.js is built: the substrate is read into a small graph with native chirality (engine/stereo-graph.js), edited, and written
// back as a SMILES whose @ / @@ marks follow from the geometry, then graded as canonical isomeric SMILES.
//   * SN2: the nucleophile takes the place of X in the same slot of the carbon's neighbour list and the mark is FLIPPED (back-side attack = inversion).
//   * SN1: the carbocation is flat, so the nucleophile arrives from either face: a new stereocentre comes out as BOTH enantiomers.
//   * E2 / E1: every neighbouring carbon that has an H gives a candidate alkene (no E/Z written: the book's problems say "ignoring double-bond stereochemistry");
//     the alkene with the most carbon substituents on the C=C is the major product (Zaitsev). On a SIX-membered ring E2 needs the beta H trans to X (anti to X,
//     trans-diaxial in the chair): a beta CH2 always has one, a beta CH(R) only when R is CIS to X. cis/trans is read from the tetrahedral marks and RDKit 2D coordinates.
// Refusals throw Error('excluded: ...') exactly as the other engines do; halideSites returns {ok:false, reason} and decide returns noReaction / {ok:false} instead.
// Nothing here needs RDKit at import time (everything is called lazily).
import { canon, rdkit, coords2d } from './chem.js';
import * as G from './stereo-graph.js';
import { buildScene, stepResult } from './widgets/mechanism-core.js';
import { buildMolblock } from './widgets/lewis-core.js';
import { tetraInfo } from './cip.js';

// ---------------------------------------------------------------- tables
/**
 * The nucleophiles of the chapter. label = what the reagent bottle says; reactant = the nucleophile as a species (mechanism); site = index of the attacking atom in `reactant`;
 * attach = the group that ends up on the carbon, written as a bracket atom with its FINAL hydrogen count (CN attaches through C, azide through N, NH3 gives the amine);
 * nuc 'strong' (anionic, NH3, RS-) or 'weak' (neutral H2O, ROH); base 'strong' (HO-, RO-) or 'weak'; protic = the reagent IS a protic solvent; leaving = rank as a leaving group (halides).
 */
export const NUCLEOPHILES = {
  I: { id: 'I', label: 'NaI, acetone', short: 'I⁻', reactant: '[I-]', site: 0, attach: '[I]', group: 'I', nuc: 'strong', base: 'weak', protic: false, leaving: 3 },
  Br: { id: 'Br', label: 'NaBr', short: 'Br⁻', reactant: '[Br-]', site: 0, attach: '[Br]', group: 'Br', nuc: 'strong', base: 'weak', protic: false, leaving: 2 },
  Cl: { id: 'Cl', label: 'NaCl', short: 'Cl⁻', reactant: '[Cl-]', site: 0, attach: '[Cl]', group: 'Cl', nuc: 'strong', base: 'weak', protic: false, leaving: 1 },
  HO: { id: 'HO', label: 'NaOH', short: 'HO⁻', reactant: '[OH-]', site: 0, attach: '[OH]', group: 'OH', nuc: 'strong', base: 'strong', protic: false, conj: 'O' },
  MeO: { id: 'MeO', label: 'NaOCH₃', short: 'CH₃O⁻', reactant: 'C[O-]', site: 1, attach: '[O]C', group: 'OCH₃', nuc: 'strong', base: 'strong', protic: false, conj: 'CO' },
  EtO: { id: 'EtO', label: 'NaOCH₂CH₃', short: 'CH₃CH₂O⁻', reactant: 'CC[O-]', site: 2, attach: '[O]CC', group: 'OCH₂CH₃', nuc: 'strong', base: 'strong', protic: false, conj: 'CCO' },
  CN: { id: 'CN', label: 'NaCN', short: 'CN⁻', reactant: '[C-]#N', site: 0, attach: '[C]#N', group: 'C≡N', nuc: 'strong', base: 'weak', protic: false },
  N3: { id: 'N3', label: 'NaN₃', short: 'N₃⁻', reactant: '[N-]=[N+]=[N-]', site: 0, attach: '[N]=[N+]=[N-]', group: 'N₃', nuc: 'strong', base: 'weak', protic: false },
  MeS: { id: 'MeS', label: 'NaSCH₃', short: 'CH₃S⁻', reactant: 'C[S-]', site: 1, attach: '[S]C', group: 'SCH₃', nuc: 'strong', base: 'weak', protic: false },
  HS: { id: 'HS', label: 'NaSH', short: 'HS⁻', reactant: '[SH-]', site: 0, attach: '[SH]', group: 'SH', nuc: 'strong', base: 'weak', protic: false },
  NH3: { id: 'NH3', label: 'NH₃', short: 'NH₃', reactant: 'N', site: 0, attach: '[NH2]', group: 'NH₂', nuc: 'strong', base: 'weak', protic: false, neutral: true },
  H2O: { id: 'H2O', label: 'H₂O, heat', short: 'H₂O', reactant: 'O', site: 0, attach: '[OH]', group: 'OH', nuc: 'weak', base: 'weak', protic: true, neutral: true },
  MeOH: { id: 'MeOH', label: 'CH₃OH, heat', short: 'CH₃OH', reactant: 'CO', site: 1, attach: '[O]C', group: 'OCH₃', nuc: 'weak', base: 'weak', protic: true, neutral: true },
  EtOH: { id: 'EtOH', label: 'CH₃CH₂OH, heat', short: 'CH₃CH₂OH', reactant: 'CCO', site: 2, attach: '[O]CC', group: 'OCH₂CH₃', nuc: 'weak', base: 'weak', protic: true, neutral: true },
  AcO: { id: 'AcO', label: 'CH₃CO₂Na', short: 'CH₃CO₂⁻', reactant: 'CC(=O)[O-]', site: 3, attach: '[O]C(C)=O', group: 'OCOCH₃', nuc: 'strong', base: 'weak', protic: false }
};
export const NUCLEOPHILE_IDS = ['I', 'Br', 'Cl', 'HO', 'MeO', 'EtO', 'CN', 'N3', 'MeS', 'HS', 'NH3', 'H2O', 'MeOH', 'EtOH', 'AcO'];
/** The E2 bases (strong), and `heat` = solvolysis: no added base, the protic solvent does everything (E1 beside SN1). nuId = the species that substitutes, conj = what the base becomes. */
export const BASES = {
  KOH: { id: 'KOH', label: 'KOH, ethanol, heat', short: 'HO⁻', reactant: '[OH-]', site: 0, strong: true, nuId: 'HO', conj: 'O' },
  NaOEt: { id: 'NaOEt', label: 'NaOCH₂CH₃, ethanol', short: 'CH₃CH₂O⁻', reactant: 'CC[O-]', site: 2, strong: true, nuId: 'EtO', conj: 'CCO' },
  NaOMe: { id: 'NaOMe', label: 'NaOCH₃, methanol', short: 'CH₃O⁻', reactant: 'C[O-]', site: 1, strong: true, nuId: 'MeO', conj: 'CO' },
  heat: { id: 'heat', label: 'heat in a protic solvent (no added base)', short: 'solvent', reactant: 'O', site: 0, strong: false, nuId: 'H2O', conj: null }
};
export const BASE_IDS = ['KOH', 'NaOEt', 'NaOMe', 'heat'];
/** Leaving groups, best first: the weaker the base, the better the leaving group (HO- and NH2- are strong bases: poor). */
export const LEAVING = [
  { id: 'I', label: 'I⁻', rank: 6, why: 'a very weak base (the conjugate acid HI is a very strong acid)' },
  { id: 'Br', label: 'Br⁻', rank: 5, why: 'a very weak base (HBr is a very strong acid)' },
  { id: 'Cl', label: 'Cl⁻', rank: 4, why: 'a weak base (HCl is a strong acid)' },
  { id: 'F', label: 'F⁻', rank: 3, why: 'a much stronger base than Cl⁻ (HF is a weak acid), so a poor leaving group' },
  { id: 'HO', label: 'HO⁻', rank: 2, why: 'a strong base (H₂O is a very weak acid): it does not leave' },
  { id: 'NH2', label: 'NH₂⁻', rank: 1, why: 'a very strong base (NH₃ is an extremely weak acid): it does not leave' }
];
const LEAVING_BY_ID = Object.fromEntries(LEAVING.map((l) => [l.id, l]));
/** The better leaving group of two ids ('I' > 'Br' > 'Cl' > 'F' > 'HO' > 'NH2'); null when they are the same. */
export function betterLeaving(a, b) {
  const A = LEAVING_BY_ID[a], B = LEAVING_BY_ID[b];
  if (!A || !B) throw new Error('unknown leaving group ' + (A ? b : a));
  return A.rank === B.rank ? null : A.rank > B.rank ? a : b;
}

export const HALIDE_CLASS_NAME = ['methyl', 'primary (1°)', 'secondary (2°)', 'tertiary (3°)'];
export const HALIDE_CLASS_SHORT = ['methyl', '1°', '2°', '3°'];

// ---------------------------------------------------------------- small graph helpers
const nbrs = (g, k) => G.neighbours(g, k);
const isCarbon = (g, k) => g.atoms[k].el === 'C';
const HALO = new Set(['F', 'Cl', 'Br', 'I']);
/** Is the bond i-j part of a ring? */
function inRing(g, i, j) {
  const seen = new Set([i]), q = [i];
  while (q.length) {
    const v = q.shift();
    for (const w of nbrs(g, v)) {
      if ((v === i && w === j) || (v === j && w === i)) continue;
      if (seen.has(w)) continue;
      if (w === j) return true;
      seen.add(w); q.push(w);
    }
  }
  return false;
}
/** Size of the smallest ring through the bond i-j (0 when it is in no ring). */
function ringSizeThrough(g, i, j) {
  const dist = { [i]: 0 }, q = [i];
  while (q.length) {
    const v = q.shift();
    for (const w of nbrs(g, v)) {
      if ((v === i && w === j) || (v === j && w === i)) continue;
      if (dist[w] != null) continue;
      dist[w] = dist[v] + 1;
      if (w === j) return dist[w] + 1;
      q.push(w);
    }
  }
  return 0;
}
/** Remove one atom (and its bonds); the indices above it shift down by one, also inside the chirality neighbour lists. */
function dropAtom(g, idx) {
  g.atoms.splice(idx, 1);
  g.bonds = g.bonds.filter((b) => b.a !== idx && b.b !== idx).map((b) => ({ ...b, a: b.a > idx ? b.a - 1 : b.a, b: b.b > idx ? b.b - 1 : b.b }));
  g.atoms.forEach((a) => { if (a.chi) a.chi = { ...a.chi, nb: a.chi.nb.map((t) => (typeof t === 'number' && t > idx ? t - 1 : t)) }; });
}
const newAtom = (g, a) => { g.atoms.push({ q: 0, h: 0, bracket: false, ...a }); return g.atoms.length - 1; };
const flip = (tag) => (tag === '@' ? '@@' : '@');
function parityOdd(from, to) {
  const used = new Array(to.length).fill(false);
  const perm = from.map((t) => { const j = to.findIndex((u, k) => !used[k] && u === t); if (j < 0) throw new Error('chirality neighbours differ'); used[j] = true; return j; });
  let inv = 0;
  for (let a = 0; a < perm.length; a++) for (let b = a + 1; b < perm.length; b++) if (perm[a] > perm[b]) inv++;
  return inv % 2 === 1;
}
/** [all potential stereocentres, those left unspecified] of a SMILES (RDKit's new stereo perception). */
function stereoCounts(smiles) {
  const Rk = rdkit();
  Rk.use_legacy_stereo_perception(false);
  try {
    const m = Rk.get_mol(smiles);
    try { const d = JSON.parse(m.get_descriptors()); return [d.NumAtomStereoCenters || 0, d.NumUnspecifiedAtomStereoCenters || 0]; } finally { m.delete(); }
  } finally { Rk.use_legacy_stereo_perception(true); }
}
/** Canonical SMILES without any stereo. */
function flatCanon(smiles) {
  const m = rdkit().get_mol(smiles);
  if (!m) return null;
  try { return m.get_smiles(JSON.stringify({ doIsomericSmiles: false })); } finally { m.delete(); }
}
const centreAt = (smiles, pos) => { try { const e = tetraInfo(smiles).find((z) => z.atom === pos); return !!(e && e.center); } catch (err) { return false; } };

// ---------------------------------------------------------------- reading an alkyl halide
/**
 * Facts about an alkyl halide: {ok:true, smiles, g, c (the C-X carbon), x (the halogen), X:'Cl'|'Br'|'I', cls (carbon neighbours of c: 0 methyl, 1, 2, 3), allylic, benzylic,
 * vinylic, aryl, sp3, ring (c in a ring), ringSize, betas:[{atom, nH, inRing}] (neighbouring sp3 carbons that carry an H), centre (c has a written @ / @@), chiralPossible}
 * or {ok:false, reason}. Exactly ONE halogen (Cl, Br or I) on a carbon, no other elements (opts.any lets Grignard read the other elements itself).
 * Vinylic and aryl halides are read correctly (so decide can say "no SN1 or SN2 at an sp2 carbon") and refused by the predict functions.
 */
export function halideSites(smiles, opts = {}) {
  if (typeof smiles !== 'string' || !smiles) return { ok: false, reason: 'no structure' };
  let g;
  try { g = G.parse(smiles); } catch (e) { return { ok: false, reason: 'not a valid structure' }; }
  if (!canon(smiles)) return { ok: false, reason: 'not a valid structure' };
  if (smiles.includes('.')) return { ok: false, reason: 'one molecule at a time' };
  if (!opts.any) {
    if (g.atoms.some((a) => a.q !== 0)) return { ok: false, reason: 'only neutral alkyl halides are covered' };
    if (g.atoms.some((a) => a.el !== 'C' && !HALO.has(a.el))) return { ok: false, reason: 'only alkyl halides made of carbon, hydrogen and one halogen are covered here' };
  }
  const hal = g.atoms.map((a, i) => (HALO.has(a.el) ? i : -1)).filter((i) => i >= 0);
  if (hal.length === 0) return { ok: false, reason: 'there is no halogen on a carbon' };
  if (hal.length > 1) return { ok: false, reason: 'only one halogen is covered here' };
  const x = hal[0], X = g.atoms[x].el;
  if (X === 'F') return { ok: false, reason: 'the C–F bond is very strong and F⁻ is a very poor leaving group: the course uses Cl, Br and I' };
  const xn = nbrs(g, x);
  if (xn.length !== 1 || !isCarbon(g, xn[0])) return { ok: false, reason: 'the halogen must be bonded to a carbon' };
  const c = xn[0];
  const bondsAt = (k) => g.bonds.filter((b) => b.a === k || b.b === k);
  const aryl = !!g.atoms[c].ar;
  const vinylic = !aryl && bondsAt(c).some((b) => b.o >= 2);
  const sp3 = !aryl && !vinylic;
  const cn = nbrs(g, c).filter((k) => k !== x);
  const cls = cn.filter((k) => isCarbon(g, k)).length;
  const hasCC = (k) => isCarbon(g, k) && !g.atoms[k].ar && bondsAt(k).some((b) => b.o === 2 && isCarbon(g, b.a) && isCarbon(g, b.b));
  const allylic = sp3 && cn.some(hasCC);
  const benzylic = sp3 && cn.some((k) => isCarbon(g, k) && g.atoms[k].ar);
  const sizes = cn.filter((k) => isCarbon(g, k) && inRing(g, c, k)).map((k) => ringSizeThrough(g, c, k)).filter(Boolean);
  const ring = sizes.length > 0;
  const betas = sp3 ? cn.filter((k) => isCarbon(g, k) && !g.atoms[k].ar && !bondsAt(k).some((b) => b.o >= 2) && g.atoms[k].h > 0).map((k) => ({ atom: k, nH: g.atoms[k].h, inRing: inRing(g, c, k) })) : [];
  const chiralPossible = sp3 && centreAt(smiles, c);
  return { ok: true, smiles, g, c, x, X, cls, allylic, benzylic, vinylic, aryl, sp3, ring, ringSize: ring ? Math.min(...sizes) : 0, betas, centre: !!g.atoms[c].chi, chiralPossible };
}
const readX = (RX) => { const s = halideSites(RX); if (!s.ok) throw new Error('excluded: ' + s.reason); return s; };

// ---------------------------------------------------------------- building products
/** Replace the halogen atom x of g by the fragment `attach` (the attaching atom takes x's place, so the neighbour order at c is unchanged). */
function putGroup(g, x, attach) {
  const f = G.parse(attach);
  const base = g.atoms.length;
  g.atoms[x] = { ...f.atoms[0], ar: false };
  for (let i = 1; i < f.atoms.length; i++) g.atoms.push({ ...f.atoms[i] });
  const map = (i) => (i === 0 ? x : base + i - 1);
  f.bonds.forEach((b) => g.bonds.push({ a: map(b.a), b: map(b.b), o: b.o }));
}
/** The neighbour tokens at c (the implicit H as 'H'), in graph order: the list a chirality mark is read against. */
const slotsAt = (g, c) => { const t = nbrs(g, c); return g.atoms[c].h > 0 ? [...t, 'H'] : t; };
function writeCanon(g) {
  const w = G.write(g);
  return { smiles: canon(w.smiles), written: w.smiles, order: w.order };
}
/** SN2 product graph. `retain` = leave the mark as it is (the wrong answer); otherwise the mark is flipped. */
function sn2Graph(s, Nu, retain = false) {
  const g = G.clone(s.g);
  putGroup(g, s.x, Nu.attach);
  const A = g.atoms[s.c];
  if (A.chi && !retain) A.chi = { nb: A.chi.nb.slice(), tag: flip(A.chi.tag) };
  return g;
}
/** R/S letter of atom `pos` in a SMILES (null when none) and the priority ranks of the listed neighbours (positions in that SMILES, or 'H'). */
function cipAt(smiles, pos, tokens) {
  let t;
  try { t = tetraInfo(smiles); } catch (e) { return { label: null, ranks: null }; }
  const e = t && t.find((z) => z.atom === pos);
  if (!e) return { label: null, ranks: null };
  const ranks = tokens.map((tok) => { const k = e.subs.findIndex((s2) => (tok === 'H' ? s2.atom === null : s2.atom === tok)); return k >= 0 ? e.rank[k] : null; });
  return { label: e.label || null, ranks };
}
/** R/S before and after a substitution at c where the group in slot x is replaced; sameOrder = the four priorities keep their order (then the letter flips on inversion). */
function labelsFor(beforeSmiles, g, c, x, written, order) {
  const tokBefore = [x, ...nbrs(g, c).filter((k) => k !== x).sort((a, b) => a - b), ...(g.atoms[c].h > 0 ? ['H'] : [])];
  const tokAfter = tokBefore.map((t) => (t === 'H' ? 'H' : order.indexOf(t)));
  const b = cipAt(beforeSmiles, c, tokBefore), a = cipAt(written, order.indexOf(c), tokAfter);
  return { labels: { before: b.label, after: a.label }, sameOrder: b.ranks && a.ranks ? b.ranks.join() === a.ranks.join() : null };
}
const eqn = (lhs, rhs, note = '') => ({ lhs, rhs, note });

/**
 * predictSN2(RX, nuId) -> {ok, mech:'SN2', sub, nu, product (canonical isomeric), products:[...], flat (drawn flat: its only stereocentre is a racemate from a flat substrate),
 *   inverted (the substrate centre was written, so the product centre is its mirror image in space), labels:{before, after} (R/S of the C-X carbon; null when none),
 *   sameOrder (the priorities of the four groups keep their order, so the letter flips), equation, rate, why}
 * Throws Error('excluded: ...') for a tertiary, vinylic or aryl halide, a crowded neopentyl-type carbon, or a second stereocentre that would make a mixture.
 */
export function predictSN2(RX, nuId) {
  const Nu = NUCLEOPHILES[nuId];
  if (!Nu) throw new Error('unknown nucleophile ' + nuId);
  const s = readX(RX);
  if (s.vinylic || s.aryl) throw new Error('excluded: SN2 does not happen at an sp² carbon (a vinylic or aryl halide): the back side of the carbon is blocked by the ring or the C=C, and the C–X bond is stronger');
  if (s.cls === 3) throw new Error('excluded: SN2 does not happen at a tertiary carbon: the back side is blocked');
  if (nbrs(s.g, s.c).some((k) => k !== s.x && isCarbon(s.g, k) && nbrs(s.g, k).length === 4)) throw new Error('excluded: a quaternary carbon next to the C–X carbon (neopentyl type) blocks the back side, so SN2 is far too slow');
  const [n0, un0] = stereoCounts(RX);
  if (s.centre && un0 > 0) throw new Error('excluded: another stereocentre is not specified, so the product would be unclear');
  if (!s.centre && s.chiralPossible && n0 > 1) throw new Error('excluded: this carbon is a stereocentre that is not written and there is a second one, so the product would be a mixture of diastereomers');
  const w = writeCanon(sn2Graph(s, Nu));
  const inverted = s.centre;
  const flat = !s.centre && s.chiralPossible;
  let labels = { before: null, after: null }, sameOrder = null;
  if (s.centre) ({ labels, sameOrder } = labelsFor(RX, s.g, s.c, s.x, w.written, w.order));
  let equation;
  if (Nu.id === 'NH3') equation = eqn([RX, 'N', 'N'], [w.smiles, '[NH4+]', `[${s.X}-]`], 'two NH₃: the second takes H⁺ from the ammonium ion');
  else if (Nu.neutral) equation = eqn([RX, Nu.reactant], [w.smiles, s.X], `the neutral nucleophile loses H⁺ at the end: H${s.X} forms`);
  else equation = eqn([RX, Nu.reactant], [w.smiles, `[${s.X}-]`]);
  const stereoWhy = s.centre ? ` The carbon is a stereocentre, so its configuration INVERTS${labels.before && labels.after ? ` (${labels.before} becomes ${labels.after})` : ''}.` : '';
  return {
    ok: true, mech: 'SN2', sub: RX, nu: nuId, X: s.X, cls: s.cls, product: w.smiles, products: [w.smiles], flat, inverted, labels, sameOrder, equation, rate: 'k[RX][Nu]',
    why: `SN2: ${Nu.short} attacks the carbon from the side opposite the ${s.X}, in one step, and ${s.X}⁻ leaves as it comes in.${stereoWhy}`
  };
}

// ---------------------------------------------------------------- carbocations (SN1 and E1)
/** Could the cation at c shift an H (or CH3) from a neighbouring carbon to become a MORE stable cation? (the rearrangement the book does not teach: such substrates are refused) */
export function cationRearranges(s) {
  const g = s.g;
  return nbrs(g, s.c).some((n) => {
    if (n === s.x || !isCarbon(g, n) || g.atoms[n].ar) return false;
    if (g.bonds.some((b) => (b.a === n || b.b === n) && b.o >= 2)) return false;
    const d = nbrs(g, n).filter((m) => isCarbon(g, m)).length;      // carbon groups on the neighbour, counting c
    return g.atoms[n].h > 0 ? d > s.cls : d - 1 > s.cls;
  });
}
/** An allylic cation shares its + over two carbons; only a symmetric one gives a single product (the others are resonance products, not in this chapter). */
function allylicSymmetric(s) {
  const g = s.g;
  const dbl = (p, q) => g.bonds.some((b) => b.o === 2 && ((b.a === p && b.b === q) || (b.b === p && b.a === q)));
  const c2 = nbrs(g, s.c).find((k) => isCarbon(g, k) && nbrs(g, k).some((m) => m !== s.c && isCarbon(g, m) && dbl(k, m)));
  if (c2 == null) return true;
  const c3 = nbrs(g, c2).find((m) => m !== s.c && isCarbon(g, m) && dbl(c2, m));
  const A = G.clone(g); putGroup(A, s.x, '[OH]'); delete A.atoms[s.c].chi;
  const B = G.clone(g);
  B.bonds = B.bonds.filter((b) => !((b.a === s.c && b.b === s.x) || (b.b === s.c && b.a === s.x)));
  G.bondOf(B, c2, c3).o = 1; G.bondOf(B, s.c, c2).o = 2;
  B.bonds.push({ a: c3, b: s.x, o: 1 });
  putGroup(B, s.x, '[OH]'); delete B.atoms[s.c].chi; delete B.atoms[c3].chi;
  return flatCanon(G.write(A).smiles) === flatCanon(G.write(B).smiles);
}
/** The cation SMILES of a halide, or throws for a substrate that cannot do SN1 / E1 in this course. Returns {s, cation, slow}. */
function cationOf(RX, what) {
  const s = readX(RX);
  if (s.vinylic || s.aryl) throw new Error(`excluded: ${what} does not happen at an sp² carbon (a vinylic or aryl halide): the cation would be very unstable`);
  if (!(s.cls >= 2 || s.benzylic || s.allylic)) throw new Error(`excluded: ${what} needs a carbocation, and a ${s.cls === 0 ? 'methyl' : 'primary'} cation is far too unstable (only 3°, 2°, allylic and benzylic halides ionise)`);
  if (cationRearranges(s)) throw new Error('excluded: its carbocation could rearrange (a hydride or methyl shift would give a more stable cation); rearrangements are not covered here');
  if (s.allylic && !allylicSymmetric(s)) throw new Error('excluded: an allylic cation puts the nucleophile on either end of the allyl unit (resonance), so there are two products; that is not covered here');
  const g = G.clone(s.g);
  dropAtom(g, s.x);
  const c = s.c > s.x ? s.c - 1 : s.c;
  g.atoms[c].q = 1; g.atoms[c].bracket = true; delete g.atoms[c].chi;
  return { s, cation: canon(G.write(g).smiles), slow: s.cls === 2 && !s.benzylic && !s.allylic };
}

/**
 * predictSN1(RX, nuId) -> {ok, mech:'SN1', cation, products:[canonical isomeric: BOTH enantiomers when the carbon is a stereocentre in the product], racemic, slow (a 2° halide:
 * its cation is not very stable), equation, rate:'k[RX]', why}. 3°, 2°, allylic and benzylic halides; methyl, plain 1° and sp2 halides and cations that could rearrange are refused.
 * For H2O / ROH the product is the neutral alcohol / ether (the oxonium ion loses H+ in the last step).
 */
export function predictSN1(RX, nuId) {
  const Nu = NUCLEOPHILES[nuId];
  if (!Nu) throw new Error('unknown nucleophile ' + nuId);
  const { s, cation, slow } = cationOf(RX, 'SN1');
  const [n0] = stereoCounts(RX);
  if (n0 > 1 || (n0 === 1 && !s.chiralPossible)) throw new Error('excluded: a second stereocentre would make the two products diastereomers (Chapter 6)');
  const g = G.clone(s.g);
  putGroup(g, s.x, Nu.attach);
  delete g.atoms[s.c].chi;
  const w0 = G.write(g);
  const isCentre = centreAt(w0.smiles, w0.order.indexOf(s.c));
  const flatP = canon(w0.smiles);
  const products = isCentre
    ? ['@', '@@'].map((tag) => { const h = G.clone(g); h.atoms[s.c].chi = { nb: slotsAt(h, s.c), tag }; return canon(G.write(h).smiles); }).sort()
    : [flatP];
  const racemic = products.length === 2;
  let equation;
  if (Nu.id === 'NH3') equation = eqn([RX, 'N', 'N'], [flatP, '[NH4+]', `[${s.X}-]`]);
  else if (Nu.neutral) equation = eqn([RX, Nu.reactant], [flatP, s.X]);
  else equation = eqn([RX, Nu.reactant], [flatP, `[${s.X}-]`]);
  return {
    ok: true, mech: 'SN1', sub: RX, nu: nuId, X: s.X, cls: s.cls, cation, products, product: products[0], racemic, slow, equation, rate: 'k[RX]',
    why: `SN1: the C–${s.X} bond breaks first (the slow step) and leaves a flat carbocation; ${Nu.short} then bonds to it from either face.${racemic ? ' The carbon becomes a new stereocentre, so both enantiomers form equally: a racemic mixture.' : ''}${slow ? ' A secondary cation is not very stable, so a secondary halide reacts slowly by SN1.' : ''}${Nu.neutral ? ' A second solvent molecule then removes H⁺ from the oxonium ion.' : ''}`
  };
}

// ---------------------------------------------------------------- elimination
/** The graph of the alkene made by losing H from beta carbon k and X from c, and its substituent count (carbon groups on the two C=C carbons). */
function alkeneGraph(s, k) {
  const g = G.clone(s.g);
  g.atoms[k].h -= 1;
  G.bondOf(g, s.c, k).o = 2;
  delete g.atoms[s.c].chi; delete g.atoms[k].chi;
  dropAtom(g, s.x);
  const c = s.c > s.x ? s.c - 1 : s.c, kk = k > s.x ? k - 1 : k;
  const subst = nbrs(g, c).filter((m) => m !== kk && isCarbon(g, m)).length + nbrs(g, kk).filter((m) => m !== c && isCarbon(g, m)).length;
  return { g, subst };
}
/** The atoms of the single ring of a monocyclic molecule in cyclic order; {many:true} for fused / several rings; null for no ring. */
function ringCycle(g) {
  const alive = new Set(g.atoms.map((_, i) => i));
  let changed = true;
  while (changed) {
    changed = false;
    for (const v of [...alive]) if (nbrs(g, v).filter((w) => alive.has(w)).length <= 1) { alive.delete(v); changed = true; }
  }
  if (!alive.size) return null;
  const core = [...alive];
  if (core.some((v) => nbrs(g, v).filter((w) => alive.has(w)).length !== 2)) return { many: true };
  const cyc = [core[0]];
  let prev = -1, cur = core[0];
  for (;;) {
    const nx = nbrs(g, cur).filter((w) => alive.has(w) && w !== prev)[0];
    if (nx === core[0] || nx === undefined) break;
    cyc.push(nx); prev = cur; cur = nx;
  }
  return cyc.length === core.length ? cyc : { many: true };
}
/**
 * Which face of the ring plane (in the one flat drawing RDKit makes of the molecule) is group `t` of ring atom `a` on? true = towards the viewer, false = away, null = not known
 * (the atom has no written @ / @@). With the neighbour list reordered to [t, ring-prev, ring-next, the fourth group], '@' means the three run counter-clockwise as seen from t;
 * the fourth group projects outwards from the ring, so a counter-clockwise triple in the drawing with '@' puts t on the viewer's side. Only the SAME drawing is compared
 * between two atoms, so which side is "up" does not matter: only whether two groups agree.
 */
function faceOf(s, pos, cyc, a, t) {
  const A = s.g.atoms[a];
  if (!A.chi) return null;
  const k = cyc.indexOf(a);
  const p = cyc[(k + cyc.length - 1) % cyc.length], n = cyc[(k + 1) % cyc.length];
  const toks = A.chi.nb;
  const other = toks.find((q) => q !== t && q !== p && q !== n);
  const tag = parityOdd(toks, [t, p, n, other]) ? flip(A.chi.tag) : A.chi.tag;
  const cx = cyc.reduce((u, v) => u + pos[v].x, 0) / cyc.length, cy = cyc.reduce((u, v) => u + pos[v].y, 0) / cyc.length;
  const ox = pos[a].x - cx, oy = pos[a].y - cy, ol = Math.hypot(ox, oy) || 1;
  const O = { x: pos[a].x + ox / ol, y: pos[a].y + oy / ol };
  const area = (pos[n].x - pos[p].x) * (O.y - pos[p].y) - (pos[n].y - pos[p].y) * (O.x - pos[p].x);
  return (tag === '@') === (area > 0);
}
/** Can this ring beta carbon give up an H that is TRANS to X? A CH2 always can; a CH(R) only when R is CIS to X. true / false / null (marks missing). */
function betaHasAntiH(s, pos, cyc, k) {
  const exo = nbrs(s.g, k).filter((m) => !cyc.includes(m));
  if (s.g.atoms[k].h >= 2 || !exo.length) return true;
  const fx = faceOf(s, pos, cyc, s.c, s.x), fr = faceOf(s, pos, cyc, k, exo[0]);
  if (fx == null || fr == null) return null;
  return fx === fr;
}
/** Alkenes by their beta carbons: list [{smiles, beta, betas, subst, major}], the alkenes the ring rule forbids, and whether the ring rule was applied. */
function candidatesFor(s, ringRule) {
  const cands = [], blocked = [];
  let pos = null, cyc = null, ring = false;
  if (ringRule && s.ring && s.ringSize === 6) {
    cyc = ringCycle(s.g);
    if (!cyc || cyc.many) throw new Error('excluded: the anti-periplanar ring rule is only applied to a single six-membered ring (not to fused rings)');
    ring = true;
    pos = coords2d(s.smiles);
  }
  for (const b of s.betas) {
    const A = alkeneGraph(s, b.atom);
    const smiles = canon(G.write(A.g).smiles);
    if (ring && cyc.includes(s.c) && cyc.includes(b.atom)) {
      const ok = betaHasAntiH(s, pos, cyc, b.atom);
      if (ok === null) throw new Error('excluded: write the ring as cis or trans: the anti-periplanar rule needs it');
      if (!ok) { blocked.push({ beta: b.atom, smiles, subst: A.subst }); continue; }
    }
    cands.push({ smiles, beta: b.atom, subst: A.subst });
  }
  const seen = new Map();
  for (const c of cands) { if (!seen.has(c.smiles)) seen.set(c.smiles, { ...c, betas: [c.beta] }); else seen.get(c.smiles).betas.push(c.beta); }   // equivalent beta carbons give one compound
  const list = [...seen.values()];
  const top = Math.max(...list.map((c) => c.subst));
  list.forEach((c) => { c.major = c.subst === top; });
  return { list, blocked, ring };
}
const NO_BETA = 'no hydrogen on a neighbouring carbon: no elimination';
function eliminationResult(s, ringRule) {
  if (!s.betas.length) throw new Error('excluded: ' + NO_BETA);
  const { list, blocked, ring } = candidatesFor(s, ringRule);
  if (!list.length) throw new Error('excluded: ' + NO_BETA);
  return {
    alkenes: list.map(({ smiles, beta, betas, subst, major }) => ({ smiles, beta, betas, subst, major })),
    major: list.filter((c) => c.major).map((c) => c.smiles), minor: list.filter((c) => !c.major).map((c) => c.smiles),
    zaitsev: list.length > 1, ring, ringBlocked: blocked, mixture: list.filter((c) => c.major).length > 1
  };
}

/**
 * predictE2(RX, baseId) -> {ok, mech:'E2', alkenes:[{smiles, beta, subst (carbon groups on the C=C), major}], major:[smiles], minor:[smiles], zaitsev (the choice is made by substitution),
 *   ring (the six-membered-ring rule was applied), ringBlocked:[{beta, smiles, subst}] (alkenes the anti rule forbids), equation, rate, why}
 * baseId: KOH, NaOEt, NaOMe (or HO, MeO, EtO). Refuses vinylic / aryl halides, halides with no beta H and, on a six-membered ring, a ring written without cis / trans.
 */
export function predictE2(RX, baseId) {
  const B = BASES[baseId] || (NUCLEOPHILES[baseId] && NUCLEOPHILES[baseId].base === 'strong' ? { ...NUCLEOPHILES[baseId], strong: true } : null);
  if (!B || !B.strong) throw new Error('excluded: E2 needs a strong base (KOH, NaOCH₂CH₃, NaOCH₃)');
  const s = readX(RX);
  if (s.vinylic || s.aryl) throw new Error('excluded: elimination from a vinylic or aryl halide is not covered here');
  if (s.allylic) throw new Error('excluded: an allylic halide would eliminate to a conjugated diene, which is not covered here');
  const r = eliminationResult(s, true);
  const equation = eqn([RX, B.reactant], [r.major[0], B.conj, `[${s.X}-]`], 'the base takes H⁺, so it becomes its conjugate acid');
  const ringTxt = r.ring ? ' On a six-membered ring E2 needs the H trans to X (trans-diaxial in the chair, with X axial), so only those β hydrogens can go.' : '';
  const why = `E2: the base removes a β H while the C–${s.X} bond breaks, all in one step; the H and the ${s.X} must be anti.${r.zaitsev ? ' The alkene with more carbon groups on the C=C (the more substituted one) is the major product (Zaitsev).' : ''}${ringTxt}`;
  return { ok: true, mech: 'E2', sub: RX, base: baseId, X: s.X, cls: s.cls, ...r, equation, rate: 'k[RX][base]', why };
}

/** predictE1(RX) -> like E2 (same Zaitsev ranking, but no anti rule: every beta H can go) plus {cation, mech:'E1', rate:'k[RX]', slow}. Allowed and refused like SN1. */
export function predictE1(RX) {
  const { s, cation, slow } = cationOf(RX, 'E1');
  if (s.allylic) throw new Error('excluded: an allylic halide would eliminate to a conjugated diene, which is not covered here');
  const r = eliminationResult(s, false);
  return {
    ok: true, mech: 'E1', sub: RX, X: s.X, cls: s.cls, cation, ...r, slow, equation: eqn([RX], [r.major[0], s.X], `the solvent takes H⁺: H${s.X} forms`), rate: 'k[RX]',
    why: `E1: the C–${s.X} bond breaks first (the slow step) and leaves a carbocation; the solvent then removes a β H and the C=C forms.${r.zaitsev ? ' The more substituted alkene is the major product (Zaitsev).' : ''}${slow ? ' A secondary cation is not very stable, so this is slow.' : ''}`
  };
}

// ---------------------------------------------------------------- the choice (McMurry 7.9, without E1cB)
const prodList = (pred, role) => pred.products.map((p) => ({ smiles: p, mech: pred.mech, role }));
const alkenesOf = (pred, majorRole) => pred.alkenes.map((a) => ({ smiles: a.smiles, mech: pred.mech, role: a.major ? majorRole : 'minor' }));
const asMinor = (list) => list.map((x) => ({ ...x, role: 'minor' }));
const tryOf = (f) => { try { return f(); } catch (e) { return null; } };

/** The profile of a reagent id (a NUCLEOPHILES id or a BASES id). */
export function reagentProfile(id) {
  if (NUCLEOPHILES[id]) { const n = NUCLEOPHILES[id]; return { id, kind: 'nu', label: n.label, nuc: n.nuc, base: n.base, protic: n.protic, nuId: id, strongBase: n.base === 'strong' }; }
  if (BASES[id]) { const b = BASES[id]; return { id, kind: b.strong ? 'base' : 'heat', label: b.label, nuc: b.strong ? 'strong' : 'weak', base: b.strong ? 'strong' : 'weak', protic: !b.strong, nuId: b.nuId, baseId: id, strongBase: !!b.strong }; }
  throw new Error('unknown reagent ' + id);
}
const factsOf = (s, P) => ({ cls: s.cls, className: HALIDE_CLASS_NAME[s.cls], allylic: s.allylic, benzylic: s.benzylic, strongNu: P.nuc === 'strong', strongBase: P.strongBase, protic: !!P.protic, X: s.X });

/**
 * decide(RX, reagentId) -> {ok, mechs:['SN2'|'SN1'|'E2'|'E1' ... most important first], major (the mechanism the book's summary names), products:[{smiles, mech, role:'major'|'minor'}], reason (one line),
 *   caveman, noReaction?:true, cls, facts}. Methyl: SN2 with a strong nucleophile; 1°: SN2 with a non-basic nucleophile, a strong base gives E2 (and SN2); 2°: SN2 (non-basic), E2 (strong base),
 * SN1 + E1 (weak, slow) (the nucleophile id HO = aqueous NaOH: SN2 major with E2 beside it on 1° and 2°; the ids MeO / EtO: E2 major with SN2; KOH / NaOEt / NaOMe: E2 only); 3°: E2 (strong base), SN1 + E1 (weak or non-basic nucleophile in a protic solvent), never SN2; allylic and benzylic: SN2 fast, SN1 possible; vinylic and aryl: nothing.
 * {ok:false, excluded:true, reason} for a substrate or a cation the course does not model (a rearrangement, a ring written without cis / trans).
 */
export function decide(RX, reagentId) {
  const d = decideCore(RX, reagentId);
  // a six-membered ring: when the anti rule forbids the Zaitsev alkene, the line says so (the generic E2 sentence would claim Zaitsev)
  if (d.ok && !d.noReaction && d.major === 'E2') {
    try {
      const P = reagentProfile(reagentId);
      const e = predictE2(RX, P.baseId || P.nuId);
      if (e.ring && e.ringBlocked.length) {
        const c = HALIDE_CLASS_SHORT[d.cls];
        d.reason = `${c} halide + a strong base: E2, but on this six-membered ring only a β H trans to the halogen can leave. The H that would give the more substituted alkene is cis to the halogen, so only the other alkene forms (not the Zaitsev one).`;
        d.caveman = `${c} + strong base: E2. Ring: H must be trans to halogen. Zaitsev alkene blocked.`;
      }
    } catch (err) { /* no ring note */ }
  }
  return d;
}
function decideCore(RX, reagentId) {
  const P = reagentProfile(reagentId);
  const s = halideSites(RX);
  if (!s.ok) return { ok: false, excluded: true, reason: s.reason };
  const cls = s.cls;
  const facts = factsOf(s, P);
  const none = (reason, caveman) => ({ ok: true, mechs: [], major: null, products: [], noReaction: true, reason, caveman, cls, facts });
  const done = (mechs, major, products, reason, caveman) => ({ ok: true, mechs, major, products, reason, caveman, cls, facts });
  if (s.vinylic || s.aryl) return none('No SN1 or SN2 at an sp² carbon: a vinylic or aryl halide cannot do either, whatever the reagent.', 'sp² carbon: no SN1, no SN2. Nothing happens.');
  const strongNu = P.nuc === 'strong', base = P.strongBase;
  const sn2 = () => predictSN2(RX, P.nuId), e2 = () => predictE2(RX, P.baseId || P.nuId), sn1 = () => predictSN1(RX, P.nuId), e1 = () => predictE1(RX);
  const hasBeta = s.betas.length > 0;
  const stable = s.benzylic || s.allylic;
  try {
    if (cls === 0) {
      if (strongNu) return done(['SN2'], 'SN2', prodList(sn2(), 'major'), 'Methyl halide + a strong nucleophile: SN2. Nothing blocks the back side and there is no β H, so nothing else competes.', 'Methyl: SN2. Nu hit back side. No β H. Done.');
      return none('Methyl halide + a weak nucleophile: no reaction. SN2 needs a strong nucleophile, and a methyl cation does not form, so SN1 cannot start.', 'Methyl, weak Nu: nothing. SN2 needs strong Nu. Methyl cation never forms.');
    }
    if (cls === 3) {
      if (base) return done(['E2'], 'E2', alkenesOf(e2(), 'major'), '3° halide + a strong base: E2. SN2 is impossible at a 3° carbon, so the base takes a β H instead.', '3° + strong base: E2. No SN2 at 3°. Base grab β H.');
      const a = sn1(), b = stable ? tryOf(e1) : e1();
      const mix = [...prodList(a, 'major'), ...(b ? asMinor(alkenesOf(b, 'minor')) : [])];
      const mechs = b ? ['SN1', 'E1'] : ['SN1'];
      if (!strongNu) return done(mechs, 'SN1', mix, '3° halide + a weak nucleophile in a protic solvent: SN1 and E1 compete (one carbocation, two exits). Substitution is the bigger share in the cold; elimination grows with heat.', '3° + weak Nu, protic: SN1 and E1 share one cation. Cold: more SN1. Heat: more E1.');
      return done(mechs, 'SN1', mix, '3° halide + a non-basic nucleophile: SN2 is blocked at a 3° carbon, but in a protic solvent the halide ionises first, so SN1 (with E1) still happens.', '3° + good Nu: SN2 blocked. Protic solvent: halide leaves first. SN1 + E1.');
    }
    if (cls === 1 && !stable) {
      if (!hasBeta) return none('A neopentyl-type 1° halide: SN2 is blocked by the crowded β carbon, there is no β H for E2, and a 1° cation does not form. No reaction.', 'Neopentyl: SN2 blocked. No β H. No 1° cation. Nothing.');
      if (base && P.id === 'HO') {
        // the nucleophile id HO means aqueous NaOH (book 7.4): substitution; KOH in hot ethanol (a BASES id) is the E2 line
        const q = sn2(), p = tryOf(e2);
        return done(p ? ['SN2', 'E2'] : ['SN2'], 'SN2', [...prodList(q, 'major'), ...(p ? asMinor(alkenesOf(p, 'minor')) : [])],
          'Aqueous NaOH on a 1° halide substitutes (an alcohol, book 7.4); KOH in ethanol with heat tips it to E2 (the 7.9 line).',
          'Aqueous NaOH on 1°: SN2, alcohol. KOH, ethanol, heat: E2.');
      }
      if (base) {
        const p = e2(), q = tryOf(sn2);
        return done(q ? ['E2', 'SN2'] : ['E2'], 'E2', [...alkenesOf(p, 'major'), ...(q ? prodList(q, 'minor') : [])], '1° halide + a strong base: the book’s table says E2, but an unhindered 1° halide also substitutes (SN2), so you get a mixture; heat favours elimination.', '1° + strong base: table says E2. 1° also does SN2. Mixture. Heat: more E2.');
      }
      if (strongNu) return done(['SN2'], 'SN2', prodList(sn2(), 'major'), '1° halide + a strong nucleophile that is a weak base: SN2.', '1° + good Nu, weak base: SN2.');
      return none('1° halide + a weak nucleophile in a protic solvent: no reaction. A 1° cation does not form (no SN1 or E1) and SN2 with a weak nucleophile is very slow.', '1° + weak Nu: nothing. No 1° cation. SN2 too slow.');
    }
    if (cls === 2 && !stable) {
      if (base && P.id === 'HO') {
        const q = sn2(), p = tryOf(e2);
        return done(p ? ['SN2', 'E2'] : ['SN2'], 'SN2', [...prodList(q, 'major'), ...(p ? asMinor(alkenesOf(p, 'minor')) : [])],
          'Aqueous HO⁻ on a 2° halide substitutes with inversion (the book’s (R)-2-bromooctane example); some alkene forms, and KOH in hot ethanol makes E2 the main path.',
          'Aqueous HO⁻ on 2°: SN2, flip. Some alkene. KOH, hot ethanol: E2 main.');
      }
      if (base) {
        // KOH / NaOEt / NaOMe are the designated E2 conditions; CH₃O⁻ and CH₃CH₂O⁻ as nucleophile ids (an alkoxide in its own alcohol) let SN2 compete; the id HO is aqueous NaOH and substitutes (handled above)
        const q = P.kind === 'nu' ? tryOf(sn2) : null;
        return done(q ? ['E2', 'SN2'] : ['E2'], 'E2', [...alkenesOf(e2(), 'major'), ...(q ? prodList(q, 'minor') : [])],
          q ? '2° halide + a strong base that is also a good nucleophile: the table says E2 (Zaitsev), but SN2 competes, with inversion at the carbon; heat favours E2.' : '2° halide + a strong base: E2 (Zaitsev). The strong base removes a β H faster than it can attack the crowded carbon.',
          q ? '2° + strong base: E2 main (Zaitsev). SN2 also, with flip. Heat: more E2.' : '2° + strong base: E2. Zaitsev.');
      }
      if (strongNu) return done(['SN2'], 'SN2', prodList(sn2(), 'major'), '2° halide + a strong nucleophile that is a weak base: SN2, with inversion at the carbon.', '2° + good Nu, weak base: SN2. Flip.');
      const a = sn1(), b = e1();
      return done(['SN1', 'E1'], 'SN1', [...prodList(a, 'major'), ...asMinor(alkenesOf(b, 'minor'))], '2° halide + a weak nucleophile in a protic solvent: SN1 and E1 together, both slow (a 2° cation is not very stable). Heat favours E1.', '2° + weak Nu, protic: SN1 + E1, slow. Heat: more E1.');
    }
    // allylic or benzylic, 1° or 2°
    const what = s.benzylic ? 'Benzylic' : 'Allylic';
    if (base && hasBeta && !s.allylic) return done(['E2'], 'E2', alkenesOf(e2(), 'major'), 'A 2° benzylic halide + a strong base: E2 (the alkene next to the ring).', '2° benzylic + strong base: E2.');
    if (strongNu) return done(['SN2'], 'SN2', prodList(sn2(), 'major'), `${what} halides are fast in SN2 (the π system helps the transition state): SN2${base ? ' (nothing to eliminate here)' : ''}.`, `${what}: SN2 fast.`);
    const a = sn1(), b = hasBeta && !s.allylic ? tryOf(e1) : null;
    return done(b ? ['SN1', 'E1'] : ['SN1'], 'SN1', [...prodList(a, 'major'), ...(b ? asMinor(alkenesOf(b, 'minor')) : [])], `${what} halide + a weak nucleophile in a protic solvent: SN1, because the cation is stabilised by resonance${b ? ' (E1 beside it, since there is a β H)' : ''}.`, `${what} cation stable by resonance: SN1.`);
  } catch (err) {
    return { ok: false, excluded: true, reason: String(err.message || err).replace(/^excluded:\s*/, '') };
  }
}

// ---------------------------------------------------------------- mechanisms (mechanism-player format; every step is built by applying its arrows)
const comps = (state) => canon(buildMolblock(state)).split('.');
const carbons = (p) => p.replace(/[^C]/g, '').length;
const organicFirst = (parts) => parts.slice().sort((p, q) => carbons(q) - carbons(p) || (p.includes('+') ? 1 : 0) - (q.includes('+') ? 1 : 0));
/** after = what the arrows leave, with the organic species first. */
const afterOf = (st) => organicFirst(comps(stepResult(st)));
const anionOf = (X) => `[${X}-]`;
const sameFlat = (a, b) => flatCanon(a) === flatCanon(b);
/** The charged heavy atom of a part (a cation's C+, the onium atom) and its hydrogens in the scene. */
function chargedAtom(sc, part, q = 1) {
  const m = sc.maps[part];
  const k = m.heavy.findIndex((i) => sc.atoms[i].charge === q);
  return k < 0 ? null : { idx: m.heavy[k], hs: m.h[k] || [] };
}

/** SN2. Anionic nucleophile: ONE step (lone pair on Nu -> C; C-X pair -> X). A neutral nucleophile (H2O, ROH, NH3) needs a second step in which another molecule removes H+. */
export function sn2Mechanism(RX, nuId) {
  const pred = predictSN2(RX, nuId);
  const Nu = NUCLEOPHILES[nuId];
  const s = readX(RX);
  const st1 = { before: [RX, Nu.reactant], layout: [{}, {}], arrows: [], after: [], label: '' };
  const sc = buildScene(st1);
  const C = sc.maps[0].heavy[s.c], X = sc.maps[0].heavy[s.x], N = sc.maps[1].heavy[Nu.site];
  st1.arrows = [
    { from: { lp: N }, to: { atom: C }, note: `Start at a lone pair on ${Nu.short} and point to the carbon bonded to ${s.X}.`, why: `A lone pair on ${Nu.short} attacks the δ+ carbon from the BACK, the side opposite ${s.X}, and starts to form the new bond.` },
    { from: { bond: [C, X] }, to: { atom: X }, why: `At the same moment the C–${s.X} bond pair leaves with ${s.X}, which departs as ${s.X}⁻.` }
  ];
  st1.after = Nu.neutral ? afterOf(st1) : [pred.product, anionOf(s.X)];
  st1.label = `One step, back-side attack: the nucleophile comes in opposite the ${s.X} while ${s.X}⁻ leaves.${s.centre ? ' The three other groups flip over like an umbrella in the wind, so the configuration inverts.' : ''} Rate = k[RX][Nu]: both molecules are in the one step.`;
  if (!Nu.neutral) return { reactants: [RX, Nu.reactant], products: st1.after, steps: [st1], rate: 'k[RX][Nu]' };
  const st2 = { before: [st1.after[0], Nu.reactant], dropped: [anionOf(s.X)], added: [Nu.reactant], layout: [{}, {}], arrows: [], after: [], label: '' };
  const sc2 = buildScene(st2);
  const cat = chargedAtom(sc2, 0), N2 = sc2.maps[1].heavy[Nu.site];
  st2.arrows = [
    { from: { lp: N2 }, to: { atom: cat.hs[0] }, why: `A second ${Nu.short} molecule uses a lone pair to take an H⁺ from the positively charged atom.` },
    { from: { bond: [cat.idx, cat.hs[0]] }, to: { atom: cat.idx }, why: 'The N–H or O–H bond pair stays on that atom, so it is neutral again and the product is formed.' }
  ];
  if (cat.hs.length > 1) st2.equiv = cat.hs.slice(1).map((h2) => ({ [cat.hs[0]]: h2, [h2]: cat.hs[0] }));
  st2.after = afterOf(st2);
  st2.label = 'Another molecule of the nucleophile removes H⁺ from the positively charged atom. This last step only tidies the charge.';
  return { reactants: [RX, Nu.reactant], products: st2.after, steps: [st1, st2], rate: 'k[RX][Nu]' };
}

/** SN1: (1) C-X pair -> X (slow, the carbocation); (2) lone pair on Nu -> C+ (either face); (3) for H2O / ROH, a second solvent molecule removes H+. */
export function sn1Mechanism(RX, nuId) {
  const pred = predictSN1(RX, nuId);
  const Nu = NUCLEOPHILES[nuId];
  const s = readX(RX);
  const st1 = { before: [RX], layout: [{}], arrows: [], after: [], label: '' };
  const sc = buildScene(st1);
  const C = sc.maps[0].heavy[s.c], X = sc.maps[0].heavy[s.x];
  st1.arrows = [{ from: { bond: [C, X] }, to: { atom: X }, note: `The C–${s.X} bond breaks on its own.`, why: `The C–${s.X} bond pair leaves with ${s.X}, the more electronegative atom, and ${s.X} departs as ${s.X}⁻. The carbon is left with only six electrons: a carbocation.` }];
  st1.after = [pred.cation, anionOf(s.X)];
  st1.label = `Step 1 (slow, rate-determining): the C–${s.X} bond breaks and leaves a flat carbocation and ${s.X}⁻. Only the halide takes part, so rate = k[RX].`;
  const st2 = { before: [pred.cation, Nu.reactant], dropped: [anionOf(s.X)], added: [Nu.reactant], layout: [{}, {}], arrows: [], after: [], label: '' };
  const sc2 = buildScene(st2);
  const Cp = chargedAtom(sc2, 0).idx, N = sc2.maps[1].heavy[Nu.site];
  st2.arrows = [{ from: { lp: N }, to: { atom: Cp }, why: `A lone pair on ${Nu.short} attacks the positive carbon (it is short of electrons). The carbocation is flat, so ${Nu.short} can come in from the top or the bottom face.` }];
  st2.label = `Step 2 (fast): ${Nu.short} bonds to the carbocation from either face.${pred.racemic ? ' A new stereocentre forms in both configurations: a racemic mixture.' : ''}`;
  st2.after = afterOf(st2);
  if (!Nu.neutral) return { reactants: [RX], products: st2.after, steps: [st1, st2], rate: 'k[RX]' };
  const st3 = { before: [st2.after[0], Nu.reactant], added: [Nu.reactant], layout: [{}, {}], arrows: [], after: [], label: '' };
  const sc3 = buildScene(st3);
  const cat = chargedAtom(sc3, 0), N2 = sc3.maps[1].heavy[Nu.site];
  st3.arrows = [
    { from: { lp: N2 }, to: { atom: cat.hs[0] }, why: 'A solvent molecule uses a lone pair to take an H⁺ from the positively charged atom of the new product.' },
    { from: { bond: [cat.idx, cat.hs[0]] }, to: { atom: cat.idx }, why: 'The bond pair stays on that atom, which becomes neutral: the alcohol or ether is formed.' }
  ];
  if (cat.hs.length > 1) st3.equiv = cat.hs.slice(1).map((h2) => ({ [cat.hs[0]]: h2, [h2]: cat.hs[0] }));
  st3.after = afterOf(st3);
  st3.label = 'Step 3: a second solvent molecule removes H⁺ from the oxonium ion, and the neutral product forms.';
  return { reactants: [RX], products: st3.after, steps: [st1, st2, st3], rate: 'k[RX]' };
}

/** E2: ONE step, three arrows: base lone pair -> beta H; C-H pair -> the new C=C; C-X pair -> X. opts.beta = which beta carbon (graph index; default: the first major alkene's). */
export function e2Mechanism(RX, baseId, opts = {}) {
  const pred = predictE2(RX, baseId);
  const B = BASES[baseId] || NUCLEOPHILES[baseId];
  const s = readX(RX);
  const pick = opts.beta != null ? pred.alkenes.find((a) => a.betas.includes(opts.beta)) : pred.alkenes.find((a) => a.major);
  if (!pick) throw new Error('excluded: that beta carbon gives no alkene here');
  const beta = opts.beta != null ? opts.beta : pick.betas[0];
  const st = { before: [RX, B.reactant], layout: [{}, {}], arrows: [], after: [], label: '' };
  const sc = buildScene(st);
  const C = sc.maps[0].heavy[s.c], X = sc.maps[0].heavy[s.x], K = sc.maps[0].heavy[beta], hs = sc.maps[0].h[beta], H = hs[0], O = sc.maps[1].heavy[B.site];
  st.arrows = [
    { from: { lp: O }, to: { atom: H }, note: `Start at a lone pair on ${B.short} and point to a β hydrogen (an H on a carbon next to the C–${s.X} carbon).`, why: `A lone pair on the strong base ${B.short} takes a β H: an H on the carbon next to C–${s.X} is slightly acidic.` },
    { from: { bond: [H, K] }, to: { bond: [K, C] }, why: 'The C–H bond pair swings over to become the second bond of the new C=C (the π bond), between the β carbon and the carbon that held the halogen.' },
    { from: { bond: [C, X] }, to: { atom: X }, why: `At the same moment the C–${s.X} bond pair leaves with ${s.X}, which departs as ${s.X}⁻. Three arrows, one step: rate = k[RX][base].` }
  ];
  // the same mechanism with another H of that carbon, or with another beta carbon that gives the same alkene
  const eq = [];
  hs.slice(1).forEach((h2) => eq.push({ [H]: h2, [h2]: H }));
  pred.alkenes.filter((a) => a.smiles === pick.smiles).forEach((a) => a.betas.forEach((b2) => {
    if (b2 === beta) return;
    sc.maps[0].h[b2].forEach((h2) => eq.push({ [K]: sc.maps[0].heavy[b2], [sc.maps[0].heavy[b2]]: K, [H]: h2, [h2]: H }));
  }));
  if (eq.length) st.equiv = eq;
  st.after = afterOf(st);
  st.label = `One step: ${B.short} removes the β H, the C=C forms and ${s.X}⁻ leaves, all at once. The H and the ${s.X} must lie anti to each other.`;
  return { reactants: [RX, B.reactant], products: st.after, steps: [st], rate: 'k[RX][base]' };
}

/** E1: (1) C-X pair -> X (the carbocation); (2) solvent lone pair -> beta H and C-H pair -> the new C=C. opts.solvent ('H2O' | 'MeOH' | 'EtOH'), opts.alkene (SMILES of the alkene to make). */
export function e1Mechanism(RX, opts = {}) {
  const pred = predictE1(RX);
  const s = readX(RX);
  const Sv = NUCLEOPHILES[opts.solvent || 'H2O'];
  const pick = opts.alkene ? pred.alkenes.find((a) => a.smiles === canon(opts.alkene)) : pred.alkenes.find((a) => a.major);
  if (!pick) throw new Error('excluded: that alkene does not form here');
  const st1 = { before: [RX], layout: [{}], arrows: [], after: [], label: '' };
  const sc = buildScene(st1);
  const C = sc.maps[0].heavy[s.c], X = sc.maps[0].heavy[s.x];
  st1.arrows = [{ from: { bond: [C, X] }, to: { atom: X }, why: `The C–${s.X} bond pair leaves with ${s.X}, and the carbocation forms (the slow step).` }];
  st1.after = [pred.cation, anionOf(s.X)];
  st1.label = `Step 1 (slow): the C–${s.X} bond breaks and leaves a carbocation; this is the same first step as SN1. Rate = k[RX].`;
  const st2 = { before: [pred.cation, Sv.reactant], dropped: [anionOf(s.X)], added: [Sv.reactant], layout: [{}, {}], arrows: [], after: [], label: '' };
  const sc2 = buildScene(st2);
  const Cp = chargedAtom(sc2, 0).idx, N = sc2.maps[1].heavy[Sv.site];
  const heavy = sc2.maps[0].heavy;
  const around = sc2.bonds.filter((b) => b.a === Cp || b.b === Cp).map((b) => (b.a === Cp ? b.b : b.a)).filter((k) => sc2.atoms[k].el === 'C' && (sc2.maps[0].h[heavy.indexOf(k)] || []).length > 0);
  const arrowsFor = (k, hh) => [{ from: { lp: N }, to: { atom: hh } }, { from: { bond: [hh, k] }, to: { bond: [k, Cp] } }];
  const makes = (k) => sameFlat(organicFirst(comps(stepResult({ ...st2, arrows: arrowsFor(k, sc2.maps[0].h[heavy.indexOf(k)][0]) })))[0], pick.smiles);
  const chosen = around.find(makes);
  if (chosen == null) throw new Error('could not place the β hydrogen');
  const hList = sc2.maps[0].h[heavy.indexOf(chosen)];
  st2.arrows = [
    { from: { lp: N }, to: { atom: hList[0] }, note: 'Start at a lone pair on the solvent oxygen and point to a β hydrogen.', why: `A lone pair on a solvent molecule (${Sv.short}, a weak base) takes a β H from a carbon next to the carbocation.` },
    { from: { bond: [hList[0], chosen] }, to: { bond: [chosen, Cp] }, why: 'The C–H bond pair becomes the π bond of the new C=C, next to the carbon that was positive.' }
  ];
  const eq = [];
  hList.slice(1).forEach((h2) => eq.push({ [hList[0]]: h2, [h2]: hList[0] }));
  around.filter((k2) => k2 !== chosen && makes(k2)).forEach((k2) => sc2.maps[0].h[heavy.indexOf(k2)].forEach((h2) => eq.push({ [chosen]: k2, [k2]: chosen, [hList[0]]: h2, [h2]: hList[0] })));
  if (eq.length) st2.equiv = eq;
  st2.after = afterOf(st2);
  st2.label = 'Step 2 (fast): the solvent removes a β H and the C=C forms. If the solvent bonds to the carbocation instead, you get the SN1 product: both come from the same carbocation.';
  return { reactants: [RX], products: st2.after, steps: [st1, st2], rate: 'k[RX]' };
}

// ---------------------------------------------------------------- Grignard reagents (McMurry 7.3)
const ACIDIC = 'an acidic hydrogen destroys the Grignard reagent as it forms';
/** An acidic hydrogen (O-H, N-H, S-H, CO2H, terminal alkyne C-H) or a group a Grignard reagent attacks (C=O, nitro, nitrile) -> reason, else null. */
function grignardProblem(g) {
  for (let i = 0; i < g.atoms.length; i++) {
    const a = g.atoms[i];
    if (['O', 'N', 'S'].includes(a.el) && a.h > 0) return `${ACIDIC} (the ${a.el}–H would give its H to the carbon–magnesium bond: R–H forms instead)`;
    if (a.el === 'C' && a.h > 0 && g.bonds.some((b) => b.o === 3 && (b.a === i || b.b === i))) return `${ACIDIC} (a terminal alkyne C–H is acidic enough)`;
    if (a.el === 'N') return 'a nitro, nitrile or imine group would react with the Grignard reagent itself';
    if (a.el === 'O' && g.bonds.some((b) => (b.a === i || b.b === i) && b.o === 2)) return 'a C=O group would react with the Grignard reagent itself';
  }
  return null;
}
/**
 * grignard(RX) -> {ok, reagent (R-MgX), protonolysis:{H2O: R-H, D2O: R-D}, X, why}. Works for alkyl, vinylic and aryl halides. Refuses a substrate with an O-H, N-H, S-H or CO2H
 * (the reagent would destroy itself as it forms) and any group the reagent would attack. A written configuration is lost (the carbon bonded to Mg is not configurationally stable),
 * so the products are flat.
 */
export function grignard(RX) {
  const s = halideSites(RX, { any: true });
  if (!s.ok) throw new Error('excluded: ' + s.reason);
  if (s.g.atoms.some((a) => !['C', 'O', 'N', 'S', 'Cl', 'Br', 'I', 'F'].includes(a.el)) || s.g.atoms.some((a) => a.q !== 0 && a.el !== 'N' && a.el !== 'O')) throw new Error('excluded: only simple halides are covered here');
  const prob = grignardProblem(s.g);
  if (prob) throw new Error('excluded: ' + prob);
  const g = G.clone(s.g);
  delete g.atoms[s.c].chi;
  const mg = newAtom(g, { el: 'Mg', bracket: true, h: 0 });
  g.bonds = g.bonds.filter((b) => !((b.a === s.c && b.b === s.x) || (b.b === s.c && b.a === s.x)));
  g.bonds.push({ a: s.c, b: mg, o: 1 }, { a: mg, b: s.x, o: 1 });
  const reagent = canon(G.write(g).smiles);
  const prot = (isD) => {
    const h = G.clone(s.g);
    delete h.atoms[s.c].chi;
    if (!isD) { h.atoms[s.c].h += 1; dropAtom(h, s.x); return canon(G.write(h).smiles); }
    h.atoms[s.x] = { el: '*', q: 0, h: 0, bracket: false };          // the D is written in as [2H] after the graph is written
    return canon(G.write(h).smiles.replace('*', '[2H]'));
  };
  return {
    ok: true, mech: 'Grignard', sub: RX, X: s.X, reagent, protonolysis: { H2O: prot(false), D2O: prot(true) },
    why: `Mg inserts into the C–${s.X} bond (in dry ether) and makes R–Mg–${s.X}. The carbon is now bonded to a metal, so it is nucleophilic and strongly basic: water (or D₂O) gives it an H (or D) and the alkane forms.`
  };
}

// ---------------------------------------------------------------- halides from alcohols (McMurry 7.2)
export const ALCOHOL_REAGENTS = {
  HBr: { id: 'HBr', label: 'HBr', X: 'Br' }, HCl: { id: 'HCl', label: 'HCl', X: 'Cl' }, HI: { id: 'HI', label: 'HI', X: 'I' },
  PBr3: { id: 'PBr3', label: 'PBr₃', X: 'Br', inversion: true }, SOCl2: { id: 'SOCl2', label: 'SOCl₂ (pyridine)', X: 'Cl', inversion: true }
};
/**
 * fromAlcohol(ROH, 'HBr'|'HCl'|'HI'|'PBr3'|'SOCl2') -> {ok, product, inverted, racemic, labels:{before, after}, sameOrder, mech:'SN1'|'SN2', X, why}.
 * HX: a 3° or 2° alcohol goes by SN1 (a stereocentre becomes a racemate, drawn flat), a 1° one by SN2. PBr3 and SOCl2 work on 1° and 2° alcohols with INVERSION
 * at a written stereocentre (back-side attack) and are refused on 3° alcohols.
 */
export function fromAlcohol(ROH, rid) {
  const R = ALCOHOL_REAGENTS[rid];
  if (!R) throw new Error('unknown reagent ' + rid);
  let g;
  try { g = G.parse(ROH); } catch (e) { throw new Error('excluded: not a valid structure'); }
  if (!canon(ROH)) throw new Error('excluded: not a valid structure');
  if (g.atoms.some((a) => a.el !== 'C' && a.el !== 'O') || g.atoms.filter((a) => a.el === 'O').length !== 1) throw new Error('excluded: only simple alcohols (one OH, carbon and hydrogen otherwise) are covered');
  const o = g.atoms.findIndex((a) => a.el === 'O');
  const on = nbrs(g, o);
  if (g.atoms[o].h !== 1 || on.length !== 1 || !isCarbon(g, on[0]) || g.atoms[on[0]].ar) throw new Error('excluded: an alcohol with the OH on an sp³ carbon is needed');
  const c = on[0];
  if (g.bonds.some((b) => (b.a === c || b.b === c) && b.o >= 2)) throw new Error('excluded: an alcohol with the OH on an sp³ carbon is needed');
  const cls = nbrs(g, c).filter((k) => k !== o && isCarbon(g, k)).length;
  const centre = !!g.atoms[c].chi;
  const chiralPossible = centreAt(ROH, c);
  const [n0, un0] = stereoCounts(ROH);
  const w = G.clone(g);
  w.atoms[o] = { el: R.X, q: 0, h: 0, bracket: false };
  if (R.inversion) {
    if (cls === 3) throw new Error('excluded: PBr₃ and SOCl₂ are used on 1° and 2° alcohols; a 3° alcohol is too crowded for the back-side attack (use HX instead)');
    if (centre && un0 > 0) throw new Error('excluded: another stereocentre is not specified');
    if (!centre && chiralPossible && n0 > 1) throw new Error('excluded: a mixture of diastereomers would form');
    if (w.atoms[c].chi) w.atoms[c].chi = { nb: w.atoms[c].chi.nb.slice(), tag: flip(w.atoms[c].chi.tag) };
    const wr = writeCanon(w);
    let labels = { before: null, after: null }, sameOrder = null;
    if (centre) ({ labels, sameOrder } = labelsFor(ROH, g, c, o, wr.written, wr.order));
    return {
      ok: true, alcohol: true, mech: 'SN2', sub: ROH, reagent: rid, X: R.X, cls, product: wr.smiles, products: [wr.smiles], inverted: centre, racemic: false, flat: !centre && chiralPossible, labels, sameOrder,
      why: `${R.label} turns the OH into a good leaving group and ${R.X}⁻ then attacks from the back (SN2), so a stereocentre inverts${centre ? '' : ' (this alcohol is drawn without a configuration)'}.`
    };
  }
  if (cls >= 2 && cationRearranges({ g, c, x: o, cls })) throw new Error('excluded: its carbocation could rearrange (a hydride or methyl shift would give a more stable cation); rearrangements are not covered here');
  if (n0 > 1 && cls >= 2) throw new Error('excluded: a second stereocentre would make the products diastereomers');
  delete w.atoms[c].chi;
  const wr = writeCanon(w);
  const viaCation = cls >= 2;
  return {
    ok: true, alcohol: true, mech: viaCation ? 'SN1' : 'SN2', sub: ROH, reagent: rid, X: R.X, cls, product: wr.smiles, products: [wr.smiles], inverted: false, racemic: viaCation && chiralPossible, flat: viaCation && chiralPossible, labels: { before: null, after: null }, sameOrder: null,
    why: viaCation
      ? `HX protonates the OH, water leaves and ${R.X}⁻ bonds to the carbocation (SN1; a 3° alcohol works best)${chiralPossible ? '. A new stereocentre forms from a flat cation: a racemate (drawn flat)' : ''}.`
      : `HX protonates the OH and ${R.X}⁻ displaces water by SN2 (a 1° alcohol cannot make a cation).`
  };
}

// ---------------------------------------------------------------- radical monohalogenation of an alkane (McMurry 7.2)
/**
 * monohalogenation(alkane, 'Cl'|'Br') -> [{smiles (canonical, flat), nH (hydrogens that give it), chiral (a potential stereocentre is created), carbons}]. The book says radical chlorination
 * is not selective, so the list claims nothing about which product is major.
 */
export function monohalogenation(alkane, X) {
  if (!['Cl', 'Br'].includes(X)) throw new Error('unknown halogen ' + X);
  const g = G.parse(alkane);
  if (g.atoms.some((a) => a.el !== 'C' || a.ar) || g.bonds.some((b) => b.o !== 1)) throw new Error('excluded: only saturated hydrocarbons are covered (alkanes and cycloalkanes)');
  const map = new Map();
  g.atoms.forEach((a, i) => {
    if (a.h < 1) return;
    const h = G.clone(g);
    h.atoms.forEach((z) => { delete z.chi; });
    h.atoms[i].h -= 1;
    const x = newAtom(h, { el: X });
    h.bonds.push({ a: i, b: x, o: 1 });
    const smiles = canon(G.write(h).smiles);
    if (!map.has(smiles)) map.set(smiles, { smiles, nH: 0, carbons: [] });
    const e = map.get(smiles); e.nH += a.h; e.carbons.push(i);
  });
  return [...map.values()].map((e) => {
    let chiral = false;
    try { chiral = tetraInfo(e.smiles).some((t) => t.center); } catch (err) { chiral = false; }
    return { ...e, chiral };
  }).sort((p, q) => p.smiles.localeCompare(q.smiles));
}

// ---------------------------------------------------------------- wrong answers (all computed)
/** The substitution product of a halide with a nucleophile, whatever the mechanism (flat): a distractor, never an answer. */
function plainSub(RX, nuId) {
  const s = halideSites(RX);
  if (!s.ok || s.vinylic || s.aryl) return null;
  const g = G.clone(s.g);
  putGroup(g, s.x, NUCLEOPHILES[nuId].attach);
  delete g.atoms[s.c].chi;
  return canon(G.write(g).smiles);
}
const otherNu = (not) => ['CN', 'I', 'HO', 'MeS', 'N3', 'Br'].filter((x) => x !== not);

/**
 * The wrong answers for the drill, built by engine calls or graph edits and each with its own `why`: [{smiles:[...], correct, kind, why}], the right answer first.
 *   SN2: retention, racemic, elim, unchanged, wrongNu     SN1: oneEnantiomer, elim, unchanged, wrongNu     E2 / E1: hofmann, subst, unchanged, notAnti
 *   Grignard: noD, alcohol, unchanged, reagent
 * opts.n = how many answers in all (default 12: every distinct one; the caller picks). opts.water ('D2O' | 'H2O') = which protonolysis is the question (Grignard).
 */
export function halideChoices(pred, opts = {}) {
  const water = opts.water || 'D2O';
  const rightList = pred.mech === 'Grignard' ? [pred.protonolysis[water]] : pred.mech === 'E2' || pred.mech === 'E1' ? pred.major : pred.products;
  const exact = (list) => list.map((p) => canon(p)).sort().join('|');      // exact (a wrong-enantiomer answer must stay different from the right one)
  const rightKey = exact(rightList);
  const cand = [];
  const push = (kind, products, why) => {
    if (!products || !products.length || products.some((p) => !p || !canon(p))) return;
    const key = exact(products);
    if (key === rightKey || cand.some((c) => c.key === key)) return;
    cand.push({ smiles: products.map((p) => canon(p)), correct: false, kind, why, key });
  };
  const RX = pred.sub;
  if (pred.alcohol) {
    // a halide made from an alcohol: the retention product, the racemate, the other halogen, an alkene, the alcohol itself
    const g = G.parse(RX);
    const o = g.atoms.findIndex((a) => a.el === 'O'), c = nbrs(g, o)[0];
    const w = G.clone(g);
    w.atoms[o] = { el: pred.X, q: 0, h: 0, bracket: false };
    if (pred.inverted) {
      push('retention', [writeCanon(w).smiles], `This keeps the configuration (retention). ${ALCOHOL_REAGENTS[pred.reagent].label} attacks from the back, opposite the OH, so the stereocentre inverts.`);
      const rac = ['@', '@@'].map((tag) => { const h = G.clone(w); h.atoms[c].chi = { nb: h.atoms[c].chi.nb.slice(), tag }; return canon(G.write(h).smiles); });
      push('racemic', rac, 'A racemic pair would come from a flat carbocation (SN1). This reagent works by SN2 from the back side, so only the inverted enantiomer forms.');
    }
    const other = { PBr3: 'SOCl2', SOCl2: 'PBr3', HBr: 'HCl', HCl: 'HBr', HI: 'HBr' }[pred.reagent];
    const q = tryOf(() => fromAlcohol(RX, other));
    push('wrongHalogen', q ? [q.product] : null, `The halogen that replaces the OH is the one in the reagent (${pred.X}), not ${q ? q.X : 'another halogen'}.`);
    const hb = tryOf(() => fromAlcohol(RX, 'HBr'));
    const al = hb ? tryOf(() => predictE2(hb.product, 'KOH')) : null;
    push('elim', al ? [al.major[0]] : null, 'This is an alkene: water was lost (a dehydration). This reagent replaces the OH by a halogen on the same carbon and keeps the carbon skeleton.');
    push('unchanged', [canon(RX)], 'That is the starting alcohol again. The OH is turned into a good leaving group and replaced by a halogen.');
  } else if (pred.mech === 'SN2') {
    const Nu = NUCLEOPHILES[pred.nu];
    const s = halideSites(RX);
    if (pred.inverted) {
      push('retention', [writeCanon(sn2Graph(s, Nu, true)).smiles], `This keeps the configuration (retention). SN2 attacks from the back, opposite the ${pred.X}, so the stereocentre inverts.`);
      const rac = ['@', '@@'].map((tag) => { const g = sn2Graph(s, Nu, true); g.atoms[s.c].chi = { nb: g.atoms[s.c].chi.nb.slice(), tag }; return canon(G.write(g).smiles); });
      push('racemic', rac, 'A racemic mixture would come from a flat carbocation (SN1). SN2 is one concerted step from the back side, so only the inverted enantiomer forms.');
    }
    const e = tryOf(() => predictE2(RX, 'KOH'));
    push('elim', e ? [e.major[0]] : null, Nu.base === 'strong' ? `This is an alkene (E2). ${Nu.short} is also a base, so on a 2° halide it can take a β H, but the question asks for the SN2 product, where ${Nu.short} attacks the carbon.` : 'This is an alkene (elimination). A strong nucleophile that is a weak base substitutes; only a strong base takes a β H.');
    push('unchanged', [canon(RX)], `That is the starting halide again. ${Nu.short} replaces the ${pred.X}, so the product has no ${pred.X}.`);
    for (const x of otherNu(pred.nu)) { const q = tryOf(() => predictSN2(RX, x)); if (q) push('wrongNu', [q.product], `The group that replaces ${pred.X} is the one in the reagent (${Nu.short}), not ${NUCLEOPHILES[x].short}.`); }
  } else if (pred.mech === 'SN1') {
    const Nu = NUCLEOPHILES[pred.nu];
    if (pred.racemic) push('oneEnantiomer', [pred.products[0]], 'Only one enantiomer is drawn. The carbocation is flat, so the nucleophile attacks either face equally and BOTH enantiomers form (a racemic mixture).');
    const e = tryOf(() => predictE1(RX));
    push('elim', e ? [e.major[0]] : null, `This is the alkene (E1). ${Nu.short} is a weak base, so the main path is substitution; the alkene is the by-product that grows with heat.`);
    push('unchanged', [canon(RX)], `That is the starting halide again. The ${pred.X} leaves, so the product has no ${pred.X}.`);
    for (const x of otherNu(pred.nu)) { const q = tryOf(() => predictSN1(RX, x)); if (q) push('wrongNu', q.products, `The group that bonds to the carbocation is the one in the reagent (${Nu.short}), not ${NUCLEOPHILES[x].short}.`); }
  } else if (pred.mech === 'E2' || pred.mech === 'E1') {
    const less = pred.alkenes.filter((a) => !a.major);
    if (less.length) push('hofmann', [less[0].smiles], 'This is the less substituted alkene. Zaitsev: the more substituted C=C is the major product.');
    const nuId = pred.mech === 'E2' ? (BASES[pred.base] ? BASES[pred.base].nuId : pred.base) : 'H2O';
    const Nu = NUCLEOPHILES[nuId];
    push('subst', [plainSub(RX, nuId)], pred.mech === 'E2' ? `This is the substitution product (${Nu.short} replaces the ${pred.X}). A strong base takes a β H instead of attacking the carbon, so the alkene is the product.` : 'This is the substitution (SN1) product, the alcohol. It forms beside the alkene, but this question asks for the elimination product.');
    const nu2 = pred.mech === 'E2' ? (nuId === 'MeO' ? 'EtO' : 'MeO') : 'MeOH';
    push('subst2', [plainSub(RX, nu2)], `This is an ether: ${NUCLEOPHILES[nu2].short} has replaced the ${pred.X}. The question asks for the elimination product, which has a C=C and no new group on the carbon.`);
    push('unchanged', [canon(RX)], 'That is the starting halide again. The C–X bond breaks and a β H is lost, so the product is an alkene.');
    (pred.ringBlocked || []).forEach((b) => push('notAnti', [b.smiles], 'This alkene needs the β H on the carbon that holds the CH₃, but that H is cis to the halogen. E2 needs the H trans (anti) to X, so this alkene cannot form.'));
    if (pred.mech === 'E2') { const x2 = pred.X === 'I' ? 'Br' : 'I'; const q = tryOf(() => predictSN2(RX, x2)); if (q) push('wrongNu', [q.product], `That replaces the ${pred.X} with ${x2}, a halide exchange, not an elimination.`); }
  } else if (pred.mech === 'Grignard') {
    const other = water === 'D2O' ? pred.protonolysis.H2O : pred.protonolysis.D2O;
    push('noD', [other], water === 'D2O' ? 'This has an ordinary H where the D should be. D₂O gives D to the carbon; H₂O would give an H.' : 'This has a D where the H should be. H₂O gives H to the carbon.');
    const s = halideSites(RX, { any: true });
    const h = G.clone(s.g); delete h.atoms[s.c].chi; putGroup(h, s.x, '[OH]');
    push('alcohol', [canon(G.write(h).smiles)], `This is an alcohol. The Grignard reagent is a base and takes the ${water === 'D2O' ? 'D' : 'H'} from the water; the OH of the water does not bond to the carbon.`);
    push('unchanged', [canon(RX)], 'That is the starting halide. The Mg inserts into the C–X bond, then the water replaces the C–Mg bond with C–H (or C–D).');
    push('reagent', [pred.reagent], 'This is the Grignard reagent itself (before the water is added). The water then replaces the C–Mg bond with C–H (or C–D).');
  }
  const right = { smiles: rightList.slice(), correct: true, kind: 'major', why: halideRightWhy(pred) };
  return [right, ...cand.map(({ key, ...rest }) => rest)].slice(0, opts.n || 12);
}
/** One sentence on why the right answer is right. */
export function halideRightWhy(pred) {
  if (pred.mech === 'Grignard') return 'Yes. Mg inserts into the C–X bond; the water (or D₂O) then replaces the C–Mg bond with C–H (or C–D).';
  return `Yes. ${pred.why}`;
}

// ---------------------------------------------------------------- the pools (tests assert every tag with cip.js and a cis / trans read-back, and every name with OPSIN)
// id = the name the course uses; iupac / old = the name in each style when it differs from the id (the chain namer cannot name branched halides, ring halides or alcohols).
const Pool = (id, smiles, extra = {}) => ({ id, smiles, ...extra });
export const LAB_HALIDES = [
  Pool('bromomethane', 'CBr'), Pool('bromoethane', 'CCBr'), Pool('1-bromopropane', 'CCCBr'), Pool('2-bromopropane', 'CC(C)Br'), Pool('1-bromobutane', 'CCCCBr'), Pool('2-bromobutane', 'CCC(C)Br'),
  Pool('(R)-2-bromobutane', 'CC[C@@H](C)Br', { label: 'R' }), Pool('(S)-2-bromobutane', 'CC[C@H](C)Br', { label: 'S' }),
  Pool('1-bromo-2-methylpropane', 'CC(C)CBr'), Pool('2-bromo-2-methylpropane', 'CC(C)(C)Br'), Pool('2-bromo-2-methylbutane', 'CCC(C)(C)Br'), Pool('2-bromo-2-methylpentane', 'CCCC(C)(C)Br'), Pool('2-chloro-2-methylpropane', 'CC(C)(C)Cl'),
  Pool('1-chlorobutane', 'CCCCCl'), Pool('1-iodopropane', 'CCCI'), Pool('3-bromopentane', 'CCC(Br)CC'), Pool('2-bromopentane', 'CCCC(C)Br'),
  Pool('(R)-2-bromohexane', 'CCCC[C@@H](C)Br', { label: 'R' }), Pool('(S)-2-bromohexane', 'CCCC[C@H](C)Br', { label: 'S' }),
  Pool('(R)-3-bromo-3-methylhexane', 'CCC[C@](C)(Br)CC', { label: 'R' }),
  Pool('bromocyclohexane', 'BrC1CCCCC1'), Pool('bromocyclopentane', 'BrC1CCCC1'), Pool('1-bromo-1-methylcyclohexane', 'CC1(Br)CCCCC1'),
  Pool('cis-1-bromo-2-methylcyclohexane', 'C[C@H]1CCCC[C@H]1Br', { ring: 'cis', iupac: '(1R,2S)-1-bromo-2-methylcyclohexane' }),
  Pool('trans-1-bromo-2-methylcyclohexane', 'C[C@H]1CCCC[C@@H]1Br', { ring: 'trans', iupac: '(1S,2S)-1-bromo-2-methylcyclohexane' }),
  Pool('benzyl bromide', 'BrCc1ccccc1', { iupac: '(bromomethyl)benzene' }), Pool('allyl bromide', 'C=CCBr', { iupac: '3-bromoprop-1-ene', old: '3-bromo-1-propene' }),
  Pool('1-bromo-1-phenylethane', 'CC(Br)c1ccccc1', { iupac: '(1-bromoethyl)benzene' }),
  Pool('bromobenzene', 'Brc1ccccc1', { refuses: 'aryl' }), Pool('1-bromopropene', 'CC=CBr', { refuses: 'vinylic', iupac: '1-bromoprop-1-ene', old: '1-bromo-1-propene' })
];
/** The four stereoisomers of 1-bromo-2-methylcyclohexane and of 1-bromo-1,2-dimethylcyclohexane, written with their CIP letters: the chair-rule drill (E2 on a ring). */
export const E2_RING_POOL = [
  Pool('(1R,2S)-1-bromo-2-methylcyclohexane', 'C[C@H]1CCCC[C@H]1Br', { ring: 'cis' }), Pool('(1S,2R)-1-bromo-2-methylcyclohexane', 'C[C@@H]1CCCC[C@@H]1Br', { ring: 'cis' }),
  Pool('(1S,2S)-1-bromo-2-methylcyclohexane', 'C[C@H]1CCCC[C@@H]1Br', { ring: 'trans' }), Pool('(1R,2R)-1-bromo-2-methylcyclohexane', 'C[C@@H]1CCCC[C@H]1Br', { ring: 'trans' }),
  Pool('(1S,2S)-1-bromo-1,2-dimethylcyclohexane', 'C[C@H]1CCCC[C@]1(C)Br'), Pool('(1R,2S)-1-bromo-1,2-dimethylcyclohexane', 'C[C@H]1CCCC[C@@]1(C)Br'),
  Pool('(1S,2R)-1-bromo-1,2-dimethylcyclohexane', 'C[C@@H]1CCCC[C@]1(C)Br'), Pool('(1R,2R)-1-bromo-1,2-dimethylcyclohexane', 'C[C@@H]1CCCC[C@@]1(C)Br')
];
export const ALCOHOLS = [
  Pool('butan-1-ol', 'CCCCO'), Pool('butan-2-ol', 'CCC(C)O'), Pool('(S)-pentan-2-ol', 'CCC[C@H](C)O', { label: 'S' }), Pool('(R)-pentan-2-ol', 'CCC[C@@H](C)O', { label: 'R' }),
  Pool('2-methylpropan-2-ol', 'CC(C)(C)O'), Pool('cyclohexanol', 'OC1CCCCC1'), Pool('1-methylcyclohexan-1-ol', 'CC1(O)CCCCC1'), Pool('2-methylbutan-2-ol', 'CCC(C)(C)O')
];
export const ALKANES = [
  Pool('propane', 'CCC'), Pool('butane', 'CCCC'), Pool('2-methylpropane', 'CC(C)C'), Pool('2-methylpentane', 'CCCC(C)C'), Pool('pentane', 'CCCCC'), Pool('cyclohexane', 'C1CCCCC1'), Pool('methylcyclohexane', 'CC1CCCCC1')
];
export const HALIDE_BY_ID = Object.fromEntries([...LAB_HALIDES, ...E2_RING_POOL].map((h) => [h.id, h]));
let NAME_BY_SMILES = null;
/** {new, old} name of a pool molecule (a halide, a ring stereoisomer or an alcohol), or null. Both styles are verified with OPSIN in tests/halides.mjs. */
export function halideName(smiles) {
  if (!NAME_BY_SMILES) {
    NAME_BY_SMILES = new Map();
    [...LAB_HALIDES, ...E2_RING_POOL, ...ALCOHOLS, ...ALKANES].forEach((e) => { const k = canon(e.smiles); if (!NAME_BY_SMILES.has(k)) NAME_BY_SMILES.set(k, { new: e.iupac || e.id, old: e.old || e.iupac || e.id }); });
  }
  return NAME_BY_SMILES.get(canon(smiles)) || null;
}
