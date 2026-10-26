// Widget: mechanism-player. Plays a mechanism stored as DATA, one ARROW at a time (see mechanism-core.js for the data shape).
//
// config: { mech, mode?: 'draw' | 'watch', modes?: ['draw'|'watch', ...] (one per step, overrides mode), drawing?: 'auto' | 'full' | 'skeletal', whatIf?: false }
// whatIf:false (Lesson 08) hides the what-if row, so the first mechanism of the course does not jump to Br2 or hydration (Lesson 10 / 09 words).
// endLabel:false (Lesson 08) leaves out the step's label line under "What happened" at the end of a step: the lesson's own closing line follows, so the outcome is
//   said once, not three times (novice re-test 2026-10-20, N5); the "Mechanism complete." line is left out too (novice re-test 3).
// A tap on a playback picture says what moves it (Next / Back): every tap acts or explains.
//
// watch step: press-to-advance. Each press of Next moves exactly ONE arrow: the curve is drawn, two electron dots travel along it, the bond or lone pair it breaks
//             fades out and the one it makes fades in, then the picture HOLDS with a "why" line under it (the arrow's `why`, else the step's label). When every arrow of
//             a step has played, the structure is the step's `after` state; the next press starts the next step. Back undoes one arrow at once (the earlier state is
//             recomputed from the step's `before` and the first n-1 arrows, no animation). Auto plays arrow by arrow with the same hold (slow 2.4 s, normal 1.4 s).
// draw step : the learner draws the arrows with arrow-draw (same grading and diagnoses as Lesson 03). When they are right, the same one-arrow-at-a-time playback
//             reveals the step (Back / Next / Auto); at the end of the step the same Next button reads "Next step" and moves on (one control, never two).
// After three wrong checks on a step a "Show me this step" button turns it into the same playback.
// Under prefers-reduced-motion nothing travels: a press swaps the state at once; the why lines still show.
// What-if (Piece 2): on the final state of a mechanism that engine/whatif.js knows (alkene + HX / Br2 / hydration, alkyne + HX, EAS) a "What if it were ..." row offers the other
//   reagents that have a mechanism in the course. A chip replays that mechanism in this same player from the start (watch mode) and ends with both products side by side, each with the three
//   facts of its hub card; "Back to the lesson's reaction" returns to the lesson's own final state. The lesson's onResult is never called for an alternative.
// Caveman (Piece 3): the why line goes through voice.tAuto (the arrow's `cavemanWhy` if it has one, else the rule-based squeeze) and repaints when the header switch flips.
// The outer ctx.onResult({ok:false, diagnosis}) fires on every wrong check; ctx.onResult({ok:true}) fires once, when the LAST arrow of the LAST step has played.
import arrowDraw from './arrow-draw.js';
import { stepConfig, buildScene, changeSentence, autoStyle, partialState, whyOf } from './mechanism-core.js';
import { svg as rdSvg } from '../chem.js';
import { whatIfFor } from '../whatif.js';
import { chipRow, comparePanel } from './whatif-view.js';
import { tAuto, onVoiceChange } from '../voice.js';
import { annotateLine } from '../glossary.js';

const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const HOLD = { slow: 2400, normal: 1400 };   // ms the picture stays before Auto presses Next for you

export default {
  id: 'mechanism-player',
  mount(host, config, ctx) {
    const lessonMech = config.mech;   // read once: some lessons build it in a getter
    let mech = lessonMech;
    let N = mech.steps.length;
    let alt = null;                   // the what-if alternative being played (an option from whatIfFor), or null for the lesson's own mechanism
    let info = null;                  // whatIfFor(config.mech), found once at the first final state
    let infoDone = false;
    const modeOf = (k) => (alt ? 'watch' : (config.modes && config.modes[k]) || config.mode || 'draw');
    const whyText = (step, k) => tAuto(whyOf(step, k), step.arrows && step.arrows[k] && step.arrows[k].cavemanWhy);
    let n = 0, c = 0;                 // step index; arrows of that step already played
    let phase = 'play';               // 'draw' while the learner draws a step, 'play' for the arrow-by-arrow view
    let lead = '';                    // words in front of the prompt ("Correct. ")
    let wrongHere = 0, reported = false, inst = null, gen = 0, busy = false, auto = false, speed = 'normal', timer = null;
    host.innerHTML = '';
    const root = h('div', 'mp');
    const strip = h('ol', 'mp-strip');
    const prompt = h('p', 'mp-prompt');
    prompt.setAttribute('aria-live', 'polite');
    const stage = h('div', 'mp-stage');
    const why = h('p', 'mp-why');
    why.setAttribute('aria-live', 'polite');
    // the why line is one sentence at a time; the first occurrence of each glossary term in it is tappable (the lesson's attachGlossary handles the tap)
    let dropNotes = null;
    const setWhy = (text, tappable = true) => {
      if (dropNotes) { dropNotes(); dropNotes = null; }
      why.textContent = text;
      if (tappable) dropNotes = annotateLine(why);
    };
    const ctl = h('div', 'mp-ctl');
    const count = h('span', 'mp-count');
    const row = h('div', 'mp-ctlrow');
    const mkBtn = (cls, text) => { const b = h('button', cls); b.type = 'button'; b.textContent = text; return b; };
    const back = mkBtn('btn small ghost', 'Back');
    const nextB = mkBtn('btn small primary', 'Next');
    const autoB = mkBtn('btn small ghost mp-auto', 'Auto');
    autoB.setAttribute('aria-pressed', 'false');
    const spLab = h('label', 'mp-speed');
    const sel = h('select');
    sel.innerHTML = '<option value="slow">Slow</option><option value="normal" selected>Normal</option>';
    sel.setAttribute('aria-label', 'Auto speed');
    spLab.append(h('span', 'sr-only', 'Auto speed'), sel);
    row.append(back, nextB, autoB, spLab);
    ctl.append(count, row);
    const out = h('div', 'mp-out');
    const banner = h('div', 'mp-banner');       // "Now showing: <reagent> on the same alkene" + a chip back to the lesson's own reaction, only while a what-if alternative plays
    banner.hidden = true;
    root.append(banner, strip, prompt, stage, why, ctl, out);
    host.append(root);

    const len = () => mech.steps[n].arrows.length;
    const canNext = () => phase === 'play' && (c < len() || n < N - 1);
    const canBack = () => phase === 'play' && (c > 0 || (n > 0 && modeOf(n) !== 'draw'));

    const paintStrip = () => {
      strip.innerHTML = '';
      mech.steps.forEach((s, i) => {
        const done = i < n || (i === n && phase === 'play' && c === s.arrows.length);
        const li = h('li', 'mp-dot' + (done ? ' done' : i === n ? ' on' : ''), `Step ${i + 1}`);
        if (i === n && !done) li.setAttribute('aria-current', 'step');
        strip.append(li);
      });
    };

    // ---------------------------------------------------------------- scenes
    function figs(step) {
      const r = h('div', 'mp-figs');
      r.append(h('span', 'mp-figlab', 'As a normal structure:'));
      step.after.forEach((smi, i) => {
        if (i) r.append(h('span', 'mp-plus', '+'));
        const style = config.drawing && config.drawing !== 'auto' ? config.drawing : autoStyle(smi);
        const f = h('figure', 'mol mp-fig');
        f.append(h('div', 'mol-svg'));
        f.firstChild.innerHTML = rdSvg(smi, { style, width: 150, height: 110, showCharge: true });
        r.append(f);
      });
      return r;
    }
    // mid-step pictures keep every atom in place, so a bond an arrow has just made can be long: dashLong draws it dashed (forming), never as a real long bond
    const mountScene = (box, atoms, bonds, arrows, mid = false) => arrowDraw.mount(box, { atoms, bonds, arrows, preset: true, dashLong: mid, tapNote: 'This picture moves when you press Next below (Back goes one arrow back).' }, { onResult() {} });
    /** Over-full atoms (the H of H-Br while it is bonding to carbon, a Br with two bonds and three lone pairs ...) are in the middle of the step: no charge badge for them. */
    function hideMidCharges(box, st) {
      if (!st.mid || !st.mid.length) return;
      const svg = box.querySelector('svg');
      const badges = [...svg.children].filter((g) => g.classList.contains('lb-atom') && !g.classList.contains('ad-atom'));
      st.atoms.map((a, i) => (a.charge ? i : -1)).filter((i) => i >= 0).forEach((i, k) => { if (st.mid.includes(i) && badges[k]) badges[k].remove(); });
    }
    /** Bonds and lone pairs that the last arrow made fade in. */
    function markNew(box, prev, now) {
      const svg = box.querySelector('svg');
      const order = (st, a, b) => { const x = st.bonds.find((q) => (q.a === a && q.b === b) || (q.a === b && q.b === a)); return x ? x.order : 0; };
      now.bonds.forEach((b) => { if (b.order > order(prev, b.a, b.b)) svg.querySelector(`[data-bond="${b.a}-${b.b}"]`)?.classList.add('mp-new'); });
      now.lp.forEach((v, i) => { if (v > prev.lp[i]) svg.querySelectorAll(`[data-lp^="${i}-"]`).forEach((g) => g.classList.add('mp-new')); });
    }
    /** The bond or lone pair that the moving arrow breaks fades out while the electrons travel. */
    function markBreaking(box, st, ar) {
      const svg = box.querySelector('svg');
      if (!svg) return;
      if (ar.from.bond) {
        const [i, j] = ar.from.bond;
        const b = st.bonds.find((q) => (q.a === i && q.b === j) || (q.a === j && q.b === i));
        if (b && b.order === 1) svg.querySelector(`[data-bond="${b.a}-${b.b}"]`)?.classList.add('mp-breaking');
      } else if (ar.from.lp != null) {
        const groups = [...svg.querySelectorAll(`[data-lp^="${ar.from.lp}-"]`)];
        const d = (svg.querySelector('.ad-path')?.getAttribute('d') || '').match(/^M(-?[\d.]+) (-?[\d.]+)/);
        if (!groups.length) return;
        if (!d) { groups[0].classList.add('mp-breaking'); return; }
        const at = (g) => { const k = g.querySelector('circle'); return Math.hypot(Number(k.getAttribute('cx')) - Number(d[1]), Number(k.getAttribute('cy')) - Number(d[2])); };
        groups.sort((p, q) => at(p) - at(q))[0].classList.add('mp-breaking');
      }
    }
    /** The arrow that made the current picture, drawn faint on top of it (its geometry comes from the picture before the move). */
    function addGhost(box, step, k) {
      const svg = box.querySelector('svg');
      const st = partialState(step, k - 1);
      const tmp = h('div');
      mountScene(tmp, st.atoms, st.bonds, [step.arrows[k - 1]], true);
      const g = tmp.querySelector('.ad-arrow');
      if (!g || !svg) return;
      const gh = g.cloneNode(true);
      gh.setAttribute('class', 'ad-arrow mp-ghost');
      svg.append(gh);
    }

    /** Show the picture after k arrows of the current step. `from` = the state before the arrow that just moved (so new bonds can fade in). */
    function showState(k, from) {
      const step = mech.steps[n];
      c = k;
      stage.innerHTML = '';
      out.innerHTML = '';
      const box = h('div', 'mp-scene');
      stage.append(box);
      if (k >= step.arrows.length) {
        // the structures that come out of the step, laid out exactly as the next step starts (or the products after the last step)
        const nxt = mech.steps[n + 1];
        const sc = buildScene(nxt ? { before: nxt.before, layout: nxt.layout } : { before: step.after });
        if (!reduceMotion() && from) box.classList.add('mp-fade');
        mountScene(box, sc.atoms, sc.bonds, []);
        out.append(h('p', 'mp-changes', `<b>What happened.</b> ${changeSentence(step)}.`));
        if (config.endLabel !== false && step.label !== whyOf(step, step.arrows.length - 1)) out.append(h('p', 'mp-label', step.label));   // no second copy of the same sentence
        out.append(figs(step));
        wiSlot = null;
        if (n === N - 1 && config.whatIf !== false) { wiSlot = h('div', 'mp-wi'); out.append(wiSlot); paintWhatIf(); }
      } else {
        const st = partialState(step, k);
        mountScene(box, st.atoms, st.bonds, [], k > 0);
        hideMidCharges(box, st);
        if (k > 0) {
          addGhost(box, step, k);
          if (from && !reduceMotion()) markNew(box, from, st);
        }
      }
      chrome();
    }

    // ---------------------------------------------------------------- what-if
    let wiSlot = null;
    /** The what-if row (or, while an alternative is shown, the side-by-side) under the final state of the last step. Nothing at all when the mechanism has no alternatives. */
    function paintWhatIf() {
      if (!wiSlot) return;
      wiSlot.innerHTML = '';
      if (!infoDone) { infoDone = true; try { info = whatIfFor(lessonMech); } catch (e) { info = null; } }
      if (!info) return;
      if (alt) wiSlot.append(comparePanel(info, alt));
      wiSlot.append(chipRow(info, alt, { onPick: startAlt, onBack: backToLesson }));
    }
    /** The lesson's own heading, "Try it" label and green summary live outside the player (in the step card). While an alternative plays they describe the OTHER reaction, so they are hidden and put back afterwards. */
    let hiddenOuter = [];
    function hideOuter() {
      const par = host.parentElement;
      if (!par || hiddenOuter.length) return;
      hiddenOuter = [...par.querySelectorAll(':scope > .prompt, :scope > .eyebrow, :scope > .fb, :scope > .hints')].map((e) => [e, e.style.display]);
      hiddenOuter.forEach(([e]) => { e.style.display = 'none'; });
    }
    function showOuter() { hiddenOuter.forEach(([e, d]) => { e.style.display = d; }); hiddenOuter = []; }
    const SAME = { 'alkene-hx': 'alkene', 'alkene-x2': 'alkene', 'alkene-hydration': 'alkene', 'alkyne-hx': 'alkyne', acetylide: 'alkyne', eas: 'benzene ring' };
    function paintBanner() {
      banner.innerHTML = '';
      banner.hidden = !alt;
      if (!alt) return;
      const b = mkBtn('btn small mp-banner-back', 'Back to the lesson’s reaction');
      b.addEventListener('click', backToLesson);
      banner.append(h('span', 'mp-banner-txt', `Now showing: <b>${alt.label}</b> on the same ${SAME[alt.kind] || 'molecule'}`), b);
      // the halogen's bridged ion and anti addition are the subject of Lesson 10: say so, with a link, instead of leaving two new words unexplained here
      if (alt.kind === 'alkene-x2') {
        const note = h('p', 'mp-banner-note');
        note.innerHTML = 'A <b>bromonium ion</b> is a three-membered ring with a positive Br; <b>anti</b> means the two Br end up on opposite faces. Lesson 10 explains both: <a href="#lesson-10/s01">see Lesson 10, step 1</a>.';
        banner.append(note);
      }
    }
    function startAlt(option) {
      stopAuto();
      alt = option; mech = option.mech; N = mech.steps.length;
      n = 0; c = 0; wrongHere = 0; lead = ''; phase = 'play';
      // replace everything the previous reaction left on screen: the lesson's heading and summary, this player's sentences and the old species block
      hideOuter(); paintBanner();
      stage.innerHTML = ''; out.innerHTML = ''; wiSlot = null; prompt.textContent = ''; setWhy('', false);
      renderStep();
      banner.scrollIntoView && banner.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
    function backToLesson() {
      stopAuto();
      alt = null; mech = lessonMech; N = mech.steps.length;
      n = N - 1; phase = 'play'; lead = '';
      showOuter(); paintBanner();
      showState(mech.steps[n].arrows.length, null);
    }

    /** Words, counter and buttons that go with the current position. */
    function chrome() {
      paintStrip();
      const play = phase === 'play';
      ctl.hidden = !play; why.hidden = !play;
      if (!play) return;
      const step = mech.steps[n], L = step.arrows.length;
      const k = busy ? c + 1 : c;                // the arrow on screen (while one is moving it is the next one)
      count.textContent = k === 0 ? `${L} arrow${L > 1 ? 's' : ''} in this step` : `Arrow ${k} of ${L}`;
      why.classList.toggle('mp-why-idle', k === 0);
      if (!busy) { if (k === 0) setWhy('Press Next to move the first electron pair.', false); else setWhy(whyText(step, k - 1)); }
      prompt.textContent = `Step ${n + 1} of ${N}: ${lead}` + (k === 0 ? (modeOf(n) === 'draw' ? 'Press Next to watch each electron pair move.' : 'Press Next to watch the electrons move, one arrow at a time.')
        : k < L ? 'Press Next for the next arrow.' : n < N - 1 ? (modeOf(n + 1) === 'draw' ? 'That is the whole step. Press Next step to draw the next one.' : 'That is the whole step. Press Next step to start the next one.') : 'That is the whole mechanism.');
      back.disabled = busy || !canBack();
      nextB.disabled = busy || !canNext();
      nextB.textContent = c >= L && canNext() ? 'Next step' : 'Next';
      autoB.disabled = !auto && !canNext();
      autoB.setAttribute('aria-pressed', auto ? 'true' : 'false');
      autoB.textContent = auto ? 'Auto: on' : 'Auto';
      if (!busy && (nextB.disabled && document.activeElement === nextB) && !back.disabled) back.focus({ preventScroll: true });
    }

    // ---------------------------------------------------------------- moving
    /** Animate arrow j of the current step (the picture before it, the arrow, the travelling electrons), then hold the picture after it. */
    async function playArrow(j) {
      const step = mech.steps[n];
      const token = ++gen;
      const prev = partialState(step, j);
      if (reduceMotion()) { showState(j + 1, prev); } else {
        busy = true;
        stage.innerHTML = ''; out.innerHTML = '';
        const box = h('div', 'mp-scene');
        stage.append(box);
        const a = mountScene(box, prev.atoms, prev.bonds, [step.arrows[j]], j > 0);
        hideMidCharges(box, prev);
        setWhy(whyText(step, j));
        chrome();
        const t = setTimeout(() => markBreaking(box, prev, step.arrows[j]), 900);
        await a.play();
        clearTimeout(t);
        if (token !== gen) return;
        busy = false;
        showState(j + 1, prev);
      }
      if (n === N - 1 && c === step.arrows.length && !reported && !alt) { reported = true; prompt.textContent = config.endLabel === false ? '' : 'Mechanism complete.'; ctx.onResult({ ok: true }); }   // in a lesson (endLabel:false) "What happened" and the lesson's closing line say it: once
    }

    async function doNext() {
      if (busy || !canNext()) return;
      if (c >= len()) {                       // the step is complete: start the next one (a watch step moves its first arrow at once)
        n++; c = 0; wrongHere = 0; lead = '';
        if (modeOf(n) === 'draw') { stopAuto(); renderStep(); return; }
      }
      await playArrow(c);
    }
    function doBack() {
      if (busy || !canBack()) return;
      if (c > 0) showState(c - 1, null);
      else { n--; showState(mech.steps[n].arrows.length - 1, null); }
    }

    // ---------------------------------------------------------------- auto
    function stopAuto() { auto = false; clearTimeout(timer); timer = null; if (phase === 'play') chrome(); }
    async function tick() {
      if (!auto || busy) return;
      if (!canNext()) { stopAuto(); return; }
      await doNext();
      if (!auto) return;
      if (!canNext()) { stopAuto(); return; }
      timer = setTimeout(tick, HOLD[speed]);
    }
    back.addEventListener('click', () => { stopAuto(); doBack(); });
    nextB.addEventListener('click', () => { stopAuto(); doNext(); });
    autoB.addEventListener('click', () => { if (auto) { stopAuto(); return; } if (!canNext() || busy) return; auto = true; chrome(); tick(); });
    sel.addEventListener('change', () => { speed = sel.value; });

    // ---------------------------------------------------------------- drawing
    /** The lesson's grader keeps the last wrong-answer message and hints under the widget; a correct step clears them. */
    function clearFeedback() {
      const par = host.parentElement;
      if (!par) return;
      par.querySelectorAll(':scope > .fb, :scope > .hints').forEach((e) => { if (e.classList.contains('fb')) e.className = 'fb'; e.textContent = ''; });
    }

    function renderStep() {
      const step = mech.steps[n];
      const token = ++gen;
      busy = false; c = 0;
      stage.innerHTML = ''; out.innerHTML = '';
      if (modeOf(n) === 'watch') { phase = 'play'; showState(0, null); return; }
      phase = 'draw';
      chrome();
      prompt.textContent = `Step ${n + 1} of ${N}: draw the curved arrows. Tap the electrons an arrow starts from, then the atom that receives them.`;
      const box = h('div', 'mp-scene');
      stage.append(box);
      const cfg = stepConfig(step);
      inst = arrowDraw.mount(box, { atoms: cfg.atoms, bonds: cfg.bonds, arrows: step.arrows, products: step.after, extraHint: config.extraHint, regio: cfg.regio, equiv: cfg.equiv }, {
        onProgress(o) { if (token === gen) ctx.onProgress?.(o); },   // an arrow was added: the step's stale wrong-answer box goes
        onResult(r) {
          if (token !== gen) return;
          if (r.ok) { wrongHere = 0; clearFeedback(); phase = 'play'; lead = 'Correct. '; showState(0, null); return; }
          if (r.code !== 'start') wrongHere++;
          ctx.onResult(r);
          if (wrongHere >= 3 && !out.querySelector('.mp-show')) {
            const b = h('button', 'btn ghost mp-show'); b.type = 'button'; b.textContent = 'Show me this step';
            b.addEventListener('click', () => { gen++; phase = 'play'; lead = ''; showState(0, null); });
            out.append(b);
          }
        }
      });
    }
    renderStep();
    // the header's Caveman switch: repaint the why line and the facts without losing the place
    const offVoice = onVoiceChange(() => {
      if (!host.isConnected) { offVoice(); return; }
      if (phase === 'play' && !busy) chrome();
      if (wiSlot && n === N - 1 && c >= mech.steps[n].arrows.length) paintWhatIf();
    });
    return { destroy() { gen++; clearTimeout(timer); auto = false; offVoice(); } };
  }
};
