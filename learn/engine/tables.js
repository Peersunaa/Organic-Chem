// Reaction tables (#table): every builder tile of a class (rows) against a fixed set of the builder's reagents (columns). Pure logic, no DOM; RDKit must be ready.
//   TABLES                 the three tables: alkenes (12 x 11), alkynes (7 x 11), rings (the 25 one-group-and-exam ring tiles x 6, the exam set)
//   tableData(id)          rows with one cell per column: {status 'ok'|'none'|'na', tag, family, draw:[<= 2 main products], more, minor, reason, cave, card, skill, note}
//   tagOf(table, res, sub) the one-word pattern tag, read from the builder's own result (rule, reagent card, ring directors, product count): see TAG_RULES below
//   cellQuiz(sub, rid)     the builder's four drawn options (generators-predict.js drill options when they match, else the products of other reagents on the same substrate)
//   exportTables()         the JSON the printable PDFs are built from (study-guide/_tables_export.mjs writes it; tests/tables.mjs checks it equals this page's data)
// Every product, status and reason comes from engine/builder.js `react()`; nothing here types a product.
import * as B from './builder.js';
import * as ER from './eas-rules.js';
import { HUB_BY_ID } from './reaction-hub.js';
import { stereoKey } from './reactions-additions.js';

const C = (id, head, note = '') => ({ id, head, note });
export const TABLES = [
  { id: 'alkenes', label: 'Alkenes', group: 'alkene', cols: [C('HBr', 'HBr'), C('HCl', 'HCl'), C('H2O-H', 'H₂O, H⁺'), C('Br2', 'Br₂'), C('Cl2', 'Cl₂'), C('H2-Pd', 'H₂, Pd'), C('KMnO4-cold', 'cold KMnO₄'), C('KMnO4-hot', 'hot KMnO₄'), C('RCO3H', 'RCO₃H'), C('RCO3H-H3O', 'RCO₃H, then H₃O⁺'), C('BH3', 'BH₃, then H₂O₂/NaOH')] },
  { id: 'alkynes', label: 'Alkynes', group: 'alkyne', cols: [C('HBr-1', 'HX (1 eq)', 'X = Br'), C('HBr-2', 'HX (2 eq)', 'X = Br'), C('Br2-1', 'X₂ (1 eq)', 'X = Br'), C('Br2-2', 'X₂ (2 eq)', 'X = Br'), C('H2O-Hg', 'H₂O, Hg²⁺'), C('Lindlar', 'H₂, Lindlar'), C('Na-NH3', 'Na, NH₃'), C('H2-Pd-2', 'H₂, Pd'), C('NaNH2-EtBr', 'NaNH₂, then RBr', 'R = CH₃CH₂'), C('BH3-alkyne', 'BH₃, then H₂O₂'), C('KMnO4-hot-alkyne', 'hot KMnO₄')] },
  { id: 'rings', label: 'Rings', group: 'ring', cols: [C('Br2-FeBr3', 'Br₂, FeBr₃'), C('Cl2-AlCl3', 'Cl₂, AlCl₃'), C('HNO3', 'HNO₃, H₂SO₄'), C('SO3', 'SO₃, H₂SO₄'), C('AcCl', 'RCOCl, AlCl₃', 'R = CH₃'), C('EtCl', 'RCl, AlCl₃', 'R = CH₃CH₂')] }
];
export const TABLE_BY_ID = Object.fromEntries(TABLES.map((t) => [t.id, t]));
TABLES.forEach((t) => t.cols.forEach((c) => { c.label = B.REAGENT_BY_ID[c.id].label; c.card = B.REAGENT_BY_ID[c.id].card; }));

/** The allowed tags of each table ('no rxn' marks a pair the builder says does not react, in every table). */
export const TAGS = {
  alkenes: ['Markovnikov', 'anti-Markov.', 'anti', 'syn', 'cleave', 'epoxide', 'no rxn'],
  alkynes: ['Markov.', '2×', 'gem', 'cis', 'trans', 'alkane', 'ketone', 'aldehyde', 'C–C', 'cleave', 'no rxn'],
  rings: ['o/p', 'meta', 'no rxn', 'one isomer']
};
/** Pattern families for the highlight toggle: hue AND a glyph (readable without colour). Pairs: Markovnikov vs anti-Markovnikov, syn vs anti, o/p vs meta. */
export const FAMILIES = [
  { id: 'mk', label: 'Markovnikov', glyph: '▲', pair: 'regio' }, { id: 'amk', label: 'anti-Markovnikov', glyph: '▼', pair: 'regio' },
  { id: 'syn', label: 'syn: same face', glyph: '●', pair: 'space' }, { id: 'anti', label: 'anti: opposite faces', glyph: '◆', pair: 'space' },
  { id: 'op', label: 'ortho/para', glyph: '✚', pair: 'ring' }, { id: 'meta', label: 'meta', glyph: '■', pair: 'ring' }
];
export const FAMILY_BY_ID = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));
const FAMILY_OF_TAG = { Markovnikov: 'mk', 'anti-Markov.': 'amk', anti: 'anti', syn: 'syn', epoxide: 'syn', 'Markov.': 'mk', gem: 'mk', aldehyde: 'amk', cis: 'syn', trans: 'anti', 'o/p': 'op', meta: 'meta' };
/** The family of a tag in a cell (the alkyne ketone is Markovnikov only when it comes from Hg²⁺ hydration, not from hydroboration of an internal alkyne). */
export function familyOf(tag, rule) {
  if (tag === 'ketone') return rule === 'markovnikov' ? 'mk' : null;
  return FAMILY_OF_TAG[tag] || null;
}

/** How each tag is read from the builder's result:
 *   alkenes: rule markovnikov -> Markovnikov; anti-markovnikov -> anti-Markov.; anti-addition -> anti; syn-addition -> syn (epoxide for RCO₃H); cleavage -> cleave
 *   alkynes: rule + reagent card: markovnikov on alkyne-hx-1 -> Markov., on alkyne-hx-2 -> gem, on alkyne-hydration -> ketone; anti-addition on x2-1 -> trans,
 *            on x2-2 -> 2×; syn-addition -> cis; anti-reduction -> trans; full-reduction -> alkane; acetylide -> C–C; anti-markovnikov -> aldehyde; hydroboration -> ketone;
 *            cleavage (hot KMnO₄) -> cleave
 *   rings:   no directing group -> one isomer; every leading group a meta director -> meta; two or more groups and one product -> one isomer; else o/p
 *   any:     status 'none' -> no rxn; status 'na' -> no tag */
export function tagOf(tableId, res, sub) {
  if (res.status === 'none') return 'no rxn';
  if (res.status !== 'ok') return null;
  const card = B.REAGENT_BY_ID[res.reagent.id].card;
  if (tableId === 'alkenes') {
    if (res.rule === 'syn-addition') return res.reagent.id === 'RCO3H' ? 'epoxide' : 'syn';
    return { markovnikov: 'Markovnikov', 'anti-markovnikov': 'anti-Markov.', 'anti-addition': 'anti', cleavage: 'cleave' }[res.rule] || null;
  }
  if (tableId === 'alkynes') {
    if (res.rule === 'markovnikov') return { 'alkyne-hx-1': 'Markov.', 'alkyne-hx-2': 'gem', 'alkyne-hydration': 'ketone' }[card] || null;
    if (res.rule === 'anti-addition') return card === 'alkyne-x2-2' ? '2×' : 'trans';
    return { 'syn-addition': 'cis', 'anti-reduction': 'trans', 'full-reduction': 'alkane', acetylide: 'C–C', 'anti-markovnikov': 'aldehyde', hydroboration: 'ketone', cleavage: 'cleave' }[res.rule] || null;
  }
  const scan = ER.ringScan(sub);
  const L = res.leaders || [];
  if (!scan.groups.length || !L.length) return 'one isomer';
  if (L.every((g) => g.dir === 'm')) return 'meta';
  if (scan.groups.length >= 2 && res.products.filter((p) => !p.excess).length === 1) return 'one isomer';
  return 'o/p';
}

/** The weak-spot skill a missed cell is logged under (skills.js ids), by the reagent's hub card; ring cells with a group on the ring are a directing question. */
const CARD_SKILL = {
  'alkene-hx': 'markovnikov', 'alkene-hydration': 'markovnikov', 'alkene-hydroboration': 'markovnikov', 'alkene-x2': 'stereo-addition', 'alkene-h2-pd': 'stereo-addition',
  'alkene-epoxide': 'stereo-addition', 'alkene-epoxide-diol': 'stereo-addition', 'alkene-kmno4-base': 'alkene-oxidation', 'alkene-kmno4-acid': 'alkene-oxidation',
  'alkyne-acetylide': 'acetylides'
};
export function skillOf(card, tableId, tag) {
  if (CARD_SKILL[card]) return CARD_SKILL[card];
  if (tableId === 'alkynes') return 'alkynes';
  return tag === 'o/p' || tag === 'meta' ? 'directors' : 'eas';
}

// ---------------------------------------------------------------- caveman: one terse line per cell, from the hub cards' caveman facts (the first sentence of `where`;
// the `adds` fact goes in front when `where` alone is a word or two)
const dot = (s) => { const x = String(s || '').trim(); return x ? (/[.!?]$/.test(x) ? x : x + '.') : ''; };
function caveOf(tableId, res, card, tag, sub) {
  const cf = HUB_BY_ID[card] && HUB_BY_ID[card].caveman && HUB_BY_ID[card].caveman.facts;
  if (!cf) return '';
  const first = (x) => dot(String(x || '').split(/(?<=\.)\s+/)[0]);
  if (tableId !== 'rings') { const w = first(cf.where); return w.length < 14 ? [dot(cf.adds), w].join(' ') : w; }
  const L = res.leaders || [];
  const dirCard = tag === 'meta' ? 'director-meta' : L.some((g) => g.rank === 3) ? 'director-halogen' : 'director-activating';
  const where = !L.length ? HUB_BY_ID['eas-bromination'].caveman.facts.where : HUB_BY_ID[dirCard].caveman.facts.where;
  // rings: the director's where only (the reagent cards' adds name one halogen: eas-bromination also stands for Cl₂)
  return [L.length ? first(where) : dot(where), tag === 'one isomer' && L.length ? 'One spot.' : ''].filter(Boolean).join(' ');
}

// ---------------------------------------------------------------- cells
const uniq = (arr) => [...new Set(arr)];
function minorNote(res) {
  const minors = res.products.filter((p) => p.minor && !p.excess);
  if (!minors.length) return '';
  const pos = uniq(minors.map((p) => ((p.label || '').match(/^(ortho|meta|para)\b/) || [])[1]).filter(Boolean));
  return '+ ' + (pos.length ? pos.join(', ') : 'minor');
}
const stereoFree = (smiles) => !/[/\\]/.test(smiles);
/** One cell of a table: the builder's result for (substrate, reagent), reduced to what a table cell shows. */
export function cellOf(tableId, sub, reagentId) {
  const res = B.react(sub, reagentId);
  const card = B.REAGENT_BY_ID[reagentId].card;
  const tag = tagOf(tableId, res, sub);
  const cell = { reagent: reagentId, status: res.status, tag, family: res.status === 'ok' ? familyOf(tag, res.rule) : null, rule: res.rule || null, card, draw: [], more: 0, minor: '', reason: '', cave: '', note: '', skill: null };
  if (res.status !== 'ok') { cell.reason = String(res.reason || '').replace(/^No reaction[.:]\s*/, ''); return cell; }
  const main = uniq(res.products.filter((p) => !p.minor && !p.excess).map((p) => p.smiles));
  const list = main.length ? main : uniq(res.products.map((p) => p.smiles));
  cell.draw = list.slice(0, 2);
  cell.more = Math.max(0, list.length - 2);
  cell.minor = minorNote(res);
  cell.cave = caveOf(tableId, res, card, tag, sub);
  cell.skill = skillOf(card, tableId, tag);
  if ((tag === 'cis' || tag === 'trans') && list.every(stereoFree)) cell.note = 'Terminal C≡C: no cis/trans to see.';
  if (res.products.some((p) => p.excess)) cell.note = 'More reagent: a second substitution (open the cell).';
  return cell;
}
const DATA = new Map();
/** {table, cols, rows:[{id, smiles, name:{new, old}, cells:[...]}], counts:{ok, none, na}} for one table (cached). */
export function tableData(tableId) {
  if (DATA.has(tableId)) return DATA.get(tableId);
  const T = TABLE_BY_ID[tableId];
  if (!T) throw new Error('unknown table ' + tableId);
  const rows = B.SUBSTRATES.filter((s) => s.group === T.group).map((s) => ({ id: s.id, smiles: s.smiles, name: B.nameOf(s.smiles) || { new: s.id, old: s.id }, cells: T.cols.map((c) => cellOf(tableId, s.smiles, c.id)) }));
  const counts = { ok: 0, none: 0, na: 0 };
  rows.forEach((r) => r.cells.forEach((c) => { counts[c.status]++; }));
  const out = { table: T, cols: T.cols, rows, counts };
  DATA.set(tableId, out);
  return out;
}

// ---------------------------------------------------------------- quiz: four drawn options, exactly one right
const qkey = (list) => list.map((s) => stereoKey(s)).sort().join('|');
/** The builder's quiz for the cell (null for a pair that does not react). When the drill's own question has only three options, a fourth is added: what another
 *  reagent of the same family gives on the same substrate (computed by react(), never typed). */
export function cellQuiz(sub, reagentId, rng = Math.random) {
  const q = B.quizFor(sub, reagentId, rng);
  if (!q || q.options.length >= 4) return q;
  const seen = new Set(q.options.map((o) => qkey(o.smiles)));
  const me = B.REAGENT_BY_ID[reagentId];
  const others = B.REAGENTS.filter((x) => x.id !== reagentId && x.top === me.top && x.label !== me.label);
  for (const x of others) {
    if (q.options.length >= 4) break;
    const o = B.react(sub, x.id);
    if (o.status !== 'ok') continue;
    const m = o.products.filter((p) => !p.minor && !p.excess).map((p) => p.smiles);
    const set = m.length ? m : o.products.map((p) => p.smiles);
    const k = qkey(set);
    if (seen.has(k)) continue;
    seen.add(k);
    const at = Math.floor(rng() * (q.options.length + 1));
    q.options.splice(at, 0, { smiles: set, correct: false, why: `That is what ${x.label} gives (${o.ruleName || 'a different reaction'}). ${me.label} does something else.` });
  }
  return q;
}

// ---------------------------------------------------------------- export for the printable PDFs
/** Plain JSON for study-guide/build_tables.py: the same rows, columns and cells the page draws. */
export function exportTables() {
  return {
    tags: TAGS, families: FAMILIES,
    tables: TABLES.map((T) => {
      const d = tableData(T.id);
      return {
        id: T.id, label: T.label, cols: T.cols.map((c) => ({ id: c.id, head: c.head, note: c.note, label: c.label })),
        rows: d.rows.map((r) => ({ id: r.id, smiles: r.smiles, name: { new: r.name.new, old: r.name.old }, cells: r.cells.map((c) => ({ reagent: c.reagent, status: c.status, tag: c.tag, family: c.family, draw: c.draw, more: c.more, minor: c.minor, reason: c.reason, note: c.note })) })),
        counts: d.counts
      };
    })
  };
}
