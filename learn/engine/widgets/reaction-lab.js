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
// Lesson 12: config.alkynes = ids of LAB_ALKYNES with the ALKYNE_LAB_KEYS reagents (HBr / Br2 with 1 or 2 equivalents, H2O + HgSO4, H2 + Lindlar, H2 + Pd/C). The learner
// predicts the product(s) (equivalents, Markovnikov, anti geometry, cis alkene, ketone or mixture), then the lab explains why, shows the overall equation and, for HBr with 1
// equivalent, plays the two-step mechanism.
// Lesson 13: config.eas = ids of LAB_EAS (aromatic substitution on benzene: Br2/FeBr3, Cl2/FeCl3, I2, HNO3/H2SO4, SO3/H2SO4, Friedel-Crafts alkylation and acylation). The learner predicts the
// monosubstituted product (substitution, not addition), then the lab shows the electrophile and how it forms, the sigma complex with its three resonance forms, the product, the overall equation
// and the mechanism. Directing effects are Lesson 14, so the ring is always benzene.
// Lesson 14: config.subst = {arenes: [ids of LAB_SUBST.arenes], reagents: [ids of LAB_EAS]} (or true for the default sets): substituted benzenes. The learner predicts the product(s)
// (ortho + para for an o/p director, meta for a meta director, or a refusal when the combination does not work), then the lab shows the carbocation for ortho, meta and para
// attack with its ring resonance forms, marks the SPECIAL form (the + on the carbon that carries the group), and gives the verdict from the substituent table.
// config: { alkenes?: [ids of LAB_ALKENES or LAB_ALKENES2], reagents?: [ids of REAGENT_IDS or REAGENT_IDS2], need?: n (correct predictions before ctx.onResult({ok:true}), default 1),
//           start?: {alkene, reagent}, seed?: number }
// ctx.onResult({ok:false, diagnosis}) on every wrong prediction; ctx.onResult({ok:true}) once `need` predictions were right.
import { svg as rdSvg } from '../chem.js';
import { LAB_ALKENES, REAGENT_IDS, REAGENTS, ALKENE_BY_ID, predict, productChoices, CLASS_NAME, CLASS_SHORT, stabilityFraction, alkeneName, REAGENTS2, ALKENE2_BY_ID, predictAdd, productChoices2, rightWhy, DIENE_BY_ID, HX, HX_DIENE_IDS, predictDiene, dieneChoices, dieneName, ALKYNE_BY_ID, ALKYNE_RXN, ALKYNE_LAB_KEYS, predictAlkyne, alkyneChoices, alkyneRightWhy, alkyneHXMechanism } from '../reactions.js';
import { LAB_EAS, LAB_EAS_BY_ID, EAS, predictEAS, easChoices, generationOf, netOf, easMechanism, labLabel, BENZENE, LAB_SUBST, LAB_SUBST_BY_ID, predictSubst, substChoices, attackSet, DIRECTORS, BINS } from '../reactions.js';
import { nameBothAny } from '../naming-chain.js';
import mechanismPlayer from './mechanism-player.js';
import { getIupac } from '../store.js';
import { firstTry } from '../first-try.js';
import { describeMol } from '../mol-name.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fig = (smiles, w = 150, hh = 108) => `<span class="rl-svg">${rdSvg(smiles, { style: 'skeletal', width: w, height: hh, showCharge: true })}</span>`;
function rng32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function nameHtml(smiles) {
  let n = null;
  try { n = dieneName(smiles) || alkeneName(smiles) || nameBothAny(smiles); } catch (e) { n = dieneName(smiles) || nameBothAny(smiles); }
  if (!n) return smiles;
  return `<span class="iupac" data-name-new="${n.new}" data-name-old="${n.old}">${getIupac() === 'old' ? n.old : n.new}</span>`;
}

const ALK = { ...ALKENE_BY_ID, ...ALKENE2_BY_ID, ...DIENE_BY_ID, ...ALKYNE_BY_ID };
const RCFG = (id) => REAGENTS[id] || REAGENTS2[id] || HX[id] || ALKYNE_RXN[id];
/** Equation of an addition/oxidation (Lesson 10): structures for organic species, plain chips for [O], H2O, X2 and H2. */
const CHIP = { '[O]': '[O]', O: 'H₂O', BrBr: 'Br₂', ClCl: 'Cl₂', II: 'I₂', '[H][H]': 'H₂', Br: 'HBr', Cl: 'HCl', I: 'HI' };
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
    const alkyneMode = !!config.alkynes && !config.alkenes && !config.dienes;       // Lesson 12
    const easMode = !!config.eas && !config.alkenes && !config.dienes && !config.alkynes;   // Lesson 13
    const substMode = !!config.subst && !easMode && !config.alkenes && !config.dienes && !config.alkynes;   // Lesson 14
    const SUB_CFG = substMode ? (config.subst === true ? LAB_SUBST : { arenes: config.subst.arenes || LAB_SUBST.arenes.map((a) => a.id), reagents: config.subst.reagents || LAB_SUBST.reagents }) : null;
    const BENZ = { id: 'benzene', smiles: BENZENE };
    const alkenes = substMode ? SUB_CFG.arenes.map((id) => LAB_SUBST_BY_ID[id]) : easMode ? [BENZ] : (alkyneMode ? config.alkynes : dieneMode ? config.dienes : (config.alkenes || LAB_ALKENES.map((a) => a.id))).map((id) => ALK[id]);
    const reagents = substMode ? SUB_CFG.reagents : easMode ? config.eas : config.reagents || (alkyneMode ? ALKYNE_LAB_KEYS : dieneMode ? HX_DIENE_IDS : REAGENT_IDS);
    const need = config.need || 1;
    const rng = config.seed != null ? rng32(config.seed) : Math.random;
    let alkene = easMode ? BENZ : config.start ? ALK[config.start.alkene] : null;
    let reagent = config.start ? config.start.reagent : null;
    let right = 0, doneSent = false, mp = null;
    const tried = new Set();   // reactions already attempted (right or wrong): a second visit to one never scores, so retrying cannot inflate the count

    host.innerHTML = '';
    const root = h('div', 'rl');
    host.append(root);

    function pickers() {
      const box = h('div', 'rl-pick');
      box.append(h('p', 'rl-h', substMode ? '<b>1. Pick a substituted benzene</b>' : easMode ? '<b>1. The substrate is benzene</b>' : alkyneMode ? '<b>1. Pick an alkyne</b>' : dieneMode ? '<b>1. Pick a diene</b>' : '<b>1. Pick an alkene</b>'));
      const g1 = h('div', 'rl-alk');
      alkenes.forEach((a) => {
        const b = h('button', 'rl-btn'); b.type = 'button';
        b.setAttribute('aria-pressed', String(alkene === a));
        b.innerHTML = `${fig(a.smiles, 120, 84)}<span class="rl-name">${nameHtml(a.smiles)}</span>`;
        b.addEventListener('click', () => { alkene = a; render(); });
        g1.append(b);
      });
      box.append(g1);
      box.append(h('p', 'rl-h', easMode ? '<b>2. Pick the reagents</b>' : '<b>2. Pick a reagent</b>'));
      const g2 = h('div', 'rl-rea');
      reagents.forEach((id) => {
        const b = h('button', 'btn rl-rbtn'); b.type = 'button';
        b.setAttribute('aria-pressed', String(reagent === id));
        b.textContent = easMode || substMode ? labLabel(LAB_EAS_BY_ID[id]) : RCFG(id).label;
        b.addEventListener('click', () => { reagent = id; render(); });
        g2.append(b);
      });
      box.append(g2);
      return box;
    }

    function optionCard(o, onPick, fam2) {
      const b = h('button', 'rl-opt'); b.type = 'button';
      b.innerHTML = o.smiles.map((s, i) => (i ? '<span class="rl-plus">+</span>' : '') + fig(s, 130, 96)).join('') + (o.smiles.length > 1 ? `<span class="rl-mix">${fam2 ? 'two products' : 'a mixture of both'}</span>` : '');
      { let d = ''; try { d = describeMol(o.smiles.join('.')); } catch (e) { d = ''; } b.setAttribute('aria-label', 'Product option: ' + (d || o.smiles.join(' and '))); if (d) b.insertAdjacentHTML('beforeend', `<span class="sr-only">${d}</span>`); }
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
      again.textContent = right >= need ? 'Try another reaction' : `Try another reaction (${right} of ${need} right on the first try)`;
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
      again.textContent = right >= need ? 'Try another reaction' : `Try another reaction (${right} of ${need} right on the first try)`;
      again.addEventListener('click', () => { alkene = null; reagent = null; render(); root.scrollIntoView?.({ block: 'nearest' }); });
      const act = h('div', 'lb-actions'); act.append(again);
      box.append(act);
    }

    /** Reveal for the Lesson 12 alkynes: why (equivalents, Markovnikov, anti, syn), the product(s), the enol and its ketone, the overall equation, the HBr mechanism. */
    function reveal4(pred, box) {
      box.append(h('p', 'rl-h', '<b>Why</b>'));
      box.append(h('p', 'rl-why', alkyneRightWhy(pred).replace(/^Yes\. /, '')));
      const prod = h('div', 'rl-prod');
      prod.append(h('p', 'rl-h', `<b>Product${pred.products.length > 1 ? 's' : ''}</b>`));
      const row = h('div', 'rl-prow');
      pred.products.forEach((sm, i) => {
        if (i) row.append(h('span', 'rl-plus', pred.outcome === 'mixture' ? 'and' : '+'));
        const nm = nameBothAny(sm);
        row.append(h('figure', 'mol', `<div class="mol-svg">${fig(sm, 170, 120)}</div>${nm ? `<figcaption>${nameHtml(sm)}</figcaption>` : ''}`));
      });
      prod.append(row);
      if (pred.rx.kind === 'hydration' && pred.enol) {
        prod.append(h('p', 'muted small', 'The first product is the enol, drawn here; it is not isolated, because the enol and the ketone interconvert (tautomers) and the equilibrium lies strongly on the side of the ketone.'));
        prod.append(h('div', 'rl-eq', `${fig(pred.enol, 130, 96)}<span class="rl-arrow" aria-label="equilibrium, ketone favoured">⇌</span>${fig(pred.products[0], 130, 96)}`));
      }
      if (pred.outcome === 'mixture') prod.append(h('p', 'muted small', 'Both ends of the triple bond are different, so OH can go on either carbon: a mixture of the two ketones.'));
      box.append(prod);
      if (pred.equation) {
        box.append(h('p', 'rl-h', '<b>Overall equation</b>'));
        box.append(h('div', 'rl-eq', eqHtml({ lhs: pred.equation.lhs, rhs: pred.equation.rhs })));
      }
      let mech = null;
      if (pred.rx.kind === 'HX' && pred.rx.equiv === 1) { try { mech = alkyneHXMechanism(pred.alkyne, pred.rx.X); } catch (e) { mech = null; } }
      if (mech) {
        const mpBox = h('div', 'rl-mech');
        const stage = h('div', 'rl-mp');
        const play = h('button', 'btn primary'); play.type = 'button'; play.textContent = 'Play the mechanism';
        play.addEventListener('click', () => { play.remove(); mpBox.append(stage); mp?.destroy?.(); mp = mechanismPlayer.mount(stage, { mech, mode: 'watch', drawing: 'skeletal' }, { onResult() {} }); });
        box.append(play, mpBox);
      }
      const again = h('button', 'btn ' + (right >= need ? 'primary' : '')); again.type = 'button';
      again.textContent = right >= need ? 'Try another reaction' : `Try another reaction (${right} of ${need} right on the first try)`;
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
      again.textContent = right >= need ? 'Try another reaction' : `Try another reaction (${right} of ${need} right on the first try)`;
      again.addEventListener('click', () => { alkene = null; reagent = null; render(); root.scrollIntoView?.({ block: 'nearest' }); });
      const act = h('div', 'lb-actions'); act.append(again);
      box.append(act);
    }

    /** Reveal for Lesson 13 (aromatic substitution): the electrophile and how it forms, the sigma complex with its three resonance forms, the product, the overall equation, the mechanism. */
    function reveal5(pred, box) {
      const Rg = EAS[pred.reagent];
      const row = (list, w = 120, hh = 88) => {
        const groups = []; list.forEach((x) => { const g = groups.find((y) => y.s === x); if (g) g.n++; else groups.push({ s: x, n: 1 }); });
        return groups.map((g) => (CHIP[g.s] ? `<span class="rl-reag">${g.n > 1 ? g.n + ' ' : ''}${CHIP[g.s]}</span>` : `${g.n > 1 ? `<span class="rl-n">${g.n}</span>` : ''}${fig(g.s, w, hh)}`)).join('<span class="rl-plus">+</span>');
      };
      const gen = generationOf(pred.reagent, pred.halide);
      box.append(h('p', 'rl-h', `<b>Step 1: make the electrophile, ${Rg.Elabel}</b>`));
      box.append(h('div', 'rl-eq', `${row(gen.reactants)}<span class="rl-arrow">→</span>${row(gen.products)}${gen.eMinus ? `<span class="rl-reag">+ ${gen.eMinus} e⁻ to the oxidant</span>` : ''}`));
      box.append(h('p', 'rl-why', gen.text));
      box.append(h('p', 'rl-h', '<b>Step 2: the π electrons of the ring attack the electrophile</b>'));
      const cats = h('div', 'rl-cats rl-res');
      cats.innerHTML = pred.formSmiles.map((f) => `<div class="rl-cat fav">${fig(f, 130, 100)}</div>`).join('<span class="rl-arrow rl-double" aria-label="resonance arrow">↔</span>');
      box.append(cats);
      box.append(h('p', 'rl-why', 'The ring is no longer aromatic: one carbon is sp³ (it holds H and the new group) and the + charge is shared by three carbons (ortho, para, ortho). That carbocation is resonance-stabilised but far less stable than benzene, so this step is the slow one.'));
      box.append(h('p', 'rl-h', '<b>Step 3: a base removes H⁺ from the sp³ carbon</b>'));
      box.append(h('div', 'rl-prow', `<figure class="mol">${fig(pred.product, 160, 116)}<figcaption>${nameHtml(pred.product)}</figcaption></figure>`));
      box.append(h('p', 'rl-why', `The two C–H electrons go back into the ring, so it is aromatic again and the substituted product forms (${Rg.HBlabel}${Rg.catalystLabel && Rg.kind !== 'acid' ? ' and ' + Rg.catalystLabel + ' come back' : ''}).`));
      const net = netOf(pred.reagent, pred.halide);
      box.append(h('p', 'rl-h', '<b>Overall equation</b>'));
      box.append(h('div', 'rl-eq', eqHtml({ lhs: net.reactants, rhs: net.products })));
      box.append(h('p', 'muted small', `${Rg.catalystLabel ? Rg.catalystLabel + ' is a catalyst: it is used up in step 1 and given back in step 3.' : ''} ${net.note || ''}`));
      let mech = null;
      try { mech = easMechanism(pred.reagent, pred.halide); } catch (e) { mech = null; }
      if (mech) {
        const mpBox = h('div', 'rl-mech');
        const stage = h('div', 'rl-mp');
        const play = h('button', 'btn primary'); play.type = 'button'; play.textContent = 'Play the mechanism';
        play.addEventListener('click', () => { play.remove(); mpBox.append(stage); mp?.destroy?.(); mp = mechanismPlayer.mount(stage, { mech, mode: 'watch', drawing: 'skeletal' }, { onResult() {} }); });
        box.append(play, mpBox);
      }
      const again = h('button', 'btn ' + (right >= need ? 'primary' : '')); again.type = 'button';
      again.textContent = right >= need ? 'Try another reaction' : `Try another reaction (${right} of ${need} right on the first try)`;
      again.addEventListener('click', () => { alkene = BENZ; reagent = null; render(); root.scrollIntoView?.({ block: 'nearest' }); });
      const act = h('div', 'lb-actions'); act.append(again);
      box.append(act);
    }

    /** Reveal for Lesson 14: the carbocation for ortho, meta and para attack (ring resonance forms, the special form marked), the verdict, the product(s). */
    function reveal6(pred, box) {
      const entry = LAB_EAS_BY_ID[reagent];
      const set = pred.subs.length === 1 ? attackSet(pred.arene, pred.reagent) : null;
      if (set) {
        const g = DIRECTORS[pred.subs[0].id], gt = pred.subs[0].text || g.label;
        box.append(h('p', 'rl-h', `<b>Why: the carbocation for attack at each position</b> (${gt} is in the bin “${BINS[g.cls].label}”)`));
        const cols = h('div', 'rl-att');
        ['ortho', 'meta', 'para'].forEach((rel) => {
          const a = set[rel];
          const good = g.cls === 'deactM' ? !a.hasSpecial : a.hasSpecial;
          const col = h('div', 'rl-attc' + (pred.rels.includes(rel) ? ' fav' : ''));
          col.append(h('p', 'rl-atth', `<b>${rel[0].toUpperCase() + rel.slice(1)} attack</b>`));
          const row = h('div', 'rl-attf');
          a.forms.forEach((f, i) => {
            if (i) row.append(h('span', 'rl-arrow rl-double', '↔'));
            row.append(h('span', 'rl-attfig' + (f.special ? ' special' : ''), fig(f.smiles, 104, 84)));
          });
          col.append(row);
          let verdict;
          if (!a.hasSpecial) verdict = 'Three forms. The + never sits on the carbon that carries the group.';
          else if (g.cls === 'deactM') verdict = 'One of the forms (outlined) puts the + on the carbon that carries the group, right next to the δ+ atom: very unfavourable.';
          else if (g.donor) verdict = `The outlined form puts the + on the carbon that carries ${gt}, and a fourth form puts it on the ${g.donor} itself, where its lone pair can share it.`;
          else verdict = 'The outlined form puts the + on the carbon that carries the group, where its electron donation helps most.';
          col.append(h('p', 'muted small', verdict));
          col.append(h('p', 'rl-attv ' + (good ? 'ok' : 'bad'), good ? (g.cls === 'deactM' ? 'Favoured: no bad form.' : 'Favoured: extra stabilised form.') : g.cls === 'deactM' ? 'Disfavoured: has the bad form.' : 'Not favoured: no extra form.'));
          cols.append(col);
        });
        box.append(cols);
        if (g.cls === 'deactOP') box.append(h('p', 'rl-why', 'A halogen pulls electrons through the σ bond, so every attack is slower than on benzene (the ring is deactivated). But in ortho and para attack its lone pair can share the + charge, which meta attack cannot do, so the product is still ortho and para.'));
        else box.append(h('p', 'rl-why', g.why));
      } else {
        box.append(h('p', 'rl-h', '<b>Why</b>'));
        box.append(h('p', 'rl-why', pred.why));
      }
      const prod = h('div', 'rl-prod');
      prod.append(h('p', 'rl-h', `<b>Major product${pred.products.length > 1 ? 's' : ''}</b>${pred.products.length > 1 ? ' (a mixture, assumed separable)' : ''}`));
      const prow = h('div', 'rl-prow');
      pred.products.forEach((sm, i) => { if (i) prow.append(h('span', 'rl-plus', 'and')); prow.append(h('figure', 'mol', `<div class="mol-svg">${fig(sm, 160, 116)}</div><figcaption>${nameHtml(sm)}</figcaption>`)); });
      prod.append(prow);
      box.append(prod);
      void entry;
      const again = h('button', 'btn ' + (right >= need ? 'primary' : '')); again.type = 'button';
      again.textContent = right >= need ? 'Try another reaction' : `Try another reaction (${right} of ${need} right on the first try)`;
      again.addEventListener('click', () => { alkene = null; reagent = null; render(); root.scrollIntoView?.({ block: 'nearest' }); });
      const act = h('div', 'lb-actions'); act.append(again);
      box.append(act);
    }

    function render() {
      root.innerHTML = '';
      mp?.destroy?.(); mp = null;
      root.append(pickers());
      if (!alkene || !reagent) {
        root.append(h('p', 'rl-hint muted', alkene || reagent ? 'Now pick the other one.' : `Predict first: you need ${need} prediction${need > 1 ? 's' : ''} right on the FIRST try (a retry shows the answer but does not count).`));
        return;
      }
      let pred;
      const fam2 = !!REAGENTS2[reagent];
      const fam3 = !!DIENE_BY_ID[alkene.id];
      const fam4 = !!ALKYNE_BY_ID[alkene.id];
      const entry = easMode ? LAB_EAS_BY_ID[reagent] : null;
      const sEntry = substMode ? LAB_EAS_BY_ID[reagent] : null;
      try { pred = substMode ? predictSubst(alkene.smiles, sEntry.reagent, sEntry.halide || null) : easMode ? predictEAS(BENZENE, entry.reagent, entry.halide || null) : fam4 ? predictAlkyne(alkene.smiles, reagent) : fam3 ? predictDiene(alkene.smiles, reagent) : fam2 ? predictAdd(alkene.smiles, reagent) : predict(alkene.smiles, reagent); } catch (e) { root.append(h('p', 'fb bad', 'This combination is outside the lesson.')); return; }
      const box = h('div', 'rl-run');
      if (substMode && !pred.ok) {
        box.append(h('p', 'rl-h', `<b>This combination does not work:</b> ${nameHtml(alkene.smiles)} + ${labLabel(sEntry)}`));
        box.append(h('p', 'rl-why', pred.why));
        root.append(box);
        return;
      }
      const R = substMode ? { label: labLabel(sEntry) } : easMode ? { label: labLabel(entry) } : RCFG(reagent);
      box.append(h('p', 'rl-h', `<b>3. Predict</b>: the major product of ${nameHtml(alkene.smiles)} + ${R.label}`));
      const eq = h('div', 'rl-eq');
      eq.innerHTML = `${fig(alkene.smiles, 130, 96)}<span class="rl-plus">+</span><span class="rl-reag">${R.label}</span><span class="rl-arrow">→ ?</span>`;
      box.append(eq);
      const rxnKey = `${alkene.id}|${reagent}`, ft = firstTry(), fresh = !tried.has(rxnKey);
      const choices = shuffle(rng, substMode ? substChoices(pred) : easMode ? easChoices(pred) : fam4 ? alkyneChoices(pred) : fam3 ? dieneChoices(pred) : fam2 ? productChoices2(pred) : productChoices(pred));
      const list = h('div', 'rl-opts', null);
      const fb = h('div', 'fb'); fb.setAttribute('aria-live', 'polite');
      choices.forEach((o) => list.append(optionCard(o, (btn) => {
        tried.add(rxnKey);
        if (o.correct) {
          [...list.children].forEach((x) => { x.disabled = true; });
          btn.classList.add('good');
          const counts = ft.right() && fresh;   // only a first answer that was right scores
          fb.className = 'fb ok'; fb.textContent = o.why + (counts ? '' : (fresh ? ' This does not count: your first answer was wrong, so it is logged as a slip. Pick another reaction and get it right first time.' : ' This reaction was already tried, so it does not count again. Pick another one.'));
          list.after(fb);
          if (counts) right++;
          if (substMode) reveal6(pred, box); else if (easMode) reveal5(pred, box); else if (fam4) reveal4(pred, box); else if (fam3) reveal3(pred, box); else if (fam2) reveal2(pred, box); else reveal(pred, box);
          // the "Why" paragraph the reveal just wrote must not repeat the feedback line word for word
          { const said = fb.textContent.replace(/^Yes.s*/, '').split(' This does not count')[0].split(' This reaction was already')[0].trim(); if (said && [...box.querySelectorAll('.rl-why')].some((p) => p.textContent.trim() === said)) fb.textContent = 'Yes, that is the major product.' + fb.textContent.slice(fb.textContent.indexOf(said) + said.length); }
          if (counts && right >= need && !doneSent) { doneSent = true; ctx.onResult({ ok: true }); }
          else if (ctx.onProgress) ctx.onProgress();
        } else {
          ft.wrong();
          btn.classList.add('bad'); btn.disabled = true;
          fb.className = 'fb bad'; fb.textContent = o.why;
          ctx.onResult({ ok: false, diagnosis: o.why });
        }
      }, fam2 || fam3 || fam4)));
      box.append(list, fb);
      root.append(box);
    }
    render();
    return { destroy() { mp?.destroy?.(); } };
  }
};
