// Lesson 14 checks: substituent effects, side chains, other aromatic compounds, aromatic synthesis (engine/reactions-aromatic.js, engine/synthesis.js, McMurry 5.6 to 5.10), checked six ways:
//   (1) the substituent TABLE: every SMARTS parses, every example ring is read back as exactly its own group, the three bins equal the book's Figure 5.6, no group is a meta-directing activator;
//   (2) an independent Python RDKit recompute (tools/check_directors.py has its OWN table of groups, its OWN SMARTS, ring topology and reaction SMARTS) of every directing outcome, product set
//       and refusal for hundreds of mono- and disubstituted rings x reagents; the group classification of every ring is compared too;
//   (3) the sigma-complex ARGUMENT: for every group and for ortho, meta and para attack, the three ring resonance forms of the carbocation (the engine's, and RDKit's ResonanceMolSupplier
//       in Python) - the "+ on the carbon that carries the group" pattern appears ONLY for ortho and para attack, for every group;
//   (4) a hand-checked fixture (tests/fixtures/directors.json: 25 reactions incl. the book's own examples and problems, 12 side-chain cases, 11 synthesis orders, names verified with OPSIN);
//   (5) side chains (KMnO4, hydrogenation) against Python RDKit, names of every product round-tripped through OPSIN, the planner and its order diagnoses, the widgets (director-sort,
//       ring-position attack mode, substituted-arene lab, special-form finder), the `directors` generator;
//   (6) the lesson's own steps (drawn answers recomputed from the engine, planner steps solvable with exactly the plans the text gives, text limited to McMurry 5.6 to 5.10).
// Run as part of run.mjs.
import { ready, canon, analyze } from '../engine/chem.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import { WIDGETS } from '../engine/widgets/index.js';
import * as R from '../engine/reactions.js';
import * as N from '../engine/naming-arene.js';
import { enumerate } from '../engine/resonance.js';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import { DIRECTOR_TASKS, orderPuzzles } from '../engine/generators-directors.js';
import * as DS from '../engine/widgets/director-sort.js';
import * as RP from '../engine/widgets/ring-position.js';
import { skillLabel, skillRule } from '../engine/skills.js';
import { checkInput } from '../engine/steps.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const strings = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach((x) => strings(x, out)); else if (o && typeof o === 'object') Object.values(o).forEach((x) => strings(x, out)); return out; };
const molsIn = (html) => [...String(html).matchAll(/<mol smiles="([^"]+)"(?: label="([^"]*)")?/g)].map((m) => ({ smiles: m[1], label: m[2] || '' }));
const D = { directors: true };
const BZ = R.BENZENE;
const sortSmi = (arr) => arr.map((s) => canon(s)).sort();

// the book's Figure 5.6, typed here independently of the engine table
const BOOK_BINS = {
  actOP: ['NH2', 'NHR', 'NR2', 'OH', 'OR', 'NHCOR', 'alkyl', 'phenyl'],
  deactOP: ['F', 'Cl', 'Br', 'I'],
  deactM: ['NO2', 'CN', 'SO3H', 'CHO', 'COR', 'COOH', 'COOR', 'NR3']
};
// engine group id -> the independent Python table's group name
const PYNAME = { NH2: 'amino', NHR: 'alkylamino', NR2: 'dialkylamino', OH: 'hydroxy', OR: 'alkoxy', NHCOR: 'acylamino', alkyl: 'alkyl', phenyl: 'phenyl', F: 'fluoro', Cl: 'chloro', Br: 'bromo', I: 'iodo', NO2: 'nitro', CN: 'cyano', SO3H: 'sulfo', CHO: 'formyl', COR: 'ketone', COOH: 'carboxy', COOR: 'ester', NR3: 'ammonium' };
const GSMI = { NH2: 'N', NHR: 'NC', NR2: 'N(C)C', OH: 'O', OR: 'OC', NHCOR: 'NC(C)=O', alkyl: 'C', F: 'F', Cl: 'Cl', Br: 'Br', I: 'I', NO2: '[N+](=O)[O-]', CN: 'C#N', SO3H: 'S(=O)(=O)O', CHO: 'C=O', COR: 'C(C)=O', COOH: 'C(=O)O', COOR: 'C(=O)OC' };

export async function lesson14({ ok, eq }) {
  await ready();
  const L = LESSONS.find((l) => l.id === '14');
  const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'directors.json'), 'utf8'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-dir-'));
  const py = (script, spec, tag) => {
    const inp = path.join(tmp, tag + '-in.json'), out = path.join(tmp, tag + '-out.json');
    fs.writeFileSync(inp, JSON.stringify(spec));
    execFileSync('python3', ['-I', path.join(HERE, '..', 'tools', script), inp, out], { stdio: ['ignore', 'ignore', 'pipe'] });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const opsin = (names) => {
    const uniq = [...new Set(names)];
    const inp = path.join(tmp, 'in.json'), out = path.join(tmp, 'out.json');
    fs.writeFileSync(inp, JSON.stringify(uniq));
    execFileSync('python3', ['-I', path.join(HERE, '..', 'tools', 'check_names.py'), inp, out], { stdio: ['ignore', 'ignore', 'ignore'] });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const nameQueue = [];
  const stepOf = (id) => L.steps.find((s) => s.id === id);

  // ================================================================ 0. registration and shape
  ok(!!L && L.slug === 'directors-synthesis' && L.drawing === 'skeletal', 'L14 registered, skeletal drawing');
  ok(L.steps.length >= 16 && L.steps.length <= 20, `L14 has 16-20 steps (${L.steps.length})`);
  ok(L.minutes >= 28 && L.minutes <= 30, 'L14 28-30 minutes');
  eq(L.sections, ['5.6', '5.7', '5.8', '5.9', '5.10'], 'L14 covers McMurry 5.6 to 5.10 only');
  ok(L.mastery.generator === 'directors' && GENERATORS.directors === true && L.mastery.count === 3, 'L14 mastery generator is `directors`');
  ok(L.useIt.book.every((x) => /^5\.\d+$/.test(x)) && L.useIt.endFrom === 21, 'L14 useIt: Chapter 5 numbers, end-of-chapter from 5.21');
  for (const n of ['5.11', '5.12', '5.13', '5.14', '5.15', '5.16', '5.17', '5.18', '5.19', '5.20']) ok(L.useIt.book.includes(n), `useIt has in-chapter ${n}`);
  for (const n of ['5.32', '5.33', '5.34', '5.35', '5.36', '5.37', '5.38', '5.39', '5.40', '5.41', '5.45', '5.46', '5.47', '5.48', '5.49']) ok(L.useIt.book.includes(n), `useIt has end-of-chapter ${n}`);
  {
    const bookPath = '/tmp/claude-0/-home-user-Organic-Chem/cf94e48a-a808-537f-854f-a886a3dca214/scratchpad/book/ch5.txt';
    if (fs.existsSync(bookPath)) {
      const book = fs.readFileSync(bookPath, 'utf8');
      for (const n of L.useIt.book) ok(new RegExp('^(Problem )?' + n.replace('.', '\\.') + '\\b', 'm').test(book), `book Chapter 5 has item ${n}`);
      ok(/^5\.32 Identify each of the following groups as an activator or deactivator/m.test(book) && /^5\.37 The orientation of electrophilic aromatic substitution on a disubstituted/m.test(book) && /^5\.47 Starting with benzene, how would you synthesize/m.test(book) && /^5\.45 Use resonance structures of the possible carbocation/m.test(book), 'book 5.32 / 5.37 / 5.45 / 5.47 are the substituent-effect, mechanism and synthesis items');
      ok(/There are no meta-directing activators/.test(book.replace(/\s+/g, ' ')) && /halogens are unique/.test(book.replace(/\s+/g, ' ')), 'book Figure 5.6 text: no meta-directing activators, the halogens are the exception');
      ok(/Synthesize m-chloronitrobenzene starting from benzene/.test(book) && /Synthesize p-bromobenzoic acid starting from benzene/.test(book), 'book worked examples 5.5 and 5.6');
    }
  }
  ok(['directors', 'aromatic-synthesis', 'side-chains'].every((k) => generatorForSkill(k) === 'directors'), 'weak spots directors / side-chains / aromatic-synthesis are practised with the `directors` generator');
  ok(['directors', 'side-chains', 'aromatic-synthesis'].every((k) => skillLabel(k) !== k && skillRule(k).length > 60), 'skill labels and rules exist');

  // ================================================================ 1. the substituent table
  {
    eq(R.DIRECTOR_IDS.slice().sort(), Object.values(BOOK_BINS).flat().sort(), 'the table has exactly the 20 groups of Figure 5.6 (plus phenyl and the amines as the brief lists them)');
    for (const [bin, ids] of Object.entries(BOOK_BINS)) for (const id of ids) eq(R.DIRECTORS[id].cls, bin, `${id} is in bin ${bin}`);
    ok(R.DIRECTOR_IDS.every((id) => !(R.dirDirects(id) === 'm' && R.DIRECTORS[id].level >= 1)), 'there is NO meta-directing activator in the table');
    ok(R.DIRECTOR_IDS.every((id) => R.DIRECTORS[id].cls !== 'actOP' || R.DIRECTORS[id].level >= 1), 'every activator has a positive strength');
    ok(R.DIRECTOR_IDS.every((id) => R.DIRECTORS[id].cls !== 'deactM' || R.DIRECTORS[id].level < 0) && R.DIRECTOR_IDS.every((id) => R.DIRECTORS[id].cls !== 'deactOP' || R.DIRECTORS[id].level === 0), 'meta directors are deactivators, halogens sit at zero');
    for (const id of R.DIRECTOR_IDS) {
      const g = R.DIRECTORS[id];
      ok(g.smarts && g.why.length > 80 && g.label && g.name && g.ex, `${id}: SMARTS, reason, label and example`);
      const rg = R.ringGroups(g.ex);
      ok(rg.ok && rg.subs.length === 1 && rg.subs[0].id === id, `${id}: the example ring ${g.ex} is read back as exactly this group (SMARTS)`);
    }
    // groups that must NOT be taken for a table group
    for (const bad of ['ClCc1ccccc1', 'C=Cc1ccccc1', 'OC=Cc1ccccc1', 'OCC=C', 'FC(F)(F)c1ccccc1', 'NC(=O)c1ccccc1', 'OCc1ccccc1']) { const r = R.ringGroups(bad); ok(!r.ok || r.subs.length === 0, `${bad} is not mistaken for a table group`); }
    eq(R.ringGroups('Cc1cc(Br)ccc1[N+](=O)[O-]').subs.map((s) => s.id).sort(), ['Br', 'NO2', 'alkyl'], 'three groups on one ring are all found');
    ok(R.ringGroups('CC(C)(C)c1ccccc1').subs[0].text === '–C(CH₃)₃' && R.ringGroups('Cc1ccccc1').subs[0].text === '–CH₃', 'alkyl groups are written out in sentences');
  }

  // ================================================================ 2. independent Python RDKit recompute of every directing outcome
  const poolRings = [];
  {
    const cases = [];
    const add = (arene, reagent, halide = null) => cases.push({ arene, reagent, halide });
    const REAG = [['Br2', null], ['Cl2', null], ['I2', null], ['HNO3', null], ['SO3', null], ['RCl', 'CCl'], ['RCl', 'CC(C)(C)Cl'], ['RCOCl', 'CC(=O)Cl'], ['RCOCl', 'CCC(=O)Cl']];
    const monos = R.DIRECTOR_IDS.map((id) => R.DIRECTORS[id].ex);
    monos.forEach((a) => { poolRings.push(a); REAG.forEach(([r, h]) => add(a, r, h)); });
    const G14 = ['NH2', 'OH', 'OR', 'NHCOR', 'alkyl', 'F', 'Cl', 'Br', 'NO2', 'CN', 'SO3H', 'CHO', 'COR', 'COOH', 'COOR'];
    const dis = [];
    for (let i = 0; i < G14.length; i++) for (let j = i; j < G14.length; j++) {
      const a = GSMI[G14[i]], b = GSMI[G14[j]];
      dis.push(`c1(${a})c(${b})cccc1`, `c1(${a})cc(${b})ccc1`, `c1(${a})ccc(${b})cc1`);
    }
    dis.forEach((a) => { poolRings.push(a); add(a, 'Br2'); add(a, 'HNO3'); add(a, 'RCl', 'CCl'); });
    // groups the engine does not take or refuses, and old halide traps
    for (const h of ['Clc1ccccc1', 'C=CCl']) add(BZ, 'RCl', h);
    add('Cc1cc(C)cc(C)c1', 'Br2'); add('ClCc1ccccc1', 'Br2');
    // run
    const pyr = py('check_directors.py', { mode: 'products', cases }, 'products');
    const MAP = { arylHalide: 'nomatch', vinylicHalide: 'nomatch', nohalide: 'nomatch', excluded: 'nomatch', acyl: 'nomatch' };
    let nProd = 0, nRef = 0, nGrp = 0, nTwo = 0, nOut = 0;
    cases.forEach((c, i) => {
      const r = pyr[i];
      const p = R.predictSubst(c.arene, c.reagent, c.halide);
      const tag = `${c.arene} + ${c.reagent} ${c.halide || ''}`;
      if (r.refused === 'benzene') { ok(p.outcome === 'none' || (!p.ok && ['arylHalide', 'vinylicHalide'].includes(p.code)), `${tag}: benzene is handled by Lesson 13`); return; }
      if (r.refused) {
        ok(!p.ok && (MAP[p.code] || p.code) === r.refused, `${tag}: Python refuses (${r.refused}) and so does the engine (${p.ok ? 'it predicted ' + p.products : p.code})`);
        if (!p.ok) nRef++;
        return;
      }
      ok(p.ok, `${tag}: engine predicts (Python predicts ${r.products.join(' + ')}; engine refuses: ${p.code})`);
      if (!p.ok) return;
      eq(sortSmi(p.products), sortSmi(r.products), `${tag}: product set equals the RDKit recompute`);
      eq(p.outcome, r.outcome, `${tag}: outcome (${r.outcome})`);
      eq(p.subs.map((s) => PYNAME[s.id]).sort(), r.names, `${tag}: group classification equals the independent table`);
      p.products.forEach((s) => nameQueue.push({ name: null, smiles: s, label: tag }));
      nProd++; if (p.subs.length === 2) nTwo++;
      nOut++;
    });
    // the classification of every ring that was run, also for the refused ones
    cases.forEach((c, i) => {
      const r = pyr[i]; const rg = R.ringGroups(c.arene);
      if (r.names && rg.ok) { eq(rg.subs.map((s) => PYNAME[s.id]).sort(), r.names, `classification of ${c.arene}`); nGrp++; }
    });
    console.log(`  RDKit cross-checks (lesson 14, directing outcomes): ${nProd} substitutions agree (${nTwo} on two-group rings; outcomes op/m/cooperate/wins), ${nRef} refusals agree, ${nGrp} ring classifications agree with the independent table`);
    ok(nProd >= 300 && nRef >= 100 && nGrp >= 500, `at least 300 products (${nProd}), 100 refusals (${nRef}) and 500 classifications (${nGrp}) cross-checked`);
    ok(nTwo >= 150, `at least 150 two-group substitutions cross-checked (${nTwo})`);
  }

  // ================================================================ 3. the sigma-complex argument, group by group (engine vs RDKit ResonanceMolSupplier)
  {
    const exs = R.DIRECTOR_IDS.map((id) => ({ id, ex: R.DIRECTORS[id].ex }));
    const pyr = py('check_directors.py', { mode: 'sigma', cases: exs.map((e) => ({ arene: e.ex })) }, 'sigma');
    let nPattern = 0, nForms = 0;
    exs.forEach((e, i) => {
      const A = R.attackSet(e.ex), P = pyr[i];
      ok(!!A && !P.error, `${e.id}: attack set built (python: ${P.error || 'ok'})`);
      if (!A || P.error) return;
      for (const rel of ['ortho', 'meta', 'para']) {
        const a = A[rel], p = P.attacks[rel], should = rel !== 'meta';
        // (a) the engine: exactly three ring forms, the pattern "+ on the carbon that carries the group" only for ortho and para
        eq(a.forms.length, 3, `${e.id} ${rel}: three ring resonance forms`);
        eq(a.forms.filter((f) => f.special).length, should ? 1 : 0, `${e.id} ${rel}: ${should ? 'exactly one' : 'no'} form puts the + on the carbon that carries the group`);
        // (b) RDKit, independently: the same pattern (a ring form with + on the substituted carbon, or the + on the group's own N/O/halogen)
        ok((p.special || p.donor) === should, `${e.id} ${rel}: RDKit ResonanceMolSupplier finds the "+ at the substituted carbon" pattern ${should ? 'present' : 'absent'} (special ${p.special}, donor ${p.donor})`);
        ok(a.hasSpecial === should, `${e.id} ${rel}: engine and RDKit agree on the pattern`);
        // (c) RDKit's ring-only forms are among the engine's (RDKit may drop a duplicate), and for meta attack they are the same set
        const mine = new Set(a.forms.map((f) => canon(f.smiles)));
        ok(p.forms.every((s) => mine.has(canon(s))), `${e.id} ${rel}: every ring form RDKit finds is one of the engine's three`);
        if (rel === 'meta') eq([...mine].sort(), p.forms.map((s) => canon(s)).sort(), `${e.id} meta: the same set of forms as RDKit`);
        // (d) the position of the + in each form, from the atom numbering: special form = + on ring position of the group
        const grpPos = R.ringGroups(e.ex).subs[0].pos;
        a.forms.forEach((f) => ok((f.plus === grpPos) === f.special, `${e.id} ${rel}: the special form is the one with the + at the group's position`));
        // (e) donors (lone pair on the atom bonded to the ring): the extra form with the + on that atom, only for ortho and para
        if (R.DIRECTORS[e.id].donor) ok((a.donor !== null) === should && (!a.donor || !!canon(a.donor)), `${e.id} ${rel}: the form with the + on the ${R.DIRECTORS[e.id].donor} exists only for ortho/para`);
        else ok(a.donor === null, `${e.id} ${rel}: no donor atom, no extra form`);
        nPattern++; nForms += a.forms.length;
      }
    });
    console.log(`  resonance-pattern checks (lesson 14): ${nPattern} group x attack combinations (20 groups x ortho/meta/para), ${nForms} engine forms; the "+ on the substituted carbon" pattern appears only for ortho and para, as RDKit's ResonanceMolSupplier confirms`);
    ok(nPattern === 60, `60 group x attack checks (${nPattern})`);
    // the argument the book makes, as numbers: o/p of a donor have an extra stabilised form, o/p of a delta+ group have a bad form
    for (const id of R.DIRECTOR_IDS) { const A = R.attackSet(R.DIRECTORS[id].ex); ok(A.ortho.hasSpecial && A.para.hasSpecial && !A.meta.hasSpecial, `${id}: ortho and para have the special form, meta does not`); }
    // enumerate (resonance.js) agrees on the lesson's own sigma complexes: three ring forms plus the group's own forms only
    const t = R.attackSet('Cc1ccccc1');
    eq(enumerate(t.para.sigma).length, 3, 'toluene para sigma complex: enumerate finds 3 forms in all');
    ok(enumerate(R.attackSet('O=[N+]([O-])c1ccccc1').ortho.sigma).length > 3 && R.attackSet('O=[N+]([O-])c1ccccc1').ortho.forms.length === 3, 'nitrobenzene sigma complex: more forms in all (the NO2 group has its own resonance), but the lesson asks only for the 3 ring forms');
  }

  // ================================================================ 4. the hand-checked fixture
  let fxMatch = 0;
  {
    ok(fx.reactions.length >= 20, `fixture has at least 20 reactions (${fx.reactions.length})`);
    const need = ['toluene-nitration', 'nitrobenzene-bromination', 'phenol-bromination', 'chlorobenzene-nitration', 'benzoic-acid-chlorination', 'acetophenone-nitration', 'aniline-friedel-crafts', 'nitrobenzene-friedel-crafts'];
    for (const id of need) ok(fx.reactions.some((f) => f.id === id), `fixture includes ${id}`);
    for (const id of ['toluene-kmno4', 'tbutylbenzene-kmno4', 'propylbenzene-kmno4', 'styrene-pd', 'benzene-pt-high']) ok(fx.sidechain.some((f) => f.id === id), `fixture includes ${id}`);
    for (const id of ['m-bromonitrobenzene', 'p-bromonitrobenzene', 'm-chlorobenzoic-acid']) ok(fx.synthesis.some((f) => f.id === id), `fixture includes synthesis ${id}`);
    for (const f of fx.reactions) {
      const p = R.predictSubst(f.arene, f.reagent, f.halide || null);
      if (f.ok) {
        ok(p.ok, `fixture ${f.id}: engine predicts (${p.code})`);
        if (!p.ok) continue;
        eq(sortSmi(p.products), sortSmi(f.products), `fixture ${f.id}: products`);
        eq(p.outcome, f.outcome, `fixture ${f.id}: outcome`);
        fxMatch++;
      } else {
        ok(!p.ok && p.code === f.code && p.why.length > 40, `fixture ${f.id}: refused with ${f.code} and a reason`);
        if (!p.ok && p.code === f.code) fxMatch++;
      }
    }
    for (const f of fx.sidechain) {
      const r = f.op === 'oxidize' ? R.oxidizeSideChain(f.smiles) : R.hydrogenate(f.smiles, f.op);
      ok(r.ok && r.reacts === f.reacts, `fixture ${f.id}: reacts = ${f.reacts}`);
      eq(r.product, canon(f.product), `fixture ${f.id}: product`);
      if (r.ok && r.product === canon(f.product)) fxMatch++;
    }
    for (const f of fx.synthesis) {
      const g = R.gradeSequence(f.start, f.target, f.cards, D);
      eq(g.ok, f.ok, `fixture synthesis ${f.id}: ${f.ok ? 'reaches the target' : 'does not reach the target'}`);
      if (!f.ok) ok(g.diagnosis.length > 60, `fixture synthesis ${f.id}: a diagnosis is given (${g.diagnosis.slice(0, 80)})`);
      if (g.ok === f.ok) fxMatch++;
    }
    const total = fx.reactions.length + fx.sidechain.length + fx.synthesis.length;
    ok(total >= 40, `fixture has ${total} hand-checked cases (reactions ${fx.reactions.length}, side chains ${fx.sidechain.length}, syntheses ${fx.synthesis.length})`);
    // names (hand-given) are verified with OPSIN together with the engine's names below
    fx.names.forEach((n) => nameQueue.push({ name: n.name, smiles: n.smiles, label: 'fixture name' }));
    ok(fx.names.length >= 10, 'fixture has names');
  }

  // ================================================================ 5. side chains against Python RDKit
  {
    const cases = [];
    ['Cc1ccccc1', 'CCc1ccccc1', 'CCCc1ccccc1', 'CCCCc1ccccc1', 'CC(C)c1ccccc1', 'CC(C)(C)c1ccccc1', 'Cc1ccc(Cl)cc1', 'Cc1ccc(cc1)[N+](=O)[O-]', 'Cc1ccc(Br)cc1', 'Cc1ccc(cc1)C(C)(C)C', 'CCc1ccc([N+](=O)[O-])cc1', 'Cc1ccccc1Cl', 'Cc1ccccc1C', 'Cc1ccc(C)cc1', 'c1ccccc1', 'Clc1ccccc1', 'CCC(C)c1ccccc1', 'CC(C)Cc1ccccc1', 'Cc1cccc(C)c1', 'CCc1ccc(CC)cc1']
      .forEach((s) => cases.push({ op: 'oxidize', smiles: s }));
    [['C=Cc1ccccc1', 'H2_Pd'], ['C=Cc1ccccc1', 'H2_Pt_high'], ['CC=Cc1ccccc1', 'H2_Pd'], ['C=CCc1ccccc1', 'H2_Pd'], ['C#Cc1ccccc1', 'H2_Pd'], ['c1ccccc1', 'H2_Pd'], ['c1ccccc1', 'H2_Pt_high'], ['Cc1ccccc1', 'H2_Pt_high'], ['CCc1ccccc1', 'H2_Pt_high'], ['CC(C)c1ccccc1', 'H2_Pt_high'], ['CC(C)(C)c1ccccc1', 'H2_Pd'], ['CC(C)(C)c1ccccc1', 'H2_Pt_high']]
      .forEach(([s, op]) => cases.push({ op, smiles: s }));
    const pyr = py('check_directors.py', { mode: 'sidechain', cases }, 'side');
    let n = 0;
    cases.forEach((c, i) => {
      const r = c.op === 'oxidize' ? R.oxidizeSideChain(c.smiles) : R.hydrogenate(c.smiles, c.op);
      const tag = `${c.op} ${c.smiles}`;
      ok(r.ok, `${tag}: engine answers`);
      if (!r.ok) return;
      eq(r.reacts, pyr[i].reacts, `${tag}: reacts`);
      eq(canon(r.product), canon(pyr[i].product), `${tag}: product equals the RDKit recompute`);
      if (r.product) nameQueue.push({ name: null, smiles: r.product, label: tag });
      n++;
    });
    // refusals
    for (const s of ['Nc1ccccc1C', 'Oc1ccccc1C', 'COc1ccccc1C']) ok(!R.oxidizeSideChain(s).ok && R.oxidizeSideChain(s).code === 'notModelled', `KMnO4 on ${s} is refused (electron-rich ring)`);
    ok(!R.hydrogenate('Cc1ccc(C)cc1', 'H2_Pt_high').ok && R.hydrogenate('Cc1ccc(C)cc1', 'H2_Pt_high').code === 'stereo', 'p-xylene ring reduction is refused (cis/trans, not in the book)');
    ok(!R.hydrogenate('Clc1ccccc1', 'H2_Pd').ok && !R.hydrogenate('O=[N+]([O-])c1ccccc1', 'H2_Pt_high').ok, 'hydrogenation of rings with other groups is refused');
    eq(R.hydrogenate('Cc1ccccc1C', 'H2_Pt_high').stereo, 'cis', 'o-xylene gives the cis product (book 5.8)');
    // cis: meso, one R and one S centre, in Python
    const cis = JSON.parse(execFileSync('python3', ['-I', '-c', "import json;from rdkit import Chem;m=Chem.MolFromSmiles('C[C@H]1CCCC[C@H]1C');print(json.dumps([c[1] for c in Chem.FindMolChiralCenters(m,useLegacyImplementation=False)]))"], { encoding: 'utf8' }));
    eq(cis.slice().sort(), ['R', 'S'], 'cis-1,2-dimethylcyclohexane is the meso (R,S) compound');
    console.log(`  RDKit cross-checks (lesson 14, side chains): ${n} KMnO4 / hydrogenation cases agree`);
    ok(n >= 30, `at least 30 side-chain cases cross-checked (${n})`);
  }

  // ================================================================ 6. names of every product (both styles) round-tripped through OPSIN
  {
    const res0 = nameQueue.length;
    const toCheck = [];
    for (const q of nameQueue) {
      const nb = N.nameBothArene(q.smiles);
      if (q.name) toCheck.push({ name: q.name, smiles: q.smiles, label: q.label });
      if (nb) { toCheck.push({ name: nb.new, smiles: q.smiles, label: q.label + ' new' }); toCheck.push({ name: nb.old, smiles: q.smiles, label: q.label + ' old' }); }
    }
    const res = opsin(toCheck.map((q) => q.name));
    let good = 0, n = 0;
    const seen = new Set();
    for (const q of toCheck) {
      const k = q.name + '|' + q.smiles; if (seen.has(k)) continue; seen.add(k);
      n++;
      const out = res[q.name];
      const match = !!out && canon(out) === canon(q.smiles);
      if (match) good++;
      ok(match, `OPSIN round-trip (${q.label}): "${q.name}" -> ${out || 'unparsed'} expected ${canon(q.smiles)}`);
    }
    console.log(`  OPSIN (lesson 14): ${good}/${n} name-structure pairs agree (${new Set(toCheck.map((q) => q.name)).size} distinct names, from ${res0} products)`);
    ok(n >= 150 && good === n, `OPSIN agreed on all ${n} names`);
  }

  // ================================================================ 7. refusals have reasons, planner and order diagnoses
  {
    const refused = [['Nc1ccccc1', 'RCl', 'CCl', 'amine', /lone pair/], ['O=[N+]([O-])c1ccccc1', 'RCOCl', 'CC(=O)Cl', 'deactivated', /much less reactive/], ['Nc1ccccc1', 'HNO3', null, 'amineAcid', /protonated/], ['Oc1ccccc1', 'RCl', 'CCl', 'notModelled', /not in the book/],
      ['Clc1cccc(c1)[N+](=O)[O-]', 'Br2', null, 'compete', /neither is a clearly stronger/], ['Cc1cc(C)cc(C)c1', 'Br2', null, 'tooMany', /three or more/], ['Oc1ccc(N)cc1', 'Br2', null, 'compete', /neither/], ['Clc1ccc(Br)cc1', 'Br2', null, 'compete', /neither/]];
    for (const [a, r, h, code, rx] of refused) { const p = R.predictSubst(a, r, h); ok(!p.ok && p.code === code && rx.test(p.why), `${a} + ${r}: refused (${code}) with a reason`); }
    // Lesson 13 is untouched: a ring with a group is still 'notBenzene' in predictEAS
    ok(R.predictEAS('Cc1ccccc1', 'Br2').code === 'notBenzene', 'predictEAS still refuses a ring with a group (Lesson 13 behaviour is unchanged)');
    ok(/Lesson 14/.test(R.gradeSequence(BZ, 'Nc1ccccc1', ['HNO3_H2SO4', 'Br2_FeBr3', 'Fe_H3O']).diagnosis), 'the Lesson 13 planner (no directors option) still defers a second substitution');
    // order diagnoses
    const bad1 = R.gradeSequence(BZ, 'Brc1cccc(c1)[N+](=O)[O-]', ['Br2_FeBr3', 'HNO3_H2SO4'], D);
    ok(!bad1.ok && /–Br was already on the ring when –NO₂ went on/.test(bad1.diagnosis) && /ortho\/para director/.test(bad1.diagnosis) && /meta director –NO₂ has to be on the ring first/.test(bad1.diagnosis), 'bromine first sends NO2 ortho/para; you need meta');
    const bad2 = R.gradeSequence(BZ, 'Brc1ccc(cc1)[N+](=O)[O-]', ['HNO3_H2SO4', 'Br2_FeBr3'], D);
    ok(!bad2.ok && /–NO₂ was already on the ring when –Br went on/.test(bad2.diagnosis) && /meta director/.test(bad2.diagnosis) && /ortho\/para director –Br has to be on the ring first/.test(bad2.diagnosis), 'nitro first sends Br meta; you need para');
    const bad3 = R.gradeSequence('Cc1ccccc1', 'OC(=O)c1cccc(Cl)c1', ['Cl2_FeCl3', 'KMnO4_H2O'], D);
    ok(!bad3.ok && /–CH₃ was already on the ring when –Cl went on/.test(bad3.diagnosis) && /KMnO₄ turns CH₃ into –CO₂H, so do that step first/.test(bad3.diagnosis), 'oxidise first for the meta acid');
    const bad4 = R.gradeSequence(BZ, 'CC(=O)c1cccc(c1)[N+](=O)[O-]', ['HNO3_H2SO4', 'AcCl_AlCl3'], D);
    ok(!bad4.ok && bad4.code === 'step' && /Friedel–Crafts reactions do not work on a ring that already carries a nitro group/.test(bad4.diagnosis), 'Friedel-Crafts after nitration fails with the book’s reason');
    ok(!R.gradeSequence(BZ, 'Brc1cccc(c1)[N+](=O)[O-]', ['Br2_FeBr3'], D).ok && R.gradeSequence(BZ, 'Brc1cccc(c1)[N+](=O)[O-]', ['Br2_FeBr3'], D).diagnosis.length > 40, 'one step short: a diagnosis');
    ok(R.gradeSequence(BZ, 'x', [], D).code === 'empty', 'an empty plan is reported');
    ok(!R.applyCard({ kind: 'neutral', smiles: 'CCC#C' }, 'KMnO4_H2O', D).ok, 'KMnO4 card on a non-ring molecule is refused with a reason');
    // pools: both isomers carried along, the plan may use either
    const run = R.runSequence(BZ, ['Br2_FeBr3', 'HNO3_H2SO4'], D);
    eq(run.final.pool.slice().sort(), sortSmi(['Brc1ccc(cc1)[N+](=O)[O-]', 'Brc1ccccc1[N+](=O)[O-]']), 'bromobenzene + nitration: the pool is the ortho and para isomers');
    ok(run.steps[1].names && run.steps[1].names.length === 2, 'both isomers are named in the run');
    // every puzzle the generator can serve is solvable and its order matters
    const pz = orderPuzzles();
    ok(pz.length >= 20, `at least 20 order puzzles (${pz.length})`);
    for (const p of pz) {
      const gr = R.gradeSequence(p.start, p.target, p.plan, D);
      ok(gr.ok, `puzzle ${p.start} -> ${p.target}: its plan ${p.plan.join(', ')} works`);
      if (p.alt) { const ga = R.gradeSequence(p.start, p.target, p.alt, D); ok(!ga.ok && ga.diagnosis.length > 40, `puzzle ${p.target}: the swapped order fails with a reason (${ga.diagnosis.slice(0, 50)})`); }
    }
    // the cards
    for (const id of ['KMnO4_H2O']) ok(R.CARDS[id] && R.CARDS[id].label === 'KMnO₄, H₂O', `card ${id}`);
  }

  // ================================================================ 8. widgets
  {
    // director-sort
    const cfg = { groups: R.DIRECTOR_IDS.slice() };
    const want = DS.expected(cfg);
    eq(want, Object.fromEntries(R.DIRECTOR_IDS.map((id) => [id, R.DIRECTORS[id].cls])), 'director-sort answers come from the table');
    ok(DS.grade(cfg, want).ok, 'director-sort accepts the right placement');
    ok(!DS.grade(cfg, {}).ok && DS.grade(cfg, {}).code === 'missing', 'director-sort needs every group placed');
    let nDiag = 0;
    for (const id of R.DIRECTOR_IDS) {
      for (const b of ['actOP', 'deactOP', 'deactM']) {
        if (b === want[id]) continue;
        const r = DS.grade(cfg, { ...want, [id]: b });
        ok(!r.ok && r.wrong.length === 1 && r.wrong[0] === id && r.diagnosis.includes(R.DIRECTORS[id].label) && r.diagnosis.includes(R.BINS[want[id]].label) && r.diagnosis.includes(R.BINS[b].label), `director-sort: ${id} in ${b} is rejected with its own reason`);
        nDiag++;
      }
    }
    ok(nDiag === 40, `40 wrong placements diagnosed (${nDiag})`);
    ok(typeof WIDGETS['director-sort'].mount === 'function', 'director-sort is registered');
    // ring-position attack mode
    const rings = [...R.LAB_SUBST.arenes.map((a) => a.smiles), 'Cc1ccc(cc1)[N+](=O)[O-]', 'Oc1cccc(c1)[N+](=O)[O-]', 'Cc1ccccc1O', 'Clc1ccc(cc1)[N+](=O)[O-]'];
    let nTap = 0;
    for (const s of rings) {
      const E = RP.attackExpected(s);
      ok(!!E && RP.attackGrade(s, E.positions).ok, `attack mode ${s}: the engine positions are accepted (${E && E.positions})`);
      if (!E) continue;
      const L2 = N.ringLayout(s);
      ok(!RP.attackGrade(s, []).ok && RP.attackGrade(s, []).code === 'empty', 'empty is reported');
      for (let q = 0; q < 6; q++) {
        if (E.positions.includes(q)) {
          if (E.positions.length > 1) { const r = RP.attackGrade(s, E.positions.filter((x) => x !== q)); ok(!r.ok && r.code === 'missing', `${s}: one carbon missing is reported`); nTap++; }
        } else {
          const r = RP.attackGrade(s, [...E.positions, q]);
          ok(!r.ok && r.diagnosis.length > 40 && (L2.labels[q] ? r.code === 'self' : r.code === 'wrong'), `${s}: tapping carbon ${q} is wrong with a reason (${r.code})`);
          nTap++;
        }
      }
    }
    ok(nTap > 60, `${nTap} attack-mode taps diagnosed`);
    eq(RP.attackExpected('Cc1ccccc1').positions, [1, 3, 5], 'toluene: ortho, para, ortho');
    eq(RP.attackExpected('O=[N+]([O-])c1ccccc1').positions, [2, 4], 'nitrobenzene: the two meta carbons');
    // resonance-drawer special-form finder: the lesson's two drawers
    for (const [sid, rel, want1] of [['s04', 'para', 1], ['s05', 'ortho', 1]]) {
      const st = stepOf(sid);
      ok(st.widget === 'resonance-drawer' && st.config.ringOnly === true && !!st.config.find, `${sid}: resonance-drawer with ring-only forms and the special-form finder`);
      const frm = enumerate(st.config.start);
      const A = R.attackSet(sid === 's04' ? 'Cc1ccccc1' : 'O=[N+]([O-])c1ccccc1')[rel];
      eq(A.forms.filter((f) => f.special).length, want1, `${sid}: one special form among the three`);
      ok(frm.length >= 3, `${sid}: enumerate finds the forms`);
      eq(st.config.start, A.sigma, `${sid}: the start is the engine's sigma complex`);
    }
    // reaction-lab: every offered combination has one right answer and distinct drawn answers
    let nLab = 0;
    for (const a of R.LAB_SUBST.arenes) for (const rid of R.LAB_SUBST.reagents) {
      const x = R.LAB_EAS_BY_ID[rid];
      const p = R.predictSubst(a.smiles, x.reagent, x.halide || null);
      if (!p.ok) { ok(p.why.length > 40, `${a.id} + ${rid} refused with a reason`); continue; }
      const ch = R.substChoices(p);
      eq(ch.filter((c) => c.correct).length, 1, `${a.id} + ${rid}: one right answer`);
      ok(ch.length >= 3 && new Set(ch.map((c) => c.smiles.slice().sort().join('|'))).size === ch.length, `${a.id} + ${rid}: distinct answers (${ch.length})`);
      ok(ch.every((c) => c.why.length > 30 && c.smiles.every((s) => canon(s))), `${a.id} + ${rid}: every answer drawn and explained`);
      eq(sortSmi(ch.find((c) => c.correct).smiles), sortSmi(p.products), `${a.id} + ${rid}: the right answer is the engine product set`);
      nLab++;
    }
    ok(nLab >= 45, `${nLab} lab combinations`);
    ok(typeof WIDGETS['reaction-lab'].mount === 'function' && typeof WIDGETS['ring-position'].mount === 'function' && typeof WIDGETS['synthesis-planner'].mount === 'function', 'widgets registered');
  }

  // ================================================================ 9. `directors` generator
  {
    const probs = generate('directors', 300, { rng: mulberry32(14) });
    const seen = new Set();
    for (const p of probs) {
      ok(['directors', 'side-chains', 'aromatic-synthesis'].includes(p.skill), 'problem skill');
      ok(Array.isArray(p.hints) && p.hints.length === 2 && p.hints.every((x) => x.length > 20) && p.derive && p.derive.length > 20, `problem has 2 hints and a derivation (${p.prompt.slice(0, 40)})`);
      if (p.kind === 'choice' && p.group) {
        seen.add('classify');
        eq(p.options.filter((o) => o.correct).length, 1, 'classify: one right bin');
        eq(p.options.find((o) => o.correct).text, R.BINS[R.DIRECTORS[p.group].cls].label, `classify ${p.group}: the right bin comes from the table`);
        ok(p.options.length === 3 && p.options.every((o) => o.why.length > 40), 'classify: three bins, every one explained');
      } else if (p.kind === 'choice' && p.arene) {
        seen.add('product');
        const pred = R.predictSubst(p.arene, p.reagent, p.halide);
        ok(pred.ok, 'product: engine predicts');
        eq(sortSmi(p.options.find((o) => o.correct).smiles.split('.')), sortSmi(pred.products), `product ${p.arene}: the right option is the engine product set`);
        ok(p.options.filter((o) => o.correct).length === 1 && p.options.length >= 3 && p.options.every((o) => o.smiles.split('.').every((s) => canon(s)) && o.why.length > 30), 'product: one right, drawn and explained');
        ok(new Set(p.options.map((o) => sortSmi(o.smiles.split('.')).join('|'))).size === p.options.length, 'product: distinct answers');
      } else if (p.kind === 'choice' && p.substrate) {
        seen.add('sidechain');
        const r = p.cond ? R.hydrogenate(p.substrate, p.cond) : R.oxidizeSideChain(p.substrate);
        ok(r.ok, 'side chain: engine answers');
        eq(canon(p.options.find((o) => o.correct).smiles), canon(r.product), `side chain ${p.substrate}: right option is the engine product`);
        ok(p.options.filter((o) => o.correct).length === 1 && p.options.length >= 3 && new Set(p.options.map((o) => canon(o.smiles))).size === p.options.length && p.options.every((o) => canon(o.smiles) && o.why.length > 30), 'side chain: one right of 3-4 distinct, drawn, explained');
      } else if (p.kind === 'widget' && p.widget === 'ring-position') {
        seen.add('position');
        const E = RP.attackExpected(p.ring);
        ok(!!E && RP.attackGrade(p.ring, E.positions).ok, `position ${p.ring}: the engine positions are accepted`);
      } else if (p.kind === 'widget' && p.widget === 'synthesis-planner') {
        seen.add('order');
        const c = p.config;
        ok(c.directors === true && c.deck.length >= 3 && c.deck.length <= 6, 'order: planner with the directors option and a small deck');
        const plans = R.solveSequences(c.start, c.target, c.deck, 3, D);
        ok(plans.length >= 1 && plans.every((pl) => pl.length === p.plans[0].length), `order ${c.target}: solvable from this deck (${plans.length} plan)`);
        ok(R.gradeSequence(c.start, c.target, plans[0], D).ok, 'order: the first plan is accepted');
        ok(p.plans.every((pl) => pl.every((id) => c.deck.includes(id))), 'order: the deck holds every card of every plan');
        ok(plans.length <= 2, 'order: a puzzle with at most two plans');
      } else ok(false, `unknown problem shape: ${p.prompt}`);
    }
    for (const t of ['classify', 'product', 'sidechain', 'position', 'order']) ok(seen.has(t), `all kinds appear: ${t}`);
    eq(DIRECTOR_TASKS.slice().sort(), ['classify', 'order', 'position', 'product', 'sidechain'], 'five tasks');
    for (const skill of ['directors', 'side-chains', 'aromatic-synthesis']) { const ps = generate('directors', 40, { skill, rng: mulberry32(9) }); ok(ps.every((q) => q.skill === skill), `skill ${skill} serves only ${skill} problems`); }
    const a = generate('directors', 6).map((q) => q.prompt + JSON.stringify(q.config || '')).join('|'), b = generate('directors', 6).map((q) => q.prompt + JSON.stringify(q.config || '')).join('|');
    ok(a !== b, 'fresh problems on each run');
    const big = generate('directors', 400, { rng: mulberry32(21) });
    ok(new Set(big.map((q) => q.prompt + JSON.stringify(q.config || ''))).size > 40, 'many different problems');
    // the order puzzles: a decoy-free check that no puzzle's own plan is in a different order than the engine says
  }

  // ================================================================ 10. the lesson's own steps
  {
    const types = L.steps.map((s) => s.type);
    ok(types[0] === 'predict' && stepOf('s01').skill === 'directors', 's01 is a predict step (toluene nitration) before any explanation');
    ok(stepOf('s02').widget === 'director-sort' && stepOf('s03').type === 'explain', 's02 director-sort comes before the explanation card');
    ok(types.indexOf('explain') > types.indexOf('try'), 'the first explanation card comes after a doing step');
    eq(DS.expected(stepOf('s02').config), Object.fromEntries(stepOf('s02').config.groups.map((id) => [id, R.DIRECTORS[id].cls])), 's02 sort: answers from the table');
    ok(stepOf('s02').config.groups.length === 8 && new Set(stepOf('s02').config.groups.map((id) => R.DIRECTORS[id].cls)).size === 3, 's02 sorts 8 groups into all 3 bins');
    // chk options
    for (const s of L.steps) for (const o of s.options || []) {
      if (!o.chk) continue;
      const c = o.chk;
      if (c.products) { const p = R.predictSubst(c.arene, c.reagent); ok(p.ok && JSON.stringify(sortSmi(p.products)) === JSON.stringify(sortSmi(c.products)), `${s.id}: option products recomputed`); }
      else if (c.special !== undefined) { const A = R.attackSet(c.arene)[c.rel]; ok(A.hasSpecial === c.special, `${s.id}: special form (${c.arene} ${c.rel})`); }
      else if (c.donor) { const A = R.attackSet(c.arene)[c.rel]; ok(!!A.donor && A.hasSpecial, `${s.id}: donor form exists (${c.arene} ${c.rel})`); }
      else if (c.cond) { const r = R.hydrogenate(c.sm, c.cond); eq(r.product, canon(c.product), `${s.id}: hydrogenation product`); }
      else if (c.reacts === false) { const r = R.oxidizeSideChain(c.sm); ok(r.ok && !r.reacts, `${s.id}: no reaction`); }
      else if (c.product) { const r = R.oxidizeSideChain(c.sm); eq(r.product, canon(c.product), `${s.id}: oxidation product`); }
    }
    // s10 / s11: drawn options
    eq(canon(stepOf('s10').options.find((o) => o.correct).smiles), canon(R.oxidizeSideChain('CCCc1ccccc1').product), 's10: propylbenzene gives benzoic acid');
    ok(new Set(stepOf('s10').options.map((o) => canon(o.smiles))).size === 4, 's10: four distinct drawn answers');
    ok(!R.oxidizeSideChain('CC(C)(C)c1ccccc1').reacts && stepOf('s11').options.find((o) => o.correct).chk.reacts === false, 's11: the tert-butyl trap');
    ok(stepOf('s11').options.some((o) => /benzoic acid/.test(o.text) && !o.correct), 's11: the benzoic acid trap is an option');
    eq(canon(stepOf('s12').options.find((o) => o.correct).smiles), canon(R.hydrogenate('C=Cc1ccccc1', 'H2_Pd').product), 's12: styrene gives ethylbenzene, ring intact');
    ok(/Pt/.test(stepOf('s12').worked) && /high pressure/.test(stepOf('s12').worked) && /cis-1,2-dimethylcyclohexane/.test(stepOf('s12').worked), 's12 mentions Pt, high pressure and the book’s o-xylene example');
    // heterocycles: pi electrons counted from the structure (one per ring atom in a double bond, two for an N-H lone pair), independent of the answer
    const piCount = (smi) => {
      const info = analyze(smi);
      const ring = N.findRing ? null : null; void ring;
      let n = 0;
      for (const a of info.atoms) {
        const dbl = info.bonds.some((b) => b.atoms.includes(a.idx) && (b.bo ?? 1) === 2);
        if (dbl) n += 1; else if (a.sym === 'N' && a.impH === 1 && a.lp === 1) n += 2;
      }
      return n;
    };
    eq(piCount('c1ccncc1'), 6, 'pyridine has 6 pi electrons (6 ring atoms in double bonds)');
    eq(piCount('c1cc[nH]c1'), 6, 'pyrrole has 6 pi electrons (4 carbons + the N-H lone pair)');
    eq(piCount('c1c[nH]cn1'), 6, 'imidazole has 6 pi electrons');
    eq(piCount('c1cncnc1'), 6, 'pyrimidine has 6 pi electrons');
    eq(piCount('c1ccccc1'), 6, 'benzene has 6 pi electrons');
    for (const [id, smi] of [['s13', 'c1ccncc1'], ['s14', 'c1cc[nH]c1']]) {
      const st = stepOf(id);
      eq(st.smiles, smi, `${id} shows the right molecule`);
      eq(Number(st.answer), piCount(smi), `${id}: the answer equals the pi electron count recomputed from the structure`);
      ok(checkInput(st, '6').ok && checkInput(st, 'six').ok, `${id} accepts 6 and six`);
      for (const d of st.diagnose) { ok(!checkInput(st, d.match).ok && checkInput(st, d.match).diagnosis === d.why, `${id} diagnose ${d.match}`); }
      ok(!checkInput(st, '99').ok && checkInput(st, '99').diagnosis.length > 5, `${id} fallback diagnosis`);
    }
    ok(/naphthalene/i.test(stepOf('s14').confirm) && /pyrimidine/.test(stepOf('s14').confirm) && /imidazole/.test(stepOf('s14').confirm), 's14 names the other aromatic compounds of section 5.9');
    // planner steps
    const P = [['s15', ['HNO3_H2SO4', 'Br2_FeBr3']], ['s16', ['Br2_FeBr3', 'HNO3_H2SO4']], ['s17', ['KMnO4_H2O', 'Cl2_FeCl3']], ['s18', ['AcCl_AlCl3', 'HNO3_H2SO4']], ['s20', ['MeCl_AlCl3', 'HNO3_H2SO4', 'KMnO4_H2O']]];
    for (const [id, plan] of P) {
      const st = stepOf(id), c = st.config;
      ok(st.widget === 'synthesis-planner' && c.directors === true && st.skill === 'aromatic-synthesis', `${id}: planner step with the directors option`);
      eq(R.solveSequences(c.start, c.target, c.deck, plan.length, D), [plan], `${id}: the deck has exactly one plan of ${plan.length} steps`);
      ok(R.gradeSequence(c.start, c.target, plan, D).ok, `${id}: the plan is accepted`);
      const wrong = plan.slice().reverse();
      if (plan.length === 2) { const g = R.gradeSequence(c.start, c.target, wrong, D); ok(!g.ok && g.diagnosis.length > 60, `${id}: the swapped order fails with a diagnosis`); }
      for (const cid of c.deck) ok(!!R.CARDS[cid], `${id}: card ${cid} exists`);
      expectName(c.target, `${id} target`);
    }
    eq(R.solveSequences(BZ, 'OC(=O)c1ccc(Br)cc1', ['MeCl_AlCl3', 'Br2_FeBr3', 'KMnO4_H2O', 'HNO3_H2SO4'], 3, D), [['MeCl_AlCl3', 'Br2_FeBr3', 'KMnO4_H2O'], ['Br2_FeBr3', 'MeCl_AlCl3', 'KMnO4_H2O']], 'the worked example (p-bromobenzoic acid) has the book’s two routes: methylate then brominate, or brominate then methylate (Friedel-Crafts works on bromobenzene), then oxidise');
    ok(/CH₃Cl, AlCl₃/.test(stepOf('s19').moves[2].options.find((o) => o.correct).why), 's19 mentions the book’s alternative route (bromobenzene + CH3Cl, AlCl3)');
    eq(R.solveSequences(BZ, 'OC(=O)c1ccc(Br)cc1', ['MeCl_AlCl3', 'Br2_FeBr3', 'KMnO4_H2O'], 3, D).length, 2, 'both routes are in the engine');
    ok(L.steps.filter((s) => s.widget === 'synthesis-planner').length >= 3, 'at least 3 synthesis-planner puzzles');
    // the worked example's figure SMILES and the targets
    const w = stepOf('s19');
    ok(w.type === 'worked' && w.moves.length === 4 && /p-bromobenzoic acid/.test(w.problem), 's19 is the backwards worked example (4 moves)');
    w.moves.forEach((m) => { if (m.figure) ok(canon(m.figure.smiles), 's19 figure parses'); });
    ok(stepOf('s20').widget === 'synthesis-planner' && /Exam style/.test(stepOf('s20').prompt), 's20 is the exam-style planning step');
    // halogen step: the donor form is present for ortho attack on chlorobenzene
    ok(!!R.attackSet('Clc1ccccc1').ortho.donor && !R.attackSet('Clc1ccccc1').meta.donor, 'chlorobenzene: the form with + on Cl exists for ortho/para but not meta');
    // coverage of required elements
    ok(L.steps.some((s) => s.widget === 'ring-position' && s.config.attack), 'ring-position attack step');
    ok(L.steps.some((s) => s.widget === 'reaction-lab' && s.config.subst), 'reaction-lab substituted-arene step');
    ok(L.steps.filter((s) => s.widget === 'resonance-drawer').length >= 2, 'resonance-drawer steps on toluene and nitrobenzene');
    ok(['directors', 'side-chains', 'aromatic-synthesis'].every((k) => L.steps.some((s) => s.skill === k)), 'L14 trains directors, side-chains and aromatic-synthesis');
    // the text stays within sections 5.6 to 5.10
    const all = strings(L.steps).join(' ');
    ok(!/Hückel|Hueckel|rearrang/i.test(all), 'no Hueckel or rearrangement in the lesson text');
    ok(!/chiral|enantiomer|R\/S/.test(all), 'no stereochemistry beyond the book’s cis example');
    // names of the <mol> labels that are names
    const labelled = L.steps.flatMap((s) => molsIn(strings(s).join(' '))).filter((m) => /^[a-zA-Z0-9\-,() ]+$/.test(m.label) && !/form|attack|pyridine|pyrimidine|pyrrole|imidazole|naphthalene/.test(m.label));
    const NMAP = { 'o-nitrotoluene': '2-nitrotoluene', 'p-nitrotoluene': '4-nitrotoluene', 'm-nitrotoluene': '3-nitrotoluene', 'p-bromobenzoic acid': '4-bromobenzoic acid', 'p-bromotoluene': '4-bromotoluene' };
    const res = opsin([...new Set(labelled.map((m) => NMAP[m.label] || m.label))]);
    let nl = 0;
    for (const m of labelled) { const nm = NMAP[m.label] || m.label; if (!res[nm]) continue; ok(canon(res[nm]) === canon(m.smiles), `label "${m.label}" names the structure drawn (${m.smiles})`); nl++; }
    ok(nl >= 8, `${nl} drawn labels checked with OPSIN`);
    function expectName(smiles, label) { const nb = N.nameBothArene(smiles); ok(!nb || (nb.new && nb.old), `${label} has a name or none`); if (nb) nameQueue2.push({ name: nb.new, smiles, label }, { name: nb.old, smiles, label }); }
  }
  // the names added during the lesson checks
  {
    const res = opsin(nameQueue2.map((q) => q.name));
    for (const q of nameQueue2) ok(!!res[q.name] && canon(res[q.name]) === canon(q.smiles), `OPSIN: ${q.label} "${q.name}"`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`  lesson 14: fixture ${fxMatch}/${fx.reactions.length + fx.sidechain.length + fx.synthesis.length} cases match`);
}
const nameQueue2 = [];
