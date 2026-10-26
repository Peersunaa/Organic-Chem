# 14 · Friedel–Crafts acylation: acetophenone from benzene

**Scene id** `14-fc-acylation` · **Hub card** `fc-acylation` (also `clemmensen`, `fc-alkylation`) · **Taught in** Lesson 13 s17 · **Runtime** 32 s, 7 beats · **Layers** arrows, orbitals

Implements [SCENE-SCHEMA.md](SCENE-SCHEMA.md). The JSON at the bottom is the source of truth; the tables are its readable view. Every state, arrow and product here was checked with RDKit by the generator (see Chemistry checks).

## Intent

After this scene the learner can say: "AlCl₃ takes Cl⁻ from the acid chloride and leaves the acylium ion, CH₃C≡O⁺, where every atom has an octet. The ring attacks its carbon, the sigma complex forms and loses H⁺ as usual. Because the acylium ion is so well stabilised it never rearranges, so the acyl group goes on exactly as drawn."

## Stage

| key | role | atom-mapped SMILES | label | at | style |
|---|---|---|---|---|---|
| `benzene` | reactant | `[C:1]1([H:7])=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1` | benzene | [0, 0.6] | skeletal |
| `AcCl` | reagent | `[CH3:10][C:8](=[O:9])[Cl:11]` | CH₃COCl | [3.2, -1.4] | full |
| `AlCl3` | catalyst | `[Cl:13][Al:12]([Cl:14])[Cl:15]` | AlCl₃ | [6.0, -1.4] | full |

Atom names used in captions and tables: 1 = C1, 2 = C2, 3 = C3, 4 = C4, 5 = C5, 6 = C6, 7 = H, 8 = C(acyl), 9 = O, 10 = CH₃, 11 = Cl, 12 = Al, 13 = Cl′, 14 = Cl, 15 = Cl.

## Beats

| # | id | time (s) | caption | ARROWS layer | ORBITALS layer | camera / faces |
|---|---|---|---|---|---|---|
| 1 | `b1-meet` · look | 0–3 (+1 hold) | Benzene with CH₃COCl and AlCl₃. Al has only six electrons, so AlCl₃ is a Lewis acid that wants a pair. | hold the picture | empty p orbital Al (both faces, focus) | zoom 0.9, tilt 0° |
| 2 | `b2-activate` · step | 4–9 (+1 hold) | AlCl₃ takes the Cl as AlCl₄⁻. The carbon left short gets an O lone pair: CH₃C≡O⁺, the acylium ion. | AlCl3 moves to Cl; Cl, Al, Cl′, Cl, Cl drifts aside<br>**arrows:** (1) lone pair on Cl → Al (new Cl–Al bond) · (2) σ(C(acyl)–Cl) → onto Cl · (3) lone pair on O → O–C(acyl) gains a pair<br>bonds: C(acyl)=O → C(acyl)≡O, breaks C(acyl)–Cl, forms Cl–Al<br>charges: O +, Al − | — | zoom 1.1, tilt 0°, focus C(acyl)/Cl/Al |
| 3 | `b3-acylium` · look | 10–13 (+1 hold) | Two ways to draw it: C⁺=O or C≡O⁺. In C≡O⁺ every atom has an octet, so it never rearranges. | resonance row: 2 forms | lone-pair lobe O (both faces, 2 e⁻, pointing at C(acyl), focus); empty p orbital C(acyl) (both faces) | zoom 1.4, tilt 0°, focus C(acyl)/O |
| 4 | `b4-attack` · step | 14–18 (+1 hold) | Two ring π electrons bond C1 to the acylium C. One C≡O π pair moves back onto O, which loses its +. | C(acyl), O, CH₃ moves to C1 (above, top face)<br>**arrows:** (1) π(C1=C2) → new bond C1–C(acyl) · (2) π(C(acyl)≡O) → onto O<br>bonds: C1=C2 → C1–C2, forms C1–C(acyl), C(acyl)≡O → C(acyl)=O<br>charges: C2 +, O 0 | empty p orbital C2 (both faces, focus) | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6 |
| 5 | `b5-forms` · look | 19–22 (+1 hold) | The sigma complex again: the + is shared by C2, C4 and C6 through three resonance forms. | resonance row: 3 forms | π cloud C2–C3–C4–C5–C6 (both faces, 4 e⁻, focus) | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6 |
| 6 | `b6-deprot` · step | 23–28 (+1 hold) | AlCl₄⁻ takes the H⁺. The ring is aromatic again, and HCl and AlCl₃ are released. | Cl, Al, Cl′, Cl, Cl moves to H (below, bottom face)<br>**arrows:** (1) lone pair on Cl′ → H (new Cl′–H bond) · (2) σ(C1–H) → C1–C2 gains a pair · (3) σ(Al–Cl′) → onto Cl′<br>bonds: C1–C2 → C1=C2, breaks C1–H, forms H–Cl′, breaks Al–Cl′<br>charges: C2 0, Al 0 | aromatic π ring (both faces, 6 e⁻, focus) | zoom 1.1, tilt 0°, focus C1/C2/C3/C4/C5/C6 |
| 7 | `b7-product` · look | 29–32 (+0 hold) | Acetophenone, an aryl ketone. The acyl group went on exactly as it was: no rearrangement. | relayout to the product drawing | — | zoom 1, tilt 0° |

Beat notes for the implementer:

- `b3-acylium`: Draw CH₃–C≡O⁺ linear. The comparison card for alkylation (1° cation → 2° by a hydride shift) is the what-if, not a beat.

## Chemistry checks

- Reactant: `c1ccccc1` (benzene). Reagent: CH₃COCl, AlCl₃ (`CC(=O)Cl`).
- Intermediate: `CC#[O+]`, acylium ion.
- Intermediate: `C[C+]=O`, acylium, C⁺ form.
- Intermediate: `CC(=O)C1C=CC=C[CH+]1`, sigma complex.
- Product: `CC(=O)c1ccccc1`, acetophenone. RDKit: no stereocentre.
- Product: `Cl`, HCl. RDKit: no stereocentre.
- Product: `Cl[Al](Cl)Cl`, AlCl₃ (released). RDKit: no stereocentre.
- Generator checks passed for every beat: atoms and charge conserved (except beats marked summary), the bond changes implied by the arrows equal the change between consecutive `state` SMILES, the formal-charge change implied by the arrows equals the state's, resonance forms share one σ skeleton, and the last state contains the products.

## Stereo callout

**No rearrangement**

No stereochemistry. The contrast that matters: CH₃CH₂CH₂Cl/AlCl₃ gives a 1° cation that shifts to the 2° cation, so alkylation makes isopropylbenzene. CH₃CH₂C(=O)Cl/AlCl₃ gives an acylium ion that has no better form to shift to, so acylation then Clemmensen (Zn(Hg), HCl) gives the straight-chain propylbenzene.

## What-if links

[12-eas-bromination](12-eas-bromination.md), [13-eas-nitration](13-eas-nitration.md), [15-directors](15-directors.md)

## End quiz

**Why make propylbenzene by acylation and then Clemmensen, not by CH₃CH₂CH₂Cl/AlCl₃?**

A. The propyl cation rearranges to the 2° cation (giving isopropylbenzene); the acylium ion does not rearrange. **(correct)**  
   Why: Yes. C≡O⁺ with full octets has no better shape to shift to.
B. Acylation is simply faster than alkylation.   
   Diagnosis: Speed is not the point. The alkyl cation shifts to a more stable cation before it reaches the ring.
C. Alkylation cannot put a carbon chain on a ring at all.   
   Diagnosis: It can, but the wrong one here: the 1° cation rearranges, so the chain arrives branched.

## Notes

- Arrows match the course data (RCOCl, drawnActivation: true). In real practice AlCl₃ binds the ketone product, so a full equivalent is used; out of course scope, mention only in the implementer tooltip if at all.

## Scene data (JSON)

<details><summary>Full scene object (validates against SCENE-SCHEMA.md)</summary>

```json
{
 "id": "14-fc-acylation",
 "title": "Friedel–Crafts acylation: acetophenone from benzene",
 "reagentCard": "fc-acylation",
 "alsoCards": ["clemmensen", "fc-alkylation"],
 "lesson": {
  "id": "13",
  "step": "s17"
 },
 "intent": "After this scene the learner can say: \"AlCl₃ takes Cl⁻ from the acid chloride and leaves the acylium ion, CH₃C≡O⁺, where every atom has an octet. The ring attacks its carbon, the sigma complex forms and loses H⁺ as usual. Because the acylium ion is so well stabilised it never rearranges, so the acyl group goes on exactly as drawn.\"",
 "reactant": {
  "smiles": "c1ccccc1",
  "name": "benzene"
 },
 "reagent": {
  "smiles": "CC(=O)Cl",
  "label": "CH₃COCl, AlCl₃"
 },
 "products": [
  {
   "smiles": "CC(=O)c1ccccc1",
   "name": "acetophenone",
   "stereo": "achiral"
  },
  {
   "smiles": "Cl",
   "name": "HCl",
   "stereo": "achiral"
  },
  {
   "smiles": "Cl[Al](Cl)Cl",
   "name": "AlCl₃ (released)",
   "stereo": "achiral"
  }
 ],
 "intermediates": [
  {
   "name": "acylium ion",
   "smiles": "CC#[O+]"
  },
  {
   "name": "acylium, C⁺ form",
   "smiles": "C[C+]=O"
  },
  {
   "name": "sigma complex",
   "smiles": "CC(=O)C1C=CC=C[CH+]1"
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
  "8": "C(acyl)",
  "9": "O",
  "10": "CH₃",
  "11": "Cl",
  "12": "Al",
  "13": "Cl′",
  "14": "Cl",
  "15": "Cl"
 },
 "stage": {
  "species": [
   {
    "key": "benzene",
    "role": "reactant",
    "smiles": "[C:1]1([H:7])=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1",
    "label": "benzene",
    "at": [0, 0.6],
    "style": "skeletal"
   },
   {
    "key": "AcCl",
    "role": "reagent",
    "smiles": "[CH3:10][C:8](=[O:9])[Cl:11]",
    "label": "CH₃COCl",
    "at": [3.2, -1.4],
    "style": "full"
   },
   {
    "key": "AlCl3",
    "role": "catalyst",
    "smiles": "[Cl:13][Al:12]([Cl:14])[Cl:15]",
    "label": "AlCl₃",
    "at": [6.0, -1.4],
    "style": "full"
   }
  ],
  "state": "[C:1]1([H:7])=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[CH3:10][C:8](=[O:9])[Cl:11].[Cl:13][Al:12]([Cl:14])[Cl:15]"
 },
 "layers": ["arrows", "orbitals"],
 "duration": 32.0,
 "beats": [
  {
   "id": "b1-meet",
   "t0": 0.0,
   "t1": 3.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Benzene with CH₃COCl and AlCl₃. Al has only six electrons, so AlCl₃ is a Lewis acid that wants a pair.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [{"kind": "p-empty", "atoms": [12], "side": "both", "emphasis": "focus", "electrons": 0}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 0.9,
    "focus": [],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[C:1]1([H:7])=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[CH3:10][C:8](=[O:9])[Cl:11].[Cl:13][Al:12]([Cl:14])[Cl:15]"
  },
  {
   "id": "b2-activate",
   "t0": 4.0,
   "t1": 9.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "AlCl₃ takes the Cl as AlCl₄⁻. The carbon left short gets an O lone pair: CH₃C≡O⁺, the acylium ion.",
   "moves": [
    {
     "species": "AlCl3",
     "anchor": 12,
     "near": 11,
     "offset": [1.2, 0, 0],
     "at": [0, 0.25]
    },
    {
     "atoms": [11, 12, 13, 14, 15],
     "by": [0.9, 0, 0],
     "at": [0.6, 0.9]
    }
   ],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 11
     },
     "to": {
      "atom": 12
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
     "at": [0.2, 0.6],
     "why": "A lone pair on Cl donates to the empty orbital on Al, forming a new Al–Cl bond (AlCl₃ is a Lewis acid)."
    },
    {
     "id": "a2",
     "from": {
      "bond": [8, 11]
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
     "at": [0.3, 0.75],
     "why": "The C–Cl bond pair goes onto Cl. Carbon is left with the + charge, and the Cl ends up in AlCl₄⁻."
    },
    {
     "id": "a3",
     "from": {
      "lp": 9
     },
     "to": {
      "bond": [9, 8]
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
     "at": [0.5, 0.95],
     "why": "A lone pair on O slides into the C–O bond and makes it a triple bond. This gives the acylium ion, a stable electrophile."
    }
   ],
   "bonds": [
    {
     "a": 8,
     "b": 9,
     "action": "order",
     "order": 3
    },
    {
     "a": 8,
     "b": 11,
     "action": "break",
     "order": 0
    },
    {
     "a": 11,
     "b": 12,
     "action": "form",
     "order": 1
    }
   ],
   "charges": [{"atom": 9, "charge": 1}, {"atom": 12, "charge": -1}],
   "partials": [],
   "orbitals": [],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [8, 11, 12],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[C:1]1([H:7])=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[CH3:10][C:8]#[O+:9].[Cl:11][Al-:12]([Cl:13])([Cl:14])[Cl:15]"
  },
  {
   "id": "b3-acylium",
   "t0": 10.0,
   "t1": 13.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "Two ways to draw it: C⁺=O or C≡O⁺. In C≡O⁺ every atom has an octet, so it never rearranges.",
   "arrows": [],
   "bonds": [],
   "charges": [],
   "partials": [],
   "orbitals": [
    {
     "kind": "lone-pair",
     "atoms": [9],
     "side": "both",
     "emphasis": "focus",
     "electrons": 2,
     "toward": 8
    },
    {
     "kind": "p-empty",
     "atoms": [8],
     "side": "both",
     "emphasis": "normal",
     "electrons": 0
    }
   ],
   "badges": [],
   "ghosts": [],
   "forms": ["[CH3:10][C+:8]=[O:9]", "[CH3:10][C:8]#[O+:9]"],
   "camera": {
    "zoom": 1.4,
    "focus": [8, 9],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[C:1]1([H:7])=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[CH3:10][C:8]#[O+:9].[Cl:11][Al-:12]([Cl:13])([Cl:14])[Cl:15]",
   "notes": "Draw CH₃–C≡O⁺ linear. The comparison card for alkylation (1° cation → 2° by a hydride shift) is the what-if, not a beat."
  },
  {
   "id": "b4-attack",
   "t0": 14.0,
   "t1": 18.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "Two ring π electrons bond C1 to the acylium C. One C≡O π pair moves back onto O, which loses its +.",
   "moves": [{"atoms": [8, 9, 10], "anchor": 8, "near": 1, "offset": [0, 0, 1.5], "at": [0, 0.3]}],
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
     "at": [0.25, 0.75],
     "why": "A π pair of the ring attacks the acylium carbon and forms a new C–C bond. The ring now carries a + charge."
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
     "why": "One C≡O π pair moves onto O, so carbon keeps only four bonds. The C≡O becomes C=O and O loses its +."
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
     "order": 1
    },
    {
     "a": 8,
     "b": 9,
     "action": "order",
     "order": 2
    }
   ],
   "charges": [{"atom": 2, "charge": 1}, {"atom": 9, "charge": 0}],
   "partials": [],
   "orbitals": [{"kind": "p-empty", "atoms": [2], "side": "both", "emphasis": "focus", "electrons": 0}],
   "badges": [],
   "ghosts": [],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[C:1]1([H:7])([C:8]([CH3:10])=[O:9])[CH+:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Cl:11][Al-:12]([Cl:13])([Cl:14])[Cl:15]",
   "pose": {
    "8": 1,
    "7": -1
   }
  },
  {
   "id": "b5-forms",
   "t0": 19.0,
   "t1": 22.0,
   "hold": 1.0,
   "kind": "look",
   "caption": "The sigma complex again: the + is shared by C2, C4 and C6 through three resonance forms.",
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
   "badges": [],
   "ghosts": [],
   "forms": ["[C:1]1([H:7])([C:8]([CH3:10])=[O:9])[CH+:2][CH:3]=[CH:4][CH:5]=[CH:6]1", "[C:1]1([H:7])([C:8]([CH3:10])=[O:9])[CH:2]=[CH:3][CH+:4][CH:5]=[CH:6]1", "[C:1]1([H:7])([C:8]([CH3:10])=[O:9])[CH:2]=[CH:3][CH:4]=[CH:5][CH+:6]1"],
   "camera": {
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[C:1]1([H:7])([C:8]([CH3:10])=[O:9])[CH+:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Cl:11][Al-:12]([Cl:13])([Cl:14])[Cl:15]"
  },
  {
   "id": "b6-deprot",
   "t0": 23.0,
   "t1": 28.0,
   "hold": 1.0,
   "kind": "step",
   "caption": "AlCl₄⁻ takes the H⁺. The ring is aromatic again, and HCl and AlCl₃ are released.",
   "moves": [
    {
     "atoms": [11, 12, 13, 14, 15],
     "anchor": 13,
     "near": 7,
     "offset": [0, 1.1, -0.6],
     "at": [0, 0.3]
    }
   ],
   "arrows": [
    {
     "id": "a1",
     "from": {
      "lp": 13
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
     "why": "A lone pair on a Cl of AlCl₄⁻ takes the H⁺ from the sp³ carbon and forms a new H–Cl bond."
    },
    {
     "id": "a2",
     "from": {
      "bond": [1, 7]
     },
     "to": {
      "bond": [1, 2]
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
      "bond": [12, 13]
     },
     "to": {
      "atom": 13
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
     "why": "The Al–Cl bond pair goes back onto Cl. That frees AlCl₃ and H–Cl leaves."
    }
   ],
   "bonds": [
    {
     "a": 1,
     "b": 2,
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
     "b": 13,
     "action": "form",
     "order": 1
    },
    {
     "a": 12,
     "b": 13,
     "action": "break",
     "order": 0
    }
   ],
   "charges": [{"atom": 2, "charge": 0}, {"atom": 12, "charge": 0}],
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
    "zoom": 1.1,
    "focus": [1, 2, 3, 4, 5, 6],
    "tilt": 0
   },
   "faces": {
    "show": false
   },
   "state": "[CH3:10][C:8](=[O:9])[C:1]1=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[H:7][Cl:13].[Cl:11][Al:12]([Cl:14])[Cl:15]"
  },
  {
   "id": "b7-product",
   "t0": 29.0,
   "t1": 32.0,
   "hold": 0,
   "kind": "look",
   "caption": "Acetophenone, an aryl ketone. The acyl group went on exactly as it was: no rearrangement.",
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
   "state": "[CH3:10][C:8](=[O:9])[C:1]1=[CH:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[H:7][Cl:13].[Cl:11][Al:12]([Cl:14])[Cl:15]",
   "relayout": {
    "anchor": [1, 4]
   }
  }
 ],
 "stereoCallout": {
  "title": "No rearrangement",
  "stereoMoment": null,
  "text": "No stereochemistry. The contrast that matters: CH₃CH₂CH₂Cl/AlCl₃ gives a 1° cation that shifts to the 2° cation, so alkylation makes isopropylbenzene. CH₃CH₂C(=O)Cl/AlCl₃ gives an acylium ion that has no better form to shift to, so acylation then Clemmensen (Zn(Hg), HCl) gives the straight-chain propylbenzene."
 },
 "whatIf": ["12-eas-bromination", "13-eas-nitration", "15-directors"],
 "quiz": {
  "q": "Why make propylbenzene by acylation and then Clemmensen, not by CH₃CH₂CH₂Cl/AlCl₃?",
  "options": [
   {
    "text": "The propyl cation rearranges to the 2° cation (giving isopropylbenzene); the acylium ion does not rearrange.",
    "correct": true,
    "why": "Yes. C≡O⁺ with full octets has no better shape to shift to."
   },
   {
    "text": "Acylation is simply faster than alkylation.",
    "correct": false,
    "why": "Speed is not the point. The alkyl cation shifts to a more stable cation before it reaches the ring."
   },
   {
    "text": "Alkylation cannot put a carbon chain on a ring at all.",
    "correct": false,
    "why": "It can, but the wrong one here: the 1° cation rearranges, so the chain arrives branched."
   }
  ]
 },
 "notes": ["Arrows match the course data (RCOCl, drawnActivation: true). In real practice AlCl₃ binds the ketone product, so a full equivalent is used; out of course scope, mention only in the implementer tooltip if at all."]
}
```

</details>
