// Mixed "predict the product" drill (generator `predict-product`, skill tag `predict-product`). It reads the reaction hub (engine/reaction-hub.js): every hub card has an
// entry in DRILL below, which says which substrates go with that card and how to compute the answer. The answer is computed by the engines the lessons use
// (reactions.js, reactions-additions.js, reactions-alkynes.js, reactions-dienes.js, reactions-aromatic.js), never typed. The exception: the ten workbook B3.1 cards
// (Diels-Alder, Clemmensen, Birch, hydroborations, benzylic bromination, PCC, Cr(VI), amine in acid, desulfonation) have no engine model. Their entries are
// `fixed: true`: the right answer is the hub card's own example (read from the hub), and only the wrong answers are typed. The wrong options are the engines' own
// distractors (anti-Markovnikov, wrong orientation, syn for anti, unreacted, over-reacted, wrong reagent) plus a few small hand edits (nitro reduction, side chains, acetylides).
// Every wrong option is tagged with the hub's three facts: what adds ("adds"), where it adds ("where"), how it adds in space ("space"), and its `why` starts with the slip.
// tests/predict.mjs checks 200 generated problems (RDKit parse, one right answer, the engine product, the card's stereo) and every substrate x reagent pair of every card.
import { canon } from './chem.js';
import { HUB_CARDS, HUB_BY_ID } from './reaction-hub.js';
import { predict, productChoices } from './reactions.js';
import { predictAdd, productChoices2 } from './reactions-additions.js';
import { predictAlkyne, alkyneChoices, ALKYNE_RXN, acetylideOf, alkylateAcetylide } from './reactions-alkynes.js';
import { predictDiene, dieneChoices, dieneName } from './reactions-dienes.js';
import { predictEAS, predictSubst, easChoices, substChoices, easRightWhy, substRightWhy, oxidizeSideChain, hydrogenate, reduceNitro, EAS, halideText, BENZENE } from './reactions-aromatic.js';
import { mirror } from './stereo-graph.js';
import { nameAlkeneBoth } from './naming.js';
import { nameBothAny } from './naming-chain.js';
import { nameBothArene } from './naming-arene.js';

export const PREDICT_SKILLS = ['predict-product'];
const LETTERS = 'ABCD';
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const flat = (list) => list.flatMap((s) => s.split('.'));
const keyOf = (list) => flat(list).map((s) => canon(s)).sort().join('.');
const mirrorAll = (list) => list.map((s) => { try { return canon(mirror(s)); } catch (e) { return s; } });

// ---------------------------------------------------------------- which wrong answer misses which fact
const FACT_OF = {
  hx: { anti: 'where', onlyOne: 'where', unchanged: 'adds', wrongAtom: 'adds', wrongAtom2: 'adds' },
  add: { wrongStereo: 'space', wrongHalogen: 'adds', diol: 'adds', epoxide: 'adds', alkane: 'adds', dihalide: 'adds', cleavage: 'adds', unchanged: 'adds' },
  alkyne: { anti: 'where', splitX: 'where', aldehyde: 'where', onlyOne: 'where', onlyOther: 'where', syn: 'space', trans: 'space' },
  diene: { only12: 'where', only14: 'where', nonallylic: 'where', unchanged: 'adds', wrongHalogen: 'adds' },
  subst: { opposite: 'where', partial: 'where', otherPlace: 'where', twice: 'adds', otherReagent: 'adds', addition: 'adds' },
  chain: { endOxidised: 'where', ringOnly: 'where', moved: 'where', tooFar: 'where', where: 'where' }
};
const factOf = (family, kind, over) => (over && over[kind]) || (FACT_OF[family] && FACT_OF[family][kind]) || 'adds';
const SLIP = {
  adds: 'Slip on WHAT adds: this answer has the wrong atoms or groups, or the wrong number of them, for this reagent.',
  where: 'Slip on WHERE it adds: the new groups ended up on the wrong carbons (or the wrong ring positions).',
  space: 'Slip on HOW it adds in space: the atoms are right, but the two new groups sit on the wrong faces (syn instead of anti, or the other way round).'
};
const SPACE_LINE = {
  syn: 'syn: both new groups arrive on the same face',
  anti: 'anti: the two new groups arrive on opposite faces',
  either: 'either face: the cation is flat, so the new group can arrive on either face',
  'n.a.': 'there is no stereochemistry to show here'
};

// ---------------------------------------------------------------- names for the prompt
const PLAIN = { 'C=Cc1ccccc1': 'styrene', 'C#Cc1ccccc1': 'phenylacetylene', 'CC=Cc1ccccc1': 'prop-1-enylbenzene', 'C=CCc1ccccc1': 'allylbenzene' };
function nameTag(smiles, fam) {
  if (PLAIN[smiles]) return PLAIN[smiles];
  let n = null;
  try {
    if (fam === 'alkene') n = nameAlkeneBoth(smiles);
    else if (fam === 'alkyne') n = nameBothAny(smiles);
    else if (fam === 'diene') n = dieneName(smiles) || nameBothAny(smiles);
    else n = nameBothArene(smiles) || nameBothAny(smiles);
  } catch (e) { n = null; }
  return n && n.new ? `<name new="${n.new}" old="${n.old || n.new}"></name>` : null;
}

// ---------------------------------------------------------------- families: each returns {label, choices:[{smiles:[...], correct, kind, why}], family, racemic}
function solveHX(sub, v) {
  const pred = predict(sub, v.id);
  if (pred.outcome === 'mixture') throw new Error('excluded: a mixture');
  return { label: v.label, family: 'hx', racemic: false, choices: productChoices(pred, { n: 12 }), products: pred.products };
}
const FLIP = { 'C/C=C/C': 'C/C=C\\C', 'C/C=C\\C': 'C/C=C/C', 'C/C=C/CC': 'C/C=C\\CC' };
function solveAdd(sub, v) {
  const pred = predictAdd(sub, v.id);
  const choices = productChoices2(pred, { n: 12 });
  // epoxide: the O goes on one face, so the C=C geometry is kept. The wrong-space answer is the epoxide of the OTHER geometry (acyclic alkenes only).
  if (pred.kind === 'epoxide' && FLIP[sub]) {
    const other = predictAdd(FLIP[sub], v.id);
    choices.splice(1, 0, { kind: 'wrongStereo', correct: false, smiles: other.products, why: 'The O is delivered to one face of the C=C, so the geometry of the alkene is kept: a trans alkene gives a trans epoxide and a cis alkene gives a cis epoxide. This answer has the other geometry.' });
  }
  return { label: v.label, family: 'add', racemic: !!pred.racemic, choices, products: pred.products, rel: pred.rel };
}
function solveAlkyne(sub, v) {
  const pred = predictAlkyne(sub, v.id);
  if (pred.outcome !== 'single') throw new Error('excluded: a mixture');
  return { label: v.label, family: 'alkyne', racemic: false, choices: alkyneChoices(pred, { n: 12 }), products: pred.products, stereo: pred.stereo, facts: pred.rx.kind === 'pd' ? { trans: 'adds' } : null };
}
function solveDiene(sub, v) {
  const pred = predictDiene(sub, v.id);
  return { label: v.label + ' (1 equiv.)', family: 'diene', racemic: false, choices: dieneChoices(pred, { n: 12 }), products: pred.products };
}

/** Aromatic substitution: benzene (one product, no position question) or a substituted ring (positions matter). `halide` for Friedel-Crafts. */
function solveArene(sub, v, rng) {
  const halide = v.halide || null;
  const can = canon(sub);
  const label = v.halide ? `${halideText(halide)}, AlCl₃` : EAS[v.id].label;
  if (can === BENZENE) {
    const pred = predictEAS(sub, v.id, halide);
    if (!pred.ok) throw new Error('excluded: ' + pred.why);
    return { label, family: 'subst', racemic: false, choices: easChoices(pred, rng), products: pred.products };
  }
  const pred = predictSubst(sub, v.id, halide);
  if (!pred.ok) throw new Error('excluded: ' + pred.why);
  const choices = substChoices(pred);
  // the product of another electrophile at the same ring: the wrong group went on
  const others = ['Br2', 'HNO3', 'SO3', 'Cl2'].filter((x) => x !== v.id);
  for (const x of others) {
    const q = predictSubst(sub, x, null);
    if (q.ok && q.products.join() !== pred.products.join()) {
      choices.push({ kind: 'otherReagent', correct: false, smiles: q.products, why: `That ring carries ${q.group === 'Br' ? 'Br' : q.group === 'Cl' ? 'Cl' : q.group === '[N+](=O)[O-]' ? 'NO₂' : q.group === 'S(=O)(=O)O' ? 'SO₃H' : 'a different group'}, the group ${EAS[x].label} puts on. The reagent here supplies ${pred.Elabel}, so a different group goes on the ring.` });
      break;
    }
  }
  choices.find((c) => c.correct).why = substRightWhy(pred);
  return { label, family: 'subst', racemic: false, choices, products: pred.products };
}
const solveFC = (sub, v, rng) => solveArene(sub, v, rng);

/** KMnO4 on a side chain. */
const OX_END = { 'CCc1ccccc1': 'OC(=O)Cc1ccccc1', 'CCCc1ccccc1': 'OC(=O)CCc1ccccc1' };
function solveSideOx(sub) {
  const r = oxidizeSideChain(sub);
  if (!r.ok) throw new Error('excluded');
  const out = [{ smiles: [r.product], correct: true, kind: 'major', why: 'Yes. ' + r.why }];
  const add = (smi, why, kind) => { if (smi && canon(smi) && !out.some((o) => keyOf(o.smiles) === keyOf([smi]))) out.push({ smiles: [smi], correct: false, kind, why }); };
  if (r.reacts) {
    add(sub, 'Nothing happens only when the benzylic carbon has no H. Here it has one (or more), so KMnO₄ oxidises that group.', 'unchanged');
    if (OX_END[sub]) add(OX_END[sub], 'The oxidation starts on the benzylic carbon (the carbon bonded to the ring), not at the far end of the chain. The rest of the chain is cut off, so the acid sits right on the ring.', 'endOxidised');
    if (canon(r.product) !== canon('OC(=O)c1ccccc1')) add('OC(=O)c1ccccc1', 'Other groups on the ring (a halogen, a nitro group) survive KMnO₄, so the product keeps them.', 'groupLost');
    else add('OC(=O)C1CCCCC1', 'The ring is not reduced by KMnO₄ (an oxidant): it stays aromatic.', 'ringSaturated');
  } else {
    add('OC(=O)c1ccccc1', 'tert-Butyl has no H on its benzylic carbon, so the oxidation cannot start and the group is not cut off.', 'trap');
    add('OC(=O)C(C)(C)c1ccccc1', 'That would need a C–H bond on the benzylic carbon to be broken. The benzylic carbon of tert-butyl has four C–C bonds and no H.', 'tooFar');
    add('CC(C)(C)C1CCCCC1', 'KMnO₄ is an oxidant. It does not add H₂ to the ring.', 'ringSaturated');
  }
  return { label: 'KMnO₄, H₂O (heat)', family: 'chain', racemic: false, choices: out, products: [r.product] };
}

/** Fe (or Sn), H3O+ then HO-: NO2 to NH2. Extras per substrate are hand-written and parsed by the tests. */
const NITRO = {
  'O=[N+]([O-])c1ccccc1': { ringSat: 'NC1CCCCC1' },
  'Cc1ccc(cc1)[N+](=O)[O-]': { ringSat: 'CC1CCC(N)CC1', moved: 'Cc1cccc(N)c1' },
  'Clc1ccc(cc1)[N+](=O)[O-]': { ringSat: 'NC1CCC(Cl)CC1', moved: 'Nc1cccc(Cl)c1' },
  'Cc1cccc(c1)[N+](=O)[O-]': { ringSat: 'CC1CCCC(N)C1', moved: 'Cc1ccc(N)cc1' }
};
function solveNitro(sub) {
  const prod = reduceNitro(sub);
  if (!prod) throw new Error('excluded');
  const X = NITRO[sub];
  const out = [{ smiles: [prod], correct: true, kind: 'major', why: 'Yes. Fe (or Sn, SnCl₂) with H₃O⁺, then HO⁻, turns NO₂ into NH₂ on the same ring carbon and leaves the ring alone.' }];
  out.push({ smiles: [canon(sub)], correct: false, kind: 'unchanged', why: 'That is the starting material. Fe with H₃O⁺ is a reducing mix: it does reduce the nitro group.' });
  if (X && X.ringSat) out.push({ smiles: [X.ringSat], correct: false, kind: 'ringSaturated', why: 'That also reduces the ring. Fe with H₃O⁺ only reduces the NO₂ group. The ring needs H₂ with Pt at high pressure.' });
  if (X && X.moved) out.push({ smiles: [X.moved], correct: false, kind: 'moved', why: 'The NH₂ stays on the carbon that held the NO₂. The reduction changes the group, it does not move it round the ring.' });
  return { label: 'Fe, H₃O⁺, then HO⁻', family: 'chain', racemic: false, choices: out, products: [prod] };
}

/** H2, Pd/C (1 atm) on a ring with a C=C or C≡C in the side chain. */
const HYD_RING_ONLY = { 'C=Cc1ccccc1': 'C=CC1CCCCC1', 'C#Cc1ccccc1': 'C#CC1CCCCC1', 'CC=Cc1ccccc1': 'CC=CC1CCCCC1', 'C=CCc1ccccc1': 'C=CCC1CCCCC1' };
function solveSideH2(sub) {
  const r = hydrogenate(sub, 'H2_Pd');
  if (!r.ok || !r.reacts) throw new Error('excluded');
  const rP = hydrogenate(sub, 'H2_Pt_high');
  const out = [{ smiles: [r.product], correct: true, kind: 'major', why: 'Yes. H₂ with Pd/C at ordinary pressure adds to the C=C or C≡C outside the ring and leaves the benzene ring alone.' }];
  const add = (smi, why, kind) => { if (smi && canon(smi) && !out.some((o) => keyOf(o.smiles) === keyOf([smi]))) out.push({ smiles: [smi], correct: false, kind, why }); };
  if (rP.ok) add(rP.product, 'That reduces the ring as well. Pd/C at ordinary pressure does not touch a benzene ring. Ring reduction needs Pt (or Rh) and high pressure.', 'ringToo');
  add(HYD_RING_ONLY[sub], 'The ring is the part that does NOT react with H₂ and Pd/C. The multiple bond outside the ring is reduced instead.', 'ringOnly');
  add(canon(sub), 'The multiple bond outside the ring is hydrogenated easily by H₂ and Pd/C, so the starting material does not survive.', 'unchanged');
  if (sub === 'C#Cc1ccccc1') add('C=Cc1ccccc1', 'Pd/C does not stop at the alkene (only the Lindlar catalyst does). An alkyne goes all the way to the alkane.', 'stopsEarly');
  return { label: 'H₂, Pd/C (1 atm)', family: 'chain', racemic: false, choices: out, products: [r.product] };
}

/** NaNH2, then R-Br: a longer alkyne. */
function solveAcetylide(sub, v) {
  const prod = alkylateAcetylide(acetylideOf(sub), v.halide);
  const out = [{ smiles: [prod], correct: true, kind: 'major', why: 'Yes. NaNH₂ removes the terminal ≡C–H, and the acetylide anion attacks the alkyl bromide, so the chain grows by the carbons of R–Br.' }];
  const add = (smi, why, kind) => { if (smi && canon(smi) && !out.some((o) => keyOf(o.smiles) === keyOf([smi]))) out.push({ smiles: [smi], correct: false, kind, why }); };
  // the alkyl group on the carbon NEXT to the triple bond: that C–H is far too weak an acid for NaNH2
  const m = /^(C+)C#C$/.exec(sub);
  const k = m ? m[1].length : 0;
  if (k >= 1) add(canon(`C#CC(${v.halide.replace('Br', '')})${'C'.repeat(k - 1)}`), 'NaNH₂ only removes the H on the triple bond (the ≡C–H, pKa about 25). A C–H on the carbon next to it is far less acidic, so the new group goes on the triple-bond carbon, not here.', 'where');
  // a different R group: the one that comes from another alkyl bromide
  const otherH = ['CBr', 'CCBr', 'CCCBr'].filter((x) => x !== v.halide);
  for (const x of otherH) { const q = alkylateAcetylide(acetylideOf(sub), x); add(q, `The group that adds is the R of the alkyl bromide you were given. This chain carries the R of ${halideLabel(x)} instead.`, 'wrongR'); }
  add(canon(sub), 'That is the starting alkyne. NaNH₂ with R–Br builds a longer chain: the acetylide attacks R–Br.', 'unchanged');
  return { label: `NaNH₂, then ${halideLabel(v.halide)}`, family: 'chain', racemic: false, choices: out, products: [prod] };
}
const halideLabel = (x) => ({ CBr: 'CH₃Br', CCBr: 'CH₃CH₂Br', CCCBr: 'CH₃CH₂CH₂Br' }[x] || x);

// ---------------------------------------------------------------- the drill: one entry per hub card. `ex` = index of the variant the hub card's own example uses.
const V = (id, label, extra = {}) => ({ id, label, ...extra });
const HX_POOL = ['CC=C', 'CC(C)=C', 'CCCC=C', 'CCC(C)=C', 'CC=C(C)C', 'CC1=CCCCC1'];
const MONO_ANY = ['c1ccccc1', 'Cc1ccccc1', 'Clc1ccccc1', 'O=[N+]([O-])c1ccccc1', 'OC(=O)c1ccccc1', 'CCc1ccccc1'];
const FC_RINGS = ['c1ccccc1', 'Cc1ccccc1', 'Clc1ccccc1', 'CCc1ccccc1', 'COc1ccccc1'];
const ALKYNE_T = ['CC#C', 'CCC#C', 'CCCC#C', 'CCCCC#C'];
const ALKYNE_X = ['CC#CC', 'CCC#CCC', 'CCCC#C', 'CCCCC#C', 'CCCC#CCCC'];
const STEREO_RING = ['C1=CCCC1', 'C1=CCCCC1', 'CC1=CCCCC1', 'C/C=C/C', 'C/C=C\\C', 'C/C=C/CC'];

// ---------------------------------------------------------------- fixed-answer cards (workbook B3.1): no engine model, so the right answer is the hub card's own example
// (card.example, then card.example2), read from the hub so the fact lives once. The wrong answers are typed here, each tagged with the fact it misses.
// tests/predict.mjs checks that the right option equals the card's example product, that every drawing parses (JS and Python RDKit) and that all options differ.
const W = (smiles, kind, fact, why) => ({ smiles, kind, fact, why });
const FIXED = {
  'diels-alder': { fam: 'diene', racemic: true, items: [{
    label: 'heat', subText: 'The diene and the dienophile drawn below',
    right: 'The diene ends (C1 and C4) bond to the two dienophile carbons and close a six-membered ring. The new C=C sits between the old C2 and C3, and the CHO lands next to the CH₃: the "1,2" product.',
    wrong: [
      W('O=CC1CC(C)C=CC1', 'meta', 'where', 'The CHO and the CH₃ are 1,3 here: the diene end that carries the CH₃ bonded to the wrong dienophile carbon. A 1-substituted diene gives the "1,2" product.'),
      W('O=CC1C(C)CC=CC1', 'shifted', 'where', 'The new C=C is in the wrong place. It must sit between the old C2 and C3, right next to the carbon that holds the CH₃.'),
      W('O=CC1C(C)CCCC1', 'saturated', 'adds', 'A Diels–Alder adds no H atoms. The diene and the dienophile just join, and one C=C is left in the ring.')
    ] }] },
  'clemmensen': { fam: 'arene', items: [{
    label: 'Zn(Hg), HCl, heat',
    right: 'Zn(Hg) with HCl and heat reduces the C=O next to the ring all the way to CH₂. The O leaves and the ring is untouched.',
    wrong: [
      W('CC(O)c1ccccc1', 'alcohol', 'adds', 'The reduction goes all the way to CH₂. An alcohol (C–OH) would be only a partial reduction, and Clemmensen does not stop there.'),
      W('CC(=O)c1ccccc1', 'unchanged', 'adds', 'That is the starting ketone. Zn(Hg) with HCl is a strong reducing mix, so the C=O does not survive.'),
      W('CCC1CCCCC1', 'ringReduced', 'where', 'The ring is not reduced. Clemmensen reduces only the carbonyl next to the ring and leaves the benzene ring alone.')
    ] }] },
  'birch': { fam: 'arene', items: [{
    label: 'Na, liquid NH₃, EtOH',
    right: 'Birch puts H on two para ring carbons and leaves a 1,4-diene. The CO₂H (electron-withdrawing) sits on an sp³ carbon.',
    wrong: [
      W('OC(=O)C1C=CC=CC1', 'conjugated', 'where', 'That is a conjugated 1,3-diene. Birch gives the 1,4-diene: the two H atoms add para to each other, so the two C=C bonds are apart.'),
      W('OC(=O)C1=CCC=CC1', 'ewgOnSp2', 'where', 'Here the CO₂H sits on a C=C carbon. An electron-withdrawing group ends up on an sp³ carbon in the Birch product.'),
      W('OC(=O)C1CCCCC1', 'saturated', 'adds', 'That is the fully reduced ring. Birch adds only two H atoms and stops at the diene.')
    ] }, {
    label: 'Na, liquid NH₃, EtOH',
    right: 'Birch puts H on two para ring carbons and leaves a 1,4-diene. The OCH₃ (electron-donating) stays on a C=C carbon (sp²).',
    wrong: [
      W('COC1=CC=CCC1', 'conjugated', 'where', 'That is a conjugated 1,3-diene. Birch gives the 1,4-diene: the two H atoms add para to each other, so the two C=C bonds are apart.'),
      W('COC1C=CCC=C1', 'donorOnSp3', 'where', 'Here the OCH₃ sits on an sp³ carbon. An electron-donating group stays on a C=C carbon in the Birch product.'),
      W('COC1CCCCC1', 'saturated', 'adds', 'That is the fully reduced ring. Birch adds only two H atoms and stops at the diene.')
    ] }] },
  'alkyne-hydroboration': { fam: 'alkyne', items: [{
    label: '1) BH₃  2) H₂O₂, NaOH',
    right: 'B, and then OH, go on the END carbon (anti-Markovnikov). The enol tautomerises, so a terminal alkyne gives an aldehyde.',
    wrong: [
      W('CCCCC(C)=O', 'methylKetone', 'where', 'That is the methyl ketone. It comes from Hg²⁺ with H₂O, where the OH goes on the inner carbon. Hydroboration puts the OH on the END carbon.'),
      W('CCCCC=CO', 'enol', 'adds', 'An enol (C=C–OH) is only the intermediate. It tautomerises to the C=O, so it is not the product you isolate.'),
      W('CCCCCCO', 'alcohol', 'adds', 'That adds two extra H atoms. Hydroboration adds one H and one OH across the triple bond, and the enol then becomes the C=O.')
    ] }] },
  'alkene-hydroboration': { fam: 'alkene', racemic: true, items: [{
    label: '1) BH₃ · THF  2) H₂O₂, NaOH',
    right: 'The OH goes on the carbon with MORE H (anti-Markovnikov). H and OH add to the same face, so the OH ends up trans to the CH₃.',
    wrong: [
      W('CC1(O)CCCCC1', 'markovnikov', 'where', 'That is the Markovnikov alcohol, the one H₂O with H₂SO₄ gives. Hydroboration puts the OH on the carbon with MORE H.'),
      W('C[C@H]1CCCC[C@H]1O', 'cis', 'space', 'The atoms are right, but the OH is cis to the CH₃. H and OH add to the same face, so the OH ends up trans to the CH₃.'),
      W('CC1CCCCC1', 'alkane', 'adds', 'That only adds H₂. Hydroboration adds one H and one OH across the C=C.')
    ] }] },
  'benzylic-bromination': { fam: 'arene', racemic: true, items: [{
    label: 'NBS, heat (or Br₂, light)',
    right: 'A radical reaction puts Br on the benzylic carbon, the one bonded to the ring, because that radical is stabilised by the ring. It forms as a racemate.',
    wrong: [
      W('CCCc1ccc(Br)cc1', 'ring', 'where', 'That puts Br on the ring (para). Ring bromination needs Br₂ with FeBr₃. Light or NBS brominates the benzylic carbon instead.'),
      W('CC(Br)Cc1ccccc1', 'secondCarbon', 'where', 'Br went on the middle carbon of the chain. The benzylic radical is the stable one, so Br goes on the carbon bonded to the ring.'),
      W('BrCCCc1ccccc1', 'farEnd', 'where', 'Br went on the far end of the chain. Only the benzylic position is brominated, because that radical is stabilised by the ring.'),
      W('CCC(Br)(Br)c1ccccc1', 'twice', 'adds', 'Two Br atoms is too many. One equivalent of Br₂ or NBS replaces one benzylic H.')
    ] }] },
  'oxidation-pcc': { fam: 'arene', items: [{
    label: 'PCC, CH₂Cl₂',
    right: 'PCC takes two H from each alcohol that has an H on its carbon: the 1° OH becomes CHO (and stops there) and the 2° OH becomes a ketone.',
    wrong: [
      W('OC(=O)CCC(=O)c1ccccc1', 'acid', 'adds', 'That oxidises the aldehyde further, to the carboxylic acid. PCC in CH₂Cl₂ has no water, so a 1° alcohol stops at the aldehyde.'),
      W('O=C(CCCO)c1ccccc1', 'onlySecondary', 'where', 'Only the 2° OH was oxidised. PCC oxidises every 1° and 2° alcohol, so the 1° OH at the chain end must become CHO too.'),
      W('OC(CCC=O)c1ccccc1', 'onlyPrimary', 'where', 'Only the 1° OH was oxidised. The 2° alcohol next to the ring also loses two H and becomes a ketone.')
    ] }] },
  'oxidation-cr': { fam: 'arene', items: [{
    label: 'Na₂Cr₂O₇, H₂SO₄, H₂O',
    right: 'A 2° alcohol loses two H and becomes a ketone. It cannot go further, because there is no H left on that carbon.',
    wrong: [
      W('CC(O)c1ccccc1', 'unchanged', 'adds', 'That is the starting alcohol. Cr(VI) with H₂SO₄ is a strong oxidant, so a 2° alcohol is oxidised.'),
      W('OC(=O)c1ccccc1', 'cleaved', 'adds', 'That would need a C–C bond to be cut. Na₂Cr₂O₇ oxidises the C–OH carbon only and keeps the carbon skeleton.'),
      W('C=Cc1ccccc1', 'dehydrated', 'adds', 'That loses H₂O (a dehydration), which is not an oxidation. The oxidant takes two H from the alcohol carbon and keeps the O as C=O.')
    ] }, {
    label: 'Na₂Cr₂O₇, H₂SO₄, H₂O',
    right: 'In water, a 1° alcohol goes through the aldehyde and on to the carboxylic acid. Cr(VI) does not stop at the aldehyde (PCC does).',
    wrong: [
      W('CCCC=O', 'aldehyde', 'where', 'That is the aldehyde, where PCC stops. In water, Cr(VI) oxidises the aldehyde again, so the 1° alcohol ends as the acid.'),
      W('CCCCO', 'unchanged', 'adds', 'That is the starting alcohol. Cr(VI) with H₂SO₄ oxidises a 1° alcohol.'),
      W('CCC(=O)O', 'shorter', 'adds', 'The acid keeps all four carbons. Oxidation changes the CH₂OH into CO₂H and does not cut the chain.')
    ] }] },
  'amine-in-acid': { fam: 'arene', items: [{
    label: 'HNO₃, H₂SO₄',
    right: 'In strong acid the N is protonated to –NR₂H⁺, a meta director. The CH₃ directs ortho/para. The carbon ortho to the CH₃ is also meta to the N, so the NO₂ goes there.',
    wrong: [
      W('CN(C)c1ccc(C)cc1[N+](=O)[O-]', 'orthoToN', 'where', 'This puts the NO₂ ortho to the nitrogen, as a free –NR₂ (an ortho/para director) would. In strong acid the N is protonated and directs meta.'),
      W('CN(C)c1ccc(C)c([N+](=O)[O-])c1[N+](=O)[O-]', 'twice', 'adds', 'Two NO₂ groups is too many. The protonated amine deactivates the ring, so only one NO₂ goes on.'),
      W('CN(C)c1ccc(C)cc1', 'unchanged', 'adds', 'That is the starting material. HNO₃ with H₂SO₄ nitrates the ring, even though the –NR₂H⁺ group slows it down.')
    ] }] },
  'desulfonation': { fam: 'arene', items: [{
    label: 'D₂SO₄, D₂O, heat',
    right: 'Hot acid reverses sulfonation: D (from D₂SO₄ and D₂O) replaces the SO₃H on the same carbon, and nothing else on the ring moves.',
    wrong: [
      W('Cc1ccc(S(=O)(=O)O)cc1', 'unchanged', 'adds', 'That is the starting acid. Hot D₂SO₄ in D₂O runs sulfonation backwards, so the SO₃H is removed.'),
      W('Cc1ccccc1', 'plainH', 'adds', 'The SO₃H is gone, but the atom that replaces it is D, not H. D₂SO₄ in D₂O supplies D.'),
      W('Cc1cccc([2H])c1', 'moved', 'where', 'The D must go exactly where the SO₃H was (para to the CH₃). It does not end up on a different ring carbon.')
    ] }] }
};
/** A drill entry for a fixed-answer card: one substrate per hub example, the right answer read from the hub card, the wrong answers from FIXED. */
function fixedEntry(id) {
  const spec = FIXED[id], card = HUB_BY_ID[id];
  const exs = [card.example, card.example2].filter(Boolean);
  if (exs.length !== spec.items.length) throw new Error(`${id}: ${exs.length} hub examples but ${spec.items.length} drill items`);
  return {
    fam: spec.fam, fixed: true, subs: exs.map((e) => e.substrate), variants: [V('fixed', '')], ex: 0,
    solve: (sub) => {
      const i = exs.findIndex((e) => e.substrate === sub);
      if (i < 0) throw new Error(`${id}: ${sub} is not an example of the card`);
      const it = spec.items[i], products = exs[i].product.split('.');
      const choices = [{ smiles: products, correct: true, kind: 'major', why: 'Yes. ' + it.right }, ...it.wrong.map((w) => ({ smiles: [w.smiles], correct: false, kind: w.kind, why: w.why }))];
      return { label: it.label, subText: it.subText, family: 'fixed', racemic: !!spec.racemic, facts: Object.fromEntries(it.wrong.map((w) => [w.kind, w.fact])), choices, products };
    }
  };
}

export const DRILL = {
  'eas-bromination': { fam: 'arene', subs: MONO_ANY, variants: [V('Br2', ''), V('Cl2', '')], ex: 0, solve: (s, v, rng) => solveArene(s, v, rng) },
  'eas-nitration': { fam: 'arene', subs: MONO_ANY, variants: [V('HNO3', '')], ex: 0, solve: (s, v, rng) => solveArene(s, v, rng) },
  'eas-sulfonation': { fam: 'arene', subs: MONO_ANY, variants: [V('SO3', '')], ex: 0, solve: (s, v, rng) => solveArene(s, v, rng) },
  'fc-alkylation': { fam: 'arene', subs: FC_RINGS, variants: [V('RCl', '', { halide: 'CCCl' }), V('RCl', '', { halide: 'CCl' }), V('RCl', '', { halide: 'CC(C)Cl' }), V('RCl', '', { halide: 'CC(C)(C)Cl' })], ex: 0, solve: (s, v, rng) => solveFC(s, v, rng) },
  'fc-acylation': { fam: 'arene', subs: FC_RINGS, variants: [V('RCOCl', '', { halide: 'CC(=O)Cl' }), V('RCOCl', '', { halide: 'CCC(=O)Cl' })], ex: 0, solve: (s, v, rng) => solveFC(s, v, rng) },
  'director-activating': { fam: 'arene', subs: ['Cc1ccccc1', 'Oc1ccccc1', 'CCc1ccccc1', 'COc1ccccc1', 'Nc1ccccc1'], variants: [V('HNO3', '', { skip: ['Nc1ccccc1'] }), V('Br2', ''), V('Cl2', ''), V('SO3', '', { skip: ['Nc1ccccc1'] })], ex: 0, solve: (s, v, rng) => solveArene(s, v, rng) },
  'director-halogen': { fam: 'arene', subs: ['Clc1ccccc1', 'Brc1ccccc1', 'Fc1ccccc1'], variants: [V('HNO3', ''), V('Br2', ''), V('Cl2', ''), V('SO3', '')], ex: 0, solve: (s, v, rng) => solveArene(s, v, rng) },
  'director-meta': { fam: 'arene', subs: ['O=[N+]([O-])c1ccccc1', 'OC(=O)c1ccccc1', 'CC(=O)c1ccccc1', 'N#Cc1ccccc1', 'O=Cc1ccccc1', 'OS(=O)(=O)c1ccccc1'], variants: [V('Br2', ''), V('Cl2', ''), V('HNO3', ''), V('SO3', '')], ex: 0, solve: (s, v, rng) => solveArene(s, v, rng) },
  'side-chain-kmno4': { fam: 'arene', subs: ['Cc1ccccc1', 'CCc1ccccc1', 'CC(C)c1ccccc1', 'CC(C)(C)c1ccccc1', 'Cc1ccc(Cl)cc1', 'Cc1ccc(cc1)[N+](=O)[O-]'], variants: [V('KMnO4', 'KMnO₄, H₂O (heat)')], ex: 0, solve: (s) => solveSideOx(s) },
  'nitro-reduction': { fam: 'arene', subs: Object.keys(NITRO), variants: [V('Fe', 'Fe, H₃O⁺, then HO⁻')], ex: 0, solve: (s) => solveNitro(s) },
  'side-chain-h2pd': { fam: 'arene', subs: ['C=Cc1ccccc1', 'C#Cc1ccccc1', 'CC=Cc1ccccc1', 'C=CCc1ccccc1'], variants: [V('H2', 'H₂, Pd/C (1 atm)')], ex: 0, solve: (s) => solveSideH2(s) },

  'alkene-hx': { fam: 'alkene', subs: HX_POOL, variants: [V('HBr', 'HBr'), V('HCl', 'HCl')], ex: 0, solve: (s, v) => solveHX(s, v) },
  'alkene-hydration': { fam: 'alkene', subs: HX_POOL, variants: [V('H2O', 'H₂O, H₂SO₄ (cat.)')], ex: 0, solve: (s, v) => solveHX(s, v) },
  'alkene-x2': { fam: 'alkene', subs: STEREO_RING, variants: [V('Br2', 'Br₂, CH₂Cl₂'), V('Cl2', 'Cl₂, CH₂Cl₂')], ex: 0, solve: (s, v) => solveAdd(s, v) },
  'alkene-h2-pd': { fam: 'alkene', subs: ['CC1=C(C)CCCC1', 'CC1=C(C)CCC1', 'CC1=CCCCC1', 'CCCCC=C', 'C/C=C/C'], variants: [V('H2', 'H₂, Pd/C')], ex: 0, solve: (s, v) => solveAdd(s, v) },
  'alkene-kmno4-base': { fam: 'alkene', subs: ['C1=CCCCC1', 'C1=CCCC1', 'CC1=CCCCC1', 'C/C=C/C', 'C/C=C\\C', 'CC=C(C)C'], variants: [V('KMnO4_OH', 'KMnO₄, OH⁻, H₂O')], ex: 0, solve: (s, v) => solveAdd(s, v) },
  'alkene-kmno4-acid': { fam: 'alkene', subs: ['CC=C(C)C', 'CCCCC=C', 'C1=CCCCC1', 'CC1=CCCCC1', 'CC=C', 'CC/C=C/CC'], variants: [V('KMnO4_H', 'KMnO₄, H₃O⁺')], ex: 0, solve: (s, v) => solveAdd(s, v) },
  'alkene-epoxide': { fam: 'alkene', subs: ['C/C=C/CC', 'C/C=C/C', 'C/C=C\\C', 'C1=CCCCC1', 'CC1=CCCCC1', 'CC=C(C)C'], variants: [V('RCO3H', 'RCO₃H (e.g. mCPBA)')], ex: 0, solve: (s, v) => solveAdd(s, v) },
  'alkene-epoxide-diol': { fam: 'alkene', subs: ['C1=CCCCC1', 'C1=CCCC1', 'C/C=C/C', 'C/C=C\\C', 'CC1=CCCCC1'], variants: [V('RCO3H_H3O', 'RCO₃H, then H₃O⁺')], ex: 0, solve: (s, v) => solveAdd(s, v) },

  'alkyne-hx-1': { fam: 'alkyne', subs: ALKYNE_T.concat(['CCC#CCC']), variants: [V('HBr_1', ALKYNE_RXN.HBr_1.label), V('HCl_1', ALKYNE_RXN.HCl_1.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-hx-2': { fam: 'alkyne', subs: ALKYNE_T.concat(['CCC#CCC']), variants: [V('HBr_2', ALKYNE_RXN.HBr_2.label), V('HCl_2', ALKYNE_RXN.HCl_2.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-x2-1': { fam: 'alkyne', subs: ALKYNE_X, variants: [V('Br2_1', ALKYNE_RXN.Br2_1.label), V('Cl2_1', ALKYNE_RXN.Cl2_1.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-x2-2': { fam: 'alkyne', subs: ALKYNE_X, variants: [V('Br2_2', ALKYNE_RXN.Br2_2.label), V('Cl2_2', ALKYNE_RXN.Cl2_2.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-hydration': { fam: 'alkyne', subs: ['CC#C', 'CCC#C', 'CCCC#C', 'CCCCC#C', 'CCC#CCC', 'CC#CC'], variants: [V('H2O_Hg', ALKYNE_RXN.H2O_Hg.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-lindlar': { fam: 'alkyne', subs: ['CC#CC', 'CCC#CCC', 'CCCC#CCCC', 'CC#CCC', 'CCCC#C'], variants: [V('H2_Lindlar', ALKYNE_RXN.H2_Lindlar.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-h2-pd': { fam: 'alkyne', subs: ['CC#CC', 'CCCC#C', 'CCC#CCC', 'CCCC#CCCC'], variants: [V('H2_Pd', ALKYNE_RXN.H2_Pd.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-acetylide': { fam: 'alkyne', subs: ['CC#C', 'CCC#C', 'CCCC#C'], variants: [V('acetylide', '', { halide: 'CCBr' }), V('acetylide', '', { halide: 'CBr' }), V('acetylide', '', { halide: 'CCCBr' })], ex: 0, solve: (s, v) => solveAcetylide(s, v) },

  'diene-hx': { fam: 'diene', subs: ['C=CC=C', 'CC=CC=C', 'C=C(C)C=C', 'C1=CC=CCC1', 'C1=CC=CC1'], variants: [V('HBr', 'HBr'), V('HCl', 'HCl')], ex: 0, solve: (s, v) => solveDiene(s, v) }
};
// the ten workbook B3.1 cards: fixed answers (see FIXED above)
for (const id of Object.keys(FIXED)) DRILL[id] = fixedEntry(id);
export const DRILL_IDS = HUB_CARDS.filter((c) => DRILL[c.id]).map((c) => c.id);
/** Hub cards with no drill entry (none: the cards with an engine model use it, the ten B3.1 cards use fixed answers). */
export const DRILL_EXCLUDED = HUB_CARDS.filter((c) => !DRILL[c.id]).map((c) => c.id);
/** Every (card, substrate, reagent variant) triple. */
export function drillCombos() { return DRILL_IDS.flatMap((id) => DRILL[id].subs.flatMap((s) => DRILL[id].variants.filter((v) => !(v.skip || []).includes(s)).map((v, vi) => ({ card: id, sub: s, variant: v, vi })))); }

/** The engine answer for one combo (no randomness): {label, family, racemic, choices, products}. */
export function solveCard(cardId, sub, variant, rng = Math.random) { return DRILL[cardId].solve(sub, variant, rng); }

// ---------------------------------------------------------------- a problem from a solved combo
function finalize(card, entry, sub, v, S, rng) {
  const right = S.choices.find((c) => c.correct);
  const seen = new Set([keyOf(right.smiles)]);
  if (S.racemic) seen.add(keyOf(mirrorAll(flat(right.smiles))));   // the mirror image of a racemic product is also right
  const ds = [];
  for (const c of S.choices) {
    if (c.correct) continue;
    const k = keyOf(c.smiles);
    if (seen.has(k)) continue;
    seen.add(k);
    ds.push({ ...c, fact: factOf(S.family, c.kind, S.facts) });
  }
  if (ds.length < 2) return null;
  // up to three wrong answers: the interesting slips first (where, space), then what adds; the engine already ordered each group
  const by = { where: [], space: [], adds: [] };
  ds.forEach((d) => by[d.fact].push(d));
  const chosen = [];
  for (const f of shuffle(rng, ['where', 'space'])) if (by[f].length && chosen.length < 3) chosen.push(by[f].shift());
  while (chosen.length < 3 && by.adds.length) chosen.push(by.adds.shift());
  for (const f of ['where', 'space', 'adds']) while (chosen.length < 3 && by[f].length) chosen.push(by[f].shift());
  const rightSmiles = S.racemic && rng() < 0.5 ? mirrorAll(flat(right.smiles)) : flat(right.smiles);
  const opts = shuffle(rng, [{ ...right, smiles: rightSmiles, fact: null }, ...chosen]).map((o, i) => ({
    smiles: flat(o.smiles).join('.'), text: 'Option ' + LETTERS[i], correct: !!o.correct, kind: o.kind, fact: o.fact,
    why: o.correct ? o.why : `${SLIP[o.fact]} ${o.why}`
  }));
  const f = card.facts;
  const spaceText = SPACE_LINE[f.space];
  const spaceCap = spaceText[0].toUpperCase() + spaceText.slice(1);
  const nm = entry.fixed && sub.includes('.') ? null : nameTag(sub, entry.fam);
  const hasSpace = chosen.some((d) => d.fact === 'space');
  const rightWhy = String(right.why || '').replace(/^Yes\.\s*/, '');
  return {
    kind: 'choice', skill: 'predict-product', smiles: null, equation: { reactants: [sub], products: [], cond: S.label },
    promptHtml: `${nm || S.subText || 'The molecule drawn below'} + <b>${S.label}</b>. Which is the major product${flat(right.smiles).length > 1 ? ' (or products)' : ''}?${hasSpace ? ' Look at how the groups sit in space.' : ''}`,
    prompt: `${S.label}: which is the major product?`,
    options: opts, answer: opts.find((o) => o.correct).text,
    card: card.id, group: card.group, substrate: sub, reagent: v.id, halide: v.halide || null, products: S.products, racemic: S.racemic, family: S.family,
    worked: `1. What adds: ${f.adds}. 2. Where: ${f.where}. 3. In space: ${spaceText}. ${rightWhy}`,
    derive: `1. What adds: ${f.adds}. 2. Where: ${f.where}. 3. In space: ${spaceText}. ${rightWhy}`,
    hints: [
      `Start with the reagent (${card.reagent}). What adds? ${f.adds}. Check each drawing for exactly those atoms.`,
      `Where does it add? ${f.where}. How does it add in space? ${spaceCap}. Use both facts to rule out the other drawings.`
    ]
  };
}

/** The problem for one (card, substrate, reagent variant), or null when it has fewer than two usable wrong answers. For the tests. */
export function problemFor(cardId, sub, variant, rng = Math.random) {
  const entry = DRILL[cardId];
  return finalize(HUB_BY_ID[cardId], entry, sub, variant, entry.solve(sub, variant, rng), rng);
}

let lastCard = null, lastGroup = null;
/** One problem. `last` = {card, group} of the previous problem (never the same card twice in a row; the other group is preferred). */
export function makePredictProblem(rng, last = {}) {
  for (let tries = 0; tries < 300; tries++) {
    let cands = DRILL_IDS.filter((id) => id !== last.card);
    const off = cands.filter((id) => HUB_BY_ID[id].group !== last.group);
    if (off.length && rng() < 0.7) cands = off;
    const id = pick(rng, cands), entry = DRILL[id];
    const sub = pick(rng, entry.subs), v = pick(rng, entry.variants);
    if ((v.skip || []).includes(sub)) continue;
    let S;
    try { S = entry.solve(sub, v, rng); } catch (e) { continue; }
    const p = finalize(HUB_BY_ID[id], entry, sub, v, S, rng);
    if (p) return p;
  }
  throw new Error('no predict-product problem');
}

export function generatePredict(count, { skill = null, rng = Math.random } = {}) {
  const out = [];
  let last = { card: lastCard, group: lastGroup };
  for (let i = 0; i < count; i++) {
    const p = makePredictProblem(rng, last);
    out.push(p);
    last = { card: p.card, group: p.group };
  }
  lastCard = last.card; lastGroup = last.group;
  return out;
}
