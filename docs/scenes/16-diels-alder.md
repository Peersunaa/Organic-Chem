# 16 · Diels–Alder: penta-1,3-diene + acrolein

**Scene id** `16-diels-alder` · **Hub card** `diels-alder` · **Taught in** no lesson (hub card only) · **Runtime** 36 s, 8 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "The diene must turn s-cis first. Then six π electrons move round one circle in a single step: C1 and C4 of the diene bond to the two dienophile carbons (two new σ bonds) and a new C=C appears between old C2 and C3. Everything happens on one face of the dienophile, so groups cis on it stay cis in the ring. The CH₃ and CHO end on neighbouring carbons (the 1,2 product)."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `diene` | reactant | `[CH3:7]/[CH:1]=[CH:2]/[CH:3]=[CH2:4]` | (E)-penta-1,3-diene, s-trans | [0, -0.6] | skeletal |
| `dienophile` | reagent | `[CH2:6]=[CH:5][CH:8]=[O:9]` | acrolein | [0.4, 2.4] | skeletal |

Atom names used in captions and tables: 1 = C1, 2 = C2, 3 = C3, 4 = C4, 5 = a (C–CHO), 6 = b (CH₂), 7 = CH₃, 8 = C(HO), 9 = O.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | Penta-1,3-diene and acrolein, heated. The diene C=C–C=C is rich in electrons; the C=C next to C=O is poor. | badges: C4 “rich”, b (CH₂) “poor” | π cloud C1–C2–C3–C4 (both faces, 4 e⁻, focus); π cloud a (C–CHO)–b (CH₂) (both faces, 2 e⁻, focus) | zoom 1, tilt 0° |
| 2 | `b2-scis` · look | 4–8 (+1 hold) | First the diene twists about its middle C2–C3 bond into the s-cis shape: C1 and C4 now face the same way. | rotate C4 about C2–C3 by 180° | π cloud C1–C2–C3–C4 (both faces, 4 e⁻) | zoom 1, tilt 0° |
| 3 | `b3-line-up` · look | 9–13 (+1 hold) | The dienophile slides under the diene. Rich C4 lines up with the poor CH₂ end, C1 with the CHO end. | dienophile docks (b (CH₂) over C4; a (C–CHO) over C1)<br>badges: C4 “rich”, b (CH₂) “poor” | π cloud C1–C2–C3–C4 (bottom face, 4 e⁻, focus); π cloud a (C–CHO)–b (CH₂) (top face, 2 e⁻, focus) | zoom 1.1, tilt 50°, faces shown |
| 4 | `b4-cycle` · step | 14–19 (+1 hold) | Six electrons move around one circle, all at once. No ions and no intermediate: one concerted step. | **arrows:** (1) π(C3=C4) → new bond C4–b (CH₂) · (2) π(a (C–CHO)=b (CH₂)) → new bond a (C–CHO)–C1 · (3) π(C1=C2) → C2–C3 gains a pair<br>bonds: C1=C2 → C1–C2, forms C1–a (C–CHO), C2–C3 → C2=C3, C3=C4 → C3–C4, forms C4–b (CH₂), a (C–CHO)=b (CH₂) → a (C–CHO)–b (CH₂) (dashed TS mid-beat) | new-ring highlight C1–C2–C3–C4–b (CH₂)–a (C–CHO) (focus) | zoom 1.1, tilt 50°, faces shown |
| 5 | `b5-sigma` · look | 20–23 (+1 hold) | Two new C–C σ bonds: C1 to the CHO carbon, C4 to the CH₂. A six-membered ring has closed. | badges: a (C–CHO) “new σ”, b (CH₂) “new σ” | — | zoom 1.1, tilt 50°, faces shown |
| 6 | `b6-pi` · look | 24–27 (+1 hold) | C1=C2 and C3=C4 are gone. One new C=C sits between C2 and C3. The dienophile C=C is now single. | badges: C2 “new π” | π cloud C2–C3 (both faces, 2 e⁻, focus) | zoom 1.1, tilt 50°, faces shown |
| 7 | `b7-faces` · look | 28–32 (+1 hold) | Both new bonds form on the same face of the dienophile at once. Groups cis on that C=C stay cis in the ring. | ghost: cis dienophile → cis ring (stereo callout) | π cloud a (C–CHO)–b (CH₂) (top face, 2 e⁻, ghost) | zoom 1.1, tilt 50°, faces shown |
| 8 | `b8-product` · look | 33–36 (+0 hold) | 2-Methylcyclohex-3-ene-1-carbaldehyde: CH₃ and CHO on neighbouring ring carbons (the 1,2 product). | relayout to the product drawing | — | zoom 1, tilt 0° |

Beat notes for the implementer:

- `b2-scis`: Rotate C4 and its two H about the C2→C3 axis in 3D (they pass through z ≠ 0 mid-way), then project. Label "s-trans" fades to "s-cis".
- `b3-line-up`: Hub card reason: CH₃ on C1 pushes density to the C4 end; C=O pulls density off the CH₂ end (b).
- `b4-cycle`: All three arrows start and finish together (one circle). Electron dots circulate around the six-membered ring outline.

## Chemistry checks

- Reactant: `C=C/C=C/C` ((E)-penta-1,3-diene). Reagent: acrolein (CH₂=CH–CHO), heat (`C=CC=O`).
- Product: `O=CC1C(C)C=CCC1`, 2-methylcyclohex-3-ene-1-carbaldehyde. RDKit: 2 stereocentres, drawn flat as the hub card does. Drawn flat, as on the hub card: two stereocentres, formed as racemates. Endo/exo is not in the course; do not show it.
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.
- Implementer must verify with RDKit:
  - Inset SMILES COC(=O)[C@@H]1CC=CC[C@@H]1C(=O)OC is the cis (meso) diester: the generator confirmed it (both esters on one ring face in 3D, achiral). Re-check after any edit.

## Stereo callout

**cis stays cis**

Inset: buta-1,3-diene + dimethyl maleate (cis CO₂CH₃ groups) → dimethyl cis-cyclohex-4-ene-1,2-dicarboxylate, COC(=O)[C@@H]1CC=CC[C@@H]1C(=O)OC, a meso compound: both ester groups on one face. With the trans (fumarate) dienophile the esters end trans (a racemate). The main example is drawn flat, as the hub card does.

## What-if links

[04-alkene-h2-pd](04-alkene-h2-pd.md), [05-alkene-epoxide](05-alkene-epoxide.md)

## End quiz

**Buta-1,3-diene reacts with a dienophile whose two CO₂CH₃ groups are cis. How are those groups in the product?**

A. cis: on the same face of the new ring. **(correct)**  
   Why: Yes. Both new bonds form at once on one face of the dienophile, so nothing can rotate: cis stays cis.
B. trans: on opposite faces.   
   Diagnosis: trans would need the dienophile C=C to twist during the reaction. It is one concerted step, so it cannot.
C. On ring carbons 1 and 4 (para to each other).   
   Diagnosis: The two dienophile carbons become neighbouring ring carbons, so their groups stay on adjacent carbons.

## Notes

- No lesson teaches this card (lesson: null). Regiochemistry reason taken from the hub card's own draw steps (electron-rich C4 bonds to electron-poor b).
- Endo rule, frontier orbitals and HOMO/LUMO are not in the course: the ORBITALS layer shows only p-lobe overlap on one face.

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "16-diels-alder",
 "title": "Diels–Alder: penta-1,3-diene + acrolein",
 "reagentCard": "diels-alder",
 "alsoCards": [],
 "lesson": null,
 "intent": "After this scene the learner can say: \"The diene must turn s-cis first. Then six π electrons move round one circle in a single step: C1 and C4 of the diene bond to the two dienophile carbons (two new σ bonds) and a new C=C appears between old C2 and C3. Everything happens on one face of the dienophile, so groups cis on it stay cis in the ring. The CH₃ and CHO end on neighbouring carbons (the 1,2 product).\"",
 "reactant": {
  "smiles": "C=C/C=C/C",
  "name": "(E)-penta-1,3-diene"
 },
 "reagent": {
  "smiles": "C=CC=O",
  "label": "acrolein (CH₂=CH–CHO), heat"
 },
 "products": [
  {
   "smiles": "O=CC1C(C)C=CCC1",
   "name": "2-methylcyclohex-3-ene-1-carbaldehyde",
   "stereo": "flat",
   "note": "Drawn flat, as on the hub card: two stereocentres, formed as racemates. Endo/exo is not in the course; do not show it."
  }
 ],
 "intermediates": [],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "3": "C3",
  "4": "C4",
  "5": "a (C–CHO)",
  "6": "b (CH₂)",
  "7": "CH₃",
  "8": "C(HO)",
  "9": "O"
 },
 "stage": {
  "species": [
   {
    "key": "diene",
    "role": "reactant",
    "smiles": "[CH3:7]/[CH:1]=[CH:2]/[CH:3]=[CH2:4]",
    "label": "(E)-penta-1,3-diene, s-trans",
    "at": [0, -0.6],
    "style": "skeletal"
   },
   {
    "key": "dienophile",
    "role": "reagent",
    "smiles": "[CH2:6]=[CH:5][CH:8]=[O:9]",
    "label": "acrolein",
    "at": [0.4, 2.4],
    "style": "skeletal"
   }
  ],
  "state": "[CH3:7]/[CH:1]=[CH:2]/[CH:3]=[CH2:4].[CH2:6]=[CH:5][CH:8]=[O:9]"
 },
 "layers": ["arrows", "orbitals"],
 "duration": 36.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0.0,
   "t1": 3.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Penta-1,3-diene and acrolein, heated. The diene C=C–C=C is rich in electrons; the C=C next to C=O is poor.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [1, 2, 3, 4],
     "side": "both",
     "emphasis": "focus",
     "electrons": 4,
     "label": "diene π: 4 electrons"
    },
    {
     "kind": "pi",
     "atoms": [5, 6],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2
    }
   ],
   "badges": [{"atom": 4, "text": "rich", "tone": "nuc"}, {"atom": 6, "text": "poor", "tone": "elec"}],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:7]/[CH:1]=[CH:2]/[CH:3]=[CH2:4].[CH2:6]=[CH:5][CH:8]=[O:9]"
  },
  {
   "id": "b2-scis",
   "t0": 4.0,
   "t1": 8.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "First the diene twists about its middle C2–C3 bond into the s-cis shape: C1 and C4 now face the same way.",
   "moves": [{"atoms": [4], "with": "substituents", "rotate": {"axis": [2, 3], "deg": 180}, "at": [0.1, 0.9]}],
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "pi", "atoms": [1, 2, 3, 4], "side": "both", "emphasis": "normal", "electrons": 4}],
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
   "state": "[CH3:7]/[CH:1]=[CH:2]/[CH:3]=[CH2:4].[CH2:6]=[CH:5][CH:8]=[O:9]",
   "notes": "Rotate C4 and its two H about the C2→C3 axis in 3D (they pass through z ≠ 0 mid-way), then project. Label \"s-trans\" fades to \"s-cis\"."
  },
  {
   "id": "b3-line-up",
   "t0": 9.0,
   "t1": 13.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "The dienophile slides under the diene. Rich C4 lines up with the poor CH₂ end, C1 with the CHO end.",
   "moves": [{"species": "dienophile", "pairs": [[6, 4], [5, 1]], "gap": [0, 0, -1.4], "at": [0, 0.8]}],
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [1, 2, 3, 4],
     "side": "bottom",
     "emphasis": "focus",
     "electrons": 4
    },
    {
     "kind": "pi",
     "atoms": [5, 6],
     "side": "top",
     "emphasis": "focus",
     "electrons": 2
    }
   ],
   "badges": [{"atom": 4, "text": "rich", "tone": "nuc"}, {"atom": 6, "text": "poor", "tone": "elec"}],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [],
    "tilt": 50
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "diene above",
     "bottom": "dienophile below"
    }
   },
   "state": "[CH3:7]/[CH:1]=[CH:2]/[CH:3]=[CH2:4].[CH2:6]=[CH:5][CH:8]=[O:9]",
   "notes": "Hub card reason: CH₃ on C1 pushes density to the C4 end; C=O pulls density off the CH₂ end (b)."
  },
  {
   "id": "b4-cycle",
   "t0": 14.0,
   "t1": 19.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Six electrons move around one circle, all at once. No ions and no intermediate: one concerted step.",
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [3, 4]
     },
     "to": {
      "bond": [4, 6]
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
     "at": [0.1, 0.85],
     "why": "The C3=C4 π pair forms the new σ bond from C4 to the CH₂ of the dienophile."
    },
    {
     "id": "a2",
     "from": {
      "bond": [5, 6]
     },
     "to": {
      "bond": [5, 1]
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
     "at": [0.1, 0.85],
     "why": "The dienophile π pair forms the new σ bond from its CHO carbon to C1."
    },
    {
     "id": "a3",
     "from": {
      "bond": [1, 2]
     },
     "to": {
      "bond": [2, 3]
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
     "at": [0.1, 0.85],
     "why": "The C1=C2 π pair moves to C2–C3, making the new C=C of the ring."
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
     "order": 1,
     "partial": true
    },
    {
     "a": 2,
     "b": 3,
     "action": "order",
     "order": 2
    },
    {
     "a": 3,
     "b": 4,
     "action": "order",
     "order": 1
    },
    {
     "a": 4,
     "b": 6,
     "action": "form",
     "order": 1,
     "partial": true
    },
    {
     "a": 5,
     "b": 6,
     "action": "order",
     "order": 1
    }
   ],
   "charges": [],
   "partials": [],
   "ts": true,
   "orbitals": [{"kind": "ring", "atoms": [1, 2, 3, 4, 6, 5], "side": "both", "emphasis": "focus"}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [],
    "tilt": 50
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "diene above",
     "bottom": "dienophile below"
    }
   },
   "state": "[CH3:7][CH:1]1[CH:2]=[CH:3][CH2:4][CH2:6][CH:5]1[CH:8]=[O:9]",
   "notes": "All three arrows start and finish together (one circle). Electron dots circulate around the six-membered ring outline."
  },
  {
   "id": "b5-sigma",
   "t0": 20.0,
   "t1": 23.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Two new C–C σ bonds: C1 to the CHO carbon, C4 to the CH₂. A six-membered ring has closed.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [{"atom": 5, "text": "new σ", "tone": "muted"}, {"atom": 6, "text": "new σ", "tone": "muted"}],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [],
    "tilt": 50
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "diene above",
     "bottom": "dienophile below"
    }
   },
   "state": "[CH3:7][CH:1]1[CH:2]=[CH:3][CH2:4][CH2:6][CH:5]1[CH:8]=[O:9]"
  },
  {
   "id": "b6-pi",
   "t0": 24.0,
   "t1": 27.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "C1=C2 and C3=C4 are gone. One new C=C sits between C2 and C3. The dienophile C=C is now single.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "pi", "atoms": [2, 3], "side": "both", "emphasis": "focus", "electrons": 2}],
   "badges": [{"atom": 2, "text": "new π", "tone": "muted"}],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [],
    "tilt": 50
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "diene above",
     "bottom": "dienophile below"
    }
   },
   "state": "[CH3:7][CH:1]1[CH:2]=[CH:3][CH2:4][CH2:6][CH:5]1[CH:8]=[O:9]"
  },
  {
   "id": "b7-faces",
   "t0": 28.0,
   "t1": 32.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Both new bonds form on the same face of the dienophile at once. Groups cis on that C=C stay cis in the ring.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "pi", "atoms": [5, 6], "side": "top", "emphasis": "ghost", "electrons": 2}],
   "badges": [],
   "ghosts": [
    {
     "smiles": "COC(=O)[C@@H]1CC=CC[C@@H]1C(=O)OC",
     "label": "cis dienophile → cis ring (stereo callout)",
     "at": "right"
    }
   ],
   "camera": {
    "zoom": 1.1,
    "focus": [],
    "tilt": 50
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "diene above",
     "bottom": "dienophile below"
    }
   },
   "state": "[CH3:7][CH:1]1[CH:2]=[CH:3][CH2:4][CH2:6][CH:5]1[CH:8]=[O:9]"
  },
  {
   "id": "b8-product",
   "t0": 33.0,
   "t1": 36.0,
   "hold": 0,
   "kind": "look",
   "caption": "2-Methylcyclohex-3-ene-1-carbaldehyde: CH₃ and CHO on neighbouring ring carbons (the 1,2 product).",
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
     "top": "diene above",
     "bottom": "dienophile below"
    }
   },
   "state": "[CH3:7][CH:1]1[CH:2]=[CH:3][CH2:4][CH2:6][CH:5]1[CH:8]=[O:9]",
   "relayout": {
    "anchor": [1, 5]
   }
  }
 ],
 "stereoCallout": {
  "title": "cis stays cis",
  "stereoMoment": null,
  "text": "Inset: buta-1,3-diene + dimethyl maleate (cis CO₂CH₃ groups) → dimethyl cis-cyclohex-4-ene-1,2-dicarboxylate, COC(=O)[C@@H]1CC=CC[C@@H]1C(=O)OC, a meso compound: both ester groups on one face. With the trans (fumarate) dienophile the esters end trans (a racemate). The main example is drawn flat, as the hub card does."
 },
 "whatIf": ["04-alkene-h2-pd", "05-alkene-epoxide"],
 "quiz": {
  "q": "Buta-1,3-diene reacts with a dienophile whose two CO₂CH₃ groups are cis. How are those groups in the product?",
  "options": [
   {
    "text": "cis: on the same face of the new ring.",
    "correct": true,
    "why": "Yes. Both new bonds form at once on one face of the dienophile, so nothing can rotate: cis stays cis."
   },
   {
    "text": "trans: on opposite faces.",
    "correct": false,
    "why": "trans would need the dienophile C=C to twist during the reaction. It is one concerted step, so it cannot."
   },
   {
    "text": "On ring carbons 1 and 4 (para to each other).",
    "correct": false,
    "why": "The two dienophile carbons become neighbouring ring carbons, so their groups stay on adjacent carbons."
   }
  ]
 },
 "notes": ["No lesson teaches this card (lesson: null). Regiochemistry reason taken from the hub card's own draw steps (electron-rich C4 bonds to electron-poor b).", "Endo rule, frontier orbitals and HOMO/LUMO are not in the course: the ORBITALS layer shows only p-lobe overlap on one face."]
}
```

</details>
