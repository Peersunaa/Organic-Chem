# Mechanism scene schema

A **scene** is a short, data-driven, scrubbable SVG animation of one reaction. It shows how a reagent acts on a reactant: which electrons move, why they move, where the new bond forms, and why the regio- and stereochemistry come out as they do. A scene has a fixed 640 × 400 viewBox, phone-friendly controls, two toggleable layers (ARROWS and ORBITALS), a caption on every beat, and a reduced-motion mode.

This file is the contract. Each `NN-id.md` scene file ends with a full scene object in a `json` block that validates against the schema in section 13. The tables in those files are a readable view of the same data. If a table and the JSON ever disagree, the JSON wins.

Contents: 1 Model · 2 Atom identity · 3 Coordinates and camera · 4 Timeline · 5 Beat · 6 Arrows · 7 Bonds, charges, lone pairs · 8 Orbitals · 9 Moves, ghosts, forms, relayout · 10 Layers, colour, motion · 11 Reduced motion · 12 Accessibility · 13 JSON Schema · 14 Tests to port · 15 Table shorthand

---

## 1 Model

A scene is a **stage** (every atom that will ever appear, with an identity number) plus a list of **beats**. Each beat ends on a declared **state**, an atom-mapped dot-SMILES of everything on stage at that moment. The state is the truth. Every other beat field says how to get there (arrows, moves, timing) or what to show on top (orbitals, badges, camera). It follows that:

- A frame at any time `t` is a pure function of `t`: the start state of the current beat, the end state, and the progress `p` through the beat. Scrubbing, Back and Next need no history.
- `bonds` and `charges` in a beat are the difference between the previous state and this one. The generator wrote them from that difference, and a test must check that they still match (section 14).
- Everything that is "shown" (`orbitals`, `badges`, `partials`, `ghosts`, `forms`) is declarative: the list is what is visible at the END of the beat. Items in the previous beat's list but not in this one fade out during the first 30 % of the beat. New items fade in over the same window. An item that keeps the same `kind` + `atoms` (orbitals) or `atom` + `text` (badges) persists without a fade.
- `camera` and `faces` inherit. The exported JSON already carries the merged values on every beat.

## 2 Atom identity

- Every species on stage is written as **atom-mapped SMILES**: `[CH2:1]=[C:2]([CH3:3])[CH3:4]`. Map numbers are unique across the whole scene. Every atom that gains or loses a bond, changes charge, moves on its own, or is named in a caption carries a map number. Unmapped atoms never change their bonds.
- A hydrogen that moves is an explicit atom: `[H:5][Br:6]`, `[C:1]1([H:7])=[CH:2]…`. Parse with `removeHs: false` so it stays an atom. Implicit hydrogens (`[CH2:1]`) are drawn by the renderer as usual and never move independently.
- **Map number → renderer index.** RDKit numbers atoms in order of appearance. The loader strips the `:n` labels (regex `/:(\d+)\]/` → `]`) before calling the app renderer (`coords2d`, `analyze` in `engine/chem.js`), and builds the table by walking atom tokens in the original string. Token regex: `/\[[^\]]+\]|Br|Cl|B|C|N|O|P|S|F|I|b|c|n|o|p|s|\*/g`. Token `i` is renderer atom `i`; if it contains `:n`, that atom is `n`. (Explicit `[H:n]` atoms appear in token order like any other atom. This differs from `buildScene`'s "heavy atoms first, then H" rule, because here every H that matters is explicit.)
- Benzene rings that react are written **Kekulé** (`=` bonds), not aromatic lowercase, so the arrows can name real C=C bonds. Products may be aromatic.
- Metals (`Fe`, `Al`, `Mn`, `Pd`, `Hg`) and boron never get lone-pair dots. `Pd` atoms are surface sites: draw them as dots in the metal slab, never as "Pd" letters.
- `atomNames` gives the display name of each map number ("C1", "Br(near)"). Captions, `why` lines and the md tables use those names.

## 3 Coordinates and camera

**Layout units.** One unit is one bond length, as in `widgets/arrow-core.js`. At zoom 1, one unit is `SCALE = 64` px in the 640 × 400 viewBox.

**Initial placement.** Each species is laid out by the app's 2D renderer (`coords2d`), with y flipped to point down, as `sceneFromSmiles` does. It is then shifted so that its minimum x sits at `at[0]` and its vertical centre at `at[1]`. `at: "auto"` (species added mid-scene) starts 1.5 units beyond the right edge of the current stage bounds, at y = 0, and the beat's `moves` bring it in. `at: "surface"` puts metal sites evenly on the surface: spacing 1.6 units, centred under the stage, in the order listed. Hydrogens follow `hydrogenPositions` (lewis-core), with optional `hAngles` (degrees, keyed by map number).

**Depth.** Every atom also has `z` (default 0). +z points out of the screen toward the viewer. **+z is the top face** (wedge side); −z is the bottom face (dash side). Moves, `pose` and `backside` set z. Rings are treated as flat (z = 0); the course does not need chairs for the face arguments.

**Projection.** Camera `{zoom k, focus [maps], tilt θ°}`. Let (fx, fy) be the centroid of the focus atoms, or of the whole stage's bounding box when `focus` is empty.

```
X = 320 + 64·k·(x − fx)
Y = 200 + 64·k·((y − fy)·cos θ − z·sin θ)
```

θ = 0 looks straight down on the molecular plane: the ordinary 2D drawing. θ around 60–70° is nearly edge-on, with the top face up on screen. Text labels and atom circles never squash; only positions are projected. Camera changes tween over the first 50 % of the beat with the house ease.

**Faces.** `faces.show` draws two faint dashed guide lines when θ ≥ 30°, at z = +1.0 and z = −1.0 across the focus region, with `faces.labels.top` and `faces.labels.bottom` at the left margin (16 px text, muted). They are shown in both layers.

**Surfaces.** `stage.surface = {kind, plane, z | y, label}`. With `plane: "z"` (scenes 04): a slab at z = `z`, spanning the stage bounds plus 1 unit, projected (a thin parallelogram when tilted). With `plane: "y"` (scene 10): a bar at y = `y` in the flat drawing, 0.35 units thick. The metal sites sit on the slab or bar. The surface belongs to the base picture, not to a layer.

**Orbital glyph attachment** (layout units, then projected):

| glyph | anchor | geometry |
|---|---|---|
| lobe pair (`pi`, `p-empty`), plane `z` | each listed atom | lobes centred at (x, y, ±0.6); in-plane radius 0.35, z radius 0.55. Projected: rx = 0.35, ry = √((0.55 sin θ)² + (0.35 cos θ)²). At θ < 10° the two lobes overlap the atom: draw them as a soft halo of radius 0.5, the top lobe nudged (−0.06, −0.06) |
| lobe pair, plane `y` | each listed atom | lobes at ±0.6 along the in-plane normal of the bond (first two atoms), unaffected by z |
| multi-atom `pi` (3+ atoms) | listed atoms in order | one lobe per atom, same fill, neighbours overlap by 40 % so they read as one cloud |
| `lone-pair` | the atom | one teardrop, length 0.7, aimed at `toward` (or away from `away`); without either, at the lone-pair angle from `lp-draw.js`. Plane `z`: a ±z lobe pair (a p-type pair lined up with a π system) |
| `sigma-star` | `axis[0]` | hollow dashed lobe centred 0.6 behind `axis[0]`, on the side opposite `axis[1]`, length 0.6; a small 0.25 front lobe between the two atoms |
| `aromatic` | ring atoms | two rings following the ring polygon at z = ±0.5 |
| `bromonium` | [C, C, Br] | translucent triangle through the three atoms; the Br sits at z ≈ +1.0 (top) or −1.0 |
| `ring` | atoms in ring order | translucent polygon fill through the atoms, lifted z ±0.15 toward `side` |
| `surface` | metal sites | brightens the slab (focus) or dims it (ghost) |

## 4 Timeline

- Each beat has a motion window `[t0, t1]` (seconds from scene start), then a `hold`. `t0(next) = t1 + hold`. Motion beats are 2–5 s long (a test enforces this). The default hold is 1.0 s. The last beat has hold 0, and the player stays on its end state until the learner acts.
- Progress through a beat is `p = ease((t − t0) / (t1 − t0))`, with the house ease `cubic-bezier(.4, 0, .2, 1)`. During the hold, p = 1 and nothing moves.
- Every `at: [a, b]` is a fraction of the motion window, before easing. Each sub-motion is eased on its own window.
- Order inside a beat: `reset` cross-fade (0–0.1, 250 ms) → `drops` fade out (0–0.2) → `adds` fade in (0–0.25) → `moves` (their `at`, default [0, 0.4]) → `arrows` (their `at`) → bond fades (tied to arrows, section 7) → `charges` and `partials` cross-fade (0.85–1.0) → `relayout` (0.4–1.0).
- **Nothing moves without a caption.** The caption for a beat is shown from `t0` through its hold. It changes, with a 150 ms cross-fade, only at the next beat's `t0`.

## 5 Beat

| field | type | meaning |
|---|---|---|
| `id` | string | `b<n>-<word>`, unique in the scene |
| `t0`, `t1`, `hold` | number (s) | section 4 |
| `kind` | `step` · `look` · `resonance` · `summary` | `step`: bonds change through arrows. `look`: nothing chemical changes (camera, orbitals, badges, ghosts, relayout only). `resonance`: arrows move electrons between resonance forms, and atoms are frozen in place. `summary`: bonds change with no arrows (a step the course does not draw, e.g. hydrolysis), shown as a cross-fade |
| `caption` | string ≤ 110 chars | the narration (section 12) |
| `captionOrbitals` | string ≤ 110 | replaces `caption` while the ORBITALS layer is on |
| `reset` | `{species:[{key, smiles, label}]}` | replace the whole stage (scene 15). Atoms whose map numbers survive keep their xy |
| `adds` | `[{key, role, smiles, label, at, style}]` | species that join at this beat |
| `drops` | `[map]` | fade out every dot-fragment that contains one of these atoms |
| `moves` | see section 9 | rigid motions |
| `arrows` | see section 6 | curved arrows |
| `bonds` | `[{a, b, action: form/break/order, order, partial?}]` | the state difference (derived) |
| `charges` | `[{atom, charge}]` | formal charges that change (derived) |
| `partials` | `[{atom, sign: "+"/"-"}]` | δ+ / δ− labels visible at the end of the beat |
| `orbitals` | see section 8 | ORBITALS-layer glyphs visible at the end of the beat |
| `badges` | `[{atom, text, tone: nuc/elec/muted}]` | small pill labels ("3°", "pKa 25", "top") |
| `ghosts` | see section 9 | translucent alternatives ("or from below", mirror image) |
| `forms` | `[mapped SMILES]` | resonance row (section 9) |
| `ts` | bool | formed and broken bonds are drawn dashed mid-beat (concerted transition state) |
| `camera` | `{zoom, focus:[maps], tilt}` | merged and explicit |
| `faces` | `{show, labels:{top, bottom}}` | merged and explicit |
| `state` | mapped dot-SMILES | everything on stage at the end of the beat: **the truth** |
| `relayout` | `{anchor:[maps ≥ 2]}` | tween to the renderer's own drawing of `state` (section 9) |
| `pose` | `{map: z}` | z for those atoms at the end (wedges after relayout) |
| `notes` | string | implementer notes, never shown |

## 6 Arrows

```json
{ "id": "a1", "from": {"bond": [1, 2]} | {"lp": 6},
  "to": {"atom": 6} | {"bond": [1, 5]},
  "electrons": "pair" | "single",
  "tone": {"src": "nuc" | "none", "dst": "elec" | "none"},
  "path": {"bend": "auto" | "cw" | "ccw", "amount": 0.35, "via": [x, y]?, "face": "top" | "bottom"?},
  "at": [0.3, 0.75], "why": "one or two beginner sentences" }
```

- The grammar is exactly arrow-core's. `from.bond [a,b]` → `to.bond [a,k]` means "the electrons of bond a–b make the new bond a–k" (a π bond attacking, a σ bond shifting). `from.bond` → `to.atom` means the pair goes onto that atom (leaving group, π pair onto O). `from.lp` → `to.atom` makes a new bond to that atom. `from.lp` → `to.bond [a,b]` makes a multiple bond (O lone pair forming C=O⁺).
- Geometry: reuse arrow-core's `curve()` and `lpPoints()`. `bend: "auto"` is arrow-core's default side. `amount` is the control-point offset as a fraction of the chord. `via` overrides the control point. In tilted views, `face` lifts the control point to z = ±0.8 so the arrow visibly comes over the top or under the bottom face.
- Drawing: an amber stroke (`--electron`), 2 px, with a full head for a pair and a half head (fish-hook) for `single`. The stroke draws in from tail to head over the first 30 % of its `at` window (stroke-dashoffset). Then the electrons travel: two amber dots for a pair (one for single), 6 px apart, moving along the curve from tail to head over the rest of the window. When the source is a lone pair, those two dots ARE the lone-pair dots, lifting off the atom. At `t1` arrows dim to 35 % as a trace through the hold, and are removed at the next `t0`.
- `tone`: `src: nuc` draws a teal (`--accent`) halo on the source atom or bond while the dots travel. `dst: elec` draws a coral (`--bad`) halo on the target atom. The first arrow of a step also shows tiny "Nu" and "E" tags on those halos, so colour is never the only cue.
- `why` is shown under the caption while that arrow's dots travel (as the step player does today), and it is the screen-reader text for the arrow.
- `electrons: "single"` exists for completeness. None of the 16 scenes uses radical arrows. Surface steps (H₂/Pd, Lindlar) have no arrows at all: atoms travel along dotted motion trails instead (`moves[].trail`).

## 7 Bonds, charges, lone pairs

- **Bond fades are tied to arrows.** A bond named as an arrow's `to.bond` (or the lp-source → atom pair) fades in during the last 40 % of that arrow's dot travel. It is drawn with an amber glow that cools to ink over 600 ms. A bond named as an arrow's `from.bond` loses one line (a break, or a drop in order) during the first 40 % of the dot travel. For a double → single change, only the second line fades.
- Bonds that change with no arrow (`summary`, surface beats) fade over [0.3, 0.8].
- With `ts: true`, forming bonds are drawn dashed while they fade in and turn solid at `t1`. Breaking bonds turn dashed as the dots leave, then fade.
- Formal charges, δ labels and lone-pair counts come from `state` at each end (`lpCount` rule from arrow-core). Charge badges cross-fade over [0.85, 1.0]. Use a circled + in coral and a circled − in teal, so the glyph carries the meaning, not only the colour. On atoms that are mid-step bookkeeping (more than an octet partway through), hide the charge, as `partialState().mid` does.

## 8 Orbitals

```json
{ "kind": "pi" | "p-empty" | "lone-pair" | "sigma-star" | "surface" | "bromonium" | "aromatic" | "ring",
  "atoms": [maps], "side": "top" | "bottom" | "both", "emphasis": "focus" | "normal" | "ghost",
  "electrons": 0 | 2 | 4 | 6, "plane": "z" | "y", "toward": map, "away": map, "axis": [map, map], "label": "empty p" }
```

- Kinds beyond the brief's list: `aromatic` (benzene's six-electron ring cloud), `ring` (a translucent highlight of a new ring forming on one face: epoxide, manganate ester, hydroboration four-centre TS, Diels–Alder ring). `p-filled` is not used; a filled p-type pair is `lone-pair` with `plane: "z"`.
- Fill: lobes holding electrons are amber at 22 % fill with 55 % stroke, and carry small amber dots (`electrons` dots, spread over the lobes). Empty lobes (`p-empty`, `electrons: 0`) are hollow with a coral 1.5 px stroke and 8 % coral fill. `sigma-star` is a coral dashed outline. `surface` is the muted metal slab. `bromonium` and `ring` use a 12 % coral or 10 % teal fill.
- `side` picks which lobes are drawn (top = +z). Emphasis sets opacity: focus 1.0 with a soft glow, normal 0.6, ghost 0.25 with a dashed outline.
- Coupling to arrows (ORBITALS layer on): while an arrow's dots travel, its source lobe stretches 1.3× toward the target and the target lobe brightens. When the bond fades in, the two lobes fade into it. The learner sees the overlap become the bond.

## 9 Moves, ghosts, forms, relayout

**Moves** (rigid, eased on `at`, default [0, 0.4]; positions persist):

| shape | meaning |
|---|---|
| `{species \| atoms, by: [dx, dy, dz]}` | translate |
| `{species \| atoms, anchor, near: map \| [maps], offset: [dx, dy, dz]}` | translate so that `anchor` ends at the position of `near` (or the centroid of the list) + offset |
| `{species, pairs: [[a, p], [b, q]], gap: [dx, dy, dz]}` | dock: rotate in plane and translate so that a sits at p + gap and b at q + gap (least squares when not exact) |
| `{atoms, backside: {of, leaving, attacker?, dist}}` | place the moved group `dist` units from `of`, on the line from `leaving` through `of`, on the far side (SN2, bromonium opening). With `attacker`, the attacker is fixed and the species moves so that `of` lands opposite `leaving` |
| `{atoms: [a], with: "substituents", rotate: {axis: [p, q], deg}}` | rotate a and everything attached on its side about the p→q axis, in 3D (s-trans → s-cis) |
| `orient: {atoms: [a, b], dir: [x, y, z]}` | extra key on any move: also turn the species so that a→b points along `dir` |
| `trail: true` | extra key: leave a dotted motion trail that fades over 600 ms (surface H transfer) |

`species` names a key from `stage.species` or `adds`. A species moves with all its atoms, and those atoms keep their current bonds. That is why the moves in the data name the atoms of a fragment once a species has split.

**Ghosts:** `{atoms, offset, label}` is a 25 % copy of those atoms at an offset ("or from below"). `{mirror: true, label}` is a 30 % copy of the relaid-out product, reflected across a vertical line 0.8 units right of it. `{smiles, label, at: "right"}` is a mini drawing at scale 0.6 in the right third of the stage (a contrast reagent or a failed substrate). Ghosts never take part in the chemistry.

**Forms (resonance row):** mini cards at scale 0.45 across the top band (y 8–90 px), each drawn at the stage's own coordinates (forms share the σ skeleton, and a test checks this), joined by ↔. The card matching the current stage is outlined in teal. In `resonance` beats the previous form slides into the row as the new one is drawn.

**Relayout:** over [0.4, 1.0], compute the renderer's 2D drawing of `state` (strip the maps, keep the token order), align it to the current positions with a 2D rigid fit (rotation and translation; reflection only if it lowers the error by more than 20 %) on the `anchor` atoms, then tween every atom to it. z goes to the `pose` value (default 0). After relayout, any bond from a stage atom to an atom with z ≥ 0.5 is drawn as a wedge, and z ≤ −0.5 as a hashed wedge.

## 10 Layers, colour, motion

**Layers.** The **base picture** is always on: atoms, bonds, formal charges, lone-pair dots, moves, relayout, surfaces, faces guides, the resonance row, ghosts, captions. Two toggles sit on top of it (`aria-pressed` buttons; ARROWS on and ORBITALS off by default; both can be on):

- **ARROWS**: curved arrows, travelling electron dots, Nu/E halos, δ± labels, badges, `why` lines.
- **ORBITALS**: the glyphs of section 8 and their coupling to arrows. With ARROWS off, the electron dots still travel, but along a straight line from source lobe to target lobe, so the learner still sees which electrons move.

**Colour semantics** (existing tokens only; no new colours, no new fonts):

| meaning | token |
|---|---|
| electrons (arrows, dots, filled lobes, new-bond glow) | `--electron` (amber) |
| nucleophile, electron-rich, − charge | `--accent` (teal) |
| electrophile, electron-poor, + charge, empty orbitals, σ* | `--bad` (coral) |
| atoms, bonds, text | `--ink`, `--ink-2` |
| guides, faces, labels, metal | `--muted`, `--line`, `--line-strong`, `--surface-2` |

Soft fills use `color-mix(in srgb, <token> N%, transparent)`, as in `figures/ch4-alkene.svg`. Light and dark themes come from the tokens. Text in the SVG is 16 px at the phone-scaled size (the house figure rule). Captions live in HTML under the SVG, not inside it, so they wrap and keep the app font.

**Motion.** Calm and eased. No bounce, no overshoot, no spring, no shake. Electrons travel along the arrow, never jump. One idea per beat. Every beat ends on a clear, still state. Nothing moves during a hold. Total scene length is 25–50 s (a short Lesson 08 primer of 3–4 beats, such as scene 19: 12 s or more).

## 11 Reduced motion

When `prefers-reduced-motion: reduce` is set (`reduceMotion()` as in app.js):

- No tweening of any kind: no travelling dots, no stroke draw-in, no camera glide, no lobe stretching.
- A `step` or `resonance` beat becomes two still frames. **Frame A** is the start state with that beat's arrows drawn complete and static, its `why` lines listed, and the target camera already applied. **Frame B** is the end state, with no arrows. A `look` or `summary` beat is one frame, its end state. Next and Back walk A → B → next A. The scrubber snaps to frame boundaries.
- Autoplay (if the learner presses Play) shows A for 45 % of the beat's duration and B for the rest plus the hold, with an instant swap. Resets and layer toggles are instant.
- Captions and `why` lines are unchanged. Reduced motion never removes information, only movement.

## 12 Accessibility

- **Captions are the narration.** Every beat has one, at most 110 characters, in short beginner sentences, chemically exact. A caption names what moves and why. No beat may change the picture without its caption on screen.
- The caption sits in an `aria-live="polite"` region. Stepping announces "Beat 3 of 8. <caption>". While an arrow's dots travel, its `why` is appended to a second, visually secondary line, also polite.
- SVG: `role="img"`, with `<title>` = scene title and `<desc>` = the current caption plus the current beat's `why` lines, updated per beat.
- Controls (HTML, under the caption): Back, Play/Pause, Next as 44 × 44 px buttons with `aria-label`; the two layer toggles; a timeline `input type="range"` whose `aria-valuetext` is "Beat 3 of 8, 11 s: <caption>" and which snaps to beat starts on keyboard input. Keys: Space play/pause, ← → previous/next beat, Home/End first/last.
- Colour is never the only carrier: + and − glyphs, δ labels, Nu/E tags, and "top face"/"bottom face" words.
- Phone: the SVG scales to the container width (400 px design width, as LEARN-SPEC). No horizontal scroll. The tap targets above. The caption wraps to at most 3 lines at 16 px.

## 13 JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "orgo-learn/scene.schema.json",
  "type": "object",
  "required": ["id", "title", "reagentCard", "intent", "reactant", "reagent", "products", "atomNames", "stage", "layers", "duration", "beats", "stereoCallout", "whatIf", "quiz"],
  "properties": {
    "id": {"type": "string", "pattern": "^[0-9]{2}-[a-z0-9-]+$"},
    "title": {"type": "string"},
    "reagentCard": {"type": "string", "description": "HUB_BY_ID key in engine/reaction-hub.js"},
    "alsoCards": {"type": "array", "items": {"type": "string"}},
    "lesson": {"oneOf": [{"type": "null"}, {"type": "object", "required": ["id", "step"], "properties": {"id": {"type": "string"}, "step": {"type": "string"}}}]},
    "intent": {"type": "string"},
    "reactant": {"$ref": "#/$defs/named"},
    "reagent": {"type": "object", "required": ["label"], "properties": {"smiles": {"type": "string"}, "label": {"type": "string"}}},
    "products": {"type": "array", "minItems": 1, "items": {"type": "object", "required": ["smiles", "name", "stereo"],
      "properties": {"smiles": {"type": "string"}, "name": {"type": "string"},
        "stereo": {"enum": ["achiral", "racemate", "meso", "Z", "E", "flat", "single"]},
        "inFinal": {"type": "boolean", "default": true, "description": "false = not on stage at the end (an intermediate stopping point or a dropped by-product)"},
        "note": {"type": "string"}}}},
    "intermediates": {"type": "array", "items": {"$ref": "#/$defs/named"}},
    "atomNames": {"type": "object", "patternProperties": {"^[0-9]+$": {"type": "string"}}},
    "stage": {"type": "object", "required": ["species", "state"], "properties": {
      "species": {"type": "array", "items": {"$ref": "#/$defs/species"}},
      "surface": {"type": "object", "required": ["kind", "plane", "label"], "properties": {"kind": {"type": "string"}, "plane": {"enum": ["z", "y"]}, "z": {"type": "number"}, "y": {"type": "number"}, "label": {"type": "string"}}},
      "state": {"type": "string", "description": "mapped dot-SMILES of the start"}}},
    "layers": {"const": ["arrows", "orbitals"]},
    "duration": {"type": "number"},
    "beats": {"type": "array", "minItems": 3, "items": {"$ref": "#/$defs/beat"}},
    "stereoCallout": {"type": "object", "required": ["title", "text"], "properties": {"title": {"type": "string"}, "text": {"type": "string"}, "stereoMoment": {"type": ["string", "null"], "description": "STEREO_MOMENTS id (engine/stereo-moments.js) for the See-it-in-3D button"}}},
    "whatIf": {"type": "array", "items": {"type": "string", "pattern": "^[0-9]{2}-[a-z0-9-]+$"}},
    "quiz": {"type": "object", "required": ["q", "options"], "properties": {"q": {"type": "string"},
      "options": {"type": "array", "minItems": 3, "items": {"type": "object", "required": ["text", "correct", "why"], "properties": {"text": {"type": "string"}, "correct": {"type": "boolean"}, "why": {"type": "string", "description": "for a wrong option: the diagnosis"}}}}}},
    "notes": {"type": "array", "items": {"type": "string"}}
  },
  "$defs": {
    "map": {"type": "integer", "minimum": 1},
    "named": {"type": "object", "required": ["smiles", "name"], "properties": {"smiles": {"type": "string"}, "name": {"type": "string"}}},
    "species": {"type": "object", "required": ["key", "role", "smiles", "label", "at", "style"], "properties": {
      "key": {"type": "string"}, "role": {"enum": ["reactant", "reagent", "catalyst", "solvent", "spectator"]},
      "smiles": {"type": "string"}, "label": {"type": "string"},
      "at": {"oneOf": [{"type": "array", "items": {"type": "number"}, "minItems": 2, "maxItems": 2}, {"enum": ["auto", "surface"]}]},
      "style": {"enum": ["full", "skeletal", "surface"]}, "hAngles": {"type": "object"}, "notes": {"type": "string"}}},
    "vec3": {"type": "array", "items": {"type": "number"}, "minItems": 3, "maxItems": 3},
    "window": {"type": "array", "items": {"type": "number", "minimum": 0, "maximum": 1}, "minItems": 2, "maxItems": 2},
    "arrow": {"type": "object", "required": ["id", "from", "to", "electrons", "at"], "properties": {
      "id": {"type": "string"},
      "from": {"oneOf": [{"type": "object", "required": ["bond"], "properties": {"bond": {"type": "array", "items": {"$ref": "#/$defs/map"}, "minItems": 2, "maxItems": 2}}}, {"type": "object", "required": ["lp"], "properties": {"lp": {"$ref": "#/$defs/map"}}}]},
      "to": {"oneOf": [{"type": "object", "required": ["atom"], "properties": {"atom": {"$ref": "#/$defs/map"}}}, {"type": "object", "required": ["bond"], "properties": {"bond": {"type": "array", "items": {"$ref": "#/$defs/map"}, "minItems": 2, "maxItems": 2}}}]},
      "electrons": {"enum": ["pair", "single"]},
      "tone": {"type": "object", "properties": {"src": {"enum": ["nuc", "none"]}, "dst": {"enum": ["elec", "none"]}}},
      "path": {"type": "object", "properties": {"bend": {"enum": ["auto", "cw", "ccw"]}, "amount": {"type": "number"}, "via": {"type": "array", "items": {"type": "number"}}, "face": {"enum": ["top", "bottom"]}}},
      "at": {"$ref": "#/$defs/window"}, "why": {"type": "string"}}},
    "orbital": {"type": "object", "required": ["kind", "atoms", "side", "emphasis"], "properties": {
      "kind": {"enum": ["pi", "p-empty", "lone-pair", "sigma-star", "surface", "bromonium", "aromatic", "ring"]},
      "atoms": {"type": "array", "items": {"$ref": "#/$defs/map"}}, "side": {"enum": ["top", "bottom", "both"]},
      "emphasis": {"enum": ["focus", "normal", "ghost"]}, "electrons": {"type": "integer"}, "plane": {"enum": ["z", "y"]},
      "toward": {"$ref": "#/$defs/map"}, "away": {"$ref": "#/$defs/map"}, "axis": {"type": "array", "items": {"$ref": "#/$defs/map"}, "minItems": 2, "maxItems": 2}, "label": {"type": "string"}}},
    "move": {"type": "object", "properties": {
      "species": {"type": "string"}, "atoms": {"type": "array", "items": {"$ref": "#/$defs/map"}},
      "by": {"$ref": "#/$defs/vec3"}, "anchor": {"$ref": "#/$defs/map"},
      "near": {"oneOf": [{"$ref": "#/$defs/map"}, {"type": "array", "items": {"$ref": "#/$defs/map"}}]}, "offset": {"$ref": "#/$defs/vec3"},
      "pairs": {"type": "array", "items": {"type": "array", "items": {"$ref": "#/$defs/map"}, "minItems": 2, "maxItems": 2}}, "gap": {"$ref": "#/$defs/vec3"},
      "backside": {"type": "object", "required": ["of", "leaving", "dist"], "properties": {"of": {"$ref": "#/$defs/map"}, "leaving": {"$ref": "#/$defs/map"}, "attacker": {"$ref": "#/$defs/map"}, "dist": {"type": "number"}}},
      "with": {"const": "substituents"}, "rotate": {"type": "object", "required": ["axis", "deg"], "properties": {"axis": {"type": "array", "items": {"$ref": "#/$defs/map"}}, "deg": {"type": "number"}}},
      "orient": {"type": "object", "properties": {"atoms": {"type": "array"}, "dir": {"$ref": "#/$defs/vec3"}}},
      "at": {"$ref": "#/$defs/window"}, "trail": {"type": "boolean"}}},
    "beat": {"type": "object", "required": ["id", "t0", "t1", "hold", "kind", "caption", "arrows", "bonds", "charges", "partials", "orbitals", "badges", "ghosts", "camera", "faces", "state"], "properties": {
      "id": {"type": "string", "pattern": "^b[0-9]+-[a-z0-9-]+$"},
      "t0": {"type": "number"}, "t1": {"type": "number"}, "hold": {"type": "number", "minimum": 0},
      "kind": {"enum": ["step", "look", "resonance", "summary"]},
      "caption": {"type": "string", "maxLength": 110}, "captionOrbitals": {"type": "string", "maxLength": 110},
      "reset": {"type": "object", "required": ["species"], "properties": {"species": {"type": "array"}}},
      "adds": {"type": "array", "items": {"$ref": "#/$defs/species"}}, "drops": {"type": "array", "items": {"$ref": "#/$defs/map"}},
      "moves": {"type": "array", "items": {"$ref": "#/$defs/move"}},
      "arrows": {"type": "array", "items": {"$ref": "#/$defs/arrow"}},
      "bonds": {"type": "array", "items": {"type": "object", "required": ["a", "b", "action", "order"], "properties": {"a": {"$ref": "#/$defs/map"}, "b": {"$ref": "#/$defs/map"}, "action": {"enum": ["form", "break", "order"]}, "order": {"type": "integer", "minimum": 0, "maximum": 3}, "partial": {"type": "boolean"}}}},
      "charges": {"type": "array", "items": {"type": "object", "required": ["atom", "charge"], "properties": {"atom": {"$ref": "#/$defs/map"}, "charge": {"type": "integer"}}}},
      "partials": {"type": "array", "items": {"type": "object", "required": ["atom", "sign"], "properties": {"atom": {"$ref": "#/$defs/map"}, "sign": {"enum": ["+", "-"]}}}},
      "orbitals": {"type": "array", "items": {"$ref": "#/$defs/orbital"}},
      "badges": {"type": "array", "items": {"type": "object", "required": ["atom", "text", "tone"], "properties": {"atom": {"$ref": "#/$defs/map"}, "text": {"type": "string"}, "tone": {"enum": ["nuc", "elec", "muted"]}}}},
      "ghosts": {"type": "array", "items": {"type": "object", "required": ["label"]}},
      "forms": {"type": "array", "items": {"type": "string"}},
      "ts": {"type": "boolean"},
      "camera": {"type": "object", "required": ["zoom", "focus", "tilt"], "properties": {"zoom": {"type": "number"}, "focus": {"type": "array", "items": {"$ref": "#/$defs/map"}}, "tilt": {"type": "number", "minimum": 0, "maximum": 75}}},
      "faces": {"type": "object", "required": ["show"], "properties": {"show": {"type": "boolean"}, "labels": {"type": "object", "properties": {"top": {"type": "string"}, "bottom": {"type": "string"}}}}},
      "state": {"type": "string"}, "relayout": {"type": "object", "required": ["anchor"], "properties": {"anchor": {"type": "array", "items": {"$ref": "#/$defs/map"}, "minItems": 2}}},
      "pose": {"type": "object", "patternProperties": {"^[0-9]+$": {"type": "number"}}}, "notes": {"type": "string"}}}
  }
}
```

The scene `kind` enum has no `reset`: a reset is a `look` beat that carries a `reset` object.

## 14 Tests to port (`tests/scenes.mjs`)

The Python generator that wrote the 16 scene files ran these checks with RDKit, and every scene passed. Port them to the JS test suite, using RDKit-JS through `engine/chem.js`, so later edits stay honest:

1. Every caption and `captionOrbitals` is at most 110 characters. Every motion window is 2–5 s long. Beats are contiguous: `t0(n+1) = t1(n) + hold(n)`.
2. Each `state` parses. Bond orders are compared with aromaticity perception OFF, so Kekulé bonds stay as written.
3. Conservation: the element formula (implicit H included) and the total charge of the before-state (the previous state minus `drops`, plus `adds`, or the `reset` species) equal those of `state`. `summary` beats that drop fragments may be exempt (06 b5, 07 b7).
4. Arrows explain the bonds. Sum the arrow bond deltas (from.bond −1; to.bond +1; lp → atom +1 on the new bond). They must equal the bond-order difference between the before-state and `state` over mapped atoms. `bonds` must equal that difference.
5. Arrows explain the charges. For each atom, ΔFC = −2·Δ(lone pairs) − Δ(bond orders), where an lp source loses a pair and a bond → atom target gains one. This must equal the change in formal charge between the two states. This catches a pair sent to the wrong atom.
6. A lone-pair source has at least one lone pair. A bond source exists in the before-state.
7. Every `forms` entry has the same formula, charge and σ skeleton (the same set of bonded pairs) as the stage fragment it shows.
8. The last state, flattened (no maps, no stereo), contains every product with `inFinal ≠ false`.
9. Stereo claims: `meso` products are achiral with stereocentres, `racemate` products are chiral, `Z`/`E` match the CIP label. cis/trans on rings was checked by 3D embedding (sign of the substituent offsets from the ring plane): 03 trans, 04 cis, 05 trans, 06 cis, 07 trans, 16-inset cis.
10. `reagentCard` and `alsoCards` exist in `HUB_BY_ID`. `lesson.step` exists. `stereoMoment` exists in `STEREO_MOMENTS`. `whatIf` ids are real scene ids.

## 15 Table shorthand used in the scene files

- `π(C1=C2) → new bond C1–H` is `{from: {bond: [1, 2]}, to: {bond: [1, 5]}}`. `σ(H–Br) → onto Br` is `{from: {bond: [5, 6]}, to: {atom: 6}}`. `lone pair on Br → C2 (new Br–C2 bond)` is `{from: {lp: 6}, to: {atom: 2}}`. `lone pair on O → O–C1 gains a pair` is `{from: {lp: 7}, to: {bond: [7, 1]}}`.
- π or σ in the table is read from the bond order in the before-state (order ≥ 2 → π).
- `bonds:` lists the derived changes. `X=Y → X–Y` is an order change. "(dashed TS mid-beat)" marks `ts: true`.
- Time `4–8 (+1 hold)` means `t0 = 4`, `t1 = 8`, `hold = 1`.
