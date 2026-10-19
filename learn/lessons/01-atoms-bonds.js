// Lesson 01: Atoms, electrons and bonds (McMurry ch. 1, sections 1.1-1.4 + formal charge).
const M = '−'; // minus sign

export default {
  id: '01', slug: 'atoms-bonds', title: 'Atoms, electrons and bonds', minutes: 25,
  chapter: 1, sections: ['1.1', '1.2', '1.3', '1.4'],
  goals: [
    'Count valence electrons for the atoms you meet in organic chemistry',
    'Predict how many bonds and lone pairs C, N, O, H and the halogens have',
    'Draw Lewis structures, including double and triple bonds',
    'Calculate formal charge'
  ],
  steps: [
    {
      id: 's01', type: 'predict', skill: 'bond-count',
      prompt: 'In a stable neutral molecule, how many bonds does carbon usually make?',
      derive: { element: 'C', quantity: 'bonds', value: 4 },
      options: [
        { text: '2', why: 'That’s oxygen’s usual number (8 − 6 = 2). Carbon has 4 valence electrons, so it needs 4 bonds to reach 8.' },
        { text: '3', why: 'That’s nitrogen’s usual number (8 − 5 = 3). Carbon has 4 valence electrons, so it needs 4 bonds to reach 8.' },
        { text: '4', correct: true, why: 'Yes, carbon makes four bonds.' },
        { text: '6', why: 'Carbon only has 4 outer electrons to share; 6 bonds would put 12 electrons around it.' }
      ],
      reveal: 'Carbon has 4 valence (outer) electrons and wants 8 around it (an octet). Each bond shares one more pair, so it makes 4 bonds.'
    },
    {
      id: 's02', type: 'input', skill: 'valence-electrons',
      prompt: 'Carbon has 6 electrons, written 1s² 2s² 2p²: the first number is the shell (1 is closest to the nucleus, 2 is the outer shell here). How many are valence (outer-shell) electrons?',
      answer: 4,
      derive: { element: 'C', quantity: 'valence' },
      diagnose: [
        { match: 6, why: 'You counted all electrons. The 1s² pair is the inner shell and doesn’t bond.' },
        { match: 2, why: 'Valence = everything in the outer shell (shell 2): 2s² + 2p² = 4.' }
      ],
      fallback: 'Valence electrons are the ones in the outermost shell. For carbon that is shell 2: 2s² + 2p².',
      confirm: 'Right: 2 + 2 = 4 valence electrons.',
      hints: ['Which shell is the outer one? 1s is shell 1, 2s and 2p are shell 2.', 'Add only the electrons written in shell 2: 2s² and 2p².'],
      worked: 'The 1s² pair is the inner shell. The outer shell holds 2s² + 2p² = 4 valence electrons.'
    },
    {
      id: 's03', type: 'try', skill: 'valence-electrons', widget: 'valence-strip',
      prompt: 'Type the number of valence electrons for each atom.',
      aside: '<table class="gl-vt"><caption>A mini periodic table: the group number is on top</caption><thead><tr><th scope="col">1</th><th scope="col">14</th><th scope="col">15</th><th scope="col">16</th><th scope="col">17</th></tr></thead><tbody><tr><td>H</td><td>C</td><td>N</td><td>O</td><td>F</td></tr><tr><td class="gl-gap"></td><td class="gl-gap"></td><td class="gl-gap"></td><td class="gl-gap"></td><td>Cl</td></tr></tbody></table><p><b>Rule:</b> for these atoms, valence electrons = the last digit of the group number (group 14 gives 4). The small number printed on each box below is the atom’s atomic number, a different count: ignore it.</p>',
      config: { elements: ['H', 'C', 'N', 'O', 'F', 'Cl'], wrongWhy: 'For main-group atoms, valence electrons = the last digit of the group number: H group 1, C 14, N 15, O 16, F/Cl 17.' },
      confirm: 'That pattern (1, 4, 5, 6, 7, 7) is worth memorising.',
      hints: ['Use the group number of each element in the periodic table.', 'Drop the leading 1 of two-digit groups: group 14 gives 4, group 17 gives 7.'],
      worked: 'H 1, C 4, N 5, O 6, F 7, Cl 7. Same group, same count: F and Cl are both halogens.'
    },
    {
      id: 's04', type: 'explain', skill: 'bond-count',
      html: '<p>Atoms are happiest with 8 electrons around them (an octet). Hydrogen only wants 2.</p><p>One bond is one shared pair, so bonds needed = 8 − valence electrons (H: 2 − 1). That gives <b>HONC</b>: H 1, O 2, N 3, C 4.</p><p>Electrons left over sit as <b>lone pairs</b>: N has 1, O has 2, halogens (F, Cl, Br, I) have 3.</p>'
    },
    {
      id: 's05', type: 'predict', skill: 'lone-pairs',
      prompt: 'In water, how many lone pairs does oxygen have?',
      derive: { smiles: 'O', atom: 0, quantity: 'lp', value: 2 },
      options: [
        { text: '0', why: 'Oxygen has 6 valence electrons and uses only 2 in bonds; the other 4 have to go somewhere.' },
        { text: '1', why: '6 valence − 2 used in bonds = 4 electrons = 2 pairs.' },
        { text: '2', correct: true, why: 'Yes: 2 lone pairs.' },
        { text: '3', why: '3 pairs + 2 bonds would put 10 electrons around O, more than an octet.' }
      ],
      reveal: 'O keeps 4 of its 6 valence electrons as 2 lone pairs; 2 bonds + 2 lone pairs = 8.'
    },
    {
      id: 's06', type: 'try', skill: 'lone-pairs', widget: 'lewis-builder',
      prompt: 'Water. Tap the oxygen and add its lone pairs.',
      config: {
        atoms: [{ el: 'O', x: 0, y: 0 }, { el: 'H', x: -0.95, y: 0.75 }, { el: 'H', x: 0.95, y: 0.75 }],
        bonds: [{ a: 0, b: 1, order: 1 }, { a: 0, b: 2, order: 1 }],
        target: 'O', lockedBonds: true, charges: false,
        solution: { bonds: [1, 1], lp: [2, 0, 0], charge: [0, 0, 0] }
      },
      confirm: 'Oxygen: 2 bonds + 2 lone pairs = 8 electrons.',
      hints: ['Count what oxygen already has: each bond is 2 electrons.', 'Oxygen wants 8 in total. How many more electrons does it need, and how many pairs is that?'],
      worked: 'Two O–H bonds give 4 electrons. Oxygen needs 4 more: 2 lone pairs.'
    },
    {
      id: 's07', type: 'try', skill: 'lone-pairs', widget: 'lewis-builder',
      prompt: 'Ammonia, NH₃. Add the lone pairs.',
      config: {
        atoms: [{ el: 'N', x: 0, y: 0 }, { el: 'H', x: -1, y: 0.75 }, { el: 'H', x: 1, y: 0.75 }, { el: 'H', x: 0, y: -1.1 }],
        bonds: [{ a: 0, b: 1, order: 1 }, { a: 0, b: 2, order: 1 }, { a: 0, b: 3, order: 1 }],
        target: 'N', lockedBonds: true, charges: false,
        solution: { bonds: [1, 1, 1], lp: [1, 0, 0, 0], charge: [0, 0, 0, 0] }
      },
      confirm: 'Nitrogen: 3 bonds + 1 lone pair = 8 electrons.',
      hints: ['Three N–H bonds already give nitrogen 6 electrons.', 'Nitrogen needs 8. How many pairs is the missing amount?'],
      worked: 'Three bonds = 6 electrons. N needs 2 more: 1 lone pair.'
    },
    {
      id: 's08', type: 'predict', skill: 'lone-pairs',
      prompt: 'Rotate the model. Is water straight (linear) or bent?',
      visual: { widget: 'model3d', config: { mol: 'water' } },
      options: [
        { text: 'Straight, 180°', why: 'Oxygen’s 2 lone pairs also take up space and push the two O–H bonds together.' },
        { text: 'Bent, about 104.5°', correct: true, why: 'Yes, water is bent.' }
      ],
      reveal: '4 electron groups around O (2 bonds + 2 lone pairs) point to the corners of a tetrahedron (a triangular pyramid); you only see the atoms, so the shape looks bent.'
    },
    {
      id: 's09', type: 'try', skill: 'multiple-bonds', widget: 'lewis-builder',
      prompt: 'Formaldehyde, H₂C=O. Every bond starts single. Make the C=O bond double and give oxygen its lone pairs.',
      config: {
        atoms: [{ el: 'C', x: 0, y: 0 }, { el: 'O', x: 0, y: -1.1 }, { el: 'H', x: -0.95, y: 0.6 }, { el: 'H', x: 0.95, y: 0.6 }],
        bonds: [{ a: 0, b: 1, order: 1 }, { a: 0, b: 2, order: 1 }, { a: 0, b: 3, order: 1 }],
        target: 'C=O', charges: false,
        solution: { bonds: [2, 1, 1], lp: [0, 2, 0, 0], charge: [0, 0, 0, 0] },
        diagnoses: [{ el: 'C', electrons: 6, why: 'Carbon has only 3 bonds (6 electrons). It needs 4: turn one of oxygen’s lone pairs into a second C–O bond.' }]
      },
      confirm: 'C has 4 bonds; O has 2 bonds + 2 lone pairs. Both have an octet.',
      hints: ['Carbon makes four bonds. Count the bonds it has now.', 'Oxygen has spare electrons. Sharing a second pair with carbon fixes both atoms.'],
      worked: 'Tap the C–O bond once to make it double. Then oxygen has 2 bonds and needs 2 lone pairs.'
    },
    {
      id: 's10', type: 'try', skill: 'multiple-bonds', widget: 'lewis-builder',
      prompt: 'Hydrogen cyanide, H–C≡N. Tap the C–N bond until it is triple, then add nitrogen’s lone pair.',
      config: {
        atoms: [{ el: 'H', x: -1.1, y: 0 }, { el: 'C', x: 0, y: 0 }, { el: 'N', x: 1.1, y: 0 }],
        bonds: [{ a: 0, b: 1, order: 1 }, { a: 1, b: 2, order: 1 }],
        target: 'C#N', charges: false,
        solution: { bonds: [1, 3], lp: [0, 0, 1], charge: [0, 0, 0] }
      },
      confirm: 'C: 1 + 3 = 4 bonds. N: 3 bonds + 1 lone pair = 8 electrons.',
      hints: ['Carbon already has one bond to H and needs four in total.', 'Nitrogen makes 3 bonds. Once the C–N bond is triple, how many electrons are left over for N?'],
      worked: 'H–C is single; C≡N is triple, so carbon has 4 bonds. Nitrogen has 3 bonds (6 electrons) plus 1 lone pair = 8.'
    },
    {
      id: 's11', type: 'input', skill: 'electron-count-total',
      prompt: 'How many valence electrons in total does formaldehyde, CH₂O, have?',
      aside: '<p>Add up every atom’s valence electrons. For an <b>ion</b>, a + charge means one electron was lost, so subtract 1 per + charge; a − charge means one extra, so add 1. Example: H₃O⁺ = 6 + 3 − 1 = 8.</p>',
      answer: 12,
      derive: { smiles: 'C=O', quantity: 'total' },
      diagnose: [
        { match: 16, why: 'Oxygen brings 6, not 8 (8 is its octet, not its own electrons).' },
        { match: 14, why: 'Each H brings 1: C 4 + H 1 + H 1 + O 6 = 12.' },
        { match: 13, why: 'Each H brings 1: C 4 + H 1 + H 1 + O 6 = 12.' }
      ],
      fallback: 'Add what each atom brings: C 4, each H 1, O 6.',
      confirm: '4 + 1 + 1 + 6 = 12.',
      hints: ['List the atoms: one C, two H, one O.', 'C gives 4, each H gives 1, O gives 6. Add them.'],
      worked: 'C 4 + H 1 + H 1 + O 6 = 12 valence electrons.'
    },
    {
      id: 's12', type: 'worked', skill: 'formal-charge',
      problem: 'Find the formal charge on oxygen in hydronium (a water molecule that has picked up an H⁺). Formal charge = the electrons the atom normally owns (its valence electrons) minus the electrons it owns here (its lone-pair electrons plus half of its bonding electrons): <mol smiles="[OH3+]" label="H₃O⁺"></mol>',
      moves: [
        {
          ask: 'How many valence electrons does a neutral O atom normally own?',
          options: [
            { text: '6', correct: true, why: 'Yes, oxygen is in group 16.' },
            { text: '8', why: '8 is the octet oxygen wants to end up with, not the number of valence electrons it brings.' },
            { text: '2', why: 'That is only the inner 1s² pair. Oxygen’s outer shell holds 6.' }
          ],
          then: 'A neutral O brings 6 electrons.'
        },
        {
          ask: 'In H₃O⁺, O has 3 bonds and 1 lone pair. How many electrons does O “own” here?',
          options: [
            { text: 'Both lone-pair electrons + 1 from each bond = 2 + 3 = 5', correct: true, why: 'Yes: a shared pair is split evenly, so O owns one electron from each bond.' },
            { text: 'All 8 around it', why: 'Bond electrons are shared, so O owns only half of each bond.' },
            { text: 'Only the 2 lone-pair electrons', why: 'You forgot the bonds: oxygen also owns half of each shared pair, not just its lone-pair electrons.' }
          ],
          then: 'O owns 5 electrons.'
        },
        {
          ask: 'Formal charge = normal − owned = 6 − 5 = ?',
          options: [
            { text: '+1', correct: true, why: 'Yes, +1.' },
            { text: M + '1', why: 'Owning fewer electrons than normal makes it positive.' },
            { text: '0', why: '0 would mean O owns exactly its normal 6, but it owns only 5.' }
          ],
          then: 'Oxygen carries +1.'
        }
      ],
      rule: 'FC = valence e⁻ − lone-pair e⁻ − number of bonds'
    },
    {
      id: 's13', type: 'input', skill: 'formal-charge',
      prompt: 'Ammonium, NH₄⁺: N has 4 bonds and 0 lone pairs. Formal charge on N?',
      answer: 1, accept: ['+1', '1'],
      derive: { smiles: '[NH4+]', atom: 0, quantity: 'fc' },
      diagnose: [
        { match: 0, why: 'N normally owns 5; here it owns 0 + 4 = 4, so 5 − 4 = +1.' },
        { match: -1, why: 'Owning fewer electrons than normal means a positive charge.' }
      ],
      fallback: 'Use FC = 5 − (lone-pair electrons) − (bonds) for nitrogen.',
      confirm: '5 − 0 − 4 = +1.',
      hints: ['Nitrogen brings 5 valence electrons.', 'FC = 5 − 0 (no lone pairs) − 4 (bonds).'],
      worked: 'FC = 5 − 0 − 4 = +1.'
    },
    {
      id: 's14', type: 'input', skill: 'formal-charge',
      prompt: 'Hydroxide, OH⁻: O has 1 bond and 3 lone pairs. Formal charge on O?',
      answer: -1, accept: ['-1', '−1'],
      derive: { smiles: '[OH-]', atom: 0, quantity: 'fc' },
      diagnose: [
        { match: 1, why: 'O owns 6 + 1 = 7, one more than its normal 6, so the charge is negative.' },
        { match: 0, why: 'Count: 6 − 6 (lone-pair electrons) − 1 (bond) = −1.' }
      ],
      fallback: 'Use FC = 6 − (lone-pair electrons) − (bonds) for oxygen. Three lone pairs are 6 electrons.',
      confirm: '6 − 6 − 1 = −1.',
      hints: ['Oxygen brings 6 valence electrons. Three lone pairs are how many electrons?', 'FC = 6 − 6 − 1.'],
      worked: 'FC = 6 − 6 − 1 = −1.'
    },
    {
      id: 's15', type: 'choice', skill: 'formal-charge',
      prompt: 'Which one is a carbocation (a carbon with a + formal charge)?',
      options: [
        { smiles: '[CH3+]', label: 'C: 3 bonds, no lone pair', correct: true, why: '3 bonds, no lone pair: 4 − 0 − 3 = +1.' },
        { smiles: '[CH3-]', label: 'C: 3 bonds, 1 lone pair', why: 'That carbon has a lone pair: 4 − 2 − 3 = −1. It’s a carbanion.' },
        { smiles: 'C', label: 'C: 4 bonds, no lone pair', why: 'That carbon has a formal charge of 4 − 0 − 4 = 0, so it is neutral. A carbocation has only 3 bonds and no lone pair.' }
      ],
      hints: ['Work out the formal charge for each carbon: 4 − lone-pair electrons − bonds.', 'A + charge means the carbon owns fewer than 4 electrons.'],
      worked: '[CH₃]⁺: 4 − 0 − 3 = +1. The others give −1 and 0.'
    },
    {
      id: 's16', type: 'try', skill: 'formal-charge', widget: 'lewis-builder',
      prompt: 'Methoxide, CH₃O⁻. Give oxygen the right lone pairs and set its formal charge.',
      config: {
        atoms: [{ el: 'C', x: 0, y: 0 }, { el: 'O', x: 1.15, y: 0 }, { el: 'H', x: -0.5, y: -0.95 }, { el: 'H', x: -0.5, y: 0.95 }, { el: 'H', x: -1.05, y: 0 }],
        bonds: [{ a: 0, b: 1, order: 1 }, { a: 0, b: 2, order: 1 }, { a: 0, b: 3, order: 1 }, { a: 0, b: 4, order: 1 }],
        target: 'C[O-]', lockedBonds: true,
        solution: { bonds: [1, 1, 1, 1], lp: [0, 3, 0, 0, 0], charge: [0, -1, 0, 0, 0] },
        diagnoses: [{ el: 'O', electrons: 6, why: 'O has 1 bond + 2 lone pairs = only 6 electrons around it. Add a third pair.' }],
        chargeWhy: { O: 'O owns 6 + 1 = 7 electrons, one more than normal: set its charge to −1.' }
      },
      confirm: 'O: 6 − 6 − 1 = −1, with an octet.',
      hints: ['Oxygen has one bond. How many lone pairs complete its octet?', 'With that many lone pairs, compare what O owns with the 6 it normally brings.'],
      worked: 'One bond + 3 lone pairs gives 8 electrons. O owns 6 + 1 = 7, one more than normal, so its charge is −1.'
    },
    {
      id: 's17', type: 'predict', skill: 'octet',
      prompt: 'Which formula can’t exist as a stable neutral molecule?',
      options: [
        { text: 'CH₅', correct: true, why: 'Right: carbon can’t make five bonds.' },
        { text: 'CH₄', why: 'Carbon makes 4 bonds and CH₄ has exactly four C–H bonds, so every atom has its usual number of bonds.' },
        { text: 'NH₃', why: 'Nitrogen makes 3 bonds and keeps one lone pair, so NH₃ is a normal, stable neutral molecule.' },
        { text: 'CH₃OH', why: 'C makes 4 bonds and O makes 2, so every atom is fine.' }
      ],
      reveal: 'CH₅ would need carbon to make 5 bonds: 10 electrons around it, breaking the octet.'
    }
  ],
  mastery: { count: 3, generator: 'lewis-basic' },
  useIt: { book: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.31', '1.33', '1.34', '1.35', '1.36', '1.37'], note: 'Do the in-chapter problems first, then the end-of-chapter ones. Write the lone pairs on every structure.' }
};
