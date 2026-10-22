# Novice review of Orgo Learn, 2026-10-20

Reviewer role: a student who remembers only that atoms exist and water is H2O. Snapshot served locally (`learn/` on :8768), Playwright, 400px for Lesson 1 and the hub, desktop for the rest.

Method note. I read every step's pre-answer text, every option's feedback, every input's wrong-answer and hint ladder, and every widget's feedback through deep links (`#lesson-NN/sK`), then judged each step as a student who had read the earlier steps and their reveals in order. I did not play lessons 4-7 and 10-12; where a term is defined there I say so. I did not edit any course file.

## (a) Summary and grades ("could a novice learn this", 1-5)

1. Lessons 1-3: **3/5.** Act-first with per-option feedback is excellent, but L1 s03 (valence electrons) cannot be done without a periodic table that is never shown, the sigma/pi steps have no picture, and L2 s17 needs a number (Li electronegativity) that is not given.
2. Lessons 8-9: **3.5/5.** The curved-arrow widgets are the best thing in the course (they name your exact mistake), but L8 s03 asks you to predict a notation, and L9 s01/s03 ask you to predict things nobody has taught.
3. Lesson 13 (to s8): **2.5/5.** s01 is broken: the question text after the benzene picture is cut off (8 such truncations in L11-13), and s06/s08 are copy-the-prompt tasks.
4. Hub 3.5/5, drill 4/5, past papers 2.5/5, player 3.5/5. Hub: Br2/FeBr3 and HBr cards work with pen and paper, the Diels-Alder card does not. Drill: wrong answers say which kind of slip you made. Past papers: no exam drawings, wrong lesson link for Diels-Alder.
5. Systemic: the correct option is the strictly longest in 43 of 95 text-choice steps (45%) and is option A in 40 of 104 four-option steps (38%), so a novice can score by guessing the long or first option.

## (b) Prioritised findings (25)

Priority: P0 = broken, P1 = blocks a novice, P2 = slows or misleads, P3 = polish.

**P0**

1. **L13 s01 (and 7 others): question text is cut off.** P0. Prompt shows "...Benzene, C6H6 [picture]" and then nothing; the sentence "is drawn as a ring with three C=C. It is mixed with Br2 and a little FeBr3 catalyst. What do you expect?" is lost, and option 1 loses "and HBr". Cause: `const mol = ... '<mol smiles=".." label="..">'` has no closing tag in lessons 11, 12, 13 (L14 already fixed it with a comment), so the unclosed `<mol>` swallows the rest of the string and `enhance()` deletes it. Verified in the browser for L12 s01, L11 s01, L11 s07, L12 s16, L13 s01. A static scan finds: L11 s01, L11 s07, L12 s01, L12 s16, L12 s17 (problem), L13 s01 (prompt and option 1), L13 s17 (problem: "from benzene. Decide each move."). Why it blocks: a novice sees a statement, not a question. Fix: close the tag in every helper (`</mol>`), and add a test in `tests/run.mjs` that fails on an unclosed `<mol>` followed by text.

**P1**

2. **L1 s03 (valence electrons of H, C, N, O, F, Cl): no periodic table.** Hints say "use the group number in the periodic table" but no table or group numbers are shown anywhere in L1. The cells show small unlabelled numbers 1, 6, 7, 8, 9, 17 (atomic numbers, from `NUM` in valence-strip.js), which look like answers and are wrong. The rule appears only in the wrong-answer text, and the worked answer only after 3 failures. Novice outcome: no. Fix: show a mini periodic table with group numbers above the cells (or teach "last digit of the group" in an explain before s03) and delete or label the atomic numbers.
3. **L8 s03 asks you to predict arrow notation.** "Which arrows show that? full-headed / two full-headed / two half-headed." Which arrow means one electron versus a pair is a convention, not something derivable; the answer arrives in the reveal along with homolytic, heterolytic, radical, fishhook, polar reaction. Novice outcome: guessed (1 in 3). Fix: put the convention in a legend first and make the question "which arrow moves ONE electron?", or turn s03 into an explain-then-try.
4. **L2 s02 and s05 (sigma and pi bonds): text only.** "Head-on overlap", "p orbital standing up above and below the plane", "sideways overlap" have no picture (svgs=0, canvas=0). A novice has never seen a p orbital. L9 s06 has exactly the right diagram (empty p lobes above and below a plane) and L2 does not. Fix: reuse that diagram style in L2 s02 (head-on) and s05 (two p lobes overlapping sideways).
5. **L2 s17 (CH3Li: which atom is delta-minus?) needs an electronegativity that was never given.** The s15 list is H, C, N, O, F, Cl, Br, I. Li (1.0) appears only in the wrong-answer text. Novice outcome: guessed ("metals are positive" is not taught). Fix: add Li 1.0, Mg 1.2 to the s15 list, or print the two EN values under the molecule as s16 does.
6. **Guessable options: length and position cues.** Computed over all lessons: in 43 of 95 text-option predict/choice steps the correct option is strictly the longest (chance is about 25-33%). In 104 four-option steps the correct one is option A in 40 (38%), D in 11. Worst cases: L13 s02 (190 chars vs 62-94), L16 s10 (172 vs 47-62), L9 s09 (116 vs 31-53), L13 s05 (146 vs 73-80), L8 s14, L9 s07, L9 s12. Options are not shuffled at render. I used "pick the long, specific one" on L8 s14, L9 s07, L9 s12, L13 s02, L13 s05. Fix: write distractors to equal length and specificity, and shuffle option order per step.
7. **L1 mastery: ions were never taught.** The mastery asks total valence electrons of H3O+. s11 only did neutral CH2O. "Subtract 1 for a + charge" appears only in the mastery wrong-answer text, and its hint says "skeletal drawings leave out the H on carbon" (skeletal is defined in L4). Fix: add one ion example to s11 or a one-line rule before mastery; drop "skeletal" from the L1 hint.
8. **L3 s06 and s08: log and equilibrium.** s06 needs pKa = -log Ka with Ka = 1x10^-9; "log" is never explained (the hint "log of 10^-9 is the exponent" arrives only after a wrong answer). `equilibrium` and the arrow are used from s03 onward and never defined; s08's rule "equilibrium favours the side with the weaker acid" is asserted with no reason. Novice outcome: s06 no; s08 yes only by following the worked steps. Fix: add to s05's reveal "log of 10^-9 is -9: count the zeros"; add a one-line meaning of the double arrow and one sentence of why (the stronger acid gives up H+ more readily).
9. **L9 s01 and s03 predict things that cannot be derived.** s01 (which bromide forms) is a guess, with "regiospecific" and "Markovnikov" first met in the reveal. s03 explicitly says "trust your instincts" and ranks four skeletal carbocations. This is acceptable for one step, but s04 then says "3° or 2° cation", "more substituted" with no definition in L9 (3 deg/2 deg/1 deg is defined in L5 for carbons, not for cations; "C+ bonded to three carbons" appears only in the s15 worked step), and asserts "the more stable cation forms faster" two steps before s06 gives any reason. Fix: define 3 deg cation in s04; give the reason at s04 or reorder s06 before s04.
10. **L9 s06: the reason for stability is an assertion.** "Alkyl groups push electron density toward C+ (the inductive effect), so stability runs 3 > 2 > 1" never says why pushing electrons helps. A novice needs: "C+ is short of electrons, so neighbours that donate some spread the charge and make it happier." Fix: add that sentence.

**P2**

11. **Player why-lines (L8 s17, L9 s11) mostly say what, not why.** The three L8 arrows and seven L9 arrows are accurate, but these whys are missing: (a) why the positive carbon attracts the Br- lone pair (L8 s17 arrow 3: "attacks the positive carbon"), (b) why water takes H+ in L9 step 3 and why the oxonium O loses it, (c) why H-X must break when the pi bond attacks H (H holds only 2 electrons; taught once in L8 s09, not repeated), (d) "solvent" and "oxonium" are undefined. Good whys: L8 arrow 2 ("the more electronegative atom"), L9 arrow 1 ("on the carbon with more H, so the + lands on the other carbon"). Fix: add one "because" clause per arrow, usually "opposite charges attract" or "H holds only 2".
12. **Player "What happened" line is ambiguous (L9 s11 step 3).** "H-O bond breaks; H-O bond forms. Charges: O goes from positive (+) to neutral, O becomes positive (+)." Two different O atoms with the same name. Fix: label them (oxonium O, water O) or colour them.
13. **Player drawings: tangled layout (L9 s11 step 3 and final product).** Bonds cross, H atoms overlap (the DOM lists several H atoms at identical coordinates), the alcohol's C-O bond is hard to find. L8 s17 arrow 1 curves across the CH3 hydrogens and the C=C already shows as single with the + already placed. Fix: re-layout oxonium and product; show the before-state when the first arrow plays.
14. **400px: 3D models are tiny.** L1 s08, L2 s01-s11, L13 s02: the molecule is about 60-80 px in a 350 px box. In L2 s04 ("measure the highlighted H-C=C angle") the highlight (gold atoms) is hard to pick out even at desktop width. Fix: auto-fit the model to the canvas and draw an arc with the angle.
15. **Recap card hides the key idea at 400px.** The "Last step: the key idea" box is cut to 3 lines with "Show all" (seen at L2 s04 and L2 s16, where it hides the electronegativity table and the delta rule the next step needs). Fix: do not clamp idea cards, or clamp at 6+ lines.
16. **L8 s05-s06: nucleophile and electrophile before their definition, and water is drawn with no lone pairs.** The prompt glosses "nucleophiles donate a pair of electrons" and asks you to tap the atom; the formal definition is s07, after both. The H2O picture shows no lone pairs, so you must remember them from L1. Fix: swap s07 to the front, or draw the lone pairs.
17. **L13 s04 packs five terms in one paragraph, no figure.** "aromatic, hybrid of two Kekule drawings, resonance, flat, aryl Ar-". s03 (draw arrows) precedes it, which is fine act-first, but s04 then has to carry the whole idea. Fix: split in two and add a hexagon-with-circle picture.
18. **L13 s06 and s08 are copy tasks.** The prompt spells out every arrow ("A lone pair on one Br of Br2 goes to Fe... and the Br-Br bond pair goes back onto that Br") and hint 1 repeats it. You transcribe rather than reason. Fix: hide the arrow list behind a hint and give a goal ("FeBr3 makes Br2 produce Br+ and FeBr4-; draw the arrows").
19. **Hub Diels-Alder card cannot be followed by a novice.** Undefined: electron-withdrawing group, dienophile (only in the title), sigma bonds, stereocentres, racemates, "1,2 (ortho-like)", "cis stays cis". Step 3 says bond C1 and C4 to the two dienophile carbons but not which goes to which; that is only settled in step 5 by the opaque "1,2 product" rule. The worked drawing is about 40 px per structure at 400px with no atom mapping. The card says "Not in a lesson", yet past-paper item B3.1.9 links "Lesson 11, step 10", which teaches diene planarity, and the L11 file header says Diels-Alder is not covered. Fix: add a numbered, colour-mapped worked drawing and define the terms; relink B3.1.9 honestly or add a short lesson.
20. **Past papers: no exam drawings, thin links.** Every item (svgs=0) restates the question in words only. A1.3 "Name six drawn compounds" has no link to the naming lessons for step 1 (only L7 s14, L15 s16/s20). A2.2 never tells you how to compare two long arms on a carbon or that skeletal drawings hide H. B6.2 step 4 "NBS twice, then water" is unexplained and does not link the benzylic bromination card; "the big SO3H goes para" never says what "big" means. Fix: show one example structure per item, add the missing links.

**P3**

21. **Hub navigation.** 38 cards in one list (about 33,000 px tall at 400px); the three filter groups fill the first screen before any card; no text search (cannot find "PCC"); card order starts with Aromatics although the course starts with alkenes; filter labels "Syn / Anti / Either face / No stereo" are undefined. Br2/FeBr3 step 4 says "go to the director cards" but the cards are titled "Ring already has an activator..." and there is no link. HBr step 1 "count the alkyl groups on each carbon" does not say a ring neighbour counts. Fix: search box, jump list by topic, and the missing links.
22. **Drill feedback can be a wall of jargon, and does not link back.** Q1 (nitrobenzene + SO3, H2SO4, option A wrong) returns about 120 words: ortho, para, meta director, delta+, carbocation, deactivates. Correct-answer text for nitration reuses a generic line ("The new group (Br, NO2, ...) replaces one ring H"). No wrong answer links to the reagent's hub card or lesson. A session is 3 problems ("Problem 1 of 3"). Fix: lead with a one-line rule ("NO2 is a meta director, so the new group goes meta"), put the long reason behind "why?", add "see the card for SO3, H2SO4".
23. **Home "Weak spots" shows out-of-context sentences.** E.g. "Cyclohexene has a ring and gives cyclohexanol. The target is a chain of five carbons." with no question. Empty "Check" presses are logged as slips ("Draw at least one arrow..." counted under Reaction mechanisms), inflating the counts. Fix: do not log empty checks; show the skill and the question stem, not a stranded explanation.
24. **Encoding: no charset in index.html.** The step-pill check mark (CSS `content: ' ✓'`) and "Loading 3D model..." render as mojibake ("a-circumflex" garbage) when served as plain text/html, as in this local test. Probably fine in the published artifact; verify there, or switch to CSS escapes (`\2713`, `\2026`).
25. **Small items.** L1 s02 "1s2 2s2 2p2" is never taught (shell only in hint 1). L1 s15 pictures do not draw the lone pair; the caption carries it. L3 s04 calls NH2- "amide ion", which clashes with the amide functional group later. L2 s13 and L13 s02 use pm and kJ/mol that are never defined. Image-only options (L9 s16/s17) have empty accessible names.

## (c) Terms used before they are defined (or never defined)

"Defined" means plain-words definition on screen. Reveals appear only after you answer.

| Term | First appears | Defined where |
|---|---|---|
| 1s2 2s2 2p2, shell | L1 s02 prompt | only in L1 s02 hint 1 (wrong-answer ladder) |
| periodic table / group number | L1 s03 hint | never shown |
| atomic numbers (1, 6, 7, 8, 9, 17 on the cells) | L1 s03 | never labelled |
| hydronium | L1 s12 prompt | never (just a name) |
| formal charge | L1 s12 | worked example only; never says what it is or why it matters |
| ion, cation, anion | L1 mastery (H3O+); L3 | never defined as words |
| carbanion | L1 s15 feedback | never |
| skeletal (drawings) | L1 mastery hint | L4 s01/s02 |
| tetrahedron | L1 s08 reveal | glossed "triangular pyramid"; L2 s01 gloss |
| orbital, 2s/2p, hybrid orbitals | L2 s01 reveal | parenthetical gloss only, never drawn in L2 |
| sp3 / sp2 / sp | L2 s01 reveal | counting rule 4/3/2 groups only at L2 s12 (worked) |
| head-on / sideways overlap, sigma, pi | L2 s02, s05 | defined in words, no picture |
| electronegativity, Pauling scale | L2 s14 reveal | EN defined; "Pauling" never |
| delta+ / delta- | L2 s15 explain | defined (explain) |
| Li, Mg electronegativity | L2 s17 (needed) | only in wrong-answer text |
| inductive effect | L2 s18 | defined (explain); reused L9 s06 |
| pm, kJ/mol | L2 s13 reveal | never |
| nitrile, acrylonitrile | L2 s12 | inline "(the nitrile carbon)" only |
| Bronsted-Lowry acid/base | L3 s01 reveal | defined (reveal) |
| equilibrium, double arrow | L3 s03 | never |
| Ka, log | L3 s05 reveal, s06 | Ka named; log never explained |
| amide ion | L3 s04 | named; clashes with amide later |
| nucleophile / electrophile | L8 s05 / s06 prompt | glossed in prompt; formal definition L8 s07 |
| homolytic, heterolytic, radical, polar reaction, fishhook | L8 s03 reveal | defined in the reveal, after the question |
| isomer | L8 s01 option | L5 s01 |
| catalyst | L8 s02 ("acid catalyst") | L8 s14 reveal |
| carbocation | L1 s15 | inline "a carbon with a + formal charge" |
| transition state, reaction intermediate | L8 s10 feedback, s11 prompt | inline in the s11 prompt |
| Eact, delta-H, rate-determining step | L8 s12 prompt | inline in the prompt |
| Markovnikov, regiospecific | L9 lesson title (home screen) | L9 s01 reveal |
| 3 deg / 2 deg / 1 deg cation, "more substituted" | L9 s04 | L5 (for carbons); "C+ bonded to three carbons" only at L9 s15 |
| oxonium | L9 s11 prompt | inline gloss |
| solvent | L9 s11 why-line, s12 option | never |
| Kekule | L13 s03 prompt | glossed inline |
| aromatic, hybrid, resonance, aryl (Ar-) | L13 s04 | one paragraph; resonance proper is L11 s03 |
| Lewis acid | Hub Br2 card step 1; L13 s06 | L3 s16 |
| FeBr3 as catalyst | L13 s01 reveal | its job is explained at L13 s06 |
| conjugated diene, dienophile, electron-withdrawing group, stereocentre, racemate, "1,2 (ortho-like)" | Hub Diels-Alder card; B3.1.9 | never (not in any lesson) |
| NBS, "big" SO3H (blocking group) | Past paper B6.2 | hub card for NBS exists but is not linked; "big" never |

## (d) What worked well

- Per-option feedback: every wrong choice has its own reason ("That's oxygen's usual number"), not a generic "incorrect".
- Arrow-drawing widgets: they name the mistake precisely ("starts in the right place, but it points onto C. The electrons need to end up onto Cl"; "Cl is not moving in this reaction"), and ask "which carbon bonds to H?" as a chooser (L9 s11).
- Hint ladder: hint 1, hint 2, then a worked answer after the third miss (L1 s02, s03, s13 and others), always short.
- Worked-example steps (L2 s12, L8 s08 "three students each broke a rule", L9 s15) teach decisions one at a time.
- Good pictures: L9 s06 empty p orbital, L8 s11/s12 labelled energy diagrams with inline definitions, L1 s06 tap-the-atom Lewis builder, L1 s15 structures with captions.
- Mastery feedback diagnoses the cause ("You forgot the charge. A positive ion has lost 1 electron.").
- Drill feedback names the slip type (WHAT adds / WHERE it adds / IN SPACE), gives a concrete sentence and a worked answer after three misses; it also reveals Pd/C over-reduction cleanly (Q8).
- Hub and past-paper "Trap:" lines and the three-facts layout; Br2/FeBr3 and HBr cards are followable with pen and paper in 3-5 lines.
- Layout: no horizontal overflow at 400px on home, hub, lessons, drill, past papers; hub deep links (`#reactions/diels-alder`, `#lesson-13/s06`) all land correctly.

## Appendix: per-step verdicts (yes = answerable from what was taught; guessed; no)

L1: s01 guessed; s02 guessed (6 or 4); s03 **no** (no table); s04 explain; s05 yes (s04 says O has 2); s06 yes; s07 yes; s08 guessed (3D, tiny); s09 yes; s10 yes; s11 yes if s03 learned; s12 yes (worked, formal charge never defined); s13 yes; s14 yes; s15 yes (caption gives counts); s16 yes; s17 yes; mastery **no** for ions; use-it lists book problem numbers only.
L2: s01 guessed; s02 explain (no picture); s03 guessed or yes by rotating; s04 yes (tiny highlight); s05 explain (no picture); s06 yes; s07 yes; s08 yes; s09 yes; s10 guessed (107 / 104.5); s11 yes; s12 yes (worked); s13 guessed; s14 guessed; s15 explain; s16 yes; s17 **no/guessed** (Li); s18 explain; mastery yes.
L3 (1-8): s01 guessed (deducible from H2O to H3O+); s02 explain; s03 yes; s04 yes; s05 guessed; s06 **no** (log); s07 yes (via s05 reveal); s08 yes (worked, rule asserted).
L8: s01 yes; s02 yes (worked); s03 **guessed** (notation); s04 yes (needs L2 EN); s05 yes (lone pairs not drawn); s06 yes; s07 explain; s08 yes (worked); s09 yes (from s07+s08); s10 yes with hint 1 (second arrow taught only in s09 reveal); s11 yes; s12 yes; s13 guessed/yes; s14 guessed (long option); s15 yes; s16 yes; s17 player; mastery yes.
L9: s01 guessed; s02 yes (rule just revealed); s03 guessed (by design); s04 explain; s05 yes (needs L2); s06 explain (good picture); s07 guessed/yes (long option); s08 yes with hints; s09 yes; s10 yes (rule); s11 needs hints (3 steps, tangled drawing); s12 guessed/yes (long option); s13 explain; s14 yes; s15 yes; s16, s17 yes with hints; s18 lab; mastery yes.
L13 (1-8): s01 **no** (question truncated); s02 guessed (longest option); s03 yes with hint; s04 explain (dense); s05 guessed/yes (longest option); s06 yes only by copying the prompt; s07 yes with hint (needs L11 resonance); s08 copy task.
