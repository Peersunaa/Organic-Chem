// pKa data (McMurry Table 1.2 and the text of section 1.10/1.11) and helpers built on it.
// Every acid/base fact in Lesson 03 and its generator comes from this table; nothing is typed per problem.
import { rdkit, canon } from './chem.js';

const MINUS = '−';

/**
 * id, names, SMILES of the acid (ha) and its conjugate base (a), the index of the heavy atom that
 * carries the acidic H (site), display labels, and the pKa. `a` is verified in the tests by
 * actually removing H+ from `ha` at `site` with RDKit.
 */
export const ACIDS = [
  { id: 'ethanol', name: 'ethanol', haLabel: 'CH₃CH₂OH', ha: 'CCO', site: 2, aName: 'ethoxide ion', aLabel: 'CH₃CH₂O⁻', a: 'CC[O-]', pka: 16.00, pkaText: '16.00' },
  { id: 'water', name: 'water', haLabel: 'H₂O', ha: 'O', site: 0, aName: 'hydroxide ion', aLabel: 'HO⁻', a: '[OH-]', pka: 15.74, pkaText: '15.74' },
  { id: 'hcn', name: 'hydrocyanic acid', haLabel: 'HCN', ha: 'C#N', site: 0, aName: 'cyanide ion', aLabel: 'CN⁻', a: '[C-]#N', pka: 9.31, pkaText: '9.31' },
  { id: 'h2po4', name: 'dihydrogen phosphate ion', haLabel: 'H₂PO₄⁻', ha: 'OP(=O)(O)[O-]', site: 0, aName: 'hydrogen phosphate ion', aLabel: 'HPO₄²⁻', a: 'OP(=O)([O-])[O-]', pka: 7.21, pkaText: '7.21' },
  { id: 'acetic', name: 'acetic acid', haLabel: 'CH₃CO₂H', ha: 'CC(=O)O', site: 3, aName: 'acetate ion', aLabel: 'CH₃CO₂⁻', a: 'CC(=O)[O-]', pka: 4.76, pkaText: '4.76' },
  { id: 'h3po4', name: 'phosphoric acid', haLabel: 'H₃PO₄', ha: 'OP(=O)(O)O', site: 0, aName: 'dihydrogen phosphate ion', aLabel: 'H₂PO₄⁻', a: 'OP(=O)(O)[O-]', pka: 2.16, pkaText: '2.16' },
  { id: 'hno3', name: 'nitric acid', haLabel: 'HNO₃', ha: 'O[N+](=O)[O-]', site: 0, aName: 'nitrate ion', aLabel: 'NO₃⁻', a: '[O-][N+](=O)[O-]', pka: -1.3, pkaText: MINUS + '1.3' },
  { id: 'hcl', name: 'hydrochloric acid', haLabel: 'HCl', ha: 'Cl', site: 0, aName: 'chloride ion', aLabel: 'Cl⁻', a: '[Cl-]', pka: -7.0, pkaText: MINUS + '7.0' },
  { id: 'acetone', name: 'acetone', haLabel: 'CH₃COCH₃', ha: 'CC(=O)C', site: 0, aName: 'acetone anion', aLabel: 'CH₃COCH₂⁻', a: 'CC(=O)[CH2-]', pka: 19.3, pkaText: '19.3' },
  { id: 'acetylene', name: 'acetylene', haLabel: 'HC≡CH', ha: 'C#C', site: 0, aName: 'acetylide ion', aLabel: 'HC≡C⁻', a: 'C#[C-]', pka: 25, pkaText: '25' },
  { id: 'ammonia', name: 'ammonia', haLabel: 'NH₃', ha: 'N', site: 0, aName: 'amide ion', aLabel: 'NH₂⁻', a: '[NH2-]', pka: 36, pkaText: '≈ 36' }
];
export const ACID = Object.fromEntries(ACIDS.map((x) => [x.id, x]));

/** pKa as it should be shown: text from the table (e.g. "−7.0", "≈ 36"). */
export const pkaShown = (id) => ACID[id].pkaText;

/** Sort helper: the stronger acid has the smaller pKa. */
export function strongerAcid(ids) { return ids.reduce((best, id) => (ACID[id].pka < ACID[best].pka ? id : best)); }
export function weakerAcid(ids) { return ids.reduce((best, id) => (ACID[id].pka > ACID[best].pka ? id : best)); }

/**
 * Equilibrium  HA(i) + A(j)-  <=>  A(i)- + HA(j).
 * The acid on the left is HA(i), the acid on the right is HA(j). The side with the weaker acid
 * (the larger pKa) is favoured.
 */
export function reaction(i, j) {
  const A = ACID[i], B = ACID[j];
  return {
    ids: [i, j],
    left: [{ label: A.haLabel, name: A.name, smiles: A.ha, role: 'acid', pka: A.pka, pkaText: A.pkaText }, { label: B.aLabel, name: B.aName, smiles: B.a, role: 'base' }],
    right: [{ label: A.aLabel, name: A.aName, smiles: A.a, role: 'base' }, { label: B.haLabel, name: B.name, smiles: B.ha, role: 'acid', pka: B.pka, pkaText: B.pkaText }],
    reactants: [A.ha, B.a],
    products: [A.a, B.ha],
    text: `${A.haLabel} + ${B.aLabel} ⇌ ${A.aLabel} + ${B.haLabel}`,
    favoured: B.pka > A.pka ? 'right' : 'left'
  };
}
export function favoured(i, j) { return reaction(i, j).favoured; }

// ---- RDKit editing: add or remove H+ on one heavy atom (used by generators and tests)
function editSmiles(smiles, idx, dChg, dH) {
  const R = rdkit();
  const m = R.get_mol(smiles);
  if (!m) return null;
  let out = null;
  try {
    const j = JSON.parse(m.get_json());
    const at = j.molecules[0].atoms[idx];
    at.chg = (at.chg ?? 0) + dChg;
    at.impHs = (at.impHs ?? 0) + dH;
    if (at.impHs < 0) return null;
    const m2 = R.get_mol(JSON.stringify(j));
    if (m2) { try { out = m2.get_smiles(); } finally { m2.delete(); } }
  } finally { m.delete(); }
  return out;
}
/** Remove H+ from heavy atom `idx` (charge -1, one H fewer). */
export function deprotonate(smiles, idx) { return editSmiles(smiles, idx, -1, -1); }
/** Add H+ to heavy atom `idx` (charge +1, one H more); null when RDKit rejects the valence. */
export function protonate(smiles, idx) { return editSmiles(smiles, idx, +1, +1); }

/** Conjugate base of an acid computed from its structure (independent of the stored `a`). */
export function conjugateBase(id) { const A = ACID[id]; return canon(deprotonate(A.ha, A.site)); }

// ---- display labels -> element counts and charge (tests check labels against the SMILES)
const SUB = { '₀': 0, '₁': 1, '₂': 2, '₃': 3, '₄': 4, '₅': 5, '₆': 6, '₇': 7, '₈': 8, '₉': 9 };
const SUP = { '²': 2, '³': 3 };
export function labelCounts(label) {
  const counts = {};
  const m = /^(.*?)((?:[²³])?[⁺⁻])?$/.exec(label);
  const body = m[1], ch = m[2] || '';
  for (const t of body.matchAll(/([A-Z][a-z]?)([₀-₉]*)/g)) {
    const n = t[2] ? Number([...t[2]].map((c) => SUB[c]).join('')) : 1;
    counts[t[1]] = (counts[t[1]] || 0) + n;
  }
  let charge = 0;
  if (ch) { const sign = ch.endsWith('⁺') ? 1 : -1; const mag = ch.length > 1 ? SUP[ch[0]] : 1; charge = sign * mag; }
  return { counts, charge };
}

/**
 * Lewis role of a species from its structure. An atom short of an octet (duet for H) makes it an acid,
 * even when other atoms carry lone pairs (BF3: the F lone pairs are tied up in a bond-rich molecule and the
 * electron-poor B is the site that matters). Otherwise a lone pair to give makes it a base.
 */
export function lewisRole(info) {
  const hasLp = info.atoms.some((a) => a.lp > 0);
  const short = info.atoms.some((a) => (a.sym === 'H' ? a.electrons < 2 : a.electrons < 8));
  if (short) return 'acid';
  return hasLp ? 'base' : 'neither';
}
