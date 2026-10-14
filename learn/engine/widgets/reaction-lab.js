// Widget: reaction-lab (reusable). Pick an alkene (about ten, drawn) and a reagent (HCl, HBr, HI, H₂O with H₂SO₄ catalyst).
// The learner PREDICTS the major product first (graded by canonical SMILES from engine/reactions.js). Only then does the lab reveal
// both possible carbocations side by side (class + stability bar), the major product, and a Play button for the mechanism
// (mechanism-player, watch mode).
//
// Lesson 10: the lab also takes the reagents of REAGENTS2 (Br2, Cl2, H2, RCO3H, RCO3H_H3O, KMnO4_OH, KMnO4_H) and the alkenes of LAB_ALKENES2 (rings and E/Z
// alkenes). For those the answers are stereochemical (wedges), the reveal explains syn / anti and racemates, shows the overall equation ([O] for the
// oxidant), and Br2 / Cl2 offer the bromonium (chloronium) mechanism.
// Lesson 11: config.dienes = ids of LAB_DIENES (conjugated dienes) with the reagents HCl / HBr / HI. The learner predicts the product SET (1,2- and 1,4-addition, or one product
// when the two meet), then the lab shows the allylic cation with its resonance form (↔), the products tagged 1,2 / 1,4, and both mechanisms.
// config: { alkenes?: [ids of LAB_ALKENES or LAB_ALKENES2], reagents?: [ids of REAGENT_IDS or REAGENT_IDS2], need?: n (correct predictions before ctx.onResult({ok:true}), default 1),
//           start?: {alkene, reagent}, seed?: number }
// ctx.onResult({ok:false, diagnosis}) on every wrong prediction; ctx.onResult({ok:true}) once `need` predictions were right.
import { svg as rdSvg } from '../chem.js';
import { LAB_ALKENES, REAGENT_IDS, REAGENTS, ALKENE_BY_ID, predict, productChoices, CLASS_NAME, CLASS_SHORT, stabilityFraction, alkeneName, REAGENTS2, ALKENE2_BY_ID, predictAdd, productChoices2, rightWhy, DIENE_BY_ID, HX, HX_DIENE_IDS, predictDiene, dieneChoices, dieneName } from '../reactions.js';
import mechanismPlayer from './mechanism-player.js';
import { getIupac } from '../store.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fig = (smiles, w = 150, hh = 108) => `<span class="rl-svg">${rdSvg(smiles, { style: 'skeletal', width: w, height: hh, showCharge: true })}</span>`;
function rng32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function nameHtml(smiles) {
  let n = null;
  try { n = dieneName(smiles) || alkeneName(smiles); } catch (e) { n = dieneName(smiles); }
  if (!n) return smiles;
  return `<span class="iupac" data-name-new="${n.new}" data-name-old="${n.old}">${getIupac() === 'old' ? n.old : n.new}</span>`;
}

const ALK = { ...ALKENE_BY_ID, ...ALKENE2_BY_ID, ...DIENE_BY_ID };
const RCFG = (id) => REAGENTS[id] || REAGENTS2[id] || HX[id];
/** Equation of an addition/oxidation (Lesson 10): structures for organic species, plain chips for [O], H2O, X2 and H2. */
const CHIP = { '[O]': '[O]', O: 'H₂O', BrBr: 'Br₂', ClCl: 'Cl₂', '[H][H]': 'H₂' };
export function eqHtml(eq) {
  const part = (s) => (CHIP[s] ? `<span class="rl-reag">${CHIP[s]}</span>` : `<span class="rl-svg">${rdSvg(s, { style: 'skeletal', width: 130, height: 96 })}</span>`);
  const side = (list) => list.map((s) => part(s)).join('<span class="rl-plus">+</span>');
  return `${side(eq.lhs)}<span class="rl-arrow">→</span>${side(eq.rhs)}`;
}

export default {
  id: 'reaction-lab',
  mount(host, config, ctx) {
    // Lesson 11: config.dienes = ids of LAB_DIENES (conjugated dienes + HCl / HBr / HI: 1,2- and 1,4-addition through the allylic cation)
    const dieneMode = !!config.dienes && !config.alkenes;
    const alkenes = (dieneMode ? config.dienes : (config.alkenes || LAB_ALKENES.map((a) => a.id))).map((id) => ALK[id]);
    const reagents = config.reagents || (dieneMode ? HX_DIENE_IDS : REAGENT_IDS);
    const need = config.need || 1;
    const rng = config.seed != null ? rng32(config.seed) : Math.random;
    let alkene = config.start ? ALK[config.start.alkene] : null;
    let reagent = config.start ? config.start.reagent : null;
    let right = 0, doneSent = false, mp = null;

    host.innerHTML = '';
    const root = h('div', 'rl');
    host.append(root);

    function pickers() {
      const box = h('div', 'rl-pick');
      box.append(h('p', 'rl-h', dieneMode ? '<b>1. Pick a diene</b>' : '<b>1. Pick an alkene</b>'));
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
        b.textContent = RCFG(id).label;
        b.addEventListener('click', () => { reagent = id; render(); });
        g2.append(b);
      });
      box.append(g2);
      return box;
    }

    function optionCard(o, onPick, fam2) {
      const b = h('button', 'rl-opt'); b.type = 'button';
      b.innerHTML = o.smiles.map((s, i) => (i ? '<span class="rl-plus">+</span>' : '') + fig(s, 130, 96)).join('') + (o.smiles.length > 1 ? `<span class="rl-mix">${fam2 ? 'two products' : 'a mixture of both'}</span>` : '');
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

    /** Reveal for the Lesson 11 dienes: the allylic cation and its resonance form, then the 1,2- and 1,4-products, and the two mechanisms. */
    function reveal3(pred, box) {
      const o = pred.major[0];
      box.append(h('p', 'rl-h', '<b>Why: H⁺ adds to an end carbon, and the allylic cation is shared by two carbons</b>'));
      const cats = h('div', 'rl-cats rl-res');
      cats.innerHTML = `<div class="rl-cat fav">${fig(o.cation, 140, 100)}</div><span class="rl-arrow rl-double" aria-label="resonance arrow">↔</span><div class="rl-cat fav">${fig(o.cationResonance, 140, 100)}</div>`;
      box.append(cats);
      const R = HX[reagent];
      box.append(h('p', 'rl-why', `H⁺ goes to C1 (an end carbon). The + charge then sits next to the other C=C, so it is shared by C2 and C4 (two resonance forms, ↔). ${R.X}⁻ can attack either end. ${pred.outcome === 'single' ? `Here both ends lead to the same compound, so there is one product.` : `1,2-addition puts ${R.X} on C2; 1,4-addition puts ${R.X} on C4 and moves the C=C to C2=C3. Both products form.`}`));
      const prod = h('div', 'rl-prod');
      prod.append(h('p', 'rl-h', `<b>Product${pred.products.length > 1 ? 's' : ''}</b>`));
      const row = h('div', 'rl-prow');
      pred.products.forEach((sm, i) => {
        if (i) row.append(h('span', 'rl-plus', '+'));
        const tag = pred.outcome === 'two' ? (sm === pred.add12 ? '1,2-addition' : '1,4-addition') : '1,2- and 1,4-addition';
        row.append(h('figure', 'mol', `<div class="mol-svg">${fig(sm, 160, 116)}</div><figcaption>${tag}</figcaption>`));
      });
      prod.append(row);
      box.append(prod);
      const mpBox = h('div', 'rl-mech');
      const tabs = h('div', 'rl-tabs');
      const stage = h('div', 'rl-mp');
      const load = (m) => { mp?.destroy?.(); stage.innerHTML = ''; mp = mechanismPlayer.mount(stage, { mech: m, mode: 'watch', drawing: 'skeletal' }, { onResult() {} }); };
      const play = h('button', 'btn primary'); play.type = 'button'; play.textContent = 'Play the mechanism';
      play.addEventListener('click', () => {
        play.remove();
        if (pred.outcome === 'two') {
          [['1,4-addition (through the resonance form)', o.mech14], ['1,2-addition', o.mech12]].forEach(([lab, m], i) => { const t = h('button', 'btn small' + (i ? '' : ' on')); t.type = 'button'; t.textContent = lab; t.addEventListener('click', () => { [...tabs.children].forEach((x) => x.classList.remove('on')); t.classList.add('on'); load(m); }); tabs.append(t); });
          mpBox.append(tabs);
        }
        mpBox.append(stage);
        load(o.mech14);
      });
      box.append(play, mpBox);
      const again = h('button', 'btn ' + (right >= need ? 'primary' : '')); again.type = 'button';
      again.textContent = right >= need ? 'Try another reaction' : `Try another reaction (${right} of ${need} predicted)`;
      again.addEventListener('click', () => { alkene = null; reagent = null; render(); root.scrollIntoView?.({ block: 'nearest' }); });
      const act = h('div', 'lb-actions'); act.append(again);
      box.append(act);
    }

    /** Reveal for the Lesson 10 reagents: why (syn / anti, racemate), the product(s), the overall equation, the bromonium mechanism for Br2 / Cl2. */
    function reveal2(pred, box) {
      box.append(h('p', 'rl-h', '<b>Why</b>'));
      box.append(h('p', 'rl-why', rightWhy(pred).replace(/^Yes\. /, '')));
      const prod = h('div', 'rl-prod');
      prod.append(h('p', 'rl-h', `<b>Product${pred.products.length > 1 ? 's' : ''}</b>`));
      const row = h('div', 'rl-prow');
      pred.products.forEach((s, i) => { if (i) row.append(h('span', 'rl-plus', '+')); row.append(h('figure', 'mol', fig(s, 170, 120))); });
      prod.append(row);
      if (pred.racemic) prod.append(h('p', 'muted small', 'Chiral product from an achiral alkene: it forms as a <b>racemate</b> (equal amounts of the drawn molecule and its mirror image).'));
      else if (pred.nCenters >= 2) prod.append(h('p', 'muted small', 'This product is achiral (a meso compound): the mirror image is the same molecule.'));
      box.append(prod);
      box.append(h('p', 'rl-h', '<b>Overall equation</b>'));
      box.append(h('div', 'rl-eq', eqHtml(pred.equation)));
      if (pred.equation.note) box.append(h('p', 'muted small', pred.equation.note + '.'));
      if (pred.mech) {
        const mpBox = h('div', 'rl-mech');
        const stage = h('div', 'rl-mp');
        const play = h('button', 'btn primary'); play.type = 'button'; play.textContent = 'Play the mechanism';
        play.addEventListener('click', () => {
          play.remove();
          mpBox.append(stage);
          mp?.destroy?.();
          mp = mechanismPlayer.mount(stage, { mech: pred.mech, mode: 'watch', drawing: 'skeletal' }, { onResult() {} });
        });
        box.append(play, mpBox);
      }
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
      const fam2 = !!REAGENTS2[reagent];
      const fam3 = !!DIENE_BY_ID[alkene.id];
      try { pred = fam3 ? predictDiene(alkene.smiles, reagent) : fam2 ? predictAdd(alkene.smiles, reagent) : predict(alkene.smiles, reagent); } catch (e) { root.append(h('p', 'fb bad', 'This combination is outside the lesson.')); return; }
      const box = h('div', 'rl-run');
      const R = RCFG(reagent);
      box.append(h('p', 'rl-h', `<b>3. Predict</b>: the major product of ${nameHtml(alkene.smiles)} + ${R.label}`));
      const eq = h('div', 'rl-eq');
      eq.innerHTML = `${fig(alkene.smiles, 130, 96)}<span class="rl-plus">+</span><span class="rl-reag">${R.label}</span><span class="rl-arrow">→ ?</span>`;
      box.append(eq);
      const choices = shuffle(rng, fam3 ? dieneChoices(pred) : fam2 ? productChoices2(pred) : productChoices(pred));
      const list = h('div', 'rl-opts', null);
      const fb = h('div', 'fb'); fb.setAttribute('aria-live', 'polite');
      choices.forEach((o) => list.append(optionCard(o, (btn) => {
        if (o.correct) {
          [...list.children].forEach((x) => { x.disabled = true; });
          btn.classList.add('good');
          fb.className = 'fb ok'; fb.textContent = o.why;
          list.after(fb);
          right++;
          if (fam3) reveal3(pred, box); else if (fam2) reveal2(pred, box); else reveal(pred, box);
          if (right >= need && !doneSent) { doneSent = true; ctx.onResult({ ok: true }); }
          else if (ctx.onProgress) ctx.onProgress();
        } else {
          btn.classList.add('bad'); btn.disabled = true;
          fb.className = 'fb bad'; fb.textContent = o.why;
          ctx.onResult({ ok: false, diagnosis: o.why });
        }
      }, fam2 || fam3)));
      box.append(list, fb);
      root.append(box);
    }
    render();
    return { destroy() { mp?.destroy?.(); } };
  }
};
