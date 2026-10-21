// The morph jobs for tools/morph_coords.py: every (substrate, product) pair the reaction tables, the builder and the hub cards can show, read from the engines
// (builder.js react() and pairs(), tables.js cells, reaction-hub.js worked examples). Nothing here types a SMILES.
//   node learn/tools/morph_pairs.mjs [out.json]      (stdout when no path)
// Job: { key, sub, prods:[smiles...] (the first is the main one; a '.' joins co-products of one cleavage), chip, reagentLabel }
//   key  "<canonical substrate>|<reagentId>" for builder / table pairs, "hub:<cardId>" and "hub:<cardId>:2" for the hub cards' worked examples
import fs from 'node:fs';
import { ready, canon } from '../engine/chem.js';
import * as B from '../engine/builder.js';
import { HUB_CARDS as HUB } from '../engine/reaction-hub.js';

/** The short "+ reagent" chip text: the reagent's own label up to the first ';' or ' (' (HBr, Br₂, CH₃COCl, AlCl₃), the first step of a two-step label (BH₃·THF). */
export const chipText = (label) => label.split(/;|\s\(/)[0].replace(/^1\)\s*/, '').replace(/\s+2\).*$/, '').trim();
export const chipOf = (rid) => chipText(B.REAGENT_BY_ID[rid].label);
/** The products a morph goes to for one react() result: a cleavage is one picture (its pieces joined with '.'); otherwise the major products, one morph each. */
export function morphProducts(res) {
  if (res.status !== 'ok') return [];
  const keep = res.products.filter((p) => !p.excess);
  if (res.rule === 'cleavage') return [keep.map((p) => p.smiles).join('.')];
  const main = [...new Set(keep.filter((p) => !p.minor).map((p) => p.smiles))];
  return main.length ? main : [...new Set(keep.map((p) => p.smiles))];
}
/** A hub card's example product: co-products of a cleavage stay joined, alternatives (ortho . para) are separate morphs. */
const CLEAVE_CARDS = new Set(['alkene-kmno4-acid', 'alkyne-kmno4-hot']);
export function jobs() {
  const out = [];
  for (const p of B.pairs()) {
    if (!p.available) continue;
    const res = B.react(p.smiles, p.reagent);
    out.push({ key: canon(p.smiles) + '|' + p.reagent, sub: res.substrate, prods: morphProducts(res), chip: chipOf(p.reagent), reagentLabel: res.reagent.label });
  }
  for (const c of HUB) {
    [c.example, c.example2].forEach((ex, i) => {
      if (!ex) return;
      const prods = CLEAVE_CARDS.has(c.id) ? [ex.product] : ex.product.split('.');
      const label = ex.reagent || c.reagent;
      out.push({ key: 'hub:' + c.id + (i ? ':2' : ''), sub: ex.substrate, prods, chip: chipText(label), reagentLabel: label });
    });
  }
  return out;
}

if (process.argv[1] && /morph_pairs.mjs$/.test(process.argv[1])) {
  await ready();
  const s = JSON.stringify(jobs());
  if (process.argv[2]) fs.writeFileSync(process.argv[2], s); else process.stdout.write(s);
}
