// Widget: a molecule and its TRUE mirror image as two solid 3D models side by side (Lesson 15; reusable).
// The mirror image is the same RDKit/MMFF coordinates reflected through a plane (data/3d/chiral.js, made by tools/gen_chiral3d.py), never hand-built.
//
// config.mode 'superimpose' (default): { models:['chfclbr','ch2clbr',...], titles?:{id:'CHFClBr'} }
//   Turn each model on its own (drag, or the arrow keys). "Try to superimpose" finds the best proper rotation over every atom pairing that keeps
//   elements and bonds (Kabsch/Horn, engine/chirality.js `superpose`), turns the mirror image into that pose, and reports whether ALL atoms match.
//   Then the learner says whether the molecule is chiral; graded from the computed result.
// config.mode 'plane': { model:'ch2clbr' }  one model with a plane drawn through three of its atoms: tap the atoms that lie IN the plane, then say whether
//   the molecule is chiral. The plane is a real mirror plane found from the coordinates (`mirrorPlanes`).
import CHIRAL from '../../data/3d/chiral.js';
import { createView } from './view3d.js';
import { Pose, attachSpin, animate } from './spin3d.js';
import { parseMolblock, superpose, mirrorPlanes, axisAngle, rotAxisAngle, matMul, rotX, rotY } from '../chirality.js';

const ELNAME = { H: 'hydrogen', C: 'carbon', O: 'oxygen', N: 'nitrogen', F: 'fluorine', Cl: 'chlorine', Br: 'bromine' };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

/** Atoms and bonds of a model and of its mirror image. */
export function modelOf(id) {
  const e = CHIRAL[id];
  const a = parseMolblock(e.molblock), b = parseMolblock(e.mirror);
  return { entry: e, atoms: a.atoms.map((x) => ({ el: x.el, x: x.x, y: x.y, z: x.z })), mirror: b.atoms.map((x) => ({ el: x.el, x: x.x, y: x.y, z: x.z })), bonds: a.bonds.map((x) => [x.a, x.b]) };
}
/** The verdict the widget will accept for a model, computed with both models in the same pose. */
export function judgeModel(id) {
  const m = modelOf(id);
  const A = new Pose(m.atoms), B = new Pose(m.mirror);
  const r = superpose(A.atoms(), B.atoms(), m.bonds);
  return { ...r, chiral: !r.match, atoms: m.atoms };
}
export function describeResult(m, r) {
  const n = m.atoms.length;
  if (r.match) return `Best fit found by turning the mirror image: average distance between partner atoms ${r.rmsd.toFixed(2)} Å. All ${n} atoms land on top of their partners, so the mirror image CAN be superimposed on the molecule.`;
  const worst = r.mismatched.slice().sort((a, b) => r.dist[b] - r.dist[a]);
  const names = worst.slice(0, 3).map((i) => `${m.atoms[i].el}, ${r.dist[i].toFixed(1)} Å off`);
  return `Best fit found by turning the mirror image: average distance ${r.rmsd.toFixed(2)} Å. ${r.mismatched.length} of ${n} atoms cannot be made to land on their partners (worst: ${names.join('; ')}${worst.length > 3 ? '; and more' : ''}). No turn fixes that, so the mirror image can NOT be superimposed.`;
}

// start poses: the molecule is tilted a little so every atom shows, and the mirror image is tilted as its exact reflection across the dashed line
const TILT = matMul(rotX(0.45), rotY(-0.5));
const M = [[-1, 0, 0], [0, 1, 0], [0, 0, 1]];
const TILT_MIRROR = matMul(M, matMul(TILT, M));
export default {
  id: 'mirror-pair',
  mount(host, config, ctx = { onResult() {}, onProgress() {} }) {
    host.innerHTML = '';
    const mode = config.mode || 'superimpose';
    const root = el('div', 'mp'); host.append(root);
    const cleanup = [];
    const title = (id) => (config.titles && config.titles[id]) || CHIRAL[id].name;
    const live = el('p', 'mp-live'); live.setAttribute('aria-live', 'polite');
    const note = el('p', 'm3-note mp-note');

    if (mode === 'plane') return mountPlane(root, config, ctx, cleanup, live, note, title);

    const ids = config.models;
    const done = new Set();
    let cur = 0, tried = null, A, B, m, viewA, viewB, overlay = null, busy = false;
    const tabs = el('div', 'cf-tabs'); tabs.setAttribute('role', 'tablist');
    if (ids.length > 1) ids.forEach((id, k) => { const b = el('button', 'btn small cf-tab', title(id)); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.k = k; tabs.append(b); });
    const views = el('div', 'mp-views');
    const figA = el('figure', 'mp-fig'), figB = el('figure', 'mp-fig');
    const boxA = el('div', 'spin-host'), boxB = el('div', 'spin-host');
    figA.append(boxA, el('figcaption', '', 'Molecule')); figB.append(boxB, el('figcaption', '', 'Its mirror image'));
    const mirror = el('div', 'mp-mirror'); mirror.setAttribute('aria-hidden', 'true'); mirror.innerHTML = '<span>mirror</span>';
    views.append(figA, mirror, figB);
    const bar = el('div', 'cf-bar');
    const goBtn = el('button', 'btn primary', 'Try to superimpose'); goBtn.type = 'button';
    const resetBtn = el('button', 'btn ghost', 'Reset the models'); resetBtn.type = 'button';
    bar.append(goBtn, resetBtn);
    const result = el('p', 'mp-result'); result.setAttribute('aria-live', 'polite');
    const ovWrap = el('figure', 'mp-fig mp-over'); ovWrap.hidden = true;
    const ovBox = el('div'); ovWrap.append(ovBox, el('figcaption', '', 'Overlay: the mirror image after the best turn. Ringed atoms matched; a ghost atom with a red dashed line did not.'));
    const ask = el('div', 'mp-ask'); ask.hidden = true;
    ask.innerHTML = '<p class="cf-task">So is this molecule chiral?</p><div class="cf-ans"><button type="button" class="btn" data-v="chiral">Chiral: its mirror image is a different molecule</button><button type="button" class="btn" data-v="achiral">Achiral: its mirror image is the same molecule</button></div>';
    root.append(tabs, views, bar, result, ovWrap, ask, live, note);
    note.textContent = 'Drag a model (or use the arrow keys when it is focused) to turn it. The two models are mirror images across the dashed line.';

    viewA = createView(boxA, { label: 'Molecule model', ortho: true });
    viewB = createView(boxB, { label: 'Mirror image model', ortho: true });
    cleanup.push(() => viewA.destroy(), () => viewB.destroy(), () => overlay && overlay.destroy());
    const sceneOf = (atoms) => ({ atoms, bonds: m.bonds });
    const paintA = () => viewA.show(sceneOf(A.atoms()));
    const paintB = () => viewB.show(sceneOf(B.atoms()));

    const load = (k) => {
      cur = k; const id = ids[k];
      m = modelOf(id); A = new Pose(m.atoms); B = new Pose(m.mirror); A.rot = TILT; B.rot = TILT_MIRROR; tried = null; busy = false;
          paintA(); paintB();
      ovWrap.hidden = true; result.textContent = ''; ask.hidden = true; live.textContent = done.has(id) ? 'You already judged this one.' : '';
      ask.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      tabs.querySelectorAll('.cf-tab').forEach((b, i) => { b.setAttribute('aria-selected', String(i === k)); b.classList.toggle('on', i === k); b.classList.toggle('done', done.has(ids[i])); });
      goBtn.disabled = false;
    };
    attachSpin(boxA, { turn: (x, y) => { if (!busy) { A.turn(x, y); paintA(); } } }, () => {}, 'Molecule model. Drag to turn it, or use the arrow keys.');
    attachSpin(boxB, { turn: (x, y) => { if (!busy) { B.turn(x, y); paintB(); } } }, () => {}, 'Mirror image model. Drag to turn it, or use the arrow keys.');
    Promise.all([viewA.ready, viewB.ready]).then(() => { if (viewA.kind === 'svg') note.textContent = 'Flat view of the same 3D coordinates (3D graphics are not available here): drag to turn it, or use the arrow keys.'; });

    goBtn.addEventListener('click', () => {
      if (busy) return;
      busy = true; goBtn.disabled = true; ctx.onProgress && ctx.onProgress();
      const r = superpose(A.atoms(), B.atoms(), m.bonds);
      const { axis, angle } = axisAngle(r.R), start = B.rot;
      result.textContent = 'Turning the mirror image to the best fit…';
      animate(1000, (t) => { B.rot = matMul(rotAxisAngle(axis, angle * t), start); paintB(); }, () => {
        B.rot = matMul(r.R, start); paintB();
        tried = r; busy = false; goBtn.disabled = false;
        result.textContent = describeResult(m, r);
        showOverlay(r);
        ask.hidden = false; live.textContent = '';
      });
    });
    resetBtn.addEventListener('click', () => { if (busy) return; A.rot = TILT; B.rot = TILT_MIRROR; tried = null; paintA(); paintB(); ovWrap.hidden = true; result.textContent = ''; ask.hidden = true; });

    function showOverlay(r) {
      const Ad = A.atoms(), Bd = B.atoms();
      const n = Ad.length;
      const atoms = Ad.map((a) => ({ ...a })), bonds = m.bonds.map((b) => b.slice());
      const idxB = new Array(n); // where each mirror atom is drawn: its partner atom of the molecule, or a ghost copy
      const lines = [], labels = [], rings = [];
      for (let i = 0; i < n; i++) {
        if (r.dist[i] <= 0.4) { idxB[i] = r.perm[i]; rings.push(r.perm[i]); }
        else {
          atoms.push({ ...Bd[i] }); idxB[i] = atoms.length - 1; rings.push(idxB[i]);
          const p = Ad[r.perm[i]];
          lines.push({ a: [Bd[i].x, Bd[i].y, Bd[i].z], b: [p.x, p.y, p.z], dashed: true, color: '#d1432b', front: true });
          labels.push({ p: [Bd[i].x, Bd[i].y + 0.5, Bd[i].z + 0.4], text: Bd[i].el + '′', big: true });
        }
      }
      m.bonds.forEach(([i, j]) => { const a = idxB[i], b = idxB[j]; if (a !== b && (a >= n || b >= n)) bonds.push([a, b]); });
      const sc = { atoms, bonds, rings, lines, labels, ringR: 0.5 };
      if (!overlay) overlay = createView(ovBox, { label: 'Overlay of the molecule and its mirror image after the best turn', ortho: true });
      ovWrap.hidden = false;
      overlay.show(sc);
    }

    ask.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]'); if (!b || busy) return;
      if (!tried) { ctx.onResult({ ok: false, diagnosis: 'Press “Try to superimpose” first, so the computer can test every possible way of turning the mirror image onto the molecule.' }); return; }
      const sayChiral = b.dataset.v === 'chiral';
      const chiral = !tried.match;
      if (sayChiral === chiral) {
        done.add(ids[cur]);
        tabs.querySelectorAll('.cf-tab')[cur] && tabs.querySelectorAll('.cf-tab')[cur].classList.add('done');
        ask.hidden = true;
        live.textContent = chiral ? 'Right: it is chiral. The mirror image is a different molecule (an enantiomer).' : 'Right: it is achiral. The mirror image is the same molecule, just turned.';
        if (done.size === ids.length) ctx.onResult({ ok: true });
        else { ctx.onProgress && ctx.onProgress(); const nxt = ids.findIndex((x) => !done.has(x)); if (nxt >= 0) live.textContent += ' Pick the next molecule above.'; }
      } else {
        ctx.onResult({ ok: false, diagnosis: chiral
          ? `Look at the overlay: after the best possible turn, ${tried.mismatched.map((i) => m.atoms[i].el).join(' and ')} still do not land on their partners. A molecule whose mirror image cannot be superimposed on it is chiral.`
          : 'Look at the overlay: every atom landed on its partner, so the mirror image is just the same molecule turned around. A molecule that can be superimposed on its mirror image is achiral.' });
      }
    });
    tabs.addEventListener('click', (e) => { const b = e.target.closest('.cf-tab'); if (b && !busy) load(Number(b.dataset.k)); });
    load(0);
    return { destroy() { cleanup.forEach((f) => f()); } };
  }
};

// ------------------------------------------------------------------------------------------------ plane mode
function mountPlane(root, config, ctx, cleanup, live, note, title) {
  const m = modelOf(config.model);
  const planes = mirrorPlanes(m.atoms);
  const plane = planes[0];
  const A = new Pose(m.atoms); A.rot = TILT;
  const fig = el('figure', 'mp-fig'); const box = el('div', 'spin-host'); fig.append(box, el('figcaption', '', title(config.model) + ' with a flat plane drawn through it'));
  root.append(fig);
  const v = createView(box, { label: 'Molecule with a plane through three of its atoms', ortho: true });
  cleanup.push(() => v.destroy());
  // plane square: orthonormal basis from the three atoms
  const P = (i) => [m.atoms[i].x, m.atoms[i].y, m.atoms[i].z];
  const sceneNow = () => {
    const Ad = A.atoms();
    const q = (i) => [Ad[i].x, Ad[i].y, Ad[i].z];
    const [a, b, c] = plane.trio.map(q);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w0 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const ul = Math.hypot(...u); const uu = u.map((x) => x / ul);
    const dp = w0[0] * uu[0] + w0[1] * uu[1] + w0[2] * uu[2];
    let vv = [w0[0] - dp * uu[0], w0[1] - dp * uu[1], w0[2] - dp * uu[2]]; const vl = Math.hypot(...vv); vv = vv.map((x) => x / vl);
    const cen = plane.inPlane.map(q).reduce((s, p) => [s[0] + p[0] / plane.inPlane.length, s[1] + p[1] / plane.inPlane.length, s[2] + p[2] / plane.inPlane.length], [0, 0, 0]);
    const S = 2.6;
    const corner = (s, t) => [cen[0] + S * (s * uu[0] + t * vv[0]), cen[1] + S * (s * uu[1] + t * vv[1]), cen[2] + S * (s * uu[2] + t * vv[2])];
    const cs = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
    const lines = cs.map((p, i) => ({ a: p, b: cs[(i + 1) % 4], color: '#17b0b9', thick: true }));
    lines.push({ a: corner(-1, 0), b: corner(1, 0), color: '#17b0b9', dashed: true }, { a: corner(0, -1), b: corner(0, 1), color: '#17b0b9', dashed: true });
    return { atoms: Ad, bonds: m.bonds, lines };
  };
  const paint = () => v.show(sceneNow());
  paint();
  attachSpin(box, { turn: (x, y) => { A.turn(x, y); paint(); } }, () => {}, 'Molecule with a plane. Drag to turn it so you can see the plane edge-on, or use the arrow keys.');
  const counter = {};
  const chips = m.atoms.map((a, i) => { counter[a.el] = (counter[a.el] || 0) + 1; return { i, name: a.el + (m.atoms.filter((x) => x.el === a.el).length > 1 ? ` (${counter[a.el]})` : '') }; });
  const task = el('p', 'cf-task', 'Tap every atom that lies IN the plane (the plane passes through the middle of it). Atoms that sit on one side of the plane are not in it.');
  const wrap = el('div', 'rs-chips'); wrap.setAttribute('role', 'group');
  const sel = new Set();
  chips.forEach((c) => {
    const b = el('button', 'rs-chip', c.name); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.dataset.i = c.i;
    b.addEventListener('click', () => { if (stage !== 1) return; sel.has(c.i) ? sel.delete(c.i) : sel.add(c.i); b.setAttribute('aria-pressed', String(sel.has(c.i))); });
    wrap.append(b);
  });
  const check = el('button', 'btn primary', 'Check the atoms'); check.type = 'button';
  const ask = el('div', 'mp-ask'); ask.hidden = true;
  ask.innerHTML = '<p class="cf-task">The plane cuts the molecule into two halves. Each atom off the plane has a partner on the other side at the same distance. So is the molecule chiral?</p><div class="cf-ans"><button type="button" class="btn" data-v="chiral">Chiral</button><button type="button" class="btn" data-v="achiral">Achiral: it has a plane of symmetry</button></div>';
  root.append(task, wrap, check, ask, live, note);
  note.textContent = 'Drag the model to look along the plane: seen edge-on it is a line, and the atoms off the plane sit symmetrically on its two sides.';
  let stage = 1;
  check.addEventListener('click', () => {
    if (stage !== 1) return;
    const want = new Set(plane.inPlane);
    const wrongIn = [...sel].filter((i) => !want.has(i)), missing = [...want].filter((i) => !sel.has(i));
    if (!wrongIn.length && !missing.length) {
      stage = 2; check.disabled = true; ask.hidden = false;
      live.textContent = `Yes: ${plane.inPlane.map((i) => m.atoms[i].el).join(', ')} lie in the plane. The other atoms are mirror partners across it.`;
      ctx.onProgress && ctx.onProgress();
      return;
    }
    const names = (a) => a.map((i) => chips[i].name).join(', ');
    ctx.onResult({ ok: false, diagnosis: wrongIn.length
      ? `${names(wrongIn)} ${wrongIn.length > 1 ? 'are' : 'is'} not in the plane: ${wrongIn.length > 1 ? 'they sit' : 'it sits'} on one side of it, with a mirror partner at the same distance on the other side. Turn the model to see the plane edge-on.`
      : `The plane also passes through ${names(missing)}. Turn the model so you see the plane edge-on, and look for atoms that sit right on the line.` });
  });
  ask.addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]'); if (!b || stage !== 2) return;
    if (b.dataset.v === 'achiral') { stage = 3; ask.hidden = true; live.textContent = 'Right. Reflecting the molecule through this plane gives the same molecule back, so it is its own mirror image: achiral. A chiral molecule has no plane of symmetry.'; ctx.onResult({ ok: true }); }
    else ctx.onResult({ ok: false, diagnosis: 'A plane that cuts the molecule into two mirror-image halves is a plane of symmetry. Reflecting through it gives the identical molecule back, so the molecule is its own mirror image. Chiral molecules have no such plane.' });
  });
  return { destroy() { cleanup.forEach((f) => f()); } };
}
