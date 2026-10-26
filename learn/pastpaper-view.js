// Past papers, by topic (#pastpaper): the midterm-scope workbook questions from data/pastpaper.js, one panel per section.
// Each item: title, source, what it asks, "Steps to answer" (open on desktop, collapsed on phones, like a hub card), the trap, and link buttons.
import { h, molFigure, equationRow } from './engine/steps.js';
import { PASTPAPER } from './data/pastpaper.js';
import { HUB_BY_ID } from './engine/reaction-hub.js';

function itemNode(it) {
  const steps = h('details', { class: 'hub-steps-box pp-steps' }, h('summary', {}, 'Steps to answer'),
    h('ol', { class: 'hub-steps' }, it.steps.map((s) => h('li', {}, s))));
  // phones: collapsed, so an item stays short; wider screens: open (the same rule as a hub card)
  try { if (window.innerWidth >= 700) steps.open = true; } catch (e) { /* ignore */ }
  return h('article', { class: 'card pp-item', id: 'pp-' + it.id },
    h('div', { class: 'pp-head' }, h('h3', { class: 'pp-title' }, h('span', { class: 'pp-id' }, it.id), it.title), h('span', { class: 'chip pp-source' }, it.source)),
    h('p', { class: 'pp-ask' }, it.ask),
    h('div', { class: 'pp-show' }),   // filled by drawShow() once the chemistry engine is ready
    steps,
    it.trap ? h('p', { class: 'pp-trap small' }, h('b', {}, 'Trap: '), it.trap) : null,
    h('div', { class: 'hub-links pp-links' }, it.links.map((l) => h('a', { class: 'btn small' + (l.href.startsWith('#reactions') ? ' ghost' : ''), href: l.href }, l.label))));
}

/** The structure drawn above an item's steps: its own `show`, else the worked example of the first hub card it links to. Always labelled as an example, never as the exam's drawing. */
export function showFor(it) {
  if (it.show) return it.show;
  const l = (it.links || []).find((x) => x.href.startsWith('#reactions/'));
  const card = l && HUB_BY_ID[l.href.slice('#reactions/'.length)];
  if (!card || !card.example) return null;
  const ex = card.example;
  return { label: `A worked example of this reaction (from the card; not the exam's own drawing)`, equation: { reactants: ex.substrate.split('.'), products: ex.product.split('.'), cond: ex.reagent || card.reagent } };
}
function drawShow(node, it) {
  const sh = showFor(it), slot = node.querySelector('.pp-show');
  if (!sh || !slot) return;
  slot.append(h('p', { class: 'pp-show-cap muted small' }, sh.label));
  if (sh.equation) slot.append(equationRow({ ...sh.equation, style: 'auto' }));
  else slot.append(h('div', { class: 'pair figs' }, sh.structures.map((x) => molFigure(x.smiles, x.label || '', { style: 'skeletal' }))));
}

/** Build the past-paper screen body. `ready` (the RDKit promise) is optional: the drawings appear when it resolves. */
export function buildPastpaper(ready) {
  const root = h('div', { class: 'pp' });
  PASTPAPER.forEach((sec) => {
    root.append(h('section', { class: 'panel pp-section', 'aria-labelledby': 'pp-h-' + sec.id },
      h('div', { class: 'pp-shead' }, h('h2', { id: 'pp-h-' + sec.id }, h('span', { class: 'pp-id' }, sec.id), sec.title), h('p', { class: 'muted small' }, `${sec.blurb} (${sec.items.length} ${sec.items.length === 1 ? 'item' : 'items'})`)),
      h('div', { class: 'pp-list' }, sec.items.map(itemNode))));
  });
  Promise.resolve(ready).then(() => {
    root.querySelectorAll('.pp-item').forEach((node) => { const it = PASTPAPER.flatMap((x) => x.items).find((x) => 'pp-' + x.id === node.id); if (it) { try { drawShow(node, it); } catch (e) { /* a drawing that fails to build leaves the steps as they were */ } } });
  }).catch(() => {});
  return root;
}
