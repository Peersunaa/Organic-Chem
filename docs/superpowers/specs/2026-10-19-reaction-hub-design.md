# Orgo Learn: Reaction Hub, Mixed Product Drill, Past-Paper Walkthrough

Date: 2026-10-19. Midterm: Thursday 2026-10-22. Everything here must be live by Wednesday night 2026-10-21.

## Intent and why

Peera can pass each reaction lesson (8–14) by clicking the right option without owning the content. The facts for ~25 reagents are spread across seven lessons in textbook order, so they are never seen side by side, and the exam question is almost always "substrate + reagent → product with stereochemistry". Mechanisms are where Peera first gets lost (Lesson 8), so mechanism is the *why* that supports recall, not the goal.

The deliverable is a change **inside the existing Orgo Learn app** (`learn/`, published as the same claude.ai artifact). No new site, no new artifact.

## Goals

1. **Reaction hub** (`#reactions` route; a "Reactions" panel on the home screen beside the lesson list). Every in-scope reagent is one card, grouped by substrate (alkenes, dienes, alkynes, aromatics). Every card has the same four parts in the same order:
   - **What it does**, one sentence.
   - **Worked example**: one substrate → product, product drawn (existing RDKit SVG rendering), stereochemistry shown when it matters.
   - **Three facts**: what adds · where it adds (Markovnikov / anti-Markovnikov / ortho-para / meta / 1,2 vs 1,4) · how it adds in space (syn / anti / either / n.a.).
   - **When the question looks like this**: the exam phrasing (one or two patterns, in the workbook's wording style) followed by numbered steps to answer it. This is the "how to apply" box.
   - Links: "Lesson N, step k" (deep link into the existing lesson player) and "See the mechanism" (same link, to the lesson's mechanism step, when one exists).
   - Filters: by substrate; by "what gives syn / anti"; by "what adds OH / Br / H".
2. **Mixed predict-the-product drill** (`#practise-predict-product`, also surfaced from the hub and the home weak-spot panel). Random in-scope substrate × random in-scope reagent, cross-lesson. Learner picks the product among 3–4 drawn options that differ by regiochemistry or stereochemistry. A wrong pick is diagnosed by which of the three facts was missed. Answers are generated and checked with the existing engine where it already models the reaction (`engine/reactions*.js`, `synthesis.js`) and cross-checked against RDKit in the test suite like every other generator. Logged to the existing mistake log under a new skill tag so it feeds weak spots.
3. **Past-paper walkthrough** (`#pastpaper` route, Wednesday if time allows): the in-scope workbook questions (sections A1, A2, A3, A5-HBr-only, B1, B2, B3, B4, B6 of `study-guide/past-paper-workbook.pdf`; text in `past-paper-workbook.txt`), each rendered with the question, the same "steps to answer" structure as the hub cards, and a link to the lesson. No copying of long question text verbatim beyond what is needed to identify the question; paraphrase.

4. **Polish pass** on the new screens only (hub, drill, walkthrough) using the `impeccable` skill, after they work, so they do not read as bolted on. Whole-app redesign is a separate post-midterm task.

## Non-goals (after the midterm)

Press-to-step mechanism player, 3D toggles on stereo steps, "what if a different reagent" branching, video-style animation, naming and isomer-relationship drills, SN2, NMR, radicals, multi-step synthesis.

## Anti-goals

- A hub that is a wall of text. Each card must fit one phone screen (400px wide) with the example drawn.
- Cards that disagree with the lessons. Every reagent fact on a card is verified against the lesson it links to and against RDKit where a product is drawn.
- Breaking the current lesson flow or the existing test suite.

## Constraints

- Stack and conventions in `learn/LEARN-SPEC.md`: ES modules, no build step, Artifact page contract (dark mode tokens, 400px width, no alert/confirm, storage in try/catch).
- Tests: `node learn/tests/run.mjs` must end with 0 failed before any publish. New generators get RDKit cross-checks in the same style as `tests/lesson16.mjs`.
- Scope of chemistry = McMurry *Fundamentals of Organic Chemistry* Ch 4–5 as taught in Lessons 8–14, filtered by the midterm coverage above. Do not add reactions the lessons do not teach.
- Beginner voice, short sentences, every step answerable from what was taught.
- Publishing is done by the orchestrating session, not the builder.

## Decided

- **Reagent list (hub cards).** Alkenes: HBr/HCl (Markovnikov), Br2 and Cl2 (anti), Br2/H2O halohydrin (Markovnikov OH, anti), H2O/H+ hydration (Markovnikov), BH3 then H2O2/NaOH (anti-Markovnikov, syn), H2/Pd (syn), OsO4 or cold KMnO4 (syn diol), O3 then Zn or (CH3)2S (cleavage), peroxyacid (epoxide, syn). Dienes: HBr 1,2 vs 1,4 (kinetic vs thermodynamic), Diels–Alder (diene + dienophile, cis retained). Alkynes: HX once and twice (Markovnikov, gem-dihalide), X2 once and twice, H2O/HgSO4/H2SO4 (Markovnikov enol → ketone), H2/Lindlar (cis alkene), Na/NH3 (trans alkene), H2/Pd (alkane). Aromatics: Br2/FeBr3, HNO3/H2SO4, SO3/H2SO4, Friedel–Crafts alkylation and acylation (with the limits taught), KMnO4 side-chain oxidation, reductions taught in Lessons 13–14 (nitro → amine; acyl → alkyl), plus the director table (activating o/p, deactivating meta, halogens deactivating o/p). The builder trims any reagent that the lessons do not actually teach and says so in the report.
- **Card data lives in one new module** `engine/reaction-hub.js` as plain data (id, group, reagent label, what, example {substrate smiles, product smiles}, facts {adds, where, space}, apply {pattern, steps[]}, lesson {id, step}). The hub view and the drill both read it, so a fact exists once.
- **Drill answer checking** reuses existing reaction engines; where a reagent has no engine model, that reagent is included in the hub but excluded from the drill (list them in the report).
- **Visual style** matches existing panels and cards (`.panel`, `.card`, `.chip`); no new fonts or colours.

## Calls made after the builder check (orchestrator's decisions)

- **Priority under the deadline.** Hub first, then drill, then walkthrough. Within the hub, build cards complete (all four parts) rather than all cards shallow, in this order of midterm weight: aromatics (EAS, Friedel–Crafts, directors, reductions; workbook B3, B4, B6), alkene additions and their stereocontrol (A5 HBr, B6), alkynes (B3), dienes last. If time runs out, dienes may ship as hub cards without drill coverage.
- **Diels–Alder, 1,2 vs 1,4 addition, aromatic reductions.** Lesson 11 and `engine/reactions-dienes.js` already cover Diels–Alder and kinetic vs thermodynamic addition; Lesson 13 and `engine/reactions-aromatic.js` cover the reductions. They are in scope. Where coverage in the lesson is thin, the card is the teaching and says "short version; the lesson goes deeper".
- **Reagents without an engine model** (hydroboration, OsO4, halohydrin, epoxidation, ozonolysis beyond `cleavageEnds`): hand-authored example SMILES, validated in tests by RDKit parse plus stereo-centre and E/Z checks, and reviewed for chemistry by the orchestrator before publish. That is sufficient; no independent engine is built for them before the midterm. They are hub-only unless the drill can check them with a fixed answer set (fixed-answer questions are allowed for these, drawn from the card's example and one or two variants).
- **Deep links.** Add a `#lesson-NN/sK` form to the router that opens lesson NN at step K even if unreached. It sets the current index without marking earlier steps done, so lesson progress is not faked. The existing "back only to done steps" rule is unchanged for normal navigation.

## Left to the builder

Card layout details within the four-part structure; filter UI; how many drill options per question (3 or 4); how substrate variety is sampled; exact copy of the "steps to answer" boxes (must be checked by the orchestrator for chemistry); whether the walkthrough stores progress.
