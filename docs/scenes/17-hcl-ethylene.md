# 17 · HCl adds to ethylene: the model polar reaction

**Scene id** `17-hcl-ethylene` · **Hub card** `alkene-hx` (primer: the card keeps scene 01 as its own) · **Taught in** Lesson 08 s17 (also s13, s15) · **Runtime** 33 s, 8 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state and product here was checked with RDKit (see Chemistry checks).

## Intent

After this scene the learner can say: "The π pair (rich) bonds to the δ+ H (poor) and the H–Cl pair goes to Cl. That leaves a flat carbocation with an empty p orbital; Cl⁻ gives a lone pair into it. Every arrow runs from rich to poor."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `ethylene` | reactant | `[CH2:1]=[CH2:2]` | ethylene | [0, 0] | full |
| `HCl` | reagent | `[H:3][Cl:4]` | HCl | [2.4, -0.9] | full |

Atom names used in captions and tables: 1 = C1, 2 = C2, 3 = H, 4 = Cl.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | Ethylene meets HCl. The C=C holds a π pair above and below the flat molecule: electron-rich. | δ: H δ+, Cl δ− | pi C1/C2 (both, focus)<br>*caption swaps to:* “The π cloud: two electrons above and below the C=C, easy for a reagent to reach.” | zoom 1.4, tilt 35° |
| 2 | `b2-poor` · look | 4–7 (+1 hold) | Cl pulls the H–Cl pair toward itself, so H is δ+: electron-poor. Rich will give a pair to poor. | δ: H δ+, Cl δ−<br>badges: C1 “rich: π pair”, H “poor: δ+” | pi C1/C2 (both, normal) | zoom 1.4, tilt 0° |
| 3 | `b3-attack` · step | 8–12 (+1 hold) | The π pair swings over and bonds to H. H holds only two electrons, so the H–Cl pair moves onto Cl. | moves: HCl; atoms Cl<br>**arrows:** (1) bond C1–C2 → bond C1–H · (2) bond H–Cl → Cl (pair onto it)<br>bonds: order C1–C2 (order 1), form C1–H, break H–Cl<br>charges: C2 +, Cl − | p-empty C2 (both, focus) | zoom 1.4, tilt 0° |
| 4 | `b4-cation` · look | 13–16 (+1 hold) | C2 now has three bonds and six electrons. It is flat, with an empty p orbital above and below. | hold the picture | p-empty C2 (both, focus) | zoom 1.3, tilt 65°, faces shown |
| 5 | `b5-six` · look | 17–20 (+1 hold) | This carbocation is real but short-lived: it is the intermediate that links step 1 to step 2. | badges: C2 “6 e⁻”, Cl “rich: Cl⁻” | p-empty C2 (both, normal) | zoom 1.1, tilt 0° |
| 6 | `b6-chloride` · step | 21–25 (+1 hold) | Cl⁻ gives a lone pair to the empty p orbital: rich to poor again. The new C–Cl bond forms. | moves: atoms Cl<br>**arrows:** (1) lone pair on Cl → C2 (new bond)<br>bonds: form C2–Cl<br>charges: C2 0, Cl 0 | p-empty C2 (top, focus)<br>lone-pair Cl (both, focus) | zoom 1.1, tilt 55°, faces shown |
| 7 | `b7-either` · look | 26–29 (+1 hold) | Cl⁻ could just as well come from the bottom face. Both faces give the same chloroethane. | ghost: or from below | p-empty C2 (bottom, ghost) | zoom 1.1, tilt 55°, faces shown |
| 8 | `b8-product` · look | 30–33 (+0 hold) | Chloroethane: H on one carbon, Cl on the other. Two steps, three arrows, each from rich to poor. | relayout to the final drawing | — | zoom 1.5, tilt 0° |

Why lines (shown while each arrow's electrons travel):

- `b3-attack/a1`: Bond → new bond: the π pair, the rich site, makes a new C–H bond to the δ+ H.
- `b3-attack/a2`: Bond → atom: the H–Cl pair stays on Cl, the atom that pulls harder, so Cl becomes Cl⁻.
- `b6-chloride/a1`: Lone pair → atom: a Cl⁻ pair goes into the empty p orbital of the + carbon and becomes the C–Cl bond.

## Chemistry checks

- Reactant: `C=C` (ethylene). Reagent: HCl (`Cl`).
- Intermediate: `C[CH2+]`, ethyl cation (1°). It is the cation of Lesson 08: the lesson explains it by electron count (six electrons) and the empty p orbital; its low stability is why the course moves to 2° and 3° cations in s18-s20 and Lesson 09.
- Product: `CCCl`, chloroethane. RDKit: no stereocentre (C2 ends with two H), so either face of the flat cation gives the same molecule.
- Checked with Python RDKit for every beat: the state parses, the element formula (C2H5Cl) and total charge (0) never change, and the last state flattened is chloroethane. tests/scenes.mjs redoes checks 4 and 5 (the arrows explain the bond and charge changes) on the compiled layout.

## Stereo callout

**Flat cation, two faces**

The + carbon is flat, so Cl⁻ can arrive from the top or the bottom face. Here C2 ends with two H, so both faces give one compound. Lesson 09 shows when the two faces give two mirror-image products.

## What-if links

[01-alkene-hx](01-alkene-hx.md), [18-arrow-grammar](18-arrow-grammar.md)

## End quiz

**Why does the H–Cl bond break in step 1?**

A. H can hold only two electrons, so as the π pair bonds to H, the old H–Cl pair must leave, onto Cl. **(correct)**  
   Why: Yes. The new C–H bond uses up H's room for two electrons, so the H–Cl pair goes to Cl, the atom that pulls harder.
B. Cl⁻ attacks the carbon first and pushes the H off.  
   Diagnosis: Cl⁻ does not exist yet in step 1: it is made when the H–Cl pair moves onto Cl. Its attack is step 2.
C. The π pair goes to Cl and pulls it away from H.  
   Diagnosis: The π pair goes to the poor end, the δ+ H. Cl is the rich (δ−) end, so nothing rich is sent to it.

## Notes

- Course level: the carbocation is explained by electron counting and the empty p orbital; cation stability (3° > 2° > 1°) is Lesson 08 s19 and Lesson 09.
- A primer scene for Lesson 08 (reached from the lesson, not from a hub card): the alkene-hx card keeps scene 01 as its own.
- Course level: no hyperconjugation; the carbocation is flat because it has three groups (sp², Lesson 02).
- Lesson 08 shows the ethyl cation because HCl + ethylene is the book's model reaction; the 3D model on s15 is the tert-butyl cation (the course's computed cation model).

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "17-hcl-ethylene",
 "title": "HCl adds to ethylene: the model polar reaction",
 "reagentCard": "alkene-hx",
 "alsoCards": [],
 "lesson": {
  "id": "08",
  "step": "s17"
 },
 "intent": "After this scene the learner can say: \"The π pair (rich) bonds to the δ+ H (poor) and the H–Cl pair goes to Cl. That leaves a flat carbocation with an empty p orbital; Cl⁻ gives a lone pair into it. Every arrow runs from rich to poor.\"",
 "reactant": {
  "smiles": "C=C",
  "name": "ethylene (ethene)"
 },
 "reagent": {
  "smiles": "Cl",
  "label": "HCl"
 },
 "products": [
  {
   "smiles": "CCCl",
   "name": "chloroethane",
   "stereo": "achiral",
   "note": "C2 carries two H, so it is not a stereocentre: either face gives the same molecule."
  }
 ],
 "intermediates": [
  {
   "smiles": "C[CH2+]",
   "name": "ethyl cation (1°)"
  }
 ],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "3": "H",
  "4": "Cl"
 },
 "stage": {
  "species": [
   {
    "key": "ethylene",
    "role": "reactant",
    "smiles": "[CH2:1]=[CH2:2]",
    "label": "ethylene",
    "at": [
     0,
     0
    ],
    "style": "full"
   },
   {
    "key": "HCl",
    "role": "reagent",
    "smiles": "[H:3][Cl:4]",
    "label": "HCl",
    "at": [
     2.4,
     -0.9
    ],
    "style": "full"
   }
  ],
  "state": "[CH2:1]=[CH2:2].[H:3][Cl:4]"
 },
 "layers": [
  "arrows",
  "orbitals"
 ],
 "duration": 33.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0,
   "t1": 3,
   "hold": 1,
   "kind": "look",
   "caption": "Ethylene meets HCl. The C=C holds a π pair above and below the flat molecule: electron-rich.",
   "captionOrbitals": "The π cloud: two electrons above and below the C=C, easy for a reagent to reach.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [
    {
     "atom": 3,
     "sign": "+"
    },
    {
     "atom": 4,
     "sign": "-"
    }
   ],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [
      1,
      2
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.4,
    "focus": [
     1,
     2,
     3
    ],
    "tilt": 35
   },
   "faces": {
    "show": false
   },
   "state": "[CH2:1]=[CH2:2].[H:3][Cl:4]"
  },
  {
   "id": "b2-poor",
   "t0": 4,
   "t1": 7,
   "hold": 1,
   "kind": "look",
   "caption": "Cl pulls the H–Cl pair toward itself, so H is δ+: electron-poor. Rich will give a pair to poor.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [
    {
     "atom": 3,
     "sign": "+"
    },
    {
     "atom": 4,
     "sign": "-"
    }
   ],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [
      1,
      2
     ],
     "side": "both",
     "emphasis": "normal",
     "electrons": 2
    }
   ],
   "badges": [
    {
     "atom": 1,
     "text": "rich: π pair",
     "tone": "nuc"
    },
    {
     "atom": 3,
     "text": "poor: δ+",
     "tone": "elec"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1.4,
    "focus": [
     1,
     2,
     3
    ],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH2:1]=[CH2:2].[H:3][Cl:4]"
  },
  {
   "id": "b3-attack",
   "t0": 8,
   "t1": 12,
   "hold": 1,
   "kind": "step",
   "caption": "The π pair swings over and bonds to H. H holds only two electrons, so the H–Cl pair moves onto Cl.",
   "moves": [
    {
     "species": "HCl",
     "anchor": 3,
     "near": 1,
     "offset": [
      0.3,
      -1,
      0
     ],
     "at": [
      0,
      0.35
     ]
    },
    {
     "atoms": [
      4
     ],
     "by": [
      1,
      -0.4,
      0
     ],
     "at": [
      0.75,
      1
     ]
    }
   ],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [
       1,
       2
      ]
     },
     "to": {
      "bond": [
       1,
       3
      ]
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
     "at": [
      0.3,
      0.75
     ],
     "why": "Bond → new bond: the π pair, the rich site, makes a new C–H bond to the δ+ H."
    },
    {
     "id": "a2",
     "from": {
      "bond": [
       3,
       4
      ]
     },
     "to": {
      "atom": 4
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
     "at": [
      0.45,
      0.95
     ],
     "why": "Bond → atom: the H–Cl pair stays on Cl, the atom that pulls harder, so Cl becomes Cl⁻."
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
     "b": 3,
     "action": "form",
     "order": 1
    },
    {
     "a": 3,
     "b": 4,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [
    {
     "atom": 2,
     "charge": 1
    },
    {
     "atom": 4,
     "charge": -1
    }
   ],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [
      2
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.4,
    "focus": [
     1,
     2
    ],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:3][CH2:1][CH2+:2].[Cl-:4]"
  },
  {
   "id": "b4-cation",
   "t0": 13,
   "t1": 16,
   "hold": 1,
   "kind": "look",
   "caption": "C2 now has three bonds and six electrons. It is flat, with an empty p orbital above and below.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [
      2
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0,
     "label": "empty p"
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.3,
    "focus": [
     2
    ],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[H:3][CH2:1][CH2+:2].[Cl-:4]"
  },
  {
   "id": "b5-six",
   "t0": 17,
   "t1": 20,
   "hold": 1,
   "kind": "look",
   "caption": "This carbocation is real but short-lived: it is the intermediate that links step 1 to step 2.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [
      2
     ],
     "side": "both",
     "emphasis": "normal",
     "electrons": 0
    }
   ],
   "badges": [
    {
     "atom": 2,
     "text": "6 e⁻",
     "tone": "elec"
    },
    {
     "atom": 4,
     "text": "rich: Cl⁻",
     "tone": "nuc"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [
     2
    ],
    "tilt": 0
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[H:3][CH2:1][CH2+:2].[Cl-:4]"
  },
  {
   "id": "b6-chloride",
   "t0": 21,
   "t1": 25,
   "hold": 1,
   "kind": "step",
   "caption": "Cl⁻ gives a lone pair to the empty p orbital: rich to poor again. The new C–Cl bond forms.",
   "moves": [
    {
     "atoms": [
      4
     ],
     "anchor": 4,
     "near": 2,
     "offset": [
      0,
      0,
      1.6
     ],
     "at": [
      0,
      0.4
     ]
    }
   ],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 4
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
     "at": [
      0.35,
      0.9
     ],
     "why": "Lone pair → atom: a Cl⁻ pair goes into the empty p orbital of the + carbon and becomes the C–Cl bond."
    }
   ],
   "bonds": [
    {
     "a": 2,
     "b": 4,
     "action": "form",
     "order": 1
    }
   ],
   "charges": [
    {
     "atom": 2,
     "charge": 0
    },
    {
     "atom": 4,
     "charge": 0
    }
   ],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [
      2
     ],
     "side": "top",
     "emphasis": "focus",
     "electrons": 0
    },
    {
     "kind": "lone-pair",
     "atoms": [
      4
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "toward": 2
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [
     2,
     4
    ],
    "tilt": 55
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[H:3][CH2:1][CH2:2][Cl:4]"
  },
  {
   "id": "b7-either",
   "t0": 26,
   "t1": 29,
   "hold": 1,
   "kind": "look",
   "caption": "Cl⁻ could just as well come from the bottom face. Both faces give the same chloroethane.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [
      2
     ],
     "side": "bottom",
     "emphasis": "ghost",
     "electrons": 0
    }
   ],
   "badges": [],
   "ghosts": [
    {
     "atoms": [
      4
     ],
     "offset": [
      0,
      0,
      -2
     ],
     "label": "or from below"
    }
   ],
   "camera": {
    "zoom": 1.1,
    "focus": [
     2,
     4
    ],
    "tilt": 55
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[H:3][CH2:1][CH2:2][Cl:4]"
  },
  {
   "id": "b8-product",
   "t0": 30,
   "t1": 33,
   "hold": 0,
   "kind": "look",
   "caption": "Chloroethane: H on one carbon, Cl on the other. Two steps, three arrows, each from rich to poor.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.5,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[H:3][CH2:1][CH2:2][Cl:4]",
   "relayout": {
    "anchor": [
     1,
     2
    ]
   }
  }
 ],
 "stereoCallout": {
  "title": "Flat cation, two faces",
  "text": "The + carbon is flat, so Cl⁻ can arrive from the top or the bottom face. Here C2 ends with two H, so both faces give one compound. Lesson 09 shows when the two faces give two mirror-image products.",
  "stereoMoment": null
 },
 "whatIf": [
  "01-alkene-hx",
  "18-arrow-grammar"
 ],
 "quiz": {
  "q": "Why does the H–Cl bond break in step 1?",
  "options": [
   {
    "text": "H can hold only two electrons, so as the π pair bonds to H, the old H–Cl pair must leave, onto Cl.",
    "correct": true,
    "why": "Yes. The new C–H bond uses up H's room for two electrons, so the H–Cl pair goes to Cl, the atom that pulls harder."
   },
   {
    "text": "Cl⁻ attacks the carbon first and pushes the H off.",
    "correct": false,
    "why": "Cl⁻ does not exist yet in step 1: it is made when the H–Cl pair moves onto Cl. Its attack is step 2."
   },
   {
    "text": "The π pair goes to Cl and pulls it away from H.",
    "correct": false,
    "why": "The π pair goes to the poor end, the δ+ H. Cl is the rich (δ−) end, so nothing rich is sent to it."
   }
  ]
 },
 "notes": [
  "Course level: the carbocation is explained by electron counting and the empty p orbital; cation stability (3° > 2° > 1°) is Lesson 08 s19 and Lesson 09.",
  "A primer scene for Lesson 08 (reached from the lesson, not from a hub card): the alkene-hx card keeps scene 01 as its own."
 ]
}
```

</details>
