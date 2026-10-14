// node learn/tests/run.mjs  - validates every lesson, generator and widget target.
import { LESSONS, PLANNED } from '../lessons/index.js';
import { ready, rdkit, canon, analyze, VALENCE, ENEG, groupCount, hybridOf, sigmaPi, bondClass } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
import * as gf from '../engine/widgets/group-finder.js';
import * as sb from '../engine/widgets/skeletal-builder.js';
import { FG, FG_POOL, QUIZ_GROUPS, GROUP_IDS, classify, matchGroup, allMatches, singleGroups } from '../engine/functional-groups.js';
import { hCount, lineCount, formulaCounts, hill, formulaOf, parseFormula, gradeFormula, condensedToSmiles, sameCounts } from '../engine/skeletal.js';
import { nameAlkane, nameBoth, alkaneInfo, normName, acceptedNames, matchesName, wrongNames, buildSmiles, carbonClass, parentInfo, numberingEnds, locantsFrom, diagnoseTyped, subInfo, SUB_IDS, parseAlkane, assembleName } from '../engine/naming.js';
import * as ct from '../engine/widgets/chain-tracer.js';
import { randomAcyclic, randomRing, randomMolecule, makeNameProblem } from '../engine/generators-names.js';
import { ARROW_BASES, ARROW_ACIDS, arrowScene, LEWIS_POOL } from '../engine/generators-acid.js';
import * as NR from '../engine/widgets/newman-rotator.js';
import * as CC from '../engine/widgets/chair-core.js';
import { lesson06 } from './lesson06.mjs';
import { lesson07 } from './lesson07.mjs';
import { lesson08 } from './lesson08.mjs';
import { lesson09 } from './lesson09.mjs';
import { lesson10 } from './lesson10.mjs';
import { lesson11 } from './lesson11.mjs';
import { lesson12 } from './lesson12.mjs';
import { lesson13 } from './lesson13.mjs';
import { lesson14 } from './lesson14.mjs';
import { lesson15 } from './lesson15.mjs';

const TAXONOMY = new Set(['valence-electrons', 'bond-count', 'lone-pairs', 'octet', 'multiple-bonds', 'formal-charge', 'electron-count-total', 'hybridization', 'sigma-pi', 'polarity', 'conjugate-pairs', 'lewis-acid-base', 'pka-direction', 'curved-arrows', 'skeletal', 'functional-groups', 'naming', 'conformations', 'chairs', 'ez', 'mechanism', 'markovnikov', 'stereo-addition', 'resonance', 'eas', 'directors', 'synthesis', 'chirality', 'rs', 'stereo-relationships', 'reaction-types', 'nuc-elec', 'energy-diagram', 'carbocations', 'alkene-oxidation', 'polymers', 'dienes', 'alkynes', 'acetylides', 'aromatic-naming', 'side-chains', 'aromatic-synthesis']);
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

/** Independent route for H counts and formulas: add explicit H atoms and count them (not RDKit's implicit-H numbers). */
function atomsIndependent(smi) {
  const R = rdkit();
  const m0 = R.get_mol(smi);
  const mb = m0.add_hs(); m0.delete();
  const m = R.get_mol(mb, JSON.stringify({ removeHs: false }));
  const j = JSON.parse(m.get_json()).molecules[0]; m.delete();
  const SYM = { 1: 'H', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 16: 'S', 17: 'Cl', 35: 'Br', 53: 'I' };
  return j.atoms.map((a, i) => ({ i, sym: SYM[a.z ?? 6], bonds: j.bonds.filter((b) => b.atoms.includes(i)).map((b) => b.atoms[0] === i ? b.atoms[1] : b.atoms[0]) })).map((a) => ({ ...a, bondsTo: a.bonds }));
}
function hNeighboursIndependent(smi, idx) { const at = atomsIndependent(smi); return at[idx].bondsTo.filter((k) => at[k].sym === 'H').length; }
function hillIndependent(smi) {
  const c = {}; atomsIndependent(smi).forEach((a) => { c[a.sym] = (c[a.sym] || 0) + 1; });
  const rest = Object.keys(c).filter((k) => k !== 'C' && k !== 'H').sort();
  return ['C', 'H', ...rest].filter((k) => c[k]).map((k) => k + (c[k] > 1 ? c[k] : '')).join('');
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
  if (d.quantity === 'ccount') return atomsIndependent(d.smiles).filter((a) => a.sym === 'C').length;
  if (d.quantity === 'hcount') return hNeighboursIndependent(d.smiles, d.atom);
  if (d.quantity === 'formula') return hillIndependent(d.smiles);
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

ok(PLANNED.length === 1 && PLANNED[0].id === '16', 'placeholder 16 (Lesson 15 is unlocked)');
ok(LESSONS.length === 15 && LESSONS[14].id === '15' && LESSONS[13].id === '14' && LESSONS[12].id === '13' && LESSONS[11].id === '12' && LESSONS[10].id === '11' && LESSONS[9].id === '10' && LESSONS[8].id === '09' && LESSONS[7].id === '08' && LESSONS[6].id === '07' && LESSONS[1].id === '02' && LESSONS[2].id === '03' && LESSONS[3].id === '04' && LESSONS[4].id === '05' && LESSONS[5].id === '06', 'lessons 01-15 registered and unlocked');

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
    for (const o of s.options || []) if (o.smiles && !o.raw) ok(canon(o.smiles) !== null, `${t} option smiles ${o.smiles} parses`);
    if (s.config && s.config.target) ok(canon(s.config.target) !== null, `${t} target parses`);
    if (s.derive && s.derive.smiles) ok(canon(s.derive.smiles) !== null, `${t} derive smiles parses`);
    if (s.visual) ok((s.visual.widget === 'model3d' && models[s.visual.config.mol]) || (s.visual.widget === 'newman-rotator' && NR.MOLS[s.visual.config.mol] && models[s.visual.config.mol]) || (s.visual.widget === 'chair-flip' && CC.CHAIRS[s.visual.config.model]) || (s.visual.widget === 'energy-diagram' && Array.isArray(s.visual.config.levels)), `${t} visual model exists`);
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
  for (const s of L.steps) {
    const t = `${tag}/${s.id}`;
    if (s.type === 'try' && s.widget === 'group-finder') {
      const c = s.config;
      ok(FG[c.group] && !FG[c.group].none, `${t} group-finder group known`);
      const want = gf.solution(c);
      ok(want.length > 0 && gf.isUnique(c), `${t} group-finder has exactly one instance of ${c.group}`);
      eq(want, matchGroup(c.smiles, c.group), `${t} group-finder solution = SMARTS match`);
      ok(gf.grade(c, want).ok, `${t} group-finder accepts the SMARTS atoms`);
      ok(!gf.grade(c, []).ok && gf.grade(c, []).empty, `${t} group-finder empty not ok`);
      ok(!gf.grade(c, want.slice(1)).ok && /includes/.test(gf.grade(c, want.slice(1)).diagnosis), `${t} group-finder subset rejected with message`);
      const nInfo = analyze(c.smiles).atoms.length;
      const other = [...Array(nInfo).keys()].find((i) => !want.includes(i));
      ok(!gf.grade(c, [...want, other]).ok && /not part/.test(gf.grade(c, [...want, other]).diagnosis), `${t} group-finder superset rejected with message`);
      ok(want.every((i) => i >= 0 && i < nInfo), `${t} group-finder indices in range`);
    }
    if (s.type === 'try' && s.widget === 'skeletal-builder') {
      const c = s.config;
      const t0 = sb.target(c);
      ok(t0 !== null, `${t} builder condensed parses to a valid structure`);
      ok(c.options.length === 4 && c.options.every((o) => canon(o.smiles) !== null), `${t} builder has 4 valid options`);
      ok(new Set(c.options.map((o) => canon(o.smiles))).size === 4, `${t} builder options are distinct`);
      ok(c.options.filter((o) => canon(o.smiles) === t0).length === 1, `${t} builder exactly one option matches the formula`);
      const k = sb.solution(c);
      ok(sb.grade(c, k).ok, `${t} builder correct option accepted`);
      c.options.forEach((o, i) => { if (i !== k) { ok(!sb.grade(c, i).ok && sb.grade(c, i).diagnosis.length > 15, `${t} builder option ${i} rejected with a diagnosis`); } });
      // near misses: the distractors have the same element set or differ by one carbon, never wildly different
      const fT = formulaOf(t0);
      c.options.forEach((o, i) => { if (i !== k) { const f = formulaCounts(o.smiles); const w = formulaCounts(t0); ok(f.O === w.O && Math.abs((f.C || 0) - (w.C || 0)) <= 1, `${t} builder distractor ${i} is a near miss (${hill(f)} vs ${fT})`); } });
    }
  }
  // generator registry
  ok(['lewis-basic', 'shape-basic', 'acid-base', 'skeletal-fg', 'alkane-names', 'chairs', 'alkene-names', 'mechanism-basics', 'markovnikov', 'alkene-additions-2', 'resonance', 'alkynes', 'eas-basics', 'directors', 'rs'].includes(L.mastery.generator), `${tag} generator known`);
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

// ---- Lesson 04 specifics
{
  const l = LESSONS.find((x) => x.id === '04');
  ok(l.steps.length >= 15 && l.steps.length <= 18, `L04 has 15-18 steps (${l.steps.length})`);
  ok(l.drawing === 'skeletal' && l.minutes === 25 && l.chapter === 2, 'L04 drawing skeletal, 25 min, chapter 2');
  eq(l.sections, ['2.1', '2.6'], 'L04 sections');
  eq(l.mastery, { count: 3, generator: 'skeletal-fg' }, 'L04 mastery uses skeletal-fg');
  ok(l.steps[0].type === 'predict' && l.steps.findIndex((s) => s.type === 'explain') > 0, 'L04 predicts before it explains');
  ok(l.steps.every((s) => TYPES.has(s.type)), 'L04 step types');
  ok(l.steps.some((s) => s.skill === 'skeletal') && l.steps.some((s) => s.skill === 'functional-groups'), 'L04 trains skeletal and functional-groups');
  // (a) H count, (b) formula, (c) group-finder, (d) skeletal-builder, (e) worked conversion, (f) 3D zig-zag
  ok(l.steps.filter((s) => s.derive && s.derive.quantity === 'hcount').length >= 2, 'L04 (a) H-count steps, answers recomputed');
  ok(l.steps.some((s) => s.formula === true && s.derive && s.derive.quantity === 'formula'), 'L04 (b) typed-formula step, answer recomputed');
  ok(l.steps.filter((s) => s.widget === 'group-finder').length >= 3, 'L04 (c) group-finder used');
  ok(l.steps.some((s) => s.widget === 'skeletal-builder' && s.config.condensed === 'CH3CH2CH(OH)CH3'), 'L04 (d) skeletal-builder with CH3CH2CH(OH)CH3');
  ok(l.steps.some((s) => s.type === 'worked' && /CH₃CH₂CH\(OH\)CH₂CH₃/.test(s.problem)), 'L04 (e) condensed-to-skeletal worked example');
  const w = l.steps.find((s) => s.type === 'worked');
  eq(w.moves.map((m) => m.figure ? canon(m.figure.smiles) : null).filter(Boolean), [canon('CCCCC'), canon('CCC(O)CC')], 'L04 worked figures build up to 3-pentanol');
  eq(canon(condensedToSmiles('CH3CH2CH(OH)CH2CH3')), canon('CCC(O)CC'), 'L04 worked condensed formula = final figure');
  const td = l.steps.find((s) => s.visual && s.visual.config.mol === 'butane');
  ok(!!td && td.type === 'choice', 'L04 (f) 3D butane step');
  eq(l.steps.find((x) => x.id === 's10').both, true, 'L04 uses the side-by-side full/skeletal pair');
  eq(l.useIt.book, ['2.1', '2.2', '2.3', '2.15', '2.16', '2.17', '2.29', '2.30', '2.34', '2.35', '2.36', '2.37', '2.40', '2.51'], 'L04 book problems');
  ok(l.useIt.endFrom === 29, 'L04 end-of-chapter exercises start at 2.29');
  // every group named in the lesson prose maps to a group in the table
  const prose = htmlStrings(l.steps).join(' ');
  ok(/aldehyde/.test(prose) && /ketone/.test(prose) && /ester/.test(prose) && /ether/.test(prose) && /amine/.test(prose) && /amide/.test(prose), 'L04 covers the look-alike pairs');
}

// ---- 3D butane (zig-zag)
{
  ok(models.butane && canon(models.butane.molblock) === canon('CCCC'), '3D butane matches its SMILES');
  const mb = models.butane.molblock.split('\n');
  const P = (i) => [0, 10, 20].map((o) => parseFloat(mb[4 + i].slice(o, o + 10)));
  const sub = (a, b) => a.map((v, k) => v - b[k]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a.reduce((t, v, k) => t + v * b[k], 0);
  const b1 = sub(P(1), P(0)), b2 = sub(P(2), P(1)), b3 = sub(P(3), P(2));
  const n1 = cross(b1, b2), n2 = cross(b2, b3);
  const dih = Math.abs(Math.atan2(dot(cross(n1, n2), b2) / Math.hypot(...b2), dot(n1, n2)) * 180 / Math.PI);
  ok(dih > 170, `butane C1-C2-C3-C4 dihedral ${dih.toFixed(1)} is anti (zig-zag, all four carbons coplanar)`);
  const a1 = modelAngle(models.butane.molblock, 1, 0, 2), a2 = modelAngle(models.butane.molblock, 2, 1, 3);
  ok(a1 > 108 && a1 < 114 && a2 > 108 && a2 < 114, `butane C-C-C angles near tetrahedral (${a1.toFixed(1)}, ${a2.toFixed(1)})`);
  eq(['C', 'C', 'C', 'C'], mb.slice(4, 8).map((l) => l.slice(31, 33).trim()), 'butane atoms 0-3 are the carbons');
  ok(mb.length > 20 && mb.slice(8, 18).every((l) => /\sH\s/.test(l)), 'butane has explicit H');
}

// ---- functional-group SMARTS classifier vs hand-checked expected groups
{
  ok(FG_POOL.length >= 25, `pool has at least 25 molecules (${FG_POOL.length})`);
  ok(QUIZ_GROUPS.length === 16, 'sixteen quiz groups: alkane alkene alkyne arene halide alcohol ether amine thiol sulfide aldehyde ketone acid ester amide nitrile');
  for (const g of GROUP_IDS) ok(rdkit().get_qmol(FG[g].smarts) !== null, `SMARTS parses for ${g}`);
  const order = (arr) => GROUP_IDS.filter((g) => arr.includes(g));
  const covered = new Set();
  for (const e of FG_POOL) {
    ok(canon(e.smiles) !== null, `pool ${e.name} parses`);
    eq(classify(e.smiles), order(e.groups), `classifier on ${e.name} (${e.smiles})`);
    e.groups.forEach((g) => covered.add(g));
  }
  ok(QUIZ_GROUPS.every((g) => covered.has(g)), `pool covers all quiz groups (missing ${QUIZ_GROUPS.filter((g) => !covered.has(g))})`);
  // traps: each look-alike must be separated
  const has = (smi, g) => classify(smi).includes(g);
  ok(has('CC(C)=O', 'ketone') && !has('CC(C)=O', 'aldehyde'), 'acetone is a ketone, not an aldehyde');
  ok(has('CCC=O', 'aldehyde') && !has('CCC=O', 'ketone'), 'propanal is an aldehyde, not a ketone');
  ok(has('CC(=O)OC', 'ester') && !has('CC(=O)OC', 'ether') && !has('CC(=O)OC', 'ketone') && !has('CC(=O)OC', 'acid'), 'methyl acetate is an ester only');
  ok(has('COC', 'ether') && !has('COC', 'ester'), 'dimethyl ether is an ether, not an ester');
  ok(has('CC(=O)O', 'acid') && !has('CC(=O)O', 'alcohol') && !has('CC(=O)O', 'ester'), 'acetic acid is an acid, not an alcohol or ester');
  ok(has('CCO', 'alcohol') && !has('CCO', 'acid') && !has('CCO', 'ether'), 'ethanol is an alcohol');
  ok(has('CN', 'amine') && !has('CN', 'amide'), 'methylamine is an amine');
  ok(has('CC(N)=O', 'amide') && !has('CC(N)=O', 'amine'), 'acetamide is an amide, not an amine');
  ok(has('CC#N', 'nitrile') && !has('CC#N', 'amine') && !has('CC#N', 'alkyne'), 'acetonitrile is a nitrile only');
  ok(has('CC#C', 'alkyne') && !has('CC#C', 'nitrile'), 'propyne is an alkyne');
  ok(!has('c1ccccc1', 'alkene') && has('c1ccccc1', 'arene'), 'benzene is an arene, not an alkene');
  ok(has('Oc1ccccc1', 'phenol') && !has('Oc1ccccc1', 'alcohol'), 'phenol OH is not labelled alcohol');
  ok(has('CCSCC', 'sulfide') && !has('CCSCC', 'thiol') && has('CCS', 'thiol') && !has('CCS', 'sulfide'), 'thiol vs sulfide');
  ok(!has('CCCC', 'alcohol') && classify('CCCC').join() === 'alkane' && classify('C1CCCCC1').join() === 'alkane', 'alkanes (chain and ring) have no functional group');
  ok(classify('CCO').indexOf('alkane') === -1 && classify('C=C').indexOf('alkane') === -1, 'heteroatoms and pi bonds are never alkane');
  // group atoms: exact atom sets
  eq(matchGroup('CCC(C)=O', 'ketone'), [2, 4], 'butanone ketone atoms C2, O4');
  eq(matchGroup('CC(=O)OCC', 'ester'), [1, 2, 3], 'ethyl acetate ester atoms C1, =O2, O3');
  eq(matchGroup('CC(=O)Nc1ccc(O)cc1', 'amide'), [1, 2, 3], 'paracetamol amide atoms');
  eq(matchGroup('CC=CC(C)O', 'alkene'), [1, 2], 'pentenol alkene atoms');
  eq(matchGroup('CC=CC(C)O', 'alcohol'), [3, 5], 'pentenol alcohol atoms');
  eq(allMatches('CCOCC', 'ether').length, 1, 'diethyl ether: one ether instance');
  eq(allMatches('OCCO', 'alcohol').length, 2, 'ethylene glycol: two alcohol instances (not usable for tapping)');
}

// ---- formula and H-count helpers
{
  eq(formulaOf('CC(C)CCO'), 'C5H12O', 'formula of isoamyl alcohol'); eq(formulaOf('CCC(=O)CC'), 'C5H10O', 'formula pentan-3-one');
  eq(hill(formulaCounts('Cc1ccccc1')), 'C7H8', 'toluene C7H8'); eq(formulaOf('CC(=O)Oc1ccccc1C(=O)O'), 'C9H8O4', 'aspirin C9H8O4');
  eq(formulaOf('CCCl'), 'C2H5Cl', 'chloroethane'); eq(formulaOf('CC#N'), 'C2H3N', 'acetonitrile');
  for (const e of FG_POOL) { eq(formulaOf(e.smiles), hillIndependent(e.smiles), `formula ${e.name} agrees with the add-Hs route`); }
  eq([hCount('CC(Cl)CCC', 1), hCount('O=C1CCCCC1', 1), lineCount('O=C1CCCCC1', 1), hCount('C1=CCCCC1', 0)], [1, 0, 4, 1], 'known H counts');
  ok(['C4H8O', 'C₄H₈O', 'OC4H8', 'H8C4O', 'C4 H8 O'].every((x) => gradeFormula('C4H8O', x).ok), 'typed formula: subscripts, plain digits, any element order, spaces');
  ok(!gradeFormula('C4H8O', 'C4H10O').ok && /you wrote 10 H but the structure has 8/.test(gradeFormula('C4H8O', 'C4H10O').diagnosis), 'typed formula: wrong H count diagnosed');
  ok(!gradeFormula('C4H8O', 'C4H8').ok && /O is missing/.test(gradeFormula('C4H8O', 'C4H8').diagnosis), 'typed formula: missing O diagnosed');
  ok(gradeFormula('C4H8O', 'C4H8').ok === false && gradeFormula('C4H8O', 'banana').malformed === true && gradeFormula('C4H8O', '4C').malformed === true, 'typed formula: malformed input flagged');
  ok(gradeFormula('C5H12O', 'C5H12O1').ok && gradeFormula('C2H5Cl', 'C2H5Cl').ok && !gradeFormula('C2H5Cl', 'C2H5CL').ok, 'typed formula: explicit 1 ok, Cl case-sensitive');
  ok(parseFormula('C2H6O') && sameCounts(parseFormula('C2H6O'), { C: 2, H: 6, O: 1 }), 'parseFormula counts');
  // condensed formulas
  const C = [['CH3CH2CH(OH)CH3', 'CCC(C)O'], ['(CH3)2CHOH', 'CC(C)O'], ['CH3CH=CHCH2CH3', 'CC=CCC'], ['CH3C(=O)CH3', 'CC(C)=O'], ['CH3CH2C(=O)OCH3', 'CCC(=O)OC'], ['CH3C(CH3)2CH3', 'CC(C)(C)C'], ['CH3CH2NH2', 'CCN'], ['CH3CH2CH2Cl', 'CCCCl'], ['CH3C#N', 'CC#N']];
  C.forEach(([a, b]) => eq(canon(condensedToSmiles(a)), canon(b), `condensed ${a}`));
  ['CHO', 'CH3CH2CH3(OH)', 'CH3CH2(', 'CH4CH3'].forEach((bad) => { let threw = false; try { condensedToSmiles(bad); } catch (e) { threw = true; } ok(threw, `condensed parser rejects ${bad}`); });
}

// ---- skeletal-fg generator
{
  const kinds = new Set();
  for (const skill of [null, 'skeletal', 'functional-groups']) {
    const probs = generate('skeletal-fg', 50, { skill });
    ok(probs.length === 50, `skeletal-fg ${skill} count`);
    for (const p of probs) {
      kinds.add(p.kind + ':' + p.skill + (p.formula ? ':formula' : ''));
      const t = `skeletal-fg ${skill}/${p.kind}:${p.smiles}`;
      ok(p.prompt && p.derive && p.hints.length === 2 && p.hints.every((x) => x.length > 5), `${t} fields`);
      ok(TAXONOMY.has(p.skill), `${t} skill tag`);
      ok(p.skill === (skill || p.skill) && (skill === null || p.skill === skill), `${t} respects requested skill`);
      const entry = FG_POOL.find((e) => e.smiles === p.smiles);
      ok(!!entry, `${t} molecule from the pool`);
      if (p.kind === 'input' && !p.formula) {
        const a = analyze(p.smiles).atoms[p.highlight[0]];
        ok(a.sym === 'C', `${t} H-count asks about carbon`);
        ok(p.answer === hNeighboursIndependent(p.smiles, p.highlight[0]), `${t} H count ${p.answer} == add-Hs recompute`);
        ok(p.answer === 4 - lineCount(p.smiles, p.highlight[0]), `${t} H = 4 - lines`);
        ok(checkInput({ answer: p.answer, diagnose: p.wrong }, String(p.answer)).ok, `${t} answer accepted`);
        (p.wrong || []).forEach((w) => ok(w.match !== p.answer && checkInput({ answer: p.answer, diagnose: p.wrong }, String(w.match)).diagnosis === w.why, `${t} wrong routes`));
      } else if (p.kind === 'input') {
        ok(p.answer === hillIndependent(p.smiles), `${t} formula ${p.answer} == add-Hs recompute`);
        const st = { answer: p.answer, formula: true, diagnose: p.wrong, skill: p.skill };
        ok(checkInput(st, p.answer).ok && checkInput(st, p.answer.replace(/\d+/g, (d) => d.split('').map((x) => '₀₁₂₃₄₅₆₇₈₉'[x]).join(''))).ok, `${t} formula accepted with plain digits and subscripts`);
        ok(!checkInput(st, p.answer + 'H').ok && checkInput(st, p.answer + 'H').diagnosis.length > 10, `${t} wrong formula gets a diagnosis`);
      } else if (p.kind === 'choice') {
        ok(p.options.length === 4 && p.options.filter((o) => o.correct).length === 1 && p.options.every((o) => o.why.length > 10), `${t} one correct of 4, all with why`);
        const right = p.options.find((o) => o.correct);
        const present = classify(p.smiles);
        const gid = GROUP_IDS.find((g) => (g === 'alkane' ? 'alkane (no functional group)' : FG[g].name) === right.text);
        ok(!!gid && present.includes(gid), `${t} correct option is a group the classifier finds (${right.text})`);
        if (gid !== 'alkane') eq(p.highlight, matchGroup(p.smiles, gid), `${t} highlight = SMARTS atoms of the answer`);
        const names = p.options.map((o) => o.text);
        ok(new Set(names).size === 4, `${t} distinct options`);
        p.options.filter((o) => !o.correct).forEach((o) => {
          const g = GROUP_IDS.find((x) => (x === 'alkane' ? 'alkane (no functional group)' : FG[x].name) === o.text);
          ok(g && !present.includes(g) && !(entry.avoid || []).includes(g), `${t} distractor ${o.text} is truly absent`);
        });
      } else if (p.kind === 'groupfind') {
        ok(singleGroups(p.smiles).includes(p.config.group), `${t} group has a unique instance`);
        ok(gf.isUnique(p.config) && gf.grade(p.config, gf.solution(p.config)).ok, `${t} group-finder solution accepted`);
        eq(gf.solution(p.config), matchGroup(p.smiles, p.config.group), `${t} solution = SMARTS match`);
        ok(p.answer === gf.solution(p.config).join(','), `${t} answer string`);
        ok(!gf.grade(p.config, [gf.solution(p.config)[0]]).ok || gf.solution(p.config).length === 1, `${t} partial rejected`);
      } else ok(false, 'unknown skeletal-fg kind ' + p.kind);
    }
  }
  ok(['input:skeletal', 'input:skeletal:formula', 'choice:functional-groups', 'groupfind:functional-groups'].every((k) => kinds.has(k)), 'skeletal-fg covers all four task types');
  const f1 = generate('skeletal-fg', 6).map((p) => p.smiles).join('|'), f2 = generate('skeletal-fg', 6).map((p) => p.smiles).join('|');
  ok(f1.length > 0 && f2.length > 0, 'skeletal-fg fresh runs');
  const seen = new Set(); for (let i = 0; i < 20; i++) generate('skeletal-fg', 3).forEach((p) => seen.add(p.smiles));
  ok(seen.size > 8, `skeletal-fg varies molecules (${seen.size})`);
  ok(generatorForSkill('skeletal') === 'skeletal-fg' && generatorForSkill('functional-groups') === 'skeletal-fg' && generatorForSkill('hybridization') === 'shape-basic' && generatorForSkill('pka-direction') === 'acid-base', 'generatorForSkill routes skeletal and functional-groups');
  // the highlighted-atom count in name problems: every quiz group can be asked
  const asked = new Set(); let seedFG = 12345; const rngFG = () => (seedFG = (seedFG * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 1500; i++) generate('skeletal-fg', 1, { skill: 'functional-groups', rng: rngFG }).forEach((p) => { if (p.kind === 'choice') asked.add(p.options.find((o) => o.correct).text); });
  ok(QUIZ_GROUPS.filter((g) => g !== 'alkane').every((g) => asked.has(FG[g].name)), `name task reaches every group (${[...asked].length})`);
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

// ---- Lesson 05: naming engine, OPSIN round-trips, hand-checked fixture, widget, generator, lesson specifics
{
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-names-'));
  /** OPSIN (py2opsin) name -> SMILES for a batch of names; '' where OPSIN cannot parse. */
  function opsin(names) {
    const uniq = [...new Set(names)];
    const inp = path.join(tmp, 'in.json'), out = path.join(tmp, 'out.json');
    fs.writeFileSync(inp, JSON.stringify(uniq));
    execFileSync('python3', [path.join(HERE, '..', 'tools', 'check_names.py'), inp, out], { stdio: ['ignore', 'ignore', 'ignore'] });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  }
  const tagChecks = [];
  const queue = []; // {name, smiles, label}: every name is checked against OPSIN in one batch at the end of this block
  const expectOpsin = (name, smiles, label) => queue.push({ name, smiles, label });

  // ---- (2) hand-checked fixture
  const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'alkane-names.json'), 'utf8')).names;
  ok(fx.length >= 25, `fixture has at least 25 names (${fx.length})`);
  const fxSmiles = new Set(fx.map((f) => canon(f.smiles)));
  ok(fxSmiles.size === fx.length, 'fixture structures are all different');
  let fxMatch = 0;
  for (const f of fx) {
    const want = { new: f.new, old: f.old || f.new };
    const got = nameBoth(f.smiles);
    const same = !!got && got.new === want.new && got.old === want.old;
    if (same) fxMatch++;
    ok(same, `fixture ${f.smiles}: engine ${JSON.stringify(got)} vs hand-checked ${JSON.stringify(want)}`);
    expectOpsin(want.new, f.smiles, 'fixture new');
    if (want.old !== want.new) expectOpsin(want.old, f.smiles, 'fixture old');
  }
  for (const must of ['4-ethyl-2-methylhexane', '2,2,4-trimethylpentane', '3-methylhexane', '3-ethyl-2-methylpentane', '1,1-dimethylcyclohexane', '1-ethyl-3-methylcyclopentane', 'propylcyclohexane', '1-tert-butyl-4-methylcyclohexane', '2-methyl-4-(propan-2-yl)heptane'])
    ok(fx.some((f) => f.new === must), `fixture includes the trap ${must}`);
  ok(fx.some((f) => f.old === '4-isopropyl-2-methylheptane' && f.new === '2-methyl-4-(propan-2-yl)heptane'), 'fixture has the old/new pair isopropyl vs propan-2-yl');

  // ---- scope: outside it returns null
  for (const bad of ['CCO', 'C=C', 'C#C', 'c1ccccc1', 'CC(Cl)C', 'C1CC1C1CC1', 'C[C@H](F)CC', 'C1CC2CCC1C2', '[CH3+]', 'CC.CC', 'not a smiles', 'CC(C)C(C)C1CCCCC1'])
    ok(nameAlkane(bad, 'new') === null, `out of scope returns null: ${bad}`);

  // ---- independent checks on the structure -> name logic (no OPSIN, no engine code): a brute-force longest path
  function longestPathLen(smi) {
    const info = analyze(smi); const adj = info.atoms.map((a) => a.nbrs);
    let best = 0;
    const dfs = (v, seen) => { best = Math.max(best, seen.size); for (const w of adj[v]) if (!seen.has(w)) { seen.add(w); dfs(w, seen); seen.delete(w); } };
    info.atoms.forEach((_, i) => dfs(i, new Set([i])));
    return best;
  }
  for (const smi of ['CC(C)CC(CC)CC', 'CCC(C)CCC', 'CC(C)C(CC)CC', 'CCC(CC)C(C)(C)CCC', 'CC(C)(C)CC(C)C', 'CCCC(CCC)C(C)(C)C', 'CC(C)(C)C(CC)CCC']) {
    const pi = parentInfo(smi);
    ok(pi.L === longestPathLen(smi), `longest chain of ${smi}: engine ${pi.L} vs brute force ${longestPathLen(smi)}`);
    ok(pi.best.every((p) => p.length === pi.L) && pi.longest.every((p) => p.length === pi.L), `${smi} candidate chains all have the longest length`);
  }

  // ---- typed answers: either style, any case/spaces/hyphens
  ok(normName(' 2-Methyl-4-(Propan-2-yl) HEPTANE ') === '2methyl4propan2ylheptane', 'normName ignores case, spaces, hyphens, brackets');
  const IP = 'CC(C)CC(CCC)C(C)C';
  ok(matchesName(IP, '2-methyl-4-(propan-2-yl)heptane') && matchesName(IP, '4-Isopropyl-2-methylheptane') && matchesName(IP, '2 methyl 4 propan-2-yl heptane') && matchesName(IP, '4 isopropyl 2 methyl heptane'), 'both styles accepted, spacing/case/hyphens normalized');
  ok(!matchesName(IP, '2-methyl-4-isopropylheptane') && !matchesName(IP, '4-(propan-2-yl)-2-methylheptane') && !matchesName(IP, '4-isopropyl-6-methylheptane'), 'wrong order or wrong end rejected');
  eq(acceptedNames('CC(C)CC(CC)CC'), ['4-ethyl-2-methylhexane'], 'identical styles are stored once');
  eq(acceptedNames(IP), ['2-methyl-4-(propan-2-yl)heptane', '4-isopropyl-2-methylheptane'], 'accepted names for the isopropyl case');
  ok(carbonClass('CC(C)(C)CC(C)C', 1) === 4 && carbonClass('CC(C)(C)CC(C)C', 4) === 2 && carbonClass('CC(C)(C)CC(C)C', 5) === 3 && carbonClass('CC(C)(C)CC(C)C', 0) === 1, 'carbon classes of 2,2,4-trimethylpentane');

  // ---- structure building round trips (buildSmiles -> nameAlkane -> same carbon count) over every substituent
  for (const id of SUB_IDS) {
    const s = buildSmiles({ kind: 'ring', size: 6, subs: [{ id, loc: 1 }] });
    const nb = nameBoth(s);
    ok(!!nb, `ring with ${id} is in scope`);
    expectOpsin(nb.new, s, `ring ${id} new`); expectOpsin(nb.old, s, `ring ${id} old`);
  }

  // ---- (1) random molecules: every generated name (both styles) must come back from OPSIN as the same structure
  const rng = Math.random;
  const mols = [];
  for (let i = 0; i < 150; i++) mols.push(randomMolecule(rng));
  let nulls = 0;
  for (const smi of mols) {
    const nb = nameBoth(smi);
    if (!nb) { nulls++; continue; }
    expectOpsin(nb.new, smi, 'random new'); expectOpsin(nb.old, smi, 'random old');
    const info = alkaneInfo(smi, 'new');
    const carbons = analyze(smi).atoms.length;
    ok(info.parent.size + info.subs.reduce((t, x) => t + (subInfo(x.id).size), 0) === carbons, `carbon bookkeeping for ${smi} (${nb.new})`);
    const f = hillIndependent(smi);
    ok(f === (info.kind === 'ring' ? `C${carbons}H${2 * carbons}` : `C${carbons}H${2 * carbons + 2}`), `${smi} formula ${f} is CnH2n(+2)`);
  }
  ok(nulls === 0, `generator only emits molecules the engine names (${nulls} nulls out of ${mols.length})`);
  ok(mols.some((m) => parseAlkane(m).ring) && mols.some((m) => !parseAlkane(m).ring), 'both acyclic and ring molecules appear');
  for (const smi of mols.filter((m) => !parseAlkane(m).ring)) { const n = analyze(smi).atoms.length; ok(n >= 5 && n <= 9, `acyclic problem has 5-9 carbons (${smi}: ${n})`); }

  // ---- mastery generator "alkane-names": 50 problems (fresh each run)
  const probs = generate('alkane-names', 50);
  ok(probs.length === 50, 'alkane-names makes 50 problems');
  const kinds = new Set();
  for (const p of probs) {
    kinds.add(p.kind + ':' + (p.name ? 'name' : p.target ? 'pick' : 'class'));
    ok(p.prompt && p.derive && p.hints.length === 2 && p.hints.every((x) => x.length > 5) && p.skill === 'naming' && TAXONOMY.has(p.skill), 'names gen fields');
    if (p.name) {
      const nb = nameBoth(p.smiles);
      ok(!!nb && p.answer === nb.new && (p.accept.length === 0 ? nb.old === nb.new : p.accept[0] === nb.old), `name task answer from engine ${p.smiles}`);
      const st = { answer: p.answer, accept: p.accept, name: p.name, diagnoseFn: p.diagnoseFn, diagnose: p.wrong, fallback: p.fallback, skill: p.skill };
      ok(checkInput(st, nb.new).ok && checkInput(st, nb.old).ok && checkInput(st, nb.new.toUpperCase().replace(/-/g, ' ')).ok, `name task accepts both styles, case, spaces and hyphens ${p.smiles}`);
      ok(!checkInput(st, nb.new + 'x').ok && !checkInput(st, '').ok, 'name task rejects a wrong name');
      for (const w of p.wrong) {
        const r = checkInput(st, w.match);
        ok(!r.ok && r.diagnosis === w.why, `wrong variant ${w.match} routes to its diagnosis`);
        ok(w.why.length > 30, 'wrong variant has a specific diagnosis');
        expectOpsin(w.match, p.smiles, 'wrong-variant is an alternative (non-preferred) name of the same molecule');
      }
      ok(typeof checkInput(st, 'hexane').diagnosis === 'string' && checkInput(st, 'hexane').diagnosis.length > 20, 'typed nonsense still gets a diagnosis');
    } else if (p.target) {
      ok(p.options.length === 4 && p.options.filter((o) => o.correct).length === 1, 'pick task: 4 options, one correct');
      const cs = p.options.map((o) => canon(o.smiles));
      ok(new Set(cs).size === 4 && cs.every(Boolean), 'pick task: options are distinct valid structures');
      ok(p.options.every((o) => (canon(o.smiles) === canon(p.target)) === !!o.correct), 'pick task: graded by canonical SMILES');
      ok(p.options.every((o) => o.why && o.why.length > 20) && p.options.every((o) => nameBoth(o.smiles)), 'pick task: every option has a why and is in scope');
      const m = /new="([^"]+)" old="([^"]+)"/.exec(p.promptHtml);
      ok(!!m, 'pick task prompt carries both styles');
      expectOpsin(m[1], p.target, 'pick prompt new'); expectOpsin(m[2], p.target, 'pick prompt old');
      ok(p.options.filter((o) => !o.correct).every((o) => nameBoth(o.smiles).new !== m[1]), 'pick distractors are different compounds');
    } else {
      const idx = p.highlight[0];
      const info = atomsIndependent(p.smiles);
      const nC = info[idx].bondsTo.filter((k) => info[k].sym === 'C').length;
      ok(p.options.filter((o) => o.correct).length === 1 && p.options.find((o) => o.correct).text.startsWith(nC + '°'), `class task ${p.smiles} atom ${idx}: ${nC} carbon neighbours`);
      ok(p.options.every((o) => o.why.length > 20), 'class task whys');
    }
  }
  ok(kinds.size >= 3, `name, pick and class tasks all appear (${[...kinds]})`);
  const run = () => generate('alkane-names', 6).map((p) => p.smiles || p.target).join('|');
  ok(new Set([run(), run(), run(), run(), run()]).size > 1, 'alkane-names is fresh each run');
  ok(generatorForSkill('naming') === 'alkane-names', 'weak-spot "naming" routes to the alkane-names generator');

  // ---- chain-tracer widget
  {
    const t10 = { smiles: 'CC(C)CC(CC)CC', task: 'trace' };
    const sol = ct.solution(t10);
    ok(ct.grade(t10, sol).ok, 'tracer accepts a longest chain');
    ok(ct.grade(t10, []).empty === true, 'tracer empty is not ok');
    const pi = parentInfo(t10.smiles);
    ok(pi.best.every((c) => ct.grade(t10, c).ok), 'tracer accepts every longest chain with the most branches');
    ok(!ct.grade(t10, sol.slice(0, 4)).ok && /early|shorter/.test(ct.grade(t10, sol.slice(0, 4)).diagnosis), 'tracer rejects a chain that stops early');
    ok(/shorter chain/.test(ct.grade(t10, [0, 1, 3, 4]).diagnosis) || /early/.test(ct.grade(t10, [0, 1, 3, 4]).diagnosis), 'tracer shorter-chain diagnosis');
    ok(/not one unbroken chain/.test(ct.grade(t10, [0, 6]).diagnosis), 'tracer rejects a disconnected pick');
    ok(/cannot fork/.test(ct.grade(t10, [1, 0, 2, 3]).diagnosis), 'tracer rejects a forked pick');
    const t11 = { smiles: 'CC(C)C(CC)CC', task: 'trace' };
    const lens = parentInfo(t11.smiles);
    ok(lens.L === 5 && lens.longest.length > lens.best.length, 'L05 tie case: more 5-carbon chains than the ones with most branches');
    const loser = lens.longest.find((p) => !lens.best.some((b) => b.length === p.length && b.every((x) => p.includes(x))));
    ok(!!loser && !ct.grade(t11, loser).ok && /more branches/.test(ct.grade(t11, loser).diagnosis), 'tracer: equal-length chain with fewer branches loses the tie');
    const t12 = { smiles: 'CC(C)CC(CC)CC', task: 'number' };
    const info = alkaneInfo(t12.smiles, 'new');
    const ends = numberingEnds(t12.smiles);
    ok(ends.length >= 1 && ends.every((e) => ct.grade(t12, [e]).ok), 'number: the correct end is accepted');
    const c1 = info.parentAtoms[0], other = info.parentAtoms[info.parentAtoms.length - 1];
    ok(ends.includes(c1) && !ends.includes(other) && !ct.grade(t12, [other]).ok, 'number: the other end is rejected');
    const dg = ct.grade(t12, [other]).diagnosis;
    ok(/3, 5/.test(dg) && /2, 4/.test(dg), 'number: diagnosis shows the locants from each end');
    eq(locantsFrom(t12.smiles, c1), [2, 4], 'number: locants from the right end');
    eq(locantsFrom(t12.smiles, other), [3, 5], 'number: locants from the wrong end');
    ok(!ct.grade(t12, [0, 0].length ? [999] : []).ok, 'number: an atom off the chain is rejected');
    const mid = info.parentAtoms[2];
    ok(!ct.grade(t12, [mid]).ok && /end/.test(ct.grade(t12, [mid]).diagnosis), 'number: a middle carbon is not C1');
    const t17 = { smiles: 'CCCC1CCCC1', task: 'parent' };
    const pr = parentInfo(t17.smiles);
    ok(pr.kind === 'ring' && pr.ringSize === 5 && pr.chainLen === 3, 'parent: ring 5 vs chain 3 -> ring');
    ok(ct.grade(t17, ct.solution(t17)).ok && ct.grade(t17, pr.ring).ok, 'parent: whole ring accepted');
    ok(!ct.grade(t17, pr.chains[0]).ok && /ring is at least as big/.test(ct.grade(t17, pr.chains[0]).diagnosis), 'parent: picking the chain is rejected with a reason');
    ok(!ct.grade(t17, [...pr.ring, ...pr.chains[0]]).ok, 'parent: both together rejected');
    const flip = { smiles: 'CCCCC1CC1', task: 'parent' };
    const pf = parentInfo(flip.smiles);
    ok(pf.kind === 'chain' && pf.chainLen === 4 && pf.ringSize === 3 && ct.grade(flip, pf.chains[0]).ok && !ct.grade(flip, pf.ring).ok && /chain/.test(ct.grade(flip, pf.ring).diagnosis), 'parent: chain 4 vs ring 3 -> chain');
    ok(parentInfo('CCCC1CC1').kind === 'ring', 'parent: equal ring and chain -> ring');
  }

  // ---- Lesson 05 specifics
  {
    const l = LESSONS.find((x) => x.id === '05');
    ok(l.steps.length >= 15 && l.steps.length <= 18, `L05 has 15-18 steps (${l.steps.length})`);
    ok(l.drawing === 'skeletal' && l.minutes === 25 && l.chapter === 2, 'L05 drawing skeletal, 25 min, chapter 2');
    eq(l.sections, ['2.2', '2.3', '2.7'], 'L05 sections');
    eq(l.mastery, { count: 3, generator: 'alkane-names' }, 'L05 mastery uses alkane-names');
    ok(l.steps[0].type === 'predict' && l.steps.findIndex((s) => s.type === 'explain') > 1, 'L05 acts before it explains');
    ok(l.steps.every((s) => TYPES.has(s.type)), 'L05 step types');
    ok(l.steps.every((s) => s.skill === 'naming'), 'L05 steps tagged naming');
    // (a) chain tracer, (b) numbering, (c) worked, (d) name -> structure, (e) carbon classes, (f) 3D isomers
    const tr = l.steps.filter((s) => s.widget === 'chain-tracer');
    ok(tr.some((s) => s.config.task === 'trace') && tr.some((s) => s.config.task === 'number') && tr.some((s) => s.config.task === 'parent'), 'L05 (a)(b) chain-tracer trace, number and parent steps');
    for (const s of tr) {
      const c = s.config;
      ok(ct.grade(c, ct.solution(c)).ok && ct.grade(c, []).empty, `${s.id} tracer solution accepted`);
      if (c.task === 'trace') ok(parentInfo(c.smiles).best.every((b) => ct.grade(c, b).ok), `${s.id} every best chain accepted`);
    }
    ok(tr.find((s) => s.config.task === 'trace' && s.config.smiles === 'CC(C)C(CC)CC'), 'L05 tie-rule tracing step');
    const w = l.steps.find((s) => s.type === 'worked');
    ok(w && w.moves.length >= 5 && /IUPAC name/.test(w.problem) && alkaneInfo(w.smiles, 'new').name === '3-ethyl-4,4-dimethylheptane', 'L05 (c) worked example: chain, number, branches, alphabetical, assemble');
    w.moves.forEach((m) => { if (m.figure) ok(canon(m.figure.smiles) !== null && m.figure.highlight.every((i) => i < analyze(m.figure.smiles).atoms.length), 'worked figure valid'); });
    const wp = w.moves[0].figure.highlight;
    ok(wp.length === 7 && parentInfo(w.smiles).best.some((c) => c.length === wp.length && c.every((x) => wp.includes(x))), 'worked figure highlights a longest chain (7 carbons)');
    const pickStep = l.steps.find((s) => s.type === 'choice' && s.options.length === 4 && s.options.every((o) => o.smiles) && /<name/.test(s.prompt));
    ok(!!pickStep, 'L05 (d) name -> structure choice with 4 drawn options');
    const pm2 = /new="([^"]+)" old="([^"]+)"/.exec(pickStep.prompt);
    const correct = pickStep.options.find((o) => o.correct);
    ok(new Set(pickStep.options.map((o) => canon(o.smiles))).size === 4, 'L05 (d) options distinct');
    expectOpsin(pm2[1], correct.smiles, 'L05 pick step name');
    ok(pickStep.options.filter((o) => !o.correct).every((o) => nameBoth(o.smiles) && nameBoth(o.smiles).new !== pm2[1]), 'L05 (d) distractors are other compounds');
    ok(l.steps.some((s) => s.type === 'choice' && s.highlight && /primary/.test(s.prompt) && carbonClass(s.smiles, s.highlight[0]) === 4 && /Quaternary/.test(s.options.find((o) => o.correct).text)), 'L05 (e) carbon class step recomputed');
    const td = l.steps.find((s) => s.visual && s.visual.config.mol === 'butane' && s.visual.config.compare === 'isobutane');
    ok(!!td && td.type === 'choice', 'L05 (f) 3D butane vs isobutane');
    ok(l.steps.some((s) => s.type === 'input' && s.derive && s.derive.quantity === 'formula' && s.formula), 'L05 CnH2n+2 formula step recomputed');
    // IUPAC toggle: every <name> tag matches the engine in both styles, names come from the engine, and a step shows the switch
    ok(l.steps.some((s) => s.type === 'choice' && /switch/i.test(s.prompt) && /<name /.test(s.prompt)), 'L05 has a step that shows the New/Old toggle');
    let tags = 0;
    for (const s of l.steps) {
      const html = htmlStrings(s).join(' ');
      const ref = s.smiles || (s.config && s.config.smiles) || (s.options || []).find((o) => o.correct && o.smiles)?.smiles;
      for (const m of html.matchAll(/<name new="([^"]*)" old="([^"]*)"/g)) {
        tags++;
        if (SUB_IDS.some((id) => subInfo(id).new === m[1] && subInfo(id).old === m[2])) continue; // an alkyl group, not a molecule
        tagChecks.push({ id: s.id, n: m[1], o: m[2], ref });
        expectOpsin(m[1], null, 'tag new'); expectOpsin(m[2], null, 'tag old');
      }
    }
    ok(tags >= 6, `L05 renders names through <name new old> (${tags} tags)`);
    for (const s of l.steps.filter((x) => x.type === 'input' && x.name)) {
      const nb = nameBoth(s.smiles);
      ok(s.answer === nb.new && (nb.old === nb.new || (s.accept || []).includes(nb.old)), `${s.id} typed name: answer new + accept old from the engine`);
      ok(checkInput(s, nb.new).ok && checkInput(s, nb.old).ok && checkInput(s, nb.old.toUpperCase()).ok, `${s.id} accepts both styles`);
      ok(typeof checkInput(s, 'octane').diagnosis === 'string' && checkInput(s, 'octane').diagnosis.length > 20, `${s.id} gives a diagnosis for an unlisted name`);
      expectOpsin(nb.new, s.smiles, `${s.id} new`); expectOpsin(nb.old, s.smiles, `${s.id} old`);
      for (const d of s.diagnose || []) { const r = checkInput(s, d.match); ok(!r.ok && r.diagnosis === d.why && !matchesName(s.smiles, d.match), `${s.id} diagnose ${d.match} is rejected with its own reason`); }
    }
    eq(l.useIt.book, ['2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.18', '2.19', '2.29', '2.41', '2.43', '2.45', '2.46', '2.48', '2.49', '2.50', '2.56'], 'L05 book problems');
    ok(l.useIt.endFrom === 29, 'L05 end-of-chapter exercises start at 2.29');
    // style-dependent substituent names appear only through <name new old> (steps s08 and s15 compare the two styles on purpose)
    for (const s of l.steps.filter((x) => !['s08', 's15'].includes(x.id))) {
      const text = htmlStrings(s).join(' ').replace(/<name[^>]*><\/name>/g, '');
      ok(!/propan-2-yl|butan-2-yl|2-methylpropyl|isopropyl|isobutyl|sec-butyl/i.test(text), `${s.id} has no hard-coded style-dependent name outside <name>`);
    }
  }

  // ---- 3D butane and isobutane
  {
    ok(models.isobutane && canon(models.isobutane.molblock) === canon('CC(C)C') && canon(models.butane.molblock) === canon('CCCC'), '3D butane and isobutane match their SMILES');
    ok(models.isobutane.smiles === 'CC(C)C', 'isobutane atom order: C0, central C1, C2, C3');
    const mb = models.isobutane.molblock.split('\n');
    const bonds = []; const nA = parseInt(mb[3].slice(0, 3), 10), nB = parseInt(mb[3].slice(3, 6), 10);
    for (let i = 0; i < nB; i++) { const l2 = mb[4 + nA + i]; bonds.push([parseInt(l2.slice(0, 3), 10) - 1, parseInt(l2.slice(3, 6), 10) - 1]); }
    const sym = (i) => mb[4 + i].slice(31, 34).trim();
    const cn = (i) => bonds.filter((b) => b.includes(i)).map((b) => (b[0] === i ? b[1] : b[0])).filter((k) => sym(k) === 'C').length;
    ok(cn(1) === 3 && [0, 2, 3].every((i) => cn(i) === 1), 'isobutane: central carbon has three carbon neighbours');
    const ang = [[0, 1, 2], [0, 1, 3], [2, 1, 3]].map(([a, c, b]) => modelAngle(models.isobutane.molblock, c, a, b));
    ok(ang.every((x) => x > 106 && x < 114), `isobutane C-C-C angles tetrahedral (${ang.map((x) => x.toFixed(1))})`);
    ok(formula('CCCC') === formula('CC(C)C'), 'butane and isobutane share a formula (constitutional isomers)');
    ok(canon('CCCC') !== canon('CC(C)C'), 'butane and isobutane are different compounds');
  }

  // ---- OPSIN round trips (one batch): every name above means the structure it came from
  {
    const res = opsin(queue.map((q) => q.name));
    let n = 0, good = 0;
    for (const q of queue) {
      n++;
      const out = res[q.name];
      const match = !!out && (q.smiles === null ? canon(out) !== null : canon(out) === canon(q.smiles));
      if (match) good++;
      ok(match, `OPSIN round-trip (${q.label}): "${q.name}" -> ${out || 'unparsed'} expected ${canon(q.smiles)}`);
    }
    // every <name new old> tag in the lesson: both styles resolve (OPSIN) to one structure, and the engine writes exactly this pair for it
    for (const t of tagChecks) {
      const a = res[t.n], b = res[t.o];
      ok(!!a && !!b && canon(a) === canon(b), `${t.id} tag ${t.n} / ${t.o}: both styles are the same compound in OPSIN`);
      const nb = a && nameBoth(canon(a));
      // either the engine's own pair, or a deliberately non-preferred name of the molecule drawn in the step (s11 shows what NOT to call it)
      const engineOwn = !!nb && nb.new === t.n && nb.old === t.o;
      const altOfRef = !!t.ref && canon(a) === canon(t.ref) && !!nameBoth(t.ref) && nameBoth(t.ref).new !== t.n;
      ok(engineOwn || altOfRef, `${t.id} tag ${t.n} / ${t.o} equals the engine's names for that compound (${JSON.stringify(nb)})`);
      if (t.ref) ok(canon(a) === canon(t.ref), `${t.id} tag names the molecule drawn in the step`);
    }
    console.log(`  OPSIN round-trips: ${good}/${n} names (${new Set(queue.map((q) => q.name)).size} distinct); fixture matches: ${fxMatch}/${fx.length}`);
    ok(n >= 200 && good === n, `OPSIN agreed on all ${n} names`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ---- Lesson 06: 3D geometry (ethane dihedrals, chair angles, axial/equatorial, ring flip, cis/trans), widgets, chairs generator (tests/lesson06.mjs)
await lesson06({ ok, eq });

// ---- Lesson 07: alkene naming engine (OPSIN), CIP E/Z (RDKit new CIP labeler), cip-ranker widget, generator, lesson steps (tests/lesson07.mjs)
await lesson07({ ok, eq });

// ---- Lesson 08: mechanism-player data + arrow application, energy-diagram logic, site table, reaction kinds, `mechanism-basics` generator, lesson steps (tests/lesson08.mjs)
await lesson08({ ok, eq });

// ---- Lesson 09: reactions engine (HX / hydration, Markovnikov) vs Python RDKit and a hand-checked fixture, regiochemistry-aware arrow grading, widgets, `markovnikov` generator, lesson steps (tests/lesson09.mjs)
await lesson09({ ok, eq });

// ---- Lesson 10: stereo-aware alkene additions (X2, H2, RCO3H, epoxide + H3O+, KMnO4, polymers) vs Python RDKit 3D, hand-checked fixture with OPSIN, bromonium 3D model, mechanisms, cleave-it, reaction-lab, generator, lesson steps (tests/lesson10.mjs)
await lesson10({ ok, eq });

// ---- Lesson 11: resonance engine (forms vs Python RDKit ResonanceMolSupplier, traps, arrow diagnoses), conjugated dienes + HX (SMARTS recompute, OPSIN fixture), 3D butadiene, `resonance` generator, lesson steps (tests/lesson11.mjs)
await lesson11({ ok, eq });

// ---- Lesson 12: alkynes (HX / X2 / hydration / Lindlar / Pd vs Python RDKit incl. 3D geometry, hand-checked fixture with OPSIN, acetylide mechanisms, pKa step, synthesis-planner, reaction-lab, `alkynes` generator, lesson steps (tests/lesson12.mjs)
await lesson12({ ok, eq });

// ---- Lesson 13: benzene and electrophilic aromatic substitution (EAS products and resonance forms vs Python RDKit, balanced steps with the catalyst regenerated, hand-checked fixture with OPSIN, names, ring-position, planner, lab, `eas-basics` generator, lesson steps (tests/lesson13.mjs)
await lesson13({ ok, eq });

// ---- Lesson 14: substituent effects (directing groups vs Python RDKit with an independent table and SMARTS; the sigma-complex resonance argument vs ResonanceMolSupplier; side chains; hand-checked fixture with OPSIN), director-sort, ring-position attack mode, substituted-arene lab, planner order puzzles, `directors` generator, lesson steps (tests/lesson14.mjs)
await lesson14({ ok, eq });

// ---- Lesson 15: chirality and R/S (centers and labels vs Python RDKit rdCIPLabeler / FindMolChiralCenters, wedge drawings read back from coordinates, mirror images + Kabsch superposition, hand-checked fixture with OPSIN), mirror-pair, rs-assigner, stereocenter-finder, `rs` generator, lesson steps (tests/lesson15.mjs)
await lesson15({ ok, eq });

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
