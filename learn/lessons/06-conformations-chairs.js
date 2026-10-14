// Lesson 06: Conformations & chairs (McMurry ch. 2, sections 2.5 and 2.8-2.11).
// Original wording throughout; book problems are referenced by number only.
// 3D: real RDKit/MMFF coordinates (data/3d/models.js, data/3d/chairs.js) rotated or flipped in the browser; every axial/equatorial
// label, dihedral and energy on screen is computed from those coordinates (engine/widgets/newman-core.js, chair-core.js).

const RULE_LAB = ['dm-cis-12', 'dm-trans-12', 'dm-cis-13', 'dm-trans-13', 'dm-cis-14', 'dm-trans-14'];

export default {
  id: '06', slug: 'conformations-chairs', title: 'Conformations & chairs', minutes: 28,
  chapter: 2, sections: ['2.5', '2.8', '2.9', '2.10', '2.11'],
  drawing: 'skeletal',
  goals: [
    'Turn a C–C bond in 3D and read staggered and eclipsed conformations in Newman projections',
    'Explain why rings have cis–trans isomers and why small rings are strained',
    'Tell axial from equatorial on a cyclohexane chair and predict what a ring flip does',
    'Choose the more stable chair of a substituted cyclohexane'
  ],
  steps: [
    {
      id: 's01', type: 'predict', skill: 'conformations',
      prompt: 'This is a real 3D model of ethane: two CH₃ groups joined by a single C–C bond. Suppose you hold one CH₃ still and twist the other about that bond. What happens?',
      visual: { widget: 'model3d', config: { mol: 'ethane' } },
      options: [
        { text: 'The C–C bond breaks, so twisting makes a different molecule', why: 'The single bond is head-on overlap along the line between the two carbons. Turning one end about that line does not pull the overlap apart, so nothing breaks.' },
        { text: 'Nothing can happen: the atoms are locked in place', why: 'Head-on overlap looks the same from every side of the bond, so the two ends are free to turn. Only the hydrogens’ positions relative to each other change.' },
        { text: 'It is still ethane, but the hydrogens now sit in different places relative to each other', correct: true, why: 'Yes. The overlap, and so the bond, is the same at every twist angle. The molecule is unchanged; only the arrangement in space changes.' },
        { text: 'The C–C bond turns into a double bond', why: 'A double bond needs a second, sideways (π) overlap and two fewer hydrogens. Twisting never changes how many bonds there are.' }
      ],
      reveal: 'The different arrangements you get by turning about a single bond are called <b>conformations</b>, and the molecules are <b>conformers</b>. Unlike constitutional isomers, conformers usually cannot be isolated, because they swap places too quickly.'
    },
    {
      id: 's02', type: 'try', skill: 'conformations',
      prompt: 'Turn the rear CH₃ with the slider (or drag around the Newman circle). Lock two arrangements: first the one where the six C–H bonds are as <b>far apart</b> as possible, then the one where they are as <b>close together</b> as possible.',
      widget: 'newman-rotator',
      config: { mol: 'ethane', need: ['min', 'max'], energy: false, pill: false, start: 25, lockLabels: { min: 'Lock: C–H bonds as far apart as possible', max: 'Lock: C–H bonds as close together as possible' } },
      hints: ['In the Newman circle the “far apart” arrangement has six bonds evenly spaced, each 60° from its neighbours.', 'The crowded arrangement hides each rear bond directly behind a front bond, so you only see three lines.'],
      worked: 'Far apart: every rear bond sits exactly halfway between two front bonds (slider at 60°, 180° or 300°). Close together: each rear bond lies right behind a front bond (slider at 0°, 120° or 240°).',
      confirm: 'You found both extremes. The 3D model and the Newman circle moved together because they are the same coordinates.'
    },
    {
      id: 's03', type: 'explain', skill: 'conformations',
      html: '<p>A <b>Newman projection</b> looks straight down the C–C bond: the front carbon is the centre where three bonds meet, the rear carbon is the circle, and its bonds start at the edge. A <b>sawhorse</b> drawing shows the same bond from an angle.</p><p>Your two finds are <b>staggered</b> (bonds as far apart as possible) and <b>eclipsed</b> (bonds lined up).</p>'
    },
    {
      id: 's04', type: 'input', skill: 'conformations',
      prompt: 'The energy is switched on now. Turn through a full circle and watch the marker on the curve. By how many kJ/mol is the eclipsed arrangement higher in energy than the staggered one?',
      visual: { widget: 'newman-rotator', config: { mol: 'ethane', need: [], energy: true, pill: true, start: 25 } },
      answer: 12, accept: ['12.0'],
      diagnose: [
        { match: 6, why: '6 kJ/mol is the height halfway up the curve (about 30° away from staggered). The barrier is measured from the lowest point to the peak.' },
        { match: 0, why: 'Zero is the energy of the staggered arrangement, the lowest point. The question asks for the gap up to the peak.' },
        { match: 4, why: '4 is what one eclipsed H–H pair costs, which you meet in the next step. The curve’s peak is higher because several pairs are eclipsed at once.' }
      ],
      hints: ['Read the highest point of the curve on the vertical axis (kJ/mol).', 'The lowest point is 0, so the barrier is simply the value at the peak.'],
      worked: 'The staggered arrangement is at 0 kJ/mol and the eclipsed peak is at 12 kJ/mol, so the barrier to rotation is 12 kJ/mol.',
      confirm: 'The barrier to rotation in ethane is 12 kJ/mol.'
    },
    {
      id: 's05', type: 'input', skill: 'conformations',
      prompt: 'In eclipsed ethane there are three C–H bonds on the front carbon, each directly in line with one on the rear carbon: three eclipsed H–H pairs. If the whole 12 kJ/mol comes from those three pairs equally, how many kJ/mol does one eclipsed H–H pair cost?',
      answer: 4, accept: ['4.0'],
      diagnose: [
        { match: 12, why: '12 kJ/mol is the cost of all three pairs together. Share it among the three.' },
        { match: 36, why: 'That multiplies instead of dividing: 12 is already the total for three pairs.' },
        { match: 3, why: '3 is the number of pairs. The question asks for the energy each one contributes.' }
      ],
      hints: ['The total (12 kJ/mol) is split across 3 equal pairs.', '12 ÷ 3 = ?'],
      worked: '12 kJ/mol ÷ 3 pairs = 4.0 kJ/mol per eclipsed H–H pair.',
      confirm: 'About 4.0 kJ/mol each. This extra energy of an eclipsed arrangement is called torsional strain.'
    },
    {
      id: 's06', type: 'try', skill: 'conformations',
      prompt: 'Now swap one H for a bromine: this is bromoethane (the CH₂Br carbon is in front, its Br is one of the front bonds). The energy curve is on. Find and lock the highest-energy arrangement. Is the peak higher or lower than ethane’s 12?',
      widget: 'newman-rotator',
      config: { mol: 'bromoethane', need: ['max'], energy: true, pill: true, start: 40, lockLabels: { max: 'Lock the highest-energy arrangement' } },
      hints: ['Follow the marker on the energy curve up to its peak.', 'At the peak every rear bond is hidden behind a front bond, including one rear H directly behind the Br.'],
      worked: 'The peak (eclipsed, the Br hidden behind a rear H) is at about 15 kJ/mol, above ethane’s 12. An H–Br eclipsing interaction costs more than an H–H one.',
      confirm: 'The peak is 15 kJ/mol. Bromine is larger than hydrogen, so an H–Br eclipsing interaction costs more than an H–H one.'
    },
    {
      id: 's07', type: 'predict', skill: 'conformations',
      prompt: 'A 12 kJ/mol barrier is low enough that ethane molecules keep turning at room temperature. At any one instant, roughly what share of ethane molecules are close to the staggered arrangement?',
      options: [
        { text: 'About half: staggered and eclipsed are equally likely', why: 'They are not equally likely. The eclipsed form sits 12 kJ/mol higher, and molecules strongly favour the lower energy.' },
        { text: 'About 99%', correct: true, why: 'Yes. The staggered form is so much lower that nearly every molecule is near it at any instant.' },
        { text: 'Only a few percent: most are eclipsed', why: 'It is the other way round: the higher-energy eclipsed form is the rare one.' },
        { text: '100%: no molecule is ever eclipsed', why: 'At room temperature 12 kJ/mol is within reach, so molecules do pass through the eclipsed arrangement, just rarely, which is why the groups can keep turning.' }
      ],
      reveal: 'About 99% of ethane molecules are near staggered at any instant and only about 1% near eclipsed. The same is true of propane, butane and every larger alkane: bonds on neighbouring carbons prefer to be staggered.'
    },
    {
      id: 's08', type: 'predict', skill: 'chairs',
      prompt: 'Ethane’s ends turn freely. Now look at two 1,2-dimethylcyclopropanes: the methyls on the same face of the ring, or on opposite faces. Could you convert one into the other just by turning about a C–C bond, without breaking anything?',
      visual: { widget: 'model3d', config: { mol: 'cis-dmcp', compare: 'trans-dmcp' } },
      options: [
        { text: 'Yes: turn about one of the ring bonds', why: 'In a ring, turning about a ring bond would drag the rest of the ring with it and stretch the other bonds until the ring breaks. The ring holds each carbon’s groups on a fixed face.' },
        { text: 'No: you would have to break bonds', correct: true, why: 'Right. Inside a ring there is no free rotation, so the two isomers cannot interconvert without breaking and re-forming bonds.' },
        { text: 'They are the same molecule drawn differently', why: 'Same-face and opposite-face methyls are different compounds with different properties; no rotation can make one into the other.' },
        { text: 'Only if the ring is heated gently', why: 'Gentle heating only speeds up motions such as twisting about single bonds. Swapping faces needs bonds to break, which is a far bigger change.' }
      ],
      reveal: 'A ring has two faces, so substituents can be on the same face (<b>cis</b>) or opposite faces (<b>trans</b>). These are <b>stereoisomers</b>: the same connections, a different arrangement in space. They are separate, isolable compounds, unlike conformers.'
    },
    {
      id: 's09', type: 'choice', skill: 'chairs',
      prompt: 'In a flat ring drawing a wedge comes toward you and a dash goes away. Which name matches this drawing?',
      smiles: 'C[C@H]1CC[C@H](Cl)CC1',
      options: [
        { text: 'cis-1-chloro-4-methylcyclohexane', opsin: 'cis-1-chloro-4-methylcyclohexane', why: 'Cis would need both groups on the same face (two wedges or two dashes). Here one is a wedge and one a dash, so they are on opposite faces.' },
        { text: 'trans-1-chloro-4-methylcyclohexane', opsin: 'trans-1-chloro-4-methylcyclohexane', correct: true, why: 'Yes. One wedge and one dash put the groups on opposite faces: trans. They are on carbons 1 and 4 of the ring.' },
        { text: 'cis-1-chloro-3-methylcyclohexane', opsin: 'cis-1-chloro-3-methylcyclohexane', why: 'The groups are on carbons 1 and 4, with two ring carbons between them on each side. A 1,3 pattern would leave only one ring carbon between them on one side.' },
        { text: 'trans-1-chloro-3-methylcyclohexane', opsin: 'trans-1-chloro-3-methylcyclohexane', why: 'The face is right (opposite) but the positions are not: the groups are on carbons 1 and 4, with two ring carbons between them on each side.' }
      ],
      hints: ['First decide the face of each group: wedge or dash.', 'Then count the ring carbons from one group to the other: with two carbons between them on each side they are 1,4.'],
      worked: 'One wedge and one dash: opposite faces, so trans. Counting round the ring, the groups are on carbons 1 and 4. The name is trans-1-chloro-4-methylcyclohexane.',
      confirm: 'Opposite faces, 1,4: trans-1-chloro-4-methylcyclohexane.'
    },
    {
      id: 's10', type: 'predict', skill: 'chairs',
      prompt: 'Three carbons always form a flat triangle. Here is cyclopropane as a 3D model. Carbon likes bond angles near 109.5°. What do you expect the ring to do to the molecule’s energy and reactivity?',
      visual: { widget: 'model3d', config: { mol: 'cyclopropane' } },
      options: [
        { text: 'Nothing: bond angles can be squeezed for free', why: 'Bending a bond angle away from its comfortable value costs energy, and here the C–C–C angle is 60°, only about half of 109.5°.' },
        { text: 'It raises the energy and makes the molecule more reactive than an unstrained alkane', correct: true, why: 'Yes. The 60° angles are far from 109.5°. That is angle strain, and the strained ring is more reactive.' },
        { text: 'It makes cyclopropane extra stable, because rings are rigid', why: 'Rigid does not mean stable. The forced 60° angles are the source of strain, not stability.' },
        { text: 'The ring puckers so every angle becomes 109.5°', why: 'Three points always lie in a plane, so cyclopropane cannot pucker, and its C–C–C angles are all 60°.' }
      ],
      reveal: 'Cyclopropane is flat with 60° C–C–C angles, so its energy is raised by <b>angle strain</b>. Its six C–H bonds are also all eclipsed with their neighbours, as in eclipsed ethane. Cyclobutane and cyclopentane pucker a little to ease that eclipsing.'
    },
    {
      id: 's11', type: 'try', skill: 'chairs',
      prompt: 'Cyclohexane does not lie flat: this solid 3D model is its “chair” shape. The dashed line is the ring’s axis. Tap hydrogens on the model as asked.',
      widget: 'chair-flip',
      config: { mode: 'tap-h', model: 'cyclohexane' },
      hints: ['Turn the model so the dashed line is vertical. Look for hydrogens that run parallel to it.', 'The other six hydrogens point out sideways around the ring, away from the dashed line.'],
      worked: 'Six hydrogens run parallel to the dashed axis (three pointing up, three down, alternating around the ring). The other six point outward around the rim of the ring, close to its mean plane.',
      confirm: 'Two kinds of hydrogen: six parallel to the axis and six around the rim.'
    },
    {
      id: 's12', type: 'explain', skill: 'chairs',
      html: '<p>The chair has almost no strain: C–C–C angles near 111° and every neighbouring C–H staggered.</p><p><b>Axial</b> bonds run parallel to the ring axis, one on each carbon, alternating up, down, up, down. <b>Equatorial</b> bonds point outward around the ring’s rim, tilted slightly the opposite way to the axial bond on the same carbon. Each carbon has one of each.</p>'
    },
    {
      id: 's13', type: 'try', skill: 'chairs',
      prompt: 'This is methylcyclohexane. Decide whether the circled CH₃ is axial or equatorial in this chair. Then press Flip and decide again.',
      widget: 'chair-flip',
      config: { mode: 'flip-identify', model: 'methylcyclohexane' },
      hints: ['Compare the methyl’s bond with the dashed axis line: parallel means axial.', 'An equatorial bond leaves the ring around its rim, nearly level with the ring’s own plane.'],
      worked: 'In the first chair the methyl points outward around the rim: equatorial. After the ring flip it is parallel to the dashed axis: axial. It stays on the same face of the ring throughout, so “up stays up” while axial and equatorial swap.',
      confirm: 'A ring flip swaps axial and equatorial at every carbon, but each group stays on its own face.'
    },
    {
      id: 's14', type: 'predict', skill: 'chairs',
      prompt: 'The two chairs are the same molecule, methylcyclohexane, before and after a ring flip. The methyl is circled; red dashes mark contacts between it and other atoms. Which chair do you expect to be more stable?',
      visual: { widget: 'chair-flip', config: { mode: 'sidebyside', model: 'methylcyclohexane', order: ['b', 'a'], titles: ['Chair 1', 'Chair 2'] } },
      options: [
        { text: 'Chair 1', why: 'In Chair 1 the methyl is axial. It points the same way as the two axial hydrogens on the carbons two places away (the red dashes): too close, so they crowd each other.' },
        { text: 'Chair 2', correct: true, why: 'Yes. Here the methyl is equatorial, out around the rim, with nothing pointing back at it.' },
        { text: 'They are exactly equal: it is the same molecule', why: 'Same molecule, different energy. A ring flip changes which positions the methyl and hydrogens occupy, and the axial position is more crowded.' },
        { text: 'It depends on which way you view the model', why: 'The energy is a property of the arrangement of atoms, not of the viewing angle. Rotate the models and the contacts stay the same.' }
      ],
      reveal: 'The equatorial chair is more stable by 7.6 kJ/mol, so about 95% of methylcyclohexane molecules have the methyl equatorial at any instant. In the axial chair the methyl crowds the axial hydrogens on carbons 3 and 5 on its side: a <b>1,3-diaxial interaction</b>, which is <b>steric strain</b>.'
    },
    {
      id: 's15', type: 'predict', skill: 'chairs',
      prompt: 'Replace the CH₃ by tert-butyl, C(CH₃)₃, a much bulkier group, and keep the same ring. Compared with methylcyclohexane’s 95% equatorial, how strongly does tert-butylcyclohexane prefer the equatorial chair?',
      options: [
        { text: 'Less strongly: bigger groups need more room, so they like axial', why: 'It is the other way round: axial is the crowded position, and the bigger the group, the more strain it suffers there.' },
        { text: 'About the same, since only the first carbon matters', why: 'The strain comes from the whole group bumping the axial hydrogens, so a bigger group means more strain, not the same.' },
        { text: 'Much more strongly: it is essentially always equatorial', correct: true, why: 'Yes. The axial strain grows with the size of the group, and tert-butyl’s is so large that the axial chair is almost never populated.' },
        { text: 'It cannot be on a ring at all', why: 'It can, and it is common. It simply sits equatorial.' }
      ],
      reveal: 'A substituent is always more stable equatorial, and the steric strain of putting it axial grows with its size. A tert-butyl group is so large that it is, in practice, <b>locked</b> equatorial.'
    },
    {
      id: 's16', type: 'try', skill: 'chairs',
      prompt: 'Six dimethylcyclohexanes are listed. For each one, flip the ring and read the line under the model. Can both CH₃ groups be equatorial in the same chair?',
      widget: 'chair-flip',
      config: { mode: 'rule-lab', models: RULE_LAB, start: 'b' },
      hints: ['Flip each model and read the line under it: you are looking for one chair where both CH₃ groups are equatorial.', 'If neither chair has both equatorial, the answer is no. A flip swaps axial and equatorial at both carbons, so an axial/equatorial pair stays axial/equatorial.'],
      worked: 'Both can be equatorial for trans-1,2, cis-1,3 and trans-1,4 (the two chairs are diequatorial and diaxial). For cis-1,2, trans-1,3 and cis-1,4 one CH₃ is always axial and the other equatorial.',
      confirm: 'You mapped all six. Notice the pattern in which ones can be diequatorial.'
    },
    {
      id: 's17', type: 'explain', skill: 'chairs',
      html: '<p>Both groups can sit equatorial in <b>trans-1,2</b>, <b>cis-1,3</b> and <b>trans-1,4</b> isomers, and that isomer is the more stable one. In the others one group must be axial, so the <b>bigger</b> group takes the equatorial spot.</p><p>Size order: H &lt; F &lt; Cl &lt; OH &lt; Me &lt; Et &lt; iPr &lt; tBu.</p>'
    },
    {
      id: 's18', type: 'worked', skill: 'chairs',
      problem: 'Find the most stable chair of <b>trans-1,4-dimethylcyclohexane</b>. Choose each move.',
      smiles: 'C[C@H]1CC[C@H](C)CC1',
      moves: [
        { ask: 'Read the drawing. Are the two methyl groups on the same face or on opposite faces?',
          options: [
            { text: 'Opposite faces: one wedge, one dash (trans)', correct: true, why: 'Yes, one methyl is wedged and one dashed, which is trans.' },
            { text: 'The same face (cis)', why: 'Cis would show two wedges or two dashes. Here the two bond styles differ.' }
          ] },
        { ask: 'On carbons 1 and 4, what do the two axial bonds do?',
          options: [
            { text: 'They point in opposite directions, so a trans pair can be both axial or both equatorial', correct: true, why: 'Yes. Axial bonds alternate up and down around the ring, and 1 and 4 are on opposite sides of the alternation, so trans-1,4 gives two chairs: diaxial and diequatorial.' },
            { text: 'They point the same way, so a trans pair must be axial plus equatorial', why: 'Axial bonds on carbons 1 and 4 point in opposite directions. That makes a trans pair both axial (or both equatorial), not one of each.' }
          ] },
        { ask: 'Which of those two chairs is more stable?',
          options: [
            { text: 'The diequatorial chair', correct: true, why: 'Yes. With both methyls equatorial there are no 1,3-diaxial contacts. In the diaxial chair each methyl would have two, roughly twice the 7.6 kJ/mol penalty of a single axial methyl.' },
            { text: 'The diaxial chair', why: 'Axial is the crowded position, so two axial methyls have the most 1,3-diaxial strain, not the least.' }
          ] }
      ],
      rule: 'For a disubstituted ring, identify cis or trans, check whether the pattern (1,2 / 1,3 / 1,4) allows both groups equatorial, and pick that chair; if it does not, put the bigger group equatorial.'
    }
  ],
  mastery: { count: 3, generator: 'chairs' },
  useIt: {
    book: ['2.12', '2.13', '2.14', '2.20', '2.21', '2.22', '2.23', '2.24', '2.25', '2.26', '2.27', '2.28', '2.52', '2.53', '2.54', '2.55', '2.56', '2.57', '2.58', '2.59', '2.60', '2.61'],
    note: 'In-chapter problems for sections 2.5 and 2.8–2.11, then the end-of-chapter set Conformations and Cis–Trans Isomerism. Problems 2.13–2.14 and 2.52–2.53 involve butane or 2-methylbutane: this lesson did not cover those, so use the 2.5 rule that large groups prefer to be far apart.'
  }
};
