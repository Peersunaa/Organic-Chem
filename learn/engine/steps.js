// Step renderers. Each renderer fills `host` and reports through ctx.
import { svg as rdSvg, analyze } from './chem.js';
import { gradeFormula, formulaOf } from './skeletal.js';
import { WIDGETS } from './widgets/index.js';
import { skillRule } from './skills.js';
import { generate } from './generators.js';
import { normName } from './naming.js';
import { matchNameForms } from './generators-naming-levels.js';
import { t, tAuto } from './voice.js';
import { HUB_BY_ID } from './reaction-hub.js';
import { svgWithLonePairs } from './lp-draw.js';
import { firstTry, firstTryTally } from './first-try.js';
import { describeMol, describeAll } from './mol-name.js';

// ---- caveman voice for lesson text. A lesson step may carry `caveman: { prompt, problem, html, reveal, rule, worked, trap, hints: [..], options: [{ why }, ..], moves: [{ ask, then, options: [{ why }, ..] }, ..] }`
//      (terse copies of the step's own fields, arrays in the same order as the lesson data). Each helper gives the caveman copy when the switch is on AND the step has one, else the normal text,
//      so lessons without a caveman object keep working. Answers (option text, answer, accept, smiles) are never swapped.
/** step[key] in the current voice (key: prompt, problem, html, reveal, rule, worked, trap). */
export function cvSay(step, key) { return t(step[key], step.caveman && step.caveman[key]); }
/** The i-th hint. */
export function sayHint(step, i) { const hs = (step.hints || []); return t(hs[i], step.caveman && step.caveman.hints && step.caveman.hints[i]); }
/** The `why` of option object `o` of the step (found by identity, so a shuffled display order still reads the right line). */
export function sayWhy(step, o) { const i = (step.options || []).indexOf(o); return t(o.why, step.caveman && step.caveman.options && step.caveman.options[i] && step.caveman.options[i].why); }
/** Move k of a worked step: field 'ask' or 'then'. */
export function sayMove(step, k, field) { const mv = (step.moves || [])[k] || {}; return t(mv[field], step.caveman && step.caveman.moves && step.caveman.moves[k] && step.caveman.moves[k][field]); }
/** The `why` of option object `o` inside move k of a worked step. */
export function sayMoveWhy(step, k, o) {
  const i = ((step.moves || [])[k] || { options: [] }).options.indexOf(o), c = step.caveman && step.caveman.moves && step.caveman.moves[k];
  return t(o.why, c && c.options && c.options[i] && c.options[i].why);
}

/** An unclosed <mol ...> (or <molpair ...>) swallows the text after it when parsed as HTML; close any that are left open. Pure. */
export function closeMolTags(html) {
  return String(html).replace(/<(mol|molpair)(\s[^>]*?)?\/?>(?!\s*<\/(?:mol|molpair)>)/g, (m, tag, attrs) => `<${tag}${attrs || ''}></${tag}>`);
}

// ---- option order: shuffled when a choice/predict step is RENDERED (the lesson data keeps its order, so tests and recaps stay stable)
function hash32(str) { let hh = 2166136261; for (let i = 0; i < str.length; i++) { hh ^= str.charCodeAt(i); hh = Math.imul(hh, 16777619); } return hh >>> 0; }
function mulberry(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Seeded Fisher-Yates over a COPY: the same seed always gives the same order; the option objects themselves are kept (correctness is read from the object, never from a position). */
export function shuffleOptions(options, seed) {
  const out = options.slice(); const rnd = mulberry(hash32(String(seed)));
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
/** Ladders keep their order: a step can say `ordered: true`, and options labelled "Option A..D" (text refers to them) or pure number lists are never shuffled. */
const plain = (t) => String(t || '').replace(/<[^>]+>/g, '').trim();
export function shufflable(step) {
  const o = step.options || [];
  if (step.ordered === true || step.shuffle === false || o.length < 2) return false;
  if (o.some((x) => /^Option [A-H]$/.test(x.label || ''))) return false;
  if (o.every((x) => x.text != null && /^[+\-−–]?\d[\d.,]*\s*(°|%|pm|kJ\/mol)?$/.test(plain(x.text)))) return false;
  return true;
}
let SALT = null;
/** One random number per browser session, so a reload keeps the same order but a new visit changes it. */
export function sessionSalt() {
  if (SALT !== null) return SALT;
  try { const k = 'orgo.shuffle'; let v = sessionStorage.getItem(k); if (!v) { v = String(Math.floor(Math.random() * 1e9)); sessionStorage.setItem(k, v); } SALT = v; } catch (e) { SALT = String(Math.floor(Math.random() * 1e9)); }
  return SALT;
}
export function orderedOptions(step, lessonId, attempt) {
  if (!shufflable(step)) return step.options.slice();
  return shuffleOptions(step.options, `${lessonId}|${step.id}|${attempt != null ? attempt : sessionSalt()}`);
}
/** The options of move `mi` of a worked step, in the same seeded shuffle as a choice step (a move's options never carry "Option A" labels, and `ordered: true` on the step keeps the order). Objects are kept: correctness is read from the object. */
export function orderedMoveOptions(step, mi, lessonId, attempt) {
  const mv = step.moves[mi];
  if (!shufflable({ options: mv.options, ordered: step.ordered, shuffle: step.shuffle })) return mv.options.slice();
  return shuffleOptions(mv.options, `${lessonId}|${step.id}|m${mi}|${attempt != null ? attempt : sessionSalt()}`);
}

// ---- accessible names for image options (Finding 12): the generated IUPAC name when the naming engine can name the molecule, else the formula plus what tells it apart (engine/mol-name.js).
/** SMILES drawn by an option: its own `smiles`, or every <mol smiles="..."> in its text (joined into one dot-separated string), or ''. */
export function optionSmiles(o) {
  if (o.smiles) return o.smiles;
  const found = [...String(o.text || '').matchAll(/<mol\b[^>]*\bsmiles="([^"]+)"/g)].map((m) => m[1]);
  return found.join('.');
}
/** The accessible names of a list of options, one per option ('' for an option that is words only); two identical names are told apart. */
export function optionNames(options) {
  const smi = options.map(optionSmiles);
  const idx = smi.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
  const names = describeAll(idx.map((i) => smi[i]));
  const out = options.map(() => '');
  idx.forEach((i, k) => { out[i] = names[k]; });
  return out;
}
/** Put `name` on an option button as its aria-label and as visually hidden text (`lead`: a visible label such as "Option A" is kept in front of it). */
export function nameOptionButton(btn, name, lead) {
  if (!name) return;
  btn.setAttribute('aria-label', (lead ? lead + ': ' : '') + name);
  btn.append(h('span', { class: 'sr-only' }, name));
}

export function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in props || {}) {
    if (k === 'class') e.className = props[k];
    else if (k === 'html') e.innerHTML = closeMolTags(props[k]);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), props[k]);
    else if (props[k] !== false && props[k] != null) e.setAttribute(k, props[k]);
  }
  for (const c of kids.flat()) if (c != null) e.append(c);
  return e;
}

/** Same molecule in both styles, side by side (full drawing on the left, skeletal on the right). */
export function molPair(smiles, label, opts = {}) {
  const wrap = h('div', { class: 'pair' });
  wrap.append(molFigure(smiles, 'Full drawing', { ...opts, style: 'full' }), h('span', { class: 'pair-arrow', 'aria-hidden': 'true' }, '↔'), molFigure(smiles, 'Skeletal', { ...opts, style: 'skeletal' }));
  if (label) wrap.setAttribute('aria-label', label);
  return wrap;
}

export function molFigure(smiles, label, opts = {}) {
  const fig = h('figure', { class: 'mol' + (opts.inline ? ' mol-inline' : '') });
  // opts.lp: draw the lone pairs as dots (a question about electron pairs); opts.alt: the accessible name when the figure has no visible caption
  let name = opts.alt || label;
  if (!name) { try { name = `Structure, formula ${formulaOf(smiles)}`; } catch (e) { name = 'Structure'; } }
  fig.append(h('div', { class: 'mol-svg', html: opts.lp ? svgWithLonePairs(smiles, opts) : rdSvg(smiles, opts), role: 'img', 'aria-label': name }));
  if (label) fig.append(h('figcaption', {}, label));
  return fig;
}

/**
 * A reaction equation drawn as structures: eq = {reactants:[smiles | {smiles,label}], products:[...], cond?: 'acid catalyst', style?: 'auto'|'full'|'skeletal'}.
 * 'auto' (default) draws small species (3 heavy atoms or fewer) with every H and larger ones skeletal, so H transfers stay visible.
 */
export function equationRow(eq) {
  const row = h('div', { class: 'eqn', role: 'img', 'aria-label': 'Reaction equation' });
  const fig = (x) => {
    const o = typeof x === 'string' ? { smiles: x } : x;
    const style = eq.style && eq.style !== 'auto' ? eq.style : (analyze(o.smiles).heavy.length <= 3 ? 'full' : 'skeletal');
    return molFigure(o.smiles, o.label || '', { style, width: 170, height: 120, showCharge: true });
  };
  const side = (list) => list.forEach((x, i) => { if (i) row.append(h('span', { class: 'eqn-op', 'aria-hidden': 'true' }, '+')); row.append(fig(x)); });
  side(eq.reactants);
  row.append(h('span', { class: 'eqn-arrow', 'aria-hidden': 'true' }, '→', eq.cond ? h('small', {}, eq.cond) : null));
  if (eq.products.length) side(eq.products); else row.append(h('span', { class: 'eqn-op' }, '?'));
  return row;
}

let iupacMode = 'new';
export function setIupacMode(m) { iupacMode = m; document.querySelectorAll('[data-name-new]').forEach(nameFill); }
function nameFill(el) { el.textContent = iupacMode === 'old' ? el.dataset.nameOld : el.dataset.nameNew; }
export function nameSpan(n) { const s = h('span', { class: 'iupac', 'data-name-new': n.new, 'data-name-old': n.old }); nameFill(s); return s; }

/** Turn <mol> and <name> tags inside trusted lesson HTML into rendered chemistry. */
export function enhance(root) {
  root.querySelectorAll('mol').forEach((m) => {
    const draw = m.getAttribute('draw');
    // a molecule written INSIDE a sentence ("Benzene, C6H6 <mol>, is drawn as ...") is a small inline picture with no caption of its own: the sentence already names it
    const par = m.parentNode;
    const inline = !!par && [...par.childNodes].some((n) => n !== m && ((n.nodeType === 3 && n.textContent.trim()) || (n.nodeType === 1 && /^(B|I|EM|STRONG|SPAN|SUB|SUP|A|CODE|NAME)$/i.test(n.tagName))));
    if (inline && m.getAttribute('label') && !m.getAttribute('alt')) m.setAttribute('alt', m.getAttribute('label'));
    if (inline) { m.removeAttribute('label'); m.setAttribute('inline', ''); }
    m.replaceWith(molFigure(m.getAttribute('smiles'), m.getAttribute('label') || '', { ...(inline ? { inline: true, width: 120, height: 84 } : {}), ...(draw ? { style: draw } : {}), ...(m.getAttribute('alt') ? { alt: m.getAttribute('alt') } : {}), ...(m.hasAttribute('lp') ? { lp: true } : {}), ...(m.hasAttribute('raw') ? { raw: true } : {}), ...(m.getAttribute('rotate') ? { rotate: Number(m.getAttribute('rotate')) } : {}) }));
  });
  root.querySelectorAll('molpair').forEach((m) => {
    const hl = (m.getAttribute('hl') || '').split(',').filter(Boolean).map(Number);
    m.replaceWith(molPair(m.getAttribute('smiles'), m.getAttribute('label') || '', { highlight: hl }));
  });
  root.querySelectorAll('name').forEach((n) => n.replaceWith(nameSpan({ new: n.getAttribute('new'), old: n.getAttribute('old') })));
  return root;
}
export function rich(html, tag = 'div', cls = '') { return enhance(h(tag, { class: cls, html: closeMolTags(html) })); }

function grader(step, ctx, host) {
  let wrong = 0;
  const ft = firstTry();                       // a step counts as right only when the FIRST answer was right; later tries reveal and log the slip but score 0
  const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
  const hints = h('div', { class: 'hints' });
  host.append(fb, hints);
  const say = (kind, html) => { fb.className = 'fb ' + kind; fb.innerHTML = ''; fb.append(rich(html, 'p')); };
  return {
    get wrongCount() { return wrong; },
    get slipped() { return ft.slipped; },
    // `shown`: the text to display when it differs from the diagnosis that is logged (the caveman copy of an option's why)
    // `code`: the widget's kind of slip (arrow-draw: 'dest', 'source', 'extra', 'missing' ...). A step may key Hint 1 to it with
    //   hintsFor: { code: [normal, caveman] }, so a learner whose START was right is not told where to start (novice re-test 2026-10-20, N2).
    wrong(diagnosis, shown, code) {
      wrong++; ft.wrong();
      ctx.mistake(step.skill, step.id, diagnosis);
      say('bad', shown != null ? shown : diagnosis);
      hints.innerHTML = '';
      const hs = step.hints || [];
      const keyed = code && step.hintsFor && step.hintsFor[code];
      if (wrong >= 1 && keyed) hints.append(h('p', { class: 'hint' }, h('b', {}, 'Hint 1 '), tAuto(keyed[0], keyed[1])));
      else if (wrong >= 1 && hs[0]) hints.append(h('p', { class: 'hint' }, h('b', {}, 'Hint 1 '), sayHint(step, 0)));
      if (wrong >= 2 && hs[1]) hints.append(h('p', { class: 'hint' }, h('b', {}, 'Hint 2 '), sayHint(step, 1)));
      if (wrong >= 3 && step.worked) {
        hints.append(h('div', { class: 'worked-box' }, h('b', {}, 'Worked answer '), rich(cvSay(step, 'worked'), 'span')));
        ctx.done();
      }
      return wrong;
    },
    right(msg, opts) { ft.right(); say('ok', (msg || 'Correct.') + (opts && opts.note && ft.slipped ? ' <span class="muted">Not first try: it is logged as a slip and does not count as a first-try answer.</span>' : '')); ctx.done(); },
    // a widget made partial progress (e.g. 1 of 2 predictions right): drop stale wrong-answer feedback
    clear(o) { fb.className = 'fb'; fb.innerHTML = ''; if (o && o.task) hints.innerHTML = ''; }
  };
}

export function parseNum(s) {
  const t = String(s).trim().replace(/[−–‒]/g, '-').replace(/\s+/g, '');
  return /^[+-]?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}
const norm = (s) => String(s).trim().replace(/[−–‒]/g, '-').replace(/\s+/g, '').toLowerCase();

/** Pure grading of a typed answer; used by the input step, mastery and tests. */
export function checkInput(step, raw) {
  if (String(raw).trim() === '') return { ok: false, diagnosis: 'Type your answer first.', empty: true };
  if (step.formula) {
    const r = gradeFormula(step.answer, raw);
    if (r.ok) return { ok: true };
    const d = (step.diagnose || []).find((x) => gradeFormula(x.match, raw).ok);
    return { ok: false, malformed: r.malformed, diagnosis: d ? d.why : r.diagnosis };
  }
  if (step.name) {
    // IUPAC names: case, spaces, hyphens and brackets are ignored; any accepted style counts
    const got = normName(raw);
    // the same molecule's name in every style (traditional, current, 1-methylethyl, propan-2-yl ...), each ordered by its own alphabet: no accept list needed
    let forms = null;
    if (step.smiles && step.noForms !== true) { try { forms = matchNameForms(step.smiles, raw, step.answer); } catch (e) { forms = null; } }
    if ([step.answer].concat(step.accept || []).some((a) => normName(a) === got) || (forms && forms.ok)) return forms && forms.note ? { ok: true, note: forms.note } : { ok: true };
    const d = (step.diagnose || []).find((x) => normName(x.match) === got);
    const dyn = !d && step.diagnoseFn ? step.diagnoseFn(raw) : null;
    return { ok: false, diagnosis: d ? d.why : dyn || step.fallback || skillRule(step.skill) || 'Not quite. Check the rules and try again.' };
  }
  const n = parseNum(raw);
  const accept = [String(step.answer)].concat((step.accept || []).map(String)).map(norm);
  if (accept.includes(norm(raw)) || (n !== null && typeof step.answer === 'number' && n === step.answer)) return { ok: true };
  // Lesson 15: a numeric answer computed from measured data may carry a tolerance (e.g. specific rotation +/- 0.1)
  if (n !== null && typeof step.answer === 'number' && step.tolerance != null && Math.abs(n - step.answer) <= step.tolerance + 1e-9) return { ok: true };
  if (n === null && typeof step.answer === 'number') return { ok: false, diagnosis: 'Enter a number, for example 4, 0 or −1.', malformed: true };
  const d = (step.diagnose || []).find((x) => (typeof x.match === 'number' ? n === x.match : norm(x.match) === norm(raw)));
  return { ok: false, diagnosis: d ? d.why : step.fallback || skillRule(step.skill) || 'Not quite. Check the rule and try again.' };
}

function inputRow(onSubmit, placeholder = 'Your answer') {
  const inp = h('input', { type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', class: 'ans', placeholder, 'aria-label': 'Your answer', id: 'ans-' + Math.random().toString(36).slice(2, 7) });
  const btn = h('button', { type: 'submit', class: 'btn primary' }, 'Check');
  const form = h('form', { class: 'ans-row' }, inp, btn);
  form.addEventListener('submit', (e) => { e.preventDefault(); onSubmit(inp.value, inp, btn); });
  return { form, inp, btn };
}

function addPrompt(host, step) {
  host.append(rich(cvSay(step, 'prompt'), 'h2', 'prompt'));
  if (step.aside) host.append(rich(step.aside, 'div', 'gl-aside'));   // a legend, table or reminder the question needs (lesson data field `aside`)
  if (step.figures) host.append(h('div', { class: 'pair figs' }, step.figures.map((f) => molFigure(f.smiles, f.label || '', { highlight: f.highlight || [] }))));
  else if (step.smiles && step.both) host.append(molPair(step.smiles, '', { highlight: step.highlight || [] }));
  else if (step.smiles) host.append(molFigure(step.smiles, '', { highlight: step.highlight || [], style: step.drawing }));
  if (step.equation) host.append(equationRow(step.equation));
  if (step.visual) mountVisual(host, step.visual);
}

export function mountVisual(host, visual) {
  if (Array.isArray(visual)) {
    // several panels side by side (each may have a caption in `title`), e.g. a wrong mechanism and the product it gives
    const grid = h('div', { class: 'rv' });
    host.append(grid);
    visual.forEach((v) => {
      const cell = h('div', { class: 'visual' });
      if (v.title) cell.append(h('p', { class: 'rv-cap' }, v.title));
      grid.append(cell);
      const inner = h('div', { class: 'widget' });
      cell.append(inner);
      WIDGETS[v.widget].mount(inner, v.config, { onResult() {} });
    });
    return;
  }
  const box = h('div', { class: 'visual' });
  host.append(box);
  const w = WIDGETS[visual.widget];
  w.mount(box, visual.config, { onResult() {} });
}

const RENDER = {
  explain(step, ctx, host) {
    if (step.visual && step.visualFirst) mountVisual(host, step.visual);   // `visualFirst`: the picture comes before the words (Lesson 08: arrows and the energy diagram)
    host.append(h('div', { class: 'explain' }, rich(cvSay(step, 'html'))));
    if (step.visual && !step.visualFirst) mountVisual(host, step.visual);
    ctx.done();
  },

  predict(step, ctx, host) {
    host.append(h('p', { class: 'eyebrow' }, 'Predict first'));
    addPrompt(host, step);
    const list = h('div', { class: 'opts', role: 'group' });
    const out = h('div', { class: 'after' });
    const shown = orderedOptions(step, ctx.lessonId, ctx.attempt);
    const names = optionNames(shown);
    shown.forEach((o, oi) => {
      const b = h('button', { type: 'button', class: 'opt' }, rich(o.text, 'span'));
      nameOptionButton(b, names[oi]);
      b.addEventListener('click', () => {
        [...list.children].forEach((x, i) => { x.disabled = true; if (shown[i].correct) x.classList.add('good'); });
        if (!o.correct) { b.classList.add('bad'); ctx.mistake(step.skill, step.id, o.why); }
        const fb = h('div', { class: 'fb ' + (o.correct ? 'ok' : 'bad'), 'aria-live': 'polite' }, rich(sayWhy(step, o), 'p'));
        out.append(fb, h('div', { class: 'reveal' }, h('b', {}, 'So here is the idea. '), rich(cvSay(step, 'reveal'), 'span')));
        ctx.done();
      });
      list.append(b);
    });
    host.append(list, out);
  },

  choice(step, ctx, host) {
    addPrompt(host, step);
    const g = grader(step, ctx, host);
    const list = h('div', { class: 'opts' + (step.options.some((o) => o.smiles) ? ' mols' : ''), role: 'group' });
    const cShown = orderedOptions(step, ctx.lessonId, ctx.attempt), cNames = optionNames(cShown);
    cShown.forEach((o, oi) => {
      const b = h('button', { type: 'button', class: 'opt' }, o.smiles ? molFigure(o.smiles, o.label || '', { ...(o.raw ? { raw: true, showCharge: true } : {}), ...(o.lp ? { lp: true } : {}), ...(o.alt ? { alt: o.alt } : {}) }) : rich(o.text, 'span'));
      nameOptionButton(b, o.alt || cNames[oi]);
      b.addEventListener('click', () => {
        if (o.correct) { [...list.children].forEach((x) => { x.disabled = true; }); b.classList.add('good'); g.right(sayWhy(step, o), { note: true }); }
        else { b.classList.add('bad'); b.disabled = true; g.wrong(o.why, sayWhy(step, o)); }
      });
      list.append(b);
    });
    host.insertBefore(list, host.querySelector('.fb'));
  },

  input(step, ctx, host) {
    addPrompt(host, step);
    const g = grader(step, ctx, host);
    const { form, inp } = inputRow((val, input, btn) => {
      const r = checkInput(step, val);
      if (r.ok) { input.disabled = true; btn.disabled = true; g.right((step.confirm || 'Correct.') + (r.note ? ` <span class="style-note">${r.note}</span>` : ''), { note: true }); }
      else if (r.empty || r.malformed) { host.querySelector('.fb').className = 'fb bad'; host.querySelector('.fb').textContent = r.diagnosis; input.focus(); }
      else { g.wrong(r.diagnosis); input.select(); }
    });
    host.insertBefore(form, host.querySelector('.fb'));
  },

  try(step, ctx, host) {
    host.append(h('p', { class: 'eyebrow' }, 'Try it'));
    addPrompt(host, step);
    const box = h('div', { class: 'widget' });
    host.append(box);
    const g = grader(step, ctx, host);
    WIDGETS[step.widget].mount(box, step.config, {
      onResult(r) { if (r.ok) g.right(step.confirm || 'Correct.'); else g.wrong(r.diagnosis, undefined, r.code); },
      onProgress(o) { g.clear(o); }        // o.task: the widget moved to a new sub-task (next molecule, next question): its hints go too
    });
  },

  worked(step, ctx, host) {
    host.append(h('p', { class: 'eyebrow' }, 'Worked example'));
    host.append(rich(cvSay(step, 'problem'), 'h2', 'prompt'));
    if (step.smiles) host.append(molFigure(step.smiles, '', { highlight: step.highlight || [] }));
    const wrap = h('div', { class: 'moves' });
    host.append(wrap);
    let k = 0;
    const next = () => {
      if (k >= step.moves.length) {
        if (step.rule) wrap.append(h('div', { class: 'rule' }, h('b', {}, 'The rule '), rich(cvSay(step, 'rule'), 'span')));
        ctx.done();
        return;
      }
      const mi = k, mv = step.moves[k++];
      const card = h('div', { class: 'move' });
      card.append(rich(sayMove(step, mi, 'ask'), 'p', 'ask'));
      if (mv.equation) card.append(equationRow(mv.equation));
      if (mv.visual) mountVisual(card, mv.visual);
      const opts = h('div', { class: 'opts', role: 'group' });
      const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
      const mShown = orderedMoveOptions(step, mi, ctx.lessonId, ctx.attempt), mNames = optionNames(mShown);
      mShown.forEach((o, oi) => {
        const b = h('button', { type: 'button', class: 'opt' }, rich(o.text, 'span'));
        nameOptionButton(b, mNames[oi]);
        b.addEventListener('click', () => {
          if (o.correct) {
            [...opts.children].forEach((x) => { x.disabled = true; });
            b.classList.add('good');
            fb.className = 'fb ok'; fb.innerHTML = '';
            fb.append(rich(sayMoveWhy(step, mi, o) + (mv.then ? ' ' + sayMove(step, mi, 'then') : ''), 'p'));
            if (mv.figure) fb.append(molFigure(mv.figure.smiles, mv.figure.label || '', { style: mv.figure.drawing, highlight: mv.figure.highlight || [], showCharge: !!mv.figure.showCharge }));
            next();
          } else {
            b.classList.add('bad'); b.disabled = true;
            ctx.mistake(step.skill, step.id, o.why);
            fb.className = 'fb bad'; fb.innerHTML = ''; fb.append(rich(sayMoveWhy(step, mi, o), 'p'));
          }
        });
        opts.append(b);
      });
      card.append(opts, fb);
      wrap.append(card);
      card.scrollIntoView?.({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    next();
  },

  mastery(step, ctx, host) {
    // back on a check that is already passed (Back, then Continue): say so, so a fresh "0 of 3" does not read as lost progress (novice review #13)
    if (ctx.passed) host.append(h('p', { class: 'fb ok mastery-passed' }, 'You have already passed this check, so Continue stays open. The problems below are extra practice.'));
    renderProblems({ ...(step.mastery || { count: 3, generator: 'lewis-basic' }), extra: !!ctx.passed }, ctx, host);   // extra: a check already passed, so the bar says "extra practice" and no "0 of 3" reads as lost progress
  },

  useit(step, ctx, host) {
    const u = step.useIt;
    host.append(h('p', { class: 'eyebrow' }, 'Use it'));
    host.append(h('h2', { class: 'prompt' }, 'Now do these from the book'));
    const endFrom = u.endFrom || 30; // first end-of-chapter problem number (chapter 2 starts its exercises at 2.29)
    const inCh = u.book.filter((p) => parseFloat(p.split('.')[1]) < endFrom);
    const end = u.book.filter((p) => parseFloat(p.split('.')[1]) >= endFrom);
    const chips = (arr) => h('div', { class: 'chips' }, arr.map((p) => h('span', { class: 'chip' }, p)));
    host.append(h('div', { class: 'useit' },
      inCh.length ? h('div', {}, h('h3', {}, 'In-chapter problems'), chips(inCh)) : null,
      end.length ? h('div', {}, h('h3', {}, 'End of chapter'), chips(end)) : null,
      u.note ? rich(u.note, 'p', 'muted') : null));
    const btn = h('button', { type: 'button', class: 'btn primary', id: 'complete-btn' }, ctx.complete ? 'Mark lesson complete' : 'Done');
    btn.addEventListener('click', () => { btn.disabled = true; ctx.complete(); });
    host.append(btn);
  }
};

/**
 * Mastery / practice player: `count` fresh generated problems, each must be answered correctly.
 * cfg.next() -> { generator, skill, settings, tasks } picks each problem's source (the question-type course; else cfg.generator / cfg.skill); cfg.status() -> the bar text;
 * cfg.onSettled(counted, problem) is called ONCE per problem: true when the first answer was right, false at the first wrong answer (or at time out), so a streak resets at once.
 */
export function renderProblems(cfg, ctx, host) {
  const endless = cfg.endless === true;                // the reaction practice settings: no fixed number, the learner ends the session
  const need = endless ? Infinity : (cfg.count || 3);
  let got = 0;                                       // problems answered right on the FIRST try: only these count toward the gate
  const tally = firstTryTally();
  host.append(h('p', { class: 'eyebrow' }, cfg.skill ? 'Practise' : 'Mastery check'));
  const stage = h('div', { class: 'stage' });
  host.append(stage);
  const bar = h('p', { class: 'muted count' });
  host.insertBefore(bar, stage);

  let tick = null;                                   // the per-question timer (cfg.timer seconds; the naming drill's settings choose it)
  const stopTimer = () => { if (tick) { clearInterval(tick); tick = null; } };
  function show() {
    stopTimer();
    bar.textContent = cfg.status ? cfg.status() : endless ? `Problem ${got + 1}. Endless: end the session whenever you like.` : cfg.extra ? `Extra practice, problem ${tally.shown + 1}. Each one is generated fresh; none of it changes your result.` : `Problem ${tally.shown + 1}: ${got} of ${need} right first try so far. Each one is generated fresh, and only a right first answer counts.`;
    stage.innerHTML = '';
    const src = cfg.next ? cfg.next() : cfg;
    const p = generate(src.generator || 'lewis-basic', 1, { skill: src.skill || null, settings: src.settings || null, tasks: src.tasks || null })[0];
    const step = { id: 'mastery', skill: p.skill, hints: p.hints, worked: null };
    const card = h('div', { class: 'problem' });
    stage.append(card);
    card.append(p.promptHtml ? rich(p.promptHtml, 'h2', 'prompt') : h('h2', { class: 'prompt' }, p.prompt));
    if (p.kind !== 'builder' && p.kind !== 'polarity' && p.kind !== 'arrows' && p.kind !== 'groupfind' && p.kind !== 'cip' && p.smiles) card.append(molFigure(p.smiles, '', { highlight: p.highlight }));
    if (p.equation) card.append(equationRow(p.equation));
    if (p.visual) mountVisual(card, p.visual);
    const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
    const hints = h('div', { class: 'hints' });
    let wrong = 0, settled = false, told = false;
    const ft = firstTry();
    const settle = (counted) => { if (told) return; told = true; if (cfg.onSettled) cfg.onSettled(counted, p); };   // once per problem
    const advance = (ok) => {                          // ok: this problem COUNTS (its first answer was right)
      settled = true; stopTimer();
      const btn = h('button', { type: 'button', class: 'btn primary' }, ok ? (got + 1 >= need ? 'Finish' : 'Next problem') : 'Try another');
      btn.addEventListener('click', () => { tally.add(ok); if (ok) got++; if (got >= need) { bar.textContent = `${tally.text()}.`; stage.innerHTML = ''; stage.append(h('div', { class: 'fb ok' }, h('p', {}, `Mastery check passed: ${tally.text()}.`))); ctx.done(); } else show(); });
      card.append(btn); btn.focus();
    };
    const onWrong = (why, opt) => {
      wrong++; ft.wrong(); settle(false);
      ctx.mistake(p.skill, 'mastery', opt && opt.lead ? opt.lead : why, p.card);
      fb.className = 'fb bad'; fb.textContent = '';
      if (opt && opt.lead) {
        // a drill answer: the one specific line first, the longer reason behind "Why?", and a way back to the card (and its lesson step)
        const say = (t) => (cfg.skill ? tAuto(t) : t);
        fb.append(h('p', { class: 'fb-lead' }, say(opt.lead)));
        if (opt.more) fb.append(h('details', { class: 'fb-more' }, h('summary', {}, 'Why?'), h('p', {}, say(opt.more))));
        const card = HUB_BY_ID[p.card];
        if (card) fb.append(h('p', { class: 'fb-links' }, h('a', { class: 'btn small ghost', href: '#reactions/' + card.id }, 'See the card'),
          card.lesson ? h('a', { class: 'btn small ghost', href: `#lesson-${card.lesson.id}/${card.lesson.step}` }, `See Lesson ${Number(card.lesson.id)}, step ${Number(card.lesson.step.slice(1))}`) : null));
      } else fb.textContent = cfg.skill ? tAuto(why) : why;   // drills (practice) answer in caveman words when that switch is on; lessons keep their own text
      hints.innerHTML = '';
      if (wrong >= 1) hints.append(h('p', { class: 'hint' }, h('b', {}, 'Hint 1 '), p.hints[0]));
      if (wrong >= 2) hints.append(h('p', { class: 'hint' }, h('b', {}, 'Hint 2 '), p.hints[1]));
      if (wrong >= 3 && !settled) {
        const ans = p.kind === 'groupfind' ? '' : p.kind === 'input' ? `The answer is ${p.answer}. ` : p.kind === 'choice' ? `The answer is ${p.answer || p.options.find((o) => o.correct).text}. ` : '';
        hints.append(h('div', { class: 'worked-box' }, h('b', {}, 'Worked answer '), p.deriveHtml ? rich(ans + p.deriveHtml, 'span') : ans + p.derive));
        advance(false);
      }
    };
    const onRight = (note) => {
      const counts = ft.right();                       // right on the first answer only
      settle(counts);
      if (counts) ctx.win(p.skill, p.card);
      fb.className = 'fb ok'; if (p.deriveHtml) { fb.textContent = ''; fb.append(rich('Correct. ' + p.deriveHtml, 'span')); } else fb.textContent = 'Correct. ' + p.derive;
      if (!counts) fb.append(h('p', { class: 'style-note' }, 'Not first try, so this one does not count toward the check. The slip is logged; the next problem is fresh.'));
      if (note) fb.append(h('p', { class: 'style-note' }, note));
      hints.innerHTML = '';
      advance(counts);
    };
    if (p.kind === 'input') {
      const { form, inp } = inputRow((val, input, btn) => {
        if (settled) return;
        const r = checkInput({ answer: p.answer, accept: p.accept, name: p.name, smiles: p.name ? p.smiles : undefined, noForms: p.noForms, diagnoseFn: p.diagnoseFn, diagnose: p.wrong, fallback: p.fallback || p.derive, skill: p.skill, formula: p.formula, tolerance: p.tolerance }, val);
        if (r.ok) { input.disabled = true; btn.disabled = true; onRight(r.note); }
        else if (r.empty || r.malformed) { fb.className = 'fb bad'; fb.textContent = r.diagnosis; input.focus(); }
        else { onWrong(r.diagnosis); if (!settled) input.select(); else { input.disabled = true; btn.disabled = true; } }
      });
      card.append(form);
    } else if (p.kind === 'choice') {
      const list = h('div', { class: 'opts' + (p.options.some((o) => o.smiles) ? ' mols' : ''), role: 'group' });
      const pNames = p.options.some((o) => o.smiles && !o.raw) ? optionNames(p.options.map((o) => (o.raw ? { text: o.text } : o))) : [];
      p.options.forEach((o, oi) => {
        const b = h('button', { type: 'button', class: 'opt' }, o.smiles ? molFigure(o.smiles, o.text || '', o.raw ? { raw: true, showCharge: true } : {}) : rich(o.text, 'span'));
        if (pNames[oi]) nameOptionButton(b, pNames[oi], /^Option [A-H]$/.test(o.text || '') ? o.text : '');
        b.addEventListener('click', () => {
          if (settled) return;
          if (o.correct) { [...list.children].forEach((x) => { x.disabled = true; }); b.classList.add('good'); onRight(); }
          else { b.classList.add('bad'); b.disabled = true; onWrong(o.why, o); if (settled) [...list.children].forEach((x) => { x.disabled = true; }); }
        });
        list.append(b);
      });
      card.append(list);
    } else if (p.kind === 'arrows') {
      const box = h('div', { class: 'widget' });
      card.append(box);
      // a new tap clears the old verdict; Undo / Clear ({task:true}) clear its hints too, so nothing on screen is about arrows that are gone (novice re-test N2)
      WIDGETS['arrow-draw'].mount(box, p.config, { onResult(r) { if (settled) return; if (r.ok) onRight(); else onWrong(r.diagnosis); }, onProgress(o) { if (settled) return; fb.className = 'fb'; fb.textContent = ''; if (o && o.task) hints.innerHTML = ''; } });
    } else if (p.kind === 'widget') {
      // Lesson 09: any widget by name (p.widget, p.config); it reports {ok} like the others
      const box = h('div', { class: 'widget' });
      card.append(box);
      WIDGETS[p.widget].mount(box, p.config, { onResult(r) { if (settled) return; if (r.ok) onRight(); else onWrong(r.diagnosis); } });
    } else if (p.kind === 'groupfind') {
      const box = h('div', { class: 'widget' });
      card.append(box);
      WIDGETS['group-finder'].mount(box, p.config, { onResult(r) { if (settled) return; if (r.ok) onRight(); else onWrong(r.diagnosis); } });
    } else if (p.kind === 'cip') {
      const box = h('div', { class: 'widget' });
      card.append(box);
      WIDGETS['cip-ranker'].mount(box, p.config, { onResult(r) { if (settled) return; if (r.ok) onRight(); else onWrong(r.diagnosis); } });
    } else if (p.kind === 'polarity') {
      const box = h('div', { class: 'widget' });
      card.append(box);
      WIDGETS['polarity-mark'].mount(box, p.config, { onResult(r) { if (settled) return; if (r.ok) onRight(); else onWrong(r.diagnosis); } });
    } else {
      const box = h('div', { class: 'widget' });
      card.append(box);
      WIDGETS['lewis-builder'].mount(box, p.config, { onResult(r) { if (settled) return; if (r.ok) onRight(); else onWrong(r.diagnosis); } });
    }
    card.append(fb, hints);
    if (endless) {
      const end = h('button', { type: 'button', class: 'btn small ghost rs-end' }, 'End session');
      end.addEventListener('click', () => { stopTimer(); bar.textContent = `Session over: ${tally.text()}.`; stage.innerHTML = ''; stage.append(h('div', { class: 'fb ok' }, h('p', {}, `${got} problem${got === 1 ? '' : 's'} right on the first try${tally.shown > got ? ` (${tally.shown} shown)` : ''}.`))); ctx.done(); });
      card.append(end);
    }
    if (cfg.timer > 0) {
      let left = cfg.timer;
      const clock = h('p', { class: 'nl-timer', role: 'timer' });
      const fmt = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
      const paint = () => { clock.textContent = `Time left ${fmt(left)}`; clock.classList.toggle('low', left <= 10); };
      paint(); card.insertBefore(clock, fb);
      tick = setInterval(() => {
        if (settled || !card.isConnected) { stopTimer(); return; }   // answered, or the page moved on
        left--; paint();
        if (left <= 0) {
          stopTimer(); clock.textContent = 'Time is up.'; settle(false);
          ctx.mistake(p.skill, 'mastery', p.card || p.skill === 'predict-product' ? 'Time ran out on a reaction question.' : 'Time ran out on a naming question.', p.card);
          fb.className = 'fb bad'; fb.textContent = 'Time is up. Here is the worked answer; the next one is a fresh problem.';
          const ans = p.kind === 'input' ? `The answer is ${p.answer}. ` : p.kind === 'choice' ? `The answer is ${p.answer || ''}. ` : '';
          hints.innerHTML = ''; hints.append(h('div', { class: 'worked-box' }, h('b', {}, 'Worked answer '), p.deriveHtml ? rich(ans + p.deriveHtml, 'span') : ans + (p.derive || '')));
          card.querySelectorAll('input,button.opt').forEach((x) => { x.disabled = true; });
          advance(false);
        }
      }, 1000);
    }
  }
  show();
}

export function renderStep(step, ctx, host) {
  host.innerHTML = '';
  host.dataset.type = step.type;
  RENDER[step.type](step, ctx, host);
}
