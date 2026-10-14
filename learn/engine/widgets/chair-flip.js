// Widget: solid 3D cyclohexane chairs (RDKit/MMFF coordinates, data/3d/chairs.js) with axial and equatorial atoms
// coloured, a Flip button (animated unless the user prefers reduced motion), and tap-to-answer questions.
//
// config.mode:
//   'explore'        one model + Flip (no grading); config: { model, highlight?:'sub'|atomIdx }
//   'tap-h'          cyclohexane; tap an H that is axial, then one that is equatorial. Colours appear when both are found.
//   'flip-identify'  methylcyclohexane; is the highlighted methyl axial or equatorial? flip; and again.
//   'sidebyside'     the two chairs next to each other, 1,3-diaxial contacts drawn on the axial one (no grading)
//   'rule-lab'       six dimethylcyclohexanes: flip each and decide whether both CH3 can be equatorial at once
import { CHAIRS, load, coords, substituents, refAxis, ringAxis, ringCentre, heavySubs, pattern, canBothEquatorial, diaxialPartners, blend, ease } from './chair-core.js';
import { createView, CPK } from './view3d.js';
import { add, mul } from './geom.js';

export const AX = '#f08a24', EQ = '#17b0b9', CROWD = '#d1432b';
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

export const roleWord = { a: 'axial', e: 'equatorial' };
export const subName = (m, atom) => (m.els[atom] === 'H' ? 'hydrogen' : m.els[atom] === 'C' ? 'methyl group' : m.els[atom]);

/** Scene for a (possibly blended) pose. `t` 0..1 between chair a and chair b; roles come from the nearer chair. */
export function chairScene(m, t, o = {}) {
  const pts = t === 0 ? m.A : t === 1 ? m.B : blend(m, t);
  const near = t < 0.5 ? 'a' : 'b';
  const sub = substituents(m, coords(m, near), refAxis(m));
  const colors = {}, tags = {};
  sub.forEach((s) => {
    if (o.reveal) colors[s.atom] = s.role === 'a' ? AX : EQ;
    tags[s.atom] = `${m.els[s.atom] === 'H' ? 'Hydrogen' : 'Methyl group'} on ring carbon ${s.pos + 1}`;
  });
  const ax = ringAxis(coords(m, near), m.ring), c = ringCentre(coords(m, near), m.ring);
  const lines = [];
  if (o.axis !== false) lines.push({ a: add(c, mul(ax, 2.7)), b: add(c, mul(ax, -2.7)), dashed: true, color: '#8a9ea5' });
  const rings = (o.rings || []).slice();
  if (o.diaxial) {
    (o.diaxial.atoms || []).forEach((sAtom) => {
      diaxialPartners(m, near, sAtom).forEach((p) => { lines.push({ a: pts[sAtom], b: pts[p.atom], dashed: true, color: CROWD }); rings.push(p.atom); });
    });
  }
  return { atoms: m.els.map((el, i) => ({ el, x: pts[i][0], y: pts[i][1], z: pts[i][2] })), bonds: m.bonds.map(([i, j]) => [i, j]), colors, rings, lines, tags, pickable: o.pickable ? true : null };
}

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

/** One viewer with an animated flip. */
function flipper(host, m, opts) {
  let t = opts.start === 'b' ? 1 : 0, busy = false, flips = 0;
  const view = createView(host, { onPick: opts.onPick, label: opts.label || 'Cyclohexane chair, flat projection of the 3D coordinates. Drag to rotate.' });
  const flags = () => ({ reveal: opts.reveal(), pickable: opts.pickable, rings: opts.rings ? opts.rings(t) : [], diaxial: opts.diaxial, axis: opts.axis });
  const paint = (tt) => view.show(chairScene(m, tt, flags()));
  paint(t);
  return {
    view, get which() { return t >= 0.5 ? 'b' : 'a'; }, get flips() { return flips; }, get busy() { return busy; },
    repaint() { paint(t); },
    flip(done) {
      if (busy) return;
      const to = t < 0.5 ? 1 : 0; flips++;
      if (reduceMotion()) { t = to; paint(t); done && done(); return; }
      busy = true;
      const from = t, t0 = performance.now(), dur = 700;
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        paint(from + (to - from) * ease(k));
        if (k < 1) requestAnimationFrame(step); else { t = to; busy = false; paint(t); done && done(); }
      };
      requestAnimationFrame(step);
    },
    destroy() { view.destroy(); }
  };
}

const legend = () => el('p', 'cf-legend', `<span><i class="cf-sw" style="background:${AX}"></i> axial</span> <span><i class="cf-sw" style="background:${EQ}"></i> equatorial</span> <span><i class="cf-dash"></i> ring axis</span>`);
const FLIP_NOTE = 'Drag to turn the model. The flip moves each atom from one chair to the other, so you can follow where it ends up.';

/** Tap-H task text and grading (pure, used by the tests). */
export const TAP_TASKS = [
  { role: 'a', text: 'Tap one hydrogen that points straight up or straight down, parallel to the dashed line.' },
  { role: 'e', text: 'Now tap one hydrogen that points outward, around the rim of the ring.' }
];
export function gradeTap(m, which, atom, wantRole) {
  const s = substituents(m, coords(m, which), refAxis(m)).find((x) => x.atom === atom);
  if (!s) return { ok: false, diagnosis: 'That is a carbon atom of the ring. Tap one of the hydrogens (the small light balls) instead.' };
  if (m.els[atom] !== 'H') return { ok: false, diagnosis: 'That is not a hydrogen. Tap one of the small light hydrogen balls.' };
  const ang = Math.round(s.angle);
  if (s.role === wantRole) return { ok: true, role: s.role, angle: ang };
  return wantRole === 'a'
    ? { ok: false, diagnosis: `That hydrogen points outward, around the rim of the ring: it makes about ${90 - ang}° with the flat belt of the ring and ${ang}° with the dashed line, so it is not parallel to it. Look for one pointing straight up or down.` }
    : { ok: false, diagnosis: `That hydrogen is parallel to the dashed line (only ${ang}° off it), so it points up or down. This task wants one that sticks out sideways, around the rim.` };
}

export default {
  id: 'chair-flip',
  mount(host, config, ctx = { onResult() {} }) {
    const mode = config.mode || 'explore';
    host.innerHTML = '';
    const root = el('div', 'cf'); host.append(root);
    const views = el('div', 'cf-views'); const bar = el('div', 'cf-bar'); const q = el('div', 'cf-q'); const note = el('p', 'm3-note cf-note');
    root.append(views, bar, q, note);
    const live = el('p', 'cf-live'); live.setAttribute('aria-live', 'polite');
    const fig = (title) => { const f = el('figure', 'cf-fig'); const box = el('div'); f.append(box); if (title) f.append(el('figcaption', '', title)); views.append(f); return box; };
    const cleanup = [];
    const kindNote = (fl) => fl.view.ready.then(() => { if (fl.view.kind === 'svg') note.textContent = 'Flat view of the same 3D coordinates (3D graphics are not available here): drag to rotate. ' + (config.mode === 'sidebyside' ? '' : FLIP_NOTE); });

    // ---------------------------------------------------------------- tap-h
    if (mode === 'tap-h') {
      const m = load(config.model || 'cyclohexane');
      let k = 0, reveal = false;
      const fl = flipper(fig(), m, { start: 'a', reveal: () => reveal, pickable: true, onPick: (i) => pick(i) });
      cleanup.push(() => fl.destroy());
      const prompt = el('p', 'cf-task'); q.append(prompt, live);
      const show = () => { prompt.textContent = `Task ${k + 1} of 2. ${TAP_TASKS[k].text}`; };
      show();
      const pick = (i) => {
        if (k >= 2) return;
        const r = gradeTap(m, fl.which, i, TAP_TASKS[k].role);
        if (!r.ok) { ctx.onResult({ ok: false, diagnosis: r.diagnosis }); return; }
        live.textContent = `Yes: that ${roleWord[r.role]} hydrogen is ${r.angle}° from the ring axis.`;
        k++;
        if (k < 2) show();
        else { reveal = true; fl.repaint(); prompt.textContent = 'Both found. Colours added: axial in orange, equatorial in teal.'; bar.append(legend()); ctx.onResult({ ok: true }); }
      };
      note.textContent = 'Tap a hydrogen on the model. Drag to turn it so you can see the dashed line from the side.';
      kindNote(fl);
    }

    // ---------------------------------------------------------------- flip-identify
    else if (mode === 'flip-identify') {
      const m = load(config.model || 'methylcyclohexane');
      const subAtom = m.entry.subs[0];
      let stage = 0, flipped = false, reveal = false;
      const before = heavySubs(m, 'a').find((s) => s.atom === subAtom);
      const fl = flipper(fig(), m, { start: 'a', reveal: () => reveal, pickable: false, rings: () => [subAtom] });
      cleanup.push(() => fl.destroy());
      const flipBtn = el('button', 'btn', 'Flip the ring'); flipBtn.type = 'button'; flipBtn.disabled = true;
      bar.append(flipBtn);
      const ask = el('p', 'cf-task');
      const ans = el('div', 'cf-ans');
      ans.innerHTML = '<button type="button" class="btn" data-r="a">Axial</button><button type="button" class="btn" data-r="e">Equatorial</button>';
      q.append(ask, ans, live);
      const showQ = () => { ask.textContent = stage === 0 ? 'Look at the circled methyl group. In this chair, is it axial or equatorial?' : 'After the flip: is the circled methyl group axial or equatorial now?'; ans.hidden = false; };
      showQ();
      ans.addEventListener('click', (e) => {
        const b = e.target.closest('[data-r]'); if (!b || fl.busy) return;
        const cur = heavySubs(m, fl.which).find((s) => s.atom === subAtom);
        if (b.dataset.r === cur.role) {
          reveal = true; fl.repaint(); if (!bar.querySelector('.cf-legend')) bar.append(legend());
          if (stage === 0) {
            live.textContent = `Yes: ${roleWord[cur.role]}. Now press Flip and watch the circled methyl.`;
            ans.hidden = true; ask.textContent = 'Press Flip the ring.'; flipBtn.disabled = false; flipBtn.focus();
            stage = 1;
          } else {
            const nowFace = cur.face === before.face;
            live.textContent = `Yes: ${roleWord[cur.role]}. The methyl ${nowFace ? 'is still on the same face of the ring (up stays up)' : 'has changed face'}, but its position changed from ${roleWord[before.role]} to ${roleWord[cur.role]}.`;
            ans.hidden = true; ask.textContent = 'Done.'; ctx.onResult({ ok: true });
          }
        } else {
          ctx.onResult({ ok: false, diagnosis: cur.role === 'a'
            ? `The circled methyl points almost straight along the ring axis (${Math.round(cur.angle)}° from it), parallel to the dashed line: that is axial, not equatorial.`
            : `The circled methyl points outward, away from the ring axis (about ${Math.round(90 - cur.angle)}° above or below the flat belt of the ring), so it is equatorial, not axial.` });
        }
      });
      flipBtn.addEventListener('click', () => { if (fl.busy) return; flipBtn.disabled = true; fl.flip(() => { flipped = true; showQ(); }); });
      note.textContent = FLIP_NOTE; kindNote(fl);
    }

    // ---------------------------------------------------------------- sidebyside
    else if (mode === 'sidebyside') {
      const m = load(config.model || 'methylcyclohexane');
      const order = config.order || ['b', 'a'];
      const subAtom = m.entry.subs[0];
      const names = config.titles || ['Chair 1', 'Chair 2'];
      const fls = order.map((w, k) => {
        const f = flipper(fig(names[k]), m, { start: w, reveal: () => true, pickable: false, diaxial: config.diaxial === false ? null : { atoms: [subAtom] }, rings: () => [subAtom] });
        cleanup.push(() => f.destroy());
        return f;
      });
      bar.append(legend());
      if (config.diaxial !== false) bar.append(el('p', 'cf-legend', `<span><i class="cf-dash red"></i> close contact with an axial H (when one exists)</span>`));
      note.textContent = 'Both models are the same molecule. Drag either one to look around it.';
      kindNote(fls[0]);
    }

    // ---------------------------------------------------------------- rule-lab
    else if (mode === 'rule-lab') {
      const ids = config.models;
      const answered = new Set();
      let cur = 0, flipsOf = {}, fl = null;
      const tabs = el('div', 'cf-tabs'); tabs.setAttribute('role', 'tablist');
      const label = (id) => { const e = CHAIRS[id]; return `${e.rel}-${e.positions}`; };
      ids.forEach((id, k) => { const b = el('button', 'btn small cf-tab', label(id)); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.k = k; tabs.append(b); });
      root.insertBefore(tabs, views);
      const box = fig();
      const flipBtn = el('button', 'btn', 'Flip the ring'); flipBtn.type = 'button';
      bar.append(flipBtn, legend());
      const readout = el('p', 'cf-read'); readout.setAttribute('aria-live', 'polite');
      const ask = el('p', 'cf-task');
      const ans = el('div', 'cf-ans'); ans.innerHTML = '<button type="button" class="btn" data-y="1">Yes, both can be equatorial</button><button type="button" class="btn" data-y="0">No, never both</button>';
      q.append(readout, ask, ans, live);
      const describe = (m, which) => {
        const hs = heavySubs(m, which);
        const pos = m.entry.positions.split(',').map(Number);
        return hs.map((s, i) => `CH₃ on C${pos[i]} is ${roleWord[s.role]}`).join(', ');
      };
      const select = (k) => {
        cur = k; const id = ids[k]; const m = load(id);
        if (fl) { fl.destroy(); box.innerHTML = ''; }
        fl = flipper(box, m, { start: config.start || 'b', reveal: () => true, pickable: false });
        tabs.querySelectorAll('.cf-tab').forEach((b, i) => { b.setAttribute('aria-selected', String(i === k)); b.classList.toggle('on', i === k); b.classList.toggle('done', answered.has(ids[i])); });
        flipsOf[id] = flipsOf[id] || 0;
        readout.textContent = `Now: ${describe(m, fl.which)}.`;
        ask.textContent = `${label(id)}-dimethylcyclohexane: flip the ring and watch both methyl groups. Can both be equatorial in the same chair?`;
        ans.querySelectorAll('button').forEach((b) => { b.disabled = answered.has(id) || flipsOf[id] < 1; });
        if (!answered.has(id) && flipsOf[id] < 1) live.textContent = 'Flip the ring at least once before you answer.'; else live.textContent = answered.has(id) ? 'Answered correctly.' : '';
        kindNote(fl);
      };
      tabs.addEventListener('click', (e) => { const b = e.target.closest('.cf-tab'); if (b && !(fl && fl.busy)) select(Number(b.dataset.k)); });
      flipBtn.addEventListener('click', () => {
        if (fl.busy) return; const id = ids[cur], m = load(id);
        flipBtn.disabled = true;
        fl.flip(() => { flipsOf[id]++; flipBtn.disabled = false; readout.textContent = `Now: ${describe(m, fl.which)}.`; if (!answered.has(id)) { ans.querySelectorAll('button').forEach((b) => { b.disabled = false; }); live.textContent = ''; } });
      });
      ans.addEventListener('click', (e) => {
        const b = e.target.closest('[data-y]'); if (!b) return;
        const id = ids[cur], m = load(id);
        const can = canBothEquatorial(m);
        const said = b.dataset.y === '1';
        if (said === can) {
          answered.add(id);
          live.textContent = can ? `Right: the chairs are ${pattern(m, 'a')} and ${pattern(m, 'b')} (a = axial, e = equatorial, in ring order), so one of them has both equatorial.` : `Right: the chairs are ${pattern(m, 'a')} and ${pattern(m, 'b')}: flipping swaps every position, so one methyl is always axial.`;
          ans.querySelectorAll('button').forEach((x) => { x.disabled = true; });
          tabs.querySelectorAll('.cf-tab')[cur].classList.add('done');
          if (answered.size === ids.length) ctx.onResult({ ok: true });
        } else {
          ctx.onResult({ ok: false, diagnosis: can
            ? `Look again: one of the two chairs of this isomer has both methyl groups pointing outward around the rim (equatorial). Flip until the readout says both are equatorial (the chairs are ${pattern(m, 'a')} and ${pattern(m, 'b')}).`
            : `Flip it a few times and read the line under the model: in this isomer the two chairs are ${pattern(m, 'a')} and ${pattern(m, 'b')}, so every chair has one axial methyl. A flip swaps axial and equatorial at every carbon, so a pair that is axial/equatorial stays axial/equatorial.` });
        }
      });
      select(0);
      note.textContent = FLIP_NOTE;
    }

    // ---------------------------------------------------------------- explore
    else {
      const m = load(config.model || 'cyclohexane');
      const subAtom = m.entry.subs[0];
      const fl = flipper(fig(), m, { start: config.start || 'a', reveal: () => true, pickable: false, rings: config.highlight ? () => [config.highlight === 'sub' ? subAtom : config.highlight] : null });
      cleanup.push(() => fl.destroy());
      const flipBtn = el('button', 'btn', 'Flip the ring'); flipBtn.type = 'button';
      flipBtn.addEventListener('click', () => { if (!fl.busy) fl.flip(); });
      bar.append(flipBtn, legend());
      note.textContent = FLIP_NOTE; kindNote(fl);
    }
    return { destroy() { cleanup.forEach((f) => f()); } };
  }
};
