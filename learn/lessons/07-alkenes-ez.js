// Lesson 07: Alkenes: naming, cis/trans & E/Z (McMurry ch. 3, sections 3.1 to 3.4).
// Original wording throughout; book problems are referenced by number only.
// Every name is computed by engine/naming.js (checked against OPSIN in the tests) and shown in both IUPAC styles through <name new old>;
// every E/Z label comes from engine/cip.js (checked against RDKit's new CIP labeler in the tests).
import { diagnoseAlkene } from '../engine/naming.js';

const S_TYPED = 'C/C=C(/CC)C';       // (E)-3-methylpent-2-ene
const S_ALKYNE = 'CC#CC(C)C';         // 4-methylpent-2-yne
const S_WORKED = 'CC/C(C)=C/CC';      // (E)-3-methylhex-3-ene
const S_RING = 'CC1C=CCCC1';          // 3-methylcyclohexene

export default {
  id: '07', slug: 'alkenes-ez', title: 'Alkenes: naming, cis/trans & E/Z', minutes: 25,
  chapter: 3, sections: ['3.1', '3.2', '3.3', '3.4'],
  drawing: 'skeletal',
  goals: [
    'Name alkenes, alkynes and cycloalkenes: the parent contains the multiple bond, which gets the lowest number (in either IUPAC style)',
    'Explain why a C=C cannot rotate, and decide whether an alkene has cis/trans isomers',
    'Rank the groups on a double bond with the CIP sequence rules and label it E or Z'
  ],
  steps: [
    {
      id: 's01', type: 'predict', skill: 'naming',
      prompt: 'Hexane (left) is C₆H₁₄. The right-hand molecule is a six-carbon chain with one C=C double bond in it and no rings. How many hydrogens does it have?',
      figures: [{ smiles: 'CCCCCC', label: 'hexane, C₆H₁₄' }, { smiles: 'CCC=CCC', label: 'a six-carbon alkene' }],
      options: [
        { text: 'C₆H₁₂', correct: true, why: 'Yes. Two carbons now share a second bond, so each gave up one hydrogen: 14 − 2 = 12.' },
        { text: 'C₆H₁₄', why: 'That is hexane itself, where every bond is a single bond. A C=C bond uses up one of the places where a hydrogen could attach, so there are fewer hydrogens.' },
        { text: 'C₆H₁₀', why: 'Two fewer again than the right answer. Each extra bond (a second bond in a double bond, or a ring) removes two hydrogens, and this molecule has only one extra bond.' },
        { text: 'C₆H₁₃', why: 'A stable neutral hydrocarbon always has an even number of hydrogens here. C₆H₁₃ would be the hexyl group, which still has an open bond.' }
      ],
      reveal: 'Fewer hydrogens per carbon than the alkane means the molecule is <b>unsaturated</b>. An alkene (one C=C, no rings) is C<sub>n</sub>H<sub>2n</sub>; an alkyne (one C≡C) is C<sub>n</sub>H<sub>2n−2</sub>. Common names: ethylene (C₂H₄), propylene (C₃H₆), acetylene (C₂H₂).'
    },
    {
      id: 's02', type: 'choice', skill: 'sigma-pi',
      prompt: 'Here are real 3D models of <name new="cis-but-2-ene" old="cis-2-butene"></name> (left) and <name new="trans-but-2-ene" old="trans-2-butene"></name> (right). Rotate them. Could you turn one into the other just by twisting around the C=C bond, without breaking any bond?',
      visual: { widget: 'model3d', config: { mol: 'cis-but-2-ene', compare: 'trans-but-2-ene', highlight: [1, 2] } },
      options: [
        { text: 'No: twisting would have to break the π bond, so they are two different compounds', correct: true, why: 'Yes. Both have the same atoms and the same bonds, but in space the two CH₃ groups are on the same side in one and on opposite sides in the other. The only way across is through a twisted C=C, which pulls the π bond apart.' },
        { text: 'Yes: it is just another conformation, like rotating ethane', why: 'Rotation about a single (σ) bond keeps the head-on overlap, so it costs only about 12 kJ/mol. A double bond has a π bond made by sideways overlap of two p orbitals, and a twist ruins that overlap.' },
        { text: 'Yes, if you warm it up a little', why: 'The π bond is worth roughly 350 kJ/mol, and nothing like that energy is available at ordinary temperatures. Each isomer stays as it is: they are separate compounds that can be bottled apart.' },
        { text: 'No: the CH₃ groups are too big to slide past each other', why: 'Size has nothing to do with it. Even if the groups were tiny, twisting a C=C would still have to break the π bond.' }
      ],
      hints: ['Compare the two models: the same four heavy atoms in the same order, but different positions in space.', 'A double bond is a σ bond plus a π bond. What would twisting by 90° do to the sideways overlap of the p orbitals that make the π bond?'],
      worked: 'The two models differ only in where the CH₃ groups sit relative to the double bond. To swap them you would rotate half the molecule about the C=C axis, which takes the p orbitals out of alignment and breaks the π bond (about 350 kJ/mol). That does not happen at room temperature, so they are different compounds.',
      confirm: 'Same atoms, same bonds, different arrangement in space, and no rotation about C=C: cis and trans are different compounds.'
    },
    {
      id: 's03', type: 'explain', skill: 'sigma-pi',
      html: '<p>A C=C is one <b>σ bond</b> (sp² orbitals overlapping head-on) plus one <b>π bond</b> (two p orbitals overlapping sideways, above and below the plane). The two carbons and the four atoms on them lie in one plane, with about 120° angles.</p><p>Turning one end by 90° breaks the π overlap: about <b>350 kJ/mol</b>, against about 12 for a C–C single bond. So the groups stay where they are.</p>'
    },
    {
      id: 's04', type: 'choice', skill: 'ez',
      prompt: 'Only some alkenes come as a cis/trans pair. Which ONE of these can exist as two different compounds that differ only in which side the groups are on?',
      options: [
        { smiles: 'CC=C(C)C', label: 'A', why: 'The right-hand double-bond carbon carries two identical groups (two CH₃). Swapping them gives the same molecule, so there is only one geometry.' },
        { smiles: 'C=CCC', label: 'B', why: 'The =CH₂ carbon carries two hydrogens, which are identical. Swapping them changes nothing.' },
        { smiles: 'CCC=CC', label: 'C', correct: true, why: 'Yes. One carbon has H and CH₃, the other has H and CH₂CH₃. Each carbon has two different groups, so the CH₃ and the CH₂CH₃ can be on the same side or on opposite sides.' },
        { smiles: 'CC(C)=C(C)C', label: 'D', why: 'Both double-bond carbons carry two identical CH₃ groups. No swap can create a new compound.' }
      ],
      hints: ['Check one double-bond carbon at a time: does it have two different groups on it? Count H as a group.', 'You need two different groups on BOTH carbons. If even one carbon has two identical groups, there is only one geometry.'],
      worked: 'In C, the left double-bond carbon has H and CH₃ (different) and the right one has H and CH₂CH₃ (different). In A one carbon has two CH₃; in B one carbon has two H; in D both carbons have two CH₃. Only C passes on both carbons.',
      confirm: 'Cis/trans needs two different groups on each double-bond carbon.'
    },
    {
      id: 's05', type: 'predict', skill: 'ez',
      prompt: 'In <name new="cis-but-2-ene" old="cis-2-butene"></name> the two CH₃ groups are on the same side of the double bond; in <name new="trans-but-2-ene" old="trans-2-butene"></name> they are on opposite sides. Which do you expect to be the more stable isomer (lower in energy)?',
      figures: [{ smiles: 'C/C=C\\C', label: 'cis' }, { smiles: 'C/C=C/C', label: 'trans' }],
      options: [
        { text: 'The trans isomer: the CH₃ groups are farther apart', correct: true, why: 'Yes. Groups on the same side of the double bond get in each other’s way, which raises the energy.' },
        { text: 'The cis isomer: groups on the same side attract each other', why: 'Alkyl groups do not attract each other here; when they are forced close they repel, because their electron clouds start to overlap.' },
        { text: 'Neither: they have exactly the same energy because they have the same bonds', why: 'The same bonds do not mean the same energy. The shape differs, and crowding changes the energy.' }
      ],
      reveal: 'Crowding on the same side is called <b>steric strain</b>, so the trans isomer is usually the more stable one. Cis and trans are different compounds, so they differ in energy, melting point and more.'
    },
    {
      id: 's06', type: 'explain', skill: 'ez',
      html: '<p>Cis/trans only works for an alkene with one H on each carbon. For anything else use <b>E/Z</b>: on each double-bond carbon <b>rank the two groups</b> (CIP rules). Higher-ranked groups on the <b>same</b> side = <b>Z</b> (zusammen); on <b>opposite</b> sides = <b>E</b> (entgegen).</p><p><b>Rule 1:</b> look at the atoms directly on the carbon; higher atomic number wins: Br &gt; Cl &gt; S &gt; O &gt; N &gt; C &gt; H.</p>'
    },
    {
      id: 's07', type: 'try', skill: 'ez', widget: 'cip-ranker',
      prompt: 'Try rule 1. Tap the higher-ranked group on each double-bond carbon, then choose E or Z.',
      config: { smiles: 'C/C=C(/C)Cl' },
      confirm: 'On one carbon Cl (17) beats CH₃ (6); on the other CH₃ (6) beats H (1). Both higher-ranked groups are on the same side: Z.',
      hints: ['On each carbon compare the two atoms attached directly to it. The higher atomic number wins, and H is always last.', 'Cl beats C on one carbon, and C beats H on the other. Are those two winners on the same side of the double bond, or on opposite sides?'],
      worked: 'Left carbon: CH₃ (C, 6) beats H (1). Right carbon: Cl (17) beats CH₃ (6). The CH₃ and the Cl are both drawn below the double bond, so the higher-ranked groups are on the same side: Z.'
    },
    {
      id: 's08', type: 'predict', skill: 'ez',
      prompt: 'On this carbon the choice is between –CH₂OH and –CH(CH₃)₂. Both start with a carbon, so rule 1 ties. Which group would you rank higher?',
      smiles: 'CC=C(CO)C(C)C',
      options: [
        { text: '–CH(CH₃)₂: it has more carbons attached, so it adds up to more', why: 'Adding up is the trap. Rank by comparing the attached atoms one position at a time, highest first, and stop at the first difference. The totals never matter.' },
        { text: '–CH₂OH: its set (O, H, H) beats (C, C, H) because O beats C at the first position', correct: true, why: 'Yes. Line the sets up from the highest down: O against C, and O wins straight away. The second and third positions are not even looked at.' },
        { text: 'They tie, so the alkene has no E or Z', why: 'They do not tie. The attached atoms are (O,H,H) against (C,C,H), which differ at the first position.' },
        { text: 'Whichever group is longer', why: 'Length is not part of the rules. It is the atoms attached, compared in order.' }
      ],
      reveal: '<b>Rule 2:</b> when the first atoms tie, compare the <b>sets</b> of atoms attached to them, highest first, and stop at the first difference. It is not a sum: –CH₂OH (O,H,H) beats –CH(CH₃)₂ (C,C,H), and –CH₂Br beats –C(CH₃)₃. If the sets tie too, go one atom further out.'
    },
    {
      id: 's09', type: 'try', skill: 'ez', widget: 'cip-ranker',
      prompt: 'Now apply rule 2. Tap the higher-ranked group on each carbon, then choose E or Z. If you are stuck, press <b>Go one atom further</b> to see the attached atoms as a table.',
      config: { smiles: 'C/C=C(/CO)C(C)C' },
      confirm: 'CH₃ beats H on the left; on the right CH₂OH (O,H,H) beats CH(CH₃)₂ (C,C,H) at the first position. The two winners are on opposite sides: E.',
      hints: ['The right-hand carbon holds –CH₂OH and –CH(CH₃)₂. Write each as a set of the three atoms attached to its first carbon.', 'Compare the highest atom of each set first: O against C. Do not add the sets up.'],
      worked: 'Left carbon: CH₃ beats H. Right carbon: –CH₂OH is (O,H,H) and –CH(CH₃)₂ is (C,C,H); O beats C at the first position, so –CH₂OH is higher. CH₃ is drawn below and CH₂OH above the double bond: opposite sides, so E.'
    },
    {
      id: 's10', type: 'predict', skill: 'ez',
      prompt: 'On one carbon the choice is between –CH=CH₂ (vinyl) and –CH₂CH₃ (ethyl). Both start with a carbon. Which group ranks higher?',
      figures: [{ smiles: 'C=CC(CC)=CC', label: 'the groups sit on C3' }],
      options: [
        { text: '–CH=CH₂: a double bond counts its far atom twice, so it is (C, C, H) against (C, H, H)', correct: true, why: 'Yes. For ranking, the double bond is treated as two single bonds, so the first carbon of the vinyl group holds the far carbon twice.' },
        { text: '–CH₂CH₃: it has more hydrogens', why: 'Hydrogens are the lowest-ranked atoms, so more of them never helps. Ethyl is (C,H,H); vinyl, with the duplicate, is (C,C,H).' },
        { text: 'They tie', why: 'They do not tie once the double bond is counted properly: (C,C,H) and (C,H,H) differ at the second position.' },
        { text: '–CH=CH₂, because double bonds are stronger', why: 'Bond strength is not a ranking rule. The rule is to duplicate the atom at the far end of a multiple bond and compare the sets.' }
      ],
      reveal: '<b>Rule 3:</b> a multiple bond counts as extra single bonds to duplicate atoms. –CH=CH₂ counts as (C, C, H); C=O counts as (O, O) on the carbon; C≡C gives (C, C, C). Then compare the sets as in rule 2.'
    },
    {
      id: 's11', type: 'try', skill: 'ez', widget: 'cip-ranker',
      prompt: 'Apply rule 3. Tap the higher-ranked group on each double-bond carbon of this diene (look at the C=C in the middle), then choose E or Z.',
      config: { smiles: 'C=C/C(CC)=C\\C', bond: [2, 5] },
      confirm: 'On C3 the vinyl group (C,C,H) beats ethyl (C,H,H) once its double bond is duplicated; on C4 CH₃ beats H. Both winners are on the same side: Z.',
      hints: ['On the left carbon both groups start with C. Write the vinyl group as (C, C, H) by duplicating its double bond, and ethyl as (C, H, H).', 'Compare the two sets position by position, highest first: C against C ties, then C against H decides.'],
      worked: 'Left carbon: vinyl, duplicated, is (C,C,H); ethyl is (C,H,H). The second position decides, so vinyl is higher. Right carbon: CH₃ beats H. Vinyl and CH₃ are both drawn on the same side of the C=C: Z.'
    },
    {
      id: 's12', type: 'predict', skill: 'naming',
      prompt: 'Now names. This alkene has a 7-carbon chain, but the double bond is not in it. Which carbon count belongs to the parent of its name?',
      smiles: 'C=C(CCC)CCC',
      options: [
        { text: '7: the longest chain wins, as with alkanes', why: 'For alkenes the parent has to contain the C=C. The 7-carbon chain runs through the middle carbon but misses the =CH₂, so it cannot be the parent.' },
        { text: '5: the longest chain that contains the double bond', correct: true, why: 'Yes. =CH₂, the middle carbon and one propyl arm make 5 carbons. The other propyl group is a branch.' },
        { text: '3: just the propyl arm', why: 'The parent runs through the double bond, so it must take in both =CH₂ and the carbon next to it, and then continue as far as it can.' },
        { text: '6', why: 'There is no 6-carbon chain that contains the double bond here: from =CH₂ you can reach 5 carbons at most.' }
      ],
      reveal: 'The parent is the <b>longest chain that contains the multiple bond</b>, even when a longer chain exists elsewhere. This one is a pentene with a propyl group on C2.'
    },
    {
      id: 's13', type: 'explain', skill: 'naming',
      html: '<p><b>Alkene recipe.</b> 1 Parent: longest chain containing the C=C (<b>-ene</b>; C≡C is <b>-yne</b>). 2 Number from the end nearer the multiple bond (on a tie, nearer the first branch). 3 Add the locant: <name new="but-2-ene" old="2-butene"></name>, <name new="buta-1,3-diene" old="1,3-butadiene"></name>, <name new="pent-1-yne" old="1-pentyne"></name>. 4 Branches alphabetically, then <b>(E)</b> or <b>(Z)</b> first.</p><p>A cycloalkene is numbered C1=C2, then to give branches the lowest numbers.</p>'
    },
    {
      id: 's14', type: 'worked', skill: 'naming',
      problem: 'Worked example: give the IUPAC name of this alkene, including E or Z. You choose each move.',
      smiles: S_WORKED,
      moves: [
        {
          ask: 'Find the parent: how many carbons are in the longest chain that contains the double bond?',
          options: [
            { text: '6', correct: true, why: 'Yes. The double bond sits in the middle of a six-carbon chain; the other carbon is a methyl branch.' },
            { text: '7', why: 'Seven counts every carbon. The CH₃ on the double bond is a branch, not part of the chain.' },
            { text: '4', why: 'Four stops at the double bond. The chain keeps going on both sides of it.' }
          ],
          then: 'The parent is a hexene.',
          figure: { smiles: S_WORKED, label: 'parent: six carbons', highlight: [0, 1, 2, 4, 5, 6] }
        },
        {
          ask: 'Number the chain. Where does the double bond sit, and which end do you start from?',
          options: [
            { text: 'It is C3=C4 from either end, so start at the end nearer the CH₃ branch: methyl on C3', correct: true, why: 'Yes. The double bond is in the middle, so both ends give it the number 3. On a tie the first branch gets the lower number: 3 from the left, 4 from the right.' },
            { text: 'Start at the right-hand end, so the methyl is on C4', why: 'From the right the double bond still gets 3, but the methyl would get 4. When the double bond ties, the branch should have the lower number, 3.' },
            { text: 'The double bond is C2=C3', why: 'Count again: two carbons lie before the double bond from the left, so it starts on C3.' }
          ],
          then: 'The parent is <name new="hex-3-ene" old="3-hexene"></name> with a methyl on C3.'
        },
        {
          ask: 'E or Z? Rank the groups on C3 and on C4 and see which side the winners are on. The higher-ranked groups are…',
          options: [
            { text: 'ethyl on C3 and ethyl on C4: on opposite sides, so E', correct: true, why: 'Yes. On C3, ethyl (C,H,H) beats methyl (H,H,H); on C4, ethyl beats H. The two ethyl groups are drawn on opposite sides of the double bond: E.' },
            { text: 'ethyl on C3 and ethyl on C4: on the same side, so Z', why: 'Look at the drawing again: one ethyl goes down-left and the other up-right, so the winners are on opposite sides.' },
            { text: 'methyl on C3 and ethyl on C4', why: 'Methyl loses to ethyl: its set is (H,H,H), against ethyl’s (C,H,H).' }
          ],
          then: 'So the geometry is E.'
        },
        {
          ask: 'Assemble the name: (E or Z), then the branch, then the parent with its locant.',
          options: [
            { text: '<name new="(E)-3-methylhex-3-ene" old="(E)-3-methyl-3-hexene"></name>', correct: true, why: 'Yes. The stereo label goes first in brackets, then the branch with its number, then the parent. In the new style the locant sits before -ene; in the old style it goes in front of the parent.' },
            { text: '<name new="(Z)-3-methylhex-3-ene" old="(Z)-3-methyl-3-hexene"></name>', why: 'The geometry is E, not Z.' },
            { text: '<name new="3-methylhex-3-ene" old="3-methyl-3-hexene"></name>', why: 'Right parent, but this alkene fixes its geometry (two different groups on each carbon), so it needs (E) in front.' },
            { text: '<name new="(E)-4-methylhex-3-ene" old="(E)-4-methyl-3-hexene" wrong="1"></name>', why: 'The methyl must get the lower number: 3, counting from the end nearer the branch.' }
          ],
          then: 'Done. Flip the New/Old IUPAC switch and watch where the locant moves.'
        }
      ],
      rule: 'Longest chain containing the C=C; number so the multiple bond (then the first branch) gets the lowest number; rank the groups on each carbon for E/Z; write (E/Z), branches, parent with its locant.'
    },
    {
      id: 's15', type: 'input', skill: 'naming',
      prompt: 'Name this alkene, including E or Z. Type it in either IUPAC style; spaces, capitals and hyphens do not matter, but numbers and order do.',
      smiles: S_TYPED,
      name: true,
      answer: '(E)-3-methylpent-2-ene', accept: ['(E)-3-methyl-2-pentene'],
      diagnose: [
        { match: '3-methylpent-2-ene', why: 'The parent and numbers are right, but this alkene has two different groups on each double-bond carbon, so its geometry matters: start the name with (E) or (Z).' },
        { match: '(Z)-3-methylpent-2-ene', why: 'Rank the groups: on C2, CH₃ beats H; on C3, ethyl (C,H,H) beats methyl (H,H,H). The CH₃ on C2 and the ethyl on C3 are on opposite sides, so the alkene is E, not Z.' },
        { match: '(E)-2-ethylbut-2-ene', why: 'The parent has to be the longest chain that contains the double bond: five carbons, going through the ethyl group, not four.' },
        { match: '(E)-3-methylpent-3-ene', why: 'Number from the end that gives the double bond the lowest number: here that is the end next to the CH₃ on the double bond, so the double bond is at C2.' }
      ],
      diagnoseFn: (raw) => diagnoseAlkene(S_TYPED, raw),
      confirm: '<name new="(E)-3-methylpent-2-ene" old="(E)-3-methyl-2-pentene"></name>: a pentene (longest chain through the double bond), double bond at C2, methyl on C3, and E because CH₃ and ethyl, the higher-ranked groups, are on opposite sides.',
      hints: ['The parent is the longest chain that contains the double bond. Number from the end that gives the double bond the lowest number, then place the methyl.', 'To choose E or Z, rank the two groups on each double-bond carbon. If the winners are on the same side the alkene is Z, on opposite sides it is E.'],
      worked: 'Five-carbon chain through the double bond; number so the double bond is at C2 and the methyl on C3. C2: CH₃ beats H. C3: ethyl beats methyl. They are on opposite sides: E. The name is <name new="(E)-3-methylpent-2-ene" old="(E)-3-methyl-2-pentene"></name>.'
    },
    {
      id: 's16', type: 'choice', skill: 'naming',
      prompt: 'Rings now. In a cycloalkene the double bond is C1=C2, and the ring is then numbered in the direction that gives the substituent the lowest number. Which name fits this molecule?',
      smiles: S_RING,
      options: [
        { text: '<name new="3-methylcyclohexene" old="3-methylcyclohexene"></name>', correct: true, why: 'Yes. C1=C2 is the double bond, and counting on from C2 the methyl-bearing carbon is C3.' },
        { text: '<name new="6-methylcyclohexene" old="6-methylcyclohexene" wrong="1"></name>', why: 'Number in the direction that gives the lower number. Going the other way round the ring the methyl would be on C6; from the other double-bond carbon it is on C3.' },
        { text: '<name new="1-methylcyclohexene" old="1-methylcyclohexene"></name>', why: 'That is a different molecule: there the methyl is on a double-bond carbon. In the drawing the methyl sits one carbon away from the double bond.' },
        { text: '<name new="methylcyclohexene" old="methylcyclohexene" wrong="1"></name>', why: 'A methyl in this ring could be on several different carbons, so the name needs a number.' }
      ],
      hints: ['Start with the two double-bond carbons as C1 and C2. Which of them should be C1 to give the methyl the lower number?', 'The methyl-bearing carbon is next to a double-bond carbon. Counting 1, 2, then 3, where does it land?'],
      worked: 'Number the double bond carbons C1 and C2, choosing C2 to be the one next to the methyl-bearing carbon. The methyl carbon is then C3: 3-methylcyclohexene. The other direction would call it C6.',
      confirm: 'Cycloalkene: the double bond is C1=C2 (so it needs no number), then number for the lowest substituent numbers.'
    },
    {
      id: 's17', type: 'input', skill: 'naming',
      prompt: 'Name this alkyne. The same rules apply, with -yne in place of -ene. Type it in either IUPAC style.',
      smiles: S_ALKYNE,
      name: true,
      answer: '4-methylpent-2-yne', accept: ['4-methyl-2-pentyne'],
      diagnose: [
        { match: '2-methylpent-3-yne', why: 'The triple bond must get the lowest number, before any branch does: counting from the end nearer the triple bond puts it at C2 and the methyl on C4.' },
        { match: 'methylpent-2-yne', why: 'The methyl branch needs its own number: say which carbon of the chain it is on.' },
        { match: '4-methylpentyne', why: 'The triple bond needs a number: <name new="pent-1-yne" old="1-pentyne"></name> and <name new="pent-2-yne" old="2-pentyne"></name> are different compounds.' },
        { match: '4-methylpent-2-ene', why: 'The ending -ene is for a double bond. A triple bond ends in -yne.' }
      ],
      diagnoseFn: (raw) => diagnoseAlkene(S_ALKYNE, raw),
      confirm: '<name new="4-methylpent-2-yne" old="4-methyl-2-pentyne"></name>: the triple bond gets the lowest number (2), not the methyl.',
      hints: ['The parent is the longest chain that contains the triple bond: 5 carbons. Number from the end nearer the triple bond.', 'Put the locant of the triple bond next to -yne (or in front of the parent in the traditional style) and add the methyl branch with its number.'],
      worked: 'Five carbons: pentyne. Numbering from the left puts the triple bond at C2 and the methyl on C4; from the right it would be at C3 with the methyl on C2. The multiple bond gets the lowest number, so the name is <name new="4-methylpent-2-yne" old="4-methyl-2-pentyne"></name>.'
    },
    {
      id: 's18', type: 'choice', skill: 'naming',
      prompt: 'A few names are used everywhere. Ethylene is C₂H₄ and acetylene is C₂H₂. Two groups are named for alkenes too: <b>vinyl</b> is –CH=CH₂ and <b>allyl</b> is –CH₂–CH=CH₂. Which molecule contains an allyl group?',
      options: [
        { smiles: 'C=CCCl', label: 'A', correct: true, why: 'Yes. CH₂=CH–CH₂– is the allyl group, here on a chlorine: allyl chloride.' },
        { smiles: 'C=CCl', label: 'B', why: 'The Cl is on the double-bond carbon itself: that is a vinyl group (–CH=CH₂), as in vinyl chloride.' },
        { smiles: 'CC=CCl', label: 'C', why: 'The Cl-bearing carbon is =CH–, with a CH₃ on the other end. There is no –CH₂–CH=CH₂ unit.' },
        { smiles: 'CCCCl', label: 'D', why: 'No double bond at all: this is propyl chloride.' }
      ],
      hints: ['Allyl is a three-carbon group: a CH₂ attached to the rest of the molecule, then CH=CH₂.', 'Find the molecule where a CH₂ (single bonds only) joins the Cl to a C=C.'],
      worked: 'Allyl = –CH₂–CH=CH₂. In A the Cl is on a CH₂ that is followed by CH=CH₂. In B the Cl is on the double bond itself (vinyl).',
      confirm: 'Vinyl is –CH=CH₂ (attached through a double-bond carbon); allyl is –CH₂CH=CH₂.'
    }
  ],
  mastery: { count: 3, generator: 'alkene-names' },
  useIt: {
    book: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10', '3.20', '3.21', '3.29', '3.30', '3.31', '3.32', '3.33', '3.34', '3.35', '3.36', '3.37', '3.38', '3.39', '3.40', '3.41', '3.42', '3.43', '3.44', '3.45'],
    endFrom: 20,
    note: 'In-chapter: 3.1 to 3.5 name and draw alkenes, 3.6 and 3.7 are cis/trans, 3.8 to 3.10 are the sequence rules and E/Z. End of chapter: 3.20 and 3.21 (name and assign E/Z from drawings), 3.29 to 3.34 (naming alkenes, alkynes and cycloalkenes, and fixing wrong names), 3.35 to 3.39 (which show cis/trans, drawing isomers), 3.40 to 3.42 (rank groups, assign E/Z), 3.43 to 3.45 (draw and name isomers).'
  }
};
