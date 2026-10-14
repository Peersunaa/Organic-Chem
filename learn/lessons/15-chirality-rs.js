// Lesson 15: Chirality & R/S (McMurry ch. 6, sections 6.1 to 6.5).
// Original wording throughout; book problems are referenced by number only.
// Every chirality center, every R/S label and every drawing comes from engine/cip.js + engine/chirality.js (checked against Python RDKit in the tests);
// the 3D mirror images are RDKit coordinates reflected through a plane (data/3d/chiral.js); every name is checked against OPSIN.

export default {
  id: '15', slug: 'chirality-rs', title: 'Chirality & R/S', minutes: 30,
  chapter: 6, sections: ['6.1', '6.2', '6.3', '6.4', '6.5'],
  drawing: 'skeletal',
  goals: [
    'Decide whether a molecule is chiral (no plane of symmetry, mirror image not superimposable) and find its chirality centers',
    'Calculate a specific rotation [α]D from polarimeter data, and say why + and − have nothing to do with R and S',
    'Assign R or S to a chirality center from a 3D model or a wedge/dash drawing, and write names with an (R) or (S) prefix'
  ],
  steps: [
    {
      id: 's01', type: 'predict', skill: 'chirality',
      prompt: 'Look at your two hands. Hold your right hand up to a mirror: the reflection looks like one of your hands. Which one? And could you lay a copy of that reflected hand exactly on top of your real right hand, palms facing the same way?',
      options: [
        { text: 'It looks like a left hand, and no way of turning it makes it sit exactly on the right hand', correct: true, why: 'Yes. A mirror swaps left and right, so a right hand becomes a left hand. Try a left glove on your right hand: however you turn it, it does not fit.' },
        { text: 'It looks like a right hand, so it lies exactly on top', why: 'A mirror reverses handedness: the thumb ends up on the other side. The reflection of a right hand looks like a left hand, not like a second right hand.' },
        { text: 'It looks like a left hand, but turning it over makes it fit exactly', why: 'Turning a left hand over puts the thumb back on the right side, but now the palm faces the wrong way. No single turn fixes both at once.' },
        { text: 'A mirror does not change a shape, so it is the same hand', why: 'A mirror image keeps every distance, but it flips the handedness: it is the same shape built the other way round, and that is not the same object.' }
      ],
      reveal: 'An object that cannot be superimposed on its own mirror image is <b>chiral</b> (from the Greek word for hand). A pair of hands is a pair of mirror images that cannot be superimposed. A plain ball or an ordinary mug is its own mirror image. Molecules can have a handedness too.'
    },
    {
      id: 's02', type: 'predict', skill: 'chirality',
      prompt: 'Two small molecules: A is CH₂ClBr and B is CHFClBr. Which do you expect to have a mirror image that cannot be placed exactly on top of it?',
      figures: [{ smiles: 'ClCBr', label: 'A  CH₂ClBr' }, { smiles: 'FC(Cl)Br', label: 'B  CHFClBr' }],
      options: [
        { text: 'B only', correct: true, why: 'Good guess. B has four different atoms around its carbon (H, F, Cl and Br), and that is what makes handedness possible. The models in the next step will test it.' },
        { text: 'A only', why: 'A has two identical hydrogens on its carbon. Swapping two identical atoms changes nothing, which usually removes the handedness.' },
        { text: 'Both of them', why: 'Handedness needs a carbon whose four attached atoms or groups are all different. A has two identical H atoms, so only one of the two can be handed.' },
        { text: 'Neither: only big molecules can be chiral', why: 'Size has nothing to do with it. A single carbon with four different atoms on it is enough.' }
      ],
      reveal: 'Test it with models. Each model below comes with its <b>true mirror image</b> (the same 3D coordinates reflected through a plane), and the computer tries every way of turning one onto the other.'
    },
    {
      id: 's03', type: 'try', skill: 'chirality', widget: 'mirror-pair',
      prompt: 'Three molecules, each next to its mirror image. Turn the models if you like, press <b>Try to superimpose</b>, then decide for each one: chiral or achiral?',
      config: { models: ['chfclbr', 'ch2clbr', 'butan-2-ol'], titles: { chfclbr: 'CHFClBr', ch2clbr: 'CH₂ClBr', 'butan-2-ol': 'CH₃CH(OH)CH₂CH₃' } },
      confirm: 'CHFClBr and CH₃CH(OH)CH₂CH₃ cannot be superimposed on their mirror images, so each one is <b>chiral</b> (the pair are <b>enantiomers</b>). CH₂ClBr lands exactly on its mirror image once its two H atoms swap places: it is achiral.',
      hints: ['Press “Try to superimpose” and read the report: do all the atoms of the mirror image land on partner atoms?', 'In the overlay, an atom that cannot land is drawn as a ghost with a red dashed line. If any atom stays off, no turn can fix it, and the molecule is chiral.'],
      worked: 'The computer tries every allowed way of pairing the atoms and every turn of the mirror image. For CH₂ClBr it finds a perfect match (the two identical H atoms trade places), so it is achiral. For CHFClBr and for CH₃CH(OH)CH₂CH₃ (<name new="butan-2-ol" old="2-butanol"></name>) some atoms always stay off their partners, so those two are chiral.'
    },
    {
      id: 's04', type: 'explain', skill: 'chirality',
      html: '<p>The usual cause of handedness is a <b>chirality center</b> (stereocenter): an sp³ carbon bonded to <b>four different groups</b>, counting H as a group. In CHFClBr the carbon has H, F, Cl and Br, so it is a center. In CH₂ClBr it has two H, so it is not.</p><p>Never centers: CH₃, CH₂, and any sp² or sp carbon (C=O, C=C, benzene rings). A pair of mirror-image molecules are <b>enantiomers</b>.</p>'
    },
    {
      id: 's05', type: 'try', skill: 'chirality', widget: 'stereocenter-finder',
      prompt: 'Find the chirality centers in each molecule.',
      config: { rounds: [{ smiles: 'CCC(C)O' }, { smiles: 'CC(C)O' }, { smiles: 'CCC(O)CC' }] },
      confirm: '<name new="butan-2-ol" old="2-butanol"></name> has one center, C2, which carries H, OH, CH₃ and CH₂CH₃. <name new="propan-2-ol" old="2-propanol"></name> and <name new="pentan-3-ol" old="3-pentanol"></name> have none: the carbon holding the OH has two identical groups (two CH₃, or two CH₂CH₃).',
      hints: ['For each sp³ carbon write down its four groups, counting an undrawn H. Are all four different?', 'In <name new="propan-2-ol" old="2-propanol"></name> the carbon with the OH carries H, OH and two CH₃ groups. Two identical groups means it is not a center.'],
      worked: '<name new="butan-2-ol" old="2-butanol"></name>: C2 has H, OH, CH₃ and CH₂CH₃, four different groups, so one center. <name new="propan-2-ol" old="2-propanol"></name>: C2 has two CH₃, no center. <name new="pentan-3-ol" old="3-pentanol"></name>: C3 has two CH₂CH₃, no center. Only <name new="butan-2-ol" old="2-butanol"></name> is chiral.'
    },
    {
      id: 's06', type: 'try', skill: 'chirality', widget: 'stereocenter-finder',
      prompt: 'Rings and a benzene ring now. Find the chirality centers (or say there is none). In a ring, the two directions around the ring count as two groups, and they are different only if the ring is different on its two sides.',
      config: { rounds: [{ smiles: 'CC1CCCCC1' }, { smiles: 'CC1(O)CCCCC1' }, { smiles: 'CC1CCCCC1=O' }, { smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O' }] },
      confirm: 'Methylcyclohexane and 1-methylcyclohexanol have none: going either way round the ring from the carbon with CH₃ you meet the same atoms. 2-Methylcyclohexanone has one (C2: CH₃, H, the C=O side and the CH₂ side). Ibuprofen has one: the carbon with H, CH₃, CO₂H and the benzene ring.',
      hints: ['Ask of each sp³ carbon: are its two ring directions different? If you can walk both ways round and meet identical atoms, they are one group.', 'A C=O carbon or a benzene carbon is sp² and can never be a center. The CH(CH₃) carbons next to them are the ones to inspect.'],
      worked: 'Methylcyclohexane and 1-methylcyclohexanol: the ring is symmetrical about that carbon, so its two ring directions are identical (no center). 2-Methylcyclohexanone: C2 has CH₃, H, C1 (the C=O) and C3 (a CH₂), four different groups. Ibuprofen: only the CH(CH₃)CO₂H carbon has four different groups.'
    },
    {
      id: 's07', type: 'try', skill: 'chirality', widget: 'mirror-pair',
      prompt: 'A chiral molecule has no plane of symmetry. Here is CH₂ClBr with a plane drawn through three of its atoms. Which atoms lie in the plane? Then decide whether the molecule is chiral.',
      config: { mode: 'plane', model: 'ch2clbr', titles: { ch2clbr: 'CH₂ClBr' } },
      confirm: 'The plane passes through C, Cl and Br. The two H atoms sit on opposite sides at equal distances, mirror partners across the plane. A molecule with a plane of symmetry is its own mirror image: achiral.',
      hints: ['Turn the model until the plane looks like a line. Which atoms sit right on that line?', 'The two H atoms are on opposite faces of the plane, one on each side, so neither is in it.'],
      worked: 'C, Cl and Br lie in the plane (it was drawn through them). Each H is on one side of the plane, with an identical H directly opposite it on the other side. Reflecting the molecule through this plane gives the molecule back, so it has a plane of symmetry and is achiral.'
    },
    {
      id: 's08', type: 'predict', skill: 'chirality',
      prompt: 'One enantiomer, dissolved in a polarimeter tube, turns the plane of polarized light by +12°. You then fill the same tube with the same concentration of its mirror-image molecule. What reading do you expect?',
      options: [
        { text: '−12°: the same amount, in the opposite direction', correct: true, why: 'Yes. Enantiomers have identical physical properties except that they turn polarized light by equal amounts in opposite directions.' },
        { text: '+12°: a mirror image behaves the same in every way', why: 'In almost every way it does (melting point, boiling point, density). Turning polarized light is the exception: it reverses sign.' },
        { text: '0°: the mirror image cancels it', why: 'Cancelling happens in a 50:50 mixture of the two (a racemic mixture), not in a pure sample of one enantiomer.' },
        { text: '+24°: it doubles', why: 'Nothing adds up here: each pure enantiomer gives its own reading, equal in size and opposite in direction.' }
      ],
      reveal: 'Enantiomers are <b>optically active</b>: they rotate the plane of polarized light by equal amounts in opposite directions. A 50:50 mixture shows no rotation at all.'
    },
    {
      id: 's09', type: 'explain', skill: 'chirality',
      html: '<p>A <b>polarimeter</b> sends plane-polarized light through a solution and measures how far the plane turns, α. Clockwise is <b>dextrorotatory (+)</b>; counterclockwise is <b>levorotatory (−)</b>. <b>[α]D = α ÷ (l × c)</b>, with l in dm and c in g/mL.</p><p>In 1848 Pasteur hand-sorted two kinds of mirror-image tartrate crystals: their solutions turned light equally in opposite directions.</p>'
    },
    {
      id: 's10', type: 'input', skill: 'chirality',
      prompt: 'A polarimeter tube is 20.0 cm long. It holds 2.40 g of an optically active compound dissolved in 12.0 mL of solvent, and the observed rotation is −1.30°. Calculate [α]D. Write the sign; an answer within 0.1 is accepted.',
      answer: -3.25, tolerance: 0.1,
      diagnose: [
        { match: -0.325, why: 'You used the length in centimetres. The tube length must be in decimetres: 20.0 cm = 2.00 dm.' },
        { match: 3.25, why: 'The size is right but the sign is flipped. [α]D has the same sign as the observed rotation, here negative (levorotatory).' },
        { match: -0.65, why: 'You divided by the length only. Also divide by the concentration, c = 2.40 g ÷ 12.0 mL = 0.200 g/mL.' },
        { match: -6.5, why: 'You left out the path length. Divide by l × c = 2.00 dm × 0.200 g/mL.' }
      ],
      confirm: 'l = 20.0 cm = 2.00 dm and c = 2.40 g ÷ 12.0 mL = 0.200 g/mL, so [α]D = −1.30 ÷ (2.00 × 0.200) = −3.25 (about −3.3).',
      hints: ['[α]D = α ÷ (l × c). The length l must be in decimetres (10 cm = 1 dm) and the concentration c in g/mL.', 'c = 2.40 g ÷ 12.0 mL. Then divide −1.30 by l × c.'],
      worked: 'l = 20.0 cm = 2.00 dm. c = 2.40 g ÷ 12.0 mL = 0.200 g/mL. [α]D = −1.30° ÷ (2.00 dm × 0.200 g/mL) = −1.30 ÷ 0.400 = −3.25, about −3.3.'
    },
    {
      id: 's11', type: 'choice', skill: 'chirality',
      prompt: 'Two natural compounds are both <b>R</b>: (R)-limonene, from orange peel, and (R)-carvone, from spearmint. Measured with a polarimeter, (R)-limonene is dextrorotatory (+) and (R)-carvone is levorotatory (−). What does that tell you?',
      figures: [{ smiles: 'CC1=CC[C@@H](CC1)C(C)=C', label: '(R)-limonene (+)' }, { smiles: 'CC1=CC[C@H](CC1=O)C(C)=C', label: '(R)-carvone (−)' }],
      options: [
        { text: 'The sign of the rotation is measured; it cannot be worked out from R or S', correct: true, why: 'Yes. R and S come from the CIP rules applied to the structure; (+) and (−) come from an experiment. Two compounds can both be R and still turn light in opposite directions.' },
        { text: 'R means (+), so the carvone measurement must be wrong', why: 'There is no such rule. Both measurements are correct, and (R)-carvone really is (−).' },
        { text: 'R means (−) whenever the molecule contains a C=O', why: 'No rule like that exists. Limonene is R and (+), carvone is R and (−): the sign cannot be predicted from the label or from the functional groups.' },
        { text: 'One of the two must really be S', why: 'Both are R. The configuration label and the direction of rotation are two unrelated pieces of information.' }
      ],
      hints: ['The labels R and S are worked out from the drawing. Where does the sign (+ or −) come from?', 'Both compounds are R, but one is (+) and one is (−). So the label cannot determine the sign.'],
      worked: 'R and S are assigned by ranking groups with the CIP rules, which uses only the structure. The sign of rotation is a physical measurement. Here two R compounds have opposite signs, so there is no link between R/S and +/−.',
      confirm: 'R/S is read from the structure; (+)/(−) is read from a polarimeter. There is no relation between them.'
    },
    {
      id: 's12', type: 'try', skill: 'rs', widget: 'rs-assigner',
      prompt: 'Now the R/S recipe, on a real 3D model of CHFClBr. Tap the four groups from priority 1 to 4 (higher atomic number first), turn the model so that group 4 points away from you, follow 1 → 2 → 3, and decide: R or S?',
      config: { mode: '3d', model: 'chfclbr', which: 'molblock' },
      confirm: 'Br (35) &gt; Cl (17) &gt; F (9) &gt; H (1). With H pointing away, Br → Cl → F runs clockwise: <b>R</b>.',
      hints: ['Rank by atomic number: the biggest number is 1, and H is always 4.', 'Press “Point 4 away”, then follow the curve from 1 to 2 to 3: clockwise is R, counterclockwise is S.'],
      worked: 'Br is 1, Cl is 2, F is 3 and H is 4. With H behind the carbon, Br → Cl → F goes clockwise, so the center is R.'
    },
    {
      id: 's13', type: 'explain', skill: 'rs',
      html: '<p><b>R/S in three moves.</b> 1 Rank the four groups (the CIP rules of Lesson 7). 2 Turn the molecule so group 4, the lowest, points <b>away</b> from you. 3 Follow 1 → 2 → 3: <b>clockwise = R</b> (<i>rectus</i>), <b>counterclockwise = S</b> (<i>sinister</i>).</p><p>Two traps in step 1: the first atom decides before size does, and a C=O counts its oxygen twice (CHO is (O,O,H)).</p>'
    },
    {
      id: 's14', type: 'try', skill: 'rs', widget: 'rs-assigner',
      prompt: '<name new="butan-2-ol" old="2-butanol"></name>, in 3D. Two of its groups start with carbon, so press <b>Go one atom further</b> if you need to. R or S?',
      config: { mode: '3d', model: 'butan-2-ol', which: 'mirror' },
      confirm: 'OH (O) &gt; CH₂CH₃ (C,H,H) &gt; CH₃ (H,H,H) &gt; H. With H behind, OH → CH₂CH₃ → CH₃ runs counterclockwise: <b>S</b>.',
      hints: ['O outranks C at the first atom. The ethyl and methyl groups both start with C, so compare what is attached to those carbons.', 'Ethyl is (C,H,H), methyl is (H,H,H): ethyl wins at the first difference. Then put H behind and follow 1 → 2 → 3.'],
      worked: 'OH is 1. Ethyl (C,H,H) beats methyl (H,H,H), so CH₂CH₃ is 2 and CH₃ is 3; H is 4. With H pointing away, 1 → 2 → 3 turns counterclockwise: S.'
    },
    {
      id: 's15', type: 'try', skill: 'rs', widget: 'rs-assigner',
      prompt: 'Glyceraldehyde, HOCH₂–CH(OH)–CHO, in 3D. Two of its groups have an O on the first carbon. Use <b>Go one atom further</b> and remember the C=O. R or S?',
      config: { mode: '3d', model: 'glyceraldehyde', which: 'molblock' },
      confirm: 'OH &gt; CHO (O,O,H) &gt; CH₂OH (O,H,H) &gt; H. With H behind, 1 → 2 → 3 runs clockwise: <b>R</b>.',
      hints: ['OH is clearly 1 and H is 4. CHO and CH₂OH both start with a carbon that carries an O, so look at the next atoms.', 'Duplicate the C=O: CHO counts as (O,O,H), which beats CH₂OH (O,H,H).'],
      worked: 'OH is 1. CHO counts as (O,O,H) because the C=O oxygen is written twice, and CH₂OH is (O,H,H), so CHO is 2 and CH₂OH is 3. H is 4. With H behind, 1 → 2 → 3 turns clockwise: R.'
    },
    {
      id: 's16', type: 'try', skill: 'rs', widget: 'rs-assigner',
      prompt: 'The same job on a flat drawing, like those in an exam. A solid wedge comes toward you, a dashed bond goes away, a plain line is in the page. Rank the groups, say where group 4 is, then decide R or S.',
      config: { mode: 'wedge', smiles: 'CC[C@@H](C)Br', style: 'low', lowOn: 'wedge' },
      confirm: 'Br &gt; CH₂CH₃ &gt; CH₃ &gt; H. H is on a wedge, toward you. 1 → 2 → 3 looks counterclockwise, but you are viewing from the wrong side, so reverse it: <b>R</b>.',
      hints: ['Rank the groups first. Then find group 4: a wedge means it points toward you.', 'If group 4 points toward you, the direction you read is the opposite of the true one. Reverse your answer.'],
      worked: 'Br is 1, ethyl is 2, methyl is 3, H is 4. H is on a wedge (toward you), so the 1 → 2 → 3 direction you read, counterclockwise (S), is backward. Reversed, the center is R.'
    },
    {
      id: 's17', type: 'predict', skill: 'rs',
      prompt: 'In that drawing, imagine you swap two groups: put the Br where the H was, and the H where the Br was. What do you get?',
      smiles: 'CC[C@@H](C)Br',
      options: [
        { text: 'The mirror image, (S)-2-bromobutane', correct: true, why: 'Yes. Swapping any two groups on a chirality center gives the enantiomer, so the label flips from R to S.' },
        { text: 'The same molecule, still R', why: 'If the two groups were identical this would be true. Here Br and H are different, so the swap builds the opposite arrangement in space.' },
        { text: 'A constitutional isomer with a different carbon skeleton', why: 'Swapping the positions of two groups on the drawing does not change which atoms are bonded to which, so the carbon skeleton is the same. Only the arrangement in space changes.' },
        { text: 'A different compound that is neither R nor S', why: 'A center with four different groups is always one or the other. Swapping two groups gives the opposite one.' }
      ],
      reveal: '<b>Swapping any two groups inverts the configuration.</b> That is a useful trick: if group 4 is not on a dash, swap it with the group that is, read the direction, then reverse your answer once.'
    },
    {
      id: 's18', type: 'try', skill: 'rs', widget: 'rs-assigner',
      prompt: 'Now group 4 is a plain line. Rank the groups and say where group 4 is. Then use the swap trick: swap 4 with the group on the dash, read the direction, and reverse once. R or S?',
      config: { mode: 'wedge', smiles: 'C[C@H](N)C(=O)O', style: 'two', pair: 0 },
      confirm: 'NH₂ &gt; CO₂H &gt; CH₃ &gt; H. H is a plain bond, so swap it with the dashed group. Then 1 → 2 → 3 runs clockwise, and because of the swap you reverse once: <b>S</b>.',
      hints: ['Find the group on the dash. Trade the numbers of group 4 and that group: now 4 is on the dash, away from you.', 'After the swap, read 1 → 2 → 3. The swap turned the center into its mirror image, so reverse your reading once to get the true answer.'],
      worked: 'The ranking is NH₂ (1), CO₂H (2), CH₃ (3), H (4). H is a plain bond; CH₃ is on the dash. Swap their numbers so 4 sits on the dash. Reading now: 1 → 2 → 3 is clockwise, which would be R. But we swapped two groups, so the real center is the opposite: S.'
    },
    {
      id: 's19', type: 'worked', skill: 'rs',
      problem: 'Worked example: is this lactic acid (2-hydroxypropanoic acid) R or S? You choose each move.',
      moves: [
        {
          ask: 'Rank the four groups on the center.',
          visual: { widget: 'rs-assigner', config: { mode: 'wedge', smiles: 'C[C@@H](O)C(=O)O', style: 'low', lowOn: 'dash', view: true } },
          options: [
            { text: 'OH &gt; CO₂H &gt; CH₃ &gt; H', correct: true, why: 'Yes. O (8) beats C (6) at the first atom. CO₂H is (O,O,O) and CH₃ is (H,H,H), so CO₂H beats CH₃. H is always last.' },
            { text: 'CO₂H &gt; OH &gt; CH₃ &gt; H', why: 'The first atom decides before the attached atoms: OH starts with O (8), CO₂H starts with C (6). O wins.' },
            { text: 'OH &gt; CH₃ &gt; CO₂H &gt; H', why: 'Both CH₃ and CO₂H start with C. Compare what is attached: CO₂H has (O,O,O), CH₃ has (H,H,H), so CO₂H is higher.' },
            { text: 'CO₂H &gt; CH₃ &gt; OH &gt; H', why: 'An atom of oxygen (8) outranks carbon (6) at the very first step, so OH comes before both carbon groups.' }
          ],
          then: 'The ranks are now on the drawing.'
        },
        {
          ask: 'Where is group 4, the hydrogen, in the drawing?',
          visual: { widget: 'rs-assigner', config: { mode: 'wedge', smiles: 'C[C@@H](O)C(=O)O', style: 'low', lowOn: 'dash', view: true, numbers: true } },
          options: [
            { text: 'On a dash: it points away from me, which is the view the rule wants', correct: true, why: 'Yes. The hydrogen is drawn with a dashed bond, so it points away from you. You can read the direction as it is.' },
            { text: 'On a wedge: it points toward me', why: 'Look again: the H bond is dashed, not solid.' },
            { text: 'On a plain line, in the page', why: 'The bond to H is not a plain line: it is dashed.' }
          ],
          then: 'Nothing needs reversing.'
        },
        {
          ask: 'Follow 1 → 2 → 3 along the curve. Which way does it turn on the page?',
          visual: { widget: 'rs-assigner', config: { mode: 'wedge', smiles: 'C[C@@H](O)C(=O)O', style: 'low', lowOn: 'dash', view: true, numbers: true, arc: true } },
          options: [
            { text: 'Clockwise', correct: true, why: 'Yes: OH (1) → CO₂H (2) → CH₃ (3) turns clockwise as drawn.' },
            { text: 'Counterclockwise', why: 'Follow the arrow from 1 through 2 to 3: it turns the way clock hands do.' }
          ]
        },
        {
          ask: 'So what is the configuration?',
          options: [
            { text: 'R: group 4 is away and 1 → 2 → 3 is clockwise', correct: true, why: 'Yes. Clockwise with the lowest group pointing away is R.' },
            { text: 'S: group 4 is away and 1 → 2 → 3 is clockwise', why: 'Clockwise means R, counterclockwise means S.' },
            { text: 'S: the dash means I must reverse', why: 'Only a wedge (toward you) means reversing. A dash puts group 4 where it should be, so you read directly.' }
          ],
          then: 'This is (R)-2-hydroxypropanoic acid, (R)-lactic acid.'
        }
      ],
      rule: 'Rank the groups; put group 4 away from you (a dash is already away; a wedge means reverse; a plain line means swap and reverse once); follow 1 → 2 → 3: clockwise is R, counterclockwise is S.'
    },
    {
      id: 's20', type: 'input', skill: 'rs',
      prompt: 'Name this molecule, including (R) or (S) at the front. Work out the configuration of its one center. Type the name in either IUPAC style; spaces, capitals and hyphens do not matter, but the letter and the numbers do.',
      smiles: 'C[C@@H](O)CC',
      name: true,
      answer: '(R)-butan-2-ol', accept: ['(R)-2-butanol'],
      diagnose: [
        { match: '(S)-butan-2-ol', why: 'The name is right but the letter is not. Rank OH, CH₂CH₃, CH₃, H as 1, 2, 3, 4, put H away from you and follow 1 → 2 → 3: this center is R.' },
        { match: '(S)-2-butanol', why: 'The name is right but the letter is not. Rank OH, CH₂CH₃, CH₃, H as 1, 2, 3, 4, put H away from you and follow 1 → 2 → 3: this center is R.' },
        { match: 'butan-2-ol', why: 'This molecule has a chirality center, so its name needs (R) or (S) in brackets at the front.' },
        { match: '2-butanol', why: 'This molecule has a chirality center, so its name needs (R) or (S) in brackets at the front.' },
        { match: 'butan-2-ol-(R)', why: 'The letter goes in brackets at the very front of the name: <name new="(R)-butan-2-ol" old="(R)-2-butanol"></name>.' }
      ],
      confirm: '<name new="(R)-butan-2-ol" old="(R)-2-butanol"></name>: the parent is <name new="butan-2-ol" old="2-butanol"></name>, and the center is R.',
      hints: ['Name the molecule as if it had no stereochemistry first. The center is the carbon bearing OH.', 'Rank OH, ethyl, methyl, H; put H away from you and follow 1 → 2 → 3. Then add (R) or (S) in brackets at the front.'],
      worked: 'The parent is <name new="butan-2-ol" old="2-butanol"></name>. The center ranks OH (1), CH₂CH₃ (2), CH₃ (3), H (4). In the drawing the sequence is clockwise once H is placed away from you, so the center is R and the name is <name new="(R)-butan-2-ol" old="(R)-2-butanol"></name>.'
    }
  ],
  mastery: { count: 3, generator: 'rs' },
  useIt: {
    book: ['6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7', '6.8', '6.9', '6.10', '6.11', '6.22', '6.24', '6.25', '6.26', '6.27', '6.28', '6.29', '6.30', '6.31', '6.32', '6.33', '6.34', '6.35', '6.36', '6.37', '6.38', '6.39', '6.40', '6.41', '6.42', '6.52', '6.55', '6.61'],
    endFrom: 21,
    note: 'In-chapter: 6.1 to 6.5 are chiral objects, chiral molecules and chirality centers (6.4 draws enantiomers with wedges and dashes); 6.6 and 6.7 are optical rotation; 6.8 to 6.11 rank groups and assign R/S. End of chapter: 6.22, 6.24 and 6.25 (assign R/S from models and orient a drawing), then identifying chirality centers (6.26 to 6.32), optical activity (6.33 to 6.35) and assigning R,S (6.36 to 6.42). More practice: 6.52, 6.55 and 6.61.'
  }
};
