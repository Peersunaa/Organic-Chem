#!/usr/bin/env python3
"""Lesson 16: solid 3D models of meso compounds and of a chiral partner, written to learn/data/3d/meso.js.
Same recipe as gen_chiral3d.py (AddHs -> EmbedMultipleConfs -> MMFF), plus:
  * a MESO model is built in the ECLIPSED conformation, where the molecule really has a mirror plane (the plane bisects the C2-C3 bond):
    the backbone dihedral is constrained to 0 in MMFF, then one half (the C2 side) is kept and the other half is made as its exact reflection through
    the perpendicular bisector plane of C2-C3. The result has an exact plane of symmetry (checked below) and RDKit reads the 3D structure as (R,S).
  * its mirror image is the SAME coordinates reflected through x = 0 (never hand-built), exactly as for the Lesson 15 models. Because the model has
    a plane of symmetry, the mirror image lands on the model after a turn (Kabsch RMSD ~ 0 in the tests).
  * the chiral partner (2R,3R)-tartaric acid is the anti conformer from MMFF (C2-symmetric looking); its reflection is (2S,3S) and cannot be superimposed.
Heavy atoms keep the SMILES atom numbers; the hydrogens come after them."""
import json, os, itertools
import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem, rdCIPLabeler, rdMolTransforms
from rdkit.Chem import rdForceFieldHelpers as FFH
from rdkit import RDLogger
RDLogger.DisableLog("rdApp.*")

MODELS = {
    # id: (smiles, name, kind, backbone dihedral atoms (heavy atom indices), centres)
    "meso-dibromobutane": ("C[C@H](Br)[C@@H](C)Br", "meso-2,3-dibromobutane", "meso", (0, 1, 3, 4), (1, 3)),
    "meso-tartaric":      ("O=C(O)[C@H](O)[C@H](O)C(=O)O", "meso-tartaric acid", "meso", (1, 3, 5, 7), (3, 5)),
    "rr-tartaric":        ("O=C(O)[C@H](O)[C@@H](O)C(=O)O", "(2R,3R)-tartaric acid", "chiral", (1, 3, 5, 7), (3, 5)),
}

def cip_from_block(mb):
    m = Chem.MolFromMolBlock(mb, removeHs=False)
    Chem.AssignStereochemistryFrom3D(m)
    rdCIPLabeler.AssignCIPLabels(m)
    return {a.GetIdx(): a.GetProp("_CIPCode") for a in m.GetAtoms() if a.HasProp("_CIPCode")}

def labels_smiles(smi):
    m = Chem.MolFromSmiles(smi)
    rdCIPLabeler.AssignCIPLabels(m)
    return {a.GetIdx(): a.GetProp("_CIPCode") for a in m.GetAtoms() if a.HasProp("_CIPCode")}

def reflect_x(mb):
    L = mb.split("\n")
    n = int(L[3][:3])
    for i in range(n):
        l = L[4 + i]
        L[4 + i] = f"{-float(l[0:10]):10.4f}" + l[10:]
    return "\n".join(L)

def build(smi, dih, target_deg, seed):
    m = Chem.AddHs(Chem.MolFromSmiles(smi))
    ids = list(AllChem.EmbedMultipleConfs(m, 30, randomSeed=seed))
    props = FFH.MMFFGetMoleculeProperties(m)
    best = None
    for cid in ids:
        ff = FFH.MMFFGetMoleculeForceField(m, props, confId=cid)
        ff.MMFFAddTorsionConstraint(*dih, False, target_deg - 0.5, target_deg + 0.5, 500.0)
        ff.Initialize(); ff.Minimize(maxIts=5000)
        ff2 = FFH.MMFFGetMoleculeForceField(m, props, confId=cid)
        e = ff2.CalcEnergy()
        d = rdMolTransforms.GetDihedralDeg(m.GetConformer(cid), *dih)
        if best is None or e < best[0]: best = (e, cid, d)
    return m, best[1]

def symmetrize(m, cid, c2, c3):
    """Keep the C2 half, replace the other half by its reflection through the perpendicular bisector plane of C2-C3."""
    conf = m.GetConformer(cid)
    X = np.array(conf.GetPositions())
    n = X.shape[0]
    p2, p3 = X[c2], X[c3]
    nrm = (p3 - p2) / np.linalg.norm(p3 - p2)
    mid = (p2 + p3) / 2
    refl = lambda p: p - 2 * np.dot(p - mid, nrm) * nrm
    # graph automorphisms that swap C2 and C3
    matches = m.GetSubstructMatches(m, uniquify=False, useChirality=False, maxMatches=5000)
    best = None
    for mt in matches:
        if mt[c2] != c3 or mt[c3] != c2: continue
        if any(mt[mt[i]] != i for i in range(n)): continue
        cost = sum(np.linalg.norm(refl(X[i]) - X[mt[i]]) for i in range(n))
        if best is None or cost < best[0]: best = (cost, mt)
    assert best, "no swapping automorphism"
    mt = best[1]
    Y = X.copy()
    for i in range(n):
        side = np.dot(X[i] - mid, nrm)
        if side > 0:                      # C3 side: replaced by the reflection of its partner on the C2 side
            j = mt[i]
            assert np.dot(X[j] - mid, nrm) < 0, (i, j)
            Y[i] = refl(X[j])
    for i in range(n): conf.SetAtomPosition(i, Y[i].tolist())
    return mt

def check_plane(mb, mt):
    m = Chem.MolFromMolBlock(mb, removeHs=False)
    X = np.array(m.GetConformer().GetPositions())
    # a plane of symmetry exists iff some reflection maps every atom onto its partner: use the C2-C3 bisector again
    return X

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "3d")
res = {}
for mid, (smi, name, kind, dih, cen) in MODELS.items():
    want = labels_smiles(smi)
    if kind == "meso":
        assert sorted(want.values()) == ["R", "S"], (mid, want)
        m, cid = build(smi, dih, 0.0, 16)
        mt = symmetrize(m, cid, *cen)
        # exact mirror plane: reflect the finished coordinates through the bisector plane and compare with the permuted atoms
        X = np.array(m.GetConformer(cid).GetPositions())
        nrm = (X[cen[1]] - X[cen[0]]); nrm /= np.linalg.norm(nrm); mid_p = (X[cen[0]] + X[cen[1]]) / 2
        R = X - 2 * ((X - mid_p) @ nrm)[:, None] * nrm[None, :]
        err = max(np.linalg.norm(R[i] - X[mt[i]]) for i in range(len(X)))
        assert err < 1e-6, (mid, err)
        dihedral = rdMolTransforms.GetDihedralDeg(m.GetConformer(cid), *dih)
        assert abs(dihedral) < 1e-3, dihedral
    else:
        m, cid = build(smi, dih, 180.0, 16)
    # sanity: bond lengths
    conf = m.GetConformer(cid)
    for b in m.GetBonds():
        d = rdMolTransforms.GetBondLength(conf, b.GetBeginAtomIdx(), b.GetEndAtomIdx())
        assert 0.9 < d < (2.05 if "Br" in (b.GetBeginAtom().GetSymbol(), b.GetEndAtom().GetSymbol()) else 1.65), (mid, b.GetBeginAtomIdx(), b.GetEndAtomIdx(), d)
    mb = Chem.MolToMolBlock(m, confId=cid)
    mir = reflect_x(mb)
    got, gotm = cip_from_block(mb), cip_from_block(mir)
    assert got == want, (mid, got, want)
    flip = {"R": "S", "S": "R"}
    assert gotm == {k: flip[v] for k, v in want.items()}, (mid, gotm)
    if kind == "chiral":
        assert all(v == "R" for v in want.values()), (mid, want)
    res[mid] = {"smiles": smi, "name": name, "centers": list(cen), "labels": {str(k): v for k, v in want.items()}, "meso": kind == "meso", "achiral": kind == "meso", "molblock": mb, "mirror": mir}
with open(os.path.join(out, "meso.js"), "w") as f:
    f.write("// GENERATED by learn/tools/gen_meso3d.py - do not edit by hand.\n// Meso models are eclipsed conformers with an EXACT mirror plane through the middle of the C2-C3 bond; every mirror image is the same coordinates reflected through x = 0.\nexport default " + json.dumps(res, indent=1) + ";\n")
print("wrote", ", ".join(f"{k}({'meso' if v['meso'] else 'chiral'})" for k, v in res.items()))
