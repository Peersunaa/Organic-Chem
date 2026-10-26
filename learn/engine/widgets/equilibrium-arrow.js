// Widget: predict the direction of an acid-base equilibrium from pKa values.
//   1) tap the acid on each side (the species that can give away H+),
//   2) read the two pKa values, then tap which side the equilibrium favours.
// config: { a: acidId, b: acidId } builds  HA(a) + A(b)-  <=>  A(a)- + HA(b)  from the pKa table in engine/acidbase.js.
import { reaction } from '../acidbase.js';

const MINUS = '−';

/** Species keys: L0 L1 R0 R1. The acids are always L0 and R1. */
export const ACID_KEYS = ['L0', 'R1'];
const spec = (rx, key) => (key[0] === 'L' ? rx.left : rx.right)[Number(key[1])];

/** Tap on one species while locating the acids. */
export function tapSpecies(config, key) {
  const rx = reaction(config.a, config.b);
  const s = spec(rx, key);
  if (s.role === 'acid') return { ok: true, diagnosis: '' };
  const side = key[0] === 'L' ? rx.left : rx.right;
  const acid = side.find((x) => x.role === 'acid');
  return { ok: false, diagnosis: `${s.label} is the base on this side: it has no H to give, and it is ready to accept H⁺. The acid on this side is ${acid.label}, the one that can donate H⁺.` };
}

/** Grade the favoured-side choice ('left' | 'right'). */
export function gradeSide(config, side) {
  const rx = reaction(config.a, config.b);
  if (side === rx.favoured) return { ok: true, diagnosis: '', favoured: rx.favoured };
  const la = rx.left[0], ra = rx.right[1];
  const picked = side === 'left' ? la : ra, other = side === 'left' ? ra : la;
  return {
    ok: false,
    diagnosis: `The ${side} side holds ${picked.label}, pKa ${picked.pkaText}. The ${side === 'left' ? 'right' : 'left'} side holds ${other.label}, pKa ${other.pkaText}. ${picked.label} is the stronger acid (lower pKa), so it is the one that gets used up. The equilibrium favours the side with the weaker acid, the higher pKa: the ${rx.favoured} side.`
  };
}

export function solution(config) { return { acids: ACID_KEYS.slice(), side: reaction(config.a, config.b).favoured }; }

export default {
  id: 'equilibrium-arrow',
  mount(host, config, ctx) {
    const rx = reaction(config.a, config.b);
    const found = new Set();
    let done = false;
    host.innerHTML = `
      <div class="eq">
        <p class="eq-step" aria-live="polite"></p>
        <div class="eq-row" role="group" aria-label="The equilibrium">
          <div class="eq-side" data-side="L"></div>
          <div class="eq-mid" aria-hidden="true"><span class="eq-arrows">⇌</span></div>
          <div class="eq-side" data-side="R"></div>
        </div>
        <div class="eq-pick" hidden role="group" aria-label="Which side is favoured?">
          <button type="button" class="btn eq-btn" data-side="left">Left side favoured</button>
          <button type="button" class="btn eq-btn" data-side="right">Right side favoured</button>
        </div>
      </div>`;
    const stepEl = host.querySelector('.eq-step');
    const pick = host.querySelector('.eq-pick');
    const mid = host.querySelector('.eq-arrows');
    const sides = { L: host.querySelector('[data-side="L"]'), R: host.querySelector('[data-side="R"]') };
    const btns = {};

    const setStep = (t) => { stepEl.textContent = t; };
    setStep('Step 1. Tap the acid on each side.');

    ['L', 'R'].forEach((S) => {
      const list = S === 'L' ? rx.left : rx.right;
      list.forEach((s, i) => {
        if (i > 0) { const plus = document.createElement('span'); plus.className = 'eq-plus'; plus.setAttribute('aria-hidden', 'true'); plus.textContent = '+'; sides[S].append(plus); }
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'eq-sp'; b.dataset.key = S + i;
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', `${s.label}, ${s.name}`);
        b.innerHTML = `<span class="eq-lab"></span><span class="eq-name"></span><span class="eq-pka" aria-hidden="true"></span>`;
        b.querySelector('.eq-lab').textContent = s.label;
        b.querySelector('.eq-name').textContent = s.name;
        b.addEventListener('click', () => {
          if (done || found.has(b.dataset.key)) return;
          const r = tapSpecies(config, b.dataset.key);
          if (r.ok) {
            found.add(b.dataset.key);
            b.setAttribute('aria-pressed', 'true'); b.classList.add('on');
            b.querySelector('.eq-pka').textContent = `pKa ${s.pkaText}`;
            b.setAttribute('aria-label', `${s.label}, ${s.name}, acid, pKa ${s.pkaText}`);
            if (found.size === 2) {
              setStep('Step 2. Equilibrium favours the side with the weaker acid. Which side is that?');
              pick.hidden = false;
            }
          } else { b.classList.add('bad'); setTimeout(() => b.classList.remove('bad'), 700); ctx.onResult(r); }
        });
        btns[b.dataset.key] = b;
        sides[S].append(b);
      });
    });

    pick.addEventListener('click', (e) => {
      const t = e.target.closest('[data-side]');
      if (!t || done) return;
      const r = gradeSide(config, t.dataset.side);
      if (r.ok) {
        done = true;
        pick.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        t.classList.add('good');
        sides[rx.favoured === 'left' ? 'L' : 'R'].classList.add('fav');
        mid.textContent = rx.favoured === 'left' ? '←' : '→';
        mid.setAttribute('title', 'Equilibrium arrow');
        setStep(`Done. ${rx.favoured === 'left' ? 'Left' : 'Right'} side favoured.`);
      } else { t.classList.add('bad'); setTimeout(() => t.classList.remove('bad'), 700); }
      ctx.onResult(r);
    });
    return { destroy() {} };
  }
};
