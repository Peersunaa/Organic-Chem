# 06 · Cold basic KMnO₄: syn diol from cyclohexene

**Scene id** `06-alkene-kmno4-cold` · **Hub card** `alkene-kmno4-base` (also `alkene-kmno4-acid`) · **Taught in** Lesson 10 s12 · **Runtime** 30 s, 7 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "Two O atoms of one MnO₄⁻ bond to the two alkene carbons at the same time, from the same face, making a cyclic manganate ester. Water then cuts the O–Mn bonds, not the C–O bonds, so both OH stay on that face: a cis (syn) diol. Acidic KMnO₄ would cut the C=C instead."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `alkene` | reactant | `[CH:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1` | cyclohexene | [0, 0] | skeletal |
| `MnO4` | reagent | `[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]` | MnO₄⁻ (K⁺ not drawn) | [3.8, 0] | full |

Atom names used in captions and tables: 1 = C1, 2 = C2, 7 = O(a), 8 = O(b), 9 = Mn, 10 = O, 11 = O⁻.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | Cyclohexene meets cold, basic KMnO₄. Permanganate is purple, and its Mn(VII) badly wants electrons. | badges: Mn “Mn(VII)” | π cloud C1–C2 (both faces, 2 e⁻, focus) | zoom 1, tilt 35°, focus C1/C2/Mn |
| 2 | `b2-approach` · look | 4–7 (+1 hold) | Two O atoms of MnO₄⁻ line up over the top face of the C=C, one above each carbon. | MnO4 docks (O(a) over C1; O(b) over C2) | π cloud C1–C2 (top face, 2 e⁻, focus) | zoom 1.2, tilt 65°, focus C1/C2/Mn, faces shown |
| 3 | `b3-ring` · step | 8–13 (+1 hold) | In one step each carbon bonds to an O, both on the top face. Mn takes a pair: Mn(VII) becomes Mn(V). | **arrows:** (1) π(C1=C2) → new bond C1–O(a) · (2) π(Mn=O(a)) → onto Mn · (3) π(Mn=O(b)) → new bond O(b)–C2<br>bonds: C1=C2 → C1–C2, forms C1–O(a), forms C2–O(b), O(a)=Mn → O(a)–Mn, O(b)=Mn → O(b)–Mn (dashed TS mid-beat)<br>badges: Mn “Mn(V)” | new-ring highlight C1–O(a)–Mn–O(b)–C2 (focus) | zoom 1.2, tilt 65°, focus C1/C2/Mn, faces shown |
| 4 | `b4-ester` · look | 14–17 (+1 hold) | This five-membered ring is a cyclic manganate ester. Both C–O bonds sit on the top face. | badges: Mn “Mn(V)” | new-ring highlight C1–O(a)–Mn–O(b)–C2 (focus) | zoom 1.2, tilt 65°, focus C1/C2/Mn, faces shown |
| 5 | `b5-hydrolysis` · step | 18–22 (+1 hold) | Water then cuts the two O–Mn bonds. The C–O bonds are never touched, so both O stay on top. | **no curved arrows** (surface: motion trails only)<br>bonds: breaks O(a)–Mn, breaks O(b)–Mn, breaks Mn–O, breaks Mn–O⁻ | — | zoom 1.2, tilt 65°, focus C1/C2/Mn, faces shown |
| 6 | `b6-product` · look | 23–26 (+1 hold) | cis-Cyclohexane-1,2-diol: both OH on one face. The purple colour fades as brown MnO₂ forms. | relayout to the product drawing | — | zoom 1, tilt 0°, focus C1/C2 |
| 7 | `b7-meso` · look | 27–30 (+0 hold) | Attack from the bottom face gives the very same molecule. The cis diol is meso: no mirror-image twin. | hold the picture | — | zoom 1, tilt 0° |

Beat notes for the implementer:

- `b5-hydrolysis`: Summary beat: no arrows (hydrolysis detail is beyond the course). Fade the Mn fragment out (Mn atom 9, O10, O11) while H atoms fade in on O7 and O8. Keep C1–O7 and C2–O8 bright the whole time: they never break.
- `b6-product`: Show a small swatch fading purple → brown in the corner (colour as chemistry, label it "MnO₂").

## Chemistry checks

- Reactant: `C1=CCCCC1` (cyclohexene). Reagent: KMnO₄, OH⁻, H₂O (cold) (`[O-][Mn](=O)(=O)=O`).
- Intermediate: `O=[Mn]1([O-])OC2CCCCC2O1`, cyclic manganate(V) ester (drawn flat).
- Product: `O[C@@H]1CCCC[C@@H]1O`, cis-cyclohexane-1,2-diol. RDKit: meso (CIP R, S, superimposable on its mirror image). Meso (mirror plane).
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.
- Implementer must verify with RDKit:
  - RDKit-JS must parse the manganate ester (hypervalent Mn); if the renderer rejects it, draw b3–b4 from the stored coordinates and skip the SMILES layout for that state.

## Stereo callout

**Syn diol** (3D: stereo moment `syn-diol` in learn/engine/stereo-moments.js)

Both O come from one MnO₄⁻ on one face and the C–O bonds never break, so the OH groups are cis. On cyclohexene that is the meso cis-diol. Open chain: a cis alkene gives a meso diol, a trans alkene a racemic pair. For the TRANS diol use RCO₃H, then H₃O⁺ (anti opening of the epoxide).

## What-if links

[05-alkene-epoxide](05-alkene-epoxide.md), [04-alkene-h2-pd](04-alkene-h2-pd.md), [03-alkene-x2](03-alkene-x2.md)

## End quiz

**You need trans-cyclohexane-1,2-diol from cyclohexene. Is cold basic KMnO₄ the right reagent?**

A. No. KMnO₄/OH⁻ gives the cis diol; use RCO₃H, then H₃O⁺. **(correct)**  
   Why: Yes. Both O of KMnO₄ add to one face; the epoxide route opens anti and gives trans.
B. Yes, the two OH add anti.   
   Diagnosis: Both O come from one MnO₄⁻ on one face, and the C–O bonds are never broken, so the OH groups end up cis.
C. Yes, if the solution is made acidic.   
   Diagnosis: Acidic KMnO₄ cuts the C=C apart (two C=O ends). It gives no diol at all.

## Notes

- Hub id is alkene-kmno4-base; the scene file keeps the brief's name "kmno4-cold".
- Mn oxidation states are badges, not charges: the formal charge stays −1 on O11 throughout.

**Card vs storyboard:** Brief names the scene alkene-kmno4-cold; the hub card id is alkene-kmno4-base (reagentCard uses the hub id).

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "06-alkene-kmno4-cold",
 "title": "Cold basic KMnO₄: syn diol from cyclohexene",
 "reagentCard": "alkene-kmno4-base",
 "alsoCards": ["alkene-kmno4-acid"],
 "lesson": {
  "id": "10",
  "step": "s12"
 },
 "intent": "After this scene the learner can say: \"Two O atoms of one MnO₄⁻ bond to the two alkene carbons at the same time, from the same face, making a cyclic manganate ester. Water then cuts the O–Mn bonds, not the C–O bonds, so both OH stay on that face: a cis (syn) diol. Acidic KMnO₄ would cut the C=C instead.\"",
 "reactant": {
  "smiles": "C1=CCCCC1",
  "name": "cyclohexene"
 },
 "reagent": {
  "smiles": "[O-][Mn](=O)(=O)=O",
  "label": "KMnO₄, OH⁻, H₂O (cold)"
 },
 "products": [
  {
   "smiles": "O[C@@H]1CCCC[C@@H]1O",
   "name": "cis-cyclohexane-1,2-diol",
   "stereo": "meso",
   "note": "Meso (mirror plane)."
  }
 ],
 "intermediates": [{"name": "cyclic manganate(V) ester (drawn flat)", "smiles": "O=[Mn]1([O-])OC2CCCCC2O1"}],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "7": "O(a)",
  "8": "O(b)",
  "9": "Mn",
  "10": "O",
  "11": "O⁻"
 },
 "stage": {
  "species": [
   {
    "key": "alkene",
    "role": "reactant",
    "smiles": "[CH:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1",
    "label": "cyclohexene",
    "at": [0, 0],
    "style": "skeletal"
   },
   {
    "key": "MnO4",
    "role": "reagent",
    "smiles": "[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]",
    "label": "MnO₄⁻ (K⁺ not drawn)",
    "at": [3.8, 0],
    "style": "full"
   }
  ],
  "state": "[CH:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1.[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]"
 },
 "layers": ["arrows", "orbitals"],
 "duration": 30.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0.0,
   "t1": 3.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Cyclohexene meets cold, basic KMnO₄. Permanganate is purple, and its Mn(VII) badly wants electrons.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "pi", "atoms": [1, 2], "side": "both", "emphasis": "focus", "electrons": 2}],
   "badges": [{"atom": 9, "text": "Mn(VII)", "tone": "elec"}],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2, 9],
    "tilt": 35
   },
   "faces": {
    "show": false
   },
   "state": "[CH:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1.[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]"
  },
  {
   "id": "b2-approach",
   "t0": 4.0,
   "t1": 7.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Two O atoms of MnO₄⁻ line up over the top face of the C=C, one above each carbon.",
   "moves": [{"species": "MnO4", "pairs": [[7, 1], [8, 2]], "gap": [0, 0, 1.3], "at": [0, 0.7]}],
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "pi", "atoms": [1, 2], "side": "top", "emphasis": "focus", "electrons": 2}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [1, 2, 9],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1.[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]"
  },
  {
   "id": "b3-ring",
   "t0": 8.0,
   "t1": 13.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "In one step each carbon bonds to an O, both on the top face. Mn takes a pair: Mn(VII) becomes Mn(V).",
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [1, 2]
     },
     "to": {
      "bond": [1, 7]
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
     "at": [0.05, 0.7],
     "why": "The π pair forms a bond from C1 to one oxo O."
    },
    {
     "id": "a2",
     "from": {
      "bond": [9, 7]
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
     "at": [0.15, 0.8],
     "why": "That Mn=O π pair moves onto Mn: Mn gains two electrons (Mn(VII) → Mn(V))."
    },
    {
     "id": "a3",
     "from": {
      "bond": [9, 8]
     },
     "to": {
      "bond": [8, 2]
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
     "at": [0.3, 0.95],
     "why": "A second Mn=O π pair forms the bond from O to C2, on the same face."
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
     "b": 7,
     "action": "form",
     "order": 1,
     "partial": true
    },
    {
     "a": 2,
     "b": 8,
     "action": "form",
     "order": 1,
     "partial": true
    },
    {
     "a": 7,
     "b": 9,
     "action": "order",
     "order": 1
    },
    {
     "a": 8,
     "b": 9,
     "action": "order",
     "order": 1
    }
   ],
   "charges": [],
   "partials": [],
   "ts": true,
   "orbitals": [{"kind": "ring", "atoms": [1, 7, 9, 8, 2], "side": "top", "emphasis": "focus"}],
   "badges": [{"atom": 9, "text": "Mn(V)", "tone": "muted"}],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [1, 2, 9],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[O-:11][Mn:9]1(=[O:10])[O:7][CH:1]2[CH2:6][CH2:5][CH2:4][CH2:3][CH:2]2[O:8]1"
  },
  {
   "id": "b4-ester",
   "t0": 14.0,
   "t1": 17.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "This five-membered ring is a cyclic manganate ester. Both C–O bonds sit on the top face.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "ring", "atoms": [1, 7, 9, 8, 2], "side": "top", "emphasis": "focus"}],
   "badges": [{"atom": 9, "text": "Mn(V)", "tone": "muted"}],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [1, 2, 9],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[O-:11][Mn:9]1(=[O:10])[O:7][CH:1]2[CH2:6][CH2:5][CH2:4][CH2:3][CH:2]2[O:8]1"
  },
  {
   "id": "b5-hydrolysis",
   "t0": 18.0,
   "t1": 22.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Water then cuts the two O–Mn bonds. The C–O bonds are never touched, so both O stay on top.",
   "arrows": [],
   "bonds": [
    {
     "a": 7,
     "b": 9,
     "action": "break",
     "order": 0
    },
    {
     "a": 8,
     "b": 9,
     "action": "break",
     "order": 0
    },
    {
     "a": 9,
     "b": 10,
     "action": "break",
     "order": 0
    },
    {
     "a": 9,
     "b": 11,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [1, 2, 9],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[OH:7][CH:1]1[CH2:6][CH2:5][CH2:4][CH2:3][CH:2]1[OH:8]",
   "notes": "Summary beat: no arrows (hydrolysis detail is beyond the course). Fade the Mn fragment out (Mn atom 9, O10, O11) while H atoms fade in on O7 and O8. Keep C1–O7 and C2–O8 bright the whole time: they never break."
  },
  {
   "id": "b6-product",
   "t0": 23.0,
   "t1": 26.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "cis-Cyclohexane-1,2-diol: both OH on one face. The purple colour fades as brown MnO₂ forms.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2],
    "tilt": 0
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[OH:7][CH:1]1[CH2:6][CH2:5][CH2:4][CH2:3][CH:2]1[OH:8]",
   "relayout": {
    "anchor": [1, 2]
   },
   "pose": {
    "7": 1,
    "8": 1
   },
   "notes": "Show a small swatch fading purple → brown in the corner (colour as chemistry, label it \"MnO₂\")."
  },
  {
   "id": "b7-meso",
   "t0": 27.0,
   "t1": 30.0,
   "hold": 0,
   "kind": "look",
   "caption": "Attack from the bottom face gives the very same molecule. The cis diol is meso: no mirror-image twin.",
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
   "state": "[OH:7][CH:1]1[CH2:6][CH2:5][CH2:4][CH2:3][CH:2]1[OH:8]"
  }
 ],
 "stereoCallout": {
  "title": "Syn diol",
  "stereoMoment": "syn-diol",
  "text": "Both O come from one MnO₄⁻ on one face and the C–O bonds never break, so the OH groups are cis. On cyclohexene that is the meso cis-diol. Open chain: a cis alkene gives a meso diol, a trans alkene a racemic pair. For the TRANS diol use RCO₃H, then H₃O⁺ (anti opening of the epoxide)."
 },
 "whatIf": ["05-alkene-epoxide", "04-alkene-h2-pd", "03-alkene-x2"],
 "quiz": {
  "q": "You need trans-cyclohexane-1,2-diol from cyclohexene. Is cold basic KMnO₄ the right reagent?",
  "options": [
   {
    "text": "No. KMnO₄/OH⁻ gives the cis diol; use RCO₃H, then H₃O⁺.",
    "correct": true,
    "why": "Yes. Both O of KMnO₄ add to one face; the epoxide route opens anti and gives trans."
   },
   {
    "text": "Yes, the two OH add anti.",
    "correct": false,
    "why": "Both O come from one MnO₄⁻ on one face, and the C–O bonds are never broken, so the OH groups end up cis."
   },
   {
    "text": "Yes, if the solution is made acidic.",
    "correct": false,
    "why": "Acidic KMnO₄ cuts the C=C apart (two C=O ends). It gives no diol at all."
   }
  ]
 },
 "notes": ["Hub id is alkene-kmno4-base; the scene file keeps the brief's name \"kmno4-cold\".", "Mn oxidation states are badges, not charges: the formal charge stays −1 on O11 throughout."]
}
```

</details>
