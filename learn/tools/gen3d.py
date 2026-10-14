#!/usr/bin/env python3
"""Generate 3D molblocks: AddHs -> EmbedMolecule(randomSeed=7) -> MMFFOptimizeMolecule.
Writes learn/data/3d/<id>.mol and learn/data/3d/models.js (id -> molblock map)."""
import json, os, re
from rdkit import Chem
from rdkit.Chem import AllChem, rdMolTransforms

MOLS = {
    "water": "O", "ammonia": "N", "methane": "C",
    "formaldehyde": "C=O", "hcn": "C#N",
    "ethylene": "C=C", "acetylene": "C#C", "co2": "O=C=O",
    "butane": "CCCC", "isobutane": "CC(C)C",
    # Lesson 06: staggered ethane / bromoethane (rotated in the browser about the C-C bond), cyclopropane and the two
    # 1,2-dimethylcyclopropanes (cis = same face, checked in tests by the ring mean plane)
    "ethane": "CC", "bromoethane": "CCBr", "cyclopropane": "C1CC1",
    "cis-dmcp": "C[C@H]1C[C@H]1C", "trans-dmcp": "C[C@H]1C[C@@H]1C",
    # Lesson 07: the two but-2-enes (C-C=C-C dihedral ~0 for cis, ~180 for trans; checked in the tests)
    "cis-but-2-ene": "C/C=C\\C", "trans-but-2-ene": "C/C=C/C",
    # Lesson 09: the tert-butyl cation (planar sp2 C+ with an empty p orbital) next to isobutane (tetrahedral C-H), the neutral parent above
    "tert-butyl-cation": "C[C+](C)C",
    # Lesson 10: the cyclic bromonium ion of cyclohexene (Br+ bridges both carbons on one face). Neither MMFF nor UFF has parameters for Br+, so the
    # geometry is made for the isoelectronic selenirane stand-in (Se, same size and valence, neutral) and the Se atom is then relabelled Br with charge +1.
    "bromonium-cyclohexene": "C1CC[C@H]2[Br+][C@H]2C1",
    # Lesson 11: buta-1,3-diene as the lowest-energy conformer (s-trans, C1=C2-C3=C4 dihedral ~180): the four sp2 carbons lie in one plane
    "buta-1-3-diene": "C=CC=C",
    # Lesson 12: but-2-yne (sp carbons: the four carbons lie on one straight line, C-C-C angles about 180 degrees). The Lindlar product (Z)-but-2-ene is the existing cis-but-2-ene model.
    "but-2-yne": "CC#CC",
}
STAND_IN = {"bromonium-cyclohexene": "C1CC[C@H]2[Se][C@H]2C1"}
# Conformers that must be a specific shape: id -> (check on the embedded molecule).
# butane must be the anti (zig-zag) conformer: lowest-energy of many embeds, C1-C2-C3-C4 dihedral ~180.
MANY_CONFS = {"butane", "buta-1-3-diene"}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "3d")
os.makedirs(out, exist_ok=True)
# Existing models are kept byte-for-byte; only ids missing from models.js are generated (add --all to redo everything).
import sys
models_js = os.path.join(out, "models.js")
blocks = {}
if os.path.exists(models_js) and "--all" not in sys.argv:
    txt = open(models_js).read()
    blocks = json.loads(txt[txt.index("export default ") + len("export default "):].rstrip().rstrip(";"))
for name, smi in MOLS.items():
    if name in blocks:
        continue
    m = Chem.AddHs(Chem.MolFromSmiles(STAND_IN.get(name, smi)))
    if name in MANY_CONFS:
        ids = list(AllChem.EmbedMultipleConfs(m, 30, randomSeed=7))
        res = AllChem.MMFFOptimizeMoleculeConfs(m)
        best = min(range(len(ids)), key=lambda i: res[i][1])
        m = Chem.Mol(m, confId=ids[best])
        conf = m.GetConformer(ids[best])
        m2 = Chem.Mol(m); m2.RemoveAllConformers(); m2.AddConformer(Chem.Conformer(conf), assignId=True)
        m = m2
        d = abs(rdMolTransforms.GetDihedralDeg(m.GetConformer(), 0, 1, 2, 3))
        assert d > 170, (name, d)
        if name == "buta-1-3-diene":
            # the four carbons are coplanar: the C4 position lies in the plane of C1, C2, C3
            import numpy as np
            P = m.GetConformer().GetPositions()
            nrm = np.cross(P[1] - P[0], P[2] - P[0]); nrm /= np.linalg.norm(nrm)
            assert abs(np.dot(P[3] - P[0], nrm)) < 0.05, (name, np.dot(P[3] - P[0], nrm))
    else:
        assert AllChem.EmbedMolecule(m, randomSeed=7) == 0, name
        # MMFF pyramidalises a bare C+ a little (angle sum ~356 deg); UFF keeps the trigonal-planar sp2 centre
        if name == "tert-butyl-cation": AllChem.UFFOptimizeMolecule(m, maxIters=2000)
        elif name in STAND_IN: AllChem.UFFOptimizeMolecule(m, maxIters=5000)
        else: AllChem.MMFFOptimizeMolecule(m)
    if name == "but-2-yne":
        # both C-C#C angles must be 180 degrees (linear), and the four carbons are collinear
        cc = m.GetConformer()
        for (i, j, k) in ((0, 1, 2), (1, 2, 3)):
            ang = rdMolTransforms.GetAngleDeg(cc, i, j, k)
            assert ang > 178, (name, ang)
    if name == "tert-butyl-cation":
        # the three C-C-C angles at the cation centre must add to 360 (planar), i.e. trigonal planar sp2
        cc = m.GetConformer(); tot = sum(rdMolTransforms.GetAngleDeg(cc, a, 1, b) for a, b in ((0, 2), (0, 3), (2, 3)))
        assert abs(tot - 360) < 3, (name, tot)
    if name in STAND_IN:
        for a in m.GetAtoms():
            if a.GetSymbol() == "Se":
                a.SetAtomicNum(35); a.SetFormalCharge(1)
        Chem.SanitizeMol(m)
        assert Chem.MolToSmiles(Chem.RemoveHs(m)) == Chem.MolToSmiles(Chem.MolFromSmiles(smi)), name
    mb = Chem.MolToMolBlock(m)
    blocks[name] = {"smiles": smi, "molblock": mb}
    with open(os.path.join(out, name + ".mol"), "w") as f:
        f.write(mb)
with open(os.path.join(out, "models.js"), "w") as f:
    f.write("// GENERATED by learn/tools/gen3d.py - do not edit by hand.\nexport default " + json.dumps(blocks, indent=1) + ";\n")
print("wrote", ", ".join(blocks))
