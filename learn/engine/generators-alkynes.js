// Mastery / practice generator "alkynes" (Lesson 12, McMurry 4.11). Every answer comes from engine/reactions-alkynes.js and engine/synthesis.js, never from typed tables.
// Tasks:
//   product    : pick the product of an alkyne + reagent (HX or X2 with 1 or 2 equivalents, hydration, H2/Lindlar, H2/Pd) from four drawn answers (stereo included)
//   reagent    : which reagent turns this alkyne into this product?
//   synthesis  : a synthesis-planner puzzle of 2 or 3 steps (acetylide, primary alkyl halide, then hydration / Lindlar / Pd)
//   acidity    : which base can remove the terminal H (pKa from the Lesson 03 table)? or an equilibrium-arrow round (acetylene + a base)
import { LAB_ALKYNES, ALKYNE_RXN, predictAlkyne, alkyneChoices, alkyneRightWhy, alkyneReagentsFor, ALKYNE_BASES, deprotonates, ALKYNE_PKA, alkyneSites } from './reactions-alkynes.js';
import { CARDS, runSequence, solveSequences } from './synthesis.js';
import { ACID } from './acidbase.js';
import { nameBothAny } from './naming-chain.js';
import { resolveTasks } from './task-list.js';

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const LETTERS = 'ABCD';
const nm = (smi) => { const n = nameBothAny(smi); return n ? n.new : smi; };

const PRODUCT_KEYS = ['HBr_1', 'HBr_2', 'HCl_1', 'HCl_2', 'HI_1', 'HI_2', 'Br2_1', 'Br2_2', 'Cl2_1', 'Cl2_2', 'H2O_Hg', 'H2_Lindlar', 'H2_Pd'];

const HINTS = {
  HX1: ['One equivalent of H–X adds across only ONE of the two π bonds, so a C=C is left. Which carbon gets the H?', 'H goes to the carbon that already has the H (the end of a terminal alkyne) and X to the more substituted carbon: Markovnikov. If both carbons are alike, X can go on either.'],
  HX2: ['Two equivalents: the C=C of the vinylic halide reacts with a second H–X.', 'The second H–X is Markovnikov too: X goes to the carbon that already carries an X, so both X atoms end up on the same carbon (a geminal dihalide).'],
  X2_1: ['One equivalent of X₂ stops at the dihaloalkene, and X₂ adds ANTI.', 'One X on each carbon of the former triple bond, on opposite sides of the C=C. Look at how the two X atoms are drawn.'],
  X2_2: ['Two equivalents of X₂: both π bonds react.', 'Each carbon of the former triple bond ends up with two X atoms: a 1,1,2,2-tetrahalide, and no C=C is left.'],
  hydration: ['OH adds Markovnikov, but the enol is not what you isolate: it tautomerises to a ketone.', 'The C=O ends up on the carbon that got the OH. A terminal alkyne gives a METHYL ketone; an unsymmetrical internal alkyne gives a mixture of the two possible ketones.'],
  lindlar: ['The Lindlar catalyst stops at the alkene, and both H atoms add to the same face (syn).', 'Both H on the same face puts the two alkyl groups on the same side of the C=C: the cis (Z) alkene. A terminal alkyne has no cis/trans.'],
  pd: ['Pd/C with 2 equivalents of H₂ reduces BOTH π bonds.', 'No C=C or C≡C is left: the alkane with the same carbon skeleton.']
};
const hintKey = (rx) => (rx.kind === 'HX' ? 'HX' + rx.equiv : rx.kind === 'X2' ? 'X2_' + rx.equiv : rx.kind);

const optText = (list) => list.map((s) => `<mol smiles="${s}" label="${nm(s)}"></mol>`).join(' + ');

// ---------------------------------------------------------------- 1. the product
function productProblem(rng) {
  for (let tries = 0; tries < 60; tries++) {
    const alkyne = pick(rng, LAB_ALKYNES), key = pick(rng, PRODUCT_KEYS), rx = ALKYNE_RXN[key];
    let pred;
    try { pred = predictAlkyne(alkyne.smiles, key); } catch (e) { continue; }
    const ch = alkyneChoices(pred);
    if (ch.length < 4) continue;
    const multi = ch.some((o) => o.smiles.length > 1);
    const opts = shuffle(rng, ch).map((o, i) => ({
      ...(multi ? { text: optText(o.smiles) } : { smiles: o.smiles[0], text: 'Option ' + LETTERS[i] }),
      correct: o.correct, why: o.why, kind: o.kind, products: o.smiles
    }));
    const eq = { reactants: [alkyne.smiles], products: [], cond: rx.label };
    return {
      kind: 'choice', skill: 'alkynes', smiles: null, equation: eq,
      prompt: `What is the major product${pred.outcome === 'mixture' ? ' (or products)' : ''} of ${alkyne.id} with ${rx.label}?`,
      options: opts, answer: opts.find((o) => o.correct).text,
      alkyne: alkyne.smiles, key, products: pred.products, stereo: pred.stereo,
      derive: `${alkyneRightWhy(pred).replace(/^Yes\. /, '')} Product${pred.products.length > 1 ? 's' : ''}: ${pred.products.map(nm).join(' and ')}.`,
      hints: HINTS[hintKey(rx)]
    };
  }
  throw new Error('no alkyne product problem');
}

// ---------------------------------------------------------------- 2. the reagent
function reagentProblem(rng) {
  for (let tries = 0; tries < 80; tries++) {
    const alkyne = pick(rng, LAB_ALKYNES), key = pick(rng, PRODUCT_KEYS);
    let pred;
    try { pred = predictAlkyne(alkyne.smiles, key); } catch (e) { continue; }
    if (pred.outcome !== 'single') continue;
    const target = pred.products[0];
    const right = alkyneReagentsFor(alkyne.smiles, [target], PRODUCT_KEYS);
    if (right.length !== 1) continue;
    // three other reagents that give a different product; a near neighbour first (the other equivalents, Lindlar against Pd), all with different labels
    const sibs = PRODUCT_KEYS.filter((k) => k !== key).map((k) => { try { return { k, p: predictAlkyne(alkyne.smiles, k) }; } catch (e) { return null; } }).filter((x) => x && x.p.products.join() !== pred.products.join());
    const r0 = ALKYNE_RXN[key];
    const isNear = (x) => { const r = ALKYNE_RXN[x.k]; return (r.kind === r0.kind && r.X === r0.X) || (['lindlar', 'pd'].includes(r.kind) && ['lindlar', 'pd'].includes(r0.kind)); };
    const ordered = shuffle(rng, sibs.filter(isNear)).slice(0, 1).concat(shuffle(rng, sibs));
    const chosen = [];
    for (const x of ordered) {
      if (chosen.some((y) => y.k === x.k)) continue;
      // at most one halogen sibling of each kind, so the list is not four versions of HBr / HCl
      if (chosen.some((y) => ALKYNE_RXN[y.k].kind === ALKYNE_RXN[x.k].kind && ALKYNE_RXN[y.k].kind !== r0.kind)) continue;
      chosen.push(x);
      if (chosen.length === 3) break;
    }
    if (chosen.length < 3) continue;
    const set = shuffle(rng, [{ k: key, p: pred, right: true }, ...chosen]);
    const options = set.map((x) => ({
      text: ALKYNE_RXN[x.k].label, correct: !!x.right,
      why: x.right ? `Yes. ${alkyneRightWhy(pred).replace(/^Yes\. /, '')}` : `That reagent gives ${x.p.products.map(nm).join(' and ')} (${x.p.outcome === 'mixture' ? 'a mixture' : 'not the target'}), not ${nm(target)}.`
    }));
    return {
      kind: 'choice', skill: 'alkynes', smiles: null, equation: { reactants: [alkyne.smiles], products: [target], cond: '?' },
      prompt: `Which reagent turns ${alkyne.id} into ${nm(target)}?`,
      options, answer: options.find((o) => o.correct).text,
      alkyne: alkyne.smiles, key, products: [target],
      derive: `${ALKYNE_RXN[key].label}: ${alkyneRightWhy(pred).replace(/^Yes\. /, '')}`,
      hints: ['Compare the target with the alkyne: is there a C=O, a C=C (and what geometry), two halogen atoms or four, or no multiple bond at all?', HINTS[hintKey(ALKYNE_RXN[key])][1]]
    };
  }
  throw new Error('no reagent problem');
}

// ---------------------------------------------------------------- 3. a synthesis puzzle
const START_ALKYNES = ['C#C', 'CC#C', 'CCC#C', 'CCCC#C'];
const RX_CARDS = ['CH3Br', 'EtBr', 'PrBr', 'BuBr'];
const FINISH = [null, 'H2O_Hg', 'H2_Lindlar', 'H2_Pd'];
const TRAPS = ['iPrBr', 'tBuBr', 'NaOH', 'HBr_1', 'Br2_1', 'H2_Pd', 'H2_Lindlar', 'H2O_Hg'];
/** {start, target, deck, solution:[ids]} for a 2- or 3-step plan; every puzzle is solved by the engine (solveSequences) before it is returned. */
export function synthesisPuzzle(rng) {
  for (let tries = 0; tries < 200; tries++) {
    const start = pick(rng, START_ALKYNES), rxId = pick(rng, RX_CARDS), fin = pick(rng, FINISH);
    const seq = ['NaNH2', rxId, ...(fin ? [fin] : [])];
    const run = runSequence(start, seq);
    if (!run.ok || run.final.kind !== 'neutral') continue;
    const target = run.final.smiles;
    if (target === start) continue;
    const spare = shuffle(rng, TRAPS.filter((t) => !seq.includes(t)));
    const deck = shuffle(rng, [...new Set([...seq, ...spare.slice(0, 7 - new Set(seq).size)])]);
    const sols = solveSequences(start, target, deck, 3);
    if (!sols.length || !sols.some((s) => s.join() === seq.join())) continue;
    return { start, target, deck, solution: seq };
  }
  throw new Error('no synthesis puzzle');
}
function synthesisProblem(rng) {
  const pz = synthesisPuzzle(rng);
  const lab = (id) => CARDS[id].label;
  const steps = pz.solution.map((id, i) => `${i + 1}. ${lab(id)}`).join('; ');
  return {
    kind: 'widget', widget: 'synthesis-planner', skill: 'acetylides', smiles: null,
    prompt: `Plan the synthesis: arrange the reagent cards in order to turn ${nm(pz.start)} into ${nm(pz.target)}, then run the plan.`,
    config: { start: pz.start, target: pz.target, deck: pz.deck },
    start: pz.start, target: pz.target, solution: pz.solution, deck: pz.deck,
    derive: `Work backwards. ${steps}. NaNH₂ makes the acetylide anion; a primary alkyl halide adds the carbons to the chain; ${pz.solution.length === 3 ? { H2O_Hg: 'hydration puts the C=O on the more substituted carbon (a ketone); ', H2_Lindlar: 'H₂ with the Lindlar catalyst stops at the cis alkene; ', H2_Pd: 'H₂ (2 equiv.) over Pd/C gives the alkane; ' }[pz.solution[2]] : ''}secondary and tertiary halides, NaOH and the wrong order fail.`,
    hints: ['Start from the end: what does the target need (a longer chain? a C=O? a cis C=C?) and which card does each job? The acetylide has to be made before the alkyl halide.', 'Order: NaNH₂ (acetylide), then a PRIMARY alkyl halide to add carbons, then, if the target is not an alkyne, the reagent for the final group. Count the carbons the alkyl halide must add.']
  };
}

// ---------------------------------------------------------------- 4. acidity
const ACID_PARTNERS = ['water', 'ethanol', 'ammonia', 'hcn', 'acetic'];
function acidityProblem(rng) {
  if (rng() < 0.55) {
    const alkyne = pick(rng, LAB_ALKYNES.filter((a) => alkyneSites(a.smiles).ok && (alkyneSites(a.smiles).terminal !== null || alkyneSites(a.smiles).bothTerminal)));
    const wrong = shuffle(rng, ALKYNE_BASES.filter((b) => !deprotonates(b.id).ok)).slice(0, 3);
    const right = ALKYNE_BASES.filter((b) => deprotonates(b.id).ok);
    const set = shuffle(rng, [right[0], ...wrong]);
    const options = set.map((b) => {
      const d = deprotonates(b.id);
      return {
        text: b.label, correct: d.ok,
        why: d.ok ? `Yes. The conjugate acid of ${b.anion}, ${ACID[b.id].name}, has pKa ${ACID[b.id].pkaText}, higher than the alkyne’s ≈ ${ALKYNE_PKA}, so the equilibrium favours the acetylide anion.`
          : `No. The conjugate acid of ${b.anion}, ${ACID[b.id].name}, has pKa ${ACID[b.id].pkaText}, which is LOWER than the alkyne’s ≈ ${ALKYNE_PKA}. The alkyne is the weaker acid, so the equilibrium stays on the side of the alkyne and ${b.anion}: almost no acetylide forms.`
      };
    });
    return {
      kind: 'choice', skill: 'acetylides', smiles: alkyne.smiles,
      prompt: `${alkyne.id} has a terminal C–H with pKa ≈ ${ALKYNE_PKA}. Which base is strong enough to turn it into its acetylide anion?`,
      options, answer: options.find((o) => o.correct).text, alkyne: alkyne.smiles,
      derive: `A base removes the H only if the equilibrium favours the weaker acid, the one with the higher pKa. NH₃ (pKa ≈ ${ACID.ammonia.pka}) is a weaker acid than the alkyne (≈ ${ALKYNE_PKA}), so NaNH₂ works. Water (${ACID.water.pkaText}), ethanol (${ACID.ethanol.pkaText}), HCN (${ACID.hcn.pkaText}) and acetic acid (${ACID.acetic.pkaText}) are all stronger acids than the alkyne, so their bases are too weak.`,
      hints: ['A base B⁻ takes H⁺ from the alkyne only if the reaction favours the products. The equilibrium favours the side with the WEAKER acid, the one with the larger pKa.', `Compare ${ALKYNE_PKA} (the alkyne) with the pKa of the acid that each base turns into when it takes the H⁺. Only one of them is above ${ALKYNE_PKA}.`]
    };
  }
  const b = pick(rng, ACID_PARTNERS);
  const d = deprotonates(b);
  return {
    kind: 'widget', widget: 'equilibrium-arrow', skill: 'acetylides', smiles: null,
    prompt: `Does ${ACID[b].aName} (${ACID[b].aLabel}) deprotonate acetylene? Tap the acid on each side, then say which side the equilibrium favours.`,
    config: { a: 'acetylene', b },
    derive: `The equilibrium favours the weaker acid (higher pKa). Acetylene is ≈ ${ALKYNE_PKA}; ${ACID[b].name} is ${ACID[b].pkaText}. ${d.ok ? `${ACID[b].name} is the weaker acid, so the right side (the acetylide anion) is favoured.` : `${ACID[b].name} is the stronger acid, so the left side (acetylene and ${ACID[b].aLabel}) is favoured: no acetylide forms.`}`,
    hints: ['Tap the acid on each side: the species that can give away an H⁺ (acetylene on the left, the other acid on the right).', `The equilibrium favours the side with the larger pKa (the weaker acid). Acetylene is ≈ ${ALKYNE_PKA}.`]
  };
}

const TASKS = { product: productProblem, reagent: reagentProblem, synthesis: synthesisProblem, acidity: acidityProblem };
const BY_SKILL = { alkynes: ['product', 'reagent'], acetylides: ['synthesis', 'acidity'] };
export const ALKYNE_SKILLS = Object.keys(BY_SKILL);
export const ALKYNE_TASKS = Object.keys(TASKS);
export function makeAlkyneProblem(rng, task) {
  const f = TASKS[task];
  if (!f) throw new Error('unknown task ' + task);
  return f(rng);
}
export function generateAlkynes(count, { skill = null, rng = Math.random, tasks: only = null } = {}) {
  const tasks = resolveTasks(only, skill && BY_SKILL[skill] ? BY_SKILL[skill] : ALKYNE_TASKS, TASKS);
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeAlkyneProblem(rng, pick(rng, tasks)); tries++; } while (last && JSON.stringify([p.prompt, p.config]) === last && tries < 8);
    last = JSON.stringify([p.prompt, p.config]);
    out.push(p);
  }
  return out;
}
