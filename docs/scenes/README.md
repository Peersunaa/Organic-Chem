# Mechanism scenes

Storyboards for 19 animated, scrubbable mechanism scenes (16 reagent scenes plus three Lesson 08 primers) in Orgo Learn (McMurry Fundamentals Ch 1–6, plus the extra midterm reactions on the hub). Each scene shows how a reagent acts on a reactant: which electrons move and why, where the new bond forms, and why the regiochemistry and stereochemistry come out as they do. There are two toggleable layers: ARROWS (curved arrows, electron pairs travelling) and ORBITALS (π clouds, empty p, σ*, bromonium, metal surface, faces).

- **[SCENE-SCHEMA.md](SCENE-SCHEMA.md)** is the contract: data model, atom identity, coordinates and camera, timing, colour, reduced motion, accessibility, a JSON Schema, and the tests to port.
- **`NN-id.md`** holds one scene each: intent, stage, beats table, chemistry checks, stereo callout, what-if links, end quiz, notes, and the full scene object as JSON (the source of truth).

Every scene was generated from data and machine-checked with Python RDKit. The checks: atoms and charge are conserved beat by beat; the arrows reproduce each bond change and each formal-charge change; resonance forms share a σ skeleton; the final state contains the products; the stereo claims hold (cis/trans by 3D embedding, meso/racemate by the mirror test, E/Z by CIP). Every caption is at most 110 characters. Every JSON object validates against the schema, and every hub card, lesson step and stereo moment it names exists in `learn/`.

## The scenes (in order of exam weight)

| # | scene | hub card | example | beats | s |
|---|---|---|---|---|---|
| 01 | [alkene-hx](01-alkene-hx.md) | `alkene-hx` | 2-methylpropene + HBr → 2-bromo-2-methylpropane | 8 | 34 |
| 02 | [alkene-hydration](02-alkene-hydration.md) | `alkene-hydration` | 1-methylcyclohexene + H₃O⁺ → 1-methylcyclohexan-1-ol | 7 | 31 |
| 03 | [alkene-x2](03-alkene-x2.md) | `alkene-x2` | cyclohexene + Br₂ → trans-1,2-dibromide (racemate) | 7 | 31 |
| 04 | [alkene-h2-pd](04-alkene-h2-pd.md) | `alkene-h2-pd` | 1,2-dimethylcyclohexene + H₂/Pd → cis (meso) | 7 | 31 |
| 05 | [alkene-epoxide](05-alkene-epoxide.md) | `alkene-epoxide` | (E)-but-2-ene + RCO₃H → trans epoxide (racemate) | 6 | 25 |
| 06 | [alkene-kmno4-cold](06-alkene-kmno4-cold.md) | `alkene-kmno4-base` | cyclohexene + cold KMnO₄/OH⁻ → cis diol (meso) | 7 | 30 |
| 07 | [alkene-hydroboration](07-alkene-hydroboration.md) | `alkene-hydroboration` | 1-methylcyclohexene → trans-2-methylcyclohexanol (racemate) | 9 | 39 |
| 08 | [alkyne-hx](08-alkyne-hx.md) | `alkyne-hx-1`, `alkyne-hx-2` | hex-1-yne + HBr → 2-bromohex-1-ene → 2,2-dibromohexane | 9 | 39 |
| 09 | [alkyne-hydration](09-alkyne-hydration.md) | `alkyne-hydration` | hex-1-yne + H₂O/Hg²⁺ → enol → hexan-2-one | 9 | 42 |
| 10 | [alkyne-lindlar](10-alkyne-lindlar.md) | `alkyne-lindlar` | but-2-yne + H₂/Lindlar → (Z)-but-2-ene | 7 | 31 |
| 11 | [alkyne-acetylide](11-alkyne-acetylide.md) | `alkyne-acetylide` | propyne + NaNH₂, then CH₃Br → but-2-yne | 8 | 35 |
| 12 | [eas-bromination](12-eas-bromination.md) | `eas-bromination` | benzene + Br₂/FeBr₃ → bromobenzene | 9 | 39 |
| 13 | [eas-nitration](13-eas-nitration.md) | `eas-nitration` | benzene + HNO₃/H₂SO₄ → nitrobenzene | 8 | 35 |
| 14 | [fc-acylation](14-fc-acylation.md) | `fc-acylation` | benzene + CH₃COCl/AlCl₃ → acetophenone | 7 | 32 |
| 15 | [directors](15-directors.md) | `director-activating`, `director-meta` | anisole o/p against nitrobenzene meta | 11 | 49 |
| 16 | [diels-alder](16-diels-alder.md) | `diels-alder` | penta-1,3-diene + acrolein → 2-methylcyclohex-3-ene-1-carbaldehyde | 8 | 36 |
| 17 | [hcl-ethylene](17-hcl-ethylene.md) | primer (Lesson 08 s13, s17) | ethylene + HCl → chloroethane, the model polar reaction | 8 | 33 |
| 18 | [arrow-grammar](18-arrow-grammar.md) | primer (Lesson 08 s06) | one arrow per taught case: H–Cl → H⁺ + Cl⁻ (bond → atom), HO⁻ + H⁺ → H₂O (lone pair → atom), ethylene + H⁺ → CH₃CH₂⁺ (bond → new bond) | 7 | 30 |
| 19 | [carbocation](19-carbocation.md) | primer (Lesson 08 s15) | the flat ethyl cation, its empty p orbital, Cl⁻ bonding into it (a short primer) | 3 | 14 |

## Build order

Build the engine against scene 01, then add scenes so that each one brings at most one or two new engine features, keeping close to exam weight:

1. **01 alkene-hx** (pilot): stage loader, projection and tilt, timeline and scrubber, arrows with travelling dots, bond fades, charges, δ labels, badges, π and empty-p lobes, faces, atom ghosts, relayout, both layers, reduced motion, the `tests/scenes.mjs` port.
2. **02 alkene-hydration**: `adds`/`drops`, lone-pair lobes.
3. **03 alkene-x2**: bromonium and σ* glyphs, `backside` and `orient` moves, `pose` wedges, mirror ghost.
4. **12 eas-bromination**: Kekulé rings, the `aromatic` glyph, `resonance` beats, the forms row, metals without lone pairs.
5. **13 eas-nitration**, then **14 fc-acylation**: nothing new (14 adds forms of a single fragment).
6. **15 directors**: `reset` beats.
7. **08 alkyne-hx**: in-plane (`plane: "y"`) lobes and linear layout. **11 alkyne-acetylide**: SMILES ghosts, the SN2 umbrella flip.
8. **05 alkene-epoxide**: `pairs` docking, the `ring` glyph, `ts` dashed bonds. **06 kmno4-cold** and **07 hydroboration**: `summary` beats.
9. **04 alkene-h2-pd**, then **10 alkyne-lindlar**: surfaces (`plane` z, then y), arrow-free beats, motion trails.
10. **09 alkyne-hydration** (longest, nothing new), then **16 diels-alder**: the `rotate` move.

## House style

1. Calm, eased motion only (`cubic-bezier(.4,0,.2,1)`): no bounce, overshoot, spring or shake.
2. Electrons travel along the arrow as amber dots. They never jump or teleport.
3. Nothing moves without a caption, and every beat has one (≤ 110 characters, short beginner sentences, chemistry exact).
4. One idea per beat. Each beat ends on a clear, still state, and nothing moves during the hold.
5. A new bond fades in with a brief amber glow. A breaking bond fades out as its electrons leave.
6. Colour has one meaning each: amber = electrons, teal = nucleophile and electron-rich, coral = electrophile, electron-poor and empty orbitals.
7. Colour is never the only cue: + and − glyphs, δ labels, Nu/E tags, and the words "top face" and "bottom face" carry it too.
8. Use existing tokens and fonts only. 640 × 400 viewBox, 16 px text, legible at 400 px width, light and dark themes from the tokens.
9. Reduced motion swaps every tween for still frames (start + arrows, then end state) and keeps every caption and `why` line.
10. Stay at the course's level: inductive effect and resonance, not hyperconjugation or frontier orbitals. Anything one step deeper is marked in the scene's notes.

## Where a storyboard differs from its hub card

- **01**: the card's example is 1-methylcyclohexene; the scene uses 2-methylpropene, as the brief and Lesson 09 s08 do. The ring case is in scene 02.
- **06**: the brief calls it `alkene-kmno4-cold`; the hub id is `alkene-kmno4-base`.
- **08**: one scene covers two cards, `alkyne-hx-1` and `alkyne-hx-2`.
- **11**: the card's example alkylates with CH₃CH₂Br (→ pent-2-yne); the scene uses CH₃Br as the brief says (→ but-2-yne, which then feeds scene 10).
- **15**: the brief uses anisole; the card `director-activating` uses toluene (an alkyl activator with no lone pair). The nitrobenzene half matches `director-meta`.
- **Deeper than the card, and marked as such in the notes:** the Hg²⁺ steps and acid-catalysed tautomerism (09), the HOO⁻ boron-to-oxygen shift (07), the NO₂⁺ formation arrows (13), and the Br lone pair stabilising the second cation (08).
