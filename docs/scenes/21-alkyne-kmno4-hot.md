# 21 · Hot KMnO₄ on an alkyne: the triple bond is cut to two acids

**Scene id** `21-alkyne-kmno4-hot` · **Hub card** `alkyne-kmno4-hot` · **Taught in** no lesson (Lesson 12 has no KMnO₄ step); reached from the hub card, the alkyne table's hot KMnO₄ column and the builder · **Runtime** 47.5 s, 8 beats, played at 0.75× by default · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state and product here was checked with RDKit (see Chemistry checks).

## Intent

After this scene the learner can say: "Hot KMnO₄ cuts a C≡C completely. MnO₄⁻ first adds to one π bond from one face, the alkyne is oxidised to a 1,2-diketone, and then the C–C between the two C=O is cut. An end with no H becomes –CO₂H; a terminal ≡C–H end goes on to CO₂."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `alkyne` | reactant | `[CH3:1][CH2:2][C:3]#[C:4][CH2:5][CH3:6]` | hex-3-yne | [0, 0] | full |
| `MnO4` | reagent | `[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]` | MnO₄⁻ (K⁺ not drawn) | [6.2, 0] | full |

Atom names used in captions and tables: 1, 6 = CH₃, 2, 5 = CH₂, 3 = C3 and 4 = C4 (the C≡C), 7 = O(a), 8 = O(b), 9 = Mn, 10 = O, 11 = O⁻, 12 and 13 = O of the water that ends as each OH.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–4 (+1.5 hold) | Hex-3-yne meets hot, acidic KMnO₄. A C≡C has two π bonds, and Mn(VII) badly wants electrons. | badges: Mn “Mn(VII)” | pi C3/C4 (both, focus)<br>*caption swaps to:* “One π cloud sits above and below the C≡C; the second π bond lies in the plane. MnO₄⁻ needs only one.” | zoom 1, tilt 35° |
| 2 | `b2-approach` · look | 5.5–9.5 (+1.5 hold) | Two O atoms of MnO₄⁻ line up over the top face of one π bond, one above each carbon. | moves: MnO4 (stood upright over C3–C4) | pi C3/C4 (top, focus)<br>*caption swaps to:* “The top half of one π cloud reaches up toward the two O atoms waiting above it.” | zoom 1.2, tilt 65°, faces shown |
| 3 | `b3-ring` · step | 11–16.5 (+1.5 hold) | In one step both C–O bonds form on the top face (syn): a cyclic manganate ester. One π bond is left. | badges: Mn “Mn(V)”<br>moves: MnO4<br>**arrows:** (1) bond C3–C4 → bond C3–O(a) · (2) bond Mn–O(a) → Mn (pair onto it) · (3) bond Mn–O(b) → bond O(b)–C4<br>bonds: order C3–C4 (order 2), form C3–O(a), form C4–O(b), order O(a)–Mn (order 1), order O(b)–Mn (order 1) | — | zoom 1.1, tilt 58°, faces shown |
| 4 | `b4-diketone` · summary | 18–23 (+1.5 hold) | Course level: the ring breaks up and both C–O become C=O. The alkyne is now a 1,2-diketone. | bonds: order C3–C4 (order 1), order C3–O(a) (order 2), order C4–O(b) (order 2), break O(a)–Mn, break O(b)–Mn, break Mn–O, break Mn–O⁻<br>relayout to the final drawing | — | zoom 1.1, tilt 0° |
| 5 | `b5-count` · look | 24.5–28.5 (+1.5 hold) | The C–C between the two C=O is cut next. Count the H on each old C≡C carbon: none here. | badges: C3 “no H”, C4 “no H” | — | zoom 1.1, tilt 0° |
| 6 | `b6-cleave` · summary | 30–36 (+1.5 hold) | The C–C between the two C=O is cut. Water gives each end an OH: two carboxylic acids, –CO₂H. | moves: atoms C4,CH₂,CH₃,O(b); atoms O (water); atoms O (water)<br>bonds: break C3–C4, form C3–O (water), form C4–O (water)<br>relayout to the final drawing | — | zoom 1, tilt 0° |
| 7 | `b7-products` · look | 37.5–41.5 (+1.5 hold) | Two propanoic acids, CH₃CH₂CO₂H: one from each end of the old C≡C. | badges: C3 “CO₂H”, C4 “CO₂H” | — | zoom 1, tilt 0° |
| 8 | `b8-terminal` · look | 43–47.5 (+0 hold) | A terminal C≡C differs: its ≡C–H end goes on to CO₂. Prop-1-yne gives acetic acid + CO₂. | ghost: from prop-1-yne, HC≡C–CH₃ | — | zoom 1, tilt 0° |

Why lines (shown while each arrow's electrons travel):

- `b3-ring/a1`: One π pair of the C≡C forms a bond from C3 to one oxo O, on the top face.
- `b3-ring/a2`: That Mn=O π pair moves onto Mn: Mn gains two electrons (Mn(VII) → Mn(V)).
- `b3-ring/a3`: A second Mn=O π pair forms the bond from O to C4, on the same face.

## Chemistry checks

- Reactant: `CCC#CCC` (hex-3-yne), the hub card example. Reagent: KMnO₄, hot, H₃O⁺ (`[O-][Mn](=O)(=O)=O`).
- Beat 3 (the one step arrow beat): `CCC1=C(CC)O[Mn](=O)([O-])O1`, the cyclic manganate(V) ester on one π bond; formula C₆H₁₀MnO₄⁻ and charge −1 conserved; tests/scenes.mjs checks that the three arrows reproduce every bond-order and charge change (C3≡C4 → C3=C4, C3–O and C4–O formed, both Mn=O → Mn–O).
- Beat 4 (course level): `CCC(=O)C(=O)CC`, hexane-3,4-dione, the 1,2-diketone the course names on the way.
- Products (beat 6 on): two `CCC(=O)O`, propanoic acid, achiral; the last state flattened is exactly two propanoic acids (RDKit).
- Quiz: hex-1-yne `CCCCC#C` → pentanoic acid `CCCCC(=O)O` + CO₂ `O=C=O` (the ≡C–H end); distractors hexanoic acid `CCCCCC(=O)O`, hexan-2-one `CCCCC(C)=O`, two propanoic acids. Terminal note: prop-1-yne `CC#C` → acetic acid `CC(=O)O` + CO₂. All parse in RDKit (Python, scratch generator) and the builder makes the same products (`KMnO4-hot-alkyne`).

## Stereo callout

**Syn on one π bond, then no stereo left**

MnO₄⁻ adds to one π bond from one face (syn), as it does to a C=C. But both carbons end as C=O and then CO₂H: propanoic acid has no stereocentre and no C=C, so there is nothing to label syn, cis or R/S in the products.

## What-if links

[20-alkene-kmno4-hot](20-alkene-kmno4-hot.md), [09-alkyne-hydration](09-alkyne-hydration.md)

## End quiz

**Hot KMnO₄ (H₃O⁺) on hex-1-yne, CH₃CH₂CH₂CH₂C≡CH, gives…?**

A. Pentanoic acid and CO₂: the inner end becomes CO₂H, the ≡C–H end leaves as CO₂. **(correct)**  
   Why: Yes. The C≡C is cut. C2 has no H, so it becomes CO₂H on the four-carbon chain; C1 is the ≡C–H end, so it goes all the way to CO₂.
B. Hexanoic acid, CH₃(CH₂)₄CO₂H  
   Diagnosis: That keeps all six carbons. Hot KMnO₄ cuts the C≡C itself, so the end carbon (the ≡C–H) is lost as CO₂.
C. Hexan-2-one, the methyl ketone  
   Diagnosis: That is Hg²⁺-catalysed hydration (H₂O, H₂SO₄, HgSO₄; scene 09). Hot KMnO₄ does not add water across the C≡C: it cuts it.
D. Two molecules of propanoic acid  
   Diagnosis: That is hex-3-yne, the alkyne in this scene, where the C≡C sits in the middle and neither end has an H. In hex-1-yne the C≡C is at the chain end.

## Notes

- Course level (McMurry Fundamentals Ch 4, alkyne oxidation): hot or acidic KMnO₄ cuts a C≡C; each internal end becomes a carboxylic acid and a terminal ≡C–H end becomes CO₂. The scene keeps to that level: the 1,2-diketone (b4) and the cut (b6) are course-level summary pictures, not the full mechanism.
- Beats 1-3 reuse scene 20 b1-b3 (MnO₄⁻ stood upright over one π bond, the one-step syn attachment to a cyclic manganate ester); the second π bond is left as the C=C of the ester.
- The hub card example (alkyne-kmno4-hot) is the same reaction: CCC#CCC → 2 CCC(=O)O. No lesson teaches it (Lesson 12 has no KMnO₄ step), so the scene has no lesson link.
- defaultSpeed 0.75 and 1.5 s holds, as scene 20: a dense, many-step oxidation is read more slowly.
- New hub card `alkyne-kmno4-hot` (fixed-answer, like the B3.1 cards: reactions-alkynes.js has no oxidative cleavage) opens this scene; its drill entry is fixed in generators-predict.js; the builder reagent `KMnO4-hot-alkyne` (tag "cleave") and the alkyne table column "hot KMnO₄" (pattern tag cleave) show the same products.
- Coordinates: `python tools/scene_coords.py --only alkyne-kmno4-hot` (reaction alkyne-kmno4-hot, merged into coords.json).

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "21-alkyne-kmno4-hot",
 "title": "Hot KMnO₄ on an alkyne: the triple bond is cut to two acids",
 "reagentCard": "alkyne-kmno4-hot",
 "alsoCards": [],
 "lesson": null,
 "intent": "After this scene the learner can say: \"Hot KMnO₄ cuts a C≡C completely. MnO₄⁻ first adds to one π bond from one face, the alkyne is oxidised to a 1,2-diketone, and then the C–C between the two C=O is cut. An end with no H becomes –CO₂H; a terminal ≡C–H end goes on to CO₂.\"",
 "reactant": {
  "smiles": "CCC#CCC",
  "name": "hex-3-yne"
 },
 "reagent": {
  "smiles": "[O-][Mn](=O)(=O)=O",
  "label": "KMnO₄, H₃O⁺, heat"
 },
 "products": [
  {
   "smiles": "CCC(=O)O",
   "name": "propanoic acid (two molecules)",
   "stereo": "achiral",
   "note": "One from each end of the C≡C: neither carbon had an H, so each becomes CO₂H."
  }
 ],
 "intermediates": [
  {
   "name": "cyclic manganate(V) ester on one π bond (drawn tilted)",
   "smiles": "CCC1=C(CC)O[Mn](=O)([O-])O1"
  },
  {
   "name": "hexane-3,4-dione, the 1,2-diketone (course level)",
   "smiles": "CCC(=O)C(=O)CC"
  }
 ],
 "atomNames": {
  "1": "CH₃",
  "2": "CH₂",
  "3": "C3",
  "4": "C4",
  "5": "CH₂",
  "6": "CH₃",
  "7": "O(a)",
  "8": "O(b)",
  "9": "Mn",
  "10": "O",
  "11": "O⁻",
  "12": "O (water)",
  "13": "O (water)"
 },
 "stage": {
  "species": [
   {
    "key": "alkyne",
    "role": "reactant",
    "smiles": "[CH3:1][CH2:2][C:3]#[C:4][CH2:5][CH3:6]",
    "label": "hex-3-yne",
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
     6.2,
     0
    ],
    "style": "full"
   }
  ],
  "state": "[CH3:1][CH2:2][C:3]#[C:4][CH2:5][CH3:6].[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]"
 },
 "layers": [
  "arrows",
  "orbitals"
 ],
 "duration": 47.5,
 "defaultSpeed": 0.75,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0.0,
   "t1": 4.0,
   "hold": 1.5,
   "kind": "look",
   "caption": "Hex-3-yne meets hot, acidic KMnO₄. A C≡C has two π bonds, and Mn(VII) badly wants electrons.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [
      3,
      4
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
     3,
     4,
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
   "state": "[CH3:1][CH2:2][C:3]#[C:4][CH2:5][CH3:6].[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]",
   "captionOrbitals": "One π cloud sits above and below the C≡C; the second π bond lies in the plane. MnO₄⁻ needs only one."
  },
  {
   "id": "b2-approach",
   "t0": 5.5,
   "t1": 9.5,
   "hold": 1.5,
   "kind": "look",
   "caption": "Two O atoms of MnO₄⁻ line up over the top face of one π bond, one above each carbon.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [
      3,
      4
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
     3,
     4,
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
   "state": "[CH3:1][CH2:2][C:3]#[C:4][CH2:5][CH3:6].[O:7]=[Mn:9](=[O:8])(=[O:10])[O-:11]",
   "captionOrbitals": "The top half of one π cloud reaches up toward the two O atoms waiting above it.",
   "moves": [
    {
     "species": "MnO4",
     "frame": [
      3,
      4
     ],
     "place": {
      "7": [
       -0.2,
       0,
       1.7
      ],
      "8": [
       1.2,
       0,
       1.7
      ],
      "9": [
       0.5,
       0,
       2.35
      ],
      "10": [
       -0.3,
       0,
       2.9
      ],
      "11": [
       1.3,
       0,
       2.9
      ]
     },
     "at": [
      0,
      0.7
     ]
    }
   ],
   "notes": "MnO₄⁻ stood upright over the C≡C (place move in the frame C3→C4), exactly as in scene 20 b2, so the ring of b3 reads as a pentagon on the top face."
  },
  {
   "id": "b3-ring",
   "t0": 11.0,
   "t1": 16.5,
   "hold": 1.5,
   "kind": "step",
   "caption": "In one step both C–O bonds form on the top face (syn): a cyclic manganate ester. One π bond is left.",
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
      "bond": [
       3,
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
     "why": "One π pair of the C≡C forms a bond from C3 to one oxo O, on the top face."
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
       4
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
     "why": "A second Mn=O π pair forms the bond from O to C4, on the same face."
    }
   ],
   "bonds": [
    {
     "a": 3,
     "b": 4,
     "action": "order",
     "order": 2
    },
    {
     "a": 3,
     "b": 7,
     "action": "form",
     "order": 1
    },
    {
     "a": 4,
     "b": 8,
     "action": "form",
     "order": 1
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
   "orbitals": [],
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
     3,
     4,
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
   "state": "[CH3:1][CH2:2][C:3]1=[C:4]([CH2:5][CH3:6])[O:8][Mn:9]([O-:11])(=[O:10])[O:7]1",
   "ts": true,
   "moves": [
    {
     "species": "MnO4",
     "by": [
      0,
      0,
      -0.4
     ],
     "at": [
      0.05,
      0.6
     ]
    }
   ],
   "notes": "The same one-step syn attachment as scene 20 b3 (and scene 06), on one of the two π bonds. Ordinary bonds only: no ring glyph."
  },
  {
   "id": "b4-diketone",
   "t0": 18.0,
   "t1": 23.0,
   "hold": 1.5,
   "kind": "summary",
   "caption": "Course level: the ring breaks up and both C–O become C=O. The alkyne is now a 1,2-diketone.",
   "arrows": [],
   "bonds": [
    {
     "a": 3,
     "b": 4,
     "action": "order",
     "order": 1
    },
    {
     "a": 3,
     "b": 7,
     "action": "order",
     "order": 2
    },
    {
     "a": 4,
     "b": 8,
     "action": "order",
     "order": 2
    },
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
    "zoom": 1.1,
    "focus": [
     3,
     4,
     7,
     8
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
   "state": "[CH3:1][CH2:2][C:3](=[O:7])[C:4](=[O:8])[CH2:5][CH3:6]",
   "relayout": {
    "anchor": [
     3,
     4
    ]
   },
   "notes": "Summary beat, beyond the course in detail: the course says only that the alkyne is oxidised to a 1,2-diketone (hexane-3,4-dione) on the way. The manganese fragment fades out (it ends as brown MnO₂). Relayout to the flat drawing."
  },
  {
   "id": "b5-count",
   "t0": 24.5,
   "t1": 28.5,
   "hold": 1.5,
   "kind": "look",
   "caption": "The C–C between the two C=O is cut next. Count the H on each old C≡C carbon: none here.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [
    {
     "atom": 3,
     "text": "no H",
     "tone": "muted"
    },
    {
     "atom": 4,
     "text": "no H",
     "tone": "muted"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [
     3,
     4,
     7,
     8
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
   "state": "[CH3:1][CH2:2][C:3](=[O:7])[C:4](=[O:8])[CH2:5][CH3:6]"
  },
  {
   "id": "b6-cleave",
   "t0": 30.0,
   "t1": 36.0,
   "hold": 1.5,
   "kind": "summary",
   "caption": "The C–C between the two C=O is cut. Water gives each end an OH: two carboxylic acids, –CO₂H.",
   "arrows": [],
   "bonds": [
    {
     "a": 3,
     "b": 4,
     "action": "break",
     "order": 0
    },
    {
     "a": 3,
     "b": 12,
     "action": "form",
     "order": 1
    },
    {
     "a": 4,
     "b": 13,
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
   "state": "[CH3:1][CH2:2][C:3](=[O:7])[OH:12].[CH3:6][CH2:5][C:4](=[O:8])[OH:13]",
   "adds": [
    {
     "key": "Wa",
     "role": "solvent",
     "smiles": "[OH2:12]",
     "label": "H₂O",
     "at": "auto",
     "style": "full"
    },
    {
     "key": "Wb",
     "role": "solvent",
     "smiles": "[OH2:13]",
     "label": "H₂O",
     "at": "auto",
     "style": "full"
    }
   ],
   "moves": [
    {
     "atoms": [
      4,
      5,
      6,
      8
     ],
     "by": [
      2.6,
      0,
      0
     ],
     "at": [
      0,
      0.4
     ]
    },
    {
     "atoms": [
      12
     ],
     "anchor": 12,
     "near": 3,
     "offset": [
      0.7,
      0.8,
      0
     ],
     "at": [
      0,
      0.4
     ]
    },
    {
     "atoms": [
      13
     ],
     "anchor": 13,
     "near": 4,
     "offset": [
      -0.7,
      0.8,
      0
     ],
     "at": [
      0,
      0.4
     ]
    }
   ],
   "relayout": {
    "anchor": [
     2,
     3,
     5,
     4
    ]
   },
   "notes": "Summary beat, course level: the C–C between the two C=O is cut and each end becomes CO₂H (the O of the new OH drawn from water). The real hot-acid mechanism is beyond the course."
  },
  {
   "id": "b7-products",
   "t0": 37.5,
   "t1": 41.5,
   "hold": 1.5,
   "kind": "look",
   "caption": "Two propanoic acids, CH₃CH₂CO₂H: one from each end of the old C≡C.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [
    {
     "atom": 3,
     "text": "CO₂H",
     "tone": "nuc"
    },
    {
     "atom": 4,
     "text": "CO₂H",
     "tone": "nuc"
    }
   ],
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
   "state": "[CH3:1][CH2:2][C:3](=[O:7])[OH:12].[CH3:6][CH2:5][C:4](=[O:8])[OH:13]"
  },
  {
   "id": "b8-terminal",
   "t0": 43.0,
   "t1": 47.5,
   "hold": 0,
   "kind": "look",
   "caption": "A terminal C≡C differs: its ≡C–H end goes on to CO₂. Prop-1-yne gives acetic acid + CO₂.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [
    {
     "smiles": "CC(=O)O.O=C=O",
     "label": "from prop-1-yne, HC≡C–CH₃",
     "at": "right"
    }
   ],
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
   "state": "[CH3:1][CH2:2][C:3](=[O:7])[OH:12].[CH3:6][CH2:5][C:4](=[O:8])[OH:13]"
  }
 ],
 "stereoCallout": {
  "title": "Syn on one π bond, then no stereo left",
  "text": "MnO₄⁻ adds to one π bond from one face (syn), as it does to a C=C. But both carbons end as C=O and then CO₂H: propanoic acid has no stereocentre and no C=C, so there is nothing to label syn, cis or R/S in the products.",
  "stereoMoment": null
 },
 "whatIf": [
  "20-alkene-kmno4-hot",
  "09-alkyne-hydration"
 ],
 "quiz": {
  "q": "Hot KMnO₄ (H₃O⁺) on hex-1-yne, CH₃CH₂CH₂CH₂C≡CH, gives…?",
  "options": [
   {
    "text": "Pentanoic acid and CO₂: the inner end becomes CO₂H, the ≡C–H end leaves as CO₂.",
    "correct": true,
    "why": "Yes. The C≡C is cut. C2 has no H, so it becomes CO₂H on the four-carbon chain; C1 is the ≡C–H end, so it goes all the way to CO₂."
   },
   {
    "text": "Hexanoic acid, CH₃(CH₂)₄CO₂H",
    "correct": false,
    "why": "That keeps all six carbons. Hot KMnO₄ cuts the C≡C itself, so the end carbon (the ≡C–H) is lost as CO₂."
   },
   {
    "text": "Hexan-2-one, the methyl ketone",
    "correct": false,
    "why": "That is Hg²⁺-catalysed hydration (H₂O, H₂SO₄, HgSO₄; scene 09). Hot KMnO₄ does not add water across the C≡C: it cuts it."
   },
   {
    "text": "Two molecules of propanoic acid",
    "correct": false,
    "why": "That is hex-3-yne, the alkyne in this scene, where the C≡C sits in the middle and neither end has an H. In hex-1-yne the C≡C is at the chain end."
   }
  ]
 },
 "notes": [
  "Course level (McMurry Fundamentals Ch 4, alkyne oxidation): hot or acidic KMnO₄ cuts a C≡C; each internal end becomes a carboxylic acid and a terminal ≡C–H end becomes CO₂. The scene keeps to that level: the 1,2-diketone (b4) and the cut (b6) are course-level summary pictures, not the full mechanism.",
  "Beats 1-3 reuse scene 20 b1-b3 (MnO₄⁻ stood upright over one π bond, the one-step syn attachment to a cyclic manganate ester); the second π bond is left as the C=C of the ester.",
  "The hub card example (alkyne-kmno4-hot) is the same reaction: CCC#CCC → 2 CCC(=O)O. No lesson teaches it (Lesson 12 has no KMnO₄ step), so the scene has no lesson link.",
  "defaultSpeed 0.75 and 1.5 s holds, as scene 20: a dense, many-step oxidation is read more slowly."
 ]
}
```

</details>
