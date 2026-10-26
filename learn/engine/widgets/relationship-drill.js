// Widget: relationship-drill (Lesson 16; reusable, also serves the mastery generator). Two drawn molecules; how are they related?
// config: { pairs:[{ a, b, entry?, rotateB?, title?, note?, cistrans?, whys?:{chosen:{truth:'text'}} }], ask? }
//   a, b are SMILES (stereo written with @ / @@, drawn with wedges and dashes). The ANSWER is computed by relationship() in engine/chirality.js
//   (same constitution? identical? mirror image of a? chiral?), never typed in. Every wrong option gets a diagnosis built from the same facts:
//   which centers differ (engine/stereoisomers.js `whyNot`), or the meso explanation when one drawing is its own mirror image.
//   rotateB: turn the second drawing in the plane of the page (degrees); the compound is the same.
import { svg } from '../chem.js';
import { relationship, formulaKey } from '../chirality.js';
import { POOL_BY_ID, describePair, whyNot, KIND_LABEL, KIND_ORDER, stereoName } from '../stereoisomers.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const sub = (s) => s.replace(/(\d+)/g, (d) => d.split('').map((c) => '₀₁₂₃₄₅₆₇₈₉'[c]).join(''));

/** The true relationship of a pair of this widget: 'identical' | 'enantiomers' | 'diastereomers' | 'constitutional'. */
export function truthOf(pair) { return relationship(pair.a, pair.b).kind; }
/** Grade `chosen` for a pair: { ok, truth, diagnosis, confirm }. */
export function gradePair(pair, chosen) {
  const info = relationship(pair.a, pair.b);
  const truth = info.kind;
  const entry = pair.entry ? POOL_BY_ID[pair.entry] : null;
  const desc = entry && truth !== 'constitutional' ? describePair(entry, pair.a, pair.b) : null;
  const ctxExtra = { cistrans: !!pair.cistrans, formula: info.sameFormula ? sub(formulaKey(pair.a)) : '' };
  if (chosen === truth) return { ok: true, truth, info, confirm: confirmText(pair, info, desc) };
  const custom = pair.whys && pair.whys[chosen];
  return { ok: false, truth, info, diagnosis: custom || whyNot(chosen, truth, info, desc, ctxExtra) };
}
function confirmText(pair, info, desc) {
  if (info.kind === 'identical') return info.mesoA ? 'The same meso compound: it has a plane of symmetry, so it is its own mirror image and drawing it two ways does not make a second compound.' : 'The same compound: every center has the same configuration, only the drawing is turned.';
  if (info.kind === 'enantiomers') return `Mirror images, opposite at every center${desc ? ` (${desc.ta} and ${desc.tb})` : ''}, and not superimposable: enantiomers.`;
  if (info.kind === 'diastereomers') return desc && desc.opp.length && desc.same.length
    ? `Same at ${desc.same.length === 1 ? 'one center' : 'some centers'}, opposite at ${desc.opp.length === 1 ? 'one' : 'the others'} (${desc.ta} and ${desc.tb}): stereoisomers that are not mirror images, so diastereomers.${pair.cistrans ? ' Cis and trans isomers are diastereomers too.' : ''}`
    : `Stereoisomers that are not mirror images: diastereomers.${pair.cistrans ? ' Cis and trans isomers are diastereomers too.' : ''}`;
  return `Same molecular formula${info.sameFormula ? ` (${sub(formulaKey(pair.a))})` : ''}, atoms connected in a different order: constitutional isomers. Stereoisomers always share the same connectivity.`;
}

export default {
  id: 'relationship-drill',
  mount(host, config, ctx = { onResult() {}, onProgress() {} }) {
    host.innerHTML = '';
    const pairs = config.pairs;
    let k = 0, locked = false;
    const root = el('div', 'rd'); host.append(root);
    const ask = el('p', 'rd-ask', config.ask || 'How are these two molecules related? Compare the connectivity first, then each chirality center.');
    const count = el('p', 'muted small');
    const figs = el('div', 'rd-figs');
    const opts = el('div', 'opts rd-opts'); opts.setAttribute('role', 'group');
    const fb = el('div', 'fb'); fb.setAttribute('aria-live', 'polite');
    const bar = el('div', 'cf-bar');
    root.append(ask, count, figs, opts, fb, bar);
    const kinds = config.kinds || KIND_ORDER;

    const draw = (smiles, label, rot) => {
      const f = el('figure', 'rd-fig');
      f.append(el('div', 'rd-svg', svg(smiles, { width: 230, height: 170, style: 'skeletal', rotate: rot || 0 })));
      f.append(el('figcaption', '', label));
      return f;
    };
    const show = () => {
      const p = pairs[k]; locked = false;
      count.textContent = pairs.length > 1 ? `Pair ${k + 1} of ${pairs.length}${p.title ? ': ' + p.title : ''}` : (p.title || '');
      figs.innerHTML = '';
      figs.append(draw(p.a, 'A', 0), el('span', 'rd-vs', 'and'), draw(p.b, 'B', p.rotateB));
      opts.innerHTML = ''; fb.className = 'fb'; fb.textContent = ''; bar.innerHTML = '';
      kinds.forEach((kind) => {
        const b = el('button', 'opt', KIND_LABEL[kind]); b.type = 'button'; b.dataset.k = kind;
        b.addEventListener('click', () => {
          if (locked) return;
          const r = gradePair(p, kind);
          if (r.ok) {
            locked = true; opts.querySelectorAll('.opt').forEach((x) => { x.disabled = true; }); b.classList.add('good');
            fb.className = 'fb ok'; fb.textContent = r.confirm + (p.note ? ' ' + p.note : '');
            if (k + 1 < pairs.length) {
              const nb = el('button', 'btn primary', 'Next pair'); nb.type = 'button';
              nb.addEventListener('click', () => { k++; show(); ctx.onProgress && ctx.onProgress(); });
              bar.append(nb); nb.focus({ preventScroll: true });
            } else ctx.onResult({ ok: true });
          } else {
            b.classList.add('bad'); b.disabled = true;
            ctx.onResult({ ok: false, diagnosis: r.diagnosis });
          }
        });
        opts.append(b);
      });
    };
    show();
    return { destroy() {} };
  }
};
