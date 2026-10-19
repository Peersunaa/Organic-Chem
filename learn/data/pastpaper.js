// Past papers, by topic (#pastpaper): the midterm-scope questions of study-guide/past-paper-workbook, one item per question (B3.1: one per reaction type).
// MIDTERM SCOPE (from the learner): sections A1, A2, A3, A5 (HBr addition only), B1, B2, B3, B4, B6.
// NOT here on purpose: A4, B5, and the SN2 / acid-base / multi-step synthesis questions of A5.
//
// An item is { id, title, source, ask, steps[], links[], trap? }.
//   title   the workbook's short heading.      source  where the question came from.
//   ask     ONE sentence saying what the question asks (a paraphrase; the question text is not copied). Never longer than 200 characters.
//   steps   numbered steps to answer this KIND of question (same voice as the hub's "steps to answer").
//   links   [{ label, href }]: '#lesson-NN/sK' (a real lesson step) or '#reactions/<card id>' (a real hub card).
//   trap    optional: the one common mistake.
//   show    optional: { label, structures: [{ smiles, label? }] } or { label, equation: { reactants, products, cond } }: one structure in the same style as the question, drawn above the steps.
//           It is NOT the exam's own drawing (the workbook's drawings are not copied); the view says so. Items linked to a hub card get that card's worked example automatically.
// The workbook's questions are drawings, so the text only says what is asked. Where the workbook does not say what the drawing is, the item stays general.
// tests/pastpaper.mjs checks every field, every link, the scope and the section order.

/** A lesson step link: lesson('06', 's16') */
const lesson = (id, step) => ({ label: `Lesson ${Number(id)}, step ${Number(step.slice(1))}`, href: `#lesson-${id}/${step}` });
/** A hub card link: card('birch', 'Birch') */
const card = (id, name) => ({ label: `Card: ${name}`, href: `#reactions/${id}` });

const M21 = 'MUIC ICCH 221 Midterm, Oct 2021';
const M24 = 'MUIC ICCH 221 Midterm, Oct 2024';
const SAMPLE = 'MUIC ICCH 221 sample midterm';
const NYU = 'NYU CHEM 225 Exam 2, Fall 2023';
const M222 = 'MUIC ICCH 222 Midterms 2014-2018';

export const PASTPAPER = [
  {
    id: 'A1', title: 'Nomenclature and constitutional isomers',
    blurb: 'Longest chain, lowest numbers, alphabetical order, R/S and cis/trans in names, and the isomers of C₆H₁₄.',
    items: [
      {
        id: 'A1.1', title: 'Circle the correct IUPAC name', source: M21,
        ask: 'For each drawn structure, pick the one correct IUPAC name from the choices given.',
        steps: [
          'Do not read the names first. Find the parent chain in the drawing: the longest continuous chain (bends allowed).',
          'Number it from the end that gives the lowest numbers to the branches. If it ties, the first branch in alphabetical order gets the lower number.',
          'Write the name yourself: branches in alphabetical order, then the parent.',
          'Now match it to a choice. Cross off choices with the wrong parent, the wrong numbering or the wrong order.'
        ],
        links: [lesson('05', 's13'), lesson('05', 's10')],
        trap: 'Taking the first chain you see. The longest chain may bend round a corner.'
      },
      {
        id: 'A1.2', title: 'Name this compound', source: M21,
        ask: 'Write the IUPAC name of one drawn compound.',
        steps: [
          'Circle the functional group, if there is one. It decides the ending of the name and which end you number from.',
          'Find the longest chain that holds that group (a ring can be the parent instead).',
          'Number so the group gets the lowest number, then the branches.',
          'Build the name: branches in alphabetical order, then the parent and its ending.'
        ],
        links: [lesson('05', 's13'), lesson('07', 's13'), lesson('05', 's17')]
      },
      {
        id: 'A1.3', title: 'Systematic names, set 1', source: `${M21} and ${SAMPLE}`,
        ask: 'Name six drawn compounds (a to f), adding R/S or cis/trans wherever the structure needs it.',
        steps: [
          'Name the skeleton first: parent, numbering, branches.',
          'Look for a C=C. If each carbon has two different groups, add E or Z (or cis/trans in a ring) at the front.',
          'Look for stereocentres (a carbon with four different groups). Rank the groups, find R or S, and put (R) or (S) with its number at the front.',
          'Write it all as one name: stereo prefixes, branches in alphabetical order, parent.'
        ],
        links: [lesson('05', 's13'), lesson('07', 's13'), lesson('07', 's14'), lesson('15', 's20'), lesson('15', 's16')],
        trap: 'Naming the skeleton right and forgetting the (R) or (E) prefix.',
        show: { label: 'A compound in this style: name it, with E/Z and R/S', structures: [{ smiles: 'C/C=C/[C@@H](C)CC' }] }
      },
      {
        id: 'A1.4', title: 'Systematic names, set 2', source: M24,
        ask: 'Name six more drawn compounds (a to f) by the IUPAC rules.',
        steps: [
          'For each one, decide: chain, ring, alkene, alkyne or something with a group?',
          'Pick the parent, number it for the lowest numbers, and list the branches alphabetically.',
          'Add E/Z, cis/trans or R/S if the drawing shows the stereochemistry.',
          'Read the name back and redraw it. If your drawing does not match the question, find the slip.'
        ],
        links: [lesson('05', 's13'), lesson('07', 's13'), lesson('15', 's20')]
      },
      {
        id: 'A1.5', title: 'The five isomers of C₆H₁₄', source: SAMPLE,
        ask: 'Draw the five constitutional isomers of C₆H₁₄ and give each its IUPAC name.',
        steps: [
          'Start with the straight chain of six carbons: hexane.',
          'Shorten the main chain to five carbons and put one CH₃ on it. Try each spot, and stop when two drawings are the same molecule.',
          'Shorten to four carbons and put two CH₃ groups on it. Try each pair of spots.',
          'Count: you should have five. Name each one: longest chain, lowest numbers, branches alphabetical.'
        ],
        links: [lesson('05', 's01'), lesson('05', 's13')],
        trap: 'Drawing the same molecule twice with the chain flipped or bent. Check the longest chain of each drawing.'
      }
    ]
  },
  {
    id: 'A2', title: 'Stereochemistry: chirality, R/S, meso, isomer relationships',
    blurb: 'Chiral centres, R and S, meso compounds, enantiomer or diastereomer, and Newman and Fischer drawings.',
    items: [
      {
        id: 'A2.1', title: 'Isomeric relationships (pairs)', source: M21,
        ask: 'For each drawn pair, say whether it is identical, enantiomeric, diastereomeric, conformeric, geometric or structural.',
        steps: [
          'Write the molecular formula of both. Different formula: not isomers at all.',
          'Same formula but the atoms are joined in a different order: structural isomers. Stop.',
          'Same connections: check for a C=C or ring with two different arrangements (geometric, cis/trans). Then check for stereocentres.',
          'Give each stereocentre R or S in both molecules. All the same: identical. All opposite: enantiomers. Some opposite: diastereomers.',
          'If the only difference is a bond turned (a Newman or chair drawing): conformers.'
        ],
        links: [lesson('16', 's17'), lesson('16', 's13'), lesson('16', 's03')],
        trap: 'Calling a pair enantiomers when only SOME centres are opposite. That is diastereomers.'
      },
      {
        id: 'A2.2', title: 'Which molecules are chiral?', source: NYU,
        ask: 'Circle only the drawn molecules that are chiral.',
        steps: [
          'Look for a carbon with four different groups. Ring carbons count: compare going each way round the ring.',
          'No such carbon: usually achiral. Stop.',
          'One such carbon: chiral.',
          'Two or more: look for a plane of symmetry (a mirror down the middle). A plane means meso, and so achiral. No plane means chiral.'
        ],
        links: [lesson('15', 's05'), lesson('15', 's06'), lesson('15', 's07')],
        trap: 'Calling every molecule with two stereocentres chiral. Some are meso.',
        show: { label: 'Three molecules in this style: circle the chiral ones (answer: only a)', structures: [{ smiles: 'C[C@@H](O)CC', label: 'a' }, { smiles: 'CC(O)C', label: 'b' }, { smiles: 'C[C@H](Br)[C@@H](C)Br', label: 'c (meso)' }] }
      },
      {
        id: 'A2.3', title: 'R/S at each stereogenic atom', source: NYU,
        ask: 'Give R or S for every stereogenic atom in the drawn molecules.',
        steps: [
          'Mark every stereocentre first, so you do not miss one.',
          'At each one rank the four groups 1 to 4 by the CIP rules (higher atomic number wins; on a tie, go one atom further).',
          'Put the lowest group (4) at the back. If it points toward you, plan to flip your answer.',
          'Go 1 to 2 to 3. Clockwise is R, anticlockwise is S. Flip the letter if group 4 came toward you.'
        ],
        links: [lesson('15', 's13'), lesson('15', 's16'), lesson('15', 's18')],
        trap: 'Forgetting to flip when the lowest-priority group is on a wedge.'
      },
      {
        id: 'A2.4', title: 'All stereoisomers of a diol diacid', source: NYU,
        ask: 'Draw every stereoisomer of the drawn diol diacid, label each pair as enantiomers or diastereomers, and mark any meso forms.',
        steps: [
          'Count the stereocentres, n. At most 2ⁿ stereoisomers.',
          'Draw one isomer, then write R or S at each centre. Flip every centre for its enantiomer.',
          'Change only some centres to get the other diastereomers.',
          'Check each drawing for a plane of symmetry. A molecule that is its own mirror image is meso, so you draw it once. That is why the count falls below 2ⁿ.',
          'Label pairs: all centres opposite is enantiomers; some opposite is diastereomers.'
        ],
        links: [lesson('16', 's11'), lesson('16', 's05'), lesson('16', 's09')],
        trap: 'Drawing a meso compound twice (R,S and S,R are the same molecule).'
      },
      {
        id: 'A2.5', title: 'Newman projection versus structural symbols', source: SAMPLE,
        ask: 'For three drawn structures, decide whether each matches the given Newman projection or its enantiomer, and explain briefly.',
        steps: [
          'Find the stereocentre(s) in the Newman projection and give each R or S.',
          'Do the same for each drawn structure.',
          'Same letters: it matches. All letters flipped: it is the enantiomer. Some flipped: it is neither.',
          'Write one line: "same R/S at every centre, so the same molecule" or "opposite at every centre, so the mirror image".'
        ],
        links: [lesson('06', 's03'), lesson('15', 's18'), lesson('16', 's03')],
        trap: 'Judging by the look of the drawing. Turn each one into R and S letters instead.'
      },
      {
        id: 'A2.6', title: 'Chiral, achiral or meso?', source: SAMPLE,
        ask: 'Decide whether each drawn compound is achiral, chiral or meso, and say why in a sentence.',
        steps: [
          'Mark every stereocentre. None: achiral.',
          'Look for a plane of symmetry, or give each centre R or S. A mirror plane (or R,S that mirror each other) means meso.',
          'Stereocentres but no mirror plane: chiral.',
          'Write the reason: "no stereocentre", "plane of symmetry between the two centres" or "four different groups and no plane".'
        ],
        links: [lesson('16', 's07'), lesson('16', 's09'), lesson('15', 's07')],
        trap: 'Meso is achiral, even though it has stereocentres.'
      },
      {
        id: 'A2.7', title: 'Tartaric acid: Newman, Fischer and CIP', source: M24,
        ask: 'From a Fischer projection of (−)-tartaric acid: draw its Newman conformer, the (+) isomer, the inactive isomer, and give the R/S labels.',
        steps: [
          'R/S first: rank the groups at each of the two centres and read the letters off the Fischer projection (vertical bonds go back).',
          'The (+) isomer is the enantiomer: flip both centres (swap the left and right groups at both).',
          'The inactive isomer is meso: one R and one S, with a mirror plane in the middle.',
          'For the Newman projection, look down the C2–C3 bond. The most stable conformer is staggered, with the large groups anti.'
        ],
        links: [lesson('16', 's24'), lesson('16', 's05'), lesson('16', 's06'), lesson('06', 's03')],
        trap: 'Rotating a Fischer projection by 90°. Only turns of 180° keep the same molecule.'
      }
    ]
  },
  {
    id: 'A3', title: 'Conformations, ring chairs and strain energy',
    blurb: 'Chair flips, axial and equatorial groups, 1,3-diaxial strain and Newman projections.',
    items: [
      {
        id: 'A3.1', title: 'Chair conformations of 1,2-dichlorocyclohexane', source: NYU,
        ask: 'For each stereoisomer of 1,2-dichlorocyclohexane, draw both chairs, circle the more stable one and say how the two chairs are related.',
        steps: [
          'List the stereoisomers: cis, and trans (which comes as two enantiomers).',
          'Draw one chair and put each Cl up or down as the isomer needs. Then flip the ring and redraw.',
          'Axial or equatorial? On neighbouring carbons, cis is axial/equatorial; trans is both axial or both equatorial.',
          'More groups equatorial means more stable. If the two chairs have the same count, they are equal in energy.',
          'Relationship: cis is a meso compound, so its two chairs are mirror images of each other and equal. Trans: one chair is diequatorial (more stable), the other is diaxial.'
        ],
        links: [lesson('06', 's16'), lesson('06', 's17'), lesson('06', 's18')],
        trap: 'Putting both groups equatorial for the cis isomer. That is the trans isomer.'
      },
      {
        id: 'A3.2', title: 'cis-1,3-Dimethylcyclohexane', source: SAMPLE,
        ask: 'Draw both chairs of cis-1,3-dimethylcyclohexane, explain the energy gap and work out the CH₃/CH₃ diaxial strain.',
        steps: [
          'cis-1,3 means both CH₃ groups can be equatorial together in one chair, or both axial together in the flipped chair.',
          'The diaxial chair has the two CH₃ groups pointing the same way, on the same face, close to each other.',
          'Each axial CH₃ also faces one axial H. That CH₃/H strain is 0.9 kcal/mol, and there are two of them. Count those first.',
          'Subtract them from the total gap. What is left is the extra strain from CH₃ meeting CH₃.'
        ],
        links: [lesson('06', 's16'), lesson('06', 's14'), lesson('06', 's15')],
        trap: 'Stopping at the two CH₃/H strains. The rest of the energy gap is the CH₃/CH₃ strain.'
      },
      {
        id: 'A3.3', title: 'Names to most stable conformational structures', source: SAMPLE,
        ask: 'Turn three names (a cyclohexane, a dibromopentane, another cyclohexane) into the most stable 3D drawing.',
        steps: [
          'Ring names: draw the ring chair, and put the groups on as the cis or trans says.',
          'Choose the chair with the bigger group equatorial. tert-Butyl is always equatorial.',
          'For the open chain, (2R,3S)-dibromopentane: look down the C2–C3 bond in a Newman projection, set the R/S as given, and then turn it to the staggered form with the large groups anti.',
          'Check by re-reading: cis or trans and R/S must match the name.'
        ],
        links: [lesson('06', 's18'), lesson('06', 's17'), lesson('06', 's06'), lesson('15', 's18')],
        trap: 'Flipping a chair and forgetting that cis and trans must stay the same.'
      },
      {
        id: 'A3.4', title: 'Estimating a CH₃/Br 1,3-diaxial interaction', source: M24,
        ask: 'Given how much more stable the diequatorial chair is, estimate the CH₃/Br diaxial interaction from the CH₃/H and Br/H values.',
        steps: [
          'Draw both chairs of the cis-1,3 isomer: diequatorial and diaxial.',
          'List every strain in the diaxial chair: each axial group has two 1,3-diaxial neighbours, one H and the other axial group. So CH₃ faces one H, Br faces one H, and CH₃ faces Br.',
          'Write the total strain as a sum: the CH₃/H and Br/H terms (their values are given) plus the CH₃/Br term you want.',
          'Set the total equal to the energy gap given. Solve for CH₃/Br.'
        ],
        links: [lesson('06', 's14'), lesson('06', 's15'), lesson('06', 's16')],
        trap: 'Counting two H neighbours for each axial group. Each one faces one H and one other group, so each CH₃/H and Br/H term appears once.'
      },
      {
        id: 'A3.5', title: 'Newman projections of 3-ethyl-2,4,4-trimethylheptane', source: M24,
        ask: 'Draw Newman projections along the C3–C4 bond for the most stable and the least stable conformation.',
        steps: [
          'Draw the structure and mark C3 and C4. List the three groups on C3 (front) and the three on C4 (back), apart from the C3–C4 bond itself.',
          'Rank the groups by size: the large ones are the branches, and H is smallest.',
          'Most stable: staggered, with the two largest groups anti (180° apart).',
          'Least stable: eclipsed, with the two largest groups directly in line with each other.'
        ],
        links: [lesson('06', 's02'), lesson('06', 's03'), lesson('06', 's06')],
        trap: 'Using the staggered form for "least stable". Eclipsed is the high-energy form.'
      },
      {
        id: 'A3.6', title: 'Heats of formation and stability', source: M24,
        ask: 'Given the heats of formation of two C₃H₆O isomers, find their energy difference, which is more stable and which has the smaller heat of combustion.',
        steps: [
          'Subtract the two heats of formation. The size of the difference is the energy gap.',
          'The more negative heat of formation is the lower-energy, more stable isomer.',
          'Both isomers burn to the same products, so the more stable isomer releases less energy: it has the smaller heat of combustion.',
          'Write that one line in your answer: more stable means less heat released when it burns.'
        ],
        links: [lesson('08', 's12')],
        trap: 'Thinking the more stable isomer gives off more heat when it burns. It gives off less.'
      }
    ]
  },
  {
    id: 'A5', title: 'Alkyl halides: HBr addition',
    blurb: 'HBr adding to a cyclohexene. The SN2 and synthesis questions of this section are not on this midterm, so they are left out.',
    items: [
      {
        id: 'A5.1', title: 'HBr addition to a cyclohexene', source: NYU,
        ask: 'Draw, with stereochemistry, the four major C₈H₁₅Br products when HBr adds to cis-4,5-dimethylcyclohexene (both CH₃ on wedges).',
        steps: [
          'Mark the two C=C carbons and count the alkyl groups on each. Here both are 2° (one H each), so Markovnikov cannot choose: the + can sit on either carbon.',
          'So Br can end up on either alkene carbon. That is two regioisomers already.',
          'The cation is flat, so Br⁻ can attack from the top face or the bottom face.',
          'Find every stereocentre in the product. Draw R and S at each one the new bond can make.',
          'Count: two carbons for Br, times two faces (Br cis or trans to the two CH₃ groups) = four products. The two CH₃ stereocentres stay as drawn, so these are diastereomers, not a racemate.'
        ],
        links: [card('alkene-hx', 'HBr or HCl'), lesson('09', 's02'), lesson('09', 's15')],
        trap: 'Drawing only one face. The cation is flat, so both faces are attacked.'
      }
    ]
  },
  {
    id: 'B1', title: 'Nomenclature of improper names',
    blurb: 'Draw the structure from a wrong name, then write the correct IUPAC name.',
    items: [
      {
        id: 'B1.1', title: 'Correct the improper names', source: M222,
        ask: 'Draw each of nine wrongly named compounds, then give the correct IUPAC name.',
        steps: [
          'Draw the structure from the wrong name first. Do not fix the name in your head.',
          'Find the principal group (aldehyde, then ketone, then alcohol) and make it the ending. Replace Greek letters (γ) and p-, o- with numbers.',
          'Number so the principal group gets the lowest number. On a benzene ring, give the lowest set of numbers to all the groups.',
          'If the numbers tie, the first group alphabetically gets the lower number. For a diene, write the E/Z labels with their numbers.',
          'Write the name in alphabetical order.'
        ],
        links: [lesson('13', 's15'), lesson('13', 's13'), lesson('07', 's13'), lesson('05', 's13')],
        trap: 'Keeping a numbering that is not lowest. A name like 1,4,5 is wrong if the ring can be numbered the other way.'
      }
    ]
  },
  {
    id: 'B2', title: 'Aromaticity (Hückel\'s rule)',
    blurb: 'Count the π electrons in a ring, then apply 4n+2.',
    items: [
      {
        id: 'B2.1', title: 'Aromatic or anti-aromatic?', source: M222,
        ask: 'For five drawn monocyclic systems, count the π electrons and decide aromatic or anti-aromatic.',
        steps: [
          'Check the ring is flat and every ring atom has a p orbital. If one atom is sp³, the ring is not aromatic.',
          'Count π electrons: 2 for each C=C, 2 for an N–H or O lone pair that sits in the ring, 0 for an empty p orbital on a carbocation, 2 for a carbanion lone pair.',
          'Test: 4n+2 (2, 6, 10, 14 electrons) means aromatic. 4n (4, 8, 12) means anti-aromatic.',
          'Write the count and the test in your answer. The marks are for the reasoning.'
        ],
        links: [lesson('14', 's13'), lesson('14', 's14'), lesson('13', 's04')],
        trap: 'Counting the lone pair of pyridine\'s N. It points outward, so it is not in the π system.'
      },
      {
        id: 'B2.2', title: 'Cyclooctatetraene and potassium', source: M222,
        ask: 'Decide whether the cyclooctatetraene dianion is aromatic or anti-aromatic, give the reason, and draw the electron arrangement.',
        steps: [
          'Count the π electrons of the neutral ring: four C=C bonds.',
          'Each K gives one electron. Add the electrons from two K.',
          'Test the total with 4n+2. Then say aromatic or anti-aromatic.',
          'A ring that becomes aromatic will flatten. Draw the ring as planar with its π electrons spread round it, and mark the 2− charge.'
        ],
        links: [lesson('14', 's13'), lesson('13', 's04')]
      }
    ]
  },
  {
    id: 'B3', title: 'Reactions of aromatics, alkynes and carbonyls',
    blurb: 'Item B3.1 has eighteen drawn reactions. They are grouped here by reaction type, with the card for each one.',
    items: [
      {
        id: 'B3.1.1', title: 'Substitution on a ring that already has two groups', source: M222,
        ask: 'Give the major product when a ring with two groups reacts with an electrophile (xiv shows Br₂, AlCl₃).',
        steps: [
          'Br₂ with AlCl₃ or FeBr₃ is electrophilic aromatic substitution: ONE ring H becomes Br.',
          'Sort both groups: activator (o/p), halogen (o/p), or deactivator (meta).',
          'For each group, mark the carbons it points to. Look for a carbon that both groups point to.',
          'If they disagree, the stronger activator decides. The carbon squeezed between two groups is rarely used.',
          'Draw the isomer(s) that form.'
        ],
        links: [card('eas-bromination', 'Br₂, FeBr₃'), card('director-activating', 'activating groups'), card('director-meta', 'meta directors'), lesson('14', 's08')],
        trap: 'Adding the electrophile to a carbon that already carries a group.'
      },
      {
        id: 'B3.1.2', title: 'Nitration of an amine in acid', source: M222,
        ask: 'Give the product when a ring with an amine group is nitrated in HNO₃ and H₂SO₄.',
        steps: [
          'Ask: is the medium strong acid? HNO₃ with H₂SO₄ is.',
          'In strong acid the amine becomes –NR₂H⁺. It has no lone pair left, so it is a meta director.',
          'Mark the carbons meta to the nitrogen. Check the other group on the ring and see if it agrees.',
          'Put NO₂ on the carbon where they agree.'
        ],
        links: [card('amine-in-acid', 'amine in acid'), lesson('14', 's03')],
        trap: 'Treating –NR₂ as an ortho/para director. In strong acid it is not.'
      },
      {
        id: 'B3.1.3', title: 'Desulfonation with D₂SO₄', source: M222,
        ask: 'Give the product when a sulfonic acid on a ring is heated with D₂SO₄ in D₂O.',
        steps: [
          'Sulfonation is reversible. Hot acid with water (or D₂O) runs it backwards.',
          'Swap the SO₃H for D on the same ring carbon. Nothing else on the ring moves.',
          'With D₂SO₄ the new atom is D. With ordinary dilute H₂SO₄ it would be H.'
        ],
        links: [card('desulfonation', 'desulfonation'), lesson('13', 's09')],
        trap: 'Writing H where the question uses D₂SO₄.'
      },
      {
        id: 'B3.1.4', title: 'Benzylic bromination (Br₂, hν)', source: M222,
        ask: 'Give the major product when an alkylbenzene reacts with Br₂ and light (or NBS).',
        steps: [
          'Light (hν) or NBS means a radical reaction, not electrophilic substitution.',
          'Find the benzylic carbon: the one bonded to the ring. It needs an H.',
          'Replace one benzylic H with Br. No Br goes on the ring.',
          'If that carbon is now a stereocentre, say the product is a racemate.'
        ],
        links: [card('benzylic-bromination', 'benzylic bromination'), lesson('14', 's10')],
        trap: 'Putting Br on the ring. That needs FeBr₃, not light.'
      },
      {
        id: 'B3.1.5', title: 'Hydroboration of an alkyne', source: M222,
        ask: 'Give the product when an alkyne reacts with BH₃ and then H₂O₂, NaOH.',
        steps: [
          'BH₃ then H₂O₂ with NaOH adds H and OH across the triple bond, OH on the END carbon.',
          'That first makes an enol, C=C–OH.',
          'The enol flips into a C=O. A terminal alkyne gives an aldehyde. An internal alkyne gives a ketone.',
          'Compare with Hg²⁺ and water: the OH goes on the inner carbon and a terminal alkyne gives a methyl ketone.'
        ],
        links: [card('alkyne-hydroboration', 'alkyne hydroboration'), card('alkyne-hydration', 'Hg²⁺ hydration')],
        trap: 'Stopping at the enol. It always flips to the C=O.'
      },
      {
        id: 'B3.1.6', title: 'Clemmensen reduction', source: M222,
        ask: 'Give the product when an aryl ketone is treated with Zn(Hg) and HCl.',
        steps: [
          'Zn(Hg) with HCl and heat is the Clemmensen reduction.',
          'Find the C=O bonded to the ring.',
          'Turn that C=O into CH₂. The O leaves. Nothing else changes.'
        ],
        links: [card('clemmensen', 'Clemmensen'), card('fc-acylation', 'Friedel–Crafts acylation')],
        trap: 'Stopping at the alcohol. Clemmensen goes all the way to CH₂.'
      },
      {
        id: 'B3.1.7', title: 'Alcohol oxidation with Na₂Cr₂O₇', source: M222,
        ask: 'Give the product when an alcohol is treated with Na₂Cr₂O₇, H₂SO₄ and water.',
        steps: [
          'Sort each OH: 1° (on a CH₂), 2° (on a CH) or 3° (no H on that carbon).',
          'A 2° alcohol loses two H and becomes a ketone.',
          'A 1° alcohol goes all the way to a carboxylic acid, because water is there.',
          'A 3° alcohol does not react.'
        ],
        links: [card('oxidation-cr', 'Na₂Cr₂O₇')],
        trap: 'Stopping a 1° alcohol at the aldehyde. That is PCC, not Cr(VI) in water.'
      },
      {
        id: 'B3.1.8', title: 'Alcohol oxidation with PCC', source: M222,
        ask: 'Give the product when an alcohol is treated with PCC in CH₂Cl₂.',
        steps: [
          'Sort each OH: 1°, 2° or 3°.',
          'A 1° alcohol becomes an aldehyde and stops there, because there is no water.',
          'A 2° alcohol becomes a ketone.',
          'A 3° alcohol does not react.'
        ],
        links: [card('oxidation-pcc', 'PCC'), card('oxidation-cr', 'Na₂Cr₂O₇')],
        trap: 'Taking a 1° alcohol on to the acid. PCC stops at the aldehyde.'
      },
      {
        id: 'B3.1.9', title: 'Diels–Alder', source: M222,
        ask: 'Give the product when a conjugated diene reacts with a dienophile on heating.',
        steps: [
          'Spot the pair: a conjugated diene, C=C–C=C, and a C=C with an electron-withdrawing group.',
          'Number the diene C1 to C4. The ends, C1 and C4, form the two new bonds.',
          'Close a six-membered ring. The new C=C sits between the old C2 and C3.',
          'Place the groups. Groups that were cis on the dienophile stay cis in the ring.'
        ],
        links: [card('diels-alder', 'Diels–Alder')],
        trap: 'Moving the double bonds the wrong way. The new C=C is between old C2 and C3.'
      },
      {
        id: 'B3.1.10', title: 'Alkyne hydration with Hg²⁺', source: M222,
        ask: 'Give the product when an alkyne is treated with H₂O, H₂SO₄ and HgSO₄.',
        steps: [
          'Water, acid and Hg²⁺ is hydration of the alkyne.',
          'OH adds to the more substituted carbon (Markovnikov). That makes an enol.',
          'The enol flips into a ketone. A terminal alkyne gives a methyl ketone.',
          'A symmetrical internal alkyne gives one ketone. An unsymmetrical one gives a mixture of two.'
        ],
        links: [card('alkyne-hydration', 'Hg²⁺ hydration'), lesson('12', 's09'), lesson('12', 's10')],
        trap: 'Drawing the enol as the final product.'
      },
      {
        id: 'B3.1.11', title: 'Birch reduction', source: M222,
        ask: 'Give the product when a benzene ring is treated with Na, liquid NH₃ and an alcohol.',
        steps: [
          'Na in liquid NH₃ with an alcohol is the Birch reduction. The ring keeps two C=C bonds.',
          'Add one H to each of two ring carbons that are para (positions 1 and 4).',
          'An electron-withdrawing group (CO₂H) ends up on an sp³ carbon. An electron donor (OCH₃, alkyl) stays on a C=C carbon.',
          'The two C=C bonds are apart (1,4). Do not draw a conjugated diene.'
        ],
        links: [card('birch', 'Birch')],
        trap: 'Drawing a conjugated 1,3-diene or going all the way to cyclohexane.'
      },
      {
        id: 'B3.1.12', title: 'Sulfonation of nitrotoluene', source: M222,
        ask: 'Give the product when a nitrotoluene reacts with SO₃ in H₂SO₄.',
        steps: [
          'SO₃ with H₂SO₄ is sulfonation: ONE ring H becomes SO₃H.',
          'Sort the two groups: NO₂ is a meta director, CH₃ is an o/p director.',
          'Mark the carbons each group points to. Find a carbon they both point to.',
          'Put SO₃H there. If more than one carbon works, draw each isomer.'
        ],
        links: [card('eas-sulfonation', 'SO₃, H₂SO₄'), card('director-meta', 'meta directors'), card('director-activating', 'activating groups')],
        trap: 'Choosing the carbon one group likes and the other forbids.'
      }
    ]
  },
  {
    id: 'B4', title: 'Resonance, reactivity and orientation (EAS)',
    blurb: 'Draw the sigma complexes and say why a group is o/p or meta and activating or deactivating.',
    items: [
      {
        id: 'B4.1', title: 'Iodobenzene: why ortho/para?', source: M222,
        ask: 'Use resonance to explain why iodobenzene reacts ortho/para, and draw the sigma complexes for ortho, meta and para attack.',
        steps: [
          'Draw the ring with the electrophile on the carbon you attack. That carbon is now sp³.',
          'Draw the three ring resonance forms: the + sits on the carbons next to the sp³ carbon and the one opposite it.',
          'For ortho and para attack, one form has the + on the carbon that carries I. Draw one more form where I shares a lone pair with the +.',
          'Meta attack has no such form. The + is never on the carbon that carries I.',
          'Say it: I withdraws electrons through the σ bond (slower than benzene), but its lone pair helps at ortho and para (so it directs there).'
        ],
        links: [card('director-halogen', 'halogens'), lesson('14', 's07'), lesson('14', 's04')],
        trap: 'Using the inductive effect to explain the position. It explains the rate. The lone pair explains the position.'
      },
      {
        id: 'B4.2', title: 'Anisole: why more reactive than benzene?', source: M222,
        ask: 'Use resonance to explain why anisole is more reactive than benzene and why it reacts ortho/para.',
        steps: [
          'Draw the sigma complex for ortho or para attack, with the + on the carbon that carries OCH₃.',
          'Draw the extra form where an O lone pair makes a C=O⁺ bond. Every atom in it has an octet.',
          'Meta attack cannot do this, so the OCH₃ does not help there.',
          'Say it: the oxygen lone pair donates by resonance, which stabilises the cation, so the ring is faster. This beats the inductive pull of O.'
        ],
        links: [card('director-activating', 'activating groups'), lesson('14', 's04'), lesson('14', 's03')],
        trap: 'Saying O "donates electrons" without showing the resonance form.'
      },
      {
        id: 'B4.3', title: 'Mesitylene versus o-xylene', source: M222,
        ask: 'Draw the sigma-complex resonance forms for mesitylene and for o-xylene, and explain why mesitylene is more reactive.',
        steps: [
          'Draw each ring with the electrophile on a free carbon. Draw the three resonance forms of each cation.',
          'In each form, find where the + sits. Mark the forms that put + on a carbon that carries a CH₃ (a tertiary cation).',
          'Count them. The ring with more of these forms has the more stable cation.',
          'Say it: a more stable cation means a lower energy barrier, so the ring is more reactive. Steric hindrance is not the reason.'
        ],
        links: [card('director-activating', 'activating groups'), lesson('14', 's04'), lesson('14', 's02')],
        trap: 'Explaining it with crowding. The question says it is the resonance forms.'
      }
    ]
  },
  {
    id: 'B6', title: 'Stereocontrol in additions, and aromatic synthesis',
    blurb: 'Which stereoisomer is major and which is minor, and a ring synthesis with a blocking group.',
    items: [
      {
        id: 'B6.1', title: 'Predict the MAJOR and MINOR products', source: M222,
        ask: 'Draw and label the major and minor product for (a) lithium acetylide then H₃O⁺ onto (S)-2-methylcyclohexanone and (b) CH₃MgBr then H₃O⁺ onto 2-phenylpropanal.',
        steps: [
          'Find where the carbon nucleophile attacks: an electrophilic carbon, usually the C=O carbon of an aldehyde or ketone. H₃O⁺ then turns the O⁻ into OH.',
          'Find the stereocentre made by the attack. Check whether the molecule already has a stereocentre.',
          'Both substrates here already have a stereocentre next to the C=O, so the two products are diastereomers (the old centre is unchanged, the new one is R or S).',
          'The nucleophile arrives from the face away from the bigger group on the old stereocentre (CH₃ on the ring; phenyl on the propanal). That face gives the major product; the other face gives the minor one.',
          'Draw each product with wedges and dashes and label Major or Minor.'
        ],
        links: [card('alkyne-acetylide', 'acetylide'), lesson('12', 's14'), lesson('16', 's03')],
        trap: 'Drawing the products as enantiomers. The old stereocentre is untouched, so major and minor are diastereomers.'
      },
      {
        id: 'B6.2', title: 'Synthesis of a tetrasubstituted benzaldehyde', source: M222,
        ask: 'From toluene, make 2-bromo-6-chloro-4-deuteriobenzaldehyde: CHO at C1, Cl and Br on the two ortho carbons, D on the para carbon.',
        steps: [
          'Number the target from CHO. Cl and Br are both ortho to it, and D is para. The CH₃ of toluene becomes the CHO, so Cl and Br must go ortho to CH₃ while it still directs ortho/para.',
          'Step 1: SO₃, H₂SO₄. CH₃ directs ortho/para, and the bulky SO₃H goes para because the ortho spots are more crowded. Now para is blocked, and the D will go there at the end.',
          'Steps 2 and 3: Cl₂ with FeCl₃, then Br₂ with FeBr₃. Each goes ortho to CH₃ (the only open ortho/para spots; SO₃H directs meta to the same carbons, so everything agrees).',
          'Step 4: turn CH₃ into CHO (NBS twice puts two Br on the CH₃ carbon, then water turns the CHBr₂ into CHO; KMnO₄ would overshoot to CO₂H). Do this AFTER the halogens are on, because CHO is a meta director.',
          'Step 5: D₂SO₄ in D₂O, heat. Desulfonation swaps the SO₃H for D on the para carbon. Write every step with its reagent and the product after it.'
        ],
        links: [lesson('14', 's19'), lesson('14', 's20'), card('desulfonation', 'desulfonation'), card('eas-sulfonation', 'SO₃, H₂SO₄'), card('benzylic-bromination', 'NBS or Br₂, light')],
        trap: 'Putting groups on in the wrong order, so a meta director sends the next group to the wrong place.',
        show: { label: 'Start and target', equation: { reactants: ['Cc1ccccc1'], products: ['O=Cc1c(Cl)cc([2H])cc1Br'], cond: '5 steps' } }
      }
    ]
  }
];

export const PASTPAPER_ORDER = ['A1', 'A2', 'A3', 'A5', 'B1', 'B2', 'B3', 'B4', 'B6'];
