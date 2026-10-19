// Lesson 04: Skeletal structures & functional groups (McMurry ch. 2, sections 2.1 and 2.6).
// Original wording throughout; book problems are referenced by number only.
// H counts, formulas and group atoms are all computed from RDKit (see engine/skeletal.js and engine/functional-groups.js).

export default {
  id: '04', slug: 'skeletal-functional-groups', title: 'Skeletal structures & functional groups', minutes: 25,
  chapter: 2, sections: ['2.1', '2.6'],
  drawing: 'skeletal',
  goals: [
    'Read a skeletal structure: find every carbon and work out its hydrogens',
    'Write the molecular formula of a skeletal structure, and turn a condensed formula into a skeletal drawing',
    'Spot the common functional groups and tell the look-alikes apart (aldehyde vs ketone, ester vs ether, amine vs amide)'
  ],
  steps: [
    {
      id: 's01', type: 'predict', skill: 'skeletal',
      prompt: 'From here on, molecules are drawn as bare lines. Only the Cl is labelled. How many carbon atoms do you think this molecule has?',
      smiles: 'CC(Cl)CCC',
      derive: { smiles: 'CC(Cl)CCC', quantity: 'ccount' },
      options: [
        { text: 'None: no C is written, so there are none', val: 0, why: 'This is a drawing shorthand, not a missing atom. Organic molecules are built on carbon, and the drawing leaves the C labels off on purpose.' },
        { text: '3: only the corners where two lines meet, not the ends', val: 3, why: 'Corners count, but so does the free end of every line. Those ends are CH₃ groups, and you miss two of them.' },
        { text: '5: a carbon at each corner and each line end', val: 5, correct: true, why: 'Yes. Two line ends and three corners make five carbons. The Cl is the only atom that gets a label, and it sits at the end of its own short line.' },
        { text: '6: the Cl counts as a carbon as well', val: 6, why: 'Cl is chlorine, not carbon, so it is counted separately. The drawing has five carbons plus one Cl.' }
      ],
      reveal: 'In a <b>skeletal structure</b> each corner and each line end is a carbon atom. The Cl is written because every atom other than C and H is always shown.'
    },
    {
      id: 's02', type: 'explain', skill: 'skeletal',
      html: '<molpair smiles="CC(Cl)CCC" label="2-chloropentane, full and skeletal"></molpair><p>Three rules for skeletal drawings:</p><p><b>1.</b> A C sits at every corner and line end.<br><b>2.</b> H atoms bonded to carbon are not drawn.<br><b>3.</b> Every other atom is written out (Cl, O, N …), along with any H on it, such as OH or NH₂.</p>'
    },
    {
      id: 's03', type: 'input', skill: 'skeletal',
      prompt: 'Carbon always forms four bonds. How many hydrogens are on the highlighted carbon? They are not drawn, so work it out from the lines.',
      smiles: 'CC(Cl)CCC', highlight: [1],
      answer: 1,
      derive: { smiles: 'CC(Cl)CCC', quantity: 'hcount', atom: 1 },
      diagnose: [
        { match: 3, why: '3 is how many lines reach this carbon (to two carbons and to Cl). It needs four bonds in all, so the hydrogens make up the difference: 4 − 3 = 1.' },
        { match: 0, why: 'Zero H would need four lines into the carbon. Only three reach it, so one bond is left over for an H.' },
        { match: 2, why: 'Two would mean only two lines into the carbon. Count again: one to each neighbouring carbon and one to Cl is three.' }
      ],
      confirm: '3 lines in, so 4 − 3 = 1 hydrogen. This carbon is a CH.',
      hints: ['Count the lines that touch the highlighted carbon.', 'Hydrogens = 4 minus the number of lines. Each neighbour here is one line away.'],
      worked: 'Three lines reach the highlighted carbon (two to carbons, one to Cl), so it has 4 − 3 = 1 H. Side by side: <molpair smiles="CC(Cl)CCC" hl="1" label="the highlighted CH"></molpair>'
    },
    {
      id: 's04', type: 'input', skill: 'skeletal',
      prompt: 'The same idea with a C=O. How many hydrogens are on the highlighted carbon of cyclohexanone?',
      smiles: 'O=C1CCCCC1', highlight: [1],
      answer: 0,
      derive: { smiles: 'O=C1CCCCC1', quantity: 'hcount', atom: 1 },
      diagnose: [
        { match: 1, why: 'The double bond looks like one neighbour but it is two lines, so it uses two of carbon’s four bonds. With two ring bonds that is already 4.' },
        { match: 2, why: 'Two lines go to the ring carbons and a double bond adds two more, which is four lines. Nothing is left for H.' },
        { match: 3, why: 'There are four lines in total: one to each ring carbon and a double bond (two lines) to O.' },
        { match: 4, why: '4 is the number of lines. Those lines already use up all four of carbon’s bonds, so the hydrogens are 4 − 4 = 0.' }
      ],
      confirm: 'Two single lines plus a double bond (2) make 4 lines, so 4 − 4 = 0 hydrogens.',
      hints: ['A double bond is two of carbon’s four bonds, even though it goes to one atom.', 'Add the lines: 1 + 1 + 2. Then subtract from 4.'],
      worked: 'Lines into the carbon: 1 (ring carbon) + 1 (ring carbon) + 2 (double bond to O) = 4. Hydrogens = 4 − 4 = 0.'
    },
    {
      id: 's05', type: 'explain', skill: 'skeletal',
      html: '<p><b>H on a carbon = 4 − (lines into it).</b> A double bond counts as 2 lines, a triple bond as 3.</p><p>One line in: CH₃. Two: CH₂. Three: CH. Four: no H at all.</p><p>Heteroatoms (any atom except C and H) are different: you can see their H because it is written (OH, NH₂, SH).</p>'
    },
    {
      id: 's06', type: 'choice', skill: 'skeletal',
      prompt: 'Why does a skeletal chain zig-zag? Here is a real 3D model of butane. Rotate it and follow the four highlighted carbons. How do they sit?',
      smiles: 'CCCC',
      visual: { widget: 'model3d', config: { mol: 'butane', highlight: [0, 1, 2, 3] } },
      options: [
        { text: 'In a straight line, 180° at each carbon', why: 'Each carbon has four bonds pointing to the corners of a tetrahedron, so the C–C–C angle is near 109.5°, not 180°. A straight line would be an sp carbon.' },
        { text: 'In a flat zig-zag, with the bends alternating', correct: true, why: 'Yes. The C–C–C angles are about 110° and they alternate up and down in one plane, which is exactly the zig-zag in the skeletal drawing.' },
        { text: 'In a flat C-shape, both bends turning the same way', why: 'That would push the two end carbons and their hydrogens toward each other, which is a crowded, less stable shape. The model alternates its bends instead.' },
        { text: 'In a square, with the end carbons bonded together', why: 'Butane is a chain: the two end carbons are not bonded to each other. A four-carbon ring would be cyclobutane, with fewer hydrogens.' }
      ],
      hints: ['Every carbon in butane has four single bonds. What angle does that give?', 'Look at the model from the side: do the bends go the same way or alternate?'],
      worked: 'Four single bonds mean tetrahedral carbons with C–C–C angles near 110°. In the most stable shape the chain alternates in one plane, a flat zig-zag, so the skeletal drawing is a faithful picture of the molecule. (Butane can twist about its C–C bonds; that comes later.)',
      confirm: 'The skeletal zig-zag is not just a convention: tetrahedral carbons really do make a zig-zag chain.'
    },
    {
      id: 's07', type: 'input', skill: 'skeletal',
      prompt: 'Now count everything. What is the molecular formula of this molecule? Type it like C4H8O; subscripts or plain digits are both fine.',
      smiles: 'CC(C)CCO',
      formula: true, answer: 'C5H12O',
      derive: { smiles: 'CC(C)CCO', quantity: 'formula' },
      diagnose: [
        { match: 'C5H11O', why: 'That is 11 H. You counted the hydrogens on the carbons (3 + 1 + 3 + 2 + 2 = 11) but forgot the H written on the oxygen, in the OH.' },
        { match: 'C5H12', why: 'The O is a real atom: it is written in the drawing, so it belongs in the formula.' }
      ],
      confirm: 'Five carbons (one per corner or end), 12 H (3 + 1 + 3 + 2 + 2 on the carbons, 1 on O) and one O: C₅H₁₂O.',
      hints: ['First count carbons: one at every corner and every line end. Then add the atoms that are written (O).', 'For hydrogens, go carbon by carbon (4 − lines), then add the H written on the oxygen.'],
      worked: 'Carbons: 5. Hydrogens on carbon, from the left: CH₃ (3), CH (1), CH₃ (3), CH₂ (2), CH₂ (2) = 11, plus 1 in OH = 12. One O. So C₅H₁₂O.'
    },
    {
      id: 's08', type: 'worked', skill: 'skeletal',
      problem: 'Worked example: draw the condensed formula <b>CH₃CH₂CH(OH)CH₂CH₃</b> (the molecule written as a row of groups) as a skeletal structure. You choose each move.',
      moves: [
        {
          ask: 'Each CH₃, CH₂ or CH in the formula is one carbon. How many carbons will your zig-zag have?',
          check: { smiles: 'CCC(O)CC', quantity: 'ccount' },
          options: [
            { text: '5', val: 5, correct: true, why: 'Yes: CH₃, CH₂, CH, CH₂, CH₃ are five carbon units.' },
            { text: '6', val: 6, why: 'The OH is not a carbon. It is an oxygen, and it is written out later.' },
            { text: '4', val: 4, why: 'Count the units again: CH₃, CH₂, CH, CH₂, CH₃ makes five.' }
          ],
          then: 'Draw a zig-zag with five corners and ends.',
          figure: { smiles: 'CCCCC', label: 'five carbons' }
        },
        {
          ask: 'Which carbon, counting from the left, carries the OH?',
          options: [
            { text: 'The 3rd (the CH)', correct: true, why: 'Yes. The (OH) in parentheses hangs off the third unit, CH.' },
            { text: 'The 1st', why: 'The first unit is CH₃, which has no room for another group: it already has four bonds.' },
            { text: 'The 5th', why: 'The last unit is CH₃, with four bonds already. The OH belongs to the CH in the middle.' }
          ],
          then: 'Write OH on a short line from carbon 3. Oxygen and its H are always written.',
          figure: { smiles: 'CCC(O)CC', label: 'OH on carbon 3' }
        },
        {
          ask: 'What do you write at the CH₃ ends and at the CH₂ corners?',
          options: [
            { text: 'Nothing: they are line ends and corners, and their H are not drawn', correct: true, why: 'Yes. A line end or corner is a carbon, and its hydrogens are understood.' },
            { text: 'CH₃ and CH₂ labels, so nobody miscounts', why: 'That is allowed for emphasis, but skeletal structures normally leave them off. That is what makes them quick to draw.' },
            { text: 'An H on every carbon', why: 'Hydrogens on carbon are never drawn in a skeletal structure.' }
          ],
          then: 'Leave them blank.'
        },
        {
          ask: 'Check: the carbon bearing the OH was written CH(OH). How many H does your drawing say it has? (Lines into it: 3.)',
          check: { smiles: 'CCC(O)CC', quantity: 'hcount', atom: 2 },
          options: [
            { text: '1', val: 1, correct: true, why: '4 − 3 lines = 1 H, matching the CH in the formula.' },
            { text: '0', val: 0, why: 'Zero would need four lines into the carbon. It has three: two carbons and O.' },
            { text: '2', val: 2, why: 'Two would be a CH₂, with only two lines in. This carbon has three.' }
          ],
          then: 'The drawing and the formula agree.'
        }
      ],
      rule: 'Condensed to skeletal: one corner or end per carbon unit, write every non-C atom with its own H (OH), and leave off the H on carbon. Check any carbon with H = 4 − lines.'
    },
    {
      id: 's09', type: 'try', skill: 'skeletal', widget: 'skeletal-builder',
      prompt: 'Your turn. Which skeletal drawing matches this condensed formula?',
      config: {
        condensed: 'CH3CH2CH(OH)CH3',
        options: [
          { smiles: 'CCCC(C)O', why: 'This has five carbons. The formula has four units: CH₃, CH₂, CH and CH₃.' },
          { smiles: 'CCC(C)O', why: 'Yes.' },
          { smiles: 'CCCCO', why: 'Here the OH sits on the end carbon, CH₂OH. In the formula it is on the third unit, CH(OH), which still has a CH₃ after it.' },
          { smiles: 'CC(C)O', why: 'This has only three carbons. The formula has four: CH₃, CH₂, CH and CH₃.' }
        ]
      },
      confirm: 'Four carbons with the OH on the third (or second from the other end): that is butan-2-ol (naming comes in the next lesson).',
      hints: ['Count the carbon units first, then ask which one carries the OH.', 'Four units: CH₃, CH₂, CH(OH), CH₃. The OH is not on an end.'],
      worked: 'Four carbons in a chain; the OH hangs on the third carbon, so a CH₃ is on one side and a CH₂CH₃ on the other. That is the second drawing.'
    },
    {
      id: 's10', type: 'predict', skill: 'functional-groups',
      prompt: 'Ethene, CH₂=CH₂, reacts with bromine (Br₂) so that one Br ends up on each carbon of the C=C. Cyclohexene, drawn here, also has a C=C. What do you expect when it meets Br₂?',
      smiles: 'C1=CCCCC1', both: true,
      options: [
        { text: 'One Br adds to each carbon of its C=C, as with ethene', correct: true, why: 'Yes. The C=C reacts the same way whether it is in a tiny or a big molecule. The product is 1,2-dibromocyclohexane.' },
        { text: 'Br replaces the H atoms on the CH₂ groups of the ring', why: 'Those carbons have only single bonds. In this reaction the double bond is the reactive part, not the rest of the ring.' },
        { text: 'The ring opens', why: 'The ring’s single bonds are not what reacts. The ring stays intact and the Br atoms add across the double bond.' },
        { text: 'Nothing happens, because cyclohexene is too different from ethene', why: 'The rest of the molecule changes details, not the basic chemistry of the C=C. That is the whole point of a functional group.' }
      ],
      reveal: 'A <b>functional group</b> is a group of atoms with its own characteristic reactivity. It behaves much the same wherever it appears, so the chemistry of a molecule is largely the chemistry of its functional groups.'
    },
    {
      id: 's11', type: 'try', skill: 'functional-groups', widget: 'group-finder',
      prompt: 'Find the functional groups in this molecule. First the alkene (a C=C double bond).',
      config: { smiles: 'CC=CC(C)O', group: 'alkene' },
      confirm: 'An alkene is a carbon–carbon double bond, and the group is just those two carbons.',
      hints: ['An alkene is a C=C double bond. Look for the doubled line.', 'Tap the two carbons at the ends of the double bond.'],
      worked: 'The double line is between the second and third carbons from the left. Those two carbons are the alkene.'
    },
    {
      id: 's12', type: 'try', skill: 'functional-groups', widget: 'group-finder',
      prompt: 'Same molecule. Now find the alcohol (an O–H on a carbon that has only single bonds).',
      config: { smiles: 'CC=CC(C)O', group: 'alcohol' },
      confirm: 'An alcohol is an OH on a carbon that has only single bonds. The group is the O plus the carbon it sits on.',
      hints: ['An alcohol has an O–H attached to a carbon with four single bonds.', 'Tap the O of the OH and the carbon it is bonded to.'],
      worked: 'The OH is on the carbon near the right end. That carbon and the O are the alcohol; the neighbouring carbons are just part of the chain.'
    },
    {
      id: 's13', type: 'explain', skill: 'functional-groups',
      html: '<p><b>C=C</b> alkene · <b>C≡C</b> alkyne · benzene ring arene · <b>C–X</b> (X = F, Cl, Br, I) alkyl halide · <b>C–OH</b> alcohol · <b>C–O–C</b> ether · <b>C–N</b> amine · <b>C–SH</b> thiol · <b>C–S–C</b> sulfide · <b>C≡N</b> nitrile.</p><p>For C=O (a carbonyl), look at what else is on that carbon: <b>H</b> aldehyde, <b>C</b> ketone, <b>OH</b> carboxylic acid, <b>O–C</b> ester, <b>N</b> amide. Alkanes have no functional group.</p>'
    },
    {
      id: 's14', type: 'choice', skill: 'functional-groups',
      prompt: 'Which of these is an aldehyde?',
      options: [
        { smiles: 'CC(C)=O', label: 'A', why: 'The C=O carbon sits between two carbons. That is a ketone (acetone). An aldehyde has its C=O at the end of a chain.' },
        { smiles: 'CCC=O', label: 'B', correct: true, why: 'Yes. The C=O is at the end of the chain, so its carbon holds one carbon and one H (not drawn). This is propanal.' },
        { smiles: 'CCC(=O)O', label: 'C', why: 'The C=O carbon also carries an OH. That makes it a carboxylic acid.' },
        { smiles: 'CC(=O)OC', label: 'D', why: 'The C=O carbon has an O–C on it. That makes it an ester.' }
      ],
      hints: ['All four have a C=O. Look at what is bonded to its carbon.', 'An aldehyde carbonyl carbon is bonded to H and one carbon: the C=O is at the end of a chain.'],
      worked: 'Aldehyde: C=O with an H on the carbonyl carbon, so the C=O is at the chain end (B). A is a ketone, C a carboxylic acid, D an ester.'
    },
    {
      id: 's15', type: 'choice', skill: 'functional-groups',
      prompt: 'Which of these is an ester?',
      options: [
        { smiles: 'CCOCC', label: 'A', why: 'This O sits between two carbons with no C=O beside it. That is an ether (diethyl ether).' },
        { smiles: 'CCC(=O)O', label: 'B', why: 'The O on the C=O carbon carries an H. That makes it a carboxylic acid; an ester has a carbon there instead.' },
        { smiles: 'CCC(=O)OC', label: 'C', correct: true, why: 'Yes. A C=O with an O–C on the same carbon is an ester (methyl propanoate). Remove the C=O and you would have an ether.' },
        { smiles: 'CCC(N)=O', label: 'D', why: 'The group on the C=O carbon is an N, not an O. That makes it an amide.' }
      ],
      hints: ['An ester has both a C=O and a single-bonded O on the same carbon.', 'Check what the single-bonded O connects to: H gives an acid, a carbon gives an ester.'],
      worked: 'Ester: C=O carbon bonded to an O that is itself bonded to a carbon (C). A is an ether, B a carboxylic acid, D an amide.'
    },
    {
      id: 's16', type: 'choice', skill: 'functional-groups',
      prompt: 'Which of these is an amine? (Be careful: an N next to a C=O is something else.)',
      options: [
        { smiles: 'CC(=O)NC', label: 'A', why: 'The N is attached to a C=O carbon. That makes it an amide (N-methylacetamide), not an amine.' },
        { smiles: 'CNC', label: 'B', correct: true, why: 'Yes. An N bonded to carbon with no C=O beside it is an amine (dimethylamine).' },
        { smiles: 'CC#N', label: 'C', why: 'C≡N is a nitrile. An amine has only single bonds from the N.' },
        { smiles: 'CCO', label: 'D', why: 'There is no nitrogen in this molecule: it is an alcohol.' }
      ],
      hints: ['An amine needs a nitrogen. Which structures have one?', 'Then check whether that nitrogen is next to a C=O: if yes it is an amide, if not it is an amine.'],
      worked: 'Amine: an N bonded to carbon with no C=O carbon on it (B). A has the N on a C=O carbon (amide), C has a C≡N (nitrile), D has no N.'
    },
    {
      id: 's17', type: 'try', skill: 'functional-groups', widget: 'group-finder',
      prompt: 'A real drug: paracetamol (acetaminophen). It holds several groups, including a ring and a ring OH. Tap the atoms of the amide.',
      config: { smiles: 'CC(=O)Nc1ccc(O)cc1', group: 'amide' },
      confirm: 'The N is bonded to the ring, but because it sits on a C=O carbon the group is an amide: C, =O and N.',
      hints: ['An amide is a C=O with an N on the same carbon.', 'Tap three atoms: the carbonyl carbon, its O and the N.'],
      worked: 'Find the C=O first, then the N on the same carbon. Those three atoms (C, O, N) are the amide; the ring is an arene and the ring OH is a different group (a phenol), not an alcohol.'
    }
  ],
  mastery: { count: 3, generator: 'skeletal-fg' },
  useIt: {
    book: ['2.1', '2.2', '2.3', '2.15', '2.16', '2.17', '2.29', '2.30', '2.34', '2.35', '2.36', '2.37', '2.40', '2.51'],
    endFrom: 29,
    note: 'In-chapter: 2.1 to 2.3 are functional groups (2.3 turns a model into a line-bond drawing); 2.15 to 2.17 are skeletal structures, H counts and formulas. End of chapter: 2.29 (do the skeletal drawing now; the names come in the next lessons), 2.30 groups and formulas, 2.34 to 2.37 and 2.40 functional groups and isomers, 2.51 drawing from a formula. Count H with 4 minus the lines before you write a formula.'
  }
};
