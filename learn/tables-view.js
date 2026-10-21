// Reaction tables screen (#table): three tabs (alkenes, alkynes, rings); rows = every builder tile of the class (drawn, named, sticky first column), columns = reagents
// (sticky header). A cell = the major product(s) drawn small + a one-word pattern tag; no-reaction cells are muted with the reason, not-modelled cells blank grey.
// Tap a cell: the builder's result panel (slide-over on phones, side panel on desktop). Pattern colours (hue + glyph), quiz mode (cells hidden, four drawn options,
// "k of n filled", misses to the weak-spot log), caveman notes under each cell, a column picker. All data from engine/tables.js (which reads engine/builder.js).
import { h, molFigure, setIupacMode, nameSpan } from './engine/steps.js';
import { svg as rdSvg } from './engine/chem.js';
import * as B from './engine/builder.js';
import * as TB from './engine/tables.js';
import { t, tAuto, cavemanOn, onVoiceChange } from './engine/voice.js';
import { resultBlocks, nameNode, tileSvg } from './builder-view.js';
import * as store from './engine/store.js';
import { morphKey, loadMorphs } from './morph/morph.js';
import { playInto } from './morph/morph-ui.js';

const KEY = 'orgo.tables.v1';
const BKEY = 'orgo.builder.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } };
const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* storage blocked: choices are not kept */ } };
const iupac = () => { try { return store.getIupac() === 'old' ? 'old' : 'new'; } catch (e) { return 'new'; } };
const cellKey = (row, col) => row + '|' + col;
const svgCache = new Map();
function smallSvg(smiles, w, hh) {
  const k = smiles + '|' + w + '|' + hh;
  if (!svgCache.has(k)) svgCache.set(k, rdSvg(smiles, { width: w, height: hh, style: 'skeletal' }));
  return svgCache.get(k);
}

/** #table: returns the nodes app.js mounts under the header. */
export function tablesPage(chemReady) {
  const saved = load();
  const st = {
    tab: TB.TABLE_BY_ID[saved.tab] ? saved.tab : 'alkenes', hl: !!saved.hl, quiz: !!saved.quiz,
    hidden: saved.hidden && typeof saved.hidden === 'object' ? saved.hidden : {}, filled: saved.filled && typeof saved.filled === 'object' ? saved.filled : {}
  };
  const persist = () => save({ tab: st.tab, hl: st.hl, quiz: st.quiz, hidden: st.hidden, filled: st.filled });
  const filledSet = () => new Set(st.filled[st.tab] || []);

  const lhead = h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'Reaction tables'),
    h('p', { class: 'lede' }, 'Every starting material against every reagent on one grid: the major product, drawn, with its pattern in one word. Tap a cell for the mechanism and why. Quiz mode hides the products so you can fill the table in yourself.'),
    h('p', { class: 'small rt-links' }, h('a', { class: 'btn small ghost', href: '#build', id: 'rt-builder' }, 'Reaction builder'), h('span', { class: 'muted' }, ' One pair at a time, with chaining and the full ring reagent set.')));
  const root = h('div', { class: 'rt', id: 'rt' });
  const tabs = h('div', { class: 'rt-tabs', role: 'tablist', 'aria-label': 'Tables' });
  const tools = h('div', { class: 'rt-tools' });
  const legend = h('div', { class: 'rt-legend', id: 'rt-legend', hidden: 'hidden' });
  const qbar = h('div', { class: 'rt-qbar', id: 'rt-qbar', hidden: 'hidden', 'aria-live': 'polite' });
  // the morph hint: one line, worded for the device (hover plays on a desktop; on a phone the first tap plays, the second opens the details)
  const canHover = (() => { try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { return true; } })();
  const mhint = h('p', { class: 'small muted rt-mhint', id: 'rt-mhint' }, h('span', { class: 'rt-mhint-i', 'aria-hidden': 'true' }, '▶'),
    canHover ? 'Hover a cell to watch the starting material turn into the product. Click it for the details.' : 'Tap a cell once to watch the starting material turn into the product, tap it again for the details.');
  const scroller = h('div', { class: 'rt-scroll', id: 'rt-scroll', tabindex: '0', role: 'region', 'aria-label': 'Reaction table, scrolls sideways' });
  const panel = h('aside', { class: 'rt-panel', id: 'rt-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'rt-ph', hidden: 'hidden' });
  const scrim = h('div', { class: 'rt-scrim', hidden: 'hidden' });
  root.append(tabs, tools, legend, qbar, mhint, scroller, scrim, panel);
  root.append(h('p', { class: 'muted rt-loading' }, 'Loading chemistry engine…'));

  // ---------------------------------------------------------------- tabs and tools
  function drawTabs() {
    tabs.innerHTML = '';
    TB.TABLES.forEach((T) => {
      const d = TB.tableData(T.id);
      const on = T.id === st.tab;
      const b = h('button', { type: 'button', role: 'tab', class: 'btn small rt-tab', id: 'rt-tab-' + T.id, 'aria-selected': String(on), 'aria-pressed': String(on), 'aria-controls': 'rt-scroll' }, T.label, h('span', { class: 'rt-tabn' }, `${d.rows.length} × ${d.cols.length}`));
      b.addEventListener('click', () => { if (st.tab === T.id) return; st.tab = T.id; persist(); closePanel(); drawAll(); });
      tabs.append(b);
    });
  }
  const hlB = h('button', { type: 'button', class: 'btn small rt-toggle', id: 'rt-hl', 'aria-pressed': 'false' }, 'Pattern colours');
  const quizB = h('button', { type: 'button', class: 'btn small rt-toggle', id: 'rt-quiz', 'aria-pressed': 'false' }, 'Quiz mode');
  const colsD = h('details', { class: 'rt-cols', id: 'rt-cols' });
  tools.append(hlB, quizB, colsD);
  hlB.addEventListener('click', () => { st.hl = !st.hl; persist(); drawTools(); drawLegend(); drawTable(); });
  quizB.addEventListener('click', () => { st.quiz = !st.quiz; persist(); closePanel(); drawTools(); drawTable(); });
  function drawTools() {
    hlB.setAttribute('aria-pressed', String(st.hl));
    quizB.setAttribute('aria-pressed', String(st.quiz));
    const d = TB.tableData(st.tab);
    const hid = new Set(st.hidden[st.tab] || []);
    const shown = d.cols.length - d.cols.filter((c) => hid.has(c.id)).length;
    const open = colsD.open;
    colsD.innerHTML = '';
    colsD.append(h('summary', { class: 'btn small ghost' }, `Columns: ${shown} of ${d.cols.length}`));
    const box = h('div', { class: 'rt-colbox', role: 'group', 'aria-label': 'Columns to show' });
    d.cols.forEach((c) => {
      const id = 'rt-col-' + c.id;
      const cb = h('input', { type: 'checkbox', id, 'data-col': c.id });
      cb.checked = !hid.has(c.id);
      cb.addEventListener('change', () => {
        const set = new Set(st.hidden[st.tab] || []);
        if (cb.checked) set.delete(c.id); else set.add(c.id);
        if (set.size >= d.cols.length) { set.delete(c.id); cb.checked = true; }
        st.hidden[st.tab] = [...set]; persist(); drawTools(); drawTable();
      });
      box.append(h('label', { class: 'rt-colopt', for: id }, cb, h('span', {}, c.head)));
    });
    const all = h('button', { type: 'button', class: 'btn small ghost', id: 'rt-col-all' }, 'Show all');
    all.addEventListener('click', () => { st.hidden[st.tab] = []; persist(); drawTools(); drawTable(); });
    box.append(all);
    colsD.append(box);
    colsD.open = open;
    drawQbar();
  }
  function drawLegend() {
    legend.hidden = !st.hl;
    legend.innerHTML = '';
    if (!st.hl) return;
    const d = TB.tableData(st.tab);
    const present = new Set(d.rows.flatMap((r) => r.cells.map((c) => c.family)).filter(Boolean));
    const list = h('ul', { class: 'rt-leglist', 'aria-label': 'Pattern colours' });
    TB.FAMILIES.filter((f) => present.has(f.id)).forEach((f) => list.append(h('li', { class: 'rt-leg fam-' + f.id }, h('span', { class: 'rt-glyph', 'aria-hidden': 'true' }, f.glyph), f.label)));
    const plain = [...new Set(d.rows.flatMap((r) => r.cells.filter((c) => c.status === 'ok' && !c.family).map((c) => c.tag)))];
    if (plain.length) list.append(h('li', { class: 'rt-leg rt-leg-none' }, h('span', { class: 'rt-glyph', 'aria-hidden': 'true' }, '–'), `no colour: ${plain.join(', ')}`));
    legend.append(list);
  }
  function drawQbar() {
    qbar.hidden = !st.quiz;
    mhint.hidden = st.quiz;
    qbar.innerHTML = '';
    if (!st.quiz) return;
    const d = TB.tableData(st.tab);
    const okKeys = d.rows.flatMap((r) => r.cells.filter((c) => c.status === 'ok').map((c) => cellKey(r.id, c.reagent)));
    const f = filledSet();
    const k = okKeys.filter((x) => f.has(x)).length;
    const rev = h('button', { type: 'button', class: 'btn small ghost', id: 'rt-reveal' }, 'Reveal all');
    const reset = h('button', { type: 'button', class: 'btn small ghost', id: 'rt-reset' }, 'Reset');
    rev.addEventListener('click', () => { st.filled[st.tab] = okKeys; persist(); drawQbar(); drawTable(); });
    reset.addEventListener('click', () => { st.filled[st.tab] = []; persist(); closePanel(); drawQbar(); drawTable(); });
    qbar.append(h('p', { class: 'rt-prog', id: 'rt-prog' }, h('b', {}, `${k} of ${okKeys.length}`), ' filled'), h('div', { class: 'rt-meter', 'aria-hidden': 'true' }, h('span', { style: `width:${okKeys.length ? Math.round((100 * k) / okKeys.length) : 0}%` })), h('div', { class: 'rt-qbtns' }, rev, reset),
      h('p', { class: 'small muted rt-qhint' }, 'Tap a hidden cell and pick the product. A miss goes to your weak-spot list on the home page.'));
  }

  // ---------------------------------------------------------------- the table
  function cellLabel(row, col, c, hiddenCell) {
    const sub = row.name[iupac()] || row.name.new;
    if (c.status === 'none') return `${sub} with ${col.head}: no reaction. ${c.reason}`;
    if (c.status === 'na') return `${sub} with ${col.head}: not modelled. ${c.reason}`;
    if (hiddenCell) return `${sub} with ${col.head}: hidden, tap to answer`;
    return `${sub} with ${col.head}: ${c.draw.map((s) => B.describe(s)).join(' and ')}${c.more ? ` and ${c.more} more` : ''}; ${c.tag}`;
  }
  function cellNode(row, col, c, f) {
    const key = cellKey(row.id, col.id);
    const hiddenCell = st.quiz && c.status === 'ok' && !f.has(key);
    const td = h('td', { class: `rt-cell is-${c.status}` + (st.hl && c.family && !hiddenCell ? ' fam-' + c.family : '') + (hiddenCell ? ' is-hidden' : '') + (st.quiz && c.status === 'ok' && !hiddenCell ? ' is-filled' : ''), 'data-row': row.id, 'data-col': col.id });
    const btn = h('button', { type: 'button', class: 'rt-btn', 'aria-label': cellLabel(row, col, c, hiddenCell), title: c.status !== 'ok' ? c.reason : (c.note || '') });
    if (c.status === 'none') btn.append(h('span', { class: 'rt-none' }, 'no rxn'));
    else if (c.status === 'na') btn.append(h('span', { class: 'sr-only' }, 'not modelled'));
    else if (hiddenCell) btn.append(h('span', { class: 'rt-q', 'aria-hidden': 'true' }, '?'));
    else {
      const draws = h('span', { class: 'rt-draws' + (c.draw.length > 1 ? ' is-two' : '') });
      c.draw.forEach((s) => draws.append(h('span', { class: 'rt-svg', 'aria-hidden': 'true', html: smallSvg(s, 92, 62) })));
      btn.append(draws);
      const fam = st.hl && c.family ? TB.FAMILY_BY_ID[c.family] : null;
      btn.append(h('span', { class: 'rt-tagrow' }, st.quiz ? h('span', { class: 'rt-check', 'aria-hidden': 'true' }, '✓') : null, h('span', { class: 'rt-tag' }, fam ? h('span', { class: 'rt-glyph', 'aria-hidden': 'true' }, fam.glyph) : null, c.tag),
        c.more ? h('span', { class: 'rt-more' }, `+${c.more}`) : null, c.minor ? h('span', { class: 'rt-minor' }, c.minor) : null));
      if (cavemanOn() && c.cave) btn.append(h('span', { class: 'rt-cave' }, c.cave));
    }
    // the morph: hover (mouse) plays it in the cell; on a touch screen the first tap plays it and the second opens the panel. Hidden quiz cells never play.
    const canMorph = c.status === 'ok' && !hiddenCell;
    if (canMorph) {
      btn.addEventListener('pointerdown', (e) => { lastPT = e.pointerType; });
      btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') playCell(td, row, col, c); });
    }
    btn.addEventListener('click', () => {
      const touch = lastPT === 'touch' || lastPT === 'pen';
      lastPT = null;
      if (canMorph && touch && !td.dataset.played) {
        td.dataset.played = '1';
        playCell(td, row, col, c).then((any) => { if (!any) openCell(row, col, c, btn); });
        return;
      }
      openCell(row, col, c, btn);
    });
    td.append(btn);
    return td;
  }
  let lastPT = null;
  /** Play the morph in every drawn product of the cell; after the first play a small replay button sits in the cell's corner. Resolves false when there is none. */
  function playCell(td, row, col, c) {
    const key = morphKey(row.smiles, col.id);
    const spans = [...td.querySelectorAll('.rt-svg')];
    return Promise.all(spans.map((sp, i) => playInto(sp, key, c.draw[i]))).then((r) => {
      const any = r.some(Boolean);
      if (any && !td.querySelector('.rt-replay')) {
        const rb = h('button', { type: 'button', class: 'rt-replay', 'aria-label': `Replay the change: ${row.name[iupac()] || row.name.new} with ${col.head}`, title: 'Replay the change' }, '↻');
        rb.addEventListener('click', (e) => { e.stopPropagation(); playCell(td, row, col, c); });
        td.append(rb);
      }
      return any;
    });
  }
  function drawTable() {
    const d = TB.tableData(st.tab);
    const hid = new Set(st.hidden[st.tab] || []);
    const cols = d.cols.filter((c) => !hid.has(c.id));
    const f = filledSet();
    const left = scroller.scrollLeft, top = scroller.scrollTop;
    const head = h('tr', {}, h('th', { scope: 'col', class: 'rt-corner' }, 'Starting material'),
      ...cols.map((c) => h('th', { scope: 'col', class: 'rt-colh', 'data-col': c.id, title: c.label }, h('span', { class: 'rt-h' }, c.head), c.note ? h('span', { class: 'rt-hn' }, c.note) : null)));
    const body = h('tbody', {});
    d.rows.forEach((row) => {
      const ci = d.cols.map((c, i) => [c, row.cells[i]]).filter(([c]) => !hid.has(c.id));
      body.append(h('tr', { 'data-row': row.id }, h('th', { scope: 'row', class: 'rt-sub' }, h('span', { class: 'rt-subsvg', 'aria-hidden': 'true', html: smallSvg(row.smiles, 96, 60) }), h('span', { class: 'rt-subname' }, nameSpan(row.name))),
        ...ci.map(([c, cell]) => cellNode(row, c, cell, f))));
    });
    const table = h('table', { class: 'rt-table rt-' + st.tab, id: 'rt-table', style: `--rt-cols:${cols.length}` }, h('caption', { class: 'sr-only' }, `${d.table.label}: ${d.rows.length} starting materials against ${cols.length} reagents`), h('thead', {}, head), body);
    scroller.innerHTML = '';
    scroller.append(table);
    scroller.scrollLeft = left; scroller.scrollTop = top;
    setIupacMode(iupac());
  }
  function drawAll() { drawTabs(); drawTools(); drawLegend(); drawTable(); }

  // ---------------------------------------------------------------- the side panel (slide-over on phones)
  let widgets = [];
  let lastBtn = null;
  let panelCell = null;
  const drop = () => { widgets.forEach((w) => { try { w.destroy && w.destroy(); } catch (e) { /* ignore */ } }); widgets = []; };
  /** Desktop: the panel sits beside the table, so the table's scroll box narrows to end where the panel starts (every cell stays reachable). */
  function fitBesidePanel() {
    scroller.style.marginRight = '';
    if (panel.hidden || !window.matchMedia('(min-width: 1000px)').matches) return;
    const over = scroller.getBoundingClientRect().right - panel.getBoundingClientRect().left + 12;
    if (over > 0) scroller.style.marginRight = Math.round(over) + 'px';
  }
  window.addEventListener('resize', () => { if (root.isConnected) fitBesidePanel(); });
  function closePanel() {
    drop();
    panel.hidden = true; scrim.hidden = true; panel.innerHTML = ''; panelCell = null;
    fitBesidePanel();
    document.removeEventListener('keydown', onKey);
    if (lastBtn && lastBtn.isConnected) lastBtn.focus({ preventScroll: true });
    else if (lastBtn) { const again = scroller.querySelector(`td[data-row="${lastBtn.dataset.r}"][data-col="${lastBtn.dataset.c}"] .rt-btn`); if (again) again.focus({ preventScroll: true }); }
  }
  function onKey(e) { if (e.key === 'Escape') closePanel(); }
  function openCell(row, col, c, btn) {
    lastBtn = btn; btn.dataset.r = row.id; btn.dataset.c = col.id;
    panelCell = { row, col, c };
    drawPanel();
    panel.hidden = false; scrim.hidden = false;
    fitBesidePanel();
    if (btn.isConnected) btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    document.addEventListener('keydown', onKey);
    panel.scrollTop = 0;
    const hh = panel.querySelector('#rt-ph');
    if (hh) hh.focus({ preventScroll: true });
  }
  function openInBuilder(row, col) {
    let b = {};
    try { b = JSON.parse(localStorage.getItem(BKEY) || 'null') || {}; } catch (e) { b = {}; }
    const r = B.REAGENT_BY_ID[col.id];
    try { localStorage.setItem(BKEY, JSON.stringify({ ...b, sub: row.smiles, subTab: B.SUBSTRATE_BY_ID[row.id].group, rtab: r.top, reagent: r.id })); } catch (e) { /* storage blocked: the builder opens on its default */ }
    location.hash = '#build';
  }
  function drawPanel() {
    drop();
    panel.innerHTML = '';
    if (!panelCell) return;
    const { row, col, c } = panelCell;
    const key = cellKey(row.id, col.id);
    const res = B.react(row.smiles, col.id);
    const closeB = h('button', { type: 'button', class: 'btn small ghost rt-close', id: 'rt-close', 'aria-label': 'Close' }, 'Close ✕');
    closeB.addEventListener('click', closePanel);
    panel.append(h('div', { class: 'rt-phead' }, h('h2', { id: 'rt-ph', class: 'rt-ptitle', tabindex: '-1' }, nameNode(row.smiles), h('span', { class: 'rt-pplus' }, ' + '), col.head), closeB));
    panel.append(h('div', { class: 'bld-eq rt-peq' }, h('div', { class: 'bld-subfig' }, molFigure(row.smiles, '', { style: 'skeletal', width: 150, height: 104, alt: B.describe(row.smiles) })), h('div', { class: 'bld-arrow' }, h('span', { 'aria-hidden': 'true' }, '→'), h('b', {}, res.reagent.label))));
    const hiddenCell = st.quiz && c.status === 'ok' && !filledSet().has(key);
    if (hiddenCell) { panel.append(quizBox(row, col, c, key)); return; }
    if (c.status === 'ok') panel.append(h('p', { class: 'rt-ptag' }, h('span', { class: 'hub-label' }, 'Pattern'), h('b', { class: 'rt-tag' + (c.family ? ' fam-' + c.family : '') }, c.family ? h('span', { class: 'rt-glyph', 'aria-hidden': 'true' }, TB.FAMILY_BY_ID[c.family].glyph) : null, c.tag), c.note ? h('span', { class: 'muted small' }, ' ' + c.note) : null));
    panel.append(...resultBlocks(res, { onUse: null, widgets, opener: { smiles: row.smiles, name: row.name[iupac()] || row.name.new, from: 'table' } }));
    const ob = h('button', { type: 'button', class: 'btn small rt-tobuilder', id: 'rt-tobuilder' }, 'Open this pair in the builder');
    ob.addEventListener('click', () => openInBuilder(row, col));
    panel.append(h('div', { class: 'rx-btns rt-pfoot' }, ob));
  }
  function quizBox(row, col, c, key) {
    const q = TB.cellQuiz(row.smiles, col.id);
    const box = h('div', { class: 'bld-quiz rt-quiz', id: 'rt-quizbox' }, h('p', { class: 'hub-label' }, 'Fill the cell'), h('p', { class: 'bld-qprompt' }, q ? q.prompt : 'No question for this pair.'));
    if (!q) return box;
    const grid = h('div', { class: 'bld-qopts rt-qopts' });
    const fb = h('p', { class: 'small rt-qfb', id: 'rt-qfb', 'aria-live': 'polite' });
    q.options.forEach((o, i) => {
      const b = h('button', { type: 'button', class: 'bld-qopt', 'data-opt': String(i), 'data-correct': String(!!o.correct) }, h('span', { class: 'bld-qletter' }, 'ABCD'[i]), ...o.smiles.map((s) => tileSvg(s, 132, 90)), h('span', { class: 'sr-only' }, o.smiles.map((s) => B.describe(s)).join(' and ')));
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (o.correct) {
          b.classList.add('is-good');
          grid.querySelectorAll('.bld-qopt').forEach((x) => { x.disabled = true; });
          fb.className = 'fb ok small rt-qfb'; fb.textContent = 'Right. ' + tAuto(o.why).replace(/^Yes\.\s*/, '');
          const f = filledSet(); f.add(key); st.filled[st.tab] = [...f]; persist();
          try { store.logWin(c.skill, c.card); } catch (e) { /* storage blocked */ }
          drawQbar(); drawTable();
          const more = h('button', { type: 'button', class: 'btn small', id: 'rt-qmore' }, 'See the mechanism and why');
          more.addEventListener('click', () => drawPanel());
          box.append(h('div', { class: 'rx-btns' }, more));
        } else {
          b.classList.add('is-bad'); b.disabled = true;
          fb.className = 'fb bad small rt-qfb'; fb.textContent = tAuto(o.why);
          try { store.logMistake({ skill: c.skill, stepId: 'table-' + st.tab + '-' + row.id + '-' + col.id, lessonId: 'tables', diagnosis: o.why, card: c.card }); } catch (e) { /* storage blocked: the slip is not kept */ }
        }
      });
      grid.append(b);
    });
    box.append(grid, fb, h('p', { class: 'muted small' }, t(q.source === 'drill' ? 'Options from the predict-the-product drill: each wrong one is a slip with its own reason.' : 'Options: what other reagents give on the same starting material.', 'Wrong ones: other slips, other reagents.')));
    return box;
  }
  scrim.addEventListener('click', closePanel);

  Promise.resolve(chemReady).then(() => {
    const ld = root.querySelector('.rt-loading'); if (ld) ld.remove();
    drawAll();
    setTimeout(() => { loadMorphs(); }, 1200);   // the morph data arrives in the background, so the first hover plays at once
    const off = onVoiceChange(() => { if (!root.isConnected) { off(); return; } drawTable(); if (!panel.hidden) drawPanel(); });
  }).catch(() => { root.innerHTML = '<p class="fb bad">The chemistry engine could not load. Reload the page to try again.</p>'; });
  return [lhead, root];
}
