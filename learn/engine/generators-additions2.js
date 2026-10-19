// Mastery / practice generator "alkene-additions-2" (Lesson 10). Every answer comes from engine/reactions-additions.js (stereo-aware products, cleavage,
// repeat units), never from typed tables.
// Tasks: product (incl. stereochemistry), trap (the KMnO4 conditions trap, both directions), cleave (cleave-it widget), reagent (which reagent for a given
// transformation), polymer (repeat unit <-> monomer).
import { canon } from './chem.js';
import { predictAdd, productChoices2, reagentsFor, REAGENTS2, REAGENT_IDS2, MONOMERS, repeatUnit, repeatChoices, stereoKey, sameProducts, LAB_ALKENES2 } from './reactions-additions.js';
import { mirror } from './stereo-graph.js';
import { nameAlkeneBoth } from './naming.js';

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const LETTERS = 'ABCD';

/** Alkenes for the additions (rings, and acyclic with E/Z written out wherever the product depends on it). Each is checked by predictAdd in the tests. */
export const ADD_POOL = [
  'C1=CCCC1', 'C1=CCCCC1', 'C1=CCCCCC1', 'CC1=CCCC1', 'CC1=CCCCC1', 'CC1=C(C)CCCC1', 'CC1=C(C)CCC1',
  'C/C=C/C', 'C/C=C\\C', 'CC/C=C/CC', 'CC/C=C\\CC', 'C/C=C/CC', 'C/C=C\\CC', 'C/C=C(\\C)CC', 'C/C=C(/C)CC', 'CC/C(C)=C(C)/CC', 'CC/C(C)=C(C)\\CC',
  'CC=C', 'CC(C)=C', 'CCCC=C', 'CCCCC=C', 'CC=C(C)C', 'CC(C)=C(C)C', 'CCC(C)=C'
];
/** Alkenes for cleavage: any simple hydrocarbon with one C=C (a stereocentre elsewhere is fine). */
export const CLEAVE_POOL = ['CC=C(C)C', 'CC(C)=C', 'CCCCC=C', 'C1=CCCCC1', 'C1=CCCC1', 'CC1=CCCCC1', 'CC1=C(C)CCCC1', 'CC/C=C/CC', 'C/C=C/CC', 'CCC(C)C=C', 'C=C1CCCCC1', 'CC=C', 'CCC=C(C)CC', 'CC(C)=C(C)C', 'CC/C=C/C', 'CCCC=CCCC'];

let okPool = null;
const accepted = (alk, id) => { try { return predictAdd(alk, id); } catch (e) { return null; } };
/** Alkenes of the pool that the engine accepts (computed on first use: it needs RDKit). */
export function addPool() { return okPool || (okPool = ADD_POOL.filter((a) => accepted(a, 'Br2'))); }

const nameTag = (alkene) => { const n = nameAlkeneBoth(alkene); return n ? `<name new="${n.new}" old="${n.old}"></name>` : null; };
const eqFor = (alkene, label) => ({ reactants: [alkene], products: [], cond: label });
const PRODUCT_TEXT = {
  halogen: 'the dihalide (two halogen atoms added, anti)', hydrogen: 'the alkane (two H atoms added, syn)', epoxide: 'the epoxide (one O across the C=C)',
  'epoxide-diol': 'the trans (anti) diol', 'diol-syn': 'the cis (syn) diol', cleavage: 'the cleavage products (ketone, carboxylic acid, CO₂)'
};

/** Draw a chiral answer as either enantiomer at random (so the wedge direction gives nothing away; both are right for a racemate). */
function maybeMirror(rng, smiles, racemic) { return racemic && rng() < 0.5 ? canon(mirror(smiles)) : smiles; }

// ---------------------------------------------------------------- 1. the product, with stereochemistry
function productProblem(rng) {
  let pred, R, tries = 0;
  do {
    const alkene = pick(rng, addPool());
    const reagent = pick(rng, REAGENT_IDS2);
    pred = accepted(alkene, reagent);
    R = REAGENTS2[reagent];
    tries++;
  } while (!pred && tries < 20);
  const ch = productChoices2(pred);
  const opts = shuffle(rng, ch).map((o, i) => ({
    smiles: o.correct ? o.smiles.map((s) => maybeMirror(rng, s, pred.racemic)).join('.') : o.smiles.join('.'),
    text: 'Option ' + LETTERS[i], correct: o.correct, why: o.why, kind: o.kind
  }));
  const nm = nameTag(pred.alkene);
  const stereoWord = pred.nCenters >= 2 ? ' Show the stereochemistry.' : '';
  return {
    kind: 'choice', skill: 'stereo-addition', smiles: null, reaction: null, equation: eqFor(pred.alkene, R.label),
    promptHtml: `What is the major product of ${nm ? nm + ' + ' : 'this alkene + '}${R.label}?${stereoWord}`,
    prompt: `What is the major product (${R.label})?`,
    options: opts, answer: opts.find((o) => o.correct).text,
    alkene: pred.alkene, reagent: pred.reagent, products: pred.products,
    derive: `${R.label}: ${PRODUCT_TEXT[R.kind]}.${pred.rel === 'anti' ? ' The two new groups add on opposite faces' + (pred.ring ? ' (trans on a ring)' : '') + '.' : pred.rel === 'syn' ? ' The two new groups add on the same face' + (pred.ring ? ' (cis on a ring)' : '') + '.' : ''}${pred.racemic ? ' A chiral product forms as a racemate, so either mirror image counts.' : ''}`,
    hints: [
      'Decide what the reagent adds: halogens add two X atoms, H₂ adds two H, a peroxyacid adds one O (epoxide), KMnO₄ in base adds two OH, KMnO₄ in acid cuts the C=C.',
      'Then the geometry: Br₂/Cl₂ and the epoxide-then-H₃O⁺ route are anti (opposite faces); H₂, the epoxide itself and KMnO₄/OH⁻ are syn (same face). On a ring, anti = trans and syn = cis; an E or Z alkene keeps its geometry in the epoxide.'
    ]
  };
}

// ---------------------------------------------------------------- 2. the KMnO4 conditions trap
function trapProblem(rng) {
  const ringOrE = addPool().filter((a) => { const b = accepted(a, 'KMnO4_OH'), c = accepted(a, 'RCO3H_H3O'); return b && c && !sameProducts(b.products, c.products); });
  const alkene = pick(rng, ringOrE);
  const basic = accepted(alkene, 'KMnO4_OH'), acid = accepted(alkene, 'KMnO4_H');
  const nm = nameTag(alkene);
  if (rng() < 0.55) {
    // given the conditions, pick the product
    const useBasic = rng() < 0.5;
    const right = useBasic ? basic : acid, wrong = useBasic ? acid : basic;
    const trans = accepted(alkene, 'RCO3H_H3O');
    const cand = [
      { smiles: right.products.join('.'), correct: true, why: useBasic ? 'Yes. KMnO₄ in base stops at the diol and adds both OH groups to the same face (syn): cis on a ring.' : 'Yes. KMnO₄ in acid cuts the C=C: =CR₂ gives a ketone, =CHR a carboxylic acid, =CH₂ gives CO₂.' },
      { smiles: wrong.products.join('.'), correct: false, why: useBasic ? 'That is the product of KMnO₄ in ACID, which cuts the C=C. In base the oxidation stops at the diol.' : 'That is the product of KMnO₄ in BASE, the diol. In acid or neutral solution the oxidation goes on and cuts the C=C.' },
      { smiles: trans.products.join('.'), correct: false, why: 'This is the trans diol from the epoxide route (RCO₃H, then H₃O⁺). KMnO₄ is not that route: in base it gives the cis diol, in acid it cuts the C=C.' },
      { smiles: canon(alkene), correct: false, why: 'That is the starting alkene again. KMnO₄ is a strong oxidant and reacts with the C=C in both acid and base.' }
    ];
    const seen = new Set();
    const uniq = cand.filter((c) => { const k = c.smiles.split('.').map(stereoKey).sort().join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
    const opts = shuffle(rng, uniq).map((o, i) => ({ ...o, text: 'Option ' + LETTERS[i] }));
    return {
      kind: 'choice', skill: 'alkene-oxidation', smiles: null, reaction: null,
      equation: eqFor(alkene, useBasic ? REAGENTS2.KMnO4_OH.label : REAGENTS2.KMnO4_H.label),
      promptHtml: `Same reagent, different conditions. ${nm || 'This alkene'} reacts with <b>${useBasic ? 'KMnO₄ in basic solution (OH⁻, H₂O)' : 'KMnO₄ in acidic solution (H₃O⁺)'}</b>. What forms?`,
      prompt: `${useBasic ? 'KMnO₄ in base' : 'KMnO₄ in acid'}: what forms?`,
      options: opts, answer: opts.find((o) => o.correct).text, alkene, products: right.products,
      derive: useBasic ? 'Basic KMnO₄ hydroxylates: two OH on the same face (syn), so a cis diol on a ring. It does not cut the C=C.' : 'Acidic (or neutral) KMnO₄ cleaves the C=C into carbonyl compounds, not a diol.',
      hints: ['Look at the conditions: base or acid? The same oxidant does two different jobs.', 'Base: stops at the diol (syn addition of two OH). Acid or neutral: the C=C is cut, giving ketones, carboxylic acids or CO₂.']
    };
  }
  // given the product, pick the conditions
  const useBasic = rng() < 0.5;
  const r = useBasic ? 'KMnO4_OH' : 'KMnO4_H';
  const prod = (useBasic ? basic : acid).products;
  const labels = ['KMnO4_OH', 'KMnO4_H', 'RCO3H_H3O', 'H2'];
  const opts = shuffle(rng, labels).map((id, i) => {
    const R = REAGENTS2[id];
    const q = accepted(alkene, id);
    const good = id === r;
    return {
      text: R.label, correct: good, id,
      why: good ? (useBasic ? 'Yes. Basic KMnO₄ gives the cis diol (syn addition of two OH).' : 'Yes. Acidic KMnO₄ cuts the C=C; these carbonyl products are what it gives.')
        : id === 'KMnO4_OH' ? 'Basic KMnO₄ stops at the cis diol; it does not cut the C=C.'
          : id === 'KMnO4_H' ? 'Acidic KMnO₄ cuts the C=C into carbonyl compounds; it does not stop at a diol.'
            : id === 'RCO3H_H3O' ? 'RCO₃H then H₃O⁺ gives the TRANS diol (anti), not a cis diol and not a cleavage product.'
              : `H₂, Pd/C only adds two H atoms and gives ${q ? 'the alkane' : 'an alkane'}.`
    };
  });
  return {
    kind: 'choice', skill: 'alkene-oxidation', smiles: null, reaction: null,
    equation: { reactants: [alkene], products: prod, cond: '?' },
    promptHtml: `Which reagent converts ${nm || 'the alkene'} into ${prod.length > 1 ? 'these products' : 'this product'}?`,
    prompt: 'Which reagent gives this product?',
    options: opts, answer: opts.find((o) => o.correct).text, alkene, products: prod,
    derive: useBasic ? 'A diol with both OH on the same face (cis on a ring) comes from KMnO₄ in base.' : 'Carbonyl-containing products from cutting the C=C come from KMnO₄ in acid.',
    hints: ['Is the C=C still there? Is there a diol, or are there carbonyl groups (ketone, acid, CO₂)?', 'A diol made in one step with both OH on the same face: KMnO₄ in base. Two carbonyl products: KMnO₄ in acid.']
  };
}

// ---------------------------------------------------------------- 3. cleavage products (cleave-it widget)
function cleaveProblem(rng) {
  const alkene = pick(rng, CLEAVE_POOL);
  const pred = predictAdd(alkene, 'KMnO4_H');
  const nm = nameTag(alkene);
  return {
    kind: 'widget', widget: 'cleave-it', skill: 'alkene-oxidation', smiles: null, reaction: null,
    promptHtml: `${nm || 'This alkene'} reacts with KMnO₄ in acidic solution. Cut the C=C and say what each end becomes.`,
    prompt: 'KMnO₄ in acid: cut the C=C and say what each end becomes.',
    config: { alkene }, alkene, products: pred.products,
    derive: `Count the H on each C=C carbon: none gives a ketone, one gives a carboxylic acid, two gives CO₂. Products: ${pred.products.join(' and ')}.`,
    deriveHtml: `Count the H on each C=C carbon: none gives a ketone, one gives a carboxylic acid, two gives CO₂. Products: ${pred.products.map((s) => `<mol smiles="${s}"></mol>`).join(' and ')}`,
    hints: ['Tap the double bond. Then look at each end of it: how many H are on that carbon?', 'No H on the carbon: ketone. One H: carboxylic acid. Two H (=CH₂): CO₂.']
  };
}

// ---------------------------------------------------------------- 4. which reagent
function reagentProblem(rng) {
  let alkene, r, prod, ok, tries = 0;
  do {
    alkene = pick(rng, addPool());
    r = pick(rng, REAGENT_IDS2);
    const p = accepted(alkene, r);
    prod = p && p.products;
    ok = prod && reagentsFor(alkene, prod);
    tries++;
  } while ((!prod || ok.length !== 1) && tries < 60);
  const others = shuffle(rng, REAGENT_IDS2.filter((x) => x !== r && accepted(alkene, x) && !reagentsFor(alkene, prod).includes(x)));
  const set = shuffle(rng, [r, ...others.slice(0, 3)]);
  const nm = nameTag(alkene);
  const opts = set.map((id) => {
    const R = REAGENTS2[id];
    if (id === r) return { text: R.label, correct: true, id, why: `Yes. ${R.label} gives ${PRODUCT_TEXT[R.kind]}, which is the structure shown.` };
    const q = accepted(alkene, id);
    const same = q && sameProducts([canon(alkene)], prod);
    void same;
    return { text: R.label, correct: false, id, why: `${R.label} gives ${PRODUCT_TEXT[R.kind]}, which is a different compound from the one shown.` };
  });
  return {
    kind: 'choice', skill: 'synthesis', smiles: null, reaction: null,
    equation: { reactants: [alkene], products: prod, cond: '?' },
    promptHtml: `Which reagent turns ${nm || 'the alkene'} into the product shown?`,
    prompt: 'Which reagent makes this product?',
    options: opts, answer: opts.find((o) => o.correct).text, alkene, reagent: r, products: prod,
    derive: `The product is ${PRODUCT_TEXT[REAGENTS2[r].kind]}: that is ${REAGENTS2[r].label}.`,
    hints: ['Compare the product with the alkene: what has been added (X, H, O, OH) or has the C=C been cut?', 'Then check the geometry: anti (trans) or syn (cis)? Remember: X₂ and (RCO₃H then H₃O⁺) are anti; H₂, RCO₃H alone and KMnO₄/OH⁻ are syn.']
  };
}

// ---------------------------------------------------------------- 5. polymers
function polymerProblem(rng) {
  const mono = pick(rng, MONOMERS);
  if (rng() < 0.6) {
    const ch = repeatChoices(mono.smiles);
    const opts = shuffle(rng, ch).map((o, i) => ({ smiles: o.smiles, text: 'Option ' + LETTERS[i], correct: o.correct, why: o.why, kind: o.kind }));
    return {
      kind: 'choice', skill: 'polymers', smiles: mono.smiles, reaction: null,
      prompt: `${mono.name[0].toUpperCase() + mono.name.slice(1)} (shown) is polymerised by a radical initiator. Which drawing is the REPEAT UNIT of ${mono.polymer}? (The * marks show where the unit continues in the chain.)`,
      options: opts, answer: opts.find((o) => o.correct).text, monomer: mono.id, unit: repeatUnit(mono.smiles),
      derive: `Open the C=C: each carbon forms a single bond to the next unit. Repeat unit: ${repeatUnit(mono.smiles)}.`,
      deriveHtml: `Open the C=C: each carbon forms a single bond to the next unit. Repeat unit: <mol smiles="${repeatUnit(mono.smiles)}"></mol>`,
      hints: ['In addition polymerisation nothing is lost: the repeat unit has exactly the atoms of the monomer.', 'The C=C becomes a C–C single bond, and each of its two carbons also bonds to a neighbouring unit in the chain (the * marks).']
    };
  }
  const unit = repeatUnit(mono.smiles);
  const others = shuffle(rng, MONOMERS.filter((m) => m !== mono)).slice(0, 3);
  const opts = shuffle(rng, [mono, ...others]).map((m, i) => ({
    smiles: m.smiles, text: 'Option ' + LETTERS[i], correct: m === mono,
    why: m === mono ? 'Yes. Open its C=C and join the units: that gives the repeat unit shown.' : `This monomer gives ${m.polymer}, whose repeat unit carries a different group on the chain. Compare the groups on the two chain carbons.`
  }));
  return {
    kind: 'choice', skill: 'polymers', smiles: unit, reaction: null,
    prompt: 'The drawing above is the repeat unit of a polymer (the * marks show where it continues). Which monomer was it made from?',
    options: opts, answer: opts.find((o) => o.correct).text, monomer: mono.id, unit,
    derive: `Put the C=C back between the two chain carbons and remove the * bonds: ${mono.smiles} (${mono.name}).`,
    deriveHtml: `Put the C=C back between the two chain carbons and remove the * bonds: <mol smiles="${mono.smiles}" label="${mono.name}"></mol>`,
    hints: ['Find the two carbons that carry the * marks: they were the two carbons of the C=C.', 'Remove the * bonds and turn the C–C bond between those carbons back into C=C; what is left on the carbons stays.']
  };
}

const TASKS = { product: productProblem, trap: trapProblem, cleave: cleaveProblem, reagent: reagentProblem, polymer: polymerProblem };
const BY_SKILL = { 'stereo-addition': ['product'], 'alkene-oxidation': ['trap', 'cleave'], synthesis: ['reagent'], polymers: ['polymer'] };
export const ADD2_SKILLS = Object.keys(BY_SKILL);
export const ADD2_TASKS = Object.keys(TASKS);
export function makeAdditions2Problem(rng, task) {
  const f = TASKS[task];
  if (!f) throw new Error('unknown task ' + task);
  return f(rng);
}
export function generateAdditions2(count, { skill = null, rng = Math.random } = {}) {
  const tasks = skill && BY_SKILL[skill] ? BY_SKILL[skill] : ADD2_TASKS;
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeAdditions2Problem(rng, pick(rng, tasks)); tries++; } while (last && JSON.stringify([p.prompt, p.alkene, p.reagent, p.monomer]) === last && tries < 8);
    last = JSON.stringify([p.prompt, p.alkene, p.reagent, p.monomer]);
    out.push(p);
  }
  return out;
}
void LAB_ALKENES2;
