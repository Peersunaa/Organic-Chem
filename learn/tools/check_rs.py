#!/usr/bin/env python3
"""Independent CIP check for learn/tests (Lesson 15).
usage: check_rs.py in.json out.json
in.json  = {"smiles": [...], "wedges": [molblock, ...], "models": {id: molblock, ...}}
out.json = {"smiles": {smi: {"cip": {atom: "R"|"S"}, "centers": [atom, ...]}},
            "wedges": [{"cip": {atom: "R"|"S"}}, ...],
            "models": {id: {"cip": {atom: "R"|"S"}}}}
smiles : R/S from RDKit's NEW CIP labeler (rdCIPLabeler.AssignCIPLabels) and the chirality centres from
         Chem.FindMolChiralCenters(includeUnassigned=True, useLegacyImplementation=False)
wedges : the 2D molblock of a wedge/dash drawing (hydrogens kept), read back by RDKit: R/S of the configuration the picture really shows
models : 3D molblocks: the configuration is read from the coordinates (AssignStereochemistryFrom3D), so a mirror image must give the opposite letter."""
import json, sys
from rdkit import Chem
from rdkit.Chem import rdCIPLabeler
from rdkit import RDLogger
RDLogger.DisableLog("rdApp.*")

def labels(m):
    rdCIPLabeler.AssignCIPLabels(m)
    return {str(a.GetIdx()): a.GetProp("_CIPCode") for a in m.GetAtoms() if a.HasProp("_CIPCode")}

data = json.load(open(sys.argv[1]))
out = {"smiles": {}, "wedges": [], "models": {}}
for smi in data.get("smiles", []):
    m = Chem.MolFromSmiles(smi)
    if m is None:
        out["smiles"][smi] = None
        continue
    centers = [i for i, _ in Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False)]
    out["smiles"][smi] = {"cip": labels(m), "centers": sorted(centers)}
for mb in data.get("wedges", []):
    m = Chem.MolFromMolBlock(mb, removeHs=False)
    out["wedges"].append(None if m is None else {"cip": labels(m)})
for mid, mb in data.get("models", {}).items():
    m = Chem.MolFromMolBlock(mb, removeHs=False)
    if m is None:
        out["models"][mid] = None
        continue
    Chem.AssignStereochemistryFrom3D(m)
    out["models"][mid] = {"cip": labels(m)}
json.dump(out, open(sys.argv[2], "w"))
