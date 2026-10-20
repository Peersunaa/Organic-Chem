// Lesson 09: Alkene additions I: HX, Markovnikov and hydration (McMurry ch. 4, sections 4.1 to 4.3).
// Original wording throughout; book problems are referenced by number only.
// Everything chemical is computed by engine/reactions.js (cations, their class, products, mechanisms); the tests recompute every structure,
// product and class shown here, and check the engine against Python RDKit and a hand-checked fixture. Energy numbers are illustrative.
// Mechanisms are getters, so they are built when the widget mounts (RDKit is ready by then), not when this file is imported.
import { buildMechanism, pathwayLevels } from '../engine/reactions.js';

// ---- the empty p orbital of a carbocation (inline, themed with currentColor)
const CATION_SVG = `<svg viewBox="0 0 270 214" role="img" aria-label="A carbocation carbon with three bonds in one plane and an empty p orbital above and below that plane" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:270px;max-width:100%;height:auto">
<polygon points="40,118 130,86 232,118 140,150" stroke-width="1" stroke-dasharray="3 4" opacity=".55"/>
<ellipse cx="135" cy="50" rx="17" ry="28" stroke-dasharray="5 4"/><ellipse cx="135" cy="186" rx="17" ry="28" stroke-dasharray="5 4"/>
<line x1="135" y1="118" x2="135" y2="98"/><line x1="135" y1="118" x2="81" y2="128"/><line x1="135" y1="118" x2="189" y2="128"/>
<g font-family="monospace" font-size="15" font-weight="700" fill="currentColor" stroke="none"><text x="145" y="123">C⁺</text><text x="62" y="140">R</text><text x="194" y="141">R</text><text x="143" y="100">R</text></g>
<g font-family="sans-serif" font-size="12" fill="currentColor" stroke="none"><text x="160" y="44">empty p orbital</text><text x="160" y="192">(no electrons in it)</text><text x="200" y="100">plane of the</text><text x="200" y="114">3 bonds</text></g></svg>`;

const opt = (text, correct, why) => ({ text, ...(correct ? { correct: true } : {}), why });
const pw3 = pathwayLevels(3, { R: 'alkene + HBr', I: '3° carbocation', P: 'alkyl bromide' });
const pw1 = pathwayLevels(1, { R: 'alkene + HBr', I: '1° carbocation', P: 'alkyl bromide' });
const mech = (alkene, reagent, hC, pC) => buildMechanism(alkene, reagent, hC, pC);

/** Move the correct option to a different place in each question (deterministic), so the right answer is not always first. */
function arrange(lesson) {
  // the caveman copies of the options (st.caveman.options, in the same order as options) move together with the options they belong to
  const place = (opts, k, cv) => { const n = opts.length, i = opts.findIndex((o) => o.correct); const [c] = opts.splice(i, 1); opts.splice(k % (opts.length + 1), 0, c); if (cv && cv.length === n) { const [d] = cv.splice(i, 1); cv.splice(k % (cv.length + 1), 0, d); } };
  lesson.steps.forEach((st, n) => {
    if (st.options && (st.type === 'predict' || st.type === 'choice')) place(st.options, n % st.options.length, st.caveman && st.caveman.options);
    if (st.type === 'worked') st.moves.forEach((m, k) => place(m.options, (n + k) % m.options.length, st.caveman && st.caveman.moves && st.caveman.moves[k] && st.caveman.moves[k].options));
  });
  return lesson;
}

export default arrange({
  id: '09', slug: 'alkene-additions-1', title: 'Alkene additions I: HX, Markovnikov & hydration', minutes: 28,
  chapter: 4, sections: ['4.1', '4.2', '4.3'],
  drawing: 'skeletal',
  goals: [
    'Predict where H and X go when HCl, HBr or HI add to an unsymmetrical alkene (Markovnikov’s rule), and when you get a mixture',
    'Explain the rule: the reaction runs through the more stable carbocation (flat, sp², empty p orbital; 3° > 2° > 1° > methyl)',
    'Draw the mechanisms of HBr addition and of acid-catalysed hydration, with the arrows going to the right carbon',
    'Work backwards: choose the alkene that gives a given alkyl halide or alcohol'
  ],
  steps: [
    {
      caveman: {"prompt":"HBr in ether + 2-methylpropene, (CH₃)₂C=CH₂. H on either C=C carbon: two products possible. Clue: HBr + propene, CH₃CH=CH₂, gives almost only 2-bromopropane (Br on middle carbon). Likely product here?","reveal":"Only 2-bromo-2-methylpropane. Two orientations possible, one formed: <b>regiospecific</b>. <b>Markovnikov’s rule</b>: in HX addition, H to carbon with fewer alkyl groups, X to more.","options":[{"why":"Yes. H to CH₂, Br on carbon with two CH₃. Only this product."},{"why":"Other orientation (H on carbon with CH₃ groups, Br on CH₂). Conceivable, not found."},{"why":"Mixture only if C=C carbons alike. Here one has two CH₃, other none: reaction chooses."},{"why":"π bond electron-rich (Lesson 08), attacks δ+ H: reaction occurs."}]}, // CAVEMAN
      id: 's01', type: 'predict', skill: 'markovnikov',
      prompt: 'HBr in ether adds to 2-methylpropene, (CH₃)₂C=CH₂. H could attach to either carbon of the C=C, so two products are conceivable. A clue from experiment: HBr adds to propene, CH₃CH=CH₂, to give almost only 2-bromopropane (Br on the middle carbon), and hardly any 1-bromopropane. By analogy, which product do you expect here?',
      equation: { reactants: ['CC(C)=C', 'Br'], products: [], cond: 'ether' },
      options: [
        opt('<mol smiles="CC(C)(C)Br" label="2-bromo-2-methylpropane"></mol>', true, 'Yes. H went to the CH₂ carbon and Br ended up on the carbon that carries two CH₃ groups. Only this product forms.'),
        opt('<mol smiles="CC(C)CBr" label="1-bromo-2-methylpropane"></mol>', false, 'This is the other orientation (H on the carbon with the CH₃ groups, Br on CH₂). It is conceivable, but it is not what is found: this reaction gives only one of the two.'),
        opt('Both products, in about equal amounts', false, 'You would get a mixture if the two C=C carbons were alike. Here one carbon has two CH₃ groups and the other has none, and the reaction chooses between them.'),
        opt('Nothing happens: alkenes do not react with acids', false, 'The C=C π bond is electron-rich (Lesson 08) and attacks the δ+ hydrogen of HBr, so a reaction does occur.')
      ],
      reveal: 'Only 2-bromo-2-methylpropane forms. When a reaction can give two orientations but gives just one, it is <b>regiospecific</b>. Chemists summarised many such results in <b>Markovnikov’s rule</b>: in HX addition, H goes to the C=C carbon with fewer alkyl groups, X to the carbon with more.'
    },
    {
      caveman: {"prompt":"HBr + 1-methylcyclohexene: H goes where?","reveal":"H to CH carbon, Br on carbon with CH₃: <b>1-bromo-1-methylcyclohexane</b>. Same as 2-methylpropene: H to carbon with more H.","options":[{"why":"Yes. Has H already. H to more H: + on carbon with CH₃ and two ring bonds."},{"why":"That carbon: no H, three alkyl groups. H goes to OTHER: more H."},{"why":"Carbons differ: CH₃, no H vs H. Reaction picks one."},{"why":"π bond above and below ring plane: CH₃ no block. HBr adds."}]}, // CAVEMAN
      id: 's02', type: 'predict', skill: 'markovnikov',
      prompt: 'HBr adds to 1-methylcyclohexene. Which carbon of the C=C receives the H?',
      smiles: 'CC1=CCCCC1', highlight: [1, 2],
      options: [
        opt('The CH carbon (one H, one ring neighbour)', true, 'Yes. That carbon has an H already. H goes where there are more H, which leaves the + charge on the carbon with the CH₃ and two ring bonds.'),
        opt('The carbon that holds the CH₃, since it is more substituted', false, 'That carbon has no H and three alkyl groups. The H goes to the OTHER carbon, the one with more H and fewer alkyl groups.'),
        opt('Either one, equally', false, 'The two carbons are not alike: one carries a CH₃ and no H, the other carries an H. The reaction picks one.'),
        opt('Neither: the CH₃ blocks the attack on the π bond', false, 'The π bond lies above and below the ring plane, where the CH₃ does not block it. HBr adds readily.')
      ],
      reveal: 'H goes to the CH carbon, and Br ends up on the carbon with the CH₃, giving <b>1-bromo-1-methylcyclohexane</b>. The pattern is the same as in 2-methylpropene: H to the carbon that already has more H.'
    },
    {
      caveman: {"prompt":"Why this orientation? Step 1 makes carbocation: carbon short of electrons; each carbon group on C⁺ lends some density. Rank four, MOST to LEAST stable.","worked":"Order: (CH₃)₃C⁺ (tertiary, three groups), (CH₃)₂CH⁺ (secondary), CH₃CH₂CH₂⁺ (primary), CH₃⁺ (none).","hints":["Count carbon groups on positive carbon.","Alkyl groups donate density to C⁺: more groups, more stable. Start with three."]}, // CAVEMAN
      id: 's03', type: 'try', skill: 'carbocations', widget: 'cation-rank',
      prompt: 'Why this orientation? Step 1 of the mechanism makes a carbocation. Think of a carbocation as a carbon short of electrons: every carbon group attached to the C⁺ can lend it a little electron density. Using that idea, rank these four from MOST stable to LEAST stable.',
      config: { items: [{ smiles: 'C[CH+]C', label: '(CH₃)₂CH⁺' }, { smiles: '[CH3+]', label: 'CH₃⁺' }, { smiles: 'C[C+](C)C', label: '(CH₃)₃C⁺' }, { smiles: 'CC[CH2+]', label: 'CH₃CH₂CH₂⁺' }] },
      confirm: 'Tertiary (3°) > secondary (2°) > primary (1°) > methyl. The more carbon groups on the positive carbon, the more stable the cation.',
      hints: ['Count the carbon groups attached to the positive carbon in each drawing. The structures differ in exactly that.', 'Alkyl groups donate electron density to the electron-poor C⁺, so more alkyl groups mean a more stable cation. Start with the one that has three.'],
      worked: 'Tap the cation whose C⁺ has three carbon groups first ((CH₃)₃C⁺, tertiary), then the one with two ((CH₃)₂CH⁺, secondary), then one (CH₃CH₂CH₂⁺, primary), and finally CH₃⁺, which has none.'
    },
    {
      caveman: {"html":"<p>Markovnikov: H⁺ adds to either carbon: two carbocations. More stable: lower, faster: wins. Cation 3° if C⁺ bonded to three carbons, 2° two, 1° one. H to carbon with more H: + on more substituted carbon (3°, 2° beat 1°). X⁻ bonds there.</p><p>Equal carbons: mixture.</p>"}, // CAVEMAN
      id: 's04', type: 'explain', skill: 'markovnikov',
      html: '<p><b>Why Markovnikov?</b> H⁺ can add to either carbon, making two different carbocations. The <b>more stable</b> one sits lower in energy and forms faster, so its path wins. A cation is <b>3°</b> if its C⁺ is bonded to three carbons, <b>2°</b> if two, <b>1°</b> if one. H goes to the carbon with more H, so the + lands on the more substituted carbon (3° or 2° beats 1°). X⁻ then bonds there.</p><p>Equally substituted carbons give a <b>mixture</b>.</p>'
    },
    {
      caveman: {"prompt":"Rotate. Left: <i>tert</i>-butyl cation, (CH₃)₃C⁺. Right: isobutane, (CH₃)₃CH. Shape around highlighted central carbon of CATION?","worked":"Cation carbon: three bonds, no lone pair: sp², planar (about 120°). Isobutane central carbon: four groups, tetrahedral (about 109.5°).","hints":["Groups on central carbon: bonded atoms + lone pairs.","Three groups, no lone pair: sp², 120°, flat. Four: sp³."],"options":[{"why":"Yes. C⁺: three groups: sp² (Lesson 02). Angles sum 360°, unlike tetrahedral isobutane."},{"why":"Tetrahedral needs four groups. Cation has three: sp², not sp³."},{"why":"Lone pair: eight electrons, carbanion. C⁺ has six, no lone pair."},{"why":"Linear (sp) needs two groups. Cation: three."}]}, // CAVEMAN
      id: 's05', type: 'choice', skill: 'carbocations',
      prompt: 'Rotate the models. Left: the <i>tert</i>-butyl cation, (CH₃)₃C⁺. Right: isobutane, (CH₃)₃CH, the same skeleton with an H on the central carbon. What shape do the groups around the highlighted central carbon of the CATION take?',
      visual: { widget: 'model3d', config: { mol: 'tert-butyl-cation', compare: 'isobutane', highlight: [1], labels: { 1: 'C⁺' } } },
      options: [
        opt('Flat (trigonal planar): three groups in one plane', true, 'Yes. C⁺ has three bonds and no lone pair, so three electron groups: sp² (Lesson 02). Its angles add up to 360°, unlike the tetrahedral carbon of isobutane.'),
        opt('Tetrahedral, with the empty orbital pointing at one corner', false, 'Tetrahedral needs four groups. The cation has only three, so its carbon is sp², not sp³. Compare the two models.'),
        opt('Pyramidal, like ammonia, with a lone pair on top', false, 'A lone pair would give eight electrons and a negative carbon (a carbanion). C⁺ has only six electrons and no lone pair.'),
        opt('Linear, like the carbons in an alkyne', false, 'Linear (sp) needs only two groups. The cation has three bonded groups.')
      ],
      hints: ['Count the electron groups on the central carbon: atoms bonded to it plus lone pairs (Lesson 02).', 'Three groups and no lone pair means sp², 120°, flat. Four groups would be sp³ and tetrahedral.'],
      worked: 'The cation carbon has three bonds and no lone pair, so three electron groups: sp² and trigonal planar (bond angles near 120°, sum 360°). Isobutane’s central carbon has four groups, so it is tetrahedral (about 109.5°).'
    },
    {
      caveman: {"html":"<div style=\"text-align:center\"><svg viewBox=\"0 0 270 214\" role=\"img\" aria-label=\"A carbocation carbon with three bonds in one plane and an empty p orbital above and below that plane\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"width:270px;max-width:100%;height:auto\">\n<polygon points=\"40,118 130,86 232,118 140,150\" stroke-width=\"1\" stroke-dasharray=\"3 4\" opacity=\".55\"/>\n<ellipse cx=\"135\" cy=\"50\" rx=\"17\" ry=\"28\" stroke-dasharray=\"5 4\"/><ellipse cx=\"135\" cy=\"186\" rx=\"17\" ry=\"28\" stroke-dasharray=\"5 4\"/>\n<line x1=\"135\" y1=\"118\" x2=\"135\" y2=\"98\"/><line x1=\"135\" y1=\"118\" x2=\"81\" y2=\"128\"/><line x1=\"135\" y1=\"118\" x2=\"189\" y2=\"128\"/>\n<g font-family=\"monospace\" font-size=\"15\" font-weight=\"700\" fill=\"currentColor\" stroke=\"none\"><text x=\"145\" y=\"123\">C⁺</text><text x=\"62\" y=\"140\">R</text><text x=\"194\" y=\"141\">R</text><text x=\"143\" y=\"100\">R</text></g>\n<g font-family=\"sans-serif\" font-size=\"12\" fill=\"currentColor\" stroke=\"none\"><text x=\"160\" y=\"44\">empty p orbital</text><text x=\"160\" y=\"192\">(no electrons in it)</text><text x=\"200\" y=\"100\">plane of the</text><text x=\"200\" y=\"114\">3 bonds</text></g></svg></div><p>C⁺ (R = alkyl) sp², planar. p orbital empty, above and below plane: hole attracts electron pair. Alkyl groups lend density (inductive effect): 3° > 2° > 1° > methyl.</p>"}, // CAVEMAN
      id: 's06', type: 'explain', skill: 'carbocations',
      html: `<div style="text-align:center">${CATION_SVG}</div><p>The C⁺ (R = an alkyl group) is sp² and planar. Its <b>p orbital is empty</b>, above and below the plane: that hole attracts a pair of electrons. C⁺ is short of electrons, so alkyl groups that lend it density spread the charge (the <b>inductive effect</b>) and steady it: <b>3° > 2° > 1° > methyl</b>.</p>`
    },
    {
      caveman: {"prompt":"Diagram: two pathways, HBr + 2-methylpropene: tertiary cation (solid), primary cation (dashed). Which is right?","worked":"3° pathway first transition state far below 1° (Eact step 1: 40 vs 85 kJ/mol). Tertiary much faster: tertiary alkyl bromide forms.","hints":["Compare first peaks. Which climbs less?","Stable cation (lower valley): lower first peak, lower barrier, faster."],"options":[{"why":"Yes. More stable cation lower, transition state lower. Smaller Eact: more molecules over barrier."},{"why":"Less stable cation sits HIGHER, so does its transition state. Higher barrier: slower."},{"why":"Same product type, not same speed. Barriers differ: rates differ."},{"why":"Reverse for step 1: lower intermediate, lower transition state, smaller barrier, faster."}]}, // CAVEMAN
      id: 's07', type: 'choice', skill: 'energy-diagram',
      prompt: 'The diagram compares two pathways for HBr adding to 2-methylpropene: through the tertiary cation (solid) and through the primary cation (dashed). Which statement is right?',
      visual: { widget: 'energy-diagram', config: { levels: pw3, label: 'via the 3° carbocation (Markovnikov)', overlay: { levels: pw1, label: 'via the 1° carbocation' }, mode: 'view', caption: 'Illustrative energies, not measured values.' } },
      options: [
        opt('The 3° pathway has the lower transition state, so it is faster and wins', true, 'Yes. A more stable cation sits lower, and the transition state leading to it is lower too. A smaller Eact means more molecules get over the barrier per second.'),
        opt('The 1° pathway is faster, because a less stable cation is more reactive and reacts sooner', false, 'A less stable cation sits HIGHER in energy, and so does the transition state that leads to it. A higher barrier means a slower step.'),
        opt('Both paths are equally fast, since both lead to an alkyl bromide', false, 'Same type of product does not mean the same speed. The barriers have different heights, so the rates differ.'),
        opt('The 3° pathway is slower, because its intermediate is lower in energy', false, 'The reverse holds for step 1: the lower the intermediate (and the transition state before it), the smaller the barrier and the faster the step.')
      ],
      hints: ['Compare the heights of the first peak on the two curves. Which pathway has to climb less?', 'The more stable cation (lower valley) goes with the lower first peak. The step with the lower barrier is faster.'],
      worked: 'The first transition state of the 3° pathway is far below that of the 1° pathway (illustrative: Eact of step 1 is 40 kJ/mol against 85 kJ/mol). The tertiary route is much faster, so the tertiary alkyl bromide is what forms.'
    },
    {
      caveman: {"prompt":"Draw whole mechanism: HBr + 2-methylpropene. Step 1: π bond attacks H. After arrow, say which carbon bonds H: checker uses carbocation rule.","worked":"Step 1: arrow C=C to H of HBr (H to CH₂ carbon); arrow H–Br to Br: (CH₃)₃C⁺, Br⁻. Step 2: arrow Br⁻ lone pair to C⁺: (CH₃)₃CBr.","hints":["Step 1: two arrows: π bond to H, H–Br to Br; also asks which carbon bonds H. Step 2: one.","CH₂ carbon (2 H already) gets new C–H. Step 2: Br⁻ lone pair to C⁺."]}, // CAVEMAN
      id: 's08', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'Draw the whole mechanism of HBr adding to 2-methylpropene. In step 1 the π bond attacks the H. After you draw that arrow you will say which carbon bonds to H, and the checker uses the carbocation rule you just learned.',
      reaction: { reactants: ['CC(C)=C', 'Br'], products: ['CC(C)(C)Br'] },
      config: { get mech() { return mech('CC(C)=C', 'HBr', 3, 1); }, mode: 'draw' },
      confirm: 'Step 1: the π bond attacks H (on the CH₂ carbon) and the H–Br pair goes to Br, leaving a tertiary carbocation and Br⁻. Step 2: Br⁻ gives a lone pair to the positive carbon.',
      hints: ['Step 1 has two arrows: π bond to the H of HBr, and the H–Br bond to Br. The first one also asks which carbon bonds to H. Step 2 has one arrow.', 'Choose the CH₂ carbon (it already has 2 H) for the new C–H bond. Then step 2: a lone pair on Br⁻ to the positive carbon.'],
      worked: 'Step 1: arrow from the C=C bond to the H of HBr (H bonds to the CH₂ carbon), and arrow from the H–Br bond to Br. That gives (CH₃)₃C⁺ and Br⁻. Step 2: arrow from a lone pair on Br⁻ to the positive carbon, giving (CH₃)₃CBr.'
    },
    {
      caveman: {"prompt":"Classmate: step 1, H bonds carbon with two CH₃, ends with 1-bromo-2-methylpropane. What went wrong?","worked":"H to (CH₃)₂C: C⁺ on CH₂: primary. H to CH₂: C⁺ on (CH₃)₂C: tertiary, far more stable, faster: H must go to CH₂.","hints":["Compare cations: where is + if H goes to carbon with CH₃ groups?","+ on CH₂: one carbon group: primary, far less stable than tertiary."],"options":[{"why":"Yes. H on carbon with CH₃ groups: + on CH₂, primary. H should go to CH₂: tertiary cation."},{"why":"Br⁻ attacks readily: step 2. Error earlier: where H went."},{"why":"Both C₄H₉Br, isomers. Which forms matters."},{"why":"Cations unequal (3° vs 1°): one path much faster. Regiospecific."}]}, // CAVEMAN
      id: 's09', type: 'choice', skill: 'markovnikov',
      prompt: 'A classmate draws step 1 of that mechanism with H bonding to the carbon that holds the two CH₃ groups, and finishes with 1-bromo-2-methylpropane. What went wrong?',
      options: [
        opt('H went to the wrong carbon: that gives a primary cation, the less stable one', true, 'Yes. H on the carbon with the CH₃ groups leaves the + on CH₂, a primary cation. The H should go to the CH₂ carbon, which makes the tertiary cation.'),
        opt('Br⁻ cannot attack a carbocation, because step 2 needs a neutral molecule', false, 'Br⁻ attacks it readily: that is step 2 of the correct mechanism. The error is earlier, in where H went.'),
        opt('The product has the wrong molecular formula: one H too many', false, 'Both bromides are C₄H₉Br, isomers. The trouble is which isomer forms, not the formula.'),
        opt('Nothing is wrong: both products form in about equal amounts, as with any alkene', false, 'The two cations are not equally stable (3° against 1°), so one path is much faster. The reaction is regiospecific.')
      ],
      hints: ['Compare the two carbocations: where does the + charge end up if H goes to the carbon with the CH₃ groups?', 'That charge would sit on the CH₂ carbon, which has only one carbon group: a primary cation, much less stable than the tertiary one.'],
      worked: 'H adding to the (CH₃)₂C carbon leaves C⁺ on CH₂, a primary cation. H adding to the CH₂ carbon leaves C⁺ on the (CH₃)₂C carbon, a tertiary cation. The tertiary cation is far more stable and forms faster, so H must go to CH₂.'
    },
    {
      caveman: {"prompt":"1-Methylcyclohexene + water with little sulfuric acid. H and OH add across C=C. Which compound?","reveal":"Hydration obeys Markovnikov’s rule: H to carbon with more H, OH to more alkyl groups. Acid catalyst: H⁺ in step 1. Tertiary alcohol.","options":[{"why":"Yes. H to CH carbon, OH to CH₃ carbon: tertiary alcohol, tertiary cation."},{"why":"OH on less substituted carbon: needs H on carbon with CH₃: less stable secondary cation."},{"why":"Carbons differ (no H, three alkyl vs one H): cations differ, one path wins."},{"why":"Water alone too weak to protonate; acid catalyst gives H₃O⁺: reaction goes."}]}, // CAVEMAN
      id: 's10', type: 'predict', skill: 'markovnikov',
      prompt: '1-Methylcyclohexene is shaken with water containing a little sulfuric acid. A new compound forms by addition of H and OH across the C=C. Which is it?',
      equation: { reactants: ['CC1=CCCCC1', 'O'], products: [], cond: 'H₂SO₄ (cat.)' },
      options: [
        opt('<mol smiles="CC1(O)CCCCC1" label="1-methylcyclohexan-1-ol"></mol>', true, 'Yes. H went to the CH carbon and OH to the carbon that carries the CH₃: the tertiary alcohol, through the tertiary carbocation.'),
        opt('<mol smiles="CC1CCCCC1O" label="2-methylcyclohexan-1-ol"></mol>', false, 'This puts OH on the less substituted carbon. That needs H on the carbon with the CH₃, which would make the less stable secondary cation.'),
        opt('An equal mixture of both alcohols', false, 'The two carbons differ (no H and three alkyl groups, against one H), so the cations differ in stability and one path wins.'),
        opt('Nothing: water alone cannot add to a C=C', false, 'Water alone is too weak an acid to protonate the alkene, but the acid catalyst supplies H₃O⁺, and then the reaction goes.')
      ],
      reveal: 'Hydration follows Markovnikov’s rule too: <b>H to the carbon with more H, OH to the carbon with more alkyl groups</b>. The acid is a catalyst: it supplies the H⁺ for step 1. The product here is a tertiary alcohol.'
    },
    {
      caveman: {"prompt":"Mechanism, acid-catalysed hydration of 2-methylpropene. 1: π bond attacks H₃O⁺. 2: water attacks carbocation: oxonium ion (O⁺). 3: water removes H⁺.","worked":"Step 1: C=C → H of H₃O⁺, O–H → O: (CH₃)₃C⁺, H₂O. Step 2: H₂O lone pair → C⁺: (CH₃)₃C–OH₂⁺. Step 3: water lone pair → oxonium H, O–H → O: (CH₃)₃C–OH, H₃O⁺.","hints":["Step 1 like HBr: two arrows (π to H, O–H to O). Step 2: O lone pair to C⁺. Step 3: water lone pair to oxonium H, O–H to that O.","Step 3: arrow taking H starts at lone pair of NEW water, ends on H. Second starts on breaking O–H, ends on oxonium O."]}, // CAVEMAN
      id: 's11', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'Draw the 3-step mechanism of acid-catalysed hydration of 2-methylpropene. Step 1: the π bond attacks H₃O⁺. Step 2: water attacks the carbocation, giving an oxonium ion (an O with three bonds and a + charge). Step 3: water removes H⁺.',
      reaction: { reactants: ['CC(C)=C', '[OH3+]'], products: ['CC(C)(C)O', '[OH3+]'] },
      config: { get mech() { return mech('CC(C)=C', 'H2O', 3, 1); }, mode: 'draw' },
      confirm: 'Protonation gives the tertiary cation, water’s lone pair attacks it to make an oxonium ion, and another water pulls off H⁺. The product is the alcohol, and H₃O⁺ is regenerated.',
      hints: ['Step 1 is like HBr: two arrows (π bond to H, then the O–H bond to O). Step 2: one arrow from a lone pair on O to C⁺. Step 3: lone pair of a water to the H on the oxonium O, then the O–H bond to that O.', 'In step 3 the arrow that takes the H starts at a lone pair on the NEW water molecule and ends on the H. The second arrow starts on the O–H bond that breaks and ends on the oxonium oxygen.'],
      worked: 'Step 1: C=C bond → H of H₃O⁺ (on the CH₂ carbon) and O–H bond → O, giving (CH₃)₃C⁺ and H₂O. Step 2: lone pair of H₂O → C⁺, giving (CH₃)₃C–OH₂⁺. Step 3: lone pair of another H₂O → the H on the oxonium oxygen, and the O–H bond → that oxygen, giving (CH₃)₃C–OH and H₃O⁺.'
    },
    {
      caveman: {"prompt":"H₃O⁺ used in step 1; new H₃O⁺ in step 3. What does it say about the acid?","worked":"alkene + H₂O → alcohol; H₃O⁺ both sides. Gives H⁺ step 1, regains step 3: catalyst, not consumed.","hints":["Compare very start and end: H₃O⁺ lost overall?","Consumed in one step, regenerated later: catalyst."],"options":[{"why":"Yes. Leaving H⁺ replaced by another: not consumed. Hence only “cat.” sulfuric acid."},{"why":"Step 3 remakes H₃O⁺. Only alkene, H₂O used."},{"why":"Oxonium loses H⁺ to water, step 3: H₃O⁺ again."},{"why":"Solvent mostly water. Acid: small H⁺ source with job in steps 1, 3."}]}, // CAVEMAN
      id: 's12', type: 'choice', skill: 'markovnikov',
      prompt: 'Look at H₃O⁺ in your mechanism. It is used in step 1 and a new H₃O⁺ appears in step 3. What does that tell you about the acid?',
      options: [
        opt('It is a catalyst: used in step 1 and regenerated in step 3, so a small amount is enough', true, 'Yes. The H⁺ that leaves is replaced by another H⁺, so the acid is not consumed. That is why the reaction needs only “cat.” sulfuric acid.'),
        opt('It is a reactant: one H₃O⁺ is used up for every alkene that reacts', false, 'It is not used up: step 3 makes H₃O⁺ again. Overall only the alkene and H₂O are consumed.'),
        opt('It becomes the OH hydrogen of the product and is gone', false, 'The oxonium ion loses its extra H⁺ in step 3 to water. The acid ends up as H₃O⁺ again.'),
        opt('It is just the solvent, so it plays no part in the steps', false, 'The solvent is mostly water. The acid is a small amount of added H⁺ source with a specific job in step 1 and step 3.')
      ],
      hints: ['Compare what is present at the very start and the very end: is any H₃O⁺ lost overall?', 'A species that is consumed in one step and regenerated in a later step is a catalyst.'],
      worked: 'Overall: alkene + H₂O → alcohol, with H₃O⁺ on both sides. The acid donates H⁺ in step 1 and gets one back in step 3, so it speeds up the reaction without being used up: a catalyst.'
    },
    {
      caveman: {"html":"<p>Hydration = HX addition, water for X⁻: (1) H₃O⁺ protonates alkene: carbocation (slow); (2) water attacks cation: oxonium ion; (3) water removes H⁺: alcohol, H₃O⁺ back. Markovnikov: OH on carbon with more alkyl groups.</p>"}, // CAVEMAN
      id: 's13', type: 'explain', skill: 'markovnikov',
      html: '<p><b>Hydration in short.</b> It is HX addition with water in place of X⁻, in three steps: (1) the alkene is protonated by H₃O⁺ to give the carbocation (the slow step); (2) water attacks the cation, giving an oxonium ion; (3) water removes H⁺, giving the alcohol and regenerating H₃O⁺. Markovnikov: OH ends up on the carbon with more alkyl groups.</p>'
    },
    {
      caveman: {"prompt":"HBr + pent-2-ene, CH₃CH=CHCH₂CH₃. How many different alkyl bromides?","reveal":"Both C=C carbons same alkyl count: cations secondary, equal. No orientation favoured: mixture of 2-bromopentane, 3-bromopentane. Rule needs different carbons.","options":[{"why":"Yes. Each C=C carbon one H, one alkyl: H to either. Both cations secondary: both bromides form."},{"why":"Needs cation at C2 better than C3. Both secondary (C⁺ two carbon groups): none favoured."},{"why":"Needs cation at C3 better. Both secondary: none favoured."},{"why":"Br only on C2 or C3. C1 not in double bond."}]}, // CAVEMAN
      id: 's14', type: 'predict', skill: 'markovnikov',
      prompt: 'HBr adds to pent-2-ene, CH₃CH=CHCH₂CH₃. Look at the two C=C carbons: how many different alkyl bromides do you expect?',
      equation: { reactants: ['CCC=CC', 'Br'], products: [], cond: 'ether' },
      options: [
        opt('Two: 2-bromopentane and 3-bromopentane', true, 'Yes. Each C=C carbon has one H and one alkyl group, so H can go to either with equal justification. Both cations are secondary, equally stable, and both bromides form.'),
        opt('One: only 2-bromopentane, the carbon nearest the end', false, 'That would need the cation at C2 to be better than the one at C3. Both are secondary (each C⁺ has two carbon groups), so neither is favoured.'),
        opt('One: only 3-bromopentane, the carbon in the middle', false, 'That would need the cation at C3 to be better. Both carbocations are secondary, so neither is favoured.'),
        opt('Three, including 1-bromopentane at the chain end', false, 'H adds to a C=C carbon and Br to the other, so Br can only end up on C2 or C3. C1 is not part of the double bond.')
      ],
      reveal: 'Both C=C carbons carry the same number of alkyl groups, so both carbocations are secondary and equally stable. Neither orientation is favoured, and you get a <b>mixture</b> of 2-bromopentane and 3-bromopentane. The rule only decides when the two carbons differ.'
    },
    {
      caveman: {"problem":"Predict <b>2-methylbut-2-ene + HCl</b> product stepwise.","rule":"Count alkyl groups on two C=C carbons. H to carbon with more H; + (then X) on more substituted carbon: more stable carbocation. Alike: mixture.","moves":[{"ask":"CH₃CH=C(CH₃)₂: which carbon has more alkyl groups?","options":[{"why":"Yes. Two alkyl groups, no H. Other: one CH₃, one H."},{"why":"Only one alkyl group. Other end: two CH₃."},{"why":"Differ: two alkyl, no H vs one alkyl, one H."}]},{"ask":"Which carbon gets H?","options":[{"why":"Yes. H to carbon with more H."},{"why":"+ on CH carbon: secondary, when tertiary available."}]},{"ask":"Which carbocation?","options":[{"why":"Yes. C⁺: two CH₃ plus new CH₂CH₃: tertiary."},{"why":"That is cation from H on other carbon. Here + carbon: two CH₃ plus CH₂CH₃: three."},{"why":"Primary: C⁺ with one carbon group, chain end. This C⁺ has three."}]},{"ask":"Cl⁻ bonds positive carbon. Product?","options":[{"why":"Yes. Cl on carbon with +: tertiary chloride."},{"why":"This is anti-Markovnikov: Cl on carbon with more H. From secondary cation."},{"why":"One HCl adds: one Cl."}]}]}, // CAVEMAN
      id: 's15', type: 'worked', skill: 'markovnikov',
      problem: 'Predict the product of <b>2-methylbut-2-ene + HCl</b> yourself, one decision at a time.',
      smiles: 'CC=C(C)C',
      moves: [
        {
          ask: 'Look at the C=C of 2-methylbut-2-ene, CH₃CH=C(CH₃)₂. Which carbon has more alkyl groups?',
          options: [
            opt('The carbon with two CH₃ groups (and no H)', true, 'Yes. It has two alkyl groups and no H. The other C=C carbon has one CH₃ and one H.'),
            opt('The carbon with one CH₃ and one H', false, 'That carbon has just one alkyl group. The other end carries two CH₃ groups.'),
            opt('They have the same number', false, 'They differ: two alkyl groups and no H on one end, one alkyl group and one H on the other.')
          ]
        },
        {
          ask: 'So which carbon receives the H?',
          options: [
            opt('The CH carbon (one alkyl group, one H)', true, 'Yes. H goes to the carbon with more H and fewer alkyl groups.'),
            opt('The carbon with the two CH₃ groups', false, 'That would leave the + on the CH carbon, a secondary cation, when a tertiary one is available.')
          ]
        },
        {
          ask: 'What carbocation forms?',
          options: [
            opt('A tertiary cation: C⁺ bonded to three carbon groups', true, 'Yes. C⁺ carries two CH₃ groups and the new CH₂CH₃ group, so it is tertiary.'),
            opt('A secondary cation: C⁺ bonded to two carbon groups', false, 'That would be the cation from H adding to the other carbon. Here the + carbon already has two CH₃ groups plus the CH₂CH₃ group: three.'),
            opt('A primary cation', false, 'A primary cation needs a C⁺ with only one carbon group, as at the end of a chain. This C⁺ has three.')
          ],
          figure: { smiles: 'CC[C+](C)C', drawing: 'skeletal', showCharge: true, label: 'the carbocation' }
        },
        {
          ask: 'Cl⁻ then bonds to the positive carbon. What is the product?',
          options: [
            opt('<mol smiles="CCC(C)(C)Cl" label="2-chloro-2-methylbutane"></mol>', true, 'Yes. Cl sits on the carbon that carried the + charge: the tertiary chloride.'),
            opt('<mol smiles="CC(Cl)C(C)C" label="2-chloro-3-methylbutane"></mol>', false, 'This is the anti-Markovnikov orientation: Cl on the carbon that had more H. It would come from the secondary cation.'),
            opt('<mol smiles="CC(C)(Cl)C(C)Cl" label="2,3-dichloro-2-methylbutane"></mol>', false, 'Only one HCl adds, so only one Cl is in the product.')
          ]
        }
      ],
      rule: 'Count alkyl groups on the two C=C carbons. <b>H goes to the carbon with more H</b>; the + charge (and then X) lands on the more substituted carbon, because that is the more stable carbocation. If both carbons are alike, expect a mixture.'
    },
    {
      caveman: {"prompt":"Backwards: compound above is major product of alkene + HCl. Which alkene?","worked":"Remove Cl and neighbour ring H: 1-methylcyclohexene. Check: H to CH carbon, Cl to CH₃ carbon.","hints":["Find carbon with Cl. C=C was between it and neighbour.","Remove Cl and one neighbour H, restore double bond. Check Markovnikov puts Cl back."],"options":[{"why":"Yes. H to CH carbon, Cl to carbon with CH₃: compound shown."},{"why":"Cyclohexene has no CH₃. Product has none."},{"why":"Chain, not ring. Product: 2-chloro-2-methylbutane."},{"why":"Pent-1-ene: chain, gives 2-chloropentane."}]}, // CAVEMAN
      id: 's16', type: 'choice', skill: 'markovnikov',
      prompt: 'Work backwards. The compound above is the major product when an alkene reacts with HCl in ether. Which alkene was it?',
      smiles: 'CC1(Cl)CCCCC1',
      options: [
        opt('<mol smiles="CC1=CCCCC1" alt="1-methylcyclohexene"></mol>', true, 'Yes. HCl adds H to the CH carbon and Cl to the carbon with the CH₃, which is the compound shown.'),
        opt('<mol smiles="C1=CCCCC1" alt="cyclohexene"></mol>', false, 'Cyclohexene has no CH₃. Its product, chlorocyclohexane, has no CH₃ either.'),
        opt('<mol smiles="CCC(C)=C" alt="2-methylbut-1-ene"></mol>', false, 'This is a chain, not a ring. Its product would be 2-chloro-2-methylbutane, not a ring.'),
        opt('<mol smiles="CCCC=C" alt="pent-1-ene"></mol>', false, 'Pent-1-ene has five carbons in a chain and gives 2-chloropentane. The target has a ring.')
      ],
      hints: ['Find the carbon that holds the Cl. The C=C must have been between that carbon and a neighbour.', 'Take away Cl and one H from a neighbouring carbon and restore the double bond. Then check that Markovnikov addition puts Cl back on the same carbon.'],
      worked: 'Remove Cl and an H from the adjacent ring carbon to get 1-methylcyclohexene. Check forwards: H goes to the CH carbon, Cl to the carbon with the CH₃, which gives the compound shown.'
    },
    {
      caveman: {"prompt":"Alcohol from acid-catalysed hydration (H₂O, H₂SO₄ catalyst). Which alkene gives THIS alcohol alone?","worked":"OH on C2. C=C was C1=C2 or C2=C3. Pent-1-ene: only C2 alcohol (Markovnikov’s rule); pent-2-ene: C2, C3 mixture.","hints":["Find carbon with OH. C=C between it and a neighbour: two to consider.","Try each neighbour: one follows Markovnikov, this alcohol alone; other gives mixture."],"options":[{"why":"Yes. Pent-1-ene: H to CH₂ end, OH to C2. Only pentan-2-ol."},{"why":"Pent-2-ene gives pentan-2-ol AND pentan-3-ol: carbons alike (cations secondary). Not alone."},{"why":"Propene: three carbons. Gives propan-2-ol."},{"why":"Cyclohexene gives cyclohexanol: ring."}]}, // CAVEMAN
      id: 's17', type: 'choice', skill: 'markovnikov',
      prompt: 'One more. This alcohol is the product of acid-catalysed hydration (H₂O, H₂SO₄ catalyst) of an alkene. Pick the alkene that gives mainly THIS alcohol and nothing else.',
      smiles: 'CCCC(C)O',
      options: [
        opt('<mol smiles="CCCC=C" alt="pent-1-ene"></mol>', true, 'Yes. Pent-1-ene: H goes to the CH₂ end and OH to C2, the carbon with more alkyl groups. Only pentan-2-ol forms.'),
        opt('<mol smiles="CCC=CC" alt="pent-2-ene"></mol>', false, 'Pent-2-ene gives pentan-2-ol AND pentan-3-ol, because both C=C carbons are alike (both cations secondary). It does not give this alcohol alone.'),
        opt('<mol smiles="CC=C" alt="propene"></mol>', false, 'Propene has only three carbons. It gives propan-2-ol.'),
        opt('<mol smiles="C1=CCCCC1" alt="cyclohexene"></mol>', false, 'Cyclohexene has a ring and gives cyclohexanol. The target is a chain of five carbons.')
      ],
      hints: ['Locate the carbon that carries the OH. The C=C was between it and a neighbouring carbon, and there are two neighbours to consider.', 'Try each neighbour: one choice puts the OH where Markovnikov addition would put it and gives only this alcohol; the other choice gives a mixture.'],
      worked: 'The OH is on C2. The C=C could have been C1=C2 or C2=C3. Pent-1-ene (C1=C2) gives only the C2 alcohol by Markovnikov’s rule; pent-2-ene (C2=C3) gives a mixture of the C2 and C3 alcohols.'
    },
    {
      caveman: {"prompt":"Lab. Pick alkene, reagent; predict major product BEFORE lab shows carbocations. Two right: one mixture, one single product.","worked":"2-Methylpropene + HBr: H to CH₂, Br to two-CH₃ carbon (2-bromo-2-methylpropane). Pent-2-ene + HBr: alike: both 2- and 3-bromopentane.","hints":["Count alkyl groups on both C=C carbons. H to more-H carbon; X or OH other.","Same alkyl count (pent-2-ene): pick option showing both products."]}, // CAVEMAN
      id: 's18', type: 'try', skill: 'markovnikov', widget: 'reaction-lab',
      prompt: 'Your turn in the lab. Pick an alkene and a reagent, then predict the major product BEFORE the lab shows the two possible carbocations. Get two predictions right (try one alkene that gives a mixture, one that gives a single product).',
      config: { need: 2 },
      confirm: 'Two predictions right. You read the two carbocations, picked the more stable one, and put X (or OH) there; with equal carbocations you expected a mixture.',
      hints: ['For each alkene count the alkyl groups on both C=C carbons. H goes to the carbon with more H; X or OH ends on the other.', 'If the two C=C carbons have the same number of alkyl groups (as in pent-2-ene), pick the option that shows both products.'],
      worked: 'Choose, for example, 2-methylpropene + HBr: H to CH₂, Br to the carbon with two CH₃ groups (2-bromo-2-methylpropane). Then pent-2-ene + HBr: both ends alike, so choose the option with both 2- and 3-bromopentane.'
    }
  ],
  mastery: { count: 3, generator: 'markovnikov' },
  useIt: {
    book: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.23', '4.39', '4.42', '4.55', '4.60'],
    endFrom: 21,
    note: 'In-chapter 4.1 and 4.2 are HX addition (products, then reactants), 4.3 asks for the carbocation intermediates, and 4.4 and 4.5 are hydration (products, then reactants). End of chapter: 4.23 and 4.42 (which alkene to hydrate), 4.39 (part c is an HBr addition), 4.55 (the same mechanism as hydration, with CH₃OH in place of water) and 4.60 (an energy diagram for HBr + pent-1-ene). Skip the styrene reaction in 4.33 until Chapter 5. Always draw the carbocation first.'
  }
});
