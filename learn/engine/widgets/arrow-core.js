// Pure logic for the curved-arrow widget (no DOM): scene building, validation, grading, applying arrows.
// An arrow is {from: {lp: atomIdx} | {bond: [i, j]}, to: {atom: i} | {bond: [i, j]}}.
// Lone pairs are never typed in: they are computed from the structure, (V - charge - bonds) / 2.
import { VALENCE, analyze, coords2d } from '../chem.js';
import { lonePairAngles, hydrogenPositions } from './lewis-core.js';

export const SCALE = 64;
export const radius = (el) => (el === 'H' ? 13 : 18);

const bondKey = (b) => [...b].sort((x, y) => x - y).join('-');
export const keyOf = (e) => (e.lp != null ? 'lp:' + e.lp : e.bond ? 'bond:' + bondKey(e.bond) : e.atom != null ? 'atom:' + e.atom : '?');
const arrowKey = (a) => keyOf(a.from) + '>' + keyOf(a.to);

export function bondOrderSum(atoms, bonds, i) {
  let n = 0;
  for (const b of bonds) if (b.a === i || b.b === i) n += b.order || 1;
  return n;
}
export function lpCount(atoms, bonds, i) {
  const a = atoms[i];
  return (VALENCE[a.el] - (a.charge || 0) - bondOrderSum(atoms, bonds, i)) / 2;
}
export const findBond = (bonds, i, j) => bonds.findIndex((b) => (b.a === i && b.b === j) || (b.a === j && b.b === i));

/** Problems with a config; empty list = valid. Sources must carry electrons; destinations must exist. */
export function validate(config) {
  const errs = [];
  const { atoms, bonds, arrows } = config;
  atoms.forEach((a, i) => {
    const lp = lpCount(atoms, bonds, i);
    if (!Number.isInteger(lp) || lp < 0) errs.push(`atom ${i} (${a.el}) has impossible lone pairs ${lp}`);
  });
  const seen = new Set();
  arrows.forEach((ar, n) => {
    const t = `arrow ${n}`;
    const f = ar.from, d = ar.to;
    if (f.lp != null) {
      if (!atoms[f.lp]) errs.push(`${t}: source atom ${f.lp} missing`);
      else if (lpCount(atoms, bonds, f.lp) < 1) errs.push(`${t}: source atom ${f.lp} (${atoms[f.lp].el}) has no lone pair`);
    } else if (f.bond) {
      if (findBond(bonds, f.bond[0], f.bond[1]) < 0) errs.push(`${t}: source bond ${f.bond} is not a bond`);
    } else errs.push(`${t}: source must be a lone pair or a bond`);
    if (d.atom != null) {
      if (!atoms[d.atom]) errs.push(`${t}: destination atom ${d.atom} missing`);
      if (f.lp != null && f.lp === d.atom) errs.push(`${t}: lone pair cannot point to its own atom`);
      if (f.bond && !f.bond.includes(d.atom)) errs.push(`${t}: bond electrons must end on an atom of that bond`);
    } else if (d.bond) {
      if (!atoms[d.bond[0]] || !atoms[d.bond[1]] || d.bond[0] === d.bond[1]) errs.push(`${t}: destination bond ${d.bond} invalid`);
    } else errs.push(`${t}: destination must be an atom or a bond`);
    const k = arrowKey(ar);
    if (seen.has(k)) errs.push(`${t}: duplicate arrow`);
    seen.add(k);
  });
  return errs;
}

/** Apply the arrows to the structure: returns the new state {atoms, bonds} with lone pairs and charges recomputed. */
export function applyArrows(config) {
  const atoms = config.atoms.map((a) => ({ el: a.el, x: a.x, y: a.y, lp: 0, charge: 0 }));
  const bonds = config.bonds.map((b) => ({ a: b.a, b: b.b, order: b.order || 1 }));
  const lp = atoms.map((_, i) => lpCount(config.atoms, config.bonds, i));
  const change = (i, j, d) => {
    const k = findBond(bonds, i, j);
    if (k >= 0) { bonds[k].order += d; if (bonds[k].order <= 0) bonds.splice(k, 1); } else if (d > 0) bonds.push({ a: i, b: j, order: d });
  };
  for (const ar of config.arrows) {
    const f = ar.from, d = ar.to;
    if (f.lp != null) {
      lp[f.lp] -= 1;
      if (d.atom != null) change(f.lp, d.atom, +1); else change(d.bond[0], d.bond[1], +1);
    } else {
      const [i, j] = f.bond;
      change(i, j, -1);
      if (d.atom != null) lp[d.atom] += 1; else change(d.bond[0], d.bond[1], +1);
    }
  }
  atoms.forEach((a, i) => { a.lp = lp[i]; a.charge = VALENCE[a.el] - 2 * lp[i] - bondOrderSum(atoms, bonds, i); });
  return { atoms, bonds };
}

// ---------------------------------------------------------------- diagnosis
const MINUS = '−';
const atomName = (config, i) => config.atoms[i].label || config.atoms[i].el;
export function describeSource(config, f) {
  if (f.lp != null) return `the lone pair on ${atomName(config, f.lp)}`;
  const k = findBond(config.bonds, f.bond[0], f.bond[1]), ord = k >= 0 ? config.bonds[k].order || 1 : 1;   // a double bond reads C=C, so "C−C" never names a π pair
  return `the ${atomName(config, f.bond[0])}${ord === 2 ? '=' : ord === 3 ? '≡' : MINUS}${atomName(config, f.bond[1])} bond electrons`;
}
export function describeDest(config, f, d) {
  if (d.atom != null) return (f.bond ? 'onto ' : 'to ') + atomName(config, d.atom);
  if (findBond(config.bonds, d.bond[0], d.bond[1]) < 0) return `to form a new bond between ${atomName(config, d.bond[0])} and ${atomName(config, d.bond[1])}`;
  return `into the bond between ${atomName(config, d.bond[0])} and ${atomName(config, d.bond[1])}`;
}

/** Message for a tap that cannot start an arrow (an atom with no lone pair). */
export function badStart(config, i) {
  const a = config.atoms[i];
  const e = a.label || a.el;
  if (a.el === 'H') return `Arrows start at electrons, not at H⁺. A proton carries no electrons to move. Start at a lone pair or at a bond.`;
  const short = 2 * lpCount(config.atoms, config.bonds, i) + 2 * bondOrderSum(config.atoms, config.bonds, i) < 8;
  return `That arrow starts at an atom with no lone pair (${e}). Arrows start at electrons: a lone pair or a bond.${short ? ` ${e} is short of electrons, so it is where an arrow ENDS.` : ''}`;
}

/**
 * A learner points the arrow from a bond (e.g. a C=C pi bond) at an atom outside it (e.g. the H of HCl); the data stores that as a
 * NEW BOND to:{bond:[c, k]} so we know which end of the pi bond bonds to k. If the expected arrows hold exactly that, the drawn arrow
 * is read as the expected one. Anything else is left alone (so Lesson 03 grading is unchanged).
 */
export function normalizeDrawn(config, d) {
  if (!d.from.bond || d.to.atom == null || d.from.bond.includes(d.to.atom)) return d;
  const k = d.to.atom;
  const e = config.arrows.find((x) => x.to.bond && keyOf(x.from) === keyOf(d.from) && x.to.bond.includes(k) && x.to.bond.some((n) => d.from.bond.includes(n)));
  return e ? { from: d.from, to: e.to } : d;
}

/** The atom an arrow head points at on screen: a new-bond destination points at the atom that is not the source atom/bond. */
export function headAtom(config, ar) {
  const d = ar.to;
  if (d.atom != null) return { atom: d.atom };
  if (findBond(config.bonds, d.bond[0], d.bond[1]) >= 0) return null; // an existing bond: point at its middle
  const srcAtoms = ar.from.lp != null ? [ar.from.lp] : ar.from.bond || [];
  const far = d.bond.find((n) => !srcAtoms.includes(n));
  return far == null ? null : { atom: far };
}

/**
 * Lesson 10: config.equiv = [ {atomIdx: atomIdx, ...}, ... ] lists swaps of atoms that give the very same mechanism (the two carbons of the C=C when
 * a bromine bridges both, the two Br atoms of Br2). A drawing that is wrong as written but right after one of these swaps counts as right.
 */
export function grade(config, drawnRaw) {
  const first = gradeCore(config, drawnRaw);
  if (first.ok || !config.equiv || !config.equiv.length) return first;
  const swap = (e, m) => {
    const f = (i) => (m[i] != null ? m[i] : i);
    const r = {};
    if (e.lp != null) r.lp = f(e.lp);
    if (e.atom != null) r.atom = f(e.atom);
    if (e.bond) r.bond = e.bond.map(f);
    return r;
  };
  for (const m of config.equiv) {
    const mapped = drawnRaw.map((d) => ({ from: swap(d.from, m), to: swap(d.to, m) }));
    const r = gradeCore(config, mapped);
    if (r.ok || r.code === 'regio') return r;      // Lesson 11: a wrong H position on the mirror-image C=C of a symmetric diene gets its regiochemistry diagnosis
    if (r.code === 'missing' && first.code !== 'missing') return r; // Lesson 13: right after a symmetry swap but an arrow is still to come: say which arrow is missing, not 'wrong arrow'
  }
  return first;
}

/** drawn: arrows in the same shape as config.arrows (any order). */
function gradeCore(config, drawnRaw) {
  const drawn = drawnRaw.map((d) => normalizeDrawn(config, d));
  const exp = config.arrows;
  // Lesson 09, regiochemistry: when config.regio = {pi:[hC,pC], H, wrongWhy} the learner also says which end of the pi bond bonds to H
  // (to:{bond:[carbon, H]}). The end the expected arrow names is right; the other end gets the specific regiochemistry diagnosis.
  if (config.regio) {
    const rg = config.regio;
    const bad = drawn.findIndex((d) => d.from.bond && d.to.bond && keyOf(d.from) === keyOf({ bond: rg.pi }) && d.to.bond.includes(rg.H) && !exp.some((e) => arrowKey(e) === arrowKey(d)));
    if (bad >= 0) return { ok: false, code: 'regio', wrong: [bad], missing: [], diagnosis: rg.wrongWhy };
  }
  if (!drawn.length) return { ok: false, code: 'empty', diagnosis: 'Draw at least one arrow: tap the electrons it starts from, then the atom that receives them.', wrong: [], missing: exp.map((_, i) => i) };
  const expKeys = exp.map(arrowKey);
  const used = new Set();
  const wrong = [];
  drawn.forEach((d, n) => {
    const k = arrowKey(d);
    const hit = expKeys.findIndex((e, i) => e === k && !used.has(i));
    if (hit >= 0) used.add(hit); else wrong.push(n);
  });
  const missing = exp.map((_, i) => i).filter((i) => !used.has(i));
  if (!wrong.length && !missing.length) return { ok: true, code: 'ok', diagnosis: '', wrong, missing };

  // 1) a wrong arrow: explain what is wrong with the first one
  if (wrong.length) {
    const d = drawn[wrong[0]];
    const sameFrom = exp.find((e) => keyOf(e.from) === keyOf(d.from));
    if (sameFrom) {
      return { ok: false, code: 'dest', wrong, missing, diagnosis: `This arrow starts in the right place, but it points ${describeDest(config, d.from, d.to)}. ${sameFrom.note || `The electrons need to end up ${sameFrom.to.bond && findBond(config.bonds, sameFrom.to.bond[0], sameFrom.to.bond[1]) < 0 ? `as a new bond between ${atomName(config, sameFrom.to.bond[0])} and ${atomName(config, sameFrom.to.bond[1])}` : describeDest(config, sameFrom.from, sameFrom.to)}.`}` };
    }
    if (d.from.bond) {
      const rev = exp.find((e) => e.from.lp != null && e.to.atom != null && d.from.bond.includes(e.to.atom));
      if (rev) return { ok: false, code: 'source', wrong, missing, diagnosis: `${describeSource(config, d.from)} do not move here. The new bond comes from a lone pair, so the arrow should start on ${describeSource(config, rev.from)}.` };
    }
    return { ok: false, code: 'extra', wrong, missing, diagnosis: `${describeSource(config, d.from)[0].toUpperCase() + describeSource(config, d.from).slice(1)} ${d.from.lp != null ? 'is' : 'are'} not moving in this reaction, so that arrow is not needed. ${config.extraHint || 'Ask which electrons form a new bond, and which bond has to break.'}` };
  }
  // 2) everything drawn is right but something is missing
  const m = exp[missing[0]];
  return { ok: false, code: 'missing', wrong, missing, diagnosis: `Good so far. ${m.missing || `You also need the arrow showing ${describeSource(config, m.from)} moving ${describeDest(config, m.from, m.to)}.`}` };
}

// ---------------------------------------------------------------- geometry helpers (px, y down)
export const P = (a) => [a.x * SCALE, a.y * SCALE];

function bondAnglesAt(atoms, bonds, i) {
  const a = atoms[i], out = [];
  for (const b of bonds) {
    const j = b.a === i ? b.b : b.b === i ? b.a : -1;
    if (j >= 0) out.push(Math.atan2(atoms[j].y - a.y, atoms[j].x - a.x));
  }
  return out;
}
/** Where the lone-pair markers sit for atom i (same placement as the Lewis builder: open gaps between bonds). */
export function lpPoints(atoms, bonds, i) {
  const a = atoms[i];
  const n = lpCount(atoms, bonds, i);
  if (!(n > 0) || a.el === 'H') return [];
  const [x, y] = P(a);
  const r = radius(a.el);
  return lonePairAngles(bondAnglesAt(atoms, bonds, i), n).map((t) => ({ t, x: x + Math.cos(t) * (r + 9), y: y + Math.sin(t) * (r + 9) }));
}

/** Does a hydrogen at p point into the wedge between the atom's other bonds (towards the mean of their directions)? */
function inward(p, g, nbr) {
  const mx = nbr.reduce((t, a) => t + Math.cos(a), 0), my = nbr.reduce((t, a) => t + Math.sin(a), 0);
  const m = Math.hypot(mx, my);
  if (m < 0.35 * nbr.length) return false;                       // bonds all round the atom: there is no "inside"
  return ((p.x - g.x) * mx + (p.y - g.y) * my) / m > 0.5;
}
/** `count` hydrogens on the side away from the atom's other bonds: one straight out, two at about 40 degrees either side of "out" (so the hydrogens of neighbouring ring carbons keep apart). */
function outerH(g, nbr, count) {
  const mx = nbr.reduce((t, a) => t + Math.cos(a), 0), my = nbr.reduce((t, a) => t + Math.sin(a), 0);
  const out = Math.atan2(-my, -mx);
  const spread = { 1: [0], 2: [-0.7, 0.7], 3: [-1.0, 0, 1.0] }[count] || Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * 0.9);
  return spread.map((d) => ({ x: g.x + Math.cos(out + d), y: g.y + Math.sin(out + d) }));
}
/** Does a hydrogen drawn at p sit on top of (or too close to) another atom of its molecule? (distances in bond-length units; `skip` = its own heavy atom) */
function clashes(p, atoms, base, skip, placed) {
  const near = (q) => Math.hypot(q.x - p.x, q.y - p.y) < 0.8;
  return atoms.slice(base).some((q, i) => base + i !== skip && near(q)) || placed.some(near);
}
/** The direction around heavy atom `gi` that is clear of every atom, far from its bonds, and as close as possible to the first choice. */
function freeSpot(atoms, base, gi, nbr, forced, placed, first) {
  const g = atoms[gi], taken = nbr.concat(forced, placed.map((q) => Math.atan2(q.y - g.y, q.x - g.x)));
  const want = Math.atan2(first.y - g.y, first.x - g.x);
  const dAng = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };
  let best = first, bestScore = -Infinity;
  for (const minSep of [0.7, 0.45, 0.25]) {                      // about 40 degrees from the bonds if there is room, less in a really crowded spot
    for (let i = 0; i < 72; i++) {
      const t = (i * Math.PI) / 36, q = { x: g.x + Math.cos(t), y: g.y + Math.sin(t) };
      const sep = taken.length ? Math.min(...taken.map((u) => dAng(t, u))) : Math.PI;
      if (sep < minSep) continue;
      const room = Math.min(...atoms.slice(base).map((o, j) => (base + j === gi ? 9 : Math.hypot(o.x - q.x, o.y - q.y))), ...placed.map((o) => Math.hypot(o.x - q.x, o.y - q.y)));
      const score = Math.min(room, 0.9) * 10 - dAng(t, want) - (nbr.length >= 2 && inward(q, g, nbr) ? 30 : 0);   // clear of everything first, then closest to where it was going; never into the ring
      if (score > bestScore) { bestScore = score; best = q; }
    }
    if (bestScore > 5) break;
  }
  return best;
}

/**
 * Build a scene from SMILES: parts = [{smiles, hAngles?: {heavyIdx: radians}}] laid out left to right.
 * Hydrogens are explicit atoms. Returns {atoms, bonds, maps} where maps[k] = {heavy: [sceneIdx], h: {heavyIdx: [sceneIdx]}}.
 */
export function sceneFromSmiles(parts, gap = 1.9) {
  const atoms = [], bonds = [], maps = [];
  let cursor = 0;
  for (const part of parts) {
    const info = analyze(part.smiles);
    const pos = coords2d(part.smiles);
    const xs = pos.map((p) => p.x), ys = pos.map((p) => -p.y);
    const minX = Math.min(...xs), cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const base = atoms.length;
    const map = { heavy: [], h: {} };
    info.atoms.forEach((a, i) => { atoms.push({ el: a.sym, x: pos[i].x - minX + cursor, y: -pos[i].y - cy, charge: a.fc }); map.heavy.push(base + i); });
    info.bonds.forEach((b) => bonds.push({ a: base + b.atoms[0], b: base + b.atoms[1], order: b.bo ?? 1 }));
    info.atoms.forEach((a, i) => {
      if (!a.impH) return;
      const gi = base + i;
      const nbr = bonds.filter((b) => b.a === gi || b.b === gi).map((b) => { const j = b.a === gi ? b.b : b.a; return Math.atan2(atoms[j].y - atoms[gi].y, atoms[j].x - atoms[gi].x); });
      let pts = [];
      const forced = part.hAngles && part.hAngles[i] != null ? [part.hAngles[i]] : [];
      forced.forEach((t) => pts.push({ x: atoms[gi].x + Math.cos(t), y: atoms[gi].y + Math.sin(t) }));
      if (a.impH > forced.length) pts = pts.concat(hydrogenPositions(atoms[gi].x, atoms[gi].y, nbr.concat(forced), a.impH - forced.length));
      // a ring carbon whose second hydrogen was put INSIDE the ring (it ties with the outside on spacing): place the hydrogens on the outer side
      if (forced.length === 0 && nbr.length >= 2 && pts.some((q) => inward(q, atoms[gi], nbr))) pts = outerH(atoms[gi], nbr, a.impH);
      // crowded molecules (tert-butyl, an oxonium next to a methyl ...): a hydrogen that lands on another atom is moved to the free direction nearest to its first choice
      { const done = []; pts.forEach((p) => { done.push(clashes(p, atoms, base, gi, done) ? freeSpot(atoms, base, gi, nbr, forced, done, p) : p); }); pts = done; }
      map.h[i] = [];
      pts.forEach((p) => { atoms.push({ el: 'H', x: p.x, y: p.y, charge: 0 }); bonds.push({ a: gi, b: atoms.length - 1, order: 1 }); map.h[i].push(atoms.length - 1); });
    });
    const maxX = Math.max(...atoms.slice(base).map((a) => a.x));
    cursor = maxX + gap;
    maps.push(map);
  }
  return { atoms, bonds, maps };
}

/** Curved arrow path from p to q (px). Bulges upward when it can. Returns path data and an arrow head polygon. */
export function curve(p, q, endGap = 0) {
  const dx = q.x - p.x, dy = q.y - p.y;
  const dist = Math.hypot(dx, dy) || 1;
  let nx = -dy / dist, ny = dx / dist;
  if (ny > 0 || (Math.abs(ny) < 0.2 && nx < 0)) { nx = -nx; ny = -ny; }
  const bulge = Math.max(26, dist * 0.42);
  const c = { x: (p.x + q.x) / 2 + nx * bulge, y: (p.y + q.y) / 2 + ny * bulge };
  const ex = q.x - c.x, ey = q.y - c.y, el = Math.hypot(ex, ey) || 1;
  const t = { x: ex / el, y: ey / el };
  const end = { x: q.x - t.x * endGap, y: q.y - t.y * endGap };
  const h = 11, w = 6;
  const base = { x: end.x - t.x * h, y: end.y - t.y * h };
  const head = [[end.x, end.y], [base.x - t.y * w, base.y + t.x * w], [base.x + t.y * w, base.y - t.x * w]];
  // stop the stem slightly inside the head
  const stem = { x: end.x - t.x * (h - 3), y: end.y - t.y * (h - 3) };
  return { d: `M${p.x.toFixed(1)} ${p.y.toFixed(1)} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${stem.x.toFixed(1)} ${stem.y.toFixed(1)}`, head: head.map((v) => v.map((n) => n.toFixed(1)).join(',')).join(' '), ctrl: c, p0: p, stem };
}
