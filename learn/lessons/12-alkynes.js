// Lesson 12: Alkynes and their reactions (McMurry ch. 4, section 4.11).
// Original wording throughout; book problems are referenced by number only.
// Everything chemical is computed: products by engine/reactions-alkynes.js (checked against an independent Python RDKit recompute, tools/check_alkynes.py),
// plans by engine/synthesis.js (the planner RUNS the learner's sequence), pKa comparisons by engine/acidbase.js. Drawn answers below were generated from those
// engines and tests/lesson12.mjs recomputes each one (option `chk` = [alkyne, reagent key, kind]). Mechanisms are getters, so they are built when the widget
// mounts (RDKit is ready by then).
// Not covered, because the book does not cover it: hydroboration, Na/NH3 (trans alkenes), hydration of acetylene itself (an aldehyde), E2 (the reason secondary
// halides fail with acetylides is Chapter 7), rings and enynes.
import { alkyneHXMechanism, acetylideAlkylationMechanism } from '../engine/reactions.js';

const opt = (text, correct, why, extra = {}) => ({ text, ...(correct ? { correct: true } : {}), why, ...extra });
const mo = (smiles, label, correct, why, extra = {}) => ({ smiles, label, ...(correct ? { correct: true } : {}), why, ...extra });
const mol = (s, l) => `<mol smiles="${s}" label="${l}"></mol>`;

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
  id: '12', slug: 'alkynes', title: 'Alkynes and their reactions', minutes: 29,
  chapter: 4, sections: ['4.11'],
  drawing: 'skeletal',
  goals: [
    'Predict the products of HX, X₂, H₂O with H₂SO₄ and HgSO₄, and H₂ (Pd/C or Lindlar) on an alkyne, including 1 against 2 equivalents and the geometry of the alkene',
    'Explain why NaNH₂ can deprotonate a terminal alkyne (pKa ≈ 25) while NaOH cannot, using pKa values',
    'Draw the curved arrows for an acetylide anion attacking a primary alkyl halide, and say why only primary halides work',
    'Plan a short synthesis of an alkyne, ketone or cis alkene by choosing the reagents and putting them in order'
  ],
  steps: [
    {
      caveman: {"prompt":"Lesson 02: carbon with two groups is sp. <b>But-2-yne</b>, CH₃–C≡C–CH₃ <mol smiles=\"CC#CC\" label=\"but-2-yne\"></mol>. Shape of four carbons?","reveal":"Two groups per triple-bond carbon: <b>sp</b>: C–C≡C–C <b>linear</b>. C≡C = one σ + two π at right angles. Check on 3D model next.","options":[{"why":"Yes. Each triple-bond carbon: two groups (other carbon, CH₃): sp, 180°."},{"why":"120° is sp² (three groups). These carbons have two: sp, not sp²."},{"why":"109.5° is sp³ (four groups). Triple-bond carbon joins just two atoms."},{"why":"Triple bond has no cis or trans: groups in a line. Cis, trans need bent C=C."}]}, // CAVEMAN
      id: 's01', type: 'predict', skill: 'hybridization',
      prompt: 'Lesson 02 told you that a carbon with two groups around it is sp-hybridized. Here is <b>but-2-yne</b>, CH₃–C≡C–CH₃ <mol smiles="CC#CC" label="but-2-yne"></mol>. What shape do you expect the four carbons to make?',
      options: [
        opt('A straight line: every C–C≡C angle is 180°', true, 'Yes. Each triple-bond carbon has just two groups (the other triple-bond carbon and one CH₃), and two groups on an sp carbon sit 180° apart.'),
        opt('A zig-zag with C–C≡C angles of about 120°', false, '120° belongs to sp² carbons, which have three groups. Each triple-bond carbon has only two, so it is sp, not sp².'),
        opt('A bend of about 109.5°, as in butane', false, '109.5° belongs to sp³ carbons, which have four groups. A triple-bond carbon is joined to just two other atoms.'),
        opt('A U shape with both CH₃ groups on the same side, like a cis alkene', false, 'A triple bond has no cis or trans form, because the groups on it are in a line. Cis and trans need the bent geometry of a C=C.')
      ],
      reveal: 'Two groups on each triple-bond carbon means <b>sp</b>, so the C–C≡C–C unit is <b>linear</b>. The C≡C is one σ bond plus two π bonds at right angles to each other. Next you can check this on a real 3D model.'
    },
    {
      caveman: {"prompt":"Left: 3D <b>but-2-yne</b>. Right: <b>(Z)-but-2-ene</b>, made from it later. Turn them: four carbons each. Which statement matches?","worked":"But-2-yne: C–C≡C 180° (sp): four carbons collinear. (Z)-but-2-ene: C–C=C near 120° (sp²), both CH₃ same side of double bond. Triple bond shorter.","hints":["Rotate left model, look along chain from side. Four carbons stay in line?","Right model: four carbons in a line? Both CH₃ same side of C=C, or opposite?"],"options":[{"why":"Yes. Alkyne sp carbons: line. Alkene sp² carbons: bend; cis = both CH₃ same side."},{"why":"Only alkyne straight. Alkene C–C=C near 120°: bent."},{"why":"Reverse: three pairs pull nuclei closer than two: triple bond shorter."},{"why":"Linear unit has no sides: one but-2-yne. Cis, trans only for bent C=C."}]}, // CAVEMAN
      id: 's02', type: 'choice', skill: 'hybridization',
      prompt: 'On the left is a solid model of <b>but-2-yne</b>; on the right is <b>(Z)-but-2-ene</b>, the alkene you will make from it later. Turn them and look at the four carbons of each. Which statement matches what you see?',
      visual: { widget: 'model3d', config: { mol: 'but-2-yne', compare: 'cis-but-2-ene', highlight: [0, 1, 2, 3] } },
      options: [
        opt('In but-2-yne the four carbons lie on a straight line; in (Z)-but-2-ene the chain is bent, with both CH₃ groups on the same side', true, 'Yes. The sp carbons of the alkyne put the chain in a line; the sp² carbons of the alkene bend it, and cis means the two CH₃ groups share a side.'),
        opt('Both molecules have a straight carbon chain; only the number of hydrogens differs, by two', false, 'Only the alkyne is straight. The alkene’s C–C=C angles are near 120°, so its chain is bent.'),
        opt('The C≡C bond of the alkyne is longer than the C=C bond of the alkene, since it has more bonds', false, 'It is the other way round: three shared electron pairs pull the two nuclei closer than two pairs do, so the triple bond is the shorter one.'),
        opt('But-2-yne also has a cis and a trans form, because it has two CH₃ groups on the multiple bond', false, 'The linear C–C≡C–C unit has no sides, so there is only one but-2-yne. Cis and trans exist only for the bent C=C.')
      ],
      hints: ['Rotate the left model so you look along the chain from the side. Do the four highlighted carbons stay in one straight line?', 'Look at the right model: are its four carbons in a line, and are the two CH₃ groups on the same side of the C=C or on opposite sides?'],
      worked: 'In but-2-yne each C–C≡C angle is 180° (sp carbons), so all four carbons are collinear. In (Z)-but-2-ene each C–C=C angle is near 120° (sp² carbons) and the two CH₃ groups are on the same side of the double bond. The triple bond is also the shorter bond.'
    },
    {
      caveman: {"html":"<p><b>Alkynes</b>: C≡C = one σ (sp–sp) + two π. CₙH₂ₙ₋₂. <b>Terminal</b>: H on triple bond (R–C≡C–H); <b>internal</b>: none (R–C≡C–R′). Naming as Lesson 07: -yne, number from end nearer triple bond: <name new=\"pent-1-yne\" old=\"1-pentyne\"></name>.</p>"}, // CAVEMAN
      id: 's03', type: 'explain', skill: 'hybridization',
      html: '<p><b>Alkynes</b> contain a C≡C: one σ bond from sp–sp overlap plus two π bonds. The formula is CₙH₂ₙ₋₂. A <b>terminal</b> alkyne has an H on the triple bond (R–C≡C–H); an <b>internal</b> alkyne does not (R–C≡C–R′). Naming follows Lesson 07 with the ending -yne, numbering from the end nearer the triple bond: <name new="pent-1-yne" old="1-pentyne"></name>.</p>'
    },
    {
      caveman: {"prompt":"Naming from Lesson 07 with triple bond. Name this alkyne, either IUPAC style; numbers and order count.","worked":"Five carbons: pent-. Triple bond at end carbon: number from there: C1≡C2. <name new=\"pent-1-yne\" old=\"1-pentyne\"></name>.","hints":["Longest chain with triple bond: stem (meth, eth, prop, but, pent …).","Number from end nearer triple bond; locant before -yne (new) or in front (old)."]}, // CAVEMAN
      id: 's04', type: 'input', skill: 'naming',
      prompt: 'Try the naming from Lesson 07 with a triple bond. Name this alkyne in either IUPAC style; spaces, capitals and hyphens do not matter, but numbers and order do.',
      smiles: 'CCCC#C',
      name: true,
      answer: 'pent-1-yne', accept: ['1-pentyne'],
      diagnose: [
        { match: 'pent-4-yne', why: 'Number from the end NEARER the triple bond so that it gets the lowest number. Counting from the CH₃ end would call it C4; from the other end it is C1.' },
        { match: 'pentyne', why: 'The parent and the ending are right, but the name needs the number of the triple bond: with five carbons it could be at C1 or C2.' },
        { match: 'pent-1-ene', why: 'The ending -ene is for a C=C. A triple bond ends in -yne.' },
        { match: 'butyne', why: 'Count the carbons in the longest chain through the triple bond: there are five, so the parent is pent-.' }
      ],
      confirm: '<name new="pent-1-yne" old="1-pentyne"></name>: five carbons, triple bond at C1, so it is a terminal alkyne.',
      hints: ['Find the longest chain that contains the triple bond and count its carbons. That gives the stem (meth, eth, prop, but, pent …).', 'Number from the end nearer the triple bond, and write the number of its first carbon before -yne (new style) or in front of the name (old style).'],
      worked: 'Five carbons in a row: pent-. The triple bond starts at the end carbon, so number from that end: C1≡C2. The name is <name new="pent-1-yne" old="1-pentyne"></name>.'
    },
    {
      caveman: {"prompt":"<b>Propyne</b> + <b>one</b> equivalent HBr. H–Br adds across triple bond, as across C=C in Lesson 09. Major product?","reveal":"<b>Vinylic halide</b> (on the C=C): <b>2-bromopropene</b>. Markovnikov again: H to terminal carbon (has the H), Br to more substituted carbon.","options":[{"why":"Yes. H to carbon with H, Br to more substituted (Markovnikov). One equivalent stops at vinylic halide."},{"why":"Br on end carbon: anti-Markovnikov. H to carbon with H, Br to more alkyl groups."},{"why":"Two Br need two equivalents HBr."},{"why":"Br on each carbon: Br₂ product. H–Br adds H, Br."}]}, // CAVEMAN
      id: 's05', type: 'predict', skill: 'alkynes',
      prompt: '<b>Propyne</b> reacts with <b>one</b> equivalent of HBr (one HBr for each alkyne). H–Br adds across the triple bond, as it added across a C=C in Lesson 09. Which major product do you expect?',
      equation: { reactants: ['CC#C'], products: [], cond: 'HBr (1 equiv.)' },
      options: [
        opt(`${mol('C=C(C)Br', '2-bromopropene')}`, true, 'Yes. H goes to the carbon that already has the H, and Br to the more substituted carbon (Markovnikov). One equivalent stops at the vinylic halide, with the C=C still there.', { chk: ['CC#C', 'HBr_1', 'major'] }),
        opt(`${mol('CC=CBr', '1-bromopropene')}`, false, 'That puts Br on the end carbon, the anti-Markovnikov orientation. H goes to the carbon with the H and Br to the carbon with more alkyl groups.', { chk: ['CC#C', 'HBr_1', 'anti'] }),
        opt(`${mol('CC(C)(Br)Br', '2,2-dibromopropane')}`, false, 'Two Br atoms need two equivalents of HBr. With one equivalent the reaction can stop after the first addition.', { chk: ['CC#C', 'HBr_1', 'twice'] }),
        opt(`${mol('C/C(Br)=C\\Br', '(E)-1,2-dibromoprop-1-ene')}`, false, 'That has a Br on each carbon, which is what Br₂ gives. H–Br adds one H and one Br.', { chk: ['CC#C', 'HBr_1', 'vicinal'] })
      ],
      reveal: 'The product is a <b>vinylic halide</b> (“vinylic” means on the C=C): <b>2-bromopropene</b>. The regiochemistry is Markovnikov again: H goes to the terminal carbon (the one with the H) and Br to the more substituted carbon.'
    },
    {
      caveman: {"prompt":"Propyne + <b>two</b> equivalents HBr (excess). Major product?","reveal":"<b>Geminal dihalide</b> (both X on <i>same</i> carbon): <b>2,2-dibromopropane</b>. One equivalent stops at vinylic halide; excess goes on.","options":[{"why":"Yes. Second H–Br Markovnikov too: Br to carbon already with Br: both Br same carbon: geminal."},{"why":"Product of ONE equivalent. Two: vinylic halide C=C reacts with second H–Br."},{"why":"Br on different carbons. Second addition follows Markovnikov’s rule: Br to carbon already with one."},{"why":"Four Br need two equivalents Br₂. Two H–Br: two Br total."}]}, // CAVEMAN
      id: 's06', type: 'predict', skill: 'alkynes',
      prompt: 'Now give propyne an <b>excess</b> of HBr: <b>two</b> equivalents. The vinylic halide still has a C=C. What is the major product?',
      equation: { reactants: ['CC#C'], products: [], cond: 'HBr (2 equiv.)' },
      options: [
        opt(`${mol('CC(C)(Br)Br', '2,2-dibromopropane')}`, true, 'Yes. The second H–Br adds Markovnikov too: Br goes to the carbon that already carries a Br, so both Br atoms end up on the same carbon. That is a geminal dihalide.', { chk: ['CC#C', 'HBr_2', 'major'] }),
        opt(`${mol('C=C(C)Br', '2-bromopropene')}`, false, 'That is the product of ONE equivalent. With two equivalents the C=C of the vinylic halide reacts with a second H–Br.', { chk: ['CC#C', 'HBr_2', 'once'] }),
        opt(`${mol('CC(Br)CBr', '1,2-dibromopropane')}`, false, 'Here the two Br atoms are on different carbons. The second addition follows Markovnikov’s rule too, and that sends Br to the carbon that already has one.', { chk: ['CC#C', 'HBr_2', 'splitX'] }),
        opt(`${mol('CC(Br)(Br)C(Br)Br', '1,1,2,2-tetrabromopropane')}`, false, 'Four Br atoms would need two equivalents of Br₂. Two equivalents of H–Br put in two Br atoms in total.', { chk: ['CC#C', 'HBr_2', 'tetra'] })
      ],
      reveal: 'Two equivalents give a <b>geminal dihalide</b> (<i>geminal</i> = both X on the <i>same</i> carbon): <b>2,2-dibromopropane</b>. One equivalent stops at the vinylic halide; an excess carries on to the dihalide.'
    },
    {
      caveman: {"prompt":"<b>Mechanism</b>, propyne + one H–Br, two steps. <b>1:</b> C≡C π bond attacks H of H–Br, H–Br pair leaves with Br (which carbon bonds H?). <b>2:</b> Br⁻ attacks + carbon.","worked":"Step 1: C≡C π bond → H of H–Br (H to carbon with H); H–Br → Br. + on CH₃ carbon. Step 2: Br⁻ lone pair → + carbon: 2-bromopropene, Br on more substituted carbon.","hints":["Step 1: two arrows: triple bond π bond to H, H–Br bond to Br. First also asks which carbon bonds H. Step 2: one arrow, Br⁻ lone pair.","H to carbon with H (chain end): + on CH₃ carbon. Step 2: Br⁻ lone pair to that + carbon."]}, // CAVEMAN
      id: 's07', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'Draw the <b>mechanism</b> for propyne + one H–Br at book level, in two steps. <b>Step 1:</b> a π bond of the C≡C attacks the H of H–Br, and the H–Br pair leaves with Br (say which carbon bonds to H). <b>Step 2:</b> Br⁻ attacks the carbon that has the + charge.',
      reaction: { reactants: ['CC#C', 'Br'], products: ['C=C(C)Br'] },
      config: { get mech() { return alkyneHXMechanism('CC#C', 'Br'); }, modes: ['draw', 'draw'], drawing: 'skeletal' },
      confirm: 'Step 1 made a vinylic carbocation (the + is on a C=C carbon) by putting H on the end carbon, so the + landed on the carbon with more alkyl groups. Step 2 is a lone pair on Br⁻ going to that carbon: 2-bromopropene.',
      hints: ['Step 1 has two arrows: one from the triple bond (a π bond) to the H of H–Br, and one from the H–Br bond to Br. The first arrow also asks which carbon of the triple bond bonds to H. Step 2 has one arrow from a lone pair on Br⁻.', 'H bonds to the carbon that already has the H (the end of the chain), so the + charge sits on the carbon with the CH₃ group. In step 2 the arrow starts at a lone pair on Br⁻ and ends on that + carbon.'],
      worked: 'Step 1: the C≡C π bond → the H of H–Br (H bonds to the carbon with the H); the H–Br bond → Br. That leaves a + on the CH₃-bearing carbon. Step 2: a lone pair on Br⁻ → the + carbon. The product is 2-bromopropene, with Br on the more substituted carbon.'
    },
    {
      caveman: {"prompt":"<b>Hex-1-yne</b> + <b>one</b> equivalent Br₂ in CH₂Cl₂. Br₂ adds <b>anti</b> (two Br opposite sides of new C=C). Product?","worked":"One equivalent: 1,2-dibromoalkene, C=C left. Anti: Br opposite sides: (E) isomer, as book's (E)-1,2-dibromobut-1-ene. Two equivalents: tetrabromide.","hints":["One equivalent Br₂ uses ONE π bond: C=C left. One Br per carbon.","Anti: Br opposite sides of C=C. Each drawing: same side or opposite?"],"options":[{"why":"Yes. One Br per carbon, opposite sides (anti). Br outranks other group: Br, Br opposite = E."},{"why":"Both Br SAME side. Halogens add anti: opposite sides."},{"why":"Four Br: two equivalents Br₂. One stops at dibromoalkene."},{"why":"No C=C left: two extra H. Br₂ adds two Br, uses one π bond."}]}, // CAVEMAN
      id: 's08', type: 'choice', skill: 'alkynes',
      prompt: '<b>Hex-1-yne</b> reacts with <b>one</b> equivalent of Br₂ in CH₂Cl₂. Br₂ adds across the triple bond with <b>anti</b> stereochemistry (the two Br atoms end up on opposite sides of the new C=C). Which product forms?',
      equation: { reactants: ['CCCCC#C'], products: [], cond: 'Br₂ (1 equiv.)' },
      options: [
        mo('Br/C=C(/Br)CCCC', '(E)-1,2-dibromohex-1-ene', true, 'Yes. One Br on each carbon, on opposite sides of the C=C (anti addition). On each carbon Br outranks the other group, so Br and Br on opposite sides is E.', { chk: ['CCCCC#C', 'Br2_1', 'major'] }),
        mo('Br/C=C(\\Br)CCCC', '(Z)-1,2-dibromohex-1-ene', false, 'Here both Br atoms are on the SAME side of the C=C. Halogens add anti to a triple bond, so they end up on opposite sides.', { chk: ['CCCCC#C', 'Br2_1', 'syn'] }),
        mo('CCCCC(Br)(Br)C(Br)Br', '1,1,2,2-tetrabromohexane', false, 'That has four Br atoms, which takes two equivalents of Br₂. With one equivalent the reaction stops at the dibromoalkene.', { chk: ['CCCCC#C', 'Br2_1', 'tetra'] }),
        mo('CCCCC(Br)CBr', '1,2-dibromohexane', false, 'That has no C=C left, so it has two extra hydrogens. Br₂ adds only the two Br atoms and uses just one of the two π bonds.', { chk: ['CCCCC#C', 'Br2_1', 'hxlike'] })
      ],
      hints: ['One equivalent of Br₂ uses only ONE of the two π bonds, so a C=C is left. One Br goes on each carbon of the former triple bond.', 'Anti means the two Br atoms are on opposite sides of the C=C. Check each drawing: are the two Br on the same side or on opposite sides?'],
      worked: 'One equivalent gives a 1,2-dibromoalkene with a C=C left. Anti addition puts the two Br atoms on opposite sides, which is the (E) isomer, as in the book’s example (E)-1,2-dibromobut-1-ene. Two equivalents would give the tetrabromide.',
      confirm: 'The book gives exactly this pattern for but-1-yne: anti addition of Br₂, (E)-1,2-dibromobut-1-ene. With 2 equivalents it carries on to the 1,1,2,2-tetrabromide.'
    },
    {
      caveman: {"prompt":"<b>But-1-yne</b> + H₂O, H₂SO₄, HgSO₄. OH adds Markovnikov: first product <b>enol</b> (C=C–OH). Unstable: H shifts, O becomes C=O (tautomerises). Collectable product, where is C=O?","worked":"H to C1, OH to C2 (Markovnikov): CH₂=C(OH)CH₂CH₃. Enol tautomerises: H to C1, C=O at C2: CH₃–C(=O)–CH₂CH₃, butan-2-one.","hints":["Enol = C=C with OH on one carbon. O ends double bonded to same carbon; C=C lost.","Markovnikov: OH on more substituted C2. C=O on C2; C1 becomes CH₃."],"options":[{"why":"Yes. C=O on C2, carbon that had OH. Terminal alkyne: methyl ketone."},{"why":"Aldehyde needs OH on terminal carbon: anti-Markovnikov. Alkyne hydration puts OH, so C=O, on more substituted carbon."},{"why":"That is enol, first product. Enol, ketone interconvert fast, ketone favoured: not isolated."},{"why":"No oxygen here. Water adds H and OH: product keeps O."}]}, // CAVEMAN
      id: 's09', type: 'choice', skill: 'alkynes',
      prompt: '<b>But-1-yne</b> is hydrated with H₂O, H₂SO₄ and HgSO₄. OH adds in the Markovnikov sense, so the first product is the <b>enol</b> drawn here (C=C–OH). It does not stay that way: an H shifts and the O becomes double-bonded (it tautomerises). Which structure is the product you can actually collect, and where is its C=O?',
      equation: { reactants: ['C=C(O)CC'], products: [], cond: 'tautomerises' },
      options: [
        mo('CCC(C)=O', 'butan-2-one', true, 'Yes. The enol turns into the ketone: the C=O is on C2, the carbon that carried the OH. A terminal alkyne gives a methyl ketone.', { chk: ['CCC#C', 'H2O_Hg', 'major'] }),
        mo('CCCC=O', 'butanal', false, 'That puts the C=O on the end carbon (an aldehyde), which would need OH on the terminal carbon: anti-Markovnikov. In the hydration of an alkyne the OH, and so the C=O, goes to the more substituted carbon.', { chk: ['CCC#C', 'H2O_Hg', 'aldehyde'] }),
        mo('C=C(O)CC', 'but-1-en-2-ol', false, 'That is the enol, the first product. An enol and its ketone interconvert quickly and the ketone side is strongly favoured, so the enol is not what you isolate.', { chk: ['CCC#C', 'H2O_Hg', 'enol'] }),
        mo('C=CCC', 'but-1-ene', false, 'There is no oxygen in this answer. Water adds H and OH across the triple bond; the product keeps the O.', { chk: ['CCC#C', 'H2O_Hg', 'alkene'] })
      ],
      hints: ['The enol is a C=C with an OH on one of its carbons. Ask what it becomes: the O ends up double bonded to the same carbon that carries the OH, and that carbon loses its C=C.', 'Markovnikov: the OH went to the more substituted carbon (C2). So the C=O is on C2, and C1 becomes a CH₃ group.'],
      worked: 'Water adds H to C1 and OH to C2 (Markovnikov), giving CH₂=C(OH)CH₂CH₃. The enol tautomerises: the OH hydrogen moves to C1 and the O becomes double bonded to C2. The product is CH₃–C(=O)–CH₂CH₃, butan-2-one.'
    },
    {
      caveman: {"html":"<p>Enol, ketone = tautomers: interconvert, equilibrium (⇌) strongly ketone: enols rarely isolated. OH adds Markovnikov: C=O on more substituted carbon. Terminal alkyne: methyl ketone; symmetrical internal: one ketone; unsymmetrical internal: mixture.</p>"}, // CAVEMAN
      id: 's10', type: 'explain', skill: 'alkynes',
      html: '<p><b>Enol and ketone</b> are <b>tautomers</b>: they interconvert rapidly, and the equilibrium (⇌) lies strongly on the ketone side, so enols are rarely isolated. Since OH adds Markovnikov, the C=O lands on the more substituted carbon. A terminal alkyne gives a <b>methyl ketone</b>, a symmetrical internal alkyne gives one ketone, and an unsymmetrical internal alkyne gives a <b>mixture</b> of the two possible ketones.</p>'
    },
    {
      caveman: {"prompt":"Want <b>(Z)-but-2-ene</b> from <b>but-2-yne</b>. Both H same face of old triple bond; STOP at alkene. Which conditions?","worked":"H₂ over Pd/C (2 equivalents) takes triple bond to alkane. Lindlar stops at alkene; both H same face (syn): cis (Z)-but-2-ene.","hints":["Two catalysts add H₂. One goes to alkane. Which stops at alkene?","Syn addition: both H same face: alkyl groups same side: cis. Only Lindlar stops there."],"options":[{"why":"Yes. Lindlar: specially prepared palladium, stops at alkene. Both H same face (syn): CH₃ same side: cis (Z)."},{"why":"Pd/C goes all the way: both π bonds hydrogenated: butane, no C=C."},{"why":"Those hydrate alkyne to butan-2-one. No H₂: no alkene."},{"why":"Adds two Br across triple bond (anti): dibromoalkene, not alkene."}]}, // CAVEMAN
      id: 's11', type: 'choice', skill: 'alkynes',
      prompt: 'You want <b>(Z)-but-2-ene</b> (the model) from <b>but-2-yne</b>. Both H atoms must end up on the same face of the old triple bond, and the reaction must STOP at the alkene. Which conditions do that?',
      visual: { widget: 'model3d', config: { mol: 'cis-but-2-ene', highlight: [0, 1, 2, 3] } },
      options: [
        opt('H₂ with the Lindlar catalyst', true, 'Yes. The Lindlar catalyst is a specially prepared palladium that stops at the alkene. Both H atoms add to the same face (syn), so the two CH₃ groups end up on the same side: the cis (Z) alkene.', { chk: ['CC#CC', 'H2_Lindlar', 'major'] }),
        opt('H₂ (2 equivalents) with Pd/C', false, 'Pd/C is the catalyst for going all the way: both π bonds are hydrogenated and you get butane, with no C=C left.', { chk: ['CC#CC', 'H2_Pd', 'major'] }),
        opt('H₂O, H₂SO₄ and HgSO₄', false, 'Those conditions hydrate the alkyne to butan-2-one. No H₂ is involved, so no alkene forms.', { chk: ['CC#CC', 'H2O_Hg', 'major'] }),
        opt('Br₂ (1 equivalent) in CH₂Cl₂', false, 'That adds two Br atoms across the triple bond (anti), giving a dibromoalkene rather than the alkene itself.', { chk: ['CC#CC', 'Br2_1', 'major'] })
      ],
      hints: ['Two different catalysts do the H₂ addition. One goes all the way to the alkane. Which one is described as stopping at the alkene stage?', 'Syn addition puts both H atoms on the same face, which makes the two alkyl groups end up on the same side: cis. Only the Lindlar catalyst stops at that point.'],
      worked: 'H₂ over Pd/C (2 equivalents) reduces a triple bond to an alkane. The Lindlar catalyst stops at the alkene, and because both H atoms add to the same face (syn), the product is the cis alkene: (Z)-but-2-ene.',
      confirm: 'Lindlar: stops at the cis alkene. Pd/C with 2 equivalents of H₂: the alkane. Watch the catalyst, not just the H₂.'
    },
    {
      caveman: {"prompt":"Acetylene, HC≡CH, pKa 25. <b>Sodium amide</b>, NaNH₂: NH₂⁻, conjugate base of ammonia (pKa ≈ 36). Does NH₂⁻ take H⁺ from acetylene? Tap acid each side, favoured side?","worked":"Left acid acetylene pKa 25; right ammonia pKa ≈ 36. Ammonia weaker acid: right (NH₃, acetylide anion) favoured.","hints":["Acid each side still has H⁺: acetylene left, ammonia right. Negative ions = bases.","Favours weaker acid, larger pKa. Compare 25 with ≈ 36."]}, // CAVEMAN
      id: 's12', type: 'try', skill: 'pka-direction', widget: 'equilibrium-arrow',
      prompt: 'A terminal alkyne has a weakly acidic C–H. In the Lesson 03 table acetylene, HC≡CH, has pKa 25. <b>Sodium amide</b>, NaNH₂, supplies the amide ion NH₂⁻, the conjugate base of ammonia (pKa ≈ 36). Does NH₂⁻ take the H⁺ from acetylene? Tap the acid on each side, then say which side is favoured.',
      reaction: { reactants: ['C#C', '[NH2-]'], products: ['C#[C-]', 'N'] },
      config: { a: 'acetylene', b: 'ammonia' },
      confirm: 'The right side holds the weaker acid (NH₃, pKa ≈ 36, against acetylene’s 25), so it is favoured: amide ion removes the terminal H and the acetylide anion forms.',
      hints: ['The acid on each side is the species that still has an H⁺ to give: acetylene on the left, ammonia on the right. The negative ions are the bases.', 'The equilibrium favours the side with the weaker acid, the one with the larger pKa. Compare 25 with ≈ 36.'],
      worked: 'Left acid: acetylene, pKa 25. Right acid: ammonia, pKa ≈ 36. The larger pKa belongs to ammonia, the weaker acid, so the right side (NH₃ and the acetylide anion) is favoured.'
    },
    {
      caveman: {"prompt":"<b>NaOH</b> instead. Hydroxide HO⁻, conjugate base of water (pKa 15.74). HO⁻ deprotonates acetylene? Two acids, which side wins. (Others: ethoxide, ethanol 16.00; cyanide, HCN 9.31; acetate, acetic acid 4.76. All below 25: too weak.)","worked":"Left acid acetylene, pKa 25. Right: water, 15.74. Acetylene weaker acid: left (acetylene, HO⁻) favoured. No acetylide anion.","hints":["Acetylene acid left; water acid right. Negative ions = bases.","Larger pKa, 25 or 15.74? Favours that weaker acid's side."]}, // CAVEMAN
      id: 's13', type: 'try', skill: 'pka-direction', widget: 'equilibrium-arrow',
      prompt: 'Now try <b>NaOH</b> instead. Hydroxide, HO⁻, is the conjugate base of water (pKa 15.74). Does HO⁻ deprotonate acetylene? Locate the two acids and decide which side wins. (Other bases are tested the same way, with the pKa of their conjugate acid from Lesson 03: ethoxide, from ethanol 16.00; cyanide, from HCN 9.31; acetate, from acetic acid 4.76. All are below 25, so all are too weak.)',
      reaction: { reactants: ['C#C', '[OH-]'], products: ['C#[C-]', 'O'] },
      config: { a: 'acetylene', b: 'water' },
      confirm: 'The left side holds the weaker acid (acetylene, 25, against water, 15.74), so it is favoured: hydroxide is too weak a base to make the acetylide anion.',
      hints: ['Acetylene is the acid on the left; water is the acid on the right. The negative ions are the bases.', 'Which acid has the larger pKa, 25 or 15.74? The equilibrium favours the side that holds that weaker acid.'],
      worked: 'Left acid: acetylene, pKa 25. Right acid: water, pKa 15.74. Acetylene has the larger pKa, so it is the weaker acid and the left side (acetylene and HO⁻) is favoured. HO⁻ does not form the acetylide anion.'
    },
    {
      caveman: {"html":"<p>Terminal alkyne C–H pKa ≈ 25, alkene C–H ≈ 44; water 15.74, NH₃ ≈ 36. Weaker acid favoured: NH₂⁻ removes H, HO⁻ cannot. <b>Acetylide anion</b>: carbon lone pair: base, <b>nucleophile</b>: attacks alkyl halide.</p>"}, // CAVEMAN
      id: 's14', type: 'explain', skill: 'acetylides',
      html: '<p><b>Why NaNH₂ and not NaOH.</b> A terminal alkyne C–H has pKa ≈ 25, an alkene C–H ≈ 44. Water is 15.74 and NH₃ ≈ 36. The equilibrium favours the weaker acid, so NH₂⁻ removes the H and HO⁻ cannot. The <b>acetylide anion</b> has a lone pair on carbon, so it is both a base and a <b>nucleophile</b>: it can attack an alkyl halide.</p>'
    },
    {
      caveman: {"prompt":"<b>Acetylene → propyne</b>. <b>1:</b> amide ion (NaNH₂) removes terminal H⁺. <b>2:</b> acetylide anion attacks carbon of CH₃–Br, C–Br pair leaves with Br. (Chapter 7: substitution; here just electron flow.)","worked":"Step 1: N lone pair → H; C–H → C (C⁻). Step 2: acetylide lone pair → carbon of CH₃Br; C–Br → Br. Propyne, Br⁻, NH₃.","hints":["Step 1: two arrows: N lone pair to H, C–H bond to carbon (lone pair). Step 2: two: acetylide lone pair to CH₃Br carbon, C–Br bond to Br.","Arrows start at electrons, point to destination. New bond to CH₃ carbon from acetylide lone pair; Br takes C–Br pair."]}, // CAVEMAN
      id: 's15', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'Draw the mechanism of <b>acetylene → propyne</b>. <b>Step 1:</b> the amide ion (from NaNH₂) removes the terminal H as H⁺. <b>Step 2:</b> the acetylide anion attacks the carbon of CH₃–Br and the C–Br bond pair leaves with Br. (The book studies this substitution in Chapter 7; for now it is just the electron flow, drawn as one step.)',
      reaction: { reactants: ['C#C', '[NH2-]', 'CBr'], products: ['CC#C', 'N', '[Br-]'] },
      config: { get mech() { return acetylideAlkylationMechanism('C#C', 'CBr'); }, mode: 'draw', drawing: 'skeletal' },
      confirm: 'Step 2 made a new C–C bond: the acetylide lone pair became the bond to the CH₃ carbon, and the C–Br pair left with Br. The chain is one carbon longer. This is how a larger alkyne is built from a smaller one.',
      hints: ['Step 1 has two arrows: a lone pair on N goes to the H, and the C–H bond goes to the carbon (it becomes a lone pair there). Step 2 has two arrows: the acetylide lone pair goes to the carbon of CH₃Br, and the C–Br bond goes to Br.', 'Arrows start at electrons and point to where they end up. The new bond to the CH₃ carbon comes from the acetylide’s lone pair; the Br takes the pair of the C–Br bond it leaves with.'],
      worked: 'Step 1: lone pair on N → H; C–H bond → C (now C⁻ with a lone pair). Step 2: lone pair on the acetylide carbon → the carbon of CH₃Br; the C–Br bond → Br. Products: propyne and Br⁻ (and NH₃ from step 1).'
    },
    {
      caveman: {"prompt":"<b>4-Methylpent-2-yne</b>, CH₃–C≡C–CH(CH₃)₂ <mol smiles=\"CC#CC(C)C\" label=\"4-methylpent-2-yne\"></mol>: two ways on paper, new bond next to CH₃ or next to isopropyl. One route works. Which?","worked":"Cut at triple bond. Isopropyl side: (CH₃)₂CHBr, secondary: fails. Methyl side: CH₃Br, fine. Start from 3-methylbut-1-yne (has isopropyl), NaNH₂ for acetylide, add CH₃Br.","hints":["Halide must be primary or methyl, RCH₂X. Which possible halide is not?","Isopropyl cannot come from halide: part of starting alkyne. Only methyl left for halide."],"options":[{"why":"Yes. Acetylide attacks CH₃Br, methyl halide: works. Branched piece in alkyne, not halide."},{"why":"(CH₃)₂CHBr SECONDARY. Acetylide works only with primary (RCH₂X), methyl halides."},{"why":"Hydroxide too weak: water pKa (15.74) below alkyne (≈ 25): almost no acetylide."},{"why":"Wrong order: NaNH₂ FIRST. Alkyne ignores CH₃Br."}]}, // CAVEMAN
      id: 's16', type: 'choice', skill: 'acetylides',
      prompt: '<b>4-Methylpent-2-yne</b>, CH₃–C≡C–CH(CH₃)₂ <mol smiles="CC#CC(C)C" label="4-methylpent-2-yne"></mol>, can be built in two ways on paper, depending on which side of the C≡C the new bond is made (next to CH₃, or next to the isopropyl group). Only one route works. Which one?',
      options: [
        opt('3-Methylbut-1-yne, NaNH₂, then CH₃Br', true, 'Yes. The acetylide of 3-methylbut-1-yne attacks CH₃Br, a methyl halide, which works. The branched piece is built into the alkyne, not into the halide.', { chk: { start: 'CC(C)C#C', target: 'CC#CC(C)C', cards: ['NaNH2', 'CH3Br'], ok: true } }),
        opt('Propyne, NaNH₂, then (CH₃)₂CHBr', false, '(CH₃)₂CHBr is a SECONDARY alkyl halide. Only primary (RCH₂X) and methyl halides work with an acetylide; the book explains why in Chapter 7.', { chk: { start: 'CC#C', target: 'CC#CC(C)C', cards: ['NaNH2', 'iPrBr'], ok: false, code: 'notPrimary' } }),
        opt('3-Methylbut-1-yne, NaOH, then CH₃Br', false, 'Hydroxide is too weak: water’s pKa (15.74) is below the alkyne’s (≈ 25), so almost no acetylide forms and the alkyl halide has nothing to react with.', { chk: { start: 'CC(C)C#C', target: 'CC#CC(C)C', cards: ['NaOH', 'CH3Br'], ok: false, code: 'weakBase' } }),
        opt('3-Methylbut-1-yne, CH₃Br, then NaNH₂', false, 'The order is wrong. A neutral alkyne does not react with CH₃Br: NaNH₂ must make the acetylide anion FIRST.', { chk: { start: 'CC(C)C#C', target: 'CC#CC(C)C', cards: ['CH3Br', 'NaNH2'], ok: false, code: 'noAnion' } })
      ],
      hints: ['Whatever alkyl halide you use must be a primary or methyl halide, RCH₂X. Which of the two possible halides here is not?', 'If the isopropyl group cannot come from a halide, it has to be part of the alkyne you start with. Then only a methyl group is left for the halide to add.'],
      worked: 'Cut the molecule at the triple bond. The isopropyl side would need (CH₃)₂CHBr, a secondary halide, which fails. The methyl side needs CH₃Br, which is fine. So start from 3-methylbut-1-yne (the isopropyl is already in it), make its acetylide with NaNH₂, then add CH₃Br.',
      confirm: 'Only primary (and methyl) halides: the acetylide has to attack the carbon from one side and that is easy only on a CH₃ or RCH₂ carbon. Put the branching in the alkyne instead.'
    },
    {
      caveman: {"problem":"hexan-2-one <mol smiles=\"CCCCC(C)=O\" label=\"hexan-2-one\"></mol> from acetylene, any halide: synthesis, backwards.","rule":"Plan <b>backwards</b>: last step first (ketone: alkyne hydration giving ONE ketone; cis alkene: Lindlar), then skeleton: acetylide + <b>primary</b> alkyl halide. NaNH₂ before halide.","moves":[{"ask":"Methyl ketone, C=O on C2. Which alkyne hydrated (H₂O, H₂SO₄, HgSO₄) gives exactly it?","options":[{"why":"Yes. OH on more substituted C2, enol tautomerises: C=O on C2. Terminal alkyne: that one ketone."},{"why":"Hex-2-yne: OH on C2 or C3 equally: MIXTURE hexan-2-one, hexan-3-one."},{"why":"H₃O⁺ gives alkene alcohol (Lesson 09), not ketone."}]},{"ask":"Hex-1-yne = HC≡C–CH₂CH₂CH₂CH₃ from acetylene: which halide?","options":[{"why":"Yes. HC≡C⁻ + CH₃CH₂CH₂CH₂Br gives HC≡C–CH₂CH₂CH₂CH₃: 2 + 4 = 6 carbons."},{"why":"2-Bromobutane secondary: fails with acetylide. Also branched sec-butyl, not unbranched."},{"why":"CH₃Br adds one carbon: propyne. Halide must give four."}]},{"ask":"Which reagent sequence?","then":"Check: 2 C + butyl 4 C = 6 C, C=O on C2.","options":[{"why":"Yes. Acetylide, lengthen to hex-1-yne, hydrate to methyl ketone."},{"why":"Hydrating first uses up triple bond: no chain to build (acetylene gives no ketone)."},{"why":"Lindlar gives alkene: no acidic C–H, no acetylide, not ketone."}]}]}, // CAVEMAN
      id: 's17', type: 'worked', skill: 'synthesis',
      problem: 'Plan a synthesis of <b>hexan-2-one</b> <mol smiles="CCCCC(C)=O" label="hexan-2-one"></mol> from <b>acetylene</b> and any alkyl halide. Work backwards, one decision at a time.',
      moves: [
        {
          ask: 'The target is a ketone with the C=O on C2 (a methyl ketone). Which alkyne would hydration (H₂O, H₂SO₄, HgSO₄) turn into exactly this ketone?',
          options: [
            opt('Hex-1-yne, a terminal alkyne: the C=O lands on C2 and the product is a single methyl ketone', true, 'Yes. OH adds to the more substituted carbon (C2), and the enol tautomerises, so the C=O ends up on C2. A terminal alkyne gives only that one ketone.'),
            opt('Hex-2-yne, an unsymmetrical internal alkyne', false, 'Hydration of hex-2-yne puts OH on C2 or on C3 with equal ease, so it gives a MIXTURE of hexan-2-one and hexan-3-one.'),
            opt('Hex-1-ene, with the same reagents', false, 'An alkene is hydrated by H₃O⁺ to an alcohol (Lesson 09), not to a ketone. The ketone comes from the alkyne.')
          ]
        },
        {
          ask: 'Hex-1-yne is HC≡C–CH₂CH₂CH₂CH₃. Starting from acetylene (HC≡CH), which bond must you make, and with which alkyl halide?',
          options: [
            opt('Bond the acetylide carbon to a butyl group, using 1-bromobutane (a primary halide)', true, 'Yes. HC≡C⁻ plus CH₃CH₂CH₂CH₂Br gives HC≡C–CH₂CH₂CH₂CH₃. That is 2 carbons from acetylene plus 4 from the halide: 6 in all.'),
            opt('Use 2-bromobutane to add the butyl group', false, '2-Bromobutane is a secondary halide, and secondary halides do not work with acetylide anions. It would also put a branched sec-butyl group in, not an unbranched chain.'),
            opt('Use bromomethane, because only one carbon is needed', false, 'CH₃Br adds only one carbon and gives propyne. The target has six carbons, so the halide must supply four.')
          ]
        },
        {
          ask: 'Which sequence of reagents does the whole job?',
          options: [
            opt('NaNH₂, then CH₃CH₂CH₂CH₂Br, then H₂O with H₂SO₄ and HgSO₄', true, 'Yes. Make the acetylide, lengthen the chain to hex-1-yne, then hydrate the triple bond to the methyl ketone.'),
            opt('H₂O with H₂SO₄ and HgSO₄ first, then NaNH₂ and CH₃CH₂CH₂CH₂Br', false, 'Hydrating first uses up the triple bond, so there is no alkyne left to build the chain from (and acetylene would not even give a ketone).'),
            opt('NaNH₂, then H₂, Lindlar catalyst, then CH₃CH₂CH₂CH₂Br', false, 'Lindlar turns the alkyne into an alkene, which has no acidic C–H and no way to form an acetylide, and it is not a ketone either.')
          ],
          then: 'Check: acetylene (2 C) + butyl (4 C) = 6 carbons, and hydration puts the C=O on C2.',
          figure: { smiles: 'CCCCC(C)=O', label: 'hexan-2-one' }
        }
      ],
      rule: 'Plan <b>backwards</b>: decide what the last step makes (a ketone needs hydration of an alkyne that gives ONE ketone; a cis alkene needs Lindlar), then build the carbon skeleton earlier with an acetylide and a <b>primary</b> alkyl halide. NaNH₂ always comes before the halide.'
    },
    {
      caveman: {"prompt":"Make <b>(Z)-hex-2-ene</b> from <b>propyne</b>. Tap reagent cards, order them, <b>Run the plan</b>. Wrong card or order tells why.","worked":"(1) NaNH₂: acetylide anion. (2) CH₃CH₂CH₂Br: hex-2-yne. (3) H₂, Lindlar: (Z)-hex-2-ene. (CH₃)₂CHBr secondary, NaOH too weak, Pd/C: alkane, hydration: ketone.","hints":["Start from target: cis C=C from alkyne, H₂, Lindlar. Alkyne: triple bond C2–C3, six carbons. Propyne three.","Add three carbons at terminal carbon: acetylide (NaNH₂), PRIMARY three-carbon halide, then Lindlar."]}, // CAVEMAN
      id: 's18', type: 'try', skill: 'synthesis', widget: 'synthesis-planner',
      prompt: 'Your turn: make <b>(Z)-hex-2-ene</b> from <b>propyne</b>. Tap reagent cards to build the plan, put them in order, then press <b>Run the plan</b>. The plan is run on the real reaction rules, so a wrong card or a wrong order tells you why.',
      config: { start: 'CC#C', target: 'C/C=C\\CCC', deck: ['NaNH2', 'PrBr', 'H2_Lindlar', 'H2_Pd', 'iPrBr', 'NaOH', 'H2O_Hg'] },
      confirm: 'NaNH₂ makes the acetylide, CH₃CH₂CH₂Br adds three carbons to give hex-2-yne, and H₂ with the Lindlar catalyst stops at the cis alkene. Pd/C would have gone to hexane.',
      hints: ['Start from the target: a cis C=C comes from an alkyne and H₂ with the Lindlar catalyst. The alkyne you need has the triple bond between C2 and C3 and six carbons in all. Propyne has three carbons.', 'Propyne needs three more carbons on its terminal carbon. Make the acetylide first (NaNH₂), then add a PRIMARY alkyl halide with three carbons, and only then reduce with Lindlar.'],
      worked: 'Order: (1) NaNH₂ turns propyne into its acetylide anion. (2) CH₃CH₂CH₂Br adds three carbons: hex-2-yne. (3) H₂ with the Lindlar catalyst gives (Z)-hex-2-ene. (CH₃)₂CHBr is secondary, NaOH is too weak, Pd/C goes to the alkane, and hydration gives a ketone.'
    },
    {
      caveman: {"prompt":"Lab, alkynes. Pick alkyne and reagent, predict product BEFORE lab. Watch equivalents, C=O position, alkene geometry. Two right, two different alkynes.","worked":"Hex-1-yne + HBr (1): 2-bromohex-1-ene; (2): 2,2-dibromohexane; Br₂ (1): (E)-1,2-dibromohex-1-ene; H₂O/HgSO₄: hexan-2-one; H₂/Lindlar: hex-1-ene; H₂/Pd: hexane","hints":["First equivalents: 1 HX or X₂ stops at C=C; 2 use both π bonds. H₂: which catalyst. Water, HgSO₄: ketone.","Wrong geometry (Z where anti gives E), C=O at chain end, or wrong halogen count: other reaction. Match reagent to product groups."]}, // CAVEMAN
      id: 's19', type: 'try', skill: 'alkynes', widget: 'reaction-lab',
      prompt: 'Back to the lab, now with alkynes. Pick an alkyne and a reagent and predict the product BEFORE the lab shows it. Watch the number of equivalents, the position of the C=O, and the geometry of any alkene. Get two predictions right, using at least two different alkynes.',
      config: { need: 2, alkynes: ['propyne', 'but-1-yne', 'but-2-yne', 'hex-1-yne', 'hex-3-yne'], reagents: ['HBr_1', 'HBr_2', 'Br2_1', 'Br2_2', 'H2O_Hg', 'H2_Lindlar', 'H2_Pd'] },
      confirm: 'Two predictions right. You counted the equivalents, used Markovnikov for H–X and for the OH of the hydration, kept the Br atoms anti, and chose Lindlar for the cis alkene and Pd/C for the alkane.',
      hints: ['Ask first how many equivalents: 1 equivalent of HX or X₂ stops at the C=C; 2 equivalents use both π bonds. For H₂, ask which catalyst. For water with HgSO₄, expect a ketone.', 'If an answer has the wrong geometry (Z where anti addition gives E), or the C=O on the end carbon, or the wrong number of halogens, it belongs to a different reaction. Check the reagent against the product’s functional groups.'],
      worked: 'For example: hex-1-yne + HBr (1 equiv.) gives 2-bromohex-1-ene; + HBr (2 equiv.) gives 2,2-dibromohexane; + Br₂ (1 equiv.) gives (E)-1,2-dibromohex-1-ene; + water with HgSO₄ gives hexan-2-one; + H₂/Lindlar gives hex-1-ene; + H₂/Pd gives hexane.'
    },
    {
      caveman: {"html":"<p>HX, X₂ add once (vinylic halide, anti dihalide) or twice (geminal dihalide, tetrahalide). H₂O, H₂SO₄, HgSO₄: enol, ketone. H₂/Pd/C: alkane; H₂/Lindlar: cis alkene. NaNH₂ deprotonates terminal alkyne; acetylide + primary alkyl halide: alkyne.</p>"}, // CAVEMAN
      id: 's20', type: 'explain', skill: 'alkynes',
      html: '<p><b>Recap.</b> HX and X₂ add once (vinylic halide; anti 1,2-dihalide) or twice (geminal dihalide; tetrahalide). H₂O with H₂SO₄ and HgSO₄ gives an enol, then a ketone. H₂/Pd/C gives the alkane, H₂/Lindlar the cis alkene. NaNH₂ deprotonates a terminal alkyne; the acetylide plus a <b>primary</b> alkyl halide builds a longer alkyne. Plan backwards: skeleton first, then the functional group.</p>'
    }
  ],
  mastery: { count: 3, generator: 'alkynes' },
  useIt: {
    book: ['4.16', '4.17', '4.18', '4.19', '4.20', '4.22', '4.24', '4.28', '4.30', '4.37', '4.38', '4.43', '4.45', '4.46', '4.47', '4.59'],
    endFrom: 21,
    note: 'In-chapter: 4.16 (name alkynes), 4.17 (products of HBr, Cl₂ and Lindlar reductions), 4.18 (hydrate oct-4-yne), 4.19 (which alkynes hydrate to given ketones), 4.20 (which alkyne and alkyl halide make given alkynes; list both routes where two work). End of chapter: 4.22 and 4.24 (models: Lindlar and hydration products, and the alkyne a product came from), 4.28 and 4.30 (draw from names; the pentyne isomers), 4.37 and 4.38 (hex-1-yne and dec-5-yne with several reagents), 4.43 (alkynes to hydrate), 4.45 (what is wrong with each reaction; part c is a hydration), 4.46 and 4.47 (multi-step plans from propyne and from but-1-yne) and 4.59 (a cis alkene from acetylene). Plan backwards and write the primary alkyl halide each time.'
  }
});
