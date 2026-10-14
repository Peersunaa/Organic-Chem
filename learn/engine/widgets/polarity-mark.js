// Widget: mark the delta-minus end of bonds. Tap the atom that pulls the shared electrons (delta-minus),
// or "no real polarity" for a nearly nonpolar bond. Graded from the electronegativity table, never hand-typed.
//
// config: { smiles, bonds: [{a: heavyAtomIndex, b: heavyAtomIndex | 'H'}], showTable?: bool }
//   'H' on either side means "a hydrogen attached to the other atom" (hydrogens are implicit in the SMILES).
import { analyze, ENEG, bondClass, svg as rdSvg } from '../chem.js';

const MINUS = '−';

/** Resolve each configured bond to element symbols and the correct answer ('a' | 'b' | 'none'). */
export function expected(config) {
  const info = analyze(config.smiles);
  return config.bonds.map((bd) => {
    const A = bd.a === 'H' ? 'H' : info.atoms[bd.a].sym;
    const B = bd.b === 'H' ? 'H' : info.atoms[bd.b].sym;
    const enA = ENEG[A], enB = ENEG[B];
    const diff = Math.round(Math.abs(enA - enB) * 100) / 100;
    const cls = bondClass(diff);
    return { A, B, enA, enB, diff, cls, answer: cls === 'nonpolar' ? 'none' : enA > enB ? 'a' : 'b' };
  });
}

function why(e, pick) {
  const pair = `${e.A}${MINUS}${e.B}`;
  const nums = `${e.A} ${e.enA} vs ${e.B} ${e.enB}`;
  if (e.answer === 'none') {
    return pick === 'none' ? '' : `${pair}: ${nums}, a difference of only ${e.diff}. Below 0.5 the electrons are shared almost equally, so there is no real δ+/δ${MINUS}.`;
  }
  const hi = e.answer === 'a' ? e.A : e.B, lo = e.answer === 'a' ? e.B : e.A;
  if (pick === 'none') return `${pair}: ${nums}, a difference of ${e.diff}. That is 0.5 or more, so the bond is polar.`;
  return `${pair}: ${nums}. ${hi} has the higher electronegativity, so it pulls the shared electrons and carries δ${MINUS}; ${lo} is δ+.`;
}

/** picks: array of 'a' | 'b' | 'none' | null per bond. */
export function grade(config, picks) {
  const exp = expected(config);
  if (picks.some((p) => p == null)) return { ok: false, wrong: [], diagnosis: 'Mark every bond first.', code: 'empty' };
  const wrong = [];
  exp.forEach((e, i) => { if (picks[i] !== e.answer) wrong.push(i); });
  if (!wrong.length) return { ok: true, wrong, diagnosis: '' };
  return { ok: false, wrong, diagnosis: why(exp[wrong[0]], picks[wrong[0]]) };
}

/** The picks a perfect learner would make (used by tests). */
export function solution(config) { return expected(config).map((e) => e.answer); }

export default {
  id: 'polarity-mark',
  mount(host, config, ctx) {
    host.innerHTML = '';
    const exp = expected(config);
    const picks = exp.map(() => null);
    const hl = [...new Set(config.bonds.flatMap((b) => [b.a, b.b]).filter((x) => typeof x === 'number'))];
    const fig = document.createElement('figure');
    fig.className = 'mol';
    fig.innerHTML = `<div class="mol-svg" role="img" aria-label="${config.smiles}">${rdSvg(config.smiles, { highlight: hl })}</div>`;
    const rows = document.createElement('div');
    rows.className = 'pm';
    const els = exp.map((e, i) => {
      const row = document.createElement('div');
      row.className = 'pm-row';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', `Bond ${e.A} to ${e.B}`);
      const mk = (which, sym) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pm-atom'; b.dataset.pick = which;
        b.setAttribute('aria-pressed', 'false');
        b.innerHTML = `<span class="pm-sym">${sym}</span><span class="pm-d" aria-hidden="true"></span>`;
        return b;
      };
      const a = mk('a', e.A), b = mk('b', e.B);
      const bond = document.createElement('span'); bond.className = 'pm-bond'; bond.setAttribute('aria-hidden', 'true');
      const none = document.createElement('button');
      none.type = 'button'; none.className = 'pm-none'; none.dataset.pick = 'none'; none.setAttribute('aria-pressed', 'false');
      none.textContent = 'Not really polar';
      row.append(a, bond, b, none);
      const hint = document.createElement('span'); hint.className = 'pm-help';
      hint.textContent = 'Tap the δ' + MINUS + ' atom';
      row.append(hint);
      const paint = () => {
        a.setAttribute('aria-pressed', String(picks[i] === 'a')); b.setAttribute('aria-pressed', String(picks[i] === 'b')); none.setAttribute('aria-pressed', String(picks[i] === 'none'));
        a.querySelector('.pm-d').textContent = picks[i] === 'a' ? 'δ' + MINUS : picks[i] === 'b' ? 'δ+' : '';
        b.querySelector('.pm-d').textContent = picks[i] === 'b' ? 'δ' + MINUS : picks[i] === 'a' ? 'δ+' : '';
      };
      row.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-pick]');
        if (!t || locked) return;
        picks[i] = t.dataset.pick; row.classList.remove('bad'); paint();
      });
      rows.append(row);
      return row;
    });
    let locked = false;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn primary'; btn.textContent = 'Check';
    if (config.showTable) {
      const t = document.createElement('p'); t.className = 'pm-table muted small';
      const syms = [...new Set(exp.flatMap((e) => [e.A, e.B]))];
      t.textContent = 'Electronegativity: ' + syms.map((s) => `${s} ${ENEG[s]}`).join(' · ');
      host.append(fig, t, rows, btn);
    } else host.append(fig, rows, btn);
    btn.addEventListener('click', () => {
      if (locked) return;
      const r = grade(config, picks);
      els.forEach((row, i) => row.classList.toggle('bad', r.wrong.includes(i)));
      if (r.ok) { locked = true; btn.disabled = true; els.forEach((row) => row.querySelectorAll('button').forEach((x) => { x.disabled = true; })); }
      ctx.onResult(r);
    });
    return { destroy() {} };
  }
};
