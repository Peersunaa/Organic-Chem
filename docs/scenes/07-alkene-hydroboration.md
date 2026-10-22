# 07 · Hydroboration–oxidation of 1-methylcyclohexene

**Scene id** `07-alkene-hydroboration` · **Hub card** `alkene-hydroboration` · **Taught in** no lesson (hub card only) · **Runtime** 39 s, 9 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "BH₃ adds in one step with no carbocation: B goes to the less crowded carbon (the one with more H) and its H to the other, both from the same face. H₂O₂/NaOH then swaps B for OH in exactly the same spot. So OH is anti-Markovnikov, and H and OH are syn; here OH ends trans to the CH₃, as a racemate."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `alkene` | reactant | `[CH3:7][C:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1` | 1-methylcyclohexene | [0, 0] | skeletal |
| `BH3` | reagent | `[H:8][BH2:9]` | BH₃ (from BH₃·THF) | [3.6, -0.4] | full |

Atom names used in captions and tables: 1 = C1, 2 = C2, 7 = CH₃, 8 = H(B), 9 = B, 10 = O(a), 11 = O(b), 12 = H(O).

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | 1-Methylcyclohexene meets BH₃. Boron has only six electrons and an empty p orbital: it wants a pair. | hold the picture | π cloud C1–C2 (both faces, 2 e⁻, focus); empty p orbital B (both faces, focus) | zoom 1, tilt 35°, focus C1/C2/B |
| 2 | `b2-orient` · look | 4–7 (+1 hold) | B lines up over C2, the less crowded carbon (it has an H). The H on B lines up over C1, by the CH₃. | BH3 docks (B over C2; H(B) over C1) | π cloud C1–C2 (top face, 2 e⁻, focus); empty p orbital B (both faces) | zoom 1.2, tilt 65°, focus C1/C2/B, faces shown |
| 3 | `b3-add` · step | 8–13 (+1 hold) | One step: the π pair bonds C2 to B as the B–H pair puts that H on C1. No carbocation ever forms. | **arrows:** (1) π(C1=C2) → new bond C2–B · (2) σ(B–H(B)) → new bond H(B)–C1<br>bonds: C1=C2 → C1–C2, forms C1–H(B), forms C2–B, breaks H(B)–B (dashed TS mid-beat) | new-ring highlight C1–C2–B–H(B) (focus) | zoom 1.2, tilt 65°, focus C1/C2/B, faces shown |
| 4 | `b4-syn` · look | 14–17 (+1 hold) | B and H joined C2 and C1 from the top face at the same moment: syn. The CH₃ is pushed to the bottom. | badges: B “top”, H(B) “top”, CH₃ “bottom” | — | zoom 1.2, tilt 65°, focus C1/C2/B, faces shown |
| 5 | `b5-hoo` · step | 18–22 (+1 hold) | Step 2: NaOH turns H₂O₂ into HOO⁻. Its lone pair fills the empty p orbital on boron. | adds HOO⁻ (H₂O₂ + NaOH)<br>O(a), O(b), H(O) moves to B (above, top face)<br>**arrows:** (1) lone pair on O(a) → B (new O(a)–B bond)<br>bonds: forms B–O(a)<br>charges: B −, O(a) 0 | empty p orbital B (top face, focus); lone-pair lobe O(a) (both faces, 2 e⁻, pointing at B, focus) | zoom 1.2, tilt 65°, focus C1/C2/B, faces shown |
| 6 | `b6-shift` · step | 23–27 (+1 hold) | C2 slides from B to O with its bond pair, as HO⁻ leaves. It stays on the top face: retention. | **arrows:** (1) σ(C2–B) → new bond C2–O(a) · (2) σ(O(a)–O(b)) → onto O(b)<br>bonds: breaks C2–B, forms C2–O(a), breaks O(a)–O(b)<br>charges: B 0, O(b) − | — | zoom 1.2, tilt 65°, focus C1/C2/B, faces shown |
| 7 | `b7-swap` · step | 28–31 (+1 hold) | Base then cuts the O–B bond. OH is left on C2, exactly where B was, still on the top face. | **no curved arrows** (surface: motion trails only)<br>bonds: breaks B–O(a), breaks O(b)–H(O) | — | zoom 1.2, tilt 65°, focus C1/C2/B, faces shown |
| 8 | `b8-product` · look | 32–35 (+1 hold) | trans-2-Methylcyclohexan-1-ol: OH on the carbon that had more H (anti-Markovnikov), trans to CH₃. | relayout to the product drawing | — | zoom 1, tilt 0°, focus C1/C2 |
| 9 | `b9-racemate` · look | 36–39 (+0 hold) | BH₃ can add from the bottom face too, giving the mirror image just as often. The product is a racemate. | ghost: BH₃ from the bottom face | — | zoom 1, tilt 0° |

Beat notes for the implementer:

- `b3-add`: Four-centre transition state: draw C1···H8···B9···C2 dashed at mid-beat (ts: true).
- `b6-shift`: Deeper than the course (the card only says "swap"). Keep it: it is the visual proof of retention. C2 does not move; B and O swap places around it.
- `b7-swap`: Summary beat: fade B9 and HO⁻ out, fade an H in on O10. No arrows.

## Chemistry checks

- Reactant: `CC1=CCCCC1` (1-methylcyclohexene). Reagent: 1) BH₃·THF  2) H₂O₂, NaOH (`B`).
- Intermediate: `CC1CCCCC1B`, alkylborane (one B–C shown; BH₃ really adds to three alkenes).
- Intermediate: `CC1CCCCC1[BH2-]OO`, borate after HOO⁻ adds.
- Intermediate: `CC1CCCCC1OB`, alkoxyborane after the shift.
- Product: `C[C@@H]1CCCC[C@H]1O`, trans-2-methylcyclohexan-1-ol. RDKit: chiral, CIP R, R drawn; forms as a racemate (the mirror image equally). Racemate; this SMILES is one mirror image (hub card).
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.
- Implementer must verify with RDKit:
  - Confirm with RDKit that C[C@@H]1CCCC[C@H]1O is the trans (1R,2R)/(1S,2S) isomer; the generator confirmed it by CIP and 3D embedding. Re-check after any edit.

## Stereo callout

**Syn, and the swap keeps the face**

H and B add to one face (syn). The B → OH swap keeps the face (retention). So H (on C1) and OH (on C2) are cis to each other, which puts OH trans to the CH₃ that was already on C1. Both faces react equally: racemic trans-2-methylcyclohexan-1-ol, (1R,2R) and (1S,2S).

## What-if links

[02-alkene-hydration](02-alkene-hydration.md), [04-alkene-h2-pd](04-alkene-h2-pd.md), [01-alkene-hx](01-alkene-hx.md)

## End quiz

**1-Methylcyclohexene is treated with BH₃·THF, then H₂O₂ and NaOH. Where is the OH, relative to the CH₃?**

A. On C2, trans to the CH₃. **(correct)**  
   Why: Yes. B (then OH) on the less crowded C2; H and OH on one face, so the CH₃ is on the other.
B. On C1, on the same carbon as the CH₃.   
   Diagnosis: That is Markovnikov (H₂O/H₂SO₄). Hydroboration puts B, and so OH, on the less crowded carbon.
C. On C2, cis to the CH₃.   
   Diagnosis: H and OH came from the same face, so the CH₃ on C1 was pushed to the other face: OH and CH₃ are trans.

## Notes

- No lesson teaches this card (lesson: null). Beats 5–7 go one level deeper than the card ("swap B for OH, geometry kept") so the retention is visible; captions stay simple.
- Course simplification kept: BH₃ is shown adding once. In reality one BH₃ adds to three alkenes; say so only in an implementer tooltip if needed.
- Regiochemistry is explained by crowding (the card's reason). A partial + on C1 in the transition state also helps; not shown.

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "07-alkene-hydroboration",
 "title": "Hydroboration–oxidation of 1-methylcyclohexene",
 "reagentCard": "alkene-hydroboration",
 "alsoCards": [],
 "lesson": null,
 "intent": "After this scene the learner can say: \"BH₃ adds in one step with no carbocation: B goes to the less crowded carbon (the one with more H) and its H to the other, both from the same face. H₂O₂/NaOH then swaps B for OH in exactly the same spot. So OH is anti-Markovnikov, and H and OH are syn; here OH ends trans to the CH₃, as a racemate.\"",
 "reactant": {
  "smiles": "CC1=CCCCC1",
  "name": "1-methylcyclohexene"
 },
 "reagent": {
  "smiles": "B",
  "label": "1) BH₃·THF  2) H₂O₂, NaOH"
 },
 "products": [
  {
   "smiles": "C[C@@H]1CCCC[C@H]1O",
   "name": "trans-2-methylcyclohexan-1-ol",
   "stereo": "racemate",
   "note": "Racemate; this SMILES is one mirror image (hub card)."
  }
 ],
 "intermediates": [
  {
   "name": "alkylborane (one B–C shown; BH₃ really adds to three alkenes)",
   "smiles": "CC1CCCCC1B"
  },
  {
   "name": "borate after HOO⁻ adds",
   "smiles": "CC1CCCCC1[BH2-]OO"
  },
  {
   "name": "alkoxyborane after the shift",
   "smiles": "CC1CCCCC1OB"
  }
 ],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "7": "CH₃",
  "8": "H(B)",
  "9": "B",
  "10": "O(a)",
  "11": "O(b)",
  "12": "H(O)"
 },
 "stage": {
  "species": [
   {
    "key": "alkene",
    "role": "reactant",
    "smiles": "[CH3:7][C:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1",
    "label": "1-methylcyclohexene",
    "at": [0, 0],
    "style": "skeletal"
   },
   {
    "key": "BH3",
    "role": "reagent",
    "smiles": "[H:8][BH2:9]",
    "label": "BH₃ (from BH₃·THF)",
    "at": [3.6, -0.4],
    "style": "full"
   }
  ],
  "state": "[CH3:7][C:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1.[H:8][BH2:9]"
 },
 "layers": ["arrows", "orbitals"],
 "duration": 39.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0.0,
   "t1": 3.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "1-Methylcyclohexene meets BH₃. Boron has only six electrons and an empty p orbital: it wants a pair.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [1, 2],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2
    },
    {
     "kind": "p-empty",
     "atoms": [9],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [1, 2, 9],
    "tilt": 35
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:7][C:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1.[H:8][BH2:9]"
  },
  {
   "id": "b2-orient",
   "t0": 4.0,
   "t1": 7.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "B lines up over C2, the less crowded carbon (it has an H). The H on B lines up over C1, by the CH₃.",
   "moves": [{"species": "BH3", "pairs": [[9, 2], [8, 1]], "gap": [0, 0, 1.3], "at": [0, 0.7]}],
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [1, 2],
     "side": "top",
     "emphasis": "focus",
     "electrons": 2
    },
    {
     "kind": "p-empty",
     "atoms": [9],
     "side": "both",
     "emphasis": "normal",
     "electrons": 0
    }
   ],
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
   "state": "[CH3:7][C:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1.[H:8][BH2:9]"
  },
  {
   "id": "b3-add",
   "t0": 8.0,
   "t1": 13.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "One step: the π pair bonds C2 to B as the B–H pair puts that H on C1. No carbocation ever forms.",
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [1, 2]
     },
     "to": {
      "bond": [2, 9]
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
     "at": [0.05, 0.75],
     "why": "The π pair fills boron's empty p orbital and becomes the new C2–B bond."
    },
    {
     "id": "a2",
     "from": {
      "bond": [9, 8]
     },
     "to": {
      "bond": [8, 1]
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
     "at": [0.25, 0.95],
     "why": "At the same time the B–H pair moves that H to C1: a new C1–H bond, on the same face."
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
     "b": 8,
     "action": "form",
     "order": 1,
     "partial": true
    },
    {
     "a": 2,
     "b": 9,
     "action": "form",
     "order": 1,
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
   "orbitals": [{"kind": "ring", "atoms": [1, 2, 9, 8], "side": "top", "emphasis": "focus"}],
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
   "state": "[CH3:7][C:1]1([H:8])[CH:2]([BH2:9])[CH2:3][CH2:4][CH2:5][CH2:6]1",
   "notes": "Four-centre transition state: draw C1···H8···B9···C2 dashed at mid-beat (ts: true)."
  },
  {
   "id": "b4-syn",
   "t0": 14.0,
   "t1": 17.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "B and H joined C2 and C1 from the top face at the same moment: syn. The CH₃ is pushed to the bottom.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [
    {
     "atom": 9,
     "text": "top",
     "tone": "muted"
    },
    {
     "atom": 8,
     "text": "top",
     "tone": "muted"
    },
    {
     "atom": 7,
     "text": "bottom",
     "tone": "muted"
    }
   ],
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
   "state": "[CH3:7][C:1]1([H:8])[CH:2]([BH2:9])[CH2:3][CH2:4][CH2:5][CH2:6]1",
   "pose": {
    "8": 1,
    "9": 1,
    "7": -1
   }
  },
  {
   "id": "b5-hoo",
   "t0": 18.0,
   "t1": 22.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Step 2: NaOH turns H₂O₂ into HOO⁻. Its lone pair fills the empty p orbital on boron.",
   "adds": [
    {
     "key": "HOO",
     "role": "reagent",
     "smiles": "[H:12][O:11][O-:10]",
     "label": "HOO⁻ (H₂O₂ + NaOH)",
     "at": "auto",
     "style": "full"
    }
   ],
   "moves": [{"atoms": [10, 11, 12], "anchor": 10, "near": 9, "offset": [0, 0, 1.2], "at": [0, 0.4]}],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 10
     },
     "to": {
      "atom": 9
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
     "why": "A lone pair on the O⁻ of HOO⁻ fills boron's empty orbital, making a B–O bond."
    }
   ],
   "bonds": [{"a": 9, "b": 10, "action": "form", "order": 1}],
   "charges": [{"atom": 9, "charge": -1}, {"atom": 10, "charge": 0}],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [9],
     "side": "top",
     "emphasis": "focus",
     "electrons": 0
    },
    {
     "kind": "lone-pair",
     "atoms": [10],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "toward": 9
    }
   ],
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
   "state": "[CH3:7][C:1]1([H:8])[CH:2]([BH2-:9][O:10][O:11][H:12])[CH2:3][CH2:4][CH2:5][CH2:6]1"
  },
  {
   "id": "b6-shift",
   "t0": 23.0,
   "t1": 27.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "C2 slides from B to O with its bond pair, as HO⁻ leaves. It stays on the top face: retention.",
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [2, 9]
     },
     "to": {
      "bond": [2, 10]
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
     "at": [0.1, 0.8],
     "why": "The C2–B bond pair moves over to O: C2 is now bonded to O, on the same face it was on."
    },
    {
     "id": "a2",
     "from": {
      "bond": [10, 11]
     },
     "to": {
      "atom": 11
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
     "at": [0.25, 0.95],
     "why": "The weak O–O bond breaks and HO⁻ leaves with the pair."
    }
   ],
   "bonds": [
    {
     "a": 2,
     "b": 9,
     "action": "break",
     "order": 0
    },
    {
     "a": 2,
     "b": 10,
     "action": "form",
     "order": 1
    },
    {
     "a": 10,
     "b": 11,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [{"atom": 9, "charge": 0}, {"atom": 11, "charge": -1}],
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
   "state": "[CH3:7][C:1]1([H:8])[CH:2]([O:10][BH2:9])[CH2:3][CH2:4][CH2:5][CH2:6]1.[H:12][O-:11]",
   "notes": "Deeper than the course (the card only says \"swap\"). Keep it: it is the visual proof of retention. C2 does not move; B and O swap places around it."
  },
  {
   "id": "b7-swap",
   "t0": 28.0,
   "t1": 31.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Base then cuts the O–B bond. OH is left on C2, exactly where B was, still on the top face.",
   "arrows": [],
   "bonds": [
    {
     "a": 9,
     "b": 10,
     "action": "break",
     "order": 0
    },
    {
     "a": 11,
     "b": 12,
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
   "state": "[CH3:7][C:1]1([H:8])[CH:2]([OH:10])[CH2:3][CH2:4][CH2:5][CH2:6]1",
   "notes": "Summary beat: fade B9 and HO⁻ out, fade an H in on O10. No arrows."
  },
  {
   "id": "b8-product",
   "t0": 32.0,
   "t1": 35.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "trans-2-Methylcyclohexan-1-ol: OH on the carbon that had more H (anti-Markovnikov), trans to CH₃.",
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
   "state": "[CH3:7][C:1]1([H:8])[CH:2]([OH:10])[CH2:3][CH2:4][CH2:5][CH2:6]1",
   "relayout": {
    "anchor": [1, 2]
   },
   "pose": {
    "10": 1,
    "7": -1
   }
  },
  {
   "id": "b9-racemate",
   "t0": 36.0,
   "t1": 39.0,
   "hold": 0,
   "kind": "look",
   "caption": "BH₃ can add from the bottom face too, giving the mirror image just as often. The product is a racemate.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [{"mirror": true, "label": "BH₃ from the bottom face"}],
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
   "state": "[CH3:7][C:1]1([H:8])[CH:2]([OH:10])[CH2:3][CH2:4][CH2:5][CH2:6]1"
  }
 ],
 "stereoCallout": {
  "title": "Syn, and the swap keeps the face",
  "stereoMoment": null,
  "text": "H and B add to one face (syn). The B → OH swap keeps the face (retention). So H (on C1) and OH (on C2) are cis to each other, which puts OH trans to the CH₃ that was already on C1. Both faces react equally: racemic trans-2-methylcyclohexan-1-ol, (1R,2R) and (1S,2S)."
 },
 "whatIf": ["02-alkene-hydration", "04-alkene-h2-pd", "01-alkene-hx"],
 "quiz": {
  "q": "1-Methylcyclohexene is treated with BH₃·THF, then H₂O₂ and NaOH. Where is the OH, relative to the CH₃?",
  "options": [
   {
    "text": "On C2, trans to the CH₃.",
    "correct": true,
    "why": "Yes. B (then OH) on the less crowded C2; H and OH on one face, so the CH₃ is on the other."
   },
   {
    "text": "On C1, on the same carbon as the CH₃.",
    "correct": false,
    "why": "That is Markovnikov (H₂O/H₂SO₄). Hydroboration puts B, and so OH, on the less crowded carbon."
   },
   {
    "text": "On C2, cis to the CH₃.",
    "correct": false,
    "why": "H and OH came from the same face, so the CH₃ on C1 was pushed to the other face: OH and CH₃ are trans."
   }
  ]
 },
 "notes": ["No lesson teaches this card (lesson: null). Beats 5–7 go one level deeper than the card (\"swap B for OH, geometry kept\") so the retention is visible; captions stay simple.", "Course simplification kept: BH₃ is shown adding once. In reality one BH₃ adds to three alkenes; say so only in an implementer tooltip if needed.", "Regiochemistry is explained by crowding (the card's reason). A partial + on C1 in the transition state also helps; not shown."]
}
```

</details>
