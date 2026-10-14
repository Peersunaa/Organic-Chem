// Widget: synthesis-planner (reusable). Build a molecule from a smaller one by ARRANGING REAGENT CARDS IN ORDER.
// The learner taps cards from the deck to add them to the plan (in order), moves them earlier or later, or removes them, then presses "Run the plan".
// The widget RUNS the plan on the engine (engine/synthesis.js -> engine/reactions-alkynes.js): each card is applied to the molecule in hand, the intermediates are shown,
// and only the FINAL product is compared with the target by canonical isomeric SMILES. Every wrong card or wrong order gets its own diagnosis
// ("a secondary halide won't work with an acetylide", "Lindlar gives the alkene, not a ketone", "make the acetylide first").
//
// config: { start: smiles, target: smiles, deck: [card ids of CARDS], intro?: html, directors?: bool }
// Lesson 14: `directors: true` runs the cards on rings that already carry groups (engine/synthesis.js applyDirectorCard): an ortho/para director gives an ortho + para PAIR (the
// book assumes the isomers can be separated), a meta director gives the meta product, and the plan reaches the target when the target is among the final products.
// ctx.onResult({ok:false, diagnosis}) after every wrong run, ctx.onResult({ok:true}) once the plan reaches the target.
import { svg as rdSvg } from '../chem.js';
import { CARDS, gradeSequence, solveSequences } from '../reactions.js';
import { nameBothAny } from '../naming-chain.js';
import { getIupac } from '../store.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fig = (smi, w = 150, hh = 100) => `<span class="sp-svg">${rdSvg(smi, { style: 'skeletal', width: w, height: hh, showCharge: true })}</span>`;
function nameHtml(smi) {
  const n = nameBothAny(smi);
  return n ? `<span class="iupac" data-name-new="${n.new}" data-name-old="${n.old}">${getIupac() === 'old' ? n.old : n.new}</span>` : '';
}

/** One correct plan for a puzzle (the shortest the solver finds), for tests and for the "show me" text. */
export function solutionPlan(config, maxLen = 4) {
  const all = solveSequences(config.start, config.target, config.deck, maxLen, { directors: !!config.directors });
  return all.length ? all.sort((a, b) => a.length - b.length)[0] : null;
}

export default {
  id: 'synthesis-planner',
  mount(host, config, ctx) {
    const plan = [];
    let finished = false;
    host.innerHTML = '';
    const root = h('div', 'sp');
    const ends = h('div', 'sp-ends');
    ends.innerHTML = `<figure class="sp-end">${fig(config.start)}<figcaption>Start: ${nameHtml(config.start)}</figcaption></figure>
      <span class="sp-go" aria-hidden="true">→ ? →</span>
      <figure class="sp-end">${fig(config.target)}<figcaption>Target: ${nameHtml(config.target)}</figcaption></figure>`;
    ends.setAttribute('role', 'group'); ends.setAttribute('aria-label', 'Start and target molecules');
    const planH = h('p', 'sp-h', '<b>Your plan</b>, first reagent at the top');
    const list = h('ol', 'sp-plan');
    const deckH = h('p', 'sp-h', '<b>Reagent cards</b> (tap to add to the end of the plan; a card can be used more than once)');
    const deck = h('div', 'sp-deck');
    deck.setAttribute('role', 'group'); deck.setAttribute('aria-label', 'Reagent cards');
    const act = h('div', 'lb-actions');
    const runB = h('button', 'btn primary'); runB.type = 'button'; runB.textContent = 'Run the plan';
    const clearB = h('button', 'btn ghost'); clearB.type = 'button'; clearB.textContent = 'Clear the plan';
    act.append(clearB, runB);
    const out = h('div', 'sp-out'); out.setAttribute('aria-live', 'polite');
    root.append(ends, planH, list, deckH, deck, act, out);
    host.append(root);

    (config.deck || []).forEach((id) => {
      const c = CARDS[id];
      const b = h('button', 'sp-card'); b.type = 'button'; b.dataset.card = id;
      b.textContent = c.label;
      b.setAttribute('aria-label', 'Add reagent card ' + c.label);
      b.addEventListener('click', () => { if (finished) return; plan.push(id); out.innerHTML = ''; paint(); });
      deck.append(b);
    });

    function paint() {
      list.innerHTML = '';
      if (!plan.length) list.append(h('li', 'sp-empty muted', 'Nothing yet. Tap a reagent card below.'));
      plan.forEach((id, i) => {
        const li = h('li', 'sp-item');
        li.append(h('span', 'sp-n', String(i + 1)), h('span', 'sp-lab', CARDS[id].label));
        const mk = (txt, label, fn, dis) => { const b = h('button', 'sp-mv'); b.type = 'button'; b.textContent = txt; b.setAttribute('aria-label', label); b.disabled = !!dis || finished; b.addEventListener('click', fn); return b; };
        li.append(
          mk('↑', `Move ${CARDS[id].label} earlier`, () => { [plan[i - 1], plan[i]] = [plan[i], plan[i - 1]]; out.innerHTML = ''; paint(); }, i === 0),
          mk('↓', `Move ${CARDS[id].label} later`, () => { [plan[i + 1], plan[i]] = [plan[i], plan[i + 1]]; out.innerHTML = ''; paint(); }, i === plan.length - 1),
          mk('✕', `Remove ${CARDS[id].label}`, () => { plan.splice(i, 1); out.innerHTML = ''; paint(); }));
        list.append(li);
      });
      runB.disabled = finished; clearB.disabled = finished;
    }

    function show(run, g) {
      out.innerHTML = '';
      const ol = h('ol', 'sp-steps');
      run.steps.forEach((s, i) => {
        const li = h('li', 'sp-step' + (s.ok ? '' : ' bad'));
        const head = h('p', 'sp-sh', `<b>${i + 1}. ${CARDS[s.card].label}</b>`);
        li.append(head);
        if (s.ok) {
          if (s.state.pool && s.state.pool.length > 1) {
            li.append(h('div', 'sp-res sp-pool', s.state.pool.map((sm) => `<span class="sp-pm">${fig(sm, 130, 84)}<span class="sp-nm">${nameHtml(sm)}</span></span>`).join('<span class="sp-and">and</span>')));
            li.append(h('p', 'muted small', 'Two isomers form together. The book assumes they can be separated, so the next step can use either one.'));
          } else li.append(h('div', 'sp-res', `${fig(s.state.smiles, 140, 90)}<span class="sp-nm">${s.state.kind === 'acetylide' ? 'the acetylide anion' : nameHtml(s.state.smiles)}</span>`));
          li.append(h('p', 'muted small sp-note', s.note));
        } else li.append(h('p', 'sp-diag', s.diag));
        ol.append(li);
      });
      out.append(ol);
      const v = h('p', 'sp-verdict ' + (g.ok ? 'ok' : 'bad'));
      v.textContent = g.ok ? (g.wasted ? 'The plan reaches the target (one step was wasted: an acid just undid the acetylide).' : 'The plan reaches the target.') : g.code === 'step' ? 'The plan stops at the step above.' : g.diagnosis;
      out.append(v);
    }

    runB.addEventListener('click', () => {
      if (finished) return;
      const g = gradeSequence(config.start, config.target, plan, { directors: !!config.directors });
      if (g.run) show(g.run, g); else { out.innerHTML = ''; out.append(h('p', 'sp-verdict bad', g.diagnosis)); }
      if (g.ok) { finished = true; paint(); ctx.onResult({ ok: true }); } else ctx.onResult({ ok: false, diagnosis: g.diagnosis });
    });
    clearB.addEventListener('click', () => { if (finished) return; plan.length = 0; out.innerHTML = ''; paint(); });
    paint();
    return { destroy() {} };
  }
};
