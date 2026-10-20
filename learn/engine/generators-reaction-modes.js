// Reaction modes: five practice generators built on the mixed drill (engine/generators-predict.js). Every product is computed by the engines through the drill's own
// solve functions (reactions.js, reactions-additions.js, reactions-alkynes.js, reactions-dienes.js, reactions-aromatic.js); nothing is typed except the curated
// "which one will not work" list and the short reasons that go with each reagent.
//   guess-reagent   substrate -> product drawn, 4 reagents. A wrong reagent is only used when the engine says its product on THIS substrate is a different compound.
//   guess-reactant  reagent + product drawn, 4 starting materials from the card's pool. A wrong one is only used when the engine product differs from the one shown.
//   stereo-outcome  substrate + reagent: what stereochemistry forms. The label is read back from the engine product (stereocentres, meso check, E/Z).
//   two-step        start and final product drawn, 4 ordered reagent pairs. The right pair composes the engine solves; every wrong pair is run through the engines and
//                   either fails at some step or ends at a different compound.
//   wont-work       a curated list of cases (a taught reason each): three options work, one does not.
// The ten fixed-answer cards (no engine model) take part only as the second step of a chain whose first product IS the card's example (benzene, CH3COCl/AlCl3, then Clemmensen).
// tests/reaction-modes.mjs: 200 seeded problems per mode, RDKit (JS and Python) on every drawn molecule, the answers recomputed with the engines, the counts below.
import { analyze, canon } from './chem.js';
import { ACID } from './acidbase.js';
import { nameBothAny } from './naming-chain.js';
import { nameBothArene } from './naming-arene.js';
import { HUB_BY_ID } from './reaction-hub.js';
import { DRILL, DRILL_IDS } from './generators-predict.js';
import { stereoKey } from './reactions-additions.js';
import { chiralCenters, ezInfo } from './cip.js';
import { isMeso } from './chirality.js';
import { predictSubst, oxidizeSideChain, EAS, halideText, BENZENE } from './reactions-aromatic.js';

export const MODE_IDS = ['guess-reagent', 'guess-reactant', 'stereo-outcome', 'two-step', 'wont-work'];
export const REACTION_MODE_SKILLS = MODE_IDS;
export const MODE_INFO = {
  'guess-reagent': { label: 'Which reagent?', blurb: 'You see the starting material and the product. Pick the reagent that makes it.' },
  'guess-reactant': { label: 'Which starting material?', blurb: 'You see the reagent and the product. Pick the starting material.' },
  'stereo-outcome': { label: 'What stereochemistry forms?', blurb: 'Indicate any appropriate stereochemistry: cis or trans, meso or racemic.' },
  'two-step': { label: 'Two-step roadmap', blurb: 'You see the start and the end. Pick the two reagents, in the right order.' },
  'wont-work': { label: 'Which one will not work?', blurb: 'Three routes work and one fails for a reason from the course. Spot it.' }
};
/** How many different problems each mode can make (distinct substrate / reagent / product combinations). tests/reaction-modes.mjs recomputes every number and fails when one is stale. */
export const MODE_COUNTS = { 'guess-reagent': 1491, 'guess-reactant': 1523, 'stereo-outcome': 429, 'two-step': 507, 'wont-work': 791 };

const LETTERS = 'ABCD';
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const first = (t) => String(t || '').split(/(?<=[.!?])\s+/)[0];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- comparing products (enantiomer-blind canonical keys)
const parts = (list) => list.flatMap((s) => String(s).split('.'));
const pkey = (list) => parts(list).map((s) => stereoKey(s)).sort();
const sameSet = (a, b) => a.length === b.length && a.every((k, i) => k === b[i]);
const disjoint = (a, b) => !a.some((k) => b.includes(k));
/** Hill formula with subscripts, from RDKit atom data. */
const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n) => (n === 1 ? '' : String(n).split('').map((d) => SUBS[d]).join(''));
export function formulaOf(smiles) {
  const info = analyze(smiles);
  const cnt = {};
  info.atoms.forEach((a) => { cnt[a.sym] = (cnt[a.sym] || 0) + 1; if (a.impH) cnt.H = (cnt.H || 0) + a.impH; });
  const rest = Object.keys(cnt).filter((k) => k !== 'C' && k !== 'H').sort();
  return (cnt.C ? ['C'] : []).concat(cnt.H ? ['H'] : []).concat(rest).map((k) => k + sub(cnt[k])).join('');
}
const formulaList = (list) => parts(list).map(formulaOf).join(' + ');

// ---------------------------------------------------------------- engine solves (cached): one drill combo -> {label, products, key} or a failure with the engine's own reason
const cache = new Map();
const vKey = (v) => `${v.id}|${v.halide || ''}`;
/** Solve (card, substrate, variant) with the drill's solve function. Returns {ok:true, label, products:[...flat], key:[...], racemic, family} or {ok:false, reason}. */
export function solve(cardId, substrate, v) {
  const k = `${cardId}\u0001${substrate}\u0001${vKey(v)}`;
  if (cache.has(k)) return cache.get(k);
  const e = DRILL[cardId];
  let out;
  if ((v.skip || []).includes(substrate)) out = { ok: false, reason: 'not applicable' };
  else {
    try {
      const S = e.solve(substrate, v, () => 0.5);
      const products = parts(S.products);
      out = { ok: true, cardId, v, label: S.label, products, key: pkey(products), racemic: !!S.racemic, family: S.family, sub: substrate, subKey: pkey([substrate]) };
      out.reacts = !sameSet(out.key, out.subKey);
    } catch (err) { out = { ok: false, reason: String(err.message || err).replace(/^excluded:\s*/, '') }; }
  }
  cache.set(k, out);
  return out;
}
/** The label of a reagent variant without running the engine (the tests check it equals the label the drill's solve returns). */
export function variantLabel(cardId, v) {
  if (v.label) return DRILL[cardId].fam === 'diene' ? v.label + ' (1 equiv.)' : v.label;
  if (cardId === 'alkyne-acetylide') return `NaNH₂, then ${halideLabel(v.halide)}`;
  if (v.halide) return `${halideText(v.halide)}, AlCl₃`;
  return EAS[v.id] ? EAS[v.id].label : v.id;
}
const variantsFor = (cardId, substrate) => DRILL[cardId].variants.filter((v) => !(v.skip || []).includes(substrate));
const ENGINE_CARDS = DRILL_IDS.filter((id) => !DRILL[id].fixed);
/** The cards that can be practised in "which reagent?": the two with fewer than three other reagents that change their substrates (H₂/Pd on a side chain, HX on a diene) cannot make a four-option question. */
export const GUESS_REAGENT_CARDS = ENGINE_CARDS.filter((id) => !['side-chain-h2pd', 'diene-hx'].includes(id));
const groupOf = (cardId) => HUB_BY_ID[cardId].group;
/** The cards whose reagents are offered as wrong answers for a substrate of each group (each reagent once: the director cards repeat the substitution reagents). */
export const REP = {
  alkene: ['alkene-hx', 'alkene-hydration', 'alkene-x2', 'alkene-h2-pd', 'alkene-kmno4-base', 'alkene-kmno4-acid', 'alkene-epoxide', 'alkene-epoxide-diol'],
  alkyne: ['alkyne-hx-1', 'alkyne-hx-2', 'alkyne-x2-1', 'alkyne-x2-2', 'alkyne-hydration', 'alkyne-lindlar', 'alkyne-h2-pd', 'alkyne-acetylide'],
  arene: ['eas-bromination', 'eas-nitration', 'eas-sulfonation', 'fc-alkylation', 'fc-acylation', 'side-chain-kmno4', 'nitro-reduction', 'side-chain-h2pd'],
  diene: ['diene-hx']
};
const NOUN = { alkene: 'alkene', alkyne: 'alkyne', arene: 'arene', diene: 'diene' };

// ---------------------------------------------------------------- what a reagent does, in words (short, concrete; used in the feedback lines)
const halogenOf = (v) => (/Br/.test(v.id) ? 'Br' : /Cl/.test(v.id) ? 'Cl' : /I/.test(v.id) ? 'I' : 'X');
const halideLabel = (x) => ({ CBr: 'CH₃Br', CCBr: 'CH₃CH₂Br', CCCBr: 'CH₃CH₂CH₂Br' }[x] || x);
const GROUP_TEXT = { Br: 'Br', Cl: 'Cl', I: 'I', '[N+](=O)[O-]': 'NO₂', 'S(=O)(=O)O': 'SO₃H' };
function areneWhere(substrate, v) {
  if (canon(substrate) === BENZENE) return '';
  let q = null;
  try { q = predictSubst(substrate, v.id, v.halide || null); } catch (e) { q = null; }
  if (!q || !q.ok || !q.rels) return '';
  return q.rels.includes('meta') ? ', meta to the group already on the ring' : ', ortho and para to the group already on the ring';
}
/** The group a substitution puts on the ring. */
function areneGroup(v) {
  if (v.halide) return v.halide === 'ClC1CCCCC1' ? 'cyclohexyl' : halideText(v.halide).replace(/Cl$/, '');
  const E = EAS[v.id];
  return E ? (GROUP_TEXT[E.group] || E.group) : 'a group';
}
const PHRASE = {
  'alkene-hx': (v) => `H and ${halogenOf(v)}, with ${halogenOf(v)} on the more substituted carbon (Markovnikov)`,
  'alkene-hydration': () => 'H and OH, with OH on the more substituted carbon (Markovnikov)',
  'alkene-x2': (v) => `${halogenOf(v)} and ${halogenOf(v)}, one on each C=C carbon, on opposite faces (anti)`,
  'alkene-h2-pd': () => 'two H on the same face (syn): the alkane',
  'alkene-kmno4-base': () => 'two OH on the same face (syn): a diol',
  'alkene-kmno4-acid': () => 'the C=C cut in two, each end gaining O (C=O or CO₂H)',
  'alkene-epoxide': () => 'one O bridging both carbons (an epoxide)',
  'alkene-epoxide-diol': () => 'two OH on opposite faces (anti): a diol, made through the epoxide',
  'alkyne-hx-1': (v) => `one H and one ${halogenOf(v)}, with ${halogenOf(v)} on the more substituted carbon (a vinylic halide)`,
  'alkyne-hx-2': (v) => `two H and two ${halogenOf(v)}, both ${halogenOf(v)} on the same carbon (a geminal dihalide)`,
  'alkyne-x2-1': (v) => `${halogenOf(v)} and ${halogenOf(v)} on opposite sides of a C=C (trans)`,
  'alkyne-x2-2': (v) => `four ${halogenOf(v)}, two on each carbon`,
  'alkyne-hydration': () => 'a C=O (a ketone) on the more substituted carbon, after the enol flips',
  'alkyne-lindlar': () => 'one H₂ added on the same face (syn): a cis (Z) alkene',
  'alkyne-h2-pd': () => 'two H₂: the alkane',
  'alkyne-acetylide': (v) => `a longer chain: the R group of ${halideLabel(v.halide)} on the triple-bond carbon`,
  'diene-hx': (v) => `H and ${halogenOf(v)} by 1,2 and by 1,4 addition`,
  'side-chain-kmno4': () => 'the benzylic carbon turned into CO₂H (the rest of the chain cut off)',
  'nitro-reduction': () => 'NO₂ turned into NH₂',
  'side-chain-h2pd': () => 'H₂ added to the C=C or C≡C outside the ring (the ring is left alone)',
  clemmensen: () => 'the C=O next to the ring reduced all the way to CH₂'
};
/** What this reagent (a drill variant) does to this substrate, as a short phrase. */
function phrase(cardId, v, substrate) {
  if (PHRASE[cardId]) return PHRASE[cardId](v);
  const card = HUB_BY_ID[cardId];
  if (card.group === 'arene' && DRILL[cardId].fam === 'arene' && (EAS[v.id] || v.halide)) return `${areneGroup(v)} on the ring`;
  return card.facts.adds;
}
const classOfSite = (smiles) => {
  const info = analyze(smiles);
  const X = info.atoms.find((a) => ['Br', 'Cl', 'I'].includes(a.sym) || (a.sym === 'O' && a.nbrs.length === 1 && a.impH === 1));
  if (!X) return null;
  const c = info.atoms[X.nbrs[0]];
  const n = c.nbrs.filter((k) => info.atoms[k].sym === 'C').length;
  return ['methyl', 'primary (1°)', 'secondary (2°)', 'tertiary (3°)'][n] || null;
};
/** What this starting material becomes with this reagent, in a few words that tell it from the other options. */
function becomes(r) {
  const prod = r.products[0];
  const card = r.cardId;
  if (r.cardId === 'alkene-hx' || r.cardId === 'alkene-hydration') {
    const c = classOfSite(prod);
    return c ? `a ${c} ${card === 'alkene-hx' ? 'alkyl halide' : 'alcohol'} (${formulaList(r.products)})` : formulaList(r.products);
  }
  if (groupOf(card) === 'arene' && (EAS[r.v.id] || r.v.halide)) return `${areneGroup(r.v)} on the ring${areneWhere(r.sub, r.v)} (${formulaList(r.products)})`;
  return `${formulaList(r.products)}${r.products.length > 1 ? ' (two products)' : ''}`;
}

function nameList(list) {
  const out = [];
  for (const x of list) {
    let n = null;
    try { n = nameBothAny(x) || nameBothArene(x); } catch (e) { n = null; }
    if (!n || !n.new) return null;
    out.push(n.new);
  }
  return out.join(' and ');
}
/** How the product of another starting material differs from the one shown, as one clause: names when the namers know both, else class, group and position, else the formulas. */
function contrast(o, shown) {
  const a = nameList(o.products), b = nameList(shown.products);
  if (a && b && a !== b) return `gives ${a}, not ${b}`;
  const fa = formulaList(o.products), fb = formulaList(shown.products);
  const isHx = (r) => r.cardId === 'alkene-hx' || r.cardId === 'alkene-hydration';
  if (isHx(o)) {
    const ca = classOfSite(o.products[0]), cb = classOfSite(shown.products[0]), kind = o.cardId === 'alkene-hx' ? 'alkyl halide' : 'alcohol';
    if (ca && cb && ca !== cb) return `gives a ${ca} ${kind}, not the ${cb} ${kind} shown`;
  }
  if (groupOf(o.cardId) === 'arene' && (EAS[o.v.id] || o.v.halide)) return `puts ${areneGroup(o.v)} on the ring${areneWhere(o.sub, o.v)} (${fa}), not where the product shown has it (${fb})`;
  if (fa === fb) return `gives an isomer of the product shown (same formula ${fa}, the atoms joined differently)`;
  return `gives ${fa}, not the product shown (${fb})`;
}
const FRIENDLY = [
  [/^$|^excluded$|^not applicable$/, 'there is nothing for it to react with'],
  [/only hydrocarbons/, 'that molecule carries other atoms (a halogen, O), so these reactions do not apply'],
  [/no triple or aromatic bonds|there is no C=C/, 'there is no simple C=C to react with'],
  [/there is no C≡C|no C≡C/, 'there is no C≡C left to react with'],
  [/it does not react/, 'it does not react']
];
const failText = (r) => { const t = String(r || '').replace(/\.$/, ''); const f = FRIENDLY.find(([re]) => re.test(t)); return f ? f[1] : t; };

// ---------------------------------------------------------------- shared pieces of a problem
const HINT_WHAT = 'Compare the formulas of the two molecules: which atoms were gained or lost? That is WHAT the reagent adds.';
function optionsFrom(rng, right, wrong, make) {
  const all = shuffle(rng, [{ ...right, correct: true }, ...wrong.map((w) => ({ ...w, correct: false }))]);
  return all.map((o, i) => make(o, i));
}
const standard = (o, i, extra = {}) => ({ text: o.text, correct: !!o.correct, kind: o.kind, ...extra });

// ---------------------------------------------------------------- mode 1: which reagent?
function reagentCandidates(group, substrate, right) {
  const out = [], seen = new Set([right.label]);
  for (const cardId of REP[group]) {
    for (const v of variantsFor(cardId, substrate)) {
      const S = solve(cardId, substrate, v);
      if (!S.ok || !S.reacts || seen.has(S.label)) continue;
      if (!disjoint(S.key, right.key)) continue;          // the wrong reagent must give a different compound
      seen.add(S.label);
      out.push({ ...S, cardId, v });
    }
  }
  return out;
}
/** One guess-the-reagent problem for a (card, substrate, variant) combo, or null when it has fewer than three wrong reagents. */
export function buildGuessReagent(combo, rng) {
  const right = solve(combo.cardId, combo.sub, combo.v);
  if (!right.ok || !right.reacts) return null;
  const group = groupOf(combo.cardId);
  const cands = reagentCandidates(group, combo.sub, right);
  if (cands.length < 3) return null;
  // one wrong reagent from each card first (variety), then the rest
  const byCard = new Map();
  shuffle(rng, cands).forEach((c) => { if (!byCard.has(c.cardId)) byCard.set(c.cardId, []); byCard.get(c.cardId).push(c); });
  const order = shuffle(rng, [...byCard.keys()]);
  const wrong = [];
  for (let pass = 0; wrong.length < 3 && pass < 6; pass++) for (const id of order) { const c = byCard.get(id)[pass]; if (c && wrong.length < 3) wrong.push(c); }
  const card = HUB_BY_ID[combo.cardId];
  const sayRight = phrase(combo.cardId, combo.v, combo.sub);
  const opts = optionsFrom(rng, { text: right.label, label: right.label, kind: 'major', cardId: combo.cardId }, wrong.map((c) => ({ text: c.label, label: c.label, kind: c.cardId, cardId: c.cardId, v: c.v, S: c })), (o, i) => {
    if (o.correct) return standard(o, i, { ref: { card: combo.cardId, reagent: combo.v.id, halide: combo.v.halide || null }, why: `Yes. ${right.label} gives ${sayRight}: that is what this product shows.` });
    const f = HUB_BY_ID[o.cardId].facts;
    const lead = `${o.label} would give ${phrase(o.cardId, o.v, combo.sub)}, but this product shows ${sayRight}.`;
    const more = `On this starting material ${o.label} gives ${becomes(o.S)}, not the product drawn. Its card says: it adds ${f.adds}; ${f.where}.`;
    return standard(o, i, { ref: { card: o.cardId, reagent: o.v.id, halide: o.v.halide || null }, lead, more, why: `${lead} ${more}`, fact: 'reagent' });
  });
  const answerOpt = opts.find((o) => o.correct);
  const noun = NOUN[group];
  return {
    kind: 'choice', skill: 'guess-reagent', mode: 'guess-reagent', smiles: null,
    equation: { reactants: [combo.sub], products: right.products, cond: '?' },
    promptHtml: `Which reagent turns this ${noun} into this product? <i>Pick the reagent that makes it.</i>`,
    prompt: 'Which reagent turns this molecule into this product?',
    options: opts, answer: answerOpt.text,
    card: combo.cardId, group, substrate: combo.sub, reagent: combo.v.id, halide: combo.v.halide || null, products: right.products, label: right.label,
    worked: `1. What changed: ${formulaOf(combo.sub)} became ${formulaList(right.products)}. 2. The reagent on the card that does this: ${right.label}, which gives ${sayRight}. 3. ${first(card.facts.where)}`,
    derive: `${formulaOf(combo.sub)} became ${formulaList(right.products)}: ${right.label} gives ${sayRight}.`,
    hints: [HINT_WHAT, `Where did the new group go, and how? ${card.facts.where}. Use that to rule out the reagents that put it somewhere else.`]
  };
}

// ---------------------------------------------------------------- mode 2: which starting material?
/** One guess-the-reactant problem, or null when the card has fewer than three starting materials that give a different product. */
export function buildGuessReactant(combo, rng) {
  const right = solve(combo.cardId, combo.sub, combo.v);
  if (!right.ok || !right.reacts) return null;
  const seenSub = new Set([canon(combo.sub)]);
  const pool = DRILL[combo.cardId].subs.filter((s) => { const c = canon(s); if (seenSub.has(c)) return false; seenSub.add(c); return true; });   // one drawing per compound
  const cands = [];
  for (const s of pool) {
    if ((combo.v.skip || []).includes(s)) continue;
    const S = solve(combo.cardId, s, combo.v);
    if (!S.ok || !disjoint(S.key, right.key)) continue;     // a product that overlaps the shown one would make the options ambiguous
    cands.push(S);
  }
  if (cands.length < 3) return null;
  const wrong = shuffle(rng, cands).slice(0, 3);
  const group = groupOf(combo.cardId);
  const card = HUB_BY_ID[combo.cardId];
  const opts = optionsFrom(rng, { smiles: combo.sub, kind: 'major' }, wrong.map((S) => ({ smiles: S.sub, kind: 'other', S })), (o, i) => {
    const base = { smiles: o.smiles, text: 'Option ' + LETTERS[i], correct: !!o.correct, kind: o.kind };
    if (o.correct) return { ...base, why: `Yes. ${right.label} on this starting material gives ${becomes(right)}: that is the product shown.` };
    let lead, more;
    if (!o.S.reacts) {
      let why = '';
      if (combo.cardId === 'side-chain-kmno4') { try { why = first(oxidizeSideChain(o.smiles).why); } catch (e) { why = ''; } }
      lead = `With ${right.label} this starting material does not react${why ? ': ' + why.replace(/\.$/, '') : ''}.`;
      more = `${cap(right.label)} would leave it unchanged, so it cannot make the product shown.`;
    } else {
      lead = `With ${right.label} this starting material ${contrast(o.S, right)}.`;
      more = `The reagent is the same, but a different starting material gives a different product. Check where the new group lands on THIS skeleton: ${card.facts.where}.`;
    }
    return { ...base, lead, more, why: `${lead} ${more}`, fact: 'substrate' };
  });
  return {
    kind: 'choice', skill: 'guess-reactant', mode: 'guess-reactant', smiles: null,
    equation: { reactants: [], products: right.products, cond: right.label },
    promptHtml: `Which starting material gives this product with <b>${right.label}</b>?`,
    prompt: `Which starting material gives this product with ${right.label}?`,
    options: opts, answer: opts.find((o) => o.correct).text,
    card: combo.cardId, group, substrate: combo.sub, reagent: combo.v.id, halide: combo.v.halide || null, products: right.products, label: right.label,
    worked: `1. Work backwards from the product: ${formulaList(right.products)}. 2. ${right.label} does this: ${phrase(combo.cardId, combo.v, combo.sub)}. 3. Undo it: ${combo.sub} (${formulaOf(combo.sub)}) is the starting material whose product matches.`,
    derive: `${right.label} on ${formulaOf(combo.sub)} gives ${formulaList(right.products)}.`,
    hints: ['Undo the reagent in your head: remove what it added (and put back what it removed) at the carbon where it sits in the product.', `Check the other drawings: run ${right.label} on each one and see whether you get this exact product. ${card.facts.where}.`]
  };
}

// ---------------------------------------------------------------- mode 3: what stereochemistry forms?
export const STEREO_CARDS = ['alkene-hx', 'alkene-hydration', 'alkene-x2', 'alkene-h2-pd', 'alkene-kmno4-base', 'alkene-kmno4-acid', 'alkene-epoxide', 'alkene-epoxide-diol', 'alkyne-hx-2', 'alkyne-x2-1', 'alkyne-x2-2', 'alkyne-hydration', 'alkyne-lindlar', 'alkyne-h2-pd'];
const C_TEXT = { meso: 'a meso compound (one achiral stereoisomer)', racemic: 'a racemic pair (two enantiomers, 1:1)', single: 'one stereoisomer only (one fixed C=C geometry)', none: 'nothing to show (no stereocentre and no cis/trans)' };
const G_TEXT = { syn: 'cis (syn) only', anti: 'trans (anti) only' };
const optionText = (G, C) => (G ? `${G_TEXT[G]}: ${C_TEXT[C]}` : cap(C_TEXT[C]));
/** Read the stereochemistry of the engine's product(s): {nC, C: 'meso'|'racemic'|'single'|'none', G: 'syn'|'anti'|null, ez, ambiguous}. */
export function stereoRead(cardId, r) {
  const card = HUB_BY_ID[cardId];
  if (r.products.length !== 1) return { nC: 0, C: 'none', G: null, ez: false, ambiguous: false, products: r.products };
  const p = r.products[0];
  const nC = (chiralCenters(p) || []).length;
  const ez = (ezInfo(p) || []).filter((e) => e.capable);
  const ambiguous = ez.some((e) => !e.label);            // a C=C that could be E or Z but is not drawn: the book gives no rule, so not asked
  const hasEz = ez.length > 0 && !ambiguous;
  let C;
  if (nC >= 2) C = isMeso(p) ? 'meso' : 'racemic';
  else if (nC === 1) C = 'racemic';
  else if (hasEz) C = 'single';
  else C = 'none';
  const space = card.facts.space;
  const G = (space === 'syn' || space === 'anti') && (nC >= 2 || hasEz) ? space : null;
  return { nC, C, G, ez: hasEz, ambiguous, products: r.products };
}
function stereoLead(truth, G2, C2, label, card) {
  const space = card.facts.space;
  if (G2 !== truth.G) {
    const real = space === 'anti' ? 'anti: the two new groups arrive on opposite faces, so they end up trans (the opposite sides)' : 'syn: the two new groups arrive on the same face, so they end up cis (the same side)';
    return `${label} adds ${real}. This option says ${G2 === 'syn' ? 'cis (syn)' : 'trans (anti)'}.`;
  }
  const t = truth.C;
  if (t === 'none') return 'The product has no carbon with four different groups and no cis/trans C=C, so there is no stereochemistry to show.';
  if (t === 'single') return 'The product has no stereocentre. Its only stereochemistry is the geometry of the C=C, and the reagent fixes one geometry, so it is one stereoisomer (not a racemic pair, not meso).';
  if (t === 'meso') return C2 === 'racemic' ? 'The two stereocentres are mirror images of each other (the molecule has a plane of symmetry), so the product is meso: one achiral compound, not a racemic pair.' : 'The product has two stereocentres but a plane of symmetry between them, so it is meso (one achiral compound).';
  // truth racemic
  if (truth.nC >= 2) return C2 === 'meso' ? 'This product has no internal mirror plane: its mirror image is a different compound, so it forms as a racemic pair, not as a meso compound.' : 'The product has stereocentres and no mirror plane, so it is chiral; an achiral reagent makes both enantiomers equally (a racemic pair).';
  return C2 === 'meso' ? 'A meso compound needs at least two stereocentres, and this product has only one. One stereocentre makes it chiral, and an achiral reagent makes both enantiomers equally: a racemic pair.' : 'The product has one stereocentre (a carbon with four different groups). An achiral reagent attacks either face equally, so both enantiomers form: a racemic pair.';
}
/** One stereo-outcome problem for a combo, or null (not a stereo question: ambiguous C=C geometry, or the engine refuses). */
export function buildStereoOutcome(combo, rng) {
  const r = solve(combo.cardId, combo.sub, combo.v);
  if (!r.ok || !r.reacts) return null;
  if (combo.cardId === 'alkyne-hx-1') return null;
  const T = stereoRead(combo.cardId, r);
  if (T.ambiguous) return null;
  if (combo.cardId === 'alkyne-hx-2' || combo.cardId === 'alkyne-hydration' || combo.cardId === 'alkyne-x2-2' || combo.cardId === 'alkyne-h2-pd') { if (T.C !== 'none') return null; }
  const card = HUB_BY_ID[combo.cardId];
  const other = (g) => (g === 'syn' ? 'anti' : 'syn');
  const altC = T.C === 'meso' ? 'racemic' : T.C === 'racemic' ? (T.nC >= 2 ? 'meso' : 'none') : T.C === 'single' ? 'racemic' : 'single';
  let combos;
  if (T.G) combos = [[other(T.G), T.C], [T.G, altC], [other(T.G), altC]];
  else combos = ['meso', 'racemic', 'single', 'none'].filter((c) => c !== T.C).map((c) => [null, c]);
  const opts = optionsFrom(rng, { text: optionText(T.G, T.C), G: T.G, C: T.C, kind: 'major' }, combos.map(([G, C]) => ({ text: optionText(G, C), G, C, kind: 'stereo' })), (o, i) => {
    if (o.correct) return standard(o, i, { G: o.G, C: o.C, why: `Yes. ${cap(optionText(T.G, T.C))}.` });
    const lead = stereoLead(T, o.G, o.C, r.label, card);
    return standard(o, i, { G: o.G, C: o.C, lead, more: `Read the product: ${T.nC} stereocentre${T.nC === 1 ? '' : 's'}${T.ez ? ', a C=C with a fixed geometry' : ''}. ${card.facts.space === 'n.a.' || card.facts.space === 'either' ? 'The reagent adds with no fixed face on its own.' : 'Space: ' + (card.facts.space === 'syn' ? 'syn (same face)' : 'anti (opposite faces)') + '.'}`, why: lead, fact: 'stereo' });
  });
  const prod = r.products.map((p) => `<mol smiles="${p}"></mol>`).join(' + ');
  return {
    kind: 'choice', skill: 'stereo-outcome', mode: 'stereo-outcome', smiles: null,
    equation: { reactants: [combo.sub], products: [], cond: r.label },
    promptHtml: `<b>${r.label}</b> reacts with the ${NOUN[groupOf(combo.cardId)]} drawn below. <i>Indicate any appropriate stereochemistry:</i> which statement describes the product?`,
    prompt: `${r.label}: which statement describes the stereochemistry of the product?`,
    options: opts, answer: opts.find((o) => o.correct).text,
    card: combo.cardId, group: groupOf(combo.cardId), substrate: combo.sub, reagent: combo.v.id, halide: combo.v.halide || null, products: r.products, label: r.label,
    stereo: { nCenters: T.nC, C: T.C, G: T.G, ez: T.ez },
    worked: `1. How does ${r.label} add in space? ${card.facts.space === 'syn' ? 'Syn: the same face' : card.facts.space === 'anti' ? 'Anti: opposite faces' : 'Either face (or nothing to fix)'}. 2. Count stereocentres in the product (a carbon with four different groups): ${T.nC}. 3. ${first(stereoLead(T, T.G, T.C === 'meso' ? 'racemic' : 'meso', r.label, card))}`,
    derive: `${optionText(T.G, T.C)}. The product has ${T.nC} stereocentre${T.nC === 1 ? '' : 's'}.`,
    deriveHtml: `${cap(optionText(T.G, T.C))}. The product is ${prod}.`,
    hints: ['Count the new stereocentres in the product (a carbon with four different groups). None: nothing to show. One: a racemic pair.', `With two new stereocentres: is the addition syn or anti (${card.facts.space === 'n.a.' || card.facts.space === 'either' ? 'this reagent has no fixed face' : card.facts.space})? Then ask whether the product has a mirror plane (meso) or not (racemic pair).`]
  };
}

// ---------------------------------------------------------------- mode 4: two-step roadmap
/** Each template: reagent card A, then reagent card B on A's product. `why` = why this order; `swap` = what goes wrong in the other order. */
export const TEMPLATES = [
  { id: 'alkyne-build-lindlar', A: 'alkyne-acetylide', B: 'alkyne-lindlar', why: 'Build the chain first: NaNH₂ then R–Br needs a terminal ≡C–H, and that H is used up in the first step. Lindlar then turns the new internal alkyne into the cis (Z) alkene (both H add on the same face).', swap: 'Lindlar first would turn the alkyne into an alkene, so there is no ≡C–H left for NaNH₂ to remove and no chain grows.' },
  { id: 'alkyne-build-pd', A: 'alkyne-acetylide', B: 'alkyne-h2-pd', why: 'Build the chain first (NaNH₂ needs the terminal ≡C–H), then H₂ with Pd/C adds two H₂ to the new internal alkyne: the alkane.', swap: 'H₂ with Pd/C first would saturate the alkyne to an alkane, so there is no ≡C–H left and the chain cannot be built.' },
  { id: 'alkyne-build-x2', A: 'alkyne-acetylide', B: 'alkyne-x2-1', why: 'Build the chain first (the terminal ≡C–H is needed), then one X₂ adds anti across the new internal alkyne: the (E)-dihaloalkene.', swap: 'X₂ first would add across the terminal alkyne and use up the triple bond, so NaNH₂ then has no ≡C–H to remove.' },
  { id: 'alkyne-build-x2-2', A: 'alkyne-acetylide', B: 'alkyne-x2-2', why: 'Build the chain first (the terminal ≡C–H is needed), then two X₂ add across the new internal alkyne: the tetrahalide.', swap: 'X₂ first would use up the triple bond, so NaNH₂ then has no ≡C–H to remove.' },
  { id: 'alkyne-build-hydration', A: 'alkyne-acetylide', B: 'alkyne-hydration', why: 'Build the chain first, then hydrate the new alkyne: Markovnikov OH goes on the more substituted carbon and the enol flips to the ketone.', swap: 'Hydration first would turn the terminal alkyne into a ketone, so there is no ≡C–H left for NaNH₂.' },
  { id: 'lindlar-bromine', A: 'alkyne-lindlar', B: 'alkene-x2', why: 'Lindlar makes the cis (Z) alkene first, then X₂ adds anti across that C=C.', swap: 'X₂ first would add across the C≡C, so Lindlar would then have no triple bond left to reduce.' },
  { id: 'lindlar-diol', A: 'alkyne-lindlar', B: 'alkene-kmno4-base', why: 'Lindlar makes the cis alkene first, then KMnO₄ in base adds two OH on the same face (syn).', swap: 'KMnO₄ first would attack the C≡C, so there is no alkyne left for Lindlar to turn into a cis alkene.' },
  { id: 'lindlar-epoxide', A: 'alkyne-lindlar', B: 'alkene-epoxide', why: 'Lindlar makes the cis alkene first, then the peroxyacid puts one O across that C=C (a cis epoxide).', swap: 'The peroxyacid first would react with the C≡C (not an epoxidation of a C=C), so Lindlar then has nothing to do.' },
  { id: 'lindlar-antidiol', A: 'alkyne-lindlar', B: 'alkene-epoxide-diol', why: 'Lindlar makes the cis alkene, RCO₃H makes the epoxide, and H₃O⁺ opens it anti: an anti diol.', swap: 'The peroxyacid first would not give the cis alkene that the epoxide route needs, and Lindlar then has no triple bond left.' },
  { id: 'lindlar-cleavage', A: 'alkyne-lindlar', B: 'alkene-kmno4-acid', why: 'Lindlar makes the alkene first, then KMnO₄ in acid cuts the C=C into two C=O pieces.', swap: 'KMnO₄ first would cut the C≡C, so Lindlar then has nothing left to reduce.' },
  { id: 'lindlar-hx', A: 'alkyne-lindlar', B: 'alkene-hx', why: 'Lindlar stops at the alkene; HBr or HCl then adds across that C=C (H to the carbon with more H, the halogen to the other one).', swap: 'HX first would add across the C≡C (to a vinylic halide), so Lindlar then has no triple bond left to reduce.' },
  { id: 'lindlar-hydration', A: 'alkyne-lindlar', B: 'alkene-hydration', why: 'Lindlar stops at the alkene; H₂O with H₂SO₄ then adds across that C=C (Markovnikov: OH on the carbon with more alkyl groups).', swap: 'Water with acid first would not touch the C≡C the way the alkene route needs, and Lindlar then has no alkyne left to reduce.' },
  { id: 'nitrate-reduce', A: 'eas-nitration', B: 'nitro-reduction', why: 'The ring must carry the NO₂ before it can be reduced: nitrate first, then Fe with H₃O⁺ (and HO⁻) turns NO₂ into NH₂.', swap: 'Fe with H₃O⁺ first has no NO₂ to reduce on the starting ring, so nothing happens and the amine is never made.' },
  { id: 'nitrate-then', A: 'eas-nitration', B: 'director-meta', why: 'NO₂ is a meta director: put it on first, and the next group goes meta to it.', swap: 'Putting the other group on first would place the NO₂ where THAT group directs (ortho/para or meta), not where the target has it.' },
  { id: 'acylate-then', A: 'fc-acylation', B: 'director-meta', why: 'The C=O of the acyl group is a meta director and also stops further acylation: acylate first, then the next group goes meta.', swap: 'Friedel–Crafts cannot be done after the ring carries a strong deactivator, and the other reagent first would put its group where the order of directors is different.' },
  { id: 'alkylate-oxidise', A: 'fc-alkylation', B: 'side-chain-kmno4', why: 'Friedel–Crafts alkylation puts an alkyl group on the ring, and KMnO₄ then turns its benzylic carbon into CO₂H (the rest of the chain is cut off).', swap: 'KMnO₄ first has no alkyl group to oxidise on a plain ring, so nothing happens and the alkylation comes too late.' },
  { id: 'oxidise-then', A: 'side-chain-kmno4', B: 'director-meta', why: 'KMnO₄ turns the alkyl group into CO₂H, a meta director. Do it first, so the next group goes meta to the CO₂H.', swap: 'With the CH₃ still there, the next group would go ortho/para to it, and only afterwards does KMnO₄ change the CH₃. The final positions come out different.' },
  { id: 'oxidise-reduce', A: 'side-chain-kmno4', B: 'nitro-reduction', why: 'Oxidise the CH₃ to CO₂H while the nitro group is still NO₂ (an amine would be attacked too), then reduce the NO₂ to NH₂.', swap: 'KMnO₄ also attacks an NH₂ group, so reducing first and oxidising second does not give the amino acid.' },
  { id: 'hydrogenate-oxidise', A: 'side-chain-h2pd', B: 'side-chain-kmno4', why: 'H₂ with Pd/C reduces the C=C or C≡C outside the ring to an alkyl group; KMnO₄ then turns its benzylic carbon into CO₂H.', swap: 'KMnO₄ first would cut the side chain at the C=C instead, giving a different product, and the H₂ step then has nothing to reduce.' },
  { id: 'acylate-clemmensen', A: 'fc-acylation', B: 'clemmensen', why: 'Acylate first (no rearrangement), then Zn(Hg) with HCl reduces the C=O next to the ring to CH₂: the alkyl chain without the rearrangement problem of direct alkylation.', swap: 'Clemmensen needs a C=O next to the ring, and benzene has none: the reduction can only come after the acylation.' }
];
const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

/** Run the chain: reagent A on the start, then reagent B on A's single product. Returns {ok, s1, s2, p1, final} or {ok:false, at, reason}. */
function runChain(start, a, b) {
  const s1 = solve(a.cardId, start, a.v);
  if (!s1.ok) return { ok: false, at: 1, reason: s1.reason };
  if (!s1.reacts) return { ok: false, at: 1, reason: 'it does not react' };
  if (s1.products.length !== 1) return { ok: false, at: 1, reason: 'it gives more than one product' };
  const s2 = solve(b.cardId, s1.products[0], b.v);
  if (!s2.ok) return { ok: false, at: 2, reason: s2.reason, s1 };
  if (!s2.reacts) return { ok: false, at: 2, reason: 'it does not react', s1 };
  return { ok: true, s1, s2, p1: s1.products[0], final: s2.products, key: s2.key };
}
/** Every valid chain of one template (a start, a variant of A, a variant of B), for the counts and the tests. */
export function chainsOf(t, limitStarts = null) {
  const out = [];
  const starts = DRILL[t.A].subs;
  for (const s of starts) for (const va of variantsFor(t.A, s)) {
    const s1 = solve(t.A, s, va);
    if (!s1.ok || !s1.reacts || s1.products.length !== 1) continue;
    for (const vb of variantsFor(t.B, s1.products[0])) {
      const run = runChain(s, { cardId: t.A, v: va }, { cardId: t.B, v: vb });
      if (run.ok) out.push({ t, start: s, a: { cardId: t.A, v: va }, b: { cardId: t.B, v: vb } });
    }
  }
  return out;
}
const pairText = (l1, l2) => `1. ${l1}<br>2. ${l2}`;
/** One two-step problem for a chain {t, start, a, b}, or null (fewer than three wrong pairs). */
export function buildTwoStep(chain, rng) {
  const { t, start, a, b } = chain;
  const run = runChain(start, a, b);
  if (!run.ok) return null;
  const labelA = run.s1.label, labelB = run.s2.label;
  const rightKey = run.key;
  const cands = [];
  const addCand = (kind, l1, l2, lead, more, rank, steps) => cands.push({ kind, text: pairText(l1, l2), l1, l2, lead, more, rank, steps });
  const ST = (cardId, v) => ({ card: cardId, reagent: v.id, halide: v.halide || null });
  const wrongEnds = (r) => !r.ok || disjoint(r.key, rightKey);        // a pair is wrong when it fails or ends at a compound that shares nothing with the target
  // (a) the two reagents in the other order
  {
    const r = runChain(start, b, a);
    if (wrongEnds(r)) {
      addCand('swapped', labelB, labelA, t.swap, `${t.why}${r.ok ? '' : ` In the other order the chain stops at step ${r.at}: ${failText(r.reason)}.`}`, 0, [ST(t.B, b.v), ST(t.A, a.v)]);
    }
  }
  // (b) the second reagent replaced by another reagent of the same kind, run on A's product
  for (const cardId of REP[groupOf(t.B)] || []) for (const vb of variantsFor(cardId, run.p1)) {
    const S = solve(cardId, run.p1, vb);
    const lab = variantLabel(cardId, vb);
    if (lab === labelB) continue;
    if (S.ok && S.reacts && disjoint(S.key, rightKey)) addCand('second', labelA, lab, `${lab} on the first product gives ${phrase(cardId, vb, run.p1)}, not ${phrase(t.B, b.v, run.p1)}.`, `${t.why} The target needs ${labelB} here.`, 1, [ST(t.A, a.v), ST(cardId, vb)]);
    else if (!S.ok || !S.reacts) addCand('second', labelA, lab, `${lab} does not give the target from the first product: ${S.ok ? 'it does not react' : failText(S.reason)}.`, `${t.why} The target needs ${labelB} here.`, 2, [ST(t.A, a.v), ST(cardId, vb)]);
  }
  // (c) the first reagent replaced by another one, then the right second reagent
  for (const cardId of REP[groupOf(t.A)] || []) for (const va of variantsFor(cardId, start)) {
    const S = solve(cardId, start, va);
    if (!S.ok || !S.reacts || S.label === labelA || S.products.length !== 1) continue;
    const r = runChain(start, { cardId, v: va }, b);
    if (!wrongEnds(r)) continue;
    addCand('first', S.label, labelB, `${S.label} makes a different first product (${phrase(cardId, va, start)}), so the sequence does not end at the target${r.ok ? '' : `: step 2 then fails (${failText(r.reason)})`}.`, `${t.why} The target needs ${labelA} first.`, 1, [ST(cardId, va), ST(t.B, b.v)]);
  }
  // distinct texts, at most one of each kind first, then the rest
  const uniq = [], seenText = new Set([pairText(labelA, labelB)]);
  shuffle(rng, cands).sort((x, y) => x.rank - y.rank).forEach((c) => { if (!seenText.has(c.text)) { seenText.add(c.text); uniq.push(c); } });
  const wrong = [];
  const take = (kind) => { const c = uniq.find((x) => x.kind === kind && !wrong.includes(x)); if (c) wrong.push(c); };
  take('swapped'); take('second'); take('first');
  for (const c of uniq) if (wrong.length < 3 && !wrong.includes(c)) wrong.push(c);
  if (wrong.length < 3) return null;
  const opts = optionsFrom(rng, { text: pairText(labelA, labelB), kind: 'major', steps: [ST(t.A, a.v), ST(t.B, b.v)] }, wrong, (o, i) => {
    if (o.correct) return standard(o, i, { steps: o.steps, why: `Yes. ${t.why}` });
    return standard(o, i, { steps: o.steps, kind2: o.kind, lead: o.lead, more: o.more, why: `${o.lead} ${o.more}`, fact: 'order' });
  });
  const card = HUB_BY_ID[t.A];
  return {
    kind: 'choice', skill: 'two-step', mode: 'two-step', smiles: null,
    equation: { reactants: [start], products: run.final, cond: '? then ?' },
    promptHtml: 'Which two reagents, <b>in this order</b>, turn the starting material into the final product?',
    prompt: 'Which two reagents, in this order, make the final product?',
    options: opts, answer: opts.find((o) => o.correct).text,
    card: t.A, card2: t.B, template: t.id, group: groupOf(t.A), substrate: start, reagent: a.v.id, halide: a.v.halide || null, reagent2: b.v.id, halide2: b.v.halide || null,
    intermediate: run.p1, products: run.final, labels: [labelA, labelB],
    worked: `1. ${labelA}: ${phrase(t.A, a.v, start)}. 2. ${labelB} on that product: ${phrase(t.B, b.v, run.p1)}. ${t.why}`,
    derive: `${labelA} first, then ${labelB}. ${t.why}`,
    deriveHtml: `${labelA} first gives <mol smiles="${run.p1}"></mol>, then ${labelB}. ${t.why}`,
    hints: [`Name the group the target has that the start does not, and the step that makes it. Which of the two reagents has to come first for the second one to have something to act on?`, `${card.facts.where}. Work backwards from the final product: which reagent made the last change, and what did it need?`]
  };
}

// ---------------------------------------------------------------- mode 5: which one will not work? (curated cases)
// Each case: stem (HTML), a pool of options that work (`works`) and a pool of options that fail (`fails`, each with its own reason). A problem takes three that work and one
// that fails. Option = {smiles} (drawn) or {text}. `check` names the engine call that tests/reaction-modes.mjs uses to verify every option; `card` = the reaction-hub card to link.
const S_ = (smiles, reason) => ({ smiles, reason });
const RINGS_OK = ['Cc1ccccc1', 'COc1ccccc1', 'c1ccccc1', 'Clc1ccccc1', 'CCc1ccccc1', 'Cc1ccc(C)cc1'];
const DEACT = [
  S_('O=[N+]([O-])c1ccccc1', 'The NO₂ group is a strong deactivator, so the ring is far less reactive than benzene and the AlCl₃ complex does not attack it. Friedel–Crafts reactions fail on a ring with a strongly deactivating group.'),
  S_('OC(=O)c1ccccc1', 'The CO₂H group (a C=O bonded to the ring) is a strong deactivator, so Friedel–Crafts does not work on this ring.'),
  S_('CC(=O)c1ccccc1', 'The ketone C=O is bonded straight to the ring and deactivates it strongly (and a second acylation or an alkylation cannot start on such a ring). Friedel–Crafts fails here.'),
  S_('N#Cc1ccccc1', 'The C≡N group is a strong deactivator, so the ring is too poor in electrons for Friedel–Crafts.'),
  S_('O=Cc1ccccc1', 'The CHO group is a strong deactivator, so Friedel–Crafts does not work on this ring.'),
  S_('COC(=O)c1ccccc1', 'The ester C=O bonded to the ring deactivates it strongly, so Friedel–Crafts fails.')
];
export const WONT_CASES = [
  { id: 'fc-alkylation-deactivated', card: 'fc-alkylation', check: { kind: 'subst', reagent: 'RCl', halide: 'CCl' },
    stem: 'Each of these rings is treated with <b>CH₃Cl and AlCl₃</b> (Friedel–Crafts alkylation).', ask: 'Which one will <b>not</b> react?',
    works: RINGS_OK.map((s) => ({ smiles: s })), fails: DEACT, hint: 'Look at the group already on each ring: is it one that makes the ring much poorer in electrons?' },
  { id: 'fc-acylation-deactivated', card: 'fc-acylation', check: { kind: 'subst', reagent: 'RCOCl', halide: 'CC(=O)Cl' },
    stem: 'Each of these rings is treated with <b>CH₃COCl and AlCl₃</b> (Friedel–Crafts acylation).', ask: 'Which one will <b>not</b> react?',
    works: RINGS_OK.map((s) => ({ smiles: s })), fails: DEACT, hint: 'Look at the group already on each ring: is it one that makes the ring much poorer in electrons?' },
  { id: 'fc-amine', card: 'fc-alkylation', check: { kind: 'subst', reagent: 'RCl', halide: 'CCCl' },
    stem: 'Each of these rings is treated with <b>CH₃CH₂Cl and AlCl₃</b> (Friedel–Crafts alkylation).', ask: 'Which one will <b>not</b> react?',
    works: ['Cc1ccccc1', 'COc1ccccc1', 'c1ccccc1', 'Clc1ccccc1', 'CC(C)c1ccccc1', 'Cc1ccc(Cl)cc1'].map((s) => ({ smiles: s })),
    fails: [S_('Nc1ccccc1', 'The N lone pair bonds to AlCl₃ (a Lewis acid), which puts a positive charge on N. The ring is then strongly deactivated and the catalyst is used up, so Friedel–Crafts fails on an aromatic amine.'),
      S_('CNc1ccccc1', 'The N lone pair bonds to AlCl₃, which puts a positive charge on N and strongly deactivates the ring. Friedel–Crafts fails on an aromatic amine.'),
      S_('CN(C)c1ccccc1', 'The N lone pair bonds to AlCl₃, which puts a positive charge on N and strongly deactivates the ring. Friedel–Crafts fails on an aromatic amine.')],
    hint: 'Which ring has an atom with a lone pair that the Lewis acid AlCl₃ would grab?' },
  { id: 'fc-rearrangement', card: 'fc-alkylation', check: { kind: 'halide' },
    stem: 'Benzene is treated with <b>AlCl₃</b> and each of these alkyl chlorides. The aim is the alkylbenzene with the alkyl group exactly as it is in the chloride.', ask: 'Which one will <b>not</b> give that product?',
    works: ['CCl', 'CCCl', 'CC(C)Cl', 'CC(C)(C)Cl', 'ClC1CCCCC1'].map((s) => ({ smiles: s })),
    fails: [S_('CCCCl', 'A primary carbocation rearranges (a hydride shifts) to the more stable secondary one, so the ring gets an isopropyl group, not a propyl group.'),
      S_('CCCCCl', 'The primary carbocation rearranges (a hydride shift) to a more stable secondary cation, so the ring gets a sec-butyl group, not a butyl group.'),
      S_('CC(C)CCl', 'The primary carbocation rearranges (a hydride shift) to the tertiary cation, so the ring gets a tert-butyl group, not an isobutyl group.')],
    hint: 'Which chloride would form a primary carbocation that can rearrange to a more stable one?' },
  { id: 'fc-vinyl-aryl-halide', card: 'fc-alkylation', check: { kind: 'halide' },
    stem: 'Benzene is treated with <b>AlCl₃</b> and each of these chlorides (a Friedel–Crafts alkylation).', ask: 'Which one will <b>not</b> alkylate the ring?',
    works: ['CCl', 'CCCl', 'CC(C)Cl', 'CC(C)(C)Cl', 'ClC1CCCCC1'].map((s) => ({ smiles: s })),
    fails: [S_('Clc1ccccc1', 'An aryl halide does not work: AlCl₃ cannot pull Cl⁻ off a ring carbon to make a carbocation, so there is no electrophile.'),
      S_('ClC=C', 'A vinylic halide does not work: AlCl₃ cannot pull Cl⁻ off a C=C carbon to make a (very unstable) vinylic cation.'),
      S_('ClC(C)=C', 'A vinylic halide does not work: AlCl₃ cannot pull Cl⁻ off a C=C carbon to make a vinylic cation.')],
    hint: 'Which chloride has its Cl on an sp² carbon, so no carbocation can form?' },
  { id: 'h2pd-ring-alone', card: 'side-chain-h2pd', check: { kind: 'hydrogenate' },
    stem: 'Each of these is treated with <b>H₂ and Pd/C at 1 atm</b>.', ask: 'Which one will <b>not</b> react?',
    works: ['C=Cc1ccccc1', 'C#Cc1ccccc1', 'C=CCc1ccccc1', 'CC=Cc1ccccc1', 'C=CCCc1ccccc1', 'CC#Cc1ccccc1'].map((s) => ({ smiles: s })),
    fails: [S_('c1ccccc1', 'Benzene is not reduced by H₂ and Pd/C at ordinary pressure: its π system is much more stable than an ordinary C=C. (Ring reduction needs Pt or Rh and high pressure.)'),
      S_('Cc1ccccc1', 'The ring is not reduced by H₂ and Pd/C at ordinary pressure, and the CH₃ group has no C=C or C≡C to reduce, so nothing happens.'),
      S_('CCc1ccccc1', 'The ring is not reduced by H₂ and Pd/C at ordinary pressure, and the ethyl group has no C=C or C≡C to reduce, so nothing happens.')],
    hint: 'Pd/C at 1 atm reduces C=C and C≡C. Which molecule has none outside the ring?' },
  { id: 'kmno4-no-benzylic-h', card: 'side-chain-kmno4', check: { kind: 'oxidize' },
    stem: 'Each of these is heated with <b>KMnO₄ and water</b>.', ask: 'Which one will <b>not</b> react?',
    works: ['Cc1ccccc1', 'CCc1ccccc1', 'CC(C)c1ccccc1', 'CCCc1ccccc1', 'CCCCc1ccccc1', 'Cc1ccc(Cl)cc1'].map((s) => ({ smiles: s })),
    fails: [S_('CC(C)(C)c1ccccc1', 'tert-Butyl has no H on its benzylic carbon (the carbon bonded to the ring has four C–C bonds), so KMnO₄ cannot start the oxidation.'),
      S_('c1ccccc1', 'Benzene has no alkyl side chain to oxidise, and KMnO₄ does not attack the ring itself.'),
      S_('Clc1ccccc1', 'There is no alkyl side chain to oxidise, and KMnO₄ does not attack the ring or the C–Cl bond.')],
    hint: 'KMnO₄ attacks a C–H on the benzylic carbon. Which molecule has no such H (or no side chain at all)?' },
  { id: 'nbs-no-benzylic-h', card: 'benzylic-bromination', check: { kind: 'benzylicH' },
    stem: 'Each of these is treated with <b>NBS and heat</b> (benzylic bromination).', ask: 'Which one will <b>not</b> react?',
    works: ['Cc1ccccc1', 'CCc1ccccc1', 'CC(C)c1ccccc1', 'CCCc1ccccc1'].map((s) => ({ smiles: s })),
    fails: [S_('CC(C)(C)c1ccccc1', 'The benzylic carbon of tert-butyl has no H to give up, so the benzylic radical cannot form.'),
      S_('c1ccccc1', 'Benzene has no benzylic carbon: NBS (or Br₂ with light) does not put Br on the ring itself (that needs FeBr₃).'),
      S_('Clc1ccccc1', 'There is no benzylic carbon, and NBS does not brominate the ring (that needs Br₂ with FeBr₃).')],
    hint: 'The radical forms at the benzylic carbon by losing an H. Which molecule has no benzylic H?' },
  { id: 'pcc-tertiary-alcohol', card: 'oxidation-pcc', check: { kind: 'carbinolH' },
    stem: 'Each of these alcohols is treated with <b>PCC in CH₂Cl₂</b>.', ask: 'Which one will <b>not</b> be oxidised?',
    works: ['CCCCO', 'CCC(C)O', 'OC1CCCCC1', 'CC(C)O', 'CC(O)c1ccccc1', 'CCCCCO'].map((s) => ({ smiles: s })),
    fails: [S_('CC(C)(C)O', 'A tertiary alcohol has no H on the carbon that bears the OH, and the oxidation takes that H, so there is no reaction.'),
      S_('CCC(C)(C)O', 'A tertiary alcohol has no H on the carbon that bears the OH, and the oxidation takes that H, so there is no reaction.'),
      S_('CC1(O)CCCCC1', 'This is a tertiary alcohol: the C–OH carbon has no H, so PCC (like any Cr(VI) oxidant) cannot oxidise it.')],
    hint: 'Oxidation of an alcohol removes the H on the C–OH carbon. Which alcohol has none?' },
  { id: 'acetylide-internal-alkyne', card: 'alkyne-acetylide', check: { kind: 'acetylide' },
    stem: 'Each of these alkynes is treated with <b>NaNH₂, then CH₃CH₂Br</b>.', ask: 'Which one will <b>not</b> be alkylated?',
    works: ['CC#C', 'CCC#C', 'CCCC#C', 'CCCCC#C', 'CCCCCC#C'].map((s) => ({ smiles: s })),
    fails: [S_('CC#CC', 'But-2-yne is an internal alkyne: it has no H on the triple bond, so NaNH₂ has no acidic ≡C–H to remove and no acetylide forms.'),
      S_('CCC#CCC', 'Hex-3-yne is an internal alkyne: it has no ≡C–H, so NaNH₂ cannot make an acetylide.'),
      S_('CCCC#CCCC', 'Oct-4-yne is an internal alkyne: it has no ≡C–H (the acidic H, pKa about 25), so no acetylide forms.')],
    hint: 'NaNH₂ removes the H on the triple bond. Which alkyne has no H there?' },
  { id: 'acetylide-hindered-halide', card: 'alkyne-acetylide', check: { kind: 'acetylideHalide' },
    stem: 'The acetylide ion of propyne is treated with each of these alkyl bromides (an SN2 alkylation).', ask: 'Which one will <b>not</b> give the alkylated alkyne?',
    works: ['CBr', 'CCBr', 'CCCBr', 'CCCCBr'].map((s) => ({ smiles: s })),
    fails: [S_('CC(C)Br', 'Only methyl and primary alkyl halides work with an acetylide ion. A secondary halide is too hindered for the SN2 attack (the acetylide is also a strong base, so elimination wins).'),
      S_('CC(C)(C)Br', 'A tertiary alkyl halide cannot be attacked from the back, and the acetylide ion is a strong base, so it eliminates HBr instead. Only methyl and primary halides work.')],
    hint: 'Which bromide has its Br on a carbon that is too crowded to be attacked?' },
  { id: 'lindlar-terminal-no-cis', card: 'alkyne-lindlar', check: { kind: 'lindlar' },
    stem: 'Each of these alkynes is treated with <b>H₂ and Lindlar catalyst</b> (1 equivalent).', ask: 'Which one will <b>not</b> give a cis (Z) alkene?',
    works: ['CC#CC', 'CCC#CCC', 'CCCC#CCCC', 'CC#CCC', 'CC#CCCC'].map((s) => ({ smiles: s })),
    fails: [S_('CC#C', 'Propyne gives propene, CH₃CH=CH₂. One C=C carbon has two H, so there is no cis/trans and nothing can be Z.'),
      S_('CCCCC#C', 'Hex-1-yne gives hex-1-ene, which has a CH₂= end: with two H on one C=C carbon there is no cis/trans, so no Z alkene.'),
      S_('CCC#C', 'But-1-yne gives but-1-ene, with a CH₂= end. Two H on one carbon means no cis/trans, so no Z alkene.')],
    hint: 'A cis alkene needs two different groups on EACH C=C carbon. Which product has a carbon with two H?' },
  { id: 'hydration-no-aldehyde', card: 'alkyne-hydration', check: { kind: 'hydrationTarget' },
    stem: 'These compounds are targets. Each one is to be made by <b>hydrating a terminal alkyne</b> with H₂O, H₂SO₄ and HgSO₄.', ask: 'Which one can <b>not</b> be made this way?',
    works: ['CCCC(C)=O', 'CCCCC(C)=O', 'CCC(C)=O', 'CC(C)CC(C)=O', 'CCCCCC(C)=O'].map((s) => ({ smiles: s })),
    fails: [S_('CCCCC=O', 'Markovnikov hydration puts the OH (then the C=O) on the more substituted carbon, so a terminal alkyne gives a METHYL KETONE, never an aldehyde. An aldehyde needs hydroboration (BH₃, then H₂O₂, NaOH).'),
      S_('CCCCCC=O', 'Hydration with Hg²⁺ puts the C=O on the more substituted carbon, so a terminal alkyne gives a methyl ketone, not an aldehyde. The aldehyde needs anti-Markovnikov hydroboration.'),
      S_('CCCC=O', 'Hg²⁺ hydration is Markovnikov: the C=O ends up on the inner carbon, so a terminal alkyne never gives an aldehyde (hydroboration does).')],
    hint: 'Where does the C=O end up after Markovnikov hydration of a terminal alkyne: on the end carbon or the one next to it?' },
  { id: 'hydroxide-pka', card: 'alkyne-acetylide', check: { kind: 'acid', base: 'water' },
    stem: 'Hydroxide, <b>HO⁻</b> (its conjugate acid is water, pKa 15.74), is mixed with each of these acids.', ask: 'Which one will <b>not</b> be deprotonated to a useful extent (the equilibrium favours the acid)?',
    works: [{ acid: 'acetic' }, { acid: 'hcn' }, { acid: 'h3po4' }, { acid: 'h2po4' }, { acid: 'hno3' }], fails: [{ acid: 'acetone', reason: 'The pKa of acetone (19.3) is higher than that of water (15.74), so the equilibrium lies on the side of acetone and hydroxide: HO⁻ is too weak a base to deprotonate it.' }, { acid: 'acetylene', reason: 'The pKa of the ≡C–H of acetylene (25) is much higher than that of water (15.74), so HO⁻ cannot deprotonate it. A stronger base is needed: NaNH₂ (NH₃ has pKa about 36).' }, { acid: 'ammonia', reason: 'The pKa of NH₃ (about 36) is far above that of water (15.74), so HO⁻ does not deprotonate ammonia.' }],
    hint: 'The equilibrium favours the weaker acid. Which acid is weaker than water (larger pKa than 15.74)?' },
  { id: 'bromine-without-catalyst', card: 'alkene-x2', check: { kind: 'br2' },
    stem: 'Each of these is mixed with <b>Br₂ in CH₂Cl₂</b> (no catalyst).', ask: 'Which one will <b>not</b> react?',
    works: ['C1=CCCCC1', 'CC=C', 'CCCCC=C', 'CC(C)=C', 'C1=CCCC1'].map((s) => ({ smiles: s })),
    fails: [S_('c1ccccc1', 'Benzene is aromatic, so it keeps its ring and does not add Br₂. (It reacts only by substitution, and only with FeBr₃ as catalyst.)'),
      S_('C1CCCCC1', 'Cyclohexane has no C=C: there is no π bond for Br₂ to add to, so nothing happens in the dark.'),
      S_('CCCCCC', 'Hexane has no C=C: there is no π bond for Br₂ to add to, so nothing happens.')],
    hint: 'Br₂ without a catalyst adds across a π bond. Which molecule has no ordinary C=C?' },
  { id: 'nitration-directing', card: 'director-meta', check: { kind: 'directs', reagent: 'HNO3' },
    stem: 'Each of these rings is nitrated with <b>HNO₃ and H₂SO₄</b>.', ask: 'Which one will <b>not</b> give mainly ortho and para products?',
    works: ['Cc1ccccc1', 'COc1ccccc1', 'Clc1ccccc1', 'Oc1ccccc1', 'CCc1ccccc1', 'Brc1ccccc1'].map((s) => ({ smiles: s })),
    fails: [S_('O=[N+]([O-])c1ccccc1', 'NO₂ is a meta director (a strong deactivator): the new NO₂ goes meta to it.'),
      S_('OC(=O)c1ccccc1', 'CO₂H is a meta director (a deactivator): the new group goes meta to it, not ortho or para.'),
      S_('CC(=O)c1ccccc1', 'The acyl group (a C=O on the ring) is a meta director, so the new NO₂ goes meta.'),
      S_('Nc1ccccc1', 'In the strong acid the NH₂ is protonated to NH₃⁺, a meta director that deactivates the ring. Aniline does not give clean ortho and para nitration.')],
    hint: 'Which group on the ring is a meta director (a deactivator), not an ortho/para director?' },
  { id: 'primary-alcohol-to-acid', card: 'oxidation-cr', check: { kind: 'text' },
    stem: 'You want to turn a primary alcohol, RCH₂OH, into the carboxylic acid RCO₂H.', ask: 'Which reagent will <b>not</b> get you there?',
    works: [{ text: 'Na₂Cr₂O₇, H₂SO₄, H₂O' }, { text: 'CrO₃, H₃O⁺' }, { text: 'KMnO₄' }],
    fails: [{ text: 'PCC, CH₂Cl₂', reason: 'PCC in CH₂Cl₂ has no water, so the oxidation stops at the aldehyde. The acid needs a Cr(VI) oxidant in water (Na₂Cr₂O₇, H₂SO₄, H₂O) or KMnO₄.' }],
    hint: 'Which oxidant is used without water, so the aldehyde cannot be oxidised further?' }
];
const REASON_WORKS = {
  'fc-alkylation-deactivated': 'this ring is at least as reactive as benzene, so the carbocation attacks it and the alkyl group goes on',
  'fc-acylation-deactivated': 'this ring is at least as reactive as benzene, so the acylium ion attacks it and the acyl group goes on',
  'fc-amine': 'this ring has no group that binds AlCl₃ or deactivates it, so the alkylation goes',
  'fc-rearrangement': 'this chloride gives a carbocation that does not rearrange to anything better, so the alkyl group goes on exactly as written',
  'fc-vinyl-aryl-halide': 'this is an alkyl chloride: AlCl₃ pulls off Cl⁻ and the carbocation alkylates the ring',
  'h2pd-ring-alone': 'it has a C=C or C≡C outside the ring, and H₂ with Pd/C reduces that',
  'kmno4-no-benzylic-h': 'it has an H on the benzylic carbon, so KMnO₄ oxidises the side chain to CO₂H',
  'nbs-no-benzylic-h': 'its benzylic carbon has an H, so the benzylic radical forms and Br goes there',
  'pcc-tertiary-alcohol': 'the C–OH carbon has an H, so PCC oxidises it (a 1° alcohol to an aldehyde, a 2° alcohol to a ketone)',
  'acetylide-internal-alkyne': 'it is a terminal alkyne, so NaNH₂ removes the ≡C–H and the acetylide attacks CH₃CH₂Br',
  'acetylide-hindered-halide': 'it is a methyl or primary halide, so the acetylide can attack it from the back (SN2)',
  'lindlar-terminal-no-cis': 'it is an internal alkyne, so the alkene has two different groups on each carbon and the cis (Z) isomer forms',
  'hydration-no-aldehyde': 'this methyl ketone is what Markovnikov hydration of a terminal alkyne gives',
  'hydroxide-pka': 'its pKa is lower than that of water (15.74), so HO⁻ takes the H and the equilibrium favours the products',
  'bromine-without-catalyst': 'it has a C=C, and Br₂ adds across it',
  'nitration-directing': 'it carries an ortho/para director, so the NO₂ goes ortho and para',
  'primary-alcohol-to-acid': 'it oxidises the alcohol all the way to the acid (in water the aldehyde is oxidised again)'
};
export const WONT_PROBLEM_COUNT = WONT_CASES.reduce((n, c) => n + choose3(c.works.length) * c.fails.length, 0);
function choose3(n) { return (n * (n - 1) * (n - 2)) / 6; }
const acidText = (a) => `${ACID[a].haLabel} (pKa ${ACID[a].pkaText})`;

/** One wont-work problem: case + the indices of the three that work and the one that fails. */
export function buildWontWork(c, rng) {
  const works = shuffle(rng, c.works).slice(0, 3);
  const fail = pick(rng, c.fails);
  const mk = (o, correct) => (o.smiles ? { smiles: o.smiles } : { text: o.text || acidText(o.acid) });
  const optsRaw = shuffle(rng, [...works.map((w) => ({ ...mk(w), correct: false, src: w })), { ...mk(fail), correct: true, src: fail }]);
  const drawn = optsRaw.some((o) => o.smiles);
  const opts = optsRaw.map((o, i) => {
    const base = drawn ? { smiles: o.smiles, text: 'Option ' + LETTERS[i] } : { text: o.text };
    if (o.correct) return { ...base, correct: true, kind: 'fails', why: `Yes, this is the one that fails. ${fail.reason}` };
    const lead = `This one does work: ${REASON_WORKS[c.id]}.`, more = `The one that fails is the one with the problem named on the card: ${c.hint}`;
    return { ...base, correct: false, kind: 'works', lead, more, why: `${lead} ${more}`, fact: 'works' };
  });
  const card = HUB_BY_ID[c.card];
  return {
    kind: 'choice', skill: 'wont-work', mode: 'wont-work', smiles: null,
    promptHtml: `${c.stem} Three of the four work. ${c.ask}`,
    prompt: 'Which one will not work?',
    options: opts, answer: opts.find((o) => o.correct).text,
    card: c.card, group: card.group, caseId: c.id, works: works.map((w) => w.smiles || w.text || w.acid), fails: fail.smiles || fail.text || fail.acid,
    worked: `The one that fails: ${fail.reason}`,
    derive: fail.reason,
    hints: [c.hint, 'Test each option against the condition that stops this reaction. Three pass the test; one does not.']
  };
}

// ---------------------------------------------------------------- the generator
let lastKey = null;
let modeCard = null;
/** Limit the "which reagent?" mode to one reaction-hub card (the hub's "Practise this reagent" button); null = every card. */
export function setModeCard(cardId) { modeCard = cardId && GUESS_REAGENT_CARDS.includes(cardId) ? cardId : null; }
function randomCombo(rng, cards) {
  for (let t = 0; t < 400; t++) {
    const cardId = pick(rng, cards), e = DRILL[cardId];
    const s = pick(rng, e.subs), v = pick(rng, e.variants);
    if ((v.skip || []).includes(s)) continue;
    return { cardId, sub: s, v };
  }
  return null;
}
function makeOne(mode, rng) {
  for (let tries = 0; tries < 400; tries++) {
    let p = null;
    if (mode === 'guess-reagent' || mode === 'guess-reactant') {
      const combo = randomCombo(rng, mode === 'guess-reagent' && modeCard ? [modeCard] : ENGINE_CARDS);
      p = mode === 'guess-reagent' ? buildGuessReagent(combo, rng) : buildGuessReactant(combo, rng);
    } else if (mode === 'stereo-outcome') {
      const combo = randomCombo(rng, STEREO_CARDS);
      p = buildStereoOutcome(combo, rng);
      // a question that has something to show (a stereocentre or a cis/trans C=C) is asked 3 times in 4
      if (p && p.stereo.C === 'none' && rng() < 0.65) p = null;
    } else if (mode === 'two-step') {
      const t = pick(rng, TEMPLATES);
      const s = pick(rng, DRILL[t.A].subs), va = pick(rng, DRILL[t.A].variants);
      if ((va.skip || []).includes(s)) continue;
      const s1 = solve(t.A, s, va);
      if (!s1.ok || !s1.reacts || s1.products.length !== 1) continue;
      const vb = pick(rng, variantsFor(t.B, s1.products[0]));
      if (!vb) continue;
      p = buildTwoStep({ t, start: s, a: { cardId: t.A, v: va }, b: { cardId: t.B, v: vb } }, rng);
    } else p = buildWontWork(pick(rng, WONT_CASES), rng);
    if (!p) continue;
    const key = `${p.mode}|${p.card}|${p.substrate || p.caseId}|${p.reagent || ''}|${p.halide || ''}|${p.reagent2 || ''}`;
    if (key === lastKey && tries < 50) continue;
    lastKey = key;
    return p;
  }
  throw new Error('no ' + mode + ' problem');
}
export function makeReactionModeProblem(mode, rng = Math.random) { return makeOne(mode, rng); }
export function generateReactionModes(mode, count, { rng = Math.random } = {}) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(makeOne(mode, rng));
  return out;
}
/** Every (card, substrate, variant) combo of the given cards (the drill's own pools): for the counts and the tests. */
export function allCombos(cards = ENGINE_CARDS) {
  return cards.flatMap((cardId) => DRILL[cardId].subs.flatMap((sub) => variantsFor(cardId, sub).map((v) => ({ cardId, sub, v }))));
}
export { solve as solveForModes, TEMPLATE_BY_ID, ENGINE_CARDS };
