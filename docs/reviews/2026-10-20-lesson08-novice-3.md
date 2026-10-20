# Lesson 08 (How mechanisms work) - novice re-test 3, 2026-10-20

Tester role: student with Lessons 1-3 only. Snapshot `snap6/learn` on :8787 (server now stopped). 400px for the whole lesson (steps 1-32), 1100x800 for layout (steps 4, 7, 13, 17, 24, 31 and scene 17), scenes `17-hcl-ethylene`, `18-arrow-grammar`, `19-carbocation` scrubbed across their full slider range with the Orbitals layer on (12, 11 and 15 frames at 400px). No course files edited. Driven with Playwright using real mouse clicks at atom/bond/badge coordinates; every step answered first try except the deliberate re-tests of the old bugs (wrong arrow then Undo/Clear in steps 8, 13 and mastery, which burned one mastery problem on purpose).

Console: zero errors/warnings on this run (the three 404s in the Playwright log belong to an older :8786 session: favicon and blank-for-storage). Horizontal scroll: none at 400 (scrollWidth 385 = clientWidth 385, lesson and all three scenes) or at 1100 (1085/1085).

Mastery: passed at "3 of 4 right first try" (HBr + propene step 1 [carbon menu], Eact step 2 [typed 10], Br- + 2-degree cation [wrong arrow on purpose, then correct], Eact [typed 40]). Back then Continue now shows a green "You have already passed this check, so Continue stays open. The problems below are extra practice."

## (a) Grade

**5 / 5** - Every blocker and nearly every irritation from the last two runs is gone (centre taps, stale feedback, the carbon menu, the covered stage, glossing, pictures on every predict); what is left is cosmetic (a + badge over a label in two scenes, chips and dense-diagram targets still under 44px).

## (b) Status of all 25 items

### The 15 old items

| # | Item | Status | Evidence this run |
|---|------|--------|-------------------|
| 1 | Bond hit-lines above atom discs, centre tap read as bond | FIXED | elementFromPoint on Cl, O, C centres returns `lb-hit-atom`; step 8 bond -> Cl centre, step 7 O centre, step 13 both arrows, step 17 lone pair -> + badge all accepted first try. |
| 2 | Step 4 item 3: C=C not tappable, silent | FIXED | A 212x44 `sp-bondhit` button covers both lines and the gap; lower line, gap and upper line all resolve to it and the tap is accepted ("Either carbon of the bond counts"). |
| 3 | Step 15 scene mismatch, no p lobes | FIXED | "Watch the scene" opens a dedicated 3-beat edge-on scene (top face / bottom face / empty p), text says the scene shows the lobes. |
| 4 | Recap card huge, pushes question below the fold | FIXED | Recaps after predict, try and explain steps (4, 5, 6, 26, 27, 29, 31) all collapse with "Show all"; step 27 question now starts at about y=640 instead of 870. |
| 5 | Stale feedback and hints after Undo/Clear | FIXED | Step 8: wrong arrow, Check, Undo gives only "Last arrow removed. Tap the electrons the next arrow starts from." and the hint was right for the slip ("Your start is right: the H-Cl line"). Same clean result in step 13 (Undo) and mastery (Clear). Not re-tested in step 17 after a wrong try. |
| 6 | First picture of arrows too hard | FIXED | Step 5 now shows NH3 + H+ before the options; step 6 pictures all three arrows inline (NH3 + H+, H-Br, but-2-ene + H+); scene 18 is three simple isolated arrows. |
| 7 | Scene labels 5-6px, pills overlapping | FIXED | At 400 the scene stage is 317x198 with readable labels in all 12/11/15 scrubbed frames of scenes 17/18/19; the one remaining overlap is the + badge (see N9). |
| 8 | Step 7: tapping O starts at the O-H bond | FIXED | O centre tap selects a lone pair: "Arrow added: the lone pair on O to H". |
| 9 | Same-atom tap cancelled silently; Check button jumps | FIXED | Re-tapping O says "An arrow starts on electrons and ends on a different atom or bond. These electrons are still selected..."; bond -> H gives the excellent "points onto H. Cl pulls harder (3.0 against 2.1)"; Check stayed at y=1210 through tap, arrow, undo and re-tap. |
| 10 | Vocabulary before definition; tap targets under 44px | PARTLY | Now glossed: sigma bond, inductive effect, alkyl, carbonyl, Lewis acid, rate-determining, electronegative, IUPAC names carry their formulas. Glossary chips are still 29px high (inline terms, 19-108px wide); Eact brackets are 44-46px, energy-diagram points 41-43px. |
| 11 | Wording: step 12, 18, 26 | FIXED | Step 12 "that H would hold four electrons, but H can hold only two"; step 18 option "only small H atoms sit on the + carbon, no carbon group at all"; step 19 "steadier cation takes less energy to make, so it forms faster"; step 26 "Acid moves the C=C one carbon along". |
| 12 | Text-only predicts; step 10 answer pattern-matches | FIXED | Steps 11, 12, 14, 16, 18, 20 all have a molecule picture above the options. Step 10 option lengths are 75/72/85/82 and 86/97/93/95 chars: the correct one is not the longest in the second question. |
| 13 | Mastery: one arrow problem, pass lost on Back | FIXED | Pool had two arrow problems (HBr + propene step 1 with carbon menu, Br- + cation) and two diagram problems in my 4; Back then Continue shows the "already passed, extra practice" banner and Continue enabled. |
| 14 | Scene layout at 1100 and 400 | FIXED | 400: stage 317x198, whole scene short. 1100x800: stage 740x463, no sticky dock any more (nothing is `position: sticky/fixed`), nothing covers the stage at scroll 0; slider/buttons sit below the stage at y=900 so you scroll about 230px to see stage and controls together. |
| 15 | Repetition (step 13) and book not named | PARTLY | Step 32 names McMurry Chapter 3 and maps problem ranges. Step 13/17 completion still says the outcome in the arrow caption, "Mechanism complete", "What happened" and the closing line (3 restatements, down from 4), but the stale "Both arrows are right. Press Next to watch them" is gone. |

### N1-N10 from the previous report

| # | Item | Status | Evidence this run |
|---|------|--------|-------------------|
| N1 | Mastery HBr + propene menu does not block taps; first try burned | FIXED | After bond -> H the diagram greys out; tapping H-Br bond/Br gives "First pick which carbon bonds to H: use the buttons under the drawing (or Cancel)"; Check says the same. No arrow is half-specified. |
| N2 | Red feedback and hints stay after Undo/Clear | FIXED | Verified in step 8 (Undo), step 13 (Undo) and mastery step 2 (Clear: "Cleared. Tap the electrons the arrow starts from."). |
| N3 | Sticky dock covers lower stage at 1100 | FIXED | At scroll 0 the whole ethylene (both carbons, both pi lobes) and HCl are visible; no sticky/fixed element exists. |
| N4 | + / - badges not tap targets; dense atoms 29-33px | PARTLY | + badge is now a real target (`ad-chg-hit`, 18-21px): lone pair -> + badge worked in step 17 and mastery, and C+ superscript in step 29 task 5 resolves to the atom. Dense-diagram atoms are still 29-36px and badges 18-21px, under 44px. |
| N5 | Step 13 stale closing text | FIXED | Closing line now reads "Step 1 drawn and watched. The next screens look at the + carbon it leaves behind." |
| N6 | Step 4 C=C bond lines/gap dead | FIXED | See old item 2. |
| N7 | Heading comma wrap; "carbonyl", "Lewis acid" unglossed | FIXED | Step 29 heading wraps cleanly at 400 (no leading comma), carbonyl is glossed in the stem ("a carbonyl group: a C=O") and has a chip; "Lewis acid" is a chip in step 4 feedback. |
| N8 | Step 15 3D model tilted, no lobes | PARTLY | Text now promises "edge-on: four carbons, one flat sheet" and the model loads much closer to edge-on (central C and three methyl C in a near-horizontal sheet), but it is still an oblique perspective view, the "C+" label is covered by an H, and there are no lobes in the model itself (the lobes are in the scene). |
| N9 | + badge over CH2 label; mid-scrub bare fragments | NOT FIXED | Scenes 17 (beats 4-8) and 19 (all three beats): the red + circle and the dashed empty-p lobe still sit on top of the C of "CH2". The scene 18 bare-fragment frames are fine now (each frame has its molecule). |
| N10 | Step 22 diagram unlabelled valley/peaks | FIXED | Step 22 picture now labels "step 1 transition state", "intermediate / the carbocation", "step 2 transition state", with the picture above the text. |

**Counts: 20 fixed, 4 partly (10, 15, N4, N8), 1 not fixed (N9). 0 new blockers.**

## (c) New findings (at most 5, none blocking)

1. **BUG (minor) - recap text refers to things not on screen.** Step 16's recap quotes "The (CH3)3C+ model below is edge-on ... Watch the scene shows the lobes" although there is no model below it; step 18's recap shows the instruction "Press Next to replay step 1 one arrow at a time; then draw step 2 yourself" as its stem. Fix: give recaps a short "what you learned" line, not the previous step's UI instruction.
2. **BUG (minor) - mastery feedback grammar.** Wrong end atom says "The electrons need to end up to C." (should be "at C"). Also the header still reads "Problem 1: 0 of 3 right first try" after a pass (the green banner explains it, but the zero looks like lost progress).
3. **UX - step 4 prompt wraps "H-" / "Br" across lines** ("Tap the electron-poor atom of H-Br" breaks at the hyphen at 400px). Fix: non-breaking hyphen.
4. **UX - step 23 diagram labels still appear only as you answer** (B/D "transition state", C "intermediate" are drawn after you tap) although step 22 now shows them; fine for a quiz, but the first tap in task 1 is still a guess between B, C and D for someone who skipped the picture.
5. **UX - scene 17 at 1100x800: controls are below the fold at scroll 0** (slider at y=900, stage 463px tall). Not covered any more, but a student has to scroll to use Play. Fix: cap the stage near 55vh.

## (d) Per-step log (400px; all answered first try unless stated)

| # | Type | Notes |
|---|------|-------|
| 1-3 | predict, predict, explain | OK; recaps collapse; pi bond, octet, + carbon glossed. |
| 4 | try x4 | O, H, C=C (any part of the bond), B: all first try; Lewis acid chip; "H-" / "Br" wrap (finding 3). |
| 5 | predict | NH3 + H+ picture before options; fishhook glossed. |
| 6 | explain | All three arrows pictured inline. |
| 7 | try | O tap = lone pair; same-atom message; After picture. |
| 8 | try | Slip bond -> H gave the right explanation and hint; Undo clean; bond -> Cl centre accepted. |
| 9 | try | C=C bond -> + badge on H+ accepted. |
| 10 | worked x3 | Correct option no longer longest. |
| 11, 12 | predict | Pictures above options; wording fixed. |
| 13 | try (2 arrows + replay) | Wrong arrow, Undo clean; two correct arrows; replay; closing text current. |
| 14 | predict | Picture added. |
| 15 | explain + 3D + scene | 3-beat scene fine; model edge-on-ish (N8). |
| 16 | predict | Picture added. |
| 17 | try (replay + draw step 2) | Lone pair -> + badge accepted first try. |
| 18-21 | predicts | Pictures on 18 and 20; IUPAC names carry formulas; sigma/inductive glossed. |
| 22 | explain + diagram | Labelled valley and peaks. |
| 23 | try x3 | 41-43px targets; tasks auto-advance after the explanation. |
| 24 | try x3 | Brackets 44-46px; no spoiler on task 3. |
| 25, 26 | explain | Recap collapsed; skeletal key; rearrangement labelled honestly. |
| 27 | worked x4 | Recap collapsed; question visible without scrolling past a tall recap. |
| 28, 29 | explain, try x5 | Heading wraps cleanly; carbonyl glossed. |
| 30 | recap | Five review links. |
| 31 | mastery | Passed 3 of 4; carbon menu now modal; Back-Continue banner. |
| 32 | use it | McMurry Chapter 3 named with problem map. |
