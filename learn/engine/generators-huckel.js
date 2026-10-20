// Practice generator `huckel` (skill `aromaticity`): count the pi electrons of a monocyclic ring and say aromatic, anti-aromatic or not aromatic.
// Written for the mock midterm's B2 section (workbook B2.1: "count the pi electrons, aromatic or anti-aromatic?"). The pi count is read from the drawing
// by `huckelInfo` (RDKit atoms and bond orders), never typed in; tests/mock.mjs recomputes every pool entry from an independent hand table.
// Rule used (Hückel): a cyclic, planar, fully conjugated ring is aromatic with 4n + 2 pi electrons and anti-aromatic with 4n.
//   A ring with an sp3 atom is not fully conjugated, and neutral cyclooctatetraene is tub-shaped (not planar): both are "not aromatic".
import { analyze } from './chem.js';

export const HUCKEL_SKILLS = ['aromaticity'];
const pick = (rng, a) => a[Math.floor(rng() * a.length)];

// smiles are written in Kekulé form; `planar: false` marks a ring that cannot lie flat.
export const HUCKEL_POOL = [
  { id: 'benzene', smiles: 'C1=CC=CC=C1', name: 'benzene' },
  { id: 'cyclobutadiene', smiles: 'C1=CC=C1', name: 'cyclobutadiene' },
  { id: 'cyclopropenyl-cation', smiles: '[CH+]1C=C1', name: 'the cyclopropenyl cation' },
  { id: 'cyclopropenyl-anion', smiles: '[CH-]1C=C1', name: 'the cyclopropenyl anion' },
  { id: 'cyclopentadienyl-anion', smiles: '[CH-]1C=CC=C1', name: 'the cyclopentadienyl anion' },
  { id: 'cyclopentadienyl-cation', smiles: '[CH+]1C=CC=C1', name: 'the cyclopentadienyl cation' },
  { id: 'tropylium', smiles: '[CH+]1C=CC=CC=C1', name: 'the cycloheptatrienyl cation (tropylium)' },
  { id: 'cycloheptatrienyl-anion', smiles: '[CH-]1C=CC=CC=C1', name: 'the cycloheptatrienyl anion' },
  { id: 'cot-dianion', smiles: '[CH-]1C=CC=CC=C[CH-]1', name: 'the cyclooctatetraene dianion' },
  { id: 'pyrrole', smiles: 'C1=CNC=C1', name: 'pyrrole' },
  { id: 'furan', smiles: 'C1=COC=C1', name: 'furan' },
  { id: 'thiophene', smiles: 'C1=CSC=C1', name: 'thiophene' },
  { id: 'pyridine', smiles: 'C1=CC=NC=C1', name: 'pyridine' },
  // not aromatic: an sp3 atom breaks the conjugation, or the ring cannot be planar
  { id: 'cyclohexa-1,3-diene', smiles: 'C1=CC=CCC1', name: 'cyclohexa-1,3-diene' },
  { id: 'cyclopentadiene', smiles: 'C1=CC=CC1', name: 'cyclopentadiene' },
  { id: 'cycloheptatriene', smiles: 'C1=CC=CC=CC1', name: 'cycloheptatriene' },
  { id: 'cot', smiles: 'C1=CC=CC=CC=C1', name: 'cyclooctatetraene (neutral)', planar: false }
];
export const HUCKEL_BY_ID = Object.fromEntries(HUCKEL_POOL.map((e) => [e.id, e]));

/** What the drawing says: { n: ring atoms, pi: pi electrons in the ring, broken: an sp3 atom (or non-planar ring) stops the conjugation, cls }. */
export function huckelInfo(smiles, planar = true) {
  const info = analyze(smiles);
  let pi = 0, broken = false, lone = 0, anions = 0, cations = 0;
  for (const a of info.heavy) {
    const dbl = info.bonds.some((b) => b.atoms.includes(a.idx) && (b.bo ?? 1) === 2);
    if (dbl) pi += 1;
    else if (a.sym === 'C') {
      if (a.fc < 0) { pi += 2; anions++; }
      else if (a.fc > 0) { cations++; }
      else broken = true;   // neutral sp3 carbon: no p orbital
    } else if (a.lp >= 1) { pi += 2; lone++; }
    else broken = true;
  }
  if (!planar) broken = true;
  const cls = broken ? 'non' : pi % 4 === 2 ? 'aromatic' : 'anti';
  return { n: info.heavy.length, pi, broken, cls, lone, anions, cations, planar };
}

const WORD = { aromatic: 'aromatic', anti: 'anti-aromatic', non: 'not aromatic' };
const nOf = (pi, cls) => (cls === 'aromatic' ? (pi - 2) / 4 : pi / 4);
function reason(e, I) {
  if (I.broken) return e.planar === false
    ? `${e.name} cannot lie flat (it is tub-shaped), so its π bonds do not overlap all the way round the ring: it is not aromatic.`
    : `${e.name} has an sp³ carbon in the ring (no p orbital), so the ring is not fully conjugated: it is not aromatic.`;
  return `${e.name} is cyclic, planar and fully conjugated with ${I.pi} π electrons. ${I.pi} = ${I.cls === 'aromatic' ? `4(${nOf(I.pi, I.cls)}) + 2` : `4(${nOf(I.pi, I.cls)})`}, so it is ${WORD[I.cls]}.`;
}

const OPTS = [
  { id: 'aromatic', text: 'Aromatic: cyclic, planar, fully conjugated, 4n + 2 π electrons' },
  { id: 'anti', text: 'Anti-aromatic: cyclic, planar, fully conjugated, 4n π electrons' },
  { id: 'non', text: 'Not aromatic: not fully conjugated, or not planar' }
];
function classProblem(rng, e) {
  const I = huckelInfo(e.smiles, e.planar !== false);
  const options = OPTS.map((o) => {
    const correct = o.id === I.cls;
    let why;
    if (correct) why = 'Yes. ' + reason(e, I);
    else if (o.id === 'non') why = `${e.name} is cyclic, planar and every ring atom has a p orbital, so it IS fully conjugated: count the π electrons (${I.pi}) and use 4n + 2 or 4n.`;
    else if (I.broken) why = reason(e, I);
    else why = `Count the π electrons: ${I.pi}. ${I.pi} fits ${I.cls === 'aromatic' ? '4n + 2' : '4n'}, not ${o.id === 'aromatic' ? '4n + 2' : '4n'}, so it is ${WORD[I.cls]}.`;
    return { text: o.text, correct, why };
  });
  const derive = reason(e, I);
  return {
    kind: 'choice', skill: 'aromaticity', smiles: e.smiles, hid: e.id, type: 'class',
    prompt: `The ring drawn is ${e.name}. Is it aromatic, anti-aromatic or not aromatic?`,
    options, answer: options.find((o) => o.correct).text, pi: I.pi,
    derive, worked: derive,
    hints: ['Check the three conditions: cyclic, planar and fully conjugated (every ring atom has a p orbital). An sp³ atom in the ring stops the conjugation.', `Count the π electrons: 2 for each C=C, 2 for a lone pair or negative charge in a ring p orbital, 0 for a positive charge. Then test 4n + 2 (aromatic) against 4n (anti-aromatic).`]
  };
}
function countProblem(rng, e) {
  const I = huckelInfo(e.smiles, e.planar !== false);
  const wrong = [];
  if (I.n !== I.pi) wrong.push({ match: I.n, why: `${I.n} is the number of ring atoms. Count electrons, not atoms: 2 for each C=C, plus 2 for any lone pair or negative charge in a ring p orbital.` });
  const given = 2 * (I.lone + I.anions);
  if (given > 0 && I.pi - given >= 0 && I.pi - given !== I.n) wrong.push({ match: I.pi - given, why: 'You left out a lone pair or a negative charge that sits in a p orbital of the ring. It adds 2 π electrons.' });
  if (I.cations > 0 && I.pi + 2 * I.cations !== I.n) wrong.push({ match: I.pi + 2 * I.cations, why: 'A positive carbon has an empty p orbital: it adds 0 π electrons, not 2.' });
  const derive = `${e.name}: ${I.pi} π electrons (2 for each C=C${I.lone ? ', 2 for the lone pair in a ring p orbital' : ''}${I.anions ? ', 2 for each negative charge' : ''}${I.cations ? ', 0 for the positive charge' : ''}).`;
  return {
    kind: 'input', skill: 'aromaticity', smiles: e.smiles, hid: e.id, type: 'count',
    prompt: `How many π electrons take part in the ring of ${e.name}? Count 2 for each C=C, 2 for a lone pair or negative charge in a ring p orbital (the N–H of pyrrole, the O of furan, a C⁻) and 0 for a C⁺.`,
    answer: I.pi, wrong, derive,
    hints: ['Go round the ring atom by atom: an atom in a C=C gives 1 each (2 per double bond); an atom with no double bond gives 2 if it has a lone pair or a negative charge, and 0 if it is positive.', 'Write the total, then you can test it against 4n + 2 (aromatic) or 4n (anti-aromatic).']
  };
}

export function generateHuckel(count, { skill = null, rng = Math.random } = {}) {
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do {
      const e = pick(rng, HUCKEL_POOL.filter((x) => huckelInfo(x.smiles, x.planar !== false).cls !== 'non' || rng() < 0.35));
      const asCount = huckelInfo(e.smiles, e.planar !== false).cls !== 'non' && rng() < 0.45;
      p = asCount ? countProblem(rng, e) : classProblem(rng, e);
      tries++;
    } while (last && p.hid === last && tries < 8);
    last = p.hid;
    out.push(p);
  }
  return out;
}
