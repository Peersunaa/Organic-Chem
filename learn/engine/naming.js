// IUPAC naming of acyclic alkanes and monocyclic cycloalkanes (Lesson 05). Deterministic and rule-based:
//   parent choice  : acyclic = longest chain (tie: more substituents); ring vs chain = the larger one (McMurry 2.7)
//   numbering      : lowest locant set at the first point of difference; tie = first-cited substituent (alphabetical) lowest
//   prefixes       : alphabetical, ignoring di/tri/bis and sec-/tert- but not iso; commas between numbers, hyphens elsewhere
// Two styles ("new" = current IUPAC substituent names, "old" = traditional):
//   isopropyl = propan-2-yl, sec-butyl = butan-2-yl, isobutyl = 2-methylpropyl; tert-butyl is kept in both (as McMurry does).
// Anything outside the scope (heteroatoms, multiple bonds, 2+ rings, substituents beyond methyl..butyl incl. iso/sec/tert,
// stereo-SMILES, unresolved ties) returns null instead of guessing.
import { analyze, canon } from './chem.js';
import { ezInfo, readGraph } from './cip.js';

export const MODES = ['new', 'old'];
const ROOT = ['meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec', 'undec', 'dodec', 'tridec', 'tetradec', 'pentadec', 'hexadec', 'heptadec', 'octadec', 'nonadec', 'icos'];
export const ROOT_NAMES = ROOT.map((r) => r + 'ane');
const MULT = { 2: 'di', 3: 'tri', 4: 'tetra', 5: 'penta', 6: 'hexa' };
const BIS = { 2: 'bis', 3: 'tris', 4: 'tetrakis', 5: 'pentakis', 6: 'hexakis' };

// ---- substituents: tree literal -> id
const sigOfTree = (t) => '(' + t.map(sigOfTree).sort().join('') + ')';
const rootedLen = (t) => 1 + (t.length ? Math.max(...t.map(rootedLen)) : 0);
const SUBS = {
  methyl: { tree: [], new: 'methyl', old: 'methyl', key: { new: 'methyl', old: 'methyl' }, par: { new: false, old: false } },
  ethyl: { tree: [[]], new: 'ethyl', old: 'ethyl', key: { new: 'ethyl', old: 'ethyl' }, par: { new: false, old: false } },
  propyl: { tree: [[[]]], new: 'propyl', old: 'propyl', key: { new: 'propyl', old: 'propyl' }, par: { new: false, old: false } },
  isopropyl: { tree: [[], []], new: 'propan-2-yl', old: 'isopropyl', key: { new: 'propanyl', old: 'isopropyl' }, par: { new: true, old: false } },
  butyl: { tree: [[[[]]]], new: 'butyl', old: 'butyl', key: { new: 'butyl', old: 'butyl' }, par: { new: false, old: false } },
  isobutyl: { tree: [[[], []]], new: '2-methylpropyl', old: 'isobutyl', key: { new: 'methylpropyl', old: 'isobutyl' }, par: { new: true, old: false } },
  'sec-butyl': { tree: [[], [[]]], new: 'butan-2-yl', old: 'sec-butyl', key: { new: 'butanyl', old: 'butyl' }, par: { new: true, old: false } },
  'tert-butyl': { tree: [[], [], []], new: 'tert-butyl', old: 'tert-butyl', key: { new: 'butyl', old: 'butyl' }, par: { new: false, old: false } }
};
export const SUB_IDS = Object.keys(SUBS);
const BY_SIG = {};
for (const id of SUB_IDS) { SUBS[id].size = (function count(t) { return 1 + t.reduce((s, k) => s + count(k), 0); })(SUBS[id].tree); SUBS[id].rooted = rootedLen(SUBS[id].tree); BY_SIG[sigOfTree(SUBS[id].tree)] = id; }

/** Display facts for a substituent id ('methyl' ... or 'cyclo5' for a cyclopentyl group). */
export function subInfo(id) {
  if (SUBS[id]) return SUBS[id];
  const m = /^cyclo(\d+)$/.exec(id);
  if (m) { const n = Number(m[1]); const nm = 'cyclo' + ROOT[n - 1] + 'yl'; return { new: nm, old: nm, key: { new: nm, old: nm }, par: { new: false, old: false }, size: n, rooted: 1 }; }
  return null;
}
/** Sentence-friendly name of a substituent in one style. */
export function subName(id, mode) { return subInfo(id)[mode]; }
export function subSize(id) { return subInfo(id).size; }
export function subRooted(id) { return subInfo(id).rooted; }
/** SMILES fragment (written from the attachment atom outwards) for building structures. */
const FRAG = { methyl: 'C', ethyl: 'CC', propyl: 'CCC', isopropyl: 'C(C)C', butyl: 'CCCC', isobutyl: 'CC(C)C', 'sec-butyl': 'C(C)CC', 'tert-butyl': 'C(C)(C)C' };
export function subFragment(id) {
  if (FRAG[id]) return FRAG[id];
  const m = /^cyclo(\d+)$/.exec(id);
  if (m) { const n = Number(m[1]); return 'C1' + 'C'.repeat(n - 1) + '1'; }
  return null;
}

const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
function cmpNums(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i] === undefined) return -1; if (b[i] === undefined) return 1; if (a[i] !== b[i]) return a[i] - b[i]; } return 0; }
const keyOf = (id, mode) => subInfo(id).key[mode];

// ---- assembling a name from parts
/** parent: {kind:'chain'|'ring', size}; subs: [{id, loc}]; opts.order: 'iupac' (default) | 'locant' | 'reverse' | 'multiplier' */
export function assembleName(parent, subs, mode, opts = {}) {
  const groups = {};
  subs.forEach((s) => { (groups[s.id] ||= []).push(s.loc); });
  let ids = Object.keys(groups);
  const k = (id) => (opts.order === 'multiplier' ? (MULT[groups[id].length] || '') + keyOf(id, mode) : keyOf(id, mode));
  if (opts.order === 'locant') ids.sort((a, b) => Math.min(...groups[a]) - Math.min(...groups[b]) || cmpStr(k(a), k(b)));
  else if (opts.order === 'reverse') ids.sort((a, b) => cmpStr(k(b), k(a)));
  else ids.sort((a, b) => cmpStr(k(a), k(b)));
  const omitLoc = parent.kind === 'ring' && subs.length === 1;
  const parts = ids.map((id) => {
    const locs = groups[id].slice().sort((x, y) => x - y);
    const info = subInfo(id);
    const nm = info[mode];
    const complex = info.par[mode];
    const n = locs.length;
    let pref;
    if (n === 1) pref = complex ? `(${nm})` : nm;
    else if (complex) pref = `${BIS[n] || MULT[n]}(${nm})`;
    else pref = (MULT[n] || '') + (/^(sec|tert)-/.test(nm) ? '-' : '') + nm;
    return (omitLoc ? '' : locs.join(',') + '-') + pref;
  });
  const base = (parent.kind === 'ring' ? 'cyclo' : '') + ROOT[parent.size - 1] + 'ane';
  return parts.join('-') + base;
}

// ---- reading the molecule
/** Graph of a carbon-only, saturated, connected molecule. Atom indices are those of the SMILES as written. */
export function parseAlkane(smiles) {
  if (typeof smiles !== 'string' || /[@/\\]|[a-z]/.test(smiles.replace(/Cl|Br/g, ''))) return null;
  let info = null;
  try { info = analyze(smiles); } catch (e) { return null; }
  if (!info || !info.atoms.length || info.atoms.length > 20) return null;
  if (info.atoms.some((a) => a.z !== 6 || a.fc !== 0 || a.impH < 0)) return null;
  if (info.bonds.some((b) => (b.bo ?? 1) !== 1)) return null;
  const n = info.atoms.length;
  const adj = info.atoms.map((a) => a.nbrs.slice());
  // connected?
  const seen = new Set([0]); const stack = [0];
  while (stack.length) { const v = stack.pop(); for (const w of adj[v]) if (!seen.has(w)) { seen.add(w); stack.push(w); } }
  if (seen.size !== n) return null;
  const rings = info.bonds.length - n + 1;
  if (rings > 1) return null;
  let ring = null;
  if (rings === 1) {
    // strip leaves until only the ring is left, then walk it
    const deg = adj.map((x) => x.length); const alive = new Set(adj.keys());
    const q = [...alive].filter((v) => deg[v] === 1);
    while (q.length) { const v = q.pop(); alive.delete(v); for (const w of adj[v]) if (alive.has(w)) { deg[w]--; if (deg[w] === 1) q.push(w); } }
    const start = Math.min(...alive); ring = [start]; let prev = -1, cur = start;
    for (;;) { const nx = adj[cur].find((w) => alive.has(w) && w !== prev); if (nx === undefined || nx === start) break; ring.push(nx); prev = cur; cur = nx; if (ring.length > alive.size) break; }
    if (ring.length !== alive.size || ring.length < 3) return null;
  }
  return { n, adj, ring, atoms: info.atoms };
}

/** Signature of the branch rooted at w (coming from p), or null if it is not an allowed substituent. */
function branchSig(adj, w, p, pend) {
  if (pend && pend[w] && pend[w].length) return '*';
  return '(' + adj[w].filter((x) => x !== p).map((c) => branchSig(adj, c, w, pend)).sort().join('') + ')';
}
function branchId(adj, w, p, pend) { const s = branchSig(adj, w, p, pend); return s.includes('*') ? null : BY_SIG[s] || null; }
function rootedLength(adj, w, p) { const kids = adj[w].filter((x) => x !== p); return 1 + (kids.length ? Math.max(...kids.map((c) => rootedLength(adj, c, w))) : 0); }

function allPaths(nodes, adj) {
  const out = [];
  for (const u of nodes) {
    const par = new Map([[u, null]]); const q = [u];
    while (q.length) { const v = q.shift(); for (const w of adj[v]) if (!par.has(w) && nodes.includes(w)) { par.set(w, v); q.push(w); } }
    for (const v of nodes) {
      if (v < u || !par.has(v)) continue;
      const path = []; for (let x = v; x !== null; x = par.get(x)) path.push(x);
      out.push(path.reverse());
    }
  }
  return out;
}

/** Score a numbering: {locs sorted, alpha-ordered locs}. Lower is better, locs first. */
function scoreOf(subs, mode) {
  const locs = subs.map((s) => s.loc).sort((a, b) => a - b);
  const alpha = subs.slice().sort((a, b) => cmpStr(keyOf(a.id, mode), keyOf(b.id, mode)) || a.loc - b.loc).map((s) => s.loc);
  return { locs, alpha };
}
const cmpScore = (a, b) => cmpNums(a.locs, b.locs) || cmpNums(a.alpha, b.alpha);

/** Acyclic naming on a tree (nodes, adj) with optional pendant groups (a ring attached to a chain atom). */
function analyseAcyclic(nodes, adj, pend, mode) {
  const paths = allPaths(nodes, adj);
  const maxLen = Math.max(...paths.map((p) => p.length));
  const branchesOf = (path) => {
    const inPath = new Set(path); const out = [];
    path.forEach((v, i) => {
      for (const w of adj[v]) if (!inPath.has(w)) out.push({ at: v, idx: i, root: w, id: branchId(adj, w, v, pend) });
      for (const pid of (pend && pend[v]) || []) out.push({ at: v, idx: i, root: null, id: pid });
    });
    return out;
  };
  let cands = paths.filter((p) => p.length === maxLen).map((p) => ({ path: p, brs: branchesOf(p) }));
  const maxSubs = Math.max(...cands.map((c) => c.brs.length));
  const longest = cands.map((c) => c.path);
  cands = cands.filter((c) => c.brs.length === maxSubs);
  const opts = [];
  for (const c of cands) for (const rev of [false, true]) {
    const subs = c.brs.map((b) => ({ ...b, loc: rev ? maxLen - b.idx : b.idx + 1 }));
    opts.push({ path: rev ? c.path.slice().reverse() : c.path.slice(), subs, rev, unknown: subs.some((s) => !s.id) });
  }
  return { maxLen, maxSubs, longest, cands, opts, branchesOf };
}

function pickBest(opts, mode) {
  for (const o of opts) o.score = o.subs.some((s) => !s.id) ? null : scoreOf(o.subs, mode);
  const withLocs = opts.map((o) => ({ o, locs: o.subs.map((s) => s.loc).sort((a, b) => a - b) }));
  withLocs.sort((a, b) => cmpNums(a.locs, b.locs));
  const tied = withLocs.filter((x) => cmpNums(x.locs, withLocs[0].locs) === 0).map((x) => x.o);
  if (tied.some((o) => !o.score)) return null;
  tied.sort((a, b) => cmpScore(a.score, b.score));
  const best = tied.filter((o) => cmpScore(o.score, tied[0].score) === 0);
  const ids = [...new Set(best.flatMap((o) => o.subs.map((s) => s.id)))];
  const keys = ids.map((id) => keyOf(id, mode));
  if (new Set(keys).size !== keys.length) return null; // two different groups file under the same letters: out of scope
  return { best, tied };
}

/**
 * Full analysis. Returns null outside the scope. Otherwise
 * { kind:'chain'|'ring'|'ring-sub', parent:{kind,size}, parentAtoms:[idx in numbering order], subs:[{id, loc, at, root}], name }
 */
export function alkaneInfo(smiles, mode = 'new') {
  const g = parseAlkane(smiles);
  if (!g) return null;
  const { adj, ring } = g;
  if (!ring) {
    const nodes = [...adj.keys()];
    const a = analyseAcyclic(nodes, adj, null, mode);
    const pb = pickBest(a.opts, mode);
    if (!pb) return null;
    const b = pb.best[0];
    const names = new Set(pb.best.map((o) => assembleName({ kind: 'chain', size: a.maxLen }, o.subs, mode)));
    if (names.size !== 1) return null;
    return { kind: 'chain', parent: { kind: 'chain', size: a.maxLen }, parentAtoms: b.path, subs: b.subs, name: [...names][0], ends: [...new Set(pb.best.map((o) => o.path[0]))], g };
  }
  // one ring
  const ringSet = new Set(ring);
  const exterior = [];
  ring.forEach((r) => { for (const w of adj[r]) if (!ringSet.has(w)) exterior.push({ at: r, root: w }); });
  const L = exterior.length ? Math.max(...exterior.map((e) => rootedLength(adj, e.root, e.at))) : 0;
  if (ring.length >= L) {
    const n = ring.length;
    const opts = [];
    for (let s = 0; s < n; s++) for (const d of [1, -1]) {
      const subs = exterior.map((e) => { const k = ring.indexOf(e.at); const loc = ((((k - s) * d) % n) + n) % n + 1; return { at: e.at, root: e.root, loc, id: branchId(adj, e.root, e.at, null), idx: k }; });
      const order = ring.map((_, j) => ring[(((s + j * d) % n) + n) % n]);
      opts.push({ path: order, subs, rev: d === -1, unknown: subs.some((x) => !x.id) });
    }
    const pb = pickBest(opts, mode);
    if (!pb) return null;
    const b = pb.best[0];
    const names = new Set(pb.best.map((o) => assembleName({ kind: 'ring', size: n }, o.subs, mode)));
    if (names.size !== 1) return null;
    return { kind: 'ring', parent: { kind: 'ring', size: n }, parentAtoms: b.path, subs: b.subs, name: [...names][0], ends: [], g };
  }
  // the chain is larger than the ring: the ring becomes a cycloalkyl substituent (one plain ring on one chain atom only)
  if (exterior.length !== 1) return null;
  const e = exterior[0];
  const nodes = [...adj.keys()].filter((v) => !ringSet.has(v));
  const adj2 = adj.map((x, v) => (ringSet.has(v) ? [] : x.filter((w) => !ringSet.has(w))));
  const pend = {}; pend[e.root] = ['cyclo' + ring.length];
  const a = analyseAcyclic(nodes, adj2, pend, mode);
  const pb = pickBest(a.opts, mode);
  if (!pb) return null;
  const b = pb.best[0];
  const names = new Set(pb.best.map((o) => assembleName({ kind: 'chain', size: a.maxLen }, o.subs, mode)));
  if (names.size !== 1) return null;
  return { kind: 'ring-sub', parent: { kind: 'chain', size: a.maxLen }, parentAtoms: b.path, subs: b.subs, name: [...names][0], ends: [...new Set(pb.best.map((o) => o.path[0]))], ring, g };
}

/** The IUPAC name of an alkane / cycloalkane in one style, or null outside the scope. */
export function nameAlkane(smiles, mode = 'new') { const i = alkaneInfo(smiles, mode); return i ? i.name : null; }
/** {new, old} or null */
export function nameBoth(smiles) {
  const a = nameAlkane(smiles, 'new'), b = nameAlkane(smiles, 'old');
  return a && b ? { new: a, old: b } : null;
}

// ---- typed answers
/** Lower-case, drop spaces/hyphens/dashes and brackets: "2-Methyl-4-(propan-2-yl)heptane" == "2methyl4propan2ylheptane". */
export function normName(s) { return String(s).toLowerCase().replace(/[\s\-–−‒—()[\]{}]/g, ''); }
/** Both styles of the name, de-duplicated. */
export function acceptedNames(smiles) { const b = nameBoth(smiles); return b ? [...new Set([b.new, b.old])] : []; }
export function matchesName(smiles, typed) { const t = normName(typed); return acceptedNames(smiles).some((n) => normName(n) === t); }

// ---- carbon classes
/** 1, 2, 3 or 4: number of other carbons bonded to the carbon (0 for methane). */
export function carbonClass(smiles, idx) { const g = parseAlkane(smiles); return g ? g.adj[idx].length : null; }
export const CLASS_NAMES = { 0: 'methane carbon', 1: 'primary (1°)', 2: 'secondary (2°)', 3: 'tertiary (3°)', 4: 'quaternary (4°)' };

// ---- chain facts for the tracing widget
/** What a learner has to trace. */
export function parentInfo(smiles) {
  const g = parseAlkane(smiles);
  if (!g) return null;
  const { adj, ring } = g;
  if (!ring) {
    const a = analyseAcyclic([...adj.keys()], adj, null, 'new');
    return { kind: 'chain', L: a.maxLen, longest: a.longest, best: a.cands.map((c) => c.path), maxSubs: a.maxSubs, subsOf: (path) => a.branchesOf(path).length, adj };
  }
  const ringSet = new Set(ring);
  const exterior = [];
  ring.forEach((r) => { for (const w of adj[r]) if (!ringSet.has(w)) exterior.push({ at: r, root: w }); });
  const L = exterior.length ? Math.max(...exterior.map((e) => rootedLength(adj, e.root, e.at))) : 0;
  const nodes = [...adj.keys()].filter((v) => !ringSet.has(v));
  let chain = [];
  if (nodes.length) {
    const adj2 = adj.map((x, v) => (ringSet.has(v) ? [] : x.filter((w) => !ringSet.has(w))));
    const paths = allPaths(nodes, adj2);
    const e0 = exterior[0];
    // the substituent chain counted from the ring: longest path that starts at the carbon bonded to the ring
    const rooted = paths.filter((p) => p[0] === e0.root || p[p.length - 1] === e0.root).map((p) => (p[0] === e0.root ? p : p.slice().reverse()));
    const maxl = Math.max(...rooted.map((p) => p.length));
    chain = rooted.filter((p) => p.length === maxl);
  }
  return { kind: ring.length >= L ? 'ring' : 'chain', ring, ringSize: ring.length, chainLen: L, chains: chain, exteriorCount: exterior.length, adj };
}

/** Which end(s) should be C1 for the correct parent chain (empty for rings). */
export function numberingEnds(smiles, mode = 'new') { const i = alkaneInfo(smiles, mode); return i ? i.ends : null; }
/** Locants the branches would get when numbering the chain starting at atom `start` (an end), e.g. [2,4]. */
export function locantsFrom(smiles, start) {
  const i = alkaneInfo(smiles, 'new');
  if (!i || i.kind === 'ring') return null;
  const path = i.parentAtoms; const L = path.length;
  const fromFirst = path[0] === start;
  if (!fromFirst && path[L - 1] !== start) return null;
  return i.subs.map((s) => { const idx = path.indexOf(s.at); return fromFirst ? idx + 1 : L - idx; }).sort((a, b) => a - b);
}

// ---- explaining mistakes in typed answers
const PARENT_WORDS = ROOT.map((r) => r + 'ane');
export function diagnoseTyped(smiles, typed) {
  const info = alkaneInfo(smiles, 'new');
  const infoO = alkaneInfo(smiles, 'old');
  if (!info || !infoO) return null;
  const t = normName(typed);
  const parentEnd = (s) => { const m = /(cyclo)?(undec|dodec|tridec|tetradec|pentadec|hexadec|heptadec|octadec|nonadec|icos|meth|eth|prop|but|pent|hex|hept|oct|non|dec)ane$/.exec(s); return m ? { ring: !!m[1], root: m[2] } : null; };
  const got = parentEnd(t);
  if (!got) return 'A name ends with its parent: the chain (such as hexane) or the ring (such as cyclohexane). Start from the parent, then add the branches in front of it.';
  const wantParent = { ring: info.parent.kind === 'ring', root: ROOT[info.parent.size - 1] };
  if (got.ring !== wantParent.ring || got.root !== wantParent.root) {
    const gi = ROOT.indexOf(got.root) + 1;
    if (info.parent.kind === 'ring' && !got.ring) return `The parent here is the ring (${info.parent.size} carbons), not a chain: the ring is at least as big as any chain on it, so it is the parent.`;
    if (info.parent.kind === 'chain' && got.ring) return 'The parent is a chain here, not a ring: the longest chain is larger than the ring.';
    if (wantParent.ring === got.ring) return gi < info.parent.size ? `Your parent has ${gi} carbons but the longest ${wantParent.ring ? 'ring' : 'chain'} has ${info.parent.size}. ${wantParent.ring ? '' : 'Look for a chain that bends through a branch. '}Count again.` : `Your parent has ${gi} carbons, but the longest ${wantParent.ring ? 'ring' : 'chain'} is only ${info.parent.size}. Count the carbons of the parent only; branches are not part of it.`;
  }
  const nums = (s) => (s.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
  const expect = nums(info.name);
  const expectO = nums(infoO.name);
  const have = nums(t);
  const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const wantLocants = info.parent.kind === 'ring' && info.subs.length === 1 ? 0 : info.subs.length;
  const locCount = (s) => (s.match(/\d+(,\d+)*/g) || []).join(',').split(',').filter(Boolean).length;
  if (have.length && !sameList(have, expect) && !sameList(have, expectO)) {
    const L = info.parent.size;
    if (info.parent.kind === 'chain' && sameList(have, info.subs.map((s) => L + 1 - s.loc).sort((a, b) => a - b))) return 'Number from the other end: the first branch should get the lowest number.';
    return 'Check the numbers: number the parent from the end that gives the first branch the lowest locant, and give every branch its own number (two groups on the same carbon repeat the number).';
  }
  if (wantLocants && locCount(t) !== wantLocants && locCount(t) !== 0) return 'Every branch needs its own locant, even when two of them sit on the same carbon (for example 2,2-dimethyl).';
  const words = [];
  for (const m of [info, infoO]) for (const s of m.subs) words.push(subInfo(s.id)[m === info ? 'new' : 'old']);
  const counts = {};
  info.subs.forEach((s) => { counts[s.id] = (counts[s.id] || 0) + 1; });
  const needMult = Object.values(counts).some((c) => c > 1);
  if (needMult && !/(di|tri|tetra|bis|tris)/.test(t)) return 'When the same branch appears more than once, say how many with di-, tri- or tetra- (bis- or tris- before a bracketed name).';
  if (!needMult && /(^|\d)(di|tri|tetra)/.test(t)) return 'Only use di-, tri- or tetra- when the same branch really occurs twice or more.';
  // same numbers, so the order of the prefixes (or the punctuation) is off
  return 'The numbers look right, so check which branch goes with which number, then the order of the prefixes: alphabetical, ignoring di-, tri- and sec-/tert- (but not iso), and write it as one word with hyphens and commas.';
}

// ---- variants of a name that a learner is likely to type, each with the reason it is wrong
/** [{name, why}] (names in both styles, never equal to a correct answer). */
export function wrongNames(smiles) {
  const out = [];
  const right = new Set(acceptedNames(smiles).map(normName));
  const add = (name, why) => { if (name && !right.has(normName(name)) && !out.some((x) => normName(x.name) === normName(name))) out.push({ name, why }); };
  const g = parseAlkane(smiles);
  if (!g) return out;
  for (const mode of MODES) {
    const info = alkaneInfo(smiles, mode);
    if (!info) continue;
    const parent = info.parent;
    const subs = info.subs.map((s) => ({ id: s.id, loc: s.loc }));
    const L = parent.size;
    // 1. numbered the other way (chains and rings)
    if (info.kind !== 'ring') {
      const mirror = subs.map((s) => ({ id: s.id, loc: L + 1 - s.loc }));
      add(assembleName(parent, mirror, mode), 'You numbered from the wrong end. Number from the end nearer the first branch so that its locant is as low as possible.');
    } else if (subs.length > 1) {
      const n = L;
      for (const d of [1, -1]) for (let s0 = 0; s0 < n; s0++) {
        const alt = info.subs.map((s) => { const k = info.parentAtoms.indexOf(s.at); const loc = ((((k - s0) * d) % n) + n) % n + 1; return { id: s.id, loc }; });
        const sc = scoreOf(alt, mode), best = scoreOf(info.subs, mode);
        if (cmpScore(sc, best) === 0) continue;
        const tie = cmpNums(sc.locs, best.locs) === 0;
        add(assembleName(parent, alt, mode), tie ? 'The locants tie, so the branch that comes first alphabetically gets the lower number (ethyl before methyl, for example).' : 'Number the ring so that the set of locants is as low as possible at the first point of difference.');
      }
    }
    // 2. alphabetical order
    const distinct = new Set(subs.map((s) => s.id));
    if (distinct.size > 1) {
      add(assembleName(parent, subs, mode, { order: 'reverse' }), 'The prefixes are out of alphabetical order. Put them in alphabetical order, not by size or by number.');
      add(assembleName(parent, subs, mode, { order: 'locant' }), 'Do not list the branches in the order of their numbers. List them alphabetically (ethyl before methyl) and keep each one with its own locant.');
      add(assembleName(parent, subs, mode, { order: 'multiplier' }), 'di-, tri- and tetra- are ignored when alphabetizing: dimethyl is filed under m, not d.');
    }
    // 3. a shorter parent chain
    if (info.kind === 'chain') {
      const nodes = [...g.adj.keys()];
      const paths = allPaths(nodes, g.adj).filter((p) => p.length < L && p.length >= 3);
      const leaf = (v) => g.adj[v].length === 1;
      const maxShort = Math.max(0, ...paths.filter((p) => leaf(p[0]) && leaf(p[p.length - 1])).map((p) => p.length));
      if (maxShort >= 3) {
        const cands = paths.filter((p) => p.length === maxShort && leaf(p[0]) && leaf(p[p.length - 1]));
        const adj = g.adj;
        const opts = [];
        for (const p of cands) {
          const inP = new Set(p); const brs = [];
          p.forEach((v, i) => { for (const w of adj[v]) if (!inP.has(w)) brs.push({ idx: i, id: branchId(adj, w, v, null) }); });
          for (const rev of [false, true]) opts.push({ path: p, rev, subs: brs.map((b) => ({ id: b.id, loc: rev ? maxShort - b.idx : b.idx + 1 })) });
        }
        const ok = opts.filter((o) => o.subs.every((s) => s.id));
        if (ok.length) {
          const mx = Math.max(...ok.map((o) => o.subs.length));
          const pool = ok.filter((o) => o.subs.length === mx);
          pool.sort((a, b) => cmpNums(a.subs.map((s) => s.loc).sort((x, y) => x - y), b.subs.map((s) => s.loc).sort((x, y) => x - y)));
          add(assembleName({ kind: 'chain', size: maxShort }, pool[0].subs, mode), `You picked a shorter chain (${maxShort} carbons): the longest chain bends through the branch and has ${L} carbons.`);
        }
      }
    }
  }
  return out;
}

// ---- building structures from parts (generators, distractors)
/** spec: {kind:'chain'|'ring', size, subs:[{id, loc}]}; loc is 1-based. Returns SMILES or null when a position would be over-full. */
export function buildSmiles(spec) {
  const n = spec.size;
  const per = Array.from({ length: n }, () => []);
  for (const s of spec.subs) { const f = subFragment(s.id); if (!f || s.loc < 1 || s.loc > n) return null; per[s.loc - 1].push(f); }
  let out = '';
  for (let i = 0; i < n; i++) {
    const free = spec.kind === 'ring' ? 2 : i === 0 || i === n - 1 ? 3 : 2;
    if (per[i].length > free) return null;
    let frag = 'C' + (spec.kind === 'ring' && i === 0 ? '9' : '');
    // ring-closure digits inside cyclo fragments use 1; keep the parent ring on 9 to avoid clashes
    frag += per[i].map((f) => `(${f})`).join('');
    if (spec.kind === 'ring' && i === n - 1) frag += '9';
    out += frag;
  }
  if (spec.kind === 'ring' && n < 3) return null;
  return out;
}


// =====================================================================================================================
// Alkenes, alkynes and cycloalkenes (Lesson 07)
//   parent     : the longest chain that contains EVERY multiple bond (a chain that misses the C=C is never the parent)
//   numbering  : lowest locants to the multiple bonds together, then to the substituents, then the first-cited substituent
//                alphabetically, then Z before E
//   new style  : locant before the ending (but-2-ene, buta-1,3-diene, pent-1-yne); old style: locant in front (2-butene, 1,3-butadiene)
//   cycloalkene: the C=C is C1=C2, so the ring is numbered from it; the locant of the double bond is left out (3-methylcyclohexene)
//   E/Z        : "(E)-" in front when the SMILES fixes the geometry of a stereogenic C=C, "(2E,4Z)-" when there are several
// Out of scope (returns null): heteroatoms, enynes (mixed C=C and C≡C), cumulated bonds, more than two multiple bonds, ring plus
// chain multiple bonds, substituents beyond methyl..butyl, E/Z inside a ring, anything where the chain choice is not clear-cut.
// =====================================================================================================================
const STEM = ROOT; // meth eth prop but pent hex ...

function ringOf(adj, n) {
  const deg = adj.map((x) => x.length); const alive = new Set(adj.keys());
  const q = [...alive].filter((v) => deg[v] === 1);
  while (q.length) { const v = q.pop(); alive.delete(v); for (const w of adj[v]) if (alive.has(w)) { deg[w]--; if (deg[w] === 1) q.push(w); } }
  const start = Math.min(...alive); const ring = [start]; let prev = -1, cur = start;
  for (;;) { const nx = adj[cur].find((w) => alive.has(w) && w !== prev); if (nx === undefined || nx === start) break; ring.push(nx); prev = cur; cur = nx; if (ring.length > alive.size) break; }
  return ring.length === alive.size && ring.length >= 3 ? ring : null;
}

/** Graph of a carbon-only hydrocarbon with multiple bonds. Atom indices are those of the SMILES as written. */
export function parseAlkene(smiles) {
  if (typeof smiles !== 'string' || /[[@]|[a-z]/.test(smiles.replace(/Cl|Br/g, ''))) return null;
  let g = null;
  try { g = readGraph(smiles); } catch (e) { return null; }
  if (!g || !g.atoms.length || g.atoms.length > 20) return null;
  if (g.atoms.some((a) => a.z !== 6 || a.chg !== 0 || a.impH < 0)) return null;
  if (g.bonds.some((b) => b.bo > 3)) return null;
  const n = g.atoms.length;
  const adj = g.atoms.map((a) => a.nbrs.map((x) => x.to));
  const seen = new Set([0]); const stack = [0];
  while (stack.length) { const v = stack.pop(); for (const w of adj[v]) if (!seen.has(w)) { seen.add(w); stack.push(w); } }
  if (seen.size !== n) return null;
  const rings = g.bonds.length - n + 1;
  if (rings > 1) return null;
  const mult = g.bonds.filter((b) => b.bo > 1);
  if (!mult.length) return null;
  const ring = rings === 1 ? ringOf(adj, n) : null;
  if (rings === 1 && !ring) return null;
  return { n, adj, ring, g, mult };
}

/** Substituent prefixes with a locant on every group (rings keep the locant of a single group). */
export function prefixString(subs, mode) {
  const groups = {};
  subs.forEach((s) => { (groups[s.id] ||= []).push(s.loc); });
  const ids = Object.keys(groups).sort((a, b) => cmpStr(keyOf(a, mode), keyOf(b, mode)));
  return ids.map((id) => {
    const locs = groups[id].slice().sort((x, y) => x - y);
    const info = subInfo(id); const nm = info[mode]; const complex = info.par[mode]; const n = locs.length;
    let pref;
    if (n === 1) pref = complex ? `(${nm})` : nm;
    else if (complex) pref = `${BIS[n] || MULT[n]}(${nm})`;
    else pref = (MULT[n] || '') + (/^(sec|tert)-/.test(nm) ? '-' : '') + nm;
    return locs.join(',') + '-' + pref;
  }).join('-');
}

const zFirst = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] === 'Z' ? -1 : 1; return 0; };

function stereoParts(P, ez, order) {
  // order: atom -> position (1-based). Returns {error} | {desc:[{loc,label}]}
  const chain = ez.filter((e) => e.capable);
  const labelled = chain.filter((e) => e.label);
  if (labelled.length && labelled.length !== chain.length) return { error: true };
  if (labelled.some((e) => e.ring)) return { error: true };
  const desc = labelled.map((e) => ({ loc: Math.min(order(e.a), order(e.b)), label: e.label, a: e.a, b: e.b })).sort((x, y) => x.loc - y.loc);
  return { desc };
}

function stereoPrefix(desc) {
  if (!desc.length) return '';
  if (desc.length === 1) return `(${desc[0].label})-`;
  return `(${desc.map((d) => d.loc + d.label).join(',')})-`;
}

function buildAlkeneName(parent, mode, subs, multLocs, type, stereo) {
  const L = parent.size;
  const pre = prefixString(subs, mode);
  if (parent.kind === 'ring') return stereoPrefix(stereo) + pre + 'cyclo' + STEM[L - 1] + 'ene';
  const count = multLocs.length;
  const needLoc = !(L === 2) && !(L === 3 && subs.length === 0);
  let base;
  if (mode === 'new') base = count === 1 ? `${STEM[L - 1]}${needLoc ? `-${multLocs[0]}-` : ''}${type}` : `${STEM[L - 1]}a-${multLocs.join(',')}-di${type}`;
  else base = count === 1 ? `${needLoc ? multLocs[0] + '-' : ''}${STEM[L - 1]}${type}` : `${multLocs.join(',')}-${STEM[L - 1]}adi${type}`;
  const body = pre ? (mode === 'new' ? pre + base : pre + '-' + base) : base;
  return stereoPrefix(stereo) + body;
}

/**
 * Full analysis of an alkene / alkyne / cycloalkene. Returns null outside the scope, otherwise
 * { kind:'chain'|'ring', parent:{kind,size}, parentAtoms:[atoms in numbering order], mult:[locants], type:'ene'|'yne', subs:[{id,loc,at,root}],
 *   stereo:[{loc,label,a,b}], name, core (name without the (E)/(Z) prefix), ez }
 */
export function alkeneInfo(smiles, mode = 'new') {
  const P = parseAlkene(smiles);
  if (!P) return null;
  const { adj, ring, mult, g } = P;
  const bo = mult[0].bo;
  if (mult.some((b) => b.bo !== bo) || mult.length > 2) return null;
  if (mult.length === 2 && mult[0].a !== undefined && [mult[0].a, mult[0].b].some((v) => v === mult[1].a || v === mult[1].b)) return null; // cumulated
  const type = bo === 2 ? 'ene' : 'yne';
  const ez = ezInfo(smiles);
  if (!ez) return null;

  if (ring) {
    if (mult.length !== 1 || bo !== 2) return null;
    const ringSet = new Set(ring);
    const bd = mult[0];
    if (!ringSet.has(bd.a) || !ringSet.has(bd.b)) return null;
    const n = ring.length;
    if (ez.some((e) => e.label)) return null; // E/Z inside a ring: out of scope
    const pa = ring.indexOf(bd.a), pb = ring.indexOf(bd.b);
    const fwd = (pa + 1) % n === pb; // b follows a around the ring
    const starts = [{ s: pa, d: fwd ? 1 : -1 }, { s: pb, d: fwd ? -1 : 1 }];
    const opts = starts.map(({ s, d }) => {
      const order = ring.map((_, j) => ring[(((s + j * d) % n) + n) % n]);
      const subs = [];
      order.forEach((r, i) => { for (const w of adj[r]) if (!ringSet.has(w)) subs.push({ at: r, idx: i, root: w, id: branchId(adj, w, r, null), loc: i + 1 }); });
      return { path: order, subs };
    });
    opts.sort((x, y) => cmpNums(x.subs.map((t) => t.loc).sort((p, q) => p - q), y.subs.map((t) => t.loc).sort((p, q) => p - q)));
    const tied = opts.filter((o) => cmpNums(o.subs.map((t) => t.loc).sort((p, q) => p - q), opts[0].subs.map((t) => t.loc).sort((p, q) => p - q)) === 0);
    if (tied.some((o) => o.subs.some((t) => !t.id))) return null;
    tied.sort((x, y) => cmpScore(scoreOf(x.subs, mode), scoreOf(y.subs, mode)));
    const best = tied.filter((o) => cmpScore(scoreOf(o.subs, mode), scoreOf(tied[0].subs, mode)) === 0);
    const parent = { kind: 'ring', size: n };
    const names = new Set(best.map((o) => buildAlkeneName(parent, mode, o.subs, [1], 'ene', [])));
    if (names.size !== 1) return null;
    const b = best[0];
    return { kind: 'ring', parent, parentAtoms: b.path, mult: [1], type: 'ene', subs: b.subs, stereo: [], name: [...names][0], core: [...names][0], ez, g };
  }

  // ---- acyclic
  const nodes = [...adj.keys()];
  const paths = allPaths(nodes, adj);
  const edges = mult.map((b) => [b.a, b.b]);
  const holdsAll = (p) => p.length >= 2 && edges.every(([x, y]) => { const i = p.indexOf(x); return i >= 0 && (p[i + 1] === y || p[i - 1] === y); });
  const cand = paths.filter(holdsAll);
  if (!cand.length) return null;
  const maxLen = Math.max(...cand.map((p) => p.length));
  const opts = [];
  for (const p0 of cand.filter((p) => p.length === maxLen)) for (const rev of [false, true]) {
    const path = rev ? p0.slice().reverse() : p0.slice();
    const pos = new Map(path.map((v, i) => [v, i + 1]));
    const subs = [];
    path.forEach((v, i) => { for (const w of adj[v]) if (!pos.has(w)) subs.push({ at: v, idx: i, root: w, id: branchId(adj, w, v, null), loc: i + 1 }); });
    const multLocs = edges.map(([x, y]) => Math.min(pos.get(x), pos.get(y))).sort((x, y) => x - y);
    const st = stereoParts(P, ez, (v) => pos.get(v));
    if (st.error) return null;
    opts.push({ path, subs, multLocs, stereo: st.desc });
  }
  const pick = (pool) => {
    const sorted = pool.slice().sort((x, y) => cmpNums(x.multLocs, y.multLocs) || cmpNums(x.subs.map((t) => t.loc).sort((p, q) => p - q), y.subs.map((t) => t.loc).sort((p, q) => p - q)));
    const first = sorted[0];
    const tied = sorted.filter((o) => cmpNums(o.multLocs, first.multLocs) === 0 && cmpNums(o.subs.map((t) => t.loc).sort((p, q) => p - q), first.subs.map((t) => t.loc).sort((p, q) => p - q)) === 0);
    if (tied.some((o) => o.subs.some((t) => !t.id))) return null;
    tied.sort((x, y) => cmpScore(scoreOf(x.subs, mode), scoreOf(y.subs, mode)));
    let best = tied.filter((o) => cmpScore(scoreOf(o.subs, mode), scoreOf(tied[0].subs, mode)) === 0);
    best = best.slice().sort((x, y) => zFirst(x.stereo.map((d) => d.label), y.stereo.map((d) => d.label)));
    best = best.filter((o) => zFirst(o.stereo.map((d) => d.label), best[0].stereo.map((d) => d.label)) === 0);
    const names = new Set(best.map((o) => buildAlkeneName({ kind: 'chain', size: maxLen }, mode, o.subs, o.multLocs, type, o.stereo)));
    return names.size === 1 ? { o: best[0], name: [...names][0] } : null;
  };
  const A = pick(opts);
  if (!A) return null;
  const maxSubs = Math.max(...opts.map((o) => o.subs.length));
  const B = pick(opts.filter((o) => o.subs.length === maxSubs));
  if (!B || B.name !== A.name) return null; // the choice between equally long chains would depend on the convention: leave it out
  const o = A.o;
  const core = buildAlkeneName({ kind: 'chain', size: maxLen }, mode, o.subs, o.multLocs, type, []);
  return { kind: 'chain', parent: { kind: 'chain', size: maxLen }, parentAtoms: o.path, mult: o.multLocs, type, subs: o.subs, stereo: o.stereo, name: A.name, core, ez, g };
}

export function nameAlkene(smiles, mode = 'new') { const i = alkeneInfo(smiles, mode); return i ? i.name : null; }
export function nameAlkeneBoth(smiles) {
  const a = nameAlkene(smiles, 'new'), b = nameAlkene(smiles, 'old');
  return a && b ? { new: a, old: b } : null;
}

// ---- other spellings the course accepts when a learner types a name
const COMMON = { 'C=C': ['ethylene'], 'CC=C': ['propylene'], 'C#C': ['acetylene'], 'CC(=C)C=C': ['isoprene'] };
/** Alternative correct names (not the ones the engine writes): locant forms, common names, cis/trans for 1,2-disubstituted alkenes. */
export function alkeneAltNames(smiles) {
  const nb = nameAlkeneBoth(smiles);
  if (!nb) return [];
  const out = new Set();
  for (const mode of MODES) {
    const info = alkeneInfo(smiles, mode);
    const nm = info.name;
    if (info.stereo.length === 1 && info.kind === 'chain') out.add(`(${info.stereo[0].loc}${info.stereo[0].label})-` + info.core);
    if (info.kind === 'chain' && info.parent.size === 3 && info.mult.length === 1 && info.subs.length && info.type === 'ene') out.add(stereoPrefix(info.stereo) + prefixString(info.subs, mode) + 'propene');
    if (info.kind === 'ring') out.add(nm.replace(/cyclo([a-z]+)ene$/, (m, r) => `cyclo${r}-1-ene`));
    // cis / trans: only for a 1,2-disubstituted C=C (each carbon has exactly one H), where cis = Z and trans = E
    if (info.stereo.length === 1 && info.kind === 'chain') {
      const e = info.ez.find((x) => x.capable && x.label);
      if (e && e.ends.every((end) => end.subs.filter((x) => x.atom === null).length === 1)) out.add((e.label === 'Z' ? 'cis-' : 'trans-') + info.core);
    }
  }
  const c = canon(smiles);
  for (const [k, v] of Object.entries(COMMON)) if (canon(k) === c) v.forEach((x) => out.add(x));
  [nb.new, nb.old].forEach((x) => out.delete(x));
  return [...out];
}
/** Every name accepted for the molecule (both styles plus the alternatives). */
export function acceptedAlkeneNames(smiles) {
  const nb = nameAlkeneBoth(smiles);
  return nb ? [...new Set([nb.new, nb.old, ...alkeneAltNames(smiles)])] : [];
}
export function matchesAlkene(smiles, typed) { const t = normName(typed); return acceptedAlkeneNames(smiles).some((n) => normName(n) === t); }

// ---- explaining mistakes in typed alkene names
const STEM_RE = '(undec|dodec|tridec|tetradec|pentadec|hexadec|heptadec|octadec|nonadec|icos|meth|eth|prop|but|pent|hex|hept|oct|non|dec)';
const stripStereo = (s) => String(s).trim().toLowerCase().replace(/[−–‒—]/g, '-').replace(/^\(\s*(?:\d+)?[ez](?:\s*,\s*(?:\d+)?[ez])*\s*\)\s*-?\s*/, '').replace(/^(cis|trans)\s*-?\s*/, '');
const stereoOf = (s) => { const m = /^\s*\(\s*((?:\d+)?[ez](?:\s*,\s*(?:\d+)?[ez])*)\s*\)/i.exec(String(s)); return m ? m[1].toUpperCase().replace(/\s+/g, '') : null; };
const endGroupText = (end) => end.subs.map((x) => x.label).join(' and ');

export function diagnoseAlkene(smiles, typed) {
  const info = alkeneInfo(smiles, 'new');
  const infoO = alkeneInfo(smiles, 'old');
  if (!info || !infoO) return null;
  const raw = String(typed);
  let t = normName(stripStereo(raw));
  // a cycloalkene may carry the locant of its C=C (cyclopent-1-ene = cyclopentene): the locant is not a mistake
  if (info.parent.kind === 'ring') t = t.replace(/(cyclo[a-z]+?)1ene$/, '$1ene');
  const typedStereo = stereoOf(raw) || (/^\s*(cis|trans)/i.test(raw) ? 'CT' : null);
  const wantStereo = info.stereo.length > 0;
  const coreNew = normName(info.core), coreOld = normName(infoO.core);
  const coreMatch = t === coreNew || t === coreOld;
  const first = info.ez.find((e) => e.label) || info.ez.find((e) => e.capable);
  // E/Z prefix problems (only meaningful when the rest of the name is right)
  if (coreMatch && wantStereo && !typedStereo) return 'The name is right so far, but this alkene has two different groups on each double-bond carbon, so the geometry matters: start the name with (E) or (Z).';
  if (coreMatch && !wantStereo && typedStereo) {
    const tie = info.ez.find((e) => !e.capable && e.ends.some((x) => x.tie && x.nsubs === 2));
    if (tie) { const end = tie.ends.find((x) => x.tie && x.nsubs === 2); return `The name is right, but there is no E or Z here: carbon ${info.parentAtoms.indexOf(end.atom) + 1} carries two identical groups (${endGroupText(end)}), so the double bond has no cis/trans isomers.`; }
    return 'The name is right, but this drawing does not fix the geometry of the double bond, so it gets no (E) or (Z) in front.';
  }
  if (coreMatch && wantStereo && typedStereo) {
    if (typedStereo === 'CT') return 'cis and trans work for simple 1,2-disubstituted alkenes. Here use E or Z instead: rank the two groups on each carbon with the sequence rules; the higher-ranked groups on the same side make Z, on opposite sides make E.';
    const got = typedStereo.replace(/\d/g, '');
    const want = info.stereo.map((d) => d.label).join('');
    if (got !== want && info.stereo.length === 1) {
      const hiA = first.ends[0].subs[first.ends[0].hi].label, hiB = first.ends[1].subs[first.ends[1].hi].label;
      return `The name is right but the letter is not. The higher-ranked groups are ${hiA} and ${hiB}; they are on ${first.label === 'Z' ? 'the same side, so Z (zusammen, together)' : 'opposite sides, so E (entgegen, opposite)'}.`;
    }
    if (got !== want) return 'The name is right, but check each double bond: the higher-ranked groups on the same side give Z, on opposite sides E. Write the locant of each one, such as (2E,4Z).';
    return 'Check the locants in the E/Z bracket: each letter goes with the lower number of its double bond.';
  }
  // the rest of the name
  const endM = /(ane|ene|yne)$/.exec(t);
  if (!endM) return 'A name ends with its parent and the suffix: -ene for a double bond (-yne for a triple bond), such as but-2-ene, or cycloalkene such as cyclohexene.';
  const want = info.type;
  if (endM[1] === 'ane') return `This molecule has ${info.type === 'ene' ? 'a C=C double bond' : 'a C≡C triple bond'}, so the name ends in -${info.type} (not -ane).`;
  if (endM[1] !== want && !(info.mult.length === 2 && (endM[1] === 'ene' || endM[1] === 'yne'))) return `The multiple bond here is a ${info.type === 'ene' ? 'double bond: -ene' : 'triple bond: -yne'}.`;
  const gotDi = /di(ene|yne)$/.test(t);
  if (info.mult.length === 2 && !gotDi) return 'Two multiple bonds: use diene (or diyne), with a locant for each, such as buta-1,3-diene (traditional style 1,3-butadiene).';
  if (info.mult.length === 1 && gotDi) return 'Only one multiple bond here, so the ending is -ene (or -yne), not -diene.';
  const stem = new RegExp('(cyclo)?' + STEM_RE + '(a)?(\\d[\\d,]*)?(di)?(ene|yne)$').exec(t);
  const wantRing = info.parent.kind === 'ring';
  if (stem) {
    const gotRing = !!stem[1];
    if (gotRing !== wantRing) return wantRing ? 'The double bond is inside the ring, so the ring is the parent: a cycloalkene such as cyclohexene.' : 'The parent is a chain here, not a ring.';
    const gi = STEM.indexOf(stem[2]) + 1;
    if (gi !== info.parent.size) return wantRing ? `The ring has ${info.parent.size} carbons.` : (gi < info.parent.size ? `Your parent has ${gi} carbons, but the longest chain that contains the double bond has ${info.parent.size}. The parent must include the C=C.` : `Your parent has ${gi} carbons, but the longest chain that contains the double bond has only ${info.parent.size}.`);
  }
  const nums = (s) => (s.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
  const have = nums(t);
  const expect = nums(coreNew);
  const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const L = info.parent.size;
  if (have.length && !sameList(have, expect)) {
    if (!wantRing) {
      const mirror = info.mult.map((m) => L - m).concat(info.subs.map((s) => L + 1 - s.loc)).sort((a, b) => a - b);
      if (sameList(have, mirror)) return 'Number from the other end: the double bond must get the lowest possible number (the substituents come second).';
      const multTyped = (t.match(/(\d+)(?:,\d+)*(?=-?(?:[a-z]*?)(?:di)?(?:ene|yne)$)/) || [])[0];
      if (info.mult.length === 1 && multTyped !== undefined && Number(multTyped) !== info.mult[0]) return `Where does the double bond sit? Number the chain from the end nearer the multiple bond; here it starts at C${info.mult[0]}.`;
    }
    if (wantRing) {
      const eneLoc = /cyclo[a-z]+?(\d+)ene$/.exec(t);
      if (eneLoc) return `In a ring the double bond is always C1=C2, so it can only be written -1-ene (or left out), never -${eneLoc[1]}-ene. Number the ring from the C=C first, then choose the direction that gives the substituents the lowest numbers.`;
      return 'The double bond is C1=C2 (that part is fine). What is off is the numbering of the substituents: from the C=C, go round the ring in the direction that gives the substituents the lowest set of numbers.';
    }
    return 'Check the numbers: the multiple bond gets the lowest possible locant first, then the substituents.';
  }
  const counts = {};
  info.subs.forEach((s) => { counts[s.id] = (counts[s.id] || 0) + 1; });
  const needMult = Object.values(counts).some((c) => c > 1);
  if (needMult && !/(di|tri|tetra|bis|tris)(?!ene|yne)/.test(t.replace(/(di)(ene|yne)$/, '$2'))) return 'When the same branch appears more than once, say how many: di-, tri- or tetra-.';
  if (info.subs.length && have.length < expect.length) return 'Every branch needs its own locant.';
  return 'The numbers look right, so check the order of the prefixes (alphabetical, ignoring di- and tri-), the spelling of the root, and the punctuation. One word, with hyphens and commas.';
}

/** Likely wrong names, each with the reason it is wrong ([{name, why}]). */
export function wrongAlkeneNames(smiles) {
  const out = [];
  const right = new Set(acceptedAlkeneNames(smiles).map(normName));
  const add = (name, why) => { if (name && !right.has(normName(name)) && !out.some((x) => normName(x.name) === normName(name))) out.push({ name, why }); };
  for (const mode of MODES) {
    const info = alkeneInfo(smiles, mode);
    if (!info) continue;
    const L = info.parent.size;
    if (info.kind === 'chain') {
      const mirrored = { multLocs: info.mult.map((m) => L - m).sort((a, b) => a - b), subs: info.subs.map((s) => ({ id: s.id, loc: L + 1 - s.loc })) };
      const flip = info.stereo.map((d) => ({ ...d, loc: L - d.loc }));
      add(buildAlkeneName(info.parent, mode, mirrored.subs, mirrored.multLocs, info.type, flip), 'You numbered from the wrong end. Number from the end nearer the double bond so it gets the lowest locant.');
    }
    if (info.stereo.length) {
      add(info.core, 'This alkene has two different groups on each double-bond carbon, so it needs (E) or (Z) in front.');
      if (info.stereo.length === 1) {
        const other = info.stereo[0].label === 'E' ? 'Z' : 'E';
        add(`(${other})-` + info.core, `Not ${other}: put the higher-ranked group on each carbon side by side. Same side is Z, opposite sides is E.`);
      }
    } else {
      const capable = info.ez.some((e) => e.capable);
      if (!capable) { add('(E)-' + info.core, 'No E or Z here: a carbon of the double bond has two identical groups, so there is only one geometry.'); add('(Z)-' + info.core, 'No E or Z here: a carbon of the double bond has two identical groups, so there is only one geometry.'); }
    }
  }
  return out;
}
