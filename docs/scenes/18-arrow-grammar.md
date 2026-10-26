# 18 · Arrow grammar: the three legal arrows, one simple case each

**Scene id** `18-arrow-grammar` · **Hub card** `alkene-hx` (primer: the card keeps scene 01 as its own) · **Taught in** Lesson 08 s06 · **Runtime** 30 s, 7 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view.

## Intent

After this scene the learner can say: "An arrow starts on electrons (a lone pair or a bond). Bond → atom breaks a bond and makes a lone pair (H–Cl → H⁺ + Cl⁻); lone pair → atom makes a new bond (HO⁻ + H⁺ → H₂O); bond → new bond moves a π pair into a new bond (ethylene + H⁺ → CH₃CH₂⁺)."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `HCl` | reactant | `[H:1][Cl:2]` | HCl | [0, 0] | full |

Atom names used in captions and tables: 1 = H, 2 = Cl, 3 = O, 4 = H(O), 5 = H⁺, 6 = C1, 7 = C2, 8 = H⁺.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-hcl` · look | 0–3 (+1 hold) | Arrow 1, bond → atom. In water, H–Cl gives up H⁺. Cl pulls the shared pair harder, so H is δ+. | δ: H δ+, Cl δ− | — | zoom 2.1, tilt 0° |
| 2 | `b2-break` · step | 4–8 (+1 hold) | The H–Cl pair moves onto Cl. The bond breaks: Cl keeps the pair as Cl⁻, and H is left bare as H⁺. | moves: atoms Cl<br>**arrows:** (1) bond H–Cl → Cl (pair onto it)<br>bonds: break H–Cl<br>charges: H +, Cl − | — | zoom 2.1, tilt 0° |
| 3 | `b3-hydroxide` · look | 9–12 (+1 hold) | Arrow 2, lone pair → atom. Hydroxide, HO⁻, has three lone pairs on O. H⁺ has no electrons at all. | reset: HO⁻ + H⁺ | lone-pair O (both, focus) | zoom 1.9, tilt 0° |
| 4 | `b4-water` · step | 13–17 (+1 hold) | One lone pair of O becomes a new O–H bond. HO⁻ + H⁺ → H₂O: the − and the + cancel. Nothing breaks. | moves: atoms H⁺<br>**arrows:** (1) lone pair on O → H⁺ (new bond)<br>bonds: form O–H⁺<br>charges: O 0, H⁺ 0 | — | zoom 1.9, tilt 0° |
| 5 | `b5-ethylene` · look | 18–21 (+1 hold) | Arrow 3, bond → new bond. Ethylene’s π pair sits above and below the C=C: electron-rich. H⁺ is poor. | reset: ethylene + H⁺ | pi C1/C2 (both, focus) | zoom 1.8, tilt 0° |
| 6 | `b6-pi` · step | 22–26 (+1 hold) | The π pair leaves the C=C and makes a new C–H bond. The other carbon lost its share: it is now C⁺. | moves: atoms H⁺<br>**arrows:** (1) bond C1–C2 → bond C1–H⁺<br>bonds: order C1–C2 (order 1), form C1–H⁺<br>charges: C2 + | p-empty C2 (both, focus) | zoom 1.8, tilt 0° |
| 7 | `b7-rules` · look | 27–30 (+0 hold) | The grammar: start on electrons (dots or a line); end on an atom, or where a new bond forms. | hold the picture | p-empty C2 (both, normal) | zoom 1.8, tilt 0° |

Why lines (shown while each arrow's electrons travel):

- `b2-break/a1`: Bond → atom: the H–Cl pair goes onto Cl, the atom that pulls harder. The bond is gone and Cl has a fourth lone pair.
- `b4-water/a1`: Lone pair → atom: a pair on O, the rich site, goes to H⁺, the poor one, and becomes the new O–H bond.
- `b6-pi/a1`: Bond → new bond: the π pair, the rich site, becomes a new C–H bond to H⁺. C2 drops to three bonds and a +.

## Chemistry checks

- Three separate cases, one arrow each; every state was checked atom by atom: `[H:1][Cl:2]` → `[H+:1].[Cl-:2]`; `[H:4][O-:3].[H+:5]` → `[H:4][O:3][H:5]` (water); `[CH2:6]=[CH2:7].[H+:8]` → `[H:8][CH2:6][CH2+:7]` (ethyl cation).
- Within each case the atoms and the total charge never change (HCl: 0; HO⁻ + H⁺: 0; ethylene + H⁺: +1). The two `reset` beats start a new case; they claim no reaction between the cases.
- tests/scenes.mjs checks on the compiled layout that each arrow explains its bond and charge changes (bond → atom, lone pair → atom, bond → new bond).

## Stereo callout

**No stereo here**

Nothing in this scene is a stereocentre: it is about grammar only. Each arrow changes one bond or one lone pair, and the charges follow from the electron count.

## What-if links

[17-hcl-ethylene](17-hcl-ethylene.md)

## End quiz

**Which of these arrows is NOT legal?**

A. An arrow that starts on H⁺ and points at a lone pair of HO⁻. **(correct)**  
   Why: Yes. H⁺ has no electrons to send. Arrows start at electrons: the lone pair of HO⁻ goes to H⁺.
B. An arrow from the H–Cl bond onto Cl.  
   Diagnosis: That is legal (bond → atom): the pair becomes a lone pair on Cl and the bond breaks. It is arrow 1 of the scene.
C. An arrow from the C=C π bond to H⁺, making a new C–H bond.  
   Diagnosis: That is legal (bond → new bond): the π pair becomes the new C–H bond. It is arrow 3 of the scene.

## Notes

- Redone 2026-10-20 (novice review #6): each arrow kind is shown on the simple case Lesson 08 has the learner draw (s07 HO⁻ + H⁺, s08 H–Cl, s09 ethylene + H⁺), in the same order as the grammar list of s06 after the first case. The earlier allyl chloride version had Cl leave on its own and a resonance shift, too much for a first picture.
- Primer scene for Lesson 08 s06 (arrow grammar); reached from the lesson, not from a hub card.

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "18-arrow-grammar",
 "title": "Arrow grammar: the three legal arrows, one simple case each",
 "reagentCard": "alkene-hx",
 "alsoCards": [],
 "lesson": {
  "id": "08",
  "step": "s06"
 },
 "intent": "After this scene the learner can say: \"An arrow starts on electrons (a lone pair or a bond). Bond → atom breaks a bond and makes a lone pair (H–Cl → H⁺ + Cl⁻); lone pair → atom makes a new bond (HO⁻ + H⁺ → H₂O); bond → new bond moves a π pair into a new bond (ethylene + H⁺ → CH₃CH₂⁺).\"",
 "reactant": {
  "smiles": "Cl",
  "name": "hydrogen chloride (then hydroxide, then ethylene)"
 },
 "reagent": {
  "label": "three separate cases, one arrow each"
 },
 "products": [
  {
   "smiles": "[H+].[Cl-]",
   "name": "H⁺ and Cl⁻ (arrow 1)",
   "stereo": "achiral",
   "note": "The H–Cl bond pair becomes a fourth lone pair on Cl."
  },
  {
   "smiles": "O",
   "name": "water (arrow 2)",
   "stereo": "achiral",
   "note": "A lone pair of HO⁻ becomes the new O–H bond."
  },
  {
   "smiles": "C[CH2+]",
   "name": "ethyl cation (arrow 3)",
   "stereo": "achiral",
   "note": "The π pair becomes a new C–H bond; the other carbon is left with a +."
  }
 ],
 "intermediates": [],
 "atomNames": {
  "1": "H",
  "2": "Cl",
  "3": "O",
  "4": "H(O)",
  "5": "H⁺",
  "6": "C1",
  "7": "C2",
  "8": "H⁺"
 },
 "stage": {
  "species": [
   {
    "key": "HCl",
    "role": "reactant",
    "smiles": "[H:1][Cl:2]",
    "label": "HCl",
    "at": [
     0,
     0
    ],
    "style": "full"
   }
  ],
  "state": "[H:1][Cl:2]"
 },
 "layers": [
  "arrows",
  "orbitals"
 ],
 "duration": 30,
 "beats": [
  {
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [
    {
     "atom": 1,
     "sign": "+"
    },
    {
     "atom": 2,
     "sign": "-"
    }
   ],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "faces": {
    "show": false
   },
   "id": "b1-hcl",
   "t0": 0,
   "t1": 3,
   "hold": 1,
   "kind": "look",
   "caption": "Arrow 1, bond → atom. In water, H–Cl gives up H⁺. Cl pulls the shared pair harder, so H is δ+.",
   "camera": {
    "zoom": 2.1,
    "focus": [],
    "tilt": 0
   },
   "state": "[H:1][Cl:2]"
  },
  {
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
      "atom": 2
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
      0.2,
      0.75
     ],
     "why": "Bond → atom: the H–Cl pair goes onto Cl, the atom that pulls harder. The bond is gone and Cl has a fourth lone pair."
    }
   ],
   "bonds": [
    {
     "a": 1,
     "b": 2,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [
    {
     "atom": 1,
     "charge": 1
    },
    {
     "atom": 2,
     "charge": -1
    }
   ],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "faces": {
    "show": false
   },
   "id": "b2-break",
   "t0": 4,
   "t1": 8,
   "hold": 1,
   "kind": "step",
   "caption": "The H–Cl pair moves onto Cl. The bond breaks: Cl keeps the pair as Cl⁻, and H is left bare as H⁺.",
   "moves": [
    {
     "atoms": [
      2
     ],
     "by": [
      0.9,
      0,
      0
     ],
     "at": [
      0.75,
      1
     ]
    }
   ],
   "camera": {
    "zoom": 2.1,
    "focus": [],
    "tilt": 0
   },
   "state": "[H+:1].[Cl-:2]"
  },
  {
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "lone-pair",
     "atoms": [
      3
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "toward": 5
    }
   ],
   "badges": [],
   "ghosts": [],
   "faces": {
    "show": false
   },
   "id": "b3-hydroxide",
   "t0": 9,
   "t1": 12,
   "hold": 1,
   "kind": "look",
   "caption": "Arrow 2, lone pair → atom. Hydroxide, HO⁻, has three lone pairs on O. H⁺ has no electrons at all.",
   "reset": {
    "species": [
     {
      "key": "OH",
      "smiles": "[H:4][O-:3]",
      "label": "HO⁻",
      "style": "full"
     },
     {
      "key": "Hplus",
      "smiles": "[H+:5]",
      "label": "H⁺",
      "style": "full"
     }
    ]
   },
   "camera": {
    "zoom": 1.9,
    "focus": [],
    "tilt": 0
   },
   "state": "[H:4][O-:3].[H+:5]"
  },
  {
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 3
     },
     "to": {
      "atom": 5
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
      0.85
     ],
     "why": "Lone pair → atom: a pair on O, the rich site, goes to H⁺, the poor one, and becomes the new O–H bond."
    }
   ],
   "bonds": [
    {
     "a": 3,
     "b": 5,
     "action": "form",
     "order": 1
    }
   ],
   "charges": [
    {
     "atom": 3,
     "charge": 0
    },
    {
     "atom": 5,
     "charge": 0
    }
   ],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "faces": {
    "show": false
   },
   "id": "b4-water",
   "t0": 13,
   "t1": 17,
   "hold": 1,
   "kind": "step",
   "caption": "One lone pair of O becomes a new O–H bond. HO⁻ + H⁺ → H₂O: the − and the + cancel. Nothing breaks.",
   "moves": [
    {
     "atoms": [
      5
     ],
     "anchor": 5,
     "near": 3,
     "offset": [
      0.26,
      0.93,
      0
     ],
     "at": [
      0,
      0.4
     ]
    }
   ],
   "camera": {
    "zoom": 1.9,
    "focus": [],
    "tilt": 0
   },
   "state": "[H:4][O:3][H:5]"
  },
  {
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [
      6,
      7
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2
    }
   ],
   "badges": [],
   "ghosts": [],
   "faces": {
    "show": false
   },
   "id": "b5-ethylene",
   "t0": 18,
   "t1": 21,
   "hold": 1,
   "kind": "look",
   "caption": "Arrow 3, bond → new bond. Ethylene’s π pair sits above and below the C=C: electron-rich. H⁺ is poor.",
   "reset": {
    "species": [
     {
      "key": "ethylene",
      "smiles": "[CH2:6]=[CH2:7]",
      "label": "ethylene",
      "style": "full"
     },
     {
      "key": "Hplus2",
      "smiles": "[H+:8]",
      "label": "H⁺",
      "style": "full"
     }
    ]
   },
   "camera": {
    "zoom": 1.8,
    "focus": [],
    "tilt": 0
   },
   "state": "[CH2:6]=[CH2:7].[H+:8]"
  },
  {
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [
       6,
       7
      ]
     },
     "to": {
      "bond": [
       6,
       8
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
      0.85
     ],
     "why": "Bond → new bond: the π pair, the rich site, becomes a new C–H bond to H⁺. C2 drops to three bonds and a +."
    }
   ],
   "bonds": [
    {
     "a": 6,
     "b": 7,
     "action": "order",
     "order": 1
    },
    {
     "a": 6,
     "b": 8,
     "action": "form",
     "order": 1
    }
   ],
   "charges": [
    {
     "atom": 7,
     "charge": 1
    }
   ],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [
      7
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0
    }
   ],
   "badges": [],
   "ghosts": [],
   "faces": {
    "show": false
   },
   "id": "b6-pi",
   "t0": 22,
   "t1": 26,
   "hold": 1,
   "kind": "step",
   "caption": "The π pair leaves the C=C and makes a new C–H bond. The other carbon lost its share: it is now C⁺.",
   "moves": [
    {
     "atoms": [
      8
     ],
     "anchor": 8,
     "near": 6,
     "offset": [
      0.25,
      -1.05,
      0
     ],
     "at": [
      0,
      0.35
     ]
    }
   ],
   "camera": {
    "zoom": 1.8,
    "focus": [],
    "tilt": 0
   },
   "state": "[H:8][CH2:6][CH2+:7]"
  },
  {
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [
      7
     ],
     "side": "both",
     "emphasis": "normal",
     "electrons": 0
    }
   ],
   "badges": [],
   "ghosts": [],
   "faces": {
    "show": false
   },
   "id": "b7-rules",
   "t0": 27,
   "t1": 30,
   "hold": 0,
   "kind": "look",
   "caption": "The grammar: start on electrons (dots or a line); end on an atom, or where a new bond forms.",
   "camera": {
    "zoom": 1.8,
    "focus": [],
    "tilt": 0
   },
   "state": "[H:8][CH2:6][CH2+:7]"
  }
 ],
 "stereoCallout": {
  "title": "No stereo here",
  "text": "Nothing in this scene is a stereocentre: it is about grammar only. Each arrow changes one bond or one lone pair, and the charges follow from the electron count.",
  "stereoMoment": null
 },
 "whatIf": [
  "17-hcl-ethylene"
 ],
 "quiz": {
  "q": "Which of these arrows is NOT legal?",
  "options": [
   {
    "text": "An arrow that starts on H⁺ and points at a lone pair of HO⁻.",
    "correct": true,
    "why": "Yes. H⁺ has no electrons to send. Arrows start at electrons: the lone pair of HO⁻ goes to H⁺."
   },
   {
    "text": "An arrow from the H–Cl bond onto Cl.",
    "correct": false,
    "why": "That is legal (bond → atom): the pair becomes a lone pair on Cl and the bond breaks. It is arrow 1 of the scene."
   },
   {
    "text": "An arrow from the C=C π bond to H⁺, making a new C–H bond.",
    "correct": false,
    "why": "That is legal (bond → new bond): the π pair becomes the new C–H bond. It is arrow 3 of the scene."
   }
  ]
 },
 "notes": [
  "Redone 2026-10-20 (novice review #6): each arrow kind is shown on the simple case Lesson 08 has the learner draw (s07 HO⁻ + H⁺, s08 H–Cl, s09 ethylene + H⁺), in the same order as the grammar list of s06 after the first case. The earlier allyl chloride version had Cl leave on its own and a resonance shift, too much for a first picture.",
  "Primer scene for Lesson 08 s06 (arrow grammar); reached from the lesson, not from a hub card."
 ]
}
```

</details>
