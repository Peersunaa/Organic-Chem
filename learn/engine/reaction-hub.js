// Reaction hub data: one card per reagent the lessons teach (Lessons 9 to 14), as plain data. The hub screen (#reactions) and, later, the mixed
// predict-the-product drill both read this file, so a fact exists once. No DOM, no RDKit at import time.
//
// Every card has the same parts, in the same order on screen:
//   what      one sentence: what the reagent does.
//   example   { substrate, product, reagent?, note? }: one worked example, drawn on the card. `product` may hold several molecules joined by '.'
//             (ortho and para products, cleavage pieces, 1,2 and 1,4 products). A product with stereocentres carries @ / @@ and / \ marks; a
//             product that forms as a racemate with ONE stereocentre is drawn flat (as the engine does) and `note` says so.
//   facts     { adds, where, space, addsKey, spaceNote? }: three facts. `space` is exactly 'syn' | 'anti' | 'either' | 'n.a.'.
//             `addsKey` lists the filter buttons the card belongs to: 'OH' | 'X' (Br or Cl) | 'H' | 'other' | 'O' (oxidation) | 'ring' (a new ring).
//   apply     { pattern, steps[] }: the question as an exam would phrase it, then numbered steps to answer it.
//   caveman   { what, facts: { adds, where, space }, steps[], note? }: the same card text in terse "caveman" voice (Piece 3). Same step count as apply.steps;
//             `note` rewrites example.note and is present exactly when example.note is. facts.space is kept as is (an enum, not prose).
//   lesson    { id, step }: the lesson step that teaches it (deep link #lesson-ID/step). `mech`: the step of the mechanism, when the lesson has one.
//             `lesson: null` = the midterm needs it but no lesson teaches it: the card is the short version and the screen says so.
//   example2  (optional) a second worked example, drawn under the first (Birch, alcohol oxidation).
//   subgroup  (optional) a sub-header inside the group (the alcohol oxidations sit under Aromatics, 'not in the book').
// tests/hub.mjs checks every card (all fields, real step ids, products against the engines and against Python RDKit).
//
// NOT on the hub: OsO4, halohydrins (Br2/H2O), ozonolysis, Na/NH3 (trans alkenes), kinetic against thermodynamic control.
// Ten cards from workbook B3.1 are on the hub although no lesson teaches them (Peera confirmed they come out on the midterm): Diels-Alder, Clemmensen,
// Birch, alkyne and alkene hydroboration, benzylic bromination, PCC and Cr(VI) oxidation, amines in acid, desulfonation. They have no engine model:
// the drill uses them as fixed-answer questions built from their examples (generators-predict.js, `fixed: true`).

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
  { id: 'other', label: 'Other' },
  { id: 'O', label: 'Oxidation (loses H)' },
  { id: 'ring', label: 'New ring' }
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
    caveman: {
      what: 'One Br replace one H on ring. Substitute, not add. Cl₂, FeCl₃ same.',
      facts: { adds: 'Br for one ring H', where: 'Ring. Six carbons all same.', space: 'n.a.' },
      steps: [
        'FeBr₃, FeCl₃, AlCl₃ plus ring: electrophilic aromatic substitution.',
        'Br⁺ electrophile. FeBr₃ make Br₂ poor.',
        'Swap ONE ring H for Br. Ring stay. No addition.',
        'Group on ring: director cards say ortho/para or meta.'
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
    caveman: {
      what: 'NO₂ on ring. H₂SO₄ turn HNO₃ into NO₂⁺.',
      facts: { adds: 'NO₂ for ring H', where: 'Ring', space: 'n.a.' },
      steps: [
        'HNO₃, H₂SO₄ make NO₂⁺. Electrophile.',
        'ONE ring H to NO₂: nitrobenzene.',
        'Aniline: Fe, H₃O⁺ reduce NO₂.',
        'NO₂ meta director. Second group meta.'
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
    caveman: {
      what: 'SO₃H on ring. SO₃, H₂SO₄: HSO₃⁺ electrophile.',
      facts: { adds: 'SO₃H for ring H', where: 'Ring. S bond to ring C.', space: 'n.a.' },
      steps: [
        'SO₃, H₂SO₄ → HSO₃⁺. Ring hit S.',
        'SO₃H: benzenesulfonic acid.',
        'SO₃H meta director, deactivator. No Friedel–Crafts.'
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
    caveman: {
      what: 'Alkyl on ring. AlCl₃ take Cl off R–Cl, carbocation R⁺. Ring hit.',
      facts: { adds: 'Alkyl R for ring H', where: 'Ring', space: 'n.a.' },
      steps: [
        'Alkyl chloride + AlCl₃: Friedel–Crafts. Electrophile R⁺.',
        'ONE H → R: ethylbenzene.',
        'Cl on saturated C. Aryl, vinylic halide: no carbocation.',
        'Ring has NO₂, C≡N, SO₃H or C=O (COR)? Too unreactive.',
        'Synthesis, second group: Friedel–Crafts FIRST. Ring reactive.'
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
    caveman: {
      what: 'Acyl R–C(=O)– on ring. Aryl ketone. Electrophile acylium RC≡O⁺.',
      facts: { adds: 'Acyl RC=O for ring H', where: 'Ring', space: 'n.a.' },
      steps: [
        'Acetophenone: ring C(=O)CH₃. Reagent CH₃COCl, AlCl₃.',
        'AlCl₃ take Cl⁻: acylium CH₃C≡O⁺',
        'Ring attack, lose H⁺: H now C(=O)CH₃.',
        'Alkylation limits: no NO₂, C≡N, SO₃H, COR on ring.'
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
    caveman: {
      what: 'Group give electrons. Substitution faster. New group ortho, para.',
      facts: { adds: 'New group (NO₂, Br) for H', where: 'Ortho, para to group', space: 'n.a.' },
      steps: [
        'Alkyl, or lone-pair atom (–NH₂, –OH, –OR): activator. Directs ortho/para.',
        'Mark two ortho, one para carbons. Skip two meta.',
        'New group ortho, para. Draw both.',
        'Why: ortho, para attack: one resonance form has + on group carbon. Group carry +.'
      ],
      note: 'Para, ortho form. Draw both.'
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
    caveman: {
      what: 'Halogen odd: deactivating, but ortho and para.',
      facts: { adds: 'New group (NO₂, Br) for H', where: 'Ortho, para to halogen', space: 'n.a.' },
      steps: [
        'Halogen: slower ring, still ortho/para. Only exception to "deactivator means meta".',
        'Cl pull electrons via σ bond (inductive). Ring slower.',
        'Ortho, para: Cl lone pair share + (extra resonance form). Meta cannot.',
        'Draw ortho, para products.'
      ],
      note: 'Slow, but ortho, para.'
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
    caveman: {
      what: 'Groups pull electrons out. Ring much slower. New group meta.',
      facts: { adds: 'New group (Br, NO₂) for H', where: 'Meta to group', space: 'n.a.' },
      steps: [
        'δ+ atom, no lone pair (NO₂, C≡N, SO₃H, C=O): deactivator, meta director.',
        'Number ring: ortho 2,6. meta 3,5. para 4.',
        'New group on meta carbon (1,3). Both meta same product.',
        'No meta activators. No Friedel–Crafts here.'
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
    caveman: {
      what: 'Alkyl chain to –CO₂H on ring. Ring not attacked.',
      facts: { adds: 'O: side-chain C to CO₂H', where: 'Benzylic C, next to ring. Rest of chain lost.', space: 'n.a.' },
      steps: [
        'Benzylic carbon: bonded to ring. Count its H.',
        'Benzylic H: chain become one –CO₂H. Propylbenzene: benzoic acid.',
        'No benzylic H (tert-butyl): no reaction.',
        'Synthesis: CH₃ (ortho/para) to CO₂H (meta).'
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
    caveman: {
      what: 'NO₂ on ring to NH₂. Make aromatic amine.',
      facts: { adds: 'H: NO₂ to NH₂', where: 'Nitro group. Rest of ring same.', space: 'n.a.' },
      steps: [
        'No direct NH₂. Go via nitro.',
        'HNO₃, H₂SO₄ → nitrobenzene.',
        'Fe (Sn, SnCl₂), H₃O⁺, HO⁻: NO₂ to NH₂.',
        'Order matter. No nitro, nothing to reduce.'
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
    caveman: {
      what: 'H₂ add to side-chain C=C. Mild: ring not touched.',
      facts: { adds: 'H, H: side-chain C=C to C–C', where: 'C=C outside ring', space: 'n.a.' },
      steps: [
        'Styrene: side-chain C=C, plus aromatic ring.',
        'Pd/C: ordinary C=C only.',
        'H₂ across side C=C. Ring same: ethylbenzene.',
        'Ring: H₂, Pt/Rh, high pressure: cyclohexane.'
      ]
    },
    lesson: { id: '14', step: 's12' }
  },

  // ------------------------------------------------------------------ aromatics added from workbook B3.1 (not taught in a lesson, or only touched on)
  {
    id: 'clemmensen', group: 'arene', reagent: 'Zn(Hg), HCl, heat (Clemmensen)',
    what: 'Reduces the C=O of an aryl ketone all the way to CH₂. It turns an acylbenzene into an alkylbenzene.',
    example: { substrate: 'CC(=O)c1ccccc1', product: 'CCc1ccccc1', note: 'Acetophenone gives ethylbenzene.' },
    facts: { adds: 'H, H: the C=O becomes CH₂ (the O leaves)', where: 'Only the carbonyl bonded to the ring', space: 'n.a.', addsKey: ['H'] },
    apply: {
      pattern: 'Show how to make propylbenzene from benzene without a carbocation rearrangement.',
      steps: [
        'Friedel–Crafts alkylation with a primary halide rearranges, so CH₃CH₂CH₂Cl would give isopropylbenzene. Go round it.',
        'Step 1: acylate. CH₃CH₂COCl with AlCl₃ puts C(=O)CH₂CH₃ on the ring. An acylium ion does not rearrange.',
        'Step 2: Zn(Hg) with HCl and heat turns that C=O next to the ring into CH₂. Now the chain is straight: propylbenzene.',
        'Wolff–Kishner (H₂NNH₂, KOH, heat) does the same job in base. Use Clemmensen if the molecule survives acid, Wolff–Kishner if it survives base.'
      ]
    },
    caveman: {
      what: 'Aryl ketone C=O to CH₂. Acylbenzene to alkylbenzene.',
      facts: { adds: 'H, H. C=O to CH₂.', where: 'Only carbonyl on ring', space: 'n.a.' },
      steps: [
        'Alkylation rearranges: CH₃CH₂CH₂Cl give isopropylbenzene. Go round.',
        'CH₃CH₂COCl, AlCl₃: ring C(=O)CH₂CH₃. Acylium no rearrange.',
        'Zn(Hg), HCl, heat: ring C=O to CH₂. Chain straight: propylbenzene.',
        'Wolff–Kishner (H₂NNH₂, KOH, heat) in base. Acid-safe: Clemmensen. Else Wolff–Kishner'
      ],
      note: 'Acetophenone→ethylbenzene'
    },
    lesson: null
  },
  {
    id: 'birch', group: 'arene', reagent: 'Na, liquid NH₃, EtOH (Birch)',
    what: 'Adds two H atoms to a benzene ring, on two carbons that are para to each other. The product is a 1,4-cyclohexadiene, not cyclohexane.',
    example: { substrate: 'OC(=O)c1ccccc1', product: 'OC(=O)C1C=CCC=C1', note: 'Benzoic acid gives cyclohexa-2,5-diene-1-carboxylic acid: the CO₂H sits on an sp³ carbon.' },
    example2: { substrate: 'COc1ccccc1', product: 'COC1=CCC=CC1', note: 'Anisole gives 1-methoxycyclohexa-1,4-diene: the OCH₃ stays on a C=C carbon.' },
    facts: { adds: 'H, H: two H atoms, para to each other, making a 1,4-diene', where: 'An electron-withdrawing group (CO₂H, CO₂R) ends up on an sp³ carbon. An electron-donating group (OCH₃, alkyl) stays on an sp² (C=C) carbon', space: 'n.a.', addsKey: ['H'] },
    apply: {
      pattern: 'Benzoic acid, and then anisole, are treated with Na, liquid NH₃ and EtOH. Draw each product.',
      steps: [
        'Na in liquid NH₃ with an alcohol is the Birch reduction. It reduces the ring but leaves two C=C bonds.',
        'Add one H to each of two ring carbons that are para (positions 1 and 4). The other four ring carbons stay sp², as two separate C=C bonds.',
        'Do not draw a conjugated 1,3-diene. The two C=C bonds are apart (1,4).',
        'An electron-withdrawing group (CO₂H, CO₂R) goes on one of the two sp³ carbons.',
        'An electron-donating group (OCH₃, alkyl) goes on an sp² carbon: it stays on a C=C.'
      ]
    },
    caveman: {
      what: 'Two H on ring, carbons para. Product 1,4-cyclohexadiene, not cyclohexane.',
      facts: { adds: 'H, H: para, make 1,4-diene', where: 'Withdrawing (CO₂H, CO₂R): sp³ carbon. Donating (OCH₃, alkyl): sp² (C=C) carbon.', space: 'n.a.' },
      steps: [
        'Na, liquid NH₃, alcohol: Birch. Ring reduced, two C=C left.',
        'One H on each para carbon (1 and 4). Other four stay sp²: two separate C=C.',
        'No 1,3-diene. C=C apart (1,4).',
        'Withdrawing group (CO₂H, CO₂R): on sp³ carbon.',
        'Donating (OCH₃, alkyl): sp² carbon, on C=C.'
      ],
      note: 'cyclohexa-2,5-diene-1-carboxylic acid. CO₂H on sp³.'
    },
    lesson: null
  },
  {
    id: 'benzylic-bromination', group: 'arene', reagent: 'Br₂, hν (light) or NBS, heat',
    what: 'Puts Br on the benzylic carbon, the carbon bonded to the ring. It is a radical reaction, and the benzylic radical is stabilised by resonance with the ring.',
    example: { substrate: 'CCCc1ccccc1', product: 'CCC(Br)c1ccccc1', note: 'Propylbenzene gives (1-bromopropyl)benzene. Drawn flat: the benzylic carbon is a stereocentre, so it forms as a racemate.' },
    facts: { adds: 'Br (replaces one H)', where: 'ONLY the benzylic carbon. No Br goes on the ring (that needs FeBr₃)', space: 'n.a.', addsKey: ['X'], spaceNote: 'A racemate if the benzylic carbon becomes a stereocentre.' },
    apply: {
      pattern: 'Propylbenzene is treated with NBS and heat (or Br₂ and light). Draw the major product. What would Br₂ with FeBr₃ do instead?',
      steps: [
        'Light (hν), or NBS with heat, means a radical reaction. It is not electrophilic substitution.',
        'Find the benzylic carbon: the one bonded to the ring. It needs at least one H.',
        'The benzylic radical is stabilised by resonance with the ring, so Br replaces an H there and nowhere else on the chain.',
        'Br₂ with FeBr₃ is different: it puts Br on the ring, ortho and para to the alkyl group. Light means side chain, FeBr₃ means ring.',
        'If the benzylic carbon becomes a stereocentre, the product is a racemate.'
      ]
    },
    caveman: {
      what: 'Br on benzylic carbon (bonded to ring). Radical. Benzylic radical stabilised by resonance.',
      facts: { adds: 'Br for H', where: 'ONLY benzylic C. Ring Br needs FeBr₃.', space: 'n.a.' },
      steps: [
        'Light (hν) or NBS, heat: radical, not electrophilic.',
        'Benzylic carbon: bonded to ring. Needs one H.',
        'Benzylic radical stabilised by ring resonance. Br replace H there only.',
        'Br₂, FeBr₃: Br on ring, ortho, para. Light: side chain. FeBr₃: ring.',
        'Benzylic carbon stereocentre: racemate.'
      ],
      note: 'Gives (1-bromopropyl)benzene. Drawn flat: stereocentre, racemate.'
    },
    lesson: { id: '14', step: 's10' }
  },
  {
    id: 'amine-in-acid', group: 'arene', reagent: 'HNO₃, H₂SO₄ on a ring with –NH₂, –NHR or –NR₂',
    what: 'In strong acid an amine group is protonated to –NR₂H⁺, which has no lone pair to give to the ring. So it stops being an ortho/para activator and becomes a meta director and a deactivator.',
    example: { substrate: 'CN(C)c1ccc(C)cc1', product: 'CN(C)c1ccc(C)c([N+](=O)[O-])c1', reagent: 'HNO₃, H₂SO₄', note: 'N,N,4-trimethylaniline: the NO₂ goes meta to the nitrogen and ortho to the CH₃.' },
    facts: { adds: 'NO₂ (replaces one ring H)', where: 'In strong acid: meta to the nitrogen. The CH₃ still directs ortho/para, and here both agree', space: 'n.a.', addsKey: ['other'] },
    apply: {
      pattern: 'N,N,4-trimethylaniline is nitrated with HNO₃ and H₂SO₄. Where does the NO₂ go?',
      steps: [
        'Ask: is the medium strongly acidic? HNO₃ with H₂SO₄ is.',
        'If yes, treat –NR₂ as –NR₂H⁺. That group has no lone pair, so it is a meta director and a deactivator.',
        'Combine it with the other group. The CH₃ directs ortho/para. The carbon ortho to the CH₃ is also meta to the nitrogen, so both agree.',
        'Put NO₂ there. A little para product can still form from the small amount of free amine.'
      ]
    },
    caveman: {
      what: 'Strong acid: amine becomes –NR₂H⁺. No lone pair. No longer ortho/para activator. Now meta director, deactivator.',
      facts: { adds: 'NO₂ for ring H', where: 'Strong acid: meta to N. CH₃ ortho/para. Both agree.', space: 'n.a.' },
      steps: [
        'Strong acid? HNO₃, H₂SO₄ yes.',
        'Yes: –NR₂ is –NR₂H⁺. No lone pair. Meta, deactivator.',
        'CH₃ directs ortho/para. Carbon ortho to CH₃ is meta to N. Both agree.',
        'NO₂ there. Little para product from free amine.'
      ],
      note: 'N,N,4-trimethylaniline: NO₂ meta N, ortho CH₃.'
    },
    lesson: { id: '14', step: 's03' }
  },
  {
    id: 'desulfonation', group: 'arene', reagent: 'Dilute H₂SO₄ (or D₂SO₄, D₂O), heat',
    what: 'Takes the SO₃H off the ring and puts H (or D) in its place. It is the reverse of sulfonation.',
    example: { substrate: 'Cc1ccc(S(=O)(=O)O)cc1', product: 'Cc1ccc([2H])cc1', reagent: 'D₂SO₄, D₂O, heat', note: '4-Methylbenzenesulfonic acid gives toluene-4-d. With dilute H₂SO₄ you would get toluene.' },
    facts: { adds: 'H (or D) replaces the SO₃H', where: 'Exactly where the SO₃H was', space: 'n.a.', addsKey: ['H'] },
    apply: {
      pattern: '4-Methylbenzenesulfonic acid is heated with D₂SO₄ in D₂O. Give the product. Why would a chemist put an SO₃H on a ring on purpose?',
      steps: [
        'Sulfonation is reversible. Hot dilute acid (or D₂SO₄ in D₂O) runs it backwards.',
        'Swap the SO₃H for H (or D) on the same ring carbon. Nothing else on the ring moves.',
        'SO₃H can be a temporary blocking group: put it on the para carbon, do the reaction at the ortho carbon, then remove it.',
        'This is a tool for the multi-step aromatic syntheses in Lesson 14.'
      ]
    },
    caveman: {
      what: 'SO₃H off ring, H (or D) in. Reverse of sulfonation.',
      facts: { adds: 'H (or D) for SO₃H', where: 'Where SO₃H was', space: 'n.a.' },
      steps: [
        'Reversible: hot dilute acid, D₂SO₄ in D₂O.',
        'SO₃H to H (or D), same carbon. Rest stay.',
        'SO₃H blocking group: on para carbon, react at ortho, then remove.',
        'Tool: Lesson 14 syntheses.'
      ],
      note: 'Gives toluene-4-d. Dilute H₂SO₄ give toluene.'
    },
    lesson: { id: '13', step: 's09' }
  },
  {
    id: 'oxidation-pcc', group: 'arene', subgroup: 'Side chains and alcohols (not in the book)', reagent: 'PCC, CH₂Cl₂, room temp',
    what: 'Oxidises an alcohol with no water around, so it stops early. A 1° alcohol gives an aldehyde and a 2° alcohol gives a ketone. A 3° alcohol does not react.',
    example: { substrate: 'OC(CCCO)c1ccccc1', product: 'O=CCCC(=O)c1ccccc1', note: '1-Phenylbutane-1,4-diol gives 4-oxo-4-phenylbutanal. The 1° OH becomes CHO and the 2° OH becomes a ketone.' },
    facts: { adds: 'Takes away two H: C–OH becomes C=O', where: '1° alcohol → aldehyde (it stops there). 2° alcohol → ketone. 3° alcohol → no reaction', space: 'n.a.', addsKey: ['O'] },
    apply: {
      pattern: '1-Phenylbutane-1,4-diol is treated with PCC in CH₂Cl₂. Draw the product.',
      steps: [
        'Sort every OH: 1° (on a CH₂), 2° (on a CH) or 3° (no H on that carbon).',
        'PCC takes two H from each 1° or 2° alcohol: C–OH becomes C=O.',
        'A 1° alcohol becomes an aldehyde and stops, because there is no water to carry it on to the acid.',
        'A 2° alcohol becomes a ketone. A 3° alcohol has no H to lose, so nothing happens.',
        'Here: the 1° OH at the chain end gives CHO, and the 2° OH next to the ring gives a ketone.'
      ]
    },
    caveman: {
      what: 'Oxidise alcohol, no water, stop early. 1° gives aldehyde. 2° gives ketone. 3° no reaction.',
      facts: { adds: 'Lose two H: C–OH to C=O', where: '1° → aldehyde, stop. 2° → ketone. 3° → no reaction.', space: 'n.a.' },
      steps: [
        'Sort OH: 1° (CH₂), 2° (CH), 3° (no H).',
        'PCC: 1°, 2° lose two H. C–OH to C=O.',
        '1° to aldehyde, stops. No water to carry on to acid.',
        '2° to ketone. 3° no H to lose: nothing.',
        'Here: end 1° OH to CHO. 2° OH by ring to ketone.'
      ],
      note: '4-oxo-4-phenylbutanal. 1° OH to CHO, 2° to ketone.'
    },
    lesson: null
  },
  {
    id: 'oxidation-cr', group: 'arene', subgroup: 'Side chains and alcohols (not in the book)', reagent: 'Na₂Cr₂O₇, H₂SO₄, H₂O (or CrO₃, H₃O⁺, or KMnO₄)',
    what: 'Oxidises an alcohol with water around, so a 1° alcohol goes all the way to a carboxylic acid. A 2° alcohol gives a ketone. A 3° alcohol does not react.',
    example: { substrate: 'CC(O)c1ccccc1', product: 'CC(=O)c1ccccc1', note: '1-Phenylethanol (a 2° alcohol) gives acetophenone.' },
    example2: { substrate: 'CCCCO', product: 'CCCC(=O)O', note: 'Butan-1-ol (a 1° alcohol) gives butanoic acid, not butanal.' },
    facts: { adds: 'Takes away two H (C–OH becomes C=O). A 1° alcohol also gains an O and ends as CO₂H', where: '1° alcohol → CARBOXYLIC ACID (not the aldehyde). 2° alcohol → ketone. 3° alcohol → no reaction', space: 'n.a.', addsKey: ['O'] },
    apply: {
      pattern: 'Butan-1-ol, and then 1-phenylethanol, are treated with Na₂Cr₂O₇ and H₂SO₄ in water. Draw each product. How is this different from PCC?',
      steps: [
        'Sort the OH: 1°, 2° or 3°.',
        'A 2° alcohol loses two H and becomes a ketone. It stops there.',
        'A 1° alcohol first gives an aldehyde. In water the aldehyde adds H₂O, and Cr(VI) oxidises it again: it ends as a carboxylic acid.',
        'A 3° alcohol has no H on its carbon, so nothing happens.',
        'Compare PCC in CH₂Cl₂ (no water): it stops a 1° alcohol at the aldehyde.'
      ]
    },
    caveman: {
      what: 'Oxidise alcohol, water around. 1° to carboxylic acid. 2° gives ketone. 3° no reaction.',
      facts: { adds: 'Lose two H: C–OH to C=O. 1° also gain O: CO₂H.', where: '1° → CARBOXYLIC ACID, not aldehyde. 2° ketone. 3° none.', space: 'n.a.' },
      steps: [
        'Sort OH: 1°, 2°, 3°.',
        '2° lose two H: ketone. Stop.',
        '1° first aldehyde. Water add H₂O, Cr(VI) oxidise again: carboxylic acid.',
        '3° no H on carbon: nothing.',
        'PCC, CH₂Cl₂, no water: 1° stop at aldehyde.'
      ],
      note: '2° alcohol: acetophenone.'
    },
    lesson: null
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
    caveman: {
      what: 'H and X across C=C. H to carbon with more H. Markovnikov. X to more alkyl.',
      facts: { adds: 'H, Br/Cl', where: 'Markovnikov: H to more H', space: 'either' },
      steps: [
        'Count alkyl on each C=C carbon.',
        'H⁺ to carbon with MORE H. + on more substituted: 3° > 2° > 1°.',
        'Br⁻ go to + carbon. More alkyl.',
        'Same alkyl count (pent-2-ene): mixture of both.',
        'C–Br stereocentre: racemate. Cation flat.'
      ],
      note: 'Br on CH₃ carbon.'
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
    caveman: {
      what: 'H, OH across C=C. Markovnikov like HX. Acid catalyst only.',
      facts: { adds: 'H, OH', where: 'Markovnikov: OH to more alkyl.', space: 'either' },
      steps: [
        'Water, acid: hydration. H, OH across C=C.',
        'H to more H. OH to more alkyl: Markovnikov.',
        'Here tertiary alcohol. Acid catalyst: not in product.',
        'Equal ends (pent-2-ene): mix. Pent-1-ene: 2-alcohol.'
      ],
      note: 'OH on CH₃ carbon.'
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
    caveman: {
      what: 'Two halogens across C=C, anti. Bridged bromonium, chloronium ion.',
      facts: { adds: 'Br, Br (or Cl, Cl)', where: 'One each. No Markovnikov.', space: 'anti' },
      steps: [
        'Br₂, Cl₂, CH₂Cl₂: anti, halonium ion.',
        'One halogen per C=C carbon.',
        'OPPOSITE faces: one wedge, one dash. Ring: trans.',
        'Two stereocentres, not meso: racemate. Say so.',
        'Acyclic: anti Br₂ to (E)-but-2-ene: meso. (Z)-but-2-ene: racemic pair.'
      ],
      note: 'trans, racemate: one of two mirror images.'
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
    caveman: {
      what: 'Two H across C=C, alkane. Both H same face (syn).',
      facts: { adds: 'H, H', where: 'One H each. No Markovnikov.', space: 'syn' },
      steps: [
        'H₂, Pd/C (PtO₂): C=C→C–C.',
        'Both H from metal onto SAME face (syn).',
        'Ring: groups on old C=C pushed to other face together: cis. Both CH₃ wedged (or dashed).',
        'cis-1,2-dimethylcyclohexane. Meso.'
      ],
      note: 'cis, meso. CH₃ same face.'
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
    caveman: {
      what: 'Two OH across C=C, one step. Diol. Same face (syn).',
      facts: { adds: 'OH, OH', where: 'One OH each', space: 'syn' },
      steps: [
        'OH⁻ KMnO₄: syn. Purple fades, brown MnO₂ forms.',
        'One OH each, SAME face.',
        'Ring: cis. Both OH wedged/dashed.',
        'Acyclic: cis alkene meso, trans racemic pair.',
        'Not ACIDIC KMnO₄: cuts C=C (next card).'
      ],
      note: 'cis, meso.'
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
    caveman: {
      what: 'Cut C=C. Each carbon C=O: no H ketone, one H carboxylic acid, two H CO₂.',
      facts: { adds: 'O: each C=C end gain O', where: 'At C=C: count H each carbon', space: 'n.a.' },
      steps: [
        'Acidic KMnO₄ break C=C. Two pieces. Ring opens to one chain.',
        'H count. None: ketone. One: –CO₂H. Two (=CH₂): CO₂.',
        'Other carbons stay.',
        'BASE: stops at cis diol (previous card).'
      ],
      note: 'Acetone (no H end), acetic acid (one H end).'
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
    caveman: {
      what: 'One O to C=C: epoxide, three-membered ring with O. Groups stay.',
      facts: { adds: 'O: one atom, bridge both C', where: 'Both carbons', space: 'syn' },
      steps: [
        'RCO₃H peroxyacid: epoxidation.',
        'O same face (syn). Nothing else moves.',
        'Trans alkene: trans epoxide. Cis: cis epoxide.',
        '(E)-but-2-ene: trans, racemic pair. (Z): cis, meso.'
      ],
      note: 'trans, racemate: one of two mirror images.'
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
    caveman: {
      what: 'Epoxide, water opens from back. Two OH opposite (anti): trans diol.',
      facts: { adds: 'OH, OH', where: 'One OH each', space: 'anti' },
      steps: [
        'KMnO₄, OH⁻ give CIS diol. Use two steps.',
        'Step 1: RCO₃H: epoxide, O on one face.',
        'Step 2: H₃O⁺, water attack OPPOSITE the C–O bond.',
        'OH opposite faces (trans). Racemate.'
      ],
      note: 'trans, racemate: one of two mirror images'
    },
    lesson: { id: '10', step: 's11' }
  },

  {
    id: 'alkene-hydroboration', group: 'alkene', reagent: '1) BH₃ · THF  2) H₂O₂, NaOH',
    what: 'Adds H and OH across a C=C with no carbocation. The OH goes on the carbon with MORE H (anti-Markovnikov), and H and OH add to the same face.',
    example: { substrate: 'CC1=CCCCC1', product: 'C[C@@H]1CCCC[C@H]1O', note: '1-Methylcyclohexene gives trans-2-methylcyclohexanol. Drawn as one of two mirror images: it forms as a racemate.' },
    facts: { adds: 'H and OH', where: 'Anti-Markovnikov: OH on the carbon with MORE H', space: 'syn', addsKey: ['OH', 'H'], spaceNote: 'H and OH add to the same face, so the OH ends up trans to the CH₃ in this ring.' },
    apply: {
      pattern: '1-Methylcyclohexene is treated with BH₃·THF, then H₂O₂ and NaOH. Draw the product with its stereochemistry.',
      steps: [
        'BH₃ adds in one step: B goes on the carbon with more H (the less crowded one) and H goes on the other carbon, both on the same face. That is syn addition.',
        'H₂O₂ with NaOH swaps the B for OH in the same place. The geometry is kept.',
        'So the OH sits on the carbon that had more H: the CH carbon, not the carbon holding the CH₃.',
        'The new H (on the C–CH₃ carbon) and the OH came from the same face. The CH₃ was already there, so the OH ends up trans to the CH₃.',
        'Compare H₂O with H₂SO₄ (Markovnikov): that puts the OH on the more substituted carbon.'
      ]
    },
    caveman: {
      what: 'H, OH across C=C, no carbocation. OH on MORE H carbon: anti-Markovnikov. Same face.',
      facts: { adds: 'H, OH', where: 'Anti-Markovnikov: OH MORE H', space: 'syn' },
      steps: [
        'BH₃ one step: B on more-H (less crowded) carbon, H on other, same face. Syn addition.',
        'H₂O₂, NaOH swap B for OH. Geometry kept.',
        'OH on more-H carbon: CH, not CH₃ carbon.',
        'New H (on C–CH₃) and OH same face. CH₃ already there: OH trans to CH₃.',
        'H₂O, H₂SO₄: Markovnikov, OH on more substituted C.'
      ],
      note: 'trans-2-methylcyclohexanol. One of two mirror images: racemate.'
    },
    lesson: null
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
    caveman: {
      what: 'One H, X across C≡C. Stop: vinylic halide.',
      facts: { adds: 'H, Br/Cl, one HX', where: 'Markovnikov: H to H-carbon, X to other.', space: 'n.a.' },
      steps: [
        'One HX: stop at vinylic halide.',
        'H to terminal carbon (has H). Br to more substituted.',
        'Br on C2. C=C is C1–C2.'
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
    caveman: {
      what: 'Second HX: geminal dihalide. Both X same carbon.',
      facts: { adds: 'H,H,Br,Br: two HX', where: 'Both X, more substituted C', space: 'n.a.' },
      steps: [
        'Two equivalents: goes twice.',
        'First HX Markovnikov: H on C1, Br C2.',
        'Second HX: H on C1, Br on SAME C2.',
        'C1 CH₃, C2 two Br (gem-dibromide)'
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
    caveman: {
      what: 'X₂ once, anti. Stop: 1,2-dihaloalkene. Halogens opposite sides.',
      facts: { adds: 'Br, Br (Cl, Cl). One X₂', where: 'One each triple-bond C', space: 'anti' },
      steps: [
        'One equivalent: alkene stop.',
        'Anti: two Br opposite sides of new C=C.',
        'Br on C1, Br on C2, across C=C. (E) isomer.',
        'Two: tetrabromide (next card).'
      ],
      note: '(E): two Br opposite sides.'
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
    caveman: {
      what: 'X₂ twice. Tetrahaloalkane. Two X per old C≡C carbon.',
      facts: { adds: 'Br,Br,Br,Br: two X₂', where: 'Two each triple-bond C', space: 'n.a.' },
      steps: [
        'Two equivalents: X₂ twice.',
        'First X₂: (E)-dibromoalkene. Second: that C=C.',
        'Each carbon two Br: –CBr₂–CBr₂–.'
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
    caveman: {
      what: 'H, OH on C≡C, OH Markovnikov. Enol flips to ketone.',
      facts: { adds: 'H, OH. Enol to C=O', where: 'Markovnikov: C=O on more substituted C.', space: 'n.a.' },
      steps: [
        'Water, acid, Hg²⁺: hydration.',
        'OH on more substituted C. Markovnikov. Enol.',
        'Enol tautomerises: OH hydrogen moves, O to C=O. Ketone.',
        'Terminal: methyl ketone. Symmetrical internal: one ketone. Unsymmetrical: two.'
      ],
      note: 'Enol (C=C–OH), ketone. Terminal: methyl ketone'
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
    caveman: {
      what: 'One H₂, stop at alkene. Both H same face (syn): cis (Z) alkene.',
      facts: { adds: 'H, H: one H₂', where: 'One H each triple-bond C', space: 'syn' },
      steps: [
        'Lindlar: stop at alkene. Pd/C: alkane.',
        'Syn: both H same face, alkyl groups SAME side of C=C.',
        'Draw cis alkene, label (Z).'
      ],
      note: '(Z): both CH₃ same side.'
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
    caveman: {
      what: 'Two H₂, all way to alkane. No stop at alkene.',
      facts: { adds: 'H,H,H,H: two H₂', where: 'Both carbons end CH₂', space: 'n.a.' },
      steps: [
        'Pd/C, two H₂: C≡C to C–C.',
        'Chain same. Only bonds change.',
        'Want alkene? Use Lindlar catalyst.'
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
    caveman: {
      what: 'Longer chain. NaNH₂ take terminal alkyne H: acetylide. It hit methyl or primary halide.',
      facts: { adds: 'New carbon group R, C–C bond', where: 'Terminal carbon, had acidic H', space: 'n.a.' },
      steps: [
        'Only TERMINAL alkyne (≡C–H).',
        'NaNH₂: NH₃ pKa 36, alkyne 25, NH₂⁻ wins. NaOH weak (water 15.7)',
        'Halide: methyl or primary (RCH₂X). Secondary, tertiary fail.',
        'Target cut two ways: pick methyl or primary halide.'
      ]
    },
    lesson: { id: '12', step: 's14' }, mech: 's15'
  },

  {
    id: 'alkyne-hydroboration', group: 'alkyne', reagent: '1) BH₃ (or B₂H₆, or disiamylborane)  2) H₂O₂, NaOH',
    what: 'Adds H and OH across the triple bond, with the OH on the END carbon. The enol that forms tautomerises, so a terminal alkyne gives an aldehyde.',
    example: { substrate: 'CCCCC#C', product: 'CCCCCC=O', note: 'Hex-1-yne gives hexanal. Compare Hg²⁺ with H₂O, which gives the methyl ketone.' },
    facts: { adds: 'H and OH across the C≡C. The enol then tautomerises to a C=O', where: 'Anti-Markovnikov: OH on the END carbon, so a terminal alkyne gives an ALDEHYDE (an internal alkyne gives a ketone)', space: 'n.a.', addsKey: ['OH', 'H'], spaceNote: 'H and OH add syn, but the enol tautomerises, so nothing is marked.' },
    apply: {
      pattern: 'Hex-1-yne is treated with BH₃, then H₂O₂ and NaOH. Draw the product. How is it different from the Hg²⁺ reaction?',
      steps: [
        'BH₃ adds across the C≡C: B goes on the END carbon (less crowded) and H goes on the other carbon.',
        'H₂O₂ with NaOH swaps the B for OH on the same carbon. That makes an enol, C=C–OH.',
        'The enol tautomerises: H moves from the O to the carbon, and C=C–OH becomes H–C–C=O.',
        'A terminal alkyne gives an aldehyde (OH was on the end carbon). An internal alkyne gives a ketone.',
        'Compare H₂O with HgSO₄ and H₂SO₄: the OH goes on the inner carbon, so a terminal alkyne gives the methyl ketone.'
      ]
    },
    caveman: {
      what: 'H, OH across C≡C, OH on END carbon. Enol tautomerises: terminal alkyne, aldehyde.',
      facts: { adds: 'H, OH on C≡C. Enol to C=O', where: 'Anti-Markovnikov: OH on END. Terminal: ALDEHYDE. Internal: ketone.', space: 'n.a.' },
      steps: [
        'BH₃: B on END carbon (less crowded), H on other.',
        'H₂O₂, NaOH swap B for OH. Enol C=C–OH.',
        'Enol tautomerises: H from O to C. Now H–C–C=O.',
        'Terminal: aldehyde (OH on end carbon). Internal: ketone.',
        'H₂O, HgSO₄, H₂SO₄: OH inner carbon, methyl ketone.'
      ],
      note: 'Hex-1-yne: hexanal. Hg²⁺, H₂O: methyl ketone.'
    },
    lesson: null
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
    caveman: {
      what: 'H⁺ to end carbon. Allylic cation share + over two carbons. X either one: 1,2- and 1,4-products. Short version.',
      facts: { adds: 'H, Br/Cl', where: '1,2 and 1,4. H on end carbon.', space: 'n.a.' },
      steps: [
        'Diene C=C–C=C. H⁺ on END carbon C1: allylic cation.',
        '+ on C2, C4 (resonance). Br⁻ attack either.',
        '1,2: Br on C2, C3=C4 stays. 1,4: Br on C4, new C=C between C2, C3.',
        'Both routes same (cyclohexa-1,3-diene): one product.'
      ],
      note: '1,2: 3-bromobut-1-ene (racemate). 1,4: 1-bromobut-2-ene.'
    },
    lesson: { id: '11', step: 's11' }, mech: 's13'
  },
  {
    id: 'diels-alder', group: 'diene', reagent: 'A conjugated diene + a C=C with an electron-withdrawing group (the dienophile), heat',
    what: 'A diene and a dienophile join to make a new six-membered ring. Two new C–C σ bonds form. The two C=C bonds of the diene become one new C=C, between the old C2 and C3.',
    example: { substrate: 'C=C/C=C/C.C=CC=O', product: 'O=CC1C(C)C=CCC1', reagent: 'heat', note: 'Penta-1,3-diene + acrolein gives 2-methylcyclohex-3-ene-1-carbaldehyde. Drawn flat: the ring has two stereocentres and the products form as racemates.' },
    facts: { adds: 'A new six-membered ring: two new C–C σ bonds and one new C=C (between old C2 and C3)', where: 'Diene C1 and C4 bond to the two dienophile carbons. A 1-substituted diene gives the "1,2" (ortho-like) product. A 2-substituted diene gives the "1,4" (para-like) product', space: 'syn', addsKey: ['ring'], spaceNote: 'Groups that are cis on the dienophile stay cis in the ring.' },
    apply: {
      pattern: 'Penta-1,3-diene reacts with acrolein (CH₂=CH–CHO) on heating. Draw the product.',
      steps: [
        'Spot the pair: a conjugated diene (C=C–C=C) and a C=C that carries an electron-withdrawing group such as C=O. Heat is the only reagent.',
        'Number the diene C1 to C4. The two ends, C1 and C4, form the new bonds.',
        'Bond C1 and C4 to the two carbons of the dienophile C=C. That closes a six-membered ring.',
        'Move the double bonds: the new C=C sits between the old C2 and C3. The dienophile C=C becomes a single bond.',
        'Place the groups. A 1-substituted diene gives the "1,2" product, a 2-substituted diene the "1,4" product. Groups that were cis on the dienophile stay cis.'
      ]
    },
    caveman: {
      what: 'Diene + dienophile: new six-membered ring. Two new C–C σ bonds. Two C=C become one, old C2–C3.',
      facts: { adds: 'New six-membered ring: two C–C σ, one C=C (C2–C3)', where: 'C1, C4 bond dienophile carbons. 1-substituted: "1,2" (ortho-like). 2-substituted: "1,4" (para-like).', space: 'syn' },
      steps: [
        'Diene (C=C–C=C) + C=C with withdrawing group (C=O). Heat only.',
        'Number diene C1–C4. Ends C1, C4 bond.',
        'C1, C4 to dienophile C=C. Six-membered ring closes.',
        'New C=C old C2–C3. Dienophile C=C to single bond.',
        'Groups: 1-substituted diene "1,2", 2-substituted "1,4". Cis on dienophile stay cis.'
      ],
      note: '2-methylcyclohex-3-ene-1-carbaldehyde. Flat: two stereocentres, racemates.'
    },
    lesson: null
  }
];

export const HUB_BY_ID = Object.fromEntries(HUB_CARDS.map((c) => [c.id, c]));
