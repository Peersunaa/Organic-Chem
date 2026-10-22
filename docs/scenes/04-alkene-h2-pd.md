# 04 · H₂ on Pd/C: syn addition to 1,2-dimethylcyclohexene

**Scene id** `04-alkene-h2-pd` · **Hub card** `alkene-h2-pd` · **Taught in** Lesson 10 s06 · **Runtime** 31 s, 7 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "H₂ and the alkene both stick to the metal surface. The alkene lies with one face on the metal, and both H atoms move up onto that same face: syn addition. The two CH₃ groups are pushed to the other face together, so the product is cis (and here meso)."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `alkene` | reactant | `[CH3:7][C:1]1=[C:2]([CH3:8])[CH2:3][CH2:4][CH2:5][CH2:6]1` | 1,2-dimethylcyclohexene | [1.5, -1.2] | skeletal |
| `H2` | reagent | `[H:9][H:10]` | H₂ | [5.2, -1.6] | full |
| `Pd` | catalyst | `[Pd:20].[Pd:21].[Pd:22]` | Pd surface | surface | surface |

Surface: Pd metal surface (plane `z`, z = -1.4).

Atom names used in captions and tables: 1 = C1, 2 = C2, 3 = C3, 6 = C6, 7 = CH₃(1), 8 = CH₃(2), 9 = H(a), 10 = H(b), 20 = Pd(a), 21 = Pd(b), 22 = Pd(c).

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | 1,2-Dimethylcyclohexene, H₂ and solid Pd on carbon. The reaction happens on the flat metal surface. | hold the picture | metal surface; π cloud C1–C2 (both faces, 2 e⁻, focus) | zoom 1, tilt 65°, focus C1/C2, faces shown |
| 2 | `b2-h2` · step | 4–8 (+1 hold) | H₂ sticks to the metal and its H–H bond breaks. Two H atoms now sit on the surface, ready to move. | H(a) settles on the metal at Pd(a); H(b) settles on the metal at Pd(b)<br>**no curved arrows** (surface: motion trails only)<br>bonds: breaks H(a)–H(b), forms H(a)–Pd(a), forms H(b)–Pd(b) | metal surface (focus) | zoom 1, tilt 65°, focus C1/C2, faces shown |
| 3 | `b3-land` · look | 9–12 (+1 hold) | The alkene lies flat on the metal, with its bottom face and its π cloud against the surface. | alkene docks (C1 over Pd(a); C2 over Pd(c)) | metal surface; π cloud C1–C2 (bottom face, 2 e⁻, focus) | zoom 1, tilt 65°, focus C1/C2, faces shown |
| 4 | `b4-first-h` · step | 13–17 (+1 hold) | One H moves up from the metal to C1, on the bottom face. C2 holds on to the metal for a moment. | H(a) moves to C1 (below, bottom face)<br>**no curved arrows** (surface: motion trails only)<br>bonds: C1=C2 → C1–C2, forms C1–H(a), forms C2–Pd(c), breaks H(a)–Pd(a) | metal surface | zoom 1, tilt 65°, focus C1/C2, faces shown |
| 5 | `b5-second-h` · step | 18–22 (+1 hold) | The second H moves to C2 from the same side. Both H came from below: syn addition. | H(b) moves to C2 (below, bottom face)<br>**no curved arrows** (surface: motion trails only)<br>bonds: forms C2–H(b), breaks C2–Pd(c), breaks H(b)–Pd(b) | metal surface | zoom 1, tilt 65°, focus C1/C2, faces shown |
| 6 | `b6-lift` · look | 23–27 (+1 hold) | Both new H are on the bottom face, so both CH₃ groups were pushed to the top: cis-1,2-dimethylcyclohexane. | alkene lifts off the surface<br>badges: CH₃(1) “up”, CH₃(2) “up”<br>relayout to the product drawing | metal surface (ghost) | zoom 1, tilt 65°, focus C1/C2, faces shown |
| 7 | `b7-meso` · look | 28–31 (+0 hold) | Landing on the other face gives the same compound. This cis product is meso: it has no mirror-image twin. | hold the picture | — | zoom 1, tilt 0° |

Beat notes for the implementer:

- `b2-h2`: No curved arrows: the course shows surface chemistry as pictures. The H–H bond fades out as the two H dots settle on two metal sites.

## Chemistry checks

- Reactant: `CC1=C(C)CCCC1` (1,2-dimethylcyclohexene). Reagent: H₂, Pd/C (`[H][H]`).
- Intermediate: `CC1([H])C(C)([Pd])CCCC1`, half-hydrogenated, surface-bound alkyl (shown schematically).
- Product: `C[C@@H]1CCCC[C@@H]1C`, cis-1,2-dimethylcyclohexane. RDKit: meso (CIP R, S, superimposable on its mirror image). Meso: it has a mirror plane, so both faces give this one compound.
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.

## Stereo callout

**Syn: both H from one surface** (3D: stereo moment `syn-hydrogenation` in learn/engine/stereo-moments.js)

Both H atoms come off the same metal surface onto the same face, so the two CH₃ groups end up cis. cis-1,2-Dimethylcyclohexane has a mirror plane: meso, a single compound. The trans isomer (contrast model) would need H on opposite faces; H₂/Pd never gives it.

## What-if links

[10-alkyne-lindlar](10-alkyne-lindlar.md), [06-alkene-kmno4-cold](06-alkene-kmno4-cold.md), [03-alkene-x2](03-alkene-x2.md)

## End quiz

**1,2-Dimethylcyclohexene is stirred with H₂ and Pd/C. Which product forms?**

A. cis-1,2-Dimethylcyclohexane (meso). **(correct)**  
   Why: Yes. Both H add to the face on the metal, so both CH₃ are pushed to the other face together.
B. trans-1,2-Dimethylcyclohexane.   
   Diagnosis: trans needs the two H on opposite faces. Both come from the one metal surface, so they add to the same face.
C. A racemic pair of cis enantiomers.   
   Diagnosis: cis-1,2-Dimethylcyclohexane has a mirror plane, so it is meso: one compound, not a pair.

## Notes

- The two-step H transfer (Horiuti–Polanyi) is drawn as the course text describes it: H₂ and alkene on the surface, H atoms pass to one face. Pd atoms 20–22 exist only so the checker can track bonds; render them as sites in the metal slab, never as "Pd" letters.
- Ring drawn flat (z = 0 for ring atoms); the chair is not needed for the face argument.

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "04-alkene-h2-pd",
 "title": "H₂ on Pd/C: syn addition to 1,2-dimethylcyclohexene",
 "reagentCard": "alkene-h2-pd",
 "alsoCards": [],
 "lesson": {
  "id": "10",
  "step": "s06"
 },
 "intent": "After this scene the learner can say: \"H₂ and the alkene both stick to the metal surface. The alkene lies with one face on the metal, and both H atoms move up onto that same face: syn addition. The two CH₃ groups are pushed to the other face together, so the product is cis (and here meso).\"",
 "reactant": {
  "smiles": "CC1=C(C)CCCC1",
  "name": "1,2-dimethylcyclohexene"
 },
 "reagent": {
  "smiles": "[H][H]",
  "label": "H₂, Pd/C"
 },
 "products": [
  {
   "smiles": "C[C@@H]1CCCC[C@@H]1C",
   "name": "cis-1,2-dimethylcyclohexane",
   "stereo": "meso",
   "note": "Meso: it has a mirror plane, so both faces give this one compound."
  }
 ],
 "intermediates": [
  {
   "name": "half-hydrogenated, surface-bound alkyl (shown schematically)",
   "smiles": "CC1([H])C(C)([Pd])CCCC1"
  }
 ],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "3": "C3",
  "6": "C6",
  "7": "CH₃(1)",
  "8": "CH₃(2)",
  "9": "H(a)",
  "10": "H(b)",
  "20": "Pd(a)",
  "21": "Pd(b)",
  "22": "Pd(c)"
 },
 "stage": {
  "species": [
   {
    "key": "alkene",
    "role": "reactant",
    "smiles": "[CH3:7][C:1]1=[C:2]([CH3:8])[CH2:3][CH2:4][CH2:5][CH2:6]1",
    "label": "1,2-dimethylcyclohexene",
    "at": [1.5, -1.2],
    "style": "skeletal"
   },
   {
    "key": "H2",
    "role": "reagent",
    "smiles": "[H:9][H:10]",
    "label": "H₂",
    "at": [5.2, -1.6],
    "style": "full"
   },
   {
    "key": "Pd",
    "role": "catalyst",
    "smiles": "[Pd:20].[Pd:21].[Pd:22]",
    "label": "Pd surface",
    "at": "surface",
    "style": "surface"
   }
  ],
  "surface": {
   "kind": "Pd/C",
   "plane": "z",
   "z": -1.4,
   "label": "Pd metal surface"
  },
  "state": "[CH3:7][C:1]1=[C:2]([CH3:8])[CH2:3][CH2:4][CH2:5][CH2:6]1.[H:9][H:10].[Pd:20].[Pd:21].[Pd:22]"
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
   "caption": "1,2-Dimethylcyclohexene, H₂ and solid Pd on carbon. The reaction happens on the flat metal surface.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "surface",
     "atoms": [20, 21, 22],
     "side": "bottom",
     "emphasis": "normal"
    },
    {
     "kind": "pi",
     "atoms": [1, 2],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "face toward the metal"
    }
   },
   "state": "[CH3:7][C:1]1=[C:2]([CH3:8])[CH2:3][CH2:4][CH2:5][CH2:6]1.[H:9][H:10].[Pd:20].[Pd:21].[Pd:22]"
  },
  {
   "id": "b2-h2",
   "t0": 4.0,
   "t1": 8.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "H₂ sticks to the metal and its H–H bond breaks. Two H atoms now sit on the surface, ready to move.",
   "moves": [
    {
     "atoms": [9],
     "anchor": 9,
     "near": 20,
     "offset": [0, 0, 0.5],
     "at": [0, 0.8],
     "trail": true
    },
    {
     "atoms": [10],
     "anchor": 10,
     "near": 21,
     "offset": [0, 0, 0.5],
     "at": [0, 0.8],
     "trail": true
    }
   ],
   "arrows": [],
   "bonds": [
    {
     "a": 9,
     "b": 10,
     "action": "break",
     "order": 0
    },
    {
     "a": 9,
     "b": 20,
     "action": "form",
     "order": 1
    },
    {
     "a": 10,
     "b": 21,
     "action": "form",
     "order": 1
    }
   ],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "surface", "atoms": [20, 21, 22], "side": "bottom", "emphasis": "focus"}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "face toward the metal"
    }
   },
   "state": "[CH3:7][C:1]1=[C:2]([CH3:8])[CH2:3][CH2:4][CH2:5][CH2:6]1.[H:9][Pd:20].[H:10][Pd:21].[Pd:22]",
   "notes": "No curved arrows: the course shows surface chemistry as pictures. The H–H bond fades out as the two H dots settle on two metal sites."
  },
  {
   "id": "b3-land",
   "t0": 9.0,
   "t1": 12.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "The alkene lies flat on the metal, with its bottom face and its π cloud against the surface.",
   "moves": [{"species": "alkene", "pairs": [[1, 20], [2, 22]], "gap": [0, 0, 1.0], "at": [0, 0.8]}],
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "surface",
     "atoms": [20, 21, 22],
     "side": "bottom",
     "emphasis": "normal"
    },
    {
     "kind": "pi",
     "atoms": [1, 2],
     "side": "bottom",
     "emphasis": "focus",
     "electrons": 2
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "face toward the metal"
    }
   },
   "state": "[CH3:7][C:1]1=[C:2]([CH3:8])[CH2:3][CH2:4][CH2:5][CH2:6]1.[H:9][Pd:20].[H:10][Pd:21].[Pd:22]"
  },
  {
   "id": "b4-first-h",
   "t0": 13.0,
   "t1": 17.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "One H moves up from the metal to C1, on the bottom face. C2 holds on to the metal for a moment.",
   "moves": [{"atoms": [9], "anchor": 9, "near": 1, "offset": [0, 0, -1.0], "at": [0.1, 0.8], "trail": true}],
   "arrows": [],
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
     "a": 2,
     "b": 22,
     "action": "form",
     "order": 1
    },
    {
     "a": 9,
     "b": 20,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "surface", "atoms": [20, 21, 22], "side": "bottom", "emphasis": "normal"}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "face toward the metal"
    }
   },
   "state": "[CH3:7][C:1]1([H:9])[C:2]([CH3:8])([Pd:22])[CH2:3][CH2:4][CH2:5][CH2:6]1.[Pd:20].[H:10][Pd:21]"
  },
  {
   "id": "b5-second-h",
   "t0": 18.0,
   "t1": 22.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "The second H moves to C2 from the same side. Both H came from below: syn addition.",
   "moves": [{"atoms": [10], "anchor": 10, "near": 2, "offset": [0, 0, -1.0], "at": [0.1, 0.8], "trail": true}],
   "arrows": [],
   "bonds": [
    {
     "a": 2,
     "b": 10,
     "action": "form",
     "order": 1
    },
    {
     "a": 2,
     "b": 22,
     "action": "break",
     "order": 0
    },
    {
     "a": 10,
     "b": 21,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "surface", "atoms": [20, 21, 22], "side": "bottom", "emphasis": "normal"}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "face toward the metal"
    }
   },
   "state": "[CH3:7][C:1]1([H:9])[C:2]([CH3:8])([H:10])[CH2:3][CH2:4][CH2:5][CH2:6]1.[Pd:20].[Pd:21].[Pd:22]",
   "pose": {
    "7": 1,
    "8": 1,
    "9": -1,
    "10": -1
   }
  },
  {
   "id": "b6-lift",
   "t0": 23.0,
   "t1": 27.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Both new H are on the bottom face, so both CH₃ groups were pushed to the top: cis-1,2-dimethylcyclohexane.",
   "moves": [{"species": "alkene", "by": [0, 0, 1.2], "at": [0, 0.6]}],
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "surface", "atoms": [20, 21, 22], "side": "bottom", "emphasis": "ghost"}],
   "badges": [{"atom": 7, "text": "up", "tone": "muted"}, {"atom": 8, "text": "up", "tone": "muted"}],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "face toward the metal"
    }
   },
   "state": "[CH3:7][C:1]1([H:9])[C:2]([CH3:8])([H:10])[CH2:3][CH2:4][CH2:5][CH2:6]1.[Pd:20].[Pd:21].[Pd:22]",
   "relayout": {
    "anchor": [1, 2]
   }
  },
  {
   "id": "b7-meso",
   "t0": 28.0,
   "t1": 31.0,
   "hold": 0,
   "kind": "look",
   "caption": "Landing on the other face gives the same compound. This cis product is meso: it has no mirror-image twin.",
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
     "bottom": "face toward the metal"
    }
   },
   "state": "[CH3:7][C:1]1([H:9])[C:2]([CH3:8])([H:10])[CH2:3][CH2:4][CH2:5][CH2:6]1.[Pd:20].[Pd:21].[Pd:22]"
  }
 ],
 "stereoCallout": {
  "title": "Syn: both H from one surface",
  "stereoMoment": "syn-hydrogenation",
  "text": "Both H atoms come off the same metal surface onto the same face, so the two CH₃ groups end up cis. cis-1,2-Dimethylcyclohexane has a mirror plane: meso, a single compound. The trans isomer (contrast model) would need H on opposite faces; H₂/Pd never gives it."
 },
 "whatIf": ["10-alkyne-lindlar", "06-alkene-kmno4-cold", "03-alkene-x2"],
 "quiz": {
  "q": "1,2-Dimethylcyclohexene is stirred with H₂ and Pd/C. Which product forms?",
  "options": [
   {
    "text": "cis-1,2-Dimethylcyclohexane (meso).",
    "correct": true,
    "why": "Yes. Both H add to the face on the metal, so both CH₃ are pushed to the other face together."
   },
   {
    "text": "trans-1,2-Dimethylcyclohexane.",
    "correct": false,
    "why": "trans needs the two H on opposite faces. Both come from the one metal surface, so they add to the same face."
   },
   {
    "text": "A racemic pair of cis enantiomers.",
    "correct": false,
    "why": "cis-1,2-Dimethylcyclohexane has a mirror plane, so it is meso: one compound, not a pair."
   }
  ]
 },
 "notes": ["The two-step H transfer (Horiuti–Polanyi) is drawn as the course text describes it: H₂ and alkene on the surface, H atoms pass to one face. Pd atoms 20–22 exist only so the checker can track bonds; render them as sites in the metal slab, never as \"Pd\" letters.", "Ring drawn flat (z = 0 for ring atoms); the chair is not needed for the face argument."]
}
```

</details>
