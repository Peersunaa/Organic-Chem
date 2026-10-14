#!/usr/bin/env python3
"""Independent check of the resonance sets of learn/engine/resonance.js against RDKit's ResonanceMolSupplier.
usage: check_resonance.py in.json out.json
in.json  = [{"id": str, "trap": cand_smiles, "start": smiles} (trap check)  |  {"id": str, "start": {state}, "forms": [{state}, ...], "mode": "default"|"kekule", "sep": bool, "fold": bool}, ...]
 state = {"el": ["C", ...], "impH": [...], "charge": [...], "bonds": [{"a":0,"b":1,"order":2}, ...]}  (atom order = the lesson's atom order)
out.json = {id: {"rdkit_count", "rdkit_smiles": [...], "claimed_count", "claimed_smiles": [...], "missing_in_rdkit": [...], "missing_in_claimed": [...], "ok": bool}}
Comparison is by canonical SMILES with charges AND by atom index (charge pattern + Kekule bond orders per atom pair, since a resonance form never moves an atom).
`fold` (benzyl cation): the two Kekule drawings of the ring in one form are counted once, i.e. forms are compared by charge pattern + canonical SMILES."""
import json, sys
from rdkit import Chem
from rdkit.Chem import rdchem

SYM = {"H": 1, "C": 6, "N": 7, "O": 8, "F": 9, "S": 16, "Cl": 17, "Br": 35, "I": 53}
BT = {1: rdchem.BondType.SINGLE, 2: rdchem.BondType.DOUBLE, 3: rdchem.BondType.TRIPLE}

def build(state):
    rw = Chem.RWMol()
    for el, h, q in zip(state["el"], state["impH"], state["charge"]):
        a = Chem.Atom(SYM[el]); a.SetFormalCharge(q); a.SetNumExplicitHs(h); a.SetNoImplicit(True)
        rw.AddAtom(a)
    for b in state["bonds"]:
        rw.AddBond(b["a"], b["b"], BT[b["order"]])
    m = rw.GetMol()
    # keep the Kekule bond orders exactly as written (no aromaticity perception): a form is an assignment of charges and bond orders to FIXED atoms
    Chem.SanitizeMol(m, Chem.SANITIZE_ALL ^ Chem.SANITIZE_SETAROMATICITY ^ Chem.SANITIZE_KEKULIZE)
    return m

def key(m, fold=False):
    """charges + bond orders by atom pair, read straight from the bond types (RDKit's resonance mols keep one Kekule order per bond)."""
    ch = tuple(a.GetFormalCharge() for a in m.GetAtoms())
    if fold: return (ch,)
    bo = tuple(sorted((min(b.GetBeginAtomIdx(), b.GetEndAtomIdx()), max(b.GetBeginAtomIdx(), b.GetEndAtomIdx()), {rdchem.BondType.SINGLE: 1, rdchem.BondType.DOUBLE: 2, rdchem.BondType.TRIPLE: 3}.get(b.GetBondType(), 0)) for b in m.GetBonds()))
    return (ch, bo)

def norm(m):
    """canonical SMILES with charges, the same pipeline for both sides: Kekule SMILES, re-parsed, written canonically."""
    k = Chem.Mol(m)
    try: Chem.Kekulize(k, clearAromaticFlags=True)
    except Exception: pass
    return Chem.MolToSmiles(Chem.MolFromSmiles(Chem.MolToSmiles(k, kekuleSmiles=True)))

def rdkit_forms(m, mode, sep):
    F = Chem.ResonanceFlags
    flags = (F.KEKULE_ALL if mode == "kekule" else 0) | (F.ALLOW_CHARGE_SEPARATION if sep else 0)
    sup = Chem.ResonanceMolSupplier(m, flags)
    return [x for x in sup]

def skeleton(smi):
    """Atoms (with every hydrogen explicit) and which atoms are bonded; bond orders and charges ignored. None if RDKit refuses the structure."""
    m = Chem.MolFromSmiles(smi)
    if m is None: return None
    m = Chem.AddHs(m)
    rw = Chem.RWMol()
    for a in m.GetAtoms(): rw.AddAtom(Chem.Atom(a.GetAtomicNum()))
    for b in m.GetBonds(): rw.AddBond(b.GetBeginAtomIdx(), b.GetEndAtomIdx(), rdchem.BondType.SINGLE)
    return Chem.MolToSmiles(rw.GetMol(), canonical=True)

def counts(m):
    c = {}
    for a in m.GetAtoms():
        c[a.GetSymbol()] = c.get(a.GetSymbol(), 0) + 1
        c["H"] = c.get("H", 0) + a.GetTotalNumHs()
    return c

def judge_trap(start, cand):
    """Independent facts about a candidate resonance form: does RDKit accept it, same formula (incl. H), same skeleton, same total charge."""
    a = Chem.MolFromSmiles(start)
    out = {"parses": True, "formula_same": None, "skeleton_same": None, "charge_same": None}
    b = Chem.MolFromSmiles(cand)
    if b is None:
        # a structure RDKit refuses (a carbon with five bonds): read it without sanitising
        out["parses"] = False
        b = Chem.MolFromSmiles(cand, sanitize=False)
        if b is None: return out
        b.UpdatePropertyCache(strict=False)
    out["formula_same"] = counts(a) == counts(b)
    out["charge_same"] = sum(x.GetFormalCharge() for x in a.GetAtoms()) == sum(x.GetFormalCharge() for x in b.GetAtoms())
    if out["parses"]: out["skeleton_same"] = skeleton(start) == skeleton(cand)
    return out

res = {}
for c in json.load(open(sys.argv[1])):
    if "trap" in c:
        res[c["id"]] = judge_trap(c["start"], c["trap"])
        continue
    start = build(c["start"]); mode = c.get("mode", "default"); fold = c.get("fold", False)
    mine = [build(f) for f in c["forms"]]
    theirs = rdkit_forms(start, mode, c.get("sep", False))
    # RDKit lists the same pattern once per distinct index pattern; the supplier's own order is not meaningful
    tk = {key(m_, fold) for m_ in theirs}
    mk = {key(m_, fold) for m_ in mine}
    # canonical SMILES (charges included) as the second, index-free comparison
    tsm = sorted({norm(m_) for m_ in theirs}); msm = sorted({norm(m_) for m_ in mine})
    miss_r = [list(map(str, k)) for k in mk - tk] if not fold else [str(k) for k in mk - tk]
    miss_c = [str(k) for k in tk - mk]
    ok = not (mk - tk) and not (tk - mk) and tsm == msm
    res[c["id"]] = {"rdkit_count": len(tk), "claimed_count": len(mk), "rdkit_smiles": tsm, "claimed_smiles": msm,
                    "missing_in_rdkit": [str(x) for x in (mk - tk)], "missing_in_claimed": [str(x) for x in (tk - mk)], "ok": ok}
json.dump(res, open(sys.argv[2], "w"))
