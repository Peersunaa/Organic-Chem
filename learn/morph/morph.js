// Morph animations: a 1.6 s transformation of the starting material into the product, so the pattern of a reaction is easy to remember
// ("the triple becomes a double and a Br is attached"). Not a mechanism: no arrows, no intermediates.
//   loadMorphs()                       the data (morphs.json, made by tools/morph_coords.py), fetched once, cached
//   morphKey(substrate, reagentId)     "<canonical substrate>|<reagentId>" (hub cards: "hub:<cardId>" / "hub:<cardId>:2")
//   viewOf(entry, productSmiles?)      the substrate -> product view for one product of the entry (its `alt` list holds ortho/para and the like)
//   frameSvg(view, t, opts)            PURE: the SVG of the morph at t in [0, 1] (scrub it); opts.px = drawn width (keeps strokes and letters readable)
//   staticPair(view, opts)             reduced motion: substrate -> product side by side, changed bonds glowing, new atoms in teal
//   morph(host, view, {duration, autoplay, loop, reduced, onEnd})   mounts and plays with requestAnimationFrame; returns {play, seek, setDuration, destroy}
// Timeline: 0-0.15 the reagent chip appears; 0.12-0.7 new atoms slide in from the reagent side with the chip, changed bonds redraw their order (a line fades
// out of a double, a teal dashed ghost becomes a new bond, a coral one breaks), moved atoms travel on gentle curves, removed atoms fade away; 0.72-0.95 the
// product's wedges, charges and H labels fade in. House colours: --ink atoms and bonds, --accent forming and new atoms, --bad breaking, --electron the glow.
import { canon } from '../engine/chem.js';

let DATA = null;
/** The morph data, fetched once (null when it cannot load: callers then show the plain drawings). */
export function loadMorphs() {
  if (!DATA) {
    DATA = (async () => {
      try {
        const r = await fetch(new URL('./morphs.json', import.meta.url));
        return r.ok ? await r.json() : null;
      } catch (e) { return null; }
    })();
  }
  return DATA;
}
/** Tests (Node) hand the parsed JSON in directly. */
export function setMorphData(d) { DATA = Promise.resolve(d); }
export function morphKey(substrate, reagentId) {
  let c = substrate;
  try { c = canon(substrate) || substrate; } catch (e) { /* RDKit not ready: the raw SMILES */ }
  return c + '|' + reagentId;
}
/** One substrate -> product view of an entry: the entry's own product, or the `alt` whose product is `productSmiles`. null when the entry has no such product. */
export function viewOf(entry, productSmiles = null) {
  if (!entry) return null;
  const all = [entry, ...(entry.alt || [])];
  let pick = all[0];
  if (productSmiles) {
    pick = all.find((x) => x.prod.smiles === productSmiles);
    if (!pick) { let c = null; try { c = canon(productSmiles); } catch (e) { c = null; } pick = c ? all.find((x) => { try { return canon(x.prod.smiles) === c; } catch (e) { return false; } }) : null; }
    if (!pick) return null;
  }
  return { sub: entry.sub, prod: pick.prod, map: pick.map, changedBonds: pick.changedBonds, addedAtoms: pick.addedAtoms, removedAtoms: pick.removedAtoms, moved: pick.moved || [], chip: entry.chip, reagentLabel: entry.reagentLabel };
}
/** Every product an entry can morph to (the first is the main one). */
export const productsOf = (entry) => (entry ? [entry, ...(entry.alt || [])].map((x) => x.prod.smiles) : []);

// ---------------------------------------------------------------- helpers
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const f1 = (v) => String(Math.round(v * 10) / 10);
const op2 = (v) => String(Math.round(clamp(v) * 100) / 100);
/** smoothstep of t over [a, b] */
const win = (t, a, b) => { const u = clamp((t - a) / (b - a || 1)); return u * u * (3 - 2 * u); };
const C = { ink: 'var(--ink, #0c1d23)', accent: 'var(--accent, #0a727c)', bad: 'var(--bad, #b23a26)', glow: 'var(--electron, #cf7f00)', surface: 'var(--surface, #fff)', muted: 'var(--muted, #4f666d)' };
const T_CHIP = [0, 0.14], T_SLIDE = [0.12, 0.68], T_BOND = [0.18, 0.66], T_MOVE = [0.12, 0.72], T_GONE = [0.1, 0.45], T_FIN = [0.72, 0.95];

// ---------------------------------------------------------------- geometry, once per view
const PREP = new WeakMap();
function prepare(v) {
  if (PREP.has(v)) return PREP.get(v);
  const map = Object.fromEntries(Object.entries(v.map).map(([s, p]) => [Number(s), p]));
  const inv = Object.fromEntries(Object.entries(map).map(([s, p]) => [p, s]));
  const SA = new Map(v.sub.atoms.map((a) => [a.idx, a]));
  const PA = new Map(v.prod.atoms.map((a) => [a.idx, a]));
  const added = new Set(v.addedAtoms), removed = new Set(v.removedAtoms);
  const moved = new Set(v.moved.map(Number));
  // ids: product atoms 'p<idx>', removed substrate atoms 's<idx>'
  const atoms = [];
  v.prod.atoms.forEach((a) => {
    const s = inv[a.idx];
    atoms.push({ id: 'p' + a.idx, kind: added.has(a.idx) ? 'added' : 'mapped', from: s != null ? SA.get(Number(s)) : null, to: a, moved: s != null && moved.has(Number(s)) });
  });
  v.sub.atoms.forEach((a) => { if (removed.has(a.idx)) atoms.push({ id: 's' + a.idx, kind: 'removed', from: a, to: null }); });
  const byId = new Map(atoms.map((a) => [a.id, a]));
  const idOfSub = (i) => (map[i] != null ? 'p' + map[i] : 's' + i);
  // bonds: product bonds + substrate bonds that do not survive
  const bonds = new Map();
  const bk = (x, y) => (x < y ? x + '~' + y : y + '~' + x);
  v.sub.bonds.forEach((b) => {
    const x = idOfSub(b.a), y = idOfSub(b.b);
    bonds.set(bk(x, y), { a: x, b: y, o0: b.order, o1: 0, st0: b.stereo || null, st1: null, ar: !!b.ar });
  });
  v.prod.bonds.forEach((b) => {
    const x = 'p' + b.a, y = 'p' + b.b, k = bk(x, y);
    const e = bonds.get(k);
    if (e) { e.o1 = b.order; e.st1 = b.stereo || null; e.a = x; e.b = y; } else bonds.set(k, { a: x, b: y, o0: 0, o1: b.order, st0: null, st1: b.stereo || null, ar: !!b.ar });
  });
  const blist = [...bonds.values()];
  // neighbours at each end state (for labels and the reagent side)
  const nb = (which) => { const m = new Map(); blist.forEach((b) => { if ((which ? b.o1 : b.o0) > 0) { (m.get(b.a) || m.set(b.a, []).get(b.a)).push(b.b); (m.get(b.b) || m.set(b.b, []).get(b.b)).push(b.a); } }); return m; };
  const nb0 = nb(0), nb1 = nb(1);
  // where new atoms come from: each group of new atoms slides in rigidly along the direction it points away from the atom it lands on
  const finalOf = (a) => [a.to.x, a.to.y];
  const startOf = new Map();
  const groups = [];
  const seen = new Set();
  atoms.filter((a) => a.kind === 'added').forEach((a) => {
    if (seen.has(a.id)) return;
    const grp = []; const todo = [a.id]; seen.add(a.id);
    while (todo.length) { const x = todo.pop(); grp.push(x); (nb1.get(x) || []).forEach((y) => { if (byId.get(y).kind === 'added' && !seen.has(y)) { seen.add(y); todo.push(y); } }); }
    let anchor = null, root = null;
    grp.forEach((x) => (nb1.get(x) || []).forEach((y) => { if (!anchor && byId.get(y).kind === 'mapped') { anchor = y; root = x; } }));
    groups.push({ ids: grp, anchor, root });
  });
  const allPts = atoms.flatMap((a) => [a.from && [a.from.x, a.from.y], a.to && [a.to.x, a.to.y]].filter(Boolean));
  const cen = [allPts.reduce((s, p) => s + p[0], 0) / allPts.length, allPts.reduce((s, p) => s + p[1], 0) / allPts.length];
  const SLIDE = 46;
  groups.forEach((g) => {
    const r = finalOf(byId.get(g.root || g.ids[0]));
    const base = g.anchor ? finalOf(byId.get(g.anchor)) : cen;
    let d = [r[0] - base[0], r[1] - base[1]]; let L = Math.hypot(d[0], d[1]);
    if (L < 1e-3) { d = [r[0] - cen[0], r[1] - cen[1] - 1]; L = Math.hypot(d[0], d[1]) || 1; }
    g.off = [(d[0] / L) * SLIDE, (d[1] / L) * SLIDE];
    g.ids.forEach((x) => { const p = finalOf(byId.get(x)); startOf.set(x, [p[0] + g.off[0], p[1] + g.off[1]]); });
  });
  // the reagent chip: with the biggest new group, or (nothing drawn adds: H2, Lindlar) beside the first changed bond, outside the molecule
  let chipFrom, chipTo;
  const big = groups.slice().sort((x, y) => y.ids.length - x.ids.length)[0];
  if (big) {
    const pts = big.ids.map((x) => startOf.get(x));
    const c0 = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
    const L = Math.hypot(big.off[0], big.off[1]) || 1;
    chipFrom = [c0[0] + (big.off[0] / L) * 44, c0[1] + (big.off[1] / L) * 44];
    chipTo = [chipFrom[0] - big.off[0], chipFrom[1] - big.off[1]];
  } else {
    const cb = blist.find((b) => b.o0 !== b.o1 && byId.get(b.a).kind === 'mapped' && byId.get(b.b).kind === 'mapped') || blist[0];
    const pa = byId.get(cb.a), pb = byId.get(cb.b);
    const m = [((pa.to || pa.from).x + (pb.to || pb.from).x) / 2, ((pa.to || pa.from).y + (pb.to || pb.from).y) / 2];
    let d = [m[0] - cen[0], m[1] - cen[1]]; let L = Math.hypot(d[0], d[1]);
    if (L < 4) { d = [0, -1]; L = 1; }
    chipTo = [m[0] + (d[0] / L) * 26, m[1] + (d[1] / L) * 26];
    chipFrom = [chipTo[0] + (d[0] / L) * 40, chipTo[1] + (d[1] / L) * 40];
  }
  // the box that holds every state (the viewBox), padded for labels
  const xs = [], ys = [];
  atoms.forEach((a) => { [a.from, a.to].forEach((p) => { if (p) { xs.push(p.x); ys.push(p.y); } }); });
  const pad = 26;
  const box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad];
  const out = { atoms, byId, blist, nb0, nb1, startOf, chipFrom, chipTo, box, groups };
  PREP.set(v, out);
  return out;
}

// ---------------------------------------------------------------- drawing pieces
const bezier = (p0, c, p1, u) => [(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1]];
const easeIO = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
/** Screen position and opacity of an atom at t. */
function atomAt(P, a, t) {
  if (a.kind === 'mapped') {
    const p0 = [a.from.x, a.from.y], p1 = [a.to.x, a.to.y];
    if (!a.moved || (p0[0] === p1[0] && p0[1] === p1[1])) return { p: p1, op: 1 };
    const u = easeIO(win(t, ...T_MOVE));
    const d = [p1[0] - p0[0], p1[1] - p0[1]];
    const c = [(p0[0] + p1[0]) / 2 - d[1] * 0.22, (p0[1] + p1[1]) / 2 + d[0] * 0.22];
    return { p: bezier(p0, c, p1, u), op: 1 };
  }
  if (a.kind === 'added') {
    const s = P.startOf.get(a.id), e = [a.to.x, a.to.y];
    const u = easeIO(win(t, ...T_SLIDE));
    return { p: [lerp(s[0], e[0], u), lerp(s[1], e[1], u)], op: win(t, T_SLIDE[0], T_SLIDE[0] + 0.22) };
  }
  const u = win(t, ...T_GONE);
  return { p: [a.from.x, a.from.y - 14 * u], op: 1 - u };
}
const labelled = (a, deg) => a.sym !== 'C' || deg === 0;
const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n) => String(n).split('').map((d) => SUBS[+d]).join('');
/** The H count goes on the free side: right, else left (bonds pointing right), else under or over. */
function hSide(dirs) {
  const sep = (t) => (dirs.length ? Math.min(...dirs.map((d) => { const z = Math.abs(t - d) % (Math.PI * 2); return z > Math.PI ? Math.PI * 2 - z : z; })) : Math.PI);
  if (sep(0) >= 1.2) return 'r';
  if (sep(Math.PI) >= 1.2) return 'l';
  return sep(Math.PI / 2) > sep(-Math.PI / 2) ? 'd' : 'u';
}
function labelSvg(a, x, y, dirs, fs, col, op) {
  if (op <= 0.01) return '';
  const sym = a.sym, hh = a.h || 0;
  const hTxt = hh ? 'H' + (hh > 1 ? sub(hh) : '') : '';
  const side = hTxt ? hSide(dirs) : 'r';
  const base = y + fs * 0.35;
  let txt;
  if (!hTxt) txt = `<text x="${f1(x)}" y="${f1(base)}" text-anchor="middle">${sym}</text>`;
  else if (side === 'r') txt = `<text x="${f1(x - fs * 0.36)}" y="${f1(base)}" text-anchor="start">${sym}${hTxt}</text>`;
  else if (side === 'l') txt = `<text x="${f1(x + fs * 0.36)}" y="${f1(base)}" text-anchor="end">${hTxt}${sym}</text>`;
  else txt = `<text x="${f1(x)}" y="${f1(base)}" text-anchor="middle">${sym}</text><text x="${f1(x)}" y="${f1(base + (side === 'd' ? fs : -fs))}" text-anchor="middle">${hTxt}</text>`;
  const halo = `stroke="${C.surface}" stroke-width="${f1(fs * 0.28)}" stroke-linejoin="round" paint-order="stroke"`;
  let chg = '';
  if (a.c) {
    const q = a.c, r = fs * 0.36, cx = x + fs * 0.62, cy = y - fs * 0.6, cc = q > 0 ? C.bad : C.accent;
    chg = `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${C.surface}" stroke="${cc}" stroke-width="${f1(fs * 0.08)}"/><text x="${f1(cx)}" y="${f1(cy + r * 0.62)}" text-anchor="middle" font-size="${f1(fs * 0.62)}" fill="${cc}">${q > 0 ? '+' : '−'}</text>`;
  }
  return `<g opacity="${op2(op)}" fill="${col}" font-size="${f1(fs)}" font-weight="700" ${halo}>${txt}</g>${chg ? `<g opacity="${op2(op)}" font-weight="700">${chg}</g>` : ''}`;
}
function lineSeg(x1, y1, x2, y2, off, sw, col, op, dash = '') {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return `<line x1="${f1(x1 + nx * off)}" y1="${f1(y1 + ny * off)}" x2="${f1(x2 + nx * off)}" y2="${f1(y2 + ny * off)}" stroke="${col}" stroke-width="${f1(sw)}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-opacity="${op2(op)}"/>`;
}
/** Where the offset lines of a bond go: OFF[order] for side 0 (centred, a C=C with nothing on either side), else the main line on the axis and the second
 *  line on the side the neighbours are (inside a ring, towards the chain), the way skeletal drawings show it. */
function offsets(order, side, gap) {
  if (order <= 1) return [0];
  if (order === 2) return side ? [0, side * gap] : [-gap / 2, gap / 2];
  return side ? [0, side * gap, -side * gap] : [0, gap, -gap];
}
/** The lines of a bond whose order goes o0 -> o1 as w goes 0 -> 1: lines that stay slide into place, a line that goes fades, a new one fades in. */
function bondLines(x1, y1, x2, y2, o0, o1, w, sw, gap, col, op, side = 0) {
  const a = clamp(o0, 0, 3), b = clamp(o1, 0, 3), n = Math.max(a, b);
  const oa = offsets(Math.max(a, 1), side, gap), ob = offsets(Math.max(b, 1), side, gap);
  const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  let s = '';
  for (let i = 0; i < n; i++) {
    let off, vis;
    if (i < a && i < b) { off = lerp(oa[i], ob[i], w); vis = 1; } else if (i < b) { off = ob[i]; vis = w; } else { off = oa[i]; vis = 1 - w; }
    if (vis <= 0.01) continue;
    // a side line is drawn a little shorter than the bond (it sits inside the angle)
    const k = side && Math.abs(off) > 0.5 ? Math.min(L * 0.14, gap * 1.1) * Math.min(1, Math.abs(off) / gap) : 0;
    s += lineSeg(x1 + ux * k, y1 + uy * k, x2 - ux * k, y2 - uy * k, off, sw, col, vis * op);
  }
  return s;
}
function wedgeSvg(x1, y1, x2, y2, kind, sw, col, op) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, wd = sw * 2.6;
  if (kind === 'wedge') return `<polygon points="${f1(x1)},${f1(y1)} ${f1(x2 + nx * wd)},${f1(y2 + ny * wd)} ${f1(x2 - nx * wd)},${f1(y2 - ny * wd)}" fill="${col}" opacity="${op2(op)}"/>`;
  let s = '';
  for (let k = 1; k <= 6; k++) { const u = k / 6.4, cx = x1 + dx * u, cy = y1 + dy * u, hw = 0.6 + wd * u; s += `<line x1="${f1(cx + nx * hw)}" y1="${f1(cy + ny * hw)}" x2="${f1(cx - nx * hw)}" y2="${f1(cy - ny * hw)}" stroke="${col}" stroke-width="${f1(sw * 0.75)}" stroke-linecap="round"/>`; }
  return `<g opacity="${op2(op)}">${s}</g>`;
}
const shorten = (p1, p2, g1, g2) => {
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = Math.hypot(dx, dy) || 1;
  const a = Math.min(g1, L * 0.42), b = Math.min(g2, L * 0.42);
  return [p1[0] + (dx / L) * a, p1[1] + (dy / L) * a, p2[0] - (dx / L) * b, p2[1] - (dy / L) * b];
};
/** Stroke width, double-bond gap and letter size in user units so the drawing reads at its drawn width (px). */
function sizes(P, px) {
  const ppu = (px || 320) / P.box[2];
  const sw = Math.max(2.4, 1.3 / ppu);
  return { sw, gap: Math.max(6.4, sw * 2.6), fs: Math.min(30, Math.max(17, 8.5 / ppu)), ppu };
}

/**
 * frameSvg(view, t, {px, highlight, still}) -> the morph's SVG string at t (0 = the starting material, 1 = the product). Pure: same input, same string.
 * highlight: keep the glow on the changed bonds and the new atoms teal at t = 1 (the reduced-motion pair).
 */
export function frameSvg(v, t, opts = {}) {
  const P = prepare(v);
  t = clamp(t);
  const { sw, gap, fs, ppu } = sizes(P, opts.px);
  const hi = !!opts.highlight;
  const pos = new Map(), aop = new Map();
  P.atoms.forEach((a) => { const r = atomAt(P, a, t); pos.set(a.id, r.p); aop.set(a.id, r.op); });
  const parts = [];
  const wb = win(t, ...T_BOND), wf = win(t, ...T_FIN);
  // degree in the state that is showing (labels and where the H goes)
  const showNb = t < 0.5 ? P.nb0 : P.nb1;
  const isLab = (id) => { const a = P.byId.get(id); const at = t < 0.5 ? (a.from || a.to) : (a.to || a.from); return labelled(at, (showNb.get(id) || []).length); };
  const gapOf = (id) => (isLab(id) ? fs * 0.62 : 0);
  // glow under bonds that change, while they change
  P.blist.forEach((b) => {
    if (b.o0 === b.o1 || P.byId.get(b.a).kind !== 'mapped' || P.byId.get(b.b).kind !== 'mapped') return;
    const g = hi ? 1 : Math.min(win(t, T_BOND[0] - 0.08, T_BOND[0] + 0.06), 1 - win(t, T_BOND[1] + 0.04, T_BOND[1] + 0.22));
    if (g <= 0.01) return;
    const p1 = pos.get(b.a), p2 = pos.get(b.b);
    parts.push(`<line x1="${f1(p1[0])}" y1="${f1(p1[1])}" x2="${f1(p2[0])}" y2="${f1(p2[1])}" stroke="${C.glow}" stroke-width="${f1(sw * 4.2)}" stroke-linecap="round" stroke-opacity="${op2(0.32 * g)}"/>`);
  });
  // which side the second line of a double / triple bond goes: towards the neighbours (in the state where the bond is multiple)
  const sideOf = (b) => {
    const N = (b.o1 >= b.o0 ? P.nb1 : P.nb0);
    const p1 = pos.get(b.a), p2 = pos.get(b.b), dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = Math.hypot(dx, dy) || 1;
    let sum = 0, cnt = 0;
    [[b.a, b.b], [b.b, b.a]].forEach(([x, y]) => (N.get(x) || []).forEach((j) => { if (j === y) return; const q = pos.get(j); const c = (dx * (q[1] - p1[1]) - dy * (q[0] - p1[0])) / L; sum += Math.sign(c); cnt++; }));
    if (!cnt || Math.abs(sum) < 1) return 0;
    if (Math.max(b.o0, b.o1) === 3) return 0;
    return sum > 0 ? 1 : -1;
  };
  // bonds
  P.blist.forEach((b) => {
    const A = P.byId.get(b.a), B = P.byId.get(b.b);
    const p1 = pos.get(b.a), p2 = pos.get(b.b);
    const sd = sideOf(b);
    const op = Math.min(aop.get(b.a), aop.get(b.b));
    if (op <= 0.01) return;
    const [x1, y1, x2, y2] = shorten(p1, p2, gapOf(b.a), gapOf(b.b));
    const newAtom = A.kind === 'added' || B.kind === 'added';
    const col = newAtom && hi ? C.accent : C.ink;
    if (b.o0 === b.o1 || newAtom || A.kind === 'removed' || B.kind === 'removed') {
      const o = b.o0 || b.o1;
      const st0 = b.st0, st1 = b.st1;
      if (st1 && !st0) {   // a product wedge: a plain line that turns into the wedge at the end
        parts.push(bondLines(x1, y1, x2, y2, o, o, 1, sw, gap, col, op * (1 - wf), sd));   // b.a is the stereocentre (the data starts a wedge there)
        parts.push(wedgeSvg(x1, y1, x2, y2, st1, sw, col, op * wf));
      } else if (st0 && !st1) {
        parts.push(wedgeSvg(x1, y1, x2, y2, st0, sw, col, op * (1 - wf)));
        parts.push(bondLines(x1, y1, x2, y2, o, o, 1, sw, gap, col, op * wf, sd));
      } else if (st0) parts.push(wedgeSvg(x1, y1, x2, y2, st0, sw, col, op));
      else parts.push(bondLines(x1, y1, x2, y2, b.o0 || b.o1, b.o1 || b.o0, 1, sw, gap, col, op, sd));
      return;
    }
    // a bond between two mapped atoms that changes: order morph; a forming bond starts as a teal dashed ghost, a breaking one ends as a coral dashed ghost
    if (b.o0 === 0) {
      const ghost = 1 - wb;
      if (wb < 1 && t > T_BOND[0] - 0.1) parts.push(lineSeg(x1, y1, x2, y2, 0, sw * 1.1, C.accent, op * Math.min(1, (t - (T_BOND[0] - 0.1)) * 8) * ghost, `${f1(sw * 3)} ${f1(sw * 2)}`));
      parts.push(bondLines(x1, y1, x2, y2, b.o1, b.o1, 1, sw, gap, C.ink, op * wb, sd));
    } else if (b.o1 === 0) {
      parts.push(bondLines(x1, y1, x2, y2, b.o0, b.o0, 1, sw, gap, C.ink, op * (1 - win(t, T_BOND[0], (T_BOND[0] + T_BOND[1]) / 2)), sd));
      const gh = win(t, T_BOND[0], (T_BOND[0] + T_BOND[1]) / 2) * (1 - win(t, (T_BOND[0] + T_BOND[1]) / 2, T_BOND[1] + 0.08));
      if (gh > 0.01) parts.push(lineSeg(x1, y1, x2, y2, 0, sw * 1.1, C.bad, op * gh, `${f1(sw * 1.2)} ${f1(sw * 2.8)}`));
    } else {
      if (b.st1) {
        parts.push(bondLines(x1, y1, x2, y2, b.o0, b.o1, wb, sw, gap, C.ink, op * (1 - wf), sd));
        parts.push(wedgeSvg(x1, y1, x2, y2, b.st1, sw, C.ink, op * wf));
      } else parts.push(bondLines(x1, y1, x2, y2, b.o0, b.o1, wb, sw, gap, C.ink, op, sd));
    }
  });
  // atoms: labels (heteroatoms, and a carbon on its own), with the H count and charge of the state showing; they cross-fade when they change
  P.atoms.forEach((a) => {
    const id = a.id, p = pos.get(id), op = aop.get(id);
    if (op <= 0.01) return;
    const dirs0 = (P.nb0.get(id) || []).map((j) => pos.get(j)).filter(Boolean).map((q) => Math.atan2(q[1] - p[1], q[0] - p[0]));
    const dirs1 = (P.nb1.get(id) || []).map((j) => pos.get(j)).filter(Boolean).map((q) => Math.atan2(q[1] - p[1], q[0] - p[0]));
    const col = a.kind === 'added' && (hi || t < 1) ? (hi ? C.accent : mixAccent(t)) : C.ink;
    if (a.kind === 'mapped') {
      const s = a.from, e = a.to;
      const l0 = labelled(s, (P.nb0.get(id) || []).length), l1 = labelled(e, (P.nb1.get(id) || []).length);
      const same = l0 === l1 && s.sym === e.sym && (s.h || 0) === (e.h || 0) && (s.c || 0) === (e.c || 0);
      if (same) { if (l1) parts.push(labelSvg(e, p[0], p[1], t < 0.5 ? dirs0 : dirs1, fs, col, op)); return; }
      if (l0) parts.push(labelSvg(s, p[0], p[1], dirs0, fs, col, op * (1 - wf)));
      if (l1) parts.push(labelSvg(e, p[0], p[1], dirs1, fs, col, op * wf));
      return;
    }
    const at = a.to || a.from;
    const deg = ((a.to ? P.nb1 : P.nb0).get(id) || []).length;
    if (labelled(at, deg)) parts.push(labelSvg(at, p[0], p[1], a.to ? dirs1 : dirs0, fs, col, op));
  });
  // the reagent chip: appears, rides in with the new atoms, fades as they land
  if (!opts.still && opts.chip !== false && v.chip) {
    const show = win(t, ...T_CHIP) * (1 - win(t, T_SLIDE[1] - 0.12, T_SLIDE[1] + 0.06));
    if (show > 0.01) {
      const u = easeIO(win(t, ...T_SLIDE));
      const c = [lerp(P.chipFrom[0], P.chipTo[0], u), lerp(P.chipFrom[1], P.chipTo[1], u)];
      const txt = '+ ' + v.chip;
      const cfs = clamp(12.5 / ppu, 9, fs * 0.75), w = cfs * 0.56 * [...txt].length + cfs * 1.2, hgt = cfs * 1.7;
      const cx = clamp(c[0], P.box[0] + w / 2 + 2, P.box[0] + P.box[2] - w / 2 - 2), cy = clamp(c[1], P.box[1] + hgt / 2 + 2, P.box[1] + P.box[3] - hgt / 2 - 2);
      parts.push(`<g class="mo-chip" opacity="${op2(show)}"><rect x="${f1(cx - w / 2)}" y="${f1(cy - hgt / 2)}" width="${f1(w)}" height="${f1(hgt)}" rx="${f1(hgt / 2)}" fill="${C.surface}" stroke="${C.accent}" stroke-width="${f1(Math.max(1.5, sw * 0.6))}"/><text x="${f1(cx)}" y="${f1(cy + cfs * 0.36)}" text-anchor="middle" font-size="${f1(cfs)}" font-weight="600" fill="${C.accent}">${esc(txt)}</text></g>`);
    }
  }
  const [bx, by, bw, bh] = P.box;
  return `<svg class="mo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${f1(bx)} ${f1(by)} ${f1(bw)} ${f1(bh)}" preserveAspectRatio="xMidYMid meet" font-family="var(--font-sans, system-ui, sans-serif)" role="img" aria-hidden="true">${parts.join('')}</svg>`;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** New atoms arrive teal and settle to ink over the last part (so the finished product looks like every other drawing). */
const mixAccent = (t) => (t < 0.9 ? C.accent : C.ink);

/** Reduced motion: the starting material and the product side by side, an arrow between, the changed bonds glowing and the new atoms teal. */
export function staticPair(v, opts = {}) {
  const a = frameSvg(v, 0, { px: opts.px, still: true });
  const b = frameSvg(v, 1, { px: opts.px, highlight: true, still: true });
  return `<span class="mo-pair"><span class="mo-pside">${a}</span><span class="mo-parrow" aria-hidden="true">→<small>${esc(v.chip || '')}</small></span><span class="mo-pside">${b}</span></span>`;
}
export const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

/**
 * morph(host, view, {duration = 1600, autoplay = true, loop = false, reduced, onEnd}) -> {play(), seek(t), setDuration(ms), destroy(), playing()}
 * Draws into `host` (its innerHTML is replaced). requestAnimationFrame only; nothing runs while it is not playing.
 */
export function morph(host, v, opts = {}) {
  let duration = opts.duration || 1600;
  const reduced = opts.reduced != null ? opts.reduced : reduceMotion();
  let raf = 0, t0 = 0, cur = 0, alive = true;
  const px = () => Math.max(60, host.getBoundingClientRect ? host.getBoundingClientRect().width || 0 : 0) || 320;
  const draw = (t) => { cur = t; host.innerHTML = frameSvg(v, t, { px: px(), chip: opts.chip }); };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  function tick(now) {
    if (!alive) return;
    if (!t0) t0 = now;
    const t = Math.min(1, (now - t0) / duration);
    draw(t);
    if (t < 1) { raf = requestAnimationFrame(tick); return; }
    raf = 0;
    if (opts.loop) { setTimeout(() => { if (alive && !raf) play(); }, 700); return; }
    if (opts.onEnd) opts.onEnd();
  }
  function play() {
    if (!alive) return;
    stop();
    if (reduced) { host.innerHTML = staticPair(v, { px: px() / 2 }); cur = 1; if (opts.onEnd) opts.onEnd(); return; }
    t0 = 0; draw(0);
    raf = requestAnimationFrame(tick);
  }
  if (opts.autoplay === false) { if (reduced) host.innerHTML = staticPair(v, { px: px() / 2 }); else draw(1); } else play();
  return {
    play, seek(t) { stop(); draw(clamp(t)); }, setDuration(ms) { duration = ms; }, playing: () => !!raf, at: () => cur,
    destroy() { alive = false; stop(); }
  };
}
