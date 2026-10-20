#!/usr/bin/env python3
"""Independent read-back of every reaction-builder product (learn/engine/builder.js).
usage: check_builder.py in.json out.json
in.json  = {"mols": [{"smiles", "counts": {element: n}}], "same": [[smilesA, smilesB], ...], "stereo": [smiles, ...]}
out.json = {"mols": [{"smiles", "ok", "counts_ok", "canon_stable"}], "same": [bool], "stereo": [{"smiles", "ez": [...], "centres": [...], "cistrans"}]}
Python RDKit only: parse, element counts with every H made explicit (D counted as H), canonical SMILES stable on a round trip; "same" compares two SMILES
by Python canonical SMILES (the professor's fixtures, written in the test as text); "stereo" gives E/Z (new CIP labeller) and ring cis/trans from 3D."""
import json, sys
import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem, rdCIPLabeler
from rdkit import RDLogger
RDLogger.DisableLog("rdApp.*")


def counts(m):
    mh = Chem.AddHs(m)
    c = {}
    for a in mh.GetAtoms():
        s = a.GetSymbol()
        c[s] = c.get(s, 0) + 1
    return c


def can(s):
    m = Chem.MolFromSmiles(s)
    return Chem.MolToSmiles(m) if m is not None else None


def cistrans(m):
    centres = [a.GetIdx() for a in m.GetAtoms() if a.HasProp("_CIPCode")]
    if len(centres) != 2:
        return None
    ring = None
    for r in m.GetRingInfo().AtomRings():
        if centres[0] in r and centres[1] in r:
            ring = list(r)
            break
    if ring is None:
        return None
    subs = {}
    for c in centres:
        ex = [n.GetIdx() for n in m.GetAtomWithIdx(c).GetNeighbors() if n.GetIdx() not in ring and n.GetAtomicNum() > 1]
        if len(ex) != 1:
            return None
        subs[c] = ex[0]
    mh = Chem.AddHs(m)
    if AllChem.EmbedMolecule(mh, randomSeed=7) != 0:
        return None
    pos = mh.GetConformer().GetPositions()
    side = {}
    for c in centres:
        k = ring.index(c)
        v = np.dot(np.cross(pos[ring[k - 1]] - pos[c], pos[ring[(k + 1) % len(ring)]] - pos[c]), pos[subs[c]] - pos[c])
        side[c] = 1 if v > 0 else -1
    return "cis" if side[centres[0]] == side[centres[1]] else "trans"


def stereo(s):
    m = Chem.MolFromSmiles(s)
    if m is None:
        return {"smiles": s, "ok": False}
    rdCIPLabeler.AssignCIPLabels(m)
    return {"smiles": s, "ok": True, "ez": [b.GetProp("_CIPCode") for b in m.GetBonds() if b.HasProp("_CIPCode")],
            "centres": [a.GetProp("_CIPCode") for a in m.GetAtoms() if a.HasProp("_CIPCode")], "cistrans": cistrans(m)}


data = json.load(open(sys.argv[1], encoding="utf-8"))
out = {"mols": [], "same": [], "stereo": []}
for x in data.get("mols", []):
    m = Chem.MolFromSmiles(x["smiles"])
    if m is None:
        out["mols"].append({"smiles": x["smiles"], "ok": False})
        continue
    c1 = Chem.MolToSmiles(m)
    out["mols"].append({"smiles": x["smiles"], "ok": True, "counts_ok": counts(m) == {k: v for k, v in x["counts"].items() if v}, "canon_stable": can(c1) == c1, "counts": counts(m)})
for a, b in data.get("same", []):
    ca, cb = can(a), can(b)
    out["same"].append(ca is not None and ca == cb)
for s in data.get("stereo", []):
    out["stereo"].append(stereo(s))
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"))
