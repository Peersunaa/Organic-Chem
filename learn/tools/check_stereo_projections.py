#!/usr/bin/env python3
"""Independent check for the "stereo-projections" drill (learn/engine/generators-stereo-projections.js). Nothing here shares code with the engine.
usage: check_stereo_projections.py in.json out.json

in.json  = { "stack":  [{"id", "top": frag, "bottom": frag, "rows": [{"left": frag, "right": frag}, ...], "smiles"}],   two-centre Fischer projections
             "newman": [{"id", "front": [{"ang", "frag"} x3], "back": [{"ang", "frag"} x3], "smiles"}],                 Newman projections (screen angles)
             "smiles": [smiles, ...] }                                                                                   CIP letters of plain SMILES
             frag = SMILES of a group written outward from the centre (its first atom is bonded to the centre), '[H]' for hydrogen.
out.json = { "stack":  [{"id", "d3": {"cip": [...], "smi"}, "smiles": {"cip": [...], "smi"}}],   cip = letters of the centres, in the order drawn top to bottom
             "newman": [{"id", "d3": {"cip": [front, rear], "smi"}, "smiles": {"cip", "smi"}}],
             "smiles": {smiles: {"cip": [...], "smi"}} }

Method: each drawing is turned into 3D coordinates by the textbook geometry, chirality is read from the coordinates (AssignStereochemistryFrom3D), the letters
come from the NEW CIP labeler (rdCIPLabeler), and the canonical SMILES is compared with the one the generator wrote for the drawing:
  stack  : the eclipsed conformation a Fischer projection stands for. The vertical C-C chain lies in the page; at every centre the horizontal groups point
           toward the viewer (z > 0) and the vertical (chain-end) groups away from the viewer (z < 0), tetrahedral angles, viewer on +z, x to the right, y up.
  newman : viewer on +z looking down the C-C bond; the front carbon is nearer the viewer (z > 0), the rear carbon behind it; a front group at screen angle t
           (counter-clockwise from the right) sits at (R cos t, R sin t, +1/3) from the front carbon, a rear group at (R cos t, R sin t, -1/3) from the rear carbon."""
import json, sys, math
from rdkit import Chem
from rdkit.Chem import rdCIPLabeler
from rdkit.Geometry import Point3D
from rdkit import RDLogger
RDLogger.DisableLog("rdApp.*")

TY = 1.0 / 3.0
TR = math.sqrt(8.0) / 3.0

def cips(m):
    """Letters of every stereocentre, in atom order."""
    rdCIPLabeler.AssignCIPLabels(m)
    return [a.GetProp("_CIPCode") for a in m.GetAtoms() if a.HasProp("_CIPCode")]

def finish(m):
    m = Chem.RemoveHs(m)
    return {"cip": cips(m), "smi": Chem.MolToSmiles(m)}

def via_smiles(smi):
    m = Chem.MolFromSmiles(smi)
    return None if m is None else {"cip": cips(m), "smi": Chem.MolToSmiles(m)}

class Builder:
    """RWMol with the centres first, then groups; each group's first atom gets the given coordinates, further atoms are pushed outward."""
    def __init__(self, n_centres):
        self.rw = Chem.RWMol()
        for _ in range(n_centres):
            self.rw.AddAtom(Chem.Atom(6))
        self.pos = {i: None for i in range(n_centres)}
        self.groups = []
    def bond(self, a, b):
        self.rw.AddBond(a, b, Chem.BondType.SINGLE)
    def group(self, centre, frag, xyz, outward):
        f = Chem.MolFromSmiles(frag)
        if f is None:
            raise ValueError("bad fragment " + frag)
        off = self.rw.GetNumAtoms()
        self.rw.InsertMol(f)
        self.rw.AddBond(centre, off, Chem.BondType.SINGLE)
        self.groups.append((off, f.GetNumAtoms(), xyz, outward))
    def finish(self, centres_xyz):
        n = self.rw.GetNumAtoms()
        conf = Chem.Conformer(n)
        conf.Set3D(True)
        for i, p in enumerate(centres_xyz):
            conf.SetAtomPosition(i, Point3D(*p))
        for off, cnt, xyz, outward in self.groups:
            for i in range(cnt):
                d = 1.0 + 0.9 * i
                conf.SetAtomPosition(off + i, Point3D(*[xyz[k] + outward[k] * 0.9 * i + (0.3 if (i % 2 and k == 0) else 0.0) for k in range(3)]))
        self.rw.AddConformer(conf, assignId=True)
        m = self.rw.GetMol()
        Chem.SanitizeMol(m)
        Chem.AssignStereochemistryFrom3D(m)
        return m

def stack_3d(case):
    rows = case["rows"]
    b = Builder(len(rows))
    ys = [-float(k) for k in range(len(rows))]
    for k in range(len(rows) - 1):
        b.bond(k, k + 1)
    s60, c60 = math.sin(math.pi / 3), 0.5
    def at(k, x, dy, z):
        return [x, ys[k] + dy, z]
    # chain-end groups: away from the viewer
    b.group(0, case["top"], at(0, 0.0, TY, -TR), [0, 0.3, -1.0])
    b.group(len(rows) - 1, case["bottom"], at(len(rows) - 1, 0.0, -TY, -TR), [0, -0.3, -1.0])
    for k, r in enumerate(rows):
        dy = TY if k == 0 else -TY       # the first centre's groups sit above its bond to the next centre, the others below the bond from the previous one
        if k == 0 and len(rows) > 1:
            dy = TY
        b.group(k, r["left"], at(k, -TR * s60, dy, TR * c60), [-1.0, 0.0, 0.3])
        b.group(k, r["right"], at(k, TR * s60, dy, TR * c60), [1.0, 0.0, 0.3])
    return finish_mol(b, [[0.0, y, 0.0] for y in ys])

def finish_mol(b, centres):
    return finish(b.finish(centres))

def newman_3d(case):
    b = Builder(2)
    b.bond(0, 1)
    F, Bk = [0.0, 0.0, 0.77], [0.0, 0.0, -0.77]
    for g in case["front"]:
        t = math.radians(g["ang"])
        b.group(0, g["frag"], [TR * math.cos(t), TR * math.sin(t), F[2] + TY], [math.cos(t), math.sin(t), 0.3])
    for g in case["back"]:
        t = math.radians(g["ang"])
        b.group(1, g["frag"], [TR * math.cos(t), TR * math.sin(t), Bk[2] - TY], [math.cos(t), math.sin(t), -0.3])
    return finish_mol(b, [F, Bk])

data = json.load(open(sys.argv[1], encoding="utf-8"))
out = {"stack": [], "newman": [], "smiles": {}}
for c in data.get("stack", []):
    out["stack"].append({"id": c["id"], "d3": stack_3d(c), "smiles": via_smiles(c["smiles"])})
for c in data.get("newman", []):
    out["newman"].append({"id": c["id"], "d3": newman_3d(c), "smiles": via_smiles(c["smiles"])})
for s in data.get("smiles", []):
    out["smiles"][s] = via_smiles(s)
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"))
