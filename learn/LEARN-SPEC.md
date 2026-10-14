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
- Lesson 06 widgets (built on `engine/widgets/view3d.js`, one scene description, two back ends: 3Dmol/WebGL, or a flat SVG projection of the same 3D coordinates with drag-rotate/pinch/tap-pick when WebGL or the CDN is unavailable):
  - `newman-rotator` `{mol:'ethane'|'bromoethane', need:['min','max'], energy:true|false|'after', pill, start}`: rotates the real RDKit coordinates about the C–C bond (`newman-core.js`); Newman projection, dihedral and E = (Emax/2)(1 + cos 3θ) are derived from the rotated coordinates.
  - `chair-flip` `{mode:'tap-h'|'flip-identify'|'sidebyside'|'rule-lab'|'explore', model}`: chairs from `data/3d/chairs.js` (generated by `tools/gen_chairs.py` / `tools/chairs.py`: embed, MMFF with ring-torsion constraints, geometric ring flip). Axial/equatorial roles, faces, cis/trans and 1,3-diaxial partners are measured from coordinates (`chair-core.js`), never typed in.

## 4c. Lesson 08 widgets (mechanisms and energy diagrams; later lessons reuse them)
- **Arrow format** (`arrow-core.js`): `{from:{lp:i}|{bond:[i,j]}, to:{atom:i}|{bond:[i,j]}}`. Added: `to:{bond:[c,k]}` where that bond does not exist yet means "these electrons make a new bond c–k" (a π bond attacking an H is `from:{bond:[c1,c2]}, to:{bond:[c1,H]}`); the learner just points the arrow at the atom H and `grade()` reads it as that arrow (`normalizeDrawn`). `arrow-draw` also takes `preset:true` (show `config.arrows`, no tapping; with `arrows:[]` it is a scene viewer; a preset arrow may start `from:{atom:i}` to show a wrong mechanism) and returns `play()` (animates the arrows and two electron dots along each curve; instant under reduced motion).
- **`mechanism-player`** `{mech, mode:'draw'|'watch', modes?:[per step], drawing?:'auto'|'full'|'skeletal'}`. `mech` = `{reactants:[smiles], reagents?:[], products:[], steps:[{before:[smiles], arrows:[...], after:[smiles], label, layout?:[{at?:[x,y], hAngles?:{heavyIdx:degrees}}]}]}`. Arrow atom numbers refer to the scene `buildScene(step)` makes from `before` (parts in order; each part's heavy atoms first, then its H atoms heavy atom by heavy atom, all explicit). Draw step: learner draws arrows (arrow-draw grading and diagnoses), then arrows animate, the next structures appear, with a computed "what changed" line. Watch step: Play button. After 3 wrong checks a "Show me this step" button appears. `ctx.onResult({ok:true})` fires after the last step only. `checkMechanism(mech)` (mechanism-core.js) proves atoms+charge balance, steps chain, no octet is exceeded, and applying the arrows reproduces `after`; tests run it on every mechanism. Data lives in `engine/mechanisms.js` (`MECH`, `hxMechanism(alkene, 'Cl'|'Br')`).
- **`energy-diagram`** `{levels:[{label,kind:'R'|'TS'|'I'|'P',E}], mode:'tasks'|'view'|'catalyst', tasks?:['ts','intermediate','rds','eact:K','dh','dhsign','faster','nsteps' | {task,ask}], showValues?, reveal?, caption?, catalyst?:{minDrop}}`. Levels must run R, (TS, I)*, TS, P with real maxima/minima (`validate`). Every answer is computed in `energy-core.js` (Eact = TS minus the level the step starts from; ΔH = P − R; rate-determining = highest TS). Tap tasks use letters A, B, …; Eact/ΔH tasks tap numbered brackets. `catalyst` mode: drag the TS (a products handle is there as a trap); passes only if the TS drops by `minDrop` and the products did not move.
- **`site-picker`** `{items:[{id, role:'nuc'|'elec'}]}`: a round of molecules from the `SITES` table in `mechanisms.js` (atom numbers + reason); tests re-derive each site from charge, lone pairs, π bond, electron count and electronegativity.
- Steps and mastery problems may carry `equation:{reactants,products,cond?}` (structures as a reaction) and `visual:{widget,config}` (worked moves too; an array shows panels side by side). Generator `mechanism-basics` (skills reaction-types, nuc-elec, energy-diagram, mechanism).

### 4c (continued). Lesson 09 additions: reactions engine, reaction-lab, regiochemistry-aware arrows
- **`engine/reactions.js`** (pure data/logic, no DOM; HX addition and acid-catalysed hydration as data-driven transforms). For a simple alkene (hydrocarbon, ONE C=C, acyclic or a ring; `alkeneSites(smiles)` returns `{ok, carbons, nH, cls}` or `{ok:false, reason}`; styrene/aromatic rings, dienes, alkynes and alkenes whose major cation could rearrange by a 1,2-H or CH₃ shift are refused, because rearrangements are not taught in this course) `predict(alkene, reagent)` returns both possible carbocations (`options[{hC, pC, cation, cls, product, mech}]`, `cls` = carbon neighbours of the C⁺: 1/2/3), the `outcome` (`'single'` both ends alike, `'markovnikov'` the cations differ in class, `'mixture'` equal class and different products), the major option(s), the minor option and the sorted canonical `products`. Reagent ids: `HCl HBr HI H2O` (`REAGENTS.H2O.label` = "H₂O, H₂SO₄ (cat.)"). `buildMechanism(alkene, reagent, hC, pC)` gives the full mechanism in mechanism-player format (HX: 2 steps; hydration: 3 steps: protonation, water attacks, water removes H⁺); every step is built by applying its arrows to the scene of the previous structures. `productChoices(pred)` builds the four drawn answers (major, anti-Markovnikov = the other orientation, wrong atom, unchanged; `onlyOne` for mixtures) with a specific `why` each. `pathwayLevels(cls)` gives illustrative energy-diagram levels for the pathway through a cation of that class (always captioned illustrative). `rankItems()/rankOrder()/cationClass()` serve the carbocation ranking. Lessons must not call RDKit-backed functions at import time: use getters (`config: { get mech() { return buildMechanism(...); } }`).
- **Regiochemistry-aware arrows.** `mech` steps may carry `regio: {pi:[hC,pC], H, ends:[{idx,text}], wrongWhy}` (set automatically by `buildMechanism` when the two C=C carbons differ in class; absent for symmetric alkenes and mixtures, where either end is right). `arrow-draw` then asks "Which carbon of the double bond bonds to H?" when the π bond is sent to H, and stores the arrow as `from:{bond:[c,other]}, to:{bond:[c,H]}`; `grade()` gives `code:'regio'` with `wrongWhy` ("H went to the wrong carbon: that gives the less stable carbocation …") for the wrong end. `checkMechanism` accepts `step.added: [smiles]` for fresh species that join a step (the second water of hydration step 3).
- **`reaction-lab`** (reusable) `{alkenes?:[ids of LAB_ALKENES], reagents?:[ids], need?:n, start?, seed?}`: ten drawn alkenes and four reagents. The learner PREDICTS the major product first (four drawn answers from `productChoices`, graded by canonical SMILES; a wrong pick reports `{ok:false, diagnosis}`); then the lab shows both carbocations side by side with their class and a stability bar, the major product(s), and a Play button (mechanism-player, watch mode; a mixture offers a tab per cation). `ctx.onResult({ok:true})` after `need` correct predictions.
- **`cation-rank`** `{items:[{smiles,label?}]}`: tap carbocations from most to least stable; graded from `cationClass()` (equal classes in either order); a wrong tap names the class, the better cation still waiting, and the inductive-effect reason.
- **`energy-diagram`** view mode takes `overlay: {levels, label}` (+ `label` for the main curve): a second pathway with the same number of levels, dashed, on one energy scale (3° against 1° cation pathway).
- Generator **`markovnikov`** (skills `markovnikov`, `carbocations`; tasks product / rank / arrows / reactant, problems of `kind:'widget'` mount any widget by name). Tests: `tests/lesson09.mjs` (every generated mechanism balanced and reproduced by its arrows; `tools/check_markovnikov.py` recomputes the products independently in Python RDKit from reaction SMARTS + a carbocation-substitution count for 40+ alkenes x 4 reagents; hand-checked fixture `tests/fixtures/markovnikov.json`, names verified with OPSIN; planarity of the tert-butyl cation model).

## 5. Skill tags (weak-spot taxonomy)
`valence-electrons`, `bond-count` (HONC), `lone-pairs`, `octet`, `multiple-bonds`, `formal-charge`, `electron-count-total`, `hybridization`, `sigma-pi`, `polarity`, `conjugate-pairs`, `pka-direction`, `curved-arrows`, `lewis-acid-base`, `skeletal`, `functional-groups`, `naming`, `conformations`, `chairs`, `ez`, `mechanism`, `reaction-types`, `nuc-elec`, `energy-diagram`, `markovnikov`, `carbocations`, `stereo-addition`, `resonance`, `eas`, `directors`, `synthesis`, `chirality`, `rs`, `stereo-relationships`. Add new tags here when a lesson needs one.

## 6. Tests (`node learn/tests/run.mjs`, must pass before publishing)
For every lesson: schema valid; every `smiles` parses in RDKit; each `choice`/`predict` has exactly one correct option and a non-empty `why` on every option; every graded step has 2 hints + worked; `input` answers that are chemistry-derived (formal charge, lone pairs, valence e⁻) are recomputed from SMILES and must match; every mastery generator produces 50 valid problems whose answers recompute correctly; widget targets are reachable (the target structure's canonical SMILES equals what the widget would produce for the correct solution). Reactions (later lessons) are stored as data `{reactants, reagents, products, conditions, steps}` and tests check atom + charge balance per mechanism step.

## 7. Conventions
- McMurry conventions: curved arrows start at electrons (lone pair or bond) and point to the atom/bond receiving them; pKa values from McMurry Table 1.2; new IUPAC names by default (book style "but-2-ene"), old names via toggle.
- Book problems referenced by number only. Explanations are original paraphrase. No copied book text or figures.
