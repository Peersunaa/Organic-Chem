// Piece 4 checks: engine/stereo-moments.js. Every moment points at a real lesson step, every model id exists in data/3d/models.js and parses in RDKit
// (its canonical SMILES from the molblock equals the model's SMILES), and what each caption claims (planar / bridged / cis / trans) is re-measured on the
// embedded 3D coordinates: same-side test on the ring mean plane (Newell normal), angle sum at the cationic carbon, Br bonded to both ring carbons.
// Run alone: node tests/stereo-moments.mjs (from learn/). Also exported for run.mjs: await stereoMoments({ ok, eq }).
import { ready, canon } from '../engine/chem.js';
import { LESSONS } from '../lessons/index.js';
import models from '../data/3d/models.js';
import { STEREO_MOMENTS } from '../engine/stereo-moments.js';

function parse(mb) {
  const L = mb.split('\n');
  const n = parseInt(L[3].slice(0, 3), 10), nb = parseInt(L[3].slice(3, 6), 10);
  const atoms = [], bonds = [];
  for (let i = 0; i < n; i++) { const l = L[4 + i]; atoms.push({ el: l.slice(31, 34).trim(), p: [parseFloat(l.slice(0, 10)), parseFloat(l.slice(10, 20)), parseFloat(l.slice(20, 30))] }); }
  for (let i = 0; i < nb; i++) { const l = L[4 + n + i]; bonds.push([parseInt(l.slice(0, 3), 10) - 1, parseInt(l.slice(3, 6), 10) - 1]); }
  const adj = atoms.map(() => []);
  bonds.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  return { atoms, bonds, adj };
}
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const angle = (u, w) => (Math.acos(Math.max(-1, Math.min(1, dot(u, w) / (Math.hypot(...u) * Math.hypot(...w))))) * 180) / Math.PI;

/** The ring of a molecule with one ring: the heavy atoms left after pruning every atom with fewer than 2 heavy neighbours, in walking order. */
function singleRing(m) {
  const alive = new Set(m.atoms.map((a, i) => (a.el !== 'H' ? i : -1)).filter((i) => i >= 0));
  const deg = (i) => m.adj[i].filter((j) => alive.has(j)).length;
  let changed = true;
  while (changed) { changed = false; for (const i of [...alive]) if (deg(i) < 2) { alive.delete(i); changed = true; } }
  const start = [...alive][0]; const ring = [start];
  let prev = -1, cur = start;
  for (;;) {
    const next = m.adj[cur].find((j) => alive.has(j) && j !== prev);
    if (next === undefined || next === start || ring.includes(next)) break;
    ring.push(next); prev = cur; cur = next;
  }
  return ring;
}
/** 'cis' / 'trans' for the two non-H substituents on a monocyclic ring (Newell mean-plane normal; sign of each substituent's offset from its ring atom). */
export function ringRelation(mb) {
  const m = parse(mb); const ring = singleRing(m);
  let n = [0, 0, 0];
  for (let i = 0; i < ring.length; i++) { const c = cross(m.atoms[ring[i]].p, m.atoms[ring[(i + 1) % ring.length]].p); n = n.map((v, k) => v + c[k]); }
  const subs = [];
  for (const r of ring) for (const j of m.adj[r]) if (!ring.includes(j) && m.atoms[j].el !== 'H') subs.push(dot(sub(m.atoms[j].p, m.atoms[r].p), n) / Math.hypot(...n));
  if (subs.length !== 2) return { rel: null, subs, ring: ring.length };
  return { rel: subs[0] * subs[1] > 0 ? 'cis' : 'trans', subs, ring: ring.length };
}
/** Sum of the three bond angles at the atom with a + charge in the molblock charge line (planar sp2 = 360). */
export function cationAngleSum(mb) {
  const m = parse(mb);
  const chg = mb.split('\n').find((l) => l.startsWith('M  CHG'));
  const idx = parseInt(chg.slice(10, 13), 10) - 1;
  const nb = m.adj[idx];
  if (nb.length !== 3) return NaN;
  const v = nb.map((j) => sub(m.atoms[j].p, m.atoms[idx].p));
  return angle(v[0], v[1]) + angle(v[0], v[2]) + angle(v[1], v[2]);
}
/** The Br atom is bonded to two carbons that are bonded to each other (a three-membered ring). */
export function bridged(mb) {
  const m = parse(mb); const br = m.atoms.findIndex((a) => a.el === 'Br');
  const c = m.adj[br].filter((j) => m.atoms[j].el === 'C');
  return c.length === 2 && m.adj[c[0]].includes(c[1]);
}

export async function stereoMoments({ ok, eq }) {
  await ready();
  ok(Array.isArray(STEREO_MOMENTS) && STEREO_MOMENTS.length >= 5, 'at least 5 stereo moments');
  const seenId = new Set(), seenKey = new Set();
  const check = (what, model, shows, caption, where) => {
    const entry = models[model];
    ok(!!entry, `${where}: ${what} model ${model} exists in models.js`);
    if (!entry) return;
    ok(canon(entry.molblock) !== null, `${where}: ${model} molblock parses in RDKit`);
    ok(canon(entry.molblock) === canon(entry.smiles), `${where}: ${model} molblock stereo agrees with its SMILES (${canon(entry.molblock)} vs ${canon(entry.smiles)})`);
    ok(typeof caption === 'string' && caption.length >= 20 && caption.length <= 220, `${where}: ${what} caption is 20-220 chars (${(caption || '').length})`);
    ok(['planar', 'bridged', 'cis', 'trans'].includes(shows), `${where}: ${what} has a known "shows" value`);
    const idm = model.match(/^(cis|trans)-/);
    if (idm) eq(shows, idm[1], `${where}: model id ${model} agrees with shows`);
    if (shows === 'planar') {
      const s = cationAngleSum(entry.molblock);
      ok(Math.abs(s - 360) < 3, `${where}: cationic carbon is planar (angle sum ${s.toFixed(1)})`);
      ok(/flat|plane/i.test(caption), `${where}: caption says flat/plane`);
    } else if (shows === 'bridged') {
      ok(bridged(entry.molblock), `${where}: Br bridges two bonded carbons`);
      ok(/bridge/i.test(caption), `${where}: caption says bridge`);
    } else {
      const r = ringRelation(entry.molblock);
      eq(r.rel, shows, `${where}: ${model} is ${shows} on the 3D geometry (offsets ${r.subs.map((x) => x.toFixed(2))})`);
      ok(new RegExp('\\b' + shows + '\\b', 'i').test(caption) || (shows === 'cis' && /same/i.test(caption)), `${where}: caption of a ${shows} model says so`);
      const other = shows === 'cis' ? 'trans' : 'cis';
      ok(!new RegExp('\\b(is|the|a|are) ' + other + '\\b', 'i').test(caption), `${where}: caption does not call the ${shows} model ${other}`);
    }
  };
  for (const mo of STEREO_MOMENTS) {
    const where = `moment ${mo.id}`;
    ok(!seenId.has(mo.id), `${where}: unique id`); seenId.add(mo.id);
    const key = mo.lesson + '/' + mo.step; ok(!seenKey.has(key), `${where}: one moment per step (${key})`); seenKey.add(key);
    ok(typeof mo.title === 'string' && mo.title.length > 0 && mo.title.length <= 40, `${where}: title <= 40 chars (${(mo.title || '').length})`);
    const lesson = LESSONS.find((l) => l.id === mo.lesson);
    ok(!!lesson, `${where}: lesson ${mo.lesson} exists`);
    const step = lesson && lesson.steps.find((s) => s.id === mo.step);
    ok(!!step, `${where}: ${mo.lesson}/${mo.step} is a real step`);
    check('main', mo.model, mo.shows, mo.caption, where);
    if (mo.contrast) check('contrast', mo.contrast.model, mo.contrast.shows, mo.contrast.caption, where + ' contrast');
  }
  // the models the brief names, even if a moment is later dropped
  for (const id of ['methylcyclohexyl-cation', 'cis-2-3-epoxybutane', 'cis-cyclohexane-1-2-diol', 'trans-1-2-dibromocyclohexane', 'cis-1-2-dimethylcyclohexane', 'trans-1-2-dimethylcyclohexane', 'bromonium-cyclohexene']) ok(!!models[id], `models.js has ${id}`);
  ok(canon(models['cis-1-2-dimethylcyclohexane'].molblock) !== canon(models['trans-1-2-dimethylcyclohexane'].molblock), 'cis and trans dimethylcyclohexane are different stereoisomers');
}

// run directly: node tests/stereo-moments.mjs
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await stereoMoments({ ok, eq });
  console.log(`stereo-moments: ${pass} checks passed, ${fail} failed`);
  if (fail) { failures.forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
