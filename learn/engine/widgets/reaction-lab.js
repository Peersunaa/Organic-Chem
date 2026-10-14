// Widget: reaction-lab (reusable). Pick an alkene (about ten, drawn) and a reagent (HCl, HBr, HI, H₂O with H₂SO₄ catalyst).
// The learner PREDICTS the major product first (graded by canonical SMILES from engine/reactions.js). Only then does the lab reveal
// both possible carbocations side by side (class + stability bar), the major product, and a Play button for the mechanism
// (mechanism-player, watch mode).
//
// config: { alkenes?: [ids of LAB_ALKENES], reagents?: [ids of REAGENT_IDS], need?: n (correct predictions before ctx.onResult({ok:true}), default 1),
//           start?: {alkene, reagent}, seed?: number }
// ctx.onResult({ok:false, diagnosis}) on every wrong prediction; ctx.onResult({ok:true}) once `need` predictions were right.
import { svg as rdSvg } from '../chem.js';
import { LAB_ALKENES, REAGENT_IDS, REAGENTS, ALKENE_BY_ID, predict, productChoices, CLASS_NAME, CLASS_SHORT, stabilityFraction, alkeneName } from '../reactions.js';
import mechanismPlayer from './mechanism-player.js';
import { getIupac } from '../store.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fig = (smiles, w = 150, hh = 108) => `<span class="rl-svg">${rdSvg(smiles, { style: 'skeletal', width: w, height: hh, showCharge: true })}</span>`;
function rng32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function nameHtml(smiles) {
  const n = alkeneName(smiles);
  if (!n) return smiles;
  return `<span class="iupac" data-name-new="${n.new}" data-name-old="${n.old}">${getIupac() === 'old' ? n.old : n.new}</span>`;
}

export default {
  id: 'reaction-lab',
  mount(host, config, ctx) {
    const alkenes = (config.alkenes || LAB_ALKENES.map((a) => a.id)).map((id) => ALKENE_BY_ID[id]);
    const reagents = config.reagents || REAGENT_IDS;
    const need = config.need || 1;
    const rng = config.seed != null ? rng32(config.seed) : Math.random;
    let alkene = config.start ? ALKENE_BY_ID[config.start.alkene] : null;
    let reagent = config.start ? config.start.reagent : null;
    let right = 0, doneSent = false, mp = null;

    host.innerHTML = '';
    const root = h('div', 'rl');
    host.append(root);

    function pickers() {
      const box = h('div', 'rl-pick');
      box.append(h('p', 'rl-h', '<b>1. Pick an alkene</b>'));
      const g1 = h('div', 'rl-alk');
      alkenes.forEach((a) => {
        const b = h('button', 'rl-btn'); b.type = 'button';
        b.setAttribute('aria-pressed', String(alkene === a));
        b.innerHTML = `${fig(a.smiles, 120, 84)}<span class="rl-name">${nameHtml(a.smiles)}</span>`;
        b.addEventListener('click', () => { alkene = a; render(); });
        g1.append(b);
      });
      box.append(g1);
      box.append(h('p', 'rl-h', '<b>2. Pick a reagent</b>'));
      const g2 = h('div', 'rl-rea');
      reagents.forEach((id) => {
        const b = h('button', 'btn rl-rbtn'); b.type = 'button';
        b.setAttribute('aria-pressed', String(reagent === id));
        b.textContent = REAGENTS[id].label;
        b.addEventListener('click', () => { reagent = id; render(); });
        g2.append(b);
      });
      box.append(g2);
      return box;
    }

    function optionCard(o, onPick) {
      const b = h('button', 'rl-opt'); b.type = 'button';
      b.innerHTML = o.smiles.map((s, i) => (i ? '<span class="rl-plus">+</span>' : '') + fig(s, 130, 96)).join('') + (o.smiles.length > 1 ? '<span class="rl-mix">a mixture of both</span>' : '');
      b.setAttribute('aria-label', 'Product option ' + o.smiles.join(' and '));
      b.addEventListener('click', () => onPick(b, o));
      return b;
    }

    function reveal(pred, box) {
      box.append(h('p', 'rl-h', '<b>Why: the two carbocations H⁺ can make</b>'));
      const cats = h('div', 'rl-cats');
      pred.options.forEach((o) => {
        const fav = pred.major.includes(o);
        const c = h('div', 'rl-cat' + (fav ? ' fav' : ''));
        c.innerHTML = `${fig(o.cation, 140, 100)}<p class="rl-cls"><b>${CLASS_NAME[o.cls]}</b> carbocation</p>
          <div class="rl-bar" role="img" aria-label="Relative stability ${CLASS_SHORT[o.cls]}: ${o.cls} of 3"><i style="width:${Math.round(stabilityFraction(o.cls) * 100)}%"></i></div>
          <p class="muted small">${fav ? (pred.outcome === 'mixture' ? 'Same stability as the other: both form.' : pred.outcome === 'single' ? 'The only cation (both ends alike).' : 'More stable: this is the one that forms.') : 'Less stable: much slower to form.'}</p>`;
        cats.append(c);
      });
      box.append(cats);
      const R = REAGENTS[reagent];
      const msg = pred.outcome === 'mixture' ? `Both C=C carbons have the same number of alkyl groups, so the two cations are equally stable. You get a mixture.`
        : pred.outcome === 'single' ? `Both ends of the C=C are alike, so there is only one possible cation and one product.`
          : `H adds to the carbon with more H, so the + charge sits on the more substituted carbon (the ${CLASS_NAME[pred.major[0].cls]} cation). ${R.kind === 'HX' ? R.X : 'OH'} ends up on that carbon.`;
      box.append(h('p', 'rl-why', msg));
      const prod = h('div', 'rl-prod');
      prod.append(h('p', 'rl-h', `<b>Major product${pred.products.length > 1 ? 's' : ''}</b>`));
      const row = h('div', 'rl-prow');
      pred.products.forEach((s, i) => { if (i) row.append(h('span', 'rl-plus', '+')); row.append(h('figure', 'mol', fig(s, 160, 116))); });
      prod.append(row);
      box.append(prod);
      // play the mechanism
      const mpBox = h('div', 'rl-mech');
      const tabs = h('div', 'rl-tabs');
      const stage = h('div', 'rl-mp');
      const load = (o) => {
        mp?.destroy?.();
        stage.innerHTML = '';
        mp = mechanismPlayer.mount(stage, { mech: o.mech, mode: 'watch', drawing: 'skeletal' }, { onResult() {} });
      };
      const play = h('button', 'btn primary'); play.type = 'button'; play.textContent = 'Play the mechanism';
      play.addEventListener('click', () => {
        play.remove();
        if (pred.major.length > 1) {
          pred.major.forEach((o, i) => { const t = h('button', 'btn small' + (i ? '' : ' on')); t.type = 'button'; t.textContent = `via cation ${i + 1}`; t.addEventListener('click', () => { [...tabs.children].forEach((x) => x.classList.remove('on')); t.classList.add('on'); load(o); }); tabs.append(t); });
          mpBox.append(tabs);
        }
        mpBox.append(stage);
        load(pred.major[0]);
      });
      box.append(play, mpBox);
      const again = h('button', 'btn ' + (right >= need ? 'primary' : '')); again.type = 'button';
      again.textContent = right >= need ? 'Try another reaction' : `Try another reaction (${right} of ${need} predicted)`;
      again.addEventListener('click', () => { alkene = null; reagent = null; render(); root.scrollIntoView?.({ block: 'nearest' }); });
      const act = h('div', 'lb-actions'); act.append(again);
      box.append(act);
    }

    function render() {
      root.innerHTML = '';
      mp?.destroy?.(); mp = null;
      root.append(pickers());
      if (!alkene || !reagent) {
        root.append(h('p', 'rl-hint muted', alkene || reagent ? 'Now pick the other one.' : `Predict first: you need to get ${need} prediction${need > 1 ? 's' : ''} right.`));
        return;
      }
      let pred;
      try { pred = predict(alkene.smiles, reagent); } catch (e) { root.append(h('p', 'fb bad', 'This combination is outside the lesson.')); return; }
      const box = h('div', 'rl-run');
      const R = REAGENTS[reagent];
      box.append(h('p', 'rl-h', `<b>3. Predict</b>: the major product of ${nameHtml(alkene.smiles)} + ${R.label}`));
      const eq = h('div', 'rl-eq');
      eq.innerHTML = `${fig(alkene.smiles, 130, 96)}<span class="rl-plus">+</span><span class="rl-reag">${R.label}</span><span class="rl-arrow">→ ?</span>`;
      box.append(eq);
      const choices = shuffle(rng, productChoices(pred));
      const list = h('div', 'rl-opts', null);
      const fb = h('div', 'fb'); fb.setAttribute('aria-live', 'polite');
      choices.forEach((o) => list.append(optionCard(o, (btn) => {
        if (o.correct) {
          [...list.children].forEach((x) => { x.disabled = true; });
          btn.classList.add('good');
          fb.className = 'fb ok'; fb.textContent = o.why;
          list.after(fb);
          right++;
          reveal(pred, box);
          if (right >= need && !doneSent) { doneSent = true; ctx.onResult({ ok: true }); }
          else if (ctx.onProgress) ctx.onProgress();
        } else {
          btn.classList.add('bad'); btn.disabled = true;
          fb.className = 'fb bad'; fb.textContent = o.why;
          ctx.onResult({ ok: false, diagnosis: o.why });
        }
      })));
      box.append(list, fb);
      root.append(box);
    }
    render();
    return { destroy() { mp?.destroy?.(); } };
  }
};
