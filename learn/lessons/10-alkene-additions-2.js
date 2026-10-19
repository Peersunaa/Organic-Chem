// Lesson 10: Alkene additions II: halogens, hydrogen, oxidation and polymers (McMurry ch. 4, sections 4.4 to 4.7).
// Original wording throughout; book problems are referenced by number only.
// Everything chemical is computed by engine/reactions-additions.js (stereo-aware products, the bromonium mechanism, cleavage, repeat units). The drawn
// answers below were generated from that engine and the tests recompute each one (tests/lesson10.mjs: option `chk` = [alkene, reagent, 'right'|'opposite']).
// Mechanisms are getters, so they are built when the widget mounts (RDKit is ready by then), not when this file is imported.
// Not covered, because the book does not cover it: halohydrins, OsO4, ozonolysis, hydroboration.
import { halogenMechanism } from '../engine/reactions.js';

const opt = (text, correct, why, extra = {}) => ({ text, ...(correct ? { correct: true } : {}), why, ...extra });
const mo = (smiles, label, correct, why, chk) => ({ smiles, label, ...(correct ? { correct: true } : {}), why, ...(chk ? { chk } : {}) });

/** Move the correct option to a different place in each question (deterministic), so the right answer is not always first. */
function arrange(lesson) {
  const place = (opts, k) => { const i = opts.findIndex((o) => o.correct); const [c] = opts.splice(i, 1); opts.splice(k % (opts.length + 1), 0, c); };
  lesson.steps.forEach((st, n) => {
    if (st.options && (st.type === 'predict' || st.type === 'choice')) place(st.options, n % st.options.length);
    if (st.type === 'worked') st.moves.forEach((m, k) => place(m.options, (n + k) % m.options.length));
  });
  return lesson;
}

export default arrange({
  id: '10', slug: 'alkene-additions-2', title: 'Alkene additions II: halogens, hydrogen, oxidation & polymers', minutes: 29,
  chapter: 4, sections: ['4.4', '4.5', '4.6', '4.7'],
  drawing: 'skeletal',
  goals: [
    'Predict the product, with its stereochemistry, of Br₂ or Cl₂ (anti), H₂ over Pd (syn), a peroxyacid and then H₃O⁺ (anti), and KMnO₄ in base (syn)',
    'Explain anti addition with the bromonium ion and draw the mechanism of bromination',
    'Tell KMnO₄ in base (a cis-diol) from KMnO₄ in acid (it cuts the C=C) and predict the cleavage products',
    'Draw the repeat unit of an addition polymer and name the three steps of radical polymerisation'
  ],
  steps: [
    {
      id: 's01', type: 'predict', skill: 'stereo-addition',
      prompt: 'Br₂ is added to cyclopentene in CH₂Cl₂ (dichloromethane, a solvent). The red-brown colour of Br₂ disappears at once, and a dibromide forms by addition across the C=C. The two new Br atoms could land on the same face of the ring (cis) or on opposite faces (trans). Which do you expect?',
      equation: { reactants: ['C1=CCCC1'], products: [], cond: 'Br₂, CH₂Cl₂' },
      options: [
        opt('<mol smiles="Br[C@H]1CCC[C@@H]1Br" label="trans-1,2-dibromocyclopentane">', true, 'Yes. Only the trans dibromide is found: the two Br atoms end up on opposite faces of the ring. Wedge and dash show the two faces.', { chk: ['C1=CCCC1', 'Br2', 'right'] }),
        opt('<mol smiles="Br[C@@H]1CCC[C@@H]1Br" label="cis-1,2-dibromocyclopentane">', false, 'This is the cis isomer, both Br on the same face. It is not formed. A flat carbocation would let Br⁻ attack from either face and give a mixture, but only the trans product is found.', { chk: ['C1=CCCC1', 'Br2', 'opposite'] }),
        opt('<mol smiles="BrC1(Br)CCCC1" label="1,1-dibromocyclopentane">', false, 'Br₂ adds ACROSS the double bond: one Br goes to each of the two C=C carbons. Both Br on one carbon would mean a Br had moved.'),
        opt('No reaction: alkenes do not react with Br₂', false, 'They do. The red colour of Br₂ disappears immediately because Br₂ is used up in an addition. That is the standard quick test for a C=C.')
      ],
      reveal: 'Only <b>trans-1,2-dibromocyclopentane</b> forms: the Br atoms add from opposite faces, called <b>anti addition</b>. It is made as a racemate (equal amounts of the drawn molecule and its mirror image). The fading of Br₂’s red colour also makes this a quick lab test for a C=C.'
    },
    {
      id: 's02', type: 'try', skill: 'stereo-addition', widget: 'face-attack',
      prompt: 'Why opposite faces? Br₂ first makes a <b>bromonium ion</b>: one Br⁺ bridging both carbons of the old C=C, on ONE face of the ring (here with cyclohexene, as a solid 3D model). The second Br arrives as Br⁻ and attacks the highlighted ring carbon. Turn the model, then tap the spot it must come from.',
      config: {},
      confirm: 'Site B: straight behind the C–Br⁺ bond, on the face the bridging bromine does not cover. The new Br ends up trans to the first one.',
      hints: ['Look at which side of the ring the bridging Br⁺ sits on. Br⁻ is a negative ion and the bromine is in the way on that side.', 'A nucleophile attacks a carbon from the side opposite to the bond that breaks (here C–Br⁺). Find the ball on the far side of the carbon from the bridging Br.'],
      worked: 'The bridging Br⁺ blocks one face of the ring (site A). Br⁻ attacks from the other face, directly opposite the C–Br⁺ bond that breaks (site B). That puts the new Br on the face opposite the first Br: anti addition.'
    },
    {
      id: 's03', type: 'explain', skill: 'stereo-addition',
      html: '<p><b>The bromonium ion.</b> The alkene’s π electrons attack one Br of Br₂ and Br⁻ leaves. A lone pair on the attacked Br then bonds to the other carbon, closing a three-membered ring with a positive Br that bridges both carbons on one face. Br⁻ can only attack from the open, opposite face, so the two Br atoms end up anti. Cl₂ works the same way through a chloronium ion.</p>'
    },
    {
      id: 's04', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'Draw the whole mechanism of Br₂ adding to cyclohexene. Step 1: the π bond attacks the nearer Br, the Br–Br pair leaves with the other Br, and a lone pair on the attacked Br bonds to the second carbon (three arrows). Step 2: Br⁻ attacks a ring carbon and the ring opens (two arrows).',
      reaction: { reactants: ['C1=CCCCC1', 'BrBr'], products: ['BrC1CCCCC1Br'] },
      config: { get mech() { return halogenMechanism('C1=CCCCC1', 'Br'); }, mode: 'draw' },
      confirm: 'Step 1 makes the bromonium ion and Br⁻. In step 2 Br⁻ attacks from the back and the C–Br⁺ bond breaks, so the two Br atoms are trans.',
      hints: ['Step 1 has three arrows: the C=C bond to the nearer Br, the Br–Br bond to the far Br, and a lone pair on the attacked Br to the other carbon. Step 2 has two arrows.', 'Step 2: a lone pair on Br⁻ goes to a ring carbon that carries the bridging Br, and the bond between that carbon and the Br⁺ goes onto the Br⁺, which then holds three lone pairs and no charge.'],
      worked: 'Step 1: C=C bond → nearer Br; Br–Br bond → far Br (it leaves as Br⁻); lone pair on the attacked Br → the other carbon (bromonium ion). Step 2: lone pair on Br⁻ → one ring carbon; the C–Br⁺ bond to that carbon → onto Br. The product is trans-1,2-dibromocyclohexane.'
    },
    {
      id: 's05', type: 'choice', skill: 'stereo-addition',
      prompt: 'Cl₂ in CH₂Cl₂ adds to cyclohexene. Wedges and dashes show which face each Cl is on. Which product forms?',
      equation: { reactants: ['C1=CCCCC1'], products: [], cond: 'Cl₂, CH₂Cl₂' },
      options: [
        mo('Cl[C@@H]1CCCC[C@H]1Cl', 'trans-1,2-dichlorocyclohexane', true, 'Yes. A chloronium ion forms, then Cl⁻ attacks from the back, so the Cl atoms are on opposite faces (one wedge, one dash). The mirror image forms in equal amount.', ['C1=CCCCC1', 'Cl2', 'right']),
        mo('Cl[C@@H]1CCCC[C@@H]1Cl', 'cis-1,2-dichlorocyclohexane', false, 'Both Cl on the same face. That would need Cl⁻ to attack the face the chloronium ion blocks. Halogens add anti, not syn.', ['C1=CCCCC1', 'Cl2', 'opposite']),
        mo('ClC1(Cl)CCCCC1', '1,1-dichlorocyclohexane', false, 'One Cl adds to each carbon of the C=C. Two Cl on the same carbon would need a rearrangement that does not happen here.'),
        mo('ClC1CCCCC1', 'chlorocyclohexane', false, 'Cl₂ adds TWO Cl atoms. A single Cl on the ring is what HCl addition would give.')
      ],
      hints: ['Cl₂ and Br₂ add the same way. How are the two halogens arranged: same face (syn) or opposite faces (anti)?', 'Opposite faces on a ring means trans: in the wedge and dash drawing one Cl is wedged and the other is dashed.'],
      worked: 'Cl₂ adds anti through a chloronium ion, so the two Cl atoms are trans on the ring: one wedge, one dash. Cyclohexene is flat at the C=C and the product forms as a racemate, so either mirror image is a correct drawing.'
    },
    {
      id: 's06', type: 'predict', skill: 'stereo-addition',
      prompt: '1,2-Dimethylcyclohexene is stirred with H₂ and a Pd/C catalyst. Two H atoms add across the C=C. The new C–H bonds could form on the same face of the ring or on opposite faces. Which product do you expect?',
      equation: { reactants: ['CC1=C(C)CCCC1'], products: [], cond: 'H₂, Pd/C' },
      options: [
        opt('<mol smiles="C[C@@H]1CCCC[C@@H]1C" label="cis-1,2-dimethylcyclohexane">', true, 'Yes. Both H atoms add to the same face of the ring. The two CH₃ groups are pushed to the other face together, so they are cis.', { chk: ['CC1=C(C)CCCC1', 'H2', 'right'] }),
        opt('<mol smiles="C[C@H]1CCCC[C@@H]1C" label="trans-1,2-dimethylcyclohexane">', false, 'trans would need the two H atoms to add to opposite faces. Catalytic hydrogenation does not do that: both H atoms come from the same catalyst surface.', { chk: ['CC1=C(C)CCCC1', 'H2', 'opposite'] }),
        opt('<mol smiles="CC1(C)CCCCC1" label="1,1-dimethylcyclohexane">', false, 'H₂ only adds two H atoms. A CH₃ group would have to move to give this, and nothing moves.'),
        opt('No reaction: the C=C is too crowded', false, 'It is a tetrasubstituted alkene (four carbon groups on the C=C), and hydrogenation is slower for crowded alkenes, but it does work and gives this product in good yield.')
      ],
      reveal: 'The product is <b>cis-1,2-dimethylcyclohexane</b>. Hydrogenation is <b>syn addition</b>: both H atoms are delivered to the same face of the C=C.'
    },
    {
      id: 's07', type: 'explain', skill: 'stereo-addition',
      html: '<p><b>Hydrogenation happens on a metal surface.</b> H₂ sticks to the solid catalyst (Pd on carbon, or PtO₂) and the alkene lies on it with one face against the metal. Both H atoms pass to that same face: syn addition. The catalyst does not dissolve, so the reaction takes place on its surface, and the alkane product drifts away.</p>'
    },
    {
      id: 's08', type: 'choice', skill: 'reaction-types',
      prompt: 'Now the oxidations. In organic chemistry, adding H (or removing O) is a <b>reduction</b>, and adding O is an <b>oxidation</b>. Which of these reactions of cyclohexene is a REDUCTION?',
      options: [
        opt('H₂, Pd/C gives cyclohexane', true, 'Yes. Two H atoms are added to the molecule: a reduction.'),
        opt('A peroxyacid, RCO₃H, gives cyclohexene oxide', false, 'An O atom is added to the molecule. Adding O is an oxidation.'),
        opt('KMnO₄, OH⁻ gives cyclohexane-1,2-diol', false, 'Two O atoms (as OH groups) are added: an oxidation.'),
        opt('KMnO₄, H₃O⁺ gives hexanedioic acid, HO₂C(CH₂)₄CO₂H', false, 'The product has far more O than the alkene (the C=C is cut and O is added to each end): an oxidation.')
      ],
      hints: ['Count what is added to the carbons: H atoms, or O atoms?', 'H added (or O removed) is a reduction. Only one reagent here adds H.'],
      worked: 'H₂ adds two H atoms to the C=C, giving cyclohexane. That is the only reaction that adds H. The other three add O (as an epoxide O, two OH groups, or C=O and CO₂H groups), so they are oxidations.'
    },
    {
      id: 's09', type: 'predict', skill: 'stereo-addition',
      prompt: 'A peroxyacid, RCO₃H (for example meta-chloroperoxybenzoic acid, mCPBA), reacts with cyclohexene in CH₂Cl₂. The peracid gives one O atom to the C=C. What forms?',
      equation: { reactants: ['C1=CCCCC1'], products: [], cond: 'RCO₃H' },
      options: [
        opt('<mol smiles="C1CC[C@H]2O[C@H]2C1" label="cyclohexene oxide (7-oxabicyclo[4.1.0]heptane)">', true, 'Yes. The O atom bonds to both carbons of the old C=C, making a three-membered ring with oxygen: an epoxide.', { chk: ['C1=CCCCC1', 'RCO3H', 'right'] }),
        opt('<mol smiles="OC1CCCCC1O" label="cyclohexane-1,2-diol">', false, 'A peroxyacid transfers just ONE O atom, so there is one O in the product, in a ring. A diol has two O atoms and needs another step (H₃O⁺) or another reagent.'),
        opt('<mol smiles="O=C(O)CCCCC(=O)O" label="hexanedioic acid">', false, 'That would need the C=C to be cut. A peroxyacid does not cut the C=C; KMnO₄ in acid does.'),
        opt('<mol smiles="C1CCCCC1" label="cyclohexane">', false, 'Cyclohexane is what H₂ over Pd gives. A peroxyacid adds oxygen, it does not add hydrogen.')
      ],
      reveal: 'The product is an <b>epoxide</b> (an oxirane): a cyclic ether with the O in a three-membered ring. The O is delivered to both carbons from the same face, so the geometry of the alkene is kept.'
    },
    {
      id: 's10', type: 'choice', skill: 'stereo-addition',
      prompt: '(E)-But-2-ene (the trans alkene) reacts with a peroxyacid. The O adds to both carbons from the same face, and the CH₃ groups stay where they were. Which epoxide forms?',
      smiles: 'C/C=C/C',
      options: [
        mo('C[C@H]1O[C@@H]1C', 'trans-2,3-dimethyloxirane', true, 'Yes. The two CH₃ groups were on opposite sides of the C=C (trans), and they stay that way: one wedge, one dash. The mirror image forms in equal amount.', ['C/C=C/C', 'RCO3H', 'right']),
        mo('C[C@@H]1O[C@@H]1C', 'cis-2,3-dimethyloxirane', false, 'Both CH₃ on the same side of the ring is the epoxide of the CIS alkene, (Z)-but-2-ene. This alkene is trans, and epoxidation keeps the geometry.', ['C/C=C\\C', 'RCO3H', 'right']),
        mo('CC(O)C(C)O', 'butane-2,3-diol', false, 'A diol has two O atoms. The peroxyacid gives one O atom, which stays in the ring as an epoxide.'),
        mo('CC(=O)O', 'acetic acid', false, 'That would mean the C=C was cut (as with KMnO₄ in acid). A peroxyacid leaves the carbon skeleton intact.')
      ],
      hints: ['Epoxidation does not change the positions of the groups on the two carbons. Look at the CH₃ groups in the alkene: same side or opposite sides?', 'trans alkene (CH₃ groups on opposite sides) gives trans epoxide: one CH₃ on a wedge, the other on a dash.'],
      worked: 'The O adds to both carbons from one face and nothing else moves, so a trans alkene gives a trans epoxide and a cis alkene a cis epoxide. For (E)-but-2-ene the product is trans-2,3-dimethyloxirane, drawn with one wedge and one dash.'
    },
    {
      id: 's11', type: 'choice', skill: 'stereo-addition',
      prompt: 'Cyclohexene oxide is stirred with aqueous acid (H₃O⁺) and a diol forms. As with the bromonium ion, water attacks one ring carbon from the side OPPOSITE the C–O bond that breaks. Which diol is it?',
      smiles: 'C1CC[C@H]2O[C@H]2C1',
      options: [
        mo('O[C@H]1CCCC[C@@H]1O', 'trans-cyclohexane-1,2-diol', true, 'Yes. Water comes from the back, so one OH ends up on each face of the ring: trans. The mirror image forms in equal amount.', ['C1=CCCCC1', 'RCO3H_H3O', 'right']),
        mo('O[C@@H]1CCCC[C@@H]1O', 'cis-cyclohexane-1,2-diol', false, 'Both OH on the same face. That is what KMnO₄ in base gives. Opening an epoxide with water is an attack from the back, so the OH groups end up trans.', ['C1=CCCCC1', 'RCO3H_H3O', 'opposite']),
        mo('OC1CCCCC1', 'cyclohexanol', false, 'Cyclohexanol has only one O. The epoxide already has an O; water adds a second one.'),
        mo('O=C(O)CCCCC(=O)O', 'hexanedioic acid', false, 'Aqueous acid only opens the strained ring. It does not cut the C–C bond. Cleavage needs KMnO₄ in acid.')
      ],
      hints: ['Water attacks one carbon of the protonated epoxide from the face opposite the oxygen bridge. On which face does the original O stay?', 'The O that stayed becomes an OH on one face; the new OH comes from the other face. Opposite faces on a ring: trans.'],
      worked: 'The epoxide O is on one face of the ring. Water attacks one carbon from the opposite face, the C–O bond to that carbon breaks, and after losing H⁺ both carbons carry an OH, one on each face: trans-cyclohexane-1,2-diol.'
    },
    {
      id: 's12', type: 'predict', skill: 'alkene-oxidation',
      prompt: 'Now a one-step route to a diol. Cyclohexene is treated with KMnO₄ in basic solution (OH⁻, H₂O). The purple colour fades and a brown solid forms. Which product do you expect?',
      equation: { reactants: ['C1=CCCCC1'], products: [], cond: 'KMnO₄, OH⁻, H₂O' },
      options: [
        opt('<mol smiles="O[C@@H]1CCCC[C@@H]1O" label="cis-cyclohexane-1,2-diol">', true, 'Yes. In base, KMnO₄ puts an OH on each carbon of the C=C, both on the same face (syn): a cis diol.', { chk: ['C1=CCCCC1', 'KMnO4_OH', 'right'] }),
        opt('<mol smiles="O[C@H]1CCCC[C@@H]1O" label="trans-cyclohexane-1,2-diol">', false, 'This trans diol is the product of the two-step route (peroxyacid, then H₃O⁺). KMnO₄ in base adds both OH from the same face, giving the cis diol.', { chk: ['C1=CCCCC1', 'KMnO4_OH', 'opposite'] }),
        opt('<mol smiles="C1CC[C@H]2O[C@H]2C1" label="cyclohexene oxide">', false, 'KMnO₄ adds an OH to each carbon. An epoxide is the peroxyacid product, with one O shared by both carbons.', { chk: ['C1=CCCCC1', 'RCO3H', 'right'] }),
        opt('<mol smiles="O=C(O)CCCCC(=O)O" label="hexanedioic acid">', false, 'The C=C is cut in ACID, not in base. In basic solution the oxidation stops at the diol.')
      ],
      reveal: 'KMnO₄ in base gives the <b>cis-diol</b>: <b>syn hydroxylation</b>, in one step. With an acyclic alkene the same rule gives cis alkene → a meso diol (a diol that is its own mirror image) and trans alkene → a racemic diol (equal amounts of two mirror-image diols).'
    },
    {
      id: 's13', type: 'choice', skill: 'alkene-oxidation',
      prompt: 'Same alkene, same KMnO₄, but now the solution is ACIDIC (H₃O⁺). A classmate says "it will make the diol again". What actually forms?',
      equation: { reactants: ['C1=CCCCC1'], products: [], cond: 'KMnO₄, H₃O⁺' },
      options: [
        mo('O=C(O)CCCCC(=O)O', 'hexanedioic acid', true, 'Yes. In acid, KMnO₄ cuts the C=C. Each ring carbon had one H, so each becomes a carboxylic acid: one chain with a CO₂H at each end.', ['C1=CCCCC1', 'KMnO4_H', 'right']),
        mo('O[C@@H]1CCCC[C@@H]1O', 'cis-cyclohexane-1,2-diol', false, 'That is the product in BASE. In acid or neutral solution the oxidation does not stop at the diol; it goes on and cuts the C=C.', ['C1=CCCCC1', 'KMnO4_OH', 'right']),
        mo('O=CCCCCC=O', 'hexanedial', false, 'An aldehyde (CHO) is not the end of the road. KMnO₄ oxidises a C–H on the C=O carbon to C–OH, so each CHO becomes CO₂H.'),
        mo('C1CC[C@H]2O[C@H]2C1', 'cyclohexene oxide', false, 'An epoxide is what a peroxyacid gives. KMnO₄ in acid does not stop at an oxygen bridge; it breaks the C=C.', ['C1=CCCCC1', 'RCO3H', 'right'])
      ],
      hints: ['Acid or base? The same oxidant behaves differently. Which condition was said to give the diol?', 'In acid (or neutral) solution KMnO₄ cuts the C=C: a carbon with one H becomes CO₂H. The ring opens, so both ends are on one chain.'],
      worked: 'Acidic KMnO₄ cleaves the C=C. Each ring carbon has one H and one carbon neighbour, so each becomes a carboxylic acid (CO₂H). Opening a six-carbon ring this way gives the six-carbon diacid, hexanedioic acid (adipic acid).'
    },
    {
      id: 's14', type: 'try', skill: 'alkene-oxidation', widget: 'cleave-it',
      prompt: '2-Methylbut-2-ene meets KMnO₄ in acidic solution. Tap the bond that is cut, then say what each end becomes.',
      config: { alkene: 'CC=C(C)C' },
      confirm: 'The end with no H (two CH₃ groups) becomes a ketone, acetone; the end with one H becomes a carboxylic acid, acetic acid.',
      hints: ['Tap the double bond. Then count the H on each of its two carbons.', 'No H on the carbon: ketone. One H: carboxylic acid. Two H: CO₂.'],
      worked: 'Cut the C=C. The carbon with two CH₃ groups has no H, so it becomes C=O between two carbons: acetone. The other carbon has one H and one CH₃, so its H becomes OH: CH₃CO₂H, acetic acid.'
    },
    {
      id: 's15', type: 'worked', skill: 'alkene-oxidation',
      problem: 'Predict the product of <b>hex-1-ene + KMnO₄ in acid</b> one decision at a time.',
      smiles: 'CCCCC=C',
      moves: [
        {
          ask: 'Which bond does acidic KMnO₄ break?',
          options: [
            opt('The C=C double bond', true, 'Yes. The alkene is the reactive group; the C–C and C–H single bonds are left alone.'),
            opt('Only the π part of the C=C', false, 'That is what KMnO₄ in BASE does: it adds OH and keeps the C–C σ bond. In acid the whole double bond is cut.'),
            opt('Every C–C bond in the chain', false, 'The saturated part of the chain survives. Only the C=C is cut.')
          ]
        },
        {
          ask: 'The =CH₂ end has two H and no carbon group. What does it become?',
          options: [
            opt('CO₂', true, 'Yes. With two H on the carbon, the oxidation goes all the way to carbon dioxide.'),
            opt('A carboxylic acid', false, 'A carboxylic acid needs a carbon group on the carbon. =CH₂ has none to keep.'),
            opt('A ketone', false, 'A ketone needs two carbon groups on the C=O. =CH₂ has none.')
          ]
        },
        {
          ask: 'The other end is =CH–CH₂CH₂CH₂CH₃: one H and one carbon group. What does it become?',
          options: [
            opt('A carboxylic acid, –CO₂H', true, 'Yes. The C–H becomes C–OH and the carbon also gets C=O: –CO₂H.'),
            opt('An aldehyde, –CHO', false, 'An aldehyde may form first, but KMnO₄ oxidises it on to the carboxylic acid.'),
            opt('A ketone', false, 'A ketone needs two carbon groups on the C=O. This carbon has one carbon group and one H.')
          ]
        },
        {
          ask: 'So the products are…',
          options: [
            opt('<mol smiles="CCCCC(=O)O" label="pentanoic acid"> + <mol smiles="O=C=O" label="CO₂">', true, 'Yes. The five carbons of the chain keep their place in pentanoic acid, and the old CH₂= carbon leaves as CO₂.'),
            opt('<mol smiles="CCCCCC(=O)O" label="hexanoic acid">', false, 'That would have all six carbons in one acid. The C=C is cut, so the CH₂= carbon is lost as CO₂.'),
            opt('<mol smiles="CCCCC=O" label="pentanal"> + <mol smiles="O=C=O" label="CO₂">', false, 'Pentanal (an aldehyde) is the intermediate stage, but it is oxidised on to pentanoic acid.')
          ]
        }
      ],
      rule: 'KMnO₄ in acid cuts the C=C. Count the H on each carbon of the C=C: <b>none → ketone, one → carboxylic acid, two (=CH₂) → CO₂</b>. In BASE the same reagent stops at a cis-diol.'
    },
    {
      id: 's16', type: 'choice', skill: 'synthesis',
      prompt: 'Plan a synthesis: turn cyclohexene into trans-cyclohexane-1,2-diol. Which reagents, in which order?',
      equation: { reactants: ['C1=CCCCC1'], products: ['O[C@H]1CCCC[C@@H]1O'], cond: '?' },
      options: [
        opt('1. RCO₃H (a peroxyacid); 2. H₃O⁺', true, 'Yes. The peroxyacid makes the epoxide; water then opens it from the back, so the two OH groups are trans.'),
        opt('KMnO₄, OH⁻, H₂O', false, 'That makes a diol in one step, but both OH on the same face: the cis diol, not the trans diol.'),
        opt('1. H₃O⁺; 2. RCO₃H', false, 'The order matters. H₃O⁺ first would hydrate the alkene (Lesson 09) and give cyclohexanol, and a peroxyacid then has no C=C to react with.'),
        opt('KMnO₄, H₃O⁺', false, 'In acid, KMnO₄ cuts the C=C and gives hexanedioic acid, not a diol.')
      ],
      hints: ['You need two OH groups on opposite faces. Which route adds oxygen to both carbons by an attack from the back?', 'Epoxide first (RCO₃H), then open it with water and acid (H₃O⁺). Check the order: acid first would hydrate the alkene instead.'],
      worked: 'Step 1: RCO₃H converts cyclohexene into cyclohexene oxide. Step 2: H₃O⁺ and water open the ring by attack from the back, giving trans-cyclohexane-1,2-diol. KMnO₄/OH⁻ would give the cis diol, and acidic KMnO₄ would cut the ring.'
    },
    {
      id: 's17', type: 'choice', skill: 'polymers',
      prompt: 'Polymers: heated benzoyl peroxide supplies radicals that start the chain. In the step shown, a growing chain radical (the benzoyloxy group from the initiator is at the left end) meets another ethylene. A radical chain has three stages: <b>initiation</b> (the start), <b>propagation</b> (the chain grows) and <b>termination</b> (the chain stops). Which stage is this step?',
      equation: { reactants: ['O=C(c1ccccc1)OC[CH2]', 'C=C'], products: ['O=C(c1ccccc1)OCCC[CH2]'] },
      options: [
        opt('Propagation', true, 'Yes. A radical adds to a C=C and leaves a new, longer radical. This step repeats hundreds or thousands of times as the chain grows.'),
        opt('Initiation', false, 'Initiation is the start: a radical from the initiator adds to the FIRST monomer. Here a chain is already growing.'),
        opt('Termination', false, 'Termination uses radicals up (for example two chains combine). Here a radical is still left at the end.'),
        opt('A polar step with curved arrows', false, 'No electron PAIR moves here. Radical steps move single electrons, drawn with half-headed "fishhook" arrows.')
      ],
      hints: ['Count the radicals before and after. Is a radical used up, or does one remain?', 'One radical in, one longer radical out: the chain keeps going. That is the repeating, chain-building stage.'],
      worked: 'The chain radical adds to ethylene and the product still has a radical at its end, so the chain can add the next monomer. A step that continues the chain is propagation. Initiation makes the first carbon radical; termination removes radicals.'
    },
    {
      id: 's18', type: 'choice', skill: 'polymers',
      prompt: 'Vinyl chloride, H₂C=CHCl, is polymerised by a radical initiator to give PVC. Which drawing is the REPEAT UNIT? (The * marks show where the unit continues into the chain.)',
      smiles: 'C=CCl',
      options: [
        mo('*CC(*)Cl', 'repeat unit of PVC', true, 'Yes. The π bond is used up: each former C=C carbon forms a single bond to a neighbour in the chain. The repeat unit has exactly the atoms of the monomer.'),
        mo('C=CCl', 'the monomer itself', false, 'This is the monomer, with its C=C. In the polymer that π bond is gone: its electrons make the bonds that link the units together.'),
        mo('CCCl', 'chloroethane', false, 'This is the alkane you would get by adding H₂. Polymerisation joins monomers to each other; it does not add H₂.'),
        mo('*C=C(*)Cl', 'C=C kept in the chain', false, 'This keeps the C=C but has two H atoms fewer than the monomer. An addition polymer loses nothing: the repeat unit has exactly the atoms of the monomer, with the C=C turned into a C–C single bond.')
      ],
      hints: ['Nothing is lost in an addition polymer. The repeat unit must have the same atoms as the monomer, C₂H₃Cl.', 'Turn the C=C into a single bond and add one bond to the chain at each of its two carbons (the * marks). The Cl stays on its carbon.'],
      worked: 'Break the π bond of H₂C=CHCl and use its electrons to bond each carbon to a neighbouring unit. The repeat unit is –CH₂–CHCl–: C₂H₃Cl with a bond to the chain on each carbon, so Cl appears on every other carbon of the chain.'
    },
    {
      id: 's19', type: 'explain', skill: 'polymers',
      html: '<p><b>Addition polymers.</b> Substituted ethylenes (vinyl monomers) polymerise the same way and leave their substituent on every other carbon: ethylene gives polyethylene, propylene polypropylene, vinyl chloride PVC, styrene polystyrene and tetrafluoroethylene Teflon. A radical initiator starts the chain, propagation adds monomers, and termination (for example two chains combining) stops it.</p>'
    },
    {
      id: 's20', type: 'try', skill: 'stereo-addition', widget: 'reaction-lab',
      prompt: 'Your turn in the lab. Pick an alkene and a reagent, then predict the major product BEFORE the lab shows the answer, watching the stereochemistry (wedges and dashes). Get two predictions right: try Br₂ with a ring and KMnO₄ in acid with any alkene.',
      config: {
        need: 2,
        alkenes: ['cyclopentene', 'cyclohexene', '1-methylcyclohexene', '1,2-dimethylcyclohexene', 'propene', '2-methylpropene', 'hex-1-ene', '2-methylbut-2-ene', '(E)-but-2-ene', '(Z)-but-2-ene'],
        reagents: ['Br2', 'Cl2', 'H2', 'RCO3H', 'RCO3H_H3O', 'KMnO4_OH', 'KMnO4_H']
      },
      confirm: 'Two predictions right. You matched the reagent to what it adds (X₂, H₂, one O, two OH, or a cut) and then to the geometry: anti for X₂ and the epoxide-then-H₃O⁺ route, syn for H₂, the epoxide itself and KMnO₄ in base.',
      hints: ['First decide what the reagent adds or does: two halogens, two H, one O (epoxide), two OH (diol), or a cut. Then choose between cis/trans or the two drawn stereoisomers.', 'Anti (opposite faces, trans on a ring): Br₂, Cl₂, and RCO₃H followed by H₃O⁺. Syn (same face, cis on a ring): H₂ over Pd, the epoxide itself, and KMnO₄ in base. KMnO₄ in acid cuts the C=C.'],
      worked: 'For example: cyclohexene + Br₂ gives trans-1,2-dibromocyclohexane (anti); (E)-but-2-ene + RCO₃H gives trans-2,3-dimethyloxirane (syn, geometry kept); hex-1-ene + KMnO₄/H₃O⁺ gives pentanoic acid and CO₂.'
    }
  ],
  mastery: { count: 3, generator: 'alkene-additions-2' },
  useIt: {
    book: ['4.6', '4.7', '4.8', '4.9', '4.10', '4.11', '4.21', '4.25', '4.33', '4.35', '4.39', '4.40', '4.41', '4.45', '4.52', '4.53', '4.54', '4.58', '4.65'],
    endFrom: 21,
    note: 'In-chapter: 4.6 and 4.7 (bromination of 1,2-dimethylcyclohexene and its bromonium ion), 4.8 (hydrogenation), 4.9 and 4.10 (KMnO₄ products and reactants), 4.11 (a polymer segment). End of chapter: 4.21 (KMnO₄ in acid and in base), 4.25 (diol: which route?), 4.33 and 4.35 (predict the products; the benzene ring in 4.33 does not react), 4.39 to 4.41 and 4.58 (find the alkene or reactant), 4.45 (what is wrong; part b is KMnO₄), 4.52 to 4.54 (polymers), 4.65 (cis- and trans-but-2-ene with basic KMnO₄). Skip 4.34, 4.36 and 4.56 for now: they involve dienes or a benzene ring.'
  }
});
