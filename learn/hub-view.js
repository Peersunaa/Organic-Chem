// Reaction hub screen (#reactions): one card per reagent from engine/reaction-hub.js, grouped by substrate, with filters.
// Each card has the same four parts in the same order: What it does, Worked example, Three facts, When the question looks like this.
import { h, equationRow } from './engine/steps.js';
import { HUB_CARDS, HUB_GROUPS, HUB_SPACE, HUB_ADDS, SPACE_TEXT } from './engine/reaction-hub.js';
import { t, tAuto, onVoiceChange } from './engine/voice.js';

export const NO_LESSON = 'Not in a lesson: this card is the short version';

/** "#lesson-13/s06" (the router opens the lesson at that step without marking earlier steps done). */
export const lessonHref = (ref) => `#lesson-${ref.id}/${ref.step}`;
const lessonText = (ref) => `Lesson ${Number(ref.id)}, step ${Number(ref.step.slice(1))}`;

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
    h('ol', { class: 'hub-steps' }, c.apply.steps.map((s, i) => h('li', {}, t(s, c.caveman && c.caveman.steps && c.caveman.steps[i])))));
  // phones: collapsed, so a card stays about one screen; wider screens: open
  try { if (window.innerWidth >= 700) details.open = true; } catch (e) { /* ignore */ }
  return h('div', { class: 'hub-apply' }, h('p', { class: 'hub-pattern' }, c.apply.pattern), details);
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
  const state = { group: 'all', space: 'all', adds: 'all' };
  const count = h('p', { class: 'muted small', 'aria-live': 'polite', id: 'hub-count' });
  const empty = h('p', { class: 'muted hub-empty', hidden: 'hidden' }, 'No card matches all three filters. Set one of them back to "Any".');
  const list = h('div', { class: 'hub-list' }, h('p', { class: 'muted' }, 'Loading chemistry engine…'));
  const cards = [];

  const apply = () => {
    let n = 0;
    cards.forEach(({ c, node }) => {
      const show = (state.group === 'all' || c.group === state.group)
        && (state.space === 'all' || c.facts.space === state.space)
        && (state.adds === 'all' || c.facts.addsKey.includes(state.adds));
      node.hidden = !show; if (show) n++;
    });
    list.querySelectorAll('.hub-subgroup').forEach((s) => { s.hidden = !s.querySelector('.hub-card:not([hidden])'); });
    list.querySelectorAll('.hub-group').forEach((s) => { s.hidden = !s.querySelector('.hub-card:not([hidden])'); });
    count.textContent = `Showing ${n} of ${HUB_CARDS.length} cards`;
    empty.hidden = n > 0;
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
  const filters = h('section', { class: 'panel hub-filters', 'aria-label': 'Filters' },
    filterRow('group', 'Substrate', HUB_GROUPS.map((g) => ({ id: g.id, label: g.label }))),
    filterRow('space', 'How it adds in space', HUB_SPACE.map((s) => ({ id: s.id, label: s.label }))),
    filterRow('adds', 'What adds', HUB_ADDS),
    count);

  root.append(filters, list, empty);

  Promise.resolve(ready).then(() => {
    list.innerHTML = '';
    HUB_GROUPS.forEach((g) => {
      const sec = h('section', { class: 'hub-group', 'aria-labelledby': 'hub-g-' + g.id },
        h('div', { class: 'hub-ghead' }, h('h2', { id: 'hub-g-' + g.id }, g.label), h('p', { class: 'muted small' }, g.sub)));
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
