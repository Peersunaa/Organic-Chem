# Orgo Learn: product-grade redesign and novice-proof teaching pass

Date: 2026-10-20, overnight. Peera asleep; approved in advance ("put all in", all permissions). Goal in Peera's words: a site that looks like a serious product and lets someone with no or a bad chemistry background understand all six chapters, do the past paper, and get an A.

## Two problems, two tracks

**Track T (teaching).** The novice test (`docs/reviews/2026-10-20-novice-review.md`) lists where a beginner is lost: terms used before they are defined, steps answerable by guessing, pictures not explained before they are needed, feedback that says "wrong" without "why". Fix every finding ranked high; add a glossary layer (tap any term for a one-line definition, defined once, reused everywhere); add a "prerequisite recap" card at the top of every lesson that leans on earlier ones (what you need from Lesson N, with a link); make wrong-answer feedback always name the misconception.

**Track D (design).** Direction: the Geist learning-lab language (dark-first, precise, 4px grid, tight tracking, semantic colour, one concept + one action per screen, attempt before explanation) applied to the existing vanilla ES-module app, not a Next.js rewrite. Crafted figures: for each chapter's anchor concept (bonding/hybridisation, acids-bases, skeletal drawing, conformations/chairs, alkene additions, stereochemistry/R-S), one anatomy-style isometric SVG explainer that shows the mechanism as a physical object (see the `anatomy` skill). Imagery otherwise none: molecules are the imagery. Motion: calm, eased, purposeful; reduced motion respected.

## Done looks like
- Every screen (home, lesson player, every widget, hub, drill, past papers, player, 3D) uses one token set and one type scale; nothing reads as bolted on.
- Lighthouse-style basics: no layout shift on step change, 400px with 16px gutters, dark and light both designed (dark is primary), focus-visible everywhere, 44px targets.
- A second novice test after the fixes scores ≥ 4/5 in every area.
- Full suite 0 failed; published; committed; pushed.

## Skills to use
`impeccable` (critique + polish), `geist-learning-lab` (direction and learning-loop rules), `anatomy` (chapter explainer figures), `frontend-design` and `web-design-guidelines` as references, `memory-retrieval-learning` for the review-loop logic if the daily review is touched. No new installs.

## Constraints
LEARN-SPEC page contract; tests must pass; chemistry text must not drift (every text change to a lesson is reviewed against the lesson's own facts; no new reactions); no lesson step ids change; builders never commit or publish.

## Waves (each one agent, each verified, each published)
1. T1: glossary + prerequisite recap cards + the high-ranked novice fixes in Lessons 1–3, 8–9, 13 and the hub/drill feedback.
2. D1: token and type system (`:root` tokens, type scale, spacing, radius, elevation, motion tokens), applied to the shell: header, home, lesson player chrome, buttons, options, feedback. Impeccable critique first.
3. D2: widgets and the new screens (hub, drill, past papers, step player, 3D) brought onto the same system; molecule drawings get consistent sizing and captions.
4. D3: six anatomy figures, one per chapter, placed on the chapter's first lesson and the hub group header.
5. Second novice test; fix what it finds; final suite; publish; commit; push.
