// Fischer projections (Lesson 16): pure logic, no DOM, no RDKit at import time.
// A drawing is { top, right, bottom, left }, each { label, rank (CIP 1..4), frag (SMILES written outward from the centre) }.
// Convention: the VERTICAL bonds point away from the viewer, the HORIZONTAL bonds point toward the viewer.
//
// R/S rule (readRS): read 1 -> 2 -> 3 as drawn on the page. If group 4 is on a vertical bond (pointing back) that direction is the answer
// (clockwise = R); if group 4 is on a horizontal bond (pointing toward you) the reading is reversed (clockwise = S).
// Every label, every manipulation verdict and every SMILES below is re-derived in Python RDKit by tests/lesson16.mjs
// (tools/check_fischer.py builds the same drawing as a wedge/dash molblock and reads R/S with rdCIPLabeler).

export const POSITIONS = ['top', 'right', 'bottom', 'left'];
const XY = { top: [0, 1], right: [1, 0], bottom: [0, -1], left: [-1, 0] };
export const isVertical = (pos) => pos === 'top' || pos === 'bottom';
export const otherLabel = (l) => (l === 'R' ? 'S' : 'R');
export const dirWord = (d) => (d === 'cw' ? 'clockwise' : 'counterclockwise');

// ---------------------------------------------------------------- the molecules
// Each molecule has ONE chirality centre. `top`/`bottom` are the chain groups of the usual layout (C1 on top, the most oxidised carbon or the
// lowest-numbered one); `x` is the heteroatom; H is always the fourth group. ranks are CIP priorities (verified against engine/cip.js and RDKit in the tests).
const g = (label, frag, rank) => ({ label, frag, rank });
export const FISCHER_POOL = [
  { id: 'glyceraldehyde', name: 'glyceraldehyde', top: g('CHO', 'C=O', 2), bottom: g('CH₂OH', 'CO', 3), x: g('OH', 'O', 1), flat: 'OCC(O)C=O' },
  { id: 'lactic acid', name: 'lactic acid', top: g('CO₂H', 'C(=O)O', 2), bottom: g('CH₃', 'C', 3), x: g('OH', 'O', 1), flat: 'CC(O)C(=O)O' },
  { id: 'alanine', name: 'alanine', top: g('CO₂H', 'C(=O)O', 2), bottom: g('CH₃', 'C', 3), x: g('NH₂', 'N', 1), flat: 'CC(N)C(=O)O' },
  { id: 'serine', name: 'serine', top: g('CO₂H', 'C(=O)O', 2), bottom: g('CH₂OH', 'CO', 3), x: g('NH₂', 'N', 1), flat: 'NC(CO)C(=O)O' },
  { id: 'butan-2-ol', name: 'butan-2-ol (2-butanol)', top: g('CH₃', 'C', 3), bottom: g('CH₂CH₃', 'CC', 2), x: g('OH', 'O', 1), flat: 'CCC(C)O' },
  { id: '2-chlorobutane', name: '2-chlorobutane', top: g('CH₃', 'C', 3), bottom: g('CH₂CH₃', 'CC', 2), x: g('Cl', 'Cl', 1), flat: 'CCC(C)Cl' },
  { id: '2-bromobutane', name: '2-bromobutane', top: g('CH₃', 'C', 3), bottom: g('CH₂CH₃', 'CC', 2), x: g('Br', 'Br', 1), flat: 'CCC(C)Br' }
];
export const POOL_BY_ID = Object.fromEntries(FISCHER_POOL.map((e) => [e.id, e]));
export const H_GROUP = g('H', '[H]', 4);

/** The usual layout of a pool molecule: chain vertical, X and H horizontal; `xSide` is 'right' or 'left'. */
export function standardDrawing(entry, xSide) {
  const d = { top: entry.top, bottom: entry.bottom };
  d[xSide] = entry.x;
  d[xSide === 'right' ? 'left' : 'right'] = H_GROUP;
  return d;
}

// ---------------------------------------------------------------- reading R/S
/** The positions of ranks 1, 2, 3 and 4 in a drawing. */
export function posByRank(d) {
  const out = {};
  for (const p of POSITIONS) out[d[p].rank] = p;
  return out;
}
/** Direction ('cw' | 'ccw') of 1 -> 2 -> 3 as drawn on the page (y up): the sign of the triangle they make. */
export function drawnDirection(d) {
  const P = posByRank(d);
  const [a, b, c] = [1, 2, 3].map((r) => XY[P[r]]);
  const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
  return cross > 0 ? 'ccw' : 'cw';
}
/** R/S of a drawing, with every step of the reasoning: { label, dir, lowPos, lowVertical, direct, order }. */
export function readRS(d) {
  const P = posByRank(d);
  const dir = drawnDirection(d);
  const lowVertical = isVertical(P[4]);
  const direct = dir === 'cw' ? 'R' : 'S';
  return { label: lowVertical ? direct : otherLabel(direct), dir, lowPos: P[4], lowVertical, direct, order: [P[1], P[2], P[3]] };
}

// ---------------------------------------------------------------- manipulations
const clone = (d) => ({ top: d.top, right: d.right, bottom: d.bottom, left: d.left });
/** Turn the whole projection 180 degrees in the plane of the page. */
export function rotate180(d) { return { top: d.bottom, bottom: d.top, left: d.right, right: d.left }; }
/** Turn the whole projection 90 degrees clockwise in the plane of the page (the group on top goes to the right). */
export function rotate90(d) { return { right: d.top, bottom: d.right, left: d.bottom, top: d.left }; }
/** Swap the groups at two positions. */
export function swap(d, p, q) { const o = clone(d); o[p] = d[q]; o[q] = d[p]; return o; }

export const OPS = ['rot180', 'rot90', 'swap1', 'swap2'];
const PAIRINGS = [[['top', 'bottom'], ['left', 'right']], [['top', 'left'], ['bottom', 'right']], [['top', 'right'], ['bottom', 'left']]];
/** Apply an operation: { drawing, text } where text says what was done to the first drawing. `pick(n)` chooses an index. */
export function applyOp(d, op, pick = () => 0) {
  if (op === 'rot180') return { drawing: rotate180(d), text: 'the whole projection is turned 180° in the plane of the page.' };
  if (op === 'rot90') return { drawing: rotate90(d), text: 'the whole projection is turned 90° in the plane of the page.' };
  if (op === 'swap1') {
    const pairs = [['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right'], ['left', 'right'], ['top', 'bottom']];
    const [p, q] = pairs[pick(pairs.length)];
    return { drawing: swap(d, p, q), text: `the ${d[p].label} and ${d[q].label} groups are swapped.`, pairs: [[p, q]] };
  }
  const [[p, q], [r, s]] = PAIRINGS[pick(PAIRINGS.length)];
  return { drawing: swap(swap(d, p, q), r, s), text: `two swaps are made: the ${d[p].label} and ${d[q].label} groups trade places, and so do the ${d[r].label} and ${d[s].label} groups.`, pairs: [[p, q], [r, s]] };
}
/** The true relationship of drawing B to drawing A read from the two R/S letters: 'same' or 'enantiomers' (one stereocentre). */
export function relationOf(a, b) { return readRS(a).label === readRS(b).label ? 'same' : 'enantiomers'; }
/** The textbook verdict of each operation (what the lesson teaches); the tests check it against relationOf for every case. */
export const OP_VERDICT = { rot180: 'same', rot90: 'enantiomers', swap1: 'enantiomers', swap2: 'same' };

// ---------------------------------------------------------------- SMILES of a drawing (centre first, neighbours top, left, right, bottom)
/** SMILES of the molecule a drawing stands for. Neighbour order top, left, right, bottom with '@' is the geometry of the Fischer convention. */
export function fischerSmiles(d) {
  return `[C@](${d.top.frag})(${d.left.frag})(${d.right.frag})${d.bottom.frag}`;
}
