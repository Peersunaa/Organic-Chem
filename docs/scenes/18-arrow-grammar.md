# 18 · Arrow grammar: the three legal arrows on one molecule

**Scene id** `18-arrow-grammar` · **Hub card** `alkene-hx` (primer: the card keeps scene 01 as its own) · **Taught in** Lesson 08 s06 · **Runtime** 34 s, 8 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state and product here was checked with RDKit (see Chemistry checks).

## Intent

After this scene the learner can say: "An arrow starts at electrons (a lone pair or a bond). Bond → atom breaks a bond and makes a lone pair; bond → bond moves a pair to make a new bond; lone pair → atom makes a new bond. Each arrow changes the picture in one predictable way."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `allyl` | reactant | `[CH2:1]=[CH:2][CH2:3][Cl:4]` | allyl chloride | [0, 0] | full |

Atom names used in captions and tables: 1 = C1, 2 = C2, 3 = C3, 4 = Cl.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | One molecule, allyl chloride. Its electrons: the C1=C2 π pair, a pair in every bond, three lone pairs on Cl. | δ: C3 δ+, Cl δ− | pi C1/C2 (both, normal)<br>*caption swaps to:* “The π cloud of C1=C2: the pair that a bond → bond arrow can move.” | zoom 1.6, tilt 0° |
| 2 | `b2-break` · step | 4–8 (+1 hold) | Arrow 1, bond → atom: the C3–Cl pair moves onto Cl. The bond breaks and Cl gains a lone pair. | moves: atoms Cl<br>**arrows:** (1) bond C3–Cl → Cl (pair onto it)<br>bonds: break C3–Cl<br>charges: C3 +, Cl − | p-empty C3 (both, focus) | zoom 1.6, tilt 0° |
| 3 | `b3-after1` · look | 9–12 (+1 hold) | After arrow 1: Cl⁻ has four lone pairs and a − charge. C3 has three bonds, six electrons and a +. | badges: C3 “6 e⁻”, Cl “4 pairs” | p-empty C3 (both, normal) | zoom 1.6, tilt 0° |
| 4 | `b4-slide` · resonance | 13–17 (+1 hold) | Arrow 2, bond → bond: the π pair slides over and makes a C2=C3 bond. Now C1 is the carbon short of electrons. | **arrows:** (1) bond C1–C2 → bond C2–C3<br>bonds: order C1–C2 (order 1), order C2–C3 (order 2)<br>charges: C1 +, C3 0 | pi C2/C3 (both, focus)<br>p-empty C1 (both, focus) | zoom 1.6, tilt 0° |
| 5 | `b5-after2` · look | 18–21 (+1 hold) | After arrow 2: no atom moved, only electrons, so the + is now drawn on C1 (Lesson 11 calls this resonance). | badges: C1 “6 e⁻” | p-empty C1 (both, normal) | zoom 1.6, tilt 0° |
| 6 | `b6-bond` · step | 22–26 (+1 hold) | Arrow 3, lone pair → atom: a Cl⁻ lone pair becomes a new bond to C1, the electron-poor carbon. | moves: atoms Cl<br>**arrows:** (1) lone pair on Cl → C1 (new bond)<br>bonds: form C1–Cl<br>charges: C1 0, Cl 0 | p-empty C1 (both, focus)<br>lone-pair Cl (both, focus) | zoom 1.6, tilt 0° |
| 7 | `b7-same` · look | 27–30 (+1 hold) | After arrow 3: allyl chloride again, now with Cl on C1. Same compound: the arrows only described moves. | relayout to the final drawing | — | zoom 1.6, tilt 0° |
| 8 | `b8-rules` · look | 31–34 (+0 hold) | The grammar: start at a lone pair or a bond; end at an atom, or between two atoms to make a bond. | hold the picture | — | zoom 1.6, tilt 0° |

Why lines (shown while each arrow's electrons travel):

- `b2-break/a1`: Bond → atom: the C3–Cl pair goes onto Cl, so the bond is gone and Cl has a fourth lone pair.
- `b4-slide/a1`: Bond → bond: the C1=C2 π pair moves between C2 and C3, so C3 gets back to four bonds and C1 drops to three.
- `b6-bond/a1`: Lone pair → atom: a pair on Cl⁻ goes to the + carbon C1 and becomes the new C1–Cl bond.

## Chemistry checks

- Molecule: `C=CCCl`, allyl chloride (3-chloroprop-1-ene). No reagent.
- Intermediate drawings: `C=C[CH2+]` with Cl⁻, and the same allyl cation drawn with the + on C1 (`[CH2+]C=C`): two drawings of ONE ion (the scene says so; Lesson 11 calls them resonance forms). RDKit gives both the same canonical SMILES.
- End: `C=CCCl` again, now with Cl on C1: the same compound by symmetry. No reaction is claimed.
- Checked with Python RDKit for every beat: the state parses, the formula (C3H5Cl) and charge (0) never change. tests/scenes.mjs redoes checks 4 and 5 on the compiled layout (bond → atom, bond → bond, lone pair → atom each explain their bond and charge changes).

## Stereo callout

**No stereo here**

Nothing in this scene is a stereocentre: it is about grammar only. Each arrow changes one bond or one lone pair, and the charges follow from the electron count.

## What-if links

[17-hcl-ethylene](17-hcl-ethylene.md)

## End quiz

**Which of these arrows is NOT legal?**

A. An arrow that starts on a + carbon and points at Cl⁻. **(correct)**  
   Why: Yes. A + carbon has no spare electrons to send. Arrows start at electrons: the lone pair of Cl⁻ goes to the + carbon.
B. An arrow from the C3–Cl bond onto Cl.  
   Diagnosis: That is legal (bond → atom): the pair becomes a lone pair on Cl and the bond breaks. It is arrow 1 of the scene.
C. An arrow from the C1=C2 π bond to between C2 and C3.  
   Diagnosis: That is legal (bond → bond): the π pair becomes a new C2=C3 bond. It is arrow 2 of the scene.

## Notes

- No reaction is claimed: the three arrows end on the starting compound. The ionisation and the π shift are drawn only to show what each arrow kind does.
- Primer scene for Lesson 08 s06 (arrow grammar); reached from the lesson, not from a hub card.
- The ionisation of allyl chloride and the π shift are drawn to show what each arrow kind does to the picture; the scene does not claim this happens on its own at room temperature.
- b4 is a `resonance` beat (atoms frozen); the caption says no atom moved, only electrons.

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "18-arrow-grammar",
 "title": "Arrow grammar: the three legal arrows on one molecule",
 "reagentCard": "alkene-hx",
 "alsoCards": [],
 "lesson": {
  "id": "08",
  "step": "s06"
 },
 "intent": "After this scene the learner can say: \"An arrow starts at electrons (a lone pair or a bond). Bond → atom breaks a bond and makes a lone pair; bond → bond moves a pair to make a new bond; lone pair → atom makes a new bond. Each arrow changes the picture in one predictable way.\"",
 "reactant": {
  "smiles": "C=CCCl",
  "name": "allyl chloride (3-chloroprop-1-ene)"
 },
 "reagent": {
  "label": "none: the same molecule, three arrows"
 },
 "products": [
  {
   "smiles": "C=CCCl",
   "name": "allyl chloride (3-chloroprop-1-ene), the same compound",
   "stereo": "achiral",
   "note": "Cl ends on the other end carbon, which by symmetry is the same compound."
  }
 ],
 "intermediates": [
  {
   "smiles": "C=C[CH2+]",
   "name": "allyl cation (two drawings of one ion)"
  }
 ],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "3": "C3",
  "4": "Cl"
 },
 "stage": {
  "species": [
   {
    "key": "allyl",
    "role": "reactant",
    "smiles": "[CH2:1]=[CH:2][CH2:3][Cl:4]",
    "label": "allyl chloride",
    "at": [
     0,
     0
    ],
    "style": "full"
   }
  ],
  "state": "[CH2:1]=[CH:2][CH2:3][Cl:4]"
 },
 "layers": [
  "arrows",
  "orbitals"
 ],
 "duration": 34.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0,
   "t1": 3,
   "hold": 1,
   "kind": "look",
   "caption": "One molecule, allyl chloride. Its electrons: the C1=C2 π pair, a pair in every bond, three lone pairs on Cl.",
   "captionOrbitals": "The π cloud of C1=C2: the pair that a bond → bond arrow can move.",
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
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.6,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH2:1]=[CH:2][CH2:3][Cl:4]"
  },
  {
   "id": "b2-break",
   "t0": 4,
   "t1": 8,
   "hold": 1,
   "kind": "step",
   "caption": "Arrow 1, bond → atom: the C3–Cl pair moves onto Cl. The bond breaks and Cl gains a lone pair.",
   "moves": [
    {
     "atoms": [
      4
     ],
     "by": [
      0.9,
      0.35,
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
      0.25,
      0.8
     ],
     "why": "Bond → atom: the C3–Cl pair goes onto Cl, so the bond is gone and Cl has a fourth lone pair."
    }
   ],
   "bonds": [
    {
     "a": 3,
     "b": 4,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [
    {
     "atom": 3,
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
      3
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.6,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH2:1]=[CH:2][CH2+:3].[Cl-:4]"
  },
  {
   "id": "b3-after1",
   "t0": 9,
   "t1": 12,
   "hold": 1,
   "kind": "look",
   "caption": "After arrow 1: Cl⁻ has four lone pairs and a − charge. C3 has three bonds, six electrons and a +.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [
      3
     ],
     "side": "both",
     "emphasis": "normal",
     "electrons": 0
    }
   ],
   "badges": [
    {
     "atom": 3,
     "text": "6 e⁻",
     "tone": "elec"
    },
    {
     "atom": 4,
     "text": "4 pairs",
     "tone": "nuc"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1.6,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH2:1]=[CH:2][CH2+:3].[Cl-:4]"
  },
  {
   "id": "b4-slide",
   "t0": 13,
   "t1": 17,
   "hold": 1,
   "kind": "resonance",
   "caption": "Arrow 2, bond → bond: the π pair slides over and makes a C2=C3 bond. Now C1 is the carbon short of electrons.",
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
       2,
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
      0.25,
      0.85
     ],
     "why": "Bond → bond: the C1=C2 π pair moves between C2 and C3, so C3 gets back to four bonds and C1 drops to three."
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
     "a": 2,
     "b": 3,
     "action": "order",
     "order": 2
    }
   ],
   "charges": [
    {
     "atom": 1,
     "charge": 1
    },
    {
     "atom": 3,
     "charge": 0
    }
   ],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [
      2,
      3
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2
    },
    {
     "kind": "p-empty",
     "atoms": [
      1
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.6,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH2+:1][CH:2]=[CH2:3].[Cl-:4]"
  },
  {
   "id": "b5-after2",
   "t0": 18,
   "t1": 21,
   "hold": 1,
   "kind": "look",
   "caption": "After arrow 2: no atom moved, only electrons, so the + is now drawn on C1 (Lesson 11 calls this resonance).",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [
      1
     ],
     "side": "both",
     "emphasis": "normal",
     "electrons": 0
    }
   ],
   "badges": [
    {
     "atom": 1,
     "text": "6 e⁻",
     "tone": "elec"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1.6,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH2+:1][CH:2]=[CH2:3].[Cl-:4]"
  },
  {
   "id": "b6-bond",
   "t0": 22,
   "t1": 26,
   "hold": 1,
   "kind": "step",
   "caption": "Arrow 3, lone pair → atom: a Cl⁻ lone pair becomes a new bond to C1, the electron-poor carbon.",
   "moves": [
    {
     "atoms": [
      4
     ],
     "anchor": 4,
     "near": 1,
     "offset": [
      -0.75,
      -0.95,
      0
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
      "atom": 1
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
      0.4,
      0.9
     ],
     "why": "Lone pair → atom: a pair on Cl⁻ goes to the + carbon C1 and becomes the new C1–Cl bond."
    }
   ],
   "bonds": [
    {
     "a": 1,
     "b": 4,
     "action": "form",
     "order": 1
    }
   ],
   "charges": [
    {
     "atom": 1,
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
      1
     ],
     "side": "both",
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
     "toward": 1
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.6,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[Cl:4][CH2:1][CH:2]=[CH2:3]"
  },
  {
   "id": "b7-same",
   "t0": 27,
   "t1": 30,
   "hold": 1,
   "kind": "look",
   "caption": "After arrow 3: allyl chloride again, now with Cl on C1. Same compound: the arrows only described moves.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.6,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[Cl:4][CH2:1][CH:2]=[CH2:3]",
   "relayout": {
    "anchor": [
     1,
     2,
     3
    ]
   }
  },
  {
   "id": "b8-rules",
   "t0": 31,
   "t1": 34,
   "hold": 0,
   "kind": "look",
   "caption": "The grammar: start at a lone pair or a bond; end at an atom, or between two atoms to make a bond.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.6,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[Cl:4][CH2:1][CH:2]=[CH2:3]"
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
    "text": "An arrow that starts on a + carbon and points at Cl⁻.",
    "correct": true,
    "why": "Yes. A + carbon has no spare electrons to send. Arrows start at electrons: the lone pair of Cl⁻ goes to the + carbon."
   },
   {
    "text": "An arrow from the C3–Cl bond onto Cl.",
    "correct": false,
    "why": "That is legal (bond → atom): the pair becomes a lone pair on Cl and the bond breaks. It is arrow 1 of the scene."
   },
   {
    "text": "An arrow from the C1=C2 π bond to between C2 and C3.",
    "correct": false,
    "why": "That is legal (bond → bond): the π pair becomes a new C2=C3 bond. It is arrow 2 of the scene."
   }
  ]
 },
 "notes": [
  "No reaction is claimed: the three arrows end on the starting compound. The ionisation and the π shift are drawn only to show what each arrow kind does.",
  "Primer scene for Lesson 08 s06 (arrow grammar); reached from the lesson, not from a hub card."
 ]
}
```

</details>
