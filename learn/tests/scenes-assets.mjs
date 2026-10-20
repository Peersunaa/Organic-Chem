// node tests/scenes-assets.mjs  (from learn/)  - checks the scene groundwork: scenes/coords.json and scenes/glyphs.js.
// Not wired into run.mjs on purpose; run it on its own.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ready, rdkit } from '../engine/chem.js';
import * as G from '../scenes/glyphs.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const coords = JSON.parse(fs.readFileSync(path.join(here, '../scenes/coords.json'), 'utf8'));

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.log('FAIL: ' + msg); } };

// every reaction and stage the storyboards need
const REQUIRED = {
  'alkene-hx': ['reactants', 'carbocation', 'product'],
  'alkene-hydration': ['reactants', 'carbocation', 'oxonium', 'product'],
  'alkene-x2': ['reactants', 'bromonium', 'product'],
  'alkene-h2-pd': ['reactants', 'adsorbed', 'product'],
  'alkene-epoxide': ['reactants', 'product'],
  'alkene-kmno4-base': ['reactants', 'manganate-ester', 'product'],
  'alkene-hydroboration': ['reactants', 'organoborane', 'product'],
  'alkyne-hx': ['reactants', 'vinyl-cation', 'bromoalkene', 'carbocation-2', 'dibromide'],
  'alkyne-hydration': ['reactants', 'enol', 'ketone'],
  'alkyne-lindlar': ['reactants', 'adsorbed', 'product'],
  'alkyne-acetylide': ['reactants', 'acetylide', 'product'],
  'eas-bromination': ['reactants', 'sigma-1', 'sigma-2', 'sigma-3', 'product'],
  'eas-nitration': ['reactants', 'sigma-1', 'sigma-2', 'sigma-3', 'product'],
  'fc-acylation': ['reactants', 'acylium', 'sigma-1', 'sigma-2', 'sigma-3', 'product'],
  'director-anisole': ['reactants', 'ortho-1', 'ortho-2', 'ortho-3', 'ortho-oxo', 'para-1', 'para-2', 'para-3', 'para-oxo', 'meta-1', 'meta-2', 'meta-3', 'product-ortho', 'product-para', 'product-meta'],
  'director-nitrobenzene': ['reactants', 'meta-1', 'meta-2', 'meta-3', 'product-meta', 'ortho-bad', 'para-bad'],
  'diels-alder': ['reactants', 'product']
};
const MAX_DRIFT = 6;

await ready();
const R = rdkit();

let nStages = 0, maxDrift = 0, worst = '';
for (const [rid, stageNames] of Object.entries(REQUIRED)) {
  const rx = coords[rid];
  ok(!!rx, `coords.json has reaction ${rid}`);
  if (!rx) continue;
  for (const nm of stageNames) {
    const st = rx[nm];
    ok(!!st, `${rid}/${nm} exists`);
    if (!st) continue;
    nStages++;
    // the SMILES parses (explicit H kept), and atoms[] is the parse order of that SMILES
    const m = R.get_mol(st.smiles, JSON.stringify({ removeHs: false }));
    ok(!!m, `${rid}/${nm} SMILES parses: ${st.smiles}`);
    if (m) {
      try {
        const n = JSON.parse(m.get_json()).molecules[0].atoms.length;
        ok(n === st.atoms.length, `${rid}/${nm} atom count ${st.atoms.length} == parsed ${n}`);
      } finally { m.delete(); }
    }
    // geometry sanity
    for (const a of st.atoms) {
      ok(a.x > 0 && a.x < 640 && a.y > 0 && a.y < 400, `${rid}/${nm} atom ${a.idx} (${a.sym}${a.map}) inside 640x400: ${a.x},${a.y}`);
    }
    for (const b of st.bonds) ok(b.a < st.atoms.length && b.b < st.atoms.length && [1, 2, 3].includes(b.order), `${rid}/${nm} bond ${b.a}-${b.b} valid`);
    // map: reactant idx -> this idx, same element
    const r0 = rx.reactants;
    for (const [ri, ti] of Object.entries(st.map)) {
      ok(r0.atoms[+ri].sym === st.atoms[ti].sym, `${rid}/${nm} map ${ri}->${ti} keeps the element`);
    }
    // atoms that are not movers keep their position relative to the stage they inherit from
    if (st.from) {
      const src = rx[st.from];
      ok(!!src, `${rid}/${nm} from=${st.from} exists`);
      if (src) {
        const byMap = new Map(src.atoms.map((a) => [a.map, a]));
        for (const a of st.atoms) {
          if (a.mv || !byMap.has(a.map)) continue;
          const o = byMap.get(a.map);
          const d = Math.hypot(a.x - o.x, a.y - o.y);
          if (d > maxDrift) { maxDrift = d; worst = `${rid}/${nm} map ${a.map}`; }
          ok(d < MAX_DRIFT, `${rid}/${nm} atom map ${a.map} drifted ${d.toFixed(1)} px from ${st.from}`);
        }
      }
    }
  }
}

// ---- glyphs
const ALLOWED = new Set(G.GLYPH_VARS);
ok(ALLOWED.size === 5 && ['--accent', '--electron', '--bad', '--muted', '--ink'].every((v) => ALLOWED.has(v)), 'GLYPH_VARS is the five house variables');
const samples = {
  piCloud: [() => G.piCloud(100, 100, 150, 100), () => G.piCloud(100, 100, 150, 80, { side: 'top' }), () => G.piCloud(100, 100, 150, 100, { side: 'bottom' })],
  pOrbital: [() => G.pOrbital(50, 50, -90), () => G.pOrbital(50, 50, 0, { empty: true })],
  lonePair: [() => G.lonePair(50, 50, -90)],
  sigmaStar: [() => G.sigmaStar(50, 50, 100, 50)],
  bromonium: [() => G.bromonium(10, 100, 54, 100, 32, 62)],
  surface: [() => G.surface(300, 400), () => G.surface(300, 400, { x: 100, h: [150, 250, 350] })],
  facesLabel: [() => G.facesLabel(320, 200)],
  electronPair: [() => G.electronPair('M10 10Q60 -20 110 10'), () => G.electronPair('M10 10Q60 -20 110 10', { static: true }), () => G.electronPair('M10 10Q60 -20 110 10', { t: 0.4 })],
  curvedArrow: [() => G.curvedArrow(10, 10, 100, 10, { bulge: 25 }), () => G.curvedArrow(10, 10, 100, 60, { bulge: -25, color: 'accent' })],
  bondGhost: [() => G.bondGhost(10, 10, 60, 10, { state: 'forming' }), () => G.bondGhost(10, 10, 60, 10, { state: 'breaking' }), () => G.bondGhost(10, 10, 60, 10, { static: true })]
};
for (const name of Object.keys(G.GLYPHS)) ok(!!samples[name], `a test sample exists for glyph ${name}`);
for (const [name, fns] of Object.entries(samples)) {
  ok(typeof G[name] === 'function', `glyphs.js exports ${name}`);
  for (const fn of fns) {
    const s = fn();
    ok(typeof s === 'string' && s.includes('<'), `${name} returns an SVG string`);
    const vars = [...s.matchAll(/var\(\s*(--[a-z-]+)/g)].map((x) => x[1]);
    ok(vars.every((v) => ALLOWED.has(v)), `${name} uses only allowed var() names (${[...new Set(vars)].join(', ')})`);
    ok(!/NaN|undefined/.test(s), `${name} output has no NaN/undefined`);
    for (const m of s.matchAll(/stroke-width="([\d.]+)"/g)) ok(parseFloat(m[1]) >= 2, `${name} stroke-width ${m[1]} >= 2`);
  }
}
const animated = G.electronPair('M0 0L10 10');
ok(animated.includes('<animateMotion'), 'electronPair animates by default');
ok(!G.electronPair('M0 0L10 10', { static: true }).includes('animate'), 'electronPair static has no animation');
ok(!G.bondGhost(0, 0, 10, 0, { static: true }).includes('<animate'), 'bondGhost static has no animation');
ok(typeof G.arrowPathD(0, 0, 10, 10, 20) === 'string' && G.arrowPathD(0, 0, 10, 10, 20).startsWith('M'), 'arrowPathD returns a path d');

console.log(`scenes-assets: ${checks - fails}/${checks} checks passed; ${Object.keys(REQUIRED).length} reactions, ${nStages} stages, max drift ${maxDrift.toFixed(2)} px${worst ? ' (' + worst + ')' : ''}; ${Object.keys(G.GLYPHS).length} glyph builders`);
process.exit(fails ? 1 : 0);
