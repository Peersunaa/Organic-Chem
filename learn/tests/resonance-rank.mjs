// "Which resonance form matters most?" (skill resonance-rank) and "Skeletal <-> condensed" (skill skeletal-convert): the two generator tasks added for question-type stage 4.
//  (1) the rank pool: every hand-written form passes compareForm; rankSystem() of every pool entry equals the hand table in tests/fixtures/resonance-rank.json;
//  (2) 60 generated 'rank' problems: one right option, a why on every option, drawings parse or are marked raw, identical systems answer "They contribute equally", at most 3 drawn forms;
//  (3) condensedOf() writes a formula that condensedToSmiles() reads back to the same molecule, for every pool molecule;
//  (4) 60 generated 'convert' problems: one right option, four options, four different compounds (canonical SMILES), both directions appear, the condensed text round-trips;
//  (5) the contract: generate(..., { tasks }) and generatorForSkill(), and the default mixes of Lesson 04 and Lesson 11 are unchanged.
// Run on its own with `node learn/tests/resonance-rank.mjs`, or as part of run.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ready, canon, analyze } from '../engine/chem.js';
import { generate, generatorForSkill } from '../engine/generators.js';
import { RANK_POOL, rankSystem, checkPool } from '../engine/resonance-rank.js';
import { condensedOf, condensedToSmiles, formulaOf } from '../engine/skeletal.js';
import { convertPool } from '../engine/generators-fg.js';
import { SKILLS } from '../engine/skills.js';
import { mulberry32 } from '../engine/mock.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TABLE = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'resonance-rank.json'), 'utf8'));
delete TABLE._note;
const EQUALLY = 'They contribute equally';
const plain = (s) => String(s).replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080));

export async function resonanceRank({ ok, eq }) {
  await ready();

  // ================================================================ (1) the pool against the hand table
  eq(Object.keys(TABLE).sort(), RANK_POOL.map((s) => s.id).sort(), 'the hand table lists every RANK_POOL system and nothing else');
  for (const c of checkPool()) ok(c.forms.every((f) => f.ok), `rank pool ${c.id}: every form is a true resonance form of the start (compareForm): ${c.forms.filter((f) => !f.ok).map((f) => f.smiles + ' ' + f.code).join(', ')}`);
  for (const sys of RANK_POOL) {
    const r = rankSystem(sys), want = TABLE[sys.id];
    ok(r.forms.length >= 2 && r.forms.length <= 3, `rank pool ${sys.id}: 2 or 3 drawn forms (${r.forms.length})`);
    if (want.major === 'equal') ok(r.equal === true, `rank pool ${sys.id}: all forms tie (hand table: equal)`);
    else { ok(!r.equal && r.major === want.major, `rank pool ${sys.id}: major form is #${want.major} (engine says ${r.major}, equal ${r.equal})`); eq(r.rule, want.rule, `rank pool ${sys.id}: deciding rule`); }
  }

  // ================================================================ (2) the rank problems
  {
    const rng = mulberry32(21);
    const ps = generate('resonance', 60, { tasks: ['rank'], rng, isolated: true });
    ok(ps.length === 60, '60 rank problems');
    const seenSys = new Set(), seenEqual = { yes: 0, no: 0 };
    ps.forEach((p, i) => {
      const w = `rank problem ${i + 1} (${p.system})`;
      const want = TABLE[p.system];
      seenSys.add(p.system);
      ok(p.kind === 'choice' && p.skill === 'resonance-rank' && p.smiles === null, `${w}: a choice problem with the skill resonance-rank and no start drawing`);
      ok(/^These are resonance forms of the .+\. Which one is the MAJOR contributor to the hybrid\?$/.test(p.prompt), `${w}: prompt`);
      ok(p.options.filter((o) => o.correct).length === 1, `${w}: exactly one right option`);
      ok(p.options.every((o) => typeof o.why === 'string' && o.why.length > 15), `${w}: a why on every option`);
      const drawn = p.options.filter((o) => o.smiles);
      ok(drawn.length >= 2 && drawn.length <= 3 && p.options.length === drawn.length + 1, `${w}: 2-3 drawn forms plus one text option (${drawn.length})`);
      ok(drawn.every((o) => !!analyze(o.smiles) || o.raw === true), `${w}: every drawn form parses in RDKit or is marked raw`);
      eq(new Set(p.options.map((o) => o.text)).size, p.options.length, `${w}: option labels are distinct`);
      ok(p.options.some((o) => o.text === EQUALLY && !o.smiles), `${w}: there is a text-only "${EQUALLY}" option`);
      const right = p.options.find((o) => o.correct);
      if (want.major === 'equal') { seenEqual.yes++; eq(right.text, EQUALLY, `${w}: identical forms answer "${EQUALLY}"`); ok(/equal/.test(p.derive), `${w}: derive says equal`); }
      else {
        seenEqual.no++;
        const sysForms = rankSystem(RANK_POOL.find((s) => s.id === p.system)).forms;
        eq(right.smiles, sysForms[want.major], `${w}: the right option is the hand-table form`);
        ok(p.derive.includes(`Form ${right.text.slice(-1)} wins by the ${want.rule} rule`), `${w}: derive names the right form and the rule`);
        const eqOpt = p.options.find((o) => o.text === EQUALLY);
        ok(eqOpt.why.startsWith('Not equal: '), `${w}: the "equally" option explains why it is wrong`);
      }
      eq(right.text, p.answer, `${w}: answer is the right option's text`);
      ok(p.hints.length === 2 && p.hints.every((x) => x.length > 20), `${w}: two hints`);
    });
    ok(seenSys.size >= 10, `60 rank problems cover ${seenSys.size} systems`);
    ok(seenEqual.yes > 0 && seenEqual.no > 0, 'both the "equal" and the "one major form" systems appear');
    const letters = new Set(); ps.filter((p) => TABLE[p.system].major !== 'equal').forEach((p) => letters.add(p.answer));
    ok(letters.size >= 2, `the right form's letter varies (${[...letters].join(', ')})`);
  }

  // ================================================================ (3) condensedOf round trip
  const pool = convertPool();
  ok(pool.length >= 25, `${pool.length} molecules in the convert pool`);
  for (const smi of pool) {
    const c = condensedOf(smi);
    let back = null; try { back = canon(condensedToSmiles(c)); } catch (e) { back = 'ERR ' + e.message; }
    eq(back, canon(smi), `condensedOf(${smi}) = ${c} reads back to the same molecule`);
    ok(/^[A-Za-z0-9()=#]+$/.test(c), `condensedOf(${smi}): only element symbols, digits, brackets and bond signs`);
  }
  eq(condensedOf('CC(C)CO'), 'CH3CH(CH3)CH2OH', 'condensedOf: isobutanol');
  eq(condensedOf('CCC=O'), 'CH3CH2CH=O', 'condensedOf: propanal (CH=O)');
  eq(condensedOf('CC(=O)O'), 'CH3C(=O)OH', 'condensedOf: acetic acid');
  eq(condensedOf('CC#C'), 'CH3C#CH', 'condensedOf: propyne');
  eq(condensedOf('C1CCCC1'), null, 'condensedOf: a ring is outside the dialect');
  eq(condensedOf('CSC'), null, 'condensedOf: sulfur is outside the dialect');

  // ================================================================ (4) the convert problems
  {
    const rng = mulberry32(33);
    const ps = generate('skeletal-fg', 60, { tasks: ['convert'], rng, isolated: true });
    const dirs = { 'to-skeletal': 0, 'to-condensed': 0 };
    ps.forEach((p, i) => {
      const w = `convert problem ${i + 1} (${p.condensed})`;
      dirs[p.direction]++;
      ok(p.kind === 'choice' && p.skill === 'skeletal-convert', `${w}: a choice problem with the skill skeletal-convert`);
      eq(p.options.length, 4, `${w}: 4 options`);
      ok(p.options.filter((o) => o.correct).length === 1, `${w}: exactly one right option`);
      ok(p.options.every((o) => typeof o.why === 'string' && o.why.length > 15), `${w}: a why on every option`);
      const target = p.target;
      eq(canon(condensedToSmiles(p.condensed)), canon(target), `${w}: the condensed text round-trips to the target`);
      const smis = p.direction === 'to-skeletal' ? p.options.map((o) => o.smiles) : p.options.map((o) => condensedToSmiles(plain(o.text)));
      ok(smis.every((s) => !!analyze(s)), `${w}: every option is a real molecule`);
      eq(new Set(smis.map(canon)).size, 4, `${w}: the four options are four different compounds`);
      ok(smis.every((s) => analyze(s).heavy.length === analyze(target).heavy.length), `${w}: every option has the same number of heavy atoms`);
      const right = p.options.find((o) => o.correct);
      eq(canon(p.direction === 'to-skeletal' ? right.smiles : condensedToSmiles(plain(right.text))), canon(target), `${w}: the right option is the target molecule`);
      if (p.direction === 'to-skeletal') {
        ok(p.smiles === null && p.prompt.startsWith('Which skeletal drawing is this condensed formula? ') && p.options.every((o) => o.smiles && /^Option [A-D]$/.test(o.text)), `${w}: drawn options, condensed text in the prompt`);
        eq(plain(p.prompt.split('? ')[1]), p.condensed, `${w}: the prompt shows the condensed formula`);
      } else {
        ok(p.smiles === target && p.prompt === 'Which condensed formula matches this drawing?' && p.options.every((o) => !o.smiles && o.text), `${w}: the drawing is shown, the options are text`);
      }
      ok(p.options.filter((o) => !o.correct).every((o) => o.why.length > 40), `${w}: the wrong options say what differs`);
      ok(p.derive.includes('4 − (bonds drawn) hydrogens') && p.hints.length === 2, `${w}: derive and two hints`);
    });
    ok(dirs['to-skeletal'] > 10 && dirs['to-condensed'] > 10, `both directions appear (${dirs['to-skeletal']} / ${dirs['to-condensed']})`);
    ok(new Set(ps.map((p) => p.condensed)).size >= 15, '60 convert problems use at least 15 different molecules');
  }

  // ================================================================ (5) the contract
  eq(generatorForSkill('resonance-rank'), 'resonance', "generatorForSkill('resonance-rank') is the resonance generator");
  eq(generatorForSkill('skeletal-convert'), 'skeletal-fg', "generatorForSkill('skeletal-convert') is the skeletal-fg generator");
  ok(SKILLS['resonance-rank'].label === 'Resonance: major contributor' && SKILLS['resonance-rank'].rule.length > 40, 'skill resonance-rank has its label and rule');
  ok(SKILLS['skeletal-convert'].label === 'Skeletal ↔ condensed' && SKILLS['skeletal-convert'].rule.length > 40, 'skill skeletal-convert has its label and rule');
  ok(generate('resonance', 6, { skill: 'resonance-rank', rng: mulberry32(2), isolated: true }).every((p) => p.skill === 'resonance-rank'), "generate('resonance', { skill: 'resonance-rank' }) serves rank problems");
  ok(generate('skeletal-fg', 6, { skill: 'skeletal-convert', rng: mulberry32(2), isolated: true }).every((p) => p.skill === 'skeletal-convert'), "generate('skeletal-fg', { skill: 'skeletal-convert' }) serves convert problems");
  ok(generate('resonance', 120, { rng: mulberry32(4), isolated: true }).every((p) => p.skill !== 'resonance-rank'), "Lesson 11's default mix does not contain rank problems");
  ok(generate('resonance', 60, { skill: 'resonance', rng: mulberry32(5), isolated: true }).every((p) => p.skill === 'resonance'), "the 'resonance' skill list does not contain rank problems");
  ok(generate('skeletal-fg', 120, { rng: mulberry32(6), isolated: true }).every((p) => p.skill !== 'skeletal-convert'), "Lesson 04's default mix does not contain convert problems");
  const hc = generate('skeletal-fg', 6, { tasks: ['hcount', 'formula', 'convert'], rng: mulberry32(7), isolated: true });
  ok(hc.length === 6 && hc.some((p) => p.skill === 'skeletal-convert') && hc.some((p) => p.skill === 'skeletal'), 'tasks hcount + formula + convert are all served by skeletal-fg');
  eq(formulaOf('CC(C)CO'), 'C4H10O', 'formulaOf still works');
  return {};
}

// run alone: node learn/tests/resonance-rank.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await resonanceRank({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 60)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
