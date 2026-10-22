// Widget: symmetry-plane (Lesson 16; reusable). Find a plane of symmetry on a solid 3D model (or show that there is none).
// config: { rounds:[{ model:'meso-tartaric', kind?:'find'|'none', titles? }], ask? }
//   The model comes from data/3d/meso.js or chiral.js. The learner CHOOSES the way the plane faces (3 orientations built from the bond between the
//   two chirality centres: across it, or containing it in two directions at right angles) and SLIDES it along its normal. Press "Reflect through
//   this plane": every atom is reflected and must land on an atom of the same element. That test (engine/chirality.js `planeMaps`) IS the grading.
//   Atoms whose reflection lands on nothing are drawn as ghost atoms joined to their image by a red dashed line.
//   kind 'find': a mirror plane exists; the round is passed when the learner's plane maps the molecule onto itself, then they say chiral/achiral.
//   kind 'none': no plane exists (checked with `symmetryPlanes`, which tries the bisector plane of every pair of identical atoms, so it cannot miss one).
//                The learner tries planes, may press "Try every possible plane", then says there is none and that the molecule is chiral.
import MODELS from './chiral-models.js';
import { createView } from './view3d.js';
import { Pose, attachSpin } from './spin3d.js';
import { parseMolblock, planeMaps, symmetryPlanes, planeFrames, molCentre, matVec } from '../chirality.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const TOL = 0.3;
const ELNAME = { H: 'hydrogen', C: 'carbon', O: 'oxygen', N: 'nitrogen', Br: 'bromine', Cl: 'chlorine', F: 'fluorine' };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Atoms, bonds, the bond between the two centres, and the three plane orientations of a model. */
export function planeModel(id) {
  const entry = MODELS[id];
  const mb = parseMolblock(entry.molblock);
  const atoms = mb.atoms.map((a) => ({ el: a.el, x: a.x, y: a.y, z: a.z }));
  const bonds = mb.bonds.map((b) => [b.a, b.b]);
  const axis = entry.centers;
  const via = bonds.map(([a, b]) => (a === axis[0] ? b : b === axis[0] ? a : -1)).find((x) => x >= 0 && x !== axis[1] && atoms[x].el !== 'H');
  const frames = planeFrames(atoms, axis, via);
  const centre = molCentre(atoms);
  const centerNames = axis.map((a) => `C${a + 1}`);
  const viaName = atoms[via].el === 'C' ? 'the carbon chain' : ELNAME[atoms[via].el] || atoms[via].el;
  return { entry, atoms, bonds, axis, via, frames, centre, viaName };
}
/** The plane { n (unit), d } for orientation k and an offset (A) from the centre of the molecule. */
export function planeAt(m, k, offset) { const n = m.frames[k].n; return { n, d: dot(n, m.centre) + offset }; }
/** Judge a learner's plane: { symmetric, off, ... } plus a diagnosis. */
export function judge(m, k, offset) {
  const { n, d } = planeAt(m, k, offset);
  const r = planeMaps(m.atoms, n, d, TOL);
  if (r.symmetric) return { ...r, ok: true, n, d };
  const all = symmetryPlanes(m.atoms, 0.25);
  const faces = all.some((p) => Math.abs(dot(p.n, n)) > 0.98);
  const kinds = [...new Set(r.off.map((i) => ELNAME[m.atoms[i].el] || m.atoms[i].el))];
  let why = `Reflecting through this plane sends ${kinds.join(' and ')} atoms to places where there is no matching atom, so it is not a plane of symmetry. A plane of symmetry puts every atom's image exactly on an identical atom.`;
  if (faces) why = 'This plane faces the right way, but it is in the wrong place: some atoms land on nothing. Slide it until every atom has a partner.';
  else if (all.length) why += ' Try the plane that cuts across the middle bond.';
  return { ...r, ok: false, n, d, diagnosis: why };
}

const TILT_X = 0.5, TILT_Y = -0.55;
const rotX = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const rotY = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));

export default {
  id: 'symmetry-plane',
  mount(host, config, ctx = { onResult() {}, onProgress() {} }) {
    host.innerHTML = '';
    const rounds = config.rounds;
    const root = el('div', 'spl'); host.append(root);
    const cleanup = [];
    let k = 0, m, A, view, orient = 0, offset = 1.4, tried = false, stage = 'plane', passed = new Set(), reflected = null, exhaustive = false;
    const count = el('p', 'muted small');
    const ask = el('p', 'spl-ask');
    const tabs = el('div', 'cf-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Which way the plane faces');
    const stageBox = el('div', 'spin-host');
    const slideRow = el('div', 'spl-slide');
    const minus = el('button', 'btn small', '−'); minus.type = 'button'; minus.setAttribute('aria-label', 'Slide the plane back a little');
    const plus = el('button', 'btn small', '+'); plus.type = 'button'; plus.setAttribute('aria-label', 'Slide the plane forward a little');
    const range = el('input'); range.type = 'range'; range.min = '-4'; range.max = '4'; range.step = '0.1'; range.setAttribute('aria-label', 'Slide the plane along the direction it faces');
    const readout = el('output', 'spl-read');
    slideRow.append(minus, range, plus, readout);
    const bar = el('div', 'cf-bar');
    const go = el('button', 'btn primary', 'Reflect through this plane'); go.type = 'button';
    const every = el('button', 'btn', 'Try every possible plane'); every.type = 'button';
    const none = el('button', 'btn ghost', 'No plane works'); none.type = 'button';
    bar.append(go, every, none);
    const result = el('p', 'mp-result'); result.setAttribute('aria-live', 'polite');
    const q = el('div', 'mp-ask'); q.hidden = true;
    q.innerHTML = '<p class="cf-task">So is this molecule chiral?</p><div class="cf-ans"><button type="button" class="btn" data-v="chiral">Chiral: it has no plane of symmetry</button><button type="button" class="btn" data-v="achiral">Achiral: it has a plane of symmetry</button></div>';
    const note = el('p', 'm3-note mp-note');
    root.append(count, ask, tabs, stageBox, slideRow, bar, result, q, note);

    const toView = (p) => matVec(A.rot, [p[0] - A.c[0], p[1] - A.c[1], p[2] - A.c[2]]);
    const scene = () => {
      const Ad = A.atoms();
      const atoms = Ad.map((a) => ({ ...a })), bonds = m.bonds.map((b) => b.slice());
      const { n, d } = planeAt(m, orient, offset);
      // plane square: basis from the normal
      const ref = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      let u = [n[1] * ref[2] - n[2] * ref[1], n[2] * ref[0] - n[0] * ref[2], n[0] * ref[1] - n[1] * ref[0]];
      const ul = Math.hypot(...u); u = u.map((x) => x / ul);
      const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
      const base = [n[0] * d, n[1] * d, n[2] * d];
      const S = 3.6;
      const corner = (s, t) => toView([base[0] + S * (s * u[0] + t * v[0]), base[1] + S * (s * u[1] + t * v[1]), base[2] + S * (s * u[2] + t * v[2])]);
      const cs = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
      const colour = reflected && reflected.ok ? '#1d9c5a' : '#17b0b9';
      const lines = cs.map((p, i) => ({ a: p, b: cs[(i + 1) % 4], color: colour, thick: true }));
      lines.push({ a: corner(-1, 0), b: corner(1, 0), color: colour, dashed: true }, { a: corner(0, -1), b: corner(0, 1), color: colour, dashed: true });
      const rings = [], labels = [];
      if (reflected && tried) {
        reflected.off.forEach((i) => {
          const img = toView(reflected.reflected[i]);
          atoms.push({ el: m.atoms[i].el, x: img[0], y: img[1], z: img[2] });
          const ghost = atoms.length - 1;
          rings.push(ghost);
          lines.push({ a: [Ad[i].x, Ad[i].y, Ad[i].z], b: img, dashed: true, color: '#d1432b', front: true });
          labels.push({ p: [img[0], img[1] + 0.55, img[2] + 0.4], text: m.atoms[i].el + '′', big: true });
        });
      }
      return { atoms, bonds, lines, rings, labels, ringR: 0.5 };
    };
    const paint = () => view.show(scene());
    const setReadout = () => { readout.textContent = `${offset > 0 ? '+' : ''}${offset.toFixed(1)} Å`; range.value = String(offset); };
    const resetTry = () => { tried = false; reflected = null; result.textContent = ''; };

    const load = (i) => {
      k = i; m = planeModel(rounds[k].model);
      A = new Pose(m.atoms); A.rot = mul(rotX(TILT_X), rotY(TILT_Y));
      orient = 0; offset = 1.4; stage = 'plane'; exhaustive = false; resetTry(); q.hidden = true;
      count.textContent = rounds.length > 1 ? `Molecule ${k + 1} of ${rounds.length}: ${(rounds[k].titles || {})[rounds[k].model] || m.entry.name}` : '';
      const kind = rounds[k].kind || 'find';
      ask.innerHTML = rounds[k].ask || (kind === 'none'
        ? 'This molecule is shown in one conformation. Try planes: choose which way the plane faces, slide it, and press <b>Reflect</b>. A plane of symmetry sends every atom onto an identical atom. Can you find one?'
        : 'A <b>plane of symmetry</b> cuts a molecule into two halves that are mirror images. Choose which way the plane faces, slide it along, and press <b>Reflect</b>: every atom must land on an identical atom.');
      none.hidden = kind === 'find' ? false : false; every.hidden = kind === 'find';
      tabs.innerHTML = '';
      const labelsFor = ['Across the bond between the two centers', 'Along that bond, side-on', 'Along that bond, turned 90°'];
      labelsFor.forEach((t, j) => { const b = el('button', 'btn small cf-tab', t); b.type = 'button'; b.dataset.k = j; b.setAttribute('aria-pressed', String(j === 0)); tabs.append(b); });
      tabs.querySelectorAll('.cf-tab').forEach((b, j) => b.classList.toggle('on', j === 0));
      setReadout(); paint();
      go.disabled = false; none.disabled = false; every.disabled = false;
    };
    stageBox.style.minHeight = '0';
    view = createView(stageBox, { label: 'Solid 3D model with a movable plane. Drag to turn it.', ortho: true });
    cleanup.push(() => view.destroy());
    attachSpin(stageBox, { turn: (x, y) => { A.turn(x, y); paint(); } }, () => {}, 'Molecule with a plane. Drag to turn it, or use the arrow keys.');
    view.ready.then(() => { if (view.kind === 'svg') note.textContent = 'Flat view of the same 3D coordinates (3D graphics are not available here): drag to turn it.'; });
    note.textContent = 'Drag the model to look at the plane from the side: a plane seen edge-on is a line, and a mirror plane has matching atoms at equal distances on both sides.';

    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('.cf-tab'); if (!b || stage !== 'plane') return;
      orient = Number(b.dataset.k); resetTry();
      tabs.querySelectorAll('.cf-tab').forEach((x, j) => { x.classList.toggle('on', j === orient); x.setAttribute('aria-pressed', String(j === orient)); });
      paint();
    });
    const slide = (v) => { if (stage !== 'plane') return; offset = Math.max(-4, Math.min(4, Math.round(v * 10) / 10)); resetTry(); setReadout(); paint(); };
    range.addEventListener('input', () => slide(Number(range.value)));
    minus.addEventListener('click', () => slide(offset - 0.1));
    plus.addEventListener('click', () => slide(offset + 0.1));

    go.addEventListener('click', () => {
      if (stage !== 'plane') return;
      ctx.onProgress && ctx.onProgress();
      const r = judge(m, orient, offset);
      reflected = r; tried = true; paint();
      if (r.ok) {
        result.textContent = `Every atom's image lands on an identical atom (within ${TOL} Å): this plane is a plane of symmetry. It passes through ${r.onPlane.length ? r.onPlane.map((i) => m.atoms[i].el).join(', ') : 'no atom at all, only through the middle of the C–C bond'}, and the two halves are mirror images.`;
        if ((rounds[k].kind || 'find') === 'find') { stage = 'ask'; q.hidden = false; go.disabled = true; none.disabled = true; }
        else ctx.onResult({ ok: false, diagnosis: 'That plane really is a plane of symmetry, so this molecule is not chiral.' });
      } else {
        result.textContent = `${r.off.length} of ${m.atoms.length} atoms have no partner after the reflection (ghost atoms, red dashed lines).`;
        ctx.onResult({ ok: false, diagnosis: r.diagnosis });
      }
    });
    every.addEventListener('click', () => {
      if (stage !== 'plane') return;
      const planes = symmetryPlanes(m.atoms, 0.25);
      let pairs = 0;
      for (let i = 0; i < m.atoms.length; i++) for (let j = i + 1; j < m.atoms.length; j++) if (m.atoms[i].el === m.atoms[j].el) pairs++;
      exhaustive = true;
      result.textContent = planes.length
        ? `Found ${planes.length} plane${planes.length > 1 ? 's' : ''} of symmetry.`
        : `A mirror plane has to be the perpendicular bisector of an atom and its image, so I tested the bisector plane of all ${pairs} pairs of identical atoms: none of the ${pairs} planes maps the molecule onto itself.`;
      ctx.onProgress && ctx.onProgress();
    });
    none.addEventListener('click', () => {
      if (stage !== 'plane') return;
      const planes = symmetryPlanes(m.atoms, 0.25);
      if (planes.length) { ctx.onResult({ ok: false, diagnosis: 'There is a plane of symmetry in this conformation. Choose the plane that cuts across the bond between the two chirality centers and slide it to the middle; press Reflect and see whether every atom finds a partner.' }); return; }
      if (!tried && !exhaustive) { ctx.onResult({ ok: false, diagnosis: 'Try some planes first (or press “Try every possible plane”) so you can see for yourself that none works.' }); return; }
      stage = 'ask'; q.hidden = false; go.disabled = true; none.disabled = true; every.disabled = true;
      result.textContent = 'Right: no plane maps this molecule onto itself.';
    });
    q.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]'); if (!b || stage !== 'ask') return;
      const kind = rounds[k].kind || 'find';
      const wantAchiral = kind === 'find';
      if ((b.dataset.v === 'achiral') !== wantAchiral) {
        ctx.onResult({ ok: false, diagnosis: wantAchiral
          ? 'A molecule with a plane of symmetry is its own mirror image: it is achiral, even though it has chirality centers. That is what “meso” means.'
          : 'No plane of symmetry means the mirror image is a different molecule: the compound is chiral (it has an enantiomer).' });
        return;
      }
      passed.add(k); q.hidden = true; stage = 'done';
      result.textContent = wantAchiral
        ? 'Achiral. A molecule that has chirality centers and a plane of symmetry is a meso compound: it is optically inactive.'
        : 'Chiral. Its mirror image is a different molecule, so it has an enantiomer and is optically active.';
      if (k + 1 < rounds.length) {
        const nb = el('button', 'btn primary', 'Next molecule'); nb.type = 'button';
        nb.addEventListener('click', () => { nb.remove(); load(k + 1); ctx.onProgress && ctx.onProgress(); });
        bar.append(nb); nb.focus({ preventScroll: true });
      } else ctx.onResult({ ok: true });
    });
    load(0);
    return { destroy() { cleanup.forEach((f) => f()); } };
  }
};
