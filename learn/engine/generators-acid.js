// Mastery generator "acid-base" (Lesson 03). Every answer is computed from the pKa table in acidbase.js,
// from RDKit structure data, or from the arrow-core scene; nothing is hand-typed per problem.
import { analyze, canon } from './chem.js';
import { ACIDS, ACID, reaction, deprotonate, protonate, lewisRole } from './acidbase.js';
import { sceneFromSmiles, lpCount, applyArrows } from './widgets/arrow-core.js';
import { formula } from './generators.js';
import { resolveTasks } from './task-list.js';

const MINUS = '−';
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/** Two different acids whose pKa values differ by at least `gap`. */
function twoAcids(rng, gap = 1) {
  for (let n = 0; n < 200; n++) {
    const a = pick(rng, ACIDS), b = pick(rng, ACIDS);
    if (a.id !== b.id && Math.abs(a.pka - b.pka) >= gap) return [a, b];
  }
  return [ACID.acetic, ACID.water];
}

function directionProblem(rng) {
  const [A, B] = twoAcids(rng, 1);
  const rx = reaction(A.id, B.id);
  const L = rx.left[0], Rt = rx.right[1];
  const win = rx.favoured;
  const weak = win === 'left' ? L : Rt, strong = win === 'left' ? Rt : L;
  const calc = `${L.label} has pKa ${L.pkaText} and ${Rt.label} has pKa ${Rt.pkaText}`;
  return {
    kind: 'choice', skill: 'pka-direction', smiles: null, reaction: { reactants: rx.reactants, products: rx.products },
    prompt: `Which side does this equilibrium favour? ${rx.text}  (acids: ${L.label} pKa ${L.pkaText}, ${Rt.label} pKa ${Rt.pkaText})`,
    options: [
      { text: 'Left side (the reactants)', side: 'left', correct: win === 'left', why: win === 'left' ? `Yes: ${calc}. The left side holds the weaker acid, ${L.label}.` : `${calc}. The left side holds ${L.label}, the stronger acid, so that side is used up. The equilibrium favours the side with the weaker acid (higher pKa).` },
      { text: 'Right side (the products)', side: 'right', correct: win === 'right', why: win === 'right' ? `Yes: ${calc}. The right side holds the weaker acid, ${Rt.label}.` : `${calc}. The right side holds ${Rt.label}, the stronger acid, so that side is used up. The equilibrium favours the side with the weaker acid (higher pKa).` }
    ],
    answer: win === 'left' ? 'Left side (the reactants)' : 'Right side (the products)',
    derive: `Find the acid on each side: ${calc}. Equilibrium favours the side with the weaker acid, the higher pKa. ${weak.label} (${weak.pkaText}) is weaker than ${strong.label} (${strong.pkaText}), so the ${win} side is favoured.`,
    hints: ['Locate the acid on each side: it is the species that still has the H⁺ to give (HA, not A⁻).', 'Compare the two pKa values. The side holding the acid with the HIGHER pKa is favoured.']
  };
}

function conjBaseProblem(rng) {
  const A = pick(rng, ACIDS);
  const right = canon(deprotonate(A.ha, A.site));
  const options = [{ text: A.aLabel, smiles: A.a, correct: true, why: `Yes. Taking H⁺ off ${A.haLabel} leaves ${A.aLabel}, one charge more negative.` }];
  const cat = protonate(A.ha, A.site);
  if (cat) options.push({ text: formula(cat), smiles: cat, why: `That has gained H⁺, not lost it. It is the conjugate ACID of ${A.haLabel}. A conjugate base is what is left after the acid gives away H⁺.` });
  for (const B of shuffle(rng, ACIDS.filter((x) => x.id !== A.id))) {
    if (options.length >= 4) break;
    if (canon(B.a) === right) continue;
    options.push({ text: B.aLabel, smiles: B.a, why: `That is ${B.aName}, the conjugate base of ${B.name}. It does not come from ${A.name}.` });
  }
  options.forEach((o) => { if (o.correct) o.correct = canon(o.smiles) === right; });
  return {
    kind: 'choice', skill: 'conjugate-pairs', smiles: A.ha, reaction: null,
    prompt: `What is the conjugate base of ${A.name} (${A.haLabel})?`,
    options: shuffle(rng, options), answer: A.aLabel,
    derive: `The conjugate base is the acid minus H⁺: ${A.haLabel} − H⁺ = ${A.aLabel} (${A.aName}).`,
    hints: ['A conjugate base is what remains after the acid donates H⁺ (one H off, one charge more negative).', 'Remove one H from the acidic atom and subtract 1 from its charge. The other choices either gained an H⁺ or come from a different acid.']
  };
}

function strongerProblem(rng) {
  const [A, B] = twoAcids(rng, 1);
  const win = A.pka < B.pka ? A : B, lose = win === A ? B : A;
  const mk = (X) => ({
    text: `${X.name} (${X.haLabel})`, correct: X === win,
    why: X === win ? `Yes. pKa ${X.pkaText} is lower than ${lose.pkaText}, so ${X.name} is the stronger acid.` : `pKa ${X.pkaText} is higher than ${win.pkaText}. A higher pKa means a weaker acid, so ${X.name} is the weaker one. The stronger acid has the smaller pKa.`
  });
  return {
    kind: 'choice', skill: 'pka-direction', smiles: null, reaction: null,
    prompt: `Which is the stronger acid: ${A.name} (pKa ${A.pkaText}) or ${B.name} (pKa ${B.pkaText})?`,
    options: shuffle(rng, [mk(A), mk(B)]), answer: `${win.name} (${win.haLabel})`,
    derive: `A smaller pKa means a stronger acid. ${win.pkaText} < ${lose.pkaText}, so ${win.name} is stronger.`,
    hints: ['Strong acids give up H⁺ easily, and their pKa values are small (or even negative).', 'Put the two numbers on a number line: the one further to the left (lower) belongs to the stronger acid.']
  };
}

export const LEWIS_POOL = [
  { smiles: 'N', label: 'NH₃' }, { smiles: 'O', label: 'H₂O' }, { smiles: 'CN', label: 'CH₃NH₂' }, { smiles: '[OH-]', label: 'HO⁻' },
  { smiles: 'CP(C)C', label: '(CH₃)₃P' }, { smiles: 'B(F)(F)F', label: 'BF₃' }, { smiles: '[Mg+2]', label: 'Mg²⁺' }, { smiles: '[H+]', label: 'H⁺' }, { smiles: '[CH3+]', label: 'CH₃⁺' }
];
function lewisProblem(rng) {
  const s = pick(rng, LEWIS_POOL);
  const info = analyze(s.smiles);
  const role = lewisRole(info);
  const lpAtom = info.atoms.find((a) => a.lp > 0);
  const shortAtom = info.atoms.find((a) => (a.sym === 'H' ? a.electrons < 2 : a.electrons < 8));
  const why = role === 'base'
    ? `${s.label} has a lone pair on ${lpAtom.sym} that it can donate to an atom that needs electrons: a Lewis base.`
    : `${s.label} has no lone pair, and ${shortAtom.sym} has only ${shortAtom.electrons} electrons around it, so it can accept a pair: a Lewis acid.`;
  return {
    kind: 'choice', skill: 'lewis-acid-base', smiles: s.smiles, reaction: null,
    prompt: `Is ${s.label} a Lewis acid or a Lewis base?`,
    options: [
      { text: 'Lewis acid (accepts an electron pair)', correct: role === 'acid', why: role === 'acid' ? 'Yes. ' + why : `${why} A Lewis acid would need an empty orbital or a missing pair.` },
      { text: 'Lewis base (donates an electron pair)', correct: role === 'base', why: role === 'base' ? 'Yes. ' + why : `${why} A Lewis base needs a lone pair to donate.` }
    ],
    answer: role === 'acid' ? 'Lewis acid (accepts an electron pair)' : 'Lewis base (donates an electron pair)',
    derive: why,
    hints: ['Look for a lone pair on any atom (a donor), or an atom with fewer than 8 electrons around it (2 for H) that can accept one.', 'A lone pair to give = Lewis base. A missing pair (like B in BF₃, or a positive ion) = Lewis acid.']
  };
}

export const ARROW_BASES = [{ smiles: 'O', label: 'H₂O' }, { smiles: 'N', label: 'NH₃' }, { smiles: '[OH-]', label: 'HO⁻' }];
export const ARROW_ACIDS = ['hcl', 'hno3', 'acetic'];
/** Proton transfer from a table acid to a base: the arrow answer is built from the scene, not typed. */
export function arrowScene(baseSmiles, acidId) {
  const A = ACID[acidId];
  const sc = sceneFromSmiles([{ smiles: baseSmiles }, { smiles: A.ha, hAngles: { [A.site]: Math.PI } }]);
  const atoms = sc.atoms, bonds = sc.bonds;
  const baseHeavy = sc.maps[0].heavy;
  const baseSite = baseHeavy.findIndex((_, i) => lpCount(atoms, bonds, baseHeavy[i]) > 0);
  const bs = baseHeavy[baseSite];
  const h = sc.maps[1].h[A.site][0];
  const x = sc.maps[1].heavy[A.site];
  const baseProd = protonate(baseSmiles, baseSite);
  return {
    atoms, bonds,
    arrows: [{ from: { lp: bs }, to: { atom: h } }, { from: { bond: [h, x] }, to: { atom: x } }],
    products: [baseProd, A.a], reactants: [baseSmiles, A.ha], baseSite: bs, hIdx: h, acidSite: x
  };
}
function arrowProblem(rng) {
  const b = pick(rng, ARROW_BASES), id = pick(rng, ARROW_ACIDS);
  const A = ACID[id];
  const sc = arrowScene(b.smiles, id);
  return {
    kind: 'arrows', skill: 'curved-arrows', smiles: null,
    reaction: { reactants: sc.reactants, products: sc.products },
    prompt: `Draw the curved arrows for the proton transfer ${b.label} + ${A.haLabel}. Tap the electrons, then where they go.`,
    config: { atoms: sc.atoms, bonds: sc.bonds, arrows: sc.arrows, products: sc.products },
    derive: `The lone pair on ${b.label}'s ${sc.atoms[sc.baseSite].el} forms a bond to the H of ${A.haLabel}, and the ${sc.atoms[sc.acidSite].el}${MINUS}H bond electrons move onto ${sc.atoms[sc.acidSite].el}, because H can hold only two electrons.`,
    hints: ['Two arrows are needed: one for the new bond and one for the bond that breaks.', 'First arrow: from the base’s lone pair to the acid’s H. Second arrow: from the H–X bond to X, so H can let go.']
  };
}

const TASKS = { direction: directionProblem, conjbase: conjBaseProblem, stronger: strongerProblem, lewis: lewisProblem, arrows: arrowProblem };
const DEFAULT_TASKS = ['direction', 'conjbase', 'stronger'];
const BY_SKILL = { 'pka-direction': ['direction', 'stronger'], 'conjugate-pairs': ['conjbase'], 'curved-arrows': ['arrows'], 'lewis-acid-base': ['lewis'] };
export const ACID_SKILLS = Object.keys(BY_SKILL);

export function makeAcidProblem(rng, task) {
  const f = TASKS[task];
  if (!f) throw new Error('unknown task ' + task);
  return f(rng);
}
export function generateAcid(count, { skill = null, rng = Math.random, tasks: only = null } = {}) {
  const tasks = resolveTasks(only, skill && BY_SKILL[skill] ? BY_SKILL[skill] : DEFAULT_TASKS, TASKS);
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeAcidProblem(rng, pick(rng, tasks)); tries++; } while (last && p.prompt === last && tries < 6);
    last = p.prompt;
    out.push(p);
  }
  return out;
}
