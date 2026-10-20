// Reaction builder screen (#build): substrate tiles, reagent tiles (grouped as the professor numbers them), and the result: products with shares, the facts,
// the professor's rule and why, the mechanism (scene, else the step player, else the hub card's scheme), the energy sketch for ring reactions, no-reaction cards,
// "Use this product next" chaining with a breadcrumb and "Copy route as text", a coverage counter, "Random pair" and "Quiz me".
// 400 px: each picker is one horizontally scrollable row of tiles under group tabs; 1000 px and up: three columns. All chemistry comes from engine/builder.js.
import { h, molFigure, nameSpan, setIupacMode } from './engine/steps.js';
import { svg as rdSvg } from './engine/chem.js';
import * as B from './engine/builder.js';
import { SPACE_TEXT } from './engine/reaction-hub.js';
import { t, tAuto, onVoiceChange } from './engine/voice.js';
import { sceneToggle } from './scenes/scene-view.js';
import { SCENE_BY_ID } from './scenes/scene-index.js';
import mechanismPlayer from './engine/widgets/mechanism-player.js';
import energyDiagram from './engine/widgets/energy-diagram.js';
import * as store from './engine/store.js';

const KEY = 'orgo.builder.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } };
const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* storage blocked: nothing to keep */ } };
const iupac = () => { try { return store.getIupac() === 'old' ? 'old' : 'new'; } catch (e) { return 'new'; } };
const TOP_OF_KIND = { alkene: 'alkene', alkyne: 'alkyne', arene: 'ring' };
/** Keep the chosen tile in view inside its horizontally scrolling row (phones), without moving the page. */
const showOn = (row) => requestAnimationFrame(() => { const on = row.querySelector('.is-on'); if (on && row.scrollWidth > row.clientWidth + 4) row.scrollLeft = Math.max(0, row.scrollLeft + on.getBoundingClientRect().left - row.getBoundingClientRect().left - 8); });
const TAB_OF = (s) => (s.group === 'ring2' ? 'ring2' : s.group);

function nameNode(smiles, fallback) {
  const n = B.nameOf(smiles);
  if (n) return nameSpan(n);
  return h('span', {}, fallback || B.describe(smiles));
}
function tileSvg(smiles, w = 108, hh = 76) {
  return h('span', { class: 'bld-svg', 'aria-hidden': 'true', html: rdSvg(smiles, { width: w, height: hh, style: 'skeletal' }) });
}
function shareChip(p, res) {
  let txt = null, cls = 'chip';
  if (p.share != null) { txt = (p.share >= 1 ? Math.round(p.share) : p.share) + '%'; cls += p.minor ? '' : ' ok'; }
  else if (p.excess) txt = 'excess HNO₃';
  else if (p.minor) txt = 'minor';
  else if (p.major && res.products.length === 1) txt = '1 isomer';
  else if (p.major || res.products.some((x) => x.minor)) txt = 'major';
  else if (res.products.filter((x) => !x.excess).length > 1) txt = 'mixture';
  return txt ? h('span', { class: cls + ' bld-share' }, txt) : null;
}

/** #build: returns the nodes app.js mounts under the header. */
export function builderPage(chemReady) {
  const saved = load();
  const st = { sub: saved.sub || 'Cc1ccccc1', subTab: saved.subTab || 'ring', rtab: saved.rtab || 'ring', reagent: saved.reagent || null, chain: [], quiz: false, quizPick: null, custom: '' };
  const lhead = h('div', { class: 'lhead' }, h('a', { class: 'back-home', href: '#home' }, '← Home'), h('h1', { class: 'ltitle' }, 'Reaction builder'),
    h('p', { class: 'lede' }, 'Pick a starting material, pick a reagent, and see what forms, where, and why, with the professor’s rule by name. Then use the product as the next starting material.'));
  const root = h('div', { class: 'bld', id: 'bld' });
  const bar = h('div', { class: 'bld-bar' });
  const crumbs = h('nav', { class: 'bld-crumbs', 'aria-label': 'Your route so far', hidden: 'hidden' });
  const colS = h('section', { class: 'bld-col bld-subs', 'aria-labelledby': 'bld-sh' });
  const colR = h('section', { class: 'bld-col bld-rgts', 'aria-labelledby': 'bld-rh' });
  const colX = h('section', { class: 'bld-col bld-res', 'aria-labelledby': 'bld-xh', 'aria-live': 'polite' });
  const cols = h('div', { class: 'bld-cols' }, colS, colR, colX);
  root.append(bar, crumbs, cols);
  root.append(h('p', { class: 'muted' }, 'Loading chemistry engine…'));

  const persist = () => save({ sub: st.chain.length ? null : st.sub, subTab: st.subTab, rtab: st.rtab, reagent: st.reagent });

  // ---------------------------------------------------------------- top bar: counter, random pair, quiz
  const total = B.SUBSTRATES.length * B.REAGENTS.length;
  const counter = h('p', { class: 'bld-count small', id: 'bld-count' }, h('b', {}, String(B.PAIR_COUNT)), ` substrate × reagent pairs give a product (of ${total} on the tiles); every other pair explains why not.`);
  const randomB = h('button', { type: 'button', class: 'btn small', id: 'bld-random' }, 'Random pair');
  const quizB = h('button', { type: 'button', class: 'btn small', id: 'bld-quiz', 'aria-pressed': 'false' }, 'Quiz me');
  bar.append(counter, h('div', { class: 'bld-barbtns' }, randomB, quizB));

  // ---------------------------------------------------------------- substrates
  const tabRow = (items, cur, onPick, label, idp) => {
    const row = h('div', { class: 'bld-tabs', role: 'tablist', 'aria-label': label });
    items.forEach((it) => {
      const b = h('button', { type: 'button', role: 'tab', class: 'btn small bld-tab', id: idp + it.id, 'aria-selected': String(it.id === cur), 'aria-pressed': String(it.id === cur) }, it.label);
      b.addEventListener('click', () => onPick(it.id));
      row.append(b);
    });
    return row;
  };
  function drawSubs() {
    colS.innerHTML = '';
    colS.append(h('h2', { id: 'bld-sh', class: 'bld-h' }, h('span', { class: 'bld-step' }, '1'), 'Starting material'));
    const tabs = B.SUBSTRATE_GROUPS.concat([{ id: 'custom', label: 'Your own' }]);
    colS.append(tabRow(tabs, st.subTab, (id) => { st.subTab = id; persist(); drawSubs(); }, 'Substrate groups', 'bld-st-'));
    if (st.subTab === 'custom') {
      const inp = h('input', { type: 'text', class: 'bld-input', id: 'bld-custom', placeholder: 'SMILES or a name: CC=C, toluene …', autocomplete: 'off', spellcheck: 'false', value: st.custom });
      const go = h('button', { type: 'button', class: 'btn small primary', id: 'bld-custom-go' }, 'Use it');
      const msg = h('p', { class: 'small bld-custom-msg', 'aria-live': 'polite' });
      const use = () => {
        st.custom = inp.value;
        const r = B.resolveSubstrate(inp.value);
        if (!r.ok) { msg.className = 'small bld-custom-msg fb bad'; msg.textContent = r.why; return; }
        msg.className = 'small bld-custom-msg muted'; msg.textContent = `Read as ${r.kind === 'arene' ? 'a benzene ring' : 'an ' + r.kind}.`;
        pickSub(r.smiles, false);
      };
      go.addEventListener('click', use);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') use(); });
      colS.append(h('div', { class: 'bld-custom' }, h('label', { for: 'bld-custom', class: 'small' }, 'Type a SMILES or a course name'), h('div', { class: 'bld-customrow' }, inp, go), msg));
      return;
    }
    const row = h('div', { class: 'bld-row', role: 'group', 'aria-label': 'Starting materials' });
    B.SUBSTRATES.filter((s) => TAB_OF(s) === st.subTab).forEach((s) => {
      const on = s.smiles === st.sub;
      const b = h('button', { type: 'button', class: 'bld-tile bld-stile' + (on ? ' is-on' : ''), 'aria-pressed': String(on), 'data-sub': s.id, title: s.smiles }, tileSvg(s.smiles), h('span', { class: 'bld-tname' }, nameNode(s.smiles, s.id)));
      b.addEventListener('click', () => pickSub(s.smiles, true));
      row.append(b);
    });
    colS.append(row);
    showOn(row);
  }
  function pickSub(smiles, fromTile) {
    if (fromTile) st.chain = [];
    st.sub = smiles;
    const k = B.classifySubstrate(smiles);
    const want = TOP_OF_KIND[k.kind];
    const cur = st.reagent && B.REAGENT_BY_ID[st.reagent];
    if (want && (!cur || cur.top !== want)) { st.rtab = want; st.reagent = null; }
    st.quizPick = null;
    persist();
    drawSubs(); drawRgts(); drawCrumbs(); drawResult();
  }

  // ---------------------------------------------------------------- reagents
  function drawRgts() {
    colR.innerHTML = '';
    colR.append(h('h2', { id: 'bld-rh', class: 'bld-h' }, h('span', { class: 'bld-step' }, '2'), 'Reagent'));
    colR.append(tabRow(B.TOPS, st.rtab, (id) => { st.rtab = id; persist(); drawRgts(); }, 'Reagent groups', 'bld-rt-'));
    const row = h('div', { class: 'bld-row bld-rrow', role: 'group', 'aria-label': 'Reagents' });
    B.REAGENT_GROUPS.filter((g) => g.top === st.rtab).forEach((g) => {
      row.append(h('p', { class: 'bld-ghead' }, g.num ? h('span', { class: 'bld-num' }, g.num) : null, g.label));
      B.REAGENTS.filter((r) => r.group === g.id).forEach((r) => {
        const res = B.react(st.sub, r.id);
        const on = r.id === st.reagent;
        const b = h('button', { type: 'button', class: `bld-tile bld-rtile is-${res.status}` + (on ? ' is-on' : ''), 'aria-pressed': String(on), 'data-rgt': r.id },
          g.num ? h('span', { class: 'bld-num', 'aria-hidden': 'true' }, g.num) : null,
          h('span', { class: 'bld-rlabel' }, r.label),
          h('span', { class: 'bld-rstat small' }, res.status === 'ok' ? 'reacts' : res.status === 'none' ? 'no reaction' : 'not modelled'));
        b.addEventListener('click', () => { st.reagent = r.id; st.quizPick = null; persist(); drawRgts(); drawResult(); });
        row.append(b);
      });
    });
    colR.append(row);
    showOn(row);
  }

  // ---------------------------------------------------------------- chain breadcrumb
  function drawCrumbs() {
    crumbs.innerHTML = '';
    crumbs.hidden = !st.chain.length;
    if (!st.chain.length) return;
    const list = h('ol', { class: 'bld-crumblist' });
    const first = st.chain[0].from;
    const crumb = (smiles, i) => {
      const b = h('button', { type: 'button', class: 'bld-crumb' + (smiles === st.sub && i === st.chain.length ? ' is-on' : ''), title: 'Go back to this compound' }, nameNode(smiles));
      b.addEventListener('click', () => { st.chain = st.chain.slice(0, i); st.sub = smiles; st.reagent = null; const k = B.classifySubstrate(smiles); if (TOP_OF_KIND[k.kind]) st.rtab = TOP_OF_KIND[k.kind]; drawSubs(); drawRgts(); drawCrumbs(); drawResult(); });
      return b;
    };
    list.append(h('li', {}, crumb(first, 0)));
    st.chain.forEach((s, i) => list.append(h('li', { class: 'bld-crumbstep' }, h('span', { class: 'bld-crumbrx small' }, '→ ' + B.REAGENT_BY_ID[s.reagentId].label + ' →'), crumb(s.to, i + 1))));
    const copyB = h('button', { type: 'button', class: 'btn small ghost', id: 'bld-copy' }, 'Copy route as text');
    const clearB = h('button', { type: 'button', class: 'btn small ghost', id: 'bld-clear' }, 'Start a new route');
    const out = h('p', { class: 'small bld-copied', 'aria-live': 'polite' });
    copyB.addEventListener('click', async () => {
      const text = B.routeText(st.chain, iupac());
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { ok = false; }
      out.innerHTML = '';
      if (ok) out.textContent = 'Copied: ' + text;
      else { const ta = h('textarea', { class: 'bld-routebox', rows: '3', readonly: 'readonly', 'aria-label': 'Route as text' }); ta.value = text; out.append('Select and copy:', ta); ta.select?.(); }
    });
    clearB.addEventListener('click', () => { st.chain = []; drawCrumbs(); drawResult(); });
    crumbs.append(h('p', { class: 'bld-crumbhead small' }, h('b', {}, `Your route: ${st.chain.length} step${st.chain.length > 1 ? 's' : ''}`)), list, h('div', { class: 'bld-crumbbtns' }, copyB, clearB), out);
  }

  // ---------------------------------------------------------------- result
  let liveWidgets = [];
  const dropWidgets = () => { liveWidgets.forEach((w) => { try { w.destroy && w.destroy(); } catch (e) { /* ignore */ } }); liveWidgets = []; };
  function productCard(p, res, i) {
    const useB = h('button', { type: 'button', class: 'btn small bld-use', 'data-use': String(i) }, 'Use this product next');
    useB.addEventListener('click', () => {
      st.chain.push({ from: res.substrate, reagentId: res.reagent.id, to: p.smiles });
      st.subTab = 'custom';
      const k = B.classifySubstrate(p.smiles);
      st.sub = p.smiles; st.reagent = null; st.quizPick = null;
      if (TOP_OF_KIND[k.kind]) st.rtab = TOP_OF_KIND[k.kind];
      st.custom = p.smiles;
      persist();
      drawSubs(); drawRgts(); drawCrumbs(); drawResult();
      colX.scrollIntoView?.({ block: 'start', behavior: 'auto' });
    });
    const canUse = B.classifySubstrate(p.smiles).kind !== 'none';
    return h('figure', { class: 'bld-prod' + (p.minor ? ' is-minor' : '') + (p.excess ? ' is-excess' : '') },
      molFigure(p.smiles, '', { style: 'skeletal', width: 200, height: 150, alt: B.describe(p.smiles) }),
      h('figcaption', {}, h('span', { class: 'bld-pname' }, nameNode(p.smiles)), shareChip(p, res), p.label ? h('span', { class: 'muted small bld-plabel' }, tAuto(p.label)) : null),
      canUse ? useB : null);
  }
  function factsBlock(res) {
    const f = res.facts;
    if (!f) return null;
    const chip = (k, v) => (v ? h('li', { class: 'chip hub-chip' }, h('span', { class: 'hub-chip-k' }, k), h('span', { class: 'hub-chip-v' }, v)) : null);
    if (f.ring) return h('ul', { class: 'hub-facts bld-facts', 'aria-label': 'Facts' }, chip('What adds', t(f.adds)), chip('Which position', tAuto(f.where)), chip('Director', tAuto(f.director)));
    return h('ul', { class: 'hub-facts bld-facts', 'aria-label': 'Three facts' }, chip('What adds', t(f.adds, f.cave && f.cave.adds)), chip('Where it adds', t(f.where, f.cave && f.cave.where)), chip('How, in space', SPACE_TEXT[f.space] || f.space));
  }
  function mechBlock(res) {
    const M = res.mechanism || {};
    const box = h('div', { class: 'bld-mech' }, h('p', { class: 'hub-label' }, 'Mechanism'));
    const btns = h('div', { class: 'rx-btns' });
    const panels = h('div', { class: 'bld-mechpanels' });
    box.append(btns, panels);
    if (M.scene && SCENE_BY_ID[M.scene]) {
      const tg = sceneToggle(M.scene, { label: 'Watch the scene', cls: 'btn small bld-watch' });
      btns.append(tg.button); panels.append(tg.panel);
      box.append(h('p', { class: 'muted small' }, `Scene: ${SCENE_BY_ID[M.scene].title}. The arrows are the same for your molecule.`));
    }
    if (M.hasMech) {
      const host = h('div', { class: 'bld-player', hidden: 'hidden' });
      const b = h('button', { type: 'button', class: 'btn small ghost', id: 'bld-steps', 'aria-expanded': 'false' }, 'Step through the arrows');
      b.addEventListener('click', () => {
        if (!host.hidden) { host.hidden = true; host.innerHTML = ''; b.setAttribute('aria-expanded', 'false'); return; }
        const full = B.react(res.substrate, res.reagent.id, { full: true });
        const mech = full.mechanism && full.mechanism.mech;
        host.hidden = false; b.setAttribute('aria-expanded', 'true');
        if (!mech) { host.append(h('p', { class: 'muted small' }, 'No step-by-step mechanism for this pair.')); return; }
        if (full.mechanism.mechOnBenzene) host.append(h('p', { class: 'muted small' }, 'Drawn on benzene: the electrophile and the arrows are the same; the groups only decide WHERE it attacks.'));
        const inner = h('div', {});
        host.append(inner);
        try { liveWidgets.push(mechanismPlayer.mount(inner, { mech, mode: 'watch', whatIf: false }, { onResult() {}, onProgress() {} }) || {}); } catch (e) { inner.append(h('p', { class: 'fb bad' }, 'The mechanism could not be drawn.')); }
      });
      btns.append(b); panels.append(host);
    }
    if (M.alsoScene && SCENE_BY_ID[M.alsoScene]) {
      const tg = sceneToggle(M.alsoScene, { label: 'Why ortho/para or meta (scene)', cls: 'btn small ghost bld-watch2' });
      btns.append(tg.button); panels.append(tg.panel);
    }
    if (!M.scene && !M.hasMech && M.scheme && M.scheme.example) {
      const ex = M.scheme.example;
      box.append(h('p', { class: 'muted small' }, 'No animated mechanism for this reagent; here is the worked example from its reaction card:'));
      box.append(h('div', { class: 'bld-scheme' }, molFigure(ex.substrate.split('.')[0], '', { style: 'skeletal', width: 140, height: 100 }), h('span', { class: 'eqn-arrow', 'aria-hidden': 'true' }, '→', h('small', {}, ex.reagent || '')), ...ex.product.split('.').map((s) => molFigure(s, '', { style: 'skeletal', width: 140, height: 100 }))));
    }
    if (M.card) btns.append(h('a', { class: 'btn small ghost', href: '#reactions/' + M.card }, 'Open the reaction card'));
    return box;
  }
  function energyBlock(res) {
    const E = res.energy;
    if (!E) return null;
    const host = h('div', { class: 'bld-energy' });
    const det = h('details', { class: 'bld-edet', open: 'open' }, h('summary', {}, 'Energy sketch: σ-complexes (professor, pages 7–8)'), host);
    try { liveWidgets.push(energyDiagram.mount(host, { mode: 'view', levels: E.main.levels, label: E.main.label, overlay: E.overlay ? { levels: E.overlay.levels, label: E.overlay.label } : undefined, caption: tAuto(E.caption) }, { onResult() {}, onProgress() {} }) || {}); } catch (e) { host.append(h('p', { class: 'muted small' }, E.caption)); }
    return det;
  }
  function quizBlock(res) {
    const q = B.quizFor(res.substrate, res.reagent.id);
    if (!q) return null;
    const box = h('div', { class: 'bld-quiz', id: 'bld-quizbox' }, h('p', { class: 'hub-label' }, 'Quiz'), h('p', { class: 'bld-qprompt' }, q.prompt));
    const grid = h('div', { class: 'bld-qopts' });
    const fb = h('p', { class: 'small', 'aria-live': 'polite' });
    q.options.forEach((o, i) => {
      const b = h('button', { type: 'button', class: 'bld-qopt', 'data-opt': String(i), 'data-correct': String(!!o.correct) }, h('span', { class: 'bld-qletter' }, 'ABCD'[i]), ...o.smiles.map((s) => tileSvg(s, 140, 96)), h('span', { class: 'sr-only' }, o.smiles.map((s) => B.describe(s)).join(' and ')));
      b.addEventListener('click', () => {
        grid.querySelectorAll('.bld-qopt').forEach((x) => x.classList.remove('is-bad'));
        if (o.correct) { st.quizPick = 'right'; b.classList.add('is-good'); fb.className = 'fb ok small'; fb.textContent = tAuto(o.why); setTimeout(() => drawResult(true), 900); }
        else { b.classList.add('is-bad'); fb.className = 'fb bad small'; fb.textContent = tAuto(o.why); }
      });
      grid.append(b);
    });
    const reveal = h('button', { type: 'button', class: 'btn small ghost', id: 'bld-reveal' }, 'Show the answer');
    reveal.addEventListener('click', () => { st.quizPick = 'shown'; drawResult(true); });
    box.append(grid, fb, h('div', { class: 'rx-btns' }, reveal), h('p', { class: 'muted small' }, q.source === 'drill' ? 'Options from the predict-the-product drill: each wrong one is a slip with its own reason.' : 'Options: what three other reagents give on the same starting material.'));
    return box;
  }
  function drawResult(keepQuiz = false) {
    dropWidgets();
    colX.innerHTML = '';
    colX.append(h('h2', { id: 'bld-xh', class: 'bld-h' }, h('span', { class: 'bld-step' }, '3'), 'What forms'));
    const subFig = h('div', { class: 'bld-subfig' }, molFigure(st.sub, '', { style: 'skeletal', width: 170, height: 120, alt: B.describe(st.sub) }), h('p', { class: 'bld-subname' }, nameNode(st.sub)));
    if (!st.reagent) {
      colX.append(subFig, h('p', { class: 'muted bld-empty', id: 'bld-pick' }, 'Now pick a reagent. Tiles marked “reacts” give a product with this starting material.'));
      return;
    }
    const res = B.react(st.sub, st.reagent);
    const eq = h('div', { class: 'bld-eq' }, subFig, h('div', { class: 'bld-arrow' }, h('span', { 'aria-hidden': 'true' }, '→'), h('b', {}, res.reagent.label)));
    colX.append(eq);
    if (res.status !== 'ok') {
      colX.append(h('div', { class: 'card bld-none', id: 'bld-none', role: 'note' },
        h('p', { class: 'bld-none-h' }, res.status === 'none' ? 'No reaction' : 'Not modelled here'),
        h('p', {}, tAuto(String(res.reason).replace(/^No reaction[.:]\s*/, ''))),
        res.mechanism && res.mechanism.card ? h('a', { class: 'btn small ghost', href: '#reactions/' + res.mechanism.card }, 'Open the reaction card') : null));
      return;
    }
    if (st.quiz && !keepQuiz && st.quizPick == null) {
      const qb = quizBlock(res);
      if (qb) { colX.append(qb); return; }
    }
    const grid = h('div', { class: 'bld-prods', id: 'bld-prods' });
    res.products.forEach((p, i) => grid.append(productCard(p, res, i)));
    colX.append(grid);
    if (res.source) colX.append(h('p', { class: 'muted small bld-source' }, 'Shares: ' + res.source + '.'));
    colX.append(h('div', { class: 'bld-why', id: 'bld-why' },
      h('p', { class: 'bld-rule' }, h('span', { class: 'hub-label' }, 'Professor’s rule'), h('b', { class: 'bld-rulename' }, t(res.ruleName || '', res.ruleCave))),
      h('p', {}, tAuto(res.why))));
    const fb = factsBlock(res);
    if (fb) colX.append(fb);
    if (res.warnings && res.warnings.length) colX.append(h('ul', { class: 'bld-warn', 'aria-label': 'Notes' }, res.warnings.map((w) => h('li', { 'data-w': w.id }, tAuto(w.text)))));
    const en = energyBlock(res);
    if (en) colX.append(en);
    colX.append(mechBlock(res));
  }

  // ---------------------------------------------------------------- buttons
  randomB.addEventListener('click', () => {
    for (let i = 0; i < 400; i++) {
      const s = B.SUBSTRATES[Math.floor(Math.random() * B.SUBSTRATES.length)];
      const r = B.REAGENTS[Math.floor(Math.random() * B.REAGENTS.length)];
      if (B.react(s.smiles, r.id).status !== 'ok') continue;
      st.chain = []; st.sub = s.smiles; st.subTab = TAB_OF(s); st.rtab = r.top; st.reagent = r.id; st.quizPick = null;
      persist(); drawSubs(); drawRgts(); drawCrumbs(); drawResult();
      return;
    }
  });
  quizB.addEventListener('click', () => { st.quiz = !st.quiz; st.quizPick = null; quizB.setAttribute('aria-pressed', String(st.quiz)); drawResult(); });

  Promise.resolve(chemReady).then(() => {
    root.lastChild.remove();
    if (!B.classifySubstrate(st.sub).smiles) st.sub = 'Cc1ccccc1';
    if (st.reagent && !B.REAGENT_BY_ID[st.reagent]) st.reagent = null;
    if (!B.SUBSTRATES.some((s) => s.smiles === st.sub)) st.subTab = 'custom';
    drawSubs(); drawRgts(); drawCrumbs(); drawResult();
    setIupacMode(iupac());
    const off = onVoiceChange(() => { if (!root.isConnected) { off(); return; } drawResult(true); });
  }).catch(() => { root.innerHTML = '<p class="fb bad">The chemistry engine could not load. Reload the page to try again.</p>'; });
  return [lhead, root];
}
