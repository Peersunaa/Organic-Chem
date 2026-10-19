// Past-paper walkthrough checks (data/pastpaper.js, pastpaper-view.js, route #pastpaper, the home "Past papers" panel).
//  (1) every item has every field (id, title, source, ask, steps, links); ids are unique and sit under their section; `ask` is one sentence of at most 200 characters;
//  (2) every lesson link points at a real lesson step; every hub link (#reactions/<card-id>) points at a real hub card;
//  (3) scope: only A1, A2, A3, A5, B1, B2, B3, B4, B6, in that order; nothing from A4, B5 or the SN2 / synthesis questions of A5; B3.1 has one item per reaction type, each linked to its card;
//  (4) the router, the hub anchor, the home panel and the CSS block are in place (read from the source).
// Run on its own with `node learn/tests/pastpaper.mjs`, or as part of run.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import { HUB_BY_ID } from '../engine/reaction-hub.js';
import { PASTPAPER, PASTPAPER_ORDER } from '../data/pastpaper.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

export async function pastpaper({ ok, eq }) {
  // ---- (3) scope and order
  eq(PASTPAPER.map((s) => s.id), ['A1', 'A2', 'A3', 'A5', 'B1', 'B2', 'B3', 'B4', 'B6'], 'sections appear in the midterm order');
  eq(PASTPAPER_ORDER, PASTPAPER.map((s) => s.id), 'PASTPAPER_ORDER matches the sections');
  ok(!PASTPAPER.some((s) => ['A4', 'B5'].includes(s.id)), 'no A4 or B5 section');

  const seen = new Set(); let count = 0;
  for (const sec of PASTPAPER) {
    ok(nonEmpty(sec.title) && nonEmpty(sec.blurb), `${sec.id}: title and blurb`);
    ok(Array.isArray(sec.items) && sec.items.length > 0, `${sec.id}: has items`);
    for (const it of sec.items) {
      count++;
      const id = it.id;
      // ---- (1) fields
      ok(nonEmpty(id) && id.startsWith(sec.id + '.'), `${id}: id sits under section ${sec.id}`);
      ok(!seen.has(id), `${id}: id is unique`); seen.add(id);
      ok(nonEmpty(it.title), `${id}: title`);
      ok(nonEmpty(it.source), `${id}: source`);
      ok(nonEmpty(it.ask) && it.ask.length <= 200, `${id}: ask is there and at most 200 characters (${(it.ask || '').length})`);
      ok(!/[.?!]\s+\S/.test(it.ask || ''), `${id}: ask is one sentence`);
      ok(Array.isArray(it.steps) && it.steps.length >= 3 && it.steps.length <= 6 && it.steps.every(nonEmpty), `${id}: 3 to 6 steps`);
      ok(!it.steps.some((s) => /^\s*\d+[.)]/.test(s)), `${id}: steps are not numbered by hand (the list numbers them)`);
      ok(it.trap === undefined || nonEmpty(it.trap), `${id}: trap is a line or absent`);
      ok(Array.isArray(it.links) && it.links.length >= 1 && it.links.every((l) => nonEmpty(l.label) && nonEmpty(l.href)), `${id}: links have a label and an href`);
      // ---- (2) links resolve
      for (const l of it.links || []) {
        let m;
        if ((m = /^#lesson-(\d\d)\/(s\d\d)$/.exec(l.href))) {
          const L = LESSONS.find((x) => x.id === m[1]);
          ok(!!L && L.steps.some((s) => s.id === m[2]), `${id}: lesson link ${l.href} resolves to a real step`);
          if (L) ok(l.label === `Lesson ${Number(m[1])}, step ${Number(m[2].slice(1))}`, `${id}: label of ${l.href} matches`);
        } else if ((m = /^#reactions\/([a-z0-9-]+)$/.exec(l.href))) {
          ok(!!HUB_BY_ID[m[1]], `${id}: hub link ${l.href} resolves to a real card`);
        } else ok(false, `${id}: link ${l.href} has an unknown form`);
      }
      // ---- (3) nothing from the excluded questions
      ok(!/^(A4|B5)\./.test(id), `${id}: not from A4 or B5`);
    }
  }
  const a5 = PASTPAPER.find((s) => s.id === 'A5');
  eq(a5.items.map((i) => i.id), ['A5.1'], 'A5 holds the HBr item only (no SN2, acid/base or synthesis)');
  ok(!PASTPAPER.some((s) => s.items.some((i) => /SN2|SN₂|NaHCO/.test(i.title))), 'no SN2 or acid/base title');
  ok(count >= 30, `the walkthrough has ${count} items`);

  // B3.1: one item per reaction type, each linked to its hub card
  const b3 = PASTPAPER.find((s) => s.id === 'B3');
  ok(b3.items.length >= 11, 'B3.1 has one item per reaction type (11 or more)');
  ok(b3.items.every((i) => /^B3\.1\.\d+$/.test(i.id)), 'B3 items are B3.1.1, B3.1.2, ...');
  ok(b3.items.every((i) => i.links.some((l) => l.href.startsWith('#reactions/'))), 'every B3.1 item links to a hub card');
  const need = ['eas-bromination', 'amine-in-acid', 'desulfonation', 'benzylic-bromination', 'alkyne-hydroboration', 'clemmensen', 'oxidation-cr', 'oxidation-pcc', 'diels-alder', 'alkyne-hydration', 'birch', 'eas-sulfonation'];
  for (const c of need) ok(b3.items.some((i) => i.links.some((l) => l.href === '#reactions/' + c)), `B3.1 covers the ${c} card`);

  // ---- (4) router, hub anchor, home panel, CSS (read from the source)
  const app = fs.readFileSync(path.join(HERE, '..', 'app.js'), 'utf8');
  ok(/hash === 'pastpaper'/.test(app) && /buildPastpaper\(/.test(app), 'router serves #pastpaper with the past-paper view');
  ok(/\^reactions\\\/\(\[a-z0-9-\]\+\)\$/.test(app) && /hub\(m\[1\]\)/.test(app), 'router accepts #reactions/<card-id>');
  ok(/Past papers, by topic/.test(app) && /id: 'open-pastpaper'/.test(app) && /href: '#pastpaper'/.test(app), 'home screen has a Past papers panel linking to #pastpaper');
  ok(/id: 'pp-reactions'/.test(app) && /id: 'pp-drill'/.test(app), 'the past-paper page has a Reactions and a Drill button');
  const hubView = fs.readFileSync(path.join(HERE, '..', 'hub-view.js'), 'utf8');
  ok(/buildHub\(ready, anchor\)/.test(hubView) && /scrollIntoView/.test(hubView) && /'#rx-' \+ anchor/.test(hubView), 'hub view scrolls to the card named by the anchor');
  const view = fs.readFileSync(path.join(HERE, '..', 'pastpaper-view.js'), 'utf8');
  ok(/Steps to answer/.test(view) && /innerWidth >= 700/.test(view) && /it\.trap/.test(view), 'past-paper view has collapsible steps (open on desktop) and the trap line');
  const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
  ok((html.match(/\/\* past papers \*\//g) || []).length === 1, 'index.html has one "/* past papers */" CSS block');
  const ppCss = html.slice(html.indexOf('/* past papers */'), html.indexOf('</style>'));
  ok(!/#[0-9a-fA-F]{3,6}\b/.test(ppCss), 'past-paper CSS uses the existing colour tokens only (no hex colours)');
  ok(!/@import|font-family\s*:\s*['"]/.test(ppCss), 'past-paper CSS adds no new fonts');
  return { items: count };
}

// run alone: node learn/tests/pastpaper.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  const r = await pastpaper({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed; ${r.items} items`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
