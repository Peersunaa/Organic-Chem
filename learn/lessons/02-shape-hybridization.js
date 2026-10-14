// Lesson 02: Shape & hybridization (McMurry ch. 1, sections 1.5-1.9).
// Original wording throughout; book problems are referenced by number only.
const M = '−'; // minus sign

export default {
  id: '02', slug: 'shape-hybridization', title: 'Shape & hybridization', minutes: 25,
  chapter: 1, sections: ['1.5', '1.6', '1.7', '1.8', '1.9'],
  drawing: 'full',
  goals: [
    'Predict the shape and bond angles around an atom by counting its electron groups',
    'Tell σ bonds from π bonds and count them in a molecule',
    'Assign sp³, sp² or sp to carbon, nitrogen and oxygen atoms',
    'Use electronegativity to mark the δ+ and δ' + M + ' ends of a bond'
  ],
  steps: [
    {
      id: 's01', type: 'predict', skill: 'hybridization',
      prompt: 'Methane, CH₄: four H atoms around one carbon. Rotate the model. What is the H–C–H angle?',
      visual: { widget: 'model3d', config: { mol: 'methane', highlight: [1, 0, 2] } },
      derive: { smiles: 'C', atom: 0, quantity: 'angle', value: 109.5 },
      options: [
        { text: '90°', val: 90, why: '90° is what you get if the H atoms sat flat in a square around C. Four bonds that repel each other spread out in 3D instead, so they can be farther apart than that.' },
        { text: '109.5°', val: 109.5, correct: true, why: 'Yes. Four equal bonds point to the corners of a tetrahedron.' },
        { text: '120°', val: 120, why: '120° is the angle for three bonds spread flat around an atom. Four bonds need a 3D arrangement and end up a little closer together.' },
        { text: '180°', val: 180, why: '180° is a straight line, which only fits two bonds.' }
      ],
      reveal: 'Carbon blends its 2s orbital with three 2p orbitals into four identical <b>sp³</b> hybrid orbitals. They point to the corners of a tetrahedron, 109.5° apart.'
    },
    {
      id: 's02', type: 'explain', skill: 'sigma-pi',
      html: '<p>Each sp³ orbital overlaps <b>head-on</b> with a hydrogen 1s orbital. The shared electrons sit right on the line between the two nuclei. That is a <b>σ (sigma) bond</b>.</p><p>Every single bond is one σ bond. Rotating around it does not break the overlap.</p>'
    },
    {
      id: 's03', type: 'predict', skill: 'hybridization',
      prompt: 'Ethylene, H₂C=CH₂. Rotate it all the way round. How are its six atoms arranged?',
      visual: { widget: 'model3d', config: { mol: 'ethylene' } },
      options: [
        { text: 'All six atoms lie in one flat plane', correct: true, why: 'Yes. Ethylene is flat. Look at it edge-on and you see one line of atoms.' },
        { text: 'Each carbon is tetrahedral, like methane, so the H atoms stick out above and below', why: 'That would make the H–C–H angles 109.5°, but each carbon has only 3 neighbours here (2 H and the other C), and 3 groups spread flat.' },
        { text: 'The two CH₂ ends are twisted 90° from each other', why: 'A twist is exactly what the C=C double bond prevents. The sideways overlap that makes the second bond only works when both CH₂ ends sit in the same plane.' }
      ],
      reveal: 'Each carbon has 3 neighbours, so it uses three <b>sp²</b> hybrid orbitals, flat and 120° apart. The fourth, unmixed p orbital points up and down.'
    },
    {
      id: 's04', type: 'choice', skill: 'hybridization',
      prompt: 'Still on ethylene: measure the highlighted H–C=C angle. Which value is closest?',
      visual: { widget: 'model3d', config: { mol: 'ethylene', highlight: [2, 0, 1] } },
      derive: { smiles: 'C=C', atom: 0, quantity: 'angle', value: 120 },
      options: [
        { text: '90°', val: 90, why: 'A right angle is the angle between the sp² plane and the p orbital, not between the bonds in the plane.' },
        { text: '109.5°', val: 109.5, why: 'That is the tetrahedral angle for 4 groups. This carbon has 3 groups (H, H, C).' },
        { text: '120°', val: 120, correct: true, why: 'Yes. Three groups flat around the carbon sit about 120° apart.' },
        { text: '180°', val: 180, why: '180° is a straight line. That needs only 2 groups on the carbon.' }
      ],
      hints: ['Count the groups on the carbon: two hydrogens and the other carbon (a double bond counts as ONE neighbour).', '3 groups spread out flat: the angle between them is 360° ÷ 3.'],
      worked: 'The carbon has 3 neighbours and no lone pairs, so 3 electron groups: sp², flat, about 120° (the real value is a little different because the C=C takes more space).'
    },
    {
      id: 's05', type: 'explain', skill: 'sigma-pi',
      html: '<p>Each sp² carbon has one p orbital left over, standing up above and below the plane. Two such p orbitals overlap <b>sideways</b> and form a <b>π (pi) bond</b>.</p><p>So <b>C=C is 1 σ + 1 π</b>. A triple bond is <b>1 σ + 2 π</b>: the carbon is sp, with two p orbitals left over.</p>'
    },
    {
      id: 's06', type: 'input', skill: 'sigma-pi',
      prompt: 'Rotate acetylene, H–C≡C–H. How many of its bonds are π bonds?',
      visual: { widget: 'model3d', config: { mol: 'acetylene' } },
      answer: 2,
      derive: { smiles: 'C#C', quantity: 'pi' },
      diagnose: [
        { match: 3, why: 'A triple bond is three shared pairs, but only the first is σ. The other two are π.' },
        { match: 1, why: 'That is a double bond. A triple bond has two π bonds on top of its σ bond.' },
        { match: 0, why: 'π bonds are the sideways overlaps. A triple bond has two of them.' }
      ],
      fallback: 'Triple bond = 1 σ + 2 π. How many π is that?',
      confirm: 'The triple bond is 1 σ + 2 π. The two π bonds sit at right angles to each other.',
      hints: ['In any multiple bond the first bond is σ.', 'Whatever is left over after the σ bond is π: a triple bond leaves 3 − 1 = 2.'],
      worked: 'C≡C is one σ bond plus two π bonds. The C–H bonds are single, so they have no π bond. Total π = 2.'
    },
    {
      id: 's07', type: 'input', skill: 'sigma-pi',
      prompt: 'Same molecule, H–C≡C–H. How many σ bonds? (Count the two C–H bonds too.)',
      answer: 3,
      derive: { smiles: 'C#C', quantity: 'sigma' },
      diagnose: [
        { match: 5, why: '5 counts every line of the triple bond. Only one of the three is σ: 2 C–H + 1 from the triple bond = 3.' },
        { match: 1, why: 'You counted only the σ bond between the carbons. The two C–H bonds are σ bonds too.' },
        { match: 2, why: 'Those are the two C–H σ bonds. The triple bond also contains one σ bond.' }
      ],
      fallback: 'Each bond (single, double or triple) has exactly one σ bond. Count the bonded pairs: two C–H and one C–C.',
      confirm: '2 C–H + 1 (inside the triple bond) = 3 σ bonds, plus the 2 π bonds.',
      hints: ['Count bonded pairs of atoms, not lines.', 'There are three bonded pairs: C–H, C–C and C–H. Each contains one σ bond.'],
      worked: 'Three bonded pairs (H–C, C–C, C–H), each with exactly one σ bond: 3 σ bonds. The triple bond’s other two lines are the π bonds from the last step.'
    },
    {
      id: 's08', type: 'choice', skill: 'hybridization',
      prompt: 'Rotate acetylene and measure the highlighted H–C≡C angle.',
      visual: { widget: 'model3d', config: { mol: 'acetylene', highlight: [2, 0, 1] } },
      derive: { smiles: 'C#C', atom: 0, quantity: 'angle', value: 180 },
      options: [
        { text: '90°', val: 90, why: '90° would need the bonds at right angles. With only 2 groups they point away from each other.' },
        { text: '120°', val: 120, why: '120° is for 3 groups. This carbon has just 2 (H and the other C).' },
        { text: '180°', val: 180, correct: true, why: 'Yes. Two groups point in opposite directions: the molecule is linear.' },
        { text: '109.5°', val: 109.5, why: '109.5° is for 4 groups. This carbon has 2.' }
      ],
      hints: ['How many groups surround this carbon: H, and the other C (the triple bond is one neighbour)?', 'Two groups get as far apart as possible.'],
      worked: 'The carbon has 2 neighbours and no lone pairs: 2 groups, sp, 180°. All four atoms of acetylene lie on one straight line.'
    },
    {
      id: 's09', type: 'input', skill: 'hybridization',
      prompt: 'Ammonia, NH₃. Count the electron groups on nitrogen: every bonded atom is one group and every lone pair is one group.',
      answer: 4,
      derive: { smiles: 'N', atom: 0, quantity: 'groups' },
      diagnose: [
        { match: 3, why: 'That counts only the three H atoms. Nitrogen also has a lone pair, and a lone pair takes up room like a bond does.' },
        { match: 1, why: 'That is only the lone pair. Add the three bonded H atoms.' },
        { match: 5, why: 'Nitrogen has 5 valence electrons, but groups are atoms plus lone pairs: 3 H + 1 lone pair.' }
      ],
      fallback: 'Groups = bonded atoms + lone pairs. N has three N–H bonds and one lone pair (you found this in Lesson 1).',
      confirm: '3 atoms + 1 lone pair = 4 groups, so N is sp³ just like carbon in methane. The shortcut: 4 groups = sp³, 3 = sp², 2 = sp. It works for N and O too.',
      hints: ['Remember from Lesson 1: N makes 3 bonds and has 1 lone pair here.', 'Add the number of bonded atoms and the number of lone pairs.'],
      worked: 'Three H atoms + one lone pair = 4 groups, so nitrogen is sp³.'
    },
    {
      id: 's10', type: 'choice', skill: 'hybridization',
      prompt: 'Both ammonia (1 lone pair) and water (2 lone pairs) have 4 groups, so both are tetrahedral. Rotate the two models. Which pair of H–X–H angles is right?',
      visual: { widget: 'model3d', config: { mol: 'ammonia', compare: 'water' } },
      options: [
        { text: 'NH₃ about 109.5°, H₂O about 109.5°', why: 'Lone pairs are not invisible: they take up room and push harder than bonding pairs, so the H–X–H angles close up a little below 109.5°.' },
        { text: 'NH₃ about 107°, H₂O about 104.5°', correct: true, why: 'Yes. More lone pairs squeeze the bonds closer: 109.5° (none), 107° (one), 104.5° (two).' },
        { text: 'NH₃ about 104.5°, H₂O about 107°', why: 'The order is reversed. Water has two lone pairs, so it is squeezed more than ammonia, which has one.' },
        { text: 'NH₃ about 120°, H₂O about 180°', why: 'Those are the sp² and sp angles. Both molecules have 4 groups, which keeps them near the tetrahedral angle.' }
      ],
      hints: ['Both nitrogen in NH₃ and oxygen in H₂O have 4 electron groups, so start from 109.5°.', 'Lone pairs repel the bonds more than other bonds do. Which molecule has more lone pairs?'],
      worked: 'Methane (no lone pair) 109.5°, ammonia (1 lone pair) about 107°, water (2 lone pairs) about 104.5°. The shape of the atoms is still bent for water because you only see the atoms, not the lone pairs.'
    },
    {
      id: 's11', type: 'choice', skill: 'hybridization',
      prompt: 'Rotate carbon dioxide, O=C=O. Carbon has two double bonds and no lone pairs. What is its hybridization and the O=C=O angle?',
      visual: { widget: 'model3d', config: { mol: 'co2', highlight: [0, 1, 2] } },
      derive: { smiles: 'O=C=O', atom: 1, quantity: 'hyb', value: 'sp' },
      options: [
        { text: 'sp³, 109.5°', val: 'sp3', why: 'sp³ needs 4 groups. Count the neighbours of carbon: just two oxygens (a double bond is still one neighbour).' },
        { text: 'sp², 120°', val: 'sp2', why: 'sp² needs 3 groups. Carbon here has 2 neighbours and no lone pair.' },
        { text: 'sp, 180°', val: 'sp', correct: true, why: 'Yes. 2 groups: linear, 180°. Each C=O is 1 σ + 1 π; the two π bonds use the two leftover p orbitals.' }
      ],
      hints: ['Groups = bonded atoms + lone pairs. How many oxygens are bonded to the carbon?', '2 groups = sp, and the model on screen shows the angle.'],
      worked: 'Carbon has 2 bonded atoms and 0 lone pairs = 2 groups: sp, linear (180°).'
    },
    {
      id: 's12', type: 'worked', skill: 'hybridization',
      problem: 'Find the hybridization of every atom except H in acrylonitrile, <mol smiles="C=CC#N" label="CH₂=CH–C≡N"></mol>',
      derive: { smiles: 'C=CC#N' },
      moves: [
        {
          ask: 'What do you count to get an atom’s hybridization?',
          options: [
            { text: 'Bonded atoms + lone pairs (a double or triple bond counts once)', correct: true, why: 'Yes, that is the number of electron groups.' },
            { text: 'Bond lines: a triple bond counts as 3', why: 'The three lines of a triple bond all point in one direction, so together they form a single group.' },
            { text: 'Valence electrons of the atom', why: 'Valence electrons do not tell you the geometry. A carbon is always 4, yet it can be sp³, sp² or sp.' }
          ],
          then: '4 groups = sp³, 3 = sp², 2 = sp.'
        },
        {
          ask: 'The CH₂ carbon on the left: bonded to 2 H and 1 C, no lone pairs. Hybridization?',
          check: { smiles: 'C=CC#N', atom: 0, quantity: 'hyb' },
          options: [
            { text: 'sp³', val: 'sp3', why: 'sp³ needs 4 groups, but this carbon has 3 neighbours.' },
            { text: 'sp²', val: 'sp2', correct: true, why: '3 groups: sp².' },
            { text: 'sp', val: 'sp', why: 'sp needs only 2 groups.' }
          ],
          then: 'The CH₂ carbon is sp².'
        },
        {
          ask: 'The next carbon, =CH–: bonded to H, the CH₂ carbon and the nitrile carbon. Hybridization?',
          check: { smiles: 'C=CC#N', atom: 1, quantity: 'hyb' },
          options: [
            { text: 'sp³', val: 'sp3', why: 'It has three neighbours (H, C, C), not four.' },
            { text: 'sp²', val: 'sp2', correct: true, why: '3 groups: sp².' },
            { text: 'sp', val: 'sp', why: 'sp needs only two groups, and this carbon has three.' }
          ],
          then: 'Both carbons of the C=C are sp².'
        },
        {
          ask: 'The C≡N carbon: bonded to the CH carbon and to N only. Hybridization?',
          check: { smiles: 'C=CC#N', atom: 2, quantity: 'hyb' },
          options: [
            { text: 'sp³', val: 'sp3', why: 'Count neighbours: only the CH carbon and N.' },
            { text: 'sp²', val: 'sp2', why: 'That would need 3 groups. The triple bond to N is just one group.' },
            { text: 'sp', val: 'sp', correct: true, why: '2 groups: sp, so the C–C≡N unit is straight.' }
          ],
          then: 'The nitrile carbon is sp.'
        },
        {
          ask: 'The nitrogen: bonded to one carbon, plus one lone pair. Hybridization?',
          check: { smiles: 'C=CC#N', atom: 3, quantity: 'hyb' },
          options: [
            { text: 'sp³', val: 'sp3', why: 'Count: 1 bonded atom + 1 lone pair = 2 groups.' },
            { text: 'sp²', val: 'sp2', why: '2 groups, not 3. A triple bond is a single group.' },
            { text: 'sp', val: 'sp', correct: true, why: '1 atom + 1 lone pair = 2 groups: sp. The lone pair points straight out the far end.' }
          ],
          then: 'Nitrogen is sp as well.'
        },
        {
          ask: 'How many π bonds in the whole molecule?',
          check: { smiles: 'C=CC#N', quantity: 'pi' },
          options: [
            { text: '1', val: 1, why: 'That is only the C=C. The triple bond adds two more.' },
            { text: '2', val: 2, why: 'That is only the C≡N. The C=C adds one more.' },
            { text: '3', val: 3, correct: true, why: 'C=C gives 1 π and C≡N gives 2 π.' },
            { text: '4', val: 4, why: 'Single bonds have no π bond. Count only the 2nd and 3rd bonds in multiple bonds.' }
          ],
          then: 'π bonds: 1 + 2 = 3.'
        }
      ],
      rule: '4 groups = sp³ (109.5°), 3 = sp² (120°), 2 = sp (180°). Groups = bonded atoms + lone pairs.'
    },
    {
      id: 's13', type: 'predict', skill: 'sigma-pi',
      prompt: 'Three kinds of carbon–carbon bond: C–C, C=C and C≡C. Which one is the shortest AND the strongest?',
      options: [
        { text: 'C–C, the single bond', why: 'Single is the longest and weakest of the three. It has only one shared pair.' },
        { text: 'C=C, the double bond', why: 'In the middle on both counts. There is one more shared pair to go.' },
        { text: 'C≡C, the triple bond', correct: true, why: 'Yes. Three shared pairs pull the nuclei closest together and hold them hardest.' }
      ],
      reveal: 'Measured values: C–C 154 pm, 376 kJ/mol; C=C 134 pm, 728 kJ/mol; C≡C 120 pm, 965 kJ/mol. A π bond is weaker than a σ bond, so each extra bond adds less than the first.'
    },
    {
      id: 's14', type: 'predict', skill: 'polarity',
      prompt: 'In H–F, the two atoms share a pair of electrons. Where does that pair spend more of its time?',
      derive: { a: 'F', b: 'H', quantity: 'moreEN' },
      options: [
        { text: 'Closer to H', val: 'H', why: 'Hydrogen is a small atom with a weak pull. Fluorine holds its own electrons very tightly and pulls on shared ones too.' },
        { text: 'Closer to F', val: 'F', correct: true, why: 'Yes. Fluorine is the strongest electron attractor of all the elements.' },
        { text: 'Exactly in the middle', val: 'mid', why: 'Equal sharing only happens between identical atoms, or atoms with almost the same pull, like the carbons in ethane.' }
      ],
      reveal: 'An atom’s pull on shared electrons is its <b>electronegativity</b> (EN). On the Pauling scale F = 4.0 and H = 2.1, so the electrons in H–F sit closer to F.'
    },
    {
      id: 's15', type: 'explain', skill: 'polarity',
      html: '<p>EN values to know: <b>H 2.1, C 2.5, N 3.0, O 3.5, F 4.0, Cl 3.0, Br 2.8, I 2.5</b>.</p><p>The gap (ΔEN) sets the bond type: under 0.5 is nonpolar, 0.5 to 2 is polar covalent, above 2 is largely ionic. In a polar bond the more electronegative atom is <b>δ' + M + '</b> and its partner is <b>δ+</b>.</p>'
    },
    {
      id: 's16', type: 'try', skill: 'polarity', widget: 'polarity-mark',
      prompt: 'Methanol, CH₃–OH. For each bond, tap the δ' + M + ' atom. If the bond is nearly nonpolar, choose “Not really polar”.',
      config: { smiles: 'CO', bonds: [{ a: 0, b: 1 }, { a: 1, b: 'H' }, { a: 0, b: 'H' }], showTable: true },
      confirm: 'O pulls the electrons in both C–O and O–H (O is δ' + M + '). C–H differs by only 0.4, so it is treated as nonpolar.',
      hints: ['Compare the two EN values in each row (shown under the molecule). The bigger one is δ' + M + '.', 'If the two values differ by less than 0.5, choose “Not really polar”.'],
      worked: 'C–O: 3.5 vs 2.5, so O is δ' + M + '. O–H: 3.5 vs 2.1, so O is δ' + M + '. C–H: 2.5 vs 2.1, a gap of 0.4, below 0.5: nonpolar.'
    },
    {
      id: 's17', type: 'predict', skill: 'polarity',
      prompt: 'Methyllithium, CH₃–Li. Which atom of the C–Li bond carries δ' + M + '?',
      derive: { a: 'C', b: 'Li', quantity: 'moreEN' },
      options: [
        { text: 'Li', val: 'Li', why: 'Metals usually end up as positive ions, so Li is δ+ here. The more electronegative atom is the δ' + M + ' one, and Li is the less electronegative atom (1.0).' },
        { text: 'C', val: 'C', correct: true, why: 'Yes. C (2.5) is more electronegative than Li (1.0), so carbon is δ' + M + '.' }
      ],
      reveal: 'Carbon is δ' + M + ' whenever it is bonded to something less electronegative: metals such as Li or Mg (as in CH₃Li or CH₃MgBr). That makes these carbons rich in electrons, which matters later.'
    },
    {
      id: 's18', type: 'explain', skill: 'polarity',
      html: '<p>Polar bonds push electrons around nearby σ bonds too. This shift is the <b>inductive effect</b>.</p><p>O, N and halogens <b>withdraw</b> electrons, leaving the neighbouring carbon δ+. Metals such as Li and Mg <b>donate</b> electrons, leaving the carbon δ' + M + '. You will use this to explain reactivity in later chapters.</p>'
    }
  ],
  mastery: { count: 3, generator: 'shape-basic' },
  useIt: {
    book: ['1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16', '1.17', '1.18', '1.19', '1.44', '1.45', '1.46', '1.47', '1.48', '1.49', '1.51', '1.52', '1.53'],
    note: 'In-chapter 1.8 to 1.19 cover this lesson. End of chapter: 1.44 to 1.49 are electronegativity, 1.51 to 1.53 are hybridization and bond angles. For each carbon, write its neighbour count before you name the hybridization.'
  }
};
