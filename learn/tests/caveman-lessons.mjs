// Caveman lesson text checks (lessons/NN-*.js `caveman` objects, engine/steps.js applies them through voice.t()).
//  (1) every step of every lesson has a `caveman` object; the object only holds the allowed fields (prompt, problem, html, reveal, rule, worked, trap, hints[], options[].why,
//      moves[].ask / then / options[].why) and its arrays line up with the step's own (an option's caveman line sits at the same index as the option, also after a lesson reorders its options);
//  (2) every caveman string is non-empty and at most 65% as long as the original (at most 100% when the original is under 60 characters);
//  (3) every exam word and chemical mark that matters (see KEEP) in the original is still in the caveman text;
//  (4) nothing else changed: each step, with `caveman` taken out, equals the step in git HEAD (option text, answers, smiles, widget configs, ids: all byte for byte);
//  (5) the renderer: engine/steps.js reads the caveman fields through t().
// Run on its own with `node tests/caveman-lessons.mjs` from learn/ (COVERAGE=1 prints the per-lesson counts), or as part of run.mjs.
import { ready } from '../engine/chem.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LESSONS } from '../lessons/index.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LEARN = path.join(HERE, '..');
const KEEP = /[A-Z][a-z]*₂|₃|₄|⁺|⁻|Markovnikov|syn|anti|meta|ortho|para|racemate|meso|\bR\b|\bS\b|\bE\b|\bZ\b|pKa|sp[23]?\b/g;
const MAX_RATIO = 0.65;
// Steps whose whole text is a pure reference list (formulas and names, nothing to cut): the caveman object stays empty on purpose. Key: lesson id and step id.
const LEFT_PLAIN = {
  '04:s13': 'the table of functional groups: every word is a formula or a group name',
  '05:s03': 'the alkane formula and the root names meth to dec',
  '05:s07': 'the list of alkyl groups: every word is a formula or a name',
  '14:s03': 'the map of activators and deactivators (McMurry Figure 5.6): a list of groups'
};
const SIMPLE = ['prompt', 'problem', 'html', 'reveal', 'rule', 'worked', 'trap'];

/** Length is measured on the TEXT a learner reads: drawings (inline <svg>, <mol>, <molpair>) and <name> chips are figures, and every other tag (<b>, <p>, <br>, <sub> ...) is markup, so none of them counts; entities count as one character. */
const noSvg = (x) => String(x).replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<mol(?:pair)?\b[^>]*>(?:<\/mol(?:pair)?>)?/g, '').replace(/<name\b[^>]*>(?:<\/name>)?/g, '').replace(/<[^>]+>/g, '').replace(/&(?:lt|gt|amp);/g, '#');

/** Pure: the problems with one (original, caveman) pair of strings. */
export function checkPair(origFull, caveFull) {
  const bad = [], orig = noSvg(origFull), cave = noSvg(caveFull);
  if (typeof caveFull !== 'string' || !cave.trim()) return ['empty'];
  const limit = orig.length < 60 ? orig.length : Math.floor(orig.length * MAX_RATIO);
  if (cave.length > limit) bad.push(`too long (${cave.length} > ${limit}, original ${orig.length})`);
  const need = [...new Set(orig.match(KEEP) || [])].filter((tok) => !cave.includes(tok));
  if (need.length) bad.push(`lost ${need.map((x) => `"${x}"`).join(' ')}`);
  return bad;
}

/** Every (path, original, caveman) string pair a step carries, plus structural problems. */
export function pairsOf(step) {
  const out = [], issues = [];
  const cv = step.caveman;
  if (!cv || typeof cv !== 'object') return { out, issues: ['no caveman object'] };
  const allowed = new Set([...SIMPLE, 'hints', 'options', 'moves']);
  Object.keys(cv).forEach((k) => { if (!allowed.has(k)) issues.push(`unknown caveman field ${k}`); });
  SIMPLE.forEach((k) => {
    if (cv[k] == null) return;
    if (typeof step[k] !== 'string') issues.push(`caveman.${k} has no original`); else out.push([k, step[k], cv[k]]);
  });
  if (cv.hints != null) {
    if (!Array.isArray(cv.hints) || cv.hints.length !== (step.hints || []).length) issues.push('caveman.hints does not line up with hints');
    else cv.hints.forEach((x, i) => { if (x != null) out.push([`hints[${i}]`, step.hints[i], x]); });
  }
  if (cv.options != null) {
    if (!Array.isArray(cv.options) || cv.options.length !== (step.options || []).length) issues.push('caveman.options does not line up with options');
    else cv.options.forEach((x, i) => { if (x && x.why != null) out.push([`options[${i}].why`, step.options[i].why, x.why]); });
  }
  if (cv.moves != null) {
    if (!Array.isArray(cv.moves) || cv.moves.length !== (step.moves || []).length) issues.push('caveman.moves does not line up with moves');
    else cv.moves.forEach((m, k) => {
      if (!m) return;
      ['ask', 'then'].forEach((f) => {
        if (m[f] == null) return;
        if (typeof step.moves[k][f] !== 'string') issues.push(`moves[${k}].${f} has no original`); else out.push([`moves[${k}].${f}`, step.moves[k][f], m[f]]);
      });
      if (m.options != null) {
        if (!Array.isArray(m.options) || m.options.length !== step.moves[k].options.length) issues.push(`caveman.moves[${k}].options does not line up`);
        else m.options.forEach((x, i) => { if (x && x.why != null) out.push([`moves[${k}].options[${i}].why`, step.moves[k].options[i].why, x.why]); });
      }
    });
  }
  return { out, issues };
}

/** Which original fields have no caveman copy (a coverage report, not a failure: a field that is all markup may be left out on purpose). */
export function missingOf(step) {
  const cv = step.caveman || {}, miss = [];
  SIMPLE.forEach((k) => { if (typeof step[k] === 'string' && step[k] && cv[k] == null) miss.push(k); });
  (step.hints || []).forEach((_, i) => { if (!(cv.hints && cv.hints[i] != null)) miss.push(`hints[${i}]`); });
  (step.options || []).forEach((o, i) => { if (o.why && !(cv.options && cv.options[i] && cv.options[i].why != null)) miss.push(`options[${i}].why`); });
  (step.moves || []).forEach((m, k) => {
    const cm = (cv.moves && cv.moves[k]) || {};
    ['ask', 'then'].forEach((f) => { if (typeof m[f] === 'string' && cm[f] == null) miss.push(`moves[${k}].${f}`); });
    (m.options || []).forEach((o, i) => { if (o.why && !(cm.options && cm.options[i] && cm.options[i].why != null)) miss.push(`moves[${k}].options[${i}].why`); });
  });
  return miss;
}

const plain = (s) => { const d = Object.getOwnPropertyDescriptors(s); delete d.caveman; return JSON.stringify(Object.defineProperties({}, d)); };

/** Load the lesson file as it is in git HEAD (a temp copy with absolute imports); null when git has no such file. */
async function headLesson(file) {
  let src;
  try { src = execFileSync('git', ['show', `HEAD:learn/lessons/${file}`], { cwd: LEARN, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return null; }
  const abs = pathToFileURL(LEARN + path.sep).href;
  src = src.replace(/from '\.\.\/(engine|lessons)\//g, (m, d) => `from '${abs}${d}/`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cave-head-'));
  const tmp = path.join(dir, file.replace(/\.js$/, '.mjs'));
  fs.writeFileSync(tmp, src);
  try { return (await import(pathToFileURL(tmp).href)).default; } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* temp only */ } }
}

export async function cavemanLessons({ ok, eq }) {
  await ready();
  const files = fs.readdirSync(path.join(LEARN, 'lessons')).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
  eq(files.length, LESSONS.length, 'one lesson file per lesson in index.js');
  const stat = {};
  for (let li = 0; li < LESSONS.length; li++) {
    const L = LESSONS[li], tag = `L${L.id}`;
    const head = await headLesson(files[li]);
    ok(!!head, `${tag}: git HEAD has ${files[li]}`);
    let fields = 0, steps = 0;
    L.steps.forEach((s, n) => {
      const where = `${tag} step ${s.id || n}`;
      const { out, issues } = pairsOf(s);
      ok(!issues.length, `${where}: ${issues.join('; ')}`);
      ok(s.caveman && typeof s.caveman === 'object' && (Object.keys(s.caveman).length > 0 || !!LEFT_PLAIN[`${L.id}:${s.id}`]), `${where}: has a caveman object with something in it`);
      steps++;
      out.forEach(([k, a, b]) => { fields++; const bad = checkPair(a, b); ok(!bad.length, `${where} ${k}: ${bad.join('; ')}`); });
      if (head) {
        const h = head.steps[n];
        ok(!!h && h.id === s.id, `${where}: same step id as HEAD`);
        if (h) {
          ok(plain(s) === plain(h), `${where}: everything except caveman is unchanged from HEAD`);
          // option texts one by one, so a failure names the option
          (s.options || []).forEach((o, i) => {
            const ho = h.options && h.options[i];
            if (!ho || JSON.stringify([o.text, o.smiles]) !== JSON.stringify([ho.text, ho.smiles])) ok(false, `${where}: options[${i}] text changed`);
          });
        }
      }
    });
    stat[L.id] = { steps, fields, missing: L.steps.reduce((a, s) => a + missingOf(s).length, 0) };
  }
  // the renderer: engine/steps.js asks voice.t() for every field through the cv helpers, and the helpers pick the right line
  const rs = fs.readFileSync(path.join(LEARN, 'engine', 'steps.js'), 'utf8');
  ok(rs.includes("{ t, tAuto } from './voice.js'"), 'steps.js imports t() from voice.js');
  ['prompt', 'problem', 'html', 'reveal', 'rule', 'worked'].forEach((k) => ok(rs.includes(`cvSay(step, '${k}')`), `steps.js renders ${k} through cvSay`));
  ok(rs.includes('sayHint(step, 0)') && rs.includes('sayHint(step, 1)'), 'steps.js renders both hints through sayHint');
  ok(rs.includes('sayWhy(step, o)'), 'steps.js renders option whys through sayWhy');
  ok(rs.includes("sayMove(step, mi, 'ask')") && rs.includes("sayMove(step, mi, 'then')") && rs.includes('sayMoveWhy(step, mi, o)'), 'steps.js renders the worked moves through sayMove / sayMoveWhy');
  const V = await import('../engine/voice.js');
  const S = await import('../engine/steps.js');
  const o1 = { text: 'A', why: 'Long normal reason.' }, o2 = { text: 'B', why: 'Other normal reason.' };
  const m1 = { text: 'C', why: 'Move normal.' };
  const st = { prompt: 'Normal prompt.', options: [o1, o2], hints: ['Normal hint 1', 'Normal hint 2'], moves: [{ ask: 'Normal ask', then: 'Normal then', options: [m1] }],
    caveman: { prompt: 'Cave prompt.', options: [{ why: 'Cave 1.' }, {}], hints: ['Cave hint 1', null], moves: [{ ask: 'Cave ask', options: [{ why: 'Cave move.' }] }] } };
  V.setCaveman(false);
  eq([S.cvSay(st, 'prompt'), S.sayWhy(st, o1), S.sayHint(st, 0), S.sayMove(st, 0, 'ask'), S.sayMoveWhy(st, 0, m1)], ['Normal prompt.', 'Long normal reason.', 'Normal hint 1', 'Normal ask', 'Move normal.'], 'helpers give the normal text when caveman is off');
  V.setCaveman(true);
  eq([S.cvSay(st, 'prompt'), S.sayWhy(st, o1), S.sayHint(st, 0), S.sayMove(st, 0, 'ask'), S.sayMoveWhy(st, 0, m1)], ['Cave prompt.', 'Cave 1.', 'Cave hint 1', 'Cave ask', 'Cave move.'], 'helpers give the caveman text when caveman is on');
  eq([S.sayWhy(st, o2), S.sayHint(st, 1), S.sayMove(st, 0, 'then'), S.cvSay(st, 'reveal')], ['Other normal reason.', 'Normal hint 2', 'Normal then', undefined], 'a missing caveman copy falls back to the normal text');
  eq([S.sayWhy({ options: [o1] }, o1), S.cvSay({ prompt: 'P' }, 'prompt')], ['Long normal reason.', 'P'], 'a step without a caveman object keeps working');
  // a shuffled copy of the options still reads the right caveman line (looked up by object identity)
  eq(S.orderedOptions({ id: 'x', type: 'choice', options: [o1, o2] }, '99', 'seed').map((o) => S.sayWhy(st, o)).sort(), ['Cave 1.', 'Other normal reason.'], 'a shuffled option order keeps each option its own caveman line');
  V.setCaveman(false);
  return stat;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  const stat = await cavemanLessons({ ok, eq });
  if (process.env.COVERAGE) Object.entries(stat).forEach(([id, s]) => console.log(`  L${id}: ${s.steps} steps, ${s.fields} caveman fields, ${s.missing} original fields without a caveman copy`));
  console.log(`caveman-lessons: ${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 60)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
