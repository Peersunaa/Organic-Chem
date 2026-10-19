// Reaction hub screen (#reactions): one card per reagent from engine/reaction-hub.js, grouped by substrate, with filters.
// Each card has the same four parts in the same order: What it does, Worked example, Three facts, When the question looks like this.
import { h, equationRow } from './engine/steps.js';
import { HUB_CARDS, HUB_GROUPS, HUB_SPACE, HUB_ADDS, SPACE_TEXT } from './engine/reaction-hub.js';
import { t, tAuto, onVoiceChange } from './engine/voice.js';
import { figureCard } from './figures/figure-card.js';

/** The crafted chapter figure shown (collapsed) at the top of a hub group: alkenes -> ch4, aromatics -> ch5 (ch3 and ch6 have no group here). */
export const GROUP_FIGURE = { alkene: 'ch4', arene: 'ch5' };

export const NO_LESSON = 'Not in a lesson: this card is the short version';

/** "#lesson-13/s06" (the router opens the lesson at that step without marking earlier steps done). */
export const lessonHref = (ref) => `#lesson-${ref.id}/${ref.step}`;
const lessonText = (ref) => `Lesson ${Number(ref.id)}, step ${Number(ref.step.slice(1))}`;

/** Letters and digits only, lower case, subscripts and superscripts folded ("Br₂, FeBr₃" -> "br2febr3"), so "br2", "FeBr3" and "h3o+" all find their card. */
export const fold = (text) => String(text == null ? '' : text).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '');
/** Everything a learner might type to find a card: the reagent (both examples), the substrate group, what it does and the "when the question looks like this" line. */
export function hubText(c) {
  const g = HUB_GROUPS.find((x) => x.id === c.group);
  return [c.reagent, c.example && c.example.reagent, c.example2 && c.example2.reagent, c.subgroup, g && g.label, g && g.sub, c.what, c.apply && c.apply.pattern].filter(Boolean).join(' ');
}
/** Every word of the query (split on spaces and commas) must appear in the card's text; an empty query matches every card. */
export function matchesQuery(c, query) {
  const words = String(query || '').split(/[\s,;]+/).map(fold).filter(Boolean);
  if (!words.length) return true;
  const hay = fold(hubText(c));
  return words.every((w) => hay.includes(w));
}

/** A step may point at another card with [[card-id|words]]: it becomes a link that opens that card (#reactions/<card-id>). */
export function linkify(text) {
  const out = [];
  let last = 0;
  String(text).replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, (m, id, words, at) => {
    if (at > last) out.push(text.slice(last, at));
    out.push(h('a', { class: 'hub-xlink', href: '#reactions/' + id }, words));
    last = at + m.length;
    return m;
  });
  if (last < String(text).length) out.push(String(text).slice(last));
  return out;
}

/** The Diels-Alder walk-through in three small pictures: the six carbons round a hexagon, the two new sigma bonds, the moved double bonds. */
function dielsAlderFrames() {
  const NS = 'http://www.w3.org/2000/svg';
  const P = (cx, k) => { const a = (-90 + 60 * k) * Math.PI / 180; return [cx + 30 * Math.cos(a), 52 + 30 * Math.sin(a)]; };
  const names = ['C1', 'C2', 'C3', 'C4', 'b', 'a'];
  // frame: which of the six ring bonds (k -> k+1) are double (d) or new sigma bonds (n), and the substituents
  const frames = [
    { cap: '1. Place the carbons', dbl: [0, 2, 4], neu: [4 + 1, 3], dashed: true },
    { cap: '2. Close the ring', dbl: [0, 2, 4], neu: [3, 5], dashed: false },
    { cap: '3. Move the double bonds', dbl: [1], neu: [3, 5], dashed: false }
  ];
  let body = '';
  frames.forEach((f, i) => {
    const cx = 56 + i * 112;
    for (let k = 0; k < 6; k++) {
      const [x1, y1] = P(cx, k), [x2, y2] = P(cx, (k + 1) % 6);
      const isNew = f.neu.includes(k) && (k === 3 || k === 5), isDbl = f.dbl.includes(k);
      let attr = isNew ? (f.dashed ? 'stroke="var(--accent)" stroke-width="2.5" stroke-dasharray="4 3"' : 'stroke="var(--accent)" stroke-width="3"') : 'stroke="currentColor" stroke-width="2"';
      body += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ${attr}/>`;
      if (isDbl && !isNew) { const dx = (y2 - y1) / 30 * 3.2, dy = -(x2 - x1) / 30 * 3.2; body += `<line x1="${(x1 + dx + (x2 - x1) * 0.14).toFixed(1)}" y1="${(y1 + dy + (y2 - y1) * 0.14).toFixed(1)}" x2="${(x2 + dx - (x2 - x1) * 0.14).toFixed(1)}" y2="${(y2 + dy - (y2 - y1) * 0.14).toFixed(1)}" stroke="currentColor" stroke-width="2"/>`; }
    }
    names.forEach((n, k) => {
      const [x, y] = P(cx, k);
      const ox = (x - cx) * 0.62, oy = (y - 52) * 0.62;
      body += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="currentColor"/><text x="${(x + ox).toFixed(1)}" y="${(y + oy + 5).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">${n}</text>`;
    });
    body += `<text x="${cx}" y="112" text-anchor="middle" font-size="14" fill="var(--muted)">${f.cap}</text>`;
  });
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 340 122');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Three hexagons labelled C1, C2, C3, C4, b, a round the ring: the six carbons placed, the two new sigma bonds C4 to b and a to C1 drawn, then the double bond moved to C2 and C3.');
  svg.setAttribute('class', 'hub-da-svg');
  svg.innerHTML = body;
  const fig = h('figure', { class: 'hub-da' }, svg);
  return fig;
}

/** One worked example. A substrate with a '.' (Diels–Alder: diene . dienophile) is drawn as two reactants joined by '+'. */
function exampleBlock(c, ex = c.example, second = false) {
  const eq = equationRow({ reactants: ex.substrate.split('.'), products: ex.product.split('.'), style: 'auto' });
  return h('div', { class: second ? 'hub-example hub-example2' : 'hub-example' },
    second ? h('p', { class: 'hub-rx small' }, h('b', {}, 'Second example')) : null, eq,
    h('p', { class: 'hub-rx small' }, h('span', { class: 'muted' }, 'Reagent: '), h('b', {}, ex.reagent || c.reagent)),
    ex.note ? h('p', { class: 'muted small hub-note' }, (second ? tAuto(ex.note) : t(ex.note, c.caveman && c.caveman.note))) : null);
}

function factsBlock(c) {
  const f = c.facts, cv = c.caveman && c.caveman.facts;
  const chip = (label, value, extra) => h('li', { class: 'chip hub-chip' }, h('span', { class: 'hub-chip-k' }, label), h('span', { class: 'hub-chip-v' }, value), extra ? h('span', { class: 'hub-chip-n' }, extra) : null);
  return h('ul', { class: 'hub-facts', 'aria-label': 'Three facts' },
    chip('What adds', t(f.adds, cv && cv.adds)), chip('Where it adds', t(f.where, cv && cv.where)), chip('How, in space', SPACE_TEXT[f.space], f.spaceNote ? tAuto(f.spaceNote) : null));
}

function applyBlock(c) {
  const details = h('details', { class: 'hub-steps-box' }, h('summary', {}, 'Steps to answer it'),
    h('ol', { class: 'hub-steps' }, c.apply.steps.map((s, i) => h('li', {}, linkify(t(s, c.caveman && c.caveman.steps && c.caveman.steps[i]))))));
  // phones: collapsed, so a card stays about one screen; wider screens: open
  try { if (window.innerWidth >= 700) details.open = true; } catch (e) { /* ignore */ }
  // a card with a `draw` list (Diels-Alder) adds a numbered walk-through inside the exam box; the caveman list is used when the card has one
  let draw = null;
  if (Array.isArray(c.draw) && c.draw.length) {
    const cv = c.caveman && c.caveman.draw;
    draw = h('div', { class: 'hub-draw' }, h('p', { class: 'hub-draw-h' }, 'Draw it, step by step'), c.id === 'diels-alder' ? dielsAlderFrames() : null,
      h('ol', { class: 'hub-steps hub-draw-list' }, c.draw.map((s, i) => h('li', {}, linkify(t(s, cv && cv[i]))))));
  }
  return h('div', { class: 'hub-apply' }, h('p', { class: 'hub-pattern' }, c.apply.pattern), details, draw);
}

function cardNode(c) {
  // a card with no lesson says so: it is the short version
  const links = [c.lesson
    ? h('a', { class: 'btn small', href: lessonHref(c.lesson) }, lessonText(c.lesson))
    : h('span', { class: 'muted small hub-nolesson' }, NO_LESSON)];
  if (c.lesson && c.mech) links.push(h('a', { class: 'btn small ghost', href: lessonHref({ id: c.lesson.id, step: c.mech }) }, 'See the mechanism'));
  const grp = HUB_GROUPS.find((g) => g.id === c.group);
  return h('article', { class: 'card hub-card', id: 'rx-' + c.id, 'data-group': c.group, 'data-space': c.facts.space, 'data-adds': c.facts.addsKey.join(' ') },
    h('h3', { class: 'hub-title' }, c.reagent),
    h('div', { class: 'hub-part' }, h('p', { class: 'hub-label' }, 'What it does'), h('p', {}, t(c.what, c.caveman && c.caveman.what))),
    h('div', { class: 'hub-part' }, h('p', { class: 'hub-label' }, 'Worked example'), exampleBlock(c), c.example2 ? exampleBlock(c, c.example2, true) : null),
    h('div', { class: 'hub-part' }, h('p', { class: 'hub-label' }, 'Three facts'), factsBlock(c)),
    h('div', { class: 'hub-part' }, h('p', { class: 'hub-label' }, 'When the question looks like this'), applyBlock(c)),
    h('div', { class: 'hub-links' }, ...links, h('span', { class: 'chip' }, grp ? grp.label : c.group)));
}

/** Build the hub. Returns a node; the cards are drawn as soon as `ready` (the RDKit promise) resolves.
 *  `anchor` (a card id, from #reactions/<card-id>): once the cards are drawn, scroll to that card. */
export function buildHub(ready, anchor) {
  const root = h('div', { class: 'hub' });
  const state = { group: 'all', space: 'all', adds: 'all', q: '' };
  const count = h('p', { class: 'muted small', 'aria-live': 'polite', id: 'hub-count' });
  const empty = h('p', { class: 'muted hub-empty', hidden: 'hidden' }, 'No card matches. Clear the search box or set a filter back to "Any".');
  const list = h('div', { class: 'hub-list' }, h('p', { class: 'muted' }, 'Loading chemistry engine…'));
  const cards = [];

  const apply = () => {
    let n = 0;
    cards.forEach(({ c, node }) => {
      const show = (state.group === 'all' || c.group === state.group)
        && (state.space === 'all' || c.facts.space === state.space)
        && (state.adds === 'all' || c.facts.addsKey.includes(state.adds))
        && matchesQuery(c, state.q);
      node.hidden = !show; if (show) n++;
    });
    list.querySelectorAll('.hub-subgroup').forEach((s) => { s.hidden = !s.querySelector('.hub-card:not([hidden])'); });
    list.querySelectorAll('.hub-group').forEach((s) => { s.hidden = !s.querySelector('.hub-card:not([hidden])'); });
    count.textContent = `Showing ${n} of ${HUB_CARDS.length} cards`;
    empty.hidden = n > 0;
    // the jump bar: each group's chip shows how many of its cards are on screen and is dimmed when none is
    jump.querySelectorAll('[data-jump]').forEach((b) => {
      const k = cards.filter(({ c, node }) => c.group === b.dataset.jump && !node.hidden).length;
      b.querySelector('.hub-jump-n').textContent = String(k);
      b.setAttribute('aria-disabled', String(k === 0));
    });
  };

  const filterRow = (key, label, options) => {
    const row = h('div', { class: 'hub-fbtns', role: 'group', 'aria-label': label });
    const all = [{ id: 'all', label: 'Any' }, ...options];
    all.forEach((o) => {
      const b = h('button', { type: 'button', class: 'btn small', 'aria-pressed': String(state[key] === o.id), 'data-filter': key, 'data-value': o.id }, o.label);
      b.addEventListener('click', () => {
        state[key] = o.id;
        row.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        apply();
      });
      row.append(b);
    });
    return h('div', { class: 'hub-fgroup' }, h('h3', {}, label), row);
  };
  // sticky bar: a text box that filters the cards by reagent or substrate words, and one chip per group that jumps to it
  const search = h('input', { type: 'search', id: 'hub-q', class: 'hub-q', placeholder: 'Search: PCC, Br2, benzene, HBr ...', autocomplete: 'off', spellcheck: 'false', 'aria-controls': 'hub-count' });
  search.addEventListener('input', () => { state.q = search.value; apply(); });
  const jump = h('nav', { class: 'hub-jump', 'aria-label': 'Search the cards and jump to a group' },
    h('label', { class: 'sr-only', for: 'hub-q' }, 'Search the reaction cards by reagent or substrate'), search,
    h('div', { class: 'hub-jumps' }, HUB_GROUPS.map((g) => {
      const b = h('button', { type: 'button', class: 'btn small hub-jumpbtn', 'data-jump': g.id }, g.label, ' ', h('span', { class: 'hub-jump-n' }, ''));
      b.addEventListener('click', () => { const sec = list.querySelector('#hub-g-' + g.id); if (sec && !sec.closest('[hidden]')) sec.scrollIntoView?.({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
      return b;
    })));
  const filterBox = h('details', { class: 'hub-filterbox' }, h('summary', {}, 'Filter by substrate, space or what adds'),
    filterRow('group', 'Substrate', HUB_GROUPS.map((g) => ({ id: g.id, label: g.label }))),
    filterRow('space', 'How it adds in space', HUB_SPACE.map((s) => ({ id: s.id, label: s.label }))),
    filterRow('adds', 'What adds', HUB_ADDS));
  try { if (window.innerWidth >= 700) filterBox.open = true; } catch (e) { /* ignore */ }
  const filters = h('section', { class: 'panel hub-filters', 'aria-label': 'Filters' }, filterBox, count);

  root.append(jump, filters, list, empty);

  Promise.resolve(ready).then(() => {
    list.innerHTML = '';
    HUB_GROUPS.forEach((g) => {
      const sec = h('section', { class: 'hub-group', 'aria-labelledby': 'hub-g-' + g.id },
        h('div', { class: 'hub-ghead' }, h('h2', { id: 'hub-g-' + g.id }, g.label), h('p', { class: 'muted small' }, g.sub)));
      const figId = GROUP_FIGURE[g.id];
      const fig = figId ? figureCard(figId, { key: 'hub:' + figId, open: false }) : null;
      if (fig) sec.querySelector('.hub-ghead').append(fig);
      let subName = null, sub = null;   // cards with the same `subgroup` sit together under a sub-header
      HUB_CARDS.filter((c) => c.group === g.id).forEach((c) => {
        const node = cardNode(c);
        cards.push({ c, node });
        if (!c.subgroup) { sec.append(node); return; }
        if (subName !== c.subgroup) { subName = c.subgroup; sub = h('div', { class: 'hub-subgroup' }, h('h3', { class: 'hub-subhead' }, c.subgroup)); sec.append(sub); }
        sub.append(node);
      });
      list.append(sec);
    });
    apply();
    // the header's Caveman switch: swap the card texts in place (filters, scroll position and open step lists stay as they are)
    const off = onVoiceChange(() => {
      if (!root.isConnected) { off(); return; }
      cards.forEach((entry) => {
        const old = entry.node, box = old.querySelector('.hub-steps-box');
        const fresh = cardNode(entry.c);
        fresh.hidden = old.hidden;
        if (old.classList.contains('hub-target')) fresh.classList.add('hub-target');
        const nb = fresh.querySelector('.hub-steps-box');
        if (box && nb) nb.open = box.open;
        old.replaceWith(fresh);
        entry.node = fresh;
      });
    });
    if (anchor) {
      const target = list.querySelector('#rx-' + anchor);
      if (target) {
        // an instant jump (a smooth scroll over 38 cards can end in the wrong place while the molecule drawings settle)
        target.querySelector('.hub-steps-box')?.setAttribute('open', '');
        target.classList.add('hub-target');
        const jump = () => target.scrollIntoView?.({ block: 'start', behavior: 'auto' });
        jump(); requestAnimationFrame(jump);
      }
    }
  }).catch(() => { list.innerHTML = '<p class="fb bad">The chemistry engine could not load. Reload the page to try again.</p>'; });
  return root;
}
