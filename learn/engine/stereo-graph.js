// A tiny molecule graph with SMILES-native tetrahedral chirality, used by the Lesson 10 reactions (engine/reactions-additions.js).
//
// Why it exists: addition reactions have stereochemistry (anti, syn, cis, trans). To build the product with the right
// 3D arrangement we edit a graph and write a SMILES whose @ / @@ marks follow from geometry, not from a lookup table.
//   parse(smiles)            -> graph {atoms:[{el, q, h, ar?, chi?:{nb:[tokens], tag:'@'|'@@'}}], bonds:[{a,b,o}]}
//                               a token is a neighbour atom index or 'H' (an implicit hydrogen); chi.nb lists them in the order of the
//                               SMILES text, and tag is the mark that text gave (SMILES rule: looking from nb[0], nb[1..] run counter-clockwise for '@').
//   write(graph)             -> {smiles, order} (order[k] = graph index of the k-th atom of the string, so atom numbers can be mapped)
//   mirror(smiles)           -> the mirror image (every @ swapped with @@)
// Pure functions, no RDKit and no DOM (RDKit is used by the callers for coordinates and for canonical SMILES).

const NORMAL_V = { B: 3, C: 4, N: 3, O: 2, P: 3, S: 2, F: 1, Cl: 1, Br: 1, I: 1 };
const ORGANIC = new Set(Object.keys(NORMAL_V));
const AROM = { c: 'C', n: 'N', o: 'O', s: 'S' };

export const clone = (g) => JSON.parse(JSON.stringify(g));
const isRC = (t) => typeof t === 'object' && t !== null;

/** Parse a SMILES string (organic subset, bracket atoms, branches, rings, @/@@, aromatic atoms c n o s; / and \ are read as plain single bonds). */
export function parse(smiles) {
  const atoms = [], bonds = [], nbl = [];
  const stack = [], rings = {};
  let prev = -1, bo = 1, i = 0;
  const addAtom = (a) => {
    const idx = atoms.length;
    atoms.push(a); nbl.push([]);
    if (prev >= 0) {
      const ar = atoms[prev].ar && a.ar && bo === 1;
      bonds.push({ a: prev, b: idx, o: ar ? 1.5 : bo });
      nbl[prev].push(idx); nbl[idx].push(prev);
    }
    if (a.bracket && a.h > 0) nbl[idx].push('H');
    prev = idx; bo = 1;
  };
  while (i < smiles.length) {
    const ch = smiles[i];
    if (ch === '(') { stack.push(prev); i++; continue; }
    if (ch === ')') { prev = stack.pop(); bo = 1; i++; continue; }
    if (ch === '.') { prev = -1; bo = 1; i++; continue; }
    if (ch === '=') { bo = 2; i++; continue; }
    if (ch === '#') { bo = 3; i++; continue; }
    if (ch === '-' || ch === '/' || ch === '\\') { bo = 1; i++; continue; }
    if (ch === '*') { addAtom({ el: '*', q: 0, h: 0, bracket: false }); i++; continue; }
    if (ch === '[') {
      const m = /^\[(\d+)?([A-Z][a-z]?|[a-z]{1,2}|\*)(@@?)?(?:H(\d*))?([+-]+|[+-]\d+)?(?::\d+)?\]/.exec(smiles.slice(i));
      if (!m) throw new Error('bad bracket atom in ' + smiles);
      let el = m[2], ar = false;
      if (AROM[el]) { el = AROM[el]; ar = true; }
      const h = m[4] === undefined ? (/H/.test(m[0]) ? 1 : 0) : (m[4] === '' ? 1 : Number(m[4]));
      let q = 0;
      if (m[5]) q = /^[+-]\d+$/.test(m[5]) ? Number(m[5]) : (m[5][0] === '+' ? 1 : -1) * m[5].length;
      const a = { el, q, h, bracket: true, ar };
      addAtom(a);
      if (m[3]) atoms[atoms.length - 1].chiTag = m[3];
      i += m[0].length; continue;
    }
    if (/[0-9%]/.test(ch)) {
      let d = ch;
      if (ch === '%') { d = smiles.slice(i + 1, i + 3); i += 2; }
      i++;
      if (rings[d]) {
        const r = rings[d]; delete rings[d];
        const arb = atoms[r.atom].ar && atoms[prev].ar && !r.o && bo === 1;
        bonds.push({ a: r.atom, b: prev, o: arb ? 1.5 : (r.o || bo) });
        const k = nbl[r.atom].indexOf(r.tok);
        nbl[r.atom][k] = prev; nbl[prev].push(r.atom);
      } else {
        const tok = { rc: d };
        rings[d] = { atom: prev, o: bo > 1 ? bo : 0, tok };
        nbl[prev].push(tok);
      }
      bo = 1; continue;
    }
    const m2 = /^(Cl|Br|[BCNOPSFIcnos])/.exec(smiles.slice(i));
    if (!m2) throw new Error(`cannot read "${smiles.slice(i, i + 6)}" in ${smiles}`);
    let el = m2[1], ar = false;
    if (AROM[el]) { el = AROM[el]; ar = true; }
    addAtom({ el, q: 0, h: 0, bracket: false, ar });
    i += m2[0].length;
  }
  // implicit hydrogens of organic-subset atoms
  atoms.forEach((a, k) => {
    if (a.bracket) return;
    const s = bonds.filter((b) => b.a === k || b.b === k).reduce((t, b) => t + b.o, 0);
    a.h = Math.max(0, Math.round((NORMAL_V[a.el] ?? 0) - s));
  });
  atoms.forEach((a, k) => {
    if (a.chiTag) a.chi = { nb: nbl[k].slice(), tag: a.chiTag };
    delete a.chiTag;
  });
  return { atoms, bonds };
}

export const neighbours = (g, k) => g.bonds.filter((b) => b.a === k || b.b === k).map((b) => (b.a === k ? b.b : b.a));
export const bondOf = (g, i, j) => g.bonds.find((b) => (b.a === i && b.b === j) || (b.a === j && b.b === i));

function parityOdd(from, to) {
  // is the permutation that turns list `from` into list `to` odd? (tokens: numbers or 'H'; equal tokens are matched in order)
  const used = new Array(to.length).fill(false);
  const perm = from.map((t) => { const j = to.findIndex((u, k) => !used[k] && u === t); if (j < 0) throw new Error('chirality neighbours differ: ' + JSON.stringify([from, to])); used[j] = true; return j; });
  let inv = 0;
  for (let a = 0; a < perm.length; a++) for (let b = a + 1; b < perm.length; b++) if (perm[a] > perm[b]) inv++;
  return inv % 2 === 1;
}

const chargeText = (q) => (q === 0 ? '' : (q > 0 ? '+' : '-') + (Math.abs(q) > 1 ? Math.abs(q) : ''));

/** Write the graph as a SMILES string; chirality marks are re-derived for the order in which the atoms are written. */
export function write(g, opts = {}) {
  const n = g.atoms.length;
  const adj = Array.from({ length: n }, () => []);
  g.bonds.forEach((b) => { adj[b.a].push({ to: b.b, o: b.o }); adj[b.b].push({ to: b.a, o: b.o }); });
  adj.forEach((l) => l.sort((p, q) => p.to - q.to));
  const seen = new Array(n).fill(false);
  const parent = new Array(n).fill(-1);
  const kids = Array.from({ length: n }, () => []);
  const closures = []; // {open, close, o, id}
  const edgeDone = new Set();
  const key = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  const roots = [];
  const dfs = (v) => {
    seen[v] = true;
    for (const { to, o } of adj[v]) {
      const k = key(v, to);
      if (edgeDone.has(k)) continue;
      edgeDone.add(k);
      if (!seen[to]) { parent[to] = v; kids[v].push({ to, o }); dfs(to); }
      else closures.push({ open: to, close: v, o });
    }
  };
  const startOrder = opts.start != null ? [opts.start, ...[...Array(n).keys()].filter((k) => k !== opts.start)] : [...Array(n).keys()];
  for (const s of startOrder) if (!seen[s]) { roots.push(s); dfs(s); }
  closures.forEach((c, k) => { c.id = k + 1; });
  const ringsAt = Array.from({ length: n }, () => []);
  closures.forEach((c) => { ringsAt[c.open].push({ id: c.id, partner: c.close, o: c.o, opener: true }); ringsAt[c.close].push({ id: c.id, partner: c.open, o: c.o, opener: false }); });
  ringsAt.forEach((l) => l.sort((p, q) => p.id - q.id));
  const order = [];
  const text = (v) => {
    const a = g.atoms[v];
    const hasKids = kids[v].length;
    let tag = '';
    if (a.chi) {
      const outNb = [];
      if (parent[v] >= 0) outNb.push(parent[v]);
      if (a.h > 0) outNb.push('H');
      ringsAt[v].forEach((r) => outNb.push(r.partner));
      kids[v].forEach((k) => outNb.push(k.to));
      if (outNb.length !== a.chi.nb.length) throw new Error('chirality neighbour count mismatch at atom ' + v);
      tag = parityOdd(a.chi.nb, outNb) ? (a.chi.tag === '@' ? '@@' : '@') : a.chi.tag;
    }
    void hasKids;
    const sym = a.ar ? a.el.toLowerCase() : a.el;
    const s = bondsSum(v);
    const dflt = a.ar ? null : Math.max(0, (NORMAL_V[a.el] ?? 0) - s);
    const plain = ORGANIC.has(a.el) && a.q === 0 && !tag && (a.ar ? true : a.h === dflt) && !a.radical;
    if (a.el === '*') return '*';
    if (plain) return sym;
    return '[' + sym + tag + (a.h ? 'H' + (a.h > 1 ? a.h : '') : '') + chargeText(a.q) + ']';
  };
  const bondsSum = (v) => g.bonds.filter((b) => b.a === v || b.b === v).reduce((t, b) => t + b.o, 0);
  const bsym = (o) => (o === 2 ? '=' : o === 3 ? '#' : '');
  const emit = (v) => {
    order.push(v);
    let s = text(v);
    ringsAt[v].forEach((r) => { s += (r.opener ? bsym(r.o) : '') + (r.id > 9 ? '%' + r.id : r.id); });
    const ks = kids[v];
    ks.forEach((k, idx) => {
      const sub = bsym(k.o) + emit(k.to);
      s += idx < ks.length - 1 ? '(' + sub + ')' : sub;
    });
    return s;
  };
  const parts = roots.map((r) => emit(r));
  return { smiles: parts.join('.'), order };
}

/** Mirror image: every tetrahedral mark swapped (a racemate drawn as one enantiomer is "the same compound" as this). */
export function mirror(smiles) {
  return smiles.replace(/@@?/g, (m) => (m === '@' ? '@@' : '@'));
}
