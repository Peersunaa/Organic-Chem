// Mastery / practice generator "mechanism-basics" (Lesson 08). Answers are computed: reaction kinds from counts and formulas
// (mechanisms.js classifyReaction), energy-diagram answers from the random levels (energy-core.js), arrows from the scene.
import { KINDS, KIND_LIST, REACTIONS, kindOf, kindWhy, WRONG_KIND, NUC_ELEC, HX_ALKENES, HX, hxStep } from './mechanisms.js';
import { steps as eSteps, overallDH, rdsStep, consistent, validate, intermediateIndexes } from './widgets/energy-core.js';
import { stepConfig } from './widgets/mechanism-core.js';
import { ARROW_BASES, ARROW_ACIDS, arrowScene } from './generators-acid.js';
import { ACID } from './acidbase.js';
import { predict } from './reactions.js';

const MINUS = '−';
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const fmt = (n) => (n < 0 ? MINUS + -n : String(n));
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- 1. classify a reaction
function classifyProblem(rng) {
  const r = pick(rng, REACTIONS);
  const kind = kindOf(r); // computed here from counts and formulas; the tests check it equals the stored r.kind
  const nr = r.reactants.length, np = r.products.length;
  const options = shuffle(rng, KIND_LIST).map((k) => ({
    text: cap(KINDS[k].name), val: k, correct: k === kind,
    why: k === kind ? `Yes. ${kindWhy(r)}` : `${WRONG_KIND[k](r)} Here: ${nr} reactant${nr === 1 ? '' : 's'} and ${np} product${np === 1 ? '' : 's'}.`
  }));
  return {
    kind: 'choice', skill: 'reaction-types', smiles: null, reaction: { reactants: r.reactants, products: r.products },
    equation: { reactants: r.reactants, products: r.products, cond: r.cond },
    prompt: 'Is this reaction an addition, an elimination, a substitution or a rearrangement?',
    options, answer: cap(KINDS[kind].name),
    derive: `${kindWhy(r)} So it is ${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind}.`,
    hints: ['Count the molecules on each side of the arrow: how many reactants, how many products?', 'Addition: 2 → 1. Elimination: 1 → 2. Substitution: 2 → 2. Rearrangement: 1 → 1 with the same formula.']
  };
}

// ---------------------------------------------------------------- 2. nucleophile or electrophile
function nucElecProblem(rng) {
  const nuc = pick(rng, NUC_ELEC.filter((x) => x.role === 'nuc'));
  const elec = pick(rng, NUC_ELEC.filter((x) => x.role === 'elec'));
  const asked = rng() < 0.5 ? 'nuc' : 'elec';
  const word = { nuc: 'nucleophile', elec: 'electrophile' };
  const other = asked === 'nuc' ? 'elec' : 'nuc';
  const right = asked === 'nuc' ? nuc : elec, wrong = asked === 'nuc' ? elec : nuc;
  const options = shuffle(rng, [right, wrong]).map((x) => ({
    text: x.label, correct: x === right,
    why: x === right ? `Yes. ${x.label} is the ${word[asked]}: ${x.reason}.` : `${x.label} is the ${word[other]}, not the ${word[asked]}: ${x.reason}.`
  }));
  return {
    kind: 'choice', skill: 'nuc-elec', smiles: null, reaction: null,
    prompt: `These two meet in a polar reaction. Which one is the ${word[asked]}?`,
    options, answer: right.label,
    derive: `${cap(word[asked])}: ${right.label}, because ${right.reason}. The other, ${wrong.label}, is the ${word[other]}: ${wrong.reason}.`,
    hints: ['A nucleophile is electron-rich (a lone pair, a π bond or a negative charge) and donates a pair. An electrophile is electron-poor (positive, δ+, or short of an octet) and accepts one.', `Check each species for a lone pair, a charge or a δ+ atom. ${asked === 'nuc' ? 'The one with electrons to give' : 'The one that is missing electrons'} is the ${word[asked]}.`]
  };
}

// ---------------------------------------------------------------- 3. read an energy diagram
/** Random valid levels (kJ/mol) where the step with the highest TS also has the biggest Eact. */
export function randomLevels(rng, twoStep) {
  const r5 = (lo, hi) => lo + 5 * Math.floor(rng() * ((hi - lo) / 5 + 1));
  for (let tries = 0; tries < 500; tries++) {
    const R = r5(10, 50);
    let levels;
    if (!twoStep) {
      const dH = r5(-70, 40), eact = r5(40, 110);
      if (dH === 0) continue;
      levels = [{ kind: 'R', E: R }, { kind: 'TS', E: R + eact }, { kind: 'P', E: R + dH }];
    } else {
      const e1 = r5(40, 100), I = R + r5(-25, 35), e2 = r5(10, 80), dH = r5(-70, 30);
      if (dH === 0) continue;
      levels = [{ kind: 'R', E: R }, { kind: 'TS', E: R + e1 }, { kind: 'I', E: I }, { kind: 'TS', E: I + e2 }, { kind: 'P', E: R + dH }];
    }
    if (validate(levels).length) continue;
    if (twoStep && !consistent(levels)) continue;
    if (levels[levels.length - 1].E > Math.min(...levels.filter((l) => l.kind === 'TS').map((l) => l.E)) - 10) continue;
    return levels;
  }
  throw new Error('randomLevels failed');
}
function diagram(levels) {
  const named = levels.map((l) => ({ ...l, label: l.kind === 'R' ? 'reactants' : l.kind === 'P' ? 'products' : '' }));
  return { widget: 'energy-diagram', config: { levels: named, mode: 'view', showValues: true } };
}
function energyBase(rng, twoStep) {
  const levels = randomLevels(rng, twoStep);
  return { levels, visual: diagram(levels), st: eSteps(levels) };
}
function rdsProblem(rng) {
  const { levels, visual, st } = energyBase(rng, true);
  const r = rdsStep(levels);
  const options = st.map((s) => ({
    text: `Step ${s.n}`, correct: s.n === r.n,
    why: s.n === r.n ? `Yes. Step ${s.n} has the highest transition state (${levels[s.ts].E} kJ/mol), the biggest barrier (Eact ${s.eact}), so it is the slowest step: the rate-determining step.`
      : `Step ${s.n}'s transition state is at ${levels[s.ts].E} kJ/mol, lower than step ${r.n}'s (${levels[r.ts].E}). The rate-determining step is the one with the highest peak.`
  }));
  return {
    kind: 'choice', skill: 'energy-diagram', smiles: null, reaction: null, visual,
    prompt: 'Which step is the rate-determining step (the slow step)? The energies are in kJ/mol.',
    options, answer: `Step ${r.n}`,
    derive: `The rate-determining step is the step with the highest transition state: step ${r.n} (peak at ${levels[r.ts].E}).`,
    hints: ['Find the two peaks (transition states). Each peak belongs to one step.', 'The step with the highest peak is the slowest one, because it has the biggest barrier to climb.']
  };
}
function dhProblem(rng) {
  const { levels, visual } = energyBase(rng, rng() < 0.5);
  const dH = overallDH(levels), R = levels[0].E, P = levels[levels.length - 1].E;
  const wrong = [{ match: -dH, why: `The sign is reversed. ΔH = E(products) ${MINUS} E(reactants) = ${P} ${MINUS} ${R}; ${dH < 0 ? 'the products are lower, so it is negative' : 'the products are higher, so it is positive'}.` }];
  if (P !== -dH && P !== dH) wrong.push({ match: P, why: `${P} is the level of the products. ΔH is the DIFFERENCE between the products’ level and the reactants’ level: ${P} ${MINUS} ${R}.` });
  return {
    kind: 'input', skill: 'energy-diagram', smiles: null, reaction: null, visual,
    prompt: 'What is the overall energy change, ΔH, in kJ/mol? (Use a minus sign if energy is released.)',
    answer: dH, wrong: wrong.filter((w) => w.match !== dH),
    derive: `ΔH = E(products) ${MINUS} E(reactants) = ${P} ${MINUS} ${R} = ${fmt(dH)} kJ/mol (${dH < 0 ? 'exothermic' : 'endothermic'}).`,
    hints: ['ΔH compares only the first and the last level. The peaks do not matter.', 'ΔH = final minus initial: the products’ energy minus the reactants’ energy.']
  };
}
function eactProblem(rng) {
  const two = rng() < 0.7;
  const { levels, visual, st } = energyBase(rng, two);
  const s = pick(rng, st);
  const from = levels[s.from], ts = levels[s.ts];
  const wrong = [];
  if (s.from !== 0) wrong.push({ match: ts.E - levels[0].E, why: `That measures from the reactants (${levels[0].E}). Step ${s.n} starts at the intermediate (${from.E}), so Eact = ${ts.E} ${MINUS} ${from.E}.` });
  wrong.push({ match: ts.E, why: `${ts.E} is the energy of the peak. Eact is the climb: peak minus the level the step starts from (${ts.E} ${MINUS} ${from.E}).` });
  return {
    kind: 'input', skill: 'energy-diagram', smiles: null, reaction: null, visual,
    prompt: `What is the activation energy, Eact, of ${two ? `step ${s.n}` : 'this reaction'} in kJ/mol?`,
    answer: s.eact, wrong: wrong.filter((w) => w.match !== s.eact),
    derive: `Eact = E(transition state) ${MINUS} E(where the step starts) = ${ts.E} ${MINUS} ${from.E} = ${s.eact} kJ/mol.`,
    hints: [`Find the peak of ${two ? `step ${s.n}` : 'the reaction'} and the level the step starts from${two && s.n === 2 ? ' (the intermediate, not the reactants)' : ''}.`, 'Eact = energy of the transition state minus energy of the level where that step starts.']
  };
}
function signProblem(rng) {
  const { levels, visual } = energyBase(rng, rng() < 0.5);
  const dH = overallDH(levels);
  const neg = dH < 0;
  return {
    kind: 'choice', skill: 'energy-diagram', smiles: null, reaction: null, visual,
    prompt: 'Is this reaction exothermic or endothermic?',
    options: [
      { text: 'Exothermic (ΔH negative)', correct: neg, why: neg ? `Yes. The products (${levels[levels.length - 1].E}) sit below the reactants (${levels[0].E}), so energy is released.` : `The products (${levels[levels.length - 1].E}) are ABOVE the reactants (${levels[0].E}): energy is absorbed, so ΔH is positive.` },
      { text: 'Endothermic (ΔH positive)', correct: !neg, why: !neg ? `Yes. The products (${levels[levels.length - 1].E}) sit above the reactants (${levels[0].E}), so energy is absorbed.` : `The products (${levels[levels.length - 1].E}) are BELOW the reactants (${levels[0].E}): energy is released, so ΔH is negative.` }
    ],
    answer: neg ? 'Exothermic (ΔH negative)' : 'Endothermic (ΔH positive)',
    derive: `ΔH = ${levels[levels.length - 1].E} ${MINUS} ${levels[0].E} = ${fmt(dH)}, so the reaction is ${neg ? 'exothermic' : 'endothermic'}.`,
    hints: ['Compare the last level with the first one.', 'Products lower than reactants: energy is released (exothermic, ΔH < 0). Higher: energy is absorbed.']
  };
}
function countProblem(rng) {
  const two = rng() < 0.5;
  const { levels, visual } = energyBase(rng, two);
  const n = intermediateIndexes(levels).length;
  return {
    kind: 'input', skill: 'energy-diagram', smiles: null, reaction: null, visual,
    prompt: 'How many reaction intermediates does this reaction have?',
    answer: n, wrong: n === 1 ? [{ match: 2, why: 'That counts the transition states (peaks). An intermediate is a valley between two peaks.' }] : [{ match: 1, why: 'There is only one peak here, so there is no valley between two peaks: no intermediate. A one-step reaction has none.' }],
    derive: `${n === 1 ? 'There are two peaks with one valley between them: one intermediate.' : 'There is a single peak, so the reaction is one step with no valley between peaks: no intermediate.'}`,
    hints: ['An intermediate is an energy minimum BETWEEN two transition states.', 'Count the valleys that lie between two peaks (not the reactants or products).']
  };
}

// ---------------------------------------------------------------- 4. draw the arrows
function hxProblem(rng, which) {
  const al = pick(rng, HX_ALKENES), X = pick(rng, ['Cl', 'Br']);
  const st = hxStep(al.smiles, X, which);
  const cfg = stepConfig(st);
  const hx = HX[X].label;
  const text = (name) => (which === 1 ? `Step 1 of the addition of ${hx} to ${name}: draw the curved arrows. The C=C π bond is the nucleophile.` : `Step 2 of the addition of ${hx} to ${name}: ${X}⁻ meets the carbocation. Draw the curved arrow.`);
  return {
    kind: 'arrows', skill: 'mechanism', smiles: null, reaction: null,
    prompt: text(al.label), promptHtml: text(al.html || al.label),
    config: { atoms: cfg.atoms, bonds: cfg.bonds, arrows: cfg.arrows, products: st.after },
    derive: which === 1 ? `Arrow 1: from the C=C π bond to the H (it becomes the new C–H bond). Arrow 2: from the H–${X} bond to ${X}, so H can take the new bond.` : `One arrow: from a lone pair on ${X}⁻ to the positive carbon. The pair becomes the new C–${X} bond.`,
    hints: which === 1 ? ['Two arrows: one for the new bond, one for the bond that breaks. The π bond is the electron source.', 'Arrow 1 starts on the C=C bond and ends on the H of H–X. Arrow 2 starts on the H–X bond and ends on X.'] : ['The nucleophile is the negative ion; the electrophile is the carbon with the + charge.', `The arrow starts on a lone pair of ${X}⁻ and ends on the positive carbon.`]
  };
}
/** HBr + propene (the second half of Lesson 08: the H goes where the 2° cation forms). Step 1 asks which carbon takes H (regio, as in Lesson 09's arrow drill);
 *  step 2 is Br⁻ onto the 2° cation. The mechanism comes from the reaction engine (reactions.js predict), never from a typed table. */
function propeneProblem(rng, which) {
  const pred = predict('CC=C', 'HBr');
  const st = pred.major[0].mech.steps[which - 1];
  const cfg = stepConfig(st);
  const text = which === 1
    ? 'Step 1 of HBr adding to propene, CH₃CH=CH₂: draw the curved arrows. The π bond gives its pair to the H of H–Br; choose the carbon that takes the H so that the steadier (2°) cation forms.'
    : 'Step 2 of HBr adding to propene: Br⁻ meets the 2° carbocation CH₃CH⁺CH₃. Draw the curved arrow.';
  return {
    kind: 'arrows', skill: 'mechanism', smiles: null, reaction: null, prompt: text,
    config: { atoms: cfg.atoms, bonds: cfg.bonds, arrows: cfg.arrows, products: st.after, ...(cfg.regio ? { regio: cfg.regio } : {}) },
    derive: which === 1 ? 'Arrow 1: from the C=C to the H, which bonds to the end CH₂ (the carbon with more H), so the + lands on the middle carbon: a 2° cation. Arrow 2: from the H–Br bond onto Br.' : 'One arrow: from a lone pair on Br⁻ to the + carbon in the middle. The pair becomes the new C–Br bond: 2-bromopropane.',
    hints: which === 1 ? ['Two arrows: the π bond to H, and the H–Br bond onto Br. For the first one, pick the carbon that takes the H.', 'H goes to the end CH₂ (the carbon that already has more H); that leaves the + on the middle carbon, which has two carbon neighbours (2°).'] : ['The rich partner is Br⁻ (lone pairs, − charge); the poor one is the + carbon.', 'Tap a lone pair on Br⁻, then the + carbon.']
  };
}
function abProblem(rng) {
  const b = pick(rng, ARROW_BASES), id = pick(rng, ARROW_ACIDS);
  const A = ACID[id];
  const sc = arrowScene(b.smiles, id);
  return {
    kind: 'arrows', skill: 'curved-arrows', smiles: null, reaction: { reactants: sc.reactants, products: sc.products },
    prompt: `Draw the curved arrows for the proton transfer ${b.label} + ${A.haLabel}. Tap the electrons, then where they go.`,
    config: { atoms: sc.atoms, bonds: sc.bonds, arrows: sc.arrows, products: sc.products },
    derive: `The lone pair on ${b.label}’s ${sc.atoms[sc.baseSite].el} forms a bond to the H of ${A.haLabel}, and the ${sc.atoms[sc.acidSite].el}${MINUS}H bond electrons move onto ${sc.atoms[sc.acidSite].el}, because H can hold only two electrons.`,
    hints: ['Two arrows are needed: one for the new bond and one for the bond that breaks.', 'First arrow: from the base’s lone pair to the acid’s H. Second arrow: from the H–X bond to X, so H can let go.']
  };
}

const TASKS = { classify: classifyProblem, nucelec: nucElecProblem, rds: rdsProblem, dh: dhProblem, eact: eactProblem, sign: signProblem, count: countProblem, hx1: (rng) => hxProblem(rng, 1), hx2: (rng) => hxProblem(rng, 2), propene1: (rng) => propeneProblem(rng, 1), propene2: (rng) => propeneProblem(rng, 2), ab: abProblem };
const DEFAULT_TASKS = ['classify', 'nucelec', 'rds', 'dh', 'eact', 'sign', 'hx1', 'hx2', 'propene1', 'propene2', 'ab'];
const BY_SKILL = { 'reaction-types': ['classify'], 'nuc-elec': ['nucelec'], 'energy-diagram': ['rds', 'dh', 'eact', 'sign', 'count'], 'mechanism': ['hx1', 'hx2', 'propene1', 'propene2'] };
/** Lesson 08's mastery check (generator 'mechanism-mastery'): problems alternate between drawing arrows (symmetric HX and HBr + propene, step 1 or step 2)
 *  and reading an energy diagram, so the three first-try answers it needs cover both halves of the lesson about evenly (novice review #13). */
export const MASTERY_POOLS = { arrows: ['hx1', 'hx2', 'propene1', 'propene2'], energy: ['rds', 'dh', 'eact', 'sign', 'count'] };
let masteryTurn = null;      // which pool the next problem comes from (alternates across calls: the mastery player asks for one problem at a time)
export function generateMechMastery(count, { rng = Math.random } = {}) {
  if (masteryTurn === null) masteryTurn = rng() < 0.5 ? 'arrows' : 'energy';
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(makeMechProblem(rng, pick(rng, MASTERY_POOLS[masteryTurn])));
    masteryTurn = masteryTurn === 'arrows' ? 'energy' : 'arrows';
  }
  return out;
}
export const MECH_SKILLS = Object.keys(BY_SKILL);
export const MECH_TASKS = Object.keys(TASKS);

export function makeMechProblem(rng, task) {
  const f = TASKS[task];
  if (!f) throw new Error('unknown task ' + task);
  return f(rng);
}
export function generateMech(count, { skill = null, rng = Math.random } = {}) {
  const tasks = skill && BY_SKILL[skill] ? BY_SKILL[skill] : DEFAULT_TASKS;
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeMechProblem(rng, pick(rng, tasks)); tries++; } while (last && (p.prompt + JSON.stringify(p.visual || p.equation || '')) === last && tries < 6);
    last = p.prompt + JSON.stringify(p.visual || p.equation || '');
    out.push(p);
  }
  return out;
}
