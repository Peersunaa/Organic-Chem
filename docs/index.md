# Orgo Learn docs index

One line per page. A fresh session should read this first, then the page it needs.

## What the course is
- `learn/LEARN-SPEC.md`: the app contract: lesson/step schema, widgets, generators, tests, Artifact page rules. Read before touching `learn/`.
- `learn/README` (none): the course is 16 lessons (McMurry *Fundamentals of Organic Chemistry* Ch 1–6) plus a reaction hub, a mixed drill, a past-paper walkthrough, a mechanism step player, caveman mode and 3D stereo moments. Published as one claude.ai Artifact; `learn/index.html` is the page, everything else a supporting file.

## Decisions (specs)
- `superpowers/specs/2026-10-19-reaction-hub-design.md`: why the reaction hub, drill and walkthrough exist; midterm scope by workbook section; what was deferred.
- `superpowers/specs/2026-10-20-mechanism-player-design.md`: press-to-step player with per-arrow why lines, what-if branching, caveman mode, 3D stereo toggle; parallel build plan.

## Plans and briefs
- `superpowers/plans/2026-10-19-reaction-hub-plan.md`: the four-piece plan for the hub work and its done criteria.
- `superpowers/plans/2026-10-19-hub-cards-b3.md`: the ten exam reactions the book skips, with verified SMILES and facts (Diels–Alder, Clemmensen, Birch, hydroborations, benzylic bromination, oxidations, amine in acid, desulfonation).

## Recurring facts
- Tests: `node learn/tests/run.mjs` from the repo root (Python 3.13 + rdkit + py2opsin, Java 21 on PATH); must end `0 failed` before any publish. About 6–7 minutes.
- Midterm scope (2026-10-22): workbook sections A1, A2, A3, A5 (HBr only), B1, B2, B3, B4, B6. Out: A4 radicals, B5 NMR, SN2, multi-step synthesis.
- `study-guide/past-paper-workbook.pdf` and `.txt` are deliberately untracked (exam papers). Reaction schemes in it are images; extract with pypdf `page.images`.
- Git identity is not configured in this repo: commit with `-c user.name=Peersunaa -c user.email=peera.sunny@gmail.com`.
- Local preview: `python3 -m http.server 8765` from `learn/`; stale module caches happen, verify with a fresh `import('./x.js?v=1')`.

## Backlog (post-midterm)
- Caveman variants for lesson text (only hub, player and drill have them).
- Naming and isomer-relationship drills.
- Whole-app visual redesign in its own session (impeccable skill + a reference site Peera names).
