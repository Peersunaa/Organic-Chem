// Pure logic for the mechanism player (no DOM): a mechanism is DATA, and every step is checked by applying its arrows.
//
// Mechanism data:
//   { reactants:[smiles], reagents?:[smiles], products:[smiles],
//     steps:[{ before:[smiles], arrows:[{from,to}], after:[smiles], label, layout?:[{at?:[x,y], hAngles?:{heavyIdx: degrees}}] }] }
// `arrows` use the arrow-core format, with atom numbers of the scene that buildScene(step) makes from `before`:
// the SMILES parts in order, each part's heavy atoms first (in SMILES order) and then its hydrogens, heavy atom by heavy atom.
// (A lone pair is never listed: it is computed from the structure.)  A pi bond that attacks an atom k is written
// from:{bond:[c1,c2]} to:{bond:[c1,k]}, i.e. "these electrons make the new bond c1-k".
import { analyze, canon, VALENCE, rdkit } from '../chem.js';
import { sceneFromSmiles, applyArrows, validate, lpCount, bondOrderSum, findBond } from './arrow-core.js';
import { buildMolblock } from './lewis-core.js';

const rad = (deg) => (deg * Math.PI) / 180;

/** Scene {atoms, bonds, maps} for a step: SMILES parts laid out left to right (or at layout[k].at), hydrogens explicit. */
export function buildScene(step) {
  const atoms = [], bonds = [], maps = [];
  let cursor = 0;
  step.before.forEach((smiles, k) => {
    const L = (step.layout && step.layout[k]) || {};
    const hA = L.hAngles ? Object.fromEntries(Object.entries(L.hAngles).map(([i, deg]) => [i, rad(deg)])) : undefined;
    const sc = sceneFromSmiles([{ smiles, hAngles: hA }]);
    const xs = sc.atoms.map((a) => a.x);
    const dx = L.at ? L.at[0] : cursor, dy = L.at ? L.at[1] : 0;
    const base = atoms.length;
    sc.atoms.forEach((a) => atoms.push({ el: a.el, x: a.x + dx, y: a.y + dy, charge: a.charge }));
    sc.bonds.forEach((b) => bonds.push({ a: b.a + base, b: b.b + base, order: b.order }));
    const m = sc.maps[0];
    maps.push({ heavy: m.heavy.map((i) => i + base), h: Object.fromEntries(Object.entries(m.h).map(([key, v]) => [key, v.map((i) => i + base)])) });
    cursor = Math.max(cursor, dx + Math.max(...xs) + 1.9);
  });
  return { atoms, bonds, maps };
}

/** The widget config (arrow-draw format) for one step. */
export function stepConfig(step) {
  const sc = buildScene(step);
  const cfg = { atoms: sc.atoms, bonds: sc.bonds, arrows: step.arrows, products: step.after };
  if (step.equiv) cfg.equiv = step.equiv; // Lesson 10: swaps that give the same mechanism (arrow-core grade)
  if (step.regio) cfg.regio = step.regio; // Lesson 09: the learner must also say WHICH carbon of an unsymmetrical C=C bonds to H (see arrow-core grade)
  return cfg;
}

/** State after the arrows: {atoms, bonds} with lone pairs and charges recomputed. */
export function stepResult(step) { return applyArrows(stepConfig(step)); }

/** Canonical SMILES WITHOUT stereochemistry (Lesson 10: the arrows move electrons in a flat scene, so a stereo-marked `after` is compared flat). */
export function canonFlat(input) {
  const iso = JSON.stringify({ doIsomericSmiles: false });
  let m = rdkit().get_mol(input), out = null;
  if (!m) return null;
  try { out = m.get_smiles(iso); } finally { m.delete(); }
  for (let i = 0; i < 3 && out && out.includes('[H]') && out.length > 5; i++) {
    m = rdkit().get_mol(out);
    if (!m) break;
    try { out = m.get_smiles(iso); } finally { m.delete(); }
  }
  return out;
}

export const sorted = (arr) => arr.map((s) => canon(s)).sort();
const sameSet = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

/** Atom and charge tally of a list of SMILES (hydrogens included). */
export function tallyOf(list) {
  const c = {};
  let q = 0;
  for (const smi of list) {
    const info = analyze(smi);
    info.atoms.forEach((a) => { c[a.sym] = (c[a.sym] || 0) + 1; if (a.impH) c.H = (c.H || 0) + a.impH; });
    q += info.netCharge;
  }
  return { c, q };
}
export function balanced(a, b) {
  const A = tallyOf(a), B = tallyOf(b);
  for (const k of new Set([...Object.keys(A.c), ...Object.keys(B.c)])) if ((A.c[k] || 0) !== (B.c[k] || 0)) return false;
  return A.q === B.q;
}

/** Octet violations of a state: atoms with more than 8 electrons around them (more than 2 for H). */
export function octetViolations(state) {
  const out = [];
  state.atoms.forEach((a, i) => {
    const lp = a.lp != null ? a.lp : lpCount(state.atoms, state.bonds, i);
    const e = 2 * Math.max(0, lp) + 2 * bondOrderSum(state.atoms, state.bonds, i);
    // Lesson 13: sulfur in a sulfonic acid / hydrogen sulfate has six bonds (12 electrons, an expanded octet); every other atom is held to 8
    if (e > (a.el === 'H' ? 2 : a.el === 'S' ? 12 : 8)) out.push({ idx: i, el: a.el, electrons: e });
  });
  return out;
}

/** Every problem with a mechanism; an empty list means all steps balance, chain together and reproduce `after` from the arrows. */
export function checkMechanism(mech) {
  const errs = [];
  const all = [...mech.reactants, ...(mech.reagents || []), ...mech.products, ...mech.steps.flatMap((s) => [...s.before, ...s.after])];
  for (const s of all) if (!canon(s)) errs.push(`SMILES ${s} does not parse`);
  if (errs.length) return errs;
  let prev = null;
  mech.steps.forEach((st, n) => {
    const t = `step ${n + 1}`;
    if (!st.label) errs.push(`${t}: needs a label`);
    if (!balanced(st.before, st.after)) errs.push(`${t}: atoms or charge do not balance`);
    const cfg = stepConfig(st);
    const v = validate(cfg);
    if (v.length) errs.push(`${t}: ${v.join('; ')}`);
    else {
      const state = applyArrows(cfg);
      if (state.atoms.some((a) => !Number.isInteger(a.lp) || a.lp < 0)) errs.push(`${t}: the arrows leave an impossible lone-pair count`);
      const ov = octetViolations(state);
      if (ov.length) errs.push(`${t}: octet exceeded on ${ov.map((o) => o.el).join(', ')}`);
      const got = canonFlat(buildMolblock(state));
      const want = canonFlat(st.after.join('.'));
      if (got !== want) errs.push(`${t}: arrows give ${got} but after is ${want}`);
    }
    if (n === 0 && !sameSet(st.before, [...mech.reactants, ...(mech.reagents || [])])) errs.push('step 1 does not start from the reactants (and reagents)');
    // `added` = fresh species that join this step (e.g. a second water molecule from the solvent); everything else must come from the previous step
    // Lesson 12: `dropped` = by-products set aside after the previous step (NH3 after the acetylide forms); they are not drawn in this step
    const carried = (st.dropped || []).length ? prev && prev.after.filter((x) => !st.dropped.map((d) => canon(d)).includes(canon(x))) : prev && prev.after;
    if (prev && !sameSet(st.before, [...carried, ...(st.added || [])])) errs.push(`${t}: before is not the previous after${st.added ? ' plus the added species' : ''}${st.dropped ? ' minus the dropped species' : ''}`);
    prev = st;
  });
  if (prev && !sameSet(prev.after, mech.products)) errs.push('the last step does not end at the products');
  return errs;
}

// ---------------------------------------------------------------- what changed in a step (computed, not typed)
const pairKey = (i, j) => (i < j ? i + '-' + j : j + '-' + i);
const bondMap = (bonds) => { const m = new Map(); bonds.forEach((b) => m.set(pairKey(b.a, b.b), b.order)); return m; };
const sym = (o) => (o >= 3 ? '≡' : o === 2 ? '=' : '–');

/** Bonds that form / break / change order and atoms whose charge changes, for the step's scene before and after the arrows. */
export function describeChanges(step) {
  const cfg = stepConfig(step);
  const after = applyArrows(cfg);
  const B0 = bondMap(cfg.bonds), B1 = bondMap(after.bonds);
  const out = { formed: [], broken: [], changed: [], charges: [] };
  for (const k of new Set([...B0.keys(), ...B1.keys()])) {
    const [i, j] = k.split('-').map(Number);
    const o0 = B0.get(k) || 0, o1 = B1.get(k) || 0;
    let A = cfg.atoms[i].el, Bm = cfg.atoms[j].el;
    if (A !== 'H' && Bm === 'H' && ['F', 'Cl', 'Br', 'I', 'O', 'N', 'S'].includes(A)) [A, Bm] = [Bm, A]; // write H-Cl, H-O ... but C-H
    if (o0 === o1) continue;
    if (!o0) out.formed.push(`${A}${sym(o1)}${Bm}`);
    else if (!o1) out.broken.push(`${A}${sym(o0)}${Bm}`);
    else out.changed.push({ text: `${A}${sym(o0)}${Bm} becomes ${A}${sym(o1)}${Bm}`, lost: o1 < o0, o0, o1 });
  }
  cfg.atoms.forEach((a, i) => {
    const c0 = a.charge || 0, c1 = after.atoms[i].charge;
    if (c0 !== c1) out.charges.push(`${a.el} ${c0 === 0 ? 'becomes' : 'goes from ' + fmtCharge(c0) + ' to'} ${fmtCharge(c1)}`);
  });
  return out;
}
const fmtCharge = (n) => (n === 0 ? 'neutral' : n > 0 ? 'positive (' + (n === 1 ? '+' : n + '+') + ')' : 'negative (' + (n === -1 ? '−' : n + '−') + ')');

/** One sentence for the player to show after the arrows have run. */
export function changeSentence(step) {
  const d = describeChanges(step);
  const parts = [];
  if (d.broken.length) parts.push(`${d.broken.join(' and ')} ${d.broken.length > 1 ? 'bonds break' : 'bond breaks'}`);
  d.changed.forEach((c) => parts.push(c.lost ? (c.o0 === 2 && c.o1 === 1 ? `${c.text}: its π pair is used` : `${c.text}: one pair of its electrons is used`) : c.text));
  if (d.formed.length) parts.push(`${d.formed.join(' and ')} ${d.formed.length > 1 ? 'bonds form' : 'bond forms'}`);
  let s = parts.join('; ');
  if (d.charges.length) s += (s ? '. ' : '') + 'Charges: ' + d.charges.join(', ');
  return s;
}

/** Draw style for the species figures of a step: full (every H) for small species, skeletal for larger ones. */
export function autoStyle(smiles, max = 4) { return analyze(smiles).heavy.length <= max ? 'full' : 'skeletal'; }

export { VALENCE };
