// Widget: cleave-it (reusable). KMnO4 in neutral or acidic solution CUTS the C=C (McMurry 4.6).
//   1. The learner taps the bond that is cut (the C=C; a single bond is a wrong tap with a specific reason).
//   2. The two ends of the cut are marked A and B. For each end the learner says what it becomes: ketone, carboxylic acid, CO₂ or aldehyde.
//   3. The products are drawn (computed by engine/reactions-additions.js, never typed).
// config: { alkene: smiles, mode?: 'acid' (default) }
// ctx.onResult({ok:false, diagnosis}) on every wrong tap or wrong choice; ctx.onResult({ok:true}) when both ends are right.
import { svgPick, svg as rdSvg, analyze } from '../chem.js';
import { cleavageEnds, END_KIND } from '../reactions-additions.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// ---------------------------------------------------------------- pure logic (also used by the tests and the mastery generator)
/** The cut: the bond [i, j] (atom numbers of the SMILES) between the two C=C carbons. */
export function cutBond(alkene) {
  const { info } = cleavageEnds(alkene);
  return [info.c1, info.c2];
}
/** Grade a tap on bond [i, j]: {ok} or {ok:false, diagnosis}. */
export function gradeCut(alkene, i, j) {
  const mol = analyze(alkene);
  const b = mol.bonds.find((x) => (x.atoms[0] === i && x.atoms[1] === j) || (x.atoms[0] === j && x.atoms[1] === i));
  if (!b) return { ok: false, diagnosis: 'That is not a bond.' };
  if ((b.bo ?? 1) === 2) return { ok: true };
  return { ok: false, diagnosis: 'That is a single (σ) C–C bond. KMnO₄ attacks the electron-rich π bond of the C=C and, in acid, cuts the whole double bond. Tap the double bond.' };
}
const HTXT = (n) => (n === 0 ? 'no H' : n === 1 ? 'one H' : 'two H');
/** The ends of the cut: [{atom, nH, kind: 'ketone'|'acid'|'co2', desc}] */
export function ends(alkene) {
  const { ends: e } = cleavageEnds(alkene);
  return e.map((x) => ({ ...x, desc: `the carbon with ${HTXT(x.nH)}` }));
}
export const END_OPTIONS = [
  { id: 'ketone', label: 'a ketone (C=O between two carbons)' },
  { id: 'acid', label: 'a carboxylic acid (–CO₂H)' },
  { id: 'co2', label: 'carbon dioxide (CO₂)' },
  { id: 'aldehyde', label: 'an aldehyde (–CHO)' }
];
const WHY = {
  ketone: {
    acid: 'An acid needs an H on that carbon to turn into C–OH. This end has no H (it holds two carbon groups), so it stops at the ketone.',
    co2: 'CO₂ comes from a =CH₂ end, which has nothing but H to lose. This end holds two carbon groups and keeps them.',
    aldehyde: 'An aldehyde has an H on the C=O carbon. This carbon has none, because it holds two carbon groups: the product is a ketone.'
  },
  acid: {
    ketone: 'A ketone needs two carbon groups on the C=O. This end has one carbon group and one H; the H becomes OH, so the product is a carboxylic acid.',
    co2: 'CO₂ comes from a =CH₂ end. This end still has a carbon group, so it stays attached and becomes –CO₂H.',
    aldehyde: 'An aldehyde (R–CHO) is the first oxidation product, but KMnO₄ oxidises it further: the C–H becomes C–OH and the product is the carboxylic acid.'
  },
  co2: {
    ketone: 'A ketone needs two carbon groups on the C=O. A =CH₂ end has none, only two H.',
    acid: 'A carboxylic acid needs a carbon group on the carbon. A =CH₂ end has none, so it is oxidised all the way to CO₂.',
    aldehyde: 'Formaldehyde (H₂C=O) would still be oxidised by KMnO₄. The =CH₂ end ends up as CO₂ (carbon dioxide).'
  }
};
/** Grade the choice for an end: {ok} or {ok:false, diagnosis}. */
export function gradeEnd(end, choice) {
  if (choice === end.kind) return { ok: true };
  return { ok: false, diagnosis: (WHY[end.kind] && WHY[end.kind][choice]) || 'Count the H on that carbon: none gives a ketone, one gives a carboxylic acid, two gives CO₂.' };
}
/** The one-line result for an end. */
export function endResult(end) {
  return end.kind === 'ketone' ? 'No H on the carbon: it becomes a ketone.' : end.kind === 'acid' ? 'One H on the carbon: it becomes a carboxylic acid.' : 'Two H on the carbon (=CH₂): it becomes CO₂.';
}
void END_KIND;

// ---------------------------------------------------------------- the widget
export default {
  id: 'cleave-it',
  mount(host, config, ctx) {
    const alkene = config.alkene;
    const E = ends(alkene);
    const [cutA, cutB] = cutBond(alkene);
    host.innerHTML = '';
    const root = h('div', 'cl');
    host.append(root);
    const pick = svgPick(alkene, { width: 300, height: 200 });
    const stage = h('div', 'gf-stage cl-stage');
    stage.innerHTML = pick.svg;
    stage.querySelector('svg')?.setAttribute('role', 'img');
    stage.querySelector('svg')?.setAttribute('aria-label', 'Skeletal structure of the alkene. Tap the bond that KMnO4 cuts.');
    const ask = h('p', 'cl-ask', 'KMnO₄ in acid <b>cuts the C=C</b>. Tap the bond that is cut.');
    const msg = h('p', 'muted small gf-msg'); msg.setAttribute('aria-live', 'polite');
    const q = h('div', 'cl-q');
    root.append(ask, stage, msg, q);
    const mol = analyze(alkene);
    let cut = false, done = 0, finished = false;
    const btns = mol.bonds.map((b) => {
      const [i, j] = b.atoms;
      const p = { x: (pick.pts[i].x + pick.pts[j].x) / 2, y: (pick.pts[i].y + pick.pts[j].y) / 2 };
      const btn = h('button', 'gf-atom cl-bond'); btn.type = 'button';
      btn.style.left = p.x + '%'; btn.style.top = p.y + '%';
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', `${(b.bo ?? 1) === 2 ? 'Double' : 'Single'} bond between atom ${i + 1} and atom ${j + 1}`);
      btn.addEventListener('click', () => {
        if (cut) return;
        const r = gradeCut(alkene, i, j);
        btns.forEach((x) => x.classList.remove('bad'));
        if (!r.ok) { btn.classList.add('bad'); msg.textContent = r.diagnosis; ctx.onResult({ ok: false, diagnosis: r.diagnosis }); return; }
        cut = true;
        btn.setAttribute('aria-pressed', 'true'); btn.classList.add('lock');
        btns.forEach((x) => { x.disabled = true; });
        msg.textContent = 'Cut. The two carbons of the old C=C are now the ends A and B. What does each end become?';
        ask.innerHTML = 'The C=C is cut. Say what <b>each end</b> becomes.';
        markEnds();
        askEnds();
      });
      stage.append(btn);
      return btn;
    });
    function markEnds() {
      E.forEach((e, n) => {
        const p = pick.pts[e.atom];
        const tag = h('span', 'cl-end', 'AB'[n]);
        tag.style.left = p.x + '%'; tag.style.top = p.y + '%';
        stage.append(tag);
      });
    }
    function askEnds() {
      E.forEach((e, n) => {
        const card = h('div', 'cl-card');
        card.append(h('p', 'cl-cq', `<b>End ${'AB'[n]}</b>: ${e.desc}. It becomes…`));
        const row = h('div', 'cl-opts');
        const fb = h('p', 'cl-fb muted small'); fb.setAttribute('aria-live', 'polite');
        END_OPTIONS.forEach((o) => {
          const b = h('button', 'btn small cl-opt'); b.type = 'button'; b.textContent = o.label;
          b.addEventListener('click', () => {
            const r = gradeEnd(e, o.id);
            if (!r.ok) { b.classList.add('bad'); b.disabled = true; fb.className = 'cl-fb fb bad'; fb.textContent = r.diagnosis; ctx.onResult({ ok: false, diagnosis: r.diagnosis }); return; }
            [...row.children].forEach((x) => { x.disabled = true; });
            b.classList.add('good');
            fb.className = 'cl-fb fb ok'; fb.textContent = endResult(e);
            done++;
            if (done === E.length && !finished) { finished = true; showProducts(); ctx.onResult({ ok: true }); }
            else if (ctx.onProgress) ctx.onProgress();
          });
          row.append(b);
        });
        card.append(row, fb);
        q.append(card);
      });
    }
    function showProducts() {
      const { products } = cleavageEnds(alkene);
      const box = h('div', 'cl-prod');
      box.append(h('p', 'rl-h', `<b>Product${products.length > 1 ? 's' : ''}</b>`));
      const row = h('div', 'rl-prow');
      products.forEach((s, i) => { if (i) row.append(h('span', 'rl-plus', '+')); row.append(h('figure', 'mol', `<span class="rl-svg">${rdSvg(s, { style: 'skeletal', width: 150, height: 108 })}</span>`)); });
      box.append(row);
      q.append(box);
    }
    return { destroy() {} };
  }
};
