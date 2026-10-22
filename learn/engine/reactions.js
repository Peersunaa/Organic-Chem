// Data-driven alkene additions for Lesson 09 (McMurry 4.1 to 4.3): HX addition (Markovnikov) and acid-catalysed hydration.
//
// For a simple alkene (hydrocarbon, ONE C=C, acyclic or a ring, no aromatic ring) the engine computes, from the structure alone:
//   * both possible carbocations (H adds to one C=C carbon, the + lands on the other) and their class (1°, 2°, 3°),
//   * the major product(s): the more stable cation; both products when the two cations are equally stable (a mixture),
//   * the full mechanism in mechanism-player format (before / arrows / after). Every step is built by APPLYING its arrows to the scene of
//     the previous structures, so the arrows, the structures and the atom/charge balance always agree (checkMechanism proves it).
// Not taught here, so not modelled: rearrangements, peroxide (anti-Markovnikov) additions, aromatic rings (styrene is refused: Ch 5).
import { canon, analyze } from './chem.js';
import { buildScene, stepResult, WHY } from './widgets/mechanism-core.js';
import { buildMolblock } from './widgets/lewis-core.js';
import { nameAlkeneBoth } from './naming.js';

const MINUS = '−';
const SUBD = '₀₁₂₃₄₅₆₇₈₉';

// ---------------------------------------------------------------- reagents
/** donor = the species that gives H⁺ in step 1 (HX itself, or H₃O⁺ from the acid catalyst). */
export const REAGENTS = {
  HCl: { id: 'HCl', kind: 'HX', X: 'Cl', donor: 'Cl', label: 'HCl', cond: 'ether', reactant: 'Cl' },
  HBr: { id: 'HBr', kind: 'HX', X: 'Br', donor: 'Br', label: 'HBr', cond: 'ether', reactant: 'Br' },
  HI: { id: 'HI', kind: 'HX', X: 'I', donor: 'I', label: 'HI', cond: 'ether', reactant: 'I' },
  H2O: { id: 'H2O', kind: 'hydration', X: 'OH', donor: '[OH3+]', label: 'H₂O, H₂SO₄ (cat.)', cond: 'H₂SO₄ (cat.)', reactant: 'O' }
};
export const REAGENT_IDS = ['HCl', 'HBr', 'HI', 'H2O'];
export const HX_IDS = ['HCl', 'HBr', 'HI'];

export const CLASS_NAME = { 0: 'methyl', 1: 'primary (1°)', 2: 'secondary (2°)', 3: 'tertiary (3°)' };
export const CLASS_SHORT = { 0: 'methyl', 1: '1°', 2: '2°', 3: '3°' };

// ---------------------------------------------------------------- the alkene pool
/** The ten alkenes of the reaction lab (also used by the mastery generator). */
export const LAB_ALKENES = [
  { id: 'ethylene', smiles: 'C=C' },
  { id: 'propene', smiles: 'CC=C' },
  { id: '2-methylpropene', smiles: 'CC(C)=C' },
  { id: 'but-2-ene', smiles: 'CC=CC' },
  { id: 'pent-1-ene', smiles: 'CCCC=C' },
  { id: 'pent-2-ene', smiles: 'CCC=CC' },
  { id: '2-methylbut-2-ene', smiles: 'CC=C(C)C' },
  { id: '2-methylbut-1-ene', smiles: 'CCC(C)=C' },
  { id: 'cyclohexene', smiles: 'C1=CCCCC1' },
  { id: '1-methylcyclohexene', smiles: 'CC1=CCCCC1' }
];
export const ALKENE_BY_ID = Object.fromEntries(LAB_ALKENES.map((a) => [a.id, a]));
/** Names in both IUPAC styles, computed by the naming engine (Lesson 07) from the structure. */
export const alkeneName = (smiles) => nameAlkeneBoth(smiles);

// ---------------------------------------------------------------- reading an alkene
/**
 * Facts about a simple alkene, from its structure: {ok:true, smiles, carbons:[a,b], nH:{a,b}, cls:{a,b}} where cls[c] = the class of the
 * carbocation that has its + charge on carbon c: the number of carbon neighbours of c (the other C=C carbon counts: it is an alkyl group
 * once the π bond is used). {ok:false, reason} for anything outside the lesson (aromatic rings, several C=C, other elements ...).
 */
export function alkeneSites(smiles) {
  if (typeof smiles !== 'string' || !smiles) return { ok: false, reason: 'no structure' };
  if (/[a-z]/.test(smiles.replace(/Cl|Br/g, ''))) return { ok: false, reason: 'it has an aromatic ring (benzylic cations are treated in Chapter 5, not here)' };
  let info = null;
  try { info = analyze(smiles); } catch (e) { info = null; }
  if (!info) return { ok: false, reason: 'not a valid structure' };
  if (info.atoms.some((a) => a.sym !== 'C' || a.fc !== 0)) return { ok: false, reason: 'only hydrocarbons without charges are covered' };
  const dbl = info.bonds.filter((b) => (b.bo ?? 1) === 2);
  if (info.bonds.some((b) => (b.bo ?? 1) > 2 || ((b.bo ?? 1) !== 1 && (b.bo ?? 1) !== 2))) return { ok: false, reason: 'no triple or aromatic bonds' };
  if (dbl.length !== 1) return { ok: false, reason: dbl.length ? 'only one C=C is covered here' : 'there is no C=C' };
  const [a, b] = dbl[0].atoms;
  const nH = {}, cls = {};
  for (const c of [a, b]) { nH[c] = info.atoms[c].impH; cls[c] = info.atoms[c].nbrs.length; }
  return { ok: true, smiles, carbons: [a, b], nH, cls };
}

/**
 * Could the carbocation with its + on carbon pC of this alkene rearrange to a MORE stable cation by a 1,2-hydride or 1,2-methyl shift?
 * Rearrangements are not taught here, so the engine refuses those alkenes rather than predict an incomplete answer (e.g. 3-methylbut-1-ene).
 */
export function rearrangementRisk(alkene, pC, hC) {
  const info = analyze(alkene);
  const cC = (i) => info.atoms[i].nbrs.filter((j) => info.atoms[j].sym === 'C').length;
  const k = cC(pC);
  return info.atoms[pC].nbrs.some((n) => {
    const d = cC(n);                       // carbon groups on the neighbour, counting pC
    const hasH = info.atoms[n].impH > 0 || n === hC;      // the other C=C carbon has just received an H
    // the neighbour after losing H (hydride shift) is a cation with d carbon groups; a quaternary neighbour (no H) can shift a CH3: it becomes a cation with d-1
    return hasH ? d > k : d - 1 > k;
  });
}

/** Class of a carbocation SMILES, read from its structure: the number of carbon neighbours of the positively charged carbon. */
export function cationClass(cation) {
  const info = analyze(cation);
  const pos = info.atoms.filter((x) => x.sym === 'C' && x.fc === 1);
  if (pos.length !== 1) return null;
  return pos[0].nbrs.filter((j) => info.atoms[j].sym === 'C').length;
}

export const stabilityFraction = (cls) => cls / 3; // for the stability bar (methyl 0 ... tertiary 1)

const formulaOf = (nH) => (nH === 0 ? 'C' : 'CH' + (nH > 1 ? SUBD[nH] : ''));
const hText = (n) => (n === 0 ? 'no H' : n === 1 ? '1 H' : n + ' H');

// ---------------------------------------------------------------- mechanisms (mechanism-player format)
const cationFirst = (parts) => parts.slice().sort((p, q) => (q.includes('+') ? 1 : 0) - (p.includes('+') ? 1 : 0));

/** Step 1: the π bond (hC=pC) attacks the H of the donor; the H–X (or H–O) pair leaves. H ends on hC, the + charge on pC. */
function stepProtonate(alkene, reagent, hC, pC, sites) {
  const R = REAGENTS[reagent];
  const st = { before: [alkene, R.donor], layout: [{}, { hAngles: { 0: 180 } }], arrows: [], after: [], label: '' };
  const sc = buildScene(st);
  const H = sc.maps[1].h[0][0], Xi = sc.maps[1].heavy[0];
  const donorText = R.kind === 'HX' ? 'H–' + R.X : 'H₃O⁺';
  st.arrows = [
    { from: { bond: [hC, pC] }, to: { bond: [hC, H] }, why: WHY.piToH(donorText, sites.cls[hC] === sites.cls[pC] ? '' : sites.nH[hC] > sites.nH[pC] ? WHY.MORE_H : WHY.FEWER_H) },
    { from: { bond: [H, Xi] }, to: { atom: Xi }, why: R.kind === 'HX' ? WHY.XLeaves(R.X) : 'The O–H bond pair stays on oxygen, so H₃O⁺ gives up its H and leaves as neutral water (H₂O).' }
  ];
  st.after = cationFirst(canon(buildMolblock(stepResult(st))).split('.'));
  const cls = sites.cls[pC];
  const lost = R.kind === 'HX' ? `${R.X}⁻` : 'water';
  st.label = `The π bond attacks the H of ${R.kind === 'HX' ? R.label : 'H₃O⁺'}; the ${R.kind === 'HX' ? 'H–' + R.X + ' pair leaves with ' + R.X : 'O–H pair stays on oxygen and leaves as H₂O'}. H bonds to the carbon that had ${hText(sites.nH[hC])}, so the + charge sits on the carbon with ${hText(sites.nH[pC])}: a ${CLASS_NAME[cls]} carbocation, and ${lost}.`;
  // regiochemistry data for the arrow grader (only when the two ends differ, i.e. when the learner's choice of end matters)
  if (sites.cls[hC] !== sites.cls[pC]) {
    const wrongCls = sites.cls[hC];
    st.regio = {
      pi: [hC, pC], H,
      ends: [hC, pC].map((c) => ({ idx: c, text: `the carbon with ${hText(sites.nH[c])}` })),
      wrongWhy: `H went to the wrong carbon: that gives the less stable carbocation. H on the carbon with ${hText(sites.nH[pC])} would leave the + charge on the carbon with ${hText(sites.nH[hC])}, a ${CLASS_NAME[wrongCls]} cation. H goes to the carbon that already has more H, so the + charge ends up on the more substituted carbon (a ${CLASS_NAME[cls]} cation).`
    };
  }
  return st;
}

/** HX step 2: X⁻ gives a lone pair to the carbocation. */
function stepHalide(prev, X, cls) {
  const st = { before: prev.after, arrows: [], after: [], label: `A lone pair on ${X}⁻ attacks the ${CLASS_NAME[cls]} carbocation and becomes the new C–${X} bond.` };
  const sc = buildScene(st);
  const Ci = sc.atoms.findIndex((a) => a.el === 'C' && a.charge === 1);
  const Xi = sc.atoms.findIndex((a) => a.el === X);
  st.arrows = [{ from: { lp: Xi }, to: { atom: Ci }, why: WHY.halideAttacks(X) }];
  st.after = [canon(buildMolblock(stepResult(st)))];
  return st;
}

/** Hydration step 2: a water molecule attacks the carbocation (an oxonium ion forms). */
function stepWater(prev, cls) {
  const st = { before: prev.after, arrows: [], after: [], label: `A lone pair on the oxygen of a water molecule attacks the ${CLASS_NAME[cls]} carbocation. The new C–O bond makes an oxonium ion: O has three bonds and a + charge.` };
  const sc = buildScene(st);
  const Ci = sc.atoms.findIndex((a) => a.el === 'C' && a.charge === 1);
  const Oi = sc.atoms.findIndex((a) => a.el === 'O');
  st.arrows = [{ from: { lp: Oi }, to: { atom: Ci }, why: 'A lone pair on a water oxygen attacks the positive carbon (it is short of electrons) and forms a new C–O bond; that oxygen now carries the +.' }];
  st.after = [canon(buildMolblock(stepResult(st)))];
  return st;
}

/** Hydration step 3: another water removes H⁺ from the oxonium ion; the alcohol forms and H₃O⁺ is regenerated. */
function stepDeprotonate(prev) {
  const st = { before: [prev.after[0], 'O'], added: ['O'], arrows: [], after: [], label: 'A water molecule (the solvent) uses a lone pair to take an H⁺ from the oxonium ion. The O–H pair stays on oxygen. The product is the alcohol, and H₃O⁺ is regenerated: the acid is a catalyst.' };
  const sc = buildScene(st);
  const Oox = sc.maps[0].heavy.find((i) => sc.atoms[i].el === 'O' && sc.atoms[i].charge === 1);
  const Ow = sc.maps[1].heavy[0];
  const H = sc.maps[0].h[Oox][0];
  st.arrows = [
    { from: { lp: Ow }, to: { atom: H }, why: "The oxonium O is positive and holds its H loosely, so a lone pair on a solvent water takes that H and forms a new O–H bond." },
    { from: { bond: [Oox, H] }, to: { atom: Oox }, why: 'The O–H bond pair stays on oxygen, so the oxonium O is neutral again and the alcohol is formed.' }
  ];
  st.after = canon(buildMolblock(stepResult(st))).split('.').sort((p, q) => (p.includes('+') ? 1 : 0) - (q.includes('+') ? 1 : 0));
  return st;
}

/** The mechanism for one orientation: H goes to carbon hC, the + charge is on pC. Throws for an alkene outside the lesson. */
export function buildMechanism(alkene, reagent, hC, pC) {
  const sites = alkeneSites(alkene);
  if (!sites.ok) throw new Error(`excluded: ${sites.reason}`);
  const R = REAGENTS[reagent];
  if (!R) throw new Error('unknown reagent ' + reagent);
  const cls = sites.cls[pC];
  const s1 = stepProtonate(alkene, reagent, hC, pC, sites);
  if (R.kind === 'HX') {
    const s2 = stepHalide(s1, R.X, cls);
    return { reactants: [alkene, R.donor], products: s2.after, steps: [s1, s2] };
  }
  const s2 = stepWater(s1, cls);
  const s3 = stepDeprotonate(s2);
  return { reactants: [alkene, R.donor], products: s3.after, steps: [s1, s2, s3] };
}

// ---------------------------------------------------------------- the prediction
/**
 * predict(alkene, reagent) -> {
 *   alkene, reagent, sites, options:[{hC, pC, cation, cls, product, mech}] (both orientations; one entry if they are identical),
 *   outcome: 'single' (both ends alike: one cation, one product) | 'markovnikov' (the cations differ in class) | 'mixture' (same class, different products),
 *   major: [option], products: [canonical SMILES of the organic product(s), sorted], minor: option|null }
 */
export function predict(alkene, reagent) {
  const sites = alkeneSites(alkene);
  if (!sites.ok) throw new Error(`excluded: ${sites.reason}`);
  const [a, b] = sites.carbons;
  const all = [[a, b], [b, a]].map(([hC, pC]) => {
    const mech = buildMechanism(alkene, reagent, hC, pC);
    return { hC, pC, cation: mech.steps[0].after[0], cls: sites.cls[pC], product: mech.products.find((p) => !p.includes('+')) , mech };
  });
  const same = all[0].product === all[1].product && all[0].cation === all[1].cation;
  const options = same ? [all[0]] : all;
  let outcome, major;
  if (same) { outcome = 'single'; major = [options[0]]; }
  else if (options[0].cls !== options[1].cls) {
    outcome = 'markovnikov';
    major = [options[0].cls > options[1].cls ? options[0] : options[1]];
  } else { outcome = 'mixture'; major = options.slice(); }
  const minor = outcome === 'markovnikov' ? options.find((o) => !major.includes(o)) : null;
  // the arrow grader should accept either end when both are equally good
  if (outcome === 'mixture') major.forEach((o) => { delete o.mech.steps[0].regio; });
  if (major.some((o) => rearrangementRisk(alkene, o.pC, o.hC))) throw new Error('excluded: its carbocation could rearrange (a hydride or methyl shift would give a more stable cation); rearrangements are not covered here');
  const products = major.map((o) => o.product).sort();
  return { alkene, reagent, sites, options, outcome, major, minor, products };
}

/** Wrong-but-tempting answers, all computed. */
export function distractors(pred) {
  const R = REAGENTS[pred.reagent];
  const out = {};
  const alkane = canon(pred.alkene.replace('=', ''));
  if (pred.minor) out.anti = [pred.minor.product];
  if (pred.outcome === 'mixture') out.onlyOne = [pred.products[0]];
  out.unchanged = [canon(pred.alkene)];
  const same = (list) => list.slice().sort().join() === pred.products.join();
  const viaOther = (x) => pred.major.map((o) => { const q = predict(pred.alkene, x); return (q.options.find((e) => e.hC === o.hC && e.pC === o.pC) || q.options[0]).product; });
  if (R.kind === 'HX') {
    HX_IDS.filter((x) => x !== pred.reagent).forEach((x, k) => { out[k ? 'wrongAtom2' : 'wrongAtom'] = viaOther(x); });
  } else {
    out.wrongAtom = [alkane];
    out.wrongAtom2 = viaOther('HBr');
  }
  for (const k of Object.keys(out)) if (same(out[k])) delete out[k];
  return out;
}

/** Text for each wrong answer (one specific reason each). */
export function whyWrong(pred, kind) {
  const R = REAGENTS[pred.reagent];
  const m = pred.major[0];
  const cls = CLASS_NAME[m.cls];
  if (kind === 'anti') return `H went to the wrong carbon: that gives the less stable carbocation (${CLASS_NAME[pred.minor.cls]} instead of ${cls}). The ${R.kind === 'HX' ? R.X : 'OH'} would then sit on the less substituted carbon. Markovnikov: H goes to the carbon with more H, ${R.kind === 'HX' ? R.X : 'OH'} to the more substituted carbon.`;
  if (kind === 'onlyOne') return 'Both C=C carbons carry the same number of alkyl groups, so both carbocations are equally stable and BOTH products form: a mixture.';
  if (kind === 'unchanged') return 'That is the starting alkene again. This is an addition: the π bond is used up, so the product has no C=C.';
  if (kind === 'wrongAtom') return R.kind === 'HX' ? `The atom that adds is the halogen of the acid, ${R.X}. This answer carries a different halogen, so it is the product of a different HX.` : 'Water adds H and OH. This answer has two H atoms added instead (that is what H₂ gives), so no oxygen is in it.';
  if (kind === 'wrongAtom2') return R.kind === 'HX' ? `The atom that adds is the halogen of the acid, ${R.X}. This answer carries a different halogen, so it is the product of a different HX.` : 'That is the product of HBr. With water and an acid catalyst the group that adds is OH, not Br.';
  return 'Not the product.';
}

const KIND_ORDER = ['anti', 'wrongAtom', 'unchanged', 'wrongAtom2', 'onlyOne'];
/**
 * The answers for "what is the product?": the right one plus distractors, each with its own `why`.
 * opts.kinds (default: anti, wrongAtom, unchanged first, then onlyOne/wrongAtom2) picks which wrong answers to use; opts.n = total options.
 * Each option: {smiles:[...], correct, kind, why}.
 */
export function productChoices(pred, opts = {}) {
  const D = distractors(pred);
  const R = REAGENTS[pred.reagent];
  const n = opts.n || 4;
  const order = opts.kinds || (pred.outcome === 'mixture' ? ['onlyOne', 'wrongAtom', 'unchanged', 'wrongAtom2'] : KIND_ORDER);
  const kinds = order.filter((k) => D[k]).slice(0, n - 1);
  const m = pred.major[0];
  const right = {
    smiles: pred.products.slice(), correct: true, kind: 'major',
    why: pred.outcome === 'mixture'
      ? `Yes. The two C=C carbons carry the same number of alkyl groups, so both ${CLASS_NAME[m.cls]} carbocations are equally stable. Both products form (a mixture).`
      : pred.outcome === 'single'
        ? `Yes. Both C=C carbons are alike, so H can add to either one: one carbocation, one product.`
        : `Yes. H adds to the carbon with more H, which leaves the + charge on the more substituted carbon: the ${CLASS_NAME[m.cls]} carbocation (the more stable one). ${R.kind === 'HX' ? R.X : 'OH'} then bonds there.`
  };
  return [right, ...kinds.map((k) => ({ smiles: D[k], correct: false, kind: k, why: whyWrong(pred, k) }))];
}

// ---------------------------------------------------------------- energy pathways (illustrative numbers, labelled so in the lesson)
/** Illustrative energy (kJ/mol) of the carbocation intermediate by class: the more substituted the cation, the lower it sits. */
export const CATION_E = { 1: 120, 2: 95, 3: 75 };
/** Levels R, TS, I, TS, P for an HX addition that goes through a cation of class `cls`. The cation sits at CATION_E, TS1 just above it (it resembles the cation), TS2 slightly above it. */
export function pathwayLevels(cls, labels = {}) {
  const I = CATION_E[cls];
  if (I == null) throw new Error('no illustrative energy for class ' + cls);
  return [
    { label: labels.R || 'alkene + HBr', kind: 'R', E: 50 },
    { label: '', kind: 'TS', E: I + 15 },
    { label: labels.I || 'carbocation', kind: 'I', E: I },
    { label: '', kind: 'TS', E: I + 8 },
    { label: labels.P || 'alkyl bromide', kind: 'P', E: 10 }
  ];
}

// ---------------------------------------------------------------- carbocations for the ranking task
/** One pool per class; the class of every entry is re-derived from its structure by cationClass() in the tests. */
export const CATION_POOL = {
  0: [{ smiles: '[CH3+]', label: 'CH₃⁺' }],
  1: [{ smiles: 'C[CH2+]', label: 'CH₃CH₂⁺' }, { smiles: 'CC[CH2+]', label: 'CH₃CH₂CH₂⁺' }, { smiles: 'CC(C)[CH2+]', label: '(CH₃)₂CHCH₂⁺' }],
  2: [{ smiles: 'C[CH+]C', label: '(CH₃)₂CH⁺' }, { smiles: 'CC[CH+]C', label: 'CH₃CH₂CH⁺CH₃' }, { smiles: '[CH+]1CCCCC1', label: 'cyclohexyl cation' }, { smiles: 'CC[CH+]CC', label: '(CH₃CH₂)₂CH⁺' }],
  3: [{ smiles: 'C[C+](C)C', label: '(CH₃)₃C⁺' }, { smiles: 'CC[C+](C)C', label: 'CH₃CH₂C⁺(CH₃)₂' }, { smiles: 'C[C+]1CCCCC1', label: '1-methylcyclohexyl cation' }]
};
/** The items of a ranking round: one cation from each of the given classes (default all four), in a shuffled order. */
export function rankItems(rng = Math.random, classes = [0, 1, 2, 3]) {
  const items = classes.map((c) => { const pool = CATION_POOL[c]; const e = pool[Math.floor(rng() * pool.length)]; return { smiles: e.smiles, label: e.label }; });
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return items;
}
/** Indices of `items` from most to least stable (class descending; ties keep their order). */
export function rankOrder(items) {
  return items.map((it, i) => ({ i, c: cationClass(it.smiles) })).sort((p, q) => q.c - p.c || p.i - q.i).map((x) => x.i);
}

export { MINUS, formulaOf, hText };

// Lesson 10: halogens, H2, epoxidation, KMnO4 and polymers (stereo-aware). Extends this module additively.
export * from './reactions-additions.js';

// Lesson 11: conjugated dienes + HX (1,2- and 1,4-addition through the allylic cation). Extends this module additively.
export * from './reactions-dienes.js';

// Lesson 12: alkynes (HX, X2, hydration, Lindlar / Pd, acetylide alkylation) and the synthesis planner's sequence engine. Extends this module additively.
export * from './reactions-alkynes.js';
export * from './synthesis.js';
// Lesson 13: benzene and electrophilic aromatic substitution (Br2/FeBr3, Cl2/FeCl3, I2, HNO3/H2SO4, SO3, Friedel-Crafts alkylation and acylation, nitro -> amine). Extends this module additively.
export * from './reactions-aromatic.js';
