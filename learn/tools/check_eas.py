#!/usr/bin/env python3
"""Independent check of learn/engine/reactions-aromatic.js (Lesson 13, electrophilic aromatic substitution on benzene).
usage: check_eas.py in.json out.json
in.json  = [{"arene": smiles, "reagent": "Br2"|"Cl2"|"I2"|"HNO3"|"SO3"|"RCl"|"RCOCl", "halide": smiles|null, "sigma": js sigma-complex smiles|null, "forms": [js ring-form smiles]|null}, ...]
           or {"reduce": smiles} (nitro -> amine)
out.json = [{"refused": reason|null, "product": canonical smiles, "balanced": bool, "forms_ok": bool|null, "rdkit_forms": [...], "positions": ["ortho", ...]}, ...]

Everything is rebuilt here with RDKit reaction SMARTS and RWMol edits, a different route from the JS graph writer:
  * the product: a reaction SMARTS that replaces ONE aromatic C-H by the group ([cH:1]>>[c:1]Br ...); Friedel-Crafts alkylation only matches a saturated carbon bearing Cl
    ([CX4:2][Cl:3]), acylation only an acid chloride ([CX3:2](=O)[Cl:3]); an aryl or vinylic halide therefore never matches;
  * Friedel-Crafts is refused when the ring carries NO2, C#N, SO3H or a carbonyl group (SMARTS), and when the carbocation of the halide could rearrange (1,2-H or 1,2-CH3 shift to a
    more substituted cation, counted on the graph);
  * the atom balance: product = benzene + group - H (element counts incl. hydrogens);
  * the sigma complex is built from the PRODUCT (kekulize, make the C(ipso)-C double bond a single bond, put + on that neighbour, an H on the ipso carbon) and its resonance forms
    come from RDKit's ResonanceMolSupplier; forms that also move electrons inside the group (the two drawings of NO2) are dropped. The + must sit on the ortho, para and ortho'
    carbons (graph distance 1, 3, 1 from the sp3 carbon) and on no other, and the canonical SMILES of the forms must equal the forms the JS engine claims."""
import json, sys
from rdkit import Chem
from rdkit.Chem import AllChem, rdchem
from rdkit import RDLogger
RDLogger.DisableLog('rdApp.*')

RXN = {
    "Br2": "[cH:1]>>[c:1]Br", "Cl2": "[cH:1]>>[c:1]Cl", "I2": "[cH:1]>>[c:1]I",
    "HNO3": "[cH:1]>>[c:1][N+](=O)[O-]", "SO3": "[cH:1]>>[c:1]S(=O)(=O)[OH]",
    "RCl": "[cH:1].[CX4:2][Cl:3]>>[c:1][C:2]", "RCOCl": "[cH:1].[CX3:2](=O)[Cl:3]>>[c:1][C:2]=O",
}
BLOCK = [Chem.MolFromSmarts(x) for x in ["c[N+](=O)[O-]", "cC#N", "cS(=O)(=O)[OH]", "cC=O"]]
GROUP_FORMULA = {"Br2": {"Br": 1}, "Cl2": {"Cl": 1}, "I2": {"I": 1}, "HNO3": {"N": 1, "O": 2}, "SO3": {"S": 1, "O": 3, "H": 1}}


def counts(m):
    c = {}
    mh = Chem.AddHs(m)
    for a in mh.GetAtoms():
        c[a.GetSymbol()] = c.get(a.GetSymbol(), 0) + 1
    return c


def norm(m):
    k = Chem.Mol(m)
    try:
        Chem.Kekulize(k, clearAromaticFlags=True)
    except Exception:
        pass
    return Chem.MolToSmiles(Chem.MolFromSmiles(Chem.MolToSmiles(k, kekuleSmiles=True)))


def cation_from(halide_mol):
    """R+ as an RWMol with explicit hydrogen counts (Cl removed); returns (rw, alpha index)."""
    m = Chem.Mol(halide_mol)
    cl = [a for a in m.GetAtoms() if a.GetSymbol() == "Cl"][0]
    alpha = cl.GetNeighbors()[0].GetIdx()
    rw = Chem.RWMol(m)
    for a in rw.GetAtoms():
        a.SetNumExplicitHs(a.GetTotalNumHs()); a.SetNoImplicit(True)
    rw.RemoveAtom(cl.GetIdx())
    if cl.GetIdx() < alpha:
        alpha -= 1
    return rw, alpha


def cn(m, i, skip=None):
    return [n.GetIdx() for n in m.GetAtomWithIdx(i).GetNeighbors() if n.GetSymbol() == "C" and n.GetIdx() != skip]


def would_rearrange(halide_mol):
    """Can the cation shift an H or a CH3 from a neighbouring carbon to C+ and give a DIFFERENT cation with at least as many carbon neighbours on C+? (RWMol edits)"""
    rw, alpha = cation_from(halide_mol)
    def smi(x):
        y = x.GetMol(); Chem.SanitizeMol(y); return Chem.MolToSmiles(y)
    b0 = Chem.RWMol(rw); b0.GetAtomWithIdx(alpha).SetFormalCharge(1); b0.GetAtomWithIdx(alpha).SetNumExplicitHs(rw.GetAtomWithIdx(alpha).GetNumExplicitHs())
    base = smi(b0); cls0 = len(cn(rw, alpha))
    for k in cn(rw, alpha):
        if rw.GetAtomWithIdx(k).GetNumExplicitHs() > 0:
            t = Chem.RWMol(rw)
            t.GetAtomWithIdx(alpha).SetNumExplicitHs(t.GetAtomWithIdx(alpha).GetNumExplicitHs() + 1)
            t.GetAtomWithIdx(k).SetNumExplicitHs(t.GetAtomWithIdx(k).GetNumExplicitHs() - 1); t.GetAtomWithIdx(k).SetFormalCharge(1)
            if smi(t) != base and len(cn(t, k)) >= cls0:
                return True
        for mth in cn(rw, k, alpha):
            if len(cn(rw, mth)) == 1 and rw.GetAtomWithIdx(mth).GetNumExplicitHs() == 3:
                t = Chem.RWMol(rw)
                t.RemoveBond(k, mth); t.AddBond(alpha, mth, rdchem.BondType.SINGLE); t.GetAtomWithIdx(k).SetFormalCharge(1)
                if smi(t) != base and len(cn(t, k)) >= cls0:
                    return True
    return False


def sigma_complex(product):
    """sigma complex from the aromatic product: returns (mol, ring atom indices in cycle order, ipso index)."""
    m = Chem.MolFromSmiles(product)
    ri = [r for r in m.GetRingInfo().AtomRings() if len(r) == 6 and all(m.GetAtomWithIdx(i).GetIsAromatic() for i in r)][0]
    ipso = [i for i in ri if any(n.GetIdx() not in ri for n in m.GetAtomWithIdx(i).GetNeighbors())][0]
    Chem.Kekulize(m, clearAromaticFlags=True)
    rw = Chem.RWMol(m)
    n1 = [n.GetIdx() for n in m.GetAtomWithIdx(ipso).GetNeighbors() if n.GetIdx() in ri and m.GetBondBetweenAtoms(ipso, n.GetIdx()).GetBondType() == rdchem.BondType.DOUBLE][0]
    rw.GetBondBetweenAtoms(ipso, n1).SetBondType(rdchem.BondType.SINGLE)
    rw.GetAtomWithIdx(n1).SetFormalCharge(1)
    for a in rw.GetAtoms():
        a.SetNoImplicit(False); a.SetNumExplicitHs(0)
    s = rw.GetMol()
    Chem.SanitizeMol(s, Chem.SANITIZE_ALL ^ Chem.SANITIZE_SETAROMATICITY)
    return s, list(ri), ipso


def ring_forms(product):
    s, ring, ipso = sigma_complex(product)
    sup = Chem.ResonanceMolSupplier(s)
    forms = [x for x in sup]
    q0 = [a.GetFormalCharge() for a in s.GetAtoms()]
    keep = []
    for f in forms:
        # the group must be untouched: charges outside the ring unchanged
        if all(f.GetAtomWithIdx(i).GetFormalCharge() == q0[i] for i in range(s.GetNumAtoms()) if i not in ring):
            keep.append(f)
    pos = []
    for f in keep:
        plus = [i for i in ring if f.GetAtomWithIdx(i).GetFormalCharge() == 1]
        d = min((ring.index(plus[0]) - ring.index(ipso)) % 6, (ring.index(ipso) - ring.index(plus[0])) % 6)
        pos.append({1: "ortho", 2: "meta", 3: "para"}[d])
    return sorted({norm(f) for f in keep}), pos


out = []
for c in json.load(open(sys.argv[1])):
    if "reduce" in c:
        r = AllChem.ReactionFromSmarts("[c:1][N+:2](=O)[O-]>>[c:1][N+0:2]")
        m = Chem.MolFromSmiles(c["reduce"])
        ps = {Chem.MolToSmiles(p[0]) for p in (lambda ps: [[Chem.MolFromSmiles(Chem.MolToSmiles(x)) for x in tup] for tup in ps])(r.RunReactants((m,)))}
        out.append({"product": sorted(ps)[0] if ps else None, "all": sorted(ps)})
        continue
    res = {"refused": None, "product": None, "balanced": None, "forms_ok": None, "rdkit_forms": [], "positions": []}
    arene = Chem.MolFromSmiles(c["arene"])
    rg = c["reagent"]
    fc = rg in ("RCl", "RCOCl")
    benz = Chem.MolToSmiles(arene) == "c1ccccc1"
    if not benz:
        res["refused"] = "deactivated" if fc and any(arene.HasSubstructMatch(b) for b in BLOCK) else "notbenzene"
        out.append(res); continue
    if fc:
        hal = Chem.MolFromSmiles(c["halide"])
        pat = Chem.MolFromSmarts("[CX4][Cl]" if rg == "RCl" else "[CX3](=O)[Cl]")
        if not hal.HasSubstructMatch(pat):
            res["refused"] = "nomatch"; out.append(res); continue
        if rg == "RCl" and would_rearrange(hal):
            res["refused"] = "rearranges"; out.append(res); continue
        prods = AllChem.ReactionFromSmarts(RXN[rg]).RunReactants((arene, hal))
    else:
        prods = AllChem.ReactionFromSmarts(RXN[rg]).RunReactants((arene,))
    ps = set()
    for tup in prods:
        p = tup[0]
        Chem.SanitizeMol(p)
        ps.add(Chem.MolToSmiles(p))
    if len(ps) != 1:
        res["refused"] = "products:%d" % len(ps); out.append(res); continue
    prod = list(ps)[0]
    res["product"] = prod
    pm = Chem.MolFromSmiles(prod)
    want = counts(arene)
    if fc:
        hc = counts(Chem.MolFromSmiles(c["halide"]))
        for k, v in hc.items():
            if k != "Cl":
                want[k] = want.get(k, 0) + v
        want["H"] -= 1
    else:
        for k, v in GROUP_FORMULA[rg].items():
            want[k] = want.get(k, 0) + v
        want["H"] -= 1
    res["balanced"] = counts(pm) == {k: v for k, v in want.items() if v}
    forms, pos = ring_forms(prod)
    res["rdkit_forms"], res["positions"] = forms, pos
    if c.get("forms") is not None:
        mine = sorted({norm(Chem.MolFromSmiles(f)) for f in c["forms"]})
        res["forms_ok"] = mine == forms and sorted(pos) == ["ortho", "ortho", "para"]
    out.append(res)
json.dump(out, open(sys.argv[2], "w"))
