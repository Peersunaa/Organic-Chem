# Chapter 7 build plan (2026-10-26)

Companion to `../specs/2026-10-26-chapter7-design.md`. Decisions taken on 2026-10-26 before the build, and the step-level design of the pieces that follow the engine.

## Decisions
- **Scope = the book** (Peera, 2026-10-26): McMurry *Fundamentals* 7th ed 7.1–7.9. No E1cB, no Hofmann (bulky-base) products, no carbocation rearrangements (rearranging substrates are refused, as in Ch 4), Grignard = R–MgX and its protonolysis (H₂O / D₂O), Williamson ether synthesis only as problem 7.51. Final exam date unknown.
- **Scene numbers**: 20 and 21 already exist (hot KMnO₄), so the four Ch 7 scenes are **22–25**, not 20–23 as the spec draft says.
- **Hub cards**: ten, not eight (the t-BuOK card is dropped with Hofmann; a chair-rule E2 card and an alcohol → halide card are added): `sn2-cn`, `sn2-i`, `sn2-oh`, `sn2-rs`, `sn1-solvolysis`, `e2-zaitsev`, `e2-chair`, `e1-heat`, `grignard-d2o`, `halide-from-alcohol`. New hub group `halide`. `facts.space` gains `inversion`; `addsKey` gains `Nu` and `C=C`.
- **Decision table (7.9, minus E1cB)**: methyl: SN2 with a strong Nu, nothing with a weak one. 1°: SN2 with a non-basic Nu; strong base → E2 per the table (SN2 also happens: mixture, heat favours E2); weak Nu → no reaction. 2°: non-basic Nu → SN2; strong base → E2; weak Nu in a protic solvent → slow SN1 + E1. 3°: strong base → E2; weak Nu / protic solvent → SN1 + E1 together (SN1 bigger in the cold); no SN2 ever. Allylic/benzylic: SN2 fast, SN1 possible. Vinylic/aryl: no SN1/SN2.
- **Chair rule**: on a six-membered ring E2 needs the β-H anti-periplanar to X (trans-diaxial). β-CH₂ always qualifies; β-CH(R) qualifies only when R is cis to X. trans-1-bromo-2-methylcyclohexane + KOH gives only 3-methylcyclohexene (problem 7.55 pattern).
- **E2/E1 products carry no E/Z**: the book's elimination problems say "ignoring double-bond stereochemistry"; prose may say the trans alkene is the more stable one (Ch 4).

## Piece 2: Lesson 18 "Substitution and elimination" (~30 steps, act first, skeletal drawing)
Skills (new, in `engine/skills.js` from piece 1): `sn2`, `sn1`, `e2`, `e1`, `sub-vs-elim`, `grignard`, `halide-naming`. Mastery generator `halides` (tasks: `sn2`, `sn1`, `e2`, `which` (mechanism), `rate`, `leaving`, `name`, `grignard`, `prep`; skills as above). `useIt.book`: 7.25, 7.29, 7.30, 7.31, 7.32, 7.34, 7.44, 7.45, 7.51 (assigned) then 7.9, 7.14, 7.16, 7.19, 7.47, 7.55.

| step | type | idea (the learner acts first) |
|---|---|---|
| s01 | predict | 2-bromobutane drawn: which class of carbon carries the Br (1°/2°/3°/methyl)? |
| s02 | input (name) | name a branched bromoalkane (naming engine, either style accepted) |
| s03 | explain | alkyl halides: classes, the polar C–X (δ+ carbon), halide = leaving group |
| s04 | predict | CH₃Br + HO⁻: what forms? (CH₃OH + Br⁻: the nucleophile takes the place of X) |
| s05 | try mechanism-player draw | SN2 of bromomethane + HO⁻: two arrows, one step |
| s06 | predict | (R)-2-bromobutane + I⁻: the product is (S) / (R) / racemic / no reaction → inversion; "Watch the scene" 22 |
| s07 | explain | SN2: one step, back-side attack, umbrella flip, inversion; rate = k[RX][Nu] |
| s08 | input | rate arithmetic: [RX] ×2 and [Nu] ×3 → rate ×6 (7.31 shape) |
| s09 | choice | which is faster in SN2: CH₃Br, 1°, 2°, 3° (steric order) and benzyl vs bromobenzene |
| s10 | choice | leaving groups: I⁻ > Br⁻ > Cl⁻; HO⁻ and NH₂⁻ bad (7.29 shape) |
| s11 | choice | nucleophile strength and solvent (polar aprotic speeds SN2) |
| s12 | predict | (CH₃)₃CBr + H₂O: product? (tert-butyl alcohol; SN2 blocked, so a different path) |
| s13 | try mechanism-player | SN1 of 2-bromo-2-methylpropane with water, three steps; "Watch the scene" 23 |
| s14 | predict | (R)-3-bromo-3-methylhexane + H₂O → racemic alcohol (flat cation, both faces) |
| s15 | explain | SN1: carbocation, rate = k[RX], 3° > 2° (> 1° never), racemisation, protic solvent |
| s16 | input | SN1 rate: [RX] ×2, [Nu] ×½ → ×2 (7.32 shape) |
| s17 | try energy-diagram | SN1 (two steps, first TS highest) against SN2 (one step): tap TS, intermediate, rate-determining |
| s18 | predict | 2-bromo-2-methylbutane + KOH / ethanol, heat: which alkene is major (Zaitsev)? |
| s19 | try mechanism-player draw | E2 of 2-bromopropane + HO⁻: three arrows, one step; "Watch the scene" 24 |
| s20 | explain | E2: one step, strong base, anti-periplanar H and X, Zaitsev, rate = k[RX][base] |
| s21 | choice + chair-flip visual | trans-1-bromo-2-methylcyclohexane + KOH → 3-methylcyclohexene; why (only C6–H is anti to Br) |
| s22 | predict | (CH₃)₃CBr in ethanol, heat, no base → ether (SN1) + alkene (E1) together |
| s23 | explain | E1: carbocation then β-H loss, Zaitsev, rate = k[RX], travels with SN1; "Watch the scene" 25 |
| s24 | worked | decide the mechanism for three reactions (7.44 / 7.19 shape): 2° + strong base → E2; 3° benzylic + CH₃OH heat → SN1; 1° + NaCN → SN2 |
| s25 | choice | the decision-table question again on a 3° halide with NaOCH₃ (E2, not SN2) |
| s26 | predict | bromocyclohexane + Mg (ether), then D₂O → deuteriocyclohexane |
| s27 | explain | Grignard reagents: C–Mg makes the carbon nucleophilic and basic; protonolysis; an O–H or N–H in the halide kills it |
| s28 | predict | (S)-pentan-2-ol + PBr₃ → (R)-2-bromopentane: inversion (7.24 shape) |
| s29 | explain | making halides (7.2): HX on 3° alcohols, PBr₃ / SOCl₂ on 1° and 2° (inversion), alkane + X₂/hν unselective |
| s30 | input | 2-methylpentane + Cl₂/hν: how many monochloro products (5), which are chiral (7.27 shape) |

Every product, name, rate factor and count in the lesson comes from `engine/reactions-halides.js` (or the naming engine) and `tests/lesson18.mjs` recomputes each one. Caveman twins on every step (`caveman: {...}` as in Lessons 12–17). Recap card for Lesson 18 (links: Lesson 08 arrows s05, Lesson 09 carbocation stability s18, Lesson 06 axial/equatorial, Lesson 15 R/S s10). Glossary terms to add: leaving group, Zaitsev, anti-periplanar, solvolysis, protic / aprotic solvent, Grignard reagent, inversion. Hub cards get `lesson: {id:'18', step}` links in this piece.

## Piece 3: scenes 22–25 (storyboards in `docs/scenes/`, JSON in `learn/scenes/scenes/`)
- **22-sn2-backside** (card `sn2-oh`, lesson s06): (R)-2-bromobutane + HO⁻, tilted camera, the nucleophile's lone pair enters opposite the C–Br σ* (the `sigma-star` glyph), the three groups flip like an umbrella (`backside` move, `pose` wedges), Br⁻ leaves; final badge "(S)". Quiz: retention or inversion.
- **23-sn1-two-faces** (card `sn1-solvolysis`, lesson s13): (R)-3-bromo-3-methylhexane + H₂O: slow ionisation to the flat cation (`p-empty` lobe), water attacks from the top AND a ghost from the bottom (`ghosts`), proton loss, two mirror-image alcohols as `forms`-style pair; badge "racemic".
- **24-e2-anti** (card `e2-zaitsev`, lesson s19): 2-bromobutane + EtO⁻ in the anti-periplanar conformation (H up, Br down, tilt), three arrows in one beat (`ts: true`), but-2-ene forms; a second look beat shows the but-1-ene alternative as a ghost labelled minor (Zaitsev). The chair rule stays in the lesson (chair-flip widget), since scenes draw rings flat.
- **25-e1-heat** (card `e1-heat`, lesson s23): 2-bromo-2-methylpropane in ethanol, heat: ionisation, then ethanol takes a β-H (E1) with a ghost of ethanol attacking the cation (SN1) to say the two paths share the cation.
Each scene: ≤ 110-character captions, both layers, reduced motion, `tests/scenes.mjs` checks (atom and charge balance per beat, arrows reproduce bond changes, final state holds the engine product), `scene-index.js` rows with cards + lesson steps + skill.

## Piece 4: `#master` group 6 "Substitution and elimination" (`LIVE_STAGE` 5)
Types (assigned problems first in every `book` list: 7.25, 7.29, 7.30, 7.31, 7.32, 7.34, 7.44, 7.45, 7.51):
1. `predict-sn2` (stereo included): book 7.51, 7.6, 7.7, 7.9, 7.10, 7.20, 7.21, 7.23, 7.37, 7.38, 7.47, 7.54.
2. `predict-sn1-racemic`: 7.14, 7.15, 7.41, 7.43, 7.56, 7.57, 7.58.
3. `predict-e2-zaitsev` (incl. the chair cases): 7.45, 7.16, 7.17, 7.22, 7.40, 7.46, 7.55.
4. `which-mechanism` (the 7.9 table): 7.44, 7.19, 7.39, 7.41.
5. `mechanism-arrows-sub-elim`: 7.54, 7.58, 7.59, 7.62 (arrow drawing on SN2 / SN1 / E2 / E1).
6. `rate-law-and-factors` (which change speeds it up; leaving groups; SN2/SN1 reactivity order): 7.29, 7.30, 7.31, 7.32, 7.34, 7.8, 7.11, 7.12, 7.13, 7.18, 7.28, 7.33, 7.42, 7.43, 7.48.
7. `name-alkyl-halide`: 7.25, 7.1, 7.2, 7.26, 7.27, 7.48.
8. `grignard-and-prep` (Grignard + D₂O, alcohol → halide, alkane + X₂/hν): 7.3, 7.4, 7.5, 7.24, 7.35, 7.36, 7.52, 7.53, 7.61.
Sources: `predict-product` with the new cards, generator `halides` with pinned `tasks`, `naming-levels` with `classes:['halide']`. Seeds re-picked with `node learn/tools/pick_master_seeds.mjs`. Section id `B7`.

## Piece 5: mock section B7 + PDF catalogue
`data/mock-blueprint.js`: `{ id:'B7', title:'Substitution and elimination', count:4, marks:3, instruction: 'Give the major product and name the mechanism (SN1, SN2, E1 or E2). Show stereochemistry where it matters.', feeds: predict-product (new cards) w 2, halides generator (which / rate) w 2 }`; presets gain B7 (full: 4, half: 2, reactions: 4). Past-paper page: the NYU A5.2 / A5.3 items (SN2 mechanism, rate law, predict product) added to `data/pastpaper.js`. Catalogue: `python3 study-guide/build_catalogue.py` (untracked output).

## Piece 6: student test
Agent on a `git archive HEAD` snapshot, zero-background student persona, Lesson 18 → hub cards → scenes → `#master` group 6 → mock B7; review in `docs/reviews/2026-10-26-ch7-review.md`; fixes; then memory + docs + hand-over.
