# 05 · Peroxyacid epoxidation of (E)-but-2-ene

**Scene id** `05-alkene-epoxide` · **Hub card** `alkene-epoxide` · **Taught in** Lesson 10 s09 · **Runtime** 25 s, 6 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "A peroxyacid hands its outer O to the C=C in one step. Both C–O bonds form at once on the same face (syn), so nothing on the carbons moves: a trans alkene gives a trans epoxide (a racemate), a cis alkene gives a cis (meso) epoxide."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `alkene` | reactant | `[CH3:1]/[CH:2]=[CH:3]/[CH3:4]` | (E)-but-2-ene | [0, 0] | full |
| `peracid` | reagent | `[CH3:10][C:5](=[O:6])[O:7][O:8][H:9]` | RCO₃H | [3.6, -0.5] | full |

Layout note for `peracid`: Draw the peroxyacid curled so O6 (C=O) sits near H9 (its internal H-bond), as textbooks do: the "butterfly".

Atom names used in captions and tables: 1 = CH₃(a), 2 = C2, 3 = C3, 4 = CH₃(b), 5 = C(acid), 6 = O(C=O), 7 = O(inner), 8 = O(outer), 9 = H, 10 = R.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | (E)-But-2-ene meets a peroxyacid, RCO₃H. Its O–O bond is weak, and the outer O is short of electrons. | badges: O(outer) “E” | π cloud C2–C3 (both faces, 2 e⁻, focus) | zoom 1, tilt 35°, focus C2/C3/O(outer) |
| 2 | `b2-approach` · look | 4–7 (+1 hold) | The peroxyacid hovers over the top face, with its outer O right above the middle of the C=C. | peracid moves to C2/C3 (above, top face) | π cloud C2–C3 (top face, 2 e⁻, focus); σ* lobe O(outer) (bottom face, behind O(outer), opposite O(inner))<br>*caption swaps to:* “The empty σ* of the weak O–O bond faces the π cloud. Electrons will flow from π into it.” | zoom 1.2, tilt 65°, focus C2/C3/O(outer), faces shown |
| 3 | `b3-transfer` · step | 8–13 (+1 hold) | One step: π bonds to O, the O–O bond breaks, C=O takes the H, and that O bonds the other carbon. | **arrows:** (1) π(C2=C3) → new bond C2–O(outer) · (2) σ(O(outer)–O(inner)) → O(inner)–C(acid) gains a pair · (3) π(C(acid)=O(C=O)) → new bond O(C=O)–H · (4) σ(O(outer)–H) → new bond O(outer)–C3<br>bonds: C2=C3 → C2–C3, forms C2–O(outer), forms C3–O(outer), C(acid)=O(C=O) → C(acid)–O(C=O), C(acid)–O(inner) → C(acid)=O(inner), forms O(C=O)–H, breaks O(inner)–O(outer), breaks O(outer)–H (dashed TS mid-beat) | new-ring highlight C2–C3–O(outer) (focus) | zoom 1.2, tilt 65°, focus C2/C3/O(outer), faces shown |
| 4 | `b4-syn` · look | 14–17 (+1 hold) | Both C–O bonds formed at the same moment on the same face (syn). Nothing else on the carbons moved. | peracid drifts aside | new-ring highlight C2–C3–O(outer) | zoom 1.2, tilt 65°, focus C2/C3/O(outer), faces shown |
| 5 | `b5-trans` · look | 18–21 (+1 hold) | The CH₃ groups were trans on the alkene, so they stay trans on the ring: trans-2,3-dimethyloxirane. | relayout to the product drawing | — | zoom 1.1, tilt 0°, focus C2/C3 |
| 6 | `b6-racemate` · look | 22–25 (+0 hold) | From the bottom face you get the mirror image, just as often. So the trans epoxide forms as a racemate. | ghost: O from the bottom face | — | zoom 1.1, tilt 0° |

## Chemistry checks

- Reactant: `C/C=C/C` ((E)-but-2-ene). Reagent: RCO₃H (here R = CH₃; mCPBA works the same way) (`CC(=O)OO`).
- Product: `C[C@H]1O[C@@H]1C`, trans-2,3-dimethyloxirane. RDKit: chiral, CIP R, R drawn; forms as a racemate (the mirror image equally). Racemate; this SMILES is one mirror image (hub card).
- Product: `CC(=O)O`, acetic acid (RCO₂H, the spent peroxyacid). RDKit: no stereocentre.
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.

## Stereo callout

**Syn, so geometry is kept** (3D: stereo moment `epoxide-same-face` in learn/engine/stereo-moments.js)

One O is delivered to one face in one step, so the groups keep their places. (E)-but-2-ene → trans-2,3-dimethyloxirane, a racemate (top and bottom face give the mirror images). (Z)-but-2-ene → cis-2,3-dimethyloxirane, a meso compound (the 3D model in the stereo moment).

## What-if links

[06-alkene-kmno4-cold](06-alkene-kmno4-cold.md), [03-alkene-x2](03-alkene-x2.md), [04-alkene-h2-pd](04-alkene-h2-pd.md)

## End quiz

**(Z)-But-2-ene reacts with mCPBA. What forms?**

A. cis-2,3-Dimethyloxirane, a single meso compound. **(correct)**  
   Why: Yes. The O adds to one face in one step, so cis groups stay cis, and the cis epoxide has a mirror plane.
B. trans-2,3-Dimethyloxirane.   
   Diagnosis: Nothing can rotate in a one-step transfer, so the cis CH₃ groups stay cis.
C. A racemic pair of cis epoxides.   
   Diagnosis: The cis epoxide is meso (mirror plane): top and bottom face give the same molecule, not two.

## Notes

- R = CH₃ (peroxyacetic acid) keeps the stage small; caption the reagent as RCO₃H. mCPBA is the same reaction.
- The four-arrow "butterfly" is beyond the hub card (which only says "gives one O"); keep the caption at the level above and let the why lines carry the detail.

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "05-alkene-epoxide",
 "title": "Peroxyacid epoxidation of (E)-but-2-ene",
 "reagentCard": "alkene-epoxide",
 "alsoCards": [],
 "lesson": {
  "id": "10",
  "step": "s09"
 },
 "intent": "After this scene the learner can say: \"A peroxyacid hands its outer O to the C=C in one step. Both C–O bonds form at once on the same face (syn), so nothing on the carbons moves: a trans alkene gives a trans epoxide (a racemate), a cis alkene gives a cis (meso) epoxide.\"",
 "reactant": {
  "smiles": "C/C=C/C",
  "name": "(E)-but-2-ene"
 },
 "reagent": {
  "smiles": "CC(=O)OO",
  "label": "RCO₃H (here R = CH₃; mCPBA works the same way)"
 },
 "products": [
  {
   "smiles": "C[C@H]1O[C@@H]1C",
   "name": "trans-2,3-dimethyloxirane",
   "stereo": "racemate",
   "note": "Racemate; this SMILES is one mirror image (hub card)."
  },
  {
   "smiles": "CC(=O)O",
   "name": "acetic acid (RCO₂H, the spent peroxyacid)",
   "stereo": "achiral"
  }
 ],
 "intermediates": [],
 "atomNames": {
  "1": "CH₃(a)",
  "2": "C2",
  "3": "C3",
  "4": "CH₃(b)",
  "5": "C(acid)",
  "6": "O(C=O)",
  "7": "O(inner)",
  "8": "O(outer)",
  "9": "H",
  "10": "R"
 },
 "stage": {
  "species": [
   {
    "key": "alkene",
    "role": "reactant",
    "smiles": "[CH3:1]/[CH:2]=[CH:3]/[CH3:4]",
    "label": "(E)-but-2-ene",
    "at": [0, 0],
    "style": "full"
   },
   {
    "key": "peracid",
    "role": "reagent",
    "smiles": "[CH3:10][C:5](=[O:6])[O:7][O:8][H:9]",
    "label": "RCO₃H",
    "at": [3.6, -0.5],
    "style": "full",
    "notes": "Draw the peroxyacid curled so O6 (C=O) sits near H9 (its internal H-bond), as textbooks do: the \"butterfly\"."
   }
  ],
  "state": "[CH3:1]/[CH:2]=[CH:3]/[CH3:4].[CH3:10][C:5](=[O:6])[O:7][O:8][H:9]"
 },
 "layers": ["arrows", "orbitals"],
 "duration": 25.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0.0,
   "t1": 3.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "(E)-But-2-ene meets a peroxyacid, RCO₃H. Its O–O bond is weak, and the outer O is short of electrons.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "pi", "atoms": [2, 3], "side": "both", "emphasis": "focus", "electrons": 2}],
   "badges": [{"atom": 8, "text": "E", "tone": "elec"}],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [2, 3, 8],
    "tilt": 35
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:1]/[CH:2]=[CH:3]/[CH3:4].[CH3:10][C:5](=[O:6])[O:7][O:8][H:9]"
  },
  {
   "id": "b2-approach",
   "t0": 4.0,
   "t1": 7.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "The peroxyacid hovers over the top face, with its outer O right above the middle of the C=C.",
   "captionOrbitals": "The empty σ* of the weak O–O bond faces the π cloud. Electrons will flow from π into it.",
   "moves": [{"species": "peracid", "anchor": 8, "near": [2, 3], "offset": [0, 0, 1.3], "at": [0, 0.7]}],
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [2, 3],
     "side": "top",
     "emphasis": "focus",
     "electrons": 2
    },
    {
     "kind": "sigma-star",
     "atoms": [8],
     "side": "bottom",
     "emphasis": "normal",
     "axis": [8, 7]
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [2, 3, 8],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:1]/[CH:2]=[CH:3]/[CH3:4].[CH3:10][C:5](=[O:6])[O:7][O:8][H:9]"
  },
  {
   "id": "b3-transfer",
   "t0": 8.0,
   "t1": 13.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "One step: π bonds to O, the O–O bond breaks, C=O takes the H, and that O bonds the other carbon.",
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [2, 3]
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
     "at": [0.05, 0.6],
     "why": "The π pair attacks the outer O and forms the first C–O bond."
    },
    {
     "id": "a2",
     "from": {
      "bond": [8, 7]
     },
     "to": {
      "bond": [7, 5]
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
     "at": [0.15, 0.7],
     "why": "The weak O–O bond breaks; its pair becomes a new C=O π bond in the acid part."
    },
    {
     "id": "a3",
     "from": {
      "bond": [5, 6]
     },
     "to": {
      "bond": [6, 9]
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
     "at": [0.25, 0.8],
     "why": "The old C=O π pair swings to the H and makes an O–H bond."
    },
    {
     "id": "a4",
     "from": {
      "bond": [8, 9]
     },
     "to": {
      "bond": [8, 3]
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
     "at": [0.35, 0.9],
     "why": "The outer O lets go of its H; that pair becomes the second C–O bond, to the other carbon."
    }
   ],
   "bonds": [
    {
     "a": 2,
     "b": 3,
     "action": "order",
     "order": 1
    },
    {
     "a": 2,
     "b": 8,
     "action": "form",
     "order": 1,
     "partial": true
    },
    {
     "a": 3,
     "b": 8,
     "action": "form",
     "order": 1,
     "partial": true
    },
    {
     "a": 5,
     "b": 6,
     "action": "order",
     "order": 1
    },
    {
     "a": 5,
     "b": 7,
     "action": "order",
     "order": 2
    },
    {
     "a": 6,
     "b": 9,
     "action": "form",
     "order": 1,
     "partial": true
    },
    {
     "a": 7,
     "b": 8,
     "action": "break",
     "order": 0,
     "partial": true
    },
    {
     "a": 8,
     "b": 9,
     "action": "break",
     "order": 0,
     "partial": true
    }
   ],
   "charges": [],
   "partials": [],
   "ts": true,
   "orbitals": [{"kind": "ring", "atoms": [2, 3, 8], "side": "top", "emphasis": "focus"}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [2, 3, 8],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:1][CH:2]1[O:8][CH:3]1[CH3:4].[CH3:10][C:5](=[O:7])[O:6][H:9]"
  },
  {
   "id": "b4-syn",
   "t0": 14.0,
   "t1": 17.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Both C–O bonds formed at the same moment on the same face (syn). Nothing else on the carbons moved.",
   "moves": [{"species": "peracid", "by": [2.2, 0, 1.0], "at": [0, 0.6]}],
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "ring", "atoms": [2, 3, 8], "side": "top", "emphasis": "normal"}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [2, 3, 8],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:1][CH:2]1[O:8][CH:3]1[CH3:4].[CH3:10][C:5](=[O:7])[O:6][H:9]"
  },
  {
   "id": "b5-trans",
   "t0": 18.0,
   "t1": 21.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "The CH₃ groups were trans on the alkene, so they stay trans on the ring: trans-2,3-dimethyloxirane.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [2, 3],
    "tilt": 0
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:1][CH:2]1[O:8][CH:3]1[CH3:4].[CH3:10][C:5](=[O:7])[O:6][H:9]",
   "relayout": {
    "anchor": [2, 3]
   }
  },
  {
   "id": "b6-racemate",
   "t0": 22.0,
   "t1": 25.0,
   "hold": 0,
   "kind": "look",
   "caption": "From the bottom face you get the mirror image, just as often. So the trans epoxide forms as a racemate.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [{"mirror": true, "label": "O from the bottom face"}],
   "camera": {
    "zoom": 1.1,
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
   "state": "[CH3:1][CH:2]1[O:8][CH:3]1[CH3:4].[CH3:10][C:5](=[O:7])[O:6][H:9]"
  }
 ],
 "stereoCallout": {
  "title": "Syn, so geometry is kept",
  "stereoMoment": "epoxide-same-face",
  "text": "One O is delivered to one face in one step, so the groups keep their places. (E)-but-2-ene → trans-2,3-dimethyloxirane, a racemate (top and bottom face give the mirror images). (Z)-but-2-ene → cis-2,3-dimethyloxirane, a meso compound (the 3D model in the stereo moment)."
 },
 "whatIf": ["06-alkene-kmno4-cold", "03-alkene-x2", "04-alkene-h2-pd"],
 "quiz": {
  "q": "(Z)-But-2-ene reacts with mCPBA. What forms?",
  "options": [
   {
    "text": "cis-2,3-Dimethyloxirane, a single meso compound.",
    "correct": true,
    "why": "Yes. The O adds to one face in one step, so cis groups stay cis, and the cis epoxide has a mirror plane."
   },
   {
    "text": "trans-2,3-Dimethyloxirane.",
    "correct": false,
    "why": "Nothing can rotate in a one-step transfer, so the cis CH₃ groups stay cis."
   },
   {
    "text": "A racemic pair of cis epoxides.",
    "correct": false,
    "why": "The cis epoxide is meso (mirror plane): top and bottom face give the same molecule, not two."
   }
  ]
 },
 "notes": ["R = CH₃ (peroxyacetic acid) keeps the stage small; caption the reagent as RCO₃H. mCPBA is the same reaction.", "The four-arrow \"butterfly\" is beyond the hub card (which only says \"gives one O\"); keep the caption at the level above and let the why lines carry the detail."]
}
```

</details>
