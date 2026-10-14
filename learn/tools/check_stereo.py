#!/usr/bin/env python3
"""Independent CIP check for learn/tests (Lesson 07).
usage: check_stereo.py in.json out.json
in.json  = ["smiles", ...]
out.json = {"smiles": {"ez": {"a-b": "E"|"Z"}, "potential": ["a-b", ...]}}   (a < b are atom indices of the SMILES as written)
ez        : bond labels from RDKit's NEW CIP labeler (rdCIPLabeler.AssignCIPLabels)
potential : double bonds RDKit's FindPotentialStereo says can be stereogenic (each carbon has two different groups)."""
import json, sys
from rdkit import Chem
from rdkit.Chem import rdCIPLabeler

res = {}
for smi in json.load(open(sys.argv[1])):
    m = Chem.MolFromSmiles(smi)
    if m is None:
        res[smi] = None
        continue
    rdCIPLabeler.AssignCIPLabels(m)
    ez = {}
    for b in m.GetBonds():
        if b.GetBondType() == Chem.BondType.DOUBLE and b.HasProp("_CIPCode"):
            a, c = sorted((b.GetBeginAtomIdx(), b.GetEndAtomIdx()))
            ez[f"{a}-{c}"] = b.GetProp("_CIPCode")
    pot = []
    for si in Chem.FindPotentialStereo(m):
        if si.type == Chem.StereoType.Bond_Double:
            bd = m.GetBondWithIdx(si.centeredOn)
            a, c = sorted((bd.GetBeginAtomIdx(), bd.GetEndAtomIdx()))
            pot.append(f"{a}-{c}")
    res[smi] = {"ez": ez, "potential": sorted(set(pot))}
json.dump(res, open(sys.argv[2], "w"))
