// Lesson 03: Acids, bases & pKa (McMurry ch. 1, sections 1.10-1.12).
// Original wording throughout; book problems are referenced by number only.
// pKa values come only from McMurry Table 1.2 and the text; see engine/acidbase.js.
const M = '−'; // minus sign

export default {
  id: '03', slug: 'acids-bases', title: 'Acids, bases & pKa', minutes: 25,
  chapter: 1, sections: ['1.10', '1.11', '1.12'],
  drawing: 'full',
  goals: [
    'Name the acid, base, conjugate acid and conjugate base in a proton transfer',
    'Use pKa values to say which acid is stronger and which side of an equilibrium is favoured',
    'Spot Lewis acids and Lewis bases from lone pairs and missing electron pairs',
    'Draw your first curved arrows, starting at electrons and ending at the atom that receives them'
  ],
  steps: [
    {
      id: 's01', type: 'predict', skill: 'conjugate-pairs',
      prompt: 'HCl gas dissolves in water and makes H₃O⁺ and Cl⁻. What did the HCl hand over to the water molecule?',
      reaction: { reactants: ['Cl', 'O'], products: ['[OH3+]', '[Cl-]'] },
      options: [
        { text: 'A hydrogen ion, H⁺ (a bare proton)', correct: true, why: 'Yes. The H leaves without the bonding pair. That pair stays on chlorine, which is why chlorine ends up as Cl⁻.' },
        { text: 'A hydrogen atom, with its own electron', why: 'If the H took an electron along, chlorine would stay neutral. Cl⁻ has one extra electron: it kept the electrons of the old H–Cl bond.' },
        { text: 'A hydroxide ion, HO⁻', why: 'HCl has no oxygen, so it cannot hand over HO⁻. The oxygen belongs to the water.' },
        { text: 'A pair of electrons', why: 'It is the other way round: the bonding electrons stay behind on Cl. What moves across is the H nucleus.' }
      ],
      reveal: 'A <b>Brønsted–Lowry acid</b> is a proton (H⁺) donor and a <b>base</b> is a proton acceptor. HCl is the acid and water is the base. H⁺ is just a proton: an H nucleus with no electron.'
    },
    {
      id: 's02', type: 'explain', skill: 'conjugate-pairs',
      html: '<p>After HCl gives up H⁺, what remains, <b>Cl⁻</b>, is the <b>conjugate base</b> of HCl. After water takes H⁺, the result, <b>H₃O⁺</b>, is the <b>conjugate acid</b> of water.</p><p>An acid and its conjugate base always differ by exactly one H⁺: <b>HA</b> and <b>A⁻</b>.</p>'
    },
    {
      id: 's03', type: 'choice', skill: 'conjugate-pairs',
      prompt: 'NH₃ + H₂O ⇌ NH₄⁺ + HO⁻. Going left to right, ammonia takes an H⁺ from water. Which species is the conjugate acid?',
      reaction: { reactants: ['N', 'O'], products: ['[NH4+]', '[OH-]'] },
      options: [
        { text: 'NH₃', why: 'NH₃ is the base here: it accepts H⁺. The conjugate acid is what the base turns into after it accepts.' },
        { text: 'H₂O', why: 'Water is the acid in this direction, because it donates H⁺. Its partner is its conjugate base, HO⁻.' },
        { text: 'NH₄⁺', correct: true, why: 'Yes. NH₃ + H⁺ = NH₄⁺, so NH₄⁺ is the conjugate acid of ammonia.' },
        { text: 'HO⁻', why: 'HO⁻ is what water leaves behind after giving up H⁺: it is the conjugate base of water.' }
      ],
      hints: ['Find the base first: it is the species that gains an H⁺.', 'The conjugate acid is the base plus one H⁺.'],
      worked: 'NH₃ gains H⁺, so NH₃ is the base and NH₄⁺ (NH₃ + H⁺) is its conjugate acid. Water loses H⁺: acid H₂O, conjugate base HO⁻.'
    },
    {
      id: 's04', type: 'choice', skill: 'conjugate-pairs',
      prompt: 'Methanol gives its O–H proton to amide ion: CH₃OH + NH₂⁻ → CH₃O⁻ + NH₃ (NH₂⁻ is amide ion). Which structure is the conjugate base of methanol?',
      reaction: { reactants: ['CO', '[NH2-]'], products: ['C[O-]', 'N'] },
      options: [
        { smiles: 'C[O-]', label: 'A: CH₃O⁻, negative charge on O', correct: true, why: 'Yes. Methanol minus H⁺ from its O–H gives methoxide, CH₃O⁻.' },
        { smiles: '[NH2-]', label: 'B: NH₂⁻', why: 'That is amide ion, the base that took the proton. The conjugate base of methanol is what methanol itself becomes.' },
        { smiles: 'N', label: 'C: NH₃', why: 'Ammonia is the conjugate acid of amide ion (NH₂⁻ + H⁺). It belongs to the other pair.' },
        { smiles: '[CH2-]O', label: 'D: HOCH₂⁻, H removed from C, negative charge on C', why: 'This lost an H from carbon. The acidic H of methanol is the one on oxygen, and oxygen holds a negative charge far better than carbon does.' }
      ],
      hints: ['The conjugate base is the acid minus H⁺: one H off, one more negative charge.', 'Methanol’s acidic H is the one on oxygen. Remove it and keep the three C–H bonds.'],
      worked: 'Methanol is the acid. Remove H⁺ from the O–H: CH₃O⁻ (methoxide) is its conjugate base. Amide ion is the base; its conjugate acid is NH₃.'
    },
    {
      id: 's05', type: 'predict', skill: 'pka-direction',
      prompt: 'HCl has pKa ' + M + '7.0 and acetic acid, CH₃CO₂H, has pKa 4.76. Which is the stronger acid?',
      derive: { quantity: 'strongerAcid', ids: ['hcl', 'acetic'] },
      options: [
        { text: 'Acetic acid: 4.76 is the bigger number', val: 'acetic', why: 'A bigger pKa means a weaker acid. Acetic acid holds on to its H⁺ much more firmly than HCl does.' },
        { text: 'HCl: ' + M + '7.0 is the smaller number', val: 'hcl', correct: true, why: 'Yes. HCl hands over its H⁺ almost completely, and its pKa is the lower number.' }
      ],
      reveal: 'The acid strength constant is Ka, and <b>pKa = ' + M + 'log Ka</b>. Strong acids have large Ka, so a <b>small or negative pKa</b>. Rule: smaller pKa = stronger acid = weaker conjugate base.'
    },
    {
      id: 's06', type: 'input', skill: 'pka-direction',
      prompt: 'A weak acid has Ka = 1 × 10⁻⁹. What is its pKa?',
      answer: 9,
      derive: { quantity: 'pkaFromExp', exp: -9 },
      diagnose: [
        { match: -9, why: 'That is log Ka. The pKa is the negative of it: ' + M + '(' + M + '9) = 9.' },
        { match: 1, why: 'The 1 is just the coefficient. The pKa comes from the power of ten: log(10⁻⁹) is ' + M + '9.' },
        { match: 10, why: 'Close, but the exponent is ' + M + '9 and the minus sign in the definition flips it to 9.' }
      ],
      fallback: 'pKa = ' + M + 'log Ka. Take the log of 10⁻⁹ and then change its sign.',
      confirm: 'pKa = ' + M + 'log(10⁻⁹) = 9. Each factor of 10 in Ka moves the pKa by one unit, so a gap of 3 in pKa is a factor of 1000 in acidity.',
      hints: ['pKa = ' + M + 'log Ka, and the log of 10⁻⁹ is simply the exponent, ' + M + '9.', 'Put the minus sign in front of ' + M + '9.'],
      worked: 'log(1 × 10⁻⁹) = ' + M + '9, so pKa = ' + M + '(' + M + '9) = 9.'
    },
    {
      id: 's07', type: 'choice', skill: 'pka-direction',
      prompt: 'Cl⁻, CH₃CO₂⁻ (acetate), CN⁻ (cyanide) and HO⁻ (hydroxide) are the conjugate bases of HCl (' + M + '7.0), acetic acid (4.76), HCN (9.31) and water (15.74). Which one is the STRONGEST base?',
      derive: { quantity: 'weakestAcid', ids: ['hcl', 'acetic', 'hcn', 'water'] },
      options: [
        { text: 'Cl⁻', val: 'hcl', why: 'Cl⁻ comes from the strongest acid of the four, so it is the weakest base: it hardly wants an H⁺ back.' },
        { text: 'CH₃CO₂⁻', val: 'acetic', why: 'Acetic acid (4.76) is a stronger acid than HCN (9.31) and water (15.74), so acetate is a weaker base than CN⁻ or HO⁻.' },
        { text: 'CN⁻', val: 'hcn', why: 'HCN (9.31) is a weaker acid than acetic acid, so CN⁻ is a better base than acetate. But water (15.74) is weaker still.' },
        { text: 'HO⁻', val: 'water', correct: true, why: 'Yes. Water has the highest pKa of the four (15.74), so HO⁻ holds on to H⁺ most tightly: the strongest base.' }
      ],
      hints: ['The weaker the acid, the stronger its conjugate base.', 'Find the largest pKa. Its conjugate base is the strongest.'],
      worked: 'The conjugate base of the weakest acid is the strongest base. The pKa values are ' + M + '7.0, 4.76, 9.31 and 15.74. The largest is water at 15.74, so HO⁻ is the strongest base.'
    },
    {
      id: 's08', type: 'worked', skill: 'pka-direction',
      problem: 'Will hydroxide ion take a proton from acetic acid?<br><b>CH₃CO₂H + HO⁻ ⇌ CH₃CO₂⁻ + H₂O</b>',
      reaction: { reactants: ['CC(=O)O', '[OH-]'], products: ['CC(=O)[O-]', 'O'] },
      moves: [
        {
          ask: 'Locate the acid on each side. Which species on the LEFT is the acid?',
          options: [
            { text: 'CH₃CO₂H: it has an H⁺ to give', correct: true, why: 'Yes.' },
            { text: 'HO⁻: it will take H⁺', why: 'HO⁻ is the base. It has no H⁺ to give; it wants one.' }
          ],
          then: 'The right side has an acid too: H₂O, the conjugate acid of HO⁻.'
        },
        {
          ask: 'Look up the pKa of acetic acid.',
          check: { quantity: 'pka', id: 'acetic' },
          options: [
            { text: '4.76', val: 4.76, correct: true, why: 'Yes, 4.76.' },
            { text: '15.74', val: 15.74, why: 'That is the pKa of water, the acid on the other side.' },
            { text: '9.31', val: 9.31, why: 'That is HCN, which is not in this reaction.' }
          ]
        },
        {
          ask: 'Now the acid on the right: what is the pKa of water?',
          check: { quantity: 'pka', id: 'water' },
          options: [
            { text: '4.76', val: 4.76, why: 'That is acetic acid, on the left.' },
            { text: '15.74', val: 15.74, correct: true, why: 'Yes, 15.74.' },
            { text: '16.00', val: 16, why: 'That is ethanol. Water is just a touch stronger, at 15.74.' }
          ]
        },
        {
          ask: 'Which of the two acids is the weaker one?',
          check: { quantity: 'weakestAcid', ids: ['acetic', 'water'] },
          options: [
            { text: 'Acetic acid, pKa 4.76', val: 'acetic', why: 'A pKa of 4.76 is the smaller number, which means the stronger acid.' },
            { text: 'Water, pKa 15.74', val: 'water', correct: true, why: 'Yes. The larger pKa belongs to the weaker acid.' }
          ]
        },
        {
          ask: 'An equilibrium favours the side with the weaker acid. Which side is favoured?',
          check: { quantity: 'favoured', a: 'acetic', b: 'water' },
          options: [
            { text: 'The left side (reactants)', val: 'left', why: 'The left side holds the stronger acid, acetic acid. A strong acid is the one that gets used up.' },
            { text: 'The right side (products)', val: 'right', correct: true, why: 'Yes. The right side holds water, the weaker acid.' }
          ]
        },
        {
          ask: 'So does hydroxide ion take the proton from acetic acid?',
          options: [
            { text: 'Yes. The pKa gap is about 11 units, so the equilibrium lies far to the right', correct: true, why: '15.74 ' + M + ' 4.76 is about 11: each unit is a factor of 10, so the right side is favoured enormously.' },
            { text: 'No. Acetic acid is too weak an acid', why: 'Acetic acid is far stronger than water (4.76 against 15.74), so water, not acetic acid, is the reluctant donor.' },
            { text: 'Only slightly, the sides are about even', why: 'Equal pKa values would give an even split. These differ by about 11 units.' }
          ]
        }
      ],
      rule: 'Equilibrium favours the side with the <b>weaker acid</b> (higher pKa). So a base removes H⁺ from any acid whose pKa is <b>lower</b> than the pKa of the base’s own conjugate acid.'
    },
    {
      id: 's09', type: 'try', skill: 'pka-direction', widget: 'equilibrium-arrow',
      prompt: 'HCN and acetate ion: HCN + CH₃CO₂⁻ ⇌ CN⁻ + CH₃CO₂H. Locate the two acids, then say which side is favoured.',
      reaction: { reactants: ['C#N', 'CC(=O)[O-]'], products: ['[C-]#N', 'CC(=O)O'] },
      config: { a: 'hcn', b: 'acetic' },
      confirm: 'HCN (9.31) is the weaker acid and acetic acid (4.76) the stronger, so the left side wins: acetate takes very little H⁺ from HCN.',
      hints: ['The acid on each side is the species that still carries an H⁺ to give. The negative ions are the bases.', 'Equilibrium favours the side with the weaker acid: the one with the higher pKa.'],
      worked: 'Left acid: HCN, pKa 9.31. Right acid: CH₃CO₂H, pKa 4.76. The higher pKa belongs to HCN, the weaker acid, so the left side (the reactants) is favoured.'
    },
    {
      id: 's10', type: 'choice', skill: 'pka-direction',
      prompt: 'Ethoxide, CH₃CH₂O⁻, is the conjugate base of ethanol (pKa 16.00). Which of these acids can it deprotonate (pull H⁺ off) to a large extent?',
      derive: { quantity: 'deprotonates', base: 'ethanol', ids: ['acetic', 'acetone', 'acetylene', 'ammonia'] },
      options: [
        { text: 'Acetone, pKa 19.3', val: 'acetone', why: 'Acetone (19.3) is a weaker acid than ethanol (16.00). The equilibrium would favour ethoxide and acetone, not the products.' },
        { text: 'Acetylene, pKa 25', val: 'acetylene', why: 'Acetylene (25) is a much weaker acid than ethanol (16.00), so ethoxide is not basic enough to take its H⁺.' },
        { text: 'Acetic acid, pKa 4.76', val: 'acetic', correct: true, why: 'Yes. 4.76 is below 16.00, so acetic acid is the stronger acid and ethoxide takes its H⁺ readily.' },
        { text: 'Ammonia, pKa ≈ 36', val: 'ammonia', why: 'Ammonia (about 36) is a far weaker acid than ethanol. It would need a much stronger base, such as amide ion.' }
      ],
      hints: ['Ethoxide’s conjugate acid is ethanol, pKa 16.00. The acid it deprotonates must be stronger than ethanol.', 'A stronger acid has a pKa below 16.00. Only one option qualifies.'],
      worked: 'A base removes H⁺ from any acid with a smaller pKa than its own conjugate acid. Ethoxide’s conjugate acid has pKa 16.00. Only acetic acid (4.76) is below that.'
    },
    {
      id: 's11', type: 'predict', skill: 'pka-direction',
      prompt: 'Acetic acid (pKa 4.76) and ethanol (16.00) both lose an H from an O–H group. Why is acetic acid so much stronger?',
      options: [
        { text: 'Its anion shares the negative charge between two oxygens', correct: true, why: 'Yes. In acetate, CO₂⁻, both oxygens carry the charge together. That makes the anion more stable, so the acid gives up H⁺ more easily.' },
        { text: 'Acetic acid has more hydrogens', why: 'The number of H atoms does not decide acidity. What matters is how stable the anion is once H⁺ has gone.' },
        { text: 'Its O–H oxygen is a different element', why: 'Both acids lose H from an oxygen. The difference is in what surrounds that oxygen.' }
      ],
      reveal: 'The more stable the anion A⁻, the stronger the acid HA. Acetate spreads its charge over <b>two O atoms</b>; ethoxide has just one. C–H bonds next to a C=O are acidic too (acetone, pKa 19.3), because the C=O helps carry the charge.'
    },
    {
      id: 's12', type: 'choice', skill: 'conjugate-pairs',
      prompt: 'Methylamine, CH₃NH₂, can pick up an H⁺. Which atom is the basic site?',
      smiles: 'CN', highlight: [],
      reaction: { reactants: ['CN', '[H+]'], products: ['C[NH3+]'] },
      options: [
        { text: 'Nitrogen: it has a lone pair that can bond to H⁺', correct: true, why: 'Yes. N has 5 valence electrons, 3 in bonds, so one lone pair is left over to bond to H⁺.' },
        { text: 'Carbon: it is the central atom', why: 'Carbon has four bonds and no lone pair, so it has no electrons to offer H⁺.' },
        { text: 'A hydrogen atom', why: 'Hydrogens only have their bonding pair. They can leave as H⁺, but cannot accept one.' }
      ],
      hints: ['A base needs a lone pair to bond to H⁺. Count them: (valence electrons − bonds) ÷ 2.', 'N: (5 − 3) ÷ 2 = 1 lone pair. C: (4 − 4) ÷ 2 = 0.'],
      worked: 'Only nitrogen has a lone pair. It uses it to bond to H⁺, giving CH₃NH₃⁺. This is why amines (compounds with N bonded to carbon, like methylamine) are the typical organic bases.'
    },
    {
      id: 's13', type: 'explain', skill: 'pka-direction',
      html: '<p><b>Organic acids</b>: O–H groups (alcohols such as ethanol, 16.00; carboxylic acids such as acetic acid, 4.76) and C–H bonds next to C=O (acetone, 19.3).</p><p><b>Organic bases</b>: anything with a lone pair, mostly the N of amines (such as methylamine). Oxygen compounds are weak bases and take H⁺ only from strong acids.</p>'
    },
    {
      id: 's14', type: 'predict', skill: 'curved-arrows',
      prompt: 'Water meets HCl. A curved arrow will show the electrons that build the new O–H bond. Where does that arrow START?',
      options: [
        { text: 'On the H of HCl, the H⁺ that moves', why: 'Arrows start at electrons, not at H⁺. A proton has no electrons to push; it is the thing that receives the new bond.' },
        { text: 'On a lone pair on the oxygen of H₂O', correct: true, why: 'Yes. The new O–H bond is made of an oxygen lone pair, so the arrow starts on that lone pair.' },
        { text: 'On the Cl atom', why: 'Cl has lone pairs, but they do not make the new O–H bond. The Cl matters later, when the H–Cl bond breaks.' }
      ],
      reveal: 'A <b>curved arrow</b> shows electrons moving. It starts at the electrons (a <b>lone pair</b> or a <b>bond</b>) and its head points at the atom that receives them. Here the pair moves to H, so the H⁺ moves with it.'
    },
    {
      id: 's15', type: 'try', skill: 'curved-arrows', widget: 'arrow-draw',
      prompt: 'Draw the curved arrows that turn H₂O + HCl into H₃O⁺ + Cl⁻. Tap the electrons the arrow starts from, then the atom that receives them.',
      reaction: { reactants: ['O', 'Cl'], products: ['[OH3+]', '[Cl-]'] },
      config: {
        atoms: [
          { el: 'O', x: 0, y: 0 }, { el: 'H', x: -0.71, y: -0.71 }, { el: 'H', x: -0.71, y: 0.71 },
          { el: 'H', x: 2.5, y: 0 }, { el: 'Cl', x: 3.6, y: 0 }
        ],
        bonds: [{ a: 0, b: 1, order: 1 }, { a: 0, b: 2, order: 1 }, { a: 3, b: 4, order: 1 }],
        arrows: [
          { from: { lp: 0 }, to: { atom: 3 }, note: 'Oxygen’s lone pair makes the new O–H bond, so it has to point at the H it bonds to.' },
          { from: { bond: [3, 4] }, to: { atom: 4 }, note: 'The H–Cl electrons stay with chlorine, the more electronegative atom, and become a lone pair on Cl⁻. They do not go to H.', missing: 'You also need the arrow showing the H–Cl bond electrons moving onto Cl. H can hold only two electrons, so as the new O–H bond forms, the old H–Cl bond must let go.' }
        ],
        products: ['[OH3+]', '[Cl-]'],
        extraHint: 'Ask which electrons build the new bond, and which bond has to break.'
      },
      confirm: 'Two arrows. The O lone pair becomes the new O–H bond, and the H–Cl bond electrons leave with Cl as a lone pair. Together they move H⁺ from Cl to O.',
      hints: ['Start with the new bond: which electrons build the O–H bond, and which H do they bond to?', 'H can hold only 2 electrons, so as the new bond forms the H–Cl bond must break. Start at that bond and point to Cl.'],
      worked: 'Arrow 1: from a lone pair on O to the H of HCl. Arrow 2: from the H–Cl bond to Cl. The result is H₃O⁺ and Cl⁻.'
    },
    {
      id: 's16', type: 'worked', skill: 'lewis-acid-base',
      problem: 'In the last step oxygen donated an electron pair to H⁺. Sort these into <b>Lewis bases</b> (donate a pair) and <b>Lewis acids</b> (accept a pair).',
      moves: [
        {
          ask: 'Water gave a lone pair to H⁺. In Lewis terms, what is water there?',
          check: { smiles: 'O', quantity: 'lewis' },
          options: [
            { text: 'Lewis acid', val: 'acid', why: 'An acid accepts a pair. Water donated one.' },
            { text: 'Lewis base', val: 'base', correct: true, why: 'Yes. A Lewis base donates an electron pair.' }
          ],
          then: 'So H⁺, which received the pair, is the Lewis acid.'
        },
        {
          ask: 'NH₃: nitrogen has 3 bonds and one lone pair.',
          check: { smiles: 'N', quantity: 'lewis' },
          options: [
            { text: 'Lewis acid', val: 'acid', why: 'N has a lone pair to give and a full octet, so there is no room to accept another pair.' },
            { text: 'Lewis base', val: 'base', correct: true, why: 'Yes. The nitrogen lone pair can be donated.' }
          ]
        },
        {
          ask: 'BF₃: boron has 3 bonds, no lone pair, only 6 electrons.',
          check: { smiles: 'B(F)(F)F', quantity: 'lewis' },
          options: [
            { text: 'Lewis acid', val: 'acid', correct: true, why: 'Yes. Boron is two electrons short of an octet and can accept a pair.' },
            { text: 'Lewis base', val: 'base', why: 'Boron has no lone pair to give. It is the atom short of electrons, so it receives pairs rather than donating them.' }
          ]
        },
        {
          ask: 'Mg²⁺: a metal ion that has lost its outer electrons.',
          check: { smiles: '[Mg+2]', quantity: 'lewis' },
          options: [
            { text: 'Lewis acid', val: 'acid', correct: true, why: 'Yes. A positive metal ion has empty orbitals and accepts electron pairs.' },
            { text: 'Lewis base', val: 'base', why: 'Mg²⁺ has lost its two outer electrons and carries a 2+ charge, so it has no lone pair to donate.' }
          ]
        },
        {
          ask: 'Ethanol, CH₃CH₂OH: the oxygen has two bonds and two lone pairs.',
          check: { smiles: 'CCO', quantity: 'lewis' },
          options: [
            { text: 'Lewis acid', val: 'acid', why: 'Oxygen already has an octet, so it has no room to accept a pair.' },
            { text: 'Lewis base', val: 'base', correct: true, why: 'Yes. The lone pairs on oxygen can be donated. Oxygen compounds are Lewis bases.' }
          ]
        }
      ],
      rule: 'A <b>Lewis base</b> has a lone pair to donate (N, O, P). A <b>Lewis acid</b> accepts a pair: H⁺, metal ions such as Mg²⁺, and atoms short of an octet such as B in BF₃. AlCl₃, FeBr₃ and ZnCl₂ are Lewis acids too.'
    },
    {
      id: 's17', type: 'try', skill: 'curved-arrows', widget: 'arrow-draw',
      prompt: 'Ammonia reacts with BF₃, with no H⁺ involved. Draw the curved arrow: the base donates, the acid receives.',
      reaction: { reactants: ['N', 'B(F)(F)F'], products: ['[NH3+][B-](F)(F)F'] },
      config: {
        atoms: [
          { el: 'N', x: 0, y: 0 }, { el: 'H', x: 0, y: 1 }, { el: 'H', x: -1, y: 0 }, { el: 'H', x: 0, y: -1 },
          { el: 'B', x: 3, y: 0 }, { el: 'F', x: 2.5, y: -0.87 }, { el: 'F', x: 2.5, y: 0.87 }, { el: 'F', x: 4, y: 0 }
        ],
        bonds: [
          { a: 0, b: 1, order: 1 }, { a: 0, b: 2, order: 1 }, { a: 0, b: 3, order: 1 },
          { a: 4, b: 5, order: 1 }, { a: 4, b: 6, order: 1 }, { a: 4, b: 7, order: 1 }
        ],
        arrows: [{ from: { lp: 0 }, to: { atom: 4 }, note: 'Boron is the atom short of electrons, so it is where the pair ends up.' }],
        products: ['[NH3+][B-](F)(F)F'],
        extraHint: 'Ask which atom has a lone pair to give, and which atom is short of electrons.'
      },
      confirm: 'The N lone pair becomes the new N–B bond. Nitrogen now shares a pair it used to own alone, so it is +; boron gains a bonding pair, so it is ' + M + '. A Lewis acid–base reaction needs no H⁺.',
      hints: ['Which atom has a lone pair to give, and which atom is short of electrons?', 'The arrow starts on the lone pair of nitrogen and ends on boron: that pair becomes the new N–B bond.'],
      worked: 'One arrow: from the lone pair on N to B. The pair becomes the N–B bond, giving H₃N–BF₃ with N⁺ and B⁻.'
    }
  ],
  mastery: { count: 3, generator: 'acid-base' },
  useIt: {
    book: ['1.20', '1.21', '1.22', '1.23', '1.24', '1.25', '1.56', '1.57', '1.58', '1.59', '1.60', '1.61', '1.62', '1.63'],
    note: 'In-chapter 1.20 to 1.22 cover Brønsted–Lowry acids and pKa; 1.23 to 1.25 cover Lewis acids and bases. End of chapter: 1.56 to 1.63 are the Acids and Bases group (1.63 asks for curved arrows). In each, label the acid and the base, write their pKa values, and compare before you answer.'
  }
};
