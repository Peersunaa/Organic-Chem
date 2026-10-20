// Reaction builder (engine/builder.js, engine/eas-rules.js, builder-view.js, route #build).
//  (1) every tile parses and is the kind its group says; every reagent has a group, a hub card and a label
//  (2) pairs(): the count of pairs that give a product (>= 400, equal to PAIR_COUNT); every available pair gives >= 1 product that parses, `next` parses
//  (3) the course engines agree: where the predict drill has the same substrate + reagent, its products are among the builder's (the professor's refinements, listed
//      below, may keep only part of the course answer, never none of it); the fixed hub examples (no engine) are reproduced exactly
//  (4) the professor's fixtures (pages 2 to 11) and the two blocking-group chains of page 11, end to end through `next`
//  (5) quiz: four distinct options, exactly one right, the right one is the builder's main product set; mechanisms and energy levels are valid
//  (6) Python RDKit (tools/check_builder.py): every product parses, the element counts match, canonical SMILES are stable, fixtures compare equal in Python,
//      E/Z and ring cis/trans read back
//  (7) wiring: route, home panel, hub jump bar link, the Lesson 13/14 link, the CSS block
import { ready, canon, analyze } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from '../engine/builder.js';
import * as ER from '../engine/eas-rules.js';
import { DRILL, solveCard } from '../engine/generators-predict.js';
import { HUB_BY_ID } from '../engine/reaction-hub.js';
import { stereoKey } from '../engine/reactions-additions.js';
import { validate as validateLevels } from '../engine/widgets/energy-core.js';
import { SCENE_BY_ID } from '../scenes/scene-index.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const TOOLS = path.join(ROOT, 'tools');
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const keys = (list) => list.map((s) => stereoKey(s)).sort();
const smi = (res) => res.products.map((p) => p.smiles);
const has = (res, s) => res.products.some((p) => stereoKey(p.smiles) === stereoKey(s));
const share = (res, s) => { const p = res.products.find((x) => stereoKey(x.smiles) === stereoKey(s)); return p ? p.share : undefined; };
/** The professor's rules that may replace part of the course's simpler answer (Lesson 14 says "the stronger activator wins" or "both o and p"). */
const REFINED = new Set(['ortho-effect', 'same-class', 'superior-class', 'between-low', 'bulky-para', 'single-op', 'reinforce', 'equivalent', 'fc-rearrangement']);

function countsOf(s) {
  const info = analyze(s);
  const c = {};
  info.atoms.forEach((a) => { const el = a.sym; c[el] = (c[el] || 0) + 1; if (a.impH) c.H = (c.H || 0) + a.impH; });
  return c;
}

export async function builder({ ok, eq }) {
  await ready();
  // ---- (1) tiles
  const KIND = { alkene: 'alkene', alkyne: 'alkyne', ring: 'arene', ring2: 'arene' };
  for (const s of B.SUBSTRATES) {
    ok(canon(s.smiles) !== null, `builder tile ${s.id}: SMILES parses`);
    eq(B.classifySubstrate(s.smiles).kind, KIND[s.group], `builder tile ${s.id}: classified as ${KIND[s.group]}`);
    ok(!!B.nameOf(s.smiles), `builder tile ${s.id}: has a name in both styles`);
  }
  eq(new Set(B.SUBSTRATES.map((s) => canon(s.smiles))).size, B.SUBSTRATES.length, 'builder: no two tiles are the same compound');
  for (const r of B.REAGENTS) {
    ok(!!B.REAGENT_GROUPS.find((g) => g.id === r.group), `builder reagent ${r.id}: has a group`);
    ok(!!HUB_BY_ID[r.card], `builder reagent ${r.id}: its hub card ${r.card} exists`);
    if (r.scene) ok(!!SCENE_BY_ID[r.scene], `builder reagent ${r.id}: scene ${r.scene} exists`);
  }

  // ---- (2) pairs
  const P = B.pairs();
  const avail = P.filter((p) => p.available);
  console.log(`  builder: ${P.length} tile pairs, ${avail.length} give a product, ${P.filter((p) => p.status === 'none').length} no-reaction cards, ${P.filter((p) => p.status === 'na').length} not modelled`);
  ok(avail.length >= 400, `builder: at least 400 pairs give a product (${avail.length})`);
  eq(B.PAIR_COUNT, avail.length, 'builder: PAIR_COUNT equals the pairs that give a product');
  const allProducts = new Set();
  for (const p of avail) {
    const r = B.react(p.smiles, p.reagent);
    ok(r.products.length >= 1, `builder ${p.substrate} + ${p.reagent}: at least one product`);
    r.products.forEach((x) => { ok(canon(x.smiles) !== null, `builder ${p.substrate} + ${p.reagent}: product ${x.smiles} parses`); allProducts.add(x.smiles); });
    ok(!!r.next && canon(r.next) !== null, `builder ${p.substrate} + ${p.reagent}: next parses`);
    ok(typeof r.why === 'string' && r.why.length > 20 && !!r.ruleName, `builder ${p.substrate} + ${p.reagent}: a why and a rule name`);
    if (r.kind === 'arene' && r.energy) eq(validateLevels(r.energy.main.levels).length + (r.energy.overlay ? validateLevels(r.energy.overlay.levels).length : 0), 0, `builder ${p.substrate} + ${p.reagent}: energy levels are valid`);
  }
  for (const p of P.filter((x) => !x.available)) {
    const r = B.react(p.smiles, p.reagent);
    ok(r.products.length === 0 && typeof r.reason === 'string' && r.reason.length > 15, `builder ${p.substrate} + ${p.reagent}: a ${p.status} card with its reason`);
  }

  // ---- (3) the course engines and the hub examples
  let compared = 0, refined = 0, hubCompared = 0;
  const refinedList = [];
  for (const p of avail) {
    const r = B.react(p.smiles, p.reagent);
    const link = B.drillLink(p.reagent, p.smiles);
    if (link) {
      let S = null;
      try { S = solveCard(link.card, p.smiles, link.variant, () => 0.5); } catch (e) { S = null; }
      if (S) {
        compared++;
        const dk = keys(S.products.flatMap((x) => x.split('.'))), bk = keys(smi(r));
        const subset = dk.every((k) => bk.includes(k));
        if (!subset) {
          refined++; refinedList.push(`${p.substrate} + ${p.reagent} (${r.rule})`);
          ok(REFINED.has(r.rule) && dk.some((k) => bk.includes(k)), `builder ${p.substrate} + ${p.reagent}: drill products ${dk.join(', ')} are among the builder's (${bk.join(', ')}) or a professor's refinement keeps part of them`);
        } else ok(true, '');
      }
    }
    const ex = B.hubExampleFor(p.reagent, p.smiles);
    if (ex) {
      for (const e of ex) {
        hubCompared++;
        const ek = keys(e.product.split('.'));
        const fixed = DRILL[e.card] && DRILL[e.card].fixed;
        if (fixed) eq(keys(smi(r)).join('|'), ek.join('|'), `builder ${p.substrate} + ${p.reagent}: reproduces the hub example of ${e.card}`);
        else ok(ek.every((k) => keys(smi(r)).includes(k)), `builder ${p.substrate} + ${p.reagent}: contains the hub example of ${e.card}`);
      }
    }
  }
  console.log(`  builder: ${compared} pairs compared with the drill (${refined} refined by the professor's rules: ${refinedList.slice(0, 12).join('; ')}${refinedList.length > 12 ? ' …' : ''}), ${hubCompared} with hub examples`);
  ok(compared >= 150, `builder: at least 150 pairs compared with the drill (${compared})`);

  // ---- (4) the professor's fixtures
  const T = (s, rg) => B.react(s, rg);
  const same = [];   // [builder smiles, fixture written as text] for the Python check
  // page 9: p-bromotoluene + HNO3 -> 2,3-dinitro-4-bromotoluene is listed (the ortho effect)
  { const r = T('Cc1ccc(Br)cc1', 'HNO3'); const X = 'Cc1ccc(Br)c([N+](=O)[O-])c1[N+](=O)[O-]'; ok(has(r, X), 'professor p9: p-bromotoluene + HNO₃ lists 2,3-dinitro-4-bromotoluene'); ok(r.warnings.some((w) => w.id === 'second-nitration'), 'professor p9: the second nitration is explained'); const p = r.products.find((x) => stereoKey(x.smiles) === stereoKey(X)); if (p) same.push([p.smiles, 'CC1=C(C(=C(C=C1)Br)[N+](=O)[O-])[N+](=O)[O-]']); }
  // page 11: toluene + PhCOCl -> para 90, ortho 9 (meta 1)
  { const r = T('Cc1ccccc1', 'PhCOCl'); eq(share(r, 'Cc1ccc(C(=O)c2ccccc2)cc1'), 90, 'professor p11: toluene + C₆H₅COCl gives 90% para'); eq(share(r, 'Cc1ccccc1C(=O)c1ccccc1'), 9, 'professor p11: 9% ortho'); eq(r.next, canon('Cc1ccc(C(=O)c2ccccc2)cc1'), 'professor p11: next = the para ketone'); eq(r.rule, 'bulky-para', 'professor p11: the bulky-acylation rule'); }
  // page 10: benzaldehyde nitration and nitrobenzene bromination: meta only, one isomer; nitrobenzene + CH3COCl: no reaction
  { const r = T('O=Cc1ccccc1', 'HNO3'); eq(smi(r).join(), canon('O=Cc1cccc([N+](=O)[O-])c1'), 'professor p10: benzaldehyde + HNO₃ gives only m-nitrobenzaldehyde'); eq(r.rule, 'single-meta', 'professor p10: meta-orienting compound, one isomer'); }
  { const r = T('O=[N+]([O-])c1ccccc1', 'Br2-FeBr3'); eq(smi(r).join(), canon('O=[N+]([O-])c1cccc(Br)c1'), 'professor p10: nitrobenzene + Br₂/FeBr₃ gives only m-bromonitrobenzene'); }
  { const r = T('O=[N+]([O-])c1ccccc1', 'AcCl'); eq(r.status, 'none', 'professor p10: nitrobenzene + CH₃COCl/AlCl₃: no reaction'); eq(r.noReaction && r.noReaction.rule, 'fc-meta', 'professor p10: the reason is the meta-directing ring'); }
  { const r = T('Nc1ccccc1', 'AcCl'); eq(r.status, 'none', 'aniline + CH₃COCl/AlCl₃: no reaction'); eq(r.noReaction && r.noReaction.rule, 'fc-amine', 'aniline: N binds AlCl₃'); }
  // page 5: 1-chloropropane rearranges; propene (and butene) with HF/BF3 give the same cation as the halide
  { const r = T('c1ccccc1', 'PrCl'); eq(smi(r).join(), canon('CC(C)c1ccccc1'), 'professor p5: benzene + 1-chloropropane gives isopropylbenzene'); ok(r.warnings.some((w) => w.id === 'rearrangement'), 'professor p5: the rearrangement warning'); ok(r.warnings.some((w) => w.id === 'polyalkylation'), 'professor p4: the polyalkylation warning'); same.push([r.products[0].smiles, 'CC(C)C1=CC=CC=C1']); }
  { const a = T('c1ccccc1', 'propene-HF'), b = T('c1ccccc1', 'iPrCl'); eq(keys(smi(a)).join(), keys(smi(b)).join(), 'professor p5: propene + HF/BF₃ gives the same product as 2-chloropropane'); }
  { const a = T('c1ccccc1', 'butene-HF'); eq(smi(a).join(), canon('CCC(C)c1ccccc1'), 'professor p5: but-1-ene + HF/BF₃ gives sec-butylbenzene (the 2° cation, the same as 2-chlorobutane)'); eq(ER.fcCation({ type: 'alkene', smiles: 'C=CCC' }).cationAfter, ER.fcCation({ type: 'halide', smiles: 'CCC(C)Cl' }).cationAfter, 'professor p5: but-1-ene + H⁺ and 2-chlorobutane + AlCl₃ give the same carbocation'); }
  { const a = T('c1ccccc1', 'isobutylene-HF'), b = T('c1ccccc1', 'tBuCl'); eq(keys(smi(a)).join(), keys(smi(b)).join(), 'professor p5: 2-methylpropene + HF/BF₃ = t-butyl chloride + AlCl₃'); }
  // page 2: p-xylene + Cl2/CH3COOH -> 2-chloro-1,4-dimethylbenzene; benzene does not react under these mild conditions
  { const r = T('Cc1ccc(C)cc1', 'Cl2-AcOH'); eq(smi(r).join(), canon('Cc1ccc(C)c(Cl)c1'), 'professor p2: p-xylene + Cl₂/CH₃COOH gives 2-chloro-1,4-dimethylbenzene'); same.push([r.products[0].smiles, 'CC1=CC(Cl)=C(C)C=C1']); eq(T('c1ccccc1', 'Cl2-AcOH').status, 'none', 'professor p2: benzene needs the Lewis acid'); }
  // pages 3 and 11: deuteration, ipso removal
  { const r = T('Cc1ccccc1', 'D2SO4'); eq(keys(smi(r)).join(), keys(['[2H]c1ccccc1C', '[2H]c1ccc(C)cc1']).join(), 'professor p3: toluene + D₂SO₄ puts D ortho and para'); }
  { const r = T('c1ccccc1', 'D2SO4'); ok(has(r, '[2H]c1c([2H])c([2H])c([2H])c([2H])c1[2H]'), 'professor p3: excess D₂O gives C₆D₆'); }
  { const r = T('Cc1ccc(C(C)(C)C)cc1', 'H-ipso'); eq(smi(r).join(), canon('Cc1ccccc1'), 'professor p3: 4-tert-butyltoluene + H⁺ gives toluene'); eq(r.rule, 'ipso', 'professor p3: ipso rule'); }
  { const r = T('Cc1ccc(S(=O)(=O)O)cc1', 'H-ipso'); eq(smi(r).join(), canon('Cc1ccccc1'), 'professor p3: p-toluenesulfonic acid + H⁺ gives toluene'); }
  { const r = T('Cc1ccc(S(=O)(=O)O)cc1', 'desulf'); eq(smi(r).join(), canon('Cc1ccccc1'), 'desulfonation: p-TsOH + dilute H₂SO₄, heat gives toluene'); eq(T('Cc1ccc(C(C)(C)C)cc1', 'desulf').status, 'none', 'desulfonation leaves t-butyl alone'); }
  { const r = T('Cc1ccc(S(=O)(=O)O)cc1', 'D2SO4'); eq(smi(r).join(), canon('Cc1ccc([2H])cc1'), 'hub desulfonation example: p-TsOH + D₂SO₄ gives toluene-4-d'); }
  // page 2: iodination with I2 + HNO3
  { const r = T('c1ccccc1', 'I2-HNO3'); eq(smi(r).join(), canon('Ic1ccccc1'), 'professor p2: benzene + I₂/HNO₃ gives iodobenzene'); ok(r.warnings.some((w) => w.id === 'iodination'), 'professor p2: I⁺ by oxidation'); }
  // anisole + Br2 -> o/p; chlorobenzene nitration -> o/p with the deactivating note
  { const r = T('COc1ccccc1', 'Br2-FeBr3'); eq(keys(smi(r)).join(), keys(['COc1ccccc1Br', 'COc1ccc(Br)cc1']).join(), 'anisole + Br₂ gives ortho and para'); }
  { const r = T('Clc1ccccc1', 'HNO3'); ok(has(r, 'O=[N+]([O-])c1ccc(Cl)cc1') && has(r, 'O=[N+]([O-])c1ccccc1Cl'), 'chlorobenzene nitration: ortho and para'); ok(r.products.filter((p) => !p.minor).every((p) => /ortho|para/.test(p.label)), 'chlorobenzene nitration: the major products are o/p'); ok(/deactivat/i.test(r.why) || /deactivat/i.test(r.facts.director), 'chlorobenzene nitration: Cl is called deactivating'); eq(share(r, 'O=[N+]([O-])c1ccc(Cl)cc1'), 69.4, 'professor p8: chlorobenzene nitration 69% para from his partial rate factors'); }
  { const r = T('Cc1ccccc1', 'HNO3'); eq(share(r, 'Cc1ccccc1[N+](=O)[O-]'), 58, 'professor p8: toluene nitration 58% ortho'); eq(share(r, 'Cc1ccc([N+](=O)[O-])cc1'), 38.3, 'professor p8: 38% para'); ok(r.energy && r.energy.kind === 'activating', 'toluene + HNO₃: the activating energy sketch'); }
  // page 9 superior class: o-fluoroanisole (OCH3 decides), 3-bromobenzoic acid (Br wins over COOH, with the ortho effect)
  { const r = T('COc1ccccc1F', 'HNO3'); eq(r.rule, 'superior-class', 'professor p9: o-fluoroanisole uses the superior class'); ok(r.products.every((p) => /(ortho|para) to –OR/.test(p.label)), 'professor p9: o-fluoroanisole: every product is o/p to OCH₃'); eq(r.products.map((p) => p.share).join(), '66,31', 'professor p9: o-fluoroanisole 66 and 31 as he wrote them'); ok(r.products.some((p) => /para to –OR/.test(p.label)), 'professor p9: o-fluoroanisole: the position para to OCH₃ is among them'); }
  { const r = T('OC(=O)c1cccc(Br)c1', 'HNO3'); ok(r.products.every((p) => /(ortho|para) to –Br/.test(p.label)), 'professor p9: 3-bromobenzoic acid: Br (o,p) wins over COOH'); eq(r.products.map((p) => p.share).join(), '87,13', 'professor p9: 87 and 13'); eq(r.rule, 'ortho-effect', 'professor p9: and the ortho effect'); }
  { const r = T('Cc1ccccc1Cl', 'Br2-FeBr3'); eq(r.products.map((p) => p.share).join(), '43,21,19,17', 'professor p9: o-chlorotoluene mixture 43/21/19/17'); eq(r.rule, 'same-class', 'professor p9: same class, horrible mixture'); }
  { const r = T('Clc1cccc(Cl)c1', 'HNO3'); eq(r.products.map((p) => p.share).join(), '96,4', 'professor p9: m-dichlorobenzene 96 and 4 (between: low)'); ok(r.warnings.some((w) => w.id === 'between-low'), 'professor p9: the between rule'); }
  { const r = T('O=[N+]([O-])c1cccc(Cl)c1', 'Br2-FeBr3'); eq(r.rule, 'ortho-effect', 'professor p9: m-chloronitrobenzene: ortho effect'); eq(r.next, canon('O=[N+]([O-])c1cc(Cl)ccc1Br'), 'professor p9: E⁺ goes ortho to NO₂ and para to Cl'); same.push([r.next, 'BrC1=C(C=C(Cl)C=C1)[N+]([O-])=O']); }
  { const r = T('Nc1ccccc1', 'HNO3'); eq(smi(r).join(), canon('Nc1cccc([N+](=O)[O-])c1'), 'amine in acid: aniline + HNO₃ gives m-nitroaniline (N protonated)'); }
  { const r = B.react('CN(C)c1ccc(C)cc1', 'HNO3'); ok(has(r, HUB_BY_ID['amine-in-acid'].example.product), 'hub amine-in-acid example reproduced'); }
  // page 10: acylation then Clemmensen / Wolff-Kishner: a straight chain
  { let s = T('c1ccccc1', 'HexCOCl').next; eq(s, canon('CCCCCC(=O)c1ccccc1'), 'professor p10: benzene + hexanoyl chloride gives hexanophenone'); eq(T(s, 'Clemmensen').next, canon('CCCCCCc1ccccc1'), 'professor p10: Clemmensen gives hexylbenzene'); eq(T(s, 'Wolff-Kishner').next, canon('CCCCCCc1ccccc1'), 'professor p10: Wolff–Kishner gives hexylbenzene'); }
  // page 11: the two blocking-group chains, end to end through `next`
  {
    const a = T('Cc1ccccc1', 'tBuCl'); eq(a.next, canon('Cc1ccc(C(C)(C)C)cc1'), 'professor p11 chain 1: toluene + t-BuCl gives 4-tert-butyltoluene');
    const b = T(a.next, 'Br2-FeBr3'); eq(b.next, canon('Cc1ccc(C(C)(C)C)cc1Br'), 'professor p11 chain 1: Br₂ goes ortho to CH₃ (t-butyl blocks para and crowds its own ortho)');
    const c = T(b.next, 'H-ipso'); eq(c.next, canon('Cc1ccccc1Br'), 'professor p11 chain 1: ipso H⁺ removes t-butyl: o-bromotoluene');
    const d = T(b.next, 'D2SO4'); eq(d.next, canon('Cc1ccc([2H])cc1Br'), 'professor p11 chain 1: D₂SO₄ instead puts D where t-butyl was');
    same.push([c.next, 'CC1=CC=CC=C1Br']);
    const steps = [{ from: 'Cc1ccccc1', reagentId: 'tBuCl', to: a.next }, { from: a.next, reagentId: 'Br2-FeBr3', to: b.next }, { from: b.next, reagentId: 'H-ipso', to: c.next }];
    const txt = B.routeText(steps, 'new');
    ok(/^toluene → \[/.test(txt) && txt.split('→').length === 7, `route text: ${txt}`);
  }
  {
    const a = T('Cc1ccccc1', 'SO3'); eq(a.next, canon('Cc1ccc(S(=O)(=O)O)cc1'), 'professor p11 chain 2: toluene + SO₃ gives p-toluenesulfonic acid');
    const b = T(a.next, 'HNO3'); eq(b.next, canon('Cc1ccc(S(=O)(=O)O)cc1[N+](=O)[O-]'), 'professor p11 chain 2: HNO₃ goes ortho to CH₃');
    const c = T(b.next, 'H-ipso'); eq(c.next, canon('Cc1ccccc1[N+](=O)[O-]'), 'professor p11 chain 2: H⁺ removes SO₃H: o-nitrotoluene');
    same.push([c.next, 'CC1=CC=CC=C1[N+]([O-])=O']);
  }
  // alkenes and alkynes: a few anchors
  { const r = T('CC1=CCCCC1', 'HBr'); eq(smi(r).join(), canon('CC1(Br)CCCCC1'), '1-methylcyclohexene + HBr: Markovnikov'); eq(r.mechanism.scene, '01-alkene-hx', '1-methylcyclohexene + HBr: the HBr scene'); ok(!!B.react('CC1=CCCCC1', 'HBr', { full: true }).mechanism.mech, '1-methylcyclohexene + HBr: the engine mechanism for the player'); }
  { const r = T('CC#CC', 'Na-NH3'); eq(smi(r).join(), canon('C/C=C/C'), 'but-2-yne + Na/NH₃: trans-but-2-ene'); }
  { const r = T('C#Cc1ccccc1', 'H2O-Hg'); eq(smi(r).join(), canon('CC(=O)c1ccccc1'), 'phenylacetylene + Hg²⁺/H₂O: acetophenone'); }
  { const r = T('C=Cc1ccccc1', 'H2-Pd'); eq(smi(r).join(), canon('CCc1ccccc1'), 'styrene + H₂/Pd: ethylbenzene'); }
  { const r = T('CCCCC#C', 'HBr-1'); eq(r.mechanism.scene, '08-alkyne-hx', 'hex-1-yne + HBr: the alkyne scene'); }

  // ---- (5) quiz
  const rng = mulberry32(7);
  let quizzes = 0, fromDrill = 0;
  for (const p of avail.filter((_, i) => i % 5 === 0)) {
    const q = B.quizFor(p.smiles, p.reagent, rng);
    if (!q) continue;
    quizzes++; if (q.source === 'drill') fromDrill++;
    eq(q.options.filter((o) => o.correct).length, 1, `quiz ${p.substrate} + ${p.reagent}: exactly one right option`);
    ok(q.options.length >= 3 && q.options.length <= 4, `quiz ${p.substrate} + ${p.reagent}: 3 or 4 options`);
    eq(new Set(q.options.map((o) => keys(o.smiles).join('|'))).size, q.options.length, `quiz ${p.substrate} + ${p.reagent}: options differ`);
    ok(q.options.every((o) => o.why && o.smiles.every((s) => canon(s) !== null)), `quiz ${p.substrate} + ${p.reagent}: every option parses and has a why`);
  }
  console.log(`  builder: ${quizzes} quizzes checked (${fromDrill} from the drill's own options)`);
  ok(quizzes >= 100 && fromDrill >= 20, `builder: enough quizzes (${quizzes}, ${fromDrill} from the drill)`);
  // custom substrates
  { const a = B.resolveSubstrate('toluene'); ok(a.ok && a.smiles === canon('Cc1ccccc1') && a.kind === 'arene', 'custom: the name toluene'); const b = B.resolveSubstrate('CC=C'); ok(b.ok && b.kind === 'alkene', 'custom: a SMILES'); ok(!B.resolveSubstrate('CCO').ok, 'custom: ethanol is refused (nothing to react)'); ok(!B.resolveSubstrate('xyz((').ok, 'custom: garbage is refused'); ok(B.resolveSubstrate('p-xylene').ok, 'custom: old-style name'); }

  // ---- (6) Python RDKit
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bld-'));
    const mols = [...allProducts].map((s) => ({ smiles: s, counts: countsOf(s) }));
    const stereo = [T('CC#CC', 'Na-NH3').products[0].smiles, T('C#Cc1ccccc1', 'Br2-1').products[0].smiles, T('CC#CC', 'Lindlar').products[0].smiles, T('CC1=CCCCC1', 'BH3').products[0].smiles];
    fs.writeFileSync(path.join(tmp, 'in.json'), JSON.stringify({ mols, same, stereo }));
    execFileSync('python3', ['-I', path.join(TOOLS, 'check_builder.py'), path.join(tmp, 'in.json'), path.join(tmp, 'out.json')], { stdio: ['ignore', 'ignore', 'inherit'] });
    const py = JSON.parse(fs.readFileSync(path.join(tmp, 'out.json'), 'utf8'));
    eq(py.mols.length, mols.length, `Python read every builder product (${mols.length})`);
    py.mols.forEach((m) => { ok(m.ok, `Python: ${m.smiles} parses`); ok(m.counts_ok, `Python: ${m.smiles} has the same atoms (formula)`); ok(m.canon_stable, `Python: ${m.smiles} canonical SMILES is stable`); });
    eq(py.same.filter(Boolean).length, same.length, `Python: the ${same.length} professor fixtures match their written structures`);
    const [na, br, lind, hb] = py.stereo;
    eq((na.ez || []).join(), 'E', 'Python: Na/NH₃ product is (E)');
    eq((br.ez || []).join(), 'E', 'Python: phenylacetylene + Br₂ (1 eq) is (E)');
    eq((lind.ez || []).join(), 'Z', 'Python: Lindlar product is (Z)');
    eq(hb.cistrans, 'trans', 'Python: hydroboration of 1-methylcyclohexene gives the trans alcohol');
  }

  // ---- (7) wiring
  {
    const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const hubv = fs.readFileSync(path.join(ROOT, 'hub-view.js'), 'utf8');
    ok(/hash === 'build'/.test(app) && /builderPage/.test(app), 'wiring: #build route in app.js');
    ok(/id: 'open-builder'/.test(app), 'wiring: home panel link to the builder');
    ok(/bld-lesson-link/.test(app), 'wiring: Lesson 13/14 link to the builder');
    ok(/hub-builder/.test(hubv) || /hub-builder/.test(app), 'wiring: hub jump bar link');
    ok(html.includes('/* reaction builder */'), 'wiring: the CSS block');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
  await builder({ ok, eq });
  console.log(`${pass} passed, ${fail} failed`);
  failures.slice(0, 60).forEach((f) => console.log(' FAIL ' + f));
  process.exit(fail ? 1 : 0);
}
