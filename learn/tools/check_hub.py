#!/usr/bin/env python3
"""Independent stereo read-back for the reaction hub cards (learn/engine/reaction-hub.js).
usage: check_hub.py in.json out.json
in.json  = {"cases": [{"id": card id, "smiles": [every molecule drawn on the card: the substrate and each product component]}, ...]}
out.json = {"cases": [{"id", "mols": [ {smiles, ok, centres: [CIP letters of the specified stereocentres, in atom order],
            unassigned: n potential stereocentres left unspecified, ez: [CIP E/Z letters of specified double bonds],
            unassignedBonds: n potential stereo double bonds left unspecified, achiral: bool (equal to its mirror image once every tetrahedral tag is inverted),
            cistrans: 'cis' | 'trans' | None (two ring stereocentres, each with ONE exocyclic heavy group: sides of the ring read from 3D coordinates)} ]}]}
Nothing here uses the JavaScript engine: RDKit parses the SMILES, the NEW CIP labeler gives R/S and E/Z, FindPotentialStereo finds what is left unspecified,
and cis/trans on a ring is measured on an embedded 3D structure (the sign of (previous ring atom - C) x (next ring atom - C) . (substituent - C))."""
import json, sys
import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem, rdCIPLabeler
from rdkit import RDLogger
RDLogger.DisableLog("rdApp.*")


def mirror_smiles(m):
    mm = Chem.Mol(m)
    for a in mm.GetAtoms():
        t = a.GetChiralTag()
        if t == Chem.ChiralType.CHI_TETRAHEDRAL_CW:
            a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CCW)
        elif t == Chem.ChiralType.CHI_TETRAHEDRAL_CCW:
            a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CW)
    return Chem.MolToSmiles(mm)


def ring_cistrans(m, centres):
    """cis/trans of the exocyclic heavy groups on two ring stereocentres sharing one ring, else None."""
    if len(centres) != 2:
        return None
    ri = m.GetRingInfo()
    ring = None
    for r in ri.AtomRings():
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
    if AllChem.EmbedMolecule(mh, randomSeed=11) != 0:
        return None
    AllChem.MMFFOptimizeMolecule(mh, maxIters=2000)
    pos = mh.GetConformer().GetPositions()
    side = {}
    for c in centres:
        k = ring.index(c)
        prev, nxt = ring[k - 1], ring[(k + 1) % len(ring)]
        v = np.dot(np.cross(pos[prev] - pos[c], pos[nxt] - pos[c]), pos[subs[c]] - pos[c])
        side[c] = 1 if v > 0 else -1
    return "cis" if side[centres[0]] == side[centres[1]] else "trans"


def read(smi):
    m = Chem.MolFromSmiles(smi)
    if m is None:
        return {"smiles": smi, "ok": False}
    rdCIPLabeler.AssignCIPLabels(m)
    centre_idx = [a.GetIdx() for a in m.GetAtoms() if a.HasProp("_CIPCode")]
    centres = [m.GetAtomWithIdx(i).GetProp("_CIPCode") for i in centre_idx]
    ez = [b.GetProp("_CIPCode") for b in m.GetBonds() if b.HasProp("_CIPCode")]
    pot = Chem.FindPotentialStereo(m)
    un = sum(1 for s in pot if s.type == Chem.StereoType.Atom_Tetrahedral and s.specified == Chem.StereoSpecified.Unspecified)
    unb = sum(1 for s in pot if s.type == Chem.StereoType.Bond_Double and s.specified == Chem.StereoSpecified.Unspecified)
    achiral = Chem.MolToSmiles(m) == mirror_smiles(m)
    return {"smiles": smi, "ok": True, "flat": Chem.MolToSmiles(m, isomericSmiles=False), "centres": centres, "unassigned": un, "ez": ez, "unassignedBonds": unb,
            "achiral": achiral, "cistrans": ring_cistrans(m, centre_idx)}


data = json.load(open(sys.argv[1], encoding="utf-8"))
out = {"cases": [{"id": c["id"], "mols": [read(s) for s in c["smiles"]]} for c in data["cases"]]}
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"))
