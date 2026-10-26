// Chapter 7 engine checks (engine/reactions-halides.js, tools/check_halides.py, tests/fixtures/halides.json).
//  (1) wiring: reactions.js re-exports the engine; every table has its fields (NUCLEOPHILES, BASES, LEAVING, the pools);
//  (2) halideSites reads the C-X carbon (class, allylic / benzylic / vinylic / aryl, ring, beta carbons, written centre);
//  (3) every pool member x every nucleophile / base: SN2, SN1, E2, E1, Grignard, alcohols, alkanes either give a parseable canonical product or refuse with a reason; the R/S letters
//      before and after SN2 (cip.js) flip exactly when the priority order is unchanged; decide() returns a known mechanism set for every pair and the book's 7.9 table is checked on named cases;
//  (4) mechanisms (SN2, SN1, E2, E1) pass checkMechanism and end at the engine product (flat); the arrow grader accepts the equivalent H and beta carbons;
//  (5) an INDEPENDENT Python RDKit recompute (tools/check_halides.py: RWMol edits, 3D back-side placement, 3D ring-plane test for the chair rule, enumerated stereoisomers, CIP labeler):
//      800+ cases, every one must agree, including every refusal;
//  (6) the chair cases of the brief (7.55 pattern) and 24 ring stereoisomers; the hand-checked fixture (tests/fixtures/halides.json) with OPSIN names;
//  (7) halideChoices gives at least three distinct wrong answers, each with its own why.
// Run on its own with `node learn/tests/halides.mjs`, or as part of run.mjs.
import { ready, canon } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from '../engine/reactions-halides.js';
import * as R from '../engine/reactions.js';
import { checkMechanism, canonFlat, stepConfig } from '../engine/widgets/mechanism-core.js';
import * as arrow from '../engine/widgets/arrow-core.js';
import { tetraInfo } from '../engine/cip.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.join(HERE, '..', 'tools');

const attempt = (f) => { try { return { ok: true, v: f() }; } catch (e) { return { ok: false, reason: String(e.message || e).replace(/^excluded:\s*/, '') }; } };
const flatOf = (s) => canonFlat(s);

/** Run the Python checker on a list of cases; returns the result rows. */
function runPython(cases, tmp, tag) {
  const inp = path.join(tmp, tag + '-in.json'), outp = path.join(tmp, tag + '-out.json');
  fs.writeFileSync(inp, JSON.stringify({ cases }));
  execFileSync('python3', ['-I', path.join(TOOLS, 'check_halides.py'), inp, outp], { stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 1 << 28 });
  return JSON.parse(fs.readFileSync(outp, 'utf8')).cases;
}
function opsin(names, tmp) {
  const uniq = [...new Set(names)];
  const inp = path.join(tmp, 'op-in.json'), outp = path.join(tmp, 'op-out.json');
  fs.writeFileSync(inp, JSON.stringify(uniq));
  execFileSync('python3', ['-I', path.join(TOOLS, 'check_names.py'), inp, outp], { stdio: ['ignore', 'ignore', 'ignore'] });
  return JSON.parse(fs.readFileSync(outp, 'utf8'));
}

/** Ring stereoisomers (tags filled in from templates) for the chair rule. */
const RING_TEMPLATES = [
  'C[C{a}H]1CCCC[C{b}H]1Br',            // 1-bromo-2-methylcyclohexane
  'C[C{a}H]1CCCC[C{b}]1(C)Br',          // 1-bromo-1,2-dimethylcyclohexane (tertiary C-X)
  'C[C{a}H]1CCC[C{b}H](C)[C{c}H]1Br',   // 1-bromo-2,6-dimethylcyclohexane (two substituted beta carbons)
  'C[C{a}H]1CCC[C{b}H](Br)C1',          // 1-bromo-3-methylcyclohexane: both beta carbons are CH2, so no ring restriction at all
  'C[C{a}H]1CCCC[C{b}H]1Cl',            // chloride
  'CC[C{a}H]1CCCC[C{b}H]1Br'            // 1-bromo-2-ethylcyclohexane
];
const fill = (t) => {
  const keys = [...new Set([...t.matchAll(/\{(\w)\}/g)].map((m) => m[1]))];
  const out = [];
  for (let n = 0; n < 1 << keys.length; n++) out.push(t.replace(/\{(\w)\}/g, (_, k) => (n >> keys.indexOf(k)) & 1 ? '@@' : '@'));
  return out;
};

export async function halides({ ok, eq }) {
  await ready();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-halides-'));
  try {
    // ================================================================ 1. wiring and tables
    for (const k of ['halideSites', 'NUCLEOPHILES', 'BASES', 'LEAVING', 'betterLeaving', 'predictSN2', 'predictSN1', 'predictE2', 'predictE1', 'decide', 'sn2Mechanism', 'sn1Mechanism', 'e2Mechanism', 'e1Mechanism', 'grignard', 'fromAlcohol', 'monohalogenation', 'halideChoices', 'LAB_HALIDES', 'ALCOHOLS', 'ALKANES'])
      ok(R[k] === H[k] && H[k] !== undefined, `reactions.js re-exports ${k}`);
    eq(H.NUCLEOPHILE_IDS, ['I', 'Br', 'Cl', 'HO', 'MeO', 'EtO', 'CN', 'N3', 'MeS', 'HS', 'NH3', 'H2O', 'MeOH', 'EtOH', 'AcO'], 'nucleophile ids, in the order of the brief');
    eq(Object.keys(H.NUCLEOPHILES), H.NUCLEOPHILE_IDS, 'NUCLEOPHILES has exactly those ids');
    for (const id of H.NUCLEOPHILE_IDS) {
      const n = H.NUCLEOPHILES[id];
      ok(n.id === id && typeof n.label === 'string' && n.label.length > 1, `${id}: label`);
      ok(['strong', 'weak'].includes(n.nuc) && ['strong', 'weak'].includes(n.base) && typeof n.protic === 'boolean', `${id}: nuc / base / protic`);
      ok(!!canon(n.reactant) && !!canon(n.attach), `${id}: reactant and attach parse`);
      ok(Number.isInteger(n.site) && n.site >= 0, `${id}: attacking atom index`);
      eq(n.nuc === 'weak', n.protic, `${id}: the weak nucleophiles are exactly the protic solvents (H2O, ROH)`);
    }
    eq(H.NUCLEOPHILE_IDS.filter((i) => H.NUCLEOPHILES[i].base === 'strong'), ['HO', 'MeO', 'EtO'], 'strong bases among the nucleophiles: HO-, RO-');
    eq(H.NUCLEOPHILE_IDS.filter((i) => H.NUCLEOPHILES[i].nuc === 'weak'), ['H2O', 'MeOH', 'EtOH'], 'weak nucleophiles: H2O and the alcohols');
    eq(H.NUCLEOPHILE_IDS.filter((i) => H.NUCLEOPHILES[i].leaving).sort((p, q) => H.NUCLEOPHILES[q].leaving - H.NUCLEOPHILES[p].leaving), ['I', 'Br', 'Cl'], 'leaving rank I > Br > Cl');
    eq(H.BASE_IDS, ['KOH', 'NaOEt', 'NaOMe', 'heat'], 'base ids');
    eq(H.BASE_IDS.filter((b) => H.BASES[b].strong), ['KOH', 'NaOEt', 'NaOMe'], 'KOH, NaOEt and NaOMe are the E2 bases');
    eq(H.LEAVING.map((l) => l.id), ['I', 'Br', 'Cl', 'F', 'HO', 'NH2'], 'leaving groups, best first');
    for (const [a, b, want] of [['I', 'Br', 'I'], ['Br', 'Cl', 'Br'], ['Cl', 'F', 'Cl'], ['F', 'HO', 'F'], ['HO', 'NH2', 'HO'], ['Cl', 'I', 'I'], ['NH2', 'Br', 'Br']]) eq(H.betterLeaving(a, b), want, `betterLeaving(${a}, ${b})`);
    eq(H.betterLeaving('Br', 'Br'), null, 'equal leaving groups give null');
    ok(attempt(() => H.betterLeaving('X', 'Br')).ok === false, 'betterLeaving refuses an unknown id');

    // pools
    for (const [name, pool] of [['LAB_HALIDES', H.LAB_HALIDES], ['ALCOHOLS', H.ALCOHOLS], ['ALKANES', H.ALKANES]]) {
      eq(new Set(pool.map((p) => p.id)).size, pool.length, `${name}: ids are unique`);
      pool.forEach((p) => ok(!!canon(p.smiles), `${name} ${p.id}: parses`));
    }
    const need = ['bromomethane', 'bromoethane', '1-bromopropane', '2-bromopropane', '1-bromobutane', '2-bromobutane', '(R)-2-bromobutane', '(S)-2-bromobutane', '1-bromo-2-methylpropane', '2-bromo-2-methylpropane', '2-bromo-2-methylbutane', '2-chloro-2-methylpropane', '1-chlorobutane', '1-iodopropane', '3-bromopentane', '2-bromopentane', '(R)-2-bromohexane', '(S)-2-bromohexane', 'bromocyclohexane', 'bromocyclopentane', '1-bromo-1-methylcyclohexane', 'cis-1-bromo-2-methylcyclohexane', 'trans-1-bromo-2-methylcyclohexane', 'benzyl bromide', 'allyl bromide', '1-bromo-1-phenylethane', 'bromobenzene', '1-bromopropene'];
    need.forEach((id) => ok(H.LAB_HALIDES.some((p) => p.id === id), `LAB_HALIDES has ${id}`));
    ['butan-1-ol', 'butan-2-ol', '(S)-pentan-2-ol', '2-methylpropan-2-ol', 'cyclohexanol', '1-methylcyclohexan-1-ol', '2-methylbutan-2-ol'].forEach((id) => ok(H.ALCOHOLS.some((p) => p.id === id), `ALCOHOLS has ${id}`));
    ['propane', 'butane', '2-methylpropane', '2-methylpentane', 'pentane', 'cyclohexane', 'methylcyclohexane'].forEach((id) => ok(H.ALKANES.some((p) => p.id === id), `ALKANES has ${id}`));

    // ---- every pool name (both styles) is read by OPSIN as the very structure of its tile, stereo included
    {
      const all = [...H.LAB_HALIDES, ...H.E2_RING_POOL, ...H.ALCOHOLS, ...H.ALKANES];
      const names = all.flatMap((e) => [e.iupac || e.id, e.old || e.iupac || e.id]);
      const op = opsin(names, tmp);
      for (const e of all) {
        const n = [e.iupac || e.id, e.old || e.iupac || e.id];
        for (const nm of n) ok(!!op[nm] && canon(op[nm]) === canon(e.smiles), `pool name "${nm}" is read by OPSIN as ${e.smiles} (got ${op[nm]})`);
        const hn = H.halideName(e.smiles);
        ok(!!hn && typeof hn.new === 'string' && typeof hn.old === 'string', `halideName finds ${e.id}`);
      }
      ok(H.halideName('CCCCBr').new === '1-bromobutane' && H.halideName('CCCC[C@@H](C)Br').new === '(R)-2-bromohexane' && H.halideName('CC=CBr').old === '1-bromo-1-propene' && H.halideName('C=CCBr').new === '3-bromoprop-1-ene', 'halideName: both styles of a few tiles');
      eq(H.halideName('CCCCCCCBr'), null, 'halideName: null for a molecule outside the pools');
      // the written ring stereoisomers: the id carries the CIP letters, the cis / trans label of the tile agrees with the pair of letters
      for (const e of H.E2_RING_POOL.slice(0, 4)) { const m = /^\(1([RS]),2([RS])\)/.exec(e.id); eq(m[1] === m[2] ? 'trans' : 'cis', e.ring, `${e.id}: same letters mean trans, different letters mean cis for 1-bromo-2-methylcyclohexane`); }
    }

    // ---- R/S tags of the pool, read with cip.js here and with the new CIP labeler in Python below
    for (const p of [...H.LAB_HALIDES, ...H.ALCOHOLS].filter((q) => q.label)) {
      const t = tetraInfo(p.smiles).filter((x) => x.center);
      eq(t.map((x) => x.label), [p.label], `${p.id}: the written configuration is ${p.label} (cip.js)`);
    }

    // ================================================================ 2. halideSites
    const S = (smi) => H.halideSites(smi);
    const s1 = S('CC[C@@H](C)Br');
    ok(s1.ok && s1.cls === 2 && s1.X === 'Br' && s1.centre && s1.chiralPossible && !s1.ring && s1.betas.length === 2 && !s1.allylic && !s1.benzylic && !s1.vinylic && !s1.aryl, 'sites: (R)-2-bromobutane is a 2° centre with two beta carbons');
    ok(S('CBr').ok && S('CBr').cls === 0 && S('CBr').betas.length === 0, 'sites: bromomethane is methyl with no beta H');
    ok(S('CCCCl').cls === 1 && S('CCCCl').X === 'Cl', 'sites: 1-chloropropane is 1°');
    ok(S('CC(C)(C)I').cls === 3 && S('CC(C)(C)I').X === 'I' && S('CC(C)(C)I').betas.every((b) => b.nH === 3), 'sites: tert-butyl iodide is 3° with CH3 beta carbons');
    eq(S('CC(C)(C)Br').betas.length, 3, 'sites: tert-butyl bromide lists three beta carbons');
    ok(S('BrCc1ccccc1').benzylic && S('BrCc1ccccc1').cls === 1 && S('BrCc1ccccc1').betas.length === 0, 'sites: benzyl bromide is benzylic, with no beta H (the ring carbon is sp2)');
    ok(S('C=CCBr').allylic && S('C=CCBr').cls === 1, 'sites: allyl bromide is allylic');
    ok(S('Brc1ccccc1').aryl && !S('Brc1ccccc1').sp3, 'sites: bromobenzene is aryl');
    ok(S('CC=CBr').vinylic, 'sites: 1-bromopropene is vinylic');
    ok(S('BrC1CCCCC1').ring && S('BrC1CCCCC1').ringSize === 6 && S('BrC1CCCC1').ringSize === 5 && S('BrC1CCC1').ringSize === 4, 'sites: ring sizes');
    ok(S('CCCCBr').ring === false && S('CCCCBr').ringSize === 0, 'sites: a chain is not in a ring');
    ok(!S('CCCF').ok && /F/.test(S('CCCF').reason), 'sites: fluorides are refused with a reason');
    ok(!S('CCCO').ok && !S('BrCCBr').ok && !S('CCC').ok && !S('CC(Br)CCl').ok && !S('C.CBr').ok && !S('BrCCO').ok, 'sites: no halogen, two halogens, two molecules or another element are refused');
    ok(S('CBr').ok && H.halideSites('BrCCO', { any: true }).ok, 'sites: opts.any lets other elements through (for the Grignard check)');
    ok(!S('').ok && !S(null).ok && !S('C[').ok, 'sites: empty, null or invalid input is refused');
    ok(S('CC(C)CBr').cls === 1 && S('CC(C)CBr').betas.length === 1, 'sites: isobutyl bromide has one beta carbon (the CH)');

    // ================================================================ 3. every pool member x every reagent
    const hal = H.LAB_HALIDES;
    const cases = [];
    const addCase = (c) => cases.push(c);
    const brief = { sn2: 0, sn1: 0, e2: 0, e1: 0 };
    for (const h of hal) {
      for (const nu of H.NUCLEOPHILE_IDS) {
        const r = attempt(() => H.predictSN2(h.smiles, nu));
        const t = `SN2 ${h.id} + ${nu}`;
        if (r.ok) {
          const p = r.v;
          ok(p.ok && p.mech === 'SN2' && canon(p.product) === p.product && p.products.length === 1 && p.products[0] === p.product, `${t}: a canonical product`);
          ok(H.NUCLEOPHILES[nu].neutral || p.equation.lhs.length === 2, `${t}: equation`);
          ok(p.rate === 'k[RX][Nu]' && typeof p.why === 'string' && p.why.length > 40, `${t}: rate law and why`);
          const s = H.halideSites(h.smiles);
          // flags
          eq(p.inverted, s.centre, `${t}: inverted exactly when the substrate carbon is written with a configuration`);
          eq(p.flat, !s.centre && s.chiralPossible, `${t}: flat exactly when an unwritten stereocentre forms`);
          if (s.centre) {
            ok(!!p.labels.before && !!p.labels.after || p.labels.after === null, `${t}: labels given`);
            if (p.labels.before && p.labels.after) eq(p.labels.before !== p.labels.after, p.sameOrder, `${t}: the letter flips exactly when the priority order is unchanged (${p.labels.before} -> ${p.labels.after})`);
          } else eq(p.labels, { before: null, after: null }, `${t}: no letters without a written centre`);
          // the group that is on the carbon
          addCase({ id: t, kind: 'sn2', sub: h.smiles, nu, engine: { refused: false, product: p.product, labels: p.labels, flat: p.flat } });
        } else {
          ok(/excluded|sp²|tertiary|quaternary|halogen|carbon|F|reason/.test(r.reason) || r.reason.length > 10, `${t}: refusal has a reason (${r.reason})`);
          addCase({ id: t, kind: 'sn2', sub: h.smiles, nu, engine: { refused: true } });
        }
        brief.sn2++;
      }
      for (const nu of ['H2O', 'MeOH', 'EtOH', 'I', 'CN', 'AcO']) {
        const r = attempt(() => H.predictSN1(h.smiles, nu));
        const t = `SN1 ${h.id} + ${nu}`;
        if (r.ok) {
          const p = r.v;
          ok(p.mech === 'SN1' && p.rate === 'k[RX]' && p.products.every((x) => canon(x) === x) && /\[C/.test(p.cation) && /\+/.test(p.cation), `${t}: canonical products and a cation`);
          ok(p.racemic === (p.products.length === 2) && p.products.length <= 2, `${t}: racemic exactly when two enantiomers are listed`);
          if (p.racemic) ok(canon(R.mirror(p.products[0])) === p.products[1], `${t}: the two products are mirror images`);
          ok(typeof p.slow === 'boolean', `${t}: slow flag is a boolean`);
          addCase({ id: t, kind: 'sn1', sub: h.smiles, nu, engine: { refused: false, products: p.products, cation: p.cation, racemic: p.racemic } });
        } else addCase({ id: t, kind: 'sn1', sub: h.smiles, nu, engine: { refused: true } });
        brief.sn1++;
      }
      for (const b of ['KOH', 'NaOEt']) {
        const r = attempt(() => H.predictE2(h.smiles, b));
        const t = `E2 ${h.id} + ${b}`;
        if (r.ok) {
          const p = r.v;
          ok(p.mech === 'E2' && p.alkenes.length >= 1 && p.major.length >= 1 && p.rate === 'k[RX][base]', `${t}: alkenes and rate`);
          ok(p.alkenes.every((a) => canon(a.smiles) === a.smiles && Number.isInteger(a.subst) && a.subst >= 0 && a.subst <= 4), `${t}: canonical alkenes with a substituent count`);
          const top = Math.max(...p.alkenes.map((a) => a.subst));
          eq(p.alkenes.filter((a) => a.major).map((a) => a.smiles).sort(), p.alkenes.filter((a) => a.subst === top).map((a) => a.smiles).sort(), `${t}: the most substituted alkene(s) are major`);
          eq(p.zaitsev, p.alkenes.length > 1, `${t}: zaitsev flag`);
          ok(p.alkenes.every((a) => !/[/\\]/.test(a.smiles)), `${t}: no E/Z written`);
          addCase({ id: t, kind: 'e2', sub: h.smiles, engine: { refused: false, alkenes: p.alkenes.map((a) => ({ smiles: a.smiles, major: a.major })), ringBlocked: p.ringBlocked, ring: p.ring } });
        } else addCase({ id: t, kind: 'e2', sub: h.smiles, engine: { refused: true } });
        brief.e2++;
      }
      {
        const r = attempt(() => H.predictE1(h.smiles));
        const t = `E1 ${h.id}`;
        if (r.ok) {
          const p = r.v;
          ok(p.mech === 'E1' && p.rate === 'k[RX]' && /\+/.test(p.cation) && p.ring === false, `${t}: cation, rate, no chair rule`);
          addCase({ id: t, kind: 'e1', sub: h.smiles, engine: { refused: false, alkenes: p.alkenes.map((a) => ({ smiles: a.smiles, major: a.major })), ringBlocked: [], ring: false } });
        } else addCase({ id: t, kind: 'e1', sub: h.smiles, engine: { refused: true } });
        brief.e1++;
      }
      {
        const r = attempt(() => H.grignard(h.smiles));
        const t = `Grignard ${h.id}`;
        if (r.ok) {
          const g = r.v;
          ok(/Mg/.test(g.reagent) && !!canon(g.reagent) && !/Mg/.test(g.protonolysis.H2O) && /\[2H\]/.test(g.protonolysis.D2O) && !/\[2H\]/.test(g.protonolysis.H2O), `${t}: reagent has Mg, protonolysis gives R-H and R-D`);
          addCase({ id: t, kind: 'grignard', sub: h.smiles, engine: { refused: false, reagent: g.reagent, protonolysis: g.protonolysis } });
        } else addCase({ id: t, kind: 'grignard', sub: h.smiles, engine: { refused: true } });
      }
    }
    // Grignard refusals: acidic H and groups the reagent attacks (problem 7.61 pattern), and the cases the book allows (vinylic, aryl)
    const GR_BAD = { 'BrCCO': 'O–H', 'BrCCC(=O)O': 'CO₂H', 'BrCCN': 'N–H', 'BrCCS': 'S–H', 'BrCCC#C': 'terminal alkyne', 'BrCCC(C)=O': 'C=O', 'BrCCC#N': 'C≡N', 'BrCCCO': 'O–H', 'OC1CCCCC1Br': 'O–H', 'Brc1ccc(O)cc1': 'phenol O–H', 'BrCc1ccccc1C(=O)O': 'CO₂H', 'Brc1ccc(N)cc1': 'aryl N–H' };
    for (const [smi, why] of Object.entries(GR_BAD)) {
      const r = attempt(() => H.grignard(smi));
      ok(!r.ok && /acidic hydrogen|react with the Grignard/.test(r.reason), `Grignard refuses ${smi} (${why}): ${r.reason || 'it did not refuse'}`);
      addCase({ id: `Grignard ${smi}`, kind: 'grignard', sub: smi, engine: { refused: true } });
    }
    for (const smi of ['Brc1ccccc1', 'CC=CBr', 'BrCCOC', 'ClCCCC', 'Brc1ccc(C)cc1', 'ICC', 'Brc1ccc(OC)cc1']) {
      const r = attempt(() => H.grignard(smi));
      ok(r.ok, `Grignard works for ${smi}: ${r.reason || ''}`);
      if (r.ok) addCase({ id: `Grignard ${smi}`, kind: 'grignard', sub: smi, engine: { refused: false, reagent: r.v.reagent, protonolysis: r.v.protonolysis } });
    }
    ok(H.grignard('Brc1ccccc1').protonolysis.D2O === canon('[2H]c1ccccc1') && H.grignard('BrC1CCCCC1').protonolysis.D2O === canon('[2H]C1CCCCC1') && H.grignard('BrC1CCCCC1').protonolysis.H2O === 'C1CCCCC1', 'Grignard + D2O: bromocyclohexane -> deuteriocyclohexane, bromobenzene -> deuteriobenzene');
    ok(/Mg/.test(H.grignard('CCBr').reagent) && canon(H.grignard('CCBr').reagent) === canon('CC[Mg]Br'), 'Grignard reagent of bromoethane is ethylmagnesium bromide');

    // ---- the cases of the brief: refusals of each engine, in words
    const refuse = (f, re, msg) => { const r = attempt(f); ok(!r.ok && re.test(r.reason), `${msg}: ${r.reason || 'did not refuse'}`); };
    refuse(() => H.predictSN2('CC(C)(C)Br', 'CN'), /tertiary carbon: the back side is blocked/, 'SN2 at a 3° carbon');
    refuse(() => H.predictSN2('Brc1ccccc1', 'CN'), /sp² carbon/, 'SN2 on an aryl halide');
    refuse(() => H.predictSN2('CC=CBr', 'CN'), /sp² carbon/, 'SN2 on a vinylic halide');
    refuse(() => H.predictSN2('CC(C)(C)CBr', 'CN'), /neopentyl/, 'SN2 on a neopentyl halide');
    refuse(() => H.predictSN2('CCO', 'CN'), /halogen/, 'SN2 with no C–X bond');
    refuse(() => H.predictSN2('CCBr', 'XX'), /unknown nucleophile/, 'SN2 with an unknown nucleophile');
    refuse(() => H.predictSN1('CCCCBr', 'H2O'), /primary cation is far too unstable/, 'SN1 on a 1° halide');
    refuse(() => H.predictSN1('CBr', 'H2O'), /methyl cation is far too unstable/, 'SN1 on a methyl halide');
    refuse(() => H.predictSN1('CC(Br)C(C)C', 'H2O'), /could rearrange/, 'SN1 where the cation rearranges (2-bromo-3-methylbutane)');
    refuse(() => H.predictSN1('CC(Br)C(C)(C)C', 'H2O'), /could rearrange/, 'SN1 where a methyl shift is possible (2-bromo-3,3-dimethylbutane)');
    refuse(() => H.predictSN1('Brc1ccccc1', 'H2O'), /sp² carbon/, 'SN1 on an aryl halide');
    refuse(() => H.predictE2('CBr', 'KOH'), /no hydrogen on a neighbouring carbon/, 'E2 on bromomethane');
    refuse(() => H.predictE2('BrCc1ccccc1', 'KOH'), /no hydrogen on a neighbouring carbon/, 'E2 on benzyl bromide');
    refuse(() => H.predictE2('CC(C)(C)CBr', 'KOH'), /no hydrogen on a neighbouring carbon/, 'E2 on neopentyl bromide');
    refuse(() => H.predictE2('Brc1ccccc1', 'KOH'), /vinylic or aryl/, 'E2 on an aryl halide');
    refuse(() => H.predictE2('CCCBr', 'CN'), /strong base/, 'E2 with a non-basic nucleophile');
    refuse(() => H.predictE2('CC1CCCCC1Br', 'KOH'), /write the ring as cis or trans/, 'E2 on a six-membered ring written without cis / trans');
    refuse(() => H.predictE1('CCCCBr'), /primary cation/, 'E1 on a 1° halide');
    refuse(() => H.predictE1('CC(Br)C(C)C'), /could rearrange/, 'E1 where the cation rearranges');
    refuse(() => H.fromAlcohol('CC(C)(C)O', 'PBr3'), /3° alcohol is too crowded/, 'PBr3 on a 3° alcohol');
    refuse(() => H.fromAlcohol('CC(C)(C)O', 'SOCl2'), /3° alcohol is too crowded/, 'SOCl2 on a 3° alcohol');
    refuse(() => H.fromAlcohol('CC(O)C(C)C', 'HBr'), /could rearrange/, 'HBr on 3-methylbutan-2-ol (the cation rearranges)');
    refuse(() => H.fromAlcohol('OCCO', 'HBr'), /simple alcohols/, 'a diol');

    // ---- the book's decision table (7.9): named cases
    const D = (smi, id) => H.decide(smi, id);
    const mechs = (smi, id) => D(smi, id).mechs.join('+') || 'none';
    eq(mechs('CBr', 'CN'), 'SN2', '7.9: methyl + CN-: SN2');
    eq(mechs('CBr', 'HO'), 'SN2', '7.9: methyl + HO-: SN2 (no beta H, so never E2)');
    ok(D('CBr', 'H2O').noReaction && D('CBr', 'heat').noReaction && D('CBr', 'MeOH').noReaction, '7.9: methyl + a weak nucleophile: no reaction');
    eq(mechs('CCCBr', 'CN'), 'SN2', '7.9: 1° + CN-: SN2');
    eq(mechs('CCCBr', 'I'), 'SN2', '7.9: 1° + I-: SN2');
    eq(mechs('CCCBr', 'HO'), 'SN2+E2', '7.4: 1° + aqueous NaOH (id HO): SN2 with E2 beside it');
    eq(D('CCCBr', 'HO').major, 'SN2', '7.4: aqueous NaOH on a 1° halide substitutes: an alcohol');
    ok(/aqueous NaOH on a 1° halide substitutes/i.test(D('CCCBr', 'HO').reason) && /KOH in ethanol with heat tips it to E2/.test(D('CCCBr', 'HO').reason), '7.4: the reason names the KOH / ethanol / heat contrast');
    eq(mechs('CCCBr', 'MeO'), 'E2+SN2', '7.9: 1° + an alkoxide in its own alcohol (id MeO): E2 with SN2 beside it');
    eq(D('CCCBr', 'EtO').major, 'E2', '7.9: 1° + an alkoxide: the table says E2');
    eq(D('CCCBr', 'KOH').major, 'E2', '7.9: 1° + strong base: the table says E2');
    ok(D('CCCBr', 'H2O').noReaction && /1° cation does not form/.test(D('CCCBr', 'H2O').reason), '7.9: 1° + H2O: no reaction (a 1° cation does not form)');
    ok(D('CC(C)(C)CBr', 'CN').noReaction && D('CC(C)(C)CBr', 'HO').noReaction, 'neopentyl halides do not react');
    eq(mechs('CC(C)Br', 'CN'), 'SN2', '7.9: 2° + a non-basic nucleophile: SN2');
    eq(mechs('CC(C)Br', 'HO'), 'SN2+E2', '7.5: 2° + aqueous HO-: SN2 (inversion) with some alkene');
    eq(D('CC(C)Br', 'HO').major, 'SN2', '7.5: 2° + aqueous HO-: substitution is major');
    ok(/inversion/.test(D('CC(C)Br', 'HO').reason) && /KOH in hot ethanol makes E2 the main path/.test(D('CC(C)Br', 'HO').reason), '7.5: the reason names inversion and the KOH contrast');
    eq(mechs('CC(C)Br', 'MeO'), 'E2+SN2', '7.9: 2° + an alkoxide id (MeO): E2 major, SN2 beside it');
    eq(D('CC(C)Br', 'EtO').major, 'E2', '7.9: 2° + an alkoxide: E2');
    eq(mechs('CC(C)Br', 'KOH'), 'E2', '7.9: 2° + KOH: E2');
    eq(mechs('CC(C)Br', 'H2O'), 'SN1+E1', '7.9: 2° + water: SN1 and E1');
    ok(/slow/.test(D('CC(C)Br', 'H2O').reason), '7.9: 2° SN1 is described as slow');
    eq(mechs('CC(C)(C)Br', 'HO'), 'E2', '7.9: 3° + strong base: E2 (SN2 never happens at 3°)');
    eq(mechs('CC(C)(C)Br', 'NaOMe'), 'E2', '7.9: 3° + NaOCH3: E2');
    eq(mechs('CC(C)(C)Br', 'H2O'), 'SN1+E1', '7.9: 3° + water: SN1 and E1');
    eq(D('CC(C)(C)Br', 'H2O').major, 'SN1', '7.9: SN1 is the bigger share in the cold');
    ok(/competes?|compete/.test(D('CC(C)(C)Br', 'H2O').reason) && /heat/.test(D('CC(C)(C)Br', 'H2O').reason), '7.9: the reason names the competition and the effect of heat');
    eq(mechs('CC(C)(C)Br', 'CN'), 'SN1+E1', '7.9: 3° + a non-basic nucleophile: SN2 is blocked, SN1 + E1 in a protic solvent');
    ok(/halide ionises first/.test(D('CC(C)(C)Br', 'CN').reason), '7.9: the note says the halide ionises first');
    eq(mechs('BrCc1ccccc1', 'CN'), 'SN2', '7.9: benzylic 1° + CN-: SN2');
    eq(mechs('BrCc1ccccc1', 'H2O'), 'SN1', '7.9: benzylic 1° + water: SN1 through the resonance-stabilised cation');
    eq(mechs('C=CCBr', 'H2O'), 'SN1', '7.9: allylic 1° + water: SN1');
    eq(mechs('CC(Br)c1ccccc1', 'KOH'), 'E2', '7.9: 2° benzylic + strong base: E2');
    ok(D('Brc1ccccc1', 'HO').noReaction && D('CC=CBr', 'CN').noReaction && /sp² carbon/.test(D('Brc1ccccc1', 'HO').reason), '7.9: aryl and vinylic halides: no SN1 or SN2 at an sp² carbon');
    // every (substrate, reagent) pair returns a known mechanism set
    const KNOWN = new Set(['SN2', 'SN1+E1', 'E2', 'E2+SN2', 'SN2+E2', 'SN1', 'none']);   // the sets the book's table can give
    let decided = 0, excluded = 0;
    for (const h of hal) for (const rid of [...H.NUCLEOPHILE_IDS, ...H.BASE_IDS]) {
      const d = D(h.smiles, rid);
      const t = `decide ${h.id} + ${rid}`;
      if (!d.ok) {
        excluded++;
        ok(d.excluded === true && typeof d.reason === 'string' && d.reason.length > 15 && (h.ring !== undefined || /rearrange/.test(d.reason)), `${t}: refused for a stated reason (${d.reason})`);
        continue;
      }
      decided++;
      ok(KNOWN.has(d.mechs.join('+') || 'none'), `${t}: a known mechanism set (${d.mechs.join('+')})`);
      ok(typeof d.reason === 'string' && d.reason.length > 30 && /[.]$/.test(d.reason) && !d.reason.includes('\n'), `${t}: one line of reason`);
      ok(typeof d.caveman === 'string' && d.caveman.length > 8 && d.caveman.length < d.reason.length, `${t}: a shorter caveman line`);
      if (d.noReaction) { eq(d.products, [], `${t}: no products when nothing happens`); eq(d.major, null, `${t}: no major mechanism`); continue; }
      ok(d.mechs.includes(d.major) && d.mechs[0] === d.major, `${t}: the major mechanism comes first`);
      ok(d.products.length >= 1 && d.products.every((p) => !!canon(p.smiles) && d.mechs.includes(p.mech) && ['major', 'minor'].includes(p.role)), `${t}: products are tagged with their mechanism and role`);
      ok(d.products.some((p) => p.role === 'major' && p.mech === d.major), `${t}: the major mechanism has a major product`);
      ok(d.products.filter((p) => p.mech !== d.major).every((p) => p.role === 'minor'), `${t}: the other mechanisms give minor products`);
    }
    ok(decided > 400 && excluded <= 20, `decide covered ${decided} pairs (${excluded} refused for the rearranging cation)`);

    // ================================================================ 4. mechanisms
    const stepsExpect = { SN2: (nu) => (H.NUCLEOPHILES[nu].neutral ? 2 : 1), SN1: (nu) => (H.NUCLEOPHILES[nu].neutral ? 3 : 2) };
    let mechN = 0;
    for (const h of hal) {
      for (const nu of H.NUCLEOPHILE_IDS) {
        let p = attempt(() => H.predictSN2(h.smiles, nu));
        if (p.ok) {
          const m = H.sn2Mechanism(h.smiles, nu);
          const errs = checkMechanism(m);
          eq(errs, [], `sn2 mechanism ${h.id} + ${nu} passes checkMechanism`);
          eq(m.steps.length, stepsExpect.SN2(nu), `sn2 mechanism ${h.id} + ${nu}: step count`);
          eq(flatOf(m.products[0]), flatOf(p.v.product), `sn2 mechanism ${h.id} + ${nu}: ends at the engine product (flat)`);
          ok(m.steps[0].arrows.length === 2 && m.steps[0].arrows.every((a) => a.why && a.why.length > 20), `sn2 mechanism ${h.id} + ${nu}: two arrows with a why each`);
          ok(/back/.test(m.steps[0].label) && /one step|One step/.test(m.steps[0].label), `sn2 mechanism ${h.id} + ${nu}: the label says back-side attack in one step`);
          mechN++;
        }
        p = attempt(() => H.predictSN1(h.smiles, nu));
        if (p.ok && ['H2O', 'EtOH', 'I', 'CN'].includes(nu)) {
          const m = H.sn1Mechanism(h.smiles, nu);
          eq(checkMechanism(m), [], `sn1 mechanism ${h.id} + ${nu} passes checkMechanism`);
          eq(m.steps.length, stepsExpect.SN1(nu), `sn1 mechanism ${h.id} + ${nu}: step count`);
          eq(flatOf(m.products[0]), flatOf(p.v.products[0]), `sn1 mechanism ${h.id} + ${nu}: ends at the engine product (flat)`);
          ok(/slow/.test(m.steps[0].label) && /rate = k\[RX\]/.test(m.steps[0].label), `sn1 mechanism ${h.id} + ${nu}: step 1 is the slow step`);
          if (H.NUCLEOPHILES[nu].neutral) ok(m.steps[2].added && m.steps[2].added.length === 1, `sn1 mechanism ${h.id} + ${nu}: step 3 adds a second solvent molecule`);
          mechN++;
        }
      }
      for (const b of ['KOH', 'NaOEt', 'NaOMe']) {
        const p = attempt(() => H.predictE2(h.smiles, b));
        if (!p.ok) continue;
        for (const a of p.v.alkenes) for (const beta of a.betas) {
          const m = H.e2Mechanism(h.smiles, b, { beta });
          const t = `e2 mechanism ${h.id} + ${b} (${a.smiles})`;
          eq(checkMechanism(m), [], `${t} passes checkMechanism`);
          eq(m.steps.length, 1, `${t}: one step`);
          eq(m.steps[0].arrows.length, 3, `${t}: three arrows`);
          eq(flatOf(m.products[0]), flatOf(a.smiles), `${t}: ends at the alkene`);
          mechN++;
        }
      }
      const e = attempt(() => H.predictE1(h.smiles));
      if (e.ok) for (const a of e.v.alkenes) for (const sv of ['H2O', 'MeOH']) {
        const m = H.e1Mechanism(h.smiles, { alkene: a.smiles, solvent: sv });
        const t = `e1 mechanism ${h.id} in ${sv} (${a.smiles})`;
        eq(checkMechanism(m), [], `${t} passes checkMechanism`);
        eq(m.steps.length, 2, `${t}: two steps`);
        eq(flatOf(m.products[0]), flatOf(a.smiles), `${t}: ends at the alkene`);
        ok(/slow/.test(m.steps[0].label), `${t}: step 1 is the slow step`);
        mechN++;
      }
    }
    ok(mechN >= 500, `${mechN} mechanisms were built and proven`);
    // the arrow grader accepts every equivalent H (and the equivalent beta carbon): 2-bromopropane + KOH has six equivalent beta hydrogens on two CH3 groups
    {
      const m = H.e2Mechanism('CC(C)Br', 'KOH');
      const st = m.steps[0];
      const cfg = stepConfig(st);
      ok(arrow.grade(cfg, st.arrows).ok, 'the expected E2 arrows are graded right');
      ok(Array.isArray(st.equiv) && st.equiv.length >= 5, `E2 of 2-bromopropane lists its equivalent hydrogens (${(st.equiv || []).length} swaps)`);
      const [base, , cx] = [st.arrows[0], st.arrows[1], st.arrows[2]];
      void cx;
      // draw the same mechanism with the other CH3
      const heavy = cfg.atoms.map((a, i) => i);
      const Hs = heavy.filter((i) => cfg.atoms[i].el === 'H');
      let good = 0, tried = 0;
      for (const hh of Hs) {
        const bond = cfg.bonds.find((b) => (b.a === hh || b.b === hh));
        const k = bond.a === hh ? bond.b : bond.a;
        const nbC = cfg.bonds.filter((b) => (b.a === k || b.b === k)).map((b) => (b.a === k ? b.b : b.a)).find((i) => cfg.atoms[i].el === 'C' && cfg.bonds.some((b2) => (b2.a === i || b2.b === i) && (b2.a === st.arrows[2].from.bond[0] || b2.b === st.arrows[2].from.bond[0] || b2.a === st.arrows[2].from.bond[1] || b2.b === st.arrows[2].from.bond[1]) && cfg.atoms[i].el === 'C'));
        void nbC;
        if (cfg.atoms[k].el !== 'C') continue;
        const C = st.arrows[2].from.bond[0];
        if (k === C) continue;
        tried++;
        const drawn = [{ from: base.from, to: { atom: hh } }, { from: { bond: [hh, k] }, to: { bond: [k, C] } }, st.arrows[2]];
        if (arrow.grade(cfg, drawn).ok) good++;
      }
      ok(tried === 6 && good === 6, `the grader accepts the mechanism with each of the six equivalent beta hydrogens (${good}/${tried})`);
    }

    // ================================================================ 5. Python cross-check
    // extra E2 cases: every stereoisomer of the ring templates (the chair rule), and the same written ring without enough marks (refused)
    const ringSubs = [];
    for (const t of RING_TEMPLATES) for (const s of fill(t)) ringSubs.push(s);
    for (const s of ringSubs) {
      const r = attempt(() => H.predictE2(s, 'KOH'));
      addCase({ id: `E2 ring ${s}`, kind: 'e2', sub: s, engine: r.ok ? { refused: false, alkenes: r.v.alkenes.map((a) => ({ smiles: a.smiles, major: a.major })), ringBlocked: r.v.ringBlocked, ring: r.v.ring } : { refused: true } });
    }
    for (const s of ['CC1CCCCC1Br', 'C[C@H]1CCCCC1Br', 'CC1CCCC[C@H]1Br', 'BrC1CCCCCC1', 'CC1CCCCCC1Br', 'BrC1CCCC1C', 'C[C@H]1CCCC[C@@H]1Br']) {
      const r = attempt(() => H.predictE2(s, 'KOH'));
      addCase({ id: `E2 ring ${s}`, kind: 'e2', sub: s, engine: r.ok ? { refused: false, alkenes: r.v.alkenes.map((a) => ({ smiles: a.smiles, major: a.major })), ringBlocked: r.v.ringBlocked, ring: r.v.ring } : { refused: true } });
    }
    // extra substrates through every engine (not in the pool): more classes, chlorides and iodides, branching
    for (const s of ['CCCCCBr', 'CC(C)CCBr', 'CCC(C)CBr', 'CC(C)C(C)Br', 'CCC(C)(C)I', 'CC(C)(C)CC', 'CCCC(C)(C)Br', 'CC(Cl)CC', 'ICC', 'CCC[C@H](C)I', 'CCC[C@@H](C)Cl', 'C[C@H](Br)c1ccccc1', 'BrC1CCCCCC1', 'CC(C)(Br)C(C)C', 'CCC(CC)(CC)Br', 'BrCC1CCCCC1', 'CC1CCC(Br)CC1', 'BrC(C)(C)CC=C']) {
      for (const nu of ['CN', 'HO', 'MeS']) { const r = attempt(() => H.predictSN2(s, nu)); addCase({ id: `SN2 x ${s} + ${nu}`, kind: 'sn2', sub: s, nu, engine: r.ok ? { refused: false, product: r.v.product, labels: r.v.labels, flat: r.v.flat } : { refused: true } }); }
      for (const nu of ['H2O', 'MeOH']) { const r = attempt(() => H.predictSN1(s, nu)); addCase({ id: `SN1 x ${s} + ${nu}`, kind: 'sn1', sub: s, nu, engine: r.ok ? { refused: false, products: r.v.products, cation: r.v.cation, racemic: r.v.racemic } : { refused: true } }); }
      { const r = attempt(() => H.predictE2(s, 'KOH')); addCase({ id: `E2 x ${s}`, kind: 'e2', sub: s, engine: r.ok ? { refused: false, alkenes: r.v.alkenes.map((a) => ({ smiles: a.smiles, major: a.major })), ringBlocked: r.v.ringBlocked, ring: r.v.ring } : { refused: true } }); }
      { const r = attempt(() => H.predictE1(s)); addCase({ id: `E1 x ${s}`, kind: 'e1', sub: s, engine: r.ok ? { refused: false, alkenes: r.v.alkenes.map((a) => ({ smiles: a.smiles, major: a.major })), ringBlocked: [], ring: false } : { refused: true } }); }
    }
    // alcohols and alkanes
    for (const a of H.ALCOHOLS) for (const rid of ['HBr', 'HCl', 'HI', 'PBr3', 'SOCl2']) {
      const r = attempt(() => H.fromAlcohol(a.smiles, rid));
      const t = `${a.id} + ${rid}`;
      if (r.ok) {
        const p = r.v;
        ok(canon(p.product) === p.product && typeof p.why === 'string' && p.why.length > 30, `fromAlcohol ${t}: a canonical product and a why`);
        if (rid === 'PBr3' || rid === 'SOCl2') {
          eq(p.inverted, !!a.label, `fromAlcohol ${t}: inverted exactly when the alcohol carbon is written with a configuration`);
          if (a.label) eq(p.labels.before !== p.labels.after, p.sameOrder, `fromAlcohol ${t}: the letter flips exactly when the priority order is unchanged (${p.labels.before} -> ${p.labels.after})`);
          ok(p.mech === 'SN2' && !p.racemic, `fromAlcohol ${t}: SN2-like, not racemic`);
        } else ok(!p.inverted && p.mech === (p.cls >= 2 ? 'SN1' : 'SN2'), `fromAlcohol ${t}: HX is SN1 on 2° and 3° alcohols, SN2 on 1°`);
        addCase({ id: `alcohol ${t}`, kind: 'alcohol', sub: a.smiles, reagent: rid, engine: { refused: false, product: p.product, labels: p.labels } });
      } else addCase({ id: `alcohol ${t}`, kind: 'alcohol', sub: a.smiles, reagent: rid, engine: { refused: true } });
    }
    for (const a of ['CCCC(C)O', 'CC(C)CCO', 'CC(O)C(C)C', 'CC(O)C(C)(C)C', 'CC[C@@H](C)O', 'CC[C@H](O)CC', 'OC1CCCC1', 'C[C@H]1CCCC[C@@H]1O', 'CCC(O)(CC)CC', 'CO', 'CCO']) for (const rid of ['HBr', 'PBr3', 'SOCl2']) {
      const r = attempt(() => H.fromAlcohol(a, rid));
      addCase({ id: `alcohol x ${a} + ${rid}`, kind: 'alcohol', sub: a, reagent: rid, engine: r.ok ? { refused: false, product: r.v.product, labels: r.v.labels } : { refused: true } });
    }
    for (const a of H.ALKANES) for (const X of ['Cl', 'Br']) {
      const r = H.monohalogenation(a.smiles, X);
      ok(r.length >= 1 && r.every((x) => canon(x.smiles) === x.smiles && x.nH >= 1 && typeof x.chiral === 'boolean'), `monohalogenation ${a.id} ${X}: canonical products with nH and chiral`);
      eq(r.reduce((n, x) => n + x.nH, 0), (() => { const m = H.monohalogenation(a.smiles, X); return m.reduce((n, x) => n + x.nH, 0); })(), `monohalogenation ${a.id} ${X}: stable`);
      addCase({ id: `mono ${a.id} ${X}`, kind: 'mono', sub: a.smiles, X, engine: { products: r.map((x) => ({ smiles: x.smiles, nH: x.nH, chiral: x.chiral })) } });
    }
    for (const a of ['CCCCCC', 'CC(C)CC', 'CCC(C)CC', 'C1CCCC1', 'CC(C)(C)C', 'CC(C)C(C)C']) addCase({ id: `mono x ${a} Cl`, kind: 'mono', sub: a, X: 'Cl', engine: { products: H.monohalogenation(a, 'Cl').map((x) => ({ smiles: x.smiles, nH: x.nH, chiral: x.chiral })) } });
    // the pool's tags mean what the ids say: R/S letters (new CIP labeler) and cis / trans (3D)
    for (const p of [...hal, ...H.ALCOHOLS].filter((q) => q.label)) addCase({ id: `cip ${p.id}`, kind: 'cip', sub: p.smiles, expect: p.label });
    for (const p of hal.filter((q) => q.ring)) addCase({ id: `cistrans ${p.id}`, kind: 'cistrans', sub: p.smiles, expect: p.ring });

    const rows = runPython(cases, tmp, 'main');
    eq(rows.length, cases.length, 'Python answered every case');
    const bad = rows.filter((r) => !r.match);
    ok(bad.length === 0, `Python RDKit agrees on every case (${bad.length} of ${rows.length} disagree): ${bad.slice(0, 3).map((b) => b.id + ' => ' + b.why).join(' || ')}`);
    ok(rows.length >= 800, `at least 800 Python cases (${rows.length})`);
    const byKind = {};
    rows.forEach((r) => { byKind[r.kind] = (byKind[r.kind] || 0) + 1; });
    ok(['sn2', 'sn1', 'e2', 'e1', 'grignard', 'alcohol', 'mono', 'cip', 'cistrans'].every((k) => byKind[k] > 0), `every kind was cross-checked ${JSON.stringify(byKind)}`);
    ok(rows.filter((r) => r.kind === 'sn2' && /3D back-side placement agrees/.test(r.why)).length >= 30, 'at least 30 SN2 products were also placed by 3D back-side geometry');
    ok(rows.filter((r) => r.kind === 'e2' && /ring-forbidden alkenes agree/.test(r.why)).length >= 30, 'at least 30 E2 ring cases were checked by the 3D ring-plane test');
    console.log(`  halides: ${rows.length} Python cases agree (${JSON.stringify(byKind)}); ${mechN} mechanisms proven; decide covered ${decided} pairs`);

    // ================================================================ 6. the chair cases (7.55 pattern) and the other cases of the brief
    {
      const trans = H.predictE2('C[C@H]1CCCC[C@@H]1Br', 'KOH');
      eq(trans.alkenes.length, 1, 'trans-1-bromo-2-methylcyclohexane + KOH gives ONE alkene');
      eq(flatOf(trans.major[0]), flatOf('CC1C=CCCC1'), 'trans: only 3-methylcyclohexene (the non-Zaitsev alkene)');
      eq(trans.ringBlocked.map((b) => flatOf(b.smiles)), [flatOf('CC1=CCCCC1')], 'trans: 1-methylcyclohexene is the one the anti rule forbids');
      eq(trans.alkenes[0].subst, 2, 'trans: 3-methylcyclohexene has two carbon groups on the C=C');
      eq(trans.ring, true, 'trans: the ring rule was applied');
      const cis = H.predictE2('C[C@H]1CCCC[C@H]1Br', 'KOH');
      eq(cis.alkenes.length, 2, 'cis-1-bromo-2-methylcyclohexane gives two alkenes');
      eq(cis.major.map(flatOf), [flatOf('CC1=CCCCC1')], 'cis: 1-methylcyclohexene is major (Zaitsev)');
      eq(cis.minor.map(flatOf), [flatOf('CC1C=CCCC1')], 'cis: 3-methylcyclohexene is minor');
      eq(cis.ringBlocked, [], 'cis: nothing is forbidden');
      eq(H.predictE2('BrC1CCCCC1', 'KOH').major, ['C1=CCCCC1'], 'bromocyclohexane -> cyclohexene');
      const t = H.predictE2('CC1(Br)CCCCC1', 'KOH');
      eq(t.major, ['CC1=CCCCC1'], '1-bromo-1-methylcyclohexane: 1-methylcyclohexene is major');
      eq(t.minor.map(flatOf), [flatOf('C=C1CCCCC1')], '1-bromo-1-methylcyclohexane: methylenecyclohexane is minor');
      // other ring sizes: plain Zaitsev, ring:false
      const five = H.predictE2('C[C@H]1CCC[C@@H]1Br', 'KOH');
      eq(five.ring, false, 'a five-membered ring: no chair rule (ring false)');
      ok(five.alkenes.some((a) => a.major && flatOf(a.smiles) === flatOf('CC1=CCCC1')), 'a five-membered ring: plain Zaitsev gives the 1-methylcycloalkene');
      // the four stereoisomers of 1-bromo-2-methylcyclohexane: the two trans give the non-Zaitsev alkene only, the two cis give both (read in 3D by Python, above)
      let nTrans = 0, nCis = 0;
      for (const s of fill('C[C{a}H]1CCCC[C{b}H]1Br')) { const q = H.predictE2(s, 'KOH'); if (q.alkenes.length === 1) nTrans++; else nCis++; }
      ok(nTrans === 2 && nCis === 2, `two of the four stereoisomers are trans (one alkene), two are cis (two alkenes): ${nTrans}/${nCis}`);
      // tertiary C-X with a substituted beta carbon: the 2-methyl group relative to Br decides
      let n1 = 0, n2 = 0;
      for (const s of fill('C[C{a}H]1CCCC[C{b}]1(C)Br')) { const q = H.predictE2(s, 'KOH'); if (q.ringBlocked.length) n1++; else n2++; }
      ok(n1 === 2 && n2 === 2, `1-bromo-1,2-dimethylcyclohexane: two stereoisomers forbid the tetrasubstituted alkene, two allow it (${n1}/${n2})`);
      // 1-bromo-3-methylcyclohexane: both beta carbons are CH2, so every stereoisomer gives both alkenes
      ok(fill('C[C{a}H]1CCC[C{b}H](Br)C1').every((s) => H.predictE2(s, 'KOH').ringBlocked.length === 0), '1-bromo-3-methylcyclohexane: the ring rule never forbids anything');
    }
    // E1 on a ring has no anti rule: both alkenes form for trans too (the 2° cation rearranges here, so use the tertiary one)
    {
      const e1 = H.predictE1('CC1(Br)CCCCC1');
      eq(e1.major, ['CC1=CCCCC1'], 'E1 of 1-bromo-1-methylcyclohexane: 1-methylcyclohexene major');
      eq(e1.ring, false, 'E1: no ring rule');
      const e1b = H.predictE1('CCC(C)(C)Br');
      eq(e1b.major, ['CC=C(C)C'], 'E1 of 2-bromo-2-methylbutane: 2-methylbut-2-ene major (Zaitsev)');
      eq(e1b.minor, ['C=C(C)CC'], 'E1: 2-methylbut-1-ene minor');
    }
    // SN2 with the brief's nucleophile attachments
    {
      const expect = { CN: 'CCCCC#N', I: 'CCCCI', Cl: 'CCCCCl', HO: 'CCCCO', MeO: 'CCCCOC', EtO: 'CCCCOCC', N3: 'CCCCN=[N+]=[N-]', MeS: 'CCCCSC', HS: 'CCCCS', NH3: 'CCCCN', H2O: 'CCCCO', MeOH: 'CCCCOC', EtOH: 'CCCCOCC', AcO: 'CCCCOC(C)=O' };
      for (const [nu, want] of Object.entries(expect)) eq(H.predictSN2('CCCCBr', nu).product, canon(want), `1-bromobutane + ${nu}`);
      eq(H.predictSN2('CC[C@@H](C)Br', 'HO').product, canon('CC[C@H](C)O'), '(R)-2-bromobutane + HO- gives (S)-butan-2-ol');
      eq(H.predictSN2('CC[C@H](C)Br', 'HO').product, canon('CC[C@@H](C)O'), '(S)-2-bromobutane + HO- gives (R)-butan-2-ol');
      eq(H.predictSN2('CC[C@@H](C)Br', 'I').labels, { before: 'R', after: 'S' }, '(R)-2-bromobutane + I- gives the (S) iodide: Br and I are both the top priority, so the letter flips');
      const cn = H.predictSN2('CC[C@@H](C)Br', 'CN');
      ok(cn.sameOrder === true && cn.labels.before === 'R' && cn.labels.after === 'S', '(R)-2-bromobutane + CN-: C≡N (N,N,N) outranks ethyl, so the priority order is unchanged and the letter flips to (S)');
      const alcohol = H.fromAlcohol('CCC[C@H](C)O', 'PBr3');
      eq([alcohol.labels.before, alcohol.labels.after, alcohol.inverted, alcohol.sameOrder], ['S', 'R', true, true], '(S)-pentan-2-ol + PBr3 gives (R)-2-bromopentane');
      eq(alcohol.product, canon('CCC[C@@H](C)Br'), '(S)-pentan-2-ol + PBr3: the product is (R)-2-bromopentane');
      eq(H.fromAlcohol('CC(C)(C)O', 'HBr').product, canon('CC(C)(C)Br'), '2-methylpropan-2-ol + HBr gives tert-butyl bromide');
      eq(H.fromAlcohol('CCC[C@H](C)O', 'HBr').racemic, true, '(S)-pentan-2-ol + HBr: a racemate (SN1-like), drawn flat');
      eq(H.fromAlcohol('CCC[C@H](C)O', 'HBr').product, canon('CCCC(C)Br'), '(S)-pentan-2-ol + HBr: the flat bromide');
      eq(H.fromAlcohol('CCCCO', 'PBr3').product, canon('CCCCBr'), 'butan-1-ol + PBr3 gives 1-bromobutane');
      eq(H.fromAlcohol('CCCCO', 'SOCl2').product, canon('CCCCCl'), 'butan-1-ol + SOCl2 gives 1-chlorobutane');
      const m = H.monohalogenation('CCCC(C)C', 'Cl');
      eq(m.length, 5, '2-methylpentane + Cl2/hv: five monochlorides (7.27 pattern)');
      eq(m.filter((x) => x.chiral).length, 3, 'three of them are chiral (a stereocentre is created)');
      eq(m.reduce((n, x) => n + x.nH, 0), 14, 'all fourteen hydrogens are accounted for');
      eq(H.monohalogenation('CCC', 'Cl').map((x) => [x.smiles, x.nH]), [['CCCCl', 6], ['CC(C)Cl', 2]].sort((p, q) => p[0].localeCompare(q[0])).map(([s, n]) => [canon(s), n]).sort((p, q) => p[0].localeCompare(q[0])), 'propane: 1-chloropropane (6 H) and 2-chloropropane (2 H)');
    }

    // ---- the hand-checked fixture: every case is reproduced by the engine and every name is parsed by OPSIN to the very structure the engine gives
    {
      const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'halides.json'), 'utf8'));
      ok(fx.length >= 30, `the fixture has at least 30 hand-checked cases (${fx.length})`);
      eq(new Set(fx.map((f) => f.id)).size, fx.length, 'fixture ids are unique');
      const MECHS = ['SN2', 'SN1', 'E2', 'E1', 'Grignard', 'alcohol', 'mono'];
      ok(MECHS.every((m) => fx.some((f) => f.mechanism === m)), 'the fixture covers SN2, SN1, E2, E1, Grignard, alcohols and monohalogenation');
      const engineOf = (f) => {
        const [r0, arg] = f.reagent.split(':');
        switch (f.mechanism) {
          case 'SN2': return { main: H.predictSN2(f.substrate, f.reagent).products, minor: [] };
          case 'SN1': return { main: H.predictSN1(f.substrate, f.reagent).products, minor: [] };
          case 'E2': { const p = H.predictE2(f.substrate, f.reagent); return { main: p.major, minor: p.minor }; }
          case 'E1': { const p = H.predictE1(f.substrate); return { main: p.major, minor: p.minor }; }
          case 'Grignard': return { main: [H.grignard(f.substrate).protonolysis.D2O], minor: [] };
          case 'alcohol': return { main: [H.fromAlcohol(f.substrate, arg).product], minor: [] };
          case 'mono': return { main: H.monohalogenation(f.substrate, arg).map((x) => x.smiles), minor: [] };
          default: throw new Error('unknown mechanism ' + f.mechanism + r0);
        }
      };
      const names = fx.flatMap((f) => [f.substrateName, ...f.products, ...(f.minor || [])]);
      const op = opsin(names, tmp);
      let agree = 0;
      for (const f of fx) {
        const t = `fixture ${f.id}`;
        const flat = f.mode === 'flat';
        const key = (smi) => (flat ? flatOf(smi) : canon(smi));
        const res = attempt(() => engineOf(f));
        ok(res.ok, `${t}: the engine gives an answer (${res.reason || ''})`);
        if (!res.ok) continue;
        const sub = op[f.substrateName];
        ok(!!sub && canon(sub) === canon(f.substrate), `${t}: OPSIN reads "${f.substrateName}" as the substrate ${f.substrate} (got ${sub})`);
        const want = f.products.map((n) => op[n]);
        ok(want.every(Boolean), `${t}: OPSIN reads every product name`);
        const sortedKeys = (l) => l.map(key).sort();
        const mainOk = JSON.stringify(sortedKeys(res.v.main)) === JSON.stringify(sortedKeys(want));
        ok(mainOk, `${t}: engine ${JSON.stringify(res.v.main)} equals the names ${JSON.stringify(f.products)} (${JSON.stringify(want)})`);
        if (f.minor) {
          const wantM = f.minor.map((n) => op[n]);
          ok(JSON.stringify(sortedKeys(res.v.minor)) === JSON.stringify(sortedKeys(wantM)), `${t}: the minor product(s) ${JSON.stringify(f.minor)} equal the engine's ${JSON.stringify(res.v.minor)}`);
        } else if (['E2', 'E1'].includes(f.mechanism)) eq(res.v.minor, [], `${t}: no minor alkene`);
        // the mechanism named in the fixture is one of the mechanisms decide() gives for that reagent
        if (['SN2', 'SN1', 'E2', 'E1'].includes(f.mechanism)) {
          const d = H.decide(f.substrate, f.reagent);
          ok(d.ok && d.mechs.includes(f.mechanism), `${t}: decide(${f.substrate}, ${f.reagent}) includes ${f.mechanism} (${d.ok ? d.mechs.join('+') : d.reason})`);
        }
        if (mainOk) agree++;
      }
      console.log(`  fixture: ${agree}/${fx.length} cases agree; ${new Set(names).size} distinct names read by OPSIN`);
    }

    // ================================================================ 7. wrong answers
    const wrongFor = (pred, label) => {
      const ch = H.halideChoices(pred);
      const right = ch[0];
      const t = `choices ${label}`;
      ok(right.correct === true && right.kind === 'major' && /^Yes\./.test(right.why), `${t}: the right answer first`);
      const wrong = ch.slice(1);
      ok(wrong.length >= 3, `${t}: at least three wrong answers (${wrong.length}: ${wrong.map((w) => w.kind).join(',')})`);
      const keys = ch.map((c) => c.smiles.map((s) => canon(s)).sort().join('|'));     // exact: an enantiomer is a different answer here
      eq(new Set(keys).size, keys.length, `${t}: no two answers are the same compound`);
      ok(wrong.every((w) => w.correct === false && typeof w.why === 'string' && w.why.length > 30 && !!w.kind && w.smiles.every((s) => !!canon(s))), `${t}: each wrong answer parses and has its own why`);
      eq(new Set(wrong.map((w) => w.why)).size, wrong.length, `${t}: the whys are all different`);
      return ch;
    };
    let nChoices = 0;
    for (const h of hal) {
      for (const nu of ['CN', 'I', 'HO']) { const p = attempt(() => H.predictSN2(h.smiles, nu)); if (p.ok) { wrongFor(p.v, `SN2 ${h.id} ${nu}`); nChoices++; } }
      for (const nu of ['H2O', 'MeOH']) { const p = attempt(() => H.predictSN1(h.smiles, nu)); if (p.ok) { wrongFor(p.v, `SN1 ${h.id} ${nu}`); nChoices++; } }
      for (const b of ['KOH', 'NaOEt']) { const p = attempt(() => H.predictE2(h.smiles, b)); if (p.ok) { wrongFor(p.v, `E2 ${h.id} ${b}`); nChoices++; } }
      { const p = attempt(() => H.predictE1(h.smiles)); if (p.ok) { wrongFor(p.v, `E1 ${h.id}`); nChoices++; } }
      { const p = attempt(() => H.grignard(h.smiles)); if (p.ok) { wrongFor(p.v, `Grignard ${h.id}`); nChoices++; } }
    }
    ok(nChoices >= 150, `${nChoices} wrong-answer sets checked`);
    const kinds = (p) => H.halideChoices(p).map((c) => c.kind);
    const sn2R = H.predictSN2('CC[C@@H](C)Br', 'HO');
    ok(kinds(sn2R).includes('retention') && kinds(sn2R).includes('elim') && kinds(sn2R).includes('unchanged') && kinds(sn2R).includes('wrongNu'), 'SN2 answers: retention, elim, unchanged, wrongNu');
    eq(H.halideChoices(sn2R).find((c) => c.kind === 'retention').smiles, [canon('CC[C@@H](C)O')], 'SN2 retention answer: the mirror image at that centre only');
    const sn1 = H.predictSN1('CCC[C@](C)(Br)CC', 'H2O');
    ok(kinds(sn1).includes('oneEnantiomer') && kinds(sn1).includes('elim') && kinds(sn1).includes('unchanged'), 'SN1 answers: oneEnantiomer, elim, unchanged');
    eq(H.halideChoices(sn1)[0].smiles.length, 2, 'SN1 right answer: both enantiomers');
    const e2p = H.predictE2('CCC(C)(C)Br', 'KOH');
    ok(kinds(e2p).includes('hofmann') && kinds(e2p).includes('subst') && kinds(e2p).includes('unchanged'), 'E2 answers: hofmann (less substituted), subst, unchanged');
    ok(/less substituted alkene\. Zaitsev: the more substituted C=C is the major product/.test(H.halideChoices(e2p).find((c) => c.kind === 'hofmann').why), 'the hofmann answer uses the Zaitsev sentence');
    ok(kinds(H.predictE2('C[C@H]1CCCC[C@@H]1Br', 'KOH')).includes('notAnti'), 'E2 chair case: notAnti answer');
    eq(H.halideChoices(H.predictE2('C[C@H]1CCCC[C@@H]1Br', 'KOH')).find((c) => c.kind === 'notAnti').smiles.map(flatOf), [flatOf('CC1=CCCCC1')], 'notAnti is the Zaitsev alkene the chair rule forbids');
    const gp = H.grignard('BrC1CCCCC1');
    ok(['noD', 'alcohol', 'unchanged'].every((k) => kinds(gp).includes(k)), 'Grignard answers: noD, alcohol, unchanged');
    eq(H.halideChoices(gp)[0].smiles, [canon('[2H]C1CCCCC1')], 'Grignard + D2O right answer is the deuterio compound');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// run alone: node learn/tests/halides.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await halides({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
