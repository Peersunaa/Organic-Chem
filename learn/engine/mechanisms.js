// Data for Lesson 08 (McMurry 3.5 to 3.9): mechanisms stored as data, the reaction-type pool, the nucleophile / electrophile site table.
// Everything that can be derived is derived (classification from formulas, arrows from the scene); the tests re-derive it independently.
import { analyze, canon, rdkit, ENEG } from './chem.js';
import { buildScene, stepResult, tallyOf, WHY } from './widgets/mechanism-core.js';
import { buildMolblock } from './widgets/lewis-core.js';


// ---------------------------------------------------------------- mechanisms as data (arrow-core format; see widgets/mechanism-core.js)
export const HCL_ETHYLENE = {
  reactants: ['C=C', 'Cl'], products: ['CCCl'],
  steps: [
    {
      before: ['C=C', 'Cl'], layout: [{}, { hAngles: { 0: 180 } }],
      arrows: [{ from: { bond: [0, 1] }, to: { bond: [0, 7] }, why: WHY.piToH('H–Cl') }, { from: { bond: [7, 6] }, to: { atom: 6 }, why: WHY.XLeaves('Cl') }],
      after: ['C[CH2+]', '[Cl-]'],
      label: 'The π bond of ethylene attacks the H of HCl. The H–Cl bond pair leaves with Cl. Result: a carbocation and Cl⁻.'
    },
    {
      before: ['C[CH2+]', '[Cl-]'],
      arrows: [{ from: { lp: 7 }, to: { atom: 1 }, why: WHY.halideAttacks('Cl') }],
      after: ['CCCl'],
      label: 'A lone pair on Cl⁻ attacks the positive carbon and becomes the new C–Cl bond.'
    }
  ]
};

export const HBR_ETHYLENE = {
  reactants: ['C=C', 'Br'], products: ['CCBr'],
  steps: [
    {
      before: ['C=C', 'Br'], layout: [{}, { hAngles: { 0: 180 } }],
      arrows: [{ from: { bond: [0, 1] }, to: { bond: [0, 7] }, why: WHY.piToH('H–Br') }, { from: { bond: [7, 6] }, to: { atom: 6 }, why: WHY.XLeaves('Br') }],
      after: ['C[CH2+]', '[Br-]'],
      label: 'The π bond attacks the H of HBr. The H–Br pair leaves with Br. Result: a carbocation and Br⁻.'
    },
    {
      before: ['C[CH2+]', '[Br-]'],
      arrows: [{ from: { lp: 7 }, to: { atom: 1 }, why: WHY.halideAttacks('Br') }],
      after: ['CCBr'],
      label: 'A lone pair on Br⁻ attacks the positive carbon and becomes the new C–Br bond.'
    }
  ]
};

export const HBR_BUTENE = {
  reactants: ['C/C=C/C', 'Br'], products: ['CCC(C)Br'],
  steps: [
    {
      before: ['C/C=C/C', 'Br'], layout: [{}, { hAngles: { 0: 180 } }],
      arrows: [{ from: { bond: [1, 2] }, to: { bond: [1, 13] }, why: WHY.piToH('H–Br') }, { from: { bond: [13, 12] }, to: { atom: 12 }, why: WHY.XLeaves('Br') }],
      after: ['CC[CH+]C', '[Br-]'],
      label: 'The π bond attacks the H of HBr. The H–Br pair leaves with Br. Result: a carbocation and Br⁻.'
    },
    {
      before: ['CC[CH+]C', '[Br-]'],
      arrows: [{ from: { lp: 13 }, to: { atom: 2 }, why: WHY.halideAttacks('Br') }],
      after: ['CCC(C)Br'],
      label: 'A lone pair on Br⁻ attacks the positive carbon and becomes the new C–Br bond.'
    }
  ]
};
export const MECH = { 'hcl-ethylene': HCL_ETHYLENE, 'hbr-ethylene': HBR_ETHYLENE, 'hbr-butene': HBR_BUTENE };

// ---------------------------------------------------------------- HX addition built from a scene (used by the mastery generator)
export const HX = { Cl: { smiles: 'Cl', label: 'HCl' }, Br: { smiles: 'Br', label: 'HBr' } };
/** Symmetric alkenes only (both ends of the C=C are alike), so there is one carbocation and one product. */
export const HX_ALKENES = [
  { smiles: 'C=C', label: 'ethylene', cation: 'C[CH2+]' },
  { smiles: 'C/C=C/C', label: 'but-2-ene', html: '<name new="but-2-ene" old="2-butene"></name>', cation: 'CC[CH+]C' },
  { smiles: 'C1=CCCCC1', label: 'cyclohexene', cation: '[CH+]1CCCCC1' },
  { smiles: 'CC(C)=C(C)C', label: '2,3-dimethylbut-2-ene', html: '<name new="2,3-dimethylbut-2-ene" old="2,3-dimethyl-2-butene"></name>', cation: 'CC(C)[C+](C)C' }
];

/** Step 1 or 2 of H-X + a symmetric alkene as a mechanism step; the arrow atoms are found in the scene. */
export function hxStep(alkene, X, which) {
  if (which === 1) {
    const st = { before: [alkene, HX[X].smiles], layout: [{}, { hAngles: { 0: 180 } }], arrows: [], after: [], label: '' };
    const sc = buildScene(st);
    const bond = sc.bonds.find((b) => b.order === 2 && sc.atoms[b.a].el === 'C' && sc.atoms[b.b].el === 'C');
    const H = sc.maps[1].h[0][0], Xi = sc.maps[1].heavy[0];
    st.arrows = [{ from: { bond: [bond.a, bond.b] }, to: { bond: [bond.a, H] }, why: WHY.piToH(`H–${X}`) }, { from: { bond: [H, Xi] }, to: { atom: Xi }, why: WHY.XLeaves(X) }];
    st.after = canon(buildMolblock(stepResult(st))).split('.').sort((p, q) => (q.includes('+') ? 1 : 0) - (p.includes('+') ? 1 : 0));
    st.label = `The π bond attacks the H of ${HX[X].label}; the H–${X} pair leaves with ${X}. Result: a carbocation and ${X}⁻.`;
    return st;
  }
  const s1 = hxStep(alkene, X, 1);
  const st = { before: s1.after, arrows: [], after: [], label: `A lone pair on ${X}⁻ attacks the carbocation and becomes the new C–${X} bond.` };
  const sc = buildScene(st);
  const Ci = sc.atoms.findIndex((a) => a.el === 'C' && a.charge === 1);
  const Xi = sc.atoms.findIndex((a) => a.el === X);
  st.arrows = [{ from: { lp: Xi }, to: { atom: Ci }, why: WHY.halideAttacks(X) }];
  st.after = [canon(buildMolblock(stepResult(st)))];
  return st;
}
export function hxMechanism(alkene, X) {
  return { reactants: [alkene, HX[X].smiles], products: hxStep(alkene, X, 2).after, steps: [hxStep(alkene, X, 1), hxStep(alkene, X, 2)] };
}

// ---------------------------------------------------------------- reaction kinds (McMurry 3.5)
const hillKey = (smiles) => Object.entries(tallyOf([smiles]).c).sort().map(([k, v]) => k + v).join('');
/**
 * addition: two reactants, one product, nothing left over. elimination: one reactant, two products.
 * substitution: two reactants swap parts, two products. rearrangement: one reactant, one product with the same formula.
 * Returns null for anything else (or if atoms do not balance).
 */
export function classifyReaction(reactants, products) {
  const A = tallyOf(reactants), B = tallyOf(products);
  for (const k of new Set([...Object.keys(A.c), ...Object.keys(B.c)])) if ((A.c[k] || 0) !== (B.c[k] || 0)) return null;
  if (A.q !== B.q) return null;
  const r = reactants.length, p = products.length;
  if (r === 2 && p === 1) return 'addition';
  if (r === 1 && p === 2) return 'elimination';
  if (r === 2 && p === 2) return 'substitution';
  if (r === 1 && p === 1 && hillKey(reactants[0]) === hillKey(products[0]) && canon(reactants[0]) !== canon(products[0])) return 'rearrangement';
  return null;
}
export const KINDS = {
  addition: { name: 'addition', rule: 'two reactants join into one product with no atoms left over' },
  elimination: { name: 'elimination', rule: 'one reactant splits into two products (often a small molecule such as H₂O or HCl comes off)' },
  substitution: { name: 'substitution', rule: 'two reactants swap parts and give two new products' },
  rearrangement: { name: 'rearrangement', rule: 'one reactant is reorganized into one isomeric product (same formula, different structure)' }
};
export const KIND_LIST = Object.keys(KINDS);

/** Reaction pool. `kind` and the written formulas `eq` are stored so lessons need no RDKit at import time; the tests recompute both (classifyReaction, element tallies). cond = text over the arrow. */
export const REACTIONS = [
  { id: 'hcl-ethylene', kind: 'addition', eq: 'CH₂=CH₂ + HCl → CH₃CH₂Cl', reactants: ['C=C', 'Cl'], products: ['CCCl'] },
  { id: 'hbr-ethylene', kind: 'addition', eq: 'CH₂=CH₂ + HBr → CH₃CH₂Br', reactants: ['C=C', 'Br'], products: ['CCBr'] },
  { id: 'hcl-cyclohexene', kind: 'addition', eq: 'C₆H₁₀ + HCl → C₆H₁₁Cl', reactants: ['C1=CCCCC1', 'Cl'], products: ['ClC1CCCCC1'] },
  { id: 'br2-ethylene', kind: 'addition', eq: 'CH₂=CH₂ + Br₂ → BrCH₂CH₂Br', reactants: ['C=C', 'BrBr'], products: ['BrCCBr'] },
  { id: 'hcl-butene', kind: 'addition', eq: 'CH₃CH=CHCH₃ + HCl → CH₃CH₂CHClCH₃', reactants: ['C/C=C/C', 'Cl'], products: ['CCC(C)Cl'] },
  { id: 'ethanol-dehydration', kind: 'elimination', eq: 'CH₃CH₂OH → CH₂=CH₂ + H₂O', reactants: ['CCO'], products: ['C=C', 'O'], cond: 'acid catalyst' },
  { id: 'cyclohexanol-dehydration', kind: 'elimination', eq: 'C₆H₁₁OH → C₆H₁₀ + H₂O', reactants: ['OC1CCCCC1'], products: ['C1=CCCCC1', 'O'], cond: 'acid catalyst' },
  { id: 'propanol-dehydration', kind: 'elimination', eq: 'CH₃CH(OH)CH₃ → CH₃CH=CH₂ + H₂O', reactants: ['CC(C)O'], products: ['C=CC', 'O'], cond: 'acid catalyst' },
  { id: 'tbutanol-dehydration', kind: 'elimination', eq: '(CH₃)₃COH → (CH₃)₂C=CH₂ + H₂O', reactants: ['CC(C)(C)O'], products: ['C=C(C)C', 'O'], cond: 'acid catalyst' },
  { id: 'methane-chlorine', kind: 'substitution', eq: 'CH₄ + Cl₂ → CH₃Cl + HCl', reactants: ['C', 'ClCl'], products: ['CCl', 'Cl'], cond: 'light' },
  { id: 'bromomethane-hydroxide', kind: 'substitution', eq: 'CH₃Br + HO⁻ → CH₃OH + Br⁻', reactants: ['CBr', '[OH-]'], products: ['CO', '[Br-]'] },
  { id: 'bromoethane-hydroxide', kind: 'substitution', eq: 'CH₃CH₂Br + HO⁻ → CH₃CH₂OH + Br⁻', reactants: ['CCBr', '[OH-]'], products: ['CCO', '[Br-]'] },
  { id: 'bromomethane-cyanide', kind: 'substitution', eq: 'CH₃Br + CN⁻ → CH₃CN + Br⁻', reactants: ['CBr', '[C-]#N'], products: ['CC#N', '[Br-]'] },
  { id: 'butene-isomerization', kind: 'rearrangement', eq: 'CH₂=CHCH₂CH₃ → CH₃CH=CHCH₃', reactants: ['C=CCC'], products: ['CC=CC'], cond: 'acid catalyst' },
  { id: 'cis-trans', kind: 'rearrangement', eq: 'cis-CH₃CH=CHCH₃ → trans-CH₃CH=CHCH₃', reactants: ['C/C=C\\C'], products: ['C/C=C/C'], cond: 'acid catalyst' },
  { id: 'methylbutene-isomerization', kind: 'rearrangement', eq: 'CH₂=CHCH(CH₃)₂ → (CH₃)₂C=CHCH₃', reactants: ['C=CC(C)C'], products: ['CC=C(C)C'], cond: 'acid catalyst' }
];
export const REACTION = Object.fromEntries(REACTIONS.map((r) => [r.id, r]));
/** Computed kind (needs RDKit). The stored r.kind must always equal it; the tests enforce that. */
export const kindOf = (r) => classifyReaction(r.reactants, r.products);

/** Why a reaction has its kind, from the counts and the written formulas (pure: no RDKit, so lessons can use it at import time). */
export function kindWhy(r) {
  const nr = r.reactants.length, np = r.products.length;
  if (r.kind === 'addition') return `${nr} reactants → ${np} product (${r.eq}): the two reactants joined and no atoms were left over.`;
  if (r.kind === 'elimination') return `${nr} reactant → ${np} products (${r.eq}): one molecule split in two.`;
  if (r.kind === 'substitution') return `${nr} reactants → ${np} products (${r.eq}): the two reactants swapped parts.`;
  return `${nr} reactant → ${np} product (${r.eq}): the formula is unchanged, so the atoms were only reorganized into an isomer.`;
}
export const WRONG_KIND = {
  addition: (r) => `An addition ends with ONE product that holds every atom of both reactants. Here there ${r.products.length === 1 ? 'is one product' : 'are ' + r.products.length + ' products'}.`,
  elimination: () => 'An elimination starts from ONE reactant that splits into two products. Count the molecules on the left.',
  substitution: () => 'A substitution has two reactants and two products, because the reactants swap parts. Count the molecules on each side.',
  rearrangement: () => 'A rearrangement has ONE reactant and ONE product, isomers of each other. Count the molecules on each side.'
};

// ---------------------------------------------------------------- nucleophilic / electrophilic sites (McMurry 3.6)
/**
 * Site table. smiles has explicit [H] where the learner must be able to tap an H. nuc / elec = {atoms: [indices that count], why}.
 * The tests re-derive the sites from structure (charge, lone pairs, pi bond, electron count, electronegativity).
 */
export const SITES = {
  water: { smiles: '[H]O[H]', label: 'H₂O', nuc: { atoms: [1], why: 'Oxygen carries two lone pairs and is δ− (3.5 against 2.1 for H), so it can donate a pair.' } },
  ammonia: { smiles: '[H]N([H])[H]', label: 'NH₃', nuc: { atoms: [1], why: 'Nitrogen has a lone pair to donate, and it is δ− towards the hydrogens.' } },
  bromide: { smiles: '[Br-]', label: 'Br⁻', nuc: { atoms: [0], why: 'A negative ion with four lone pairs: it has electrons to give.' } },
  ethylene: { smiles: 'C=C', label: 'ethylene', nuc: { atoms: [0, 1], why: 'The C=C π electrons sit above and below the plane where reagents can reach them, so the double bond donates a pair. Either carbon of the bond counts.' } },
  hbr: { smiles: '[H]Br', label: 'H–Br', elec: { atoms: [0], why: 'Bromine (2.8) pulls electrons from hydrogen (2.1), so H is δ+. It is the atom that receives a pair as the H–Br bond breaks and Br⁻ leaves.' } },
  ethylcation: { smiles: 'C[CH2+]', label: 'CH₃CH₂⁺', elec: { atoms: [1], why: 'The positive carbon has only three bonds and six electrons. It has an empty p orbital waiting for a pair.' } },
  bf3: { smiles: 'FB(F)F', label: 'BF₃', elec: { atoms: [1], why: 'Boron has three bonds, no lone pair and only six electrons, so it can accept a pair (BF₃ is a Lewis acid).' } },
  acetone: { smiles: 'CC(=O)C', label: 'acetone', elec: { atoms: [1], why: 'The carbonyl carbon is bonded to oxygen (3.5 against 2.5), so it is δ+ and receives a pair from a nucleophile.' }, nuc: { atoms: [2], why: 'The carbonyl oxygen has two lone pairs and is δ−.' } }
};
export const siteIds = Object.keys(SITES);

/**
 * Structural rules for the site table (also used by the tests as an independent check).
 * Nucleophilic atom: carries a negative charge, or is a neutral N or O with a lone pair, or is a carbon of a C=C double bond.
 * Electrophilic atom: carries a positive charge, or has fewer than 8 electrons around it, or is made δ+ by more electronegative
 * neighbours (the summed electronegativity excess of the atoms it is bonded to, at least 0.5, the 'polar' threshold of Lesson 02; hydrogens count as neighbours).
 */
export function siteRules(smiles) {
  // make every hydrogen an explicit atom first (heavy-atom numbering is unchanged), so H atoms can be judged too
  const R = rdkit();
  const m0 = R.get_mol(smiles, JSON.stringify({ removeHs: false }));
  const mb = m0.add_hs(); m0.delete();
  const info = analyze(mb, { keepHs: true });
  const out = { nuc: [], elec: [] };
  info.atoms.forEach((a, i) => {
    const nb = a.nbrs.map((j) => ({ a: info.atoms[j], bo: info.bonds.find((b) => b.atoms.includes(i) && b.atoms.includes(j)).bo ?? 1 }));
    const pi = a.sym === 'C' && nb.some((n) => n.a.sym === 'C' && n.bo === 2);
    if (a.fc < 0 || (a.fc === 0 && a.lp > 0 && (a.sym === 'N' || a.sym === 'O')) || pi) out.nuc.push(i);
    const pull = nb.reduce((t, n) => t + Math.max(0, ENEG[n.a.sym] - ENEG[a.sym]), 0);
    if (a.fc > 0 || (a.sym !== 'H' && a.electrons < 8) || pull >= 0.5) out.elec.push(i);
  });
  return out;
}

// ---------------------------------------------------------------- nucleophile / electrophile pairs for the mastery generator
/** role: 'nuc' or 'elec'. reason is shown in the feedback. All reasons are re-checked structurally in the tests. */
export const NUC_ELEC = [
  { smiles: '[OH-]', label: 'HO⁻', role: 'nuc', reason: 'it is a negative ion with lone pairs to donate' },
  { smiles: 'C[O-]', label: 'CH₃O⁻', role: 'nuc', reason: 'it is a negative ion with lone pairs on oxygen' },
  { smiles: '[Cl-]', label: 'Cl⁻', role: 'nuc', reason: 'it is a negative ion with lone pairs' },
  { smiles: '[Br-]', label: 'Br⁻', role: 'nuc', reason: 'it is a negative ion with lone pairs' },
  { smiles: '[C-]#N', label: 'CN⁻', role: 'nuc', reason: 'it is a negative ion with a lone pair on carbon' },
  { smiles: 'N', label: 'NH₃', role: 'nuc', reason: 'nitrogen has a lone pair to donate' },
  { smiles: 'CN', label: 'CH₃NH₂', role: 'nuc', reason: 'nitrogen has a lone pair to donate' },
  { smiles: 'C=C', label: 'ethylene', role: 'nuc', reason: 'its C=C π electrons are exposed and can be donated' },
  { smiles: 'CC=C', label: 'propene', role: 'nuc', reason: 'its C=C π electrons are exposed and can be donated' },
  { smiles: '[OH3+]', label: 'H₃O⁺', role: 'elec', reason: 'it is positively charged and gives up H⁺ (it accepts a pair at H)' },
  { smiles: '[NH4+]', label: 'NH₄⁺', role: 'elec', reason: 'it is positively charged and has no lone pair' },
  { smiles: 'FB(F)F', label: 'BF₃', role: 'elec', reason: 'boron has only six electrons and no lone pair' },
  { smiles: 'C[CH2+]', label: 'CH₃CH₂⁺', role: 'elec', reason: 'the positive carbon has only six electrons' },
  { smiles: 'C[C+](C)C', label: '(CH₃)₃C⁺', role: 'elec', reason: 'the positive carbon has only six electrons' },
  { smiles: 'Cl', label: 'HCl', role: 'elec', reason: 'H is δ+ (bonded to the more electronegative Cl) and can be taken as H⁺' },
  { smiles: 'Br', label: 'HBr', role: 'elec', reason: 'H is δ+ (bonded to the more electronegative Br) and can be taken as H⁺' },
  { smiles: 'CCl', label: 'CH₃Cl', role: 'elec', reason: 'carbon is δ+ because it is bonded to the more electronegative Cl' },
  { smiles: 'CC(=O)C', label: 'acetone (the C=O carbon)', role: 'elec', reason: 'the carbonyl carbon is δ+ because it is bonded to oxygen' }
];

// ---------------------------------------------------------------- worked-example helper: classify a pool reaction
const cap = (s) => s[0].toUpperCase() + s.slice(1);
/** A `worked` move asking for the kind of reaction `id`; the correct option and every reason are computed. */
export function kindMove(id, ask) {
  const r = REACTION[id];
  const kind = r.kind;
  const nr = r.reactants.length, np = r.products.length;
  return {
    ask, equation: { reactants: r.reactants, products: r.products, cond: r.cond },
    options: KIND_LIST.map((k) => ({
      text: cap(KINDS[k].name), correct: k === kind,
      why: k === kind ? `Yes. ${kindWhy(r)}` : `${WRONG_KIND[k](r)} Here: ${nr} reactant${nr === 1 ? '' : 's'} and ${np} product${np === 1 ? '' : 's'}.`
    }))
  };
}

// ---------------------------------------------------------------- WRONG mechanisms for "spot the broken rule" (Lesson 08 step 8)
// Atom numbers and coordinates are written out; arrow-draw shows them with preset:true. The tests prove each case really breaks its rule.
export const RULE_CASES = {
  // 1. an arrow that starts at H+ (an atom with no electrons): NH3 + H+
  fromProton: {
    atoms: [{ el: 'N', x: 0, y: 0 }, { el: 'H', x: -0.9, y: 0.55 }, { el: 'H', x: 0, y: 1.05 }, { el: 'H', x: 0.9, y: 0.55 }, { el: 'H', x: 3, y: 0, charge: 1 }],
    bonds: [{ a: 0, b: 1, order: 1 }, { a: 0, b: 2, order: 1 }, { a: 0, b: 3, order: 1 }],
    arrows: [{ from: { atom: 4 }, to: { atom: 0 } }]
  },
  // 2. HO- + CH3Cl with only the first arrow: carbon ends with five bonds
  fiveBonds: {
    atoms: [
      { el: 'O', x: 0, y: 0, charge: -1 }, { el: 'H', x: -0.95, y: 0 },
      { el: 'C', x: 3.4, y: 0 }, { el: 'H', x: 2.95, y: -0.95 }, { el: 'H', x: 2.95, y: 0.95 }, { el: 'H', x: 3.4, y: 1.15 }, { el: 'Cl', x: 4.8, y: 0 }
    ],
    bonds: [{ a: 0, b: 1, order: 1 }, { a: 2, b: 3, order: 1 }, { a: 2, b: 4, order: 1 }, { a: 2, b: 5, order: 1 }, { a: 2, b: 6, order: 1 }],
    arrows: [{ from: { lp: 0 }, to: { atom: 2 } }]
  },
  // 3. HO- + HCl: both arrows are right, but the student writes the products as H2O + Cl (no negative charge on Cl)
  lostCharge: {
    atoms: [{ el: 'O', x: 0, y: 0, charge: -1 }, { el: 'H', x: -0.95, y: 0 }, { el: 'H', x: 2.5, y: 0 }, { el: 'Cl', x: 3.6, y: 0 }],
    bonds: [{ a: 0, b: 1, order: 1 }, { a: 2, b: 3, order: 1 }],
    arrows: [{ from: { lp: 0 }, to: { atom: 2 } }, { from: { bond: [2, 3] }, to: { atom: 3 } }],
    studentProducts: ['O', '[Cl]'],
    reactants: ['[OH-]', 'Cl']
  }
};

// ---------------------------------------------------------------- energy diagrams used in the lesson (illustrative numbers, not measured)
export const HCL_ETHYLENE_LEVELS = [
  { label: 'ethylene + HCl', kind: 'R', E: 50 }, { label: '', kind: 'TS', E: 120 }, { label: '', kind: 'I', E: 85 }, { label: '', kind: 'TS', E: 100 }, { label: 'chloroethane', kind: 'P', E: 10 }
];
export const CATALYST_LEVELS = [
  { label: 'reactants', kind: 'R', E: 50 }, { label: '', kind: 'TS', E: 120 }, { label: 'products', kind: 'P', E: 10 }
];
