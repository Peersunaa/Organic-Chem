// Widget: stereo-grid (Lesson 16; reusable). A molecule with n chirality centres has up to 2^n combinations of R/S.
// config: { entry:'threonine' (id in engine/stereoisomers.js STEREO_POOL), need?:'all'|'mirror', anchor?:true, view?:true, links?:true, ask? }
//   Phase 1 (label): the 2^n stereoisomers are drawn with wedges and dashes in a grid; the learner gives each drawing its R/S at every centre
//                    (one drawing starts labelled with `anchor`). Graded from the CIP labels (engine/cip.js, checked against Python RDKit).
//   Phase 2 (link):  the grid is arranged by the R/S of the first centre (rows) and the second (columns). The learner taps two drawings and says
//                    "Enantiomers", "Diastereomers" or "The same compound". Graded from relationship() (engine/chirality.js): never from the labels.
//   need 'all' (default) links every pair (6 for two centres); 'mirror' only asks for the mirror-image partners.
//   view:true shows the finished grid without asking anything (for worked examples); links:true lists every relationship underneath.
import { svg } from '../chem.js';
import { tetraInfo } from '../cip.js';
import { relationship } from '../chirality.js';
import { POOL_BY_ID, enumerateCached, centersOfEntry, labelText, centerDiff, describePair, whyNot, KIND_LABEL } from '../stereoisomers.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const SUBN = '₀₁₂₃₄₅₆₇₈₉';

/** The 2^n drawings of an entry: { smiles, labels:['R','S'..], text:'2R,3S' } in the order of the grid (R before S, first centre first). */
export function cellsFor(entryId) {
  const e = POOL_BY_ID[entryId];
  const E = enumerateCached(e);
  const ord = locOrder(e);
  const cells = E.combos.map((c, i) => ({ smiles: c.smiles, labels: c.labels, byLoc: ord.map((k) => c.labels[k]), text: labelText(e, c.labels), i }));
  cells.sort((a, b) => a.byLoc.join('').localeCompare(b.byLoc.join('')));
  return cells.map((c, k) => ({ ...c, k }));
}
export const centerNames = (e) => e.loc[0].map((n) => `C${n}`);
/** Centre indexes in order of their locant (C2 before C3). */
export const locOrder = (e) => e.loc[0].map((n, k) => k).sort((a, b) => e.loc[0][a] - e.loc[0][b]);

/** Grade one drawing's chosen labels. chosen: ['R','S',..] (null for open). Returns { ok, wrongAt:[k..], diagnosis }. */
export function gradeLabels(entryId, smiles, chosen, drawingNo = 1) {
  const e = POOL_BY_ID[entryId];
  const T = tetraInfo(smiles).filter((t) => t.center);
  const names = centerNames(e);
  if (chosen.some((c) => !c)) return { ok: false, open: true, diagnosis: `Choose R or S at every center in drawing ${drawingNo}.` };
  const wrongAt = T.map((t, k) => (t.label === chosen[k] ? -1 : k)).filter((k) => k >= 0);
  if (!wrongAt.length) return { ok: true, wrongAt: [] };
  const k = wrongAt[0], t = T[k];
  const order = t.order.map((i) => t.subs[i].label).join(' > ');
  return { ok: false, wrongAt, diagnosis: `In drawing ${drawingNo}, ${names[k]} is ${t.label}, not ${chosen[k]}. The groups rank ${order}; with H pointing away, follow 1 → 2 → 3 (reverse your reading if H is on a wedge).` };
}
/** The pairs the learner has to link. */
export function neededPairs(cells, need = 'all') {
  const out = [];
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
    const rel = relationship(cells[i].smiles, cells[j].smiles).kind;
    if (need === 'all' || rel === 'enantiomers') out.push([i, j]);
  }
  return out;
}
/** Grade a link between drawings i and j (indexes in cellsFor order) as `kind` ('enantiomers'|'diastereomers'|'identical'). */
export function gradeLink(entryId, cells, i, j, kind) {
  const e = POOL_BY_ID[entryId];
  const a = cells[i], b = cells[j];
  const info = relationship(a.smiles, b.smiles);
  if (info.kind === kind) return { ok: true, truth: info.kind, info };
  const desc = describePair(e, a.smiles, b.smiles);
  return { ok: false, truth: info.kind, info, diagnosis: whyNot(kind, info.kind, info, desc, {}) };
}
/** One-line explanation of a correct link, for the learner. */
export function linkSentence(entryId, cells, i, j) {
  const e = POOL_BY_ID[entryId];
  const a = cells[i], b = cells[j];
  const info = relationship(a.smiles, b.smiles);
  const d = centerDiff(a.smiles, b.smiles);
  const names = centerNames(e);
  const at = (xs) => xs.map((x) => names[centersOfEntry(e).indexOf(x)]).join(' and ');
  if (info.kind === 'enantiomers') return `Opposite at every center (${a.text} and ${b.text}): mirror images that do not superimpose.`;
  if (info.kind === 'identical') return info.mesoA ? `The same meso compound: it has a plane of symmetry, so (${a.text}) and (${b.text}) are one molecule drawn two ways.` : `The same compound drawn twice.`;
  return d && d.opp.length ? `Opposite at ${at(d.opp)} but the same at ${at(d.same)}: not mirror images, so diastereomers.` : 'Not mirror images: diastereomers.';
}

function figure(smiles, label) {
  const f = el('figure', 'sg-fig');
  f.append(el('div', 'sg-svg', svg(smiles, { width: 210, height: 150, style: 'skeletal' })));
  if (label != null) f.append(el('figcaption', '', label));
  return f;
}

export default {
  id: 'stereo-grid',
  mount(host, config, ctx = { onResult() {}, onProgress() {} }) {
    host.innerHTML = '';
    const e = POOL_BY_ID[config.entry];
    const cells = cellsFor(config.entry);
    const n = centersOfEntry(e).length;
    const names = centerNames(e);
    const root = el('div', 'sg'); host.append(root);
    const rel = (i, j) => relationship(cells[i].smiles, cells[j].smiles).kind;

    // ------------------------------------------------------------ view only
    if (config.view) {
      root.append(gridView(cells, e, n, 'view'));
      if (config.links) {
        const ul = el('ul', 'sg-links');
        for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
          const k = rel(i, j);
          ul.append(el('li', 'sg-link ' + k, `<b>(${cells[i].text}) and (${cells[j].text})</b>: ${KIND_LABEL[k].toLowerCase()}`));
        }
        root.append(ul);
      }
      return { destroy() {} };
    }

    // ------------------------------------------------------------ phase 1: label every drawing
    const order = (config.order || [2, 0, 3, 1, 4, 5, 6, 7]).filter((k) => k < cells.length);
    const shown = order.concat(cells.map((_, k) => k).filter((k) => !order.includes(k)));   // display order of the cells (indexes into `cells`)
    const choice = cells.map(() => Array(n).fill(null));
    const locked = new Set();
    const anchor = config.anchor !== false ? shown[0] : -1;
    if (anchor >= 0) { choice[anchor] = cells[anchor].labels.slice(); locked.add(anchor); }
    const ask = el('p', 'sg-ask', config.ask || `This molecule has ${n} chirality centers, so up to 2<sup>${n}</sup> = ${2 ** n} combinations of R and S. Give each drawing its R or S at ${names.join(' and ')}. The first one is done for you.`);
    const grid = el('div', 'sg-grid sg-label');
    grid.style.setProperty('--cols', n === 2 ? 2 : Math.min(4, 2 ** Math.ceil(n / 2)));
    const cellEls = {};
    const msg = el('p', 'sg-msg'); msg.setAttribute('aria-live', 'polite');
    shown.forEach((ci, pos) => {
      const c = cells[ci];
      const box = el('div', 'sg-cell');
      box.append(el('div', 'sg-no', `Drawing ${pos + 1}`), figure(c.smiles));
      const rows = el('div', 'sg-rows');
      locOrder(e).forEach((k) => {
        const nm = names[k];
        const row = el('div', 'sg-row'); row.append(el('span', 'sg-cn', nm));
        ['R', 'S'].forEach((L) => {
          const b = el('button', 'sg-rs', L); b.type = 'button'; b.setAttribute('aria-pressed', String(choice[ci][k] === L));
          b.setAttribute('aria-label', `Drawing ${pos + 1}, ${nm} is ${L}`);
          b.disabled = locked.has(ci);
          b.addEventListener('click', () => {
            if (locked.has(ci)) return;
            choice[ci][k] = choice[ci][k] === L ? null : L;
            row.querySelectorAll('.sg-rs').forEach((x) => x.setAttribute('aria-pressed', String(x.textContent === choice[ci][k])));
            box.classList.remove('bad'); msg.textContent = '';
          });
          row.append(b);
        });
        rows.append(row);
      });
      box.append(rows);
      cellEls[ci] = box; grid.append(box);
      if (locked.has(ci)) box.classList.add('ok');
    });
    const check = el('button', 'btn primary', 'Check the labels'); check.type = 'button';
    root.append(ask, grid, el('div', 'sg-bar'), msg);
    root.querySelector('.sg-bar').append(check);

    // ------------------------------------------------------------ phase 2: link the pairs
    const phase2 = () => {
      root.innerHTML = '';
      const need = neededPairs(cells, config.need || 'all');
      const done = new Set();
      const key = (i, j) => (i < j ? `${i}-${j}` : `${j}-${i}`);
      const intro = el('p', 'sg-ask', config.need === 'mirror'
        ? 'Labels done. The grid is now sorted by R/S. Tap two drawings that are <b>mirror images</b> to link them, then say how they are related.'
        : `Labels done. The grid is now sorted by R/S. Tap any <b>two</b> drawings, then say how they are related: <b>${need.length} pairs</b> to link.`);
      const g2 = gridView(cells, e, n, 'link');
      const sel = [];
      const status = el('p', 'sg-status', `Pairs linked: 0 of ${need.length}`); status.setAttribute('aria-live', 'polite');
      const panel = el('div', 'sg-pick'); panel.hidden = true;
      const q = el('p', 'sg-q'); const opts = el('div', 'cf-ans');
      [['enantiomers', 'Enantiomers'], ['diastereomers', 'Diastereomers'], ['identical', 'The same compound']].forEach(([k, t]) => {
        const b = el('button', 'btn', t); b.type = 'button'; b.dataset.k = k; opts.append(b);
      });
      const cancel = el('button', 'btn ghost small', 'Choose different drawings'); cancel.type = 'button';
      panel.append(q, opts, cancel);
      const linked = el('ul', 'sg-links');
      const sayLive = el('p', 'sg-msg'); sayLive.setAttribute('aria-live', 'polite');
      root.append(intro, g2, status, panel, sayLive, linked);
      const cellBtn = (k) => g2.querySelector(`[data-k="${k}"]`);
      const clearSel = () => { sel.length = 0; g2.querySelectorAll('.sg-cell').forEach((x) => x.setAttribute('aria-pressed', 'false')); panel.hidden = true; };
      g2.addEventListener('click', (ev) => {
        const b = ev.target.closest('.sg-cell'); if (!b) return;
        const k = Number(b.dataset.k);
        const at = sel.indexOf(k);
        if (at >= 0) { sel.splice(at, 1); b.setAttribute('aria-pressed', 'false'); panel.hidden = true; return; }
        if (sel.length >= 2) return;
        sel.push(k); b.setAttribute('aria-pressed', 'true');
        if (sel.length === 2) {
          const [i, j] = sel;
          if (done.has(key(i, j))) { sayLive.textContent = 'You already linked these two. Pick another pair.'; clearSel(); return; }
          q.innerHTML = `How are <b>(${cells[i].text})</b> and <b>(${cells[j].text})</b> related?`;
          panel.hidden = false; sayLive.textContent = '';
          opts.querySelector('button').focus({ preventScroll: true });
        }
      });
      cancel.addEventListener('click', clearSel);
      opts.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-k]'); if (!b || sel.length < 2) return;
        const [i, j] = sel;
        const r = gradeLink(config.entry, cells, i, j, b.dataset.k);
        if (!r.ok) { sayLive.textContent = ''; ctx.onResult({ ok: false, diagnosis: r.diagnosis }); return; }
        done.add(key(i, j));
        const li = el('li', 'sg-link ' + r.truth, `<b>(${cells[i].text}) and (${cells[j].text}): ${KIND_LABEL[r.truth].toLowerCase()}.</b> ${linkSentence(config.entry, cells, i, j)}`);
        linked.append(li);
        const mine = need.filter(([x, y]) => done.has(key(x, y))).length;
        status.textContent = `Pairs linked: ${mine} of ${need.length}`;
        clearSel();
        if (mine >= need.length) { sayLive.textContent = ''; ctx.onResult({ ok: true }); }
        else { ctx.onProgress && ctx.onProgress(); sayLive.textContent = 'Right. Link another pair.'; }
      });
    };

    check.addEventListener('click', () => {
      let allOk = true, first = null;
      shown.forEach((ci, pos) => {
        if (locked.has(ci)) return;
        const r = gradeLabels(config.entry, cells[ci].smiles, choice[ci], pos + 1);
        cellEls[ci].classList.toggle('bad', !r.ok);
        if (r.ok) { locked.add(ci); cellEls[ci].classList.add('ok'); cellEls[ci].querySelectorAll('.sg-rs').forEach((b) => { b.disabled = true; }); }
        else { allOk = false; if (!first) first = r; }
      });
      if (allOk) { ctx.onProgress && ctx.onProgress(); phase2(); return; }
      msg.textContent = '';
      ctx.onResult({ ok: false, diagnosis: first.diagnosis });
    });
    return { destroy() {} };
  }
};

/** The grid itself. mode 'link': each cell is a button, sorted by labels with row and column headings (n = 2). mode 'view': plain figures. */
function gridView(cells, e, n, mode) {
  const g = el('div', 'sg-grid sg-' + mode);
  const cols = n === 2 ? 2 : Math.min(4, 2 ** Math.ceil(n / 2));
  g.style.setProperty('--cols', cols);
  if (n === 2) {
    const names = centerNames(e), o = locOrder(e);
    g.classList.add('with-heads');
    g.append(el('span', 'sg-corner', ''));
    ['R', 'S'].forEach((L) => g.append(el('span', 'sg-head', `${names[o[1]]} = ${L}`)));
    ['R', 'S'].forEach((rowL) => {
      g.append(el('span', 'sg-head side', `${names[o[0]]} = ${rowL}`));
      ['R', 'S'].forEach((colL) => {
        const c = cells.find((x) => x.byLoc[0] === rowL && x.byLoc[1] === colL);
        g.append(cellOf(c, mode));
      });
    });
  } else cells.forEach((c) => g.append(cellOf(c, mode)));
  return g;
}
function cellOf(c, mode) {
  const box = el(mode === 'link' ? 'button' : 'div', 'sg-cell sg-fixed');
  if (mode === 'link') { box.type = 'button'; box.setAttribute('aria-pressed', 'false'); box.setAttribute('aria-label', `Stereoisomer (${c.text})`); box.dataset.k = c.k; }
  box.append(figure(c.smiles, `(${c.text})`));
  return box;
}
