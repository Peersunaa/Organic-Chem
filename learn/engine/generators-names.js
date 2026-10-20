// Mastery generator "alkane-names" (Lesson 05). Molecules are built programmatically (random branched alkane C5-C9 or a
// substituted cycloalkane) and every answer comes from engine/naming.js, which the tests check against OPSIN.
import { canon } from './chem.js';
import {
  nameBoth, alkaneInfo, buildSmiles, wrongNames, diagnoseTyped, subName, subSize, subRooted,
  parseAlkane, CLASS_NAMES, ROOT_NAMES
} from './naming.js';
import { resolveTasks } from './task-list.js';

export const NAMING_SKILLS = ['naming'];
export const NAME_TASKS = ['name', 'pick', 'class'];
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const CHAIN_SUBS = [['methyl', 6], ['ethyl', 4], ['propyl', 1], ['isopropyl', 3], ['butyl', 1], ['isobutyl', 1], ['sec-butyl', 1], ['tert-butyl', 2]];
const RING_SUBS = [['methyl', 6], ['ethyl', 4], ['propyl', 1], ['isopropyl', 3], ['sec-butyl', 1], ['isobutyl', 1], ['tert-butyl', 2]];
function weighted(rng, table, ok) {
  const t = table.filter(([id]) => ok(id));
  if (!t.length) return null;
  const total = t.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [id, w] of t) { r -= w; if (r <= 0) return id; }
  return t[t.length - 1][0];
}

/** A random branched alkane with 5-9 carbons: a main chain of 4-8 carbons with branches on its inner carbons. */
export function randomAcyclic(rng) {
  for (let tries = 0; tries < 200; tries++) {
    const N = 5 + Math.floor(rng() * 5);
    const m = 4 + Math.floor(rng() * Math.max(1, N - 4));
    if (m >= N) continue;
    let budget = N - m;
    const subs = [], used = {};
    while (budget > 0) {
      const id = weighted(rng, CHAIN_SUBS, (x) => subSize(x) <= budget);
      if (!id) break;
      const free = [];
      for (let p = 2; p <= m - 1; p++) if ((used[p] || 0) < 2) free.push(p);
      if (!free.length) break;
      const loc = pick(rng, free);
      used[loc] = (used[loc] || 0) + 1; subs.push({ id, loc }); budget -= subSize(id);
    }
    if (budget > 0 || !subs.length) continue;
    const smi = buildSmiles({ kind: 'chain', size: m, subs });
    if (smi && nameBoth(smi) && parseAlkane(smi)) return smi;
  }
  return 'CC(C)CC(C)C';
}

/** A random cycloalkane with 1-3 simple substituents; no chain is longer than the ring, so the ring is always the parent. */
export function randomRing(rng) {
  for (let tries = 0; tries < 200; tries++) {
    const size = pick(rng, [3, 4, 5, 5, 6, 6, 6, 7, 8]);
    const k = pick(rng, [1, 2, 2, 2, 3]);
    const subs = [], used = {};
    let carbons = size;
    for (let j = 0; j < k; j++) {
      const id = weighted(rng, RING_SUBS, (x) => subRooted(x) <= size && carbons + subSize(x) <= 10);
      if (!id) break;
      const loc = 1 + Math.floor(rng() * size);
      if ((used[loc] || 0) >= 2) continue;
      used[loc] = (used[loc] || 0) + 1; subs.push({ id, loc }); carbons += subSize(id);
    }
    if (!subs.length) continue;
    const smi = buildSmiles({ kind: 'ring', size, subs });
    if (smi && nameBoth(smi) && alkaneInfo(smi, 'new').parent.kind === 'ring') return smi;
  }
  return 'CC1CCC(C)CC1';
}

export function randomMolecule(rng) { return rng() < 0.65 ? randomAcyclic(rng) : randomRing(rng); }

// ---- explanations
function groupSubs(info, mode) {
  const g = {};
  info.subs.forEach((s) => { (g[s.id] ||= []).push(s.loc); });
  return g;
}
function worked(smi) {
  const n = alkaneInfo(smi, 'new'), o = alkaneInfo(smi, 'old');
  const g = groupSubs(n);
  const words = Object.entries(g).map(([id, locs]) => `${subName(id, 'new')} on C${locs.sort((a, b) => a - b).join(', C')}`);
  const nm = n.name, old = o.name;
  const tail = nm === old ? `Name: ${nm}.` : `Name: ${nm} (traditional style: ${old}).`;
  if (n.parent.kind === 'ring') {
    const bran = words.length ? ` Branches: ${words.join('; ')}.` : '';
    return `The ring has ${n.parent.size} carbons, at least as many as any chain on it, so it is the parent: ${ROOT_NAMES[n.parent.size - 1] ? 'cyclo' + ROOT_NAMES[n.parent.size - 1] : ''}.${bran} Number the ring so the locants are as low as possible; on a tie the branch that is first alphabetically gets 1. ${tail}`;
  }
  return `Longest chain: ${n.parent.size} carbons (${ROOT_NAMES[n.parent.size - 1]}). Numbered from the end that gives the branches the lowest numbers: ${words.join('; ')}. List them alphabetically (ignore di-, tri-) with their numbers. ${tail}`;
}

// ---- problem kinds
function nameProblem(rng, smi) {
  const nb = nameBoth(smi);
  const info = alkaneInfo(smi, 'new');
  const ring = info.parent.kind === 'ring';
  return {
    kind: 'input', skill: 'naming', smiles: smi, highlight: [], name: true,
    prompt: 'Name this alkane. Type the IUPAC name: either naming style is accepted, and spaces or hyphens do not matter.',
    answer: nb.new, accept: nb.old !== nb.new ? [nb.old] : [],
    wrong: wrongNames(smi).map((w) => ({ match: w.name, why: w.why })),
    diagnoseFn: (raw) => diagnoseTyped(smi, raw),
    fallback: 'That is not the name I get. Work through it in order: parent (longest chain or the ring), numbering (lowest locants), alphabetical order, then punctuation.',
    derive: worked(smi),
    hints: ring
      ? ['The ring is the parent here. Count its carbons for the root (cyclopentane, cyclohexane ...), then name the branches on it.', 'Number the ring so the locants are as low as possible. If that is a tie, the branch that comes first alphabetically gets number 1. A single branch needs no number.']
      : ['Find the longest continuous chain (it may bend around a corner) and number it from the end nearer the first branch.', 'Name each branch with its number, put the prefixes in alphabetical order (ignore di- and tri-), and write the whole name as one word.']
  };
}

const LETTERS = ['A', 'B', 'C', 'D'];
function distractorList(rng, smi) {
  const info = alkaneInfo(smi, 'new');
  const baseCanon = canon(smi);
  const L = info.parent.size, isRing = info.parent.kind === 'ring';
  const base = info.subs.map((s) => ({ id: s.id, loc: s.loc }));
  const groups = { mirror: [], shift: [], swap: [], size: [] };
  const seen = new Set([baseCanon]);
  const add = (type, spec, why) => {
    const s = buildSmiles(spec);
    if (!s) return;
    const c = canon(s);
    if (!c || seen.has(c) || !nameBoth(s)) return;
    const back = alkaneInfo(s, 'new');
    if (back.parent.kind !== spec.kind || back.parent.size !== spec.size) return; // keep the wording below literally true
    seen.add(c); groups[type].push({ smiles: s, why });
  };
  const nm = (id) => subName(id, 'new');
  if (!isRing) add('mirror', { kind: 'chain', size: L, subs: base.map((s) => ({ id: s.id, loc: L + 1 - s.loc })) }, 'The branches here are counted from the other end of the chain. The name counts from the end where the first branch gets the lower number.');
  base.forEach((s, i) => {
    for (const d of [-1, 1]) {
      const loc = s.loc + d;
      const ok = isRing ? loc >= 1 && loc <= L : loc >= 2 && loc <= L - 1;
      if (!ok) continue;
      const subs = base.map((x, k) => (k === i ? { id: x.id, loc } : x));
      add('shift', { kind: info.parent.kind, size: L, subs }, `The name puts the ${nm(s.id)} group on carbon ${s.loc} of the parent. In this drawing it is on carbon ${loc}, counting from the same end.`);
    }
    const swaps = { methyl: ['ethyl'], ethyl: ['methyl', 'propyl'], propyl: ['isopropyl', 'ethyl'], isopropyl: ['propyl'], 'tert-butyl': ['isobutyl', 'sec-butyl'], 'sec-butyl': ['isobutyl', 'butyl'], isobutyl: ['sec-butyl'], butyl: ['sec-butyl'] }[s.id] || [];
    for (const other of swaps) {
      if (isRing && subRooted(other) > L) continue;
      add('swap', { kind: info.parent.kind, size: L, subs: base.map((x, k) => (k === i ? { id: other, loc: x.loc } : x)) }, `In this drawing that branch is ${subName(other, 'new')}, not ${nm(s.id)} as the name says.`);
    }
  });
  for (const d of [-1, 1]) {
    const size = L + d;
    if (size < (isRing ? 3 : 4)) continue;
    if (!base.every((s) => s.loc <= size && (isRing || (s.loc >= 2 && s.loc <= size - 1)))) continue;
    add('size', { kind: info.parent.kind, size, subs: base }, `The parent ${isRing ? 'ring' : 'chain'} in this drawing has ${size} carbons, but the name says ${L}.`);
  }
  const order = shuffle(rng, ['mirror', 'shift', 'swap', 'size']);
  const out = [];
  for (const t of order) if (groups[t].length && out.length < 3) out.push(pick(rng, groups[t]));
  for (const t of order) for (const x of shuffle(rng, groups[t])) if (out.length < 3 && !out.includes(x)) out.push(x);
  return out;
}

function pickProblem(rng, smi) {
  const nb = nameBoth(smi);
  const wrong = distractorList(rng, smi);
  if (wrong.length < 3) return null;
  const opts = shuffle(rng, [{ smiles: smi, correct: true, why: 'Yes: this drawing has exactly the parent and branches the name describes.' }, ...wrong.map((w) => ({ smiles: w.smiles, why: w.why }))])
    .map((o, i) => ({ ...o, text: LETTERS[i] }));
  const answer = LETTERS[opts.findIndex((o) => o.correct)];
  return {
    kind: 'choice', skill: 'naming', smiles: null, highlight: [],
    prompt: `Which structure is ${nb.new}${nb.old !== nb.new ? ' (traditional style: ' + nb.old + ')' : ''}?`,
    promptHtml: `Which structure is <name new="${nb.new}" old="${nb.old}"></name>?`,
    options: opts, answer,
    derive: `${nb.new}${nb.old !== nb.new ? ' (traditional style: ' + nb.old + ')' : ''}: ${worked(smi).split('. Name:')[0]}. The correct drawing is ${answer}.`,
    target: smi,
    hints: ['Start with the parent in the name: draw that many carbons in a row (or the ring), then number them from one end.', 'Hang each branch on the carbon its number names. Check the drawing by renaming it.']
  };
}

function classProblem(rng, smi) {
  const g = parseAlkane(smi);
  const byClass = {};
  g.adj.forEach((nb, i) => { (byClass[nb.length] ||= []).push(i); });
  const cls = pick(rng, Object.keys(byClass).map(Number).filter((c) => c >= 1 && c <= 4));
  const idx = pick(rng, byClass[cls]);
  const names = { 1: '1° (primary)', 2: '2° (secondary)', 3: '3° (tertiary)', 4: '4° (quaternary)' };
  const opts = [1, 2, 3, 4].map((c) => ({
    text: names[c], correct: c === cls,
    why: c === cls ? `Yes: it is bonded to ${plural(cls, 'other carbon')}, so it is ${CLASS_NAMES[cls]}.`
      : `${CLASS_NAMES[c].replace(/^./, (x) => x.toUpperCase())} means bonded to ${plural(c, 'other carbon')}, but this carbon touches ${cls}. Count carbon neighbours only: hydrogens do not count.`
  }));
  return {
    kind: 'choice', skill: 'naming', smiles: smi, highlight: [idx],
    prompt: 'Is the highlighted carbon primary, secondary, tertiary or quaternary?',
    options: opts, answer: names[cls],
    derive: `The highlighted carbon is bonded to ${plural(cls, 'other carbon')} (hydrogens are not counted), so it is ${CLASS_NAMES[cls]}.`,
    hints: ['The class is the number of other carbons bonded to the carbon: count the lines to carbons.', '1 carbon neighbour = primary, 2 = secondary, 3 = tertiary, 4 = quaternary. Hydrogens do not count.']
  };
}

export function makeNameProblem(rng, task, smi) {
  for (let t = 0; t < 12; t++) {
    const s = smi || randomMolecule(rng);
    let p = null;
    if (task === 'name') p = nameProblem(rng, s);
    else if (task === 'pick') p = pickProblem(rng, s);
    else if (task === 'class') p = classProblem(rng, s);
    else throw new Error('unknown task ' + task);
    if (p) return p;
    if (smi) break;
  }
  return nameProblem(rng, 'CC(C)CC(C)C');
}

export function generateNames(count, { skill = null, rng = Math.random, tasks: only = null } = {}) {
  const tasks = resolveTasks(only, NAME_TASKS, NAME_TASKS);
  const out = [];
  let last = null;
  const start = Math.floor(rng() * tasks.length);
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeNameProblem(rng, tasks[(start + i) % tasks.length]); tries++; } while (last && (p.smiles || p.target) === last && tries < 6);
    last = p.smiles || p.target;
    out.push(p);
  }
  return out;
}
