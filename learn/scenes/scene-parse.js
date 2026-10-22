// Atom-mapped SMILES -> topology for the mechanism scenes. Pure JS, no RDKit, no DOM: the layout builder (build-layouts.mjs), the engine and the tests all use it.
//
//   parseSmiles('[CH2:1]=[C:2]([CH3:3])[CH3:4].[H:5][Br:6]')
//     -> { atoms: [{ id, oi, sym, charge, h, arom }], bonds: [{ a, b, order }], n }
//
// id  = the atom-map number when the atom carries one, otherwise a stable synthetic id (1000 + 10 * parent map + k for the k-th unmapped
//       heavy atom on a mapped neighbour; 100000 + 1000 * (base + dot-piece) + running index for unmapped atoms with no mapped neighbour:
//       `base` lets the k-th species of a reset line up with the k-th dot-piece of the state that follows it).
// oi  = the atom's index in the SMILES token order (the order RDKit numbers atoms in, so coordinates computed from the SMILES line up).
// h   = implicit hydrogens drawn as text (CH3, OH2). An UNMAPPED explicit [H] atom is folded into this count and is not an atom of its own:
//       it never moves, so it never needs an identity. A mapped [H:n] stays an atom (it moves, or a caption names it).
// bond order 1.5 = aromatic (lower-case atoms); kekulize() in the layout builder fixes those from RDKit before they are stored.

const VAL = { C: 4, N: 3, O: 2, B: 3, S: 2, P: 3, F: 1, Cl: 1, Br: 1, I: 1 };

export const stripMaps = (smi) => String(smi).replace(/:(\d+)\]/g, ']');

export function parseSmiles(smi, base = 0) {
  const raw = [], bonds = [];
  let prev = null, order = null, i = 0, comp = 0;
  const stack = [], ring = {};
  const add = (sym, map, charge, h, arom, bracket) => {
    const a = { oi: raw.length, sym, map, charge, h, arom, bracket, comp };
    raw.push(a);
    if (prev !== null) bonds.push({ a: prev, b: a.oi, order: order || (arom && raw[prev].arom ? 1.5 : 1) });
    order = null; prev = a.oi;
  };
  while (i < smi.length) {
    const c = smi[i];
    if (c === '[') {
      const j = smi.indexOf(']', i);
      const body = smi.slice(i + 1, j);
      const m = /^(\d*)([A-Z][a-z]?|[a-z]{1,2})(@{0,2})(?:H(\d*))?([+-]+\d*)?(?::(\d+))?$/.exec(body);
      if (!m) throw new Error('scene-parse: bad atom [' + body + '] in ' + smi);
      let ch = 0;
      if (m[5]) { const n = /\d+/.exec(m[5]); ch = (m[5][0] === '+' ? 1 : -1) * (n ? +n[0] : m[5].length); }
      const sym = m[2][0].toUpperCase() + m[2].slice(1);
      add(sym, m[6] ? +m[6] : 0, ch, m[4] === undefined ? 0 : m[4] === '' ? 1 : +m[4], m[2] === m[2].toLowerCase(), true);
      i = j + 1; continue;
    }
    const two = smi.substr(i, 2);
    if (two === 'Br' || two === 'Cl') { add(two, 0, 0, -1, false, false); i += 2; continue; }
    if ('BCNOPSFI'.includes(c)) { add(c, 0, 0, -1, false, false); i++; continue; }
    if ('cnops'.includes(c)) { add(c.toUpperCase(), 0, 0, -1, true, false); i++; continue; }
    if (c === '(') { stack.push(prev); i++; continue; }
    if (c === ')') { prev = stack.pop(); i++; continue; }
    if (c === '.') { prev = null; comp++; i++; continue; }
    if (c === '=') { order = 2; i++; continue; }
    if (c === '#') { order = 3; i++; continue; }
    if (c === '-') { order = 1; i++; continue; }
    if (c === '/' || c === '\\' || c === ':') { i++; continue; }
    if (/\d/.test(c) || c === '%') {
      let d = c;
      if (c === '%') { d = smi.substr(i + 1, 2); i += 2; }
      i++;
      if (ring[d] !== undefined) { const o = ring[d]; bonds.push({ a: o.idx, b: prev, order: order || o.order || (raw[o.idx].arom && raw[prev].arom ? 1.5 : 1) }); delete ring[d]; }
      else ring[d] = { idx: prev, order };
      order = null; continue;
    }
    throw new Error('scene-parse: unexpected "' + c + '" in ' + smi);
  }
  // implicit hydrogens of unbracketed atoms (valence rule); a bracket atom says its own count
  const deg = raw.map(() => 0);
  bonds.forEach((b) => { deg[b.a] += b.order; deg[b.b] += b.order; });
  raw.forEach((a, k) => { if (!a.bracket) a.h = Math.max(0, (VAL[a.sym] || 0) - Math.round(deg[k])); });
  // fold unmapped explicit H (a degree-1 [H] with no map) into its neighbour
  const folded = new Set();
  raw.forEach((a) => {
    if (a.sym !== 'H' || a.map) return;
    const mine = bonds.filter((b) => b.a === a.oi || b.b === a.oi);
    if (mine.length !== 1) return;
    const other = mine[0].a === a.oi ? mine[0].b : mine[0].a;
    raw[other].h++; folded.add(a.oi);
  });
  const keep = raw.filter((a) => !folded.has(a.oi));
  // ids
  const mapOf = (oi) => raw[oi].map;
  const running = {};
  const kids = {};
  keep.forEach((a) => {
    if (a.map) { a.id = a.map; return; }
    const nb = bonds.filter((b) => b.a === a.oi || b.b === a.oi).map((b) => (b.a === a.oi ? b.b : b.a)).filter((o) => mapOf(o));
    if (nb.length) { const p = mapOf(nb[0]); kids[p] = (kids[p] || 0); a.id = 1000 + p * 10 + kids[p]++; } else { running[a.comp] = running[a.comp] || 0; a.id = 100000 + 1000 * (base + a.comp) + running[a.comp]++; }
  });
  const idOf = new Map(keep.map((a) => [a.oi, a.id]));
  const outBonds = bonds.filter((b) => idOf.has(b.a) && idOf.has(b.b)).map((b) => ({ a: idOf.get(b.a), b: idOf.get(b.b), order: b.order }));
  return {
    n: raw.length,
    atoms: keep.map((a) => ({ id: a.id, oi: a.oi, sym: a.sym, charge: a.charge, h: a.h, arom: a.arom })),
    bonds: outBonds
  };
}

/** The dot-separated pieces of a SMILES, in order (a '.' never sits inside a bracket atom here). */
export const splitDots = (smi) => String(smi).split('.');

/** Lone pairs on an atom by the arrow-core rule: (valence electrons - formal charge - bonds) / 2. Metals and boron carry none; hydrogen none. */
const VE = { H: 1, C: 4, N: 5, O: 6, F: 7, Cl: 7, Br: 7, I: 7, S: 6, P: 5 };
export function lpOf(sym, charge, bondSum, h) {
  if (!(sym in VE) || sym === 'H') return 0;
  const v = (VE[sym] - charge - bondSum - h) / 2;
  return v > 0 ? Math.floor(v + 1e-6) : 0;
}

/** Sum of bond orders (+ implicit H) of atom id in a parsed state. */
export function bondSumOf(state, id) {
  let s = 0;
  state.bonds.forEach((b) => { if (b.a === id || b.b === id) s += b.order; });
  return s;
}
