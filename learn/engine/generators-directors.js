// Mastery / practice generator "directors" (Lesson 14, McMurry 5.6 to 5.10). Every answer comes from engine/reactions-aromatic.js (the substituent table, predictSubst, oxidizeSideChain,
// hydrogenate) and engine/synthesis.js (the planner), proven against Python RDKit by tools/check_directors.py. Fresh problems each run.
// Tasks:
//   classify : which of the three bins does this group belong in?                               (skill directors)
//   position : tap the ring carbons where E+ will go on a substituted benzene (ring-position)   (skill directors)
//   product  : substituted benzene + reagent -> product(s), four drawn answers                  (skill directors)
//   sidechain: KMnO4 on an alkylbenzene, or H2 with Pd/C or Pt on a hydrocarbon                 (skill side-chains)
//   order    : plan a two- or three-step synthesis in the right ORDER (synthesis-planner)       (skill aromatic-synthesis)
import { DIRECTORS, DIRECTOR_IDS, BINS, LAB_SUBST, LAB_EAS, labLabel, predictSubst, substChoices, substRightWhy, oxidizeSideChain, hydrogenate, ringGroups, BENZENE, HYDROGENATION, attackSet } from './reactions-aromatic.js';
import { CARDS, runSequence, solveSequences } from './synthesis.js';
import { nameBothArene } from './naming-arene.js';
import { nameBothAny } from './naming-chain.js';
import { canon } from './chem.js';

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const LETTERS = 'ABCD';
const nmOpt = (s) => { const n = nameBothAny(s) || nameBothArene(s); return n ? n.new : null; };
const nm = (s) => nmOpt(s) || s;
/** Subject of a sentence: the name when the naming engine has one, else a pointer to the drawing (never a raw SMILES string). */
const who = (s) => nmOpt(s) || (s === 'C=Cc1ccccc1' ? 'styrene' : 'The compound shown below');
const shown = (s) => { const n = nmOpt(s); return n || `<mol smiles="${s}"></mol>`; };

// ---------------------------------------------------------------- 1. classify a group
function classifyProblem(rng) {
  const id = pick(rng, DIRECTOR_IDS);
  const g = DIRECTORS[id];
  const opts = shuffle(rng, Object.keys(BINS)).map((b) => ({
    text: BINS[b].label, correct: b === g.cls,
    why: b === g.cls ? `Yes. ${g.why}` : `Not this bin. ${g.label} belongs in “${BINS[g.cls].label}”. ${g.why}`
  }));
  return {
    kind: 'choice', skill: 'directors', smiles: g.ex, highlight: [],
    prompt: `The ring carries the group ${g.label} (${g.name}). Which bin does it belong in?`,
    options: opts, answer: opts.find((o) => o.correct).text,
    group: id, derive: `${g.label} is in “${BINS[g.cls].label}”. ${g.why}`,
    hints: ['Ask first: does the group make the ring MORE reactive than benzene (an activator) or LESS reactive (a deactivator)? Only the halogens are deactivators that still direct ortho/para.', 'Activators: –NH₂, –NHR, –NR₂, –OH, –OR, –NHCOR, alkyl, phenyl (all ortho/para). Deactivating ortho/para: –F, –Cl, –Br, –I. Deactivating meta: –NO₂, –C≡N, –SO₃H, –CHO, –COR, –CO₂H, –CO₂R, –NR₃⁺. There is no meta-directing activator.']
  };
}

// ---------------------------------------------------------------- 2. where does E+ go?
const RINGS = LAB_SUBST.arenes;
function positionProblem(rng) {
  const a = pick(rng, RINGS);
  const g = DIRECTORS[ringGroups(a.smiles).subs[0].id];
  return {
    kind: 'widget', widget: 'ring-position', skill: 'directors', smiles: null,
    prompt: `An electrophile E⁺ attacks ${nm(a.smiles)}. Tap every ring carbon where the new group will go.`,
    config: { attack: [a.smiles] }, ring: a.smiles,
    derive: `${g.label} is in “${BINS[g.cls].label}”, so E⁺ goes ${g.cls === 'deactM' ? 'meta (two equivalent carbons)' : 'ortho (two carbons) and para (one carbon)'}. ${g.why}`,
    hints: ['Decide the bin of the group on the ring first. Ortho/para directors send E⁺ next to the group and opposite it; meta directors send it one carbon away on either side.', 'Count carbons round the ring from the carbon that carries the group: ortho = 1 and 5 away, meta = 2 and 4 away, para = 3 away. Tap every equivalent carbon.']
  };
}

// ---------------------------------------------------------------- 3. product of a substitution
const LABEL_OF = (x) => labLabel(x);
function productProblem(rng) {
  for (let t = 0; t < 40; t++) {
    const a = pick(rng, RINGS);
    const rid = pick(rng, LAB_SUBST.reagents);
    const x = LAB_EAS.find((y) => y.id === rid);
    const pred = predictSubst(a.smiles, x.reagent, x.halide || null);
    if (!pred.ok) continue;
    const ch = shuffle(rng, substChoices(pred));
    const opts = ch.map((o, i) => ({ smiles: o.smiles.join('.'), text: 'Option ' + LETTERS[i], correct: o.correct, why: o.why, kind: o.kind }));
    return {
      kind: 'choice', skill: 'directors', smiles: null, equation: { reactants: [a.smiles], products: [], cond: LABEL_OF(x) },
      prompt: `${nm(a.smiles)} reacts with ${LABEL_OF(x)}. What is the major product (or products)?`,
      options: opts, answer: opts.find((o) => o.correct).text, reagent: x.reagent, halide: x.halide || null, arene: a.smiles, products: pred.products,
      derive: substRightWhy(pred).replace(/^Yes\. /, ''),
      hints: ['Name the group on the ring and its bin. Then the electrophile replaces an H at the positions that group points to: ortho and para, or meta.', 'An ortho/para director gives TWO products (ortho and para, drawn together in one answer); a meta director gives one. Count the groups on the ring: just one new group is added.']
    };
  }
  throw new Error('no product problem');
}

// ---------------------------------------------------------------- 4. side chains
const OX_SUBSTRATES = ['Cc1ccccc1', 'CCc1ccccc1', 'CCCc1ccccc1', 'CCCCc1ccccc1', 'CC(C)c1ccccc1', 'CC(C)(C)c1ccccc1', 'Cc1ccc(Cl)cc1', 'Cc1ccc(cc1)[N+](=O)[O-]', 'Cc1ccc(Br)cc1', 'Cc1ccc(cc1)C(C)(C)C', 'CCc1ccc([N+](=O)[O-])cc1', 'Cc1ccccc1Cl', 'Cc1ccccc1C', 'Cc1ccc(C)cc1'];
const KETONE = { 'CCc1ccccc1': 'CC(=O)c1ccccc1', 'CCCc1ccccc1': 'CCC(=O)c1ccccc1', 'CCCCc1ccccc1': 'CCCC(=O)c1ccccc1' };
const ONE_ONLY = { 'Cc1ccccc1C': 'Cc1ccccc1C(=O)O', 'Cc1ccc(C)cc1': 'Cc1ccc(cc1)C(=O)O' };
function oxProblem(rng) {
  const s = pick(rng, OX_SUBSTRATES);
  const r = oxidizeSideChain(s);
  const out = [{ smiles: r.product, correct: true, why: `Yes. ${r.why}`, kind: r.reacts ? 'acid' : 'unchanged' }];
  const add = (smi, why, kind) => { if (smi && canon(smi) && !out.some((o) => canon(o.smiles) === canon(smi))) out.push({ smiles: smi, correct: false, why, kind }); };
  const benzoic = canon('OC(=O)c1ccccc1');
  if (r.reacts) {
    add(s, 'Nothing happens only when the benzylic carbon has no H. Here it has one (or more), so KMnO₄ oxidises that group.', 'unchanged');
    if (ONE_ONLY[s]) add(ONE_ONLY[s], 'KMnO₄ oxidises EVERY alkyl group that has a benzylic H, not just one of them.', 'oneOnly');
    if (canon(r.product) !== benzoic && !ONE_ONLY[s]) add('OC(=O)c1ccccc1', 'The other groups on the ring survive KMnO₄ (a halogen, a nitro group or a tert-butyl group is not attacked), so the product keeps them.', 'groupLost');
    if (canon(r.product) === benzoic) add('OC(=O)C1CCCCC1', 'The ring is not reduced by KMnO₄ (an oxidant): it stays aromatic. The ring is reduced only by H₂ with a Pt catalyst at high pressure.', 'ringSaturated');
    if (KETONE[s]) add(KETONE[s], 'KMnO₄ does not stop at the ketone: the benzylic carbon is oxidised on to the carboxylic acid and the rest of the chain is cleaved off.', 'ketone');
    if (ONE_ONLY[s] && out.length < 3) add('OC(=O)C1CCCCC1C(=O)O', 'The ring is not reduced by KMnO₄ (an oxidant): it stays aromatic.', 'ringSaturated');
  } else {
    add(canon(oxidizeSideChain(s.replace('CC(C)(C)', 'C')).product), 'This is the trap: oxidation needs an H on the benzylic carbon (the carbon bonded to the ring). tert-butyl has none, so it is not oxidised, and the ring is not attacked either.', 'trap');
    add('OC(=O)C(C)(C)c1ccccc1', 'That would need a C–H bond on the benzylic carbon to be broken; the benzylic carbon of tert-butyl has four C–C bonds and no H.', 'tooFar');
    add('CC(C)(C)C1CCCCC1', 'KMnO₄ is an oxidant; it does not add H₂ to the ring. The ring is reduced only by H₂ with a Pt catalyst at high pressure.', 'ringSaturated');
  }
  const opts = shuffle(rng, out.slice(0, 4)).map((o, i) => ({ ...o, text: 'Option ' + LETTERS[i] }));
  return {
    kind: 'choice', skill: 'side-chains', smiles: null, equation: { reactants: [s], products: [], cond: 'KMnO₄, H₂O' },
    prompt: `${who(s)} is heated with KMnO₄ in water. What is the aromatic product?`,
    options: opts, answer: opts.find((o) => o.correct).text, substrate: s, product: r.product, reacts: r.reacts,
    derive: `${r.why} Product: ${nm(r.product)}.`,
    deriveHtml: `${r.why} Product: ${shown(r.product)}${nmOpt(r.product) ? '.' : ''}`,
    hints: ['Look at the carbon bonded directly to the ring (the benzylic carbon). Does it carry at least one H? If so, KMnO₄ oxidises that group; if not (tert-butyl), nothing happens.', 'When a group does react, the whole alkyl group, whatever its length, becomes –CO₂H on the same ring carbon. Other groups on the ring (halogens, –NO₂, tert-butyl) are not touched.']
  };
}
const HYD_CASES = [['C=Cc1ccccc1', 'H2_Pd'], ['C=Cc1ccccc1', 'H2_Pt_high'], ['CC=Cc1ccccc1', 'H2_Pd'], ['C=CCc1ccccc1', 'H2_Pd'], ['C#Cc1ccccc1', 'H2_Pd']];
function hydProblem(rng) {
  const [s, cond] = pick(rng, HYD_CASES);
  const r = hydrogenate(s, cond);
  const C = HYDROGENATION[cond];
  const out = [{ smiles: r.product, correct: true, why: `Yes. ${r.why}`, kind: 'major' }];
  const add = (smi, why, kind) => { if (smi && canon(smi) && !out.some((o) => canon(o.smiles) === canon(smi))) out.push({ smiles: smi, correct: false, why, kind }); };
  const rP = hydrogenate(s, 'H2_Pt_high'), dP = hydrogenate(s, 'H2_Pd');
  if (cond === 'H2_Pd') {
    add(rP.product, 'That reduces the ring as well. Pd/C at ordinary pressure does not reduce a benzene ring: it is far less reactive than an alkene. Ring reduction needs Pt (or Rh) and high pressure.', 'ringToo');
    add(s, 'The multiple bond outside the ring is hydrogenated easily by H₂ and Pd/C, so the starting material does not survive.', 'unchanged');
    if (s === 'C#Cc1ccccc1') add('C=Cc1ccccc1', 'Pd/C does not stop at the alkene (only the Lindlar catalyst does that). With H₂ and Pd/C an alkyne goes all the way to the alkane.', 'stopsEarly');
  } else {
    add(dP.product, 'That is what mild conditions (Pd/C, 1 atm) would give. With Pt at high pressure the ring is reduced too.', 'mild');
    add(s, 'Pt with H₂ at high pressure and temperature reduces the C=C and the ring, so the starting material does not survive.', 'unchanged');
  }
  const opts = shuffle(rng, out.slice(0, 4)).map((o, i) => ({ ...o, text: 'Option ' + LETTERS[i] }));
  return {
    kind: 'choice', skill: 'side-chains', smiles: null, equation: { reactants: [s], products: [], cond: C.label },
    prompt: `${who(s)} is treated with ${C.label}. What is the product?`,
    options: opts, answer: opts.find((o) => o.correct).text, substrate: s, cond, product: r.product,
    derive: r.why,
    hints: ['A benzene ring is much harder to reduce than a C=C. Under mild conditions (Pd/C, 1 atm) only the C=C outside the ring reacts; the ring needs Pt (or Rh) and high pressure.', 'Count the multiple bonds that can react under these conditions: a side-chain C=C or C≡C always does; the ring only at high pressure with Pt.']
  };
}
function sideProblem(rng) { return rng() < 0.6 ? oxProblem(rng) : hydProblem(rng); }

// ---------------------------------------------------------------- 5. order puzzles (planner)
const ADDERS = [['Br', 'Br2_FeBr3'], ['Cl', 'Cl2_FeCl3'], ['NO2', 'HNO3_H2SO4'], ['SO3H', 'SO3_H2SO4'], ['Ac', 'AcCl_AlCl3']];
const DECK = ['Br2_FeBr3', 'Cl2_FeCl3', 'HNO3_H2SO4', 'SO3_H2SO4', 'MeCl_AlCl3', 'AcCl_AlCl3', 'KMnO4_H2O'];
const D = { directors: true };
let PUZZLES = null;
/** Every puzzle (start, plan, target) where the ORDER decides the product, found by running the engine. */
export function orderPuzzles() {
  if (PUZZLES) return PUZZLES;
  const out = [];
  const seen = new Set();
  const tryPlan = (start, plan, alt) => {
    const run = runSequence(start, plan, D);
    if (!run.ok) return;
    const pool = run.final.pool || [run.final.smiles];
    pool.forEach((t) => {
      const key = start + '>' + t;
      if (seen.has(key)) return;
      // the order matters when swapping the two substitution steps cannot reach the same target
      const altRun = alt ? runSequence(start, alt, D) : null;
      const altPool = altRun && altRun.ok ? (altRun.final.pool || [altRun.final.smiles]) : [];
      if (alt && altPool.includes(t)) return;
      const plans = solveSequences(start, t, DECK, plan.length, D);
      if (!plans.length || !ringGroups(t).ok) return;
      seen.add(key);
      out.push({ start, target: t, plan, alt, plans });
    });
  };
  // benzene -> two groups
  for (const [g1, c1] of ADDERS) for (const [g2, c2] of ADDERS) {
    if (c1 === c2) continue;
    tryPlan(BENZENE, [c1, c2], [c2, c1]);
  }
  // benzene -> methylation, substitution, oxidation (benzoic acids)
  for (const [g, c] of ADDERS.filter(([x]) => ['Br', 'Cl', 'NO2'].includes(x))) {
    tryPlan(BENZENE, ['MeCl_AlCl3', c, 'KMnO4_H2O'], ['MeCl_AlCl3', 'KMnO4_H2O', c]);
    tryPlan(BENZENE, ['MeCl_AlCl3', 'KMnO4_H2O', c], ['MeCl_AlCl3', c, 'KMnO4_H2O']);
    tryPlan('Cc1ccccc1', [c, 'KMnO4_H2O'], ['KMnO4_H2O', c]);
    tryPlan('Cc1ccccc1', ['KMnO4_H2O', c], [c, 'KMnO4_H2O']);
  }
  PUZZLES = out.filter((p) => p.plans.length >= 1 && p.plans.every((pl) => pl.length === p.plan.length));
  return PUZZLES;
}
function orderProblem(rng) {
  const all = orderPuzzles();
  const p = pick(rng, all);
  const need = new Set(p.plans.flat());
  const decoys = shuffle(rng, DECK.filter((c) => !need.has(c))).slice(0, Math.max(1, 5 - need.size));
  const deck = shuffle(rng, [...need, ...decoys]);
  const labs = p.plans[0].map((c) => CARDS[c].label).join(' → ');
  return {
    kind: 'widget', widget: 'synthesis-planner', skill: 'aromatic-synthesis', smiles: null,
    prompt: `Plan the synthesis of ${nmOpt(p.target) || 'the target molecule shown below'} from ${nm(p.start)}. The ORDER of the steps decides which isomer you get (assume ortho and para isomers can be separated).`,
    config: { start: p.start, target: p.target, deck, directors: true },
    start: p.start, target: p.target, plans: p.plans,
    derive: `One working plan: ${labs}. Work backward: the group that goes on first decides where the second one goes.`,
    hints: ['Work backward from the target. Which of its two groups is a meta director? Put a meta director on the ring first when the groups must end up meta; put an ortho/para director on first when they must end up ortho or para.', 'Remember that KMnO₄ turns CH₃ (ortho/para director) into –CO₂H (meta director), and that Friedel–Crafts reactions fail on a ring that already has –NO₂, –C≡N, –SO₃H or –COR.']
  };
}

const TASKS = { classify: classifyProblem, position: positionProblem, product: productProblem, sidechain: sideProblem, order: orderProblem };
const BY_SKILL = { directors: ['classify', 'position', 'product'], 'side-chains': ['sidechain'], 'aromatic-synthesis': ['order'] };
export const DIRECTOR_SKILLS = Object.keys(BY_SKILL);
export const DIRECTOR_TASKS = Object.keys(TASKS);
export function makeDirectorProblem(rng, task) {
  const f = TASKS[task];
  if (!f) throw new Error('unknown task ' + task);
  return f(rng);
}
export function generateDirectors(count, { skill = null, rng = Math.random } = {}) {
  const tasks = skill && BY_SKILL[skill] ? BY_SKILL[skill] : DIRECTOR_TASKS;
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeDirectorProblem(rng, pick(rng, tasks)); tries++; } while (last && JSON.stringify([p.prompt, p.config, p.smiles]) === last && tries < 8);
    last = JSON.stringify([p.prompt, p.config, p.smiles]);
    out.push(p);
  }
  return out;
}
