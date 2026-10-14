// Mastery generator "alkene-names" (Lesson 07). Molecules are built programmatically; every name comes from engine/naming.js
// (checked against OPSIN in the tests) and every E/Z answer from engine/cip.js (checked against RDKit's new CIP labeler).
// Three tasks, fresh each run: name an alkene (typed, either style, E/Z when needed), assign E/Z with the cip-ranker widget,
// and decide whether an alkene shows cis/trans isomerism.
import { subFragment, nameAlkeneBoth, alkeneInfo, alkeneAltNames, wrongAlkeneNames, diagnoseAlkene, subName } from './naming.js';
import { ezInfo, usesDuplicate, symOf, sphereSets } from './cip.js';

export const ALKENE_SKILLS = ['ez'];
export const ALKENE_TASKS = ['name', 'ez', 'cistrans'];
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const ROOT = ['meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct'];

function weighted(rng, table) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [id, w] of table) { r -= w; if (r <= 0) return id; }
  return table[table.length - 1][0];
}
const SUBS = [['methyl', 10], ['ethyl', 4], ['isopropyl', 2], ['tert-butyl', 1], ['propyl', 1]];

/**
 * A chain SMILES with multiple bonds. spec: { size, bonds:[{pos, order}] (the bond joins C<pos> and C<pos+1>),
 * subs:[{id, loc}], marks: 'random' | '' }. Directional marks (/ \) are added on the single bonds next to every C=C so that E/Z is defined.
 */
export function buildChain(spec, rng = Math.random) {
  const n = spec.size;
  const order = {}; spec.bonds.forEach((b) => { order[b.pos] = b.order; });
  const per = Array.from({ length: n + 1 }, () => []);
  for (const s of spec.subs || []) { const f = subFragment(s.id); if (!f || s.loc < 1 || s.loc > n) return null; per[s.loc].push(f); }
  const mark = {};
  if (spec.marks === 'random') {
    for (const b of spec.bonds) if (b.order === 2) {
      if (b.pos > 1 && !order[b.pos - 1] && mark[b.pos - 1] === undefined) mark[b.pos - 1] = rng() < 0.5 ? '/' : '\\';
      if (b.pos + 1 < n && !order[b.pos + 2 - 1] && mark[b.pos + 1] === undefined) mark[b.pos + 1] = rng() < 0.5 ? '/' : '\\';
    }
  }
  let out = '';
  for (let i = 1; i <= n; i++) {
    out += 'C' + per[i].map((f) => `(${f})`).join('');
    if (i < n) out += order[i] === 2 ? '=' : order[i] === 3 ? '#' : mark[i] || '';
  }
  return out;
}

function buildRing(spec) {
  const n = spec.size;
  const per = Array.from({ length: n + 1 }, () => []);
  for (const s of spec.subs || []) { const f = subFragment(s.id); if (!f) return null; per[s.loc].push(f); }
  let out = '';
  for (let i = 1; i <= n; i++) {
    out += 'C' + (i === 1 ? '9' : '') + per[i].map((f) => `(${f})`).join('') + (i === n ? '9' : '');
    if (i === 1) out += '=';
  }
  return out;
}

/** A random alkene, alkyne, diene or cycloalkene the naming engine can name. */
export function randomAlkene(rng = Math.random) {
  for (let tries = 0; tries < 300; tries++) {
    const kind = weighted(rng, [['ene', 48], ['diene', 14], ['yne', 12], ['ring', 26]]);
    let smi = null;
    if (kind === 'ring') {
      const size = pick(rng, [5, 6, 6, 7]);
      const k = pick(rng, [0, 1, 1, 1, 2, 2]);
      const subs = [], used = {};
      for (let j = 0; j < k; j++) {
        const id = weighted(rng, [['methyl', 10], ['ethyl', 4], ['isopropyl', 1]]);
        const loc = 1 + Math.floor(rng() * size);
        const cap = loc <= 2 ? 1 : 2;
        if ((used[loc] || 0) >= cap) continue;
        used[loc] = (used[loc] || 0) + 1; subs.push({ id, loc });
      }
      smi = buildRing({ size, subs });
    } else {
      const size = kind === 'diene' ? 5 + Math.floor(rng() * 4) : 4 + Math.floor(rng() * 5);
      let bonds, free;
      if (kind === 'diene') {
        const p1 = 1 + Math.floor(rng() * (size - 3));
        const p2 = p1 + 2 + Math.floor(rng() * (size - p1 - 2));
        if (p2 >= size) continue;
        bonds = [{ pos: p1, order: 2 }, { pos: p2, order: 2 }];
      } else bonds = [{ pos: 1 + Math.floor(rng() * (size - 1)), order: kind === 'yne' ? 3 : 2 }];
      const sp2 = new Set(); bonds.forEach((b) => { sp2.add(b.pos); sp2.add(b.pos + 1); });
      const subs = [], used = {};
      const k = kind === 'diene' ? pick(rng, [0, 0, 1]) : pick(rng, [0, 1, 1, 2, 2]);
      for (let j = 0; j < k; j++) {
        const id = weighted(rng, SUBS);
        const locs = [];
        for (let l = 2; l <= size - 1; l++) {
          if (kind === 'yne' && sp2.has(l)) continue; // sp carbons take no substituent
          const cap = sp2.has(l) ? 1 : 2;
          if ((used[l] || 0) < cap) locs.push(l);
        }
        if (!locs.length) continue;
        const loc = pick(rng, locs);
        used[loc] = (used[loc] || 0) + 1; subs.push({ id, loc });
      }
      smi = buildChain({ size, bonds, subs, marks: kind === 'yne' ? '' : 'random' }, rng);
    }
    if (!smi) continue;
    const nb = nameAlkeneBoth(smi);
    if (nb && smi.length < 40) return smi;
  }
  return 'CC=CC(C)C';
}

// ---- E/Z pieces: [SMILES fragment written from the attachment atom, how it reads]
export const PIECES = {
  H: null,
  Me: 'C', Et: 'CC', Pr: 'CCC', iPr: 'C(C)C', tBu: 'C(C)(C)C',
  F: 'F', Cl: 'Cl', Br: 'Br', OH: 'O', OMe: 'OC',
  CH2OH: 'CO', CH2Cl: 'CCl', CH2Br: 'CBr', vinyl: 'C=C', CHO: 'C=O', CN: 'C#N', COOH: 'C(=O)O', ethynyl: 'C#C'
};
const PIECE_W = { H: 5, Me: 8, Et: 5, Pr: 2, iPr: 3, tBu: 2, F: 1, Cl: 3, Br: 3, OH: 2, OMe: 1, CH2OH: 4, CH2Cl: 2, CH2Br: 2, vinyl: 3, CHO: 1, CN: 1, COOH: 1, ethynyl: 1 };

/** `X1 \ C(X2) = C(/ Y1) Y2`: SMILES for a double bond with groups X1, X2 and Y1, Y2 and the given geometry (X1 and Y1 'cis' or 'trans'). */
export function ezSmiles(x1, x2, y1, y2, rel) {
  const f = (k) => PIECES[k];
  let [a, b] = f(x1) ? [x1, x2] : [x2, x1];
  let [c, d] = f(y1) ? [y1, y2] : [y2, y1];
  if (!f(a) || !f(c)) return null;
  // X1 written with '\' (below), Y1 with '/' (above) are trans; '\' and '\' are cis
  return `C(\\${f(a)})${f(b) ? `(${f(b)})` : ''}=C(${rel === 'cis' ? '\\' : '/'}${f(c)})${f(d) || ''}`;
}

/** A random trisubstituted / tetrasubstituted alkene with a defined geometry whose E/Z comes from the sequence rules. */
export function randomEz(rng = Math.random, want = null) {
  const keys = Object.keys(PIECES);
  const table = keys.map((k) => [k, PIECE_W[k]]);
  for (let tries = 0; tries < 400; tries++) {
    const x1 = weighted(rng, table), x2 = weighted(rng, table), y1 = weighted(rng, table), y2 = weighted(rng, table);
    if (x1 === x2 || y1 === y2) continue;
    const nonH = [x1, x2, y1, y2].filter((k) => k !== 'H').length;
    if (nonH < 3) continue;
    const smi = ezSmiles(x1, x2, y1, y2, rng() < 0.5 ? 'cis' : 'trans');
    if (!smi || smi.length > 34) continue;
    const info = ezInfo(smi);
    const hit = info && info.filter((e) => e.capable && e.label);
    if (!hit || hit.length !== 1 || info.filter((e) => e.capable).length !== 1) continue;
    const e = hit[0];
    const depth = Math.max(...e.ends.map((x) => x.sphere));
    const level = depth <= 1 ? 'first' : e.ends.some((end) => end.subs.some((s) => usesDuplicate(s.node, depth))) ? 'dup' : 'set';
    if (want && want !== level) continue;
    return smi;
  }
  return 'C(\\C)(CO)=C(/C(C)C)C';
}

// ---- explanations
const sideOf = (l) => (l === 'Z' ? 'the same side' : 'opposite sides');
/** Plain-language walk through the sequence rules for one stereogenic C=C. */
export function ezWorked(smiles) {
  const e = ezInfo(smiles).find((x) => x.capable && x.label);
  if (!e) return '';
  const parts = e.ends.map((end, k) => {
    const hi = end.subs[end.hi], lo = end.subs[end.lo];
    const dup = end.subs.some((s) => usesDuplicate(s.node, end.sphere));
    const why = end.sphere <= 1 ? `${symOf(hi.node.z)} (atomic number ${hi.node.z}) beats ${symOf(lo.node.z)} (${lo.node.z}) at the first atom` : `the first atoms tie, so ${end.sphere > 2 ? 'look further out until the groups first differ' : 'compare the atoms attached to them'}: ${sphereSets(hi.node, end.sphere)[end.sphere - 2]} beats ${sphereSets(lo.node, end.sphere)[end.sphere - 2]}${dup ? ' (a double or triple bond counts its far atom twice)' : ''}`;
    return `on carbon ${k + 1}, ${hi.label} outranks ${lo.label} (${why})`;
  });
  return `${parts.join('; ')}. The two higher-ranked groups are on ${sideOf(e.label)}, so the alkene is ${e.label}`;
}

// ---- problem kinds
function nameProblem(rng, smi) {
  const nb = nameAlkeneBoth(smi);
  const info = alkeneInfo(smi, 'new');
  const alt = alkeneAltNames(smi);
  const ring = info.kind === 'ring';
  const hasEz = info.stereo.length > 0;
  const capableUnset = info.ez.some((e) => e.capable) && !hasEz;
  return {
    kind: 'input', skill: 'naming', smiles: smi, highlight: [], name: true,
    prompt: `Name this ${info.type === 'yne' ? 'alkyne' : ring ? 'cycloalkene' : 'alkene'}. Type the IUPAC name${hasEz ? ', including (E) or (Z)' : ''}: either naming style is accepted, and spaces or hyphens do not matter.`,
    answer: nb.new, accept: [nb.old, ...alt].filter((x) => x !== nb.new),
    wrong: wrongAlkeneNames(smi).map((w) => ({ match: w.name, why: w.why })),
    diagnoseFn: (raw) => diagnoseAlkene(smi, raw),
    fallback: 'That is not the name I get. Work in order: the parent chain must contain the multiple bond, number from the end that gives it the lowest number, name the branches, and add (E) or (Z) in front when the geometry is shown and both carbons have two different groups.',
    derive: nameWorked(smi, info, nb, hasEz, capableUnset),
    hints: ring
      ? ['The double bond is C1=C2 in a ring name. Number from it in the direction that gives the substituents the lowest numbers.', 'Name the substituents with their numbers, alphabetical order, and join to cyclo + the root + ene. The ring needs no locant for the double bond.']
      : ['Find the longest chain that contains the multiple bond and number from the end nearer it, so the multiple bond gets the lowest number.', hasEz ? 'Name the branches, then decide E or Z: rank the two groups on each double-bond carbon; higher-ranked groups on the same side is Z, opposite is E.' : 'Name the branches with their numbers, in alphabetical order, and put the locant of the multiple bond next to -ene or -yne (new style) or in front of the parent (traditional style).']
  };
}
function nameWorked(smi, info, nb, hasEz, capableUnset) {
  const L = info.parent.size;
  const bits = [];
  if (info.kind === 'ring') bits.push(`The double bond is in the ring, so the parent is cyclo${ROOT[L - 1] || ''}ene, numbered C1=C2 and then around the ring so the substituents get the lowest numbers`);
  else bits.push(`The longest chain that contains the ${info.type === 'ene' ? 'double' : 'triple'} bond${info.mult.length > 1 ? 's' : ''} has ${L} carbons, numbered from the end that gives the multiple bond${info.mult.length > 1 ? 's' : ''} the lowest number${info.mult.length > 1 ? 's' : ''} (${info.mult.join(', ')})`);
  if (info.subs.length) {
    const g = {}; info.subs.forEach((s) => { (g[s.id] ||= []).push(s.loc); });
    bits.push('branches: ' + Object.entries(g).map(([id, locs]) => `${subName(id, 'new')} on C${locs.sort((a, b) => a - b).join(', C')}`).join('; '));
  }
  if (hasEz) bits.push('geometry: ' + ezWorked(smi));
  const tail = nb.new === nb.old ? `Name: ${nb.new}.` : `Name: ${nb.new} (traditional style: ${nb.old}).`;
  return bits.join('. ') + '. ' + tail;
}

function cistransProblem(rng, smi) {
  const info = ezInfo(smi);
  const dbl = info.filter((e) => !e.ring || e.ring >= 8);
  const cap = dbl.filter((e) => e.capable);
  const yes = cap.length > 0;
  const noWhy = (() => {
    if (info.some((e) => e.ring && e.ring < 8)) return 'The double bond is inside a small ring, where it cannot twist: a ring this size has only one geometry for its double bond (cis/trans is possible only in rings of 8 or more).';
    const e = dbl.find((x) => !x.capable && x.ends.some((end) => end.tie && end.nsubs === 2) ) || dbl.find((x) => !x.capable);
    if (!e) return 'It has no double bond that fixes two different groups on each carbon.';
    const end = e.ends.find((x) => x.tie && x.nsubs === 2) || e.ends[0];
    const groups = end.subs.map((s) => s.label);
    return end.nsubs === 2 && end.tie ? `One double-bond carbon carries two identical groups (${groups[0]} and ${groups[1]}), so swapping the two groups on the other carbon changes nothing.` : 'One double-bond carbon has too few different groups.';
  })();
  const yesWhy = yes ? 'Each double-bond carbon has two different groups, so there is a cis/trans (E/Z) pair.' : '';
  const opts = [
    { text: 'Yes: there is a cis/trans (E/Z) pair', correct: yes, why: yes ? yesWhy : `Not here. ${noWhy}` },
    { text: 'No: one geometry only', correct: !yes, why: !yes ? `Yes. ${noWhy}` : 'Look at each double-bond carbon: both carry two different groups, so the groups can sit on the same side or on opposite sides, and those are different compounds.' }
  ];
  return {
    kind: 'choice', skill: 'ez', smiles: smi, highlight: [],
    prompt: 'Can this alkene exist as a cis/trans pair (E and Z isomers)?',
    options: opts, answer: yes ? opts[0].text : opts[1].text,
    derive: yes ? `Each double-bond carbon has two different groups, so cis/trans (E/Z) isomers exist.` : noWhy,
    hints: ['Look at one double-bond carbon at a time: does it carry two different groups (counting H as a group)?', 'If either carbon has two identical groups, swapping them changes nothing, so there is no cis/trans pair. Both carbons need two different groups.']
  };
}

function ezProblem(rng, smi) {
  const info = ezInfo(smi);
  const e = info.find((x) => x.capable && x.label);
  return {
    kind: 'cip', skill: 'ez', smiles: smi, highlight: [],
    prompt: 'Rank the two groups on each double-bond carbon with the sequence rules, then say whether the alkene is E or Z.',
    config: { smiles: smi, bond: [e.a, e.b] },
    answer: e.label,
    derive: ezWorked(smi) + '.',
    hints: ['On one carbon at a time compare the two atoms attached to it: the higher atomic number wins. If they tie, compare the atoms attached to each of those, highest first.', 'A double bond counts its far atom twice (C=O is O,O; CH=CH₂ is C,C,H). Then higher-ranked groups on the same side is Z, on opposite sides E.']
  };
}

export function makeAlkeneProblem(rng, task, smi) {
  for (let t = 0; t < 12; t++) {
    if (task === 'name') return nameProblem(rng, smi || randomAlkene(rng));
    if (task === 'ez') return ezProblem(rng, smi || randomEz(rng, pick(rng, ['first', 'set', 'set', 'dup'])));
    if (task === 'cistrans') {
      const s = smi || (rng() < 0.5 ? randomEz(rng) : randomAlkene(rng));
      const info = ezInfo(s);
      if (!info || !info.length) continue;
      // show the constitution only: strip the geometry so the drawing does not give the answer away
      return cistransProblem(rng, s.replace(/[/\\]/g, ''));
    }
    throw new Error('unknown task ' + task);
  }
  return nameProblem(rng, 'CC=C(C)C');
}

export function generateAlkenes(count, { skill = null, rng = Math.random } = {}) {
  const tasks = skill === 'ez' ? ['ez', 'cistrans', 'ez'] : ALKENE_TASKS;
  const out = [];
  let last = null;
  const start = Math.floor(rng() * tasks.length);
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeAlkeneProblem(rng, tasks[(start + i) % tasks.length]); tries++; } while (last && p.smiles === last && tries < 6);
    last = p.smiles;
    out.push(p);
  }
  return out;
}
