#!/usr/bin/env python3
"""Independent check of the Lesson 09 reactions engine (learn/engine/reactions.js) for learn/tests/lesson09.mjs.
usage: check_markovnikov.py in.json out.json
in.json  = [{"alkene": smiles, "reagent": "HCl"|"HBr"|"HI"|"H2O", "engine": [smiles, ...]}, ...]   (engine = the product(s) the JS engine predicts)
out.json = [{"alkene", "reagent", "python": [canonical smiles], "engine": [canonical smiles], "cations": [{"class": n, "product": smiles}], "route2": [canonical smiles], "match": bool}]

Two independent routes, both RDKit (no code shared with the JS engine):
 route 1: ONE generic reaction SMARTS ('[C:1]=[C:2]>>[C:1]-[C:2]X') gives both regiochemistries. The carbocation that would form puts
          its + charge on the carbon that receives X, so the product with the larger CARBOCATION-SUBSTITUTION COUNT (carbon neighbours of that
          carbon in the alkene, i.e. 1 = primary, 2 = secondary, 3 = tertiary) is the major one; equal counts and different products = a mixture.
 route 2: reaction SMARTS written out for each regiochemistry by H count (Markovnikov: H goes to the carbon with more H):
          [C;H2:1]=[C;H1:2], [C;H2:1]=[C;H0:2], [C;H1:1]=[C;H0:2] (one product, X on atom 2), and the tied cases
          [C;H2:1]=[C;H2:2], [C;H1:1]=[C;H1:2], [C;H0:1]=[C;H0:2] (X on either atom).
'match' = route 1 == route 2 == the engine's answer."""
import json, sys
from rdkit import Chem
from rdkit.Chem import AllChem

GROUP = {"HCl": "Cl", "HBr": "Br", "HI": "I", "H2O": "O"}

def canon(smi):
    return Chem.MolToSmiles(Chem.MolFromSmiles(smi))

def run(rxn, mol):
    out = set()
    for prods in rxn.RunReactants((mol,)):
        for p in prods:
            Chem.SanitizeMol(p)
            out.add(Chem.MolToSmiles(p))
    return out

def classes_by_orientation(alkene, X):
    """[{"class": substitution count of the carbocation carbon, "product": smiles}] for both orientations of ONE generic reaction SMARTS."""
    mol = Chem.MolFromSmiles(alkene)
    rxn = AllChem.ReactionFromSmarts(f"[C:1]=[C:2]>>[C:1]-[C:2]{X}")
    res, seen = [], set()
    for prods in rxn.RunReactants((mol,)):
        p = prods[0]
        Chem.SanitizeMol(p)
        hetero = [a for a in p.GetAtoms() if a.GetSymbol() != "C"][0]
        c = hetero.GetNeighbors()[0]  # the carbon that bears X = the carbon that carried the + charge
        n_sub = sum(1 for nb in c.GetNeighbors() if nb.GetSymbol() == "C")  # carbon groups on it = 1 primary, 2 secondary, 3 tertiary
        key = (Chem.MolToSmiles(p), n_sub)
        if key not in seen:
            seen.add(key)
            res.append({"class": n_sub, "product": key[0]})
    return res

ROUTE2 = [
    ("[C;H2:1]=[C;H1:2]", "[C:1]-[C:2]{X}", "single"),
    ("[C;H2:1]=[C;H0:2]", "[C:1]-[C:2]{X}", "single"),
    ("[C;H1:1]=[C;H0:2]", "[C:1]-[C:2]{X}", "single"),
    ("[C;H2:1]=[C;H2:2]", "[C:1]-[C:2]{X}", "tie"),
    ("[C;H1:1]=[C;H1:2]", "[C:1]-[C:2]{X}", "tie"),
    ("[C;H0:1]=[C;H0:2]", "[C:1]-[C:2]{X}", "tie"),
]

def route2(alkene, X):
    mol = Chem.MolFromSmiles(alkene)
    for patt, prod, kind in ROUTE2:
        rxn = AllChem.ReactionFromSmarts(f"{patt}>>{prod.format(X=X)}")
        if kind == "single":
            # only the orientation with the ordered pattern matches (atom 1 has more H); RunReactants tries both mappings of the match
            res = run(rxn, mol)
            if res:
                return sorted(res)
        else:
            res = run(rxn, mol)
            # a tie pattern matches the C=C in both directions: X on either end
            if res:
                return sorted(res)
    return None

def main():
    cases = json.load(open(sys.argv[1]))
    out = []
    for c in cases:
        X = GROUP[c["reagent"]]
        o = classes_by_orientation(c["alkene"], X)
        # route 1: the larger carbocation-substitution count wins; equal counts keep every distinct product (a mixture)
        top = max(x["class"] for x in o)
        r1 = sorted({canon(x["product"]) for x in o if x["class"] == top})
        r2 = [canon(s) for s in route2(c["alkene"], X)]
        # route 2's unordered match: for the three 'single' patterns RDKit also matches the reverse mapping only when the atoms fit the pattern, so
        eng = sorted(canon(s) for s in c["engine"])
        out.append({"alkene": c["alkene"], "reagent": c["reagent"], "python": r1, "route2": sorted(r2), "engine": eng,
                    "cations": o, "match": r1 == sorted(r2) == eng})
    json.dump(out, open(sys.argv[2], "w"))

if __name__ == "__main__":
    main()
