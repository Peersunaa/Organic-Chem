# LEARN-SPEC — Orgo Learn (McMurry Ch 1–6 midterm)

Interactive "Learn" course that teaches organic chemistry from zero by making the learner **act before being told**. Scope: McMurry, *Fundamentals of Organic Chemistry*, Chapters 1–6 only. English only. Learner has forgotten Gen Chem.

This spec is the contract. The engine is built once; each later lesson is a **content file only**.

## 1. Files

```
learn/
  index.html          page FRAGMENT (no <!doctype>/<html>/<head>/<body>): <title>, <style>, markup, <script type="module" src="app.js">
  app.js              router (#home, #lesson-01 …), Home, lesson player, IUPAC toggle, weak-spot panel
  engine/steps.js     step renderers: predict, choice, input, try (widgets), worked, explain, mastery, useit
  engine/chem.js      RDKit loader + helpers (see §4)
  engine/widgets/*.js interactive widgets (lewis builder, …)
  engine/store.js     localStorage wrapper (try/catch, works when storage is blocked)
  lessons/index.js    ordered lesson registry
  lessons/NN-slug.js  one lesson = one ES module exporting a plain data object
  vendor/RDKit_minimal.js, vendor/RDKit_minimal.wasm   (@rdkit/rdkit 2025.3.4-1.0.0, vendored; load wasm via relative URL)
  tests/run.mjs       `node learn/tests/run.mjs` validates every lesson (see §6)
```

No build step, no npm deps at runtime, no external network except Google Fonts. All JS is ES modules loaded by relative path. The page is published as a claude.ai Artifact (index.html is the page; every other file is a supporting file), so follow the Artifact page contract: tokens on `:root` + dark mode under `@media (prefers-color-scheme: dark){:root:not([data-theme="light"])}` and `:root[data-theme="dark"]`, explicit `body` background, works at 400px wide with 16px gutters, no horizontal scroll, no `alert/confirm/prompt`, wrap all storage in try/catch.

## 2. Lesson data shape

```js
export default {
  id: "01", slug: "atoms-bonds", title: "…", minutes: 25,
  chapter: 1, sections: ["1.1","1.2"],          // McMurry sections covered
  goals: ["…"],                                  // 2–4 "you will be able to…" lines
  steps: [ Step, … ],
  mastery: { count: 3, generator: "lewis-basic" }, // generator id in engine (fresh molecules each run)
  useIt: { book: ["1.31","1.34"], note: "…" }   // book problems to do next (numbers only, never copy text)
}
```

Every step has `id`, `type`, `skill` (weak-spot tag, see §5).

| type | learner does | fields |
|---|---|---|
| `predict` | commits to a guess BEFORE any explanation | `prompt`, `options:[{text, correct?, why}]`, `reveal` (shown after commit, right or wrong) |
| `choice` | multiple choice with diagnosis | `prompt`, `options:[{text\|smiles, correct?, why}]`, `hints:[h1,h2]`, `worked` |
| `input` | types a number/short answer | `prompt`, `answer` (number or string), `accept?`(alternatives), `diagnose:[{match, why}]`, `hints`, `worked` |
| `try` | uses an interactive widget | `widget`, `config`, `hints`, `worked` (widget returns `{ok, diagnosis}`) |
| `worked` | worked example where learner picks each next move | `problem`, `moves:[{ask, options:[{text, correct?, why}], then}]` |
| `explain` | short card, ONLY after the learner acted on the idea | `html` (≤ 80 words, may include `<mol smiles="…">`) |

Rules for every graded step:
- Wrong answer → show that option's specific `why` (never just "wrong").
- After wrong #1 show `hints[0]`; after #2 `hints[1]`; after #3 show `worked` and let them continue.
- Every wrong attempt logs `{skill, stepId, lessonId, diagnosis, t}` to the weak-spot log.
- Correct → one-line confirmation + short reinforcement, then "Continue".

Drawing style: lesson field `drawing: 'full' | 'skeletal'` (default `'full'`). `full` writes every C and all H atoms; use it until skeletal structures are taught (Lessons 1–3), then `'skeletal'`. Highlights are translucent rings so the atom stays readable.

Molecules in text: `<mol smiles="CO" label="methanol">` renders an RDKit SVG inline. Names: `{name:{new:"but-2-ene", old:"2-butene"}}` renders with the global IUPAC toggle (header switch "New IUPAC / Old IUPAC", persisted).

## 3. Lesson player UX
- One step at a time, progress bar, back allowed for already-done steps, resume where you left off.
- Lesson end: mastery (3 generated problems, must get each right; wrong ones logged) → "Use it" card listing the book problems → mark lesson complete.
- Home: lesson list (locked/next/done, minutes), "Continue" button, **Weak spots** panel (top skills by recent mistakes, each with "Practise this" which serves generated problems for that skill), IUPAC toggle.
- Design: premium, calm, modern; motion only where it explains (e.g. electrons/lone pairs appearing, arrows). Respect `prefers-reduced-motion`. Keyboard accessible, visible focus.

## 4. Chemistry correctness (non-negotiable)
- Load RDKit once (`initRDKitModule({locateFile:()=> new URL('../vendor/RDKit_minimal.wasm', import.meta.url).href})`).
- `canon(smilesOrMolblock)` → canonical SMILES (or null if invalid). **Grade structures only by comparing canonical SMILES**, never by the typed string.
- `svg(smiles, opts)` depictions come from RDKit (`mol.get_svg_with_highlights`), themed via CSS (no hardcoded black/white).
- Derived facts are computed, not hand-typed, when possible: formal charge from RDKit atom data; lone pairs on a main-group atom = (valence e⁻ − bonding e⁻ shared by that atom − formal charge… use: `LP = (V − FC − bondOrderSum) / 2` where V = group valence electrons, bondOrderSum includes bonds to implicit H).
- Valence electrons table: H1 C4 N5 O6 F7 Cl7 Br7 I7 S6 P5 B3.
- Never show a chemically wrong statement. If unsure, leave it out and flag in the report.

## 4b. Solid 3D models (preferred over drawn 3D)
Whenever 3D helps understanding (geometry, hybridization, conformations, chairs, chirality, mirror images), use a real solid 3D model, not a hand-drawn projection.
- Renderer: 3Dmol.js `https://cdn.jsdelivr.net/npm/3dmol@2.5.5/build/3Dmol-min.js` (WebGL; ball-and-stick default, toggle to space-filling; drag to rotate, pinch/scroll zoom; must work on iPad touch).
- Coordinates are **computed, never hand-typed**: generate with Python RDKit (`AddHs → EmbedMolecule(randomSeed) → MMFFOptimizeMolecule`) via `learn/tools/gen3d.py`, saved as molblocks in `learn/data/3d/<id>.mol` (or a JS map). Conformers that must be specific (chair with axial vs equatorial substituent, staggered vs eclipsed, R vs S) are built and then checked in the test (e.g. dihedral angles, CIP label from RDKit) before use.
- Atom colours: CPK (C dark grey, H white, O red, N blue, halogens green/brown), legible on both themes; optional labels and lone-pair hints are overlays.
- Widget `model3d` config: `{mol:"<id>", style:"stick"|"sphere", spin?:bool, highlight?:[atomIdx], labels?:{idx:text}, compare?:"<id2>"}` (`compare` shows two models side by side with linked rotation, e.g. enantiomers).
- Fallback: if WebGL is unavailable, show the RDKit 2D depiction with a note.

## 5. Skill tags (weak-spot taxonomy)
`valence-electrons`, `bond-count` (HONC), `lone-pairs`, `octet`, `multiple-bonds`, `formal-charge`, `electron-count-total`, `hybridization`, `sigma-pi`, `polarity`, `conjugate-pairs`, `pka-direction`, `curved-arrows`, `lewis-acid-base`, `skeletal`, `functional-groups`, `naming`, `conformations`, `chairs`, `ez`, `mechanism`, `markovnikov`, `stereo-addition`, `resonance`, `eas`, `directors`, `synthesis`, `chirality`, `rs`, `stereo-relationships`. Add new tags here when a lesson needs one.

## 6. Tests (`node learn/tests/run.mjs`, must pass before publishing)
For every lesson: schema valid; every `smiles` parses in RDKit; each `choice`/`predict` has exactly one correct option and a non-empty `why` on every option; every graded step has 2 hints + worked; `input` answers that are chemistry-derived (formal charge, lone pairs, valence e⁻) are recomputed from SMILES and must match; every mastery generator produces 50 valid problems whose answers recompute correctly; widget targets are reachable (the target structure's canonical SMILES equals what the widget would produce for the correct solution). Reactions (later lessons) are stored as data `{reactants, reagents, products, conditions, steps}` and tests check atom + charge balance per mechanism step.

## 7. Conventions
- McMurry conventions: curved arrows start at electrons (lone pair or bond) and point to the atom/bond receiving them; pKa values from McMurry Table 1.2; new IUPAC names by default (book style "but-2-ene"), old names via toggle.
- Book problems referenced by number only. Explanations are original paraphrase. No copied book text or figures.
