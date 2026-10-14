// Alkynes and their reactions (McMurry 4.11). Re-exported by engine/reactions.js (additive; nothing of Lessons 09 to 11 changes).
//
// For an acyclic hydrocarbon with exactly ONE C≡C (`alkyneSites`), the engine builds every product by editing the structure's graph
// (bond orders, new atoms) and writing a SMILES with explicit cis/trans marks, so the geometry follows from the edit and is graded by canonical
// ISOMERIC SMILES:
//   HX      1 equiv: vinylic halide, H on the carbon with the H (terminal alkyne), X on the other (Markovnikov)      [no E/Z claimed: the book gives none]
//           2 equiv: geminal dihalide (both X on the same carbon, again Markovnikov)
//   X2      1 equiv: 1,2-dihaloalkene, ANTI addition (the two X on opposite sides: (E) for these groups; the book shows (E)-1,2-dibromobut-1-ene)
//           2 equiv: 1,1,2,2-tetrahaloalkane
//   H2O, H2SO4, HgSO4: Markovnikov enol that tautomerises to the ketone (the equilibrium strongly favours the ketone); a terminal alkyne gives a methyl
//           ketone, a symmetrical internal alkyne one ketone, an unsymmetrical internal alkyne a MIXTURE of both ketones (the book says so).
//           Acetylene itself would give an aldehyde: not in the book, refused.
//   H2 (2 equiv), Pd/C: the alkane.      H2, Lindlar catalyst: stops at the alkene, SYN addition, so an internal alkyne gives the cis (Z) alkene.
// Refused (not in the book): unsymmetrical internal alkynes with HX, rings, enynes, hydroboration, Na/NH3 (trans alkenes).
// Also here: the acid-base facts of terminal alkynes (computed from engine/acidbase.js), the acetylide alkylation product, and mechanism data for
// HX addition (a book-level 2-step through a vinylic cation), acetylide formation and acetylide alkylation (checkMechanism proves every step).
import { analyze, canon } from './chem.js';
import { buildScene, stepResult, canonFlat } from './widgets/mechanism-core.js';
import { buildMolblock } from './widgets/lewis-core.js';
import { nameBothAny } from './naming-chain.js';
import { reaction as acidReaction, ACID } from './acidbase.js';

// ---------------------------------------------------------------- reagents (key = reagent + equivalents)
export const ALKYNE_RXN = {
  HCl_1: { key: 'HCl_1', kind: 'HX', X: 'Cl', equiv: 1, label: 'HCl (1 equiv.)', hx: 'Cl' },
  HCl_2: { key: 'HCl_2', kind: 'HX', X: 'Cl', equiv: 2, label: 'HCl (2 equiv.)', hx: 'Cl' },
  HBr_1: { key: 'HBr_1', kind: 'HX', X: 'Br', equiv: 1, label: 'HBr (1 equiv.)', hx: 'Br' },
  HBr_2: { key: 'HBr_2', kind: 'HX', X: 'Br', equiv: 2, label: 'HBr (2 equiv.)', hx: 'Br' },
  HI_1: { key: 'HI_1', kind: 'HX', X: 'I', equiv: 1, label: 'HI (1 equiv.)', hx: 'I' },
  HI_2: { key: 'HI_2', kind: 'HX', X: 'I', equiv: 2, label: 'HI (2 equiv.)', hx: 'I' },
  Br2_1: { key: 'Br2_1', kind: 'X2', X: 'Br', equiv: 1, label: 'Br₂ (1 equiv.)', mol: 'BrBr' },
  Br2_2: { key: 'Br2_2', kind: 'X2', X: 'Br', equiv: 2, label: 'Br₂ (2 equiv.)', mol: 'BrBr' },
  Cl2_1: { key: 'Cl2_1', kind: 'X2', X: 'Cl', equiv: 1, label: 'Cl₂ (1 equiv.)', mol: 'ClCl' },
  Cl2_2: { key: 'Cl2_2', kind: 'X2', X: 'Cl', equiv: 2, label: 'Cl₂ (2 equiv.)', mol: 'ClCl' },
  H2O_Hg: { key: 'H2O_Hg', kind: 'hydration', equiv: 1, label: 'H₂O, H₂SO₄, HgSO₄' },
  H2_Lindlar: { key: 'H2_Lindlar', kind: 'lindlar', equiv: 1, label: 'H₂, Lindlar catalyst' },
  H2_Pd: { key: 'H2_Pd', kind: 'pd', equiv: 2, label: 'H₂ (2 equiv.), Pd/C' }
};
export const ALKYNE_KEYS = Object.keys(ALKYNE_RXN);
/** The reagents the reaction lab offers. */
export const ALKYNE_LAB_KEYS = ['HBr_1', 'HBr_2', 'Br2_1', 'Br2_2', 'H2O_Hg', 'H2_Lindlar', 'H2_Pd'];

/** Alkynes of the reaction lab and the generator (unbranched, so every product can be named); both IUPAC styles come from the naming engines. */
export const LAB_ALKYNES = [
  { id: 'acetylene', smiles: 'C#C' },
  { id: 'propyne', smiles: 'CC#C' },
  { id: 'but-1-yne', smiles: 'CCC#C' },
  { id: 'but-2-yne', smiles: 'CC#CC' },
  { id: 'pent-1-yne', smiles: 'CCCC#C' },
  { id: 'hex-1-yne', smiles: 'CCCCC#C' },
  { id: 'hex-2-yne', smiles: 'CC#CCCC' },
  { id: 'hex-3-yne', smiles: 'CCC#CCC' },
  { id: 'oct-4-yne', smiles: 'CCCC#CCCC' },
  { id: 'dec-5-yne', smiles: 'CCCCC#CCCCC' }
];
export const ALKYNE_BY_ID = Object.fromEntries(LAB_ALKYNES.map((a) => [a.id, a]));
export const alkyneName = (smiles) => nameBothAny(smiles);

// ---------------------------------------------------------------- tiny acyclic molecule graph with a SMILES writer that carries cis / trans
const clone = (g) => JSON.parse(JSON.stringify(g));
function readGraph(smiles) {
  const info = analyze(smiles);
  return { atoms: info.atoms.map((a) => ({ el: a.sym, q: a.fc })), bonds: info.bonds.map((b) => ({ a: b.atoms[0], b: b.atoms[1], o: b.bo ?? 1 })) };
}
const bondAt = (g, a, b) => g.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
const setOrder = (g, a, b, o) => { bondAt(g, a, b).o = o; };
function addAtom(g, el, to, o = 1) { g.atoms.push({ el, q: 0 }); g.bonds.push({ a: to, b: g.atoms.length - 1, o }); return g.atoms.length - 1; }
const nbrs = (g, c) => g.bonds.filter((x) => x.a === c || x.b === c).map((x) => (x.a === c ? x.b : x.a));

/** SMILES of an ACYCLIC graph. stereo = {sa, a, b, sb, trans}: written from atom sa so that the bonds sa-a and b-sb carry / or \ (cis: sa/a=b\sb, trans: sa/a=b/sb). */
function writeSmiles(g, stereo = null) {
  const adj = Array.from({ length: g.atoms.length }, () => []);
  g.bonds.forEach((b) => { adj[b.a].push({ to: b.b, o: b.o }); adj[b.b].push({ to: b.a, o: b.o }); });
  const sym = (i) => { const a = g.atoms[i]; return a.q ? `[${a.el}${a.q > 0 ? '+' : '-'}${Math.abs(a.q) > 1 ? Math.abs(a.q) : ''}]` : a.el; };
  const bs = (o) => (o === 2 ? '=' : o === 3 ? '#' : '');
  const mark = (from, to) => (stereo && from === stereo.sa && to === stereo.a ? '/' : stereo && from === stereo.b && to === stereo.sb ? (stereo.trans ? '/' : '\\') : '');
  const emit = (v, parent) => {
    let s = sym(v);
    const kids = adj[v].filter((k) => k.to !== parent);
    kids.forEach((k, i) => {
      const sub = (k.o > 1 ? bs(k.o) : mark(v, k.to)) + emit(k.to, v);
      s += i < kids.length - 1 ? '(' + sub + ')' : sub;
    });
    return s;
  };
  return emit(stereo ? stereo.sa : 0, -1);
}
const flat = (smi) => canonFlat(smi);
const iso = (smi) => canon(smi);

// ---------------------------------------------------------------- reading an alkyne
/**
 * {ok:true, smiles, g, carbons:[a,b], nH:[nHa, nHb], terminal: a or b (the carbon bearing the H) | null, bothTerminal} for an acyclic hydrocarbon with exactly one
 * C≡C, or {ok:false, reason}.
 */
export function alkyneSites(smiles) {
  if (typeof smiles !== 'string' || !smiles) return { ok: false, reason: 'no structure' };
  if (/[a-z]/.test(smiles.replace(/Cl|Br/g, ''))) return { ok: false, reason: 'aromatic rings are covered in Chapter 5' };
  let info = null;
  try { info = analyze(smiles); } catch (e) { info = null; }
  if (!info) return { ok: false, reason: 'not a valid structure' };
  if (info.atoms.some((a) => a.sym !== 'C' || a.fc !== 0)) return { ok: false, reason: 'only hydrocarbons without charges are covered' };
  if (info.bonds.length !== info.atoms.length - 1) return { ok: false, reason: 'rings are not covered here (acyclic alkynes only)' };
  const trip = info.bonds.filter((b) => (b.bo ?? 1) === 3);
  if (info.bonds.some((b) => (b.bo ?? 1) === 2)) return { ok: false, reason: 'enynes (a C=C and a C≡C in one molecule) are not covered' };
  if (trip.length !== 1) return { ok: false, reason: trip.length ? 'only one C≡C is covered here' : 'there is no C≡C' };
  const [a, b] = trip[0].atoms;
  const nH = [info.atoms[a].impH, info.atoms[b].impH];
  const withH = [a, b].filter((c, i) => nH[i] === 1);
  return { ok: true, smiles, g: readGraph(smiles), carbons: [a, b], nH, terminal: withH.length === 1 ? withH[0] : null, bothTerminal: withH.length === 2 };
}

export const isTerminal = (alkyne) => { const s = alkyneSites(alkyne); return s.ok && (s.terminal !== null || s.bothTerminal); };

// ---------------------------------------------------------------- building products
/** spec: {t, at?, X?, anti?, stereo?}. Returns the SMILES (not yet canonical). */
function make(s, spec) {
  const g = clone(s.g);
  const [a, b] = s.carbons;
  switch (spec.t) {
    case 'vinylHalide': setOrder(g, a, b, 2); addAtom(g, spec.X, spec.at); return writeSmiles(g);
    case 'geminal': setOrder(g, a, b, 1); addAtom(g, spec.X, spec.at); addAtom(g, spec.X, spec.at); return writeSmiles(g);
    case 'vicinal': { // X on each carbon, C=C kept; anti = X on opposite sides
      setOrder(g, a, b, 2);
      const xa = addAtom(g, spec.X, a), xb = addAtom(g, spec.X, b);
      return writeSmiles(g, { sa: xa, a, b, sb: xb, trans: !!spec.anti });
    }
    case 'vicinalSat': setOrder(g, a, b, 1); addAtom(g, spec.X, a); addAtom(g, spec.X, b); return writeSmiles(g);   // R-CHX-CHX-R
    case 'tetra': setOrder(g, a, b, 1); [a, b].forEach((c) => { addAtom(g, spec.X, c); addAtom(g, spec.X, c); }); return writeSmiles(g);
    case 'ketone': setOrder(g, a, b, 1); addAtom(g, 'O', spec.at, 2); return writeSmiles(g);
    case 'enol': setOrder(g, a, b, 2); addAtom(g, 'O', spec.at, 1); return writeSmiles(g);
    case 'alkane': setOrder(g, a, b, 1); return writeSmiles(g);
    case 'alkene': {
      setOrder(g, a, b, 2);
      const sa = nbrs(g, a).find((x) => x !== b), sb = nbrs(g, b).find((x) => x !== a);
      if (spec.stereo && sa !== undefined && sb !== undefined) return writeSmiles(g, { sa, a, b, sb, trans: spec.stereo === 'trans' });
      return writeSmiles(g);
    }
    default: throw new Error('unknown product spec ' + spec.t);
  }
}

/** Which carbon the second group goes to (Markovnikov): {hC, pC} (hC = the carbon with the H, pC = the more substituted carbon) or null when the alkyne is unsymmetrical and internal. */
function markov(s) {
  const [a, b] = s.carbons;
  if (s.terminal !== null) return { hC: s.terminal, pC: s.terminal === a ? b : a, sym: false };
  if (s.bothTerminal) return { hC: a, pC: b, sym: true };
  // internal: symmetrical when X on a and X on b give the same compound
  const A = flat(make(s, { t: 'vinylHalide', X: 'Br', at: a })), B = flat(make(s, { t: 'vinylHalide', X: 'Br', at: b }));
  return A === B ? { hC: b, pC: a, sym: true } : null;
}

const hText = (n) => (n === 0 ? 'no H' : n === 1 ? '1 H' : n + ' H');

// ---------------------------------------------------------------- the prediction
/**
 * predictAlkyne(alkyne, key) -> {
 *   alkyne, key, rx, sites, products: [canonical isomeric SMILES, sorted], outcome: 'single' | 'mixture',
 *   stereo: 'E' | 'Z' | null (the geometry the answer fixes, for X2 1 equiv and Lindlar), enol: SMILES | null (hydration), mark: {hC, pC},
 *   equation: {lhs, rhs} (structures; chips are SMILES of H2O, HBr, Br2, H2 ...), names: [{new, old}|null] per product }
 */
export function predictAlkyne(alkyne, key) {
  const rx = ALKYNE_RXN[key];
  if (!rx) throw new Error('unknown alkyne reagent ' + key);
  const s = alkyneSites(alkyne);
  if (!s.ok) throw new Error('excluded: ' + s.reason);
  const [a, b] = s.carbons;
  const mk = markov(s);
  let prods, outcome = 'single', stereo = null, enol = null, lhs = [alkyne], rhs;
  switch (rx.kind) {
    case 'HX': {
      if (!mk) throw new Error('excluded: an unsymmetrical internal alkyne gives a mixture with HX, and the book gives no rule for it');
      prods = [iso(make(s, rx.equiv === 1 ? { t: 'vinylHalide', X: rx.X, at: mk.pC } : { t: 'geminal', X: rx.X, at: mk.pC }))];
      lhs = [alkyne, ...Array(rx.equiv).fill(rx.hx)];
      break;
    }
    case 'X2': {
      prods = [iso(make(s, rx.equiv === 1 ? { t: 'vicinal', X: rx.X, anti: true } : { t: 'tetra', X: rx.X }))];
      if (rx.equiv === 1) stereo = 'E';
      lhs = [alkyne, ...Array(rx.equiv).fill(rx.mol)];
      break;
    }
    case 'hydration': {
      if (s.bothTerminal) throw new Error('excluded: hydration of acetylene itself gives an aldehyde, which the book does not cover');
      lhs = [alkyne, 'O'];
      if (mk) {
        prods = [iso(make(s, { t: 'ketone', at: mk.pC }))];
        enol = iso(make(s, { t: 'enol', at: mk.pC }));
      } else { prods = [iso(make(s, { t: 'ketone', at: a })), iso(make(s, { t: 'ketone', at: b }))]; outcome = 'mixture'; }
      break;
    }
    case 'lindlar': {
      const both = nbrs(s.g, a).length > 1 && nbrs(s.g, b).length > 1;
      prods = [iso(make(s, { t: 'alkene', stereo: both ? 'cis' : null }))];
      if (both) stereo = 'Z';
      lhs = [alkyne, '[H][H]'];
      break;
    }
    case 'pd': {
      prods = [iso(make(s, { t: 'alkane' }))];
      lhs = [alkyne, '[H][H]', '[H][H]'];
      break;
    }
    default: throw new Error('unknown kind ' + rx.kind);
  }
  prods = [...new Set(prods)].sort();
  rhs = outcome === 'single' ? [prods[0]] : null;
  return { alkyne, key, rx, sites: s, products: prods, outcome, stereo, enol, mark: mk, equation: rhs ? { lhs, rhs } : null, names: prods.map((p) => nameBothAny(p)) };
}

/** Do two answers (lists of SMILES) name the same product(s)? Isomeric SMILES, order of the list ignored. */
export const sameAlkyneProducts = (x, y) => JSON.stringify(x.map((p) => iso(p)).sort()) === JSON.stringify(y.map((p) => iso(p)).sort());

// ---------------------------------------------------------------- wrong-but-tempting answers
const OTHER_X = { Cl: ['Br', 'I'], Br: ['Cl', 'I'], I: ['Cl', 'Br'] };

/** Every distractor the reaction can have, as {kind: [SMILES list]}; all computed from the same graph edits. */
export function alkyneDistractors(pred) {
  const { sites: s, rx, mark: mk } = pred;
  const out = {};
  const [a, b] = s.carbons;
  const right = pred.products.slice().sort().join();
  const put = (k, list) => { if (list && list.join() !== right && !Object.values(out).some((v) => v.slice().sort().join() === list.slice().sort().join())) out[k] = list; };
  const wrongX = (xk) => { const X2 = OTHER_X[rx.X][0]; const key = xk.replace(rx.X, X2); try { return predictAlkyne(pred.alkyne, key).products; } catch (e) { return null; } };
  const unchanged = [iso(pred.alkyne)];
  switch (rx.kind) {
    case 'HX':
      if (rx.equiv === 1) {
        if (s.terminal !== null) put('anti', [iso(make(s, { t: 'vinylHalide', X: rx.X, at: mk.hC }))]);
        put('twice', [iso(make(s, { t: 'geminal', X: rx.X, at: mk.pC }))]);
        put('wrongAtom', wrongX(rx.key));
        put('vicinal', [iso(make(s, { t: 'vicinal', X: rx.X, anti: true }))]);
        put('unchanged', unchanged);
      } else {
        put('once', [iso(make(s, { t: 'vinylHalide', X: rx.X, at: mk.pC }))]);
        put('splitX', [iso(make(s, { t: 'vicinalSat', X: rx.X }))]);
        put('wrongAtom', wrongX(rx.key));
        put('tetra', [iso(make(s, { t: 'tetra', X: rx.X }))]);
        put('unchanged', unchanged);
      }
      break;
    case 'X2':
      if (rx.equiv === 1) {
        put('syn', [iso(make(s, { t: 'vicinal', X: rx.X, anti: false }))]);
        put('tetra', [iso(make(s, { t: 'tetra', X: rx.X }))]);
        put('wrongAtom', wrongX(rx.key));
        put('hxlike', [iso(make(s, { t: 'vicinalSat', X: rx.X }))]);
        put('unchanged', unchanged);
      } else {
        put('once', [iso(make(s, { t: 'vicinal', X: rx.X, anti: true }))]);
        put('onceSyn', [iso(make(s, { t: 'vicinal', X: rx.X, anti: false }))]);
        put('wrongAtom', wrongX(rx.key));
        put('hxlike', [iso(make(s, { t: 'vicinalSat', X: rx.X }))]);
        put('unchanged', unchanged);
      }
      break;
    case 'hydration':
      if (pred.outcome === 'mixture') {
        put('onlyOne', [pred.products[0]]);
        put('onlyOther', [pred.products[1]]);
        put('enol', [iso(make(s, { t: 'enol', at: a }))]);
        put('alkane', [iso(make(s, { t: 'alkane' }))]);
      } else {
        if (s.terminal !== null) put('aldehyde', [iso(make(s, { t: 'ketone', at: mk.hC }))]);
        put('enol', [pred.enol]);
        put('alkene', [iso(make(s, { t: 'alkene', stereo: nbrs(s.g, a).length > 1 && nbrs(s.g, b).length > 1 ? 'cis' : null }))]);
        put('alkane', [iso(make(s, { t: 'alkane' }))]);
      }
      put('unchanged', unchanged);
      break;
    case 'lindlar': {
      const both = nbrs(s.g, a).length > 1 && nbrs(s.g, b).length > 1;
      if (both) put('trans', [iso(make(s, { t: 'alkene', stereo: 'trans' }))]);
      put('alkane', [iso(make(s, { t: 'alkane' }))]);
      put('unchanged', unchanged);
      try { const h = predictAlkyne(pred.alkyne, 'H2O_Hg'); if (h.outcome === 'single') put('ketone', h.products); } catch (e) { /* none */ }
      break;
    }
    case 'pd': {
      const both = nbrs(s.g, a).length > 1 && nbrs(s.g, b).length > 1;
      put('alkene', [iso(make(s, { t: 'alkene', stereo: both ? 'cis' : null }))]);
      if (both) put('trans', [iso(make(s, { t: 'alkene', stereo: 'trans' }))]);
      put('unchanged', unchanged);
      try { const h = predictAlkyne(pred.alkyne, 'H2O_Hg'); if (h.outcome === 'single') put('ketone', h.products); } catch (e) { /* none */ }
      break;
    }
    default: break;
  }
  return out;
}

/** A specific reason for each wrong answer. */
export function alkyneWhyWrong(pred, kind) {
  const { rx } = pred;
  const X = rx.X || '';
  const lib = {
    anti: `H went to the wrong carbon. In a Markovnikov addition H goes to the carbon that already has the H (the end of the chain) and ${X} to the carbon with more alkyl groups. Here ${X} sits on the terminal carbon instead.`,
    twice: `That has two ${X} atoms on one carbon: it needs a SECOND equivalent of H–${X}. With 1 equivalent the reaction can stop at the vinylic halide, with one ${X} and a C=C left.`,
    once: `That is what you get with only 1 equivalent: a vinylic halide (the C=C is still there). With 2 equivalents a second H–${X} adds to the C=C, again Markovnikov, and both ${X} end up on the same carbon.`,
    splitX: `Here the two ${X} atoms are on different carbons. The second H–${X} adds Markovnikov too: ${X} goes to the carbon that already carries one ${X} (and more alkyl character), so both ${X} end on the same carbon (a geminal dihalide).`,
    tetra: rx.kind === 'HX' ? `Four ${X} atoms would need 2 equivalents of ${X}₂, and H–${X} adds one H and one ${X} each time. 2 equivalents of H–${X} give two ${X} atoms in total.` : `Four ${X} atoms are what 2 equivalents of ${X}₂ give. With only 1 equivalent one ${X}₂ adds, giving a dihaloalkene.`,
    wrongAtom: `The halogen that adds is the one in the reagent (${X}). This answer carries a different halogen, so it belongs to a different reagent.`,
    unchanged: 'That is the starting alkyne again. This is an addition: a π bond is used up, so the product is not the alkyne.',
    vicinal: `That has ${X} on BOTH carbons, which is what ${X}₂ gives (X₂ adds two ${X} atoms). H–${X} adds one H and one ${X}.`,
    syn: `Both ${X} atoms are on the SAME side of the C=C here. Halogens add ANTI to an alkyne (opposite sides), so the two ${X} atoms end up trans to each other.`,
    hxlike: `That is the saturated product of adding H and ${X} twice. ${X}₂ puts one ${X} on each carbon and adds no H at all.`,
    onceSyn: 'With 2 equivalents the C=C also reacts: a second X₂ adds, so there is no C=C left.',
    aldehyde: 'That puts the C=O on the end carbon, which would be the anti-Markovnikov orientation. In the hydration of an alkyne the OH (and so the C=O) goes to the more substituted carbon, so a terminal alkyne gives a METHYL ketone, never an aldehyde.',
    enol: 'That is the enol, the first product. It is not what you isolate: an enol and its ketone interconvert quickly (tautomers), and the equilibrium lies strongly on the side of the ketone.',
    alkene: rx.kind === 'hydration' ? 'No oxygen is in this answer: it is an alkene (what H₂ would give). Water, H₂SO₄ and HgSO₄ add H and OH.' : rx.kind === 'pd' ? 'That is where the reaction goes first, but Pd/C does not stop there: the alkene is hydrogenated too (2 equivalents of H₂). Only the Lindlar catalyst stops at the alkene.' : 'Not the product.',
    alkane: rx.kind === 'lindlar' ? 'That is what Pd/C and 2 equivalents of H₂ give. The Lindlar catalyst is a specially prepared palladium that stops at the alkene stage.' : rx.kind === 'hydration' ? 'No oxygen is in this answer. Hydration adds H and OH across the triple bond; it does not add two H₂.' : 'Not the product.',
    trans: 'The two H atoms add to the SAME face of the triple bond (syn addition), so the two alkyl groups end up on the same side: the cis (Z) alkene, not the trans alkene.',
    ketone: 'That is the product of hydration (H₂O, H₂SO₄, HgSO₄), a different reagent. H₂ adds hydrogen only; no oxygen enters.',
    onlyOne: 'Both ketones form: the alkyne is unsymmetrical, and OH can go to either carbon of the triple bond with equal ease. The book says a mixture of both possible ketones results.',
    onlyOther: 'Both ketones form: the alkyne is unsymmetrical, and OH can go to either carbon of the triple bond with equal ease. The book says a mixture of both possible ketones results.'
  };
  return lib[kind] || 'Not the product.';
}

const KIND_ORDER = {
  HX1: ['anti', 'twice', 'wrongAtom', 'vicinal', 'unchanged'], HX2: ['once', 'splitX', 'wrongAtom', 'tetra', 'unchanged'],
  X2_1: ['syn', 'tetra', 'wrongAtom', 'hxlike', 'unchanged'], X2_2: ['once', 'onceSyn', 'wrongAtom', 'hxlike', 'unchanged'],
  hydration: ['aldehyde', 'enol', 'alkene', 'onlyOne', 'alkane', 'onlyOther', 'unchanged'],
  lindlar: ['trans', 'alkane', 'ketone', 'unchanged'], pd: ['alkene', 'trans', 'ketone', 'unchanged']
};
const orderKey = (rx) => (rx.kind === 'HX' ? 'HX' + rx.equiv : rx.kind === 'X2' ? 'X2_' + rx.equiv : rx.kind);

/** Why the right answer is right. */
export function alkyneRightWhy(pred) {
  const { rx } = pred;
  const X = rx.X || '';
  switch (rx.kind) {
    case 'HX': return rx.equiv === 1
      ? `Yes. H adds to the carbon that has the H and ${X} to the more substituted carbon (Markovnikov), and the reaction stops at the vinylic halide with 1 equivalent.`
      : `Yes. The first H–${X} makes the vinylic halide; a second one adds Markovnikov again, to the carbon that already carries ${X}. Both ${X} atoms end up on the same carbon (a geminal dihalide).`;
    case 'X2': return rx.equiv === 1
      ? `Yes. ${X}₂ adds ANTI: the two ${X} atoms go on opposite sides of the new C=C, which gives the (E) isomer. One equivalent stops at the dihaloalkene.`
      : `Yes. Two equivalents of ${X}₂ add to both π bonds: each carbon ends with two ${X} atoms (a 1,1,2,2-tetrahalide, shown without stereochemistry).`;
    case 'hydration': return pred.outcome === 'mixture'
      ? 'Yes. Both ends of the triple bond are different, so OH can add to either carbon: two enols, two ketones (a mixture).'
      : pred.sites.terminal !== null
        ? 'Yes. OH goes to the more substituted carbon (Markovnikov), the enol tautomerises, and the C=O ends up on that carbon: a methyl ketone.'
        : 'Yes. Both ends of the triple bond are alike, so there is one enol and one ketone: the C=O sits on one of the former triple-bond carbons.';
    case 'lindlar': return pred.stereo ? 'Yes. The Lindlar catalyst stops at the alkene, and both H atoms add to the same face (syn), so the two alkyl groups are on the same side: the cis (Z) alkene.' : 'Yes. The Lindlar catalyst stops at the alkene.';
    case 'pd': return 'Yes. With Pd/C and 2 equivalents of H₂, both π bonds are hydrogenated: the alkane.';
    default: return 'Yes.';
  }
}

/** The right answer plus distractors: [{smiles:[...], correct, kind, why}] (n options, default 4). */
export function alkyneChoices(pred, opts = {}) {
  const D = alkyneDistractors(pred);
  const n = opts.n || 4;
  const order = opts.kinds || KIND_ORDER[orderKey(pred.rx)];
  const kinds = order.filter((k) => D[k]).slice(0, n - 1);
  return [{ smiles: pred.products.slice(), correct: true, kind: 'major', why: alkyneRightWhy(pred) }, ...kinds.map((k) => ({ smiles: D[k], correct: false, kind: k, why: alkyneWhyWrong(pred, k) }))];
}

/** The reagent keys that give exactly this product (set of SMILES) from this alkyne. */
export function alkyneReagentsFor(alkyne, products, keys = ALKYNE_KEYS) {
  const want = products.map((p) => iso(p)).sort().join();
  return keys.filter((k) => { try { return predictAlkyne(alkyne, k).products.join() === want; } catch (e) { return false; } });
}

// ---------------------------------------------------------------- acidity of terminal alkynes (computed from the Lesson 03 pKa table)
export const ALKENE_PKA = 44;                 // McMurry 4.11 (the table of Lesson 03 lists acetylene, 25, but not an alkene)
export const ALKYNE_PKA = ACID.acetylene.pka; // 25
/** Bases the lesson compares: the conjugate base of an acid in the Lesson 03 table. */
export const ALKYNE_BASES = [
  { id: 'ammonia', label: 'NaNH₂ (amide ion, NH₂⁻)', anion: 'NH₂⁻', salt: 'NaNH₂' },
  { id: 'water', label: 'NaOH (hydroxide, HO⁻)', anion: 'HO⁻', salt: 'NaOH' },
  { id: 'ethanol', label: 'NaOCH₂CH₃ (ethoxide)', anion: 'CH₃CH₂O⁻', salt: 'NaOCH₂CH₃' },
  { id: 'hcn', label: 'NaCN (cyanide, CN⁻)', anion: 'CN⁻', salt: 'NaCN' },
  { id: 'acetic', label: 'CH₃CO₂Na (acetate)', anion: 'CH₃CO₂⁻', salt: 'CH₃CO₂Na' }
];
/** Does the base (named by the acid it comes from) deprotonate the terminal alkyne? From the pKa table: the equilibrium favours the weaker acid. */
export function deprotonates(baseId, acidId = 'acetylene') {
  const rx = acidReaction(acidId, baseId);        // HA(acid) + A(base)- <=> A(acid)- + HA(base)
  return { ok: rx.favoured === 'right', favoured: rx.favoured, pkaAcid: ACID[acidId].pka, pkaConj: ACID[baseId].pka, rx };
}

// ---------------------------------------------------------------- acetylide anion and alkylation
/** The acetylide anion of a terminal alkyne: the terminal C–H becomes C⁻ (a lone pair on carbon). */
export function acetylideOf(alkyne) {
  const s = alkyneSites(alkyne);
  if (!s.ok) throw new Error('excluded: ' + s.reason);
  if (s.terminal === null && !s.bothTerminal) throw new Error('excluded: an internal alkyne has no C–H on the triple bond');
  const g = clone(s.g);
  const c = s.terminal !== null ? s.terminal : s.carbons[0];
  g.atoms[c].q = -1;
  return writeSmiles(g);
}
/** 'methyl' | 'primary' | 'secondary' | 'tertiary' for an alkyl halide, or null (not a simple alkyl halide). */
export function halideClass(rx) {
  let info = null;
  try { info = analyze(rx); } catch (e) { info = null; }
  if (!info) return null;
  const X = info.atoms.filter((a) => ['Cl', 'Br', 'I'].includes(a.sym));
  if (X.length !== 1 || info.atoms.some((a) => !['C', 'Cl', 'Br', 'I'].includes(a.sym))) return null;
  const c = info.atoms[X[0].nbrs[0]];
  if (c.sym !== 'C') return null;
  const nc = c.nbrs.filter((k) => info.atoms[k].sym === 'C').length;
  return ['methyl', 'primary', 'secondary', 'tertiary'][nc] || null;
}
/** The internal alkyne made from an acetylide anion and an alkyl halide (R–X), by joining the carbon bearing the lone pair to the carbon bearing X. */
export function alkylateAcetylide(acetylide, rx) {
  const g = readGraph(acetylide), r = readGraph(rx);
  const cm = g.atoms.findIndex((a) => a.q === -1);
  const hx = r.atoms.findIndex((a) => ['Cl', 'Br', 'I'].includes(a.el));
  if (cm < 0 || hx < 0) throw new Error('need an acetylide anion and an alkyl halide');
  const cR = nbrs(r, hx)[0];
  const keep = r.atoms.map((_, i) => i).filter((i) => i !== hx);
  const map = new Map(keep.map((i, k) => [i, g.atoms.length + k]));
  keep.forEach((i) => g.atoms.push({ ...r.atoms[i] }));
  r.bonds.filter((b) => b.a !== hx && b.b !== hx).forEach((b) => g.bonds.push({ a: map.get(b.a), b: map.get(b.b), o: b.o }));
  g.bonds.push({ a: cm, b: map.get(cR), o: 1 });
  g.atoms[cm].q = 0;
  return iso(writeSmiles(g));
}

// ---------------------------------------------------------------- mechanisms (mechanism-player format; checkMechanism proves every step)
const cationFirst = (parts) => parts.slice().sort((p, q) => (q.includes('+') ? 1 : 0) - (p.includes('+') ? 1 : 0));
const HX_NAME = { Cl: 'HCl', Br: 'HBr', I: 'HI' };

/**
 * HX + a terminal alkyne (or a symmetrical internal one), 1 equivalent, at book level in two steps:
 *   1. a π bond of the C≡C attacks the H of H–X (the H–X pair leaves with X): H bonds to the carbon with the H, so the + charge is on the more substituted carbon
 *      (a vinylic carbocation); 2. X⁻ attacks the + carbon: the vinylic halide.
 * The book only states the Markovnikov outcome, so no further detail (hybridisation of the cation, stereochemistry) is claimed.
 */
export function alkyneHXMechanism(alkyne, X) {
  const s = alkyneSites(alkyne);
  if (!s.ok) throw new Error('excluded: ' + s.reason);
  const mk = markov(s);
  if (!mk) throw new Error('excluded: unsymmetrical internal alkyne');
  if (!HX_NAME[X]) throw new Error('unknown halogen ' + X);
  const { hC, pC } = mk;
  const st = { before: [alkyne, X], layout: [{}, { hAngles: { 0: 180 } }], arrows: [], after: [], label: '' };
  const sc = buildScene(st);
  const H = sc.maps[1].h[0][0], Xi = sc.maps[1].heavy[0];
  st.arrows = [{ from: { bond: [hC, pC] }, to: { bond: [hC, H] } }, { from: { bond: [H, Xi] }, to: { atom: Xi } }];
  st.after = cationFirst(canon(buildMolblock(stepResult(st))).split('.'));
  const nHh = hC === s.carbons[0] ? s.nH[0] : s.nH[1], nHp = hC === s.carbons[0] ? s.nH[1] : s.nH[0];
  st.label = `One π bond of the triple bond attacks the H of H–${X}; the H–${X} pair leaves with ${X}. H bonds to the carbon that has ${hText(nHh)}, so the + charge sits on the carbon with ${hText(nHp)}: the carbon with more alkyl groups, as in Lesson 09. The product of this step is a vinylic carbocation (+ on a carbon of a C=C), and ${X}⁻.`;
  if (!mk.sym || nHh !== nHp) {
    st.regio = {
      pi: [hC, pC], H, bondWord: 'triple bond',
      ends: [hC, pC].map((c) => ({ idx: c, text: `the carbon with ${hText(c === s.carbons[0] ? s.nH[0] : s.nH[1])}` })),
      wrongWhy: `H went to the wrong carbon: that would leave the + charge on the carbon with ${hText(nHh)}, the end of the chain, with fewer alkyl groups and a much less stable cation. H goes to the carbon that already has the H, so the + charge lands on the more substituted carbon: Markovnikov, just as for alkenes.`
    };
  }
  const s2 = { before: st.after, arrows: [], after: [], label: `A lone pair on ${X}⁻ attacks the + carbon and becomes the new C–${X} bond. The product is the vinylic halide, with the C=C still in place; with 1 equivalent of H–${X} the reaction can stop here.` };
  const sc2 = buildScene(s2);
  const Ci = sc2.atoms.findIndex((a) => a.el === 'C' && a.charge === 1);
  const Xj = sc2.atoms.findIndex((a) => a.el === X);
  s2.arrows = [{ from: { lp: Xj }, to: { atom: Ci } }];
  s2.after = [canonFlat(buildMolblock(stepResult(s2)))];    // the arrows move electrons in a flat scene: no cis/trans is claimed for the vinylic halide
  return { reactants: [alkyne, X], products: s2.after, steps: [st, s2] };
}

/**
 * Acetylide formation and alkylation as one mechanism (4 curved arrows in 2 steps): NH₂⁻ takes the terminal H as H⁺ (the C–H pair stays on carbon as a lone pair);
 * then the acetylide lone pair attacks the carbon of a PRIMARY alkyl halide R–X and the C–X pair leaves with X. NH₃ and Na⁺ are by-products/spectators:
 * NH₃ is dropped after step 1 (`dropped`), Na⁺ is left out. The book studies the substitution step in Chapter 7; here it is drawn as the one-step electron flow.
 */
export function acetylideAlkylationMechanism(alkyne, rx) {
  const s = alkyneSites(alkyne);
  if (!s.ok) throw new Error('excluded: ' + s.reason);
  if (s.terminal === null && !s.bothTerminal) throw new Error('excluded: needs a terminal alkyne');
  const hc = halideClass(rx);
  if (hc !== 'methyl' && hc !== 'primary') throw new Error('excluded: only methyl and primary alkyl halides work with an acetylide');
  const tC = s.terminal !== null ? s.terminal : s.carbons[0];
  const acetylide = acetylideOf(alkyne);
  // step 1: NH2- removes the terminal H
  const s1 = { before: [alkyne, '[NH2-]'], layout: [{ hAngles: { [tC]: 0 } }, {}], arrows: [], after: [], label: '' };
  const sc1 = buildScene(s1);
  const Hn = sc1.maps[0].h[tC][0], Nn = sc1.maps[1].heavy[0];
  s1.arrows = [{ from: { lp: Nn }, to: { atom: Hn } }, { from: { bond: [tC, Hn] }, to: { atom: tC } }];
  s1.after = canon(buildMolblock(stepResult(s1))).split('.').sort((p, q) => (q.includes('-') ? 1 : 0) - (p.includes('-') ? 1 : 0));
  s1.label = 'A lone pair on the amide ion (from NaNH₂) takes the terminal H as H⁺. The C–H bond pair stays on carbon and becomes a lone pair: the acetylide anion. NH₃ is the by-product, and Na⁺ only watches (a spectator).';
  // step 2: the acetylide attacks R–X
  const s2 = { before: [acetylide, rx], added: [rx], dropped: ['N'], arrows: [], after: [], label: '' };
  const sc2 = buildScene(s2);
  const Cm = sc2.atoms.findIndex((a) => a.el === 'C' && a.charge === -1);
  const Xi = sc2.atoms.findIndex((a, i) => ['Cl', 'Br', 'I'].includes(a.el) && sc2.maps[1].heavy.includes(i));
  const Cr = sc2.bonds.find((b) => (b.a === Xi && sc2.atoms[b.b].el === 'C') || (b.b === Xi && sc2.atoms[b.a].el === 'C'));
  const CrI = Cr.a === Xi ? Cr.b : Cr.a;
  s2.arrows = [{ from: { lp: Cm }, to: { atom: CrI } }, { from: { bond: [CrI, Xi] }, to: { atom: Xi } }];
  s2.after = canon(buildMolblock(stepResult(s2))).split('.').sort((p, q) => (p.includes('-') ? 1 : 0) - (q.includes('-') ? 1 : 0));
  const Xn = sc2.atoms[Xi].el;
  s2.label = `A lone pair on the acetylide carbon attacks the carbon bonded to ${Xn} (a ${hc} carbon), and the C–${Xn} bond pair leaves with ${Xn}. A new C–C bond forms: the chain is longer, and the product is an internal alkyne. (The book studies this substitution in Chapter 7; for now it is one step of electron flow. NH₃ from step 1 is set aside.)`;
  return { reactants: [alkyne, '[NH2-]'], products: s2.after, steps: [s1, s2] };
}

/** The alkane from an alkene or alkyne: every C=C and C≡C becomes C–C (hydrogenation over Pd/C; stereochemistry disappears). */
export function saturate(smiles) {
  const g = readGraph(smiles);
  g.bonds.forEach((b) => { if (b.o > 1 && g.atoms[b.a].el === 'C' && g.atoms[b.b].el === 'C') b.o = 1; });
  return iso(writeSmiles(g));
}
