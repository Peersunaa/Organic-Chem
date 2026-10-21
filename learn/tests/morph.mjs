// Morph animations (learn/morph/: morphs.json from tools/morph_coords.py, morph.js, morph-ui.js; placed in the tables, the builder / table panel and the hub cards).
//  (1) coverage: every table cell with a product and every productive builder pair has an entry, with a morph for each drawn product; the hub cards' worked
//      examples too; the entries are exactly tools/morph_pairs.mjs's jobs (so the JSON is not stale against the engine)
//  (2) chemistry: each drawing, read back as a molblock (coordinates + wedges) by RDKit, is the engine's substrate / product (canonical isomeric SMILES:
//      cis / trans from the coordinates, R / S from the wedges)
//  (3) geometry: no NaN; mapped atoms keep their coordinates (only the listed movers move: a bent triple bond, a ring that opens, pieces that drift apart)
//  (4) the map: elements kept, changedBonds = the bond-order differences over the map, addedAtoms / removedAtoms = the unmapped atoms
//  (5) rendering: frameSvg at t = 0, 0.5, 1 (and the reduced-motion pair) is balanced SVG with no NaN; t = 0 shows the substrate's labels, t = 1 the product's
//  (6) wiring: the views import the component, the CSS block, the hint line, run.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ready, canon, rdkit } from '../engine/chem.js';
import * as B from '../engine/builder.js';
import * as TB from '../engine/tables.js';
import { jobs } from '../tools/morph_pairs.mjs';
import { viewOf, frameSvg, staticPair, morphKey, productsOf } from '../morph/morph.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

/** A V2000 molblock of one drawing (y flipped back to up), wedges as drawn: what a reader of the picture sees. */
export function molblockOf(m) {
  const pad = (v, n) => String(v).padStart(n);
  const ix = new Map(m.atoms.map((a, i) => [a.idx, i + 1]));
  const lines = ['', '  morph', '', `${pad(m.atoms.length, 3)}${pad(m.bonds.length, 3)}  0  0  0  0  0  0  0  0999 V2000`];
  m.atoms.forEach((a) => lines.push(`${pad((a.x / 25).toFixed(4), 10)}${pad((-a.y / 25).toFixed(4), 10)}${pad('0.0000', 10)} ${(a.sym === 'D' ? 'H' : a.sym).padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`));
  m.bonds.forEach((b) => lines.push(`${pad(ix.get(b.a), 3)}${pad(ix.get(b.b), 3)}${pad(b.order, 3)}${pad(b.stereo === 'wedge' ? 1 : b.stereo === 'dash' ? 6 : 0, 3)}`));
  const chg = m.atoms.filter((a) => a.c);
  if (chg.length) lines.push(`M  CHG${pad(chg.length, 3)}` + chg.map((a) => `${pad(ix.get(a.idx), 4)}${pad(a.c, 4)}`).join(''));
  const iso = m.atoms.filter((a) => a.sym === 'D');
  if (iso.length) lines.push(`M  ISO${pad(iso.length, 3)}` + iso.map((a) => `${pad(ix.get(a.idx), 4)}${pad(2, 4)}`).join(''));
  lines.push('M  END');
  return lines.join('\n');
}
function readBack(m) {
  let mol = null;
  try { mol = rdkit().get_mol(molblockOf(m)); } catch (e) { mol = null; }
  if (!mol || !mol.is_valid()) return null;
  const s = mol.get_smiles();
  mol.delete();
  return canon(s);
}
/** Tags open and close in order (self-closing ones skipped). */
function balanced(svg) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>/g;
  let m;
  while ((m = re.exec(svg))) {
    if (m[3] === '/') continue;
    if (m[1] === '/') { if (stack.pop() !== m[2]) return false; } else stack.push(m[2]);
  }
  return stack.length === 0;
}
const labelsIn = (svg) => (svg.match(/<text[^>]*>([^<]*)<\/text>/g) || []).map((x) => x.replace(/<[^>]+>/g, '')).join(' ');

export async function morph({ ok, eq }) {
  await ready();
  const file = path.join(ROOT, 'morph', 'morphs.json');
  ok(fs.existsSync(file), 'morph: morph/morphs.json exists (python learn/tools/morph_coords.py)');
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, 'utf8');
  const D = JSON.parse(raw);
  const keys = Object.keys(D).filter((k) => k !== '_meta');
  ok(raw.length < 1.6e6, `morph: morphs.json stays small (${raw.length} bytes)`);

  // ---- (1) coverage
  const J = jobs();
  eq(keys.slice().sort(), J.map((j) => j.key).sort(), 'morph: the entries are exactly the jobs of tools/morph_pairs.mjs (rerun python learn/tools/morph_coords.py)');
  let stale = 0;
  J.forEach((j) => { const e = D[j.key]; if (!e || JSON.stringify(productsOf(e)) !== JSON.stringify(j.prods) || e.sub.smiles !== j.sub) stale++; });
  eq(stale, 0, 'morph: every entry has the engine\'s substrate and products, in order');
  const P = B.pairs().filter((p) => p.available);
  let builderHit = 0;
  P.forEach((p) => { if (D[morphKey(p.smiles, p.reagent)]) builderHit++; });
  eq(builderHit, P.length, `morph: every productive builder pair has a morph (${builderHit} of ${P.length})`);
  let cells = 0, cellHit = 0, draws = 0, drawHit = 0;
  for (const T of TB.TABLES) {
    const d = TB.tableData(T.id);
    d.rows.forEach((r) => r.cells.forEach((c) => {
      if (c.status !== 'ok') return;
      cells++;
      const e = D[morphKey(r.smiles, c.reagent)];
      if (e) cellHit++;
      c.draw.forEach((s) => { draws++; if (e && (viewOf(e, s) || (c.rule === 'cleavage' && viewOf(e)))) drawHit++; });
    }));
  }
  eq(cellHit, cells, `morph: every table cell with a product has a morph (${cellHit} of ${cells})`);
  eq(drawHit, draws, `morph: every product a table cell draws has its own morph (${drawHit} of ${draws})`);
  const hubKeys = keys.filter((k) => k.startsWith('hub:'));
  ok(hubKeys.length >= 38, `morph: the hub cards' worked examples have morphs (${hubKeys.length})`);
  console.log(`  morph: ${keys.length} entries (${P.length} builder pairs, ${cells} table cells, ${hubKeys.length} hub examples), ${keys.reduce((s, k) => s + 1 + (D[k].alt || []).length, 0)} morphs, ${raw.length} bytes`);

  // ---- (2)-(5) every morph
  let bad = { sub: [], prod: [], nan: [], pin: [], move: [], map: [], chg: [], svg: [], lab: [] };
  for (const k of keys) {
    const e = D[k];
    const sb = readBack(e.sub);
    if (sb !== canon(e.sub.smiles)) bad.sub.push(k);
    for (const x of [e, ...(e.alt || [])]) {
      const v = viewOf(e, x.prod.smiles);
      const id = k + ' -> ' + x.prod.smiles;
      // a product the engine gives without cis / trans (HX on an alkyne: no E/Z claimed) is drawn one way; only its constitution must match
      const target = canon(x.prod.smiles), drawn = readBack(x.prod);
      if (!(drawn === target || (!/[/\\]/.test(target) && drawn && canon(drawn.replace(/[/\\]/g, '')) === target))) bad.prod.push(id);
      const all = [...e.sub.atoms, ...x.prod.atoms];
      if (all.some((a) => !Number.isFinite(a.x) || !Number.isFinite(a.y))) bad.nan.push(id);
      const SA = new Map(e.sub.atoms.map((a) => [a.idx, a])), PA = new Map(x.prod.atoms.map((a) => [a.idx, a]));
      const mv = new Set(x.moved);
      const mp = Object.entries(x.map).map(([s, p]) => [Number(s), p]);
      // (3) pinned atoms stay put; movers only where something has to move
      if (mp.some(([s, p]) => !mv.has(s) && Math.hypot(SA.get(s).x - PA.get(p).x, SA.get(s).y - PA.get(p).y) > 0.11)) bad.pin.push(id);
      const mayMove = /#/.test(e.sub.smiles) || /\./.test(e.sub.smiles) || /\./.test(x.prod.smiles) || x.changedBonds.some((b) => b.to === 0);
      if (mv.size && !mayMove) bad.move.push(id);
      // (4) the map keeps elements; changed bonds = order differences; added / removed = unmapped
      if (mp.some(([s, p]) => SA.get(s).sym !== PA.get(p).sym)) bad.map.push(id + ' (element)');
      if (new Set(mp.map(([, p]) => p)).size !== mp.length) bad.map.push(id + ' (not one-to-one)');
      const so = new Map(), po = new Map();
      e.sub.bonds.forEach((b) => { so.set(b.a + '-' + b.b, b.order); so.set(b.b + '-' + b.a, b.order); });
      x.prod.bonds.forEach((b) => { po.set(b.a + '-' + b.b, b.order); po.set(b.b + '-' + b.a, b.order); });
      const want = [];
      for (let i = 0; i < mp.length; i++) for (let j = i + 1; j < mp.length; j++) {
        const f = so.get(mp[i][0] + '-' + mp[j][0]) || 0, t = po.get(mp[i][1] + '-' + mp[j][1]) || 0;
        if (f !== t) want.push([Math.min(mp[i][1], mp[j][1]), Math.max(mp[i][1], mp[j][1]), f, t].join(','));
      }
      const got = x.changedBonds.map((b) => [Math.min(b.a, b.b), Math.max(b.a, b.b), b.from, b.to].join(','));
      if (JSON.stringify(got.sort()) !== JSON.stringify(want.sort())) bad.chg.push(id);
      const mappedP = new Set(mp.map(([, p]) => p)), mappedS = new Set(mp.map(([s]) => s));
      if (JSON.stringify(x.addedAtoms.slice().sort((a, b) => a - b)) !== JSON.stringify(x.prod.atoms.map((a) => a.idx).filter((i) => !mappedP.has(i)).sort((a, b) => a - b))) bad.map.push(id + ' (added)');
      if (JSON.stringify(x.removedAtoms.slice().sort((a, b) => a - b)) !== JSON.stringify(e.sub.atoms.map((a) => a.idx).filter((i) => !mappedS.has(i)).sort((a, b) => a - b))) bad.map.push(id + ' (removed)');
      // (5) frames
      const fr = [0, 0.5, 1].map((t) => frameSvg(v, t, { px: 320 }));
      fr.push(frameSvg(v, 0.5, { px: 80 }), staticPair(v, { px: 200 }));
      if (fr.some((s) => !balanced(s) || /="[^"]*(NaN|undefined)/.test(s))) bad.svg.push(id);
      if (frameSvg(v, 0.3, { px: 320 }) !== frameSvg(v, 0.3, { px: 320 })) bad.svg.push(id + ' (not pure)');
      const het = (m) => m.atoms.filter((a) => a.sym !== 'C').map((a) => a.sym).sort().join('');
      const lab = (s) => (labelsIn(s).match(/Br|Cl|[A-Z]/g) || []).filter((y) => y !== 'H').sort().join('');
      if (lab(fr[0]) !== het(e.sub).replace(/H/g, '') || lab(fr[2]) !== het(x.prod).replace(/H/g, '')) bad.lab.push(id);
    }
  }
  const show = (a) => a.slice(0, 6).join('; ');
  eq(bad.sub.length, 0, `morph: every substrate drawing reads back as the substrate ${show(bad.sub)}`);
  eq(bad.prod.length, 0, `morph: every product drawing (coordinates + wedges) reads back as the engine's product ${show(bad.prod)}`);
  eq(bad.nan.length, 0, `morph: no NaN coordinates ${show(bad.nan)}`);
  eq(bad.pin.length, 0, `morph: mapped atoms keep identical coordinates in substrate and product ${show(bad.pin)}`);
  eq(bad.move.length, 0, `morph: atoms move only for a triple bond, a cleavage or two pieces ${show(bad.move)}`);
  eq(bad.map.length, 0, `morph: the atom map keeps elements and accounts for every atom ${show(bad.map)}`);
  eq(bad.chg.length, 0, `morph: changedBonds = the bond-order differences over the map ${show(bad.chg)}`);
  eq(bad.svg.length, 0, `morph: frames at t = 0, 0.5, 1 and the still pair are balanced SVG, pure in t ${show(bad.svg)}`);
  eq(bad.lab.length, 0, `morph: t = 0 shows the substrate's heteroatoms, t = 1 the product's ${show(bad.lab)}`);

  // the student's own example and the three spot checks
  const yne = viewOf(D[morphKey('CCCCC#C', 'HBr-1')]);
  ok(yne && yne.changedBonds.length === 1 && yne.changedBonds[0].from === 3 && yne.changedBonds[0].to === 2 && yne.addedAtoms.length === 1 && yne.prod.atoms.find((a) => a.idx === yne.addedAtoms[0]).sym === 'Br',
    'morph: hex-1-yne + HBr: the triple becomes a double and one Br is attached');
  const brIdx = yne.addedAtoms[0], brOn = yne.prod.bonds.find((b) => b.a === brIdx || b.b === brIdx), cOn = brOn.a === brIdx ? brOn.b : brOn.a;
  ok([yne.changedBonds[0].a, yne.changedBonds[0].b].includes(cOn) && yne.prod.bonds.filter((b) => b.a === cOn || b.b === cOn).length === 3, 'morph: hex-1-yne + HBr: the Br lands on the inner carbon of the old triple bond (Markovnikov)');
  const tol = D[morphKey('Cc1ccccc1', 'HNO3')];
  ok(tol && productsOf(tol).length === 2 && tol.changedBonds.length === 0 && tol.addedAtoms.length === 3, 'morph: toluene + HNO3: NO2 (three new atoms) at ortho and at para, no ring bond changes');
  const cy = viewOf(D[morphKey('C1=CCCCC1', 'Br2')]);
  ok(cy && cy.prod.bonds.filter((b) => b.stereo).length === 2 && new Set(cy.prod.bonds.filter((b) => b.stereo).map((b) => b.stereo)).size === 2, 'morph: cyclohexene + Br2: one wedge and one dash (anti)');
  const da = D['hub:diels-alder'];
  ok(da && da.changedBonds.filter((b) => b.from === 0).length === 2 && da.changedBonds.length === 6, 'morph: Diels-Alder: two new sigma bonds and four order changes');

  // ---- (6) wiring
  const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  ok(/from '\.\/morph\/morph-ui\.js'/.test(src('tables-view.js')) && /playInto\(/.test(src('tables-view.js')) && /id: 'rt-mhint'/.test(src('tables-view.js')), 'morph: the table plays the morph in its cells, with the one-line hint');
  ok(/morphGroup\(morphKey\(res\.substrate, res\.reagent\.id\)/.test(src('builder-view.js')), 'morph: the builder result panel (and the table panel) shows the morph');
  ok(/hubPlay\('hub:'/.test(src('hub-view.js')), 'morph: hub cards have "Play the change" under the worked example');
  const html = src('index.html');
  ok(['.mo-group', '.mo-host', '.rt-replay', '.rt-mhint', '.mo-pair'].every((c) => html.includes(c)), 'morph: CSS block in index.html');
  ok(/morph\(\{ ok, eq \}\)/.test(src('tests/run.mjs')), 'morph: tests wired into run.mjs');
}
