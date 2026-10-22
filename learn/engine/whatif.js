// Piece 2 (what-if branching): from the mechanism a lesson step plays, find the OTHER reagents the course has a real mechanism for, on the same substrate.
// Pure data, no DOM. The mechanism player shows one chip per alternative on its final state, replays the alternative's mechanism from the start,
// and ends with both products side by side, each with the three facts of its hub card.
//
//   kindOf(mech)      -> { kind, ... } | null     kind: 'alkene-hx' | 'alkene-x2' | 'alkene-hydration' | 'alkyne-hx' | 'eas'
//   whatIfFor(mech)   -> { origin, options } | null  (null = nothing to offer, so the player shows nothing)
//       origin  { kind, label, cardId, product }
//       options [{ id, kind, label, cardId, product, mech }]      `mech` always has at least one step; `product` is the organic product (canonical SMILES)
//   CARD_OF           the stable reagent -> hub card id map (tests check every id exists)
import { canon } from './chem.js';
import * as R from './reactions.js';
import { HUB_BY_ID } from './reaction-hub.js';

/** Reagent key -> hub card id. A key with no card (Cl2, I2 on benzene) has no entry: the side-by-side then shows the product without facts. */
export const CARD_OF = {
  hx: 'alkene-hx', x2: 'alkene-x2', hydration: 'alkene-hydration', 'alkyne-hx': 'alkyne-hx-1', acetylide: 'alkyne-acetylide',
  Br2: 'eas-bromination', HNO3: 'eas-nitration', SO3: 'eas-sulfonation', RCl: 'fc-alkylation', RCOCl: 'fc-acylation'
};
export const cardFor = (key) => (CARD_OF[key] ? HUB_BY_ID[CARD_OF[key]] || null : null);

const HALIDES = ['Cl', 'Br', 'I'];
const sites = (smi) => { try { return R.alkeneSites(smi); } catch (e) { return { ok: false }; } };
const asites = (smi) => { try { return R.alkyneSites(smi); } catch (e) { return { ok: false }; } };
const isCharged = (smi) => /\[[^\]]*[+-]\d*\]/.test(smi);
/** The organic product out of a mechanism's product list: the neutral molecule with the most heavy atoms (the others are H3O+, Br-, the catalyst ...). */
export function organicProduct(products) {
  const heavy = (s) => (s.match(/Cl|Br|[BCNOSPFI]|[cnos]/g) || []).length;
  const neutral = products.filter((p) => !isCharged(p) && /[Cc]/.test(p) && !/Fe|Al/.test(p));
  return (neutral.sort((a, b) => heavy(b) - heavy(a))[0]) || null;
}

/** What the mechanism is, from its own data (no tag on the lesson step needed). */
export function kindOf(mech) {
  if (!mech || !Array.isArray(mech.reactants) || !mech.steps || !mech.steps.length) return null;
  if (mech.reagent && R.EAS[mech.reagent]) return { kind: 'eas', reagent: mech.reagent, halide: mech.halide || null };
  const [a, b] = mech.reactants;
  if (typeof a !== 'string' || typeof b !== 'string') return null;
  if (HALIDES.includes(b)) {
    if (sites(a).ok) return { kind: 'alkene-hx', alkene: a, X: b };
    if (/#/.test(a) && asites(a).ok) return { kind: 'alkyne-hx', alkyne: a, X: b };
  } else if (b === '[OH3+]' && sites(a).ok) return { kind: 'alkene-hydration', alkene: a };
  else if ((b === 'BrBr' || b === 'ClCl') && sites(a).ok) return { kind: 'alkene-x2', alkene: a, X: b.slice(0, -2) };
  return null;
}

const subs = (n) => String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]);
const attempt = (f) => { try { return f(); } catch (e) { return null; } };
const opt = (id, kind, label, cardKey, mech, product, meta) => (mech && mech.steps && mech.steps.length && product ? { id, kind, label, cardId: CARD_OF[cardKey] || null, product, mech, meta } : null);

// ---- builders: each returns an option or null (null = the course has no mechanism for that alkene or reagent)
const hxOpt = (alkene, X) => attempt(() => {
  const m = R.predict(alkene, 'H' + X).major[0].mech;
  return opt('hx-' + X, 'alkene-hx', 'H' + X, 'hx', m, organicProduct(m.products), { substrate: alkene, X });
});
const hydOpt = (alkene) => attempt(() => {
  const m = R.predict(alkene, 'H2O').major[0].mech;
  return opt('hydration', 'alkene-hydration', 'H₂O, H⁺', 'hydration', m, organicProduct(m.products), { substrate: alkene });
});
const x2Opt = (alkene, X) => attempt(() => {
  const m = R.halogenMechanism(alkene, X);
  return opt('x2-' + X, 'alkene-x2', `${X}${subs(2)}`, 'x2', m, organicProduct(m.products), { substrate: alkene, X });
});
const alkyneHxOpt = (alkyne, X) => attempt(() => {
  const m = R.alkyneHXMechanism(alkyne, X);
  return opt('alkyne-hx-' + X, 'alkyne-hx', 'H' + X, 'alkyne-hx', m, organicProduct(m.products), { substrate: alkyne, X });
});
const acetylideOpt = (alkyne) => attempt(() => {
  const m = R.acetylideAlkylationMechanism(alkyne, 'CBr');
  return opt('acetylide', 'acetylide', 'NaNH₂, then CH₃Br', 'acetylide', m, organicProduct(m.products), { substrate: alkyne, halide: 'CBr' });
});
const easLabel = (reagent, halide) => (reagent === 'RCl' || reagent === 'RCOCl' ? `${R.halideText(halide)}, AlCl₃` : R.EAS[reagent].label);
const easOpt = (reagent, halide) => attempt(() => {
  const m = R.easMechanism(reagent, halide);
  return opt('eas-' + reagent + (halide ? '-' + halide : ''), 'eas', easLabel(reagent, halide), reagent, m, m.pred.product, { reagent, halide });
});

const originOf = (k, mech) => {
  const prod = k.kind === 'eas' ? (mech.pred && mech.pred.product) : organicProduct(mech.products);
  const label = k.kind === 'eas' ? easLabel(k.reagent, k.halide) : { 'alkene-hx': 'H' + k.X, 'alkene-hydration': 'H₂O, H⁺', 'alkene-x2': k.X + subs(2), 'alkyne-hx': 'H' + k.X }[k.kind];
  const key = { 'alkene-hx': 'hx', 'alkene-hydration': 'hydration', 'alkene-x2': 'x2', 'alkyne-hx': 'alkyne-hx', eas: k.reagent }[k.kind];
  return { kind: k.kind, label, cardId: CARD_OF[key] || null, product: prod };
};

/** The what-if for a mechanism, or null when there is nothing to offer. */
export function whatIfFor(mech) {
  const k = kindOf(mech);
  if (!k) return null;
  let list = [];
  if (k.kind === 'alkene-hx') list = [x2Opt(k.alkene, 'Br'), hydOpt(k.alkene)];
  else if (k.kind === 'alkene-x2') list = [hxOpt(k.alkene, k.X === 'Cl' ? 'Cl' : 'Br'), hydOpt(k.alkene)];
  else if (k.kind === 'alkene-hydration') list = [hxOpt(k.alkene, 'Br'), x2Opt(k.alkene, 'Br')];
  else if (k.kind === 'alkyne-hx') list = [alkyneHxOpt(k.alkyne, k.X === 'Br' ? 'Cl' : 'Br'), acetylideOpt(k.alkyne)];
  else if (k.kind === 'eas') {
    const here = (r, h) => k.reagent === r && (k.halide || null) === (h || null);
    list = [['HNO3', null], ['SO3', null], ['RCl', 'CCCl'], ['RCOCl', 'CC(=O)Cl']].filter(([r, h]) => !here(r, h)).map(([r, h]) => easOpt(r, h));
  }
  const options = list.filter(Boolean);
  const origin = originOf(k, mech);
  if (!options.length || !origin.product) return null;
  return { origin, options };
}

/** Same molecule? (canonical SMILES with stereo) */
export const sameMolecule = (a, b) => canon(a) === canon(b);
