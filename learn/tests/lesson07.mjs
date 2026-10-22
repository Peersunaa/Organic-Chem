// Lesson 07 checks: alkene / alkyne / cycloalkene naming (OPSIN round trips + a hand-checked fixture), CIP E/Z (every label compared with
// RDKit's NEW CIP labeler in Python), "has cis/trans?" (RDKit FindPotentialStereo), the cip-ranker widget logic and drawing geometry,
// the 3D but-2-enes, the `alkene-names` mastery generator, and the lesson's own steps.
// Run on its own with `node learn/tests/lesson07.mjs`, or as part of run.mjs.
import { ready, rdkit, canon } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import models from '../data/3d/models.js';
import { ezInfo, compare, condensed } from '../engine/cip.js';
import {
  nameAlkene, nameAlkeneBoth, alkeneInfo, alkeneAltNames, acceptedAlkeneNames, matchesAlkene, diagnoseAlkene, wrongAlkeneNames, parseAlkene,
  nameBoth
} from '../engine/naming.js';
import * as CR from '../engine/widgets/cip-ranker.js';
import { WIDGETS } from '../engine/widgets/index.js';
import { generate, generatorForSkill, GENERATORS, formula } from '../engine/generators.js';
import { randomAlkene, randomEz, ezSmiles, PIECES, buildChain } from '../engine/generators-alkenes.js';
import { checkInput } from '../engine/steps.js';
import { skillLabel, skillRule } from '../engine/skills.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.join(HERE, '..', 'tools');

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function htmlStrings(o, out = []) {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => htmlStrings(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => htmlStrings(x, out));
  return out;
}
const wordsOf = (html) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

function dihedral(mb, i, j, k, l) {
  const L = mb.split('\n');
  const P = (n) => { const s = L[4 + n]; return [parseFloat(s.slice(0, 10)), parseFloat(s.slice(10, 20)), parseFloat(s.slice(20, 30))]; };
  const sub = (a, b) => a.map((v, t) => v - b[t]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a.reduce((s, v, t) => s + v * b[t], 0);
  const b1 = sub(P(j), P(i)), b2 = sub(P(k), P(j)), b3 = sub(P(l), P(k));
  const n1 = cross(b1, b2), n2 = cross(b2, b3);
  const m1 = cross(n1, b2.map((v) => v / Math.hypot(...b2)));
  return (Math.atan2(dot(m1, n2), dot(n1, n2)) * 180) / Math.PI;
}

export async function lesson07({ ok, eq }) {
  await ready();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-alkenes-'));
  const py = (script, data) => {
    const inp = path.join(tmp, 'in-' + script + '.json'), out = path.join(tmp, 'out-' + script + '.json');
    fs.writeFileSync(inp, JSON.stringify(data));
    execFileSync('python3', [path.join(TOOLS, script + '.py'), inp, out], { stdio: ['ignore', 'ignore', 'ignore'] });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const queue = []; // OPSIN: {name, smiles, label}
  const expectOpsin = (name, smiles, label) => queue.push({ name, smiles, label });
  const stereoSet = new Set(); // every SMILES whose E/Z and cis/trans capability is compared with RDKit
  const needStereo = (s) => { stereoSet.add(s); return s; };
  const cipChecks = { n: 0 };

  // ===================================================================================================================
  // (1) hand-checked fixture: the engine must reproduce every name in both styles
  const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'alkene-names.json'), 'utf8')).names;
  ok(fx.length >= 25, `alkene fixture has at least 25 names (${fx.length})`);
  ok(new Set(fx.map((f) => canon(f.smiles))).size === fx.length, 'alkene fixture structures are all different');
  let fxMatch = 0;
  for (const f of fx) {
    const got = nameAlkeneBoth(f.smiles);
    const same = !!got && got.new === f.new && got.old === (f.old || f.new);
    if (same) fxMatch++;
    ok(same, `fixture ${f.smiles}: engine ${JSON.stringify(got)} vs hand-checked ${f.new} / ${f.old}`);
    expectOpsin(f.new, f.smiles, 'fixture new'); expectOpsin(f.old || f.new, f.smiles, 'fixture old');
    needStereo(f.smiles);
  }
  // the examples named in the brief
  for (const [s, n, o] of [['CC=CC', 'but-2-ene', '2-butene'], ['C/C=C/C', '(E)-but-2-ene', '(E)-2-butene'], ['CC/C=C\\C', '(Z)-pent-2-ene', '(Z)-2-pentene'], ['CCC=C(C)C', '2-methylpent-2-ene', '2-methyl-2-pentene'], ['C=CC=C', 'buta-1,3-diene', '1,3-butadiene'], ['CC(=C)C=C', '2-methylbuta-1,3-diene', '2-methyl-1,3-butadiene'], ['CCCC#C', 'pent-1-yne', '1-pentyne'], ['CCC#CCC', 'hex-3-yne', '3-hexyne'], ['CC#CC(C)C', '4-methylpent-2-yne', '4-methyl-2-pentyne'], ['CC1C=CCCC1', '3-methylcyclohexene', '3-methylcyclohexene'], ['CC1=CCCC1', '1-methylcyclopentene', '1-methylcyclopentene'], ['CC1(C)C=CCCC1', '3,3-dimethylcyclohexene', '3,3-dimethylcyclohexene'], ['CC/C(C)=C/CC', '(E)-3-methylhex-3-ene', '(E)-3-methyl-3-hexene']]) {
    eq(nameAlkeneBoth(s), { new: n, old: o }, `brief example ${s}`);
  }
  ok(fx.some((f) => f.smiles === 'C/C=C(/CC)C') && fx.some((f) => f.smiles === 'C/C=C(\\CC)C'), 'fixture has 3-methylpent-2-ene with E and Z');
  // 2-methylpent-2-ene has no E/Z (C2 carries two methyls) and the engine agrees with RDKit's idea of "possible stereo"
  ok(!ezInfo('CCC=C(C)C').some((e) => e.capable), '2-methylpent-2-ene: no E/Z possible');

  // ===================================================================================================================
  // (2) scope: things the engine must refuse rather than guess
  for (const s of ['CCC', 'CC=CO', 'CCl', 'C=CC#C', 'C=C=C', 'CC=C=CC', 'C=CC=CC=C', 'C=CC1CCCC1', 'C=C1CCCC1', 'c1ccccc1', 'CC=CC=O', 'C/1=C/CCCCCC1', 'C/C=C/C=CC', 'C1=CC=CCC1', 'C1CC=CCC1C=C', 'C[C@H](C)C=C', 'CC=C[N+](C)(C)C', 'C#CC#CC#C', 'C=CCCCCCCCCCCCCCCCCCCC', 'CC=CC(CCCCC)CCCCC']) {
    ok(nameAlkene(s, 'new') === null && nameAlkene(s, 'old') === null, `out of scope returns null: ${s}`);
  }
  ok(parseAlkene('CCC') === null && parseAlkene('CC=CC') !== null, 'parseAlkene: needs a multiple bond');

  // ===================================================================================================================
  // (3) hierarchical comparison on its own (no RDKit labels): the textbook pairs
  {
    const rank = (a, b) => { // which of two substituent SMILES (attached through the first atom) ranks higher on an alkene carbon
      const info = ezInfo(`C(\\${a})(${b})=C(/C)Cl`);
      const e = info.find((x) => x.capable); const end = e.ends.find((x) => x.atom === 0);
      return end.subs[end.hi].label;
    };
    eq(rank('Br', 'Cl'), 'Br', 'Br > Cl');
    eq(rank('O', 'N'), 'OH', 'O > N');
    eq(rank('CO', 'C(C)C'), 'CH₂OH', '–CH2OH beats –CH(CH3)2 (not a sum)');
    eq(rank('CBr', 'C(C)(C)C'), 'CH₂Br', '–CH2Br beats –C(CH3)3');
    eq(rank('C=C', 'CC'), 'CH=CH₂', 'vinyl beats ethyl (duplicated atom)');
    eq(rank('C=O', 'CO'), 'CH=O', '–CH=O (O,O,H) beats –CH2OH (O,H,H)');
    eq(rank('C#N', 'C=O'), 'CH=O', '–CH=O (O,O,H) beats –C≡N (N,N,N): O beats N at the first position');
  }

  // ===================================================================================================================
  // (4) many alkenes: names in both styles + alternatives through OPSIN, E/Z + capability through RDKit's new CIP labeler
  const rngA = mulberry32(20260707);
  const randoms = [];
  for (let i = 0; i < 300; i++) randoms.push(randomAlkene(rngA));
  for (let i = 0; i < 80; i++) randoms.push(randomAlkene(Math.random)); // fresh each run
  const uniqueRandoms = [...new Set(randoms)];
  let nameCount = 0;
  for (const s of uniqueRandoms) {
    const nb = nameAlkeneBoth(s);
    ok(!!nb, `random alkene is named: ${s}`);
    if (!nb) continue;
    needStereo(s);
    for (const n of acceptedAlkeneNames(s)) { expectOpsin(n, s, 'random ' + (n === nb.new ? 'new' : n === nb.old ? 'old' : 'alt')); nameCount++; }
    ok(matchesAlkene(s, nb.new) && matchesAlkene(s, nb.old.toUpperCase()), `typed names accepted for ${s}`);
    const info = alkeneInfo(s, 'new');
    ok(info.name === nb.new && (info.stereo.length > 0) === info.ez.some((e) => e.capable && e.label), `E/Z prefix only when a stereogenic C=C is fixed: ${s}`);
    // the double-bond locant is never higher than it would be from the other end
    if (info.kind === 'chain') { const L = info.parent.size; ok(info.mult[0] <= L - info.mult[info.mult.length - 1] || info.mult.length > 1, `lowest locant to the multiple bond: ${s}`); }
  }
  eq(nameAlkeneBoth('CCC'), null, 'alkane is not an alkene');

  // a separate batch: every E/Z pair built from the textbook groups
  const rngE = mulberry32(777);
  const ezs = [];
  for (let i = 0; i < 700; i++) ezs.push(randomEz(rngE, ['first', 'set', 'dup', null][i % 4]));
  for (let i = 0; i < 100; i++) ezs.push(randomEz(Math.random));
  const ezUnique = [...new Set(ezs)];
  ezUnique.forEach((s) => needStereo(s));
  // exhaustive pairs of the building blocks: both geometries of every (X1,X2) x (Y1,Y2) with the rule-2/3 groups
  const names = Object.keys(PIECES);
  let pairCount = 0;
  const rngP = mulberry32(99);
  for (let i = 0; i < 400; i++) {
    const pick = () => names[Math.floor(rngP() * names.length)];
    const [a, b, c, d] = [pick(), pick(), pick(), pick()];
    if (a === b || c === d) continue;
    for (const rel of ['cis', 'trans']) { const s = ezSmiles(a, b, c, d, rel); if (s && (a !== 'H' || b !== 'H')) { needStereo(s); pairCount++; } }
  }

  // ===================================================================================================================
  // (5) the cip-ranker widget: solution accepted, every wrong pick refused with its reason, the drawing really shows the geometry
  const rankerConfigs = [];
  const L7 = LESSONS.find((x) => x.id === '07');
  for (const s of L7.steps.filter((x) => x.widget === 'cip-ranker')) rankerConfigs.push({ id: s.id, c: s.config });
  const gen50 = generate('alkene-names', 50);
  gen50.filter((p) => p.kind === 'cip').forEach((p, i) => rankerConfigs.push({ id: 'gen' + i, c: p.config }));
  for (const s of ezUnique.slice(0, 60)) rankerConfigs.push({ id: 'ez', c: { smiles: s } });
  let drawChecks = 0;
  for (const { id, c } of rankerConfigs) {
    const dr = CR.drawing(c);
    const sol = CR.solution(c);
    ok(CR.grade(c, sol.picks, sol.label).ok, `${id} ranker accepts the solution (${c.smiles})`);
    ok(CR.grade(c, [null, null], null).empty && CR.grade(c, sol.picks, null).empty === true, `${id} ranker empty/partial answers are not graded`);
    const e = dr.e;
    // the other group on each carbon is wrong, with a reason
    e.ends.forEach((end, i) => {
      const loIdx = CR.subAtom(dr, i, end.lo);
      const picks = sol.picks.slice(); picks[i] = loIdx;
      const g = CR.grade(c, picks, sol.label);
      ok(!g.ok && g.diagnosis.length > 30 && g.wrong.includes(loIdx), `${id} ranker rejects the lower group on carbon ${i + 1} with a reason`);
    });
    const flip = CR.grade(c, sol.picks, sol.label === 'E' ? 'Z' : 'E');
    ok(!flip.ok && /Same side = Z/.test(flip.diagnosis), `${id} wrong letter says "Same side = Z"`);
    // geometry of the drawing: the side of each higher-ranked group relative to the double bond axis
    const A = dr.coords[e.a], B = dr.coords[e.b];
    const side = (p) => Math.sign((B.x - A.x) * (p.y - A.y) - (B.y - A.y) * (p.x - A.x));
    const s0 = side(dr.coords[sol.picks[0]]), s1 = side(dr.coords[sol.picks[1]]);
    ok(s0 !== 0 && s1 !== 0 && (s0 === s1 ? 'Z' : 'E') === sol.label, `${id} drawing shows the geometry the label claims (${c.smiles})`);
    ok(canon(dr.molblock) === canon(c.smiles), `${id} drawing molblock (with the added H atoms) is the same molecule incl. geometry`);
    drawChecks++;
  }
  // the three diagnoses named in the brief
  {
    const sumCfg = L7.steps.find((x) => x.id === 's09').config;
    const dr = CR.drawing(sumCfg); const sol = CR.solution(sumCfg);
    const bad = CR.grade(sumCfg, [sol.picks[0], CR.subAtom(dr, 1, dr.e.ends[1].lo)], sol.label);
    ok(/You compared the sum of atoms; compare the highest atom first/.test(bad.diagnosis), 'ranker: sum-of-atoms diagnosis on CH2OH vs CH(CH3)2');
    const dupCfg = L7.steps.find((x) => x.id === 's11').config;
    const d2 = CR.drawing(dupCfg); const sol2 = CR.solution(dupCfg);
    const bad2 = CR.grade(dupCfg, [CR.subAtom(d2, 0, d2.e.ends[0].lo), sol2.picks[1]], sol2.label);
    ok(/Duplicate the double bond: .*counts as \(C,C,H\)/.test(bad2.diagnosis), 'ranker: duplicate-the-double-bond diagnosis (C,C,H)');
    ok(/Same side = Z/.test(CR.grade(dupCfg, sol2.picks, sol2.label === 'Z' ? 'E' : 'Z').diagnosis), 'ranker: Same side = Z diagnosis');
    const firstCfg = L7.steps.find((x) => x.id === 's07').config;
    const d3 = CR.drawing(firstCfg); const sol3 = CR.solution(firstCfg);
    const bad3 = CR.grade(firstCfg, [sol3.picks[0], CR.subAtom(d3, 1, d3.e.ends[1].lo)], sol3.label);
    ok(/atomic number/.test(bad3.diagnosis), 'ranker: rule-1 diagnosis mentions atomic number');
  }
  // the table shown by "Go one atom further"
  {
    const c = L7.steps.find((x) => x.id === 's09').config;
    const rows = CR.tableRows(c, 2);
    const flat = rows.flatMap((r) => r.rows);
    ok(flat.some((r) => r.label === 'CH₂OH' && r.sets[0] === '(O,H,H)') && flat.some((r) => r.label === 'CH(CH₃)₂' && r.sets[0] === '(C,C,H)'), 'ranker table: CH2OH is (O,H,H), CH(CH3)2 is (C,C,H)');
    const v = CR.tableRows(L7.steps.find((x) => x.id === 's11').config, 2).flatMap((r) => r.rows);
    ok(v.some((r) => r.label === 'CH=CH₂' && r.sets[0] === '(C,C,H)') && v.some((r) => r.label === 'CH₂CH₃' && r.sets[0] === '(C,H,H)'), 'ranker table: vinyl is (C,C,H), ethyl is (C,H,H)');
    ok(WIDGETS['cip-ranker'] && typeof WIDGETS['cip-ranker'].mount === 'function', 'cip-ranker is registered');
  }
  eq(condensed(ezInfo('C(\\C(C)C)(CO)=C(/C)Cl').find((e) => e.capable).ends[0].subs[0].node), 'CH(CH₃)₂', 'condensed formula: isopropyl');

  // ===================================================================================================================
  // (6) 3D but-2-enes
  {
    const cis = models['cis-but-2-ene'], trans = models['trans-but-2-ene'];
    ok(!!cis && !!trans, '3D models for cis- and trans-but-2-ene exist');
    const dc = dihedral(cis.molblock, 0, 1, 2, 3), dt = dihedral(trans.molblock, 0, 1, 2, 3);
    ok(Math.abs(dc) < 10, `cis-but-2-ene C-C=C-C dihedral ~0 (${dc.toFixed(1)})`);
    ok(Math.abs(Math.abs(dt) - 180) < 10, `trans-but-2-ene C-C=C-C dihedral ~180 (${dt.toFixed(1)})`);
    eq(canon(cis.molblock), canon('C/C=C\\C'), 'cis model is the Z isomer'); eq(canon(trans.molblock), canon('C/C=C/C'), 'trans model is the E isomer');
    needStereo(cis.smiles); needStereo(trans.smiles);
    const bl = cis.molblock.split('\n'); const n = parseInt(bl[3].slice(0, 3), 10), nb = parseInt(bl[3].slice(3, 6), 10);
    const dbl = bl.slice(4 + n, 4 + n + nb).filter((l) => parseInt(l.slice(6, 9), 10) === 2).map((l) => [parseInt(l.slice(0, 3), 10) - 1, parseInt(l.slice(3, 6), 10) - 1]);
    eq(dbl, [[1, 2]], 'model atoms 1 and 2 are the C=C carbons (highlighted in the lesson)');
  }

  // ===================================================================================================================
  // (7) typed-name diagnoses
  {
    const T = 'C/C=C(/CC)C'; // (E)-3-methylpent-2-ene
    const d = (smi, typed) => diagnoseAlkene(smi, typed) || '';
    ok(/start the name with \(E\) or \(Z\)/.test(d(T, '3-methylpent-2-ene')), 'diagnose: missing (E)/(Z)');
    ok(/opposite sides/.test(d(T, '(Z)-3-methylpent-2-ene')) && /E/.test(d(T, '(Z)-3-methylpent-2-ene')), 'diagnose: wrong letter explained');
    ok(/Number from the other end/.test(d(T, '(E)-3-methylpent-3-ene')) || /lowest/.test(d(T, '(E)-3-methylpent-3-ene')), 'diagnose: numbering');
    ok(/-ene/.test(d(T, '(E)-3-methylpentane')), 'diagnose: -ane vs -ene');
    ok(/longest chain that contains the double bond/.test(d(T, '(E)-2-ethylbut-2-ene')), 'diagnose: parent must hold the C=C');
    ok(/no E or Z here/.test(d('CC=C(C)C', '(E)-2-methylbut-2-ene')) && /carbon 2/.test(d('CC=C(C)C', '(E)-2-methylbut-2-ene')), 'diagnose: E/Z where there is none');
    ok(/diene/.test(d('C=CC=C', 'buta-1,3-ene')) || /Two multiple bonds/.test(d('C=CC=C', 'buta-1,3-ene')), 'diagnose: diene');
    ok(/yne/.test(d('CC#CC(C)C', '4-methylpent-2-ene')), 'diagnose: -yne vs -ene');
    ok(matchesAlkene(T, 'trans-3-methylpent-2-ene') === false, 'cis/trans is not accepted when a group other than H is on each carbon');
    ok(matchesAlkene('C/C=C/C', 'trans-but-2-ene') && matchesAlkene('C/C=C\\C', 'cis-2-butene') && matchesAlkene('C/C=C/C', '(2E)-but-2-ene'), 'cis/trans and (2E) spellings accepted for 1,2-disubstituted');
    ok(matchesAlkene('CC(C)=C', '2-methylpropene') && matchesAlkene('C=C', 'ethylene') && matchesAlkene('CC=C', 'Propylene') && matchesAlkene('C#C', 'acetylene'), 'common names accepted');
    ok(!matchesAlkene('C/C=C/C', '(Z)-but-2-ene') && !matchesAlkene('C/C=C/C', 'but-2-ene'), 'E not confused with Z or with no label');
    const bad = wrongAlkeneNames(T);
    ok(bad.length >= 2 && bad.every((b) => !matchesAlkene(T, b.name) && b.why.length > 20), 'wrongAlkeneNames are all wrong and explained');
    for (const b of bad) expectOpsin(b.name, null, 'wrong-name variant parses');
  }

  // ===================================================================================================================
  // (8) mastery generator alkene-names
  {
    const probs = gen50;
    ok(probs.length === 50, 'alkene-names makes 50 problems');
    ok(GENERATORS['alkene-names'] === true && generatorForSkill('ez') === 'alkene-names' && generatorForSkill('naming') === 'alkane-names', 'generator registry routes ez to alkene-names, naming still to alkane-names');
    const kinds = { input: 0, cip: 0, choice: 0 };
    for (const p of probs) {
      kinds[p.kind]++;
      ok(p.prompt && p.derive && p.hints.length === 2 && p.hints.every((x) => x.length > 5) && TAXONOMY_OK(p.skill), 'alkene gen fields');
      if (p.kind === 'input') {
        const nb = nameAlkeneBoth(p.smiles);
        ok(p.name === true && p.answer === nb.new && [nb.old].every((x) => x === nb.new || p.accept.includes(x)), 'typed problem: answer new, accept old');
        const stub = { answer: p.answer, accept: p.accept, name: true, diagnoseFn: p.diagnoseFn, diagnose: p.wrong, fallback: p.fallback, skill: p.skill };
        ok(checkInput(stub, nb.new).ok && checkInput(stub, nb.old.toUpperCase()).ok && p.accept.every((a) => checkInput(stub, a).ok), 'typed problem accepts both styles and alternatives');
        ok(!checkInput(stub, 'cyclononane').ok && checkInput(stub, 'cyclononane').diagnosis.length > 20, 'typed problem gives a diagnosis for a wrong name');
        for (const w of p.wrong) { const r = checkInput(stub, w.match); ok(!r.ok && r.diagnosis === w.why, `typed problem wrong name ${w.match} routes to its reason`); }
        for (const n of acceptedAlkeneNames(p.smiles)) expectOpsin(n, p.smiles, 'gen typed');
        needStereo(p.smiles);
        if (nb.new.startsWith('(')) ok(/\(E\) or \(Z\)/.test(p.prompt), 'typed problem warns when E/Z is needed');
      } else if (p.kind === 'cip') {
        needStereo(p.config.smiles);
        ok(p.answer === 'E' || p.answer === 'Z', 'ez problem has an answer');
        ok(ezInfo(p.config.smiles).filter((e) => e.capable && e.label).length === 1, 'ez problem has exactly one stereogenic C=C');
      } else {
        needStereo(p.smiles);
        ok(p.options.filter((o) => o.correct).length === 1 && p.options.every((o) => o.why.length > 5), 'cis/trans problem: one correct option, every option explained');
        ok(!/[/\\]/.test(p.smiles), 'cis/trans problem does not show the geometry');
      }
    }
    ok(kinds.input > 10 && kinds.cip > 10 && kinds.choice > 10, `alkene-names mixes the three tasks (${JSON.stringify(kinds)})`);
    const run = () => generate('alkene-names', 6).map((p) => p.smiles || p.config.smiles).join('|');
    ok(new Set([run(), run(), run(), run(), run()]).size > 1, 'alkene-names is fresh each run');
    ok(generate('alkene-names', 12, { skill: 'ez' }).every((p) => p.kind === 'cip' || p.kind === 'choice'), 'weak-spot "ez" practice only serves E/Z and cis/trans problems');
    // mastery steps that do not run an OPSIN check: skill label and rule
    ok(skillLabel('ez').length > 5 && skillRule('ez').length > 40, 'skill ez has a label and a rule');
  }

  // ===================================================================================================================
  // (9) the lesson itself
  {
    const l = L7;
    ok(l.steps.length >= 15 && l.steps.length <= 18, `L07 has 15-18 steps (${l.steps.length})`);
    ok(l.drawing === 'skeletal' && l.minutes === 25 && l.chapter === 3, 'L07 drawing skeletal, 25 min, chapter 3');
    eq(l.sections, ['3.1', '3.2', '3.3', '3.4'], 'L07 sections');
    eq(l.mastery, { count: 3, generator: 'alkene-names' }, 'L07 mastery uses alkene-names');
    ok(l.steps[0].type === 'predict' && l.steps.findIndex((s) => s.type === 'explain') > 1, 'L07 acts before it explains');
    ok(l.steps.every((s) => ['naming', 'ez', 'sigma-pi'].includes(s.skill)), 'L07 skill tags');
    ok(l.steps.some((s) => s.skill === 'ez') && l.steps.some((s) => s.skill === 'naming') && l.steps.some((s) => s.skill === 'sigma-pi'), 'L07 covers naming, ez and sigma-pi');
    // (a) cip-ranker: rule 1, rule 2 (the sum trap), rule 3 (duplicate)
    const rk = l.steps.filter((s) => s.widget === 'cip-ranker');
    ok(rk.length === 3, 'L07 has three cip-ranker steps');
    const detail = rk.map((s) => { const e = CR.target(s.config); return { sphere: Math.max(...e.ends.map((x) => x.sphere)), dup: e.ends.some((end) => end.subs.some((sb) => /=|≡/.test(sb.label))), label: e.label }; });
    ok(detail[0].sphere === 1 && detail[1].sphere === 2 && detail[2].sphere === 2 && detail[2].dup, 'L07 ranker steps escalate: first atom, attached-atom sets, duplicated double bond');
    for (const s of rk) {
      const e = CR.target(s.config);
      ok(/(E|Z)\.$/.test(s.confirm.replace(/<[^>]+>/g, '')) && s.confirm.replace(/<[^>]+>/g, '').trim().slice(-2, -1) === e.label, `${s.id} confirm states the computed label ${e.label}`);
      needStereo(s.config.smiles);
    }
    eq(rk.map((s) => CR.target(s.config).label), ['Z', 'E', 'Z'], 'L07 ranker labels');
    // (b) "does it have cis/trans?": four alkenes, computed
    const ct = l.steps.find((s) => s.type === 'choice' && s.options.length === 4 && s.options.every((o) => o.smiles) && /cis\/trans/.test(s.prompt));
    ok(!!ct, 'L07 (b) cis/trans capability step with four drawn alkenes');
    const capable = ct.options.map((o) => ezInfo(o.smiles).some((e) => e.capable));
    ok(capable.filter(Boolean).length === 1 && ct.options.map((o) => !!o.correct).every((c, i) => c === capable[i]), 'L07 (b) the correct option is the only alkene whose carbons both have two different groups');
    ct.options.forEach((o) => needStereo(o.smiles));
    // (c) 3D
    const m3 = l.steps.find((s) => s.visual && s.visual.config.mol === 'cis-but-2-ene' && s.visual.config.compare === 'trans-but-2-ene');
    ok(!!m3 && m3.type === 'choice' && m3.visual.widget === 'model3d' && models['cis-but-2-ene'] && models['trans-but-2-ene'], 'L07 (c) cis and trans but-2-ene side by side in 3D');
    eq(m3.visual.config.highlight, [1, 2], 'L07 (c) highlights the C=C carbons');
    // (d) worked example
    const w = l.steps.find((s) => s.type === 'worked');
    ok(w && w.moves.length === 4 && /IUPAC name/.test(w.problem), 'L07 (d) worked example: parent, number, E/Z, assemble');
    const wn = nameAlkeneBoth(w.smiles);
    const asm = w.moves[3].options.find((o) => o.correct).text;
    const am = /new="([^"]+)" old="([^"]+)"/.exec(asm);
    eq([am[1], am[2]], [wn.new, wn.old], 'L07 (d) assembled name is the engine name in both styles (toggle)');
    ok(/E\b/.test(w.moves[2].options.find((o) => o.correct).text), 'L07 (d) E/Z move');
    const wi = alkeneInfo(w.smiles, 'new');
    eq(w.moves[0].figure.highlight.slice().sort((a, b) => a - b), wi.parentAtoms.slice().sort((a, b) => a - b), 'L07 (d) figure highlights the parent chain');
    ok(wi.parent.size === 6 && wi.mult[0] === 3 && wi.stereo[0].label === 'E', 'L07 (d) worked facts: hexene, C3, E');
    ok(w.moves.some((m) => /<name /.test(m.then || '')), 'L07 (d) the worked example shows names through the toggle');
    // (e) typed names
    const typed = l.steps.filter((s) => s.type === 'input' && s.name);
    ok(typed.length === 2, 'L07 (e) two typed-name steps');
    for (const s of typed) {
      const nb = nameAlkeneBoth(s.smiles);
      ok(s.answer === nb.new && (nb.old === nb.new || (s.accept || []).includes(nb.old)), `${s.id} typed name: answer new + accept old from the engine`);
      ok(checkInput(s, nb.new).ok && checkInput(s, nb.old).ok && checkInput(s, nb.old.toUpperCase()).ok && checkInput(s, ' ' + nb.new.replace(/-/g, ' ') + ' ').ok, `${s.id} accepts both styles`);
      ok(typeof checkInput(s, 'octane').diagnosis === 'string' && checkInput(s, 'octane').diagnosis.length > 20, `${s.id} gives a diagnosis for an unlisted name`);
      expectOpsin(nb.new, s.smiles, `${s.id} new`); expectOpsin(nb.old, s.smiles, `${s.id} old`);
      for (const dd of s.diagnose || []) { const r = checkInput(s, dd.match); ok(!r.ok && r.diagnosis === dd.why && !matchesAlkene(s.smiles, dd.match), `${s.id} diagnose ${dd.match} is rejected with its own reason`); }
      needStereo(s.smiles);
    }
    ok(typed.some((s) => nameAlkeneBoth(s.smiles).new.startsWith('(E)')), 'L07 (e) one typed step needs E/Z');
    // cycloalkene + names in options
    const ring = l.steps.find((s) => s.type === 'choice' && /Rings now/.test(s.prompt));
    ok(ring && /^3-methylcyclohexene$/.test(nameAlkene(ring.smiles)) && /3-methylcyclohexene/.test(ring.options.find((o) => o.correct).text), 'L07 cycloalkene step names 3-methylcyclohexene');
    // formula claims in the reveal
    ok(formula('CCCCCC') === 'C₆H₁₄' && formula('CCC=CCC') === 'C₆H₁₂', 'L07 s01 formulas recomputed');
    ok(l.steps[0].options.find((o) => o.correct).text === 'C₆H₁₂', 'L07 s01 correct answer is the recomputed formula');
    ok(formula('C=C') === 'C₂H₄' && formula('C#C') === 'C₂H₂' && formula('CC=C') === 'C₃H₆', 'ethylene, acetylene, propylene formulas');
    // the s12 claim: the parent is a pentene with a propyl on C2
    eq(nameAlkeneBoth('C=C(CCC)CCC'), { new: '2-propylpent-1-ene', old: '2-propyl-1-pentene' }, 'L07 s12 molecule is a pentene');
    // the allyl step
    const al = l.steps.find((s) => /allyl/.test(s.prompt));
    ok(al.options.find((o) => o.correct).smiles === 'C=CCCl' && al.options.every((o) => canon(o.smiles)), 'L07 allyl step: C=CCCl has CH2-CH=CH2');
    // book problems, by number only
    const want = ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10'];
    ok(want.every((p) => l.useIt.book.includes(p)), 'L07 in-chapter problems 3.1-3.10');
    ok(['3.29', '3.30', '3.31', '3.32', '3.33', '3.34', '3.35', '3.36', '3.37', '3.38', '3.39'].every((p) => l.useIt.book.includes(p)), 'L07 end-of-chapter naming and double-bond isomer problems');
    ok(l.useIt.book.every((p) => /^3\.\d+$/.test(p)) && l.useIt.endFrom === 20, 'L07 book problems are chapter 3, end of chapter from 3.20');
    ok(!/3\.1[1-9]\b/.test(l.useIt.book.join(' ')) , 'L07 leaves the reactions section (3.11-3.19) for later');
    // IUPAC toggle: every <name> tag resolves in OPSIN; correct pairs are the engine's own names for that compound (or accepted spellings)
    let tags = 0;
    const tagChecks = [];
    for (const s of l.steps) {
      const html = htmlStrings(s).join(' ');
      for (const m of html.matchAll(/<name new="([^"]*)" old="([^"]*)"( wrong="1")?/g)) {
        tags++;
        tagChecks.push({ id: s.id, n: m[1], o: m[2], wrong: !!m[3], ref: s.smiles || (s.config && s.config.smiles) });
        if (!m[3]) { expectOpsin(m[1], null, 'tag new'); expectOpsin(m[2], null, 'tag old'); }
      }
    }
    ok(tags >= 12, `L07 renders names through <name new old> (${tags} tags)`);
    ok(l.steps.some((s) => /New\/Old IUPAC|switch/i.test(htmlStrings(s).join(' '))), 'L07 points at the New/Old switch');
    globalThis.__l07tags = tagChecks;
    // no hard-coded style-dependent alkene names outside <name>
    for (const s of l.steps) {
      // the `match`/`answer`/`accept` fields are data (what a learner may type), not prose
      const shown = htmlStrings({ ...s, visual: undefined, config: undefined, diagnose: (s.diagnose || []).map((d) => d.why), answer: undefined, accept: undefined }).join(' ').replace(/<name[^>]*><\/name>/g, '');
      ok(!/\b[a-z]*(?:meth|eth|prop|but|pent|hex|hept)a?-\d(?:,\d)*-(?:di)?(?:en|yn)e\b/.test(shown) && !/\b\d(?:,\d)*-(?:but|pent|hex|hept)(?:a)?(?:di)?(?:en|yn)e\b/.test(shown), `${s.id} has no hard-coded style-dependent name outside <name>`);
    }
    // explain cards are short
    for (const s of l.steps.filter((x) => x.type === 'explain')) ok(wordsOf(s.html) <= 80, `${s.id} explain <= 80 words (${wordsOf(s.html)})`);
    // every claim "cis"/"trans" for the cis/trans figures
    eq(ezInfo('C/C=C\\C').find((e) => e.capable).label, 'Z', 'cis-but-2-ene is Z');
    eq(ezInfo('C/C=C/C').find((e) => e.capable).label, 'E', 'trans-but-2-ene is E');
  }

  // ===================================================================================================================
  // (10) RDKit's NEW CIP labeler (Python): every E/Z label and every "can it have cis/trans" decision
  {
    const list = [...stereoSet];
    const ref = py('check_stereo', list);
    let labelled = 0, capableN = 0, bad = 0;
    for (const s of list) {
      const r = ref[s];
      if (!r) { ok(false, `RDKit parses ${s}`); continue; }
      const mine = {}, pot = [];
      for (const e of ezInfo(s)) { const k = [e.a, e.b].sort((x, y) => x - y).join('-'); if (e.capable) { pot.push(k); capableN++; } if (e.label) { mine[k] = e.label; labelled++; } }
      const same = JSON.stringify(mine) === JSON.stringify(r.ez) && JSON.stringify(pot.sort()) === JSON.stringify(r.potential);
      if (!same) bad++;
      ok(same, `CIP agrees with RDKit new labeler for ${s}: mine ${JSON.stringify(mine)}/${JSON.stringify(pot)} RDKit ${JSON.stringify(r.ez)}/${JSON.stringify(r.potential)}`);
      cipChecks.n++;
    }
    // generator answers and lesson answers, directly
    for (const p of gen50.filter((q) => q.kind === 'cip')) {
      const e = ref[p.config.smiles].ez; const k = [...p.config.bond].sort((x, y) => x - y).join('-');
      ok(e[k] === p.answer, `generator E/Z answer ${p.answer} == RDKit ${e[k]} for ${p.config.smiles}`); cipChecks.n++;
    }
    for (const p of gen50.filter((q) => q.kind === 'choice')) {
      const pot = ref[p.smiles].potential.length > 0;
      ok(p.options.find((o) => o.correct).text.startsWith(pot ? 'Yes' : 'No'), `generator cis/trans answer == RDKit potential stereo for ${p.smiles}`); cipChecks.n++;
    }
    for (const s of L7.steps.filter((x) => x.widget === 'cip-ranker')) {
      const e = ref[s.config.smiles].ez; const t = CR.target(s.config); const k = [t.a, t.b].sort((x, y) => x - y).join('-');
      ok(e[k] === CR.solution(s.config).label, `lesson ${s.id} E/Z == RDKit ${e[k]}`); cipChecks.n++;
    }
    const ctStep = L7.steps.find((s) => /cis\/trans/.test(s.prompt) && s.options && s.options.every((o) => o.smiles));
    ctStep.options.forEach((o) => { ok((ref[o.smiles].potential.length > 0) === !!o.correct, `lesson cis/trans step: ${o.smiles} potential stereo == RDKit`); cipChecks.n++; });
    ok(labelled >= 600 && bad === 0, `RDKit CIP comparison covered ${labelled} E/Z labels and ${capableN} stereogenic bonds over ${list.length} molecules (${bad} disagreements)`);
    // the brief's own statements about RDKit
    ok(ref['CCC=C(C)C'].potential.length === 0 && ref['C/C=C(/CC)C'].ez['1-2'] === 'E' && ref['C/C=C(\\CC)C'].ez['1-2'] === 'Z', 'RDKit: 2-methylpent-2-ene has no stereo; (E)/(Z)-3-methylpent-2-ene labels');
  }

  // ===================================================================================================================
  // (11) OPSIN: every name above means the structure it came from
  {
    const uniq = [...new Set(queue.map((q) => q.name))];
    const res = py('check_names', uniq);
    let n = 0, good = 0;
    for (const q of queue) {
      n++;
      const out = res[q.name];
      const match = !!out && (q.smiles === null ? canon(out) !== null : canon(out) === canon(q.smiles));
      if (match) good++;
      ok(match, `OPSIN round-trip (${q.label}): "${q.name}" -> ${out || 'unparsed'} expected ${q.smiles === null ? '(any structure)' : canon(q.smiles)}`);
    }
    // <name new old> tags in the lesson
    for (const t of globalThis.__l07tags || []) {
      const a = res[t.n], b = res[t.o];
      if (t.wrong) {
        const eng = t.ref ? nameAlkeneBoth(t.ref) : null;
        ok(!eng || (t.n !== eng.new && t.o !== eng.old), `${t.id} wrong-tag ${t.n} / ${t.o} is not the engine's name for the molecule in the step`);
        continue;
      }
      ok(!!a && !!b && canon(a) === canon(b), `${t.id} tag ${t.n} / ${t.o}: both styles are the same compound in OPSIN`);
      const nb = a && nameAlkeneBoth(canon(a));
      const acc = a ? acceptedAlkeneNames(canon(a)) : [];
      const engineOwn = !!nb && nb.new === t.n && nb.old === t.o;
      const accepted = acc.includes(t.n) && acc.includes(t.o);
      const nonAlkene = a && !nb && (nameBoth(canon(a)) !== null);
      ok(engineOwn || accepted || nonAlkene, `${t.id} tag ${t.n} / ${t.o} equals the engine's names for that compound (${JSON.stringify(nb)})`);
    }
    console.log(`  Lesson 07: OPSIN round-trips ${good}/${n} names (${uniq.length} distinct); alkene fixture matches ${fxMatch}/${fx.length}; CIP checks vs RDKit new labeler ${cipChecks.n} molecules/answers (${rankerConfigs.length} ranker drawings, ${pairCount} extra group pairs); ${uniqueRandoms.length} random alkenes`);
    ok(n >= 1000 && good === n, `OPSIN agreed on all ${n} names`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

const TAX = new Set(['ez', 'naming', 'sigma-pi']);
function TAXONOMY_OK(s) { return TAX.has(s); }

// run alone: node learn/tests/lesson07.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await lesson07({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, 40).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
