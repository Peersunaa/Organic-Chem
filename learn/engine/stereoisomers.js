// Lesson 16: molecules with two chirality centres. Pool, enumeration of ALL stereoisomers (with the meso collapse), names with (2R,3S)-style prefixes,
// and the centre-by-centre comparison that explains a relationship. Pure logic (no DOM). Python RDKit repeats the enumeration independently in
// tools/check_relationships.py (EnumerateStereoisomers); every name is round-tripped through OPSIN in tests/lesson16.mjs.
//
// A pool entry is written FLAT (no stereo) with a plain `C` at each chirality centre; a stereoisomer is made by putting @ or @@ on those carbons.
// Every stereoisomer of an entry therefore has the SAME atom order, so two of them draw with the same skeleton and differ only in their wedges.
import { analyze } from './chem.js';
import { tetraInfo, chiralCenters } from './cip.js';
import { atomSpans, relationship, isoCanon, mirrorSmiles, isMeso, isChiral } from './chirality.js';

const sub = (n) => '₀₁₂₃₄₅₆₇₈₉'[n];
// loc: the possible numberings of the centres (parallel to the centre atoms in atom order); a symmetric constitution has two.
// cisBits: for rings, the tag combination that is cis (both tags '@'); tools/check_relationships.py proves it in 3D (side of the ring plane each group is on).
export const STEREO_POOL = [
  { id: 'dibromobutane', flat: 'CC(Br)C(Br)C', new: '2,3-dibromobutane', old: '2,3-dibromobutane', loc: [[2, 3], [3, 2]] },
  { id: 'butanediol', flat: 'CC(O)C(O)C', new: 'butane-2,3-diol', old: '2,3-butanediol', loc: [[2, 3], [3, 2]] },
  { id: 'dichlorobutane', flat: 'CC(Cl)C(Cl)C', new: '2,3-dichlorobutane', old: '2,3-dichlorobutane', loc: [[2, 3], [3, 2]] },
  { id: 'tartaric', flat: 'O=C(O)C(O)C(O)C(=O)O', new: '2,3-dihydroxybutanedioic acid', old: '2,3-dihydroxybutanedioic acid', common: 'tartaric acid', loc: [[2, 3], [3, 2]] },
  { id: 'dibromosuccinic', flat: 'O=C(O)C(Br)C(Br)C(=O)O', new: '2,3-dibromobutanedioic acid', old: '2,3-dibromobutanedioic acid', loc: [[2, 3], [3, 2]] },
  { id: 'dibromopentane24', flat: 'CC(Br)CC(Br)C', new: '2,4-dibromopentane', old: '2,4-dibromopentane', loc: [[2, 4], [4, 2]] },
  { id: 'pentanediol24', flat: 'CC(O)CC(O)C', new: 'pentane-2,4-diol', old: '2,4-pentanediol', loc: [[2, 4], [4, 2]] },
  { id: 'bromochlorobutane', flat: 'CC(Br)C(Cl)C', new: '2-bromo-3-chlorobutane', old: '2-bromo-3-chlorobutane', loc: [[2, 3]] },
  { id: 'bromobutanol', flat: 'CC(O)C(Br)C', new: '3-bromobutan-2-ol', old: '3-bromo-2-butanol', loc: [[2, 3]] },
  { id: 'dibromopentane23', flat: 'CCC(Br)C(Br)C', new: '2,3-dibromopentane', old: '2,3-dibromopentane', loc: [[3, 2]] },
  { id: 'methylpentanol', flat: 'CC(O)C(C)CC', new: '3-methylpentan-2-ol', old: '3-methyl-2-pentanol', loc: [[2, 3]] },
  { id: 'threonine', flat: 'CC(O)C(N)C(=O)O', new: '2-amino-3-hydroxybutanoic acid', old: '2-amino-3-hydroxybutanoic acid', common: 'threonine', loc: [[3, 2]] },
  { id: 'isoleucine', flat: 'CCC(C)C(N)C(=O)O', new: '2-amino-3-methylpentanoic acid', old: '2-amino-3-methylpentanoic acid', common: 'isoleucine', loc: [[3, 2]] },
  // rings: cis/trans
  { id: 'dimethylcyclohexane12', flat: 'CC1CCCCC1C', new: '1,2-dimethylcyclohexane', old: '1,2-dimethylcyclohexane', ring: true, cisBits: [0, 0], loc: [[1, 2], [2, 1]] },
  { id: 'dibromocyclopentane12', flat: 'BrC1CCCC1Br', new: '1,2-dibromocyclopentane', old: '1,2-dibromocyclopentane', ring: true, cisBits: [0, 0], loc: [[1, 2], [2, 1]] },
  { id: 'dimethylcyclopentane12', flat: 'CC1CCCC1C', new: '1,2-dimethylcyclopentane', old: '1,2-dimethylcyclopentane', ring: true, cisBits: [0, 0], loc: [[1, 2], [2, 1]] },
  { id: 'dichlorocyclohexane12', flat: 'ClC1CCCCC1Cl', new: '1,2-dichlorocyclohexane', old: '1,2-dichlorocyclohexane', ring: true, cisBits: [0, 0], loc: [[1, 2], [2, 1]] },
  { id: 'dibromocyclohexane12', flat: 'BrC1CCCCC1Br', new: '1,2-dibromocyclohexane', old: '1,2-dibromocyclohexane', ring: true, cisBits: [0, 0], loc: [[1, 2], [2, 1]] },
  { id: 'dimethylcyclohexane13', flat: 'CC1CCCC(C)C1', new: '1,3-dimethylcyclohexane', old: '1,3-dimethylcyclohexane', ring: true, cisBits: [0, 1], loc: [[1, 3], [3, 1]] },
  { id: 'methylcyclohexanol', flat: 'CC1CCCCC1O', new: '2-methylcyclohexan-1-ol', old: '2-methylcyclohexanol', ring: true, cisBits: [0, 0], loc: [[2, 1]] },
  { id: 'bromochlorocyclohexane', flat: 'BrC1CCCCC1Cl', new: '1-bromo-2-chlorocyclohexane', old: '1-bromo-2-chlorocyclohexane', ring: true, cisBits: [0, 0], loc: [[1, 2]] }
];
export const POOL_BY_ID = Object.fromEntries(STEREO_POOL.map((e) => [e.id, e]));

// Constitutional isomers of the pool molecules (same molecular formula, different connectivity), for the "constitutional" pairs.
// kind: skeletal (different carbon skeleton), positional (same skeleton, groups in different places), functional (different functional group).
export const PARTNERS = {
  dibromobutane: [{ smiles: 'BrC[C@H](Br)CC', kind: 'positional' }, { smiles: 'CC(C)(Br)CBr', kind: 'skeletal' }],
  butanediol: [{ smiles: 'OC[C@H](O)CC', kind: 'positional' }, { smiles: 'CC(C)(O)CO', kind: 'skeletal' }],
  dichlorobutane: [{ smiles: 'ClC[C@H](Cl)CC', kind: 'positional' }],
  bromochlorobutane: [{ smiles: 'BrC[C@H](Cl)CC', kind: 'positional' }, { smiles: 'CC(C)(Br)CCl', kind: 'skeletal' }],
  bromobutanol: [{ smiles: 'OC[C@H](Br)CC', kind: 'positional' }],
  dibromopentane24: [{ smiles: 'BrCC(C)CCBr', kind: 'skeletal' }],
  threonine: [{ smiles: 'OCC[C@H](N)C(=O)O', kind: 'positional' }],
  dimethylcyclohexane12: [{ smiles: 'CCC1CCCCC1', kind: 'skeletal' }, { smiles: 'C[C@H]1CCC[C@@H](C)C1', kind: 'positional' }],
  dibromocyclopentane12: [{ smiles: 'Br[C@H]1CC[C@@H](Br)C1', kind: 'positional' }],
  dichlorocyclohexane12: [{ smiles: 'Cl[C@H]1CCC[C@@H](Cl)C1', kind: 'positional' }],
  methylcyclohexanol: [{ smiles: 'CC1CCC(O)CC1', kind: 'positional' }]
};

/** The chirality-centre atoms of an entry (book definition, in atom order). */
export function centersOfEntry(e) {
  if (!e._centers) e._centers = chiralCenters(e.flat);
  return e._centers;
}
/** SMILES of the entry with a tag on each centre. bits[k] = 0 -> '@', 1 -> '@@'. */
export function tagged(e, bits) {
  const centers = centersOfEntry(e);
  const info = analyze(e.flat);
  const spans = atomSpans(e.flat);
  let out = '', last = 0;
  centers.forEach((c, k) => {
    const sp = spans[c];
    if (e.flat.slice(sp.s, sp.e) !== 'C') throw new Error(`centre ${c} of ${e.flat} must be a plain C`);
    const h = info.atoms[c].impH;
    const tag = bits[k] ? '@@' : '@';
    out += e.flat.slice(last, sp.s) + `[C${tag}${h === 1 ? 'H' : ''}]`;
    last = sp.e;
  });
  return out + e.flat.slice(last);
}
/** R/S of each centre of a stereo SMILES, in atom order: ['R','S',...] (null when open). */
export function labelsOf(smiles) {
  const T = tetraInfo(smiles);
  return T.filter((t) => t.center).map((t) => t.label);
}
const norm = (xs) => xs.slice().sort((a, b) => a - b);

/**
 * Every combination of centre configurations (2^n), grouped into distinct compounds.
 * Returns { n, combos:[{bits, smiles, iso, labels}], distinct:[{iso, smiles, labels, meso, chiral, members:[combo indexes]}], total, meso, pairs, enantiomerOf }
 * total = distinct stereoisomers; pairs = number of enantiomer pairs; meso = number of meso compounds.
 */
export function enumerate(e) {
  const n = centersOfEntry(e).length;
  const combos = [];
  for (let m = 0; m < 1 << n; m++) {
    const bits = Array.from({ length: n }, (_, k) => (m >> (n - 1 - k)) & 1);
    const smiles = tagged(e, bits);
    combos.push({ bits, smiles, iso: isoCanon(smiles), labels: labelsOf(smiles) });
  }
  const byIso = new Map();
  combos.forEach((c, i) => { if (!byIso.has(c.iso)) byIso.set(c.iso, { iso: c.iso, smiles: c.smiles, labels: c.labels, members: [] }); byIso.get(c.iso).members.push(i); });
  const distinct = [...byIso.values()];
  distinct.forEach((d) => { d.meso = isMeso(d.smiles); d.chiral = isChiral(d.smiles); d.mirrorIso = isoCanon(mirrorSmiles(d.smiles)); });
  const meso = distinct.filter((d) => d.meso).length, chiral = distinct.filter((d) => d.chiral).length;
  return { n, combos, distinct, total: distinct.length, meso, pairs: chiral / 2, achiralNoMeso: distinct.length - meso - chiral };
}
const enumCache = new Map();
export function enumerateCached(e) { if (!enumCache.has(e.id)) enumCache.set(e.id, enumerate(e)); return enumCache.get(e.id); }

// ------------------------------------------------------------------------------------------------ names
/** The prefix of a stereo name, e.g. "2R,3S" (numbering chosen so R gets the first point of difference when the constitution is symmetric). */
export function stereoPrefix(e, smiles) {
  const labels = labelsOf(smiles);
  let best = null;
  for (const num of e.loc) {
    const items = num.map((loc, k) => ({ loc, l: labels[k] })).sort((a, b) => a.loc - b.loc);
    const str = items.map((x) => `${x.loc}${x.l}`).join(',');
    const key = items.map((x) => x.l).join('');
    if (best === null || key < best.key) best = { str, key };
  }
  return best.str;
}
export const stereoName = (e, smiles) => ({ new: `(${stereoPrefix(e, smiles)})-${e.new}`, old: `(${stereoPrefix(e, smiles)})-${e.old}` });
/** "cis"/"trans" for a ring entry's stereoisomer, from the entry's cis reference. null for acyclic entries. */
export function cisTrans(e, smiles) {
  if (!e.ring) return null;
  const cis = tagged(e, e.cisBits), iso = isoCanon(smiles);
  return iso === isoCanon(cis) || iso === isoCanon(mirrorSmiles(cis)) ? 'cis' : 'trans';
}

// ------------------------------------------------------------------------------------------------ explaining a pair, centre by centre
/** Centre labels of two stereoisomers of the same flat molecule: { atoms, a:[..], b:[..], same:[atoms], opp:[atoms] } or null when the atom orders differ. */
export function centerDiff(a, b) {
  const Ta = tetraInfo(a).filter((t) => t.center), Tb = tetraInfo(b).filter((t) => t.center);
  if (Ta.length !== Tb.length || Ta.some((t, i) => t.atom !== Tb[i].atom)) return null;
  const same = [], opp = [];
  Ta.forEach((t, i) => (t.label === Tb[i].label ? same : opp).push(t.atom));
  return { atoms: Ta.map((t) => t.atom), a: Ta.map((t) => t.label), b: Tb.map((t) => t.label), same, opp };
}
/** "2R,3S"-style text for the labels of `smiles` using the first numbering of the entry (used to talk about two molecules in one voice). */
export function labelText(e, labels) { return e.loc[0].map((loc, k) => ({ loc, l: labels[k] })).sort((x, y) => x.loc - y.loc).map((x) => `${x.loc}${x.l}`).join(',') || labels.join(','); }
const ordinalCenters = (e, atoms) => atoms.map((a) => e.loc[0][centersOfEntry(e).indexOf(a)]).sort((x, y) => x - y);
const listC = (xs) => (xs.length === 1 ? `C${xs[0]}` : 'C' + xs.slice(0, -1).join(', C') + ` and C${xs[xs.length - 1]}`);

/** The wedge-drawing facts of a pair, in words (used in per-option diagnoses). */
export function describePair(e, a, b) {
  const d = centerDiff(a, b);
  if (!d) return null;
  const ta = `(${labelText(e, d.a)})`, tb = `(${labelText(e, d.b)})`;
  return { d, ta, tb, same: ordinalCenters(e, d.same), opp: ordinalCenters(e, d.opp), n: d.atoms.length };
}

/**
 * The reason the answer `chosen` is wrong for a pair whose true relationship is `truth` (kinds as in relationship()). `info` = relationship(a,b), `desc` = describePair(...)
 * or null. Returns a sentence that names what the learner can SEE or compute, never just "wrong".
 */
export function whyNot(chosen, truth, info, desc, extra = {}) {
  const t = truth;
  const pair = desc ? `${desc.ta} and ${desc.tb}` : null;
  if (t === 'identical') {
    if (chosen === 'enantiomers') return info.mesoA ? 'They look like mirror images, but this compound is meso: it has a plane of symmetry inside it, so it is its own mirror image. These are the same compound drawn two ways.' : 'Enantiomers are opposite at EVERY center. Here no center differs, so one drawing is just the other turned round: the same compound.';
    if (chosen === 'diastereomers') return info.mesoA ? 'Diastereomers are different compounds. This is a meso compound: reflecting it gives itself, so the second drawing is the same compound written the other way round.' : 'Diastereomers differ at some center. Here every center has the same configuration in both drawings, so they are the same compound drawn differently.';
    if (chosen === 'constitutional') return 'Constitutional isomers have their atoms connected in a different order. Here every atom is bonded to the same neighbours in both drawings, so the connectivity is identical.';
  }
  if (t === 'enantiomers') {
    if (chosen === 'identical') return `They are not the same compound: they have the opposite configuration at every center${pair ? ` (${pair})` : ''}, and no turning of the molecule can change that. They are mirror images.`;
    if (chosen === 'diastereomers') return `Diastereomers are opposite at only SOME centers. These two are opposite at EVERY center${pair ? ` (${pair})` : ''}, so each is the mirror image of the other: enantiomers.`;
    if (chosen === 'constitutional') return 'Both drawings have the same connectivity, so they are not constitutional isomers. The only difference is how the groups point in space, and here it is at every center: mirror images.';
  }
  if (t === 'diastereomers') {
    const cis = extra.cistrans ? ` Cis/trans isomers are diastereomers: same connectivity, not mirror images.` : '';
    if (chosen === 'identical') return desc ? `They differ at ${desc.opp.length === 1 ? 'one center' : 'some centers'} (${listC(desc.opp)}: ${pair}), so they are different compounds.${cis}` : `They are different compounds: one is not the other turned round.${cis}`;
    if (chosen === 'enantiomers') {
      if (info.mesoA || info.mesoB) return `A meso compound is its own mirror image, so nothing else can be its mirror image. These are different stereoisomers that are not mirror images: diastereomers.${cis}`;
      if (desc && desc.same.length && desc.opp.length) return `Enantiomers are opposite at EVERY center. These are opposite at only ${desc.opp.length === 1 ? 'one center' : `${desc.opp.length} of their ${desc.n} centers`}, ${listC(desc.opp)} (${pair}); ${listC(desc.same)} ${desc.same.length === 1 ? 'is' : 'are'} the same. So they are not mirror images: that is a diastereomer.`;
      return `Their mirror images would have to be opposite at every center. These two are not, so they are diastereomers.${cis}`;
    }
    if (chosen === 'constitutional') return `The atoms are bonded the same way in both, so they are not constitutional isomers; they differ only in 3D arrangement, but not as mirror images: diastereomers.${cis}`;
  }
  if (t === 'constitutional') {
    const f = extra.formula ? ` (both ${extra.formula})` : '';
    if (chosen === 'identical') return `They are different compounds: the atoms are bonded in a different order${f}.`;
    return `Stereoisomers (enantiomers and diastereomers) have the same connectivity and differ only in 3D arrangement. Here the atoms are connected differently${f}, so these are constitutional isomers.`;
  }
  return 'Compare the connectivity first, then each chirality center.';
}

export const KIND_LABEL = { identical: 'The same compound', enantiomers: 'Enantiomers', diastereomers: 'Diastereomers', constitutional: 'Constitutional isomers' };
export const KIND_ORDER = ['identical', 'enantiomers', 'diastereomers', 'constitutional'];

/** Is relationship() consistent with two SMILES written for entry e (a convenience for the lesson and tests). */
export function relOf(a, b) { return relationship(a, b); }
