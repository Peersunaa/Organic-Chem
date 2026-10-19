// Mastery / practice generator "resonance" (Lesson 11). Every answer comes from engine/resonance.js (forms enumerated by sliding electrons, candidates judged
// by compareForm) and engine/reactions-dienes.js, never from typed tables; tests/lesson11.mjs proves each system against RDKit's ResonanceMolSupplier.
// Tasks: draw (resonance-drawer: draw the next form), valid (pick the one valid form among three traps: atom moved, five bonds, changed charge),
// invalid (pick the structure that is NOT a valid form of an extended system), count (how many forms), products (diene + HX: 1,2 and 1,4 products).
import { analyze } from './chem.js';
import { enumerate, toSmiles, compareForm } from './resonance.js';
import { LAB_DIENES, HX_DIENE_IDS, HX, predictDiene, dieneChoices } from './reactions-dienes.js';

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const LETTERS = 'ABCD';

/**
 * The pool: allylic and conjugated systems with a lone pair, a charge or an empty p orbital next to a C=C or C=O.
 * `moved` is a hand-written structure with the same atoms and charge but one atom somewhere else (checked by compareForm in the tests).
 * `fold` counts the two Kekule drawings of a ring once. `name` is how the prompt calls the species. `fam` groups them for the explanation.
 * Allyl RADICALS are not in the pool: RDKit does not enumerate radical resonance, so they could not be proved independently.
 */
export const RES_POOL = [
  { id: 'allyl-cation', name: 'allyl cation', start: '[CH2+]C=C', moved: 'C[C+]=C', fam: 'cation' },
  { id: 'but-2-enyl-cation', name: 'but-2-en-1-yl cation (the cation from buta-1,3-diene + H⁺)', start: '[CH2+]C=CC', moved: 'C[C+]=CC', fam: 'cation' },
  { id: '2-methylallyl-cation', name: '2-methylallyl cation', start: '[CH2+]C(C)=C', moved: 'CC(C)=[CH+]', fam: 'cation' },
  { id: '1,1-dimethylallyl-cation', name: '3-methylbut-2-en-1-yl cation', start: '[CH2+]C=C(C)C', moved: 'C=C[CH+]C(C)', fam: 'cation' },
  { id: 'allyl-anion', name: 'allyl anion', start: '[CH2-]C=C', moved: 'C[C-]=C', fam: 'anion' },
  { id: 'but-2-enyl-anion', name: 'but-2-en-1-yl anion', start: '[CH2-]C=CC', moved: 'C[C-]=CC', fam: 'anion' },
  { id: 'acetaldehyde-enolate', name: 'enolate ion of acetaldehyde', start: 'C=C[O-]', moved: 'C[C-]=O', fam: 'enolate' },
  { id: 'acetone-enolate', name: 'enolate ion of acetone', start: 'C=C(C)[O-]', moved: '[CH-]=C(C)O', fam: 'enolate' },
  { id: 'acetate', name: 'acetate ion', start: 'CC(=O)[O-]', moved: '[CH2-]C(=O)O', fam: 'carboxylate' },
  { id: 'propanoate', name: 'propanoate ion', start: 'CCC(=O)[O-]', moved: 'C[CH-]C(=O)O', fam: 'carboxylate' },
  { id: 'formate', name: 'formate ion', start: 'O=C[O-]', moved: '[C-](=O)O', fam: 'carboxylate' },
  { id: 'nitromethane', name: 'nitromethane', start: 'C[N+](=O)[O-]', moved: '[CH2-][N+](=O)O', fam: 'nitro' },
  { id: 'nitroethane', name: 'nitroethane', start: 'CC[N+](=O)[O-]', moved: 'C[CH-][N+](=O)O', fam: 'nitro' },
  { id: 'acetamide', name: 'acetamide', start: 'CC(=O)N', moved: 'CC(O)=N', fam: 'amide' },
  { id: 'formamide', name: 'formamide', start: 'O=CN', moved: 'OC=N', fam: 'amide' },
  { id: 'benzyl-cation', name: 'benzyl cation', start: '[CH2+]C1=CC=CC=C1', fold: true, moved: 'Cc1ccc[c+]c1', fam: 'benzyl' }
];
/** Extended systems with at least four forms (3 other valid ones): used for "which is NOT a valid form". */
export const LONG_POOL = [
  { id: 'heptatrienyl-cation', name: 'hepta-2,4,6-trien-1-yl cation', start: '[CH2+]C=CC=CC=C', fam: 'cation' },
  { id: 'heptatrienyl-anion', name: 'hepta-2,4,6-trien-1-yl anion', start: '[CH2-]C=CC=CC=C', fam: 'anion' }
];
/** Systems whose forms are counted (a number answer). */
export const COUNT_POOL = [
  ...RES_POOL.filter((s) => ['allyl-cation', 'allyl-anion', 'acetate', 'nitromethane', 'benzyl-cation', 'acetaldehyde-enolate'].includes(s.id)),
  { id: 'pentadienyl-cation', name: 'penta-2,4-dien-1-yl cation', start: '[CH2+]C=CC=C', fam: 'cation' },
  { id: 'pentadienyl-anion', name: 'penta-2,4-dien-1-yl anion', start: '[CH2-]C=CC=C', fam: 'anion' },
  { id: 'carbonate', name: 'carbonate ion', start: 'O=C([O-])[O-]', fam: 'carboxylate' },
  { id: 'nitrate', name: 'nitrate ion', start: '[O-][N+](=O)[O-]', fam: 'nitro' },
  { id: 'heptatrienyl-cation', name: 'hepta-2,4,6-trien-1-yl cation', start: '[CH2+]C=CC=CC=C', fam: 'cation' }
];
/** Every start of the three pools (the tests run them all through RDKit). */
export const ALL_SYSTEMS = (() => { const m = new Map(); [...RES_POOL, ...LONG_POOL, ...COUNT_POOL].forEach((s) => m.set(s.id, s)); return [...m.values()]; })();

const FAM_WHY = {
  cation: 'The empty p orbital on C⁺ overlaps the π bond next to it, so the π pair slides over and the + charge moves to the far end.',
  anion: 'The lone pair on the carbanion overlaps the π bond next to it, so the pair becomes a π bond and the π pair becomes a new lone pair on the far end.',
  enolate: 'The lone pair on the carbon (or the oxygen) overlaps the neighbouring double bond, so the − charge moves between the oxygen and the carbon.',
  carboxylate: 'A lone pair on the O⁻ becomes a C=O π bond while the old C=O π pair moves onto the other oxygen: the − charge is shared by both oxygens.',
  nitro: 'A lone pair on one O⁻ becomes an N=O π bond while the other N=O π pair moves onto the other oxygen: the two N–O bonds are equivalent.',
  amide: 'The lone pair on nitrogen overlaps the C=O π bond: it becomes a C=N π bond while the C=O π pair moves onto oxygen (a minor, charge-separated contributor).',
  benzyl: 'The empty p orbital on CH₂⁺ overlaps the ring’s π bonds, so the + charge moves around the ring to the ortho and para positions.'
};

let cache = new Map();
/** Forms of a system (computed once per run: needs RDKit). */
export function formsOf(sys) {
  if (!cache.has(sys.id)) cache.set(sys.id, enumerate(sys.start, { fold: !!sys.fold }));
  return cache.get(sys.id);
}

// ---------------------------------------------------------------- trap candidates (computed from a form, then judged by compareForm)
const bi = (st, i, j) => st.bonds.findIndex((b) => (b.a === i && b.b === j) || (b.a === j && b.b === i));
const cloneState = (st) => ({ el: st.el, impH: st.impH.slice(), charge: st.charge.slice(), bonds: st.bonds.map((b) => ({ ...b })) });

/** Five bonds on one atom: add a second bond between two atoms that already have a double bond and a neighbour (never remove a bond). */
export function octetTrap(st) {
  const s = cloneState(st);
  const n = st.el.length;
  const orderOf = (i) => s.bonds.reduce((t, b) => t + (b.a === i || b.b === i ? b.order : 0), 0) + s.impH[i];
  const cand = [];
  for (let y = 0; y < n; y++) {
    if (!['C', 'N'].includes(s.el[y])) continue;
    const dbl = s.bonds.find((b) => b.order === 2 && (b.a === y || b.b === y));
    if (!dbl) continue;
    for (const b of s.bonds) {
      if (b.order !== 1 || !(b.a === y || b.b === y)) continue;
      const x = b.a === y ? b.b : b.a;
      cand.push({ y, x, b, score: (s.el[y] === 'C' ? 0 : 1) + (s.charge[x] !== 0 ? 0 : 1) });
    }
  }
  if (!cand.length) return null;
  cand.sort((p, q) => p.score - q.score);
  cand[0].b.order = 2;
  s.charge[cand[0].x] = 0;     // the new bond replaces the charge on its other end, so the drawing reads like a plain extra bond
  return toSmiles(s, { brackets: true });
}

/** A different total charge: remove the charge of the first charged atom (it becomes a radical), or make the first N or O a radical cation if nothing is charged. */
export function chargeTrap(st) {
  const s = cloneState(st);
  let i = s.charge.findIndex((q) => q !== 0);
  if (i >= 0) {
    // a nitro group keeps its + on N: take the charge off an O⁻ instead
    const neg = s.charge.findIndex((q) => q < 0);
    if (s.charge[i] > 0 && neg >= 0 && s.el[i] === 'N') i = neg;
    s.charge[i] = 0;
  } else {
    i = s.el.findIndex((e) => e === 'N');
    if (i < 0) return null;
    s.charge[i] = 1;
  }
  return toSmiles(s, { brackets: true });
}

/** Does the candidate need the unsanitised drawing (RDKit refuses it)? */
export const needsRaw = (smiles) => !analyze(smiles);

// ---------------------------------------------------------------- 1. draw the next form
function drawProblem(rng) {
  const sys = pick(rng, RES_POOL);
  const forms = formsOf(sys);
  return {
    kind: 'widget', widget: 'resonance-drawer', skill: 'resonance', smiles: null, reaction: null,
    prompt: `Draw the curved arrow${sys.fam === 'carboxylate' || sys.fam === 'nitro' || sys.fam === 'amide' || sys.fam === 'enolate' || sys.fam === 'anion' ? 's' : ' or arrows'} that turn the ${sys.name} into a different resonance form, then press Check. (Tap the electrons the arrow starts from, then the bond or atom it ends on.)`,
    config: { start: sys.start, fold: !!sys.fold, need: 1, name: sys.name, hybrid: false },
    system: sys.id, start: sys.start, nForms: forms.length,
    derive: `${FAM_WHY[sys.fam]} The ${sys.name} has ${forms.length} resonance form${forms.length > 1 ? 's' : ''}: ${forms.map((f) => f.smiles).join(' ↔ ')}. Only electrons moved; every atom and σ bond stayed put.`,
    deriveHtml: `${FAM_WHY[sys.fam]} The ${sys.name} has ${forms.length} resonance form${forms.length > 1 ? 's' : ''}: ${forms.map((f) => `<mol smiles="${f.smiles}">`).join(' ↔ ')}. Only electrons moved; every atom and σ bond stayed put.`,
    hints: ['Find the pair of electrons that can move: a lone pair or an empty p orbital sitting right next to a π bond. Atoms never move, only these electrons.', 'Draw the arrow from the π bond (or lone pair) to the bond between it and the charged atom. When a pair arrives at an atom that already has an octet, a second arrow must take a π pair away from it.']
  };
}

// ---------------------------------------------------------------- 2. pick the one VALID resonance form among three traps
function validProblem(rng) {
  const sys = pick(rng, RES_POOL.filter((s) => s.moved));
  const forms = formsOf(sys);
  const start = sys.start;
  const others = forms.slice(1).filter((f) => f.smiles !== forms[0].smiles || forms.length === 2);
  const right = pick(rng, others.length ? others : forms.slice(1));
  const cands = [
    { smiles: right.smiles, correct: true, kind: 'valid', code: 'ok' },
    { smiles: sys.moved, correct: false, kind: 'moved', code: 'moved' },
    { smiles: octetTrap(forms[1].state), correct: false, kind: 'octet', code: 'octet' },
    { smiles: chargeTrap(forms[1].state), correct: false, kind: 'charge', code: 'charge' }
  ];
  const opts = shuffle(rng, cands).map((c, i) => {
    const r = compareForm(start, c.smiles);
    return { smiles: c.smiles, text: 'Option ' + LETTERS[i], correct: c.correct, kind: c.kind, code: r.code, raw: needsRaw(c.smiles), why: c.correct ? `Yes. ${FAM_WHY[sys.fam]} Same atoms, same σ bonds, same charge, every octet respected.` : r.diagnosis };
  });
  return {
    kind: 'choice', skill: 'resonance', smiles: start, reaction: null,
    prompt: `Which of these is a valid resonance form of the ${sys.name} drawn above? Check atoms, charge and octets.`,
    options: opts, answer: opts.find((o) => o.correct).text, system: sys.id, start,
    derive: `${FAM_WHY[sys.fam]} The others break a rule: an atom moved, a carbon got five bonds, or the total charge changed.`,
    hints: ['A resonance form keeps every atom where it is and the same total charge. Compare each option with the structure above: same atoms in the same places?', 'Look for three kinds of error: an H (or other atom) that moved, a carbon with five bonds, and a different overall charge. The valid form only moved π electrons or a lone pair.']
  };
}

// ---------------------------------------------------------------- 3. pick the structure that is NOT a valid form
function invalidProblem(rng) {
  const sys = pick(rng, LONG_POOL);
  const forms = formsOf(sys);
  const valid = shuffle(rng, forms.slice(1)).slice(0, 3);
  const trapKind = pick(rng, ['octet', 'charge']);
  const bad = trapKind === 'octet' ? octetTrap(valid[0].state) : chargeTrap(valid[0].state);
  const cands = [...valid.map((f) => ({ smiles: f.smiles, correct: false, kind: 'valid' })), { smiles: bad, correct: true, kind: trapKind }];
  const opts = shuffle(rng, cands).map((c, i) => {
    const r = compareForm(sys.start, c.smiles);
    return { smiles: c.smiles, text: 'Option ' + LETTERS[i], correct: c.correct, kind: c.kind, code: r.code, raw: needsRaw(c.smiles), why: c.correct ? `Yes, this is the odd one out. ${r.diagnosis}` : 'This one is a valid resonance form: only π electrons moved, the charge is the same and every octet is respected. The question asks for the one that is NOT.' };
  });
  return {
    kind: 'choice', skill: 'resonance', smiles: sys.start, reaction: null,
    prompt: `Three of these structures are resonance forms of the ${sys.name} drawn above. Which one is NOT?`,
    options: opts, answer: opts.find((o) => o.correct).text, system: sys.id, start: sys.start,
    derive: `A resonance form has the same atoms in the same places and the same total charge, and every atom keeps to its octet. The odd one out ${trapKind === 'octet' ? 'has an atom with too many bonds' : 'has a different total charge'}.`,
    hints: ['Go through the options one at a time. For each: are all atoms still connected the same way, is the total charge the same as above, and does every carbon have 4 bonds at most?', 'The three valid forms put the charge on different carbons of the same chain. The odd one out breaks the octet rule or changes the charge.']
  };
}

// ---------------------------------------------------------------- 4. count the forms
function countProblem(rng) {
  const sys = pick(rng, COUNT_POOL);
  const n = formsOf(sys).length;
  const note = sys.fold ? ' (count the two Kekulé drawings of the ring as one form)' : '';
  return {
    kind: 'input', skill: 'resonance', smiles: sys.start, reaction: null,
    prompt: `How many resonance forms does the ${sys.name} drawn above have${note}? (Count every drawing you can make by moving only π electrons or lone pairs, the one shown included.)`,
    answer: n, system: sys.id, start: sys.start,
    derive: `${FAM_WHY[sys.fam]} Moving the charge or lone pair along every possible position gives ${n} forms. More forms means the electrons are spread over more atoms, so the species is more stable.`,
    wrong: [{ match: n - 1, why: `${n - 1} is one short. Remember to count the structure shown as one of the forms, then find every other place the charge (or the π pair) can go.` }, { match: n + 1, why: `${n + 1} is one too many. Every form must keep all atoms in place and put the charge on a carbon, nitrogen or oxygen that can really hold it, with no atom over its octet.` }],
    hints: ['Slide the π electrons (or the lone pair) one bond at a time and write down each new structure. Stop when you only get structures you already have.', 'The charge can only sit on atoms of the conjugated chain (the atoms with a p orbital). Count the atoms in that chain that can carry it.']
  };
}

// ---------------------------------------------------------------- 5. diene + HX products
function productsProblem(rng) {
  const diene = pick(rng, LAB_DIENES), reagent = pick(rng, HX_DIENE_IDS);
  const pred = predictDiene(diene.smiles, reagent);
  const ch = shuffle(rng, dieneChoices(pred));
  const pairHtml = (list) => list.map((s) => `<mol smiles="${s}">`).join(' + ');
  const options = ch.map((o, i) => ({ text: `${LETTERS[i]}: ` + (o.smiles.length > 1 ? pairHtml(o.smiles) : pairHtml(o.smiles)), correct: o.correct, kind: o.kind, why: o.why, products: o.smiles }));
  const R = HX[reagent];
  return {
    kind: 'choice', skill: 'dienes', smiles: diene.smiles, reaction: null,
    promptHtml: `One equivalent of ${R.label} adds to <name new="${diene.name.new}" old="${diene.name.old}"></name>. Which set of products forms (1,2- and 1,4-addition through the allylic cation)?`,
    prompt: `${R.label} (1 equivalent) adds to the diene. Which products form?`,
    options, answer: options.find((o) => o.correct).text, diene: diene.smiles, reagent, products: pred.products,
    derive: pred.outcome === 'two'
      ? `H⁺ adds to C1, giving the allylic cation. Its + charge is shared by C2 and C4, so ${R.X}⁻ attacks either end: 1,2-addition (${R.X} on C2) and 1,4-addition (${R.X} on C4, C=C moved to C2=C3).`
      : `H⁺ adds to C1, giving the allylic cation. ${R.X}⁻ can attack either end, but both ends lead to the SAME compound here, so there is one product.`,
    hints: ['H⁺ adds to the end carbon (C1) of the diene so that the cation that forms is allylic: the + charge sits next to the remaining C=C and is shared with the far end by resonance.', 'The halide can attack either carbon that shares the + charge. 1,2-addition puts it on C2; 1,4-addition puts it on C4 and moves the C=C to C2=C3. Check whether the two products are the same compound.']
  };
}

const TASKS = { draw: drawProblem, valid: validProblem, invalid: invalidProblem, count: countProblem, products: productsProblem };
const BY_SKILL = { resonance: ['draw', 'valid', 'invalid', 'count'], dienes: ['products'] };
export const RES_SKILLS = Object.keys(BY_SKILL);
export const RES_TASKS = Object.keys(TASKS);
export function makeResonanceProblem(rng, task) {
  const f = TASKS[task];
  if (!f) throw new Error('unknown task ' + task);
  return f(rng);
}
export function generateResonance(count, { skill = null, rng = Math.random } = {}) {
  const tasks = skill && BY_SKILL[skill] ? BY_SKILL[skill] : RES_TASKS;
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeResonanceProblem(rng, pick(rng, tasks)); tries++; } while (last && JSON.stringify([p.prompt, p.start, p.diene, p.reagent, p.system]) === last && tries < 8);
    last = JSON.stringify([p.prompt, p.start, p.diene, p.reagent, p.system]);
    out.push(p);
  }
  return out;
}
