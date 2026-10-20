// What each reaction practice problem is made of, as plain data: the substrate class, the reagent family of a card, a difficulty tier, whether a product
// shows stereo. No DOM and no RDKit: engine/reactions-custom.js (the settings of the six reaction practice pages) filters pools with these, and
// tools/build_reaction_pools.mjs / tests/reaction-modes.mjs use the same functions to build and to check the static pools in engine/reaction-pools.js.
import { HUB_CARDS, HUB_BY_ID, HUB_GROUPS } from './reaction-hub.js';
import { chiralCenters, ezInfo } from './cip.js';

/** The six practice modes: the predict drill and the five reaction modes. */
export const PRACTICE_MODES = ['predict-product', 'guess-reagent', 'guess-reactant', 'stereo-outcome', 'two-step', 'wont-work'];
export const MIX_ID = 'reaction-mix';
export const PRACTICE_LABEL = { 'predict-product': 'Predict the product', 'guess-reagent': 'Which reagent?', 'guess-reactant': 'Which starting material?', 'stereo-outcome': 'What stereochemistry forms?', 'two-step': 'Two-step roadmap', 'wont-work': 'Which one will not work?' };
export const PRACTICE_BLURB = { 'predict-product': 'You see the starting material and the reagent. Pick the major product.' };

// ---- substrate classes (what the starting material is)
export const SUBSTRATE_IDS = ['alkenes', 'cycloalkenes', 'alkynes', 'dienes', 'arenes', 'alcohols'];
export const SUBSTRATE_LABEL = { alkenes: 'Alkenes', cycloalkenes: 'Cycloalkenes', alkynes: 'Alkynes', dienes: 'Dienes', arenes: 'Benzene / arenes', alcohols: 'Alcohols (oxidation cards)' };

// ---- reagent families (which kind of reagent) and the family of each of the 38 cards
export const FAMILY_IDS = ['hx', 'x2', 'syn', 'oxid', 'alkyne', 'eas', 'directors', 'sidechain', 'hubonly'];
export const FAMILY_LABEL = { hx: 'HX / water (Markovnikov)', x2: 'X₂ (anti)', syn: 'Syn group (H₂, cold KMnO₄, epoxide)', oxid: 'Oxidations / cleavage', alkyne: 'Alkyne-specific', eas: 'EAS', directors: 'Directors', sidechain: 'Side chain', hubonly: 'Hub-only facts' };
export const FAMILY_OF = {
  'alkene-hx': 'hx', 'alkene-hydration': 'hx', 'diene-hx': 'hx',
  'alkene-x2': 'x2', 'alkene-epoxide-diol': 'x2',
  'alkene-h2-pd': 'syn', 'alkene-kmno4-base': 'syn', 'alkene-epoxide': 'syn',
  'alkene-kmno4-acid': 'oxid', 'oxidation-pcc': 'oxid', 'oxidation-cr': 'oxid',
  'alkyne-hx-1': 'alkyne', 'alkyne-hx-2': 'alkyne', 'alkyne-x2-1': 'alkyne', 'alkyne-x2-2': 'alkyne', 'alkyne-hydration': 'alkyne', 'alkyne-lindlar': 'alkyne', 'alkyne-h2-pd': 'alkyne', 'alkyne-acetylide': 'alkyne',
  'eas-bromination': 'eas', 'eas-nitration': 'eas', 'eas-sulfonation': 'eas', 'fc-alkylation': 'eas', 'fc-acylation': 'eas',
  'director-activating': 'directors', 'director-halogen': 'directors', 'director-meta': 'directors',
  'side-chain-kmno4': 'sidechain', 'nitro-reduction': 'sidechain', 'side-chain-h2pd': 'sidechain',
  'diels-alder': 'hubonly', 'clemmensen': 'hubonly', 'birch': 'hubonly', 'alkene-hydroboration': 'hubonly', 'alkyne-hydroboration': 'hubonly', 'benzylic-bromination': 'hubonly', 'amine-in-acid': 'hubonly', 'desulfonation': 'hubonly'
};
/** Short names for the 38 cards (the chips of the settings card). */
export const CARD_LABEL = {
  'eas-bromination': 'Br₂, FeBr₃', 'eas-nitration': 'HNO₃, H₂SO₄', 'eas-sulfonation': 'SO₃, H₂SO₄', 'fc-alkylation': 'R–Cl, AlCl₃', 'fc-acylation': 'RCOCl, AlCl₃',
  'director-activating': 'Activator on ring', 'director-halogen': 'Halogen on ring', 'director-meta': 'Deactivator on ring',
  'side-chain-kmno4': 'KMnO₄, side chain', 'nitro-reduction': 'Fe, H₃O⁺ (nitro)', 'side-chain-h2pd': 'H₂, Pd/C, side chain',
  'clemmensen': 'Clemmensen', 'birch': 'Birch', 'benzylic-bromination': 'NBS, heat', 'amine-in-acid': 'Amine in acid', 'desulfonation': 'Desulfonation',
  'oxidation-pcc': 'PCC', 'oxidation-cr': 'Cr(VI)',
  'alkene-hx': 'HBr / HCl', 'alkene-hydration': 'H₂O, H₂SO₄', 'alkene-x2': 'Br₂ / Cl₂', 'alkene-h2-pd': 'H₂, Pd/C', 'alkene-kmno4-base': 'KMnO₄, OH⁻', 'alkene-kmno4-acid': 'KMnO₄, H₃O⁺',
  'alkene-epoxide': 'RCO₃H', 'alkene-epoxide-diol': 'RCO₃H, then H₃O⁺', 'alkene-hydroboration': 'BH₃, then H₂O₂',
  'alkyne-hx-1': 'HX (1 equiv.)', 'alkyne-hx-2': 'HX (2 equiv.)', 'alkyne-x2-1': 'X₂ (1 equiv.)', 'alkyne-x2-2': 'X₂ (2 equiv.)', 'alkyne-hydration': 'H₂O, HgSO₄', 'alkyne-lindlar': 'H₂, Lindlar',
  'alkyne-h2-pd': 'H₂, Pd/C (2 equiv.)', 'alkyne-acetylide': 'NaNH₂, then R–Br', 'alkyne-hydroboration': 'BH₃, then H₂O₂',
  'diene-hx': 'HX on a diene', 'diels-alder': 'Diels–Alder'
};
export const CARD_IDS = HUB_CARDS.map((c) => c.id);
/** The cards by hub group, in hub order: [{ id, label, cards: [ids] }] (for the grouped card chooser). */
export const CARD_GROUPS = HUB_GROUPS.map((g) => ({ id: g.id, label: g.label, cards: HUB_CARDS.filter((c) => c.group === g.id).map((c) => c.id) }));
export const familyOfCard = (id) => FAMILY_OF[id] || 'hubonly';

export const DIFF_IDS = ['', 'easy', 'medium', 'hard'];
export const DIFF_LABEL = { '': 'Any', easy: 'Easy', medium: 'Medium', hard: 'Hard' };
export const STEREO_IDS = ['any', 'has', 'none'];
export const STEREO_LABEL = { any: 'Any', has: 'Only where the product has stereo', none: 'No stereo to show' };

// ---- a small SMILES reader (atoms, bonds, rings): enough to classify the substrates of the pools without RDKit
const ORGANIC = /^(Cl|Br|[BCNOPSFI]|[cnops])/;
/** { atoms: [{ sym, arom }], bonds: [{ a, b, o }], nbrs: [[atom indexes]] } of a SMILES (a '.' makes separate molecules in one graph). */
export function parseSmiles(smi) {
  const atoms = [], bonds = []; let prev = -1, order = null; const stack = [], open = {};
  const link = (a, b, o) => { const arom = atoms[a].arom && atoms[b].arom; bonds.push({ a, b, o: o ?? (arom ? 1.5 : 1) }); };
  const atom = (sym, arom) => { const i = atoms.length; atoms.push({ sym, arom }); if (prev >= 0) link(prev, i, order); prev = i; order = null; };
  for (let i = 0; i < smi.length;) {
    const ch = smi[i];
    if (ch === '[') { const j = smi.indexOf(']', i); const m = /^\d*([A-Z][a-z]?|[a-z]{1,2})/.exec(smi.slice(i + 1, j)); const raw = m ? m[1] : 'C'; atom(raw[0].toUpperCase() + raw.slice(1), /^[a-z]/.test(raw)); i = j + 1; continue; }
    if (ch === '(') { stack.push(prev); i++; continue; }
    if (ch === ')') { prev = stack.pop(); i++; continue; }
    if (ch === '.') { prev = -1; order = null; i++; continue; }
    if (ch === '=') { order = 2; i++; continue; }
    if (ch === '#') { order = 3; i++; continue; }
    if (ch === '-' || ch === ':' || ch === '/' || ch === '\\') { i++; continue; }
    if (/\d/.test(ch) || ch === '%') {
      const d = ch === '%' ? smi.slice(i + 1, i + 3) : ch; i += ch === '%' ? 3 : 1;
      if (open[d]) { link(open[d].atom, prev, order ?? open[d].order); delete open[d]; } else open[d] = { atom: prev, order };
      order = null; continue;
    }
    const m = ORGANIC.exec(smi.slice(i));
    if (!m) { i++; continue; }
    atom(m[1][0].toUpperCase() + m[1].slice(1), /^[a-z]/.test(m[1])); i += m[1].length;
  }
  const nbrs = atoms.map(() => []);
  bonds.forEach((b) => { nbrs[b.a].push(b.b); nbrs[b.b].push(b.a); });
  return { atoms, bonds, nbrs };
}
function inRing(g, bond) {
  const seen = new Set([bond.a]), q = [bond.a];
  while (q.length) { const v = q.shift(); for (const w of g.nbrs[v]) { if ((v === bond.a && w === bond.b) || (v === bond.b && w === bond.a)) continue; if (!seen.has(w)) { seen.add(w); q.push(w); } } }
  return seen.has(bond.b);
}
const orderOf = (g, a, b) => { const x = g.bonds.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a)); return x ? x.o : 0; };
/** Is there an alcohol O–H: an O with one neighbour, a carbon that is not aromatic and not a carbonyl carbon? */
function hasAlcohol(g) {
  return g.atoms.some((a, i) => a.sym === 'O' && !a.arom && g.nbrs[i].length === 1 && (() => {
    const c = g.nbrs[i][0], ca = g.atoms[c];
    return ca.sym === 'C' && !ca.arom && !g.nbrs[c].some((k) => g.atoms[k].sym !== 'C' && orderOf(g, c, k) === 2);
  })());
}
/** The substrate class of a starting material (the first that applies: alcohol, arene, alkyne, diene, cycloalkene, alkene). */
export function substrateClass(smi) {
  const g = parseSmiles(String(smi));
  if (hasAlcohol(g)) return 'alcohols';
  if (g.atoms.some((a) => a.arom)) return 'arenes';
  const cc = (o) => g.bonds.filter((b) => b.o === o && g.atoms[b.a].sym === 'C' && g.atoms[b.b].sym === 'C');
  if (cc(3).length) return 'alkynes';
  const dbl = cc(2);
  if (dbl.length >= 2) return 'dienes';
  if (dbl.length === 1) return inRing(g, dbl[0]) ? 'cycloalkenes' : 'alkenes';
  return 'alkenes';
}
/**
 * The difficulty tier of a starting material. Score = how crowded it is: for a ring, the groups on the ring (a ring joined to another ring counts too) plus branched
 * carbons in its side chains; for the rest, the alkyl or other groups on the multiple-bond carbons plus branched carbons elsewhere. A big skeleton adds 1 (10 heavy atoms, or 12 for a ring),
 * and 1 more (13, or 15). Rings: score 0-1 easy (benzene, toluene, chlorobenzene: the textbook substrates), 2 medium, 3+ hard. Others: 0-2 easy, 3 medium, 4+ hard.
 */
export function difficultyOf(smi) {
  const g = parseSmiles(String(smi));
  const arom = g.atoms.some((a) => a.arom);
  const unsat = new Set(g.bonds.filter((b) => b.o >= 2 && b.o !== 1.5).flatMap((b) => [b.a, b.b]));
  const carbonNbrs = (i) => g.nbrs[i].filter((k) => g.atoms[k].sym === 'C').length;
  let score = 0;
  g.atoms.forEach((a, i) => {
    if (a.arom) {
      for (const k of g.nbrs[i]) {
        if (!g.atoms[k].arom) score++;
        else if (!inRing(g, g.bonds.find((e) => (e.a === i && e.b === k) || (e.a === k && e.b === i)))) score++;   // the link between two rings
      }
    } else if (a.sym === 'C' && !arom && unsat.has(i)) score += g.nbrs[i].filter((k) => !unsat.has(k)).length;
    if (a.sym === 'C' && !a.arom && !unsat.has(i) && carbonNbrs(i) >= 3) score++;
  });
  const big = arom ? [12, 15] : [10, 13];
  score += (g.atoms.length >= big[0] ? 1 : 0) + (g.atoms.length >= big[1] ? 1 : 0);
  const [lo, hi] = arom ? [1, 2] : [2, 3];
  return score <= lo ? 'easy' : score <= hi ? 'medium' : 'hard';
}
/** Does any product of a reaction show stereo (a carbon with four different groups, or a C=C with a fixed E/Z label)? Needs RDKit (engine/chem.js ready). */
export function productStereo(products) {
  return (products || []).flatMap((s) => String(s).split('.')).some((p) => {
    let nC = 0, ez = false;
    try { nC = (chiralCenters(p) || []).length; ez = (ezInfo(p) || []).some((e) => e.capable && e.label); } catch (e) { return false; }
    return nC > 0 || ez;
  });
}
export const groupOfCard = (id) => HUB_BY_ID[id].group;
