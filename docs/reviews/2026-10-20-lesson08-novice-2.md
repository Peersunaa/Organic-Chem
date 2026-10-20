# Lesson 08 (How mechanisms work) - novice re-test, 2026-10-20

Tester role: student with Lessons 1-3 only. Snapshot `snap5/learn` on :8785 (server now stopped). 400px for the whole lesson (all 32 steps: 1-30 teach, 31 mastery, 32 "Use it"), 1100px for layout, plus scenes `17-hcl-ethylene`, `18-arrow-grammar`, `19-carbocation` scrubbed with the Orbitals layer on. No course files edited. Driven with Playwright (real mouse clicks, elementFromPoint checks on every atom centre) because the Browser pane was hidden and dropped clicks.

Console: zero errors/warnings across lesson and all three scenes. Horizontal scroll: none at 400 (scrollWidth equals clientWidth, 385 with the scrollbar) or 1100 (1085/1085), and no element outside the viewport at 1100.

All 30 teaching steps answered honestly first try; the one exception was the mastery arrow problem (finding N1). Mastery passed at "3 of 4 right first try" (4 problems: HBr + propene step 1 [arrows], exothermic/endothermic [diagram], Br- + 2-degree cation [arrows], count intermediates [diagram]).

## (a) Grade

**4 / 5** - The blocking bug from last time (tapping an atom centre read as a bond) is gone and the tap-to-draw steps are now smooth and well explained; what is left is stale feedback after Undo/Clear, a few silent non-targets, and the sticky scene controls covering the stage at 1100px.

## (b) The 15 previous findings

| # | Previous finding | Status | Evidence this run |
|---|---|---|---|
| 1 | Bond hit-lines sit above atom discs; centre taps read as the bond | **FIXED** | elementFromPoint at every atom disc centre in steps 8, 13, 17 and mastery returns the atom hit circle (44px, 36-38px in dense diagrams). Step 8 bond -> Cl centre, step 13 (both arrows), step 17 (+ carbon) all accepted first try. |
| 2 | Step 4 item 3: C=C not tappable, silent, carbons unlabelled | **PARTLY** | Carbons now say "C", a pi marker was added and the prompt says "(or the C=C bond, marked pi)". But tapping the double lines or the gap still does nothing and says nothing; only the small pi circle works. |
| 3 | Step 15 mismatch: scene was the 8-beat full reaction, 3D model showed no p lobes | **FIXED** | "Watch the scene" now opens a dedicated 3-beat edge-on CH3CH2+ scene (top face / bottom face / empty p, red dashed lobes) and the text says the scene shows the lobes. (3D ball-and-stick still has no lobes, see N8.) |
| 4 | Recap card huge / layout collapse on steps 26-27, pushes question below fold | **PARTLY** | Collapsed with "Show all" on predict recaps; row-overlap glitch gone. After an explain step the recap still opens in full (step 27: ~540px, question starts y~870 at 400px). |
| 5 | Stale feedback and hints (step 24 spoiler, steps 4/8/17 red box) | **PARTLY** | Step 24 task 3 spoiler is gone, step 4 shows no leftover hint. But in step 8, after a wrong arrow then Undo, the red "points onto H" message and Hint 1 stay on screen with "Last arrow removed." Same in mastery after Clear (N2). |
| 6 | First picture of arrows too hard (text-only step, allyl chloride scene) | **PARTLY** | Step 6 now has an inline picture (NH3 + H+, arrow 1) and scene 18 is rebuilt as three isolated simple arrows (HCl, HO- + H+, ethylene + H+). Still only one of the three arrows is pictured inline and the picture sits after the text; step 5 (the question about where arrows start) is still text-only. |
| 7 | Scene labels 5-6px, pills overlapping | **FIXED** | Scenes 17/18/19 at 400: stage 317x198, element labels about 14px, subscripts 11.5px, orbital annotations 12px, charges 8.3px. No overlaps found at stable beats; only a tiny + badge overlapping the "CH2" label (N9). |
| 8 | Step 7: tapping O starts at the O-H bond; misleading check text | **FIXED** | Tapping the O centre now reads "Arrow added: the lone pair on O to H"; check says "Nothing breaks" in scene text. |
| 9 | Same-atom tap cancelled silently; Check button jumps | **PARTLY** | Step 8 bond -> H (the natural slip) is now accepted as an arrow and the check says "points onto H. Cl pulls harder... (3.0 against 2.1)", which is excellent. The status line still changes between 1 and 2 lines and shifts Check by about 20px (seen in step 7/8). Did not re-trigger the lone-pair-to-same-atom cancel. |
| 10 | Vocabulary before definition; tap targets under 44px | **PARTLY** | pi bond, octet, positive carbon (step 3), fishhook (step 5), sp2/empty p (step 15), alkyl (step 19), skeletal key (step 26) are now glossed inline. Still bare: "sigma bond", "inductive effect" (19), IUPAC names propan-2-ol / 3-methylbut-1-ene / 2-chloropropane (20, 27), "carbonyl" in step 29 feedback (twice), "Lewis acid" in step 4. Glossary chips are still 23-29px high; Eact bracket hit rects are now 46px (fixed). |
| 11 | Wording: step 12 five bonds, step 18 option, step 26 rearrangement | **FIXED** | Step 12 now says "the carbon that just took the H already has four bonds"; step 18 option reads "only small H atoms sit on the + carbon, no carbon group at all"; step 19 adds "a steadier cation takes less energy to make, so it forms faster"; step 26 rearrangement is labelled honestly ("Acid moves the C=C one carbon along"). |
| 12 | Text-only predicts at the heart of the mechanism; step 10 answer pattern-matches | **PARTLY** | Steps 11 and 16 now show the molecules (HCl + ethylene with delta labels; ethyl cation + Cl-). Steps 12, 14, 18, 20 are still text-only. Step 10 worked-example correct option is still the one that spells out the whole explanation (it is always the longest). |
| 13 | Mastery: only 1 arrow problem, no HBr/propene, pass state lost on Back | **PARTLY** | Pool now includes HBr + propene (carbon-choice menu) and step 2 of HBr; 2 of my 4 problems were arrows. On Back then Continue it reopens at "Problem 1: 0 of 3" but Continue is enabled (pass kept). The drill UI does not say it is already passed. |
| 14 | Scene layout at 1100 (stage 486px, controls far below); 923px panel at 400 | **PARTLY** | 400px: stage is now 317x198 and the whole scene is short (fixed). 1100x800: stage is 740x463 and the controls are a sticky dock, which at scroll 0 sits on top of the lower ~40% of the stage and hides the ethylene carbons on beat 1 until you scroll about 230px (N3). |
| 15 | Repetition (step 13 four times) and book not named | **PARTLY** | Step 32 now names "McMurry, Fundamentals of Organic Chemistry, Chapter 3" and maps problem ranges (fixed). Step 13/17 still state the outcome in "What happened", "The pi bond attacks...", "Result: a carbocation", "Mechanism complete" and a stale "Both arrows are right. Press Next to watch them" (N5). |

**Counts: 5 fixed, 10 partly, 0 not fixed.**

## (c) New findings (prioritised, at most 10)

1. **N1 - BUG/UX - mastery step 31, problem 1 (HBr + propene).** After "bond -> H" a "Which carbon of the double bond bonds to H?" menu appears below the diagram, but it does not block taps. If you carry on tapping (as I did, going straight on to the H-Br arrow) the arrow ends up half-specified, Check says "H went to the wrong carbon: that gives the less stable carbocation" although I never chose a carbon, and the first try is burned ("Not first try, so this one does not count"). Why it matters: a pass depends on first tries and this penalises a UI flow, not a misconception. Fix: make the menu modal (disable the diagram until answered) or make Check say "Pick which carbon first".
2. **N2 - BUG - steps 8, 13, 17 and mastery arrow problems.** After a wrong Check the red feedback and "Hint 1" stay after Undo or Clear (step 8: "points onto H... Hint 1 start on the line between H and Cl" under "Last arrow removed."). The hint is also wrong for that slip (the start was correct). In mastery the old "H went to the wrong carbon" block stays while you draw the next attempt. Why: a student re-drawing sees the old verdict as the current one. Fix: clear feedback and hints on Undo/Clear/new tap; key the hint to the actual error.
3. **N3 - BUG - scenes 17/18/19 at 1100x800, first view.** The sticky controls dock covers the lower part of the stage at scroll 0 (stage 425-888px, dock at 696px), so beat 1 of scene 17 shows only the pi lobes and HCl; the carbons of ethylene are hidden under the slider. Why: the first picture of the model polar reaction is incomplete. Fix: only make the dock sticky after the stage has scrolled into view, or cap the stage at about 55vh so stage plus dock fit one screen.
4. **N4 - BUG - mastery problem 3 and step 17 step-2 drawing.** The "+" and "-" badges are not tap targets: tapping the + beside the cation carbon (the obvious tap for "tap the positive carbon") hits the SVG background and does nothing, with no message. Dense diagrams also have 29-33px atom targets (H atoms in the 11-atom propene cation). Why: silent no-ops read as a broken app. Fix: include the charge badge in the atom's hit circle; keep 44px minimum.
5. **N5 - BUG (stale text) - step 13 after replay.** The panel reads "Mechanism complete." and, below, "Both arrows are right. Press Next to watch them; the next screens look at the + carbon" - the instruction is out of date and the outcome is also restated three more times. Fix: swap the closing text on completion and drop one of the three restatements.
6. **N6 - UX/CHEMISTRY - step 4 item 3.** The double lines and the gap of C=C are still dead; only the labelled pi circle responds, but the prompt says "tap the C=C bond". Fix: accept the whole bond (lines and gap) as the target. (Carried from previous #2, now with the exact remaining gap.)
7. **N7 - UX - step 29 and step 4.** Heading wraps leaving a stray comma at the start of a line (", electrophilic means"); feedback uses "carbonyl" twice with no gloss; "Lewis acid" in step 4 feedback is not glossed. Fix: add "carbonyl (C=O)" once in the step 29 stem and prevent the comma from wrapping.
8. **N8 - CHEMISTRY/UX - step 15 3D model.** The (CH3)3C+ ball-and-stick is shown tilted, not edge-on, with no orbital lobes, while the text says "Turn it edge-on to see it is flat". A novice cannot tell flatness from a tilted tetrahedral-looking cluster. Fix: load the model edge-on (plane horizontal) or add a translucent plane/lobes overlay.
9. **N9 - BUG (minor) - scenes 17/19 orbitals layer.** The red "+" circle at the carbocation sits on top of the "CH2" label (hiding part of the C) at beats 4-6, and mid-scrub frames of scene 18 (e.g. slider 18) show a bare, tilted H-O-H fragment and no ethylene. Fix: offset the + badge from the label; hold the previous beat's fade-out until the next is drawn.
10. **N10 - CHEMISTRY/pedagogy - steps 22-23.** The caption only defines A and E; B, C, D are named only after you tap them, and the text says the valley is "the carbocation" without marking it on the diagram. Fix: label the valley "carbocation (intermediate)" and the two peaks "step 1 / step 2" in step 22's picture.

(Notes: step 5 and steps 12/14/18/20 remain text-only predicts; step 10's correct option is the longest and fully explained - both carried from earlier findings and counted under #6/#12 above, not repeated here.)

## (d) The three steps that taught the most

1. **Step 7 (lone pair -> atom, HO- + H+).** Draw it yourself, tap the O and it correctly picks the lone pair, then an animated "After" picture and "Show before" make "pair becomes the new bond, - and + cancel" concrete.
2. **Step 13 (draw both arrows of HCl + ethylene, then replay one arrow at a time, with step 17's second arrow).** The only step where you build the whole first half of the mechanism and watch a carbocation and Cl- appear; the delta labels in step 11's new picture set it up well.
3. **Step 24 (numbered Eact/DH brackets on a real diagram).** 46px targets, a task order that builds from "climb = Eact" to "DH is final minus initial", and feedback that names the slip; the old spoiler is gone.

## Per-step log (400px; Y = ok, notes where not)

| # | Type | Answerable from earlier | Picture before text | Wrong-answer feedback names the misconception | Layout / bug |
|---|------|------|------|------|------|
| 1 | predict | Y | N (text) | Y | ok |
| 2 | predict | Y (L2) | N | Y | ok; recap collapsed |
| 3 | explain | n/a | N | n/a | pi/octet/+ carbon now glossed inline |
| 4 | try x4 | Y | Y | Y (BF3, H2O, HBr); silent on C=C bond (N6) | Next button moves ~50px as feedback appears |
| 5 | predict | Y (guessable) | N | Y | fishhook glossed |
| 6 | explain | n/a | Y (arrow 1 inline) | n/a | scene button opens simplified 7-beat scene |
| 7 | try | Y | task then picture | Y | O-tap fixed |
| 8 | try | Y | Y | Y ("points onto H...3.0 vs 2.1") | stale feedback after Undo (N2) |
| 9 | try | Y | Y | Y | ok |
| 10 | worked x3 | Y | Y | Y | correct option longest |
| 11 | predict | Y | Y (new picture) | Y | ok |
| 12 | predict | Y | N | Y | wording fixed |
| 13 | try (2 arrows + replay) | Y | Y | Y | stale closing text (N5) |
| 14 | predict | Y | N | Y | ok |
| 15 | explain + 3D + scene | partial | model + scene | n/a | N8 |
| 16 | predict | Y | Y (new picture) | Y | ok |
| 17 | try (replay + draw step 2) | Y | Y | Y | centre taps ok; N5-style repetition |
| 18 | predict | Y | N | Y | wording fixed |
| 19 | explain | n/a | N | n/a | alkyl glossed; sigma/inductive not |
| 20 | predict | Y | N | Y | IUPAC names in options |
| 21 | predict | Y | N | Y | ok |
| 22 | explain + diagram | n/a | diagram after text | n/a | N10 |
| 23 | try x3 diagram | Y | Y | Y | labels appear as you answer; 43px targets |
| 24 | try x3 numbers | Y | Y | Y | spoiler fixed; 46px brackets |
| 25 | explain | n/a | after picture | n/a | ok |
| 26 | explain | n/a | Y | n/a | skeletal key added |
| 27 | worked x4 | Y | Y | Y | recap tall |
| 28 | explain | n/a | N | n/a | ok |
| 29 | try x5 | Y | Y | Y | N7 |
| 30 | recap | n/a | N | n/a | "tap one to review" links work |
| 31 | mastery | - | - | Y | N1, N2, N4; passed 3 of 4 |
| 32 | use it | - | - | - | McMurry named |
