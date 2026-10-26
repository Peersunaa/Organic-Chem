// The settings card of the reaction practice pages (DOM glue; the markup and every rule are in engine/reactions-custom.js, which tests/reaction-modes.mjs checks).
// It follows the naming card: collapsible, chips of the same look, presets that save and load, a Start button.
import * as C from './engine/reactions-custom.js';
import * as store from './engine/store.js';

const OPEN_KEY = 'reactions-open', CARDS_KEY = 'reactions-cards-open';
const flag = (k) => { try { return store.getUi(k) === true; } catch (e) { return false; } };
const remember = (k, v) => { try { store.setUi(k, v); } catch (e) { /* ignore */ } };
const MULTI = ['substrates', 'families', 'cards', 'modes'];
const KEEP_ONE = ['substrates', 'families', 'cards'];

/**
 * A settings card.
 *   where   'landing' (#reactions-practice), 'practice' (one mode's page) or 'mix' (the mixed session)
 *   playId  what the page practises (a mode id or C.MIX_ID): the notice is computed for it
 *   onChange(S)   called after every change (the landing page refreshes its counts)
 *   onStart()     restart this page with the settings;  onStartMix()  open the mixed session
 */
export function reactionSettingsCard({ where = 'practice', playId, onChange, onStart, onStartMix } = {}) {
  const bar = document.createElement('div');
  bar.className = 'nl-bar nl-card rs-card'; bar.id = 'rs-card';
  const st = { S: C.currentSettings(), open: flag(OPEN_KEY), cardsOpen: flag(CARDS_KEY), dirty: false, error: '' };
  const reportFor = () => {
    if (where === 'landing') return st.S.modes.length ? C.reactionReport(C.MIX_ID, st.S) : null;
    return C.reactionReport(playId || C.MIX_ID, st.S);
  };
  const paint = (focus) => {
    bar.innerHTML = C.settingsCardHtml(st.S, { open: st.open, cardsOpen: st.cardsOpen, report: reportFor(), dirty: st.dirty, error: st.error, where, hasWeakData: C.hasWeakData() });
    if (focus) { const el = bar.querySelector(focus); if (el) el.focus(); }
  };
  const commit = (S, content) => {
    st.S = C.setCurrentSettings(S); st.error = '';
    if (content && where !== 'landing') st.dirty = true;
    if (onChange) onChange(st.S);
  };
  const start = () => { st.dirty = false; C.setCurrentSettings(st.S); if (onStart) onStart(); };
  const startMix = () => { st.dirty = false; C.setCurrentSettings(st.S); if (onStartMix) onStartMix(); };
  const sel = (g, v) => `[data-g="${g}"][data-v="${v}"]`;

  bar.addEventListener('click', (ev) => {
    const t = ev.target.closest ? ev.target.closest('button') : null;
    if (!t || !bar.contains(t) || t.disabled) return;
    if (t.classList.contains('nl-toggle')) { st.open = !st.open; remember(OPEN_KEY, st.open); paint('.nl-toggle'); return; }
    if (t.classList.contains('rs-cardstoggle')) { st.cardsOpen = !st.cardsOpen; remember(CARDS_KEY, st.cardsOpen); paint('.rs-cardstoggle'); return; }
    if (t.classList.contains('nl-start')) { start(); return; }
    if (t.classList.contains('rs-startmix')) { startMix(); return; }
    if (t.dataset.preset) {
      const P = C.loadPreset(t.dataset.preset, { count: st.S.count, timer: st.S.timer, weak: st.S.weak });
      if (!P) return;
      commit(P, false); st.dirty = false;
      if (where === 'landing') { paint(`[data-preset="${CSS.escape(t.dataset.preset)}"]`); return; }
      if (P.modes.length) startMix(); else start();
      return;
    }
    if (t.dataset.del) { C.deletePreset(t.dataset.del); st.error = ''; paint('.nl-name'); return; }
    if (t.dataset.gall || t.dataset.gnone) {
      const gid = t.dataset.gall || t.dataset.gnone, grp = C.CARD_GROUPS.find((g) => g.id === gid);
      if (!grp) return;
      const rest = st.S.cards.filter((c) => !grp.cards.includes(c));
      const next = t.dataset.gall ? C.CARD_IDS.filter((c) => rest.includes(c) || grp.cards.includes(c)) : rest;
      if (!next.length) { st.error = 'Keep at least one card.'; paint(`[data-gnone="${gid}"]`); return; }
      commit(C.changeSettings(st.S, { cards: next }), true);
      paint(`[data-g${t.dataset.gall ? 'all' : 'none'}="${gid}"]`);
      return;
    }
    const g = t.dataset.g; if (!g) return;
    const v = t.dataset.v; const S = st.S;
    if (MULTI.includes(g)) {
      const cur = S[g]; const next = cur.includes(v) ? cur.filter((x) => x !== v) : cur.concat(v);
      if (!next.length && KEEP_ONE.includes(g)) { st.error = 'Keep at least one choice in each list.'; paint(sel(g, v)); return; }
      commit(C.changeSettings(S, { [g]: next }), true);
    } else if (g === 'weak') commit(C.changeSettings(S, { weak: !S.weak }), true);
    else commit(C.changeSettings(S, { [g]: g === 'count' || g === 'timer' ? Number(v) : v }), g !== 'count' && g !== 'timer');
    paint(sel(g, v));
  });
  bar.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const inp = bar.querySelector('.nl-name'); const r = C.savePreset(inp ? inp.value : '', st.S);
    if (r.ok) { st.S = C.setCurrentSettings({ ...st.S, preset: r.name }); st.error = ''; paint('.nl-name'); if (onChange) onChange(st.S); }
    else { st.error = r.error; paint('.nl-name'); }
  });
  paint();
  return bar;
}
