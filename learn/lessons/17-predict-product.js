// Lesson 17: Predict the product (review lesson; the three questions, every reaction card derived, the exceptions, exam wording).
// Original wording throughout. Nothing chemical is typed by hand: every drawn answer below comes from the engines the mixed drill uses (engine/generators-predict.js:
// reactions.js, reactions-additions.js, reactions-alkynes.js, reactions-dienes.js, reactions-aromatic.js; the ten workbook B3.1 cards use the hub card's own example).
// `chk` on a step names the engine call that produced its correct answer; tests/lesson17.mjs recomputes every one (canonical SMILES) and checks that every
// #reactions/<id> link is a real hub card and that all 38 cards are reached in Part 2. `part` (1 to 4) marks the four parts of the lesson.
// Part 1: three questions.  Part 2: every family, one step per hub card (+ labs).  Part 3: exceptions.  Part 4: exam wording.

export default {
  id: '17',
  slug: 'predict-product',
  title: 'Predict the product',
  minutes: 42,
  chapter: 'review',
  sections: [],
  drawing: 'skeletal',
  goals: [
    'Given any substrate and any reagent from this course, say what forms, where it forms, and its stereochemistry, by reasoning',
    'Ask three questions in order: who is rich and who is poor (what adds), where does it go (the best-steadied carbon or ring position), same side or opposite sides',
    'Name the exceptions as exceptions: hydroboration, halogens on a ring, PCC, an amine in acid, and the reagents only the cards teach'
  ],
  mastery: { count: 5, generator: 'predict-product' },
  useIt: {
    book: [],
    note: 'Now do the Reactions drill and the past-paper B3 items.'
  },
  steps: [
    {
      caveman: {"problem":"<b>Q1: rich or poor?</b> HBr + propene. Who gives, takes electrons? Stepwise.","rule":"Q1: arrow from rich atom or bond to poor atom. Reagent's poor end bonds first; left-behind pair finishes.","moves":[{"ask":"Which part of propene electron-rich?","options":[{"why":"Yes. π bond: exposed, loose pair: C=C nucleophile."},{"why":"H atoms do not enrich. Loose electrons: π pair of C=C."},{"why":"It does. C=C π bond is rich."}]},{"ask":"Which atom of H–Br electron-poor?","options":[{"why":"Yes. Br pulls pair: H short: δ+."},{"why":"Lone pairs enrich. Br is δ− end."},{"why":"Electronegativity differs (2.8, 2.1): polar, H δ+."}]},{"ask":"First curved arrow runs which way?","options":[{"why":"Yes. Arrows start at electrons: π bond to H, then H–Br pair onto Br."},{"why":"H⁺ has no electrons: no arrow starts there."},{"why":"Br pair moves in SECOND arrow."}]},{"ask":"What does HBr put on alkene?","options":[{"why":"Yes. H bonds first. Br⁻ leaves with pair, then bonds to carbocation."},{"why":"That is Br₂, not HBr. H–Br: one H, one Br."},{"why":"That is H₂, Pd/C. HBr: one H, one Br."}]}]}, // CAVEMAN
      type: 'worked',
      skill: 'nuc-elec',
      part: 1,
      problem: '<b>Q1: who is rich, who is poor?</b> HBr meets propene. Decide who gives electrons and who takes them, one move at a time.',
      smiles: 'CC=C',
      moves: [
        {
          ask: 'Which part of propene is electron-rich?',
          options: [
            {
              text: 'The C=C: its π bond holds two electrons above and below the plane, loosely held',
              correct: true,
              why: 'Yes. The π bond is the exposed, loosely held pair, so the C=C is the nucleophile (Lesson 08).'
            },
            {
              text: 'The CH₃ group, because it carries the most H atoms',
              why: 'H atoms do not make a group rich. In an alkene the loosely held electrons are the π pair of the C=C.'
            },
            {
              text: 'Nowhere: a hydrocarbon has no electron-rich spot at all',
              why: 'It does. A C=C has a π bond, and that pair is the electron-rich part of an alkene.'
            }
          ]
        },
        {
          ask: 'Which atom of H–Br is electron-poor?',
          options: [
            {
              text: 'The H: Br is more electronegative (2.8 against 2.1), so H is δ+',
              correct: true,
              why: 'Yes. Br pulls the shared pair toward itself, which leaves H short of electrons: δ+.'
            },
            {
              text: 'The Br: it has three lone pairs, so it is short of electrons',
              why: 'Lone pairs make an atom rich, not poor. Br is the δ− end of H–Br.'
            },
            {
              text: 'Neither: H–Br is a nonpolar bond',
              why: 'The two atoms differ in electronegativity (2.8 and 2.1), so the bond is polar, with H as δ+.'
            }
          ]
        },
        {
          ask: 'Which way does the first curved arrow run?',
          options: [
            {
              text: 'From the π bond to the H (rich to poor)',
              correct: true,
              why: 'Yes. Arrows start at electrons and point at the atom that receives them: π bond to H, then the H–Br pair onto Br.'
            },
            {
              text: 'From the H to the π bond (poor to rich)',
              why: 'H⁺ has no electrons to give, so no arrow can start there. Arrows start at electrons.'
            },
            {
              text: 'From a lone pair on Br to the C=C',
              why: 'That would make the Br the giver. Br is δ− but it is part of the bond that breaks: its pair moves onto Br in the SECOND arrow.'
            }
          ]
        },
        {
          ask: 'So what does HBr put on the alkene?',
          options: [
            {
              text: 'H and Br: H to the C=C (the poor end bonds first), Br⁻ then bonds to the cation',
              correct: true,
              why: 'Yes. The poor end (H) is what the π bond bonds to first. Br⁻ leaves with the pair and then bonds to the carbocation.'
            },
            {
              text: 'Br and Br: two halogens, one on each carbon',
              why: 'That is Br₂, not HBr. H–Br has one H and one Br to add.'
            },
            {
              text: 'Two H atoms: the C=C becomes C–C',
              why: 'That is hydrogenation (H₂ with Pd/C). HBr brings one H and one Br.'
            }
          ]
        }
      ],
      rule: 'Q1: the arrow runs from the electron-rich atom or bond to the electron-poor atom. The poor end of the reagent is the group that bonds first, and the pair left behind finishes the job.',
      id: 's01'
    },
    {
      caveman: {"html":"<p><b>Q1: what adds.</b> Rich: π bond, lone pair, anion, metal. Poor: δ+ H, cation, atom short of octet. Arrow rich → poor. Poor end bonds first: H of HBr, near Br of Br₂, O of RCO₃H, B of BH₃, NO₂⁺ on ring. <a href=\"#lesson-08/s07\">Lesson 08</a>, <a href=\"#lesson-09/s04\">Lesson 09</a>.</p>"}, // CAVEMAN
      type: 'explain',
      skill: 'nuc-elec',
      part: 1,
      html: '<p><b>Q1 decides what adds.</b> Find the rich partner: a π bond, a lone pair, an anion, a metal giving electrons. Find the poor partner: a δ+ H, a cation, an atom short of an octet. The arrow runs rich → poor. The poor end of the reagent bonds first: the H of HBr, the near Br of Br₂, the O of RCO₃H, the B of BH₃, NO₂⁺ on a ring. <a href="#lesson-08/s07">Lesson 08</a> and <a href="#lesson-09/s04">Lesson 09</a> have the steps.</p>',
      id: 's02'
    },
    {
      caveman: {"prompt":"Cyclohexene + Br₂. Br–Br nonpolar. π bond approaches: what happens?","reveal":"Rich to poor even for Br₂: π bond attacks, one Br leaves as Br⁻: two Br on carbons (<a href=\"#lesson-10/s03\">Lesson 10</a>).","options":[{"why":"Yes. Big Br–Br bond polarises: π pair attacks near Br, far Br leaves as Br⁻."},{"why":"Br₂ reacts. Big polarisable bond: near atom δ+ as electrons approach."},{"why":"C=C is rich. Arrow starts at π electrons."},{"why":"Ring H not δ+. Reaction at C=C."}]}, // CAVEMAN
      type: 'predict',
      skill: 'nuc-elec',
      part: 1,
      prompt: 'Cyclohexene meets Br₂. Br–Br is a nonpolar bond: neither Br is δ+. What happens when the π bond comes close?',
      options: [
        {
          text: 'The π electrons push on the near Br, and the Br–Br pair leaves with the far Br',
          correct: true,
          why: 'Yes. A big Br–Br bond is easy to polarise: the π pair attacks the near Br, so that Br acts as the poor end and the far Br leaves as Br⁻.'
        },
        {
          text: 'Nothing happens, because a nonpolar bond has no poor end for the π electrons to attack',
          why: 'Br₂ does react. A big, polarisable bond becomes δ+ at the near atom when electrons come close, so the C=C can attack it.'
        },
        {
          text: 'Br₂ gives lone pairs to the C=C, which is the poor partner in this pair',
          why: 'The C=C is the rich partner. Its π electrons are the ones that move, and the arrow starts there.'
        },
        {
          text: 'The C–H bonds on the ring break first, because the ring H atoms are the poor end',
          why: 'The ring H atoms are not δ+ here. The reaction happens at the C=C, the loosely held electron pair.'
        }
      ],
      reveal: 'Rich to poor even for Br₂: the π bond attacks, one Br leaves as Br⁻, and Br and Br end up on the two carbons (<a href="#lesson-10/s03">Lesson 10</a>). Q1 told you WHAT adds: two Br.',
      id: 's03'
    },
    {
      caveman: {"problem":"<b>Q2: where?</b> HBr + 2-methylbut-1-ene. Where H, Br?","rule":"H to carbon with more H; + on carbon with more carbon neighbours (3° > 2° > 1°); X, OH there. Reverse: hydroboration.","moves":[{"ask":"H on two C=C carbons. More H?","options":[{"why":"Yes. =CH₂: two H; other: none, three carbon neighbours."},{"why":"No H there."},{"why":"They differ."}]},{"ask":"H to that carbon. Where is +?","options":[{"why":"Yes. + on carbon with CH₃, CH₂CH₃, new CH₃."},{"why":"Needs H on OTHER carbon."},{"why":"H on one carbon: + on other."}]},{"ask":"Why that cation?","options":[{"why":"Yes. 3° > 2° > 1° (Lesson 09)."},{"why":"Stability: carbon groups lending to C⁺, not bulk."},{"why":"3° far more stable: faster path."}]},{"ask":"Br⁻ bonds + carbon. Product?","options":[{"why":"Yes. Br on carbon that had +: tertiary bromide."},{"why":"anti-Markovnikov: needs 1° cation."},{"why":"HBr adds Br, not Cl."}]}]}, // CAVEMAN
      type: 'worked',
      skill: 'markovnikov',
      part: 1,
      problem: '<b>Q2: where does it go?</b> HBr adds to 2-methylbut-1-ene. Decide where H goes and where Br ends up.',
      smiles: 'CCC(C)=C',
      moves: [
        {
          ask: 'Count the H on the two C=C carbons. Which carbon has more H?',
          options: [
            {
              text: 'The CH₂ end: two H. The other carbon has none',
              correct: true,
              why: 'Yes. The = CH₂ carbon has two H and one carbon neighbour; the other has no H and three carbon neighbours.'
            },
            {
              text: 'The carbon that holds the CH₃ and CH₂CH₃ groups',
              why: 'That carbon has no H at all. It has three carbon neighbours.'
            },
            {
              text: 'They are the same: each C=C carbon counts one H',
              why: 'They differ: one carbon has two H, the other none.'
            }
          ]
        },
        {
          ask: 'H goes to that carbon. Where does the + charge sit?',
          options: [
            {
              text: 'On the other carbon, which has three carbon neighbours (a 3° carbocation)',
              correct: true,
              why: 'Yes. The H took the CH₂ end, so the + is left on the carbon that holds the CH₃, the CH₂CH₃ and the new CH₃ group.'
            },
            {
              text: 'On the CH₃ end, which has one carbon neighbour (a 1° carbocation)',
              why: 'That would need H to go to the OTHER carbon. H goes where there are more H.'
            },
            {
              text: 'Spread equally over both carbons',
              why: 'The H bonded to one carbon only, so the + sits on the other one.'
            }
          ],
          figure: { smiles: 'CC[C+](C)C', drawing: 'skeletal', showCharge: true, label: 'the carbocation' }
        },
        {
          ask: 'Why is that the cation that forms?',
          options: [
            {
              text: 'Three carbon groups give electrons to the C⁺, so the 3° cation is the most stable and forms fastest',
              correct: true,
              why: 'Yes. More alkyl groups lend more electron density: 3° > 2° > 1° (Lesson 09).'
            },
            {
              text: 'A 1° cation is more stable, because it has the fewest bulky groups',
              why: 'Stability follows how many carbon groups lend electrons to the C⁺, not how few are in the way.'
            },
            {
              text: 'All carbocations are equally stable, so the first H to arrive decides',
              why: 'They differ a lot: 3° is far more stable than 1°, and that sets which path is faster.'
            }
          ]
        },
        {
          ask: 'Br⁻ bonds to the + carbon. What is the product?',
          options: [
            {
              text: '<mol smiles="CCC(C)(C)Br"></mol>',
              correct: true,
              why: 'Yes. Br is on the carbon that carried the + charge: the tertiary alkyl bromide.'
            },
            {
              text: '<mol smiles="CCC(C)CBr"></mol>',
              why: 'That is the anti-Markovnikov product: Br on the carbon with more H. It would need the 1° cation.'
            },
            {
              text: '<mol smiles="CCC(C)(C)Cl"></mol>',
              why: 'The reagent is HBr, so the atom that adds is Br, not Cl.'
            }
          ],
          chk: { card: 'alkene-hx', sub: 'CCC(C)=C', v: 'HBr', answer: 'CCC(C)(C)Br' }
        }
      ],
      rule: 'Q2: H goes to the carbon with more H. The + sits on the carbon with more carbon neighbours (3° > 2° > 1°), and the other piece (X, OH) bonds there. Hydroboration is the one reverse.',
      id: 's04'
    },
    {
      caveman: {"html":"<p><b>Q2: where.</b> H to end with more H: + on end with more carbon neighbours (3° > 2° > 1°); X there. Equal ends: mixture. Ring: ortho/para or meta: + where group on ring carries it. Reverse: hydroboration, OH on carbon with MORE H.</p>"}, // CAVEMAN
      type: 'explain',
      skill: 'markovnikov',
      part: 1,
      html: '<p><b>Q2 decides where.</b> H goes to the end of the C=C with more H, so the + lands on the end with more carbon neighbours (3° beats 2° beats 1°) and the other piece bonds there. Equal ends mean a mixture. On a ring the same idea picks ortho/para or meta: the + goes where the group already on the ring can carry it. One reverse: hydroboration puts OH on the carbon with MORE H.</p>',
      id: 's05'
    },
    {
      caveman: {"prompt":"<name new=\"hex-1-ene\" old=\"1-hexene\"></name> + <b>H₂O, H₂SO₄ (cat.)</b>: major product?","reveal":"H to CH₂ end (more H), + on C2 (2°), OH there: hexan-2-ol, <b>alcohol</b>. Alkane: two H; anti-Markovnikov alcohol: OH on C1.","options":[{"why":"Alkene unchanged. H₂O adds H and OH."},{"why":"Alkane: two H, no O. Water adds H and OH."},{"why":"OH on carbon with MORE H: anti-Markovnikov. H to carbon with more H."},{"why":"Yes. H to carbon with more H: + on more substituted carbon: secondary (2°) cation. OH there."}]}, // CAVEMAN
      type: 'predict',
      skill: 'markovnikov',
      part: 1,
      prompt: 'Q2 on a new case. Substrate: <name new="hex-1-ene" old="1-hexene"></name>. Reagent: <b>H₂O, H₂SO₄ (cat.)</b>. What is the major product?',
      equation: {
        reactants: ['CCCCC=C'],
        products: [],
        cond: 'H₂O, H₂SO₄ (cat.)'
      },
      options: [
        {
          text: '<mol smiles="C=CCCCC"></mol>',
          why: 'This is still the alkene: nothing added. H₂O adds H and OH across the C=C.'
        },
        {
          text: '<mol smiles="CCCCCC"></mol>',
          why: 'This is the alkane: two H added and no O. Water adds H and OH, so the product has an OH.'
        },
        {
          text: '<mol smiles="CCCCCCO"></mol>',
          why: 'OH went on the carbon with MORE H (the one with fewer alkyl groups): that is anti-Markovnikov. H must go to the carbon with more H.'
        },
        {
          text: '<mol smiles="CCCCC(C)O"></mol>',
          correct: true,
          why: 'Yes. H adds to the carbon with more H, which leaves the + charge on the more substituted carbon: the secondary (2°) carbocation (the more stable one). OH then bonds there.'
        }
      ],
      reveal: 'H went to the CH₂ end (more H), the + sat on C2 (a 2° cation), and OH bonded there: hexan-2-ol, an <b>alcohol</b>. The alkane would add two H; the anti-Markovnikov alcohol would put OH on C1.',
      chk: { card: 'alkene-hydration', sub: 'CCCCC=C', v: 'H2O' },
      id: 's06'
    },
    {
      caveman: {"problem":"<b>Q3: same side or opposite?</b> 1,2-Dimethylcyclopentene, three reagents: groups on ring?","rule":"Q3: flat carbocation: either face. Three-membered ring (bromonium, epoxide + water): anti. Both pieces at once (H₂/Pd, cold KMnO₄, peroxyacid, borane): syn.","moves":[{"ask":"HBr: carbocation. Shape, meaning for Br⁻?","options":[{"why":"Yes. Flat: two faces, no preference."},{"why":"Flat (sp²), three bonds. Nothing forces Br⁻ to one face."},{"why":"Bromonium from Br₂, not HBr."}]},{"ask":"Br₂: ring on one face. Br⁻ attacks where?","options":[{"why":"Yes. Ring blocks its face: Br⁻ from back. Anti: trans on ring."},{"why":"Ring on that face: Br⁻ cannot approach."},{"why":"Flat cation case. Bromonium blocks one face."}]},{"ask":"H₂, Pd/C: both H from surface. How add?","options":[{"why":"Yes. Alkene on metal, both H from surface: syn, cis on ring."},{"why":"Only one face touches surface."},{"why":"H₂ split on metal; both H to one face."}]}]}, // CAVEMAN
      type: 'worked',
      skill: 'stereo-addition',
      part: 1,
      problem: '<b>Q3: same side or opposite sides?</b> 1,2-Dimethylcyclopentene meets three reagents. Say how the two new groups sit on the ring each time.',
      smiles: 'CC1=C(C)CCC1',
      moves: [
        {
          ask: 'HBr: step 1 makes a carbocation. What shape is it, and what does that mean for Br⁻?',
          options: [
            {
              text: 'Flat (sp²) with an empty p orbital: Br⁻ can attack either face, with no preference',
              correct: true,
              why: 'Yes. A flat cation has two faces and no reason to prefer one, so the new group can arrive on either face.'
            },
            {
              text: 'Tetrahedral: Br⁻ is forced to attack from the face opposite the H',
              why: 'A carbocation has three bonds, so it is flat (sp²), not tetrahedral. Nothing forces Br⁻ to one face.'
            },
            {
              text: 'A bromonium ring blocks one face, so Br⁻ attacks from the other',
              why: 'A bromonium ion comes from Br₂, not HBr. HBr gives a plain carbocation.'
            }
          ]
        },
        {
          ask: 'Br₂: the first step makes a three-membered ring on one face. Where does Br⁻ attack?',
          options: [
            {
              text: 'From the opposite face (anti): the two Br end up trans',
              correct: true,
              why: 'Yes. The ring blocks the face it sits on, so Br⁻ comes in from the back. Anti addition: trans on a ring.'
            },
            {
              text: 'From the same face as the ring (syn): the two Br end up cis',
              why: 'The bromonium ring sits on that face, so Br⁻ cannot approach from there.'
            },
            {
              text: 'From either face with equal chances, as in a flat cation',
              why: 'That is the flat-cation case. A bromonium ion is a bridged ring that blocks one face.'
            }
          ]
        },
        {
          ask: 'H₂ with Pd/C: both H come from the catalyst surface. How do they add?',
          options: [
            {
              text: 'Both on the same face (syn): the two CH₃ groups end up cis',
              correct: true,
              why: 'Yes. The alkene lies on the metal and takes both H from that one surface: syn addition, cis on a ring.'
            },
            {
              text: 'On opposite faces (anti): the two CH₃ groups end up trans',
              why: 'Only one face of the alkene touches the surface, so both H arrive there.'
            },
            {
              text: 'One H from each face, because H₂ splits in the solution',
              why: 'The H₂ is split on the metal surface, and both H are delivered from there to one face.'
            }
          ]
        }
      ],
      rule: 'Q3: a flat carbocation gives either face. A three-membered ring intermediate (bromonium, or an epoxide opened by water) gives anti. Both pieces delivered at once from one surface or one reagent (H₂ over Pd, cold KMnO₄, a peroxyacid O, borane) give syn.',
      id: 's07'
    },
    {
      caveman: {"html":"<p><b>Q3: faces.</b> Flat carbocation: either face. Three-membered ring (bromonium, epoxide + water): anti. Both pieces at once: syn. Stereocentres: racemate (flat or one-sided reagents, flat alkene) or meso (matching halves). <a href=\"#lesson-10/s03\">Lesson 10</a>.</p>"}, // CAVEMAN
      type: 'explain',
      skill: 'stereo-addition',
      part: 1,
      html: '<p><b>Q3 decides the faces.</b> Flat carbocation: either face. Three-membered ring (bromonium, epoxide opened by water): anti. Both pieces arriving at once: syn. On a ring, syn is cis and anti is trans. If the product has stereocentres, ask whether it is a racemate (flat or one-sided reagents on a flat alkene), meso (two matching halves) or a single compound. See <a href="#lesson-10/s03">Lesson 10</a>.</p>',
      id: 's08'
    },
    {
      caveman: {"prompt":"<name new=\"cyclopentene\" old=\"cyclopentene\"></name> + <b>Br₂, CH₂Cl₂</b>: major product?","reveal":"Bromonium ring: Br⁻ from back: anti, <b>trans</b>-1,2-dibromocyclopentane. Flat alkene, achiral reagent: <b>racemate</b>.","options":[{"why":"Yes. Br₂ adds anti: bromonium, Br⁻ from back: trans on ring. (racemate: either drawing correct)"},{"why":"syn product: both Br SAME face. Br₂ adds anti."},{"why":"Two H (alkane). Br₂: one Br per carbon."},{"why":"Other halogen. Br₂ adds Br."}]}, // CAVEMAN
      type: 'predict',
      skill: 'stereo-addition',
      part: 1,
      prompt: 'Q3 on a new case. Substrate: <name new="cyclopentene" old="cyclopentene"></name>. Reagent: <b>Br₂, CH₂Cl₂</b>. What is the major product?',
      equation: {
        reactants: ['C1=CCCC1'],
        products: [],
        cond: 'Br₂, CH₂Cl₂'
      },
      options: [
        {
          text: '<mol smiles="Br[C@@H]1CCC[C@H]1Br"></mol>',
          correct: true,
          why: 'Yes. Br₂ adds anti: a bromonium ion forms, then Br⁻ attacks from the back face. On the ring the two new groups end up trans. (formed as a racemate: the mirror image forms equally, so either drawing is correct)'
        },
        {
          text: '<mol smiles="Br[C@@H]1CCC[C@@H]1Br"></mol>',
          why: 'This is the syn product: the two Br sit on the SAME face. Br₂ adds anti (opposite faces).'
        },
        {
          text: '<mol smiles="C1CCCC1"></mol>',
          why: 'This adds two H (the alkane). Br₂ puts one Br on EACH carbon of the C=C, no H.'
        },
        {
          text: '<mol smiles="Cl[C@H]1CCC[C@@H]1Cl"></mol>',
          why: 'This carries the other halogen. The reagent is Br₂, so Br is the atom that adds.'
        }
      ],
      reveal: 'A bromonium ring, so Br⁻ came in from the back: anti, <b>trans</b>-1,2-dibromocyclopentane. A flat alkene and an achiral reagent make both mirror images equally: a <b>racemate</b>.',
      chk: { card: 'alkene-x2', sub: 'C1=CCCC1', v: 'Br2' },
      id: 's09'
    },
    {
      caveman: {"prompt":"<b>Part 2: every family, derived before its card.</b> <name new=\"pent-1-ene\" old=\"1-pentene\"></name> + <b>HCl</b>: major product?","reveal":"<b>Q1:</b> H, Cl add.<br><b>Q2:</b> H to CH₂ end, + on C2 (2°), Cl there.<br><b>Q3:</b> Flat cation: either face (racemate).<br><b>Kind:</b> <b>alkyl halide</b> (2-chloropentane). <a href=\"#reactions/alkene-hx\">Open card</a>","options":[{"why":"Alkene unchanged. HCl adds H and Cl."},{"why":"Other halogen. HCl adds Cl."},{"why":"Cl on carbon with MORE H: anti-Markovnikov."},{"why":"Yes. H to carbon with more H: + on 2° carbon. Cl there."}]}, // CAVEMAN
      type: 'predict',
      skill: 'markovnikov',
      part: 2,
      prompt: '<b>Part 2: every family, derived before its card.</b> First, HX and water on alkenes. Substrate: <name new="pent-1-ene" old="1-pentene"></name>. Reagent: <b>HCl</b>. What is the major product?',
      aside: '<b>The three questions.</b> <b>Q1</b> Who is electron-rich, who is electron-poor? The arrow runs rich → poor, and that decides WHAT adds. <b>Q2</b> Where does it go? The + charge sits on the best-steadied carbon (H goes to the carbon with more H). <b>Q3</b> Same side or opposite sides? Flat cation: either. Three-membered ring: anti. Both pieces at once: syn.',
      equation: {
        reactants: ['CCCC=C'],
        products: [],
        cond: 'HCl'
      },
      options: [
        {
          text: '<mol smiles="C=CCCC"></mol>',
          why: 'This is still the alkene: nothing added. HCl adds H and Cl across the C=C.'
        },
        {
          text: '<mol smiles="CCCC(C)Br"></mol>',
          why: 'This carries a different halogen. The reagent is HCl, so the atom that adds is Cl, not the other halogen.'
        },
        {
          text: '<mol smiles="CCCCCCl"></mol>',
          why: 'Cl went on the carbon with MORE H (the one with fewer alkyl groups): that is anti-Markovnikov. H must go to the carbon with more H.'
        },
        {
          text: '<mol smiles="CCCC(C)Cl"></mol>',
          correct: true,
          why: 'Yes. H adds to the carbon with more H, which leaves the + charge on the more substituted carbon: the secondary (2°) carbocation (the more stable one). Cl then bonds there.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The π bond is rich, the H of HCl is poor: H and Cl add.<br><b>Q2, where:</b> H to the CH₂ end (more H); the + sits on C2 (2°); Cl bonds there.<br><b>Q3, in space:</b> The cation is flat, so Cl arrives on either face (C2 becomes a stereocentre, a racemate).<br><b>Kind of product:</b> an <b>alkyl halide</b> (2-chloropentane). <a href="#reactions/alkene-hx">Open the HX addition card</a>.',
      chk: { card: 'alkene-hx', sub: 'CCCC=C', v: 'HCl' },
      id: 's10'
    },
    {
      caveman: {"prompt":"<name new=\"1-methylcyclopentene\" old=\"1-methylcyclopentene\"></name> + <b>H₂O, H₂SO₄ (cat.)</b>: major product?","reveal":"<b>Q1:</b> H₃O⁺, then water: H, OH add.<br><b>Q2:</b> H to CH carbon, + on carbon with CH₃ (3°), OH there.<br><b>Q3:</b> Flat cation: either face (no stereocentre).<br><b>Kind:</b> tertiary <b>alcohol</b> (1-methylcyclopentan-1-ol). <a href=\"#reactions/alkene-hydration\">Open card</a>","options":[{"why":"Alkene unchanged. H₂O adds H and OH."},{"why":"Alkane: two H, no O."},{"why":"OH on carbon with MORE H: anti-Markovnikov."},{"why":"Yes. H to carbon with more H: + on 3° carbon. OH there."}]}, // CAVEMAN
      type: 'predict',
      skill: 'markovnikov',
      part: 2,
      prompt: 'Substrate: <name new="1-methylcyclopentene" old="1-methylcyclopentene"></name>. Reagent: <b>H₂O, H₂SO₄ (cat.)</b>. What is the major product?',
      equation: {
        reactants: ['CC1=CCCC1'],
        products: [],
        cond: 'H₂O, H₂SO₄ (cat.)'
      },
      options: [
        {
          text: '<mol smiles="CC1=CCCC1"></mol>',
          why: 'This is still the alkene: nothing added. H₂O adds H and OH across the C=C.'
        },
        {
          text: '<mol smiles="CC1CCCC1"></mol>',
          why: 'This is the alkane: two H added and no O. Water adds H and OH, so the product has an OH.'
        },
        {
          text: '<mol smiles="CC1CCCC1O"></mol>',
          why: 'OH went on the carbon with MORE H (the one with fewer alkyl groups): that is anti-Markovnikov. H must go to the carbon with more H.'
        },
        {
          text: '<mol smiles="CC1(O)CCCC1"></mol>',
          correct: true,
          why: 'Yes. H adds to the carbon with more H, which leaves the + charge on the more substituted carbon: the tertiary (3°) carbocation (the more stable one). OH then bonds there.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The π bond attacks H₃O⁺, then water attacks the cation: H and OH add.<br><b>Q2, where:</b> H to the CH carbon; the + sits on the carbon with the CH₃ (3°); OH bonds there.<br><b>Q3, in space:</b> A flat cation, so either face (here the product has no stereocentre, so nothing shows).<br><b>Kind of product:</b> an <b>alcohol</b>, tertiary (1-methylcyclopentan-1-ol). <a href="#reactions/alkene-hydration">Open the hydration card</a>.',
      chk: { card: 'alkene-hydration', sub: 'CC1=CCCC1', v: 'H2O' },
      id: 's11'
    },
    {
      caveman: {"prompt":"<b>Anti additions.</b> <name new=\"(E)-but-2-ene\" old=\"(E)-2-butene\"></name> + <b>Br₂, CH₂Cl₂</b>: major product?","reveal":"<b>Q1:</b> Br₂: Br, Br add.<br><b>Q2:</b> One Br per carbon (no Markovnikov: groups alike).<br><b>Q3:</b> Bromonium, Br⁻ from back: anti. E alkene + anti: <b>meso</b> (Z alkene: racemate).<br><b>Kind:</b> <b>vicinal dibromide</b>, meso. <a href=\"#reactions/alkene-x2\">Open card</a>","options":[{"why":"Two H (alkane). Br₂: one Br per carbon."},{"why":"Other halogen. Br₂ adds Br."},{"why":"syn product: both Br SAME face. Br₂ adds anti."},{"why":"Yes. Br₂ adds anti: bromonium, Br⁻ from back."}]}, // CAVEMAN
      type: 'predict',
      skill: 'stereo-addition',
      part: 2,
      prompt: '<b>Anti additions.</b> Substrate: <name new="(E)-but-2-ene" old="(E)-2-butene"></name>. Reagent: <b>Br₂, CH₂Cl₂</b>. What is the major product?',
      equation: {
        reactants: ['C/C=C/C'],
        products: [],
        cond: 'Br₂, CH₂Cl₂'
      },
      options: [
        {
          text: '<mol smiles="CCCC"></mol>',
          why: 'This adds two H (the alkane). Br₂ puts one Br on EACH carbon of the C=C, no H.'
        },
        {
          text: '<mol smiles="C[C@H](Cl)[C@@H](C)Cl"></mol>',
          why: 'This carries the other halogen. The reagent is Br₂, so Br is the atom that adds.'
        },
        {
          text: '<mol smiles="C[C@@H](Br)[C@@H](C)Br"></mol>',
          why: 'This is the syn product: the two Br sit on the SAME face. Br₂ adds anti (opposite faces).'
        },
        {
          text: '<mol smiles="C[C@H](Br)[C@@H](C)Br"></mol>',
          correct: true,
          why: 'Yes. Br₂ adds anti: a bromonium ion forms, then Br⁻ attacks from the back face.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The π bond attacks a polarised Br₂: Br and Br add.<br><b>Q2, where:</b> One Br on each C=C carbon (no Markovnikov question: both groups are alike).<br><b>Q3, in space:</b> The bromonium ring covers one face, so Br⁻ comes from the back: anti. An E alkene plus anti addition gives the <b>meso</b> compound (a Z alkene would give a racemate).<br><b>Kind of product:</b> a <b>vicinal dibromide</b>, meso. <a href="#reactions/alkene-x2">Open the halogen addition card</a>.',
      chk: { card: 'alkene-x2', sub: 'C/C=C/C', v: 'Br2' },
      id: 's12'
    },
    {
      caveman: {"prompt":"<name new=\"(Z)-but-2-ene\" old=\"(Z)-2-butene\"></name> + <b>RCO₃H, then H₃O⁺</b>: major product?","reveal":"<b>Q1:</b> Epoxide, then water opens: OH, OH add.<br><b>Q2:</b> One OH per carbon.<br><b>Q3:</b> Water from back: anti. Z alkene + anti: <b>racemate</b> (ring: trans diol).<br><b>Kind:</b> <b>diol</b>, racemate. <a href=\"#reactions/alkene-epoxide-diol\">Open card</a>","options":[{"why":"Yes. Epoxide, H₃O⁺, water open from back: OH anti (trans on ring). (racemate: either drawing correct)"},{"why":"syn product: both OH SAME face. RCO₃H, then H₃O⁺ adds anti."},{"why":"Not just H₂: RCO₃H, H₃O⁺ adds OH, OH."},{"why":"Epoxide. RCO₃H, H₃O⁺ adds OH, OH, not epoxide."}]}, // CAVEMAN
      type: 'predict',
      skill: 'stereo-addition',
      part: 2,
      prompt: 'Substrate: <name new="(Z)-but-2-ene" old="(Z)-2-butene"></name>. Reagent: <b>RCO₃H, then H₃O⁺</b>. What is the major product?',
      equation: {
        reactants: ['C/C=C\\C'],
        products: [],
        cond: 'RCO₃H, then H₃O⁺'
      },
      options: [
        {
          text: '<mol smiles="C[C@H](O)[C@H](C)O"></mol>',
          correct: true,
          why: 'Yes. The peroxyacid makes the epoxide; H₃O⁺ and water open it from the back, so the two OH groups are anti (trans on a ring). (formed as a racemate: the mirror image forms equally, so either drawing is correct)'
        },
        {
          text: '<mol smiles="C[C@H](O)[C@@H](C)O"></mol>',
          why: 'This is the syn product: the two OH sit on the SAME face. RCO₃H, then H₃O⁺ adds anti (opposite faces).'
        },
        {
          text: '<mol smiles="CCCC"></mol>',
          why: 'This adds two H (the alkane). RCO₃H, then H₃O⁺ adds OH and OH, not just H₂.'
        },
        {
          text: '<mol smiles="C[C@@H]1O[C@@H]1C"></mol>',
          why: 'This has an O bridging the two carbons (an epoxide). RCO₃H, then H₃O⁺ adds OH and OH, not an epoxide.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The π bond attacks the electrophilic O of the peroxyacid (an epoxide forms); then water attacks the protonated epoxide: OH and OH add.<br><b>Q2, where:</b> One OH on each carbon (the epoxide O already bridged both).<br><b>Q3, in space:</b> Water attacks the ring from the back: anti. A Z alkene plus anti addition gives a <b>racemate</b> here (on a ring it would be the trans diol).<br><b>Kind of product:</b> a <b>diol</b> (trans on a ring), formed as a racemate. <a href="#reactions/alkene-epoxide-diol">Open the epoxide-then-acid card</a>.',
      chk: { card: 'alkene-epoxide-diol', sub: 'C/C=C\\C', v: 'RCO3H_H3O' },
      id: 's13'
    },
    {
      caveman: {"prompt":"<b>Syn additions, oxidations.</b> <name new=\"1,2-dimethylcyclopentene\" old=\"1,2-dimethylcyclopentene\"></name> + <b>H₂, Pd/C</b>: major product?","reveal":"<b>Q1:</b> H₂, alkene meet on metal surface: H, H add.<br><b>Q2:</b> One H per carbon (carbons end CH: no Markovnikov).<br><b>Q3:</b> Both H one surface: syn: CH₃ cis. Matching halves: <b>meso</b>.<br><b>Kind:</b> <b>alkane</b> (cis-1,2-dimethylcyclopentane). <a href=\"#reactions/alkene-h2-pd\">Open card</a>","options":[{"why":"Epoxide. H₂, Pd/C adds H, H."},{"why":"Two halogens: Br₂ (or Cl₂). H₂, Pd/C adds H, H."},{"why":"anti product: H OPPOSITE faces. H₂, Pd/C adds syn."},{"why":"Yes. H₂ adds syn: both H from catalyst surface. Ring: cis."}]}, // CAVEMAN
      type: 'predict',
      skill: 'stereo-addition',
      part: 2,
      prompt: '<b>Syn additions and oxidations.</b> Both pieces arrive together. Substrate: <name new="1,2-dimethylcyclopentene" old="1,2-dimethylcyclopentene"></name>. Reagent: <b>H₂, Pd/C</b>. What is the major product?',
      equation: {
        reactants: ['CC1=C(C)CCC1'],
        products: [],
        cond: 'H₂, Pd/C'
      },
      options: [
        {
          text: '<mol smiles="C[C@@]12CCC[C@]1(C)O2"></mol>',
          why: 'This has an O bridging the two carbons (an epoxide). H₂, Pd/C adds H and H, not an epoxide.'
        },
        {
          text: '<mol smiles="C[C@]1(Br)CCC[C@]1(C)Br"></mol>',
          why: 'Two halogens added: that is Br₂ (or Cl₂), not H₂, Pd/C. H₂, Pd/C adds H and H.'
        },
        {
          text: '<mol smiles="C[C@@H]1CCC[C@H]1C"></mol>',
          why: 'This is the anti product: the two H sit on OPPOSITE faces. H₂, Pd/C adds syn (the same face).'
        },
        {
          text: '<mol smiles="C[C@@H]1CCC[C@@H]1C"></mol>',
          correct: true,
          why: 'Yes. H₂ adds syn: both H atoms come from the catalyst surface, to the same face. On the ring the two new groups end up cis.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The alkene and H₂ meet on the metal surface: H and H add.<br><b>Q2, where:</b> One H on each C=C carbon (the carbons end up CH, so no Markovnikov question).<br><b>Q3, in space:</b> Both H come from the one surface: syn, so the two CH₃ end up cis. Two matching halves make it <b>meso</b>.<br><b>Kind of product:</b> an <b>alkane</b> (cis-1,2-dimethylcyclopentane). <a href="#reactions/alkene-h2-pd">Open the hydrogenation card</a>.',
      chk: { card: 'alkene-h2-pd', sub: 'CC1=C(C)CCC1', v: 'H2' },
      id: 's14'
    },
    {
      caveman: {"prompt":"<name new=\"cyclopentene\" old=\"cyclopentene\"></name> + <b>KMnO₄, OH⁻, H₂O</b>: major product?","reveal":"<b>Q1:</b> OH, OH add.<br><b>Q2:</b> One OH per carbon.<br><b>Q3:</b> Both O from one MnO₄⁻: syn: cis diol (meso).<br><b>Kind:</b> <b>cis diol</b>. <a href=\"#reactions/alkene-kmno4-base\">Open card</a>","options":[{"why":"Epoxide. KMnO₄, OH⁻, H₂O adds OH, OH."},{"why":"C=C cut: KMnO₄ in ACID. Base: C–C stays."},{"why":"anti product: OH OPPOSITE faces. KMnO₄, OH⁻, H₂O adds syn."},{"why":"Yes. KMnO₄ in base: both OH same face (syn): cis diol."}]}, // CAVEMAN
      type: 'predict',
      skill: 'stereo-addition',
      part: 2,
      prompt: 'Substrate: <name new="cyclopentene" old="cyclopentene"></name>. Reagent: <b>KMnO₄, OH⁻, H₂O</b>. What is the major product?',
      equation: {
        reactants: ['C1=CCCC1'],
        products: [],
        cond: 'KMnO₄, OH⁻, H₂O'
      },
      options: [
        {
          text: '<mol smiles="C1C[C@@H]2O[C@@H]2C1"></mol>',
          why: 'This has an O bridging the two carbons (an epoxide). KMnO₄, OH⁻, H₂O adds OH and OH, not an epoxide.'
        },
        {
          text: '<mol smiles="O=C(O)CCCC(=O)O"></mol>',
          why: 'The C=C is cut here, and that is KMnO₄ in ACID. In base the C–C bond stays and each carbon gains an OH.'
        },
        {
          text: '<mol smiles="O[C@H]1CCC[C@@H]1O"></mol>',
          why: 'This is the anti product: the two OH sit on OPPOSITE faces. KMnO₄, OH⁻, H₂O adds syn (the same face).'
        },
        {
          text: '<mol smiles="O[C@@H]1CCC[C@@H]1O"></mol>',
          correct: true,
          why: 'Yes. KMnO₄ in base puts both OH groups on the same face (syn): a cis diol on a ring.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The π bond attacks an Mn=O of permanganate (a cyclic intermediate): OH and OH add.<br><b>Q2, where:</b> One OH on each C=C carbon.<br><b>Q3, in space:</b> Both O arrive from one MnO₄⁻ at once: syn, so the diol is cis (and meso, two matching halves).<br><b>Kind of product:</b> a <b>cis diol</b>. <a href="#reactions/alkene-kmno4-base">Open the cold KMnO₄ card</a>.',
      chk: { card: 'alkene-kmno4-base', sub: 'C1=CCCC1', v: 'KMnO4_OH' },
      id: 's15'
    },
    {
      caveman: {"prompt":"<name new=\"(E)-pent-2-ene\" old=\"(E)-2-pentene\"></name> + <b>RCO₃H (e.g. mCPBA)</b>: major product?","reveal":"<b>Q1:</b> One O adds.<br><b>Q2:</b> Same O bonds both carbons.<br><b>Q3:</b> One face, one step: syn. Geometry kept: trans epoxide. Flat alkene: <b>racemate</b>.<br><b>Kind:</b> <b>epoxide</b>, trans. <a href=\"#reactions/alkene-epoxide\">Open card</a>","options":[{"why":"Yes. Peroxyacid: epoxide. Geometry kept: cis cis, trans trans. (racemate: either drawing correct)"},{"why":"Other geometry. trans stays trans, cis stays cis."},{"why":"Two halogens: Br₂ (or Cl₂), not RCO₃H (e.g. mCPBA). RCO₃H adds O."},{"why":"Diol. RCO₃H (e.g. mCPBA) adds O, bridging both carbons."}]}, // CAVEMAN
      type: 'predict',
      skill: 'stereo-addition',
      part: 2,
      prompt: 'Substrate: <name new="(E)-pent-2-ene" old="(E)-2-pentene"></name>. Reagent: <b>RCO₃H (e.g. mCPBA)</b>. What is the major product?',
      equation: {
        reactants: ['C/C=C/CC'],
        products: [],
        cond: 'RCO₃H (e.g. mCPBA)'
      },
      options: [
        {
          text: '<mol smiles="CC[C@@H]1O[C@H]1C"></mol>',
          correct: true,
          why: 'Yes. A peroxyacid gives an epoxide (one O across the C=C). The alkene geometry is kept: a cis alkene gives a cis epoxide, a trans alkene a trans one. (formed as a racemate: the mirror image forms equally, so either drawing is correct)'
        },
        {
          text: '<mol smiles="CC[C@@H]1O[C@@H]1C"></mol>',
          why: 'This epoxide has the other geometry. The O joins one face of the C=C, so trans stays trans and cis stays cis.'
        },
        {
          text: '<mol smiles="CC[C@H](Br)[C@@H](C)Br"></mol>',
          why: 'Two halogens added: that is Br₂ (or Cl₂), not RCO₃H (e.g. mCPBA). RCO₃H (e.g. mCPBA) adds O (one atom, bridging both carbons).'
        },
        {
          text: '<mol smiles="CC[C@@H](O)[C@@H](C)O"></mol>',
          why: 'This has an OH on each carbon (a diol). RCO₃H (e.g. mCPBA) adds O (one atom, bridging both carbons).'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The π bond attacks the electrophilic O of the peroxyacid: one O adds.<br><b>Q2, where:</b> The same O bonds to both C=C carbons.<br><b>Q3, in space:</b> The O arrives from one face in one step: syn. The geometry is kept: trans alkene, trans epoxide. Two stereocentres from a flat alkene: a <b>racemate</b>.<br><b>Kind of product:</b> an <b>epoxide</b>, trans. <a href="#reactions/alkene-epoxide">Open the peroxyacid epoxide card</a>.',
      chk: { card: 'alkene-epoxide', sub: 'C/C=C/CC', v: 'RCO3H' },
      id: 's16'
    },
    {
      caveman: {"prompt":"<name new=\"1-methylcyclohexene\" old=\"1-methylcyclohexene\"></name> + <b>1) BH₃ · THF  2) H₂O₂, NaOH</b>: major product?","reveal":"<b>Q1:</b> B, H add; H₂O₂ swaps B for OH.<br><b>Q2:</b> REVERSED: OH on carbon with MORE H. No cation.<br><b>Q3:</b> One face (syn): OH trans to CH₃, racemate.<br><b>Kind:</b> <b>alcohol</b>, trans. <a href=\"#reactions/alkene-hydroboration\">Open card</a>","options":[{"why":"Yes. OH on carbon with MORE H (anti-Markovnikov). Same face: OH trans to CH₃."},{"why":"Markovnikov alcohol (H₂O, H₂SO₄). Hydroboration: OH on MORE H carbon."},{"why":"Only H₂. Hydroboration: H and OH."},{"why":"OH cis to CH₃. Same face: OH trans."}]}, // CAVEMAN
      type: 'predict',
      skill: 'predict-product',
      part: 2,
      prompt: 'Substrate: <name new="1-methylcyclohexene" old="1-methylcyclohexene"></name>. Reagent: <b>1) BH₃ · THF  2) H₂O₂, NaOH</b>. What is the major product?',
      equation: {
        reactants: ['CC1=CCCCC1'],
        products: [],
        cond: '1) BH₃ · THF  2) H₂O₂, NaOH'
      },
      options: [
        {
          text: '<mol smiles="C[C@H]1CCCC[C@@H]1O"></mol>',
          correct: true,
          why: 'Yes. The OH goes on the carbon with MORE H (anti-Markovnikov). H and OH add to the same face, so the OH ends up trans to the CH₃.'
        },
        {
          text: '<mol smiles="CC1(O)CCCCC1"></mol>',
          why: 'That is the Markovnikov alcohol, the one H₂O with H₂SO₄ gives. Hydroboration puts the OH on the carbon with MORE H.'
        },
        {
          text: '<mol smiles="CC1CCCCC1"></mol>',
          why: 'That only adds H₂. Hydroboration adds one H and one OH across the C=C.'
        },
        {
          text: '<mol smiles="C[C@H]1CCCC[C@H]1O"></mol>',
          why: 'The atoms are right, but the OH is cis to the CH₃. H and OH add to the same face, so the OH ends up trans to the CH₃.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The π bond is rich and the B of BH₃ is poor (an empty orbital): B and H add, then H₂O₂ swaps B for OH.<br><b>Q2, where:</b> REVERSED: B goes to the less crowded carbon (the carbon with more H), so OH ends up on the carbon with MORE H. No cation forms.<br><b>Q3, in space:</b> B and H arrive together on one face (syn), so the OH ends up trans to the CH₃ here, as a racemate.<br><b>Kind of product:</b> an <b>alcohol</b>, trans. <a href="#reactions/alkene-hydroboration">Open the hydroboration card</a>.',
      chk: { card: 'alkene-hydroboration', sub: 'CC1=CCCCC1', v: 'fixed' },
      id: 's17'
    },
    {
      caveman: {"prompt":"<name new=\"2-methylpent-2-ene\" old=\"2-methyl-2-pentene\"></name> + <b>KMnO₄, H₃O⁺</b>: major product(s)?","reveal":"<b>Q1:</b> Oxidant cuts C=C: each end gains O.<br><b>Q2:</b> H count: =CR₂ ketone, =CHR carboxylic acid (=CH₂: CO₂).<br><b>Q3:</b> C=C gone.<br><b>Kind:</b> <b>ketone</b>, <b>carboxylic acid</b>. <a href=\"#reactions/alkene-kmno4-acid\">Open KMnO₄ card</a>","options":[{"why":"C=C still there. KMnO₄, H₃O⁺ adds O, uses up C=C."},{"why":"Epoxide. KMnO₄, H₃O⁺ adds O to each end, not epoxide."},{"why":"Diol. KMnO₄, H₃O⁺ cuts C=C in acid."},{"why":"KMnO₄ in acid cuts C=C: =CR₂ ketone, =CHR acid, =CH₂ CO₂."}]}, // CAVEMAN
      type: 'predict',
      skill: 'alkene-oxidation',
      part: 2,
      prompt: 'Substrate: <name new="2-methylpent-2-ene" old="2-methyl-2-pentene"></name>. Reagent: <b>KMnO₄, H₃O⁺</b>. What is the major product (or products)?',
      equation: {
        reactants: ['CCC=C(C)C'],
        products: [],
        cond: 'KMnO₄, H₃O⁺'
      },
      options: [
        {
          text: '<mol smiles="CCC=C(C)C"></mol>',
          why: 'The C=C is still there, so nothing added. KMnO₄, H₃O⁺ adds O (each end of the old C=C gains O), which uses up the C=C.'
        },
        {
          text: '<mol smiles="CCC1OC1(C)C"></mol>',
          why: 'This has an O bridging the two carbons (an epoxide). KMnO₄, H₃O⁺ adds O (each end of the old C=C gains O), not an epoxide.'
        },
        {
          text: '<mol smiles="CCC(O)C(C)(C)O"></mol>',
          why: 'This has an OH on each carbon (a diol). KMnO₄, H₃O⁺ cuts the C=C in acid, so the diol is not the product.'
        },
        {
          text: '<mol smiles="CC(C)=O.CCC(=O)O"></mol>',
          correct: true,
          why: 'Yes. KMnO₄ in acid cuts the C=C: =CR₂ becomes a ketone, =CHR a carboxylic acid, =CH₂ becomes CO₂.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The C=C is attacked by the oxidant and cut: each end gains O.<br><b>Q2, where:</b> Count H on each carbon: =CR₂ gives a ketone, =CHR a carboxylic acid (=CH₂ would give CO₂).<br><b>Q3, in space:</b> Nothing to show: the C=C is gone.<br><b>Kind of product:</b> a <b>ketone</b> and a <b>carboxylic acid</b>. <a href="#reactions/alkene-kmno4-acid">Open the hot KMnO₄ card</a>.',
      chk: { card: 'alkene-kmno4-acid', sub: 'CCC=C(C)C', v: 'KMnO4_H' },
      id: 's18'
    },
    {
      caveman: {"prompt":"Lab, alkenes. Pick alkene, reagent, run Q1, Q2, Q3, predict BEFORE answer. Three right, three reagents.","worked":"1-Methylcyclohexene + HBr: tertiary bromide. Cyclopentene + Br₂: trans racemate; + KMnO₄ (base): cis diol. Hexene + KMnO₄ (acid): pentanoic acid, CO₂.","hints":["HX/H₂O: H + X or OH; Br₂ two Br; H₂ two H; peroxyacid O; KMnO₄: base two OH, acid cuts.","Markovnikov (HX, water). Faces: anti (Br₂, epoxide-then-acid); syn (H₂, epoxide, KMnO₄ base)."]}, // CAVEMAN
      type: 'try',
      skill: 'predict-product',
      widget: 'reaction-lab',
      part: 2,
      prompt: 'Your turn in the lab with alkenes. Pick an alkene and a reagent, run Q1, Q2 and Q3 in your head, then predict BEFORE the lab shows the answer. Get three predictions right, using at least three different reagents.',
      config: {
        need: 3,
        alkenes: [
          'cyclopentene',
          '1-methylcyclohexene',
          '2-methylpropene',
          'hex-1-ene',
          '2-methylbut-2-ene'
        ],
        reagents: ['HBr', 'H2O', 'Br2', 'H2', 'RCO3H', 'RCO3H_H3O', 'KMnO4_OH', 'KMnO4_H']
      },
      confirm: 'Three right. Each time you named what adds (Q1), where it goes (Q2) and the faces (Q3) before looking.',
      hints: [
        'Name the reagent’s job first: HX or H₂O add H + X or OH; Br₂ adds two Br; H₂ two H; a peroxyacid one O; KMnO₄ in base two OH, in acid it cuts.',
        'Then pick the orientation (Markovnikov for HX and water) and the faces (anti for Br₂ and the epoxide-then-acid route, syn for H₂, the epoxide and KMnO₄ in base).'
      ],
      worked: 'For example: 1-methylcyclohexene + HBr gives the tertiary bromide; cyclopentene + Br₂ gives the trans dibromide (a racemate); cyclopentene + KMnO₄ in base gives the cis diol; hex-1-ene + KMnO₄ in acid is cut to pentanoic acid and CO₂.',
      id: 's19'
    },
    {
      caveman: {"html":"<p><b>Alkene products.</b> H + X: alkyl halide. H + OH: alcohol. OH + OH: diol (cis: KMnO₄, base; trans: epoxide). O across C=C: epoxide. H + H: alkane. Cut: ketones, acids. Br₂ anti; H₂ syn. Flat reagents: racemate; matching halves: meso.</p>"}, // CAVEMAN
      type: 'explain',
      skill: 'predict-product',
      part: 2,
      html: '<p><b>Alkene product kinds.</b> H + X: an alkyl halide. H + OH: an alcohol. OH + OH: a diol (cis from cold KMnO₄ in base, trans from the epoxide route). One O across the C=C: an epoxide. H + H: an alkane. C=C cut: ketones and acids. Then the faces: flat cation, either; Br₂, anti; H₂, syn. A chiral product from flat reagents is a racemate; two matching halves are meso.</p>',
      id: 's20'
    },
    {
      caveman: {"prompt":"<b>Alkynes.</b> Count equivalents. <name new=\"pent-1-yne\" old=\"1-pentyne\"></name> + <b>HBr (1 equiv.)</b>: major product?","reveal":"<b>Q1:</b> H, Br add, once.<br><b>Q2:</b> H to carbon with H; Br to more substituted (Markovnikov).<br><b>Q3:</b> New C=C has =CH₂ end: no E/Z.<br><b>Kind:</b> <b>vinylic halide</b> (2-bromopent-1-ene). <a href=\"#reactions/alkyne-hx-1\">Open card</a>","options":[{"why":"Other halogen. HBr (1 equiv.) adds Br."},{"why":"Two Br on one carbon: needs SECOND HBr. One equivalent stops at vinylic halide."},{"why":"Br on END carbon: anti-Markovnikov."},{"why":"Yes. Markovnikov; one equivalent stops at vinylic halide."}]}, // CAVEMAN
      type: 'predict',
      skill: 'alkynes',
      part: 2,
      prompt: '<b>Alkynes.</b> Two π bonds: count the equivalents. Substrate: <name new="pent-1-yne" old="1-pentyne"></name>. Reagent: <b>HBr (1 equiv.)</b>. What is the major product?',
      equation: {
        reactants: ['CCCC#C'],
        products: [],
        cond: 'HBr (1 equiv.)'
      },
      options: [
        {
          text: '<mol smiles="C=C(Cl)CCC"></mol>',
          why: 'This carries a different halogen. The reagent is HBr (1 equiv.), so Br is the atom that adds.'
        },
        {
          text: '<mol smiles="CCCC(C)(Br)Br"></mol>',
          why: 'This has two Br on one carbon: it needs a SECOND HBr. With 1 equivalent the reaction stops at the vinylic halide (one Br, a C=C left).'
        },
        {
          text: '<mol smiles="CCCC=CBr"></mol>',
          why: 'Br went on the END carbon: that is anti-Markovnikov. H goes to the carbon that already has H, Br to the carbon with more alkyl groups.'
        },
        {
          text: '<mol smiles="C=C(Br)CCC"></mol>',
          correct: true,
          why: 'Yes. H adds to the carbon that has the H and Br to the more substituted carbon (Markovnikov), and the reaction stops at the vinylic halide with 1 equivalent.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The π bond is rich, the H of HBr is poor: H and Br add, once.<br><b>Q2, where:</b> H to the carbon that already has the H; Br to the more substituted carbon (the same Markovnikov idea).<br><b>Q3, in space:</b> Nothing marked: the new C=C has =CH₂ on one end, so there is no E/Z.<br><b>Kind of product:</b> a <b>vinylic halide</b> (2-bromopent-1-ene). <a href="#reactions/alkyne-hx-1">Open the alkyne HX (1 equivalent) card</a>.',
      chk: { card: 'alkyne-hx-1', sub: 'CCCC#C', v: 'HBr_1' },
      id: 's21'
    },
    {
      caveman: {"prompt":"<name new=\"but-1-yne\" old=\"1-butyne\"></name> + <b>HCl (2 equiv.)</b>: major product?","reveal":"<b>Q1:</b> Second HCl: H, Cl again.<br><b>Q2:</b> Second Cl on carbon already with Cl (lone pair helps carry +): both Cl same carbon.<br><b>Q3:</b> Two identical Cl: not stereocentre.<br><b>Kind:</b> <b>geminal dihalide</b> (2,2-dichlorobutane). <a href=\"#reactions/alkyne-hx-2\">Open card</a>","options":[{"why":"Other halogen. HCl (2 equiv.) adds Cl."},{"why":"One Cl (vinylic halide). Two equivalents: second HCl adds."},{"why":"Cl on different carbons. Second HCl Markovnikov: both Cl SAME carbon."},{"why":"Yes. Second H–Cl Markovnikov, to carbon already with Cl: both Cl same carbon (geminal dihalide)."}]}, // CAVEMAN
      type: 'predict',
      skill: 'alkynes',
      part: 2,
      prompt: 'Substrate: <name new="but-1-yne" old="1-butyne"></name>. Reagent: <b>HCl (2 equiv.)</b>. What is the major product?',
      equation: {
        reactants: ['CCC#C'],
        products: [],
        cond: 'HCl (2 equiv.)'
      },
      options: [
        {
          text: '<mol smiles="CCC(C)(Br)Br"></mol>',
          why: 'This carries a different halogen. The reagent is HCl (2 equiv.), so Cl is the atom that adds.'
        },
        {
          text: '<mol smiles="C=C(Cl)CC"></mol>',
          why: 'This has only one Cl (the vinylic halide, a C=C is left). With 2 equivalents a second HCl adds across it.'
        },
        {
          text: '<mol smiles="CCC(Cl)CCl"></mol>',
          why: 'The two Cl are on different carbons. The second HCl adds Markovnikov too, so both Cl end up on the SAME carbon (a geminal dihalide).'
        },
        {
          text: '<mol smiles="CCC(C)(Cl)Cl"></mol>',
          correct: true,
          why: 'Yes. The first H–Cl makes the vinylic halide; a second one adds Markovnikov again, to the carbon that already carries Cl. Both Cl atoms end up on the same carbon (a geminal dihalide).'
        }
      ],
      reveal: '<b>Q1, what adds:</b> A second HCl adds to the new C=C: H and Cl again.<br><b>Q2, where:</b> The second Cl goes to the carbon that already carries Cl (a lone pair on Cl helps carry the +): both Cl on the same carbon.<br><b>Q3, in space:</b> Nothing to show: the carbon with two Cl has two identical groups, so it is not a stereocentre.<br><b>Kind of product:</b> a <b>geminal dihalide</b> (2,2-dichlorobutane). <a href="#reactions/alkyne-hx-2">Open the alkyne HX (2 equivalents) card</a>.',
      chk: { card: 'alkyne-hx-2', sub: 'CCC#C', v: 'HCl_2' },
      id: 's22'
    },
    {
      caveman: {"prompt":"<name new=\"but-2-yne\" old=\"2-butyne\"></name> + <b>Br₂ (1 equiv.)</b>: major product?","reveal":"<b>Q1:</b> Br₂: Br, Br add, once.<br><b>Q2:</b> One Br per triple-bond carbon.<br><b>Q3:</b> Bromonium: anti: Br trans, (E).<br><b>Kind:</b> <b>trans dihaloalkene</b>. <a href=\"#reactions/alkyne-x2-1\">Open X₂ card</a>","options":[{"why":"Other halogen. Br₂ (1 equiv.) adds Br."},{"why":"Four Br: 2 equivalents Br₂."},{"why":"Both Br SAME side (cis). Br₂ adds anti."},{"why":"Yes. Br₂ adds ANTI: Br opposite sides: (E). One equivalent stops at dihaloalkene."}]}, // CAVEMAN
      type: 'predict',
      skill: 'alkynes',
      part: 2,
      prompt: 'Substrate: <name new="but-2-yne" old="2-butyne"></name>. Reagent: <b>Br₂ (1 equiv.)</b>. What is the major product?',
      equation: {
        reactants: ['CC#CC'],
        products: [],
        cond: 'Br₂ (1 equiv.)'
      },
      options: [
        {
          text: '<mol smiles="C/C(Cl)=C(/C)Cl"></mol>',
          why: 'This carries a different halogen. The reagent is Br₂ (1 equiv.), so Br is the atom that adds.'
        },
        {
          text: '<mol smiles="CC(Br)(Br)C(C)(Br)Br"></mol>',
          why: 'Four Br added: that is 2 equivalents of Br₂. With 1 equivalent only one Br₂ adds.'
        },
        {
          text: '<mol smiles="C/C(Br)=C(\\C)Br"></mol>',
          why: 'Both Br are on the SAME side of the C=C (cis). Br₂ adds anti to an alkyne, so the two Br end up trans.'
        },
        {
          text: '<mol smiles="C/C(Br)=C(/C)Br"></mol>',
          correct: true,
          why: 'Yes. Br₂ adds ANTI: the two Br atoms go on opposite sides of the new C=C, which gives the (E) isomer. One equivalent stops at the dihaloalkene.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The π bond attacks a polarised Br₂: Br and Br add, once.<br><b>Q2, where:</b> One Br on each triple-bond carbon.<br><b>Q3, in space:</b> The bromonium route again: anti, so the two Br are trans, the (E) isomer.<br><b>Kind of product:</b> a <b>trans dihaloalkene</b>. <a href="#reactions/alkyne-x2-1">Open the alkyne X₂ (1 equivalent) card</a>.',
      chk: { card: 'alkyne-x2-1', sub: 'CC#CC', v: 'Br2_1' },
      id: 's23'
    },
    {
      caveman: {"prompt":"<name new=\"pent-1-yne\" old=\"1-pentyne\"></name> + <b>Br₂ (2 equiv.)</b>: major product?","reveal":"<b>Q1:</b> Both π bonds add Br₂: four Br.<br><b>Q2:</b> Two Br per carbon.<br><b>Q3:</b> Two Br: not stereocentre.<br><b>Kind:</b> <b>tetrahalide</b> (1,1,2,2-tetrabromopentane). <a href=\"#reactions/alkyne-x2-2\">Open X₂ card</a>","options":[{"why":"Other halogen. Br₂ (2 equiv.) adds Br."},{"why":"One Br₂ only (C=C left). Two equivalents: second Br₂."},{"why":"One Br₂ only (C=C left). Two equivalents: second Br₂."},{"why":"Yes. Two equivalents Br₂ add to both π bonds: two Br per carbon (tetrahalide)."}]}, // CAVEMAN
      type: 'predict',
      skill: 'alkynes',
      part: 2,
      prompt: 'Substrate: <name new="pent-1-yne" old="1-pentyne"></name>. Reagent: <b>Br₂ (2 equiv.)</b>. What is the major product?',
      equation: {
        reactants: ['CCCC#C'],
        products: [],
        cond: 'Br₂ (2 equiv.)'
      },
      options: [
        {
          text: '<mol smiles="CCCC(Cl)(Cl)C(Cl)Cl"></mol>',
          why: 'This carries a different halogen. The reagent is Br₂ (2 equiv.), so Br is the atom that adds.'
        },
        {
          text: '<mol smiles="CCC/C(Br)=C/Br"></mol>',
          why: 'This has only one Br₂ added (a C=C is left). With 2 equivalents a second Br₂ adds across it.'
        },
        {
          text: '<mol smiles="CCC/C(Br)=C\\Br"></mol>',
          why: 'This has only one Br₂ added (a C=C is left). With 2 equivalents a second Br₂ adds across it.'
        },
        {
          text: '<mol smiles="CCCC(Br)(Br)C(Br)Br"></mol>',
          correct: true,
          why: 'Yes. Two equivalents of Br₂ add to both π bonds: each carbon ends with two Br atoms (a 1,1,2,2-tetrahalide, shown without stereochemistry).'
        }
      ],
      reveal: '<b>Q1, what adds:</b> Both π bonds add Br₂: four Br in all.<br><b>Q2, where:</b> Two Br on each triple-bond carbon.<br><b>Q3, in space:</b> Nothing to show: a carbon with two Br is not a stereocentre.<br><b>Kind of product:</b> a <b>tetrahalide</b> (1,1,2,2-tetrabromopentane). <a href="#reactions/alkyne-x2-2">Open the alkyne X₂ (2 equivalents) card</a>.',
      chk: { card: 'alkyne-x2-2', sub: 'CCCC#C', v: 'Br2_2' },
      id: 's24'
    },
    {
      caveman: {"prompt":"<name new=\"pent-1-yne\" old=\"1-pentyne\"></name> + <b>H₂O, H₂SO₄, HgSO₄</b>: major product?","reveal":"<b>Q1:</b> Hg²⁺ attacked, then water: H, OH add, as enol.<br><b>Q2:</b> Markovnikov: OH on more substituted carbon. Enol flips to C=O there: methyl ketone.<br><b>Q3:</b> Enol tautomerises.<br><b>Kind:</b> <b>ketone</b> (pentan-2-one), not aldehyde. <a href=\"#reactions/alkyne-hydration\">Open card</a>","options":[{"why":"Alkene, no O. Hydration adds H, OH: C=O (enol flips)."},{"why":"Enol flips to ketone at once."},{"why":"C=O on END carbon (anti-Markovnikov). Terminal alkyne: methyl ketone, never aldehyde."},{"why":"Yes. Markovnikov OH, enol tautomerises: C=O there: methyl ketone."}]}, // CAVEMAN
      type: 'predict',
      skill: 'alkynes',
      part: 2,
      prompt: 'Substrate: <name new="pent-1-yne" old="1-pentyne"></name>. Reagent: <b>H₂O, H₂SO₄, HgSO₄</b>. What is the major product?',
      equation: {
        reactants: ['CCCC#C'],
        products: [],
        cond: 'H₂O, H₂SO₄, HgSO₄'
      },
      options: [
        {
          text: '<mol smiles="C=CCCC"></mol>',
          why: 'This alkene has no O. Hydration adds H and OH, so the product has a C=O (after the enol flips).'
        },
        {
          text: '<mol smiles="C=C(O)CCC"></mol>',
          why: 'This is the enol (C=C–OH). It flips to the ketone at once, so the ketone is the product you isolate.'
        },
        {
          text: '<mol smiles="CCCCC=O"></mol>',
          why: 'The C=O is on the END carbon (anti-Markovnikov). Alkyne hydration puts the OH on the more substituted carbon, so a terminal alkyne gives a methyl ketone, never an aldehyde.'
        },
        {
          text: '<mol smiles="CCCC(C)=O"></mol>',
          correct: true,
          why: 'Yes. OH goes to the more substituted carbon (Markovnikov), the enol tautomerises, and the C=O ends up on that carbon: a methyl ketone.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The π bond attacks Hg²⁺ and water attacks: H and OH add, as an enol.<br><b>Q2, where:</b> Markovnikov: OH on the more substituted carbon. The enol flips to C=O on that carbon, so a terminal alkyne gives a methyl ketone.<br><b>Q3, in space:</b> Nothing to show: the enol tautomerises to C=O.<br><b>Kind of product:</b> a <b>ketone</b> (pentan-2-one), not an aldehyde. <a href="#reactions/alkyne-hydration">Open the alkyne hydration card</a>.',
      chk: { card: 'alkyne-hydration', sub: 'CCCC#C', v: 'H2O_Hg' },
      id: 's25'
    },
    {
      caveman: {"prompt":"<name new=\"oct-4-yne\" old=\"4-octyne\"></name> + <b>H₂, Lindlar catalyst</b>: major product?","reveal":"<b>Q1:</b> H₂, alkyne meet on poisoned Pd: H, H add.<br><b>Q2:</b> One H per carbon.<br><b>Q3:</b> Both H one surface: syn: (Z) alkene.<br><b>Kind:</b> <b>cis alkene</b>. <a href=\"#reactions/alkyne-lindlar\">Open card</a>","options":[{"why":"C=O: hydration. H₂, Lindlar adds only H."},{"why":"Alkane. H₂, Lindlar stops before alkane."},{"why":"trans alkene. Lindlar adds both H syn: cis (Z)."},{"why":"Yes. Lindlar stops at alkene; both H same face (syn): cis (Z)."}]}, // CAVEMAN
      type: 'predict',
      skill: 'alkynes',
      part: 2,
      prompt: 'Substrate: <name new="oct-4-yne" old="4-octyne"></name>. Reagent: <b>H₂, Lindlar catalyst</b>. What is the major product?',
      equation: {
        reactants: ['CCCC#CCCC'],
        products: [],
        cond: 'H₂, Lindlar catalyst'
      },
      options: [
        {
          text: '<mol smiles="CCCCC(=O)CCC"></mol>',
          why: 'This has a C=O, so it is the hydration product. H₂, Lindlar catalyst adds only H, no O.'
        },
        {
          text: '<mol smiles="CCCCCCCC"></mol>',
          why: 'This is the alkane (two H₂ added). H₂, Lindlar catalyst stops before the alkane.'
        },
        {
          text: '<mol smiles="CCC/C=C/CCC"></mol>',
          why: 'This is the trans alkene. Lindlar adds both H on the SAME face (syn), so the alkene is cis (Z).'
        },
        {
          text: '<mol smiles="CCC/C=C\\CCC"></mol>',
          correct: true,
          why: 'Yes. The Lindlar catalyst stops at the alkene, and both H atoms add to the same face (syn), so the two alkyl groups are on the same side: the cis (Z) alkene.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The alkyne and H₂ meet on the poisoned Pd surface: H and H add, once.<br><b>Q2, where:</b> One H on each triple-bond carbon.<br><b>Q3, in space:</b> Both H come from the one surface: syn, so the alkyl groups end up on the same side: the (Z) alkene.<br><b>Kind of product:</b> a <b>cis alkene</b>. <a href="#reactions/alkyne-lindlar">Open the Lindlar card</a>.',
      chk: { card: 'alkyne-lindlar', sub: 'CCCC#CCCC', v: 'H2_Lindlar' },
      id: 's26'
    },
    {
      caveman: {"prompt":"<name new=\"pent-2-yne\" old=\"2-pentyne\"></name> + <b>H₂ (2 equiv.), Pd/C</b>: major product?","reveal":"<b>Q1:</b> Two H₂ add: four H.<br><b>Q2:</b> Both carbons end CH₂.<br><b>Q3:</b> Alkane: no E/Z, no stereocentre.<br><b>Kind:</b> <b>alkane</b> (pentane). <a href=\"#reactions/alkyne-h2-pd\">Open card</a>","options":[{"why":"Alkyne unchanged: nothing added (H₂, Pd/C)."},{"why":"Stops at alkene. H₂, Pd/C goes on: alkane."},{"why":"Stops at alkene. H₂, Pd/C goes on: alkane."},{"why":"Yes. Pd/C, 2 equivalents H₂: both π bonds: alkane."}]}, // CAVEMAN
      type: 'predict',
      skill: 'alkynes',
      part: 2,
      prompt: 'Substrate: <name new="pent-2-yne" old="2-pentyne"></name>. Reagent: <b>H₂ (2 equiv.), Pd/C</b>. What is the major product?',
      equation: {
        reactants: ['CC#CCC'],
        products: [],
        cond: 'H₂ (2 equiv.), Pd/C'
      },
      options: [
        {
          text: '<mol smiles="CC#CCC"></mol>',
          why: 'This is still the alkyne: nothing added. H₂ (2 equiv.), Pd/C uses up a π bond.'
        },
        {
          text: '<mol smiles="C/C=C/CC"></mol>',
          why: 'This stops at the alkene. H₂ with Pd/C does not stop there: a second H₂ adds and the alkane forms.'
        },
        {
          text: '<mol smiles="C/C=C\\CC"></mol>',
          why: 'This stops at the alkene. H₂ with Pd/C does not stop there: a second H₂ adds and the alkane forms.'
        },
        {
          text: '<mol smiles="CCCCC"></mol>',
          correct: true,
          why: 'Yes. With Pd/C and 2 equivalents of H₂, both π bonds are hydrogenated: the alkane.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> Two H₂ add: four H in all.<br><b>Q2, where:</b> Both triple-bond carbons end up CH₂.<br><b>Q3, in space:</b> Nothing to show: the alkane has no E/Z or stereocentre.<br><b>Kind of product:</b> an <b>alkane</b> (pentane). <a href="#reactions/alkyne-h2-pd">Open the alkyne H₂/Pd card</a>.',
      chk: { card: 'alkyne-h2-pd', sub: 'CC#CCC', v: 'H2_Pd' },
      id: 's27'
    },
    {
      caveman: {"prompt":"<name new=\"pent-1-yne\" old=\"1-pentyne\"></name> + <b>NaNH₂, then CH₃Br</b>: major product?","reveal":"<b>Q1:</b> NH₂⁻ takes ≡C–H. Acetylide attacks δ+ carbon of CH₃Br: new C–C bond.<br><b>Q2:</b> On terminal carbon.<br><b>Q3:</b> Longer alkyne.<br><b>Kind:</b> <b>longer alkyne</b> (hex-2-yne). <a href=\"#reactions/alkyne-acetylide\">Open card</a>","options":[{"why":"Wrong R. R: the one in CH₃Br."},{"why":"Wrong R. R: the one in CH₃Br."},{"why":"Group next to triple bond. NaNH₂ removes only ≡C–H: R on triple-bond carbon."},{"why":"Yes. NaNH₂ removes ≡C–H, acetylide attacks R–Br: chain grows."}]}, // CAVEMAN
      type: 'predict',
      skill: 'acetylides',
      part: 2,
      prompt: 'Substrate: <name new="pent-1-yne" old="1-pentyne"></name>. Reagent: <b>NaNH₂, then CH₃Br</b>. What is the major product?',
      equation: {
        reactants: ['CCCC#C'],
        products: [],
        cond: 'NaNH₂, then CH₃Br'
      },
      options: [
        {
          text: '<mol smiles="CCCC#CCCC"></mol>',
          why: 'This has the wrong R group. The R that adds is the one in CH₃Br.'
        },
        {
          text: '<mol smiles="CCC#CCCC"></mol>',
          why: 'This has the wrong R group. The R that adds is the one in CH₃Br.'
        },
        {
          text: '<mol smiles="C#CC(C)CC"></mol>',
          why: 'The new carbon group is on the carbon next to the triple bond. NaNH₂ removes only the ≡C–H, so R attaches to the triple-bond carbon.'
        },
        {
          text: '<mol smiles="CC#CCCC"></mol>',
          correct: true,
          why: 'Yes. NaNH₂ removes the terminal ≡C–H, and the acetylide anion attacks the alkyl bromide, so the chain grows by the carbons of R–Br.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> NH₂⁻ is rich: it takes the ≡C–H. The acetylide is now the rich partner and attacks the δ+ carbon of CH₃Br: a new C–C bond.<br><b>Q2, where:</b> On the carbon that had the acidic H (the terminal one).<br><b>Q3, in space:</b> Nothing to show: the product is a longer alkyne.<br><b>Kind of product:</b> a <b>longer alkyne</b> (hex-2-yne), an internal alkyne. <a href="#reactions/alkyne-acetylide">Open the acetylide card</a>.',
      chk: { card: 'alkyne-acetylide', sub: 'CCCC#C', v: 'acetylide', halide: 'CBr' },
      id: 's28'
    },
    {
      caveman: {"prompt":"<name new=\"hex-1-yne\" old=\"1-hexyne\"></name> + <b>1) BH₃  2) H₂O₂, NaOH</b>: major product?","reveal":"<b>Q1:</b> B, H add; H₂O₂ swaps B for OH (enol).<br><b>Q2:</b> REVERSED: OH on END carbon. Enol flips to C=O.<br><b>Q3:</b> Enol tautomerises.<br><b>Kind:</b> <b>aldehyde</b> (hexanal); Hg²⁺, water gave ketone. <a href=\"#reactions/alkyne-hydroboration\">Open card</a>","options":[{"why":"Two extra H. Hydroboration: one H, one OH; enol becomes C=O."},{"why":"Enol only intermediate: tautomerises to C=O."},{"why":"Methyl ketone: Hg²⁺ with H₂O. Hydroboration: OH on END carbon."},{"why":"Yes. B, then OH, on END carbon (anti-Markovnikov). Enol tautomerises: aldehyde."}]}, // CAVEMAN
      type: 'predict',
      skill: 'predict-product',
      part: 2,
      prompt: 'Substrate: <name new="hex-1-yne" old="1-hexyne"></name>. Reagent: <b>1) BH₃  2) H₂O₂, NaOH</b>. What is the major product?',
      equation: {
        reactants: ['CCCCC#C'],
        products: [],
        cond: '1) BH₃  2) H₂O₂, NaOH'
      },
      options: [
        {
          text: '<mol smiles="CCCCCCO"></mol>',
          why: 'That adds two extra H atoms. Hydroboration adds one H and one OH across the triple bond, and the enol then becomes the C=O.'
        },
        {
          text: '<mol smiles="CCCCC=CO"></mol>',
          why: 'An enol (C=C–OH) is only the intermediate. It tautomerises to the C=O, so it is not the product you isolate.'
        },
        {
          text: '<mol smiles="CCCCC(C)=O"></mol>',
          why: 'That is the methyl ketone. It comes from Hg²⁺ with H₂O, where the OH goes on the inner carbon. Hydroboration puts the OH on the END carbon.'
        },
        {
          text: '<mol smiles="CCCCCC=O"></mol>',
          correct: true,
          why: 'Yes. B, and then OH, go on the END carbon (anti-Markovnikov). The enol tautomerises, so a terminal alkyne gives an aldehyde.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The π bond is rich, the B is poor: B and H add, then H₂O₂ swaps B for OH (an enol).<br><b>Q2, where:</b> REVERSED: OH on the END carbon. The enol flips to C=O on that carbon.<br><b>Q3, in space:</b> Nothing to show: the enol tautomerises.<br><b>Kind of product:</b> an <b>aldehyde</b> from a terminal alkyne (hexanal), where Hg²⁺ and water gave the ketone. <a href="#reactions/alkyne-hydroboration">Open the alkyne hydroboration card</a>.',
      chk: { card: 'alkyne-hydroboration', sub: 'CCCCC#C', v: 'fixed' },
      id: 's29'
    },
    {
      caveman: {"prompt":"Lab, alkynes. Predict BEFORE answer: equivalents, C=O, geometry. Three right, two alkynes.","worked":"HBr (1): 2-bromohex-1-ene; HBr (2): 2,2-dibromohexane; Br₂ (1): (E)-1,2-dibromohex-1-ene; H₂O, HgSO₄: hexan-2-one; H₂/Lindlar: hex-1-ene; H₂/Pd: hexane.","hints":["Equivalents: 1 stops at C=C, 2 use both π bonds. H₂: which catalyst. Water, HgSO₄: ketone.","Wrong geometry (Z where anti gives E), C=O on end, wrong halogen count: another reagent."]}, // CAVEMAN
      type: 'try',
      skill: 'predict-product',
      widget: 'reaction-lab',
      part: 2,
      prompt: 'Back in the lab with alkynes. Predict BEFORE the lab shows the answer: count the equivalents, find the C=O, and watch the geometry. Get three predictions right, using at least two different alkynes.',
      config: {
        need: 3,
        alkynes: ['propyne', 'but-1-yne', 'but-2-yne', 'hex-1-yne', 'hex-3-yne'],
        reagents: ['HBr_1', 'HBr_2', 'Br2_1', 'Br2_2', 'H2O_Hg', 'H2_Lindlar', 'H2_Pd']
      },
      confirm: 'Three right. You counted the equivalents, used Markovnikov for H–X and for the OH, kept the Br atoms anti, and picked Lindlar for cis and Pd/C for the alkane.',
      hints: [
        'Ask first how many equivalents: 1 equivalent stops at the C=C, 2 use both π bonds. For H₂, ask which catalyst. For water with HgSO₄ expect a ketone.',
        'Wrong geometry (Z where anti gives E), a C=O on the end carbon, or the wrong number of halogens means the answer belongs to another reagent.'
      ],
      worked: 'For example: hex-1-yne + HBr (1 equiv.) gives 2-bromohex-1-ene; + HBr (2 equiv.) gives 2,2-dibromohexane; + Br₂ (1 equiv.) gives (E)-1,2-dibromohex-1-ene; + water with HgSO₄ gives hexan-2-one; + H₂/Lindlar gives hex-1-ene; + H₂/Pd gives hexane.',
      id: 's30'
    },
    {
      caveman: {"html":"<p>One HX: vinylic halide. Two HX: geminal dihalide. One X₂: trans dihaloalkene; two: tetrahalide. Hg²⁺, water: ketone. Hydroboration: aldehyde. Lindlar: cis alkene. Pd/C: alkane. Acetylide + R–Br: longer alkyne.</p>"}, // CAVEMAN
      type: 'explain',
      skill: 'predict-product',
      part: 2,
      html: '<p><b>Alkyne product kinds.</b> One HX: a vinylic halide. Two HX: a geminal dihalide. One X₂: a trans dihaloalkene; two: a tetrahalide. Hg²⁺ and water: an enol, then a ketone (a methyl ketone from a terminal alkyne). Hydroboration: an aldehyde from a terminal alkyne. Lindlar: a cis alkene. Pd/C: the alkane. Acetylide plus R–Br: a longer alkyne.</p>',
      id: 's31'
    },
    {
      caveman: {"prompt":"<b>Dienes.</b> Conjugated: cation spreads charge. <name new=\"2-methylbuta-1,3-diene\" old=\"2-methyl-1,3-butadiene\"></name> + <b>HCl (1 equiv.)</b>: major product(s)?","reveal":"<b>Q1:</b> H, Cl add, once.<br><b>Q2:</b> H to end carbon: + allylic, shared by two carbons; Cl⁻ bonds either: <b>1,2</b>, <b>1,4</b>.<br><b>Q3:</b> No stereocentre.<br><b>Kind:</b> two <b>allylic halides</b>, <b>1,2 and 1,4</b>. <a href=\"#reactions/diene-hx\">Open card</a>","options":[{"why":"Other halogen. HCl adds Cl."},{"why":"Diene unchanged. HCl adds H, Cl."},{"why":"Only 1,2 (Cl on C2). Allylic cation: + on C2, C4: Cl⁻ attacks C4 too: 1,4 forms."},{"why":"Yes. H⁺ to C1: allylic cation (+ shared by C2, C4, resonance). Cl⁻ either end: 1,2 and 1,4 both."}]}, // CAVEMAN
      type: 'predict',
      skill: 'dienes',
      part: 2,
      prompt: '<b>Dienes.</b> Conjugated: the cation can spread its charge. Substrate: <name new="2-methylbuta-1,3-diene" old="2-methyl-1,3-butadiene"></name>. Reagent: <b>HCl (1 equiv.)</b>. What is the major product (or products)?',
      equation: {
        reactants: ['C=C(C)C=C'],
        products: [],
        cond: 'HCl (1 equiv.)'
      },
      options: [
        {
          text: '<mol smiles="C=CC(C)(C)Br.CC(C)=CCBr"></mol>',
          why: 'This carries the other halogen. The reagent is HCl, so Cl is the atom that adds.'
        },
        {
          text: '<mol smiles="C=CC(=C)C"></mol>',
          why: 'This is still the diene: nothing added. HCl adds H and Cl across one C=C.'
        },
        {
          text: '<mol smiles="C=CC(C)(C)Cl"></mol>',
          why: 'Only the 1,2 product (Cl on C2) is drawn. The allylic cation puts + on C2 and C4, so Cl⁻ can also attack C4 and the 1,4 product forms too.'
        },
        {
          text: '<mol smiles="C=CC(C)(C)Cl.CC(C)=CCCl"></mol>',
          correct: true,
          why: 'Yes. H⁺ adds to C1, which gives the allylic cation (the + charge shared by C2 and C4 by resonance). Cl⁻ attacks either end: 1,2-addition and 1,4-addition products both form.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The π bond is rich, the H of HCl is poor: H and Cl add, once.<br><b>Q2, where:</b> H to an end carbon, so the + is allylic (next to the other C=C) and shared by two carbons; Cl⁻ can bond to either: <b>1,2</b> and <b>1,4</b>.<br><b>Q3, in space:</b> Nothing marked: neither product has a stereocentre.<br><b>Kind of product:</b> two <b>allylic halides</b>, the <b>1,2 and the 1,4</b> product. <a href="#reactions/diene-hx">Open the diene HX card</a>.',
      chk: { card: 'diene-hx', sub: 'C=C(C)C=C', v: 'HCl' },
      id: 's32'
    },
    {
      caveman: {"prompt":"Buta-1,3-diene + acrolein, CH₂=CH–CHO, heated. Diene rich; acrolein's C=C poor (C=O pulls). Product?","reveal":"<b>Q1:</b> Diene rich, dienophile poor (C=C with electron-poor C=O): diene → dienophile.<br><b>Q2:</b> Diene C1, C4 bond dienophile carbons; new C=C between old C2, C3.<br><b>Q3:</b> One step: syn. Groups cis on dienophile stay cis.<br><b>Kind:</b> <b>six-membered ring</b>, one C=C. <a href=\"#reactions/diels-alder\">Open Diels–Alder card</a>","options":[{"why":"Yes. C1, C4 bond dienophile carbons: six-membered ring. New C=C between old C2, C3."},{"why":"New C=C next to CHO carbon. Must be between old C2, C3: one carbon further."},{"why":"Diels–Alder adds no H. Diene, dienophile join; one C=C left."},{"why":"Uses only one C=C, four-membered ring. Both diene ends bond: six-membered ring."}]}, // CAVEMAN
      type: 'predict',
      skill: 'predict-product',
      part: 2,
      prompt: 'Buta-1,3-diene and acrolein, CH₂=CH–CHO, are heated together. The diene is the rich partner; acrolein’s C=C is poor (the C=O pulls on it). Both π systems react at once. What forms?',
      equation: {
        reactants: ['C=CC=C', 'C=CC=O'],
        products: [],
        cond: 'heat'
      },
      options: [
        {
          text: '<mol smiles="O=CC1CCC=CC1"></mol>',
          correct: true,
          why: 'Yes. The two ends of the diene (C1 and C4) bond to the two dienophile carbons and close a six-membered ring. The new C=C sits between the old C2 and C3.'
        },
        {
          text: '<mol smiles="O=CC1C=CCCC1"></mol>',
          why: 'The new C=C is next to the CHO carbon here. It must sit between the old C2 and C3 of the diene, which puts it one carbon further away.'
        },
        {
          text: '<mol smiles="O=CC1CCCCC1"></mol>',
          why: 'A Diels–Alder adds no H atoms. The diene and the dienophile just join, and one C=C is left in the ring.'
        },
        {
          text: '<mol smiles="C=CC1CCC1C=O"></mol>',
          why: 'That uses only one C=C of the diene and makes a four-membered ring. Both ends of the diene bond, which makes a six-membered ring.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The diene is rich, the dienophile (a C=C with an electron-poor C=O) is poor: the arrow runs diene → dienophile.<br><b>Q2, where:</b> Diene C1 and C4 bond to the two dienophile carbons; the new C=C sits between old C2 and C3.<br><b>Q3, in space:</b> Both pieces meet in one step: syn. Groups that were cis on the dienophile stay cis in the ring.<br><b>Kind of product:</b> a <b>six-membered ring</b> with one C=C. <a href="#reactions/diels-alder">Open the Diels–Alder card</a>.',
      chk: {
        engine: 'diels-alder-parent',
        diene: 'C=CC=C',
        dienophile: 'C=CC=O',
        answer: 'O=CC1CCC=CC1'
      },
      id: 's33'
    },
    {
      caveman: {"prompt":"Dienes, your turn. Pick diene, acid: predict product SET BEFORE lab: 1,2 and 1,4 product, unless same compound. Two right, two dienes.","worked":"Buta-1,3-diene + HBr: 3-bromobut-1-ene (1,2), 1-bromobut-2-ene (1,4). Cyclohexa-1,3-diene: 3-bromocyclohexene.","hints":["Allylic cation first: H on end carbon, + on neighbour and far end carbon. Halide on each.","One product only: misses other end; halide on carbon not sharing +: no such cation. Halogen matches acid."]}, // CAVEMAN
      type: 'try',
      skill: 'predict-product',
      widget: 'reaction-lab',
      part: 2,
      prompt: 'Your turn with dienes. Pick a diene and an acid and predict the product SET before the lab shows it: the 1,2 and the 1,4 product, unless both routes give the same compound. Get two right, using two different dienes.',
      config: {
        need: 2,
        dienes: ['buta-1,3-diene', '2-methylbuta-1,3-diene', 'cyclohexa-1,3-diene'],
        reagents: ['HCl', 'HBr']
      },
      confirm: 'Two right. You put H on an end carbon, shared the + over two carbons, and put the halide on each end, checking whether the two products were the same compound.',
      hints: [
        'Write the allylic cation first: H on an end carbon, + on the neighbouring carbon and on the far end carbon. The halide goes on each of those two carbons.',
        'If an answer shows only one product, it misses the other end; if the halide is on a carbon that does not share the +, that cation does not form. Check the halogen matches the acid.'
      ],
      worked: 'For example: buta-1,3-diene + HBr gives 3-bromobut-1-ene (1,2) and 1-bromobut-2-ene (1,4); cyclohexa-1,3-diene + HBr gives only 3-bromocyclohexene, because both routes meet.',
      id: 's34'
    },
    {
      caveman: {"prompt":"Benzene rings substitute (H replaced, no addition). <name new=\"benzene\" old=\"benzene\"></name> + <b>Cl₂, FeCl₃</b>: product?","reveal":"<b>Q1:</b> Ring rich; FeCl₃ makes Cl₂ poor (Cl⁺-like): C–Cl replaces C–H.<br><b>Q2:</b> Six carbons alike: no position choice.<br><b>Q3:</b> Ring flat.<br><b>Kind:</b> <b>aryl halide</b> (chlorobenzene). <a href=\"#reactions/eas-bromination\">Open card</a>","options":[{"why":"Yes. Cl⁺ (polarised Cl₂ with FeCl₃) replaces one H, H⁺ leaves: ring aromatic: chlorobenzene + HCl."},{"why":"Added across ring C=C. Ring kept: Cl REPLACES one H."},{"why":"TWO new groups. Cl₂, FeCl₃ adds one Cl."},{"why":"(propan-2-yl)benzene: (CH₃)₂CHCl, AlCl₃ product, not Cl₂."}]}, // CAVEMAN
      type: 'predict',
      skill: 'eas',
      part: 2,
      prompt: '<b>Benzene rings.</b> A ring substitutes: one H is replaced, nothing adds across it. Substrate: <name new="benzene" old="benzene"></name>. Reagent: <b>Cl₂, FeCl₃</b>. What is the major product?',
      equation: {
        reactants: ['c1ccccc1'],
        products: [],
        cond: 'Cl₂, FeCl₃'
      },
      options: [
        {
          text: '<mol smiles="Clc1ccccc1"></mol>',
          correct: true,
          why: 'Yes. Cl⁺ (the chlorine cation (polarised Cl₂ held by FeCl₃)) replaces one H on the ring, and H⁺ leaves, so the ring stays aromatic: chlorobenzene plus HCl.'
        },
        {
          text: '<mol smiles="ClC1C=CC=CC1Cl"></mol>',
          why: 'Cl and Cl added across a C=C of the ring. Benzene keeps its ring: one Cl REPLACES one ring H.'
        },
        {
          text: '<mol smiles="Clc1ccc(Cl)cc1"></mol>',
          why: 'This ring has TWO new groups. Cl₂, FeCl₃ puts on only one Cl.'
        },
        {
          text: '<mol smiles="CC(C)c1ccccc1"></mol>',
          why: 'That is (propan-2-yl)benzene, the product of (CH₃)₂CHCl, AlCl₃. Cl₂, FeCl₃ puts Cl on the ring.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The ring’s π electrons are rich; FeCl₃ makes Cl₂ poor (Cl⁺-like): the ring attacks and a new C–Cl bond forms in place of a C–H.<br><b>Q2, where:</b> All six carbons are alike, so there is no choice of position.<br><b>Q3, in space:</b> Nothing to show: the ring stays flat.<br><b>Kind of product:</b> an <b>aryl halide</b> (chlorobenzene). <a href="#reactions/eas-bromination">Open the halogenation of benzene card</a>.',
      chk: { card: 'eas-bromination', sub: 'c1ccccc1', v: 'Cl2' },
      id: 's35'
    },
    {
      caveman: {"prompt":"<name new=\"benzene\" old=\"benzene\"></name> + <b>HNO₃, H₂SO₄</b>: major product?","reveal":"<b>Q1:</b> Ring rich; H₂SO₄ turns HNO₃ to NO₂⁺ (poor): NO₂ replaces one H.<br><b>Q2:</b> Six carbons alike.<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>nitroarene</b> (nitrobenzene). <a href=\"#reactions/eas-nitration\">Open card</a>","options":[{"why":"Yes. NO₂⁺ (nitronium) replaces one H, H⁺ leaves: aromatic: nitrobenzene + H₂SO₄."},{"why":"Added across ring C=C. Ring kept: NO₂ REPLACES one H."},{"why":"TWO groups. HNO₃, H₂SO₄ adds one NO₂."},{"why":"(propan-2-yl)benzene: (CH₃)₂CHCl, AlCl₃. HNO₃, H₂SO₄: NO₂."}]}, // CAVEMAN
      type: 'predict',
      skill: 'eas',
      part: 2,
      prompt: 'Substrate: <name new="benzene" old="benzene"></name>. Reagent: <b>HNO₃, H₂SO₄</b>. What is the major product?',
      equation: {
        reactants: ['c1ccccc1'],
        products: [],
        cond: 'HNO₃, H₂SO₄'
      },
      options: [
        {
          text: '<mol smiles="O=[N+]([O-])c1ccccc1"></mol>',
          correct: true,
          why: 'Yes. NO₂⁺ (the nitronium ion) replaces one H on the ring, and H⁺ leaves, so the ring stays aromatic: nitrobenzene plus H₂SO₄.'
        },
        {
          text: '<mol smiles="O=[N+]([O-])C1C=CC=CC1O"></mol>',
          why: 'NO₂ and NO₂ added across a C=C of the ring. Benzene keeps its ring: one NO₂ REPLACES one ring H.'
        },
        {
          text: '<mol smiles="O=[N+]([O-])c1ccc([N+](=O)[O-])cc1"></mol>',
          why: 'This ring has TWO new groups. HNO₃, H₂SO₄ puts on only one NO₂.'
        },
        {
          text: '<mol smiles="CC(C)c1ccccc1"></mol>',
          why: 'That is (propan-2-yl)benzene, the product of (CH₃)₂CHCl, AlCl₃. HNO₃, H₂SO₄ puts NO₂ on the ring.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The ring is rich; H₂SO₄ turns HNO₃ into NO₂⁺, the poor partner: NO₂ replaces one ring H.<br><b>Q2, where:</b> All six carbons are alike.<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> a <b>nitroarene</b> (nitrobenzene). <a href="#reactions/eas-nitration">Open the nitration card</a>.',
      chk: { card: 'eas-nitration', sub: 'c1ccccc1', v: 'HNO3' },
      id: 's36'
    },
    {
      caveman: {"prompt":"<name new=\"benzene\" old=\"benzene\"></name> + <b>SO₃, H₂SO₄</b>: major product?","reveal":"<b>Q1:</b> Ring rich; SO₃, H₂SO₄ make HSO₃⁺ (poor): ring attacks S.<br><b>Q2:</b> Six carbons alike; S bonds ring carbon.<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>aryl sulfonic acid</b> (benzenesulfonic acid). <a href=\"#reactions/eas-sulfonation\">Open card</a>","options":[{"why":"Yes. HSO₃⁺ replaces one H, H⁺ leaves: aromatic: benzenesulfonic acid + H₂SO₄."},{"why":"Added across ring C=C. Ring kept: SO₃H REPLACES one H."},{"why":"TWO groups. SO₃, H₂SO₄ adds one SO₃H."},{"why":"(propan-2-yl)benzene: (CH₃)₂CHCl, AlCl₃. SO₃, H₂SO₄: SO₃H."}]}, // CAVEMAN
      type: 'predict',
      skill: 'eas',
      part: 2,
      prompt: 'Substrate: <name new="benzene" old="benzene"></name>. Reagent: <b>SO₃, H₂SO₄</b>. What is the major product?',
      equation: {
        reactants: ['c1ccccc1'],
        products: [],
        cond: 'SO₃, H₂SO₄'
      },
      options: [
        {
          text: '<mol smiles="O=S(=O)(O)c1ccccc1"></mol>',
          correct: true,
          why: 'Yes. HSO₃⁺ (protonated sulfur trioxide) replaces one H on the ring, and H⁺ leaves, so the ring stays aromatic: benzenesulfonic acid plus H₂SO₄.'
        },
        {
          text: '<mol smiles="O=S(=O)(O)C1C=CC=CC1O"></mol>',
          why: 'SO₃H and SO₃H added across a C=C of the ring. Benzene keeps its ring: one SO₃H REPLACES one ring H.'
        },
        {
          text: '<mol smiles="O=S(=O)(O)c1ccc(S(=O)(=O)O)cc1"></mol>',
          why: 'This ring has TWO new groups. SO₃, H₂SO₄ puts on only one SO₃H.'
        },
        {
          text: '<mol smiles="CC(C)c1ccccc1"></mol>',
          why: 'That is (propan-2-yl)benzene, the product of (CH₃)₂CHCl, AlCl₃. SO₃, H₂SO₄ puts SO₃H on the ring.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The ring is rich; SO₃ with H₂SO₄ makes HSO₃⁺, the poor partner: the ring attacks the S.<br><b>Q2, where:</b> All six carbons are alike; S bonds to the ring carbon.<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> an <b>aryl sulfonic acid</b> (benzenesulfonic acid). <a href="#reactions/eas-sulfonation">Open the sulfonation card</a>.',
      chk: { card: 'eas-sulfonation', sub: 'c1ccccc1', v: 'SO3' },
      id: 's37'
    },
    {
      caveman: {"prompt":"<name new=\"benzene\" old=\"benzene\"></name> + <b>(CH₃)₃CCl, AlCl₃</b>: major product?","reveal":"<b>Q1:</b> AlCl₃ pulls Cl⁻ off R–Cl: carbocation R⁺ (poor); ring attacks. Tertiary cation does not shift.<br><b>Q2:</b> Six carbons alike.<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>alkylbenzene</b> (tert-butylbenzene). <a href=\"#reactions/fc-alkylation\">Open card</a>","options":[{"why":"Yes. R⁺ replaces one H, H⁺ leaves: aromatic: tert-butylbenzene + HCl."},{"why":"Added across ring C=C. Ring kept: (CH₃)₃C REPLACES one H."},{"why":"TWO groups: only one (CH₃)₃C adds."},{"why":"Ethylbenzene: CH₃CH₂Cl, AlCl₃. Here (CH₃)₃CCl: (CH₃)₃C."}]}, // CAVEMAN
      type: 'predict',
      skill: 'eas',
      part: 2,
      prompt: 'Substrate: <name new="benzene" old="benzene"></name>. Reagent: <b>(CH₃)₃CCl, AlCl₃</b>. What is the major product?',
      equation: {
        reactants: ['c1ccccc1'],
        products: [],
        cond: '(CH₃)₃CCl, AlCl₃'
      },
      options: [
        {
          text: '<mol smiles="CC(C)(C)c1ccccc1"></mol>',
          correct: true,
          why: 'Yes. R⁺ (a carbocation) replaces one H on the ring, and H⁺ leaves, so the ring stays aromatic: tert-butylbenzene plus HCl.'
        },
        {
          text: '<mol smiles="CC(C)(C)C1C=CC=CC1Cl"></mol>',
          why: '(CH₃)₃C and (CH₃)₃C added across a C=C of the ring. Benzene keeps its ring: one (CH₃)₃C REPLACES one ring H.'
        },
        {
          text: '<mol smiles="CC(C)(C)c1ccc(C(C)(C)C)cc1"></mol>',
          why: 'This ring has TWO new groups. (CH₃)₃CCl, AlCl₃ puts on only one (CH₃)₃C.'
        },
        {
          text: '<mol smiles="CCc1ccccc1"></mol>',
          why: 'That is ethylbenzene, the product of CH₃CH₂Cl, AlCl₃. (CH₃)₃CCl, AlCl₃ puts (CH₃)₃C on the ring.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> AlCl₃ pulls Cl⁻ off R–Cl, making the carbocation R⁺ (the poor partner); the ring attacks it. A tertiary cation does not shift.<br><b>Q2, where:</b> All six carbons are alike.<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> an <b>alkylbenzene</b> (tert-butylbenzene). <a href="#reactions/fc-alkylation">Open the Friedel–Crafts alkylation card</a>.',
      chk: { card: 'fc-alkylation', sub: 'c1ccccc1', v: 'RCl', halide: 'CC(C)(C)Cl' },
      id: 's38'
    },
    {
      caveman: {"prompt":"<name new=\"benzene\" old=\"benzene\"></name> + <b>CH₃CH₂COCl, AlCl₃</b>: major product?","reveal":"<b>Q1:</b> AlCl₃ takes Cl⁻: acylium RC≡O⁺ (poor); ring attacks.<br><b>Q2:</b> Six carbons alike.<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>aryl ketone</b> (propiophenone). <a href=\"#reactions/fc-acylation\">Open card</a>","options":[{"why":"Yes. RC≡O⁺ replaces one H, H⁺ leaves: aromatic: 1-phenylpropan-1-one + HCl."},{"why":"Added across ring C=C. Ring kept: CH₃CH₂CO REPLACES one H."},{"why":"TWO groups: only one CH₃CH₂CO adds."},{"why":"Ethylbenzene: CH₃CH₂Cl, AlCl₃. Here CH₃CH₂COCl: CH₃CH₂CO."}]}, // CAVEMAN
      type: 'predict',
      skill: 'eas',
      part: 2,
      prompt: 'Substrate: <name new="benzene" old="benzene"></name>. Reagent: <b>CH₃CH₂COCl, AlCl₃</b>. What is the major product?',
      equation: {
        reactants: ['c1ccccc1'],
        products: [],
        cond: 'CH₃CH₂COCl, AlCl₃'
      },
      options: [
        {
          text: '<mol smiles="CCC(=O)c1ccccc1"></mol>',
          correct: true,
          why: 'Yes. RC≡O⁺ (an acylium ion) replaces one H on the ring, and H⁺ leaves, so the ring stays aromatic: 1-phenylpropan-1-one plus HCl.'
        },
        {
          text: '<mol smiles="CCC(=O)C1C=CC=CC1Cl"></mol>',
          why: 'CH₃CH₂CO and CH₃CH₂CO added across a C=C of the ring. Benzene keeps its ring: one CH₃CH₂CO REPLACES one ring H.'
        },
        {
          text: '<mol smiles="CCC(=O)c1ccc(C(=O)CC)cc1"></mol>',
          why: 'This ring has TWO new groups. CH₃CH₂COCl, AlCl₃ puts on only one CH₃CH₂CO.'
        },
        {
          text: '<mol smiles="CCc1ccccc1"></mol>',
          why: 'That is ethylbenzene, the product of CH₃CH₂Cl, AlCl₃. CH₃CH₂COCl, AlCl₃ puts CH₃CH₂CO on the ring.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> AlCl₃ takes Cl⁻ off the acid chloride, making the acylium ion RC≡O⁺ (poor); the ring attacks it.<br><b>Q2, where:</b> All six carbons are alike.<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> an <b>aryl ketone</b> (propiophenone). <a href="#reactions/fc-acylation">Open the Friedel–Crafts acylation card</a>.',
      chk: { card: 'fc-acylation', sub: 'c1ccccc1', v: 'RCOCl', halide: 'CCC(=O)Cl' },
      id: 's39'
    },
    {
      caveman: {"prompt":"<b>Directors.</b> Ring already has group: where can + sit best? <name new=\"methoxybenzene\" old=\"anisole\"></name> + <b>HNO₃, H₂SO₄</b>: major product(s)?","reveal":"<b>Q1:</b> Ring richer than benzene (O lone pair feeds it); NO₂⁺ poor: NO₂ replaces ring H.<br><b>Q2:</b> ortho, para attack: + can sit on carbon holding OCH₃, O lone pair shares it. Meta: no such form.<br><b>Q3:</b> Two position isomers.<br><b>Kind:</b> <b>ortho and para</b> products (two isomers, drawn together). <a href=\"#reactions/director-activating\">Open card</a>","options":[{"why":"Only para drawn; ortho/para director gives ortho AND para: both form."},{"why":"TWO groups. HNO₃, H₂SO₄: one NO₂."},{"why":"NO₂ meta to –OR. –OR is ortho/para director."},{"why":"Yes. –OCH₃ ortho/para: NO₂⁺ replaces H ortho or para. Both isomers drawn."}]}, // CAVEMAN
      type: 'predict',
      skill: 'directors',
      part: 2,
      prompt: '<b>Directors.</b> Now the ring already has a group. Ask where the + can sit best. Substrate: <name new="methoxybenzene" old="anisole"></name>. Reagent: <b>HNO₃, H₂SO₄</b>. What is the major product (or products)?',
      equation: {
        reactants: ['COc1ccccc1'],
        products: [],
        cond: 'HNO₃, H₂SO₄'
      },
      options: [
        {
          text: '<mol smiles="COc1ccc([N+](=O)[O-])cc1"></mol>',
          why: 'Only the para product is drawn, but an ortho/para director sends the new group ortho AND para, so both isomers form.'
        },
        {
          text: '<mol smiles="COc1cccc([N+](=O)[O-])c1[N+](=O)[O-]"></mol>',
          why: 'This ring has TWO new groups. HNO₃, H₂SO₄ puts on only one NO₂.'
        },
        {
          text: '<mol smiles="COc1cccc([N+](=O)[O-])c1"></mol>',
          why: 'That puts NO₂ meta to –OR. –OR is an ortho/para director.'
        },
        {
          text: '<mol smiles="COc1ccc([N+](=O)[O-])cc1.COc1ccccc1[N+](=O)[O-]"></mol>',
          correct: true,
          why: 'Yes. –OCH₃ is an ortho/para director, so NO₂⁺ replaces an H ortho or para to it. Both isomers form, so both are drawn.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The ring is richer than benzene (the O lone pair feeds it); NO₂⁺ is the poor partner: NO₂ replaces a ring H.<br><b>Q2, where:</b> Ortho and para attack give a cation where the + can sit on the carbon holding the OCH₃ and the O lone pair shares it. Meta attack has no such form.<br><b>Q3, in space:</b> Nothing to show: two position isomers instead.<br><b>Kind of product:</b> <b>ortho and para</b> substitution products (two isomers, drawn together). <a href="#reactions/director-activating">Open the activator card</a>.',
      chk: { card: 'director-activating', sub: 'COc1ccccc1', v: 'HNO3' },
      id: 's40'
    },
    {
      caveman: {"prompt":"<name new=\"acetophenone\" old=\"acetophenone\"></name> + <b>Br₂, FeBr₃</b>: major product?","reveal":"<b>Q1:</b> C=O pulls electrons: ring poorer, slower; Br₂, FeBr₃ (Br⁺-like) still poor.<br><b>Q2:</b> ortho, para attack: + next to δ+ carbonyl carbon in one form: worst. Meta avoids: Br <b>meta</b>.<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>meta</b> product (one isomer). <a href=\"#reactions/director-meta\">Open card</a>","options":[{"why":"Br para to C=O, but meta director does not send para: + next to δ+ carbonyl carbon."},{"why":"TWO new groups. Br₂, FeBr₃ adds one Br."},{"why":"Br ortho, para to –COR: meta director."},{"why":"Yes. Br⁺ goes meta: 1-(3-bromophenyl)ethan-1-one."}]}, // CAVEMAN
      type: 'predict',
      skill: 'directors',
      part: 2,
      prompt: 'Substrate: <name new="acetophenone" old="acetophenone"></name>. Reagent: <b>Br₂, FeBr₃</b>. What is the major product?',
      equation: {
        reactants: ['CC(=O)c1ccccc1'],
        products: [],
        cond: 'Br₂, FeBr₃'
      },
      options: [
        {
          text: '<mol smiles="CC(=O)c1ccc(Br)cc1"></mol>',
          why: 'That puts Br para to the C=O group, but a meta director does not send the new group para: the + would sit next to the δ+ carbonyl carbon.'
        },
        {
          text: '<mol smiles="CC(=O)c1cccc(Br)c1Br"></mol>',
          why: 'This ring has TWO new groups. Br₂, FeBr₃ puts on only one Br.'
        },
        {
          text: '<mol smiles="CC(=O)c1ccc(Br)cc1.CC(=O)c1ccccc1Br"></mol>',
          why: 'That puts Br ortho and para to –COR. –COR is a meta director.'
        },
        {
          text: '<mol smiles="CC(=O)c1cccc(Br)c1"></mol>',
          correct: true,
          why: 'Yes. –COR is a meta director, so Br⁺ replaces an H meta to it: 1-(3-bromophenyl)ethan-1-one.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The C=O pulls electrons out, so the ring is poorer and slower; Br₂ with FeBr₃ (Br⁺-like) is still the poor partner.<br><b>Q2, where:</b> Ortho and para attack put the + next to the δ+ carbonyl carbon in one form: worst. Meta attack avoids that, so Br goes <b>meta</b>.<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> a <b>meta</b> substitution product (one isomer). <a href="#reactions/director-meta">Open the deactivator card</a>.',
      chk: { card: 'director-meta', sub: 'CC(=O)c1ccccc1', v: 'Br2' },
      id: 's41'
    },
    {
      caveman: {"prompt":"<name new=\"bromobenzene\" old=\"bromobenzene\"></name> + <b>HNO₃, H₂SO₄</b>: major product(s)?","reveal":"<b>Q1:</b> Br pulls through σ bond: slower than benzene; NO₂⁺ poor.<br><b>Q2:</b> Br lone pair can share + in ortho, para attack (extra form): NO₂ <b>ortho and para</b> despite slower rate.<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>ortho and para</b> products. <a href=\"#reactions/director-halogen\">Open card</a>","options":[{"why":"Only para drawn; halogen ortho/para: NO₂ ortho AND para, both isomers."},{"why":"TWO groups. HNO₃, H₂SO₄: one NO₂."},{"why":"NO₂ meta to –Br. –Br is ortho/para director."},{"why":"Yes. –Br ortho/para: NO₂⁺ replaces H ortho or para: 1-bromo-4-nitrobenzene, 1-bromo-2-nitrobenzene. Mixture."}]}, // CAVEMAN
      type: 'predict',
      skill: 'directors',
      part: 2,
      prompt: 'Substrate: <name new="bromobenzene" old="bromobenzene"></name>. Reagent: <b>HNO₃, H₂SO₄</b>. What is the major product (or products)?',
      equation: {
        reactants: ['Brc1ccccc1'],
        products: [],
        cond: 'HNO₃, H₂SO₄'
      },
      options: [
        {
          text: '<mol smiles="O=[N+]([O-])c1ccc(Br)cc1"></mol>',
          why: 'Only the para product is drawn, but a halogen is an ortho/para director, so NO₂ goes ortho AND para and both isomers form.'
        },
        {
          text: '<mol smiles="O=[N+]([O-])c1cccc(Br)c1[N+](=O)[O-]"></mol>',
          why: 'This ring has TWO new groups. HNO₃, H₂SO₄ puts on only one NO₂.'
        },
        {
          text: '<mol smiles="O=[N+]([O-])c1cccc(Br)c1"></mol>',
          why: 'That puts NO₂ meta to –Br. –Br is an ortho/para director.'
        },
        {
          text: '<mol smiles="O=[N+]([O-])c1ccc(Br)cc1.O=[N+]([O-])c1ccccc1Br"></mol>',
          correct: true,
          why: 'Yes. –Br is an ortho/para director, so NO₂⁺ replaces an H ortho or para to it: 1-bromo-4-nitrobenzene and 1-bromo-2-nitrobenzene. Both form (the book treats this as a mixture).'
        }
      ],
      reveal: '<b>Q1, what adds:</b> Br pulls electrons through the σ bond, so the ring is slower than benzene; NO₂⁺ is the poor partner.<br><b>Q2, where:</b> A lone pair on Br can share the + in ortho and para attack (an extra resonance form), so NO₂ goes <b>ortho and para</b> in spite of the slower rate.<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> <b>ortho and para</b> substitution products. <a href="#reactions/director-halogen">Open the halogen director card</a>.',
      chk: { card: 'director-halogen', sub: 'Brc1ccccc1', v: 'HNO3' },
      id: 's42'
    },
    {
      caveman: {"prompt":"N,N,4-Trimethylaniline + <b>HNO₃, H₂SO₄</b>: major product?","reveal":"<b>Q1:</b> Strong acid: N lone pair takes H⁺: –NR₂H⁺; NO₂⁺ poor.<br><b>Q2:</b> Protonated N: no lone pair, pulls electrons: directs <b>meta</b>. CH₃ directs ortho/para. Carbon ortho to CH₃ also meta to N: both agree.<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>meta</b> product (ortho to CH₃). <a href=\"#reactions/amine-in-acid\">Open card</a>","options":[{"why":"Starting material. HNO₃, H₂SO₄ nitrates ring, though –NR₂H⁺ slows it."},{"why":"Two NO₂ too many. Protonated amine deactivates ring: one NO₂."},{"why":"NO₂ ortho to nitrogen, as free –NR₂ (ortho/para director). Strong acid: N protonated: meta."},{"why":"Yes. Strong acid: –NR₂H⁺, meta director. CH₃ ortho/para. Carbon ortho to CH₃ also meta to N: NO₂ there."}]}, // CAVEMAN
      type: 'predict',
      skill: 'predict-product',
      part: 2,
      prompt: 'Substrate: N,N,4-trimethylaniline. Reagent: <b>HNO₃, H₂SO₄</b>. What is the major product?',
      equation: {
        reactants: ['CN(C)c1ccc(C)cc1'],
        products: [],
        cond: 'HNO₃, H₂SO₄'
      },
      options: [
        {
          text: '<mol smiles="CN(C)c1ccc(C)cc1"></mol>',
          why: 'That is the starting material. HNO₃ with H₂SO₄ nitrates the ring, even though the –NR₂H⁺ group slows it down.'
        },
        {
          text: '<mol smiles="CN(C)c1ccc(C)c([N+](=O)[O-])c1[N+](=O)[O-]"></mol>',
          why: 'Two NO₂ groups is too many. The protonated amine deactivates the ring, so only one NO₂ goes on.'
        },
        {
          text: '<mol smiles="CN(C)c1ccc(C)cc1[N+](=O)[O-]"></mol>',
          why: 'This puts the NO₂ ortho to the nitrogen, as a free –NR₂ (an ortho/para director) would. In strong acid the N is protonated and directs meta.'
        },
        {
          text: '<mol smiles="CN(C)c1ccc(C)c([N+](=O)[O-])c1"></mol>',
          correct: true,
          why: 'Yes. In strong acid the N is protonated to –NR₂H⁺, a meta director. The CH₃ directs ortho/para. The carbon ortho to the CH₃ is also meta to the N, so the NO₂ goes there.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> In strong acid the N lone pair (the rich one) takes H⁺, so the group becomes –NR₂H⁺; NO₂⁺ is the poor partner.<br><b>Q2, where:</b> The protonated N has no lone pair and pulls electrons: it directs <b>meta</b>. The CH₃ directs ortho/para. The carbon ortho to the CH₃ is also meta to the N, so both agree.<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> a <b>meta</b> substitution product (ortho to the CH₃). <a href="#reactions/amine-in-acid">Open the amine in acid card</a>.',
      chk: { card: 'amine-in-acid', sub: 'CN(C)c1ccc(C)cc1', v: 'fixed' },
      id: 's43'
    },
    {
      caveman: {"prompt":"Substituted rings. Pick ring, reagent: predict product <b>or products</b> BEFORE lab (ortho/para director: two isomers together). Some combinations fail: lab says why. Three right.","hints":["Group on ring, its bin: ortho/para: TWO products, meta: ONE.","Wrong answers: other bin's product, one isomer only, two new groups. Lab refuses: read why."]}, // CAVEMAN
      type: 'try',
      skill: 'directors',
      widget: 'reaction-lab',
      part: 2,
      prompt: 'Back in the lab with substituted rings. Pick a ring and a reagent and predict the product <b>or products</b> BEFORE the lab shows them (an ortho/para director gives two isomers, drawn together). Some combinations do not work, and the lab says why. Get three predictions right.',
      config: {
        need: 3,
        subst: {
          arenes: ['toluene', 'phenol', 'chlorobenzene', 'nitrobenzene', 'benzoic-acid', 'acetophenone'],
          reagents: ['bromination', 'nitration', 'sulfonation', 'acetylation']
        }
      },
      confirm: 'Three right. For each one: name the group, find its bin, send E⁺ ortho and para or meta, and remember that Friedel–Crafts fails on a deactivated ring.',
      hints: [
        'Name the group on the ring and find its bin: an ortho/para director gives TWO products (drawn together), a meta director gives ONE.',
        'The wrong answers are the other bin’s product, only one of the two isomers, or a ring with two new groups. If the lab refuses a combination, read why.'
      ],
      worked: 'For example: toluene + Br₂/FeBr₃ gives o- and p-bromotoluene; nitrobenzene + HNO₃/H₂SO₄ gives m-dinitrobenzene; chlorobenzene + SO₃/H₂SO₄ gives o- and p-chlorobenzenesulfonic acid; benzoic acid + Br₂/FeBr₃ gives m-bromobenzoic acid. Acetophenone + CH₃COCl/AlCl₃ gives nothing: the ring is too deactivated.',
      id: 's44'
    },
    {
      caveman: {"html":"<p>Benzene: substituted ring (halide, nitroarene, sulfonic acid, alkylbenzene, ketone). Activator, halogen: ortho, para isomers. Other deactivator, amine in acid: one meta product. Two groups: stronger activator decides.</p>"}, // CAVEMAN
      type: 'explain',
      skill: 'predict-product',
      part: 2,
      html: '<p><b>Ring product kinds.</b> Benzene: one substituted ring (aryl halide, nitroarene, sulfonic acid, alkylbenzene, aryl ketone). An activator or a halogen: ortho and para products, two isomers. Any other deactivator, and an amine in strong acid: one meta product. When two groups compete, the stronger activator decides. Nothing adds across the ring.</p>',
      id: 's45'
    },
    {
      caveman: {"prompt":"<b>Side chains.</b> Ring stays; group changes. <name new=\"ethylbenzene\" old=\"ethylbenzene\"></name> + <b>KMnO₄, H₂O (heat)</b>: major product?","reveal":"<b>Q1:</b> KMnO₄ oxidant (poor): attacks benzylic C–H, adds O.<br><b>Q2:</b> Only carbon on ring; any chain length ends as one –CO₂H (no benzylic H, as tert-butyl: no reaction).<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>carboxylic acid</b> (benzoic acid). <a href=\"#reactions/side-chain-kmno4\">Open KMnO₄ card</a>","options":[{"why":"Ring saturated. KMnO₄ oxidant: no H added: ring aromatic."},{"why":"Chain unchanged. Benzylic H: KMnO₄ oxidises to CO₂H."},{"why":"Acid at far end. KMnO₄ attacks benzylic carbon, cuts rest: CO₂H on ring."},{"why":"Yes. KMnO₄ attacks benzylic C–H, oxidises to carboxylic acid, any chain length; rest lost."}]}, // CAVEMAN
      type: 'predict',
      skill: 'side-chains',
      part: 2,
      prompt: '<b>Side chains and other changes.</b> The ring stays; a group on it changes. Substrate: <name new="ethylbenzene" old="ethylbenzene"></name>. Reagent: <b>KMnO₄, H₂O (heat)</b>. What is the major product?',
      equation: {
        reactants: ['CCc1ccccc1'],
        products: [],
        cond: 'KMnO₄, H₂O (heat)'
      },
      options: [
        {
          text: '<mol smiles="OC(=O)C1CCCCC1"></mol>',
          why: 'The ring is saturated here. KMnO₄ is an oxidant, so it does not add H to the ring: the ring stays aromatic.'
        },
        {
          text: '<mol smiles="CCc1ccccc1"></mol>',
          why: 'The side chain is unchanged. Its benzylic carbon has an H, so KMnO₄ oxidises it to CO₂H.'
        },
        {
          text: '<mol smiles="OC(=O)Cc1ccccc1"></mol>',
          why: 'The acid sits at the far end of the chain. KMnO₄ attacks the benzylic carbon (bonded to the ring) and cuts the rest off, so the CO₂H is on the ring.'
        },
        {
          text: '<mol smiles="O=C(O)c1ccccc1"></mol>',
          correct: true,
          why: 'Yes. KMnO₄ attacks the C–H bonds on the benzylic carbon (the carbon bonded to the ring) and carries the oxidation to a carboxylic acid, however long the chain is; the rest of the chain is lost.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> KMnO₄ is the oxidant (the poor partner): it attacks the benzylic C–H bonds and adds O.<br><b>Q2, where:</b> Only the carbon bonded to the ring; however long the chain, it ends as one –CO₂H on the ring (no benzylic H, as in tert-butyl, means no reaction).<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> a <b>carboxylic acid</b> (benzoic acid). <a href="#reactions/side-chain-kmno4">Open the side-chain KMnO₄ card</a>.',
      chk: { card: 'side-chain-kmno4', sub: 'CCc1ccccc1', v: 'KMnO4' },
      id: 's46'
    },
    {
      caveman: {"prompt":"Prop-1-enylbenzene + <b>H₂, Pd/C (1 atm)</b>: major product?","reveal":"<b>Q1:</b> Side-chain C=C, H₂ meet on metal: H, H add.<br><b>Q2:</b> Side-chain C=C only; ring untouched, mild conditions.<br><b>Q3:</b> Propylbenzene: no stereocentre.<br><b>Kind:</b> <b>alkylbenzene</b> (alkane side chain). <a href=\"#reactions/side-chain-h2pd\">Open card</a>","options":[{"why":"Outside C=C unchanged. H₂, Pd/C adds H₂ to it."},{"why":"Ring reduced too. Pd/C ordinary pressure: only outside C=C, C≡C (ring: Pt, high pressure)."},{"why":"Only ring reduced. H₂, Pd/C reduces C=C or C≡C outside ring, leaves ring."},{"why":"Yes. H₂, Pd/C: outside C=C, C≡C; ring alone."}]}, // CAVEMAN
      type: 'predict',
      skill: 'side-chains',
      part: 2,
      prompt: 'Substrate: prop-1-enylbenzene. Reagent: <b>H₂, Pd/C (1 atm)</b>. What is the major product?',
      equation: {
        reactants: ['CC=Cc1ccccc1'],
        products: [],
        cond: 'H₂, Pd/C (1 atm)'
      },
      options: [
        {
          text: '<mol smiles="CC=Cc1ccccc1"></mol>',
          why: 'The C=C or C≡C outside the ring is unchanged. H₂ with Pd/C adds H₂ to it.'
        },
        {
          text: '<mol smiles="CCCC1CCCCC1"></mol>',
          why: 'The ring is reduced as well. Pd/C at ordinary pressure reduces only the C=C or C≡C outside the ring (ring reduction needs Pt and high pressure).'
        },
        {
          text: '<mol smiles="CC=CC1CCCCC1"></mol>',
          why: 'Only the ring was reduced. H₂ with Pd/C reduces the C=C or C≡C outside the ring and leaves the benzene ring alone.'
        },
        {
          text: '<mol smiles="CCCc1ccccc1"></mol>',
          correct: true,
          why: 'Yes. H₂ with Pd/C at ordinary pressure adds to the C=C or C≡C outside the ring and leaves the benzene ring alone.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> The side-chain C=C and H₂ meet on the metal: H and H add.<br><b>Q2, where:</b> On the side-chain C=C only; the ring is not touched under these mild conditions.<br><b>Q3, in space:</b> Nothing to show: propylbenzene has no stereocentre.<br><b>Kind of product:</b> an <b>alkylbenzene</b> (an alkane side chain). <a href="#reactions/side-chain-h2pd">Open the side-chain hydrogenation card</a>.',
      chk: { card: 'side-chain-h2pd', sub: 'CC=Cc1ccccc1', v: 'H2' },
      id: 's47'
    },
    {
      caveman: {"prompt":"<name new=\"propylbenzene\" old=\"propylbenzene\"></name> + <b>NBS, heat (or Br₂, light)</b>: major product?","reveal":"<b>Q1:</b> Radical: Br· removes weakest C–H, benzylic (ring steadies radical). No rich-to-poor arrow.<br><b>Q2:</b> ONLY benzylic carbon. No ring Br (needs FeBr₃).<br><b>Q3:</b> Flat radical: either face: stereocentre, <b>racemate</b>.<br><b>Kind:</b> <b>benzylic bromide</b>. <a href=\"#reactions/benzylic-bromination\">Open card</a>","options":[{"why":"Yes. Radical: Br on benzylic carbon (ring-stabilised radical). racemate."},{"why":"Br on ring (para). Ring bromination: Br₂, FeBr₃. Light, NBS: benzylic."},{"why":"Br on middle carbon. Benzylic radical stable: Br on carbon bonded to ring."},{"why":"Two Br too many: one Br₂ or NBS: one benzylic H."}]}, // CAVEMAN
      type: 'predict',
      skill: 'predict-product',
      part: 2,
      prompt: 'Substrate: <name new="propylbenzene" old="propylbenzene"></name>. Reagent: <b>NBS, heat (or Br₂, light)</b>. What is the major product?',
      equation: {
        reactants: ['CCCc1ccccc1'],
        products: [],
        cond: 'NBS, heat (or Br₂, light)'
      },
      options: [
        {
          text: '<mol smiles="CCC(Br)c1ccccc1"></mol>',
          correct: true,
          why: 'Yes. A radical reaction puts Br on the benzylic carbon, the one bonded to the ring, because that radical is stabilised by the ring. It forms as a racemate.'
        },
        {
          text: '<mol smiles="CCCc1ccc(Br)cc1"></mol>',
          why: 'That puts Br on the ring (para). Ring bromination needs Br₂ with FeBr₃. Light or NBS brominates the benzylic carbon instead.'
        },
        {
          text: '<mol smiles="CC(Br)Cc1ccccc1"></mol>',
          why: 'Br went on the middle carbon of the chain. The benzylic radical is the stable one, so Br goes on the carbon bonded to the ring.'
        },
        {
          text: '<mol smiles="CCC(Br)(Br)c1ccccc1"></mol>',
          why: 'Two Br atoms is too many. One equivalent of Br₂ or NBS replaces one benzylic H.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> A radical reaction: Br· removes the weakest C–H, the benzylic one, because the ring steadies that radical. No rich-to-poor arrow here.<br><b>Q2, where:</b> ONLY the benzylic carbon, the one bonded to the ring. No Br on the ring (that needs FeBr₃).<br><b>Q3, in space:</b> The radical is flat, so Br can arrive on either face: the benzylic carbon becomes a stereocentre and a <b>racemate</b> forms.<br><b>Kind of product:</b> a <b>benzylic bromide</b> (an alkyl halide). <a href="#reactions/benzylic-bromination">Open the benzylic bromination card</a>.',
      chk: { card: 'benzylic-bromination', sub: 'CCCc1ccccc1', v: 'fixed' },
      id: 's48'
    },
    {
      caveman: {"prompt":"<name new=\"acetophenone\" old=\"acetophenone\"></name> + <b>Zn(Hg), HCl, heat</b>: major product?","reveal":"<b>Q1:</b> Zn(Hg), HCl electron donor (rich): C=O next to ring reduced: two H add, O leaves.<br><b>Q2:</b> Only carbonyl on ring.<br><b>Q3:</b> CH₂: no stereocentre.<br><b>Kind:</b> <b>alkylbenzene</b>: aryl ketone to alkane side chain. <a href=\"#reactions/clemmensen\">Open Clemmensen card</a>","options":[{"why":"Starting ketone. Zn(Hg), HCl: C=O does not survive."},{"why":"Reduction goes all the way to CH₂. Alcohol only partial: Clemmensen does not stop."},{"why":"Ring not reduced. Clemmensen: only carbonyl next to ring."},{"why":"Yes. Zn(Hg), HCl, heat: C=O next to ring to CH₂. O leaves; ring untouched."}]}, // CAVEMAN
      type: 'predict',
      skill: 'predict-product',
      part: 2,
      prompt: 'Substrate: <name new="acetophenone" old="acetophenone"></name>. Reagent: <b>Zn(Hg), HCl, heat</b>. What is the major product?',
      equation: {
        reactants: ['CC(=O)c1ccccc1'],
        products: [],
        cond: 'Zn(Hg), HCl, heat'
      },
      options: [
        {
          text: '<mol smiles="CC(=O)c1ccccc1"></mol>',
          why: 'That is the starting ketone. Zn(Hg) with HCl is a strong reducing mix, so the C=O does not survive.'
        },
        {
          text: '<mol smiles="CC(O)c1ccccc1"></mol>',
          why: 'The reduction goes all the way to CH₂. An alcohol (C–OH) would be only a partial reduction, and Clemmensen does not stop there.'
        },
        {
          text: '<mol smiles="CCC1CCCCC1"></mol>',
          why: 'The ring is not reduced. Clemmensen reduces only the carbonyl next to the ring and leaves the benzene ring alone.'
        },
        {
          text: '<mol smiles="CCc1ccccc1"></mol>',
          correct: true,
          why: 'Yes. Zn(Hg) with HCl and heat reduces the C=O next to the ring all the way to CH₂. The O leaves and the ring is untouched.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> Zn(Hg) in HCl is the electron donor (rich): the C=O next to the ring is reduced, two H add and the O leaves.<br><b>Q2, where:</b> Only the carbonyl bonded to the ring.<br><b>Q3, in space:</b> Nothing to show: CH₂ is not a stereocentre.<br><b>Kind of product:</b> an <b>alkylbenzene</b>: an aryl ketone becomes an alkane side chain. <a href="#reactions/clemmensen">Open the Clemmensen card</a>.',
      chk: { card: 'clemmensen', sub: 'CC(=O)c1ccccc1', v: 'fixed' },
      id: 's49'
    },
    {
      caveman: {"prompt":"<name new=\"benzoic acid\" old=\"benzoic acid\"></name> + <b>Na, liquid NH₃, EtOH</b>: major product?","reveal":"<b>Q1:</b> Na, liquid NH₃ electron donor (rich): ring takes electrons: two H add.<br><b>Q2:</b> H on two para carbons: 1,4-diene. Electron-withdrawing CO₂H on sp³ carbon; donor OCH₃ on C=C carbon (Part 3).<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>1,4-cyclohexadiene</b>, not cyclohexane. <a href=\"#reactions/birch\">Open Birch card</a>","options":[{"why":"CO₂H on C=C carbon. Birch: electron-withdrawing group on sp³ carbon."},{"why":"Fully reduced ring. Birch: two H, stops at diene."},{"why":"Conjugated 1,3-diene. Birch: 1,4-diene: two H para, C=C apart."},{"why":"Yes. Birch: H on two para carbons, 1,4-diene. CO₂H on sp³ carbon."}]}, // CAVEMAN
      type: 'predict',
      skill: 'predict-product',
      part: 2,
      prompt: 'Substrate: <name new="benzoic acid" old="benzoic acid"></name>. Reagent: <b>Na, liquid NH₃, EtOH</b>. What is the major product?',
      equation: {
        reactants: ['OC(=O)c1ccccc1'],
        products: [],
        cond: 'Na, liquid NH₃, EtOH'
      },
      options: [
        {
          text: '<mol smiles="OC(=O)C1=CCC=CC1"></mol>',
          why: 'Here the CO₂H sits on a C=C carbon. An electron-withdrawing group ends up on an sp³ carbon in the Birch product.'
        },
        {
          text: '<mol smiles="OC(=O)C1CCCCC1"></mol>',
          why: 'That is the fully reduced ring. Birch adds only two H atoms and stops at the diene.'
        },
        {
          text: '<mol smiles="OC(=O)C1C=CC=CC1"></mol>',
          why: 'That is a conjugated 1,3-diene. Birch gives the 1,4-diene: the two H atoms add para to each other, so the two C=C bonds are apart.'
        },
        {
          text: '<mol smiles="OC(=O)C1C=CCC=C1"></mol>',
          correct: true,
          why: 'Yes. Birch puts H on two para ring carbons and leaves a 1,4-diene. The CO₂H (electron-withdrawing) sits on an sp³ carbon.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> Na in liquid NH₃ is the electron donor (rich): the ring takes electrons and two H add.<br><b>Q2, where:</b> H on two para carbons, leaving a 1,4-diene (two separate C=C). An electron-withdrawing group such as CO₂H ends up on an sp³ carbon; a donor such as OCH₃ stays on a C=C carbon (Part 3).<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> a <b>1,4-cyclohexadiene</b>, not cyclohexane. <a href="#reactions/birch">Open the Birch card</a>.',
      chk: { card: 'birch', sub: 'OC(=O)c1ccccc1', v: 'fixed' },
      id: 's50'
    },
    {
      caveman: {"prompt":"4-Methylbenzenesulfonic acid + <b>D₂SO₄, D₂O, heat</b>: product?","reveal":"<b>Q1:</b> Sulfonation reversed: ring (rich) takes D⁺ (poor) at carbon with SO₃H, SO₃ leaves.<br><b>Q2:</b> Exactly where SO₃H was.<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>arene</b> with D (or H) for SO₃H (toluene-4-d). <a href=\"#reactions/desulfonation\">Open card</a>","options":[{"why":"SO₃H gone; D replaces it, not H. D₂SO₄, D₂O supply D."},{"why":"Starting acid. Hot D₂SO₄, D₂O remove SO₃H."},{"why":"D exactly where SO₃H was (para to CH₃). Not another carbon."},{"why":"Yes. Hot acid reverses sulfonation: D (D₂SO₄, D₂O) replaces SO₃H on same carbon."}]}, // CAVEMAN
      type: 'predict',
      skill: 'predict-product',
      part: 2,
      prompt: 'Substrate: 4-methylbenzenesulfonic acid. Reagent: <b>D₂SO₄, D₂O, heat</b>. What is the major product?',
      equation: {
        reactants: ['Cc1ccc(S(=O)(=O)O)cc1'],
        products: [],
        cond: 'D₂SO₄, D₂O, heat'
      },
      options: [
        {
          text: '<mol smiles="Cc1ccccc1"></mol>',
          why: 'The SO₃H is gone, but the atom that replaces it is D, not H. D₂SO₄ in D₂O supplies D.'
        },
        {
          text: '<mol smiles="Cc1ccc(S(=O)(=O)O)cc1"></mol>',
          why: 'That is the starting acid. Hot D₂SO₄ in D₂O runs sulfonation backwards, so the SO₃H is removed.'
        },
        {
          text: '<mol smiles="Cc1cccc([2H])c1"></mol>',
          why: 'The D must go exactly where the SO₃H was (para to the CH₃). It does not end up on a different ring carbon.'
        },
        {
          text: '<mol smiles="Cc1ccc([2H])cc1"></mol>',
          correct: true,
          why: 'Yes. Hot acid reverses sulfonation: D (from D₂SO₄ and D₂O) replaces the SO₃H on the same carbon, and nothing else on the ring moves.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> Sulfonation run backwards: the ring (rich) takes D⁺ (poor) at the carbon that holds SO₃H, then SO₃ leaves.<br><b>Q2, where:</b> Exactly where the SO₃H was; nothing else moves.<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> an <b>arene</b> with D (or H) in place of SO₃H (toluene-4-d). <a href="#reactions/desulfonation">Open the desulfonation card</a>.',
      chk: { card: 'desulfonation', sub: 'Cc1ccc(S(=O)(=O)O)cc1', v: 'fixed' },
      id: 's51'
    },
    {
      caveman: {"prompt":"<name new=\"1-methyl-4-nitrobenzene\" old=\"p-nitrotoluene\"></name> + <b>Fe, H₃O⁺, then HO⁻</b>: major product?","reveal":"<b>Q1:</b> Fe electron donor (rich), N of NO₂ poor: H adds, O leaves.<br><b>Q2:</b> At nitro group; rest unchanged.<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>aromatic amine</b> (p-toluidine). <a href=\"#reactions/nitro-reduction\">Open card</a>","options":[{"why":"Ring saturated. Fe, H₃O⁺ reduces only NO₂ to NH₂."},{"why":"NO₂ unchanged. Fe, H₃O⁺ reduces NO₂ to NH₂."},{"why":"NH₂ on different carbon. It replaces NO₂ on SAME carbon."},{"why":"Yes. Fe (or Sn, SnCl₂), H₃O⁺, then HO⁻: NO₂ to NH₂, same carbon."}]}, // CAVEMAN
      type: 'predict',
      skill: 'side-chains',
      part: 2,
      prompt: 'Substrate: <name new="1-methyl-4-nitrobenzene" old="p-nitrotoluene"></name>. Reagent: <b>Fe, H₃O⁺, then HO⁻</b>. What is the major product?',
      equation: {
        reactants: ['Cc1ccc(cc1)[N+](=O)[O-]'],
        products: [],
        cond: 'Fe, H₃O⁺, then HO⁻'
      },
      options: [
        {
          text: '<mol smiles="CC1CCC(N)CC1"></mol>',
          why: 'The ring is saturated here. Fe with H₃O⁺ reduces only the NO₂ to NH₂ and leaves the ring aromatic.'
        },
        {
          text: '<mol smiles="Cc1ccc([N+](=O)[O-])cc1"></mol>',
          why: 'The NO₂ is unchanged. Fe with H₃O⁺ reduces NO₂ to NH₂.'
        },
        {
          text: '<mol smiles="Cc1cccc(N)c1"></mol>',
          why: 'The NH₂ is on a different ring carbon. It replaces the NO₂ on the SAME carbon; the ring positions do not change.'
        },
        {
          text: '<mol smiles="Cc1ccc(N)cc1"></mol>',
          correct: true,
          why: 'Yes. Fe (or Sn, SnCl₂) with H₃O⁺, then HO⁻, turns NO₂ into NH₂ on the same ring carbon and leaves the ring alone.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> Fe is the electron donor (rich), the N of NO₂ is the poor one: H adds, O leaves.<br><b>Q2, where:</b> At the nitro group; the rest of the ring is unchanged.<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> an <b>aromatic amine</b> (p-toluidine). <a href="#reactions/nitro-reduction">Open the nitro reduction card</a>.',
      chk: { card: 'nitro-reduction', sub: 'Cc1ccc(cc1)[N+](=O)[O-]', v: 'Fe' },
      id: 's52'
    },
    {
      caveman: {"prompt":"C–OH carbon with H loses two H. 1-Phenylbutane-1,4-diol + <b>PCC, CH₂Cl₂</b>: product?","reveal":"<b>Q1:</b> Nothing adds: two H removed. Alcohol O (rich) attacks Cr(VI) (poor).<br><b>Q2:</b> Every 1° and 2° alcohol. 1°: aldehyde, stops (no water); 2°: ketone; 3°: none.<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>aldehyde</b> and <b>ketone</b>, one molecule. <a href=\"#reactions/oxidation-pcc\">Open PCC card</a>","options":[{"why":"Only 1° OH oxidised. 2° OH next to ring: ketone too."},{"why":"Aldehyde further to carboxylic acid. PCC, CH₂Cl₂, no water: 1° stops at aldehyde."},{"why":"Only 2° OH oxidised. PCC oxidises every 1°, 2° alcohol: 1° OH to CHO too."},{"why":"Yes. PCC takes two H from each alcohol: 1° OH: CHO (stops), 2° OH: ketone."}]}, // CAVEMAN
      type: 'predict',
      skill: 'predict-product',
      part: 2,
      prompt: '<b>Alcohol oxidations.</b> Each C–OH carbon that has an H loses two H. Substrate: 1-phenylbutane-1,4-diol. Reagent: <b>PCC, CH₂Cl₂</b>. What is the major product?',
      equation: {
        reactants: ['OC(CCCO)c1ccccc1'],
        products: [],
        cond: 'PCC, CH₂Cl₂'
      },
      options: [
        {
          text: '<mol smiles="OC(CCC=O)c1ccccc1"></mol>',
          why: 'Only the 1° OH was oxidised. The 2° alcohol next to the ring also loses two H and becomes a ketone.'
        },
        {
          text: '<mol smiles="OC(=O)CCC(=O)c1ccccc1"></mol>',
          why: 'That oxidises the aldehyde further, to the carboxylic acid. PCC in CH₂Cl₂ has no water, so a 1° alcohol stops at the aldehyde.'
        },
        {
          text: '<mol smiles="O=C(CCCO)c1ccccc1"></mol>',
          why: 'Only the 2° OH was oxidised. PCC oxidises every 1° and 2° alcohol, so the 1° OH at the chain end must become CHO too.'
        },
        {
          text: '<mol smiles="O=CCCC(=O)c1ccccc1"></mol>',
          correct: true,
          why: 'Yes. PCC takes two H from each alcohol that has an H on its carbon: the 1° OH becomes CHO (and stops there) and the 2° OH becomes a ketone.'
        }
      ],
      reveal: '<b>Q1, what adds:</b> Nothing adds: two H are taken away. The alcohol O (rich) attacks the Cr(VI) (poor), and the C–H and O–H electrons go with it.<br><b>Q2, where:</b> Every 1° and 2° alcohol. 1° gives an aldehyde and stops (no water); 2° gives a ketone; 3° does not react.<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> an <b>aldehyde</b> and a <b>ketone</b> in one molecule. <a href="#reactions/oxidation-pcc">Open the PCC card</a>.',
      chk: { card: 'oxidation-pcc', sub: 'OC(CCCO)c1ccccc1', v: 'fixed' },
      id: 's53'
    },
    {
      caveman: {"prompt":"Butan-1-ol + <b>Na₂Cr₂O₇, H₂SO₄, H₂O</b>: major product?","reveal":"<b>Q1:</b> Two H removed by Cr(VI) (poor). In water aldehyde takes O, oxidised again.<br><b>Q2:</b> 1° alcohol to acid; 2° stops at ketone; 3°: none.<br><b>Q3:</b> Nothing.<br><b>Kind:</b> <b>carboxylic acid</b> (butanoic acid); ketone from 2° alcohol. <a href=\"#reactions/oxidation-cr\">Open Cr(VI) card</a>","options":[{"why":"Acid keeps four carbons. CH₂OH becomes CO₂H, chain uncut."},{"why":"Starting alcohol. Cr(VI), H₂SO₄ oxidise 1° OH"},{"why":"Aldehyde: PCC stops. In water Cr(VI) oxidises it again: acid."},{"why":"Yes. In water: aldehyde, then acid. Cr(VI) goes past aldehyde (PCC does not)."}]}, // CAVEMAN
      type: 'predict',
      skill: 'predict-product',
      part: 2,
      prompt: 'Substrate: butan-1-ol. Reagent: <b>Na₂Cr₂O₇, H₂SO₄, H₂O</b>. What is the major product?',
      equation: {
        reactants: ['CCCCO'],
        products: [],
        cond: 'Na₂Cr₂O₇, H₂SO₄, H₂O'
      },
      options: [
        {
          text: '<mol smiles="CCC(=O)O"></mol>',
          why: 'The acid keeps all four carbons. Oxidation changes the CH₂OH into CO₂H and does not cut the chain.'
        },
        {
          text: '<mol smiles="CCCCO"></mol>',
          why: 'That is the starting alcohol. Cr(VI) with H₂SO₄ oxidises a 1° alcohol.'
        },
        {
          text: '<mol smiles="CCCC=O"></mol>',
          why: 'That is the aldehyde, where PCC stops. In water, Cr(VI) oxidises the aldehyde again, so the 1° alcohol ends as the acid.'
        },
        {
          text: '<mol smiles="CCCC(=O)O"></mol>',
          correct: true,
          why: 'Yes. In water, a 1° alcohol goes through the aldehyde and on to the carboxylic acid. Cr(VI) does not stop at the aldehyde (PCC does).'
        }
      ],
      reveal: '<b>Q1, what adds:</b> Nothing adds at first: two H are taken away by Cr(VI) (poor). In water the aldehyde takes on O and is oxidised again.<br><b>Q2, where:</b> A 1° alcohol goes on to the acid; a 2° alcohol stops at the ketone; 3° does not react.<br><b>Q3, in space:</b> Nothing to show.<br><b>Kind of product:</b> a <b>carboxylic acid</b> (butanoic acid); a ketone from a 2° alcohol. <a href="#reactions/oxidation-cr">Open the Cr(VI) oxidation card</a>.',
      chk: { card: 'oxidation-cr', sub: 'CCCCO', v: 'fixed' },
      id: 's54'
    },
    {
      caveman: {"prompt":"<b>Exception 1: Q2 one reverse.</b> Propene + four reagents. Three: new group on C2 (middle). One: C1 (end), MORE H. Which?","worked":"Hydroboration: BH₃ across C=C, B to C1, H to C2; H₂O₂, NaOH: B becomes OH: propan-1-ol, OH on MORE H carbon. <a href=\"#reactions/alkene-hydroboration\">Card</a>.","hints":["Three make carbocation first. One adds both in one step.","No cation: no “+ goes where steadier”; boron to less crowded carbon."],"options":[{"why":"H to C1, Br to C2: 2-bromopropane. Q2 as usual."},{"why":"Yes. B, H in one step, no cation: B to less crowded carbon; H₂O₂: OH: propan-1-ol. Reverse of Q2."},{"why":"2° cation again: OH on C2, propan-2-ol."},{"why":"Same as HBr: H to C1, Cl to C2, 2° cation."}]}, // CAVEMAN
      type: 'choice',
      part: 3,
      skill: 'predict-product',
      smiles: 'CC=C',
      prompt: '<b>Exception 1: Q2 has one reverse.</b> Propene meets four reagents. Three put the new group on C2, the middle carbon. One puts it on C1, the end carbon, where there is MORE H. Which one?',
      options: [
        {
          text: 'HBr in ether',
          why: 'H goes to C1 and Br to C2: 2-bromopropane. The 2° cation decides, so this follows Q2 as usual.'
        },
        {
          text: 'BH₃·THF, then H₂O₂, NaOH',
          correct: true,
          why: 'Yes. B and H add in one step with no cation: B goes to the less crowded carbon (more H). H₂O₂ swaps B for OH: propan-1-ol. This is the one reverse of Q2.'
        },
        {
          text: 'H₂O with a little H₂SO₄',
          why: 'The 2° cation again: OH ends up on C2, propan-2-ol.'
        },
        {
          text: 'HCl in ether',
          why: 'The same as HBr: H to C1, Cl to C2, through the 2° cation.'
        }
      ],
      hints: [
        'Three of these reagents make a carbocation first. One adds both pieces in a single step, with no cation.',
        'The one without a cation cannot use the “+ goes where it is steadier” reasoning, and its boron goes to the less crowded carbon.'
      ],
      worked: 'Hydroboration: BH₃ adds across the C=C in one step, B to C1 and H to C2, then H₂O₂ and NaOH replace B with OH. The OH ends up on the carbon with MORE H: propan-1-ol. <a href="#reactions/alkene-hydroboration">See the card</a>.',
      id: 's55'
    },
    {
      caveman: {"prompt":"<b>Exception 2: halogens.</b> Chlorobenzene + HNO₃, H₂SO₄. Rate vs benzene, where NO₂ goes?","worked":"Rate: Cl pulls: slower. Position: ortho, para attack: Cl lone pair shares +; meta cannot. Slower, but ortho, para. <a href=\"#reactions/director-halogen\">Card</a>.","hints":["Two separate questions: rate (Cl pulls or pushes?), position (lone pair shares +?).","Rate: Cl pulls: slower. Position: ortho, para: lone pair gives extra form; meta none."],"options":[{"why":"Yes. Cl pulls (slower); lone pair carries + in ortho, para attack. Halogens: deactivator not meta."},{"why":"Slower right; meta is NO₂, C≡N, C=O pattern. Cl lone pair: ortho/para."},{"why":"ortho/para right. But Cl pulls electrons: slower, not faster."},{"why":"Neither: Cl slows ring; lone pair sends ortho, para."}]}, // CAVEMAN
      type: 'choice',
      part: 3,
      skill: 'directors',
      smiles: 'Clc1ccccc1',
      prompt: '<b>Exception 2: halogens.</b> Chlorobenzene is nitrated with HNO₃ and H₂SO₄. Compared with benzene, how fast is it, and where does NO₂ go?',
      options: [
        {
          text: 'Slower than benzene, and NO₂ goes ortho and para to the Cl',
          correct: true,
          why: 'Yes. Cl pulls electrons through the σ bond (slower), but a lone pair on Cl can carry the + in ortho and para attack: o/p. Halogens are the one deactivator that is not meta.'
        },
        {
          text: 'Slower than benzene, and NO₂ goes meta to the Cl',
          why: 'Slower is right, but meta is the pattern of NO₂, C≡N and C=O. Cl has a lone pair that shares the + in ortho/para attack.'
        },
        {
          text: 'Faster than benzene, and NO₂ goes ortho and para to the Cl',
          why: 'The ortho/para part is right. But Cl pulls electrons away, so the ring is slower than benzene, not faster.'
        },
        {
          text: 'Faster than benzene, and NO₂ goes meta to the Cl',
          why: 'Neither part holds: Cl slows the ring, and its lone pair sends the new group ortho and para.'
        }
      ],
      hints: [
        'Two separate questions: the rate (does Cl pull electrons or push them through the σ bond?) and the position (can a lone pair on Cl share the +?).',
        'Rate: Cl is more electronegative than C, so it pulls: slower. Position: in ortho and para attack, Cl’s lone pair gives an extra resonance form; meta has none.'
      ],
      worked: 'Rate: the inductive pull of Cl makes the ring poorer, so slower than benzene. Position: ortho and para attack allow a form with the + shared by Cl’s lone pair; meta attack cannot. So slower, but ortho and para. <a href="#reactions/director-halogen">See the card</a>.',
      id: 's56'
    },
    {
      caveman: {"prompt":"<b>Exception 3: PCC stops at aldehyde.</b> Butan-1-ol, PCC, CH₂Cl₂, no water. (Na₂Cr₂O₇, aqueous H₂SO₄: butanoic acid.) Product?","worked":"PCC, CH₂Cl₂ removes two H from CH₂OH: CH=O, stops: butanal. Cr(VI) in water: butanoic acid. <a href=\"#reactions/oxidation-pcc\">Card</a>.","hints":["Alcohol oxidation takes two H, keeps O as C=O. Solvent?","No water: aldehyde not hydrated: no second oxidation."],"options":[{"why":"Yes. PCC takes two H from 1° alcohol; no water: butanal."},{"why":"Needs water. In CH₂Cl₂ PCC stops at aldehyde (Na₂Cr₂O₇ in water: acid)."},{"why":"Starting alcohol. PCC oxidises 1° alcohol."},{"why":"Dehydration (H₂O lost), not oxidation. PCC takes two H."}]}, // CAVEMAN
      type: 'choice',
      part: 3,
      skill: 'predict-product',
      smiles: 'CCCCO',
      prompt: '<b>Exception 3: PCC stops at the aldehyde.</b> Butan-1-ol is stirred with PCC in CH₂Cl₂, with no water. (Na₂Cr₂O₇ in aqueous H₂SO₄ turns the same alcohol into butanoic acid.) What does PCC give?',
      options: [
        {
          smiles: 'CCCC=O',
          alt: 'butanal',
          correct: true,
          why: 'Yes. PCC takes two H from the 1° alcohol and, with no water, the aldehyde survives: butanal.'
        },
        {
          smiles: 'CCCC(=O)O',
          alt: 'butanoic acid',
          why: 'That needs water to oxidise the aldehyde again. In CH₂Cl₂, PCC stops at the aldehyde (Na₂Cr₂O₇ in water goes on to the acid).'
        },
        {
          smiles: 'CCCCO',
          alt: 'butan-1-ol',
          why: 'That is the starting alcohol. PCC oxidises a 1° alcohol, so it does not come back unchanged.'
        },
        {
          smiles: 'C=CCC',
          alt: 'but-1-ene',
          why: 'That loses H₂O (a dehydration), which is not an oxidation. PCC takes two H and keeps the O as C=O.'
        }
      ],
      hints: [
        'An oxidation of an alcohol takes away two H and keeps the O as C=O. What does the solvent contain?',
        'No water means the aldehyde is not hydrated, so it cannot be oxidised a second time.'
      ],
      worked: 'PCC in CH₂Cl₂ removes two H from CH₂OH to give CH=O and stops there: butanal. Cr(VI) in water would hydrate the aldehyde and take it to butanoic acid. <a href="#reactions/oxidation-pcc">See the card</a>.',
      chk: { engine: 'oxidise', sub: 'CCCCO', reagent: 'PCC', answer: 'CCCC=O' },
      id: 's57'
    },
    {
      caveman: {"prompt":"<b>Exception 4: amine in strong acid.</b> Aniline NH₂: ortho/para, yet HNO₃, H₂SO₄: NO₂ meta. Why?","worked":"Strong acid: –NH₂ becomes –NH₃⁺. No lone pair, + charge: electron-withdrawing: meta. <a href=\"#reactions/amine-in-acid\">Card</a>.","hints":["Basic N in concentrated H₂SO₄? Then: lone pair left to give?","No lone pair, + charge: pulls electrons. Such deactivators direct meta."],"options":[{"why":"Yes. Lone pair now holds H⁺. Positive group deactivates: meta."},{"why":"C–N bond stays. Change on N: picks up H⁺."},{"why":"Size no: para far from N. Reason: –NH₃⁺ no lone pair, electron-withdrawing."},{"why":"Neutral or basic: NH₂ strong activator, ortho/para. Acid changes it."}]}, // CAVEMAN
      type: 'choice',
      part: 3,
      skill: 'predict-product',
      smiles: 'Nc1ccccc1',
      prompt: '<b>Exception 4: an amine in strong acid.</b> The NH₂ group of aniline is an ortho/para director. Yet with HNO₃ in H₂SO₄ the NO₂ goes mostly meta. What changed?',
      options: [
        {
          text: 'The N takes H⁺ in the strong acid, and –NH₃⁺ has no lone pair and pulls electrons: it directs meta',
          correct: true,
          why: 'Yes. The N lone pair that fed the ring is now holding an H⁺. The positive group deactivates the ring and directs meta.'
        },
        {
          text: 'H₂SO₄ strips the NH₂ group off the ring, so only the ring’s own H atoms are left to decide where NO₂ goes',
          why: 'The C–N bond stays. The change is on the N itself: it picks up H⁺.'
        },
        {
          text: 'NO₂⁺ is too large to reach the carbons ortho and para to the N, so it is forced to go meta instead',
          why: 'Size does not explain it: para is far from the N. The reason is that –NH₃⁺ has no lone pair and is electron-withdrawing.'
        },
        {
          text: 'NH₂ turns into a deactivator in every solvent, with or without acid, so it always directs meta',
          why: 'In neutral or basic conditions NH₂ is a strong activator and directs ortho/para. It is the acid that changes it.'
        }
      ],
      hints: [
        'What does a basic N do in concentrated H₂SO₄? Then ask whether the new group still has a lone pair to give.',
        'Without a lone pair, and carrying a + charge, the group pulls electrons out of the ring. Deactivators with no lone pair direct meta.'
      ],
      worked: 'In strong acid the amine is protonated: –NH₂ becomes –NH₃⁺. With no lone pair and a + charge it is electron-withdrawing, so it directs meta. <a href="#reactions/amine-in-acid">See the card</a>.',
      id: 's58'
    },
    {
      caveman: {"prompt":"<b>Exception 5: Clemmensen.</b> Target propylbenzene. CH₃CH₂CH₂Cl, AlCl₃ gives isopropylbenzene (cation shifts). Route?","worked":"CH₃CH₂COCl, AlCl₃: propiophenone (no shift). Zn(Hg), HCl, heat: C=O to CH₂: propylbenzene. <a href=\"#reactions/clemmensen\">Card</a>.","hints":["Which puts straight three-carbon chain on, no shifting cation? Then remove oxygen.","Acylium no rearrangement. metal in acid: C=O to CH₂."],"options":[{"why":"Yes. Acylium no shift: straight chain. Zn(Hg), HCl, heat: C=O to CH₂."},{"why":"KMnO₄ oxidises; never C=O to CH₂. No benzylic H."},{"why":"Cation already shifted: wrong chain on ring. Zn(Hg), HCl reduces only C=O: none here."},{"why":"Builds aniline. No propyl chain."}]}, // CAVEMAN
      type: 'choice',
      part: 3,
      skill: 'predict-product',
      smiles: 'CCCc1ccccc1',
      prompt: '<b>Exception 5: Clemmensen, taught on its card.</b> The target is propylbenzene. Benzene with CH₃CH₂CH₂Cl and AlCl₃ gives isopropylbenzene instead (the cation shifts). Which route reaches propylbenzene?',
      options: [
        {
          text: 'Acylate with CH₃CH₂COCl and AlCl₃, then reduce the C=O with Zn(Hg), HCl, heat',
          correct: true,
          why: 'Yes. An acylium ion does not shift, so the chain stays straight. Zn(Hg) with HCl and heat then turns the C=O next to the ring into CH₂.'
        },
        {
          text: 'Acylate with CH₃CH₂COCl and AlCl₃, then oxidise the side chain with KMnO₄ and heat',
          why: 'KMnO₄ oxidises; it never turns C=O into CH₂. The benzylic carbon of the ketone has no H, so nothing happens.'
        },
        {
          text: 'Alkylate with CH₃CH₂CH₂Cl and AlCl₃, then heat the product with Zn(Hg) and HCl',
          why: 'The cation has already shifted, so the wrong chain is on the ring. Zn(Hg) with HCl reduces only a C=O, and there is none to reduce.'
        },
        {
          text: 'Nitrate with HNO₃ and H₂SO₄, then reduce the NO₂ group with Fe and H₃O⁺',
          why: 'That builds aniline, a different molecule. It puts no propyl chain on the ring.'
        }
      ],
      hints: [
        'Which reaction puts a straight three-carbon chain on a ring without a cation that can shift? Then ask how to remove the oxygen.',
        'Acylium ions do not rearrange. The C=O is then reduced to CH₂ by a metal in acid.'
      ],
      worked: 'Step 1: CH₃CH₂COCl with AlCl₃ gives propiophenone (an acylium does not shift). Step 2: Zn(Hg), HCl and heat reduce the C=O to CH₂: propylbenzene. <a href="#reactions/clemmensen">See the card</a>.',
      id: 's59'
    },
    {
      caveman: {"prompt":"<b>Exception 6: Birch.</b> Anisole (methoxybenzene) + Na, liquid NH₃, EtOH: two H para, two separate C=C. OCH₃ where?","worked":"Two H para (C1, C4). Donor OCH₃ stays on C=C carbon: 1-methoxycyclohexa-1,4-diene. <a href=\"#reactions/birch\">Card</a>.","hints":["Birch: 1,4-diene: two new H para, C=C apart. Check each drawing.","Donor (OCH₃, alkyl): C=C carbon; electron-withdrawing (CO₂H): sp³ carbon."],"options":[{"why":"OCH₃ on sp³ carbon. Donor stays on C=C carbon."},{"why":"Fully reduced ring. Birch: two H, stops at diene."},{"why":"Conjugated 1,3-diene. Birch: 1,4-diene: two H para, C=C apart."},{"why":"Yes. Birch: two para H, 1,4-diene. OCH₃ on sp² C=C carbon."}]}, // CAVEMAN
      type: 'choice',
      part: 3,
      skill: 'predict-product',
      smiles: 'COc1ccccc1',
      prompt: '<b>Exception 6: Birch, taught on its card.</b> Anisole (methoxybenzene) is treated with Na, liquid NH₃ and EtOH. Birch adds two H on para carbons and keeps two separate C=C. Where does the OCH₃ end up?',
      options: [
        {
          smiles: 'COC1C=CCC=C1',
          why: 'Here the OCH₃ sits on an sp³ carbon. An electron-donating group stays on a C=C carbon in the Birch product.'
        },
        {
          smiles: 'COC1CCCCC1',
          why: 'That is the fully reduced ring. Birch adds only two H atoms and stops at the diene.'
        },
        {
          smiles: 'COC1=CC=CCC1',
          why: 'That is a conjugated 1,3-diene. Birch gives the 1,4-diene: the two H atoms add para to each other, so the two C=C bonds are apart.'
        },
        {
          smiles: 'COC1=CCC=CC1',
          correct: true,
          why: 'Yes. Birch puts H on two para ring carbons and leaves a 1,4-diene. The OCH₃ (electron-donating) stays on a C=C carbon (sp²).'
        }
      ],
      hints: [
        'Birch gives a 1,4-diene: the two new H are para, so the two C=C bonds are apart. Check each drawing for that first.',
        'An electron-donating group (OCH₃, alkyl) stays on a C=C carbon; an electron-withdrawing group (CO₂H) ends up on an sp³ carbon.'
      ],
      worked: 'Two H add para to each other (carbons 1 and 4), leaving two separate C=C. The donor OCH₃ stays on a C=C carbon: 1-methoxycyclohexa-1,4-diene. <a href="#reactions/birch">See the card</a>.',
      chk: { card: 'birch', sub: 'COc1ccccc1', v: 'fixed' },
      id: 's60'
    },
    {
      caveman: {"prompt":"<b>Exception 7: Diels–Alder.</b> Penta-1,3-diene (CH₃ on C1) + acrolein (CHO), heated. Which ring?","worked":"C1 (CH₃), C4 bond acrolein carbons; new C=C between old C2, C3. 1-Substituted diene: “1,2” product, CHO next to CH₃: 2-methylcyclohex-3-ene-1-carbaldehyde. <a href=\"#reactions/diels-alder\">Card</a>.","hints":["Number diene from CH₃ end. C1, C4 bond dienophile; new C=C old C2–C3.","Group on C1: “1,2” (ortho-like) product: CHO on ring carbon next to CH₃ carbon."],"options":[{"why":"Yes. Diene ends bond dienophile carbons: six-membered ring. New C=C between old C2, C3; CHO next to CH₃: \"1,2\" product."},{"why":"CHO, CH₃ 1,3 here: wrong dienophile carbon. 1-Substituted diene: \"1,2\" product."},{"why":"New C=C wrong place: between old C2, C3, next to CH₃ carbon."},{"why":"Diels–Alder adds no H. Diene, dienophile join; one C=C left."}]}, // CAVEMAN
      type: 'choice',
      part: 3,
      skill: 'predict-product',
      equation: {
        reactants: ['C=C/C=C/C', 'C=CC=O'],
        products: [],
        cond: 'heat'
      },
      prompt: '<b>Exception 7: Diels–Alder, taught on its card.</b> Penta-1,3-diene (a CH₃ on diene C1) and acrolein (a dienophile with a CHO group) are heated. Which six-membered ring forms?',
      options: [
        {
          smiles: 'CC1C=CCCC1C=O',
          correct: true,
          why: 'Yes. The diene ends (C1 and C4) bond to the two dienophile carbons and close a six-membered ring. The new C=C sits between the old C2 and C3, and the CHO lands next to the CH₃: the "1,2" product.'
        },
        {
          smiles: 'O=CC1CC(C)C=CC1',
          why: 'The CHO and the CH₃ are 1,3 here: the diene end that carries the CH₃ bonded to the wrong dienophile carbon. A 1-substituted diene gives the "1,2" product.'
        },
        {
          smiles: 'O=CC1C(C)CC=CC1',
          why: 'The new C=C is in the wrong place. It must sit between the old C2 and C3, right next to the carbon that holds the CH₃.'
        },
        {
          smiles: 'O=CC1C(C)CCCC1',
          why: 'A Diels–Alder adds no H atoms. The diene and the dienophile just join, and one C=C is left in the ring.'
        }
      ],
      hints: [
        'Number the diene C1 to C4 from the CH₃ end. C1 and C4 bond to the two dienophile carbons, and the new C=C sits between old C2 and C3.',
        'A diene with a group on C1 gives the “1,2” (ortho-like) product: the CHO ends up on the ring carbon next to the one that holds the CH₃.'
      ],
      worked: 'C1 (with the CH₃) and C4 bond to the two acrolein carbons, closing the ring; the new C=C is between old C2 and C3. The 1-substituted diene gives the “1,2” product, with the CHO next to the CH₃: 2-methylcyclohex-3-ene-1-carbaldehyde. <a href="#reactions/diels-alder">See the card and its pen-and-paper steps</a>.',
      chk: { card: 'diels-alder', sub: 'C=C/C=C/C.C=CC=O', v: 'fixed' },
      id: 's61'
    },
    {
      caveman: {"prompt":"<b>Exam pattern: alkene.</b> Write major organic product, indicate stereochemistry. <name new=\"1-methylcyclohexene\" old=\"1-methylcyclohexene\"></name> + <b>RCO₃H, then H₃O⁺</b>.","reveal":"Q1: epoxide, then water: OH, OH add. Q2: one OH per carbon. Q3: water opens epoxide from back: anti: OH <b>trans</b>; flat alkene: <b>racemate</b> (write one enantiomer, say so). <a href=\"#reactions/alkene-epoxide-diol\">Open card</a>","options":[{"why":"Yes. Epoxide; H₃O⁺, water open from back: OH anti (trans on ring). (racemate: either drawing correct)"},{"why":"syn product: both OH SAME face. RCO₃H, then H₃O⁺ adds anti."},{"why":"Not just H₂: RCO₃H, H₃O⁺ adds OH, OH."},{"why":"Epoxide. RCO₃H, H₃O⁺ adds OH, OH, not epoxide."}]}, // CAVEMAN
      type: 'predict',
      skill: 'stereo-addition',
      part: 4,
      prompt: '<b>Exam pattern: an alkene.</b> Write the structure of the major organic product of the reaction below, and indicate stereochemistry. The substrate is <name new="1-methylcyclohexene" old="1-methylcyclohexene"></name>; it is treated with <b>RCO₃H, then H₃O⁺</b>.',
      equation: {
        reactants: ['CC1=CCCCC1'],
        products: [],
        cond: 'RCO₃H, then H₃O⁺'
      },
      options: [
        {
          text: '<mol smiles="C[C@@]1(O)CCCC[C@H]1O"></mol>',
          correct: true,
          why: 'Yes. The peroxyacid makes the epoxide; H₃O⁺ and water open it from the back, so the two OH groups are anti (trans on a ring). (formed as a racemate: the mirror image forms equally, so either drawing is correct)'
        },
        {
          text: '<mol smiles="C[C@@]1(O)CCCC[C@@H]1O"></mol>',
          why: 'This is the syn product: the two OH sit on the SAME face. RCO₃H, then H₃O⁺ adds anti (opposite faces).'
        },
        {
          text: '<mol smiles="CC1CCCCC1"></mol>',
          why: 'This adds two H (the alkane). RCO₃H, then H₃O⁺ adds OH and OH, not just H₂.'
        },
        {
          text: '<mol smiles="C[C@@]12CCCC[C@@H]1O2"></mol>',
          why: 'This has an O bridging the two carbons (an epoxide). RCO₃H, then H₃O⁺ adds OH and OH, not an epoxide.'
        }
      ],
      reveal: 'Three questions, three answers. Q1: the π bond attacks the peroxyacid O (epoxide), then water attacks: OH and OH add. Q2: one OH on each carbon. Q3: water opens the epoxide from the back, so anti: the OH groups are <b>trans</b>, and a flat alkene gives a <b>racemate</b> (write one enantiomer and say so). <a href="#reactions/alkene-epoxide-diol">Open the card</a>.',
      chk: { card: 'alkene-epoxide-diol', sub: 'CC1=CCCCC1', v: 'RCO3H_H3O' },
      id: 's62'
    },
    {
      caveman: {"prompt":"<b>Exam pattern: ring, two directors.</b> Write major organic product. 1-Chloro-4-methylbenzene + <b>HNO₃, H₂SO₄</b>.","reveal":"Q1: ring rich, NO₂⁺ poor. Q2: CH₃, Cl both ortho/para: stronger activator CH₃ wins. NO₂ ortho to CH₃ (two ortho alike: one product), also meta to Cl. Q3: nothing. Name kind: <b>ortho substitution product</b>. <a href=\"#reactions/director-activating\">Open activator card</a>, <a href=\"#reactions/director-halogen\">halogen card</a>.","options":[{"why":"Yes. Both ortho/para, CH₃ stronger activator: NO₂ ortho to CH₃, also meta to Cl (4-chloro-2-nitrotoluene)."},{"why":"Both ortho/para; stronger activator (CH₃) decides, not Cl: NO₂ meta to CH₃ wrong."},{"why":"NO₂ replaced Cl. Electrophile replaces H; groups there stay."},{"why":"TWO new groups. One NO₂⁺ replaces one H: one product asked."}]}, // CAVEMAN
      type: 'predict',
      skill: 'directors',
      part: 4,
      prompt: '<b>Exam pattern: an aromatic ring with two directors.</b> Write the structure of the major organic product of the reaction below. 1-Chloro-4-methylbenzene is treated with <b>HNO₃, H₂SO₄</b>.',
      equation: {
        reactants: ['Clc1ccc(C)cc1'],
        products: [],
        cond: 'HNO₃, H₂SO₄'
      },
      options: [
        {
          text: '<mol smiles="Cc1ccc(Cl)cc1[N+](=O)[O-]"></mol>',
          correct: true,
          why: 'Yes. Both groups are ortho/para directors, but CH₃ is the stronger activator, so it decides: NO₂ goes ortho to the CH₃, which is also meta to the Cl (4-chloro-2-nitrotoluene).'
        },
        {
          text: '<mol smiles="Cc1ccc(Cl)c([N+](=O)[O-])c1"></mol>',
          why: 'That puts NO₂ ortho to the Cl and meta to the CH₃. Both groups point ortho/para, but the stronger activator (CH₃) decides, not the Cl.'
        },
        {
          text: '<mol smiles="Cc1ccc([N+](=O)[O-])cc1"></mol>',
          why: 'Here NO₂ has replaced the Cl. An electrophile replaces an H on the ring; the groups already there stay.'
        },
        {
          text: '<mol smiles="Cc1ccc(Cl)c([N+](=O)[O-])c1[N+](=O)[O-]"></mol>',
          why: 'This ring has TWO new groups. One NO₂⁺ replaces just one H, and the question asks for the one product.'
        }
      ],
      reveal: 'Q1: the ring is the rich partner, NO₂⁺ the poor one. Q2: both CH₃ and Cl direct ortho/para, so ask which wins: the stronger activator, CH₃. NO₂ goes ortho to the CH₃ (the two ortho carbons are alike, so one product), which is also meta to the Cl. Q3: nothing to show. Name the kind in your answer: an <b>ortho substitution product</b>. <a href="#reactions/director-activating">Open the activator card</a> and <a href="#reactions/director-halogen">the halogen card</a>.',
      chk: {
        engine: 'subst',
        sub: 'Clc1ccc(C)cc1',
        reagent: 'HNO3',
        answer: 'Cc1ccc(Cl)cc1[N+](=O)[O-]'
      },
      id: 's63'
    },
    {
      caveman: {"prompt":"<b>Exam pattern: alkyne.</b> Write major organic product, indicate stereochemistry. <name new=\"hex-3-yne\" old=\"3-hexyne\"></name> + <b>Br₂ (1 equiv.)</b>.","reveal":"Q1: π bond rich, polarised Br₂ poor: Br, Br add. Q2: one Br per triple-bond carbon. Q3: bromonium: anti: Br opposite sides: <b>(E)</b> dibromoalkene. Two equivalents: tetrabromide. <a href=\"#reactions/alkyne-x2-1\">Open card</a>","options":[{"why":"Other halogen. Br₂ (1 equiv.) adds Br."},{"why":"Four Br: 2 equivalents Br₂. One equivalent: one Br₂."},{"why":"Both Br SAME side (cis). Br₂ adds anti: Br trans."},{"why":"Yes. Br₂ adds ANTI: Br opposite sides: (E). One equivalent stops at dihaloalkene."}]}, // CAVEMAN
      type: 'predict',
      skill: 'alkynes',
      part: 4,
      prompt: '<b>Exam pattern: an alkyne.</b> Write the structure of the major organic product of the reaction below, and indicate stereochemistry. The substrate is <name new="hex-3-yne" old="3-hexyne"></name>; it reacts with <b>Br₂ (1 equiv.)</b>.',
      equation: {
        reactants: ['CCC#CCC'],
        products: [],
        cond: 'Br₂ (1 equiv.)'
      },
      options: [
        {
          text: '<mol smiles="CC/C(Cl)=C(\\Cl)CC"></mol>',
          why: 'This carries a different halogen. The reagent is Br₂ (1 equiv.), so Br is the atom that adds.'
        },
        {
          text: '<mol smiles="CCC(Br)(Br)C(Br)(Br)CC"></mol>',
          why: 'Four Br added: that is 2 equivalents of Br₂. With 1 equivalent only one Br₂ adds.'
        },
        {
          text: '<mol smiles="CC/C(Br)=C(/Br)CC"></mol>',
          why: 'Both Br are on the SAME side of the C=C (cis). Br₂ adds anti to an alkyne, so the two Br end up trans.'
        },
        {
          text: '<mol smiles="CC/C(Br)=C(\\Br)CC"></mol>',
          correct: true,
          why: 'Yes. Br₂ adds ANTI: the two Br atoms go on opposite sides of the new C=C, which gives the (E) isomer. One equivalent stops at the dihaloalkene.'
        }
      ],
      reveal: 'Q1: the π bond is rich, a polarised Br₂ is poor: Br and Br add, once (1 equivalent). Q2: one Br on each triple-bond carbon. Q3: the bromonium ring means anti: the two Br are on opposite sides, the <b>(E)</b> dibromoalkene. With 2 equivalents you would get the tetrabromide instead. <a href="#reactions/alkyne-x2-1">Open the card</a>.',
      chk: { card: 'alkyne-x2-1', sub: 'CCC#CCC', v: 'Br2_1' },
      id: 's64'
    }
  ]
};
