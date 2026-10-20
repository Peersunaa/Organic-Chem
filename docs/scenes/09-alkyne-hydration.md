# 09 · Hg²⁺-catalysed hydration of hex-1-yne

**Scene id** `09-alkyne-hydration` · **Hub card** `alkyne-hydration` · **Taught in** Lesson 12 s09 · **Runtime** 42 s, 9 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "Hg²⁺ grabs a π pair at the end carbon, so the + lands on C2 (Markovnikov). Water bonds to C2 and loses H⁺; H⁺ then replaces the Hg. That gives an enol, C=C–OH, which tautomerises at once: C1 gains an H and the O becomes C=O. A terminal alkyne gives a methyl ketone."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `alkyne` | reactant | `[CH:1]#[C:2][CH2:3][CH2:4][CH2:5][CH3:6]` | hex-1-yne | [0, 0] | skeletal |
| `Hg` | catalyst | `[Hg+2:7]` | Hg²⁺ (from HgSO₄) | [-2.0, -1.2] | full |
| `water` | reagent | `[H:9][O:8][H:15]` | H₂O | [1.0, -2.0] | full |

Layout note for `alkyne`: H–C1≡C2–C3 straight.

Atom names used in captions and tables: 1 = C1, 2 = C2, 3 = C3, 7 = Hg, 8 = O, 9 = H(a), 10 = O(w), 13 = H(c), 14 = O(w2), 15 = H(b).

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | Hex-1-yne in water with H₂SO₄ and HgSO₄. Water alone cannot add; Hg²⁺ is what starts the job. | hold the picture | π cloud C1–C2 (both faces, 2 e⁻, focus) | zoom 1, tilt 0°, focus C1/C2/Hg |
| 2 | `b2-hg` · step | 4–8 (+1 hold) | One π pair bonds C1 to Hg²⁺. That leaves the + on C2, the more substituted carbon: Markovnikov. | Hg moves to C1<br>**arrows:** (1) π(C1≡C2) → new bond C1–Hg<br>bonds: C1≡C2 → C1=C2, forms C1–Hg<br>charges: C2 +, Hg + | empty p orbital C2 (both faces, in-plane lobes, focus) | zoom 1, tilt 0°, focus C1/C2/Hg |
| 3 | `b3-water` · step | 9–13 (+1 hold) | Water gives an O lone pair to C2. The O now has three bonds and a + charge. | O, H(a), H(b) moves to C2<br>**arrows:** (1) lone pair on O → C2 (new O–C2 bond)<br>bonds: forms C2–O<br>charges: C2 0, O + | lone-pair lobe O (both faces, 2 e⁻, pointing at C2, focus) | zoom 1, tilt 0°, focus C1/C2/Hg |
| 4 | `b4-deprot` · step | 14–18 (+1 hold) | Another water takes H⁺ off that O. C2 now holds an OH, and C1 still holds the Hg. | adds H₂O<br>O(w) moves to H(a); H(a), O(w) drifts aside<br>**arrows:** (1) lone pair on O(w) → H(a) (new O(w)–H(a) bond) · (2) σ(O–H(a)) → onto O<br>bonds: breaks O–H(a), forms H(a)–O(w)<br>charges: O 0, O(w) + | — | zoom 1, tilt 0°, focus C1/C2/Hg |
| 5 | `b5-swap` · step | 19–23 (+1 hold) | H⁺ then replaces the Hg on C1, and Hg²⁺ is set free to work again. The result is an enol. | H(a) moves to C1; Hg drifts aside<br>**no curved arrows** (surface: motion trails only)<br>bonds: breaks C1–Hg, forms C1–H(a), breaks H(a)–O(w)<br>charges: Hg +2, O(w) 0 | — | zoom 1, tilt 0°, focus C1/C2/Hg |
| 6 | `b6-enol` · look | 24–27 (+1 hold) | An enol: OH on a C=C carbon. The O lone pair pushes into the C=C, so C1 is rich in electrons. | fades out Hg, O(w)<br>badges: C1 “electron-rich” | π cloud C1–C2 (both faces, 2 e⁻, focus); lone-pair lobe O (both faces, 2 e⁻, pointing at C2, focus) | zoom 1, tilt 0°, focus C1/C2/Hg |
| 7 | `b7-tauto1` · step | 28–33 (+1 hold) | Tautomerism, step 1: the π pair takes H⁺ from H₃O⁺ onto C1, and the O lone pair forms C=O⁺. | adds H₃O⁺<br>H(c), O(w2) moves to C1; O(w2) drifts aside<br>**arrows:** (1) π(C1=C2) → new bond C1–H(c) · (2) σ(H(c)–O(w2)) → onto O(w2) · (3) lone pair on O → O–C2 gains a pair<br>bonds: C1=C2 → C1–C2, forms C1–H(c), C2–O → C2=O, breaks H(c)–O(w2)<br>charges: O +, O(w2) 0 | π cloud C2–O (both faces, 2 e⁻) | zoom 1, tilt 0°, focus C1/C2/Hg |
| 8 | `b8-tauto2` · step | 34–38 (+1 hold) | Step 2: water takes the H⁺ off O. The C=O stays. The ketone is far more stable than the enol. | O(w2) moves to H(b); O(w2), H(b) drifts aside<br>**arrows:** (1) lone pair on O(w2) → H(b) (new O(w2)–H(b) bond) · (2) σ(O–H(b)) → onto O<br>bonds: breaks O–H(b), forms O(w2)–H(b)<br>charges: O 0, O(w2) + | π cloud C2–O (both faces, 2 e⁻) | zoom 1, tilt 0°, focus C1/C2/Hg |
| 9 | `b9-product` · look | 39–42 (+0 hold) | Hexan-2-one, a methyl ketone. The C=O sits on C2, the carbon where the OH went. | fades out O(w2)<br>relayout to the product drawing | — | zoom 1, tilt 0° |

Beat notes for the implementer:

- `b5-swap`: Summary beat (the course card skips the Hg steps): no arrows; the H⁺ dot travels from H₃O⁺ to C1 and the Hg²⁺ drifts off with a "catalyst" badge.

## Chemistry checks

- Reactant: `C#CCCCC` (hex-1-yne). Reagent: H₂O, H₂SO₄, HgSO₄ (`O`).
- Intermediate: `[Hg+]C=[C+]CCCC`, mercury-bonded vinylic cation.
- Intermediate: `[Hg+]C=C(O)CCCC`, mercury enol.
- Intermediate: `C=C(O)CCCC`, enol (hex-1-en-2-ol).
- Intermediate: `CC(=[OH+])CCCC`, protonated ketone (oxocarbenium).
- Product: `CCCCC(C)=O`, hexan-2-one (a methyl ketone). RDKit: no stereocentre.
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.
- Implementer must verify with RDKit:
  - RDKit-JS must accept [Hg+2] and [Hg+] bonded to carbon for the layout of b2–b4.

## Stereo callout

**No stereo; watch the H move**

Nothing to mark in 3D. The thing to see is the tautomerism: enol (C=C–OH) and ketone (H–C–C=O) differ only in where one H and the π bond sit. They are NOT resonance forms: an atom (H) moves. A terminal alkyne gives a methyl ketone; a symmetrical internal alkyne one ketone; an unsymmetrical internal alkyne a mixture of two.

## What-if links

[02-alkene-hydration](02-alkene-hydration.md), [08-alkyne-hx](08-alkyne-hx.md), [07-alkene-hydroboration](07-alkene-hydroboration.md)

## End quiz

**Hex-1-yne is treated with H₂O, H₂SO₄ and HgSO₄. What do you isolate?**

A. Hexan-2-one. **(correct)**  
   Why: Yes. OH goes to C2 (Markovnikov), and the enol tautomerises to the ketone with C=O on C2.
B. Hex-1-en-2-ol (the enol).   
   Diagnosis: The enol forms first but tautomerises at once; the ketone is what you collect.
C. Hexanal.   
   Diagnosis: An aldehyde needs OH on C1 (anti-Markovnikov), which is what hydroboration does. Hg²⁺ puts OH on C2.

## Notes

- Course level: the hub card and Lesson 12 s09 show "Markovnikov OH → enol → tautomerises" without the mercury steps. Beats 2–5 add the McMurry Hg²⁺ path at one-arrow-per-idea level; beat 5 is a summary (no arrows) for the Hg-for-H swap.
- Tautomerism is drawn acid-catalysed (protonate C1, then deprotonate O), the textbook path; the card's "the OH hydrogen moves" is the net result.

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "09-alkyne-hydration",
 "title": "Hg²⁺-catalysed hydration of hex-1-yne",
 "reagentCard": "alkyne-hydration",
 "alsoCards": [],
 "lesson": {
  "id": "12",
  "step": "s09"
 },
 "intent": "After this scene the learner can say: \"Hg²⁺ grabs a π pair at the end carbon, so the + lands on C2 (Markovnikov). Water bonds to C2 and loses H⁺; H⁺ then replaces the Hg. That gives an enol, C=C–OH, which tautomerises at once: C1 gains an H and the O becomes C=O. A terminal alkyne gives a methyl ketone.\"",
 "reactant": {
  "smiles": "C#CCCCC",
  "name": "hex-1-yne"
 },
 "reagent": {
  "smiles": "O",
  "label": "H₂O, H₂SO₄, HgSO₄"
 },
 "products": [{"smiles": "CCCCC(C)=O", "name": "hexan-2-one (a methyl ketone)", "stereo": "achiral"}],
 "intermediates": [
  {
   "name": "mercury-bonded vinylic cation",
   "smiles": "[Hg+]C=[C+]CCCC"
  },
  {
   "name": "mercury enol",
   "smiles": "[Hg+]C=C(O)CCCC"
  },
  {
   "name": "enol (hex-1-en-2-ol)",
   "smiles": "C=C(O)CCCC"
  },
  {
   "name": "protonated ketone (oxocarbenium)",
   "smiles": "CC(=[OH+])CCCC"
  }
 ],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "3": "C3",
  "7": "Hg",
  "8": "O",
  "9": "H(a)",
  "10": "O(w)",
  "13": "H(c)",
  "14": "O(w2)",
  "15": "H(b)"
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
    "notes": "H–C1≡C2–C3 straight."
   },
   {
    "key": "Hg",
    "role": "catalyst",
    "smiles": "[Hg+2:7]",
    "label": "Hg²⁺ (from HgSO₄)",
    "at": [-2.0, -1.2],
    "style": "full"
   },
   {
    "key": "water",
    "role": "reagent",
    "smiles": "[H:9][O:8][H:15]",
    "label": "H₂O",
    "at": [1.0, -2.0],
    "style": "full"
   }
  ],
  "state": "[CH:1]#[C:2][CH2:3][CH2:4][CH2:5][CH3:6].[Hg+2:7].[H:9][O:8][H:15]"
 },
 "layers": ["arrows", "orbitals"],
 "duration": 42.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0.0,
   "t1": 3.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Hex-1-yne in water with H₂SO₄ and HgSO₄. Water alone cannot add; Hg²⁺ is what starts the job.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [1, 2],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "plane": "z"
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH:1]#[C:2][CH2:3][CH2:4][CH2:5][CH3:6].[Hg+2:7].[H:9][O:8][H:15]"
  },
  {
   "id": "b2-hg",
   "t0": 4.0,
   "t1": 8.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "One π pair bonds C1 to Hg²⁺. That leaves the + on C2, the more substituted carbon: Markovnikov.",
   "moves": [{"atoms": [7], "anchor": 7, "near": 1, "offset": [-0.7, -1.0, 0], "at": [0, 0.35]}],
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
     "at": [0.3, 0.9],
     "why": "A π pair of the triple bond reaches Hg²⁺ and becomes a C1–Hg bond. Hg keeps one + charge."
    }
   ],
   "bonds": [{"a": 1, "b": 2, "action": "order", "order": 2}, {"a": 1, "b": 7, "action": "form", "order": 1}],
   "charges": [{"atom": 2, "charge": 1}, {"atom": 7, "charge": 1}],
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
    "zoom": 1,
    "focus": [1, 2, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[Hg+:7][CH:1]=[C+:2][CH2:3][CH2:4][CH2:5][CH3:6].[H:9][O:8][H:15]"
  },
  {
   "id": "b3-water",
   "t0": 9.0,
   "t1": 13.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Water gives an O lone pair to C2. The O now has three bonds and a + charge.",
   "moves": [{"atoms": [8, 9, 15], "anchor": 8, "near": 2, "offset": [0, -1.4, 0], "at": [0, 0.4]}],
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
     "why": "A lone pair on the water O attacks the + carbon and forms a C–O bond."
    }
   ],
   "bonds": [{"a": 2, "b": 8, "action": "form", "order": 1}],
   "charges": [{"atom": 2, "charge": 0}, {"atom": 8, "charge": 1}],
   "partials": [],
   "orbitals": [
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
    "zoom": 1,
    "focus": [1, 2, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[Hg+:7][CH:1]=[C:2]([O+:8]([H:9])[H:15])[CH2:3][CH2:4][CH2:5][CH3:6]"
  },
  {
   "id": "b4-deprot",
   "t0": 14.0,
   "t1": 18.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Another water takes H⁺ off that O. C2 now holds an OH, and C1 still holds the Hg.",
   "adds": [
    {
     "key": "water2",
     "role": "solvent",
     "smiles": "[OH2:10]",
     "label": "H₂O",
     "at": "auto",
     "style": "full"
    }
   ],
   "moves": [
    {
     "atoms": [10],
     "anchor": 10,
     "near": 9,
     "offset": [0.9, -0.4, 0],
     "at": [0, 0.3]
    },
    {
     "atoms": [9, 10],
     "by": [0.8, -0.5, 0],
     "at": [0.8, 1]
    }
   ],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 10
     },
     "to": {
      "atom": 9
     },
     "electrons": "pair",
     "tone": {
      "src": "nuc",
      "dst": "none"
     },
     "path": {
      "bend": "auto",
      "amount": 0.35
     },
     "at": [0.3, 0.75],
     "why": "A lone pair on a second water takes H⁺ from the oxonium O."
    },
    {
     "id": "a2",
     "from": {
      "bond": [8, 9]
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
     "why": "The O–H pair stays on O, which loses its + and is now an OH group."
    }
   ],
   "bonds": [{"a": 8, "b": 9, "action": "break", "order": 0}, {"a": 9, "b": 10, "action": "form", "order": 1}],
   "charges": [{"atom": 8, "charge": 0}, {"atom": 10, "charge": 1}],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[Hg+:7][CH:1]=[C:2]([O:8][H:15])[CH2:3][CH2:4][CH2:5][CH3:6].[H:9][OH2+:10]"
  },
  {
   "id": "b5-swap",
   "t0": 19.0,
   "t1": 23.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "H⁺ then replaces the Hg on C1, and Hg²⁺ is set free to work again. The result is an enol.",
   "moves": [
    {
     "atoms": [9],
     "anchor": 9,
     "near": 1,
     "offset": [-0.9, -0.5, 0],
     "at": [0.1, 0.7],
     "trail": true
    },
    {
     "atoms": [7],
     "by": [-1.2, -0.8, 0],
     "at": [0.5, 1]
    }
   ],
   "arrows": [],
   "bonds": [
    {
     "a": 1,
     "b": 7,
     "action": "break",
     "order": 0
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
   "charges": [{"atom": 7, "charge": 2}, {"atom": 10, "charge": 0}],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:9][CH:1]=[C:2]([O:8][H:15])[CH2:3][CH2:4][CH2:5][CH3:6].[Hg+2:7].[OH2:10]",
   "notes": "Summary beat (the course card skips the Hg steps): no arrows; the H⁺ dot travels from H₃O⁺ to C1 and the Hg²⁺ drifts off with a \"catalyst\" badge."
  },
  {
   "id": "b6-enol",
   "t0": 24.0,
   "t1": 27.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "An enol: OH on a C=C carbon. The O lone pair pushes into the C=C, so C1 is rich in electrons.",
   "drops": [7, 10],
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [1, 2],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2
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
   "badges": [{"atom": 1, "text": "electron-rich", "tone": "nuc"}],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:9][CH:1]=[C:2]([O:8][H:15])[CH2:3][CH2:4][CH2:5][CH3:6]"
  },
  {
   "id": "b7-tauto1",
   "t0": 28.0,
   "t1": 33.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Tautomerism, step 1: the π pair takes H⁺ from H₃O⁺ onto C1, and the O lone pair forms C=O⁺.",
   "adds": [
    {
     "key": "H3O",
     "role": "catalyst",
     "smiles": "[H:13][OH2+:14]",
     "label": "H₃O⁺",
     "at": "auto",
     "style": "full"
    }
   ],
   "moves": [
    {
     "atoms": [13, 14],
     "anchor": 13,
     "near": 1,
     "offset": [-0.6, 0.9, 0],
     "at": [0, 0.3]
    },
    {
     "atoms": [14],
     "by": [-0.8, 0.6, 0],
     "at": [0.8, 1]
    }
   ],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [1, 2]
     },
     "to": {
      "bond": [1, 13]
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
     "at": [0.25, 0.7],
     "why": "The enol C=C π pair takes H⁺ from H₃O⁺; C1 becomes a CH₃."
    },
    {
     "id": "a2",
     "from": {
      "bond": [13, 14]
     },
     "to": {
      "atom": 14
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
     "at": [0.35, 0.8],
     "why": "The O–H pair of H₃O⁺ stays on its O, which becomes water."
    },
    {
     "id": "a3",
     "from": {
      "lp": 8
     },
     "to": {
      "bond": [8, 2]
     },
     "electrons": "pair",
     "tone": {
      "src": "nuc",
      "dst": "none"
     },
     "path": {
      "bend": "auto",
      "amount": 0.35
     },
     "at": [0.45, 0.95],
     "why": "The O lone pair moves in to make C=O⁺, so C2 never has to carry the + alone."
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
     "b": 13,
     "action": "form",
     "order": 1
    },
    {
     "a": 2,
     "b": 8,
     "action": "order",
     "order": 2
    },
    {
     "a": 13,
     "b": 14,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [{"atom": 8, "charge": 1}, {"atom": 14, "charge": 0}],
   "partials": [],
   "orbitals": [{"kind": "pi", "atoms": [2, 8], "side": "both", "emphasis": "normal", "electrons": 2}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:9][CH:1]([H:13])[C:2](=[O+:8][H:15])[CH2:3][CH2:4][CH2:5][CH3:6].[OH2:14]"
  },
  {
   "id": "b8-tauto2",
   "t0": 34.0,
   "t1": 38.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Step 2: water takes the H⁺ off O. The C=O stays. The ketone is far more stable than the enol.",
   "moves": [
    {
     "atoms": [14],
     "anchor": 14,
     "near": 15,
     "offset": [0.9, -0.3, 0],
     "at": [0, 0.3]
    },
    {
     "atoms": [14, 15],
     "by": [0.8, -0.4, 0],
     "at": [0.8, 1]
    }
   ],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 14
     },
     "to": {
      "atom": 15
     },
     "electrons": "pair",
     "tone": {
      "src": "nuc",
      "dst": "none"
     },
     "path": {
      "bend": "auto",
      "amount": 0.35
     },
     "at": [0.3, 0.75],
     "why": "A lone pair on water takes the H⁺ from the O–H⁺ group."
    },
    {
     "id": "a2",
     "from": {
      "bond": [8, 15]
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
     "why": "The O–H pair stays on O: a neutral C=O, the ketone. H₃O⁺ is made again."
    }
   ],
   "bonds": [
    {
     "a": 8,
     "b": 15,
     "action": "break",
     "order": 0
    },
    {
     "a": 14,
     "b": 15,
     "action": "form",
     "order": 1
    }
   ],
   "charges": [{"atom": 8, "charge": 0}, {"atom": 14, "charge": 1}],
   "partials": [],
   "orbitals": [{"kind": "pi", "atoms": [2, 8], "side": "both", "emphasis": "normal", "electrons": 2}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:9][CH:1]([H:13])[C:2](=[O:8])[CH2:3][CH2:4][CH2:5][CH3:6].[H:15][OH2+:14]"
  },
  {
   "id": "b9-product",
   "t0": 39.0,
   "t1": 42.0,
   "hold": 0,
   "kind": "look",
   "caption": "Hexan-2-one, a methyl ketone. The C=O sits on C2, the carbon where the OH went.",
   "drops": [14],
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
   "state": "[H:9][CH:1]([H:13])[C:2](=[O:8])[CH2:3][CH2:4][CH2:5][CH3:6]",
   "relayout": {
    "anchor": [1, 2]
   }
  }
 ],
 "stereoCallout": {
  "title": "No stereo; watch the H move",
  "stereoMoment": null,
  "text": "Nothing to mark in 3D. The thing to see is the tautomerism: enol (C=C–OH) and ketone (H–C–C=O) differ only in where one H and the π bond sit. They are NOT resonance forms: an atom (H) moves. A terminal alkyne gives a methyl ketone; a symmetrical internal alkyne one ketone; an unsymmetrical internal alkyne a mixture of two."
 },
 "whatIf": ["02-alkene-hydration", "08-alkyne-hx", "07-alkene-hydroboration"],
 "quiz": {
  "q": "Hex-1-yne is treated with H₂O, H₂SO₄ and HgSO₄. What do you isolate?",
  "options": [
   {
    "text": "Hexan-2-one.",
    "correct": true,
    "why": "Yes. OH goes to C2 (Markovnikov), and the enol tautomerises to the ketone with C=O on C2."
   },
   {
    "text": "Hex-1-en-2-ol (the enol).",
    "correct": false,
    "why": "The enol forms first but tautomerises at once; the ketone is what you collect."
   },
   {
    "text": "Hexanal.",
    "correct": false,
    "why": "An aldehyde needs OH on C1 (anti-Markovnikov), which is what hydroboration does. Hg²⁺ puts OH on C2."
   }
  ]
 },
 "notes": ["Course level: the hub card and Lesson 12 s09 show \"Markovnikov OH → enol → tautomerises\" without the mercury steps. Beats 2–5 add the McMurry Hg²⁺ path at one-arrow-per-idea level; beat 5 is a summary (no arrows) for the Hg-for-H swap.", "Tautomerism is drawn acid-catalysed (protonate C1, then deprotonate O), the textbook path; the card's \"the OH hydrogen moves\" is the net result."]
}
```

</details>
