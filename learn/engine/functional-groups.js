// Functional-group data (McMurry Table 2.1, the groups used in chapters 1-6) and the SMARTS classifier.
// The SMARTS below define which atoms belong to each group ("key atoms"); the group-finder widget,
// the classifier and the mastery generator all use this one table, so nothing is hand-typed per molecule.
import { rdkit } from './chem.js';

// `tap`: what the learner is asked to tap. `look`: the one-line pattern. `trap`: the usual confusion.
export const FG = {
  alkane:   { name: 'alkane', article: 'an', none: true, smarts: '[!$([CX4])]', look: 'only C and H, only single bonds', tap: 'every atom (no special group)', quiz: true },
  alkene:   { name: 'alkene', article: 'an', smarts: '[CX3]=[CX3]', look: 'a C=C double bond', tap: 'the two carbons of the C=C', quiz: true },
  alkyne:   { name: 'alkyne', article: 'an', smarts: '[CX2]#[CX2]', look: 'a C≡C triple bond', tap: 'the two carbons of the C≡C', quiz: true },
  arene:    { name: 'arene (aromatic ring)', article: 'an', smarts: 'c1ccccc1', look: 'a benzene ring', tap: 'the six ring carbons', quiz: true },
  halide:   { name: 'alkyl halide', article: 'an', smarts: '[CX4][F,Cl,Br,I]', look: 'a halogen on an sp³ carbon', tap: 'the halogen and the carbon it is bonded to', quiz: true },
  alcohol:  { name: 'alcohol', article: 'an', smarts: '[CX4][OX2H]', look: 'an O–H on a carbon with four single bonds', tap: 'the O of the OH and the carbon it is bonded to', quiz: true },
  ether:    { name: 'ether', article: 'an', smarts: '[#6;!$([CX3]=[O,S,N])][OX2][#6;!$([CX3]=[O,S,N])]', look: 'an O bonded to two carbons, neither of them a C=O', tap: 'the O and both carbons on it', quiz: true },
  amine:    { name: 'amine', article: 'an', smarts: '[NX3;$(N[#6]);!$(N[CX3]=[O,S,N]);!$(N[!#6])]', look: 'an N bonded to carbon but not to a C=O', tap: 'the nitrogen', quiz: true },
  thiol:    { name: 'thiol', article: 'a', smarts: '[CX4][SX2H]', look: 'an S–H on a carbon', tap: 'the S of the SH and the carbon it is bonded to', quiz: true },
  sulfide:  { name: 'sulfide', article: 'a', smarts: '[#6][SX2;H0][#6]', look: 'an S bonded to two carbons', tap: 'the S and both carbons on it', quiz: true },
  aldehyde: { name: 'aldehyde', article: 'an', smarts: '[CX3H1;$([CX3H1](=[OX1])[#6])]=[OX1]', look: 'C=O at the end of a chain, where the carbonyl carbon also holds an H', tap: 'the carbonyl carbon and its oxygen', quiz: true },
  ketone:   { name: 'ketone', article: 'a', smarts: '[CX3;$([CX3](=[OX1])([#6])[#6])]=[OX1]', look: 'C=O with a carbon on each side', tap: 'the carbonyl carbon and its oxygen', quiz: true },
  acid:     { name: 'carboxylic acid', article: 'a', smarts: '[CX3](=[OX1])[OX2H1]', look: 'C=O with an OH on the same carbon', tap: 'the carbonyl carbon, its =O and its OH oxygen', quiz: true },
  ester:    { name: 'ester', article: 'an', smarts: '[CX3;$([CX3]([#6])(=[OX1])[OX2][#6])](=[OX1])[OX2]', look: 'C=O with an O–C on the same carbon', tap: 'the carbonyl carbon, its =O and the single-bonded O', quiz: true },
  amide:    { name: 'amide', article: 'an', smarts: '[CX3;$([CX3]([#6])(=[OX1])[NX3])](=[OX1])[NX3]', look: 'C=O with an N on the same carbon', tap: 'the carbonyl carbon, its =O and the N', quiz: true },
  nitrile:  { name: 'nitrile', article: 'a', smarts: '[CX2]#[NX1]', look: 'a C≡N triple bond', tap: 'the C and the N of the C≡N', quiz: true },
  // Not one of the 16 quiz groups: an OH directly on an aromatic ring behaves differently from an alcohol
  // (chapter 17), so the classifier labels it separately and the quiz never calls it an alcohol.
  phenol:   { name: 'phenol (OH on an arene)', article: 'a', smarts: '[OX2H][c]', look: 'an OH on a benzene ring', tap: 'the OH and the ring carbon', quiz: false }
};
export const QUIZ_GROUPS = Object.keys(FG).filter((k) => FG[k].quiz);
export const GROUP_IDS = Object.keys(FG);

/** The "usual confusions", used to choose near-miss distractors. */
export const CONFUSABLE = {
  aldehyde: ['ketone', 'acid'], ketone: ['aldehyde', 'ester'], ester: ['ether', 'acid'], ether: ['ester', 'alcohol'],
  alcohol: ['acid', 'ether'], acid: ['alcohol', 'ester'], amine: ['amide', 'nitrile'], amide: ['amine', 'ester'],
  nitrile: ['amine', 'alkyne'], alkene: ['alkyne', 'arene'], alkyne: ['alkene', 'nitrile'], arene: ['alkene'],
  halide: ['alcohol'], thiol: ['alcohol', 'sulfide'], sulfide: ['ether', 'thiol'], alkane: ['alkene']
};

const qcache = {};
function qmol(id) {
  if (!qcache[id]) { qcache[id] = rdkit().get_qmol(FG[id].smarts); if (!qcache[id]) throw new Error('bad SMARTS for ' + id); }
  return qcache[id];
}

/** Atom indices of the first match of a group (RDKit get_substruct_match), or null. */
export function matchGroup(smiles, id) {
  const m = rdkit().get_mol(smiles);
  if (!m) return null;
  try {
    const r = JSON.parse(m.get_substruct_match(qmol(id)));
    return r.atoms ? r.atoms.slice().sort((a, b) => a - b) : null;
  } finally { m.delete(); }
}

/** All distinct atom sets matching a group (duplicates from symmetric matches removed). */
export function allMatches(smiles, id) {
  const m = rdkit().get_mol(smiles);
  if (!m) return [];
  try {
    const seen = new Set(), out = [];
    for (const r of JSON.parse(m.get_substruct_matches(qmol(id)))) {
      const a = r.atoms.slice().sort((x, y) => x - y), k = a.join(',');
      if (!seen.has(k)) { seen.add(k); out.push(a); }
    }
    return out;
  } finally { m.delete(); }
}

/** Groups present in a molecule, in table order. "alkane" only when nothing but sp3 C is present. */
export function classify(smiles) {
  const out = [];
  for (const id of GROUP_IDS) {
    if (FG[id].none) {
      const m = rdkit().get_mol(smiles);
      let hit = true;
      try { hit = JSON.parse(m.get_substruct_match(qmol(id))).atoms === undefined; } finally { m.delete(); }
      if (hit) out.push(id);
    } else if (matchGroup(smiles, id)) out.push(id);
  }
  return out;
}

/** Groups with exactly one distinct instance (so tapping them has a single right answer). */
export function singleGroups(smiles) { return classify(smiles).filter((id) => !FG[id].none && FG[id].quiz && allMatches(smiles, id).length === 1); }

/** A short, specific reason a molecule does not contain a group (used in option `why`). */
export function notThere(id) {
  const g = FG[id];
  const base = `${cap(g.article)} ${g.name} is ${g.look}`;
  return base + '. The highlighted atoms are not that.';
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Pool of small drug-like and textbook molecules with HAND-CHECKED group lists (tests compare the classifier to these). */
export const FG_POOL = [
  { smiles: 'CCO', name: 'ethanol', groups: ['alcohol'] },
  { smiles: 'CC(=O)C', name: 'acetone', groups: ['ketone'] },
  { smiles: 'CC=O', name: 'acetaldehyde', groups: ['aldehyde'] },
  { smiles: 'CC(=O)O', name: 'acetic acid', groups: ['acid'] },
  { smiles: 'CC(=O)OCC', name: 'ethyl acetate', groups: ['ester'] },
  { smiles: 'CCOCC', name: 'diethyl ether', groups: ['ether'] },
  { smiles: 'CN', name: 'methylamine', groups: ['amine'] },
  { smiles: 'CC(N)=O', name: 'acetamide', groups: ['amide'] },
  { smiles: 'CC#N', name: 'acetonitrile', groups: ['nitrile'] },
  { smiles: 'CCCl', name: 'chloroethane', groups: ['halide'] },
  { smiles: 'CC=C', name: 'propene', groups: ['alkene'] },
  { smiles: 'CC#C', name: 'propyne', groups: ['alkyne'] },
  { smiles: 'Cc1ccccc1', name: 'toluene', groups: ['arene'] },
  { smiles: 'Oc1ccccc1', name: 'phenol', groups: ['arene', 'phenol'], avoid: ['alcohol'] },
  { smiles: 'CCS', name: 'ethanethiol', groups: ['thiol'] },
  { smiles: 'CSC', name: 'dimethyl sulfide', groups: ['sulfide'] },
  { smiles: 'CC(O)CC', name: '2-butanol', groups: ['alcohol'] },
  { smiles: 'CCCC=O', name: 'butanal', groups: ['aldehyde'] },
  { smiles: 'CCC(C)=O', name: 'butanone', groups: ['ketone'] },
  { smiles: 'OC1CCCCC1', name: 'cyclohexanol', groups: ['alcohol'] },
  { smiles: 'OC(=O)c1ccccc1', name: 'benzoic acid', groups: ['arene', 'acid'] },
  { smiles: 'CC(=O)Oc1ccccc1C(=O)O', name: 'aspirin', groups: ['arene', 'acid', 'ester'] },
  { smiles: 'CC(=O)Nc1ccc(O)cc1', name: 'paracetamol', groups: ['arene', 'phenol', 'amide'], avoid: ['alcohol'] },
  { smiles: 'CCNCC', name: 'diethylamine', groups: ['amine'] },
  { smiles: 'CNC(C)=O', name: 'N-methylacetamide', groups: ['amide'] },
  { smiles: 'C=CC(=O)O', name: 'acrylic acid', groups: ['alkene', 'acid'] },
  { smiles: 'CC(=O)c1ccccc1', name: 'acetophenone', groups: ['arene', 'ketone'] },
  { smiles: 'O=Cc1ccccc1', name: 'benzaldehyde', groups: ['arene', 'aldehyde'] },
  { smiles: 'COc1ccccc1', name: 'anisole', groups: ['arene', 'ether'] },
  { smiles: 'OCc1ccccc1', name: 'benzyl alcohol', groups: ['arene', 'alcohol'] },
  { smiles: 'CCC(=O)OC', name: 'methyl propanoate', groups: ['ester'] },
  { smiles: 'O=C1CCCCC1', name: 'cyclohexanone', groups: ['ketone'] },
  { smiles: 'C1CCOC1', name: 'tetrahydrofuran', groups: ['ether'] },
  { smiles: 'CCCC', name: 'butane', groups: ['alkane'] },
  { smiles: 'C1=CCCCC1', name: 'cyclohexene', groups: ['alkene'] },
  { smiles: 'CCBr', name: 'bromoethane', groups: ['halide'] }
];
