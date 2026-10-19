// Practice generator "fischer" (Lesson 16): R/S from a Fischer projection, and what a manipulation (turn, swap) does to the molecule.
// Pure logic on top of engine/fischer.js (no RDKit at runtime). Every label the generator produces is the R/S rule applied to the drawing, and the
// tests (tests/lesson16.mjs + tools/check_fischer.py) recompute each drawing in Python RDKit three ways (wedge/dash molblock, 3D coordinates,
// the SMILES this file writes) and compare the letter from rdCIPLabeler with the generator's answer, for every molecule of the pool in every arrangement.
import { FISCHER_POOL, POOL_BY_ID, POSITIONS, H_GROUP, standardDrawing, readRS, applyOp, relationOf, OPS, OP_VERDICT, fischerSmiles, otherLabel, dirWord, isVertical } from './fischer.js';

export const FISCHER_SKILLS = ['fischer'];
export const FISCHER_TASKS = ['rs-h', 'rs-v', 'rs-h', 'manip'];

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const shuffle = (rng, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const RS_HINTS = [
  'Rank the four groups first: the higher atomic number wins at the first atom, and on a tie compare the atoms attached to it. H is always last.',
  'Read 1 → 2 → 3 as drawn on the page. A vertical bond points away from you (read it as it is); a horizontal bond points toward you, so if H is on a horizontal bond, reverse what you read.'
];
export const MANIP_HINTS = [
  'Swapping two groups at a stereocenter gives the mirror image, and swapping a second pair puts it back. Count the swaps.',
  'Turning the whole projection 180° in the page keeps back bonds back and front bonds front, so it is the same molecule. A 90° turn changes which bonds point toward you: that makes the enantiomer.'
];

const ranked = (d) => POSITIONS.map((p) => d[p]).sort((a, b) => a.rank - b.rank);
export const priorityText = (d) => ranked(d).map((g) => g.label).join(' > ');

/** Why the reading of a drawing gives its letter: the whole reasoning in two or three short sentences. */
export function rsDerive(d) {
  const r = readRS(d);
  const where = r.lowVertical ? `on a vertical bond, which points away from you, so the direction is read as it is drawn` : `on a horizontal bond, which points toward you, so the direction is reversed`;
  return `Priorities: ${priorityText(d)}. Going 1 → 2 → 3 turns ${dirWord(r.dir)} on the page. H is ${where}: ${r.lowVertical ? (r.dir === 'cw' ? 'clockwise is R' : 'counterclockwise is S') : (r.dir === 'cw' ? 'clockwise becomes S' : 'counterclockwise becomes R')}. This center is ${r.label}.`;
}
/** The diagnosis for a wrong letter on an R/S round. */
export function rsWhy(d, chosen) {
  const r = readRS(d);
  if (chosen === r.label) return null;
  if (!r.lowVertical) {
    return chosen === r.direct
      ? `You read 1 → 2 → 3 as drawn (${dirWord(r.dir)}) but did not reverse it. H is on a horizontal bond, and a horizontal bond points TOWARD you, so the direction you see is backwards.`
      : `H is on a horizontal bond, so the page reading has to be reversed. Check your priority order and which way 1 → 2 → 3 turns on the page.`;
  }
  return chosen === otherLabel(r.direct)
    ? `H is on a vertical bond, and a vertical bond points AWAY from you: that is exactly the view you want, so there is nothing to reverse. 1 → 2 → 3 turns ${dirWord(r.dir)} on the page.`
    : `H is on a vertical bond (pointing back), so read 1 → 2 → 3 as drawn. Check your priority order and which way the arrow turns on the page.`;
}
/** Why the truth is what it is, for a manipulation. */
export function manipConfirm(op, a, b) {
  const la = readRS(a).label, lb = readRS(b).label;
  const same = la === lb;
  const why = op === 'rot180' ? 'A turn of 180° in the plane of the page keeps every back bond back and every front bond front, so it is the same molecule seen from another side.'
    : op === 'rot90' ? 'A turn of 90° puts the bonds that pointed back onto the horizontal (toward you) and the ones that pointed toward you onto the vertical (back). That is a different arrangement in space: the enantiomer.'
    : op === 'swap1' ? 'Swapping two groups at a stereocenter changes its configuration: one swap gives the enantiomer.'
    : 'Each swap makes the enantiomer, so two swaps put the original arrangement back: the same molecule.';
  return `${why} Check with the letters: A is (${la}), B is (${lb}), ${same ? 'the same letter' : 'opposite letters'}.`;
}
/** The diagnosis for a wrong choice on a manipulation round. */
export function manipWhy(op, truth, chosen) {
  if (chosen === truth) return null;
  if (truth === 'same') {
    return op === 'rot180'
      ? 'Turning the whole projection 180° in the plane of the page keeps vertical bonds pointing back and horizontal bonds pointing toward you. Nothing about the 3D arrangement changes: it is the same molecule.'
      : 'Each swap of two groups gives the mirror image, but a second swap gives it back. Two swaps return the original arrangement: the same molecule.';
  }
  return op === 'rot90'
    ? 'A 90° turn moves the groups that pointed toward you (horizontal) onto the vertical, where they point away, and the other way round. That is NOT the same arrangement in space, so the molecule becomes its mirror image.'
    : 'Swapping two groups exchanges two of the four bonds at the stereocenter, and that gives the mirror image, the enantiomer. One swap is not the same molecule.';
}

// ---------------------------------------------------------------- one round (plain data, JSON-safe)
/** The standard layout of a pool molecule (chain vertical, H horizontal) with X on a random side. */
function standardRound(rng, entry) { return standardDrawing(entry, rng() < 0.5 ? 'right' : 'left'); }
/** An unusual arrangement with H on a vertical bond (top or bottom); the other three groups fill the remaining places in a random order. */
function hVerticalDrawing(rng, entry) {
  const hPos = rng() < 0.5 ? 'bottom' : 'top';
  const rest = POSITIONS.filter((p) => p !== hPos);
  const groups = shuffle(rng, [entry.top, entry.bottom, entry.x]);
  const d = { [hPos]: H_GROUP };
  rest.forEach((p, i) => { d[p] = groups[i]; });
  return d;
}
const plain = (d) => Object.fromEntries(POSITIONS.map((p) => [p, { label: d[p].label, rank: d[p].rank, frag: d[p].frag }]));

/** task: 'rs-h' (H on a horizontal bond), 'rs-v' (H on a vertical bond) or 'manip' (turn / swap). `op` forces the manipulation. */
export function makeRound(rng, task, { entry: entryId = null, op = null } = {}) {
  const entry = entryId ? POOL_BY_ID[entryId] : pick(rng, FISCHER_POOL);
  if (task === 'rs-h' || task === 'rs-v') {
    const d = task === 'rs-h' ? standardRound(rng, entry) : hVerticalDrawing(rng, entry);
    const r = readRS(d);
    return {
      task, entry: entry.id, name: entry.name, drawing: plain(d), answer: r.label, lowVertical: r.lowVertical,
      ask: `Is the chirality center in this Fischer projection of ${entry.name} R or S?${task === 'rs-v' ? ' (This one is drawn in an unusual arrangement; the rules are the same.)' : ''}`,
      options: [{ id: 'R', text: 'R' }, { id: 'S', text: 'S' }],
      derive: rsDerive(d), smiles: fischerSmiles(d), key: `${task}|${entry.id}|${POSITIONS.map((p) => d[p].label).join('/')}`
    };
  }
  const a = standardRound(rng, entry);
  const kind = op || pick(rng, OPS);
  const res = applyOp(a, kind, (n) => Math.floor(rng() * n));
  const truth = relationOf(a, res.drawing);
  return {
    task: 'manip', entry: entry.id, name: entry.name, op: kind, drawing: plain(a), drawing2: plain(res.drawing), answer: truth,
    ask: `A is a Fischer projection of ${entry.name}. B comes from A like this: ${res.text} Read B as a Fischer projection too. Is B the same molecule as A, or its enantiomer?`,
    options: [{ id: 'same', text: 'The same molecule' }, { id: 'enantiomers', text: 'Its enantiomer (the mirror image)' }],
    derive: manipConfirm(kind, a, res.drawing), smiles: fischerSmiles(a), smiles2: fischerSmiles(res.drawing),
    key: `manip|${entry.id}|${kind}|${POSITIONS.map((p) => a[p].label).join('/')}|${POSITIONS.map((p) => res.drawing[p].label).join('/')}`
  };
}
/** Grade a choice on a round: { ok, diagnosis?, confirm }. */
export function gradeRound(round, chosen) {
  if (chosen === round.answer) return { ok: true, confirm: round.derive };
  return { ok: false, diagnosis: round.task === 'manip' ? manipWhy(round.op, round.answer, chosen) : rsWhy(round.drawing, chosen) };
}
/** Rounds for a plan like ['rs-h', 'rs-v', 'rs-h', 'manip']: no two alike. */
export function buildRounds(plan, rng = Math.random) {
  const seen = new Set();
  return plan.map((task) => {
    let r, tries = 0;
    do { r = makeRound(rng, task); tries++; } while (seen.has(r.key) && tries < 12);
    seen.add(r.key);
    return r;
  });
}

// ---------------------------------------------------------------- the mastery / practice problem
export function makeFischerProblem(rng, task) {
  const round = makeRound(rng, task);
  const manip = round.task === 'manip';
  return {
    kind: 'widget', widget: 'fischer-quiz', skill: 'fischer', smiles: null,
    prompt: manip ? 'How is the second Fischer projection related to the first?' : 'Is the chirality center in this Fischer projection R or S?',
    config: { rounds: [round] }, answer: round.answer, round,
    derive: round.derive, hints: manip ? MANIP_HINTS : RS_HINTS
  };
}
export function generateFischer(count, { skill = null, rng = Math.random } = {}) {
  const out = [];
  const start = Math.floor(rng() * FISCHER_TASKS.length);
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeFischerProblem(rng, FISCHER_TASKS[(start + i) % FISCHER_TASKS.length]); tries++; } while (last && last === p.round.key && tries < 6);
    last = p.round.key;
    out.push(p);
  }
  return out;
}
export { isVertical, OP_VERDICT };
