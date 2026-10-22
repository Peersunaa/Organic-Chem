// Substituent name forms: one alkyl group, four accepted spellings, each filed in the alphabet by ITS OWN spelling.
//   old  traditional           isopropyl      sec-butyl       isobutyl        tert-butyl             neopentyl          isopentyl
//   new  current IUPAC         propan-2-yl    butan-2-yl      2-methylpropyl  tert-butyl (retained)  2,2-dimethylpropyl 3-methylbutyl
//   sys  systematic bracketed  1-methylethyl  1-methylpropyl  2-methylpropyl  1,1-dimethylethyl      2,2-dimethylpropyl 3-methylbutyl
//   yl   yl-locant             propan-2-yl    butan-2-yl      2-methylpropyl  2-methylpropan-2-yl    2,2-dimethylpropyl 3-methylbutyl
// The alphabetical position of a group is the first letter of its COMPLETE name (di-, tri-, sec-, tert- are ignored only where IUPAC ignores them):
//   isopropyl under i, 1-methylethyl under m, propan-2-yl under p, 1,1-dimethylethyl under d, 2-methylpropan-2-yl under m, tert-butyl under b, neopentyl under n.
// So the SAME molecule has up to four correctly ordered names, and a typed answer is right when it equals the correctly ordered name in ANY one style.
// The bracketed forms are not typed in by hand: formsOfTree() works them out for any alkyl group built from alkyl branches (the general rule), and
// the tests check the six named groups against it.
//
// A substituent tree is the list of child trees of the attachment atom: methyl [], ethyl [[]], isopropyl [[],[]], tert-butyl [[],[],[]].
import { subInfo } from './naming.js';

export const STYLES = ['new', 'old', 'sys', 'yl'];
export const STYLE_LABEL = { new: 'current IUPAC form', old: 'traditional form', sys: 'systematic form', yl: 'yl-locant form' };
const STEM = ['meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec'];
const MULT = { 2: 'di', 3: 'tri', 4: 'tetra', 5: 'penta', 6: 'hexa' };
const BIS = { 2: 'bis', 3: 'tris', 4: 'tetrakis', 5: 'pentakis', 6: 'hexakis' };
const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
function cmpNums(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i] === undefined) return -1; if (b[i] === undefined) return 1; if (a[i] !== b[i]) return a[i] - b[i]; } return 0; }

/** The six branched groups the namer can produce (the first four are the course's; neopentyl and isopentyl are the common extras). old = traditional name. */
export const COMPLEX = {
  isopropyl: { tree: [[], []], old: 'isopropyl', frag: 'C(C)C' },
  isobutyl: { tree: [[[], []]], old: 'isobutyl', frag: 'CC(C)C' },
  'sec-butyl': { tree: [[], [[]]], old: 'sec-butyl', frag: 'C(C)CC' },
  'tert-butyl': { tree: [[], [], []], old: 'tert-butyl', frag: 'C(C)(C)C', retained: 'tert-butyl' },
  neopentyl: { tree: [[[], [], []]], old: 'neopentyl', frag: 'CC(C)(C)C' },
  isopentyl: { tree: [[[[], []]]], old: 'isopentyl', frag: 'CCC(C)C' }
};
export const COMPLEX_IDS = Object.keys(COMPLEX);
/** Groups the course's own engines (naming.js) do not know; they live here only. */
export const EXTRA_IDS = ['neopentyl', 'isopentyl'];

export const sigOfTree = (t) => '(' + t.map(sigOfTree).sort().join('') + ')';
export const countAtoms = (t) => 1 + t.reduce((s, k) => s + countAtoms(k), 0);
export const rootedLength = (t) => 1 + (t.length ? Math.max(...t.map(rootedLength)) : 0);
/** Alphabetical key of a (sub)stituent name: letters only, sec- and tert- ignored (iso and neo count). */
export const keyOfName = (nm) => String(nm).toLowerCase().replace(/^(sec|tert)-/, '').replace(/[^a-z]/g, '');
/** A substituent name is bracketed in a prefix when it carries a number. */
export const needsBrackets = (nm) => /\d/.test(nm);

// ---------------------------------------------------------------- the general rule, on the tree
function graphOf(tree) {
  const kids = [[]]; const par = [-1];
  (function add(at, list) { for (const t of list) { const i = kids.length; kids.push([]); par.push(at); kids[at].push(i); add(i, t); } })(0, tree);
  return { kids, par, n: kids.length };
}
/** Neighbours of node v in the undirected tree. */
const nbrs = (g, v) => (g.par[v] >= 0 ? [g.par[v]] : []).concat(g.kids[v]);
function subtreeOf(g, v, from) { return nbrs(g, v).filter((x) => x !== from).map((x) => subtreeOf(g, x, v)); }
const isLinear = (t) => t.length === 0 || (t.length === 1 && isLinear(t[0]));
const linearLen = (t) => 1 + (t.length ? linearLen(t[0]) : 0);

function pathsThrough(g, mustHave) {
  const out = [];
  for (let u = 0; u < g.n; u++) {
    const prev = new Map([[u, -1]]); const q = [u];
    while (q.length) { const v = q.shift(); for (const w of nbrs(g, v)) if (!prev.has(w)) { prev.set(w, v); q.push(w); } }
    for (let v = u; v < g.n; v++) {
      const path = []; for (let x = v; x !== -1; x = prev.get(x)) path.push(x);
      path.reverse();
      if (mustHave === null || path.includes(mustHave)) out.push(path);
    }
  }
  return out;
}

/** Name of a branch hanging on a chain atom (a plain alkyl, or the bracketed form of a branched one in the same style). */
function branchName(sub, style) {
  if (isLinear(sub)) return alkylName(linearLen(sub));
  return formsOfTree(sub)[style === 'old' ? 'sys' : style];
}
const alkylName = (n) => STEM[n - 1] + 'yl';

function prefixText(items) {
  const groups = {};
  items.forEach((it) => { (groups[it.name] ||= []).push(it.loc); });
  const names = Object.keys(groups).sort((a, b) => cmpStr(keyOfName(a), keyOfName(b)) || cmpStr(a, b));
  return names.map((nm) => {
    const locs = groups[nm].slice().sort((x, y) => x - y); const n = locs.length;
    const comp = needsBrackets(nm);
    const pref = n === 1 ? (comp ? `(${nm})` : nm) : comp ? `${BIS[n]}(${nm})` : MULT[n] + nm;
    return `${locs.join(',')}-${pref}`;
  }).join('-');
}

/**
 * Name of the alkyl group for a chain choice: 'sys' = the chain starts at the attachment atom (1-methylethyl),
 * 'yl' = the longest chain that CONTAINS the attachment atom, free valence as low as possible (propan-2-yl).
 */
function nameFromChain(g, tree, style) {
  const paths = pathsThrough(g, style === 'sys' ? null : 0)
    .filter((p) => (style === 'sys' ? p[0] === 0 : true));
  const cands = [];
  for (const p of paths) for (const dir of [p, p.slice().reverse()]) {
    if (style === 'sys' && dir[0] !== 0) continue;
    const inP = new Set(dir); const items = [];
    dir.forEach((v, i) => { for (const w of nbrs(g, v)) if (!inP.has(w)) items.push({ loc: i + 1, name: branchName(subtreeOf(g, w, v), style), key: keyOfName(branchName(subtreeOf(g, w, v), style)) }); });
    cands.push({ path: dir, free: dir.indexOf(0) + 1, items });
  }
  const alphaLocs = (c) => c.items.slice().sort((a, b) => cmpStr(a.key, b.key) || a.loc - b.loc).map((x) => x.loc);
  cands.sort((a, b) => b.path.length - a.path.length || b.items.length - a.items.length || a.free - b.free
    || cmpNums(a.items.map((x) => x.loc).sort((x, y) => x - y), b.items.map((x) => x.loc).sort((x, y) => x - y)) || cmpNums(alphaLocs(a), alphaLocs(b)));
  const c = cands[0];
  const pre = prefixText(c.items);
  const stem = STEM[c.path.length - 1];
  const tail = style === 'sys' || c.free === 1 ? `${stem}yl` : `${stem}an-${c.free}-yl`;
  return (pre ? pre : '') + tail;
}

/** {sys, yl} for any alkyl tree (the general rule). */
export function formsOfTree(tree) {
  if (isLinear(tree)) { const n = alkylName(linearLen(tree)); return { sys: n, yl: n }; }
  const g = graphOf(tree);
  return { sys: nameFromChain(g, tree, 'sys'), yl: nameFromChain(g, tree, 'yl') };
}

// ---------------------------------------------------------------- the named ids
const SIMPLE = ['methyl', 'ethyl', 'propyl', 'butyl'];
const cache = {};
/** {new, old, sys, yl, key:{..}, par:{..}} for an id of the namer ('methyl' ... 'neopentyl', 'cyclo5'); null for anything else. */
export function formsOfId(id) {
  if (cache[id]) return cache[id];
  let f = null;
  if (SIMPLE.includes(id)) f = { new: id, old: id, sys: id, yl: id };
  else if (COMPLEX[id]) {
    const c = COMPLEX[id]; const g = formsOfTree(c.tree);
    f = { new: c.retained || g.yl, old: c.old, sys: g.sys, yl: g.yl };
  } else {
    const b = subInfo(id);
    if (b) f = { new: b.new, old: b.old, sys: b.new, yl: b.new };
  }
  if (!f) return null;
  f.key = {}; f.par = {};
  for (const s of STYLES) { f.key[s] = keyOfName(f[s]); f.par[s] = needsBrackets(f[s]); }
  cache[id] = f;
  return f;
}
/** The tree, SMILES fragment, size and rooted length of a named group; null for anything unknown. */
export function treeOfId(id) {
  if (COMPLEX[id]) return COMPLEX[id].tree;
  const b = subInfo(id);
  return b && b.tree ? b.tree : null;
}
export function fragmentOfComplex(id) { return COMPLEX[id] ? COMPLEX[id].frag : null; }

/** Normal form for comparing typed names: case, spaces, hyphens, brackets and the odd dash are ignored; commas stay (they separate numbers). */
export function normForm(s) { return String(s).toLowerCase().replace(/[\s\-–−‒—()[\]{}]/g, '').replace(/[;，]/g, ','); }

/**
 * Compare a typed name with the correctly written name in every style. `names` = {new, old, sys, yl} (each already ordered by that style's own alphabet).
 * Returns { ok, styles:[...] } where styles are those whose name equals the typed one.
 */
export function matchStyles(names, typed) {
  const t = normForm(typed);
  const styles = STYLES.filter((s) => names[s] && normForm(names[s]) === t);
  return { ok: styles.length > 0, styles };
}

/**
 * The line shown when a name is accepted: which style the learner used and the group spellings that show it.
 * `groups` = ids of the branched groups in the molecule. Returns '' when every style writes the name the same way (nothing to say).
 */
export function styleNote(styles, groups) {
  if (!styles.length || styles.length >= STYLES.length) return '';
  const short = { new: 'current IUPAC', old: 'traditional', sys: 'systematic', yl: 'yl-locant' };
  const label = styles.length === 3 && !styles.includes('old') ? 'current IUPAC style' : styles.map((x) => short[x]).join(' / ') + ' form';
  const s = styles.includes('sys') && styles.length < 3 ? 'sys' : styles.includes('old') ? 'old' : styles.includes('new') ? 'new' : 'yl';
  const forms = [...new Set(groups.map((id) => { const f = formsOfId(id); return f ? f[s] : null; }).filter(Boolean))];
  return `Accepted: ${label}${forms.length ? ` (${forms.slice(0, 3).join(', ')})` : ''}`;
}
