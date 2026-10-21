# 20 · Hot, acidic KMnO₄: how it attaches and how it cleaves

**Scene id** `20-alkene-kmno4-hot` · **Hub card** `alkene-kmno4-acid` · **Taught in** Lesson 10 s13 (KMnO₄ in acid; s14 uses the same alkene) · **Runtime** 40 s, 9 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state and product here was checked with RDKit (see Chemistry checks).

## Intent

After this scene the learner can say: "MnO₄⁻ first bonds to both alkene carbons from one face, as in the cold reaction, and water gives the diol. Hot and acidic, KMnO₄ keeps going: the bond that joined the two OH carbons is cut and each end becomes C=O. An end with no H stays a ketone; an end with one H goes on to a carboxylic acid; =CH₂ goes to CO₂."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `alkene` | reactant | `[CH3:3][C:1]([CH3:4])=[CH:2][CH3:5]` | 2-methylbut-2-ene | [0, 0] | full |
| `MnO4` | reagent | `[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]` | MnO₄⁻ (K⁺ not drawn) | [3.8, 0] | full |

Atom names used in captions and tables: 1 = C1 (the (CH₃)₂C end), 2 = C2 (the CH end), 3, 4, 5 = CH₃, 7 = O(a), 8 = O(b), 9 = Mn, 10 = O, 11 = O⁻ (the first MnO₄⁻), 12 and 14 = H (from water), 20-24 = the fresh MnO₄⁻ (21 = its Mn, 24 = its O⁻).

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | 2-Methylbut-2-ene meets hot, acidic KMnO₄. Permanganate is purple; its Mn(VII) badly wants electrons. | badges: Mn “Mn(VII)” | pi C1/C2 (both, focus)<br>*caption swaps to:* “The π cloud of the C=C sits above and below the flat molecule: a top face and a bottom face.” | zoom 1, tilt 35° |
| 2 | `b2-approach` · look | 4–7 (+1 hold) | Two O atoms of MnO₄⁻ line up over the top face of the C=C, one above each carbon. | moves: MnO4 | pi C1/C2 (top, focus)<br>*caption swaps to:* “The top half of the π cloud reaches up toward the two O atoms waiting above it.” | zoom 1.2, tilt 65°, faces shown |
| 3 | `b3-ring` · step | 8–12 (+1 hold) | In one step both C–O bonds form, both on the top face (syn): a cyclic manganate ester. Mn(VII) → Mn(V). | badges: Mn “Mn(V)”<br>**arrows:** (1) bond C1–C2 → bond C1–O(a) · (2) bond Mn–O(a) → Mn (pair onto it) · (3) bond Mn–O(b) → bond O(b)–C2<br>bonds: order C1–C2 (order 1), form C1–O(a), form C2–O(b), order O(a)–Mn (order 1), order O(b)–Mn (order 1) | ring C1/O(a)/Mn/O(b)/C2 (top, focus) | zoom 1.1, tilt 58°, faces shown |
| 4 | `b4-diol` · summary | 13–17 (+1 hold) | Water cuts the two O–Mn bonds, never the C–O bonds: the diol. Cold, dilute, basic KMnO₄ stops here. | moves: atoms H; atoms H<br>bonds: break O(a)–Mn, break O(b)–Mn, break Mn–O, break Mn–O⁻, form O(a)–H, form O(b)–H | — | zoom 1.1, tilt 60°, faces shown |
| 5 | `b5-attach` · summary | 18–21 (+1 hold) | Hot and acidic, it goes on: a fresh MnO₄⁻ bonds to one OH oxygen, and HO⁻ leaves. Mn(VII) wants a pair. | badges: Mn (fresh MnO₄⁻) “Mn(VII)”<br>moves: MnO4b; atoms O (HO⁻)<br>bonds: break O(b)–H, form O(b)–Mn (fresh MnO₄⁻), break Mn (fresh MnO₄⁻)–O (HO⁻) | — | zoom 1.2, tilt 60° |
| 6 | `b6-cleave` · step | 22–27 (+1 hold) | The bond that joined the two OH carbons is cut. Each end becomes C=O, and Mn takes the pair: Mn(V). | badges: Mn (fresh MnO₄⁻) “Mn(V)”<br>moves: atoms C2,CH₃,O(b); atoms O (HO⁻); atoms Mn (fresh MnO₄⁻),O,O,O; atoms H<br>**arrows:** (1) bond C1–C2 → bond C2–O(b) · (2) bond O(b)–Mn (fresh MnO₄⁻) → Mn (fresh MnO₄⁻) (pair onto it) · (3) bond H–O(a) → bond O(a)–C1<br>bonds: break C1–C2, order C2–O(b) (order 2), break O(b)–Mn (fresh MnO₄⁻), break O(a)–H, order C1–O(a) (order 2)<br>charges: Mn (fresh MnO₄⁻) −, H + | — | zoom 1.2, tilt 55° |
| 7 | `b7-sort` · look | 28–31 (+1 hold) | Sort the ends. The (CH₃)₂C end has no H: a ketone, acetone. The CH end still has an H: an aldehyde. | badges: C1 “no H”, C2 “one H” | — | zoom 1.2, tilt 40° |
| 8 | `b8-acid` · summary | 32–36 (+1 hold) | KMnO₄ oxidises that C–H too: the aldehyde becomes acetic acid. Purple MnO₄⁻ ends as brown MnO₂. | bonds: form C2–O (HO⁻)<br>relayout to the final drawing | — | zoom 1, tilt 0° |
| 9 | `b9-products` · look | 37–40 (+0 hold) | Acetone and acetic acid, from one C=C. A =CH₂ end would be oxidised all the way to CO₂. | hold the picture | — | zoom 1, tilt 0° |

Why lines (shown while each arrow's electrons travel):

- `b3-ring/a1`: The π pair forms a bond from C1 to one oxo O, on the top face.
- `b3-ring/a2`: That Mn=O π pair moves onto Mn: Mn gains two electrons (Mn(VII) → Mn(V)).
- `b3-ring/a3`: A second Mn=O π pair forms the bond from O to C2, on the same face.
- `b6-cleave/a1`: The C–C σ pair swings onto C2 and its O: it becomes the C2=O bond. The two halves come apart.
- `b6-cleave/a2`: The O–Mn pair moves onto Mn, so Mn gains two electrons: Mn(VII) → Mn(V).
- `b6-cleave/a3`: The O–H pair on the other carbon becomes its C1=O bond; the H leaves as H⁺.

## Chemistry checks

- Reactant: `CC(C)=CC` (2-methylbut-2-ene), the hub card example (`CC=C(C)C`). Reagent: KMnO₄, H₃O⁺, heat (`[O-][Mn](=O)(=O)=O`).
- Beats 1-3 are scene 06 on this alkene: the cyclic manganate(V) ester `CC1O[Mn](=O)([O-])OC1(C)C`, both C–O bonds on the top face.
- Beat 4 (where cold, dilute, basic KMnO₄ stops): `CC(C)(O)[C@@H](C)O`, 2-methylbutane-2,3-diol. RDKit: ONE stereocentre (C3 of the diol; C2 carries two CH₃), chiral, so it forms as a racemate (syn addition from either face equally). No cis/trans or meso label applies to this diol.
- Beat 5: `CC(O[Mn](=O)(=O)=O)C(C)(C)O` + HO⁻ (a course-level picture of MnO₄⁻ bonding to one OH): formula and charge conserved.
- Beat 6 (the cut): products `CC(C)=O` (acetone), `CC=O` (acetaldehyde), MnO₃⁻ (Mn(V)), H⁺. Formula and charge conserved; tests/scenes.mjs checks that the three arrows reproduce every bond-order and formal-charge change (C1–C2 broken, C2=O and C1=O formed, O–Mn and O–H broken, Mn −1, H +1).
- Products (beat 8): `CC(C)=O` acetone and `CC(=O)O` acetic acid, both achiral; RDKit cleaving the C=C and oxidising the C(H)=O end gives exactly these (and `CC(=O)CCCCC(=O)O`, 6-oxoheptanoic acid, for the quiz alkene 1-methylcyclohexene). The quiz distractor cis-1-methylcyclohexane-1,2-diol was checked cis by 3D embedding.
- Checked with Python RDKit for every beat: each state parses; the step beats conserve the element formula and the total charge; the last state flattened contains both products.

## Stereo callout

**Syn attachment, then the stereocentre is erased**

Both O come from one MnO₄⁻ on one face (syn), as in the cold reaction. On this alkene the diol has one stereocentre and forms as a racemate (no cis/trans: one carbon has two CH₃). Cleavage then erases it: acetone and acetic acid have no stereocentres.

## What-if links

[06-alkene-kmno4-cold](06-alkene-kmno4-cold.md)

## End quiz

**Hot KMnO₄ on 1-methylcyclohexene gives…?**

A. 6-Oxoheptanoic acid, CH₃CO(CH₂)₄CO₂H: the ring opens, one end a ketone, one end an acid. **(correct)**  
   Why: Yes. The C=C is cut. The carbon with the CH₃ has no H: ketone. The CH carbon has one H: acid. A ring gives one chain.
B. cis-1-Methylcyclohexane-1,2-diol  
   Diagnosis: That is the cold, dilute, basic product (scene 06). Hot or acidic KMnO₄ does not stop at the diol: it cuts the C=C.
C. Two separate molecules: a ketone and a carboxylic acid  
   Diagnosis: The C=C is inside a ring, so cutting it opens the ring: both new ends stay on one chain, 6-oxoheptanoic acid.
D. 6-Oxoheptanal, CH₃CO(CH₂)₄CHO  
   Diagnosis: The CH end has an H, so hot KMnO₄ does not stop at the aldehyde: it oxidises it on to CO₂H.

## Notes

- Course level: McMurry Fundamentals Ch 4 (hot or acidic KMnO₄ cleaves a C=C; an end with no H gives a ketone, one H a carboxylic acid, two H CO₂). The scene keeps to that level. One step deeper, and marked as such in the beat notes: the second MnO₄⁻ bonding to the diol (b5), the arrows of the cut (b6) and the aldehyde → acid step (b8) are course-level pictures, not the full mechanism.
- Beats 1-3 reuse scene 06 (the one-step syn attachment and the cyclic manganate ester); b4 is scene 06's hydrolysis, where the cold reaction stops.
- The hub card example (alkene-kmno4-acid) is the same reaction: CC=C(C)C → CC(C)=O + CC(=O)O. Lesson 10 s14 (the cleave-it task) uses the same alkene.
- Stereo: 'so the diol is cis' does not apply to this alkene: 2-methylbutane-2,3-diol has one stereocentre (C2 of the diol carries two CH₃), so it forms as a racemate, not as a cis or meso compound. The callout says so.
- Mn oxidation states are badges, not charges. The final MnO₂ is named in the caption only (not drawn).
- Hub card `alkene-kmno4-acid` now opens this scene ("Watch how it works"); Lesson 10 s13 gets "Watch the scene" after it is answered. Lesson 17 keeps no scene buttons (a test forbids them there: its steps are unaided predict-the-product drills). The mastery type `predict-oxid` lists the scene too.

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "20-alkene-kmno4-hot",
 "title": "Hot, acidic KMnO₄: how it attaches and how it cleaves",
 "reagentCard": "alkene-kmno4-acid",
 "alsoCards": [],
 "lesson": {
  "id": "10",
  "step": "s13"
 },
 "intent": "After this scene the learner can say: \"MnO₄⁻ first bonds to both alkene carbons from one face, as in the cold reaction, and water gives the diol. Hot and acidic, KMnO₄ keeps going: the bond that joined the two OH carbons is cut and each end becomes C=O. An end with no H stays a ketone; an end with one H goes on to a carboxylic acid; =CH₂ goes to CO₂.\"",
 "reactant": {
  "smiles": "CC(C)=CC",
  "name": "2-methylbut-2-ene"
 },
 "reagent": {
  "smiles": "[O-][Mn](=O)(=O)=O",
  "label": "KMnO₄, H₃O⁺, heat"
 },
 "products": [
  {
   "smiles": "CC(C)=O",
   "name": "acetone (propan-2-one)",
   "stereo": "achiral",
   "note": "From the (CH₃)₂C= end: no H on that carbon, so it stops at the ketone."
  },
  {
   "smiles": "CC(=O)O",
   "name": "acetic acid (ethanoic acid)",
   "stereo": "achiral",
   "note": "From the =CH(CH₃) end: its H lets the aldehyde be oxidised on to the acid."
  },
  {
   "smiles": "CC(C)(O)[C@@H](C)O",
   "name": "2-methylbutane-2,3-diol",
   "stereo": "racemate",
   "inFinal": false,
   "note": "Where cold, dilute, basic KMnO₄ stops (beat 4). One stereocentre (C3 of the diol); both faces react equally, so a racemate. Not cis/trans or meso: C2 of the diol carries two CH₃."
  }
 ],
 "intermediates": [
  {
   "name": "cyclic manganate(V) ester (drawn tilted)",
   "smiles": "CC1O[Mn](=O)([O-])OC1(C)C"
  },
  {
   "name": "manganate(VII) monoester of the diol (a course-level simplification)",
   "smiles": "CC(O[Mn](=O)(=O)=O)C(C)(C)O"
  },
  {
   "name": "acetaldehyde (ethanal), oxidised on",
   "smiles": "CC=O"
  }
 ],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "3": "CH₃",
  "4": "CH₃",
  "5": "CH₃",
  "7": "O(a)",
  "8": "O(b)",
  "9": "Mn",
  "10": "O",
  "11": "O⁻",
  "12": "H",
  "14": "H",
  "20": "O",
  "21": "Mn (fresh MnO₄⁻)",
  "22": "O",
  "23": "O",
  "24": "O (HO⁻)"
 },
 "stage": {
  "species": [
   {
    "key": "alkene",
    "role": "reactant",
    "smiles": "[CH3:3][C:1]([CH3:4])=[CH:2][CH3:5]",
    "label": "2-methylbut-2-ene",
    "at": [
     0,
     0
    ],
    "style": "full"
   },
   {
    "key": "MnO4",
    "role": "reagent",
    "smiles": "[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]",
    "label": "MnO₄⁻ (K⁺ not drawn)",
    "at": [
     3.8,
     0
    ],
    "style": "full"
   }
  ],
  "state": "[CH3:3][C:1]([CH3:4])=[CH:2][CH3:5].[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]"
 },
 "layers": [
  "arrows",
  "orbitals"
 ],
 "duration": 40.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0.0,
   "t1": 3.0,
   "hold": 1,
   "kind": "look",
   "caption": "2-Methylbut-2-ene meets hot, acidic KMnO₄. Permanganate is purple; its Mn(VII) badly wants electrons.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [
      1,
      2
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2
    }
   ],
   "badges": [
    {
     "atom": 9,
     "text": "Mn(VII)",
     "tone": "elec"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [
     1,
     2,
     9
    ],
    "tilt": 35
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:3][C:1]([CH3:4])=[CH:2][CH3:5].[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]",
   "captionOrbitals": "The π cloud of the C=C sits above and below the flat molecule: a top face and a bottom face."
  },
  {
   "id": "b2-approach",
   "t0": 4.0,
   "t1": 7.0,
   "hold": 1,
   "kind": "look",
   "caption": "Two O atoms of MnO₄⁻ line up over the top face of the C=C, one above each carbon.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [
      1,
      2
     ],
     "side": "top",
     "emphasis": "focus",
     "electrons": 2
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [
     1,
     2,
     9
    ],
    "tilt": 65
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:3][C:1]([CH3:4])=[CH:2][CH3:5].[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]",
   "captionOrbitals": "The top half of the π cloud reaches up toward the two O atoms waiting above it.",
   "moves": [
    {
     "species": "MnO4",
     "pairs": [
      [
       7,
       1
      ],
      [
       8,
       2
      ]
     ],
     "gap": [
      0,
      0,
      1.3
     ],
     "at": [
      0,
      0.7
     ]
    }
   ]
  },
  {
   "id": "b3-ring",
   "t0": 8.0,
   "t1": 12.0,
   "hold": 1,
   "kind": "step",
   "caption": "In one step both C–O bonds form, both on the top face (syn): a cyclic manganate ester. Mn(VII) → Mn(V).",
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
       1,
       7
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
      0.05,
      0.7
     ],
     "why": "The π pair forms a bond from C1 to one oxo O, on the top face."
    },
    {
     "id": "a2",
     "from": {
      "bond": [
       9,
       7
      ]
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
     "at": [
      0.15,
      0.8
     ],
     "why": "That Mn=O π pair moves onto Mn: Mn gains two electrons (Mn(VII) → Mn(V))."
    },
    {
     "id": "a3",
     "from": {
      "bond": [
       9,
       8
      ]
     },
     "to": {
      "bond": [
       8,
       2
      ]
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
      0.3,
      0.95
     ],
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
   "orbitals": [
    {
     "kind": "ring",
     "atoms": [
      1,
      7,
      9,
      8,
      2
     ],
     "side": "top",
     "emphasis": "focus"
    }
   ],
   "badges": [
    {
     "atom": 9,
     "text": "Mn(V)",
     "tone": "muted"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [
     1,
     2,
     9
    ],
    "tilt": 58
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[O-:11][Mn:9]1(=[O:10])[O:7][C:1]([CH3:3])([CH3:4])[CH:2]([CH3:5])[O:8]1",
   "ts": true
  },
  {
   "id": "b4-diol",
   "t0": 13.0,
   "t1": 17.0,
   "hold": 1,
   "kind": "summary",
   "caption": "Water cuts the two O–Mn bonds, never the C–O bonds: the diol. Cold, dilute, basic KMnO₄ stops here.",
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
    },
    {
     "a": 7,
     "b": 12,
     "action": "form",
     "order": 1
    },
    {
     "a": 8,
     "b": 14,
     "action": "form",
     "order": 1
    }
   ],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [
     1,
     2,
     7,
     8
    ],
    "tilt": 60
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[H:12][O:7][C:1]([CH3:3])([CH3:4])[CH:2]([CH3:5])[O:8][H:14]",
   "adds": [
    {
     "key": "Ha",
     "role": "solvent",
     "smiles": "[H:12]",
     "label": "H",
     "at": [
      -0.9,
      -0.6
     ],
     "style": "full"
    },
    {
     "key": "Hb",
     "role": "solvent",
     "smiles": "[H:14]",
     "label": "H",
     "at": [
      1.9,
      -0.6
     ],
     "style": "full"
    }
   ],
   "moves": [
    {
     "atoms": [
      12
     ],
     "anchor": 12,
     "near": 7,
     "offset": [
      -0.8,
      0,
      0.5
     ],
     "at": [
      0,
      0.5
     ]
    },
    {
     "atoms": [
      14
     ],
     "anchor": 14,
     "near": 8,
     "offset": [
      0.8,
      0,
      0.5
     ],
     "at": [
      0,
      0.5
     ]
    }
   ],
   "notes": "Summary beat, as scene 06 b5: no arrows (hydrolysis detail is beyond the course). The Mn fragment (9, 10, 11) fades out while an H fades in on O7 and on O8 (explicit, because the O7–H bond is an arrow source in b6). C1–O7 and C2–O8 never break. Under cold, dilute, basic conditions the reaction stops here (scene 06)."
  },
  {
   "id": "b5-attach",
   "t0": 18.0,
   "t1": 21.0,
   "hold": 1,
   "kind": "summary",
   "caption": "Hot and acidic, it goes on: a fresh MnO₄⁻ bonds to one OH oxygen, and HO⁻ leaves. Mn(VII) wants a pair.",
   "arrows": [],
   "bonds": [
    {
     "a": 8,
     "b": 14,
     "action": "break",
     "order": 0
    },
    {
     "a": 8,
     "b": 21,
     "action": "form",
     "order": 1
    },
    {
     "a": 21,
     "b": 24,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [
    {
     "atom": 21,
     "text": "Mn(VII)",
     "tone": "elec"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [
     1,
     2,
     7,
     8,
     21
    ],
    "tilt": 60
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[H:12][O:7][C:1]([CH3:3])([CH3:4])[CH:2]([CH3:5])[O:8][Mn:21](=[O:20])(=[O:22])=[O:23].[OH-:24]",
   "adds": [
    {
     "key": "MnO4b",
     "role": "reagent",
     "smiles": "[O-:24][Mn:21](=[O:20])(=[O:22])=[O:23]",
     "label": "MnO₄⁻",
     "at": "auto",
     "style": "full"
    }
   ],
   "moves": [
    {
     "species": "MnO4b",
     "anchor": 21,
     "near": 8,
     "offset": [
      1.15,
      -0.2,
      0.5
     ],
     "at": [
      0,
      0.6
     ]
    },
    {
     "atoms": [
      24
     ],
     "by": [
      0.9,
      0.6,
      -0.4
     ],
     "at": [
      0.55,
      0.95
     ]
    }
   ],
   "notes": "Summary beat: a simplified attachment (the O–H of one OH swapped for O–Mn; the HO⁻ is water in the acid). Beyond the course: how permanganate really attacks the diol is not taught, and hot-acid cleavage need not go through the free diol at all."
  },
  {
   "id": "b6-cleave",
   "t0": 22.0,
   "t1": 27.0,
   "hold": 1,
   "kind": "step",
   "caption": "The bond that joined the two OH carbons is cut. Each end becomes C=O, and Mn takes the pair: Mn(V).",
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
      0.05,
      0.7
     ],
     "why": "The C–C σ pair swings onto C2 and its O: it becomes the C2=O bond. The two halves come apart."
    },
    {
     "id": "a2",
     "from": {
      "bond": [
       8,
       21
      ]
     },
     "to": {
      "atom": 21
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
      0.15,
      0.8
     ],
     "why": "The O–Mn pair moves onto Mn, so Mn gains two electrons: Mn(VII) → Mn(V)."
    },
    {
     "id": "a3",
     "from": {
      "bond": [
       12,
       7
      ]
     },
     "to": {
      "bond": [
       7,
       1
      ]
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
      0.3,
      0.95
     ],
     "why": "The O–H pair on the other carbon becomes its C1=O bond; the H leaves as H⁺."
    }
   ],
   "bonds": [
    {
     "a": 1,
     "b": 2,
     "action": "break",
     "order": 0
    },
    {
     "a": 2,
     "b": 8,
     "action": "order",
     "order": 2
    },
    {
     "a": 8,
     "b": 21,
     "action": "break",
     "order": 0
    },
    {
     "a": 7,
     "b": 12,
     "action": "break",
     "order": 0
    },
    {
     "a": 1,
     "b": 7,
     "action": "order",
     "order": 2
    }
   ],
   "charges": [
    {
     "atom": 21,
     "charge": -1
    },
    {
     "atom": 12,
     "charge": 1
    }
   ],
   "partials": [],
   "orbitals": [],
   "badges": [
    {
     "atom": 21,
     "text": "Mn(V)",
     "tone": "muted"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [
     1,
     2,
     7,
     8
    ],
    "tilt": 55
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:3][C:1]([CH3:4])=[O:7].[CH3:5][CH:2]=[O:8].[O:20]=[Mn-:21](=[O:22])=[O:23].[H+:12].[OH-:24]",
   "ts": true,
   "moves": [
    {
     "atoms": [
      2,
      5,
      8
     ],
     "by": [
      1.5,
      0,
      0
     ],
     "at": [
      0.55,
      1.0
     ]
    },
    {
     "atoms": [
      24
     ],
     "by": [
      1.5,
      0,
      0
     ],
     "at": [
      0.55,
      1.0
     ]
    },
    {
     "atoms": [
      21,
      20,
      22,
      23
     ],
     "by": [
      2.0,
      0,
      0.3
     ],
     "at": [
      0.6,
      1.0
     ]
    },
    {
     "atoms": [
      12
     ],
     "by": [
      -0.6,
      0,
      0.3
     ],
     "at": [
      0.7,
      1.0
     ]
    }
   ],
   "notes": "Course level (McMurry Fundamentals: hot or acidic KMnO₄ cleaves the C=C, each end becoming C=O): one concerted picture of the cut, drawn the way the course says it, 'the bond that joined the two OH carbons is cut; each end becomes C=O'. The real hot-acid mechanism is beyond the course."
  },
  {
   "id": "b7-sort",
   "t0": 28.0,
   "t1": 31.0,
   "hold": 1,
   "kind": "look",
   "caption": "Sort the ends. The (CH₃)₂C end has no H: a ketone, acetone. The CH end still has an H: an aldehyde.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [
    {
     "atom": 1,
     "text": "no H",
     "tone": "muted"
    },
    {
     "atom": 2,
     "text": "one H",
     "tone": "elec"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [
     1,
     2,
     7,
     8
    ],
    "tilt": 40
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:3][C:1]([CH3:4])=[O:7].[CH3:5][CH:2]=[O:8].[O:20]=[Mn-:21](=[O:22])=[O:23].[H+:12].[OH-:24]"
  },
  {
   "id": "b8-acid",
   "t0": 32.0,
   "t1": 36.0,
   "hold": 1,
   "kind": "summary",
   "caption": "KMnO₄ oxidises that C–H too: the aldehyde becomes acetic acid. Purple MnO₄⁻ ends as brown MnO₂.",
   "arrows": [],
   "bonds": [
    {
     "a": 2,
     "b": 24,
     "action": "form",
     "order": 1
    }
   ],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [
     1,
     2
    ],
    "tilt": 0
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[CH3:3][C:1]([CH3:4])=[O:7].[CH3:5][C:2](=[O:8])[OH:24]",
   "relayout": {
    "anchor": [
     1,
     3,
     4
    ]
   },
   "notes": "Summary beat: the aldehyde → acid oxidation is not drawn with arrows (beyond the course: water adds to the C=O and that hydrate is oxidised). The HO⁻ oxygen becomes the new OH; H⁺ and the manganese fragment fade out."
  },
  {
   "id": "b9-products",
   "t0": 37.0,
   "t1": 40.0,
   "hold": 0,
   "kind": "look",
   "caption": "Acetone and acetic acid, from one C=C. A =CH₂ end would be oxidised all the way to CO₂.",
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
   "state": "[CH3:3][C:1]([CH3:4])=[O:7].[CH3:5][C:2](=[O:8])[OH:24]"
  }
 ],
 "stereoCallout": {
  "title": "Syn attachment, then the stereocentre is erased",
  "text": "Both O come from one MnO₄⁻ on one face (syn), as in the cold reaction. On this alkene the diol has one stereocentre and forms as a racemate (no cis/trans: one carbon has two CH₃). Cleavage then erases it: acetone and acetic acid have no stereocentres.",
  "stereoMoment": null
 },
 "whatIf": [
  "06-alkene-kmno4-cold"
 ],
 "quiz": {
  "q": "Hot KMnO₄ on 1-methylcyclohexene gives…?",
  "options": [
   {
    "text": "6-Oxoheptanoic acid, CH₃CO(CH₂)₄CO₂H: the ring opens, one end a ketone, one end an acid.",
    "correct": true,
    "why": "Yes. The C=C is cut. The carbon with the CH₃ has no H: ketone. The CH carbon has one H: acid. A ring gives one chain."
   },
   {
    "text": "cis-1-Methylcyclohexane-1,2-diol",
    "correct": false,
    "why": "That is the cold, dilute, basic product (scene 06). Hot or acidic KMnO₄ does not stop at the diol: it cuts the C=C."
   },
   {
    "text": "Two separate molecules: a ketone and a carboxylic acid",
    "correct": false,
    "why": "The C=C is inside a ring, so cutting it opens the ring: both new ends stay on one chain, 6-oxoheptanoic acid."
   },
   {
    "text": "6-Oxoheptanal, CH₃CO(CH₂)₄CHO",
    "correct": false,
    "why": "The CH end has an H, so hot KMnO₄ does not stop at the aldehyde: it oxidises it on to CO₂H."
   }
  ]
 },
 "notes": [
  "Course level: McMurry Fundamentals Ch 4 (hot or acidic KMnO₄ cleaves a C=C; an end with no H gives a ketone, one H a carboxylic acid, two H CO₂). The scene keeps to that level. One step deeper, and marked as such in the beat notes: the second MnO₄⁻ bonding to the diol (b5), the arrows of the cut (b6) and the aldehyde → acid step (b8) are course-level pictures, not the full mechanism.",
  "Beats 1-3 reuse scene 06 (the one-step syn attachment and the cyclic manganate ester); b4 is scene 06's hydrolysis, where the cold reaction stops.",
  "The hub card example (alkene-kmno4-acid) is the same reaction: CC=C(C)C → CC(C)=O + CC(=O)O. Lesson 10 s14 (the cleave-it task) uses the same alkene.",
  "Stereo: 'so the diol is cis' does not apply to this alkene: 2-methylbutane-2,3-diol has one stereocentre (C2 of the diol carries two CH₃), so it forms as a racemate, not as a cis or meso compound. The callout says so.",
  "Mn oxidation states are badges, not charges. The final MnO₂ is named in the caption only (not drawn)."
 ]
}
```

</details>
