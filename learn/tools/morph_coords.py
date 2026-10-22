#!/usr/bin/env python
"""Morph data for learn/morph/: a substrate drawing and a product drawing that share one coordinate frame, plus the atom map between them.

Writes learn/morph/morphs.json:
  { "_meta": {...},
    key: { sub:{smiles, atoms:[{idx,sym,x,y,c?,h?}], bonds:[{a,b,order,stereo?,ar?}]}, prod:{smiles, atoms, bonds},
           map:{subIdx: prodIdx}, changedBonds:[{a,b,from,to}] (product indices; to 0 = the bond breaks), addedAtoms:[prodIdx], removedAtoms:[subIdx],
           moved:[subIdx] (mapped atoms that change position), reagentLabel, chip, addedFrom:'reagent', alt:[{prod, map, changedBonds, addedAtoms, removedAtoms, moved}] } }
  key = "<canonical substrate>|<reagentId>" (every productive builder pair, so every table cell) or "hub:<cardId>[:2]" (the hub cards' worked examples).
  `alt` = the other major products of the same pair (ortho and para, for example), each mapped from the same substrate drawing.

Method:
  1. Map. rdFMCS on heavy atoms, elements must match, bond order ANY (C=C maps onto C-C), ring atoms to ring atoms (when a ring opens or forms, the larger of
     the ring-only and the free search wins). Repeated on what is left, so a cleavage maps each piece and a Diels-Alder maps both reactants. Among all
     matches of the product the one with the fewest bond-order changes wins, then the one whose new atoms sit on atoms that changed (Br goes to the carbon
     of the double bond, not to the far end of the chain).
  2. Lay out. The substrate gets RDKit Compute2DCoords. The product is laid out with coordMap = the substrate positions of its mapped atoms, so they do not
     move; RDKit places only the new atoms (Br, OH, the O of C=O, NO2), then the free leaves are spread into the widest gap (scene_coords.replace_leaves).
     A triple bond that becomes a double or single bond cannot stay straight: the smaller side of it is released and swings to 120 degrees (`moved`).
     Two or more product pieces (cleavage) drift apart by 24 px. Two or more reactants (Diels-Alder) are laid out the other way round: the product
     first, then each reactant at its product positions pushed 24 px out.
  3. Check. Wedges from the chiral tags (WedgeMolBonds); the drawing is read back as a molblock and must give the product's canonical isomeric SMILES
     (cis / trans from the coordinates, R / S from the wedges). A wrong cis / trans is fixed by reflecting the released side across the double bond.
  Units: RDKit bond 1.5 -> 38 px, the pair centred in a 320 x 200 box (shrunk when it would not fit), y down, 1 decimal.

Run:  python learn/tools/morph_coords.py      (runs node learn/tools/morph_pairs.mjs for the jobs, writes the JSON, prints counts and failures)
"""
import json
import math
import subprocess
import sys
from pathlib import Path

from rdkit import Chem, RDLogger
from rdkit.Chem import rdDepictor, rdFMCS
from rdkit.Geometry import Point2D, Point3D

sys.path.insert(0, str(Path(__file__).parent))
from scene_coords import replace_leaves  # noqa: E402

RDLogger.DisableLog('rdApp.*')
rdDepictor.SetPreferCoordGen(False)

HERE = Path(__file__).resolve().parent
LEARN = HERE.parent
OUT = LEARN / 'morph' / 'morphs.json'
RD_BOND = 1.5
PX_BOND = 38.0
BOX_W, BOX_H, MARGIN = 320.0, 200.0, 18.0
DRIFT = 24.0


def r1(v):
    return round(v + 0.0, 1)


# ---------------------------------------------------------------- molecules
def mol_of(smi):
    m = Chem.MolFromSmiles(smi)
    if m is None:
        raise ValueError('bad SMILES ' + smi)
    return m


def frags_of(m):
    return [list(f) for f in Chem.GetMolFrags(m)]


def kekule_orders(m):
    k = Chem.Mol(m)
    Chem.Kekulize(k, clearAromaticFlags=True)
    out = {}
    for b in k.GetBonds():
        out[(b.GetBeginAtomIdx(), b.GetEndAtomIdx())] = int(round(b.GetBondTypeAsDouble()))
    return out


def bond_key(m, a, b):
    bd = m.GetBondBetweenAtoms(a, b)
    if bd is None:
        return 0
    if bd.GetIsAromatic():
        return 'ar'
    return int(round(bd.GetBondTypeAsDouble()))


def sym_of(at):
    if at.GetAtomicNum() == 1 and at.GetIsotope() == 2:
        return 'D'
    return at.GetSymbol()


# ---------------------------------------------------------------- mapping
def submol(m, keep):
    """The atoms `keep` of m as their own molecule (no sanitising), with the index list back to m."""
    keep = sorted(keep)
    rw = Chem.RWMol(m)
    for i in sorted(set(range(m.GetNumAtoms())) - set(keep), reverse=True):
        rw.RemoveAtom(i)
    s = rw.GetMol()
    s.UpdatePropertyCache(strict=False)
    Chem.FastFindRings(s)
    return s, keep


def mcs_pattern(a, b, ring_only):
    p = rdFMCS.MCSParameters()
    p.AtomTyper = rdFMCS.AtomCompare.CompareElements
    p.BondTyper = rdFMCS.BondCompare.CompareAny
    p.BondCompareParameters.RingMatchesRingOnly = ring_only
    p.BondCompareParameters.CompleteRingsOnly = False
    p.AtomCompareParameters.RingMatchesRingOnly = ring_only
    p.AtomCompareParameters.MatchIsotope = False
    p.Timeout = 4
    r = rdFMCS.FindMCS([a, b], p)
    if r.numAtoms < 2:
        return None, 0
    return Chem.MolFromSmarts(any_bonds(r.smartsString)), r.numAtoms


def any_bonds(smarts):
    """FMCS writes only the bond orders it saw ('=,-' on the C=C, '-' elsewhere), which pins the double bond inside the match: every bond becomes '~'."""
    out, depth, run = [], 0, False
    for ch in smarts:
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
        if depth == 0 and ch in '-=#:~@,!/' + chr(92):
            if not run:
                out.append('~')
            run = True
            continue
        run = False
        out.append(ch)
    return ''.join(out)


def score_map(sub, prod, mp):
    """(H atoms gained or lost over the map, bond-order changes, new atoms not on a changed atom): lower is better. H counts first: a Diels-Alder moves
    no H at all, while a map that scrambles the diene through the methyl would; Br goes to the carbon that did not get the H's partner."""
    inv = {v: k for k, v in mp.items()}
    changes = 0
    centre = set()
    ms = list(mp.items())
    for i in range(len(ms)):
        for j in range(i + 1, len(ms)):
            (sa, pa), (sb, pb) = ms[i], ms[j]
            ks, kp = bond_key(sub, sa, sb), bond_key(prod, pa, pb)
            if ks != kp:
                changes += 1
                centre.update((sa, sb))
    for s in mp:
        if any(n.GetIdx() not in mp for n in sub.GetAtomWithIdx(s).GetNeighbors()):
            centre.add(s)
    stray = 0
    for p in range(prod.GetNumAtoms()):
        if p in inv:
            continue
        for n in prod.GetAtomWithIdx(p).GetNeighbors():
            if n.GetIdx() in inv and inv[n.GetIdx()] not in centre:
                stray += 1
    hdiff = sum(abs(sub.GetAtomWithIdx(s_).GetTotalNumHs() - prod.GetAtomWithIdx(p_).GetTotalNumHs()) for s_, p_ in mp.items())
    return (hdiff, changes, stray)


def extend_map(sub, prod, mp, slack=0):
    """One more MCS round on the atoms not mapped yet: every best-scoring way to add it (ties kept), or [] when nothing is left to map."""
    free_s = [i for i in range(sub.GetNumAtoms()) if i not in mp]
    free_p = [i for i in range(prod.GetNumAtoms()) if i not in mp.values()]
    if not free_s or not free_p:
        return []
    a, ka = submol(sub, free_s)
    b, kb = submol(prod, free_p)
    best = None
    for ring_only in (True, False):
        patt, n = mcs_pattern(a, b, ring_only)
        if patt is not None and (best is None or n > best[1]):
            best = (patt, n)
    if best is None:
        return []
    patt = best[0]
    sms = a.GetSubstructMatches(patt, uniquify=False, maxMatches=400, useChirality=False)
    if not sms:
        return []
    pms = b.GetSubstructMatches(patt, uniquify=True, maxMatches=200, useChirality=False)   # every ordering of the substrate x one per product atom set covers every map
    scored = []
    for ms in sms:
        for mp_ in pms:
            trial = dict(mp)
            trial.update({ka[x]: kb[y] for x, y in zip(ms, mp_)})
            scored.append((score_map(sub, prod, trial), trial))
    if not scored:
        return []
    top = min(sc for sc, _ in scored)
    out, seen = [], set()
    for sc, t in sorted(scored, key=lambda x: x[0]):
        k = frozenset(t.items())
        if sc[0] + sc[1] <= top[0] + top[1] + slack and k not in seen:
            seen.add(k)
            out.append(t)
    return out[:30]


def leftovers(sub, prod, mp):
    """Lone leftovers (one carbon of ethylene going to its own CO2): same element, next to an atom already mapped where possible."""
    for p in range(prod.GetNumAtoms()):
        if p in mp.values() or prod.GetAtomWithIdx(p).GetAtomicNum() != 6:
            continue
        opts = [s for s in range(sub.GetNumAtoms()) if s not in mp and sub.GetAtomWithIdx(s).GetAtomicNum() == 6]
        if opts:
            opts.sort(key=lambda s: -sum(1 for n in sub.GetAtomWithIdx(s).GetNeighbors() if n.GetIdx() in mp))
            mp[opts[0]] = p
    return mp


def find_maps(sub, prod, cap=12):
    """The atom maps substrate -> product with the best overall score; ties (mirror images of a ring, the two ortho positions ...) are all returned and the
    layout picks among them. A beam over the MCS rounds, so a two-reactant case (Diels-Alder) is scored as a whole, not piece by piece."""
    beam = [{}]
    for rnd in range(6):
        nxt, grew = [], False
        for mp in beam:
            ext = extend_map(sub, prod, mp, slack=3 if len(beam) < 40 else 0)
            if ext:
                grew = True
                nxt.extend(ext)
            else:
                nxt.append(mp)
        if not grew:
            break
        uniq = {frozenset(m.items()): m for m in nxt}
        beam = sorted(uniq.values(), key=lambda m: score_map(sub, prod, m))[:60]
    beam = [leftovers(sub, prod, dict(m)) for m in beam]
    best = min(score_map(sub, prod, m) for m in beam)
    out, seen = [], set()
    for m in beam:
        k = frozenset(m.items())
        if score_map(sub, prod, m) == best and k not in seen:
            seen.add(k)
            out.append(m)
    return out[:cap]


def find_map(sub, prod):
    return find_maps(sub, prod)[0]


# ---------------------------------------------------------------- layout
def layout(m, pinned=None):
    cm = {i: Point2D(*p) for i, p in (pinned or {}).items()}
    if pinned and len(pinned) == m.GetNumAtoms():
        return dict(pinned)
    rdDepictor.Compute2DCoords(m, canonOrient=not cm, coordMap=cm, clearConfs=True)
    c = m.GetConformer()
    pos = {i: (c.GetAtomPosition(i).x, c.GetAtomPosition(i).y) for i in range(m.GetNumAtoms())}
    for i, p in (pinned or {}).items():
        if math.hypot(pos[i][0] - p[0], pos[i][1] - p[1]) > 1e-3:
            raise RuntimeError('RDKit moved a pinned atom')
    return pos


def side_of(m, start, block):
    """Atoms reachable from `start` without passing through `block`."""
    seen, todo = {start}, [start]
    while todo:
        a = todo.pop()
        for n in m.GetAtomWithIdx(a).GetNeighbors():
            j = n.GetIdx()
            if j != block and j not in seen:
                seen.add(j)
                todo.append(j)
    return seen


def released(sub, prod, mp):
    """Substrate atoms that must move: for each C#C whose two carbons stay bonded but are no longer sp, the smaller side (with its triple-bond carbon)."""
    out = set()
    for b in sub.GetBonds():
        if b.GetBondType() != Chem.BondType.TRIPLE:
            continue
        a, c = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        if a not in mp or c not in mp:
            continue
        pb = prod.GetBondBetweenAtoms(mp[a], mp[c])
        if pb is None or pb.GetBondType() == Chem.BondType.TRIPLE:
            continue
        sa = side_of(sub, a, c) - {a}
        sc = side_of(sub, c, a) - {c}
        if not sa and not sc:
            continue
        if len(sc) <= len(sa):
            out |= sc | {c}
        else:
            out |= sa | {a}
    return out


def ring_atoms(m):
    return {i for i in range(m.GetNumAtoms()) if m.GetAtomWithIdx(i).IsInRing()}


def frag_shift(pos, frags, amount):
    """Push each fragment away from the centre of all of them by `amount` (RDKit units)."""
    if len(frags) < 2:
        return {}
    allc = centroid([pos[i] for f in frags for i in f])
    shifts = {}
    for k, f in enumerate(frags):
        c = centroid([pos[i] for i in f])
        d = (c[0] - allc[0], c[1] - allc[1])
        L = math.hypot(*d)
        if L < 1e-6:
            ang = 2 * math.pi * k / len(frags)
            d, L = (math.cos(ang), math.sin(ang)), 1.0
        v = (d[0] / L * amount, d[1] / L * amount)
        for i in f:
            pos[i] = (pos[i][0] + v[0], pos[i][1] + v[1])
            shifts[i] = v
    return shifts


def centroid(pts):
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


# ---------------------------------------------------------------- drawing + read-back
def with_conf(m, pos):
    mm = Chem.Mol(m)
    conf = Chem.Conformer(mm.GetNumAtoms())
    for i, (x, y) in pos.items():
        conf.SetAtomPosition(i, Point3D(x, y, 0.0))
    conf.Set3D(False)
    mm.RemoveAllConformers()
    mm.AddConformer(conf, assignId=True)
    return mm


def wedges(m, pos):
    mm = with_conf(m, pos)
    out = {}
    if not any(a.GetChiralTag() != Chem.ChiralType.CHI_UNSPECIFIED for a in mm.GetAtoms()):
        return out
    Chem.WedgeMolBonds(mm, mm.GetConformer())
    for b in mm.GetBonds():
        d = b.GetBondDir()
        kind = 'wedge' if d == Chem.BondDir.BEGINWEDGE else 'dash' if d == Chem.BondDir.BEGINDASH else None
        if kind:
            out[frozenset((b.GetBeginAtomIdx(), b.GetEndAtomIdx()))] = (b.GetBeginAtomIdx(), kind)
    return out


def readback(m, pos):
    """The canonical isomeric SMILES of the drawing (coordinates + wedges), as a reader of the picture would see it."""
    mm = with_conf(m, pos)
    if any(a.GetChiralTag() != Chem.ChiralType.CHI_UNSPECIFIED for a in mm.GetAtoms()):
        Chem.WedgeMolBonds(mm, mm.GetConformer())
    mb = Chem.MolToMolBlock(mm)
    back = Chem.MolFromMolBlock(mb)
    return Chem.MolToSmiles(back) if back is not None else None


def fix_ez(prod, pos, pinned):
    """Reflect the free side of each stereo C=C across its axis when the drawing shows the wrong cis / trans; returns the atoms that moved."""
    target = Chem.MolToSmiles(prod)
    moved = set()
    for b in prod.GetBonds():
        if b.GetBondType() != Chem.BondType.DOUBLE or b.GetStereo() == Chem.BondStereo.STEREONONE:
            continue
        if readback(prod, pos) == target:
            break
        a, c = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        for end, other in ((c, a), (a, c)):
            side = side_of(prod, end, other) - {end}
            trial = dict(pos)
            ax, ay = pos[other]
            bx, by = pos[end]
            dx, dy = bx - ax, by - ay
            L2 = dx * dx + dy * dy
            for i in side:
                px, py = pos[i][0] - ax, pos[i][1] - ay
                t = (px * dx + py * dy) / L2
                fx, fy = t * dx, t * dy
                trial[i] = (ax + 2 * fx - px, ay + 2 * fy - py)
            if readback(prod, trial) == target:
                pos.update(trial)
                moved |= side
                break
    return moved


def min_gap(m, pos):
    """The closest approach of two atoms that are not bonded (RDKit units)."""
    n = m.GetNumAtoms()
    best = 9.0
    for i in range(n):
        for j in range(i + 1, n):
            if m.GetBondBetweenAtoms(i, j) is None:
                best = min(best, math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1]))
    return best


# ---------------------------------------------------------------- one pair
def opens_ring(sub, prod, mp):
    """A ring bond of the substrate breaks while both of its atoms stay in one product molecule (cyclohexene -> hexanedioic acid)."""
    fr = {}
    for k, f in enumerate(frags_of(prod)):
        for i in f:
            fr[i] = k
    for b in sub.GetBonds():
        a, c = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        if b.IsInRing() and a in mp and c in mp and prod.GetBondBetweenAtoms(mp[a], mp[c]) is None and fr[mp[a]] == fr[mp[c]]:
            return True
    return False


def kabsch_onto(ppos, mp, sub_pos):
    """Move the free product layout onto the substrate (best rotation, mirror allowed, + translation over the mapped atoms)."""
    pairs = [(ppos[p], sub_pos[s]) for s, p in mp.items()]
    ca, cb = centroid([x for x, _ in pairs]), centroid([y for _, y in pairs])
    best = None
    for mirror in (1, -1):
        sxx = sxy = 0.0
        for (x, y) in pairs:
            ax, ay = x[0] - ca[0], (x[1] - ca[1]) * mirror
            bx, by = y[0] - cb[0], y[1] - cb[1]
            sxx += ax * bx + ay * by
            sxy += ax * by - ay * bx
        th = math.atan2(sxy, sxx)
        co, si = math.cos(th), math.sin(th)

        def f(p, co=co, si=si, mirror=mirror):
            ax, ay = p[0] - ca[0], (p[1] - ca[1]) * mirror
            return (cb[0] + co * ax - si * ay, cb[1] + si * ax + co * ay)
        err = sum((f(x)[0] - y[0]) ** 2 + (f(x)[1] - y[1]) ** 2 for x, y in pairs)
        if best is None or err < best[0]:
            best = (err, f)
    return {i: best[1](p) for i, p in ppos.items()}


def spread_from_ghosts(sub, sub_pos, prod, ppos, mp, pinned):
    """A cleavage: the free atoms on a carbon that lost its partner must not point at where the partner was (the two CO2 of ethylene would face each
    other). The lost bond counts as taken: the new atoms split the widest gap that is left (sp: straight across it)."""
    inv = {v: k for k, v in mp.items()}
    for p in range(prod.GetNumAtoms()):
        if p not in inv:
            continue
        s = inv[p]
        ghosts = [n.GetIdx() for n in sub.GetAtomWithIdx(s).GetNeighbors() if n.GetIdx() in mp and prod.GetBondBetweenAtoms(p, mp[n.GetIdx()]) is None]
        if not ghosts:
            continue
        at = prod.GetAtomWithIdx(p)
        kids = [n.GetIdx() for n in at.GetNeighbors() if n.GetIdx() not in pinned]
        if not kids:
            continue
        c = ppos[p]
        dirs = [math.atan2(sub_pos[g][1] - sub_pos[s][1], sub_pos[g][0] - sub_pos[s][0]) for g in ghosts]
        dirs += [math.atan2(ppos[n.GetIdx()][1] - c[1], ppos[n.GetIdx()][0] - c[0]) for n in at.GetNeighbors() if n.GetIdx() in pinned]
        bts = [b.GetBondType() for b in at.GetBonds()]
        if len(kids) == 2 and len(dirs) == 1 and bts.count(Chem.BondType.DOUBLE) == 2:
            angs = [dirs[0] + math.pi / 2, dirs[0] - math.pi / 2]
        else:
            ang = sorted(dirs)
            gaps = [(((ang[(i + 1) % len(ang)] - ang[i]) % (2 * math.pi)) or 2 * math.pi, ang[i]) for i in range(len(ang))]
            gap, start = max(gaps)
            angs = [start + gap * (i + 1) / (len(kids) + 1) for i in range(len(kids))]
        for k, an in zip(kids, angs):
            q = (c[0] + RD_BOND * math.cos(an), c[1] + RD_BOND * math.sin(an))
            d = (q[0] - ppos[k][0], q[1] - ppos[k][1])
            for i in side_of(prod, k, p):
                if i not in pinned:
                    ppos[i] = (ppos[i][0] + d[0], ppos[i][1] + d[1])


def place_product(sub, sub_pos, prod, mp):
    """Product coordinates for one atom map: (ppos, moved substrate atoms, read-back ok, closest gap)."""
    target = Chem.MolToSmiles(prod)
    inv = {v: k for k, v in mp.items()}
    moved = set()
    if opens_ring(sub, prod, mp):
        ppos = kabsch_onto(layout(prod), mp, sub_pos)
        moved = {s for s, p in mp.items() if math.hypot(ppos[p][0] - sub_pos[s][0], ppos[p][1] - sub_pos[s][1]) > 0.02}
    else:
        rel = released(sub, prod, mp)
        pinned = {mp[s]: sub_pos[s] for s in mp if s not in rel}
        ppos = layout(prod, pinned)
        free = [i for i in range(prod.GetNumAtoms()) if i not in pinned]
        if free:
            replace_leaves(prod, ppos, set(free))
        moved |= {s for s in rel if s in mp}
        if len(frags_of(prod)) > 1:
            spread_from_ghosts(sub, sub_pos, prod, ppos, mp, pinned)
        if readback(prod, ppos) != target:
            moved |= {inv[i] for i in fix_ez(prod, ppos, pinned) if i in inv}
    pfr = frags_of(prod)
    if len(pfr) > 1:
        sh = frag_shift(ppos, pfr, DRIFT / PX_BOND * RD_BOND)
        moved |= {inv[i] for i in sh if i in inv}
    return ppos, moved, readback(prod, ppos) == target, min_gap(prod, ppos)


def morph_one(sub, sub_pos, prod_smi):
    prod = mol_of(prod_smi)
    best = None
    for mp in find_maps(sub, prod):
        ppos, moved, ok, gap = place_product(sub, sub_pos, prod, mp)
        key = (ok, min(gap, 0.6), -len(moved))
        if best is None or key > best[0]:
            best = (key, ppos, mp, moved, ok)
    _, ppos, mp, moved, ok = best
    return prod, ppos, mp, moved, ok


def morph_join(sub, prod_smi):
    """Two or more reactants -> one product (Diels-Alder): product first, reactants at their product positions, each pushed out by DRIFT."""
    prod = mol_of(prod_smi)
    mp = find_map(sub, prod)
    ppos = layout(prod)
    pinned = {s: ppos[p] for s, p in mp.items()}
    spos = layout(sub, pinned) if len(pinned) < sub.GetNumAtoms() else dict(pinned)
    sh = frag_shift(spos, frags_of(sub), DRIFT / PX_BOND * RD_BOND)
    moved = {s for s in sh if s in mp}
    ok = readback(prod, ppos) == Chem.MolToSmiles(prod)
    return prod, ppos, spos, mp, moved, ok


# ---------------------------------------------------------------- output
def mol_json(m, pos, T, smiles):
    ko = kekule_orders(m)
    wd = wedges(m, pos)
    atoms = []
    for a in m.GetAtoms():
        i = a.GetIdx()
        x, y = T(pos[i])
        d = {'idx': i, 'sym': sym_of(a), 'x': r1(x), 'y': r1(y)}
        if a.GetFormalCharge():
            d['c'] = a.GetFormalCharge()
        if a.GetAtomicNum() != 6 and a.GetTotalNumHs():
            d['h'] = a.GetTotalNumHs()
        atoms.append(d)
    bonds = []
    for b in m.GetBonds():
        a, c = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        d = {'a': a, 'b': c, 'order': ko[(a, c)]}
        w = wd.get(frozenset((a, c)))
        if w:
            d['a'], d['b'], d['stereo'] = w[0], (c if w[0] == a else a), w[1]   # a wedge starts at its stereocentre
        if b.GetIsAromatic():
            d['ar'] = 1
        bonds.append(d)
    return {'smiles': smiles, 'atoms': atoms, 'bonds': bonds}


def align_kekule(sj, pj, mp):
    """Mapped aromatic bonds keep the substrate's Kekule pattern, so a ring does not flicker its double bonds."""
    so = {}
    for b in sj['bonds']:
        if b.get('ar'):
            so[(b['a'], b['b'])] = so[(b['b'], b['a'])] = b['order']
    inv = {v: k for k, v in mp.items()}
    for b in pj['bonds']:
        if b.get('ar') and b['a'] in inv and b['b'] in inv and (inv[b['a']], inv[b['b']]) in so:
            b['order'] = so[(inv[b['a']], inv[b['b']])]


def diff(sj, pj, mp):
    so = {}
    for b in sj['bonds']:
        so[(b['a'], b['b'])] = so[(b['b'], b['a'])] = b['order']
    po = {}
    for b in pj['bonds']:
        po[(b['a'], b['b'])] = po[(b['b'], b['a'])] = b['order']
    ms = sorted(mp.items())
    changed = []
    for i in range(len(ms)):
        for j in range(i + 1, len(ms)):
            (sa, pa), (sb, pb) = ms[i], ms[j]
            f, t = so.get((sa, sb), 0), po.get((pa, pb), 0)
            if f != t:
                changed.append({'a': pa, 'b': pb, 'from': f, 'to': t})
    added = [a['idx'] for a in pj['atoms'] if a['idx'] not in mp.values()]
    removed = [a['idx'] for a in sj['atoms'] if a['idx'] not in mp]
    return changed, added, removed


def build_entry(job):
    sub = mol_of(job['sub'])
    results = []   # (prod, ppos, mp, moved, ok, smiles)
    if len(frags_of(sub)) > 1:
        prod, ppos, spos, mp, moved, ok = morph_join(sub, job['prods'][0])
        results.append((prod, ppos, mp, moved, ok, job['prods'][0]))
    else:
        spos = layout(sub)
        for ps in job['prods']:
            prod, ppos, mp, moved, ok = morph_one(sub, spos, ps)
            results.append((prod, ppos, mp, moved, ok, ps))
    # one transform for the substrate and every product: 38 px per bond, centred in the box, shrunk to fit
    pts = list(spos.values()) + [p for r in results for p in r[1].values()]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    w, hh = (max(xs) - min(xs)) or 1e-6, (max(ys) - min(ys)) or 1e-6
    s = min(PX_BOND / RD_BOND, (BOX_W - 2 * MARGIN) / w, (BOX_H - 2 * MARGIN) / hh)
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2

    def T(p):
        return (BOX_W / 2 + (p[0] - cx) * s, BOX_H / 2 - (p[1] - cy) * s)

    sj = mol_json(sub, spos, T, job['sub'])
    outs, fails = [], []
    for prod, ppos, mp, moved, ok, ps in results:
        pj = mol_json(prod, ppos, T, ps)
        align_kekule(sj, pj, mp)
        changed, added, removed = diff(sj, pj, mp)
        outs.append({'prod': pj, 'map': {str(k): v for k, v in sorted(mp.items())}, 'changedBonds': changed, 'addedAtoms': added, 'removedAtoms': removed,
                     'moved': sorted(moved), 'gap': round(min_gap(prod, ppos) / RD_BOND, 2)})
        if not ok:
            fails.append(ps)
    e = {'sub': sj, **outs[0], 'reagentLabel': job['reagentLabel'], 'chip': job['chip'], 'addedFrom': 'reagent', 'scale': round(s / (PX_BOND / RD_BOND), 2)}
    if len(outs) > 1:
        e['alt'] = outs[1:]
    return e, fails


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    jobs = json.loads(subprocess.check_output(['node', str(HERE / 'morph_pairs.mjs')], cwd=str(LEARN)).decode('utf8'))
    out = {}
    fails, errs, tight, shrunk = [], [], [], 0
    for job in jobs:
        try:
            e, f = build_entry(job)
        except Exception as ex:  # a pair that cannot be mapped: left out (the UI then shows the plain product)
            errs.append((job['key'], str(ex)))
            continue
        if f:
            fails.append((job['key'], f))
            continue
        for x in [e] + e.get('alt', []):
            if x['gap'] < 0.45:
                tight.append((job['key'], x['prod']['smiles'], x['gap']))
            del x['gap']
        shrunk += e['scale'] < 1
        out[job['key']] = e
    meta = {'what': 'morph animations: substrate and product drawings in one frame + atom map (learn/tools/morph_coords.py)', 'box': [BOX_W, BOX_H], 'pxPerBond': PX_BOND,
            'entries': len(out), 'jobs': len(jobs)}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = {'_meta': meta, **out}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    print(f'wrote learn/morph/morphs.json: {len(out)} of {len(jobs)} jobs, {sum(1 + len(e.get("alt", [])) for e in out.values())} morphs, {OUT.stat().st_size} bytes, shrunk {shrunk}')
    for k, f in fails:
        print('  READ-BACK FAIL', k, f)
    for k, m in errs:
        print('  ERROR', k, m)
    for k, smi, g in tight[:40]:
        print('  tight', k, smi, g)
    print(f'  {len(fails)} read-back failures, {len(errs)} errors, {len(tight)} tight drawings')
    return 0


if __name__ == '__main__':
    sys.exit(main())
