// Lesson 16: resolving a racemic carboxylic acid with a chiral amine (McMurry 6.8, lactic acid + 1-phenylethylamine). Pure logic.
// The salts are written as ion pairs (carboxylate . ammonium) and compared with relationship() from engine/chirality.js, so that "which
// reagent works", "which salts form" and "how are they related" are COMPUTED from the structures, not typed in.
import { relationship, mirrorSmiles } from './chirality.js';
import { tetraInfo } from './cip.js';

export const ACID = { name: 'lactic acid', R: 'C[C@@H](O)C(=O)O', S: 'C[C@H](O)C(=O)O' };
const anion = (L) => (L === 'R' ? 'C[C@@H](O)C(=O)[O-]' : 'C[C@H](O)C(=O)[O-]');
// 1-phenylethylamine: the amine carbon is the only center. The cation keeps the neighbour order of the amine, so the configuration is unchanged.
export const AMINE = { name: '1-phenylethylamine', R: 'C[C@@H](N)c1ccccc1', S: 'C[C@H](N)c1ccccc1' };
const cation = (L) => (L === 'R' ? 'C[C@@H]([NH3+])c1ccccc1' : 'C[C@H]([NH3+])c1ccccc1');

/** Reagents the learner can choose from. bases: the cations that can pair with the acid anions. */
export const REAGENTS = [
  { id: 'methylamine', label: 'Methylamine, CH₃NH₂ (achiral)', bases: [{ smiles: 'C[NH3+]', tag: '' }] },
  { id: 'R-amine', label: '(R)-1-phenylethylamine, one pure enantiomer', bases: [{ smiles: cation('R'), tag: 'R' }] },
  { id: 'rac-amine', label: '(±)-1-phenylethylamine, the racemic amine', bases: [{ smiles: cation('R'), tag: 'R' }, { smiles: cation('S'), tag: 'S' }] },
  { id: 'NaOH', label: 'Sodium hydroxide, NaOH', bases: [{ smiles: '[Na+]', tag: '' }] }
];
export const reagentById = (id) => REAGENTS.find((r) => r.id === id);

/** Every salt a racemic acid gives with a reagent: [{ smiles, acid:'R'|'S', base:'R'|'S'|'', label:'(R)-acid · (R)-amine' }]. */
export function saltsFor(reagentId) {
  const r = reagentById(reagentId);
  const out = [];
  for (const L of ['R', 'S']) for (const b of r.bases) {
    out.push({ smiles: `${anion(L)}.${b.smiles}`, acid: L, base: b.tag, label: b.tag ? `${L},${b.tag} salt` : `${L} salt` });
  }
  return out;
}
/**
 * Group salts that have identical properties (the same compound, or enantiomers of each other) and report which acid configurations each group
 * contains. Resolution works exactly when every group holds only ONE acid configuration, so separating the groups separates the acids.
 */
export function analyseReagent(reagentId) {
  const salts = saltsFor(reagentId);
  const group = salts.map((_, i) => i);
  const find = (i) => (group[i] === i ? i : (group[i] = find(group[i])));
  const rels = [];
  for (let i = 0; i < salts.length; i++) for (let j = i + 1; j < salts.length; j++) {
    const kind = relationship(salts[i].smiles, salts[j].smiles).kind;
    rels.push({ i, j, kind });
    if (kind === 'enantiomers' || kind === 'identical') group[find(j)] = find(i);
  }
  const classes = {};
  salts.forEach((s, i) => { (classes[find(i)] = classes[find(i)] || []).push(i); });
  const list = Object.values(classes).map((idx) => ({ salts: idx, acids: [...new Set(idx.map((i) => salts[i].acid))] }));
  const works = list.length > 1 && list.every((c) => c.acids.length === 1);
  return { salts, rels, classes: list, works };
}
/** The free acid regained from a salt by adding HCl (carboxylate + H+ -> carboxylic acid). */
export const acidFromSalt = (salt) => (salt.acid === 'R' ? ACID.R : ACID.S);
/** The label (R/S) of the single stereocenter in a SMILES, from the CIP rules of engine/cip.js. */
export const labelOf = (smiles) => (tetraInfo(smiles).find((t) => t.center && t.label) || {}).label || null;
export { mirrorSmiles };
