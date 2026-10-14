#!/usr/bin/env python3
"""Independent check of Lesson 16 for learn/tests/lesson16.mjs. Nothing here shares code with engine/chirality.js.
usage: check_relationships.py in.json out.json

in.json  = { "pairs":   [[a, b], ...],               SMILES pairs (stereo written with @ / @@, salts may contain '.')
             "meso":    [smiles, ...],               single molecules
             "enum":    [flat smiles, ...],          molecules WITHOUT stereo: every stereoisomer is enumerated
             "ring":    [smiles, ...],               ring stereoisomers: cis or trans in 3D
             "models":  {id: {"molblock", "mirror", "planes": [[nx,ny,nz,d], ...]}} }
out.json = { "pairs":  [{"kind", "sameConstitution", "sameFormula"} ...],
             "meso":   [{"meso", "centers", "unassigned", "selfMirror"} ...],
             "enum":   {smiles: {"centers", "total", "meso", "pairs", "canon": [...]}},
             "ring":   {smiles: "cis"|"trans"},
             "models": {id: {"cip": {atom: R/S}, "cipMirror": {...}, "rmsd": best RMSD of the mirror image onto the model over all graph automorphisms,
                              "planes": [{"symmetric", "off"}], "nPlanes": number of mirror planes found by bisecting every pair of identical atoms}} }

Method (the definitions of the brief):
  relationship : formula, constitution (canonical SMILES without stereo), identical = equal canonical isomeric SMILES,
                 mirror image = every tetrahedral tag inverted, enantiomers = B equals the mirror of A and A differs from its own mirror image, else diastereomers.
  meso         : stereocentres from FindMolChiralCenters(includeUnassigned=True, useLegacyImplementation=False), all assigned, at least two, equal to own mirror image.
  enum         : EnumerateStereoisomers over every unspecified centre, canonicalised, merged when equal; meso when equal to the mirror image.
  ring         : AddHs, ETKDG embedding, MMFF; each substituent is on the cis or trans face according to the side of the best-fit ring plane it points to.
  models       : CIP labels read from the 3D coordinates; mirror image onto model with Kabsch (SVD, proper rotations only) over all automorphisms of the graph."""
import json, sys, itertools
import numpy as np
from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdCIPLabeler, rdMolDescriptors
from rdkit.Chem.EnumerateStereoisomers import EnumerateStereoisomers, StereoEnumerationOptions
RDLogger.DisableLog("rdApp.*")

CW, CCW = Chem.ChiralType.CHI_TETRAHEDRAL_CW, Chem.ChiralType.CHI_TETRAHEDRAL_CCW

def mirror(m):
    r = Chem.RWMol(m)
    for a in r.GetAtoms():
        t = a.GetChiralTag()
        if t == CW: a.SetChiralTag(CCW)
        elif t == CCW: a.SetChiralTag(CW)
    return r.GetMol()

iso = lambda m: Chem.MolToSmiles(m)
flat = lambda m: Chem.MolToSmiles(m, isomericSmiles=False)
formula = lambda m: rdMolDescriptors.CalcMolFormula(m)

def centers(m):
    return Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False)

def relationship(a, b):
    A, B = Chem.MolFromSmiles(a), Chem.MolFromSmiles(b)
    out = {"sameFormula": formula(A) == formula(B), "sameConstitution": flat(A) == flat(B)}
    if not out["sameFormula"]: out["kind"] = "different"
    elif not out["sameConstitution"]: out["kind"] = "constitutional"
    elif any(l == "?" for _, l in centers(A)) or any(l == "?" for _, l in centers(B)): out["kind"] = "unspecified"
    elif iso(A) == iso(B): out["kind"] = "identical"
    elif iso(mirror(A)) == iso(B) and iso(A) != iso(mirror(A)): out["kind"] = "enantiomers"
    else: out["kind"] = "diastereomers"
    return out

def meso(s):
    m = Chem.MolFromSmiles(s)
    c = centers(m)
    unassigned = [i for i, l in c if l == "?"]
    same = iso(m) == iso(mirror(m))
    return {"meso": len(c) >= 2 and not unassigned and same, "centers": len(c), "unassigned": len(unassigned), "selfMirror": same}

def enum(flat_smiles):
    m = Chem.MolFromSmiles(flat_smiles)
    ncen = len(centers(m))
    seen = {}
    for iso_m in EnumerateStereoisomers(m, options=StereoEnumerationOptions(onlyUnassigned=True, unique=False, tryEmbedding=False)):
        seen[iso(iso_m)] = iso_m
    mesos = [s for s, x in seen.items() if iso(mirror(x)) == s]
    chiral = [s for s in seen if s not in mesos]
    # every chiral one must have its mirror image in the set
    assert all(iso(mirror(seen[s])) in seen for s in chiral), flat_smiles
    return {"centers": ncen, "total": len(seen), "meso": len(mesos), "pairs": len(chiral) // 2, "canon": sorted(seen)}

def ring_face(smi):
    m = Chem.AddHs(Chem.MolFromSmiles(smi))
    assert AllChem.EmbedMolecule(m, randomSeed=11) == 0, smi
    AllChem.MMFFOptimizeMolecule(m, maxIters=2000)
    X = m.GetConformer().GetPositions()
    ring = list(m.GetRingInfo().AtomRings()[0])
    P = X[ring]; c = P.mean(0)
    nrm = np.linalg.svd(P - c)[2][2]
    sides = []
    for a in ring:
        for nb in m.GetAtomWithIdx(a).GetNeighbors():
            if nb.GetIdx() not in ring and nb.GetAtomicNum() > 1:
                sides.append(np.dot(X[nb.GetIdx()] - X[a], nrm))
    assert len(sides) == 2, (smi, sides)
    return "cis" if sides[0] * sides[1] > 0 else "trans"

def labels3d(mb):
    m = Chem.MolFromMolBlock(mb, removeHs=False)
    Chem.AssignStereochemistryFrom3D(m)
    rdCIPLabeler.AssignCIPLabels(m)
    return {str(a.GetIdx()): a.GetProp("_CIPCode") for a in m.GetAtoms() if a.HasProp("_CIPCode")}

def coords(mb):
    m = Chem.MolFromMolBlock(mb, removeHs=False)
    return m, m.GetConformer().GetPositions(), [a.GetSymbol() for a in m.GetAtoms()]

def kabsch_rmsd(P, Q):
    P = P - P.mean(0); Q = Q - Q.mean(0)
    H = P.T @ Q
    U, S, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U.T))
    D = np.diag([1, 1, d])
    R = Vt.T @ D @ U.T                  # proper rotation taking P onto Q
    return float(np.sqrt(((P @ R.T - Q) ** 2).sum() / len(P)))

def mirror_rmsd(mb, mirror_mb):
    m, X, el = coords(mb)
    _, Y, _ = coords(mirror_mb)
    best = 1e9
    for perm in m.GetSubstructMatches(m, uniquify=False, useChirality=False, maxMatches=100000):
        best = min(best, kabsch_rmsd(Y, X[list(perm)]))
    return best

def plane_ok(X, el, n, d, tol=0.3):
    n = np.array(n, float); n /= np.linalg.norm(n)
    R = X - 2 * (X @ n - d)[:, None] * n[None, :]
    used, off = set(), []
    for i in range(len(X)):
        cand = [(np.linalg.norm(X[j] - R[i]), j) for j in range(len(X)) if el[j] == el[i] and j not in used]
        cand = [c for c in cand if c[0] <= tol]
        if not cand: off.append(i); continue
        used.add(min(cand)[1])
    return {"symmetric": not off, "off": len(off)}

def all_planes(X, el, tol=0.25):
    found = set()
    for i, j in itertools.combinations(range(len(X)), 2):
        if el[i] != el[j]: continue
        n = X[j] - X[i]
        if np.linalg.norm(n) < 0.3: continue
        n = n / np.linalg.norm(n); d = float(n @ (X[i] + X[j]) / 2)
        if plane_ok(X, el, n, d, tol)["symmetric"]:
            if n[0] < -1e-9 or (abs(n[0]) <= 1e-9 and (n[1] < -1e-9 or (abs(n[1]) <= 1e-9 and n[2] < 0))): n, d = -n, -d
            found.add(tuple(np.round(list(n) + [d], 2)))
    return len(found)

data = json.load(open(sys.argv[1]))
out = {"pairs": [], "meso": [], "enum": {}, "ring": {}, "models": {}}
for a, b in data.get("pairs", []): out["pairs"].append(relationship(a, b))
for s in data.get("meso", []): out["meso"].append(meso(s))
for s in data.get("enum", []): out["enum"][s] = enum(s)
for s in data.get("ring", []): out["ring"][s] = ring_face(s)
for mid, spec in data.get("models", {}).items():
    m, X, el = coords(spec["molblock"])
    out["models"][mid] = {
        "cip": labels3d(spec["molblock"]), "cipMirror": labels3d(spec["mirror"]),
        "rmsd": mirror_rmsd(spec["molblock"], spec["mirror"]),
        "planes": [plane_ok(X, el, p[:3], p[3]) for p in spec.get("planes", [])],
        "nPlanes": all_planes(X, el),
    }
json.dump(out, open(sys.argv[2], "w"))
