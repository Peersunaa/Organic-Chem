// DOM pieces of the what-if row of the mechanism player (the data is in engine/whatif.js). No state of its own: the player owns it.
//   chipRow(info, current, { onPick, onBack })  "What if it were ...": one chip per alternative, plus "Back to the lesson's reaction" while an alternative is playing
//   comparePanel(info, option)                  the lesson's product and the alternative's product, drawn, each with the three facts of its hub card
import { svg as rdSvg } from '../chem.js';
import { autoStyle } from './mechanism-core.js';
import { HUB_BY_ID, SPACE_TEXT } from '../reaction-hub.js';
import { t, tAuto } from '../voice.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const btn = (cls, text) => { const b = el('button', cls); b.type = 'button'; b.textContent = text; return b; };

/** The three facts of a card as the hub draws them (same classes), in caveman words when that mode is on. */
export function factList(card) {
  const f = card.facts, cv = card.caveman && card.caveman.facts;
  const li = (k, v, n) => { const x = el('li', 'chip hub-chip'); x.append(el('span', 'hub-chip-k', k), el('span', 'hub-chip-v', v)); if (n) x.append(el('span', 'hub-chip-n', n)); return x; };
  const ul = el('ul', 'hub-facts');
  ul.setAttribute('aria-label', 'Three facts');
  ul.append(li('What adds', t(f.adds, cv && cv.adds)), li('Where it adds', t(f.where, cv && cv.where)), li('How, in space', SPACE_TEXT[f.space], f.spaceNote ? tAuto(f.spaceNote) : null));
  return ul;
}

export function chipRow(info, current, { onPick, onBack }) {
  const row = el('div', 'mp-wi-row');
  row.append(el('p', 'mp-wi-q', current ? 'Try another reagent on the same molecule:' : 'What if it were &hellip;'));
  const chips = el('div', 'mp-wi-chips');
  info.options.filter((o) => !current || o.id !== current.id).forEach((o) => {
    const b = btn('btn small ghost mp-wi-chip', o.label);
    b.dataset.alt = o.id;
    b.setAttribute('aria-label', `What if it were ${o.label}?`);
    b.addEventListener('click', () => onPick(o));
    chips.append(b);
  });
  if (current) { const b = btn('btn small mp-wi-back', 'Back to the lesson’s reaction'); b.addEventListener('click', onBack); chips.append(b); }
  row.append(chips);
  return row;
}

export function comparePanel(info, option) {
  const wrap = el('section', 'mp-wi-cmp');
  wrap.setAttribute('aria-label', 'The two products side by side');
  const col = (head, label, smiles, cardId) => {
    const c = el('figure', 'mp-wi-col');
    c.append(el('figcaption', 'mp-wi-head', `<b>${head}</b> ${label}`));
    const box = el('div', 'mol-svg mp-wi-mol');
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', `Product with ${label}`);
    box.innerHTML = rdSvg(smiles, { style: autoStyle(smiles), width: 190, height: 130, showCharge: true });
    c.append(box);
    const card = cardId && HUB_BY_ID[cardId];
    if (card) c.append(factList(card));
    else c.append(el('p', 'muted small', 'No reaction card for this reagent yet.'));
    return c;
  };
  const grid = el('div', 'mp-wi-cols');
  grid.append(col('Lesson:', info.origin.label, info.origin.product, info.origin.cardId), col('What if:', option.label, option.product, option.cardId));
  wrap.append(el('p', 'mp-wi-h', 'Same molecule, two reagents'), grid);
  return wrap;
}
