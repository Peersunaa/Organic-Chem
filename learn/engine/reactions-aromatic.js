// Electrophilic aromatic substitution on BENZENE (Lesson 13, McMurry 5.3 to 5.5). Pure data/logic, no DOM, no RDKit at import time.
//   Reagents: Br2/FeBr3, Cl2/FeCl3, I2/oxidant, HNO3/H2SO4, SO3/H2SO4, R-Cl/AlCl3 (Friedel-Crafts alkylation), RCOCl/AlCl3 (Friedel-Crafts acylation).
//   For each: the electrophile and how it is made (a balanced step, catalyst regenerated), the attack of the pi electrons that gives the sigma complex
//   (arenium ion, + shared over three carbons, found by resonance.js), and the loss of H+ that restores the ring. Every step is written as a mechanism-player step
//   whose curved arrows reproduce the next structures (checkMechanism).
//   Reduction of a nitro group to an amine (Fe, Sn or SnCl2 with H3O+, then HO-) gives aniline.
// Not modelled (not in the book at this point): substituent effects on a ring that already has a group (Lesson 14), Hueckel's rule, carbocation rearrangements (alkyl halides
// whose cation could rearrange are refused), polyalkylation.
import { analyze, canon, coords2d } from './chem.js';
import { stateOf, enumerate, toSmiles } from './resonance.js';
import { nameBothArene, SUB, arene } from './naming-arene.js';

export const BENZENE = 'c1ccccc1';
export const KEKULE = 'C1=CC=CC=C1';
const MINUS = '−';

// ---------------------------------------------------------------- the reagents
/**
 * kind: 'halogen' (X2 + Lewis acid), 'oxidant' (I2), 'acid' (HNO3, SO3 in H2SO4), 'FC' (alkyl or acyl chloride + AlCl3).
 * group = SMILES of the group the ring gains, written so that its FIRST atom is the one bonded to the ring (null for FC: it depends on the halide).
 * label = what is written over the arrow. E = the electrophile (a bookkeeping species, as in the book). catalyst / anion: the Lewis acid and the anion it leaves behind.
 */
export const EAS = {
  Br2: { id: 'Br2', kind: 'halogen', label: 'Br₂, FeBr₃', X: 'Br', group: 'Br', reagent: 'BrBr', E: '[Br+]', Elabel: 'Br⁺', Ename: 'the bromine cation (polarised Br₂ held by FeBr₃)', catalyst: 'Br[Fe](Br)Br', catalystLabel: 'FeBr₃', anion: 'Br[Fe-](Br)(Br)Br', anionLabel: 'FeBr₄⁻', HB: 'Br', HBlabel: 'HBr', product: 'bromobenzene', drawnActivation: true },
  Cl2: { id: 'Cl2', kind: 'halogen', label: 'Cl₂, FeCl₃', X: 'Cl', group: 'Cl', reagent: 'ClCl', E: '[Cl+]', Elabel: 'Cl⁺', Ename: 'the chlorine cation (polarised Cl₂ held by FeCl₃)', catalyst: 'Cl[Fe](Cl)Cl', catalystLabel: 'FeCl₃', anion: 'Cl[Fe-](Cl)(Cl)Cl', anionLabel: 'FeCl₄⁻', HB: 'Cl', HBlabel: 'HCl', product: 'chlorobenzene', drawnActivation: true },
  I2: { id: 'I2', kind: 'oxidant', label: 'I₂, oxidant', X: 'I', group: 'I', reagent: 'II', E: '[I+]', Elabel: 'I⁺', Ename: 'the iodine cation (made by oxidising I₂)', catalyst: null, anion: 'O', anionLabel: 'H₂O', HB: '[OH3+]', HBlabel: 'H₃O⁺', product: 'iodobenzene', drawnActivation: false },
  HNO3: { id: 'HNO3', kind: 'acid', label: 'HNO₃, H₂SO₄', group: '[N+](=O)[O-]', reagent: 'O[N+](=O)[O-]', E: 'O=[N+]=O', Elabel: 'NO₂⁺', Ename: 'the nitronium ion', catalyst: 'OS(=O)(=O)O', catalystLabel: 'H₂SO₄', anion: 'OS(=O)(=O)[O-]', anionLabel: 'HSO₄⁻', HB: 'OS(=O)(=O)O', HBlabel: 'H₂SO₄', product: 'nitrobenzene', drawnActivation: false },
  SO3: { id: 'SO3', kind: 'acid', label: 'SO₃, H₂SO₄', group: 'S(=O)(=O)O', reagent: 'O=S(=O)=O', E: 'O[S+](=O)=O', Elabel: 'HSO₃⁺', Ename: 'protonated sulfur trioxide', catalyst: 'OS(=O)(=O)O', catalystLabel: 'H₂SO₄', anion: 'OS(=O)(=O)[O-]', anionLabel: 'HSO₄⁻', HB: 'OS(=O)(=O)O', HBlabel: 'H₂SO₄', product: 'benzenesulfonic acid', drawnActivation: false },
  RCl: { id: 'RCl', kind: 'FC', fc: 'alkyl', label: 'R–Cl, AlCl₃', Elabel: 'R⁺', Ename: 'a carbocation', catalyst: 'Cl[Al](Cl)Cl', catalystLabel: 'AlCl₃', anion: 'Cl[Al-](Cl)(Cl)Cl', anionLabel: 'AlCl₄⁻', HB: 'Cl', HBlabel: 'HCl', drawnActivation: true },
  RCOCl: { id: 'RCOCl', kind: 'FC', fc: 'acyl', label: 'RCOCl, AlCl₃', Elabel: 'RC≡O⁺', Ename: 'an acylium ion', catalyst: 'Cl[Al](Cl)Cl', catalystLabel: 'AlCl₃', anion: 'Cl[Al-](Cl)(Cl)Cl', anionLabel: 'AlCl₄⁻', HB: 'Cl', HBlabel: 'HCl', drawnActivation: true }
};
export const EAS_IDS = Object.keys(EAS);

/** Alkyl chlorides (Friedel-Crafts alkylation) and acid chlorides (acylation) that work on benzene, with no carbocation rearrangement risk. */
export const ALKYL_HALIDES = ['CCl', 'CCCl', 'CC(C)Cl', 'CC(C)(C)Cl', 'ClC1CCCCC1'];
export const ACYL_HALIDES = ['CC(=O)Cl', 'CCC(=O)Cl', 'CCCC(=O)Cl'];

/** The lab/generator pool: a reaction = reagent id (+ halide). */
export const LAB_EAS = [
  { id: 'bromination', reagent: 'Br2' }, { id: 'chlorination', reagent: 'Cl2' }, { id: 'iodination', reagent: 'I2' },
  { id: 'nitration', reagent: 'HNO3' }, { id: 'sulfonation', reagent: 'SO3' },
  { id: 'methylation', reagent: 'RCl', halide: 'CCl' }, { id: 'ethylation', reagent: 'RCl', halide: 'CCCl' }, { id: 'isopropylation', reagent: 'RCl', halide: 'CC(C)Cl' }, { id: 'tert-butylation', reagent: 'RCl', halide: 'CC(C)(C)Cl' },
  { id: 'acetylation', reagent: 'RCOCl', halide: 'CC(=O)Cl' }, { id: 'propanoylation', reagent: 'RCOCl', halide: 'CCC(=O)Cl' }
];
export const LAB_EAS_BY_ID = Object.fromEntries(LAB_EAS.map((x) => [x.id, x]));
export const labLabel = (x) => (x.reagent === 'RCl' || x.reagent === 'RCOCl' ? `${halideText(x.halide)}, AlCl₃` : EAS[x.reagent].label);
const SUBD = '₀₁₂₃₄₅₆₇₈₉';
export function halideText(h) {
  const t = { CCl: 'CH₃Cl', CCCl: 'CH₃CH₂Cl', 'CC(C)Cl': '(CH₃)₂CHCl', 'CC(C)(C)Cl': '(CH₃)₃CCl', 'ClC1CCCCC1': 'chlorocyclohexane', 'CC(=O)Cl': 'CH₃COCl', 'CCC(=O)Cl': 'CH₃CH₂COCl', 'CCCC(=O)Cl': 'CH₃CH₂CH₂COCl', CCCCl: 'CH₃CH₂CH₂Cl', 'ClC=C': 'CH₂=CHCl', 'Clc1ccccc1': 'chlorobenzene', 'ClC(C)=C': '2-chloropropene' };
  return t[h] || h;
}

// ---------------------------------------------------------------- building structures from graph edits (not string pasting)
/** Remove the halogen X from a halide and return {state, alpha}: atoms re-indexed so the carbon that carried X is atom 0. */
function dropHalogen(halide) {
  const st = stateOf(halide);
  const x = st.el.findIndex((e) => ['Cl', 'Br', 'I', 'F'].includes(e));
  const alpha = st.bonds.find((b) => b.a === x || b.b === x);
  const a = alpha.a === x ? alpha.b : alpha.a;
  const keep = st.el.map((_, i) => i).filter((i) => i !== x);
  const order = [a, ...keep.filter((i) => i !== a)];
  const idx = new Map(order.map((old, k) => [old, k]));
  return {
    el: order.map((o) => st.el[o]), impH: order.map((o) => st.impH[o]), charge: order.map((o) => st.charge[o]),
    bonds: st.bonds.filter((b) => b.a !== x && b.b !== x).map((b) => ({ a: idx.get(b.a), b: idx.get(b.b), order: b.order }))
  };
}
/** SMILES of a group, first atom bonded to the ring: for halide R-Cl it is R written from the carbon that carried Cl (hydrogens kept in brackets). */
export function groupSmiles(halide) { return toSmiles(dropHalogen(halide)); }
/** The cation R+ (or the acylium RC≡O+) from the halide. */
export function cationOf(halide, kind) {
  const st = dropHalogen(halide);
  if (kind === 'acyl') {
    const o = st.el.findIndex((e, i) => e === 'O' && st.bonds.some((b) => (b.a === 0 && b.b === i) || (b.b === 0 && b.a === i)));
    const bo = st.bonds.find((b) => (b.a === 0 && b.b === o) || (b.b === 0 && b.a === o));
    bo.order = 3; st.charge[o] = 1;
    return toSmiles(st);
  }
  st.charge[0] = 1; st.impH[0] = st.impH[0];   // the carbon has lost the Cl: a cation with one bond fewer
  return toSmiles(st);
}

// ring-closure digit 9 so that a group with a ring of its own (cyclohexyl) cannot clash with the ring being written
const arom = (G) => canon(`c9(${G})ccccc9`);
const sigmaOrtho = (G) => `C9(${G})C=CC=C[CH+]9`;

// ---------------------------------------------------------------- friedel-crafts limits
/** Why a Friedel-Crafts alkylation with this halide cannot work (null when it can). */
export function halideProblem(halide) {
  const info = analyze(halide);
  if (!info) return { code: 'parse', why: 'That structure cannot be read.' };
  const x = info.atoms.find((a) => ['Cl', 'Br', 'I', 'F'].includes(a.sym));
  if (!x || x.nbrs.length !== 1) return { code: 'nohalide', why: 'Friedel–Crafts alkylation needs an alkyl halide, R–X.' };
  const c = info.atoms[x.nbrs[0]];
  if (c.sym !== 'C') return { code: 'nohalide', why: 'The halogen must be on a carbon.' };
  const A = arene(halide);
  if (A && A.ring.includes(c.idx)) return { code: 'arylHalide', why: 'Only alkyl halides work. An aryl halide such as chlorobenzene (Cl on a benzene ring carbon) does not form a carbocation with AlCl₃, so nothing happens.' };
  if (/c/.test(canon(halide) || '')) return { code: 'excluded', why: 'That halide has an aromatic ring in it, which is outside this lesson.' };
  if (info.bonds.some((b) => (b.bo ?? 1) === 2 && b.atoms.includes(c.idx) && b.atoms.every((k) => info.atoms[k].sym === 'C'))) return { code: 'vinylicHalide', why: 'Only alkyl halides work. In a vinylic halide the Cl is on a C=C carbon, and AlCl₃ cannot pull it off to give a carbocation.' };
  if (info.bonds.some((b) => (b.bo ?? 1) === 2 && b.atoms.includes(c.idx) && b.atoms.some((k) => info.atoms[k].sym === 'O'))) return { code: 'acyl', why: 'This is an acid chloride, which reacts by the acylation reaction (RCOCl and AlCl₃), not by alkylation.' };
  return null;
}
/**
 * Could the carbocation from this alkyl halide rearrange (1,2-hydride or 1,2-methyl shift) to a DIFFERENT cation that is at least as stable (same or more carbon neighbours on C+)?
 * Rearrangements are not taught in this course, so those halides are refused. A shift that gives back the very same cation (ethyl, sec-butyl, cyclohexyl) does not matter.
 * The shifts are done as graph edits on the cation and compared by canonical SMILES.
 */
export function rearranges(halide) {
  const st = dropHalogen(halide);
  const clone = () => ({ el: st.el, impH: st.impH.slice(), charge: st.charge.slice(), bonds: st.bonds.map((b) => ({ ...b })) });
  const nbOf = (S, i) => S.bonds.filter((b) => b.a === i || b.b === i).map((b) => (b.a === i ? b.b : b.a)).filter((k) => S.el[k] === 'C');
  const base = clone(); base.charge[0] = 1;
  const baseKey = canon(toSmiles(base)), cls0 = nbOf(base, 0).length;
  for (const k of nbOf(st, 0)) {
    if (st.impH[k] > 0) {                                  // 1,2-H shift
      const t = clone(); t.impH[0] += 1; t.impH[k] -= 1; t.charge[k] = 1;
      if (canon(toSmiles(t)) !== baseKey && nbOf(t, k).length >= cls0) return true;
    }
    for (const m of nbOf(st, k)) {                          // 1,2-CH3 shift
      if (m === 0 || nbOf(st, m).length !== 1 || st.impH[m] !== 3) continue;
      const t = clone(); t.bonds = t.bonds.filter((b) => !((b.a === k && b.b === m) || (b.a === m && b.b === k))); t.bonds.push({ a: 0, b: m, order: 1 }); t.charge[k] = 1;
      if (canon(toSmiles(t)) !== baseKey && nbOf(t, k).length >= cls0) return true;
    }
  }
  return false;
}
export function groupKind(smiles) {
  // does the arene carry a group that blocks Friedel-Crafts (NO2, C≡N, SO3H, C=O)?
  const A = arene(smiles);
  if (!A) return null;
  const bad = A.subs.filter((s) => ['NO2', 'CN', 'SO3H', 'Ac', 'Pro', 'CHO', 'COOH'].includes(s.key));
  return bad.length ? bad[0].key : null;
}
const BLOCK_TEXT = { NO2: 'nitro (–NO₂)', CN: 'cyano (–C≡N)', SO3H: 'sulfonic acid (–SO₃H)', Ac: 'acyl (–COR)', Pro: 'acyl (–COR)', CHO: 'carbonyl (–COR)', COOH: 'carbonyl (–COR)' };

// ---------------------------------------------------------------- the sigma complex and its resonance forms
/** The six ring atoms of a sigma complex (the 6-cycle of carbons through the + carbon), as indices of the state. */
export function sigmaRing(st) {
  const plus = st.el.findIndex((e, i) => e === 'C' && st.charge[i] === 1);
  const nb = st.el.map(() => []);
  st.bonds.forEach((b) => { if (st.el[b.a] === 'C' && st.el[b.b] === 'C') { nb[b.a].push(b.b); nb[b.b].push(b.a); } });
  const walk = (path) => {
    if (path.length === 6) return nb[path[5]].includes(path[0]) ? path : null;
    for (const m of nb[path[path.length - 1]]) { if (path.includes(m)) continue; const r = walk(path.concat(m)); if (r) return r; }
    return null;
  };
  return walk([plus]);
}
/**
 * The resonance forms of the sigma complex that move ONLY ring electrons: the + on the ortho, para and ortho' carbons (three forms). Forms that also move electrons inside the group
 * (the two drawings of a nitro group, say) are the group's own resonance and are left out. Found by resonance.js, proven against RDKit in tools/check_eas.py.
 */
export function sigmaForms(sigma) {
  const all = enumerate(sigma);
  const st0 = all[0].state;
  const ring = new Set(sigmaRing(st0));
  const same = (f) => st0.charge.every((q, i) => ring.has(i) || f.state.charge[i] === q) && st0.bonds.every((b) => {
    if (ring.has(b.a) && ring.has(b.b)) return true;
    const o = f.state.bonds.find((x) => (x.a === b.a && x.b === b.b) || (x.a === b.b && x.b === b.a));
    return o && o.order === b.order;
  });
  return all.filter(same);
}
/** For tests: positions of the + in each form relative to the sp3 carbon: 'ortho' (next to it) or 'para' (opposite). */
export function cationPositions(sigma) {
  const forms = sigmaForms(sigma);
  const ring = sigmaRing(forms[0].state);
  const sp3 = ring.find((i) => forms[0].state.bonds.filter((b) => (b.a === i || b.b === i) && b.order === 2).length === 0 && forms[0].state.charge[i] === 0);
  const at = (i) => ring.indexOf(i);
  return forms.map((f) => { const p = ring.find((i) => f.state.charge[i] === 1); const d = Math.abs(at(p) - at(sp3)); const dd = Math.min(d, 6 - d); return dd === 1 ? 'ortho' : dd === 2 ? 'meta' : 'para'; });
}

// ---------------------------------------------------------------- prediction
const refuse = (code, why) => ({ ok: false, code, why });
/**
 * predictEAS(arene, reagent, halide): the monosubstituted product of EAS on benzene.
 * Returns {ok:true, product, name, E, ...} or a refusal {ok:false, code, why}: 'deactivated' (Friedel-Crafts on NO2, CN, SO3H, COR rings), 'arylHalide', 'vinylicHalide',
 * 'rearranges', 'notBenzene' (a ring with a group: directing effects are Lesson 14), 'unknown'.
 */
export function predictEAS(areneSmiles, reagent, halide = null) {
  const R = EAS[reagent];
  if (!R) return refuse('unknown', 'Unknown reagent.');
  const can = canon(areneSmiles);
  if (!can) return refuse('unknown', 'That structure cannot be read.');
  const isFC = R.kind === 'FC';
  if (can !== BENZENE) {
    const blocker = isFC ? groupKind(areneSmiles) : null;
    if (blocker) return refuse('deactivated', `Friedel–Crafts reactions do not work on a ring that already carries a ${BLOCK_TEXT[blocker]} group: such a ring is much less reactive than benzene, so AlCl₃ and the carbocation get nowhere.`);
    return refuse('notBenzene', 'This ring already has a group, so where the new group goes depends on directing effects, which come in Lesson 14. Here every ring is benzene.');
  }
  let G = R.group, E = R.E, extra = {};
  if (isFC) {
    if (!halide) return refuse('unknown', 'Give the alkyl or acyl chloride.');
    if (R.fc === 'alkyl') {
      const p = halideProblem(halide);
      if (p) return refuse(p.code, p.why);
      if (rearranges(halide)) return refuse('rearranges', 'This halide’s carbocation could rearrange to a more stable one, and rearrangements are not part of this course, so it is left out.');
    } else {
      const info = analyze(halide);
      const cl = info && info.atoms.find((a) => a.sym === 'Cl');
      const c = cl && info.atoms[cl.nbrs[0]];
      const ok = c && c.sym === 'C' && info.bonds.some((b) => (b.bo ?? 1) === 2 && b.atoms.includes(c.idx) && b.atoms.some((k) => info.atoms[k].sym === 'O')) && info.atoms.every((a) => ['C', 'O', 'Cl'].includes(a.sym)) && !/c/.test(canon(halide));
      if (!ok) return refuse('nohalide', 'Friedel–Crafts acylation needs an acid chloride, R–CO–Cl.');
    }
    G = groupSmiles(halide);
    E = cationOf(halide, R.fc);
    extra = { halide };
  }
  const product = arom(G);
  const sigma = sigmaOrtho(G);
  const forms = sigmaForms(sigma);
  return {
    ok: true, reagent, halide: halide || null, R, product, products: [product], name: nameBothArene(product),
    group: G, E, Elabel: R.Elabel, sigma, forms: forms.map((f) => canon(f.smiles)), formSmiles: forms.map((f) => f.smiles), ...extra
  };
}

// ---------------------------------------------------------------- the balanced steps (data)
/** Generation of the electrophile, a balanced step: {reactants, products, eMinus?, text, drawn}. */
export function generationOf(reagent, halide = null) {
  const R = EAS[reagent];
  switch (reagent) {
    case 'Br2': case 'Cl2':
      return { reactants: [R.reagent, R.catalyst], products: [R.E, R.anion], drawn: true, text: `${R.catalystLabel} takes one ${R.X} of ${R.X}₂ with its bonding pair, leaving the other ${R.X} short of electrons: ${R.Elabel} and ${R.anionLabel} (in reality a polarised ${R.X}–${R.X} held by ${R.catalystLabel}, written as ${R.Elabel} for bookkeeping).` };
    case 'I2':
      return { reactants: [R.reagent], products: [R.E, R.E], eMinus: 2, drawn: false, text: 'An oxidant takes two electrons from I₂ and gives two I⁺ (iodine cation) equivalents. In the body this is done with H₂O₂ and an enzyme.' };
    case 'HNO3':
      return { reactants: ['O[N+](=O)[O-]', 'OS(=O)(=O)O', 'OS(=O)(=O)O'], products: [R.E, '[OH3+]', R.anion, R.anion], drawn: false, text: 'H₂SO₄ protonates HNO₃; the protonated nitric acid loses H₂O and leaves the nitronium ion NO₂⁺ (a second H₂SO₄ gives the H⁺ to that water).' };
    case 'SO3':
      return { reactants: [R.reagent, 'OS(=O)(=O)O'], products: [R.E, R.anion], drawn: false, text: 'H₂SO₄ gives H⁺ to SO₃, which makes HSO₃⁺, the electrophile.' };
    case 'RCl': return { reactants: [halide, R.catalyst], products: [cationOf(halide, 'alkyl'), R.anion], drawn: true, text: 'AlCl₃ helps R–Cl ionise: it takes the Cl (as AlCl₄⁻) and leaves the carbocation R⁺.' };
    case 'RCOCl': return { reactants: [halide, R.catalyst], products: [cationOf(halide, 'acyl'), R.anion], drawn: true, text: 'AlCl₃ takes the Cl of the acid chloride (as AlCl₄⁻), and the C–Cl electrons make the C≡O triple bond of the acylium ion RC≡O⁺.' };
    default: throw new Error('unknown reagent ' + reagent);
  }
}
/** What happens to the leftovers after deprotonation, for nitration (H3O+ and HSO4- recombine). */
export function finishOf(reagent) {
  if (reagent === 'HNO3') return { reactants: ['[OH3+]', 'OS(=O)(=O)[O-]'], products: ['O', 'OS(=O)(=O)O'] };
  return null;
}
/** Overall equation (balanced) and the catalyst: net = what is used up; catalyst appears unchanged on both sides of the step list. */
export function netOf(reagent, halide = null) {
  const R = EAS[reagent];
  const P = (g) => arom(g);
  switch (reagent) {
    case 'I2': return { reactants: [BENZENE, BENZENE, 'II', '[O]'], products: [P('I'), P('I'), 'O'], catalyst: null, note: '[O] stands for the oxidant (one O atom).' };
    case 'HNO3': return { reactants: [BENZENE, 'O[N+](=O)[O-]'], products: [P(R.group), 'O'], catalyst: R.catalyst };
    case 'SO3': return { reactants: [BENZENE, R.reagent], products: [P(R.group)], catalyst: R.catalyst };
    case 'Br2': case 'Cl2': return { reactants: [BENZENE, R.reagent], products: [P(R.group), R.HB], catalyst: R.catalyst };
    case 'RCl': case 'RCOCl': return { reactants: [BENZENE, halide], products: [P(groupSmiles(halide)), 'Cl'], catalyst: R.catalyst };
    default: throw new Error('unknown reagent');
  }
}

// ---------------------------------------------------------------- the mechanism (mechanism-player data)
const isHal = (e) => ['F', 'Cl', 'Br', 'I'].includes(e);
/**
 * Atom numbers for arrows. Scenes are built by mechanism-core.buildScene: each part's heavy atoms in SMILES order, then its H atoms heavy atom by heavy atom.
 * partMaps(before) mirrors that numbering (so this module needs no import of the widget code).
 */
function partMaps(before) {
  const maps = []; let n = 0;
  before.forEach((smi) => {
    const info = analyze(smi);
    const heavy = info.atoms.map((_, i) => n + i);
    n += info.atoms.length;
    const h = {};
    info.atoms.forEach((a, i) => { if (a.impH) { h[i] = []; for (let k = 0; k < a.impH; k++) h[i].push(n++); } });
    maps.push({ heavy, h, info });
  });
  return maps;
}
const bondBetween = (info, i, j) => info.bonds.find((b) => b.atoms.includes(i) && b.atoms.includes(j));

/** Width of a drawn molecule in bond units (heavy atoms plus room for hydrogens), used to place parts of a scene side by side. */
function drawnWidth(smiles) {
  const pos = coords2d(smiles);
  const xs = pos.map((p) => p.x);
  const info = analyze(smiles);
  return Math.max(...xs) - Math.min(...xs) + (info.atoms.some((a) => a.impH) ? 2.2 : 1.2);
}

/**
 * The mechanism of the reaction in mechanism-player format.
 *   steps: [activation (only when its arrows can be drawn: halogens, alkyl and acyl chlorides)], attack (pi electrons -> E+, sigma complex), deprotonation (base removes H+).
 *   reactants/products list everything (benzene, reagent molecules, catalyst) so the whole mechanism balances and the catalyst comes back.
 * For HNO3, SO3 and I2 the electrophile is made by a step that is not drawn with arrows (see generationOf); the mechanism then starts from E+ with its counter ion.
 */
export function easMechanism(reagent, halide = null) {
  const pred = predictEAS(BENZENE, reagent, halide);
  if (!pred.ok) throw new Error('excluded: ' + pred.why);
  const R = EAS[reagent];
  const steps = [];
  const E = pred.E, anion = R.anion, sigma = pred.sigma;
  const prod = pred.product;
  let activation = null;
  if (R.drawnActivation) {
    const reag = R.kind === 'FC' ? halide : R.reagent;
    const before = [KEKULE, reag, R.catalyst], after = [KEKULE, E, anion];
    const M = partMaps(before);
    const rI = M[1].info, cI = M[2].info;
    const metal = cI.atoms.findIndex((a) => a.sym === 'Fe' || a.sym === 'Al');
    let arrows, equiv = [];
    if (R.kind === 'halogen') {
      const a = M[1].heavy[0], b = M[1].heavy[1];
      arrows = [{ from: { lp: a }, to: { atom: M[2].heavy[metal] } }, { from: { bond: [a, b] }, to: { atom: a } }];
      equiv = [{ [a]: b, [b]: a }];
    } else {
      const clI = rI.atoms.findIndex((x) => x.sym === 'Cl');
      const cI2 = rI.atoms[clI].nbrs[0];
      const cl = M[1].heavy[clI], c = M[1].heavy[cI2];
      arrows = [{ from: { lp: cl }, to: { atom: M[2].heavy[metal] } }, { from: { bond: [c, cl] }, to: { atom: cl } }];
      if (R.fc === 'acyl') {
        const o = rI.atoms.findIndex((x, i) => x.sym === 'O' && x.nbrs.includes(cI2));
        arrows.push({ from: { lp: M[1].heavy[o] }, to: { bond: [c, M[1].heavy[o]] } });
      }
    }
    // the three halogens of the Lewis acid are interchangeable too (any of them can end up bonded to the electrophile's partner): not needed, the metal is the target
    activation = { before, arrows, after, label: R.kind === 'halogen' ? `${R.catalystLabel} takes ${R.X}⁻ from ${R.X}₂: the electrophile ${R.Elabel} and ${R.anionLabel} form` : R.fc === 'alkyl' ? 'AlCl₃ takes Cl⁻ from R–Cl: the carbocation R⁺ and AlCl₄⁻ form' : 'AlCl₃ takes Cl⁻ from RCOCl: the acylium ion RC≡O⁺ and AlCl₄⁻ form', equiv, layout: [{ at: [0, 3.2] }, { at: [0, 0] }, { at: [drawnWidth(reag) + 0.9, 0] }] };
    steps.push(activation);
  }
  // attack
  {
    const before = [KEKULE, E, anion], after = [sigma, anion];
    const M = partMaps(before);
    const eI = M[1].info;
    // the atom that bonds to the ring: acylium: the carbon of C≡O+; every other electrophile: the atom carrying the + charge
    let eAtom = eI.atoms.findIndex((a) => a.fc === 1);
    if (R.kind === 'FC' && R.fc === 'acyl') eAtom = eI.atoms.findIndex((a) => a.sym === 'C' && a.nbrs.some((k) => eI.atoms[k].sym === 'O' && (bondBetween(eI, a.idx, k).bo ?? 1) === 3));
    const ring = M[0].heavy;
    const eS = M[1].heavy[eAtom];
    const arrows = [{ from: { bond: [ring[0], ring[1]] }, to: { bond: [ring[0], eS] } }];
    const extraSwap = [];
    if (reagent === 'HNO3') {
      const os = eI.atoms.filter((a) => a.sym === 'O').map((a) => M[1].heavy[a.idx]);
      arrows.push({ from: { bond: [eS, os[0]] }, to: { atom: os[0] } });
      extraSwap.push({ [os[0]]: os[1], [os[1]]: os[0] });
    } else if (R.kind === 'FC' && R.fc === 'acyl') {
      const o = eI.atoms.find((a) => a.sym === 'O');
      arrows.push({ from: { bond: [eS, M[1].heavy[o.idx]] }, to: { atom: M[1].heavy[o.idx] } });
    }
    // every Kekule double bond and either end of it is an equally good place to start (the six symmetry operations of the ring, times the swap of the two O of NO2+)
    const rot = (k, flip) => { const m = {}; for (let i = 0; i < 6; i++) m[ring[i]] = ring[flip ? (((k - i) % 6) + 6) % 6 : (i + k) % 6]; return m; };
    const ringMaps = [];
    for (const flip of [false, true]) for (const k of [0, 2, 4]) ringMaps.push(rot(flip ? (k + 1) % 6 : k, flip));
    // the flip maps keep the Kekule pattern when they swap the two ends of a double bond: i -> k - i with k odd
    let equiv = ringMaps.filter((m) => Object.keys(m).some((i) => m[i] !== Number(i)));
    if (extraSwap.length) equiv = equiv.concat(extraSwap).concat(ringMaps.flatMap((m) => extraSwap.map((s) => ({ ...m, ...s }))));
    steps.push({ before, arrows, after, layout: [{ at: [0, 0] }, { at: [4.6, 0.3] }, { at: [0.6, 3.7] }], label: `The π electrons of the ring attack ${R.Elabel === 'R⁺' ? 'the carbocation' : R.Elabel}: a C–${R.kind === 'FC' ? 'C' : eI.atoms[eAtom].sym} bond forms and the ring carries a + charge (the sigma complex)`, equiv });
  }
  // deprotonation
  {
    const before = [sigma, anion], after = [prod, R.HB];
    if (R.kind === 'halogen' || R.kind === 'FC') after.push(R.catalyst);
    const M = partMaps(before);
    const sI = M[0].info;
    const plus = sI.atoms.findIndex((a) => a.fc === 1 && a.sym === 'C');
    const ipsoIdx = sI.atoms[plus].nbrs.find((k) => sI.atoms[k].nbrs.length === 3);
    const Hs = M[0].h[ipsoIdx][0];
    const bI = M[1].info;
    const arrows = [];
    let equiv = [];
    if (R.kind === 'halogen' || (R.kind === 'FC')) {
      const metal = bI.atoms.findIndex((a) => a.sym === 'Fe' || a.sym === 'Al');
      const hal = bI.atoms.map((a, i) => i).filter((i) => isHal(bI.atoms[i].sym));
      const x = M[1].heavy[hal[0]], m = M[1].heavy[metal];
      arrows.push({ from: { lp: x }, to: { atom: Hs } }, { from: { bond: [M[0].heavy[ipsoIdx], Hs] }, to: { bond: [M[0].heavy[ipsoIdx], M[0].heavy[plus]] } }, { from: { bond: [m, x] }, to: { atom: x } });
      equiv = hal.slice(1).map((j) => ({ [x]: M[1].heavy[j], [M[1].heavy[j]]: x }));
    } else if (reagent === 'I2') {
      const o = M[1].heavy[0];
      arrows.push({ from: { lp: o }, to: { atom: Hs } }, { from: { bond: [M[0].heavy[ipsoIdx], Hs] }, to: { bond: [M[0].heavy[ipsoIdx], M[0].heavy[plus]] } });
    } else {
      // HSO4-: the O- takes H+
      const oNeg = bI.atoms.findIndex((a) => a.sym === 'O' && a.fc === -1);
      arrows.push({ from: { lp: M[1].heavy[oNeg] }, to: { atom: Hs } }, { from: { bond: [M[0].heavy[ipsoIdx], Hs] }, to: { bond: [M[0].heavy[ipsoIdx], M[0].heavy[plus]] } });
    }
    steps.push({ before, arrows, after, label: `A base (${R.anionLabel}) removes H⁺ from the sp³ carbon; its two C–H electrons go back into the ring and the aromatic ring is restored`, equiv });
  }
  const reactants = R.drawnActivation ? [KEKULE, R.kind === 'FC' ? halide : R.reagent, R.catalyst] : [KEKULE, E, anion];
  const products = steps[steps.length - 1].after;
  return { reactants, products, steps, reagent, halide, pred };
}

/** The part of a mechanism from step k on, as a mechanism of its own (for lessons that draw it in pieces). */
export function mechanismPart(mech, from, to = mech.steps.length) {
  const steps = mech.steps.slice(from, to);
  const reactants = from === 0 ? mech.reactants : mech.steps[from - 1].after;
  const products = steps[steps.length - 1].after;
  return { reactants, products, steps };
}

// ---------------------------------------------------------------- reduction of a nitro group (Fe or Sn or SnCl2, H3O+, then HO-)
/** Aniline from nitrobenzene (or ArNO2 to ArNH2) by editing the graph: the NO2 group becomes NH2. */
export function reduceNitro(smiles) {
  const info = analyze(smiles);
  if (!info) return null;
  const n = info.atoms.find((a) => a.sym === 'N' && a.fc === 1 && a.nbrs.filter((k) => info.atoms[k].sym === 'O').length === 2);
  if (!n) return null;
  const st = stateOf(smiles);
  const os = n.nbrs.filter((k) => info.atoms[k].sym === 'O');
  const drop = new Set(os);
  const keep = st.el.map((_, i) => i).filter((i) => !drop.has(i));
  const idx = new Map(keep.map((old, k) => [old, k]));
  const out = {
    el: keep.map((o) => st.el[o]), impH: keep.map((o) => st.impH[o]), charge: keep.map((o) => st.charge[o]),
    bonds: st.bonds.filter((b) => !drop.has(b.a) && !drop.has(b.b)).map((b) => ({ a: idx.get(b.a), b: idx.get(b.b), order: b.order }))
  };
  const ni = idx.get(n.idx); out.charge[ni] = 0; out.impH[ni] = 2;
  return canon(toSmiles(out));
}

// ---------------------------------------------------------------- answer choices (lab, generator, lesson)
const NU = { Br2: 'Br', Cl2: 'Cl', I2: 'I', HNO3: 'O', SO3: 'O', RCl: 'Cl', RCOCl: 'Cl' };
/** The reaction as the lab/generator pool entry for (reagent, halide). */
export const labEntry = (reagent, halide = null) => LAB_EAS.find((x) => x.reagent === reagent && (x.halide || null) === halide) || null;
/** What is written over the reaction arrow for a prediction. */
export const reagentLabel = (reagent, halide = null) => (reagent === 'RCl' || reagent === 'RCOCl' ? `${halideText(halide)}, AlCl₃` : EAS[reagent].label);
/** The sentence that explains a correct answer. */
export function easRightWhy(pred) {
  const R = EAS[pred.reagent];
  const nm = pred.name ? pred.name.new : pred.product;
  return `Yes. ${R.Elabel} (${R.Ename}) replaces one H on the ring, and H⁺ leaves, so the ring stays aromatic: ${nm}${R.kind === 'oxidant' ? '' : ' plus ' + R.HBlabel}.`;
}
/**
 * Four drawn answers: the substitution product, the addition product (the ring would lose its aromatic stability), the product of a DIFFERENT reagent, and a ring with two groups.
 * Each has its own `why`. {smiles:[...], correct, why, kind}. `rng` picks the other reagent (default: the next one in the list).
 */
export function easChoices(pred, rng = null) {
  const R = EAS[pred.reagent];
  const nm = (s) => { const n = nameBothArene(s); return n ? n.new : s; };
  const out = [{ kind: 'major', correct: true, smiles: [pred.product], why: easRightWhy(pred) }];
  const G = pred.group, Nu = NU[pred.reagent];
  const add = canon(`C9(${G})C(${Nu})C=CC=C9`);
  out.push({ kind: 'addition', correct: false, smiles: [add], why: `That ADDS ${R.Elabel === 'R⁺' ? 'R' : R.Elabel} and ${Nu === 'O' ? 'OH' : Nu} across a C=C, like cyclohexene would. It destroys the aromatic ring, which is so stable that the reaction does not do this: it substitutes, losing H⁺ so the ring is kept.` });
  const others = LAB_EAS.filter((x) => { const p = predictEAS(BENZENE, x.reagent, x.halide || null); return p.ok && p.product !== pred.product; });
  const pickO = others[rng ? Math.floor(rng() * others.length) : (LAB_EAS.findIndex((x) => x.reagent === pred.reagent && (x.halide || null) === pred.halide) + 3) % others.length];
  const po = predictEAS(BENZENE, pickO.reagent, pickO.halide || null);
  out.push({ kind: 'otherReagent', correct: false, smiles: [po.product], why: `That is ${nm(po.product)}, the product of ${labLabel(pickO)}. The electrophile in ${labLabel(pickO)} is ${EAS[pickO.reagent].Elabel}; the reagent here supplies ${R.Elabel}, so the group on the ring is different.` });
  const two = canon(`c9(${G})ccc(${G})cc9`);
  out.push({ kind: 'twice', correct: false, smiles: [two], why: 'This ring has TWO new groups. One electrophile replaces just one H, and the question asks for the monosubstituted product. (Which positions a second group would take is Lesson 14.)' });
  return out;
}
export const EAS_HINTS = ['Name the electrophile first (the species written under the arrow of the reagent). The π electrons of the ring attack it and H⁺ leaves, so the ring keeps its aromatic stability.', 'Substitution, not addition: ONE H on the ring is replaced by the electrophile’s group, and everything else on the ring stays. Check that the answer is aromatic and has exactly one new group.'];
