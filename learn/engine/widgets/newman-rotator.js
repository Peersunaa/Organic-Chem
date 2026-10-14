// Widget: turn the rear methyl of a solid 3D ethane (or bromoethane) about the C-C bond. A Newman projection and a live
// energy curve follow, all computed from the rotated RDKit coordinates (newman-core.js). The learner locks the
// staggered minimum and/or the eclipsed maximum.
//
// config: { mol:'ethane'|'bromoethane', need:['min','max'] (locks required; [] = free exploration),
//           energy: true | false | 'after' (energy curve shown / hidden / shown once the locks are done),
//           pill: bool (show the words staggered / eclipsed), start: degrees, lockLabels?: {min, max} }
import models from '../../data/3d/models.js';
import { setup, poseAt, thetaOf, newman, energy, lockGrade } from './newman-core.js';
import { createView, CPK } from './view3d.js';
import { mod360 } from './geom.js';

export const MOLS = {
  ethane: { front: 0, back: 1, refFront: 2, refBack: 5, emax: 12, refLabel: 'H–C–C–H', frontName: 'front', title: 'Ethane' },
  bromoethane: { front: 1, back: 0, refFront: 2, refBack: 3, emax: 15, refLabel: 'Br–C–C–H', frontName: 'front', title: 'Bromoethane' }
};
export const FRONT_H = '#27b3bd', BACK_H = '#f2a93b';

/** Pure: grade a lock. */
export function grade(config, kind, theta) { const c = MOLS[config.mol]; return lockGrade(theta, kind, c.emax); }

/** Scene description for the viewer at dihedral theta. */
const VIEW = (p) => { // display-only tilt so the three rear and three front bonds are not stacked in the side view
  const a = (-32 * Math.PI) / 180, b = (22 * Math.PI) / 180;
  const x1 = p[0] * Math.cos(a) + p[2] * Math.sin(a), z1 = -p[0] * Math.sin(a) + p[2] * Math.cos(a);
  return [x1, p[1] * Math.cos(b) - z1 * Math.sin(b), p[1] * Math.sin(b) + z1 * Math.cos(b)];
};
export function sceneAt(model, theta) {
  const pts = poseAt(model, theta).map(VIEW);
  const c = model.cfg;
  const colors = {};
  model.nb[c.front].forEach((j) => { if (model.els[j] === 'H') colors[j] = FRONT_H; });
  model.nb[c.back].forEach((j) => { if (model.els[j] === 'H') colors[j] = BACK_H; });
  const atoms = pts.map((p, i) => ({ el: model.els[i], x: p[0], y: p[1], z: p[2] }));
  return { atoms, bonds: model.bonds.map(([i, j]) => [i, j]), colors };
}

function newmanSvg(model, theta) {
  const pts = poseAt(model, theta);
  const nm = newman(model, pts);
  const R = 46, F = 78, B = 82;
  const pol = (ang, r) => [100 + r * Math.cos((ang * Math.PI) / 180), 100 - r * Math.sin((ang * Math.PI) / 180)];
  const dot = (i, ang, r, col) => {
    const el = model.els[i]; const [x, y] = pol(ang, r); const rad = el === 'Br' ? 11 : 8.5;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad}" fill="${el === 'Br' ? CPK.Br : col}" class="nw-dot"/><text x="${x.toFixed(1)}" y="${(y + 3.8).toFixed(1)}" class="nw-el${el === 'Br' ? ' light' : ''}">${el}</text>`;
  };
  let s = `<circle cx="100" cy="100" r="${R}" class="nw-ring"/>`;
  nm.back.forEach((b) => { const [x1, y1] = pol(b.ang, R), [x2, y2] = pol(b.ang, B - 9); s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="nw-bond back"/>`; });
  nm.front.forEach((f) => { const [x2, y2] = pol(f.ang, F - 17); s += `<line x1="100" y1="100" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="nw-bond front"/>`; });
  nm.back.forEach((b) => { s += dot(b.i, b.ang, B, BACK_H); });
  nm.front.forEach((f) => { s += dot(f.i, f.ang, F - 8, FRONT_H); });
  s += '<circle cx="100" cy="100" r="3.2" class="nw-c"/>';
  return s;
}

function curveSvg(emax) {
  const W = 300, H = 128, L = 34, Rr = 18, T = 12, Bm = 28;
  const X = (t) => L + (t / 360) * (W - L - Rr), Y = (e) => T + (1 - e / emax) * (H - T - Bm);
  let d = '';
  for (let t = 0; t <= 360; t += 3) d += (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(energy(t, emax)).toFixed(1);
  let ticks = '';
  for (let t = 0; t <= 360; t += 60) ticks += `<line x1="${X(t)}" y1="${H - Bm}" x2="${X(t)}" y2="${H - Bm + 4}" class="ec-tick"/><text x="${X(t)}" y="${H - Bm + 16}" class="ec-txt mid">${t}°</text>`;
  const ys = [0, emax / 2, emax].map((e) => `<line x1="${L - 4}" y1="${Y(e)}" x2="${L}" y2="${Y(e)}" class="ec-tick"/><text x="${L - 7}" y="${Y(e) + 4}" class="ec-txt end">${e}</text>`).join('');
  return { W, H, X, Y, base: `<line x1="${L}" y1="${H - Bm}" x2="${W - Rr}" y2="${H - Bm}" class="ec-axis"/><line x1="${L}" y1="${T}" x2="${L}" y2="${H - Bm}" class="ec-axis"/>${ticks}${ys}<path d="${d}" class="ec-curve"/><text x="${(L + W - Rr) / 2}" y="${H - 2}" class="ec-txt mid">dihedral angle (degrees)</text><text x="9" y="${(T + H - Bm) / 2}" class="ec-txt mid" transform="rotate(-90 9 ${(T + H - Bm) / 2})">kJ/mol</text>` };
}

export default {
  id: 'newman-rotator',
  mount(host, config, ctx = { onResult() {} }) {
    const uid = Math.random().toString(36).slice(2, 7);
    const mol = MOLS[config.mol || 'ethane'];
    const model = setup(models[config.mol || 'ethane'].molblock, mol);
    const need = config.need || [];
    const done = new Set();
    let showEnergy = config.energy === true;
    let theta = mod360(config.start ?? 25);
    host.innerHTML = `<div class="nr">
      <div class="nr-top">
        <div class="nr-3d"></div>
        <figure class="nr-newman"><svg viewBox="0 0 200 200" class="nr-svg" role="img" aria-label="Newman projection, drag to turn the rear carbon"></svg><figcaption>Newman projection<br><span class="nr-key"><i class="k-front"></i> front carbon <i class="k-back"></i> rear carbon</span></figcaption></figure>
      </div>
      <div class="nr-curve" hidden><svg class="nr-ec" viewBox="0 0 300 128" role="img" aria-label="Energy against dihedral angle"></svg><p class="nr-read" aria-live="off"></p></div>
      <div class="nr-ctl">
        <label for="nr-s-${uid}" class="nr-lab">Turn the rear carbon: <b class="nr-th"></b> <span class="nr-pill" hidden></span></label>
        <div class="nr-slide"><button type="button" class="btn small" data-d="-5" aria-label="Turn back 5 degrees">−5°</button>
        <input type="range" class="nr-range" id="nr-s-${uid}" min="0" max="360" step="1" value="${Math.round(theta)}" aria-label="Rotate the rear carbon about the carbon–carbon bond, in degrees">
        <button type="button" class="btn small" data-d="5" aria-label="Turn forward 5 degrees">+5°</button></div>
      </div>
      <div class="nr-locks"></div>
      <p class="m3-note nr-note"></p>
    </div>`;
    const q = (s) => host.querySelector(s);
    const range = q('.nr-range'), thOut = q('.nr-th'), pill = q('.nr-pill'), nwSvg = q('.nr-svg'), curveBox = q('.nr-curve'), ecSvg = q('.nr-ec'), read = q('.nr-read'), locks = q('.nr-locks'), note = q('.nr-note');
    const view = createView(q('.nr-3d'), { label: `${mol.title} 3D model, flat projection. Drag to rotate the view.` });
    const curve = curveSvg(mol.emax);
    ecSvg.innerHTML = curve.base;
    const paintCurve = () => {
      const E = energy(theta, mol.emax);
      ecSvg.querySelector('.ec-mark')?.remove();
      ecSvg.querySelector('.ec-drop')?.remove();
      ecSvg.insertAdjacentHTML('beforeend', `<line x1="${curve.X(theta)}" y1="${curve.Y(E)}" x2="${curve.X(theta)}" y2="${curve.H - 28}" class="ec-drop"/><circle cx="${curve.X(theta)}" cy="${curve.Y(E)}" r="6" class="ec-mark"/>`);
      read.textContent = `Energy: ${E.toFixed(1)} kJ/mol above the lowest arrangement`;
    };
    const stateWord = () => { const g = (k) => lockGrade(theta, k, mol.emax, 4).ok; return g('min') ? 'staggered' : g('max') ? 'eclipsed' : 'in between'; };
    const update = (fromSlider) => {
      theta = mod360(theta);
      const shown = Math.round(theta) % 360;
      if (!fromSlider) range.value = String(shown);
      thOut.textContent = `${shown}°`;
      range.setAttribute('aria-valuetext', `${shown} degrees${config.pill ? ', ' + stateWord() : ''}`);
      nwSvg.innerHTML = newmanSvg(model, theta);
      view.show(sceneAt(model, theta));
      if (config.pill) { pill.hidden = false; const w = stateWord(); pill.textContent = w; pill.dataset.state = w; }
      if (showEnergy) paintCurve();
    };
    const setTheta = (t, fromSlider) => { theta = mod360(t); update(fromSlider); };
    range.addEventListener('input', () => setTheta(Number(range.value), true));
    host.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => setTheta(Math.round(theta) + Number(b.dataset.d))));
    // drag the Newman projection like a dial
    let drag = null;
    const angleAt = (e) => { const r = nwSvg.getBoundingClientRect(); return (Math.atan2(-(e.clientY - (r.top + r.height / 2)), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI; };
    nwSvg.style.touchAction = 'none';
    nwSvg.addEventListener('pointerdown', (e) => { drag = { a: angleAt(e), t: theta }; try { nwSvg.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
    nwSvg.addEventListener('pointermove', (e) => { if (!drag) return; setTheta(drag.t - (angleAt(e) - drag.a)); });
    const end = () => { drag = null; };
    nwSvg.addEventListener('pointerup', end); nwSvg.addEventListener('pointercancel', end);

    const names = { min: (config.lockLabels && config.lockLabels.min) || 'Lock the lowest-energy arrangement', max: (config.lockLabels && config.lockLabels.max) || 'Lock the highest-energy arrangement' };
    const doneWord = { min: 'staggered (lowest energy)', max: 'eclipsed (highest energy)' };
    need.forEach((k) => {
      const wrap = document.createElement('div'); wrap.className = 'nr-lock';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = names[k]; b.dataset.lock = k;
      const chip = document.createElement('span'); chip.className = 'chip ok'; chip.hidden = true;
      b.addEventListener('click', () => {
        if (done.has(k)) return;
        const r = lockGrade(theta, k, mol.emax);
        if (r.ok) {
          done.add(k); b.disabled = true; chip.hidden = false; chip.textContent = `Locked: ${doneWord[k]} at ${Math.round(theta) % 360}°`;
          if (done.size === need.length) { if (config.energy === 'after') { showEnergy = true; curveBox.hidden = false; update(true); } ctx.onResult({ ok: true }); }
        } else ctx.onResult({ ok: false, diagnosis: r.diagnosis });
      });
      wrap.append(b, chip); locks.append(wrap);
    });
    if (!need.length) locks.hidden = true;
    curveBox.hidden = !showEnergy;
    note.textContent = view.kind === 'svg' ? '' : 'Drag the 3D model to look at it from any side. Slider, − and + buttons, or dragging the Newman circle all turn the rear carbon.';
    view.ready.then(() => { if (view.kind === 'svg') note.textContent = 'Flat view of the same 3D coordinates (3D graphics are not available here): drag the model to rotate it. The slider, − and + buttons, or dragging the Newman circle turn the rear carbon.'; });
    update(false);
    return { destroy() { view.destroy(); } };
  }
};
