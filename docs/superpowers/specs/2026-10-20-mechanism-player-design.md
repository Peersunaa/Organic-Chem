# Orgo Learn: mechanism step player, what-if branching, caveman mode, 3D stereo toggle

Date: 2026-10-20 (night before Tue; midterm Thu 2026-10-22). Approved scope: all four pieces tonight, in this order of shipping: player, branching, caveman, 3D.

## Why

Peera gets lost at mechanisms (Lesson 8) and the later reaction lessons lean on them. Today's `mechanism-player` widget has a "draw" mode (learner draws arrows) and a "watch" mode where pressing Play animates ALL arrows of a step at once and the lesson moves on. Peera wants to hold a frame: see one arrow at a time, read why that pair moved, go back, and only then continue. Then: see what a different reagent would have done from the same intermediate; a terse "caveman" explanation mode; and 3D only at the moments where shape decides the answer.

## Pieces

1. **Step player** (in `engine/widgets/mechanism-player.js` + `mechanism-core.js`; data in `engine/mechanisms.js` and the EAS/alkyne/diene mechanism data wherever it lives). Watch mode becomes press-to-advance: each press animates ONE arrow (electron dots travel, the bond or lone pair it creates fades in, the one it breaks fades out), then holds. Under the scene, a one-line **why** for that arrow (new data field `why` per arrow; fall back to the step's existing label when missing). Controls: Back (undo one arrow, instantly), Next, and an optional Auto toggle with slow/normal speed that plays arrow by arrow with the same holds. The final state holds until the learner presses the lesson's own Continue. Draw mode is unchanged, but after a correct draw the reveal uses the same one-arrow-at-a-time playback. Reduced motion: no travel animation, states swap instantly, why lines still show.
2. **What-if branching** (player + hub data). On the last state of a mechanism that has an alternative reagent in the hub (HBr → Br2, H2O/H+, H2/Pd; HBr on alkyne → H2O/Hg2+; EAS: swap electrophile), a "What if it were X?" chip replays from the shared intermediate (or from the start when nothing is shared) with the alternative's arrows, and ends with both products side by side and the hub's three facts for each. Only for reagents whose mechanism data exists; others show "no mechanism in the course yet" and link the hub card.
3. **Caveman mode**: header toggle next to "New IUPAC", stored like the IUPAC preference. When on, every text that has a `caveman` variant shows it: hub cards (what, three facts, steps), player why lines, drill `why` feedback. Lessons fall back to normal text (post-midterm). Voice: short declaratives, no articles, chemistry exact, one idea per sentence, e.g. "HBr. H go to carbon with more H. Br go other carbon. Cation flat, Br hit either face."
4. **3D stereo toggle**: on steps where geometry decides the answer, a "See it in 3D" button under the player opens the existing `model3d` viewer with an intermediate or product model: planar carbocation from 1-methylcyclohexene (attack from both faces), bromonium ion from cyclohexene (backside, anti), cis epoxide from cis-but-2-ene, syn-diol product, cis product of H2/Pd on 1,2-dimethylcyclohexene vs the trans isomer for contrast. Models made by `tools/gen3d.py`, listed in `data/3d/models.js`, mapped to lesson steps in a new `engine/stereo-moments.js`.

## Constraints

Same as the hub design: LEARN-SPEC page contract, tokens only, 400px wide, no new fonts, tests must end 0 failed before publish, beginner voice, no lesson content changes except adding `why` and `caveman` data fields and the 3D mapping. Builders never commit or publish.

## Parallel build plan

Three agents at once, disjoint files: (A) player: widgets + mechanism data + CSS; (B) caveman variants: `engine/reaction-hub.js` data + `tests/hub.mjs` only; (C) 3D models + `stereo-moments.js` + its test. Neither B nor C touches `index.html` or `tests/run.mjs`; the orchestrator wires new test files into run.mjs. Then one agent (D): branching + caveman toggle UI + 3D button, on top of A/B/C.
