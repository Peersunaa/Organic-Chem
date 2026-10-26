# 12 · Bromination of benzene: Br₂ with FeBr₃

**Scene id** `12-eas-bromination` · **Hub card** `eas-bromination` · **Taught in** Lesson 13 s06 · **Runtime** 39 s, 9 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "FeBr₃ pulls on Br₂ and makes an electrophilic Br⁺. Two of the ring's π electrons bond to it, which leaves a + shared over three ring carbons (the sigma complex, three resonance forms). A base removes the H⁺ from the sp³ carbon, the pair drops back into the ring, and the aromatic ring is restored. Substitution, not addition."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `benzene` | reactant | `[C:1]1([H:7])=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1` | benzene | [0, 0] | skeletal |
| `Br2` | reagent | `[Br:8][Br:9]` | Br₂ | [3.2, -1.4] | full |
| `FeBr3` | catalyst | `[Br:10][Fe:11]([Br:12])[Br:13]` | FeBr₃ | [5.0, -1.2] | full |

Layout note for `benzene`: Draw as a Kekulé hexagon (the arrows need real C=C bonds); show only H7 on C1.

Atom names used in captions and tables: 1 = C1, 2 = C2, 3 = C3, 4 = C4, 5 = C5, 6 = C6, 7 = H, 8 = Br(E), 9 = Br(b), 10 = Br, 11 = Fe, 12 = Br, 13 = Br.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | Benzene, Br₂ and FeBr₃. The ring's six π electrons are very stable: Br₂ alone is too weak to react. | hold the picture | aromatic π ring (both faces, 6 e⁻, focus) | zoom 1, tilt 35° |
| 2 | `b2-activate` · step | 4–8 (+1 hold) | FeBr₃ accepts a lone pair from one Br of Br₂. The Br–Br pair moves onto that Br, leaving Br⁺. | Br2 moves to Fe<br>**arrows:** (1) lone pair on Br(b) → Fe (new Br(b)–Fe bond) · (2) σ(Br(E)–Br(b)) → onto Br(b)<br>bonds: breaks Br(E)–Br(b), forms Br(b)–Fe<br>charges: Br(E) +, Fe −<br>badges: Fe “Lewis acid” | — | zoom 1, tilt 0°, focus Br(E)/Br(b)/Fe |
| 3 | `b3-approach` · look | 9–12 (+1 hold) | Br⁺ is now a strong electrophile. It comes down onto the π cloud on the top face of the ring. | Br(E) moves to C1 (above, top face) | aromatic π ring (top face, 6 e⁻, focus) | zoom 1.1, tilt 60°, focus C1/Br(E), faces shown |
| 4 | `b4-attack` · step | 13–17 (+1 hold) | Two π electrons of the ring bond C1 to Br⁺. The ring now carries a + and is no longer aromatic. | **arrows:** (1) π(C1=C2) → new bond C1–Br(E)<br>bonds: C1=C2 → C1–C2, forms C1–Br(E)<br>charges: C2 +, Br(E) 0 | empty p orbital C2 (both faces, focus) | zoom 1.2, tilt 0°, focus C1/C2/C3/C4/C5/C6 |
| 5 | `b5-res1` · resonance | 18–21 (+1 hold) | Push the C3=C4 π pair toward C2: now the + sits on C4. Same ion, drawn a second way. | **arrows:** (1) π(C3=C4) → C3–C2 gains a pair<br>bonds: C2–C3 → C2=C3, C3=C4 → C3–C4<br>charges: C2 0, C4 + | empty p orbital C4 (both faces, focus) | zoom 1.2, tilt 0°, focus C1/C2/C3/C4/C5/C6 |
| 6 | `b6-res2` · resonance | 22–25 (+1 hold) | Push the C5=C6 π pair toward C4: now the + is on C6. Three forms in all: + on C2, C4 or C6. | **arrows:** (1) π(C5=C6) → C5–C4 gains a pair<br>bonds: C4–C5 → C4=C5, C5=C6 → C5–C6<br>charges: C4 0, C6 + | empty p orbital C6 (both faces, focus) | zoom 1.2, tilt 0°, focus C1/C2/C3/C4/C5/C6 |
| 7 | `b7-hybrid` · look | 26–29 (+1 hold) | The real ion is a blend of all three: the + is shared by C2, C4 and C6. This is the sigma complex. | badges: C2 “δ+”, C4 “δ+”, C6 “δ+”<br>resonance row: 3 forms | π cloud C2–C3–C4–C5–C6 (both faces, 4 e⁻, focus) | zoom 1.2, tilt 0°, focus C1/C2/C3/C4/C5/C6 |
| 8 | `b8-deprot` · step | 30–35 (+1 hold) | FeBr₄⁻ takes the H⁺ from C1. The C–H pair drops back into the ring: it is aromatic again. | Br(b), Br, Fe, Br, Br moves to H (below, bottom face)<br>**arrows:** (1) lone pair on Br(b) → H (new Br(b)–H bond) · (2) σ(C1–H) → C1–C6 gains a pair · (3) σ(Fe–Br(b)) → onto Br(b)<br>bonds: C1–C6 → C1=C6, breaks C1–H, forms H–Br(b), breaks Br(b)–Fe<br>charges: C6 0, Fe 0 | aromatic π ring (both faces, 6 e⁻, focus) | zoom 1.2, tilt 0°, focus C1/C2/C3/C4/C5/C6 |
| 9 | `b9-product` · look | 36–39 (+0 hold) | Bromobenzene and HBr. FeBr₃ comes back unchanged: a catalyst. One ring H was swapped for Br. | relayout to the product drawing | — | zoom 1, tilt 0° |

Beat notes for the implementer:

- `b2-activate`: Course drawing: Br⁺ and FeBr₄⁻ as separate species. Keep Br8 within 1.4 bond lengths of Br9 with a faint dotted contact: in reality Br⁺ is never free.
- `b4-attack`: C1 becomes sp³: draw Br8 wedge (up) and H7 dash (down) on C1 from here on.
- `b5-res1`: Resonance beat: draw a ↔ between the old and new frame (mini-card of the previous form slides left). Atoms never move.

## Chemistry checks

- Reactant: `c1ccccc1` (benzene). Reagent: Br₂, FeBr₃ (`BrBr`).
- Intermediate: `[Br+].Br[Fe-](Br)(Br)Br`, Br⁺ + FeBr₄⁻ (course drawing of the activated complex).
- Intermediate: `BrC1C=CC=C[CH+]1`, sigma complex, + on C2 / C4 / C6.
- Product: `Brc1ccccc1`, bromobenzene. RDKit: no stereocentre.
- Product: `Br`, HBr. RDKit: no stereocentre.
- Product: `Br[Fe](Br)Br`, FeBr₃ (catalyst, returned). RDKit: no stereocentre.
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.

## Stereo callout

**Why substitution, not addition**

No stereochemistry: the product ring is flat. The "shape" point is energy: if Br⁻ added to the sigma complex, the product would lose the aromatic ring for good. Losing H⁺ instead gives the aromatic ring back, which is far more stable. Ghost option for the implementer: show the addition product greyed out with a red "aromaticity lost" tag.

## What-if links

[13-eas-nitration](13-eas-nitration.md), [14-fc-acylation](14-fc-acylation.md), [15-directors](15-directors.md), [03-alkene-x2](03-alkene-x2.md)

## End quiz

**The sigma complex in benzene bromination loses H⁺ instead of adding Br⁻. Why?**

A. Losing H⁺ makes the ring aromatic again; adding Br⁻ would destroy the aromatic ring. **(correct)**  
   Why: Yes. Aromaticity is the prize; substitution keeps it.
B. Br⁻ is too weak to bond to a carbocation.   
   Diagnosis: Br⁻ bonds to cations happily (alkene + HBr). Here the deciding factor is getting the aromatic ring back.
C. The sigma complex has no + charge left to attract Br⁻.   
   Diagnosis: It does: the + is shared by C2, C4 and C6. It is removed by losing H⁺, not by adding Br⁻.

## Notes

- Arrows follow the course data exactly (reactions-aromatic.js, drawnActivation): activation 2 arrows, attack 1, deprotonation 3.
- Resonance beats b5–b6 move electrons only: no atom moves, positions are frozen (kind: resonance).

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "12-eas-bromination",
 "title": "Bromination of benzene: Br₂ with FeBr₃",
 "reagentCard": "eas-bromination",
 "alsoCards": [],
 "lesson": {
  "id": "13",
  "step": "s06"
 },
 "intent": "After this scene the learner can say: \"FeBr₃ pulls on Br₂ and makes an electrophilic Br⁺. Two of the ring's π electrons bond to it, which leaves a + shared over three ring carbons (the sigma complex, three resonance forms). A base removes the H⁺ from the sp³ carbon, the pair drops back into the ring, and the aromatic ring is restored. Substitution, not addition.\"",
 "reactant": {
  "smiles": "c1ccccc1",
  "name": "benzene"
 },
 "reagent": {
  "smiles": "BrBr",
  "label": "Br₂, FeBr₃"
 },
 "products": [
  {
   "smiles": "Brc1ccccc1",
   "name": "bromobenzene",
   "stereo": "achiral"
  },
  {
   "smiles": "Br",
   "name": "HBr",
   "stereo": "achiral"
  },
  {
   "smiles": "Br[Fe](Br)Br",
   "name": "FeBr₃ (catalyst, returned)",
   "stereo": "achiral"
  }
 ],
 "intermediates": [
  {
   "name": "Br⁺ + FeBr₄⁻ (course drawing of the activated complex)",
   "smiles": "[Br+].Br[Fe-](Br)(Br)Br"
  },
  {
   "name": "sigma complex, + on C2 / C4 / C6",
   "smiles": "BrC1C=CC=C[CH+]1"
  }
 ],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "3": "C3",
  "4": "C4",
  "5": "C5",
  "6": "C6",
  "7": "H",
  "8": "Br(E)",
  "9": "Br(b)",
  "10": "Br",
  "11": "Fe",
  "12": "Br",
  "13": "Br"
 },
 "stage": {
  "species": [
   {
    "key": "benzene",
    "role": "reactant",
    "smiles": "[C:1]1([H:7])=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1",
    "label": "benzene",
    "at": [0, 0],
    "style": "skeletal",
    "notes": "Draw as a Kekulé hexagon (the arrows need real C=C bonds); show only H7 on C1."
   },
   {
    "key": "Br2",
    "role": "reagent",
    "smiles": "[Br:8][Br:9]",
    "label": "Br₂",
    "at": [3.2, -1.4],
    "style": "full"
   },
   {
    "key": "FeBr3",
    "role": "catalyst",
    "smiles": "[Br:10][Fe:11]([Br:12])[Br:13]",
    "label": "FeBr₃",
    "at": [5.0, -1.2],
    "style": "full"
   }
  ],
  "state": "[C:1]1([H:7])=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Br:8][Br:9].[Br:10][Fe:11]([Br:12])[Br:13]"
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
   "caption": "Benzene, Br₂ and FeBr₃. The ring's six π electrons are very stable: Br₂ alone is too weak to react.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "aromatic",
     "atoms": [1, 2, 3, 4, 5, 6],
     "side": "both",
     "emphasis": "focus",
     "electrons": 6
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [],
    "tilt": 35
   },
   "faces": {
    "show": false
   },
   "state": "[C:1]1([H:7])=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Br:8][Br:9].[Br:10][Fe:11]([Br:12])[Br:13]"
  },
  {
   "id": "b2-activate",
   "t0": 4.0,
   "t1": 8.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "FeBr₃ accepts a lone pair from one Br of Br₂. The Br–Br pair moves onto that Br, leaving Br⁺.",
   "moves": [{"species": "Br2", "anchor": 9, "near": 11, "offset": [-1.2, 0, 0], "at": [0, 0.3]}],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 9
     },
     "to": {
      "atom": 11
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
     "at": [0.25, 0.7],
     "why": "A lone pair on a Br of Br₂ donates to the empty orbital on Fe, forming a new Fe–Br bond (a Lewis acid at work)."
    },
    {
     "id": "a2",
     "from": {
      "bond": [8, 9]
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
     "at": [0.4, 0.95],
     "why": "The Br–Br bond pair moves onto the Br bonded to Fe, so the other Br leaves as Br⁺: the electrophile."
    }
   ],
   "bonds": [{"a": 8, "b": 9, "action": "break", "order": 0}, {"a": 9, "b": 11, "action": "form", "order": 1}],
   "charges": [{"atom": 8, "charge": 1}, {"atom": 11, "charge": -1}],
   "partials": [],
   "orbitals": [],
   "badges": [{"atom": 11, "text": "Lewis acid", "tone": "muted"}],
   "ghosts": [],
   "camera": {
    "zoom": 1,
    "focus": [8, 9, 11],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[C:1]1([H:7])=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Br+:8].[Br:9][Fe-:11]([Br:10])([Br:12])[Br:13]",
   "notes": "Course drawing: Br⁺ and FeBr₄⁻ as separate species. Keep Br8 within 1.4 bond lengths of Br9 with a faint dotted contact: in reality Br⁺ is never free."
  },
  {
   "id": "b3-approach",
   "t0": 9.0,
   "t1": 12.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Br⁺ is now a strong electrophile. It comes down onto the π cloud on the top face of the ring.",
   "moves": [{"atoms": [8], "anchor": 8, "near": 1, "offset": [0, 0, 1.5], "at": [0, 0.8]}],
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "aromatic",
     "atoms": [1, 2, 3, 4, 5, 6],
     "side": "top",
     "emphasis": "focus",
     "electrons": 6
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 8],
    "tilt": 60
   },
   "faces": {
    "show": true,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[C:1]1([H:7])=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Br+:8].[Br:9][Fe-:11]([Br:10])([Br:12])[Br:13]"
  },
  {
   "id": "b4-attack",
   "t0": 13.0,
   "t1": 17.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Two π electrons of the ring bond C1 to Br⁺. The ring now carries a + and is no longer aromatic.",
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [1, 2]
     },
     "to": {
      "bond": [1, 8]
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
     "why": "A π pair of the ring attacks the electrophile Br⁺ and forms a new C–Br bond. The ring now carries a + charge."
    }
   ],
   "bonds": [{"a": 1, "b": 2, "action": "order", "order": 1}, {"a": 1, "b": 8, "action": "form", "order": 1}],
   "charges": [{"atom": 2, "charge": 1}, {"atom": 8, "charge": 0}],
   "partials": [],
   "orbitals": [{"kind": "p-empty", "atoms": [2], "side": "both", "emphasis": "focus", "electrons": 0}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [1, 2, 3, 4, 5, 6],
    "tilt": 0
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[C:1]1([H:7])([Br:8])[CH+:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Br:9][Fe-:11]([Br:10])([Br:12])[Br:13]",
   "pose": {
    "8": 1,
    "7": -1
   },
   "notes": "C1 becomes sp³: draw Br8 wedge (up) and H7 dash (down) on C1 from here on."
  },
  {
   "id": "b5-res1",
   "t0": 18.0,
   "t1": 21.0,
   "hold": 1.0,
   "kind": "resonance",
   "caption": "Push the C3=C4 π pair toward C2: now the + sits on C4. Same ion, drawn a second way.",
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [3, 4]
     },
     "to": {
      "bond": [3, 2]
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
     "why": "The C3=C4 π pair shifts to C2–C3. The + moves from C2 to C4."
    }
   ],
   "bonds": [{"a": 2, "b": 3, "action": "order", "order": 2}, {"a": 3, "b": 4, "action": "order", "order": 1}],
   "charges": [{"atom": 2, "charge": 0}, {"atom": 4, "charge": 1}],
   "partials": [],
   "orbitals": [{"kind": "p-empty", "atoms": [4], "side": "both", "emphasis": "focus", "electrons": 0}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [1, 2, 3, 4, 5, 6],
    "tilt": 0
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[C:1]1([H:7])([Br:8])[CH:2]=[CH:3][CH+:4][CH:5]=[CH:6]1.[Br:9][Fe-:11]([Br:10])([Br:12])[Br:13]",
   "notes": "Resonance beat: draw a ↔ between the old and new frame (mini-card of the previous form slides left). Atoms never move."
  },
  {
   "id": "b6-res2",
   "t0": 22.0,
   "t1": 25.0,
   "hold": 1.0,
   "kind": "resonance",
   "caption": "Push the C5=C6 π pair toward C4: now the + is on C6. Three forms in all: + on C2, C4 or C6.",
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [5, 6]
     },
     "to": {
      "bond": [5, 4]
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
     "why": "The C5=C6 π pair shifts to C4–C5. The + moves from C4 to C6."
    }
   ],
   "bonds": [{"a": 4, "b": 5, "action": "order", "order": 2}, {"a": 5, "b": 6, "action": "order", "order": 1}],
   "charges": [{"atom": 4, "charge": 0}, {"atom": 6, "charge": 1}],
   "partials": [],
   "orbitals": [{"kind": "p-empty", "atoms": [6], "side": "both", "emphasis": "focus", "electrons": 0}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [1, 2, 3, 4, 5, 6],
    "tilt": 0
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[C:1]1([H:7])([Br:8])[CH:2]=[CH:3][CH:4]=[CH:5][CH+:6]1.[Br:9][Fe-:11]([Br:10])([Br:12])[Br:13]"
  },
  {
   "id": "b7-hybrid",
   "t0": 26.0,
   "t1": 29.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "The real ion is a blend of all three: the + is shared by C2, C4 and C6. This is the sigma complex.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "pi",
     "atoms": [2, 3, 4, 5, 6],
     "side": "both",
     "emphasis": "focus",
     "electrons": 4,
     "label": "4 π electrons over 5 carbons"
    }
   ],
   "badges": [
    {
     "atom": 2,
     "text": "δ+",
     "tone": "elec"
    },
    {
     "atom": 4,
     "text": "δ+",
     "tone": "elec"
    },
    {
     "atom": 6,
     "text": "δ+",
     "tone": "elec"
    }
   ],
   "ghosts": [],
   "forms": ["[C:1]1([H:7])([Br:8])[CH+:2][CH:3]=[CH:4][CH:5]=[CH:6]1", "[C:1]1([H:7])([Br:8])[CH:2]=[CH:3][CH+:4][CH:5]=[CH:6]1", "[C:1]1([H:7])([Br:8])[CH:2]=[CH:3][CH:4]=[CH:5][CH+:6]1"],
   "camera": {
    "zoom": 1.2,
    "focus": [1, 2, 3, 4, 5, 6],
    "tilt": 0
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[C:1]1([H:7])([Br:8])[CH:2]=[CH:3][CH:4]=[CH:5][CH+:6]1.[Br:9][Fe-:11]([Br:10])([Br:12])[Br:13]"
  },
  {
   "id": "b8-deprot",
   "t0": 30.0,
   "t1": 35.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "FeBr₄⁻ takes the H⁺ from C1. The C–H pair drops back into the ring: it is aromatic again.",
   "moves": [{"atoms": [9, 10, 11, 12, 13], "anchor": 9, "near": 7, "offset": [0, 1.1, -0.6], "at": [0, 0.3]}],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 9
     },
     "to": {
      "atom": 7
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
     "at": [0.25, 0.7],
     "why": "A lone pair on a Br of FeBr₄⁻ takes the H⁺ from the sp³ carbon and forms a new H–Br bond."
    },
    {
     "id": "a2",
     "from": {
      "bond": [1, 7]
     },
     "to": {
      "bond": [1, 6]
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
     "at": [0.35, 0.8],
     "why": "The C–H bond pair slides into the ring and makes a new C=C π bond. The ring is aromatic again and the + is gone."
    },
    {
     "id": "a3",
     "from": {
      "bond": [11, 9]
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
     "at": [0.45, 0.95],
     "why": "The Fe–Br bond pair goes back onto Br. That frees FeBr₃ (the catalyst returns) and H–Br leaves."
    }
   ],
   "bonds": [
    {
     "a": 1,
     "b": 6,
     "action": "order",
     "order": 2
    },
    {
     "a": 1,
     "b": 7,
     "action": "break",
     "order": 0
    },
    {
     "a": 7,
     "b": 9,
     "action": "form",
     "order": 1
    },
    {
     "a": 9,
     "b": 11,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [{"atom": 6, "charge": 0}, {"atom": 11, "charge": 0}],
   "partials": [],
   "orbitals": [
    {
     "kind": "aromatic",
     "atoms": [1, 2, 3, 4, 5, 6],
     "side": "both",
     "emphasis": "focus",
     "electrons": 6
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.2,
    "focus": [1, 2, 3, 4, 5, 6],
    "tilt": 0
   },
   "faces": {
    "show": false,
    "labels": {
     "top": "top face",
     "bottom": "bottom face"
    }
   },
   "state": "[Br:8][C:1]1=[CH:6][CH:5]=[CH:4][CH:3]=[CH:2]1.[H:7][Br:9].[Br:10][Fe:11]([Br:12])[Br:13]"
  },
  {
   "id": "b9-product",
   "t0": 36.0,
   "t1": 39.0,
   "hold": 0,
   "kind": "look",
   "caption": "Bromobenzene and HBr. FeBr₃ comes back unchanged: a catalyst. One ring H was swapped for Br.",
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
   "state": "[Br:8][C:1]1=[CH:6][CH:5]=[CH:4][CH:3]=[CH:2]1.[H:7][Br:9].[Br:10][Fe:11]([Br:12])[Br:13]",
   "relayout": {
    "anchor": [1, 4]
   }
  }
 ],
 "stereoCallout": {
  "title": "Why substitution, not addition",
  "stereoMoment": null,
  "text": "No stereochemistry: the product ring is flat. The \"shape\" point is energy: if Br⁻ added to the sigma complex, the product would lose the aromatic ring for good. Losing H⁺ instead gives the aromatic ring back, which is far more stable. Ghost option for the implementer: show the addition product greyed out with a red \"aromaticity lost\" tag."
 },
 "whatIf": ["13-eas-nitration", "14-fc-acylation", "15-directors", "03-alkene-x2"],
 "quiz": {
  "q": "The sigma complex in benzene bromination loses H⁺ instead of adding Br⁻. Why?",
  "options": [
   {
    "text": "Losing H⁺ makes the ring aromatic again; adding Br⁻ would destroy the aromatic ring.",
    "correct": true,
    "why": "Yes. Aromaticity is the prize; substitution keeps it."
   },
   {
    "text": "Br⁻ is too weak to bond to a carbocation.",
    "correct": false,
    "why": "Br⁻ bonds to cations happily (alkene + HBr). Here the deciding factor is getting the aromatic ring back."
   },
   {
    "text": "The sigma complex has no + charge left to attract Br⁻.",
    "correct": false,
    "why": "It does: the + is shared by C2, C4 and C6. It is removed by losing H⁺, not by adding Br⁻."
   }
  ]
 },
 "notes": ["Arrows follow the course data exactly (reactions-aromatic.js, drawnActivation): activation 2 arrows, attack 1, deprotonation 3.", "Resonance beats b5–b6 move electrons only: no atom moves, positions are frozen (kind: resonance)."]
}
```

</details>
