# 10 · H₂ with the Lindlar catalyst: but-2-yne to the cis alkene

**Scene id** `10-alkyne-lindlar` · **Hub card** `alkyne-lindlar` (also `alkyne-h2-pd`) · **Taught in** Lesson 12 s11 · **Runtime** 31 s, 7 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "On the metal surface both H atoms move onto the alkyne from the same side (syn), so both CH₃ groups end on the other side: the cis (Z) alkene. The Lindlar catalyst is deliberately weakened, so it lets the alkene go before a second H₂ can add; Pd/C would go on to the alkane."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `alkyne` | reactant | `[CH3:1][C:2]#[C:3][CH3:4]` | but-2-yne | [1.0, -1.6] | full |
| `H2` | reagent | `[H:5][H:6]` | H₂ | [5.4, -1.2] | full |
| `Pd` | catalyst | `[Pd:20].[Pd:21].[Pd:22]` | Lindlar Pd surface | surface | surface |

Surface: Lindlar catalyst (Pd, lead-poisoned) (plane `y`, y = 1.6).

Layout note for `alkyne`: All four carbons on one straight line.

Atom names used in captions and tables: 1 = CH₃(a), 2 = C2, 3 = C3, 4 = CH₃(b), 5 = H(a), 6 = H(b), 20 = Pd(a), 21 = Pd(b), 22 = Pd(c).

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | But-2-yne, H₂ and the Lindlar catalyst: Pd deliberately made weaker with lead salts and quinoline. | hold the picture | metal surface; π cloud C2–C3 (both faces, 2 e⁻, in-plane lobes, focus) | zoom 1, tilt 0°, focus C2/C3 |
| 2 | `b2-h2` · step | 4–8 (+1 hold) | H₂ sticks to the metal and its H–H bond breaks. Two H atoms now wait on the surface. | H(a) settles on the metal at Pd(a); H(b) settles on the metal at Pd(b)<br>**no curved arrows** (surface: motion trails only)<br>bonds: breaks H(a)–H(b), forms H(a)–Pd(a), forms H(b)–Pd(b) | metal surface (focus) | zoom 1, tilt 0°, focus C2/C3 |
| 3 | `b3-land` · look | 9–12 (+1 hold) | The alkyne lies flat against the metal, one of its two π bonds facing the surface. | alkyne docks (C2 over Pd(a); C3 over Pd(b)) | metal surface; π cloud C2–C3 (bottom face, 2 e⁻, in-plane lobes, focus) | zoom 1, tilt 0°, focus C2/C3 |
| 4 | `b4-first-h` · step | 13–17 (+1 hold) | One H moves from the metal onto C2. C3 holds on to the metal for a moment. | H(a) moves to C2<br>**no curved arrows** (surface: motion trails only)<br>bonds: C2≡C3 → C2=C3, forms C2–H(a), forms C3–Pd(c), breaks H(a)–Pd(a) | metal surface | zoom 1, tilt 0°, focus C2/C3 |
| 5 | `b5-second-h` · step | 18–22 (+1 hold) | The second H moves onto C3 from the same side. Both H came from the metal side: syn. | H(b) moves to C3<br>**no curved arrows** (surface: motion trails only)<br>bonds: forms C3–H(b), breaks C3–Pd(c), breaks H(b)–Pd(b) | metal surface | zoom 1, tilt 0°, focus C2/C3 |
| 6 | `b6-cis` · look | 23–26 (+1 hold) | Both H sit on one side of the new C=C, so both CH₃ sit on the other: the cis, or (Z), alkene. | alkyne drifts aside<br>badges: CH₃(a) “same side”, CH₃(b) “same side”<br>relayout to the product drawing | metal surface (ghost) | zoom 1, tilt 0°, focus C2/C3 |
| 7 | `b7-stop` · look | 27–31 (+0 hold) | The weakened metal lets the alkene go before it can take more H₂. Plain Pd/C would go on to butane. | ghost: Pd/C, 2 H₂: butane | — | zoom 1, tilt 0° |

Beat notes for the implementer:

- `b1-meet`: This scene stays at tilt 0: the drawing plane contains the surface normal (surface drawn as a bar below the molecule).
- `b4-first-h`: As C2 takes the H, bend CH₃(a) up to 120°: C2 is now sp².
- `b5-second-h`: Bend CH₃(b) up to 120° as C3 takes the H: both CH₃ now point away from the surface.

## Chemistry checks

- Reactant: `CC#CC` (but-2-yne). Reagent: H₂, Lindlar catalyst (`[H][H]`).
- Intermediate: `CC([H])=C(C)[Pd]`, surface-bound vinyl (schematic).
- Product: `C/C=C\C`, (Z)-but-2-ene (cis). RDKit: alkene geometry Z.
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.

## Stereo callout

**Syn on a line makes cis**

Both H come from the surface side, so they end on the same side of the new C=C and the two CH₃ groups are pushed to the other side together: (Z)-but-2-ene. For the trans (E) alkene the course uses no reagent here (Na/NH₃ is not on the hub).

## What-if links

[04-alkene-h2-pd](04-alkene-h2-pd.md), [11-alkyne-acetylide](11-alkyne-acetylide.md), [08-alkyne-hx](08-alkyne-hx.md)

## End quiz

**But-2-yne is treated with H₂ and the Lindlar catalyst. What forms?**

A. (Z)-But-2-ene. **(correct)**  
   Why: Yes. Both H add from the metal side (syn), so the CH₃ groups end on the same side: cis.
B. (E)-But-2-ene.   
   Diagnosis: trans needs H on opposite sides. Both H come from the one metal surface, so the addition is syn and the alkene is cis.
C. Butane.   
   Diagnosis: That is H₂ (2 equiv.) on Pd/C. The Lindlar catalyst is weakened so it stops at the alkene.

## Notes

- Same surface picture as scene 04, but the molecule is linear, so the face is drawn in-plane (surface plane "y").

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "10-alkyne-lindlar",
 "title": "H₂ with the Lindlar catalyst: but-2-yne to the cis alkene",
 "reagentCard": "alkyne-lindlar",
 "alsoCards": ["alkyne-h2-pd"],
 "lesson": {
  "id": "12",
  "step": "s11"
 },
 "intent": "After this scene the learner can say: \"On the metal surface both H atoms move onto the alkyne from the same side (syn), so both CH₃ groups end on the other side: the cis (Z) alkene. The Lindlar catalyst is deliberately weakened, so it lets the alkene go before a second H₂ can add; Pd/C would go on to the alkane.\"",
 "reactant": {
  "smiles": "CC#CC",
  "name": "but-2-yne"
 },
 "reagent": {
  "smiles": "[H][H]",
  "label": "H₂, Lindlar catalyst"
 },
 "products": [{"smiles": "C/C=C\\C", "name": "(Z)-but-2-ene (cis)", "stereo": "Z"}],
 "intermediates": [{"name": "surface-bound vinyl (schematic)", "smiles": "CC([H])=C(C)[Pd]"}],
 "atomNames": {
  "1": "CH₃(a)",
  "2": "C2",
  "3": "C3",
  "4": "CH₃(b)",
  "5": "H(a)",
  "6": "H(b)",
  "20": "Pd(a)",
  "21": "Pd(b)",
  "22": "Pd(c)"
 },
 "stage": {
  "species": [
   {
    "key": "alkyne",
    "role": "reactant",
    "smiles": "[CH3:1][C:2]#[C:3][CH3:4]",
    "label": "but-2-yne",
    "at": [1.0, -1.6],
    "style": "full",
    "notes": "All four carbons on one straight line."
   },
   {
    "key": "H2",
    "role": "reagent",
    "smiles": "[H:5][H:6]",
    "label": "H₂",
    "at": [5.4, -1.2],
    "style": "full"
   },
   {
    "key": "Pd",
    "role": "catalyst",
    "smiles": "[Pd:20].[Pd:21].[Pd:22]",
    "label": "Lindlar Pd surface",
    "at": "surface",
    "style": "surface"
   }
  ],
  "surface": {
   "kind": "Lindlar",
   "plane": "y",
   "y": 1.6,
   "label": "Lindlar catalyst (Pd, lead-poisoned)"
  },
  "state": "[CH3:1][C:2]#[C:3][CH3:4].[H:5][H:6].[Pd:20].[Pd:21].[Pd:22]"
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
   "caption": "But-2-yne, H₂ and the Lindlar catalyst: Pd deliberately made weaker with lead salts and quinoline.",
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
     "atoms": [2, 3],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "plane": "y"
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [2, 3],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:1][C:2]#[C:3][CH3:4].[H:5][H:6].[Pd:20].[Pd:21].[Pd:22]",
   "notes": "This scene stays at tilt 0: the drawing plane contains the surface normal (surface drawn as a bar below the molecule)."
  },
  {
   "id": "b2-h2",
   "t0": 4.0,
   "t1": 8.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "H₂ sticks to the metal and its H–H bond breaks. Two H atoms now wait on the surface.",
   "moves": [
    {
     "atoms": [5],
     "anchor": 5,
     "near": 20,
     "offset": [0, -0.5, 0],
     "at": [0, 0.8],
     "trail": true
    },
    {
     "atoms": [6],
     "anchor": 6,
     "near": 21,
     "offset": [0, -0.5, 0],
     "at": [0, 0.8],
     "trail": true
    }
   ],
   "arrows": [],
   "bonds": [
    {
     "a": 5,
     "b": 6,
     "action": "break",
     "order": 0
    },
    {
     "a": 5,
     "b": 20,
     "action": "form",
     "order": 1
    },
    {
     "a": 6,
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
    "focus": [2, 3],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:1][C:2]#[C:3][CH3:4].[H:5][Pd:20].[H:6][Pd:21].[Pd:22]"
  },
  {
   "id": "b3-land",
   "t0": 9.0,
   "t1": 12.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "The alkyne lies flat against the metal, one of its two π bonds facing the surface.",
   "moves": [{"species": "alkyne", "pairs": [[2, 20], [3, 21]], "gap": [0, -1.1, 0], "at": [0, 0.8]}],
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
     "atoms": [2, 3],
     "side": "bottom",
     "emphasis": "focus",
     "electrons": 2,
     "plane": "y"
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [2, 3],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:1][C:2]#[C:3][CH3:4].[H:5][Pd:20].[H:6][Pd:21].[Pd:22]"
  },
  {
   "id": "b4-first-h",
   "t0": 13.0,
   "t1": 17.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "One H moves from the metal onto C2. C3 holds on to the metal for a moment.",
   "moves": [{"atoms": [5], "anchor": 5, "near": 2, "offset": [0, 1.0, 0], "at": [0.1, 0.8], "trail": true}],
   "arrows": [],
   "bonds": [
    {
     "a": 2,
     "b": 3,
     "action": "order",
     "order": 2
    },
    {
     "a": 2,
     "b": 5,
     "action": "form",
     "order": 1
    },
    {
     "a": 3,
     "b": 22,
     "action": "form",
     "order": 1
    },
    {
     "a": 5,
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
    "focus": [2, 3],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:1][C:2]([H:5])=[C:3]([CH3:4])[Pd:22].[Pd:20].[H:6][Pd:21]",
   "notes": "As C2 takes the H, bend CH₃(a) up to 120°: C2 is now sp²."
  },
  {
   "id": "b5-second-h",
   "t0": 18.0,
   "t1": 22.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "The second H moves onto C3 from the same side. Both H came from the metal side: syn.",
   "moves": [{"atoms": [6], "anchor": 6, "near": 3, "offset": [0, 1.0, 0], "at": [0.1, 0.8], "trail": true}],
   "arrows": [],
   "bonds": [
    {
     "a": 3,
     "b": 6,
     "action": "form",
     "order": 1
    },
    {
     "a": 3,
     "b": 22,
     "action": "break",
     "order": 0
    },
    {
     "a": 6,
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
    "focus": [2, 3],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:1][C:2]([H:5])=[C:3]([CH3:4])[H:6].[Pd:20].[Pd:21].[Pd:22]",
   "notes": "Bend CH₃(b) up to 120° as C3 takes the H: both CH₃ now point away from the surface."
  },
  {
   "id": "b6-cis",
   "t0": 23.0,
   "t1": 26.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Both H sit on one side of the new C=C, so both CH₃ sit on the other: the cis, or (Z), alkene.",
   "moves": [{"species": "alkyne", "by": [0, -1.0, 0], "at": [0, 0.6]}],
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "surface", "atoms": [20, 21, 22], "side": "bottom", "emphasis": "ghost"}],
   "badges": [
    {
     "atom": 1,
     "text": "same side",
     "tone": "muted"
    },
    {
     "atom": 4,
     "text": "same side",
     "tone": "muted"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [2, 3],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:1][C:2]([H:5])=[C:3]([CH3:4])[H:6].[Pd:20].[Pd:21].[Pd:22]",
   "relayout": {
    "anchor": [2, 3]
   }
  },
  {
   "id": "b7-stop",
   "t0": 27.0,
   "t1": 31.0,
   "hold": 0,
   "kind": "look",
   "caption": "The weakened metal lets the alkene go before it can take more H₂. Plain Pd/C would go on to butane.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [{"smiles": "CCCC", "label": "Pd/C, 2 H₂: butane", "at": "right"}],
   "camera": {
    "zoom": 1,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:1][C:2]([H:5])=[C:3]([CH3:4])[H:6].[Pd:20].[Pd:21].[Pd:22]"
  }
 ],
 "stereoCallout": {
  "title": "Syn on a line makes cis",
  "stereoMoment": null,
  "text": "Both H come from the surface side, so they end on the same side of the new C=C and the two CH₃ groups are pushed to the other side together: (Z)-but-2-ene. For the trans (E) alkene the course uses no reagent here (Na/NH₃ is not on the hub)."
 },
 "whatIf": ["04-alkene-h2-pd", "11-alkyne-acetylide", "08-alkyne-hx"],
 "quiz": {
  "q": "But-2-yne is treated with H₂ and the Lindlar catalyst. What forms?",
  "options": [
   {
    "text": "(Z)-But-2-ene.",
    "correct": true,
    "why": "Yes. Both H add from the metal side (syn), so the CH₃ groups end on the same side: cis."
   },
   {
    "text": "(E)-But-2-ene.",
    "correct": false,
    "why": "trans needs H on opposite sides. Both H come from the one metal surface, so the addition is syn and the alkene is cis."
   },
   {
    "text": "Butane.",
    "correct": false,
    "why": "That is H₂ (2 equiv.) on Pd/C. The Lindlar catalyst is weakened so it stops at the alkene."
   }
  ]
 },
 "notes": ["Same surface picture as scene 04, but the molecule is linear, so the face is drawn in-plane (surface plane \"y\")."]
}
```

</details>
