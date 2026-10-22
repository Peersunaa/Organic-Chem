# 02 · Acid-catalysed hydration of 1-methylcyclohexene

**Scene id** `02-alkene-hydration` · **Hub card** `alkene-hydration` · **Taught in** Lesson 09 s11 · **Runtime** 31 s, 7 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "H₃O⁺ gives H⁺ to the carbon with more H, so the + lands on the 3° carbon. Water, not hydroxide, attacks that flat cation with an O lone pair, and a second water takes the extra H⁺ off. The acid comes back at the end: it is a catalyst. OH ends up Markovnikov."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `alkene` | reactant | `[CH3:7][C:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1` | 1-methylcyclohexene | [0, 0] | skeletal |
| `H3O` | reagent | `[H:8][O+:9]([H:12])[H]` | H₃O⁺ | [3.6, 0.8] | full |

Atom names used in captions and tables: 1 = C1, 2 = C2, 3 = C3, 4 = C4, 5 = C5, 6 = C6, 7 = CH₃, 8 = H, 9 = O, 11 = O(w), 12 = H′.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | 1-Methylcyclohexene in water with a little H₂SO₄. The acid makes H₃O⁺, which carries the H⁺. | δ: H δ+ | π cloud C1–C2 (both faces, 2 e⁻, focus) | zoom 1, tilt 35°, focus C1/C2/H |
| 2 | `b2-choose` · look | 4–8 (+1 hold) | C2 has one H, C1 has none. H goes to C2, so the + lands on C1: 3°, the more stable cation. | badges: C1 “3° if +”, C2 “2° if +” | π cloud C1–C2 (both faces, 2 e⁻) | zoom 1, tilt 0°, focus C1/C2/H |
| 3 | `b3-protonate` · step | 9–13 (+1 hold) | The π pair takes the H⁺ from H₃O⁺ and bonds it to C2. The O–H pair stays on O: water leaves. | H3O moves to C2; O, H′ drifts aside<br>**arrows:** (1) π(C1=C2) → new bond C2–H · (2) σ(H–O) → onto O<br>bonds: C1=C2 → C1–C2, forms C2–H, breaks H–O<br>charges: C1 +, O 0 | empty p orbital C1 (both faces, focus) | zoom 1, tilt 0°, focus C1/C2/H |
| 4 | `b4-cation` · look | 14–17 (+1 hold) | C1 is now a flat 3° carbocation. Its empty p orbital opens on the top face and on the bottom face. | hold the picture | empty p orbital C1 (both faces, focus) | zoom 1.3, tilt 65°, focus C1, faces shown |
| 5 | `b5-water` · step | 18–22 (+1 hold) | A water O gives a lone pair to C1, from either face. The new C–O bond leaves O with three bonds and a +. | O, H′ moves to C1 (above, top face)<br>**arrows:** (1) lone pair on O → C1 (new O–C1 bond)<br>bonds: forms C1–O<br>charges: C1 0, O +<br>ghost: or from below | empty p orbital C1 (top face, focus); lone-pair lobe O (both faces, 2 e⁻, pointing at C1, focus) | zoom 1.3, tilt 55°, focus C1, faces shown |
| 6 | `b6-deprotonate` · step | 23–27 (+1 hold) | A second water takes the extra H⁺ from that O. The O–H pair stays on O, and H₃O⁺ is made again. | adds H₂O<br>O(w) moves to H′; O(w), H′ drifts aside<br>**arrows:** (1) lone pair on O(w) → H′ (new O(w)–H′ bond) · (2) σ(O–H′) → onto O<br>bonds: breaks O–H′, forms O(w)–H′<br>charges: O 0, O(w) + | — | zoom 1, tilt 0°, focus C1 |
| 7 | `b7-product` · look | 28–31 (+0 hold) | 1-Methylcyclohexan-1-ol. OH sits on the carbon with the CH₃. The acid came back: it is only a catalyst. | fades out O(w)<br>relayout to the product drawing | — | zoom 1, tilt 0° |

## Chemistry checks

- Reactant: `CC1=CCCCC1` (1-methylcyclohexene). Reagent: H₂O, H₂SO₄ (cat.) (`O`).
- Intermediate: `C[C+]1CCCCC1`, 1-methylcyclohexyl cation (3°).
- Intermediate: `CC1([OH2+])CCCCC1`, oxonium ion.
- Product: `CC1(O)CCCCC1`, 1-methylcyclohexan-1-ol. RDKit: no stereocentre. C1 has two identical ring arms, so it is not a stereocentre.
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.

## Stereo callout

**Either face, one product** (3D: stereo moment `planar-carbocation` in learn/engine/stereo-moments.js)

Water attacks the flat 3° cation from the top or the bottom face equally. C1 ends with CH₃, OH and two identical ring arms, so it is not a stereocentre: both faces give the same alcohol. Contrast 3-methylcyclohexene-type substrates, where the faces would give different stereoisomers.

## What-if links

[01-alkene-hx](01-alkene-hx.md), [07-alkene-hydroboration](07-alkene-hydroboration.md), [09-alkyne-hydration](09-alkyne-hydration.md)

## End quiz

**1-Methylcyclohexene is shaken with H₂O and a little H₂SO₄. Where does the OH end up?**

A. On C1, the carbon that holds the CH₃. **(correct)**  
   Why: Yes. H⁺ goes to C2, the 3° cation forms on C1, and water attacks it there.
B. On C2, the CH carbon.   
   Diagnosis: That needs H on C1 first, which leaves the less stable 2° cation on C2. The 3° route is much faster. (OH on C2 is what hydroboration gives.)
C. Half on C1, half on C2.   
   Diagnosis: The two possible cations differ (3° against 2°), so one path wins by far. A mixture comes only when both ends are alike.

## Notes

- Lesson 09 s11 draws this mechanism on 2-methylpropene; the scene uses the hub example (1-methylcyclohexene). Arrows are identical in kind.
- The attacking water is the one released in step 1 (atom 9). Chemically any solvent water does it; reusing the atom keeps the stage small. Caption says "A water O", not "the same water".

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "02-alkene-hydration",
 "title": "Acid-catalysed hydration of 1-methylcyclohexene",
 "reagentCard": "alkene-hydration",
 "alsoCards": [],
 "lesson": {
  "id": "09",
  "step": "s11"
 },
 "intent": "After this scene the learner can say: \"H₃O⁺ gives H⁺ to the carbon with more H, so the + lands on the 3° carbon. Water, not hydroxide, attacks that flat cation with an O lone pair, and a second water takes the extra H⁺ off. The acid comes back at the end: it is a catalyst. OH ends up Markovnikov.\"",
 "reactant": {
  "smiles": "CC1=CCCCC1",
  "name": "1-methylcyclohexene"
 },
 "reagent": {
  "smiles": "O",
  "label": "H₂O, H₂SO₄ (cat.)"
 },
 "products": [
  {
   "smiles": "CC1(O)CCCCC1",
   "name": "1-methylcyclohexan-1-ol",
   "stereo": "achiral",
   "note": "C1 has two identical ring arms, so it is not a stereocentre."
  }
 ],
 "intermediates": [
  {
   "name": "1-methylcyclohexyl cation (3°)",
   "smiles": "C[C+]1CCCCC1"
  },
  {
   "name": "oxonium ion",
   "smiles": "CC1([OH2+])CCCCC1"
  }
 ],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "3": "C3",
  "4": "C4",
  "5": "C5",
  "6": "C6",
  "7": "CH₃",
  "8": "H",
  "9": "O",
  "11": "O(w)",
  "12": "H′"
 },
 "stage": {
  "species": [
   {
    "key": "alkene",
    "role": "reactant",
    "smiles": "[CH3:7][C:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1",
    "label": "1-methylcyclohexene",
    "at": [0, 0],
    "style": "skeletal"
   },
   {
    "key": "H3O",
    "role": "reagent",
    "smiles": "[H:8][O+:9]([H:12])[H]",
    "label": "H₃O⁺",
    "at": [3.6, 0.8],
    "style": "full"
   }
  ],
  "state": "[CH3:7][C:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1.[H:8][O+:9]([H:12])[H]"
 },
 "layers": ["arrows", "orbitals"],
 "duration": 31.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0.0,
   "t1": 3.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "1-Methylcyclohexene in water with a little H₂SO₄. The acid makes H₃O⁺, which carries the H⁺.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [{"atom": 8, "sign": "+"}],
   "orbitals": [{"kind": "pi", "atoms": [1, 2], "side": "both", "emphasis": "focus", "electrons": 2}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2, 8],
    "tilt": 35
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:7][C:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1.[H:8][O+:9]([H:12])[H]"
  },
  {
   "id": "b2-choose",
   "t0": 4.0,
   "t1": 8.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "C2 has one H, C1 has none. H goes to C2, so the + lands on C1: 3°, the more stable cation.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "pi", "atoms": [1, 2], "side": "both", "emphasis": "normal", "electrons": 2}],
   "badges": [{"atom": 1, "text": "3° if +", "tone": "elec"}, {"atom": 2, "text": "2° if +", "tone": "muted"}],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2, 8],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:7][C:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1.[H:8][O+:9]([H:12])[H]"
  },
  {
   "id": "b3-protonate",
   "t0": 9.0,
   "t1": 13.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "The π pair takes the H⁺ from H₃O⁺ and bonds it to C2. The O–H pair stays on O: water leaves.",
   "moves": [
    {
     "species": "H3O",
     "anchor": 8,
     "near": 2,
     "offset": [0.5, 0.9, 0],
     "at": [0, 0.35]
    },
    {
     "atoms": [9, 12],
     "by": [0.9, 0.4, 0],
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
      "bond": [2, 8]
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
     "why": "The π pair attacks the H of H₃O⁺ and forms a new C–H bond on C2, the carbon with more H."
    },
    {
     "id": "a2",
     "from": {
      "bond": [8, 9]
     },
     "to": {
      "atom": 9
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
     "why": "The O–H pair stays on O, so H₃O⁺ becomes a neutral water molecule."
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
     "b": 8,
     "action": "form",
     "order": 1
    },
    {
     "a": 8,
     "b": 9,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [{"atom": 1, "charge": 1}, {"atom": 9, "charge": 0}],
   "partials": [],
   "orbitals": [{"kind": "p-empty", "atoms": [1], "side": "both", "emphasis": "focus", "electrons": 0}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2, 8],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:7][C+:1]1[CH:2]([H:8])[CH2:3][CH2:4][CH2:5][CH2:6]1.[H:12][OH:9]"
  },
  {
   "id": "b4-cation",
   "t0": 14.0,
   "t1": 17.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "C1 is now a flat 3° carbocation. Its empty p orbital opens on the top face and on the bottom face.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [1],
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
    "focus": [1],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:7][C+:1]1[CH:2]([H:8])[CH2:3][CH2:4][CH2:5][CH2:6]1.[H:12][OH:9]"
  },
  {
   "id": "b5-water",
   "t0": 18.0,
   "t1": 22.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "A water O gives a lone pair to C1, from either face. The new C–O bond leaves O with three bonds and a +.",
   "moves": [{"atoms": [9, 12], "anchor": 9, "near": 1, "offset": [0, 0, 1.6], "at": [0, 0.4]}],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 9
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
     "at": [0.35, 0.9],
     "why": "A lone pair on the water O attacks the positive carbon and becomes the new C–O bond."
    }
   ],
   "bonds": [{"a": 1, "b": 9, "action": "form", "order": 1}],
   "charges": [{"atom": 1, "charge": 0}, {"atom": 9, "charge": 1}],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [1],
     "side": "top",
     "emphasis": "focus",
     "electrons": 0
    },
    {
     "kind": "lone-pair",
     "atoms": [9],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "toward": 1
    }
   ],
   "badges": [],
   "ghosts": [{"atoms": [9, 12], "offset": [0, 0, -3.2], "label": "or from below"}],
   "camera": {
    "zoom": 1.3,
    "focus": [1],
    "tilt": 55
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:7][C:1]1([OH+:9][H:12])[CH:2]([H:8])[CH2:3][CH2:4][CH2:5][CH2:6]1"
  },
  {
   "id": "b6-deprotonate",
   "t0": 23.0,
   "t1": 27.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "A second water takes the extra H⁺ from that O. The O–H pair stays on O, and H₃O⁺ is made again.",
   "adds": [
    {
     "key": "water2",
     "role": "solvent",
     "smiles": "[OH2:11]",
     "label": "H₂O",
     "at": "auto",
     "style": "full"
    }
   ],
   "moves": [
    {
     "atoms": [11],
     "anchor": 11,
     "near": 12,
     "offset": [0.9, -0.3, 0],
     "at": [0, 0.3]
    },
    {
     "atoms": [11, 12],
     "by": [0.8, -0.4, 0],
     "at": [0.8, 1]
    }
   ],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 11
     },
     "to": {
      "atom": 12
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
     "why": "A lone pair on the second water takes the extra H⁺ from the oxonium O."
    },
    {
     "id": "a2",
     "from": {
      "bond": [9, 12]
     },
     "to": {
      "atom": 9
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
     "why": "The O–H pair stays on the O bonded to C1, which loses its +."
    }
   ],
   "bonds": [
    {
     "a": 9,
     "b": 12,
     "action": "break",
     "order": 0
    },
    {
     "a": 11,
     "b": 12,
     "action": "form",
     "order": 1
    }
   ],
   "charges": [{"atom": 9, "charge": 0}, {"atom": 11, "charge": 1}],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1],
    "tilt": 0
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:7][C:1]1([OH:9])[CH:2]([H:8])[CH2:3][CH2:4][CH2:5][CH2:6]1.[H:12][OH2+:11]"
  },
  {
   "id": "b7-product",
   "t0": 28.0,
   "t1": 31.0,
   "hold": 0,
   "kind": "look",
   "caption": "1-Methylcyclohexan-1-ol. OH sits on the carbon with the CH₃. The acid came back: it is only a catalyst.",
   "drops": [11],
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
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:7][C:1]1([OH:9])[CH:2]([H:8])[CH2:3][CH2:4][CH2:5][CH2:6]1",
   "relayout": {
    "anchor": [1, 2]
   }
  }
 ],
 "stereoCallout": {
  "title": "Either face, one product",
  "stereoMoment": "planar-carbocation",
  "text": "Water attacks the flat 3° cation from the top or the bottom face equally. C1 ends with CH₃, OH and two identical ring arms, so it is not a stereocentre: both faces give the same alcohol. Contrast 3-methylcyclohexene-type substrates, where the faces would give different stereoisomers."
 },
 "whatIf": ["01-alkene-hx", "07-alkene-hydroboration", "09-alkyne-hydration"],
 "quiz": {
  "q": "1-Methylcyclohexene is shaken with H₂O and a little H₂SO₄. Where does the OH end up?",
  "options": [
   {
    "text": "On C1, the carbon that holds the CH₃.",
    "correct": true,
    "why": "Yes. H⁺ goes to C2, the 3° cation forms on C1, and water attacks it there."
   },
   {
    "text": "On C2, the CH carbon.",
    "correct": false,
    "why": "That needs H on C1 first, which leaves the less stable 2° cation on C2. The 3° route is much faster. (OH on C2 is what hydroboration gives.)"
   },
   {
    "text": "Half on C1, half on C2.",
    "correct": false,
    "why": "The two possible cations differ (3° against 2°), so one path wins by far. A mixture comes only when both ends are alike."
   }
  ]
 },
 "notes": ["Lesson 09 s11 draws this mechanism on 2-methylpropene; the scene uses the hub example (1-methylcyclohexene). Arrows are identical in kind.", "The attacking water is the one released in step 1 (atom 9). Chemically any solvent water does it; reusing the atom keeps the stage small. Caption says \"A water O\", not \"the same water\"."]
}
```

</details>
