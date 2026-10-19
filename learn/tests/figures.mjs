// Crafted-figure checks (learn/figures/*.svg, indexed by learn/figures/figures.js).
// Also checks the wiring (read from the source): each mapped lesson gets the figure card between the recap card and step 1, the hub group headers show ch4/ch5,
// the figure card fetches and inlines the SVG with a text fallback, and hub-view.js renders `draw`.
// Run on its own with `node tests/figures.mjs` from learn/ (or `node learn/tests/figures.mjs` from the repo root), or as part of run.mjs.
// For every figure: the file exists; it is well-formed XML (every tag opened and closed, attributes quoted, entities legal);
// root is <svg> with viewBox "0 0 640 400"; size <= 60 KB; honours reduced motion (a `prefers-reduced-motion: reduce` rule);
// uses only the allowed CSS variables (surface, ink, accent, electron, muted, line); no scripts, raster images or external
// references; no text under 11px; the title and hint are printed inside the card; the index entry is complete.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIGURES } from '../figures/figures.js';
import { HUB_CARDS } from '../engine/reaction-hub.js';
import { LESSONS } from '../lessons/index.js';
import * as store from '../engine/store.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const learn = path.resolve(here, '..');
const ALLOWED_VARS = new Set(['surface', 'ink', 'accent', 'electron', 'muted', 'line']);
const MAX_BYTES = 60 * 1024;
// Strict-enough XML well-formedness: tokenise tags, keep a stack, check names match and attributes are name="value".
function wellFormed(src) {
  const errs = [];
  let s = src.replace(/^﻿/, '');
  s = s.replace(/<\?[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  const tagRe = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[A-Za-z_:][\w:.-]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>/y;
  let i = 0, roots = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    const text = s.slice(i, lt === -1 ? s.length : lt);
    if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(text)) errs.push('illegal & in text near ' + JSON.stringify(text.slice(0, 40)));
    if (/>/.test(text) && stack[stack.length - 1] !== 'style') errs.push('stray > in text near ' + JSON.stringify(text.slice(0, 40)));
    if (lt === -1) { if (text.trim() && !stack.length) errs.push('text after root'); break; }
    if (stack.length === 0 && text.trim()) errs.push('text outside root');
    tagRe.lastIndex = lt;
    const m = tagRe.exec(s);
    if (!m) { errs.push('malformed tag at offset ' + lt + ': ' + JSON.stringify(s.slice(lt, lt + 60))); break; }
    const [full, close, name, attrs, selfClose] = m;
    if (close) {
      if (selfClose) errs.push('closing tag with /: ' + full);
      if (stack.pop() !== name) { errs.push('mismatched closing tag </' + name + '>'); break; }
    } else {
      if (stack.length === 0) roots++;
      if (!selfClose) stack.push(name);
      // duplicate attributes
      const names = [...attrs.matchAll(/\s([A-Za-z_:][\w:.-]*)\s*=/g)].map((a) => a[1]);
      if (new Set(names).size !== names.length) errs.push('duplicate attribute in ' + full.slice(0, 60));
    }
    i = lt + full.length;
    // <style> holds CSS: skip to its closing tag (CSS may contain > and ~)
    if (!close && name === 'style' && !selfClose) {
      const end = s.indexOf('</style>', i);
      if (end === -1) { errs.push('unterminated <style>'); break; }
      i = end;
    }
  }
  if (stack.length) errs.push('unclosed tags: ' + stack.join(','));
  if (roots !== 1) errs.push('expected exactly one root element, found ' + roots);
  return errs;
}

export async function figures({ ok: okT, eq }) {
  const bad = (id, msg) => okT(false, `figures ${id}: ${msg}`);
  const ok = (cond, id, msg) => okT(!!cond, `figures ${id}: ${msg}`);
  // the index
  const ids = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'];
  ok(JSON.stringify(Object.keys(FIGURES)) === JSON.stringify(ids), 'index', 'FIGURES must have exactly ch1..ch6 in order');
  const seenFiles = new Set(), seenLessons = new Map();
  for (const id of ids) {
    const f = FIGURES[id];
    if (!f) continue;
    ok(typeof f.file === 'string' && /^figures\/ch\d-[a-z]+\.svg$/.test(f.file), id, `bad file field ${f.file}`);
    ok(typeof f.title === 'string' && f.title.length >= 8 && f.title.length <= 60, id, 'title missing or over 60 characters');
    ok(typeof f.hint === 'string' && f.hint.length >= 8 && f.hint.length <= 60, id, 'hint missing or over 60 characters (one line)');
    ok(/^\d\d$/.test(f.lesson || ''), id, 'lesson must be a two-digit lesson number string');
    ok(!seenFiles.has(f.file), id, 'duplicate file'); seenFiles.add(f.file);
    seenLessons.set(f.lesson, (seenLessons.get(f.lesson) || 0) + 1);
  }
  ok([...seenLessons.values()].every((n) => n === 1), 'index', 'each figure sits on its own lesson');
  // the lesson number must exist as a lesson file
  const lessonFiles = fs.readdirSync(path.join(learn, 'lessons')).filter((n) => /^\d\d-.*\.js$/.test(n)).map((n) => n.slice(0, 2));
  for (const id of ids) if (FIGURES[id]) ok(lessonFiles.includes(FIGURES[id].lesson), id, `lesson ${FIGURES[id].lesson} has no lesson file`);

  for (const id of ids) {
    const f = FIGURES[id];
    if (!f) continue;
    const fp = path.join(learn, f.file);
    if (!fs.existsSync(fp)) { bad(id, 'file does not exist: ' + f.file); continue; }
    const buf = fs.readFileSync(fp), src = buf.toString('utf8');
    ok(buf.length <= MAX_BYTES, id, `${buf.length} bytes is over the 60 KB limit`);
    const errs = wellFormed(src);
    ok(errs.length === 0, id, 'not well-formed XML: ' + errs.join('; '));
    ok(/^<svg\b/.test(src.trim()), id, 'root must be <svg>');
    ok(/<svg\b[^>]*\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(src), id, 'missing xmlns');
    ok(/<svg\b[^>]*\sviewBox="0 0 640 400"/.test(src), id, 'viewBox must be "0 0 640 400"');
    ok(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation:\s*none/.test(src), id, 'missing the prefers-reduced-motion: reduce rule that stops the animation');
    ok(/@keyframes\s/.test(src) && /animation-name:/.test(src), id, 'expected CSS motion (keyframes) inside the figure');
    // variables: only the allowed names, and every var() has a fallback
    const vars = [...src.matchAll(/var\(\s*--([A-Za-z0-9_-]+)\s*(,[^)]*)?\)/g)];
    ok(vars.length > 0, id, 'uses no CSS variables');
    const badVars = [...new Set(vars.map((v) => v[1]).filter((n) => !ALLOWED_VARS.has(n)))];
    ok(badVars.length === 0, id, 'disallowed CSS variables: ' + badVars.join(', '));
    ok(vars.every((v) => v[2] && v[2].length > 1), id, 'every var() needs a fallback colour');
    ok(!/--[A-Za-z0-9_-]+\s*:/.test(src), id, 'must not declare its own custom properties');
    // self-contained, no raster
    ok(!/<script\b/i.test(src), id, 'no <script> allowed');
    ok(!/<image\b|<foreignObject\b|<iframe\b/i.test(src), id, 'no <image>/<foreignObject>/<iframe>');
    ok(!/data:image|\.png|\.jpe?g|\.webp|\.gif/i.test(src), id, 'no raster images');
    ok(!/(?:href|src)\s*=\s*["'](?!#)/.test(src) && !/url\(\s*["']?(?!#)/.test(src.replace(/@import[^;]*;/g, '')), id, 'no external references (only #fragment urls)');
    ok(!/\son[a-z]+\s*=/i.test(src), id, 'no inline event handlers');
    // text sizes: every font-size in CSS or attributes is >= 11px
    const sizes = [...src.matchAll(/font-size\s*[:=]\s*"?(\d+(?:\.\d+)?)(px)?/g)].map((m) => +m[1]);
    ok(sizes.length > 0 && sizes.every((n) => n >= 11), id, 'text under 11px: ' + sizes.filter((n) => n < 11).join(','));
    // card text: title and hint are inside the figure
    const esc = (t) => t.replace(/&/g, '&amp;');
    ok(src.includes('>' + esc(f.title) + '<'), id, 'title text not printed inside the card');
    ok(src.includes('>' + esc(f.hint) + '<'), id, 'hint text not printed inside the card');
    ok(new RegExp(`id="fig-${id}"`).test(src), id, `root id should be fig-${id}`);
    ok(src.includes('<title>'), id, 'needs a <title> for assistive tech');
    // ids and keyframe names are prefixed so six figures can share one page
    const ids2 = [...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    ok(ids2.every((x) => x.startsWith(`fig-${id}`)), id, 'every id must start with fig-' + id);
    ok(new Set(ids2).size === ids2.length, id, 'duplicate ids');
    const kfs = [...src.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
    ok(kfs.every((x) => x.startsWith(`fig-${id}`)), id, 'every @keyframes name must start with fig-' + id);
    // the CSS is scoped to the figure so it cannot leak into the app
    const sty = (src.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
    const outside = sty.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*\}/g, '').replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*\}/g, '');
    const selectors = outside.split('}').map((r) => r.split('{')[0].trim()).filter(Boolean);
    ok(selectors.every((sel) => sel.split(',').every((x) => x.trim().startsWith('#fig-' + id))), id, 'every CSS selector must be scoped to #fig-' + id);
  }

  // ---- wiring, read from the source
  const app = fs.readFileSync(path.join(learn, 'app.js'), 'utf8');
  const view = fs.readFileSync(path.join(learn, 'hub-view.js'), 'utf8');
  const card = fs.readFileSync(path.join(learn, 'figures', 'figure-card.js'), 'utf8');
  const html = fs.readFileSync(path.join(learn, 'index.html'), 'utf8');
  ok(/figureCard\(figId, \{ key: 'lesson-' \+ L\.id, open: true \}\)/.test(app) && /FIGURES\[k\]\.lesson === L\.id/.test(app), 'wiring', 'lessonView builds the figure card for the lesson that FIGURES maps (open on first visit)');
  const iPre = app.indexOf('recapSlot.append(prereq)'), iFig = app.indexOf('recapSlot.append(figure)'), iRecap = app.indexOf('recapSlot.append(rc)');
  ok(iPre > 0 && iFig > iPre && iRecap > iFig, 'wiring', 'the figure sits after the prerequisite card and before the last-step recap, above step 1 (recapSlot is above the step host)');
  ok(/if \(idx === 0\)/.test(app.slice(iPre - 120, iPre + 20)), 'wiring', 'the figure card is only placed on the first step');
  for (const id of ids) {
    const L = LESSONS.find((l) => l.id === FIGURES[id].lesson);
    ok(!!L, id, `lesson ${FIGURES[id].lesson} exists in LESSONS, so lessonView shows its figure`);
  }
  ok(['01', '03', '04', '09', '13', '15'].every((n) => Object.values(FIGURES).some((f) => f.lesson === n)), 'wiring', 'lessons 01, 03, 04, 09, 13 and 15 each have a figure');
  ok(/GROUP_FIGURE\s*=\s*\{\s*alkene:\s*'ch4',\s*arene:\s*'ch5'\s*\}/.test(view) && /figureCard\(figId, \{ key: 'hub:' \+ figId, open: false \}\)/.test(view), 'wiring', 'hub groups: alkenes show ch4 and aromatics ch5, collapsed by default');
  ok(/fetch\(file\)/.test(card) && /innerHTML = svg/.test(card) && /fig-fallback/.test(card) && /f\.title/.test(card) && /f\.hint/.test(card), 'wiring', 'the figure card fetches and inlines the SVG and falls back to title + hint');
  store.resetAll(); eq(store.getUi('fig:lesson-09'), undefined, 'getUi is undefined before a choice'); store.setUi('fig:lesson-09', false); eq(store.getUi('fig:lesson-09'), false, 'setUi remembers a closed figure'); store.resetAll();
  ok(/store\.getUi\(/.test(card) && /store\.setUi\(/.test(card), 'wiring', 'the open/closed state is remembered in the store');
  ok(/Draw it, step by step/.test(view) && /c\.draw/.test(view) && /hub-draw/.test(view) && /caveman\.draw/.test(view), 'wiring', 'hub-view renders `draw` as an ordered list titled "Draw it, step by step", caveman-aware');
  ok(HUB_CARDS.some((c) => Array.isArray(c.draw) && c.draw.length), 'wiring', 'at least one hub card has a draw list');
  ok(/^<meta charset="utf-8">\s*<title>/.test(html), 'wiring', 'index.html declares utf-8 before the title');
  const gl = fs.readFileSync(path.join(learn, 'engine', 'glossary.js'), 'utf8');
  const mp = fs.readFileSync(path.join(learn, 'engine', 'widgets', 'mechanism-player.js'), 'utf8');
  ok(/\.gl-term::after\{[^}]*min-width:44px;min-height:44px/.test(gl) && /\.gl-term:focus-visible/.test(gl), 'wiring', 'glossary terms have a 44px hit area and a focus-visible ring');
  ok(/annotateLine\(why\)/.test(mp) && /setWhy\(whyText\(/.test(mp), 'wiring', 'the mechanism player makes glossary terms in its why line tappable');
  const gen = fs.readFileSync(path.join(learn, 'engine', 'generators.js'), 'utf8');
  ok(!/skeletal drawings leave out/.test(gen), 'wiring', 'the lesson 1 mastery hints do not use the term "skeletal" before lesson 4 teaches it');
}

// run alone: node tests/figures.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await figures({ ok, eq });
  console.log(`
figures: ${pass} checks passed, ${fail} failed`);
  failures.forEach((f) => console.log(' FAIL ' + f));
  process.exit(fail ? 1 : 0);
}
