// Mock midterm screens (#mock): the start screen (blueprint, rules, history), the sitting (clock, sections, answers kept in the store), and the marked script (#mock/script).
// The questions come from engine/mock.js; every question is drawn with the same figures, option cards and name box as the practice pages, but with NO right/wrong
// feedback until the paper is submitted. Nothing here grades: engine/mock.js marks.
import { h, rich, molFigure, equationRow, setIupacMode } from './engine/steps.js';
import { svg as rdSvg } from './engine/chem.js';
import { drawingMarkup, drawingCaption } from './engine/widgets/projection-pair.js';
import { skillLabel } from './engine/skills.js';
import { SECTIONS, PRESETS, LIMITS } from './data/mock-blueprint.js';
import * as store from './engine/store.js';
import * as M from './engine/mock.js';
import { typesForSkill } from './data/question-types.js';

const fmtClock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60; return (hh ? hh + ':' + String(mm).padStart(2, '0') : String(mm)) + ':' + String(ss).padStart(2, '0'); };
const fmtDate = (t) => { try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' + new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); } catch (e) { return String(t); } };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const marksText = (n) => `${n} ${n === 1 ? 'mark' : 'marks'}`;
const secCode = (id) => h('span', { class: 'pp-id' }, id);

// ================================================================================================ one question: the figures and the prompt
export function pairFigure(smiles, label, rotate) {
  const f = h('figure', { class: 'rd-fig' });
  f.append(h('div', { class: 'rd-svg', html: rdSvg(smiles, { width: 230, height: 170, style: 'skeletal', rotate: rotate || 0 }) }), h('figcaption', {}, label));
  return f;
}
export function projFigure(dr, tag) {
  const f = h('figure', { class: 'rd-fig pj-fig' });
  f.append(h('div', { class: 'pj-box', html: drawingMarkup(dr) }), h('figcaption', { html: drawingCaption(dr, tag) }));
  return f;
}
/** The prompt and drawings of a question (shared by the sitting and the marked script). */
function questionBody(q) {
  const v = q.v, box = h('div', { class: 'mk-qbody' });
  box.append(v.promptHtml ? rich(v.promptHtml, 'p', 'prompt mk-prompt') : h('p', { class: 'prompt mk-prompt' }, v.prompt));
  if (v.extra && v.extra.type === 'proj') box.append(h('div', { class: 'rd-figs pj-figs' }, projFigure(v.extra.a, 'A'), h('span', { class: 'rd-vs' }, 'and'), projFigure(v.extra.b, 'B')));
  else if (v.extra && v.extra.type === 'pair') box.append(h('div', { class: 'rd-figs' }, pairFigure(v.extra.a, 'Molecule A', 0), h('span', { class: 'rd-vs' }, 'and'), pairFigure(v.extra.b, 'Molecule B', v.extra.rotateB)));
  else if (v.smiles) box.append(molFigure(v.smiles, '', { highlight: v.highlight || [] }));
  if (v.equation) box.append(equationRow(v.equation));
  return box;
}
const optionContent = (o) => (o.smiles ? molFigure(o.smiles, o.text || '', o.raw ? { raw: true, showCharge: true } : {}) : rich(o.text, 'span'));

// ================================================================================================ the start screen
function stepper({ label, min, max, step = 1, get, set, fmt = String }) {
  const out = h('output', { class: 'mk-val', 'aria-live': 'polite' });
  const minus = h('button', { type: 'button', class: 'btn small ghost mk-pm', 'aria-label': `Fewer: ${label}` }, '−');
  const plus = h('button', { type: 'button', class: 'btn small ghost mk-pm', 'aria-label': `More: ${label}` }, '+');
  const paint = () => { out.textContent = fmt(get()); minus.disabled = get() <= min; plus.disabled = get() >= max; };
  minus.addEventListener('click', () => { set(Math.max(min, get() - step)); });
  plus.addEventListener('click', () => { set(Math.min(max, get() + step)); });
  return { node: h('div', { class: 'mk-step', role: 'group', 'aria-label': label }, minus, out, plus), paint };
}

function startScreen(env) {
  const saved = store.getMock();
  let bp = M.normalizeBp(saved.bp || M.defaultBp());
  const persist = () => store.setMock({ bp });

  // ---- presets
  const presetBtns = PRESETS.map((P) => {
    const b = h('button', { type: 'button', class: 'btn small ghost mk-preset', 'data-preset': P.id, 'aria-pressed': 'false' }, P.label);
    b.addEventListener('click', () => { bp = M.presetBp(P.id, { weighted: bp.weighted }); persist(); refresh(); });
    return b;
  });

  // ---- one row per section
  const rows = SECTIONS.map((s) => {
    const row = () => bp.sections.find((x) => x.id === s.id);
    const cnt = stepper({ label: `${s.id} number of questions`, min: LIMITS.count[0], max: LIMITS.count[1], get: () => row().count, set: (v) => { row().count = v; persist(); refresh(); } });
    const mk = stepper({ label: `${s.id} marks per question`, min: LIMITS.marks[0], max: LIMITS.marks[1], get: () => row().marks, set: (v) => { row().marks = v; persist(); refresh(); } });
    const tot = h('span', { class: 'mk-rowtot' });
    const li = h('li', { class: 'mk-row', 'data-sec': s.id },
      h('div', { class: 'mk-rowhead' }, secCode(s.id), h('b', {}, s.title), tot),
      h('div', { class: 'mk-rowctl' },
        h('div', { class: 'mk-ctl' }, h('span', { class: 'mk-ctl-l small muted' }, 'Questions'), cnt.node),
        h('div', { class: 'mk-ctl' }, h('span', { class: 'mk-ctl-l small muted' }, 'Marks each'), mk.node)));
    return { li, paint: () => { cnt.paint(); mk.paint(); const r = row(); tot.textContent = r.count ? `${marksText(r.count * r.marks)}` : 'left out'; li.classList.toggle('is-off', !r.count); } };
  });

  // ---- time and weighting
  const time = stepper({ label: 'time limit in minutes', min: LIMITS.minutes[0], max: LIMITS.minutes[1], step: LIMITS.minuteStep, get: () => bp.minutes, set: (v) => { bp.minutes = v; persist(); refresh(); }, fmt: (v) => `${v} min` });
  const wSw = h('button', { type: 'button', class: 'mk-toggle', role: 'switch', 'aria-checked': 'false', id: 'mock-weight' });
  wSw.innerHTML = '<span class="sw-track"><span class="sw-knob"></span></span><span class="sw-label">Weight toward my weak spots</span>';
  wSw.addEventListener('click', () => { bp.weighted = !bp.weighted; persist(); refresh(); });
  const wNote = h('p', { class: 'small muted mk-wnote', id: 'mock-wnote' });
  const totals = h('p', { class: 'mk-totals', id: 'mock-totals', 'aria-live': 'polite' });
  const startBtn = h('button', { type: 'button', class: 'btn primary big', id: 'mock-start' }, 'Start the paper');
  const startNote = h('p', { class: 'small muted mk-startnote' });

  const refresh = () => {
    rows.forEach((r) => r.paint());
    time.paint();
    const t = M.bpTotals(bp);
    totals.innerHTML = `<b>${plural(t.questions, 'question')}</b> · <b>${marksText(t.marks)}</b> · <b>${t.minutes} min</b>`;
    const pid = M.matchPreset(bp);
    presetBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === pid)));
    wSw.setAttribute('aria-checked', String(bp.weighted));
    const scores = store.skillScores();
    const has = Object.keys(scores).length > 0;
    if (!bp.weighted) wNote.textContent = has ? 'Off: the paper has exactly the counts above. Switch it on to move questions toward the skills you have missed lately (each section stays within 50% of its count, and the total stays the same).' : 'Off. You have no recent mistakes in the weak-spot log yet, so weighting would change nothing.';
    else if (!has) wNote.textContent = 'On, but there are no recent mistakes in the weak-spot log yet, so the counts stay as set. Slips on the lessons and practice pages (and on earlier mock papers) will start to count.';
    else {
      const pv = M.weightingPreview(bp, scores);
      wNote.textContent = pv.length ? `On: ${pv.map((x) => `${x.id} ${x.from} → ${x.to}`).join(', ')} (total ${t.questions}, each section within 50% of its count).` : 'On, but your weak spots are in sections that cannot move (each section stays within 50% of its count), so the counts stay as set.';
    }
    startBtn.disabled = t.questions < 1;
    startNote.textContent = t.questions < 1 ? 'Give at least one section a question.' : '';
  };

  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true; startBtn.textContent = 'Building your paper…';
    try { await env.chemP; } catch (e) { startBtn.textContent = 'The chemistry engine could not load'; return; }
    await new Promise((r) => setTimeout(r, 40));   // let the button repaint before the paper is built
    persist();
    try { M.startSitting(bp, { scores: bp.weighted ? store.skillScores() : null }); } catch (e) { startBtn.disabled = false; startBtn.textContent = 'Start the paper'; startNote.textContent = 'The paper could not be built. Try again.'; return; }
    env.go('main');
  });

  // ---- history table
  const hist = saved.history.slice().reverse();
  const histPanel = h('section', { class: 'panel', 'aria-labelledby': 'mk-hist-h' }, h('h2', { id: 'mk-hist-h' }, 'Attempts'));
  if (!hist.length) histPanel.append(h('p', { class: 'muted' }, 'Your marked papers appear here: date, score and marks by section.'));
  else {
    histPanel.append(h('div', { class: 'mk-tablewrap' }, h('table', { class: 'mk-hist', id: 'mock-history' },
      h('thead', {}, h('tr', {}, ['Date', 'Score', 'By section'].map((x) => h('th', { scope: 'col' }, x)))),
      h('tbody', {}, hist.map((e) => h('tr', {},
        h('td', {}, h('span', { class: 'mk-d' }, fmtDate(e.t)), h('span', { class: 'small muted mk-d2' }, `${e.n} q · ${Math.round(e.used / 60)} of ${e.minutes} min${e.weighted ? ' · weighted' : ''}${e.timedOut ? ' · timed out' : ''}`)),
        h('td', {}, h('b', {}, `${e.got}/${e.max}`), h('span', { class: 'small muted mk-d2' }, `${pct(e.got, e.max)}%`)),
        h('td', { class: 'mk-secs' }, e.sections.map((s) => h('span', { class: 'mk-sec' }, h('i', {}, s.id), ` ${s.got}/${s.max}`)))))))));
  }
  if (saved.last) histPanel.append(h('p', { class: 'small' }, h('a', { class: 'btn small ghost', href: '#mock/script', id: 'mock-last' }, 'Review my last marked script')));

  const rules = h('ul', { class: 'mk-rules' },
    ['The clock starts when you press Start and keeps running if you reload or leave the page. At zero the paper is submitted for you.',
      'No right or wrong feedback until you submit. Answers are saved as you go, so a reload picks up where you were.',
      'A blank answer scores 0, and so does a wrong one: there is no negative marking. Each question is marked all or nothing.',
      'Every paper is built fresh from generated molecules, in the exam’s own mix of sections.'].map((t) => h('li', {}, t)));

  const root = h('div', { class: 'mk' },
    h('section', { class: 'panel mk-blueprint', 'aria-labelledby': 'mk-bp-h' },
      h('h2', { id: 'mk-bp-h' }, 'The paper'),
      h('p', { class: 'muted small' }, 'The default is the full midterm mix. Pick a preset or change any number: questions per section, marks each, the time limit.'),
      h('div', { class: 'mk-presets', role: 'group', 'aria-label': 'Presets' }, presetBtns),
      h('ul', { class: 'mk-rows', id: 'mock-blueprint' }, rows.map((r) => r.li)),
      h('div', { class: 'mk-foot' }, h('div', { class: 'mk-ctl' }, h('span', { class: 'mk-ctl-l small muted' }, 'Time limit'), time.node), totals),
      h('div', { class: 'mk-weight' }, wSw, wNote)),
    h('section', { class: 'panel', 'aria-labelledby': 'mk-rules-h' }, h('h2', { id: 'mk-rules-h' }, 'Rules'), rules, h('div', { class: 'mk-startrow' }, startBtn, startNote)),
    histPanel);
  refresh();
  return root;
}

// ================================================================================================ the sitting
function sitting(env, sess) {
  const paper = M.buildPaper(sess.plan, sess.seed);
  const Q = paper.questions, secs = paper.sections;
  let cur = Math.max(0, Math.min(Number(sess.cur) || 0, secs.length - 1));   // current section index (kept in the store, so a reload returns to it)
  const goto = (i) => { cur = i; sess.cur = i; store.setMock({ current: sess }); paintSection(); window.scrollTo(0, 0); };
  let submitted = false;
  const answered = () => Q.filter((q) => sess.answers[q.id] !== undefined).length;

  // ---- sticky header: clock, answered, submit; the section strip
  const clock = h('span', { class: 'mk-clock', role: 'timer', 'aria-label': 'Time left' });
  const count = h('span', { class: 'mk-count', 'aria-live': 'polite' });
  const submitBtn = h('button', { type: 'button', class: 'btn primary small', id: 'mock-submit' }, 'Submit');
  const strip = h('div', { class: 'mk-strip', role: 'group', 'aria-label': 'Sections' });
  const chips = secs.map((s, i) => {
    const b = h('button', { type: 'button', class: 'mk-chip', 'data-sec': s.id, 'aria-pressed': 'false', 'aria-label': `Section ${s.id}: ${s.title}` });
    b.addEventListener('click', () => goto(i));
    strip.append(b); return b;
  });
  const bar = h('div', { class: 'mk-bar' }, h('div', { class: 'mk-bar-row' }, clock, count, submitBtn), strip);
  const body = h('div', { class: 'mk-body', id: 'mock-body' });
  const confirmSlot = h('div', { class: 'mk-confirm-slot' });

  const paintBar = () => {
    count.textContent = `${answered()} of ${Q.length} answered`;
    secs.forEach((s, i) => {
      const n = Q.slice(s.first, s.last + 1).filter((q) => sess.answers[q.id] !== undefined).length;
      chips[i].innerHTML = '';
      chips[i].append(h('b', {}, s.id), h('span', { class: 'mk-chip-n' }, `${n}/${s.count}`));
      chips[i].setAttribute('aria-pressed', String(i === cur));
      chips[i].classList.toggle('done', n === s.count);
    });
  };
  const save = (q, val) => { M.saveAnswer(sess, q.id, val); paintBar(); };

  const questionCard = (q) => {
    const card = h('article', { class: 'card mk-q', id: 'q-' + q.id.replace('.', '-'), 'aria-label': `Question ${q.no}` });
    card.append(h('div', { class: 'mk-qhead' }, h('span', { class: 'mk-no' }, q.no), h('span', { class: 'chip' }, marksText(q.marks))));
    card.append(questionBody(q));
    const v = q.v;
    if (v.mode === 'choice') {
      const list = h('div', { class: 'opts' + (v.options.some((o) => o.smiles) ? ' mols' : ''), role: 'group', 'aria-label': `Choices for question ${q.no}` });
      const btns = v.options.map((o, i) => {
        const b = h('button', { type: 'button', class: 'opt mk-opt', 'aria-pressed': String(sess.answers[q.id] === i) }, optionContent(o));
        b.addEventListener('click', () => {
          const was = sess.answers[q.id] === i;
          save(q, was ? null : i);
          btns.forEach((x, j) => x.setAttribute('aria-pressed', String(!was && j === i)));
        });
        list.append(b); return b;
      });
      card.append(list);
    } else {
      const inp = h('input', { type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', class: 'ans mk-ans', placeholder: 'Type your answer', 'aria-label': `Your answer to question ${q.no}`, value: sess.answers[q.id] != null ? String(sess.answers[q.id]) : '' });
      inp.addEventListener('input', () => save(q, inp.value));
      card.append(h('div', { class: 'ans-row' }, inp));
    }
    return card;
  };

  const paintSection = () => {
    const s = secs[cur];
    body.innerHTML = '';
    const nxt = h('button', { type: 'button', class: 'btn primary', id: 'mock-next' }, cur < secs.length - 1 ? `Next: ${secs[cur + 1].id} ${secs[cur + 1].title}` : 'Review and submit');
    const prv = h('button', { type: 'button', class: 'btn ghost', id: 'mock-prev' }, 'Previous section');
    prv.disabled = cur === 0;
    prv.addEventListener('click', () => goto(cur - 1));
    nxt.addEventListener('click', () => { if (cur < secs.length - 1) goto(cur + 1); else askSubmit(); });
    body.append(h('section', { class: 'mk-sechead', 'aria-labelledby': 'mk-sh' },
      h('p', { class: 'eyebrow' }, `Question ${s.no} · ${marksText(s.total)}`),
      h('h2', { id: 'mk-sh' }, secCode(s.id), s.title),
      rich(s.instruction, 'p', 'mk-instr'),
      s.note ? h('p', { class: 'small muted' }, s.note) : null,
      h('p', { class: 'small muted' }, `${plural(s.count, 'part')}, ${marksText(s.marks)} each.`)));
    Q.slice(s.first, s.last + 1).forEach((q) => body.append(questionCard(q)));
    body.append(h('div', { class: 'foot mk-foot2' }, prv, nxt));
    setIupacMode(store.getIupac());
    paintBar();
  };

  // ---- submit with confirmation, and at time out
  const finish = (timedOut) => {
    if (submitted) return; submitted = true;
    clearInterval(tick);
    M.submitSitting(sess, paper, { timedOut });
    env.go('script');
  };
  const askSubmit = () => {
    if (submitted || confirmSlot.firstChild) return;
    const left = Q.length - answered();
    const yes = h('button', { type: 'button', class: 'btn primary', id: 'mock-confirm' }, 'Submit paper');
    const no = h('button', { type: 'button', class: 'btn ghost', id: 'mock-keep' }, 'Keep working');
    const box = h('div', { class: 'mk-confirm card', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'mk-cf-h', 'aria-describedby': 'mk-cf-d' },
      h('h2', { id: 'mk-cf-h' }, 'Submit the paper?'),
      h('p', { id: 'mk-cf-d' }, `You have answered ${answered()} of ${Q.length} questions${left ? `; ${plural(left, 'question')} will score 0` : ''}. You cannot change anything after you submit.`),
      h('div', { class: 'row' }, yes, no));
    const close = () => { confirmSlot.innerHTML = ''; submitBtn.focus(); };
    yes.addEventListener('click', () => finish(false));
    no.addEventListener('click', close);
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    confirmSlot.append(box); yes.focus();
  };
  submitBtn.addEventListener('click', askSubmit);

  // ---- the clock (runs from sess.startedAt, so a reload keeps it honest)
  const paintClock = () => {
    const left = M.remainingMs(sess);
    clock.textContent = fmtClock(left);
    clock.classList.toggle('low', left <= 5 * 60000);
    if (left <= 0) finish(true);
  };
  const tick = setInterval(() => { if (!bar.isConnected) { clearInterval(tick); return; } paintClock(); }, 1000);

  const abandon = h('button', { type: 'button', class: 'btn small ghost', id: 'mock-abandon' }, 'Abandon paper');
  abandon.addEventListener('click', () => {
    if (confirmSlot.firstChild) return;
    const yes = h('button', { type: 'button', class: 'btn primary', id: 'mock-abandon-yes' }, 'Abandon, score nothing');
    const no = h('button', { type: 'button', class: 'btn ghost' }, 'Keep working');
    const box = h('div', { class: 'mk-confirm card', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': 'Abandon the paper?' },
      h('h2', {}, 'Abandon the paper?'), h('p', {}, 'Nothing is marked and nothing is added to your attempts.'), h('div', { class: 'row' }, yes, no));
    const close = () => { confirmSlot.innerHTML = ''; abandon.focus(); };
    yes.addEventListener('click', () => { clearInterval(tick); submitted = true; M.abandonSitting(); env.go('main'); });
    no.addEventListener('click', close);
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    confirmSlot.append(box); no.focus();
  });

  const root = h('div', { class: 'mk mk-sit' }, bar, confirmSlot, body, h('p', { class: 'small muted mk-abandon' }, abandon));
  paintClock(); paintSection();
  return root;
}

// ================================================================================================ the marked script
const stateChip = (it) => (it.ok ? h('span', { class: 'chip ok' }, `${it.got}/${it.marks}`) : h('span', { class: 'chip mk-bad' }, it.answered ? `0/${it.marks}` : `Not answered · 0/${it.marks}`));

function yourAnswer(q, it) {
  const v = q.v;
  if (!it.answered) return h('p', { class: 'mk-ans-none' }, 'No answer.');
  if (v.mode === 'choice') return h('div', { class: 'mk-opt-show' }, optionContent(v.options[Number(it.value)]));
  return h('p', { class: 'mk-typed' }, String(it.value));
}
function correctAnswer(q) {
  const v = q.v;
  if (v.mode === 'choice') return h('div', { class: 'mk-opt-show' }, optionContent(v.options.find((o) => o.correct)));
  const a = String(v.input.answer);
  return h('p', { class: 'mk-typed' }, a);
}
function scriptCard(q, it) {
  const v = q.v, card = h('article', { class: 'card mk-q mk-marked ' + (it.ok ? 'is-ok' : 'is-bad'), id: 'q-' + q.id.replace('.', '-'), 'data-ok': String(it.ok) });
  card.append(h('div', { class: 'mk-qhead' }, h('span', { class: 'mk-no' }, q.no), h('span', { class: 'small muted' }, `${skillLabel(q.skill)} · ${marksText(q.marks)}`), stateChip(it)));
  card.append(questionBody(q));
  const grid = h('div', { class: 'mk-compare' },
    h('div', { class: 'mk-yours ' + (it.ok ? 'ok' : 'bad') }, h('p', { class: 'eyebrow' }, 'Your answer'), yourAnswer(q, it)),
    it.ok ? null : h('div', { class: 'mk-right ok' }, h('p', { class: 'eyebrow' }, 'Correct answer'), correctAnswer(q)));
  card.append(grid);
  if (!it.ok) {
    const L = M.linksFor(q);
    if (it.diagnosis) card.append(h('div', { class: 'fb bad' }, h('p', { class: 'fb-lead' }, 'What you missed'), rich(it.diagnosis, 'p')));
    else card.append(h('div', { class: 'fb bad' }, h('p', { class: 'fb-lead' }, 'Not answered'), h('p', {}, 'This one scored 0. Here is the rule it tests.')));
    if (L.rule) card.append(h('details', { class: 'fb-more' }, h('summary', {}, 'The rule'), h('p', {}, L.rule)));
    const work = v.deriveHtml || v.derive || v.worked;
    if (work) card.append(h('details', { class: 'fb-more' }, h('summary', {}, 'Worked answer'), v.deriveHtml ? rich(v.deriveHtml, 'p') : h('p', {}, v.derive || v.worked)));
    const mt = typesForSkill(q.skill, v.card)[0];   // the question type of the mastery course (#master) that practises this kind of question
    card.append(h('p', { class: 'fb-links' },
      L.lesson ? h('a', { class: 'btn small ghost', href: L.lesson.href }, L.lesson.label) : null,
      mt ? h('a', { class: 'btn small ghost', href: '#master/' + mt.id }, 'Master this type') : null,
      L.card ? h('a', { class: 'btn small ghost', href: L.card.href }, L.card.label) : null,
      h('a', { class: 'btn small ghost', href: L.practise.href }, L.practise.label)));
  }
  return card;
}

function scriptScreen(env, last) {
  const paper = M.buildPaper(last.plan, last.seed);
  const res = M.markPaper(paper, last.answers);
  const missed = res.items.filter((x) => !x.ok).length;
  const scores = store.skillScores();
  const hasWeak = Object.keys(scores).length > 0;

  const wBtn = h('button', { type: 'button', class: 'btn primary', id: 'mock-retake-weighted' }, 'Retake weighted to my weak spots');
  const sBtn = h('button', { type: 'button', class: 'btn ghost', id: 'mock-retake' }, 'New paper, same blueprint');
  const launch = async (weighted, btn) => {
    btn.disabled = true; const t = btn.textContent; btn.textContent = 'Building your paper…';
    try { await env.chemP; } catch (e) { btn.textContent = 'The chemistry engine could not load'; return; }
    await new Promise((r) => setTimeout(r, 40));
    const bp = M.bpFromPlan(last.plan, weighted);
    store.setMock({ bp });
    try { M.startSitting(bp, { scores: weighted ? store.skillScores() : null }); } catch (e) { btn.disabled = false; btn.textContent = t; return; }
    env.navigate('#mock');
  };
  wBtn.addEventListener('click', () => launch(true, wBtn));
  sBtn.addEventListener('click', () => launch(false, sBtn));

  const summary = h('section', { class: 'panel mk-summary', 'aria-labelledby': 'mk-sum-h' },
    h('h2', { id: 'mk-sum-h' }, 'Your mark'),
    h('p', { class: 'mk-score', id: 'mock-score' }, h('b', {}, `${res.got} / ${res.max}`), h('span', { class: 'mk-pct' }, `${pct(res.got, res.max)}%`)),
    h('p', { class: 'muted small' }, `${res.correct} of ${res.n} questions right${last.timedOut ? ' · the time ran out and the paper was submitted for you' : ''} · ${Math.round((last.finishedAt - last.startedAt) / 60000)} of ${last.plan.minutes} min${last.plan.weighted ? ' · weighted toward weak spots' : ''}.`),
    h('ul', { class: 'mk-secrows', id: 'mock-sections' }, res.sections.map((s) => h('li', { class: 'mk-secrow' },
      h('span', { class: 'mk-sr-name' }, secCode(s.id), s.title),
      h('span', { class: 'mk-sr-bar', role: 'img', 'aria-label': `${s.got} of ${s.max} marks` }, h('i', { style: `width:${pct(s.got, s.max)}%` })),
      h('b', { class: 'mk-sr-n' }, `${s.got}/${s.max}`)))),
    h('div', { class: 'mk-actions' }, wBtn, sBtn, h('a', { class: 'btn ghost', href: '#mock', id: 'mock-newsetup' }, 'Change the blueprint')),
    h('p', { class: 'small muted' }, hasWeak ? 'Every question you missed is now in your weak-spot log, so a weighted retake puts more of its questions on those skills.' : 'No recent mistakes are logged, so a weighted retake would have the same counts.'));

  const onlyMissed = h('button', { type: 'button', class: 'btn small ghost', id: 'mock-only-missed', 'aria-pressed': 'false' }, `Show only the ${missed} I missed`);
  const list = h('div', { class: 'mk-script', id: 'mock-script' });
  paper.sections.forEach((s) => {
    const sec = h('section', { class: 'mk-ssec', 'data-sec': s.id, 'aria-labelledby': 'mk-s-' + s.id },
      h('h2', { id: 'mk-s-' + s.id }, secCode(s.id), `${s.no}. ${s.title}`, h('span', { class: 'chip' }, `${res.sections.find((x) => x.id === s.id).got}/${s.total}`)));
    paper.questions.slice(s.first, s.last + 1).forEach((q, i) => sec.append(scriptCard(q, res.items[s.first + i])));
    list.append(sec);
  });
  onlyMissed.addEventListener('click', () => {
    const on = onlyMissed.getAttribute('aria-pressed') !== 'true';
    onlyMissed.setAttribute('aria-pressed', String(on));
    list.classList.toggle('only-missed', on);
    onlyMissed.textContent = on ? 'Show every question' : `Show only the ${missed} I missed`;
  });
  if (!missed) onlyMissed.hidden = true;
  return h('div', { class: 'mk mk-scr' }, summary, h('div', { class: 'mk-filter' }, onlyMissed), list);
}

// ================================================================================================ entry point
/**
 * which: 'main' (the sitting if one is open, else the start screen) or 'script' (the last marked paper).
 * env: { mount, header, chemP, setDrawStyle, go(which), navigate(hash) }.
 */
export function mockView(which, env) {
  const e = { ...env };
  e.go = (w) => { if (w === 'script') { if (location.hash === '#mock/script') env.rerun('script'); else location.hash = '#mock/script'; } else env.rerun('main'); };
  e.navigate = (hash) => { if (location.hash === hash) env.rerun('main'); else location.hash = hash; };
  env.setDrawStyle('skeletal');
  const crumb = h('a', { class: 'back-home', href: '#home' }, '← Home');
  const slot = h('div', { class: 'mk-slot' }, h('p', { class: 'muted' }, 'Loading chemistry engine… the paper builds in a moment.'));
  const lede = (t) => h('p', { class: 'lede' }, t);
  const sit = which === 'main' ? M.currentSitting() : null;
  const last = which === 'script' ? M.lastResult() : null;
  let head;
  if (which === 'script' && last) head = h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#mock' }, '← Mock midterm'), h('h1', { class: 'ltitle' }, 'Marked script'), lede('Every question with your answer, the right one, the fact you missed and where to learn it.'));
  else if (sit) head = h('div', { class: 'lhead mk-lhead' }, h('div', { class: 'row mk-crumbs' }, crumb, h('span', { class: 'chip' }, 'Paper in progress')));
  else head = h('div', { class: 'lhead' }, crumb, h('h1', { class: 'ltitle' }, 'Mock midterm'),
    lede('A timed paper in the midterm’s own mix of sections, built fresh from generated molecules. You answer first and are marked at the end: no feedback until you submit.'),
    h('div', { class: 'rx-btns' }, h('a', { class: 'btn ghost', href: '#pastpaper', id: 'mock-pastpaper' }, 'Past papers, by topic'), h('a', { class: 'btn ghost', href: '#reactions', id: 'mock-reactions' }, 'Reactions')));
  env.mount(env.header(), head, slot);
  env.chemP.then(() => {
    if (!slot.isConnected) return;
    slot.innerHTML = '';
    try {
      if (which === 'script') {
        if (!last) { slot.append(h('div', { class: 'panel' }, h('p', {}, 'There is no marked paper yet.'), h('a', { class: 'btn primary', href: '#mock' }, 'Open the mock midterm'))); return; }
        slot.append(scriptScreen(e, last));
      } else if (sit) {
        if (M.remainingMs(sit) <= 0) {   // the clock ran out while the page was closed: mark it as it stands
          const paper = M.buildPaper(sit.plan, sit.seed);
          M.submitSitting(sit, paper, { timedOut: true });
          e.go('script'); return;
        }
        slot.append(sitting(e, sit));
      } else slot.append(startScreen(e));
    } catch (err) {
      slot.append(h('div', { class: 'fb bad' }, h('p', {}, 'The paper could not be built. Reload the page to try again.')));
      if (typeof console !== 'undefined') console.error(err);
    }
    setIupacMode(store.getIupac());
  }).catch(() => { slot.innerHTML = '<p class="fb bad">The chemistry engine could not load. Reload the page to try again.</p>'; });
}
