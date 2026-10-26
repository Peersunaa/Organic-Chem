// Mastery generator "skeletal-fg" (Lesson 04). Every answer is computed from RDKit:
// H counts from atom data, formulas from element counts, groups from the SMARTS table in functional-groups.js.
import { analyze, canon } from './chem.js';
import { hCount, lineCount, formulaCounts, hill, formulaOf, condensedOf, condensedToSmiles, molGraph, graphSmiles, subscriptDigits } from './skeletal.js';
import { FG, QUIZ_GROUPS, CONFUSABLE, FG_POOL, classify, matchGroup, singleGroups, notThere } from './functional-groups.js';
import { resolveTasks } from './task-list.js';

export const FG_SKILLS = ['skeletal', 'functional-groups', 'skeletal-convert'];
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


// ---------------------------------------------------------------- skeletal <-> condensed formula (skill 'skeletal-convert')
// Pool: the acyclic FG_POOL molecules without S, plus a few small branched alkanes, alkenes, alcohols and halides. Every answer is computed: condensedOf() writes the formula,
// and a molecule joins the pool only if canon(condensedToSmiles(condensedOf(s))) === canon(s). The three look-alikes are other molecules with the SAME number of heavy atoms:
// simple edits of the right one (a branch moved along the chain, a double bond moved, a CH3 moved to another chain end) and other pool molecules, each different by canonical SMILES.
const EXTRA_CONVERT = ['CC(C)C', 'CC(C)CC', 'CCC(C)CC', 'CC(C)(C)C', 'CC(C)CO', 'CC(C)(C)O', 'CC(C)O', 'CCCCO', 'CC(C)CCl', 'CC(C)(C)Br', 'CC=CC', 'C=CCC', 'CC(C)=C', 'CC(C)CC=O', 'CCC(C)Cl', 'CC(C)C=C', 'CCCC(C)O'];
const roundTrips = (smi) => { try { const c = condensedOf(smi); return !!c && canon(condensedToSmiles(c)) === canon(smi); } catch (e) { return false; } };
let convertCache = null;
/** The molecules the convert task draws from (SMILES), computed once: acyclic, no S, and the condensed formula round-trips. */
export function convertPool() {
  if (!convertCache) {
    const seen = new Set();
    convertCache = [...FG_POOL.map((e) => e.smiles).filter((x) => !/[a-z0-9S]/.test(x)), ...EXTRA_CONVERT].filter((smi) => {
      const c = canon(smi);
      if (!c || seen.has(c) || !roundTrips(smi)) return false;
      seen.add(c); return true;
    });
  }
  return convertCache;
}
const MAXV = { C: 4, N: 3, O: 2, F: 1, Cl: 1, Br: 1, I: 1 };
/** One-step edits of an acyclic molecule with the same heavy atoms: a branch (or a half of the chain) moved to another atom, a multiple bond moved one place along. [{ smiles, dist }], dist = how far the piece moved. */
export function convertEdits(smiles) {
  const g = molGraph(smiles);
  if (!g) return [];
  const n = g.el.length, hetero = (i) => g.el[i] !== 'C';
  const out = [];
  const valid = (adj) => adj.every((es, i) => {
    const sum = es.reduce((t, e) => t + e.order, 0);
    if (sum > MAXV[g.el[i]] || es.filter((e) => e.order > 1).length > 1 || es.some((e) => hetero(i) && hetero(e.to))) return false;
    // no enols, enol ethers, enamines or imidic acids: a C=C or C=N carbon that also holds an O or N by a single bond
    const dbl = es.find((e) => e.order === 2);
    return !(g.el[i] === 'C' && dbl && g.el[dbl.to] !== 'O' && es.some((e) => e.order === 1 && (g.el[e.to] === 'O' || g.el[e.to] === 'N')));
  });
  const cloneAdj = () => g.adj.map((es) => es.map((e) => ({ ...e })));
  /** the atoms on the u side of the bond u-v */
  const side = (u, v) => { const seen = new Set([u]), st = [u]; while (st.length) { const x = st.pop(); g.adj[x].forEach((e) => { if (!seen.has(e.to) && !(x === u && e.to === v)) { seen.add(e.to); st.push(e.to); } }); } return seen; };
  const distFrom = (a) => { const d = Array(n).fill(-1); d[a] = 0; const q = [a]; for (let k = 0; k < q.length; k++) g.adj[q[k]].forEach((e) => { if (d[e.to] < 0) { d[e.to] = d[q[k]] + 1; q.push(e.to); } }); return d; };
  const emit = (adj, dist) => { out.push({ smiles: graphSmiles({ el: g.el, h: g.h, adj }), dist }); };
  // move the piece on the u side of the bond u-v to another atom q on the v side
  for (let u = 0; u < n; u++) for (const e of g.adj[u]) {
    const v = e.to, d = distFrom(v), piece = side(u, v);
    for (let q = 0; q < n; q++) {
      if (piece.has(q) || q === v || d[q] > 3) continue;
      const adj = cloneAdj();
      adj[u] = adj[u].filter((x) => x.to !== v); adj[v] = adj[v].filter((x) => x.to !== u);
      adj[u].push({ to: q, order: e.order }); adj[q].push({ to: u, order: e.order });
      if (valid(adj)) emit(adj, d[q]);
    }
  }
  // move a multiple bond one place along: x=y becomes x-y and the order moves to y-z
  for (let a = 0; a < n; a++) for (const e of g.adj[a]) {
    if (e.order < 2 || a > e.to) continue;
    for (const [x, y] of [[a, e.to], [e.to, a]]) for (const f of g.adj[y]) {
      if (f.to === x || f.order !== 1) continue;
      const adj = cloneAdj();
      adj[x].find((z) => z.to === y).order = 1; adj[y].find((z) => z.to === x).order = 1;
      adj[y].find((z) => z.to === f.to).order = e.order; adj[f.to].find((z) => z.to === y).order = e.order;
      if (valid(adj)) emit(adj, 1);
    }
  }
  return out;
}
/** Three look-alike molecules for `smi`: same heavy-atom count, different compounds (canonical SMILES), each with a condensed formula that round-trips. null if fewer than three exist. */
export function convertDistractors(rng, smi) {
  const heavy = (x) => analyze(x).heavy.length, want = heavy(smi);
  const taken = new Set([canon(smi)]), out = [];
  const add = (x) => { const c = canon(x); if (!c || taken.has(c) || heavy(x) !== want || !roundTrips(x)) return false; taken.add(c); out.push(x); return true; };
  const edits = shuffle(rng, convertEdits(smi)).sort((a, b) => a.dist - b.dist);
  for (const e of edits) { if (out.length >= 3) break; add(e.smiles); }
  for (const x of shuffle(rng, convertPool())) { if (out.length >= 3) break; add(x); }
  return out.length === 3 ? out : null;
}
const groupsText = (smi) => { const gs = classify(smi).filter((id) => FG[id].quiz); return gs.length ? gs.map((id) => (id === 'alkane' ? 'an alkane (no functional group)' : `${FG[id].article} ${FG[id].name}`)).join(' and ') : 'a molecule with no group from the table'; };
/** What separates molecule x from the target, in words: a different formula or group, or the same atoms and kind of group arranged differently. `other` names the target ("the formula", "this drawing"). */
function differs(x, smi, other) {
  const gx = groupsText(x), gs = groupsText(smi), fx = formulaOf(x), fs = formulaOf(smi);
  return gx !== gs || fx !== fs ? `${gx} (${fx}), but ${other} is ${gs} (${fs})` : `an isomer: the same atoms (${fx}) and the same kind of group, but arranged differently along the chain, so it is a different compound`;
}
function convertProblem(rng) {
  let smi, wrong = null;
  for (let t = 0; t < 40 && !wrong; t++) { smi = pick(rng, convertPool()); wrong = convertDistractors(rng, smi); }
  if (!wrong) throw new Error('no distractors for the convert task');
  const cond = condensedOf(smi), shown = subscriptDigits(cond);
  const toSkeleton = rng() < 0.5;
  const derive = `Count the carbons along the backbone and give each one 4 − (bonds drawn) hydrogens: ${shown}.`;
  const cands = shuffle(rng, [smi, ...wrong]);
  if (toSkeleton) {
    const options = cands.map((x, i) => {
      const right = x === smi;
      return {
        smiles: x, text: 'Option ' + 'ABCD'[i], correct: right,
        why: right ? `Yes. ${shown} is this molecule: ${formulaOf(x)}.` : `This is ${subscriptDigits(condensedOf(x))}, not ${shown}: it is ${differs(x, smi, 'the formula')}.`
      };
    });
    return {
      kind: 'choice', skill: 'skeletal-convert', smiles: null, reaction: null, direction: 'to-skeletal', condensed: cond,
      prompt: 'Which skeletal drawing is this condensed formula? ' + shown,
      options, answer: options.find((o) => o.correct).text, target: smi, derive,
      hints: ['Read the formula left to right: each CH3, CH2 or CH is one carbon of the chain, and a group in brackets is a branch on the carbon just before it.', 'Draw the chain as a zigzag, hang every branch on the carbon it follows, and check that each carbon has 4 minus (lines into it) hydrogens.']
    };
  }
  const options = cands.map((x) => {
    const c = subscriptDigits(condensedOf(x)), right = x === smi;
    return {
      text: c, correct: right,
      why: right ? `Yes. ${c} matches the drawing carbon by carbon.` : `That formula, ${c}, is ${differs(x, smi, 'this drawing')}. Check by counting the carbons along the chain and the hydrogens on each.`
    };
  });
  return {
    kind: 'choice', skill: 'skeletal-convert', smiles: smi, reaction: null, direction: 'to-condensed', condensed: cond,
    prompt: 'Which condensed formula matches this drawing?',
    options, answer: options.find((o) => o.correct).text, target: smi, derive,
    hints: ['Count the carbons along the longest chain and note what hangs off each one (a branch, OH, a halogen, a double bond).', 'Each carbon is written with its hydrogens: 4 minus (lines into it), so CH3 at a chain end, CH2 in a plain chain, CH where a branch leaves.']
  };
}

export const FG_TASKS = ['hcount', 'formula', 'name', 'find'];
const BY_SKILL = { skeletal: ['hcount', 'formula'], 'functional-groups': ['name', 'find'], 'skeletal-convert': ['convert'] };
const ALL_TASKS = [...FG_TASKS, 'convert'];   // FG_TASKS stays the default mix (Lesson 04 mastery); 'convert' is served by skill 'skeletal-convert' or tasks: ['convert']
const MULTI = FG_POOL.filter((e) => e.smiles.length >= 3);

export function makeFgProblem(rng, task, entry) {
  const e = entry || pick(rng, task === 'find' ? FG_POOL.filter((x) => singleGroups(x.smiles).length) : task === 'name' ? FG_POOL : MULTI);
  switch (task) {
    case 'hcount': return hProblem(rng, e);
    case 'formula': return formulaProblem(rng, e);
    case 'name': return nameProblem(rng, e);
    case 'find': return findProblem(rng, e);
    case 'convert': return convertProblem(rng);
    default: throw new Error('unknown task ' + task);
  }
}

export function generateFg(count, { skill = null, rng = Math.random, tasks: only = null } = {}) {
  const tasks = resolveTasks(only, skill && BY_SKILL[skill] ? BY_SKILL[skill] : FG_TASKS, ALL_TASKS);
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
