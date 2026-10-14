// Widget: Lewis structure builder (tap bonds to cycle order, tap atoms to add lone pairs / charge).
import { NAME } from '../chem.js';
import { initialState, evaluate, bondOrderSum, freeAngles, bondAngles, fmtCharge } from './lewis-core.js';

const NS = 'http://www.w3.org/2000/svg';
const SCALE = 64;
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const radius = (el) => (el === 'H' ? 13 : 18);

export default {
  id: 'lewis-builder',
  mount(host, config, ctx) {
    const state = initialState(config);
    const locked = !!config.lockedBonds;
    let sel = null;
    let anim = null;
    let finished = false;

    host.innerHTML = `
      <div class="lb">
        <svg class="lb-svg" role="group" aria-label="Lewis structure workspace"></svg>
        <div class="lb-bar" hidden>
          <span class="lb-sel" id="lb-sel"></span>
          <button type="button" class="btn small" data-act="lp+">+ lone pair</button>
          <button type="button" class="btn small" data-act="lp-">− lone pair</button>
          <span class="lb-charge" role="group" aria-label="Formal charge">
            <button type="button" class="btn small" data-act="ch-1" aria-label="Charge minus">−</button>
            <button type="button" class="btn small" data-act="ch0" aria-label="Charge zero">0</button>
            <button type="button" class="btn small" data-act="ch1" aria-label="Charge plus">+</button>
          </span>
        </div>
        <p class="lb-help">${locked ? 'Tap an atom to add lone pairs' : 'Tap a bond to change its order. Tap an atom to add lone pairs'}${config.charges === false ? '.' : ' or set its charge.'}</p>
        <div class="lb-actions">
          <button type="button" class="btn ghost" data-act="reset">Reset</button>
          <button type="button" class="btn primary" data-act="check">Check</button>
        </div>
        <div class="sr-only" aria-live="polite" id="lb-live"></div>
      </div>`;
    const svg = host.querySelector('.lb-svg');
    const bar = host.querySelector('.lb-bar');
    const selLabel = host.querySelector('#lb-sel');
    const live = host.querySelector('#lb-live');

    // viewBox from atom positions
    const xs = state.atoms.map((a) => a.x * SCALE), ys = state.atoms.map((a) => a.y * SCALE);
    let minX = Math.min(...xs) - 52, maxX = Math.max(...xs) + 52, minY = Math.min(...ys) - 52, maxY = Math.max(...ys) + 52;
    if (maxX - minX < 300) { const c = (minX + maxX) / 2; minX = c - 150; maxX = c + 150; }
    if (maxY - minY < 190) { const c = (minY + maxY) / 2; minY = c - 95; maxY = c + 95; }
    svg.setAttribute('viewBox', `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);
    svg.style.aspectRatio = `${maxX - minX} / ${maxY - minY}`;

    const P = (a) => [a.x * SCALE, a.y * SCALE];
    const el = (tag, attrs = {}, text) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      if (text != null) e.textContent = text;
      return e;
    };
    const maxLp = (a) => (a.el === 'H' ? 1 : 4);
    const word = ['', 'single', 'double', 'triple'];

    function draw(focusKey) {
      svg.textContent = '';
      // bonds
      state.bonds.forEach((b, bi) => {
        const A = state.atoms[b.a], B = state.atoms[b.b];
        const [x1, y1] = P(A), [x2, y2] = P(B);
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
        const sx = x1 + ux * (radius(A.el) + 1), sy = y1 + uy * (radius(A.el) + 1);
        const ex = x2 - ux * (radius(B.el) + 1), ey = y2 - uy * (radius(B.el) + 1);
        const offs = b.order === 1 ? [0] : b.order === 2 ? [-4.5, 4.5] : [-7, 0, 7];
        const g = el('g', { class: 'lb-bond' });
        for (const o of offs) g.appendChild(el('line', { x1: sx - uy * o, y1: sy + ux * o, x2: ex - uy * o, y2: ey + ux * o, class: 'lb-line' }));
        const hit = el('line', { x1: sx, y1: sy, x2: ex, y2: ey, class: 'lb-hit' });
        g.appendChild(hit);
        if (!locked && !finished) {
          g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
          g.setAttribute('data-key', 'b' + bi);
          g.setAttribute('aria-label', `${word[b.order]} bond between ${A.el} and ${B.el}. Press to change the bond order.`);
          const cyc = () => { b.order = b.order % 3 + 1; sel = sel; announce(`${A.el}–${B.el} bond is now ${word[b.order]}.`); draw('b' + bi); };
          g.addEventListener('click', cyc);
          g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cyc(); } });
        }
        svg.appendChild(g);
      });
      // atoms, lone pairs, charges
      state.atoms.forEach((a, i) => {
        const [x, y] = P(a);
        const r = radius(a.el);
        const g = el('g', { class: 'lb-atom' + (sel === i ? ' sel' : '') });
        if (a.el !== 'H') {
          const occ = bondAngles(state, i).concat([-Math.PI / 4]);
          const angs = freeAngles(occ, a.lp);
          angs.forEach((t, k) => {
            const cx = x + Math.cos(t) * (r + 9), cy = y + Math.sin(t) * (r + 9);
            const px = -Math.sin(t) * 4.5, py = Math.cos(t) * 4.5;
            const pair = el('g', { class: 'lb-lp' + (anim && anim.atom === i && anim.k === k && !reduceMotion() ? ' pop' : '') });
            pair.appendChild(el('circle', { cx: cx + px, cy: cy + py, r: 3.4 }));
            pair.appendChild(el('circle', { cx: cx - px, cy: cy - py, r: 3.4 }));
            g.appendChild(pair);
          });
        }
        g.appendChild(el('circle', { cx: x, cy: y, r, class: 'lb-disc' }));
        g.appendChild(el('text', { x, y: y + 0.5, class: 'lb-el' }, a.el));
        if (a.charge) {
          g.appendChild(el('circle', { cx: x + r * 0.95, cy: y - r * 0.95, r: 9, class: 'lb-chg' }));
          g.appendChild(el('text', { x: x + r * 0.95, y: y - r * 0.95 + 0.5, class: 'lb-chgt' }, a.charge > 0 ? '+' : '−'));
        }
        const hitc = el('circle', { cx: x, cy: y, r: r + 10, class: 'lb-hit-atom' });
        g.appendChild(hitc);
        if (!finished) {
          g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('data-key', 'a' + i);
          g.setAttribute('aria-label', `${NAME[a.el] || a.el} atom, ${a.lp} lone pairs, charge ${fmtCharge(a.charge)}. Press to edit.`);
          g.addEventListener('click', () => { sel = i; anim = null; update('a' + i); });
          g.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel = i; update('a' + i); }
            else if (e.key === '+' || e.key === '=') { e.preventDefault(); sel = i; act('lp+'); }
            else if (e.key === '-' || e.key === '_') { e.preventDefault(); sel = i; act('lp-'); }
          });
        }
        svg.appendChild(g);
      });
      if (focusKey) { const t = svg.querySelector(`[data-key="${focusKey}"]`); if (t) t.focus({ preventScroll: true }); }
    }

    function announce(t) { live.textContent = t; }
    function update(focusKey) {
      bar.hidden = sel == null || finished;
      if (sel != null) {
        const a = state.atoms[sel];
        selLabel.textContent = `${NAME[a.el] || a.el} · ${a.lp} lone pair${a.lp === 1 ? '' : 's'}`;
        bar.querySelectorAll('[data-act^="ch"]').forEach((b) => { b.hidden = config.charges === false; b.setAttribute('aria-pressed', String(b.dataset.act === 'ch' + a.charge)); });
      }
      draw(focusKey);
    }
    function act(what) {
      if (sel == null || finished) return;
      const a = state.atoms[sel];
      if (what === 'lp+') { if (a.lp < maxLp(a)) { a.lp++; anim = { atom: sel, k: a.lp - 1 }; announce(`${a.el} now has ${a.lp} lone pairs.`); } }
      else if (what === 'lp-') { if (a.lp > 0) { a.lp--; anim = null; announce(`${a.el} now has ${a.lp} lone pairs.`); } }
      else if (what.startsWith('ch')) { a.charge = parseInt(what.slice(2), 10); anim = null; announce(`${a.el} charge is ${fmtCharge(a.charge)}.`); }
      update('a' + sel);
    }

    bar.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) act(b.dataset.act); });
    host.querySelector('[data-act="reset"]').addEventListener('click', () => {
      if (finished) return;
      const s = initialState(config);
      state.atoms.forEach((a, i) => { a.lp = s.atoms[i].lp; a.charge = s.atoms[i].charge; });
      state.bonds.forEach((b, i) => { b.order = s.bonds[i].order; });
      anim = null; update();
    });
    host.querySelector('[data-act="check"]').addEventListener('click', () => {
      const r = evaluate(state, config);
      if (r.ok) { finished = true; sel = null; update(); host.querySelector('.lb-actions').hidden = true; }
      else if (r.atom != null) { sel = r.atom; update(); }
      ctx.onResult(r);
    });
    update();
    return { destroy() {}, getState: () => state };
  }
};
