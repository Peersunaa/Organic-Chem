// Helpers for Lesson 04: H counts, molecular formulas (computed from RDKit atom data),
// typed-formula parsing/grading, and a small condensed-formula -> SMILES parser.
import { analyze, canon } from './chem.js';

/** Number of H on a heavy atom (implicit H from RDKit). */
export function hCount(smiles, idx) { return analyze(smiles).atoms[idx].impH; }
/** Number of lines drawn into a carbon in a skeletal structure (double bond = 2): bond-order sum without the H. */
export function lineCount(smiles, idx) { const a = analyze(smiles).atoms[idx]; return a.bondSum - a.impH; }

/** Element counts from the structure, e.g. {C:4,H:8,O:1}. */
export function formulaCounts(smiles) {
  const info = analyze(smiles);
  const c = {};
  for (const a of info.atoms) { c[a.sym] = (c[a.sym] || 0) + 1; if (a.impH) c.H = (c.H || 0) + a.impH; }
  return c;
}
/** Hill order: C, H, then the rest alphabetically. Plain digits, e.g. C4H8O. */
export function hill(counts) {
  const rest = Object.keys(counts).filter((k) => k !== 'C' && k !== 'H').sort();
  const seq = (counts.C ? ['C'] : []).concat(counts.H ? ['H'] : []).concat(rest);
  return seq.map((k) => k + (counts[k] === 1 ? '' : counts[k])).join('');
}
export function formulaOf(smiles) { return hill(formulaCounts(smiles)); }

const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
/** Parse a typed formula (subscript or plain digits, any element order) into element counts, or null. */
export function parseFormula(raw) {
  const s = String(raw).replace(/[₀-₉]/g, (c) => SUB[c]).replace(/\s+/g, '');
  if (!s) return null;
  const counts = {};
  const re = /([A-Z][a-z]?)(\d*)/y;
  let pos = 0, m;
  while (pos < s.length) {
    re.lastIndex = pos;
    m = re.exec(s);
    if (!m) return null;
    const n = m[2] === '' ? 1 : parseInt(m[2], 10);
    if (n < 1) return null;
    counts[m[1]] = (counts[m[1]] || 0) + n;
    pos = re.lastIndex;
  }
  return counts;
}
export const sameCounts = (a, b) => { const ks = new Set([...Object.keys(a), ...Object.keys(b)]); return [...ks].every((k) => (a[k] || 0) === (b[k] || 0)); };

/** Grade a typed formula against the expected one by parsed element counts. */
export function gradeFormula(expected, raw) {
  const want = typeof expected === 'string' ? parseFormula(expected) : expected;
  const got = parseFormula(raw);
  if (!got) return { ok: false, malformed: true, diagnosis: 'Write the formula as element symbols with counts, for example C4H8O (subscripts are fine). Capital letter first, then a lowercase one only for Cl or Br.' };
  if (sameCounts(want, got)) return { ok: true };
  const bits = [];
  for (const k of new Set([...Object.keys(want), ...Object.keys(got)])) {
    const w = want[k] || 0, g = got[k] || 0;
    if (w !== g) bits.push(g === 0 ? `${k} is missing (the structure has ${w})` : w === 0 ? `there is no ${k} in this structure` : `you wrote ${g} ${k} but the structure has ${w}`);
  }
  const hOnly = Object.keys(want).concat(Object.keys(got)).every((k) => k === 'H' || (want[k] || 0) === (got[k] || 0));
  const tip = hOnly ? ' H is the usual slip: each carbon has 4 minus (lines into it) hydrogens, and O–H or N–H hydrogens are written in the drawing.' : ' Count one C at every corner and line end, then every other atom that is written.';
  return { ok: false, diagnosis: 'Not quite: ' + bits.join('; ') + '.' + tip };
}

// ---------------------------------------------------------------- condensed formulas
const VAL = { C: 4, N: 3, O: 2, S: 2, F: 1, Cl: 1, Br: 1, I: 1 };
/**
 * Parse a condensed formula such as CH3CH2CH(OH)CH3 or (CH3)2CHOH or CH3CH=CHCH2CH3 into SMILES.
 * Units are an element plus its H count (CH3, CH2, OH, NH2, Cl ...). "(...)" after a unit is a branch on that unit;
 * "(...)n" repeats it; "=" and "#" make double and triple bonds. Rings and abbreviations such as CHO or CO2H are rejected.
 */
export function condensedToSmiles(text) {
  const s = String(text).replace(/[₀-₉]/g, (c) => SUB[c]).replace(/\s+/g, '');
  const atoms = [];
  const bond = (a, b, order) => { atoms[a].nbrs.push({ to: b, order }); atoms[b].nbrs.push({ to: a, order }); };
  const st = { i: 0 };
  function seq() {
    let prev = null, first = null, order = 1, firstOrder = 1;
    const pend = [];
    while (st.i < s.length && s[st.i] !== ')') {
      const c = s[st.i];
      if (c === '=' || c === '#' || c === '≡') { order = c === '=' ? 2 : 3; st.i++; continue; }   // ≡ is how the page shows a triple bond
      if (c === '(') {
        const start = st.i + 1;
        let depth = 1, j = start;
        while (j < s.length && depth) { if (s[j] === '(') depth++; else if (s[j] === ')') depth--; j++; }
        if (depth) throw new Error('unbalanced parentheses in ' + text);
        const mm = /^\d+/.exec(s.slice(j));
        const mult = mm ? parseInt(mm[0], 10) : 1;
        for (let k = 0; k < mult; k++) {
          st.i = start;
          const sub = seq();
          if (prev !== null) bond(prev, sub.first, sub.firstOrder);
          else pend.push(sub);
        }
        st.i = j + (mm ? mm[0].length : 0);
        continue;
      }
      const m = /^(Cl|Br|C|N|O|S|F|I)(H(\d*))?/.exec(s.slice(st.i));
      if (!m) throw new Error('cannot read "' + s.slice(st.i) + '" in ' + text);
      st.i += m[0].length;
      const h = m[2] ? (m[3] === '' ? 1 : parseInt(m[3], 10)) : 0;
      atoms.push({ el: m[1], h, nbrs: [] });
      const me = atoms.length - 1;
      if (prev !== null) bond(prev, me, order); else firstOrder = order;
      pend.splice(0).forEach((sub) => bond(me, sub.first, sub.firstOrder));
      if (first === null) first = me;
      prev = me; order = 1;
    }
    if (first === null) throw new Error('empty group in ' + text);
    return { first, firstOrder };
  }
  const top = seq();
  if (st.i < s.length) throw new Error('unbalanced parentheses in ' + text);
  atoms.forEach((a, i) => {
    const v = a.h + a.nbrs.reduce((t, n) => t + n.order, 0);
    if (v !== VAL[a.el]) throw new Error(`atom ${i} (${a.el}) has valence ${v}, expected ${VAL[a.el]} in ${text}`);
  });
  const sym = (o) => (o === 2 ? '=' : o === 3 ? '#' : '');
  const write = (i, parent) => {
    const kids = atoms[i].nbrs.filter((n) => n.to !== parent);
    return atoms[i].el + kids.map((k, n) => { const body = sym(k.order) + write(k.to, i); return n < kids.length - 1 ? '(' + body + ')' : body; }).join('');
  };
  const edges = atoms.reduce((t, a) => t + a.nbrs.length, 0) / 2;
  if (edges !== atoms.length - 1) throw new Error('rings are not supported in ' + text);
  return write(top.first, -1);
}
export const condensedCanon = (text) => canon(condensedToSmiles(text));

// ---------------------------------------------------------------- acyclic molecule -> condensed formula (the inverse of condensedToSmiles)
// Convention (the dialect condensedToSmiles reads): every backbone atom is written as its element plus its H count (CH3, CH2, CH, C, OH, NH2, O, Cl ...);
// the BACKBONE is the longest chain of heavy atoms (ties: start on a carbon, keep a C=O / C#N out of the chain's end, then the shorter text);
// every other atom hangs in parentheses straight after the chain atom it is bonded to, with its bond symbol first: CH3C(=O)CH3, CH3CH(CH3)CH2OH, CH3CH2CH(OH)CH3;
// two or more identical branches are grouped, C(CH3)2; the chain keeps going after the parentheses. A terminal carbonyl is written CH=O (aldehyde) and a nitrile C#N,
// never the abbreviations CHO / CO2H, which condensedToSmiles rejects. Digits are plain ASCII (the display adds subscripts).
const MAXV = { C: 4, N: 3, O: 2, F: 1, Cl: 1, Br: 1, I: 1 };
/** The graph of an ACYCLIC, connected, uncharged molecule of C, N, O and halogens: { el, h, adj } (adj[i] = [{ to, order }]), or null for anything else (rings, charges, S/P, fragments). */
export function molGraph(smiles) {
  const info = analyze(smiles);
  if (!info || !info.atoms.length) return null;
  const n = info.atoms.length;
  if (info.bonds.length !== n - 1) return null;
  if (info.atoms.some((a) => !MAXV[a.sym] || a.fc !== 0)) return null;
  const adj = info.atoms.map(() => []);
  for (const b of info.bonds) {
    const o = b.bo ?? 1;
    if (![1, 2, 3].includes(o)) return null;
    adj[b.atoms[0]].push({ to: b.atoms[1], order: o }); adj[b.atoms[1]].push({ to: b.atoms[0], order: o });
  }
  const seen = new Set([0]), stack = [0];
  while (stack.length) { const x = stack.pop(); adj[x].forEach((e) => { if (!seen.has(e.to)) { seen.add(e.to); stack.push(e.to); } }); }
  if (seen.size !== n) return null;
  return { el: info.atoms.map((a) => a.sym), h: info.atoms.map((a) => a.impH), adj };
}
/** SMILES of a graph (bare symbols: RDKit fills in the hydrogens). */
export function graphSmiles(g) {
  const sym = (o) => (o === 2 ? '=' : o === 3 ? '#' : '');
  const write = (i, parent, order) => {
    const kids = g.adj[i].filter((e) => e.to !== parent);
    return sym(order) + g.el[i] + kids.map((k, n) => { const body = write(k.to, i, k.order); return n < kids.length - 1 ? '(' + body + ')' : body; }).join('');
  };
  return write(0, -1, 1);
}
/** The condensed formula of an acyclic molecule (see the convention above), or null when the molecule is outside the dialect. */
export function condensedOf(smiles) {
  const g = molGraph(smiles);
  if (!g) return null;
  const n = g.el.length;
  const unit = (i) => g.el[i] + (g.h[i] ? 'H' + (g.h[i] > 1 ? g.h[i] : '') : '');
  const sym = (o) => (o === 2 ? '=' : o === 3 ? '#' : '');
  const size = (i, parent) => 1 + g.adj[i].reduce((t, e) => t + (e.to === parent ? 0 : size(e.to, i)), 0);
  /** `(X)n` groups of equal branches, in the order shortest first. */
  const group = (items) => {
    const isC = (x) => /^[=#]?C(?!l)/.test(x.str);   // shortest first, a heteroatom branch before a carbon one: C(OH)(CH3)
    const sorted = items.slice().sort((a, b) => a.size - b.size || (isC(a) ? 1 : 0) - (isC(b) ? 1 : 0) || (a.str < b.str ? -1 : a.str > b.str ? 1 : 0));
    const out = [];
    for (let i = 0; i < sorted.length;) { let j = i; while (j < sorted.length && sorted[j].str === sorted[i].str) j++; out.push('(' + sorted[i].str + ')' + (j - i > 1 ? j - i : '')); i = j; }
    return out.join('');
  };
  const branch = (i, parent, order) => {
    const kids = g.adj[i].filter((e) => e.to !== parent).map((e) => ({ str: branch(e.to, i, e.order), size: size(e.to, i), order: e.order }));
    if (!kids.length) return sym(order) + unit(i);
    if (kids.every((k) => k.str === kids[0].str)) return sym(order) + unit(i) + group(kids);   // CH(CH3)2, C(CH3)3: nothing left to continue with
    const main = kids.slice().sort((a, b) => b.size - a.size || a.order - b.order || (a.str < b.str ? -1 : 1))[0];
    return sym(order) + unit(i) + group(kids.filter((k) => k !== main)) + main.str;
  };
  // every longest path, both directions
  const best = [];
  let bestLen = -1;
  for (let s = 0; s < n; s++) {
    const par = Array(n).fill(-2), dist = Array(n).fill(0), q = [s];
    par[s] = -1;
    for (let k = 0; k < q.length; k++) g.adj[q[k]].forEach((e) => { if (par[e.to] === -2) { par[e.to] = q[k]; dist[e.to] = dist[q[k]] + 1; q.push(e.to); } });
    for (let t = 0; t < n; t++) {
      if (t === s || dist[t] < bestLen) continue;
      if (dist[t] > bestLen) { bestLen = dist[t]; best.length = 0; }
      const path = []; for (let x = t; x !== -1; x = par[x]) path.push(x);
      best.push(path.reverse());
    }
  }
  const write = (path) => {
    let s = '';
    path.forEach((a, t) => {
      const on = new Set(path);
      const br = g.adj[a].filter((e) => !on.has(e.to)).map((e) => ({ str: branch(e.to, a, e.order), size: size(e.to, a) }));
      const ord = t ? g.adj[path[t - 1]].find((e) => e.to === a).order : 1;
      s += sym(ord) + unit(a) + group(br);
    });
    return s;
  };
  const ranked = best.map((path) => {
    const bondAt = (t) => g.adj[path[t]].find((e) => e.to === path[t + 1]).order;
    const str = write(path);
    // keys: start on a carbon, end on a carbon, begin on a saturated end (CH3C#CH, not CH#CCH3), keep a C=O / C#N out of the chain's end, then the shorter text
    return { str, key: [g.el[path[0]] === 'C' ? 0 : 1, g.el[path[path.length - 1]] === 'C' ? 0 : 1, bondAt(0) > 1 ? 1 : 0, bondAt(path.length - 2) > 1 ? 1 : 0] };
  }).sort((a, b) => { for (let i = 0; i < 4; i++) if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i]; return a.str.length - b.str.length || (a.str < b.str ? -1 : a.str > b.str ? 1 : 0); });
  return ranked[0].str;
}
/** Plain digits -> subscript digits, for display. */
export const subscriptDigits = (s) => String(s).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]).replace(/#/g, '≡');   // for display: a triple bond reads as ≡, never as the SMILES #
