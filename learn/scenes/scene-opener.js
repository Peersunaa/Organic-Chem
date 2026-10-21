// The one-line note above a scene opened from a reaction-table cell or a builder result whose starting material is not the scene's own (scene-view.js,
// `opener` option). Hot KMnO₄ cuts a C=C or a C≡C, and what each end becomes depends only on the H count of that carbon, so the note says it for the
// learner's molecule: "This scene uses 2-methylbut-2-ene. The same steps apply to ethene; here each end has 2 H, so both ends go to CO₂."
// Needs RDKit ready (engine/chem.js). Scenes whose card has no rule here get no note (the builder's own line, "the arrows are the same", covers them).
import { analyze, canon } from '../engine/chem.js';
import { findRing } from '../engine/naming-arene.js';

/** card id -> the bond that is cut (2 = C=C, 3 = C≡C) and the fate of an end whose carbon carries n H. */
export const OPENER_RULES = {
  'alkene-kmno4-acid': { order: 2, fate: { 2: 'goes to CO₂', 1: 'becomes a carboxylic acid', 0: 'becomes a ketone' }, both: { 2: 'both ends go to CO₂', 1: 'both ends become carboxylic acids', 0: 'both ends become ketones' } },
  'alkyne-kmno4-hot': { order: 3, fate: { 1: 'goes to CO₂', 0: 'becomes a carboxylic acid' }, both: { 1: 'both ends go to CO₂', 0: 'both ends become carboxylic acids' } }
};

/** Every C=C (order 2) or C≡C (order 3) outside a benzene ring: [{ h: [H on one carbon, H on the other], ring: the bond sits in a ring }]. null if RDKit cannot read it. */
export function cutEnds(smiles, order) {
  const info = analyze(smiles);
  if (!info) return null;
  const benz = new Set(findRing(info) || []);
  const out = [];
  info.bonds.forEach((b) => {
    const [x, y] = b.atoms;
    if ((b.bo || 1) !== order || info.atoms[x].sym !== 'C' || info.atoms[y].sym !== 'C' || (benz.has(x) && benz.has(y))) return;
    // in a ring when x still reaches y with this bond taken away
    const seen = new Set([x]), q = [x];
    for (let k = 0; k < q.length; k++) info.atoms[q[k]].nbrs.forEach((n) => { if ((q[k] === x && n === y) || seen.has(n)) return; seen.add(n); q.push(n); });
    out.push({ h: [info.atoms[x].impH, info.atoms[y].impH], ring: seen.has(y) });
  });
  return out;
}

const hWord = (n) => (n === 0 ? 'no H' : `${n} H`);
/** The note for a scene opened on `opener` = { smiles, name }, or null (the scene's own molecule, no rule for the scene's card, or no such bond to cut). */
export function openerNote(scene, opener) {
  if (!scene || !opener || !opener.smiles) return null;
  const rule = OPENER_RULES[scene.reagentCard];
  if (!rule) return null;
  let ends;
  try {
    if (canon(opener.smiles) === canon(scene.reactant.smiles)) return null;
    ends = cutEnds(opener.smiles, rule.order);
  } catch (e) { return null; }
  if (!ends || !ends.length) return null;
  const e = ends[0], [a, b] = e.h.slice().sort((p, q) => q - p);
  if (!(a in rule.fate) || !(b in rule.fate)) return null;
  let clause = a === b ? `here each end has ${hWord(a)}, so ${rule.both[a]}` : `here one end has ${hWord(a)}, so it ${rule.fate[a]}, and the other has ${hWord(b)}, so it ${rule.fate[b]}`;
  if (e.ring) clause += '; the ring opens into one chain';
  const more = ends.length > 1 ? ` Each ${rule.order === 3 ? 'C≡C' : 'C=C'} is cut the same way.` : '';
  return `This scene uses ${scene.reactant.name}. The same steps apply to ${opener.name || 'your molecule'}; ${clause}.${more}`;
}
