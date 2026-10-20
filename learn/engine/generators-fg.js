// Mastery generator "skeletal-fg" (Lesson 04). Every answer is computed from RDKit:
// H counts from atom data, formulas from element counts, groups from the SMARTS table in functional-groups.js.
import { analyze } from './chem.js';
import { hCount, lineCount, formulaCounts, hill } from './skeletal.js';
import { FG, QUIZ_GROUPS, CONFUSABLE, FG_POOL, classify, matchGroup, singleGroups, notThere } from './functional-groups.js';
import { resolveTasks } from './task-list.js';

export const FG_SKILLS = ['skeletal', 'functional-groups'];
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Specific, named confusions (correct group -> the look-alike that was picked).
const TRAPS = {
  'ketone|aldehyde': 'An aldehyde has its C=O at the END of a chain, so the carbonyl carbon holds an H. Here the carbonyl carbon sits between two carbons.',
  'aldehyde|ketone': 'A ketone has its C=O between two carbons. Here the carbonyl carbon is at the end of the chain and holds an H.',
  'ester|ether': 'An ether has only an O between two carbons. This O is next to a C=O, which makes it an ester.',
  'ether|ester': 'An ester needs a C=O next to the O. Here the O sits between two carbons with no C=O beside it, so it is an ether.',
  'alcohol|acid': 'A carboxylic acid has the OH on a C=O carbon. This OH is on a carbon with only single bonds, so it is an alcohol.',
  'acid|alcohol': 'An alcohol has OH on a carbon with only single bonds. This OH is on a C=O carbon, which makes it a carboxylic acid.',
  'acid|ester': 'An ester has O–C on the carbonyl carbon. Here the O carries an H, so it is a carboxylic acid.',
  'ester|acid': 'A carboxylic acid has O–H on the carbonyl carbon. Here the O is bonded to a carbon instead of an H, so it is an ester.',
  'amine|amide': 'An amide has the N on a C=O carbon. This N is not next to a C=O, so it is an amine.',
  'amide|amine': 'An amine has an N with no C=O beside it. This N is bonded to a C=O carbon, which makes it an amide.',
  'nitrile|alkyne': 'An alkyne is C≡C. This triple bond ends in N, so it is a nitrile.',
  'alkyne|nitrile': 'A nitrile is C≡N. This triple bond is between two carbons, so it is an alkyne.'
};

function distractors(rng, correct, present, avoid) {
  const bad = new Set([correct, ...present, ...avoid]);
  const near = (CONFUSABLE[correct] || []).filter((g) => !bad.has(g) && FG[g].quiz);
  const rest = shuffle(rng, QUIZ_GROUPS.filter((g) => !bad.has(g) && !near.includes(g)));
  return near.concat(rest).slice(0, 3);
}

function nameProblem(rng, entry) {
  const present = classify(entry.smiles).filter((g) => FG[g].quiz);
  const targets = present.filter((g) => !FG[g].none);
  const alkane = present.includes('alkane');
  const correct = alkane ? 'alkane' : pick(rng, targets);
  const atoms = alkane ? [] : matchGroup(entry.smiles, correct);
  const wrong = distractors(rng, correct, present, entry.avoid || []);
  const label = (g) => (g === 'alkane' ? 'alkane (no functional group)' : FG[g].name);
  const opts = shuffle(rng, [correct, ...wrong]).map((g) => ({
    text: label(g), correct: g === correct,
    why: g === correct ? `Yes: ${FG[g].look}.` : (TRAPS[`${correct}|${g}`] || notThere(g))
  }));
  return {
    kind: 'choice', skill: 'functional-groups', smiles: entry.smiles, highlight: atoms,
    prompt: alkane ? 'This molecule has only C and H atoms and only single bonds. What family is it?' : 'Which functional group do the highlighted atoms make up?',
    options: opts, answer: label(correct),
    derive: alkane ? 'Only C–C and C–H single bonds, no heteroatoms and no multiple bonds: an alkane, which has no functional group.' : `The highlighted atoms are ${FG[correct].look}, so the group is ${FG[correct].article} ${FG[correct].name}.`,
    hints: ['Look at the highlighted atoms only: which elements are they, and how are they bonded?', 'Check what sits on a C=O carbon (H, C, O or N) or what the O or N is bonded to.']
  };
}

function findProblem(rng, entry) {
  const opts = singleGroups(entry.smiles);
  const g = pick(rng, opts);
  return {
    kind: 'groupfind', skill: 'functional-groups', smiles: entry.smiles, highlight: [],
    prompt: `Find the ${FG[g].name} in this molecule.`,
    config: { smiles: entry.smiles, group: g },
    answer: matchGroup(entry.smiles, g).join(','),
    derive: `${cap(FG[g].name)}: ${FG[g].look}. Tap ${FG[g].tap}.`,
    hints: [`${cap(FG[g].name)}: ${FG[g].look}.`, `Tap ${FG[g].tap}.`]
  };
}

function hProblem(rng, entry) {
  const info = analyze(entry.smiles);
  const c = pick(rng, info.atoms.filter((a) => a.sym === 'C'));
  const n = hCount(entry.smiles, c.idx), lines = lineCount(entry.smiles, c.idx);
  const nbrs = c.nbrs.length;
  const wrong = [];
  if (lines !== n) wrong.push({ match: lines, why: `${lines} is the number of lines into the carbon. Carbon needs 4 bonds in total, so the hydrogens fill the rest: 4 − ${lines} = ${n}.` });
  if (nbrs !== lines && nbrs !== n) wrong.push({ match: nbrs, why: `${nbrs} counts the neighbouring atoms. A double bond is two lines (two of carbon’s four bonds) even though it goes to one neighbour, so the lines add up to ${lines} and the H count is 4 − ${lines} = ${n}.` });
  return {
    kind: 'input', skill: 'skeletal', smiles: entry.smiles, highlight: [c.idx],
    prompt: 'How many hydrogens are on the highlighted carbon? (They are not drawn.)',
    answer: n,
    derive: `The carbon has ${lines} line${lines === 1 ? '' : 's'} into it (a double bond counts as 2), so it has 4 − ${lines} = ${n} hydrogen${n === 1 ? '' : 's'}.`,
    wrong: wrong.filter((w) => w.match !== n),
    hints: ['Carbon always has four bonds in total. Count the lines that reach the highlighted carbon, counting a double bond as 2.', 'Hydrogens = 4 minus the number of lines into the carbon.']
  };
}

function formulaProblem(rng, entry) {
  const cnt = formulaCounts(entry.smiles);
  const f = hill(cnt);
  const parts = Object.entries(cnt).map(([k, v]) => `${v} ${k}`);
  return {
    kind: 'input', skill: 'skeletal', smiles: entry.smiles, highlight: [], formula: true,
    prompt: 'What is the molecular formula? (Type it like C4H8O; subscripts or plain digits both work.)',
    answer: f,
    derive: `Count one C at every corner and line end, add the hydrogens on each carbon (4 minus the lines into it) and every atom that is written out: ${parts.join(', ')} = ${f}.`,
    wrong: [],
    hints: ['First count the carbons: one at every corner and at every line end. Then the written atoms (O, N, Cl …).', 'Add the hydrogens: each carbon has 4 minus (lines into it), plus any H written on O or N.']
  };
}

export const FG_TASKS = ['hcount', 'formula', 'name', 'find'];
const BY_SKILL = { skeletal: ['hcount', 'formula'], 'functional-groups': ['name', 'find'] };
const MULTI = FG_POOL.filter((e) => e.smiles.length >= 3);

export function makeFgProblem(rng, task, entry) {
  const e = entry || pick(rng, task === 'find' ? FG_POOL.filter((x) => singleGroups(x.smiles).length) : task === 'name' ? FG_POOL : MULTI);
  switch (task) {
    case 'hcount': return hProblem(rng, e);
    case 'formula': return formulaProblem(rng, e);
    case 'name': return nameProblem(rng, e);
    case 'find': return findProblem(rng, e);
    default: throw new Error('unknown task ' + task);
  }
}

export function generateFg(count, { skill = null, rng = Math.random, tasks: only = null } = {}) {
  const tasks = resolveTasks(only, skill && BY_SKILL[skill] ? BY_SKILL[skill] : FG_TASKS, FG_TASKS);
  const out = [];
  let last = null;
  const start = Math.floor(rng() * tasks.length);
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeFgProblem(rng, tasks[(start + i) % tasks.length]); tries++; } while (last && p.smiles === last && tries < 6);
    last = p.smiles;
    out.push(p);
  }
  return out;
}
