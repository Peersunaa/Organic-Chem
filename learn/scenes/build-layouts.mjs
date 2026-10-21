// node scenes/build-layouts.mjs   (from learn/)  - compiles every storyboard in scenes/scenes/ into scenes/layouts/<id>.json.
// The layouts are what the browser loads; run this again after editing a storyboard. tests/scenes.mjs checks that the committed layouts equal a fresh compile.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ready, rdkit } from '../engine/chem.js';
import { compileScene } from './scene-compile.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Per-scene hand tuning of how a starting species is turned: scene id -> species key -> { rot (deg, clockwise on screen), flipX, flipY }. Applied after the automatic
 *  orientation in scene-compile.js (normalizePts). Only set where the storyboard's moves assume a particular side (e.g. "C1 faces the reagent"). */
export const ORIENT = {};

/** coords.json reactions whose stage drawings may stand in for a scene's relaid-out molecules (when the molecule is the same: see bindCoords). */
export const SCENE_COORDS = {
  '01-alkene-hx': ['alkene-hx'], '02-alkene-hydration': ['alkene-hydration'], '03-alkene-x2': ['alkene-x2'], '04-alkene-h2-pd': ['alkene-h2-pd'], '05-alkene-epoxide': ['alkene-epoxide'],
  '06-alkene-kmno4-cold': ['alkene-kmno4-base'], '07-alkene-hydroboration': ['alkene-hydroboration'], '08-alkyne-hx': ['alkyne-hx'], '09-alkyne-hydration': ['alkyne-hydration'],
  '10-alkyne-lindlar': ['alkyne-lindlar'], '11-alkyne-acetylide': ['alkyne-acetylide'], '12-eas-bromination': ['eas-bromination'], '13-eas-nitration': ['eas-nitration'],
  '14-fc-acylation': ['fc-acylation'], '15-directors': ['director-anisole', 'director-nitrobenzene'], '16-diels-alder': ['diels-alder'],
  '17-hcl-ethylene': ['hcl-ethylene'], '18-arrow-grammar': ['arrow-grammar'], '19-carbocation': ['carbocation-cl'], '20-alkene-kmno4-hot': ['alkene-kmno4-acid']
};
/** The coords.json stages of a scene's reactions (the stage that holds the product comes first, so a product binds to it before an intermediate does). */
export function coordStagesFor(coordsJson, sceneId) {
  return (SCENE_COORDS[sceneId] || []).flatMap((rid) => Object.entries(coordsJson[rid] || {}).sort(([a], [b]) => (/product|ketone|dibromide/.test(b) ? 1 : 0) - (/product|ketone|dibromide/.test(a) ? 1 : 0)).map(([, st]) => st));
}

/** RDKit 2D drawing of a SMILES (explicit H kept): { pts:[{x,y}] in bond units, y up, bonds:[[i,j,order]] } with Kekulé bond orders. */
export function makeDraw() {
  const R = rdkit();
  return (smiles) => {
    let m = R.get_mol(smiles, JSON.stringify({ removeHs: false }));
    if (!m) m = R.get_mol(smiles, JSON.stringify({ removeHs: false, sanitize: false }));
    if (!m) return null;
    try {
      m.set_new_coords();
      const L = m.get_molblock().split('\n');
      const n = parseInt(L[3].slice(0, 3), 10), nb = parseInt(L[3].slice(3, 6), 10);
      const pts = [], bonds = [];
      for (let i = 0; i < n; i++) pts.push({ x: parseFloat(L[4 + i].slice(0, 10)) / 1.5, y: parseFloat(L[4 + i].slice(10, 20)) / 1.5 });
      for (let i = 0; i < nb; i++) { const l = L[4 + n + i]; bonds.push([parseInt(l.slice(0, 3), 10) - 1, parseInt(l.slice(3, 6), 10) - 1, parseInt(l.slice(6, 9), 10)]); }
      return { pts, bonds };
    } finally { m.delete(); }
  };
}

export async function buildAll({ write = true } = {}) {
  await ready();
  const draw = makeDraw();
  const coordsJson = JSON.parse(fs.readFileSync(path.join(here, 'coords.json'), 'utf8'));
  const dir = path.join(here, 'scenes');
  const outDir = path.join(here, 'layouts');
  if (write) fs.mkdirSync(outDir, { recursive: true });
  const out = {};
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const scene = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const layout = compileScene(scene, { draw, orient: ORIENT[scene.id] || {}, coords: coordStagesFor(coordsJson, scene.id) });
    out[scene.id] = layout;
    if (write) fs.writeFileSync(path.join(outDir, scene.id + '.json'), JSON.stringify(layout) + '\n');
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const all = await buildAll();
  for (const [id, l] of Object.entries(all)) console.log(id, l.beats.length + ' beats', JSON.stringify(l).length + ' bytes');
}
