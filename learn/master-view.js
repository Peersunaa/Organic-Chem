// Question-type mastery course screens (#master and #master/<typeId>): the ladder of every kind of midterm question with a five-dot streak per type, and one type's page:
// how to recognise it, the procedure, what earns the marks, three worked examples (read-only, the engine's own seeded problems), practice to five first-try answers in a row,
// the book problems of that shape and links back to the lessons, cards and scenes. All logic and state live in engine/master.js; nothing here grades except renderProblems.
import { h, rich, molFigure, equationRow, setIupacMode, renderProblems, mountVisual } from './engine/steps.js';
import * as store from './engine/store.js';
import * as MS from './engine/master.js';
import { GROUPS, GROUP_BY_ID, TYPE_BY_ID, liveTypes } from './data/question-types.js';
import { HUB_BY_ID } from './engine/reaction-hub.js';
import { SCENE_BY_ID } from './scenes/scene-index.js';
import { pairFigure, projFigure } from './mock-view.js';

const N = MS.MASTERY_STREAK;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const sectionText = (t) => (Array.isArray(t.section) ? t.section.join(', ') : 'any section');

// ================================================================================================ small pieces
/** The five-dot streak strip: `streak` dots filled, all five in the "mastered" colour when mastered. */
function dots(s) {
  const el = h('span', { class: 'ms-dots', role: 'img' }, Array.from({ length: N }, () => h('i')));
  paintDots(el, s);
  return el;
}
function paintDots(el, s) {
  [...el.children].forEach((d, i) => d.classList.toggle('on', s.mastered || i < s.streak));
  el.classList.toggle('is-m', !!s.mastered);
  el.setAttribute('aria-label', s.mastered ? 'Mastered' : `${s.streak} of ${N} in a row`);
}
/** A thin progress bar (same look as the mock paper's section bars). */
function bar(done, total, label) {
  return h('span', { class: 'ms-bar', role: 'img', 'aria-label': label }, h('i', { style: `width:${total ? Math.round((done / total) * 100) : 0}%` }));
}
const overallText = (p) => `${p.mastered} of ${p.total} types mastered`;

// ================================================================================================ the course page
function coursePage() {
  const P = MS.progress();
  const live = liveTypes();
  const lhead = h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'Question-type mastery'),
    h('p', { class: 'lede' }, 'Every kind of question the midterm can ask, in exam-weight order. Learn to recognise it, follow the procedure, see what earns each mark, then practise until you get five in a row right first time.'),
    h('div', { class: 'ms-overall' }, h('p', { class: 'ms-overall-t', id: 'ms-overall' }, overallText(P)), bar(P.mastered, P.total, `${P.pct}% of the question types mastered`)));
  const groups = GROUPS.filter((g) => live.some((t) => t.group === g.id)).map((g) => {
    const rows = live.filter((t) => t.group === g.id).map((t) => {
      const s = MS.getState(t.id);
      return h('li', {}, h('a', { class: 'ms-type' + (s.mastered ? ' is-m' : ''), href: '#master/' + t.id, id: 'ms-type-' + t.id },
        h('span', { class: 'ms-t' }, h('b', {}, t.title), h('span', { class: 'ms-chips' }, h('span', { class: 'chip' }, sectionText(t)), h('span', { class: 'chip' }, `${t.weight} marks`))),
        h('span', { class: 'ms-st' }, dots(s), s.mastered ? h('span', { class: 'chip ok' }, 'Mastered') : null, s.best ? h('span', { class: 'ms-best muted small' }, `best run ${s.best}`) : null)));
    });
    const gp = P.groups[g.id];
    return h('section', { class: 'ms-group', 'aria-labelledby': 'ms-g-' + g.id },
      h('h2', { id: 'ms-g-' + g.id }, g.title, h('span', { class: 'ms-gcount muted small' }, `${gp.mastered} of ${gp.total}`)),
      h('p', { class: 'muted' }, g.blurb), h('ul', { class: 'ms-list' }, rows));
  });
  return [lhead, ...groups];
}

// ================================================================================================ a worked example (read-only)
function answerText(p) {
  if (p.skill === 'formal-charge' && typeof p.answer === 'number' && p.answer > 0) return '+' + p.answer;
  return String(p.answer).replace(/^-(?=\d)/, '−');
}
function exampleCard(p, k) {
  const card = h('article', { class: 'ms-ex' });
  card.append(h('p', { class: 'eyebrow' }, `Example ${k}`), p.promptHtml ? rich(p.promptHtml, 'h3', 'prompt') : h('h3', { class: 'prompt' }, p.prompt));
  if (p.extra && p.extra.type === 'proj') card.append(h('div', { class: 'rd-figs pj-figs' }, projFigure(p.extra.a, 'A'), h('span', { class: 'rd-vs' }, 'and'), projFigure(p.extra.b, 'B')));   // the paper's pair of drawings (engine/master.js readOnly)
  else if (p.extra && p.extra.type === 'pair') card.append(h('div', { class: 'rd-figs' }, pairFigure(p.extra.a, 'Molecule A', 0), h('span', { class: 'rd-vs' }, 'and'), pairFigure(p.extra.b, 'Molecule B', p.extra.rotateB)));
  else if (p.kind !== 'builder' && p.kind !== 'polarity' && p.kind !== 'arrows' && p.kind !== 'groupfind' && p.kind !== 'cip' && p.smiles) card.append(molFigure(p.smiles, '', { highlight: p.highlight }));
  if (p.equation) card.append(equationRow(p.equation));
  if (p.visual) mountVisual(card, p.visual);
  if (p.kind === 'choice') {
    const list = h('div', { class: 'opts' + (p.options.some((o) => o.smiles) ? ' mols' : ''), role: 'group', 'aria-label': 'The choices, with the right one marked' });
    p.options.forEach((o) => {
      const b = h('button', { type: 'button', class: 'opt' + (o.correct ? ' good' : ''), disabled: 'disabled' }, o.smiles ? molFigure(o.smiles, o.text || '', o.raw ? { raw: true, showCharge: true } : {}) : rich(o.text, 'span'));
      if (o.correct) b.append(h('span', { class: 'sr-only' }, ' (the right answer)'));
      list.append(b);
    });
    card.append(list);
  } else {
    const also = (p.accept || []).filter((a) => typeof a === 'string' && a !== String(p.answer)).slice(0, 3);
    card.append(h('p', { class: 'ms-answer' }, h('b', {}, 'Answer: '), answerText(p), also.length ? h('span', { class: 'muted small' }, ` (also accepted: ${also.join(', ')})`) : null));
  }
  card.append(h('div', { class: 'worked-box' }, h('b', {}, 'Worked answer '), p.deriveHtml ? rich(p.deriveHtml, 'span') : p.derive));
  return card;
}

// ================================================================================================ the practice panel
function practicePanel(type, chemP) {
  const s0 = MS.getState(type.id);
  const strip = dots(s0);
  const run = h('span', { class: 'ms-run', id: 'ms-run' });
  const mastered = h('span', { class: 'chip ok', id: 'ms-mastered', hidden: s0.mastered ? null : 'hidden' }, 'Mastered');
  const repaint = () => {
    const s = MS.getState(type.id);
    paintDots(strip, s);
    run.textContent = `${s.streak} in a row.`;
    mastered.hidden = !s.mastered;
    const top = document.getElementById('ms-mastered-top'); if (top) top.hidden = !s.mastered;
    return s;
  };
  const start = h('button', { type: 'button', class: 'btn primary', id: 'ms-start' }, 'Start practice');
  const banner = h('div', { class: 'ms-banner', id: 'ms-banner', 'aria-live': 'polite' });
  const host = h('div', { class: 'step' });
  const card = h('article', { class: 'card ms-card', hidden: 'hidden' }, host);
  const panel = h('section', { class: 'panel ms-practise', 'aria-labelledby': 'ms-pr-h' },
    h('h2', { id: 'ms-pr-h' }, 'Practise to mastery'),
    h('div', { class: 'ms-streak' }, strip, run, mastered),
    h('p', { class: 'muted' }, `Five first-try answers in a row, and the type is mastered; a miss resets the run.`),
    h('div', { class: 'rx-btns' }, start), banner, card);
  repaint();

  const ctx = {
    lessonId: 'master',
    mistake: (skill, stepId, diagnosis, cardId) => store.logSlip({ skill, stepId: 'master:' + type.id, lessonId: 'master', diagnosis, card: cardId }),
    win: (skill, cardId) => store.logWin(skill, cardId),
    done: () => {}   // endless: the learner leaves when they like
  };
  const cfg = {
    endless: true, skill: type.id,
    next: () => MS.practiceArgs(type),
    status: () => `Run: ${MS.getState(type.id).streak} of ${N}. Only a right first answer counts; a miss resets the run.`,
    onSettled: (counted) => {
      const before = MS.getState(type.id);
      const after = MS.recordResult(type.id, counted);
      repaint();
      if (!before.mastered && after.mastered) {
        const nxt = MS.nextType(type.id);
        const keep = h('button', { type: 'button', class: 'btn small ghost', id: 'ms-keep' }, 'Keep practising');
        keep.addEventListener('click', () => { banner.innerHTML = ''; });
        banner.innerHTML = '';
        banner.append(h('div', { class: 'fb ok' }, h('p', {}, h('b', {}, 'Mastered: five in a row.')), h('div', { class: 'ms-banner-btns' }, keep, nxt ? h('a', { class: 'btn small primary', href: '#master/' + nxt.id, id: 'ms-next' }, `Next type: ${nxt.title}`) : null)));
      }
    }
  };
  start.addEventListener('click', async () => {
    start.hidden = true;
    try { await chemP; } catch (e) { host.append(h('p', { class: 'fb bad' }, 'The chemistry engine could not load. Reload the page to try again.')); card.hidden = false; return; }
    card.hidden = false;
    renderProblems(cfg, ctx, host);
    setIupacMode(store.getIupac());
    card.scrollIntoView?.({ block: 'nearest' });
  });
  return panel;
}

// ================================================================================================ the book problems
function bookPanel(type) {
  const have = new Set(MS.getState(type.id).book);
  const count = h('span', { class: 'muted small ms-bookcount' });
  const paint = () => { count.textContent = `${MS.getState(type.id).book.length} of ${type.book.length} ticked`; };
  const list = h('ul', { class: 'ms-book' }, type.book.map((n) => {
    const box = h('input', { type: 'checkbox', id: 'ms-book-' + n });
    box.checked = have.has(String(n));
    box.addEventListener('change', () => { MS.toggleBook(type.id, n); paint(); });
    return h('li', {}, h('label', { class: 'ms-bk', for: 'ms-book-' + n }, box, h('span', {}, n)));
  }));
  paint();
  return h('section', { class: 'panel', 'aria-labelledby': 'ms-bk-h' }, h('h2', { id: 'ms-bk-h' }, 'Book problems (McMurry)'),
    h('p', { class: 'muted' }, 'Do these on paper; the practice above gives you look-alikes of the same shape.'), list, count);
}

// ================================================================================================ links and footer
function linksRow(type) {
  const L = [];
  type.lessons.forEach((l) => L.push(h('a', { class: 'btn small ghost', href: `#lesson-${l.id}/${l.step}` }, `Lesson ${Number(l.id)}, step ${Number(l.step.slice(1))}`)));
  type.cards.forEach((c) => { if (HUB_BY_ID[c]) L.push(h('a', { class: 'btn small ghost', href: '#reactions/' + c }, `Card: ${HUB_BY_ID[c].reagent}`)); });
  type.scenes.forEach((c) => { if (SCENE_BY_ID[c]) L.push(h('a', { class: 'btn small ghost', href: '#scene/' + c }, `Scene: ${SCENE_BY_ID[c].title}`)); });
  return L.length ? h('section', { class: 'panel', 'aria-labelledby': 'ms-ln-h' }, h('h2', { id: 'ms-ln-h' }, 'Learn it again'), h('div', { class: 'ms-links' }, L)) : null;
}

// ================================================================================================ one type's page
function typePage(type, chemP) {
  const g = GROUP_BY_ID[type.group];
  const lhead = h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#master' }, '← Mastery course'),
    h('p', { class: 'eyebrow' }, `${g.title} · Chapter ${type.chapter} · ${sectionText(type)}`),
    h('h1', { class: 'ltitle' }, type.title),
    h('div', { class: 'ms-top' }, h('span', { class: 'chip' }, `${type.weight} marks`), h('span', { class: 'chip ok', id: 'ms-mastered-top', hidden: MS.getState(type.id).mastered ? null : 'hidden' }, 'Mastered')));
  const list = (tag, items) => h(tag, { class: 'ms-ul' }, items.map((x) => h('li', {}, rich(x, 'span'))));
  const panel = (id, title, ...kids) => h('section', { class: 'panel', 'aria-labelledby': id }, h('h2', { id }, title), ...kids);
  const recognise = panel('ms-rec-h', 'Recognise it', rich(type.recognise, 'p'), list('ul', type.cues));
  const procedure = panel('ms-proc-h', 'Procedure', list('ol', type.procedure));
  const marks = panel('ms-marks-h', 'What earns the marks', list('ul', type.marks), type.traps && type.traps.length ? h('div', { class: 'ms-traps' }, h('h3', {}, 'Traps'), list('ul', type.traps)) : null);
  const exSlot = h('div', { class: 'ms-examples' }, h('p', { class: 'muted' }, 'Loading chemistry engine… the examples appear in a moment.'));
  const examples = panel('ms-ex-h', 'Worked examples', h('p', { class: 'muted' }, 'Three questions of this type, worked in full. Each one is generated by the same engine as the practice below.'), exSlot);
  chemP.then(() => {
    if (!exSlot.isConnected) return;
    exSlot.innerHTML = '';
    try {
      const ex = MS.exampleProblems(type);
      if (!ex.length) exSlot.append(h('p', { class: 'muted' }, 'No worked examples for this type yet; the practice below still works.'));
      ex.forEach((p, i) => exSlot.append(exampleCard(p, i + 1)));
    } catch (e) {
      exSlot.append(h('p', { class: 'fb bad' }, 'The examples could not be built. Reload the page to try again.'));
      if (typeof console !== 'undefined') console.error(e);
    }
    setIupacMode(store.getIupac());
  }).catch(() => { exSlot.innerHTML = '<p class="fb bad">The chemistry engine could not load. Reload the page to try again.</p>'; });
  const prev = MS.prevType(type.id), nxt = MS.nextType(type.id);
  const foot = h('div', { class: 'foot ms-foot' },
    prev ? h('a', { class: 'btn ghost', href: '#master/' + prev.id, id: 'ms-prev' }, `← Previous type`) : h('a', { class: 'btn ghost', href: '#master' }, '← All types'),
    nxt ? h('a', { class: 'btn ghost', href: '#master/' + nxt.id, id: 'ms-nexttype' }, `Next type →`) : h('a', { class: 'btn ghost', href: '#master' }, 'All types →'));
  return [lhead, recognise, procedure, marks, examples, practicePanel(type, chemP), bookPanel(type), linksRow(type), foot].filter(Boolean);
}

// ================================================================================================ entry point
/** Nodes for app.js to mount under the header: the course page, or one type's page when typeId is a live type (an unknown id shows the course page). */
export function masterPage(chemP, typeId) {
  const t = typeId ? TYPE_BY_ID[typeId] : null;
  return t && liveTypes().includes(t) ? typePage(t, chemP) : coursePage();
}
export { overallText };
