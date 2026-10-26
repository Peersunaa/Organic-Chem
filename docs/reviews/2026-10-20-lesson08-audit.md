# Lesson 08 audit (before the rebuild), 2026-10-20

Walked `#lesson-08` s01 to s17 in the app (served from `learn/` on port 8783) at 400 px and 1100 px, dark and light, as a weak student would, and read every step's data,
caveman twin and the widget code it mounts. Measured tap targets, overflow and layout shift in the page with a small script; played every widget step (site-picker,
arrow-draw scenes, mechanism-player draw and watch, energy-diagram tasks and catalyst).

No console errors, no horizontal scroll at 400 px or 1100 px, Auto stops at the end, Back restores the arrow count, the why line and the ghost arrow, and the travelling
electron dots are removed after each arrow (0 left in the DOM). Everything else is below.

Severity: **High** = a weak student gets lost or cannot do the step; **Med** = slows or misleads; **Low** = polish.

## Teaching order and wording

| # | step | sev | finding | fix (in the rebuild) |
|---|---|---|---|---|
| T1 | s01–s02 | High | The lesson opens with four reaction-type names (addition, elimination, substitution, rearrangement) before the one idea every mechanism uses. A learner who is lost here never meets "rich gives a pair to poor" as the spine. | Open with electron-rich gives a pair to electron-poor (two everyday predicts, then the explain). Reaction types move to one screen near the end. |
| T2 | s03 | Med | Five new words in one reveal (homolytic, heterolytic, radical, polar, fishhook); none is used again in the lesson. | Keep only the arrow legend (full head = a pair, fishhook = one electron, radical reactions are not in this course) in the grammar step's aside. |
| T3 | s05–s06 | High | "Nucleophilic" / "electrophilic" are asked for before they are defined (s07 comes after both tap rounds): the explanation comes after the need. | Teach rich / poor first; name them nucleophile / electrophile last, as labels for what the learner already uses. |
| T4 | s07 | Med | Dense explain (definitions + Lewis acid/base + "water is both") after the taps. | Split: the rich/poor explain early, the naming explain late. |
| T5 | s08 | Med | The arrow rules are taught only as "three students broke a rule". The grammar (where an arrow may start and end, and what the picture looks like after each arrow) is never stated, and the learner has not drawn a single arrow of each kind. | A grammar explain, then one draw step per arrow kind (lone pair → atom, bond → atom, bond → new bond), easiest first, each showing the after picture; the broken-rule worked example comes after. |
| T6 | s09 → s10 | Med | The second arrow (H–Cl breaks because H holds only two electrons) appears only in the s09 reveal; the novice review needed hint 1 in s10. | A predict of its own for the second arrow before the draw step. |
| T7 | s10 | High | The carbocation is called an "intermediate" in the confirm before that word is defined, and Lesson 8 never shows it as a real species (flat, six electrons, empty p orbital). Lesson 9 leans on exactly that. | A count-the-electrons predict and an explain with the solid 3D tert-butyl cation and the new scene 17 (orbitals layer: the empty p orbital). |
| T8 | s11–s12 | High | Transition state, intermediate, Eact, ΔH and rate-determining step are all defined inside two long prompts, before the learner has looked at the picture. | Predict (how many hills for two steps), then axes / hills / valleys / higher hill = slower, then the tap tasks; the words exothermic / endothermic / rate-determining only after the picture. |
| T9 | s14 | Med | "Catalyst" first defined in the reveal; the long correct option was the giveaway in review 1. | One sentence in the closing energy explain (lower hills, same ends). |
| T10 | s16 | Med | The HBr worked example repeats s10 almost move for move, while "why that carbon" (cation stability 3° > 2° > 1°) is never taught although Lesson 9 starts from it. | Replace with cation stability (inductive idea) and one propene + HCl predict (Markovnikov without the name). |
| T11 | s17 | Med | The last mechanism is watch-only, and its what-if chips jump to Br₂ (bromonium, anti) and hydration (oxonium): Lesson 10 jargon at Lesson 8. | The player takes `whatIf: false`; the full HCl mechanism is watched for step 1 and drawn for step 2. |
| T12 | end | Low | Nothing says what to carry into Lesson 9. | A "last step" card with the five ideas and a link to each step. |

## Widgets

| # | where | sev | finding | fix |
|---|---|---|---|---|
| W1 | site-picker (s05, s06) | Med | A wrong tap prints its diagnosis twice: the widget's own message and the step's feedback box under it. | The widget shows only its right-answer reason; the step's feedback box carries the diagnosis. |
| W2 | site-picker | Med | After a wrong tap and then a right one, the old red feedback stays under the widget (the widget never calls `onProgress`). | Call `ctx.onProgress()` on every right tap. |
| W3 | site-picker | Low | The tappable atoms have no visible ring until tapped, so a learner does not know the letters are buttons. | A faint dashed ring on every tappable atom (focus and hover: solid). |
| W4 | arrow-draw (s08, s10) | High | At 400 px the lone-pair targets are 22 px and the H atoms 35 px (bonds about 25 px): under the 44 px minimum. | Hit areas are sized in screen pixels after layout (44 px where the geometry allows, never covering a neighbour); the molecule fills more of the stage (less dead margin). |
| W5 | arrow-draw | Low | The arrow from the π bond to H bows up over the CH₂ hydrogens; the H–Cl → Cl arrow is a 20 px hook. | A minimum bulge for short arrows. |
| W6 | arrow-draw / player (s10, s17) | Med | A charge badge can sit on top of a lone pair (Cl⁻ has four pairs, so there is no gap) or on a bond that is not its own (mid-step, the long new C–H bond runs under the + of the other carbon). | The badge is placed where it clears every lone-pair dot and every bond line, pushed outward until it does. |
| W7 | mechanism-player (s10) | High | Mid-step, the new C–H bond is a solid line across the stage (the H keeps its place until the step ends), and it reads as a real long bond. | A bond the arrow has just made but whose atoms are still far apart is drawn dashed ("forming"); the step's end picture is the relaid-out species as before. |
| W8 | mechanism-player | Med | Layout shift: the prompt goes from three lines to two when drawing turns into playback, and the why line grows from one to three lines at 400 px (min-height 3.5 rem), so the buttons jump. | Reserved heights for the prompt and the why line (three lines at phone width, two at desktop). |
| W9 | mechanism-player (draw) | Med | At the end of a drawn step the row's Next is disabled and a second "Next step" button appears lower down: two different "next" controls. | The row's Next becomes "Next step" in draw steps too; the extra button is gone. |
| W10 | mechanism-player | Low | The what-if row is offered on every HX mechanism, including Lesson 8's first one. | `config.whatIf === false` hides it. |
| W11 | energy-diagram (s12) | High | Bracket targets are 30 px wide and bracket 3 only 17 px tall; level letters and kind labels render at about 9 px on a phone; bracket number tags sit on the curve. | Bracket hit areas at least 44 × 44 px, larger text, tags moved off the curve. |
| W12 | energy-diagram (s11, s12) | Med | A wrong tap prints its diagnosis twice (widget + step feedback); the widget calls `ctx.progress`, which no step provides, so a stale red message stays after the right answer. | Diagnosis shown once (step feedback); `ctx.onProgress()` on every right answer. Message area height reserved. |
| W13 | energy-diagram catalyst (s15) | Med | The instructions are printed twice (step prompt and widget bar); the two drag handles are 28 px; "without catalyst" overlaps the handle; the products handle has no label. | (Catalyst drag is no longer in Lesson 8.) Handles 44 px, the ghost label moved, a "products" tag, and `ask: ''` hides the bar. |
| W14 | arrow-draw preset scenes (s08) | Low | The + badge of H⁺ sits on the arrow's tail; every preset scene keeps a 78 px empty band under the molecule. | Tail starts beside the badge; margins follow the arrows actually drawn. |
| W15 | whole app | Low | Deep-linking shows an empty card for 1–3 s while RDKit loads (app.js, outside Lesson 8's files). | Not changed here; noted for the app shell. |
| W16 | s01 equation row | Low | H–Cl is drawn as a long diagonal bond in the equation row (RDKit depiction of HCl with its H). | Not changed in steps.js; the rebuilt lesson shows HCl in widget scenes instead. |

## Checked and fine

- Reduced motion: the player swaps the state at once; arrow-draw `play()` resolves at once; the energy diagram's 650 ms advance drops to 0.
- Auto stops at the last arrow of the last step (button disabled, prompt "That is the whole mechanism").
- Back undoes one arrow, restoring the arrow counter, the why line and the faint ghost of the arrow that made the picture.
- No electron dots left behind after travel (counted in the DOM after each arrow).
- No console errors on any step; no horizontal scroll at 400 px or 1100 px, dark or light.

Counts: 7 High, 14 Med, 7 Low (28 findings). Fixed in this wave: all of them except W15 and W16 (outside Lesson 8's files; W16 avoided by the rebuild).

## After the rebuild (same day)

Lesson 08 now has 30 steps (about 35 minutes) on one spine: rich gives a pair to poor (s01-s04), arrow grammar with one draw per legal arrow and its after picture (s05-s10), HCl + ethylene in two steps with the carbocation as a real species (s11-s17), 3° > 2° > 1° (s18-s20), the energy diagram picture first and words after (s21-s25), the four reaction types on one screen (s26-s27), nucleophile / electrophile named last (s28-s29), and the five things to carry into Lesson 09 (s30). Every predict says what makes it answerable (`answerable`, checked by tests/lesson08.mjs). New primer scenes 17 (HCl + ethylene) and 18 (arrow grammar).

Re-walked every step at 400 px and 1100 px, dark and light: no horizontal scroll, no control under 44 px outside the drawings, no console errors; inside the drawings atoms, lone pairs and bond bands measure 44 px at 400 px, energy-diagram brackets 46 px. Screenshots: `l08-after-grammar-400-dark.png`, `l08-after-player-1100-light.png`, `l08-after-energy-400-light.png`.

Left as noted: W15 (blank card while RDKit loads, app.js) and W16 (HCl drawn diagonally by the equation row, steps.js). The scene legend ("What am I looking at?") and the Nu / E halo tags of the scene engine use the words nucleophile / electrophile, which the lesson itself only introduces at s28 (each is glossed on tap).
