# Mastery course: every question type on the midterm, trained to 5-in-a-row

Date: 2026-10-21 (midterm Thu 2026-10-22). Peera's words: "a course where it teaches all kinds of questions; if I'm able to do this I will ace the exam", including book examples/practice from McMurry Ch 1–6. Decisions below came from two rounds of questions.

## Decisions (Peera)
- Shape: **question-type ladder**. One page per question TYPE. Each type page: how to recognise it (exam wording, shapes), the procedure (numbered), what earns each mark (marking-scheme hints), 3 worked examples, then unlimited generated practice.
- Mastery rule: **5 consecutive first-try correct** on generated problems; a miss resets the streak. Progress bar per type, overall bar on the course page.
- Book problems: **numbers mapped to types** (from `analysis/book-problem-map.json` and each lesson's `useIt.book`; numbers only, never book text) listed on the type page to do on paper, **plus generated look-alikes** of the same shape on screen.
- Medium: **web, inside Orgo Learn** at `#master`, plus a **PDF catalogue** (recognise-it + procedure + marking hints per type; no practice) at `study-guide/question-type-catalogue.pdf`.
- Order: **fixed ladder in exam-weight order**, no scheduling.
- Answer-style training: **marking-scheme hints** on every type (what earns each mark: stereo shown, intermediate drawn, one-line why).
- Priority if time runs short: **reactions + stereo types first**, then naming, then bonding/acids, then the new Ch 2/4 types.
- New types that nothing covers yet and must be added (with generators): functional groups + skeletal↔full conversion + H counting (Ch 2); resonance forms, ranking contributors, 1,2 vs 1,4 addition (Ch 4); Lewis acid/base classification + electron pushing on acid-base + formal charge (Ch 1); optical activity / specific rotation reasoning + resolution concepts (Ch 6).

## Type ladder (exam-weight order; ids are stable)
Reactions: predict-product (per reagent family: HX, hydration, X2, H2, KMnO4, epoxide, hydroboration; alkyne set; EAS set), guess-reagent, stereo-outcome, two-step, wont-work, mechanism-arrows (HX addition, EAS), intermediate-name-and-why, energy-diagram, directors-position-and-why, huckel.
Stereo: assign-rs, assign-ez, relationship (incl. Fischer/Newman), meso-or-chiral, count-stereoisomers, draw-enantiomer, optical-activity (new), chair-draw-and-stability, newman-stability.
Naming: name-it (by class), fix-the-name, draw-from-name, substituent-forms.
Bonding/acids: lewis-structure-formal-charge, hybridization-geometry, polarity-bond, pka-side-favoured, conjugate-base-stability, lewis-acid-base (new).
Ch 2/4 new: functional-groups, skeletal-full-convert, resonance-forms, resonance-rank, diene-12-vs-14.

## Build plan (new session)
1. Read `docs/index.md`, this spec, `learn/LEARN-SPEC.md`, `learn/engine/generators.js` (registry), `learn/app.js` (routes), `learn/data/mock-blueprint.js` (sections→generators), `analysis/book-problem-map.json`.
2. `learn/data/question-types.js`: the ladder with, per type: id, title, chapter, weight, recognise, procedure[], marks[] (marking hints), examples[] (3 worked, built from generators with fixed seeds so they are engine-verified), generator id(s) + settings, bookProblems[] (numbers), lessonLinks, hubCards, sceneIds.
3. New generators for the Ch 2/4/1/6 types that have none (functional-groups, skeletal-full-convert, resonance-forms/rank, diene-12-vs-14, lewis-acid-base, optical-activity), RDKit/engine-checked like the others; add skills in `engine/skills.js`, TAXONOMY in `tests/run.mjs`.
4. `learn/master-view.js` + route `#master`: course page (ladder with mastery bars, overall bar), type page (recognise, procedure, marks, worked examples, practice loop with the 5-in-a-row streak stored under `ui.master.<id>`, book-problem list with tick boxes), reuse the practice renderer and first-try logic (`engine/first-try.js`).
5. Home panel "Mastery course"; link each type from the matching lesson's last step and from the mock's marked script.
6. Tests `tests/master.mjs`: every type has all fields, generator exists and yields problems, examples re-derive, book numbers exist in the map, streak logic (5 in a row, reset on miss), marks text non-empty. Full suite 0 failed.
7. PDF catalogue via a build script like `study-guide/build_guide.py` (Chrome headless), A4, one page per type.
8. Student test on a `git archive HEAD` snapshot; fix; publish (Artifact files map from `git diff --name-only <last publish commit> -- learn` plus untracked); commit with `-c user.name=Peersunaa -c user.email=peera.sunny@gmail.com`; push `claude/test-6obca7`.
Ship in priority order: reactions + stereo types first (publish), then naming, then bonding/acids, then the new types.
