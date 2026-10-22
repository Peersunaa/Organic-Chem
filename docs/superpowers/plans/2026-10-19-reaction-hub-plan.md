# Plan: Reaction hub, product drill, past-paper walkthrough (approved 2026-10-19)

Design: `../specs/2026-10-19-reaction-hub-design.md`. Deadline: live by Wed 2026-10-21 night. Each piece: Sonnet builder agent → orchestrator checks chemistry → `node learn/tests/run.mjs` 0 failed → publish to the Orgo Learn artifact → commit on `claude/test-6obca7`.

## Piece 1 — Reaction hub (Mon–Tue)
Files: `learn/engine/reaction-hub.js` (data), `learn/engine/widgets/reaction-hub.js` or a view in `app.js` (route `#reactions`), home-screen "Reactions" panel, router form `#lesson-NN/sK`, CSS in `index.html`, tests `learn/tests/hub.mjs` wired into `run.mjs`.
Done when: every in-scope reagent is a card with the four parts; filters work; every example product SMILES parses in RDKit with the expected stereocentres/E–Z; every lesson link resolves to a real step id; tests pass; renders at 400px.

## Piece 2 — Mixed predict-the-product drill (Tue)
Files: `learn/engine/generators-predict.js` registered as `predict-product`, skill tag `predict-product` in `engine/skills.js`, route `#practise-predict-product`, tests cross-checking engine products vs RDKit.
Done when: 200 generated problems all verified; each wrong option maps to a diagnosis (adds / where / space); logged to mistakes.

## Piece 3 — Past-paper walkthrough (Wed, if time)
Files: `learn/data/pastpaper.js` (paraphrased in-scope questions + steps), route `#pastpaper`.
Done when: all in-scope workbook questions listed by section with steps and lesson links.

## Piece 4 — Polish pass (Wed)
`impeccable` skill on the three new screens only. Then final publish + commit.
