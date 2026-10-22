// Widget: cation-rank. Tap the carbocations from MOST stable to LEAST stable. Graded from the structure of each cation
// (engine/reactions.js cationClass: the number of carbon neighbours of the C+), never from typed answers.
//
// config: { items: [{smiles, label?}, ...] }   (any number of cations; ties in class may be tapped in either order)
// Each wrong tap gets a diagnosis that names the cation class, the better candidate still waiting, and the reason (alkyl groups donate electrons).
// ctx.onResult({ok:false, diagnosis}) on a wrong tap, ctx.onResult({ok:true}) once every cation is ranked.
import { svg as rdSvg } from '../chem.js';
import { cationClass, CLASS_NAME } from '../reactions.js';

const groups = (n) => (n === 1 ? '1 carbon group' : n + ' carbon groups');

/** Grade one tap: `placed` = indices already ranked (in order), `idx` = the tapped item. */
export function gradeTap(items, placed, idx) {
  const left = items.map((_, i) => i).filter((i) => !placed.includes(i));
  const cls = (i) => cationClass(items[i].smiles);
  const best = Math.max(...left.map(cls));
  if (cls(idx) === best) return { ok: true };
  const better = left.find((i) => cls(i) === best);
  const c = cls(idx);
  return {
    ok: false,
    diagnosis: `That is ${/^[aeiou]/.test(CLASS_NAME[c]) ? 'an' : 'a'} ${CLASS_NAME[c]} cation: the + carbon has ${groups(c)} on it. There is a more stable one still waiting (${CLASS_NAME[best]}, with ${groups(best)}). Alkyl groups donate electron density to the electron-poor C⁺, so more of them means a more stable cation.`,
    better
  };
}
/** The full correct ranking of the items (class descending). */
export function solution(items) {
  return items.map((it, i) => ({ i, c: cationClass(it.smiles) })).sort((p, q) => q.c - p.c || p.i - q.i).map((x) => x.i);
}
/** Is a complete tap sequence a correct ranking? (used by the tests) */
export function gradeAll(items, order) {
  if (order.length !== items.length) return { ok: false };
  const placed = [];
  for (const idx of order) { const r = gradeTap(items, placed, idx); if (!r.ok) return r; placed.push(idx); }
  return { ok: true };
}

export default {
  id: 'cation-rank',
  mount(host, config, ctx) {
    const items = config.items;
    host.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'cr';
    const ask = document.createElement('p');
    ask.className = 'cr-ask';
    ask.innerHTML = 'Tap the carbocations in order, <b>most stable first</b>, least stable last.';
    const grid = document.createElement('div');
    grid.className = 'cr-grid';
    const msg = document.createElement('p');
    msg.className = 'cr-msg'; msg.setAttribute('aria-live', 'polite');
    const row = document.createElement('div');
    row.className = 'lb-actions';
    const undo = document.createElement('button'); undo.type = 'button'; undo.className = 'btn ghost'; undo.textContent = 'Undo last';
    const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'btn ghost'; clear.textContent = 'Start again';
    row.append(undo, clear);
    root.append(ask, grid, msg, row);
    host.append(root);
    const placed = [];
    let finished = false;
    const cards = items.map((it, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cr-card';
      b.setAttribute('aria-label', `Carbocation ${i + 1}${it.label ? ': ' + it.label : ''}`);
      b.innerHTML = `<span class="cr-svg">${rdSvg(it.smiles, { style: 'skeletal', width: 150, height: 110, showCharge: true })}</span><span class="cr-badge" aria-hidden="true"></span>`;
      b.addEventListener('click', () => {
        if (finished || placed.includes(i)) return;
        const r = gradeTap(items, placed, i);
        if (!r.ok) {
          b.classList.add('bad'); setTimeout(() => b.classList.remove('bad'), 700);
          msg.className = 'cr-msg bad'; msg.textContent = r.diagnosis;
          ctx.onResult({ ok: false, diagnosis: r.diagnosis });
          return;
        }
        placed.push(i); msg.className = 'cr-msg'; msg.textContent = '';
        paint();
        if (placed.length === items.length) {
          finished = true;
          msg.className = 'cr-msg ok';
          msg.textContent = 'Ranked. The more alkyl groups on the C⁺, the more stable the cation: 3° > 2° > 1° > methyl.';
          ctx.onResult({ ok: true });
        }
      });
      grid.append(b);
      return b;
    });
    function paint() {
      cards.forEach((b, i) => {
        const k = placed.indexOf(i);
        b.classList.toggle('on', k >= 0);
        b.querySelector('.cr-badge').textContent = k >= 0 ? String(k + 1) : '';
        b.setAttribute('aria-pressed', String(k >= 0));
      });
    }
    undo.addEventListener('click', () => { if (finished) return; placed.pop(); msg.textContent = ''; msg.className = 'cr-msg'; paint(); });
    clear.addEventListener('click', () => { if (finished) return; placed.length = 0; msg.textContent = ''; msg.className = 'cr-msg'; paint(); });
    paint();
    return { destroy() {} };
  }
};
