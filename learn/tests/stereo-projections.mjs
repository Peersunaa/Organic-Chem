// "Stereo across projections" drill checks (engine/generators-stereo-projections.js, widget projection-pair, generator `stereo-projections`, route #practise-stereo-projections).
//  (1) wiring: skill tag + label + rule, generator registry, widget registry, route regexp in app.js, CSS block "stereo projections";
//  (2) 300 seeded problems: exactly one right option out of four distinct ones, one diagnosis per wrong option and none for the right one, two hints, a worked walkthrough,
//      two different pictures, all three levels and all five drawing styles (wedge, one- and two-centre Fischer, Newman, named) present, named forms in roughly a quarter;
//  (3) the answer is recomputed three ways: the engine (relationship() + meso check on the SMILES each drawing stands for), a pure R/S-letter oracle written here
//      (same letters / opposite letters / meso collapse, no SMILES), and Python RDKit (tools/check_relationships.py: canonical isomeric SMILES equality, mirror image, meso);
//  (4) every drawing is read back in Python RDKit from its own geometry: Fischer (one centre: tools/check_fischer.py; two centres: tools/check_stereo_projections.py, the
//      eclipsed 3D geometry a Fischer stack stands for), Newman (3D built from the drawn screen angles), wedge (CIP letters of the SMILES) and names (OPSIN round trip);
//      exhaustive passes cover every molecule x every configuration x every turn / view / conformation, not just the seeded 300;
//  (5) one-centre Fischer pairs made by turns and swaps obey the textbook verdicts (180 degrees and two swaps keep the molecule; 90 degrees and one swap give the enantiomer);
//  (6) the widget markup of every drawing is real (SVG with the labels, a name card).
// Run on its own with `node learn/tests/stereo-projections.mjs`, or as part of run.mjs.
import { ready, canon } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, generatorForSkill, GENERATORS } from '../engine/generators.js';
import * as G from '../engine/generators-stereo-projections.js';
import { relationship } from '../engine/chirality.js';
import { WIDGETS } from '../engine/widgets/index.js';
import * as PP from '../engine/widgets/projection-pair.js';
import { skillLabel, skillRule } from '../engine/skills.js';
import { readRS, POSITIONS, H_GROUP, fischerSmiles, OP_VERDICT } from '../engine/fischer.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.join(HERE, '..', 'tools');
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const flip = (l) => (l === 'R' ? 'S' : 'R');
/** The relationship worked out from R/S letters alone (no SMILES, no RDKit): the oracle for the answer. `sym` = the two ends of the molecule are alike (a meso form exists). */
export function oracle(la, lb, sym) {
  const eq = (x, y) => x.join('') === y.join('');
  const rev = (x) => x.slice().reverse();
  const mir = (x) => x.map(flip);
  const meso = sym && la.length === 2 && eq(la, rev(mir(la)));       // mirror image, renumbered from the other end, is the same letters
  const same = eq(la, lb) || (sym && eq(rev(la), lb));
  if (same) return meso ? 'meso' : 'identical';
  const enant = eq(mir(la), lb) || (sym && eq(rev(mir(la)), lb));
  if (enant && !meso) return 'enantiomers';
  return 'diastereomers';
}

// group label -> SMILES written outward from the centre (an independent table, not the generator's)
const FRAG = { 'CH₃': 'C', 'CO₂H': 'C(=O)O', Br: 'Br', OH: 'O', 'NH₂': 'N', Cl: 'Cl', 'CH₂CH₃': 'CC', H: '[H]', CHO: 'C=O', 'CH₂OH': 'CO' };
const NEWMAN_FRAG = { ...FRAG, Et: 'CC' };

export async function stereoProjections({ ok, eq }) {
  await ready();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-sp-'));
  const pyJson = (script, data) => {
    const inp = path.join(tmp, 'in-' + script + '.json'), out = path.join(tmp, 'out-' + script + '.json');
    fs.writeFileSync(inp, JSON.stringify(data));
    execFileSync('python3', ['-I', path.join(TOOLS, script + '.py'), inp, out], { stdio: ['ignore', 'ignore', 'inherit'] });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const stats = { problems: 0, pairs: 0, drawings: 0, exhaustive: 0, names: 0 };

  // ------------------------------------------------------------------ (1) wiring
  ok(skillLabel('stereo-projections') === 'Stereo across projections' && skillRule('stereo-projections').length > 120, 'skill label and rule');
  ok(generatorForSkill('stereo-projections') === 'stereo-projections' && GENERATORS['stereo-projections'] === true, 'generator registered for the skill');
  ok(!!WIDGETS['projection-pair'] && typeof WIDGETS['projection-pair'].mount === 'function', 'widget projection-pair registered');
  const appSrc = fs.readFileSync(path.join(HERE, '..', 'app.js'), 'utf8');
  ok(/practise-\(\[a-z0-9-\]\+\)/.test(appSrc) && /generatorForSkill\(skill\)/.test(appSrc), 'app.js routes #practise-<skill> through generatorForSkill (so #practise-stereo-projections works)');
  const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
  ok(html.includes('/* stereo projections */') && /\.pj-name\b/.test(html) && /\.pj-newman\b/.test(html), 'CSS block "stereo projections"');
  ok(G.STEREO_PROJ_SKILLS.length === 1 && G.STEREO_PROJ_SKILLS[0] === 'stereo-projections', 'STEREO_PROJ_SKILLS');

  // the pool
  const pool = G.spPool();
  eq(pool.map((m) => m.id), ['glyceraldehyde', 'lactic acid', 'alanine', 'butan-2-ol', '2-bromobutane', 'dibromobutane', 'butanediol', 'tartaric', 'bromobutanol', 'threonine', 'chloromethylpentane', 'dimethylcyclohexane12', 'dibromocyclohexane12'], 'molecule pool');
  pool.forEach((M) => {
    const labs = M.combos.map((c) => c.labels.join(''));
    eq(new Set(labs).size, M.combos.length, `${M.id}: every R/S combination is a different configuration`);
    ok(M.kind === 'one' ? M.symmetric === false : true, `${M.id}: a one-centre molecule is never meso`);
    if (M.kind === 'stack') ok(M.symmetric === M.def.symmetric, `${M.id}: meso-capable flag agrees with the engine`);
    if (M.symmetric) ok(M.classes.meso.length > 0 && M.combos.filter((c) => c.meso).length === 2, `${M.id}: exactly two meso configurations ((R,S) and (S,R))`);
    else ok(M.classes.meso.length === 0, `${M.id}: no meso form`);
  });
  ok(pool.filter((m) => m.kind === 'ring').every((m) => m.symmetric), 'cis-1,2 rings are meso');

  // ------------------------------------------------------------------ (2) 300 seeded problems
  const rng = mulberry32(20261020);
  const problems = [];
  for (let i = 0; i < 100; i++) problems.push(...generate('stereo-projections', 3, { rng }));
  eq(problems.length, 300, '300 problems');
  const ids = ['identical', 'meso', 'enantiomers', 'diastereomers'];
  const count = { level: {}, style: {}, answer: {}, mol: {}, named: 0 };
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  problems.forEach((p, n) => {
    const t = `problem ${n} (${p.entry} L${p.level} ${p.a.style}/${p.b.style})`;
    ok(p.kind === 'widget' && p.widget === 'projection-pair' && p.skill === 'stereo-projections' && p.smiles === null, `${t} shape`);
    ok(typeof p.prompt === 'string' && p.prompt.length > 20, `${t} prompt`);
    ok(Array.isArray(p.hints) && p.hints.length === 2 && p.hints.every((h) => h.length > 40), `${t} two hints`);
    ok(p.derive.length > 150 && p.derive.includes('Drawing A') && p.derive.includes('Drawing B'), `${t} worked walkthrough`);
    const opts = p.config.options;
    eq(opts.map((o) => o.id).sort(), ids.slice().sort(), `${t} four options`);
    eq(new Set(opts.map((o) => o.text)).size, 4, `${t} options distinct`);
    eq(opts.filter((o) => o.id === p.answer).length, 1, `${t} exactly one correct option`);
    ok(p.config.answer === p.answer, `${t} config answer`);
    const wrong = opts.filter((o) => o.id !== p.answer).map((o) => o.id);
    eq(Object.keys(p.config.whys).sort(), wrong.slice().sort(), `${t} a diagnosis for every wrong option and none for the right one`);
    wrong.forEach((w) => ok(p.config.whys[w].length > 60 && !/undefined|NaN|\[object/.test(p.config.whys[w]), `${t} diagnosis of ${w}`));
    ok(!/undefined|NaN|\[object/.test(p.derive), `${t} walkthrough text clean`);
    ok([1, 2, 3].includes(p.level), `${t} level`);
    ok(p.a.key !== p.b.key, `${t} the two pictures differ`);
    bump(count.level, p.level); bump(count.answer, p.answer); bump(count.mol, p.entry);
    bump(count.style, p.a.style === 'fischer' ? 'fischer' + p.a.n : p.a.style); bump(count.style, p.b.style === 'fischer' ? 'fischer' + p.b.n : p.b.style);
    if (p.a.style === 'name' || p.b.style === 'name') count.named++;
    // level rules
    if (p.level === 1) ok(p.molKind === 'one' && !['newman', 'name'].includes(p.a.style) && !['newman', 'name'].includes(p.b.style), `${t} level 1: one centre, wedge and Fischer only`);
    if (p.level === 2) ok(p.molKind !== 'one' && !['newman', 'name'].includes(p.a.style) && !['newman', 'name'].includes(p.b.style), `${t} level 2: two centres, wedge and Fischer`);
    if (p.level === 3) ok(p.molKind !== 'one' && [p.a.style, p.b.style].some((s) => s === 'newman' || s === 'name'), `${t} level 3: a Newman or a named form`);
    ok(!(p.a.style === 'name' && p.b.style === 'name'), `${t} not two names`);
    if (p.a.style === 'newman' || p.b.style === 'newman') ok(p.molKind === 'stack', `${t} Newman only for a chain`);
    // never ambiguous: both SMILES fully specified and the engine says stereoisomers
    const r = relationship(p.a.smiles, p.b.smiles);
    ok(['identical', 'enantiomers', 'diastereomers'].includes(r.kind), `${t} stereoisomer pair (${r.kind})`);
    stats.problems++;
  });
  [1, 2, 3].forEach((l) => ok(count.level[l] >= 60, `level ${l} appears (${count.level[l]})`));
  ['wedge', 'fischer1', 'fischer2', 'newman', 'name'].forEach((s) => ok(count.style[s] >= 25, `style ${s} appears (${count.style[s]})`));
  ids.forEach((a) => ok(count.answer[a] >= 20, `answer ${a} appears (${count.answer[a]})`));
  pool.forEach((m) => ok(count.mol[m.id] >= 3, `molecule ${m.id} appears (${count.mol[m.id]})`));
  ok(count.named >= 55 && count.named <= 105, `named forms in about a quarter of the problems (${count.named} of 300)`);
  // the right answer's position is spread over the four slots
  const pos = [0, 0, 0, 0]; problems.forEach((p) => pos[p.config.options.findIndex((o) => o.id === p.answer)]++);
  ok(pos.every((n) => n >= 40), `right option spread over the four places: ${pos.join('/')}`);

  // ------------------------------------------------------------------ (3) the answer, three ways
  const pairs = problems.map((p) => [p.a.smiles, p.b.smiles]);
  const rel = pyJson('check_relationships', { pairs, meso: problems.map((p) => p.a.smiles) });
  problems.forEach((p, n) => {
    const t = `problem ${n} (${p.entry} ${p.a.style}/${p.b.style})`;
    const info = relationship(p.a.smiles, p.b.smiles);
    const engine = info.kind === 'identical' ? (info.mesoA ? 'meso' : 'identical') : info.kind;
    eq(p.answer, engine, `${t} answer = engine relationship()`);
    eq(p.answer, oracle(p.a.labels, p.b.labels, p.symmetric), `${t} answer = R/S-letter oracle (${p.a.labels} vs ${p.b.labels})`);
    const py = rel.pairs[n], pm = rel.meso[n];
    const pyAns = py.kind === 'identical' ? (pm.meso ? 'meso' : 'identical') : py.kind;
    eq(p.answer, pyAns, `${t} answer = Python RDKit (${py.kind}, meso ${pm.meso})`);
    ok(py.sameConstitution, `${t} same constitution`);
    stats.pairs++;
  });
  // the wrong options of the 300 each really are wrong: every wrong option names a different relationship
  problems.forEach((p, n) => { ok(!p.config.whys[p.answer], `problem ${n}: no diagnosis text for the right option`); });

  // ------------------------------------------------------------------ (4) read every drawing back in Python
  const f1 = [], stack = [], newman = [], wedges = [], names = [];
  const seenDrawing = new Set();
  const collect = (d, tag) => {
    const sig = JSON.stringify(d);
    if (seenDrawing.has(sig)) return; seenDrawing.add(sig);
    if (d.style === 'fischer' && d.n === 1) f1.push({ id: tag, groups: Object.fromEntries(POSITIONS.map((p) => [p, d.d[p].frag])), smiles: d.smiles, d });
    else if (d.style === 'fischer') stack.push({ id: tag, top: FRAG[d.stack.top], bottom: FRAG[d.stack.bottom], rows: d.stack.rows.map((r) => ({ left: FRAG[r.left], right: FRAG[r.right] })), smiles: d.smiles, d });
    else if (d.style === 'newman') newman.push({ id: tag, front: d.front.map((g) => ({ ang: g.ang, frag: NEWMAN_FRAG[g.short] })), back: d.back.map((g) => ({ ang: g.ang, frag: NEWMAN_FRAG[g.short] })), smiles: d.smiles, d });
    else if (d.style === 'wedge') wedges.push({ id: tag, smiles: d.smiles, d });
    else names.push({ id: tag, text: d.text, smiles: d.smiles, d });
  };
  problems.forEach((p, n) => { collect(p.a, `p${n}a`); collect(p.b, `p${n}b`); });

  // exhaustive: every molecule x configuration x turn / view / conformation (not just what the seeds happened to draw)
  const exh = new Set();
  pool.forEach((M) => {
    M.combos.forEach((c, ci) => {
      collect(G.wedgeDrawing(M, ci, 0), `x-${M.id}-${ci}-w`);
      collect(G.nameDrawing(M, ci), `x-${M.id}-${ci}-n`);
      if (M.kind === 'stack') {
        [false, true].forEach((turned) => collect(G.fischer2Drawing(M, ci, turned), `x-${M.id}-${ci}-f${turned}`));
        const r = mulberry32(900 + ci);
        for (let k = 0; k < 24; k++) collect(G.newmanDrawing(M, ci, r), `x-${M.id}-${ci}-nw${k}`);
      }
    });
    if (M.kind === 'one') {
      // all 24 ways to put the four groups on a Fischer cross
      const e = M.entry, gs = [e.top, e.bottom, e.x, H_GROUP];
      const perms = []; const rec = (a, rest) => { if (!rest.length) { perms.push(a); return; } rest.forEach((g, i) => rec([...a, g], rest.filter((_, j) => j !== i))); };
      rec([], gs);
      perms.forEach((pm, k) => {
        const dd = {}; POSITIONS.forEach((pos, i) => { dd[pos] = pm[i]; });
        const rr = readRS(dd);
        const plain = Object.fromEntries(POSITIONS.map((pos) => [pos, { label: dd[pos].label, rank: dd[pos].rank, frag: dd[pos].frag }]));
        collect({ style: 'fischer', n: 1, d: plain, smiles: canon(fischerSmiles(dd)), labels: [rr.label], x: 1 }, `x-${M.id}-perm${k}`);
      });
    }
  });
  stats.exhaustive = f1.length + stack.length + newman.length + wedges.length + names.length;

  const py = pyJson('check_stereo_projections', {
    stack: stack.map(({ id, top, bottom, rows, smiles }) => ({ id, top, bottom, rows, smiles })),
    newman: newman.map(({ id, front, back, smiles }) => ({ id, front, back, smiles })),
    smiles: wedges.map((w) => w.smiles).concat(names.map((n) => n.smiles))
  });
  const pyF1 = pyJson('check_fischer', { cases: f1.map(({ id, groups, smiles }) => ({ id, groups, smiles })) });
  const sorted = (xs) => xs.slice().sort().join('');

  // one-centre Fischer: the JS reading, then Python three ways (wedge molblock, 3D coordinates, the SMILES written)
  f1.forEach((c, k) => {
    const o = pyF1.cases[k], d = c.d;
    const dd = Object.fromEntries(POSITIONS.map((p) => [p, d.d[p]]));
    eq(readRS(dd).label, d.labels[0], `${c.id}: Fischer read-back letter`);
    eq(o.wedge.cip, d.labels[0], `${c.id}: Python wedge/hash molblock gives ${d.labels[0]}`);
    eq(o.d3.cip, d.labels[0], `${c.id}: Python 3D gives ${d.labels[0]}`);
    eq(o.smiles.cip, d.labels[0], `${c.id}: Python on the SMILES gives ${d.labels[0]}`);
    eq(canon(o.d3.smi), canon(d.smiles), `${c.id}: Fischer SMILES is the molecule the cross stands for`);
    stats.drawings++;
  });
  // two-centre Fischer
  stack.forEach((c, k) => {
    const o = py.stack[k], d = c.d;
    const chain = []; d.stack.rows.forEach((r, i) => { chain[r.id] = o.d3.cip[i]; });
    eq(chain, d.labels, `${c.id}: stacked Fischer read-back letters (Python 3D, chain order)`);
    eq(canon(o.d3.smi), canon(d.smiles), `${c.id}: stacked Fischer SMILES is the molecule the geometry stands for`);
    eq(sorted(o.smiles.cip), sorted(d.labels), `${c.id}: Python letters of the written SMILES`);
    // the walkthrough's per-centre reading agrees too
    d.views.forEach((v) => { const dd = Object.fromEntries(POSITIONS.map((p) => [p, v.d[p]])); eq(readRS(dd).label, d.labels[v.id], `${c.id}: centre ${v.id} read by the Fischer rule`); });
    stats.drawings++;
  });
  // Newman: 3D from the drawn screen angles
  newman.forEach((c, k) => {
    const o = py.newman[k], d = c.d;
    ok(d.front.length === 3 && d.back.length === 3, `${c.id}: three groups on each carbon`);
    const fa = d.front.map((g) => g.ang).sort((a, b) => a - b), ba = d.back.map((g) => g.ang).sort((a, b) => a - b);
    const gaps = (a) => [a[1] - a[0], a[2] - a[1], 360 - a[2] + a[0]].map((x) => Math.round(x));
    eq(gaps(fa), [120, 120, 120], `${c.id}: front bonds 120 degrees apart`);
    eq(gaps(ba), [120, 120, 120], `${c.id}: rear bonds 120 degrees apart`);
    const off = Math.min(...fa.flatMap((x) => ba.map((y) => { const dd = Math.abs(x - y) % 360; return Math.min(dd, 360 - dd); })));
    ok(Math.round(off) === 60, `${c.id}: staggered (rear bonds halfway between front bonds, off ${off})`);
    const chain = d.frontName === 'C2' ? [o.d3.cip[0], o.d3.cip[1]] : [o.d3.cip[1], o.d3.cip[0]];
    eq(chain, d.labels, `${c.id}: Newman read-back letters (Python 3D from the screen angles)`);
    eq(canon(o.d3.smi), canon(d.smiles), `${c.id}: Newman SMILES is the molecule the angles stand for`);
    eq(canon(G.newmanSmiles(d.front, d.back)), canon(d.smiles), `${c.id}: SMILES from the angles`);
    stats.drawings++;
  });
  // wedge drawings and names: CIP letters of the SMILES (Python)
  wedges.forEach((c) => { eq(sorted(py.smiles[c.smiles].cip), sorted(c.d.labels), `${c.id}: wedge letters (Python CIP of the drawn SMILES)`); stats.drawings++; });
  names.forEach((c) => { eq(sorted(py.smiles[c.smiles].cip), sorted(c.d.labels), `${c.id}: name letters (Python CIP)`); stats.drawings++; });
  // names: OPSIN turns the text into the structure the drawing stands for
  const uniq = [...new Set(names.map((n) => n.text))];
  const opsin = pyJson('check_names', uniq);
  let good = 0;
  names.forEach((c) => {
    const s = opsin[c.text];
    const match = !!s && canon(s) === canon(c.smiles);
    if (match) good++;
    ok(match, `OPSIN: "${c.text}" -> ${s || 'unparsed'}, expected ${canon(c.smiles)}`);
  });
  stats.names = uniq.length;
  eq(good, names.length, 'OPSIN agreed on every name');
  // the prefix letters in each name equal the labels of the drawing
  names.forEach((c) => {
    const m = /^\(([^)]*)\)/.exec(c.d.text);
    const letters = m[1].split(',').map((x) => x.replace(/^\d+/, ''));
    eq(letters, c.d.labels, `name "${c.d.text}": letters are the drawing's labels`);
  });

  // ------------------------------------------------------------------ (5) one-centre Fischer pairs made by turns and swaps
  let ops = 0;
  problems.forEach((p, n) => {
    if (p.molKind === 'one' && p.a.style === 'fischer' && p.b.style === 'fischer' && p.b.op) {
      ops++;
      const truth = p.answer === 'identical' ? 'same' : 'enantiomers';
      eq(OP_VERDICT[p.b.op], truth, `problem ${n}: ${p.b.op} gives ${truth}`);
    }
  });
  ok(ops >= 12, `one-centre Fischer pairs built by turns and swaps (${ops})`);
  const opsSeen = new Set(problems.filter((p) => p.b.op).map((p) => p.b.op));
  ok(['rot180', 'rot90', 'swap1', 'swap2'].every((o) => opsSeen.has(o)), `all four operations appear (${[...opsSeen]})`);
  // two-centre: some pairs are the same stack turned 180 degrees
  ok(problems.some((p) => p.a.style === 'fischer' && p.b.style === 'fischer' && p.a.n === 2 && p.a.turned !== p.b.turned), 'two-centre Fischer pairs with one turned 180 degrees');

  // ------------------------------------------------------------------ (6) widget markup
  problems.forEach((p, n) => {
    [p.config.a, p.config.b].forEach((d) => {
      const m = PP.drawingMarkup(d);
      ok(m.length > 80 && !/NaN|undefined/.test(m), `problem ${n}: markup of the ${d.style} drawing`);
      if (d.style === 'name') ok(m.includes(d.text.replace(/&/g, '&amp;')) || m.includes('pj-name'), `problem ${n}: name card`);
      else ok(m.startsWith('<svg') || m.includes('<svg'), `problem ${n}: ${d.style} is an SVG`);
      if (d.style === 'newman') ok(d.front.concat(d.back).every((g) => m.includes('>' + (g.short || g.label) + '<')), `problem ${n}: every Newman group is labelled`);
      if (d.style === 'fischer' && d.n === 2) ok([d.stack.top, d.stack.bottom, ...d.stack.rows.flatMap((r) => [r.left, r.right])].every((l) => m.includes('>' + l + '<')), `problem ${n}: every stacked Fischer group is labelled`);
      ok(PP.drawingCaption(d, 'A').length > 10, `problem ${n}: caption`);
    });
  });

  console.log(`  Stereo projections: ${stats.problems} problems (levels ${[1, 2, 3].map((l) => count.level[l]).join('/')}, named ${count.named}, answers ${ids.map((a) => a + ' ' + count.answer[a]).join(', ')}); ${stats.pairs} pairs recomputed in Python; ${stats.exhaustive} distinct drawings read back (Fischer ${f1.length + stack.length}, Newman ${newman.length}, wedge ${wedges.length}, named ${names.length}); OPSIN ${good}/${names.length}`);
  fs.rmSync(tmp, { recursive: true, force: true });
}

// run alone: node learn/tests/stereo-projections.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await stereoProjections({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
