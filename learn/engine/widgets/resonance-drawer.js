// Widget: resonance-drawer (Lesson 11). Shows a structure; the learner draws curved arrows (arrow-draw) to make the NEXT resonance form.
// A valid new form is added to a row of forms joined by double-headed arrows (↔), and the learner keeps going until every form is found
// ("2 of 3 found"). Then the resonance HYBRID is shown: bonds that are double in some forms and single in others are half dashed, and a charge
// that sits on different atoms in different forms is shown as a shared δ+ or δ−.
//
// config: { start: smiles   (Kekule drawing, atoms in the order that matters),
//           fold?: bool     (count the two Kekule drawings of a ring once: the benzyl cation has 4 forms, not 5),
//           need?: n        (forms to find besides the start; default all. Mastery problems use 1: "draw the next form"),
//           name?: string,  (label shown in the counter, e.g. "allyl cation"),
//           hybrid?: bool   (show the hybrid when finished, default true),
//           ringOnly?: bool (Lesson 14: for a carbocation of a ring, count only the forms that move RING electrons; the group's own resonance, such as the two drawings of NO2, is not asked for),
//           find?: {ask, right}  (Lesson 14: when every form is found, the learner must pick the SPECIAL form: the one that puts the + on the ring carbon that carries a group,
//                                 or press "None of these" when there is no such form (meta attack). The answer is computed from the forms.) }
// The set of forms is computed by engine/resonance.js (enumerate), never typed in; tools/check_resonance.py proves it against RDKit.
// Every wrong attempt: ctx.onResult({ok:false, diagnosis}) with a specific diagnosis from resonance.applyAndCheck (arrow from a σ bond, atom moved,
// five bonds on carbon ...). Finishing: ctx.onResult({ok:true}). ctx.onProgress() after each new form so stale wrong-answer text is cleared.
import { sceneFromSmiles } from './arrow-core.js';
import arrowDraw from './arrow-draw.js';
import { enumerate, applyAndCheck, stateFromScene, keyOfState, hybridOf, partialLabel } from '../resonance.js';
import { sigmaRing } from '../reactions-aromatic.js';

const NS = 'http://www.w3.org/2000/svg';
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const se = (tag, attrs = {}, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
const SUB = '₀₁₂₃₄₅₆₇₈₉';

/**
 * Line drawing of a state (forms or the hybrid) on the heavy-atom coordinates `pos` ([{x,y}] bond units). Integer orders are solid lines; a fractional order
 * (1.5, 1.33 ...) is one solid line plus dashed ones. Heteroatoms are labelled with their H count; a formal charge of ±1 gets a circled sign; a fractional
 * charge gets δ+ / δ−.
 */
export function formSvg(state, pos, opts = {}) {
  const S = 44;
  const xs = pos.map((p) => p.x * S), ys = pos.map((p) => p.y * S);
  const pad = 30;
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  const svg = se('svg', { viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`, class: 'rd-form-svg', role: 'img', 'aria-label': opts.label || 'structure' });
  const lab = (i) => state.el[i] !== 'C' || (state.impH[i] === 0 && state.bonds.filter((b) => b.a === i || b.b === i).length === 0);
  const rad = (i) => (lab(i) ? 11 : 0);
  state.bonds.forEach((b) => {
    const x1 = xs[b.a], y1 = ys[b.a], x2 = xs[b.b], y2 = ys[b.b];
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    const sx = x1 + ux * rad(b.a), sy = y1 + uy * rad(b.a), ex = x2 - ux * rad(b.b), ey = y2 - uy * rad(b.b);
    const o = b.order, base = Math.floor(o + 1e-9), frac = o - base > 1e-6;
    const lines = base + (frac ? 1 : 0);
    const gap = 4.2, first = -((lines - 1) * gap) / 2;
    for (let k = 0; k < lines; k++) {
      const off = first + k * gap;
      const ln = se('line', { x1: sx - uy * off, y1: sy + ux * off, x2: ex - uy * off, y2: ey + ux * off, class: 'rd-bond' + (frac && k === lines - 1 ? ' rd-dash' : '') });
      svg.appendChild(ln);
    }
  });
  state.el.forEach((el, i) => {
    const q = state.charge[i];
    let text = '';
    if (lab(i)) text = el + (state.impH[i] ? 'H' + (state.impH[i] > 1 ? SUB[state.impH[i]] : '') : '');
    if (text) svg.appendChild(se('text', { x: xs[i], y: ys[i] + 5, class: 'rd-el rd-el-' + el, 'text-anchor': 'middle' }, text));
    if (Math.abs(q) > 1e-9) {
      const whole = Math.abs(q - Math.round(q)) < 1e-9;
      // put the sign where the bonds are not
      const angs = state.bonds.filter((b) => b.a === i || b.b === i).map((b) => { const j = b.a === i ? b.b : b.a; return Math.atan2(ys[j] - ys[i], xs[j] - xs[i]); });
      let best = -Math.PI / 2, bd = -1;
      for (let t = 0; t < 16; t++) { const a = -Math.PI + (t * Math.PI) / 8; const d = Math.min(...angs.map((g) => { let x = Math.abs(a - g) % (2 * Math.PI); return x > Math.PI ? 2 * Math.PI - x : x; }), 9); if (d > bd) { bd = d; best = a; } }
      const r = text ? 21 : 17;
      const cx = xs[i] + Math.cos(best) * r, cy = ys[i] + Math.sin(best) * r;
      if (whole) {
        svg.appendChild(se('circle', { cx, cy, r: 7.5, class: 'rd-chg ' + (q > 0 ? 'pos' : 'neg') }));
        svg.appendChild(se('text', { x: cx, y: cy + 4, class: 'rd-chgt', 'text-anchor': 'middle' }, q > 0 ? '+' : '−'));
      } else {
        svg.appendChild(se('text', { x: cx, y: cy + 4, class: 'rd-delta ' + (q > 0 ? 'pos' : 'neg'), 'text-anchor': 'middle' }, partialLabel(q)));
      }
    }
  });
  return svg;
}


/** Scene (atoms with explicit H) of one form: the start's layout with this form's bond orders and charges. `base` = sceneFromSmiles([{smiles: start}]). */
export function formScene(base, heavy, st) {
  const atoms = base.atoms.map((a, i) => ({ el: a.el, x: a.x, y: a.y, charge: i < heavy ? st.charge[i] : 0 }));
  const bonds = base.bonds.map((b) => {
    if (b.a < heavy && b.b < heavy) { const k = st.bonds.find((x) => (x.a === b.a && x.b === b.b) || (x.a === b.b && x.b === b.a)); return { a: b.a, b: b.b, order: k ? k.order : 1 }; }
    return { a: b.a, b: b.b, order: b.order };
  });
  return { atoms, bonds };
}

/**
 * Judge the learner's arrows on the scene of form `current`: wrong (specific diagnosis from applyAndCheck), a legal but unhelpful move ('minor'), a form already found
 * ('dup'), or a new form of the set ({ok:true, idx}). Pure: tests call it without a DOM.
 */
export function judgeArrows({ scene, heavy, forms, found, current, fold, word }, drawn) {
  const r = applyAndCheck(scene, drawn);
  if (!r.ok) return r;
  const st = stateFromScene(r.result, heavy);
  const key = keyOfState(st, fold);
  const idx = forms.findIndex((f) => f.key === key);
  if (idx < 0) return { ok: false, code: 'minor', wrong: [], diagnosis: 'That is a legal move of electrons, but it creates charges that were not in the start and puts a charge on an atom that cannot stabilise it, so it is not one of the forms of this ' + (word || 'structure') + '. Look for the arrow that slides a π bond (or lone pair) one bond over, next to the charge or lone pair.' };
  if (found.includes(idx)) return { ok: false, code: 'dup', wrong: [], diagnosis: fold && idx === current ? 'That is the same form again: only the alternating bonds of the ring swapped, and we count those two drawings as one form. Look for a different place for the charge.' : 'You already found that form. Look for a new one: press a form in the row to start from a different one.' };
  return { ok: true, code: 'ok', idx, message: 'A valid resonance form.' };
}

export default {
  id: 'resonance-drawer',
  mount(host, config, ctx) {
    const fold = !!config.fold;
    let forms = enumerate(config.start, { fold });
    let ringSet = null;
    if (config.ringOnly || config.find) {
      ringSet = new Set(sigmaRing(forms[0].state));
      if (config.ringOnly) {
        const s0 = forms[0].state;
        forms = forms.filter((f) => f.state.charge.every((c, i) => ringSet.has(i) || c === s0.charge[i]) && f.state.bonds.every((b) => {
          if (ringSet.has(b.a) && ringSet.has(b.b)) return true;
          const o = s0.bonds.find((x) => (x.a === b.a && x.b === b.b) || (x.a === b.b && x.b === b.a));
          return o && o.order === b.order;
        }));
      }
    }
    // the special form: the + sits on a ring carbon that has a bond to an atom outside the ring (the carbon that carries the group)
    const isSpecial = (st) => { const p = [...(ringSet || [])].find((i) => st.charge[i] === 1); return p != null && st.bonds.some((b) => (b.a === p && !ringSet.has(b.b)) || (b.b === p && !ringSet.has(b.a))); };
    const allForms = fold ? enumerate(config.start, { fold: false }) : forms;
    const N = forms.length;
    const need = config.need ? Math.min(config.need + 1, N) : N;        // count includes the start
    const heavy = forms[0].state.el.length;
    const base = sceneFromSmiles([{ smiles: config.start }]);
    const pos = base.atoms.slice(0, heavy).map((a) => ({ x: a.x, y: a.y }));
    const found = [0];       // indices into forms, in the order found
    let current = 0, done = false, canvas = null, inst = null, busy = false, miss = 0;
    const word = config.name || 'structure';

    host.innerHTML = '';
    const root = h('div', 'rd');
    const count = h('p', 'rd-count'); count.setAttribute('aria-live', 'polite');
    const row = h('div', 'rd-row'); row.setAttribute('role', 'list');
    const note = h('p', 'rd-note muted small');
    const stage = h('div', 'rd-stage');
    const fin = h('div', 'rd-fin');
    root.append(count, row, note, stage, fin);
    host.append(root);

    const sceneFor = (fi) => formScene(base, heavy, forms[fi].state);

    function paintRow() {
      row.innerHTML = '';
      found.forEach((fi, k) => {
        if (k) row.append(h('span', 'rd-arrow', '↔'));
        const b = h('button', 'rd-thumb' + (fi === current ? ' on' : '')); b.type = 'button';
        b.setAttribute('role', 'listitem');
        b.setAttribute('aria-label', `Form ${k + 1}${fi === current ? ' (you are drawing from this one)' : ''}`);
        b.setAttribute('aria-pressed', String(fi === current));
        b.append(formSvg(forms[fi].state, pos, { label: `Resonance form ${k + 1}` }));
        b.addEventListener('click', () => { if (done || busy || fi === current) return; current = fi; paintRow(); mountCanvas(); });
        row.append(b);
      });
      if (found.length < need) {
        row.append(h('span', 'rd-arrow', '↔'));
        const q = h('span', 'rd-thumb ghost', '?'); q.setAttribute('aria-hidden', 'true');
        row.append(q);
      }
      count.innerHTML = `<b>${found.length} of ${need}</b> forms found${config.need ? '' : ' (' + word + ')'}`;
    }

    function mountCanvas() {
      stage.innerHTML = '';
      const box = h('div', 'rd-canvas');
      stage.append(box);
      const sc = sceneFor(current);
      inst = arrowDraw.mount(box, {
        atoms: sc.atoms, bonds: sc.bonds, arrows: [],
        judge: (drawn) => judgeArrows({ scene: sc, heavy, forms, found, current, fold, word }, drawn)
      }, {
        onResult(r) {
          if (busy) return;
          if (!r.ok) { miss++; ctx.onResult(r); return; }
          busy = true;
          const target = r.idx;            // arrow-draw hands us the judge's own result object
          const next = () => {
            found.push(target); current = target; busy = false;
            if (found.length >= need) finish(); else { paintRow(); mountCanvas(); note.textContent = 'Valid. Keep going: press Check after drawing, or press an earlier form in the row to start from it.'; if (ctx.onProgress) ctx.onProgress(); }
          };
          Promise.resolve(inst.play ? inst.play() : null).then(next);
        }
      });
    }
    function finish() {
      done = true;
      paintRow();
      stage.innerHTML = '';
      note.textContent = '';
      if (config.hybrid !== false && !config.need && N > 1) {
        const hyb = hybridOf(allForms);      // bond orders averaged over every Kekule drawing
        hyb.charge = hybridOf(forms).charge; // charges averaged over the forms we count
        const box = h('div', 'rd-hybrid');
        box.append(h('p', 'rd-hyb-h', '<b>The real structure: the resonance hybrid</b>'));
        box.append(formSvg(hyb, pos, { label: 'Resonance hybrid' }));
        box.append(h('p', 'muted small', 'Dashed lines are bonds that are double in some forms and single in others. δ+ or δ− marks a charge shared between atoms. None of the forms on their own is real; the hybrid is, and it is more stable than any single form.'));
        fin.append(box);
      }
      if (config.need) fin.append(h('p', 'rd-ok', 'Nice. That form is valid: same atoms, same σ bonds, same charge, only electrons moved.'));
      if (config.find) { startFind(); return; }
      ctx.onResult({ ok: true });
    }
    function startFind() {
      const specials = found.filter((fi) => isSpecial(forms[fi].state));
      const box = h('div', 'rd-find');
      box.append(h('p', 'rd-find-h', config.find.ask || 'Which form puts the + on the ring carbon that carries the group? Tap it, or press “None of these”.'));
      const grid = h('div', 'rd-find-row'); grid.setAttribute('role', 'group');
      const msg = h('p', 'rd-find-msg'); msg.setAttribute('aria-live', 'polite');
      let settled = false;
      const settle = (right, text) => {
        msg.className = 'rd-find-msg ' + (right ? 'ok' : 'bad'); msg.textContent = text;
        if (right) { settled = true; [...grid.children, none].forEach((x) => { x.disabled = true; }); ctx.onResult({ ok: true }); }
        else ctx.onResult({ ok: false, diagnosis: text });
      };
      found.forEach((fi, k) => {
        const b = h('button', 'rd-thumb'); b.type = 'button'; b.setAttribute('aria-label', `Form ${k + 1}`);
        b.append(formSvg(forms[fi].state, pos, { label: `Resonance form ${k + 1}` }));
        b.addEventListener('click', () => {
          if (settled) return;
          if (specials.includes(fi)) { b.classList.add('on'); settle(true, config.find.right || 'Yes. In this form the + sits on the carbon that carries the group.'); }
          else settle(false, specials.length ? 'In this form the + is on a carbon that has no group on it (only H and ring carbons next to it). Look for the form whose + sits on the carbon that carries the group.' : 'None of the forms puts the + on the carbon that carries the group. In this attack the + is always on carbons next to the attacked carbon or opposite it. Look at all three again, or press “None of these”.');
        });
        grid.append(b);
      });
      const none = h('button', 'btn'); none.type = 'button'; none.textContent = 'None of these';
      none.addEventListener('click', () => {
        if (settled) return;
        if (!specials.length) settle(true, config.find.rightNone || 'Right: in this attack the + never lands on the carbon that carries the group.');
        else settle(false, 'There is such a form. Look at the carbon that carries the group: one of the forms puts the + right on it.');
      });
      box.append(grid, none, msg);
      fin.append(box);
    }

    paintRow();
    mountCanvas();
    return { destroy() {}, found: () => found.slice(), forms: () => forms };
  }
};
