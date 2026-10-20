// Practice generator "naming-levels" (skill `naming-levels`, route #practise-naming-levels): naming by level.
// NOTE: since the settings panel (engine/naming-custom.js) the five levels below are its built-in PRESETS: this file still makes their problems exactly as before, and it
// is also the namer (analyseMol / assemble), the wrong-name maker (wrongNames) and the question builders that the custom generator reuses. Every name is written in four
// styles (new, old, sys, yl: see engine/name-forms.js), each alphabetised by its own spellings; matchNameForms() grades a typed name against all four.
//   Level 1  straight and branched alkanes to C8, halides, ring or chain as the parent
//   Level 2  several branches: alphabetical order, ties in the numbering, isopropyl / sec-butyl / tert-butyl / isobutyl, rings with several groups
//   Level 3  alkenes, alkynes, dienes, cycloalkenes, E/Z, and the "longest chain must contain the C=C" trap
//   Level 4  R/S (one and two centres), cis/trans on rings, E/Z together with R/S, benzene derivatives, benzyl and phenyl
//   Level 5  tricky set: a hand-picked list of confusable cases with a one-line "why people get this wrong"
// How the answers are made (nothing is typed by hand for Levels 1-4):
//   1. a random structure is built from a small specification (parent chain or ring, branches, halogens, multiple bonds, stereo tags) and written as SMILES;
//   2. `analyseMol(smiles)` names THAT SMILES by the course rules (parent, lowest numbers, alphabetical order, E/Z from cip.js, R/S from cip.js); it never sees the specification;
//   3. wrong names are the same assembler run with ONE rule broken (wrong end of the chain, alphabetical order, shorter parent, missing or wrong stereo label, one carbon too many ...);
//      each one records the rule it breaks and whether it still describes the SAME compound (a wrong end of the chain does; a wrong branch does not).
// tests/naming-levels.mjs checks every correct name against OPSIN (name -> SMILES = the drawing), every other name too (a different structure, or flagged as the same
// compound with a named rule), and compares this namer with the Lesson 05 / 07 / 13 engines on every hydrocarbon.
import { canon, setDrawStyle } from './chem.js';
import { readGraph, ezInfo, tetraInfo } from './cip.js';
import { subInfo, subFragment, SUB_IDS, normName, diagnoseTyped, diagnoseAlkene } from './naming.js';
import { nameBothArene, buildArene, arene, SUB as ARENE_SUB } from './naming-arene.js';
import { STYLES, formsOfId, treeOfId, fragmentOfComplex, COMPLEX_IDS, EXTRA_IDS, matchStyles, styleNote } from './name-forms.js';
import { WIDGETS } from './widgets/index.js';
import * as store from './store.js';

export const NAMING_LEVEL_SKILLS = ['naming-levels'];
export const LEVELS = [1, 2, 3, 4, 5];
export const LEVEL_TITLES = {
  1: 'Level 1 · Alkanes, halides, rings',
  2: 'Level 2 · Many branches',
  3: 'Level 3 · Alkenes and alkynes',
  4: 'Level 4 · Stereo and benzene',
  5: 'Level 5 · Tricky set'
};
export const LEVEL_BLURBS = {
  1: 'Straight and branched alkanes up to C8, halides, and ring against chain.',
  2: 'Alphabetical order, ties in the numbering, isopropyl and tert-butyl, rings with several groups.',
  3: 'C=C and C≡C, E/Z, dienes, cycloalkenes and the longest-chain trap.',
  4: 'R/S, cis/trans on rings, E/Z with R/S, benzene derivatives, benzyl and phenyl.',
  5: 'The confusable cases from the lessons and the past papers, each with the usual slip.'
};

const STEM = ['meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec', 'undec', 'dodec'];
const MULT = { 2: 'di', 3: 'tri', 4: 'tetra', 5: 'penta', 6: 'hexa' };
const BIS = { 2: 'bis', 3: 'tris', 4: 'tetrakis', 5: 'pentakis', 6: 'hexakis' };
const MODES3 = STYLES;   // new, old, sys, yl: every correctly ordered spelling (see name-forms.js)
const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
function cmpNums(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i] === undefined) return -1; if (b[i] === undefined) return 1; if (a[i] !== b[i]) return a[i] - b[i]; } return 0; }
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };

// ============================================================================================================
// Substituents: the course's alkyl groups, the halogens, cycloalkyl groups. Three spellings:
//   new = current IUPAC (propan-2-yl), old = traditional (isopropyl), sys = the systematic substituted-alkyl form some books use (1-methylethyl)
// ============================================================================================================
const HALO = {
  fluoro: { sym: 'F', z: 9 }, chloro: { sym: 'Cl', z: 17 }, bromo: { sym: 'Br', z: 35 }, iodo: { sym: 'I', z: 53 }
};
const HALO_BY_Z = Object.fromEntries(Object.entries(HALO).map(([id, h]) => [h.z, id]));
export function sinfo(id) {   // new / old / sys / yl spellings, alphabetical key and bracket flag for each
  if (id === 'ethenyl') return { new: 'ethenyl', old: 'vinyl', sys: 'ethenyl', yl: 'ethenyl', key: { new: 'ethenyl', old: 'vinyl', sys: 'ethenyl', yl: 'ethenyl' }, par: { new: false, old: false, sys: false, yl: false }, size: 2, rooted: 2, halo: false };
  if (HALO[id]) return { new: id, old: id, sys: id, yl: id, key: { new: id, old: id, sys: id, yl: id }, par: { new: false, old: false, sys: false, yl: false }, size: 0, rooted: 0, halo: true };
  const f = formsOfId(id);
  const tree = treeOfId(id);
  const b = subInfo(id);
  const size = b ? b.size : countTree(tree), rooted = b ? b.rooted : rootedOf(tree);
  return { new: f.new, old: f.old, sys: f.sys, yl: f.yl, key: f.key, par: f.par, size, rooted, halo: false };
}
const countTree = (t) => 1 + t.reduce((n, k) => n + countTree(k), 0);
const rootedOf = (t) => 1 + (t.length ? Math.max(...t.map(rootedOf)) : 0);
const sigOfTree = (t) => '(' + t.map(sigOfTree).sort().join('') + ')';
const BY_SIG = {};
for (const id of SUB_IDS) BY_SIG[sigOfTree(subInfo(id).tree)] = id;
for (const id of EXTRA_IDS) BY_SIG[sigOfTree(treeOfId(id))] = id;   // neopentyl, isopentyl

/** How many carbons of the tree under w (coming from p) and what it is. Returns {id} or null when the branch is not one of the course's alkyl groups. */
function branchOf(G, w, p) {
  const sig = (v, from) => {
    const a = G.atom[v];
    if (G.halOf[v].length || G.ringAtom.has(v)) return null;
    const kids = a.cn.filter((x) => x !== from);
    // a multiple bond inside the branch is outside the scope
    for (const k of kids) if (G.bo(v, k) !== 1) return null;
    const subs = kids.map((k) => sig(k, v));
    if (subs.some((s) => s === null)) return null;
    return '(' + subs.sort().join('') + ')';
  };
  const s = sig(w, p);
  return s && BY_SIG[s] ? BY_SIG[s] : null;
}
const rootedLen = (G, w, p) => { const kids = G.atom[w].cn.filter((x) => x !== p); return 1 + (kids.length ? Math.max(...kids.map((c) => rootedLen(G, c, w))) : 0); };

// ============================================================================================================
// Reading a molecule: carbon skeleton with halogens, at most one ring
// ============================================================================================================
function readMol(smiles) {
  if (typeof smiles !== 'string' || /[a-z]/.test(smiles.replace(/Cl|Br/g, ''))) return null;
  let g = null;
  try { g = readGraph(smiles); } catch (e) { return null; }
  if (!g || !g.atoms.length || g.atoms.length > 24) return null;
  const n = g.atoms.length;
  const atom = g.atoms.map((a) => ({ ...a, cn: [], hal: [] }));
  for (const a of atom) {
    if (a.chg !== 0) return null;
    if (a.z !== 6 && !HALO_BY_Z[a.z]) return null;
  }
  const bo = (i, j) => { const b = g.bonds.find((x) => (x.a === i && x.b === j) || (x.a === j && x.b === i)); return b ? b.bo : 0; };
  const halOf = atom.map(() => []);
  for (const a of atom) {
    for (const { to } of a.nbrs) {
      if (a.z === 6 && atom[to].z === 6) a.cn.push(to);
      else if (a.z === 6) halOf[a.idx].push(HALO_BY_Z[atom[to].z]);
      else if (atom[to].z !== 6 || bo(a.idx, to) !== 1) return null;   // halogens hang on carbon by a single bond only
    }
  }
  const carbons = atom.filter((a) => a.z === 6).map((a) => a.idx);
  if (!carbons.length) return null;
  const cbonds = g.bonds.filter((b) => atom[b.a].z === 6 && atom[b.b].z === 6);
  if (cbonds.some((b) => b.bo > 3)) return null;
  // connected (carbons)
  const seen = new Set([carbons[0]]); const st = [carbons[0]];
  while (st.length) { const v = st.pop(); for (const w of atom[v].cn) if (!seen.has(w)) { seen.add(w); st.push(w); } }
  if (seen.size !== carbons.length) return null;
  const rings = cbonds.length - carbons.length + 1;
  if (rings > 1) return null;
  const G = { g, atom, n, carbons, halOf, bo, bonds: cbonds, rings, ring: null, ringAtom: new Set() };
  if (rings === 1) {
    const deg = new Map(carbons.map((v) => [v, atom[v].cn.length])); const alive = new Set(carbons);
    const q = carbons.filter((v) => deg.get(v) === 1);
    while (q.length) { const v = q.pop(); alive.delete(v); for (const w of atom[v].cn) if (alive.has(w)) { deg.set(w, deg.get(w) - 1); if (deg.get(w) === 1) q.push(w); } }
    const start = Math.min(...alive); const ring = [start]; let prev = -1, cur = start;
    for (;;) { const nx = atom[cur].cn.find((w) => alive.has(w) && w !== prev); if (nx === undefined || nx === start) break; ring.push(nx); prev = cur; cur = nx; if (ring.length > alive.size) break; }
    if (ring.length !== alive.size || ring.length < 3 || ring.length > 10) return null;
    G.ring = ring; G.ringAtom = new Set(ring);
  }
  return G;
}

function allPaths(nodes, adj) {
  const out = [];
  const inSet = new Set(nodes);
  for (const u of nodes) {
    const par = new Map([[u, null]]); const q = [u];
    while (q.length) { const v = q.shift(); for (const w of adj(v)) if (!par.has(w) && inSet.has(w)) { par.set(w, v); q.push(w); } }
    for (const v of nodes) {
      if (v < u || !par.has(v)) continue;
      const path = []; for (let x = v; x !== null; x = par.get(x)) path.push(x);
      out.push(path.reverse());
    }
  }
  return out;
}

// ---- alphabetical key and prefix assembly
const keyOf = (id, mode) => sinfo(id).key[mode];
function scoreOf(subs, mode) {
  const locs = subs.map((s) => s.loc).sort((a, b) => a - b);
  const alpha = subs.slice().sort((a, b) => cmpStr(keyOf(a.id, mode), keyOf(b.id, mode)) || a.loc - b.loc).map((s) => s.loc);
  return { locs, alpha };
}
const cmpScore = (a, b) => cmpNums(a.locs, b.locs) || cmpNums(a.alpha, b.alpha);

/** The prefix part of a name: "4-ethyl-2-methyl". opts.order: 'iupac' | 'reverse' | 'locant' | 'multiplier'; opts.noLoc drops the locants. */
export function prefixText(subs, mode, opts = {}) {   // (sinfo(id)[mode] is the group's spelling in that style)
  const groups = {};
  subs.forEach((s) => { (groups[s.id] ||= []).push(s.loc); });
  const ids = Object.keys(groups);
  const kk = (id) => (opts.order === 'multiplier' ? (MULT[groups[id].length] || '') + keyOf(id, mode) : keyOf(id, mode));
  if (opts.order === 'locant') ids.sort((a, b) => Math.min(...groups[a]) - Math.min(...groups[b]) || cmpStr(kk(a), kk(b)));
  else if (opts.order === 'reverse') ids.sort((a, b) => cmpStr(kk(b), kk(a)));
  else ids.sort((a, b) => cmpStr(kk(a), kk(b)));
  return ids.map((id) => {
    const locs = groups[id].slice().sort((x, y) => x - y);
    const info = sinfo(id); const nm = info[mode]; const complex = info.par[mode]; const n = locs.length;
    let pref;
    if (n === 1 || opts.noMult) pref = complex ? `(${nm})` : nm;
    else if (complex) pref = `${BIS[n] || MULT[n]}(${nm})`;
    else pref = (MULT[n] || '') + (/^(sec|tert)-/.test(nm) ? '-' : '') + nm;
    return (opts.noLoc ? '' : locs.join(',') + '-') + pref;
  }).join('-');
}

function stereoText(desc) {
  if (!desc.length) return '';
  if (desc.length === 1) return `(${desc[0].label})-`;
  return `(${desc.map((d) => d.loc + d.label).join(',')})-`;
}

/**
 * Assemble a name. p = { kind:'chain'|'ring', size, subs:[{id,loc}], mult:[locs] (chain: locants of the multiple bonds; ring: [1] when cycloalkene),
 * type:'ane'|'ene'|'yne', stereo:[{loc,label}], ct:'cis'|'trans'|null } mode: 'new'|'old'|'sys'. opts: see prefixText, plus `noStereo`.
 */
export function assemble(p, mode, opts = {}) {
  const L = p.size;
  const st = opts.noStereo ? '' : p.ct ? `${p.ct}-` : stereoText(p.stereo || []);
  const stem = STEM[L - 1];
  if (p.kind === 'ring') {
    const omit = p.subs.length === 1 && p.type === 'ane';
    const pre = p.subs.length ? prefixText(p.subs, mode, { ...opts, noLoc: omit }) : '';
    return st + pre + 'cyclo' + stem + p.type;
  }
  if (p.type === 'ane') {
    const omit = L === 1 || (L === 2 && p.subs.length === 1);
    const pre = p.subs.length ? prefixText(p.subs, mode, { ...opts, noLoc: omit }) : '';
    return st + pre + stem + 'ane';
  }
  const count = p.mult.length;
  const needLoc = !(L === 2) && !(L === 3 && p.subs.length === 0);
  let base;
  if (mode === 'old') base = count === 1 ? `${needLoc ? p.mult[0] + '-' : ''}${stem}${p.type}` : `${p.mult.join(',')}-${stem}adi${p.type}`;
  else base = count === 1 ? `${stem}${needLoc ? `-${p.mult[0]}-` : ''}${p.type}` : `${stem}a-${p.mult.join(',')}-di${p.type}`;
  const pre = p.subs.length ? prefixText(p.subs, mode, opts) : '';
  const body = pre ? (mode === 'old' ? pre + '-' + base : pre + base) : base;
  return st + body;
}

// ============================================================================================================
// The namer
// ============================================================================================================
const orderOfTags = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return ('ZR'.includes(a[i]) ? -1 : 1) - ('ZR'.includes(b[i]) ? -1 : 1); return 0; };

function swapParity(from, to) {
  // parity (0 even / 1 odd) of the permutation taking list `from` to list `to` (same elements)
  const pos = to.map((x) => from.indexOf(x));
  let inv = 0; for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) if (pos[i] > pos[j]) inv++;
  return inv % 2;
}
/** +1 / -1: which face of the ring the substituent `sub` of ring atom v is on (relative to the ring order, so two values are comparable). */
function ringFace(G, v, sub) {
  const at = G.atom[v];
  const L = at.nbrs.map((n) => n.to); if (at.impH) L.push('H');
  const ring = G.ring; const n = ring.length; const i = ring.indexOf(v);
  const p = ring[(i - 1 + n) % n], nx = ring[(i + 1) % n];
  const tag = at.tag === 'ccw' ? 1 : -1;
  return tag * (swapParity(L, [p, nx, sub, 'H']) ? -1 : 1);
}

/**
 * Full analysis of a molecule in one style (mode). Returns null outside the scope. Otherwise
 *  { kind, parent:{kind,size}, parentAtoms, mult, type, subs:[{id,loc,at}], stereo:[{loc,label,atom,what}], ct, name, mode,
 *    pending: unlabelled stereo (a centre or C=C whose configuration the SMILES does not fix), longest (longest carbon chain anywhere), cands (numbering options) }
 */
export function analyseMol(smiles, mode = 'new', opts = {}) {
  const G = readMol(smiles);
  if (!G) return null;
  const { atom } = G;
  // multiple bonds
  const multB = G.bonds.filter((b) => b.bo > 1);
  const orders = new Set(multB.map((b) => b.bo));
  if (orders.size > 1 || multB.length > 2) return null;
  const type = multB.length ? (multB[0].bo === 2 ? 'ene' : 'yne') : 'ane';
  if (multB.length === 2 && multB[0].bo === 3) return null;
  if (multB.length === 2 && [multB[0].a, multB[0].b].some((v) => v === multB[1].a || v === multB[1].b)) return null;   // cumulated
  const ezs = ezInfo(smiles) || [], tet = tetraInfo(smiles) || [];

  // ---------- choose parent kind
  let kind = 'chain', ring = G.ring, pendRing = null, nodes = G.carbons.slice();
  if (ring) {
    const ringSet = G.ringAtom;
    const ext = [];
    ring.forEach((r) => { for (const w of atom[r].cn) if (!ringSet.has(w)) ext.push({ at: r, root: w }); });
    const Lmax = ext.length ? Math.max(...ext.map((e) => rootedLen(G, e.root, e.at))) : 0;
    const ringMult = multB.filter((b) => ringSet.has(b.a) && ringSet.has(b.b));
    if (ringMult.length !== multB.length) { if (ring.length >= Lmax || multB.length) return null; }
    const wantRing = opts.forceKind ? opts.forceKind === 'ring' : ring.length >= Lmax;
    if (wantRing) kind = 'ring';
    else {
      // the chain is the parent and the ring is a cycloalkyl group on it
      if (ext.length !== 1 || multB.length || ring.some((r) => G.halOf[r].length) || ext[0].at === undefined) return null;
      pendRing = { attach: ext[0].root, ringAtom: ext[0].at, id: 'cyclo' + ring.length };
      nodes = G.carbons.filter((v) => !ringSet.has(v));
    }
  }

  // ---------- numbering options
  const mk = (extra) => ({ ...extra });
  let options = [], longest = 0, parentSize = 0, parentKind, chainTie = false, chainTieBroken = false;
  const adjC = (v) => atom[v].cn.filter((w) => (kind === 'ring' ? true : !G.ringAtom.has(w)));
  const subFor = (v, w) => { const id = branchOf(G, w, v); return id; };
  if (kind === 'ring') {
    parentKind = 'ring'; const n = ring.length; parentSize = n;
    const ringSet = G.ringAtom;
    const subsAt = (idx, order) => {
      const out = [];
      order.forEach((r, i) => {
        for (const w of atom[r].cn) if (!ringSet.has(w)) out.push({ at: r, root: w, id: subFor(r, w), loc: i + 1 });
        for (const hid of G.halOf[r]) out.push({ at: r, root: null, id: hid, loc: i + 1 });
      });
      return out;
    };
    const bd = multB[0];
    let starts = [];
    if (multB.length) {
      if (multB.length !== 1 || bd.bo !== 2) return null;
      const pa = ring.indexOf(bd.a), pb = ring.indexOf(bd.b);
      const fwd = (pa + 1) % n === pb;
      starts = [{ s: pa, d: fwd ? 1 : -1 }, { s: pb, d: fwd ? -1 : 1 }];
    } else for (let s = 0; s < n; s++) for (const d of [1, -1]) starts.push({ s, d });
    for (const { s, d } of starts) {
      const order = ring.map((_, j) => ring[(((s + j * d) % n) + n) % n]);
      options.push(mk({ path: order, subs: subsAt(s, order), mult: multB.length ? [1] : [] }));
    }
    longest = ring.length;
  } else {
    parentKind = 'chain';
    const edges = multB.map((b) => [b.a, b.b]);
    const paths = allPaths(nodes, adjC);
    longest = Math.max(...paths.map((p) => p.length));
    const holds = (p) => edges.every(([x, y]) => { const i = p.indexOf(x); return i >= 0 && (p[i + 1] === y || p[i - 1] === y); });
    let cand = paths.filter((p) => (p.length >= 2 || nodes.length === 1) && holds(p));
    if (!cand.length) return null;
    const maxLen = opts.parentLen || Math.max(...cand.map((p) => p.length));
    parentSize = maxLen;
    cand = cand.filter((p) => p.length === maxLen);
    if (!cand.length) return null;
    const withBranches = cand.map((p) => {
      const inP = new Set(p); const brs = [];
      p.forEach((v, i) => {
        for (const w of atom[v].cn) {
          if (inP.has(w)) continue;
          if (G.ringAtom.has(w)) { if (pendRing && w === pendRing.ringAtom) brs.push({ at: v, idx: i, root: w, id: pendRing.id }); else return; }
          else brs.push({ at: v, idx: i, root: w, id: subFor(v, w) });
        }
        for (const hid of G.halOf[v]) brs.push({ at: v, idx: i, root: null, id: hid });
      });
      return { path: p, brs };
    });
    const maxSubs = Math.max(...withBranches.map((c) => c.brs.length));
    chainTie = withBranches.length > 1; chainTieBroken = withBranches.some((c) => c.brs.length < maxSubs);
    for (const c of withBranches.filter((c) => c.brs.length === maxSubs)) for (const rev of [false, true]) {
      const path = rev ? c.path.slice().reverse() : c.path.slice();
      const pos = new Map(path.map((v, i) => [v, i + 1]));
      const subs = c.brs.map((b) => ({ at: b.at, root: b.root, id: b.id, loc: pos.get(b.at) }));
      const mult = edges.map(([x, y]) => Math.min(pos.get(x), pos.get(y))).sort((x, y) => x - y);
      options.push(mk({ path, subs, mult }));
    }
  }
  // a ring root that is a pendant cycloalkyl: its atoms are not part of any branch: handled above (pendRing). Unknown branches: out of scope
  if (options.some((o) => o.subs.some((s) => !s.id))) return null;

  // stereo descriptors for every option (positions depend on the numbering)
  for (const o of options) {
    const pos = new Map(o.path.map((v, i) => [v, i + 1]));
    o.pos = pos; o.stereo = []; o.pending = [];
    if (kind === 'chain') {
      for (const e of ezs) {
        if (!e.capable) continue;
        if (!pos.has(e.a) || !pos.has(e.b)) { return null; }
        if (e.label) o.stereo.push({ loc: Math.min(pos.get(e.a), pos.get(e.b)), label: e.label, atom: e.a, what: 'ez' }); else o.pending.push({ what: 'ez', atom: e.a });
      }
      for (const t of tet) {
        if (!t.center) continue;
        if (!pos.has(t.atom)) { if (t.label) return null; continue; }
        if (t.label) o.stereo.push({ loc: pos.get(t.atom), label: t.label, atom: t.atom, what: 'rs' }); else o.pending.push({ what: 'rs', atom: t.atom });
      }
      o.stereo.sort((a, b) => a.loc - b.loc);
    }
  }
  // ring cis / trans: exactly two tagged ring atoms, each with one substituent
  let ct = null;
  if (kind === 'ring') {
    const tagged = ring.filter((v) => atom[v].tag);
    if (tagged.length) {
      if (tagged.length !== 2) return null;
      const faces = tagged.map((v) => { const ex = atom[v].nbrs.map((n) => n.to).filter((w) => !G.ringAtom.has(w)); if (ex.length !== 1) return null; return ringFace(G, v, ex[0]); });
      if (faces.some((f) => f === null)) return null;
      ct = faces[0] === faces[1] ? 'cis' : 'trans';
    }
  }

  // choose the numbering: multiple bonds, then all prefix locants, then alphabetical first cited, then Z / R first
  const info = (o) => ({ mult: o.mult, locs: o.subs.map((s) => s.loc).sort((a, b) => a - b), sc: scoreOf(o.subs, mode) });
  options.forEach((o) => { o.k = info(o); });
  options.sort((x, y) => cmpNums(x.k.mult, y.k.mult) || cmpNums(x.k.locs, y.k.locs) || cmpScore(x.k.sc, y.k.sc));
  const top = options[0];
  let best = options.filter((o) => cmpNums(o.k.mult, top.k.mult) === 0 && cmpNums(o.k.locs, top.k.locs) === 0 && cmpScore(o.k.sc, top.k.sc) === 0);
  const letters = (o) => o.stereo.map((d) => d.label);
  best.sort((x, y) => orderOfTags(letters(x), letters(y)));
  best = best.filter((o) => orderOfTags(letters(o), letters(best[0])) === 0);
  const keys = [...new Set(best.flatMap((o) => o.subs.map((s) => s.id)))].map((id) => keyOf(id, mode));
  if (new Set(keys).size !== keys.length) return null;   // two different groups filed under the same letters
  const parent = { kind: parentKind, size: parentSize };
  const mkPart = (o) => ({ ...parent, subs: o.subs.map((s) => ({ id: s.id, loc: s.loc })), mult: o.mult, type, stereo: o.stereo, ct });
  const names = new Set(best.map((o) => assemble(mkPart(o), mode)));
  if (names.size !== 1) return null;
  const b = best[0];
  // the numbering the other way round (for the walkthrough and for wrong names): the best option that is not the winner and runs the other direction
  const rev = kind === 'chain' ? options.find((o) => o.path.length === b.path.length && o.path.every((v, i) => v === b.path[b.path.length - 1 - i])) : null;
  const rival = rev || options.find((o) => o.path[0] !== b.path[0] || (kind === 'ring' && o.path[1] !== b.path[1])) || null;
  // the classic alkene trap: the longest chain overall misses the C=C, so a student writes an alkane with an ethenyl branch (the SAME compound, but not how it is named)
  let trapAlt = null;
  if (parentKind === 'chain' && multB.length === 1 && multB[0].bo === 2 && longest > parentSize && !pendRing) {
    const isVinyl = (w, v) => { const kids = atom[w].cn.filter((x) => x !== v); return kids.length === 1 && G.bo(w, kids[0]) === 2 && atom[kids[0]].cn.length === 1 && !G.halOf[w].length && !G.halOf[kids[0]].length && !G.ringAtom.has(w); };
    const alts = [];
    for (const p of allPaths(nodes, adjC).filter((q) => q.length === longest)) {
      const inP = new Set(p); const brs = []; let bad = false;
      p.forEach((v, i) => {
        for (const w of atom[v].cn) { if (inP.has(w)) continue; const id = isVinyl(w, v) ? 'ethenyl' : branchOf(G, w, v); if (!id) bad = true; else brs.push({ id, loc: i + 1 }); }
        for (const hid of G.halOf[v]) brs.push({ id: hid, loc: i + 1 });
      });
      if (bad || !brs.some((x) => x.id === 'ethenyl')) continue;
      for (const rev of [false, true]) alts.push(brs.map((x) => ({ id: x.id, loc: rev ? longest + 1 - x.loc : x.loc })));
    }
    alts.sort((a, b) => cmpNums(a.map((x) => x.loc).sort((x, y) => x - y), b.map((x) => x.loc).sort((x, y) => x - y)) || cmpScore(scoreOf(a, mode), scoreOf(b, mode)));
    if (alts.length) trapAlt = alts[0];
  }
  // features the generators and the walkthrough read
  const sameLocs = (o) => cmpNums(o.k.mult, b.k.mult) === 0 && cmpNums(o.k.locs, b.k.locs) === 0;
  const tieRival = options.find((o) => sameLocs(o) && assemble(mkPart(o), mode) !== [...names][0]) || null;
  const idCount = {}; b.subs.forEach((s) => { idCount[s.id] = (idCount[s.id] || 0) + 1; });
  const sumOf = (a) => a.reduce((x, y) => x + y, 0);
  const feat = {
    tie: !!tieRival,
    fpd: !!rival && cmpNums(rival.k.locs, b.k.locs) !== 0 && cmpNums(rival.k.mult, b.k.mult) === 0 && sumOf(rival.k.locs) === sumOf(b.k.locs),
    multi: Object.values(idCount).some((c) => c > 1),
    complex: b.subs.some((s) => sinfo(s.id).par.new),
    halo: b.subs.some((s) => HALO[s.id]),
    nsubs: b.subs.length,
    trap: parentKind === 'chain' && multB.length > 0 && longest > parentSize,
    chainTie, chainTieBroken,
    numbering: new Set(options.map((o) => assemble(mkPart(o), mode))).size > 1   // does the direction of numbering change the written name?
  };
  return {
    mode, kind: parentKind, parent, parentAtoms: b.path, mult: b.mult, type, subs: b.subs, stereo: b.stereo, pending: b.pending, ct,
    name: [...names][0], longest, G, options, best, rival, tieRival, feat, pendRing, smiles, ezs, tet, trapAlt
  };
}
export function nameMol(smiles, mode = 'new') { const i = analyseMol(smiles, mode); return i ? i.name : null; }
/** {new, old, sys} or null when any style cannot be written. */
/** {new, old, sys, yl} names from a set of per-style analyses. */
export const namesOf = (infos) => Object.fromEntries(MODES3.map((m) => [m, infos[m].name]));
export function nameAll(smiles) {
  const out = {};
  for (const m of MODES3) { const n = nameMol(smiles, m); if (!n) return null; out[m] = n; }
  return out;
}

// ============================================================================================================
// Building structures from a specification
//   acyclic: {n, subs:[{id,loc}], bonds:{loc:order}, ez:{loc:'E'|'Z' as "chain neighbours trans/cis"}, tags:{loc:'@'|'@@'}}
//   ring   : {size, subs:[{id,loc,up?}], ene: loc | null}
// ============================================================================================================
export function fragOf(id) { if (HALO[id]) return HALO[id].sym; if (id === 'ethenyl') return 'C=C'; return subFragment(id) || fragmentOfComplex(id); }

export function buildAcyclic(spec) {
  const n = spec.n; const per = Array.from({ length: n }, () => []);
  for (const s of spec.subs) { const f = fragOf(s.id); if (!f || s.loc < 1 || s.loc > n) return null; per[s.loc - 1].push(f); }
  const bonds = spec.bonds || {}; const ez = spec.ez || {}; const tags = spec.tags || {};
  const marks = {};   // bond (i,i+1) -> '/' | '\\'
  for (const k of Object.keys(ez).map(Number).sort((a, b) => a - b)) {
    if (bonds[k] !== 2 || k < 2 || k + 2 > n) return null;
    const before = marks[k - 1] || '/'; marks[k - 1] = before;
    marks[k + 1] = ez[k] === 'trans' ? before : before === '/' ? '\\' : '/';
  }
  let out = '';
  for (let i = 1; i <= n; i++) {
    if (i > 1) { const o = bonds[i - 1] || 1; out += o === 3 ? '#' : o === 2 ? '=' : marks[i - 1] || ''; }
    const free = (i === 1 || i === n ? 3 : 2) - ((bonds[i - 1] || 1) - 1) - ((bonds[i] || 1) - 1);
    if (per[i - 1].length > free) return null;
    const tag = tags[i];
    if (tag) { if (per[i - 1].length !== 1 || i === 1 || i === n || (bonds[i - 1] || 1) !== 1 || (bonds[i] || 1) !== 1) return null; out += `[C${tag}H]`; } else out += 'C';
    out += per[i - 1].map((f) => `(${f})`).join('');
  }
  return out;
}

export function buildRing(spec) {
  const n = spec.size; const per = Array.from({ length: n }, () => []);
  for (const s of spec.subs) { const f = fragOf(s.id); if (!f || s.loc < 1 || s.loc > n) return null; per[s.loc - 1].push(s); }
  let out = '';
  for (let i = 1; i <= n; i++) {
    const nb = (spec.ene && spec.ene === i) ? '=' : '';
    if (i > 1) out += (spec.ene === i - 1 ? '=' : '');
    const subs = per[i - 1];
    const doubles = (spec.ene === i || spec.ene === i - 1 || (spec.ene === n && i === 1 && false)) ? 1 : 0;
    if (subs.length > 2 - doubles) return null;
    const st = subs.length === 1 && subs[0].up !== undefined && !doubles;
    let atom = 'C';
    if (st) {
      const p = (i - 2 + n) % n + 1, nx = i % n + 1;
      const tagQ = subs[0].up ? 1 : -1;
      // textual neighbour order
      const sub = 'S';
      let order;
      if (i === 1) order = ['H', n, sub, nx]; else if (i === n) order = [p, 'H', 1, sub]; else order = [p, 'H', sub, nx];
      const par = swapParity(order, [p, nx, sub, 'H']);
      atom = `[C${(par ? -tagQ : tagQ) === 1 ? '@' : '@@'}H]`;
    }
    out += atom + (i === 1 ? '8' : i === n ? '8' : '') + subs.map((s) => `(${fragOf(s.id)})`).join('');
    void nb;
  }
  if (spec.ene === n) return null;
  return out;
}

// ============================================================================================================
// Wrong names: the assembler run with ONE rule broken
// ============================================================================================================
export function partsOf(info) {
  return { kind: info.kind, size: info.parent.size, subs: info.subs.map((s) => ({ id: s.id, loc: s.loc })), mult: info.mult.slice(), type: info.type, stereo: info.stereo.map((d) => ({ ...d })), ct: info.ct };
}
function mirrorParts(p) {
  const L = p.size;
  return { ...p, subs: p.subs.map((s) => ({ id: s.id, loc: L + 1 - s.loc })), mult: p.mult.map((m) => L - m).sort((a, b) => a - b), stereo: p.stereo.map((d) => ({ ...d, loc: d.what === 'ez' ? L - d.loc : L + 1 - d.loc })).sort((a, b) => a.loc - b.loc) };
}
/** The structure a (stereo-free) name literally describes, as SMILES; null when it cannot be drawn. */
export function literalSmiles(p) {
  if (p.kind === 'ring') {
    if (p.size < 3 || p.mult.length > 1) return null;
    return buildRing({ size: p.size, subs: p.subs, ene: p.mult.length ? 1 : null });
  }
  const bonds = {}; p.mult.forEach((m) => { bonds[m] = p.type === 'ene' ? 2 : 3; });
  return buildAcyclic({ n: p.size, subs: p.subs, bonds });
}
const SWAPS = { methyl: ['ethyl'], ethyl: ['methyl', 'propyl'], propyl: ['isopropyl', 'ethyl'], isopropyl: ['propyl'], 'tert-butyl': ['isobutyl', 'sec-butyl'], 'sec-butyl': ['isobutyl', 'butyl'], isobutyl: ['sec-butyl'], butyl: ['sec-butyl', 'propyl'], chloro: ['bromo'], bromo: ['chloro', 'iodo'], fluoro: ['chloro'], iodo: ['bromo'], neopentyl: ['isopentyl', 'isobutyl'], isopentyl: ['neopentyl', 'isobutyl'] };
const sw = (id) => SWAPS[id] || (/^cyclo\d+$/.test(id) ? [`cyclo${Number(id.slice(5)) + 1}`] : []);
const dispName = (id, mode = 'new') => sinfo(id)[mode];
const locsText = (a) => a.join(',');
const sortedLocs = (subs) => subs.map((s) => s.loc).sort((a, b) => a - b);

/**
 * Every wrong name worth showing for a structure: [{name:{new,old,sys}, rule, why, same, p}]
 * same = the wrong name still describes the SAME compound (wrong end of the chain, alphabetical order, shorter parent ...); otherwise a different compound
 * (or no compound at all). `same` is read off the structure the name literally says whenever that can be drawn.
 */
export function wrongNames(smiles, infos, opts0 = {}) {
  infos = infos || modeInfos(smiles);
  if (!infos) return [];
  const correct = Object.fromEntries(MODES3.map((m) => [m, infos[m].name]));
  const I = infos.new;
  const hasStereo = I.stereo.length > 0 || !!I.ct;
  const out = []; const seen = new Set(MODES3.map((m) => normName(correct[m])));
  const targetCanon = hasStereo ? null : canon(smiles);
  const add = (rule, why, mk, expectSame, asm) => {
    const nm = {}; let pNew = null;
    for (const m of MODES3) {
      const p = mk(partsOf(infos[m]), m, infos[m]);
      if (!p) return;
      if (m === 'new') pNew = p;
      nm[m] = assemble(p, m, asm || {});
    }
    if (MODES3.some((m) => normName(nm[m]) === normName(correct[m]))) return;
    const key = normName(nm.new) + '|' + normName(nm.old);
    if (out.some((o) => normName(o.name.new) + '|' + normName(o.name.old) === key)) return;
    let same = expectSame;
    if (!hasStereo) {
      const lit = literalSmiles(pNew);
      const lc = lit ? canon(lit) : null;
      if (lit === null || lc === null) return;
      same = lc === targetCanon;
      if (rule === 'multiplier' || rule === 'type') same = false;
      else if (same !== expectSame) return;       // the mutation did not do what its label says (a symmetric molecule): drop it
    } else if (rule !== 'stereo-missing') {
      // stereo present: a mutation that lands on the mirror numbering of the right name is the right name
      const mp = pNew.kind === 'chain' ? mirrorParts(pNew) : null;
      if (mp && assemble(mp, 'new') === correct.new) return;
    }
    out.push({ name: nm, rule, why, same, p: pNew });
  };
  const P = partsOf(I), L = P.size;
  const hasMult = P.mult.length > 0;

  // ---- numbering from the wrong end / wrong direction round a ring
  if (I.kind === 'chain') {
    const mp = mirrorParts(P);
    const mirrorTie = cmpNums(sortedLocs(mp.subs), sortedLocs(P.subs)) === 0 && cmpNums(mp.mult, P.mult) === 0;
    const why = mirrorTie
      ? `The locants come out the same from both ends (${locsText(sortedLocs(P.subs))}), so the tie is broken alphabetically: the group that comes first in the alphabet gets the lower number.`
      : hasMult ? `Numbered from the wrong end. The ${P.type === 'ene' ? 'double' : 'triple'} bond must get the lowest possible number (C${P.mult[0]} here, not C${mp.mult[0]}); the branches only matter if that ties.`
        : `Numbered from the wrong end. Number from the end that gives the lowest locants at the first point of difference: ${locsText(sortedLocs(P.subs))}, not ${locsText(sortedLocs(mp.subs))}.`;
    add(mirrorTie ? 'tiebreak' : 'numbering', why, (p) => mirrorParts(p), true);
  } else {
    const seenN = new Set([assemble(P, 'new')]);
    for (const o of I.options) {
      const pp = { ...P, subs: o.subs.map((s) => ({ id: s.id, loc: s.loc })) };
      const nmNew = assemble(pp, 'new');
      if (seenN.has(nmNew)) continue; seenN.add(nmNew);
      const lo = sortedLocs(pp.subs), ro = sortedLocs(P.subs);
      if (!hasMult && lo[0] !== 1) continue;   // a student starts the ring at one of the groups, never at an empty carbon
      const tie = cmpNums(lo, ro) === 0;
      const why = tie ? `The locants tie (${locsText(ro)}) round the ring, so the group that comes first in the alphabet gets the lower number.`
        : `The ring must be numbered for the lowest locants at the first point of difference: ${locsText(ro)} rather than ${locsText(lo)}.${hasMult ? ' The C=C is always C1=C2.' : ''}`;
      add(tie ? 'tiebreak' : 'numbering', why, (p) => ({ ...p, subs: pp.subs }), true);
    }
  }
  // ---- alphabetical order of the prefixes
  const distinct = new Set(P.subs.map((s) => s.id));
  if (distinct.size > 1) {
    add('alphabetical', 'The prefixes are not in alphabetical order. Put them in alphabetical order (not by size, not by number), ignoring di-, tri- and tert-/sec- but counting iso.', (p) => p, true, { order: 'reverse' });
    add('alphabetical', 'Do not list the prefixes in the order of their numbers. List them alphabetically and keep each group with its own number.', (p) => p, true, { order: 'locant' });
    if (P.subs.some((s) => P.subs.filter((t) => t.id === s.id).length > 1)) add('alphabetical', 'di-, tri- and tetra- are ignored when you alphabetize: dimethyl is filed under m, not under d.', (p) => p, true, { order: 'multiplier' });
  }
  // ---- a shorter parent (still holding every multiple bond)
  if (I.kind === 'chain') {
    for (const d of [1, 2]) {
      const size = L - d;
      if (size < 2) continue;
      const alt = {};
      let ok = true;
      for (const m of MODES3) { const i = analyseMol(smiles, m, { parentLen: size }); if (!i) { ok = false; break; } alt[m] = i; }
      if (!ok) continue;
      // a branch hanging on the end carbon of the chosen parent means the chain could still be extended: nobody would pick that parent
      if (alt.new.subs.some((s) => !HALO[s.id] && (s.loc === 1 || s.loc === alt.new.parent.size))) continue;
      add('parent', `The parent you used has ${size} carbons. The longest chain${hasMult ? ' that contains the multiple bond' : ''} has ${L}: always start from the longest.`, (p, m) => partsOf(alt[m]), true);
      break;
    }
  }
  if (I.trapAlt) {
    add('parent', `That uses the longest chain overall (${I.longest} carbons) and treats the C=C as an ethenyl branch. The parent of an alkene has to contain the double bond, so it is the ${L}-carbon chain through the C=C.`, (p, m, info) => ({ kind: 'chain', size: info.longest, subs: info.trapAlt, mult: [], type: 'ane', stereo: [], ct: null }), true);
  }
  // ---- ring against chain
  if (I.G.ring) {
    const other = I.kind === 'ring' ? 'chain' : 'ring';
    const alt = {};
    let ok = true;
    for (const m of MODES3) { const i = analyseMol(smiles, m, { forceKind: other }); if (!i) { ok = false; break; } alt[m] = i; }
    if (ok) {
      const ringN = I.G.ring.length;
      const why = other === 'chain'
        ? `The ring has ${ringN} carbons and no chain on it has more, so in this course the ring is the parent (a ring is the parent when it has at least as many carbons as the longest chain).`
        : `The longest chain has more carbons (${I.parent.size}) than the ring (${ringN}), so in this course the chain is the parent and the ring is a cycloalkyl group.`;
      add('ring-parent', why, (p, m) => partsOf(alt[m]), true);
    }
  }
  // ---- stereo labels
  if (hasStereo) {
    if (I.ct) {
      add('stereo-missing', 'cis or trans is missing. A ring with groups on two different carbons has two geometries, and the name must say which one (cis = same face, trans = opposite faces).', (p) => ({ ...p, ct: null }), false);
      add('ct', `This is ${I.ct}, not ${I.ct === 'cis' ? 'trans' : 'cis'}: cis means both groups on the same face of the ring (both wedges or both dashes), trans means one up and one down.`, (p) => ({ ...p, ct: p.ct === 'cis' ? 'trans' : 'cis' }), false);
    }
    if (I.stereo.length) {
      const hasEz = I.stereo.some((d) => d.what === 'ez'), hasRs = I.stereo.some((d) => d.what === 'rs');
      add('stereo-missing', hasEz && hasRs ? 'Both kinds of label are needed here: E or Z for the double bond and R or S for the stereocentre.' : hasEz ? 'The (E) or (Z) is missing. Each carbon of the C=C has two different groups, so the name must say which geometry it is.' : 'The (R) or (S) is missing. A carbon with four different groups is a stereocentre, and the name must say which configuration it is.', (p) => ({ ...p, stereo: [] }), false);
      if (hasEz && hasRs) {
        add('stereo-missing', 'The E/Z label is there but the R/S one is missing. The stereocentre needs (R) or (S) as well as the double bond needing (E) or (Z).', (p) => ({ ...p, stereo: p.stereo.filter((d) => d.what === 'ez') }), false);
        add('stereo-missing', 'The R/S label is there but the E/Z one is missing. The C=C has two different groups on each carbon, so it needs (E) or (Z) too.', (p) => ({ ...p, stereo: p.stereo.filter((d) => d.what === 'rs') }), false);
      }
      I.stereo.forEach((d, k) => {
        const flip = d.label === 'E' ? 'Z' : d.label === 'Z' ? 'E' : d.label === 'R' ? 'S' : 'R';
        let why;
        if (d.what === 'ez') {
          const e = I.ezs.find((x) => x.a === d.atom || x.b === d.atom);
          const hi = e ? e.ends.map((x) => x.subs[x.hi].label) : null;
          const at = I.stereo.length > 1 ? `At C${d.loc}=C${d.loc + 1}: ` : '';
          why = hi ? `${at}The higher-ranked group on each carbon is ${hi[0]} and ${hi[1]} (higher atomic number wins; on a tie compare the next atoms out). They are on ${d.label === 'Z' ? 'the same side: Z' : 'opposite sides: E'}, not ${flip}.` : `Rank the groups on each carbon: the higher-ranked ones on the same side make Z, on opposite sides E. This one is ${d.label}.`;
        } else {
          const t = I.tet.find((x) => x.atom === d.atom);
          const ranks = t ? t.order.map((i) => t.subs[i].label) : null;
          why = ranks ? `At C${d.loc} the groups rank ${ranks.join(' > ')}. With the lowest (${ranks[3]}) pointing away, 1 → 2 → 3 runs ${d.label === 'R' ? 'clockwise: R' : 'counterclockwise: S'}, not ${flip}.` : `Rank the four groups and look with the lowest away from you: clockwise is R, counterclockwise is S. This centre is ${d.label}.`;
        }
        add(d.what === 'ez' ? 'ez' : 'rs', why, (p) => ({ ...p, stereo: p.stereo.map((x, j) => (j === k ? { ...x, label: flip } : x)) }), false);
      });
    }
  }
  // ---- a different branch, a different position, a different size, a missing multiplier, the wrong ending
  const stereoHost = (i) => hasStereo && I.stereo.some((d) => d.atom === I.subs[i].at);
  P.subs.forEach((s, i) => {
    for (const other of sw(s.id)) {
      if (I.kind === 'ring' && sinfo(other).rooted > L) continue;
      add('branch', sinfo(s.id).halo ? `The atom on C${s.loc} is ${dispName(s.id)} (${HALO[s.id].sym}), not ${dispName(other)} (${HALO[other] ? HALO[other].sym : '?'}): read the atom label in the drawing.` : `The group on C${s.loc} is ${dispName(s.id)}, not ${dispName(other)}: count its carbons and see where it joins the parent.`, (p) => ({ ...p, subs: p.subs.map((x, j) => (j === i ? { ...x, id: other } : x)) }), false);
    }
    for (const dl of [-1, 1]) {
      const loc = s.loc + dl;
      if (loc < 1 || loc > L || stereoHost(i)) continue;
      if (I.kind === 'chain' && !HALO[s.id] && (loc === 1 || loc === L)) continue;   // an alkyl group on the end carbon would lengthen the chain: nobody writes that
      add('position', `The ${dispName(s.id)} group is on C${s.loc} (numbering as the name does), not C${loc}: re-count along the parent.`, (p) => ({ ...p, subs: p.subs.map((x, j) => (j === i ? { ...x, loc } : x)) }), false);
    }
  });
  if (hasMult && I.kind === 'chain') {
    P.mult.forEach((m, k) => {
      for (const dl of [-1, 1]) {
        const nm = m + dl;
        if (nm < 1 || nm > L - 1 || P.mult.includes(nm)) continue;
        add('position', `The ${P.type === 'ene' ? 'double' : 'triple'} bond starts at C${m}, not C${nm}: count from the end that is nearer to it.`, (p) => ({ ...p, mult: p.mult.map((x, j) => (j === k ? nm : x)).sort((a, b) => a - b), stereo: [] }), false);
      }
    });
  }
  for (const d of opts0.extra ? [-1, 1, -2, 2] : [-1, 1]) {   // extra: unbranched molecules (pentane) have too few other mistakes for four options
    const size = L + d;
    if (size < (I.kind === 'ring' ? 3 : 2) || size > 10) continue;
    if (P.subs.some((s) => s.loc > size) || P.mult.some((m) => m > size - 1)) continue;
    if (I.kind === 'chain' && P.subs.some((s) => !HALO[s.id] && (s.loc === size || s.loc === 1))) continue;
    add('count', `The parent has ${L} carbons, not ${size}: count the carbons of the parent only, and not the branches.`, (p) => ({ ...p, size }), false);
  }
  const counts = {}; P.subs.forEach((s) => { counts[s.id] = (counts[s.id] || 0) + 1; });
  if (Object.values(counts).some((c) => c > 1)) add('multiplier', 'When the same group appears twice or more, say how many with di-, tri- or tetra- (bis-, tris- before a bracketed name).', (p) => p, false, { noMult: true });
  if (I.type === 'ene' && P.mult.length === 1) add('type', 'There is a C=C in this molecule, so the ending is -ene (the parent name changes from -ane).', (p) => ({ ...p, type: 'ane', mult: [], stereo: [] }), false);
  if (I.type === 'yne') add('type', 'There is a C≡C triple bond here, so the ending is -yne, not -ene.', (p) => ({ ...p, type: 'ene' }), false);
  return out;
}

export function modeInfos(smiles) {
  const o = {};
  for (const m of MODES3) { const i = analyseMol(smiles, m); if (!i) return null; o[m] = i; }
  return o;
}

// ============================================================================================================
// Explanations: the walkthrough follows the lesson's numbered recipe (1 parent, 2 numbering, 3 branches, 4 alphabetical order, then stereo)
// ============================================================================================================
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** `<name new old>` tag for a name pair (the page flips it with the New / Old IUPAC switch). */
export function nameTag(pair) { return pair.new === pair.old ? esc(pair.new) : `<name new="${esc(pair.new)}" old="${esc(pair.old)}"></name>`; }
const subTag = (id) => nameTag({ new: dispName(id, 'new'), old: dispName(id, 'old') });
export const toPlain = (html) => String(html).replace(/<br\s*\/?>/g, ' ').replace(/<name new="([^"]*)" old="[^"]*"><\/name>/g, '$1').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const joinAnd = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const bondWord = (t) => (t === 'ene' ? 'double' : 'triple');
const cWord = (n) => `${n} carbon${n === 1 ? '' : 's'}`;

/** The numbered walkthrough for a molecule, as HTML (with <name> tags). */
export function walkthrough(infos) {
  const I = infos.new, O = infos.old;
  const L = I.parent.size, stem = STEM[L - 1];
  const out = [];
  const hasMult = I.mult.length > 0;
  const G = I.G;
  // 1 parent
  if (I.kind === 'ring') {
    const ext = []; G.ring.forEach((r) => { for (const w of G.atom[r].cn) if (!G.ringAtom.has(w)) ext.push(rootedLen(G, w, r)); });
    const Lm = ext.length ? Math.max(...ext) : 0;
    out.push(`<b>1 Parent.</b> ${hasMult ? 'The C=C is inside the ring, so the ring is the parent' : Lm ? `The ring has ${cWord(L)} and the longest chain on it has ${Lm}. A ring is the parent when it has at least as many carbons as the longest chain` : 'The ring is the parent'}: cyclo${stem}${I.type}.`);
  } else if (I.pendRing) {
    out.push(`<b>1 Parent.</b> The longest chain has ${cWord(L)}, more than the ring (${I.G.ring.length}), so the chain is the parent (${stem}ane) and the ring is a cyclo${STEM[I.G.ring.length - 1]}yl group.`);
  } else {
    let t = `<b>1 Parent.</b> Longest continuous chain${hasMult ? ` that contains the ${bondWord(I.type)} bond` : ' (bends are allowed)'}: ${cWord(L)}, so the stem is ${stem}- and the ending is ${I.type === 'ane' ? '-ane' : I.mult.length > 1 ? `-di${I.type}` : `-${I.type}`}.`;
    if (I.feat.trap) t += ` A longer chain of ${I.longest} carbons exists, but it does not contain the ${bondWord(I.type)} bond, so it cannot be the parent.`;
    else if (I.feat.chainTieBroken) t += ' Several chains are equally long; the one that leaves the most branches wins the tie.';
    out.push(t);
  }
  // 2 numbering
  if (I.subs.length || hasMult) {
    const locs = sortedLocs(I.subs);
    let t = '<b>2 Number</b> ';
    if (I.kind === 'chain') {
      const rivalLocs = I.rival ? sortedLocs(I.rival.subs) : null;
      if (hasMult) t += `from the end that gives the ${bondWord(I.type)} bond the lowest number: it starts at C${I.mult.join(' and C')}${I.rival && I.rival.mult.length ? ` (from the other end it would be C${I.rival.mult.join(' and C')})` : ''}.`;
      else if (I.subs.length) t += `from the end that gives the lowest locants at the first point of difference: ${locsText(locs)}${rivalLocs && cmpNums(rivalLocs, locs) !== 0 ? `, not ${locsText(rivalLocs)} from the other end` : ''}.`;
      if (I.feat.tie) t += ` The locants tie (${locsText(locs)}) both ways, so the group that comes first in the alphabet gets the lower number.`;
      else if (hasMult && I.subs.length) t += ` The branches then sit on ${locsText(locs)}.`;
      else if (I.feat.fpd) t += ' (The sums of the numbers are equal, so look at the first point of difference, not the total.)';
    } else {
      t += `round the ring so that the locants are as low as possible at the first point of difference${hasMult ? ' (the C=C is C1=C2)' : ''}: ${locsText(locs)}.`;
      if (I.feat.tie) t += ' The locants tie, so the group that comes first in the alphabet gets the lower number.';
    }
    out.push(t);
  }
  // 3 branches
  if (I.subs.length) {
    const byLoc = I.subs.slice().sort((a, b) => a.loc - b.loc || cmpStr(keyOf(a.id, 'new'), keyOf(b.id, 'new')));
    out.push(`<b>3 Branches.</b> ${joinAnd(byLoc.map((s) => `${subTag(s.id)} on C${s.loc}`))}${I.feat.multi ? '; the same group twice or more takes di-, tri-, tetra-' : ''}.`);
    const order = [...new Set(I.subs.map((s) => s.id))].sort((a, b) => cmpStr(keyOf(a, 'new'), keyOf(b, 'new')));
    const oldOrder = [...new Set(O.subs.map((s) => s.id))].sort((a, b) => cmpStr(keyOf(a, 'old'), keyOf(b, 'old')));
    let t = `<b>4 Alphabetical order</b>, ignoring di-, tri-, sec- and tert- (but not iso): ${order.map(subTag).join(', ')}${order.length > 1 ? '' : ' (one kind of branch, so nothing to sort)'}.`;
    if (order.join() !== oldOrder.join()) t += ' The two IUPAC styles give some groups two names (isopropyl or propan-2-yl, isobutyl or 2-methylpropyl) that are filed under different letters, so the order can differ between the styles.';
    out.push(t);
  }
  // 5 stereo
  if (I.stereo.length || I.ct) {
    const bits = [];
    I.stereo.forEach((d) => {
      if (d.what === 'ez') {
        const e = I.ezs.find((x) => x.a === d.atom || x.b === d.atom);
        const hi = e ? e.ends.map((x) => `${x.subs[x.hi].label}`) : [];
        bits.push(`C${d.loc}=C${d.loc + 1}: the higher-ranked group is ${hi[0]} on one carbon and ${hi[1]} on the other; they lie on ${d.label === 'Z' ? 'the same side, so Z' : 'opposite sides, so E'}`);
      } else {
        const t = I.tet.find((x) => x.atom === d.atom);
        const ranks = t ? t.order.map((i) => t.subs[i].label) : [];
        bits.push(`C${d.loc}: the groups rank ${ranks.join(' > ')}; with ${ranks[3] || 'H'} pointing away, 1 → 2 → 3 runs ${d.label === 'R' ? 'clockwise, so R' : 'counterclockwise, so S'}`);
      }
    });
    if (I.ct) bits.push(`the two groups are on the ${I.ct === 'cis' ? 'same face of the ring, so cis' : 'opposite faces of the ring, so trans'}`);
    out.push(`<b>5 Stereo.</b> ${bits.join('; ')}. The label goes in front: ${I.ct ? 'cis- or trans-' : 'in brackets with the locant when there is more than one'}.`);
  }
  out.push(`<b>Name:</b> ${nameTag({ new: I.name, old: O.name })}.`);
  return '<br>' + out.join('<br>');
}

/** One-line reason shown on the right option. */
function shortWhy(infos) {
  const I = infos.new; const L = I.parent.size; const stem = STEM[L - 1];
  const bits = [];
  if (I.kind === 'ring') bits.push(`the ring (${cWord(L)}) is the parent`);
  else bits.push(`the parent is the ${I.mult.length ? 'longest chain through the multiple bond' : 'longest chain'}, ${stem}${I.type === 'ane' ? 'ane' : I.type}`);
  if (I.subs.length) bits.push(`numbered for the lowest locants (${locsText(sortedLocs(I.subs))})`);
  if (I.subs.length > 1) bits.push('prefixes in alphabetical order');
  if (I.stereo.length || I.ct) bits.push('with its stereo label in front');
  return `Yes: ${bits.join(', ')}.`;
}

// ============================================================================================================
// Specifications by level
// ============================================================================================================
const weighted = (rng, table) => { const t = table.reduce((s, [, w]) => s + w, 0); let r = rng() * t; for (const [v, w] of table) { r -= w; if (r <= 0) return v; } return table[table.length - 1][0]; };
const randHal = (rng) => pick(rng, ['chloro', 'bromo', 'bromo', 'chloro', 'fluoro', 'iodo']);
const randIn = (rng, lo, hi) => (hi < lo ? null : lo + Math.floor(rng() * (hi - lo + 1)));
const sizeOf = (id) => sinfo(id).size;
/** Allowed positions on a chain of m carbons for a branch, so that the chain stays the longest. */
const branchRange = (id, m) => { const r = sinfo(id).rooted; return [r + 1, m - r]; };

function specL1(rng, kind0) {
  const kind = kind0 || weighted(rng, [['alk', 34], ['hal', 30], ['ring', 36]]);
  if (kind === 'alk') {
    const m = pick(rng, [4, 5, 5, 6, 6, 7]); const k = pick(rng, [1, 1, 2]);
    const subs = []; let carbons = m;
    for (let j = 0; j < k; j++) {
      const ids = ['methyl', 'methyl', 'methyl', 'ethyl', 'ethyl', 'propyl'].filter((id) => carbons + sizeOf(id) <= 8 && branchRange(id, m)[1] >= branchRange(id, m)[0]);
      if (!ids.length) break;
      const id = pick(rng, ids); const [lo, hi] = branchRange(id, m);
      subs.push({ id, loc: randIn(rng, lo, hi) }); carbons += sizeOf(id);
    }
    if (!subs.length) return null;
    return { smiles: buildAcyclic({ n: m, subs }), tag: 'alkane' };
  }
  if (kind === 'hal') {
    const branched = rng() < 0.4; const m = branched ? pick(rng, [4, 5]) : pick(rng, [3, 4, 5, 6]);
    const subs = [];
    if (branched) subs.push({ id: 'methyl', loc: randIn(rng, 2, m - 1) });
    const nh = branched ? 1 : pick(rng, [1, 1, 2]);
    const h1 = randHal(rng);
    for (let j = 0; j < nh; j++) subs.push({ id: j === 0 || rng() < 0.5 ? h1 : randHal(rng), loc: randIn(rng, 1, m) });
    return { smiles: buildAcyclic({ n: m, subs }), tag: 'halide' };
  }
  const sub = weighted(rng, [['ringp', 45], ['chainp', 30], ['tie', 25]]);
  if (sub === 'ringp') {
    const n = pick(rng, [3, 4, 5, 5, 6, 6, 6]); const k = pick(rng, [1, 1, 2]);
    const ids = ['methyl', 'methyl', 'ethyl', 'chloro', 'bromo', 'propyl'].filter((id) => sinfo(id).rooted <= n);
    const locs = shuffle(rng, range(1, n)).slice(0, k);
    const subs = locs.map((loc) => ({ id: pick(rng, ids), loc }));
    return { smiles: buildRing({ size: n, subs }), tag: 'ring' };
  }
  if (sub === 'chainp') {
    const m = pick(rng, [4, 5, 6]); const c = randIn(rng, 3, Math.min(5, m - 1));
    return { smiles: buildAcyclic({ n: m, subs: [{ id: 'cyclo' + c, loc: randIn(rng, 1, m) }] }), tag: 'chain-ring' };
  }
  const n = pick(rng, [3, 4]); const id = n === 3 ? pick(rng, ['propyl', 'ethyl']) : pick(rng, ['butyl', 'propyl']);
  return { smiles: buildRing({ size: n, subs: [{ id, loc: 1 }] }), tag: 'ring-tie' };
}

function specL2(rng, kind0) {
  const focus = kind0 || pick(rng, ['alpha', 'alpha', 'tie', 'tie', 'fpd', 'complex', 'complex', 'multi', 'ring', 'ring', 'halo']);
  const sizeCap = (subs, m) => subs.reduce((s, x) => s + sizeOf(x.id), m);
  if (focus === 'alpha') {
    const m = pick(rng, [6, 7, 8]); const ids = shuffle(rng, ['methyl', 'ethyl', 'propyl']).slice(0, pick(rng, [2, 3]));
    const locs = new Set(); const subs = [];
    for (const id of ids) { const [lo, hi] = branchRange(id, m); const loc = randIn(rng, lo, hi); if (loc && !locs.has(loc)) { locs.add(loc); subs.push({ id, loc }); } }
    if (subs.length < 2 || sizeCap(subs, m) > 12) return null;
    return { smiles: buildAcyclic({ n: m, subs }), tag: 'alpha', want: null };
  }
  if (focus === 'tie') {
    const m = pick(rng, [7, 8, 9]); const p = randIn(rng, 3, Math.floor((m - 1) / 2) + (m % 2 ? 0 : 0));
    const ab = shuffle(rng, ['methyl', 'ethyl', 'propyl']).slice(0, 2);
    const q = m + 1 - p; if (!(p < q)) return null;
    const subs = [{ id: ab[0], loc: p }, { id: ab[1], loc: q }];
    for (const s of subs) { const [lo, hi] = branchRange(s.id, m); if (s.loc < lo || s.loc > hi) return null; }
    return { smiles: buildAcyclic({ n: m, subs }), tag: 'tie', want: 'tie' };
  }
  if (focus === 'fpd') {
    const m = pick(rng, [7, 8, 9]); const locs = shuffle(rng, range(2, m - 1)).slice(0, 3);
    const subs = locs.map((loc) => ({ id: 'methyl', loc }));
    return { smiles: buildAcyclic({ n: m, subs }), tag: 'fpd', want: 'fpd' };
  }
  if (focus === 'complex') {
    const big = pick(rng, ['isopropyl', 'isopropyl', 'sec-butyl', 'isobutyl', 'tert-butyl', 'tert-butyl']);
    if (rng() < 0.45) {
      const n = pick(rng, [5, 6, 6]); const other = pick(rng, ['methyl', 'ethyl', 'chloro', 'bromo']);
      const locs = shuffle(rng, range(1, n)).slice(0, 2);
      return { smiles: buildRing({ size: n, subs: [{ id: big, loc: locs[0] }, { id: other, loc: locs[1] }] }), tag: 'complex', want: 'complex' };
    }
    const m = pick(rng, [7, 8, 9]); const other = pick(rng, ['methyl', 'ethyl', 'methyl']);
    const [lo, hi] = branchRange(big, m); const l1 = randIn(rng, lo, hi);
    const [lo2, hi2] = branchRange(other, m); const l2 = randIn(rng, lo2, hi2);
    if (l1 === l2) return null;
    return { smiles: buildAcyclic({ n: m, subs: [{ id: big, loc: l1 }, { id: other, loc: l2 }] }), tag: 'complex', want: 'complex' };
  }
  if (focus === 'multi') {
    const m = pick(rng, [5, 6, 7, 8]); const id = pick(rng, ['methyl', 'methyl', 'methyl', 'ethyl']); const k = id === 'ethyl' ? 2 : pick(rng, [2, 3, 3, 4]);
    const subs = []; const used = {};
    for (let j = 0; j < k; j++) { const [lo, hi] = branchRange(id, m); const loc = randIn(rng, lo, hi); if (loc && (used[loc] || 0) < 2) { used[loc] = (used[loc] || 0) + 1; subs.push({ id, loc }); } }
    if (rng() < 0.4) { const [lo, hi] = branchRange('methyl', m); const loc = randIn(rng, lo, hi); if (loc && (used[loc] || 0) < 2 && id !== 'methyl') subs.push({ id: 'methyl', loc }); }
    if (subs.length < 2 || sizeCap(subs, m) > 12) return null;
    return { smiles: buildAcyclic({ n: m, subs }), tag: 'multi', want: 'multi' };
  }
  if (focus === 'ring') {
    const n = pick(rng, [5, 6, 6, 7, 8]); const k = pick(rng, [2, 3, 3, 4]);
    const pool = ['methyl', 'methyl', 'ethyl', 'isopropyl', 'tert-butyl', 'chloro', 'bromo', 'propyl'];
    const subs = []; const used = {};
    for (let j = 0; j < k; j++) {
      const id = pick(rng, pool.filter((x) => sinfo(x).rooted <= n));
      const loc = randIn(rng, 1, n);
      if ((used[loc] || 0) >= (rng() < 0.15 ? 2 : 1)) continue;
      used[loc] = (used[loc] || 0) + 1; subs.push({ id, loc });
    }
    if (subs.length < 2) return null;
    return { smiles: buildRing({ size: n, subs }), tag: 'ring-many' };
  }
  // halo: one or two halogens and one or two alkyl groups on different carbons, so the alphabet (bromo, chloro, ethyl, methyl) decides ties
  const m = pick(rng, [5, 6, 7]); const subs = [];
  const nh = rng() < 0.5 ? 2 : 1; const na = nh === 2 ? 1 : pick(rng, [1, 2]);
  const hs = range(1, nh).map(() => randHal(rng));
  const als = shuffle(rng, ['methyl', 'ethyl', 'methyl']).slice(0, na);
  const free = shuffle(rng, range(1, m));
  for (const id of als) { const [lo, hi] = branchRange(id, m); const k = free.findIndex((x) => x >= lo && x <= hi); if (k >= 0) subs.push({ id, loc: free.splice(k, 1)[0] }); }
  for (const id of hs) { if (free.length) subs.push({ id, loc: free.pop() }); }
  if (subs.length < 3) return null;
  return { smiles: buildAcyclic({ n: m, subs }), tag: 'halo-alkyl', want: 'halo' };
}

function ezMarks(rng, bonds, n) {
  const ez = {};
  for (const k of Object.keys(bonds).map(Number)) if (bonds[k] === 2 && k >= 2 && k + 2 <= n) ez[k] = rng() < 0.5 ? 'cis' : 'trans';
  return ez;
}
function specL3(rng, kind0) {
  const kind = kind0 || weighted(rng, [['ene', 24], ['yne', 10], ['diene', 20], ['ring', 20], ['trap', 26]]);
  if (kind === 'ene' || kind === 'yne') {
    const m = pick(rng, [4, 5, 6, 7, 8]); const b = randIn(rng, 1, m - 1);
    const k = kind === 'yne' ? pick(rng, [0, 1, 1]) : pick(rng, [0, 1, 1, 2]);
    const bonds = { [b]: kind === 'yne' ? 3 : 2 };
    const subs = []; const used = {};
    for (let j = 0; j < k; j++) {
      const id = kind === 'yne' ? 'methyl' : pick(rng, ['methyl', 'methyl', 'ethyl']);
      const [lo, hi] = branchRange(id, m); const loc = randIn(rng, Math.max(2, lo - 1), Math.min(m - 1, hi + 1));
      if (loc && !used[loc]) { used[loc] = 1; subs.push({ id, loc }); }
    }
    return { smiles: buildAcyclic({ n: m, subs, bonds, ez: ezMarks(rng, bonds, m) }), tag: kind };
  }
  if (kind === 'diene') {
    const m = pick(rng, [5, 6, 7, 8, 9]); const b1 = randIn(rng, 1, m - 3); const b2 = randIn(rng, b1 + 2, m - 1);
    const bonds = { [b1]: 2, [b2]: 2 }; const subs = [];
    if (rng() < 0.4) { const loc = randIn(rng, 2, m - 1); if (loc !== b1 && loc !== b1 + 1 && loc !== b2 && loc !== b2 + 1) subs.push({ id: 'methyl', loc }); }
    return { smiles: buildAcyclic({ n: m, subs, bonds, ez: ezMarks(rng, bonds, m) }), tag: 'diene' };
  }
  if (kind === 'ring') {
    const n = pick(rng, [5, 6, 6, 7, 8]); const k = pick(rng, [0, 1, 1, 2]);
    const subs = []; const used = {};
    for (let j = 0; j < k; j++) { const id = pick(rng, ['methyl', 'methyl', 'ethyl', 'isopropyl', 'tert-butyl']); const loc = randIn(rng, 1, n); if (!used[loc]) { used[loc] = 1; subs.push({ id, loc }); } }
    return { smiles: buildRing({ size: n, subs, ene: 1 }), tag: 'cycloalkene' };
  }
  // trap: the longest chain misses the double bond
  const m = pick(rng, [5, 6, 7]); const b = pick(rng, [1, 1, 2]); const id = pick(rng, ['propyl', 'propyl', 'butyl', 'ethyl']);
  const loc = randIn(rng, 2, m - 1);
  if (loc === b || loc === b + 1) return null;
  const bonds = { [b]: 2 };
  return { smiles: buildAcyclic({ n: m, subs: [{ id, loc }], bonds, ez: ezMarks(rng, bonds, m) }), tag: 'trap', want: 'trap' };
}

function specL4(rng, kind0) {
  const kind = kind0 || weighted(rng, [['rs1', 18], ['rs2', 14], ['ct', 18], ['both', 12], ['arene', 28], ['special', 10]]);
  const tagOf = () => (rng() < 0.5 ? '@' : '@@');
  if (kind === 'rs1') {
    const m = pick(rng, [4, 5, 6]); const p = randIn(rng, 2, m - 1);
    const id = pick(rng, ['bromo', 'chloro', 'chloro', 'bromo', 'iodo', 'fluoro', 'methyl', 'ethyl']);
    return { smiles: buildAcyclic({ n: m, subs: [{ id, loc: p }], tags: { [p]: tagOf() } }), tag: 'rs1' };
  }
  if (kind === 'rs2') {
    const m = pick(rng, [4, 5, 6, 7]); const ps = shuffle(rng, range(2, m - 1)).slice(0, 2).sort((a, b) => a - b);
    if (ps.length < 2) return null;
    const subs = ps.map((loc) => ({ id: pick(rng, ['bromo', 'chloro', 'chloro', 'methyl', 'fluoro', 'iodo']), loc }));
    return { smiles: buildAcyclic({ n: m, subs, tags: { [ps[0]]: tagOf(), [ps[1]]: tagOf() } }), tag: 'rs2' };
  }
  if (kind === 'ct') {
    const n = pick(rng, [5, 6, 6, 7]); const gap = pick(rng, [1, 2, 3]); const a = randIn(rng, 1, n);
    const b = ((a - 1 + gap) % n) + 1;
    const ids = ['methyl', 'ethyl', 'chloro', 'bromo'];
    const s1 = pick(rng, ids), s2 = rng() < 0.4 ? s1 : pick(rng, ids);
    return { smiles: buildRing({ size: n, subs: [{ id: s1, loc: a, up: rng() < 0.5 }, { id: s2, loc: b, up: rng() < 0.5 }] }), tag: 'ct' };
  }
  if (kind === 'both') {
    const m = pick(rng, [5, 6, 7]); const b = pick(rng, [2, 2, 3]);
    const cand = range(2, m - 1).filter((p) => p !== b && p !== b + 1);
    if (!cand.length) return null;
    const p = pick(rng, cand); const id = pick(rng, ['bromo', 'chloro', 'methyl', 'methyl', 'ethyl']);
    const bonds = { [b]: 2 };
    return { smiles: buildAcyclic({ n: m, subs: [{ id, loc: p }], bonds, ez: ezMarks(rng, bonds, m), tags: { [p]: tagOf() } }), tag: 'ez-rs' };
  }
  return { arene: kind, tag: kind };
}

// ---- benzene derivatives (engine/naming-arene.js)
const MONO = ['CH3', 'OH', 'NH2', 'OMe', 'Cl', 'Br', 'NO2', 'Et', 'CHO', 'COOH', 'CN', 'iPr'];
export function specArene(rng) {
  const kind = weighted(rng, [['mono', 25], ['di', 45], ['tri', 30]]);
  const pool = ['CH3', 'OH', 'NH2', 'Cl', 'Br', 'NO2', 'Et', 'CHO', 'COOH', 'F', 'I', 'CN'];
  if (kind === 'mono') return { groups: { 0: pick(rng, MONO) }, kind };
  if (kind === 'di') {
    const a = pick(rng, pool); let b = pick(rng, pool);
    if (rng() < 0.2) b = a;
    return { groups: { 0: a, [pick(rng, [1, 2, 3])]: b }, kind };
  }
  const ps = shuffle(rng, range(0, 5)).slice(0, 3); const g = {};
  const base = pick(rng, ['CH3', 'OH', 'NH2', 'Cl', 'Br', 'NO2']);
  ps.forEach((p, i) => { g[p] = i === 0 ? base : pick(rng, ['Cl', 'Br', 'NO2', 'CH3', 'Et', 'F']); });
  return { groups: g, kind };
}
const GROUP_WORD = { CH3: 'methyl', OH: 'hydroxy', NH2: 'amino', OMe: 'methoxy', Cl: 'chloro', Br: 'bromo', NO2: 'nitro', Et: 'ethyl', CHO: 'formyl', COOH: 'carboxy', CN: 'cyano', iPr: 'isopropyl', F: 'fluoro', I: 'iodo' };

export function areneNames(smiles) {
  const nb = nameBothArene(smiles);
  if (!nb) return null;
  const A = arene(smiles);
  const acc = new Set([nb.new, nb.old]);
  // extra spellings a learner may legitimately type: 4-chlorotoluene (a locant from the CH3 carbon), o-/m-/p- with the special parent
  if (A && A.subs.length === 2) {
    const me = A.subs.filter((s) => s.key === 'CH3');
    const hasParent = A.subs.some((s) => ARENE_SUB[s.key].parent);
    if (me.length === 1 && !hasParent) {
      const other = A.subs.find((s) => s !== me[0]);
      const d = (((other.pos - me[0].pos) % 6) + 6) % 6; const loc = d === 1 || d === 5 ? 2 : d === 2 || d === 4 ? 3 : 4;
      const pre = ARENE_SUB[other.key].prefix.replace(/^\(|\)$/g, '');
      const pre2 = (ARENE_SUB[other.key].oldPrefix || ARENE_SUB[other.key].prefix);
      acc.add(`${loc}-${pre}toluene`); acc.add(`${loc}-${pre2}toluene`);
    }
  }
  return { new: nb.new, old: nb.old, accept: [...acc] };
}

export function areneProblemData(rng, spec0) {
  for (let t = 0; t < (spec0 ? 1 : 60); t++) {
    const spec = spec0 || specArene(rng);
    const smiles = buildArene(spec.groups);
    const nm = areneNames(smiles);
    if (!nm) continue;
    // wrong names: the same groups on other ring positions, one group swapped
    const A = arene(smiles);
    const wrongs = [];
    const keys = Object.entries(spec.groups);
    const seen = new Set(nm.accept.map(normName));
    const push = (g, rule, why) => {
      const s2 = buildArene(g); const n2 = nameBothArene(s2);
      if (!n2 || canon(s2) === canon(smiles) || seen.has(normName(n2.new)) || seen.has(normName(n2.old))) return;
      if (wrongs.some((w) => normName(w.name.new) === normName(n2.new) && normName(w.name.old) === normName(n2.old))) return;
      wrongs.push({ name: { new: n2.new, old: n2.old, sys: n2.new, yl: n2.new }, rule, why, same: false, smiles: s2 });
    };
    const pos = keys.map(([p]) => Number(p));
    // move one non-first group to another position
    if (keys.length >= 2) {
      for (const [p, k] of keys) {
        if (Number(p) === Number(keys[0][0])) continue;
        for (let q = 0; q < 6; q++) {
          if (pos.includes(q)) continue;
          const g = { ...spec.groups }; delete g[p]; g[q] = k;
          const rel0 = relationWord(Number(keys[0][0]), Number(p)), rel1 = relationWord(Number(keys[0][0]), q);
          push(g, 'position', keys.length === 2 ? `That name puts the groups ${rel1}; in this molecule they are ${rel0} (ortho = next to each other, 1,2; meta = one carbon between, 1,3; para = opposite, 1,4).` : `That name puts the ${GROUP_WORD[k]} group on a different ring carbon from the drawing: re-count round the ring from C1.`);
        }
      }
    }
    // swap one group for a similar one
    const SIM = { Cl: 'Br', Br: 'Cl', OH: 'NH2', NH2: 'OH', CH3: 'Et', Et: 'CH3', NO2: 'CN', CN: 'NO2', F: 'Cl', I: 'Br', CHO: 'COOH', COOH: 'CHO', OMe: 'OH', iPr: 'Et' };
    for (const [p, k] of keys) { const g = { ...spec.groups, [p]: SIM[k] || 'Cl' }; push(g, 'branch', `The drawing has ${GROUP_WORD[k]} here, not ${GROUP_WORD[SIM[k] || 'Cl']}: read each group off the drawing.`); }
    if (wrongs.length >= 3) return { smiles, spec, names: nm, wrongs, A };
  }
  return null;
}
const relationWord = (p, q) => { const d = (((q - p) % 6) + 6) % 6; return d === 1 || d === 5 ? 'ortho' : d === 2 || d === 4 ? 'meta' : 'para'; };

function areneWalk(spec, nm, A) {
  const n = A.subs.length;
  const parent = A.subs.filter((s) => ARENE_SUB[s.key].parent).sort((a, b) => ARENE_SUB[b.key].prio - ARENE_SUB[a.key].prio)[0];
  const me = A.subs.filter((s) => s.key === 'CH3');
  const out = [];
  if (n === 1) out.push(`<b>1 Parent.</b> One group on a benzene ring. ${ARENE_SUB[A.subs[0].key].parent || A.subs[0].key === 'CH3' ? `${GROUP_WORD[A.subs[0].key]} on benzene has its own name: <b>${nm.new}</b>.` : `Name the group and add -benzene: <b>${nm.new}</b>${nm.new !== nm.old ? ` (traditional: ${nm.old})` : ''}.`}`);
  else {
    out.push(`<b>1 Parent.</b> ${parent ? `The ${GROUP_WORD[parent.key]} group makes the special parent <b>${ARENE_SUB[parent.key].parent}</b>, and its carbon is C1.` : me.length === 1 && n >= 3 ? 'One CH₃ on a ring with three or more groups: the parent is toluene and its carbon is C1.' : 'No group makes a special parent, so the parent is <b>benzene</b>.'}`);
    out.push(n === 2 ? '<b>2 Position.</b> Two groups are ortho (1,2), meta (1,3) or para (1,4). The traditional style writes o-, m- or p-; the current style uses the numbers.' : '<b>2 Number</b> the ring for the lowest set of locants (the special parent group is C1); if that ties, the group first in the alphabet gets the lower number.');
    out.push('<b>3 Branches</b> in alphabetical order (ignoring di-, tri-), then the parent.');
  }
  out.push(`<b>Name:</b> ${nameTag({ new: nm.new, old: nm.old })}.`);
  return '<br>' + out.join('<br>');
}

// ---- benzyl against phenyl (hand-written, OPSIN-checked in the tests)
export const BENZYL = [
  { smiles: 'ClCc1ccccc1', names: { new: '(chloromethyl)benzene', old: 'benzyl chloride' }, accept: ['(chloromethyl)benzene', 'benzyl chloride', 'chloromethylbenzene'],
    why: 'Benzyl is C₆H₅CH₂–: the ring plus one CH₂. The Cl is on that CH₂, not on the ring.',
    wrong: [{ smiles: 'Cc1ccccc1Cl', name: '2-chlorotoluene', old: 'o-chlorotoluene', why: 'In 2-chlorotoluene the Cl is on the RING next to the CH₃. In this molecule the Cl is on the CH₂ carbon, not on the ring.', same: false },
      { smiles: 'Clc1ccccc1', name: 'chlorobenzene', why: 'Chlorobenzene has the Cl straight on the ring. Here a CH₂ sits between the ring and the Cl.', same: false },
      { smiles: 'ClC(Cl)c1ccccc1', name: '(dichloromethyl)benzene', why: 'There is only one Cl on the CH₂ carbon, so the prefix is chloro, not dichloro.', same: false }] },
  { smiles: 'BrCc1ccccc1', names: { new: '(bromomethyl)benzene', old: 'benzyl bromide' }, accept: ['(bromomethyl)benzene', 'benzyl bromide', 'bromomethylbenzene'],
    why: 'Benzyl is C₆H₅CH₂– (ring plus a CH₂); phenyl is the ring alone, C₆H₅–.',
    wrong: [{ smiles: 'Brc1ccccc1', name: 'bromobenzene', why: 'Bromobenzene has the Br straight on the ring. This molecule has a CH₂ between ring and Br.', same: false },
      { smiles: 'Cc1ccc(Br)cc1', name: '4-bromotoluene', old: 'p-bromotoluene', why: 'In 4-bromotoluene the Br is on the RING, para to the CH₃. Here the Br is on the CH₂ carbon.', same: false },
      { smiles: 'BrCC1CCCCC1', name: '(bromomethyl)cyclohexane', why: 'The ring here is a benzene ring (aromatic), so the parent is benzene, not cyclohexane.', same: false }] },
  { smiles: 'OCc1ccccc1', names: { new: 'phenylmethanol', old: 'benzyl alcohol' }, accept: ['phenylmethanol', 'benzyl alcohol', 'benzylalcohol'],
    why: 'The OH is on the CH₂ carbon, so it is an alcohol (benzyl alcohol, phenylmethanol); put on the ring it would be a phenol.',
    wrong: [{ smiles: 'Oc1ccccc1', name: 'phenol', why: 'Phenol has the OH straight on the ring. This molecule has a CH₂ between the ring and the OH.', same: false },
      { smiles: 'Cc1ccccc1O', name: '2-methylphenol', old: 'o-cresol', why: 'In 2-methylphenol the OH is on the ring. Here the OH is on the CH₂ carbon, so the CH₂ is part of an alcohol.', same: false },
      { smiles: 'OCC1CCCCC1', name: 'cyclohexylmethanol', why: 'The ring is a benzene ring, which is called phenyl as a group, not cyclohexyl.', same: false }] },
  { smiles: 'c1ccc(cc1)Cc1ccccc1', names: { new: 'diphenylmethane', old: 'diphenylmethane' }, accept: ['diphenylmethane', 'benzylbenzene'],
    why: 'Each C₆H₅– joined straight on is phenyl, and there are two of them on one CH₂ (methane). Benzyl would need its own CH₂.',
    wrong: [{ smiles: 'c1ccc(cc1)-c1ccccc1', name: 'biphenyl', why: 'Biphenyl is two rings joined directly, with no CH₂ between them. Here a CH₂ separates the rings.', same: false },
      { smiles: 'c1ccc(cc1)CCCc1ccccc1', name: 'dibenzylmethane', why: 'Benzyl is C₆H₅CH₂–, so dibenzylmethane would have two extra CH₂ groups. Here the rings are joined straight to the CH₂ (phenyl).', same: false },
      { smiles: 'c1ccc(cc1)CCc1ccccc1', name: '1,2-diphenylethane', why: 'Ethane would mean two CH₂ groups between the rings. There is only one CH₂, so the parent is methane.', same: false }] }
];

/**
 * A typed name checked against the correctly ordered name in EVERY style (new, old, systematic-bracketed, yl-locant), each with its own alphabetical order.
 * Returns null when the namer cannot read the molecule, or when `answer` is not one of the molecule's own names (a step that shows one molecule and asks for
 * another's name, such as "name the mirror image", must not be graded here). Otherwise { ok, styles:[...], note } where note says which style was used.
 */
export function matchNameForms(smiles, raw, answer) {
  const infos = modeInfos(smiles);
  if (!infos) return null;
  const names = namesOf(infos);
  if (answer !== undefined && !matchStyles(names, answer).ok) return null;
  const m = matchStyles(names, raw);
  const groups = [...new Set(infos.new.subs.map((s) => s.id).filter((id) => COMPLEX_IDS.includes(id)))];
  return { ok: m.ok, styles: m.styles, names, note: m.ok ? styleNote(m.styles, groups) : '' };
}

// ============================================================================================================
// Diagnosing a typed name
// ============================================================================================================
const ROOT_RE = /(cyclo)?(undec|dodec|meth|eth|prop|but|pent|hex|hept|oct|non|dec)a?(?:\d[\d,]*)?(?:di)?(ane|ene|yne)$/;
const stripStereoText = (raw) => String(raw).trim().replace(/[−–‒—]/g, '-').replace(/^\s*(\([^)]*\)|cis|trans)\s*-?\s*/i, '');
const numsOf = (s) => (s.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const STEP_REMINDER = 'Work through the recipe in order: 1 parent (longest chain through any multiple bond, or the ring), 2 numbering (lowest numbers at the first point of difference), 3 name the branches, 4 alphabetical order, then the stereo label.';

function genericDiagnose(smiles, infos, raw) {
  const I = infos.new;
  const hasStereo = I.stereo.length > 0 || !!I.ct;
  const typedStereo = /^\s*(\([^)]*\)|cis\b|trans\b)/i.test(String(raw).trim());
  const core = stripStereoText(raw);
  const coreN = normName(core);
  const cores = MODES3.map((m) => normName(assemble(partsOf(infos[m]), m, { noStereo: true })));
  if (cores.includes(coreN)) {
    if (hasStereo && !typedStereo) return I.ct ? 'The skeleton is right, but this ring needs cis- or trans- in front: its two groups can be on the same face or on opposite faces.' : I.stereo.some((d) => d.what === 'ez') && I.stereo.some((d) => d.what === 'rs') ? 'The skeleton is right. Now add the stereo labels in front, with numbers: (E)/(Z) for the double bond and (R)/(S) for the stereocentre, such as (2E,4S).' : I.stereo.some((d) => d.what === 'ez') ? 'The skeleton is right, but each carbon of the C=C has two different groups, so the name must start with (E) or (Z).' : `The skeleton is right, but ${I.stereo.length > 1 ? 'every stereocentre' : 'the stereocentre'} needs ${I.stereo.length > 1 ? 'its' : 'an'} (R) or (S): ${I.stereo.length > 1 ? 'write them together in one bracket with the numbers, for example (2R,3S)' : 'put it in brackets at the front'}.`;
    if (hasStereo && typedStereo) return I.ct ? `The skeleton is right; check the ring label: cis = both groups on the same face, trans = opposite faces. This one is ${I.ct}.` : 'The skeleton is right; check the stereo label. Rank the groups (higher atomic number first) and look at the sides for E/Z, or point the lowest group away for R/S.';
    if (!hasStereo && typedStereo) return 'The skeleton is right, but this drawing does not fix a configuration (no wedge, no fixed C=C geometry, or a carbon with two identical groups), so it takes no label.';
  }
  // the engines of Lessons 05 and 07 explain pure hydrocarbons in detail
  const hydro = !I.G.halOf.some((h) => h.length);
  if (hydro && !hasStereo) {
    try {
      const d = I.type === 'ane' ? diagnoseTypedAlkane(smiles, raw) : diagnoseAlkeneTyped(smiles, raw);
      if (d) return d;
    } catch (e) { /* fall through */ }
  }
  const m = ROOT_RE.exec(coreN);
  if (!m) return `A name ends with its parent and the ending: ${I.kind === 'ring' ? 'cyclohexane, cyclohexene ...' : 'pentane, pent-2-ene, pent-1-yne ...'}. Start from the parent, then put the branches in front of it.`;
  const gotRing = !!m[1], gotSize = STEM.indexOf(m[2]) + 1, gotType = m[3];
  const wantRing = I.kind === 'ring';
  if (gotRing !== wantRing) return wantRing ? `The parent here is the ring (${I.parent.size} carbons): a ring is the parent when it has at least as many carbons as the longest chain.` : 'The parent here is a chain, not a ring: the longest chain has more carbons than the ring, so the ring becomes a cycloalkyl group.';
  if (gotSize !== I.parent.size) return gotSize < I.parent.size ? `Your parent has ${gotSize} carbons but the longest ${wantRing ? 'ring' : `chain${I.mult.length ? ' that contains the multiple bond' : ''}`} has ${I.parent.size}. Count again, and look for a chain that bends through a branch.` : `Your parent has ${gotSize} carbons, but the parent has only ${I.parent.size}. Count the carbons of the parent only, not the branches.`;
  if (gotType !== I.type) return I.type === 'ane' ? 'This molecule is saturated, so the name ends in -ane.' : `This molecule has a ${bondWord(I.type)} bond, so the ending is -${I.type}.`;
  const have = numsOf(coreN);
  const exp = [numsOf(normName(assemble(partsOf(infos.new), 'new', { noStereo: true }))), numsOf(normName(assemble(partsOf(infos.old), 'old', { noStereo: true })))];
  if (!exp.some((e) => sameList(have, e))) {
    if (I.kind === 'chain') {
      const mp = mirrorParts(partsOf(I));
      if (sameList(have, numsOf(normName(assemble(mp, 'new', { noStereo: true }))))) return I.mult.length ? `Number from the other end: the ${bondWord(I.type)} bond must get the lowest number, and only then the branches.` : 'Number from the other end: the branches must get the lowest numbers (compare the sets at the first point of difference).';
    }
    return 'Check the numbers: the multiple bond (if any) gets the lowest number first, then all the branches together, then the alphabet breaks a tie.';
  }
  const counts = {}; I.subs.forEach((s) => { counts[s.id] = (counts[s.id] || 0) + 1; });
  if (Object.values(counts).some((c) => c > 1) && !/(di|tri|tetra|bis|tris)/.test(coreN.replace(/(di)(ene|yne)$/, '$2'))) return 'When the same branch occurs more than once, say how many: di-, tri-, tetra- (bis-, tris- before a bracket).';
  return 'The numbers look right, so check which group goes with which number, then the order of the prefixes: alphabetical, ignoring di-, tri-, sec- and tert- (but counting iso); one word, commas between numbers, hyphens around them.';
}
function diagnoseTypedAlkane(smiles, raw) { return diagnoseTyped(smiles, raw); }
function diagnoseAlkeneTyped(smiles, raw) { return diagnoseAlkene(smiles, raw); }

// ============================================================================================================
// Building a problem
// ============================================================================================================
const RULE_WEIGHT = {
  1: { numbering: 3, tiebreak: 3, alphabetical: 3, parent: 3, 'ring-parent': 5, branch: 2, position: 2, count: 2, multiplier: 2, type: 2 },
  2: { numbering: 2, tiebreak: 6, alphabetical: 6, parent: 3, 'ring-parent': 3, branch: 3, position: 2, count: 1, multiplier: 3, type: 1 },
  3: { numbering: 4, parent: 4, ez: 5, 'stereo-missing': 5, type: 2, position: 3, count: 1, branch: 1, tiebreak: 3, alphabetical: 2, multiplier: 1 },
  4: { 'stereo-missing': 6, rs: 6, ez: 5, ct: 6, numbering: 2, position: 1, branch: 1, count: 1, parent: 1, alphabetical: 1, tiebreak: 1, multiplier: 1, type: 1 }
};
function pickDistractors(rng, cands, level, n = 3) {
  const w = RULE_WEIGHT[level] || RULE_WEIGHT[1];
  const byRule = {};
  cands.forEach((c) => { (byRule[c.rule] ||= []).push(c); });
  const rules = Object.keys(byRule);
  const chosen = [];
  const pool = rules.slice();
  while (chosen.length < n && pool.length) {
    const total = pool.reduce((s, r) => s + (w[r] || 1), 0);
    let x = rng() * total, k = 0;
    for (; k < pool.length; k++) { x -= w[pool[k]] || 1; if (x <= 0) break; }
    const rule = pool.splice(Math.min(k, pool.length - 1), 1)[0];
    chosen.push(pick(rng, byRule[rule]));
  }
  // not enough kinds of mistake: top up with other names of the same kinds
  for (const c of shuffle(rng, cands)) { if (chosen.length >= n) break; if (!chosen.includes(c)) chosen.push(c); }
  return chosen;
}

const mode0 = () => { try { return store.getIupac() === 'old' ? 'old' : 'new'; } catch (e) { return 'new'; } };
const LEVEL_PROMPT = {
  1: 'Type the IUPAC name (either style is accepted; spaces and hyphens do not matter).',
  2: 'Type the IUPAC name (either style is accepted). Watch the order of the prefixes.',
  3: 'Type the IUPAC name (either style is accepted). Start with (E) or (Z) when the C=C needs it.',
  4: 'Type the IUPAC name with its stereo label where needed: (R)/(S) with its number, cis-/trans- on a ring, (E)/(Z).',
  5: 'Type the IUPAC name (either style is accepted).'
};

function hintsFor(infos, level) {
  const I = infos.new; const L = I.parent.size; const stem = STEM[L - 1];
  const hasStereo = I.stereo.length > 0 || !!I.ct;
  let h1;
  if (hasStereo) h1 = 'Name the skeleton first (parent, numbering, branches). Then add the stereo label in front: R or S for a carbon with four different groups, E or Z for a C=C with two different groups on each carbon, cis or trans for two groups on a ring.';
  else if (I.mult.length) h1 = 'Find the multiple bond first. The parent is the longest chain that CONTAINS it, even when a longer chain exists elsewhere; in a ring the C=C is C1=C2. Number from the end nearer the multiple bond.';
  else if (I.G.ring) h1 = 'Is the ring or a chain the parent? A ring is the parent when it has at least as many carbons as the longest chain on it. Number a ring so the locants are as low as possible.';
  else h1 = 'Find the parent: the longest continuous chain (bends are allowed). Number it from the end that gives the lowest numbers at the first point of difference; if that ties, the group first in the alphabet gets the lower number.';
  const list = joinAnd([...new Set(I.subs.map((s) => dispName(s.id)))]);
  let h2 = `The parent has ${cWord(L)} (${I.kind === 'ring' ? 'cyclo' : ''}${stem}${I.type === 'ane' ? 'ane' : I.mult.length > 1 && I.kind === 'chain' ? 'adi' + I.type : I.type}).${list ? ` The branches are ${list}.` : ''} List the prefixes alphabetically (ignoring di-, tri-, sec-, tert-; iso counts) with their numbers.`;
  if (hasStereo) h2 += ` Then the label: ${I.ct ? 'both groups on the same face is cis, opposite faces trans' : 'rank the groups with the CIP rules, highest atomic number first'}.`;
  return [h1, h2];
}

function baseProblem(level, smiles, infos, format, extra) {
  return { skill: 'naming-levels', level, format, smiles, highlight: [], names: namesOf(infos), visual: { widget: 'naming-levels-bar', config: { level } }, ...extra };
}

/** o = { mode: 'new'|'old' (the style of the expected answer), prompt, cands (wrong names already worked out) } (the custom generator passes these; the levels do not). */
export function typedProblem(rng, level, smiles, infos, tag, o = {}) {
  const cands = o.cands || wrongNames(smiles, infos);
  const names = namesOf(infos);
  const mode = o.mode || mode0();
  const answer = names[mode];
  const accept = [...new Set(Object.values(names))].filter((x) => x !== answer);
  const diag = [];
  cands.forEach((c) => MODES3.forEach((m) => { if (!diag.some((d) => normName(d.match) === normName(c.name[m]))) diag.push({ match: c.name[m], why: c.why }); }));
  const walk = walkthrough(infos);
  return baseProblem(level, smiles, infos, 'typed', {
    kind: 'input', name: true, tag, prompt: o.prompt || `Name this compound. ${LEVEL_PROMPT[level]}`,
    answer, accept, wrong: diag, wrongCands: cands,
    diagnoseFn: (raw) => genericDiagnose(smiles, infos, raw),
    fallback: 'That is not the name I get. ' + STEP_REMINDER,
    derive: toPlain(walk), deriveHtml: walk, hints: hintsFor(infos, level),
    features: featuresOf(infos, tag)
  });
}

export function optionsProblem(rng, level, smiles, infos, tag, o = {}) {
  const cands = o.cands || wrongNames(smiles, infos);
  if (cands.length < 3) return null;
  const chosen = o.pick ? o.pick(cands) : pickDistractors(rng, cands, level, 3);
  if (chosen.length < 3) return null;
  const mode = o.mode || mode0();
  const view = (pair) => (o.fixed ? esc(pair[mode]) : nameTag(pair));   // a fixed style is shown as written; otherwise the New / Old switch flips it
  const correctPair = { new: infos.new.name, old: infos.old.name };
  const opts = shuffle(rng, [
    { text: view(correctPair), correct: true, why: shortWhy(infos), name: correctPair, rule: null, same: null },
    ...chosen.map((c) => ({ text: view(c.name), why: c.why, name: { new: c.name.new, old: c.name.old }, rule: c.rule, same: c.same }))
  ]);
  const walk = walkthrough(infos);
  return baseProblem(level, smiles, infos, 'options', {
    kind: 'choice', tag, prompt: 'Which name is correct for this compound? Only one follows every rule.',
    options: opts, answer: correctPair[mode], derive: toPlain(walk), deriveHtml: walk, hints: hintsFor(infos, level),
    features: featuresOf(infos, tag)
  });
}

function featuresOf(infos, tag) {
  const I = infos.new; const f = [tag];
  if (I.feat.tie) f.push('tie'); if (I.feat.fpd) f.push('fpd'); if (I.feat.multi) f.push('multi'); if (I.feat.complex) f.push('complex'); if (I.feat.halo) f.push('halide'); if (I.feat.trap) f.push('trap');
  if (I.stereo.some((d) => d.what === 'ez')) f.push('ez'); if (I.stereo.some((d) => d.what === 'rs')) f.push('rs'); if (I.ct) f.push('ct');
  if (I.kind === 'ring') f.push('ring'); if (I.pendRing) f.push('ring-substituent');
  return f;
}

/** o = { spec, mode, fixed } as for typedProblem; spec = the benzene derivative to ask about (the custom generator picks it). */
export function areneProblems(rng, level, format, o = {}) {
  const d = areneProblemData(rng, o.spec);
  if (!d) return null;
  const walk = areneWalk(d.spec, d.names, d.A);
  const mode = o.mode || mode0();
  const view = (pair) => (o.fixed ? esc(pair[mode]) : nameTag(pair));
  const answer = d.names[mode];
  const common = {
    skill: 'naming-levels', level, smiles: d.smiles, highlight: [], names: { new: d.names.new, old: d.names.old, sys: d.names.new, yl: d.names.new }, tag: 'arene', features: ['arene', d.spec.kind],
    visual: { widget: 'naming-levels-bar', config: { level } }, derive: toPlain(walk), deriveHtml: walk,
    hints: ['Find the parent: a group such as OH, NH₂ or CH₃ can make a special parent (phenol, aniline, toluene) and is then C1; otherwise the parent is benzene. Then place the other groups.', d.spec.kind === 'di' ? 'Two groups: next to each other is ortho (1,2), one carbon between is meta (1,3), opposite is para (1,4). The traditional style writes o-, m-, p-; the current style writes the numbers.' : 'Number the ring for the lowest set of locants, then list the groups in alphabetical order (ignoring di-, tri-).']
  };
  if (format === 'typed') {
    const diag = []; d.wrongs.forEach((w) => { diag.push({ match: w.name.new, why: w.why }); diag.push({ match: w.name.old, why: w.why }); });
    return { ...common, format: 'typed', kind: 'input', name: true, prompt: 'Name this benzene derivative. Numbers or o-, m-, p- are both accepted, and so are the special parent names (toluene, phenol, aniline ...).',
      answer, accept: d.names.accept.filter((x) => x !== answer), wrong: diag, wrongCands: d.wrongs,
      diagnoseFn: () => 'Not the name I get. Decide the parent first (a special parent such as phenol or toluene, or benzene), then where the other groups sit (ortho, meta or para, or the lowest numbers), then list the groups alphabetically.',
      fallback: 'Not the name I get. Decide the parent first (a special parent such as phenol or toluene, or benzene), then where the other groups sit, then list the groups alphabetically.' };
  }
  const chosen = shuffle(rng, d.wrongs).slice(0, 3);
  const correctPair = { new: d.names.new, old: d.names.old };
  const opts = shuffle(rng, [{ text: view(correctPair), correct: true, why: 'Yes: right parent, right positions, groups in alphabetical order.', name: correctPair, rule: null, same: null },
    ...chosen.map((c) => ({ text: view(c.name), why: c.why, name: { new: c.name.new, old: c.name.old }, rule: c.rule, same: false }))]);
  return { ...common, format: 'options', kind: 'choice', prompt: 'Which name is correct for this benzene derivative?', options: opts, answer: correctPair[mode] };
}

function specialProblem(rng, level) {
  const e = pick(rng, BENZYL);
  const mode = mode0();
  const options = shuffle(rng, [{ text: nameTag({ new: e.names.new, old: e.names.old }), correct: true, why: `Yes. ${e.why}`, name: { new: e.names.new, old: e.names.old }, rule: null, same: null },
    ...e.wrong.map((w) => ({ text: nameTag({ new: w.name, old: w.old || w.name }), why: w.why, name: { new: w.name, old: w.old || w.name }, rule: 'benzyl-phenyl', same: !!w.same }))]);
  return {
    skill: 'naming-levels', level, format: 'options', kind: 'choice', smiles: e.smiles, highlight: [], tag: 'benzyl', features: ['benzyl'], names: { new: e.names.new, old: e.names.old, sys: e.names.new, yl: e.names.new },
    visual: { widget: 'naming-levels-bar', config: { level } },
    prompt: 'Phenyl is the ring alone, C₆H₅–; benzyl is the ring plus a CH₂, C₆H₅CH₂–. Which name is correct for this compound?',
    options, answer: e.names[mode], derive: `${e.why} Name: ${e.names.new}${e.names.new !== e.names.old ? ` (traditional: ${e.names.old})` : ''}.`,
    deriveHtml: `${esc(e.why)} <b>Name:</b> ${nameTag({ new: e.names.new, old: e.names.old })}.`, hints: ['Count what sits between the ring and the other atom: nothing (the ring is a phenyl group, or the other atom is on the ring) or one CH₂ (a benzyl group).', 'Benzyl = C₆H₅CH₂–. If the atom is bonded straight to a ring carbon it is on the ring: chlorobenzene, phenol. If it is on the CH₂, it is a side chain.'],
    acceptNames: e.accept
  };
}

/** A raw random structure of a level (no problem around it): used by the tests to compare this namer with the Lesson 05 / 07 engines. */
export function randomSmiles(rng, level) {
  for (let t = 0; t < 200; t++) {
    const kind = weighted(rng, LEVEL_KINDS[level]);
    const spec = level === 1 ? specL1(rng, kind) : level === 2 ? specL2(rng, kind) : level === 3 ? specL3(rng, kind) : specL4(rng, kind);
    if (spec && spec.smiles) return spec.smiles;
  }
  return null;
}
export const LEVEL_KINDS = {
  1: [['alk', 34], ['hal', 30], ['ring', 36]],
  2: [['alpha', 2], ['tie', 2], ['fpd', 1], ['complex', 2], ['multi', 1], ['ring', 2], ['halo', 2]],
  3: [['ene', 24], ['yne', 10], ['diene', 20], ['ring', 20], ['trap', 26]],
  4: [['rs1', 18], ['rs2', 14], ['ct', 18], ['both', 12], ['arene', 28], ['special', 10]]
};
/** One problem at a level. format: 'typed' | 'options' | undefined (random). */
export function makeLevelProblem(rng, level, format) {
  if (level === 5) return makeCurated(rng, format);
  const fmt = () => format || (rng() < 0.55 ? 'typed' : 'options');
  const kind = weighted(rng, LEVEL_KINDS[level]);
  for (let tries = 0; tries < 400; tries++) {
    let spec = null;
    const kd = tries < 250 ? kind : undefined;
    if (level === 1) spec = specL1(rng, kd);
    else if (level === 2) spec = specL2(rng, kd);
    else if (level === 3) spec = specL3(rng, kd);
    else spec = specL4(rng, kd);
    if (!spec) continue;
    if (spec.arene) {
      if (spec.arene === 'special') return specialProblem(rng, level);
      const p = areneProblems(rng, level, fmt());
      if (p) return p;
      continue;
    }
    if (!spec.smiles) continue;
    const infos = modeInfos(spec.smiles);
    if (!infos) continue;
    const I = infos.new;
    if (I.pending.some((x) => x.what === 'ez')) continue;                     // a C=C whose geometry the drawing does not fix is never asked
    if (level >= 4 && I.pending.length) continue;
    if (level === 4 && !(I.stereo.length || I.ct)) continue;
    if (spec.tag === 'rs1' && I.stereo.filter((d) => d.what === 'rs').length !== 1) continue;
    if (spec.tag === 'rs2' && I.stereo.filter((d) => d.what === 'rs').length !== 2) continue;
    if (spec.tag === 'ez-rs' && !(I.stereo.some((d) => d.what === 'ez') && I.stereo.some((d) => d.what === 'rs'))) continue;
    if (level === 4 && I.ct && I.G.ring && I.parent.size > 8) continue;
    if (spec.want === 'tie' && !I.feat.tie) continue;
    if (spec.want === 'fpd' && !I.feat.fpd) continue;
    if (spec.want === 'complex' && !I.feat.complex) continue;
    if (spec.want === 'multi' && !I.feat.multi) continue;
    if (spec.want === 'halo' && !I.feat.halo) continue;
    if (spec.want === 'trap' && !I.feat.trap) continue;
    if (level === 1 && (I.parent.size > 8 || I.G.carbons.length > 9)) continue;
    if (level === 3 && !I.mult.length) continue;
    if (level === 3 && I.G.carbons.length > 11) continue;
    if (infos.new.name.length > 60) continue;
    const f = fmt();
    let p = f === 'options' ? optionsProblem(rng, level, spec.smiles, infos, spec.tag) : null;
    if (!p) p = typedProblem(rng, level, spec.smiles, infos, spec.tag);
    return p;
  }
  throw new Error('naming-levels: no problem for level ' + level);
}

// ============================================================================================================
// Level 5: the tricky set. Hand-picked confusable cases (lessons 05, 07, 13, 15 and the past-paper items A1 / B1), each with the usual slip.
// Correct names come from the namer wherever it applies (the tests also check them against OPSIN); the tempting wrong names are written here.
//   wrong: [{name, old?, why, same}]  same = the wrong name still describes the SAME compound (a wrong name for it) rather than a different one.
//   cat    where the slip comes from; src = the lesson step or past-paper item it belongs to.
// ============================================================================================================
const BSL = String.fromCharCode(92);
export const CURATED = [
  { id: 't01', cat: 'parent', src: 'Lesson 5, past paper A1.1', smiles: 'CC(C)C(CC)CC',
    slip: 'Two different chains have five carbons; people take the first one they see instead of the one that leaves more branches.',
    wrong: [{ name: '3-(propan-2-yl)pentane', old: '3-isopropylpentane', why: 'This is the same compound, but it picks a five-carbon chain with ONE branch. Another five-carbon chain leaves two branches (methyl and ethyl), and when chains tie in length the one with more branches is the parent.', same: true }] },
  { id: 't02', improper: '2-ethylpentane', cat: 'parent', src: 'Lesson 5, past paper A1.1', smiles: 'CCC(C)CCC',
    slip: 'An ethyl group on carbon 2 (or a propyl on carbon 3) always means a longer chain was missed.',
    wrong: [{ name: '2-ethylpentane', why: 'The longest chain is six carbons, not five. A group on C2 of a chain can only be methyl: if you can write ethyl there, the chain should have been longer.', same: true }, { name: '3-ethylpentane', why: 'That is a different compound (an isomer): this molecule has a six-carbon chain with a methyl branch, not a five-carbon chain with an ethyl on C3.', same: false }] },
  { id: 't03', improper: '2-ethylbutane', cat: 'parent', src: 'Lesson 5', smiles: 'CCC(C)CC',
    slip: 'A carbon branch on C2 can only be methyl; 2-ethylbutane really is 3-methylpentane.',
    wrong: [{ name: '2-ethylbutane', why: 'The longest chain runs through the bend and has five carbons, so the parent is pentane with a methyl on C3.', same: true }, { name: '3-methylbutane', why: 'That names a five-carbon compound, a methylbutane. This drawing has six carbons: a pentane chain with a methyl on C3.', same: false }] },
  { id: 't04', cat: 'numbering', src: 'Lesson 5 (numbering)', smiles: 'CC(C)(C)CC(C)C',
    slip: 'People add up the locants, or number from the end nearer the single methyl, instead of comparing the sets at the first point of difference.',
    wrong: [{ name: '2,4,4-trimethylpentane', why: 'Both numberings give three locants; compare them at the first point of difference: {2,2,4} against {2,4,4}. The second number decides, and 2 is lower than 4.', same: true }] },
  { id: 't05', cat: 'numbering', src: 'Lesson 5 (numbering)', smiles: 'CC(C)CCC(C)(C)CC',
    slip: 'The sums are the same (12), so people think it is a tie. The rule is the first point of difference, not the total.',
    wrong: [{ name: '3,3,6-trimethylheptane', why: 'The sets are {2,5,5} and {3,3,6}: they have the same sum, but the rule compares them number by number, and the first number is lower (2 against 3).', same: true }, { name: '2,5,5-trimethylhexane', why: 'The longest chain has seven carbons, not six.', same: false }] },
  { id: 't06', cat: 'alphabetical', src: 'Lesson 5 (alphabetical order)', smiles: 'CCC(CC)(CC)C(C)C',
    slip: 'di-, tri- are not counted when alphabetizing: diethyl is filed under e, so it comes before methyl.',
    wrong: [{ name: '2-methyl-3,3-diethylpentane', why: 'The prefixes are listed by their numbers here. They must be in alphabetical order: ethyl (e) before methyl (m), because di- is ignored.', same: true }, { name: '3,3-diethyl-2-methylbutane', why: 'The parent chain has five carbons (it runs through the isopropyl end and an ethyl), not four.', same: false }] },
  { id: 't07', improper: '2-methyl-4-isopropylheptane', cat: 'alphabetical', src: 'Lesson 5 (new and old style)', smiles: 'CC(C)CC(C(C)C)CCC',
    slip: 'The same group is filed under different letters in the two IUPAC styles: isopropyl (i) in the traditional style, propan-2-yl (p) in the current one.',
    wrong: [{ name: '2-methyl-4-isopropylheptane', why: 'This mixes the styles. Traditional: isopropyl is filed under i, so 4-isopropyl-2-methylheptane. Current: propan-2-yl is filed under p, so 2-methyl-4-(propan-2-yl)heptane.', same: true }] },
  { id: 't08', cat: 'alphabetical', src: 'Lesson 5 (alphabetical order)', smiles: 'CC(C)(C)C1CCC(Cl)CC1', typed: true,
    slip: 'tert is ignored when alphabetizing, so tert-butyl is filed under b (before chloro); but written as (1,1-dimethylethyl) it is filed under d (after chloro).',
    wrong: [{ name: '1-chloro-4-tert-butylcyclohexane', why: 'tert is ignored, so tert-butyl is filed under b, which comes before chloro: 1-tert-butyl-4-chlorocyclohexane. (Written as 1,1-dimethylethyl the group is filed under d, and then chloro is first.)', same: true }] },
  { id: 't09', improper: 'cyclohexylmethane', cat: 'ring-chain', src: 'Lesson 5 (ring or chain?)', smiles: 'CC1CCCCC1',
    slip: 'The ring is the parent when it has at least as many carbons as the chain, so cyclohexylmethane is not how this is named.',
    wrong: [{ name: 'cyclohexylmethane', why: 'The ring has six carbons and the chain only one, so the ring is the parent and the CH₃ is a methyl branch: methylcyclohexane.', same: true }, { name: '1-methylcyclohexane', why: 'A single branch on a ring needs no number: the name is methylcyclohexane.', same: true }] },
  { id: 't10', cat: 'ring-chain', src: 'Lesson 5 (ring or chain?)', smiles: 'CCCCC1CC1',
    slip: 'Compare the number of carbons in the ring with the longest chain: here the chain (4) beats the ring (3), so in this course the chain is the parent.',
    wrong: [{ name: 'butylcyclopropane', why: 'In this course a ring is the parent only when it has at least as many carbons as the longest chain. The chain (4 carbons) is longer than the ring (3), so the chain is the parent and the ring is a cyclopropyl group.', same: true }] },
  { id: 't11', cat: 'ring-chain', src: 'Lesson 5, past paper A1.4', smiles: 'CCC1CCCC(C)C1',
    slip: 'When the numbers tie on a ring, the group first in the alphabet (ethyl) gets 1, not the one with the smaller size.',
    wrong: [{ name: '3-ethyl-1-methylcyclohexane', why: 'The locants tie ({1,3} either way), so the group first alphabetically gets the lower number: ethyl is e, methyl is m, so ethyl is C1.', same: true }] },
  { id: 't12', improper: '4-bromo-2-chloropentane', cat: 'numbering', src: 'Lesson 5, past paper A1.4', smiles: 'CC(Br)CC(Cl)C',
    slip: 'Halogens are numbered like any other group: {2,4} both ways, so the alphabet decides, and bromo comes before chloro.',
    wrong: [{ name: '4-bromo-2-chloropentane', why: 'The locants tie ({2,4} from both ends), so the group first in the alphabet gets the lower number: bromo (b) before chloro (c), so bromo is on C2.', same: true }] },
  { id: 't13', improper: '4-ethenylheptane', cat: 'alkene', src: 'Lesson 7, past paper A1.2', smiles: 'C=CC(CCC)CCC',
    slip: 'The parent of an alkene is the longest chain that CONTAINS the C=C, even when a longer chain exists elsewhere.',
    wrong: [{ name: '4-ethenylheptane', why: 'That uses the longest chain overall (heptane, 7 carbons), with the C=C as an ethenyl branch. The parent must contain the double bond, so it is the six-carbon hex-1-ene chain.', same: true }, { name: '3-propylhept-1-ene', why: 'There is no seven-carbon chain through the C=C: the longest chain that holds the double bond has six carbons.', same: false }] },
  { id: 't14', improper: '2-methylpent-3-yne', cat: 'alkene', src: 'Lesson 7', smiles: 'CC#CC(C)C',
    slip: 'The multiple bond gets the lowest number first; the branch only breaks a tie.',
    wrong: [{ name: '2-methylpent-3-yne', old: '2-methyl-3-pentyne', why: 'Number from the end nearer the triple bond: it is then C2, and the methyl lands on C4. Putting the methyl on 2 makes the triple bond 3, which is not the lowest.', same: true }] },
  { id: 't15', cat: 'alkene', src: 'Lesson 7 (E/Z), past paper A1.3', smiles: 'C/C(Cl)=C' + BSL + 'C',
    slip: 'E and Z come from the CIP ranking, not from how the carbon chain looks: Cl outranks CH₃, so the two CH₃ groups on the same side give E.',
    wrong: [{ name: '(Z)-2-chlorobut-2-ene', old: '(Z)-2-chloro-2-butene', why: 'The two CH₃ groups are on the same side, but Z is about the HIGHER-ranked groups: on C2 that is Cl (higher atomic number), on C3 it is CH₃. They are on opposite sides, so E.', same: false }, { name: '2-chlorobut-2-ene', old: '2-chloro-2-butene', why: 'Each carbon of this C=C has two different groups, so there are two geometries and the name must start with (E) or (Z).', same: false }] },
  { id: 't16', improper: '6-methylcyclohexene', cat: 'alkene', src: 'Lesson 7 (cycloalkenes)', smiles: 'CC1C=CCCC1',
    slip: 'In a cycloalkene the C=C is C1=C2 (no number needed); only then is the ring numbered for the substituent.',
    wrong: [{ name: '1-methylcyclohex-2-ene', why: 'The double bond has to be C1=C2 in a cycloalkene, so it is never written as "-2-ene" on a ring. Number from the C=C, then choose the direction that gives the methyl the lower number.', same: true }, { name: '6-methylcyclohexene', why: 'Same compound, but the numbering goes the wrong way round the ring: the methyl should get 3, not 6.', same: true }] },
  { id: 't17', cat: 'alkene', src: 'Lesson 7, past paper B1.1', smiles: 'C/C=C/C=C/C',
    slip: 'A diene has a label for each double bond, with its number: (2E,4E), not just (E).',
    wrong: [{ name: '(E)-hexa-2,4-diene', old: '(E)-2,4-hexadiene', why: 'There are two stereogenic double bonds, so each needs a label with its number in one bracket: (2E,4E).', same: false }, { name: '(2E,4Z)-hexa-2,4-diene', old: '(2E,4Z)-2,4-hexadiene', why: 'The C4=C5 bond has the CH₃ and the chain on opposite sides: E, not Z.', same: false }] },
  { id: 't18', cat: 'alkene', src: 'Lesson 7', smiles: 'C/C=C/C(C)C',
    slip: 'Number from the end nearer the double bond, even when the branch would get a lower number from the other end.',
    wrong: [{ name: '(E)-2-methylpent-3-ene', old: '(E)-2-methyl-3-pentene', why: 'Numbering from the isopropyl end gives the methyl 2 but the double bond 3. The double bond must get the lowest number first, so number from the other end: pent-2-ene with the methyl on C4.', same: true }] },
  { id: 't19', cat: 'stereo', src: 'Lesson 15, past paper A1.3', smiles: 'C[C@H](Br)CC', typed: true,
    slip: 'Naming the skeleton right and forgetting the (R) or (S) is the most common lost mark.',
    wrong: [{ name: '2-bromobutane', why: 'This carbon has four different groups, so the drawing shows one configuration and the name needs (R) or (S) in front.', same: false }, { name: '(R)-2-bromobutane', why: 'Rank the groups: Br > CH₂CH₃ > CH₃ > H. With H pointing away, 1 → 2 → 3 runs counterclockwise in this drawing, so S.', same: false }] },
  { id: 't20', cat: 'stereo', src: 'Lesson 16, past paper A1.3', smiles: 'C[C@H](Br)[C@H](Br)C',
    slip: 'Two centres need two labels in one bracket with their numbers, and the labels can differ even in a symmetrical molecule (this one is meso).',
    wrong: [{ name: '(2R,3R)-2,3-dibromobutane', why: 'The two centres have opposite configurations here (one R, one S): this is the meso compound, (2R,3S).', same: false }, { name: '(R)-2,3-dibromobutane', why: 'There are two stereocentres, so there are two labels with their numbers: (2R,3S).', same: false }] },
  { id: 't21', cat: 'stereo', src: 'Lesson 5 and 6, past paper A1.3', smiles: 'C[C@H]1CCC[C@@H](C)C1',
    slip: 'cis means both groups on the same face of the ring (both wedges or both dashes), whatever the numbers.',
    wrong: [{ name: 'trans-1,3-dimethylcyclohexane', why: 'The two methyl groups are on the same face of the ring (both on the wedge or both on the dash side), so the ring is cis.', same: false }, { name: '1,3-dimethylcyclohexane', why: 'The two groups can be on the same or on opposite faces, so the name must say cis or trans.', same: false }] },
  { id: 't22', cat: 'stereo', src: 'past paper A1.3', smiles: 'C/C=C/[C@@H](C)CC',
    slip: 'A name can need both kinds of label: E or Z for the C=C and R or S for the centre, each with its own number.',
    wrong: [{ name: '(E)-4-methylhex-2-ene', old: '(E)-4-methyl-2-hexene', why: 'The E label is right, but C4 is a stereocentre with four different groups, so the name also needs its R or S: (2E,4S).', same: false }, { name: '(2E,4R)-4-methylhex-2-ene', old: '(2E,4R)-4-methyl-2-hexene', why: 'The E is right. At C4 the groups rank CH=CH > CH₂CH₃ > CH₃ > H; with H away, 1 → 2 → 3 is counterclockwise, so S, not R.', same: false }] },
  { id: 't23', improper: '1-amino-4-chlorobenzene', cat: 'benzene', src: 'Lesson 13, past paper B1.1', smiles: 'Nc1ccc(Cl)cc1', arene: true,
    slip: 'NH₂ makes aniline the parent and its carbon is C1: it is 4-chloroaniline, not 1-amino-4-chlorobenzene.',
    wrong: [{ name: '1-amino-4-chlorobenzene', why: 'Same compound, but NH₂ makes aniline the parent. The parent is not benzene, and the carbon with the NH₂ is C1: 4-chloroaniline (traditional: p-chloroaniline).', same: true }, { name: '2-chloroaniline', old: 'o-chloroaniline', why: 'The Cl is directly across the ring from the NH₂: para (1,4), not ortho (1,2).', same: false }, { name: '3-chloroaniline', old: 'm-chloroaniline', why: 'The Cl is directly across the ring from the NH₂: para (1,4), not meta (1,3).', same: false }] },
  { id: 't24', cat: 'benzene', src: 'Lesson 13, past paper B1.1', smiles: 'Cc1cc(Cl)ccc1Cl', arene: true,
    slip: 'With three groups the parent toluene has its CH₃ on C1; the other numbers are then as low as possible, not "as low as the order they were written".',
    wrong: [{ name: '3,6-dichlorotoluene', why: 'Same compound, numbered the wrong way round the ring. From the CH₃ (C1) the Cl atoms are on 2,5 one way and 3,6 the other; the lower set is 2,5.', same: true }, { name: '2,4-dichlorotoluene', why: 'A different compound: the Cl atoms here are on C2 and C5 from the CH₃, not C2 and C4.', same: false }, { name: '3,4-dichlorotoluene', why: 'A different compound: the two Cl atoms are on opposite sides of the ring (para to each other), not next to each other.', same: false }] },
  { id: 't25', cat: 'benzene', src: 'Lesson 13 (benzyl and phenyl)', smiles: 'ClCc1ccccc1', fixed: 0,
    slip: 'Phenyl is the ring alone, C₆H₅–; benzyl is the ring plus a CH₂. A Cl on that CH₂ is not a chlorobenzene.' },
  { id: 't26', improper: '2-methylpentan-4-ol', cat: 'group', src: 'past paper B1.1', smiles: 'CC(C)CC(C)O', names: { new: '4-methylpentan-2-ol', old: '4-methyl-2-pentanol' }, accept: ['4-methylpentan-2-ol', '4-methyl-2-pentanol'],
    slip: 'The OH is the principal group: it becomes the ending (-ol) and gets the lowest number, even when the methyl would get a lower number from the other end.',
    wrong: [{ name: '2-methylpentan-4-ol', old: '2-methyl-4-pentanol', why: 'Number from the end nearer the OH: the principal group gets the lowest number (2), and the methyl then gets 4.', same: true }, { name: '2-hydroxy-4-methylpentane', why: 'An alcohol is not named with a hydroxy prefix: the OH makes the ending -ol (pentan-2-ol).', same: true }, { name: '4-methylpentan-3-ol', old: '4-methyl-3-pentanol', why: 'The OH is on the second carbon of the chain counting from the end nearest it, not the third.', same: false }] },
  { id: 't27', improper: 'butan-3-ol', cat: 'group', src: 'Lesson 15, past paper B1.1', smiles: 'OC(C)CC', names: { new: 'butan-2-ol', old: '2-butanol' }, accept: ['butan-2-ol', '2-butanol'],
    slip: 'The number of the OH belongs next to -ol (butan-2-ol), and the chain is numbered from the end nearer the OH.',
    wrong: [{ name: 'butan-3-ol', old: '3-butanol', why: 'Number from the end nearer the OH: it is on C2, not C3.', same: true }, { name: '1-methylpropan-1-ol', old: '1-methyl-1-propanol', why: 'The longest chain through the C–OH carbon has four carbons (butane), so the parent is butane, not propane.', same: true }, { name: 'butan-1-ol', old: '1-butanol', why: 'The OH is on the second carbon, not the end one.', same: false }] },
  { id: 't28', cat: 'alkene', src: 'Lesson 7, past paper B1.1', smiles: 'C/C=C/CC', typed: true,
    slip: 'A 1,2-disubstituted C=C needs E or Z too; trans can be written, but the E/Z label is the one this course asks for.',
    wrong: [{ name: 'pent-2-ene', old: '2-pentene', why: 'The C=C has two different groups on each carbon, so the name needs (E) or (Z): (E)-pent-2-ene.', same: false }, { name: '(Z)-pent-2-ene', old: '(Z)-2-pentene', why: 'The CH₃ and the ethyl group are on opposite sides, so the higher-ranked groups are opposite: E.', same: false }] }
];
export const CURATED_IDS = CURATED.map((e) => e.id);

let lastCurated = null;
/** Names for a curated entry: from the namer (hydrocarbons, halides, rings, stereo), the arene engine, or written by hand. */
export function curatedNames(e) {
  if (e.names) return { new: e.names.new, old: e.names.old, sys: e.names.new, yl: e.names.new, accept: e.accept || [e.names.new, e.names.old] };
  if (e.fixed != null) { const b = BENZYL[e.fixed]; return { new: b.names.new, old: b.names.old, sys: b.names.new, yl: b.names.new, accept: b.accept }; }
  if (e.arene) { const a = areneNames(e.smiles); return a ? { ...a, sys: a.new, yl: a.new } : null; }
  const n = nameAll(e.smiles);
  return n ? { ...n, accept: [...new Set(Object.values(n))] } : null;
}
export function makeCurated(rng, format, entryId) {
  const pool = entryId ? CURATED.filter((e) => e.id === entryId) : CURATED.filter((e) => e.id !== lastCurated);
  const e = pick(rng, pool);
  lastCurated = e.id;
  const nm = curatedNames(e);
  const infos = !e.names && !e.fixed && !e.arene ? modeInfos(e.smiles) : null;
  const fmt = format || (e.typed ? 'typed' : 'options');
  const mode = mode0();
  // distractors: hand-written first, then extra mistakes the namer can make, to reach three
  let wrongs = (e.wrong || (e.fixed != null ? BENZYL[e.fixed].wrong : [])).map((w) => ({ name: { new: w.name, old: w.old || w.name, sys: w.name, yl: w.name }, rule: 'tricky', why: w.why, same: !!w.same }));
  if (infos) {
    const auto = wrongNames(e.smiles, infos).filter((c) => !wrongs.some((w) => MODES3.some((m) => normName(w.name[m]) === normName(c.name[m]))));
    for (const c of shuffle(rng, auto)) { if (wrongs.length >= 6) break; wrongs.push({ ...c, rule: c.rule }); }
  }
  const walk = infos ? walkthrough(infos) : e.arene ? areneWalk(null, nm, arene(e.smiles)) : e.fixed != null ? esc(BENZYL[e.fixed].why) + ` <b>Name:</b> ${nameTag({ new: nm.new, old: nm.old })}.` : `<b>Name:</b> ${nameTag({ new: nm.new, old: nm.old })}.`;
  const deriveHtml = `${walk}<br><b>Why people slip:</b> ${esc(e.slip)}`;
  const common = {
    skill: 'naming-levels', level: 5, smiles: e.smiles, highlight: [], tag: 'tricky', entry: e.id, cat: e.cat, slip: e.slip, src: e.src,
    names: { new: nm.new, old: nm.old, sys: nm.sys || nm.new, yl: nm.yl || nm.sys || nm.new }, features: ['tricky', e.cat], visual: { widget: 'naming-levels-bar', config: { level: 5 } },
    derive: toPlain(deriveHtml), deriveHtml,
    hints: [`This one is in the tricky set because of a common slip (${e.cat === 'parent' ? 'choosing the parent' : e.cat === 'numbering' ? 'numbering' : e.cat === 'alphabetical' ? 'alphabetical order' : e.cat === 'ring-chain' ? 'ring or chain' : e.cat === 'alkene' ? 'the multiple bond or E/Z' : e.cat === 'stereo' ? 'a stereo label' : e.cat === 'benzene' ? 'the benzene parent' : 'the principal group'}). Take the recipe slowly: parent, numbering, branches, alphabetical order, stereo.`,
      `The slip: ${e.slip}`]
  };
  // past paper B1 style: a student's improper name is given and the learner corrects it (that name is then not offered as an answer again)
  const useImproper = !!e.improper && rng() < 0.5;
  const gloss = useImproper ? `A student wrote “${e.improper}” for this compound, and it is not the correct name. ` : '';
  if (useImproper) wrongs = wrongs.filter((w) => !MODES3.some((m) => normName(w.name[m]) === normName(e.improper)));
  const hasOpts = wrongs.length >= 3;
  if (fmt === 'options' && hasOpts) {
    const chosen = wrongs.slice(0, 3);
    const pairs = chosen.map((c) => ({ text: nameTag(c.name), why: c.why, name: { new: c.name.new, old: c.name.old }, rule: c.rule, same: c.same }));
    const correct = { text: nameTag({ new: nm.new, old: nm.old }), correct: true, why: `Yes. ${e.slip}`, name: { new: nm.new, old: nm.old }, rule: null, same: null };
    return { ...common, format: 'options', kind: 'choice', improper: useImproper ? e.improper : null, prompt: `${gloss}Which name is correct for this compound?${useImproper ? '' : ' One of the wrong ones is the slip people usually make.'}`, options: shuffle(rng, [correct, ...pairs]), answer: mode === 'old' ? nm.old : nm.new };
  }
  const diag = []; wrongs.forEach((w) => MODES3.forEach((m) => { if (!diag.some((d) => normName(d.match) === normName(w.name[m]))) diag.push({ match: w.name[m], why: w.why }); }));
  const answer = mode === 'old' ? nm.old : nm.new;
  const acc = [...new Set([nm.new, nm.old, nm.sys, ...(nm.accept || [])])].filter((x) => normName(x) !== normName(answer));
  return { ...common, format: 'typed', kind: 'input', name: true, improper: useImproper ? e.improper : null, prompt: `${gloss}${useImproper ? 'Write the correct name.' : 'Name this compound.'} ${LEVEL_PROMPT[5]}`, answer, accept: acc, wrong: diag, wrongCands: wrongs,
    diagnoseFn: infos ? (raw) => genericDiagnose(e.smiles, infos, raw) : () => 'Not the name I get. Check the parent, the numbering, the order of the prefixes and any label in front.',
    fallback: 'That is not the name I get. ' + STEP_REMINDER };
}

// ============================================================================================================
// The level bar (a widget mounted on every problem card; it lifts itself to the top of the practice page) and the generator entry point
// ============================================================================================================
const LEVEL_KEY = 'naming-level';
export function getLevel() { try { const v = Number(store.getUi(LEVEL_KEY)); return LEVELS.includes(v) ? v : 1; } catch (e) { return 1; } }
/** Choosing a level (the old API) switches the page to that built-in preset: any custom settings are dropped (engine/naming-custom.js reads `ui.naming`). */
export function setLevel(n) { try { store.setUi(LEVEL_KEY, LEVELS.includes(n) ? n : 1); store.setUi('naming', null); } catch (e) { /* storage blocked: the page still works */ } }

/** Markup of the level bar: five buttons plus the title and one line for the chosen level. Pure (tested without a DOM). */
export function levelBarHtml(level) {
  const btn = (n) => `<button type="button" class="nl-lv" data-level="${n}" aria-pressed="${n === level ? 'true' : 'false'}" aria-label="${esc(LEVEL_TITLES[n])}"><span class="nl-n">${n === 5 ? '★' : n}</span><span class="nl-t">${n === 5 ? 'Tricky' : 'Level ' + n}</span></button>`;
  return `<div class="nl-btns" role="group" aria-label="Choose a level">${LEVELS.map(btn).join('')}</div><p class="nl-sub"><b>${esc(LEVEL_TITLES[level])}</b> ${esc(LEVEL_BLURBS[level])}</p>`;
}

export const namingLevelsBar = {
  id: 'naming-levels-bar',
  mount(box, config) {
    const level = (config && config.level) || getLevel();
    const host = box.closest ? box.closest('.step') : null;
    if (!host) { box.className = 'nl-bar'; box.innerHTML = levelBarHtml(level); return; }
    box.remove();
    let bar = host.querySelector(':scope > .nl-bar');
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'nl-bar'; bar.setAttribute('data-level', String(level));
      bar.innerHTML = levelBarHtml(level);
      host.insertBefore(bar, host.firstChild);
      bar.addEventListener('click', (ev) => {
        const b = ev.target.closest && ev.target.closest('.nl-lv');
        if (!b) return;
        const n = Number(b.dataset.level);
        if (n === getLevel()) return;
        setLevel(n);
        // practise-naming-levels is routed by hash: tell the router to draw the page again with the new level
        window.dispatchEvent(new Event('hashchange'));
      });
    }
  }
};
if (!WIDGETS['naming-levels-bar']) WIDGETS['naming-levels-bar'] = namingLevelsBar;   // engine/naming-custom.js replaces it with the settings card

/** generate('naming-levels', count, {rng, level}) -> problems. The level comes from the argument or the remembered choice (store `ui.naming-level`). */
export function generateNamingLevels(count, { skill = null, rng = Math.random, level = null } = {}) {
  void skill;
  try { setDrawStyle('skeletal'); } catch (e) { /* no drawing in tests */ }
  const lv = LEVELS.includes(level) ? level : getLevel();
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeLevelProblem(rng, lv); tries++; } while (last && p.smiles === last && tries < 8);
    last = p.smiles;
    out.push(p);
  }
  return out;
}
