// Lesson 08 checks: mechanisms stored as data (every step balances, chains, and the arrows reproduce `after`), the mechanism-player
// arrow grading, the energy-diagram logic (answers recomputed independently), the nucleophile/electrophile site table, reaction kinds
// (classification vs counts and formulas), the wrong mechanisms of the "spot the rule" step, the `mechanism-basics` generator, and the
// lesson's own steps. Run on its own with `node learn/tests/lesson08.mjs`, or as part of run.mjs.
import { ready, rdkit, canon, analyze, VALENCE, ENEG } from '../engine/chem.js';
import fs from 'node:fs';
import { LESSONS } from '../lessons/index.js';
import * as arrow from '../engine/widgets/arrow-core.js';
import { buildMolblock } from '../engine/widgets/lewis-core.js';
import * as MC from '../engine/widgets/mechanism-core.js';
import * as EC from '../engine/widgets/energy-core.js';
import * as SP from '../engine/widgets/site-picker.js';
import { WIDGETS } from '../engine/widgets/index.js';
import * as M from '../engine/mechanisms.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import { randomLevels, MECH_TASKS, makeMechProblem, MECH_SKILLS } from '../engine/generators-mech.js';
import { checkInput } from '../engine/steps.js';
import { skillLabel, skillRule } from '../engine/skills.js';
import { nameAlkeneBoth } from '../engine/naming.js';

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function htmlStrings(o, out = []) {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => htmlStrings(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => htmlStrings(x, out));
  return out;
}

// ---- independent atom / charge tally: add explicit H atoms with RDKit and count them (not the impH route used by the engine)
function tallyIndep(list) {
  const R = rdkit();
  const c = {}; let q = 0;
  for (const smi of list) {
    const m0 = R.get_mol(smi);
    const mb = m0.add_hs(); m0.delete();
    const m = R.get_mol(mb, JSON.stringify({ removeHs: false }));
    const j = JSON.parse(m.get_json()).molecules[0]; m.delete();
    j.atoms.forEach((a) => { const z = a.z ?? 6; c[z] = (c[z] || 0) + 1; q += a.chg ?? 0; });
  }
  return { c, q };
}
const balIndep = (a, b) => { const A = tallyIndep(a), B = tallyIndep(b); return A.q === B.q && JSON.stringify(Object.entries(A.c).sort()) === JSON.stringify(Object.entries(B.c).sort()); };
const Z = { H: 1, C: 6, N: 7, O: 8, F: 9, B: 5, Cl: 17, Br: 35, I: 53, P: 15, S: 16 };
/** Element counts of a written label such as (CH₃)₂C=CH₂ or HO⁻, with parentheses and subscripts. */
function labelTally(label) {
  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const body = label.replace(/[⁺⁻]$/, '');
  const q = /⁺$/.test(label) ? 1 : /⁻$/.test(label) ? -1 : 0;
  const stack = [{}];
  let i = 0;
  const readNum = () => { let n = ''; while (i < body.length && SUBD.includes(body[i])) { n += SUBD.indexOf(body[i]); i++; } return n ? Number(n) : 1; };
  while (i < body.length) {
    const ch = body[i];
    if (ch === '(') { stack.push({}); i++; }
    else if (ch === ')') { i++; const n = readNum(); const top = stack.pop(); for (const k in top) stack[stack.length - 1][k] = (stack[stack.length - 1][k] || 0) + top[k] * n; }
    else if (/[A-Z]/.test(ch)) {
      let el = ch; i++;
      if (i < body.length && /[a-z]/.test(body[i]) && Z[el + body[i]]) { el += body[i]; i++; }
      const n = readNum();
      stack[stack.length - 1][Z[el]] = (stack[stack.length - 1][Z[el]] || 0) + n;
    } else i++;
  }
  return { c: stack[0], q };
}

export async function lesson08({ ok, eq }) {
  await ready();
  const L = LESSONS.find((x) => x.id === '08');

  // ================================================================ 1. mechanisms as data
  for (const [id, mech] of Object.entries(M.MECH)) {
    const t = `mech ${id}`;
    eq(MC.checkMechanism(mech), [], `${t} passes checkMechanism`);
    ok(balIndep(mech.reactants.concat(mech.reagents || []), mech.products), `${t} reactants -> products balance (independent tally)`);
    mech.steps.forEach((st, n) => {
      const tt = `${t} step ${n + 1}`;
      ok(balIndep(st.before, st.after), `${tt} balances atoms and charge (independent tally)`);
      const cfg = MC.stepConfig(st);
      eq(arrow.validate(cfg), [], `${tt} arrows are valid for the scene`);
      ok(new Set(cfg.atoms.map((a) => a.x.toFixed(2) + ',' + a.y.toFixed(2))).size === cfg.atoms.length, `${tt} atom positions distinct`);
      // lone pairs of the scene agree with RDKit for the species in `before`
      const mine = cfg.atoms.map((a, i) => `${a.el}${arrow.lpCount(cfg.atoms, cfg.bonds, i)}`).sort();
      const ref = [];
      st.before.forEach((smi) => { analyze(smi).atoms.forEach((a) => { ref.push(`${a.sym}${a.lp}`); for (let k = 0; k < a.impH; k++) ref.push('H0'); }); });
      eq(mine, ref.sort(), `${tt} scene lone pairs match RDKit`);
      cfg.arrows.forEach((a, k) => { if (a.from.lp != null) ok(arrow.lpCount(cfg.atoms, cfg.bonds, a.from.lp) >= 1, `${tt} arrow ${k} starts on a real lone pair`); else ok(arrow.findBond(cfg.bonds, a.from.bond[0], a.from.bond[1]) >= 0, `${tt} arrow ${k} starts on a real bond`); });
      // applying the arrows gives `after`
      const res = MC.stepResult(st);
      eq(canon(buildMolblock(res)), canon(st.after.join('.')), `${tt} arrows reproduce after`);
      ok(res.atoms.every((a) => Number.isInteger(a.lp) && a.lp >= 0), `${tt} product lone pairs valid`);
      eq(MC.octetViolations(res), [], `${tt} no atom over an octet (H over 2)`);
      ok(MC.octetViolations({ atoms: cfg.atoms.map((a, i) => ({ ...a, lp: arrow.lpCount(cfg.atoms, cfg.bonds, i) })), bonds: cfg.bonds }).length === 0, `${tt} starting structures obey the octet`);
      // net charge conserved through the arrows
      eq(res.atoms.reduce((s, a) => s + a.charge, 0), cfg.atoms.reduce((s, a) => s + (a.charge || 0), 0), `${tt} charge conserved by the arrows`);
      // grading: solution, any order, learner-style drawing (pi bond -> H atom)
      ok(arrow.grade(cfg, cfg.arrows).ok, `${tt} solution graded ok`);
      ok(arrow.grade(cfg, cfg.arrows.slice().reverse()).ok, `${tt} solution ok in any order`);
      const learner = cfg.arrows.map((a) => (a.from.bond && a.to.bond && arrow.findBond(cfg.bonds, a.to.bond[0], a.to.bond[1]) < 0 ? { from: a.from, to: { atom: arrow.headAtom(cfg, a).atom } } : a));
      ok(arrow.grade(cfg, learner).ok, `${tt} learner-style drawing (bond to the atom it attacks) graded ok`);
      ok(!arrow.grade(cfg, []).ok && arrow.grade(cfg, []).code === 'empty', `${tt} empty rejected`);
      if (cfg.arrows.length > 1) { const part = arrow.grade(cfg, [cfg.arrows[0]]); ok(!part.ok && part.code === 'missing' && /You also need/.test(part.diagnosis), `${tt} missing-arrow diagnosis`); }
      // the scene is not already the answer
      ok(canon(buildMolblock({ atoms: cfg.atoms.map((a) => ({ ...a, charge: a.charge || 0 })), bonds: cfg.bonds })) === canon(st.before.join('.')), `${tt} scene is the before structure`);
    });
    // breaking a step is caught
    const broken = JSON.parse(JSON.stringify(mech));
    broken.steps[0].arrows = broken.steps[0].arrows.slice(0, 1);
    ok(MC.checkMechanism(broken).length > 0, `${t} dropping an arrow is detected`);
    const wrongAfter = JSON.parse(JSON.stringify(mech));
    wrongAfter.steps[0].after = [mech.products[0]];
    ok(MC.checkMechanism(wrongAfter).length > 0, `${t} wrong after is detected`);
  }
  // mechanism specifics
  const HCL = M.MECH['hcl-ethylene'];
  eq(HCL.steps.map((s) => s.arrows.length), [2, 1], 'HCl + ethylene: two arrows then one');
  eq(HCL.steps[0].after.map((s) => canon(s)).sort(), [canon('C[CH2+]'), canon('[Cl-]')].sort(), 'HCl + ethylene step 1 gives CH3CH2+ and Cl-');
  eq(canon(HCL.products[0]), canon('CCCl'), 'HCl + ethylene gives chloroethane');
  eq({ from: HCL.steps[0].arrows[0].from, to: HCL.steps[0].arrows[0].to }, { from: { bond: [0, 1] }, to: { bond: [0, 7] } }, 'step 1 arrow 1: pi bond to a new C-H bond');
  eq({ from: HCL.steps[0].arrows[1].from, to: HCL.steps[0].arrows[1].to }, { from: { bond: [7, 6] }, to: { atom: 6 } }, 'step 1 arrow 2: H-Cl bond onto Cl');
  {
    const cfg = MC.stepConfig(HCL.steps[0]);
    ok(cfg.atoms[7].el === 'H' && cfg.atoms[6].el === 'Cl' && cfg.atoms[0].el === 'C' && cfg.atoms[1].el === 'C', 'HCl scene atom numbers (C0 C1 ... Cl6 H7)');
    const bad1 = arrow.grade(cfg, [{ from: { bond: [0, 1] }, to: { atom: 6 } }, cfg.arrows[1]]);
    ok(!bad1.ok && bad1.code === 'dest', 'pi bond pointed at Cl is a wrong end');
    const bad2 = arrow.grade(cfg, [{ from: { lp: 6 }, to: { atom: 0 } }]);
    ok(!bad2.ok, 'a Cl lone pair attacking carbon is rejected');
    ok(/not at H⁺/.test(arrow.badStart(cfg, 7)), 'tapping the H of HCl as a start explains arrows start at electrons');
    ok(/new bond between C and H/.test(arrow.describeDest(cfg, { bond: [0, 1] }, { bond: [0, 7] })), 'new-bond destination is described as a new bond');
    const h0 = arrow.headAtom(cfg, cfg.arrows[0]);
    eq(h0, { atom: 7 }, 'head of a pi-bond-to-new-bond arrow points at the H');
    eq(arrow.headAtom(cfg, cfg.arrows[1]), { atom: 6 }, 'head of a bond-to-atom arrow is that atom');
    // the pi arrow ends at either carbon of ethylene: symmetric, both products are the same compound
    const alt = { from: { bond: [0, 1] }, to: { bond: [1, 7] } };
    eq(canon(buildMolblock(arrow.applyArrows({ ...cfg, arrows: [alt, cfg.arrows[1]] }))), canon(buildMolblock(arrow.applyArrows(cfg))), 'ethylene is symmetric: H on either carbon gives the same ions');
  }
  // HX builder: eight mechanisms, each checked, products from a hand-written table
  const HX_EXPECT = {
    'C=C': { Cl: 'CCCl', Br: 'CCBr', cation: 'C[CH2+]' },
    'C/C=C/C': { Cl: 'CCC(C)Cl', Br: 'CCC(C)Br', cation: 'CC[CH+]C' },
    'C1=CCCCC1': { Cl: 'ClC1CCCCC1', Br: 'BrC1CCCCC1', cation: '[CH+]1CCCCC1' },
    'CC(C)=C(C)C': { Cl: 'CC(C)C(C)(C)Cl', Br: 'CC(C)C(C)(C)Br', cation: 'CC(C)[C+](C)C' }
  };
  for (const al of M.HX_ALKENES) for (const X of ['Cl', 'Br']) {
    const mech = M.hxMechanism(al.smiles, X);
    const t = `hx ${al.label} + H${X}`;
    eq(MC.checkMechanism(mech), [], `${t} mechanism valid`);
    eq(canon(mech.products[0]), canon(HX_EXPECT[al.smiles][X]), `${t} product from the table`);
    ok(mech.steps[0].after.map(canon).includes(canon(HX_EXPECT[al.smiles].cation)) && mech.steps[0].after.map(canon).includes(canon(`[${X}-]`)), `${t} step 1 gives the expected carbocation and ${X}-`);
    eq(canon(al.cation), canon(HX_EXPECT[al.smiles].cation), `${t} alkene table cation`);
    ok(balIndep([al.smiles, M.HX[X].smiles], mech.products), `${t} overall balances`);
    eq(M.classifyReaction([al.smiles, M.HX[X].smiles], mech.products), 'addition', `${t} is an addition`);
  }
  for (const [k, al, X] of [['hcl-ethylene', 'C=C', 'Cl'], ['hbr-ethylene', 'C=C', 'Br'], ['hbr-butene', 'C/C=C/C', 'Br']]) {
    const built = M.hxMechanism(al, X), lit = M.MECH[k];
    eq(built.steps[0].arrows, lit.steps[0].arrows, `literal ${k} step 1 arrows equal the scene-derived ones`);
    eq(built.steps.map((s) => s.before.map(canon).sort()), lit.steps.map((s) => s.before.map(canon).sort()), `literal ${k} structures equal the scene-derived ones`);
    eq(built.steps.map((s) => s.after.map(canon).sort()), lit.steps.map((s) => s.after.map(canon).sort()), `literal ${k} results equal the scene-derived ones`);
  }

  // ================================================================ 2. energy diagrams
  {
    const lv = M.HCL_ETHYLENE_LEVELS;
    eq(EC.validate(lv), [], 'HCl/ethylene levels valid');
    eq(EC.steps(lv).map((s) => [s.eact, s.dH]), [[70, 35], [15, -75]], 'HCl/ethylene step Eact and step energy changes (step 1 is uphill to the intermediate, step 2 downhill)');
    eq(EC.overallDH(lv), -40, 'overall dH = P - R = -40');
    eq(EC.rdsStep(lv).n, 1, 'rate-determining step is step 1 (highest TS)');
    eq(EC.fastestStep(lv).n, 2, 'fastest step is step 2 (smaller Eact)');
    ok(EC.consistent(lv), 'highest TS has the biggest Eact');
    eq(EC.tsIndexes(lv), [1, 3], 'TS at B and D'); eq(EC.intermediateIndexes(lv), [2], 'intermediate at C');
    const C = M.CATALYST_LEVELS;
    eq(EC.validate(C), [], 'catalyst levels valid'); eq(EC.steps(C)[0].eact, 70, 'catalyst diagram Eact 70'); eq(EC.overallDH(C), -40, 'catalyst diagram dH -40');
    // grading of every task type, right and wrong
    const g = (task, ans) => EC.gradeTask(lv, task, ans);
    ok(g('ts', 1).ok && g('ts', 3).ok && !g('ts', 2).ok && !g('ts', 0).ok && !g('ts', 4).ok, 'ts task: peaks only');
    ok(/valley/.test(g('ts', 2).diagnosis) && /peak/.test(g('intermediate', 1).diagnosis), 'ts/intermediate diagnoses name the mix-up');
    ok(g('intermediate', 2).ok && !g('intermediate', 1).ok && !g('intermediate', 4).ok, 'intermediate task: the valley only');
    ok(g('rds', 1).ok && !g('rds', 3).ok && !g('rds', 2).ok && /lower/.test(g('rds', 3).diagnosis), 'rds task: the highest peak');
    ok(g('eact:1', 'eact1').ok && !g('eact:1', 'eact2').ok && !g('eact:1', 'dh').ok && !g('eact:1', 'rel1').ok, 'eact:1 task');
    ok(g('eact:2', 'eact2').ok && !g('eact:2', 'eact1').ok, 'eact:2 task');
    ok(g('dh', 'dh').ok && !g('dh', 'eact1').ok && !g('dh', 'rel2').ok, 'dh task');
    ok(g('dhsign', 'neg').ok && !g('dhsign', 'pos').ok && /LOWER/.test(g('dhsign', 'pos').diagnosis), 'dhsign task');
    ok(g('faster', 2).ok && !g('faster', 1).ok, 'faster task'); ok(g('nsteps', 2).ok && !g('nsteps', 1).ok, 'nsteps task');
    const br = EC.brackets(lv);
    eq(br.map((b) => b.id), ['eact1', 'rel1', 'eact2', 'rel2', 'dh'], 'bracket ids');
    eq(br.map((b) => [b.from, b.to]), [[0, 1], [1, 2], [2, 3], [3, 4], [0, 4]], 'brackets span the right levels');
    // curve passes through every level, flat at the extrema
    const pts = lv.map((l, i) => ({ x: 50 + 80 * i, y: 200 - l.E }));
    const d = EC.pathD(pts);
    const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
    ok(pts.every((p, i) => (i === 0 ? nums[0] === p.x && nums[1] === p.y : nums[2 + (i - 1) * 6 + 4] === p.x && nums[2 + (i - 1) * 6 + 5] === p.y)), 'curve passes exactly through every level');
    ok(pts.slice(1).every((p, i) => nums[2 + i * 6 + 1] === pts[i].y && nums[2 + i * 6 + 3] === p.y), 'curve has horizontal tangents at every level (peaks/valleys on their energies)');
    // catalyst grading
    const cg = (ts, p) => EC.gradeCatalyst(C, { ts, p }, { minDrop: 15 });
    ok(cg(120, 10).code === 'no-drop' && cg(125, 10).code === 'no-drop' && /raised/.test(cg(125, 10).diagnosis), 'catalyst: unchanged / raised peak rejected');
    ok(cg(100, 10).ok, 'catalyst: lowering the TS by 20 with P fixed is accepted');
    ok(cg(100, 0).code === 'moved-p' && /ΔH/.test(cg(100, 0).diagnosis), 'catalyst: moving the products is rejected (dH must stay fixed)');
    ok(cg(110, 10).code === 'no-drop', 'catalyst: a 10 kJ/mol drop is not enough when minDrop is 15');
    ok(cg(90, 10).ok && /ΔH is still −40/.test(cg(90, 10).why), 'catalyst success message states dH is unchanged');
  }
  // random levels: valid, consistent, and every computed answer re-derived independently
  {
    const rng = mulberry32(8);
    let nOne = 0, nTwo = 0;
    for (let i = 0; i < 600; i++) {
      const two = i % 2 === 0;
      const lv = randomLevels(rng, two);
      two ? nTwo++ : nOne++;
      const E = lv.map((l) => l.E);
      eq(EC.validate(lv), [], `random levels ${i} valid`);
      if (two) {
        const [R, T1, I, T2, P] = E;
        eq(EC.steps(lv).map((s) => s.eact), [T1 - R, T2 - I], `random ${i} Eact = TS - preceding minimum`);
        eq(EC.rdsStep(lv).n, T1 > T2 ? 1 : 2, `random ${i} rds = higher TS`);
        ok(EC.consistent(lv) && ((T1 - R) > (T2 - I)) === (T1 > T2), `random ${i} highest TS has the bigger Eact`);
        eq(EC.overallDH(lv), P - R, `random ${i} dH = P - R`);
      } else {
        const [R, T, P] = E;
        eq(EC.steps(lv)[0].eact, T - R, `random ${i} one-step Eact`); eq(EC.overallDH(lv), P - R, `random ${i} one-step dH`);
      }
      ok(E[E.length - 1] !== E[0], `random ${i} dH is not zero`);
    }
    ok(nOne === 300 && nTwo === 300, 'random levels cover one-step and two-step');
  }

  // ================================================================ 3. site table
  for (const id of M.siteIds) {
    const S = M.SITES[id];
    const t = `site ${id}`;
    ok(canon(S.smiles) !== null, `${t} smiles parses`);
    const rules = M.siteRules(S.smiles);
    const nAtoms = analyze(S.smiles, { keepHs: true }).atoms.length;
    for (const role of ['nuc', 'elec']) {
      if (!S[role]) continue;
      eq(S[role].atoms.slice().sort(), rules[role].filter((i) => i < nAtoms).sort(), `${t} ${role} atoms = structural rule (charge, lone pair, pi bond, electron count, electronegativity)`);
      ok(S[role].why.length > 40, `${t} ${role} has a reason`);
      const item = { id, role };
      eq(SP.solution(item), S[role].atoms, `${t} ${role} solution`);
      for (let i = 0; i < nAtoms; i++) {
        const r = SP.grade(item, i);
        ok(r.ok === S[role].atoms.includes(i), `${t} ${role}: tap ${i} graded from data`);
        ok(r.ok ? r.why === S[role].why : typeof r.diagnosis === 'string' && r.diagnosis.length > 40, `${t} ${role}: tap ${i} has ${r.ok ? 'the reason' : 'a diagnosis'}`);
      }
    }
  }
  // the exact molecules named in the brief
  eq(M.siteIds.sort(), ['acetone', 'ammonia', 'bf3', 'bromide', 'ethylcation', 'ethylene', 'hbr', 'water'].sort(), 'site table covers H2O, NH3, Br-, C=C, H-Br, carbocation, BF3, acetone');
  eq(M.SITES.water.nuc.atoms, [1], 'water: the O (atom 1 of [H]O[H])'); eq(M.SITES.hbr.elec.atoms, [0], 'H-Br: the H');
  eq(analyze('CC(=O)C').atoms[M.SITES.acetone.elec.atoms[0]].sym, 'C', 'acetone electrophile is a carbon'); eq(analyze('CC(=O)C').atoms[M.SITES.acetone.elec.atoms[0]].bondSum, 4, 'acetone electrophile has 4 bonds (the carbonyl C)');
  eq(analyze('FB(F)F').atoms[M.SITES.bf3.elec.atoms[0]].sym, 'B', 'BF3 electrophile is boron'); eq(analyze('C[CH2+]').atoms[M.SITES.ethylcation.elec.atoms[0]].fc, 1, 'carbocation electrophile carries +');
  // nucleophile / electrophile pair table
  {
    const nuc = M.NUC_ELEC.filter((x) => x.role === 'nuc'), elec = M.NUC_ELEC.filter((x) => x.role === 'elec');
    ok(nuc.length >= 6 && elec.length >= 6, 'enough nucleophiles and electrophiles for pairs');
    for (const x of M.NUC_ELEC) {
      ok(canon(x.smiles) !== null && x.reason.length > 15, `pair table ${x.label} parses, has a reason`);
      const r = M.siteRules(x.smiles);
      ok(r[x.role].length > 0, `pair table ${x.label}: structure supports the role ${x.role}`);
      if (/^[A-Z(]/.test(x.label) && !/[a-z]{3,}/.test(x.label)) {
        const lt = labelTally(x.label);
        eq(Object.entries(lt.c).sort(), Object.entries(tallyIndep([x.smiles]).c).sort(), `pair table label ${x.label} element counts match its SMILES`);
        eq(lt.q, tallyIndep([x.smiles]).q, `pair table label ${x.label} charge matches`);
      }
    }
    // negative species are nucleophiles, positive ones electrophiles (never the other way)
    ok(nuc.filter((x) => analyze(x.smiles).netCharge > 0).length === 0 && elec.filter((x) => analyze(x.smiles).netCharge < 0).length === 0, 'no cation listed as a nucleophile, no anion as an electrophile');
    ok(M.NUC_ELEC.every((x) => !(analyze(x.smiles).netCharge < 0 && x.role === 'elec')), 'anions are never electrophiles in the table');
  }

  // ================================================================ 4. reaction kinds
  {
    const kinds = {};
    for (const r of M.REACTIONS) {
      const t = `reaction ${r.id}`;
      ok(r.reactants.every((s) => canon(s)) && r.products.every((s) => canon(s)), `${t} parses`);
      ok(balIndep(r.reactants, r.products), `${t} balances atoms and charge (independent tally)`);
      const nr = r.reactants.length, np = r.products.length;
      const same = JSON.stringify(Object.entries(tallyIndep(r.reactants.slice(0, 1)).c).sort()) === JSON.stringify(Object.entries(tallyIndep(r.products.slice(0, 1)).c).sort());
      // independent rule from counts + formulas
      const expect = nr === 2 && np === 1 ? 'addition' : nr === 1 && np === 2 ? 'elimination' : nr === 2 && np === 2 ? 'substitution' : nr === 1 && np === 1 && same && canon(r.reactants[0]) !== canon(r.products[0]) ? 'rearrangement' : null;
      eq(M.kindOf(r), expect, `${t} classification from counts and formulas`);
      eq(r.kind, expect, `${t} stored kind equals the computed kind`);
      kinds[expect] = (kinds[expect] || 0) + 1;
      // the written equation matches the structures, species by species
      const [lhs, rhs] = r.eq.split(' → ').map((s) => s.split(' + '));
      eq(lhs.length, nr, `${t} eq has ${nr} reactant labels`); eq(rhs.length, np, `${t} eq has ${np} product labels`);
      lhs.concat(rhs).forEach((lab, k) => {
        const smi = (k < nr ? r.reactants : r.products)[k < nr ? k : k - nr];
        const a = labelTally(lab), b = tallyIndep([smi]);
        eq(Object.entries(a.c).sort(), Object.entries(b.c).sort(), `${t} label ${lab} element counts`);
        eq(a.q, b.q, `${t} label ${lab} charge`);
      });
      if (r.kind === 'addition') eq(JSON.stringify(Object.entries(tallyIndep(r.reactants).c).sort()), JSON.stringify(Object.entries(tallyIndep(r.products).c).sort()), `${t} addition: the product holds every atom of both reactants`);
      ok(M.kindWhy(r).length > 40, `${t} has a reason`);
    }
    ok(Object.keys(kinds).length === 4 && Object.values(kinds).every((n) => n >= 3), `pool has at least 3 of each kind (${JSON.stringify(kinds)})`);
    eq(M.classifyReaction(['C=C', 'Cl'], ['CCBr']), null, 'unbalanced equation is not classified');
    eq(M.classifyReaction(['CCO'], ['CC=O']), null, 'one reactant to one product with a different formula is not a rearrangement');
    eq(M.classifyReaction(['C=CCC'], ['C=CCC']), null, 'identical reactant and product is not a rearrangement');
    // the four reactions the learner classifies in step 2 are one of each kind
    const w = L.steps.find((s) => s.id === 's02');
    eq(w.moves.map((m) => m.options.find((o) => o.correct).text.toLowerCase()).sort(), ['addition', 'elimination', 'rearrangement', 'substitution'], 'step 2: one reaction of each kind');
    w.moves.forEach((m, i) => {
      const r = M.REACTIONS.find((x) => JSON.stringify(x.reactants) === JSON.stringify(m.equation.reactants) && JSON.stringify(x.products) === JSON.stringify(m.equation.products));
      ok(!!r, `step 2 move ${i} is a pool reaction`);
      eq(m.options.find((o) => o.correct).text.toLowerCase(), M.kindOf(r), `step 2 move ${i} correct option = computed kind`);
      ok(m.options.every((o) => o.why.length > 20), `step 2 move ${i} every option explains itself`);
    });
    ok(M.REACTIONS.some((r) => r.id === 'hcl-ethylene') && M.kindOf(M.REACTION['hcl-ethylene']) === 'addition', 'HCl + ethylene is an addition');
  }

  // ================================================================ 5. the wrong mechanisms of step 8
  {
    const A = M.RULE_CASES.fromProton;
    ok(arrow.validate({ atoms: A.atoms, bonds: A.bonds, arrows: A.arrows }).length > 0, 'case 1: arrow-core rejects an arrow that starts at an atom');
    eq([arrow.lpCount(A.atoms, A.bonds, 4), arrow.bondOrderSum(A.atoms, A.bonds, 4)], [0, 0], 'case 1: H+ has no lone pair and no bond, so no electrons');
    eq(analyze('[H+]').atoms[0].electrons, 0, 'case 1: RDKit agrees H+ has 0 electrons');
    ok(/not at H⁺/.test(arrow.badStart({ atoms: A.atoms, bonds: A.bonds, arrows: [] }, 4)), 'case 1: the widget message for tapping H+');
    const B = M.RULE_CASES.fiveBonds;
    eq(arrow.validate({ atoms: B.atoms, bonds: B.bonds, arrows: B.arrows }), [], 'case 2: the one arrow is itself a legal arrow');
    const prod = arrow.applyArrows({ atoms: B.atoms, bonds: B.bonds, arrows: B.arrows });
    eq(arrow.bondOrderSum(prod.atoms, prod.bonds, 2), 5, 'case 2: carbon ends with five bonds');
    ok(MC.octetViolations(prod).some((o) => o.el === 'C' && o.electrons === 10), 'case 2: carbon has ten electrons');
    eq(prod.atoms.reduce((s, a) => s + a.charge, 0), -1, 'case 2: charge is still conserved (-1), so the error is the octet');
    const full = arrow.applyArrows({ atoms: B.atoms, bonds: B.bonds, arrows: [...B.arrows, { from: { bond: [2, 6] }, to: { atom: 6 } }] });
    eq(canon(buildMolblock(full)), canon('CO.[Cl-]'), 'case 2: adding the second arrow (C-Cl to Cl) gives methanol + chloride, which is right');
    eq(MC.octetViolations(full), [], 'case 2: with the second arrow no octet is exceeded');
    const C = M.RULE_CASES.lostCharge;
    eq(arrow.validate({ atoms: C.atoms, bonds: C.bonds, arrows: C.arrows }), [], 'case 3: both arrows are legal');
    eq(canon(buildMolblock(arrow.applyArrows({ atoms: C.atoms, bonds: C.bonds, arrows: C.arrows }))), canon('O.[Cl-]'), 'case 3: the arrows really give H2O + Cl-');
    const ta = tallyIndep(C.reactants), tb = tallyIndep(C.studentProducts);
    eq(ta.c, tb.c, 'case 3: the student’s products keep every atom'); ok(ta.q !== tb.q, `case 3: but the charge is not conserved (${ta.q} vs ${tb.q})`);
    eq(arrow.lpCount(C.atoms, C.bonds, 0), 3, 'case 3: hydroxide O has 3 lone pairs');
    // each case has the right correct option in the lesson
    const w = L.steps.find((s) => s.id === 's08');
    eq(w.moves.length, 3, 'step 8 has three wrong mechanisms');
    w.moves.forEach((m, i) => { ok(m.visual && htmlStrings(m.visual).length > 0, `step 8 move ${i} shows the wrong mechanism`); ok(m.options.filter((o) => o.correct).length === 1 && m.options.length === 4, `step 8 move ${i} has 4 options, one right`); });
    ok(/H⁺/.test(w.moves[0].options.find((o) => o.correct).text) && /five bonds/.test(w.moves[1].options.find((o) => o.correct).text) && /Charge is not conserved/.test(w.moves[2].options.find((o) => o.correct).text), 'step 8: the three rules are arrow-from-H+, a five-bond carbon, charge not conserved');
  }

  // ================================================================ 6. mechanism-basics generator
  {
    ok(GENERATORS['mechanism-basics'] === true, 'generator registered');
    for (const sk of ['reaction-types', 'nuc-elec', 'energy-diagram', 'mechanism']) eq(generatorForSkill(sk), 'mechanism-basics', `Practise ${sk} uses mechanism-basics`);
    eq(generatorForSkill('curved-arrows'), 'acid-base', 'curved-arrows practice is still the Lesson 03 generator');
    for (const sk of MECH_SKILLS) ok(skillLabel(sk) !== sk && skillRule(sk).length > 40, `skill ${sk} has a label and a rule`);
    ok(skillLabel('mechanism') !== 'mechanism', 'mechanism skill has a label');
    const rng = mulberry32(2024);
    const seenKinds = new Set(), seenSkills = new Set(), seenTasks = new Set();
    let total = 0;
    for (const task of MECH_TASKS) {
      for (let i = 0; i < 25; i++) {
        const p = makeMechProblem(rng, task);
        total++; seenTasks.add(task); seenSkills.add(p.skill);
        const t = `gen ${task} #${i}`;
        ok(p.hints.length === 2 && p.hints.every((h) => h.length > 15) && p.derive.length > 20, `${t} two hints and a worked answer`);
        if (p.kind === 'choice') {
          ok(p.options.filter((o) => o.correct).length === 1 && p.options.every((o) => o.why.length > 15), `${t} one correct option, every option explains itself`);
          ok(p.answer === p.options.find((o) => o.correct).text, `${t} answer is the correct option`);
        }
        if (task === 'classify') {
          const r = M.REACTIONS.find((x) => JSON.stringify(x.reactants) === JSON.stringify(p.equation.reactants) && JSON.stringify(x.products) === JSON.stringify(p.equation.products));
          const kind = M.classifyReaction(r.reactants, r.products);
          eq(p.options.find((o) => o.correct).val, kind, `${t} correct kind recomputed from counts and formulas`);
          eq(r.kind, kind, `${t} stored kind agrees`);
          eq(p.options.map((o) => o.val).sort(), ['addition', 'elimination', 'rearrangement', 'substitution'], `${t} offers all four kinds`);
          seenKinds.add(kind);
        }
        if (task === 'nucelec') {
          const right = p.options.find((o) => o.correct), wrong = p.options.find((o) => !o.correct);
          const word = /nucleophile\?$/.test(p.prompt) ? 'nuc' : 'elec';
          const re = M.NUC_ELEC.find((x) => x.label === right.text), we = M.NUC_ELEC.find((x) => x.label === wrong.text);
          ok(re.role === word && we.role !== word, `${t} the right option has the asked role in the table`);
          ok(M.siteRules(re.smiles)[word].length > 0, `${t} structure supports the answer`);
        }
        if (p.visual) {
          const lv = p.visual.config.levels;
          eq(EC.validate(lv), [], `${t} diagram valid`);
          const st = EC.steps(lv);
          if (task === 'dh') eq(p.answer, lv[lv.length - 1].E - lv[0].E, `${t} dH = P - R`);
          if (task === 'eact') { const n = Number((/step (\d)/.exec(p.prompt) || [0, 1])[1]); eq(p.answer, lv[st[n - 1].ts].E - lv[st[n - 1].from].E, `${t} Eact = TS - the level the step starts from`); }
          if (task === 'rds') { const top = Math.max(...lv.filter((l) => l.kind === 'TS').map((l) => l.E)); const n = lv.filter((l) => l.kind === 'TS').findIndex((l) => l.E === top) + 1; eq(p.answer, `Step ${n}`, `${t} rds = the highest TS`); }
          if (task === 'sign') eq(p.answer.startsWith('Exo'), lv[lv.length - 1].E < lv[0].E, `${t} exothermic iff products lower`);
          if (task === 'count') eq(p.answer, lv.filter((l) => l.kind === 'I').length, `${t} intermediates = valleys between peaks`);
          ok(p.visual.config.mode === 'view' && p.visual.config.showValues === true, `${t} diagram shows the values`);
        }
        if (p.kind === 'input') {
          const stp = { answer: p.answer, diagnose: p.wrong, fallback: p.derive, skill: p.skill };
          ok(checkInput(stp, String(p.answer)).ok, `${t} accepts the answer`);
          ok(checkInput(stp, String(p.answer).replace('-', '−')).ok, `${t} accepts a unicode minus`);
          (p.wrong || []).forEach((w) => { const r = checkInput(stp, String(w.match)); ok(!r.ok && r.diagnosis === w.why, `${t} wrong ${w.match} routes to its reason`); });
          ok(!checkInput(stp, '9999').ok, `${t} rejects 9999 with a diagnosis`);
        }
        if (p.kind === 'arrows') {
          const c = p.config;
          eq(arrow.validate(c), [], `${t} arrows valid`);
          ok(arrow.grade(c, c.arrows).ok && !arrow.grade(c, []).ok, `${t} solution graded ok, empty rejected`);
          const st = arrow.applyArrows(c);
          eq(canon(buildMolblock(st)), canon(c.products.join('.')), `${t} arrows produce the products`);
          eq(MC.octetViolations(st), [], `${t} no octet exceeded`);
          ok(new Set(c.atoms.map((a) => a.x.toFixed(2) + ',' + a.y.toFixed(2))).size === c.atoms.length, `${t} atom positions distinct`);
          if (task === 'hx1' || task === 'hx2') ok(p.promptHtml && p.promptHtml.length > 20, `${t} has an html prompt`);
        }
      }
    }
    eq([...seenKinds].sort(), ['addition', 'elimination', 'rearrangement', 'substitution'], 'classify generator reaches all four kinds');
    ok(seenTasks.size === MECH_TASKS.length && ['reaction-types', 'nuc-elec', 'energy-diagram', 'mechanism', 'curved-arrows'].every((s) => seenSkills.has(s)), 'every task and skill is generated');
    // fresh each run: generate() with the default RNG and with a skill
    const a = generate('mechanism-basics', 30).map((p) => p.prompt + JSON.stringify(p.visual || p.equation || p.config?.arrows || ''));
    ok(new Set(a).size >= 12, `generator varies (${new Set(a).size} distinct of 30)`);
    for (const sk of MECH_SKILLS) ok(generate('mechanism-basics', 8, { skill: sk }).every((p) => p.skill === sk || (sk === 'mechanism' && p.skill === 'mechanism')), `skill filter ${sk}`);
    ok(total === MECH_TASKS.length * 25, `generated ${total} problems`);
  }

  // ================================================================ 7. the lesson
  {
    const t = 'L08';
    ok(L && L.id === '08' && L.slug === 'mechanisms', `${t} registered`);
    ok(L.steps.length >= 15 && L.steps.length <= 18, `${t} has 15-18 steps (${L.steps.length})`);
    ok(L.minutes >= 25 && L.minutes <= 30, `${t} 25-30 minutes`);
    ok(L.drawing === 'skeletal' && L.chapter === 3, `${t} skeletal drawing, chapter 3`);
    eq(L.sections, ['3.5', '3.6', '3.7', '3.8', '3.9'], `${t} sections`);
    eq(L.mastery, { count: 3, generator: 'mechanism-basics' }, `${t} mastery`);
    ok(L.steps[0].type === 'predict' && L.steps.findIndex((s) => s.type === 'explain') > 1, `${t} acts before it explains`);
    ok(L.steps.filter((s) => s.type === 'explain').every((s, k, arr) => L.steps.indexOf(s) > 3), `${t} explain cards come after the learner has acted`);
    eq(L.useIt.book, ['3.11', '3.12', '3.13', '3.14', '3.15', '3.16', '3.17', '3.18', '3.19', '3.22', '3.23', '3.24', '3.25', '3.26', '3.27', '3.28', '3.46', '3.47', '3.48', '3.49', '3.50', '3.51', '3.55', '3.56', '3.57', '3.58', '3.59', '3.60'], `${t} book problems`);
    ok(L.useIt.endFrom === 20, `${t} end-of-chapter exercises start at 3.20`);
    try {
      const txt = fs.readFileSync('/tmp/claude-0/-home-user-Organic-Chem/cf94e48a-a808-537f-854f-a886a3dca214/scratchpad/book/ch3.txt', 'utf8');
      const nums = new Set([...txt.matchAll(/^3\.(\d+) /gm)].map((m) => Number(m[1])));
      const inChap = [...txt.matchAll(/^Problem 3\.(\d+)$/gm)].map((m) => Number(m[1]));
      for (const b of L.useIt.book) { const n = Number(b.split('.')[1]); ok(n >= 20 ? nums.has(n) : inChap.includes(n), `${t} book problem ${b} exists in the chapter text`); }
      ok(/Classify the following reactions as additions/.test(txt) && /^3\.51 Consider the energy diagram/m.test(txt) && /^3\.46 If a reaction has Eact/m.test(txt), `${t} spot check: 3.11 classify, 3.46/3.51 energy diagrams`);
    } catch (e) { /* the book text is not part of the repo; skip when it is absent */ }
    // widgets used and reachable
    const by = (w) => L.steps.filter((s) => s.widget === w);
    eq(by('site-picker').length, 2, `${t} two site-picker rounds (nucleophiles, electrophiles)`);
    eq(by('mechanism-player').map((s) => s.config.mode), ['draw', 'watch'], `${t} one drawn mechanism, one watched`);
    eq(by('energy-diagram').map((s) => s.config.mode), ['tasks', 'tasks', 'catalyst'], `${t} energy-diagram: two task rounds and the catalyst mode`);
    ok(L.steps.some((s) => s.visual && s.visual.widget === 'energy-diagram' && s.visual.config.mode === 'view'), `${t} a read-only diagram step`);
    for (const w of ['mechanism-player', 'energy-diagram', 'site-picker', 'arrow-draw']) ok(WIDGETS[w] && typeof WIDGETS[w].mount === 'function', `widget ${w} registered`);
    // site pickers
    const sites = by('site-picker').flatMap((s) => s.config.items);
    eq(sites.map((i) => i.id), ['water', 'ammonia', 'bromide', 'ethylene', 'hbr', 'ethylcation', 'bf3', 'acetone'], `${t} the eight molecules of the brief`);
    eq(sites.map((i) => i.role), ['nuc', 'nuc', 'nuc', 'nuc', 'elec', 'elec', 'elec', 'elec'], `${t} roles`);
    sites.forEach((i) => ok(M.SITES[i.id][i.role], `${t} site item ${i.id}/${i.role} has data`));
    // (e) the HCl + ethylene mechanism: both steps drawn, arrows graded against the data
    const s10 = L.steps.find((s) => s.id === 's10');
    ok(s10.config.mech === M.MECH['hcl-ethylene'] && s10.config.mode === 'draw', `${t} s10 draws the HCl + ethylene mechanism`);
    eq(MC.checkMechanism(s10.config.mech), [], `${t} s10 mechanism valid`);
    ok(balIndep(s10.reaction.reactants, s10.reaction.products), `${t} s10 reaction balances`);
    const s17 = L.steps.find((s) => s.id === 's17');
    ok(s17.config.mech === M.MECH['hbr-butene'] && s17.config.mode === 'watch' && MC.checkMechanism(s17.config.mech).length === 0, `${t} s17 watches HBr + but-2-ene`);
    // (f) energy diagram steps use the HCl levels and every task is gradeable with a right answer
    const okAnswer = (lv, task) => {
      const n = task.split(':')[0];
      return n === 'ts' ? EC.tsIndexes(lv)[0] : n === 'intermediate' ? EC.intermediateIndexes(lv)[0] : n === 'rds' ? EC.rdsStep(lv).ts : n === 'eact' ? 'eact' + task.split(':')[1] : n === 'dh' ? 'dh' : n === 'dhsign' ? (EC.overallDH(lv) < 0 ? 'neg' : 'pos') : n === 'faster' ? EC.fastestStep(lv).n : EC.steps(lv).length;
    };
    for (const s of by('energy-diagram').filter((x) => x.config.mode === 'tasks')) {
      eq(EC.validate(s.config.levels), [], `${t} ${s.id} levels valid`);
      for (const task of s.config.tasks) ok(EC.gradeTask(s.config.levels, task, okAnswer(s.config.levels, task)).ok, `${t} ${s.id} task ${task} is solvable from the data`);
    }
    eq([...by('energy-diagram')[0].config.tasks, ...by('energy-diagram')[1].config.tasks], ['ts', 'intermediate', 'eact:1', 'dh', 'dhsign', 'rds'], `${t} energy tasks: TS vs intermediate, Eact, dH sign, the rate-determining step`);
    const lv = M.HCL_ETHYLENE_LEVELS, st = EC.steps(lv);
    const s12 = L.steps.find((s) => s.id === 's12'), s13 = L.steps.find((s) => s.id === 's13'), s14 = L.steps.find((s) => s.id === 's14'), s15 = L.steps.find((s) => s.id === 's15');
    ok(s12.worked.includes(String(st[0].eact)) && s12.worked.includes('−40') && s12.worked.includes(String(lv[1].E - lv[0].E)), `${t} s12 worked answer quotes the computed Eact and dH`);
    ok(s13.prompt.includes(String(st[0].eact)) && s13.prompt.includes(String(st[1].eact)) && s13.worked.includes(String(st[0].eact)), `${t} s13 quotes Eact of both steps`);
    ok(s14.prompt.includes(String(EC.steps(M.CATALYST_LEVELS)[0].eact)) && s14.prompt.includes('−40'), `${t} s14 quotes the catalyst diagram’s Eact and dH`);
    // (g) catalyst: the worked answer is itself accepted by the grader
    ok(EC.gradeCatalyst(s15.config.levels, { ts: 90, p: s15.config.levels[2].E }, s15.config.catalyst).ok, `${t} s15 worked answer (TS at 90, products fixed) is accepted`);
    ok(!EC.gradeCatalyst(s15.config.levels, { ts: 90, p: 0 }, s15.config.catalyst).ok, `${t} s15 moving the products fails`);
    ok(/70 to 40/.test(s15.worked), `${t} s15 worked states Eact 70 -> 40 for a TS at 90 (120 - 90 = 30)`);
    // (h) worked HBr example: figures are the mechanism's own species
    const w16 = L.steps.find((s) => s.id === 's16');
    eq(w16.moves.length, 5, `${t} s16 has five predicted moves`);
    const fig = (i) => canon(w16.moves[i].figure.smiles);
    eq(fig(1), canon(M.MECH['hbr-ethylene'].steps[0].after[0]), `${t} s16 carbocation figure is step 1's cation`);
    eq(fig(2), canon(M.MECH['hbr-ethylene'].products[0]), `${t} s16 product figure is bromoethane`);
    eq(fig(3), canon(M.MECH['hbr-butene'].steps[0].after[0]), `${t} s16 but-2-ene carbocation figure`);
    eq(fig(4), canon(M.MECH['hbr-butene'].products[0]), `${t} s16 but-2-ene product figure`);
    eq(M.MECH['hbr-butene'].products[0], 'CCC(C)Br', `${t} 2-bromobutane`);
    // names: both IUPAC styles through <name new old>, checked with the naming engine
    const tags = htmlStrings(L.steps).flatMap((x) => [...x.matchAll(/<name new="([^"]*)" old="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    ok(tags.length >= 1, `${t} uses <name new old> for style-dependent names (${tags.length})`);
    for (const [n, o] of tags) { const e = nameAlkeneBoth('CC=CC'); ok(e.new === n && e.old === o, `${t} name tag ${n} / ${o} equals the naming engine`); }
    // every smiles in text parses; inline SVG pictures are well-formed
    for (const str of htmlStrings(L.steps)) {
      for (const m of str.matchAll(/smiles="([^"]+)"/g)) ok(canon(m[1]) !== null, `${t} smiles ${m[1]} parses`);
      const open = (str.match(/<svg\b/g) || []).length, close = (str.match(/<\/svg>/g) || []).length;
      ok(open === close, `${t} inline SVG tags balance`);
    }
    for (const s of L.steps) {
      for (const f of [].concat(s.equation || [], s.moves ? s.moves.map((m) => m.equation).filter(Boolean) : [])) ok([...f.reactants, ...f.products].every((x) => canon(x)), `${t} ${s.id} equation smiles parse`);
      for (const m of s.moves || []) if (m.figure) ok(canon(m.figure.smiles), `${t} ${s.id} figure parses`);
    }
    // skills in the step list
    const skills = new Set(L.steps.map((s) => s.skill));
    for (const k of ['reaction-types', 'nuc-elec', 'energy-diagram', 'mechanism', 'curved-arrows']) ok(skills.has(k), `${t} trains ${k}`);
    // chemistry words that must not drift: catalyst keeps dH, TS cannot be isolated, intermediate is a minimum
    const prose = htmlStrings(L.steps).join(' ').replace(/<[^>]+>/g, ' ');
    ok(/catalyst/.test(prose) && /ΔH/.test(prose) && /cannot be isolated/.test(prose), `${t} covers catalysts, dH`);
    ok(/rate-determining/.test(prose) && /homolytic/.test(prose) && /heterolytic/.test(prose) && /fishhook/.test(prose) && /nucleophile/.test(prose) && /electrophile/.test(prose), `${t} covers rds, homolytic/heterolytic, nucleophile/electrophile`);
  }
}

// run alone: node learn/tests/lesson08.mjs
if (process.argv[1] && process.argv[1].endsWith('lesson08.mjs')) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await lesson08({ ok, eq });
  console.log(`${pass} checks passed, ${fail} failed`);
  failures.slice(0, 40).forEach((f) => console.log(' FAIL ' + f));
  if (fail) process.exit(1);
}
