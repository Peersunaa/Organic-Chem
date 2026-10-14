// Widget: director-sort (reusable, Lesson 14). Sort substituent groups into the three bins of McMurry's Figure 5.6:
//   activator, ortho/para director  |  deactivator, ortho/para director (the halogens)  |  deactivator, meta director.
// There is no bin for a meta-directing activator because no such group exists.
// The learner DRAGS a group chip onto a bin, or TAPS a chip and then TAPS a bin (keyboard: Enter on a chip, then Enter on a bin). Tap a placed chip to take it back.
// The answer for every group comes from the DIRECTORS table of engine/reactions-aromatic.js (the same table the reaction engine uses); each group has its own reason.
// config: { groups: [ids of DIRECTORS], intro?: html }
// Pure: expected(config) -> {id: bin}, grade(config, placement) -> {ok, wrong:[ids], missing:[ids], diagnosis}. ctx.onResult({ok:false, diagnosis}) after a wrong check,
// ctx.onResult({ok:true}) when every group is in the right bin.
import { DIRECTORS, BINS } from '../reactions-aromatic.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export const BIN_ORDER = ['actOP', 'deactOP', 'deactM'];

export function expected(config) { return Object.fromEntries(config.groups.map((id) => [id, DIRECTORS[id].cls])); }
export function grade(config, placement) {
  const want = expected(config);
  const missing = config.groups.filter((id) => !placement[id]);
  if (missing.length) return { ok: false, code: 'missing', missing, wrong: [], diagnosis: `Place every group first (${missing.length} left in the tray).` };
  const wrong = config.groups.filter((id) => placement[id] !== want[id]);
  if (!wrong.length) return { ok: true, code: 'ok', wrong: [], missing: [], diagnosis: '' };
  const id = wrong[0];
  const rest = wrong.slice(1).map((x) => DIRECTORS[x].label);
  const d = `${DIRECTORS[id].label} does not belong in “${BINS[placement[id]].label}”. It is in “${BINS[want[id]].label}”. ${DIRECTORS[id].why}${rest.length ? ` Also check: ${rest.join(', ')}.` : ''}`;
  return { ok: false, code: 'wrong', wrong, missing: [], diagnosis: d };
}

export default {
  id: 'director-sort',
  mount(host, config, ctx) {
    const placed = {};              // id -> bin
    const locked = new Set();
    let selected = null, finished = false;
    host.innerHTML = '';
    const root = h('div', 'ds');
    if (config.intro) root.append(h('p', 'ds-intro', config.intro));
    const hint = h('p', 'ds-hint muted small', 'Drag a group onto a bin, or tap the group and then tap the bin.');
    const tray = h('div', 'ds-tray'); tray.setAttribute('role', 'group'); tray.setAttribute('aria-label', 'Groups still to place');
    const bins = h('div', 'ds-bins');
    const msg = h('p', 'ds-msg'); msg.setAttribute('aria-live', 'polite');
    const act = h('div', 'lb-actions');
    const check = h('button', 'btn primary'); check.type = 'button'; check.textContent = 'Check';
    act.append(check);
    const binEls = {};
    BIN_ORDER.forEach((b) => {
      const el = h('div', 'ds-bin ds-' + b);
      el.dataset.bin = b;
      el.setAttribute('role', 'button'); el.tabIndex = 0;
      el.setAttribute('aria-label', 'Bin: ' + BINS[b].label + '. Place the selected group here.');
      el.append(h('p', 'ds-bin-h', `<b>${BINS[b].label}</b>`), h('div', 'ds-slot'));
      el.addEventListener('click', (e) => { if (e.target.closest('.ds-chip')) return; place(b); });
      el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.ds-chip')) { e.preventDefault(); place(b); } });
      bins.append(el);
      binEls[b] = el;
    });
    root.append(hint, tray, bins, msg, act);
    host.append(root);

    const chips = {};
    config.groups.forEach((id) => {
      const g = DIRECTORS[id];
      const c = h('button', 'ds-chip'); c.type = 'button'; c.dataset.id = id;
      c.innerHTML = `<span class="ds-lab">${g.label}</span><span class="ds-nm">${g.name}</span>`;
      c.setAttribute('aria-label', `Group ${g.label}, ${g.name}`);
      c.setAttribute('aria-pressed', 'false');
      chips[id] = c;
      c.addEventListener('click', (e) => { if (c._dragged) { c._dragged = false; return; } onChip(id); });
      // drag with a pointer (mouse, pen, touch)
      c.addEventListener('pointerdown', (e) => {
        if (finished || locked.has(id) || e.button > 0) return;
        const sx = e.clientX, sy = e.clientY;
        let ghost = null, moved = false;
        const move = (ev) => {
          if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
          if (!moved) { moved = true; ghost = c.cloneNode(true); ghost.classList.add('ds-ghost'); document.body.append(ghost); c.classList.add('ds-lifted'); }
          ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
          const over = document.elementFromPoint(ev.clientX, ev.clientY);
          Object.values(binEls).forEach((b) => b.classList.toggle('ds-over', !!over && b.contains(over)));
        };
        const up = (ev) => {
          document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
          if (!moved) return;
          c._dragged = true; setTimeout(() => { c._dragged = false; }, 0);
          const over = document.elementFromPoint(ev.clientX, ev.clientY);
          ghost.remove(); c.classList.remove('ds-lifted');
          Object.values(binEls).forEach((b) => b.classList.remove('ds-over'));
          const bin = over && over.closest && over.closest('.ds-bin');
          if (bin) { selected = id; place(bin.dataset.bin); } else if (placed[id]) { /* dropped outside: stay */ }
        };
        document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
      });
    });

    function onChip(id) {
      if (finished || locked.has(id)) return;
      if (placed[id]) { delete placed[id]; selected = null; msg.textContent = ''; msg.className = 'ds-msg'; paint(); return; }
      selected = selected === id ? null : id;
      paint();
    }
    function place(bin) {
      if (finished || !selected) { if (!finished && !selected) { msg.className = 'ds-msg'; msg.textContent = 'Pick a group first (tap it), then tap the bin.'; } return; }
      placed[selected] = bin; selected = null; msg.textContent = ''; msg.className = 'ds-msg';
      paint();
    }
    function paint() {
      tray.innerHTML = '';
      Object.values(binEls).forEach((b) => { b.querySelector('.ds-slot').innerHTML = ''; });
      config.groups.forEach((id) => {
        const c = chips[id];
        c.classList.toggle('sel', selected === id);
        c.setAttribute('aria-pressed', String(selected === id));
        c.classList.toggle('lock', locked.has(id));
        c.disabled = finished || locked.has(id);
        (placed[id] ? binEls[placed[id]].querySelector('.ds-slot') : tray).append(c);
      });
      if (!tray.children.length) tray.append(h('span', 'ds-empty muted small', 'All groups placed. Press Check.'));
      check.disabled = finished || config.groups.some((id) => !placed[id]);
    }
    check.addEventListener('click', () => {
      if (finished) return;
      const r = grade(config, placed);
      if (r.ok) {
        finished = true; config.groups.forEach((id) => locked.add(id)); paint();
        msg.className = 'ds-msg ok'; msg.textContent = 'All correct.';
        const det = h('details', 'ds-why'); det.append(h('summary', null, 'Why each group sits where it does'));
        const ul = h('ul'); config.groups.forEach((id) => ul.append(h('li', null, `<b>${DIRECTORS[id].label}</b> (${BINS[DIRECTORS[id].cls].short}): ${DIRECTORS[id].why}`)));
        det.append(ul); root.append(det);
        ctx.onResult({ ok: true });
        return;
      }
      config.groups.forEach((id) => { if (!r.wrong.includes(id)) locked.add(id); });
      r.wrong.forEach((id) => { delete placed[id]; });
      msg.className = 'ds-msg bad'; msg.textContent = `${r.wrong.length} group${r.wrong.length > 1 ? 's' : ''} in the wrong bin went back to the tray. The ones that were right are locked.`;
      paint();
      ctx.onResult({ ok: false, diagnosis: r.diagnosis, code: r.code });
    });
    paint();
    return { destroy() {} };
  }
};
