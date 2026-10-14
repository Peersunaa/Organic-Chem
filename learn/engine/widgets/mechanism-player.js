// Widget: mechanism-player. Plays a mechanism stored as DATA, one step at a time (see mechanism-core.js for the data shape).
//
// config: { mech, mode?: 'draw' | 'watch', modes?: ['draw'|'watch', ...] (one per step, overrides mode), drawing?: 'auto' | 'full' | 'skeletal' }
//
// draw step : the learner draws the arrows with arrow-draw (same grading and diagnoses as Lesson 03). When they are right, the arrows
//             animate (two electron dots travel along each curve, nothing moves under prefers-reduced-motion), the structure changes
//             to the next state (new bonds, charges, lone pairs), and the step's change summary and the species are shown.
// watch step: the arrows are shown; the learner presses Play and watches the same animation (for steps already learned).
// After three wrong checks on a step a "Show me this step" button turns it into a watch step.
// The outer ctx.onResult({ok:false, diagnosis}) fires on every wrong check; ctx.onResult({ok:true}) fires once, after the LAST step.
import arrowDraw from './arrow-draw.js';
import { stepConfig, buildScene, changeSentence, autoStyle } from './mechanism-core.js';
import { svg as rdSvg } from '../chem.js';

const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export default {
  id: 'mechanism-player',
  mount(host, config, ctx) {
    const mech = config.mech;
    const N = mech.steps.length;
    const modeOf = (n) => (config.modes && config.modes[n]) || config.mode || 'draw';
    let n = 0, wrongHere = 0, finished = false, inst = null, gen = 0;
    host.innerHTML = '';
    const root = h('div', 'mp');
    const strip = h('ol', 'mp-strip');
    const prompt = h('p', 'mp-prompt');
    prompt.setAttribute('aria-live', 'polite');
    const stage = h('div', 'mp-stage');
    const out = h('div', 'mp-out');
    root.append(strip, prompt, stage, out);
    host.append(root);

    const paintStrip = () => {
      strip.innerHTML = '';
      mech.steps.forEach((s, i) => {
        const li = h('li', 'mp-dot' + (i < n || (finished && i === n) ? ' done' : i === n ? ' on' : ''), `Step ${i + 1}`);
        if (i === n && !finished) li.setAttribute('aria-current', 'step');
        strip.append(li);
      });
    };

    function figs(step) {
      const row = h('div', 'mp-figs');
      row.append(h('span', 'mp-figlab', 'As a normal structure:'));
      step.after.forEach((smi, i) => {
        if (i) row.append(h('span', 'mp-plus', '+'));
        const style = config.drawing && config.drawing !== 'auto' ? config.drawing : autoStyle(smi);
        const f = h('figure', 'mol mp-fig');
        f.append(h('div', 'mol-svg'));
        f.firstChild.innerHTML = rdSvg(smi, { style, width: 150, height: 110, showCharge: true });
        row.append(f);
      });
      return row;
    }

    function showAfter(step, token) {
      if (token !== gen) return;
      // the structures that come out of the step, laid out exactly as the next step starts (or the products after the last step)
      const nxt = mech.steps[n + 1];
      const sc = buildScene(nxt ? { before: nxt.before, layout: nxt.layout } : { before: step.after });
      stage.innerHTML = '';
      const box = h('div', 'mp-scene' + (reduceMotion() ? '' : ' mp-fade'));
      stage.append(box);
      arrowDraw.mount(box, { atoms: sc.atoms, bonds: sc.bonds, arrows: [], preset: true }, { onResult() {} });
      out.innerHTML = '';
      out.append(h('p', 'mp-changes', `<b>What happened.</b> ${changeSentence(step)}.`), h('p', 'mp-label', step.label), figs(step));
      const row = h('div', 'mp-actions');
      const again = h('button', 'btn ghost'); again.type = 'button'; again.textContent = 'Replay';
      again.addEventListener('click', () => playStep(step, true));
      row.append(again);
      const last = n === N - 1;
      const next = h('button', 'btn primary'); next.type = 'button'; next.textContent = last ? 'Finish mechanism' : 'Next step';
      next.addEventListener('click', () => {
        if (last) { finished = true; paintStrip(); next.disabled = true; again.disabled = true; prompt.textContent = 'Mechanism complete.'; ctx.onResult({ ok: true }); return; }
        n++; wrongHere = 0; renderStep();
      });
      row.append(next);
      out.append(row);
      next.focus({ preventScroll: true });
    }

    /** Show the step's own arrows on its starting scene and animate them, then the result. */
    function playStep(step, replay) {
      const token = ++gen;
      stage.innerHTML = '';
      out.innerHTML = '';
      const box = h('div', 'mp-scene');
      stage.append(box);
      const cfg = stepConfig(step);
      const a = arrowDraw.mount(box, { atoms: cfg.atoms, bonds: cfg.bonds, arrows: step.arrows, preset: true }, { onResult() {} });
      prompt.textContent = `Step ${n + 1} of ${N}: the electrons move.`;
      a.play().then(() => showAfter(step, token));
    }

    /** The lesson's grader keeps the last wrong-answer message and hints under the widget; a correct step clears them. */
    function clearFeedback() {
      const par = host.parentElement;
      if (!par) return;
      par.querySelectorAll(':scope > .fb, :scope > .hints').forEach((e) => { if (e.classList.contains('fb')) e.className = 'fb'; e.textContent = ''; });
    }

    function renderStep() {
      const step = mech.steps[n];
      const token = ++gen;
      finished = false;
      paintStrip();
      stage.innerHTML = ''; out.innerHTML = '';
      const mode = modeOf(n);
      const box = h('div', 'mp-scene');
      stage.append(box);
      const cfg = stepConfig(step);
      if (mode === 'watch') {
        prompt.textContent = `Step ${n + 1} of ${N}: watch the electrons move.`;
        inst = arrowDraw.mount(box, { atoms: cfg.atoms, bonds: cfg.bonds, arrows: step.arrows, preset: true }, { onResult() {} });
        const row = h('div', 'mp-actions');
        const play = h('button', 'btn primary'); play.type = 'button'; play.textContent = 'Play the electron flow';
        play.addEventListener('click', () => { play.disabled = true; inst.play().then(() => showAfter(step, token)); });
        row.append(play);
        out.append(row);
        return;
      }
      prompt.textContent = `Step ${n + 1} of ${N}: draw the curved arrows. Tap the electrons an arrow starts from, then the atom that receives them.`;
      inst = arrowDraw.mount(box, { atoms: cfg.atoms, bonds: cfg.bonds, arrows: step.arrows, products: step.after, extraHint: config.extraHint, regio: cfg.regio, equiv: cfg.equiv }, {
        onResult(r) {
          if (token !== gen) return;
          if (r.ok) { wrongHere = 0; clearFeedback(); prompt.textContent = `Step ${n + 1} of ${N}: correct. Watch the electrons move.`; inst.play().then(() => showAfter(step, token)); return; }
          if (r.code !== 'start') wrongHere++;
          ctx.onResult(r);
          if (wrongHere >= 3 && !out.querySelector('.mp-show')) {
            const b = h('button', 'btn ghost mp-show'); b.type = 'button'; b.textContent = 'Show me this step';
            b.addEventListener('click', () => playStep(step, false));
            out.append(b);
          }
        }
      });
    }
    renderStep();
    return { destroy() { gen++; } };
  }
};
