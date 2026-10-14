#!/usr/bin/env python3
"""Independent check of the Lesson 10 reactions (learn/engine/reactions-additions.js) for learn/tests/lesson10.mjs.
usage: check_additions.py in.json out.json
in.json  = [{"alkene": smiles, "reagent": "Br2"|"Cl2"|"H2"|"RCO3H"|"RCO3H_H3O"|"KMnO4_OH"|"KMnO4_H", "engine": [smiles, ...]}, ...]
out.json = [{"alkene","reagent","python": [canonical smiles], "engine": [canonical smiles], "relation": "cis"|"trans"|null, "match": bool, ...}]

The JS engine builds products from a flat (2D) drawing of the alkene and SMILES chirality marks. This script shares no code with it. It works in 3D:
  * stereo products (X2, H2, RCO3H, epoxide + H3O+, KMnO4/OH-): embed the alkene (ETKDG + MMFF), take the plane of the C=C and its neighbours,
    put each new group above ("top") or below ("bottom") the plane (anti = one on each face, syn = both on the same face, epoxide O above the middle
    of the C-C bond), then let RDKit read the stereo from the 3D coordinates (AssignStereochemistryFrom3D). Same expectation as the textbook rules.
  * cleavage (KMnO4/H3O+): reaction SMARTS ([C:1]=[C:2]>>[C:1]=O.[C:2]=O, then aldehyde C-H -> C-OH, then H2C=O -> CO2).
  * a racemic (chiral) product is compared by the smaller of canonical SMILES of the molecule and of its mirror image (all chiral tags inverted with RDKit).
  * ring relationship: the engine's product is embedded in 3D and the two new substituents are placed on the same or opposite side of the ring's mean plane
    (cis / trans) - independent of any CIP label.
"""
import json, sys
import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit.Geometry import Point3D

SEED = 11

def canon(smi):
    m = Chem.MolFromSmiles(smi)
    return Chem.MolToSmiles(m)

def mirror(smi):
    m = Chem.MolFromSmiles(smi)
    for a in m.GetAtoms():
        t = a.GetChiralTag()
        if t == Chem.ChiralType.CHI_TETRAHEDRAL_CW:
            a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CCW)
        elif t == Chem.ChiralType.CHI_TETRAHEDRAL_CCW:
            a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CW)
    return Chem.MolToSmiles(m)

def key(smi):
    out = []
    for part in canon(smi).split("."):
        a, b = canon(part), mirror(part)
        out.append(min(a, b))
    return ".".join(sorted(out))

def n_centers(smi):
    m = Chem.MolFromSmiles(smi)
    return len(Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False))

def flat(smi):
    m = Chem.MolFromSmiles(smi)
    Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)

def embed(smi):
    m = Chem.AddHs(Chem.MolFromSmiles(smi))
    if AllChem.EmbedMolecule(m, randomSeed=SEED) != 0:
        AllChem.EmbedMolecule(m, randomSeed=SEED, useRandomCoords=True)
    AllChem.MMFFOptimizeMolecule(m, maxIters=2000)
    return m

def plane_normal(pts):
    P = np.array(pts)
    c = P.mean(axis=0)
    u, s, vt = np.linalg.svd(P - c)
    return vt[2], c

def face_attack(alkene, reagent):
    """3D product of an addition, by placing new groups above / below the plane of the C=C."""
    m = embed(alkene)
    conf = m.GetConformer()
    bond = [b for b in m.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE][0]
    c1, c2 = bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()
    around = {c1, c2}
    for c in (c1, c2):
        around |= {n.GetIdx() for n in m.GetAtomWithIdx(c).GetNeighbors()}
    pts = [list(conf.GetAtomPosition(i)) for i in around]
    n, centre = plane_normal(pts)
    pos = lambda i: np.array(conf.GetAtomPosition(i))
    rw = Chem.RWMol(m)
    rwconf = rw.GetConformer()
    def setpos(i, p): rwconf.SetAtomPosition(i, Point3D(*[float(x) for x in p]))
    def add(sym, p):
        idx = rw.AddAtom(Chem.Atom(sym)); rwconf.SetAtomPosition(idx, Point3D(*[float(x) for x in p])); return idx
    def lift(c, s):  # make the carbon pyramidal towards its new group so the chiral volume is well defined
        setpos(c, pos(c) + 0.5 * s * n)
    plan = {
        "Br2": ("Br", [+1, -1]), "Cl2": ("Cl", [+1, -1]),
        "H2": ("H", [+1, +1]),
        "KMnO4_OH": ("O", [+1, +1]),          # syn dihydroxylation
        "RCO3H_H3O": ("O", [+1, -1]),          # anti dihydroxylation (epoxide opened from the back)
    }
    bond_len = {"Br": 1.95, "Cl": 1.78, "H": 1.09, "O": 1.43}
    rw.GetBondBetweenAtoms(c1, c2).SetBondType(Chem.BondType.SINGLE)
    if reagent == "RCO3H":
        mid = (pos(c1) + pos(c2)) / 2
        lift(c1, +1); lift(c2, +1)
        o = add("O", mid + 1.3 * n + 0.5 * n)
        rw.AddBond(c1, o, Chem.BondType.SINGLE); rw.AddBond(c2, o, Chem.BondType.SINGLE)
    else:
        el, faces = plan[reagent]
        for c, s in zip((c1, c2), faces):
            p0 = pos(c)
            lift(c, s)
            x = add(el, p0 + s * n * bond_len[el] + 0.5 * s * n)
            rw.AddBond(c, x, Chem.BondType.SINGLE)
            if el == "O":
                h = add("H", pos(c) + s * n * 1.9 + np.array([0.9, 0, 0]))  # position of the hydroxyl H is irrelevant for the stereo
                rw.AddBond(x, h, Chem.BondType.SINGLE)
    mol = rw.GetMol()
    Chem.SanitizeMol(mol)
    Chem.AssignStereochemistryFrom3D(mol)
    mol = Chem.RemoveHs(mol)
    return Chem.MolToSmiles(mol)

def cleavage(alkene):
    m = Chem.MolFromSmiles(alkene)
    rxn = AllChem.ReactionFromSmarts("[C:1]=[C:2]>>([C:1]=O.[C:2]=O)")  # one product molecule (a ring stays one molecule)
    mol = rxn.RunReactants((m,))[0][0]
    Chem.SanitizeMol(mol)
    smi = Chem.MolToSmiles(mol)
    # aldehyde C-H is oxidised to the acid; formaldehyde ends up as CO2 (McMurry 4.6)
    ald = AllChem.ReactionFromSmarts("[CX3;H1:1](=[O:2])[#6:3]>>[C:1](=[O:2])(O)[#6:3]")
    form = AllChem.ReactionFromSmarts("[CH2:1]=[O:2]>>[O:2]=[C:1]=O")
    frags = []
    for part in smi.split("."):
        for _ in range(4):
            m2 = Chem.MolFromSmiles(part)
            changed = False
            for r in (ald, form):
                res = r.RunReactants((m2,))   # reactions only carry over the connected piece, so each fragment is treated on its own
                if res:
                    p = res[0][0]
                    Chem.SanitizeMol(p)
                    part = Chem.MolToSmiles(p)
                    changed = True
                    break
            if not changed:
                break
        frags.append(part)
    smi = ".".join(frags)
    return [canon(s) for s in smi.split(".")]

def ring_relation(smi):
    """cis / trans of the two substituents on the two adjacent stereo-ring atoms of a ring product (None if not a ring with 2 such centres)."""
    m0 = Chem.MolFromSmiles(smi)
    ri = m0.GetRingInfo()
    ring = [r for r in ri.AtomRings() if len(r) >= 5]
    if not ring:
        return None
    ring = list(ring[0])
    cent = [i for i, _ in Chem.FindMolChiralCenters(m0, includeUnassigned=True, useLegacyImplementation=False) if i in ring]
    if len(cent) != 2:
        return None
    m = embed(smi)
    conf = m.GetConformer()
    P = [list(conf.GetAtomPosition(i)) for i in ring]
    n, centre = plane_normal(P)
    kinds = []
    for c in cent:
        a = m0.GetAtomWithIdx(c)
        kinds.append(sorted(x.GetSymbol() for x in a.GetNeighbors() if x.GetIdx() not in ring))
    if kinds[0] != kinds[1]:
        return None   # unsymmetrical (e.g. CH3 on one carbon, H on the other): "cis/trans" needs a chosen pair of groups, so it is not reported
    sides = []
    for c in cent:
        a = m.GetAtomWithIdx(c)
        # new group = a non-ring neighbour that is not H, or the H if both are non-ring-hydrogen (H2 case: use the heavy substituent already on ring carbon)
        subs = [x.GetIdx() for x in a.GetNeighbors() if x.GetIdx() not in ring and x.GetAtomicNum() > 1]
        if not subs:
            subs = [x.GetIdx() for x in a.GetNeighbors() if x.GetIdx() not in ring]
        s = subs[0]
        v = np.array(conf.GetAtomPosition(s)) - np.array(conf.GetAtomPosition(c))
        sides.append(float(np.dot(v, n)))
    if abs(sides[0]) < 0.05 or abs(sides[1]) < 0.05:
        return "?"
    return "cis" if sides[0] * sides[1] > 0 else "trans"

def main():
    cases = json.load(open(sys.argv[1]))
    out = []
    for c in cases:
        alkene, reagent = c["alkene"], c["reagent"]
        eng = sorted(key(s) for s in c["engine"])
        if reagent == "KMnO4_H":
            py = sorted(key(s) for s in cleavage(alkene))
            rel = None
        else:
            smi = face_attack(alkene, reagent)
            nc = n_centers(smi)
            # a single stereocentre is a racemate drawn flat in the engine
            py = [key(smi)] if nc != 1 else [key(flat(smi))]
            eng_one = [key(flat(s)) if n_centers(s) == 1 else key(s) for s in c["engine"]]
            eng = sorted(eng_one)
            rel = ring_relation(c["engine"][0])
        out.append({"alkene": alkene, "reagent": reagent, "python": py, "engine": eng, "relation": rel, "match": py == eng})
    json.dump(out, open(sys.argv[2], "w"))

if __name__ == "__main__":
    main()
