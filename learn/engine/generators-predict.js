// Mixed "predict the product" drill (generator `predict-product`, skill tag `predict-product`). It reads the reaction hub (engine/reaction-hub.js): every hub card has an
// entry in DRILL below, which says which substrates go with that card and how to compute the answer. The answer is computed by the engines the lessons use
// (reactions.js, reactions-additions.js, reactions-alkynes.js, reactions-dienes.js, reactions-aromatic.js), never typed. The exception: the ten workbook B3.1 cards
// (Diels-Alder, Clemmensen, Birch, hydroborations, benzylic bromination, PCC, Cr(VI), amine in acid, desulfonation) have no engine model. Their entries are
// `fixed: true`: the right answer is the hub card's own example (read from the hub), and only the wrong answers are typed. The wrong options are the engines' own
// distractors (anti-Markovnikov, wrong orientation, syn for anti, unreacted, over-reacted, wrong reagent) plus a few small hand edits (nitro reduction, side chains, acetylides).
// The ten alkyl-halide cards (Chapter 7: SN2, SN1, E2, E1, Grignard, halides from alcohols) use engine/reactions-halides.js: the right answer is the engine product, the wrong answers are halideChoices().
// Every wrong option is tagged with the hub's three facts: what adds ("adds"), where it adds ("where"), how it adds in space ("space"), and its `why` starts with the slip.
// tests/predict.mjs checks 200 generated problems (RDKit parse, one right answer, the engine product, the card's stereo) and every substrate x reagent pair of every card.
import { canon } from './chem.js';
import { HUB_CARDS, HUB_BY_ID } from './reaction-hub.js';
import { predict, productChoices } from './reactions.js';
import { predictAdd, productChoices2 } from './reactions-additions.js';
import { predictAlkyne, alkyneChoices, ALKYNE_RXN, acetylideOf, alkylateAcetylide } from './reactions-alkynes.js';
import { predictDiene, dieneChoices, dieneName } from './reactions-dienes.js';
import { predictEAS, predictSubst, easChoices, substChoices, easRightWhy, substRightWhy, oxidizeSideChain, hydrogenate, reduceNitro, EAS, halideText, BENZENE } from './reactions-aromatic.js';
import { predictSN2, predictSN1, predictE2, predictE1, grignard, fromAlcohol, halideChoices, halideName, NUCLEOPHILES, BASES, HALIDE_BY_ID, E2_RING_POOL, ALCOHOLS } from './reactions-halides.js';
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
  chain: { endOxidised: 'where', ringOnly: 'where', moved: 'where', tooFar: 'where', where: 'where' },
  halide: { retention: 'space', racemic: 'space', oneEnantiomer: 'space', hofmann: 'where', notAnti: 'where', elim: 'where', subst: 'where', subst2: 'where', wrongNu: 'adds', wrongHalogen: 'adds', unchanged: 'adds', noD: 'adds', alcohol: 'adds', reagent: 'adds' }
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
  inversion: 'inversion: the new group comes in from the back, so a stereocentre flips',
  'n.a.': 'there is no stereochemistry to show here'
};

// ---------------------------------------------------------------- the specific first line of a wrong answer's feedback
// Each wrong option names the exact slip with the real atoms and groups of THIS problem ("Br went on the carbon with MORE H: anti-Markovnikov", "this is the syn product;
// Br₂ adds anti", "this adds HBr twice; one equivalent adds once"). The engine's longer explanation stays behind it as `more` (the drill shows it under "Why?").
// The generic "Slip on WHERE it adds ..." sentence is only the fallback for a kind that has no line here (tests/predict.mjs asserts there is none).
const first = (t) => String(t || '').split(/(?<=[.!?])\s+/)[0];
/** The specific first lines of the wrong answers on the alkyl-halide cards (family `halide`): each names the real atom, group or carbon of the problem. */
function halideLeads(S, label) {
  const P = S.pred || {};
  const hal = P.X || 'halogen';
  const Nu = P.nu ? NUCLEOPHILES[P.nu] : null;
  return {
    retention: () => `This keeps the configuration (retention). ${P.alcohol ? 'The reagent' : 'SN2'} attacks from the back, so the carbon inverts.`,
    racemic: () => 'This racemic pair would come from a flat carbocation (SN1). Here the carbon is attacked from the back in one step, so only one enantiomer forms.',
    elim: () => (P.alcohol ? 'This is an alkene: water was lost. The reagent replaces the OH by a halogen on the same carbon.' : P.mech === 'SN1' ? 'This is the alkene (E1). With a weak base the main path is substitution: the solvent bonds to the carbon.' : 'This is an alkene (a C=C): a β H was lost instead of the nucleophile attacking the carbon. The question asks for the substitution product.'),
    unchanged: () => (P.alcohol ? 'This is still the starting alcohol: the OH is still on the carbon. The reagent replaces it with a halogen.' : P.mech === 'E2' || P.mech === 'E1' ? `This is still the starting halide: the ${hal} is still on the carbon. The elimination removes it together with a β H.` : P.mech === 'Grignard' ? `This is still the starting halide: the ${hal} is still on the carbon. Mg inserts there, then D₂O gives D.` : `This is still the starting halide: the ${hal} is still on the carbon. The nucleophile replaces it.`),
    wrongNu: () => (P.mech === 'E2' ? `This is a halide exchange (a different halogen replaces the ${hal}), not an elimination: there is no C=C.` : `The group on the carbon is not the one in the reagent. ${label} puts ${Nu ? Nu.group : 'its own group'} on the carbon.`),
    oneEnantiomer: () => 'Only one enantiomer is drawn. The carbocation is flat, so the nucleophile reaches the carbon from either face and both enantiomers form.',
    hofmann: () => 'This is the less substituted alkene (fewer carbon groups on the C=C). Zaitsev: the more substituted C=C is the major product.',
    subst: () => (P.mech === 'E1' ? 'This is the SN1 product: the solvent bonded to the carbon. It forms beside the alkene, but the question asks for the E1 elimination product.' : 'This is the substitution product: OH or OR replaced the halogen on the carbon. A strong base takes a β H instead, so the product is an alkene.'),
    subst2: () => 'This is an ether: an OR group replaced the halogen on the carbon. The question asks for the elimination product, an alkene (C=C).',
    notAnti: () => 'This alkene needs the H on the CH₃ carbon, but that H is cis to the halogen. E2 needs an H trans to the halogen, so this alkene cannot form.',
    noD: () => 'This has an ordinary H where the D should be. D₂O gives D to the carbon; H₂O would give an H.',
    alcohol: () => 'This is an alcohol (an OH on the carbon). The Grignard reagent takes the D from D₂O; the OH of the water does not bond to the carbon.',
    reagent: () => 'This is the Grignard reagent itself, with Mg on the carbon. The D₂O then replaces the C–Mg bond with C–D.',
    wrongHalogen: () => `This carries the other halogen. The reagent is ${label}, so ${hal} is the atom that replaces the OH.`
  };
}
const GROUP_TEXT = { Br: 'Br', Cl: 'Cl', I: 'I', '[N+](=O)[O-]': 'NO₂', 'S(=O)(=O)O': 'SO₃H' };
const haloOf = (v) => (/Br/.test(v.id) ? 'Br' : /Cl/.test(v.id) ? 'Cl' : /(^|_)I/.test(v.id) ? 'I' : 'X');
function leadFor(card, entry, sub, v, S, o) {
  if (entry.fixed) return o.why;                                 // the ten fixed cards already say the concrete thing in their own words
  const X = haloOf(v), label = S.label, f = card.facts, adds = f.adds;
  const fam = S.family, kind = o.kind, id = card.id;
  const E = EAS[v.id];
  const grp = v.halide ? halideText(v.halide).replace(/Cl$/, '').replace(/^chlorocyclohexane$/, 'cyclohexyl') : E ? (GROUP_TEXT[E.group] || E.group) : '';
  const hxG = v.id === 'H2O' ? 'OH' : X;
  const sp = f.space;
  const T = {
    hx: {
      anti: () => `${hxG} went on the carbon with MORE H (the one with fewer alkyl groups): that is anti-Markovnikov. H must go to the carbon with more H.`,
      unchanged: () => `This is still the alkene: nothing added. ${v.id === 'H2O' ? 'H₂O' : 'H' + X} adds H and ${hxG} across the C=C.`,
      wrongAtom: () => (v.id === 'H2O' ? 'This is the alkane: two H added and no O. Water adds H and OH, so the product has an OH.' : `This carries a different halogen. The reagent is H${X}, so the atom that adds is ${X}, not the other halogen.`),
      wrongAtom2: () => (v.id === 'H2O' ? 'This has Br on the carbon: that is the HBr product. With water and an acid catalyst the group that adds is OH, not Br.' : `This carries a different halogen. The reagent is H${X}, so the atom that adds is ${X}, not the other halogen.`),
      onlyOne: () => `Only one product is drawn, but both C=C carbons carry the same number of alkyl groups, so both ${hxG} positions form (a mixture).`
    },
    add: {
      alkane: () => (id === 'alkene-x2' ? `This adds two H (the alkane). ${X}₂ puts one ${X} on EACH carbon of the C=C, no H.` : `This adds two H (the alkane). ${label} adds ${adds}, not just H₂.`),
      cleavage: () => 'The C=C is cut here, and that is hot or acidic KMnO₄. Cold, dilute KMnO₄ in base (OH⁻) leaves the C–C bond alone and each carbon gains an OH.',
      dihalide: () => `Two halogens added: that is Br₂ (or Cl₂), not ${label}. ${label} adds ${adds}.`,
      diol: () => `This has an OH on each carbon (a diol). ${label} ${id === 'alkene-kmno4-acid' ? 'cuts the C=C when it is hot or acidic, so the diol is not the product' : 'adds ' + adds}.`,
      epoxide: () => `This has an O bridging the two carbons (an epoxide). ${label} adds ${adds}, not an epoxide.`,
      unchanged: () => `The C=C is still there, so nothing added. ${label} adds ${adds}, which uses up the C=C.`,
      wrongHalogen: () => `This carries the other halogen. The reagent is ${X}₂, so ${X} is the atom that adds.`,
      wrongStereo: () => {
        if (id === 'alkene-epoxide') return 'This epoxide has the other geometry. The O joins one face of the C=C, so trans stays trans and cis stays cis.';
        const what = id === 'alkene-x2' ? `the two ${X}` : id === 'alkene-h2-pd' ? 'the two H' : 'the two OH';
        return sp === 'anti' ? `This is the syn product: ${what} sit on the SAME face. ${id === 'alkene-x2' ? X + '₂' : label} adds anti (opposite faces).`
          : `This is the anti product: ${what} sit on OPPOSITE faces. ${label} adds syn (the same face).`;
      }
    },
    alkyne: {
      aldehyde: () => 'The C=O is on the END carbon (anti-Markovnikov). Alkyne hydration puts the OH on the more substituted carbon, so a terminal alkyne gives a methyl ketone, never an aldehyde.',
      alkane: () => `This is the alkane (two H₂ added). ${label} ${id === 'alkyne-hydration' ? 'adds H and OH across the triple bond' : 'stops before the alkane'}.`,
      alkene: () => (id === 'alkyne-hydration' ? 'This alkene has no O. Hydration adds H and OH, so the product has a C=O (after the enol flips).' : 'This stops at the alkene. H₂ with Pd/C does not stop there: a second H₂ adds and the alkane forms.'),
      anti: () => `${X} went on the END carbon: that is anti-Markovnikov. H goes to the carbon that already has H, ${X} to the carbon with more alkyl groups.`,
      enol: () => 'This is the enol (C=C–OH). It flips to the ketone at once, so the ketone is the product you isolate.',
      ketone: () => `This has a C=O, so it is the hydration product. ${label} adds only H, no O.`,
      once: () => (id === 'alkyne-x2-2' ? `This has only one ${X}₂ added (a C=C is left). With 2 equivalents a second ${X}₂ adds across it.` : `This has only one ${X} (the vinylic halide, a C=C is left). With 2 equivalents a second H${X} adds across it.`),
      onceSyn: () => `This has only one ${X}₂ added (a C=C is left). With 2 equivalents a second ${X}₂ adds across it.`,
      splitX: () => `The two ${X} are on different carbons. The second H${X} adds Markovnikov too, so both ${X} end up on the SAME carbon (a geminal dihalide).`,
      syn: () => `Both ${X} are on the SAME side of the C=C (cis). ${X}₂ adds anti to an alkyne, so the two ${X} end up trans.`,
      tetra: () => `Four ${X} added: that is 2 equivalents of ${X}₂. With 1 equivalent only one ${X}₂ adds.`,
      trans: () => (id === 'alkyne-lindlar' ? 'This is the trans alkene. Lindlar adds both H on the SAME face (syn), so the alkene is cis (Z).' : 'This stops at the alkene. H₂ with Pd/C does not stop there: a second H₂ adds and the alkane forms.'),
      twice: () => `This has two ${X} on one carbon: it needs a SECOND H${X}. With 1 equivalent the reaction stops at the vinylic halide (one ${X}, a C=C left).`,
      unchanged: () => `This is still the alkyne: nothing added. ${label} uses up a π bond.`,
      vicinal: () => `This has ${X} on BOTH carbons: that is ${X}₂. H${X} adds one H and one ${X}.`,
      wrongAtom: () => `This carries a different halogen. The reagent is ${label}, so ${X} is the atom that adds.`,
      onlyOther: () => 'Only one ketone is drawn, but the alkyne is unsymmetrical, so OH can go to either triple-bond carbon and both ketones form (a mixture).'
    },
    chain: {
      endOxidised: () => 'The acid sits at the far end of the chain. KMnO₄ attacks the benzylic carbon (bonded to the ring) and cuts the rest off, so the CO₂H is on the ring.',
      groupLost: () => 'A group on the ring (Cl or NO₂) is missing. KMnO₄ oxidises only the side chain; a halogen or nitro group on the ring survives.',
      moved: () => 'The NH₂ is on a different ring carbon. It replaces the NO₂ on the SAME carbon; the ring positions do not change.',
      ringOnly: () => 'Only the ring was reduced. H₂ with Pd/C reduces the C=C or C≡C outside the ring and leaves the benzene ring alone.',
      ringSaturated: () => (id === 'nitro-reduction' ? 'The ring is saturated here. Fe with H₃O⁺ reduces only the NO₂ to NH₂ and leaves the ring aromatic.' : 'The ring is saturated here. KMnO₄ is an oxidant, so it does not add H to the ring: the ring stays aromatic.'),
      ringToo: () => 'The ring is reduced as well. Pd/C at ordinary pressure reduces only the C=C or C≡C outside the ring (ring reduction needs Pt and high pressure).',
      tooFar: () => 'A CO₂H on a carbon that still has four C–C bonds: tert-butyl has no benzylic H, so KMnO₄ cannot attack it and nothing like this forms.',
      trap: () => 'The side chain is cut off to CO₂H here, but tert-butyl has no H on its benzylic carbon, so KMnO₄ cannot start and the group stays.',
      unchanged: () => (id === 'nitro-reduction' ? 'The NO₂ is unchanged. Fe with H₃O⁺ reduces NO₂ to NH₂.' : id === 'side-chain-h2pd' ? 'The C=C or C≡C outside the ring is unchanged. H₂ with Pd/C adds H₂ to it.' : 'The side chain is unchanged. Its benzylic carbon has an H, so KMnO₄ oxidises it to CO₂H.'),
      where: () => 'The new carbon group is on the carbon next to the triple bond. NaNH₂ removes only the ≡C–H, so R attaches to the triple-bond carbon.',
      wrongR: () => `This has the wrong R group. The R that adds is the one in ${halideLabel(v.halide)}.`
    },
    halide: halideLeads(S, label),
    diene: {
      nonallylic: () => 'H went to an inner carbon, so the + is not next to the other C=C: no resonance, and that cation does not form. H goes to a terminal carbon.',
      only12: () => `Only the 1,2 product (${X} on C2) is drawn. The allylic cation puts + on C2 and C4, so ${X}⁻ can also attack C4 and the 1,4 product forms too.`,
      unchanged: () => `This is still the diene: nothing added. H${X} adds H and ${X} across one C=C.`,
      wrongHalogen: () => `This carries the other halogen. The reagent is H${X}, so ${X} is the atom that adds.`
    }
  };
  const t = T[fam] && T[fam][kind];
  if (t) return t();
  if (fam === 'subst') {
    const why = String(o.why || '');
    if (kind === 'opposite') { const m = /^(.*?\.)\s+(.*? director)[:.]/.exec(why); if (m) return `${m[1].replace('the group', grp)} ${m[2]}.`; }
    if (kind === 'partial') {
      if (/^Para forms/.test(why)) return `Only the para product is drawn, but an ortho/para director sends ${grp} ortho AND para, so both are made.`;
      const m = /atom of (.+?) in one carbocation/.exec(why);
      return `This puts ${grp} para to ${m ? m[1] : 'the group'}, but a meta director does not send the new group para.`;
    }
    if (kind === 'otherPlace') return first(why);
    if (kind === 'twice') return `This ring has TWO new groups. ${label} puts on only one ${grp}.`;
    if (kind === 'otherReagent') return `${first(why)} ${label} puts ${grp} on the ring.`;
    if (kind === 'addition') return `${grp} and ${grp} added across a C=C of the ring. Benzene keeps its ring: one ${grp} REPLACES one ring H.`;
  }
  return null;
}

// ---------------------------------------------------------------- names for the prompt
const PLAIN = { 'C=Cc1ccccc1': 'styrene', 'C#Cc1ccccc1': 'phenylacetylene', 'CC=Cc1ccccc1': 'prop-1-enylbenzene', 'C=CCc1ccccc1': 'allylbenzene' };
function nameTag(smiles, fam) {
  if (PLAIN[smiles]) return PLAIN[smiles];
  if (fam === 'halide') { const hn = halideName(smiles); return hn ? `<name new="${hn.new}" old="${hn.old}"></name>` : null; }
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

/** An alkyl-halide card (Chapter 7): the engine answers, halideChoices() gives the wrong answers. v.mech says which engine call. */
function solveHalide(sub, v) {
  let pred;
  switch (v.mech) {
    case 'SN2': pred = predictSN2(sub, v.id); break;
    case 'SN1': pred = predictSN1(sub, v.id); break;
    case 'E2': pred = predictE2(sub, v.id); break;
    case 'E1': pred = predictE1(sub); break;
    case 'Grignard': pred = grignard(sub); break;
    default: pred = fromAlcohol(sub, v.id);
  }
  const products = pred.mech === 'E2' || pred.mech === 'E1' ? pred.major : pred.mech === 'Grignard' ? [pred.protonolysis.D2O] : pred.products;
  if (products.length > 1 && !pred.racemic) throw new Error('excluded: a mixture');
  return { label: v.label, family: 'halide', racemic: !!pred.racemic, stereoDefined: !pred.racemic && products.some((x) => /@/.test(x)), choices: halideChoices(pred, { n: 12 }), products, pred };
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
  'Cc1cccc(c1)[N+](=O)[O-]': { ringSat: 'CC1CCCC(N)C1', moved: 'Cc1ccc(N)cc1' },
  // widened pool (each ring-saturated and moved-NH2 answer is written by hand and parsed by the tests)
  'Cc1ccccc1[N+](=O)[O-]': { ringSat: 'CC1CCCCC1N', moved: 'Cc1cccc(N)c1' },
  'Brc1ccc(cc1)[N+](=O)[O-]': { ringSat: 'NC1CCC(Br)CC1', moved: 'Nc1cccc(Br)c1' },
  'COc1ccc(cc1)[N+](=O)[O-]': { ringSat: 'COC1CCC(N)CC1', moved: 'COc1cccc(N)c1' },
  'Clc1ccccc1[N+](=O)[O-]': { ringSat: 'NC1CCCCC1Cl', moved: 'Nc1cccc(Cl)c1' },
  'CCc1ccc(cc1)[N+](=O)[O-]': { ringSat: 'CCC1CCC(N)CC1', moved: 'CCc1cccc(N)c1' },
  'Fc1ccc(cc1)[N+](=O)[O-]': { ringSat: 'NC1CCC(F)CC1', moved: 'Nc1cccc(F)c1' },
  'Brc1cccc(c1)[N+](=O)[O-]': { ringSat: 'NC1CCCC(Br)C1', moved: 'Nc1ccc(Br)cc1' },
  'OC(=O)c1ccc(cc1)[N+](=O)[O-]': { ringSat: 'NC1CCC(CC1)C(=O)O', moved: 'Nc1cccc(c1)C(=O)O' }
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
const HYD_RING_ONLY = { 'C=Cc1ccccc1': 'C=CC1CCCCC1', 'C#Cc1ccccc1': 'C#CC1CCCCC1', 'CC=Cc1ccccc1': 'CC=CC1CCCCC1', 'C=CCc1ccccc1': 'C=CCC1CCCCC1',
  'C=CCCc1ccccc1': 'C=CCCC1CCCCC1', 'CC#Cc1ccccc1': 'CC#CC1CCCCC1', 'C=C(C)c1ccccc1': 'C=C(C)C1CCCCC1' };
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
// The pools below were widened (Reaction modes, 2026-10): every substrate is accepted by the engines, and tests/predict.mjs and tests/reaction-modes.mjs
// recompute each (substrate, reagent) pair with the engines and with Python RDKit. The first entries of each pool are the original ones.
const uniq = (...lists) => [...new Set(lists.flat())];
const HX_POOL = ['CC=C', 'CC(C)=C', 'CCCC=C', 'CCC(C)=C', 'CC=C(C)C', 'CC1=CCCCC1',
  'C=C', 'CCC=C', 'CCCCC=C', 'CCCC(C)=C', 'CC(C)=C(C)C', 'CCC=C(C)C', 'CC=C(C)CC', 'C1=CCCC1', 'C1=CCCCC1', 'CC1=CCCC1', 'C=C1CCCC1', 'C=C1CCCCC1',
  'CC(C)CC=C', 'CCCCCC=C', 'C1=CCCCCC1', 'CCC(=C)CC', 'CC1=CCCCCC1'];
const DI_ACT_DEACT = ['Cc1cccc([N+](=O)[O-])c1', 'Cc1ccccc1[N+](=O)[O-]', 'Cc1cccc(C(=O)O)c1', 'Cc1ccccc1C(=O)O', 'Cc1cccc(C(C)=O)c1', 'Cc1ccccc1C(C)=O', 'Cc1cccc(C#N)c1', 'Cc1ccc(C=O)cc1', 'Cc1cccc(C=O)c1', 'Cc1ccc(S(=O)(=O)O)cc1',
  'Oc1cccc([N+](=O)[O-])c1', 'Oc1ccccc1[N+](=O)[O-]', 'Oc1ccc(C(=O)O)cc1', 'Oc1ccc(C(C)=O)cc1', 'Oc1ccc(C#N)cc1', 'Oc1ccc(C=O)cc1',
  'Cc1cccc(S(=O)(=O)O)c1', 'Cc1ccccc1S(=O)(=O)O', 'Oc1cccc(C(=O)O)c1', 'Oc1ccccc1C(=O)O', 'Oc1cccc(C(C)=O)c1', 'Oc1ccccc1C(C)=O'];
const DI_HAL_ACT = ['Cc1cccc(Cl)c1', 'Cc1ccccc1Cl', 'Cc1cccc(Br)c1', 'Cc1ccccc1Br', 'Cc1cccc(F)c1', 'Cc1ccccc1F', 'Oc1cccc(Cl)c1', 'Oc1ccccc1Cl', 'Oc1ccc(F)cc1'];
const DI_HAL_DEACT = ['Clc1ccccc1[N+](=O)[O-]', 'Brc1ccccc1[N+](=O)[O-]', 'Fc1ccc([N+](=O)[O-])cc1', 'Clc1ccc(C#N)cc1', 'Clc1ccc(C=O)cc1', 'Fc1ccc(C(C)=O)cc1', 'Brc1ccc(C(C)=O)cc1', 'Brc1ccc(C(=O)O)cc1', 'Clc1ccc(S(=O)(=O)O)cc1', 'Fc1ccc(C(=O)O)cc1', 'Fc1ccc(C#N)cc1'];
const MONO_ANY = ['c1ccccc1', 'Cc1ccccc1', 'Clc1ccccc1', 'O=[N+]([O-])c1ccccc1', 'OC(=O)c1ccccc1', 'CCc1ccccc1',
  'Brc1ccccc1', 'Fc1ccccc1', 'Ic1ccccc1', 'COc1ccccc1', 'Oc1ccccc1', 'CC(=O)c1ccccc1', 'O=Cc1ccccc1', 'N#Cc1ccccc1', 'CC(C)c1ccccc1', 'COC(=O)c1ccccc1', 'CC(=O)Nc1ccccc1', 'c1ccc(cc1)-c1ccccc1', 'Cc1ccc(C)cc1', 'Cc1ccc(Cl)cc1',
  'COc1ccc(C)cc1', 'Oc1ccc(C)cc1', 'Cc1ccc([N+](=O)[O-])cc1', 'Clc1ccc([N+](=O)[O-])cc1', 'Oc1ccc(Cl)cc1', 'Brc1ccc(C)cc1', 'Cc1ccc(C(=O)O)cc1', 'Clc1ccc(C(=O)O)cc1',
  ...DI_ACT_DEACT, ...DI_HAL_ACT, ...DI_HAL_DEACT];
// rings with two groups (the engines weigh the two directors: they cooperate, or the stronger activator wins; ties that give a mixture of different directions are refused)
const DI_ACT = ['Oc1ccc(C)cc1', 'Cc1ccccc1OC', 'Cc1cccc(C)c1', 'Oc1ccc(Cl)cc1', 'Oc1ccc(Br)cc1', 'Cc1ccc(Cl)cc1', 'Brc1ccc(C)cc1', 'Oc1ccc([N+](=O)[O-])cc1', 'Cc1ccc([N+](=O)[O-])cc1', 'Cc1ccc(C(=O)O)cc1', 'Cc1ccc(C(C)=O)cc1', 'Cc1ccc(C#N)cc1'];
const DI_HAL = ['Cc1ccc(Cl)cc1', 'Oc1ccc(Cl)cc1', 'Oc1ccc(Br)cc1', 'Clc1ccc([N+](=O)[O-])cc1', 'Brc1ccc([N+](=O)[O-])cc1', 'Clc1ccc(C(=O)O)cc1', 'Clc1ccc(C(C)=O)cc1', 'Brc1ccc(C#N)cc1'];
const DI_META = ['Brc1ccc([N+](=O)[O-])cc1', 'Clc1ccc(C(=O)O)cc1', 'Clc1ccc(C(C)=O)cc1', 'Brc1ccc(C#N)cc1', 'Cc1ccc(C(=O)O)cc1', 'Cc1ccc(C(C)=O)cc1', 'Cc1ccc(C#N)cc1', 'Oc1ccc([N+](=O)[O-])cc1', 'Fc1ccc(C=O)cc1', ...DI_ACT_DEACT, ...DI_HAL_DEACT];
const AMINES_FREE = ['Nc1ccccc1', 'CNc1ccccc1', 'CN(C)c1ccccc1'];   // nitration and sulfonation protonate these (amine in acid): the engine refuses them
const FC_RINGS = ['c1ccccc1', 'Cc1ccccc1', 'Clc1ccccc1', 'CCc1ccccc1', 'COc1ccccc1',
  'Brc1ccccc1', 'Fc1ccccc1', 'Ic1ccccc1', 'CC(C)c1ccccc1', 'c1ccc(cc1)-c1ccccc1', 'CCOc1ccccc1', 'Cc1ccc(C)cc1', 'Cc1ccc(Cl)cc1', 'COc1ccc(C)cc1', 'Clc1ccc(Cl)cc1', 'Cc1ccc(F)cc1'];
// alkyl halides: the pools are the engine's own (reactions-halides.js); every pair is checked by tests/predict.mjs and tests/halides.mjs
const hs = (...ids) => ids.map((i) => HALIDE_BY_ID[i].smiles);
const SN2_SUBS = hs('1-bromobutane', 'bromomethane', 'bromoethane', '1-bromopropane', '2-bromopropane', '2-bromobutane', '(R)-2-bromobutane', '(S)-2-bromobutane', '1-bromo-2-methylpropane', '1-chlorobutane', '1-iodopropane', '3-bromopentane', '2-bromopentane', '(R)-2-bromohexane', '(S)-2-bromohexane', 'bromocyclohexane', 'bromocyclopentane', 'benzyl bromide');
const SN1_SUBS = hs('2-bromo-2-methylpropane', '2-bromo-2-methylbutane', '2-chloro-2-methylpropane', '(R)-3-bromo-3-methylhexane', '1-bromo-1-methylcyclohexane', 'bromocyclohexane', '3-bromopentane', '2-bromopropane', 'benzyl bromide', 'allyl bromide', '1-bromo-1-phenylethane');
const E2_SUBS = hs('2-bromo-2-methylbutane', '2-bromobutane', '2-bromopentane', '1-bromo-1-methylcyclohexane', '3-bromopentane', '2-bromo-2-methylpropane', 'bromocyclohexane', '1-bromo-2-methylpropane', '2-chloro-2-methylpropane', '1-bromo-1-phenylethane', '2-bromopropane', 'bromocyclopentane');
const E1_SUBS = hs('2-bromo-2-methylpropane', '2-bromo-2-methylbutane', '2-chloro-2-methylpropane', '1-bromo-1-methylcyclohexane', '2-bromo-2-methylpentane', 'bromocyclohexane', '3-bromopentane', '2-bromopropane', '1-bromo-1-phenylethane');
const GRIGNARD_SUBS = hs('bromocyclohexane', 'bromoethane', '1-bromopropane', '2-bromopropane', '1-bromobutane', '1-chlorobutane', 'bromocyclopentane', 'bromobenzene', '2-bromo-2-methylpropane', '1-bromopropene', 'benzyl bromide');
const ALCOHOL_SUBS = ALCOHOLS.map((a) => a.smiles);
const TERTIARY_OH = ['CC(C)(C)O', 'CC1(O)CCCCC1', 'CCC(C)(C)O'], SECONDARY_OH = ['CCC(C)O', 'CCC[C@H](C)O', 'CCC[C@@H](C)O', 'OC1CCCCC1'];
const ALKYNE_T = ['CC#C', 'CCC#C', 'CCCC#C', 'CCCCC#C'];
const ALKYNE_TERM = uniq(ALKYNE_T, ['CCCCCC#C', 'CC(C)C#C', 'CC(C)CC#C', 'CC(C)(C)C#C', 'CCCCCCC#C', 'CC(C)CCC#C']);
const ALKYNE_SYM = ['CC#CC', 'CCC#CCC', 'CCCC#CCCC', 'CCCCC#CCCCC', 'CC(C)C#CC(C)C'];
const ALKYNE_UNSYM = ['CC#CCC', 'CC#CCCC', 'CCC#CCCC', 'CC#CC(C)C', 'CC#CCCCC', 'CCC#CC(C)C', 'CCCC#CC(C)C', 'CC#CCCCCC'];
const ALKYNE_X = uniq(['CC#CC', 'CCC#CCC', 'CCCC#C', 'CCCCC#C', 'CCCC#CCCC'], ALKYNE_TERM, ALKYNE_SYM, ALKYNE_UNSYM);
const STEREO_RING = ['C1=CCCC1', 'C1=CCCCC1', 'CC1=CCCCC1', 'C/C=C/C', 'C/C=C\\C', 'C/C=C/CC'];
// alkenes for the six stereo-aware cards (rings, E and Z, terminal and branched)
const STEREO_POOL = uniq(STEREO_RING, ['C1=CCCCCC1', 'CC1=C(C)CCCC1', 'CC1=C(C)CCC1', 'CC1=CCCC1', 'C/C=C\\CC', 'CC/C=C/CC', 'CC/C=C\\CC', 'CC=C', 'CC(C)=C', 'C=C', 'CC=C(C)C', 'CCCC=C', 'C=C1CCCCC1',
  'C/C=C/C(C)C', 'C/C=C\\C(C)C', 'CC/C=C/CCC', 'CC/C=C\\CCC', 'CCCCCC=C', 'CC(C)CC=C']);

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
    ] }] },
  // hot KMnO₄ on a C≡C (scene 21): no engine model either (reactions-alkynes.js has no oxidative cleavage), so a fixed answer like the B3.1 cards
  'alkyne-kmno4-hot': { fam: 'alkyne', items: [{
    label: 'KMnO₄, hot, H₃O⁺',
    right: 'Hot KMnO₄ cuts the C≡C right through. Neither carbon of the triple bond has an H, so each end becomes –CO₂H: two propanoic acids.',
    wrong: [
      W('CCC(=O)C(=O)CC', 'diketone', 'adds', 'That is the 1,2-diketone, only the halfway point. Hot KMnO₄ goes on and cuts the C–C between the two C=O, so each end becomes a carboxylic acid.'),
      W('CCCC(=O)CC', 'ketone', 'adds', 'That is the ketone from Hg²⁺ with H₂O (hydration). Hot KMnO₄ does not add water across the C≡C: it cuts it.'),
      W('CCC=O', 'aldehyde', 'adds', 'An aldehyde is not where it stops. Hot KMnO₄ oxidises each end all the way to the carboxylic acid, –CO₂H.'),
      W('CC(=O)O', 'shorter', 'where', 'The cut is at the C≡C, between C3 and C4, so each piece keeps three carbons. Acetic acid (two carbons) would need a different bond to break.')
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
  'fc-alkylation': { fam: 'arene', subs: FC_RINGS, variants: [V('RCl', '', { halide: 'CCCl' }), V('RCl', '', { halide: 'CCl' }), V('RCl', '', { halide: 'CC(C)Cl' }), V('RCl', '', { halide: 'CC(C)(C)Cl' }), V('RCl', '', { halide: 'ClC1CCCCC1' })], ex: 0, solve: (s, v, rng) => solveFC(s, v, rng) },
  'fc-acylation': { fam: 'arene', subs: FC_RINGS, variants: [V('RCOCl', '', { halide: 'CC(=O)Cl' }), V('RCOCl', '', { halide: 'CCC(=O)Cl' }), V('RCOCl', '', { halide: 'CCCC(=O)Cl' })], ex: 0, solve: (s, v, rng) => solveFC(s, v, rng) },
  'director-activating': { fam: 'arene', subs: ['Cc1ccccc1', 'Oc1ccccc1', 'CCc1ccccc1', 'COc1ccccc1', 'Nc1ccccc1', 'CC(C)c1ccccc1', 'CCOc1ccccc1', 'CC(=O)Nc1ccccc1', 'c1ccc(cc1)-c1ccccc1', 'CNc1ccccc1', 'CN(C)c1ccccc1', 'Cc1ccc(C)cc1', 'COc1ccc(C)cc1', ...DI_ACT, ...DI_ACT_DEACT, ...DI_HAL_ACT], variants: [V('HNO3', '', { skip: AMINES_FREE }), V('Br2', ''), V('Cl2', ''), V('SO3', '', { skip: AMINES_FREE })], ex: 0, solve: (s, v, rng) => solveArene(s, v, rng) },
  'director-halogen': { fam: 'arene', subs: ['Clc1ccccc1', 'Brc1ccccc1', 'Fc1ccccc1', 'Ic1ccccc1', 'Clc1ccc(Cl)cc1', 'Brc1ccc(Br)cc1', 'Fc1ccc(F)cc1', 'Brc1ccc(C)cc1', 'Cc1ccc(F)cc1', 'COc1ccc(Cl)cc1', 'COc1ccc(Br)cc1', ...DI_HAL, ...DI_HAL_ACT, ...DI_HAL_DEACT], variants: [V('HNO3', ''), V('Br2', ''), V('Cl2', ''), V('SO3', '')], ex: 0, solve: (s, v, rng) => solveArene(s, v, rng) },
  'director-meta': { fam: 'arene', subs: ['O=[N+]([O-])c1ccccc1', 'OC(=O)c1ccccc1', 'CC(=O)c1ccccc1', 'N#Cc1ccccc1', 'O=Cc1ccccc1', 'OS(=O)(=O)c1ccccc1', 'COC(=O)c1ccccc1', 'Clc1ccc(cc1)[N+](=O)[O-]', 'Cc1ccc(cc1)[N+](=O)[O-]', ...DI_META], variants: [V('Br2', ''), V('Cl2', ''), V('HNO3', ''), V('SO3', '')], ex: 0, solve: (s, v, rng) => solveArene(s, v, rng) },
  'side-chain-kmno4': { fam: 'arene', subs: ['Cc1ccccc1', 'CCc1ccccc1', 'CC(C)c1ccccc1', 'CC(C)(C)c1ccccc1', 'Cc1ccc(Cl)cc1', 'Cc1ccc(cc1)[N+](=O)[O-]', 'CCCc1ccccc1', 'CCCCc1ccccc1', 'Cc1ccc(C)cc1', 'Cc1ccc(Br)cc1', 'Cc1cccc(c1)[N+](=O)[O-]', 'Cc1ccccc1C', 'CCc1ccc(Cl)cc1', 'Cc1ccc(F)cc1'], variants: [V('KMnO4', 'KMnO₄, H₂O (heat)')], ex: 0, solve: (s) => solveSideOx(s) },
  'nitro-reduction': { fam: 'arene', subs: Object.keys(NITRO), variants: [V('Fe', 'Fe, H₃O⁺, then HO⁻')], ex: 0, solve: (s) => solveNitro(s) },
  'side-chain-h2pd': { fam: 'arene', subs: ['C=Cc1ccccc1', 'C#Cc1ccccc1', 'CC=Cc1ccccc1', 'C=CCc1ccccc1', 'C=CCCc1ccccc1', 'CC#Cc1ccccc1', 'C=C(C)c1ccccc1'], variants: [V('H2', 'H₂, Pd/C (1 atm)')], ex: 0, solve: (s) => solveSideH2(s) },

  'alkene-hx': { fam: 'alkene', subs: HX_POOL, variants: [V('HBr', 'HBr'), V('HCl', 'HCl')], ex: 0, solve: (s, v) => solveHX(s, v) },
  'alkene-hydration': { fam: 'alkene', subs: HX_POOL, variants: [V('H2O', 'H₂O, H₂SO₄ (cat.)')], ex: 0, solve: (s, v) => solveHX(s, v) },
  'alkene-x2': { fam: 'alkene', subs: STEREO_POOL,variants: [V('Br2', 'Br₂, CH₂Cl₂'), V('Cl2', 'Cl₂, CH₂Cl₂')], ex: 0, solve: (s, v) => solveAdd(s, v) },
  'alkene-h2-pd': { fam: 'alkene', subs: uniq(['CC1=C(C)CCCC1', 'CC1=C(C)CCC1', 'CC1=CCCCC1', 'CCCCC=C', 'C/C=C/C'], STEREO_POOL), variants: [V('H2', 'H₂, Pd/C')], ex: 0, solve: (s, v) => solveAdd(s, v) },
  'alkene-kmno4-base': { fam: 'alkene', subs: uniq(['C1=CCCCC1', 'C1=CCCC1', 'CC1=CCCCC1', 'C/C=C/C', 'C/C=C\\C', 'CC=C(C)C'], STEREO_POOL), variants: [V('KMnO4_OH', 'KMnO₄, cold, dilute, OH⁻')], ex: 0, solve: (s, v) => solveAdd(s, v) },
  'alkene-kmno4-acid': { fam: 'alkene', subs: uniq(['CC=C(C)C', 'CCCCC=C', 'C1=CCCCC1', 'CC1=CCCCC1', 'CC=C', 'CC/C=C/CC'], STEREO_POOL), variants: [V('KMnO4_H', 'KMnO₄, hot or acidic (H₃O⁺)')], ex: 0, solve: (s, v) => solveAdd(s, v) },
  'alkene-epoxide': { fam: 'alkene', subs: uniq(['C/C=C/CC', 'C/C=C/C', 'C/C=C\\C', 'C1=CCCCC1', 'CC1=CCCCC1', 'CC=C(C)C'], STEREO_POOL), variants: [V('RCO3H', 'RCO₃H (e.g. mCPBA)')], ex: 0, solve: (s, v) => solveAdd(s, v) },
  'alkene-epoxide-diol': { fam: 'alkene', subs: uniq(['C1=CCCCC1', 'C1=CCCC1', 'C/C=C/C', 'C/C=C\\C', 'CC1=CCCCC1'], STEREO_POOL), variants: [V('RCO3H_H3O', 'RCO₃H, then H₃O⁺')], ex: 0, solve: (s, v) => solveAdd(s, v) },

  'alkyne-hx-1': { fam: 'alkyne', subs: uniq(ALKYNE_T, ['CCC#CCC'], ALKYNE_TERM, ALKYNE_SYM),variants: [V('HBr_1', ALKYNE_RXN.HBr_1.label), V('HCl_1', ALKYNE_RXN.HCl_1.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-hx-2': { fam: 'alkyne', subs: uniq(ALKYNE_T, ['CCC#CCC'], ALKYNE_TERM, ALKYNE_SYM),variants: [V('HBr_2', ALKYNE_RXN.HBr_2.label), V('HCl_2', ALKYNE_RXN.HCl_2.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-x2-1': { fam: 'alkyne', subs: ALKYNE_X, variants: [V('Br2_1', ALKYNE_RXN.Br2_1.label), V('Cl2_1', ALKYNE_RXN.Cl2_1.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-x2-2': { fam: 'alkyne', subs: ALKYNE_X, variants: [V('Br2_2', ALKYNE_RXN.Br2_2.label), V('Cl2_2', ALKYNE_RXN.Cl2_2.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-hydration': { fam: 'alkyne', subs: uniq(['CC#C', 'CCC#C', 'CCCC#C', 'CCCCC#C', 'CCC#CCC', 'CC#CC'], ALKYNE_TERM, ALKYNE_SYM), variants: [V('H2O_Hg', ALKYNE_RXN.H2O_Hg.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-lindlar': { fam: 'alkyne', subs: uniq(['CC#CC', 'CCC#CCC', 'CCCC#CCCC', 'CC#CCC', 'CCCC#C'], ALKYNE_SYM, ALKYNE_UNSYM, ALKYNE_TERM), variants: [V('H2_Lindlar', ALKYNE_RXN.H2_Lindlar.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-h2-pd': { fam: 'alkyne', subs: uniq(['CC#CC', 'CCCC#C', 'CCC#CCC', 'CCCC#CCCC'], ALKYNE_SYM, ALKYNE_UNSYM, ALKYNE_TERM), variants: [V('H2_Pd', ALKYNE_RXN.H2_Pd.label)], ex: 0, solve: (s, v) => solveAlkyne(s, v) },
  'alkyne-acetylide': { fam: 'alkyne', subs: ALKYNE_TERM,variants: [V('acetylide', '', { halide: 'CCBr' }), V('acetylide', '', { halide: 'CBr' }), V('acetylide', '', { halide: 'CCCBr' })], ex: 0, solve: (s, v) => solveAcetylide(s, v) },

  // ---- alkyl halides (Chapter 7)
  'sn2-cn': { fam: 'halide', subs: SN2_SUBS, variants: [V('CN', 'NaCN', { mech: 'SN2' })], ex: 0, solve: (s, v) => solveHalide(s, v) },
  'sn2-i': { fam: 'halide', subs: SN2_SUBS.filter((x) => x !== 'CCCI'), variants: [V('I', 'NaI, acetone', { mech: 'SN2' })], ex: 0, solve: (s, v) => solveHalide(s, v) },
  'sn2-oh': { fam: 'halide', subs: SN2_SUBS, variants: [V('HO', 'NaOH (aqueous)', { mech: 'SN2' })], ex: 0, solve: (s, v) => solveHalide(s, v) },
  'sn2-rs': { fam: 'halide', subs: SN2_SUBS, variants: [V('MeS', 'NaSCH₃', { mech: 'SN2' })], ex: 0, solve: (s, v) => solveHalide(s, v) },
  'sn1-solvolysis': { fam: 'halide', subs: SN1_SUBS, variants: [V('H2O', 'H₂O, heat', { mech: 'SN1' }), V('MeOH', 'CH₃OH, heat', { mech: 'SN1' }), V('EtOH', 'CH₃CH₂OH, heat', { mech: 'SN1' })], ex: 0, solve: (s, v) => solveHalide(s, v) },
  'e2-zaitsev': { fam: 'halide', subs: E2_SUBS, variants: [V('KOH', BASES.KOH.label, { mech: 'E2' }), V('NaOEt', BASES.NaOEt.label, { mech: 'E2' }), V('NaOMe', BASES.NaOMe.label, { mech: 'E2' })], ex: 0, solve: (s, v) => solveHalide(s, v) },
  'e2-chair': { fam: 'halide', subs: E2_RING_POOL.map((r) => r.smiles), variants: [V('KOH', BASES.KOH.label, { mech: 'E2' })], ex: 0, solve: (s, v) => solveHalide(s, v) },
  'e1-heat': { fam: 'halide', subs: E1_SUBS, variants: [V('EtOH', 'CH₃CH₂OH, heat (E1 elimination only)', { mech: 'E1' }), V('H2O', 'H₂O, heat (E1 elimination only)', { mech: 'E1' })], ex: 0, solve: (s, v) => solveHalide(s, v) },
  'grignard-d2o': { fam: 'halide', subs: GRIGNARD_SUBS, variants: [V('grignard', 'Mg, ether; then D₂O', { mech: 'Grignard' })], ex: 0, solve: (s, v) => solveHalide(s, v) },
  'halide-from-alcohol': { fam: 'halide', subs: ALCOHOL_SUBS, variants: [V('PBr3', 'PBr₃', { mech: 'alcohol', skip: TERTIARY_OH }), V('SOCl2', 'SOCl₂ (pyridine)', { mech: 'alcohol', skip: TERTIARY_OH }), V('HBr', 'HBr', { mech: 'alcohol', skip: SECONDARY_OH }), V('HCl', 'HCl', { mech: 'alcohol', skip: SECONDARY_OH })], ex: 0, solve: (s, v) => solveHalide(s, v) },

  'diene-hx': { fam: 'diene', subs: ['C=CC=C', 'CC=CC=C', 'C=C(C)C=C', 'C1=CC=CCC1', 'C1=CC=CC1', 'CC=CC=CC', 'CC(C)=CC=C', 'C=C(C)C(C)=C'], variants: [V('HBr', 'HBr'), V('HCl', 'HCl')], ex: 0, solve: (s, v) => solveDiene(s, v) }
};
// the ten workbook B3.1 cards and hot KMnO₄ on an alkyne: fixed answers (see FIXED above)
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
  const opts = shuffle(rng, [{ ...right, smiles: rightSmiles, fact: null }, ...chosen]).map((o, i) => {
    const base = { smiles: flat(o.smiles).join('.'), text: 'Option ' + LETTERS[i], correct: !!o.correct, kind: o.kind, fact: o.fact };
    if (o.correct) return { ...base, why: o.why };
    const lead = leadFor(card, entry, sub, v, S, o);
    // `lead` = the one specific line; `more` = the engine's longer reason (the drill shows it under "Why?"); `why` = both, for the log and the weak-spot panel
    return lead ? { ...base, lead, more: lead === o.why ? '' : o.why, why: lead === o.why ? lead : `${lead} ${o.why}` } : { ...base, lead: null, more: o.why, why: `${SLIP[o.fact]} ${o.why}` };
  });
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
    card: card.id, group: card.group, substrate: sub, reagent: v.id, halide: v.halide || null, products: S.products, racemic: S.racemic, family: S.family, stereoDefined: !!S.stereoDefined,
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
  const seen = new Set();                                    // (card, substrate, reagent): never the same question twice in one set
  for (let i = 0; i < count; i++) {
    let p = null;
    for (let t = 0; t < 40; t++) { p = makePredictProblem(rng, last); if (!seen.has(`${p.card}|${p.substrate}|${p.reagent}|${p.halide || ''}`)) break; }
    seen.add(`${p.card}|${p.substrate}|${p.reagent}|${p.halide || ''}`);
    out.push(p);
    last = { card: p.card, group: p.group };
  }
  lastCard = last.card; lastGroup = last.group;
  return out;
}
