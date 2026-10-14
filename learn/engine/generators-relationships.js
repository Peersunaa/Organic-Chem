// Mastery generator "stereo-relationships" (Lesson 16): how two drawn stereoisomers are related, how many stereoisomers a molecule has, is it meso,
// the rotation of a racemate and the stereochemistry of Br2 addition (Lesson 10) as meso / racemic. Molecules come from the pool of two-centre
// compounds in engine/stereoisomers.js (acyclic and cis/trans rings, meso-capable and not). EVERY answer is computed (relationship(), isMeso(),
// the enumeration of all 2^n combinations with the meso collapse) and tools/check_relationships.py recomputes all of it in Python RDKit.
import { relationship, isMeso, isChiral, formulaKey } from './chirality.js';
import { STEREO_POOL, PARTNERS, enumerateCached, tagged, centersOfEntry, cisTrans, KIND_LABEL } from './stereoisomers.js';
import { gradePair } from './widgets/relationship-drill.js';
import { predictAdd } from './reactions-additions.js';

export const REL_SKILLS = ['stereo-relationships', 'meso', 'racemates'];
export const REL_TASKS = ['rel', 'count', 'rel', 'meso', 'rotation', 'rel', 'br2'];

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n) => String(n).split('').map((d) => SUP[d]).join('');

/** All pool entries with the named property. */
const mesoCapable = () => STEREO_POOL.filter((e) => enumerateCached(e).meso > 0);
const withPartners = () => STEREO_POOL.filter((e) => PARTNERS[e.id]);
const rings = () => STEREO_POOL.filter((e) => e.ring);
const bitsOf = (rng, n) => Array.from({ length: n }, () => (rng() < 0.5 ? 1 : 0));
const flipBits = (b) => b.map((x) => 1 - x);

/** A pair of drawings of kind 'enantiomers' | 'diastereomers' | 'identical' | 'meso' | 'constitutional' | 'cistrans' (the drill pair format). */
export function makePair(rng, kind) {
  let e, a, b, extra = {};
  if (kind === 'meso') {
    e = pick(rng, mesoCapable());
    const E = enumerateCached(e), m = E.distinct.find((d) => d.meso);
    const bits = E.combos[m.members[0]].bits;
    a = tagged(e, bits); b = tagged(e, flipBits(bits)); extra = { title: 'two drawings' };
  } else if (kind === 'identical') {
    e = pick(rng, STEREO_POOL);
    const E = enumerateCached(e);
    const c = pick(rng, E.combos);
    a = c.smiles; b = c.smiles; extra = { rotateB: pick(rng, [180, 90, 270]) };
  } else if (kind === 'enantiomers') {
    e = pick(rng, STEREO_POOL);
    const E = enumerateCached(e);
    const chiral = E.combos.filter((c) => E.distinct.find((d) => d.iso === c.iso).chiral);
    const c = pick(rng, chiral);
    a = c.smiles; b = tagged(e, flipBits(c.bits));
  } else if (kind === 'diastereomers' || kind === 'cistrans') {
    e = pick(rng, kind === 'cistrans' ? rings() : STEREO_POOL);
    const E = enumerateCached(e);
    const opts = [];
    for (let i = 0; i < E.combos.length; i++) for (let j = 0; j < E.combos.length; j++) {
      if (i === j) continue;
      if (relationship(E.combos[i].smiles, E.combos[j].smiles).kind !== 'diastereomers') continue;
      if (kind === 'cistrans' && cisTrans(e, E.combos[i].smiles) === cisTrans(e, E.combos[j].smiles)) continue;
      opts.push([i, j]);
    }
    const [i, j] = pick(rng, opts);
    a = E.combos[i].smiles; b = E.combos[j].smiles; extra = { cistrans: !!e.ring };
  } else { // constitutional
    e = pick(rng, withPartners());
    const E = enumerateCached(e);
    a = pick(rng, E.combos).smiles;
    const part = pick(rng, PARTNERS[e.id]);
    b = part.smiles; extra = { sub: part.kind };
  }
  return { a, b, entry: e.id, ...extra };
}

// ---------------------------------------------------------------- 1. relationship
function relProblem(rng) {
  const kind = pick(rng, ['enantiomers', 'diastereomers', 'identical', 'meso', 'constitutional', 'cistrans', 'enantiomers', 'diastereomers']);
  const pair = makePair(rng, kind);
  const truth = relationship(pair.a, pair.b).kind;
  const g = gradePair(pair, truth);
  return {
    kind: 'widget', widget: 'relationship-drill', skill: 'stereo-relationships', smiles: null,
    prompt: 'How are these two molecules related?',
    config: { pairs: [pair], ask: 'Compare the connectivity first, then each chirality center.' }, answer: truth, pair, pairKind: kind,
    derive: g.confirm,
    hints: ['Are the atoms bonded in the same order in both? If not, they are constitutional isomers. If so, look at each chirality center.', 'Enantiomers are opposite at EVERY center; diastereomers are opposite at some centers but not all. A meso compound is identical to its own mirror image.']
  };
}

// ---------------------------------------------------------------- 2. how many stereoisomers
function countProblem(rng) {
  const e = pick(rng, STEREO_POOL);
  const E = enumerateCached(e);
  const n = E.n, full = 2 ** n, total = E.total;
  const wrong = [];
  if (total !== full) wrong.push({ match: full, why: `You counted 2${sup(n)} = ${full} combinations of R and S. But two of them, (R,S) and (S,R), are one meso compound: the two ends of this molecule carry the same groups, so a plane of symmetry makes them identical. That leaves ${total}.` });
  else wrong.push({ match: full - 1, why: `${full - 1} would be right if there were a meso form. But the two chirality centers carry different groups, so there is no plane of symmetry and no meso compound: all ${full} combinations are different compounds.` });
  if (E.pairs) wrong.push({ match: E.pairs, why: `${E.pairs} is the number of enantiomer pairs. Count every molecule: each pair has two members${E.meso ? ', and the meso compound counts once' : ''}.` });
  wrong.push({ match: n, why: `${n} is the number of chirality centers. The number of stereoisomers is at most 2${sup(n)} = ${full}.` });
  return {
    kind: 'input', skill: 'stereo-relationships', smiles: e.flat,
    prompt: `How many different stereoisomers does ${e.new} have? (Two drawings of the same compound count once.)`,
    promptHtml: `How many different stereoisomers does <name new="${e.new}" old="${e.old}"></name> have? (Two drawings of the same compound count once.)`,
    answer: total, accept: [], wrong: wrong.filter((w, i, arr) => w.match !== total && arr.findIndex((x) => x.match === w.match) === i),
    fallback: `Write out the 2${sup(n)} = ${full} combinations of R and S, then ask whether any two are the same compound (a meso form needs a plane of symmetry).`,
    derive: `${n} chirality centers give up to 2${sup(n)} = ${full} combinations. ${E.meso ? `Here (R,S) and (S,R) are the same meso compound, so there are ${total}: ${E.pairs} pair of enantiomers and 1 meso compound.` : `The two centers carry different groups, so there is no meso form: ${total} stereoisomers, ${E.pairs} pairs of enantiomers.`}`,
    hints: [`${n} chirality centers: write down every combination of R and S (2${sup(n)} of them).`, 'Check whether any two combinations are the same compound. A meso form is possible only when the two halves of the molecule are alike, so that a plane of symmetry can exist.'],
    entry: e.id
  };
}

// ---------------------------------------------------------------- 3. is it meso?
function mesoProblem(rng) {
  const e = rng() < 0.55 ? pick(rng, mesoCapable()) : pick(rng, STEREO_POOL);
  const E = enumerateCached(e);
  const c = rng() < 0.5 && E.meso ? E.combos[E.distinct.find((d) => d.meso).members[0]] : pick(rng, E.combos);
  const meso = isMeso(c.smiles), chiral = isChiral(c.smiles);
  const opts = [
    { text: 'Meso: it has chirality centers but also a plane of symmetry, so it is achiral', correct: meso, why: meso ? 'Right.' : 'A meso compound is identical to its own mirror image. Here the mirror image is a different compound, so this one is chiral.' },
    { text: 'Chiral: its mirror image is a different compound', correct: chiral, why: chiral ? 'Right.' : 'The mirror image of this compound is the compound itself (a plane of symmetry runs through the middle of the molecule), so it is not chiral: it is meso.' },
    { text: 'A racemic mixture of two enantiomers', correct: false, why: 'The drawing shows ONE compound, not a mixture. A racemic mixture is a 50:50 mixture of two different molecules.' }
  ];
  return {
    kind: 'choice', skill: 'meso', smiles: c.smiles,
    prompt: 'What kind of compound is this stereoisomer?',
    options: opts, answer: opts.find((o) => o.correct).text,
    derive: meso ? 'It has two chirality centers and equals its own mirror image: a plane of symmetry cuts through the middle, so it is meso (achiral, optically inactive).' : 'Its mirror image is a different compound, so it is chiral (optically active, with an enantiomer).',
    hints: ['Draw the mirror image: swap every wedge and dash. Is it the same compound as the original?', 'If the mirror image is the same compound (look for a plane of symmetry between the two centers), the compound is meso. If not, it is chiral.'],
    entry: e.id, mesoAnswer: meso
  };
}

// ---------------------------------------------------------------- 4. observed rotation of a racemate (and meso)
function rotationProblem(rng) {
  const kind = pick(rng, ['mix', 'mix', 'rxn', 'meso']);
  const x = pick(rng, [6.2, 12.4, 18.0, 24.5, 33.0, 41.2, 56.5]);
  const L = pick(rng, ['1.00 dm', '2.00 dm']);
  if (kind === 'mix') {
    const gms = pick(rng, [1.0, 2.0, 2.5, 5.0]);
    return {
      kind: 'input', skill: 'racemates', smiles: null,
      prompt: `A solution holds ${gms.toFixed(2)} g of the (+) enantiomer and ${gms.toFixed(2)} g of the (−) enantiomer of a chiral compound. The pure (+) enantiomer has [α]D = +${x}. What is the observed rotation of this mixture in a ${L} tube?`,
      answer: 0, accept: [],
      wrong: [{ match: x, why: `+${x} is what the (+) enantiomer alone would give. The (−) enantiomer is present in the same amount and turns the light by the same amount the other way, so the two rotations cancel.` }, { match: -x, why: `−${x} is what the (−) enantiomer alone would give. The (+) enantiomer is present in the same amount and cancels it.` }, { match: 2 * x, why: 'Rotations in opposite directions do not add: they cancel.' }],
      fallback: 'Equal amounts of two enantiomers turn polarized light by equal amounts in opposite directions: the net rotation is 0°.',
      derive: 'Equal amounts of the two enantiomers is a racemic mixture, (±). The + and − rotations cancel exactly, so the observed rotation is 0°: a racemate is optically inactive.',
      hints: ['Enantiomers turn plane-polarized light by equal amounts in opposite directions.', 'Equal amounts of each: the two rotations add up to zero.']
    };
  }
  if (kind === 'rxn') {
    const alkenes = [{ smiles: 'C1=CCCC1', new: 'cyclopentene', old: 'cyclopentene' }, { smiles: 'C1=CCCCC1', new: 'cyclohexene', old: 'cyclohexene' }, { smiles: 'C/C=C\\C', new: '(Z)-but-2-ene', old: 'cis-2-butene' }, { smiles: 'CC/C=C\\CC', new: '(Z)-hex-3-ene', old: 'cis-3-hexene' }];
    const al = pick(rng, alkenes);
    const p = predictAdd(al.smiles, 'Br2');
    const prod = p.products[0];
    return {
      kind: 'input', skill: 'racemates', smiles: al.smiles,
      prompt: `Bromine (Br₂) adds to ${al.new} in an ordinary flask with no chiral reagent or catalyst. The product has chirality centers. What is the observed rotation of the product mixture (in degrees)?`,
      promptHtml: `Bromine (Br₂) adds to <name new="${al.new}" old="${al.old}"></name> in an ordinary flask with no chiral reagent or catalyst. The product has chirality centers. What is the observed rotation of the product mixture (in degrees)?`,
      answer: 0, accept: [],
      wrong: [{ match: 1, why: 'Nothing in the flask is chiral, so there is no reason for one enantiomer to form faster than the other. Equal amounts of both form, and their rotations cancel.' }],
      fallback: 'An achiral alkene and achiral reagents give equal amounts of the two enantiomers: a racemic mixture, which has no net rotation.',
      derive: `Anti addition of Br₂ to an achiral alkene can happen on either face with equal probability, so the chiral product forms as a 50:50 mixture of enantiomers (a racemate). Its observed rotation is 0°.`,
      hints: ['Is there anything chiral in the flask that could favour one face of the alkene?', 'Without it, both enantiomers form in equal amounts, and equal and opposite rotations cancel.'],
      product: prod, racemic: p.racemic
    };
  }
  const e = pick(rng, mesoCapable());
  const E = enumerateCached(e);
  const m = E.distinct.find((d) => d.meso);
  return {
    kind: 'input', skill: 'racemates', smiles: m.smiles,
    prompt: `A pure sample of this stereoisomer of ${e.new} is placed in a polarimeter. What observed rotation do you expect (in degrees)?`,
    promptHtml: `A pure sample of this stereoisomer of <name new="${e.new}" old="${e.old}"></name> is placed in a polarimeter. What observed rotation do you expect (in degrees)?`,
    answer: 0, accept: [],
    wrong: [{ match: 1, why: 'The compound shown is meso: its mirror image is itself, so it has no handedness and cannot rotate polarized light. Its two halves would turn light in opposite directions and cancel inside the molecule.' }],
    fallback: 'A meso compound has a plane of symmetry, so it is achiral and optically inactive: 0°.',
    derive: 'This stereoisomer is meso: it has chirality centers but a plane of symmetry, so it is achiral and optically inactive. The observed rotation is 0°.',
    hints: ['Is the compound shown identical to its mirror image?', 'A compound that equals its mirror image has no handedness, so it does not rotate plane-polarized light.'],
    entry: e.id
  };
}

// ---------------------------------------------------------------- 5. Br2 + alkene: meso, racemic or ...
const BR2_ALKENES = [
  { smiles: 'C1=CCCC1', new: 'cyclopentene', old: 'cyclopentene' }, { smiles: 'C1=CCCCC1', new: 'cyclohexene', old: 'cyclohexene' },
  { smiles: 'C/C=C\\C', new: '(Z)-but-2-ene', old: 'cis-2-butene' }, { smiles: 'C/C=C/C', new: '(E)-but-2-ene', old: 'trans-2-butene' },
  { smiles: 'CC/C=C\\CC', new: '(Z)-hex-3-ene', old: 'cis-3-hexene' }, { smiles: 'CC/C=C/CC', new: '(E)-hex-3-ene', old: 'trans-3-hexene' }
];
export const BR2_ALKENE_LIST = BR2_ALKENES;
function br2Problem(rng) {
  const al = pick(rng, BR2_ALKENES);
  const p = predictAdd(al.smiles, 'Br2');
  const prod = p.products[0];
  const meso = isMeso(prod);
  const truth = meso ? 'meso' : p.racemic ? 'racemic' : 'other';
  const opts = [
    { id: 'meso', text: 'One meso compound (achiral, optically inactive)', why: meso ? 'Right.' : 'A meso product needs a plane of symmetry. This product is chiral (it has no such plane): it forms as a pair of enantiomers.' },
    { id: 'racemic', text: 'A racemic mixture: equal amounts of two enantiomers', why: truth === 'racemic' ? 'Right.' : 'The product is meso: it is achiral, so there is no pair of enantiomers to form.' },
    { id: 'single', text: 'One pure enantiomer, optically active', why: 'Nothing chiral is present to favour one enantiomer. A chiral product from achiral reagents forms as a racemate; a meso product is achiral.' },
    { id: 'diast', text: 'A mixture of two diastereomers', why: 'Anti addition to an alkene of known geometry gives only one of the diastereomers (the other would need syn addition).' }
  ];
  opts.forEach((o) => { o.correct = o.id === truth; });
  return {
    kind: 'choice', skill: 'meso', smiles: al.smiles,
    prompt: `Bromine adds anti to ${al.new} (Lesson 10). What does the product consist of?`,
    promptHtml: `Bromine adds <b>anti</b> to <name new="${al.new}" old="${al.old}"></name> (Lesson 10). What does the product consist of?`,
    options: opts, answer: opts.find((o) => o.correct).text,
    derive: meso ? `Anti addition to this alkene gives the meso dibromide: its two centers are opposite and a plane of symmetry cuts between them. It is one achiral compound.` : 'Anti addition gives a chiral product (no plane of symmetry). Br⁺ can attack either face with equal probability, so the two enantiomers form in equal amounts: a racemic mixture.',
    hints: ['Add the two Br atoms on opposite faces (anti). Draw the product, then ask whether it has a plane of symmetry.', 'If the product has a plane of symmetry it is meso. If not, it is chiral and, from an achiral alkene, forms as a racemate.'],
    product: prod, truth
  };
}

export function makeRelProblem(rng, task) {
  switch (task) {
    case 'rel': return relProblem(rng);
    case 'count': return countProblem(rng);
    case 'meso': return mesoProblem(rng);
    case 'rotation': return rotationProblem(rng);
    case 'br2': return br2Problem(rng);
    default: throw new Error('unknown task ' + task);
  }
}
export function generateRel(count, { skill = null, rng = Math.random } = {}) {
  const tasks = skill === 'meso' ? ['meso', 'br2', 'meso'] : skill === 'racemates' ? ['rotation', 'rotation', 'br2'] : skill === 'stereo-relationships' ? ['rel', 'count', 'rel'] : REL_TASKS;
  const out = [];
  const start = Math.floor(rng() * tasks.length);
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeRelProblem(rng, tasks[(start + i) % tasks.length]); tries++; } while (last && last === (p.config && p.config.pairs[0].a + p.config.pairs[0].b || p.smiles || p.prompt) && tries < 6);
    last = p.config && p.config.pairs[0].a + p.config.pairs[0].b || p.smiles || p.prompt;
    out.push(p);
  }
  return out;
}
