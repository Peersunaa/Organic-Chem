// Step renderers. Each renderer fills `host` and reports through ctx.
import { svg as rdSvg, analyze } from './chem.js';
import { gradeFormula } from './skeletal.js';
import { WIDGETS } from './widgets/index.js';
import { skillRule } from './skills.js';
import { generate } from './generators.js';
import { normName } from './naming.js';

export function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in props || {}) {
    if (k === 'class') e.className = props[k];
    else if (k === 'html') e.innerHTML = props[k];
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
  const fig = h('figure', { class: 'mol' });
  fig.append(h('div', { class: 'mol-svg', html: rdSvg(smiles, opts), role: 'img', 'aria-label': label || smiles }));
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
    m.replaceWith(molFigure(m.getAttribute('smiles'), m.getAttribute('label') || '', { ...(draw ? { style: draw } : {}), ...(m.hasAttribute('raw') ? { raw: true } : {}), ...(m.getAttribute('rotate') ? { rotate: Number(m.getAttribute('rotate')) } : {}) }));
  });
  root.querySelectorAll('molpair').forEach((m) => {
    const hl = (m.getAttribute('hl') || '').split(',').filter(Boolean).map(Number);
    m.replaceWith(molPair(m.getAttribute('smiles'), m.getAttribute('label') || '', { highlight: hl }));
  });
  root.querySelectorAll('name').forEach((n) => n.replaceWith(nameSpan({ new: n.getAttribute('new'), old: n.getAttribute('old') })));
  return root;
}
export function rich(html, tag = 'div', cls = '') { return enhance(h(tag, { class: cls, html })); }

function grader(step, ctx, host) {
  let wrong = 0;
  const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
  const hints = h('div', { class: 'hints' });
  host.append(fb, hints);
  const say = (kind, html) => { fb.className = 'fb ' + kind; fb.innerHTML = ''; fb.append(rich(html, 'p')); };
  return {
    get wrongCount() { return wrong; },
    wrong(diagnosis) {
      wrong++;
      ctx.mistake(step.skill, step.id, diagnosis);
      say('bad', diagnosis);
      hints.innerHTML = '';
      const hs = step.hints || [];
      if (wrong >= 1 && hs[0]) hints.append(h('p', { class: 'hint' }, h('b', {}, 'Hint 1 '), hs[0]));
      if (wrong >= 2 && hs[1]) hints.append(h('p', { class: 'hint' }, h('b', {}, 'Hint 2 '), hs[1]));
      if (wrong >= 3 && step.worked) {
        hints.append(h('div', { class: 'worked-box' }, h('b', {}, 'Worked answer '), rich(step.worked, 'span')));
        ctx.done();
      }
      return wrong;
    },
    right(msg) { say('ok', msg || 'Correct.'); ctx.done(); },
    // a widget made partial progress (e.g. 1 of 2 predictions right): drop stale wrong-answer feedback
    clear() { fb.className = 'fb'; fb.innerHTML = ''; }
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
    if ([step.answer].concat(step.accept || []).some((a) => normName(a) === got)) return { ok: true };
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
  host.append(rich(step.prompt, 'h2', 'prompt'));
  if (step.figures) host.append(h('div', { class: 'pair figs' }, step.figures.map((f) => molFigure(f.smiles, f.label || '', { highlight: f.highlight || [] }))));
  else if (step.smiles && step.both) host.append(molPair(step.smiles, '', { highlight: step.highlight || [] }));
  else if (step.smiles) host.append(molFigure(step.smiles, '', { highlight: step.highlight || [], style: step.drawing }));
  if (step.equation) host.append(equationRow(step.equation));
  if (step.visual) mountVisual(host, step.visual);
}

function mountVisual(host, visual) {
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
    host.append(h('div', { class: 'explain' }, rich(step.html)));
    ctx.done();
  },

  predict(step, ctx, host) {
    host.append(h('p', { class: 'eyebrow' }, 'Predict first'));
    addPrompt(host, step);
    const list = h('div', { class: 'opts', role: 'group' });
    const out = h('div', { class: 'after' });
    step.options.forEach((o) => {
      const b = h('button', { type: 'button', class: 'opt' }, rich(o.text, 'span'));
      b.addEventListener('click', () => {
        [...list.children].forEach((x, i) => { x.disabled = true; if (step.options[i].correct) x.classList.add('good'); });
        if (!o.correct) { b.classList.add('bad'); ctx.mistake(step.skill, step.id, o.why); }
        const fb = h('div', { class: 'fb ' + (o.correct ? 'ok' : 'bad'), 'aria-live': 'polite' }, rich(o.why, 'p'));
        out.append(fb, h('div', { class: 'reveal' }, h('b', {}, 'So here is the idea. '), rich(step.reveal, 'span')));
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
    step.options.forEach((o) => {
      const b = h('button', { type: 'button', class: 'opt' }, o.smiles ? molFigure(o.smiles, o.label || '', o.raw ? { raw: true, showCharge: true } : {}) : rich(o.text, 'span'));
      b.addEventListener('click', () => {
        if (o.correct) { [...list.children].forEach((x) => { x.disabled = true; }); b.classList.add('good'); g.right(o.why); }
        else { b.classList.add('bad'); b.disabled = true; g.wrong(o.why); }
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
      if (r.ok) { input.disabled = true; btn.disabled = true; g.right(step.confirm || 'Correct.'); }
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
      onResult(r) { if (r.ok) g.right(step.confirm || 'Correct.'); else g.wrong(r.diagnosis); },
      onProgress() { g.clear(); }
    });
  },

  worked(step, ctx, host) {
    host.append(h('p', { class: 'eyebrow' }, 'Worked example'));
    host.append(rich(step.problem, 'h2', 'prompt'));
    if (step.smiles) host.append(molFigure(step.smiles, '', { highlight: step.highlight || [] }));
    const wrap = h('div', { class: 'moves' });
    host.append(wrap);
    let k = 0;
    const next = () => {
      if (k >= step.moves.length) {
        if (step.rule) wrap.append(h('div', { class: 'rule' }, h('b', {}, 'The rule '), rich(step.rule, 'span')));
        ctx.done();
        return;
      }
      const mv = step.moves[k++];
      const card = h('div', { class: 'move' });
      card.append(rich(mv.ask, 'p', 'ask'));
      if (mv.equation) card.append(equationRow(mv.equation));
      if (mv.visual) mountVisual(card, mv.visual);
      const opts = h('div', { class: 'opts', role: 'group' });
      const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
      mv.options.forEach((o) => {
        const b = h('button', { type: 'button', class: 'opt' }, rich(o.text, 'span'));
        b.addEventListener('click', () => {
          if (o.correct) {
            [...opts.children].forEach((x) => { x.disabled = true; });
            b.classList.add('good');
            fb.className = 'fb ok'; fb.innerHTML = '';
            fb.append(rich(o.why + (mv.then ? ' ' + mv.then : ''), 'p'));
            if (mv.figure) fb.append(molFigure(mv.figure.smiles, mv.figure.label || '', { style: mv.figure.drawing, highlight: mv.figure.highlight || [], showCharge: !!mv.figure.showCharge }));
            next();
          } else {
            b.classList.add('bad'); b.disabled = true;
            ctx.mistake(step.skill, step.id, o.why);
            fb.className = 'fb bad'; fb.innerHTML = ''; fb.append(rich(o.why, 'p'));
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

  mastery(step, ctx, host) { renderProblems(step.mastery || { count: 3, generator: 'lewis-basic' }, ctx, host); },

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
      u.note ? h('p', { class: 'muted' }, u.note) : null));
    const btn = h('button', { type: 'button', class: 'btn primary', id: 'complete-btn' }, ctx.complete ? 'Mark lesson complete' : 'Done');
    btn.addEventListener('click', () => { btn.disabled = true; ctx.complete(); });
    host.append(btn);
  }
};

/** Mastery / practice player: `count` fresh generated problems, each must be answered correctly. */
export function renderProblems(cfg, ctx, host) {
  const need = cfg.count || 3;
  let got = 0;
  host.append(h('p', { class: 'eyebrow' }, cfg.skill ? 'Practise' : 'Mastery check'));
  const stage = h('div', { class: 'stage' });
  host.append(stage);
  const bar = h('p', { class: 'muted count' });
  host.insertBefore(bar, stage);

  function show() {
    bar.textContent = `Problem ${Math.min(got + 1, need)} of ${need}. Each one is generated fresh.`;
    stage.innerHTML = '';
    const p = generate(cfg.generator || 'lewis-basic', 1, { skill: cfg.skill || null })[0];
    const step = { id: 'mastery', skill: p.skill, hints: p.hints, worked: null };
    const card = h('div', { class: 'problem' });
    stage.append(card);
    card.append(p.promptHtml ? rich(p.promptHtml, 'h2', 'prompt') : h('h2', { class: 'prompt' }, p.prompt));
    if (p.kind !== 'builder' && p.kind !== 'polarity' && p.kind !== 'arrows' && p.kind !== 'groupfind' && p.kind !== 'cip' && p.smiles) card.append(molFigure(p.smiles, '', { highlight: p.highlight }));
    if (p.equation) card.append(equationRow(p.equation));
    if (p.visual) mountVisual(card, p.visual);
    const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
    const hints = h('div', { class: 'hints' });
    let wrong = 0, settled = false;
    const advance = (ok) => {
      settled = true;
      const btn = h('button', { type: 'button', class: 'btn primary' }, ok ? (got + 1 >= need ? 'Finish' : 'Next problem') : 'Try another');
      btn.addEventListener('click', () => { if (ok) got++; if (got >= need) { bar.textContent = `All ${need} correct.`; stage.innerHTML = ''; stage.append(h('div', { class: 'fb ok' }, h('p', {}, 'Mastery check passed.'))); ctx.done(); } else show(); });
      card.append(btn); btn.focus();
    };
    const onWrong = (why) => {
      wrong++;
      ctx.mistake(p.skill, 'mastery', why);
      fb.className = 'fb bad'; fb.textContent = why;
      hints.innerHTML = '';
      if (wrong >= 1) hints.append(h('p', { class: 'hint' }, h('b', {}, 'Hint 1 '), p.hints[0]));
      if (wrong >= 2) hints.append(h('p', { class: 'hint' }, h('b', {}, 'Hint 2 '), p.hints[1]));
      if (wrong >= 3 && !settled) {
        const ans = p.kind === 'groupfind' ? '' : p.kind === 'input' ? `The answer is ${p.answer}. ` : p.kind === 'choice' ? `The answer is ${p.answer || p.options.find((o) => o.correct).text}. ` : '';
        hints.append(h('div', { class: 'worked-box' }, h('b', {}, 'Worked answer '), ans + p.derive));
        advance(false);
      }
    };
    const onRight = () => {
      if (wrong === 0) ctx.win(p.skill);
      fb.className = 'fb ok'; fb.textContent = 'Correct. ' + p.derive;
      hints.innerHTML = '';
      advance(true);
    };
    if (p.kind === 'input') {
      const { form, inp } = inputRow((val, input, btn) => {
        if (settled) return;
        const r = checkInput({ answer: p.answer, accept: p.accept, name: p.name, diagnoseFn: p.diagnoseFn, diagnose: p.wrong, fallback: p.fallback || p.derive, skill: p.skill, formula: p.formula, tolerance: p.tolerance }, val);
        if (r.ok) { input.disabled = true; btn.disabled = true; onRight(); }
        else if (r.empty || r.malformed) { fb.className = 'fb bad'; fb.textContent = r.diagnosis; input.focus(); }
        else { onWrong(r.diagnosis); if (!settled) input.select(); else { input.disabled = true; btn.disabled = true; } }
      });
      card.append(form);
    } else if (p.kind === 'choice') {
      const list = h('div', { class: 'opts' + (p.options.some((o) => o.smiles) ? ' mols' : ''), role: 'group' });
      p.options.forEach((o) => {
        const b = h('button', { type: 'button', class: 'opt' }, o.smiles ? molFigure(o.smiles, o.text || '', o.raw ? { raw: true, showCharge: true } : {}) : rich(o.text, 'span'));
        b.addEventListener('click', () => {
          if (settled) return;
          if (o.correct) { [...list.children].forEach((x) => { x.disabled = true; }); b.classList.add('good'); onRight(); }
          else { b.classList.add('bad'); b.disabled = true; onWrong(o.why); if (settled) [...list.children].forEach((x) => { x.disabled = true; }); }
        });
        list.append(b);
      });
      card.append(list);
    } else if (p.kind === 'arrows') {
      const box = h('div', { class: 'widget' });
      card.append(box);
      WIDGETS['arrow-draw'].mount(box, p.config, { onResult(r) { if (settled) return; if (r.ok) onRight(); else onWrong(r.diagnosis); } });
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
  }
  show();
}

export function renderStep(step, ctx, host) {
  host.innerHTML = '';
  host.dataset.type = step.type;
  RENDER[step.type](step, ctx, host);
}
