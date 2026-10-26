// Mastery / practice generator "markovnikov" (Lesson 09). Every answer comes from engine/reactions.js (structure -> cations -> products), never from typed tables.
// Tasks: product (pick the product from four drawn structures), rank (order four carbocations), arrows (step 1 of the mechanism, regiochemistry-aware), reactant (which alkene gives this product).
import { LAB_ALKENES, REAGENTS, REAGENT_IDS, predict, productChoices, rankItems, rankOrder, cationClass, CLASS_NAME, CLASS_SHORT, alkeneSites } from './reactions.js';
import { stepConfig } from './widgets/mechanism-core.js';
import { analyze, canon } from './chem.js';
import { resolveTasks } from './task-list.js';

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const LETTERS = 'ABCD';

/** Alkenes whose two cations differ in class (so an anti-Markovnikov answer exists and the regiochemistry matters). */
let regio = null;
/** (computed on first use: it needs RDKit, which is not ready when this module is imported) */
export function regioAlkenes() { return regio || (regio = LAB_ALKENES.filter((a) => { const s = alkeneSites(a.smiles); return s.cls[s.carbons[0]] !== s.cls[s.carbons[1]]; })); }
const eqFor = (alkene, R) => ({ reactants: [alkene, R.reactant], products: [], cond: R.cond });

// ---------------------------------------------------------------- 1. the product
function productProblem(rng) {
  const alkene = pick(rng, regioAlkenes()), reagent = pick(rng, REAGENT_IDS), R = REAGENTS[reagent];
  const pred = predict(alkene.smiles, reagent);
  const opts = shuffle(rng, productChoices(pred, { kinds: ['anti', 'wrongAtom', 'unchanged'] }));
  const options = opts.map((o, i) => ({ smiles: o.smiles[0], text: 'Option ' + LETTERS[i], correct: o.correct, why: o.why, kind: o.kind }));
  const m = pred.major[0], minor = pred.minor;
  return {
    kind: 'choice', skill: 'markovnikov', smiles: null, reaction: null, equation: eqFor(alkene.smiles, R),
    prompt: `What is the major product of this addition (${R.label})?`,
    options, answer: options.find((o) => o.correct).text,
    alkene: alkene.smiles, reagent, products: pred.products,
    derive: `H adds to the carbon with more H, so the + charge goes to the more substituted carbon: the ${CLASS_NAME[m.cls]} carbocation (the other way would give a ${CLASS_NAME[minor.cls]} one). ${R.kind === 'HX' ? R.X : 'OH'} bonds to that carbon.`,
    hints: ['The first step puts H⁺ on one carbon of the C=C and leaves the + charge on the other. Which of the two carbocations is more stable?', 'More alkyl groups on the C⁺ means a more stable cation. H goes to the carbon with more H; the other group goes to the more substituted carbon.']
  };
}

// ---------------------------------------------------------------- 2. rank carbocations
function rankProblem(rng) {
  const items = rankItems(rng);
  const order = rankOrder(items);
  return {
    kind: 'widget', widget: 'cation-rank', skill: 'carbocations', smiles: null, reaction: null,
    prompt: 'Rank these four carbocations from most stable to least stable.',
    config: { items }, items, order,
    derive: 'Stability follows the number of alkyl groups on the C⁺ (they donate electron density): ' + order.map((i) => CLASS_SHORT[cationClass(items[i].smiles)]).join(' > ') + '.',
    hints: ['Count the carbon groups attached to the positively charged carbon in each cation.', 'Alkyl groups donate electron density to C⁺: tertiary > secondary > primary > methyl.']
  };
}

// ---------------------------------------------------------------- 3. draw the step-1 arrows
function arrowsProblem(rng) {
  const alkene = pick(rng, regioAlkenes()), reagent = pick(rng, REAGENT_IDS), R = REAGENTS[reagent];
  const pred = predict(alkene.smiles, reagent);
  const st = pred.major[0].mech.steps[0];
  const cfg = stepConfig(st);
  return {
    kind: 'arrows', skill: 'markovnikov', reaction: null,
    prompt: `Step 1 of ${R.label} adding to this alkene: draw the curved arrows. The π bond attacks the H${R.kind === 'HX' ? ' of H–' + R.X : ' of H₃O⁺'}. Choose the carbon that bonds to H so that the more stable carbocation forms.`,
    smiles: alkene.smiles,
    config: { atoms: cfg.atoms, bonds: cfg.bonds, arrows: cfg.arrows, products: st.after, regio: cfg.regio },
    derive: `Arrow 1: the C=C π bond to H, forming the C–H bond on the carbon with more H, so the + charge lands on the more substituted carbon (${CLASS_NAME[pred.major[0].cls]}). Arrow 2: the H–${R.kind === 'HX' ? R.X : 'O'} bond to ${R.kind === 'HX' ? R.X : 'O'}, because H can have only two electrons.`,
    hints: ['Two arrows: the π bond goes to the H, and the bond holding that H goes to the atom it was bonded to. For the first arrow you also say which carbon bonds to H.', 'H bonds to the carbon with more H (fewer alkyl groups). That leaves the + charge on the more substituted carbon: the more stable cation.']
  };
}

// ---------------------------------------------------------------- 4. predict the reactant
/** One sentence on how two products differ, computed from their structures (carbon count, ring, class of the carbon bearing the new group). */
export function describeDiff(want, got) {
  const A = analyze(want), B = analyze(got);
  const C = (i) => i.atoms.filter((a) => a.sym === 'C').length;
  if (C(A) !== C(B)) return `Its product has ${C(B)} carbons, but the target has ${C(A)}.`;
  const ring = (i) => i.bonds.length >= i.atoms.length;
  if (ring(A) !== ring(B)) return ring(A) ? 'Its product is not a ring, but the target is.' : 'Its product is a ring, but the target is not.';
  const hetero = (i) => i.atoms.find((a) => a.sym !== 'C');
  const carbonOf = (i) => { const x = hetero(i); return x ? i.atoms[x.nbrs[0]] : null; };
  const ca = carbonOf(A), cb = carbonOf(B);
  const cl = (i, c) => c.nbrs.filter((j) => i.atoms[j].sym === 'C').length;
  if (ca && cb && cl(A, ca) !== cl(B, cb)) return `In its product the new group sits on a ${CLASS_NAME[cl(B, cb)]} carbon, but in the target it is on a ${CLASS_NAME[cl(A, ca)]} carbon.`;
  return 'Its major product has a different carbon skeleton from the target.';
}
function reactantProblem(rng) {
  const reagent = pick(rng, REAGENT_IDS), R = REAGENTS[reagent];
  const pool = LAB_ALKENES.map((a) => ({ a, p: predict(a.smiles, reagent) })).filter((x) => x.p.products.length === 1);
  const right = pick(rng, pool);
  const target = right.p.products[0];
  const others = shuffle(rng, pool.filter((x) => x !== right && !x.p.products.includes(target)));
  // prefer distractors with the same number of carbons (near misses), then any
  const nC = (s) => analyze(s).atoms.length;
  others.sort((x, y) => Math.abs(nC(x.a.smiles) - nC(right.a.smiles)) - Math.abs(nC(y.a.smiles) - nC(right.a.smiles)));
  const set = shuffle(rng, [right, ...others.slice(0, 3)]);
  const options = set.map((x, i) => ({
    smiles: x.a.smiles, text: 'Alkene ' + LETTERS[i], correct: x === right,
    why: x === right
      ? `Yes. ${R.label} adds H to the carbon with more H and ${R.kind === 'HX' ? R.X : 'OH'} to the more substituted carbon; for this alkene that gives exactly the target.`
      : `Not this one. ${describeDiff(target, x.p.products[0])} (Its major product is a different compound.)`
  }));
  return {
    kind: 'choice', skill: 'markovnikov', smiles: target, reaction: null,
    prompt: `The structure above is the major product of an alkene plus ${R.label}. Which alkene was the starting material?`,
    options, answer: options.find((o) => o.correct).text,
    product: target, reagent,
    derive: `Remove the added ${R.kind === 'HX' ? R.X : 'OH'} and an H from the neighbouring carbon and put the C=C back. Check by adding ${R.label} again: ${CLASS_NAME[right.p.major[0].cls]} carbocation, ${R.kind === 'HX' ? R.X : 'OH'} on the more substituted carbon.`,
    hints: ['Find the carbon that carries the added group (X or OH). The C=C was between that carbon and a neighbouring carbon.', 'Mentally remove X (or OH) and one H from a neighbouring carbon. Then check the result: does Markovnikov addition put X back on that carbon?']
  };
}

const TASKS = { product: productProblem, rank: rankProblem, arrows: arrowsProblem, reactant: reactantProblem };
const BY_SKILL = { markovnikov: ['product', 'arrows', 'reactant'], carbocations: ['rank'] };
export const MARK_SKILLS = Object.keys(BY_SKILL);
export const MARK_TASKS = Object.keys(TASKS);
export function makeMarkovnikovProblem(rng, task) {
  const f = TASKS[task];
  if (!f) throw new Error('unknown task ' + task);
  return f(rng);
}
export function generateMarkovnikov(count, { skill = null, rng = Math.random, tasks: only = null } = {}) {
  const tasks = resolveTasks(only, skill && BY_SKILL[skill] ? BY_SKILL[skill] : MARK_TASKS, TASKS);
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeMarkovnikovProblem(rng, pick(rng, tasks)); tries++; } while (last && JSON.stringify([p.prompt, p.smiles, p.equation, p.config && p.config.items]) === last && tries < 8);
    last = JSON.stringify([p.prompt, p.smiles, p.equation, p.config && p.config.items]);
    out.push(p);
  }
  return out;
}
