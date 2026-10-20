// Widget: energy-diagram. An interactive reaction-energy diagram drawn from data (SVG, themed by CSS variables).
//
// config: { levels:[{label, kind:'R'|'TS'|'I'|'P', E}], mode?: 'tasks'|'view'|'catalyst' (default 'tasks'),
//           tasks?: ['ts','intermediate','eact:1','dh','dhsign','rds','faster','nsteps' | {task, ask?}], showValues?: bool, unit?: 'kJ/mol',
//           caption?, catalyst?: {minDrop}, overlay?: {levels, label}, label? }
// overlay (Lesson 09, view mode only): a SECOND pathway drawn on the same axes (same number of levels), dashed, e.g. the 1° cation pathway against the 3°
//   one. `label` (main) and `overlay.label` become the legend. Both curves share one energy scale.
// tasks : the learner taps peaks / valleys / numbered brackets (or answers a two-button question). Every answer is graded from the levels
//         (energy-core.gradeTask); each wrong tap gets a diagnosis through ctx.onResult({ok:false, diagnosis}); ctx.onResult({ok:true})
//         after the last task.
// view  : the diagram only (levels labelled A, B, C ...; values shown when showValues).
// catalyst: drag the transition state down (simulating a catalyst). A second handle moves the products on purpose: ΔH must stay fixed.
//   ask: '' hides the widget's own instruction bar (when the step prompt already says it).
// Feedback: a wrong answer's diagnosis goes to the step's feedback box only (ctx.onResult), never twice; a right answer's reason stays under the diagram until the
//   next task starts (1.4 s later; the new task clears it and the step's hints, so nothing stale or give-away is left) and clears that box (ctx.onProgress). Tap targets (levels, brackets, handles) are at least 44 px on a 400 px phone.
// notes  (view mode): { levelIndex: text } written beside a level, e.g. { 1: 'step 1', 2: 'the carbocation', 3: 'step 2' }; with reveal:true every level also
//   shows its kind (transition state, intermediate ...), so a picture names B, C and D before any task asks for them (novice re-test 2026-10-20, N10).
// Every tap acts or explains: a tap that is not on a target (the background, a level when the task wants a bracket, a picture in view mode) gets one line under the diagram.
import { KIND_NAME, letter, steps, overallDH, brackets, gradeTask, gradeCatalyst, pathD, validate } from './energy-core.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 400, H = 290, ML = 46, MR = 56, MT = 46, MB = 52;   // room above the highest hill and below the lowest level for the kind labels (transition state, products)
const svgEl = (tag, attrs = {}, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
const html = (tag, cls, inner) => { const e = document.createElement(tag); if (cls) e.className = cls; if (inner != null) e.innerHTML = inner; return e; };
const MINUS = '−';
const fmt = (n) => (n < 0 ? MINUS + -n : String(n));

const TASK_TEXT = {
  ts: 'Tap a transition state.',
  intermediate: 'Tap the reaction intermediate.',
  rds: 'Tap the transition state of the rate-determining step.',
  dh: 'Tap the numbered bracket that shows the overall energy change, ΔH.',
  dhsign: 'Is ΔH positive or negative?',
  faster: 'Which step is faster?',
  nsteps: 'How many steps does this reaction have?'
};
function askFor(spec) {
  const t = typeof spec === 'string' ? spec : spec.task;
  if (typeof spec === 'object' && spec.ask) return spec.ask;
  if (t.startsWith('eact:')) return `Tap the numbered bracket that shows the activation energy, Eact, of step ${t.split(':')[1]}.`;
  return TASK_TEXT[t];
}

export default {
  id: 'energy-diagram',
  mount(host, config, ctx) {
    const levels = config.levels.map((l) => ({ ...l }));
    const errs = validate(levels);
    if (errs.length) throw new Error('energy-diagram: ' + errs.join('; '));
    const mode = config.mode || 'tasks';
    const unit = config.unit || 'kJ/mol';
    const N = levels.length;
    const ov = mode === 'view' && config.overlay ? config.overlay.levels.map((l) => ({ ...l })) : null;
    if (ov) { const e2 = validate(ov); if (e2.length || ov.length !== levels.length) throw new Error('energy-diagram overlay: ' + (e2.join('; ') || 'needs the same number of levels')); }
    const allE = levels.map((l) => l.E).concat(ov ? ov.map((l) => l.E) : []);
    const pad = mode === 'catalyst' ? 36 : 14;
    // below the lowest level sit its letter and its kind label ("products"): leave them room above the x axis
    const eMin = Math.min(...allE) - (mode === 'catalyst' ? pad : 30), eMax = Math.max(...allE) + (mode === 'catalyst' ? 26 : pad);
    const X = (i) => ML + ((i + 0.5) / N) * (W - ML - MR);
    const Y = (E) => MT + ((eMax - E) / (eMax - eMin)) * (H - MT - MB);
    const toE = (y) => eMax - ((y - MT) / (H - MT - MB)) * (eMax - eMin);

    host.innerHTML = '';
    const root = html('div', 'ed');
    const taskBar = html('p', 'ed-task');
    taskBar.setAttribute('aria-live', 'polite');
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ed-svg', role: 'group', 'aria-label': 'Reaction energy diagram: energy against reaction progress' });
    const legend = html('ul', 'ed-legend');
    const answers = html('div', 'ed-answers');
    const msg = html('p', 'ed-msg');
    msg.setAttribute('aria-live', 'polite');
    const note = html('p', 'ed-note');
    note.setAttribute('aria-live', 'polite'); note.hidden = true;
    const say = (t) => { note.textContent = t; note.hidden = false; };
    root.append(taskBar, svg, note, legend, answers, msg);
    if (config.caption) root.append(html('p', 'ed-cap muted small', config.caption));
    host.append(root);

    // ---------------------------------------------------------------- static parts
    function axes() {
      svg.append(svgEl('line', { x1: ML - 14, y1: H - MB + 8, x2: ML - 14, y2: MT - 12, class: 'ed-axis' }));
      svg.append(svgEl('polygon', { points: `${ML - 14},${MT - 18} ${ML - 18},${MT - 8} ${ML - 10},${MT - 8}`, class: 'ed-axishead' }));
      svg.append(svgEl('line', { x1: ML - 14, y1: H - MB + 8, x2: W - MR + 40, y2: H - MB + 8, class: 'ed-axis' }));
      svg.append(svgEl('polygon', { points: `${W - MR + 46},${H - MB + 8} ${W - MR + 36},${H - MB + 4} ${W - MR + 36},${H - MB + 12}`, class: 'ed-axishead' }));
      svg.append(svgEl('text', { x: ML - 20, y: MT + 60, class: 'ed-axtxt', transform: `rotate(-90 ${ML - 20} ${MT + 60})`, 'text-anchor': 'middle' }, 'Energy'));
      svg.append(svgEl('text', { x: (ML + W - MR) / 2, y: H - 8, class: 'ed-axtxt', 'text-anchor': 'middle' }, 'Reaction progress'));
    }
    const tagPos = (l, i, E) => (l.kind === 'TS' ? Y(E) - 14 : Y(E) + 19);

    // a tap that no target took (each target stops its own click): one line on what can be tapped
    let offTarget = () => 'This diagram is for reading: there is nothing to tap here.';
    svg.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.ed-mark.tap, .ed-br, .ed-handle')) return; say(offTarget()); });

    // ================================================================ catalyst mode
    if (mode === 'catalyst') {
      const cur = { ts: levels[1].E, p: levels[N - 1].E };
      const R = levels[0].E;
      axes();
      const origPts = levels.map((l, i) => ({ x: X(i), y: Y(l.E) }));
      svg.append(svgEl('path', { d: pathD(origPts), class: 'ed-curve ghost' }));
      svg.append(svgEl('text', { x: X(1) + 30, y: Y(levels[1].E) - 12, class: 'ed-ghost-txt' }, 'without catalyst'));
      const curve = svgEl('path', { class: 'ed-curve' });
      const rLine = svgEl('line', { x1: X(0) - 22, x2: X(N - 1) + 26, y1: Y(R), y2: Y(R), class: 'ed-guide' });
      const pLine = svgEl('line', { x1: X(N - 1) - 24, x2: X(N - 1) + 40, y1: 0, y2: 0, class: 'ed-guide' });
      const dhTxt = svgEl('text', { x: X(N - 1) + 46, y: 0, class: 'ed-valtxt' });
      svg.append(rLine, pLine, curve, dhTxt);
      [0].forEach((i) => svg.append(svgEl('line', { x1: X(i) - 22, x2: X(i) + 22, y1: Y(levels[i].E), y2: Y(levels[i].E), class: 'ed-plat' })));
      const mk = (label, aria) => {
        const g = svgEl('g', { class: 'ed-handle', tabindex: '0', role: 'slider', 'aria-label': aria, 'aria-valuemin': String(Math.round(eMin)), 'aria-valuemax': String(Math.round(eMax)) });
        g.append(svgEl('circle', { r: 27, class: 'ed-hhit' }), svgEl('circle', { r: 8, class: 'ed-hdot' }), svgEl('path', { d: 'M-4 -3 L0 -8 L4 -3 M-4 3 L0 8 L4 3', class: 'ed-harr' }));
        svg.append(g);
        return g;
      };
      const tsH = mk('ts', 'Transition state energy. Drag or use the up and down arrow keys.');
      const pH = mk('p', 'Products energy. Drag or use the up and down arrow keys.');
      const rTag = svgEl('text', { x: X(0), y: Y(R) + 19, class: 'ed-tag', 'text-anchor': 'middle' }, 'reactants');
      const pTag = svgEl('text', { x: X(N - 1) - 30, y: 0, class: 'ed-tag', 'text-anchor': 'end' }, 'products');
      svg.append(rTag, pTag);
      const read = html('p', 'ed-read');
      read.setAttribute('aria-live', 'polite');
      const row = html('div', 'lb-actions');
      const check = html('button', 'btn primary', 'Check'); check.type = 'button';
      const reset = html('button', 'btn ghost', 'Reset'); reset.type = 'button';
      row.append(reset, check);
      answers.append(read, row);
      let locked = false;
      function paint() {
        const pts = [{ x: X(0), y: Y(R) }, { x: X(1), y: Y(cur.ts) }, { x: X(N - 1), y: Y(cur.p) }];
        curve.setAttribute('d', pathD(pts));
        tsH.setAttribute('transform', `translate(${X(1)} ${Y(cur.ts)})`);
        pH.setAttribute('transform', `translate(${X(N - 1)} ${Y(cur.p)})`);
        tsH.setAttribute('aria-valuenow', String(cur.ts)); pH.setAttribute('aria-valuenow', String(cur.p));
        tsH.setAttribute('aria-valuetext', `${cur.ts - R} ${unit} above the reactants`);
        pH.setAttribute('aria-valuetext', `${fmt(cur.p - R)} ${unit} compared with the reactants`);
        pLine.setAttribute('y1', Y(cur.p)); pLine.setAttribute('y2', Y(cur.p)); pTag.setAttribute('y', Y(cur.p) + 5);
        dhTxt.setAttribute('y', (Y(cur.p) + Y(R)) / 2 + 4);
        dhTxt.textContent = `ΔH ${fmt(cur.p - R)}`;
        read.innerHTML = `Eact = <b>${cur.ts - R}</b> ${unit} &nbsp;·&nbsp; ΔH = <b>${fmt(cur.p - R)}</b> ${unit}`;
      }
      const clampTs = (e) => Math.max(Math.max(R, cur.p) + 6, Math.min(levels[1].E + 24, Math.round(e)));
      const clampP = (e) => Math.max(Math.round(eMin + 8), Math.min(cur.ts - 6, Math.round(e)));
      function drag(g, which) {
        let active = false;
        const move = (ev) => {
          if (!active || locked) return;
          const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
          const p = pt.matrixTransform(svg.getScreenCTM().inverse());
          const e = toE(p.y);
          if (which === 'ts') cur.ts = clampTs(e); else cur.p = clampP(e);
          paint();
        };
        g.addEventListener('pointerdown', (ev) => { if (locked) return; active = true; try { g.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } ev.preventDefault(); g.focus(); move(ev); });
        g.addEventListener('pointermove', move);
        const end = () => { active = false; };
        g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
        g.addEventListener('keydown', (ev) => {
          if (locked) return;
          const d = ev.key === 'ArrowUp' ? 2 : ev.key === 'ArrowDown' ? -2 : ev.key === 'PageUp' ? 10 : ev.key === 'PageDown' ? -10 : 0;
          if (!d) return;
          ev.preventDefault();
          if (which === 'ts') cur.ts = clampTs(cur.ts + d); else cur.p = clampP(cur.p + d);
          paint();
        });
      }
      drag(tsH, 'ts'); drag(pH, 'p');
      offTarget = () => (locked ? 'Done: press Continue below.' : 'Drag the round handles (the hill top or the products), then press Check.');
      reset.addEventListener('click', () => { if (locked) return; cur.ts = levels[1].E; cur.p = levels[N - 1].E; msg.textContent = ''; msg.className = 'ed-msg'; paint(); });
      check.addEventListener('click', () => {
        if (locked) return;
        const r = gradeCatalyst(levels, cur, config.catalyst);
        if (r.ok) { locked = true; check.disabled = true; reset.disabled = true; msg.className = 'ed-msg ok'; msg.textContent = r.why; ctx.onProgress?.(); }
        else { msg.className = 'ed-msg'; msg.textContent = ''; }
        ctx.onResult(r);
      });
      taskBar.innerHTML = config.ask != null ? config.ask : 'Add a catalyst: drag the <b>transition state</b> down to lower the barrier. The <b>products</b> handle is there too, so you can test what a catalyst can and cannot do. Then press Check.';
      taskBar.hidden = config.ask === '';
      paint();
      return { destroy() {}, state: () => ({ ...cur }) };
    }

    // ================================================================ tasks / view modes
    const tasks = mode === 'tasks' ? (config.tasks || []) : [];
    let ti = 0, done = new Set(), revealed = new Set(config.reveal ? levels.map((_, i) => i) : []), busy = false;
    const st = steps(levels);
    const brs = brackets(levels);
    let activeKind = null;   // 'tap' | 'bracket' | 'choice' | null

    function draw() {
      svg.textContent = '';
      axes();
      const cur = tasks[ti];
      const name = cur ? String(typeof cur === 'string' ? cur : cur.task).split(':')[0] : null;
      const needBr = name === 'eact' || name === 'dh';
      const needTap = name === 'ts' || name === 'intermediate' || name === 'rds';
      const pts = levels.map((l, i) => ({ x: X(i), y: Y(l.E) }));
      // guide lines to brackets
      if (needBr) {
        brs.forEach((b, k) => {
          const bx = bracketX(b);
          [b.from, b.to].forEach((li) => svg.append(svgEl('line', { x1: X(li) + (bx > X(li) ? 14 : -14), x2: bx, y1: Y(levels[li].E), y2: Y(levels[li].E), class: 'ed-guide' })));
        });
      }
      // platforms and curve
      levels.forEach((l, i) => svg.append(svgEl('line', { x1: X(i) - 18, x2: X(i) + 18, y1: Y(l.E), y2: Y(l.E), class: 'ed-plat' + (revealed.has(i) ? ' ' + l.kind : '') })));
      if (ov) {
        const pts2 = ov.map((l, i) => ({ x: X(i), y: Y(l.E) }));
        ov.forEach((l, i) => svg.append(svgEl('line', { x1: X(i) - 18, x2: X(i) + 18, y1: Y(l.E), y2: Y(l.E), class: 'ed-plat alt' })));
        svg.append(svgEl('path', { d: pathD(pts2), class: 'ed-curve alt' }));
        ov.forEach((l, i) => { if (l.kind === 'TS' || l.kind === 'I') svg.append(svgEl('circle', { cx: X(i), cy: Y(l.E), r: 4.5, class: 'ed-dot alt' })); });
      }
      svg.append(svgEl('path', { d: pathD(pts), class: 'ed-curve' }));
      // markers + tags
      levels.forEach((l, i) => {
        const g = svgEl('g', { class: 'ed-mark' + (needTap ? ' tap' : '') + (revealed.has(i) ? ' rev ' + l.kind : '') });
        g.append(svgEl('circle', { cx: X(i), cy: Y(l.E), r: 5.5, class: 'ed-dot' }));
        const tag = letter(i) + (config.showValues ? ` · ${l.E}` : '');
        g.append(svgEl('text', { x: X(i), y: tagPos(l, i, l.E), class: 'ed-tag', 'text-anchor': 'middle' }, tag));
        if (revealed.has(i)) g.append(svgEl('text', { x: X(i), y: tagPos(l, i, l.E) + (l.kind === 'TS' ? -14 : 14), class: 'ed-kind', 'text-anchor': 'middle' }, KIND_NAME[l.kind]));
        if (mode === 'view' && config.notes && config.notes[i]) g.append(svgEl('text', { x: X(i), y: tagPos(l, i, l.E) + (l.kind === 'TS' ? -14 : 14) * (revealed.has(i) ? 2 : 1), class: 'ed-kind ed-noteword', 'text-anchor': 'middle' }, config.notes[i]));
        if (needTap && !done.has(ti)) {
          g.append(svgEl('circle', { cx: X(i), cy: Y(l.E), r: 26, class: 'ed-hit' }));
          g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
          g.setAttribute('aria-label', `Level ${letter(i)}${l.label ? ', ' + l.label : ''}`);
          const go = () => answerTap(i);
          g.addEventListener('click', go);
          g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        }
        svg.append(g);
      });
      // brackets
      if (needBr) {
        brs.forEach((b, k) => {
          const bx = bracketX(b);
          const y1 = Y(levels[b.from].E), y2 = Y(levels[b.to].E);
          const dir = y2 < y1 ? -1 : 1;
          const g = svgEl('g', { class: 'ed-br', tabindex: '0', role: 'button', 'aria-label': `Bracket ${k + 1}` });
          g.append(svgEl('line', { x1: bx, x2: bx, y1, y2, class: 'ed-brline' }));
          g.append(svgEl('polygon', { points: `${bx},${y2} ${bx - 4},${y2 - dir * 8} ${bx + 4},${y2 - dir * 8}`, class: 'ed-brhead' }));
          g.append(svgEl('polygon', { points: `${bx},${y1} ${bx - 4},${y1 + dir * 8} ${bx + 4},${y1 + dir * 8}`, class: 'ed-brhead' }));
          const my = (y1 + y2) / 2;
          g.append(svgEl('circle', { cx: bx + (b.side === 'right' ? 12 : -12), cy: my, r: 10, class: 'ed-brtag' }));
          g.append(svgEl('text', { x: bx + (b.side === 'right' ? 12 : -12), y: my + 0.5, class: 'ed-brnum', 'text-anchor': 'middle' }, String(k + 1)));
          { const hh = Math.max(Math.abs(y2 - y1), 56); g.append(svgEl('rect', { x: bx - 28, y: (y1 + y2) / 2 - hh / 2, width: 56, height: hh, class: 'ed-hit' })); }
          const go = () => answerBracket(b.id);
          g.addEventListener('click', go);
          g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
          svg.append(g);
        });
      }
    }
    function bracketX(b) {
      const x = X(b.of);
      return b.side === 'left' ? x - 26 : b.side === 'right' ? x + 26 : x + 40;
    }

    function drawLegend() {
      legend.innerHTML = '';
      if (ov) {
        legend.append(html('li', null, `<span class="ed-sw"></span> ${config.label || 'pathway 1'}`), html('li', null, `<span class="ed-sw alt"></span> ${config.overlay.label || 'pathway 2'}`));
        return;
      }
      levels.forEach((l, i) => { if (l.label) legend.append(html('li', null, `<b>${letter(i)}</b> ${l.label}`)); });
    }

    function setMsg(kind, text) { msg.className = 'ed-msg' + (kind ? ' ' + kind : ''); msg.textContent = text; }
    function advance() {
      done.add(ti);
      const spec = tasks[ti];
      const name = String(typeof spec === 'string' ? spec : spec.task).split(':')[0];
      if (name === 'ts') levels.forEach((l, i) => { if (l.kind === 'TS') revealed.add(i); });
      if (name === 'intermediate') levels.forEach((l, i) => { if (l.kind === 'I') revealed.add(i); });
      if (name === 'rds') { const r = steps(levels).reduce((a, s) => (levels[s.ts].E > levels[a.ts].E ? s : a)); revealed.add(r.ts); }
      ti++;
      busy = false;
      if (ti >= tasks.length) { taskBar.textContent = 'All tasks done.'; answers.innerHTML = ''; draw(); ctx.onResult({ ok: true }); return; }
      next();
    }
    function result(r) {
      if (busy) { say('Right. The next task starts in a moment.'); return; }
      note.hidden = true;
      if (r.ok) { busy = true; setMsg('ok', r.why); ctx.onProgress?.(); setTimeout(advance, reducedMotion() ? 0 : 1400); }   // time to read the reason: the next task clears it
      else { setMsg('', ''); ctx.onResult({ ok: false, diagnosis: r.diagnosis }); }   // the step's feedback box shows the diagnosis, once
    }
    const reducedMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    function spec() { const s = tasks[ti]; return typeof s === 'string' ? s : s.task; }
    function answerTap(i) { result(gradeTask(levels, spec(), i)); }
    function answerBracket(id) { result(gradeTask(levels, spec(), id)); }
    function answerChoice(v) { result(gradeTask(levels, spec(), v)); }

    function next() {
      const s = spec();
      const name = s.split(':')[0];
      taskBar.innerHTML = `<span class="ed-count">Task ${ti + 1} of ${tasks.length}</span> ${askFor(tasks[ti])}`;
      answers.innerHTML = '';
      // a new task starts clean: the last task's reason (it can give this answer away, e.g. "ΔH = ... = −40" before "is ΔH negative?") and its hints go
      if (ti > 0) { setMsg('', ''); ctx.onProgress?.({ task: true }); }
      const choice = (opts) => {
        const row = html('div', 'ed-choices');
        opts.forEach(([v, t]) => { const b = html('button', 'btn', t); b.type = 'button'; b.addEventListener('click', () => answerChoice(v)); row.append(b); });
        answers.append(row);
      };
      if (name === 'dhsign') choice([['neg', 'Negative: energy is released'], ['pos', 'Positive: energy is absorbed']]);
      else if (name === 'faster') choice(st.map((x) => [x.n, `Step ${x.n}`]));
      else if (name === 'nsteps') choice([1, 2, 3, 4].filter((n) => n <= 4).map((n) => [n, String(n)]));
      draw();
    }
    offTarget = () => {
      if (mode === 'view' || !tasks.length) return 'This diagram is for reading: there is nothing to tap here.';
      if (ti >= tasks.length) return 'All tasks done: press Continue below.';
      if (busy) return 'Right. The next task starts in a moment.';
      const name = spec().split(':')[0];
      if (name === 'eact' || name === 'dh') return 'Nothing to tap there. Tap one of the numbered brackets (1, 2, 3 …).';
      if (name === 'ts' || name === 'intermediate' || name === 'rds') return 'Nothing to tap there. Tap one of the dots on the curve (a hill top or a valley).';
      return 'Answer with the buttons under the diagram.';
    };
    drawLegend();
    if (mode === 'view' || !tasks.length) { taskBar.hidden = true; draw(); }
    else next();
    return { destroy() {} };
  }
};
