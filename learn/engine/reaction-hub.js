// Reaction hub data: one card per reagent the lessons teach (Lessons 9 to 14), as plain data. The hub screen (#reactions) and, later, the mixed
// predict-the-product drill both read this file, so a fact exists once. No DOM, no RDKit at import time.
//
// Every card has the same parts, in the same order on screen:
//   what      one sentence: what the reagent does.
//   example   { substrate, product, reagent?, note? }: one worked example, drawn on the card. `product` may hold several molecules joined by '.'
//             (ortho and para products, cleavage pieces, 1,2 and 1,4 products). A product with stereocentres carries @ / @@ and / \ marks; a
//             product that forms as a racemate with ONE stereocentre is drawn flat (as the engine does) and `note` says so.
//   facts     { adds, where, space, addsKey, spaceNote? }: three facts. `space` is exactly 'syn' | 'anti' | 'either' | 'n.a.'.
//             `addsKey` lists the filter buttons the card belongs to: 'OH' | 'X' (Br or Cl) | 'H' | 'other'.
//   apply     { pattern, steps[] }: the question as an exam would phrase it, then numbered steps to answer it.
//   lesson    { id, step }: the lesson step that teaches it (deep link #lesson-ID/step). `mech`: the step of the mechanism, when the lesson has one.
// tests/hub.mjs checks every card (all fields, real step ids, products against the engines and against Python RDKit).
//
// NOT on the hub, because the lessons do not teach them (see the "Not covered" notes in lessons 10, 11, 12 and 13/14): hydroboration then H2O2/NaOH,
// OsO4, halohydrins (Br2/H2O), ozonolysis, Na/NH3 (trans alkenes), Diels-Alder, kinetic against thermodynamic control, acyl to alkyl reduction.

export const HUB_GROUPS = [
  { id: 'arene', label: 'Aromatics', sub: 'Benzene rings: substitution, not addition (Lessons 13 and 14)' },
  { id: 'alkene', label: 'Alkenes', sub: 'Additions across a C=C (Lessons 9 and 10)' },
  { id: 'alkyne', label: 'Alkynes', sub: 'Additions across a C≡C, and acetylides (Lesson 12)' },
  { id: 'diene', label: 'Dienes', sub: 'Conjugated dienes (Lesson 11)' }
];

/** Filter buttons: by group, by how the groups add in space, by what adds. */
export const HUB_SPACE = [
  { id: 'syn', label: 'Syn', text: 'Both new groups on the same face' },
  { id: 'anti', label: 'Anti', text: 'New groups on opposite faces' },
  { id: 'either', label: 'Either face', text: 'Flat cation: either face' },
  { id: 'n.a.', label: 'No stereo', text: 'No stereochemistry to show' }
];
export const HUB_ADDS = [
  { id: 'OH', label: 'OH' },
  { id: 'X', label: 'Br / Cl' },
  { id: 'H', label: 'H' },
  { id: 'other', label: 'Other' }
];

export const HUB_CARDS = [
  // ------------------------------------------------------------------ aromatics (Lessons 13 and 14), in order of midterm weight
  {
    id: 'eas-bromination', group: 'arene', reagent: 'Br₂, FeBr₃',
    what: 'Puts one Br on a benzene ring in place of one H: the ring substitutes, it does not add (Cl₂ with FeCl₃ works the same way).',
    example: { substrate: 'c1ccccc1', product: 'Brc1ccccc1' },
    facts: { adds: 'Br (replaces one ring H)', where: 'On the ring: all six carbons are alike in benzene', space: 'n.a.', addsKey: ['X'] },
    apply: {
      pattern: 'Benzene is treated with Br₂ and FeBr₃. Draw the major organic product.',
      steps: [
        'A Lewis acid catalyst (FeBr₃, FeCl₃, AlCl₃) next to a benzene ring tells you: electrophilic aromatic substitution.',
        'Name the electrophile: Br⁺. FeBr₃ makes one Br of Br₂ electron-poor.',
        'Swap ONE ring H for Br. Keep the ring as it was. Do not add Br to the ring (no addition).',
        'If the ring already carries a group, go to the director cards: they say ortho/para or meta.'
      ]
    },
    lesson: { id: '13', step: 's01' }, mech: 's06'
  },
  {
    id: 'eas-nitration', group: 'arene', reagent: 'HNO₃, H₂SO₄',
    what: 'Puts an NO₂ group on the ring. H₂SO₄ turns HNO₃ into NO₂⁺, the electrophile.',
    example: { substrate: 'c1ccccc1', product: 'O=[N+]([O-])c1ccccc1' },
    facts: { adds: 'NO₂ (replaces one ring H)', where: 'On the ring', space: 'n.a.', addsKey: ['other'] },
    apply: {
      pattern: 'Benzene is treated with concentrated HNO₃ and H₂SO₄. Give the product. How do you turn it into aniline?',
      steps: [
        'Nitric acid with sulfuric acid makes the nitronium ion, NO₂⁺. That is the electrophile.',
        'Swap ONE ring H for NO₂ and keep the ring: nitrobenzene.',
        'To get aniline: reduce the NO₂ with Fe, H₃O⁺ (see the nitro card).',
        'Remember: NO₂ is a meta director, so a second group goes meta to it.'
      ]
    },
    lesson: { id: '13', step: 's10' }
  },
  {
    id: 'eas-sulfonation', group: 'arene', reagent: 'SO₃, H₂SO₄',
    what: 'Puts an SO₃H group on the ring. SO₃ with H₂SO₄ makes HSO₃⁺, the electrophile.',
    example: { substrate: 'c1ccccc1', product: 'O=S(=O)(O)c1ccccc1' },
    facts: { adds: 'SO₃H (replaces one ring H)', where: 'On the ring (the S bonds to the ring carbon)', space: 'n.a.', addsKey: ['other'] },
    apply: {
      pattern: 'Benzene reacts with SO₃ in H₂SO₄ (fuming sulfuric acid). Draw the product.',
      steps: [
        'SO₃ plus H₂SO₄ gives HSO₃⁺. The ring attacks the S atom.',
        'Swap ONE ring H for SO₃H: benzenesulfonic acid.',
        'SO₃H is a meta director and a deactivator. A ring with SO₃H cannot do a Friedel–Crafts reaction.'
      ]
    },
    lesson: { id: '13', step: 's09' }
  },
  {
    id: 'fc-alkylation', group: 'arene', reagent: 'R–Cl, AlCl₃ (Friedel–Crafts alkylation)',
    what: 'Puts an alkyl group on the ring. AlCl₃ pulls Cl off R–Cl to make a carbocation, R⁺, and the ring attacks it.',
    example: { substrate: 'c1ccccc1', product: 'CCc1ccccc1', reagent: 'CH₃CH₂Cl, AlCl₃' },
    facts: { adds: 'An alkyl group, R (replaces one ring H)', where: 'On the ring', space: 'n.a.', addsKey: ['other'] },
    apply: {
      pattern: 'Benzene reacts with CH₃CH₂Cl and AlCl₃. Give the product. Why does the same reaction fail on chlorobenzene or nitrobenzene?',
      steps: [
        'An alkyl chloride with AlCl₃ is a Friedel–Crafts alkylation. The electrophile is the carbocation R⁺.',
        'Swap ONE ring H for R: ethylbenzene here.',
        'Check the halide: Cl must be on a saturated carbon (alkyl). Aryl and vinylic halides make no carbocation.',
        'Check the ring: it must not carry NO₂, C≡N, SO₃H or a C=O group (COR). Those rings are too unreactive.',
        'In a synthesis with a second group, do the Friedel–Crafts step FIRST, while the ring is still reactive.'
      ]
    },
    lesson: { id: '13', step: 's12' }
  },
  {
    id: 'fc-acylation', group: 'arene', reagent: 'RCOCl, AlCl₃ (Friedel–Crafts acylation)',
    what: 'Puts an acyl group, R–C(=O)–, on the ring and makes an aryl ketone. The electrophile is the acylium ion, RC≡O⁺.',
    example: { substrate: 'c1ccccc1', product: 'CC(=O)c1ccccc1', reagent: 'CH₃COCl, AlCl₃' },
    facts: { adds: 'An acyl group, RC=O (replaces one ring H)', where: 'On the ring', space: 'n.a.', addsKey: ['other'] },
    apply: {
      pattern: 'Show how to make acetophenone from benzene.',
      steps: [
        'Acetophenone has C(=O)CH₃ on the ring. The reagent for that is the acid chloride CH₃COCl with AlCl₃.',
        'AlCl₃ takes Cl⁻ and leaves the acylium ion, CH₃C≡O⁺.',
        'The ring attacks it, then loses H⁺: one ring H is now C(=O)CH₃.',
        'The same limits apply as for alkylation: no NO₂, C≡N, SO₃H or COR already on the ring.'
      ]
    },
    lesson: { id: '13', step: 's17' }
  },
  {
    id: 'director-activating', group: 'arene', reagent: 'Ring already has an activator (–CH₃, –OH, –OR, –NH₂)',
    what: 'A group that gives electrons to the ring makes the next substitution faster and sends the new group ortho and para.',
    example: { substrate: 'Cc1ccccc1', product: 'Cc1ccc([N+](=O)[O-])cc1.Cc1ccccc1[N+](=O)[O-]', reagent: 'HNO₃, H₂SO₄', note: 'Para and ortho isomers form. Draw both.' },
    facts: { adds: 'The new group (NO₂, Br, ...) replaces one ring H', where: 'Ortho and para to the group on the ring', space: 'n.a.', addsKey: ['other'] },
    apply: {
      pattern: 'Toluene is nitrated with HNO₃ and H₂SO₄. Draw the major product(s). Why is toluene more reactive than benzene?',
      steps: [
        'Look at the group already on the ring. An alkyl group, or a ring atom with a lone pair (–NH₂, –OH, –OR), is an activator that directs ortho/para.',
        'Mark the ring carbons: two ortho and one para to that group. Leave the two meta carbons alone.',
        'Put the new group on the ortho and para carbons. Draw both isomers.',
        'Why: after ortho or para attack, one resonance form of the carbocation has its + on the carbon that holds the group. The group helps carry the +.'
      ]
    },
    lesson: { id: '14', step: 's01' }, mech: 's04'
  },
  {
    id: 'director-halogen', group: 'arene', reagent: 'Ring already has a halogen (–F, –Cl, –Br, –I)',
    what: 'Halogens are the odd ones out: they slow the ring down (deactivating) but still send the new group ortho and para.',
    example: { substrate: 'Clc1ccccc1', product: 'O=[N+]([O-])c1ccc(Cl)cc1.O=[N+]([O-])c1ccccc1Cl', reagent: 'HNO₃, H₂SO₄', note: 'Slower than benzene, but ortho and para.' },
    facts: { adds: 'The new group (NO₂, Br, ...) replaces one ring H', where: 'Ortho and para to the halogen', space: 'n.a.', addsKey: ['other'] },
    apply: {
      pattern: 'Chlorobenzene is nitrated. Which isomers form? Is it faster or slower than benzene, and why?',
      steps: [
        'Halogens are deactivators (the ring is slower than benzene) but they are ortho/para directors. This is the one exception to "deactivator means meta".',
        'Rate: Cl pulls electrons through the σ bond (inductive effect), so the ring is less reactive.',
        'Position: in ortho and para attack, a lone pair on Cl can share the + charge (an extra resonance form). Meta attack cannot.',
        'Draw the ortho and para products.'
      ]
    },
    lesson: { id: '14', step: 's07' }
  },
  {
    id: 'director-meta', group: 'arene', reagent: 'Ring already has a deactivator (–NO₂, –C≡N, –SO₃H, –CHO, –COR, –CO₂H)',
    what: 'These groups pull electrons out of the ring. The ring reacts much more slowly and the new group goes meta.',
    example: { substrate: 'O=[N+]([O-])c1ccccc1', product: 'O=[N+]([O-])c1cccc(Br)c1', reagent: 'Br₂, FeBr₃' },
    facts: { adds: 'The new group (Br, NO₂, ...) replaces one ring H', where: 'Meta to the group on the ring', space: 'n.a.', addsKey: ['X'] },
    apply: {
      pattern: 'Nitrobenzene is brominated with Br₂ and FeBr₃. Draw the product.',
      steps: [
        'Sort the group on the ring. A δ+ atom with no lone pair to give (NO₂, C≡N, SO₃H, a C=O group) is a deactivator and a meta director.',
        'Number the ring from that group: ortho = 2 and 6, meta = 3 and 5, para = 4.',
        'Put the new group on a meta carbon (a 1,3 relationship). Both meta carbons give the same product.',
        'There are no meta-directing activators. Friedel–Crafts does not work on these rings.'
      ]
    },
    lesson: { id: '14', step: 's03' }, mech: 's05'
  },
  {
    id: 'side-chain-kmno4', group: 'arene', reagent: 'KMnO₄, H₂O (heat)',
    what: 'Turns an alkyl side chain into –CO₂H, right on the ring. The ring itself is not attacked.',
    example: { substrate: 'CCCc1ccccc1', product: 'O=C(O)c1ccccc1' },
    facts: { adds: 'O (side-chain carbon becomes CO₂H)', where: 'At the benzylic carbon, the one bonded to the ring; the rest of the chain is lost', space: 'n.a.', addsKey: ['other'] },
    apply: {
      pattern: 'Propylbenzene is heated with KMnO₄ in water. Draw the aromatic product. What happens to tert-butylbenzene?',
      steps: [
        'Find the benzylic carbon (the side-chain carbon bonded to the ring). Count its H.',
        'At least one benzylic H: the whole chain, however long, becomes a single –CO₂H on the ring. Propylbenzene gives benzoic acid.',
        'No benzylic H (tert-butyl): nothing happens. The starting material comes back.',
        'In a synthesis this turns CH₃ (ortho/para director) into CO₂H (meta director).'
      ]
    },
    lesson: { id: '14', step: 's10' }
  },
  {
    id: 'nitro-reduction', group: 'arene', reagent: 'Fe (or Sn, SnCl₂), H₃O⁺, then HO⁻',
    what: 'Reduces an NO₂ group on a ring to NH₂. This is how you make an aromatic amine.',
    example: { substrate: 'O=[N+]([O-])c1ccccc1', product: 'Nc1ccccc1' },
    facts: { adds: 'H (NO₂ becomes NH₂)', where: 'At the nitro group; the rest of the ring is unchanged', space: 'n.a.', addsKey: ['H'] },
    apply: {
      pattern: 'Show how to make aniline from benzene.',
      steps: [
        'No reagent puts NH₂ on a ring directly. Go through a nitro group.',
        'Step 1: HNO₃, H₂SO₄ turns benzene into nitrobenzene.',
        'Step 2: Fe (or Sn, SnCl₂) with H₃O⁺, then HO⁻, reduces NO₂ to NH₂.',
        'Order matters: there is nothing to reduce until the nitro group is on the ring.'
      ]
    },
    lesson: { id: '13', step: 's11' }
  },
  {
    id: 'side-chain-h2pd', group: 'arene', reagent: 'H₂, Pd/C (1 atm)',
    what: 'Adds H₂ to an ordinary C=C on a side chain. Under these mild conditions the benzene ring is not touched.',
    example: { substrate: 'C=Cc1ccccc1', product: 'CCc1ccccc1' },
    facts: { adds: 'H and H (side-chain C=C becomes C–C)', where: 'On the C=C outside the ring', space: 'n.a.', addsKey: ['H'] },
    apply: {
      pattern: 'Styrene is shaken with H₂ and Pd/C at 1 atm. Draw the product. What would it take to reduce the ring too?',
      steps: [
        'Styrene has two kinds of C=C: an ordinary one on the side chain, and the aromatic ring.',
        'Pd/C at ordinary pressure reduces only the ordinary C=C.',
        'Add H₂ across the side-chain C=C and leave the ring exactly as drawn: ethylbenzene.',
        'The ring itself needs H₂ with Pt (or Rh) at high pressure. Benzene then gives cyclohexane.'
      ]
    },
    lesson: { id: '14', step: 's12' }
  },

  // ------------------------------------------------------------------ alkenes (Lessons 9 and 10)
  {
    id: 'alkene-hx', group: 'alkene', reagent: 'HBr or HCl',
    what: 'Adds H and X across the C=C. H goes to the carbon that already has more H (Markovnikov), so X lands on the carbon with more alkyl groups.',
    example: { substrate: 'CC1=CCCCC1', product: 'CC1(Br)CCCCC1', reagent: 'HBr', note: 'Br ends up on the carbon that holds the CH₃.' },
    facts: { adds: 'H and Br (or Cl)', where: 'Markovnikov: H to the carbon with more H', space: 'either', spaceNote: 'The carbocation is flat, so X can arrive on either face.', addsKey: ['H', 'X'] },
    apply: {
      pattern: 'HBr (in ether) is added to 1-methylcyclohexene. Draw the major product.',
      steps: [
        'Mark the two C=C carbons and count the alkyl groups on each.',
        'H⁺ adds to the carbon with MORE H. That leaves the + on the more substituted carbon (3° is more stable than 2°, 2° than 1°).',
        'Br⁻ bonds to that carbon: Br ends up on the carbon with more alkyl groups.',
        'If both carbons have the same number of alkyl groups (pent-2-ene), expect a mixture of both products.',
        'If the new C–Br carbon is a stereocentre, both enantiomers form (a racemate), because the cation is flat.'
      ]
    },
    lesson: { id: '09', step: 's01' }, mech: 's08'
  },
  {
    id: 'alkene-hydration', group: 'alkene', reagent: 'H₂O, H₂SO₄ (catalyst)',
    what: 'Adds H and OH across the C=C. It follows the same Markovnikov rule as HX; the acid is only a catalyst.',
    example: { substrate: 'CC1=CCCCC1', product: 'CC1(O)CCCCC1', note: 'OH ends up on the carbon that holds the CH₃.' },
    facts: { adds: 'H and OH', where: 'Markovnikov: OH to the carbon with more alkyl groups', space: 'either', spaceNote: 'The carbocation is flat, so water can arrive on either face.', addsKey: ['H', 'OH'] },
    apply: {
      pattern: '1-Methylcyclohexene is shaken with water containing a little sulfuric acid. Draw the product.',
      steps: [
        'Water plus a little strong acid is hydration: H and OH go across the C=C.',
        'H goes to the carbon with more H. OH goes to the carbon with more alkyl groups (Markovnikov).',
        'Here the product is a tertiary alcohol. The acid is a catalyst: it is not in the product.',
        'Equal ends (pent-2-ene) give a mixture of two alcohols. Pent-1-ene gives mainly the 2-alcohol.'
      ]
    },
    lesson: { id: '09', step: 's10' }, mech: 's11'
  },
  {
    id: 'alkene-x2', group: 'alkene', reagent: 'Br₂ or Cl₂ (in CH₂Cl₂)',
    what: 'Adds two halogen atoms across the C=C, on opposite faces (anti), through a bridged bromonium or chloronium ion.',
    example: { substrate: 'C1=CCCCC1', product: 'Br[C@@H]1CCCC[C@H]1Br', reagent: 'Br₂', note: 'trans product, made as a racemate: this is one of the two mirror images.' },
    facts: { adds: 'Br and Br (or Cl and Cl)', where: 'One on each C=C carbon (no Markovnikov question)', space: 'anti', addsKey: ['X'] },
    apply: {
      pattern: 'Cyclopentene is treated with Br₂ in CH₂Cl₂. Draw the product, showing stereochemistry.',
      steps: [
        'Br₂ or Cl₂ in CH₂Cl₂ means anti addition through a halonium ion.',
        'Put one halogen on each C=C carbon.',
        'Draw them on OPPOSITE faces: one wedge, one dash. On a ring that is the trans product.',
        'A product with two stereocentres that is not meso forms as a racemate: say so.',
        'Acyclic check: anti addition of Br₂ to (E)-but-2-ene gives the meso compound; to (Z)-but-2-ene it gives a racemic pair.'
      ]
    },
    lesson: { id: '10', step: 's01' }, mech: 's04'
  },
  {
    id: 'alkene-h2-pd', group: 'alkene', reagent: 'H₂, Pd/C',
    what: 'Adds two H across the C=C and gives the alkane. Both H arrive on the same face of the C=C (syn).',
    example: { substrate: 'CC1=C(C)CCCC1', product: 'C[C@@H]1CCCC[C@@H]1C', note: 'cis product (meso): both CH₃ on the same face.' },
    facts: { adds: 'H and H', where: 'One H on each C=C carbon (no Markovnikov question)', space: 'syn', addsKey: ['H'] },
    apply: {
      pattern: '1,2-Dimethylcyclohexene is stirred with H₂ and Pd/C. Draw the product, showing stereochemistry.',
      steps: [
        'H₂ with Pd/C (or PtO₂) turns C=C into C–C.',
        'Both H come off the metal surface onto the SAME face (syn addition).',
        'On a ring, the two groups that were on the old C=C carbons are pushed to the other face together: they end up cis. Draw both CH₃ wedged (or both dashed).',
        'This product is cis-1,2-dimethylcyclohexane, a meso compound.'
      ]
    },
    lesson: { id: '10', step: 's06' }
  },
  {
    id: 'alkene-kmno4-base', group: 'alkene', reagent: 'KMnO₄, OH⁻, H₂O',
    what: 'Adds two OH across the C=C in one step and gives a diol. Both OH arrive on the same face (syn).',
    example: { substrate: 'C1=CCCCC1', product: 'O[C@@H]1CCCC[C@@H]1O', note: 'cis diol (meso).' },
    facts: { adds: 'OH and OH', where: 'One OH on each C=C carbon', space: 'syn', addsKey: ['OH'] },
    apply: {
      pattern: 'Cyclohexene is treated with KMnO₄ in basic solution. Draw the product, showing stereochemistry. What does (Z)-but-2-ene give?',
      steps: [
        'Basic (OH⁻) KMnO₄ is syn hydroxylation. The purple colour fades and brown MnO₂ forms.',
        'Put one OH on each C=C carbon, on the SAME face.',
        'On a ring: a cis diol. Draw both OH wedged (or both dashed).',
        'Acyclic: a cis alkene gives a meso diol; a trans alkene gives a racemic pair.',
        'Do not mix it up with ACIDIC KMnO₄, which cuts the C=C (next card).'
      ]
    },
    lesson: { id: '10', step: 's12' }
  },
  {
    id: 'alkene-kmno4-acid', group: 'alkene', reagent: 'KMnO₄, H₃O⁺',
    what: 'Cuts the C=C in two. Each carbon becomes C=O: a ketone if it had no H, a carboxylic acid if it had one H, CO₂ if it had two.',
    example: { substrate: 'CC=C(C)C', product: 'CC(C)=O.CC(=O)O', note: 'Two products: acetone (the end with no H) and acetic acid (the end with one H).' },
    facts: { adds: 'O (each end of the old C=C gains O)', where: 'At the C=C: count the H on each carbon', space: 'n.a.', addsKey: ['other'] },
    apply: {
      pattern: '2-Methylbut-2-ene is treated with KMnO₄ in acid. Draw the products.',
      steps: [
        'Acidic KMnO₄ breaks the C=C completely. You get two pieces. A ring alkene opens into one chain with two ends.',
        'Count the H on each C=C carbon. No H: ketone. One H: carboxylic acid, –CO₂H. Two H (=CH₂): CO₂.',
        'Every other carbon stays where it was.',
        'Read the conditions: in BASE the same reagent stops at the cis diol (previous card).'
      ]
    },
    lesson: { id: '10', step: 's13' }
  },
  {
    id: 'alkene-epoxide', group: 'alkene', reagent: 'RCO₃H (a peroxyacid, e.g. mCPBA)',
    what: 'Gives one O to the C=C and makes an epoxide, a three-membered ring with O. The groups on the C=C keep their places.',
    example: { substrate: 'C/C=C/C', product: 'C[C@H]1O[C@@H]1C', note: 'trans epoxide, made as a racemate: this is one of the two mirror images.' },
    facts: { adds: 'O (one atom, bridging both carbons)', where: 'Both C=C carbons', space: 'syn', spaceNote: 'The O is delivered to one face, so a trans alkene gives a trans epoxide.', addsKey: ['other'] },
    apply: {
      pattern: '(E)-But-2-ene reacts with mCPBA. Draw the product, showing stereochemistry.',
      steps: [
        'A peroxyacid (RCO₃H) means epoxidation.',
        'The O adds to both carbons from the same face (syn), so nothing else moves.',
        'Copy the groups as they were: a trans alkene gives a trans epoxide, a cis alkene gives a cis epoxide.',
        'The trans epoxide from (E)-but-2-ene is a racemic pair. The cis epoxide from (Z)-but-2-ene is meso.'
      ]
    },
    lesson: { id: '10', step: 's09' }
  },
  {
    id: 'alkene-epoxide-diol', group: 'alkene', reagent: 'RCO₃H, then H₃O⁺',
    what: 'Epoxidation, then water opens the ring from the back. The net result is two OH on opposite faces (anti): a trans diol.',
    example: { substrate: 'C1=CCCCC1', product: 'O[C@H]1CCCC[C@@H]1O', note: 'trans diol, made as a racemate: this is one of the two mirror images.' },
    facts: { adds: 'OH and OH', where: 'One OH on each C=C carbon', space: 'anti', addsKey: ['OH'] },
    apply: {
      pattern: 'Make trans-cyclohexane-1,2-diol from cyclohexene.',
      steps: [
        'KMnO₄ with OH⁻ would give the CIS diol, so use the two-step route instead.',
        'Step 1: RCO₃H turns the C=C into an epoxide (the O sits on one face).',
        'Step 2: H₃O⁺ and water. Water attacks one carbon from the side OPPOSITE the C–O bond that breaks.',
        'Result: OH on opposite faces (trans). It forms as a racemate.'
      ]
    },
    lesson: { id: '10', step: 's11' }
  },

  // ------------------------------------------------------------------ alkynes (Lesson 12)
  {
    id: 'alkyne-hx-1', group: 'alkyne', reagent: 'HBr or HCl (1 equivalent)',
    what: 'Adds H and X once across the C≡C and stops at an alkene with X on it (a vinylic halide).',
    example: { substrate: 'C#CCCCC', product: 'C=C(Br)CCCC', reagent: 'HBr (1 equiv.)' },
    facts: { adds: 'H and Br (or Cl), one HX', where: 'Markovnikov: H to the carbon that has the H, X to the more substituted carbon', space: 'n.a.', addsKey: ['H', 'X'] },
    apply: {
      pattern: 'Hex-1-yne reacts with one equivalent of HBr. Draw the product.',
      steps: [
        'Count the equivalents. One HX stops at the alkene, a vinylic halide.',
        'H goes to the terminal carbon (the one with the H). Br goes to the more substituted carbon.',
        'Check: Br is on C2 and the C=C is between C1 and C2.'
      ]
    },
    lesson: { id: '12', step: 's05' }, mech: 's07'
  },
  {
    id: 'alkyne-hx-2', group: 'alkyne', reagent: 'HBr or HCl (2 equivalents)',
    what: 'A second HX adds to the vinylic halide and gives a geminal dihalide: both X on the same carbon.',
    example: { substrate: 'C#CCCCC', product: 'CCCCC(C)(Br)Br', reagent: 'HBr (2 equiv.)' },
    facts: { adds: 'H, H and Br, Br (two HX)', where: 'Both X on the same, more substituted, carbon', space: 'n.a.', addsKey: ['H', 'X'] },
    apply: {
      pattern: 'Hex-1-yne is treated with excess HBr (two equivalents). Draw the product.',
      steps: [
        'Two equivalents, or an excess, means it goes twice.',
        'First HX: Markovnikov, H on C1 and Br on C2 (the vinylic halide).',
        'Second HX: H goes to C1 again and the second Br goes to the SAME carbon, C2.',
        'Result: C1 is CH₃ and C2 holds two Br (a gem-dibromide).'
      ]
    },
    lesson: { id: '12', step: 's06' }
  },
  {
    id: 'alkyne-x2-1', group: 'alkyne', reagent: 'Br₂ or Cl₂ (1 equivalent)',
    what: 'Adds X₂ once, anti, and stops at a 1,2-dihaloalkene. The two halogens end up on opposite sides of the new C=C.',
    example: { substrate: 'C#CCCCC', product: 'CCCC/C(Br)=C\\Br', reagent: 'Br₂ (1 equiv.)', note: 'The (E) isomer: the two Br are on opposite sides.' },
    facts: { adds: 'Br and Br (or Cl and Cl), one X₂', where: 'One on each triple-bond carbon', space: 'anti', addsKey: ['X'] },
    apply: {
      pattern: 'Hex-1-yne reacts with 1 equivalent of Br₂ in CH₂Cl₂. Draw the product with its geometry.',
      steps: [
        'One equivalent stops at the alkene.',
        'Anti addition: the two Br end up on opposite sides of the new C=C.',
        'Draw Br on C1 and Br on C2, across the double bond from each other. That is the (E) isomer.',
        'Two equivalents would go on to the tetrabromide (next card).'
      ]
    },
    lesson: { id: '12', step: 's08' }
  },
  {
    id: 'alkyne-x2-2', group: 'alkyne', reagent: 'Br₂ or Cl₂ (2 equivalents)',
    what: 'Adds X₂ twice and gives a tetrahaloalkane: two X on each carbon of the old triple bond.',
    example: { substrate: 'C#CCCCC', product: 'CCCCC(Br)(Br)C(Br)Br', reagent: 'Br₂ (2 equiv.)' },
    facts: { adds: 'Br, Br and Br, Br (two X₂)', where: 'Two on each triple-bond carbon', space: 'n.a.', addsKey: ['X'] },
    apply: {
      pattern: 'Hex-1-yne is treated with two equivalents of Br₂. Draw the product.',
      steps: [
        'Two equivalents means X₂ adds twice.',
        'The first X₂ gives the (E)-dibromoalkene. The second X₂ adds across that C=C.',
        'Each old triple-bond carbon now holds two Br: –CBr₂–CBr₂–.'
      ]
    },
    lesson: { id: '12', step: 's08' }
  },
  {
    id: 'alkyne-hydration', group: 'alkyne', reagent: 'H₂O, H₂SO₄, HgSO₄',
    what: 'Adds H and OH to the triple bond (OH Markovnikov) to make an enol, which flips at once into a ketone.',
    example: { substrate: 'C#CCCCC', product: 'CCCCC(C)=O', note: 'Enol first (C=C–OH), then the ketone. A terminal alkyne gives a methyl ketone.' },
    facts: { adds: 'H and OH, then enol turns into C=O', where: 'Markovnikov: OH on the more substituted carbon, so the C=O ends up there', space: 'n.a.', addsKey: ['H', 'OH'] },
    apply: {
      pattern: 'Hex-1-yne is treated with H₂O, H₂SO₄ and HgSO₄. Draw the product.',
      steps: [
        'Water with acid and Hg²⁺ is hydration of the alkyne.',
        'OH adds to the more substituted carbon (Markovnikov). That gives an enol, C=C–OH.',
        'The enol tautomerises: the OH hydrogen moves and the O becomes C=O. The ketone is the product.',
        'A terminal alkyne gives a methyl ketone. A symmetrical internal alkyne gives one ketone. An unsymmetrical internal alkyne gives a mixture of two.'
      ]
    },
    lesson: { id: '12', step: 's09' }
  },
  {
    id: 'alkyne-lindlar', group: 'alkyne', reagent: 'H₂, Lindlar catalyst',
    what: 'Adds one H₂ and stops at the alkene. Both H arrive on the same face (syn), so you get the cis (Z) alkene.',
    example: { substrate: 'CC#CC', product: 'C/C=C\\C', note: 'The (Z) alkene: both CH₃ on the same side.' },
    facts: { adds: 'H and H, one H₂', where: 'One H on each triple-bond carbon', space: 'syn', addsKey: ['H'] },
    apply: {
      pattern: 'But-2-yne is treated with H₂ and the Lindlar catalyst. Draw the product.',
      steps: [
        'Lindlar means stop at the alkene. (Pd/C would go on to the alkane.)',
        'Syn addition: both H on the same face, so the two alkyl groups end up on the SAME side of the C=C.',
        'Draw the cis alkene and label it (Z).'
      ]
    },
    lesson: { id: '12', step: 's11' }
  },
  {
    id: 'alkyne-h2-pd', group: 'alkyne', reagent: 'H₂ (2 equivalents), Pd/C',
    what: 'Adds two H₂ and goes all the way to the alkane. It does not stop at the alkene.',
    example: { substrate: 'CC#CC', product: 'CCCC' },
    facts: { adds: 'H, H, H, H (two H₂)', where: 'Both triple-bond carbons end up as CH₂', space: 'n.a.', addsKey: ['H'] },
    apply: {
      pattern: 'But-2-yne is treated with excess H₂ over Pd/C. Draw the product.',
      steps: [
        'Pd/C with two equivalents of H₂ reduces C≡C all the way to C–C.',
        'Count the carbons: the chain does not change, only the bonds do.',
        'If the question wants the alkene, you need the Lindlar catalyst instead.'
      ]
    },
    lesson: { id: '12', step: 's11' }
  },
  {
    id: 'alkyne-acetylide', group: 'alkyne', reagent: 'NaNH₂, then R–Br',
    what: 'Builds a longer carbon chain. NaNH₂ removes the terminal alkyne H to make an acetylide anion, which then attacks a methyl or primary alkyl halide.',
    example: { substrate: 'CC#C', product: 'CC#CCC', reagent: 'NaNH₂, then CH₃CH₂Br' },
    facts: { adds: 'A new carbon group, R (new C–C bond)', where: 'On the terminal carbon, the one that had the acidic H', space: 'n.a.', addsKey: ['other'] },
    apply: {
      pattern: 'Show how to make pent-2-yne from propyne.',
      steps: [
        'Only a TERMINAL alkyne (≡C–H) can make an acetylide.',
        'Step 1: NaNH₂. NH₃ has pKa about 36, the alkyne about 25, so NH₂⁻ wins. NaOH is too weak (water pKa 15.7).',
        'Step 2: the alkyl halide. It must be methyl or primary (RCH₂X). Secondary and tertiary halides fail.',
        'If the target can be cut two ways, choose the one where the halide is methyl or primary.'
      ]
    },
    lesson: { id: '12', step: 's14' }, mech: 's15'
  },

  // ------------------------------------------------------------------ dienes (Lesson 11)
  {
    id: 'diene-hx', group: 'diene', reagent: 'HBr or HCl (1 equivalent)',
    what: 'H⁺ adds to an end carbon of the conjugated diene. The allylic cation shares its + over two carbons, so X can bond at either one: 1,2- and 1,4-products. (Short version; the lesson goes deeper.)',
    example: { substrate: 'C=CC=C', product: 'C=CC(C)Br.CC=CCBr', reagent: 'HBr (1 equiv.)', note: '1,2 product: 3-bromobut-1-ene (drawn flat, it forms as a racemate). 1,4 product: 1-bromobut-2-ene.' },
    facts: { adds: 'H and Br (or Cl)', where: '1,2 (neighbouring carbons) and 1,4 (the two ends); H goes on an end carbon', space: 'n.a.', addsKey: ['H', 'X'] },
    apply: {
      pattern: 'Buta-1,3-diene reacts with one equivalent of HBr. Draw all the products.',
      steps: [
        'Spot the conjugated diene, C=C–C=C. Add H⁺ to an END carbon (C1). That gives an allylic cation.',
        'The + is shared by C2 and C4 (two resonance forms). Br⁻ can attack either one.',
        '1,2 product: Br on C2, and the C3=C4 double bond stays. 1,4 product: Br on C4, and the new C=C sits between C2 and C3.',
        'If both routes lead to the same compound (cyclohexa-1,3-diene), there is only one product.'
      ]
    },
    lesson: { id: '11', step: 's11' }, mech: 's13'
  }
];

export const HUB_BY_ID = Object.fromEntries(HUB_CARDS.map((c) => [c.id, c]));
