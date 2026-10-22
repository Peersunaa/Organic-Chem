// Practice generator "stereo-projections": how are two drawings of a stereoisomer related when they are drawn in DIFFERENT projections?
// Drawing styles (mixed at random): wedge-dash skeletal, Fischer projection (one centre: engine/fischer.js drawings with turns and swaps; two centres:
// a stacked Fischer built here), Newman projection (the C2-C3 bond of a 2,3-disubstituted butane-like chain, read through engine/widgets/newman-core.js)
// and a plain NAME such as (2R,3S)-2,3-dibromobutane.
//
// The ANSWER is never read off the pictures. Every drawing is turned into SMILES from its own geometry (wedge: the SMILES it is drawn from; Fischer:
// the geometry of the cross; Newman: the three screen angles of each carbon; name: the configuration the descriptors spell), the engine's
// relationship() compares those SMILES (R/S per centre, mirror image, meso check), and the four answer options are mutually exclusive:
//   identical (chiral) | meso (identical AND equal to its own mirror image) | enantiomers | diastereomers.
// tests/stereo-projections.mjs recomputes all of it in Python RDKit (tools/check_stereo_projections.py + tools/check_relationships.py, OPSIN for the names).
import { canon, analyze } from './chem.js';
import { relationship, atomSpans, tetraLabel } from './chirality.js';
import { chiralCenters, tetraInfo } from './cip.js';
import { labelsOf, stereoPrefix, stereoName, POOL_BY_ID as RING_BY_ID, enumerateCached, cisTrans } from './stereoisomers.js';
import { FISCHER_POOL, POOL_BY_ID as FISCHER_BY_ID, readRS, standardDrawing, applyOp, fischerSmiles, OPS } from './fischer.js';
import { rsDerive, manipConfirm } from './generators-fischer.js';
import { newman as newmanAngles } from './widgets/newman-core.js';
import { neighbours, rotateAbout } from './widgets/geom.js';

export const STEREO_PROJ_SKILLS = ['stereo-projections'];
export const SP_STYLE_NAME = { wedge: 'wedge-dash drawing', fischer: 'Fischer projection', newman: 'Newman projection', name: 'name' };

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const flip = (l) => (l === 'R' ? 'S' : 'R');
const SUBS = '₀₁₂₃₄₅₆₇₈₉';

// ---------------------------------------------------------------- the four answers (mutually exclusive)
export const SP_OPTIONS = [
  { id: 'identical', text: 'The same chiral compound, drawn two ways' },
  { id: 'meso', text: 'The same meso compound, drawn two ways' },
  { id: 'enantiomers', text: 'Enantiomers (non-superimposable mirror images)' },
  { id: 'diastereomers', text: 'Diastereomers (stereoisomers that are not mirror images)' }
];
/** The answer id of a pair of SMILES, computed from the configurations (engine relationship()). */
export function answerOf(a, b) {
  const r = relationship(a, b);
  if (r.kind === 'identical') return r.mesoA ? 'meso' : 'identical';
  if (r.kind === 'enantiomers' || r.kind === 'diastereomers') return r.kind;
  throw new Error(`stereo-projections: pair is ${r.kind}, not a stereoisomer pair: ${a} / ${b}`);
}

// ---------------------------------------------------------------- Fischer stacks (two centres on one vertical chain)
// A group is { label, frag (SMILES outward from the centre), inn (SMILES written inward, for the top of the chain), short (Newman label) }.
const grp = (label, frag, inn, short) => ({ label, frag, inn: inn || frag, short: short || label });
const CH3 = grp('CH₃', 'C'), CO2H = grp('CO₂H', 'C(=O)O', 'OC(=O)'), ET = grp('CH₂CH₃', 'CC', 'CC', 'Et');
const BR = grp('Br', 'Br'), CL = grp('Cl', 'Cl'), OH = grp('OH', 'O'), NH2 = grp('NH₂', 'N');
const H_G = { label: 'H', frag: '[H]', short: 'H' };

// centres[k] = { x (the substituent), up / down / xr: CIP ranks of the group above, below and the substituent (H is 4) }.
// The ranks are the textbook ones; the tests prove every read-back against RDKit.
export const STACK_DEFS = [
  { id: 'dibromobutane', nm: '2,3-dibromobutane', top: CH3, bottom: CH3, locs: [2, 3], loc: [[2, 3], [3, 2]], symmetric: true,
    centres: [{ x: BR, up: 3, down: 2, xr: 1 }, { x: BR, up: 2, down: 3, xr: 1 }] },
  { id: 'butanediol', nm: 'butane-2,3-diol', top: CH3, bottom: CH3, locs: [2, 3], loc: [[2, 3], [3, 2]], symmetric: true,
    centres: [{ x: OH, up: 3, down: 2, xr: 1 }, { x: OH, up: 2, down: 3, xr: 1 }] },
  { id: 'tartaric', nm: '2,3-dihydroxybutanedioic acid', top: CO2H, bottom: CO2H, locs: [2, 3], loc: [[2, 3], [3, 2]], symmetric: true,
    centres: [{ x: OH, up: 2, down: 3, xr: 1 }, { x: OH, up: 3, down: 2, xr: 1 }] },
  { id: 'bromobutanol', nm: '3-bromobutan-2-ol', top: CH3, bottom: CH3, locs: [2, 3], loc: [[2, 3]], symmetric: false,
    centres: [{ x: OH, up: 3, down: 2, xr: 1 }, { x: BR, up: 2, down: 3, xr: 1 }] },
  { id: 'threonine', nm: '2-amino-3-hydroxybutanoic acid', top: CO2H, bottom: CH3, locs: [2, 3], loc: [[2, 3]], symmetric: false,
    centres: [{ x: NH2, up: 2, down: 3, xr: 1 }, { x: OH, up: 2, down: 3, xr: 1 }] },
  { id: 'chloromethylpentane', nm: '2-chloro-3-methylpentane', top: CH3, bottom: ET, locs: [2, 3], loc: [[2, 3]], symmetric: false,
    centres: [{ x: CL, up: 3, down: 2, xr: 1 }, { x: CH3, up: 1, down: 2, xr: 3 }] }
];
const STACK_BY_ID = Object.fromEntries(STACK_DEFS.map((d) => [d.id, d]));

/** bits[k] = 0: the substituent is on the RIGHT of centre k, 1: on the LEFT. */
export function mkStack(def, bits) {
  return { top: def.top, bottom: def.bottom, rows: def.centres.map((c, k) => ({ id: k, loc: def.locs[k], x: c.x, side: bits[k] ? 'L' : 'R', ranks: { up: c.up, down: c.down, x: c.xr } })) };
}
/** Turn a stacked Fischer 180 degrees in the page: same molecule. */
export function rot180Stack(sd) {
  return { top: sd.bottom, bottom: sd.top, rows: sd.rows.slice().reverse().map((r) => ({ ...r, side: r.side === 'R' ? 'L' : 'R', ranks: { up: r.ranks.down, down: r.ranks.up, x: r.ranks.x } })) };
}
const sideGroup = (row, where) => (row.side === where ? row.x : H_G);   // group on the left / right of a row
/** SMILES the geometry of a stack stands for: neighbour order top, left, right, bottom with '@' is the Fischer convention (the H is written in the bracket). */
export function stackSmiles(sd) {
  const mid = sd.rows.map((r) => {
    // [C@H](X) lists (above, H, X, below); [C@@H](X) is that with H and X exchanged. Left = first branch after the above-atom.
    return r.side === 'R' ? `[C@H](${r.x.frag})` : `[C@@H](${r.x.frag})`;
  }).join('');
  return sd.top.inn + mid + sd.bottom.frag;
}
/** The four-position view of centre k of a stack, in the format of engine/fischer.js (so readRS() and rsDerive() read it). */
export function centreView(sd, k) {
  const row = sd.rows[k];
  const up = k === 0 ? sd.top : { label: 'C' + sd.rows[k - 1].loc };
  const down = k === sd.rows.length - 1 ? sd.bottom : { label: 'C' + sd.rows[k + 1].loc };
  const x = { label: row.x.label, rank: row.ranks.x }, h = { label: 'H', rank: 4 };
  return { top: { label: up.label, rank: row.ranks.up }, bottom: { label: down.label, rank: row.ranks.down }, left: row.side === 'L' ? x : h, right: row.side === 'R' ? x : h };
}
/** R/S of every centre of a stack drawing, indexed by the molecule's own centre id (not by position on the page). */
export function readStack(sd) {
  const labels = [];
  sd.rows.forEach((r, k) => { labels[r.id] = readRS(centreView(sd, k)).label; });
  return labels;
}

// ---------------------------------------------------------------- the molecules (one pool, three kinds)
const ONE_NAMES = { glyceraldehyde: 'glyceraldehyde', 'lactic acid': 'lactic acid', alanine: 'alanine', 'butan-2-ol': 'butan-2-ol', '2-bromobutane': '2-bromobutane' };
export const ONE_IDS = Object.keys(ONE_NAMES);
export const RING_IDS = ['dimethylcyclohexane12', 'dibromocyclohexane12'];

/** SMILES of a one-centre molecule with the wanted R/S letter (the centre of `flat` tagged, the letter found by the engine). */
function oneSmiles(entry, label) {
  const flat = entry.flat;
  const c = chiralCenters(flat)[0];
  const sp = atomSpans(flat)[c];
  const h = analyze(flat).atoms[c].impH;
  for (const tag of ['@', '@@']) {
    const s = flat.slice(0, sp.s) + `[C${tag}${h === 1 ? 'H' : ''}]` + flat.slice(sp.e);
    if (labelsOf(s)[0] === label) return s;
  }
  throw new Error('no tag gives ' + label + ' for ' + flat);
}

let POOL = null;
/** { id, kind: 'one'|'stack'|'ring', nm, locs, symmetric, combos:[{ smiles, labels, meso }], rel[i][j] (answer id), classes } built once RDKit is ready. */
export function spPool() {
  if (POOL) return POOL;
  const mols = [];
  const finish = (M) => {
    M.combos.forEach((c) => { c.canon = canon(c.smiles); c.meso = relationship(c.smiles, c.smiles).mesoA; });
    M.rel = M.combos.map((a) => M.combos.map((b) => answerOf(a.smiles, b.smiles)));
    M.classes = { identical: [], meso: [], enantiomers: [], diastereomers: [] };
    M.rel.forEach((row, i) => row.forEach((id, j) => M.classes[id].push([i, j])));
    M.symmetric = M.classes.meso.length > 0;
    mols.push(M);
  };
  ONE_IDS.forEach((id) => {
    const entry = FISCHER_BY_ID[id];
    finish({ id, kind: 'one', entry, nm: ONE_NAMES[id], locs: [], loc: [], combos: ['R', 'S'].map((l) => ({ smiles: oneSmiles(entry, l), labels: [l] })) });
  });
  STACK_DEFS.forEach((def) => {
    const combos = [];
    for (let m = 0; m < 4; m++) { const bits = [(m >> 1) & 1, m & 1]; const smiles = stackSmiles(mkStack(def, bits)); combos.push({ bits, smiles, labels: labelsOf(smiles) }); }
    finish({ id: def.id, kind: 'stack', def, nm: def.nm, locs: def.locs, loc: def.loc, combos });
  });
  RING_IDS.forEach((id) => {
    const e = RING_BY_ID[id];
    finish({ id, kind: 'ring', e, nm: e.new, locs: e.loc[0], loc: e.loc, combos: enumerateCached(e).combos.map((c) => ({ bits: c.bits, smiles: c.smiles, labels: c.labels })) });
  });
  mols.forEach((M) => {
    const key = M.combos.map((c) => c.labels.join('')).join();
    if (new Set(M.combos.map((c) => c.labels.join(''))).size !== M.combos.length) throw new Error('label combinations of ' + M.id + ' are not distinct: ' + key);
    const expect = M.kind === 'one' ? false : M.kind === 'ring' ? true : M.def.symmetric;
    if (M.symmetric !== expect) throw new Error('symmetry flag of ' + M.id + ' disagrees with the engine');
  });
  POOL = mols;
  return POOL;
}
export const spMol = (id) => spPool().find((m) => m.id === id);

/** "(2R,3S)" for chain-order labels (the centre numbering of the molecule); "(R)" for one centre. */
export const fmtLabels = (M, labels) => (M.kind === 'one' ? `(${labels[0]})` : `(${M.locs.map((l, k) => l + labels[k]).join(',')})`);
const cnames = (M) => (M.kind === 'one' ? ['the stereocentre'] : M.locs.map((l) => 'C' + l));

// ---------------------------------------------------------------- drawings (plain, JSON-safe)
/** Every drawing: { style, smiles (from the drawing's own geometry), labels (chain order, read from the drawing), read (the reading in words), key (picture identity), ... }. */
export function wedgeDrawing(M, ci, rotate) {
  const c = M.combos[ci];
  const info = tetraInfo(c.smiles);
  const prio = M.kind === 'one' ? priorityLine(tetraInfo(c.smiles).filter((t) => t.center)[0], 'the centre') : info.filter((t) => t.center).map((t, k) => priorityLine(t, 'C' + M.locs[k])).join(' ');
  return { style: 'wedge', smiles: c.smiles, labels: c.labels.slice(), rotate: rotate || 0,
    read: `${prio} Reading the wedges and dashes (with H pointing away from you) gives ${fmtLabels(M, c.labels)}.`, key: `wedge|${c.smiles}|${rotate || 0}` };
}
function priorityLine(t, where) {
  const names = t.order.map((i) => t.subs[i].label);
  return `At ${where}: ${names.join(' > ')}.`;
}
export function nameDrawing(M, ci) {
  const c = M.combos[ci];
  let text, labels = c.labels.slice();
  if (M.kind === 'one') text = `(${labels[0]})-${M.nm}`;
  else {
    const prefix = stereoPrefix({ loc: M.loc }, c.smiles);
    text = M.kind === 'ring' ? stereoName(M.e, c.smiles).new : `(${prefix})-${M.nm}`;
    // the descriptors may number the chain from the other end (symmetric molecules): then the letters are read the other way round
    const letters = prefix.split(',').map((x) => x.replace(/^\d+/, ''));
    if (letters.join('') !== labels.join('')) labels = labels.slice().reverse();
    if (letters.join('') !== labels.join('')) throw new Error('name letters do not match ' + c.smiles);
  }
  return { style: 'name', smiles: canon(c.smiles), labels, text, read: `The name already gives the configuration: ${fmtLabels(M, labels)}.`, key: 'name|' + text };
}

const plainGroup = (g) => ({ label: g.label, rank: g.rank, frag: g.frag });
const plain4 = (d) => Object.fromEntries(['top', 'right', 'bottom', 'left'].map((p) => [p, plainGroup(d[p])]));

/** One-centre Fischer: the standard layout of the pool molecule with the wanted letter, optionally disguised by turns and swaps (engine/fischer.js applyOp). */
export function fischer1Drawing(M, ci, rng, partner) {
  const entry = M.entry, want = M.combos[ci].labels[0];
  let d = null, op = null, text = null, from = null;
  if (partner && partner.style === 'fischer') {
    // B is A turned or swapped: the operation decides whether it is the same molecule
    for (let t = 0; t < 40 && !d; t++) {
      const o = pick(rng, OPS);
      const res = applyOp(partner.dd, o, (n) => Math.floor(rng() * n));
      if (readRS(res.drawing).label === want) { d = res.drawing; op = o; text = res.text; from = partner.dd; }
    }
  }
  if (!d) {
    for (let t = 0; t < 40 && !d; t++) {
      let cand = standardDrawing(entry, rng() < 0.5 ? 'right' : 'left');
      if (rng() < 0.5) { const res = applyOp(cand, pick(rng, ['rot180', 'swap2']), (n) => Math.floor(rng() * n)); cand = res.drawing; }
      if (readRS(cand).label === want) d = cand;
    }
  }
  if (!d) throw new Error('no Fischer arrangement for ' + M.id + ' ' + want);
  const r = readRS(d);
  const view = plain4(d);
  return { style: 'fischer', n: 1, d: view, dd: d, smiles: canon(fischerSmiles(d)), labels: [r.label], op, opText: text, from: from ? plain4(from) : null,
    read: rsDerive(d), views: [{ id: 0, d: view, low: r.lowVertical }], key: 'f1|' + ['top', 'right', 'bottom', 'left'].map((p) => d[p].label).join('/') };
}

/** Two-centre Fischer: the stack for the combination, turned 180 degrees in the page when `turned`. */
export function fischer2Drawing(M, ci, turned) {
  let sd = mkStack(M.def, M.combos[ci].bits);
  if (turned) sd = rot180Stack(sd);
  const labels = readStack(sd);
  const views = sd.rows.map((r, k) => { const d = centreView(sd, k); return { id: r.id, d: plain4(d), low: readRS(d).lowVertical }; });
  const read = sd.rows.map((r, k) => `C${r.loc}: ${rsDerive(centreView(sd, k))}`).join(' ');
  return { style: 'fischer', n: 2, turned: !!turned, stack: { top: sd.top.label, bottom: sd.bottom.label, rows: sd.rows.map((r) => ({ id: r.id, loc: r.loc, left: sideGroup(r, 'L').label, right: sideGroup(r, 'R').label })) },
    smiles: canon(stackSmiles(sd)), labels, views, read, key: 'f2|' + sd.rows.map((r) => r.side + r.x.label).join('') + (turned ? 't' : '') };
}

// ---------------------------------------------------------------- Newman projections of C2-C3 (3D geometry from the Fischer layout, rotated about the C-C bond)
const TET_Y = 1 / 3, TET_R = Math.sqrt(8) / 3;
const sin60 = Math.sin(Math.PI / 3), cos60 = 0.5;
/** 3D model of a stack: atom 0 = first centre (origin), atom 1 = second centre (0,-1,0); groups 2,3,4 on atom 0 (top, left, right) and 5,6,7 on atom 1 (bottom, left, right).
 *  The eclipsed Fischer geometry: back bonds (vertical) at z < 0, horizontal bonds toward the viewer (z > 0). Viewer on +z, x to the right, y up. */
export function newmanModel(def, bits, omega) {
  const sd = mkStack(def, bits);
  const [A, B] = sd.rows;
  const groups = [null, null,
    { ...sd.top, rank: A.ranks.up }, { ...sideGroup(A, 'L'), rank: sideGroup(A, 'L') === A.x ? A.ranks.x : 4 }, { ...sideGroup(A, 'R'), rank: sideGroup(A, 'R') === A.x ? A.ranks.x : 4 },
    { ...sd.bottom, rank: B.ranks.down }, { ...sideGroup(B, 'L'), rank: sideGroup(B, 'L') === B.x ? B.ranks.x : 4 }, { ...sideGroup(B, 'R'), rank: sideGroup(B, 'R') === B.x ? B.ranks.x : 4 }];
  const sub = (cy, y0) => [[0, cy + y0, -TET_R], [-TET_R * sin60, cy + y0, TET_R * cos60], [TET_R * sin60, cy + y0, TET_R * cos60]];
  const pts = [[0, 0, 0], [0, -1, 0], ...sub(0, TET_Y), ...sub(-1, -TET_Y)];
  for (const i of [5, 6, 7]) pts[i] = rotateAbout(pts[i], [0, 0, 0], [0, -1, 0], omega);
  const bonds = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [1, 6], [1, 7]];
  return { def, bits, omega, pts, groups, bonds, nb: neighbours(bonds, 8), centreRanks: [A.ranks, B.ranks] };
}
/** R/S of centre 0 or 1 of a Newman model, read from its 3D coordinates (tetraLabel on the four groups in CIP order). */
export function modelLabels(model) {
  const out = [];
  [0, 1].forEach((c) => {
    const r = model.centreRanks[c];
    const kids = model.nb[c].filter((j) => j !== (c === 0 ? 1 : 0));
    const byRank = {};
    kids.forEach((j) => { byRank[model.groups[j].rank] = model.pts[j]; });
    byRank[c === 0 ? r.down : r.up] = model.pts[c === 0 ? 1 : 0];
    out[c] = tetraLabel(byRank[1], byRank[2], byRank[3], byRank[4]).label;
  });
  return out;
}
/** SMILES from the drawn angles alone: the front carbon's three groups counter-clockwise, then the back carbon's three counter-clockwise (the '@' convention of the tests). */
export function newmanSmiles(front, back) {
  const ccw = (list) => list.slice().sort((a, b) => a.ang - b.ang).map((g) => `(${g.frag})`).join('');
  return `[C@]${ccw(front)}[C@]${ccw(back)}`;
}
export function newmanDrawing(M, ci, rng) {
  const def = M.def, bits = M.combos[ci].bits;
  const omega = pick(rng, [60, 180, 300]);
  const model = newmanModel(def, bits, omega);
  const frontIdx = rng() < 0.5 ? 0 : 1;   // look from the first centre (C2 in front) or from the second (C3 in front)
  const backIdx = 1 - frontIdx;
  const frontKids = model.nb[frontIdx].filter((j) => j !== backIdx);
  const ref = pick(rng, frontKids);
  const nm = newmanAngles({ nb: model.nb, cfg: { front: frontIdx, back: backIdx, refFront: ref } }, model.pts);
  const toGroup = (o) => { const g = model.groups[o.i]; return { label: g.label, short: g.short || g.label, frag: g.frag, ang: Math.round(o.ang * 100) / 100, rank: g.rank }; };
  const front = nm.front.map(toGroup), back = nm.back.map(toGroup);
  const smiles = canon(newmanSmiles(front, back));
  const lab3d = modelLabels(model);                 // chain order (centre 0 = C2, centre 1 = C3)
  const ids = def.locs;
  const fname = 'C' + ids[frontIdx], bname = 'C' + ids[backIdx];
  const rows = [frontIdx, backIdx].map((c) => {
    const r = model.centreRanks[c];
    const names = [];
    model.nb[c].forEach((j) => { if (j !== (c === 0 ? 1 : 0)) names[model.groups[j].rank] = model.groups[j].label; });
    names[c === 0 ? r.down : r.up] = 'C' + ids[1 - c];
    return `C${ids[c]} (${c === frontIdx ? 'front' : 'rear'}): ${names.slice(1).join(' > ')} gives ${lab3d[c]}.`;
  });
  const angs = front.concat(back).map((g) => Math.round(g.ang)).join('/');
  return { style: 'newman', smiles, labels: lab3d.slice(), frontName: fname, backName: bname, front, back, omega, frontIdx,
    read: `Looking from ${fname} toward ${bname}: the bonds that meet in the middle belong to ${fname}, those that start at the circle belong to ${bname}, and each carbon's fourth group is the other carbon. ${rows.join(' ')}`,
    key: 'nw|' + frontIdx + '|' + angs + '|' + front.concat(back).map((g) => g.label).join('') };
}

function renderDrawing(M, ci, style, rng, partner) {
  if (style === 'name') return nameDrawing(M, ci);
  if (style === 'newman') return newmanDrawing(M, ci, rng);
  if (style === 'fischer') return M.kind === 'one' ? fischer1Drawing(M, ci, rng, partner) : fischer2Drawing(M, ci, rng() < 0.5);
  // wedge
  const prev = partner && partner.style === 'wedge' ? partner.rotate : null;
  let rot = rng() < 0.4 ? pick(rng, [90, 180, 270]) : 0;
  if (prev !== null && rot === prev) rot = prev === 0 ? pick(rng, [90, 180, 270]) : 0;
  return wedgeDrawing(M, ci, rot);
}

// ---------------------------------------------------------------- choosing a problem
function pickStyles(rng, level, M) {
  if (level === 1) { const r = rng(); return r < 0.5 ? ['wedge', 'fischer'] : r < 0.7 ? ['fischer', 'wedge'] : r < 0.9 ? ['fischer', 'fischer'] : ['wedge', 'wedge']; }
  if (level === 2) {
    if (M.kind === 'ring') return ['wedge', 'wedge'];
    const r = rng(); return r < 0.35 ? ['wedge', 'fischer'] : r < 0.6 ? ['fischer', 'wedge'] : r < 0.85 ? ['fischer', 'fischer'] : ['wedge', 'wedge'];
  }
  // level 3: named forms (about three problems in four) and Newman projections
  if (M.kind === 'ring') return rng() < 0.5 ? ['wedge', 'name'] : ['name', 'wedge'];
  const other = () => { const r = rng(); return r < 0.4 ? 'newman' : r < 0.7 ? 'wedge' : 'fischer'; };
  if (rng() < 0.75) { const o = other(); return rng() < 0.5 ? ['name', o] : [o, 'name']; }
  const o = pick(rng, ['wedge', 'fischer', 'newman']);
  return rng() < 0.5 ? ['newman', o] : [o, 'newman'];
}
function pickMol(rng, level) {
  const P = spPool();
  const of = (f) => P.filter(f);
  if (level === 1) return pick(rng, of((m) => m.kind === 'one'));
  if (level === 2) return rng() < 0.7 ? pick(rng, of((m) => m.kind === 'stack')) : pick(rng, of((m) => m.kind === 'ring'));
  if (rng() < 0.6) return rng() < 0.4 ? pick(rng, of((m) => m.kind === 'ring')) : pick(rng, of((m) => m.kind === 'stack' && m.symmetric));
  return pick(rng, of((m) => m.kind === 'stack' && !m.symmetric));
}
function pickTarget(rng, level, M) {
  const avail = Object.keys(M.classes).filter((k) => M.classes[k].length);
  if (level === 3 && M.symmetric) {
    const r = rng();
    return r < 0.4 ? 'meso' : r < 0.65 ? 'enantiomers' : r < 0.9 ? 'diastereomers' : 'identical';
  }
  return pick(rng, avail);
}

// ---------------------------------------------------------------- diagnoses
const listNames = (names) => (names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]);
/** The tip that goes with the style of a drawing when one of its centres is misread. */
function readingTip(dr, k) {
  if (dr.style === 'fischer') {
    const v = dr.views.find((x) => x.id === k) || dr.views[0];
    return v.low ? 'In a Fischer projection a vertical bond points away from you, and H is on a vertical bond here, so read 1 → 2 → 3 as drawn.'
      : 'In a Fischer projection a horizontal bond points toward you, and H is on a horizontal bond here, so the direction you see on the page must be reversed.';
  }
  if (dr.style === 'newman') return 'In a Newman projection the bonds meeting in the middle belong to the front carbon and the bonds starting at the circle belong to the rear carbon; the other carbon is the fourth group of each (away from you for the front carbon, toward you for the rear one).';
  if (dr.style === 'wedge') return 'Rank the four groups, then look at the wedges: a wedge points toward you and a dash away, and the lowest-priority group (H, not drawn) points opposite the groups that are wedged.';
  return 'The name gives the letter for each locant directly.';
}
function relationText(M, A, B, truth) {
  const fa = fmtLabels(M, A.labels), fb = fmtLabels(M, B.labels);
  const cn = cnames(M);
  const per = A.labels.map((l, k) => ({ c: cn[k], same: l === B.labels[k], a: l, b: B.labels[k] }));
  const opp = per.filter((x) => !x.same).map((x) => x.c), same = per.filter((x) => x.same).map((x) => x.c);
  return { fa, fb, opp, same, per, n: per.length };
}
function drawNote(M, A, B) {
  if (A.style !== B.style) return ` The two drawings look different only because one is a ${SP_STYLE_NAME[A.style]} and the other a ${SP_STYLE_NAME[B.style]}: compare the configurations (the R/S letters), not the pictures.`;
  if (A.style === 'fischer' && A.n === 1 && B.op) return ' ' + manipConfirm(B.op, A.dd, B.dd).split(' Check with the letters')[0];
  if (A.style === 'fischer' && A.n === 2 && (A.turned !== B.turned)) return ' Turning a Fischer projection 180° in the plane of the page does not change the molecule.';
  if (A.style === 'wedge' && A.rotate !== B.rotate) return ' Turning a drawing round in the plane of the page does not change the molecule.';
  if (A.style === 'newman') return ' A Newman projection can be turned, or viewed from the other carbon, or have its rear carbon rotated: none of that changes the molecule, only its configuration does.';
  return '';
}
/** Which single-centre misreadings (flip one letter in one drawing) would make `chosen` the apparent answer? */
function misreads(M, A, B, chosen) {
  const out = [];
  const find = (labels) => M.combos.findIndex((c) => c.labels.join('') === labels.join(''));
  [['A', A, B], ['B', B, A]].forEach(([nameX, X, Y]) => {
    if (X.style === 'name') return;
    X.labels.forEach((l, k) => {
      const L2 = X.labels.slice(); L2[k] = flip(l);
      const i = find(L2), j = find(Y.labels);
      if (i < 0 || j < 0) return;
      const id = nameX === 'A' ? M.rel[i][j] : M.rel[j][i];
      if (id === chosen) out.push({ drawing: nameX, X, k, from: l, to: flip(l) });
    });
  });
  const rank = (m) => (m.X.style === 'fischer' ? 0 : m.X.style === 'newman' ? 1 : 2);
  return out.sort((x, y) => rank(x) - rank(y));
}
export function diagnose(M, A, B, truth, chosen) {
  const R = relationText(M, A, B, truth);
  const pair = `A is ${R.fa} and B is ${R.fb}`;
  const rev = A.labels.join('') !== B.labels.join('');
  const one = M.kind === 'one';
  const dn = drawNote(M, A, B);
  const ringNote = M.kind === 'ring' ? ` (${cisTrans(M.e, A.smiles)} and ${cisTrans(M.e, B.smiles)}; cis and trans isomers are different compounds)` : '';
  const mesoAny = A.meso || B.meso;
  let t;
  if (truth === 'identical') {
    if (chosen === 'enantiomers') t = `Enantiomers are opposite at EVERY centre. ${pair}: the letters are the same${one ? '' : ' at every centre'}, so this is one compound.${dn}`;
    else if (chosen === 'diastereomers') t = `Diastereomers differ at some centre. ${pair}: no centre differs, so these are one compound, not two stereoisomers.${dn}`;
    else t = one ? 'A molecule with one stereocentre cannot be meso: there is no second centre to cancel it, so it has no plane of symmetry. These are one chiral compound drawn two ways.'
      : `Meso needs a plane of symmetry inside the molecule. ${R.fa} is chiral: its mirror image ${fmtLabels(M, A.labels.map(flip))} is a different compound. These are one chiral compound drawn two ways.`;
  } else if (truth === 'meso') {
    if (chosen === 'identical') t = `They are the same compound, but say what kind: ${pair}, and this molecule is meso. Its two halves are alike, so a plane of symmetry between ${cnames(M).join(' and ')} makes it identical to its own mirror image.${ringNote}`;
    else if (chosen === 'enantiomers') t = rev
      ? `Every centre is reversed (${pair}), which looks like a pair of mirror images. But this molecule has a plane of symmetry, so its mirror image is itself: the two descriptors name ONE compound, and one compound cannot be its own enantiomer.${ringNote}`
      : `${pair}: the same letters, so these are one compound. And because this molecule has a plane of symmetry its mirror image is itself, so it has no enantiomer at all.${ringNote}`;
    else t = rev
      ? `Diastereomers are two DIFFERENT compounds. ${pair}, but the plane of symmetry between the two centres makes these one meso compound, so there is only one compound here.${ringNote}`
      : `${pair}: one compound drawn twice. Diastereomers need two different compounds.${ringNote}${dn}`;
  } else if (truth === 'enantiomers') {
    if (chosen === 'identical') t = `They are not the same compound: ${pair}. ${one ? 'The centre is' : 'Every centre is'} reversed, so each is the mirror image of the other and no turning of the molecule can make them match.${dn}`;
    else if (chosen === 'diastereomers') t = one ? 'A molecule with one stereocentre has no diastereomers: the only other configuration is the mirror image, so the second drawing is the enantiomer.'
      : `Diastereomers are opposite at only SOME centres. ${pair}: every centre is reversed and the molecule has no plane of symmetry, so they are mirror images: enantiomers.${ringNote}`;
    else t = one ? 'A molecule with one stereocentre cannot be meso, and these two are different compounds (mirror images).'
      : `Neither is meso: ${R.fa} has the mirror image ${R.fb}, a different compound, so there is no plane of symmetry in either one.`;
  } else { // diastereomers
    if (chosen === 'identical') t = `They are different compounds: ${pair}, so ${listNames(R.opp)} ${R.opp.length === 1 ? 'differs' : 'differ'}.${ringNote}${dn}`;
    else if (chosen === 'enantiomers') t = mesoAny
      ? `One of them is meso (its own mirror image), so it has no enantiomer: ${pair}. They are different stereoisomers that are not mirror images: diastereomers.${ringNote}`
      : `Enantiomers are opposite at EVERY centre. Here only ${listNames(R.opp)} ${R.opp.length === 1 ? 'is' : 'are'} opposite and ${listNames(R.same)} ${R.same.length === 1 ? 'is' : 'are'} the same (${pair}), so they are not mirror images.${ringNote}`;
    else t = mesoAny
      ? `Not identical: they differ at ${listNames(R.opp)} (${pair}). One of them being meso does not make the two the same compound.${ringNote}`
      : `Neither is meso, and they differ at ${listNames(R.opp)} (${pair}), so they are different compounds.${ringNote}`;
  }
  const mis = misreads(M, A, B, chosen)[0];
  if (mis) {
    const cn = cnames(M)[mis.k];
    t += ` This answer is what you get if ${cn === 'the stereocentre' ? 'the stereocentre' : cn} in drawing ${mis.drawing} (the ${SP_STYLE_NAME[mis.X.style]}) is read as ${mis.to} instead of ${mis.from}. ${readingTip(mis.X, mis.k)}`;
  }
  return t;
}

function conclusion(M, A, B, truth) {
  const R = relationText(M, A, B, truth);
  const cn = cnames(M);
  const cmp = M.kind === 'one' ? `A is ${R.fa} and B is ${R.fb}.` : `${R.per.map((x) => `${x.c}: ${x.a} in A, ${x.b} in B`).join('; ')}.`;
  const ringNote = M.kind === 'ring' ? ` ${cisTrans(M.e, A.smiles)}/${cisTrans(M.e, B.smiles)}.` : '';
  if (truth === 'identical') return `${cmp} The same letter at ${M.kind === 'one' ? 'the centre' : 'every centre'}: one compound, only drawn differently (and it is chiral, so it is not meso).`;
  if (truth === 'meso') return A.labels.join('') !== B.labels.join('')
    ? `${cmp} Every centre is reversed, which would make mirror images, but the molecule has a plane of symmetry between ${cn.join(' and ')}: its mirror image is itself. Numbering from the other end turns ${fmtLabels(M, B.labels)} into ${fmtLabels(M, B.labels.slice().reverse())}, so these are one meso compound, identical and achiral.${ringNote}`
    : `${cmp} The same letters at every centre: one compound drawn twice. It is also meso: its two halves are alike, so a plane of symmetry between ${cn.join(' and ')} makes it identical to its own mirror image (achiral).${ringNote}`;
  if (truth === 'enantiomers') return `${cmp} ${M.kind === 'one' ? 'The only centre is reversed' : 'Every centre is reversed'} and the compound is chiral (no plane of symmetry): mirror images that do not superimpose, enantiomers.${ringNote}`;
  const meso = A.meso || B.meso ? ' One of them is meso and the other is chiral.' : '';
  return `${cmp} Opposite at ${listNames(R.opp)} but the same at ${listNames(R.same)}: stereoisomers that are not mirror images, diastereomers.${meso}${ringNote}`;
}
function hintsFor(M, A, B) {
  const styles = [A.style, B.style];
  const h0 = 'Do not compare the pictures. For each drawing work out the R or S letter of every stereocentre, then compare the letters centre by centre.';
  let h1;
  if (styles.includes('newman')) h1 = 'In a Newman projection, the three bonds that meet in the middle belong to the front carbon and the three that start at the circle belong to the rear carbon. Each carbon also has the other carbon as its fourth group. Rank the four, put H (or the lowest group) away from you, and read 1 → 2 → 3.';
  else if (styles.includes('fischer')) h1 = 'In a Fischer projection vertical bonds point away from you and horizontal bonds point toward you: if H is on a horizontal bond, reverse the direction you read. Turning the whole projection 180° in the page keeps the molecule.';
  else if (M.symmetric) h1 = 'Opposite letters at every centre usually mean enantiomers, unless the two halves of the molecule are alike: then (R,S) and (S,R) are one meso compound with a plane of symmetry.';
  else h1 = 'Same letters at every centre: the same compound. Opposite at every centre: enantiomers. Opposite at some centres but not all: diastereomers.';
  return [h0, h1];
}

function keyOf(p) { return p.a.key + '||' + p.b.key; }

/** One problem of the given level (1, 2 or 3). */
export function makeProjectionProblem(rng, level = 1 + Math.floor(rng() * 3)) {
  const M = pickMol(rng, level);
  const target = pickTarget(rng, level, M);
  const [i, j] = pick(rng, M.classes[target]);
  const [sa, sb] = pickStyles(rng, level, M);
  let A = null, B = null;
  for (let t = 0; t < 30; t++) {
    A = renderDrawing(M, i, sa, rng, null);
    B = renderDrawing(M, j, sb, rng, A);
    if (A.key !== B.key) break;
  }
  if (A.key === B.key) throw new Error('could not draw two different pictures for ' + M.id);
  A.meso = M.combos[i].meso; B.meso = M.combos[j].meso;
  // every drawing must read back as the configuration it was made from (the generator proves it before it serves a problem)
  [[A, i], [B, j]].forEach(([d, ci]) => {
    const want = M.combos[ci].labels;
    const sameCompound = canon(d.smiles) === M.combos[ci].canon;
    if (!sameCompound) throw new Error(`${d.style} drawing of ${M.id} does not stand for the intended compound`);
    const eng = labelsOf(d.smiles);
    const readSorted = eng.slice().sort().join(''), mine = d.labels.slice().sort().join('');
    if (readSorted !== mine) throw new Error(`${d.style} drawing of ${M.id}: read ${d.labels} but the engine says ${eng}`);
    if (d.labels.join('') !== want.join('') && !(M.symmetric && d.labels.slice().reverse().join('') === want.join(''))) throw new Error(`${d.style} drawing of ${M.id}: read ${d.labels} expected ${want}`);
  });
  const truth = answerOf(A.smiles, B.smiles);
  if (truth !== target) throw new Error(`stereo-projections: ${M.id} wanted ${target}, engine says ${truth}`);
  const order = SP_OPTIONS.slice();
  for (let k = order.length - 1; k > 0; k--) { const r = Math.floor(rng() * (k + 1)); [order[k], order[r]] = [order[r], order[k]]; }
  const whys = {};
  SP_OPTIONS.forEach((o) => { if (o.id !== truth) whys[o.id] = diagnose(M, A, B, truth, o.id); });
  const label = (d) => `${SP_STYLE_NAME[d.style]}`;
  const derive = `Drawing A (${label(A)}): ${A.read} Drawing B (${label(B)}): ${B.read} ${conclusion(M, A, B, truth)}`;
  const strip = (d) => { const { dd, ...rest } = d; return rest; };
  return {
    kind: 'widget', widget: 'projection-pair', skill: 'stereo-projections', smiles: null, level,
    prompt: M.kind === 'one' ? 'Drawing A and drawing B show the same molecule. How are they related?' : 'Drawing A and drawing B show stereoisomers with the same connectivity. How are they related?',
    config: { a: strip(A), b: strip(B), options: order.map((o) => ({ id: o.id, text: o.text })), whys, answer: truth, readouts: { a: fmtLabels(M, A.labels), b: fmtLabels(M, B.labels) }, mol: M.id },
    answer: truth, derive, hints: hintsFor(M, A, B), entry: M.id, molKind: M.kind, symmetric: M.symmetric, a: strip(A), b: strip(B), key: keyOf({ a: A, b: B })
  };
}

/** generate(count, { skill, rng }): the levels cycle from a random start, so a short set mixes one-centre, two-centre and meso/Newman/named problems. */
export function generateStereoProjections(count, { skill = null, rng = Math.random } = {}) {
  const out = [];
  const start = Math.floor(rng() * 3);
  let last = null;
  for (let n = 0; n < count; n++) {
    let p, tries = 0;
    do { p = makeProjectionProblem(rng, ((start + n) % 3) + 1); tries++; } while (last && last === p.key && tries < 6);
    last = p.key;
    out.push(p);
  }
  return out;
}
