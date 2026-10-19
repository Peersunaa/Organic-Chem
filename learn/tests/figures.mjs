// Crafted-figure checks (learn/figures/*.svg, indexed by learn/figures/figures.js).
// Run on its own with `node tests/figures.mjs` from learn/ (or `node learn/tests/figures.mjs` from the repo root).
// For every figure: the file exists; it is well-formed XML (every tag opened and closed, attributes quoted, entities legal);
// root is <svg> with viewBox "0 0 640 400"; size <= 60 KB; honours reduced motion (a `prefers-reduced-motion: reduce` rule);
// uses only the allowed CSS variables (surface, ink, accent, electron, muted, line); no scripts, raster images or external
// references; no text under 11px; the title and hint are printed inside the card; the index entry is complete.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIGURES } from '../figures/figures.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const learn = path.resolve(here, '..');
const ALLOWED_VARS = new Set(['surface', 'ink', 'accent', 'electron', 'muted', 'line']);
const MAX_BYTES = 60 * 1024;
let failed = 0, checks = 0;
const bad = (id, msg) => { failed++; console.log(`  FAIL ${id}: ${msg}`); };
const ok = (cond, id, msg) => { checks++; if (!cond) bad(id, msg); };

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
  console.log(`${id}  ${f.file}`);
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
console.log(failed ? `\nfigures: ${failed} FAILED of ${checks} checks` : `\nfigures: ${checks} checks, 0 failed`);
process.exit(failed ? 1 : 0);
