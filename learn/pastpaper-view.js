// Past papers, by topic (#pastpaper): the midterm-scope workbook questions from data/pastpaper.js, one panel per section.
// Each item: title, source, what it asks, "Steps to answer" (open on desktop, collapsed on phones, like a hub card), the trap, and link buttons.
import { h } from './engine/steps.js';
import { PASTPAPER } from './data/pastpaper.js';

function itemNode(it) {
  const steps = h('details', { class: 'hub-steps-box pp-steps' }, h('summary', {}, 'Steps to answer'),
    h('ol', { class: 'hub-steps' }, it.steps.map((s) => h('li', {}, s))));
  // phones: collapsed, so an item stays short; wider screens: open (the same rule as a hub card)
  try { if (window.innerWidth >= 700) steps.open = true; } catch (e) { /* ignore */ }
  return h('article', { class: 'card pp-item', id: 'pp-' + it.id },
    h('div', { class: 'pp-head' }, h('h3', { class: 'pp-title' }, h('span', { class: 'pp-id' }, it.id), it.title), h('span', { class: 'chip pp-source' }, it.source)),
    h('p', { class: 'pp-ask' }, it.ask),
    steps,
    it.trap ? h('p', { class: 'pp-trap small' }, h('b', {}, 'Trap: '), it.trap) : null,
    h('div', { class: 'hub-links pp-links' }, it.links.map((l) => h('a', { class: 'btn small' + (l.href.startsWith('#reactions') ? ' ghost' : ''), href: l.href }, l.label))));
}

/** Build the past-paper screen body (no chemistry engine needed: nothing is drawn). */
export function buildPastpaper() {
  const root = h('div', { class: 'pp' });
  PASTPAPER.forEach((sec) => {
    root.append(h('section', { class: 'panel pp-section', 'aria-labelledby': 'pp-h-' + sec.id },
      h('div', { class: 'pp-shead' }, h('h2', { id: 'pp-h-' + sec.id }, h('span', { class: 'pp-id' }, sec.id), sec.title), h('p', { class: 'muted small' }, `${sec.blurb} (${sec.items.length} ${sec.items.length === 1 ? 'item' : 'items'})`)),
      h('div', { class: 'pp-list' }, sec.items.map(itemNode))));
  });
  return root;
}
