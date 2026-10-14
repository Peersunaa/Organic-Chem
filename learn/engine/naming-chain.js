// IUPAC names for the products of Lesson 12 (alkynes): straight-chain halides, alkenes with halogens, and ketones.
// Hydrocarbons are named by the Lesson 05 / 07 engine (nameAlkane / nameAlkene: alkanes, alkenes, alkynes, with alkyl branches).
// This module adds the pieces those engines leave out, for UNBRANCHED acyclic chains only:
//   * halogen prefixes (bromo, chloro, fluoro, iodo; di-, tri-, tetra-; alphabetical),
//   * the ketone ending (hexan-2-one / 2-hexanone),
//   * the (E) / (Z) prefix, read from the CIP labels of cip.js.
// Numbering: the ketone C=O first; otherwise the C=C or C≡C first, then the halogens as a set (lowest locants).
// Anything else (branches, rings, an OH, an aldehyde, several multiple bonds, an alkene plus a ketone) returns null instead of guessing.
import { analyze } from './chem.js';
import { ezInfo } from './cip.js';
import { nameAlkane, nameAlkene } from './naming.js';

const STEM = ['meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec'];
const MULT = { 1: '', 2: 'di', 3: 'tri', 4: 'tetra', 5: 'penta', 6: 'hexa' };
const HAL = { Br: 'bromo', Cl: 'chloro', F: 'fluoro', I: 'iodo' };

const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i] === undefined) return -1; if (b[i] === undefined) return 1; if (a[i] !== b[i]) return a[i] - b[i]; } return 0; };

/** Name of an unbranched chain with halogens / one multiple bond / one ketone, or null. */
export function chainName(smiles, mode = 'new') {
  let info = null;
  try { info = analyze(smiles); } catch (e) { info = null; }
  if (!info || info.atoms.length < 2 || info.atoms.length > 30) return null;
  const A = info.atoms;
  if (A.some((a) => a.fc !== 0 || !(a.sym === 'C' || a.sym === 'O' || HAL[a.sym]))) return null;
  if (info.bonds.length !== A.length - 1) return null;            // a tree (no ring, connected)
  const seen = new Set([0]); const st = [0];
  while (st.length) { const v = st.pop(); for (const w of A[v].nbrs) if (!seen.has(w)) { seen.add(w); st.push(w); } }
  if (seen.size !== A.length) return null;
  const bo = (i, j) => { const b = info.bonds.find((x) => x.atoms.includes(i) && x.atoms.includes(j)); return b ? (b.bo ?? 1) : 0; };
  const carbons = A.filter((a) => a.sym === 'C').map((a) => a.idx);
  const cn = (c) => A[c].nbrs.filter((k) => A[k].sym === 'C');
  if (carbons.some((c) => cn(c).length > 2)) return null;         // branched
  const ends = carbons.filter((c) => cn(c).length <= 1);
  if (carbons.length === 1 || ends.length !== 2) return null;
  const path = [ends[0]];
  while (path.length < carbons.length) { const nx = cn(path[path.length - 1]).find((k) => !path.includes(k)); if (nx === undefined) return null; path.push(nx); }
  const L = path.length;
  // what hangs on the chain
  const hal = path.map((c) => A[c].nbrs.filter((k) => HAL[A[k].sym]).map((k) => A[k].sym));
  const oxy = path.map((c) => A[c].nbrs.filter((k) => A[k].sym === 'O'));
  const nO = oxy.reduce((s, l) => s + l.length, 0);
  if (nO > 1) return null;
  if (A.some((a) => HAL[a.sym] && bo(a.idx, a.nbrs[0]) !== 1)) return null;
  const mult = [];
  for (let i = 0; i < L - 1; i++) { const o = bo(path[i], path[i + 1]); if (o > 1) mult.push({ i, o }); }
  let kind = 'ane', ketoneAt = -1;
  if (nO === 1) {
    const at = oxy.findIndex((l) => l.length);
    if (bo(path[at], oxy[at][0]) !== 2 || mult.length || hal.some((l) => l.length) || at === 0 || at === L - 1) return null;
    kind = 'one'; ketoneAt = at;
  } else if (mult.length) {
    if (mult.length > 1) return null;
    kind = mult[0].o === 2 ? 'ene' : 'yne';
  }
  // numbering: both directions, the one with the lower locants (feature, then halogens) wins
  const opts = [false, true].map((rev) => {
    const pos = (i) => (rev ? L - i : i + 1);
    const feat = kind === 'one' ? [pos(ketoneAt)] : kind === 'ane' ? [] : [Math.min(pos(mult[0].i), pos(mult[0].i + 1))];
    const hl = []; hal.forEach((l, i) => l.forEach((x) => hl.push({ el: x, loc: pos(i) })));
    return { rev, pos, feat, hl, locs: hl.map((x) => x.loc).sort((a, b) => a - b) };
  });
  opts.sort((x, y) => cmp(x.feat, y.feat) || cmp(x.locs, y.locs));
  const best = opts[0];
  if (opts.length === 2 && cmp(opts[0].feat, opts[1].feat) === 0 && cmp(opts[0].locs, opts[1].locs) === 0) {
    // symmetric numbering: prefixes alphabetical decides, but with a single halogen kind the two directions give the same name
    const kinds = new Set(best.hl.map((x) => x.el));
    if (kinds.size > 1) return null;
  }
  // prefix
  const byEl = {};
  best.hl.forEach((x) => { (byEl[x.el] ||= []).push(x.loc); });
  const pre = Object.keys(byEl).sort((a, b) => (HAL[a] < HAL[b] ? -1 : 1)).map((el) => {
    const locs = byEl[el].sort((a, b) => a - b);
    return `${locs.join(',')}-${MULT[locs.length] || ''}${HAL[el]}`;
  }).join('-');
  const stem = STEM[L - 1];
  if (!stem) return null;
  let name;
  if (kind === 'one') name = mode === 'new' ? `${stem}an-${best.feat[0]}-one` : `${best.feat[0]}-${stem}anone`;
  else if (kind === 'ane') name = `${pre}${stem}ane`;
  else {
    const needLoc = !(L === 2) && !(L === 3 && !pre);
    const base = mode === 'new' ? `${stem}${needLoc ? `-${best.feat[0]}-` : ''}${kind}` : `${needLoc ? best.feat[0] + '-' : ''}${stem}${kind}`;
    name = pre ? (mode === 'new' ? pre + base : pre + '-' + base) : base;
    if (kind === 'ene') {
      const ez = ezInfo(smiles);
      const e = ez && ez.find((x) => x.capable && x.label);
      if (e) name = `(${e.label})-` + name;
    }
  }
  return name;
}

/** Name in one style for any molecule this course names: hydrocarbons by the Lesson 05/07 engine, functional chains by chainName. */
export function nameAny(smiles, mode = 'new') {
  let info = null;
  try { info = analyze(smiles); } catch (e) { info = null; }
  if (!info) return null;
  if (info.atoms.every((a) => a.sym === 'C')) {
    const multi = info.bonds.some((b) => (b.bo ?? 1) > 1);
    return multi ? nameAlkene(smiles, mode) : nameAlkane(smiles, mode);
  }
  return chainName(smiles, mode);
}
export function nameBothAny(smiles) {
  const a = nameAny(smiles, 'new'), b = nameAny(smiles, 'old');
  return a && b ? { new: a, old: b } : null;
}
