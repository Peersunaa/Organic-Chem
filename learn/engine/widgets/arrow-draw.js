// Widget: curved-arrow placement. Tap the electrons an arrow starts from (a lone pair or a bond),
// then tap where they go (an atom, or a bond). Graded against config.arrows, order-insensitive.
//
// config: { atoms:[{el,x,y,charge?,label?}], bonds:[{a,b,order}], arrows:[{from:{lp:i}|{bond:[i,j]}, to:{atom:i}|{bond:[i,j]}, note?, missing?}],
//           products?: [smiles], extraHint? }
// Lone pairs are computed from the structure, never listed in the config.
// Extras (Lesson 08, all optional): to:{bond:[c,k]} where the bond does not exist yet = "form a new bond"; the head points at the far atom k.
//   preset:true      show config.arrows as already drawn (no tapping, no buttons); with arrows:[] it is a plain scene viewer.
//                    A preset arrow may start at an atom (from:{atom:i}) so a WRONG mechanism can be shown ("arrow from H+").
//   caption          text under a preset scene.
//   regio            Lesson 09: {pi:[hC,pC], H, ends:[{idx,text},{idx,text}], wrongWhy}. When the learner sends the pi bond [hC,pC] to the atom H, a two-button question
//                    asks which carbon bonds to H (the arrow is stored as to:{bond:[carbon,H]}). arrow-core grade() gives wrongWhy for the wrong end.
//   judge(drawn)     Lesson 11: replaces the grading against config.arrows (no expected arrows needed); returns {ok, diagnosis, wrong?: [arrow indices], message?}.
//   regio.alt        Lesson 11: more {pi, H, ends} for the mirror-image C=C of a symmetric diene (the question is asked for either C=C).
//   play()           (returned) animates the drawn arrows and sends two electron dots along each curve; resolves when finished
//                    (immediately under prefers-reduced-motion).
import { NAME } from '../chem.js';
import { SCALE, radius, P, lpCount, lpPoints, keyOf, grade, badStart, curve, describeSource, describeDest, headAtom } from './arrow-core.js';
import { freeAngles } from './lewis-core.js';

const NS = 'http://www.w3.org/2000/svg';
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

export default {
  id: 'arrow-draw',
  mount(host, config, ctx) {
    const { atoms, bonds } = config;
    const preset = !!config.preset;
    let drawn = preset ? config.arrows.map((a) => ({ from: a.from, to: a.to })) : [];       // {from, to}
    const geo = [];       // per drawn arrow: {start, c, end} in px (for the electron animation)
    let src = null;       // {lp: i, t?} | {bond: [i,j]}
    let finished = preset;
    let badIdx = [];
    let lastAdded = -1;
    let chooser = null;   // the 'which carbon bonds to H?' question (regio config only)

    host.innerHTML = `
      <div class="lb ad">
        <svg class="lb-svg ad-svg" role="group" aria-label="Curved arrow workspace"></svg>
        <p class="lb-help ad-status" aria-live="polite">${preset ? (config.caption || '') : 'Tap the electrons the arrow starts from (a pair of dots or a bond), then tap where they go.'}</p>
        <div class="lb-actions"${preset ? ' hidden' : ''}>
          <button type="button" class="btn ghost" data-act="undo">Undo arrow</button>
          <button type="button" class="btn ghost" data-act="reset">Clear</button>
          <button type="button" class="btn primary" data-act="check">Check</button>
        </div>
      </div>`;
    const svg = host.querySelector('.ad-svg');
    const status = host.querySelector('.ad-status');
    const el = (tag, attrs = {}, text) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      if (text != null) e.textContent = text;
      return e;
    };

    const xs = atoms.map((a) => a.x * SCALE), ys = atoms.map((a) => a.y * SCALE);
    let minX = Math.min(...xs) - 56, maxX = Math.max(...xs) + 56, minY = Math.min(...ys) - 78, maxY = Math.max(...ys) + 56;
    if (maxX - minX < 300) { const c = (minX + maxX) / 2; minX = c - 150; maxX = c + 150; }
    if (maxY - minY < 200) { const c = (minY + maxY) / 2; minY = c - 100; maxY = c + 100; }
    svg.setAttribute('viewBox', `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);
    svg.style.aspectRatio = `${maxX - minX} / ${maxY - minY}`;

    const lpPts = atoms.map((_, i) => lpPoints(atoms, bonds, i));
    const nLp = atoms.map((_, i) => lpCount(atoms, bonds, i));
    const say = (t) => { status.textContent = t; };
    const bondEnds = (b) => { const A = atoms[b.a], B = atoms[b.b]; return [P(A), P(B)]; };

    function srcPoint(from, toward) {
      if (from.atom != null) { const [ax, ay] = P(atoms[from.atom]); return { x: ax, y: ay - radius(atoms[from.atom].el) * 0.9 }; }
      if (from.bond) {
        const [p, q] = [P(atoms[from.bond[0]]), P(atoms[from.bond[1]])];
        return { x: (p[0] + q[0]) / 2, y: (p[1] + q[1]) / 2 };
      }
      const pts = lpPts[from.lp];
      let best = pts[0], bd = 9;
      const [cx, cy] = P(atoms[from.lp]);
      const want = Math.atan2(toward.y - cy, toward.x - cx);
      for (const p of pts) { let d = Math.abs(p.t - want) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d; if (d < bd) { bd = d; best = p; } }
      return { x: best.x, y: best.y };
    }
    function destPoint(to, from) {
      if (to.atom != null) { const [x, y] = P(atoms[to.atom]); return { x, y, r: radius(atoms[to.atom].el) + 4 }; }
      const nb = from && headAtom(config, { from, to });
      if (nb) { const [x, y] = P(atoms[nb.atom]); return { x, y, r: radius(atoms[nb.atom].el) + 4 }; } // a bond that is about to form
      const [p, q] = [P(atoms[to.bond[0]]), P(atoms[to.bond[1]])];
      return { x: (p[0] + q[0]) / 2, y: (p[1] + q[1]) / 2, r: 4 };
    }

    function draw() {
      svg.textContent = '';
      // bonds
      bonds.forEach((b, bi) => {
        const A = atoms[b.a], B = atoms[b.b];
        const [x1, y1] = P(A), [x2, y2] = P(B);
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
        const sx = x1 + ux * (radius(A.el) + 1), sy = y1 + uy * (radius(A.el) + 1);
        const ex = x2 - ux * (radius(B.el) + 1), ey = y2 - uy * (radius(B.el) + 1);
        const ord = b.order || 1;
        const offs = ord === 1 ? [0] : ord === 2 ? [-4.5, 4.5] : [-7, 0, 7];
        const isSrc = src && src.bond && keyOf(src) === keyOf({ bond: [b.a, b.b] });
        const g = el('g', { class: 'lb-bond ad-bond' + (isSrc ? ' ad-src' : ''), 'data-bond': b.a + '-' + b.b });
        for (const o of offs) g.appendChild(el('line', { x1: sx - uy * o, y1: sy + ux * o, x2: ex - uy * o, y2: ey + ux * o, class: 'lb-line' }));
        g.appendChild(el('line', { x1: sx, y1: sy, x2: ex, y2: ey, class: 'lb-hit' }));
        if (!finished) {
          g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
          g.setAttribute('aria-label', `Bond between ${A.label || A.el} and ${B.label || B.el}. ${src ? 'Press to send the electrons into this bond.' : 'Press to start an arrow from the bond electrons.'}`);
          wire(g, () => tap({ kind: 'bond', bond: [b.a, b.b] }));
        }
        svg.appendChild(g);
      });
      // atoms
      atoms.forEach((a, i) => {
        const [x, y] = P(a);
        const r = radius(a.el);
        const g = el('g', { class: 'lb-atom ad-atom', 'data-atom': i });
        g.appendChild(el('circle', { cx: x, cy: y, r, class: 'lb-disc' }));
        g.appendChild(el('text', { x, y: y + 0.5, class: 'lb-el' }, a.el));
        g.appendChild(el('circle', { cx: x, cy: y, r: r + 8, class: 'lb-hit-atom' }));
        if (!finished) {
          g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
          g.setAttribute('aria-label', `${NAME[a.el] || a.el} atom${a.label ? ' (' + a.label + ')' : ''}, ${nLp[i]} lone pair${nLp[i] === 1 ? '' : 's'}. ${src ? 'Press to send the electrons to this atom.' : 'Press to start an arrow here.'}`);
          wire(g, () => tap({ kind: 'atom', atom: i }));
        }
        svg.appendChild(g);
      });
      // lone pairs (on top of the atom hit areas so they can be tapped on their own)
      atoms.forEach((a, i) => {
        lpPts[i].forEach((p, k) => {
          const t = p.t;
          const px = -Math.sin(t) * 4.5, py = Math.cos(t) * 4.5;
          const isSrc = src && src.lp === i && src.k === k;
          const g = el('g', { class: 'lb-lp ad-lp' + (isSrc ? ' ad-src' : ''), 'data-lp': i + '-' + k });
          g.appendChild(el('circle', { cx: p.x + px, cy: p.y + py, r: 3.4 }));
          g.appendChild(el('circle', { cx: p.x - px, cy: p.y - py, r: 3.4 }));
          g.appendChild(el('circle', { cx: p.x, cy: p.y, r: 13, class: 'ad-hit-lp' }));
          if (!finished) {
            g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
            g.setAttribute('aria-label', `Lone pair on ${a.label || a.el}. ${src ? 'Press to send the electrons to this atom.' : 'Press to start an arrow from this lone pair.'}`);
            wire(g, () => tap({ kind: 'lp', atom: i, k }));
          }
          svg.appendChild(g);
        });
      });
      // charges
      atoms.forEach((a, i) => {
        if (!a.charge) return;
        const [x, y] = P(a), r = radius(a.el);
        const bAngs = bonds.filter((b) => b.a === i || b.b === i).map((b) => { const j = b.a === i ? b.b : b.a; return Math.atan2(atoms[j].y - a.y, atoms[j].x - a.x); });
        const [ct] = freeAngles(bAngs.concat(lpPts[i].map((p) => p.t)), 1);
        const cx = x + Math.cos(ct) * r * 1.35, cy = y + Math.sin(ct) * r * 1.35;
        const g = el('g', { class: 'lb-atom' });
        g.appendChild(el('circle', { cx, cy, r: 9, class: 'lb-chg' }));
        g.appendChild(el('text', { x: cx, y: cy + 0.5, class: 'lb-chgt' }, a.charge > 0 ? '+' : '−'));
        g.style.pointerEvents = 'none';
        svg.appendChild(g);
      });
      // arrows
      drawn.forEach((ar, n) => {
        const dest = destPoint(ar.to, ar.from);
        const start = srcPoint(ar.from, dest);
        const c = curve(start, dest, dest.r);
        geo[n] = { start, c: c.ctrl, end: c.stem };
        const bad = badIdx.includes(n);
        const g = el('g', { class: 'ad-arrow' + (bad ? ' bad' : '') + (n === lastAdded && !reduceMotion() ? ' draw' : '') });
        g.appendChild(el('path', { d: c.d, class: 'ad-path', pathLength: '1' }));
        g.appendChild(el('polygon', { points: c.head, class: 'ad-head' }));
        g.appendChild(el('circle', { cx: start.x, cy: start.y, r: 3.2, class: 'ad-dot' }));
        svg.appendChild(g);
      });
    }

    function wire(g, fn) {
      g.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } else if (e.key === 'Escape' && src) { src = null; say('Arrow cancelled.'); draw(); } });
    }

    function closeChooser() { if (chooser) { chooser.remove(); chooser = null; } }
    function askEnd(rg = config.regio) {
      closeChooser();
      chooser = document.createElement('div');
      chooser.className = 'ad-regio';
      chooser.setAttribute('role', 'group');
      chooser.innerHTML = `<p class="ad-regio-q"><b>Which carbon of the ${rg.bondWord || 'double bond'} bonds to H?</b></p>`;   // Lesson 12: bondWord 'triple bond' for alkynes
      const row = document.createElement('div'); row.className = 'ad-regio-row';
      rg.ends.forEach((e) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = e.text[0].toUpperCase() + e.text.slice(1);
        b.addEventListener('click', () => {
          const other = rg.pi.find((c) => c !== e.idx);
          const from = { bond: [e.idx, other] }, to = { bond: [e.idx, rg.H] };
          closeChooser();
          drawn.push({ from, to }); lastAdded = drawn.length - 1; src = null;
          say(`Arrow added: ${describeSource(config, from)} ${describeDest(config, from, to)}. Add another arrow or press Check.`);
          draw();
        });
        row.appendChild(b);
      });
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn ghost'; cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => { closeChooser(); src = null; say('Arrow cancelled. Tap the electrons the arrow starts from.'); draw(); });
      row.appendChild(cancel);
      chooser.appendChild(row);
      host.querySelector('.ad').insertBefore(chooser, host.querySelector('.lb-actions'));
      say(`The π electrons form a new bond to H. Which carbon of the ${rg.bondWord === 'triple bond' ? 'C≡C' : 'C=C'} does H bond to?`);
      row.querySelector('button').focus({ preventScroll: true });
    }

    function tap(t) {
      if (finished) return;
      badIdx = [];
      if (chooser) closeChooser();
      if (!src) {
        if (t.kind === 'lp') { src = { lp: t.atom, k: t.k }; }
        else if (t.kind === 'bond') { src = { bond: t.bond }; }
        else if (nLp[t.atom] > 0) { src = { lp: t.atom, k: 0 }; }
        else { const d = badStart(config, t.atom); say(d); ctx.onResult({ ok: false, diagnosis: d, code: 'start' }); return; }
        say(src.bond ? `Bond electrons selected (${describeSource(config, { bond: src.bond })}). Now tap the atom that receives them.` : `Lone pair on ${atoms[src.lp].label || atoms[src.lp].el} selected. Now tap the atom that receives the electrons.`);
        draw();
        return;
      }
      // second tap: destination
      const same = (src.lp != null && (t.kind === 'lp' && t.atom === src.lp && t.k === src.k)) || (src.bond && t.kind === 'bond' && keyOf({ bond: t.bond }) === keyOf({ bond: src.bond }));
      if (same) { src = null; say('Arrow cancelled. Tap the electrons the arrow starts from.'); draw(); return; }
      const from = src.bond ? { bond: src.bond } : { lp: src.lp };
      const to = t.kind === 'bond' ? { bond: t.bond } : { atom: t.atom };
      const rgHit = config.regio && from.bond && to.atom != null && [config.regio, ...(config.regio.alt || [])].find((r) => keyOf(from) === keyOf({ bond: r.pi }) && to.atom === r.H);
      if (rgHit) { askEnd(rgHit); return; }
      if (to.atom != null && from.lp === to.atom) { say('An arrow cannot point back to its own atom. Tap the atom that receives the electrons.'); return; }
      if (drawn.some((d) => keyOf(d.from) + '>' + keyOf(d.to) === keyOf(from) + '>' + keyOf(to))) { src = null; say('You already drew that arrow.'); draw(); return; }
      drawn.push({ from, to });
      lastAdded = drawn.length - 1;
      src = null;
      say(`Arrow added: ${describeSource(config, from)} ${describeDest(config, from, to)}. Add another arrow or press Check.`);
      draw();
    }

    host.querySelector('[data-act="undo"]').addEventListener('click', () => { if (finished) return; closeChooser(); drawn.pop(); badIdx = []; src = null; lastAdded = -1; say('Last arrow removed.'); draw(); });
    host.querySelector('[data-act="reset"]').addEventListener('click', () => { if (finished) return; closeChooser(); drawn = []; badIdx = []; src = null; lastAdded = -1; say('Cleared. Tap the electrons the arrow starts from.'); draw(); });
    host.querySelector('[data-act="check"]').addEventListener('click', () => {
      if (finished) return;
      const r = config.judge ? config.judge(drawn) : grade(config, drawn);   // Lesson 11: config.judge(drawn) -> {ok, diagnosis, wrong?, message?} replaces grading against config.arrows (resonance-drawer)
      badIdx = r.wrong || [];
      if (r.ok) { finished = true; host.querySelector('.lb-actions').hidden = true; say(r.message || 'All arrows correct.'); }
      lastAdded = -1;
      draw();
      ctx.onResult(r);
    });
    function play() {
      const groups = [...svg.querySelectorAll('.ad-arrow')];
      if (!groups.length || reduceMotion()) return Promise.resolve();
      groups.forEach((g) => g.classList.add('pre'));
      return Promise.all(groups.map((g, n) => new Promise((resolve) => {
        setTimeout(() => {
          g.classList.remove('pre', 'draw'); void g.getBoundingClientRect(); g.classList.add('draw');
          setTimeout(() => {
            const q = geo[n];
            const e1 = el('circle', { r: 3.6, class: 'ad-e' }), e2 = el('circle', { r: 3.6, class: 'ad-e' });
            svg.append(e1, e2);
            const T = 850, t0 = performance.now();
            const at = (t) => ({ x: (1 - t) * (1 - t) * q.start.x + 2 * (1 - t) * t * q.c.x + t * t * q.end.x, y: (1 - t) * (1 - t) * q.start.y + 2 * (1 - t) * t * q.c.y + t * t * q.end.y });
            const step = (now) => {
              const u = Math.min(1, (now - t0) / T), t = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
              const a = at(t), b = at(Math.max(0, t - 0.06));
              e1.setAttribute('cx', a.x.toFixed(1)); e1.setAttribute('cy', a.y.toFixed(1));
              e2.setAttribute('cx', b.x.toFixed(1)); e2.setAttribute('cy', b.y.toFixed(1));
              if (u < 1) requestAnimationFrame(step); else { e1.remove(); e2.remove(); resolve(); }
            };
            requestAnimationFrame(step);
          }, 420);
        }, n * 320);
      })));
    }
    draw();
    return { destroy() {}, getDrawn: () => drawn, play };
  }
};
