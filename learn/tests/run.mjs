// node learn/tests/run.mjs  - validates every lesson, generator and widget target.
import { LESSONS, PLANNED } from '../lessons/index.js';
import { ready, canon, analyze, VALENCE } from '../engine/chem.js';
import { generate, POOL, formula } from '../engine/generators.js';
import { solutionState, initialState, evaluate, buildMolblock, bondOrderSum } from '../engine/widgets/lewis-core.js';
import { grade as stripGrade, expected as stripExpected } from '../engine/widgets/valence-strip.js';
import { modelAngle } from '../engine/widgets/model3d.js';
import models from '../data/3d/models.js';
import { checkInput } from '../engine/steps.js';
import * as store from '../engine/store.js';

const TAXONOMY = new Set(['valence-electrons', 'bond-count', 'lone-pairs', 'octet', 'multiple-bonds', 'formal-charge', 'electron-count-total', 'hybridization', 'polarity', 'pka-direction', 'curved-arrows', 'skeletal', 'functional-groups', 'naming', 'conformations', 'chairs', 'ez', 'mechanism', 'markovnikov', 'stereo-addition', 'resonance', 'eas', 'directors', 'synthesis', 'chirality', 'rs', 'stereo-relationships']);
const TYPES = new Set(['predict', 'choice', 'input', 'try', 'worked', 'explain']);
const GRADED = new Set(['choice', 'input', 'try']);

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; failures.push(msg); } }
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);

await ready();

/** Independent recompute of a derived quantity from SMILES. */
function recompute(d) {
  if (d.quantity === 'valence') return VALENCE[d.element];
  if (d.quantity === 'bonds') return d.element === 'H' ? 1 : 8 - VALENCE[d.element];
  const info = analyze(d.smiles);
  if (d.quantity === 'total') return info.totalValence;
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

ok(PLANNED.length === 15 && PLANNED[0].id === '02' && PLANNED[14].id === '16', 'placeholders 02-16');

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
      if (s.type === 'predict') ok(s.options.find((o) => o.correct).text === String(s.derive.value) && s.derive.value === val, `${t} predict answer recomputed (${val})`);
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
  ok(['lewis-basic'].includes(L.mastery.generator), `${tag} generator known`);
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

// ---- known values of the pool (cross-check against hand knowledge)
eq(analyze('C[O-]').atoms[1].fc, -1, 'methoxide O charge'); eq(analyze('C[O-]').atoms[1].lp, 3, 'methoxide O lp');
eq(analyze('[NH4+]').atoms[0].fc, 1, 'ammonium'); eq(analyze('[CH3-]').atoms[0].lp, 1, 'carbanion lp');
eq(analyze('[OH3+]').atoms[0].lp, 1, 'hydronium lp'); eq(analyze('O=C=O').atoms[0].lp, 2, 'CO2 O lp');
eq(analyze('CC=O').totalValence, 18, 'acetaldehyde valence e'); eq(analyze('[NH4+]').totalValence, 8, 'ammonium valence e');

// ---- 3D models (computed by learn/tools/gen3d.py)
{
  for (const id of ['water', 'ammonia', 'methane', 'formaldehyde', 'hcn']) ok(models[id] && canon(models[id].molblock) === canon(models[id].smiles), `3D model ${id} matches its SMILES`);
  const ang = modelAngle(models.water.molblock, 0, 1, 2);
  ok(ang >= 100 && ang <= 110, `water H-O-H angle ${ang.toFixed(1)} within 100-110`);
  const nh = modelAngle(models.ammonia.molblock, 0, 1, 2);
  ok(nh > 100 && nh < 112, `ammonia H-N-H ${nh.toFixed(1)}`);
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
