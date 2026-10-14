// Widget: type the valence-electron count for a strip of elements.
import { VALENCE, GROUP } from '../chem.js';

const NUM = { H: 1, C: 6, N: 7, O: 8, F: 9, Cl: 17 };

export function expected(config) { return config.elements.map((el) => VALENCE[el]); }

/** Pure grading used by the widget and tests. values: array of strings. */
export function grade(config, values) {
  const exp = expected(config);
  const wrong = [];
  let empty = false;
  values.forEach((v, i) => {
    if (String(v).trim() === '') { empty = true; return; }
    if (parseInt(v, 10) !== exp[i] || !/^\s*\d+\s*$/.test(String(v))) wrong.push(i);
  });
  if (empty) return { ok: false, wrong, diagnosis: 'Fill in every box first.', code: 'empty' };
  if (!wrong.length) return { ok: true, wrong, diagnosis: '' };
  return { ok: false, wrong, diagnosis: config.wrongWhy || 'For main-group atoms, valence electrons = the last digit of the group number: H group 1, C 14, N 15, O 16, F/Cl 17.' };
}

export default {
  id: 'valence-strip',
  mount(host, config, ctx) {
    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'vs';
    const inputs = config.elements.map((el, i) => {
      const cell = document.createElement('label');
      cell.className = 'vs-cell';
      cell.innerHTML = `<span class="vs-num">${NUM[el] || ''}</span><span class="vs-el">${el}</span>`;
      const inp = document.createElement('input');
      inp.type = 'text'; inp.inputMode = 'numeric'; inp.autocomplete = 'off';
      inp.id = `vs-${i}`; inp.maxLength = 2;
      inp.setAttribute('aria-label', `Valence electrons in ${el}`);
      cell.appendChild(inp);
      wrap.appendChild(cell);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
      return inp;
    });
    const btn = document.createElement('button');
    btn.className = 'btn primary'; btn.textContent = 'Check';
    host.append(wrap, btn);
    function check() {
      const r = grade(config, inputs.map((i) => i.value));
      inputs.forEach((inp, i) => inp.closest('.vs-cell').classList.toggle('bad', r.wrong.includes(i)));
      if (r.ok) inputs.forEach((i) => { i.disabled = true; });
      ctx.onResult(r);
    }
    btn.addEventListener('click', check);
    return { destroy() {} };
  }
};
export { GROUP };
