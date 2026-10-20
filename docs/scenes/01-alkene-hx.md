# 01 · HBr adds to 2-methylpropene

**Scene id** `01-alkene-hx` · **Hub card** `alkene-hx` · **Taught in** Lesson 09 s08 · **Runtime** 34 s, 8 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "The π pair grabs the H of HBr. H goes to the carbon that already has more H, because that leaves the + on the carbon with more carbon neighbours (3°, the stable cation). The cation is flat, so Br⁻ can land on either face; here both faces give the same product."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `alkene` | reactant | `[CH2:1]=[C:2]([CH3:3])[CH3:4]` | 2-methylpropene | [0, 0] | full |
| `HBr` | reagent | `[H:5][Br:6]` | HBr | [3.4, -0.6] | full |

Atom names used in captions and tables: 1 = C1, 2 = C2, 3 = CH₃(a), 4 = CH₃(b), 5 = H, 6 = Br.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | 2-Methylpropene meets HBr. The C=C holds a π pair that sits above and below the flat molecule. | δ: H δ+, Br δ− | π cloud C1–C2 (both faces, 2 e⁻, focus)<br>*caption swaps to:* “The π cloud: two electrons above and below the C=C. They are easy for a reagent to reach.” | zoom 1, tilt 35°, focus C1/C2/H |
| 2 | `b2-choose` · look | 4–8 (+1 hold) | H on C1 leaves the + on C2 (3°). H on C2 would leave it on C1 (1°). The 3° cation is far more stable. | δ: H δ+, Br δ−<br>badges: C2 “3° if +”, C1 “1° if +” | π cloud C1–C2 (both faces, 2 e⁻) | zoom 1, tilt 0°, focus C1/C2 |
| 3 | `b3-attack` · step | 9–13 (+1 hold) | The π pair reaches for the δ+ H and makes a new C–H bond on C1. The H–Br pair leaves with Br as Br⁻. | HBr moves to C1; Br drifts aside<br>**arrows:** (1) π(C1=C2) → new bond C1–H · (2) σ(H–Br) → onto Br<br>bonds: C1=C2 → C1–C2, forms C1–H, breaks H–Br<br>charges: C2 +, Br − | empty p orbital C2 (both faces, focus) | zoom 1, tilt 0°, focus C1/C2 |
| 4 | `b4-cation` · look | 14–17 (+1 hold) | C2 now has three bonds and only six electrons. It is flat, with an empty p orbital on each face. | hold the picture | empty p orbital C2 (both faces, focus) | zoom 1.3, tilt 65°, focus C2, faces shown |
| 5 | `b5-stable` · look | 18–21 (+1 hold) | Three carbon neighbours lend it electron density (the inductive effect). That steadies this 3° cation. | badges: C2 “3°”, C1 “C”, CH₃(a) “C”, CH₃(b) “C” | empty p orbital C2 (both faces) | zoom 1.1, tilt 0°, focus C2 |
| 6 | `b6-bromide` · step | 22–26 (+1 hold) | Br⁻ gives a lone pair to the empty p orbital (opposite charges attract). The new C–Br bond forms. | Br moves to C2 (above, top face)<br>**arrows:** (1) lone pair on Br → C2 (new Br–C2 bond)<br>bonds: forms C2–Br<br>charges: C2 0, Br 0 | empty p orbital C2 (top face, focus); lone-pair lobe Br (both faces, 2 e⁻, pointing at C2, focus) | zoom 1.1, tilt 55°, focus C2/Br, faces shown |
| 7 | `b7-either` · look | 27–30 (+1 hold) | Br⁻ could just as well come from the bottom face. Here both faces give the very same product. | ghost: or from below | empty p orbital C2 (bottom face, ghost) | zoom 1.1, tilt 55°, focus C2/Br, faces shown |
| 8 | `b8-product` · look | 31–34 (+0 hold) | 2-Bromo-2-methylpropane. H went to the carbon with more H; Br went to the carbon with more alkyl groups. | relayout to the product drawing | — | zoom 1, tilt 0° |

Beat notes for the implementer:

- `b5-stable`: Draw three short teal "push" chevrons along C1→C2, C3→C2, C4→C2 (inductive donation). No hyperconjugation: the course does not teach it.

## Chemistry checks

- Reactant: `CC(C)=C` (2-methylpropene). Reagent: HBr (`Br`).
- Intermediate: `C[C+](C)C`, tert-butyl cation (3°).
- Intermediate: `CC(C)[CH2+]`, isobutyl cation (1°, NOT formed).
- Product: `CC(C)(C)Br`, 2-bromo-2-methylpropane (tert-butyl bromide). RDKit: no stereocentre. C2 holds two identical CH₃ groups, so it is not a stereocentre: one product, whichever face Br⁻ uses.
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.

## Stereo callout

**Flat cation, two faces** (3D: stereo moment `planar-carbocation` in learn/engine/stereo-moments.js)

The cation is flat, so Br⁻ arrives from the top or the bottom face equally often. Here C2 carries two identical CH₃ groups, so both routes give one compound. If the new C–Br carbon were a stereocentre (HBr + but-1-ene → 2-bromobutane), the two faces would give the two mirror images: a racemate.

## What-if links

[02-alkene-hydration](02-alkene-hydration.md), [03-alkene-x2](03-alkene-x2.md), [04-alkene-h2-pd](04-alkene-h2-pd.md), [07-alkene-hydroboration](07-alkene-hydroboration.md), [08-alkyne-hx](08-alkyne-hx.md)

## End quiz

**HBr adds to 2-methylpropene. Why does the H bond to the CH₂ carbon (C1)?**

A. That leaves the + on C2, which has three carbon neighbours: the more stable 3° cation. **(correct)**  
   Why: Yes. The route through the more stable cation has the lower barrier, so it is the fast one.
B. Br is too big to fit on the CH₂ carbon.   
   Diagnosis: Size is not the reason. Where H goes is decided in step 1, by which cation forms, before Br⁻ arrives.
C. C1 is more electron-poor, so it attracts the H.   
   Diagnosis: H⁺ wants electrons, so it does not go to a poor carbon. The choice is set by the cation left behind on the OTHER carbon.

## Notes

- Course level: cation stability is explained by the inductive effect only (Lesson 09 s06). Do not show hyperconjugation.
- Hub card example is 1-methylcyclohexene; this scene uses 2-methylpropene as the brief and Lesson 09 s08 do (3° against 1° is the starkest contrast). The ring substrate is in scene 02.

**Card vs storyboard:** Hub card example substrate is 1-methylcyclohexene → 1-bromo-1-methylcyclohexane; the scene uses 2-methylpropene (brief, Lesson 09 s08).

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "01-alkene-hx",
 "title": "HBr adds to 2-methylpropene",
 "reagentCard": "alkene-hx",
 "alsoCards": [],
 "lesson": {
  "id": "09",
  "step": "s08"
 },
 "intent": "After this scene the learner can say: \"The π pair grabs the H of HBr. H goes to the carbon that already has more H, because that leaves the + on the carbon with more carbon neighbours (3°, the stable cation). The cation is flat, so Br⁻ can land on either face; here both faces give the same product.\"",
 "reactant": {
  "smiles": "CC(C)=C",
  "name": "2-methylpropene"
 },
 "reagent": {
  "smiles": "Br",
  "label": "HBr"
 },
 "products": [
  {
   "smiles": "CC(C)(C)Br",
   "name": "2-bromo-2-methylpropane (tert-butyl bromide)",
   "stereo": "achiral",
   "note": "C2 holds two identical CH₃ groups, so it is not a stereocentre: one product, whichever face Br⁻ uses."
  }
 ],
 "intermediates": [
  {
   "name": "tert-butyl cation (3°)",
   "smiles": "C[C+](C)C"
  },
  {
   "name": "isobutyl cation (1°, NOT formed)",
   "smiles": "CC(C)[CH2+]"
  }
 ],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "3": "CH₃(a)",
  "4": "CH₃(b)",
  "5": "H",
  "6": "Br"
 },
 "stage": {
  "species": [
   {
    "key": "alkene",
    "role": "reactant",
    "smiles": "[CH2:1]=[C:2]([CH3:3])[CH3:4]",
    "label": "2-methylpropene",
    "at": [0, 0],
    "style": "full"
   },
   {
    "key": "HBr",
    "role": "reagent",
    "smiles": "[H:5][Br:6]",
    "label": "HBr",
    "at": [3.4, -0.6],
    "style": "full"
   }
  ],
  "state": "[CH2:1]=[C:2]([CH3:3])[CH3:4].[H:5][Br:6]"
 },
 "layers": ["arrows", "orbitals"],
 "duration": 34.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0.0,
   "t1": 3.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "2-Methylpropene meets HBr. The C=C holds a π pair that sits above and below the flat molecule.",
   "captionOrbitals": "The π cloud: two electrons above and below the C=C. They are easy for a reagent to reach.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [{"atom": 5, "sign": "+"}, {"atom": 6, "sign": "-"}],
   "orbitals": [{"kind": "pi", "atoms": [1, 2], "side": "both", "emphasis": "focus", "electrons": 2}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2, 5],
    "tilt": 35
   },
   "faces": {
    "show": false
   },
   "state": "[CH2:1]=[C:2]([CH3:3])[CH3:4].[H:5][Br:6]"
  },
  {
   "id": "b2-choose",
   "t0": 4.0,
   "t1": 8.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "H on C1 leaves the + on C2 (3°). H on C2 would leave it on C1 (1°). The 3° cation is far more stable.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [{"atom": 5, "sign": "+"}, {"atom": 6, "sign": "-"}],
   "orbitals": [{"kind": "pi", "atoms": [1, 2], "side": "both", "emphasis": "normal", "electrons": 2}],
   "badges": [{"atom": 2, "text": "3° if +", "tone": "elec"}, {"atom": 1, "text": "1° if +", "tone": "muted"}],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH2:1]=[C:2]([CH3:3])[CH3:4].[H:5][Br:6]"
  },
  {
   "id": "b3-attack",
   "t0": 9.0,
   "t1": 13.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "The π pair reaches for the δ+ H and makes a new C–H bond on C1. The H–Br pair leaves with Br as Br⁻.",
   "moves": [
    {
     "species": "HBr",
     "anchor": 5,
     "near": 1,
     "offset": [0.3, -1.0, 0],
     "at": [0, 0.35]
    },
    {
     "atoms": [6],
     "by": [1.0, -0.4, 0],
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
      "bond": [1, 5]
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
     "why": "The π pair attacks the δ+ H of HBr and forms a new C–H bond on C1, the carbon with more H."
    },
    {
     "id": "a2",
     "from": {
      "bond": [5, 6]
     },
     "to": {
      "atom": 6
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
     "why": "The H–Br pair leaves with Br, the more electronegative atom, so Br becomes Br⁻."
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
     "b": 5,
     "action": "form",
     "order": 1
    },
    {
     "a": 5,
     "b": 6,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [{"atom": 2, "charge": 1}, {"atom": 6, "charge": -1}],
   "partials": [],
   "orbitals": [{"kind": "p-empty", "atoms": [2], "side": "both", "emphasis": "focus", "electrons": 0}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[H:5][CH2:1][C+:2]([CH3:3])[CH3:4].[Br-:6]"
  },
  {
   "id": "b4-cation",
   "t0": 14.0,
   "t1": 17.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "C2 now has three bonds and only six electrons. It is flat, with an empty p orbital on each face.",
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
     "label": "empty p"
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.3,
    "focus": [2],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[H:5][CH2:1][C+:2]([CH3:3])[CH3:4].[Br-:6]"
  },
  {
   "id": "b5-stable",
   "t0": 18.0,
   "t1": 21.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Three carbon neighbours lend it electron density (the inductive effect). That steadies this 3° cation.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "p-empty", "atoms": [2], "side": "both", "emphasis": "normal", "electrons": 0}],
   "badges": [
    {
     "atom": 2,
     "text": "3°",
     "tone": "elec"
    },
    {
     "atom": 1,
     "text": "C",
     "tone": "nuc"
    },
    {
     "atom": 3,
     "text": "C",
     "tone": "nuc"
    },
    {
     "atom": 4,
     "text": "C",
     "tone": "nuc"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [2],
    "tilt": 0
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[H:5][CH2:1][C+:2]([CH3:3])[CH3:4].[Br-:6]",
   "notes": "Draw three short teal \"push\" chevrons along C1→C2, C3→C2, C4→C2 (inductive donation). No hyperconjugation: the course does not teach it."
  },
  {
   "id": "b6-bromide",
   "t0": 22.0,
   "t1": 26.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Br⁻ gives a lone pair to the empty p orbital (opposite charges attract). The new C–Br bond forms.",
   "moves": [{"atoms": [6], "anchor": 6, "near": 2, "offset": [0, 0, 1.6], "at": [0, 0.4]}],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 6
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
     "why": "A lone pair on Br⁻ attacks the positive carbon, because opposite charges attract, and becomes the new C–Br bond."
    }
   ],
   "bonds": [{"a": 2, "b": 6, "action": "form", "order": 1}],
   "charges": [{"atom": 2, "charge": 0}, {"atom": 6, "charge": 0}],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [2],
     "side": "top",
     "emphasis": "focus",
     "electrons": 0
    },
    {
     "kind": "lone-pair",
     "atoms": [6],
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
    "focus": [2, 6],
    "tilt": 55
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[H:5][CH2:1][C:2]([CH3:3])([CH3:4])[Br:6]"
  },
  {
   "id": "b7-either",
   "t0": 27.0,
   "t1": 30.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Br⁻ could just as well come from the bottom face. Here both faces give the very same product.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "p-empty", "atoms": [2], "side": "bottom", "emphasis": "ghost", "electrons": 0}],
   "badges": [],
   "ghosts": [{"atoms": [6], "offset": [0, 0, -2.0], "label": "or from below"}],
   "camera": {
    "zoom": 1.1,
    "focus": [2, 6],
    "tilt": 55
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[H:5][CH2:1][C:2]([CH3:3])([CH3:4])[Br:6]"
  },
  {
   "id": "b8-product",
   "t0": 31.0,
   "t1": 34.0,
   "hold": 0,
   "kind": "look",
   "caption": "2-Bromo-2-methylpropane. H went to the carbon with more H; Br went to the carbon with more alkyl groups.",
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
   "state": "[H:5][CH2:1][C:2]([CH3:3])([CH3:4])[Br:6]",
   "relayout": {
    "anchor": [1, 2]
   }
  }
 ],
 "stereoCallout": {
  "title": "Flat cation, two faces",
  "stereoMoment": "planar-carbocation",
  "text": "The cation is flat, so Br⁻ arrives from the top or the bottom face equally often. Here C2 carries two identical CH₃ groups, so both routes give one compound. If the new C–Br carbon were a stereocentre (HBr + but-1-ene → 2-bromobutane), the two faces would give the two mirror images: a racemate."
 },
 "whatIf": ["02-alkene-hydration", "03-alkene-x2", "04-alkene-h2-pd", "07-alkene-hydroboration", "08-alkyne-hx"],
 "quiz": {
  "q": "HBr adds to 2-methylpropene. Why does the H bond to the CH₂ carbon (C1)?",
  "options": [
   {
    "text": "That leaves the + on C2, which has three carbon neighbours: the more stable 3° cation.",
    "correct": true,
    "why": "Yes. The route through the more stable cation has the lower barrier, so it is the fast one."
   },
   {
    "text": "Br is too big to fit on the CH₂ carbon.",
    "correct": false,
    "why": "Size is not the reason. Where H goes is decided in step 1, by which cation forms, before Br⁻ arrives."
   },
   {
    "text": "C1 is more electron-poor, so it attracts the H.",
    "correct": false,
    "why": "H⁺ wants electrons, so it does not go to a poor carbon. The choice is set by the cation left behind on the OTHER carbon."
   }
  ]
 },
 "notes": ["Course level: cation stability is explained by the inductive effect only (Lesson 09 s06). Do not show hyperconjugation.", "Hub card example is 1-methylcyclohexene; this scene uses 2-methylpropene as the brief and Lesson 09 s08 do (3° against 1° is the starkest contrast). The ring substrate is in scene 02."]
}
```

</details>
