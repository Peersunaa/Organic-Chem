// Mastery generator `chairs` (Lesson 06): fresh disubstituted cyclohexanes and ethane/bromoethane numbers every run.
// The relationship rule below is the one taught in the lesson; the tests re-derive it by building both chairs in 3D
// (RDKit embed + ring flip) and measuring axial/equatorial from the coordinates, and recheck cis/trans from the drawing.
import { resolveTasks } from './task-list.js';
const pick = (rng, a) => a[Math.floor(rng() * a.length)];

/** Substituents used in the generator: SMILES for the group (attached at its first atom), how to write it, and its A-value rank. */
export const GROUPS = {
  Me: { smi: 'C', label: 'CH₃', phrase: 'the methyl group (CH₃)' },
  Et: { smi: 'CC', label: 'CH₂CH₃', phrase: 'the ethyl group (CH₂CH₃)' },
  iPr: { smi: 'C(C)C', label: 'CH(CH₃)₂', phrase: 'the isopropyl group (CH(CH₃)₂)' },
  tBu: { smi: 'C(C)(C)C', label: 'C(CH₃)₃', phrase: 'the tert-butyl group (C(CH₃)₃)' },
  Cl: { smi: 'Cl', label: 'Cl', phrase: 'the chlorine (Cl)' },
  OH: { smi: 'O', label: 'OH', phrase: 'the hydroxyl group (OH)' }
};
/** Order of "size" for axial strain (A-values rise along it): H < F < Cl < OH < Me < Et < iPr < tBu. */
export const A_ORDER = ['H', 'F', 'Cl', 'OH', 'Me', 'Et', 'iPr', 'tBu'];
export const rank = (g) => A_ORDER.indexOf(g);
/** The larger group (higher in A_ORDER) is the one that takes the equatorial position when only one can. */
export const bigger = (x, y) => (rank(x) >= rank(y) ? x : y);
/** Pairs whose A-values are too close to call (Me ~ Et, Cl ~ OH): never asked as "which goes equatorial". */
export const TOO_CLOSE = [['Me', 'Et'], ['Cl', 'OH']];
export const tooClose = (x, y) => TOO_CLOSE.some(([a, b]) => (a === x && b === y) || (a === y && b === x));

export const PATTERNS = ['1,2', '1,3', '1,4'];
/** Which cis/trans isomer of each pattern can put both substituents equatorial (the rule taught in the lesson). */
export const DIEQ = { '1,2': 'trans', '1,3': 'cis', '1,4': 'trans' };
export const canDiequatorial = (pat, rel) => DIEQ[pat] === rel;
/** Chair pattern of the two substituents in ring order: ee/aa for the diequatorial-capable isomers, ae/ea for the others. */
export const chairPatterns = (pat, rel) => (canDiequatorial(pat, rel) ? ['ee', 'aa'] : ['ae', 'ea']);

// SMILES templates. With these templates ('@','@') is the trans isomer and ('@','@@') the cis isomer for every pattern
// (checked in the tests from a fresh 3D embedding and from the wedge drawing).
export const TAGS = { trans: ['@', '@'], cis: ['@', '@@'] };
export function ringSmiles(pat, X, Y, rel) {
  const x = GROUPS[X].smi, y = GROUPS[Y].smi, [t1, t2] = TAGS[rel];
  if (pat === '1,2') return `${x}[C${t1}H]1[C${t2}H](${y})CCCC1`;
  if (pat === '1,3') return `${x}[C${t1}H]1C[C${t2}H](${y})CCC1`;
  return `${x}[C${t1}H]1CC[C${t2}H](${y})CC1`;
}

const WHY_PATTERN = {
  '1,2': 'Axial bonds on neighbouring carbons point in opposite directions (up, then down), and so do the equatorial ones. Two groups on adjacent carbons that are on opposite faces (trans) can therefore be both equatorial or both axial; two on the same face (cis) are always one axial and one equatorial.',
  '1,3': 'Axial bonds on carbons 1 and 3 point the same way (both up or both down), and so do the equatorial ones. Two groups 1,3 on the same face (cis) can therefore be both equatorial or both axial; opposite faces (trans) means one axial and one equatorial.',
  '1,4': 'Axial bonds on carbons 1 and 4 point in opposite directions, and so do the equatorial ones. Two groups 1,4 on opposite faces (trans) can therefore be both equatorial or both axial; the same face (cis) means one axial and one equatorial.'
};
const relWord = (rel) => (rel === 'cis' ? 'both wedged (or both dashed): the same face, so cis' : 'one wedge and one dash: opposite faces, so trans');

function bothEq(rng) {
  const pat = pick(rng, PATTERNS), rel = pick(rng, ['cis', 'trans']);
  const X = pick(rng, Object.keys(GROUPS)), Y = pick(rng, Object.keys(GROUPS));
  const yes = canDiequatorial(pat, rel);
  const smiles = ringSmiles(pat, X, Y, rel);
  return {
    kind: 'choice', skill: 'chairs', smiles, task: 'bothEq', pattern: pat, rel, groups: [X, Y], answer: yes ? 'Yes' : 'No',
    prompt: `This ${pat}-disubstituted cyclohexane is drawn flat (wedge = toward you, dash = away). Is there a chair conformation in which BOTH substituents are equatorial?`,
    options: [
      { text: 'Yes: one of its two chairs has both groups equatorial', correct: yes, why: yes ? `Yes. In the drawing it is ${relWord(rel)}. ${WHY_PATTERN[pat]}` : `Not for this isomer: it is ${rel} (${relWord(rel)}), and for a ${pat} pattern that means one group is axial and the other equatorial, in either chair. ${WHY_PATTERN[pat]}` },
      { text: 'No: in every chair one of them is axial', correct: !yes, why: !yes ? `Yes. In the drawing it is ${relWord(rel)}. ${WHY_PATTERN[pat]}` : `It can: this isomer is ${rel} (${relWord(rel)}), and a ${rel} ${pat} pair can sit both equatorial in one chair (and both axial in the other). ${WHY_PATTERN[pat]}` }
    ],
    derive: `Read the faces from the wedges: ${relWord(rel)}. ${WHY_PATTERN[pat]} So the answer is ${yes ? 'yes' : 'no'}.`,
    hints: ['First decide from the wedges whether the two groups are cis (same face) or trans (opposite faces).', `Then use the ${pat} pattern: ${pat === '1,3' ? 'axial bonds on C1 and C3 point the same way' : 'axial bonds on ' + (pat === '1,2' ? 'neighbouring carbons point opposite ways' : 'C1 and C4 point opposite ways')}.`]
  };
}

function whichEq(rng) {
  const aePats = [['1,2', 'cis'], ['1,3', 'trans'], ['1,4', 'cis']];
  let X, Y;
  do { X = pick(rng, Object.keys(GROUPS)); Y = pick(rng, Object.keys(GROUPS)); } while (X === Y || tooClose(X, Y));
  const [pat, rel] = pick(rng, aePats);
  const big = bigger(X, Y), small = big === X ? Y : X;
  const smiles = ringSmiles(pat, X, Y, rel);
  return {
    kind: 'choice', skill: 'chairs', smiles, task: 'whichEq', pattern: pat, rel, groups: [X, Y], answer: GROUPS[big].phrase,
    prompt: `In this ${rel}-${pat} isomer one group has to be axial and the other equatorial, in either chair. In the MORE STABLE chair, which group is equatorial?`,
    options: [
      { text: GROUPS[X].phrase.replace(/^the/, 'The'), correct: X === big, why: X === big ? `Yes: ${GROUPS[big].label} is the bigger group, so it takes the roomier equatorial position and the smaller ${GROUPS[small].label} goes axial.` : `${GROUPS[X].label} is the smaller group here. The smaller group is the one that can afford the axial spot (fewer 1,3-diaxial clashes), so the bigger ${GROUPS[big].label} should be equatorial.` },
      { text: GROUPS[Y].phrase.replace(/^the/, 'The'), correct: Y === big, why: Y === big ? `Yes: ${GROUPS[big].label} is the bigger group, so it takes the roomier equatorial position and the smaller ${GROUPS[small].label} goes axial.` : `${GROUPS[Y].label} is the smaller group here. The smaller group is the one that can afford the axial spot (fewer 1,3-diaxial clashes), so the bigger ${GROUPS[big].label} should be equatorial.` },
      { text: 'Neither is preferred: the two chairs are equally stable', correct: false, why: 'The two chairs are different: in one the larger group is axial and suffers 1,3-diaxial strain, in the other the smaller group is axial and the strain is less. The chair with the larger group equatorial is more stable.' }
    ].sort(() => rng() - 0.5),
    derive: `Size order (axial strain): H < F < Cl < OH < Me < Et < iPr < tBu. ${GROUPS[big].label} is bigger than ${GROUPS[small].label}, so ${GROUPS[big].label} goes equatorial and ${GROUPS[small].label} axial.`,
    hints: ['Both chairs have one axial and one equatorial group. The question is which group should take the axial spot.', 'Axial groups suffer 1,3-diaxial strain, and larger groups suffer more. Order of size: H < F < Cl < OH < Me < Et < iPr < tBu.']
  };
}

function cisTrans(rng) {
  const pat = pick(rng, PATTERNS), rel = pick(rng, ['cis', 'trans']);
  const X = pick(rng, Object.keys(GROUPS)), Y = pick(rng, Object.keys(GROUPS));
  const smiles = ringSmiles(pat, X, Y, rel);
  return {
    kind: 'choice', skill: 'chairs', smiles, task: 'cisTrans', pattern: pat, rel, groups: [X, Y], answer: rel,
    prompt: `The ring is drawn flat with wedges and dashes. Are the two substituents cis or trans to each other?`,
    options: [
      { text: 'cis (same face of the ring)', correct: rel === 'cis', why: rel === 'cis' ? `Yes: ${relWord('cis')}.` : 'Cis needs both groups on the same face: both wedges or both dashes. Here one is a wedge and the other a dash, so they are on opposite faces.' },
      { text: 'trans (opposite faces)', correct: rel === 'trans', why: rel === 'trans' ? `Yes: ${relWord('trans')}.` : 'Trans needs the groups on opposite faces: one wedge and one dash. Here the two bond styles are the same, so both groups are on the same face.' }
    ],
    derive: `${relWord(rel)[0].toUpperCase()}${relWord(rel).slice(1)}.`,
    hints: ['Look at the two bond styles: a wedge comes toward you, a dash goes away from you.', 'Same style on both groups: same face (cis). Different styles: opposite faces (trans).']
  };
}

const ANGLES = [0, 30, 60, 90, 120, 150, 180, 240, 300];
function energyAngle(rng) {
  const th = pick(rng, ANGLES);
  const E = Math.round(6 * (1 + Math.cos((3 * th * Math.PI) / 180)) * 1000) / 1000;
  return {
    kind: 'input', skill: 'conformations', smiles: null, task: 'energy', answer: Math.round(E),
    prompt: `The torsional energy of ethane is E = 6 × (1 + cos 3θ) kJ/mol, where θ is the dihedral angle between a front C–H and a rear C–H. What is E at θ = ${th}°? (Round to a whole number.)`,
    derive: `3θ = ${3 * th}°, cos ${3 * th}° = ${Math.round(Math.cos((3 * th * Math.PI) / 180))}, so E = 6 × (1 + ${Math.round(Math.cos((3 * th * Math.PI) / 180))}) = ${Math.round(E)} kJ/mol. (${Math.round(E) === 0 ? 'staggered: the minimum' : Math.round(E) === 12 ? 'eclipsed: the maximum, the full 12 kJ/mol barrier' : 'halfway up the barrier'}.)`,
    wrong: [{ match: 12 - Math.round(E), why: 'That is the energy of the opposite arrangement. Check the sign of cos 3θ: at θ = 0° the cosine is +1 (eclipsed, 12) and at 60° it is −1 (staggered, 0).' }].filter((w) => w.match !== Math.round(E) && w.match >= 0),
    hints: ['Multiply the angle by 3 first, then take the cosine of that.', 'cos 0° = 1, cos 90° = 0, cos 180° = −1, cos 270° = 0, cos 360° = 1.']
  };
}

function brEclipse(rng) {
  const h = pick(rng, [3.6, 3.8, 4.0, 4.2]);
  const B = pick(rng, [14.4, 15.0, 15.6, 16.2]);
  const ans = Math.round((B - 2 * h) * 10) / 10;
  if (ans <= h) return brEclipse(rng);
  return {
    kind: 'input', skill: 'conformations', smiles: 'CCBr', task: 'brEclipse', answer: ans,
    prompt: `The barrier to rotation in bromoethane is ${B.toFixed(1)} kJ/mol. In its eclipsed conformation there are two H–H eclipsing interactions, each worth ${h.toFixed(1)} kJ/mol, plus one H–Br interaction. How many kJ/mol is the H–Br eclipsing interaction worth?`,
    derive: `Barrier = 2 × (H–H) + (H–Br), so H–Br = ${B.toFixed(1)} − 2 × ${h.toFixed(1)} = ${ans.toFixed(1)} kJ/mol.`,
    wrong: [{ match: Math.round((B - 3 * h) * 10) / 10, why: 'Ethane has three H–H eclipsing pairs, but bromoethane has only two: one pair is replaced by the H–Br interaction.' }, { match: Math.round((B - h) * 10) / 10, why: 'Two H–H interactions are eclipsed, not one. Subtract both before you read off the H–Br share.' }].filter((w) => w.match !== ans),
    hints: ['List the eclipsing interactions: how many H–H pairs and how many H–Br pairs?', 'Total barrier = (number of H–H pairs × their value) + the H–Br value. Solve for the H–Br value.']
  };
}

export const CHAIR_TASKS = { bothEq, whichEq, cisTrans, energyAngle, brEclipse };
export const CHAIR_SKILLS = ['chairs', 'conformations'];
const BY_SKILL = { chairs: ['bothEq', 'whichEq', 'cisTrans'], conformations: ['energyAngle', 'brEclipse'] };
const MIX = ['bothEq', 'whichEq', 'cisTrans', 'bothEq', 'whichEq', 'energyAngle', 'brEclipse'];

export function generateChairs(count, { skill = null, rng = Math.random, tasks: only = null } = {}) {
  const tasks = resolveTasks(only, skill && BY_SKILL[skill] ? BY_SKILL[skill] : MIX, CHAIR_TASKS);
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = CHAIR_TASKS[pick(rng, tasks)](rng); tries++; } while (last && p.smiles === last && p.smiles && tries < 6);
    last = p.smiles;
    out.push(p);
  }
  return out;
}
