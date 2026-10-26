#!/usr/bin/env python3
"""Cyclohexane chair builder (RDKit): for any substituted cyclohexane SMILES build the two chair conformers
with the SAME atom order, the second being the ring-flipped one (up stays up).

  build_pair(smiles) -> dict(a=molblock, b=molblock, smiles=...)       (a = lower MMFF energy)
  face_label(smiles) -> {'cis'|'trans'|None}   independent cis/trans from a fresh RDKit embedding (ring mean plane)

Method: AddHs -> EmbedMolecule -> MMFF with ring-torsion constraints (chair of one handedness) -> geometric ring flip
(mirror the six ring carbons through their mean plane and swap each carbon's axial/equatorial substituent positions)
-> MMFF with the opposite torsion constraints -> unconstrained relax. Stereo is re-read from the 3D result and must
equal the input stereo; a failed chair/stereo check raises.

CLI:  chairs.py <in.json> <out.json>   in = list of SMILES; out = {smiles: {a, b, label, ok}}
"""
import json, sys
import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit.Chem import rdMolTransforms as T

def _pos(mol, cid=-1):
    return np.array(mol.GetConformer(cid).GetPositions())

def _setpos(mol, X, cid=-1):
    c = mol.GetConformer(cid)
    for i, p in enumerate(X):
        c.SetAtomPosition(i, [float(p[0]), float(p[1]), float(p[2])])

def six_ring(mol):
    for r in mol.GetRingInfo().AtomRings():
        if len(r) == 6 and all(mol.GetAtomWithIdx(i).GetSymbol() == 'C' for i in r):
            return list(r)
    raise ValueError('no cyclohexane ring')

def ring_axis(X, R):
    n = X[[R[0], R[2], R[4]]].mean(0) - X[[R[1], R[3], R[5]]].mean(0)
    return n / np.linalg.norm(n)

def _group(mol, start, block):
    seen, stack = {start}, [start]
    while stack:
        a = stack.pop()
        for nb in mol.GetAtomWithIdx(a).GetNeighbors():
            j = nb.GetIdx()
            if j not in seen and j != block:
                seen.add(j); stack.append(j)
    return seen

def ring_torsions(mol, R, cid=-1):
    c = mol.GetConformer(cid)
    return [T.GetDihedralDeg(c, R[i], R[(i + 1) % 6], R[(i + 2) % 6], R[(i + 3) % 6]) for i in range(6)]

def _minimise(mol, R, sign, constrain=True, iters=20000, k=80.0, angles=None):
    props = AllChem.MMFFGetMoleculeProperties(mol)
    ff = AllChem.MMFFGetMoleculeForceField(mol, props)
    if constrain:
        for i in range(6):
            t = sign * (55.0 if i % 2 == 0 else -55.0)
            lo, hi = sorted((t - 4.0, t + 4.0))
            ff.MMFFAddTorsionConstraint(R[i], R[(i + 1) % 6], R[(i + 2) % 6], R[(i + 3) % 6], False, lo, hi, k)
        if angles:   # optional: hold every ring C-C-C angle inside a window (used for the shipped lesson models)
            for i in range(6):
                ff.MMFFAddAngleConstraint(R[i], R[(i + 1) % 6], R[(i + 2) % 6], False, angles[0], angles[1], 200.0)
    ff.Initialize()
    for _ in range(6):
        if ff.Minimize(maxIts=iters) == 0:
            break
    return ff.CalcEnergy() if not constrain else None

def energy(mol):
    props = AllChem.MMFFGetMoleculeProperties(mol)
    return AllChem.MMFFGetMoleculeForceField(mol, props).CalcEnergy()

def _flip(mol, R):
    X = _pos(mol)
    n = ring_axis(X, R)
    g = X[R].mean(0)
    M = lambda p: p - 2 * np.dot(p - g, n) * n
    Mv = lambda v: v - 2 * np.dot(v, n) * n
    Y = X.copy()
    ringset = set(R)
    for c in R:
        subs = [nb.GetIdx() for nb in mol.GetAtomWithIdx(c).GetNeighbors() if nb.GetIdx() not in ringset]
        assert len(subs) == 2, 'ring carbon must have exactly two non-ring neighbours (no quaternary / fused ring support)'
        vs = [X[s] - X[c] for s in subs]
        ax = int(abs(np.dot(vs[0], n)) < abs(np.dot(vs[1], n)))  # index of the axial one
        newvec = {subs[ax]: Mv(vs[1 - ax]), subs[1 - ax]: Mv(vs[ax])}
        for s in subs:
            old = vs[subs.index(s)]
            new = newvec[s]
            u, w = old / np.linalg.norm(old), new / np.linalg.norm(new)
            v = np.cross(u, w); sn = np.linalg.norm(v); cs = float(np.dot(u, w))
            if sn < 1e-9:
                Rm = np.eye(3)
            else:
                k = v / sn
                K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
                Rm = np.eye(3) + sn * K + (1 - cs) * (K @ K)
            for a in _group(mol, s, c):
                Y[a] = M(X[c]) + new * (np.linalg.norm(X[s] - X[c]) / np.linalg.norm(new)) * 0 + new + Rm @ (X[a] - X[s]) * 1.0 - 0
        Y[c] = M(X[c])
    _setpos(mol, Y)

def _stereo_ok(mol, ref_smiles):
    m = Chem.Mol(mol)
    Chem.AssignStereochemistryFrom3D(m)
    got = Chem.MolToSmiles(Chem.RemoveHs(m))
    return got == Chem.MolToSmiles(Chem.MolFromSmiles(ref_smiles))

def chair_ok(mol, R):
    X = _pos(mol)
    ang = []
    for i in range(6):
        a, b, c = X[R[i - 1]], X[R[i]], X[R[(i + 1) % 6]]
        u, v = a - b, c - b
        ang.append(np.degrees(np.arccos(np.dot(u, v) / np.linalg.norm(u) / np.linalg.norm(v))))
    tor = ring_torsions(mol, R)
    alt = all(tor[i] * tor[(i + 1) % 6] < 0 for i in range(6))
    return all(107.0 <= a <= 116.0 for a in ang) and alt and all(40 < abs(t) < 70 for t in tor)

def roles(mol, R):
    """axial / equatorial for every non-ring substituent atom: on each ring carbon the substituent whose bond is closer
    to the ring axis is axial, the other equatorial (robust even when a crowded axial group is bent away)."""
    X = _pos(mol); n = ring_axis(X, R); out = {}
    ringset = set(R)
    for c in R:
        subs = [nb.GetIdx() for nb in mol.GetAtomWithIdx(c).GetNeighbors() if nb.GetIdx() not in ringset]
        cosv = [abs(np.dot(X[s] - X[c], n)) / np.linalg.norm(X[s] - X[c]) for s in subs]
        ax = int(np.argmax(cosv))
        for i, s in enumerate(subs): out[s] = 'a' if i == ax else 'e'
    return out

def _kabsch(P, Q):
    """rotation R (proper) and translation so that R@P+t ~ Q for centred copies."""
    Pc, Qc = P - P.mean(0), Q - Q.mean(0)
    H = Pc.T @ Qc
    U, S, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U.T))
    D = np.diag([1, 1, d])
    Rm = Vt.T @ D @ U.T
    return Rm, P.mean(0), Q.mean(0)

def _orient(X, R, tilt=-24.0, spin=20.0):
    """centre on the ring, ring axis -> +y (sign: carbons R0,R2,R4 up), then a viewing tilt and spin baked in."""
    n = ring_axis(X, R)
    g = X[R].mean(0)
    y = np.array([0.0, 1.0, 0.0])
    v = np.cross(n, y); s = np.linalg.norm(v); c = float(np.dot(n, y))
    if s < 1e-9: Rm = np.eye(3) if c > 0 else np.diag([1, -1, -1])
    else:
        k = v / s; K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
        Rm = np.eye(3) + s * K + (1 - c) * (K @ K)
    def rot(axis, deg):
        a = np.radians(deg); ax = np.array(axis, float); K = np.array([[0, -ax[2], ax[1]], [ax[2], 0, -ax[0]], [-ax[1], ax[0], 0]])
        return np.eye(3) + np.sin(a) * K + (1 - np.cos(a)) * (K @ K)
    full = rot([1, 0, 0], tilt) @ rot([0, 1, 0], spin) @ Rm
    return g, full

def _good(mol, R, smiles):
    return chair_ok(mol, R) and _stereo_ok(mol, smiles)

def build_pair(smiles, seed=7, angles=None):
    """Two chairs, same atom order. a = the lower-energy one. If the second chair is too crowded for MMFF to hold
    (e.g. cis-1,3-diaxial tert-butyl), it is the raw geometric ring flip of the first, which is still an exact chair."""
    mol = Chem.AddHs(Chem.MolFromSmiles(smiles))
    R = six_ring(mol)
    cands = []
    for sd in range(seed, seed + 8):
        m = Chem.Mol(mol)
        if AllChem.EmbedMolecule(m, randomSeed=sd) != 0: continue
        AllChem.MMFFOptimizeMolecule(m, maxIters=2000)
        for k in (80.0, 400.0, 2000.0):
            for sgn in (1, -1):
                a = Chem.Mol(m)
                _minimise(a, R, sgn, True, k=k, angles=angles)
                if not _good(a, R, smiles): continue
                a0 = Chem.Mol(a)
                if not angles: _minimise(a, R, sgn, False)
                if not _good(a, R, smiles): a = a0
                cands.append((energy(a), a))
        if cands: break
    if not cands: raise RuntimeError('could not build a chair for ' + smiles)
    ea, a = min(cands, key=lambda t: t[0])
    sgn = 1 if ring_torsions(a, R)[0] > 0 else -1
    raw = Chem.Mol(a); _flip(raw, R)
    b = None
    for k in (80.0, 400.0, 2000.0):
        t = Chem.Mol(raw); _minimise(t, R, -sgn, True, k=k, angles=angles)
        if _good(t, R, smiles):
            t0 = Chem.Mol(t)
            if not angles: _minimise(t, R, -sgn, False)
            b = t if _good(t, R, smiles) else t0
            break
    relaxed_b = b is not None
    if b is None: b = raw
    if not _good(b, R, smiles) or roles(a, R) == roles(b, R): raise RuntimeError('ring flip failed for ' + smiles)
    Xa, Xb = _pos(a), _pos(b)
    Rm, pb, qa = _kabsch(Xb[R], Xa[R])
    _setpos(b, (Xb - pb) @ Rm.T + qa)
    if energy(b) < energy(a) and relaxed_b: a, b = b, a
    g, full = _orient(_pos(a), R)
    for mm in (a, b):
        _setpos(mm, (_pos(mm) - g) @ full.T)
    return dict(a=Chem.MolToMolBlock(a), b=Chem.MolToMolBlock(b), smiles=smiles, relaxed_b=relaxed_b,
                ea=energy(a), eb=energy(b), roles_a=roles(a, R), roles_b=roles(b, R))

def face_label(smiles, seed=11):
    """cis / trans of the two ring substituents from a fresh RDKit embedding (lowest-energy of several), independent of the
    chair builder. A substituent's face = which side of the LOCAL ring plane it is on: sign of (sub - c) . ((prev - c) x (next - c))
    with prev/next taken along one traversal of the ring; this stays valid for chairs, boats and twist-boats."""
    mol = Chem.AddHs(Chem.MolFromSmiles(smiles))
    R = six_ring(mol)
    cids = AllChem.EmbedMultipleConfs(mol, 8, randomSeed=seed)
    res = AllChem.MMFFOptimizeMoleculeConfs(mol, maxIters=2000)
    best = min(range(len(cids)), key=lambda i: res[i][1])
    X = _pos(mol, cids[best])
    ringset = set(R); faces = []
    for k, c in enumerate(R):
        prev, nxt = X[R[k - 1]], X[R[(k + 1) % 6]]
        nrm = np.cross(prev - X[c], nxt - X[c])
        for nb in mol.GetAtomWithIdx(c).GetNeighbors():
            if nb.GetIdx() in ringset or nb.GetAtomicNum() == 1: continue
            faces.append(np.sign(np.dot(X[nb.GetIdx()] - X[c], nrm)))
    if len(faces) != 2: return None
    return 'cis' if faces[0] == faces[1] else 'trans'

if __name__ == '__main__':
    smis = json.load(open(sys.argv[1]))
    out = {}
    for s in smis:
        try:
            p = build_pair(s)
            out[s] = dict(a=p['a'], b=p['b'], label=face_label(s), ring=six_ring(Chem.AddHs(Chem.MolFromSmiles(s))), relaxed_b=p['relaxed_b'], ok=True)
        except Exception as e:
            out[s] = dict(ok=False, err=str(e))
    json.dump(out, open(sys.argv[2], 'w'))
