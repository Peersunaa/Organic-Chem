// Names of benzene derivatives (Lesson 13, McMurry 5.2). Pure logic, no DOM. Original wording.
//   * monosubstituted: toluene, phenol, aniline, benzoic acid, benzaldehyde, acetophenone, benzonitrile, benzenesulfonic acid, halobenzenes, nitrobenzene, alkylbenzenes
//   * disubstituted: ortho / meta / para (o, m, p) in the OLD style, numbers (1,2 / 1,3 / 1,4) in the NEW style, e.g. 1,4-dimethylbenzene / p-xylene
//   * three or more: numbers, lowest locants, substituents in alphabetical order; phenol / aniline / benzoic acid / toluene ... become the parent (their group is C1)
// Every name is round-tripped through OPSIN in tests/lesson13.mjs. Anything outside this table (a second ring, unusual groups) returns null instead of guessing.
import { analyze } from './chem.js';

const MULT = { 2: 'di', 3: 'tri', 4: 'tetra', 5: 'penta', 6: 'hexa' };

/**
 * Substituent table. smi = SMILES of the group written so that its FIRST atom is the one bonded to the ring (used to build molecules).
 * prefix = name as a prefix; parent = name of the benzene derivative when this group is the principal group (prio = seniority); mono = name when it is the only substituent.
 * oldPrefix / oldMono / oldParent: the old style where it differs. solo = only allowed as the single substituent.
 */
export const SUB = {
  F: { prefix: 'fluoro', mono: 'fluorobenzene', label: 'F', smi: 'F' },
  Cl: { prefix: 'chloro', mono: 'chlorobenzene', label: 'Cl', smi: 'Cl' },
  Br: { prefix: 'bromo', mono: 'bromobenzene', label: 'Br', smi: 'Br' },
  I: { prefix: 'iodo', mono: 'iodobenzene', label: 'I', smi: 'I' },
  NO2: { prefix: 'nitro', mono: 'nitrobenzene', label: 'NO₂', smi: '[N+](=O)[O-]' },
  NH2: { prefix: 'amino', mono: 'aniline', parent: 'aniline', prio: 4, label: 'NH₂', smi: 'N' },
  OH: { prefix: 'hydroxy', mono: 'phenol', parent: 'phenol', prio: 5, label: 'OH', smi: 'O' },
  CH3: { prefix: 'methyl', mono: 'toluene', label: 'CH₃', smi: 'C', tolu: true },
  Et: { prefix: 'ethyl', mono: 'ethylbenzene', label: 'CH₂CH₃', smi: 'CC' },
  Pr: { prefix: 'propyl', mono: 'propylbenzene', label: 'CH₂CH₂CH₃', smi: 'CCC' },
  iPr: { prefix: '(propan-2-yl)', oldPrefix: 'isopropyl', mono: '(propan-2-yl)benzene', oldMono: 'isopropylbenzene', label: 'CH(CH₃)₂', smi: 'C(C)C' },
  tBu: { prefix: 'tert-butyl', key: 'butyl', mono: 'tert-butylbenzene', label: 'C(CH₃)₃', smi: 'C(C)(C)C' },
  CHO: { prefix: 'formyl', mono: 'benzaldehyde', parent: 'benzaldehyde', prio: 7, label: 'CHO', smi: 'C=O' },
  COOH: { prefix: 'carboxy', mono: 'benzoic acid', parent: 'benzoic acid', prio: 10, label: 'CO₂H', smi: 'C(=O)O' },
  CN: { prefix: 'cyano', mono: 'benzonitrile', parent: 'benzonitrile', prio: 8, label: 'C≡N', smi: 'C#N' },
  SO3H: { prefix: 'sulfo', mono: 'benzenesulfonic acid', parent: 'benzenesulfonic acid', prio: 9, label: 'SO₃H', smi: 'S(=O)(=O)O' },
  Ac: { prefix: 'acetyl', mono: 'acetophenone', parent: 'acetophenone', prio: 6, label: 'COCH₃', smi: 'C(C)=O' },     // Lesson 14: acetophenone is a parent (3-nitroacetophenone), ranking between phenol and benzaldehyde
  Pro: { solo: true, mono: '1-phenylpropan-1-one', oldMono: '1-phenyl-1-propanone', label: 'COCH₂CH₃', smi: 'C(=O)CC' },
  OMe: { solo: true, mono: 'methoxybenzene', oldMono: 'anisole', label: 'OCH₃', smi: 'OC' }
};
export const SUB_KEYS = Object.keys(SUB);

const alphaKey = (key, mode) => {
  const p = (mode === 'old' && SUB[key].oldPrefix) || SUB[key].prefix;
  return (SUB[key].key || p).replace(/^\(|\)$/g, '').replace(/^tert-/, '');
};
const prefixOf = (key, mode) => (mode === 'old' && SUB[key].oldPrefix) || SUB[key].prefix;
const monoOf = (key, mode) => (mode === 'old' && (SUB[key].oldMono)) || SUB[key].mono;

// ---------------------------------------------------------------- reading the structure
const boOf = (info, i, j) => { const b = info.bonds.find((x) => x.atoms.includes(i) && x.atoms.includes(j)); return b ? (b.bo ?? 1) : 0; };

/** The benzene ring as an ordered list of six carbon indices (a six-membered cycle of alternating double / single bonds), or null. */
export function findRing(info) {
  const C = info.atoms.filter((a) => a.sym === 'C').map((a) => a.idx);
  const isC = (i) => info.atoms[i].sym === 'C';
  for (const s of C) {
    const walk = (path) => {
      if (path.length === 6) {
        if (!info.atoms[path[5]].nbrs.includes(path[0])) return null;
        const os = path.map((v, i) => boOf(info, v, path[(i + 1) % 6]));
        const alt = os.every((o, i) => o === os[i % 2]) && ((os[0] === 2 && os[1] === 1) || (os[0] === 1 && os[1] === 2));
        return alt ? path : null;
      }
      for (const m of info.atoms[path[path.length - 1]].nbrs) {
        if (!isC(m) || path.includes(m) || m < path[0]) continue;
        const r = walk(path.concat(m));
        if (r) return r;
      }
      return null;
    };
    const r = walk([s]);
    if (r) return r;
  }
  return null;
}

/** Classify the substituent atom s hanging on a ring atom: a key of SUB, or null when it is not one of the groups we name. */
function classify(info, ringSet, s) {
  const a = info.atoms[s];
  const rest = a.nbrs.filter((k) => !ringSet.has(k));
  const A = (i) => info.atoms[i];
  if (['F', 'Cl', 'Br', 'I'].includes(a.sym)) return rest.length === 0 ? a.sym : null;
  if (a.sym === 'N') {
    if (a.fc === 1 && rest.length === 2 && rest.every((k) => A(k).sym === 'O')) {
      const dbl = rest.filter((k) => boOf(info, s, k) === 2 && A(k).fc === 0), neg = rest.filter((k) => boOf(info, s, k) === 1 && A(k).fc === -1);
      return dbl.length === 1 && neg.length === 1 ? 'NO2' : null;
    }
    return a.fc === 0 && rest.length === 0 && a.impH === 2 ? 'NH2' : null;
  }
  if (a.sym === 'O' && a.fc === 0) {
    if (rest.length === 0 && a.impH === 1) return 'OH';
    if (rest.length === 1 && a.impH === 0 && A(rest[0]).sym === 'C' && A(rest[0]).nbrs.length === 1 && A(rest[0]).impH === 3) return 'OMe';
    return null;
  }
  if (a.sym === 'S') {
    if (rest.length === 3 && rest.every((k) => A(k).sym === 'O')) {
      const dbl = rest.filter((k) => boOf(info, s, k) === 2), sgl = rest.filter((k) => boOf(info, s, k) === 1 && A(k).impH === 1 && A(k).fc === 0);
      return dbl.length === 2 && sgl.length === 1 ? 'SO3H' : null;
    }
    return null;
  }
  if (a.sym !== 'C' || a.fc !== 0) return null;
  if (rest.length === 0) return a.impH === 3 ? 'CH3' : null;
  const dO = rest.filter((k) => A(k).sym === 'O' && boOf(info, s, k) === 2);
  if (dO.length === 1) {
    const others = rest.filter((k) => k !== dO[0]);
    if (others.length === 0) return a.impH === 1 ? 'CHO' : null;
    if (others.length === 1 && a.impH === 0) {
      const o = others[0];
      if (A(o).sym === 'O' && A(o).impH === 1 && A(o).nbrs.length === 1 && boOf(info, s, o) === 1) return 'COOH';
      if (A(o).sym === 'C' && A(o).fc === 0 && boOf(info, s, o) === 1) {
        const n = A(o).nbrs.filter((k) => k !== s);
        if (n.length === 0 && A(o).impH === 3) return 'Ac';
        if (n.length === 1 && A(o).impH === 2 && A(n[0]).sym === 'C' && A(n[0]).nbrs.length === 1 && A(n[0]).impH === 3) return 'Pro';
      }
    }
    return null;
  }
  if (rest.length === 1 && A(rest[0]).sym === 'N' && boOf(info, s, rest[0]) === 3 && a.impH === 0) return 'CN';
  // alkyl: a tree of single-bonded carbons
  const T = new Set([s]); const q = [s];
  while (q.length) { const v = q.pop(); for (const w of A(v).nbrs) if (!ringSet.has(w) && !T.has(w)) { T.add(w); q.push(w); } }
  if (![...T].every((v) => A(v).sym === 'C' && A(v).fc === 0)) return null;
  let edges = 0; for (const v of T) for (const w of A(v).nbrs) if (T.has(w) && v < w) { edges++; if (boOf(info, v, w) !== 1) return null; }
  if (edges !== T.size - 1) return null;
  const kids = (v, from) => A(v).nbrs.filter((k) => k !== from && T.has(k));
  const root = kids(s, -1);
  if (T.size === 2) return 'Et';
  if (T.size === 3) return root.length === 1 ? 'Pr' : root.length === 2 ? 'iPr' : null;
  if (T.size === 4 && root.length === 3 && root.every((k) => kids(k, s).length === 0)) return 'tBu';
  return null;
}

/**
 * {info, ring:[6 atoms in order], subs:[{pos, atom, key}], atomsOk} for a molecule that is one benzene ring plus recognised groups; null otherwise.
 * `pos` is the index 0..5 of the ring atom the group is on (ring order as found).
 */
export function arene(smiles) {
  let info = null;
  try { info = analyze(smiles); } catch (e) { info = null; }
  if (!info) return null;
  const ring = findRing(info);
  if (!ring) return null;
  const ringSet = new Set(ring);
  const subs = [];
  let covered = 6;
  for (let p = 0; p < 6; p++) {
    const extra = info.atoms[ring[p]].nbrs.filter((k) => !ringSet.has(k));
    if (extra.length > 1) return null;
    if (extra.length === 1) {
      const key = classify(info, ringSet, extra[0]);
      if (!key) return null;
      subs.push({ pos: p, atom: extra[0], key });
      // atoms of the group
      const T = new Set([extra[0]]); const q = [extra[0]];
      while (q.length) { const v = q.pop(); for (const w of info.atoms[v].nbrs) if (!ringSet.has(w) && !T.has(w)) { T.add(w); q.push(w); } }
      covered += T.size;
    }
  }
  if (covered !== info.atoms.length) return null;
  return { info, ring, subs };
}

// ---------------------------------------------------------------- naming
function prefixBlock(items, mode) {
  // items = [{loc, key}] -> '2,4-dichloro-1-nitro' style pieces ("4-bromo", "2,4,6-trinitro"), alphabetical, joined by hyphens
  const groups = {};
  items.forEach((it) => { (groups[it.key] ||= []).push(it.loc); });
  return Object.keys(groups).sort((a, b) => (alphaKey(a, mode) < alphaKey(b, mode) ? -1 : alphaKey(a, mode) > alphaKey(b, mode) ? 1 : 0)).map((k) => {
    const locs = groups[k].sort((x, y) => x - y);
    const pre = prefixOf(k, mode);
    return `${locs.join(',')}-${locs.length > 1 ? (MULT[locs.length] || '') : ''}${pre}`;
  }).join('-');
}
const cmpList = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i] === undefined) return -1; if (b[i] === undefined) return 1; if (a[i] !== b[i]) return a[i] - b[i]; } return 0; };

/** All numberings (start position, direction) as locant lists; `startAt` limits the start to one ring position (the principal group). */
function numberings(subs, startAt) {
  const out = [];
  const starts = startAt != null ? [startAt] : subs.map((s) => s.pos);
  for (const st of starts) for (const d of [1, -1]) out.push(subs.map((s) => ({ key: s.key, atom: s.atom, loc: ((((s.pos - st) * d) % 6) + 6) % 6 + 1 })));
  return out;
}

/** Name of a benzene derivative in one style ('new' or 'old'), or null when it is outside what the lesson names. */
export function nameArene(smiles, mode = 'new') {
  const A = arene(smiles);
  if (!A) return null;
  const subs = A.subs;
  const n = subs.length;
  if (n === 0) return 'benzene';
  if (subs.some((s) => SUB[s.key].solo)) return n === 1 ? monoOf(subs[0].key, mode) : null;
  if (n === 1) return monoOf(subs[0].key, mode);
  if (subs.filter((s) => s.key === 'iPr').length > 1 && mode === 'new') return null;
  // principal group
  let parent = null;
  const withParent = subs.filter((s) => SUB[s.key].parent);
  if (withParent.length) parent = withParent.reduce((b, s) => (SUB[s.key].prio > SUB[b.key].prio ? s : b));
  // two or more of the principal group (benzene-1,3-diol, benzene-1,4-dicarboxylic acid ...) take a multiplied suffix, which this table does not write
  if (parent && subs.filter((s) => s.key === parent.key).length > 1) return null;
  const methyls = subs.filter((s) => s.key === 'CH3');
  const toluene = !parent && methyls.length === 1 && (n >= 3 || mode === 'old');
  if (toluene) parent = methyls[0];
  const parentName = parent ? (parent.key === 'CH3' ? 'toluene' : SUB[parent.key].parent) : 'benzene';

  // old style, two groups: o / m / p
  // (an ethyl / propyl group next to another prefix would read like one compound substituent, 'chloroethyl', so those fall through to the numbered name)
  const ambiguous = parentName === 'benzene' && subs.some((s) => ['Et', 'Pr', 'iPr'].includes(s.key)) && !(subs[0].key === subs[1].key);
  if (n === 2 && mode === 'old' && !ambiguous) {
    const d = (((subs[1].pos - subs[0].pos) % 6) + 6) % 6;
    const letter = d === 1 || d === 5 ? 'o' : d === 2 || d === 4 ? 'm' : 'p';
    if (methyls.length === 2) return `${letter}-xylene`;
    const rest = subs.filter((s) => s !== parent).map((s) => s.key);
    const pres = rest.slice().sort((a, b) => (alphaKey(a, mode) < alphaKey(b, mode) ? -1 : 1));
    const joined = pres.length === 2 && pres[0] === pres[1] ? MULT[2] + prefixOf(pres[0], mode) : pres.map((k) => prefixOf(k, mode)).reduce((s, p) => (p.startsWith('tert') && s ? s + '-' + p : s + p), '');
    return `${letter}-${joined}${parentName}`;
  }

  // numbered names
  const cands = numberings(subs, parent ? parent.pos : null);
  let best = null, bestKey = null;
  for (const c of cands) {
    const locs = c.map((x) => x.loc).sort((x, y) => x - y);
    const alpha = c.slice().sort((x, y) => (alphaKey(x.key, mode) < alphaKey(y.key, mode) ? -1 : alphaKey(x.key, mode) > alphaKey(y.key, mode) ? 1 : x.loc - y.loc)).map((x) => x.loc);
    const key = { locs, alpha };
    if (!best || cmpList(locs, bestKey.locs) < 0 || (cmpList(locs, bestKey.locs) === 0 && cmpList(alpha, bestKey.alpha) < 0)) { best = c; bestKey = key; }
  }
  const items = best.filter((x) => !(parent && x.atom === parent.atom));
  const block = prefixBlock(items, mode);
  if (parent && parent.key === 'Ac' && (mode === 'new' || n >= 3)) return block ? `1-(${block}phenyl)ethan-1-one` : parentName;   // Lesson 14: numbers in the new style belong to the phenyl ring
  return block ? `${block}${parentName}` : parentName;
}
export function nameBothArene(smiles) {
  const a = nameArene(smiles, 'new'), b = nameArene(smiles, 'old');
  return a && b ? { new: a, old: b } : null;
}

// ---------------------------------------------------------------- building molecules and ring roles
/** SMILES of a benzene ring with groups on the given ring positions: groups = {0:'Br', 2:'NO2'} (keys of SUB). */
export function buildArene(groups) {
  let s = '';
  for (let p = 0; p < 6; p++) {
    const g = groups[p];
    s += (p === 0 ? 'c1' : 'c') + (g ? `(${SUB[g].smi})` : '') + (p === 5 ? '1' : '');
  }
  return s;
}

/** Ortho / meta / para of ring position q relative to p. */
export function relation(p, q) {
  const d = (((q - p) % 6) + 6) % 6;
  return d === 0 ? 'self' : d === 1 || d === 5 ? 'ortho' : d === 2 || d === 4 ? 'meta' : 'para';
}

/** Layout for the ring-position widget: ring atoms in order with the label of the group on each. */
export function ringLayout(smiles) {
  const A = arene(smiles);
  if (!A) return null;
  const labels = Array(6).fill(null);
  A.subs.forEach((s) => { labels[s.pos] = { key: s.key, text: SUB[s.key].label }; });
  return { ring: A.ring, labels, subs: A.subs.map((s) => ({ pos: s.pos, key: s.key })) };
}
