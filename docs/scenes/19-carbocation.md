# 19 · The carbocation: a flat + carbon and its empty p orbital

**Scene id** `19-carbocation` · **Hub card** `alkene-hx` (primer: the card keeps scene 01 as its own) · **Taught in** Lesson 08 s15 · **Runtime** 14 s, 3 beats (a short primer) · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view.

## Intent

After this scene the learner can say: "The + carbon of a carbocation has three bonds in one flat plane and six electrons. Its empty p orbital stands above and below that plane, and a lone pair of Cl⁻ flows into it to make the new bond."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `cation` | reactant | `[CH3:1][CH2+:2]` | CH₃CH₂⁺ | [0, 0] | full |
| `Cl` | reagent | `[Cl-:3]` | Cl⁻ | [2.6, -0.6] | full |

Atom names used in captions and tables: 1 = C1, 2 = C2 (the + carbon), 3 = Cl.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-flat` · look | 0–4 (+1 hold) | CH₃CH₂⁺ seen edge-on. The + carbon has three bonds in one flat plane and only six electrons. | hold the picture | p-empty C2 (the + carbon) (both, focus)<br>*caption swaps to:* “The empty p orbital: one lobe above the flat + carbon, one below, and no electrons in it.” | zoom 2, tilt 60°, faces shown |
| 2 | `b2-approach` · look | 5–9 (+1 hold) | Cl⁻ comes in over the top face. One of its four lone pairs points straight at the empty lobe. | moves: atoms Cl | p-empty C2 (the + carbon) (both, focus)<br>lone-pair Cl (both, focus) | zoom 1.3, tilt 55°, faces shown |
| 3 | `b3-bond` · step | 10–14 (+0 hold) | The lone pair flows into the empty p orbital and becomes the C–Cl bond: chloroethane, CH₃CH₂Cl. | **arrows:** (1) lone pair on Cl → C2 (the + carbon) (new bond)<br>bonds: form C2 (the + carbon)–Cl<br>charges: C2 (the + carbon) 0, Cl 0 | p-empty C2 (the + carbon) (top, focus)<br>lone-pair Cl (both, focus) | zoom 1.3, tilt 55°, faces shown |

Why lines (shown while each arrow's electrons travel):

- `b3-bond/a1`: Lone pair → atom: a Cl⁻ pair (rich) fills the empty p orbital of the + carbon (poor) and becomes the C–Cl bond.

## Chemistry checks

- Stage: `C[CH2+]` (ethyl cation, the cation of Lesson 08 s12-s16) and `[Cl-]`. End: `CCCl`, chloroethane, as in scene 17. Atoms and the total charge (0) never change.
- The + carbon: three bonds, no lone pair, six electrons (RDKit), so its p orbital is empty; drawn as two hollow coral lobes above and below the flat carbon.
- C2 ends with two H, so it is not a stereocentre: either face gives the same molecule (the stereo callout says so).

## Stereo callout

**Flat cation, two faces**

The + carbon is flat, so Cl⁻ could come in over the top face or under the bottom one. Here C2 ends with two H, so both faces give the same chloroethane.

## What-if links

[17-hcl-ethylene](17-hcl-ethylene.md)

## End quiz

**Why can Cl⁻ bond to the + carbon?**

A. The + carbon has only six electrons and an empty p orbital, so it can take a pair. **(correct)**  
   Why: Yes. Three bonds give six electrons; the empty p orbital is the room a lone pair of Cl⁻ fills.
B. The + carbon has a lone pair that it gives to Cl⁻.  
   Diagnosis: The + carbon has no lone pair at all: three bonds and nothing else. The pair comes from Cl⁻.
C. Cl⁻ pulls a bond off the carbon to make room.  
   Diagnosis: No bond breaks here. The carbon already has room: its empty p orbital. Cl⁻ simply gives it a pair.

## Notes

- Added 2026-10-20 (novice review #3): Lesson 08 s15 explains the flat carbocation and its empty p orbital; this short primer shows exactly that, then step 2 of HCl + ethylene. The full HCl scene (17) stays on s13 and s17.
- Course level: the cation is explained by electron counting and the empty p orbital; no hyperconjugation. A short primer: 3 beats, 14 s (the 25-50 s rule is for the reagent scenes).

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "19-carbocation",
 "title": "The carbocation: a flat + carbon and its empty p orbital",
 "reagentCard": "alkene-hx",
 "alsoCards": [],
 "lesson": {
  "id": "08",
  "step": "s15"
 },
 "intent": "After this scene the learner can say: \"The + carbon of a carbocation has three bonds in one flat plane and six electrons. Its empty p orbital stands above and below that plane, and a lone pair of Cl⁻ flows into it to make the new bond.\"",
 "reactant": {
  "smiles": "C[CH2+]",
  "name": "ethyl cation"
 },
 "reagent": {
  "smiles": "[Cl-]",
  "label": "Cl⁻"
 },
 "products": [
  {
   "smiles": "CCCl",
   "name": "chloroethane",
   "stereo": "achiral",
   "note": "C2 carries two H, so either face gives the same molecule."
  }
 ],
 "intermediates": [],
 "atomNames": {
  "1": "C1",
  "2": "C2 (the + carbon)",
  "3": "Cl"
 },
 "stage": {
  "species": [
   {
    "key": "cation",
    "role": "reactant",
    "smiles": "[CH3:1][CH2+:2]",
    "label": "CH₃CH₂⁺",
    "at": [
     0,
     0
    ],
    "style": "full"
   },
   {
    "key": "Cl",
    "role": "reagent",
    "smiles": "[Cl-:3]",
    "label": "Cl⁻",
    "at": [
     2.6,
     -0.6
    ],
    "style": "full"
   }
  ],
  "state": "[CH3:1][CH2+:2].[Cl-:3]"
 },
 "layers": [
  "arrows",
  "orbitals"
 ],
 "duration": 14,
 "beats": [
  {
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [
      2
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0,
     "label": "empty p"
    }
   ],
   "badges": [],
   "ghosts": [],
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "id": "b1-flat",
   "t0": 0,
   "t1": 4,
   "hold": 1,
   "kind": "look",
   "caption": "CH₃CH₂⁺ seen edge-on. The + carbon has three bonds in one flat plane and only six electrons.",
   "captionOrbitals": "The empty p orbital: one lobe above the flat + carbon, one below, and no electrons in it.",
   "camera": {
    "zoom": 2,
    "focus": [
     1,
     2
    ],
    "tilt": 60
   },
   "state": "[CH3:1][CH2+:2].[Cl-:3]"
  },
  {
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [
      2
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0
    },
    {
     "kind": "lone-pair",
     "atoms": [
      3
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "toward": 2
    }
   ],
   "badges": [],
   "ghosts": [],
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "id": "b2-approach",
   "t0": 5,
   "t1": 9,
   "hold": 1,
   "kind": "look",
   "caption": "Cl⁻ comes in over the top face. One of its four lone pairs points straight at the empty lobe.",
   "moves": [
    {
     "atoms": [
      3
     ],
     "anchor": 3,
     "near": 2,
     "offset": [
      0,
      0,
      1.7
     ],
     "at": [
      0,
      0.8
     ]
    }
   ],
   "camera": {
    "zoom": 1.3,
    "focus": [
     2,
     3
    ],
    "tilt": 55
   },
   "state": "[CH3:1][CH2+:2].[Cl-:3]"
  },
  {
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 3
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
     "at": [
      0.2,
      0.8
     ],
     "why": "Lone pair → atom: a Cl⁻ pair (rich) fills the empty p orbital of the + carbon (poor) and becomes the C–Cl bond."
    }
   ],
   "bonds": [
    {
     "a": 2,
     "b": 3,
     "action": "form",
     "order": 1
    }
   ],
   "charges": [
    {
     "atom": 2,
     "charge": 0
    },
    {
     "atom": 3,
     "charge": 0
    }
   ],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [
      2
     ],
     "side": "top",
     "emphasis": "focus",
     "electrons": 0
    },
    {
     "kind": "lone-pair",
     "atoms": [
      3
     ],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "toward": 2
    }
   ],
   "badges": [],
   "ghosts": [],
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "id": "b3-bond",
   "t0": 10,
   "t1": 14,
   "hold": 0,
   "kind": "step",
   "caption": "The lone pair flows into the empty p orbital and becomes the C–Cl bond: chloroethane, CH₃CH₂Cl.",
   "camera": {
    "zoom": 1.3,
    "focus": [
     2,
     3
    ],
    "tilt": 55
   },
   "state": "[CH3:1][CH2:2][Cl:3]"
  }
 ],
 "stereoCallout": {
  "title": "Flat cation, two faces",
  "text": "The + carbon is flat, so Cl⁻ could come in over the top face or under the bottom one. Here C2 ends with two H, so both faces give the same chloroethane.",
  "stereoMoment": null
 },
 "whatIf": [
  "17-hcl-ethylene"
 ],
 "quiz": {
  "q": "Why can Cl⁻ bond to the + carbon?",
  "options": [
   {
    "text": "The + carbon has only six electrons and an empty p orbital, so it can take a pair.",
    "correct": true,
    "why": "Yes. Three bonds give six electrons; the empty p orbital is the room a lone pair of Cl⁻ fills."
   },
   {
    "text": "The + carbon has a lone pair that it gives to Cl⁻.",
    "correct": false,
    "why": "The + carbon has no lone pair at all: three bonds and nothing else. The pair comes from Cl⁻."
   },
   {
    "text": "Cl⁻ pulls a bond off the carbon to make room.",
    "correct": false,
    "why": "No bond breaks here. The carbon already has room: its empty p orbital. Cl⁻ simply gives it a pair."
   }
  ]
 },
 "notes": [
  "Added 2026-10-20 (novice review #3): Lesson 08 s15 explains the flat carbocation and its empty p orbital; this short primer shows exactly that, then step 2 of HCl + ethylene. The full HCl scene (17) stays on s13 and s17.",
  "Course level: the cation is explained by electron counting and the empty p orbital; no hyperconjugation. A short primer: 3 beats, 14 s (the 25-50 s rule is for the reagent scenes)."
 ]
}
```

</details>
