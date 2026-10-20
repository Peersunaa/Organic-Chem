// The question-type ladder (#master): every kind of question the midterm can ask, in exam-weight order, each with how to recognise it, the
// procedure, what earns each mark, three worked examples (generated from fixed seeds, so every answer is the engine's), unlimited generated practice
// to a streak of 5 first-try answers in a row, and the McMurry Ch 1-6 problems of that shape (numbers only, never book text).
// Pure data. engine/master.js reads it (streaks, progress), master-view.js draws it, tests/master.mjs checks every field.
//
// One type = {
//   id, group (GROUPS id), stage (ships in piece 1..4; LIVE_STAGE gates what the page shows), title, short (chip label), chapter, section (exam section ids
//   from data/mock-blueprint.js, or 'any'), weight (typical marks per question), recognise (one or two sentences: the exam wording), cues[] (what the
//   question LOOKS like), procedure[] (numbered steps), marks[] (what earns each mark), traps[] (optional), sources[] (the generators that make its practice:
//   { gen, skill?, tasks?, settings?, w }; `tasks` pins task families inside the generator, `settings` are the reaction / naming practice settings),
//   seeds[3] (three worked examples: source = seeds[i].src (index into sources), rng = mulberry32(seeds[i].seed)), book[] (problem numbers),
//   lessons[] ({ id, step }), cards[] (reaction hub ids), scenes[] (scene ids) }.
// Seeds are chosen by tools/pick_master_seeds.mjs so that every example is a typed or picked answer with a worked line (widget problems are left to the practice).

export const GROUPS = [
  { id: 'reactions', title: 'Reactions', blurb: 'B3, B6 and A5: the biggest block of marks. Product, reagent, stereo, two steps, what will not work, arrows, intermediates, energy, directors, Hückel.' },
  { id: 'stereo', title: 'Stereochemistry', blurb: 'A2 and A3: R/S, E/Z, how two drawings are related, meso, counting isomers, the mirror image, optical activity, chairs and Newman projections.' },
  { id: 'naming', title: 'Naming', blurb: 'A1 and B1: name it, fix a wrong name, draw from the name, and the substituent spellings.' },
  { id: 'bonding', title: 'Bonding and acids', blurb: 'Chapter 1 questions that turn up inside other parts: Lewis structures and formal charge, hybridization, polarity, pKa, conjugate bases, Lewis acids and bases.' },
  { id: 'structure', title: 'Structure, resonance and dienes', blurb: 'Chapters 2 and 4: functional groups, skeletal and full drawings, resonance forms, which form matters most, 1,2- against 1,4-addition.' }
];

/** Types with stage <= LIVE_STAGE are shown; the rest ship in later pieces (reactions + stereo first, then naming, then bonding, then structure). */
export const LIVE_STAGE = 4;

const M = (n, text) => `${n} mark${n === 1 ? '' : 's'}: ${text}`;

export const TYPES = [
  // ================================================================================================================ REACTIONS
  {
    id: 'predict-hx', group: 'reactions', stage: 1, title: 'Predict the product: HX or water adds to an alkene', short: 'HX / hydration', chapter: 4, section: ['A5', 'B3'], weight: 4,
    recognise: 'An alkene, then HBr, HCl, HI or H₂O with H₂SO₄ (cat.) over the arrow, and the words "major product" or "indicate stereochemistry". Section A5 is always HBr on an alkene whose product has a stereocentre.',
    cues: ['A single C=C drawn skeletal, HBr / HCl / HI or "H₂O, H₂SO₄" above the arrow', 'Often "major product" or "indicate stereochemistry where necessary"', 'A ring alkene with a methyl on the C=C (a Markovnikov trap: the tertiary cation wins)'],
    procedure: ['Find the two C=C carbons and count the carbons each already carries (0, 1, 2 or 3).', 'H goes to the carbon with MORE hydrogens; the cation forms on the carbon with more carbon neighbours (3° > 2° > 1°).', 'The nucleophile (X⁻ or H₂O) bonds to the cation carbon. Hydration ends with a proton loss to give the alcohol.', 'Draw the product with every substituent; if the new C–X carbon is a stereocentre, say the product is a racemic pair (both wedge and dash, or one drawing + "racemic").', 'If both ends are equally substituted, write both products (a mixture).'],
    marks: [M(1, 'the right regiochemistry (X or OH on the more substituted carbon)'), M(1, 'the full product drawn with the right skeleton and nothing missing'), M(1, 'stereochemistry addressed: "racemic" or both enantiomers when a new stereocentre forms; no wedges on a carbon that is not a stereocentre'), M(1, 'one line of why: "the more stable (3°) carbocation forms first"')],
    traps: ['Anti-Markovnikov (X on the less substituted carbon) is the standard distractor; only HBr with peroxides gives it, and peroxides are not on this paper.', 'Water adds as H and OH, not as H and OH₂.'],
    sources: [{ gen: 'predict-product', skill: 'predict-product', settings: { cards: ['alkene-hx', 'alkene-hydration'] }, w: 3 }, { gen: 'markovnikov', tasks: ['product', 'reactant'], w: 1 }],
    seeds: [], book: ['4.1', '4.2', '4.4', '4.5', '4.33', '4.34', '4.40', '4.55'],
    lessons: [{ id: '09', step: 's08' }, { id: '09', step: 's11' }], cards: ['alkene-hx', 'alkene-hydration'], scenes: ['01-alkene-hx', '02-alkene-hydration']
  },
  {
    id: 'predict-x2', group: 'reactions', stage: 1, title: 'Predict the product: Br₂ or Cl₂ adds to an alkene (anti)', short: 'X₂ anti addition', chapter: 4, section: ['B3', 'B6'], weight: 3,
    recognise: 'An alkene with Br₂ or Cl₂ (often "in CH₂Cl₂") over the arrow, usually with "indicate stereochemistry". B6 asks the same with "racemic or single isomer, major and minor".',
    cues: ['Br₂ or Cl₂ with no light and no FeBr₃ (FeBr₃ means an aromatic ring, not an alkene)', 'A ring alkene (cyclohexene, cyclopentene): the answer is the trans-1,2-dihalide', 'An open-chain cis or trans alkene: the answer is a pair of enantiomers or a meso compound'],
    procedure: ['Both halogens add, one to each C=C carbon: a 1,2-dihalide.', 'They add ANTI (opposite faces) through the cyclic bromonium ion: on a ring, draw one Br wedge and one Br dash (trans).', 'Decide what the stereocentres give: an achiral alkene with two new stereocentres gives a racemic pair (trans-1,2-dibromocyclohexane is the (R,R)/(S,S) pair); a cis alkene that gives (R,S) = (S,R) is meso.', 'Write "racemic" or "meso" under the drawing; never a single enantiomer from an achiral start.'],
    marks: [M(1, 'the 1,2-dihalide skeleton'), M(1, 'anti stereochemistry shown with one wedge and one dash (trans on a ring)'), M(1, '"racemic" (or "meso" when it is) written out, with the bromonium ion named as the reason')],
    traps: ['Syn addition (both wedges) is wrong for X₂; syn belongs to H₂, cold KMnO₄ and hydroboration.', 'Br₂ with FeBr₃ on benzene is substitution, not addition.'],
    sources: [{ gen: 'predict-product', skill: 'predict-product', settings: { cards: ['alkene-x2'] }, w: 3 }, { gen: 'stereo-outcome', skill: 'stereo-outcome', settings: { cards: ['alkene-x2'] }, w: 2 }],
    seeds: [], book: ['4.6', '4.7', '4.35', '6.18', '6.19', '6.47'],
    lessons: [{ id: '10', step: 's04' }], cards: ['alkene-x2'], scenes: ['03-alkene-x2']
  },
  {
    id: 'predict-syn', group: 'reactions', stage: 1, title: 'Predict the product: H₂, cold KMnO₄, epoxidation, hydroboration (syn)', short: 'Syn additions', chapter: 4, section: ['B3', 'B6'], weight: 3,
    recognise: 'An alkene with H₂ and Pd/C, cold KMnO₄ with OH⁻, a peroxyacid (RCO₃H, mCPBA), or BH₃·THF then H₂O₂/NaOH. Often "indicate stereochemistry".',
    cues: ['H₂, Pd/C: both H on the same face, the alkene becomes an alkane', 'KMnO₄, OH⁻, cold: two OH on the same face (cis-diol)', 'RCO₃H: a three-membered ring with O (epoxide); with H₃O⁺ afterwards the epoxide opens anti to the trans-diol', 'BH₃·THF then H₂O₂, NaOH: OH on the LESS substituted carbon, H and OH syn'],
    procedure: ['Name the reagent family first (syn group) and what it adds: H/H, OH/OH, O (bridging), H/OH.', 'Add both pieces to the SAME face: on a ring draw both as wedges (cis).', 'Hydroboration is anti-Markovnikov: OH ends on the less substituted carbon, no cation, no rearrangement.', 'Epoxide + H₃O⁺ (or the acid work-up): water opens the ring from the back, so the final diol is trans (anti), unlike cold KMnO₄.', 'Say racemic when two new stereocentres form from an achiral alkene; say meso when the cis product has a mirror plane (cis-1,2-cyclohexanediol is meso).'],
    marks: [M(1, 'the right pieces added (H/H, OH/OH, epoxide O, or H/OH on the right carbons)'), M(1, 'syn shown: both wedges or both dashes (cis) on a ring'), M(1, 'the stereo word: racemic / meso / single compound, with "syn addition, both groups from the same face" as the reason')],
    traps: ['Hot or acidic KMnO₄ cleaves the C=C instead: ketones, acids, CO₂.', 'H₂ with Pd/C does not touch a benzene ring; only Pt at high pressure does.'],
    sources: [{ gen: 'predict-product', skill: 'predict-product', settings: { cards: ['alkene-h2-pd', 'alkene-kmno4-base', 'alkene-epoxide', 'alkene-epoxide-diol', 'alkene-hydroboration'] }, w: 3 }, { gen: 'stereo-outcome', skill: 'stereo-outcome', settings: { cards: ['alkene-h2-pd', 'alkene-kmno4-base', 'alkene-epoxide-diol'] }, w: 2 }],
    seeds: [], book: ['4.8', '4.9', '4.10', '4.35', '4.36', '4.41', '6.19'],
    lessons: [{ id: '10', step: 's06' }, { id: '10', step: 's09' }, { id: '10', step: 's12' }], cards: ['alkene-h2-pd', 'alkene-kmno4-base', 'alkene-epoxide', 'alkene-epoxide-diol', 'alkene-hydroboration'], scenes: ['04-alkene-h2-pd', '05-alkene-epoxide', '06-alkene-kmno4-cold', '07-alkene-hydroboration']
  },
  {
    id: 'predict-oxid', group: 'reactions', stage: 1, title: 'Predict the product: oxidative cleavage and alcohol oxidations', short: 'Oxidations', chapter: 4, section: ['B3'], weight: 3,
    recognise: 'KMnO₄ hot or in acid (H₃O⁺) on an alkene: "what are the products?" Or an alcohol with PCC or Na₂Cr₂O₇ / CrO₃ with H₂SO₄.',
    cues: ['"KMnO₄, H₃O⁺" or "KMnO₄, heat" on a C=C: the bond is cut in two', 'PCC in CH₂Cl₂: a primary alcohol stops at the aldehyde', 'Na₂Cr₂O₇ or CrO₃ with acid: a primary alcohol goes to the carboxylic acid, a secondary alcohol to the ketone'],
    procedure: ['Cut the C=C in the middle; each half keeps its carbon with a C=O.', 'A carbon with two carbon groups (R₂C=) becomes a ketone; a carbon with one H (RCH=) becomes a carboxylic acid; =CH₂ becomes CO₂.', 'For alcohols: count the H on the carbinol carbon. Two H (1°): PCC gives the aldehyde, Cr(VI)/acid gives the acid. One H (2°): ketone with either. No H (3°): no reaction.', 'Draw every fragment; two fragments from one alkene both score.'],
    marks: [M(1, 'the C=C cut and both fragments drawn'), M(1, 'the right oxidation level of each end (ketone / acid / CO₂; aldehyde only with PCC)'), M(1, 'nothing invented: no H on the ketone carbon, no reaction for a tertiary alcohol')],
    sources: [{ gen: 'predict-product', skill: 'predict-product', settings: { cards: ['alkene-kmno4-acid', 'oxidation-pcc', 'oxidation-cr'] }, w: 3 }, { gen: 'alkene-additions-2', tasks: ['trap', 'cleave'], w: 1 }],
    seeds: [], book: ['4.9', '4.10', '4.36', '4.44', '4.58'],
    lessons: [{ id: '10', step: 's12' }], cards: ['alkene-kmno4-acid', 'oxidation-pcc', 'oxidation-cr'], scenes: []
  },
  {
    id: 'predict-alkyne', group: 'reactions', stage: 1, title: 'Predict the product: alkyne reactions', short: 'Alkynes', chapter: 4, section: ['B3'], weight: 3,
    recognise: 'A C≡C with HX (1 or 2 equiv.), Br₂ (1 or 2 equiv.), H₂O with HgSO₄/H₂SO₄, H₂ with Lindlar catalyst, H₂ with Pd/C, BH₃ then H₂O₂, or NaNH₂ then an alkyl halide.',
    cues: ['"1 equiv." or "2 equiv." next to HX or X₂: count how many times the addition happens', 'Lindlar = cis alkene and stop; Pd/C = all the way to the alkane', 'Hg²⁺/H₂O on a terminal alkyne = methyl ketone (through the enol); BH₃ then H₂O₂ = aldehyde', 'NaNH₂ then R–X: the terminal C–H is removed and a new C–C bond forms (alkylation)'],
    procedure: ['Decide the equivalents: one addition gives a substituted alkene, two give the saturated dihalide (both X on the SAME carbon for HX; four X for X₂ twice).', 'HX is Markovnikov: H on the terminal CH, X on the inner carbon; 2 HX gives the geminal dihalide.', 'X₂ once gives the trans (E) dihaloalkene (anti addition).', 'Hydration (Hg²⁺) gives the enol first, which tautomerises to the ketone on the inner carbon; hydroboration gives the aldehyde on the terminal carbon.', 'Lindlar: syn H₂, cis (Z) alkene. Pd/C with excess H₂: the alkane.', 'Acetylide: NaNH₂ takes the terminal H (pKa 25); the carbanion attacks a PRIMARY alkyl halide only.'],
    marks: [M(1, 'the right number of additions (1 or 2 equiv.) and the right carbon for X / OH'), M(1, 'the geometry: (E) for X₂ once, (Z) for Lindlar, no geometry claim where there is none'), M(1, 'the final functional group named right: ketone (not enol), aldehyde, alkane, or the longer alkyne')],
    traps: ['Hydration of an internal unsymmetrical alkyne gives a mixture of two ketones.', 'NaOH is far too weak to make an acetylide (pKa 15.7 against 25).'],
    sources: [{ gen: 'predict-product', skill: 'predict-product', settings: { substrates: ['alkynes'] }, w: 3 }, { gen: 'alkynes', tasks: ['product'], w: 2 }],
    seeds: [], book: ['4.16', '4.17', '4.18', '4.19', '4.20', '4.37', '4.38', '4.43', '4.59'],
    lessons: [{ id: '12', step: 's07' }], cards: ['alkyne-hx-1', 'alkyne-hx-2', 'alkyne-x2-1', 'alkyne-x2-2', 'alkyne-hydration', 'alkyne-lindlar', 'alkyne-h2-pd', 'alkyne-acetylide', 'alkyne-hydroboration'], scenes: ['08-alkyne-hx']
  },
  {
    id: 'predict-eas', group: 'reactions', stage: 1, title: 'Predict the product: electrophilic aromatic substitution', short: 'EAS on a ring', chapter: 5, section: ['B3'], weight: 3,
    recognise: 'A benzene ring (bare or with a group) and Br₂/FeBr₃, Cl₂/FeCl₃, HNO₃/H₂SO₄, SO₃/H₂SO₄, R–Cl/AlCl₃ or RCOCl/AlCl₃. "Give the major product(s)."',
    cues: ['A Lewis acid catalyst (FeBr₃, AlCl₃) or the H₂SO₄ pair: substitution on the ring, the ring survives', 'A group already on the ring means the directors question in disguise: ortho/para or meta', 'A nitro, acyl, C≡N or SO₃H on the ring with R–Cl/AlCl₃: Friedel–Crafts fails (deactivated ring)'],
    procedure: ['Name the electrophile the reagent pair makes: Br⁺, Cl⁺, NO₂⁺, SO₃ (or HSO₃⁺), R⁺, RC≡O⁺.', 'Bare benzene: one H is replaced by the electrophile; the ring keeps its three double bonds.', 'A substituted ring: classify the group (activator or halogen: ortho/para; carbonyl, NO₂, CN, SO₃H, NR₃⁺: meta) and put the new group there; write BOTH ortho and para when they are the answer, para usually major.', 'Check the Friedel–Crafts limits: no alkylation or acylation on a strongly deactivated ring; alkylation can rearrange (use acylation then Clemmensen for a straight chain).', 'Name the product (the arene naming rules) if asked.'],
    marks: [M(1, 'the right group installed and the ring kept aromatic (no addition product)'), M(1, 'the right position(s): ortho + para, or meta, or "no reaction" with the reason when Friedel–Crafts fails'), M(1, 'the electrophile named and one line why that position: "the + is stabilised by the lone pair / alkyl group" or "meta avoids the + next to the withdrawing group"')],
    sources: [{ gen: 'predict-product', skill: 'predict-product', settings: { cards: ['eas-bromination', 'eas-nitration', 'eas-sulfonation', 'fc-alkylation', 'fc-acylation', 'director-activating', 'director-halogen', 'director-meta'] }, w: 3 }, { gen: 'eas-basics', tasks: ['product', 'fc'], w: 1 }, { gen: 'directors', tasks: ['product'], w: 1 }],
    seeds: [], book: ['5.4', '5.5', '5.6', '5.7', '5.11', '5.12', '5.13', '5.30', '5.31', '5.32', '5.33', '5.34', '5.35'],
    lessons: [{ id: '13', step: 's09' }, { id: '14', step: 's10' }], cards: ['eas-bromination', 'eas-nitration', 'eas-sulfonation', 'fc-alkylation', 'fc-acylation', 'director-activating', 'director-halogen', 'director-meta'], scenes: ['12-eas-bromination', '13-eas-nitration', '14-fc-acylation']
  },
  {
    id: 'predict-sidechain', group: 'reactions', stage: 1, title: 'Predict the product: reactions on the side chain and the extra ring reactions', short: 'Side chain + extras', chapter: 5, section: ['B3'], weight: 3,
    recognise: 'An arene with KMnO₄ (hot), H₂/Pd on a vinyl group, NBS or Br₂ with light (hν), Zn(Hg)/HCl, Na/NH₃, Fe/HCl on a nitro group, or H₂O/H₂SO₄ on a sulfonic acid.',
    cues: ['Hot KMnO₄ on an alkyl side chain with a benzylic H: the whole chain becomes CO₂H', 'Br₂ with hν (light) or NBS: bromine goes on the benzylic carbon, the ring is untouched', 'Zn(Hg), HCl (Clemmensen): a ketone next to the ring becomes CH₂', 'Na, NH₃ (Birch): the ring becomes a 1,4-cyclohexadiene', 'Fe or Sn with HCl, then base: NO₂ becomes NH₂'],
    procedure: ['Ask: does the reagent act on the RING (EAS, Birch, nitro reduction) or on the SIDE CHAIN (KMnO₄, hν bromination, Clemmensen, hydrogenation of a vinyl group)?', 'Side-chain KMnO₄ needs at least one benzylic H: a tert-butyl group survives, every other alkyl chain becomes COOH on the ring.', 'Radical bromination (hν / NBS) replaces a benzylic H only; a ring with no benzylic H does nothing.', 'Clemmensen removes the carbonyl O of an aryl ketone completely (C=O → CH₂); Birch gives the 1,4-diene; nitro reduction keeps every other group.', 'Draw the product with the ring intact unless the reagent is Birch or high-pressure H₂/Pt.'],
    marks: [M(1, 'the right site: ring or side chain'), M(1, 'the right change at that site (COOH, benzylic Br, CH₂, NH₂, 1,4-diene)'), M(1, 'nothing extra changed (the ring not reduced, other groups kept)')],
    sources: [{ gen: 'predict-product', skill: 'predict-product', settings: { cards: ['side-chain-kmno4', 'side-chain-h2pd', 'nitro-reduction', 'clemmensen', 'birch', 'benzylic-bromination', 'desulfonation', 'amine-in-acid'] }, w: 3 }, { gen: 'directors', tasks: ['sidechain'], w: 1 }],
    seeds: [], book: ['5.14', '5.15', '5.36', '5.37', '5.38', '5.52'],
    lessons: [{ id: '14', step: 's16' }], cards: ['side-chain-kmno4', 'side-chain-h2pd', 'nitro-reduction', 'clemmensen', 'birch', 'benzylic-bromination', 'desulfonation', 'amine-in-acid'], scenes: []
  },
  {
    id: 'guess-reagent', group: 'reactions', stage: 1, title: 'Which reagent? (starting material and product given)', short: 'Guess the reagent', chapter: 4, section: ['B3'], weight: 3,
    recognise: 'A starting material and a product with a blank over the arrow: "What reagent(s) would you use?" or "Supply the missing reagents."',
    cues: ['An empty arrow, sometimes numbered "1. ___ 2. ___" for a two-stage reagent', 'Compare the two drawings: what was added, removed or replaced, and where', 'Stereo in the product (cis or trans) tells syn from anti'],
    procedure: ['List what changed atom by atom: added H and OH? two Br? a C=O? a group on a ring?', 'Match the change to one reagent family: Markovnikov H/OH = H₂O, H₂SO₄; anti-Markovnikov H/OH = BH₃ then H₂O₂/NaOH; trans dihalide = X₂; cis diol = cold KMnO₄/OH⁻; trans diol = RCO₃H then H₃O⁺; alkane = H₂/Pd; cis alkene from an alkyne = H₂/Lindlar; ring group = the EAS pair.', 'Check the regiochemistry and stereochemistry in the product and reject reagents that would give the other isomer.', 'Write the full reagent with its conditions (catalyst, solvent, "then" steps), not just the element.'],
    marks: [M(1, 'the right reagent family'), M(1, 'the full reagent written out with conditions (FeBr₃, "cold", "then H₂O₂, NaOH", "1 equiv.")'), M(1, 'the regio/stereo clue named: "anti-Markovnikov OH, so hydroboration"')],
    sources: [{ gen: 'guess-reagent', skill: 'guess-reagent', w: 3 }, { gen: 'alkene-additions-2', tasks: ['reagent'], w: 1 }, { gen: 'eas-basics', tasks: ['reagent'], w: 1 }],
    seeds: [], book: ['4.40', '4.41', '4.42', '4.43', '4.44', '5.39', '5.40'],
    lessons: [{ id: '17', step: 's01' }], cards: [], scenes: []
  },
  {
    id: 'stereo-outcome', group: 'reactions', stage: 1, title: 'Stereo outcome: racemic, meso or a single isomer?', short: 'Stereo outcome', chapter: 6, section: ['B6', 'A5'], weight: 4,
    recognise: 'Section B6 wording: "Predict the products and indicate any appropriate stereochemistry: major and minor, racemic or single isomer." Also any addition where the product has one or two new stereocentres.',
    cues: ['"racemic", "meso", "enantiomers", "single isomer" in the question', 'An achiral alkene plus a reagent that adds syn or anti', 'A product with wedges and dashes to fill in'],
    procedure: ['Predict the constitution of the product first (regiochemistry).', 'Count the new stereocentres: 0 (no stereo to show), 1, or 2.', 'One new stereocentre from an achiral start: a racemic pair, always (the two faces of the flat alkene are attacked equally).', 'Two new stereocentres: use the mechanism. Anti (X₂, epoxide opening): a cis alkene gives the racemic threo pair / trans-on-ring pair; a trans alkene gives meso when the two ends are the same. Syn (H₂, cold KMnO₄, hydroboration): a cis alkene with equal ends gives meso; a trans alkene gives the racemic pair.', 'Say "major and minor" only when a Markovnikov choice exists; say "single compound" for meso or for an achiral product.'],
    marks: [M(1, 'the constitution of the product'), M(1, 'the stereocentres drawn with wedges and dashes consistent with syn or anti'), M(1, 'the stereo word: racemic (both enantiomers), meso (one compound), or achiral'), M(1, 'the reason in one line: "anti addition via the bromonium ion", "syn addition on the metal surface", "a flat cation is attacked from either face"')],
    sources: [{ gen: 'stereo-outcome', skill: 'stereo-outcome', w: 3 }, { gen: 'stereo-relationships', tasks: ['br2'], w: 1 }, { gen: 'alkene-additions-2', tasks: ['product'], w: 1 }],
    seeds: [], book: ['6.18', '6.19', '6.47', '6.48', '6.56', '4.35'],
    lessons: [{ id: '16', step: 's12' }, { id: '10', step: 's04' }], cards: ['alkene-x2', 'alkene-h2-pd', 'alkene-kmno4-base'], scenes: ['03-alkene-x2', '04-alkene-h2-pd']
  },
  {
    id: 'two-step', group: 'reactions', stage: 1, title: 'Two steps in a row (or the right order of two steps)', short: 'Two-step', chapter: 5, section: ['B6', 'B3'], weight: 4,
    recognise: 'A starting material with two reagents written as "1. … 2. …" or two arrows in a row, or "how would you prepare X from Y in two steps?" Section B6 pairs a stereo question with a two-step one.',
    cues: ['Numbered reagents 1. and 2., each applied in turn', 'A synthesis from benzene to a disubstituted ring: the ORDER decides the isomer', 'An alkyne made longer then hydrated or reduced'],
    procedure: ['Do step 1 on its own and draw the intermediate in full.', 'Do step 2 on THAT intermediate, not on the starting material.', 'For a ring synthesis, pick the order from the directors: put the group that directs to the wanted position on first (meta product: install the meta director first; ortho/para product: install the o/p director first).', 'Remember what each step forbids next: Friedel–Crafts fails after a nitro or acyl group is on; an acetylide must be made before the alkyl halide is added.', 'Write both arrows with their reagents and the intermediate between them; name the final product if asked.'],
    marks: [M(1, 'the intermediate after step 1 drawn correctly'), M(1, 'step 2 applied to the intermediate with the right regio/stereo result'), M(1, 'the right order when the question asks you to choose it, with the director reason'), M(1, 'the final product complete')],
    sources: [{ gen: 'two-step', skill: 'two-step', w: 3 }, { gen: 'directors', tasks: ['order'], w: 1 }, { gen: 'alkynes', tasks: ['synthesis'], w: 1 }],
    seeds: [], book: ['4.45', '4.46', '4.47', '5.18', '5.19', '5.20', '5.47', '5.48', '5.49', '5.53'],
    lessons: [{ id: '14', step: 's20' }, { id: '12', step: 's16' }], cards: [], scenes: []
  },
  {
    id: 'wont-work', group: 'reactions', stage: 1, title: 'Which one will NOT work (and why)?', short: 'Will not work', chapter: 5, section: ['B3'], weight: 3,
    recognise: '"Which of these reactions fails?", "Explain why no reaction occurs", or a reagent applied to a substrate that cannot react.',
    cues: ['Friedel–Crafts on a ring carrying NO₂, C≡N, SO₃H or a carbonyl group', 'Friedel–Crafts on aniline or with an aryl / vinyl halide', 'NaOH used to deprotonate an alkyne; KMnO₄ on a tert-butyl side chain; a tertiary alcohol with PCC', 'Radical bromination on a ring with no benzylic H'],
    procedure: ['Name the reaction the reagent WANTS to do.', 'Check the substrate against that reaction\'s limits: ring too deactivated? basic nitrogen that ties up AlCl₃? no benzylic H? no acidic H? a halide that cannot form a cation?', 'For an acid–base step compare pKa values: the base works only if its conjugate acid has a higher pKa than the proton being removed (NaNH₂: NH₃ pKa 35 > alkyne 25; NaOH: H₂O 15.7 < 25, fails).', 'Write "no reaction" and the one-line limit; if asked for a fix, give the working alternative (acylate then Clemmensen; protect; use NaNH₂).'],
    marks: [M(1, 'the failing reaction identified'), M(1, 'the specific reason named (deactivated ring, no benzylic H, pKa too low, rearrangement)'), M(1, 'the fix or the correct alternative where asked')],
    sources: [{ gen: 'wont-work', skill: 'wont-work', w: 3 }, { gen: 'eas-basics', tasks: ['fc'], w: 1 }, { gen: 'alkynes', tasks: ['acidity'], w: 1 }],
    seeds: [], book: ['5.16', '5.17', '5.41', '5.42', '4.22', '4.24'],
    lessons: [{ id: '13', step: 's18' }, { id: '12', step: 's13' }], cards: ['fc-alkylation', 'fc-acylation', 'alkyne-acetylide'], scenes: []
  },
  {
    id: 'mechanism-arrows', group: 'reactions', stage: 1, title: 'Draw the mechanism with curved arrows (HX addition, EAS)', short: 'Curved arrows', chapter: 3, section: ['B3', 'B4'], weight: 3,
    recognise: '"Show the mechanism", "use curved arrows", "draw the intermediate" for an alkene + HX or an arene + E⁺. B4 also asks for the arrows of a resonance step.',
    cues: ['The word mechanism or arrows, or an intermediate (carbocation) to draw', 'A two-step picture: π bond attacks, then the nucleophile adds', 'EAS: three stages, electrophile formed, ring attacks, a base removes H⁺'],
    procedure: ['Every arrow starts at ELECTRONS (a π bond or a lone pair) and points to where they go (an atom, or the space between two atoms for a new bond). Never from an H or from a + charge.', 'HX addition, step 1: the π bond arrow goes to the H of H–X; a second arrow takes the H–X bond pair onto X. The cation forms on the carbon that did NOT get the H (the more substituted one).', 'Step 2: a lone pair on X⁻ makes the C–X bond at the cation.', 'EAS: (a) make E⁺ with the catalyst (Br–Br lone pair to FeBr₃, then the Br–Br bond pair to the other Br), (b) one ring π bond attacks E⁺ to give the sigma complex (draw its three resonance forms when asked), (c) a base takes the H on the sp³ carbon and its C–H bond pair rebuilds the ring π bond.', 'Write charges on every intermediate and keep them balanced from step to step.'],
    marks: [M(1, 'arrows that start at electrons and end at the right place, one per bond made or broken'), M(1, 'the intermediate drawn with its + charge on the right atom'), M(1, 'the second step (nucleophile adds / H⁺ lost) completing the product, with the regiochemistry reason')],
    sources: [{ gen: 'mechanism-basics', tasks: ['hx1', 'hx2', 'propene1', 'propene2'], w: 2 }, { gen: 'markovnikov', tasks: ['arrows'], w: 2 }, { gen: 'eas-basics', tasks: ['electrophile'], w: 1 }],
    seeds: [], book: ['3.12', '3.13', '3.14', '3.15', '3.16', '3.56', '3.57', '5.8', '5.9', '5.43', '5.44', '5.45', '5.46'],
    lessons: [{ id: '08', step: 's13' }, { id: '09', step: 's08' }, { id: '13', step: 's12' }], cards: ['alkene-hx', 'eas-bromination'], scenes: ['17-hcl-ethylene', '18-arrow-grammar', '19-carbocation', '12-eas-bromination']
  },
  {
    id: 'intermediate-why', group: 'reactions', stage: 1, title: 'Name the intermediate and say why it forms there', short: 'Intermediate + why', chapter: 4, section: ['B3', 'B4'], weight: 3,
    recognise: '"Draw the carbocation intermediate", "which carbocation is more stable and why", "rank these carbocations", "what is the electrophile?"',
    cues: ['Several carbocations to rank', 'A reaction where two cations are possible and you must pick one', 'An EAS reagent pair and the question "what attacks the ring?"'],
    procedure: ['Count the carbon neighbours of the C⁺: 3° (three) > 2° > 1° > methyl. More alkyl groups donate electron density (inductive effect, hyperconjugation).', 'Resonance beats alkyl count: allylic and benzylic cations are stabilised by delocalisation and rank with or above 3°.', 'In an addition, the proton goes to the end that leaves the MORE stable cation; that cation is the intermediate to draw.', 'For EAS name the electrophile the catalyst makes (Br⁺ from Br₂/FeBr₃, NO₂⁺ from HNO₃/H₂SO₄, RC≡O⁺ from RCOCl/AlCl₃) and draw the sigma complex with its + delocalised over the ortho and para carbons.', 'Write the why in one line with the class word (tertiary, allylic, benzylic) and the effect (inductive / hyperconjugation / resonance).'],
    marks: [M(1, 'the intermediate drawn with the + on the right carbon'), M(1, 'its class named (3°, 2°, allylic, benzylic) or the electrophile named'), M(1, 'the reason: alkyl groups donate, or the charge is delocalised by resonance')],
    sources: [{ gen: 'markovnikov', tasks: ['rank'], w: 2 }, { gen: 'eas-basics', tasks: ['electrophile'], w: 1 }, { gen: 'mechanism-basics', tasks: ['nucelec'], w: 1 }],
    seeds: [], book: ['4.3', '4.12', '4.56', '4.57', '3.22', '3.23', '5.8', '5.9'],
    lessons: [{ id: '09', step: 's15' }, { id: '08', step: 's18' }, { id: '13', step: 's07' }], cards: ['alkene-hx', 'eas-nitration'], scenes: ['19-carbocation']
  },
  {
    id: 'energy-diagram', group: 'reactions', stage: 1, title: 'Read or draw an energy diagram', short: 'Energy diagram', chapter: 3, section: ['B3'], weight: 2,
    recognise: '"Sketch the energy diagram", "label the transition states and intermediates", "which step is rate-determining?", "is the reaction exothermic?", "what is Eact?"',
    cues: ['A curve with hills (transition states) and valleys (intermediates) between reactants and products', 'Numbers in kJ/mol to subtract', 'A two-step reaction (HX addition): two hills, one valley'],
    procedure: ['Reactants on the left, products on the right; a hill top is a transition state (TS), a valley between hills is an intermediate.', 'Eact of a step = TS energy minus the energy of the level that step starts from (reactant or the intermediate), never minus the products.', 'ΔH = products minus reactants: negative is exothermic (products lower), positive is endothermic.', 'The rate-determining step has the HIGHEST transition state (the biggest hill measured from the start). For HX addition it is step 1, forming the cation.', 'Count intermediates = number of valleys; count steps = number of hills. A catalyst lowers the TS and leaves ΔH unchanged.'],
    marks: [M(1, 'TS and intermediates placed and labelled right (hill vs valley)'), M(1, 'the number asked for computed from the right pair of levels, with its sign'), M(1, 'the words: rate-determining = highest TS; exothermic = products lower')],
    sources: [{ gen: 'mechanism-basics', tasks: ['rds', 'dh', 'eact', 'sign', 'count'], w: 3 }, { gen: 'mechanism-basics', tasks: ['classify'], w: 1 }],
    seeds: [], book: ['3.17', '3.18', '3.19', '3.46', '3.47', '3.48', '3.49', '3.50', '3.51', '3.58'],
    lessons: [{ id: '08', step: 's21' }], cards: [], scenes: []
  },
  {
    id: 'directors', group: 'reactions', stage: 1, title: 'Directors: where does the next group go, and why?', short: 'Directors + why', chapter: 5, section: ['B4'], weight: 3,
    recognise: 'B4 wording: "use resonance and directing effects to decide where the electrophile attacks and why the ring is more or less reactive." Also "classify the substituent", "draw the resonance forms of the intermediate for ortho attack".',
    cues: ['A substituted benzene and the words ortho, meta, para, activating, deactivating', '"Explain with resonance structures"', 'Two groups on the ring: which one decides?'],
    procedure: ['Classify the group: lone pair on the atom attached to the ring (OH, OR, NH₂, NHCOR) or an alkyl group = activating, ortho/para. Halogen = deactivating but ortho/para. C=O, NO₂, C≡N, SO₃H, CF₃, NR₃⁺ = deactivating, meta.', 'Why: draw the sigma complex for ortho or para attack. With an o/p director the + lands on the carbon bearing the group and the lone pair (or alkyl group) stabilises it: an extra (fourth) resonance form. With a meta director, ortho/para attack would put the + next to the withdrawing group, so meta is the least bad.', 'Reactivity: donors raise the electron density (faster than benzene); withdrawers and halogens lower it (slower).', 'Two groups: the stronger activator wins; two that agree reinforce; the position between two groups is too crowded.', 'Draw the product(s): ortho and para both, or meta only, and say which is major (para, for size).'],
    marks: [M(1, 'the group classified (activating / deactivating, o,p / m)'), M(1, 'the resonance forms of the sigma complex, including the extra form that carries the + onto the heteroatom or shows the + next to the withdrawing group'), M(1, 'the position(s) and the reactivity statement in one line')],
    sources: [{ gen: 'directors', tasks: ['classify', 'position', 'product'], w: 3 }, { gen: 'eas-basics', tasks: ['tap'], w: 1 }],
    seeds: [], book: ['5.11', '5.12', '5.13', '5.32', '5.33', '5.34', '5.50', '5.51'],
    lessons: [{ id: '14', step: 's04' }, { id: '14', step: 's08' }], cards: ['director-activating', 'director-halogen', 'director-meta'], scenes: ['15-directors']
  },
  {
    id: 'huckel', group: 'reactions', stage: 1, title: 'Hückel\'s rule: aromatic, anti-aromatic or not?', short: 'Hückel', chapter: 5, section: ['B2'], weight: 2,
    recognise: 'B2 wording: "count the π electrons of each ring and decide whether it is aromatic, anti-aromatic or not aromatic." Rings with charges, N, O or S, and five- or seven-membered rings are the usual set.',
    cues: ['A ring with a + or − charge, or an N–H / O / S in the ring', 'Several small rings side by side to sort', '"How many π electrons?"'],
    procedure: ['Three tests, all needed for aromatic: cyclic, fully conjugated (every ring atom sp² with a p orbital), and planar.', 'Count the π electrons: 2 per C=C or C=N in the ring, 2 for a lone pair that sits IN the ring p system (pyrrole N–H, furan O gives one pair, thiophene S), 2 for a − charge in a p orbital, 0 for a + (empty p orbital). A pyridine-type N keeps its lone pair in the plane: it does not count.', '4n + 2 (2, 6, 10) = aromatic. 4n (4, 8) with a planar conjugated ring = anti-aromatic. A ring with an sp³ carbon breaking the conjugation = not aromatic (cyclopentadiene, cycloheptatriene).', 'Cyclooctatetraene is a tub, not planar: not aromatic (not anti-aromatic).'],
    marks: [M(1, 'the π-electron count with the rule for lone pairs and charges applied right'), M(1, 'the verdict with the reason: "6 π, cyclic, planar, conjugated: aromatic" or "sp³ carbon breaks conjugation: not aromatic"')],
    sources: [{ gen: 'huckel', w: 1 }],
    seeds: [], book: ['5.10', '5.54', '5.55', '5.56'],
    lessons: [{ id: '13', step: 's04' }], cards: [], scenes: []
  },

  // ================================================================================================================ STEREO
  {
    id: 'assign-rs', group: 'stereo', stage: 1, title: 'Assign R or S', short: 'R / S', chapter: 6, section: ['A2', 'A1'], weight: 2,
    recognise: '"Assign R or S to each chirality centre", or a name that needs (R)/(S) in front. Wedge/dash drawings, sometimes a Fischer projection.',
    cues: ['A carbon with four different groups, one on a wedge and one on a dash', 'A star or an asterisk on the stereocentre', '"Label each stereocentre"'],
    procedure: ['Rank the four groups by atomic number of the atom attached (Br > Cl > O > N > C > H). Tie: go one atom out and compare the sets of three; a double bond counts twice (C=O is (O, O, C)).', 'Find group 4 (usually H). If it is on a DASH (away), read 1 → 2 → 3 directly: clockwise = R, counterclockwise = S.', 'If group 4 is on a WEDGE (toward you), read and then REVERSE the answer.', 'If group 4 is on a plain bond, swap it with the dashed group, read, and reverse once (one swap flips the answer).', 'Fischer: vertical bonds point away. H on a horizontal bond: read 1 → 2 → 3 and reverse. H vertical: read directly.'],
    marks: [M(1, 'the priorities written on the four groups (1–4) with the right tie-break'), M(1, 'the letter, with "lowest priority away / toward you, so reversed" shown')],
    traps: ['Ranking by size instead of atomic number (tert-butyl is NOT above OH).', 'Forgetting to reverse when H points toward you.'],
    sources: [{ gen: 'rs', tasks: ['rs'], w: 3 }, { gen: 'fischer', tasks: ['rs-h', 'rs-v'], w: 1 }, { gen: 'rs', tasks: ['name'], w: 1 }],
    seeds: [], book: ['6.6', '6.7', '6.8', '6.9', '6.10', '6.11', '6.36', '6.37', '6.38', '6.39', '6.40', '6.41', '6.42'],
    lessons: [{ id: '15', step: 's10' }, { id: '16', step: 's21' }], cards: [], scenes: []
  },
  {
    id: 'assign-ez', group: 'stereo', stage: 1, title: 'Assign E or Z (and cis/trans)', short: 'E / Z', chapter: 3, section: ['A1', 'A2'], weight: 2,
    recognise: '"Is this alkene E or Z?", "name the compound including E/Z", "can this alkene show cis–trans isomerism?"',
    cues: ['A C=C with two different groups on EACH carbon', 'A name to write with (E) or (Z) in front', 'Two drawings that differ only in which side the groups are on'],
    procedure: ['Check it CAN have geometry: each C=C carbon must carry two different groups. A =CH₂ or =C(CH₃)₂ end means no E/Z.', 'On each carbon rank the two groups by atomic number (then the next atoms out): higher priority wins.', 'Higher-priority groups on the SAME side = Z (zusammen); on OPPOSITE sides = E (entgegen).', 'Cis/trans is for the two identical or chain groups; E/Z is the rule that always works. Write the letter in parentheses with the locant: (E)-but-2-ene, (2Z,4E)-….'],
    marks: [M(1, 'the priorities on each carbon'), M(1, 'the letter, and the statement "no E/Z" when one carbon has two identical groups')],
    sources: [{ gen: 'alkene-names', tasks: ['ez', 'cistrans'], w: 3 }, { gen: 'alkene-names', tasks: ['name'], w: 1 }],
    seeds: [], book: ['3.6', '3.7', '3.8', '3.9', '3.10', '3.35', '3.36', '3.37', '3.38', '3.39', '3.40', '3.41', '3.42', '3.43', '3.44', '3.45'],
    lessons: [{ id: '07', step: 's12' }], cards: [], scenes: []
  },
  {
    id: 'relationship', group: 'stereo', stage: 1, title: 'How are these two related? (identical, enantiomers, diastereomers)', short: 'Relationship', chapter: 6, section: ['A2'], weight: 2,
    recognise: '"How are the following pairs related?", "same compound, enantiomers, diastereomers or constitutional isomers?" The pair can be wedge drawings, Fischer or Newman projections, or one of each.',
    cues: ['Two drawings side by side, often rotated or flipped', 'A Fischer projection beside a wedge drawing', 'Rings drawn with cis/trans substituents'],
    procedure: ['Same molecular formula and same connectivity? If the connectivity differs: constitutional isomers.', 'Assign R/S at EVERY stereocentre of both (or cis/trans on a ring).', 'All centres the same: identical (one may be rotated). ALL centres opposite: enantiomers. SOME opposite, some the same: diastereomers.', 'One stereocentre only: same letter = identical, opposite = enantiomers (diastereomers need two or more centres, or a ring/alkene cis–trans pair).', 'Check for meso: if a compound equals its own mirror image (R,S with identical ends), its "enantiomer" drawing is the same compound.', 'Fischer tricks: a 180° turn keeps the molecule; a 90° turn or one swap of two groups makes the enantiomer; two swaps bring it back.'],
    marks: [M(1, 'R/S (or cis/trans) assigned on both drawings'), M(1, 'the relationship word with the rule: all opposite = enantiomers, some = diastereomers')],
    sources: [{ gen: 'stereo-relationships', tasks: ['rel'], w: 3 }, { gen: 'stereo-projections', w: 2 }, { gen: 'fischer', tasks: ['manip'], w: 1 }],
    seeds: [], book: ['6.12', '6.13', '6.14', '6.15', '6.20', '6.21', '6.43', '6.44', '6.45', '6.46', '6.49', '6.50', '6.51', '6.53'],
    lessons: [{ id: '16', step: 's05' }, { id: '16', step: 's24' }], cards: [], scenes: []
  },
  {
    id: 'meso-or-chiral', group: 'stereo', stage: 1, title: 'Chiral, achiral or meso? Find the chirality centres', short: 'Meso / chiral', chapter: 6, section: ['A2'], weight: 2,
    recognise: '"Which of these are chiral?", "mark every chirality centre", "is this compound meso?", "is this a meso compound or one of a pair of enantiomers?"',
    cues: ['A molecule with two identical halves', 'Asterisks to add, or "how many stereocentres?"', 'Rings with two identical substituents cis or trans'],
    procedure: ['A chirality centre is an sp³ carbon with four DIFFERENT groups: not CH₂, not CH₃, not a C=C or C=O carbon, not a ring carbon whose two ring paths are identical.', 'Mark every centre; a molecule with no centre is achiral (apart from rare cases not on this paper).', 'With two or more centres look for an internal mirror plane (or a centre of symmetry) in some conformation: identical substituents at the two ends and opposite configurations (R,S) = meso = achiral.', 'No mirror plane (R,R or S,S) = chiral, exists as a pair of enantiomers.', 'Ring check: cis-1,2-disubstituted with identical groups is meso; trans is chiral. 1,4-disubstituted rings have no chirality centres at all (cis/trans only).'],
    marks: [M(1, 'every chirality centre marked, and only those'), M(1, 'chiral / achiral / meso with the mirror-plane reason')],
    sources: [{ gen: 'stereo-relationships', tasks: ['meso'], w: 2 }, { gen: 'rs', tasks: ['centers'], w: 2 }],
    seeds: [], book: ['6.1', '6.2', '6.3', '6.16', '6.17', '6.26', '6.27', '6.28', '6.29', '6.30', '6.31', '6.32', '6.52'],
    lessons: [{ id: '15', step: 's04' }, { id: '16', step: 's09' }], cards: [], scenes: []
  },
  {
    id: 'count-stereoisomers', group: 'stereo', stage: 1, title: 'How many stereoisomers?', short: 'Count isomers', chapter: 6, section: ['A2'], weight: 2,
    recognise: '"How many stereoisomers are possible for…?", "draw all the stereoisomers and label the pairs."',
    cues: ['A compound named without any (R)/(S)', 'Two or three stereocentres', 'The word "possible"'],
    procedure: ['Count the chirality centres, n (plus any C=C or ring that can be cis/trans: each counts like a centre).', 'Maximum = 2ⁿ.', 'Subtract for meso: if the two ends are identical, the (R,S) and (S,R) drawings are one compound, so 2 centres give 3 stereoisomers (one meso + one pair of enantiomers), not 4.', 'Group them: enantiomer pairs (all centres flipped) and diastereomers (anything else). Name each with (2R,3S)-style prefixes if asked.'],
    marks: [M(1, 'n counted and 2ⁿ written'), M(1, 'the meso correction applied (or stated not to apply), with the final number')],
    sources: [{ gen: 'stereo-relationships', tasks: ['count'], w: 1 }],
    seeds: [], book: ['6.12', '6.13', '6.14', '6.15', '6.43', '6.44', '6.54', '6.57'],
    lessons: [{ id: '16', step: 's03' }], cards: [], scenes: []
  },
  {
    id: 'draw-enantiomer', group: 'stereo', stage: 1, title: 'Draw or name the enantiomer (mirror image)', short: 'Enantiomer', chapter: 6, section: ['A2'], weight: 2,
    recognise: '"Draw the enantiomer of…", "name the mirror image", "give the name of the (S) isomer".',
    cues: ['One drawing with wedges, and a blank mirror next to it', 'A name with (R) that you must turn into (S)'],
    procedure: ['Find every chirality centre.', 'Swap wedge and dash at EVERY centre (or reflect the whole drawing through a vertical mirror line).', 'In the name, change every R to S and every S to R; the rest of the name (locants, groups) stays the same.', 'Check: the mirror image of a meso compound is itself; the mirror image of a one-centre molecule swaps the single letter.'],
    marks: [M(1, 'every centre inverted, nothing else changed'), M(1, 'the name with all letters flipped (locants unchanged)')],
    sources: [{ gen: 'rs', tasks: ['mirror', 'name'], w: 1 }],
    seeds: [], book: ['6.4', '6.5', '6.36', '6.37', '6.38', '6.55'],
    lessons: [{ id: '15', step: 's07' }], cards: [], scenes: []
  },
  {
    id: 'optical-activity', group: 'stereo', stage: 1, title: 'Optical activity: specific rotation, racemates and resolution', short: 'Optical activity', chapter: 6, section: ['A2'], weight: 2,
    recognise: '"Calculate the specific rotation", "what rotation would a 50:50 mixture show?", "the (+) enantiomer has [α]D = +12°; what is [α]D of the (−) form?", "how could the racemate be resolved?"',
    cues: ['Numbers: an observed rotation α, a path length in dm, a concentration in g/mL', 'The words racemic, resolution, meso, optically inactive', '(+)/(−) or d/l labels'],
    procedure: ['[α]D = α (observed, degrees) ÷ (l in dm × c in g/mL). Convert cm to dm (10 cm = 1 dm) and g per mL from the solution volume.', 'Enantiomers rotate by equal and OPPOSITE amounts: the (−) form has the same magnitude with the sign flipped.', 'A racemic (50:50) mixture rotates 0°; a meso compound rotates 0° on its own (it is achiral).', 'R/S and (+)/(−) are unrelated: the sign is measured, the letter is read from the structure.', 'Resolution: react the racemic acid (or base) with a single enantiomer of a chiral base (or acid) to make diastereomeric salts, which have different solubilities; separate them, then free each enantiomer with acid or base.'],
    marks: [M(1, 'the formula with units converted (dm, g/mL) and the number'), M(1, 'the sign reasoning: enantiomer opposite, racemate zero, meso zero'), M(1, 'resolution explained through diastereomeric salts when asked')],
    sources: [{ gen: 'rs', tasks: ['alpha', 'sign'], w: 2 }, { gen: 'stereo-relationships', tasks: ['rotation'], w: 1 }],
    seeds: [], book: ['6.4', '6.5', '6.33', '6.34', '6.35', '6.18', '6.48'],
    lessons: [{ id: '15', step: 's20' }, { id: '16', step: 's15' }], cards: [], scenes: []
  },
  {
    id: 'chairs', group: 'stereo', stage: 1, title: 'Chairs: draw the more stable conformation and say why', short: 'Chairs', chapter: 2, section: ['A3'], weight: 3,
    recognise: 'A3 wording: "Draw the two chair conformations and decide which is more stable", "can both groups be equatorial?", "is this cis or trans?", "estimate the energy difference".',
    cues: ['A cyclohexane with one or two substituents, flat with wedges or already as a chair', 'The words axial, equatorial, ring flip, 1,3-diaxial', 'A table of A-values or energies in kJ/mol to use'],
    procedure: ['Draw the chair; at each carbon one bond is axial (straight up or down, alternating) and one equatorial (out, roughly parallel to the ring bond one away).', 'Relationship rule: for 1,2 and 1,4, trans puts both groups equatorial (e,e) in one chair; for 1,3, cis does. The other isomer is always a,e in both chairs.', 'A ring flip turns every axial into equatorial and back; up/down (cis/trans) never changes.', 'The more stable chair has the LARGER group equatorial (tert-butyl always; then isopropyl, ethyl ≈ methyl, OH, Cl); an axial group suffers 1,3-diaxial strain with the two axial H on the same side.', 'Energy: add the A-values (strain) of every axial group; the difference between the two chairs is the number asked for.'],
    marks: [M(1, 'both chairs drawn with correct axial/equatorial positions after the flip'), M(1, 'the more stable chair picked with "larger group equatorial / fewer 1,3-diaxial interactions"'), M(1, 'the cis/trans and e,e / a,e reasoning or the energy difference computed from the A-values')],
    sources: [{ gen: 'chairs', tasks: ['bothEq', 'whichEq', 'cisTrans'], w: 1 }],
    seeds: [], book: ['2.20', '2.21', '2.22', '2.23', '2.24', '2.25', '2.26', '2.27', '2.28', '2.52', '2.53', '2.54', '2.55', '2.56', '2.57', '2.58', '2.59', '2.60', '2.61'],
    lessons: [{ id: '06', step: 's10' }], cards: [], scenes: []
  },
  {
    id: 'newman', group: 'stereo', stage: 1, title: 'Newman projections and conformational energy', short: 'Newman', chapter: 2, section: ['A3'], weight: 3,
    recognise: '"Draw the Newman projection along C2–C3", "which conformation is most stable?", "sketch the energy as the bond rotates", "estimate the barrier from the eclipsing interactions".',
    cues: ['A circle with three bonds in front and three behind', 'Staggered vs eclipsed, gauche vs anti', 'kJ/mol values per interaction to add up'],
    procedure: ['Look down the named bond: the front carbon is the dot, the back carbon is the circle; draw the three groups on each at 120°.', 'Staggered (groups 60° apart) is lower in energy than eclipsed (groups lined up): torsional strain.', 'Among staggered forms, the two largest groups ANTI (180°) beats GAUCHE (60°, steric strain).', 'Barrier = sum of the eclipsing interactions in the eclipsed form (H/H ≈ 4 kJ/mol, H/CH₃ ≈ 6, CH₃/CH₃ ≈ 11) minus the strain in the staggered form (gauche CH₃/CH₃ ≈ 3.8).', 'Energy vs angle: ethane is a three-fold cosine (E = (Emax/2)(1 + cos 3θ)); butane has two different hills and two different valleys.'],
    marks: [M(1, 'the Newman drawn with the right groups front and back'), M(1, 'the most stable conformation named (staggered, anti) with the strain words'), M(1, 'the energy number assembled from the right interactions')],
    sources: [{ gen: 'chairs', tasks: ['energyAngle', 'brEclipse'], w: 1 }],
    seeds: [], book: ['2.12', '2.13', '2.14', '2.52', '2.53', '2.54', '2.62'],
    lessons: [{ id: '06', step: 's03' }], cards: [], scenes: []
  },

  // ================================================================================================================ NAMING
  {
    id: 'name-it', group: 'naming', stage: 2, title: 'Name it (IUPAC, any class, with stereo)', short: 'Name it', chapter: 2, section: ['A1'], weight: 2,
    recognise: 'A1 wording: "Give the IUPAC name of each compound. Include (E)/(Z), (R)/(S) or cis/trans wherever the structure needs it." Alkanes, cycloalkanes, halides, alkenes, alkynes, dienes, benzene derivatives.',
    cues: ['A skeletal drawing and a blank line', 'Wedges, dashes or a C=C with groups on both ends: a stereo descriptor is expected', 'A ring with two groups: o/m/p or numbers'],
    procedure: ['Find the parent: the longest chain that contains the C=C or C≡C (or the ring, if it has more carbons than the chain attached to it). Suffix: -ane, -ene, -yne; -diene for two C=C.', 'Number from the end that gives the multiple bond the lowest locant; if none, the first substituent; if tied, the first point of difference, then alphabetical order.', 'Name every substituent with its locant; di-, tri- for repeats (ignored in alphabetising; iso- counts, sec-/tert- do not).', 'Add stereo: (E)/(Z) on each capable C=C, (R)/(S) on each chirality centre, cis/trans on a ring. Put them in parentheses at the front with locants.', 'Assemble: locants-substituents (alphabetical) + parent + locant + suffix, commas between numbers, hyphens between numbers and letters.'],
    marks: [M(1, 'the right parent and suffix with the lowest locants'), M(1, 'substituents complete, numbered and alphabetical, with the stereo descriptor when the structure needs one')],
    sources: [{ gen: 'naming-levels', skill: 'naming-levels', settings: { difficulty: '', classes: ['alkane', 'cycloalkane', 'halide', 'alkene', 'cycloalkene', 'alkyne', 'mixed'], length: 'c10', subs: ['one', 'two', 'three'], complex: 'any', halogens: 'any', stereo: 'any', style: 'either', qtypes: ['type'], traps: [], count: 10, timer: 0 }, w: 3 }, { gen: 'eas-basics', tasks: ['name'], w: 1 }],
    seeds: [], book: ['2.9', '2.10', '2.11', '2.45', '2.46', '2.47', '3.1', '3.2', '3.3', '3.4', '3.5', '3.29', '3.30', '3.31', '4.27', '4.28', '4.29', '5.1', '5.2', '5.3', '5.26', '5.27'],
    lessons: [{ id: '05', step: 's12' }, { id: '07', step: 's06' }, { id: '13', step: 's15' }], cards: [], scenes: []
  },
  {
    id: 'fix-the-name', group: 'naming', stage: 2, title: 'Fix the wrong name', short: 'Fix the name', chapter: 2, section: ['B1'], weight: 2,
    recognise: 'B1 wording: "The name given for this compound is wrong. Write the correct IUPAC name." The wrong name usually breaks one rule.',
    cues: ['A name that reads fine but has a longer chain hiding, a wrong numbering direction, or groups out of alphabetical order', 'A C=C left outside the parent chain', 'A ring named as a substituent when it should be the parent'],
    procedure: ['Draw the molecule from the given name exactly as written.', 'Re-name it from scratch with the full procedure (parent, numbering, substituents, stereo).', 'Compare and name the rule that was broken: longest chain (or chain containing the C=C), lowest locants, alphabetical order, di-/tri- prefixes, ring vs chain parent, o/m/p.', 'Write the corrected name in full.'],
    marks: [M(1, 'the corrected name'), M(1, 'the rule that was broken, in a few words')],
    sources: [{ gen: 'naming-levels', skill: 'naming-levels', settings: { difficulty: '', classes: ['alkane', 'cycloalkane', 'halide', 'alkene', 'cycloalkene', 'alkyne', 'mixed'], length: 'c10', subs: ['one', 'two', 'three'], complex: 'any', halogens: 'any', stereo: 'any', style: 'either', qtypes: ['fix'], traps: [], count: 10, timer: 0 }, w: 1 }],
    seeds: [], book: ['2.48', '2.49', '2.50', '3.32', '3.33', '4.30'],
    lessons: [{ id: '05', step: 's18' }], cards: [], scenes: []
  },
  {
    id: 'draw-from-name', group: 'naming', stage: 2, title: 'Draw the structure from the name', short: 'Draw from name', chapter: 2, section: ['A1'], weight: 2,
    recognise: '"Draw the structure of…" followed by a full name, sometimes with (E)/(Z) or (R)/(S).',
    cues: ['A name and an empty box', 'Stereo descriptors that must appear as wedges, dashes or geometry'],
    procedure: ['Draw the parent chain or ring first, number it, and put the multiple bond at its locant.', 'Add each substituent at its number.', 'Add stereo last: set (E)/(Z) by placing the higher-priority groups on opposite/same sides; set (R)/(S) by placing H on a dash and arranging 1 → 2 → 3 clockwise for R, then check.', 'Count the carbons and hydrogens against the name; check that the lowest-locant rule would reproduce the name you were given.'],
    marks: [M(1, 'the skeleton with every group on the right carbon'), M(1, 'the stereo drawn correctly where the name has a descriptor')],
    sources: [{ gen: 'naming-levels', skill: 'naming-levels', settings: { difficulty: '', classes: ['alkane', 'cycloalkane', 'halide', 'alkene', 'cycloalkene', 'alkyne', 'mixed'], length: 'c10', subs: ['one', 'two', 'three'], complex: 'any', halogens: 'any', stereo: 'any', style: 'either', qtypes: ['draw'], traps: [], count: 10, timer: 0 }, w: 1 }],
    seeds: [], book: ['2.18', '2.19', '2.41', '2.43', '3.20', '3.21', '3.34', '4.31', '5.28', '5.29'],
    lessons: [{ id: '05', step: 's15' }], cards: [], scenes: []
  },
  {
    id: 'substituent-forms', group: 'naming', stage: 2, title: 'Substituent spellings: isopropyl, tert-butyl, propan-2-yl …', short: 'Substituents', chapter: 2, section: ['A1', 'B1'], weight: 1,
    recognise: 'A name or drawing with a branched substituent: isopropyl / propan-2-yl / 1-methylethyl, sec-butyl, isobutyl / 2-methylpropyl, tert-butyl / 1,1-dimethylethyl, neopentyl.',
    cues: ['A branched group hanging off the parent', 'A name that uses an old form (isopropyl) when the drawing is the same as the new form (propan-2-yl)'],
    procedure: ['Find the carbon of the substituent attached to the parent; count the substituent\'s carbons from it.', 'Three carbons attached at the middle = isopropyl (propan-2-yl). Four carbons: attached at an end of a straight four = butyl; at C2 of a straight four = sec-butyl (butan-2-yl); attached at the CH₂ of a branched three = isobutyl (2-methylpropyl); attached at the central carbon with three methyls = tert-butyl (1,1-dimethylethyl, 2-methylpropan-2-yl).', 'Alphabetise by the first letter of the complete name: isopropyl under i, tert-butyl under b (tert- is ignored), 1-methylethyl under m.', 'Either style is accepted on this paper; keep one style within one name.'],
    marks: [M(1, 'the substituent named right in either style'), M(1, 'alphabetised and numbered correctly in the full name')],
    sources: [{ gen: 'naming-levels', skill: 'naming-levels', settings: { difficulty: '', classes: ['alkane', 'cycloalkane', 'halide', 'alkene'], length: 'c10', subs: ['one', 'two'], complex: 'yes', halogens: 'any', stereo: 'none', style: 'either', qtypes: ['type', 'pick'], traps: ['alpha'], count: 10, timer: 0 }, w: 1 }],
    seeds: [], book: ['2.4', '2.5', '2.6', '2.7', '2.8', '2.29', '2.42', '2.44'],
    lessons: [{ id: '05', step: 's08' }], cards: [], scenes: []
  },

  // ================================================================================================================ BONDING AND ACIDS
  {
    id: 'lewis-formal-charge', group: 'bonding', stage: 3, title: 'Lewis structure, lone pairs and formal charge', short: 'Lewis + FC', chapter: 1, section: 'any', weight: 2,
    recognise: '"Draw the Lewis structure", "add the lone pairs", "what is the formal charge on O?", "which atom carries the charge?" Appears inside mechanism and resonance questions too.',
    cues: ['A condensed formula to expand', 'An ion with a charge but no atom marked', 'A structure with a missing lone pair'],
    procedure: ['Count the total valence electrons (H 1, C 4, N 5, O 6, halogens 7), adding one per negative charge and removing one per positive charge.', 'Connect the atoms with single bonds (carbon in the middle), then give every atom an octet (H a duet) with lone pairs; turn lone pairs into double or triple bonds if the electrons run out.', 'Formal charge = valence electrons − lone-pair electrons − number of bonds. Owning more than normal = negative, fewer = positive.', 'Check: the formal charges must add up to the overall charge; O with 3 bonds is +, O with 1 bond is −, N with 4 bonds is +, C with 3 bonds and no lone pair is +.'],
    marks: [M(1, 'every lone pair drawn and the octets right'), M(1, 'the formal charge(s) on the right atom(s), adding up to the ion\'s charge')],
    sources: [{ gen: 'lewis-basic', tasks: ['fc', 'lp', 'total', 'octet'], w: 2 }, { gen: 'lewis-basic', tasks: ['builder', 'builder-multi'], w: 1 }],
    seeds: [], book: ['1.4', '1.5', '1.6', '1.7', '1.33', '1.34', '1.35', '1.36', '1.37', '1.38', '1.39', '1.40'],
    lessons: [{ id: '01', step: 's08' }], cards: [], scenes: []
  },
  {
    id: 'hybridization', group: 'bonding', stage: 3, title: 'Hybridization, geometry, σ and π bonds', short: 'Hybridization', chapter: 1, section: 'any', weight: 2,
    recognise: '"What is the hybridization of each carbon?", "predict the bond angles", "how many σ and π bonds?", "which orbitals overlap in the C=C?"',
    cues: ['A molecule with single, double and triple bonds and atoms marked with numbers', 'The words tetrahedral, trigonal planar, linear, 109.5°, 120°, 180°'],
    procedure: ['Count the electron groups on the atom: atoms bonded to it (a double or triple bond is ONE neighbour) plus lone pairs.', '4 groups = sp³, tetrahedral, 109.5°; 3 = sp², trigonal planar, 120°; 2 = sp, linear, 180°.', 'σ bonds: one per bond (including every bond to H). π bonds: one extra for a double bond, two for a triple.', 'Orbitals: a C–C single bond is sp³–sp³ σ; a C=C has one sp²–sp² σ plus one p–p π; a C≡C has one sp–sp σ plus two p–p π.'],
    marks: [M(1, 'the hybridization from the electron-group count'), M(1, 'the angle / shape word and the σ/π count')],
    sources: [{ gen: 'shape-basic', tasks: ['hyb', 'angle', 'sigma', 'pi'], w: 1 }],
    seeds: [], book: ['1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.51', '1.52', '1.53', '1.54', '1.55'],
    lessons: [{ id: '02', step: 's06' }], cards: [], scenes: []
  },
  {
    id: 'polarity', group: 'bonding', stage: 3, title: 'Bond polarity and δ+ / δ−', short: 'Polarity', chapter: 1, section: 'any', weight: 1,
    recognise: '"Which bond is more polar?", "mark δ+ and δ− on each bond", "which atom is electron-rich?" Also the first step of every nucleophile/electrophile question.',
    cues: ['Bonds to O, N, halogens or a metal (Li, Mg)', 'Arrows or δ symbols to add'],
    procedure: ['Compare electronegativities: F 4.0 > O 3.5 > N 3.0 ≈ Cl 3.0 > Br 2.8 > C 2.5 > H 2.1 > Li 1.0, Mg 1.2.', 'The more electronegative atom is δ−; the other is δ+. A bigger difference = more polar.', 'C–H and C–C are essentially nonpolar (difference under 0.5). C–metal bonds are polarised the OTHER way: carbon is δ−.', 'δ+ carbons are electrophilic sites; δ− atoms with lone pairs are nucleophilic sites.'],
    marks: [M(1, 'the more polar bond chosen by electronegativity difference'), M(1, 'δ+ / δ− on the right atoms')],
    sources: [{ gen: 'shape-basic', tasks: ['polar2', 'delta'], w: 1 }],
    seeds: [], book: ['1.16', '1.17', '1.18', '1.19', '1.44', '1.45', '1.46', '1.47', '1.48', '1.49', '1.50'],
    lessons: [{ id: '02', step: 's14' }], cards: [], scenes: []
  },
  {
    id: 'pka-side', group: 'bonding', stage: 3, title: 'Which side does the equilibrium favour? (pKa)', short: 'pKa side', chapter: 1, section: 'any', weight: 2,
    recognise: '"Which side of the equilibrium is favoured?", "is X a strong enough base to deprotonate Y?", "which is the stronger acid?" with pKa values given or in the table.',
    cues: ['An equilibrium with two acids, one on each side', 'A pKa table or values in the question', 'The acetylide question: NaNH₂ vs NaOH'],
    procedure: ['Find the acid on each side (the species giving up the H⁺) and its pKa. Lower pKa = stronger acid.', 'The equilibrium favours the side with the WEAKER acid (higher pKa): the strong acid gives its proton away.', 'Equivalently: a base removes a proton only if its conjugate acid has a HIGHER pKa than the acid being deprotonated.', 'Quote both pKa values and the direction; Keq ≈ 10^(pKa of the acid on the right − pKa of the acid on the left).'],
    marks: [M(1, 'the two acids identified with their pKa values'), M(1, 'the favoured side with "weaker acid side" as the reason')],
    sources: [{ gen: 'acid-base', tasks: ['direction', 'stronger'], w: 2 }, { gen: 'alkynes', tasks: ['acidity'], w: 1 }],
    seeds: [], book: ['1.20', '1.21', '1.22', '1.56', '1.57', '1.58', '1.59', '1.60', '1.61', '4.22', '4.24'],
    lessons: [{ id: '03', step: 's09' }, { id: '12', step: 's13' }], cards: [], scenes: []
  },
  {
    id: 'conjugate-base', group: 'bonding', stage: 3, title: 'Conjugate acids and bases, and why one is more stable', short: 'Conjugate pairs', chapter: 1, section: 'any', weight: 1,
    recognise: '"Write the conjugate base of…", "identify the acid, base, conjugate acid and conjugate base", "explain why acetic acid is a stronger acid than ethanol".',
    cues: ['A proton-transfer equation with four species', 'A carboxylic acid or phenol beside an alcohol'],
    procedure: ['Conjugate base = the acid minus H⁺ (one fewer H, one more negative charge, on the atom that lost the H). Conjugate acid = the base plus H⁺.', 'In an equation, label the acid (loses H⁺) and base (gains it) on the left; their partners on the right are the conjugates.', 'Stability of the conjugate base decides acid strength: charge on a more electronegative atom, charge spread by resonance (carboxylate, phenoxide), or pulled on by electron-withdrawing groups = more stable base = stronger acid.', 'Write the reason in one line with the word resonance or electronegativity.'],
    marks: [M(1, 'the four species labelled or the conjugate written with the right charge on the right atom'), M(1, 'the stability reason (resonance / electronegativity / inductive)')],
    sources: [{ gen: 'acid-base', tasks: ['conjbase'], w: 1 }],
    seeds: [], book: ['1.20', '1.21', '1.22', '1.56', '1.57', '1.62', '1.63', '1.64'],
    lessons: [{ id: '03', step: 's04' }], cards: [], scenes: []
  },
  {
    id: 'lewis-acid-base', group: 'bonding', stage: 3, title: 'Lewis acid or Lewis base? Push the electrons', short: 'Lewis acid / base', chapter: 1, section: 'any', weight: 2,
    recognise: '"Classify each as a Lewis acid or Lewis base", "show with curved arrows how BF₃ reacts with NH₃", "identify the nucleophile and electrophile". The FeBr₃/AlCl₃ catalysts of EAS are the same idea.',
    cues: ['BF₃, AlCl₃, FeBr₃, H⁺, metal cations, a carbocation (acids: empty orbital)', 'NH₃, H₂O, ROH, halide ions, anything with a lone pair or a π bond (bases)', 'An arrow to draw from a lone pair to an atom'],
    procedure: ['Lewis acid = electron-pair ACCEPTOR: an atom with an empty orbital (B, Al, Fe in their halides; H⁺; a C⁺) or a δ+ atom that can take a pair by losing another bond.', 'Lewis base = electron-pair DONOR: a lone pair (N, O, halide) or a π bond.', 'Arrow: from the base\'s lone pair to the acid\'s empty orbital; the new bond carries a + on the donor atom and a − on the acceptor if both were neutral.', 'Brønsted acids are Lewis acids too (they accept a pair onto H⁺); every Brønsted base is a Lewis base. Nucleophile = Lewis base attacking carbon; electrophile = Lewis acid.'],
    marks: [M(1, 'the classification with the empty-orbital / lone-pair reason'), M(1, 'the arrow from the pair to the acceptor and the formal charges that result')],
    sources: [{ gen: 'acid-base', tasks: ['lewis'], w: 2 }, { gen: 'acid-base', tasks: ['arrows'], w: 1 }, { gen: 'mechanism-basics', tasks: ['nucelec'], w: 1 }],
    seeds: [], book: ['1.23', '1.24', '1.25', '1.58', '1.59', '1.65', '1.66', '1.67'],
    lessons: [{ id: '03', step: 's16' }, { id: '08', step: 's28' }], cards: [], scenes: []
  },

  // ================================================================================================================ STRUCTURE, RESONANCE, DIENES
  {
    id: 'functional-groups', group: 'structure', stage: 4, title: 'Identify the functional groups', short: 'Functional groups', chapter: 2, section: 'any', weight: 1,
    recognise: '"Circle and name each functional group", "what family is this compound?", "which of these contains an ester?"',
    cues: ['A larger drawing (a drug molecule) with several groups to find', 'A list of family names to match'],
    procedure: ['Scan every heteroatom (O, N, halogen) and every multiple bond.', 'C=O alone with H on it = aldehyde; with two carbons = ketone; with OH = carboxylic acid; with OR = ester; with N = amide; with Cl = acid chloride.', 'OH on sp³ carbon = alcohol; on a benzene ring = phenol; C–O–C = ether; N without C=O = amine; C≡N = nitrile; C=C alkene; C≡C alkyne; benzene ring = arene; C–X = halide.', 'Name every group present; a molecule can have several.'],
    marks: [M(1, 'every group found'), M(1, 'each named with the right family word (not "carbonyl" when "ketone" is wanted)')],
    sources: [{ gen: 'skeletal-fg', tasks: ['name', 'find'], w: 1 }],
    seeds: [], book: ['2.1', '2.2', '2.3', '2.34', '2.35', '2.36', '2.37', '2.38', '2.39', '2.40', '2.71', '2.72'],
    lessons: [{ id: '04', step: 's10' }], cards: [], scenes: []
  },
  {
    id: 'skeletal-convert', group: 'structure', stage: 4, title: 'Skeletal ↔ full structure, hydrogen count, molecular formula', short: 'Skeletal ↔ full', chapter: 2, section: 'any', weight: 1,
    recognise: '"Convert to a skeletal structure", "draw the full structure showing every H", "how many hydrogens on carbon 3?", "give the molecular formula".',
    cues: ['A condensed formula like CH₃CH(CH₃)CH₂OH', 'A zigzag line with no letters', 'A single carbon marked with an arrow'],
    procedure: ['Skeletal rules: every vertex and line end is a carbon; hydrogens on carbon are not drawn; every other atom (O, N, halogen) is written with its H.', 'H on a carbon = 4 − (number of bonds drawn to it, counting a double bond as 2 and a triple as 3).', 'Molecular formula: count the carbons (vertices + ends), then the H by the rule above, then the heteroatoms; write C, H, then the rest alphabetically.', 'Condensed to skeletal: write the chain as a zigzag, put each group in parentheses as a branch on the carbon before it.'],
    marks: [M(1, 'every carbon and hydrogen accounted for (formula or H count right)'), M(1, 'the converted drawing with the right branches and heteroatoms')],
    sources: [{ gen: 'skeletal-fg', tasks: ['hcount', 'formula', 'convert'], w: 1 }],
    seeds: [], book: ['2.15', '2.16', '2.17', '2.29', '2.30', '2.41', '2.43', '2.51', '1.37', '1.38', '1.39', '1.40'],
    lessons: [{ id: '04', step: 's03' }], cards: [], scenes: []
  },
  {
    id: 'resonance-forms', group: 'structure', stage: 4, title: 'Draw the resonance forms (and spot the invalid one)', short: 'Resonance forms', chapter: 4, section: ['B4'], weight: 3,
    recognise: '"Draw all the resonance forms", "which of these is a valid resonance structure?", "how many resonance forms does … have?", "use curved arrows to show the resonance".',
    cues: ['A carbocation next to a C=C (allylic) or a benzene ring (benzylic)', 'A carboxylate, enolate, nitro group, amide or phenoxide', 'A double-headed arrow ↔ between drawings'],
    procedure: ['Only electrons move: π electrons and lone pairs. No atom moves, no σ bond breaks.', 'Push a lone pair into the neighbouring bond (making a π bond) while that bond\'s π electrons leave onto the far atom, or push a π bond onto an adjacent C⁺ (empty p orbital).', 'Keep the total charge the same in every form and never give a second-row atom more than 8 electrons (a carbon with five bonds is the classic invalid form).', 'Keep going until the pushing returns to a form you already have; count the distinct drawings (a benzene ring\'s two Kekulé drawings count as one form in the book\'s count of a benzyl cation).', 'The real molecule is the hybrid: draw it with dashed partial bonds and δ charges if asked.'],
    marks: [M(1, 'arrows that move only π electrons or lone pairs, with the resulting form drawn'), M(1, 'every form found, with charge and octets correct in each'), M(1, 'the invalid form rejected for the right reason (five-bond carbon, moved atom, charge changed)')],
    sources: [{ gen: 'resonance', tasks: ['draw', 'valid', 'invalid', 'count'], w: 1 }],
    seeds: [], book: ['4.13', '4.14', '4.15', '4.48', '4.49', '4.50', '4.51', '5.8', '5.9'],
    lessons: [{ id: '11', step: 's04' }], cards: [], scenes: []
  },
  {
    id: 'resonance-rank', group: 'structure', stage: 4, title: 'Which resonance form matters most?', short: 'Major contributor', chapter: 4, section: ['B4'], weight: 2,
    recognise: '"Which resonance form is the major contributor?", "rank the resonance structures by importance", "which form is more stable and why?"',
    cues: ['Two or three forms of the same species with different charge positions', 'The words major, minor, contributes most, more stable'],
    procedure: ['Rule 1: more atoms with complete octets wins (a form where every atom has an octet beats one with a C⁺ that has six electrons).', 'Rule 2: with octets equal, a negative charge sits better on the more electronegative atom (O⁻ beats C⁻) and a positive charge on the less electronegative one, or on a carbon that is tertiary/allylic.', 'Rule 3: fewer formal charges and less charge separation beats more (a neutral form beats a charge-separated one).', 'Identical forms (acetate\'s two, the allyl cation\'s two) contribute equally: the hybrid is symmetric.', 'Say which rule decided it in one line.'],
    marks: [M(1, 'the major form picked'), M(1, 'the rule named (octets, electronegativity, charge separation) or "equal: identical forms"')],
    sources: [{ gen: 'resonance', tasks: ['rank'], w: 1 }],
    seeds: [], book: ['4.13', '4.14', '4.48', '4.49', '4.50', '4.51'],
    lessons: [{ id: '11', step: 's08' }], cards: [], scenes: []
  },
  {
    id: 'diene-12-14', group: 'structure', stage: 4, title: '1,2- against 1,4-addition to a conjugated diene', short: '1,2 vs 1,4', chapter: 4, section: ['B4', 'B3'], weight: 3,
    recognise: '"HBr (1 equiv.) adds to buta-1,3-diene: draw both products", "explain why two products form", "which carbocation forms and draw its resonance forms".',
    cues: ['Two C=C separated by one single bond (conjugated)', '"1 equivalent" of HX', 'Two products expected, numbered 1,2 and 1,4'],
    procedure: ['Protonate an END carbon of the diene (C1) so the cation is on C2, ALLYLIC: it has two resonance forms, + on C2 and + on C4.', 'The halide can bond at C2 (1,2-addition: X next to the new H) or at C4 (1,4-addition: X at the far end, the remaining C=C moves to C2=C3).', 'Draw both products; the one from the more substituted end of the allylic cation (the more stable form) is usually major on this course.', 'Do not protonate an inner carbon: that cation would not be allylic (no resonance).', 'Show the two resonance forms of the cation with a double-headed arrow when the question says "explain".'],
    marks: [M(1, 'the allylic cation with both resonance forms'), M(1, 'both products drawn, labelled 1,2 and 1,4, with the C=C in the right place in the 1,4-product'), M(1, 'the reason: the proton goes to the end carbon to give the resonance-stabilised cation')],
    sources: [{ gen: 'resonance', tasks: ['products'], w: 2 }, { gen: 'predict-product', skill: 'predict-product', settings: { cards: ['diene-hx'] }, w: 1 }],
    seeds: [], book: ['4.12', '4.26', '4.31', '4.36', '4.61', '4.62'],
    lessons: [{ id: '11', step: 's14' }], cards: ['diene-hx'], scenes: []
  }
];

export const TYPE_BY_ID = Object.fromEntries(TYPES.map((t) => [t.id, t]));
export const GROUP_BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g]));
/** The types on the page now (stage <= LIVE_STAGE), in ladder order. */
export const liveTypes = () => TYPES.filter((t) => t.stage <= LIVE_STAGE);
/** The types that belong to a lesson (for the "Master this question type" links on its Use-it card). */
export const typesForLesson = (lessonId) => TYPES.filter((t) => t.stage <= LIVE_STAGE && t.lessons.some((l) => l.id === lessonId));
/** The first live type that practises a weak-spot skill (for the mock's marked script and the weak-spot panel). */
export function typesForSkill(skill, card = null) {
  return TYPES.filter((t) => t.stage <= LIVE_STAGE && ((card && t.cards.includes(card)) || t.sources.some((s) => s.gen === skill || s.skill === skill || (s.gen === 'predict-product' && skill === 'predict-product'))));
}
