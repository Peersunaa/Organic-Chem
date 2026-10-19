// Lesson 05: Naming alkanes & rings (McMurry ch. 2, sections 2.2, 2.3 and 2.7).
// Original wording throughout; book problems are referenced by number only.
// Every name is computed by engine/naming.js (checked against OPSIN in the tests) and rendered in both IUPAC styles through <name new old>.
import { diagnoseTyped } from '../engine/naming.js';

const S15 = 'CC(C)CC(CCC)C(C)C';
const S18 = 'CCC1CCC(C)C1';

export default {
  id: '05', slug: 'naming-alkanes', title: 'Naming alkanes & rings', minutes: 25,
  chapter: 2, sections: ['2.2', '2.3', '2.7'],
  drawing: 'skeletal',
  goals: [
    'Tell constitutional isomers apart and label carbons as primary, secondary, tertiary or quaternary',
    'Name branched alkanes: longest chain, lowest numbers, alphabetical prefixes (in either IUPAC style)',
    'Name substituted cycloalkanes and decide whether the ring or a chain is the parent'
  ],
  steps: [
    {
      id: 's01', type: 'predict', skill: 'naming',
      prompt: 'Both drawings are four carbons and ten hydrogens joined by single bonds. Are A and B the same molecule?',
      figures: [{ smiles: 'CCCC', label: 'A' }, { smiles: 'CC(C)C', label: 'B' }],
      options: [
        { text: 'Yes: B is just A with its chain bent', why: 'Bending or twisting never changes which atom is bonded to which. In A every carbon has at most two carbon neighbours. In B the middle carbon has three. The connections differ, so these are two molecules.' },
        { text: 'No: they are different molecules with the same formula', correct: true, why: 'Yes. Both are C₄H₁₀, but A is an unbranched chain and B has a carbon bonded to three other carbons. Different connections make different compounds.' },
        { text: 'No: B has fewer hydrogens', why: 'Count them: each carbon needs four bonds, and both drawings work out to ten hydrogens. The formula is the same, which is what makes this interesting.' },
        { text: 'Yes, because they have the same formula', why: 'A formula only counts atoms; it says nothing about how they are connected. Same formula and different connections means different molecules.' }
      ],
      reveal: 'Molecules with the same formula but a different order of connection are <b>constitutional isomers</b>. A is butane; B is isobutane (2-methylpropane). The number of alkane isomers climbs with size: three for C₅H₁₂, five for C₆H₁₄.'
    },
    {
      id: 's02', type: 'choice', skill: 'naming',
      prompt: 'Here are real 3D models of butane and isobutane. Rotate them. What is the structural difference?',
      visual: { widget: 'model3d', config: { mol: 'butane', compare: 'isobutane' } },
      options: [
        { text: 'Isobutane has a carbon bonded to three other carbons, a branch; butane has none', correct: true, why: 'Yes. In isobutane the central carbon holds three CH₃ groups and one H. Butane is an unbranched chain, so no carbon has more than two carbon neighbours.' },
        { text: 'Isobutane has one more hydrogen', why: 'Both are C₄H₁₀: ten hydrogens each. Count them in the models.' },
        { text: 'Butane has a double bond', why: 'Every bond in an alkane is a single bond, in butane and in isobutane alike.' },
        { text: 'Isobutane is flat and butane is tetrahedral', why: 'Each carbon in both molecules has four single bonds pointing to the corners of a tetrahedron. Neither molecule is flat.' }
      ],
      hints: ['Look at the central carbons of each model and count their carbon neighbours.', 'Find the one carbon in isobutane that touches three other carbons.'],
      worked: 'Butane: C–C–C–C, so no carbon has more than two carbon neighbours. Isobutane: one carbon touches three others (a branch point). The formulas match but the connections differ, so they are constitutional isomers.',
      confirm: 'Same atoms, different connections: constitutional isomers.'
    },
    {
      id: 's03', type: 'explain', skill: 'naming',
      html: '<p><b>Alkanes</b> have only C–C and C–H single bonds: C<sub>n</sub>H<sub>2n+2</sub>. A ring takes away two H: <b>cycloalkanes</b> are C<sub>n</sub>H<sub>2n</sub>.</p><p>Roots by carbon count: <b>meth</b> 1, <b>eth</b> 2, <b>prop</b> 3, <b>but</b> 4, <b>pent</b> 5, <b>hex</b> 6, <b>hept</b> 7, <b>oct</b> 8, <b>non</b> 9, <b>dec</b> 10, plus <b>-ane</b>. A ring adds <b>cyclo-</b> in front.</p>'
    },
    {
      id: 's04', type: 'input', skill: 'naming',
      prompt: 'A straight-chain alkane has 7 carbons joined by single bonds. Write its molecular formula (type it like C4H8O; subscripts or plain digits are both fine).',
      smiles: 'CCCCCCC',
      formula: true, answer: 'C7H16',
      derive: { smiles: 'CCCCCCC', quantity: 'formula' },
      diagnose: [
        { match: 'C7H14', why: 'CₙH₂ₙ (14 here) is the formula of a ring such as cycloheptane, not of an open chain. A chain has two more H than that: its two ends each carry an extra H.' },
        { match: 'C7H15', why: 'C₇H₁₅ is one H short of a molecule: it is the heptyl group. A complete chain has 2n + 2 = 16 hydrogens.' },
        { match: 'C7H18', why: 'That is too many. Each carbon allows four bonds, and the chain uses some of them to bond to each other: 2n + 2 = 16 hydrogens.' }
      ],
      confirm: 'C₇H₁₆ (heptane): 2 × 7 + 2 = 16 hydrogens. Two CH₃ ends (6 H) and five CH₂ (10 H).',
      hints: ['Use CₙH₂ₙ₊₂ for an open-chain alkane, with n = 7.', 'Check by drawing it: two CH₃ ends and five CH₂ groups in between.'],
      worked: '2n + 2 = 2 × 7 + 2 = 16, so C₇H₁₆. By parts: 2 CH₃ (6 H) + 5 CH₂ (10 H) = 16 H.'
    },
    {
      id: 's05', type: 'choice', skill: 'naming',
      prompt: 'What is the name of this straight-chain alkane?',
      smiles: 'CCCCCCCCC',
      options: [
        { text: 'Octane', why: 'Octane has eight carbons. Count the corners and line ends again: there are nine.' },
        { text: 'Nonane', correct: true, why: 'Yes. Nine carbons: non- + -ane.' },
        { text: 'Decane', why: 'Decane has ten carbons. This chain has one fewer.' },
        { text: 'Heptane', why: 'Heptane has seven carbons. This chain is two longer.' }
      ],
      hints: ['Count the carbons: one at every corner and line end.', 'The roots go meth, eth, prop, but, pent, hex, hept, oct, non, dec. Count off nine.'],
      worked: 'The zig-zag has 9 carbons: nine is non-, so the alkane is nonane.',
      confirm: 'Nine carbons: nonane.'
    },
    {
      id: 's06', type: 'predict', skill: 'naming',
      prompt: 'Propane, drawn here, has eight hydrogens: six on the two end CH₃ groups and two on the middle CH₂. Remove one H and use that spot to attach the group to something else. How many different three-carbon groups can you make?',
      smiles: 'CCC',
      options: [
        { text: '1', why: 'The end carbons and the middle carbon are different places. A group attached through an end carbon is not the same as one attached through the middle carbon.' },
        { text: '2', correct: true, why: 'Yes. All six end H are equivalent (same group) and the two middle H are equivalent (a second group).' },
        { text: '3', why: 'The two end carbons are equivalent by symmetry, so removing an H from either gives the same group.' },
        { text: '8', why: 'Eight is the number of hydrogens, not the number of different groups. Many of them are equivalent by symmetry.' }
      ],
      reveal: 'Attached through an end carbon, the group is <b>propyl</b>. Attached through the middle carbon, it is <b><name new="propan-2-yl" old="isopropyl"></name></b>. Groups made this way are <b>alkyl groups</b>, and butane and isobutane give four more.'
    },
    {
      id: 's07', type: 'explain', skill: 'naming',
      html: '<p>Alkyl groups: –CH₃ methyl · –CH₂CH₃ ethyl · –CH₂CH₂CH₃ propyl · –CH(CH₃)₂ <name new="propan-2-yl" old="isopropyl"></name> · –CH₂CH₂CH₂CH₃ butyl · –CH(CH₃)CH₂CH₃ <name new="butan-2-yl" old="sec-butyl"></name> · –CH₂CH(CH₃)₂ <name new="2-methylpropyl" old="isobutyl"></name> · –C(CH₃)₃ tert-butyl (both styles).</p>'
    },
    {
      id: 's08', type: 'choice', skill: 'naming',
      prompt: 'Flip the <b>New / Old IUPAC</b> switch at the top of the page and watch the name: <name new="2-methyl-4-(propan-2-yl)heptane" old="4-isopropyl-2-methylheptane"></name>. What changes between the two styles?',
      smiles: S15,
      options: [
        { text: 'The wording of some branches changes, and that can reorder the prefixes', correct: true, why: 'Yes. Isopropyl is filed under i, but propan-2-yl is filed under p, so the methyl moves ahead of it. The molecule is the same; only the name is written differently.' },
        { text: 'The old name describes a different molecule', why: 'Both names point to the very same structure. Only the wording differs, and this course accepts either style when you type a name.' },
        { text: 'The parent chain changes from heptane to something else', why: 'The parent is heptane in both styles. Only the names of branches differ.' },
        { text: 'Nothing changes: the two styles are always identical', why: 'Flip the switch again and compare. Branch names such as isopropyl, sec-butyl and isobutyl have new-style forms, and methyl, ethyl, propyl, butyl and tert-butyl do not change.' }
      ],
      hints: ['Flip the switch in the header and compare the two names word by word.', 'Which word changes, and what happens to where the methyl sits in the name?'],
      worked: 'Old: 4-isopropyl-2-methylheptane. New: 2-methyl-4-(propan-2-yl)heptane. The branch isopropyl is written propan-2-yl in the new style, so it is alphabetized under p instead of i and the methyl now comes first.',
      confirm: 'Same molecule, two spellings. Isopropyl, sec-butyl and isobutyl have new-style names; methyl, ethyl, propyl, butyl and tert-butyl read the same in both.'
    },
    {
      id: 's09', type: 'choice', skill: 'naming',
      prompt: 'Carbons are classed by how many other carbons they are bonded to: primary (1°), secondary (2°), tertiary (3°) or quaternary (4°). In 2,2,4-trimethylpentane, which class is the highlighted carbon?',
      smiles: 'CC(C)(C)CC(C)C', highlight: [1],
      options: [
        { text: 'Primary (1°)', why: 'Primary means bonded to exactly one carbon. The highlighted carbon touches four: count the lines to carbons.' },
        { text: 'Secondary (2°)', why: 'Secondary means two carbon neighbours. This carbon has two more than that.' },
        { text: 'Tertiary (3°)', why: 'Tertiary means three carbon neighbours. This carbon has a fourth: it holds three methyl groups and the chain.' },
        { text: 'Quaternary (4°)', correct: true, why: 'Yes. Three methyls and one chain carbon make four carbon neighbours, and no hydrogen.' }
      ],
      hints: ['Count the lines from the highlighted carbon to other carbons. Hydrogens do not count.', '1 neighbour = primary, 2 = secondary, 3 = tertiary, 4 = quaternary.'],
      worked: 'The highlighted carbon is bonded to four carbons (three CH₃ and one CH₂), so it is quaternary.',
      confirm: 'Four carbon neighbours: quaternary (4°).'
    },
    {
      id: 's10', type: 'try', skill: 'naming', widget: 'chain-tracer',
      prompt: 'Now the naming itself. The first job is to find the longest continuous chain, which may bend. Trace it on 4-ethyl-2-methylhexane.',
      config: { smiles: 'CC(C)CC(CC)CC', task: 'trace' },
      confirm: 'Six carbons in a row: the parent (the chain you name from) is hexane. The chain can turn a corner at a branch point; the leftovers are branches.',
      hints: ['Start at a CH₃ end and keep walking from carbon to carbon without lifting your finger. The chain can bend.', 'Try both arms at the branch point: you want the path with the most carbons.'],
      worked: 'Start at a CH₃ on the CH(CH₃) fork, go through that CH, the CH₂ and the CH that carries the ethyl, then out along one of its two-carbon arms. That is 6 carbons. What is left over is a methyl branch and an ethyl branch.'
    },
    {
      id: 's11', type: 'try', skill: 'naming', widget: 'chain-tracer',
      prompt: 'Several chains here tie for longest (five carbons). Trace the one that should be the parent of 3-ethyl-2-methylpentane.',
      config: { smiles: 'CC(C)C(CC)CC', task: 'trace' },
      confirm: 'All the five-carbon chains tie, but yours leaves two branches (ethyl and methyl) instead of one. The parent with more branches wins a tie: 3-ethyl-2-methylpentane, not <name new="3-(propan-2-yl)pentane" old="3-isopropylpentane"></name>.',
      hints: ['Find every five-carbon path. There is more than one.', 'When chains tie, pick the one that leaves more branches off the chain.'],
      worked: 'The path from a CH₃ of the CH(CH₃)₂ end, through the CH and the CH, and out along an ethyl has 5 carbons and leaves 2 branches (a methyl and an ethyl). The path through both ethyls also has 5 carbons but leaves only 1 branch (a <name new="propan-2-yl" old="isopropyl"></name>). More branches wins.'
    },
    {
      id: 's12', type: 'try', skill: 'naming', widget: 'chain-tracer',
      prompt: 'Next the numbering. The parent chain of 4-ethyl-2-methylhexane is outlined. Tap the carbon that should be C1.',
      config: { smiles: 'CC(C)CC(CC)CC', task: 'number' },
      confirm: 'Counting from this end, the branches sit on C2 and C4. From the other end they would be on C3 and C5. The first branch should get the lowest number.',
      hints: ['C1 is one of the two ends of the outlined chain. Which end is nearer to the first branch?', 'Count both ways: one end puts the branches on 2 and 4, the other on 3 and 5. Pick the end that gives the lower first number.'],
      worked: 'From the end nearer the methyl: methyl on C2, ethyl on C4. From the other end: ethyl on C3, methyl on C5. The first number is lower from the methyl end (2 against 3), so that end is C1.'
    },
    {
      id: 's13', type: 'explain', skill: 'naming',
      html: '<p><b>Recipe.</b> 1 Parent: longest chain, bending allowed; a tie goes to the chain with more branches. A ring is the parent if it has at least as many carbons as the biggest chain.</p><p>2 Number from the end giving the lowest numbers; on a tie, the branch first alphabetically gets the lower one.</p><p>3 Name the branches; di-, tri- count repeats.</p><p>4 Alphabetical order, ignoring di-, tri-, sec-, tert- (not iso). Commas between numbers, hyphens elsewhere, one word.</p>'
    },
    {
      id: 's14', type: 'worked', skill: 'naming',
      problem: 'Worked example: give the IUPAC name of this alkane. You choose each move.',
      smiles: 'CCC(CC)C(C)(C)CCC',
      moves: [
        {
          ask: 'Find the parent: how many carbons are in the longest continuous chain?',
          options: [
            { text: '7', correct: true, why: 'Yes. The chain runs from the ethyl branch end through the carbon with the two methyls to the far end: seven carbons.' },
            { text: '6', why: 'One short. Follow the chain through the crowded carbon to the far end and count again.' },
            { text: '11', why: '11 counts every carbon, branches included. The parent is only the single longest unbroken chain.' }
          ],
          then: 'The parent is heptane.',
          figure: { smiles: 'CCC(CC)C(C)(C)CCC', label: 'longest chain: heptane', highlight: [0, 1, 2, 5, 8, 9, 10] }
        },
        {
          ask: 'Number the chain. Which end puts the first branch on the lower number?',
          options: [
            { text: 'The end nearer the ethyl: the first branch is on C3', correct: true, why: 'Yes. From the ethyl end the branches are on 3, 4 and 4.' },
            { text: 'The other end: the first branch is on C4', why: 'From the other end the first branch is on C4, then 4 and 5. The first number (4) is higher than 3, so this is the wrong end.' },
            { text: 'Either end, it makes no difference', why: 'It does: 3, 4, 4 from one end and 4, 4, 5 from the other. At the first difference 3 beats 4.' }
          ],
          then: 'The locants (position numbers) are 3, 4 and 4.'
        },
        {
          ask: 'Name the branches with their numbers. Which list is right?',
          options: [
            { text: '3-ethyl and two methyl groups, both on C4', correct: true, why: 'Yes: one ethyl on C3 and two methyls on the same carbon, C4.' },
            { text: '3-ethyl and one methyl on C4', why: 'There are two methyl groups on C4 (the carbon has four bonds: two to the chain and two to methyls).' },
            { text: '3-propyl and 4-methyl', why: 'The branch on C3 has two carbons, so it is ethyl, not propyl.' }
          ],
          then: 'Two methyls become 4,4-dimethyl: a number for each, and di-.'
        },
        {
          ask: 'Put the prefixes in alphabetical order. Which comes first?',
          options: [
            { text: 'Ethyl, then dimethyl (e before m)', correct: true, why: 'Yes: di- is ignored when alphabetizing, so dimethyl is filed under m.' },
            { text: 'Dimethyl, then ethyl (d before e)', why: 'di- is ignored when alphabetizing. Dimethyl is filed under m (methyl), which comes after e.' },
            { text: 'Largest group first', why: 'Size does not matter. The order is alphabetical.' }
          ],
          then: 'Ethyl first.'
        },
        {
          ask: 'Assemble the full name.',
          options: [
            { text: '3-ethyl-4,4-dimethylheptane', correct: true, why: 'Yes: numbers with commas, hyphens between numbers and words, prefixes in alphabetical order, and the parent last, all one word.' },
            { text: '4,4-dimethyl-3-ethylheptane', why: 'Alphabetical order puts ethyl before dimethyl, so the 3-ethyl part comes first.' },
            { text: '3-ethyl-4-methyl-4-methylheptane', why: 'Repeated branches are combined: 4,4-dimethyl.' },
            { text: '3,4,4-ethyldimethylheptane', why: 'Each prefix keeps its own numbers right in front of it, joined by hyphens.' }
          ],
          then: 'Done.'
        }
      ],
      rule: 'Longest chain, then lowest numbers from the nearer end, then name the branches, order them alphabetically (ignoring di-, tri-) and write one word.'
    },
    {
      id: 's15', type: 'input', skill: 'naming',
      prompt: 'Name this alkane. Type it in either IUPAC style. Spaces, capitals and hyphens do not matter, but numbers and order do.',
      smiles: S15,
      name: true,
      answer: '2-methyl-4-(propan-2-yl)heptane', accept: ['4-isopropyl-2-methylheptane'],
      diagnose: [
        { match: '2-methyl-4-isopropylheptane', why: 'The prefixes are out of order for this style. Isopropyl is filed under i, so in the traditional style it comes before methyl: 4-isopropyl-2-methylheptane.' },
        { match: '4-(propan-2-yl)-2-methylheptane', why: 'In the new style the branch is propan-2-yl, which is filed under p, so the methyl (m) comes first: 2-methyl-4-(propan-2-yl)heptane.' },
        { match: '4-isopropyl-6-methylheptane', why: 'Number from the other end: the first branch should get the lowest number. From the other end the methyl is on C2, not C6.' },
        { match: '6-methyl-4-(propan-2-yl)heptane', why: 'Number from the other end: the first branch should get the lowest number. From the other end the methyl is on C2, not C6.' },
        { match: '2,6-dimethylheptane', why: 'The branch on C4 is not a methyl: it has three carbons, attached through its middle carbon (isopropyl, or propan-2-yl).' }
      ],
      diagnoseFn: (raw) => diagnoseTyped(S15, raw),
      confirm: 'Heptane, methyl on C2, isopropyl on C4: <name new="2-methyl-4-(propan-2-yl)heptane" old="4-isopropyl-2-methylheptane"></name>. Parentheses wrap a branch name that contains a number, and the order changes with the style.',
      hints: ['Parent: the longest chain has 7 carbons. Number from the end nearer the first branch.', 'One branch is a methyl; the other has three carbons attached through its middle carbon (isopropyl, or propan-2-yl). Alphabetize by that branch name in the style you use.'],
      worked: 'Heptane, methyl on C2 and isopropyl on C4. Traditional style: 4-isopropyl-2-methylheptane (i before m). New style: 2-methyl-4-(propan-2-yl)heptane (m before p, parentheses round the branch).'
    },
    {
      id: 's16', type: 'choice', skill: 'naming',
      prompt: 'Which structure is <name new="4-ethyl-2,3-dimethylhexane" old="4-ethyl-2,3-dimethylhexane"></name>?',
      options: [
        { smiles: 'CC(C)C(C)C(C)CC', label: 'A', why: 'Here C4 carries a methyl, not an ethyl. This drawing has only nine carbons; the name needs ten (hexane + two methyl + one ethyl).' },
        { smiles: 'CC(C)C(C)C(CC)CC', label: 'B', correct: true, why: 'Yes: a hexane chain with methyls on C2 and C3 and an ethyl on C4 (ten carbons in all).' },
        { smiles: 'CC(C)C(CC)C(C)CC', label: 'C', why: 'The ethyl is on C3 here and the methyls are on C2 and C4. The name puts the ethyl on C4 and the methyls on C2 and C3.' },
        { smiles: 'CC(C)C(C)C(CC)CCC', label: 'D', why: 'The parent here has seven carbons (the CH₂CH₃ at the end continues the chain), but the name says hexane.' }
      ],
      hints: ['Draw the parent first: six carbons in a row. Number them from one end.', 'Hang a methyl on C2, a methyl on C3 and an ethyl on C4. Then check the drawing by finding its longest chain.'],
      worked: 'Hexane: six carbons. Two methyls (di-) on C2 and C3, an ethyl on C4. That gives ten carbons in total and matches B.',
      confirm: 'Parent, then branches, then numbers: B fits the name.'
    },
    {
      id: 's17', type: 'try', skill: 'naming', widget: 'chain-tracer',
      prompt: 'Rings now. A ring can be the parent or a branch. Tap the parent of this molecule: the whole ring (any ring carbon) or the chain.',
      config: { smiles: 'CCCC1CCCC1', task: 'parent' },
      confirm: 'The ring has 5 carbons and the chain only 3, so the ring is the parent: propylcyclopentane. Had the chain been longer than the ring (a butyl group on cyclopropane), the chain would be the parent and the ring a cyclopropyl branch.',
      hints: ['Count the carbons in the ring and in the chain.', 'The bigger one is the parent. If they are equal, the ring is the parent.'],
      worked: 'Ring: 5 carbons. Chain: 3 carbons. The ring is larger, so it is the parent (cyclopentane) and the chain is a propyl branch.'
    },
    {
      id: 's18', type: 'input', skill: 'naming',
      prompt: 'Name this cycloalkane. Number the ring so the numbers are lowest; if that is a tie, the branch first in alphabetical order gets 1.',
      smiles: S18,
      name: true,
      answer: '1-ethyl-3-methylcyclopentane',
      diagnose: [
        { match: '3-ethyl-1-methylcyclopentane', why: 'The numbers 1 and 3 tie either way round the ring, so the branch that comes first alphabetically gets 1. Ethyl comes before methyl, so the ethyl is C1.' },
        { match: '1-ethyl-4-methylcyclopentane', why: 'Number around the ring in the direction that gives the lower numbers. Going the other way the methyl is on C3, not C4.' },
        { match: '1-methyl-3-ethylcyclopentane', why: 'Alphabetize ethyl before methyl in the name, not by the order of the numbers.' },
        { match: 'ethylmethylcyclopentane', why: 'Two branches need two numbers, one in front of each branch name.' },
        { match: '1-ethyl-3-methylcyclohexane', why: 'Count the ring carbons: there are five, so the parent is cyclopentane.' }
      ],
      diagnoseFn: (raw) => diagnoseTyped(S18, raw),
      confirm: '<name new="1-ethyl-3-methylcyclopentane" old="1-ethyl-3-methylcyclopentane"></name>: either direction gives 1,3, so the first branch alphabetically (ethyl) takes C1. A ring with a single branch needs no number at all.',
      hints: ['The ring has 5 carbons, so the parent is cyclopentane. Start numbering at one of the two branches.', 'Choose the direction that gives the lowest numbers. If both directions tie, ethyl (e) gets 1 before methyl (m).'],
      worked: 'Cyclopentane with an ethyl and a methyl with one ring carbon between them: the numbers are 1,3 either way, so ethyl takes 1 (alphabetical): 1-ethyl-3-methylcyclopentane.'
    }
  ],
  mastery: { count: 3, generator: 'alkane-names' },
  useIt: {
    book: ['2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.18', '2.19', '2.29', '2.41', '2.43', '2.45', '2.46', '2.48', '2.49', '2.50', '2.56'],
    endFrom: 29,
    note: 'In-chapter: 2.4 to 2.8 are isomers, alkyl groups and 1° to 4° carbons; 2.9 to 2.11 name and draw alkanes; 2.18 and 2.19 are cycloalkanes. End of chapter: 2.29 (the names this time), 2.41 and 2.43 (isomers and groups), 2.45 to 2.50 (draw from names, name from drawings, fix wrong names), 2.56 part (b). Leave the cis/trans ones for later.'
  }
};
