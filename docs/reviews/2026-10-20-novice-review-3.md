# Novice review 3 (2026-10-20): Lesson 17, reaction modes, stereo drill, naming customizer, mock

Reviewer role: weak-chemistry student, Lessons 1-16 done once. Snapshot `snap3/learn` served on :8781, then stopped. Lesson 17 was played at 400px for steps 1-10 and on the mock, desktop elsewhere. No course files were edited.
Notes on method: Lesson 17 renders **66** steps, not 64 (64 question/explain steps + mastery + "Use it"). I viewed every drawing by eye; where a drawing was too small to read I extracted the SVG geometry and worked the CIP letters by hand (all eight stereo-drill problems agreed with the site's own answer).

---

## (a) Grades (1 = poor, 5 = excellent)

| Area | Grade | One-line reason |
|---|---|---|
| Lesson 17 | 4 | Strong "predict first" design and mostly answerable; loses a point for retry-inflated mastery, ~8 repeat steps, first-seen reagents not flagged, unreadable stereo drawings |
| Reactions: Which reagent? | 3 | Feedback is accurate but many items are solvable by spotting one element (S, N, Br) with no chemistry |
| Reactions: Which starting material? | 4 | Wrong answers name the product you would get; correct answers only restate formulas |
| Reactions: What stereochemistry forms? | 4 | Best feedback of the five (names "no stereocentre", "mirror-image centres"); options mix cis/trans with racemic/meso for acyclic products |
| Reactions: Two-step roadmap | 3 | One misleading explanation, generic hint on a directing-order puzzle, set repeated the same alkyne to epoxide idea |
| Reactions: Which one will not work? | 3 | One false chemistry statement (chlorobenzene) that also contradicts a hub card |
| Stereo-projection drill | 4 | All 8 pairs unambiguous and the answers were correct; small Newman/ring drawings and wall-of-text feedback |
| Naming customizer | 4 | Filters work, impossible combinations explain themselves, systematic forms accepted; ring "cyclopent-1-ene" rejected with a wrong hint |
| Mock midterm | 4 | Timer, resume, confirm dialog and marked script are excellent; two numbering schemes, repeated items, odd weighted retake |

---

## (b) Findings (prioritised, 20)

### High

1. **Retrying scores as "correct" everywhere.** Location: Lesson 17 labs S19, S30, S34, S44 ("Three right"); mastery S65; every reaction mode end screen. What happened: S19 I got the cyclopentene + KMnO4/OH- diol wrong, clicked the next option, and the lab announced "Three right". S65 problem 4 I picked the alkene first, then the alkane, and got "All 5 correct. Mastery check passed." Every mode ended "All 3 correct. Mastery check passed." although I had missed the first try on every problem. Why it matters: "mastery" and the praise ("Each time you named what adds...") are true of nobody; elimination passes the gate and the weak-spot log may not see the miss. Fix: score first attempt only and show "2/3 first try"; keep the retry for learning but not for the gate.

2. **CHEMISTRY plus hub contradiction: chlorobenzene in "Which one will not work?"** Location: `#practise-wont-work`, Friedel-Crafts acylation set; hub card "RCl, AlCl3 (Friedel-Crafts alkylation)". What happened: I picked chlorobenzene as the one that fails. Feedback: "This one does work: this ring is at least as reactive as benzene, so the acylium ion attacks it". That is false (halobenzenes are less reactive than benzene; Lesson 17 S56 says so itself). Meanwhile the hub's FC alkylation card asks "Why does the same reaction fail on chlorobenzene or nitrobenzene?", while its own steps list only NO2, C≡N, SO3H, COR as the failing rings. Why it matters: three places teach three different things about halobenzenes. Fix: say "works, slower than benzene; fails only on rings as deactivated as NO2/CN/SO3H/COR", and change the hub question to "nitrobenzene or acetophenone".

3. **Naming checker rejects the "-1-ene" ring form, with an unrelated hint.** Location: `#practise-naming-levels`, Level 3 and a custom cycloalkene set. Typed "1-methylcyclopent-1-ene" for 1-methylcyclopentene, and "3-(propan-2-yl)cyclopent-1-ene" for the isopropyl one. Both marked wrong with "Number the ring so that the double bond is C1=C2, then choose the direction..." (the numbering was right). "1-methylcyclopentene" and "3-(propan-2-yl)cyclopentene" were accepted. The stem says "either style is accepted". Why it matters: the card teaches hex-2-ene style for chains, so a student who uses the same style for rings is told their numbering is wrong. Fix: accept an optional "-1-ene" locant, or say "ring alkenes: no locant for the double bond".

4. **Stereo drawings with wedges on the chain ends cannot be read by a novice.** Location: S12 ((E)-but-2-ene + Br2), S13, S62, `#practise-guess-reagent` problem 1 (E-but-2-ene to diol). What happened: Br/OH are drawn plain and only the two terminal CH3 groups are wedged. Wrong-answer feedback then says "this product shows two OH on the same face (syn)", which cannot be seen from the picture. I could not tell meso from racemic by eye, and I misread E/Z of a zig-zag alkene once (`#practise-stereo-outcome` problem 1, double bond at the bottom of the chain; I got it right by luck). Why it matters: the whole point of Q3 is "same face or opposite", but the drawing hides it. Fix: wedge/dash the new Br/OH, or add a one-line "how to read this drawing" step before S12, or use Fischer/ring depictions for these cases.

5. **First-seen reagents and topics are not flagged, so "predict first" is a guess.** Could not answer from Lessons 8-14 plus the three questions (grep of lessons 1-16 confirms none of these appear before 17): S48 NBS; S49 Zn(Hg)/HCl (stem never says Clemmensen; feedback does); S50 and S60 Birch (S50 offers four near-identical cyclohexadiene-carboxylic acids at ~60px); S53, S54, S57 PCC and Na2Cr2O7 (never taught); S61 Diels-Alder regiochemistry ("A 1-substituted diene gives the 1,2 product", no why); S33 acrolein/dienophile. Also S43 (amine protonated in HNO3/H2SO4) is not in Lesson 13/14, and S22 (gem-dihalide) needs the Cl lone-pair idea which the Q2 box never mentions (it is in L12). Why it matters: a student cannot "act first" on these; the first wrong answer teaches by being wrong. Fix: tag these steps "New reagent: guess, then learn" or add a 1-line explain before each.

### Medium

6. **KMnO4 conditions are under-specified and mis-labelled.** Location: S15, S19, S18, hub. S15 stem "KMnO4, OH-, H2O" has no "cold/dilute", and the diacid option is plausible. Feedback: "The C=C is cut here, and that is KMnO4 in ACID. In base the C-C bond stays" (CHEMISTRY: hot basic permanganate also cleaves; the real switch is temperature/strength). Step cards are called "cold KMnO4" and "hot KMnO4" but the hub titles are "KMnO4, OH-, H2O" and "KMnO4, H3O+". Fix: add "cold, dilute" to S15/S19, or teach acid/base consistently and drop hot/cold from the card labels.

7. **Two-step mode: misleading explanation and generic hint.** `#practise-two-step`, problem 2 (pent-1-yne to pentane-1,2-diol): wrong feedback "The peroxyacid first would not give the cis alkene that the epoxide route needs". The product has no cis/trans. Problem 3 (4-chlorotoluene to bromochlorobenzoic acid): feedback "the final positions come out different" with no positions, and Hint 1 "which of the two reagents has to come first for the second one to have something to act on?" does not fit a directing-order puzzle. Fix: per-puzzle explanation (which group directs where in each order).

8. **Repeated and recycled items.** S65 mastery problem 2 is S29 (hex-1-yne BH3) and problem 3 is S53 (1-phenylbutane-1,4-diol PCC) verbatim, so "generated fresh" is not; the mock paper had methylenecyclohexane + RCO3H/H3O+ twice (7b and 9a) and the S53 diol again (7a); `#practise-stereo-outcome` gave hept-1-ene + Br2 then pent-1-ene + Br2 back to back; two-step set 2 was three Lindlar-first puzzles. S64 repeats S23; S27 is trivial. Fix: de-dupe against the last N items shown and against the lesson's own steps.

9. **Weighted retake moved marks away from what I had just missed.** Marked script, "Retake weighted to my weak spots". Blueprint before: A1 2, A2 3, A3 2, B3 4, B4 2 (total 17). After: A1 1, A2 2, A3 1, B3 6, B4 3 (total 17). I lost marks in A1, A2, A3, B4, B6 and scored 12/12 in B3, yet B3 grew. The script page says the retake "puts more of its questions on those skills". Probably the log is dominated by earlier misses (Lesson 17, modes). Also the retake starts a 45-minute clock immediately with no preview. Fix: weight this paper's misses first, show "extra from: ..." before Start.

10. **Lesson 17 drags in about 8 places.** S2, S5, S8 restate the "rule" box that has just been shown at the end of S1, S4, S7 (three explain steps could be removed); S20/S31/S45 summaries repeat the per-step "Kind of product" lines; S56 and S58 (Exceptions 2 and 4) repeat S42 and S43; S57's stem states the answer ("PCC stops at the aldehyde"); S27 is trivial. S62-S64 are called "Exam pattern: Write the structure..." but are multiple choice. Fix: fold S2/5/8 into the worked step; make exceptions delayed retrieval rather than same-session repeats.

11. **Option position and length bias.** Worked steps S1, S4, S7: the correct option is first in every sub-question (every one of the roughly 12 sub-questions). Exception S58: the correct option is the longest and first; S55 and S59 first. Fix: shuffle and equalise length.

12. **Image options are unnamed for screen readers.** Option buttons carry only "Structure, formula C5H11Cl" (two isomers identical); mastery, mock and modes use "Option A-D" with no label; S57 alone has real names ("butanal"). Fix: add generated names (the engine already has them for S57).

13. **Mock numbering and phrasing.** Three schemes at once: headings "QUESTION 1-9", chips A1/A2/A3/A5/B1/B2/B3/B4/B6 (A4 and B5 absent), and "16 of 17 questions answered" (parts). Section A5 preamble gives away the answer ("The new C-Br carbon is a stereocentre, so the product is a racemic pair") and several preambles say "The workbook asks you to draw; here you pick the drawing that matches yours". Fix: one numbering, drop meta text, keep the stem exam-like.

14. **Last step is a dead end.** S66 "Now do these from the book" then "Now do the Reactions drill and the past-paper B3 items": no links to `#reactions-practice` or `#pastpaper`; "Mark lesson complete" returns to Home. Fix: add the two links (and the mock).

15. **Glossary lacks Lesson 17's new words.** 71 terms; missing: epoxide, allylic, benzylic, geminal, vinylic, nitronium, Clemmensen, Birch, NBS, PCC, desulfonation. Fix: add one-sentence definitions.

### Low

16. **Naming card layout and wording.** After Start the Settings card stays open and pushes the question below the fold (collapse by hand). Level 1 text says "up to C8" but the chip shows "Up to C10". Summary line omits substituents/complex-group/style filters. Worked steps skip numbers ("1, 2, 5 Stereo" with 3 and 4 missing). The impossible-combination notice is only shown after Start.

17. **Stereo drill wording and feedback.** Fischer lactic acid problem says "show the same molecule" but the answer is enantiomers. Ring CIP strings are written as unrolled chains ("CH(Br)CH2CH2CH2CH2 > CH2CH2CH2CH2CHBr") and the first problem ends with a dangling "trans/cis.". Name-vs-Fischer numbering runs bottom to top. Newman/Fischer pairs were otherwise clear.

18. **"Major product" with para-only distractors.** S40 (anisole) and S42 (bromobenzene) mark "para only" wrong; for bromobenzene para is the actual major isomer, and S44's wrong feedback admits "Para forms, but so does ortho". S38 says (CH3)3CCl "puts on only one" tert-butyl (needs "benzene in excess"). Fix: word as "which products form", or state stoichiometry.

19. **At 400px the top of each step is eaten.** Step 1's "Before you start" card plus four links fills two screens before Q1; from step 2 on the "Last step" recap sits above each new question; four drawing options plus Continue need about two screens. Fix: collapse the recap by default on narrow screens.

20. **Small wording items.** S34 labels a single-product result "1,2- and 1,4-addition"; S19 "Why" repeats the "Yes." line verbatim; Birch, desulfonation and para-isomer drawings are ~60px at 800px; reaction modes end with only "Back to home" (a new set needs a reload of the route).

---

## (c) CHEMISTRY items (quoted)

- `#practise-wont-work`: "This one does work: this ring is at least as reactive as benzene" (said of chlorobenzene in FC acylation). Wrong; chlorobenzene is less reactive, it still reacts. Also hub: "Why does the same reaction fail on chlorobenzene or nitrobenzene?"
- S15: "The C=C is cut here, and that is KMnO₄ in ACID. In base the C–C bond stays." Oversimplified; hot, concentrated basic KMnO4 also cleaves.
- S58: "with HNO₃ in H₂SO₄ the NO₂ goes mostly meta" (aniline). Mixed-acid nitration gives roughly half meta and half para; "mostly meta" is a textbook simplification.
- S44: phenol + Br₂, FeBr₃ "Major products (a mixture, assumed separable): 4-bromophenol and 2-bromophenol". Phenol brominates without FeBr3 and over-brominates; fine as a exam shorthand but not real.
- S29: "BH₃" on a terminal alkyne would double-hydroborate; the hub card correctly adds "or disiamylborane".
- Two-step problem 2: "The peroxyacid first would not give the cis alkene that the epoxide route needs" (the target has no cis/trans).
- Not wrong, verified: S43 (N,N,4-trimethylaniline to the nitro group ortho to CH3), all eight stereo-drill pairs, S12/S13/S17/S62 stereo outcomes, E/Z of the alkyne bromination results.

---

## (d) Three things that worked best

1. **Wrong-answer feedback that names the misconception and the product you actually drew.** Examples: S3 ("Br₂ does react..."), S17 (cis OH: "H and OH add to the same face, so the OH ends up trans to the CH₃"), S25 enol, S29 hexan-1-ol ("adds two extra H atoms"), S43/S60/S61 with the specific reason, stereo-outcome ("no carbon with four different groups"), and the stereo drill ("This answer is what you get if the stereocentre in drawing A is read as R instead of S").
2. **The mock from clock to marked script.** The 45:00 clock survives a reload (43:08 became 43:00 across it), answers and section were restored, the submit dialog says "16 of 17 answered; 1 will score 0", and the script gives 32/46 with per-section bars, "What you missed", "The rule", "Worked answer", "Lesson 11, step 1", "Practise: ...", plus "Show only the 5 I missed".
3. **Naming customizer self-explanation.** Alkane + E/Z: "These settings cannot all be met... (Alkane cannot have E/Z in its name). I relaxed the closest one"; one substituent + complex group + halogen explained the same way. Systematic forms were accepted with a note ("Accepted: systematic form (1-methylethyl)", "(1,1-dimethylethyl)"), wrong locants get "on C4, not C3", and the full parent/numbering/branches rubric follows each answer.
