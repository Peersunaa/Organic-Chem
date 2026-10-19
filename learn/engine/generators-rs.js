// Mastery generator "rs" (Lesson 15): chirality centers, R/S from a wedge drawing, the mirror-image name, naming with an (R)/(S) prefix,
// specific rotation calculations and enantiomer rotation. Molecules come from a pool of about 40 small chiral compounds (C, H, O, N, Cl, Br;
// some with a C=O or C=C branch); every label is computed by engine/cip.js and agrees with Python RDKit (rdCIPLabeler) in the tests, every name
// (with its R/S prefix) is checked against OPSIN.
import { tetraInfo, chiralCenters } from './cip.js';
import { flipStereo, specificRotation, observedRotation, roundTo, signed } from './chirality.js';

export const RS_SKILLS = ['chirality', 'rs'];
export const RS_TASKS = ['centers', 'rs', 'rs', 'mirror', 'name', 'alpha', 'sign'];

// smiles: ONE stereocentre written with @ / @@ (either enantiomer; the generator flips it at random); names are the stereo-free names in both IUPAC styles.
export const RS_POOL = [
  { id: 'butan-2-ol', smiles: 'C[C@H](O)CC', new: 'butan-2-ol', old: '2-butanol' },
  { id: '2-bromobutane', smiles: 'C[C@H](Br)CC', new: '2-bromobutane', old: '2-bromobutane' },
  { id: '2-chlorobutane', smiles: 'C[C@H](Cl)CC', new: '2-chlorobutane', old: '2-chlorobutane' },
  { id: 'butan-2-amine', smiles: 'C[C@H](N)CC', new: 'butan-2-amine', old: '2-butanamine' },
  { id: 'pentan-2-ol', smiles: 'C[C@H](O)CCC', new: 'pentan-2-ol', old: '2-pentanol' },
  { id: '2-bromopentane', smiles: 'C[C@H](Br)CCC', new: '2-bromopentane', old: '2-bromopentane' },
  { id: '2-chloropentane', smiles: 'C[C@H](Cl)CCC', new: '2-chloropentane', old: '2-chloropentane' },
  { id: 'hexan-3-ol', smiles: 'CC[C@H](O)CCC', new: 'hexan-3-ol', old: '3-hexanol' },
  { id: '3-bromohexane', smiles: 'CC[C@H](Br)CCC', new: '3-bromohexane', old: '3-bromohexane' },
  { id: '3-methylhexane', smiles: 'CC[C@H](C)CCC', new: '3-methylhexane', old: '3-methylhexane' },
  { id: '2,4-dimethylhexane', smiles: 'CC[C@H](C)CC(C)C', new: '2,4-dimethylhexane', old: '2,4-dimethylhexane' },
  { id: '1-bromo-1-chloroethane', smiles: 'C[C@H](Cl)Br', new: '1-bromo-1-chloroethane', old: '1-bromo-1-chloroethane' },
  { id: '1-chloropropan-2-ol', smiles: 'C[C@H](O)CCl', new: '1-chloropropan-2-ol', old: '1-chloro-2-propanol' },
  { id: 'propane-1,2-diol', smiles: 'C[C@H](O)CO', new: 'propane-1,2-diol', old: '1,2-propanediol' },
  { id: '2-aminopropan-1-ol', smiles: 'C[C@H](N)CO', new: '2-aminopropan-1-ol', old: '2-amino-1-propanol' },
  { id: '1-aminopropan-2-ol', smiles: 'C[C@H](O)CN', new: '1-aminopropan-2-ol', old: '1-amino-2-propanol' },
  { id: '2-chloropropan-1-ol', smiles: 'C[C@H](Cl)CO', new: '2-chloropropan-1-ol', old: '2-chloro-1-propanol' },
  { id: '3-chloropropane-1,2-diol', smiles: 'ClC[C@H](O)CO', new: '3-chloropropane-1,2-diol', old: '3-chloro-1,2-propanediol' },
  { id: '2-methylbutan-1-ol', smiles: 'CC[C@H](C)CO', new: '2-methylbutan-1-ol', old: '2-methyl-1-butanol' },
  // carbonyl branches
  { id: 'lactic acid', smiles: 'C[C@H](O)C(=O)O', new: '2-hydroxypropanoic acid', old: '2-hydroxypropanoic acid', common: 'lactic acid', carbonyl: true },
  { id: 'alanine', smiles: 'C[C@H](N)C(=O)O', new: '2-aminopropanoic acid', old: '2-aminopropanoic acid', common: 'alanine', carbonyl: true },
  { id: '2-chloropropanoic acid', smiles: 'C[C@H](Cl)C(=O)O', new: '2-chloropropanoic acid', old: '2-chloropropanoic acid', carbonyl: true },
  { id: '2-bromopropanoic acid', smiles: 'C[C@H](Br)C(=O)O', new: '2-bromopropanoic acid', old: '2-bromopropanoic acid', carbonyl: true },
  { id: '2-aminobutanoic acid', smiles: 'CC[C@H](N)C(=O)O', new: '2-aminobutanoic acid', old: '2-aminobutanoic acid', carbonyl: true },
  { id: '2-hydroxybutanoic acid', smiles: 'CC[C@H](O)C(=O)O', new: '2-hydroxybutanoic acid', old: '2-hydroxybutanoic acid', carbonyl: true },
  { id: '2-methylbutanoic acid', smiles: 'CC[C@H](C)C(=O)O', new: '2-methylbutanoic acid', old: '2-methylbutanoic acid', carbonyl: true },
  { id: 'serine', smiles: 'N[C@H](CO)C(=O)O', new: '2-amino-3-hydroxypropanoic acid', old: '2-amino-3-hydroxypropanoic acid', common: 'serine', carbonyl: true },
  { id: 'valine', smiles: 'CC(C)[C@H](N)C(=O)O', new: '2-amino-3-methylbutanoic acid', old: '2-amino-3-methylbutanoic acid', common: 'valine', carbonyl: true },
  { id: '2-methylbutanal', smiles: 'CC[C@H](C)C=O', new: '2-methylbutanal', old: '2-methylbutanal', carbonyl: true },
  { id: '2-hydroxypropanal', smiles: 'C[C@H](O)C=O', new: '2-hydroxypropanal', old: '2-hydroxypropanal', carbonyl: true },
  { id: 'glyceraldehyde', smiles: 'OC[C@H](O)C=O', new: '2,3-dihydroxypropanal', old: '2,3-dihydroxypropanal', common: 'glyceraldehyde', carbonyl: true },
  { id: '3-hydroxybutanal', smiles: 'C[C@H](O)CC=O', new: '3-hydroxybutanal', old: '3-hydroxybutanal', carbonyl: true },
  { id: '3-methylpentan-2-one', smiles: 'CC[C@H](C)C(C)=O', new: '3-methylpentan-2-one', old: '3-methyl-2-pentanone', carbonyl: true },
  // C=C branches
  { id: '3-methylpent-1-ene', smiles: 'C=C[C@H](C)CC', new: '3-methylpent-1-ene', old: '3-methyl-1-pentene', alkene: true },
  { id: '3-bromobut-1-ene', smiles: 'C=C[C@H](C)Br', new: '3-bromobut-1-ene', old: '3-bromo-1-butene', alkene: true },
  { id: '3-chlorobut-1-ene', smiles: 'C=C[C@H](C)Cl', new: '3-chlorobut-1-ene', old: '3-chloro-1-butene', alkene: true },
  { id: 'but-3-en-2-ol', smiles: 'C=C[C@H](C)O', new: 'but-3-en-2-ol', old: '3-buten-2-ol', alkene: true },
  { id: 'pent-1-en-3-ol', smiles: 'C=C[C@H](O)CC', new: 'pent-1-en-3-ol', old: '1-penten-3-ol', alkene: true },
  { id: 'pent-4-en-2-ol', smiles: 'C=CC[C@H](C)O', new: 'pent-4-en-2-ol', old: '4-penten-2-ol', alkene: true },
  // no hydrogen on the centre: the lowest-priority group is a carbon group
  { id: '3-methylhexan-3-ol', smiles: 'CC[C@](C)(O)CCC', new: '3-methylhexan-3-ol', old: '3-methyl-3-hexanol', quaternary: true },
  { id: '2-bromo-2-chlorobutane', smiles: 'CC[C@](C)(Br)Cl', new: '2-bromo-2-chlorobutane', old: '2-bromo-2-chlorobutane', quaternary: true },
  { id: '2-amino-2-methylbutanoic acid', smiles: 'CC[C@](C)(N)C(=O)O', new: '2-amino-2-methylbutanoic acid', old: '2-amino-2-methylbutanoic acid', quaternary: true, carbonyl: true },
  { id: '3-methylpent-1-en-3-ol', smiles: 'CC[C@](C)(O)C=C', new: '3-methylpent-1-en-3-ol', old: '3-methyl-1-penten-3-ol', quaternary: true, alkene: true }
];

// molecules for "find the chirality centers": chiral and achiral, some with rings, a carbonyl or a benzene ring (centres checked against RDKit in the tests)
export const CENTER_POOL = [
  { smiles: 'CCC(C)O', n: 1 }, { smiles: 'CC(C)O', n: 0 }, { smiles: 'CCC(O)CC', n: 0 }, { smiles: 'CCC(C)Cl', n: 1 }, { smiles: 'CC(C)CC', n: 0 },
  { smiles: 'CCC(C)CC', n: 0 }, { smiles: 'CCCC(C)CC', n: 1 }, { smiles: 'CC(C)(C)Br', n: 0 }, { smiles: 'CC(Br)C(C)=O', n: 1 }, { smiles: 'CCC(=O)CC', n: 0 },
  { smiles: 'CC1CCCCC1', n: 0 }, { smiles: 'CC1(O)CCCCC1', n: 0 }, { smiles: 'CC1CCCCC1=O', n: 1 }, { smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O', n: 1 },
  { smiles: 'CC1=CCC(CC1=O)C(C)=C', n: 1 }, { smiles: 'CC1=CCC(CC1)C(C)=C', n: 1 }, { smiles: 'NC(C)C(=O)O', n: 1 }, { smiles: 'NCC(=O)O', n: 0 },
  { smiles: 'OCC(O)C=O', n: 1 }, { smiles: 'OCCO', n: 0 }, { smiles: 'CC(O)C(C)Cl', n: 2 }, { smiles: 'C=CC(C)CC', n: 1 }, { smiles: 'CC=CC(C)C', n: 0 },
  { smiles: 'CCC(C)C(=O)O', n: 1 }, { smiles: 'CC(C)C(=O)O', n: 0 }, { smiles: 'ClC(Br)CC', n: 1 }, { smiles: 'CC(O)CC(C)O', n: 2 }, { smiles: 'c1ccccc1C(C)O', n: 1 },
  { smiles: 'c1ccccc1CC', n: 0 }, { smiles: 'CC(=O)C(C)CC', n: 1 }
];

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const sub = (n) => (n > 1 ? String(n).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[d]).join('') : '');

/** One pool molecule as a specific enantiomer: { entry, smiles, label ('R'|'S'), center }. */
export function pickMolecule(rng, id = null, want = null, only = null) {
  const entry = id ? RS_POOL.find((e) => e.id === id) : pick(rng, only ? RS_POOL.filter(only) : RS_POOL);
  let smiles = entry.smiles;
  if (rng() < 0.5) smiles = flipStereo(smiles);
  let T = tetraInfo(smiles).find((x) => x.center && x.label);
  if (want && T.label !== want) { smiles = flipStereo(smiles); T = tetraInfo(smiles).find((x) => x.center && x.label); }
  return { entry, smiles, label: T.label, center: T.atom, T };
}
/** Name with the (R)/(S) prefix in both styles. */
export const rsName = (entry, label) => ({ new: `(${label})-${entry.new}`, old: `(${label})-${entry.old}` });
export const otherLabel = (l) => (l === 'R' ? 'S' : 'R');

// ---------------------------------------------------------------- 1. find the centers
function centersProblem(rng) {
  const e = pick(rng, CENTER_POOL);
  const centers = chiralCenters(e.smiles);
  return {
    kind: 'widget', widget: 'stereocenter-finder', skill: 'chirality', smiles: null,
    prompt: 'Find the chirality centers in this molecule. Tap each one, or say there is none.',
    config: { rounds: [{ smiles: e.smiles }] }, centers,
    derive: centers.length ? `A chirality center is an sp³ carbon bonded to four different groups. Here there ${centers.length === 1 ? 'is 1' : 'are ' + centers.length}.` : 'No carbon has four different groups: carbons with a double bond, CH₃ and CH₂ groups, and carbons with two identical groups are never chirality centers.',
    hints: ['Check each sp³ carbon in turn. Does it have four different groups, counting any hydrogen that is not drawn?', 'CH₃ and CH₂ carbons, and carbons with a double bond, can never be chirality centers. If two of the four groups are the same, it is not a center either.']
  };
}

// ---------------------------------------------------------------- 2. assign R/S on a wedge drawing
function rsProblem(rng) {
  const m = pickMolecule(rng);
  const style = m.entry.quaternary ? (rng() < 0.5 ? 'low' : 'two') : (rng() < 0.55 ? 'low' : 'two');
  const lowOn = rng() < 0.5 ? 'wedge' : 'dash';
  const config = { mode: 'wedge', smiles: m.smiles, style, lowOn, pair: Math.floor(rng() * 3), flow: rng() < 0.5 ? 'full' : 'quick', ask: 'Assign R or S to the chirality center in this drawing (a solid wedge comes toward you, a dashed bond goes away).' };
  return {
    kind: 'widget', widget: 'rs-assigner', skill: 'rs', smiles: null,
    prompt: 'Is the chirality center in this drawing R or S?',
    config, answer: m.label, entry: m.entry,
    derive: `Rank the four groups with the CIP rules, put group 4 away from you, and follow 1 → 2 → 3: clockwise is R, counterclockwise is S. A lowest-priority group on a wedge means reverse the direction you read. This center is ${m.label}.`,
    hints: ['Rank the four groups first: higher atomic number wins at the first atom; on a tie compare the atoms attached, highest first.', 'Group 4 should point away from you. If it is on a wedge, read 1 → 2 → 3 as it is drawn and then reverse; if it is a plain bond, swap it with the dashed group, read, and reverse once.']
  };
}

// ---------------------------------------------------------------- 3. the mirror image's name / 4. name with prefix
function mirrorProblem(rng) {
  const m = pickMolecule(rng);
  const mine = rsName(m.entry, m.label), mirror = rsName(m.entry, otherLabel(m.label));
  return {
    kind: 'input', name: true, skill: 'chirality', smiles: m.smiles,
    prompt: `This is ${mine.new}. Type the full name of its mirror image (its enantiomer), in either IUPAC style. Spaces and capitals do not matter.`,
    promptHtml: `This is <name new="${mine.new}" old="${mine.old}"></name>. Type the full name of its mirror image (its enantiomer), in either IUPAC style. Spaces and capitals do not matter.`,
    answer: mirror.new, accept: mirror.old === mirror.new ? [] : [mirror.old],
    wrong: [{ match: mine.new, why: `That is the name of the molecule shown. The mirror image has the OPPOSITE configuration at every chirality center, so with one center the letter flips.` }].concat(mine.old !== mine.new ? [{ match: mine.old, why: 'That is the name of the molecule shown. The mirror image has the opposite letter.' }] : []),
    fallback: `The mirror image has the same name apart from the letter: ${m.label === 'R' ? 'S' : 'R'} instead of ${m.label}, in brackets at the front: (${otherLabel(m.label)})-… .`,
    derive: `A mirror image has the opposite configuration at the center, so R becomes S (and S becomes R). The rest of the name is unchanged: ${mirror.new}.`,
    hints: ['A mirror image is an enantiomer: every chirality center is reversed. Only the letter in front changes.', `Write the name as (${otherLabel(m.label)})- followed by the rest of the name, which is the same.`]
  };
}
// The learner must TYPE this name, and the lessons teach only alkane, halo and alcohol (-ol) names: no acids, aldehydes, ketones, amines, diols or alkenols.
const NAMEABLE = (e) => !e.carbonyl && !e.alkene && !/amin|diol/.test(e.new);
function nameProblem(rng) {
  const m = pickMolecule(rng, null, null, NAMEABLE);
  const nm = rsName(m.entry, m.label), wrongNm = rsName(m.entry, otherLabel(m.label));
  return {
    kind: 'input', name: true, skill: 'rs', smiles: m.smiles,
    prompt: 'Give the full IUPAC name of this molecule, including (R) or (S) at the front. Either IUPAC style is accepted.',
    answer: nm.new, accept: nm.old === nm.new ? [] : [nm.old],
    wrong: [{ match: wrongNm.new, why: `The name is right but the letter is not: this center is ${m.label}, not ${otherLabel(m.label)}.` }].concat(wrongNm.old !== wrongNm.new ? [{ match: wrongNm.old, why: `The name is right but the letter is not: this center is ${m.label}.` }] : []).concat([{ match: m.entry.new, why: 'This molecule has a chirality center, so its name needs (R) or (S) in brackets at the front.' }]),
    fallback: 'Name the molecule as usual (longest chain, groups, locants), then add (R) or (S) in brackets at the front, from the CIP rules.',
    derive: `The center is ${m.label}: ${nm.new}.`,
    hints: ['First name the molecule as if it had no stereochemistry.', 'Then work out R or S for the center and put it in brackets at the front.']
  };
}

// ---------------------------------------------------------------- 5. specific rotation
function alphaProblem(rng) {
  const lengths = [[1.00, '10.0 cm'], [2.00, '20.0 cm'], [0.50, '5.00 cm'], [1.00, '1.00 dm'], [2.00, '2.00 dm']];
  const [lDm, lText] = pick(rng, lengths);
  const grams = pick(rng, [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]);
  const mL = pick(rng, [10.0, 10.0, 20.0, 25.0, 5.0]);
  const spec = pick(rng, [-1, 1]) * pick(rng, [6.5, 8.2, 12.4, 15.0, 23.5, 33.0, 41.2, 56.5]);
  const alpha = roundTo(observedRotation(spec, lDm, grams, mL), 2);
  if (alpha === 0) return alphaProblem(rng);
  const c = grams / mL;
  const answer = roundTo(specificRotation(alpha, lDm, grams, mL), 1);
  return {
    kind: 'input', skill: 'chirality', smiles: null, tolerance: 0.1, data: { alpha, lengthDm: lDm, grams, mL },
    prompt: `A solution of ${grams.toFixed(2)} g of an optically active compound in ${mL.toFixed(1)} mL of solvent is placed in a ${lText} sample tube. The observed rotation is ${signed(alpha)}°. Calculate [α]D (write the sign; an answer within 0.1 is accepted).`,
    answer, accept: [],
    wrong: [{ match: -answer, why: 'The sign is flipped. The specific rotation has the same sign as the observed rotation (+ for dextrorotatory, − for levorotatory).' }],
    fallback: '[α]D = observed rotation ÷ (length in dm × concentration in g/mL). Convert cm to dm (10 cm = 1 dm) and divide the mass by the volume to get g/mL.',
    derive: `l = ${lDm} dm, c = ${grams.toFixed(2)} g ÷ ${mL.toFixed(1)} mL = ${c.toFixed(3)} g/mL, so [α]D = ${alpha} ÷ (${lDm} × ${c.toFixed(3)}) = ${answer}.`,
    hints: ['Write [α]D = α ÷ (l × c). The length must be in decimetres (10 cm = 1 dm) and the concentration in g/mL.', `c = mass ÷ volume = ${grams.toFixed(2)} g ÷ ${mL.toFixed(1)} mL. Then divide the observed rotation by l × c.`]
  };
}
// ---------------------------------------------------------------- 6. the enantiomer's rotation
function signProblem(rng) {
  const m = pickMolecule(rng);
  const v = pick(rng, [3.8, 6.2, 8.4, 11.5, 14.7, 22.0, 31.5, 48.6]) * pick(rng, [-1, 1]);
  const other = otherLabel(m.label);
  return {
    kind: 'input', skill: 'chirality', smiles: m.smiles,
    prompt: `The enantiomer shown, the (${m.label}) form, has [α]D = ${signed(v)}. What is [α]D of the (${other}) form? (Write the sign.)`,
    answer: -v, accept: [], wrong: [{ match: v, why: 'Enantiomers rotate plane-polarized light by the same amount in opposite directions. Same size, opposite sign.' }],
    fallback: 'Enantiomers have equal and opposite specific rotations.',
    derive: `Enantiomers rotate by equal amounts in opposite directions, so the (${other}) form has [α]D = ${signed(-v)}. R and S say nothing about + or −: that is measured, not worked out.`,
    hints: ['Enantiomers are mirror images. How do their rotations compare?', 'Equal in size, opposite in sign.']
  };
}

export function makeRsProblem(rng, task) {
  switch (task) {
    case 'centers': return centersProblem(rng);
    case 'rs': return rsProblem(rng);
    case 'mirror': return mirrorProblem(rng);
    case 'name': return nameProblem(rng);
    case 'alpha': return alphaProblem(rng);
    case 'sign': return signProblem(rng);
    default: throw new Error('unknown task ' + task);
  }
}
export function generateRs(count, { skill = null, rng = Math.random } = {}) {
  const tasks = skill === 'rs' ? ['rs', 'rs', 'name'] : skill === 'chirality' ? ['centers', 'mirror', 'alpha', 'sign', 'centers'] : RS_TASKS;
  const out = [];
  const start = Math.floor(rng() * tasks.length);
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeRsProblem(rng, tasks[(start + i) % tasks.length]); tries++; } while (last && last === (p.config && p.config.smiles || p.smiles || p.prompt) && tries < 6);
    last = p.config && p.config.smiles || p.smiles || p.prompt;
    out.push(p);
  }
  return out;
}
