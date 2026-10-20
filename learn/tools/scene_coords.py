#!/usr/bin/env python
"""Scene coordinates for the animated mechanism scenes.

Writes learn/scenes/coords.json:
  { "_meta": {...},
    reactionId: { stageName: { smiles, from, note, atoms:[{idx,sym,x,y,charge,map,mv?}],
                               bonds:[{a,b,order,stereo,arom?}], map:{reactantAtomIdx: thisAtomIdx} } } }

Method (why it is not a substructure search): every spec SMILES carries atom-map numbers, so the correspondence between
stages is exact. A stage is laid out with RDKit Compute2DCoords with coordMap = the positions of the atoms it shares with
the stage it comes from, so shared atoms keep their position (drift 0) and RDKit only places the new atoms. That is the same
mechanism GenerateDepictionMatching2DStructure uses internally, minus the substructure match. Reagent fragments that are free
in a stage are placed with small hints (approach direction, distance, orientation). Atoms that really move (the H that
transfers, the nucleophile that attaches, an sp carbon that bends) are listed per stage as `movers`; they are flagged
`mv: true` and excluded from the drift check.

Units: the layout is done in RDKit units (bond = 1.5), then scaled to 44 px per bond (shrunk only when a reaction would not fit
in 640 x 400), centred per reaction (one translation for all stages of a reaction) and flipped to SVG y-down.

Run:  python tools/scene_coords.py            (writes the JSON and prints the check)
"""
import json
import math
import re
import sys
from pathlib import Path

from rdkit import Chem, RDLogger
from rdkit.Chem import rdDepictor
from rdkit.Chem.EnumerateStereoisomers import EnumerateStereoisomers, StereoEnumerationOptions
from rdkit.Geometry import Point2D, Point3D

RDLogger.DisableLog('rdApp.*')

RD_BOND = 1.5
PX_BOND = 44.0
VIEW_W, VIEW_H = 640, 400
MARGIN = 28
MAX_DRIFT_PX = 6.0
OUT = Path(__file__).resolve().parent.parent / 'scenes' / 'coords.json'


# --------------------------------------------------------------------------------------------------- spec helpers
def S(name, smi, frm=None, movers=(), inherit=None, hints=(), wedges=(), stereo=None, side=(), note='', orient=None):
    return dict(name=name, smi=smi, frm=frm, movers=set(movers), inherit=inherit or {}, hints=list(hints),
                wedges=list(wedges), stereo=stereo, side=list(side), note=note, orient=orient)


def H(a, ref, d=2.2, dir='out', point=None, axis=None, center=False, rot=0):
    """Place the free fragment holding atom-map `a` so that `a` sits `d` bonds from `ref` (a map or a list of maps: their
    midpoint) in screen direction `dir` (degrees, 0 = right, 90 = down, -90 = up, or 'out'). `point`: the map of an atom of the
    fragment that must point away from ref. `axis='perp'`: the fragment axis is perpendicular to dir. `center`: centre it."""
    return dict(kind='frag', a=a, ref=ref, d=d, dir=dir, point=point, axis=axis, center=center, rot=rot)


def M(ref, atoms):
    """Place atoms by hand: {map: (dx, dy)} in bond units, screen axes (dy down), relative to ref (a map or list of maps)."""
    return dict(kind='manual', ref=ref, atoms=atoms)


def cyc(p, k):
    return (p - 1 + k) % 6 + 1


def ring_smiles(subs, double, plus=None, oxo=None, h=None):
    """Six ring carbons, map numbers 1..6. subs {pos: 'branch smiles'} (explicit single-bond branches), h {pos: H map},
    double: set of ring edges (i, i+1) that are double (edge (6,1) is written as (6,1)), plus: ring position carrying the +,
    oxo: ring position written as C(=O+R) instead (its `subs` entry is then the =O+ branch)."""
    h = h or {}
    parts = []
    for i in range(1, 7):
        branches = ''
        has = i in subs or i in h
        if i in h:
            branches += '([H:%d])' % h[i]
        if i in subs:
            branches += '(%s)' % subs[i]
        chg = '+' if plus == i else ''
        sym = '[C%s:%d]' % (chg, i) if has else '[CH%s:%d]' % (chg, i)
        if i == 1:
            closure = ('=1' if (6, 1) in double else '1')
            parts.append(sym + closure + branches)
        elif i == 6:
            parts.append(('=' if (5, 6) in double else '') + sym + '1' + branches)
        else:
            parts.append(('=' if (i - 1, i) in double else '') + sym + branches)
    return ''.join(parts)


def kekule(offset):
    """offset 0: edges (1,2)(3,4)(5,6); offset 1: (2,3)(4,5)(6,1)."""
    return {(1, 2), (3, 4), (5, 6)} if offset == 0 else {(2, 3), (4, 5), (6, 1)}


def sigma_forms(p, kek):
    """The three resonance forms of the arenium ion for attack at ring position p, starting with the one reached directly from
    the Kekule structure `kek`. Returns [(plus_position, double_edges)]."""
    a = [cyc(p, k) for k in range(1, 6)]
    def edge(x, y):
        return (x, y) if (x, y) in {(1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 1)} else (y, x)
    forms = {
        a[0]: {edge(a[1], a[2]), edge(a[3], a[4])},
        a[2]: {edge(a[0], a[1]), edge(a[3], a[4])},
        a[4]: {edge(a[0], a[1]), edge(a[2], a[3])},
    }
    partner = cyc(p, 1) if edge(p, cyc(p, 1)) in kek else cyc(p, 5)
    first = partner
    middle = a[2]
    last = a[4] if first == a[0] else a[0]
    return [(q, forms[q]) for q in (first, middle, last)]


# --------------------------------------------------------------------------------------------------- reactions
def build_spec():
    R = {}

    # ---- alkene + HX: 2-methylpropene + HBr -> tert-butyl cation -> 2-bromo-2-methylpropane
    R['alkene-hx'] = dict(orient=dict(a=2, b=4, angle=0, side=(1, 'up')), stages=[
        S('reactants', '[CH3:1][C:2]([CH3:3])=[CH2:4].[H:5][Br:6]', hints=[H(5, 4, 2.2, -90)]),
        S('carbocation', '[CH3:1][C+:2]([CH3:3])[CH2:4][H:5].[Br-:6]', movers=[5, 6], hints=[H(6, 2, 2.3, 90)],
          note='H has moved to the CH2 carbon; Br- is free.'),
        S('product', '[CH3:1][C:2]([CH3:3])([Br:6])[CH2:4][H:5]', movers=[6], note='2-bromo-2-methylpropane.'),
    ])

    # ---- alkene hydration: 1-methylcyclohexene + H3O+ / H2O
    R['alkene-hydration'] = dict(orient=dict(a=2, b=3, angle=0, side=(4, 'down')), stages=[
        S('reactants', '[CH3:1][C:2]1=[CH:3][CH2:4][CH2:5][CH2:6][CH2:7]1.[H:8][O+:9]([H:10])[H:11]',
          hints=[H(8, 3, 2.1, -45)]),
        S('carbocation', '[CH3:1][C+:2]1[CH:3]([H:8])[CH2:4][CH2:5][CH2:6][CH2:7]1.[O:9]([H:10])[H:11].[O:12]([H:13])[H:14]',
          movers=[8], hints=[H(12, 2, 2.2, -115)], note='H3O+ gave H+ to C3 (left as H2O). A second water approaches the cation.'),
        S('oxonium', '[CH3:1][C:2]1([O+:12]([H:13])[H:14])[CH:3]([H:8])[CH2:4][CH2:5][CH2:6][CH2:7]1',
          movers=[12, 13, 14], note='Water oxygen has bonded to the cation carbon.'),
        S('product', '[CH3:1][C:2]1([O:12][H:13])[CH:3]([H:8])[CH2:4][CH2:5][CH2:6][CH2:7]1.[H+:14]',
          note='Alcohol; H+ is lost to the solvent.'),
    ])

    # ---- alkene + Br2: cyclohexene -> bromonium -> trans-1,2-dibromocyclohexane
    R['alkene-x2'] = dict(orient=dict(a=1, b=2, angle=0, side=(4, 'down')), stages=[
        S('reactants', '[CH:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1.[Br:7][Br:8]',
          hints=[H(7, [1, 2], 2.0, -90)]),
        S('bromonium', '[CH:1]12[Br+:7][CH:2]1[CH2:3][CH2:4][CH2:5][CH2:6]2.[Br-:8]', movers=[7, 8],
          hints=[H(8, 2, 2.4, 60)], side=[(1, 2, 7, 'up')], wedges=[(1, 7, 'wedge'), (2, 7, 'wedge')],
          note='Br+ bridges both carbons on the top face; Br- is the nucleophile.'),
        S('product', '[Br:7][CH:1]1[CH:2]([Br:8])[CH2:3][CH2:4][CH2:5][CH2:6]1', movers=[7, 8],
          stereo='Br[C@@H]1CCCC[C@H]1Br', note='trans-1,2-dibromocyclohexane (one enantiomer).'),
    ])

    # ---- H2 / Pd: 1,2-dimethylcyclohexene -> cis-1,2-dimethylcyclohexane
    R['alkene-h2-pd'] = dict(orient=dict(a=2, b=3, angle=0, side=(5, 'up')), stages=[
        S('reactants', '[CH3:1][C:2]1=[C:3]([CH3:4])[CH2:5][CH2:6][CH2:7][CH2:8]1.[H:9][H:10]',
          hints=[H(9, [2, 3], 2.4, 90, axis='perp', center=True)]),
        S('adsorbed', '[CH3:1][C:2]1=[C:3]([CH3:4])[CH2:5][CH2:6][CH2:7][CH2:8]1.[H:9].[H:10]', movers=[9, 10],
          hints=[H(9, 2, 1.7, 90), H(10, 3, 1.7, 90)], note='H-H bond broken: two H atoms on the Pd surface, below the ring.'),
        S('product', '[CH3:1][C:2]1([H:9])[C:3]([CH3:4])([H:10])[CH2:5][CH2:6][CH2:7][CH2:8]1', movers=[9, 10],
          stereo='C[C@@H]1CCCC[C@@H]1C', note='cis-1,2-dimethylcyclohexane (meso): both H added to the same face.'),
    ])

    # ---- epoxidation: cis-but-2-ene + peracid -> cis-2,3-dimethyloxirane + acid
    R['alkene-epoxide'] = dict(orient=dict(a=2, b=3, angle=0, side=(1, 'up')), stages=[
        S('reactants', '[CH3:1]/[CH:2]=[CH:3]\\[CH3:4].[CH3:7][C:8](=[O:9])[O:10][O:11][H:12]',
          hints=[H(11, [2, 3], 2.1, 90)]),
        S('product', '[CH3:1][CH:2]1[O:11][CH:3]1[CH3:4].[CH3:7][C:8](=[O:10])[O:9][H:12]', movers=[9, 10, 11, 12],
          side=[(2, 3, 11, 'down')], stereo='CEPOXIDE_CIS',
          note='cis-2,3-dimethyloxirane (meso) and the carboxylic acid; O is delivered to one face.'),
    ])

    # ---- cold KMnO4: cyclohexene -> cyclic manganate ester -> cis-1,2-diol
    R['alkene-kmno4-base'] = dict(orient=dict(a=1, b=2, angle=0, side=(4, 'down')), stages=[
        S('reactants', '[CH:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1.[O-:7][Mn:8](=[O:9])(=[O:10])=[O:11]',
          hints=[M([1, 2], {9: (-0.5, -1.15), 10: (0.5, -1.15), 8: (0.0, -2.1), 11: (-0.95, -2.65), 7: (0.95, -2.65)})]),
        S('manganate-ester', '[CH:1]12[O:9][Mn:8](=[O:11])([O-:7])[O:10][CH:2]1[CH2:3][CH2:4][CH2:5][CH2:6]2',
          movers=[7, 8, 9, 10, 11], side=[(1, 2, 8, 'up')], wedges=[(1, 9, 'wedge'), (2, 10, 'wedge')],
          note='Both O atoms add to the same face: a five-membered cyclic ester.'),
        S('product', '[CH:1]1([O:9][H:12])[CH:2]([O:10][H:13])[CH2:3][CH2:4][CH2:5][CH2:6]1', movers=[9, 10],
          stereo='O[C@@H]1CCCC[C@@H]1O', note='cis-cyclohexane-1,2-diol (meso). Mn left as MnO2 (not drawn).'),
    ])

    # ---- hydroboration-oxidation: 1-methylcyclohexene -> organoborane -> trans-2-methylcyclohexanol
    R['alkene-hydroboration'] = dict(orient=dict(a=2, b=3, angle=0, side=(4, 'down')), stages=[
        S('reactants', '[CH3:1][C:2]1=[CH:3][CH2:4][CH2:5][CH2:6][CH2:7]1.[B:8]([H:9])([H:10])[H:11]',
          hints=[M([2, 3], {9: (-0.5, -1.2), 8: (0.5, -1.2), 10: (1.0, -2.05), 11: (0.0, -2.1)})]),
        S('organoborane', '[CH3:1][C:2]1([H:9])[CH:3]([B:8]([H:10])[H:11])[CH2:4][CH2:5][CH2:6][CH2:7]1',
          movers=[8, 9, 10, 11], wedges=[(2, 9, 'dash'), (3, 8, 'dash')],
          note='Syn addition: H on C2 and B on C3 add to the same face (here the bottom); CH3 is on the other face.'),
        S('product', '[CH3:1][C:2]1([H:9])[CH:3]([O:12][H:13])[CH2:4][CH2:5][CH2:6][CH2:7]1', movers=[],
          inherit={12: 8}, stereo='C[C@@H]1CCCC[C@H]1O', note='H2O2, NaOH replaces B by OH with retention: trans-2-methylcyclohexanol.'),
    ])

    # ---- alkyne + HBr (x2): propyne -> vinyl cation -> 2-bromopropene -> cation -> 2,2-dibromopropane
    R['alkyne-hx'] = dict(orient=dict(a=1, b=3, angle=0), stages=[
        S('reactants', '[CH3:1][C:2]#[C:3][H:6].[H:4][Br:5]', hints=[H(4, 3, 2.2, -90)]),
        S('vinyl-cation', '[CH3:1][C+:2]=[C:3]([H:6])[H:4].[Br-:5]', movers=[4, 5, 6], hints=[H(5, 2, 2.3, 90)],
          note='Linear vinyl cation on C2 (sp, empty p orbital); H went to C3.'),
        S('bromoalkene', '[CH3:1][C:2]([Br:5])=[C:3]([H:6])[H:4].[H:7][Br:8]', movers=[3, 4, 5, 6],
          hints=[H(7, 3, 2.2, -90)], note='2-bromopropene. A second HBr approaches the C=C.'),
        S('carbocation-2', '[CH3:1][C+:2]([Br:5])[CH2:3][H:7].[Br-:8]', movers=[7, 8],
          hints=[H(8, 2, 2.3, 90)], note='Cation stabilised by the lone pair on Br.'),
        S('dibromide', '[CH3:1][C:2]([Br:5])([Br:8])[CH2:3][H:7]', movers=[8], note='2,2-dibromopropane (gem-dibromide).'),
    ])

    # ---- alkyne hydration: hex-1-yne + H2O (Hg2+, H3O+) -> enol -> hexan-2-one
    R['alkyne-hydration'] = dict(orient=dict(a=1, b=2, angle=0, side=(3, 'down')), stages=[
        S('reactants', '[C:1]([H:10])#[C:2][CH2:3][CH2:4][CH2:5][CH3:6].[O:7]([H:8])[H:9]', hints=[H(7, 2, 2.0, -90)]),
        S('enol', '[C:1]([H:10])([H:9])=[C:2]([O:7][H:8])[CH2:3][CH2:4][CH2:5][CH3:6]', movers=[1, 7, 8, 9, 10],
          note='Markovnikov: OH on C2, H on C1. The enol is C=C-OH.'),
        S('ketone', '[C:1]([H:10])([H:9])([H:8])[C:2](=[O:7])[CH2:3][CH2:4][CH2:5][CH3:6]', movers=[8],
          note='Keto-enol tautomerism: the O-H hydrogen moves to C1. Hexan-2-one.'),
    ])

    # ---- Lindlar: hex-3-yne + H2 -> cis-hex-3-ene
    R['alkyne-lindlar'] = dict(orient=dict(a=3, b=4, angle=0), stages=[
        S('reactants', '[CH3:1][CH2:2][C:3]#[C:4][CH2:5][CH3:6].[H:7][H:8]',
          hints=[H(7, [3, 4], 2.4, 90, axis='perp', center=True)]),
        S('adsorbed', '[CH3:1][CH2:2][C:3]#[C:4][CH2:5][CH3:6].[H:7].[H:8]', movers=[7, 8],
          hints=[H(7, 3, 1.7, 90), H(8, 4, 1.7, 90)], note='H atoms on the Lindlar catalyst surface, below the alkyne.'),
        S('product', '[CH3:1][CH2:2]/[C:3]([H:7])=[C:4]([H:8])/[CH2:5][CH3:6]', movers=[1, 2, 5, 6, 7, 8],
          side=[(3, 4, 2, 'up')], stereo='CC/C=C\\CC', note='cis (Z) alkene: both H added to the same face; the two ethyl groups end up together.'),
    ])

    # ---- acetylide: propyne + NaNH2 -> acetylide -> + CH3Br -> but-2-yne
    R['alkyne-acetylide'] = dict(orient=dict(a=1, b=3, angle=0), stages=[
        S('reactants', '[CH3:1][C:2]#[C:3][H:5].[NH2-:4]', hints=[H(4, 5, 1.9, -50)]),
        S('acetylide', '[CH3:1][C:2]#[C-:3].[NH2:4][H:5].[CH3:6][Br:7]', movers=[5, 6, 7],
          hints=[H(6, 3, 2.0, 0)], note='NH2- took the terminal H; the acetylide carbon is a nucleophile. CH3Br approaches for SN2 (backside of the C-Br bond).'),
        S('product', '[CH3:1][C:2]#[C:3][CH3:6].[Br-:7]', movers=[6], note='but-2-yne; Br- has left.'),
    ])

    # ---- EAS bromination: benzene + Br+ -> sigma complex (3 forms) -> bromobenzene
    kb = kekule(0)
    sub_none = {}
    forms = sigma_forms(1, kb)
    st = [S('reactants', ring_smiles({}, kb, h={1: 8}) + '.[Br+:7]', hints=[H(7, 1, 2.3, -45)])]
    for i, (q, dbl) in enumerate(forms):
        st.append(S('sigma-%d' % (i + 1), ring_smiles({1: '[Br:7]'}, dbl, plus=q, h={1: 8}),
                    movers=[7, 8] if i == 0 else [], note='Resonance form %d: positive charge on ring carbon C%d.' % (i + 1, q)))
    st.append(S('product', ring_smiles({1: '[Br:7]'}, kb) + '.[H+:8]', movers=[7, 8], hints=[H(8, [1, 2, 3, 4, 5, 6], 3.3, 0)], note='H+ lost from the sp3 carbon: aromatic ring restored.'))
    R['eas-bromination'] = dict(orient=dict(a=4, b=1, angle=-90), stages=st)

    # ---- EAS nitration: benzene + NO2+ -> sigma complex -> nitrobenzene
    no2 = '[N+:9](=[O:10])[O-:11]'
    st = [S('reactants', ring_smiles({}, kb, h={1: 8}) + '.[O:10]=[N+:9]=[O:11]', hints=[H(9, 1, 2.3, -45, axis='perp')])]
    for i, (q, dbl) in enumerate(forms):
        st.append(S('sigma-%d' % (i + 1), ring_smiles({1: no2}, dbl, plus=q, h={1: 8}),
                    movers=[9, 10, 11, 8] if i == 0 else [], note='Resonance form %d: positive charge on ring carbon C%d.' % (i + 1, q)))
    st.append(S('product', ring_smiles({1: no2}, kb) + '.[H+:8]', movers=[9, 10, 11, 8], hints=[H(8, [1, 2, 3, 4, 5, 6], 3.3, 0)], note='Nitrobenzene; H+ lost.'))
    R['eas-nitration'] = dict(orient=dict(a=4, b=1, angle=-90), stages=st)

    # ---- Friedel-Crafts acylation: benzene + CH3COCl / AlCl3 -> acylium -> sigma complexes -> acetophenone
    acyl = '[C:8](=[O:9])[CH3:7]'
    st = [S('reactants', ring_smiles({}, kb, h={1: 15}) + '.[CH3:7][C:8](=[O:9])[Cl:10].[Al:11]([Cl:12])([Cl:13])[Cl:14]',
            hints=[H(8, 1, 2.8, -30, point=10), H(11, 10, 2.2, 'out', point=12)]),
          S('acylium', ring_smiles({}, kb, h={1: 15}) + '.[CH3:7][C:8]#[O+:9].[Cl:10][Al-:11]([Cl:12])([Cl:13])[Cl:14]',
            movers=[7, 9, 10], note='AlCl3 pulls Cl- off: the acylium ion CH3-C#O+ (linear) and AlCl4-.')]
    for i, (q, dbl) in enumerate(forms):
        st.append(S('sigma-%d' % (i + 1), ring_smiles({1: acyl}, dbl, plus=q, h={1: 15}) + '.[Cl:10][Al-:11]([Cl:12])([Cl:13])[Cl:14]',
                    movers=[7, 8, 9, 15] if i == 0 else [], note='Resonance form %d: positive charge on ring carbon C%d.' % (i + 1, q)))
    st.append(S('product', ring_smiles({1: acyl}, kb) + '.[H+:15]', movers=[7, 8, 9, 15], hints=[H(15, [1, 2, 3, 4, 5, 6], 3.3, 0)], note='Acetophenone; H+ lost (AlCl3 is regenerated, not drawn).'))
    R['fc-acylation'] = dict(orient=dict(a=4, b=1, angle=-90), stages=st)

    # ---- directors: anisole + Br+ (ortho, para, meta) ; nitrobenzene + Br+ (meta, and the bad forms)
    def director(sub, subname, attack_specs, bad=None):
        k = kekule(1)
        hs = {2: 22, 3: 23, 4: 24}
        base = ring_smiles({1: sub}, k, h=hs)
        stages = [S('reactants', base + '.[Br+:31]', hints=[H(31, [1, 2, 3, 4, 5, 6], 3.0, 0)])]
        for pos, p in attack_specs:
            prev = 'reactants'
            for i, (q, dbl) in enumerate(sigma_forms(p, k)):
                nm = '%s-%d' % (pos, i + 1)
                s = ring_smiles({1: sub, p: '[Br:31]'}, dbl, plus=q, h=hs)
                stages.append(S(nm, s, frm=prev, movers=[31, hs[p]] if i == 0 else [],
                                note='Attack at the %s carbon (C%d). Positive charge on ring carbon C%d%s.' %
                                     (pos, p, q, ' (the carbon that carries %s)' % subname if q == 1 else '')))
                prev = nm
                if q == 1 and subname == 'OCH3':
                    onm = '%s-oxo' % pos
                    s2 = ring_smiles({1: '=[O+:12][CH3:11]', p: '[Br:31]'}, dbl, h=hs)
                    stages.append(S(onm, s2, frm=nm, note='Extra form: the O lone pair shares the charge (C=O+). Every atom has an octet.'))
            if True:
                prods = ring_smiles({1: sub, p: '[Br:31]'}, k, h={a: b for a, b in hs.items() if a != p}) + '.[H+:%d]' % hs[p]
                stages.append(S('product-%s' % pos, prods, frm='%s-3' % pos, movers=[31, hs[p]], hints=[H(hs[p], [1, 2, 3, 4, 5, 6], 3.3, 0)], note='H+ lost: %s-substituted product.' % pos))
        for pos, p in (bad or []):
            q, dbl = [f for f in sigma_forms(p, k) if f[0] == 1][0]
            stages.append(S('%s-bad' % pos, ring_smiles({1: sub, p: '[Br:31]'}, dbl, plus=1, h=hs), frm='reactants', movers=[31],
                            note='Attack at the %s carbon: one resonance form puts + on C1, next to the +N of NO2. Bad.' % pos))
        return stages

    R['director-anisole'] = dict(orient=dict(a=4, b=1, angle=-90),
                                 stages=director('[O:12][CH3:11]', 'OCH3', [('ortho', 2), ('para', 4), ('meta', 3)]))
    R['director-nitrobenzene'] = dict(orient=dict(a=4, b=1, angle=-90),
                                      stages=director('[N+:12](=[O:13])[O-:14]', 'NO2', [('meta', 3)], bad=[('ortho', 2), ('para', 4)]))

    # ---- Diels-Alder: buta-1,3-diene (s-cis) + acrolein -> cyclohex-3-ene-1-carbaldehyde. Laid out on the product (hexagon),
    # the reactants are the same six carbons with the two new bonds not yet formed.
    R['diels-alder'] = dict(anchor='product', orient=dict(a=1, b=6, angle=0, side=(3, 'up')), stages=[
        S('reactants', '[CH2:1]=[CH:2][CH:3]=[CH2:4].[CH2:5]=[CH:6][CH:7]=[O:8]', frm='product',
          note='s-cis diene (U shape) over the dienophile. The two new bonds C4-C5 and C1-C6 are not yet formed.'),
        S('product', '[CH2:1]1[CH:2]=[CH:3][CH2:4][CH2:5][CH:6]1[CH:7]=[O:8]', note='cyclohex-3-ene-1-carbaldehyde (drawn flat).'),
    ])
    return R


# --------------------------------------------------------------------------------------------------- RDKit helpers
def parse(smi):
    ps = Chem.SmilesParserParams()
    ps.removeHs = False
    m = Chem.MolFromSmiles(smi, ps)
    if m is None:
        raise ValueError('SMILES does not parse: ' + smi)
    return m


def strip_maps(smi):
    return re.sub(r':\d+\]', ']', smi)


def canon_noH(m):
    """Canonical SMILES (maps and explicit H removed) of the fragments that can carry stereo (the rest is ignored)."""
    m2 = Chem.Mol(m)
    for a in m2.GetAtoms():
        a.SetAtomMapNum(0)
    m2 = Chem.RemoveHs(m2)
    keep = []
    for f in Chem.GetMolFrags(m2, asMols=True):
        if Chem.FindPotentialStereo(f):
            keep.append(Chem.MolToSmiles(f))
    return '.'.join(sorted(keep))


def expected_canon(spec):
    if spec == 'CEPOXIDE_CIS':
        # cis-2,3-dimethyloxirane is the meso (R,S) isomer
        base = Chem.MolFromSmiles('CC1OC1C')
        for iso in EnumerateStereoisomers(base):
            Chem.AssignStereochemistry(iso, cleanIt=True, force=True)
            labels = sorted(a.GetProp('_CIPCode') for a in iso.GetAtoms() if a.HasProp('_CIPCode'))
            if labels == ['R', 'S']:
                return Chem.MolToSmiles(iso)
        raise RuntimeError('no meso epoxide')
    return Chem.CanonSmiles(spec)


def resolve_stereo(m, spec):
    want = expected_canon(spec)
    if canon_noH(m) == want:
        return m
    opts = StereoEnumerationOptions(onlyUnassigned=False, unique=True, tryEmbedding=False)
    for iso in EnumerateStereoisomers(m, options=opts):
        if canon_noH(iso) == want:
            return iso
    raise ValueError('cannot reach stereo %s from %s' % (want, Chem.MolToSmiles(m)))


def prepare(st):
    m = parse(st['smi'])
    if st['stereo']:
        m = resolve_stereo(m, st['stereo'])
    # re-parse the non-canonical writer output so that atom order == parse order of the plain SMILES we store
    smi_map = Chem.MolToSmiles(m, canonical=False)
    m = parse(smi_map)
    st['mol'] = m
    st['smiles'] = strip_maps(smi_map)
    plain = parse(st['smiles'])
    assert plain.GetNumAtoms() == m.GetNumAtoms()
    for a, b in zip(m.GetAtoms(), plain.GetAtoms()):
        assert a.GetSymbol() == b.GetSymbol(), (st['name'], a.GetIdx())
    st['maps'] = [a.GetAtomMapNum() for a in m.GetAtoms()]
    st['m2i'] = {mp: i for i, mp in enumerate(st['maps']) if mp}
    if len(st['m2i']) != sum(1 for x in st['maps'] if x):
        raise ValueError('duplicate atom-map number in ' + st['name'])
    unmapped = [i for i, x in enumerate(st['maps']) if not x]
    if unmapped:
        raise ValueError('unmapped atom in %s (%s)' % (st['name'], st['smiles']))


def vec(a, b):
    return (b[0] - a[0], b[1] - a[1])


def unit(v):
    n = math.hypot(*v)
    return (v[0] / n, v[1] / n) if n > 1e-9 else (0.0, 0.0)


def rot(p, ang, c=(0, 0)):
    ca, sa = math.cos(ang), math.sin(ang)
    x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + ca * x - sa * y, c[1] + sa * x + ca * y)


def screen_dir(deg):
    r = math.radians(deg)
    return (math.cos(r), -math.sin(r))  # y-up units


def centroid(pts):
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def layout_fragment(sub, fixed_local):
    cm = {i: Point2D(*p) for i, p in fixed_local.items()}
    if len(fixed_local) == sub.GetNumAtoms():
        return dict(fixed_local)
    if sub.GetNumAtoms() == 1:
        return {0: (0.0, 0.0)}
    rdDepictor.Compute2DCoords(sub, canonOrient=not cm, coordMap=cm, clearConfs=True)
    conf = sub.GetConformer()
    out = {}
    for i in range(sub.GetNumAtoms()):
        p = conf.GetAtomPosition(i)
        out[i] = (p.x, p.y)
    for i, p in fixed_local.items():
        if math.hypot(out[i][0] - p[0], out[i][1] - p[1]) > 1e-3:
            raise RuntimeError('RDKit moved a pinned atom')
    return out


def is_sp(at):
    """Two sigma neighbours and a triple bond or two double bonds (or a 2-coordinate C+): drawn linear."""
    bts = [b.GetBondType() for b in at.GetBonds()]
    if at.GetDegree() != 2:
        return False
    return Chem.BondType.TRIPLE in bts or bts.count(Chem.BondType.DOUBLE) == 2 or (at.GetSymbol() == 'C' and at.GetFormalCharge() > 0 and Chem.BondType.DOUBLE in bts)


def replace_leaves(mol, pos, free_atoms):
    """RDKit squeezes new substituents in beside pinned atoms (an H on top of a methyl, an O on top of a ring bond). Re-place every
    free, non-ring atom ourselves, growing outwards from the pinned and ring atoms: the children of one atom split the largest
    angular gap between that atom's other bonds into equal parts, at 1 bond (a lone child at the end of a chain zigzags at
    120 degrees). Atoms next to a stereo double bond keep RDKit's placement (it knows cis from trans)."""
    ri = mol.GetRingInfo()
    keep = set()
    for b in mol.GetBonds():
        if b.GetBondType() == Chem.BondType.DOUBLE and b.GetStereo() != Chem.BondStereo.STEREONONE:
            for end in (b.GetBeginAtom(), b.GetEndAtom()):
                keep.add(end.GetIdx())
                keep.update(x.GetIdx() for x in end.GetNeighbors())
    movable = {g for g in free_atoms if ri.NumAtomRings(g) == 0 and g not in keep}
    done = set(pos) - movable
    queue = [g for g in done]
    while queue:
        a = queue.pop(0)
        kids = [x.GetIdx() for x in mol.GetAtomWithIdx(a).GetNeighbors() if x.GetIdx() in movable and x.GetIdx() not in done]
        if not kids:
            continue
        c = pos[a]
        others = [x.GetIdx() for x in mol.GetAtomWithIdx(a).GetNeighbors() if x.GetIdx() in done]
        k = len(kids)
        if not others:
            angs = [2 * math.pi * i / k for i in range(k)]
        elif len(others) == 1 and k == 1 and is_sp(mol.GetAtomWithIdx(a)):
            a0 = math.atan2(pos[others[0]][1] - c[1], pos[others[0]][0] - c[0])
            angs = [a0 + math.pi]  # sp atoms are linear
        elif len(others) == 1 and k == 1:
            a0 = math.atan2(pos[others[0]][1] - c[1], pos[others[0]][0] - c[0])
            far = [p for g, p in pos.items() if g not in (kids[0], a) and g in done]
            best = None
            for sgn in (1, -1):
                ang = a0 + sgn * 2 * math.pi / 3
                q = (c[0] + RD_BOND * math.cos(ang), c[1] + RD_BOND * math.sin(ang))
                room = min([math.hypot(q[0] - p[0], q[1] - p[1]) for p in far] or [9])
                if best is None or room > best[0] + 1e-6:
                    best = (room, ang)
            angs = [best[1]]
        else:
            ang = sorted(math.atan2(pos[o][1] - c[1], pos[o][0] - c[0]) for o in others)
            gaps = [(((ang[(i + 1) % len(ang)] - ang[i]) % (2 * math.pi)) or 2 * math.pi, ang[i]) for i in range(len(ang))]
            # a gap that faces the inside of a ring this atom belongs to is the last choice
            cents = []
            for ring in ri.AtomRings():
                if a in ring and all(x in pos for x in ring):
                    cents.append(math.atan2(sum(pos[x][1] for x in ring) / len(ring) - c[1], sum(pos[x][0] for x in ring) / len(ring) - c[0]))
            def inside(gap_start, gap_len):
                return any(((ca - gap_start) % (2 * math.pi)) < gap_len for ca in cents)
            ranked = sorted(gaps, key=lambda gs: (inside(gs[1], gs[0]), -gs[0]))
            gap, start = ranked[0]
            angs = [start + gap * (i + 1) / (k + 1) for i in range(k)]
        for g, an in zip(kids, angs):
            pos[g] = (c[0] + RD_BOND * math.cos(an), c[1] + RD_BOND * math.sin(an))
            done.add(g)
            queue.append(g)


def layout_stage(st, src, orient):
    """Fill st['pos'] {idx: (x, y)} in RDKit units (y up)."""
    mol = st['mol']
    n = mol.GetNumAtoms()
    maps = st['maps']
    fixed = {}
    if src is not None:
        spos = src['posmap']
        for i, mp in enumerate(maps):
            if mp in st['movers']:
                continue
            if mp in spos:
                fixed[i] = spos[mp]
            elif mp in st['inherit'] and st['inherit'][mp] in spos:
                fixed[i] = spos[st['inherit'][mp]]
    mapping = []
    frags = Chem.GetMolFrags(mol, asMols=True, sanitizeFrags=True, fragsMolAtomMapping=mapping)
    pos = {}
    free_frags = []
    st['free_atoms'] = set()
    for sub, idxs in zip(frags, mapping):
        loc = {j: fixed[g] for j, g in enumerate(idxs) if g in fixed}
        res = layout_fragment(sub, loc)
        if not loc:
            free_frags.append((sub, idxs, res))
        else:
            for j, g in enumerate(idxs):
                pos[g] = res[j]
                if j not in loc:
                    st['free_atoms'].add(g)
    replace_leaves(mol, pos, st['free_atoms'])
    st['frag_of'] = {}
    for fi, (sub, idxs, res) in enumerate(free_frags):
        for g in idxs:
            st['frag_of'][g] = fi
    # orientation of the primary free fragment (first stage / anchor only)
    if orient and src is None:
        a, b = st['m2i'][orient['a']], st['m2i'][orient['b']]
        for fi, (sub, idxs, res) in enumerate(free_frags):
            if a in idxs:
                la, lb = idxs.index(a), idxs.index(b)
                v = vec(res[la], res[lb])
                want = screen_dir(orient['angle'])
                ang = math.atan2(want[1], want[0]) - math.atan2(v[1], v[0])
                c = res[la]
                for k in res:
                    res[k] = rot(res[k], ang, c)
                if orient.get('side'):
                    sm, sd = orient['side']
                    ls = idxs.index(st['m2i'][sm])
                    ya = res[la][1]
                    above = res[ls][1] > ya + 1e-6
                    if (sd == 'up') != above:
                        for k in res:
                            res[k] = (res[k][0], 2 * ya - res[k][1])
    placed = set(pos)
    hint_of = {}
    for h in st['hints']:
        if h['kind'] == 'frag':
            hint_of[st['frag_of'].get(st['m2i'][h['a']])] = h
    def place_default(fi, sub, idxs, res):
        pts = list(pos.values())
        if not pts:
            cx, cy = centroid(list(res.values()))
            for j, g in enumerate(idxs):
                pos[g] = (res[j][0] - cx, res[j][1] - cy)
            return
        maxx = max(p[0] for p in pts)
        minx = min(p[0] for p in res.values())
        cy = centroid(list(res.values()))[1]
        for j, g in enumerate(idxs):
            pos[g] = (res[j][0] - minx + maxx + 2.0 * RD_BOND, res[j][1] - cy)
    # 1) free fragments without a hint, 2) hinted ones in list order
    handled = set()
    manual_atoms = set()
    for h in st['hints']:
        if h['kind'] == 'manual':
            manual_atoms |= set(st['m2i'][m] for m in h['atoms'])
    for fi, (sub, idxs, res) in enumerate(free_frags):
        if fi not in hint_of and not set(idxs) <= manual_atoms:
            place_default(fi, sub, idxs, res)
            handled.add(fi)

    def ref_point(ref):
        refs = ref if isinstance(ref, (list, tuple)) else [ref]
        return centroid([pos[st['m2i'][r]] for r in refs])

    for h in st['hints']:
        if h['kind'] == 'manual':
            rp = ref_point(h['ref'])
            for mp, (dx, dy) in h['atoms'].items():
                pos[st['m2i'][mp]] = (rp[0] + dx * RD_BOND, rp[1] - dy * RD_BOND)
            for fi, (sub, idxs, res) in enumerate(free_frags):
                if set(st['m2i'][m] for m in h['atoms']) >= set(idxs):
                    handled.add(fi)
            continue
        ai = st['m2i'][h['a']]
        fi = st['frag_of'].get(ai)
        if fi is None:
            continue  # the atom sits in a fragment that has pinned atoms: hints only apply to free fragments
        sub, idxs, res = free_frags[fi]
        rp = ref_point(h['ref'])
        refs = h['ref'] if isinstance(h['ref'], (list, tuple)) else [h['ref']]
        # the fragment the ref atoms belong to (for 'out')
        ref_idx = [st['m2i'][r] for r in refs]
        same = [p for g, p in pos.items() if _frag_connected(mol, g, ref_idx[0])]
        if h['dir'] == 'out':
            cen = centroid(same) if same else (0.0, 0.0)
            d = unit(vec(cen, rp))
            if d == (0.0, 0.0):
                d = screen_dir(-90)
        else:
            d = screen_dir(h['dir'])
        la = idxs.index(ai)
        cur = [res[j] for j in range(len(idxs))]
        others = [cur[j] for j in range(len(idxs)) if j != la]
        if h['point'] is not None:
            u = vec(cur[la], cur[idxs.index(st['m2i'][h['point']])])
            ang = math.atan2(d[1], d[0]) - math.atan2(u[1], u[0])
        elif others:
            cen = centroid(others)
            u = vec(cur[la], cen)
            if math.hypot(*u) > 1e-3 and h['axis'] != 'perp':
                ang = math.atan2(d[1], d[0]) - math.atan2(u[1], u[0])
            else:
                if math.hypot(*u) <= 1e-3:
                    u = vec(cur[la], others[0])
                perp = (-d[1], d[0])
                ang = math.atan2(perp[1], perp[0]) - math.atan2(u[1], u[0])
        else:
            ang = 0.0
        if h['axis'] == 'perp' and others and h['point'] is None:
            u = vec(cur[la], centroid(others)) if math.hypot(*vec(cur[la], centroid(others))) > 1e-3 else vec(cur[la], others[0])
            perp = (-d[1], d[0])
            ang = math.atan2(perp[1], perp[0]) - math.atan2(u[1], u[0])
        ang += math.radians(h['rot'])
        rotd = [rot(p, ang, cur[la]) for p in cur]
        anchor_target = (rp[0] + d[0] * h['d'] * RD_BOND, rp[1] + d[1] * h['d'] * RD_BOND)
        if h['center']:
            c = centroid(rotd)
            shift = (anchor_target[0] - c[0], anchor_target[1] - c[1])
        else:
            shift = (anchor_target[0] - rotd[la][0], anchor_target[1] - rotd[la][1])
        for j, g in enumerate(idxs):
            pos[g] = (rotd[j][0] + shift[0], rotd[j][1] + shift[1])
        handled.add(fi)
    for fi, (sub, idxs, res) in enumerate(free_frags):
        if fi not in handled:
            place_default(fi, sub, idxs, res)
    # mirror free atoms across a pinned line so that an atom sits on the wanted side
    for m1, m2, am, want in st['side']:
        p1, p2 = pos[st['m2i'][m1]], pos[st['m2i'][m2]]
        ai = st['m2i'][am]
        dx, dy = p2[0] - p1[0], p2[1] - p1[1]
        def sgn(p):
            return dx * (p[1] - p1[1]) - dy * (p[0] - p1[0])  # > 0: left of p1->p2 (y up: above when p1->p2 points right)
        s = sgn(pos[ai])
        above = s > 0 if dx >= 0 else s < 0
        if (want == 'up') != above:
            L = math.hypot(dx, dy)
            ux, uy = dx / L, dy / L
            for g in st['free_atoms']:
                x, y = pos[g][0] - p1[0], pos[g][1] - p1[1]
                par = x * ux + y * uy
                px, py = par * ux, par * uy
                pos[g] = (p1[0] + 2 * px - x, p1[1] + 2 * py - y)
    st['pos'] = pos
    st['posmap'] = {maps[i]: p for i, p in pos.items()}
    assert len(pos) == n, (st['name'], len(pos), n)


def _frag_connected(mol, g, target):
    if g == target:
        return True
    seen = {g}
    stack = [g]
    while stack:
        x = stack.pop()
        for nb in mol.GetAtomWithIdx(x).GetNeighbors():
            j = nb.GetIdx()
            if j == target:
                return True
            if j not in seen:
                seen.add(j)
                stack.append(j)
    return False


def wedge_info(st):
    mol = Chem.Mol(st['mol'])
    conf = Chem.Conformer(mol.GetNumAtoms())
    for i, (x, y) in st['pos'].items():
        conf.SetAtomPosition(i, Point3D(x, y, 0.0))
    conf.Set3D(False)
    mol.RemoveAllConformers()
    mol.AddConformer(conf, assignId=True)
    out = {}
    try:
        Chem.WedgeMolBonds(mol, mol.GetConformer())
        for b in mol.GetBonds():
            d = b.GetBondDir()
            if d == Chem.BondDir.BEGINWEDGE:
                out[(b.GetBeginAtomIdx(), b.GetEndAtomIdx())] = 'wedge'
            elif d == Chem.BondDir.BEGINDASH:
                out[(b.GetBeginAtomIdx(), b.GetEndAtomIdx())] = 'dash'
    except Exception as e:
        print('  wedge failed:', e)
    return out


def build():
    spec = build_spec()
    result = {}
    report = dict(maxdrift=0.0, worst=None, warnings=[], stages=0)
    for rid, rx in spec.items():
        stages = rx['stages']
        names = [s['name'] for s in stages]
        by = {s['name']: s for s in stages}
        for i, s in enumerate(stages):
            if s['frm'] is None and i > 0:
                s['frm'] = stages[i - 1]['name']
            prepare(s)
        anchor = rx.get('anchor', names[0])
        by[anchor]['frm'] = None
        done = set()
        order = []
        pending = list(names)
        by[anchor]['_src'] = None
        layout_stage(by[anchor], None, rx.get('orient'))
        done.add(anchor)
        order.append(anchor)
        while len(done) < len(names):
            progressed = False
            for nm in names:
                if nm in done:
                    continue
                s = by[nm]
                # a stage can hang off the anchor in either direction: 'from' = the stage it inherits from
                src_name = s['frm']
                if src_name in done:
                    layout_stage(s, by[src_name], None)
                    done.add(nm)
                    order.append(nm)
                    progressed = True
            if not progressed:
                raise RuntimeError('layout order stuck in ' + rid)
        # scale / centre per reaction
        allp = [p for s in stages for p in s['pos'].values()]
        minx, maxx = min(p[0] for p in allp), max(p[0] for p in allp)
        miny, maxy = min(p[1] for p in allp), max(p[1] for p in allp)
        w, h = (maxx - minx), (maxy - miny)
        scale = PX_BOND / RD_BOND
        # keep room for atom labels: the box is the atom centres + MARGIN on every side
        fit = min((VIEW_W - 2 * MARGIN) / max(w, 1e-6), (VIEW_H - 2 * MARGIN) / max(h, 1e-6))
        shrunk = fit < scale
        if shrunk:
            scale = fit
        cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
        def tr(p):
            return (round(VIEW_W / 2 + (p[0] - cx) * scale, 1), round(VIEW_H / 2 - (p[1] - cy) * scale, 1))
        out_r = {}
        reactant = stages[0]
        for s in stages:
            mol = s['mol']
            wi = wedge_info(s) if (Chem.FindMolChiralCenters(mol, includeUnassigned=False, useLegacyImplementation=False)) else {}
            km = Chem.Mol(mol)
            try:
                Chem.Kekulize(km, clearAromaticFlags=False)
            except Exception:
                pass
            atoms = []
            for a in mol.GetAtoms():
                x, y = tr(s['pos'][a.GetIdx()])
                d = dict(idx=a.GetIdx(), sym=a.GetSymbol(), x=x, y=y, charge=a.GetFormalCharge(), map=a.GetAtomMapNum())
                if a.GetAtomMapNum() in s['movers']:
                    d['mv'] = True
                atoms.append(d)
            bonds = []
            manual = {(s['m2i'][x], s['m2i'][y]): k for x, y, k in s['wedges']}
            for b in mol.GetBonds():
                kb_ = km.GetBondBetweenAtoms(b.GetBeginAtomIdx(), b.GetEndAtomIdx())
                order = {Chem.BondType.SINGLE: 1, Chem.BondType.DOUBLE: 2, Chem.BondType.TRIPLE: 3}.get(kb_.GetBondType(), 1)
                bi, ei = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
                stereo = None
                if (bi, ei) in wi:
                    stereo = wi[(bi, ei)]
                elif (ei, bi) in wi:
                    stereo = wi[(ei, bi)]
                    bi, ei = ei, bi
                if (bi, ei) in manual:
                    stereo = manual[(bi, ei)]
                elif (ei, bi) in manual:
                    stereo = manual[(ei, bi)]
                    bi, ei = ei, bi
                bd = dict(a=bi, b=ei, order=order, stereo=stereo)
                if b.GetIsAromatic():
                    bd['arom'] = True
                bonds.append(bd)
            rmap = {str(reactant['m2i'][mp]): s['m2i'][mp] for mp in reactant['m2i'] if mp in s['m2i']}
            out_r[s['name']] = {'smiles': s['smiles'], 'from': s['frm'], 'note': s['note'], 'atoms': atoms, 'bonds': bonds, 'map': rmap}
        # drift + overlap check
        for s in stages:
            if s['frm'] is None:
                continue
            src = by[s['frm']]
            for a in out_r[s['name']]['atoms']:
                mp = a['map']
                if a.get('mv') or mp not in src['m2i']:
                    continue
                b = out_r[src['name']]['atoms'][src['m2i'][mp]]
                dr = math.hypot(a['x'] - b['x'], a['y'] - b['y'])
                if dr > report['maxdrift']:
                    report['maxdrift'] = dr
                    report['worst'] = (rid, s['name'], mp)
                if dr >= MAX_DRIFT_PX:
                    report['warnings'].append('DRIFT %s %s map %d: %.1f px' % (rid, s['name'], mp, dr))
            report['stages'] += 1
            pts = out_r[s['name']]['atoms']
            for i in range(len(pts)):
                for j in range(i + 1, len(pts)):
                    dd = math.hypot(pts[i]['x'] - pts[j]['x'], pts[i]['y'] - pts[j]['y'])
                    if dd < 0.55 * PX_BOND:
                        report['warnings'].append('CLOSE %s %s: atoms %s%d/%s%d %.1f px' % (rid, s['name'], pts[i]['sym'], pts[i]['map'], pts[j]['sym'], pts[j]['map'], dd))
            for bd in out_r[s['name']]['bonds']:
                A, B = pts[bd['a']], pts[bd['b']]
                dd = math.hypot(A['x'] - B['x'], A['y'] - B['y'])
                if dd < 0.6 * scale * RD_BOND or dd > 1.5 * scale * RD_BOND:
                    report['warnings'].append('BOND %s %s: %s%d-%s%d %.1f px' % (rid, s['name'], A['sym'], A['map'], B['sym'], B['map'], dd))
        result[rid] = out_r
        result[rid]['__scale'] = round(scale * RD_BOND, 1)
        if shrunk:
            report['warnings'].append('SHRUNK %s to %.1f px per bond' % (rid, scale * RD_BOND))
    meta = dict(viewBox=[VIEW_W, VIEW_H], bondPx=PX_BOND, note='x,y in SVG px (y down). atom.map = atom-map number shared by all stages of a reaction; '
                'atom.mv = this atom is a mover in this stage (excluded from the drift check). stage.from = the stage whose positions it inherits. '
                'Parse the stage smiles with removeHs=false: atom idx = parse order. Bond a is the narrow end of a wedge/dash.',
                scales={rid: result[rid].pop('__scale') for rid in list(result)})
    final = {'_meta': meta}
    final.update(result)
    return final, report


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    final, report = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(final, ensure_ascii=False, indent=1), encoding='utf-8')
    print('wrote learn/scenes/coords.json')
    n_stage = sum(len(v) for k, v in final.items() if k != '_meta')
    print('reactions: %d, stages: %d, max drift of pinned atoms: %.2f px %s' % (len(final) - 1, n_stage, report['maxdrift'], report['worst']))
    for w in report['warnings']:
        print('  warn:', w)
    return 1 if any(w.startswith('DRIFT') for w in report['warnings']) else 0


if __name__ == '__main__':
    sys.exit(main())
