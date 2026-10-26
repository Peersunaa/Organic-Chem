#!/usr/bin/env python3
"""Independent check of the Chapter 7 reactions (learn/engine/reactions-halides.js) for learn/tests/halides.mjs.
usage: check_halides.py in.json out.json
in.json  = {"cases": [{"id", "kind": "sn2"|"sn1"|"e2"|"e1"|"grignard"|"alcohol"|"mono", ...inputs..., "engine": {...what the JS engine said...}}]}
out.json = {"cases": [{"id", "kind", "match": bool, "why": str, "python": {...}}]}

Nothing here shares code with the JavaScript engine. Everything is recomputed with Python RDKit:
  sn2     RWMol edit (the halogen atom is replaced in place by the nucleophile's atom, extra nucleophile atoms are added) AND, for a substrate whose C-X carbon has a written
          configuration, an independent GEOMETRIC product: embed the substrate in 3D, put the nucleophile where X was reflected through the plane of the carbon's three other
          neighbours (the back side; the three groups have flipped like an umbrella), read the configuration from the 3D coordinates (AssignStereochemistryFrom3D). Both must agree with
          the engine. R/S letters before and after come from the new CIP labeler (rdCIPLabeler).
  sn1     the nucleophile replaces X; a carbon that is a stereocentre in the product gives BOTH configurations (EnumerateStereoisomers); the cation is rebuilt from the graph.
  e2, e1  every beta carbon with an H gives an alkene (graph edit); Zaitsev = most carbon groups on the C=C; the six-membered-ring rule is applied from a 3D embedding with explicit
          hydrogens: a beta hydrogen may leave only if it is on the opposite face of the ring plane from X (the sign of (previous ring atom - C) x (next ring atom - C) . (atom - C)).
  grignard  C-X becomes C-Mg-X (RWMol), protonolysis puts H or D (isotope 2) in place of MgX.
  alcohol  the OH is replaced by the halogen; PBr3 / SOCl2 invert (3D reflection again), HX gives the flat product.
  mono     every hydrogen of an alkane is replaced in turn (AddHs), products grouped by flat canonical SMILES.
Every refusal the engine makes is predicted here as well from SMARTS-like graph tests (tertiary, sp2, neopentyl, no beta H, rearranging cation ...)."""
import json, sys, itertools
import numpy as np
from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdCIPLabeler
from rdkit.Chem.EnumerateStereoisomers import EnumerateStereoisomers, StereoEnumerationOptions
from rdkit.Geometry import Point3D
RDLogger.DisableLog("rdApp.*")

SEED = 7
NU = {'I': 'I', 'Br': 'Br', 'Cl': 'Cl', 'HO': 'O', 'MeO': 'OC', 'EtO': 'OCC', 'CN': 'C#N', 'N3': 'N=[N+]=[N-]', 'MeS': 'SC', 'HS': 'S', 'NH3': 'N', 'H2O': 'O', 'MeOH': 'OC', 'EtOH': 'OCC', 'AcO': 'OC(C)=O'}
HAL = {'Cl', 'Br', 'I'}


def canon(smi):
    m = Chem.MolFromSmiles(smi)
    return Chem.MolToSmiles(m) if m is not None else None


def flat(smi):
    m = Chem.MolFromSmiles(smi)
    Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)


def mirror(smi):
    m = Chem.MolFromSmiles(smi)
    for a in m.GetAtoms():
        t = a.GetChiralTag()
        if t == Chem.ChiralType.CHI_TETRAHEDRAL_CW:
            a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CCW)
        elif t == Chem.ChiralType.CHI_TETRAHEDRAL_CCW:
            a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CW)
    return Chem.MolToSmiles(m)


def cip(mol, idx):
    m = Chem.Mol(mol)
    rdCIPLabeler.AssignCIPLabels(m)
    a = m.GetAtomWithIdx(idx)
    return a.GetProp('_CIPCode') if a.HasProp('_CIPCode') else None


def embed(mol):
    mh = Chem.AddHs(mol)
    if AllChem.EmbedMolecule(mh, randomSeed=SEED) != 0:
        AllChem.EmbedMolecule(mh, randomSeed=SEED, useRandomCoords=True)
    AllChem.MMFFOptimizeMolecule(mh, maxIters=2000)
    return mh


def read_halide(smi):
    """(mol, c, x, X) for a molecule with exactly one halogen on a carbon; or None."""
    m = Chem.MolFromSmiles(smi)
    if m is None:
        return None
    hs = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() in HAL]
    others = [a for a in m.GetAtoms() if a.GetSymbol() not in HAL and a.GetSymbol() != 'C']
    if len(hs) != 1 or others or any(a.GetSymbol() == 'F' for a in m.GetAtoms()):
        return None
    x = hs[0]
    nb = m.GetAtomWithIdx(x).GetNeighbors()
    if len(nb) != 1 or nb[0].GetSymbol() != 'C':
        return None
    return m, nb[0].GetIdx(), x, m.GetAtomWithIdx(x).GetSymbol()


def carbon_nbrs(m, c, skip=()):
    return [n.GetIdx() for n in m.GetAtomWithIdx(c).GetNeighbors() if n.GetSymbol() == 'C' and n.GetIdx() not in skip]


def is_sp2_site(m, c):
    a = m.GetAtomWithIdx(c)
    return a.GetIsAromatic() or any(b.GetBondTypeAsDouble() >= 2 for b in a.GetBonds())


def has_cc_double(m, k):
    a = m.GetAtomWithIdx(k)
    if a.GetIsAromatic():
        return False
    return any(b.GetBondType() == Chem.BondType.DOUBLE and b.GetOtherAtom(a).GetSymbol() == 'C' for b in a.GetBonds())


def classify(m, c, x):
    cn = carbon_nbrs(m, c)
    return {
        'cls': len(cn),
        'sp2': is_sp2_site(m, c),
        'allylic': (not is_sp2_site(m, c)) and any(has_cc_double(m, k) for k in cn),
        'benzylic': (not is_sp2_site(m, c)) and any(m.GetAtomWithIdx(k).GetIsAromatic() for k in cn),
        'neopentyl': any(m.GetAtomWithIdx(k).GetDegree() == 4 for k in cn),
    }


def heavy_deg(m, k):
    return m.GetAtomWithIdx(k).GetDegree()


def rearranges(m, c, x, cls):
    """Could the cation at c get a MORE stable cation by an H or CH3 shift from a neighbouring sp3 carbon?"""
    for k in carbon_nbrs(m, c):
        a = m.GetAtomWithIdx(k)
        if a.GetIsAromatic() or any(b.GetBondTypeAsDouble() >= 2 for b in a.GetBonds()):
            continue
        d = len(carbon_nbrs(m, k))
        has_h = a.GetTotalNumHs() > 0
        if (d > cls) if has_h else (d - 1 > cls):
            return True
    return False


def betas(m, c):
    out = []
    for k in carbon_nbrs(m, c):
        a = m.GetAtomWithIdx(k)
        if a.GetIsAromatic() or any(b.GetBondTypeAsDouble() >= 2 for b in a.GetBonds()):
            continue
        if a.GetTotalNumHs() > 0:
            out.append(k)
    return out


def attach_group(m, x, group):
    """New RWMol: halogen atom x replaced IN PLACE by the first atom of `group` (a SMILES), the other group atoms added and bonded."""
    g = Chem.MolFromSmiles(group)
    rw = Chem.RWMol(m)
    a0 = g.GetAtomWithIdx(0)
    new = Chem.Atom(a0.GetAtomicNum())
    new.SetFormalCharge(a0.GetFormalCharge())
    rw.ReplaceAtom(x, new)
    off = {0: x}
    for a in g.GetAtoms():
        if a.GetIdx() == 0:
            continue
        na = Chem.Atom(a.GetAtomicNum())
        na.SetFormalCharge(a.GetFormalCharge())
        off[a.GetIdx()] = rw.AddAtom(na)
    for b in g.GetBonds():
        rw.AddBond(off[b.GetBeginAtomIdx()], off[b.GetEndAtomIdx()], b.GetBondType())
    # let RDKit recompute hydrogens from valence for every atom that came from an organic-subset SMILES
    for a in rw.GetAtoms():
        if not a.GetNoImplicit() or a.GetIdx() in off.values():
            a.SetNumExplicitHs(0)
            a.SetNoImplicit(False)
    return rw, off


def sn2_product(smi, nuid):
    r = read_halide(smi)
    m, c, x, X = r
    rw, off = attach_group(m, x, NU[nuid])
    ca = rw.GetAtomWithIdx(c)
    if ca.GetChiralTag() != Chem.ChiralType.CHI_UNSPECIFIED:
        ca.InvertChirality()      # the slot of the halogen is taken by the nucleophile: back-side attack = inversion
    mol = rw.GetMol()
    Chem.SanitizeMol(mol)
    return Chem.MolToSmiles(mol), mol, c


def sn2_geometric(smi, nuid):
    """Product by geometry only: the nucleophile goes where X was reflected through the plane of the carbon's three other neighbours."""
    m, c, x, X = read_halide(smi)
    mh = embed(m)
    pos = mh.GetConformer().GetPositions()
    others = [n.GetIdx() for n in mh.GetAtomWithIdx(c).GetNeighbors() if n.GetIdx() != x]
    p0 = pos[others[0]]
    nrm = np.cross(pos[others[1]] - p0, pos[others[2]] - p0)
    nrm = nrm / np.linalg.norm(nrm)
    d = float(np.dot(pos[x] - p0, nrm))
    pnew = pos[x] - 2 * d * nrm
    g = Chem.MolFromSmiles(NU[nuid])
    rw = Chem.RWMol(mh)
    conf = rw.GetConformer()
    a0 = g.GetAtomWithIdx(0)
    new = Chem.Atom(a0.GetAtomicNum())
    new.SetFormalCharge(a0.GetFormalCharge())
    rw.ReplaceAtom(x, new)
    conf.SetAtomPosition(x, Point3D(*[float(v) for v in pnew]))
    axis = pnew - pos[c]
    axis = axis / np.linalg.norm(axis)
    off = {0: x}
    for k, a in enumerate([a for a in g.GetAtoms() if a.GetIdx() != 0], start=1):
        na = Chem.Atom(a.GetAtomicNum())
        na.SetFormalCharge(a.GetFormalCharge())
        i = rw.AddAtom(na)
        off[a.GetIdx()] = i
        conf.SetAtomPosition(i, Point3D(*[float(v) for v in (pnew + axis * 1.4 * k)]))
    for b in g.GetBonds():
        rw.AddBond(off[b.GetBeginAtomIdx()], off[b.GetEndAtomIdx()], b.GetBondType())
    for a in rw.GetAtoms():
        if a.GetAtomicNum() != 1 and a.GetIdx() in off.values():
            a.SetNumExplicitHs(0)
            a.SetNoImplicit(False)
    mol = rw.GetMol()
    Chem.SanitizeMol(mol)
    Chem.AssignStereochemistryFrom3D(mol)
    mol = Chem.RemoveHs(mol)
    return Chem.MolToSmiles(mol)


def n_centres(mol):
    return len(Chem.FindMolChiralCenters(mol, includeUnassigned=True, useLegacyImplementation=False))


def n_unspecified(mol):
    return sum(1 for _, t in Chem.FindMolChiralCenters(mol, includeUnassigned=True, useLegacyImplementation=False) if t == '?')


# ------------------------------------------------------------------ kinds
def do_sn2(case):
    smi, nu, eng = case['sub'], case['nu'], case['engine']
    r = read_halide(smi)
    refuse, why = False, ''
    if r is None:
        refuse, why = True, 'not a single alkyl halide'
    else:
        m, c, x, X = r
        k = classify(m, c, x)
        if k['sp2']:
            refuse, why = True, 'sp2'
        elif k['cls'] == 3:
            refuse, why = True, 'tertiary'
        elif k['neopentyl']:
            refuse, why = True, 'neopentyl'
    if refuse:
        return {'match': bool(eng.get('refused')), 'why': 'python refuses (%s); engine refused=%s' % (why, eng.get('refused')), 'python': {'refused': True}}
    if eng.get('refused'):
        return {'match': False, 'why': 'engine refused but python predicts a product', 'python': {}}
    prod, mol, c = sn2_product(smi, nu)
    ok = canon(eng['product']) == canon(prod)
    why = 'rwmol edit ' + ('agrees' if ok else 'DISAGREES %s vs %s' % (canon(eng['product']), prod))
    out = {'product': prod}
    m0 = r[0]
    specified = m0.GetAtomWithIdx(c).GetChiralTag() != Chem.ChiralType.CHI_UNSPECIFIED
    if specified:
        geo = sn2_geometric(smi, nu)
        ok3 = canon(geo) == canon(prod)
        ok = ok and ok3
        why += '; 3D back-side placement ' + ('agrees' if ok3 else 'DISAGREES %s' % geo)
        out['geometric'] = geo
        before = cip(m0, c)
        after = cip(mol, c)      # the carbon keeps its index in the molecule built by the RWMol edit
        el = eng.get('labels') or {}
        okl = el.get('before') == before and el.get('after') == after
        ok = ok and okl
        why += '; R/S %s->%s %s' % (before, after, 'agrees' if okl else 'DISAGREES engine %s' % json.dumps(el))
        out['labels'] = {'before': before, 'after': after}
        # inversion expected: when the carbon stays a stereocentre with the same CIP priority order the letter flips
    else:
        # flat substrate: the engine calls the product flat exactly when the carbon is a stereocentre of the product that nothing specified
        okf = bool(eng.get('flat')) == book_centre(mol, c)
        ok = ok and okf
        why += '; flat flag ' + ('agrees' if okf else 'DISAGREES')
    return {'match': ok, 'why': why, 'python': out}


def do_sn1(case):
    smi, nu, eng = case['sub'], case['nu'], case['engine']
    r = read_halide(smi)
    refuse, why = False, ''
    if r is None:
        refuse, why = True, 'not a single alkyl halide'
    else:
        m, c, x, X = r
        k = classify(m, c, x)
        if k['sp2']:
            refuse, why = True, 'sp2'
        elif not (k['cls'] >= 2 or k['benzylic'] or k['allylic']):
            refuse, why = True, 'primary or methyl'
        elif rearranges(m, c, x, k['cls']):
            refuse, why = True, 'rearranges'
        elif k['allylic'] and not (smi in ('C=CCBr', 'C=CCCl')):
            refuse, why = True, 'allylic (two ends)'
        elif n_centres(m) > 1 or (n_centres(m) == 1 and not centre_at(m, c)):
            refuse, why = True, 'second stereocentre'
    if refuse:
        return {'match': bool(eng.get('refused')), 'why': 'python refuses (%s); engine refused=%s' % (why, eng.get('refused')), 'python': {'refused': True}}
    if eng.get('refused'):
        return {'match': False, 'why': 'engine refused but python predicts a product', 'python': {}}
    rw, off = attach_group(m, x, NU[nu])
    ca = rw.GetAtomWithIdx(c)
    ca.SetChiralTag(Chem.ChiralType.CHI_UNSPECIFIED)
    mol = rw.GetMol()
    Chem.SanitizeMol(mol)
    isos = [Chem.MolToSmiles(i) for i in EnumerateStereoisomers(mol, options=StereoEnumerationOptions(onlyUnassigned=True, unique=True))]
    prods = sorted(set(isos))
    ok = sorted(canon(p) for p in eng['products']) == prods
    # the cation, rebuilt
    cat = Chem.RWMol(m)
    cat.RemoveAtom(x)
    ci = c if c < x else c - 1
    a = cat.GetAtomWithIdx(ci)
    a.SetFormalCharge(1)
    a.SetNoImplicit(False)
    a.SetNumExplicitHs(0)
    a.SetChiralTag(Chem.ChiralType.CHI_UNSPECIFIED)
    cm = cat.GetMol()
    Chem.SanitizeMol(cm)
    okc = canon(eng['cation']) == Chem.MolToSmiles(cm)
    okr = bool(eng.get('racemic')) == (len(prods) == 2)
    return {'match': ok and okc and okr, 'why': 'products %s cation %s racemic flag %s' % ('agree' if ok else 'DISAGREE %s vs %s' % (eng['products'], prods), 'agrees' if okc else 'DISAGREES', 'agrees' if okr else 'DISAGREES'), 'python': {'products': prods, 'cation': Chem.MolToSmiles(cm)}}


def book_centre(m, c):
    """Is atom c a chirality centre in the BOOK's sense (four different groups by the CIP rules; ring cis/trans stereo atoms such as C1 of 4-methylcyclohexyl are not)? Legacy perception."""
    return any(i == c for i, _ in Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=True))


def centre_at(m, c):
    return any(i == c for i, _ in Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False))


def alkene_from(m, c, x, k):
    rw = Chem.RWMol(m)
    rw.GetBondBetweenAtoms(c, k).SetBondType(Chem.BondType.DOUBLE)
    for i in (c, k):
        a = rw.GetAtomWithIdx(i)
        a.SetChiralTag(Chem.ChiralType.CHI_UNSPECIFIED)
        a.SetNumExplicitHs(0)
        a.SetNoImplicit(False)
    rw.RemoveAtom(x)
    mol = rw.GetMol()
    Chem.SanitizeMol(mol)
    ci = c if c < x else c - 1
    ki = k if k < x else k - 1
    subst = len([n for n in mol.GetAtomWithIdx(ci).GetNeighbors() if n.GetSymbol() == 'C' and n.GetIdx() != ki]) + len([n for n in mol.GetAtomWithIdx(ki).GetNeighbors() if n.GetSymbol() == 'C' and n.GetIdx() != ci])
    return Chem.MolToSmiles(mol), subst


def ring_blocked(m, c, x, bs, raw=None):
    """For a six-membered-ring substrate: which beta carbons cannot give an H trans to X. Returns (blocked set, needs_marks, polycyclic)."""
    ri = m.GetRingInfo()
    rings = [list(r) for r in ri.AtomRings()]
    if not rings:
        return set(), False, False
    ring_c = [r for r in rings if c in r]
    if not ring_c or len(ring_c[0]) != 6:
        return set(), False, False
    if len(rings) != 1:
        return set(), False, True
    ring = ring_c[0]
    src = raw if raw is not None else m      # tags as WRITTEN (RDKit drops the mark on a carbon that is not stereogenic, e.g. C1 of a 2,6-dimethyl ring with R,R methyls)
    unspec = lambda i: src.GetAtomWithIdx(i).GetChiralTag() == Chem.ChiralType.CHI_UNSPECIFIED
    need = False
    for k in bs:
        if k in ring:
            exo = [n.GetIdx() for n in m.GetAtomWithIdx(k).GetNeighbors() if n.GetIdx() not in ring]
            if m.GetAtomWithIdx(k).GetTotalNumHs() == 1 and exo and (unspec(k) or unspec(c)):
                need = True
    if need:
        return set(), True, False
    mh = embed(m)
    pos = mh.GetConformer().GetPositions()
    def side(a, s):
        i = ring.index(a)
        prev, nxt = ring[i - 1], ring[(i + 1) % 6]
        return 1 if float(np.dot(np.cross(pos[prev] - pos[a], pos[nxt] - pos[a]), pos[s] - pos[a])) > 0 else -1
    sx = side(c, x)
    blocked = set()
    for k in bs:
        if k not in ring:
            continue
        hs = [n.GetIdx() for n in mh.GetAtomWithIdx(k).GetNeighbors() if n.GetAtomicNum() == 1]
        if not any(side(k, h) != sx for h in hs):
            blocked.add(k)
    return blocked, False, False


def do_elim(case):
    smi, eng, kind = case['sub'], case['engine'], case['kind']
    r = read_halide(smi)
    refuse, why = False, ''
    blocked, needs, poly = set(), False, False
    if r is None:
        refuse, why = True, 'not a single alkyl halide'
    else:
        m, c, x, X = r
        k = classify(m, c, x)
        bs = betas(m, c)
        if k['sp2']:
            refuse, why = True, 'sp2'
        elif k['allylic']:
            refuse, why = True, 'allylic'
        elif kind == 'e1' and not (k['cls'] >= 2 or k['benzylic']):
            refuse, why = True, 'primary or methyl'
        elif kind == 'e1' and rearranges(m, c, x, k['cls']):
            refuse, why = True, 'rearranges'
        elif not bs:
            refuse, why = True, 'no beta H'
        elif kind == 'e2':
            blocked, needs, poly = ring_blocked(m, c, x, bs, Chem.MolFromSmiles(smi, sanitize=False))
            if needs:
                refuse, why = True, 'ring without cis/trans'
            elif poly:
                refuse, why = True, 'polycyclic'
            elif len(blocked) == len(bs):
                refuse, why = True, 'no allowed beta'
    if refuse:
        return {'match': bool(eng.get('refused')), 'why': 'python refuses (%s); engine refused=%s' % (why, eng.get('refused')), 'python': {'refused': True}}
    if eng.get('refused'):
        return {'match': False, 'why': 'engine refused but python predicts alkenes', 'python': {}}
    found = {}
    for k in bs:
        if k in blocked:
            continue
        smi2, s = alkene_from(m, c, x, k)
        found[smi2] = s
    top = max(found.values())
    py = {s: (n == top) for s, n in found.items()}
    en = {canon(a['smiles']): bool(a['major']) for a in eng['alkenes']}
    ok = en == {canon(s): v for s, v in py.items()}
    why = 'alkenes and Zaitsev flags ' + ('agree' if ok else 'DISAGREE engine %s python %s' % (en, py))
    out = {'alkenes': py}
    if kind == 'e2':
        bl = sorted(canon(alkene_from(m, c, x, k)[0]) for k in blocked)
        eb = sorted(canon(b['smiles']) for b in eng.get('ringBlocked', []))
        okb = bl == eb
        ok = ok and okb
        why += '; ring-forbidden alkenes ' + ('agree' if okb else 'DISAGREE engine %s python %s' % (eb, bl))
        ring6 = any(len(rg) == 6 and c in rg for rg in m.GetRingInfo().AtomRings())
        okring = bool(eng.get('ring')) == ring6
        ok = ok and okring
        out['blocked'] = bl
    return {'match': ok, 'why': why, 'python': out}


GR_BAD = [Chem.MolFromSmarts(s) for s in ('[OX2H]', '[NX3;H1,H2]', '[SX2H]', '[CX2H]#*', '[#6]=O', '[#7]')]


def do_grignard(case):
    smi, eng = case['sub'], case['engine']
    m = Chem.MolFromSmiles(smi)
    hs = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() in HAL]
    bad = any(m.HasSubstructMatch(p) for p in GR_BAD) or len(hs) != 1 or any(a.GetSymbol() not in ('C', 'O', 'N', 'S', 'Cl', 'Br', 'I', 'F') for a in m.GetAtoms())
    if bad:
        return {'match': bool(eng.get('refused')), 'why': 'python refuses; engine refused=%s' % eng.get('refused'), 'python': {'refused': True}}
    if eng.get('refused'):
        return {'match': False, 'why': 'engine refused but python makes the reagent', 'python': {}}
    x = hs[0]
    c = m.GetAtomWithIdx(x).GetNeighbors()[0].GetIdx()
    rw = Chem.RWMol(m)
    rw.GetAtomWithIdx(c).SetChiralTag(Chem.ChiralType.CHI_UNSPECIFIED)
    mg = rw.AddAtom(Chem.Atom(12))
    rw.RemoveBond(c, x)
    rw.AddBond(c, mg, Chem.BondType.SINGLE)
    rw.AddBond(mg, x, Chem.BondType.SINGLE)
    for a in rw.GetAtoms():
        if a.GetIdx() == c and a.GetNoImplicit() is False:
            continue
    reagent = Chem.MolToSmiles(rw.GetMol())
    # protonolysis: remove the halogen and the Mg, put H or D on the carbon
    def proto(iso):
        w = Chem.RWMol(m)
        w.GetAtomWithIdx(c).SetChiralTag(Chem.ChiralType.CHI_UNSPECIFIED)
        h = Chem.Atom(1)
        if iso:
            h.SetIsotope(2)
        w.ReplaceAtom(x, h)
        a = w.GetAtomWithIdx(c)
        a.SetNumExplicitHs(0)
        a.SetNoImplicit(False)
        mm = w.GetMol()
        Chem.SanitizeMol(mm)
        mm = Chem.RemoveHs(mm)      # an isotope-labelled H (D) is kept by default
        return Chem.MolToSmiles(mm)
    h2o, d2o = proto(False), proto(True)
    pr = eng['protonolysis']
    ok = canon(eng['reagent']) == canon(reagent) and canon(pr['H2O']) == canon(h2o) and canon(pr['D2O']) == canon(d2o)
    return {'match': ok, 'why': 'reagent %s, H2O product %s, D2O product %s' % (canon(reagent), h2o, d2o) if ok else 'DISAGREES: engine %s python %s %s %s' % (json.dumps(eng), reagent, h2o, d2o), 'python': {'reagent': reagent, 'H2O': h2o, 'D2O': d2o}}


def do_alcohol(case):
    smi, rid, eng = case['sub'], case['reagent'], case['engine']
    m = Chem.MolFromSmiles(smi)
    os_ = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == 'O']
    X = {'HBr': 'Br', 'HCl': 'Cl', 'HI': 'I', 'PBr3': 'Br', 'SOCl2': 'Cl'}[rid]
    inv = rid in ('PBr3', 'SOCl2')
    if len(os_) != 1 or any(a.GetSymbol() not in ('C', 'O') for a in m.GetAtoms()):
        return {'match': bool(eng.get('refused')), 'why': 'python refuses', 'python': {'refused': True}}
    o = os_[0]
    c = m.GetAtomWithIdx(o).GetNeighbors()[0].GetIdx()
    cls = len(carbon_nbrs(m, c))
    refuse = (inv and cls == 3) or (not inv and cls >= 2 and rearranges(m, c, o, cls))
    if refuse:
        return {'match': bool(eng.get('refused')), 'why': 'python refuses (3 degrees with PBr3/SOCl2, or a rearranging cation); engine refused=%s' % eng.get('refused'), 'python': {'refused': True}}
    if eng.get('refused'):
        return {'match': False, 'why': 'engine refused but python predicts a halide', 'python': {}}
    rw = Chem.RWMol(m)
    rw.ReplaceAtom(o, Chem.Atom({'Br': 35, 'Cl': 17, 'I': 53}[X]))
    ca = rw.GetAtomWithIdx(c)
    specified = ca.GetChiralTag() != Chem.ChiralType.CHI_UNSPECIFIED
    if inv and specified:
        ca.InvertChirality()
    if not inv:
        ca.SetChiralTag(Chem.ChiralType.CHI_UNSPECIFIED)
    mol = rw.GetMol()
    Chem.SanitizeMol(mol)
    prod = Chem.MolToSmiles(mol)
    ok = canon(eng['product']) == canon(prod)
    why = 'edit ' + ('agrees' if ok else 'DISAGREES %s vs %s' % (eng['product'], prod))
    out = {'product': prod}
    if inv and specified:
        # geometry: halide where the oxygen was, reflected through the plane of the other three neighbours of C
        mh = embed(m)
        pos = mh.GetConformer().GetPositions()
        others = [n.GetIdx() for n in mh.GetAtomWithIdx(c).GetNeighbors() if n.GetIdx() != o]
        p0 = pos[others[0]]
        nrm = np.cross(pos[others[1]] - p0, pos[others[2]] - p0)
        nrm /= np.linalg.norm(nrm)
        pnew = pos[o] - 2 * float(np.dot(pos[o] - p0, nrm)) * nrm
        w = Chem.RWMol(mh)
        # the alcohol H (on O) goes away with the O; remove it first
        hs = [n.GetIdx() for n in w.GetAtomWithIdx(o).GetNeighbors() if n.GetAtomicNum() == 1]
        w.ReplaceAtom(o, Chem.Atom({'Br': 35, 'Cl': 17, 'I': 53}[X]))
        w.GetConformer().SetAtomPosition(o, Point3D(*[float(v) for v in pnew]))
        for h in sorted(hs, reverse=True):
            w.RemoveAtom(h)
        g3 = w.GetMol()
        Chem.SanitizeMol(g3)
        Chem.AssignStereochemistryFrom3D(g3)
        g3 = Chem.RemoveHs(g3)
        geo = Chem.MolToSmiles(g3)
        ok3 = canon(geo) == canon(prod)
        ok = ok and ok3
        why += '; 3D back-side ' + ('agrees' if ok3 else 'DISAGREES %s' % geo)
        before, after = cip(m, c), cip(mol, c)
        el = eng.get('labels') or {}
        okl = el.get('before') == before and el.get('after') == after
        ok = ok and okl
        why += '; R/S %s->%s %s' % (before, after, 'agrees' if okl else 'DISAGREES')
        out['labels'] = {'before': before, 'after': after}
    return {'match': ok, 'why': why, 'python': out}


def do_mono(case):
    smi, X, eng = case['sub'], case['X'], case['engine']
    m = Chem.MolFromSmiles(smi)
    if any(a.GetSymbol() != 'C' for a in m.GetAtoms()) or any(b.GetBondTypeAsDouble() != 1 for b in m.GetBonds()):
        return {'match': bool(eng.get('refused')), 'why': 'python refuses', 'python': {'refused': True}}
    mh = Chem.AddHs(m)
    groups = {}
    for a in mh.GetAtoms():
        if a.GetAtomicNum() != 1:
            continue
        rw = Chem.RWMol(mh)
        rw.ReplaceAtom(a.GetIdx(), Chem.Atom({'Br': 35, 'Cl': 17}[X]))
        mol = Chem.RemoveHs(rw.GetMol())
        s = flat(Chem.MolToSmiles(mol))
        groups.setdefault(s, 0)
        groups[s] += 1
    py = {}
    for s, n in groups.items():
        pm = Chem.MolFromSmiles(s)
        py[s] = {'nH': n, 'chiral': len(Chem.FindMolChiralCenters(pm, includeUnassigned=True, useLegacyImplementation=True)) > 0}   # book sense: ring cis/trans atoms are not chirality centres
    en = {canon(e['smiles']): {'nH': e['nH'], 'chiral': bool(e['chiral'])} for e in eng['products']}
    py2 = {canon(s): v for s, v in py.items()}
    ok = en == py2
    return {'match': ok, 'why': ('%d monohalides agree' % len(py2)) if ok else 'DISAGREES engine %s python %s' % (en, py2), 'python': py2}


def do_cistrans(case):
    """cis / trans of X and the CH3 on a 1-halo-2-methylcyclohexane read from 3D (the pool's tags must mean what the ids say)."""
    smi = case['sub']
    m, c, x, X = read_halide(smi)
    mh = embed(m)
    pos = mh.GetConformer().GetPositions()
    ring = list([r for r in m.GetRingInfo().AtomRings()][0])
    me = [n.GetIdx() for n in m.GetAtomWithIdx(ring[0]).GetNeighbors()]
    k = [i for i in ring if i != c and any(n.GetSymbol() == 'C' and n.GetIdx() not in ring for n in m.GetAtomWithIdx(i).GetNeighbors())][0]
    r = [n.GetIdx() for n in m.GetAtomWithIdx(k).GetNeighbors() if n.GetIdx() not in ring][0]
    def side(a, s):
        i = ring.index(a)
        prev, nxt = ring[i - 1], ring[(i + 1) % 6]
        return 1 if float(np.dot(np.cross(pos[prev] - pos[a], pos[nxt] - pos[a]), pos[s] - pos[a])) > 0 else -1
    rel = 'cis' if side(c, x) == side(k, r) else 'trans'
    return {'match': rel == case['expect'], 'why': 'X and CH3 are %s in 3D (expected %s)' % (rel, case['expect']), 'python': {'rel': rel}}


def do_cip(case):
    m = Chem.MolFromSmiles(case['sub'])
    c = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() in ('Br', 'Cl', 'I', 'O')][0]
    c = m.GetAtomWithIdx(c).GetNeighbors()[0].GetIdx()
    lab = cip(m, c)
    return {'match': lab == case['expect'], 'why': 'CIP label %s (expected %s)' % (lab, case['expect']), 'python': {'label': lab}}


KINDS = {'sn2': do_sn2, 'sn1': do_sn1, 'e2': do_elim, 'e1': do_elim, 'grignard': do_grignard, 'alcohol': do_alcohol, 'mono': do_mono, 'cistrans': do_cistrans, 'cip': do_cip}

if __name__ == '__main__':
    data = json.load(open(sys.argv[1], encoding='utf-8'))
    out = []
    for c in data['cases']:
        try:
            res = KINDS[c['kind']](c)
        except Exception as e:  # a crash is a mismatch, with the reason
            res = {'match': False, 'why': 'python crashed: %r' % (e,), 'python': {}}
        out.append({'id': c['id'], 'kind': c['kind'], **res})
    json.dump({'cases': out}, open(sys.argv[2], 'w', encoding='utf-8'))
