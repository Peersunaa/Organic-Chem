# 15 · Directors: why –OCH₃ sends E⁺ ortho/para and –NO₂ sends it meta

**Scene id** `15-directors` · **Hub card** `director-activating` (also `director-meta`, `director-halogen`) · **Taught in** Lesson 14 s04 · **Runtime** 49 s, 11 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "Draw the sigma complex for each position. Ortho or para attack puts the + on the ring carbon that holds the group. If that group has a lone pair (–OCH₃), it shares the + and gives an extra form with every atom at an octet, so ortho/para win and the ring is faster. If that group starts with a δ+ or + atom (–NO₂), a + next to it is very bad, so meta, which never puts + there, wins."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `anisole` | reactant | `[CH3:8][O:7][C:1]1=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1` | anisole | [0, 0] | skeletal |
| `E` | reagent | `[Br+:9]` | E⁺ = Br⁺ | [3.6, -1.0] | full |

Atom names used in captions and tables: 1 = C1, 2 = C2, 3 = C3, 4 = C4, 5 = C5, 6 = C6, 7 = O, 8 = CH₃, 9 = Br, 10 = N, 11 = O⁻, 12 = O.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-anisole` · look | 0–3 (+1 hold) | Anisole has –OCH₃ on the ring. Its O sits right on the ring with two lone pairs. Where will Br⁺ go? | badges: C2 “o”, C6 “o”, C3 “m”, C5 “m”, C4 “p” | aromatic π ring (both faces, 6 e⁻); lone-pair lobe O (both faces, 2 e⁻, focus) | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6/O |
| 2 | `b2-para` · step | 4–8 (+1 hold) | Para attack: Br⁺ bonds to C4, across the ring from the O. The + appears next door, on C3. | Br moves to C4 (above, top face)<br>**arrows:** (1) π(C3=C4) → new bond C4–Br<br>bonds: C3=C4 → C3–C4, forms C4–Br<br>charges: C3 +, Br 0 | empty p orbital C3 (both faces, focus) | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6/O |
| 3 | `b3-push` · resonance | 9–12 (+1 hold) | Push the C1=C2 π pair over: the + moves to C1, the very carbon that holds the O. | **arrows:** (1) π(C1=C2) → C2–C3 gains a pair<br>bonds: C1=C2 → C1–C2, C2–C3 → C2=C3<br>charges: C1 +, C3 0 | empty p orbital C1 (both faces, focus); lone-pair lobe O (both faces, 2 e⁻, pointing at C1) | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6/O |
| 4 | `b4-oxonium` · resonance | 13–17 (+1 hold) | O gives a lone pair to C1, making C=O⁺. Here every atom has an octet: an extra, very good form. | **arrows:** (1) lone pair on O → O–C1 gains a pair<br>bonds: C1–O → C1=O<br>charges: C1 0, O +<br>badges: O “octet everywhere” | π cloud C1–O (both faces, 2 e⁻, focus) | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6/O |
| 5 | `b5-para-sum` · look | 18–21 (+1 hold) | Para attack has four forms, one with + on O. More sharing, lower energy, faster reaction. | resonance row: 4 forms | — | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6/O |
| 6 | `b6-ortho` · look | 22–26 (+1 hold) | Ortho attack (at C2) gets the same bonus: one form has + on C1, so O can share it. Ortho wins too. | stage reset to ortho sigma complex<br>resonance row: 4 forms | — | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6/O |
| 7 | `b7-meta` · look | 27–31 (+1 hold) | Meta attack (at C3): the + lands on C2, C4 and C6, never on C1. O cannot help, so meta loses. | stage reset to meta sigma complex<br>badges: C1 “never +”<br>resonance row: 3 forms | — | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6/O |
| 8 | `b8-nitro` · look | 32–35 (+1 hold) | Nitrobenzene: an N⁺ sits on the ring and pulls electrons out. Every attack is slow. Which is least bad? | stage reset to nitrobenzene, E⁺ = Br⁺<br>badges: N “N⁺ pulls e⁻” | aromatic π ring (both faces, 6 e⁻) | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6/O |
| 9 | `b9-nitro-op` · look | 36–40 (+1 hold) | Ortho or para attack: one form puts the + on C1, right next to N⁺. Two + side by side: very bad. | stage reset to ortho sigma complex<br>badges: C1 “+ next to N⁺”<br>resonance row: 3 forms | — | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6/O |
| 10 | `b10-nitro-meta` · look | 41–45 (+1 hold) | Meta attack never puts the + on C1. It avoids that bad form, so nitrobenzene reacts meta (and slowly). | stage reset to meta sigma complex<br>badges: C1 “never +”<br>resonance row: 3 forms | — | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6/O |
| 11 | `b11-rule` · look | 46–49 (+0 hold) | Rule: a lone pair next to the ring sends E⁺ ortho/para. A δ+ or + atom next to the ring sends it meta. | stage reset to para (major), ortho, meta, from nitrobenzene | — | zoom 0.85, tilt 0° |

Beat notes for the implementer:

- `b6-ortho`: Reset beat: cross-fade (250 ms) to the ortho sigma complex; positions of ring atoms stay the same as the anisole drawing.

## Chemistry checks

- Reactant: `COc1ccccc1` (anisole (and nitrobenzene)). Reagent: E⁺ (here Br⁺, from Br₂/FeBr₃) (`[Br+]`).
- Intermediate: `C[O+]=C1C=CC(Br)C=C1`, para sigma complex, oxonium form.
- Intermediate: `COC1=CC(Br)[CH+]C=C1`, meta sigma complex (one form).
- Intermediate: `O=[N+]([O-])[C+]1C=CC=CC1Br`, nitrobenzene ortho sigma complex, bad form.
- Product: `COc1ccc(Br)cc1`, 4-bromoanisole (para, major). RDKit: no stereocentre.
- Product: `COc1ccccc1Br`, 2-bromoanisole (ortho). RDKit: no stereocentre.
- Product: `O=[N+]([O-])c1cccc(Br)c1`, 1-bromo-3-nitrobenzene (meta) from nitrobenzene. RDKit: no stereocentre.
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.

## Stereo callout

**Count the forms, find the + on C1**

No stereochemistry. The test to teach: for each attack position, ask "does a form put + on the carbon that holds the group?" Lone-pair group (–OCH₃, –OH, –NH₂): that form is GOOD (O or N shares the +): ortho/para. δ+/+ group (–NO₂, –C≡N, –C=O, –SO₃H): that form is BAD: meta. Halogens: lone pair → ortho/para, but σ pull → slower (card director-halogen).

## What-if links

[12-eas-bromination](12-eas-bromination.md), [13-eas-nitration](13-eas-nitration.md)

## End quiz

**Phenol (–OH on the ring) is brominated. Where does the Br go?**

A. Ortho and para: in those attacks the O lone pair can share the + on C1. **(correct)**  
   Why: Yes. Same as –OCH₃: a lone pair next to the ring means an extra all-octet form for ortho/para attack.
B. Meta, because O is electronegative and pulls electrons.   
   Diagnosis: O does pull through the σ bond, but its lone pair sharing the + wins for –OH. Lone pair next to the ring: ortho/para.
C. Equally at every position.   
   Diagnosis: Only ortho and para attack put the + on the carbon next to O, where the lone pair can help. Meta gets no help, so it is much slower.

## Notes

- Course level (Lesson 14 s04–s06, LP_WHY / DELTA_WHY in reactions-aromatic.js): count resonance forms and look for the + on the carbon that holds the group. No energy diagrams or σ/π inductive split beyond that.
- Br⁺ is the E⁺ throughout so this links to scene 12. Anisole is so activated that Br₂ reacts even without FeBr₃; not shown.
- The NO₂ group's own resonance is not drawn (Lesson 14 s05 says it is not asked for).

**Card vs storyboard:** Brief uses anisole; the hub director-activating example is toluene + HNO₃/H₂SO₄ (alkyl activator, no lone pair). The nitrobenzene half matches director-meta (nitrobenzene + Br₂/FeBr₃).

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "15-directors",
 "title": "Directors: why –OCH₃ sends E⁺ ortho/para and –NO₂ sends it meta",
 "reagentCard": "director-activating",
 "alsoCards": ["director-meta", "director-halogen"],
 "lesson": {
  "id": "14",
  "step": "s04"
 },
 "intent": "After this scene the learner can say: \"Draw the sigma complex for each position. Ortho or para attack puts the + on the ring carbon that holds the group. If that group has a lone pair (–OCH₃), it shares the + and gives an extra form with every atom at an octet, so ortho/para win and the ring is faster. If that group starts with a δ+ or + atom (–NO₂), a + next to it is very bad, so meta, which never puts + there, wins.\"",
 "reactant": {
  "smiles": "COc1ccccc1",
  "name": "anisole (and nitrobenzene)"
 },
 "reagent": {
  "smiles": "[Br+]",
  "label": "E⁺ (here Br⁺, from Br₂/FeBr₃)"
 },
 "products": [
  {
   "smiles": "COc1ccc(Br)cc1",
   "name": "4-bromoanisole (para, major)",
   "stereo": "achiral"
  },
  {
   "smiles": "COc1ccccc1Br",
   "name": "2-bromoanisole (ortho)",
   "stereo": "achiral"
  },
  {
   "smiles": "O=[N+]([O-])c1cccc(Br)c1",
   "name": "1-bromo-3-nitrobenzene (meta) from nitrobenzene",
   "stereo": "achiral"
  }
 ],
 "intermediates": [
  {
   "name": "para sigma complex, oxonium form",
   "smiles": "C[O+]=C1C=CC(Br)C=C1"
  },
  {
   "name": "meta sigma complex (one form)",
   "smiles": "COC1=CC(Br)[CH+]C=C1"
  },
  {
   "name": "nitrobenzene ortho sigma complex, bad form",
   "smiles": "O=[N+]([O-])[C+]1C=CC=CC1Br"
  }
 ],
 "atomNames": {
  "1": "C1",
  "2": "C2",
  "3": "C3",
  "4": "C4",
  "5": "C5",
  "6": "C6",
  "7": "O",
  "8": "CH₃",
  "9": "Br",
  "10": "N",
  "11": "O⁻",
  "12": "O"
 },
 "stage": {
  "species": [
   {
    "key": "anisole",
    "role": "reactant",
    "smiles": "[CH3:8][O:7][C:1]1=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1",
    "label": "anisole",
    "at": [0, 0],
    "style": "skeletal"
   },
   {
    "key": "E",
    "role": "reagent",
    "smiles": "[Br+:9]",
    "label": "E⁺ = Br⁺",
    "at": [3.6, -1.0],
    "style": "full"
   }
  ],
  "state": "[CH3:8][O:7][C:1]1=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Br+:9]"
 },
 "layers": ["arrows", "orbitals"],
 "duration": 49.0,
 "beats": [
  {
   "id": "b1-anisole",
   "t0": 0.0,
   "t1": 3.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Anisole has –OCH₃ on the ring. Its O sits right on the ring with two lone pairs. Where will Br⁺ go?",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "aromatic",
     "atoms": [1, 2, 3, 4, 5, 6],
     "side": "both",
     "emphasis": "normal",
     "electrons": 6
    },
    {
     "kind": "lone-pair",
     "atoms": [7],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "plane": "z",
     "label": "O lone pair, lined up with the ring π"
    }
   ],
   "badges": [
    {
     "atom": 2,
     "text": "o",
     "tone": "muted"
    },
    {
     "atom": 6,
     "text": "o",
     "tone": "muted"
    },
    {
     "atom": 3,
     "text": "m",
     "tone": "muted"
    },
    {
     "atom": 5,
     "text": "m",
     "tone": "muted"
    },
    {
     "atom": 4,
     "text": "p",
     "tone": "muted"
    }
   ],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:8][O:7][C:1]1=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Br+:9]"
  },
  {
   "id": "b2-para",
   "t0": 4.0,
   "t1": 8.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Para attack: Br⁺ bonds to C4, across the ring from the O. The + appears next door, on C3.",
   "moves": [{"atoms": [9], "anchor": 9, "near": 4, "offset": [0, 0, 1.3], "at": [0, 0.3]}],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "bond": [3, 4]
     },
     "to": {
      "bond": [4, 9]
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
     "at": [0.25, 0.9],
     "why": "A π pair of the ring attacks Br⁺ at C4 (para to O). The + is left on C3."
    }
   ],
   "bonds": [{"a": 3, "b": 4, "action": "order", "order": 1}, {"a": 4, "b": 9, "action": "form", "order": 1}],
   "charges": [{"atom": 3, "charge": 1}, {"atom": 9, "charge": 0}],
   "partials": [],
   "orbitals": [{"kind": "p-empty", "atoms": [3], "side": "both", "emphasis": "focus", "electrons": 0}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:8][O:7][C:1]1=[CH:2][CH+:3][CH:4]([Br:9])[CH:5]=[CH:6]1"
  },
  {
   "id": "b3-push",
   "t0": 9.0,
   "t1": 12.0,
   "hold": 1.0,
   "kind": "resonance",
   "caption": "Push the C1=C2 π pair over: the + moves to C1, the very carbon that holds the O.",
   "arrows": [
    {
     "id": "a1",
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
     "why": "The C1=C2 π pair shifts to C2–C3. The + moves to C1, next to O."
    }
   ],
   "bonds": [{"a": 1, "b": 2, "action": "order", "order": 1}, {"a": 2, "b": 3, "action": "order", "order": 2}],
   "charges": [{"atom": 1, "charge": 1}, {"atom": 3, "charge": 0}],
   "partials": [],
   "orbitals": [
    {
     "kind": "p-empty",
     "atoms": [1],
     "side": "both",
     "emphasis": "focus",
     "electrons": 0
    },
    {
     "kind": "lone-pair",
     "atoms": [7],
     "side": "both",
     "emphasis": "normal",
     "electrons": 2,
     "toward": 1
    }
   ],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:8][O:7][C+:1]1[CH:2]=[CH:3][CH:4]([Br:9])[CH:5]=[CH:6]1"
  },
  {
   "id": "b4-oxonium",
   "t0": 13.0,
   "t1": 17.0,
   "hold": 1.0,
   "kind": "resonance",
   "caption": "O gives a lone pair to C1, making C=O⁺. Here every atom has an octet: an extra, very good form.",
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 7
     },
     "to": {
      "bond": [7, 1]
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
     "at": [0.1, 0.85],
     "why": "A lone pair on O moves in to make C1=O⁺. Now no carbon is short of electrons."
    }
   ],
   "bonds": [{"a": 1, "b": 7, "action": "order", "order": 2}],
   "charges": [{"atom": 1, "charge": 0}, {"atom": 7, "charge": 1}],
   "partials": [],
   "orbitals": [{"kind": "pi", "atoms": [1, 7], "side": "both", "emphasis": "focus", "electrons": 2}],
   "badges": [{"atom": 7, "text": "octet everywhere", "tone": "nuc"}],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:8][O+:7]=[C:1]1[CH:2]=[CH:3][CH:4]([Br:9])[CH:5]=[CH:6]1"
  },
  {
   "id": "b5-para-sum",
   "t0": 18.0,
   "t1": 21.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Para attack has four forms, one with + on O. More sharing, lower energy, faster reaction.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "forms": ["[CH3:8][O:7][C:1]1=[CH:2][CH+:3][CH:4]([Br:9])[CH:5]=[CH:6]1", "[CH3:8][O:7][C+:1]1[CH:2]=[CH:3][CH:4]([Br:9])[CH:5]=[CH:6]1", "[CH3:8][O:7][C:1]1=[CH:6][CH+:5][CH:4]([Br:9])[CH:3]=[CH:2]1", "[CH3:8][O+:7]=[C:1]1[CH:2]=[CH:3][CH:4]([Br:9])[CH:5]=[CH:6]1"],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:8][O+:7]=[C:1]1[CH:2]=[CH:3][CH:4]([Br:9])[CH:5]=[CH:6]1"
  },
  {
   "id": "b6-ortho",
   "t0": 22.0,
   "t1": 26.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Ortho attack (at C2) gets the same bonus: one form has + on C1, so O can share it. Ortho wins too.",
   "reset": {
    "species": [
     {
      "key": "ortho",
      "smiles": "[CH3:8][O:7][C+:1]1[CH:2]([Br:9])[CH:3]=[CH:4][CH:5]=[CH:6]1",
      "label": "ortho sigma complex"
     }
    ]
   },
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "forms": ["[CH3:8][O:7][C+:1]1[CH:2]([Br:9])[CH:3]=[CH:4][CH:5]=[CH:6]1", "[CH3:8][O:7][C:1]1=[CH:6][CH:5]=[CH:4][CH+:3][CH:2]1[Br:9]", "[CH3:8][O:7][C:1]1=[CH:6][CH+:5][CH:4]=[CH:3][CH:2]1[Br:9]", "[CH3:8][O+:7]=[C:1]1[CH:2]([Br:9])[CH:3]=[CH:4][CH:5]=[CH:6]1"],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:8][O:7][C+:1]1[CH:2]([Br:9])[CH:3]=[CH:4][CH:5]=[CH:6]1",
   "notes": "Reset beat: cross-fade (250 ms) to the ortho sigma complex; positions of ring atoms stay the same as the anisole drawing."
  },
  {
   "id": "b7-meta",
   "t0": 27.0,
   "t1": 31.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Meta attack (at C3): the + lands on C2, C4 and C6, never on C1. O cannot help, so meta loses.",
   "reset": {
    "species": [
     {
      "key": "meta",
      "smiles": "[CH3:8][O:7][C:1]1=[CH:2][CH:3]([Br:9])[CH+:4][CH:5]=[CH:6]1",
      "label": "meta sigma complex"
     }
    ]
   },
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [{"atom": 1, "text": "never +", "tone": "muted"}],
   "ghosts": [],
   "forms": ["[CH3:8][O:7][C:1]1=[CH:2][CH:3]([Br:9])[CH+:4][CH:5]=[CH:6]1", "[CH3:8][O:7][C:1]1=[CH:2][CH:3]([Br:9])[CH:4]=[CH:5][CH+:6]1", "[CH3:8][O:7][C:1]1=[CH:6][CH:5]=[CH:4][CH:3]([Br:9])[CH+:2]1"],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:8][O:7][C:1]1=[CH:2][CH:3]([Br:9])[CH+:4][CH:5]=[CH:6]1"
  },
  {
   "id": "b8-nitro",
   "t0": 32.0,
   "t1": 35.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Nitrobenzene: an N⁺ sits on the ring and pulls electrons out. Every attack is slow. Which is least bad?",
   "reset": {
    "species": [
     {
      "key": "nitrobenzene",
      "smiles": "[O-:11][N+:10](=[O:12])[C:1]1=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1",
      "label": "nitrobenzene"
     },
     {
      "key": "E",
      "smiles": "[Br+:9]",
      "label": "E⁺ = Br⁺"
     }
    ]
   },
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "aromatic",
     "atoms": [1, 2, 3, 4, 5, 6],
     "side": "both",
     "emphasis": "normal",
     "electrons": 6
    }
   ],
   "badges": [{"atom": 10, "text": "N⁺ pulls e⁻", "tone": "elec"}],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[O-:11][N+:10](=[O:12])[C:1]1=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Br+:9]"
  },
  {
   "id": "b9-nitro-op",
   "t0": 36.0,
   "t1": 40.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Ortho or para attack: one form puts the + on C1, right next to N⁺. Two + side by side: very bad.",
   "reset": {
    "species": [
     {
      "key": "northo",
      "smiles": "[O-:11][N+:10](=[O:12])[C+:1]1[CH:2]([Br:9])[CH:3]=[CH:4][CH:5]=[CH:6]1",
      "label": "ortho sigma complex"
     }
    ]
   },
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [{"atom": 1, "text": "+ next to N⁺", "tone": "elec"}],
   "ghosts": [],
   "forms": ["[O-:11][N+:10](=[O:12])[C+:1]1[CH:2]([Br:9])[CH:3]=[CH:4][CH:5]=[CH:6]1", "[O-:11][N+:10](=[O:12])[C:1]1=[CH:6][CH:5]=[CH:4][CH+:3][CH:2]1[Br:9]", "[O-:11][N+:10](=[O:12])[C:1]1=[CH:6][CH+:5][CH:4]=[CH:3][CH:2]1[Br:9]"],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[O-:11][N+:10](=[O:12])[C+:1]1[CH:2]([Br:9])[CH:3]=[CH:4][CH:5]=[CH:6]1"
  },
  {
   "id": "b10-nitro-meta",
   "t0": 41.0,
   "t1": 45.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Meta attack never puts the + on C1. It avoids that bad form, so nitrobenzene reacts meta (and slowly).",
   "reset": {
    "species": [
     {
      "key": "nmeta",
      "smiles": "[O-:11][N+:10](=[O:12])[C:1]1=[CH:2][CH:3]([Br:9])[CH+:4][CH:5]=[CH:6]1",
      "label": "meta sigma complex"
     }
    ]
   },
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [{"atom": 1, "text": "never +", "tone": "muted"}],
   "ghosts": [],
   "forms": ["[O-:11][N+:10](=[O:12])[C:1]1=[CH:2][CH:3]([Br:9])[CH+:4][CH:5]=[CH:6]1", "[O-:11][N+:10](=[O:12])[C:1]1=[CH:2][CH:3]([Br:9])[CH:4]=[CH:5][CH+:6]1", "[O-:11][N+:10](=[O:12])[C:1]1=[CH:6][CH:5]=[CH:4][CH:3]([Br:9])[CH+:2]1"],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6, 7],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[O-:11][N+:10](=[O:12])[C:1]1=[CH:2][CH:3]([Br:9])[CH+:4][CH:5]=[CH:6]1"
  },
  {
   "id": "b11-rule",
   "t0": 46.0,
   "t1": 49.0,
   "hold": 0,
   "kind": "look",
   "caption": "Rule: a lone pair next to the ring sends E⁺ ortho/para. A δ+ or + atom next to the ring sends it meta.",
   "reset": {
    "species": [
     {
      "key": "p",
      "smiles": "COc1ccc(Br)cc1",
      "label": "para (major)"
     },
     {
      "key": "o",
      "smiles": "COc1ccccc1Br",
      "label": "ortho"
     },
     {
      "key": "m",
      "smiles": "O=[N+]([O-])c1cccc(Br)c1",
      "label": "meta, from nitrobenzene"
     }
    ]
   },
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 0.85,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "COc1ccc(Br)cc1.COc1ccccc1Br.O=[N+]([O-])c1cccc(Br)c1"
  }
 ],
 "stereoCallout": {
  "title": "Count the forms, find the + on C1",
  "stereoMoment": null,
  "text": "No stereochemistry. The test to teach: for each attack position, ask \"does a form put + on the carbon that holds the group?\" Lone-pair group (–OCH₃, –OH, –NH₂): that form is GOOD (O or N shares the +): ortho/para. δ+/+ group (–NO₂, –C≡N, –C=O, –SO₃H): that form is BAD: meta. Halogens: lone pair → ortho/para, but σ pull → slower (card director-halogen)."
 },
 "whatIf": ["12-eas-bromination", "13-eas-nitration"],
 "quiz": {
  "q": "Phenol (–OH on the ring) is brominated. Where does the Br go?",
  "options": [
   {
    "text": "Ortho and para: in those attacks the O lone pair can share the + on C1.",
    "correct": true,
    "why": "Yes. Same as –OCH₃: a lone pair next to the ring means an extra all-octet form for ortho/para attack."
   },
   {
    "text": "Meta, because O is electronegative and pulls electrons.",
    "correct": false,
    "why": "O does pull through the σ bond, but its lone pair sharing the + wins for –OH. Lone pair next to the ring: ortho/para."
   },
   {
    "text": "Equally at every position.",
    "correct": false,
    "why": "Only ortho and para attack put the + on the carbon next to O, where the lone pair can help. Meta gets no help, so it is much slower."
   }
  ]
 },
 "notes": ["Course level (Lesson 14 s04–s06, LP_WHY / DELTA_WHY in reactions-aromatic.js): count resonance forms and look for the + on the carbon that holds the group. No energy diagrams or σ/π inductive split beyond that.", "Br⁺ is the E⁺ throughout so this links to scene 12. Anisole is so activated that Br₂ reacts even without FeBr₃; not shown.", "The NO₂ group's own resonance is not drawn (Lesson 14 s05 says it is not asked for)."]
}
```

</details>
