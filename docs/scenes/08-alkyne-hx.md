# 08 · HBr adds to hex-1-yne, once and twice

**Scene id** `08-alkyne-hx` · **Hub card** `alkyne-hx-1` (also `alkyne-hx-2`) · **Taught in** Lesson 12 s07 · **Runtime** 39 s, 9 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "A π pair of the triple bond takes H⁺, and H goes to the end carbon (it already has the H), so the + lands on C2: a vinylic cation. Br⁻ bonds there. One HBr stops at the vinylic bromide; a second HBr adds the same way, so both Br end on C2: a geminal dibromide."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `alkyne` | reactant | `[CH:1]#[C:2][CH2:3][CH2:4][CH2:5][CH3:6]` | hex-1-yne | [0, 0] | skeletal |
| `HBr` | reagent | `[H:7][Br:8]` | HBr | [-2.2, -1.0] | full |

Layout note for `alkyne`: Keep H–C1≡C2–C3 on one straight line (sp carbons, 180°).

Atom names used in captions and tables: 1 = C1, 2 = C2, 3 = C3, 6 = C6, 7 = H(a), 8 = Br(a), 9 = H(b), 10 = Br(b).

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | Hex-1-yne meets HBr. A triple bond holds two π bonds, so it has π electrons to give. | δ: H(a) δ+, Br(a) δ− | π cloud C1–C2 (both faces, 2 e⁻, focus); π cloud C1–C2 (both faces, 2 e⁻, in-plane lobes)<br>*caption swaps to:* “Two π clouds at right angles: one above and below the line, one in front and behind.” | zoom 1.1, tilt 35°, focus C1/C2/H(a) |
| 2 | `b2-choose` · look | 4–7 (+1 hold) | H goes to C1, the end carbon that already has an H. Then the + lands on C2, the more substituted carbon. | badges: C2 “+ here”, C1 “H here” | π cloud C1–C2 (both faces, 2 e⁻) | zoom 1.1, tilt 0°, focus C1/C2/H(a) |
| 3 | `b3-attack` · step | 8–12 (+1 hold) | One π pair of the triple bond takes the δ+ H onto C1. The H–Br pair leaves with Br as Br⁻. | HBr moves to C1; Br(a) drifts aside<br>**arrows:** (1) π(C1≡C2) → new bond C1–H(a) · (2) σ(H(a)–Br(a)) → onto Br(a)<br>bonds: C1≡C2 → C1=C2, forms C1–H(a), breaks H(a)–Br(a)<br>charges: C2 +, Br(a) − | empty p orbital C2 (both faces, in-plane lobes, focus) | zoom 1.1, tilt 0°, focus C1/C2/H(a) |
| 4 | `b4-vinyl` · look | 13–16 (+1 hold) | The + sits on C2, a carbon of the new C=C: a vinylic carbocation. It has an empty p orbital. | hold the picture | empty p orbital C2 (both faces, in-plane lobes, focus); π cloud C1–C2 (both faces, 2 e⁻) | zoom 1.3, tilt 0°, focus C2 |
| 5 | `b5-bromide` · step | 17–21 (+1 hold) | Br⁻ gives a lone pair to C2. With one HBr it stops here: 2-bromohex-1-ene, a vinylic halide. | Br(a) moves to C2<br>**arrows:** (1) lone pair on Br(a) → C2 (new Br(a)–C2 bond)<br>bonds: forms C2–Br(a)<br>charges: C2 0, Br(a) 0<br>badges: C2 “1 equiv. ends here” | empty p orbital C2 (both faces, in-plane lobes, focus); lone-pair lobe Br(a) (both faces, 2 e⁻, pointing at C2, focus) | zoom 1.1, tilt 0°, focus C2 |
| 6 | `b6-second` · step | 22–26 (+1 hold) | A second HBr adds the same way. The π pair puts H on C1 again, and the + lands on C2 again. | adds HBr (2nd)<br>H(b), Br(b) moves to C1; Br(b) drifts aside<br>**arrows:** (1) π(C1=C2) → new bond C1–H(b) · (2) σ(H(b)–Br(b)) → onto Br(b)<br>bonds: C1=C2 → C1–C2, forms C1–H(b), breaks H(b)–Br(b)<br>charges: C2 +, Br(b) − | empty p orbital C2 (both faces, focus) | zoom 1.1, tilt 0°, focus C2 |
| 7 | `b7-why` · look | 27–30 (+1 hold) | C2 is the more substituted carbon, and the Br already on it can share the + using a lone pair. | hold the picture | empty p orbital C2 (both faces, focus); lone-pair lobe Br(a) (both faces, 2 e⁻, pointing at C2, focus) | zoom 1.3, tilt 0°, focus C2/Br(a) |
| 8 | `b8-bromide2` · step | 31–35 (+1 hold) | The second Br⁻ bonds to C2 as well. Both Br end up on one carbon: a geminal dibromide. | Br(b) moves to C2<br>**arrows:** (1) lone pair on Br(b) → C2 (new Br(b)–C2 bond)<br>bonds: forms C2–Br(b)<br>charges: C2 0, Br(b) 0 | — | zoom 1.1, tilt 0°, focus C2/Br(a) |
| 9 | `b9-product` · look | 36–39 (+0 hold) | 2,2-Dibromohexane. Markovnikov twice: both H went to C1, and both Br went to C2. | relayout to the product drawing | — | zoom 1, tilt 0° |

Beat notes for the implementer:

- `b4-vinyl`: C2 is sp: draw C1=C2–C3 straight. The empty p lies in the drawing plane (plane y), at 90° to the remaining π bond (plane z).
- `b7-why`: The card states the result only ("Br on the SAME carbon"). The lone-pair reason is one step deeper than the course; keep it in this look beat only.

## Chemistry checks

- Reactant: `C#CCCCC` (hex-1-yne). Reagent: HBr (1 equiv., then a 2nd equiv.) (`Br`).
- Intermediate: `C=[C+]CCCC`, vinylic cation.
- Intermediate: `C[C+](Br)CCCC`, bromo-substituted cation (2nd addition).
- Product: `C=C(Br)CCCC`, 2-bromohex-1-ene (after 1 equiv.). RDKit: no stereocentre. The 1-equivalent stopping point (card alkyne-hx-1).
- Product: `CCCCC(C)(Br)Br`, 2,2-dibromohexane (after 2 equiv.). RDKit: no stereocentre. Card alkyne-hx-2.
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.

## Stereo callout

**No stereo to show**

HX on an alkyne has nothing to mark here: the vinylic bromide C=C(Br) has two H on C1 (no E/Z), and C2 of the gem-dibromide holds two Br (no stereocentre). The point of the scene is regiochemistry: Markovnikov, twice, onto the same carbon.

## What-if links

[01-alkene-hx](01-alkene-hx.md), [09-alkyne-hydration](09-alkyne-hydration.md), [10-alkyne-lindlar](10-alkyne-lindlar.md)

## End quiz

**Hex-1-yne is treated with two equivalents of HBr. Which product forms?**

A. 2,2-Dibromohexane. **(correct)**  
   Why: Yes. Both times H goes to C1 and the + forms on C2, so both Br land on C2.
B. 1,2-Dibromohexane.   
   Diagnosis: Each H goes to C1, so each + forms on C2. Both Br go to C2, not one to each carbon.
C. (E)-1,2-Dibromohex-1-ene.   
   Diagnosis: That is what Br₂ gives (anti addition of two Br). HBr adds H and Br.

## Notes

- Matches Lesson 12 s07 arrows (alkyneHXMechanism): two arrows in step 1, one in step 2. Lesson uses propyne; the scene uses the hub example hex-1-yne.

**Card vs storyboard:** Brief id alkyne-hx covers two hub cards: alkyne-hx-1 (1 equiv.) and alkyne-hx-2 (2 equiv.).

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "08-alkyne-hx",
 "title": "HBr adds to hex-1-yne, once and twice",
 "reagentCard": "alkyne-hx-1",
 "alsoCards": ["alkyne-hx-2"],
 "lesson": {
  "id": "12",
  "step": "s07"
 },
 "intent": "After this scene the learner can say: \"A π pair of the triple bond takes H⁺, and H goes to the end carbon (it already has the H), so the + lands on C2: a vinylic cation. Br⁻ bonds there. One HBr stops at the vinylic bromide; a second HBr adds the same way, so both Br end on C2: a geminal dibromide.\"",
 "reactant": {
  "smiles": "C#CCCCC",
  "name": "hex-1-yne"
 },
 "reagent": {
  "smiles": "Br",
  "label": "HBr (1 equiv., then a 2nd equiv.)"
 },
 "products": [
  {
   "smiles": "C=C(Br)CCCC",
   "name": "2-bromohex-1-ene (after 1 equiv.)",
   "stereo": "achiral",
   "inFinal": false,
   "note": "The 1-equivalent stopping point (card alkyne-hx-1)."
  },
  {
   "smiles": "CCCCC(C)(Br)Br",
   "name": "2,2-dibromohexane (after 2 equiv.)",
   "stereo": "achiral",
   "note": "Card alkyne-hx-2."
  }
 ],
 "intermediates": [
  {
   "name": "vinylic cation",
   "smiles": "C=[C+]CCCC"
  },
  {
   "name": "bromo-substituted cation (2nd addition)",
   "smiles": "C[C+](Br)CCCC"
  }
 ],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "3": "C3",
  "6": "C6",
  "7": "H(a)",
  "8": "Br(a)",
  "9": "H(b)",
  "10": "Br(b)"
 },
 "stage": {
  "species": [
   {
    "key": "alkyne",
    "role": "reactant",
    "smiles": "[CH:1]#[C:2][CH2:3][CH2:4][CH2:5][CH3:6]",
    "label": "hex-1-yne",
    "at": [0, 0],
    "style": "skeletal",
    "notes": "Keep H–C1≡C2–C3 on one straight line (sp carbons, 180°)."
   },
   {
    "key": "HBr",
    "role": "reagent",
    "smiles": "[H:7][Br:8]",
    "label": "HBr",
    "at": [-2.2, -1.0],
    "style": "full"
   }
  ],
  "state": "[CH:1]#[C:2][CH2:3][CH2:4][CH2:5][CH3:6].[H:7][Br:8]"
 },
 "layers": ["arrows", "orbitals"],
 "duration": 39.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0.0,
   "t1": 3.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Hex-1-yne meets HBr. A triple bond holds two π bonds, so it has π electrons to give.",
   "captionOrbitals": "Two π clouds at right angles: one above and below the line, one in front and behind.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [{"atom": 7, "sign": "+"}, {"atom": 8, "sign": "-"}],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [1, 2],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "plane": "z"
    },
    {
     "kind": "pi",
     "atoms": [1, 2],
     "side": "both",
     "emphasis": "normal",
     "electrons": 2,
     "plane": "y"
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 7],
    "tilt": 35
   },
   "faces": {
    "show": false
   },
   "state": "[CH:1]#[C:2][CH2:3][CH2:4][CH2:5][CH3:6].[H:7][Br:8]"
  },
  {
   "id": "b2-choose",
   "t0": 4.0,
   "t1": 7.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "H goes to C1, the end carbon that already has an H. Then the + lands on C2, the more substituted carbon.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [1, 2],
     "side": "both",
     "emphasis": "normal",
     "electrons": 2,
     "plane": "z"
    }
   ],
   "badges": [{"atom": 2, "text": "+ here", "tone": "elec"}, {"atom": 1, "text": "H here", "tone": "muted"}],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH:1]#[C:2][CH2:3][CH2:4][CH2:5][CH3:6].[H:7][Br:8]"
  },
  {
   "id": "b3-attack",
   "t0": 8.0,
   "t1": 12.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "One π pair of the triple bond takes the δ+ H onto C1. The H–Br pair leaves with Br as Br⁻.",
   "moves": [
    {
     "species": "HBr",
     "anchor": 7,
     "near": 1,
     "offset": [-0.6, -0.9, 0],
     "at": [0, 0.35]
    },
    {
     "atoms": [8],
     "by": [-0.8, -0.6, 0],
     "at": [0.75, 1]
    }
   ],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [1, 2]
     },
     "to": {
      "bond": [1, 7]
     },
     "electrons": "pair",
     "tone": {
      "src": "nuc",
      "dst": "elec"
     },
     "path": {
      "bend": "auto",
      "amount": 0.35
     },
     "at": [0.3, 0.75],
     "why": "A π pair of the triple bond attacks the δ+ H of H–Br and forms a new C–H bond on C1, the carbon with more H."
    },
    {
     "id": "a2",
     "from": {
      "bond": [7, 8]
     },
     "to": {
      "atom": 8
     },
     "electrons": "pair",
     "tone": {
      "src": "none",
      "dst": "none"
     },
     "path": {
      "bend": "auto",
      "amount": 0.35
     },
     "at": [0.45, 0.95],
     "why": "The H–Br pair leaves with Br, so Br becomes Br⁻. C2 is left with the +."
    }
   ],
   "bonds": [
    {
     "a": 1,
     "b": 2,
     "action": "order",
     "order": 2
    },
    {
     "a": 1,
     "b": 7,
     "action": "form",
     "order": 1
    },
    {
     "a": 7,
     "b": 8,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [{"atom": 2, "charge": 1}, {"atom": 8, "charge": -1}],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [2],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0,
     "plane": "y"
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:7][CH:1]=[C+:2][CH2:3][CH2:4][CH2:5][CH3:6].[Br-:8]"
  },
  {
   "id": "b4-vinyl",
   "t0": 13.0,
   "t1": 16.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "The + sits on C2, a carbon of the new C=C: a vinylic carbocation. It has an empty p orbital.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [2],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0,
     "plane": "y",
     "label": "empty p"
    },
    {
     "kind": "pi",
     "atoms": [1, 2],
     "side": "both",
     "emphasis": "normal",
     "electrons": 2,
     "plane": "z"
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.3,
    "focus": [2],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:7][CH:1]=[C+:2][CH2:3][CH2:4][CH2:5][CH3:6].[Br-:8]",
   "notes": "C2 is sp: draw C1=C2–C3 straight. The empty p lies in the drawing plane (plane y), at 90° to the remaining π bond (plane z)."
  },
  {
   "id": "b5-bromide",
   "t0": 17.0,
   "t1": 21.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Br⁻ gives a lone pair to C2. With one HBr it stops here: 2-bromohex-1-ene, a vinylic halide.",
   "moves": [{"atoms": [8], "anchor": 8, "near": 2, "offset": [0, -1.4, 0], "at": [0, 0.4]}],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 8
     },
     "to": {
      "atom": 2
     },
     "electrons": "pair",
     "tone": {
      "src": "nuc",
      "dst": "elec"
     },
     "path": {
      "bend": "auto",
      "amount": 0.35
     },
     "at": [0.35, 0.9],
     "why": "A lone pair on Br⁻ attacks the + carbon and forms the new C–Br bond, giving the vinylic halide."
    }
   ],
   "bonds": [{"a": 2, "b": 8, "action": "form", "order": 1}],
   "charges": [{"atom": 2, "charge": 0}, {"atom": 8, "charge": 0}],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [2],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0,
     "plane": "y"
    },
    {
     "kind": "lone-pair",
     "atoms": [8],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "toward": 2
    }
   ],
   "badges": [{"atom": 2, "text": "1 equiv. ends here", "tone": "muted"}],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [2],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:7][CH:1]=[C:2]([Br:8])[CH2:3][CH2:4][CH2:5][CH3:6]"
  },
  {
   "id": "b6-second",
   "t0": 22.0,
   "t1": 26.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "A second HBr adds the same way. The π pair puts H on C1 again, and the + lands on C2 again.",
   "adds": [
    {
     "key": "HBr2",
     "role": "reagent",
     "smiles": "[H:9][Br:10]",
     "label": "HBr (2nd)",
     "at": "auto",
     "style": "full"
    }
   ],
   "moves": [
    {
     "atoms": [9, 10],
     "anchor": 9,
     "near": 1,
     "offset": [-0.6, 0.9, 0],
     "at": [0, 0.35]
    },
    {
     "atoms": [10],
     "by": [-0.8, 0.6, 0],
     "at": [0.75, 1]
    }
   ],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [1, 2]
     },
     "to": {
      "bond": [1, 9]
     },
     "electrons": "pair",
     "tone": {
      "src": "nuc",
      "dst": "elec"
     },
     "path": {
      "bend": "auto",
      "amount": 0.35
     },
     "at": [0.3, 0.75],
     "why": "The C=C π pair attacks the H of the second HBr; H bonds to C1 again, the carbon with more H."
    },
    {
     "id": "a2",
     "from": {
      "bond": [9, 10]
     },
     "to": {
      "atom": 10
     },
     "electrons": "pair",
     "tone": {
      "src": "none",
      "dst": "none"
     },
     "path": {
      "bend": "auto",
      "amount": 0.35
     },
     "at": [0.45, 0.95],
     "why": "The H–Br pair leaves with Br as Br⁻. The + is on C2 once more."
    }
   ],
   "bonds": [
    {
     "a": 1,
     "b": 2,
     "action": "order",
     "order": 1
    },
    {
     "a": 1,
     "b": 9,
     "action": "form",
     "order": 1
    },
    {
     "a": 9,
     "b": 10,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [{"atom": 2, "charge": 1}, {"atom": 10, "charge": -1}],
   "partials": [],
   "orbitals": [{"kind": "p-empty", "atoms": [2], "side": "both", "emphasis": "focus", "electrons": 0}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [2],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:7][CH:1]([H:9])[C+:2]([Br:8])[CH2:3][CH2:4][CH2:5][CH3:6].[Br-:10]"
  },
  {
   "id": "b7-why",
   "t0": 27.0,
   "t1": 30.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "C2 is the more substituted carbon, and the Br already on it can share the + using a lone pair.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [2],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0
    },
    {
     "kind": "lone-pair",
     "atoms": [8],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "toward": 2
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.3,
    "focus": [2, 8],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:7][CH:1]([H:9])[C+:2]([Br:8])[CH2:3][CH2:4][CH2:5][CH3:6].[Br-:10]",
   "notes": "The card states the result only (\"Br on the SAME carbon\"). The lone-pair reason is one step deeper than the course; keep it in this look beat only."
  },
  {
   "id": "b8-bromide2",
   "t0": 31.0,
   "t1": 35.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "The second Br⁻ bonds to C2 as well. Both Br end up on one carbon: a geminal dibromide.",
   "moves": [{"atoms": [10], "anchor": 10, "near": 2, "offset": [0.3, 1.3, 0], "at": [0, 0.4]}],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 10
     },
     "to": {
      "atom": 2
     },
     "electrons": "pair",
     "tone": {
      "src": "nuc",
      "dst": "elec"
     },
     "path": {
      "bend": "auto",
      "amount": 0.35
     },
     "at": [0.35, 0.9],
     "why": "A lone pair on the second Br⁻ attacks the + carbon, C2, and forms a second C–Br bond on it."
    }
   ],
   "bonds": [{"a": 2, "b": 10, "action": "form", "order": 1}],
   "charges": [{"atom": 2, "charge": 0}, {"atom": 10, "charge": 0}],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [2, 8],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:7][CH:1]([H:9])[C:2]([Br:8])([Br:10])[CH2:3][CH2:4][CH2:5][CH3:6]"
  },
  {
   "id": "b9-product",
   "t0": 36.0,
   "t1": 39.0,
   "hold": 0,
   "kind": "look",
   "caption": "2,2-Dibromohexane. Markovnikov twice: both H went to C1, and both Br went to C2.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:7][CH:1]([H:9])[C:2]([Br:8])([Br:10])[CH2:3][CH2:4][CH2:5][CH3:6]",
   "relayout": {
    "anchor": [1, 2]
   }
  }
 ],
 "stereoCallout": {
  "title": "No stereo to show",
  "stereoMoment": null,
  "text": "HX on an alkyne has nothing to mark here: the vinylic bromide C=C(Br) has two H on C1 (no E/Z), and C2 of the gem-dibromide holds two Br (no stereocentre). The point of the scene is regiochemistry: Markovnikov, twice, onto the same carbon."
 },
 "whatIf": ["01-alkene-hx", "09-alkyne-hydration", "10-alkyne-lindlar"],
 "quiz": {
  "q": "Hex-1-yne is treated with two equivalents of HBr. Which product forms?",
  "options": [
   {
    "text": "2,2-Dibromohexane.",
    "correct": true,
    "why": "Yes. Both times H goes to C1 and the + forms on C2, so both Br land on C2."
   },
   {
    "text": "1,2-Dibromohexane.",
    "correct": false,
    "why": "Each H goes to C1, so each + forms on C2. Both Br go to C2, not one to each carbon."
   },
   {
    "text": "(E)-1,2-Dibromohex-1-ene.",
    "correct": false,
    "why": "That is what Br₂ gives (anti addition of two Br). HBr adds H and Br."
   }
  ]
 },
 "notes": ["Matches Lesson 12 s07 arrows (alkyneHXMechanism): two arrows in step 1, one in step 2. Lesson uses propyne; the scene uses the hub example hex-1-yne."]
}
```

</details>
