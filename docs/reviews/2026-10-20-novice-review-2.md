# Novice re-review of Orgo Learn, 2026-10-20 (round 2)

Reviewer role: a student with no chemistry background, after the fix round. Snapshot `snap2/learn` served on :8773, browser pane. Lesson 1 and the hub were read at a 400 px viewport. Everything else was read at 1100 px (note: the pane's own "desktop" preset turned out to be about 400 px wide, so I set 1100 px by hand). I played Lesson 1, 2, 8, 9 end to end (arrow widgets, players, what-if chips, 3D button at L10 s04), Lesson 13 s1-s9 and the L13 s06 hint ladder, the Diels-Alder hub card with its draw list worked on paper, 8+ drill problems, past-paper items A1.3, A2.2, B3.1.9 (Diels-Alder) and B6.2, the glossary, the home weak-spot panel, and Caveman on for one hub card and one player why line. I did not edit any course file. No console errors were visible; the server log shows only `/favicon.ico` 404s. Mastery of L1 and L2 was opened and checked once, not completed.

Judgement scale as before: yes = answerable from what was taught; guessed; no.

## (a) Grades (1-5) with last round in brackets

1. **Lessons 1-2: 4/5** (was 3). The valence-electron table, ion rule, formal-charge definition, sigma/pi pictures, Li/Mg values and "You need from Lesson N" recap all landed; remaining gaps are tiny 3D models and an undrawn lone pair in L1 s15.
2. **Lessons 8-9: 4/5** (was 3.5). L8 s03 now has a legend and pictured options, L9 s01/s03/s04/s06 now give the clue, the cation definition and the reason; whys in the players are better but the last arrow of each mechanism still has none.
3. **Lesson 13 to s8: 3.5/5** (was 2.5). The cut-off questions are fixed in all eight places and s06/s08 are goal-first with a hint ladder; s01's figure is noise at that point and s04 is still one dense paragraph.
4. **Hub: 3.5/5** (was 3.5). The Diels-Alder card can now be followed with a pencil (new "Draw it, step by step"); navigation (38 cards, no search, 39,600 px tall at 400 px) is untouched.
5. **Drill: 4/5** (was 4). Per-option feedback names the slip and the hint ladder works; still long and jargon-heavy on director questions, and never links back to a card.
6. **Past papers: 3/5** (was 2.5). Links are now honest (A1.3 five steps, B3 to the card, B6.2 to NBS, desulfonation and SO3 cards) and B6.2 explains "bulky" and NBS; still zero exam drawings.
7. **Player: 3.5/5** (was 3.5). Whys now say "the more electronegative atom", "the carbon with more H"; what-if chips are a great idea but leave the old heading and summary on screen, and "What happened" is still ambiguous.
8. **Glossary: 3.5/5** (new). 60 terms, search box, tappable dotted words in steps work well; missing catalyst, isomer, dienophile, oxonium, bromonium, inductive effect, equilibrium, electron-withdrawing group.
9. **Figures: 3.5/5** (new). The L9 "two-stage lock" and L1 "drawer cabinet" really help before the question; at 400 px the labels are 5-6 px tall, the hub copies are collapsed, and L13 s01's figure shows ortho/meta "gates" before benzene is even introduced.

## (b) Previous findings, one by one (25)

| # | Status | Now |
|---|---|---|
| 1 L13 s01 and 7 other cut-off questions | **fixed** | All eight now show the whole question (L11 s01, s07, L12 s01, s16, s17, L13 s01 prompt and option 1, s17). Residue: the inline benzene picture is a block, so the sentence breaks and a stray ", is drawn as..." starts a line (new #7). |
| 2 L1 s03 no periodic table | **fixed** | A mini table (groups 1, 14-17) sits above the cells and says "last digit of the group number" and "ignore the atomic number". |
| 3 L8 s03 predict arrow notation | **fixed** | An "Arrow legend" box plus a picture on each option; answerable by reading. |
| 4 L2 s02/s05 sigma and pi no picture | **fixed** | Both steps now have a figure (head-on overlap; two p lobes overlapping sideways). Small but present. |
| 5 L2 s17 Li electronegativity | **fixed** | Li 1.0 and Mg 1.2 in the s15 list; s16/s17 print the values under the molecule. |
| 6 Guessable options (long / option A) | **fixed** | Options are shuffled per browser session (confirmed by clearing the session salt); correct option is strictly longest in 20 of 96 text-choice steps (21%, was 45%). A few remain extreme: L13 s02 128 vs 81-94, L16 s10 133 vs 79-89, L12 s02 127 vs 89-93, L14 s07, L5 s02. |
| 7 L1 mastery ions not taught | **fixed** | s11 now states "+ charge: subtract 1, example H3O+ = 6 + 3 - 1 = 8"; s12 defines formal charge. Mastery problem I met was a build of C2H4O2 and its hint did not use "skeletal". |
| 8 L3 s06/s08 log and equilibrium | **not re-tested** | Out of scope this round. "equilibrium" is still not in the glossary. |
| 9 L9 s01/s03/s04 un-derivable | **fixed** | s01 now carries the propene clue plus the lock figure; s03's prompt gives the idea (C+ is short of electrons, groups lend density); s04 defines 3 deg/2 deg/1 deg cations. |
| 10 L9 s06 reason asserted | **fixed** | "C+ is short of electrons, so alkyl groups that lend it density spread the charge and steady it." |
| 11 Player whys say what, not why | **partly** | New good whys: "the more electronegative atom" (tappable), "δ+ H", "on the carbon with more H, so the + lands on the other carbon", "(the solvent)". Still bare: L8 s17 arrow 3 "attacks the positive carbon", L9 s11 step 3 "takes the H from the oxonium ion" (why does water take it?). |
| 12 "What happened" ambiguous (two O's) | **not fixed** | L9 s11 step 3 still reads "O goes from positive (+) to neutral, O becomes positive (+)"; L8 what-if Br2 reads "Br becomes positive (+), Br becomes negative (-)". |
| 13 Player drawings tangled | **partly** | L9 s11 steps 1-2 and the L8 s17 end structure are clean and a skeletal "As a normal structure" row was added (very good). L9 s11 step 3 and the final alcohol still have crossing bonds and the + sitting on a bond; L10 s04 cyclohexene has an H inside the ring. |
| 14 3D models tiny | **not fixed** | L1 s08 water is about 40 px in a 334x260 box at 400 px; L2 s01 methane about 40 px at 1100 px; L13 s02 benzene about 90 px in a 946 px canvas. |
| 15 Recap card clamps key idea | **partly** | Still clamped to 3 lines with "Show all" at 400 px (L1 s03, L2 s16), but the numbers the next step needs are now printed in that step itself, and earlier-lesson recaps are a tidy collapsible "Before you start" with "see the step" links. |
| 16 L8 s05-s06 terms before definition, no lone pairs | **partly** | The prompt now says "Nucleophiles donate a pair" and a note "From Lesson 01: oxygen in water has two lone pairs...". Water is still drawn without lone pairs and the formal definition still arrives at s07. |
| 17 L13 s04 five terms, no figure | **partly** | A "circle = six pi electrons" figure and tappable aromatic / resonance were added; still one paragraph with five ideas. |
| 18 L13 s06/s08 copy tasks | **fixed** | Prompt gives the goal; arrows are in hint 1 and hint 2 only. The wrong-arrow message ("The C-C bond electrons are not moving in this reaction...") is precise. |
| 19 Hub Diels-Alder card unfollowable | **partly (mostly works)** | I drew penta-1,3-diene + acrolein with the new 7-line walkthrough (label C1-C4, call the acrolein carbons a and b, hexagon order C1 C2 C3 C4 b a, move the double bond, formula check C8H12O) and got 2-methylcyclohex-3-ene-1-carbaldehyde. Still undefined: ortho-like/para-like, stereocentre, racemate, "cis stays cis", syn; no picture per step; "Not in a lesson" note remains; why a (CHO) joins C1 and not C4 is just asserted. |
| 20 Past papers: no drawings, thin links | **partly** | Links fixed (see grade 6). No item has a structure (svg count 0 for A1.3, A2.2, B3.1.9, B6.2). |
| 21 Hub navigation | **not fixed** | 38 cards, 39,607 px tall at 400 px (was ~33,000), three filter groups before the first card, no text search, still Aromatics first, Br2/FeBr3 step 4 "go to the director cards" has no link, HBr step 1 "count the alkyl groups" does not mention a ring neighbour. New: a collapsed "See the idea" figure per group. |
| 22 Drill feedback jargon, no links | **not fixed** | Still opens with the generic "Slip on WHERE it adds: the new groups ended up on..." line; ethylbenzene nitration (wrong meta option) gives about 120 words (inductive effect, ortho/para, + ends up on the carbon...); no wrong answer links to a card or lesson. |
| 23 Home weak spots out of context | **fixed** | Now skill name, count and "Last slip: Lesson 9, step 14" link. Empty Check presses (L8 s10, L1 mastery) were not counted. |
| 24 Encoding / mojibake | **fixed** | "Step 1 ✓" and the pills render correctly. |
| 25 Small items | **partly** | Fixed: shell taught in L1 s02's prompt, pm and kJ/mol glossed in L2 s13. Not fixed: L1 s15 lone pair only in the caption, image-only options (L9 s16/s17) still have empty accessible names. L3 amide ion not re-tested. |

## (c) New findings (13), prioritised

P1 = blocks a novice, P2 = slows or misleads, P3 = polish.

1. **P1. What-if chips leave stale text on screen.** Location: L8 s17 after clicking "Br2" and L9 s11 after "HBr". Happened: the player switches to the new reaction, but the heading still says "Check your prediction... HBr adding to but-2-ene" (L8) / "Draw the 3-step mechanism of acid-catalysed hydration..." (L9), and the green summary under the player keeps the old reaction ("The same two steps as before: pi bond to H with the H-Br pair to Br..." under a Br2 bromonium animation; "Protonation gives the tertiary cation, water's lone pair..." under HBr). Why it blocks: a novice reads the summary as the explanation of what is moving. Fix: on chip select, replace the heading and summary with the chip's own text (or hide them).
2. **P1. L13 s01 figure is the wrong picture at the wrong time.** The "Turnstile" figure shows donor -OMe lighting ortho/para gates and withdrawer -NO2 lighting meta, with o/m/p, "sp3" and "gates" undefined, before the student has seen that benzene substitutes. Why: it looks like the answer to the question but is about Lesson 14. Fix: show a benzene-only state (no substituent, E+ replaces H) at L13 s01 and keep the OMe/NO2 states for L14.
3. **P1. Figure text is unreadable at 400 px.** L1 s01, L9 s01, L13 s01 and the hub group figures are scaled to about 0.4, so legends and captions are 5-6 px; the caption pill is readable, the legend is not. Fix: set a minimum font size in the SVG, or give the figure a tap-to-enlarge, or drop the legend on narrow screens.
4. **P2. 3D models still tiny (carry-over, now with measurements).** About 40 px water in L1 s08 at 400 px, about 40 px methane at L2 s01, 90 px benzene at L13 s02; the highlighted atoms in L2 s04 are hard to pick out. Fix: fit the camera to the molecule on load.
5. **P2. Last arrow of each mechanism still has no why.** L8 s17 arrow 3 "A lone pair on Br- attacks the positive carbon", L9 s11 step 3 "takes the H from the oxonium ion". Why: this is the step a novice most needs ("opposite charges attract"; "O+ is desperate for electrons"). Fix: one because-clause each.
6. **P2. "What happened" line still names two atoms identically.** (finding 12 above). Fix: "oxonium O" and "water O", or colour them.
7. **P2. Inline pictures break sentences.** L13 s01 reads "Benzene, C6H6 [big picture] , is drawn as a ring with three C=C." and L11 s01 "the allyl cation [picture labelled allyl cation]" so the name appears twice. Fix: render inline `<mol>` as a small inline-block with no repeated caption.
8. **P2. Diels-Alder card still leaves four terms undefined and has no step pictures.** ortho-like / para-like, stereocentre, racemate, "cis stays cis"; and why diene C1 goes to the CHO carbon is only a rule. Fix: define each in one clause inside the walkthrough and add a 3-frame sketch (hexagon with C1..C4, b, a).
9. **P2. Glossary gaps and weak reach.** No catalyst, isomer, dienophile, oxonium, bromonium, inductive effect, equilibrium, electron-withdrawing group, Kekule, solvent ("dien" returns nothing). The glossary link is only on Home, not in the header or lessons. Fix: add the 10 terms and a header link.
10. **P2. Jargon in the L8 s17 Br2 what-if.** "bromonium ion", "a good leaving group", "anti addition" appear at Lesson 8 with only a partial gloss. Fix: gloss "leaving group" and move the bromonium chip behind "see Lesson 10".
11. **P2. Hub still a scroll of 38 cards.** (finding 21). Fix: search box, jump list by topic, put the director-card link in Br2/FeBr3 step 4.
12. **P2. Drill feedback never links back, and is long on director questions.** (finding 22). Fix: lead with the one-line rule ("-CH2CH3 is an ortho/para director"), put the why behind a "Why?" toggle, add "See the card" / "See Lesson N, step K".
13. **P3. Blank card while the chemistry engine loads.** Deep-linking to L1 s08, s15, L8 s03 shows an empty dark card for about 1-3 s with no spinner or text. Fix: show the prompt text immediately and the pictures when ready.

## (d) The three things that most helped

1. **A picture or analogy before the question, with a clue the question can use.** L9 s01 (two-stage lock figure, propene result given as the clue) turned a guess into a derivation, and L1 s01's drawer figure answers "how many bonds does carbon make" before it is asked.
2. **Recap cards and tappable words.** "You need from Lesson N: see the step" at the top of L2, L8, L9, L13, plus dotted terms (octet, lone pair, electronegative, carbocation, hydration) that open a one-sentence definition without leaving the step, including inside the player's why line.
3. **Goal-first tasks with a hint ladder, and a worked draw-list.** L13 s06/s08 now ask for a goal and keep the arrow list in hints, and the Diels-Alder card's "Draw it, step by step" (name the atoms a, b, C1-C4, fix the hexagon order, count the atoms at the end) let me finish a product I had never met.

## Appendix: per-area verdicts (yes / guessed / no)

- **L1:** s01 yes (figure), s02 yes (shell now taught), s03 yes (table), s05-s07 yes, s08 guessed (tiny 3D), s09-s10 yes, s11 yes (ion rule), s12-s14 yes, s15 yes, s16 yes, s17 yes, mastery build of C2H4O2 (given skeleton, hints precise) yes with hints.
- **L2:** s01 guessed then taught, s02/s05 explain with figure, s03 yes (correct option is the shortest of three), s04 yes (tiny highlight), s10 guessed, s13 guessed (reveal defines pm, kJ/mol), s14 guessed, s16 yes, s17 yes now (values printed), mastery highlighted-carbon angle yes.
- **L8:** s01 yes, s02 yes, s03 yes (legend), s04 yes, s05-s06 yes (lone pairs from the note, not the picture), s09 yes, s10 yes with hint, s11-s12 yes, s13 yes, s14 yes, s17 player good.
- **L9:** s01 yes (analogy), s02 yes, s03 yes (idea given), s04 explain, s05 guessed (flat C+), s07-s10 yes, s11 yes with chooser, s12 yes, s14 guessed/yes, s15-s17 yes.
- **L13 s1-s8:** s01 guessed (question complete, answer is the surprise), s02 guessed (longest option), s03 yes with hint, s04 explain, s05 yes, s06 yes with hints, s07 yes with hint, s08 yes with hints.
- **Drill (8+ problems):** desulfonation with D2SO4 (no), hydroboration of 1-methylcyclohexene (guessed), pent-1-yne + HCl (guessed), ethylbenzene + HNO3/H2SO4 (guessed), oct-4-yne + 2 Br2 (guessed), pent-1-yne + NaNH2 then EtBr (no), 2-methylbut-1-ene + HCl (yes), penta-1,3-diene + HCl (guessed), pent-1-yne + 2 HBr (guessed). Lessons 10-12 and 14 were not played, so "guessed" here partly reflects my path; every problem was solvable with the hint ladder and the post-miss worked answer.
- **Past papers:** A1.3 guessed (no drawing; steps and five links good), A2.2 guessed (no drawing; steps clear), B3.1.9 yes through the card walkthrough, B6.2 yes (plan is spelled out, NBS and "bulky" explained).
- **Caveman:** on the Diels-Alder card it cuts "WHAT IT DOES" and "WHERE IT ADDS" to fragments ("C1, C4 bond dienophile carbons"); the "Draw it, step by step" part stays in normal wording. On the player, "H-Br bond pair leaves with Br. More electronegative atom. Br becomes Br-." is shorter but drops the "so"; mild help for skimming, mild loss for a first read. Switch toggles live and the label is clear.
