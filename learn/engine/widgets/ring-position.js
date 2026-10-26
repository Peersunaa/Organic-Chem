// Widget: ring-position (reusable, Lesson 13). A benzene ring with its groups drawn; the learner taps the ring carbons that are ORTHO, META or PARA to a reference group.
// config: { smiles, ref?: ring position (0..5) of the reference group (default: the first group), tasks?: ['ortho','meta','para'] (asked in this order; default all three),
//           caption?: text above the ring }
// ortho = the two carbons next to the reference carbon (a 1,2 relationship), meta = the two carbons one further round (1,3), para = the carbon opposite (1,4).
// The ring comes from engine/naming-arene.js (ringLayout reads the atoms of the SMILES), so positions and labels are computed, never typed. Pure grading: expected() and grade().
// ctx.onResult({ok:false, diagnosis}) after every wrong check (with the reason: which relationship the tapped carbon really has), ctx.onResult({ok:true}) when every task is done.
// Lesson 14 (attack mode): config.attack = [smiles of substituted benzenes]. For each ring the learner taps EVERY carbon where the electrophile E+ will mostly attack (the answer is
// predictSubst's positions: ortho + para for an o/p director, meta for a meta director, and the book's rules for two groups), then presses Check. A wrong tap says why, from the
// substituent table (the reason for that group). Pure: attackExpected(smiles) / attackGrade(smiles, picked).
import { ringLayout, relation, nameBothArene } from '../naming-arene.js';
import { predictSubst, DIRECTORS, BINS } from '../reactions-aromatic.js';

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

/** Ring positions an electrophile attacks on this ring (the engine's positions), or null if the ring is refused. */
export function attackExpected(smiles) {
  const p = predictSubst(smiles, 'Br2');
  return p.ok ? { positions: p.positions.slice().sort((a, b) => a - b), pred: p } : null;
}
const REL_TEXT = { ortho: 'ortho (next to the group)', meta: 'meta (one carbon further round)', para: 'para (directly opposite the group)' };
/** Judge the tapped carbons for one ring. */
export function attackGrade(smiles, picked) {
  const E = attackExpected(smiles);
  const L = ringLayout(smiles);
  const got = [...new Set(picked)].sort((a, b) => a - b);
  if (!E) return { ok: false, code: 'refused', diagnosis: 'This ring is not modelled.' };
  if (!got.length) return { ok: false, code: 'empty', diagnosis: 'Tap the ring carbons where the electrophile will go, then press Check.' };
  if (JSON.stringify(got) === JSON.stringify(E.positions)) return { ok: true, code: 'ok', diagnosis: '' };
  const subs = E.pred.subs;
  const occupied = got.find((q) => subs.some((s) => s.pos === q));
  if (occupied != null) return { ok: false, code: 'self', diagnosis: `That carbon already carries ${L.labels[occupied].text}. The new group replaces an H, so it goes on a carbon that has one.` };
  const bad = got.filter((q) => !E.positions.includes(q));
  if (bad.length) {
    const q = bad[0];
    if (subs.length === 1) {
      const g = DIRECTORS[subs[0].id], gt = L.labels[subs[0].pos].text, rel = relation(subs[0].pos, q);
      const dir = g.cls === 'deactM' ? 'a meta director' : 'an ortho/para director';
      return { ok: false, code: 'wrong', diagnosis: `That carbon is ${REL_TEXT[rel]}. ${gt} is ${dir}, so ${g.cls === 'deactM' ? 'E⁺ goes meta' : 'E⁺ goes ortho and para'}. ${g.why}` };
    }
    const rels = subs.map((s) => `${relation(s.pos, q)} to ${L.labels[s.pos].text}`).join(' and ');
    return { ok: false, code: 'wrong', diagnosis: `That carbon is ${rels}. ${E.pred.why}` };
  }
  const missing = E.positions.filter((q) => !got.includes(q)).length;
  return { ok: false, code: 'missing', diagnosis: `Good so far, but ${missing === 1 ? 'one more carbon' : missing + ' more carbons'} get${missing === 1 ? 's' : ''} attacked too: positions that are equivalent by symmetry count separately.` };
}

export default {
  id: 'ring-position',
  mount(host, config, ctx) {
    if (config.attack) return mountAttack(host, config, ctx);
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

/** Attack mode (Lesson 14): where will E+ go on each of several substituted benzenes? */
function mountAttack(host, config, ctx) {
  const rings = config.attack;
  let k = 0, picked = new Set(), finished = false;
  host.innerHTML = '';
  const root = h('div', 'rp');
  const ask = h('p', 'rp-ask'); ask.setAttribute('aria-live', 'polite');
  const svg = se('svg', { viewBox: '-150 -140 300 280', class: 'rp-svg', role: 'group', 'aria-label': 'Substituted benzene ring: tap the carbons the electrophile attacks' });
  const msg = h('p', 'rp-msg'); msg.setAttribute('aria-live', 'polite');
  const act = h('div', 'lb-actions');
  const clear = h('button', 'btn ghost'); clear.type = 'button'; clear.textContent = 'Clear';
  const check = h('button', 'btn primary'); check.type = 'button'; check.textContent = 'Check';
  const next = h('button', 'btn primary'); next.type = 'button'; next.textContent = 'Next ring'; next.hidden = true;
  act.append(clear, check, next);
  root.append(ask, svg, msg, act);
  host.append(root);
  const R = 62;
  const pt = (i, r = R) => { const a = (-90 + 60 * i) * Math.PI / 180; return [Math.cos(a) * r, Math.sin(a) * r]; };
  let solved = false;
  function draw() {
    const smiles = rings[k], L = ringLayout(smiles), E = attackExpected(smiles);
    svg.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const [x1, y1] = pt(i), [x2, y2] = pt((i + 1) % 6);
      svg.append(se('line', { x1, y1, x2, y2, class: 'rp-bond' }));
      if (i % 2 === 0) {
        const [a1, b1] = pt(i, R - 9), [a2, b2] = pt((i + 1) % 6, R - 9);
        const sh = 0.16;
        svg.append(se('line', { x1: a1 + (a2 - a1) * sh, y1: b1 + (b2 - b1) * sh, x2: a2 - (a2 - a1) * sh, y2: b2 - (b2 - b1) * sh, class: 'rp-bond rp-inner' }));
      }
    }
    for (let i = 0; i < 6; i++) {
      const lab = L.labels[i];
      if (!lab) continue;
      const [x1, y1] = pt(i), [x2, y2] = pt(i, R + 38);
      svg.append(se('line', { x1, y1, x2, y2, class: 'rp-bond' }));
      const [tx, ty] = pt(i, R + 60);
      svg.append(se('text', { x: tx, y: ty + 5, class: 'rp-lab rp-ref', 'text-anchor': 'middle' }, lab.text));
    }
    for (let i = 0; i < 6; i++) {
      const [x, y] = pt(i);
      const occ = !!L.labels[i];
      const g = se('g', { class: 'rp-c' + (occ ? ' ref' : '') + (solved && E.positions.includes(i) ? ' done ortho' : ''), tabindex: occ ? '-1' : '0', role: 'button', 'aria-pressed': 'false', 'aria-label': `Ring carbon ${i + 1}${occ ? ` (carries ${L.labels[i].text})` : ''}` });
      g.append(se('circle', { cx: x, cy: y, r: 17, class: 'rp-dot' }));
      const toggle = () => {
        if (finished || solved) return;
        if (occ) { msg.className = 'rp-msg bad'; msg.textContent = `That carbon already carries ${L.labels[i].text}. The new group replaces an H, so it goes on a carbon that has one.`; return; }
        picked.has(i) ? picked.delete(i) : picked.add(i); msg.textContent = ''; msg.className = 'rp-msg'; paint();
      };
      g.addEventListener('click', toggle);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      g.dataset.i = String(i);
      svg.append(g);
    }
    paint();
  }
  function paint() {
    [...svg.querySelectorAll('.rp-c')].forEach((g) => { const on = picked.has(Number(g.dataset.i)); g.classList.toggle('on', on); g.setAttribute('aria-pressed', String(on)); });
    const nm = nameBothArene(rings[k]);
    ask.innerHTML = `${config.caption ? config.caption + ' ' : ''}Ring ${k + 1} of ${rings.length}${nm ? ': <b>' + nm.new + '</b>' : ''}. Tap <b>every ring carbon</b> where an electrophile E⁺ will attack (the new group replaces the H there), then press Check.`;
    check.disabled = solved; clear.disabled = solved;
  }
  clear.addEventListener('click', () => { picked = new Set(); msg.textContent = ''; msg.className = 'rp-msg'; paint(); });
  check.addEventListener('click', () => {
    if (solved) return;
    const r = attackGrade(rings[k], [...picked]);
    if (!r.ok) { msg.className = 'rp-msg bad'; msg.textContent = r.diagnosis; ctx.onResult({ ok: false, diagnosis: r.diagnosis, code: r.code }); return; }
    solved = true;
    const E = attackExpected(rings[k]);
    const g = E.pred.subs.length === 1 ? DIRECTORS[E.pred.subs[0].id] : null;
    const L2 = ringLayout(rings[k]);
    msg.className = 'rp-msg ok';
    msg.textContent = g ? `Yes. ${L2.labels[E.pred.subs[0].pos].text} is in the bin “${BINS[g.cls].label}”: E⁺ goes ${g.cls === 'deactM' ? 'meta' : 'ortho and para'}.` : `Yes. ${E.pred.why}`;
    draw();
    if (k + 1 >= rings.length) { finished = true; ctx.onResult({ ok: true }); } else { next.hidden = false; check.hidden = true; clear.hidden = true; if (ctx.onProgress) ctx.onProgress(); }
  });
  next.addEventListener('click', () => { k++; picked = new Set(); solved = false; msg.textContent = ''; msg.className = 'rp-msg'; next.hidden = true; check.hidden = false; clear.hidden = false; draw(); });
  draw();
  return { destroy() {} };
}
