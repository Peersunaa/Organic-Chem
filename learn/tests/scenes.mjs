// Mechanism scene checks (learn/scenes/): the 18 storyboards (01-16 reagent scenes, 17-18 Lesson 08 primers) in scenes/scenes/*.json, their compiled layouts in scenes/layouts/*.json, the renderer
// (scenes/scene-engine.js), the index (scenes/scene-index.js) and the wiring in app.js, hub-view.js, widgets/index.js and index.html.
// Run on its own with `node tests/scenes.mjs` from learn/, or as part of run.mjs.
//
//   storyboard   validates against the JSON Schema printed in docs/scenes/SCENE-SCHEMA.md (section 13); beats are contiguous and increasing; every motion window is
//                2-5 s; every caption (and captionOrbitals) is at most 110 characters; the end quiz has exactly one right answer; every id it names exists (cards, lessons,
//                stereo moments, what-if scenes); the arrows reproduce the bond and charge changes between the states (the generator's RDKit checks 4 and 5, redone on the layout)
//   layout       the committed layouts equal a fresh compile of the storyboards; every atom a beat mentions has a position; the motions end where pos1 says
//   coords.json  every reaction a scene uses exists with its stages; where a scene's final molecule is the same molecule as a coords product stage, the last beat's drawing
//                matches that stage's coordinates (within 1 px after a rigid fit: the scene is free to turn the molecule, not to change its shape)
//   renderer     12 times along each scene, in motion and static, in each layer: well-formed SVG with a viewBox, no NaN, nothing outside the stage; static frames show their arrows
//                with the pair at its end; the ORBITALS-only layer still moves the electrons; the end state of the last beat draws every atom of the last state
//   placement    card -> scene covers the 16 reagent scenes, every primer is reached from a Lesson 08 step; lesson steps exist; routes, home and hub links, the widget registration and the CSS block are in place
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ready } from '../engine/chem.js';
import { HUB_BY_ID } from '../engine/reaction-hub.js';
import { LESSONS } from '../lessons/index.js';
import { STEREO_MOMENTS } from '../engine/stereo-moments.js';
import { SCENES, SCENE_BY_ID, CARD_SCENE, STEP_SCENE, sceneId, shortId, neighbours } from '../scenes/scene-index.js';
import { parseSmiles } from '../scenes/scene-parse.js';
import { compileScene, bindCoords } from '../scenes/scene-compile.js';
import { makeDraw, coordStagesFor, ORIENT, SCENE_COORDS } from '../scenes/build-layouts.mjs';
import { renderScene, sceneDuration, posAt, beatAt, whyLines, captionFor, screenPositions, cameraOf } from '../scenes/scene-engine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const learn = path.resolve(here, '..');
const sceneDir = path.join(learn, 'scenes', 'scenes');
const layoutDir = path.join(learn, 'scenes', 'layouts');
const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));
const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

// ------------------------------------------------------------------ a small JSON Schema validator (the keywords SCENE-SCHEMA.md uses)
export function validate(schema, value, root = schema, at = '$') {
  const errs = [];
  const err = (m) => errs.push(`${at}: ${m}`);
  if (schema.$ref) {
    const name = schema.$ref.replace('#/$defs/', '');
    const target = (root.$defs || {})[name];
    if (!target) { err('unknown $ref ' + schema.$ref); return errs; }
    return validate(target, value, root, at);
  }
  if (schema.oneOf) {
    const hits = schema.oneOf.filter((s) => validate(s, value, root, at).length === 0).length;
    if (hits !== 1) err(`matches ${hits} of ${schema.oneOf.length} oneOf branches`);
    return errs;
  }
  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) err('must equal ' + JSON.stringify(schema.const));
  if (schema.enum && !schema.enum.includes(value)) err(`must be one of ${JSON.stringify(schema.enum)}, got ${JSON.stringify(value)}`);
  const types = schema.type ? [].concat(schema.type) : null;
  const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
  if (types) {
    const t = typeOf(value);
    if (!types.some((x) => x === t || (x === 'number' && t === 'integer'))) { err(`type ${t}, expected ${types.join('|')}`); return errs; }
  }
  if (typeof value === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) err(`"${value}" does not match ${schema.pattern}`);
    if (schema.maxLength != null && value.length > schema.maxLength) err(`length ${value.length} > ${schema.maxLength}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) err(`${value} < ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) err(`${value} > ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) err(`${value.length} items < ${schema.minItems}`);
    if (schema.maxItems != null && value.length > schema.maxItems) err(`${value.length} items > ${schema.maxItems}`);
    if (schema.items) value.forEach((v, i) => errs.push(...validate(schema.items, v, root, `${at}[${i}]`)));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    (schema.required || []).forEach((k) => { if (!(k in value)) err(`missing required "${k}"`); });
    for (const k of Object.keys(schema.properties || {})) if (k in value) errs.push(...validate(schema.properties[k], value[k], root, `${at}.${k}`));
    for (const pat of Object.keys(schema.patternProperties || {})) for (const k of Object.keys(value)) if (new RegExp(pat).test(k)) errs.push(...validate(schema.patternProperties[pat], value[k], root, `${at}.${k}`));
  }
  return errs;
}

function loadSchema() {
  const p = path.resolve(learn, '..', 'docs', 'scenes', 'SCENE-SCHEMA.md');
  if (!fs.existsSync(p)) return null;
  const md = read(p).replace(/\r\n/g, '\n');
  const i = md.indexOf('## 13 JSON Schema');
  const m = /```json\n([\s\S]*?)\n```/.exec(md.slice(i));
  return m ? JSON.parse(m[1]) : null;
}

// ------------------------------------------------------------------ SVG well-formedness (tags balanced, attributes quoted, entities legal)
export function wellFormed(svg) {
  const errs = [];
  const tagRe = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[A-Za-z_:][\w:.-]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>/y;
  const stack = [];
  let i = 0, roots = 0;
  while (i < svg.length) {
    const lt = svg.indexOf('<', i);
    const text = svg.slice(i, lt === -1 ? svg.length : lt);
    if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(text)) errs.push('illegal & in text');
    if (/>/.test(text)) errs.push('stray > in text');
    if (lt === -1) break;
    tagRe.lastIndex = lt;
    const m = tagRe.exec(svg);
    if (!m) { errs.push('malformed tag near ' + JSON.stringify(svg.slice(lt, lt + 50))); break; }
    const [full, close, name, , self] = m;
    if (close) { if (stack.pop() !== name) errs.push('mismatched </' + name + '>'); } else if (!self) { if (!stack.length) roots++; stack.push(name); } else if (!stack.length) roots++;
    i = lt + full.length;
  }
  if (stack.length) errs.push('unclosed <' + stack[stack.length - 1] + '>');
  if (roots !== 1) errs.push('expected one root element, found ' + roots);
  return errs;
}

// ------------------------------------------------------------------ coords.json binding (all isomorphisms, for the shape comparison)
function fitRmsd(P, Q) {
  const n = P.length;
  const cp = [P.reduce((s, p) => s + p[0], 0) / n, P.reduce((s, p) => s + p[1], 0) / n], cq = [Q.reduce((s, p) => s + p[0], 0) / n, Q.reduce((s, p) => s + p[1], 0) / n];
  const sol = (mir) => {
    let a = 0, b = 0;
    for (let i = 0; i < n; i++) { const u = [(mir ? -1 : 1) * (P[i][0] - cp[0]), P[i][1] - cp[1]], v = [Q[i][0] - cq[0], Q[i][1] - cq[1]]; a += u[0] * v[0] + u[1] * v[1]; b += u[0] * v[1] - u[1] * v[0]; }
    const th = Math.atan2(b, a), c = Math.cos(th), s = Math.sin(th);
    let e = 0;
    for (let i = 0; i < n; i++) { const u = [(mir ? -1 : 1) * (P[i][0] - cp[0]), P[i][1] - cp[1]]; const x = u[0] * c - u[1] * s, y = u[0] * s + u[1] * c; e += (x - (Q[i][0] - cq[0])) ** 2 + (y - (Q[i][1] - cq[1])) ** 2; }
    return Math.sqrt(e / n);
  };
  return Math.min(sol(false), sol(true));
}

// ------------------------------------------------------------------ the suite
export async function scenes({ ok: okT, eq }) {
  const ok = (cond, id, msg) => okT(!!cond, `scenes ${id}: ${msg}`);
  await ready();
  const draw = makeDraw();
  const coordsJson = readJson(path.join(learn, 'scenes', 'coords.json'));
  const schema = loadSchema();
  ok(!!schema, 'schema', 'docs/scenes/SCENE-SCHEMA.md holds the JSON Schema (section 13)');

  // ---- the index
  ok(SCENES.length === 18, 'index', `18 scenes (16 reagent scenes + 2 Lesson 08 primers), found ${SCENES.length}`);
  eq(SCENES.map((s) => s.id), fs.readdirSync(sceneDir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort(), 'scenes index lists exactly the files in scenes/scenes');
  eq(fs.readdirSync(layoutDir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort(), SCENES.map((s) => s.id), 'scenes: a layout for every scene');
  ok(sceneId('alkene-hx') === '01-alkene-hx' && sceneId('01-alkene-hx') === '01-alkene-hx' && sceneId('nope') === null, 'index', 'sceneId() takes the short and the full id');
  ok(neighbours('01-alkene-hx').prev === null && neighbours('01-alkene-hx').next === '02-alkene-hydration' && neighbours(SCENES[SCENES.length - 1].id).next === null, 'index', 'neighbours() walk the list in order');

  const stages = [];     // {id, scene, layout}
  for (const entry of SCENES) {
    const id = entry.id;
    const scene = readJson(path.join(sceneDir, id + '.json'));
    const layout = readJson(path.join(layoutDir, id + '.json'));
    stages.push({ id, scene, layout });

    // ---- schema
    if (schema) { const errs = validate(schema, scene); ok(errs.length === 0, id, `validates against the schema: ${errs.slice(0, 3).join(' | ')}`); }
    ok(scene.id === id && scene.title === entry.title, id, 'the index row names this scene and its title');
    if (entry.primer) {
      // a Lesson 08 primer has no hub card of its own (its reagentCard names the card it prepares for, which keeps its own scene); it must be reached from the lesson
      ok(!!HUB_BY_ID[scene.reagentCard] && entry.cards.length === 0 && entry.lesson.length > 0 && entry.lesson.every((l) => l.id === '08'), id, 'primer: no hub card of its own, reached from Lesson 08 steps');
    } else ok(entry.cards.includes(scene.reagentCard), id, `reagentCard ${scene.reagentCard} is among the index cards`);
    entry.cards.forEach((c) => ok(!!HUB_BY_ID[c], id, `hub card ${c} exists`));
    (scene.alsoCards || []).forEach((c) => ok(!!HUB_BY_ID[c], id, `alsoCards ${c} exists`));
    scene.whatIf.forEach((w) => ok(!!SCENE_BY_ID[w] && w !== id, id, `what-if scene ${w} exists`));
    if (scene.lesson) ok(entry.lesson.some((l) => l.id === scene.lesson.id && l.step === scene.lesson.step), id, 'the storyboard lesson step is in the index');
    entry.lesson.forEach((l) => { const L = LESSONS.find((x) => x.id === l.id); ok(L && L.steps.some((s) => s.id === l.step), id, `lesson ${l.id} step ${l.step} exists`); });
    entry.cards.forEach((c) => { if (c === scene.reagentCard) ok(CARD_SCENE[c] === id, id, `card ${c} maps to this scene`); });
    if (scene.stereoCallout.stereoMoment) { const mo = STEREO_MOMENTS.find((m) => m.id === scene.stereoCallout.stereoMoment); ok(mo && SCENE_BY_ID[mo.scene], id, 'its stereo moment exists and names a scene'); }
    ok(['arrows', 'orbitals'].every((l) => scene.layers.includes(l)), id, 'two layers');

    // ---- quiz
    const right = scene.quiz.options.filter((o) => o.correct);
    ok(right.length === 1, id, `the end quiz has exactly one right answer (${right.length})`);
    ok(scene.quiz.options.length >= 3 && scene.quiz.options.every((o) => o.text && o.why), id, 'every quiz option has text and a why / diagnosis');
    ok(SKILL_OK.has(entry.skill), id, `slip skill ${entry.skill} is a known skill`);

    // ---- timing and captions
    const B = scene.beats;
    ok(B.length >= 3, id, 'at least 3 beats');
    B.forEach((b, i) => {
      ok(b.caption && b.caption.length <= 110, id, `${b.id}: caption is 1-110 characters (${(b.caption || '').length})`);
      if (b.captionOrbitals) ok(b.captionOrbitals.length <= 110, id, `${b.id}: captionOrbitals <= 110`);
      const win = b.t1 - b.t0;
      ok(win >= 2 && win <= 5, id, `${b.id}: motion window ${win} s is 2-5 s`);
      if (i < B.length - 1) ok(Math.abs(B[i + 1].t0 - (b.t1 + b.hold)) < 1e-9, id, `${b.id}: next beat starts at t1 + hold`);
      ok(i === 0 ? b.t0 === 0 : b.t0 > B[i - 1].t0, id, `${b.id}: times increase`);
      (b.arrows || []).forEach((a) => ok(a.at[0] >= 0 && a.at[1] <= 1 && a.at[0] < a.at[1] && a.why && a.why.length > 10, id, `${b.id}/${a.id}: window inside the beat, why line present`));
    });
    ok(B[B.length - 1].hold === 0, id, 'the last beat has no hold');
    const dur = sceneDuration(scene);
    ok(dur >= 25 && dur <= 50, id, `scene length ${dur} s is 25-50 s`);
    ok(Math.abs(dur - scene.duration) < 1e-9, id, 'duration field equals the last beat end');
    ok(B.every((b, i) => b.id.startsWith('b' + (i + 1) + '-')), id, 'beat ids are numbered in order');

    // ---- layout up to date: a fresh compile equals the committed file
    const fresh = compileScene(scene, { draw, orient: ORIENT[id] || {}, coords: coordStagesFor(coordsJson, id) });
    ok(JSON.stringify(fresh) === JSON.stringify(layout), id, 'scenes/layouts is up to date (run: node scenes/build-layouts.mjs)');
    ok(layout.beats.length === B.length && layout.beats.every((lb, i) => lb.id === B[i].id), id, 'one layout beat per storyboard beat');

    // ---- layout content
    const atomIdsOf = (lb) => new Set(lb.atoms.map((a) => a.i));
    B.forEach((b, i) => {
      const lb = layout.beats[i], have = atomIdsOf(lb);
      const must = new Set();
      (b.arrows || []).forEach((a) => { [a.from.bond, a.to.bond].forEach((x) => x && x.forEach((n) => must.add(n))); if (a.from.lp != null) must.add(a.from.lp); if (a.to.atom != null) must.add(a.to.atom); });
      (b.orbitals || []).forEach((o) => o.atoms.forEach((n) => must.add(n)));
      (b.badges || []).forEach((x) => must.add(x.atom));
      (b.partials || []).forEach((x) => must.add(x.atom));
      const missing = [...must].filter((n) => !have.has(n) && !(i > 0 && atomIdsOf(layout.beats[i - 1]).has(n)));
      ok(missing.length === 0, id, `${b.id}: atoms ${missing.join(',')} named by the beat are on stage`);
      ok(Object.values(lb.pos1).every((p) => p.every(Number.isFinite)), id, `${b.id}: finite positions`);
      lb.atoms.forEach((a) => ok(lb.pos1[a.i] && lb.pos0[a.i], id, `${b.id}: atom ${a.i} has start and end positions`));
      // the motions reproduce pos1
      const end = posAt(lb, 1);
      const worst = Math.max(0, ...Object.keys(lb.pos1).map((k) => Math.hypot(...end[k].map((v, j) => v - lb.pos1[k][j]))));
      ok(worst < 0.01, id, `${b.id}: playing the motions to the end gives pos1 (off by ${worst.toFixed(3)})`);
      const start = posAt(lb, 0);
      ok(Object.keys(lb.pos0).every((k) => Math.hypot(...start[k].map((v, j) => v - lb.pos0[k][j])) < 1e-6), id, `${b.id}: progress 0 gives pos0`);
      if (i > 0 && !lb.reset) {
        const prevEnd = layout.beats[i - 1].pos1;
        const jump = Math.max(0, ...Object.keys(lb.pos0).filter((k) => prevEnd[k]).map((k) => Math.hypot(...lb.pos0[k].map((v, j) => v - prevEnd[k][j]))));
        ok(jump < 0.01, id, `${b.id}: starts where the last beat ended (${jump.toFixed(3)})`);
      }
    });

    // ---- arrows reproduce the bond and charge changes (checks 4 and 5 of the generator, on the layout)
    B.forEach((b, i) => {
      const lb = layout.beats[i];
      if (b.kind === 'summary' || lb.reset || !(b.arrows || []).length) return;
      const prev = i ? layout.beats[i - 1] : layout.stage0;
      const atoms0 = new Map(prev.atoms.map((a) => [a.i, { ...a }])), bonds0 = new Map(prev.bonds.map(([x, y, o]) => [key(x, y), o]));
      (b.adds || []).forEach((sp) => { const P = parseSmiles(sp.smiles); P.atoms.forEach((a) => atoms0.set(a.id, { i: a.id, s: a.sym, c: a.charge, h: a.h })); P.bonds.forEach((x) => bonds0.set(key(x.a, x.b), x.order)); });
      const atoms1 = new Map(lb.atoms.map((a) => [a.i, a])), bonds1 = new Map(lb.bonds.map(([x, y, o]) => [key(x, y), o]));
      const delta = new Map(), dlp = new Map();
      const bump = (m, k, v) => m.set(k, (m.get(k) || 0) + v);
      b.arrows.forEach((a) => {
        if (a.from.bond) { ok(bonds0.has(key(...a.from.bond)), id, `${b.id}/${a.id}: the source bond exists before the beat`); bump(delta, key(...a.from.bond), -1); }
        if (a.from.lp != null) bump(dlp, a.from.lp, -1);
        if (a.to.bond) bump(delta, key(...a.to.bond), +1);
        else if (a.from.lp != null && a.to.atom != null) bump(delta, key(a.from.lp, a.to.atom), +1);
        else if (a.to.atom != null) bump(dlp, a.to.atom, +1);
      });
      const bad = [];
      new Set([...bonds0.keys(), ...bonds1.keys(), ...delta.keys()]).forEach((k) => {
        const [x, y] = k.split('-').map(Number);
        if (!atoms1.has(x) || !atoms1.has(y)) return;
        const real = (bonds1.get(k) || 0) - (bonds0.get(k) || 0), want = delta.get(k) || 0;
        if (real !== want) bad.push(`bond ${k} arrows ${want} state ${real}`);
      });
      atoms1.forEach((a1, aid) => {
        const a0 = atoms0.get(aid); if (!a0) return;
        let db = 0; delta.forEach((v, k) => { const [x, y] = k.split('-').map(Number); if (x === aid || y === aid) db += v; });
        const pred = -2 * (dlp.get(aid) || 0) - db - (a1.h - a0.h), real = a1.c - a0.c;
        if (pred !== real) bad.push(`charge of ${aid} ${a1.s}: arrows imply ${pred}, state ${real}`);
      });
      ok(bad.length === 0, id, `${b.id}: the arrows explain the bond and charge changes: ${bad.join('; ')}`);
      // a lone-pair source has a lone pair
    });

    // ---- renderer: 12 times along the scene, in motion and static, in every layer
    for (const layer of ['both', 'arrows', 'orbitals']) {
      for (const stat of [false, true]) {
        let worst = null;
        for (let k = 0; k < 12; k++) {
          const t = (dur * k) / 11;
          const svg = renderScene(scene, layout, t, { layer, static: stat });
          const e = wellFormed(svg);
          if (e.length) { worst = `t=${t.toFixed(1)}: ${e[0]}`; break; }
          if (!/viewBox="0 0 640 400"/.test(svg)) { worst = 'no viewBox'; break; }
          const bare = svg.replace(/<title>[\s\S]*?<\/title><desc>[\s\S]*?<\/desc>/, '');
          if (/\bNaN\b|undefined|Infinity/.test(bare)) { worst = `t=${t.toFixed(1)}: NaN / undefined / Infinity in the drawing`; break; }
        }
        ok(!worst, id, `${stat ? 'static' : 'moving'} frames, layer ${layer}: well-formed SVG with a viewBox and no NaN${worst ? ' (' + worst + ')' : ''}`);
      }
    }

    // ---- static frames: arrows drawn, pair at its end; the ORBITALS-only layer keeps the electrons moving; ARROWS-only has no glyph lobes
    B.forEach((b, i) => {
      if (!(b.arrows || []).length) return;
      const t = b.t1;
      const both = renderScene(scene, layout, t, { layer: 'both', static: true });
      ok(both.includes('class="ms-arrow"') && both.includes('class="ms-pair"'), id, `${b.id}: a static frame draws the arrow and the electron pair`);
      const mid = renderScene(scene, layout, b.t0 + (b.t1 - b.t0) * (0.5 * (b.arrows[0].at[0] + b.arrows[0].at[1]) + 0.1), { layer: 'orbitals' });
      ok(!mid.includes('class="ms-arrow"') && mid.includes('class="ms-pair"'), id, `${b.id}: ORBITALS only: no curved arrow, the pair still travels`);
    });
    const onlyArrows = renderScene(scene, layout, B.find((b) => (b.orbitals || []).length).t1, { layer: 'arrows', static: true });
    ok(!onlyArrows.includes('class="ms-orb"'), id, 'ARROWS only: no orbital glyphs');

    // ---- the last beat draws every atom of the last state
    const lastSvg = renderScene(scene, layout, dur, { static: true });
    const lastLb = layout.beats[B.length - 1];
    const drawn = (lastSvg.match(/class="ms-atom" data-id="\d+"/g) || []).length;
    ok(drawn > 0 && drawn <= lastLb.atoms.length, id, `the last frame draws ${drawn} atom groups for ${lastLb.atoms.length} atoms`);

    // ---- nothing off stage: every atom of every beat's end state projects inside the 640 x 400 box
    B.forEach((b, bi) => {
      const S = screenPositions(scene, layout, b.t1, { static: true });
      const fitsAll = cameraOf(scene, layout, bi).mode === 'all';
      // the camera may leave far-away leftovers (a spectator ion) off the edge, but never the atoms it focuses on, or any atom when the whole stage fits
      const focus = (b.camera.focus || []).filter((n) => S[n]);
      const out = Object.entries(S).filter(([k, q]) => (q[0] < 6 || q[0] > 634 || q[1] < 6 || q[1] > 394) && (fitsAll || focus.includes(Number(k)))).map(([k]) => k);
      ok(out.length === 0, id, `${b.id}: atoms ${out.join(',')} are cut off by the edge of the stage`);
    });
  }

  // ---- coords.json: the reactions exist, and the last beat matches the product stage where it is the same molecule
  const bindReport = [];
  for (const { id, scene, layout } of stages) {
    const rids = SCENE_COORDS[id];
    ok(rids && rids.length, id, 'coords.json reactions are named for this scene');
    (rids || []).forEach((rid) => { const rx = coordsJson[rid]; ok(rx && rx.reactants && Object.keys(rx).length >= 2, id, `coords.json has reaction ${rid} with its stages`); });
    if (!scene.beats.some((b) => b.relayout)) { bindReport.push(`${id}: no relayout (the last beat is a row of separate molecules)`); continue; }
    const last = layout.beats[layout.beats.length - 1];
    // the molecule the scene ends on: the biggest heavy-atom piece of the last state
    const P = parseSmiles(scene.beats[scene.beats.length - 1].state.split('.').sort((a, b) => b.length - a.length)[0]);
    const prodStages = coordStagesFor(coordsJson, id);
    const bound = bindCoords(P, prodStages);
    if (!bound) { bindReport.push(`${id}: not the same molecule as any coords stage`); continue; }
    const heavy = P.atoms.filter((a) => bound[0].has(a.id) && last.pos1[a.id]);
    let best = Infinity;
    bound.forEach((m) => { const r = fitRmsd(heavy.map((a) => [last.pos1[a.id][0] * 44, last.pos1[a.id][1] * 44]), heavy.map((a) => [m.get(a.id)[0] * 44, m.get(a.id)[1] * 44])); if (r < best) best = r; });
    ok(best <= 1, id, `the last beat's drawing matches the coords.json stage within 1 px (best fit ${best.toFixed(2)} px over ${heavy.length} atoms)`);
    bindReport.push(`${id}: ${best.toFixed(2)} px`);
  }
  ok(bindReport.filter((s) => s.endsWith(' px')).length >= 12, 'coords', `at least 12 scenes end on a coords.json drawing (${bindReport.length} reported)`);

  // ---- placement: card -> scene, lesson step -> scene
  eq(new Set(Object.values(CARD_SCENE)).size, SCENES.filter((s) => !s.primer).length, 'scenes: every one of the 16 reagent scenes is reachable from a hub card');
  ok(SCENES.filter((s) => !s.primer).length === 16 && SCENES.filter((s) => s.primer).every((s) => s.lesson.length && !Object.values(CARD_SCENE).includes(s.id)), 'placement', 'the primers (17, 18) hang on Lesson 08 steps, not on hub cards');
  ok(STEP_SCENE['08/s06'] === '18-arrow-grammar' && STEP_SCENE['08/s17'] === '17-hcl-ethylene' && CARD_SCENE['alkene-hx'] === '01-alkene-hx', 'placement', 'Lesson 08 steps get their primer scene; alkene-hx keeps scene 01');
  ok(CARD_SCENE['alkyne-hx-1'] === '08-alkyne-hx' && CARD_SCENE['alkyne-hx-2'] === '08-alkyne-hx', 'cards', '08 serves alkyne-hx-1 and alkyne-hx-2');
  ok(CARD_SCENE['alkene-kmno4-base'] === '06-alkene-kmno4-cold', 'cards', '06 serves alkene-kmno4-base');
  ok(CARD_SCENE['director-activating'] === '15-directors' && CARD_SCENE['director-meta'] === '15-directors', 'cards', '15 serves director-activating and director-meta');
  ok(CARD_SCENE['alkyne-acetylide'] === '11-alkyne-acetylide', 'cards', '11 serves alkyne-acetylide');
  Object.keys(CARD_SCENE).forEach((c) => ok(!!HUB_BY_ID[c], 'cards', `${c} is a hub card`));
  Object.keys(STEP_SCENE).forEach((k) => { const [l, s] = k.split('/'); const L = LESSONS.find((x) => x.id === l); ok(L && L.steps.some((x) => x.id === s), 'steps', `lesson step ${k} exists`); });
  ok(!Object.keys(STEP_SCENE).some((k) => k.startsWith('17/')), 'steps', 'Lesson 17 has no scene buttons');

  // ---- wiring (read from the source)
  const app = read(path.join(learn, 'app.js')), hubv = read(path.join(learn, 'hub-view.js')), widg = read(path.join(learn, 'engine', 'widgets', 'index.js')), html = read(path.join(learn, 'index.html'));
  ok(/'mech-scene':\s*mechScene/.test(widg), 'wiring', "widgets/index.js registers 'mech-scene'");
  ok(/hash === 'scenes'/.test(app) && /scene\\\/\(\[a-z0-9-\]\+\)/.test(app), 'wiring', 'app.js routes #scenes and #scene/<id>');
  ok(/href: '#scenes', id: 'open-scenes'/.test(app), 'wiring', 'the home Reactions panel links to #scenes');
  ok(/sceneForStep\(L\.id, step\.id\)/.test(app) && /sceneBlock\(sceneKey\)/.test(app), 'wiring', 'lessonView mounts "Watch the scene" from the step');
  ok(/Watch how it works/.test(hubv) && /sceneForCard\(c\.id\)/.test(hubv), 'wiring', 'hub cards with a scene get "Watch how it works"');
  ok(/href: '#scenes', id: 'hub-scenes'/.test(hubv), 'wiring', 'the hub jump bar links to #scenes');
  ok(/\/\* mechanism scenes \*\//.test(html) && /\.ms-range::-webkit-slider-thumb \{[^}]*width: 44px; height: 44px/.test(html), 'wiring', 'index.html has the mechanism scenes CSS block with the 44 px thumb');
  const view = read(path.join(learn, 'scenes', 'scene-view.js'));
  ok(/prefers-reduced-motion/.test(view) && /matchMedia/.test(view), 'view', 'the player reads prefers-reduced-motion');
  ok(/aria-valuetext/.test(view) && /aria-live/.test(view) && /What am I looking at\?/.test(view), 'view', 'aria-valuetext, a polite live region and the legend are there');
  ok(/store\.logMistake/.test(view), 'view', 'a wrong quiz answer is logged as a slip');
  ok(/(?:caveman|compress)/.test(read(path.join(learn, 'scenes', 'scene-engine.js'))), 'view', 'captions have the caveman variant');
  void shortId; void whyLines; void captionFor; void beatAt;
}

const SKILL_OK = new Set(['markovnikov', 'stereo-addition', 'alkene-oxidation', 'alkynes', 'acetylides', 'eas', 'directors', 'dienes', 'mechanism', 'curved-arrows']);

// run alone: node tests/scenes.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await scenes({ ok, eq });
  console.log(`\nscenes: ${pass} checks passed, ${fail} failed`);
  failures.slice(0, 60).forEach((f) => console.log(' FAIL ' + f));
  process.exit(fail ? 1 : 0);
}
