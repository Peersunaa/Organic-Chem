#!/usr/bin/env python3
"""Independent check of learn/engine/reactions-aromatic.js, Lesson 14 (substituent effects, McMurry 5.6 to 5.10).
usage: check_directors.py in.json out.json
in.json  = {"mode": "products", "cases": [{"arene": smiles, "reagent": "Br2"|"Cl2"|"I2"|"HNO3"|"SO3"|"RCl"|"RCOCl", "halide": smiles|null}]}
         | {"mode": "sigma",    "cases": [{"arene": smiles}]}                       (a ring with ONE group; the three attacks ortho / meta / para)
         | {"mode": "sidechain","cases": [{"op": "oxidize"|"H2_Pd"|"H2_Pt_high", "smiles": smiles}]}
out.json = one answer per case.

Nothing is shared with the JavaScript engine: this file has its OWN table of groups (name -> class and strength, with its own SMARTS), its own ring topology
(distances round the ring found by RDKit), its own reaction SMARTS, and decides the orientation from the book's rules (Figure 5.6 and Problem 5.37).
  products : which ring carbons can be attacked is decided here; the substitution is done by an RDKit reaction ([cH:1] -> [c:1]X) run on every ring C-H, and the products
             that match the allowed positions are returned as canonical SMILES (or a refusal code).
  sigma    : the carbocation for attack at an ortho, meta and para carbon is built with RWMol edits, and its resonance forms come from RDKit's ResonanceMolSupplier. Reported:
             the ring-only forms (canonical SMILES), whether one puts the + on the ring carbon that carries the group, and whether a form puts the + on the group's own atom.
  sidechain: KMnO4 (any alkyl group with a benzylic H -> CO2H) and the hydrogenations, done with RWMol edits.
"""
import json, sys
from rdkit import Chem
from rdkit.Chem import AllChem, rdchem
from rdkit import RDLogger
RDLogger.DisableLog('rdApp.*')

# ---- the table: (name, class, strength, SMARTS of ring carbon + group head, allowed elements in the group, number of multiple bonds inside the group)
#      class: 'aop' activator o/p, 'dop' deactivator o/p (halogens), 'dm' deactivator m
TABLE = [
    ("amino",      "aop", 3, "[c:1]-[N;D1;H2:2]", "N", 0),
    ("alkylamino", "aop", 3, "[c:1]-[N;D2;H1;!$(N-[C,S]=[O,S]):2]-[C;X4]", "NC", 0),
    ("dialkylamino", "aop", 3, "[c:1]-[N;D3;H0;!$(N-[C,S]=[O,S]);!$([N+]):2](-[C;X4])-[C;X4]", "NC", 0),
    ("hydroxy",    "aop", 3, "[c:1]-[O;D1;H1:2]", "O", 0),
    ("alkoxy",     "aop", 3, "[c:1]-[O;D2;H0:2]-[C;X4]", "OC", 0),
    ("acylamino",  "aop", 2, "[c:1]-[N;D2;H1:2]-C(=O)-[#6]", "NCO", 1),
    ("alkyl",      "aop", 1, "[c:1]-[C;X4;!$(C~[!#6;!#1]):2]", "C", 0),
    ("phenyl",     "aop", 1, "[c:1]-!@[c:2]1ccccc1", "C", 3),
    ("fluoro",     "dop", 0, "[c:1]-[F:2]", "F", 0),
    ("chloro",     "dop", 0, "[c:1]-[Cl:2]", "Cl", 0),
    ("bromo",      "dop", 0, "[c:1]-[Br:2]", "Br", 0),
    ("iodo",       "dop", 0, "[c:1]-[I:2]", "I", 0),
    ("nitro",      "dm", -1, "[c:1]-[N+:2](=O)-[O-]", "NO", 1),
    ("cyano",      "dm", -1, "[c:1]-[C:2]#N", "CN", 1),
    ("sulfo",      "dm", -1, "[c:1]-[S:2](=O)(=O)-[O;H1]", "SO", 2),
    ("formyl",     "dm", -1, "[c:1]-[C;H1:2]=O", "CO", 1),
    ("ketone",     "dm", -1, "[c:1]-[C;H0:2](=O)-[C;X4]", "CO", 1),
    ("carboxy",    "dm", -1, "[c:1]-[C:2](=O)-[O;H1]", "CO", 1),
    ("ester",      "dm", -1, "[c:1]-[C:2](=O)-[O;H0]-[C;X4]", "CO", 1),
    ("ammonium",   "dm", -1, "[c:1]-[N;X4;+:2]", "NC", 0),
]
PAT = [(n, c, lv, Chem.MolFromSmarts(s), els, pi) for (n, c, lv, s, els, pi) in TABLE]
STRONG_DEACT = {"nitro", "cyano", "sulfo", "formyl", "ketone", "carboxy", "ester", "ammonium"}
AMINES = {"amino", "alkylamino", "dialkylamino"}
RXN = {
    "Br2": "[cH:1]>>[c:1]Br", "Cl2": "[cH:1]>>[c:1]Cl", "I2": "[cH:1]>>[c:1]I",
    "HNO3": "[cH:1]>>[c:1][N+](=O)[O-]", "SO3": "[cH:1]>>[c:1]S(=O)(=O)[OH]",
    "RCl": "[cH:1].[CX4:2][Cl:3]>>[c:1][C:2]", "RCOCl": "[cH:1].[CX3:2](=O)[Cl:3]>>[c:1][C:2]=O",
}


def benzene_ring(m):
    ri = [r for r in m.GetRingInfo().AtomRings() if len(r) == 6 and all(m.GetAtomWithIdx(i).GetIsAromatic() and m.GetAtomWithIdx(i).GetSymbol() == "C" for i in r)]
    return list(ri[0]) if ri else None


def fragment(m, ring, head):
    """atoms reachable from `head` without entering the ring"""
    seen, stack = {head}, [head]
    rs = set(ring)
    while stack:
        a = stack.pop()
        for n in m.GetAtomWithIdx(a).GetNeighbors():
            j = n.GetIdx()
            if j not in rs and j not in seen:
                seen.add(j); stack.append(j)
    return seen


def groups_of(m, ring):
    """[(ring atom, name, class, strength, fragment)] or None when a group is not in the table / the molecule has other pieces"""
    out, used = [], set(ring)
    rs = set(ring)
    for r in ring:
        outside = [n.GetIdx() for n in m.GetAtomWithIdx(r).GetNeighbors() if n.GetIdx() not in rs]
        if len(outside) > 1:
            return None
        if not outside:
            continue
        head = outside[0]
        frag = fragment(m, ring, head)
        if frag & used:
            return None
        used |= frag
        els = {m.GetAtomWithIdx(a).GetSymbol() for a in frag}
        km = Chem.Mol(m)
        Chem.Kekulize(km, clearAromaticFlags=True)
        pi = sum(1 for b in km.GetBonds() if b.GetBeginAtomIdx() in frag and b.GetEndAtomIdx() in frag and b.GetBondType() in (rdchem.BondType.DOUBLE, rdchem.BondType.TRIPLE))
        hit = []
        for (n, c, lv, p, ge, gp) in PAT:
            ok = any(mt[0] == r and mt[1] == head for mt in m.GetSubstructMatches(p))
            if ok and els <= set(__import__("re").findall(r"Cl|Br|[A-Z][a-z]?", ge)) and pi == gp:
                hit.append((n, c, lv))
        if len(hit) != 1:
            return None
        out.append((r, hit[0][0], hit[0][1], hit[0][2], frag))
    if len(used) != m.GetNumAtoms():
        return None
    return out


def ring_dist(m, ring, a, b):
    i, j = ring.index(a), ring.index(b)
    d = abs(i - j)
    return min(d, 6 - d)           # 1 ortho, 2 meta, 3 para


def favoured(m, ring, g, open_atoms):
    r, name, cls, lv, frag = g
    want = {2} if cls == "dm" else {1, 3}
    return {a for a in open_atoms if ring_dist(m, ring, r, a) in want}


def decide(m, ring, gs, reagent, halide):
    """returns (refusal|None, set of ring atoms that can be attacked, outcome)"""
    names = {g[1] for g in gs}
    if len(gs) > 2:
        return "tooMany", None, None
    fc = reagent in ("RCl", "RCOCl")
    if fc:
        if names & STRONG_DEACT:
            return "deactivated", None, None
        if names & AMINES:
            return "amine", None, None
        if names & {"hydroxy", "acylamino"}:
            return "notModelled", None, None
    if reagent in ("HNO3", "SO3") and names & AMINES:
        return "amineAcid", None, None
    open_atoms = [a for a in ring if all(a != g[0] for g in gs)]
    if len(gs) == 1:
        return None, favoured(m, ring, gs[0], open_atoms), "m" if gs[0][2] == "dm" else "op"
    a, b = gs
    def sandwiched(x):
        return ring_dist(m, ring, a[0], x) == 1 and ring_dist(m, ring, b[0], x) == 1
    fa, fb = favoured(m, ring, a, open_atoms), favoured(m, ring, b, open_atoms)
    both = fa & fb
    if both:
        pick = {x for x in both if not sandwiched(x)}
        return (None, pick, "cooperate") if pick else ("crowded", None, None)
    if a[1] == b[1] and a[3] == b[3]:
        return "same-kind", fa | fb, "equal"      # two alike groups: fine only if every place gives the same compound (checked after the products are made)
    if a[3] == b[3] or max(a[3], b[3]) < 1:
        return "compete", None, None
    w = a if a[3] > b[3] else b
    pick = {x for x in favoured(m, ring, w, open_atoms) if not sandwiched(x)}
    return (None, pick, "wins") if pick else ("crowded", None, None)


def run_products(c):
    res = {"refused": None, "products": None, "outcome": None, "names": None}
    arene = Chem.MolFromSmiles(c["arene"])
    ring = benzene_ring(arene)
    if ring is None:
        res["refused"] = "noRing"; return res
    gs = groups_of(arene, ring)
    if gs is None:
        res["refused"] = "unknownGroup"; return res
    res["names"] = sorted(g[1] for g in gs)
    if not gs:
        res["refused"] = "benzene"; return res
    ref, ok_atoms, outcome = decide(arene, ring, gs, c["reagent"], c.get("halide"))
    if ref == "same-kind":
        ok_atoms = {x for x in ok_atoms if not (ring_dist(arene, ring, gs[0][0], x) == 1 and ring_dist(arene, ring, gs[1][0], x) == 1)}
        ref = None
    elif ref:
        res["refused"] = ref; return res
    rg = c["reagent"]
    if rg in ("RCl", "RCOCl"):
        hal = Chem.MolFromSmiles(c["halide"])
        pat = Chem.MolFromSmarts("[CX4][Cl]" if rg == "RCl" else "[CX3](=O)[Cl]")
        if not hal.HasSubstructMatch(pat) or (rg == "RCl" and hal.HasSubstructMatch(Chem.MolFromSmarts("[c,$(C=C)][Cl]"))):
            res["refused"] = "nomatch"; return res
        tuples = AllChem.ReactionFromSmarts(RXN[rg]).RunReactants((arene, hal))
    else:
        tuples = AllChem.ReactionFromSmarts(RXN[rg]).RunReactants((arene,))
    prods = {}
    for tup in tuples:
        p = tup[0]
        site = [a.GetIntProp("react_atom_idx") for a in p.GetAtoms() if a.HasProp("old_mapno") and a.GetIntProp("old_mapno") == 1]
        if not site or site[0] not in ok_atoms:
            continue
        Chem.SanitizeMol(p)
        prods[Chem.MolToSmiles(p)] = site[0]
    if outcome == "equal" and len(prods) != 1:
        res["refused"] = "compete"; return res
    res["products"] = sorted(prods)
    res["outcome"] = outcome
    return res


# ------------------------------------------------------------------------------------------------ sigma complexes and RDKit resonance
def norm(m):
    k = Chem.Mol(m)
    try:
        Chem.Kekulize(k, clearAromaticFlags=True)
    except Exception:
        pass
    return Chem.MolToSmiles(Chem.MolFromSmiles(Chem.MolToSmiles(k, kekuleSmiles=True)))


def sigma_at(arene, ring, atom):
    m = Chem.Mol(arene)
    Chem.Kekulize(m, clearAromaticFlags=True)
    rw = Chem.RWMol(m)
    nbrs = [n.GetIdx() for n in m.GetAtomWithIdx(atom).GetNeighbors() if n.GetIdx() in ring]
    partner = [n for n in nbrs if m.GetBondBetweenAtoms(atom, n).GetBondType() == rdchem.BondType.DOUBLE][0]
    rw.GetBondBetweenAtoms(atom, partner).SetBondType(rdchem.BondType.SINGLE)
    rw.GetAtomWithIdx(partner).SetFormalCharge(1)
    br = rw.AddAtom(Chem.Atom(35))
    rw.AddBond(atom, br, rdchem.BondType.SINGLE)
    for a in rw.GetAtoms():
        a.SetNoImplicit(False); a.SetNumExplicitHs(0)
    s = rw.GetMol()
    Chem.SanitizeMol(s, Chem.SANITIZE_ALL ^ Chem.SANITIZE_SETAROMATICITY)
    return s, br


def run_sigma(c):
    arene = Chem.MolFromSmiles(c["arene"])
    ring = benzene_ring(arene)
    gs = groups_of(arene, ring)
    if gs is None or len(gs) != 1:
        return {"error": "need exactly one recognised group"}
    g = gs[0]
    out = {"group": g[1], "attacks": {}}
    for d, label in ((1, "ortho"), (2, "meta"), (3, "para")):
        atom = [a for a in ring if ring_dist(arene, ring, g[0], a) == d][0]
        s, br = sigma_at(arene, ring, atom)
        rs = set(ring)
        base = [a.GetFormalCharge() for a in s.GetAtoms()]
        forms = list(Chem.ResonanceMolSupplier(s, Chem.ALLOW_INCOMPLETE_OCTETS | Chem.UNCONSTRAINED_CATIONS))
        ring_only, donor, special = [], False, False
        head = [n.GetIdx() for n in arene.GetAtomWithIdx(g[0]).GetNeighbors() if n.GetIdx() not in rs][0]
        head_sym = arene.GetAtomWithIdx(head).GetSymbol()
        for f in forms:
            q = [a.GetFormalCharge() for a in f.GetAtoms()]
            outside_same = all(q[i] == base[i] for i in range(s.GetNumAtoms()) if i not in rs)
            if outside_same:
                ring_only.append(norm(f))
                plus = [i for i in ring if q[i] == 1]
                if plus and any(n.GetIdx() in g[4] for n in f.GetAtomWithIdx(plus[0]).GetNeighbors()):
                    special = True
            elif head_sym in ("N", "O", "F", "Cl", "Br", "I") and q[head] == 1 and base[head] != 1 and all(q[i] == 0 for i in ring):
                donor = True       # the + sits on the group's own lone-pair atom (N, O or a halogen), the ring is neutral
        out["attacks"][label] = {"forms": sorted(set(ring_only)), "special": special, "donor": donor, "n_all": len(forms)}
    return out


# ------------------------------------------------------------------------------------------------ side chains
def run_side(c):
    m = Chem.MolFromSmiles(c["smiles"])
    op = c["op"]
    ring = benzene_ring(m)
    if ring is None:
        return {"refused": "noRing"}
    rs = set(ring)
    if op == "oxidize":
        rw = Chem.RWMol(m)
        todo = []
        for r in ring:
            for n in m.GetAtomWithIdx(r).GetNeighbors():
                if n.GetIdx() in rs:
                    continue
                frag = fragment(m, ring, n.GetIdx())
                saturated_carbon = all(m.GetAtomWithIdx(i).GetSymbol() == "C" and not m.GetAtomWithIdx(i).GetIsAromatic() and m.GetAtomWithIdx(i).GetHybridization() == rdchem.HybridizationType.SP3 for i in frag)
                if saturated_carbon and n.GetTotalNumHs() > 0:
                    todo.append((r, n.GetIdx(), frag))
        if not todo:
            return {"product": Chem.MolToSmiles(m), "reacts": False}
        drop = sorted({a for t in todo for a in t[2]}, reverse=True)
        keep_ring = [t[0] for t in todo]
        # attach COOH first (indices stay valid), then delete the old chain atoms
        for r in keep_ring:
            c1 = rw.AddAtom(Chem.Atom(6)); o1 = rw.AddAtom(Chem.Atom(8)); o2 = rw.AddAtom(Chem.Atom(8))
            rw.AddBond(r, c1, rdchem.BondType.SINGLE); rw.AddBond(c1, o1, rdchem.BondType.DOUBLE); rw.AddBond(c1, o2, rdchem.BondType.SINGLE)
        for a in drop:
            rw.RemoveAtom(a)
        p = rw.GetMol()
        for a in p.GetAtoms():
            a.SetNoImplicit(False); a.SetNumExplicitHs(0)
        Chem.SanitizeMol(p)
        return {"product": Chem.MolToSmiles(p), "reacts": True}
    # hydrogenations
    ring_bonds = {(min(a, b), max(a, b)) for a in ring for b in ring if m.GetBondBetweenAtoms(a, b)}
    kek = Chem.Mol(m)
    Chem.Kekulize(kek, clearAromaticFlags=True)
    rw = Chem.RWMol(kek)
    changed = False
    for b in kek.GetBonds():
        a1, a2 = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        inring = (min(a1, a2), max(a1, a2)) in ring_bonds
        if b.GetBondType() in (rdchem.BondType.DOUBLE, rdchem.BondType.TRIPLE) and not inring:
            rw.GetBondBetweenAtoms(a1, a2).SetBondType(rdchem.BondType.SINGLE); changed = True
        if inring and op == "H2_Pt_high":
            rw.GetBondBetweenAtoms(a1, a2).SetBondType(rdchem.BondType.SINGLE); changed = True
    if not changed:
        return {"product": Chem.MolToSmiles(m), "reacts": False}
    p = rw.GetMol()
    for a in p.GetAtoms():
        a.SetNoImplicit(False); a.SetNumExplicitHs(0); a.SetIsAromatic(False)
    Chem.SanitizeMol(p)
    return {"product": Chem.MolToSmiles(p), "reacts": True}


if __name__ == "__main__":
    spec = json.load(open(sys.argv[1]))
    fn = {"products": run_products, "sigma": run_sigma, "sidechain": run_side}[spec["mode"]]
    json.dump([fn(c) for c in spec["cases"]], open(sys.argv[2], "w"))
