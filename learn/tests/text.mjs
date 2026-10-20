// Teaching-wave T1 checks (tests/text.mjs):
//  (1) no <mol> / <molpair> tag is left open in any lesson, generated problem, hub card or past-paper item (an open tag swallows the text after it);
//  (2) option order: shuffled at render time (seeded, deterministic, objects kept), and the answer-position and answer-length cues are gone;
//  (3) the glossary (40-60 terms, one sentence of at most 140 characters, found as whole words) and the prerequisite recap cards (every link is a real step);
//  (4) content fixes from the novice review (valence table in L1 s03, sigma/pi figures, Li electronegativity, Diels-Alder hub drawing and past-paper link);
//  (5) review 3 (fix wave T3b): first-try scoring (engine/first-try.js, the reaction lab, the mastery player), worked-step moves shuffled like choice steps, accessible names for image options (engine/mol-name.js).
// Run on its own with `node learn/tests/text.mjs`, or as part of run.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import { ready, VALENCE } from '../engine/chem.js';
import { generate } from '../engine/generators.js';
import { HUB_CARDS, HUB_BY_ID } from '../engine/reaction-hub.js';
import { PASTPAPER } from '../data/pastpaper.js';
import { closeMolTags, shuffleOptions, shufflable, orderedOptions, orderedMoveOptions, optionSmiles, optionNames } from '../engine/steps.js';
import { firstTry, firstTryTally } from '../engine/first-try.js';
import { describeMol, describeAll } from '../engine/mol-name.js';
import { GLOSSARY, findTerm, termsIn } from '../engine/glossary.js';
import { RECAP } from '../engine/recap.js';

const strip = (h) => String(h).replace(/<[^>]+>/g, '').trim();
function strings(o, out = [], seen = new Set()) {
  if (typeof o === 'string') out.push(o);
  else if (o && typeof o === 'object' && !seen.has(o)) { seen.add(o); (Array.isArray(o) ? o : Object.values(o)).forEach((x) => strings(x, out, seen)); }
  return out;
}
/** Simulates what the HTML parser does with <mol>: returns a problem description, or null when every tag is closed and nothing is swallowed. */
export function molProblem(html) {
  const stack = [];
  for (const m of String(html).matchAll(/<\/?[A-Za-z][^>]*>|[^<]+/g)) {
    const t = m[0];
    const open = /^<(mol|molpair)\b/.exec(t), close = /^<\/(mol|molpair)\s*>/.exec(t);
    if (open) { if (stack.length) return 'nested inside an open <' + stack[stack.length - 1] + '>'; if (!/\/>$/.test(t)) stack.push(open[1]); }
    else if (close) stack.pop();
    else if (stack.length && t[0] !== '<' && t.trim()) return 'text swallowed by an open <' + stack[stack.length - 1] + '>: ' + t.trim().slice(0, 40);
  }
  return stack.length ? 'a <' + stack[stack.length - 1] + '> is never closed' : null;
}

export async function text({ ok, eq }) {
  await ready();

  // ---------------------------------------------------------------- (1) mol tags
  ok(molProblem('Benzene <mol smiles="c1ccccc1"> is a ring') !== null, 'molProblem detects an open <mol> that swallows text');
  ok(molProblem('Benzene <mol smiles="c1ccccc1"></mol> is a ring') === null, 'molProblem accepts a closed <mol>');
  eq(molProblem(closeMolTags('Benzene <mol smiles="c1ccccc1" label="benzene"> is a ring. What now?')), null, 'closeMolTags repairs an open <mol>');
  ok(/is a ring\. What now\?/.test(closeMolTags('<mol smiles="C"> is a ring. What now?')), 'closeMolTags keeps the text after the tag');
  eq(closeMolTags('<mol smiles="C"></mol> a <molpair smiles="CC"></molpair>'), '<mol smiles="C"></mol> a <molpair smiles="CC"></molpair>', 'closeMolTags leaves closed tags alone');
  let molCount = 0;
  for (const L of LESSONS) for (const s of L.steps) for (const str of strings(s)) if (/<mol/.test(str)) {
    molCount++;
    const p = molProblem(str);
    ok(p === null, `L${L.id}/${s.id}: ${p} in "${strip(str).slice(0, 50)}"`);
  }
  for (const L of LESSONS) {
    // the steps the review named: the text after the drawing must survive
    const t = (id) => L.steps.find((s) => s.id === id);
    if (L.id === '13') { const s = t('s01'); ok(/What do you expect\?/.test(s.prompt) && molProblem(s.prompt) === null, 'L13 s01 prompt keeps its question after the benzene picture'); ok(s.options.some((o) => /HBr/.test(o.text)), 'L13 s01 option 1 keeps "and HBr"'); }
    if (L.id === '11') { ok(molProblem(t('s01').prompt) === null && /expect/.test(strip(t('s01').prompt)), 'L11 s01 prompt intact'); ok(molProblem(t('s07').prompt) === null, 'L11 s07 prompt intact'); }
    if (L.id === '12') for (const id of ['s01', 's16']) ok(molProblem(t(id).prompt) === null, `L12 ${id} prompt intact`);
  }
  {
    const gens = ['lewis-basic', 'shape-basic', 'acid-base', 'skeletal-fg', 'alkane-names', 'chairs', 'alkene-names', 'mechanism-basics', 'markovnikov', 'alkene-additions-2', 'resonance', 'alkynes', 'eas-basics', 'directors', 'rs', 'stereo-relationships'];
    for (const g of gens) for (const p of generate(g, 12, {})) for (const str of strings({ a: p.promptHtml, b: p.deriveHtml, c: p.options, d: p.hints })) if (/<mol/.test(str)) { const pr = molProblem(str); ok(pr === null, `generator ${g}: ${pr}`); }
  }
  for (const c of HUB_CARDS) for (const str of strings(c)) if (/<mol/.test(str)) { const pr = molProblem(str); ok(pr === null, `hub ${c.id}: ${pr}`); }
  for (const sec of PASTPAPER) for (const str of strings(sec)) if (/<mol/.test(str)) { const pr = molProblem(str); ok(pr === null, `pastpaper ${sec.id}: ${pr}`); }
  ok(molCount > 50, `many <mol> strings were checked (${molCount})`);

  // ---------------------------------------------------------------- (2) option order and answer cues
  const gradedSteps = [];
  for (const L of LESSONS) for (const s of L.steps) if ((s.type === 'predict' || s.type === 'choice') && s.options.length >= 2) gradedSteps.push([L, s]);
  {
    const [L, s] = gradedSteps.find(([, x]) => shufflable(x) && x.options.length === 4);
    const a = shuffleOptions(s.options, 'x|y|1'), b = shuffleOptions(s.options, 'x|y|1'), c = shuffleOptions(s.options, 'x|y|2');
    eq(a.map((o) => s.options.indexOf(o)), b.map((o) => s.options.indexOf(o)), 'the same seed gives the same order');
    ok(a.length === s.options.length && a.every((o) => s.options.includes(o)), 'shuffling keeps the same option objects');
    ok(a.find((o) => o.correct) === s.options.find((o) => o.correct), 'the correct option is tracked by object, not by index');
    let differ = 0; for (let k = 0; k < 20; k++) if (shuffleOptions(s.options, 'x|y|' + k).map((o) => s.options.indexOf(o)).join() !== a.map((o) => s.options.indexOf(o)).join()) differ++;
    ok(differ >= 10, 'different attempts give different orders');
    ok(orderedOptions(s, L.id, 5) !== s.options && s.options.map((o) => o.text).join('|') === s.options.map((o) => o.text).join('|'), 'the lesson data itself is never reordered');
    let unstable = 0, same = 0, n = 0;
    for (const [L2, s2] of gradedSteps) {
      const o1 = orderedOptions(s2, L2.id, 7).map((o) => s2.options.indexOf(o)).join(), o2 = orderedOptions(s2, L2.id, 7).map((o) => s2.options.indexOf(o)).join();
      if (o1 !== o2) unstable++;
      if (shufflable(s2)) { n++; if (o1 === orderedOptions(s2, 'zz', 7).map((o) => s2.options.indexOf(o)).join()) same++; }
    }
    eq(unstable, 0, 'a render with the same lesson, step and attempt is repeatable');
    ok(same < n * 0.5, `the lesson id is part of the seed (${same} of ${n} orders unchanged by a different lesson id)`);
  }
  ok(shufflable({ options: [{ text: '90°' }, { text: '109.5°' }, { text: '120°' }] }) === false, 'number ladders keep their order');
  ok(shufflable({ options: [{ label: 'Option A', smiles: 'C' }, { label: 'Option B', smiles: 'CC' }] }) === false, '"Option A..D" labelled choices keep their order (their text refers to them)');
  ok(shufflable({ options: [{ text: 'Yes, because it is flat' }, { text: 'No, because it is bent' }] }) === true, 'ordinary options are shuffled');

  // position of the correct answer over 200 seeded renders
  {
    const by = {}; let total4 = 0;
    for (let attempt = 0; attempt < 200; attempt++) for (const [L, s] of gradedSteps) {
      const shown = orderedOptions(s, L.id, attempt);
      const ci = shown.findIndex((o) => o.correct);
      ok(ci >= 0 && shown.filter((o) => o.correct).length === 1, `L${L.id}/${s.id} exactly one correct option after the shuffle`);
      if (s.options.length === 4) { by[ci] = (by[ci] || 0) + 1; total4++; }
    }
    const frac = [0, 1, 2, 3].map((i) => (by[i] || 0) / total4);
    ok(Math.max(...frac) <= 0.35, `no position holds more than 35% of the correct answers over 200 renders (${frac.map((f) => (100 * f).toFixed(1) + '%').join(' ')})`);
    ok(Math.min(...frac) >= 0.15, `every position is used (${frac.map((f) => (100 * f).toFixed(1) + '%').join(' ')})`);
  }
  // answer length: among text-only steps (longest option at least 25 characters) the correct one is the strictly longest in at most 30%
  {
    let n = 0, longest = 0, shortest = 0; const worst = [];
    for (const [L, s] of gradedSteps) {
      if (s.options.some((o) => o.smiles || /<mol/.test(o.text || ''))) continue;
      const lens = s.options.map((o) => strip(o.text).length);
      if (Math.max(...lens) < 25) continue;
      const ci = s.options.findIndex((o) => o.correct), mx = Math.max(...lens), mn = Math.min(...lens);
      n++;
      if (lens[ci] === mx && lens.filter((x) => x === mx).length === 1) { longest++; worst.push(`${L.id}/${s.id}`); }
      if (lens[ci] === mn && lens.filter((x) => x === mn).length === 1) shortest++;
    }
    ok(longest / n <= 0.3, `the correct option is the strictly longest in at most 30% of text steps (${longest} of ${n}: ${(100 * longest / n).toFixed(1)}%; ${worst.join(' ')})`);
    ok(shortest / n <= 0.4, `...and not the strictly shortest in more than 40% (${shortest} of ${n})`);
  }

  // ---------------------------------------------------------------- (3) glossary and recap cards
  ok(GLOSSARY.length >= 40 && GLOSSARY.length <= 80, `glossary has 40 to 80 terms (${GLOSSARY.length})`);
  for (const t of ['catalyst', 'isomer', 'dienophile', 'oxonium', 'bromonium', 'inductive', 'equilibrium', 'ewg', 'kekule', 'solvent', 'leavinggroup']) ok(GLOSSARY.some((g) => g.id === t), `glossary has the term ${t} (the round-2 review's missing terms)`);
  ok(new Set(GLOSSARY.map((g) => g.id)).size === GLOSSARY.length, 'glossary ids are unique');
  for (const g of GLOSSARY) {
    ok(g.def.length >= 20 && g.def.length <= 140, `glossary "${g.label}": definition is at most 140 characters (${g.def.length})`);
    ok(/[.?!]$/.test(g.def) && !/[.?!]\s+\S/.test(g.def), `glossary "${g.label}": exactly one sentence`);
    ok(g.forms.length >= 1, `glossary "${g.label}": has spellings to find`);
    for (const f of g.forms) { const hit = findTerm('We use ' + f + ' here.', new Set([g.id])); ok(hit && hit.id === g.id, `glossary "${g.label}": form "${f}" is found as a whole word`); }
  }
  for (const must of ['nucleophile', 'electrophile', 'sp³', 'π bond', 'σ bond', 'resonance', 'δ+', 'carbocation', 'skeletal', 'Markovnikov', 'regiochemistry', 'stereocentre', 'enantiomer', 'diastereomer', 'meso', 'racemate', 'conjugated', 'aromatic', 'activating', 'director', 'ortho', 'meta', 'para', 'acylium', 'sigma complex', 'electronegativity', 'formal charge', 'lone pair', 'octet', 'valence', 'hybridisation', 'conformation', 'chair', 'axial', 'equatorial', 'Newman', 'torsional strain', 'E/Z', 'CIP', 'R/S', 'syn', 'anti', 'Lewis acid', 'Lewis base', 'pKa', 'conjugate base', 'curved arrow', 'intermediate', 'transition state', 'rate-determining', 'Hückel', 'substituent', 'alkyl', 'halide', 'hydration', 'hydrogenation', 'oxidation', 'reduction', 'tautomer'])
    ok(termsIn('x ' + must + ' y').length >= 1, `glossary covers "${must}"`);
  eq(termsIn('paracetamol and metal and chairman and the para position'), ['para'], 'terms match whole words only (paracetamol, metal and chairman do not count)');
  eq(termsIn('an sp² carbon and sp³ carbon'), ['sp2', 'sp3'], 'sp² and sp³ are separate terms');
  ok(termsIn('the first lesson has a nucleophile and an electrophile').length === 2, 'two terms in one sentence are both found');
  // how much of the course the glossary reaches: the review's "used before defined" terms should show up in real lesson text
  const lessonText = LESSONS.flatMap((L) => L.steps.flatMap((s) => strings(s))).map(strip).join(' ');
  const usedIds = new Set(termsIn(lessonText));
  ok(usedIds.size >= 40, `at least 40 glossary terms occur in the lesson text (${usedIds.size})`);

  const ids = LESSONS.map((L) => L.id);
  eq(Object.keys(RECAP).sort(), ids.slice(1), 'recap cards exist for lessons 02 to 16 (and not for 01)');
  for (const [lid, facts] of Object.entries(RECAP)) {
    ok(facts.length >= 2 && facts.length <= 4, `recap L${lid}: 2 to 4 facts (${facts.length})`);
    for (const f of facts) {
      const from = LESSONS.find((L) => L.id === f.n);
      ok(from && parseInt(f.n, 10) < parseInt(lid, 10), `recap L${lid}: "${f.fact.slice(0, 30)}" points to an earlier lesson (${f.n})`);
      ok(from && (from.steps.some((s) => s.id === f.step)), `recap L${lid}: link #lesson-${f.n}/${f.step} is a real step`);
      ok(f.fact.length >= 25 && f.fact.length <= 190 && !/\n/.test(f.fact), `recap L${lid}: one line (${f.fact.length} characters)`);
      ok(molProblem(f.fact) === null, `recap L${lid}: no stray tags`);
    }
  }

  // ---------------------------------------------------------------- (4) content fixes from the review
  const L01 = LESSONS.find((L) => L.id === '01'), L02 = LESSONS.find((L) => L.id === '02');
  const stepOf = (L, id) => L.steps.find((s) => s.id === id);
  const plainOf = (s) => strip(strings(s).join(' '));
  { // L1 s03: the group numbers of H C N O F Cl are shown (a mini periodic table) before the learner is asked for the valence electrons
    const s3 = stepOf(L01, 's03');
    ok(typeof s3.aside === 'string' && /<table class="gl-vt"/.test(s3.aside), 'L1 s03: the step carries a mini periodic table');
    const ths = [...s3.aside.matchAll(/<th[^>]*>(\d+)<\/th>/g)].map((m) => Number(m[1]));
    const tds = [...s3.aside.matchAll(/<td[^>]*>([A-Za-z]+)<\/td>/g)].map((m) => m[1]);
    eq(ths, [1, 14, 15, 16, 17], 'L1 s03: table headers are the group numbers');
    eq(tds, ['H', 'C', 'N', 'O', 'F', 'Cl'], 'L1 s03: table cells are H C N O F Cl');
    const group = { H: 1, C: 14, N: 15, O: 16, F: 17, Cl: 17 };
    for (const el of tds) ok(ths.includes(group[el]) && group[el] % 10 === VALENCE[el], `L1 s03: ${el} sits in group ${group[el]}, whose last digit is its ${VALENCE[el]} valence electrons`);
    ok(/last digit of the group number/.test(s3.aside), 'L1 s03: the rule is stated');
    ok(/Subtract|subtract/.test(stepOf(L01, 's11').aside || '') && /H₃O⁺/.test(stepOf(L01, 's11').aside), 'L1 s11: the ion rule (+ subtracts, − adds) is given before the mastery');
  }
  { // L2: sigma and pi steps have a picture, Li electronegativity is given
    for (const id of ['s02', 's05']) { const s = stepOf(L02, id); ok(/<svg|class="fig"|<pre|figure-orb/.test(s.html) || s.visual, `L2 ${id}: has a drawn figure`); }
    const s17 = stepOf(L02, 's17'), s15 = stepOf(L02, 's15');
    ok(/Li\b[^.]{0,30}1\.0/.test(plainOf(s15) + ' ' + strip(s17.prompt)), 'L2: lithium electronegativity (1.0) is given before or in s17');
  }
  { // L13 s06 / s08 require a decision, not copying
    const L13 = LESSONS.find((L) => L.id === '13');
    for (const id of ['s06', 's08']) { const s = stepOf(L13, id); ok(!/goes to the H on the sp³/.test(s.prompt) || /goal|decide|which/i.test(s.prompt), `L13 ${id}: the prompt states a goal instead of listing every arrow`); }
  }
  { // Diels-Alder hub card: a draw sub-list with atom numbering; past paper B3.1.9 links the card
    const da = HUB_BY_ID['diels-alder'];
    ok(da && Array.isArray(da.draw) && da.draw.length >= 4 && da.draw.every((x) => typeof x === 'string' && x.length > 15), 'Diels-Alder card has a draw list of pen-and-paper steps');
    ok(da && /C1/.test((da.draw || []).join(' ')) && /C4/.test((da.draw || []).join(' ')), 'Diels-Alder draw list numbers the atoms (C1 ... C4)');
    const item = PASTPAPER.flatMap((s) => s.items).find((i) => i.id === 'B3.1.9');
    ok(item && item.links.some((l) => l.href === '#reactions/diels-alder'), 'past paper B3.1.9 links to the Diels-Alder hub card');
    ok(item && !item.links.some((l) => /lesson-11\/s10/.test(l.href)), 'past paper B3.1.9 no longer links L11 s10 (planarity)');
  }
  { // teaching fixes: predictions that cannot be derived now carry the convention or a clue; terms are defined where they first matter
    const g = (id, sid) => stepOf(LESSONS.find((L) => L.id === id), sid);
    ok(/full-headed arrow moves a <b>pair/.test(g('08', 's05').aside) && /one<\/b> electron/.test(g('08', 's05').aside), 'L8 s05: the arrow legend (full head = pair, half head = one electron) comes with the first arrow question');
    ok(/propene/.test(g('09', 's01').prompt) && /2-bromopropane/.test(g('09', 's01').prompt), 'L9 s01: the prompt gives the propene clue so a guess by analogy is possible');
    ok(!/trust your instincts/i.test(g('09', 's03').prompt) && /lend it/.test(g('09', 's03').prompt), 'L9 s03: no "trust your instincts", the electron-lending idea is given');
    ok(/<b>3°<\/b> if its C⁺ is bonded to three carbons/.test(g('09', 's04').html), 'L9 s04: defines a 3° / 2° / 1° cation');
    ok(/short of electrons/.test(g('09', 's06').html), 'L9 s06: says why alkyl groups steady a C⁺');
    ok(/log 10⁻⁹ is −9/.test(g('03', 's05').reveal) && /⇌/.test(g('03', 's03').aside), 'L3: log of a power of ten and the double arrow are explained');
    ok(/stronger acid gives up its H⁺ more readily/.test(g('03', 's08').rule), 'L3 s08: the equilibrium rule has a reason');
    ok(/<svg/.test(g('13', 's04').html), 'L13 s04: has the hexagon-with-circle picture');
    ok(/pm = picometre/.test(g('02', 's13').reveal), 'L2 s13: pm and kJ/mol are glossed');
    ok(/Lewis acid/.test(g('13', 's06').prompt) && g('13', 's06').hints.length === 2 && g('13', 's08').hints.length === 2, 'L13 s06 / s08: still two hints each after the rewrite');
  }
  { // app wiring (read from the source): the glossary route and home link, term buttons per step, the recap card, empty checks are not slips
    const app = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app.js'), 'utf8');
    ok((fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'engine', 'steps.js'), 'utf8').match(/if \(step\.aside\)/g) || []).length === 1, 'steps.js renders a step aside exactly once');
    ok(/hash === 'glossary'/.test(app) && /glossaryView\(\)/.test(app), 'app.js routes #glossary to the glossary view');
    ok(/href: '#glossary'/.test(app), 'the home page links to the glossary');
    ok(/attachGlossary\(host\)/.test(app), 'app.js makes glossary terms tappable after every step renders');
    ok(/prereqCard\(L\.id\)/.test(app) && /idx === 0/.test(app), 'app.js shows the prerequisite card above step 1');
    const m = /export const EMPTY_CHECK = (\/.*\/);/.exec(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'engine', 'store.js'), 'utf8'));
    ok(!!m && /store\.logSlip/.test(app), 'engine/store.js has the EMPTY_CHECK filter and app.js logs slips through it');
    if (m) {
      const re = eval(m[1]);
      for (const d of ['Draw at least one arrow: tap the electrons it starts from', 'Tap the carbons first, then press Check.', 'Fill in every box first.', 'Type your answer first.', 'Mark every bond first.', 'Choose at least one reagent card', 'Enter a number, for example 4'])
        ok(re.test(d), `an empty check is not logged as a slip ("${d.slice(0, 28)}...")`);
      ok(!re.test('That carbon has 3 bonds, so it cannot be a carbocation.'), 'a real slip is still logged');
    }
  }
  { // (5a) first try: a problem counts only when the FIRST answer was right
    const a = firstTry(); eq([a.wrong(), a.right(), a.counted, a.slipped, a.misses], [1, false, false, true, 1], 'first try: wrong then right is a slip and scores 0');
    const b = firstTry(); eq([b.right(), b.counted, b.slipped], [true, true, false], 'first try: right at once counts');
    const c = firstTry(); c.right(); c.wrong(); eq([c.counted, c.right()], [true, true], 'first try: a later wrong answer cannot un-count a first right one (the first answer decides)');
    const t = firstTryTally(); t.add(true); t.add(false); t.add(true); eq([t.good, t.shown, t.text()], [2, 3, '2 of 3 right first try'], 'the tally reads "2 of 3 right first try"');
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'engine');
    const lab = fs.readFileSync(path.join(root, 'widgets', 'reaction-lab.js'), 'utf8'), stp = fs.readFileSync(path.join(root, 'steps.js'), 'utf8');
    ok(/firstTry\(\)/.test(lab) && /const counts = ft\.right\(\) && fresh/.test(lab) && /if \(counts\) right\+\+/.test(lab) && /if \(counts && right >= need/.test(lab), 'reaction-lab: the counter only goes up for a first answer that was right (and a reaction not tried before)');
    ok(/tried\.add\(rxnKey\)/.test(lab) && /ft\.wrong\(\)/.test(lab), 'reaction-lab: a wrong click is recorded and a reaction already attempted never scores again');
    ok(/right on the first try/.test(lab) && !/predicted\)/.test(lab), 'reaction-lab: the button reads "n of need right on the first try"');
    ok(/const ft = firstTry\(\)/.test(stp) && /const counts = ft\.right\(\)/.test(stp) && /advance\(counts\)/.test(stp) && /tally\.add\(ok\); if \(ok\) got\+\+/.test(stp), 'steps.js mastery: only a first-try right answer adds to the gate, and the end line reads "n of m right first try"');
    ok(!/advance\(true\)/.test(stp), 'steps.js mastery: no path counts a retry as right');
    ok(/ft\.wrong\(\)/.test(stp) && /g\.right\(sayWhy\(step, o\), \{ note: true \}\)/.test(stp), 'steps.js choice and input: a right answer after a wrong one says it is a slip');
  }
  { // (5b) worked steps: the options of every move are shuffled like a choice step, tracked by object
    const worked = []; for (const L of LESSONS) for (const s of L.steps) if (s.type === 'worked') worked.push([L, s]);
    ok(worked.length >= 10, `worked steps found (${worked.length})`);
    let first = 0, total = 0, kept = true, stable = true;
    for (const [L, s] of worked) s.moves.forEach((m, mi) => {
      const a = orderedMoveOptions(s, mi, L.id, 3), b = orderedMoveOptions(s, mi, L.id, 3);
      if (a.map((o) => m.options.indexOf(o)).join() !== b.map((o) => m.options.indexOf(o)).join()) stable = false;
      if (!(a.length === m.options.length && a.every((o) => m.options.includes(o)) && a.filter((o) => o.correct).length === 1)) kept = false;
      for (let k = 0; k < 40; k++) { const sh = orderedMoveOptions(s, mi, L.id, k); total++; if (sh[0].correct) first++; }
    });
    ok(stable && kept, 'worked moves: the same attempt gives the same order, with the same option objects and one correct option');
    ok(first / total < 0.5 && first / total > 0.1, `worked moves: the correct option is not always first (first in ${(100 * first / total).toFixed(0)}% of renders)`);
    const L17 = LESSONS.find((l) => l.id === '17');
    ok(orderedMoveOptions(L17.steps.find((s) => s.id === 's01'), 0, '17', 1).map((o) => o.correct).indexOf(true) >= 0, 'worked moves of Lesson 17 are shuffled');
    ok(/orderedMoveOptions\(step, mi, ctx\.lessonId, ctx\.attempt\)/.test(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'engine', 'steps.js'), 'utf8')), 'steps.js renders the moves through orderedMoveOptions');
    ok(orderedMoveOptions({ id: 'x', ordered: true, moves: [{ options: worked[0][1].moves[0].options }] }, 0, '1', 1).every((o, i) => o === worked[0][1].moves[0].options[i]), 'ordered: true keeps the move order');
  }
  { // (5c) image options get an accessible name: the generated IUPAC name, else the formula and what tells it apart
    eq(describeMol('CCCC(C)Cl'), '2-chloropentane', 'an option the naming engine can name is read by its IUPAC name');
    ok(/2,3-dibromobutane, stereocentres [RS] and [RS]/.test(describeMol('C[C@H](Br)[C@@H](C)Br')), 'a named stereo drawing adds its R / S labels');
    ok(describeMol('C[C@H](Br)[C@@H](C)Br') !== describeMol('C[C@@H](Br)[C@@H](C)Br'), 'meso and racemate drawings read differently');
    ok(/^formula C6H13Br, a chain of 6 carbons, Br on a tertiary carbon$/.test(describeMol('CCCC(C)(C)Br')) && /primary carbon/.test(describeMol('CCC(C)CBr')), 'an unnamed molecule gets its formula and the kind of carbon the group sits on');
    ok(describeMol('OC(=O)C1C=CCC=C1') !== describeMol('OC(=O)C1=CCC=CC1') && describeMol('OC(=O)C1C=CCC=C1') !== describeMol('OC(=O)C1C=CC=CC1'), 'isomeric dienes with the same formula are told apart');
    eq(describeMol('CC(C)=O.CCC(=O)O').split(' and ').length, 2, 'several molecules read "A and B"');
    eq(describeAll(['CCCC', 'CCCC']), ['butane, drawing 1 of 2', 'butane, drawing 2 of 2'], 'two identical names are told apart');
    eq(optionSmiles({ text: 'x <mol smiles="CC"></mol> y <mol smiles="CCC"></mol>' }), 'CC.CCC', 'optionSmiles reads the drawing inside an option text');
    // no option of any lesson, in any step type, is left without a name or shares a name with its neighbours (Lessons 1-17)
    let n = 0, empty = 0, clash = 0;
    for (const L of LESSONS) for (const s of L.steps) {
      const lists = s.type === 'worked' ? s.moves.map((m) => m.options) : [s.options || []];
      for (const list of lists) {
        if (!list.some((o) => optionSmiles(o))) continue;
        const names = optionNames(list);
        names.forEach((nm, i) => { n++; if (optionSmiles(list[i]) && !nm) empty++; });
        if (new Set(names.filter(Boolean)).size !== names.filter(Boolean).length) clash++;
      }
    }
    ok(n > 250 && empty === 0 && clash === 0, `every drawn option in the lessons has a name of its own (${n} options, ${empty} unnamed, ${clash} steps with a repeated name)`);
    const stp = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'engine', 'steps.js'), 'utf8');
    ok(/setAttribute\('aria-label'/.test(stp) && /class: 'sr-only'/.test(stp) && (stp.match(/nameOptionButton\(/g) || []).length >= 5, 'steps.js sets an aria-label and visually hidden text on predict, choice, worked and mastery options');
  }
  { // wrong-answer feedback names the slip: no why of a wrong option is a bare "wrong"
    let thin = 0;
    for (const L of LESSONS) for (const s of L.steps) if (s.type === 'predict' || s.type === 'choice') for (const o of s.options) if (!o.correct && strip(o.why).length < 40) thin++;
    for (const L of LESSONS) for (const s of L.steps) if (s.type === 'worked') for (const m of s.moves) for (const o of m.options) if (!o.correct && strip(o.why).length < 40) thin++;
    ok(thin === 0, `every wrong option (and every wrong worked-example move) explains itself in at least 40 characters (${thin} short)`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('text.mjs')) {
  let pass = 0, fail = 0; const f = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; f.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await text({ ok, eq });
  console.log(`${pass} passed, ${fail} failed`); f.slice(0, 40).forEach((x) => console.log(' FAIL ' + x));
  process.exit(fail ? 1 : 0);
}
