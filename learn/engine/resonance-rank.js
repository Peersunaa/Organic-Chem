// Ranking resonance contributors (McMurry 4.10, the three rules). Pure logic, no DOM.
//   Rule 1  more atoms with a complete octet (more covalent bonds) = better            -> fewer octet gaps wins
//   Rule 3  fewer formal charges and less charge separation = better                    -> fewer charges wins (a neutral amide form beats the charge-separated one)
//   Rule 2  a negative charge sits better on the more electronegative atom, a positive charge on the less electronegative one -> smaller electronegativity penalty wins
//   tie-break for carbon cations: more carbon neighbours (3° > 2° > 1°), for carbanions fewer.
// Two forms with the same key contribute EQUALLY (acetate, the allyl cation, nitromethane).
// RANK_POOL holds the systems the generator asks about: engine-enumerated forms where enumerate() reaches them, otherwise a hand-written pair that
// compareForm() proves to be true resonance forms of each other (same atoms, same σ framework, same charge, octets kept); tests re-derive every verdict from
// an independent hand table (tests/fixtures/resonance-rank.json) and run every form through compareForm and RDKit.
import { ENEG, VALENCE } from './chem.js';
import { stateOf, enumerate, compareForm } from './resonance.js';

const orderSum = (st, i) => st.bonds.reduce((s, b) => s + (b.a === i || b.b === i ? b.order : 0), 0) + st.impH[i];
const lpOf = (st, i) => (VALENCE[st.el[i]] - st.charge[i] - orderSum(st, i)) / 2;
const electrons = (st, i) => 2 * orderSum(st, i) + 2 * lpOf(st, i);
const carbonNbrs = (st, i) => st.bonds.filter((b) => b.a === i || b.b === i).map((b) => (b.a === i ? b.b : b.a)).filter((j) => st.el[j] === 'C').length;

/** The ranking key of a state: [octetGaps, charges, enegPenalty, substitutionPenalty]; smaller is the better contributor. */
export function rankKey(st) {
  let gaps = 0, charges = 0, eneg = 0, subst = 0;
  for (let i = 0; i < st.el.length; i++) {
    const el = st.el[i], q = st.charge[i];
    if (el !== 'H' && electrons(st, i) < 8) gaps++;
    charges += Math.abs(q);
    if (q < 0) eneg += (4 - ENEG[el]) * -q;          // a − charge on O (3.5) costs 0.5, on C (2.5) 1.5
    if (q > 0) eneg += (ENEG[el] - 2) * q;           // a + charge on C (2.5) costs 0.5, on O (3.5) 1.5
    if (el === 'C' && q > 0) subst += 3 - carbonNbrs(st, i);
    if (el === 'C' && q < 0) subst += carbonNbrs(st, i);
  }
  return [gaps, charges, Math.round(eneg * 100) / 100, subst];
}
const cmpKey = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
export const RULE_NAMES = ['octets', 'charges', 'electronegativity', 'substitution'];
/** Which rule separates two keys (null when equal). */
export function decidingRule(a, b) { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return RULE_NAMES[i]; return null; }

/**
 * Rank forms (SMILES) -> { order: [indices best first], major: index | null (null = the best ones tie), equal: bool (every form ties), keys, rule (the rule that separates
 * the best from the next, or null) }.
 */
export function rankForms(smilesList) {
  const keys = smilesList.map((s) => rankKey(stateOf(s)));
  const order = keys.map((k, i) => i).sort((i, j) => cmpKey(keys[i], keys[j]) || i - j);
  const best = keys[order[0]];
  const ties = order.filter((i) => cmpKey(keys[i], best) === 0);
  const equal = ties.length === keys.length;
  const major = ties.length === 1 ? order[0] : null;
  const rule = equal ? null : decidingRule(best, keys[order[ties.length === 1 ? 1 : ties.length]] || best);
  return { order, major, equal, keys, rule };
}

/** Why a chosen form loses to the major one, in the words of the rule. */
export function whyWorse(keyLoser, keyWinner) {
  const r = decidingRule(keyWinner, keyLoser);
  if (r === 'octets') return `Rule 1: the better form has more atoms with a complete octet (this one has ${keyLoser[0]} atom${keyLoser[0] === 1 ? '' : 's'} short of an octet, the major form ${keyWinner[0]}). More covalent bonds and full octets win first.`;
  if (r === 'charges') return `Rule 3: this form carries ${keyLoser[1]} formal charge${keyLoser[1] === 1 ? '' : 's'}, the major form ${keyWinner[1]}. With the octets equal, fewer charges and less charge separation win.`;
  if (r === 'electronegativity') return 'Rule 2: with the octets and the number of charges equal, a negative charge sits better on the more electronegative atom (O before C) and a positive charge on the less electronegative one.';
  if (r === 'substitution') return 'Tie-break: a positive charge is better on the more substituted carbon (3° > 2° > 1°), a negative one on the less substituted carbon.';
  return 'These two forms are equivalent: they contribute equally.';
}
export const RULE_TEXT = {
  octets: 'the form with every atom holding a full octet (more covalent bonds) is the major contributor',
  charges: 'the form with fewer formal charges (no charge separation) is the major contributor',
  electronegativity: 'the negative charge belongs on the more electronegative atom, the positive one on the less electronegative atom',
  substitution: 'the positive charge is better on the more substituted carbon'
};

/**
 * Systems for the "which form matters most?" task.
 *   start, name            the species and how the prompt calls it
 *   forms?                 hand-written forms when enumerate() cannot reach them (the lone pair -> empty orbital move); otherwise the engine's forms are used
 *   fold?                  rings: the two Kekulé drawings count once
 *   pick?                  which enumerated forms to show (indices into enumerate()), default: the first three
 */
export const RANK_POOL = [
  { id: 'acetaldehyde-enolate', start: 'C=C[O-]', name: 'enolate ion of acetaldehyde' },
  { id: 'acetone-enolate', start: 'C=C(C)[O-]', name: 'enolate ion of acetone' },
  { id: 'acetamide', start: 'CC(=O)N', name: 'acetamide' },
  { id: 'formamide', start: 'O=CN', name: 'formamide' },
  { id: 'methyl-acetate', start: 'CC(=O)OC', name: 'methyl acetate' },
  { id: 'vinyl-chloride', start: 'C=CCl', name: 'chloroethene (vinyl chloride)' },
  { id: 'phenoxide', start: '[O-]c1ccccc1', name: 'phenoxide ion', fold: true, pick: [0, 1, 2] },
  { id: 'protonated-acetone', start: 'CC(C)=[OH+]', name: 'protonated acetone', forms: ['CC(C)=[OH+]', 'C[C+](C)O'] },
  { id: 'protonated-formaldehyde', start: 'C=[OH+]', name: 'protonated formaldehyde', forms: ['C=[OH+]', '[CH2+]O'] },
  { id: 'methoxymethyl-cation', start: 'CO[CH2+]', name: 'methoxymethyl cation', forms: ['CO[CH2+]', 'C[O+]=C'] },
  { id: 'acrolein', start: 'C=CC=O', name: 'propenal (acrolein)', forms: ['C=CC=O', '[CH2+]C=C[O-]'] },
  { id: 'vinylamine', start: 'C=CN', name: 'ethenamine (vinylamine)', forms: ['C=CN', '[CH2-]C=[NH2+]'] },
  { id: 'iminium', start: 'C=[NH2+]', name: 'methaniminium ion', forms: ['C=[NH2+]', '[CH2+]N'] },
  { id: 'acetate', start: 'CC(=O)[O-]', name: 'acetate ion' },
  { id: 'allyl-cation', start: '[CH2+]C=C', name: 'allyl cation' },
  { id: 'nitromethane', start: 'C[N+](=O)[O-]', name: 'nitromethane' },
  { id: 'carbonate', start: 'O=C([O-])[O-]', name: 'carbonate ion' }
];
export const RANK_BY_ID = Object.fromEntries(RANK_POOL.map((s) => [s.id, s]));

/** The forms shown for a pool entry (SMILES, the start first) and the verdict. */
export function rankSystem(sys) {
  let forms;
  if (sys.forms) forms = sys.forms.slice();
  else {
    const all = enumerate(sys.start, { fold: !!sys.fold }).map((f) => f.smiles);
    forms = (sys.pick || [0, 1, 2]).filter((i) => i < all.length).map((i) => all[i]);
  }
  return { forms, ...rankForms(forms) };
}
/** Every hand-written pair must pass compareForm against its start (the tests call this; the generator trusts it). */
export function checkPool() {
  return RANK_POOL.map((sys) => ({ id: sys.id, forms: (sys.forms || [sys.start]).map((f) => ({ smiles: f, ...compareForm(sys.start, f) })) }));
}
