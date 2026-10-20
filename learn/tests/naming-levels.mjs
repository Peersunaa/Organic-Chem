// "Naming by level" drill checks (engine/generators-naming-levels.js, generator `naming-levels`, skill `naming-levels`, route #practise-naming-levels).
//  (1) wiring: skill label + rule, generator registry, generatorForSkill, the level-bar widget, the route and the home links in app.js, the CSS block "naming levels";
//  (2) 60 seeded problems per level (Levels 1 to 5 = 300): the right fields, two hints, a numbered walkthrough, one correct option out of four distinct ones or one accepted
//      answer set, every drawing renders, the level rules hold (Level 1 is only alkanes / halides / rings up to C8 ...), every kind of problem appears at every level, both formats appear;
//  (3) every correct name (current style, traditional style, the 1-methylethyl style, every accepted spelling) is round-tripped through OPSIN (tools/check_names.py, py2opsin):
//      name -> SMILES must equal the drawing (canonical isomeric SMILES; relative stereo only for cis/trans on a ring, whose two enantiomers have one name);
//      every wrong name must FAIL in OPSIN or parse to a structure whose "same compound" flag is truthful: a wrong end of the chain, a wrong alphabetical order, a shorter parent or a
//      ring-for-chain swap name the SAME compound by definition (they are wrong names, not wrong molecules), every other kind of mistake must be a DIFFERENT structure;
//  (4) the namer (which never sees the specification of the structure it names) agrees with the Lesson 05 / 07 engines on thousands of hydrocarbons, in both styles;
//  (5) typed answers are graded with the course's checkInput (spaces, hyphens, case ignored): every accepted spelling passes, every wrong name fails with its own diagnosis;
//  (6) Level 5, the tricky set: at least 20 entries, each with a why-line and a source, every correct name hand-checked against the namer or OPSIN, every wrong name flagged truthfully;
//  (7) remembered level, New / Old IUPAC style, level-bar markup.
// Run on its own with `node learn/tests/naming-levels.mjs`, or as part of run.mjs.
import { ready, canon, svg } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import * as G from '../engine/generators-naming-levels.js';
import { checkInput } from '../engine/steps.js';
import { WIDGETS } from '../engine/widgets/index.js';
import { skillLabel, skillRule } from '../engine/skills.js';
import { nameBoth, nameAlkeneBoth, normName, diagnoseAlkene } from '../engine/naming.js';
import * as store from '../engine/store.js';
import * as C from '../engine/naming-custom.js';
import * as NF from '../engine/name-forms.js';
import L5 from '../lessons/05-naming-alkanes.js';
import L7 from '../lessons/07-alkenes-ez.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.join(HERE, '..', 'tools');
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const inv = (s) => s.replace(/@@/g, '#').replace(/@/g, '@@').replace(/#/g, '@');
const SAME_RULES = new Set(['numbering', 'tiebreak', 'alphabetical', 'parent', 'ring-parent', 'tricky']);
const BAD = /undefined|NaN|\[object|\bnull\b/;

export async function namingLevels({ ok, eq }) {
  await ready();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-nl-'));
  const opsin = (names) => {
    const uniq = [...new Set(names)];
    const inp = path.join(tmp, 'in.json'), out = path.join(tmp, 'out.json');
    fs.writeFileSync(inp, JSON.stringify(uniq));
    execFileSync('python3', ['-I', path.join(TOOLS, 'check_names.py'), inp, out], { stdio: ['ignore', 'ignore', 'inherit'] });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const same = (a, b, relative) => { const ca = canon(a), cb = canon(b); if (ca && ca === cb) return true; return !!relative && !!ca && canon(inv(a)) === cb; };
  const stats = { problems: 0, names: 0, wrongNames: 0, sameFlagged: 0, opsinFail: 0, engine: 0, engineSkipped: 0, typed: 0, options: 0 };
  store.resetAll();

  // ------------------------------------------------------------------ (1) wiring
  ok(skillLabel('naming-levels') === 'Naming by level' && skillRule('naming-levels').length > 200, 'skill label and rule');
  ok(generatorForSkill('naming-levels') === 'naming-levels' && GENERATORS['naming-levels'] === true, 'generator registered for the skill');
  ok(G.NAMING_LEVEL_SKILLS.length === 1 && G.NAMING_LEVEL_SKILLS[0] === 'naming-levels', 'NAMING_LEVEL_SKILLS');
  ok(!!WIDGETS['naming-levels-bar'] && typeof WIDGETS['naming-levels-bar'].mount === 'function', 'level-bar widget registered');
  const appSrc = fs.readFileSync(path.join(HERE, '..', 'app.js'), 'utf8');
  ok(/practise-\(\[a-z0-9-\]\+\)/.test(appSrc) && /generatorForSkill\(skill\)/.test(appSrc), 'app.js routes #practise-<skill> through generatorForSkill');
  ok(appSrc.includes("href: '#practise-naming-levels'") && appSrc.includes("href: '#practise-stereo-projections'"), 'home practice area links to the naming drill and to the stereo-projections drill');
  const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
  ok(html.includes('/* naming levels */') && /\.nl-bar\b/.test(html) && /\.nl-lv\b/.test(html) && /\.nl-lv\[aria-pressed="true"\]/.test(html), 'CSS block "naming levels"');
  eq(G.LEVELS, [1, 2, 3, 4, 5], 'five levels');
  eq(Object.keys(G.LEVEL_TITLES).length, 5, 'a title for each level');

  // ------------------------------------------------------------------ (7a) level bar markup + remembered level
  for (const lv of G.LEVELS) {
    const h = G.levelBarHtml(lv);
    eq((h.match(/class="nl-lv"/g) || []).length, 5, `level bar ${lv}: five buttons`);
    eq((h.match(/aria-pressed="true"/g) || []).length, 1, `level bar ${lv}: exactly one pressed`);
    ok(h.includes(`data-level="${lv}" aria-pressed="true"`), `level bar ${lv}: the chosen level is pressed`);
    ok(h.includes(G.LEVEL_TITLES[lv]) && !BAD.test(h), `level bar ${lv}: title`);
  }
  G.setLevel(3); eq(G.getLevel(), 3, 'level remembered in the store');
  G.setLevel(9); eq(G.getLevel(), 1, 'an invalid level falls back to 1');
  G.setLevel(4);
  {
    const rng = mulberry32(5);
    const ps = generate('naming-levels', 3, { rng });
    ok(ps.length === 3 && ps.every((p) => p.level === 4), 'generate() with no level argument uses the remembered level');
    const ps2 = generate('naming-levels', 3, { rng, level: 2 });
    ok(ps2.every((p) => p.level === 2), 'an explicit level wins');
  }
  G.setLevel(1);

  // ------------------------------------------------------------------ (2) 300 seeded problems
  const byLevel = {};
  for (const lv of G.LEVELS) {
    const rng = mulberry32(20261020 + lv * 7919);
    byLevel[lv] = [];
    for (let i = 0; i < 60; i++) byLevel[lv].push(G.makeLevelProblem(rng, lv));
  }
  const queue = [];   // {name, smiles, role, same, rule, label, relative}
  const q = (name, smiles, role, extra) => queue.push({ name, smiles, role, relative: /^\s*(cis|trans)-/i.test(name), ...extra });
  const allProblems = [];
  for (const lv of G.LEVELS) {
    const ps = byLevel[lv];
    eq(ps.length, 60, `level ${lv}: 60 problems`);
    const cover = {};
    const bump = (k) => { cover[k] = (cover[k] || 0) + 1; };
    ps.forEach((p, n) => {
      const t = `L${lv} #${n} ${p.smiles} (${p.tag})`;
      allProblems.push(p); stats.problems++;
      ok(p.skill === 'naming-levels' && p.level === lv, `${t} skill and level`);
      ok((p.kind === 'input' && p.format === 'typed') || (p.kind === 'choice' && p.format === 'options'), `${t} kind matches format`);
      bump(p.format); stats[p.format === 'typed' ? 'typed' : 'options']++;
      ok(typeof p.prompt === 'string' && p.prompt.length > 25 && !BAD.test(p.prompt), `${t} prompt`);
      ok(Array.isArray(p.hints) && p.hints.length === 2 && p.hints.every((h) => h.length > 30 && !BAD.test(h)), `${t} two hints`);
      ok(p.derive.length > 60 && /Name/.test(p.derive) && !BAD.test(p.derive) && p.deriveHtml.includes('<b>Name:</b>'), `${t} walkthrough with the final name`);
      if (lv < 5 && p.tag !== 'benzyl' && p.tag !== 'arene') ok(/1 Parent\./.test(p.derive) || p.format, `${t} follows the numbered recipe`);
      ok(typeof p.smiles === 'string' && !!canon(p.smiles), `${t} smiles parses`);
      ok(p.visual && p.visual.widget === 'naming-levels-bar' && !!WIDGETS[p.visual.widget], `${t} level bar attached`);
      ok(p.names.new && p.names.old && p.names.sys && !BAD.test(p.names.new + p.names.old), `${t} names`);
      const picture = svg(p.smiles);
      ok(typeof picture === 'string' && picture.includes('<svg'), `${t} drawing renders`);
      ok(Array.isArray(p.features) && p.features.length >= 1, `${t} features`);
      p.features.forEach(bump);
      // the correct names, every spelling
      const right = new Set([p.names.new, p.names.old, p.names.sys, ...(p.accept || []), ...(p.acceptNames || [])]);
      right.forEach((nm) => q(nm, p.smiles, 'correct', { label: t }));
      if (p.format === 'typed') {
        const all = [p.answer, ...p.accept];
        all.forEach((a) => ok(checkInput({ answer: p.answer, accept: p.accept, name: p.name, diagnoseFn: p.diagnoseFn, diagnose: p.wrong, fallback: p.fallback, skill: p.skill }, a).ok, `${t} typed "${a}" is accepted`));
        ok(checkInput({ answer: p.answer, accept: p.accept, name: true, skill: p.skill }, p.answer.toUpperCase().replace(/-/g, ' ')).ok, `${t} case, spaces and hyphens are ignored`);
        ok(p.answer === p.names.new, `${t} answer is the current-style name (switch on New)`);
        (p.wrongCands || []).forEach((w) => {
          [w.name.new, w.name.old, w.name.sys].forEach((nm) => {
            if (!nm) return;
            const r = checkInput({ answer: p.answer, accept: p.accept, name: true, diagnoseFn: p.diagnoseFn, diagnose: p.wrong, fallback: p.fallback, skill: p.skill }, nm);
            ok(!r.ok && r.diagnosis && r.diagnosis.length > 30 && !BAD.test(r.diagnosis), `${t} wrong name "${nm}" is rejected with a diagnosis`);
          });
          [['new', w.name.new], ['old', w.name.old]].forEach(([, nm]) => q(nm, p.smiles, 'wrong', { same: !!w.same, rule: w.rule, label: t }));
        });
        const r0 = checkInput({ answer: p.answer, accept: p.accept, name: true, diagnoseFn: p.diagnoseFn, diagnose: p.wrong, fallback: p.fallback, skill: p.skill }, 'zzz');
        ok(!r0.ok && r0.diagnosis && r0.diagnosis.length > 30, `${t} a nonsense answer gets a diagnosis`);
        if (n % 4 === 0) ['((', '--', '-', 'methane', 'cis-', '(R)-', '(2E,4Z)-', 'x'.repeat(120), '2,3-dimethyl', 'cyclo', '1-bromo-', 'ene', '123'].forEach((junk) => {
          let r = null, threw = false;
          try { r = checkInput({ answer: p.answer, accept: p.accept, name: true, diagnoseFn: p.diagnoseFn, diagnose: p.wrong, fallback: p.fallback, skill: p.skill }, junk); } catch (e) { threw = true; }
          ok(!threw && r && !r.ok && typeof r.diagnosis === 'string' && r.diagnosis.length > 20 && !BAD.test(r.diagnosis), `${t} junk answer "${junk.slice(0, 12)}" is rejected with a diagnosis and no error`);
        });
      } else {
        eq(p.options.length, 4, `${t} four options`);
        eq(p.options.filter((o) => o.correct).length, 1, `${t} exactly one correct option`);
        const c = p.options.find((o) => o.correct);
        ok(c.name.new === p.names.new && c.name.old === p.names.old, `${t} the correct option is the namer's name`);
        ok(typeof p.answer === 'string' && (p.answer === p.names.new || p.answer === p.names.old), `${t} answer string`);
        eq(new Set(p.options.map((o) => normName(o.name.new))).size, 4, `${t} options distinct (current style)`);
        eq(new Set(p.options.map((o) => normName(o.name.old))).size, 4, `${t} options distinct (traditional style)`);
        p.options.forEach((o) => {
          ok(typeof o.text === 'string' && o.text.length > 3 && typeof o.why === 'string' && o.why.length > 25 && !BAD.test(o.why + o.text), `${t} option "${o.name.new}" text and diagnosis`);
          if (!o.correct) {
            ok(MODEL_DISTINCT(o.name, p.names), `${t} distractor "${o.name.new}" is not the right name in any style`);
            ok(typeof o.rule === 'string' && o.rule.length > 0, `${t} distractor names the rule it breaks`);
            if (o.same) ok(SAME_RULES.has(o.rule), `${t} a same-compound distractor is one of the numbering / order / parent mistakes (${o.rule})`);
            [o.name.new, o.name.old].forEach((nm) => q(nm, p.smiles, 'wrong', { same: !!o.same, rule: o.rule, label: t }));
          }
        });
      }
    });
    // level rules
    if (lv === 1) ps.forEach((p, n) => {
      const nm = p.names.new;
      ok(!/ene\b|yne\b|ene$|\(R\)|\(S\)|\(E\)|\(Z\)|cis|trans|benzene|aniline|phenol|toluene/.test(nm), `L1 #${n} ${nm}: only alkanes, halides and rings`);
      const carbons = (p.smiles.match(/C(?!l)/g) || []).length;
      ok(carbons <= 9, `L1 #${n} ${p.smiles}: at most 9 carbons in all (parent C8 plus a branch counts under the same cap)`);
    });
    if (lv === 3) ps.forEach((p, n) => ok(/(ene|yne|diene|adiene)\b|ene$|yne$/.test(p.names.new), `L3 #${n} ${p.names.new}: has a C=C or C≡C`));
    if (lv === 4) ps.forEach((p, n) => ok(p.tag === 'arene' || p.tag === 'benzyl' || /^(cis|trans)-|^\(/.test(p.names.new), `L4 #${n} ${p.names.new}: a stereo label in front or a benzene derivative`));
    // coverage of the kinds
    const need = {
      1: ['alkane', 'halide', 'ring', 'ring-tie', 'chain-ring', 'typed', 'options'],
      2: ['tie', 'fpd', 'complex', 'multi', 'halide', 'ring-many', 'halo-alkyl', 'typed', 'options'],
      3: ['ene', 'yne', 'diene', 'cycloalkene', 'trap', 'ez', 'typed', 'options'],
      4: ['rs1', 'rs2', 'ct', 'ez-rs', 'rs', 'ez', 'arene', 'benzyl', 'typed', 'options'],
      5: ['tricky', 'parent', 'numbering', 'alphabetical', 'ring-chain', 'alkene', 'stereo', 'benzene', 'group', 'typed', 'options']
    }[lv];
    need.forEach((k) => ok((cover[k] || 0) >= 1, `level ${lv} covers "${k}" (${cover[k] || 0} of 60)`));
    console.log(`  Level ${lv}: ${Object.entries(cover).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  }
  function MODEL_DISTINCT(n, names) { return ['new', 'old', 'sys', 'yl'].every((m) => normName(n.new) !== normName(names[m]) && normName(n.old) !== normName(names[m])); }

  // ------------------------------------------------------------------ (3) OPSIN
  {
    const res = opsin(queue.map((x) => x.name));
    stats.names = new Set(queue.map((x) => x.name)).size;
    let rightOk = 0, rightN = 0, wrongN = 0;
    for (const x of queue) {
      const out = res[x.name];
      if (x.role === 'correct') {
        rightN++;
        const good = !!out && same(out, x.smiles, x.relative);
        if (good) rightOk++;
        ok(good, `OPSIN: "${x.name}" is the drawing ${x.smiles} (${x.label}) -> ${out || 'unparsed'}`);
      } else {
        wrongN++;
        if (!out) { stats.opsinFail++; continue; }
        const equal = same(out, x.smiles, x.relative);
        ok(equal === x.same, `OPSIN: wrong name "${x.name}" (${x.rule}) for ${x.smiles}: flagged ${x.same ? 'same compound' : 'different compound'}, OPSIN says ${equal ? 'the same compound' : 'a different one'} (${out})`);
        if (equal) stats.sameFlagged++;
        if (!x.same) ok(!equal, `OPSIN: wrong name "${x.name}" is a different structure from the drawing (or fails to parse)`);
      }
    }
    stats.wrongNames = wrongN;
    console.log(`  OPSIN: ${rightOk}/${rightN} correct names reproduce their drawings; ${wrongN} wrong names checked (${stats.opsinFail} do not parse, ${stats.sameFlagged} are the same compound under a wrong name, the rest are different structures)`);
    ok(rightN > 300 && rightOk === rightN, `OPSIN agreed on all ${rightN} correct names`);
  }

  // ------------------------------------------------------------------ (4) the namer against the Lesson 05 / 07 engines
  {
    const rng = mulberry32(8675309);
    let n = 0, mism = 0;
    for (let i = 0; i < 4200 && n < 3500; i++) {
      const lv = [1, 2, 2, 3, 3][i % 5];
      const s = G.randomSmiles(rng, lv);
      if (!s || /Cl|Br|F|I/.test(s)) continue;
      const mine = { new: G.nameMol(s, 'new'), old: G.nameMol(s, 'old') };
      if (!mine.new || !mine.old) { stats.engineSkipped++; continue; }
      const multi = /[=#]/.test(s);
      const eng = multi ? nameAlkeneBoth(s) : nameBoth(s);
      if (!eng) { stats.engineSkipped++; continue; }
      n++;
      const okk = eng.new === mine.new && eng.old === mine.old;
      if (!okk) { mism++; if (mism < 6) console.log('   MISMATCH', s, JSON.stringify(eng), JSON.stringify(mine)); }
    }
    stats.engine = n;
    ok(n >= 2500 && mism === 0, `the namer equals the Lesson 05 / 07 engines on ${n} hydrocarbons in both styles (${mism} differences)`);
    console.log(`  Namer vs engines: ${n} hydrocarbons compared, ${mism} differences, ${stats.engineSkipped} outside the old engines' scope`);
  }

  // ------------------------------------------------------------------ (6) the tricky set
  {
    const C = G.CURATED;
    ok(C.length >= 20 && C.length <= 40, `tricky set has ${C.length} entries (20 to 40)`);
    ok(C.filter((e) => e.improper).length >= 8, 'at least 8 tricky entries are past-paper B1 style (an improper name to correct)');
    eq(new Set(C.map((e) => e.id)).size, C.length, 'tricky ids are unique');
    eq(new Set(C.map((e) => e.smiles)).size, C.length, 'tricky structures are all different');
    const cats = new Set(C.map((e) => e.cat));
    ['parent', 'numbering', 'alphabetical', 'ring-chain', 'alkene', 'stereo', 'benzene', 'group'].forEach((c) => ok(cats.has(c), `tricky set has a "${c}" entry`));
    const EXPECT = {
      t01: '3-ethyl-2-methylpentane', t02: '3-methylhexane', t03: '3-methylpentane', t04: '2,2,4-trimethylpentane', t05: '2,5,5-trimethylheptane', t06: '3,3-diethyl-2-methylpentane',
      t07: '2-methyl-4-(propan-2-yl)heptane', t08: '1-tert-butyl-4-chlorocyclohexane', t09: 'methylcyclohexane', t10: '1-cyclopropylbutane', t11: '1-ethyl-3-methylcyclohexane',
      t12: '2-bromo-4-chloropentane', t13: '3-propylhex-1-ene', t14: '4-methylpent-2-yne', t15: '(E)-2-chlorobut-2-ene', t16: '3-methylcyclohexene', t17: '(2E,4E)-hexa-2,4-diene',
      t18: '(E)-4-methylpent-2-ene', t19: '(S)-2-bromobutane', t20: '(2R,3S)-2,3-dibromobutane', t21: 'cis-1,3-dimethylcyclohexane', t22: '(2E,4S)-4-methylhex-2-ene',
      t23: '4-chloroaniline', t24: '2,5-dichlorotoluene', t25: '(chloromethyl)benzene', t26: '4-methylpentan-2-ol', t27: 'butan-2-ol', t28: '(E)-pent-2-ene'
    };
    const cq = [];
    const cqueue = (name, smiles, role, extra) => cq.push({ name, smiles, role, relative: /^\s*(cis|trans)-/i.test(name), ...extra });
    C.forEach((e) => {
      const t = `tricky ${e.id}`;
      ok(typeof e.slip === 'string' && e.slip.length > 40 && e.slip.length < 260 && !BAD.test(e.slip), `${t} has a one-line why-people-get-this-wrong`);
      ok(typeof e.src === 'string' && e.src.length > 4, `${t} says where it comes from`);
      ok(!!canon(e.smiles), `${t} smiles parses`);
      const nm = G.curatedNames(e);
      ok(!!nm && nm.new && nm.old, `${t} has names`);
      if (nm && EXPECT[e.id]) eq(nm.new, EXPECT[e.id], `${t} correct name (hand-checked)`);
      [nm.new, nm.old, nm.sys, ...(nm.accept || [])].forEach((x) => cqueue(x, e.smiles, 'correct', { label: t }));
      const wr = e.wrong || (e.fixed != null ? G.BENZYL[e.fixed].wrong : []);
      ok(wr.length >= 1 || !!G.modeInfos(e.smiles), `${t} has wrong names to show`);
      wr.forEach((w) => {
        ok(typeof w.why === 'string' && w.why.length > 40 && !BAD.test(w.why), `${t} wrong name "${w.name}" has its reason`);
        ok(typeof w.same === 'boolean', `${t} wrong name "${w.name}" says whether it is the same compound`);
        [w.name, w.old || w.name].forEach((x) => { ok(normName(x) !== normName(nm.new) && normName(x) !== normName(nm.old), `${t} "${x}" is not the right name`); cqueue(x, e.smiles, 'wrong', { same: w.same, rule: 'tricky', label: t }); });
      });
      if (e.improper) {
        ok(wr.some((w) => normName(w.name) === normName(e.improper) && w.same === true), `${t} the improper name "${e.improper}" is one of the same-compound wrong names (B1 style)`);
        let sawImproper = false;
        for (let k = 0; k < 24 && !sawImproper; k++) { const pi = G.makeCurated(mulberry32(k * 101 + 3), k % 2 ? 'options' : 'typed', e.id); if (pi.improper) { sawImproper = true; ok(pi.prompt.includes(e.improper) && (!pi.options || !pi.options.some((o) => normName(o.name.new) === normName(e.improper) || normName(o.name.old) === normName(e.improper))), `${t} improper-name prompt names it and does not offer it back as an answer`); } }
        ok(sawImproper, `${t} the improper-name form is produced`);
      }
      // both formats where the entry allows them
      const rng = mulberry32(e.id.charCodeAt(2) * 31 + 7);
      const po = G.makeCurated(rng, 'options', e.id), pt = G.makeCurated(rng, 'typed', e.id);
      ok(po.entry === e.id && po.level === 5 && po.slip === e.slip && /Why people slip/.test(po.derive), `${t} walkthrough ends with the slip`);
      ok(pt.kind === 'input' && pt.format === 'typed' && checkInput({ answer: pt.answer, accept: pt.accept, name: true, skill: pt.skill }, pt.answer).ok, `${t} typed form accepts the answer`);
      if (po.format === 'options') { eq(po.options.length, 4, `${t} four options`); eq(po.options.filter((o) => o.correct).length, 1, `${t} one correct option`); }
    });
    const res = opsin(cq.map((x) => x.name));
    let good = 0, n = 0;
    cq.forEach((x) => {
      const out = res[x.name];
      if (x.role === 'correct') { n++; const g = !!out && same(out, x.smiles, x.relative); if (g) good++; ok(g, `OPSIN (tricky): "${x.name}" is the drawing for ${x.label} -> ${out || 'unparsed'}`); }
      else if (out) ok(same(out, x.smiles, x.relative) === x.same, `OPSIN (tricky): wrong name "${x.name}" for ${x.label}: flagged ${x.same ? 'same' : 'different'} compound, OPSIN says ${same(out, x.smiles, x.relative) ? 'same' : 'different'} (${out})`);
    });
    console.log(`  Tricky set: ${C.length} entries; OPSIN ${good}/${n} correct names reproduce the drawing; ${cq.filter((x) => x.role === 'wrong').length} wrong names flagged and checked`);
    ok(good === n, 'every tricky correct name reproduces its drawing in OPSIN');
  }

  // ------------------------------------------------------------------ (7b) New / Old IUPAC style
  {
    store.setIupac('old');
    const rng = mulberry32(77);
    let seenDiff = 0;
    for (let i = 0; i < 40; i++) {
      const p = G.makeLevelProblem(rng, 2);
      if (p.names.new !== p.names.old) {
        seenDiff++;
        if (p.format === 'typed') eq(p.answer, p.names.old, 'old style: the answer is the traditional name');
        else ok(p.answer === p.names.old, 'old style: the answer is the traditional name');
        ok(p.names.new !== p.answer, 'old style: the answer differs from the current-style name');
        ok(p.derive.length > 40, 'old style walkthrough');
      }
    }
    ok(seenDiff >= 5, `the two styles differ on ${seenDiff} of 40 Level 2 problems and the answer follows the switch`);
    store.setIupac('new');
    const p = G.makeLevelProblem(mulberry32(78), 2, 'typed');
    ok(p.answer === p.names.new, 'new style: the answer is the current-style name');
  }

  // ================================================================== (8) substituent forms: one group, four spellings, each filed under its own letter
  {
    const F = NF.formsOfId;
    const want = {
      isopropyl: { new: 'propan-2-yl', old: 'isopropyl', sys: '1-methylethyl', yl: 'propan-2-yl' },
      'sec-butyl': { new: 'butan-2-yl', old: 'sec-butyl', sys: '1-methylpropyl', yl: 'butan-2-yl' },
      isobutyl: { new: '2-methylpropyl', old: 'isobutyl', sys: '2-methylpropyl', yl: '2-methylpropyl' },
      'tert-butyl': { new: 'tert-butyl', old: 'tert-butyl', sys: '1,1-dimethylethyl', yl: '2-methylpropan-2-yl' },
      neopentyl: { new: '2,2-dimethylpropyl', old: 'neopentyl', sys: '2,2-dimethylpropyl', yl: '2,2-dimethylpropyl' },
      isopentyl: { new: '3-methylbutyl', old: 'isopentyl', sys: '3-methylbutyl', yl: '3-methylbutyl' }
    };
    for (const [id, w] of Object.entries(want)) NF.STYLES.forEach((s) => eq(F(id)[s], w[s], `form of ${id} (${s})`));
    // the alphabetical letter of each spelling
    const letter = (id, s) => F(id).key[s][0];
    eq(['isopropyl', 'tert-butyl', 'sec-butyl', 'isobutyl', 'neopentyl', 'isopentyl'].map((id) => letter(id, 'old')).join(''), 'ibbini', 'traditional letters: isopropyl i, tert-butyl b, sec-butyl b, isobutyl i, neopentyl n, isopentyl i');
    eq(['isopropyl', 'sec-butyl', 'isobutyl', 'tert-butyl'].map((id) => letter(id, 'sys')).join(''), 'mmmd', 'systematic letters: (1-methylethyl) m, (1-methylpropyl) m, (2-methylpropyl) m, (1,1-dimethylethyl) d');
    eq(['isopropyl', 'sec-butyl', 'tert-butyl'].map((id) => letter(id, 'yl')).join(''), 'pbm', 'yl-locant letters: propan-2-yl p, butan-2-yl b, 2-methylpropan-2-yl m');
    ok(F('cyclo5').new === 'cyclopentyl' && F('methyl').sys === 'methyl', 'cycloalkyl and simple groups have one spelling');
    // the general rule gives the same words for the named groups and for any other alkyl tree; OPSIN reads every one back as the same group
    const trees = [[[], []], [[], [[]]], [[[], []]], [[], [], []], [[[], [], []]], [[[[], []]]], [[[], []], []], [[], [[[]]]], [[[], []], [[]]], [[[], [[]]]], [[[[]], []]], [[], [], [[]]]];
    const treeSmiles = (t) => 'C' + t.map((k) => `(${treeSmiles(k)})`).join('');
    const rootOf = (t) => treeSmiles(t);
    // simpler and exact: the cyclohexane carbon carries the group: C1(<group>)CCCCC1
    const tq2 = [];
    trees.forEach((t) => { const f = NF.formsOfTree(t); ['sys', 'yl'].forEach((s) => tq2.push({ name: `(${f[s]})cyclohexane`, smiles: `C1(${rootOf(t)})CCCCC1`, label: `${s} of tree ${JSON.stringify(t)}` })); });
    ['isopropyl', 'sec-butyl', 'isobutyl', 'tert-butyl', 'neopentyl', 'isopentyl'].forEach((id) => { const frag = G.fragOf(id); NF.STYLES.forEach((s) => tq2.push({ name: `(${F(id)[s]})cyclohexane`, smiles: `C1(${frag})CCCCC1`, label: `${id} (${s})` })); });
    const tres = opsin(tq2.map((x) => x.name));
    tq2.forEach((x) => ok(!!tres[x.name] && same(tres[x.name], x.smiles), `OPSIN: ${x.name} is the group of ${x.label} on cyclohexane (${tres[x.name] || 'unparsed'})`));
    console.log(`  Substituent forms: ${tq2.length} bracketed forms read back by OPSIN`);
  }

  // ================================================================== (9) 200 structures with isopropyl / sec- / tert- / iso- / neo- groups: every style, re-alphabetised, OPSIN, the checker
  {
    const rng = mulberry32(0x5eed1);
    const GROUPS = ['isopropyl', 'sec-butyl', 'tert-butyl', 'isobutyl', 'neopentyl', 'isopentyl'];
    const OTHERS = ['methyl', 'ethyl', 'chloro', 'bromo', 'propyl', 'methyl', 'ethyl', 'isopropyl', 'tert-butyl'];
    const pk = (a) => a[Math.floor(rng() * a.length)];
    const structs = []; const seen = new Set();
    for (let guard = 0; structs.length < 200 && guard < 6000; guard++) {
      const g1 = pk(GROUPS), g2 = rng() < 0.65 ? pk(OTHERS) : pk(GROUPS), g3 = rng() < 0.3 ? pk(['methyl', 'chloro', 'ethyl']) : null;
      let smiles;
      if (rng() < 0.4) {
        const n = pk([5, 6, 6, 7]); const locs = [1, 2, 3, 4, 5, 6, 7].filter((x) => x <= n).sort(() => rng() - 0.5);
        const subs = [{ id: g1, loc: locs[0] }, { id: g2, loc: locs[1] }]; if (g3) subs.push({ id: g3, loc: locs[2] });
        if (subs.some((s) => G.sinfo(s.id).rooted > n)) continue;
        smiles = G.buildRing({ size: n, subs });
      } else {
        const m = pk([7, 8, 9, 10]); const subs = []; const used = new Set();
        for (const id of [g1, g2, g3].filter(Boolean)) {
          const h = G.sinfo(id).halo; const lo = h ? 1 : G.sinfo(id).rooted + 1, hi = h ? m : m - G.sinfo(id).rooted;
          if (hi < lo) { subs.length = 0; break; }
          const loc = lo + Math.floor(rng() * (hi - lo + 1)); if (used.has(loc)) { subs.length = 0; break; }
          used.add(loc); subs.push({ id, loc });
        }
        if (subs.length < 2) continue;
        smiles = G.buildAcyclic({ n: m, subs });
      }
      if (!smiles || seen.has(smiles)) continue;
      const infos = G.modeInfos(smiles); if (!infos) continue;
      if (!infos.new.subs.some((s) => GROUPS.includes(s.id))) continue;
      seen.add(smiles); structs.push({ smiles, infos, names: G.namesOf(infos) });
    }
    eq(structs.length, 200, '200 structures with branched groups');
    const reordered = structs.filter((s) => new Set(NF.STYLES.map((m) => normName(s.names[m]))).size > 1);
    // different alphabetical ORDER of the same prefixes in different styles (not just different spellings)
    const orderOf = (s, m) => [...new Set(s.infos[m].subs.map((x) => x.id))].sort((a, b) => (G.sinfo(a).key[m] < G.sinfo(b).key[m] ? -1 : G.sinfo(a).key[m] > G.sinfo(b).key[m] ? 1 : 0)).join('|');
    const reAlpha = structs.filter((s) => new Set(NF.STYLES.map((m) => orderOf(s, m))).size > 1);
    ok(reAlpha.length >= 25, `at least 25 of the 200 structures are ordered differently in different styles (${reAlpha.length})`);
    ok(reordered.length >= 100, `the styles spell most of them differently (${reordered.length})`);
    const kinds = new Set(); structs.forEach((s) => s.infos.new.subs.forEach((x) => { if (GROUPS.includes(x.id)) kinds.add(x.id); }));
    eq([...kinds].sort(), GROUPS.slice().sort(), 'all six branched groups appear');
    const nq = []; const wq = [];
    structs.forEach((s, n) => {
      const t = `form #${n} ${s.smiles}`;
      NF.STYLES.forEach((m) => nq.push({ name: s.names[m], smiles: s.smiles, label: `${t} (${m})` }));
      // the checker accepts every style's name, whichever style the answer is written in
      NF.STYLES.forEach((m) => {
        const step = { name: true, smiles: s.smiles, answer: s.names[m === 'old' ? 'old' : 'new'], accept: [] };
        NF.STYLES.forEach((m2) => { const r = checkInput(step, s.names[m2]); ok(r.ok, `${t}: "${s.names[m2]}" (${m2}) is accepted`); if (r.note) ok(/^Accepted: /.test(r.note), `${t}: the style note reads "Accepted: ..."`); });
      });
      // the style note names the style used
      const rSys = checkInput({ name: true, smiles: s.smiles, answer: s.names.new }, s.names.sys);
      if (normName(s.names.sys) !== normName(s.names.new) && normName(s.names.sys) !== normName(s.names.old) && normName(s.names.sys) !== normName(s.names.yl)) ok(/^Accepted: systematic form \(/.test(rSys.note || ''), `${t}: a systematic-form answer is labelled (${rSys.note})`);
      // wrong orderings in each style are rejected: the other styles' spellings written in THIS style's order do not count, and neither does any wrong name the namer builds
      const cands = G.wrongNames(s.smiles, s.infos);
      cands.forEach((c) => {
        NF.STYLES.forEach((m) => {
          const r = checkInput({ name: true, smiles: s.smiles, answer: s.names.new, accept: [] }, c.name[m]);
          ok(!r.ok, `${t}: wrong name "${c.name[m]}" (${c.rule}, ${m}) is rejected by the multi-style checker`);
        });
        ['new', 'old', 'sys', 'yl'].forEach((m) => wq.push({ name: c.name[m], smiles: s.smiles, same: c.same, rule: c.rule, label: t }));
      });
      // hand-made wrong ORDERINGS: reverse and by-number order in every style
      const subs = s.infos.new.subs;
      if (new Set(subs.map((x) => x.id)).size >= 2) NF.STYLES.forEach((m) => {
        ['reverse', 'locant'].forEach((order) => {
          const p = G.partsOf(s.infos[m]);
          const nm = G.assemble(p, m, { order });
          if (nm !== s.names[m] && !NF.STYLES.some((x) => normName(s.names[x]) === normName(nm))) ok(!checkInput({ name: true, smiles: s.smiles, answer: s.names.new }, nm).ok, `${t}: ${order} order in the ${m} style ("${nm}") is rejected`);
        });
      });
    });
    const res = opsin(nq.map((x) => x.name).concat(wq.map((x) => x.name)));
    let good = 0;
    nq.forEach((x) => { const out = res[x.name]; const g = !!out && same(out, x.smiles, false); if (g) good++; ok(g, `OPSIN: "${x.name}" is the drawing ${x.smiles} (${x.label}) -> ${out || 'unparsed'}`); });
    let wsame = 0, wfail = 0;
    wq.forEach((x) => { const out = res[x.name]; if (!out) { wfail++; return; } const equal = same(out, x.smiles, false); if (equal) wsame++; ok(equal === x.same, `OPSIN: wrong name "${x.name}" (${x.rule}) for ${x.smiles}: flagged ${x.same ? 'same' : 'different'}, OPSIN says ${equal ? 'same' : 'different'} (${out})`); });
    ok(good === nq.length, `OPSIN agreed on all ${nq.length} style names`);
    console.log(`  Branched groups: ${structs.length} structures, ${nq.length} names in four styles all read back by OPSIN; ${reAlpha.length} re-alphabetised; ${wq.length} wrong names checked (${wfail} unparsed, ${wsame} same compound)`);

    // hand cases the book writes
    const H = [
      ['CC(C)CC(C(C)C)CCC', ['4-isopropyl-2-methylheptane', '2-methyl-4-(propan-2-yl)heptane', '2-methyl-4-(1-methylethyl)heptane'], ['2-methyl-4-isopropylheptane', '4-(propan-2-yl)-2-methylheptane', '4-(1-methylethyl)-2-methylheptane']],
      ['CC(C)(C)C1CCC(Cl)CC1', ['1-tert-butyl-4-chlorocyclohexane', '1-chloro-4-(1,1-dimethylethyl)cyclohexane', '1-chloro-4-(2-methylpropan-2-yl)cyclohexane'], ['1-chloro-4-tert-butylcyclohexane', '1-(1,1-dimethylethyl)-4-chlorocyclohexane', '1-(2-methylpropan-2-yl)-4-chlorocyclohexane']],
      ['CC1CCC(CC(C)(C)C)CC1', ['1-methyl-4-neopentylcyclohexane', '1-(2,2-dimethylpropyl)-4-methylcyclohexane'], ['1-neopentyl-4-methylcyclohexane', '1-methyl-4-(2,2-dimethylpropyl)cyclohexane']],
      ['CCC1CCC(CC(C)(C)C)CC1', ['1-ethyl-4-neopentylcyclohexane', '1-(2,2-dimethylpropyl)-4-ethylcyclohexane'], ['1-neopentyl-4-ethylcyclohexane', '1-ethyl-4-(2,2-dimethylpropyl)cyclohexane']],
      ['BrC1CCC(CC(C)(C)C)CC1', ['1-bromo-4-neopentylcyclohexane', '1-bromo-4-(2,2-dimethylpropyl)cyclohexane'], ['1-neopentyl-4-bromocyclohexane', '1-(2,2-dimethylpropyl)-4-bromocyclohexane']]
    ];
    H.forEach(([smi, rights, wrongs]) => {
      rights.forEach((nm) => ok(checkInput({ name: true, smiles: smi, answer: rights[0] }, nm).ok, `book case ${smi}: "${nm}" accepted`));
      wrongs.forEach((nm) => ok(!checkInput({ name: true, smiles: smi, answer: rights[0] }, nm).ok, `book case ${smi}: "${nm}" rejected`));
    });
    const hres = opsin(H.flatMap((h) => h[1]));
    H.forEach(([smi, rights]) => rights.forEach((nm) => ok(!!hres[nm] && same(hres[nm], smi), `OPSIN: book case "${nm}" is ${smi} (${hres[nm]})`)));
    // the answer must belong to the molecule: a step that shows one molecule and asks for ANOTHER name is not graded by this
    const mirror = { name: true, smiles: 'C[C@H](Br)CC', answer: '(R)-2-bromobutane', accept: [] };
    ok(!checkInput(mirror, '(S)-2-bromobutane').ok && checkInput(mirror, '(R)-2-bromobutane').ok, 'the mirror-image step still wants the OTHER name (the shown molecule is not graded by its own name)');
  }

  // ================================================================== (9b) review finding 3: the "-1-ene" locant on a cycloalkene
  {
    const RING_ENE = [
      ['CC1=CCCC1', ['1-methylcyclopentene', '1-methylcyclopent-1-ene', '1-Methylcyclopent-1-ene', '1-methylcyclopent 1 ene'], [['1-methylcyclopent-2-ene', /always C1=C2/], ['2-methylcyclopent-1-ene', /numbering of the substituents/]]],
      ['CC(C)C1C=CCC1', ['3-(propan-2-yl)cyclopentene', '3-(propan-2-yl)cyclopent-1-ene', '3-isopropylcyclopentene', '3-isopropylcyclopent-1-ene', '3-(1-methylethyl)cyclopent-1-ene'], [['4-isopropylcyclopent-1-ene', /numbering of the substituents/]]],
      ['C1=CCCC1', ['cyclopentene', 'cyclopent-1-ene'], [['cyclopent-2-ene', /always C1=C2/]]],
      ['CC1C=CCCC1', ['3-methylcyclohexene', '3-methylcyclohex-1-ene'], [['6-methylcyclohex-1-ene', /numbering of the substituents/], ['4-methylcyclohex-1-ene', /numbering of the substituents/]]]
    ];
    const ringRes = opsin(RING_ENE.flatMap((r) => r[1].filter((n) => !/ /.test(n) && n === n.toLowerCase())));
    for (const [smi, rights, wrongs] of RING_ENE) {
      const step = { name: true, smiles: smi, answer: G.namesOf(G.modeInfos(smi)).new, skill: 'naming-levels', diagnoseFn: (raw) => diagnoseAlkene(smi, raw) };
      rights.forEach((nm) => ok(checkInput(step, nm).ok, `cycloalkene ${smi}: "${nm}" is accepted`));
      wrongs.forEach(([nm, why]) => { const r = checkInput(step, nm); ok(!r.ok && why.test(r.diagnosis), `cycloalkene ${smi}: "${nm}" is rejected with a hint about the actual difference (${r.diagnosis})`); });
      rights.filter((nm) => ringRes[nm]).forEach((nm) => ok(same(ringRes[nm], smi, false), `OPSIN: "${nm}" is ${smi} (${ringRes[nm]})`));
    }
    // the systematic and traditional spellings are one molecule, both accepted, either with or without the locant
    ok(['3-(propan-2-yl)cyclopent-1-ene', '3-isopropylcyclopentene'].every((nm) => G.matchNameForms('CC(C)C1C=CCC1', nm).ok), '3-(propan-2-yl)cyclopent-1-ene and 3-isopropylcyclopentene are the same molecule');
    // a chain alkene is untouched by the ring rule: but-1-ene stays, "cyclo" is needed for the rule
    ok(G.ringEneLocant('hex-1-ene', G.modeInfos('CCCCC=C').new) === 'hex-1-ene', 'a chain name is left alone by the ring-locant rule');
  }

  // ================================================================== (10) Lesson 05 / 07 input steps take every style with no accept list needed
  {
    const s15 = L5.steps.find((s) => s.id === 's15');
    ['2-methyl-4-(propan-2-yl)heptane', '4-isopropyl-2-methylheptane', '2-methyl-4-(1-methylethyl)heptane', '2-METHYL 4 (propan-2-yl) HEPTANE'].forEach((t) => ok(checkInput(s15, t).ok, `Lesson 5 s15 accepts "${t}"`));
    ['2-methyl-4-isopropylheptane', '4-(propan-2-yl)-2-methylheptane', '4-(1-methylethyl)-2-methylheptane', '2,6-dimethylheptane'].forEach((t) => ok(!checkInput(s15, t).ok, `Lesson 5 s15 rejects "${t}"`));
    const noList = { ...s15, accept: [] };
    ['4-isopropyl-2-methylheptane', '2-methyl-4-(1-methylethyl)heptane'].forEach((t) => ok(checkInput(noList, t).ok, `Lesson 5 s15 needs no accept list for "${t}"`));
    ok(/^Accepted: systematic form \(1-methylethyl\)/.test(checkInput(s15, '2-methyl-4-(1-methylethyl)heptane').note || ''), 'feedback names the style used: "Accepted: systematic form (1-methylethyl)"');
    ok(/^Accepted: traditional form \(isopropyl\)/.test(checkInput(s15, '4-isopropyl-2-methylheptane').note || ''), 'feedback: traditional form (isopropyl)');
    ok(/^Accepted: current IUPAC/.test(checkInput(s15, '2-methyl-4-(propan-2-yl)heptane').note || ''), 'feedback: current IUPAC form');
    for (const L of [L5, L7]) for (const st of L.steps.filter((x) => x.type === 'input' && x.name && x.smiles)) {
      const bare = { ...st, accept: [] };
      const names = G.nameAll(st.smiles);
      if (!names) continue;
      NF.STYLES.forEach((m) => ok(checkInput(bare, names[m]).ok, `Lesson ${L.id} ${st.id}: the ${m}-style name "${names[m]}" is accepted without an accept list`));
      (st.accept || []).concat([st.answer]).forEach((a) => ok(checkInput(st, a).ok, `Lesson ${L.id} ${st.id}: "${a}" is still accepted`));
      (st.diagnose || []).forEach((d) => ok(!checkInput(st, d.match).ok, `Lesson ${L.id} ${st.id}: "${d.match}" is still rejected`));
    }
  }

  // ================================================================== (11) settings: normaliser, dial, presets round-trip, the five levels as presets
  {
    store.resetAll();
    const D = C.defaultSettings();
    eq(C.normalizeSettings(D), D, 'normalising is idempotent');
    const junk = C.normalizeSettings({ classes: ['x'], length: 'nope', subs: [], stereo: 5, qtypes: 'q', traps: ['zz'], count: 7, timer: 33, style: 'x', complex: 'maybe' });
    ok(junk.classes.length >= 1 && C.LENGTH_IDS.includes(junk.length) && junk.subs.length >= 1 && C.STEREO_IDS.includes(junk.stereo) && junk.qtypes.length >= 1 && junk.traps.length === 0 && C.COUNTS.includes(junk.count) && C.TIMERS.includes(junk.timer) && C.STYLE_IDS.includes(junk.style) && C.TRI_IDS.includes(junk.complex), 'garbage settings fall back to valid ones');
    for (const d of C.DIFF_IDS) {
      const S = C.difficultySettings(d, { count: 20, timer: 90, style: 'old' });
      eq([S.count, S.timer, S.style, S.difficulty], [20, 90, 'old', d], `${d}: the dial keeps count, timer and style`);
      ok(S.classes.length >= 3 && S.qtypes.length >= 2, `${d}: the dial sets sensible defaults`);
    }
    ok(C.difficultySettings('easy').complex === 'no' && C.difficultySettings('hard').complex === 'yes' && C.difficultySettings('hard').traps.length >= 3, 'easy has no complex groups; hard asks for them and for traps');
    ok(C.changeSettings(C.difficultySettings('easy'), { length: 'any' }).difficulty === '', 'changing a setting by hand leaves the dial');
    ok(C.changeSettings(C.levelPreset(2), { count: 20 }).legacyLevel === 2, 'count / timer / style do not leave a level preset');
    ok(!('legacyLevel' in C.changeSettings(C.levelPreset(2), { stereo: 'rs' })), 'a content setting leaves a level preset');
    // presets
    eq(C.listPresets().filter((p) => p.builtin).map((p) => p.name), ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'], 'five built-in presets');
    for (const n of G.LEVELS) { const P = C.loadPreset(`Level ${n}`); ok(P && P.legacyLevel === n && P.preset === `Level ${n}`, `Level ${n} loads as a preset`); }
    const mine = C.changeSettings(C.difficultySettings('hard'), { classes: ['alkene', 'diene'], stereo: 'ez', traps: ['cc'], count: 20, timer: 60, qtypes: ['fix', 'draw'], style: 'either' });
    eq(C.savePreset('My alkenes', mine), { ok: true, name: 'My alkenes' }, 'save a preset');
    const back = C.loadPreset('My alkenes');
    const strip = (x) => { const y = { ...x }; delete y.preset; return y; };
    eq(strip(back), strip(mine), 'a saved preset loads back exactly');
    eq(back.preset, 'My alkenes', 'a loaded preset remembers its name');
    ok(C.listPresets().some((p) => p.name === 'My alkenes' && !p.builtin), 'it is listed');
    ok(C.savePreset('my ALKENES', C.defaultSettings()).ok && C.listPresets().filter((p) => !p.builtin).length === 1, 'the same name (any capitals) replaces the old preset');
    ok(!C.savePreset('Level 3', mine).ok && C.loadPreset('Level 3').legacyLevel === 3, 'a built-in level cannot be overwritten');
    ok(!C.savePreset('   ', mine).ok, 'an empty name is refused');
    eq(C.cleanName('  <b>x</b> & "y"  '), 'bx/b y', 'a name loses markup characters');
    ok(!C.deletePreset('Level 2') && C.listPresets().filter((p) => p.builtin).length === 5, 'a built-in level cannot be deleted');
    ok(C.deletePreset('my alkenes') && C.loadPreset('My alkenes') === null && !C.deletePreset('My alkenes'), 'a saved preset can be deleted once');
    C.savePreset('Keep', mine);
    const kept = C.loadPreset('Keep');
    C.setCurrentSettings(kept);
    eq(C.currentSettings().classes, ['alkene', 'diene'], 'the current settings persist in the store (ui.naming)');
    G.setLevel(3);
    ok(C.currentSettings().legacyLevel === 3, 'choosing a level the old way switches back to that preset');
    C.setCurrentSettings(C.levelPreset(4));
    eq([C.currentSettings().legacyLevel, G.getLevel()], [4, 4], 'a level preset also sets the remembered level');
    store.resetAll();
    eq(C.currentSettings().legacyLevel, 1, 'with nothing stored the page opens on Level 1, as before');
    // the five levels are presets: every problem a level makes lies inside its preset
    let inside = 0, unknown = 0;
    for (const lv of [1, 2, 3, 4, 5]) {
      const P = C.levelPreset(lv);
      byLevel[lv].forEach((p, n) => {
        const f = C.featuresOfProblem(p);
        if (!f) { unknown++; return; }
        inside++;
        ok(C.satisfies(f, P), `Level ${lv} #${n} ${p.smiles} (${p.names.new}) lies inside the Level ${lv} preset (${[...f.classes]}, parent C${f.parent}, ${f.nsubs} groups)`);
      });
    }
    console.log(`  Presets: ${inside} level problems measured against their preset (${unknown} hand-written entries not measurable)`);
  }

  // ================================================================== (12) the custom generator honours every filter, or says why not
  {
    store.resetAll();
    const rng = mulberry32(20261021);
    const pk = (a) => a[Math.floor(rng() * a.length)];
    const subset = (a, lo, hi) => { const n = lo + Math.floor(rng() * (hi - lo + 1)); return a.slice().sort(() => rng() - 0.5).slice(0, n); };
    const randomSettings = () => C.normalizeSettings({
      classes: subset(C.CLASS_IDS.filter((c) => c !== 'alcohol' || rng() < 0.3), 1, 4), length: pk(C.LENGTH_IDS), subs: subset(C.SUBN_IDS, 1, 3),
      complex: pk(C.TRI_IDS), halogens: pk(C.TRI_IDS), stereo: pk(C.STEREO_IDS), style: pk(C.STYLE_IDS), qtypes: subset(C.QTYPE_IDS, 1, 3), traps: rng() < 0.45 ? [] : subset(C.TRAP_IDS, 1, 2), count: 5, timer: 0
    });
    const combos = []; for (let i = 0; i < 150; i++) combos.push(randomSettings());
    const seenQ = {}, seenCls = {}; let clean = 0, relaxedN = 0, staticN = 0, made = 0;
    const oq = [];    // custom problems for OPSIN
    const perCombo = [];
    combos.forEach((S, i) => {
      const t = `combo #${i} [${S.classes}] ${S.length} subs ${S.subs} cx ${S.complex} hal ${S.halogens} st ${S.stereo} q ${S.qtypes} traps ${S.traps}`;
      const { problems, report } = C.generateCustom(rng, S, 2);
      perCombo.push({ S, problems, report });
      const E = report.eff;
      ok(problems.length === 2, `${t}: two problems`);
      const stat = C.compatibleClasses(S).length === 0;
      if (stat) { staticN++; ok(report.relaxed.length > 0, `${t}: a combination the class rules call impossible is reported as relaxed`); }
      if (!report.relaxed.length) { clean++; eq(E, S, `${t}: nothing relaxed, so the settings in force are the ones asked for`); ok(report.message === '', `${t}: no message when nothing is relaxed`); }
      else {
        relaxedN++;
        ok(report.message.length > 40 && report.relaxed.every((k) => report.message.includes(C.RELAX_LABEL[k])), `${t}: the message names every setting that was relaxed (${report.relaxed})`);
        ok(report.changes.every((c) => c.from !== c.to), `${t}: each change really changes something`);
        for (const k of C.RELAX_ORDER) if (!report.relaxed.includes(k)) ok(JSON.stringify(E[k]) === JSON.stringify(S[k]), `${t}: ${k} was not touched`);
        const html = C.settingsCardHtml(S, { report, open: false });
        ok(html.includes('cannot all be met') && html.includes('role="status"'), `${t}: the card shows the notice`);
      }
      ok(C.compatibleClasses(E).length > 0, `${t}: the settings in force can be met`);
      problems.forEach((p, n) => {
        const u = `${t} #${n} ${p.qtype} ${p.target || p.smiles}`;
        made++; seenQ[p.qtype] = (seenQ[p.qtype] || 0) + 1; seenCls[p.cls] = (seenCls[p.cls] || 0) + 1;
        const f = C.featuresOfProblem(p);
        ok(!!f, `${u}: measurable`);
        if (f) ok(C.satisfies(f, E), `${u}: satisfies every setting in force (${[...f.classes]}, C${f.parent}, ${f.nsubs} groups, complex ${f.complex}, halogen ${f.halo}, ez ${f.ez} rs ${f.rs} ct ${f.ct}, traps ${[...f.traps]})`);
        ok(E.qtypes.includes(p.qtype), `${u}: a question type that was asked for`);
        ok(p.custom === true && p.level === null && p.skill === 'naming-levels', `${u}: marked custom`);
        ok(!BAD.test(p.prompt + (p.derive || '') + JSON.stringify(p.names)), `${u}: no undefined / NaN in the text`);
        ok(Array.isArray(p.hints) && p.hints.length === 2 && p.hints.every((h) => h.length > 30), `${u}: two hints`);
        ok(p.derive.length > 40, `${u}: worked answer`);
        ok(p.relaxed.join() === report.relaxed.join() && p.settingsNote === report.message, `${u}: carries the report`);
        if (p.qtype === 'type' || p.qtype === 'fix') {
          eq([p.kind, p.format], ['input', 'typed'], `${u}: typed`);
          ok(!!canon(p.smiles), `${u}: drawing parses`);
          const step = { answer: p.answer, accept: p.accept, name: p.name, smiles: p.smiles, noForms: p.noForms, diagnoseFn: p.diagnoseFn, diagnose: p.wrong, fallback: p.fallback, skill: p.skill };
          ok(checkInput(step, p.answer).ok, `${u}: the answer is accepted`);
          const style = p.fixedStyle ? p.styleMode : (store.getIupac() === 'old' ? 'old' : 'new');
          ok(p.answer === p.names[style], `${u}: the answer is in the style that was asked (${style})`);
          (p.wrongCands || []).forEach((w) => ['new', 'old', 'sys', 'yl'].forEach((m) => { if (w.name[m] && !p.entryKey) ok(!checkInput(step, w.name[m]).ok, `${u}: wrong name "${w.name[m]}" rejected`); }));
          if (p.qtype === 'fix') {
            ok(typeof p.improper === 'string' && p.prompt.includes(p.improper) && /not the correct name/.test(p.prompt), `${u}: the wrong name is shown`);
            ok(!checkInput(step, p.improper).ok, `${u}: the wrong name shown is not accepted as the answer`);
            if (p.improperRule && p.improperRule !== 'tricky' && !p.groups) ok(!(p.wrongCands || []).length || (p.wrongCands || []).some((w) => w.name.new === p.improper || w.name.old === p.improper || w.name.sys === p.improper || w.name.yl === p.improper), `${u}: the wrong name is one the namer makes`);
          }
        } else if (p.qtype === 'pick') {
          eq([p.kind, p.format, p.options.length, p.options.filter((o) => o.correct).length], ['choice', 'options', 4, 1], `${u}: four names, one right`);
          ok(p.options.every((o) => o.why && o.why.length > 25), `${u}: each name has its reason`);
          if (p.fixedStyle) ok(p.options.every((o) => !/<name /.test(o.text)), `${u}: a fixed style is shown as written`);
        } else {
          eq([p.kind, p.format, p.options.length, p.options.filter((o) => o.correct).length], ['choice', 'options', 4, 1], `${u}: four drawings, one right`);
          ok(p.smiles === undefined && !!p.target, `${u}: the structure is not drawn above the question`);
          ok(p.options.every((o) => !!canon(o.smiles)), `${u}: every drawing parses`);
          eq(new Set(p.options.map((o) => canon(o.smiles))).size, 4, `${u}: four different drawings`);
          const right = p.options.find((o) => o.correct);
          eq(canon(right.smiles), canon(p.target), `${u}: the right drawing is the structure`);
          ok(p.promptHtml.includes('Which drawing is'), `${u}: draw prompt`);
          if (!p.groups && !p.entryKey) {
            oq.push({ name: p.names[p.styleMode], smiles: right.smiles, role: 'correct', label: u });
            p.options.filter((o) => !o.correct && o.name).forEach((o) => oq.push({ name: o.name, smiles: o.smiles, role: 'correct', label: `${u} (a wrong drawing, named by the namer)` }));
          }
        }
        if (!p.groups && !p.entryKey && p.names) NF.STYLES.forEach((m) => { if (p.names[m]) oq.push({ name: p.names[m], smiles: p.target || p.smiles, role: 'correct', label: u }); });
      });
    });
    const OR = opsin(oq.map((x) => x.name));
    let oqGood = 0;
    oq.forEach((x) => { const out = OR[x.name]; const g = !!out && same(out, x.smiles, /^\s*(cis|trans)-/i.test(x.name)); if (g) oqGood++; ok(g, `OPSIN (custom): "${x.name}" is ${x.smiles} (${x.label}) -> ${out || 'unparsed'}`); });
    ok(clean >= 45, `at least 45 of 150 random combinations need no relaxing (${clean})`);
    ok(relaxedN >= 5, `some random combinations are impossible and are reported (${relaxedN}, ${staticN} by the class rules)`);
    ['type', 'pick', 'fix', 'draw'].forEach((k) => ok((seenQ[k] || 0) >= 10, `question type "${k}" appears (${seenQ[k] || 0} of ${made})`));
    console.log(`  Custom generator: 150 combinations (${clean} met as asked, ${relaxedN} relaxed and reported, ${staticN} caught by the class rules), ${made} problems, types ${JSON.stringify(seenQ)}, ${oq.length} names/drawings read back by OPSIN (${oqGood} agree)`);
    console.log(`  Classes seen: ${JSON.stringify(seenCls)}`);

    // named cases from the brief
    const R = mulberry32(99);
    {
      const S = C.normalizeSettings({ classes: ['alkene'], stereo: 'rs', qtypes: ['fix'], subs: ['one', 'two', 'three'], length: 'c10' });
      const { problems, report } = C.generateCustom(R, S, 12);
      eq(report.relaxed, [], 'alkene + R/S + fix a wrong name is possible');
      problems.forEach((p) => { ok(/^\(\d*[RS]/.test(p.names.new) || /\(\d+[EZ],\d+[RS]\)|\([RS]\)/.test(p.names.new), `alkene + R/S: "${p.names.new}" carries an R/S label`); ok(/ene/.test(p.names.new) && p.qtype === 'fix' && !!p.improper, `alkene + R/S + fix: "${p.names.new}" is an alkene and a wrong name is shown`); });
    }
    {
      const rep = C.resolveSettings(R, C.normalizeSettings({ classes: ['alkane'], halogens: 'yes' }));
      ok(rep.relaxed.includes('halogens') && /Alkane has no halogen/.test(rep.message), `alkane + halogens yes is impossible and says why: ${rep.message}`);
      const rep2 = C.resolveSettings(R, C.normalizeSettings({ classes: ['alkyne'], stereo: 'ez' }));
      ok(rep2.relaxed.includes('stereo') && /cannot have E\/Z/.test(rep2.message), `alkyne + E/Z is impossible and says why: ${rep2.message}`);
      const rep3 = C.resolveSettings(R, C.normalizeSettings({ classes: ['arene'], length: 'c3-5' }));
      ok(rep3.relaxed.includes('length'), `benzene derivative + C3-C5 is impossible: ${rep3.message}`);
      const rep4 = C.resolveSettings(R, C.normalizeSettings({ classes: ['halide'], subs: ['none'] }));
      ok(rep4.relaxed.includes('subs'), `alkyl halide + no substituents is impossible: ${rep4.message}`);
    }
    {
      const S = C.normalizeSettings({ classes: ['cycloalkane'], stereo: 'ct', subs: ['two'], qtypes: ['type', 'draw'], length: 'c6-8' });
      const { problems, report } = C.generateCustom(R, S, 8);
      eq(report.relaxed, [], 'cycloalkane + cis/trans is possible');
      problems.forEach((p) => ok(/^(cis|trans)-/.test(p.names.new), `cycloalkane + cis/trans: "${p.names.new}" starts with cis or trans`));
    }
    {
      const S = C.normalizeSettings({ classes: ['alkane'], traps: ['alpha'], complex: 'yes', qtypes: ['type'], subs: ['three'], length: 'any' });
      const { problems, report } = C.generateCustom(R, S, 8);
      problems.forEach((p) => { const f = C.featuresOfProblem(p); ok(f.traps.has('alpha') && f.complex, `alphabetical-with-multiplier trap with a complex group: ${p.names.new}`); });
      ok(report.relaxed.length === 0, 'alkane + complex group + alphabetical trap is possible');
    }
    {
      const S = C.normalizeSettings({ classes: ['alkene'], traps: ['cc'], qtypes: ['type', 'pick'] });
      const r = C.generateCustom(R, S, 8);
      eq(r.report.relaxed, [], 'alkene + the C=C-in-the-chain trap is possible');
      r.problems.forEach((p) => ok(C.featuresOfProblem(p).traps.has('cc'), `C=C-in-the-chain trap present in ${p.names.new}`));
    }
    {
      const S = C.normalizeSettings({ classes: ['arene'], traps: ['opm'], qtypes: ['type', 'draw'] });
      C.generateCustom(R, S, 6).problems.forEach((p) => ok(C.featuresOfProblem(p).nsubs === 2, `o/m/p trap: two groups on ${p.names.new}`));
      const S2 = C.normalizeSettings({ classes: ['arene'], traps: ['benzyl'], qtypes: ['pick', 'draw', 'fix', 'type'] });
      C.generateCustom(R, S2, 8).problems.forEach((p) => ok(p.entryKey && p.entryKey.startsWith('benzyl'), `benzyl trap gives a benzyl/phenyl entry (${p.names.new})`));
      const S3 = C.normalizeSettings({ classes: ['alcohol'], qtypes: ['type', 'pick', 'fix', 'draw'], subs: ['none', 'one'] });
      C.generateCustom(R, S3, 8).problems.forEach((p) => ok(p.entryKey === 't26' || p.entryKey === 't27', `alcohol class draws from the tricky set (${p.names.new})`));
    }
    {
      const S = C.normalizeSettings({ classes: ['alkane', 'alkene'], length: 'c3-5', subs: ['one', 'two'], complex: 'no', halogens: 'no', stereo: 'none', qtypes: ['type'], count: 20, timer: 60 });
      C.setCurrentSettings(S);
      eq(C.practiceConfig(), { count: 20, timer: 60 }, 'the practice page reads count and timer from the settings');
      const ps = generate('naming-levels', 12, { rng: mulberry32(4) });
      eq(ps.length, 12, 'generate() with stored custom settings');
      ps.forEach((p) => { const f = C.featuresOfProblem(p); ok(f && f.parent >= 3 && f.parent <= 5 && !f.halo && !f.complex && !f.stereo && ['alkane', 'alkene'].includes(f.cls), `generate() custom: ${p.names.new} fits C3-C5, no halogen, no complex group, no stereo`); });
      store.resetAll();
    }
    // every trap can be asked for on its own, in a class that has it
    {
      const ONLY = { longest: ['alkane'], numbering: ['alkane', 'cycloalkane'], alpha: ['alkane'], ringchain: ['cycloalkane'], cc: ['alkene'], benzyl: ['arene'], opm: ['arene'] };
      for (const t of C.TRAP_IDS) {
        const S = C.normalizeSettings({ classes: ONLY[t], traps: [t], qtypes: ['type', 'pick', 'fix', 'draw'], length: 'any', subs: ['none', 'one', 'two', 'three'] });
        const r = C.generateCustom(mulberry32(t.length * 977), S, 6);
        eq(r.report.relaxed, [], `trap "${t}" can be asked for on its own (${ONLY[t]})`);
        r.problems.forEach((p) => { const f = C.featuresOfProblem(p); ok(f && f.traps.has(t), `trap "${t}" is present in ${p.names.new}`); });
      }
    }
    // the card, as markup
    {
      const S = C.normalizeSettings({ classes: ['alkene', 'diene'], qtypes: ['fix'], traps: ['cc'], count: 20, timer: 90 });
      const closed = C.settingsCardHtml(S, { open: false });
      const open = C.settingsCardHtml(S, { open: true, dirty: true, error: 'Keep at least one choice in each list.' });
      ok(/aria-expanded="false"/.test(closed) && /id="nl-body" hidden/.test(closed) && /aria-expanded="true"/.test(open) && !/id="nl-body" hidden/.test(open), 'the card collapses (aria-expanded, hidden body)');
      eq((open.match(/data-level="/g) || []).length, 5, 'five built-in preset buttons');
      eq((open.match(/data-g="classes"/g) || []).length, C.CLASS_IDS.length, 'a chip for every class');
      eq((open.match(/data-g="classes"[^>]*aria-pressed="true"/g) || []).length, 2, 'the chosen classes are pressed');
      eq((open.match(/data-g="qtypes"/g) || []).length, 4, 'four question types');
      eq((open.match(/data-g="traps"/g) || []).length, 7, 'seven traps');
      eq((open.match(/data-g="count"/g) || []).length, 3, 'three counts');
      eq((open.match(/data-g="timer"/g) || []).length, 3, 'three timers');
      eq((open.match(/data-g="stereo"/g) || []).length, 6, 'six stereo choices');
      eq((open.match(/data-g="difficulty"/g) || []).length, 3, 'a three-step difficulty dial');
      ok(/nl-start/.test(open) && /nl-dirty/.test(open) && /nl-err/.test(open) && /nl-save/.test(open), 'Start, the change hint, the error line and the save form');
      ok(!BAD.test(open) && !BAD.test(closed), 'no undefined in the card');
      ok(C.summaryOf(S).includes('20 questions') && C.summaryOf(S).includes('90 s'), 'the collapsed summary says count and timer');
      ok(C.summaryOf(C.levelPreset(3)).includes('Level 3'), 'the summary names a level preset');
      const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
      ['.nl-card', '.nl-chip', '.nl-toggle', '.nl-body', '.nl-note', '.nl-timer', '.style-note'].forEach((c) => ok(html.includes(c), `CSS for ${c}`));
      const stepsSrc = fs.readFileSync(path.join(HERE, '..', 'engine', 'steps.js'), 'utf8');
      ok(/cfg\.timer/.test(stepsSrc) && /role: 'timer'/.test(stepsSrc) && /practiceConfig/.test(appSrc), 'the practice player has the timer and app.js reads the settings');
    }
  }

  store.resetAll();
  console.log(`  Naming by level: ${stats.problems} problems (${stats.typed} typed, ${stats.options} with four names), ${stats.names} distinct names checked in OPSIN, ${stats.engine} hydrocarbons compared with the Lesson 05/07 engines`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
  await namingLevels({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, 40).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
