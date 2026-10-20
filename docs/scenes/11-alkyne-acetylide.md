# 11 · Acetylide: NaNH₂ deprotonates propyne, then SN2 on CH₃Br

**Scene id** `11-alkyne-acetylide` · **Hub card** `alkyne-acetylide` · **Taught in** Lesson 12 s15 · **Runtime** 35 s, 8 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "A terminal alkyne C–H has pKa 25. NH₃ has pKa 36, so NH₂⁻ is strong enough to pull that H off (equilibrium favours the weaker acid); HO⁻ is not. The acetylide carbon now has a lone pair and attacks CH₃Br from the back side in one step, pushing Br⁻ out: a new C–C bond and a longer chain. Only methyl or primary halides work."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `alkyne` | reactant | `[CH3:3][C:2]#[C:1][H:4]` | propyne | [0, 0] | full |
| `amide` | reagent | `[NH2-:5]` | NH₂⁻ (Na⁺ not drawn) | [4.6, 0] | full |

Layout note for `alkyne`: C3–C2≡C1–H straight.

Atom names used in captions and tables: 1 = C1, 2 = C2, 3 = C3, 4 = H, 5 = N, 6 = C(H₃Br), 7 = Br.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | Propyne and NaNH₂. The H on the end carbon of a triple bond is weakly acidic: pKa about 25. | badges: H “pKa 25” | — | zoom 1, tilt 0°, focus C1/H/N |
| 2 | `b2-pka` · look | 4–8 (+1 hold) | NH₃ (pKa 36) is a weaker acid than propyne (25). Equilibrium favours the weaker acid, so NH₂⁻ wins. | badges: H “pKa 25”, N “NH₃: pKa 36”<br>ghost: HO⁻ fails: H₂O is pKa 15.7 | — | zoom 1, tilt 0°, focus C1/H/N |
| 3 | `b3-deprot` · step | 9–13 (+1 hold) | A lone pair on N takes the H⁺. The C–H pair stays on C1 as a lone pair: the acetylide anion. | N moves to H; H, N drifts aside<br>**arrows:** (1) lone pair on N → H (new N–H bond) · (2) σ(C1–H) → onto C1<br>bonds: breaks C1–H, forms H–N<br>charges: C1 −, N 0 | — | zoom 1, tilt 0°, focus C1/H/N |
| 4 | `b4-anion` · look | 14–17 (+1 hold) | The acetylide carbon has a lone pair and a − charge. It is a strong nucleophile as well as a base. | hold the picture | lone-pair lobe C1 (both faces, 2 e⁻, pointing away from C2, focus)<br>*caption swaps to:* “The pair sits in an sp orbital (50% s), held close to C. That is why this C–H was acidic.” | zoom 1.3, tilt 0°, focus C1 |
| 5 | `b5-mebr` · look | 18–21 (+1 hold) | CH₃Br arrives. Its C is δ+, and the side of that C facing away from Br is open: the back side. | adds CH₃Br<br>fades out H, N<br>δ: C(H₃Br) δ+, Br δ− | lone-pair lobe C1 (both faces, 2 e⁻, pointing away from C2); σ* lobe C(H₃Br) (both faces, behind C(H₃Br), opposite Br, focus) | zoom 1, tilt 0°, focus C1/C(H₃Br) |
| 6 | `b6-sn2` · step | 22–27 (+1 hold) | One step: the acetylide pair bonds to C from the back as the C–Br pair leaves with Br. CH₃ flips inside out. | MeBr to the back side of C(H₃Br); Br drifts aside<br>**arrows:** (1) lone pair on C1 → C(H₃Br) (new C1–C(H₃Br) bond) · (2) σ(C(H₃Br)–Br) → onto Br<br>bonds: forms C1–C(H₃Br), breaks C(H₃Br)–Br (dashed TS mid-beat)<br>charges: C1 0, Br − | σ* lobe C(H₃Br) (both faces, behind C(H₃Br), opposite Br, focus) | zoom 1, tilt 0°, focus C1/C(H₃Br) |
| 7 | `b7-product` · look | 28–31 (+1 hold) | But-2-yne. A new C–C bond formed, so the chain grew from three carbons to four. | relayout to the product drawing | — | zoom 1, tilt 0° |
| 8 | `b8-limits` · look | 32–35 (+0 hold) | This works only on methyl or primary halides. On a crowded carbon the back side is blocked. | ghost: 3° halide: back side blocked | — | zoom 1, tilt 0° |

Beat notes for the implementer:

- `b2-pka`: Show a small pKa ruler (15.7 water, 25 alkyne, 36 NH₃) along the bottom edge; highlight 25 → 36 as "downhill".
- `b6-sn2`: Umbrella flip: the three H of atom 6 swing from pointing at the acetylide to pointing away (Walden inversion), timed to the dots. No stereo consequence on CH₃.

## Chemistry checks

- Reactant: `CC#C` (propyne). Reagent: 1) NaNH₂  2) CH₃Br (`[NH2-]`).
- Intermediate: `CC#[C-]`, propynide (acetylide) anion.
- Product: `CC#CC`, but-2-yne. RDKit: no stereocentre.
- Product: `N`, NH₃ (from step 1). RDKit: no stereocentre.
- Product: `[Br-]`, Br⁻ (with Na⁺). RDKit: no stereocentre.
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.

## Stereo callout

**Back side, inversion**

SN2 is one step with attack opposite the leaving group, so the carbon is inverted (umbrella flip). On CH₃Br this has no visible result; on a chiral 2° carbon it would invert R/S, but acetylides do not use 2° halides (crowded back side). Chapter 7 studies SN2 itself.

## What-if links

[10-alkyne-lindlar](10-alkyne-lindlar.md), [08-alkyne-hx](08-alkyne-hx.md)

## End quiz

**Why is NaNH₂, not NaOH, used to make the acetylide from propyne?**

A. NH₃ (pKa 36) is a weaker acid than the alkyne (25), so NH₂⁻ can take the H; H₂O (15.7) is stronger, so HO⁻ cannot. **(correct)**  
   Why: Yes. An acid–base equilibrium lies on the side of the weaker acid.
B. NaOH would add OH across the triple bond.   
   Diagnosis: HO⁻ does not add to the alkyne here. The only issue is acid strength: HO⁻ is too weak a base.
C. NH₂⁻ is smaller, so it reaches the H more easily.   
   Diagnosis: Size is not it. Compare pKa values: the base works only if its conjugate acid is weaker than the alkyne.

## Notes

- Lesson 12 s15 uses acetylene + CH₃Br (draws SN2 as "just the electron flow"); the hub example is propyne + CH₃CH₂Br → pent-2-yne. The scene uses the hub substrate with the brief's CH₃Br (→ but-2-yne, which feeds scene 10).
- σ* is one step beyond the course; it lives only in the ORBITALS layer.

**Card vs storyboard:** Hub example is propyne + NaNH₂, then CH₃CH₂Br → pent-2-yne; scene uses CH₃Br (brief) → but-2-yne.

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "11-alkyne-acetylide",
 "title": "Acetylide: NaNH₂ deprotonates propyne, then SN2 on CH₃Br",
 "reagentCard": "alkyne-acetylide",
 "alsoCards": [],
 "lesson": {
  "id": "12",
  "step": "s15"
 },
 "intent": "After this scene the learner can say: \"A terminal alkyne C–H has pKa 25. NH₃ has pKa 36, so NH₂⁻ is strong enough to pull that H off (equilibrium favours the weaker acid); HO⁻ is not. The acetylide carbon now has a lone pair and attacks CH₃Br from the back side in one step, pushing Br⁻ out: a new C–C bond and a longer chain. Only methyl or primary halides work.\"",
 "reactant": {
  "smiles": "CC#C",
  "name": "propyne"
 },
 "reagent": {
  "smiles": "[NH2-]",
  "label": "1) NaNH₂  2) CH₃Br"
 },
 "products": [
  {
   "smiles": "CC#CC",
   "name": "but-2-yne",
   "stereo": "achiral"
  },
  {
   "smiles": "N",
   "name": "NH₃ (from step 1)",
   "stereo": "achiral",
   "inFinal": false
  },
  {
   "smiles": "[Br-]",
   "name": "Br⁻ (with Na⁺)",
   "stereo": "achiral"
  }
 ],
 "intermediates": [{"name": "propynide (acetylide) anion", "smiles": "CC#[C-]"}],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "3": "C3",
  "4": "H",
  "5": "N",
  "6": "C(H₃Br)",
  "7": "Br"
 },
 "stage": {
  "species": [
   {
    "key": "alkyne",
    "role": "reactant",
    "smiles": "[CH3:3][C:2]#[C:1][H:4]",
    "label": "propyne",
    "at": [0, 0],
    "style": "full",
    "notes": "C3–C2≡C1–H straight."
   },
   {
    "key": "amide",
    "role": "reagent",
    "smiles": "[NH2-:5]",
    "label": "NH₂⁻ (Na⁺ not drawn)",
    "at": [4.6, 0],
    "style": "full"
   }
  ],
  "state": "[CH3:3][C:2]#[C:1][H:4].[NH2-:5]"
 },
 "layers": ["arrows", "orbitals"],
 "duration": 35.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0.0,
   "t1": 3.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Propyne and NaNH₂. The H on the end carbon of a triple bond is weakly acidic: pKa about 25.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [{"atom": 4, "text": "pKa 25", "tone": "elec"}],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 4, 5],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:3][C:2]#[C:1][H:4].[NH2-:5]"
  },
  {
   "id": "b2-pka",
   "t0": 4.0,
   "t1": 8.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "NH₃ (pKa 36) is a weaker acid than propyne (25). Equilibrium favours the weaker acid, so NH₂⁻ wins.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [{"atom": 4, "text": "pKa 25", "tone": "elec"}, {"atom": 5, "text": "NH₃: pKa 36", "tone": "nuc"}],
   "ghosts": [{"smiles": "O", "label": "HO⁻ fails: H₂O is pKa 15.7", "at": "right"}],
   "camera": {
    "zoom": 1,
    "focus": [1, 4, 5],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:3][C:2]#[C:1][H:4].[NH2-:5]",
   "notes": "Show a small pKa ruler (15.7 water, 25 alkyne, 36 NH₃) along the bottom edge; highlight 25 → 36 as \"downhill\"."
  },
  {
   "id": "b3-deprot",
   "t0": 9.0,
   "t1": 13.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "A lone pair on N takes the H⁺. The C–H pair stays on C1 as a lone pair: the acetylide anion.",
   "moves": [
    {
     "atoms": [5],
     "anchor": 5,
     "near": 4,
     "offset": [1.1, 0, 0],
     "at": [0, 0.35]
    },
    {
     "atoms": [4, 5],
     "by": [1.0, 0.3, 0],
     "at": [0.8, 1]
    }
   ],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 5
     },
     "to": {
      "atom": 4
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
     "why": "A lone pair on the amide N (a strong base) takes the terminal H as H⁺ and forms a new N–H bond."
    },
    {
     "id": "a2",
     "from": {
      "bond": [1, 4]
     },
     "to": {
      "atom": 1
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
     "why": "The C–H bond pair stays on carbon as a lone pair. The carbon is now C⁻: the acetylide anion."
    }
   ],
   "bonds": [{"a": 1, "b": 4, "action": "break", "order": 0}, {"a": 4, "b": 5, "action": "form", "order": 1}],
   "charges": [{"atom": 1, "charge": -1}, {"atom": 5, "charge": 0}],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 4, 5],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:3][C:2]#[C-:1].[H:4][NH2:5]"
  },
  {
   "id": "b4-anion",
   "t0": 14.0,
   "t1": 17.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "The acetylide carbon has a lone pair and a − charge. It is a strong nucleophile as well as a base.",
   "captionOrbitals": "The pair sits in an sp orbital (50% s), held close to C. That is why this C–H was acidic.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "lone-pair",
     "atoms": [1],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "away": 2,
     "label": "sp lone pair"
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.3,
    "focus": [1],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:3][C:2]#[C-:1].[H:4][NH2:5]"
  },
  {
   "id": "b5-mebr",
   "t0": 18.0,
   "t1": 21.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "CH₃Br arrives. Its C is δ+, and the side of that C facing away from Br is open: the back side.",
   "adds": [
    {
     "key": "MeBr",
     "role": "reagent",
     "smiles": "[CH3:6][Br:7]",
     "label": "CH₃Br",
     "at": [4.4, 0],
     "style": "full"
    }
   ],
   "drops": [4, 5],
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [{"atom": 6, "sign": "+"}, {"atom": 7, "sign": "-"}],
   "orbitals": [
    {
     "kind": "lone-pair",
     "atoms": [1],
     "side": "both",
     "emphasis": "normal",
     "electrons": 2,
     "away": 2
    },
    {
     "kind": "sigma-star",
     "atoms": [6],
     "side": "both",
     "emphasis": "focus",
     "axis": [6, 7],
     "label": "σ* (back side)"
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 6],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:3][C:2]#[C-:1].[CH3:6][Br:7]"
  },
  {
   "id": "b6-sn2",
   "t0": 22.0,
   "t1": 27.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "One step: the acetylide pair bonds to C from the back as the C–Br pair leaves with Br. CH₃ flips inside out.",
   "moves": [
    {
     "species": "MeBr",
     "backside": {
      "of": 6,
      "leaving": 7,
      "attacker": 1,
      "dist": 1.5
     },
     "at": [0, 0.3]
    },
    {
     "atoms": [7],
     "by": [1.2, 0, 0],
     "at": [0.75, 1]
    }
   ],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 1
     },
     "to": {
      "atom": 6
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
     "at": [0.25, 0.8],
     "why": "The acetylide lone pair attacks the δ+ carbon from the back and forms a new C–C bond. The chain gets longer."
    },
    {
     "id": "a2",
     "from": {
      "bond": [6, 7]
     },
     "to": {
      "atom": 7
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
     "at": [0.35, 0.95],
     "why": "The C–Br pair leaves with Br, which becomes Br⁻. That keeps the carbon at four bonds."
    }
   ],
   "bonds": [
    {
     "a": 1,
     "b": 6,
     "action": "form",
     "order": 1,
     "partial": true
    },
    {
     "a": 6,
     "b": 7,
     "action": "break",
     "order": 0,
     "partial": true
    }
   ],
   "charges": [{"atom": 1, "charge": 0}, {"atom": 7, "charge": -1}],
   "partials": [],
   "ts": true,
   "orbitals": [{"kind": "sigma-star", "atoms": [6], "side": "both", "emphasis": "focus", "axis": [6, 7]}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 6],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:3][C:2]#[C:1][CH3:6].[Br-:7]",
   "notes": "Umbrella flip: the three H of atom 6 swing from pointing at the acetylide to pointing away (Walden inversion), timed to the dots. No stereo consequence on CH₃."
  },
  {
   "id": "b7-product",
   "t0": 28.0,
   "t1": 31.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "But-2-yne. A new C–C bond formed, so the chain grew from three carbons to four.",
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
   "state": "[CH3:3][C:2]#[C:1][CH3:6].[Br-:7]",
   "relayout": {
    "anchor": [1, 2]
   }
  },
  {
   "id": "b8-limits",
   "t0": 32.0,
   "t1": 35.0,
   "hold": 0,
   "kind": "look",
   "caption": "This works only on methyl or primary halides. On a crowded carbon the back side is blocked.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [{"smiles": "CC(C)(C)Br", "label": "3° halide: back side blocked", "at": "right"}],
   "camera": {
    "zoom": 1,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:3][C:2]#[C:1][CH3:6].[Br-:7]"
  }
 ],
 "stereoCallout": {
  "title": "Back side, inversion",
  "stereoMoment": null,
  "text": "SN2 is one step with attack opposite the leaving group, so the carbon is inverted (umbrella flip). On CH₃Br this has no visible result; on a chiral 2° carbon it would invert R/S, but acetylides do not use 2° halides (crowded back side). Chapter 7 studies SN2 itself."
 },
 "whatIf": ["10-alkyne-lindlar", "08-alkyne-hx"],
 "quiz": {
  "q": "Why is NaNH₂, not NaOH, used to make the acetylide from propyne?",
  "options": [
   {
    "text": "NH₃ (pKa 36) is a weaker acid than the alkyne (25), so NH₂⁻ can take the H; H₂O (15.7) is stronger, so HO⁻ cannot.",
    "correct": true,
    "why": "Yes. An acid–base equilibrium lies on the side of the weaker acid."
   },
   {
    "text": "NaOH would add OH across the triple bond.",
    "correct": false,
    "why": "HO⁻ does not add to the alkyne here. The only issue is acid strength: HO⁻ is too weak a base."
   },
   {
    "text": "NH₂⁻ is smaller, so it reaches the H more easily.",
    "correct": false,
    "why": "Size is not it. Compare pKa values: the base works only if its conjugate acid is weaker than the alkyne."
   }
  ]
 },
 "notes": ["Lesson 12 s15 uses acetylene + CH₃Br (draws SN2 as \"just the electron flow\"); the hub example is propyne + CH₃CH₂Br → pent-2-yne. The scene uses the hub substrate with the brief's CH₃Br (→ but-2-yne, which feeds scene 10).", "σ* is one step beyond the course; it lives only in the ORBITALS layer."]
}
```

</details>
