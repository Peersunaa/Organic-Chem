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
//                    (immediately under prefers-reduced-motion). The dots are removed when they arrive.
//   after:true       Lesson 08: once the arrows are right they play, then the picture turns into the AFTER state (applyArrows of config.arrows: new bonds and
//                    lone pairs fade in, charges recomputed) with `afterNote` under it, and a "Show before / Show after" toggle (44 px) lets the learner compare.
//   partials         [{atom, sign: "+"|"-"}]: δ+ / δ− labels on the before picture (Lesson 08 still pictures).
//   dashLong:true    the mechanism player's mid-step pictures: a bond longer than 1.45 bond lengths is one an arrow has just made between atoms that have not
//                    moved together yet, so it is drawn dashed ("forming") instead of as a real long bond.
// Tap targets are sized in SCREEN pixels after layout (ResizeObserver): atoms and lone pairs get 44 px where the drawing has room (an atom never more than about a
// third of the way to a neighbour), and every bond has a 44 px-wide hit band (square ends) that stops about 14 px short of each atom centre. Z-order, bottom to top:
// bond bands, atoms, lone pairs: a tap on an atom's centre is always that atom, a tap on a bond's middle always that bond (novice review 2026-10-20, #1).
// A second tap on the electrons already chosen (or on their own atom) keeps the choice and says why: an arrow ends on a DIFFERENT atom or bond (#9).
// Charge badges are placed where they clear every lone-pair dot, bond line and atom (pushed outward until they do). A tap on a badge is a tap on its atom (novice re-test N4).
// Every tap acts or explains (novice re-test 2026-10-20): a tap on the drawing's background goes to the nearest target within about 30 screen px (so a crowded corner,
// a gap between two hydrogens or the space beside a + still reaches an atom); farther away, the status line says what can be tapped. A picture (preset) or a finished
// drawing says so in one line (config.tapNote overrides the picture's line, e.g. the mechanism player's "press Next").
// The "which carbon bonds to H?" question is modal: while it is open the drawing is dimmed, taps and Check only point at the buttons (N1), so a half-specified arrow can
// never be graded. Undo and Clear tell the step (ctx.onProgress({task:true})) so its old verdict and hints go with the arrow they were about (N2).
import { NAME } from '../chem.js';
import { SCALE, radius, P, lpCount, lpPoints, keyOf, grade, badStart, curve, describeSource, describeDest, headAtom, applyArrows } from './arrow-core.js';
import { freeAngles } from './lewis-core.js';

const NS = 'http://www.w3.org/2000/svg';
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

export default {
  id: 'arrow-draw',
  mount(host, config, ctx) {
    let atoms = config.atoms, bonds = config.bonds;      // what is drawn: the config's structure, or the AFTER state once `after` has played
    let view = 'before', afterState = null, destroyed = false, ro = null;
    const preset = !!config.preset;
    let drawn = preset ? config.arrows.map((a) => ({ from: a.from, to: a.to })) : [];       // {from, to}
    const geo = [];       // per drawn arrow: {start, c, end} in px (for the electron animation)
    let src = null;       // {lp: i, t?} | {bond: [i,j]}
    let finished = preset;
    let badIdx = [];
    let lastAdded = -1;
    let chooser = null;   // the 'which carbon bonds to H?' question (regio config only)
    let selfTap = false;  // the last tap tried to end an arrow where it started: Check explains that instead of "draw at least one arrow"
    const SELF_MSG = 'An arrow starts on electrons and ends on a different atom or bond.';
    const CHOOSE_MSG = 'First pick which carbon bonds to H: use the buttons under the drawing (or Cancel).';

    host.innerHTML = `
      <div class="lb ad${preset ? ' ad-preset' : ''}">
        <svg class="lb-svg ad-svg" role="group" aria-label="Curved arrow workspace"></svg>
        <p class="lb-help ad-status" aria-live="polite">${preset ? (config.caption || '') : 'Tap the electrons the arrow starts from (a pair of dots or a bond), then tap where they go.'}</p>
        <p class="ad-tapnote" aria-live="polite" hidden></p>
        <div class="ad-ba" hidden><button type="button" class="btn ghost small" data-act="ba" aria-pressed="false">Show before</button></div>
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

    let lpPts, nLp;
    const recalc = () => { lpPts = atoms.map((_, i) => lpPoints(atoms, bonds, i)); nLp = atoms.map((_, i) => lpCount(atoms, bonds, i)); };
    recalc();
    const vbW = maxX - minX;
    const say = (t) => { status.textContent = t; };
    const tapNote = host.querySelector('.ad-tapnote');
    const note = (t) => { tapNote.textContent = t; tapNote.hidden = false; };
    const doneMsg = () => (config.after ? 'All arrows are right: nothing more to tap. The button below switches between the before and after pictures.' : 'All arrows are right: nothing more to tap here.');
    const bondEnds = (b) => { const A = atoms[b.a], B = atoms[b.b]; return [P(A), P(B)]; };

    function srcPoint(from, toward) {
      if (from.atom != null) {
        // a wrong arrow drawn from an atom (H+): start on the side that faces where it goes, so the tail never sits under the atom's charge badge
        const [ax, ay] = P(atoms[from.atom]), r = radius(atoms[from.atom].el) + 2;
        const dx = toward.x - ax, dy = toward.y - ay, L = Math.hypot(dx, dy) || 1;
        return { x: ax + (dx / L) * r, y: ay + (dy / L) * r };
      }
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
      if (to.atom != null && from && from.bond && from.bond.includes(to.atom)) {
        // a bond pair moving onto one of its own atoms (H–Cl → Cl): the chord from the bond's middle to the atom is tiny, so land on the atom's upper side,
        // half-way between the bond direction and straight up: the arrow becomes a visible hook instead of a 10 px stub
        const B = atoms[to.atom], A = atoms[from.bond[0] === to.atom ? from.bond[1] : from.bond[0]];
        const [bx, by] = P(B), [ax, ay] = P(A);
        const ux = ax - bx, uy = ay - by, L = Math.hypot(ux, uy) || 1;
        let nx = -uy / L, ny = ux / L;
        if (ny > 0 || (Math.abs(ny) < 0.2 && nx < 0)) { nx = -nx; ny = -ny; }
        const dx = nx + 0.7 * (ux / L), dy = ny + 0.7 * (uy / L), M = Math.hypot(dx, dy) || 1;
        const rr = radius(B.el) + 4;
        const ex = bx + (dx / M) * rr, ey = by + (dy / M) * rr;
        // a tall loop: the control point sits well above the bond's middle, so the hook is big enough to see on a phone
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        return { x: ex, y: ey, r: 0, ctrl: { x: (mx + ex) / 2 + nx * 46, y: (my + ey) / 2 + ny * 46 } };
      }
      if (to.atom != null) { const [x, y] = P(atoms[to.atom]); return { x, y, r: radius(atoms[to.atom].el) + 4 }; }
      const nb = from && headAtom(config, { from, to });
      if (nb) { const [x, y] = P(atoms[nb.atom]); return { x, y, r: radius(atoms[nb.atom].el) + 4 }; } // a bond that is about to form
      const [p, q] = [P(atoms[to.bond[0]]), P(atoms[to.bond[1]])];
      return { x: (p[0] + q[0]) / 2, y: (p[1] + q[1]) / 2, r: 4 };
    }

    const segDist = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L2)); return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); };
    /** Where the charge badge of atom i goes: the spot nearest the open gap that clears every lone-pair dot, bond line and other atom; pushed outward until it does. */
    function badgeSpot(i) {
      const a = atoms[i], [x, y] = P(a), r = radius(a.el);
      const bAngs = bonds.filter((b) => b.a === i || b.b === i).map((b) => { const j = b.a === i ? b.b : b.a; return Math.atan2(atoms[j].y - a.y, atoms[j].x - a.x); });
      const [ct] = freeAngles(bAngs.concat(lpPts[i].map((p) => p.t)), 1);
      // every lone-pair DOT (two per pair, 4.5 either side of the pair's centre), not just the pair's centre
      const dots = lpPts.flat().flatMap((p) => { const ox = -Math.sin(p.t) * 4.5, oy = Math.cos(p.t) * 4.5; return [{ x: p.x + ox, y: p.y + oy }, { x: p.x - ox, y: p.y - oy }]; });
      const clear = (cx, cy) => {
        let c = 99;
        for (const p of dots) c = Math.min(c, Math.hypot(cx - p.x, cy - p.y) - 3.4 - 9 - 2);
        for (const b of bonds) { const [p1, p2] = bondEnds(b); c = Math.min(c, segDist(cx, cy, p1[0], p1[1], p2[0], p2[1]) - 2 - 9); }
        atoms.forEach((o, j) => { if (j !== i) { const [ox, oy] = P(o); c = Math.min(c, Math.hypot(cx - ox, cy - oy) - radius(o.el) - 9); } });
        return c;
      };
      const ang = (u, v) => { const d = Math.abs(u - v) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };
      for (const d of [r * 1.35, r * 1.6, r * 1.9, r * 2.3, r * 2.7]) {
        let best = null;
        for (let k = 0; k < 24; k++) {
          const t = ct + (k * Math.PI) / 12, cx = x + Math.cos(t) * d, cy = y + Math.sin(t) * d;
          if (clear(cx, cy) >= 2 && (!best || ang(t, ct) < best.a - 1e-9)) best = { cx, cy, a: ang(t, ct) };
        }
        if (best) return best;
      }
      return { cx: x + Math.cos(ct) * r * 2.7, cy: y + Math.sin(ct) * r * 2.7 };
    }

    /** A quadratic arrow with a given control point (the bond → own-atom hook), in the same shape curve() returns. */
    function hook(p, c, q) {
      const ex = q.x - c.x, ey = q.y - c.y, L = Math.hypot(ex, ey) || 1, t = { x: ex / L, y: ey / L };
      const h = 11, w = 6, base = { x: q.x - t.x * h, y: q.y - t.y * h };
      const head = [[q.x, q.y], [base.x - t.y * w, base.y + t.x * w], [base.x + t.y * w, base.y - t.x * w]];
      const stem = { x: q.x - t.x * (h - 3), y: q.y - t.y * (h - 3) };
      return { d: `M${p.x.toFixed(1)} ${p.y.toFixed(1)} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${stem.x.toFixed(1)} ${stem.y.toFixed(1)}`, head: head.map((v) => v.map((n) => n.toFixed(1)).join(',')).join(' '), ctrl: c, p0: p, stem };
    }

    function draw() {
      svg.textContent = '';
      const bondG = el('g'), hitG = el('g', { class: 'ad-hits' });
      svg.appendChild(bondG);
      svg.appendChild(hitG);      // bond bands BELOW the atoms: the atom targets win at their centres
      // bonds
      bonds.forEach((b) => {
        const A = atoms[b.a], B = atoms[b.b];
        const [x1, y1] = P(A), [x2, y2] = P(B);
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
        const sx = x1 + ux * (radius(A.el) + 1), sy = y1 + uy * (radius(A.el) + 1);
        const ex = x2 - ux * (radius(B.el) + 1), ey = y2 - uy * (radius(B.el) + 1);
        const ord = b.order || 1;
        const offs = ord === 1 ? [0] : ord === 2 ? [-4.5, 4.5] : [-7, 0, 7];
        const isSrc = src && src.bond && keyOf(src) === keyOf({ bond: [b.a, b.b] });
        const forming = config.dashLong && len > 1.45 * SCALE;
        const g = el('g', { class: 'lb-bond ad-bond' + (isSrc ? ' ad-src' : '') + (forming ? ' ad-forming' : ''), 'data-bond': b.a + '-' + b.b });
        for (const o of offs) g.appendChild(el('line', { x1: sx - uy * o, y1: sy + ux * o, x2: ex - uy * o, y2: ey + ux * o, class: 'lb-line' }));
        if (!finished) {
          g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
          g.setAttribute('aria-label', `Bond between ${A.label || A.el} and ${B.label || B.el}. ${src ? 'Press to send the electrons into this bond.' : 'Press to start an arrow from the bond electrons.'}`);
          wire(g, () => tap({ kind: 'bond', bond: [b.a, b.b] }));
          // the hit band runs between the atoms and stops ~14 screen px short of each centre (sizeHits sets its ends); it sits BELOW the atoms
          const hit = el('line', { x1: x1 + (x2 - x1) * 0.3, y1: y1 + (y2 - y1) * 0.3, x2: x1 + (x2 - x1) * 0.7, y2: y1 + (y2 - y1) * 0.7, class: 'lb-hit', 'data-hit': b.a + '-' + b.b });
          hit.addEventListener('click', (e) => { e.stopPropagation(); tap({ kind: 'bond', bond: [b.a, b.b] }); });
          hitG.appendChild(hit);
        }
        bondG.appendChild(g);
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
      // charges (one lb-atom group per charged atom, in atom order: the mechanism player relies on that order)
      atoms.forEach((a, i) => {
        if (!a.charge) return;
        const { cx, cy } = badgeSpot(i);
        const g = el('g', { class: 'lb-atom' + (finished ? '' : ' ad-chgtap') });
        g.appendChild(el('circle', { cx, cy, r: 9, class: 'lb-chg' }));
        g.appendChild(el('text', { x: cx, y: cy + 0.5, class: 'lb-chgt' }, a.charge > 0 ? '+' : '−'));
        if (finished) g.style.pointerEvents = 'none';
        else {
          // the + or − beside an atom is the obvious thing to tap for "the positive carbon": it taps that atom
          g.appendChild(el('circle', { cx, cy, r: 13, class: 'ad-chg-hit' }));
          g.addEventListener('click', (e) => { e.stopPropagation(); tap({ kind: 'atom', atom: i }); });
        }
        svg.appendChild(g);
      });
      // δ+ / δ− labels (config.partials, Lesson 08 still pictures), placed like charge badges: clear of dots, bonds and atoms
      if (view === 'before') (config.partials || []).forEach((pa) => {
        const s = badgeSpot(pa.atom), [ax, ay] = P(atoms[pa.atom]), dx = s.cx - ax, dy = s.cy - ay, L = Math.hypot(dx, dy) || 1;
        const cx = ax + (dx / L) * (L + 8), cy = ay + (dy / L) * (L + 8);   // "δ+" is wider than a charge badge: a little further out, clear of the dots
        svg.appendChild(el('text', { x: cx, y: cy + 0.5, class: 'ad-delta ' + (pa.sign === '+' ? 'pos' : 'neg') }, pa.sign === '+' ? 'δ+' : 'δ−'));
      });
      // arrows
      drawn.forEach((ar, n) => {
        const dest = destPoint(ar.to, ar.from);
        const start = srcPoint(ar.from, dest);
        const c = dest.ctrl ? hook(start, dest.ctrl, dest) : curve(start, dest, dest.r);
        geo[n] = { start, c: c.ctrl, end: c.stem };
        const bad = badIdx.includes(n);
        const g = el('g', { class: 'ad-arrow' + (bad ? ' bad' : '') + (n === lastAdded && !reduceMotion() ? ' draw' : '') });
        g.appendChild(el('path', { d: c.d, class: 'ad-path', pathLength: '1' }));
        g.appendChild(el('polygon', { points: c.head, class: 'ad-head' }));
        g.appendChild(el('circle', { cx: start.x, cy: start.y, r: 3.2, class: 'ad-dot' }));
        svg.appendChild(g);
      });
      sizeHits();
    }

    /** Tap targets in screen pixels: 44 px (radius 22 px) where the drawing allows it. Called after every draw and whenever the drawing is resized. */
    function sizeHits() {
      if (finished || !svg.isConnected) return;
      const w = svg.getBoundingClientRect().width;
      if (!w) return;
      const k = w / vbW, want = 22 / k;
      const near = atoms.map((a, i) => Math.min(9e9, ...atoms.map((o, j) => (j === i ? 9e9 : Math.hypot(o.x - a.x, o.y - a.y) * SCALE))));
      // an atom target: 44 px where it fits, never more than ~36 % of the way to its nearest neighbour, so the middle of every bond stays the bond's
      svg.querySelectorAll('.ad-atom').forEach((g) => {
        const i = Number(g.dataset.atom), c = g.querySelector('.lb-hit-atom');
        if (c) c.setAttribute('r', Math.max(radius(atoms[i].el) + 4, Math.min(want, near[i] * 0.36)).toFixed(1));
      });
      // pairs on the SAME atom may overlap (any of them starts the same arrow); pairs of different atoms never do
      const pts = [...svg.querySelectorAll('.ad-hit-lp')];
      const xy = pts.map((c) => [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]);
      const own = pts.map((c) => c.parentNode.dataset.lp.split('-')[0]);
      pts.forEach((c, n) => {
        const d = Math.min(9e9, ...xy.map((q, m) => (m === n || own[m] === own[n] ? 9e9 : Math.hypot(q[0] - xy[n][0], q[1] - xy[n][1]))));
        const [ax, ay] = P(atoms[Number(own[n])]), toCentre = Math.hypot(xy[n][0] - ax, xy[n][1] - ay) - 6;   // never over the atom's own centre: that tap is the atom
        c.setAttribute('r', Math.max(10, Math.min(want, d * 0.5, 27, toCentre)).toFixed(1));
      });
      // bond bands: 44 px wide, square ends ~14 px short of each atom centre (at least the middle 30 % of a very short bond)
      const stop = 14 / k;
      svg.querySelectorAll('.ad-hits .lb-hit').forEach((l) => {
        const [ia, ib] = l.dataset.hit.split('-').map(Number);
        const [x1, y1] = P(atoms[ia]), [x2, y2] = P(atoms[ib]);
        const f = Math.min(0.35, stop / (Math.hypot(x2 - x1, y2 - y1) || 1));
        l.setAttribute('x1', (x1 + (x2 - x1) * f).toFixed(1)); l.setAttribute('y1', (y1 + (y2 - y1) * f).toFixed(1));
        l.setAttribute('x2', (x2 - (x2 - x1) * f).toFixed(1)); l.setAttribute('y2', (y2 - (y2 - y1) * f).toFixed(1));
        l.style.strokeWidth = Math.max(30, Math.min(2 * want, 46)).toFixed(1);
      });
    }
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => sizeHits()); ro.observe(svg); }

    function wire(g, fn) {
      g.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } else if (e.key === 'Escape' && src) { src = null; say('Arrow cancelled.'); draw(); } });
    }

    function closeChooser() { if (chooser) { chooser.remove(); chooser = null; } svg.classList.remove('ad-wait'); }
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
          drawn.push({ from, to }); lastAdded = drawn.length - 1; src = null; selfTap = false;
          say(`Arrow added: ${addedText(from, to)}. Add another arrow or press Check.`);
          draw();
          ctx.onProgress?.();
        });
        row.appendChild(b);
      });
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn ghost'; cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => { closeChooser(); src = null; say('Arrow cancelled. Tap the electrons the arrow starts from.'); draw(); });
      row.appendChild(cancel);
      chooser.appendChild(row);
      host.querySelector('.ad').insertBefore(chooser, host.querySelector('.lb-actions'));
      svg.classList.add('ad-wait');
      say(`The π electrons form a new bond to H. Which carbon of the ${rg.bondWord === 'triple bond' ? 'C≡C' : 'C=C'} does H bond to? Answer with the buttons below before you go on.`);
      row.querySelector('button').focus({ preventScroll: true });
      chooser.scrollIntoView?.({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
    }

    function tap(t) {
      if (finished) { note(doneMsg()); return; }
      if (chooser) { say(CHOOSE_MSG); chooser.querySelector('button')?.focus({ preventScroll: true }); return; }   // modal: the open question is answered first (N1)
      badIdx = [];
      if (!src) {
        if (t.kind === 'lp') { src = { lp: t.atom, k: t.k }; }
        else if (t.kind === 'bond') { src = { bond: t.bond }; }
        else if (nLp[t.atom] > 0) { src = { lp: t.atom, k: 0 }; }
        else { const d = badStart(config, t.atom); say(d); ctx.onResult({ ok: false, diagnosis: d, code: 'start' }); return; }
        selfTap = false;
        say(src.bond ? `Bond electrons selected (${describeSource(config, { bond: src.bond })}). Now tap the atom that receives them.` : `Lone pair on ${atoms[src.lp].label || atoms[src.lp].el} selected${t.kind === 'atom' ? ' (an arrow starts on the dots, so it starts from one of its lone pairs)' : ''}. Now tap the atom that receives the electrons.`);
        draw();
        ctx.onProgress?.();
        return;
      }
      // second tap: destination. Ending where it starts (the same pair or bond, or the pair's own atom) keeps the choice and says why (novice review #9)
      const same = (src.lp != null && ((t.kind === 'lp' || t.kind === 'atom') && t.atom === src.lp)) || (src.bond && t.kind === 'bond' && keyOf({ bond: t.bond }) === keyOf({ bond: src.bond }));
      if (same) { selfTap = true; say(SELF_MSG + ' These electrons are still selected: tap where they go (or press Clear to start again).'); return; }
      const from = src.bond ? { bond: src.bond } : { lp: src.lp };
      const to = t.kind === 'bond' ? { bond: t.bond } : { atom: t.atom };
      const rgHit = config.regio && from.bond && to.atom != null && [config.regio, ...(config.regio.alt || [])].find((r) => keyOf(from) === keyOf({ bond: r.pi }) && to.atom === r.H);
      if (rgHit) { askEnd(rgHit); return; }
      if (drawn.some((d) => keyOf(d.from) + '>' + keyOf(d.to) === keyOf(from) + '>' + keyOf(to))) { src = null; say('You already drew that arrow.'); draw(); return; }
      drawn.push({ from, to });
      lastAdded = drawn.length - 1;
      src = null; selfTap = false;
      say(`Arrow added: ${addedText(from, to)}. Add another arrow or press Check.`);
      draw();
      ctx.onProgress?.();         // a stale "Draw at least one arrow" box goes as soon as an arrow exists (novice review #5)
    }
    /** "the C=C bond electrons make a new bond to H" for a bond pointed at an atom outside it (that is what the arrow means), else arrow-core's wording. */
    function addedText(from, to) {
      if (from.bond && to.atom != null && !from.bond.includes(to.atom)) return `${describeSource(config, from)} make a new bond to ${atoms[to.atom].label || atoms[to.atom].el}`;
      return `${describeSource(config, from)} ${describeDest(config, from, to)}`;
    }

    // Undo and Clear: the step's last verdict and hints were about the arrows that are now gone, so they go too (ctx.onProgress({task:true}), N2)
    host.querySelector('[data-act="undo"]').addEventListener('click', () => {
      if (finished) return;
      const had = chooser || src ? 'sel' : drawn.length ? 'arrow' : '';
      closeChooser(); if (had === 'arrow') drawn.pop(); badIdx = []; src = null; lastAdded = -1; selfTap = false;
      say(had === 'sel' ? 'Selection cancelled. Tap the electrons the arrow starts from.' : had === 'arrow' ? (drawn.length ? 'Last arrow removed.' : 'Last arrow removed. Tap the electrons the next arrow starts from.') : 'There is no arrow to remove yet. Tap the electrons the arrow starts from.');
      draw(); ctx.onProgress?.({ task: true });
    });
    host.querySelector('[data-act="reset"]').addEventListener('click', () => { if (finished) return; closeChooser(); drawn = []; badIdx = []; src = null; lastAdded = -1; selfTap = false; say('Cleared. Tap the electrons the arrow starts from.'); draw(); ctx.onProgress?.({ task: true }); });
    // a tap on the background: the nearest target within ~30 screen px, else one line saying what can be tapped
    function nearestTarget(x, y) {
      let best = null;
      const put = (d, t) => { if (!best || d < best.d) best = { d, t }; };
      atoms.forEach((a, i) => { const [ax, ay] = P(a); put(Math.hypot(x - ax, y - ay) - radius(a.el) * 0.5, { kind: 'atom', atom: i }); });
      lpPts.forEach((pts, i) => pts.forEach((p, k) => put(Math.hypot(x - p.x, y - p.y), { kind: 'lp', atom: i, k })));
      bonds.forEach((b) => { const [p1, p2] = bondEnds(b); put(segDist(x, y, p1[0], p1[1], p2[0], p2[1]) + 6, { kind: 'bond', bond: [b.a, b.b] }); });
      return best;
    }
    svg.addEventListener('click', (e) => {
      if (!preset && !finished && e.target.closest && e.target.closest('.ad-atom, .ad-lp, .ad-bond, .lb-hit, .ad-chgtap')) return;   // a live target handles its own tap
      if (preset) { note(config.tapNote || 'This picture is for looking at: there is nothing to tap here.'); return; }
      if (finished) { note(doneMsg()); return; }
      if (chooser) { say(CHOOSE_MSG); return; }
      const r = svg.getBoundingClientRect(), ctm = svg.getScreenCTM && svg.getScreenCTM();
      if (r.width && ctm) {
        const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        const q = pt.matrixTransform(ctm.inverse()), best = nearestTarget(q.x, q.y);
        if (best && best.d <= 30 * (vbW / r.width)) { tap(best.t); return; }
      }
      say(src ? 'Nothing to tap there. Tap the atom (a letter) or the bond (a line) the electrons go to.' : 'Nothing to tap there. Tap a pair of dots (a lone pair) or a line (a bond) to start an arrow.');
    });
    host.querySelector('[data-act="check"]').addEventListener('click', () => {
      if (finished) return;
      if (chooser) { say(CHOOSE_MSG); chooser.querySelector('button')?.focus({ preventScroll: true }); return; }   // never grade a half-drawn arrow (N1)
      let r = config.judge ? config.judge(drawn) : grade(config, drawn);   // Lesson 11: config.judge(drawn) -> {ok, diagnosis, wrong?, message?} replaces grading against config.arrows (resonance-drawer)
      if (!r.ok && !drawn.length && selfTap) r = { ...r, code: 'self', diagnosis: `${SELF_MSG} Your last tap ended the arrow where it started. Tap the electrons first (dots or a line), then a DIFFERENT atom: the one that receives them.` };
      badIdx = r.wrong || [];
      if (r.ok) { finished = true; host.querySelector('.lb-actions').hidden = true; say(r.message || 'All arrows correct.'); }
      lastAdded = -1;
      draw();
      ctx.onResult(r);
      if (r.ok && config.after) play().then(() => { if (!destroyed) showAfter(true); });
    });
    // ---------------------------------------------------------------- before / after (config.after)
    const baRow = host.querySelector('.ad-ba'), baBtn = host.querySelector('[data-act="ba"]');
    const bondKeys = (bs) => new Set(bs.map((b) => keyOf({ bond: [b.a, b.b] }) + ':' + (b.order || 1)));
    function showAfter(fade) {
      if (!afterState) {
        const st = applyArrows({ atoms: config.atoms, bonds: config.bonds, arrows: config.arrows });
        afterState = { atoms: st.atoms.map((a, i) => ({ el: a.el, x: a.x, y: a.y, charge: a.charge, label: config.atoms[i].label })), bonds: st.bonds };
      }
      const lp0 = nLp.slice(), k0 = bondKeys(bonds);
      view = 'after'; atoms = afterState.atoms; bonds = afterState.bonds; recalc();
      const keep = drawn; drawn = []; draw(); drawn = keep;
      if (fade && !reduceMotion()) {
        bonds.forEach((b) => { if (!k0.has(keyOf({ bond: [b.a, b.b] }) + ':' + (b.order || 1))) svg.querySelector(`[data-bond="${b.a}-${b.b}"]`)?.classList.add('mp-new'); });
        nLp.forEach((v, i) => { if (v > lp0[i]) svg.querySelectorAll(`[data-lp^="${i}-"]`).forEach((g) => g.classList.add('mp-new')); });
      }
      say(config.afterNote || 'After the arrow: the electrons are where the arrow pointed.');
      baRow.hidden = false; baBtn.textContent = 'Show before'; baBtn.setAttribute('aria-pressed', 'false');
    }
    function showBefore() {
      view = 'before'; atoms = config.atoms; bonds = config.bonds; recalc(); draw();
      say(config.beforeNote || 'Before: the arrow starts at the electrons and points to where they go.');
      baBtn.textContent = 'Show after'; baBtn.setAttribute('aria-pressed', 'true');
    }
    baBtn.addEventListener('click', () => { if (view === 'after') showBefore(); else showAfter(false); });
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
    return { destroy() { destroyed = true; if (ro) ro.disconnect(); }, getDrawn: () => drawn, play, showAfter: () => showAfter(false) };
  }
};
