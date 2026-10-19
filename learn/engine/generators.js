// Mastery / practice problem generators. All answers are computed from RDKit at runtime.
import { analyze, coords2d, VALENCE, NAME, GROUP } from './chem.js';
import { hydrogenPositions } from './widgets/lewis-core.js';
import { generateShape, SHAPE_SKILLS } from './generators-shape.js';
import { generateAcid, ACID_SKILLS } from './generators-acid.js';
import { generateFg, FG_SKILLS } from './generators-fg.js';
import { generateNames, NAMING_SKILLS } from './generators-names.js';
import { generateChairs, CHAIR_SKILLS } from './generators-chairs.js';
import { generateAlkenes, ALKENE_SKILLS } from './generators-alkenes.js';
import { generateMech, MECH_SKILLS } from './generators-mech.js';
import { generateMarkovnikov, MARK_SKILLS } from './generators-markovnikov.js';
import { generateAdditions2, ADD2_SKILLS } from './generators-additions2.js';
import { generateResonance, RES_SKILLS } from './generators-resonance.js';
import { generateAlkynes, ALKYNE_SKILLS } from './generators-alkynes.js';
import { generateEas, EAS_SKILLS } from './generators-eas.js';
import { generateDirectors, DIRECTOR_SKILLS } from './generators-directors.js';
import { generateRs, RS_SKILLS } from './generators-rs.js';
import { generateRel, REL_SKILLS } from './generators-relationships.js';
import { generateFischer, FISCHER_SKILLS } from './generators-fischer.js';
import { generatePredict, PREDICT_SKILLS } from './generators-predict.js';

export const POOL = ['CN', 'CC#N', 'OC=O', 'C[O-]', '[NH4+]', 'CCl', 'C=C', 'CC=O', 'CC(=O)O', 'COC', '[OH3+]', '[CH3+]', '[CH3-]', 'O=C=O'];
const MINUS = '−';
const fmtFC = (n) => (n > 0 ? '+' + n : n < 0 ? MINUS + -n : '0');
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

/** Build a lewis-builder config (all bonds start single, no lone pairs) and its solution from a SMILES. */
export function builderFromSmiles(smiles) {
  const info = analyze(smiles);
  const pos = coords2d(smiles);
  const atoms = info.atoms.map((a, i) => ({ el: a.sym, x: pos[i].x, y: -pos[i].y }));
  const bonds = info.bonds.map((b) => ({ a: b.atoms[0], b: b.atoms[1], order: 1 }));
  const sol = { bonds: info.bonds.map((b) => b.bo ?? 1), lp: info.atoms.map((a) => a.lp), charge: info.atoms.map((a) => a.fc) };
  info.atoms.forEach((a, i) => {
    if (!a.impH) return;
    const nbrAngles = info.bonds.filter((b) => b.atoms.includes(i)).map((b) => { const j = b.atoms[0] === i ? b.atoms[1] : b.atoms[0]; return Math.atan2(atoms[j].y - atoms[i].y, atoms[j].x - atoms[i].x); });
    hydrogenPositions(atoms[i].x, atoms[i].y, nbrAngles, a.impH).forEach((p) => {
      atoms.push({ el: 'H', x: p.x, y: p.y });
      bonds.push({ a: i, b: atoms.length - 1, order: 1 });
      sol.bonds.push(1); sol.lp.push(0); sol.charge.push(0);
    });
  });
  // fix: H atoms were appended after heavy ones; lp/charge arrays for heavy atoms already first in order
  return { atoms, bonds, target: smiles, solution: sol };
}

function candidates(info, kind) {
  if (kind === 'hetero') return info.heavy.filter((a) => a.sym !== 'C' || a.fc !== 0);
  return info.heavy.filter((a) => a.sym !== 'C' || a.fc !== 0 || a.nbrs.length > 0);
}

function lpProblem(rng, smi) {
  const info = analyze(smi);
  let c = candidates(info, 'hetero');
  if (!c.length) c = info.heavy;
  const a = pick(rng, c);
  const bs = a.bondSum;
  return {
    kind: 'input', skill: 'lone-pairs', smiles: smi, highlight: [a.idx],
    prompt: `How many lone pairs does the highlighted ${a.sym} atom have?`,
    answer: a.lp,
    derive: `${NAME[a.sym]} brings ${a.V} valence electrons${a.fc ? ` and has formal charge ${fmtFC(a.fc)}` : ''}. Lone pairs = (${a.V} ${MINUS} (${fmtFC(a.fc)}) ${MINUS} ${bs} bonds) \u00F7 2 = ${a.lp}.`,
    wrong: [{ match: 2 * a.lp, why: `${2 * a.lp} is the number of lone-pair electrons. Each lone pair is 2 electrons, so divide by 2.` }],
    hints: ['Start from the valence electrons of the neutral atom, then adjust for the charge.', 'Subtract the electrons used in bonds (one per bond), then divide what is left by 2.']
  };
}

function fcProblem(rng, smi) {
  const info = analyze(smi);
  const c = info.heavy.filter((a) => a.sym !== 'C' || a.fc !== 0 || info.heavy.length === 1);
  const a = pick(rng, c.length ? c : info.heavy);
  const lpe = 2 * a.lp;
  return {
    kind: 'input', skill: 'formal-charge', smiles: smi, highlight: [a.idx],
    prompt: `What is the formal charge on the highlighted ${a.sym} atom? (Write 0, +1, −1 …)`,
    answer: a.fc,
    derive: `FC = valence e⁻ ${MINUS} lone-pair e⁻ ${MINUS} bonds = ${a.V} ${MINUS} ${lpe} ${MINUS} ${a.bondSum} = ${fmtFC(a.fc)}.`,
    wrong: a.fc !== 0 ? [{ match: -a.fc, why: `The sign is flipped. ${a.sym} owns ${lpe} + ${a.bondSum} = ${lpe + a.bondSum} electrons against a normal ${a.V}; ${lpe + a.bondSum > a.V ? 'owning more than normal makes it negative' : 'owning fewer than normal makes it positive'}.` }] : [{ match: 1, why: `${a.sym} owns ${lpe} + ${a.bondSum} = ${lpe + a.bondSum} electrons, which is exactly its normal ${a.V}, so the charge is 0.` }],
    hints: ['Count the lone-pair electrons on the atom (2 per pair) and the bonds it makes.', `FC = ${a.V} ${MINUS} (lone-pair electrons) ${MINUS} (number of bonds).`]
  };
}

function totalProblem(rng, smi) {
  const info = analyze(smi);
  const parts = [];
  info.heavy.forEach((a) => parts.push(`${a.sym} ${a.V}`));
  const hs = info.atoms.reduce((s, a) => s + a.impH, 0);
  if (hs) parts.push(`${hs} H × 1`);
  const ch = info.netCharge;
  return {
    kind: 'input', skill: 'electron-count-total', smiles: smi, highlight: [],
    prompt: 'How many valence electrons in total does this molecule or ion have?',
    answer: info.totalValence,
    derive: `Add each atom's valence electrons: ${parts.join(' + ')}${ch ? (ch > 0 ? `, then subtract ${ch} for the + charge` : `, then add ${-ch} for the ${MINUS} charge`) : ''} = ${info.totalValence}.`,
    wrong: ch ? [{ match: info.totalValence + ch, why: `You forgot the charge. A ${ch > 0 ? 'positive ion has lost' : 'negative ion has gained'} ${Math.abs(ch)} electron${Math.abs(ch) > 1 ? 's' : ''}.` }] : [],
    hints: ['Count every atom, hydrogens included (skeletal drawings leave out the H on carbon).', 'H gives 1, C 4, N 5, O 6, halogens 7. Adjust for any charge at the end.']
  };
}

function builderProblem(rng, smi, skill) {
  const cfg = builderFromSmiles(smi);
  const info = analyze(smi);
  const multi = info.bonds.some((b) => (b.bo ?? 1) > 1);
  return {
    kind: 'builder', skill: skill || (multi ? 'multiple-bonds' : info.netCharge || info.heavy.some((a) => a.fc) ? 'formal-charge' : 'lone-pairs'),
    smiles: smi,
    prompt: `Build the Lewis structure of ${formula(smi)}. Set the bond orders, add lone pairs, and set any charges.`,
    config: cfg,
    derive: 'Every atom needs an octet (H needs 2). Lone pairs = (valence − charge − bonds) ÷ 2, and the formal charge is valence − lone-pair electrons − bonds.',
    hints: ['Check each atom: 2 electrons per bond plus 2 per lone pair should reach 8 (2 for H).', 'Charged atoms: compare the electrons an atom owns with the number its neutral form brings.']
  };
}

function valenceProblem(rng) {
  const el = pick(rng, ['H', 'C', 'N', 'O', 'F', 'Cl']);
  return {
    kind: 'input', skill: 'valence-electrons', smiles: null, highlight: [],
    prompt: `How many valence electrons does a neutral ${NAME[el].toLowerCase()} atom (${el}) have?`,
    answer: VALENCE[el],
    derive: `${el} is in group ${GROUP[el]}, so it has ${VALENCE[el]} valence electron${VALENCE[el] > 1 ? 's' : ''} (the last digit of the group number).`,
    wrong: [],
    hints: ['Use the group number of the element.', 'For main-group atoms the last digit of the group number is the valence-electron count.']
  };
}

function bondCountProblem(rng) {
  const el = pick(rng, ['H', 'C', 'N', 'O', 'F', 'Cl']);
  const bonds = el === 'H' ? 2 - 1 : 8 - VALENCE[el];
  return {
    kind: 'input', skill: 'bond-count', smiles: null, highlight: [],
    prompt: `In a stable neutral molecule, how many bonds does ${NAME[el].toLowerCase()} (${el}) usually make?`,
    answer: bonds,
    derive: `${el} has ${VALENCE[el]} valence electron${VALENCE[el] > 1 ? 's' : ''}; bonds needed = ${el === 'H' ? 2 : 8} ${MINUS} ${VALENCE[el]} = ${bonds}.`,
    wrong: [{ match: VALENCE[el], why: `${VALENCE[el]} is the valence electron count, not the bond count. Bonds = ${el === 'H' ? 2 : 8} ${MINUS} valence electrons.` }].filter((w) => w.match !== bonds),
    hints: ['Atoms want 8 electrons around them (2 for H).', 'Each bond adds one shared electron, so bonds = 8 minus the valence electrons.']
  };
}

function octetProblem(rng, smi) {
  const info = analyze(smi);
  const a = pick(rng, info.heavy);
  return {
    kind: 'input', skill: 'octet', smiles: smi, highlight: [a.idx],
    prompt: `How many electrons surround the highlighted ${a.sym} atom (count 2 per bond and 2 per lone pair)?`,
    answer: a.electrons,
    derive: `${a.bondSum} bond${a.bondSum === 1 ? '' : 's'} × 2 = ${2 * a.bondSum}, plus ${a.lp} lone pair${a.lp === 1 ? '' : 's'} × 2 = ${2 * a.lp}, giving ${a.electrons}.`,
    wrong: [],
    hints: ['Count the bonds on the atom, bonds to hydrogens included (skeletal drawings leave out the H on carbon).', 'A double bond counts as two bonds. Each bond contributes 2 electrons, each lone pair 2.']
  };
}

const BASIC_TASKS = ['lp', 'fc', 'total', 'builder'];
const hasMulti = (smi) => analyze(smi).bonds.some((b) => (b.bo ?? 1) > 1);
const smallPool = () => POOL.filter((s) => analyze(s).heavy.length <= 4);

export function makeProblem(rng, task, smi) {
  switch (task) {
    case 'lp': return lpProblem(rng, smi || pick(rng, POOL.filter((x) => candidates(analyze(x), 'hetero').length)));
    case 'fc': return fcProblem(rng, smi || pick(rng, POOL));
    case 'total': return totalProblem(rng, smi || pick(rng, POOL));
    case 'builder': return builderProblem(rng, smi || pick(rng, smallPool()));
    case 'builder-multi': return builderProblem(rng, smi || pick(rng, smallPool().filter(hasMulti)), 'multiple-bonds');
    case 'valence': return valenceProblem(rng);
    case 'bonds': return bondCountProblem(rng);
    case 'octet': return octetProblem(rng, smi || pick(rng, POOL));
    default: throw new Error('unknown task ' + task);
  }
}

const BY_SKILL = { 'lone-pairs': ['lp'], 'formal-charge': ['fc'], 'electron-count-total': ['total'], 'multiple-bonds': ['builder-multi'], 'octet': ['octet'], 'valence-electrons': ['valence'], 'bond-count': ['bonds'] };

/** generate(generatorId, count, {skill, rng}) -> problems. Fresh random molecules each call. */
export function generate(generatorId, count, { skill = null, rng = Math.random } = {}) {
  if (generatorId === 'shape-basic') return generateShape(count, { skill, rng });
  if (generatorId === 'acid-base') return generateAcid(count, { skill, rng });
  if (generatorId === 'skeletal-fg') return generateFg(count, { skill, rng });
  if (generatorId === 'alkane-names') return generateNames(count, { skill, rng });
  if (generatorId === 'chairs') return generateChairs(count, { skill, rng });
  if (generatorId === 'alkene-names') return generateAlkenes(count, { skill, rng });
  if (generatorId === 'mechanism-basics') return generateMech(count, { skill, rng });
  if (generatorId === 'markovnikov') return generateMarkovnikov(count, { skill, rng });
  if (generatorId === 'alkene-additions-2') return generateAdditions2(count, { skill, rng });
  if (generatorId === 'resonance') return generateResonance(count, { skill, rng });
  if (generatorId === 'alkynes') return generateAlkynes(count, { skill, rng });
  if (generatorId === 'eas-basics') return generateEas(count, { skill, rng });
  if (generatorId === 'directors') return generateDirectors(count, { skill, rng });
  if (generatorId === 'rs') return generateRs(count, { skill, rng });
  if (generatorId === 'stereo-relationships') return generateRel(count, { skill, rng });
  if (generatorId === 'fischer') return generateFischer(count, { skill, rng });
  if (generatorId === 'predict-product') return generatePredict(count, { skill, rng });
  const tasks = skill && BY_SKILL[skill] ? BY_SKILL[skill] : BASIC_TASKS;
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeProblem(rng, tasks.length === 1 ? tasks[0] : pick(rng, tasks)); tries++; } while (last && p.smiles && p.smiles === last && tries < 5);
    last = p.smiles;
    out.push(p);
  }
  return out;
}
export const GENERATORS = { 'lewis-basic': true, 'shape-basic': true, 'acid-base': true, 'skeletal-fg': true, 'alkane-names': true, 'chairs': true, 'alkene-names': true, 'mechanism-basics': true, 'markovnikov': true, 'alkene-additions-2': true, 'resonance': true, 'alkynes': true, 'eas-basics': true, 'directors': true, 'rs': true, 'stereo-relationships': true, 'fischer': true, 'predict-product': true };
/** Which generator serves "Practise this" for a weak-spot skill. */
export function generatorForSkill(skill) { return PREDICT_SKILLS.includes(skill) ? 'predict-product' : FISCHER_SKILLS.includes(skill) ? 'fischer' : REL_SKILLS.includes(skill) ? 'stereo-relationships' : RS_SKILLS.includes(skill) ? 'rs' : DIRECTOR_SKILLS.includes(skill) ? 'directors' : EAS_SKILLS.includes(skill) ? 'eas-basics' : ALKYNE_SKILLS.includes(skill) ? 'alkynes' : RES_SKILLS.includes(skill) ? 'resonance' : ADD2_SKILLS.includes(skill) ? 'alkene-additions-2' : MARK_SKILLS.includes(skill) ? 'markovnikov' : MECH_SKILLS.includes(skill) ? 'mechanism-basics' : ALKENE_SKILLS.includes(skill) ? 'alkene-names' : CHAIR_SKILLS.includes(skill) ? 'chairs' : NAMING_SKILLS.includes(skill) ? 'alkane-names' : FG_SKILLS.includes(skill) ? 'skeletal-fg' : ACID_SKILLS.includes(skill) ? 'acid-base' : SHAPE_SKILLS.includes(skill) ? 'shape-basic' : 'lewis-basic'; }

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const subNum = (n) => (n === 1 ? '' : String(n).split('').map((d) => SUBS[d]).join(''));
/** Hill-order molecular formula with Unicode subscripts and charge, e.g. C₂H₃N, CH₃O⁻. */
export function formula(smiles) {
  const info = analyze(smiles);
  const cnt = {};
  info.atoms.forEach((a) => { cnt[a.sym] = (cnt[a.sym] || 0) + 1; if (a.impH) cnt.H = (cnt.H || 0) + a.impH; });
  const order = Object.keys(cnt).filter((k) => k !== 'C' && k !== 'H').sort();
  const seq = (cnt.C ? ['C'] : []).concat(cnt.H ? ['H'] : []).concat(order);
  let s = seq.map((k) => k + subNum(cnt[k])).join('');
  const q = info.netCharge;
  if (q) s += (Math.abs(q) > 1 ? String(Math.abs(q)) : '') + (q > 0 ? '⁺' : '⁻');
  return s;
}
