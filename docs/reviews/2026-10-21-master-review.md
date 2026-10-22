# Novice review (2026-10-21): Mastery course (#master, 40 question types)

Reviewer role: first-year student, weak organic background, midterm tomorrow. Snapshot server on :8766 (not started or stopped by me), built-in browser, desktop pane for most of it, 375px for the phone checks. No files under `learn/` were edited. I read the course page and eight type pages top to bottom (predict-hx, stereo-outcome, assign-rs, name-it, lewis-formal-charge, resonance-rank, skeletal-convert, chairs). I played assign-rs to "Mastered" (8 problems, one deliberate miss) and 3 predict-hx problems (plus an 8-problem repeat check). Where a drawing was too small to read I pulled the SVG geometry and worked the CIP letters by hand; every practice answer I worked out agreed with the site.
Method notes: only 3 screenshots were used (one timed out and was retried). The harness's step 6 route `#lesson-09/useit` does not exist (see finding 12); I reached the "Use it" step by marking lesson 9 steps done in localStorage and then restored lesson 9 to untouched.

---

## (a) Grades (1 = poor, 5 = excellent)

| Area | Grade | One-line reason |
|---|---|---|
| Clarity | 3 | Recognise / Procedure / Marks reads well, but section codes (A5, B3) are never explained, there is no "start here" or time estimate, and several worked answers just restate the result |
| Chemistry | 3 | Nearly everything checks out; one wrong generalisation (hydroboration "meso"), one worked example that omits the answer the marks scheme asks for (epoxide), two small count/phrase slips |
| Practice loop | 4 | Streak, reset, hint, retry, "not first try" note and the Mastered banner all work; the R/S guided widget is excellent; stale counter, doubled feedback, repeated molecules |
| Navigation | 4 | Prev/next/all-types, lesson, card, scene and lesson-to-course links all land correctly; progress and ticks persist; card/scene pages have no way back to the type |
| Layout | 4 | No sideways overflow at 375px, dark mode readable, no truncation; Start practice is ~4 screens down and the phone problem card is ~1000px tall |

No blockers found. Console: no errors on any page (the log was empty at the end; reloads clear the buffer, so this means "none seen", not "none possible").

---

## (b) Findings (prioritised, 18)

### Should fix

1. **Worked answers often do not follow the procedure above them.** Pages: assign-rs, skeletal-convert, lewis-formal-charge, chairs, resonance-rank. assign-rs Example 2 and 3 worked answers are the whole of: "The center is S: (S)-butan-2-ol." and "The center is R: (R)-2-chloropentane." The Procedure says rank the four groups, find group 4, read, reverse; the Marks say "the priorities written on the four groups (1-4)". Nothing in the worked answer ranks anything. Example 1's answer is generic text ("Rank the four groups with the CIP rules, put group 4 away from you... This center is S") with no ranking of *this* molecule. skeletal-convert Example 2: "Count the carbons along the backbone and give each one 4 − (bonds drawn) hydrogens: CH₃C#CH." (it repeats the question). Why it matters: the practice later shows exactly the step-by-step scaffold (priorities, wedge/dash, direction), so the site can do it; the examples a student reads first are the weakest part. Fix: reuse the guided steps from the practice widget as the worked answer ("1 = OH, 2 = propyl, 3 = CH₃, 4 = H; H on a dash; counterclockwise: S").

2. **Examples do not exercise the procedure or the marks scheme of their own type.**
   - lewis-formal-charge: all three examples are counting questions ("HOW MANY VALENCE ELECTRONS...", "HOW MANY ELECTRONS SURROUND THE HIGHLIGHTED N ATOM"). No lone pair is drawn and no formal charge is calculated, yet the Marks say "every lone pair drawn" and "the formal charge(s) on the right atom(s)".
   - chairs: no chair is drawn on the page. Example 2 and Example 3 are word-for-word the same question with the same answer ("cis (same face of the ring)"); the trans case, ring flip and A-value energy (marks 1 and 3) are never shown.
   - name-it: Examples 1 and 3 are both cis/trans ring names (cycloheptane, cyclodecane, near-identical worked text); no E/Z, R/S, alkene or alkyne example although Procedure step 4 is about them. Ring sizes of 7 and 10 are not what a McMurry midterm asks.
   - resonance-rank: Example 1 and Example 3 are the same enolate question (only A/B swapped).
   - stereo-outcome Example 3 (cyclopentene + RCO₃H): the worked answer is "the epoxide (one O across the C=C). The two new groups add on the same face (cis on a ring)". The type is "racemic, meso or single isomer" and the Marks give a mark for the stereo word, but the answer never says meso/achiral. Also an epoxide is one O, not "two new groups".
   - predict-hx Example 3 (but-1-ene + H₂O gives butan-2-ol, a stereocentre): worked answer says "either face: the cation is flat" but not "racemic", which the Procedure step 4 and the third Mark require. Example 1 and 3 carry the same boilerplate "In space: either face" even when the product has no stereocentre.
   Fix: choose three examples that cover the three commonest variants of each type (and de-duplicate).

3. **Raw notation leaks into the page.** skeletal-convert Example 2: "WHICH SKELETAL DRAWING IS THIS CONDENSED FORMULA? CH₃C#CH" and again in the worked answer. The `#` is SMILES for a triple bond; a student sees a character they have never met. Fix: render as CH₃C≡CH.

4. **Course page does not say where to start, how long, or what the chips mean.** `#master`. What I read: "Every kind of question the midterm can ask, in exam-weight order... 0 of 40 types mastered" and 40 rows. Missing: (a) a time estimate (each type is roughly 3 screens of reading plus 5+ problems; nothing says so), (b) a "start here" or "weakest first" hint, (c) what "A5, B3, B6, B1" are (the chips on every row; the group blurbs say "B3, B6 and A5: the biggest block of marks" as if known), (d) "1 marks" (plural, appears on 4 rows). For a weak student the order is also backwards: Reactions (16 types, assume Chapters 1-4) is first and the Chapter 1 foundations ("Bonding and acids", "Lewis structure...") are fourth of five groups. The page calls itself a "ladder" nowhere, and it is not one: no prerequisite order, nothing locked. Fix: one line "Not sure where to start? Do assign-rs, then predict-hx" and a legend for the section codes.

5. **Chemistry: hydroboration is lumped into the "meso" rule.** stereo-outcome Procedure: "Syn (H₂, cold KMnO₄, hydroboration): a cis alkene with equal ends gives meso; a trans alkene gives the racemic pair." Meso needs the same two groups added; hydroboration-oxidation adds H and OH, so the cis-alkene result is not meso. "equal ends" must read "equal ends and the same group on both carbons (H₂ on a ring, cold KMnO₄, Br₂)". Same sentence uses "racemic threo pair / trans-on-ring pair", jargon not defined anywhere on the page.

6. **Wrong-answer feedback does not say it was wrong (Fischer widget).** assign-rs, glyceraldehyde problem, I answered S (correct is R). The text under the figure was only: "H is on a vertical bond, and a vertical bond points AWAY from you: that is exactly the view you want, so there is nothing to reverse. 1 → 2 → 3 turns clockwise on the page." There is no "Not quite", the priorities were not yet labelled on the figure, and the only signals were the dots resetting and the S button greying. It did give Hint 1 and let me retry, and the retry then read "Correct... Not first try, so this one does not count toward the check. The slip is logged; the next problem is fresh." That second message is very good; the first one needs a one-word verdict.

7. **Practice repeats molecules and sometimes tests nothing.** assign-rs, 8 problems: glyceraldehyde appeared three times (problem 3, then twice more in 6 and 7, once consecutively), 2-chlorobutane/butan-2-ol shape matches Example 1/2, and problem 1 (pentan-2-ol) is the identical drawing to Example 3 (2-chloropentane) with Cl replaced by OH. predict-hx problem 2: "ethene + HCl. Which is the major product?" with options 1-bromoethane, 1-iodoethane, 1-chloroethane, ethene: answerable by spotting the Cl, no chemistry. In the 8-problem skim I saw no repeated prompt twice in a row on predict-hx and no missing Next button.

### Nice to have

8. **Stale and doubled text in the practice card.** assign-rs after a correct first answer the dots read "1 of 5" but the card still says "Run: 0 of 5. Only a right first answer counts" until the next problem (same on predict-hx and after a miss: dots 0, card "Run: 2 of 5"). In the Fischer widget the prompt appears twice back to back ("Is the chirality center in this Fischer projection R or S?" then "...projection of 2-bromobutane R or S? (This one is drawn in an unusual arrangement; the rules are the same.)") and after answering the explanation appears twice ("Priorities: Br > CH₂CH₃ > CH₃ > H. Going 1 → 2 → 3..." then "Correct. Priorities: ..." identical). Fix: one count, one prompt, one explanation.

9. **Start practice is far down the page.** predict-hx: button at y = 3089 px of a 3694 px page (about 4 screens at 768px); assign-rs 2673 of 3282; lewis 2448 of 3057. A student who already knows the rules has to scroll past Recognise, Procedure, Marks and three examples; there is no "Skip to practice". On a phone the practice card itself is ~1000px tall (options 155px each). Fix: a "Practise now" link in the header row next to the marks chip.

10. **Worked examples show the green answer immediately.** All examples render the correct option highlighted with no way to try first, which contradicts the home-page promise "Act first, then read" and is the "answer shown before you could understand the question" case you asked about. Fix: a "Cover the answers" toggle, or open example 3 unanswered.

11. **Procedure wording nits.** assign-rs: the ranking list "Br > Cl > O > N > C > H" skips F and S, and the Fischer line says only "vertical bonds point away" (the horizontal-toward half is only stated in the feedback). name-it: Procedure says the ring is the parent "if it has more carbons than the chain", the worked answer says "at least as many carbons"; Example 3 says "the longest chain on it has 3" for butan-2-yl, which is a 4-carbon group. skeletal-convert: the chip says "1 marks" but "What earns the marks" lists two 1-mark lines; the step "put each group in parentheses as a branch on the carbon before it" is hard to picture without an example. resonance-rank Example 1 (an enolate) explains with "the positive one on the less electronegative atom" although no positive charge exists in the species; Example 2's stem reads "OF THE CHLOROETHENE (VINYL CHLORIDE)". chairs Example 1's stem gives away the key step ("IN THIS CIS-1,4 ISOMER ONE GROUP HAS TO BE AXIAL...") and its figure is a flat hexagon with no wedge on tert-butyl, so cis cannot be seen.

12. **Lesson-link row and deep link.** `#lesson-09/useit` (the route you gave me) returns the Home page: the router only accepts `#lesson-NN/sNN`, so the Use-it and mastery steps have no direct URL. Not student-visible. At the real step ("Step 20 of 20") the row is correct: "Master this question type:" followed by three links (predict-hx, mechanism-arrows, intermediate-why), and the first link landed on `#master/predict-hx` with browser Back returning to the lesson at step 20. Two nits: the label is singular for three links, and the row sits under "Mark lesson complete", where most students will already have clicked away.

13. **Card and scene pages have no way back to the type.** Following "Card: HBr or HCl" lands on `#reactions/alkene-hx` scrolled to that card (good) but the only crumb is "← Home"; "Scene: HBr adds to 2-methylpropene" gives "← How each reagent works"; the lesson gives "← All lessons". Browser Back works, but a student on a phone will use the visible crumb and lose their place.

14. **Phone and visual details.** Dots are 10px circles ("0 of 5 in a row" is only in the aria-label) and "best run 4" appears beside them on the course page without explanation. Book-problem checkboxes are 20px but the label box is 95x44, so they are tappable. Example cards in dark mode have a 1px border at 1.26:1 against the page (the card fill still separates them); all text measured at least 4.5:1.

15. **Home panel.** "Mastery course: Every question type on the midterm: recognise it, the procedure, what earns the marks, three worked examples, then practise to five in a row... 0 of 40 types mastered" is clear about what it is. It sits ~18 cards down the page (after the 17 lessons) and has no reason to open it today ("midterm tomorrow: do this"). Nice to have: a one-line "Best use of the last night" hook and move it above the lesson list for a student past Lesson 10.

16. **Some practice items give away the answer in assistive text.** predict-hx options expose "formula C6H14O, a chain of 6 carbons, OH on a tertiary carbon" as names, which is good for screen readers and also states the regiochemistry to anyone who inspects them. Low priority; the benefit outweighs the leak.

17. **Per-type scope is quietly narrower than the headline.** "Name it (IUPAC, any class, with stereo)" and "Chairs: draw the more stable conformation" are both practised as multiple choice or typed names, so the marks the page lists (drawing both chairs, writing E/Z) cannot be rehearsed here. Say so in one line ("practice covers recognition and naming; draw these on paper from the book problems").

18. **Time to mastery.** assign-rs took 8 problems (5 correct in a row after the deliberate miss on problem 3). Fine for a student, and the Mastered banner arrived exactly on the 5th first-try answer, not early.

---

## (c) CHEMISTRY items (quoted)

- stereo-outcome Procedure: "Syn (H₂, cold KMnO₄, hydroboration): a cis alkene with equal ends gives meso". Wrong for hydroboration (H and OH differ); right only when both added groups are identical. Also "racemic threo pair / trans-on-ring pair" is undefined jargon.
- stereo-outcome Example 3 worked answer: "the epoxide (one O across the C=C). The two new groups add on the same face (cis on a ring)." Incomplete for the type: cis-cyclopentene oxide is meso/achiral and the answer never says it; "two new groups" is wrong for a single O.
- predict-hx Example 3: but-1-ene + H₂O gives butan-2-ol (stereocentre); worked answer "In space: either face: the cation is flat" omits "racemic", which Procedure step 4 and the third Mark require.
- name-it Example 3 worked answer: "The ring has 10 carbons and the longest chain on it has 3." butan-2-yl is a 4-carbon substituent (the conclusion, ring is the parent, still holds). Procedure says "if it has more carbons than the chain", worked text says "at least as many".
- resonance-rank Example 1 explanation: "the positive one on the less electronegative atom" (an enolate has no positive charge).
- assign-rs list "Br > Cl > O > N > C > H": omits F and S, which a student can meet in the book problems.
- Verified correct by hand: assign-rs Example 2 ((S)-butan-2-ol), Example 3 ((R)-2-chloropentane); practice problems pentan-2-ol (R), 2-bromobutane Fischer (R), glyceraldehyde Fischer (R, three drawings), 2-chlorobutane (S), the pentan-2-ol-shaped OH/propyl/CH₃ wedge-dash problem (S) and the CH₃/Cl/CO₂H/H plain-bond problem (R, swap method); lewis examples 14, 8 and 8; skeletal Example 1 (C₂H₆O); stereo-outcome Example 2 (Br₂ + cyclopentene racemic); resonance-rank Example 2 (vinyl chloride, neutral form wins); chairs Example 1 (tert-butyl equatorial); the e,e / a,e rules for 1,2 / 1,3 / 1,4.

---

## (d) Things that worked best

1. **The guided R/S widget.** Tap the four groups in priority order, "Go one atom further" tie-break table, "Find group 4... a wedge / a dash / a plain bond", a "Swap 4 with the dashed group" step for the plain-bond case and a spoken-reasoning confirmation ("After the swap the curve turned counterclockwise; reversing once for the swap gives R"). It is the whole Procedure as an interaction.
2. **Streak mechanics and honesty.** Dots update as you go, a first-try miss resets them, the retry is allowed but labelled "Not first try, so this one does not count toward the check. The slip is logged", and the banner "Mastered: five in a row" with "Next type: Assign E or Z (and cis/trans)" arrives exactly at the fifth.
3. **Persistence and links.** Mastered state and "best run" survive navigation and show on the course row ("Mastered | best run 5", "1 of 40 types mastered" on both the course page and Home); two ticked book problems stayed ticked across `location.reload()`; every lesson, card and scene link went where promised, with the card scrolled into view.
4. **Mobile and dark mode.** `scrollWidth` equalled `innerWidth` (375) on #master, predict-hx, assign-rs, chairs and stereo-outcome and after starting practice; dark mode had no unreadable text.
