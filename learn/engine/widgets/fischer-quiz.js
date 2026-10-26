// Widget: fischer-quiz (Lesson 16; reusable, also serves the practice generator "fischer"). Draws Fischer projections as plain SVG and asks about them.
//   { mode:'view', figures:[{ entry, xSide:'right'|'left', caption? }] | entry, xSide, depth?, numbers?, arrow? }
//        a picture only: depth = wedges for horizontal (toward you) and dashes for vertical (away), numbers = CIP priority badges, arrow = 1 -> 2 -> 3.
//   { plan:['rs-h','rs-v','rs-h','manip'] } or { rounds:[round...] }   rounds come from engine/generators-fischer.js (fresh each time the widget mounts).
//        R/S round: pick R or S. Manipulation round: A and B drawn, say whether B is the same molecule or the enantiomer.
// The ANSWER of every round is computed by readRS() / relationOf() in engine/fischer.js (never typed in) and is re-derived in Python RDKit by the tests.
import { POSITIONS, POOL_BY_ID, standardDrawing, readRS, isVertical } from '../fischer.js';
import { buildRounds, gradeRound } from '../generators-fischer.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const XY = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };   // SVG coordinates: y grows downward
const C = 120;
let uid = 0;

const elClass = (label) => (label === 'OH' ? 'fq-O' : label === 'NH₂' ? 'fq-N' : label === 'Cl' ? 'fq-Cl' : label === 'Br' ? 'fq-Br' : '');
const num = (x) => Math.round(x * 100) / 100;

/** SVG markup of one Fischer projection. d = { top, right, bottom, left } each { label, rank }. opts: { depth, numbers, arrow, label }. */
export function fischerSvg(d, opts = {}) {
  const id = 'fqa' + (uid++);
  const parts = [];
  parts.push(`<svg class="fq-svg" viewBox="0 0 240 240" role="img" aria-label="${opts.label || 'Fischer projection'}: ${POSITIONS.map((p) => `${p} ${d[p].label}`).join(', ')}" xmlns="http://www.w3.org/2000/svg">`);
  parts.push(`<defs><marker id="${id}" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L9,4.5 L0,9 z" class="fq-head"/></marker></defs>`);
  // bonds
  for (const p of POSITIONS) {
    const [ux, uy] = XY[p];
    const ex = C + ux * 50, ey = C + uy * 50;
    if (!opts.depth) { parts.push(`<line class="fq-bond" x1="${C}" y1="${C}" x2="${ex}" y2="${ey}"/>`); continue; }
    const px = -uy, py = ux;                                      // perpendicular
    if (!isVertical(p)) {
      parts.push(`<polygon class="fq-wedge" points="${C},${C} ${num(ex + px * 6)},${num(ey + py * 6)} ${num(ex - px * 6)},${num(ey - py * 6)}"/>`);
    } else {
      for (let k = 1; k <= 7; k++) {
        const t = k / 7, w = 0.5 + 6 * t;
        const x = C + ux * 50 * t, y = C + uy * 50 * t;
        parts.push(`<line class="fq-hash" x1="${num(x + px * w)}" y1="${num(y + py * w)}" x2="${num(x - px * w)}" y2="${num(y - py * w)}"/>`);
      }
    }
  }
  parts.push(`<circle class="fq-core" cx="${C}" cy="${C}" r="3"/>`);
  // the 1 -> 2 -> 3 arrow
  if (opts.arrow) {
    const r = readRS(d), R = 40;
    const ang = { right: 0, top: 90, left: 180, bottom: 270 };
    const pt = (pos) => [C + R * Math.cos(ang[pos] * Math.PI / 180), C - R * Math.sin(ang[pos] * Math.PI / 180)];
    const ccw = r.dir === 'ccw';
    const delta = (a, b) => { const x = ccw ? b - a : a - b; return ((x % 360) + 360) % 360; };
    const [p1, p2, p3] = r.order;
    const seg = (a, b) => `A ${R} ${R} 0 ${delta(ang[a], ang[b]) > 180 ? 1 : 0} ${ccw ? 0 : 1} ${num(pt(b)[0])} ${num(pt(b)[1])}`;
    parts.push(`<path class="fq-arrow" d="M ${num(pt(p1)[0])} ${num(pt(p1)[1])} ${seg(p1, p2)} ${seg(p2, p3)}" marker-end="url(#${id})"/>`);
  }
  // labels (and priority badges)
  const L = { top: [C, 40, 'middle'], bottom: [C, 214, 'middle'], left: [C - 58, C + 6, 'end'], right: [C + 58, C + 6, 'start'] };
  for (const p of POSITIONS) {
    const [x, y, a] = L[p];
    parts.push(`<text class="fq-lab ${elClass(d[p].label)}" x="${x}" y="${y}" text-anchor="${a}">${d[p].label}</text>`);
    if (opts.numbers) {
      const [ux, uy] = XY[p];
      const bx = C + ux * 27 + (-uy) * 12, by = C + uy * 27 + ux * 12;
      parts.push(`<circle class="fq-badge" cx="${num(bx)}" cy="${num(by)}" r="9"/><text class="fq-num" x="${num(bx)}" y="${num(by + 4.5)}" text-anchor="middle">${d[p].rank}</text>`);
    }
  }
  parts.push('</svg>');
  return parts.join('');
}

function figure(d, caption, opts) {
  const f = el('figure', 'fq-fig');
  f.append(el('div', 'fq-svgbox', fischerSvg(d, opts)));
  if (caption) f.append(el('figcaption', '', caption));
  return f;
}

export default {
  id: 'fischer-quiz',
  mount(host, config, ctx = { onResult() {}, onProgress() {} }) {
    host.innerHTML = '';
    const root = el('div', 'fq'); host.append(root);

    // ---------------------------------------------------------------- a picture only
    if (config.mode === 'view') {
      const figs = config.figures || [{ entry: config.entry, xSide: config.xSide, caption: config.caption }];
      const row = el('div', 'fq-figs'); root.append(row);
      figs.forEach((f) => {
        const d = standardDrawing(POOL_BY_ID[f.entry], f.xSide || 'right');
        row.append(figure(d, f.caption || '', { depth: config.depth, numbers: config.numbers, arrow: config.arrow, label: f.caption || 'Fischer projection' }));
      });
      if (config.depth) root.append(el('p', 'muted small fq-key', 'Wedges (horizontal bonds) point toward you. Dashes (vertical bonds) point away from you.'));
      return { destroy() {} };
    }

    // ---------------------------------------------------------------- rounds
    const rounds = config.rounds || buildRounds(config.plan || ['rs-h', 'rs-v', 'rs-h', 'manip']);
    let k = 0, locked = false;
    const count = el('p', 'muted small fq-count');
    const ask = el('p', 'fq-ask');
    const figs = el('div', 'fq-figs');
    const opts = el('div', 'opts fq-opts'); opts.setAttribute('role', 'group');
    const fb = el('div', 'fb'); fb.setAttribute('aria-live', 'polite');
    const bar = el('div', 'fq-bar');
    root.append(count, ask, figs, opts, fb, bar);

    const show = () => {
      const r = rounds[k]; locked = false;
      count.textContent = rounds.length > 1 ? `Question ${k + 1} of ${rounds.length}` : '';
      ask.textContent = r.ask;
      figs.innerHTML = '';
      if (r.task === 'manip') {
        figs.append(figure(r.drawing, 'A', { label: 'Projection A' }), el('span', 'fq-vs', '→'), figure(r.drawing2, 'B', { label: 'Projection B' }));
      } else figs.append(figure(r.drawing, r.name, { label: 'Fischer projection of ' + r.name }));
      opts.innerHTML = ''; fb.className = 'fb'; fb.textContent = ''; bar.innerHTML = '';
      r.options.forEach((o) => {
        const b = el('button', 'opt', o.text); b.type = 'button'; b.dataset.k = o.id;
        b.addEventListener('click', () => {
          if (locked) return;
          const g = gradeRound(r, o.id);
          if (g.ok) {
            locked = true; opts.querySelectorAll('.opt').forEach((x) => { x.disabled = true; }); b.classList.add('good');
            fb.className = 'fb ok'; fb.textContent = g.confirm;
            // show the reasoning on the drawing: priority numbers, and for an R/S round the 1 -> 2 -> 3 arrow
            figs.innerHTML = '';
            if (r.task === 'manip') figs.append(figure(r.drawing, 'A', { numbers: true, label: 'Projection A' }), el('span', 'fq-vs', '→'), figure(r.drawing2, 'B', { numbers: true, label: 'Projection B' }));
            else figs.append(figure(r.drawing, r.name, { numbers: true, arrow: true, label: 'Fischer projection of ' + r.name }));
            if (k + 1 < rounds.length) {
              const nb = el('button', 'btn primary', 'Next question'); nb.type = 'button';
              nb.addEventListener('click', () => { k++; show(); ctx.onProgress && ctx.onProgress(); });
              bar.append(nb); nb.focus({ preventScroll: true });
            } else ctx.onResult({ ok: true });
          } else {
            b.classList.add('bad'); b.disabled = true;
            ctx.onResult({ ok: false, diagnosis: g.diagnosis });
          }
        });
        opts.append(b);
      });
    };
    show();
    return { destroy() {} };
  }
};
