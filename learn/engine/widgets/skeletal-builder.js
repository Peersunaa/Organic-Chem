// Widget: given a condensed formula (CH3CH2CH(OH)CH3), pick the matching skeletal drawing from RDKit-rendered options.
// Graded by canonical SMILES: the formula is parsed to SMILES (engine/skeletal.js) and compared with each option.
//
// config: { condensed: 'CH3CH2CH(OH)CH3', options: [{ smiles, why }, ...] }  (why = diagnosis if that option is picked)
import { svg as rdSvg, canon } from '../chem.js';
import { condensedToSmiles } from '../skeletal.js';

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
export const sub = (t) => String(t).replace(/(?<=[A-Za-z)])(\d+)/g, (d) => d.split('').map((x) => SUBS[x]).join(''));

/** Canonical SMILES the learner has to find. */
export function target(config) { return canon(condensedToSmiles(config.condensed)); }
/** Index of the option that matches the formula (canonical-SMILES comparison). */
export function solution(config) { const t = target(config); return config.options.findIndex((o) => canon(o.smiles) === t); }
export function grade(config, i) {
  const o = config.options[i];
  if (o && canon(o.smiles) === target(config)) return { ok: true, diagnosis: '' };
  return { ok: false, diagnosis: (o && o.why) || 'That drawing does not match the formula.' };
}

export default {
  id: 'skeletal-builder',
  mount(host, config, ctx) {
    host.innerHTML = '';
    const f = document.createElement('p');
    f.className = 'sb-formula';
    f.setAttribute('aria-label', 'Condensed formula ' + config.condensed);
    f.textContent = sub(config.condensed);
    const list = document.createElement('div');
    list.className = 'opts mols'; list.setAttribute('role', 'group');
    let locked = false;
    config.options.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'opt';
      b.innerHTML = `<figure class="mol"><div class="mol-svg" role="img" aria-label="Option ${'ABCD'[i]}">${rdSvg(o.smiles, { style: 'skeletal' })}</div><figcaption>${'ABCD'[i]}</figcaption></figure>`;
      b.addEventListener('click', () => {
        if (locked) return;
        const r = grade(config, i);
        if (r.ok) { locked = true; [...list.children].forEach((x) => { x.disabled = true; }); b.classList.add('good'); }
        else { b.classList.add('bad'); b.disabled = true; }
        ctx.onResult(r);
      });
      list.append(b);
    });
    host.append(f, list);
    return { destroy() {} };
  }
};
