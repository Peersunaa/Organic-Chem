# Lesson 08 (How mechanisms work) - novice walkthrough, 2026-10-20

Tester role: student with Lessons 1-3 only. Snapshot `snap4/learn`, served on :8784. 400px wide for the whole lesson, 1100px for a layout pass, plus scenes `17-hcl-ethylene` and `18-arrow-grammar` scrubbed with the orbitals layer on. No course files edited.

Note: the lesson has 32 steps, not 30 (steps 1-30 teach, 31 is the mastery check, 32 is "Use it" book problems). Console: zero errors/warnings at both widths and in both scenes. No horizontal scroll at either width (scrollWidth 400/400; 1085/1100 = scrollbar).

Method note: after the first predict I deliberately tapped the most tempting wrong answer on most steps to read the feedback, then the right one. The "first-try" columns below are therefore about whether the answer was reachable from earlier steps, not about my score.

## (a) Grade

**4 / 5** - A novice really can learn "rich gives to poor" and the three legal arrows here (tap-to-draw with a real check and a before/after picture is excellent), but a hit-target bug blocks the key tap on several arrow steps and the first picture of arrows (step 6 scene) is a big jump.

## (b) Findings (prioritised)

1. **BUG - steps 8, 13, 17 (step 2 tab), mastery problem 4.** Bond hit-lines are wider than the bond and sit above the atom discs, so tapping the *centre* of the atom a novice wants gets read as the bond. Measured: the whole disc of the H in H-Cl is a bond hit except its left third; centre of Cl in step 8 is a bond hit; the + carbon of CH3CH2+ in step 17 is almost entirely bond hit (only a lower-right sliver is the atom); both ethylene carbons in step 13 have 0/81 atom hits at their centre. Result: "Arrow cancelled" or "points into the bond between C and H" even though I tapped the right atom. In the mastery drill (problem 4, HO- + HCl) this burned my first try ("Not first try, so this one does not count"). Fix: draw atom hit circles above bond hits and stop bond hits at the atom disc edge.
2. **BUG - step 4, item 3 (ethylene).** Step 3 said the rich site is "a π bond (the C=C)", but tapping the double bond (either line or the gap) does nothing at all, no message. Only two unlabeled dashed circles (the carbons, no "C", no H) respond. Fix: make the bond tappable (accept as "either carbon") or label the atoms and say "tap a carbon".
3. **CHEMISTRY / mismatch - step 15.** Text is about the carbocation's empty p orbital, but "Watch the scene" opens scene 17 (the full HCl + ethylene, 8 beats, including step 2 not yet taught), and the 3D tert-butyl cation shows no p lobes, so "look at it edge-on" shows nothing special. Fix: add an empty-p lobe overlay to the model or point the button at beat 4 of scene 17.
4. **BUG - recap card, steps 26-27 (and any step after step 26).** The "Last step" recap of step 26 is 652px tall at 400px and its block layout collapses: "+ Br- Rearrangement (1 -> 1 ..." runs into the previous row (also seen at 1100: "+ H2O Substitution (2->2...)"). More generally on mobile the header plus recap (170-320px) pushes every new question to y~640, below the first screen. Fix: render recap as plain text, cap its height, collapse it by default.
5. **BUG - stale feedback/hints, step 24 and step 4.** Step 24 task 3 ("Is ΔH positive or negative?") shows the previous task's feedback "ΔH is final minus initial ... -40 kJ/mol here" before I answer: spoiler. Hint 1 (about Eact) stays under the ΔH tasks. Step 4 keeps Hint 1 across molecules 3 and 4, and steps 8/17 keep a red "Draw at least one arrow" box after an arrow was added. Fix: clear feedback and hints when the sub-task advances or the state changes.
6. **CHEMISTRY - step 6 and scene 18.** First look at arrows is a text-only explain step; the picture is behind a button and is allyl chloride: Cl leaves unprompted (carbocation from an alkyl chloride), the cation then slides (resonance, "Lesson 11"), then Cl- comes back to the other end, with C1/C2/C3 numbering. Three arrows plus a cation shift is too much for the first picture. Fix: show three tiny single-arrow pictures (HO- + H+, H-Cl, ethylene + H+) inline in step 6 - the tasks of steps 7-9 already use exactly these - and keep scene 18 as an optional "putting it together".
7. **BUG (legibility/overlap) - scenes 17 and 18 at 400px.** Atom labels are ~6px; orbital annotations ("top face", "bottom face", "empty p", "or from below") are ~5px and unreadable. Scene 18 beat 5: the red "6e-" pill overlaps "H2C". At 1100px scene 18 beat 1: a pink marker overlaps the "H2" under the CH2 carbon. Fix: enlarge labels (min 10px rendered) or crop the viewBox tighter on narrow screens; offset pills.
8. **CHEMISTRY / feedback - step 7.** Tapping the O atom (not the dots) silently starts the arrow at the O-H bond; the check then says "Ask which electrons form a new bond, and which bond has to break" although in HO- + H+ no bond breaks. Fix: when the tapped atom has a lone pair, prefer the lone pair; make the hint say "nothing breaks here".
9. **UX - steps 8, 13, 17.** A tap that ends on the same atom as the start (the natural wrong move "bond -> H") is cancelled with only "Arrow cancelled. Tap the electrons the arrow starts from"; then Check says "Draw at least one arrow". A novice thinks the app is broken. Fix: say why ("an arrow cannot end where it starts") and keep the first selection. Minor: the Check button jumps ~20px when the status line wraps to two lines.
10. **Vocabulary used before defined (novice view).** step 3: "π bond", "octet", "positive carbon"; step 5 legend: "radical reactions", "fishhook"; step 15: "sp²", "empty p orbital"; step 19: "alkyl", "σ bond", "inductive effect" in two sentences; step 26-27: skeletal line drawings with no key, IUPAC names (1-chloropropane, propan-2-ol, 3-methylbut-1-ene); step 29 feedback: "carbonyl". Glossary tap-targets exist but are 25-29px high on mobile (below 44px); the numbered ΔH brackets on step 24 are ~18px. Fix: first-use one-line gloss or a "you need" chip; enlarge targets.
11. **CHEMISTRY wording - steps 12, 18, 26.** Step 12: feedback "sending it to a carbon would give that carbon five bonds" is true only for the carbon that took H, not for "one of the two carbons". Step 18: option "CH3+: no carbon group at all crowds the + carbon" is muddled ("crowds"). Step 26: "Rearrangement" example is 1-butene -> 2-butene (a double-bond shift), not the carbocation shift most books mean; also step 19 asserts "a steadier cation forms faster" without a one-line why.
12. **Pedagogy - text-only predicts at the heart of the mechanism, steps 11, 12, 16, 20.** The picture of HCl + ethylene arrives only at step 13, after you have already been asked where the first arrow starts. Steps 11/12/16 should show the molecule (even static). In worked-example step 10 the correct option spells out the full explanation, so it can be answered by pattern-matching.
13. **Mastery drill - step 31.** Passing needs 3 right first tries and I passed at "3 of 5". Only problem 4 (of 5 I saw) is arrow-drawing; 3 are energy diagrams; nothing asks HBr + propene (the lesson's second half). After passing, Back then reopens at "Problem 1: 0 of 3" (pass state seems lost on revisit). Back also resets answered state on steps 27-29 (not stale, but completed work vanishes). "+10" was accepted for ΔH, good.
14. **Layout at 1100px.** Scene stage is 486px tall and its Play/Beat controls start at y~717 of an 800px viewport (≈1124 px below the page top on a fresh scene page), so you cannot watch and press at once without scrolling on a typical laptop. On 400px a single scene panel is ~923px tall. Fix: cap stage height (~55vh) and keep controls sticky.
15. **Repetition and loose ends.** Step 13 says the same outcome four times (feedback, "What happened", "The π bond of ethylene attacks...", "Step 1 done"). Step 32 lists book problems "3.11-3.60" without naming the book.

### Not bugs (checked)
- Blank/ghost screens between steps seen in screenshots were capture lag: `#step-host` opacity reaches 1 in ~300ms.
- No stale state after Back in the sense of leftover answers: steps reset cleanly; reload resumes at the saved step.

## Per-step log (400px; T = answerable from earlier text? / P = picture before text? / terms / feedback names the misconception? / layout)

| # | Type | Answerable | Picture first | Undefined-before-use terms | Wrong-answer feedback | Layout/bug |
|---|------|-----------|---------------|----------------------------|-----------------------|------------|
| 1 | predict | yes | no | none | n/a (right) | OK |
| 2 | predict | yes (L2) | no | δ-/δ+ from L2 | yes ("Pulling harder means Cl ends up with MORE") | recap box starts to dominate |
| 3 | explain | n/a | no | π bond, octet, positive carbon | n/a | text only, 6 glossary chips |
| 4 | try x4 | yes (lists on card) | yes (molecule) | none | yes for Br; **silent for tapping the C=C bond (#2)** | stale hint (#5) |
| 5 | predict | guessed->yes | no | fishhook/radical | yes (names "that is where it ENDS") | text-heavy legend |
| 6 | explain | no picture | no (scene behind button) | none | n/a | scene too steep (#6); scene inside panel: check-yourself feedback good |
| 7 | try | yes (grammar) | task then picture | none | yes but misleading "which bond has to break" (#8) | O tap picks bond; small dots |
| 8 | try | yes | picture after | none | "Arrow cancelled" only (#9) | **#1** hit area; stale red box |
| 9 | try | yes | picture after (carbocation appears) | none | n/a (right first) | OK |
| 10 | worked x3 | yes (step 6, rule) | yes (wrong mechanism drawn) | none | yes, each names the confusion | feedback below options |
| 11 | predict | yes (steps 3, 9) | no | none | yes ("rich does not give to rich") | no picture (#12) |
| 12 | predict | guessed | no | none | yes, one imprecision (#11) | no picture |
| 13 | try (two arrows + replay) | yes | picture yes | electronegative | yes ("points into the bond between Cl and H" - caused by #1) | **#1**, long repetition (#15) |
| 14 | predict | yes (text gives arithmetic) | no | none | yes ("counts the bonds, not the electrons") | OK |
| 15 | explain + 3D | partial | model yes | sp², empty p | n/a | **#3** |
| 16 | predict | yes | no | carbocation (defined at 12) | yes | OK |
| 17 | try (replay + draw step 2) | yes | picture yes | none | yes ("starts at an atom with no lone pair") | **#1** worst case (+ carbon) |
| 18 | predict | guessed | no | none | yes | option wording (#11) |
| 19 | explain | n/a | no | alkyl, σ bond, inductive | n/a | text only |
| 20 | predict | guessed (needs 1°/2°) | no | IUPAC names | yes | text only |
| 21 | predict | yes (hill analogy) | no | none | yes ("Order is not speed") | OK |
| 22 | explain + diagram | n/a | diagram after text | transition state, intermediate | n/a | letters B/C/D defined only by text |
| 23 | try x3 diagram | yes | yes | none | yes ("valley, not a peak") | auto-advance is nice |
| 24 | try x3 numbers | yes | yes | Eact, ΔH | yes ("goes DOWN from a peak") | **#5** spoiler, small brackets |
| 25 | explain | n/a | follows picture (good) | exo/endothermic, catalyst | n/a | OK |
| 26 | explain | n/a | yes | isomer | n/a | skeletal drawings, recap glitch (#4) |
| 27 | worked x4 | yes (counting rule) | yes | skeletal/IUPAC | yes ("2 reactants and 1 product") | tiny labels, equation wraps |
| 28 | explain | n/a | no | nucleophile/electrophile (defined here, after use of rich/poor - good) | n/a | OK |
| 29 | try x5 | yes | yes | carbonyl | yes (names electrophilic end) | OK |
| 30 | recap | n/a | no | none | n/a | OK |
| 31 | mastery | - | - | - | yes | **#1**, #13 |
| 32 | use it | - | - | - | - | #15 |

Scenes: both play through all 8 beats with no console errors; Orbitals layer shows pi cloud, empty p (red dashed lobes) and Cl- lone pair entering it; scrubbing the slider (0-33/34) is smooth. Issues are #7 and #14 above. Scene 17's stereochemistry note ("two faces") is clear.

## (c) The three steps that taught the most

1. **Step 7** - draw HO- + H+ yourself, get rejected with a reason when wrong, then "After:" drawing plus Show before/after makes "lone pair -> new bond" concrete.
2. **Step 13 (with the Next/Next replay and step 17's second arrow)** - the two-arrow first step drawn, checked, then animated one arrow at a time with a caption, ending on a carbocation + Cl-.
3. **Step 24** - numbered Eact/ΔH brackets on a real diagram with feedback that names the slip ("that bracket goes DOWN from a peak").
