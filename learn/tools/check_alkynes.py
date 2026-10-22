#!/usr/bin/env python3
"""Independent check of the alkyne products of learn/engine/reactions-alkynes.js.
usage: check_alkynes.py in.json out.json
in.json  = [{"alkyne": smiles, "key": "HBr_1" | "HBr_2" | "HCl_1" ... | "Br2_1" | "Br2_2" | "Cl2_1" | "Cl2_2" | "H2O_Hg" | "H2_Lindlar" | "H2_Pd"}, ...]
out.json = [{"alkyne", "key", "refused": reason | null, "products": [isomeric SMILES, sorted], "outcome": "single" | "mixture", "stereo": "E" | "Z" | null,
             "dihedral": degrees | null, "cip": "E" | "Z" | null, "balanced": bool}]

The products are built here with RWMol edits (bond orders, new atoms, explicit bond stereo), a different route from the JS graph writer:
  * Markovnikov carbon = the triple-bond carbon with more heavy-atom neighbours (terminal alkyne: the carbon that bears the H is the OTHER one); a symmetrical internal alkyne
    has two equal choices; an unsymmetrical internal alkyne is refused for HX and gives a mixture for hydration.
  * HX 1 equiv: C=C with X on the Markovnikov carbon (no E/Z claimed); 2 equiv: both X on that carbon, C-C single.
  * X2 1 equiv: X on both carbons, C=C, the two X trans (anti); the geometry is checked in 3D (X-C=C-X dihedral near 180) and with the new RDKit CIP labeler (E); 2 equiv: 1,1,2,2-tetrahalide.
  * H2O / HgSO4: ketone on the Markovnikov carbon (both ketones for an unsymmetrical internal alkyne); acetylene is refused (it would give an aldehyde).
  * Lindlar: C=C with the two alkyl groups cis (3D dihedral near 0, CIP label Z); Pd/C 2 H2: alkane.
Each product's atom counts are also checked against alkyne + reagent."""
import json, sys
from rdkit import Chem
from rdkit.Chem import AllChem, rdMolTransforms, rdCIPLabeler

HALOGEN = {"Cl": 17, "Br": 35, "I": 53}


def heavy_nbrs(m, i, excl):
    return [n.GetIdx() for n in m.GetAtomWithIdx(i).GetNeighbors() if n.GetIdx() != excl]


def triple(m):
    ts = [b for b in m.GetBonds() if b.GetBondType() == Chem.BondType.TRIPLE]
    assert len(ts) == 1
    return ts[0].GetBeginAtomIdx(), ts[0].GetEndAtomIdx()


def finish(rw):
    m = rw.GetMol()
    Chem.SanitizeMol(m)
    return m


def flat_smiles(m):
    m2 = Chem.Mol(m)
    Chem.RemoveStereochemistry(m2)
    return Chem.MolToSmiles(m2)


def add_atom(rw, sym_or_z, to, order=Chem.BondType.SINGLE):
    z = HALOGEN[sym_or_z] if sym_or_z in HALOGEN else (8 if sym_or_z == "O" else None)
    idx = rw.AddAtom(Chem.Atom(z))
    rw.AddBond(to, idx, order)
    return idx


def element_counts(m):
    mh = Chem.AddHs(m)
    c = {}
    for a in mh.GetAtoms():
        c[a.GetSymbol()] = c.get(a.GetSymbol(), 0) + 1
    return c


def reagent_counts(key):
    n = {"H2O_Hg": {"H": 2, "O": 1}, "H2_Lindlar": {"H": 2}, "H2_Pd": {"H": 4}}
    if key in n:
        return n[key]
    base, eq = key.split("_")
    eq = int(eq)
    if base.startswith("H"):   # HX
        return {"H": eq, base[1:]: eq}
    return {base[:-1]: 2 * eq}   # X2


def run(case):
    alkyne, key = case["alkyne"], case["key"]
    m = Chem.MolFromSmiles(alkyne)
    a, b = triple(m)
    na, nb = len(heavy_nbrs(m, a, b)), len(heavy_nbrs(m, b, a))
    out = {"alkyne": alkyne, "key": key, "refused": None, "products": [], "outcome": "single", "stereo": None, "dihedral": None, "cip": None, "balanced": None}
    # Markovnikov carbon: the one with more heavy neighbours (alkyl groups); the other bears the H of a terminal alkyne
    terminal_both = (na == 0 and nb == 0)
    sym = None
    if na != nb:
        pC, hC = (a, b) if na > nb else (b, a)
    else:
        pC, hC = a, b
        sym = True

    def build(kind, at=None, X=None, anti=None):
        rw = Chem.RWMol(m)
        bd = rw.GetBondBetweenAtoms(a, b)
        if kind == "vinyl":
            bd.SetBondType(Chem.BondType.DOUBLE); add_atom(rw, X, at)
        elif kind == "gem":
            bd.SetBondType(Chem.BondType.SINGLE); add_atom(rw, X, at); add_atom(rw, X, at)
        elif kind == "vic":
            bd.SetBondType(Chem.BondType.DOUBLE); xa = add_atom(rw, X, a); xb = add_atom(rw, X, b)
            mm = finish(rw)
            bond = mm.GetBondBetweenAtoms(a, b)
            bond.SetStereoAtoms(xa, xb)
            bond.SetStereo(Chem.BondStereo.STEREOTRANS if anti else Chem.BondStereo.STEREOCIS)
            return mm, (xa, xb)
        elif kind == "tetra":
            bd.SetBondType(Chem.BondType.SINGLE)
            for c in (a, b):
                add_atom(rw, X, c); add_atom(rw, X, c)
        elif kind == "ketone":
            bd.SetBondType(Chem.BondType.SINGLE); add_atom(rw, "O", at, Chem.BondType.DOUBLE)
        elif kind == "alkane":
            bd.SetBondType(Chem.BondType.SINGLE)
        elif kind == "cisalkene":
            bd.SetBondType(Chem.BondType.DOUBLE)
            mm = finish(rw)
            sa = heavy_nbrs(mm, a, b); sb = heavy_nbrs(mm, b, a)
            plain = mm
            if sa and sb:
                bond = plain.GetBondBetweenAtoms(a, b)
                bond.SetStereoAtoms(sa[0], sb[0]); bond.SetStereo(Chem.BondStereo.STEREOCIS)
                return plain, (sa[0], sb[0])
            return plain, None
        return finish(rw), None

    kind = key.split("_")[0]
    if key in ("HCl_1", "HCl_2", "HBr_1", "HBr_2", "HI_1", "HI_2"):
        X = key[1:].split("_")[0]
        eq = int(key.split("_")[1])
        if sym and not terminal_both:
            # internal alkyne: symmetrical only if both choices are the same compound
            p1 = flat_smiles(build("vinyl", a, X)[0]); p2 = flat_smiles(build("vinyl", b, X)[0])
            if p1 != p2:
                out["refused"] = "unsymmetrical internal alkyne with HX"; return out
        mol = build("vinyl", pC, X)[0] if eq == 1 else build("gem", pC, X)[0]
        prods = [mol]
    elif key in ("Br2_1", "Cl2_1"):
        X = "Br" if key.startswith("Br") else "Cl"
        mol, xs = build("vic", X=X, anti=True)
        # 3D check: X-C=C-X dihedral
        mh = Chem.AddHs(mol)
        assert AllChem.EmbedMolecule(mh, randomSeed=7) == 0
        conf = mh.GetConformer()
        out["dihedral"] = rdMolTransforms.GetDihedralDeg(conf, xs[0], a, b, xs[1])
        m2 = Chem.Mol(mol); rdCIPLabeler.AssignCIPLabels(m2)
        bd = m2.GetBondBetweenAtoms(a, b)
        out["cip"] = bd.GetProp("_CIPCode") if bd.HasProp("_CIPCode") else None
        out["stereo"] = "E"
        prods = [mol]
    elif key in ("Br2_2", "Cl2_2"):
        X = "Br" if key.startswith("Br") else "Cl"
        prods = [build("tetra", X=X)[0]]
    elif key == "H2O_Hg":
        if terminal_both:
            out["refused"] = "acetylene gives an aldehyde"; return out
        if sym:
            p1 = flat_smiles(build("ketone", a)[0]); p2 = flat_smiles(build("ketone", b)[0])
            if p1 != p2:
                prods = [build("ketone", a)[0], build("ketone", b)[0]]; out["outcome"] = "mixture"
            else:
                prods = [build("ketone", pC)[0]]
        else:
            prods = [build("ketone", pC)[0]]
    elif key == "H2_Lindlar":
        mol, refs = build("cisalkene")
        if refs:
            mh = Chem.AddHs(mol)
            assert AllChem.EmbedMolecule(mh, randomSeed=7) == 0
            out["dihedral"] = rdMolTransforms.GetDihedralDeg(mh.GetConformer(), refs[0], a, b, refs[1])
            m2 = Chem.Mol(mol); rdCIPLabeler.AssignCIPLabels(m2)
            bd = m2.GetBondBetweenAtoms(a, b)
            out["cip"] = bd.GetProp("_CIPCode") if bd.HasProp("_CIPCode") else None
            out["stereo"] = "Z"
        prods = [mol]
    elif key == "H2_Pd":
        prods = [build("alkane")[0]]
    else:
        raise SystemExit("unknown key " + key)
    def smi(p):
        q = Chem.Mol(p); q.ClearComputedProps(); Chem.AssignStereochemistry(q, cleanIt=False, force=True)
        return Chem.MolToSmiles(q)
    out["products"] = sorted(smi(p) for p in prods)
    # balance: every product = alkyne + reagent
    want = element_counts(m)
    for k, v in reagent_counts(key).items():
        want[k] = want.get(k, 0) + v
    out["balanced"] = all(element_counts(p) == want for p in prods)
    return out


cases = json.load(open(sys.argv[1]))
json.dump([run(c) for c in cases], open(sys.argv[2], "w"))
