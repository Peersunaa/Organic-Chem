#!/usr/bin/env python3
"""Independent check for the Fischer projections of Lesson 16 (learn/engine/fischer.js).
usage: check_fischer.py in.json out.json
in.json  = {"cases": [{"id", "groups": {"top": frag, "right": frag, "bottom": frag, "left": frag}, "smiles": js_smiles}, ...]}
           frag = SMILES of a group written outward from the centre (its FIRST atom is bonded to the stereocentre), '[H]' for hydrogen.
out.json = {"cases": [{"id", "wedge": {"cip", "smi"}, "d3": {"cip", "smi"}, "smiles": {"cip", "smi"}}, ...]}
Every case is read back three independent ways with RDKit, none of which uses the JavaScript R/S rule:
 wedge  : a 2D molblock of the textbook drawing (cross; vertical bonds hashed = away from you, horizontal bonds wedged = toward you),
          chirality from the wedge/hash flags (AssignChiralTypesFromBondDirs), label from the NEW CIP labeler (rdCIPLabeler);
 d3     : the same drawing as 3D coordinates (vertical groups at z = -1, horizontal groups at z = +1), chirality from the coordinates;
 smiles : the SMILES the JavaScript wrote for the drawing, label from rdCIPLabeler.
'cip' is the letter at the stereocentre (None when RDKit sees no stereocentre), 'smi' the canonical isomeric SMILES."""
import json, sys
from rdkit import Chem
from rdkit.Chem import rdCIPLabeler
from rdkit.Geometry import Point3D
from rdkit import RDLogger
RDLogger.DisableLog("rdApp.*")

XY = {"top": (0.0, 1.0), "right": (1.0, 0.0), "bottom": (0.0, -1.0), "left": (-1.0, 0.0)}
VERT = {"top", "bottom"}

def build(groups):
    """RWMol: centre atom 0, then the four fragments in the order top, right, bottom, left. Returns (mol, {pos: index of first atom}, {atom: pos})."""
    rw = Chem.RWMol()
    rw.AddAtom(Chem.Atom(6))
    first, owner = {}, {}
    for pos in ("top", "right", "bottom", "left"):
        frag = Chem.MolFromSmiles(groups[pos])
        if frag is None:
            raise ValueError("bad fragment " + groups[pos])
        off = rw.GetNumAtoms()
        rw.InsertMol(frag)
        for i in range(frag.GetNumAtoms()):
            owner[off + i] = (pos, i)
        first[pos] = off
        rw.AddBond(0, off, Chem.BondType.SINGLE)
    return rw, first, owner

def positions(mol, first, owner, three_d):
    conf = Chem.Conformer(mol.GetNumAtoms())
    conf.Set3D(three_d)
    conf.SetAtomPosition(0, Point3D(0, 0, 0))
    for a in range(1, mol.GetNumAtoms()):
        pos, i = owner[a]
        x, y = XY[pos]
        z = (-1.0 if pos in VERT else 1.0) if three_d else 0.0
        # first atom of the group at distance 1; further atoms of the group lie further out, spread sideways so no two coincide
        px, py = -y, x
        d = 1.0 + 0.8 * i
        conf.SetAtomPosition(a, Point3D(x * d + px * 0.35 * (i % 2) * 1.0, y * d + py * 0.35 * (i % 2) * 1.0, z * (1.0 if three_d else 0.0)))
    return conf

def letter(m):
    rdCIPLabeler.AssignCIPLabels(m)
    labs = [a.GetProp("_CIPCode") for a in m.GetAtoms() if a.HasProp("_CIPCode")]
    return labs[0] if len(labs) == 1 else (None if not labs else "many")

def finish(m):
    m = Chem.RemoveHs(m)
    return {"cip": letter(m), "smi": Chem.MolToSmiles(m)}

def via_wedge(groups):
    rw, first, owner = build(groups)
    conf = positions(rw, first, owner, False)
    rw.AddConformer(conf, assignId=True)
    for pos, a in first.items():
        b = rw.GetBondBetweenAtoms(0, a)
        if b.GetBeginAtomIdx() != 0:
            raise ValueError("bond must begin at the centre")
        b.SetBondDir(Chem.BondDir.BEGINDASH if pos in VERT else Chem.BondDir.BEGINWEDGE)
    m = rw.GetMol()
    Chem.SanitizeMol(m)
    Chem.AssignChiralTypesFromBondDirs(m, m.GetConformer().GetId(), True)
    Chem.AssignStereochemistry(m, cleanIt=True, force=True)
    return finish(m)

def via_3d(groups):
    rw, first, owner = build(groups)
    conf = positions(rw, first, owner, True)
    rw.AddConformer(conf, assignId=True)
    m = rw.GetMol()
    Chem.SanitizeMol(m)
    Chem.AssignStereochemistryFrom3D(m)
    return finish(m)

def via_smiles(smi):
    m = Chem.MolFromSmiles(smi)
    return None if m is None else {"cip": letter(m), "smi": Chem.MolToSmiles(m)}

data = json.load(open(sys.argv[1], encoding="utf-8"))
out = {"cases": []}
for c in data["cases"]:
    out["cases"].append({"id": c["id"], "wedge": via_wedge(c["groups"]), "d3": via_3d(c["groups"]), "smiles": via_smiles(c["smiles"])})
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"))
