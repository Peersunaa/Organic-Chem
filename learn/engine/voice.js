// Caveman voice (Piece 3 UI). One switch in the header; views ask `t(normal, caveman)` for their text and re-paint on `onVoiceChange`.
//   t(normal, caveman)       the caveman string when the mode is on AND one exists, else the normal text.
//   tAuto(normal, caveman?)  like t, but when the mode is on and there is no caveman string, the text is squeezed by compress() (the player's why lines, the drill feedback).
//   compress(text)           the rule-based squeezer, pure (no DOM, no storage): see the rules below.
//   onVoiceChange(fn)        fn() runs after every toggle; returns a function that stops listening.
// The mode itself lives in engine/store.js (getCaveman / setCaveman, default off, wrapped in try/catch there).
import * as store from './store.js';

const listeners = new Set();
export function cavemanOn() { try { return store.getCaveman() === true; } catch (e) { return false; } }
export function setCaveman(on) {
  try { store.setCaveman(!!on); } catch (e) { /* storage blocked: the mode just does not stick */ }
  [...listeners].forEach((fn) => { try { fn(cavemanOn()); } catch (e) { /* one broken view must not stop the rest */ } });
}
export function onVoiceChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function t(normal, caveman) { return cavemanOn() && typeof caveman === 'string' && caveman.trim() ? caveman : normal; }
export function tAuto(normal, caveman) {
  if (!cavemanOn()) return normal;
  return typeof caveman === 'string' && caveman.trim() ? caveman : compress(normal);
}

export const MAX_CAVEMAN = 90;
// words that may open a clause after a comma split and carry no chemistry
const LEAD = /^(?:and|so|but|which|then|that|because|while|where|when|as|also|now)\s+/i;
const ARTICLE = /(^|[\s(])(?:the|a|an)(?=\s)/gi;

/**
 * Rules, in order (chemical tokens such as H₃O⁺, (CH₃)₃C⁺, C=C, π, sp³, 2,3-dimethyl, H–Br are never touched, because every rule works on whole words made of letters or on
 * punctuation that is followed by a space):
 *  1. drop parentheticals that hold a sentence fragment, i.e. "( ... )" with a space inside; formula groups such as (CH₃)₃C or (E) have no space and stay;
 *  2. split into short sentences on ". ", "; ", ": " and on ", " (a comma with no space after it, as in 2,3-dimethyl, is not a split);
 *  3. in each sentence drop the opening conjunction (and, so, but, which ...) and every article (the, a, an);
 *  4. capitalise the first word when it is plain lowercase letters (never "pKa" or "sp³"), end with a full stop;
 *  5. cap at 90 characters: keep whole sentences while they fit; if even the first one is too long, cut it at a word boundary.
 */
export function compress(text) {
  const src = String(text == null ? '' : text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!src) return '';
  let s = src.replace(/\s*\([^()]*\s[^()]*\)/g, '');                      // 1
  const parts = s.split(/(?:(?<=[.!?])|[;:,])\s+/).map((x) => x.trim()).filter(Boolean);   // 2
  const out = [];
  for (let p of parts) {
    p = p.replace(/[.!?]+$/, '').replace(LEAD, '');                      // 3
    p = (' ' + p).replace(ARTICLE, '$1').replace(/\s+/g, ' ').trim();
    if (!p) continue;
    p = p.replace(/^[a-z]+(?![a-z0-9₀-₉⁰-⁹⁺⁻])/, (w) => (w.length > 1 ? w[0].toUpperCase() + w.slice(1) : w));   // 4
    out.push(p + '.');
  }
  if (!out.length) return src.length <= MAX_CAVEMAN ? src : src.slice(0, MAX_CAVEMAN);
  let res = '';
  for (const sent of out) {                                               // 5
    const next = res ? res + ' ' + sent : sent;
    if (next.length <= MAX_CAVEMAN) res = next; else break;
  }
  if (!res) {
    const cut = out[0].slice(0, MAX_CAVEMAN - 1);
    const sp = cut.lastIndexOf(' ');
    res = (sp > 20 ? cut.slice(0, sp) : cut).replace(/[\s,;:.]+$/, '') + '.';
  }
  return res;
}
