#!/usr/bin/env python3
"""Independent check of the conjugated-diene + HX products of learn/engine/reactions-dienes.js.
usage: check_dienes.py in.json out.json
in.json  = [{"diene": smiles, "X": "Cl"|"Br"|"I"}, ...]
out.json = [{"diene", "X", "orientations": [{"cationClasses":[near,far], "p12": canonical flat SMILES, "p14": ...}], "major": [indices], "products": [sorted flat SMILES], "nonAllylic": [...]}]
Products come from reaction SMARTS run in RDKit on the conjugated diene a1=a2-a3=a4: 1,2-addition  H on a1, X on a2, a3=a4 stays;  1,4-addition  H on a1, X on a4, C=C moves to a2=a3.
Both end carbons are tried (a1 -> a4). The major orientation is the one whose allylic cation has the more substituted end (carbon-neighbour counts, compared as (higher end, lower end));
equally good orientations are both kept."""
import json, sys
from rdkit import Chem
from rdkit.Chem import AllChem

def flat(m):
    m = Chem.Mol(m); Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)

def run(diene_smi, X):
    d = Chem.MolFromSmiles(diene_smi)
    patt = Chem.MolFromSmarts("[C:1]=[C:2]-[C:3]=[C:4]")
    chains = []
    for m in d.GetSubstructMatches(patt, uniquify=False):
        if m not in chains: chains.append(m)
    # each undirected chain (a1..a4) appears in both directions among the matches
    res = []
    for a1, a2, a3, a4 in chains:
        # add H on a1 (implicit), X on a2, make a1-a2 single
        def edit(att4):
            r = Chem.RWMol(d)
            xi = r.AddAtom(Chem.Atom(Chem.GetPeriodicTable().GetAtomicNumber(X)))
            if att4 == 2:   # 1,2: X on a2; a3=a4 stays
                r.GetBondBetweenAtoms(a1, a2).SetBondType(Chem.BondType.SINGLE)
                r.AddBond(a2, xi, Chem.BondType.SINGLE)
            else:           # 1,4: X on a4; a1-a2 single, a2=a3 double, a3-a4 single
                r.GetBondBetweenAtoms(a1, a2).SetBondType(Chem.BondType.SINGLE)
                r.GetBondBetweenAtoms(a2, a3).SetBondType(Chem.BondType.DOUBLE)
                r.GetBondBetweenAtoms(a3, a4).SetBondType(Chem.BondType.SINGLE)
                r.AddBond(a4, xi, Chem.BondType.SINGLE)
            m = r.GetMol(); Chem.SanitizeMol(m)
            return flat(m)
        nC = lambda i: sum(1 for n in d.GetAtomWithIdx(i).GetNeighbors() if n.GetSymbol() == "C")
        res.append({"chain": [a1, a2, a3, a4], "cls": [nC(a2), nC(a4)], "p12": edit(2), "p14": edit(4)})
    # dedupe reversed duplicates by keeping chains whose (a1) differs: two directions = two orientations
    seen = {}
    for r in res:
        seen[(r["chain"][0], r["chain"][3])] = r
    ors = list(seen.values())
    # H can go on either end carbon: orientation = which end gets H = chain[0]
    rank = lambda r: (max(r["cls"]), min(r["cls"]))
    # two entries (a1,a4) and (a4,a1) describe the two ends
    uniq = []
    for r in ors:
        k = (r["p12"], r["p14"], tuple(r["cls"]))
        if k not in [(u["p12"], u["p14"], tuple(u["cls"])) for u in uniq]: uniq.append(r)
    best = max(rank(r) for r in uniq)
    major = [r for r in uniq if rank(r) == best]
    prods = sorted({r["p12"] for r in major} | {r["p14"] for r in major})
    return {"orientations": [{"cationClasses": r["cls"], "p12": r["p12"], "p14": r["p14"]} for r in uniq], "major": [uniq.index(r) for r in major], "products": prods}

out = []
for c in json.load(open(sys.argv[1])):
    r = run(c["diene"], c["X"]); r["diene"] = c["diene"]; r["X"] = c["X"]
    out.append(r)
json.dump(out, open(sys.argv[2], "w"))
