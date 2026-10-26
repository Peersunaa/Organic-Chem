# Orgo Learn docs index

One line per page. A fresh session should read this first, then the page it needs.

## What the course is
- `learn/LEARN-SPEC.md`: the app contract: lesson/step schema, widgets, generators, tests, Artifact page rules. Read before touching `learn/`.
- `learn/README` (none): the course is 16 lessons (McMurry *Fundamentals of Organic Chemistry* Ch 1–6) plus a reaction hub, a mixed drill, a past-paper walkthrough, a mechanism step player, caveman mode and 3D stereo moments. Published as one claude.ai Artifact; `learn/index.html` is the page, everything else a supporting file.

## Decisions (specs)
- `superpowers/specs/2026-10-19-reaction-hub-design.md`: why the reaction hub, drill and walkthrough exist; midterm scope by workbook section; what was deferred.
- `superpowers/specs/2026-10-20-mechanism-player-design.md`: press-to-step player with per-arrow why lines, what-if branching, caveman mode, 3D stereo toggle; parallel build plan.

- `superpowers/specs/2026-10-20-redesign-design.md`: the overnight product-grade pass: Track T (novice-proof teaching: glossary, recap cards, shuffled options, content fixes) and Track D (token system, widgets, six isometric chapter figures).

- `scenes/README.md`, `scenes/SCENE-SCHEMA.md`, `scenes/NN-*.md`: the animated mechanism scenes: house style, JSON schema, and 16 storyboards (each ends with its scene JSON, copied verbatim into `learn/scenes/scenes/`).

- `superpowers/specs/2026-10-21-reaction-builder-design.md`: the substrate × reagent builder with the professor's EAS rules (`study-guide/prof/`).
- `superpowers/specs/2026-10-21-mastery-course-design.md`: the question-type mastery course (`#master`), decisions and build plan. BUILT 2026-10-21 (v45-v47): `learn/data/question-types.js` (40 types in 5 groups, ladder order, `LIVE_STAGE`), `learn/engine/master.js` (streaks under `ui.master.<id>`, 5 in a row = mastered), `learn/master-view.js`, seeds in `learn/data/question-type-seeds.js` (regenerate with `node learn/tools/pick_master_seeds.mjs`), `tests/master.mjs` + `tests/resonance-rank.mjs`; generators gained a `tasks` option (`engine/task-list.js`) and two task families: `resonance` `rank` (`engine/resonance-rank.js`, three McMurry rules) and `skeletal-fg` `convert` (`skeletal.js condensedOf`). PDF catalogue `study-guide/question-type-catalogue.pdf` (untracked; `python3 study-guide/build_catalogue.py`).

## Reviews
- `reviews/2026-10-20-novice-review.md`: first zero-background student test (grades 2.5–4) that drove Track T.
- `reviews/2026-10-20-novice-review-2.md`: the re-test after the fixes.
- `reviews/2026-10-20-novice-review-3.md`: Lesson 17, the reaction modes, drills and the mock; drove fix waves T3a/T3b.
- `reviews/2026-10-21-master-review.md`: student test of the mastery course (`#master`) on a git-archive snapshot of v47.
- `reviews/d1-*.png`, `d2-*.png`, `w-*.png`: before/after screenshots of the design waves.

## Plans and briefs
- `superpowers/plans/2026-10-19-reaction-hub-plan.md`: the four-piece plan for the hub work and its done criteria.
- `superpowers/plans/2026-10-19-hub-cards-b3.md`: the ten exam reactions the book skips, with verified SMILES and facts (Diels–Alder, Clemmensen, Birch, hydroborations, benzylic bromination, oxidations, amine in acid, desulfonation).

## Recurring facts
- Tests: `node learn/tests/run.mjs` from the repo root (Python 3.13 + rdkit + py2opsin, Java 21 on PATH); must end `0 failed` before any publish. About 6–7 minutes.
- Midterm scope (2026-10-22): workbook sections A1, A2, A3, A5 (HBr only), B1, B2, B3, B4, B6. Out: A4 radicals, B5 NMR, SN2, multi-step synthesis.
- `study-guide/past-paper-workbook.pdf` and `.txt` are deliberately untracked (exam papers). Reaction schemes in it are images; extract with pypdf `page.images`.
- Git identity is not configured in this repo: commit with `-c user.name=Peersunaa -c user.email=peera.sunny@gmail.com`.
- Local preview: `python3 -m http.server 8765` from `learn/`; stale module caches happen, verify with a fresh `import('./x.js?v=1')`.

## Later additions (2026-10-20/21)
- Lesson 17 Predict the product; `#practise-stereo-projections`; `#practise-naming-levels` with a settings card and systematic name forms; `#reactions-practice` (five modes + settings); `#mock` midterm from `learn/data/mock-blueprint.js`; `#scenes` animated mechanisms (21 incl. Lesson 8 primers; 20 and 21 are hot KMnO₄ on a C=C and a C≡C); caveman voice everywhere; Lesson 8 rebuilt (5/5 on student test); `#build` reaction builder; `#table` reaction tables (+ PDFs); `study-guide/past-paper-study-guide.pdf` (untracked, rebuild with `python3 study-guide/build_guide.py`).
- Chapter 7 piece 2 (2026-10-26, not committed): Lesson 18 Substitution and elimination (30 steps s01-s30, `mechanism-player` SN2 / SN1 / E2, `energy-diagram`, a chair-flip model for the E2 chair rule), generator `halides` (ten task families), recap, 7 glossary terms, the ten halide hub cards link to it; `tests/lesson18.mjs`. Scenes 22-25 (piece 3) hang on s06, s13, s19, s23.

## Backlog (post-midterm)
- Standalone lesson tests 07–14 hit an import cycle (WIDGETS before init) unless steps.js is preloaded; the full runner is fine.
- Scenes: a student test of the 16 scenes; the 22 remaining hub cards have no scene.
- Hub search / jump list; richer drill feedback wording; a figure for chapters 2 and 3 on their lesson pages is placed, the hub shows only ch4/ch5.
- Naming and isomer-relationship drills.
- Visual redesign is done (waves D1–D3, 2026-10-20); next design step would be a reference-driven refinement once Peera names a site he likes.
