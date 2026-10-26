// Caveman voice checks (engine/voice.js, the header switch in app.js, the views that use it).
//  (1) t / tAuto / onVoiceChange / setCaveman: the caveman text only when the mode is on AND a caveman text exists; the mode is stored (store.getCaveman, default off);
//  (2) compress(): on every arrow `why` of every mechanism the course plays, every hub card text and a set of hand-written strings the result is never empty, at most 90
//      characters, free of articles and of parentheticals with words in them, and never mangles a chemical token (anything with a subscript, a superscript or a charge sign);
//  (3) the wiring, read from the source: the header switch, the hub cards, the player's why line, the drill feedback.
// Run on its own with `node learn/tests/voice.mjs`, or as part of run.mjs.
import { ready } from '../engine/chem.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import * as R from '../engine/reactions.js';
import * as M from '../engine/mechanisms.js';
import * as V from '../engine/voice.js';
import { HUB_CARDS } from '../engine/reaction-hub.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (...p) => fs.readFileSync(path.join(HERE, '..', ...p), 'utf8');
const TOKEN = /[₀-₉⁰-⁹⁺⁻]/;
const words = (s) => s.split(/\s+/).map((w) => w.replace(/^[.,;:!?]+|[.,;:!?]+$/g, '')).filter(Boolean);

export async function voice({ ok, eq }) {
  await ready();
  // ---- (1) the switch's state and the t() helper
  V.setCaveman(false);
  eq(V.cavemanOn(), false, 'caveman is off after setCaveman(false)');
  eq(V.t('Normal text.', 'Cave text.'), 'Normal text.', 't() gives the normal text when caveman is off');
  eq(V.tAuto('The cation is stable.', 'Cation stable.'), 'The cation is stable.', 'tAuto() gives the normal text when caveman is off');
  let n = 0;
  const off = V.onVoiceChange(() => { n++; });
  V.setCaveman(true);
  eq(V.cavemanOn(), true, 'caveman is on after setCaveman(true)');
  eq(n, 1, 'onVoiceChange fires once per toggle');
  eq(V.t('Normal text.', 'Cave text.'), 'Cave text.', 't() gives the caveman text when caveman is on');
  eq(V.t('Normal text.', undefined), 'Normal text.', 't() falls back to the normal text when there is no caveman text');
  eq(V.t('Normal text.', ''), 'Normal text.', 't() falls back to the normal text when the caveman text is empty');
  eq(V.tAuto('Normal text.', 'Cave text.'), 'Cave text.', 'tAuto() uses the caveman text when there is one');
  eq(V.tAuto('The bond pair leaves with the Br, which departs as Br⁻ (a good leaving group).', undefined), V.compress('The bond pair leaves with the Br, which departs as Br⁻ (a good leaving group).'), 'tAuto() squeezes the normal text when there is no caveman text');
  for (const c of HUB_CARDS) {
    eq(V.t(c.what, c.caveman.what), c.caveman.what, `${c.id}: the card's "what" turns into its caveman text`);
    eq(c.apply.steps.map((s, i) => V.t(s, c.caveman.steps[i])), c.caveman.steps, `${c.id}: every step turns into its caveman step`);
    eq([V.t(c.facts.adds, c.caveman.facts.adds), V.t(c.facts.where, c.caveman.facts.where)], [c.caveman.facts.adds, c.caveman.facts.where], `${c.id}: the facts turn into their caveman text`);
  }
  off(); V.setCaveman(false);
  eq(n, 1, 'a stopped listener is not called again');
  ok(/caveman: false/.test(read('engine', 'store.js')) && /getCaveman/.test(read('engine', 'store.js')) && /setCaveman/.test(read('engine', 'store.js')), 'the store keeps the mode, default off');

  // ---- (2) the compressor
  const samples = [
    'A π pair of the triple bond attacks the δ+ H of H–Br and forms a new C–H bond, on the carbon with more H.',
    'The Br–Br bond pair leaves with the far Br, which departs as Br⁻ (a good leaving group).',
    'A lone pair on the oxygen of a water molecule attacks the positive carbon and forms a new C–O bond; that oxygen now carries the +.',
    'The (CH₃)₃C⁺ cation is stable, so H₃O⁺ gives H to the 2,3-dimethylbut-2-ene.',
    'It is an extremely long sentence without any commas or stops that just keeps going on and on about nothing in particular, well past the limit.',
    'Dilute H₂SO₄ (or D₂SO₄, D₂O), heat.'
  ];
  const corpus = [...samples];
  const addMech = (m) => { try { m.steps.forEach((st) => { st.arrows.forEach((a) => corpus.push(a.why)); corpus.push(st.label); }); } catch (e) { /* not a mechanism the course plays */ } };
  for (const L of LESSONS) for (const s of L.steps) if (s.widget === 'mechanism-player') { try { addMech(s.config.mech); } catch (e) { /* ignore */ } }
  Object.values(M.MECH).forEach(addMech);
  for (const a of M.HX_ALKENES) addMech(M.hxMechanism(a.smiles, 'Br'));
  for (const a of ['C1=CCCCC1', 'CC1=CCCCC1']) { try { addMech(R.halogenMechanism(a, 'Br')); } catch (e) { /* ignore */ } try { addMech(R.predict(a, 'H2O').major[0].mech); } catch (e) { /* ignore */ } }
  for (const id of R.EAS_IDS) { try { addMech(R.easMechanism(id, id === 'RCl' ? 'CCl' : id === 'RCOCl' ? 'CC(=O)Cl' : null)); } catch (e) { /* ignore */ } }
  addMech(R.alkyneHXMechanism('CC#C', 'Br'));
  addMech(R.acetylideAlkylationMechanism('C#C', 'CBr'));
  for (const c of HUB_CARDS) { corpus.push(c.what, ...c.apply.steps, c.facts.where, c.facts.adds); if (c.facts.spaceNote) corpus.push(c.facts.spaceNote); if (c.example.note) corpus.push(c.example.note); }
  ok(corpus.length > 400, `the compressor is checked on ${corpus.length} real strings`);
  let bad = 0;
  for (const src of corpus) {
    const out = V.compress(src);
    const t = `compress(${JSON.stringify(src).slice(0, 70)}...)`;
    if (!out) { bad++; ok(false, `${t} is empty`); continue; }
    if (out.length > 90) { bad++; ok(false, `${t} is ${out.length} characters, over 90: ${out}`); continue; }
    if (/(^|[\s(])(the|an?)\s/i.test(out)) { bad++; ok(false, `${t} still has an article: ${out}`); continue; }
    if (/\([^()]*\s[^()]*\)/.test(out)) { bad++; ok(false, `${t} still has a parenthetical with words: ${out}`); continue; }
    if (!/[.]$/.test(out)) { bad++; ok(false, `${t} does not end with a full stop: ${out}`); continue; }
    // every chemical token of the output is a whole word of the input (nothing cut or rewritten)
    const inW = new Set(words(src));
    const mangled = words(out).filter((w) => TOKEN.test(w) && !inW.has(w) && !inW.has(w.replace(/^\(|\)$/g, '')));
    if (mangled.length) { bad++; ok(false, `${t} changed a chemical token ${mangled}: ${out}`); continue; }
  }
  ok(bad === 0, 'the compressor kept every rule on the whole corpus');
  const keep = V.compress('The (CH₃)₃C⁺ cation is stable, so H₃O⁺ gives H to the 2,3-dimethylbut-2-ene.');
  ok(keep.includes('(CH₃)₃C⁺') && keep.includes('H₃O⁺') && keep.includes('2,3-dimethylbut-2-ene'), `formula tokens survive: ${keep}`);
  eq(V.compress('The Br–Br bond pair leaves with the far Br, which departs as Br⁻ (a good leaving group).'), 'Br–Br bond pair leaves with far Br. Departs as Br⁻.', 'the compressor drops articles and a parenthetical, splits on commas and drops "which"');
  ok(V.compress('Gives the (E) product.').includes('(E)'), 'a one-word group such as (E) is kept (it is a chemical token)');
  eq(V.compress(''), '', 'nothing in, nothing out');
  ok(V.compress('It is an extremely long sentence without any commas or stops that just keeps going on and on about nothing in particular, well past the limit.').length <= 90, 'a long text is cut to 90 characters');

  // ---- (3) the wiring, read from the source
  const app = read('app.js'), hubv = read('hub-view.js'), player = read('engine', 'widgets', 'mechanism-player.js'), steps = read('engine', 'steps.js'), html = read('index.html');
  ok(/id: 'caveman-switch'/.test(app) && /role: 'switch'/.test(app) && /voice\.setCaveman\(!voice\.cavemanOn\(\)\)/.test(app) && /class: 'switches'/.test(app), 'the header has a Caveman switch next to New IUPAC');
  ok(/onVoiceChange\(/.test(hubv) && /c\.caveman/.test(hubv) && /\bt\(c\.what/.test(hubv) && /apply\.steps\.map\(\(s, i\)/.test(hubv), 'the hub cards read the caveman text (what, facts, steps, note) and repaint on a toggle');
  ok(/onVoiceChange\(/.test(player) && /cavemanWhy/.test(player), 'the player repaints its why line on a toggle and honours cavemanWhy');
  ok(/tAuto\(why\)/.test(steps) && /cfg\.skill/.test(steps), 'the drill feedback goes through the caveman squeeze (practice only)');
  ok(/\.switches \{/.test(html), 'the two header switches sit in one flex group (.switches)');
}

// run alone: node learn/tests/voice.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await voice({ ok, eq });
  console.log(`voice: ${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
