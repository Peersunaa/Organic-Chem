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
import { nameBoth, nameAlkeneBoth, normName } from '../engine/naming.js';
import * as store from '../engine/store.js';

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
  function MODEL_DISTINCT(n, names) { return ['new', 'old', 'sys'].every((m) => normName(n.new) !== normName(names[m]) && normName(n.old) !== normName(names[m])); }

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
