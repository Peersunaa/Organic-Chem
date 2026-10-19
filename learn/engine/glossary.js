// Glossary: one beginner sentence per term, defined once and reused everywhere.
//  - GLOSSARY: the terms (id, label, forms = spellings to find in lesson text, def <= 140 characters).
//  - attachGlossary(host): the first occurrence of each term in a lesson step becomes a button; tap it for the definition (Escape closes).
//  - glossaryView(): the #glossary page (every term, with a filter box).
// Pure data + DOM helpers; nothing here touches the lessons. CSS is injected once (classes gl-*).
import { h } from './steps.js';

export const GLOSSARY = [
  { id: 'nucleophile', label: 'nucleophile', forms: ['nucleophile', 'nucleophiles', 'nucleophilic'], def: 'An electron-rich atom or ion that donates a pair of electrons to make a new bond, usually to a δ+ or positive atom.' },
  { id: 'electrophile', label: 'electrophile', forms: ['electrophile', 'electrophiles', 'electrophilic'], def: 'An electron-poor atom or ion (often δ+ or positive) that accepts a pair of electrons to make a new bond.' },
  { id: 'sp3', label: 'sp³', forms: ['sp³', 'sp3'], def: 'The hybridisation of an atom with four groups around it (bonds or lone pairs): tetrahedral, about 109.5° apart.' },
  { id: 'sp2', label: 'sp²', forms: ['sp²', 'sp2'], def: 'The hybridisation of an atom with three groups around it: flat (trigonal planar), 120° apart, with one p orbital left over.' },
  { id: 'sigma', label: 'σ bond', forms: ['σ bond', 'σ-bond', 'sigma bond'], def: 'A bond made by head-on overlap of orbitals along the line between the two nuclei; every single bond is one σ bond.' },
  { id: 'pi', label: 'π bond', forms: ['π bond', 'π-bond', 'pi bond'], def: 'A bond made by sideways overlap of two p orbitals, above and below the line between the atoms; a double bond has one.' },
  { id: 'resonance', label: 'resonance', forms: ['resonance'], def: 'Describing one molecule with several valid drawings that differ only in where electrons sit; the real molecule is a blend.' },
  { id: 'delta', label: 'δ+ and δ−', forms: ['δ+', 'δ−', 'δ⁺', 'δ⁻', 'δ-'], def: 'Partial charges: δ+ marks the atom with less pull on the shared electrons, δ− the atom with more pull.' },
  { id: 'carbocation', label: 'carbocation', forms: ['carbocation', 'carbocations'], def: 'A carbon with only three bonds and a + charge (six electrons, an empty p orbital), which makes it very reactive.' },
  { id: 'skeletal', label: 'skeletal drawing', forms: ['skeletal'], def: 'A shorthand drawing: lines are bonds, every corner or line end is a carbon, and H atoms on carbon are left out.' },
  { id: 'markovnikov', label: 'Markovnikov', forms: ['Markovnikov', 'Markovnikov’s'], def: 'The rule for HX adding to an alkene: H goes to the C=C carbon that already has more H, so the + forms on the other carbon.' },
  { id: 'regio', label: 'regiochemistry', forms: ['regiochemistry', 'regiospecific', 'regioselective'], def: 'Which place in a molecule a reaction uses when more than one is possible; “regio” means place.' },
  { id: 'stereocentre', label: 'stereocentre', forms: ['stereocentre', 'stereocenter', 'stereocentres', 'stereocenters', 'chirality center', 'chirality centre', 'chirality centers', 'chirality centres'], def: 'A carbon with four different groups, so that swapping any two of them gives the mirror-image molecule.' },
  { id: 'enantiomer', label: 'enantiomer', forms: ['enantiomer', 'enantiomers'], def: 'One of a pair of mirror-image molecules that cannot be laid on top of each other, like a left and a right hand.' },
  { id: 'diastereomer', label: 'diastereomer', forms: ['diastereomer', 'diastereomers'], def: 'A stereoisomer that is not a mirror image of the other: same connections, different 3D arrangement, different properties.' },
  { id: 'meso', label: 'meso', forms: ['meso'], def: 'A molecule with stereocentres that is still achiral, because an internal mirror plane makes its two halves cancel.' },
  { id: 'racemate', label: 'racemate', forms: ['racemate', 'racemates', 'racemic'], def: 'A 50:50 mixture of two enantiomers, whose rotations cancel so it does not turn plane-polarised light.' },
  { id: 'conjugated', label: 'conjugated', forms: ['conjugated', 'conjugation'], def: 'Alternating double and single bonds, so the p orbitals line up and the π electrons are shared along the chain.' },
  { id: 'aromatic', label: 'aromatic', forms: ['aromatic', 'aromaticity'], def: 'A flat ring with a cloud of 4n + 2 π electrons shared all round it, as in benzene, which makes it unusually stable.' },
  { id: 'activating', label: 'activating group', forms: ['activating', 'activator', 'activators'], def: 'A group that makes a ring react faster than benzene by pushing electron density into it.' },
  { id: 'director', label: 'director', forms: ['director', 'directors', 'directing'], def: 'A group already on a ring that steers the next group to the ortho and para positions, or to the meta position.' },
  { id: 'ortho', label: 'ortho', forms: ['ortho'], def: 'On a benzene ring, the position right next to the group you are measuring from (carbons 1 and 2).' },
  { id: 'meta', label: 'meta', forms: ['meta'], notAfter: /^-chloroperoxy/, def: 'On a benzene ring, the position one carbon away from the group (carbons 1 and 3).' },
  { id: 'para', label: 'para', forms: ['para'], def: 'On a benzene ring, the position directly opposite the group (carbons 1 and 4).' },
  { id: 'acylium', label: 'acylium ion', forms: ['acylium'], def: 'R–C≡O⁺, the cation made from an acyl chloride and AlCl₃, which is the electrophile in Friedel–Crafts acylation.' },
  { id: 'sigmacomplex', label: 'sigma complex', forms: ['sigma complex', 'σ complex'], def: 'The carbocation formed when an electrophile attacks a benzene ring, with its + charge spread over three ring carbons.' },
  { id: 'electronegativity', label: 'electronegativity', forms: ['electronegativity', 'electronegative'], def: 'How strongly an atom pulls on the electrons it shares in a bond: F is highest and metals are low.' },
  { id: 'formalcharge', label: 'formal charge', forms: ['formal charge', 'formal charges'], def: 'The charge an atom would have if bonds were shared equally: valence electrons minus lone-pair electrons minus bonds.' },
  { id: 'lonepair', label: 'lone pair', forms: ['lone pair', 'lone pairs', 'lone-pair'], def: 'A pair of valence electrons that sits on one atom and is not shared in a bond.' },
  { id: 'octet', label: 'octet', forms: ['octet'], def: 'Eight valence electrons around an atom, which is the stable arrangement for C, N, O and F.' },
  { id: 'valence', label: 'valence electrons', forms: ['valence electron', 'valence electrons', 'valence'], def: 'The outer-shell electrons of an atom, which are the ones that make bonds.' },
  { id: 'hybridisation', label: 'hybridisation', forms: ['hybridisation', 'hybridization', 'hybridised', 'hybridized'], def: 'Mixing an atom’s s and p orbitals into equal new orbitals (sp³, sp², sp) that point toward the atoms around it.' },
  { id: 'conformation', label: 'conformation', forms: ['conformation', 'conformations', 'conformer', 'conformers'], def: 'One of the shapes a molecule takes by turning about single bonds, with no bond broken.' },
  { id: 'chair', label: 'chair', forms: ['chair', 'chairs'], def: 'The puckered, nearly strain-free shape of cyclohexane, with bond angles near 109.5° and every C–H staggered.' },
  { id: 'axial', label: 'axial', forms: ['axial'], def: 'In a chair, a bond that points straight up or down, parallel to the ring’s axis.' },
  { id: 'equatorial', label: 'equatorial', forms: ['equatorial'], def: 'In a chair, a bond that points outward around the ring’s “equator”, roughly in the ring’s plane.' },
  { id: 'newman', label: 'Newman projection', forms: ['Newman'], def: 'A view straight down one C–C bond: the front carbon is the centre dot, the back carbon the circle.' },
  { id: 'torsional', label: 'torsional strain', forms: ['torsional strain', 'torsional'], def: 'The extra energy of an eclipsed arrangement, where bonds on neighbouring atoms line up and repel.' },
  { id: 'ez', label: 'E/Z', forms: ['E/Z'], cs: true, def: 'Labels for a double bond: Z if the two higher-priority groups are on the same side, E if on opposite sides.' },
  { id: 'cip', label: 'CIP priority', forms: ['CIP'], cs: true, def: 'The ranking of the groups on an atom by atomic number, higher first (Cahn–Ingold–Prelog rules).' },
  { id: 'rs', label: 'R/S', forms: ['R/S', 'R and S'], cs: true, def: 'Labels for a stereocentre: lowest priority away from you, 1 → 2 → 3 clockwise is R and anticlockwise is S.' },
  { id: 'synanti', label: 'syn / anti', forms: ['syn', 'anti'], def: 'Syn means two groups add to the same face of a double bond; anti means they add to opposite faces.' },
  { id: 'lewisacid', label: 'Lewis acid', forms: ['Lewis acid', 'Lewis acids'], def: 'A species that accepts a pair of electrons (it has an empty orbital), such as BF₃, AlCl₃ or FeBr₃.' },
  { id: 'lewisbase', label: 'Lewis base', forms: ['Lewis base', 'Lewis bases'], def: 'A species that donates a pair of electrons, usually from a lone pair, such as NH₃ or H₂O.' },
  { id: 'pka', label: 'pKa', forms: ['pKa'], cs: true, def: 'A number for acid strength, equal to −log Ka: the lower the pKa, the stronger the acid.' },
  { id: 'conjbase', label: 'conjugate base', forms: ['conjugate base', 'conjugate bases'], def: 'What an acid becomes after it loses H⁺; the more stable it is, the stronger the acid.' },
  { id: 'conjacid', label: 'conjugate acid', forms: ['conjugate acid', 'conjugate acids'], def: 'What a base becomes after it gains H⁺.' },
  { id: 'curvedarrow', label: 'curved arrow', forms: ['curved arrow', 'curved arrows'], def: 'An arrow that shows a pair of electrons moving: it starts at the electrons (a lone pair or a bond) and points to where they go.' },
  { id: 'intermediate', label: 'intermediate', forms: ['intermediate', 'intermediates'], def: 'A species made in one step and used up in the next; it sits in an energy valley between two transition states.' },
  { id: 'ts', label: 'transition state', forms: ['transition state', 'transition states'], def: 'The highest-energy arrangement during one step, with bonds part-broken and part-formed, which cannot be isolated.' },
  { id: 'rds', label: 'rate-determining step', forms: ['rate-determining', 'rate determining'], def: 'The slowest step of a reaction, which controls how fast the whole reaction goes.' },
  { id: 'huckel', label: 'Hückel’s rule', forms: ['Hückel', 'Huckel'], def: 'A flat, fully conjugated ring is aromatic if it holds 4n + 2 π electrons (2, 6, 10, …).' },
  { id: 'substituent', label: 'substituent', forms: ['substituent', 'substituents'], def: 'An atom or group attached in place of an H on a chain or ring.' },
  { id: 'alkyl', label: 'alkyl group', forms: ['alkyl'], def: 'A carbon-chain group named like its alkane with one H removed, such as CH₃ (methyl) or CH₂CH₃ (ethyl); R stands for any alkyl group.' },
  { id: 'halide', label: 'halide', forms: ['halide', 'halides'], def: 'A compound of a halogen (F, Cl, Br, I); an alkyl halide is R–X, and X⁻ is a halide ion.' },
  { id: 'hydration', label: 'hydration', forms: ['hydration'], def: 'Adding H and OH across a double bond (adding water) to make an alcohol.' },
  { id: 'hydrogenation', label: 'hydrogenation', forms: ['hydrogenation'], def: 'Adding H₂ across a multiple bond, usually with a metal catalyst such as Pd/C.' },
  { id: 'oxidation', label: 'oxidation', forms: ['oxidation', 'oxidations', 'oxidised', 'oxidized'], def: 'A change that adds C–O bonds or removes C–H bonds, so the carbon ends up with more bonds to O.' },
  { id: 'reduction', label: 'reduction', forms: ['reduction', 'reductions'], def: 'A change that adds C–H bonds or removes C–O bonds, so the carbon ends up with more bonds to H.' },
  { id: 'tautomer', label: 'tautomer', forms: ['tautomer', 'tautomers'], def: 'Isomers that differ in where an H and a double bond sit and that swap quickly, such as an enol and its ketone.' }
];
export const GLOSSARY_BY_ID = Object.fromEntries(GLOSSARY.map((g) => [g.id, g]));

// ---------------------------------------------------------------- finding terms in text
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const isLetter = (c) => !!c && /[A-Za-zÀ-ɏ]/.test(c);
const COMPILED = GLOSSARY.map((g) => {
  const forms = g.forms.slice().sort((a, b) => b.length - a.length);
  return { g, re: new RegExp(forms.map(esc).join('|'), g.cs ? 'g' : 'gi') };
});

/** First place in `text` (from `from`) where a term from `ids` occurs as a whole word: {at, len, id} or null. Pure. */
export function findTerm(text, ids, from = 0) {
  let best = null;
  for (const { g, re } of COMPILED) {
    if (ids && !ids.has(g.id)) continue;
    re.lastIndex = from;
    let m;
    while ((m = re.exec(text))) {
      const prev = text[m.index - 1], next = text[m.index + m[0].length];
      const startsLetter = isLetter(m[0][0]), endsLetter = isLetter(m[0][m[0].length - 1]);
      const blocked = g.notAfter && g.notAfter.test(text.slice(m.index + m[0].length));
      if (blocked || (startsLetter && isLetter(prev)) || (endsLetter && (isLetter(next) || /[²³]/.test(next || '')))) { if (re.lastIndex === m.index) re.lastIndex++; continue; }
      if (!best || m.index < best.at || (m.index === best.at && m[0].length > best.len)) best = { at: m.index, len: m[0].length, id: g.id };
      break;
    }
  }
  return best;
}
/** Every glossary id whose term is found in a piece of text (used by tests). */
export function termsIn(text) {
  const left = new Set(GLOSSARY.map((g) => g.id)), found = [];
  let from = 0, hit;
  while ((hit = findTerm(text, left, from))) { found.push(hit.id); left.delete(hit.id); from = 0; }
  return found;
}

// ---------------------------------------------------------------- the DOM layer
const SKIP = '.widget, .visual, svg, input, textarea, select, button, .opt, .gl-term, .gl-pop, figure, .eqn, .pair, a, summary, .iupac, .chips, mol, molpair, [data-gl-skip]';
// `scoped`: `root` itself sits inside a skipped block (a widget's why line); only skipped blocks BELOW root count.
function textNodes(root, scoped) {
  const out = [];
  const skipped = (el) => { const hit = el && el.closest(SKIP); return !!hit && (!scoped || (hit !== root && root.contains(hit))); };
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() && !skipped(n.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  while (w.nextNode()) out.push(w.currentNode);
  return out;
}
let popN = 0;
function makePop(g) {
  const id = 'gl-pop-' + (++popN);
  const pop = h('span', { class: 'gl-pop', id, role: 'note', hidden: 'hidden' }, h('b', {}, g.label), ' — ' + g.def);
  return pop;
}
function placePop(btn, pop) {
  const block = btn.closest('p, h2, h3, li, .ask');
  if (block) block.after(pop);
  else (btn.closest('div') || btn.parentNode).append(pop);
}
/** Wrap the first occurrence of each term not in `seen` inside `root`; mutates `seen`. Returns the buttons made. */
export function annotate(root, seen, scoped = false) {
  const made = [];
  const left = () => new Set(GLOSSARY.filter((g) => !seen.has(g.id)).map((g) => g.id));
  for (let node of textNodes(root, scoped)) {
    for (;;) {
      const ids = left();
      if (!ids.size) return made;
      const hit = findTerm(node.nodeValue, ids);
      if (!hit) break;
      const g = GLOSSARY_BY_ID[hit.id];
      const mid = node.splitText(hit.at);
      const after = mid.splitText(hit.len);
      const pop = makePop(g);
      const btn = h('button', { type: 'button', class: 'gl-term', 'aria-expanded': 'false', 'aria-controls': pop.id, 'data-term': g.id }, mid.nodeValue);
      mid.replaceWith(btn);
      placePop(btn, pop);
      seen.add(g.id); made.push(btn);
      node = after;
      if (!node.nodeValue.trim()) break;
    }
  }
  return made;
}

/** Make the first occurrence of each term in one short line (a mechanism why line, which lives inside a widget) tappable.
 *  Taps are handled by the lesson's attachGlossary(host). Returns a function that removes the definition notes again (call it before the line is rewritten). */
export function annotateLine(el) {
  injectStyle();
  const btns = annotate(el, new Set(), true);
  return () => btns.forEach((b) => { const pop = document.getElementById(b.getAttribute('aria-controls')); if (pop) pop.remove(); });
}

/** Make the terms of a rendered lesson step tappable, now and as the step grows (feedback, reveals). Returns a function that stops it. */
export function attachGlossary(host) {
  const seen = new Set();
  injectStyle();
  let busy = false;
  const run = (root) => { busy = true; try { annotate(root, seen); } finally { busy = false; } };
  run(host);
  const closeAll = (except) => host.querySelectorAll('.gl-term[aria-expanded="true"]').forEach((b) => { if (b !== except) toggle(b, false); });
  const toggle = (btn, on) => {
    const pop = document.getElementById(btn.getAttribute('aria-controls'));
    if (!pop) return;
    const open = on == null ? pop.hidden : on;
    pop.hidden = !open; btn.setAttribute('aria-expanded', String(open));
  };
  const onClick = (e) => {
    if (!host.isConnected) { stop(); return; }
    const btn = e.target.closest && e.target.closest('.gl-term');
    if (btn && host.contains(btn)) { const willOpen = btn.getAttribute('aria-expanded') !== 'true'; closeAll(btn); toggle(btn, willOpen); return; }
    if (!(e.target.closest && e.target.closest('.gl-pop'))) closeAll();
  };
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    const open = host.querySelector('.gl-term[aria-expanded="true"]');
    if (open) { toggle(open, false); open.focus(); }
  };
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  const mo = new MutationObserver((recs) => {
    if (busy) return;
    const fresh = [];
    recs.forEach((r) => r.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.isConnected && !n.closest(SKIP)) fresh.push(n); }));
    if (!fresh.length) return;
    mo.disconnect();
    fresh.forEach((n) => { if (n.isConnected) run(n); });
    mo.observe(host, { childList: true, subtree: true });
  });
  mo.observe(host, { childList: true, subtree: true });
  function stop() { mo.disconnect(); document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); }
  return stop;
}

// ---------------------------------------------------------------- the #glossary page
export function glossaryView() {
  injectStyle();
  const q = h('input', { type: 'search', class: 'gl-search', placeholder: 'Find a term', 'aria-label': 'Find a term', autocomplete: 'off' });
  const list = h('dl', { class: 'gl-list' });
  const sorted = GLOSSARY.slice().sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
  const rows = sorted.map((g) => {
    const dt = h('dt', { id: 'gl-' + g.id }, g.label);
    const dd = h('dd', {}, g.def);
    list.append(dt, dd);
    return { g, dt, dd };
  });
  const count = h('p', { class: 'muted small gl-count' }, `${GLOSSARY.length} terms`);
  q.addEventListener('input', () => {
    const s = q.value.trim().toLowerCase(); let n = 0;
    rows.forEach(({ g, dt, dd }) => { const hit = !s || g.label.toLowerCase().includes(s) || g.def.toLowerCase().includes(s) || g.forms.some((f) => f.toLowerCase().includes(s)); dt.hidden = dd.hidden = !hit; if (hit) n++; });
    count.textContent = s ? `${n} of ${GLOSSARY.length} terms` : `${GLOSSARY.length} terms`;
  });
  return h('section', { class: 'gl-page' }, q, count, list);
}

let styled = false;
export function injectStyle() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.id = 'gl-style';
  s.textContent = `
.gl-term{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;border-bottom:1.5px dotted var(--accent,#0a727c);position:relative;text-align:inherit;letter-spacing:inherit}
.gl-term::after{content:"";position:absolute;left:50%;top:50%;width:calc(100% + 8px);height:calc(100% + 28px);min-width:44px;min-height:44px;transform:translate(-50%,-50%)}
.gl-term:hover{background:var(--accent-soft,rgba(10,114,124,.09))}
.gl-term[aria-expanded="true"]{background:var(--accent-soft,rgba(10,114,124,.09));border-bottom-style:solid}
.gl-term:focus-visible{outline:2px solid var(--accent,#0a727c);outline-offset:3px;border-radius:3px}
.gl-pop{display:block;margin:8px 0;padding:10px 12px;background:var(--surface-2,#eaf0f1);border:1px solid var(--line,#d9e3e5);border-left:3px solid var(--accent,#0a727c);border-radius:6px;color:var(--ink,#0c1d23);font:400 .9375rem/1.375rem var(--body,system-ui,sans-serif);letter-spacing:0;text-transform:none}
.gl-pop[hidden]{display:none}
.gl-pop b{color:var(--accent,#0a727c);font-weight:600}
.gl-page{display:grid;gap:12px}
.gl-search{min-height:44px;width:100%;box-sizing:border-box;padding:0 12px;border:1px solid var(--line-strong,#b6c7cb);border-radius:10px;background:var(--surface,#fff);color:var(--ink,#0c1d23);font:inherit}
.gl-search:focus-visible{border-color:var(--accent,#0a727c)}
.gl-list{margin:0;display:grid;gap:0}
.gl-list dt{margin:0;padding:14px 0 2px;font-weight:600;color:var(--ink,#0c1d23);border-top:1px solid var(--line,#d9e3e5);scroll-margin-top:16px}
.gl-list dt:first-child{border-top:0}
.gl-list dd{margin:0 0 12px;color:var(--ink-2,#344a51);line-height:1.5}
.gl-list [hidden]{display:none}
.gl-aside{margin:0 0 12px;padding:10px 12px;border:1px solid var(--line,#d9e3e5);border-radius:10px;background:var(--surface-2,#eaf0f1);font-size:.9375rem;line-height:1.375rem;color:var(--ink-2,#344a51)}
.gl-aside p{margin:0 0 6px}.gl-aside p:last-child{margin:0}
.gl-vt{border-collapse:collapse;margin:0 0 8px;font-variant-numeric:tabular-nums}
.gl-vt caption{caption-side:top;text-align:left;font-size:.8125rem;color:var(--muted,#4f666d);padding-bottom:4px}
.gl-vt th,.gl-vt td{border:1px solid var(--line-strong,#b6c7cb);min-width:44px;height:36px;text-align:center;padding:0 6px}
.gl-vt th{background:var(--surface-3,#dde7e9);font-weight:600}
.gl-vt td{font-weight:600;color:var(--ink,#0c1d23)}
.gl-vt td.gl-gap{border-color:transparent}
.rc-card{border:1px solid var(--line,#d9e3e5);border-left:3px solid var(--accent,#0a727c);border-radius:4px 10px 10px 4px;background:var(--surface-2,#eaf0f1);padding:0 16px;margin-bottom:16px}
.rc-card>summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font:600 .75rem/1rem var(--mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--accent,#0a727c)}
.rc-list{margin:0 0 12px;padding:0;list-style:none;display:grid;gap:8px;font-size:.9375rem;line-height:1.375rem}
.rc-list li{display:grid;gap:2px}
.rc-from{color:var(--muted,#4f666d);font-size:.8125rem}
.rc-link{display:inline-flex;align-items:center;min-height:44px;color:var(--accent,#0a727c);font-weight:600;text-decoration:underline;text-underline-offset:3px}
.rc-link:focus-visible{outline:2px solid var(--accent,#0a727c);outline-offset:2px;border-radius:2px}
`;
  document.head.append(s);
}
if (typeof document !== 'undefined') injectStyle();
