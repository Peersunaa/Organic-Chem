// Conjugated dienes + HX, 1 equivalent (McMurry 4.8 and 4.9). Re-exported by engine/reactions.js (additive; nothing of Lessons 09/10 changes).
//
// For a conjugated diene a1=a2-a3=a4 (hydrocarbon, exactly two C=C separated by one single bond, acyclic or a ring) the engine computes from the structure:
//   * where H+ can add. Only a TERMINUS of the diene (a1 or a4) gives an ALLYLIC cation: the + charge ends up on a2 (or a3) next to the remaining C=C and is
//     shared with the far end through resonance. H+ on an inner carbon (a2 or a3) would make a non-allylic cation (not formed: it is much less stable),
//   * the resonance pair of the allylic cation (enumerated by engine/resonance.js, so the cation and its resonance form are proven, not typed),
//   * the products: X- attacks either end of the allylic cation. 1,2-addition = H on a1, X on a2; 1,4-addition = H on a1, X on a4 (the C=C moves to a2=a3).
//     Both are formed (a mixture). When the diene is unsymmetrical the engine picks the more stable allylic cation (the one with the more substituted end);
//     when two orientations are equally good both are formed. A ring diene can give one product by both routes (cyclohexa-1,3-diene).
//   * the mechanism in mechanism-player format: protonation, [resonance step], X- attacks. Every step is built by applying its arrows (stepResult),
//     and checkMechanism proves atom/charge balance and that the arrows reproduce `after`.
// Not taught here (the book does not cover it), so not modelled: kinetic versus thermodynamic control, temperature effects on the 1,2/1,4 ratio, Diels-Alder,
// rearrangements, peroxide effects, two equivalents of HX.
import { analyze } from './chem.js';
import { buildScene, stepResult, canonFlat } from './widgets/mechanism-core.js';

// Everything here is drawn flat: the arrows move electrons in a flat scene, so no cis/trans (E/Z) of the new C=C is claimed.
const canon = canonFlat;
import { buildMolblock } from './widgets/lewis-core.js';

export const HX = {
  HCl: { id: 'HCl', X: 'Cl', donor: 'Cl', label: 'HCl' },
  HBr: { id: 'HBr', X: 'Br', donor: 'Br', label: 'HBr' },
  HI: { id: 'HI', X: 'I', donor: 'I', label: 'HI' }
};
export const HX_DIENE_IDS = ['HCl', 'HBr', 'HI'];

/** Conjugated dienes of the reaction lab and the mastery generator, with both IUPAC names (checked with OPSIN in the tests). */
export const LAB_DIENES = [
  { id: 'buta-1,3-diene', smiles: 'C=CC=C', name: { new: 'buta-1,3-diene', old: '1,3-butadiene' } },
  { id: 'penta-1,3-diene', smiles: 'CC=CC=C', name: { new: 'penta-1,3-diene', old: '1,3-pentadiene' } },
  { id: '2-methylbuta-1,3-diene', smiles: 'C=C(C)C=C', name: { new: '2-methylbuta-1,3-diene', old: '2-methyl-1,3-butadiene' } },
  { id: 'cyclohexa-1,3-diene', smiles: 'C1=CC=CCC1', name: { new: 'cyclohexa-1,3-diene', old: '1,3-cyclohexadiene' } },
  { id: '2,3-dimethylbuta-1,3-diene', smiles: 'C=C(C)C(C)=C', name: { new: '2,3-dimethylbuta-1,3-diene', old: '2,3-dimethyl-1,3-butadiene' } },
  { id: 'hexa-2,4-diene', smiles: 'CC=CC=CC', name: { new: 'hexa-2,4-diene', old: '2,4-hexadiene' } },
  { id: 'cyclopenta-1,3-diene', smiles: 'C1=CC=CC1', name: { new: 'cyclopenta-1,3-diene', old: '1,3-cyclopentadiene' } }
];
export const DIENE_BY_ID = Object.fromEntries(LAB_DIENES.map((d) => [d.id, d]));
export const dieneName = (smiles) => (LAB_DIENES.find((d) => d.smiles === smiles) || {}).name || null;

const CLS = { 1: 'primary (1°)', 2: 'secondary (2°)', 3: 'tertiary (3°)' };
const clsName = (c) => CLS[c] || 'cation';

// ---------------------------------------------------------------- reading a diene
/**
 * {ok, chain:[a1,a2,a3,a4]} with a1=a2, a2-a3, a3=a4 in the SMILES atom numbering, or {ok:false, reason}. a1 is the lower-numbered end when the diene
 * is symmetric. Isolated (penta-1,4-diene), cumulated (allene), aromatic, heteroatom and triple-bond cases are refused.
 */
export function dieneSites(smiles) {
  if (typeof smiles !== 'string' || !smiles) return { ok: false, reason: 'no structure' };
  if (/[a-z]/.test(smiles.replace(/Cl|Br/g, ''))) return { ok: false, reason: 'aromatic rings are covered in Chapter 5' };
  let info = null;
  try { info = analyze(smiles); } catch (e) { info = null; }
  if (!info) return { ok: false, reason: 'not a valid structure' };
  if (info.atoms.some((a) => a.sym !== 'C' || a.fc !== 0)) return { ok: false, reason: 'only hydrocarbons without charges are covered' };
  const dbl = info.bonds.filter((b) => (b.bo ?? 1) === 2);
  if (info.bonds.some((b) => (b.bo ?? 1) > 2)) return { ok: false, reason: 'no triple bonds' };
  if (dbl.length !== 2) return { ok: false, reason: dbl.length < 2 ? 'a diene has two C=C' : 'only dienes (two C=C) are covered' };
  const shared = dbl[0].atoms.filter((x) => dbl[1].atoms.includes(x));
  if (shared.length) return { ok: false, reason: 'cumulated double bonds (allenes) are not covered' };
  // conjugated: a single bond joins one end of the first C=C to one end of the second
  for (const [p, q] of [[dbl[0], dbl[1]], [dbl[1], dbl[0]]]) {
    for (const a2 of p.atoms) for (const a3 of q.atoms) {
      const join = info.bonds.find((b) => (b.bo ?? 1) === 1 && b.atoms.includes(a2) && b.atoms.includes(a3));
      if (join) {
        const a1 = p.atoms.find((x) => x !== a2), a4 = q.atoms.find((x) => x !== a3);
        const fwd = [a1, a2, a3, a4], rev = [a4, a3, a2, a1];
        const chain = fwd[0] <= rev[0] ? fwd : rev;
        return { ok: true, smiles, chain };
      }
    }
  }
  return { ok: false, reason: 'the double bonds are not conjugated (isolated alkenes react one at a time, like Lesson 09)' };
}

const carbonNbrs = (info, i) => info.atoms[i].nbrs.filter((j) => info.atoms[j].sym === 'C').length;

/** Order of two allylic cations' stability: compare (more substituted end, then the other end). Returns >0 if A is more stable. */
const rankCmp = (A, B) => (A.hi - B.hi) || (A.lo - B.lo);

// ---------------------------------------------------------------- mechanism
const cationFirst = (parts) => parts.slice().sort((p, q) => (q.includes('+') ? 1 : 0) - (p.includes('+') ? 1 : 0));

/** Step 1: the pi bond at the terminus T attacks the H of HX; the H-X pair leaves with X. T gains H; its C=C neighbour carries the + charge. */
function stepProtonate(diene, X, T, nT, ends) {
  const R = HX['H' + X];
  const st = { before: [diene, R.donor], layout: [{}, { hAngles: { 0: 180 } }], arrows: [], after: [], label: '' };
  const sc = buildScene(st);
  const H = sc.maps[1].h[0][0], Xi = sc.maps[1].heavy[0];
  st.arrows = [
    { from: { bond: [T, nT] }, to: { bond: [T, H] }, why: `A π pair at the end of the diene attacks the δ+ H of H–${X} and forms a new C–H bond. The + lands next to the other C=C.` },
    { from: { bond: [H, Xi] }, to: { atom: Xi }, why: `The H–${X} bond pair leaves with ${X}, the more electronegative atom, so ${X} becomes ${X}⁻.` }
  ];
  st.after = cationFirst(canon(buildMolblock(stepResult(st))).split('.'));
  st.label = `One of the two π bonds attacks the H of H–${X}; the H–${X} pair leaves with ${X}. H bonds to an end carbon of the diene (C1), which leaves a ${clsName(ends.near)} cation next to the other C=C: an ALLYLIC carbocation. (H on an inner carbon would give a non-allylic cation, much less stable, so it does not form.)`;
  // the learner says which carbon of the C=C bonds to H; the inner carbon would give the non-allylic cation
  st.regio = {
    pi: [T, nT], H,
    ends: [{ idx: T, text: 'the end carbon of the diene' }, { idx: nT, text: 'the inner carbon of that C=C' }],
    wrongWhy: 'H went to the inner carbon of the C=C. That leaves the + charge on the END carbon, which is not next to the other C=C: a non-allylic cation with no resonance form, much less stable and not formed. H adds to the END carbon so that the + charge lands next to the other double bond (allylic).'
  };
  return st;
}

/** Resonance step: the remaining C=C π bond slides over to the C+ (bond[Cx,Cy] to bond[Cp,Cx]); the + charge ends up on Cy, the far end. */
function stepResonance(prev, ends) {
  const st = { before: prev.after, arrows: [], after: [], isResonance: true, label: '' };
  const sc = buildScene(st);
  const Cp = sc.atoms.findIndex((a) => a.el === 'C' && a.charge === 1);
  const nbrs = sc.bonds.filter((b) => (b.a === Cp || b.b === Cp) && sc.atoms[b.a === Cp ? b.b : b.a].el === 'C').map((b) => (b.a === Cp ? b.b : b.a));
  let Cx = -1, Cy = -1;
  for (const n of nbrs) {
    const d = sc.bonds.find((b) => b.order === 2 && (b.a === n || b.b === n));
    if (d) { Cx = n; Cy = d.a === n ? d.b : d.a; break; }
  }
  if (Cx < 0) throw new Error('no allylic C=C next to the cation');
  st.arrows = [{ from: { bond: [Cx, Cy] }, to: { bond: [Cp, Cx] }, why: 'The π pair next to the + slides into the neighboring C–C bond and makes it a double bond. The + moves to the far carbon.' }];
  st.after = prev.after.map((s) => (s.includes('+') ? canon(buildMolblock(stepResult(st))).split('.').find((x) => x.includes('+')) : s));
  st.label = `Resonance: the π bond next to the + charge slides over (curved arrow from the C=C to the C–C bond). The C=C moves one place along and the + charge moves to the other end of the three-carbon unit. Both drawings are the same cation (↔), so the + charge is shared by C2 and C4, and Br⁻ can attack either one. Here the new + carbon is ${clsName(ends.far)}.`;
  return st;
}

/** X- attacks the cation. */
function stepHalide(prev, X, where) {
  const st = { before: prev.after, arrows: [], after: [], label: `A lone pair on ${X}⁻ attacks the ${where}, the carbon that carries the + charge in this drawing, and becomes the new C–${X} bond.` };
  const sc = buildScene(st);
  const Ci = sc.atoms.findIndex((a) => a.el === 'C' && a.charge === 1);
  const Xi = sc.atoms.findIndex((a) => a.el === X);
  st.arrows = [{ from: { lp: Xi }, to: { atom: Ci }, why: `A lone pair on ${X}⁻ attacks the + carbon of this drawing and forms the new C–${X} bond.` }];
  st.after = [canon(buildMolblock(stepResult(st)))];
  return st;
}

/**
 * Mechanism of one product: route '1,2' = [protonation, X- attacks the carbon next to the new CH2]; route '1,4' = [protonation, resonance, X- attacks the far end].
 * T = the diene terminus that receives H (a1, or a4 when the orientation is reversed).
 */
export function dieneMechanism(diene, reagent, route = '1,4', orient = 'a1') {
  const sites = dieneSites(diene);
  if (!sites.ok) throw new Error('excluded: ' + sites.reason);
  const R = HX[reagent];
  if (!R) throw new Error('unknown reagent ' + reagent);
  const info = analyze(diene);
  const ch = orient === 'a4' ? sites.chain.slice().reverse() : sites.chain;
  const [a1, a2, a3, a4] = ch;
  const ends = { near: carbonNbrs(info, a2), far: carbonNbrs(info, a4) };
  const s1 = stepProtonate(diene, R.X, a1, a2, ends);
  // a symmetric diene (buta-1,3-diene, cyclohexa-1,3-diene ...) can be protonated at either end with the same result: accept the mirror-image drawing too
  const s1b = stepProtonate(diene, R.X, a4, a3, { near: ends.far, far: ends.near });
  if (s1.after.join('.') === s1b.after.join('.')) {
    s1.equiv = [{ [a1]: a4, [a4]: a1, [a2]: a3, [a3]: a2 }];
    s1.regio.alt = [s1b.regio];
  }
  const steps = [s1];
  if (route === '1,4') {
    const s2 = stepResonance(s1, ends);
    steps.push(s2, stepHalide(s2, R.X, 'far end (C4)'));
  } else steps.push(stepHalide(s1, R.X, 'carbon next to the new CH₂ (C2)'));
  return { reactants: [diene, R.donor], products: steps[steps.length - 1].after, steps };
}

// ---------------------------------------------------------------- the prediction
/**
 * predictDiene(diene, reagent) -> {
 *   diene, reagent, X, sites, orientations:[{h: atom that gets H, near, far, cls:{near, far}, cation, cationResonance, add12, add14, mech12, mech14}],
 *   major: [orientation] (the more stable allylic cation(s)), outcome: 'single' (both ends alike, or the two routes meet) | 'two' (1,2 and 1,4 differ),
 *   products: sorted canonical SMILES of all products, add12/add14 of the main orientation,
 *   nonAllylic: [{h, cation, product}] (H on an inner carbon: shown as a distractor, NOT formed) }
 */
export function predictDiene(diene, reagent) {
  const sites = dieneSites(diene);
  if (!sites.ok) throw new Error('excluded: ' + sites.reason);
  const R = HX[reagent];
  if (!R) throw new Error('unknown reagent ' + reagent);
  const info = analyze(diene);
  const chains = [sites.chain, sites.chain.slice().reverse()];
  const orients = chains.map((ch, k) => {
    const [a1, a2, a3, a4] = ch;
    const cls = { near: carbonNbrs(info, a2), far: carbonNbrs(info, a4) };
    const m12 = dieneMechanism(diene, reagent, '1,2', k ? 'a4' : 'a1');
    const m14 = dieneMechanism(diene, reagent, '1,4', k ? 'a4' : 'a1');
    const cation = m12.steps[0].after.find((s) => s.includes('+'));
    const cationResonance = m14.steps[1].after.find((s) => s.includes('+'));
    return {
      h: a1, atoms: ch, cls, rank: { hi: Math.max(cls.near, cls.far), lo: Math.min(cls.near, cls.far) },
      cation, cationResonance, add12: m12.products[0], add14: m14.products[0], mech12: m12, mech14: m14
    };
  });
  const same = orients[0].cation === orients[1].cation && orients[0].add12 === orients[1].add12 && orients[0].add14 === orients[1].add14;
  const opts = same ? [orients[0]] : orients;
  const cmp = opts.length === 2 ? rankCmp(opts[0].rank, opts[1].rank) : 1;
  const major = opts.length === 1 ? [opts[0]] : cmp === 0 ? opts.slice() : [cmp > 0 ? opts[0] : opts[1]];
  const prods = new Set();
  major.forEach((o) => { prods.add(o.add12); prods.add(o.add14); });
  const products = [...prods].sort();
  const o = major[0];
  const outcome = products.length === 1 ? 'single' : 'two';
  // non-allylic distractors: H on an inner carbon (a2 or a3), X on the other carbon of that C=C
  const nonAllylic = [];
  for (const o2 of major) {
    const [a1, a2, a3, a4] = o2.atoms;
    for (const [hc, xc] of [[a2, a1], [a3, a4]]) {
      const prod = nonAllylicProduct(diene, R.X, hc, xc);
      if (prod && !nonAllylic.some((x) => x.product === prod)) nonAllylic.push({ h: hc, cationAt: xc, product: prod });
    }
  }
  return { diene, reagent, X: R.X, sites, orientations: opts, major, outcome, products, add12: o.add12, add14: o.add14, nonAllylic, resonance: [o.cation, o.cationResonance] };
}

/** H on carbon hc, X on carbon xc (the other carbon of that C=C), which leaves the other C=C alone: the product of an inner protonation. */
function nonAllylicProduct(diene, X, hc, xc) {
  const info = analyze(diene);
  const lines = info.atoms.map((a) => a.sym);
  // build the product by editing the molblock-free graph: reuse a scene, apply "bond[hc,xc] -> -1", add H to hc, X to xc via a tiny SMILES edit with RDKit-free logic
  const bonds = info.bonds.map((b) => ({ ...b, bo: b.bo ?? 1 }));
  const k = bonds.findIndex((b) => b.atoms.includes(hc) && b.atoms.includes(xc));
  if (k < 0 || bonds[k].bo !== 2) return null;
  bonds[k].bo = 1;
  const n = lines.length;
  const atoms = lines.map((s) => ({ s }));
  atoms.push({ s: X });
  bonds.push({ atoms: [xc, n], bo: 1 });
  // SMILES by explicit adjacency (implicit H are recomputed by RDKit)
  const adj = Array.from({ length: n + 1 }, () => []);
  bonds.forEach((b) => { adj[b.atoms[0]].push([b.atoms[1], b.bo]); adj[b.atoms[1]].push([b.atoms[0], b.bo]); });
  const seen = new Array(n + 1).fill(false), ring = new Map();
  const tree = new Set();
  const order = [];
  const dfs = (v, p) => { seen[v] = true; order.push(v); for (const [w] of adj[v]) if (w !== p && !seen[w]) { tree.add(v + '>' + w); dfs(w, v); } };
  dfs(0, -1);
  const closures = bonds.filter((b) => !tree.has(b.atoms[0] + '>' + b.atoms[1]) && !tree.has(b.atoms[1] + '>' + b.atoms[0]));
  const rings = Array.from({ length: n + 1 }, () => []);
  closures.forEach((b, i) => { rings[b.atoms[0]].push([i + 1, b.bo]); rings[b.atoms[1]].push([i + 1, b.bo]); });
  const bo = (o) => (o === 2 ? '=' : o === 3 ? '#' : '');
  const write = (v, p, o) => {
    let s = bo(o) + atoms[v].s + rings[v].map(([no, ob]) => bo(ob) + no).join('');
    const kids = adj[v].filter(([w]) => w !== p && tree.has(v + '>' + w));
    kids.forEach(([w, ob], i) => { const sub = write(w, v, ob); s += i < kids.length - 1 ? '(' + sub + ')' : sub; });
    return s;
  };
  return canon(write(0, -1, 0));
}

// ---------------------------------------------------------------- answers, with a specific reason each
const KIND_ORDER = ['only12', 'only14', 'nonallylic', 'unchanged', 'wrongHalogen'];

/** Wrong-but-tempting answers, all computed. Each is a list of canonical SMILES. */
export function dieneDistractors(pred) {
  const out = {};
  const both = pred.products;
  if (pred.outcome === 'two') { out.only12 = [pred.add12]; out.only14 = [pred.add14]; }
  if (pred.nonAllylic.length) { const p = pred.nonAllylic.find((x) => !both.includes(x.product)); if (p) out.nonallylic = [p.product]; }
  out.unchanged = [canon(pred.diene)];
  const other = ['HCl', 'HBr', 'HI'].find((x) => x !== pred.reagent && HX[x].X !== pred.X);
  const swapped = predictDiene(pred.diene, other);
  const sw = swapped.products.slice().sort();
  if (sw.join() !== both.join()) out.wrongHalogen = sw;
  return out;
}

export function dieneWhyWrong(pred, kind) {
  const X = pred.X;
  if (kind === 'only12') return `This is only the 1,2-addition product (H on C1, ${X} on C2). The cation is allylic, so its + charge is shared by C2 and C4 and ${X}⁻ can attack either one. The 1,4-product forms too.`;
  if (kind === 'only14') return `This is only the 1,4-addition product (H on C1, ${X} on C4, the C=C moved to C2=C3). ${X}⁻ can attack C2 as well as C4, because both share the + charge. The 1,2-product forms too.`;
  if (kind === 'nonallylic') return `H⁺ added to an inner carbon here, which would leave the + charge on a carbon that is NOT next to the other C=C. That cation has no resonance form and is far less stable than the allylic one, so it does not form.`;
  if (kind === 'unchanged') return 'That is the starting diene again. This is an addition: one π bond is used up and H and ' + X + ' are added.';
  if (kind === 'wrongHalogen') return `The atom that adds is the halogen of the acid, ${X}. This answer carries a different halogen, so it is the product of a different HX.`;
  return 'Not the product.';
}

/** The right answer plus distractors: [{smiles:[...], correct, kind, why}] (n options in total, default 4). */
export function dieneChoices(pred, opts = {}) {
  const D = dieneDistractors(pred);
  const n = opts.n || 4;
  const order = opts.kinds || KIND_ORDER;
  const kinds = order.filter((k) => D[k]).slice(0, n - 1);
  const right = {
    smiles: pred.products.slice(), correct: true, kind: 'major',
    why: pred.outcome === 'two'
      ? `Yes. H⁺ adds to C1, which gives the allylic cation (the + charge shared by C2 and C4 by resonance). ${pred.X}⁻ attacks either end: 1,2-addition and 1,4-addition products both form.`
      : `Yes. The allylic cation has its + charge shared by two carbons, but in this diene attack at either end gives the SAME compound, so there is just one product.`
  };
  return [right, ...kinds.map((k) => ({ smiles: D[k], correct: false, kind: k, why: dieneWhyWrong(pred, k) }))];
}

/** Illustrative energy levels (kJ/mol) for the allylic path against the non-allylic one; labelled illustrative wherever shown. */
export function allylicLevels(allylic = true) {
  const I = allylic ? 80 : 120;
  return [
    { label: 'diene + HBr', kind: 'R', E: 50 },
    { label: '', kind: 'TS', E: I + 15 },
    { label: allylic ? 'allylic cation' : 'non-allylic cation', kind: 'I', E: I },
    { label: '', kind: 'TS', E: I + 8 },
    { label: 'allylic bromides', kind: 'P', E: 10 }
  ];
}
