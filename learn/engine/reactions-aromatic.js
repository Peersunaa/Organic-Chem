// Electrophilic aromatic substitution on BENZENE (Lesson 13, McMurry 5.3 to 5.5). Pure data/logic, no DOM, no RDKit at import time.
//   Reagents: Br2/FeBr3, Cl2/FeCl3, I2/oxidant, HNO3/H2SO4, SO3/H2SO4, R-Cl/AlCl3 (Friedel-Crafts alkylation), RCOCl/AlCl3 (Friedel-Crafts acylation).
//   For each: the electrophile and how it is made (a balanced step, catalyst regenerated), the attack of the pi electrons that gives the sigma complex
//   (arenium ion, + shared over three carbons, found by resonance.js), and the loss of H+ that restores the ring. Every step is written as a mechanism-player step
//   whose curved arrows reproduce the next structures (checkMechanism).
//   Reduction of a nitro group to an amine (Fe, Sn or SnCl2 with H3O+, then HO-) gives aniline.
// Not modelled (not in the book at this point): substituent effects on a ring that already has a group (Lesson 14), Hueckel's rule, carbocation rearrangements (alkyl halides
// whose cation could rearrange are refused), polyalkylation.
import { analyze, canon, coords2d, rdkit } from './chem.js';
import { stateOf, enumerate, enumerateState, toSmiles } from './resonance.js';
import { nameBothArene, SUB, arene, findRing, relation } from './naming-arene.js';

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
const WHY_RING = 'The C–H bond pair slides into the ring and makes a new C=C π bond. The ring is aromatic again and the + is gone.';
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
      const ms = cI.atoms[metal].sym;
      arrows = [
        { from: { lp: a }, to: { atom: M[2].heavy[metal] }, why: `A lone pair on a ${R.X} of ${R.X}₂ donates to the empty orbital on ${ms}, forming a new ${ms}–${R.X} bond (a Lewis acid at work).` },
        { from: { bond: [a, b] }, to: { atom: a }, why: `The ${R.X}–${R.X} bond pair moves onto the ${R.X} bonded to ${ms}, so the other ${R.X} leaves as ${R.X}⁺: the electrophile.` }
      ];
      equiv = [{ [a]: b, [b]: a }];
    } else {
      const clI = rI.atoms.findIndex((x) => x.sym === 'Cl');
      const cI2 = rI.atoms[clI].nbrs[0];
      const cl = M[1].heavy[clI], c = M[1].heavy[cI2];
      const ms = cI.atoms[metal].sym;
      arrows = [
        { from: { lp: cl }, to: { atom: M[2].heavy[metal] }, why: `A lone pair on Cl donates to the empty orbital on ${ms}, forming a new ${ms}–Cl bond (${R.catalystLabel} is a Lewis acid).` },
        { from: { bond: [c, cl] }, to: { atom: cl }, why: `The C–Cl bond pair goes onto Cl. Carbon is left with the + charge, and the Cl ends up in ${R.anionLabel}.` }
      ];
      if (R.fc === 'acyl') {
        const o = rI.atoms.findIndex((x, i) => x.sym === 'O' && x.nbrs.includes(cI2));
        arrows.push({ from: { lp: M[1].heavy[o] }, to: { bond: [c, M[1].heavy[o]] }, why: 'A lone pair on O slides into the C–O bond and makes it a triple bond. This gives the acylium ion, a stable electrophile.' });
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
    const eSym = eI.atoms[eAtom].sym;
    const arrows = [{ from: { bond: [ring[0], ring[1]] }, to: { bond: [ring[0], eS] }, why: `A π pair of the ring attacks the electrophile ${R.Elabel} and forms a new C–${eSym} bond. The ring now carries a + charge.` }];
    const extraSwap = [];
    if (reagent === 'HNO3') {
      const os = eI.atoms.filter((a) => a.sym === 'O').map((a) => M[1].heavy[a.idx]);
      arrows.push({ from: { bond: [eS, os[0]] }, to: { atom: os[0] }, why: 'One N=O π pair moves onto O, so N keeps only four bonds (an octet) and that oxygen becomes O⁻.' });
      extraSwap.push({ [os[0]]: os[1], [os[1]]: os[0] });
    } else if (R.kind === 'FC' && R.fc === 'acyl') {
      const o = eI.atoms.find((a) => a.sym === 'O');
      arrows.push({ from: { bond: [eS, M[1].heavy[o.idx]] }, to: { atom: M[1].heavy[o.idx] }, why: 'One C≡O π pair moves onto O, so carbon keeps only four bonds. The C≡O becomes C=O and O loses its +.' });
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
      const hs = bI.atoms[hal[0]].sym, ms = bI.atoms[metal].sym;
      arrows.push(
        { from: { lp: x }, to: { atom: Hs }, why: `A lone pair on a ${hs} of ${R.anionLabel} takes the H⁺ from the sp³ carbon and forms a new H–${hs} bond.` },
        { from: { bond: [M[0].heavy[ipsoIdx], Hs] }, to: { bond: [M[0].heavy[ipsoIdx], M[0].heavy[plus]] }, why: WHY_RING },
        { from: { bond: [m, x] }, to: { atom: x }, why: `The ${ms}–${hs} bond pair goes back onto ${hs}. That frees ${R.catalystLabel} (the catalyst returns) and H–${hs} leaves.` }
      );
      equiv = hal.slice(1).map((j) => ({ [x]: M[1].heavy[j], [M[1].heavy[j]]: x }));
    } else if (reagent === 'I2') {
      const o = M[1].heavy[0];
      arrows.push(
        { from: { lp: o }, to: { atom: Hs }, why: "A lone pair on water's oxygen takes the H⁺ from the sp³ carbon and forms a new O–H bond." },
        { from: { bond: [M[0].heavy[ipsoIdx], Hs] }, to: { bond: [M[0].heavy[ipsoIdx], M[0].heavy[plus]] }, why: WHY_RING }
      );
    } else {
      // HSO4-: the O- takes H+
      const oNeg = bI.atoms.findIndex((a) => a.sym === 'O' && a.fc === -1);
      arrows.push(
        { from: { lp: M[1].heavy[oNeg] }, to: { atom: Hs }, why: `A lone pair on the negative oxygen of ${R.anionLabel} takes the H⁺ from the sp³ carbon and forms a new O–H bond.` },
        { from: { bond: [M[0].heavy[ipsoIdx], Hs] }, to: { bond: [M[0].heavy[ipsoIdx], M[0].heavy[plus]] }, why: WHY_RING }
      );
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
  // keep the reagent and the full prediction, so the player can offer what-if alternatives (engine/whatif.js)
  return { reactants, products, steps, reagent: mech.reagent, halide: mech.halide, pred: mech.pred };
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

// =====================================================================================================================================================================
// Lesson 14 (McMurry 5.6 to 5.10): substituent effects, side chains, other aromatic compounds, synthesis order.
// Additive: predictEAS above is unchanged (a ring with a group is still refused there with 'notBenzene'); predictSubst below handles rings with ONE or TWO groups.
//   * DIRECTORS: the table of groups, classified by SMARTS (data, with the reason for each) into the three bins of the book's Figure 5.6
//     (activator o/p, deactivator o/p = the halogens, deactivator m). There is no meta-directing activator in the table, and a test proves it.
//   * ringGroups(smiles): finds the benzene ring and the group on each ring carbon by running those SMARTS.
//   * predictSubst(arene, reagent, halide): one group -> ortho + para (o/p directors) or meta; two groups -> only the book's simple cases (the directors cooperate, or the
//     stronger activator wins); everything else is refused with a reason. Friedel-Crafts is refused on strongly deactivated rings and on amines.
//   * sigmaAttack(arene, position): the carbocation for attack at one ring position, its ring resonance forms, and whether one of them puts the + on the carbon that carries the
//     group (possible only for ortho and para attack: tools/check_directors.py proves it with RDKit's ResonanceMolSupplier).
//   * oxidizeSideChain (KMnO4: any alkyl group with a benzylic H -> CO2H; tert-butyl is untouched) and hydrogenate (alkene outside the ring only, or the ring too at high pressure).
// Not modelled (not in the book): rings with three or more groups, steric effects beyond "no attack between two groups", the meta product that forms in small amounts, kinetic
// versus thermodynamic control of sulfonation, polysubstitution, Friedel-Crafts on rings with O-H or N-H groups, nitration and sulfonation of free amines (the N is protonated).

export const BINS = {
  actOP: { id: 'actOP', label: 'Activator, ortho/para director', short: 'activating, ortho/para' },
  deactOP: { id: 'deactOP', label: 'Deactivator, ortho/para director', short: 'deactivating, ortho/para' },
  deactM: { id: 'deactM', label: 'Deactivator, meta director', short: 'deactivating, meta' }
};
const LP_WHY = (a, nm) => `The ${a} has a lone pair it can share with the ring (a resonance effect). That makes the ring richer in electrons, so it reacts faster than benzene. In ortho or para attack one form of the carbocation puts the + on the ${a} itself, where every atom keeps an octet: an extra, very stable form that meta attack cannot have.`;
const DELTA_WHY = (atom, nm) => `The ${atom} of ${nm} carries a partial positive charge (δ+) and is bonded straight to the ring, so it pulls electrons out of the ring and deactivates it. In ortho or para attack one form of the carbocation puts the + on the ring carbon that holds this group, next to the δ+ atom: two positive charges side by side, very unfavourable. Meta attack never does that, so meta wins.`;
/** key = group id; smarts: ring carbon first, then the atom bonded to it; els/pi: elements allowed in the group and the number of double/triple bonds inside it. */
export const DIRECTORS = {
  NH2: { id: 'NH2', label: '–NH₂', name: 'amino', cls: 'actOP', level: 3, smarts: 'c-[NX3;H2]', els: 'N', pi: 0, ex: 'Nc1ccccc1', donor: 'N', why: LP_WHY('N') },
  NHR: { id: 'NHR', label: '–NHR', name: 'alkylamino', cls: 'actOP', level: 3, smarts: 'c-[NX3;H1;!$(N[C,S]=[O,S])]-[CX4]', els: 'NC', pi: 0, ex: 'CNc1ccccc1', donor: 'N', why: LP_WHY('N') },
  NR2: { id: 'NR2', label: '–NR₂', name: 'dialkylamino', cls: 'actOP', level: 3, smarts: 'c-[NX3;H0;!$(N[C,S]=[O,S])](-[CX4])-[CX4]', els: 'NC', pi: 0, ex: 'CN(C)c1ccccc1', donor: 'N', why: LP_WHY('N') },
  OH: { id: 'OH', label: '–OH', name: 'hydroxyl', cls: 'actOP', level: 3, smarts: 'c-[OX2;H1]', els: 'O', pi: 0, ex: 'Oc1ccccc1', donor: 'O', why: LP_WHY('O') },
  OR: { id: 'OR', label: '–OR', name: 'alkoxy', cls: 'actOP', level: 3, smarts: 'c-[OX2;H0]-[CX4]', els: 'OC', pi: 0, ex: 'COc1ccccc1', donor: 'O', why: LP_WHY('O') },
  NHCOR: { id: 'NHCOR', label: '–NHCOR', name: 'acylamino', cls: 'actOP', level: 2, smarts: 'c-[NX3;H1]-[CX3](=O)-[#6]', els: 'NCO', pi: 1, ex: 'CC(=O)Nc1ccccc1', donor: 'N', why: 'The N lone pair is shared with the ring, so the ring is activated and the attack is ortho/para (one form of the carbocation puts the + on N). The C=O next to the N also pulls on that lone pair, so this is a weaker activator than –NH₂.' },
  alkyl: { id: 'alkyl', label: '–R (alkyl)', name: 'alkyl', cls: 'actOP', level: 1, smarts: 'c-[CX4;!$(C~[!#6;!#1])]', els: 'C', pi: 0, ex: 'Cc1ccccc1', donor: null, why: 'An alkyl group pushes electron density toward the ring through the σ bond (an inductive effect), so the ring reacts faster than benzene. In ortho or para attack the + ends up on the carbon that carries the alkyl group, and that donation stabilises it. Meta attack never puts the + there.' },
  phenyl: { id: 'phenyl', label: '–C₆H₅', name: 'phenyl', cls: 'actOP', level: 1, smarts: 'c-!@c1ccccc1', els: 'C', pi: 3, ex: 'c1ccc(cc1)-c1ccccc1', donor: null, why: 'A phenyl group can share the + charge with its own ring. In ortho or para attack the + sits next to the phenyl ring and spreads onto it (extra resonance forms), which meta attack cannot do. It activates the ring and directs ortho/para.' },
  F: { id: 'F', label: '–F', name: 'fluoro', cls: 'deactOP', level: 0, smarts: 'c-[F]', els: 'F', pi: 0, ex: 'Fc1ccccc1', donor: 'F', why: 'A halogen is more electronegative than carbon, so it withdraws electrons through the σ bond and deactivates the ring. Its lone pairs can still donate by resonance: in ortho or para attack one form puts the + on the halogen. The result is a slower reaction that is still ortho/para.' },
  Cl: { id: 'Cl', label: '–Cl', name: 'chloro', cls: 'deactOP', level: 0, smarts: 'c-[Cl]', els: 'Cl', pi: 0, ex: 'Clc1ccccc1', donor: 'Cl', why: 'A halogen is more electronegative than carbon, so it withdraws electrons through the σ bond and deactivates the ring (chlorobenzene reacts about 30 times slower than benzene). Its lone pairs can still donate by resonance: in ortho or para attack one form puts the + on the halogen. A slower reaction that is still ortho/para.' },
  Br: { id: 'Br', label: '–Br', name: 'bromo', cls: 'deactOP', level: 0, smarts: 'c-[Br]', els: 'Br', pi: 0, ex: 'Brc1ccccc1', donor: 'Br', why: 'A halogen is more electronegative than carbon, so it withdraws electrons through the σ bond and deactivates the ring. Its lone pairs can still donate by resonance: in ortho or para attack one form puts the + on the halogen. A slower reaction that is still ortho/para.' },
  I: { id: 'I', label: '–I', name: 'iodo', cls: 'deactOP', level: 0, smarts: 'c-[I]', els: 'I', pi: 0, ex: 'Ic1ccccc1', donor: 'I', why: 'A halogen withdraws electrons through the σ bond and deactivates the ring, but its lone pairs can donate by resonance in ortho or para attack (one form puts the + on the halogen). A slower reaction that is still ortho/para.' },
  NO2: { id: 'NO2', label: '–NO₂', name: 'nitro', cls: 'deactM', level: -1, smarts: 'c-[N+](=O)[O-]', els: 'NO', pi: 1, ex: 'O=[N+]([O-])c1ccccc1', donor: null, why: DELTA_WHY('N', 'the nitro group') },
  CN: { id: 'CN', label: '–C≡N', name: 'cyano', cls: 'deactM', level: -1, smarts: 'c-C#N', els: 'CN', pi: 1, ex: 'N#Cc1ccccc1', donor: null, why: DELTA_WHY('C', 'the cyano group') },
  SO3H: { id: 'SO3H', label: '–SO₃H', name: 'sulfonic acid', cls: 'deactM', level: -1, smarts: 'c-S(=O)(=O)[OX2;H1]', els: 'SO', pi: 2, ex: 'OS(=O)(=O)c1ccccc1', donor: null, why: DELTA_WHY('S', 'the sulfonic acid group') },
  CHO: { id: 'CHO', label: '–CHO', name: 'aldehyde', cls: 'deactM', level: -1, smarts: 'c-[CX3;H1]=O', els: 'CO', pi: 1, ex: 'O=Cc1ccccc1', donor: null, why: DELTA_WHY('C', 'the carbonyl group') },
  COR: { id: 'COR', label: '–COR', name: 'acyl (ketone)', cls: 'deactM', level: -1, smarts: 'c-[CX3;H0](=O)-[CX4]', els: 'CO', pi: 1, ex: 'CC(=O)c1ccccc1', donor: null, why: DELTA_WHY('C', 'the carbonyl group') },
  COOH: { id: 'COOH', label: '–CO₂H', name: 'carboxylic acid', cls: 'deactM', level: -1, smarts: 'c-[CX3](=O)[OX2;H1]', els: 'CO', pi: 1, ex: 'OC(=O)c1ccccc1', donor: null, why: DELTA_WHY('C', 'the carbonyl group') },
  COOR: { id: 'COOR', label: '–CO₂R', name: 'ester', cls: 'deactM', level: -1, smarts: 'c-[CX3](=O)-[OX2;H0]-[CX4]', els: 'CO', pi: 1, ex: 'COC(=O)c1ccccc1', donor: null, why: DELTA_WHY('C', 'the carbonyl group') },
  NR3: { id: 'NR3', label: '–NR₃⁺', name: 'trialkylammonium', cls: 'deactM', level: -1, smarts: 'c-[NX4+]', els: 'NC', pi: 0, ex: 'C[N+](C)(C)c1ccccc1', donor: null, why: 'The N carries a full positive charge and is bonded straight to the ring, so it pulls electrons out very strongly (it deactivates). In ortho or para attack one form puts the + on the ring carbon next to that N+: two positive charges side by side. Meta attack avoids it.' }
};
export const DIRECTOR_IDS = Object.keys(DIRECTORS);
export const STRONG_DEACT = ['NO2', 'CN', 'SO3H', 'CHO', 'COR', 'COOH', 'COOR', 'NR3'];
export const AMINES = ['NH2', 'NHR', 'NR2'];
export const dirClass = (id) => DIRECTORS[id].cls;
export const dirDirects = (id) => (DIRECTORS[id].cls === 'deactM' ? 'm' : 'op');
// ---------------------------------------------------------------- finding the groups on a ring (SMARTS)
const qcache14 = {};
const qm14 = (id) => { if (!qcache14[id]) { qcache14[id] = rdkit().get_qmol(DIRECTORS[id].smarts); if (!qcache14[id]) throw new Error('bad SMARTS for ' + id); } return qcache14[id]; };
/** All (ring atom, attached atom) pairs matching each group SMARTS in a molecule: {id: [[c, x], ...]}. */
function smartsHits(smiles) {
  const m = rdkit().get_mol(smiles);
  if (!m) return null;
  try {
    const out = {};
    for (const id of DIRECTOR_IDS) { const j = JSON.parse(m.get_substruct_matches(qm14(id))); out[id] = (Array.isArray(j) ? j : []).map((r) => [r.atoms[0], r.atoms[1]]); }
    return out;
  } finally { m.delete(); }
}
const refuseRG = (code, why) => ({ ok: false, code, why });
/**
 * {ok:true, info, ring:[6 atom indices in ring order], subs:[{pos, atom, id, comp:[atoms of the group]}]} for ONE benzene ring plus recognised groups, or {ok:false, code, why}.
 * Ring positions are the same numbers naming-arene.js uses for the same SMILES. A group is recognised only if a SMARTS of the table matches AND the group has exactly the
 * elements and number of multiple bonds the table lists (so -OCH=CH2 is not "-OR", -CH2Cl is not "alkyl").
 */
export function ringGroups(smiles) {
  let info = null;
  try { info = analyze(smiles); } catch (e) { info = null; }
  if (!info) return refuseRG('parse', 'That structure cannot be read.');
  const ring = findRing(info);
  if (!ring) return refuseRG('noRing', 'There is no benzene ring in this molecule.');
  const ringSet = new Set(ring);
  const hits = smartsHits(smiles);
  const taken = new Set(ring);
  const subs = [];
  for (let p = 0; p < 6; p++) {
    const extra = info.atoms[ring[p]].nbrs.filter((k) => !ringSet.has(k));
    if (extra.length > 1) return refuseRG('fused', 'A ring carbon with two outside bonds (a fused or bridged ring) is outside this lesson.');
    if (!extra.length) continue;
    const att = extra[0];
    const comp = new Set([att]); const q = [att];
    while (q.length) { const v = q.pop(); for (const w of info.atoms[v].nbrs) if (!ringSet.has(w) && !comp.has(w)) { comp.add(w); q.push(w); } }
    if ([...comp].some((v) => taken.has(v))) return refuseRG('fused', 'The groups are joined to each other (a fused ring): outside this lesson.');
    comp.forEach((v) => taken.add(v));
    const els = new Set([...comp].map((v) => info.atoms[v].sym));
    let pi = 0;
    info.bonds.forEach((b) => { if (comp.has(b.atoms[0]) && comp.has(b.atoms[1]) && (b.bo ?? 1) >= 2) pi++; });
    const good = DIRECTOR_IDS.filter((id) => hits[id].some(([c, x]) => c === ring[p] && x === att) && DIRECTORS[id].pi === pi && [...els].every((e) => DIRECTORS[id].els.includes(e) || (id === 'alkyl' && e === 'C')));
    // elements: the table writes them as letters of symbols, so check by symbol list
    const exact = good.filter((id) => [...els].every((e) => elementsOf(DIRECTORS[id].els).includes(e)));
    if (exact.length !== 1) return refuseRG('unknownGroup', 'This ring carries a group that is not in the substituent table of this lesson (the groups of Figure 5.6).');
    subs.push({ pos: p, atom: att, id: exact[0], comp: [...comp], text: groupText(info, exact[0], att, comp.size) });
  }
  if (taken.size !== info.atoms.length) return refuseRG('fragments', 'Only one molecule at a time, please.');
  return { ok: true, info, ring, subs };
}
/** How a group is written in a sentence: the table label, except alkyl groups, which are written out (–CH₃, –CH₂CH₃ ...). */
function groupText(info, id, att, size) {
  if (id !== 'alkyl') return DIRECTORS[id].label;
  const cn = info.atoms[att].nbrs.filter((k) => info.atoms[k].sym === 'C').length;      // includes the ring carbon
  if (size === 1) return '–CH₃';
  if (size === 2) return '–CH₂CH₃';
  if (size === 3) return cn === 2 ? '–CH₂CH₂CH₃' : '–CH(CH₃)₂';
  if (size === 4 && cn === 4) return '–C(CH₃)₃';
  return '–R (alkyl)';
}
function elementsOf(letters) { return letters.match(/Cl|Br|[A-Z][a-z]?/g) || []; }

// ---------------------------------------------------------------- graph edits on a ring (states keep the atom numbers of the SMILES)
/** Attach the group (SMILES, first atom bonds to the ring) to ring atom `at` of state `st`; `replaceH` removes the ring H (substitution); the sigma complex keeps it. */
function addGroup(st, at, groupSmi, replaceH = true) {
  const g = stateOf(groupSmi);
  const gi = analyze(groupSmi);
  const off = st.el.length;
  const impG = g.impH.slice();
  if (Number.isInteger(gi.atoms[0].lp) && impG[0] > 0) impG[0] -= 1;       // a full-valence first atom (HBr, NH3, CH4 ...) gives up one H to make the bond
  const out = { el: st.el.concat(g.el), impH: st.impH.concat(impG), charge: st.charge.concat(g.charge), bonds: st.bonds.map((b) => ({ ...b })).concat(g.bonds.map((b) => ({ a: b.a + off, b: b.b + off, order: b.order }))) };
  out.bonds.push({ a: at, b: off, order: 1 });
  if (replaceH) out.impH[at] -= 1;
  return out;
}
/** Remove atoms (a set of indices) from a state and renumber; returns {st, map(oldIndex) -> newIndex}. */
function dropAtoms(st, drop) {
  const keep = st.el.map((_, i) => i).filter((i) => !drop.has(i));
  const idx = new Map(keep.map((o, k) => [o, k]));
  return { st: { el: keep.map((o) => st.el[o]), impH: keep.map((o) => st.impH[o]), charge: keep.map((o) => st.charge[o]), bonds: st.bonds.filter((b) => !drop.has(b.a) && !drop.has(b.b)).map((b) => ({ a: idx.get(b.a), b: idx.get(b.b), order: b.order })) }, idx };
}
const smilesOfState = (st) => canon(toSmiles(st));

// ---------------------------------------------------------------- prediction on a ring that already has a group
const OPS = ['ortho', 'para'];
function fcSetup(R, halide) {
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
  return { ok: true, G: groupSmiles(halide), E: cationOf(halide, R.fc), halide };
}
/** Positions of the ring that group `s` points the new group to (open positions only). */
function pointsTo(s, open) {
  const want = dirDirects(s.id) === 'm' ? ['meta'] : OPS;
  return open.filter((q) => want.includes(relation(s.pos, q)));
}
const subText = (s) => s.text || DIRECTORS[s.id].label;
const joinLabels = (subs) => subs.map(subText).join(' and ');
/**
 * predictSubst(arene, reagent, halide): the product(s) of an electrophilic substitution on a ring with ONE or TWO groups.
 * ok:true -> {products:[canonical smiles, sorted], product, positions:[ring positions attacked], rels (one group: ['ortho','para'] or ['meta']), outcome:
 *   'op' | 'm' (one group), 'cooperate' | 'wins' (two groups), winner?, subs:[{pos,id}], names, why, E, Elabel, group, reagent, halide, mixture:bool}
 * ok:false -> {code, why}: 'deactivated', 'amine', 'amineAcid', 'notModelled' (Friedel-Crafts on O-H / N-H), 'arylHalide', 'vinylicHalide', 'rearranges', 'nohalide',
 *   'compete' (two groups of about equal strength that point to different places), 'crowded' (only a place between the two groups is left), 'tooMany', 'unknownGroup' ...
 */
export function predictSubst(areneSmiles, reagent, halide = null) {
  const R = EAS[reagent];
  if (!R) return refuse('unknown', 'Unknown reagent.');
  const can = canon(areneSmiles);
  if (!can) return refuse('unknown', 'That structure cannot be read.');
  if (can === BENZENE) return { ...predictEAS(areneSmiles, reagent, halide), outcome: 'none' };
  const P = ringGroups(areneSmiles);
  if (!P.ok) return refuse(P.code, P.why);
  const subs = P.subs;
  if (subs.length > 2) return refuse('tooMany', 'This ring has three or more groups. The book’s examples stop at two, and with three the directing effects have to be weighed case by case, so it is not modelled.');
  const ids = subs.map((s) => s.id);
  const isFC = R.kind === 'FC';
  let G = R.group, E = R.E, extra = {};
  if (isFC) {
    const bad = ids.find((id) => STRONG_DEACT.includes(id));
    if (bad) return refuse('deactivated', `Friedel–Crafts reactions do not work on a ring that already carries a ${DIRECTORS[bad].name} group (${DIRECTORS[bad].label}): the ring is much less reactive than benzene, so AlCl₃ and the carbocation get nowhere. (The book lists –NO₂, –C≡N, –SO₃H and –COR; –CHO, –CO₂H and –CO₂R are the same kind of group.)`);
    if (ids.some((id) => AMINES.includes(id))) return refuse('amine', 'Friedel–Crafts reactions fail on aromatic amines such as aniline: the lone pair on N bonds to AlCl₃, which puts a positive charge on N, and that makes the ring strongly deactivated.');
    if (ids.some((id) => id === 'OH' || id === 'NHCOR')) return refuse('notModelled', 'An O–H or N–H group also binds the AlCl₃, which complicates Friedel–Crafts reactions. That case is not in the book at this point, so it is not modelled.');
    const fc = fcSetup(R, halide);
    if (!fc.ok) return fc;
    G = fc.G; E = fc.E; extra = { halide };
  }
  if ((reagent === 'HNO3' || reagent === 'SO3') && ids.some((id) => AMINES.includes(id))) return refuse('amineAcid', 'In the strong acid (H₂SO₄) used for nitration and sulfonation the amine N is protonated to –NH₃⁺, a different group (a meta director). The book does not treat that, so this combination is not modelled.');
  const open = [0, 1, 2, 3, 4, 5].filter((q) => !subs.some((s) => s.pos === q));
  let cands, outcome, winner = null, why;
  if (subs.length === 1) {
    cands = pointsTo(subs[0], open);
    outcome = dirDirects(subs[0].id) === 'm' ? 'm' : 'op';
    why = DIRECTORS[subs[0].id].why;
  } else {
    const [a, b] = subs;
    const A = pointsTo(a, open), B = pointsTo(b, open);
    const sandwiched = (q) => relation(a.pos, q) === 'ortho' && relation(b.pos, q) === 'ortho';
    const both = A.filter((q) => B.includes(q));
    if (both.length) {
      cands = both.filter((q) => !sandwiched(q));
      if (!cands.length) return refuse('crowded', 'The only position both groups agree on lies between them, and a position squeezed between two groups is too crowded for the new group.');
      outcome = 'cooperate';
      why = `The two groups (${joinLabels(subs)}) point to the same position(s), so there is no conflict.`;
    } else {
      const la = DIRECTORS[a.id].level, lb = DIRECTORS[b.id].level;
      const w = la > lb ? a : lb > la ? b : null;
      if (!w && a.id === b.id && A.length && B.length) {
        // two groups of the same kind pointing to different places: fine when every one of those places gives the same compound (p-xylene)
        const union = [...new Set([...A, ...B])].filter((q) => !sandwiched(q));
        const st1 = stateOf(areneSmiles);
        const prods = [...new Set(union.map((q) => smilesOfState(addGroup(st1, P.ring[q], G, true))))];
        if (prods.length === 1) { cands = union; outcome = 'equal'; why = `The two groups (${joinLabels(subs)}) are alike, and every place they point to gives the same compound.`; }
      }
      if (!outcome && (!w || DIRECTORS[w.id].level < 1)) return refuse('compete', `The two groups (${joinLabels(subs)}) point to different positions and neither is a clearly stronger activator, so the result would be a mixture that the book’s rules cannot sort out. Not modelled.`);
      if (!outcome) {
        winner = w;
        cands = pointsTo(w, open).filter((q) => !sandwiched(q));
        if (!cands.length) return refuse('crowded', 'The only position the stronger activator points to lies between the two groups, which is too crowded.');
        outcome = 'wins';
        why = `The two groups point to different positions. The more powerful activator decides: ${subText(w)} controls the orientation.`;
      }
    }
  }
  const st0 = stateOf(areneSmiles);
  const byPos = {};
  const products = [];
  cands.forEach((q) => {
    const p = smilesOfState(addGroup(st0, P.ring[q], G, true));
    byPos[q] = p;
    if (!products.includes(p)) products.push(p);
  });
  products.sort();
  const rels = subs.length === 1 ? [...new Set(cands.map((q) => relation(subs[0].pos, q)))].sort((x, y) => (x === 'ortho' ? -1 : y === 'ortho' ? 1 : x < y ? -1 : 1)) : null;
  return {
    ok: true, reagent, halide: halide || null, R, arene: can, subs: subs.map((s) => ({ pos: s.pos, id: s.id, text: s.text })), ring: P.ring,
    outcome, winner: winner ? { pos: winner.pos, id: winner.id } : null, positions: cands, rels, byPos,
    products, product: products[0], mixture: products.length > 1, names: products.map((p) => nameBothArene(p)), why,
    group: G, E, Elabel: R.Elabel, ...extra
  };
}

// ---------------------------------------------------------------- the carbocation for attack at one ring position, and its ring resonance forms
function sigmaRingOf(st) { return sigmaRing(st); }
/**
 * Attack of an electrophile (written Br, as a stand-in) at ring position q of a ring with one group (or two). Returns
 *   {ok, q, rel (to the first group), sigma (SMILES), forms:[{smiles, plus (ring position of the +), special (the + sits on a ring carbon that carries a group)}],
 *    hasSpecial, donor (SMILES of the form with the + on the group's own lone-pair atom, or null)}.
 * The forms are the ones that move only ring electrons (the group's own resonance, e.g. the two drawings of NO2, is left out).
 */
export function sigmaAttack(areneSmiles, q, reagent = 'Br2') {
  const P = ringGroups(areneSmiles);
  if (!P.ok) return { ok: false, code: P.code, why: P.why };
  if (P.subs.some((s) => s.pos === q)) return { ok: false, code: 'occupied', why: 'That ring carbon already carries a group.' };
  const R = EAS[reagent];
  const G = R && R.kind !== 'FC' ? R.group : 'Br';
  const st = stateOf(areneSmiles);
  const at = P.ring[q];
  const nb = [P.ring[(q + 1) % 6], P.ring[(q + 5) % 6]];
  const partner = nb.find((m) => st.bonds.some((b) => b.order === 2 && ((b.a === at && b.b === m) || (b.b === at && b.a === m))));
  const bond = st.bonds.find((b) => (b.a === at && b.b === partner) || (b.b === at && b.a === partner));
  const s2 = { el: st.el, impH: st.impH.slice(), charge: st.charge.slice(), bonds: st.bonds.map((b) => ({ ...b })) };
  s2.bonds.find((b) => (b.a === at && b.b === partner) || (b.b === at && b.a === partner)).order = 1;
  s2.charge[partner] = 1;
  void bond;
  const sig = addGroup(s2, at, G, false);
  const all = enumerateState(sig);
  const ring = new Set(sigmaRing(sig));
  const q0 = sig.charge;
  const ringOnly = all.filter((f) => f.state.charge.every((c, i) => ring.has(i) || c === q0[i]) && f.state.bonds.every((b) => {
    if (ring.has(b.a) && ring.has(b.b)) return true;
    const o = sig.bonds.find((x) => (x.a === b.a && x.b === b.b) || (x.a === b.b && x.b === b.a));
    return o && o.order === b.order;
  }));
  const groupAtoms = new Set(P.subs.flatMap((s) => s.comp));
  const forms = ringOnly.map((f) => {
    const plusAt = [...ring].find((i) => f.state.charge[i] === 1);
    const special = f.state.bonds.some((b) => (b.a === plusAt && !ring.has(b.b) && groupAtoms.has(b.b)) || (b.b === plusAt && !ring.has(b.a) && groupAtoms.has(b.a)));
    return { smiles: toSmiles(f.state), plus: P.ring.indexOf(plusAt), special };
  });
  // the form with the + on the group's own lone-pair atom (N, O or a halogen): made from the form that has the + on the carbon bearing the group
  let donor = null;
  for (const f of ringOnly) {
    const plusAt = [...ring].find((i) => f.state.charge[i] === 1);
    const d = f.state.bonds.map((b) => (b.a === plusAt ? b.b : b.b === plusAt ? b.a : -1)).find((k) => k >= 0 && !ring.has(k) && groupAtoms.has(k) && ['N', 'O', 'F', 'Cl', 'Br', 'I'].includes(f.state.el[k]) && f.state.charge[k] === 0);
    if (d == null) continue;
    const nd = { el: f.state.el, impH: f.state.impH, charge: f.state.charge.slice(), bonds: f.state.bonds.map((b) => ({ ...b })) };
    nd.bonds.find((b) => (b.a === plusAt && b.b === d) || (b.b === plusAt && b.a === d)).order = 2;
    nd.charge[plusAt] = 0; nd.charge[d] = 1;
    if (!canon(toSmiles(nd))) continue;
    donor = toSmiles(nd);
    break;
  }
  return {
    ok: true, q, rel: P.subs.length ? relation(P.subs[0].pos, q) : null, sigma: toSmiles(sig), forms, hasSpecial: forms.some((f) => f.special),
    donor, subs: P.subs.map((s) => ({ pos: s.pos, id: s.id }))
  };
}
/** The three attacks (ortho, meta, para) on a ring with ONE group, as sigmaAttack results keyed by relation. */
export function attackSet(areneSmiles, reagent = 'Br2') {
  const P = ringGroups(areneSmiles);
  if (!P.ok || P.subs.length !== 1) return null;
  const out = {};
  for (const rel of ['ortho', 'meta', 'para']) {
    const q = [0, 1, 2, 3, 4, 5].find((x) => relation(P.subs[0].pos, x) === rel);
    out[rel] = sigmaAttack(areneSmiles, q, reagent);
  }
  return out;
}

// ---------------------------------------------------------------- side chains: KMnO4 oxidation and hydrogenation (McMurry 5.8)
export const KMNO4 = { id: 'KMnO4', label: 'KMnO₄, H₂O' };
const OXIDISE_OK = ['alkyl', 'F', 'Cl', 'Br', 'I', 'NO2', 'COOH'];
/**
 * KMnO4 turns every alkyl group that has an H on the benzylic carbon into -CO2H, whatever the length of the chain; the ring itself is not attacked, and a group with no
 * benzylic H (tert-butyl) is not changed. Returns {ok:true, reacts, product, groups:[{pos, id, oxidised, benzylicH}]} or a refusal.
 */
export function oxidizeSideChain(smiles) {
  const can = canon(smiles);
  if (!can) return refuse('parse', 'That structure cannot be read.');
  const P = ringGroups(smiles);
  if (!P.ok) return refuse(P.code, P.why);
  const bad = P.subs.find((s) => !OXIDISE_OK.includes(s.id));
  if (bad) return refuse('notModelled', `A ring that carries ${DIRECTORS[bad.id].label} is not modelled here: such groups can be attacked by KMnO₄ too, and the book’s examples have only alkyl groups, halogens and similar.`);
  const info = P.info;
  const groups = P.subs.map((s) => ({ pos: s.pos, id: s.id, atom: s.atom, comp: s.comp, benzylicH: s.id === 'alkyl' ? info.atoms[s.atom].impH : 0, oxidised: s.id === 'alkyl' && info.atoms[s.atom].impH > 0 }));
  const ox = groups.filter((g) => g.oxidised);
  if (!ox.length) return { ok: true, reacts: false, product: can, groups, why: groups.some((g) => g.id === 'alkyl') ? 'There is no H on the carbon next to the ring (the benzylic carbon), so KMnO₄ cannot start the oxidation and nothing happens.' : 'The ring itself is not attacked by KMnO₄ (benzene resists strong oxidants), and there is no alkyl group to oxidise.' };
  const drop = new Set(ox.flatMap((g) => g.comp));
  const st = stateOf(smiles);
  const { st: s2, idx } = dropAtoms(st, drop);
  let cur = s2;
  ox.forEach((g) => { cur = addGroup(cur, idx.get(P.ring[g.pos]), 'C(=O)O', false); });
  return { ok: true, reacts: true, product: smilesOfState(cur), groups, why: 'KMnO₄ attacks the C–H bonds on the benzylic carbon (the carbon bonded to the ring) and carries the oxidation to a carboxylic acid, however long the chain is; the rest of the chain is lost.' };
}

export const HYDROGENATION = {
  H2_Pd: { id: 'H2_Pd', label: 'H₂, Pd/C (1 atm)', ring: false },
  H2_Pt_high: { id: 'H2_Pt_high', label: 'H₂, Pt, high pressure', ring: true }
};
/**
 * Hydrogenation of a hydrocarbon with a benzene ring. Pd/C at ordinary pressure adds H2 to C=C and C≡C bonds outside the ring and leaves the ring alone; the ring needs
 * high pressure and temperature (Pt, or Rh). o-Xylene gives the cis product (book example); other rings with two or more groups are refused (cis/trans mixtures).
 */
export function hydrogenate(smiles, cond) {
  const C = HYDROGENATION[cond];
  if (!C) return refuse('unknown', 'Unknown conditions.');
  const can = canon(smiles);
  const info = can && analyze(smiles);
  if (!info) return refuse('parse', 'That structure cannot be read.');
  if (!info.atoms.every((a) => a.sym === 'C')) return refuse('notHydrocarbon', 'Only hydrocarbons are modelled: other groups (NO₂, C=O, halogens ...) have their own hydrogenation chemistry.');
  const ring = findRing(info);
  if (!ring) return refuse('noRing', 'There is no benzene ring here.');
  if (info.bonds.length - info.atoms.length + 1 !== 1) return refuse('rings', 'Only one ring at a time.');
  const ringSet = new Set(ring);
  const inRing = (b) => ringSet.has(b.atoms[0]) && ringSet.has(b.atoms[1]);
  const side = info.bonds.filter((b) => !inRing(b) && (b.bo ?? 1) >= 2);
  const st = stateOf(smiles);
  const nSub = ring.filter((r) => info.atoms[r].nbrs.some((k) => !ringSet.has(k))).length;
  const out = { el: st.el, impH: st.impH.slice(), charge: st.charge.slice(), bonds: st.bonds.map((b) => ({ ...b })) };
  const gone = [];
  if (!side.length && !C.ring) return { ok: true, reacts: false, product: can, ringReduced: false, sideReduced: false, why: 'Under these mild conditions the benzene ring is not reduced (it is far less reactive than an ordinary C=C), and there is no other multiple bond.' };
  side.forEach((b) => {
    const k = out.bonds.find((x) => (x.a === b.atoms[0] && x.b === b.atoms[1]) || (x.a === b.atoms[1] && x.b === b.atoms[0]));
    const add = k.order - 1; k.order = 1; out.impH[b.atoms[0]] += add; out.impH[b.atoms[1]] += add; gone.push(add);
  });
  if (C.ring) {
    if (nSub >= 2) {
      if (can === canon('Cc1ccccc1C')) return { ok: true, reacts: true, product: canon('C[C@H]1CCCC[C@H]1C'), ringReduced: true, sideReduced: false, stereo: 'cis', why: 'H₂ with a Pt catalyst at high pressure reduces the ring; both new H atoms on each face of the ring come from the catalyst surface, so o-xylene gives cis-1,2-dimethylcyclohexane.' };
      return refuse('stereo', 'A ring with two or more groups can give cis and trans products, and the book shows only o-xylene. Not modelled.');
    }
    ring.forEach((r) => { out.impH[r] += 1; });
    out.bonds.forEach((b) => { if (ringSet.has(b.a) && ringSet.has(b.b)) b.order = 1; });
  }
  const product = canon(toSmiles(out));
  return { ok: true, reacts: true, product, ringReduced: !!C.ring, sideReduced: side.length > 0, why: C.ring ? 'The ring is reduced only with a Pt (or Rh) catalyst under high pressure and temperature; it takes far more forcing conditions than an alkene.' : 'The C=C outside the ring is hydrogenated by H₂ and Pd/C at ordinary pressure; the benzene ring is not touched under these mild conditions.' };
}

// ---------------------------------------------------------------- reaction-lab (substituted arenes) and the generator: answers, explanations
/** The substituted rings of the Lesson 14 lab and generator (monosubstituted, every group has a name in naming-arene.js). */
export const LAB_SUBST = {
  arenes: [
    { id: 'toluene', smiles: 'Cc1ccccc1' }, { id: 'phenol', smiles: 'Oc1ccccc1' }, { id: 'aniline', smiles: 'Nc1ccccc1' }, { id: 'chlorobenzene', smiles: 'Clc1ccccc1' },
    { id: 'bromobenzene', smiles: 'Brc1ccccc1' }, { id: 'nitrobenzene', smiles: 'O=[N+]([O-])c1ccccc1' }, { id: 'benzoic-acid', smiles: 'OC(=O)c1ccccc1' },
    { id: 'acetophenone', smiles: 'CC(=O)c1ccccc1' }, { id: 'benzonitrile', smiles: 'N#Cc1ccccc1' }, { id: 'benzaldehyde', smiles: 'O=Cc1ccccc1' }, { id: 'ethylbenzene', smiles: 'CCc1ccccc1' }
  ],
  reagents: ['bromination', 'chlorination', 'nitration', 'sulfonation', 'acetylation', 'methylation']
};
export const LAB_SUBST_BY_ID = Object.fromEntries(LAB_SUBST.arenes.map((a) => [a.id, a]));
const nmOf = (s) => { const n = nameBothArene(s); return n ? n.new : s; };
const joinNames = (list) => list.map(nmOf).join(' and ');
/** The sentence that explains a correct answer for a substituted ring. */
export function substRightWhy(pred) {
  const E = pred.Elabel;
  const names = joinNames(pred.products);
  if (pred.outcome === 'op') return `Yes. ${subText(pred.subs[0])} is an ortho/para director, so ${E} replaces an H ortho or para to it: ${names}. Both form (the book treats this as a mixture).`;
  if (pred.outcome === 'm') return `Yes. ${subText(pred.subs[0])} is a meta director, so ${E} replaces an H meta to it: ${names}.`;
  if (pred.outcome === 'cooperate') return `Yes. The two groups send ${E} to the same position: ${names}.`;
  return `Yes. ${pred.why} Product${pred.products.length > 1 ? 's' : ''}: ${names}.`;
}
/**
 * Four drawn answers for a substituted ring: the right set, the set the OTHER kind of director would give (or another position), a partial answer (only one of the two
 * isomers an o/p director gives), and a ring with two new groups. {kind, correct, smiles:[...], why}.
 */
export function substChoices(pred) {
  const P = ringGroups(pred.arene);
  const st0 = stateOf(pred.arene);
  const open = [0, 1, 2, 3, 4, 5].filter((q) => !P.subs.some((s) => s.pos === q));
  const at = (q) => smilesOfState(addGroup(st0, P.ring[q], pred.group, true));
  const keyOf = (arr) => arr.slice().sort().join('|');
  const right = pred.products;
  const used = new Set([keyOf(right)]);
  const out = [{ kind: 'major', correct: true, smiles: right, why: substRightWhy(pred) }];
  const others = open.filter((q) => !pred.positions.includes(q));
  const relText = (q) => P.subs.map((s) => `${relation(s.pos, q)} to ${subText(s)}`).join(' and ');
  const push = (kind, qs, why) => {
    const prods = [...new Set(qs.map(at))].sort();
    if (!prods.length || used.has(keyOf(prods))) return false;
    used.add(keyOf(prods)); out.push({ kind, correct: false, smiles: prods, why }); return true;
  };
  if (pred.subs.length === 1) {
    const g = DIRECTORS[pred.subs[0].id], gt = subText(pred.subs[0]);
    if (pred.outcome === 'op') {
      push('opposite', others, `That puts the group meta to ${gt}. ${gt} is an ortho/para director: ${g.why}`);
      const para = pred.positions.filter((q) => relation(pred.subs[0].pos, q) === 'para');
      push('partial', para, 'Para forms, but so does ortho: the two ortho carbons are just as good electronically, so both the ortho and the para product are made (the book calls the result a mixture).');
    } else {
      push('opposite', pred.positions.length ? open.filter((q) => relation(pred.subs[0].pos, q) !== 'meta') : [], `That puts the group ortho and para to ${gt}. ${gt} is a meta director: ${g.why}`);
      push('partial', open.filter((q) => relation(pred.subs[0].pos, q) === 'para'), `Para attack puts the + on the carbon next to the δ+ atom of ${gt} in one carbocation form, which is unfavourable, so para is not where it goes: ${gt} directs meta.`);
    }
  } else {
    others.forEach((q) => { if (out.length < 3) push('otherPlace', [q], `That position is ${relText(q)}, but the groups on the ring do not send the new group there. ${pred.why}`); });
  }
  while (out.length < 3 && open.length) {   // pad with single other positions
    const q = open.find((x) => !used.has(keyOf([at(x)])));
    if (q == null) break;
    push('otherPlace', [q], `That position is ${relText(q)}; the rules for this ring (${pred.why}) do not send the new group there.`);
  }
  // two new groups
  const q1 = pred.positions[0], q2 = open.find((q) => q !== q1);
  if (q2 != null) {
    const s1 = addGroup(st0, P.ring[q1], pred.group, true);
    const two = smilesOfState(addGroup(s1, P.ring[q2], pred.group, true));
    out.push({ kind: 'twice', correct: false, smiles: [two], why: 'This ring has TWO new groups. One electrophile replaces just one H, and the question asks for the monosubstituted product (the new group on the ring that already has one).' });
  }
  return out;
}
