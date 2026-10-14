// node learn/tests/run.mjs  - validates every lesson, generator and widget target.
import { LESSONS, PLANNED } from '../lessons/index.js';
import { ready, rdkit, canon, analyze, VALENCE, ENEG, groupCount, hybridOf, sigmaPi, bondClass } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import { SHAPE_POOL, bondTypes } from '../engine/generators-shape.js';
import * as pm from '../engine/widgets/polarity-mark.js';
import { generate, generatorForSkill, POOL, formula } from '../engine/generators.js';
import { solutionState, initialState, evaluate, buildMolblock, bondOrderSum } from '../engine/widgets/lewis-core.js';
import { grade as stripGrade, expected as stripExpected } from '../engine/widgets/valence-strip.js';
import { modelAngle } from '../engine/widgets/model3d.js';
import models from '../data/3d/models.js';
import { checkInput } from '../engine/steps.js';
import * as store from '../engine/store.js';
import { ACIDS, ACID, reaction, deprotonate, protonate, conjugateBase, labelCounts, lewisRole, strongerAcid, weakerAcid } from '../engine/acidbase.js';
import * as arrow from '../engine/widgets/arrow-core.js';
import * as eqw from '../engine/widgets/equilibrium-arrow.js';
import { ARROW_BASES, ARROW_ACIDS, arrowScene, LEWIS_POOL } from '../engine/generators-acid.js';

const TAXONOMY = new Set(['valence-electrons', 'bond-count', 'lone-pairs', 'octet', 'multiple-bonds', 'formal-charge', 'electron-count-total', 'hybridization', 'sigma-pi', 'polarity', 'conjugate-pairs', 'lewis-acid-base', 'pka-direction', 'curved-arrows', 'skeletal', 'functional-groups', 'naming', 'conformations', 'chairs', 'ez', 'mechanism', 'markovnikov', 'stereo-addition', 'resonance', 'eas', 'directors', 'synthesis', 'chirality', 'rs', 'stereo-relationships']);
/** Largest distance of any atom from the best-fit plane (smallest-variance direction) of a molblock. */
function planarity(mb) {
  const lines = mb.split('\n'); const n = parseInt(lines[3].slice(0, 3), 10);
  const P = Array.from({ length: n }, (_, i) => [0, 10, 20].map((o) => parseFloat(lines[4 + i].slice(o, o + 10))));
  const c = [0, 1, 2].map((k) => P.reduce((s, p) => s + p[k], 0) / n);
  const Q = P.map((p) => p.map((v, k) => v - c[k]));
  // plane normal = cross of the two longest-spread directions: use brute-force over atom triples, keep best
  let best = Infinity;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    const u = Q[j].map((v, t) => v - Q[i][t]), w = Q[k].map((v, t) => v - Q[i][t]);
    const nrm = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const len = Math.hypot(...nrm); if (len < 1e-6) continue;
    const dev = Math.max(...Q.map((q) => Math.abs(q.reduce((s, v, t) => s + v * nrm[t], 0) / len - Q[i].reduce((s, v, t) => s + v * nrm[t], 0) / len)));
    best = Math.min(best, dev);
  }
  return best;
}

const TYPES = new Set(['predict', 'choice', 'input', 'try', 'worked', 'explain']);
const GRADED = new Set(['choice', 'input', 'try']);

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; failures.push(msg); } }
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);

await ready();

/** Independent recompute of a derived quantity from SMILES. */
/** sigma/pi via a different route: add explicit H atoms, then every bond is one sigma and extra order is pi. */
function sigmaPiIndependent(smi) {
  const R = rdkit();
  const m0 = R.get_mol(smi);
  const mb = m0.add_hs(); m0.delete();
  const m = R.get_mol(mb, JSON.stringify({ removeHs: false }));
  const j = JSON.parse(m.get_json()).molecules[0]; m.delete();
  return { sigma: j.bonds.length, pi: j.bonds.reduce((t, b) => t + ((b.bo ?? 1) - 1), 0) };
}

function recompute(d) {
  if (d.quantity === 'strongerAcid') return d.ids.reduce((b, i) => (ACID[i].pka < ACID[b].pka ? i : b));
  if (d.quantity === 'weakestAcid') return d.ids.reduce((b, i) => (ACID[i].pka > ACID[b].pka ? i : b));
  if (d.quantity === 'pka') return ACID[d.id].pka;
  if (d.quantity === 'pkaFromExp') return -d.exp;
  if (d.quantity === 'favoured') { const l = ACID[d.a].pka, r = ACID[d.b].pka; return r > l ? 'right' : 'left'; }
  if (d.quantity === 'deprotonates') { const ok1 = d.ids.filter((i) => ACID[i].pka < ACID[d.base].pka); if (ok1.length !== 1) throw new Error('deprotonates needs exactly one'); return ok1[0]; }
  if (d.quantity === 'lewis') { const r = lewisRole(analyze(d.smiles)); return r; }
  if (d.quantity === 'moreEN') return ENEG[d.a] > ENEG[d.b] ? d.a : d.b;
  if (d.quantity === 'valence') return VALENCE[d.element];
  if (d.quantity === 'bonds') return d.element === 'H' ? 1 : 8 - VALENCE[d.element];
  const info = analyze(d.smiles);
  if (d.quantity === 'total') return info.totalValence;
  if (d.quantity === 'sigma') return sigmaPiIndependent(d.smiles).sigma;
  if (d.quantity === 'pi') return sigmaPiIndependent(d.smiles).pi;
  if (d.quantity === 'groups') return groupCount(info.atoms[d.atom]);
  if (d.quantity === 'hyb') return hybridOf(info.atoms[d.atom]);
  if (d.quantity === 'angle') return { sp3: 109.5, sp2: 120, sp: 180 }[hybridOf(info.atoms[d.atom])];
  const a = info.atoms[d.atom];
  if (d.quantity === 'fc') return a.fc;
  if (d.quantity === 'lp') return a.lp;
  throw new Error('quantity ' + d.quantity);
}

function htmlStrings(o, out = []) {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => htmlStrings(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => htmlStrings(x, out));
  return out;
}
const words = (html) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

ok(PLANNED.length === 13 && PLANNED[0].id === '04' && PLANNED[12].id === '16', 'placeholders 04-16');
ok(LESSONS.length === 3 && LESSONS[1].id === '02' && LESSONS[2].id === '03', 'lessons 01-03 registered and unlocked');

for (const L of LESSONS) {
  const tag = `L${L.id}`;
  // ---- schema
  for (const k of ['id', 'slug', 'title', 'minutes', 'chapter', 'sections', 'goals', 'steps', 'mastery', 'useIt']) ok(L[k] != null, `${tag} has ${k}`);
  ok(L.goals.length >= 2 && L.goals.length <= 4, `${tag} 2-4 goals`);
  ok(L.mastery.count === 3 && typeof L.mastery.generator === 'string', `${tag} mastery cfg`);
  ok(L.useIt.book.every((x) => /^\d+\.\d+$/.test(x)), `${tag} useIt numbers only`);
  const ids = new Set();
  for (const s of L.steps) {
    const t = `${tag}/${s.id}`;
    ok(s.id && !ids.has(s.id), `${t} unique id`); ids.add(s.id);
    ok(TYPES.has(s.type), `${t} type ${s.type}`);
    ok(s.skill && TAXONOMY.has(s.skill), `${t} skill tag ${s.skill}`);
    // smiles parse
    for (const str of htmlStrings(s)) for (const m of str.matchAll(/smiles="([^"]+)"/g)) ok(canon(m[1]) !== null, `${t} <mol> smiles ${m[1]} parses`);
    for (const o of s.options || []) if (o.smiles) ok(canon(o.smiles) !== null, `${t} option smiles ${o.smiles} parses`);
    if (s.config && s.config.target) ok(canon(s.config.target) !== null, `${t} target parses`);
    if (s.derive && s.derive.smiles) ok(canon(s.derive.smiles) !== null, `${t} derive smiles parses`);
    if (s.visual) ok(s.visual.widget === 'model3d' && models[s.visual.config.mol], `${t} visual model exists`);
    // options
    if (s.type === 'predict' || s.type === 'choice') {
      ok(s.options.filter((o) => o.correct).length === 1, `${t} exactly one correct option`);
      ok(s.options.every((o) => typeof o.why === 'string' && o.why.trim().length > 3), `${t} every option has why`);
      ok(s.options.every((o) => o.text || o.smiles), `${t} options have content`);
    }
    if (s.type === 'predict') ok(s.reveal && s.reveal.length > 10, `${t} reveal`);
    if (GRADED.has(s.type)) {
      ok(Array.isArray(s.hints) && s.hints.length === 2 && s.hints.every((x) => x.length > 5), `${t} 2 hints`);
      ok(typeof s.worked === 'string' && s.worked.length > 5, `${t} worked`);
    }
    if (s.type === 'explain') ok(words(s.html) <= 80, `${t} explain <= 80 words (${words(s.html)})`);
    if (s.type === 'worked') {
      ok(s.moves.length >= 2, `${t} moves`);
      s.moves.forEach((m, i) => {
        ok(m.options.filter((o) => o.correct).length === 1, `${t} move ${i} one correct`);
        ok(m.options.every((o) => o.why && o.why.length > 3), `${t} move ${i} whys`);
      });
      ok(s.rule, `${t} rule`);
    }
    // derived answers
    if (s.derive && s.derive.quantity) {
      const val = recompute(s.derive);
      if (s.type === 'input') ok(s.answer === val, `${t} input answer ${s.answer} == recomputed ${val}`);
      if ((s.type === 'predict' || s.type === 'choice') && s.options.some((o) => o.val !== undefined)) {
        ok(s.options.find((o) => o.correct).val === val, `${t} correct option val ${s.options.find((o) => o.correct).val} == recomputed ${val}`);
        if (s.derive.value !== undefined) ok(s.derive.value === val, `${t} derive.value ${s.derive.value} == recomputed ${val}`);
      } else if (s.type === 'predict') ok(s.options.find((o) => o.correct).text === String(s.derive.value) && s.derive.value === val, `${t} predict answer recomputed (${val})`);
    }
    if (s.visual && s.visual.config.compare) ok(models[s.visual.config.compare], `${t} compare model exists`);
    if (s.type === 'worked') s.moves.forEach((m, i) => {
      if (!m.check) return;
      const val = recompute(m.check);
      ok(m.options.find((o) => o.correct).val === val, `${t} move ${i} correct val ${m.options.find((o) => o.correct).val} == recomputed ${val}`);
    });
    if (s.type === 'try' && s.widget === 'polarity-mark') {
      const c = s.config;
      ok(!pm.grade(c, c.bonds.map(() => null)).ok, `${t} polarity empty is not ok`);
      const sol = pm.solution(c);
      ok(pm.grade(c, sol).ok, `${t} polarity solution accepted`);
      ok(sol.every((x, i) => pm.grade(c, sol.map((y, k) => (k === i ? (x === 'a' ? 'b' : x === 'b' ? 'a' : 'a') : y))).ok === false), `${t} polarity wrong picks rejected`);
      pm.expected(c).forEach((e) => ok(e.answer === 'none' ? e.diff < 0.5 : (e.answer === 'a' ? ENEG[e.A] > ENEG[e.B] : ENEG[e.B] > ENEG[e.A]), `${t} polarity answer from EN table (${e.A}-${e.B})`));
      if (s.id === 's16') eq(sol, ['b', 'a', 'none'], `${t} methanol polarity C-O, O-H, C-H`);
    }
    if (s.type === 'input') {
      ok(checkInput(s, String(s.answer)).ok, `${t} accepts answer`);
      (s.accept || []).forEach((a) => ok(checkInput(s, a).ok, `${t} accepts ${a}`));
      ok(checkInput(s, '').empty === true, `${t} empty input handled`);
      (s.diagnose || []).forEach((d) => {
        ok(!checkInput(s, String(d.match)).ok, `${t} diagnose ${d.match} is wrong`);
        ok(checkInput(s, String(d.match)).diagnosis === d.why, `${t} diagnose ${d.match} routes to its why`);
      });
      ok(!checkInput(s, '999').ok && checkInput(s, '999').diagnosis.length > 5, `${t} fallback diagnosis`);
    }
    // widgets
    if (s.type === 'try' && s.widget === 'valence-strip') {
      eq(stripExpected(s.config), s.config.elements.map((e) => VALENCE[e]), `${t} strip expected`);
      eq(stripExpected(s.config), [1, 4, 5, 6, 7, 7], `${t} strip is H C N O F Cl`);
      ok(stripGrade(s.config, ['1', '4', '5', '6', '7', '7']).ok, `${t} strip accepts correct`);
      const bad = stripGrade(s.config, ['1', '4', '5', '8', '7', '7']);
      ok(!bad.ok && bad.wrong[0] === 3 && /group number/.test(bad.diagnosis), `${t} strip flags wrong cell`);
    }
    if (s.type === 'try' && s.widget === 'lewis-builder') {
      const c = s.config;
      const init = initialState(c);
      ok(!evaluate(init, c).ok, `${t} initial state is not already correct`);
      const sol = solutionState(c);
      const r = evaluate(sol, c);
      ok(r.ok, `${t} solution reaches target via molblock path (${r.diagnosis})`);
      ok(canon(buildMolblock(sol)) === canon(c.target), `${t} molblock canon == target canon`);
      // lone pairs / charges in solution match RDKit's numbers for the target
      const info = analyze(c.target);
      const mine = sol.atoms.map((a, i) => ({ el: a.el, lp: a.lp, chg: a.charge, bo: bondOrderSum(sol, i) })).filter((a) => a.el !== 'H').map((a) => `${a.el}${a.lp}${a.chg}${a.bo}`).sort();
      const ref = info.heavy.map((a) => `${a.sym}${a.lp}${a.fc}${a.bondSum}`).sort();
      eq(mine, ref, `${t} solution lp/charge/bonds match RDKit`);
      ok(sol.atoms.every((a, i) => a.lp === (VALENCE[a.el] - a.charge - bondOrderSum(sol, i)) / 2), `${t} lp formula holds for every atom`);
      const keys = new Set(c.atoms.map((a) => a.x + ',' + a.y));
      ok(keys.size === c.atoms.length, `${t} atom positions distinct`);
      ok(c.solution.bonds.length === c.bonds.length && c.solution.lp.length === c.atoms.length, `${t} solution arrays sized`);
    }
  }
  // generator registry
  ok(['lewis-basic', 'shape-basic', 'acid-base'].includes(L.mastery.generator), `${tag} generator known`);
}

// ---- Lesson 02 specifics
{
  const l = LESSONS.find((x) => x.id === '02');
  ok(l.steps.length >= 14 && l.steps.length <= 18, `L02 has 14-18 steps (${l.steps.length})`);
  ok(l.drawing === 'full', 'L02 drawing full');
  ok(l.steps.some((s) => s.type === 'worked'), 'L02 has a worked example');
  ok(l.steps.some((s) => s.widget === 'polarity-mark'), 'L02 has a polarity task');
  ok(l.steps.filter((s) => s.visual && s.visual.widget === 'model3d').length >= 7, 'L02 uses 3D models heavily');
  const used = new Set(l.steps.filter((s) => s.visual).flatMap((s) => [s.visual.config.mol, s.visual.config.compare].filter(Boolean)));
  for (const mname of ['methane', 'ammonia', 'water', 'ethylene', 'acetylene', 'co2']) ok(used.has(mname), `L02 uses 3D ${mname}`);
  // acrylonitrile: C=CC#N
  eq(['sp2', 'sp2', 'sp', 'sp'], [0, 1, 2, 3].map((i) => hybridOf(analyze('C=CC#N').atoms[i])), 'acrylonitrile hybridizations (incl. N)');
  eq(sigmaPi(analyze('C=CC#N')), { sigma: 6, pi: 3 }, 'acrylonitrile sigma/pi');
  // known EN values and classes
  eq([ENEG.H, ENEG.C, ENEG.N, ENEG.O, ENEG.F, ENEG.Cl, ENEG.Br, ENEG.I], [2.1, 2.5, 3.0, 3.5, 4.0, 3.0, 2.8, 2.5], 'Pauling EN values');
  eq([bondClass(0.4), bondClass(0.5), bondClass(1.4), bondClass(2), bondClass(2.1)], ['nonpolar', 'polar', 'polar', 'polar', 'ionic'], 'bond classes');
  // cross-check hybridization of every pool carbon with Python RDKit (independent implementation)
  try {
    const py = "import sys,json\nfrom rdkit import Chem\nout={}\nfor smi in json.loads(sys.argv[1]):\n  m=Chem.MolFromSmiles(smi)\n  out[smi]=[str(a.GetHybridization()) for a in m.GetAtoms()]\nprint(json.dumps(out))";
    const res = JSON.parse(execFileSync('python3', ['-I', '-c', py, JSON.stringify(SHAPE_POOL)], { encoding: 'utf8' }));
    for (const smi of SHAPE_POOL) analyze(smi).atoms.forEach((a, i) => { if (a.sym === 'C') ok(res[smi][i] === hybridOf(a).toUpperCase(), `python RDKit hybridization ${smi} atom ${i}: ${res[smi][i]} vs ${hybridOf(a)}`); });
  } catch (e) { console.log('  (python RDKit unavailable, skipped hybridization cross-check)'); }
}

// ---- reaction balance helpers (spec 6: atoms and charge)
function tally(smiles) {
  const info = analyze(smiles);
  const c = {};
  info.atoms.forEach((a) => { c[a.sym] = (c[a.sym] || 0) + 1; if (a.impH) c.H = (c.H || 0) + a.impH; });
  return { c, q: info.netCharge };
}
function balanced(reactants, products) {
  const sum = (arr) => arr.reduce((t, s) => { const x = tally(s); for (const k in x.c) t.c[k] = (t.c[k] || 0) + x.c[k]; t.q += x.q; return t; }, { c: {}, q: 0 });
  const A = sum(reactants), B = sum(products);
  const keys = new Set([...Object.keys(A.c), ...Object.keys(B.c)]);
  for (const k of keys) if ((A.c[k] || 0) !== (B.c[k] || 0)) return false;
  return A.q === B.q;
}
function findReactions(o, out = []) {
  if (Array.isArray(o)) o.forEach((x) => findReactions(x, out));
  else if (o && typeof o === 'object') { if (Array.isArray(o.reactants) && Array.isArray(o.products)) out.push(o); Object.values(o).forEach((x) => findReactions(x, out)); }
  return out;
}
{
  eq(balanced(['Cl', 'O'], ['[OH3+]', '[Cl-]']), true, 'balance helper accepts HCl + H2O');
  eq(balanced(['Cl', 'O'], ['[OH3+]', 'Cl']), false, 'balance helper rejects wrong charge');
  eq(balanced(['Cl', 'O'], ['[OH2+]', '[Cl-]']), false, 'balance helper rejects wrong atoms');
}

// ---- pKa table (McMurry Table 1.2 + text) and the acidbase helpers
{
  const want = { ethanol: 16.00, water: 15.74, hcn: 9.31, h2po4: 7.21, acetic: 4.76, h3po4: 2.16, hno3: -1.3, hcl: -7.0, acetone: 19.3, acetylene: 25, ammonia: 36 };
  eq(Object.fromEntries(ACIDS.map((a) => [a.id, a.pka])), want, 'pKa table holds exactly the allowed values');
  for (const A of ACIDS) {
    const t = `acid ${A.id}`;
    ok(canon(A.ha) && canon(A.a), `${t} smiles parse`);
    eq(conjugateBase(A.id), canon(A.a), `${t} conjugate base = acid minus H+ at its site`);
    const ia = analyze(A.ha), ib = analyze(A.a);
    ok(ia.atoms[A.site].impH >= 1, `${t} site atom carries an H`);
    ok(balanced([A.ha], [A.a, '[H+]']), `${t} HA -> A- + H+ balances`);
    ok(ib.netCharge === ia.netCharge - 1, `${t} charge drops by 1`);
    ok(ia.atoms.every((x) => Number.isInteger(x.lp) && x.lp >= 0) && ib.atoms.every((x) => Number.isInteger(x.lp) && x.lp >= 0), `${t} lone pairs valid`);
    // display labels agree with the structures
    for (const [lab, smi] of [[A.haLabel, A.ha], [A.aLabel, A.a]]) {
      const L = labelCounts(lab), T = tally(smi);
      const srt = (o) => Object.fromEntries(Object.entries(o).sort());
      eq(srt(L.counts), srt(T.c), `label ${lab} elements match ${smi}`);
      eq(L.charge, T.q, `label ${lab} charge matches ${smi}`);
    }
    const prot = protonate(A.ha, A.site);
    ok(prot === null || balanced([A.ha, '[H+]'], [prot]), `${t} protonated form balances when valid`);
    ok(Number(A.pkaText.replace('−', '-').replace('≈ ', '')) === A.pka, `${t} pka text agrees with number`);
  }
  eq(strongerAcid(['hcl', 'acetic']), 'hcl', 'stronger acid = lower pKa');
  eq(weakerAcid(['acetic', 'water']), 'water', 'weaker acid = higher pKa');
  // every ordered pair: the reaction balances, and the favoured side holds the higher pKa
  let pairs = 0;
  for (const a of ACIDS) for (const b of ACIDS) {
    if (a.id === b.id) continue;
    const rx = reaction(a.id, b.id);
    ok(balanced(rx.reactants, rx.products), `reaction ${rx.text} balances`);
    const L = a.pka, R = b.pka;
    eq(rx.favoured, R > L ? 'right' : 'left', `favoured ${rx.text}`);
    const fav = rx.favoured === 'left' ? rx.left[0] : rx.right[1];
    const oth = rx.favoured === 'left' ? rx.right[1] : rx.left[0];
    ok(fav.pka > oth.pka, `favoured side holds the weaker acid ${rx.text}`);
    pairs++;
  }
  eq(pairs, ACIDS.length * (ACIDS.length - 1), 'all ordered acid pairs checked');
  // widget logic
  const cfg = { a: 'hcn', b: 'acetic' };
  const sol = eqw.solution(cfg);
  eq(sol, { acids: ['L0', 'R1'], side: 'left' }, 'equilibrium-arrow solution for HCN/acetate');
  ok(eqw.ACID_KEYS.every((k) => eqw.tapSpecies(cfg, k).ok) && !eqw.tapSpecies(cfg, 'L1').ok && !eqw.tapSpecies(cfg, 'R0').ok, 'equilibrium-arrow acid taps graded');
  ok(/base on this side/.test(eqw.tapSpecies(cfg, 'L1').diagnosis), 'equilibrium-arrow base diagnosis');
  ok(eqw.gradeSide(cfg, 'left').ok && !eqw.gradeSide(cfg, 'right').ok && /weaker acid/.test(eqw.gradeSide(cfg, 'right').diagnosis), 'equilibrium-arrow side graded with diagnosis');
  for (const a of ACIDS) for (const b of ACIDS) if (a !== b) { const c = { a: a.id, b: b.id }; ok(eqw.gradeSide(c, eqw.solution(c).side).ok && !eqw.gradeSide(c, eqw.solution(c).side === 'left' ? 'right' : 'left').ok, `eq widget side ${a.id}/${b.id}`); }
}

// ---- curved-arrow engine: validity, grading, and the arrows really make the products
function checkArrowConfig(t, c, reactants, products) {
  const errs = arrow.validate(c);
  ok(errs.length === 0, `${t} arrow data valid: ${errs.join('; ')}`);
  c.arrows.forEach((a, n) => {
    if (a.from.lp != null) ok(arrow.lpCount(c.atoms, c.bonds, a.from.lp) >= 1, `${t} arrow ${n} lone pair source has electrons`);
    else ok(arrow.findBond(c.bonds, a.from.bond[0], a.from.bond[1]) >= 0, `${t} arrow ${n} bond source is a real bond`);
  });
  // lone pairs of the drawn scene agree with RDKit for the reactants
  const mine = c.atoms.map((a, i) => `${a.el}${arrow.lpCount(c.atoms, c.bonds, i)}`).sort();
  const ref = [];
  reactants.forEach((smi) => { const info = analyze(smi); info.atoms.forEach((a) => ref.push(`${a.sym}${a.lp}`)); info.atoms.forEach((a) => { for (let k = 0; k < a.impH; k++) ref.push('H0'); }); });
  eq(mine, ref.sort(), `${t} scene lone pairs match RDKit`);
  // grading
  ok(arrow.grade(c, c.arrows).ok, `${t} solution accepted`);
  ok(arrow.grade(c, c.arrows.slice().reverse()).ok, `${t} solution accepted in any order`);
  ok(!arrow.grade(c, []).ok && arrow.grade(c, []).code === 'empty', `${t} empty rejected`);
  if (c.arrows.length > 1) {
    const part = arrow.grade(c, [c.arrows[0]]);
    ok(!part.ok && part.code === 'missing' && /You also need/.test(part.diagnosis), `${t} missing-arrow diagnosis`);
  }
  // applying the arrows gives exactly the products
  const st = arrow.applyArrows(c);
  eq(canon(buildMolblock(st)), canon(products.join('.')), `${t} arrows produce the products`);
  ok(st.atoms.every((a) => Number.isInteger(a.lp) && a.lp >= 0), `${t} product lone pairs valid`);
  ok(new Set(c.atoms.map((a) => a.x.toFixed(2) + ',' + a.y.toFixed(2))).size === c.atoms.length, `${t} atom positions distinct`);
}
{
  // wrong-arrow diagnoses (spec wording) on a tiny H2O + HCl scene
  const sc = arrowScene('O', 'hcl');
  const c = { atoms: sc.atoms, bonds: sc.bonds, arrows: sc.arrows };
  const O = sc.baseSite, H = sc.hIdx, Cl = sc.acidSite;
  ok(/not at H⁺/.test(arrow.badStart(c, H)), 'arrow from H: "Arrows start at electrons, not at H⁺"');
  ok(/no lone pair/.test(arrow.badStart({ atoms: [{ el: 'B' }, { el: 'F' }, { el: 'F' }, { el: 'F' }], bonds: [{ a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 3 }], arrows: [] }, 0)), 'arrow from B: no lone pair');
  eq(arrow.grade(c, [sc.arrows[0]]).diagnosis.includes(`You also need the arrow showing the H−Cl bond electrons moving onto Cl`), true, 'missing second arrow message (H-Cl bond onto Cl)');
  const wrongDest = arrow.grade(c, [{ from: { lp: O }, to: { atom: Cl } }, sc.arrows[1]]);
  ok(!wrongDest.ok && wrongDest.code === 'dest' && /right place/.test(wrongDest.diagnosis), 'right start, wrong end diagnosed');
  const rev = arrow.grade(c, [sc.arrows[0], { from: { bond: [H, Cl] }, to: { atom: H } }]);
  ok(!rev.ok && rev.code === 'dest', 'bond electrons to H diagnosed as wrong end');
  const extra = arrow.grade(c, [...sc.arrows, { from: { lp: Cl }, to: { atom: H } }]);
  ok(!extra.ok && extra.code === 'extra', 'extra arrow from Cl lone pair rejected');
  ok(arrow.validate({ atoms: sc.atoms, bonds: sc.bonds, arrows: [{ from: { lp: H }, to: { atom: Cl } }] }).length > 0, 'validate: source atom without lone pair is invalid');
  ok(arrow.validate({ atoms: sc.atoms, bonds: sc.bonds, arrows: [{ from: { bond: [O, Cl] }, to: { atom: Cl } }] }).length > 0, 'validate: source that is not a bond is invalid');
}

// ---- Lesson 03 specifics
{
  const l = LESSONS.find((x) => x.id === '03');
  ok(l.steps.length >= 15 && l.steps.length <= 18, `L03 has 15-18 steps (${l.steps.length})`);
  ok(l.drawing === 'full' && l.minutes === 25 && l.chapter === 1, 'L03 drawing full, 25 min');
  eq(l.sections, ['1.10', '1.11', '1.12'], 'L03 sections');
  eq(l.mastery, { count: 3, generator: 'acid-base' }, 'L03 mastery uses acid-base');
  ok(l.steps.some((s) => s.type === 'worked' && /hydroxide/.test(s.problem)), 'L03 has the hydroxide / acetic acid worked example');
  ok(l.steps.some((s) => s.widget === 'equilibrium-arrow') && l.steps.filter((s) => s.widget === 'arrow-draw').length === 2, 'L03 uses equilibrium-arrow once and arrow-draw twice');
  ok(l.steps.every((s) => ['predict', 'choice', 'input', 'try', 'worked', 'explain'].includes(s.type)), 'L03 step types');
  ok(l.steps[0].type === 'predict' && l.steps.findIndex((s) => s.type === 'explain') > 0, 'L03 predicts before it explains');
  ok(l.steps.filter((s) => s.skill === 'curved-arrows').length >= 3, 'L03 trains curved-arrows');
  // each skill used is in the weak-spot taxonomy; book problems are real numbers from ch.1
  eq(l.useIt.book, ['1.20', '1.21', '1.22', '1.23', '1.24', '1.25', '1.56', '1.57', '1.58', '1.59', '1.60', '1.61', '1.62', '1.63'], 'L03 book problems');
  // every reaction in the lesson balances (atoms and charge)
  const rxs = findReactions(l);
  ok(rxs.length >= 7, `L03 declares reactions (${rxs.length})`);
  rxs.forEach((r, i) => ok(r.reactants.every((x) => canon(x)) && r.products.every((x) => canon(x)) && balanced(r.reactants, r.products), `L03 reaction ${i} balances: ${r.reactants.join(' + ')} -> ${r.products.join(' + ')}`));
  // widget-derived reactions
  for (const s of l.steps.filter((x) => x.widget === 'equilibrium-arrow')) { const rx = reaction(s.config.a, s.config.b); ok(balanced(rx.reactants, rx.products), `L03 ${s.id} widget reaction balances`); eq(canon(s.reaction.reactants.join('.')), canon(rx.reactants.join('.')), `L03 ${s.id} declared reactants match widget`); }
  // arrow steps
  for (const s of l.steps.filter((x) => x.widget === 'arrow-draw')) {
    checkArrowConfig(`L03/${s.id}`, s.config, s.reaction.reactants, s.reaction.products);
    eq(canon(s.config.products.join('.')), canon(s.reaction.products.join('.')), `L03/${s.id} config products = reaction products`);
  }
  const hcl = l.steps.find((x) => x.id === 's15').config;
  eq(hcl.arrows.map((a) => [a.from.lp ?? a.from.bond, a.to.atom]), [[0, 3], [[3, 4], 4]], 'H2O + HCl arrows: O lp -> H, H-Cl bond -> Cl');
  const bf3 = l.steps.find((x) => x.id === 's17').config;
  eq(bf3.arrows.map((a) => [a.from.lp, a.to.atom]), [[0, 4]], 'NH3 + BF3 arrow: N lp -> B');
  eq([arrow.lpCount(bf3.atoms, bf3.bonds, 0), arrow.lpCount(bf3.atoms, bf3.bonds, 4)], [1, 0], 'NH3 has 1 lone pair, BF3 boron 0');
  ok(arrow.applyArrows(bf3).atoms[0].charge === 1 && arrow.applyArrows(bf3).atoms[4].charge === -1, 'NH3 + BF3 gives N+ and B-');
  // Lewis spotting
  eq(['N', 'B(F)(F)F', '[Mg+2]', 'CCO', 'O'].map((x) => lewisRole(analyze(x))), ['base', 'acid', 'acid', 'base', 'base'], 'Lewis roles from structure');
  eq(analyze('CN').atoms[1].lp, 1, 'methylamine N has 1 lone pair'); eq(analyze('CN').atoms[0].lp, 0, 'methylamine C has none');
  // pKa numbers quoted in text are table values
  const allowed = new Set(['16.00', '15.74', '9.31', '7.21', '4.76', '2.16', '1.3', '7.0', '19.3', '25', '36', '9.25', '10.66']);
  const text = htmlStrings(l.steps).join(' ');
  const quoted = [...text.matchAll(/pKa (?:≈ )?(?:−)?(\d+(?:\.\d+)?)/g)].map((m) => m[1]);
  ok(quoted.length > 8 && quoted.every((q) => allowed.has(q)), `L03 only quotes allowed pKa values (${[...new Set(quoted)].join(', ')})`);
}

// ---- acid-base generator
{
  const kinds = new Set();
  for (const skill of [null, 'pka-direction', 'conjugate-pairs', 'curved-arrows', 'lewis-acid-base']) {
    const probs = generate('acid-base', 50, { skill });
    ok(probs.length === 50, `acid-base gen ${skill} count`);
    for (const p of probs) {
      kinds.add(p.kind + ':' + p.skill);
      const t = `acid-base ${skill}/${p.skill}`;
      ok(p.prompt && p.derive && p.hints.length === 2 && p.hints.every((x) => x.length > 5), `${t} fields`);
      ok(TAXONOMY.has(p.skill), `${t} skill tag`);
      if (p.reaction) ok(p.reaction.reactants.every(canon) && p.reaction.products.every(canon) && balanced(p.reaction.reactants, p.reaction.products), `${t} reaction balances: ${p.reaction.reactants} -> ${p.reaction.products}`);
      if (p.kind === 'choice') {
        ok(p.options.filter((o) => o.correct).length === 1 && p.options.every((o) => o.why.length > 10), `${t} one correct + whys`);
        const right = p.options.find((o) => o.correct);
        if (p.skill === 'pka-direction' && /equilibrium favour/.test(p.prompt)) {
          const m = /acids: (.+?) pKa ([^,)]+), (.+?) pKa ([^,)]+)\)/.exec(p.prompt);
          const L = ACIDS.find((a) => a.haLabel === m[1]), R = ACIDS.find((a) => a.haLabel === m[3]);
          ok(L && R && L.pkaText === m[2] && R.pkaText === m[4], `${t} acids and pKa shown agree with table`);
          const textRx = `${L.haLabel} + `;
          ok(p.prompt.includes(reaction(L.id, ACIDS.find((a) => a.haLabel === R.haLabel).id).text) || p.prompt.includes('⇌'), `${t} shows reaction`);
          // recompute independently from numbers
          ok(Math.abs(L.pka - R.pka) >= 1, `${t} pKa gap at least 1`);
          eq(right.side, R.pka > L.pka ? 'right' : 'left', `${t} side = higher-pKa acid side`);
        } else if (p.skill === 'pka-direction') {
          const m = /stronger acid: (.+?) \(pKa ([^)]+)\) or (.+?) \(pKa ([^)]+)\)\?/.exec(p.prompt);
          ok(!!m, `${t} stronger prompt parses`);
          const A = ACIDS.find((a) => a.name === m[1]), B = ACIDS.find((a) => a.name === m[3]);
          ok(A && B && A.pkaText === m[2] && B.pkaText === m[4], `${t} pKa shown agrees with table`);
          const want = A.pka < B.pka ? A : B;
          ok(right.text.startsWith(want.name), `${t} stronger = lower pKa (${want.name})`);
        } else if (p.skill === 'conjugate-pairs') {
          const A = ACIDS.find((a) => a.ha === p.smiles);
          ok(!!A, `${t} acid from table`);
          eq(canon(right.smiles), conjugateBase(A.id), `${t} correct option = acid minus H+ (canonical SMILES)`);
          ok(p.options.filter((o) => canon(o.smiles) === canon(right.smiles)).length === 1, `${t} no duplicate of the answer`);
          ok(new Set(p.options.map((o) => canon(o.smiles))).size === p.options.length && p.options.length >= 3, `${t} distinct options`);
          p.options.forEach((o) => ok(canon(o.smiles) !== null, `${t} option parses`));
          ok(p.options.filter((o) => !o.correct).every((o) => analyze(o.smiles).netCharge !== analyze(A.ha).netCharge - 1 || canon(o.smiles) !== conjugateBase(A.id)), `${t} distractors are not the answer`);
        } else if (p.skill === 'lewis-acid-base') {
          const role = lewisRole(analyze(p.smiles));
          ok(role === 'acid' || role === 'base', `${t} unambiguous role`);
          ok(right.text.toLowerCase().includes(role), `${t} answer = ${role}`);
        }
      } else if (p.kind === 'arrows') {
        checkArrowConfig(t + ' ' + p.reaction.reactants, p.config, p.reaction.reactants, p.reaction.products);
        const c = p.config;
        // a learner who starts at the H cannot start an arrow
        ok(arrow.validate({ ...c, arrows: [{ from: { lp: p.config.arrows[1].from.bond[0] }, to: { atom: p.config.arrows[1].to.atom } }] }).length > 0, `${t} H cannot be an arrow source`);
        ok(!arrow.grade(c, [c.arrows[1]]).ok && !arrow.grade(c, [c.arrows[0]]).ok, `${t} one arrow alone is not enough`);
        eq(canon(c.products.join('.')), canon(p.reaction.products.join('.')), `${t} products agree`);
      } else ok(false, 'unknown acid-base kind ' + p.kind);
    }
  }
  ok(['choice:pka-direction', 'choice:conjugate-pairs', 'arrows:curved-arrows', 'choice:lewis-acid-base'].every((k) => kinds.has(k)), 'acid-base covers all task types');
  const dflt = generate('acid-base', 50).map((p) => p.skill);
  ok(dflt.includes('pka-direction') && dflt.includes('conjugate-pairs'), 'default mix has direction + conjugate-base problems');
  ok(generatorForSkill('pka-direction') === 'acid-base' && generatorForSkill('curved-arrows') === 'acid-base' && generatorForSkill('conjugate-pairs') === 'acid-base' && generatorForSkill('lewis-acid-base') === 'acid-base' && generatorForSkill('polarity') === 'shape-basic', 'generatorForSkill routes L03 skills');
  const f1 = generate('acid-base', 6).map((p) => p.prompt).join('|'), f2 = generate('acid-base', 6).map((p) => p.prompt).join('|');
  ok(f1.length > 0 && f2.length > 0, 'acid-base fresh runs');
  ok(LEWIS_POOL.every((x) => ['acid', 'base'].includes(lewisRole(analyze(x.smiles)))), 'Lewis pool entries are unambiguous');
  ARROW_BASES.forEach((b) => ARROW_ACIDS.forEach((id) => { const sc = arrowScene(b.smiles, id); ok(balanced(sc.reactants, sc.products), `arrow scene ${b.smiles}+${id} balances`); checkArrowConfig(`arrowScene ${b.smiles}+${id}`, { atoms: sc.atoms, bonds: sc.bonds, arrows: sc.arrows }, sc.reactants, sc.products); }));
}

// ---- builder diagnosis behaviours (spec wording)
{
  const l = LESSONS[0];
  const byId = (id) => l.steps.find((s) => s.id === id);
  const water = byId('s06').config;
  let st = initialState(water); st.atoms[0].lp = 3;
  ok(/Oxygen has 10 electrons/.test(evaluate(st, water).diagnosis), 'water: 3 pairs -> "Oxygen has 10 electrons"');
  st.atoms[0].lp = 1; ok(/6 electrons/.test(evaluate(st, water).diagnosis), 'water: 1 pair -> 6 electrons');
  const fa = byId('s09').config;
  st = initialState(fa);
  eq(evaluate(st, fa).diagnosis, 'Carbon has only 3 bonds (6 electrons). It needs 4: turn one of oxygen’s lone pairs into a second C–O bond.', 'formaldehyde C has 3 bonds message');
  st.bonds[0].order = 2; st.atoms[1].lp = 2;
  ok(evaluate(st, fa).ok, 'formaldehyde correct');
  st.atoms[1].lp = 3; ok(/Oxygen has 10/.test(evaluate(st, fa).diagnosis), 'formaldehyde O too many pairs');
  const mx = byId('s16').config;
  st = initialState(mx); st.atoms[1].lp = 2;
  eq(evaluate(st, mx).diagnosis, 'O has 1 bond + 2 lone pairs = only 6 electrons around it. Add a third pair.', 'methoxide 2 pairs');
  st.atoms[1].lp = 3;
  eq(evaluate(st, mx).diagnosis, 'O owns 6 + 1 = 7 electrons, one more than normal: set its charge to −1.', 'methoxide no charge');
  st.atoms[1].charge = 1; ok(/formal charge is 6 − 7 = −1/.test(evaluate(st, mx).diagnosis), 'methoxide wrong sign');
  st.atoms[1].charge = -1; ok(evaluate(st, mx).ok, 'methoxide ok');
  // connectivity: right electrons but wrong molecule (HCN as isomer) still caught
  const hcn = byId('s10').config; st = solutionState(hcn); st.bonds[1].order = 3; st.bonds[0].order = 1;
  ok(evaluate(st, hcn).ok, 'HCN ok');
  const wrongT = { ...hcn, target: 'C=N' };
  ok(evaluate(st, wrongT).code === 'connectivity', 'wrong target -> connectivity message');
}

// ---- mastery generators
{
  const skills = [null, 'lone-pairs', 'formal-charge', 'electron-count-total', 'multiple-bonds', 'octet', 'valence-electrons', 'bond-count'];
  const seen = new Set();
  for (const skill of skills) {
    const probs = generate('lewis-basic', 50, { skill });
    ok(probs.length === 50, `gen ${skill} count`);
    for (const p of probs) {
      seen.add(p.kind + ':' + p.skill);
      ok(p.prompt && p.derive && p.hints.length === 2, `gen ${skill} fields`);
      if (p.kind === 'input') {
        ok(Number.isInteger(p.answer), `gen ${skill} integer answer`);
        ok(checkInput({ answer: p.answer, diagnose: p.wrong }, (p.answer > 0 ? '+' : '') + p.answer).ok || p.answer <= 0, 'gen answer accepted');
        ok(checkInput({ answer: p.answer, diagnose: p.wrong }, String(p.answer)).ok, `gen ${skill} answer accepted`);
        if (p.smiles) {
          const info = analyze(p.smiles);
          ok(info && p.highlight.every((i) => i >= 0 && i < info.atoms.length), `gen ${skill} highlight valid`);
          if (p.skill === 'lone-pairs') { const a = info.atoms[p.highlight[0]]; ok(p.answer === a.lp && a.lp >= 0 && Number.isInteger(a.lp), `gen lp ${p.smiles}`); ok(a.sym !== 'C' || a.fc !== 0 || info.heavy.length === 1, `gen lp atom is hetero/charged ${p.smiles}`); }
          if (p.skill === 'formal-charge') ok(p.answer === info.atoms[p.highlight[0]].fc, `gen fc ${p.smiles}`);
          if (p.skill === 'octet') ok(p.answer === info.atoms[p.highlight[0]].electrons, `gen octet ${p.smiles}`);
          if (p.skill === 'electron-count-total') {
            // independent: electrons = 2*sum(lp) + 2*sum(bond orders, incl. H bonds)
            const lpSum = info.atoms.reduce((s, a) => s + a.lp, 0);
            const bo = info.bonds.reduce((s, b) => s + (b.bo ?? 1), 0) + info.atoms.reduce((s, a) => s + a.impH, 0);
            ok(p.answer === 2 * lpSum + 2 * bo, `gen total ${p.smiles}: ${p.answer} == ${2 * lpSum + 2 * bo}`);
          }
        }
      } else {
        const c = p.config;
        ok(analyze(c.target).heavy.length <= 4, `gen builder <=4 heavy atoms ${c.target}`);
        ok(POOL.includes(c.target), `gen builder from pool ${c.target}`);
        const sol = solutionState(c);
        ok(evaluate(sol, c).ok, `gen builder solution reaches target ${c.target}`);
        ok(canon(buildMolblock(sol)) === canon(c.target), `gen builder canon ${c.target}`);
        ok(!evaluate(initialState(c), c).ok, `gen builder start not solved ${c.target}`);
        ok(new Set(c.atoms.map((a) => a.x.toFixed(2) + a.y.toFixed(2))).size === c.atoms.length, `gen builder positions distinct ${c.target}`);
        ok(formula(c.target).length > 0, 'formula');
      }
    }
  }
  ok(seen.has('input:lone-pairs') && seen.has('input:formal-charge') && seen.has('input:electron-count-total') && [...seen].some((k) => k.startsWith('builder:')), 'lewis-basic covers all task types');
  const a = generate('lewis-basic', 6).map((p) => JSON.stringify(p.smiles || p.config.target)).join();
  const b = generate('lewis-basic', 6).map((p) => JSON.stringify(p.smiles || p.config.target)).join();
  ok(a.length > 0 && b.length > 0, 'fresh runs generated');
  // pool sanity: every pool SMILES has integer non-negative lone pairs
  for (const smi of POOL) { const i = analyze(smi); ok(i.atoms.every((x) => Number.isInteger(x.lp) && x.lp >= 0), `pool ${smi} lone pairs valid`); }
  eq(formula('CC#N'), 'C₂H₃N', 'formula CC#N'); eq(formula('C[O-]'), 'CH₃O⁻', 'formula methoxide');
}

// ---- shape-basic generator
{
  const seenK = new Set();
  for (const skill of [null, 'hybridization', 'sigma-pi', 'polarity']) {
    const probs = generate('shape-basic', 50, { skill });
    ok(probs.length === 50, `shape gen ${skill} count`);
    for (const p of probs) {
      seenK.add(p.kind + ':' + p.skill);
      ok(p.prompt && p.derive && p.hints.length === 2 && p.hints.every((x) => x.length > 5), `shape gen ${skill} fields`);
      ok(TAXONOMY.has(p.skill), 'shape gen skill tag');
      ok(SHAPE_POOL.includes(p.smiles) && analyze(p.smiles).heavy.length <= 5, `shape gen pool ${p.smiles}`);
      const info = analyze(p.smiles);
      if (p.kind === 'choice') {
        ok(p.options.filter((o) => o.correct).length === 1 && p.options.every((o) => o.why.length > 10), `shape choice one correct + whys (${p.prompt})`);
        const right = p.options.find((o) => o.correct);
        ok(right.text === p.answer, 'shape choice answer matches');
        if (/hybridization/.test(p.prompt) || /bond angle/.test(p.prompt)) {
          const a = info.atoms[p.highlight[0]];
          ok(a.sym === 'C', 'shape hybrid asks about carbon');
          const want = hybridOf(a);
          // independent: Python-free rule from bonds (carbon has no lone pairs here)
          const bo = info.bonds.filter((b) => b.atoms.includes(a.idx)).map((b) => b.bo ?? 1);
          const rule = bo.includes(3) || bo.filter((x) => x === 2).length === 2 ? 'sp' : bo.includes(2) ? 'sp2' : 'sp3';
          ok(want === rule, `shape hybrid rule agrees ${p.smiles}: ${want} vs ${rule}`);
          ok(right.text === (/hybridization/.test(p.prompt) ? { sp3: 'sp³', sp2: 'sp²', sp: 'sp' }[want] : { sp3: '109.5°', sp2: '120°', sp: '180°' }[want]), `shape hybrid/angle answer ${p.smiles}`);
        } else {
          const m = /Which bond is more polar: (.+) or (.+)\?/.exec(p.prompt);
          ok(!!m, 'polar2 prompt');
          const types = bondTypes(p.smiles);
          const find = (lab) => types.find((t) => t.label === lab);
          const x = find(m[1]), y = find(m[2]);
          ok(x && y && x.diff !== y.diff, `polar2 both bonds exist and differ ${p.smiles}`);
          const en = (e) => ENEG[e];
          const dx = Math.abs(en(x.a) - en(x.b)), dy = Math.abs(en(y.a) - en(y.b));
          ok(right.text === (dx > dy ? x.label : y.label), `polar2 answer from EN table ${p.smiles} ${m[1]}/${m[2]}`);
        }
      } else if (p.kind === 'input') {
        const ref = sigmaPiIndependent(p.smiles);
        if (/σ bonds/.test(p.prompt)) ok(p.answer === ref.sigma, `shape sigma ${p.smiles} ${p.answer}==${ref.sigma}`);
        else { ok(/π bonds/.test(p.prompt), 'pi prompt'); ok(p.answer === ref.pi && p.answer >= 1, `shape pi ${p.smiles} ${p.answer}==${ref.pi}`); }
        ok(checkInput({ answer: p.answer, diagnose: p.wrong }, String(p.answer)).ok, 'shape input accepts answer');
        (p.wrong || []).forEach((w) => ok(w.match !== p.answer && checkInput({ answer: p.answer, diagnose: p.wrong }, String(w.match)).diagnosis === w.why, 'shape wrong routes'));
      } else if (p.kind === 'polarity') {
        const c = p.config;
        const e = pm.expected(c)[0];
        ok(e.cls === 'polar' && e.diff >= 0.5 && e.diff <= 2, `shape delta bond is polar ${p.smiles}`);
        const hi = ENEG[e.A] > ENEG[e.B] ? e.A : e.B;
        ok(p.answer === hi, 'shape delta answer is more EN element');
        ok(pm.grade(c, [e.answer]).ok && !pm.grade(c, [e.answer === 'a' ? 'b' : 'a']).ok && !pm.grade(c, ['none']).ok, `shape delta grading ${p.smiles}`);
        ok(c.bonds[0].a === 'H' || c.bonds[0].b === 'H' || (typeof c.bonds[0].a === 'number' && typeof c.bonds[0].b === 'number'), 'delta bond indices valid');
        [c.bonds[0].a, c.bonds[0].b].filter((x) => typeof x === 'number').forEach((i) => ok(i >= 0 && i < info.atoms.length, 'delta idx in range'));
      } else ok(false, 'unknown shape kind ' + p.kind);
    }
  }
  ok(['choice:hybridization', 'input:sigma-pi', 'choice:polarity', 'polarity:polarity'].every((k) => seenK.has(k)), 'shape-basic covers all task types');
  ok(generatorForSkill('hybridization') === 'shape-basic' && generatorForSkill('polarity') === 'shape-basic' && generatorForSkill('sigma-pi') === 'shape-basic' && generatorForSkill('lone-pairs') === 'lewis-basic', 'generatorForSkill routing');
  for (const smi of SHAPE_POOL) { const i = analyze(smi); ok(i && i.atoms.length <= 5 && i.atoms.every((x) => Number.isInteger(x.lp) && x.lp >= 0), `shape pool ${smi} valid`); }
}

// ---- known values of the pool (cross-check against hand knowledge)
eq(analyze('C[O-]').atoms[1].fc, -1, 'methoxide O charge'); eq(analyze('C[O-]').atoms[1].lp, 3, 'methoxide O lp');
eq(analyze('[NH4+]').atoms[0].fc, 1, 'ammonium'); eq(analyze('[CH3-]').atoms[0].lp, 1, 'carbanion lp');
eq(analyze('[OH3+]').atoms[0].lp, 1, 'hydronium lp'); eq(analyze('O=C=O').atoms[0].lp, 2, 'CO2 O lp');
eq(analyze('CC=O').totalValence, 18, 'acetaldehyde valence e'); eq(analyze('[NH4+]').totalValence, 8, 'ammonium valence e');

// ---- 3D models (computed by learn/tools/gen3d.py)
{
  for (const id of ['water', 'ammonia', 'methane', 'formaldehyde', 'hcn', 'ethylene', 'acetylene', 'co2']) ok(models[id] && canon(models[id].molblock) === canon(models[id].smiles), `3D model ${id} matches its SMILES`);
  const ang = modelAngle(models.water.molblock, 0, 1, 2);
  ok(ang >= 100 && ang <= 110, `water H-O-H angle ${ang.toFixed(1)} within 100-110`);
  const nh = modelAngle(models.ammonia.molblock, 0, 1, 2);
  ok(nh > 100 && nh < 112, `ammonia H-N-H ${nh.toFixed(1)}`);
  const meth = [[1, 0, 2], [1, 0, 3], [1, 0, 4], [2, 0, 3], [2, 0, 4], [3, 0, 4]].map(([a, c, b]) => modelAngle(models.methane.molblock, c, a, b));
  ok(meth.every((x) => Math.abs(x - 109.5) < 2), `methane all H-C-H ~109.5 (${meth.map((x) => x.toFixed(1))})`);
  ok(models.ammonia.molblock && nh >= 105 && nh <= 109, `ammonia H-N-H 105-109 (${nh.toFixed(1)})`);
  ok(ang >= 100 && ang <= 110, 'water 100-110');
  // ethylene: atoms C0 C1 H2 H3 (on C0) H4 H5 (on C1)
  const et = models.ethylene.molblock;
  const ethAngles = [[2, 0, 1], [3, 0, 1], [4, 1, 0], [5, 1, 0]].map(([a, c, b]) => modelAngle(et, c, a, b));
  ok(ethAngles.every((x) => x > 115 && x < 125), `ethylene H-C=C ~120 (${ethAngles.map((x) => x.toFixed(1))})`);
  ok(modelAngle(et, 0, 2, 3) > 112 && modelAngle(et, 0, 2, 3) < 123, 'ethylene H-C-H ~117');
  ok(planarity(et) < 0.05, `ethylene planar (max out-of-plane ${planarity(et).toFixed(3)} A)`);
  ok(planarity(models.formaldehyde.molblock) < 0.05, 'formaldehyde planar');
  ok(modelAngle(models.acetylene.molblock, 0, 2, 1) > 177 && modelAngle(models.acetylene.molblock, 1, 3, 0) > 177, 'acetylene linear ~180');
  ok(modelAngle(models.co2.molblock, 1, 0, 2) > 177, `CO2 linear (${modelAngle(models.co2.molblock, 1, 0, 2).toFixed(1)})`);
  ok(models.co2.molblock.split('\n')[4].includes(' O ') && models.acetylene.smiles === 'C#C' && models.ethylene.smiles === 'C=C', '3D atom order as lesson indices assume');
  const hcn = models.hcn.molblock.split('\n');
  ok(modelAngle(models.hcn.molblock, 0, 1, 2) > 170 || modelAngle(models.hcn.molblock, 1, 0, 2) > 170 || modelAngle(models.hcn.molblock, 2, 0, 1) > 170, `HCN is linear (${hcn.length} lines)`);
}

// ---- store: weak spots (memory fallback in Node)
{
  store.resetAll();
  for (let i = 0; i < 3; i++) store.logMistake({ skill: 'formal-charge', stepId: 'x', lessonId: '01', diagnosis: 'd' });
  store.logMistake({ skill: 'lone-pairs', stepId: 'y', lessonId: '01', diagnosis: 'd' });
  const w = store.weakSpots();
  ok(w[0] && w[0].skill === 'formal-charge' && w[0].count === 3, 'weak spots rank by mistakes');
  store.logWin('formal-charge'); store.logWin('formal-charge'); store.logWin('formal-charge'); store.logWin('formal-charge');
  ok(!store.weakSpots().some((x) => x.skill === 'formal-charge'), 'practice wins clear a weak spot');
  store.resetAll();
}

console.log(`\n${pass} checks passed, ${fail} failed`);
if (fail) { failures.slice(0, 40).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
