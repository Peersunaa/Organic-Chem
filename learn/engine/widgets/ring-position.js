// Widget: ring-position (reusable, Lesson 13). A benzene ring with its groups drawn; the learner taps the ring carbons that are ORTHO, META or PARA to a reference group.
// config: { smiles, ref?: ring position (0..5) of the reference group (default: the first group), tasks?: ['ortho','meta','para'] (asked in this order; default all three),
//           caption?: text above the ring }
// ortho = the two carbons next to the reference carbon (a 1,2 relationship), meta = the two carbons one further round (1,3), para = the carbon opposite (1,4).
// The ring comes from engine/naming-arene.js (ringLayout reads the atoms of the SMILES), so positions and labels are computed, never typed. Pure grading: expected() and grade().
// ctx.onResult({ok:false, diagnosis}) after every wrong check (with the reason: which relationship the tapped carbon really has), ctx.onResult({ok:true}) when every task is done.
import { ringLayout, relation } from '../naming-arene.js';

const NS = 'http://www.w3.org/2000/svg';
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const se = (tag, attrs = {}, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };

const NUM = { ortho: 2, meta: 2, para: 1 };
const WHAT = { ortho: 'next door to the reference carbon (a 1,2 relationship)', meta: 'one carbon further round, with one carbon in between (a 1,3 relationship)', para: 'directly across the ring (a 1,4 relationship)' };

/** Ring positions (0..5) that are `task` relative to the reference position. */
export function expected(config, task) {
  const L = ringLayout(config.smiles);
  const ref = config.ref != null ? config.ref : L.subs[0].pos;
  return [0, 1, 2, 3, 4, 5].filter((q) => relation(ref, q) === task);
}
/** Judge the set of tapped positions for one task. */
export function grade(config, task, picked) {
  const L = ringLayout(config.smiles);
  const ref = config.ref != null ? config.ref : L.subs[0].pos;
  const want = expected(config, task);
  const got = [...new Set(picked)].sort((a, b) => a - b);
  const refLabel = L.labels[ref] ? L.labels[ref].text : 'the group';
  if (!got.length) return { ok: false, code: 'empty', diagnosis: `Tap the ${task} carbon${NUM[task] > 1 ? 's' : ''}, then press Check.` };
  if (JSON.stringify(got) === JSON.stringify(want)) return { ok: true, code: 'ok', diagnosis: '' };
  const bad = got.filter((q) => !want.includes(q));
  if (bad.length) {
    const q = bad[0];
    const rel = relation(ref, q);
    if (rel === 'self') return { ok: false, code: 'self', diagnosis: `That is the carbon that carries ${refLabel} itself. Ortho, meta and para describe the OTHER ring carbons, counted from it.` };
    return { ok: false, code: 'wrong', diagnosis: `That carbon is ${rel}, not ${task}: it is ${WHAT[rel]}. ${task[0].toUpperCase() + task.slice(1)} means ${WHAT[task]}.` };
  }
  return { ok: false, code: 'missing', diagnosis: NUM[task] > 1 ? `Good so far, but there are ${NUM[task]} ${task} carbons: one on each side of ${refLabel}. Find the other one.` : `Not quite everything: the ${task} carbon is ${WHAT[task]}.` };
}

export default {
  id: 'ring-position',
  mount(host, config, ctx) {
    const L = ringLayout(config.smiles);
    const ref = config.ref != null ? config.ref : L.subs[0].pos;
    const tasks = config.tasks || ['ortho', 'meta', 'para'];
    let t = 0, picked = new Set(), finished = false;
    const solved = {};
    host.innerHTML = '';
    const root = h('div', 'rp');
    const ask = h('p', 'rp-ask');
    ask.setAttribute('aria-live', 'polite');
    const svg = se('svg', { viewBox: '-150 -140 300 280', class: 'rp-svg', role: 'group', 'aria-label': 'Benzene ring: tap ring carbons' });
    const msg = h('p', 'rp-msg'); msg.setAttribute('aria-live', 'polite');
    const act = h('div', 'lb-actions');
    const clear = h('button', 'btn ghost'); clear.type = 'button'; clear.textContent = 'Clear';
    const check = h('button', 'btn primary'); check.type = 'button'; check.textContent = 'Check';
    act.append(clear, check);
    root.append(ask, svg, msg, act);
    host.append(root);

    const R = 62;
    const pt = (i, r = R) => { const a = (-90 + 60 * i) * Math.PI / 180; return [Math.cos(a) * r, Math.sin(a) * r]; };
    const circles = [];

    function draw() {
      svg.innerHTML = '';
      // ring bonds: Kekule drawing (alternate bonds get an inner line)
      for (let i = 0; i < 6; i++) {
        const [x1, y1] = pt(i), [x2, y2] = pt((i + 1) % 6);
        svg.append(se('line', { x1, y1, x2, y2, class: 'rp-bond' }));
        if (i % 2 === 0) {
          const [a1, b1] = pt(i, R - 9), [a2, b2] = pt((i + 1) % 6, R - 9);
          const sh = 0.16;
          svg.append(se('line', { x1: a1 + (a2 - a1) * sh, y1: b1 + (b2 - b1) * sh, x2: a2 - (a2 - a1) * sh, y2: b2 - (b2 - b1) * sh, class: 'rp-bond rp-inner' }));
        }
      }
      // groups
      for (let i = 0; i < 6; i++) {
        const lab = L.labels[i];
        if (!lab) continue;
        const [x1, y1] = pt(i), [x2, y2] = pt(i, R + 38);
        svg.append(se('line', { x1, y1, x2, y2, class: 'rp-bond' }));
        const [tx, ty] = pt(i, R + 60);
        svg.append(se('text', { x: tx, y: ty + 5, class: 'rp-lab' + (i === ref ? ' rp-ref' : ''), 'text-anchor': 'middle' }, lab.text));
      }
      // tap targets
      circles.length = 0;
      for (let i = 0; i < 6; i++) {
        const [x, y] = pt(i);
        const rel = relation(ref, i);
        const g = se('g', { class: 'rp-c', tabindex: '0', role: 'button', 'aria-pressed': 'false', 'aria-label': `Ring carbon ${i + 1}${L.labels[i] ? ` (carries ${L.labels[i].text})` : ''}` });
        const c = se('circle', { cx: x, cy: y, r: 17, class: 'rp-dot' });
        g.append(c);
        if (i === ref) g.classList.add('ref');
        if (solved[rel] && rel !== 'self') g.classList.add('done', rel);
        const toggle = () => { if (finished || i === ref) { if (i === ref && !finished) { msg.className = 'rp-msg bad'; msg.textContent = 'That is the reference carbon itself. Ortho, meta and para are counted from it, so tap one of the others.'; } return; } if (solved[rel]) return; picked.has(i) ? picked.delete(i) : picked.add(i); msg.textContent = ''; msg.className = 'rp-msg'; paint(); };
        g.addEventListener('click', toggle);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
        circles.push(g);
        svg.append(g);
      }
      // done-labels
      for (let i = 0; i < 6; i++) {
        const rel = relation(ref, i);
        if (solved[rel] && rel !== 'self') { const [x, y] = pt(i); svg.append(se('text', { x, y: y + 4, class: 'rp-tag', 'text-anchor': 'middle' }, rel[0])); }
      }
      paint();
    }
    function paint() {
      circles.forEach((g, i) => { g.classList.toggle('on', picked.has(i)); g.setAttribute('aria-pressed', String(picked.has(i))); });
      const task = tasks[t];
      ask.innerHTML = finished ? (config.doneText || 'All found: <b>ortho</b> (o), <b>meta</b> (m) and <b>para</b> (p) are counted from the group you started at.') : `${config.caption ? config.caption + ' ' : ''}Tap the <b>${task}</b> carbon${NUM[task] > 1 ? 's' : ''} relative to the <b>${L.labels[ref].text}</b> group (the one outlined), then press Check.`;
      check.disabled = finished; clear.disabled = finished;
    }
    clear.addEventListener('click', () => { picked = new Set(); msg.textContent = ''; msg.className = 'rp-msg'; paint(); });
    check.addEventListener('click', () => {
      if (finished) return;
      const task = tasks[t];
      const r = grade(config, task, [...picked]);
      if (!r.ok) { msg.className = 'rp-msg bad'; msg.textContent = r.diagnosis; ctx.onResult({ ok: false, diagnosis: r.diagnosis, code: r.code }); return; }
      solved[task] = true; picked = new Set();
      if (t + 1 >= tasks.length) { finished = true; msg.className = 'rp-msg ok'; msg.textContent = 'Correct.'; draw(); ctx.onResult({ ok: true }); return; }
      t++; msg.className = 'rp-msg ok'; msg.textContent = `Yes. Now the ${tasks[t]} position.`; draw(); if (ctx.onProgress) ctx.onProgress();
    });
    draw();
    return { destroy() {} };
  }
};
