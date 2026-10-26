// Reaction hub checks (engine/reaction-hub.js, hub-view.js, the #lesson-NN/sK deep link).
//  (1) every card has every field, ids are unique, every lesson step (and mechanism step) exists in that lesson module;
//  (2) every molecule on a card parses in RDKit (JS) AND in Python RDKit (tools/check_hub.py), and the stereo is read back in Python: number of
//      stereocentres, CIP letters, meso or chiral, cis/trans on a ring (3D), E/Z of a double bond, and nothing left unspecified by accident.
//      Each card has an EXPECTATION written by hand below: no stereo at all unless the card needs it.
//  (3) where an engine models the reagent (HX, hydration, X2, H2, KMnO4, peracid, alkyne reactions, EAS, directors, side chains, acetylide, diene HX) the card's
//      example product equals the engine's product for that substrate (canonical isomeric SMILES), and the card's `space` agrees with the engine's syn/anti.
//  (3b) the ten workbook B3.1 cards and hot KMnO₄ on an alkyne (Diels-Alder, Clemmensen, Birch, two hydroborations, benzylic bromination, PCC, Cr(VI), amine in acid, desulfonation) have no
//      engine model, so their example products are checked by hand-written molecular formulas (HAND below), RDKit parse (JS and Python) and the stereo read-back;
//      the cards with no lesson say "Not in a lesson" on the screen instead of a lesson link;
//  (4) the router accepts #lesson-NN/sK and the view code keeps its promises (no progress faked), read from the source.
// Run on its own with `node learn/tests/hub.mjs`, or as part of run.mjs.
import { ready, canon } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import { HUB_CARDS, HUB_GROUPS, HUB_SPACE, HUB_ADDS, HUB_BY_ID } from '../engine/reaction-hub.js';
import * as R from '../engine/reactions.js';
import { lessonHref, NO_LESSON, matchesQuery, fold, hubText } from '../hub-view.js';
import { formulaOf } from '../engine/skeletal.js';
import * as V from '../engine/voice.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.join(HERE, '..', 'tools');

// What each card's drawn molecules must look like when read back in Python. Missing = no stereo at all (no centre, no unspecified centre, no E/Z).
//  centres : number of specified stereocentres      chiral : false = meso / achiral, true = chiral
//  labels  : 'same' (R,R or S,S) | 'opposite' (R,S)  cistrans : the two ring groups      ez : CIP letters of the specified double bonds
//  unassigned : potential centres drawn flat on purpose (a racemate with ONE stereocentre)   unassignedBonds : E/Z mixtures drawn without geometry
const EXPECT = {
  'alkene-x2': { centres: 2, chiral: true, labels: 'same', cistrans: 'trans' },
  'alkene-h2-pd': { centres: 2, chiral: false, labels: 'opposite', cistrans: 'cis' },
  'alkene-kmno4-base': { centres: 2, chiral: false, labels: 'opposite', cistrans: 'cis' },
  'alkene-epoxide': { centres: 2, chiral: true, labels: 'same', cistrans: 'trans' },
  'alkene-epoxide-diol': { centres: 2, chiral: true, labels: 'same', cistrans: 'trans' },
  'alkyne-x2-1': { ez: ['E'] },
  'alkyne-lindlar': { ez: ['Z'] },
  'diene-hx': { unassigned: 1, unassignedBonds: 1 },
  // workbook B3.1 cards
  'alkene-hydroboration': { centres: 2, chiral: true, labels: 'same', cistrans: 'trans' },   // trans-2-methylcyclohexanol, (1R,2R) as drawn, racemic
  'benzylic-bromination': { unassigned: 1 },
  'oxidation-pcc': { subUnassigned: 1 },   // the 1° and 2° alcohol substrate is a racemate drawn flat; the product has no stereocentre
  'oxidation-cr': { subUnassigned: 1 },   // 1-phenylethanol is a racemate drawn flat; its ketone has none
  'diels-alder': { unassigned: 2, flat: true },   // two stereocentres drawn flat on purpose (the card says syn, but only in words)
  // Chapter 7 alkyl-halide cards. subCentres / subLetters: the written stereocentres of the SUBSTRATE and their CIP letters; letters: the letters of the product's centres
  'sn2-oh': { subCentres: 1, subLetters: ['R'], centres: 1, letters: ['S'] },                     // (R)-2-bromobutane -> (S)-butan-2-ol: inversion
  'e2-chair': { subCentres: 2, subCistrans: 'trans', centres: 1, letters: ['S'] },                // trans-1-bromo-2-methylcyclohexane -> (3S)-3-methylcyclohexene: only the CH(CH3) carbon survives, with its configuration
  'halide-from-alcohol': { subCentres: 1, subLetters: ['S'], centres: 1, letters: ['R'] }          // (S)-pentan-2-ol + PBr3 -> (R)-2-bromopentane
};
// second examples that show stereochemistry on purpose (every other second example has none): written centres of the substrate and of each product component
const EXPECT2 = {
  'sn1-solvolysis': { subCentres: 1, subLetters: ['R'], products: [['R'], ['S']] },               // (R)-3-bromo-3-methylhexane -> both enantiomers of the alcohol (racemic)
  'e2-chair': { subCentres: 2, subCistrans: 'cis', products: [[]] }                               // cis isomer -> 1-methylcyclohexene (no stereocentre left)
};

// The ten cards with no engine model. formula = the example product (Hill formula, D counted as H by the formula code); formula2 = the second example.
// sum = the substrate formulas must add up to the product (Diels-Alder: nothing is lost).
const HAND = {
  'diels-alder': { formula: 'C8H12O', sum: ['C5H8', 'C3H4O'] },
  'clemmensen': { formula: 'C8H10' },
  'birch': { formula: 'C7H8O2', formula2: 'C7H10O' },
  'alkyne-hydroboration': { formula: 'C6H12O' },
  'alkene-hydroboration': { formula: 'C7H14O' },
  'benzylic-bromination': { formula: 'C9H11Br' },
  'oxidation-pcc': { formula: 'C10H10O2' },
  'oxidation-cr': { formula: 'C8H8O', formula2: 'C4H8O2' },
  'amine-in-acid': { formula: 'C9H12N2O2' },
  'desulfonation': { formula: 'C7H8' },
  // hot KMnO₄ on a C≡C (scene 21): no engine model; the two acids together keep all six carbons of hex-3-yne
  'alkyne-kmno4-hot': { formula: ['C3H6O2', 'C3H6O2'] }
};
const HALIDE_IDS = ['sn2-cn', 'sn2-i', 'sn2-oh', 'sn2-rs', 'sn1-solvolysis', 'e2-zaitsev', 'e2-chair', 'e1-heat', 'grignard-d2o', 'halide-from-alcohol'];
const NO_LESSON_IDS = ['diels-alder', 'clemmensen', 'birch', 'alkyne-hydroboration', 'alkene-hydroboration', 'oxidation-pcc', 'oxidation-cr', 'alkyne-kmno4-hot', ...HALIDE_IDS];   // the alkyl-halide cards wait for Lesson 18 (piece 2)
const SUBGROUP = 'Side chains and alcohols (not in the book)';

// The engine's answer for the card's example (products as canonical isomeric SMILES), and, where the engine knows it, how the new groups add.
const BENZENE = 'c1ccccc1';
const ENGINE = {
  'eas-bromination': () => ({ products: [R.predictEAS(BENZENE, 'Br2').product] }),
  'eas-nitration': () => ({ products: [R.predictEAS(BENZENE, 'HNO3').product] }),
  'eas-sulfonation': () => ({ products: [R.predictEAS(BENZENE, 'SO3').product] }),
  'fc-alkylation': () => ({ products: [R.predictEAS(BENZENE, 'RCl', 'CCCl').product] }),
  'fc-acylation': () => ({ products: [R.predictEAS(BENZENE, 'RCOCl', 'CC(=O)Cl').product] }),
  'director-activating': (c) => ({ products: R.predictSubst(c.example.substrate, 'HNO3').products }),
  'director-halogen': (c) => ({ products: R.predictSubst(c.example.substrate, 'HNO3').products }),
  'director-meta': (c) => ({ products: R.predictSubst(c.example.substrate, 'Br2').products }),
  'side-chain-kmno4': (c) => ({ products: [R.oxidizeSideChain(c.example.substrate).product] }),
  'nitro-reduction': (c) => ({ products: [R.reduceNitro(c.example.substrate)] }),
  'side-chain-h2pd': (c) => ({ products: [R.hydrogenate(c.example.substrate, 'H2_Pd').product] }),
  'alkene-hx': (c) => ({ products: R.predict(c.example.substrate, 'HBr').products }),
  'alkene-hydration': (c) => ({ products: R.predict(c.example.substrate, 'H2O').products }),
  'alkene-x2': (c) => add(c, 'Br2'),
  'alkene-h2-pd': (c) => add(c, 'H2'),
  'alkene-kmno4-base': (c) => add(c, 'KMnO4_OH'),
  'alkene-kmno4-acid': (c) => add(c, 'KMnO4_H'),
  'alkene-epoxide': (c) => add(c, 'RCO3H'),
  'alkene-epoxide-diol': (c) => add(c, 'RCO3H_H3O'),
  'alkyne-hx-1': (c) => alk(c, 'HBr_1'),
  'alkyne-hx-2': (c) => alk(c, 'HBr_2'),
  'alkyne-x2-1': (c) => alk(c, 'Br2_1', 'anti'),
  'alkyne-x2-2': (c) => alk(c, 'Br2_2'),
  'alkyne-hydration': (c) => alk(c, 'H2O_Hg'),
  'alkyne-lindlar': (c) => alk(c, 'H2_Lindlar', 'syn'),
  'alkyne-h2-pd': (c) => alk(c, 'H2_Pd'),
  'alkyne-acetylide': (c) => { const r = R.runSequence(c.example.substrate, ['NaNH2', 'EtBr']); return { products: r.ok ? [r.final.smiles] : [] }; },
  'diene-hx': (c) => ({ products: R.predictDiene(c.example.substrate, 'HBr').products }),
  // Chapter 7: alkyl halides (engine/reactions-halides.js)
  'sn2-cn': (c) => ({ products: R.predictSN2(c.example.substrate, 'CN').products }),
  'sn2-i': (c) => ({ products: R.predictSN2(c.example.substrate, 'I').products }),
  'sn2-oh': (c) => ({ products: R.predictSN2(c.example.substrate, 'HO').products }),
  'sn2-rs': (c) => ({ products: R.predictSN2(c.example.substrate, 'MeS').products }),
  'sn1-solvolysis': (c) => ({ products: R.predictSN1(c.example.substrate, 'H2O').products }),
  'e2-zaitsev': (c) => ({ products: R.predictE2(c.example.substrate, 'KOH').major }),
  'e2-chair': (c) => ({ products: R.predictE2(c.example.substrate, 'KOH').major }),
  'e1-heat': (c) => ({ products: R.predictE1(c.example.substrate).major }),
  'grignard-d2o': (c) => ({ products: [R.grignard(c.example.substrate).protonolysis.D2O] }),
  'halide-from-alcohol': (c) => ({ products: [R.fromAlcohol(c.example.substrate, 'PBr3').product] })
};
function add(c, reagent) { const p = R.predictAdd(c.example.substrate, reagent); return { products: p.products, racemic: p.racemic, rel: p.rel }; }
function alk(c, key, rel) { const p = R.predictAlkyne(c.example.substrate, key); return { products: p.products, rel: rel ? (p.stereo === 'E' ? 'anti' : p.stereo === 'Z' ? 'syn' : null) : undefined }; }


// ---- caveman voice (Piece 3): every card carries a terse rewrite of its own text
// Tokens that must survive the rewrite: anything with a subscript or charge (Br₂, H₃O⁺, NO₂⁺) and the exam words.
const CAVE_TOKEN = /[\p{L}\p{N}²³¹⁰-₟]+/gu;
const CAVE_WORDS = ['markovnikov', 'syn', 'anti', 'meta', 'ortho', 'para', 'racemate'];
const mustKeep = (t) => /[₂₃₄⁺⁻]/.test(t) || CAVE_WORDS.includes(t.toLowerCase()) || t === 'R' || t === 'S';
const reEsc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasToken = (hay, t) => /[₂₃₄⁺⁻]/.test(t)
  ? hay.includes(t)
  : new RegExp('(?<![\\p{L}\\p{N}])' + reEsc(t) + '(?![\\p{L}\\p{N}])', CAVE_WORDS.includes(t.toLowerCase()) ? 'iu' : 'u').test(hay);

/** Canonical isomeric SMILES of every molecule in a dotted SMILES, sorted. */
const parts = (smiles) => smiles.split('.').map((s) => canon(s)).sort();

export async function hub({ ok, eq }) {
  await ready();
  const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

  // ---- (1) fields, ids, lesson steps
  ok(Array.isArray(HUB_CARDS) && HUB_CARDS.length >= 20, 'hub has at least 20 cards');
  eq(new Set(HUB_CARDS.map((c) => c.id)).size, HUB_CARDS.length, 'hub card ids are unique');
  eq(Object.keys(HUB_BY_ID).length, HUB_CARDS.length, 'HUB_BY_ID covers every card');
  ok(HUB_GROUPS.length === 5 && HUB_GROUPS.every((g) => nonEmpty(g.id) && nonEmpty(g.label) && nonEmpty(g.sub)), 'five groups, each with id, label and sub');
  const spaceIds = HUB_SPACE.map((s) => s.id), addsIds = HUB_ADDS.map((a) => a.id);
  eq(spaceIds.slice().sort(), ['anti', 'either', 'inversion', 'n.a.', 'syn'], 'space filter ids');
  eq(addsIds, ['OH', 'X', 'H', 'other', 'O', 'ring', 'Nu', 'C=C'], 'adds filter ids');
  eq(HUB_GROUPS.map((g) => g.id), ['arene', 'alkene', 'alkyne', 'diene', 'halide'], 'group order: the alkyl halides come after the dienes');
  eq(HUB_CARDS.filter((c) => c.group === 'halide').map((c) => c.id), HALIDE_IDS, 'the ten alkyl-halide cards, in order');
  eq(Object.keys(HAND).sort(), HUB_CARDS.filter((c) => !ENGINE[c.id]).map((c) => c.id).sort(), 'HAND covers exactly the cards with no engine model');
  eq(HUB_CARDS.filter((c) => c.lesson === null).map((c) => c.id).sort(), NO_LESSON_IDS.slice().sort(), 'the cards with no lesson are the seven the brief names, hot KMnO₄ on an alkyne (Lesson 12 has no KMnO₄ step) and the ten alkyl-halide cards (Lesson 18 is piece 2)');
  eq(HUB_CARDS.filter((c) => c.subgroup).map((c) => c.id), ['oxidation-pcc', 'oxidation-cr'], 'only the two oxidation cards have a sub-header');
  for (const c of HUB_CARDS.filter((x) => x.subgroup)) ok(c.group === 'arene' && c.subgroup === SUBGROUP, `${c.id}: sits in the aromatics group under "${SUBGROUP}"`);
  // the sub-header cards are the last cards of their group, so they stay together under one header
  const areneIds = HUB_CARDS.filter((c) => c.group === 'arene').map((c) => c.id);
  eq(areneIds.slice(-2), ['oxidation-pcc', 'oxidation-cr'], 'the sub-header cards come last in the aromatics group');
  for (const g of HUB_GROUPS) ok(HUB_CARDS.some((c) => c.group === g.id), `group ${g.id} has at least one card`);
  const hrefs = [];
  for (const c of HUB_CARDS) {
    const id = c.id;
    ok(nonEmpty(id) && /^[a-z0-9-]+$/.test(id), `${id}: id is a slug`);
    ok(HUB_GROUPS.some((g) => g.id === c.group), `${id}: group ${c.group} is one of the groups`);
    ok(nonEmpty(c.reagent), `${id}: reagent label`);
    ok(nonEmpty(c.what), `${id}: what`);
    ok(c.what.split(/[.!?](\s|$)/).filter((x) => x && x.trim()).length <= 3, `${id}: what stays short`);
    ok(c.example && nonEmpty(c.example.substrate) && nonEmpty(c.example.product), `${id}: example substrate and product`);
    if (c.example.reagent !== undefined) ok(nonEmpty(c.example.reagent), `${id}: example reagent not empty when given`);
    if (c.example.note !== undefined) ok(nonEmpty(c.example.note), `${id}: example note not empty when given`);
    ok(c.facts && nonEmpty(c.facts.adds) && nonEmpty(c.facts.where) && nonEmpty(c.facts.space), `${id}: three facts`);
    ok(spaceIds.includes(c.facts.space), `${id}: space ${c.facts.space} is syn, anti, either, inversion or n.a.`);
    ok(Array.isArray(c.facts.addsKey) && c.facts.addsKey.length >= 1 && c.facts.addsKey.every((k) => addsIds.includes(k)), `${id}: addsKey uses the filter ids`);
    if (c.facts.spaceNote !== undefined) ok(nonEmpty(c.facts.spaceNote), `${id}: spaceNote not empty when given`);
    ok(c.apply && nonEmpty(c.apply.pattern) && Array.isArray(c.apply.steps) && c.apply.steps.length >= 3 && c.apply.steps.length <= 6 && c.apply.steps.every(nonEmpty), `${id}: pattern and 3 to 6 steps`);
    ok(!c.apply.steps.some((s) => /^\s*\d+[.)]/.test(s)), `${id}: steps are not numbered by hand (the list numbers them)`);
    if (c.example2 !== undefined) ok(c.example2 && nonEmpty(c.example2.substrate) && nonEmpty(c.example2.product) && nonEmpty(c.example2.note), `${id}: second example has substrate, product and note`);
    // caveman voice: same shape as the card, shorter, never empty, and every reagent / exam word kept
    {
      const cv = c.caveman;
      ok(!!cv && nonEmpty(cv.what) && cv.facts && nonEmpty(cv.facts.adds) && nonEmpty(cv.facts.where) && nonEmpty(cv.facts.space) && Array.isArray(cv.steps), `${id}: caveman has what, facts.adds/where/space and steps`);
      if (cv && cv.facts && Array.isArray(cv.steps)) {
        eq(cv.steps.length, c.apply.steps.length, `${id}: caveman has as many steps as apply.steps`);
        eq(cv.facts.space, c.facts.space, `${id}: caveman space is the card's space (an enum, kept as is)`);
        ok((cv.note !== undefined) === (c.example.note !== undefined), `${id}: caveman note is present exactly when example.note is`);
        const pairs = [['what', c.what, cv.what], ['facts.adds', c.facts.adds, cv.facts.adds], ['facts.where', c.facts.where, cv.facts.where]];
        c.apply.steps.forEach((o, i) => pairs.push([`steps[${i}]`, o, cv.steps[i]]));
        if (c.example.note !== undefined) pairs.push(['note', c.example.note, cv.note]);
        for (const [label, orig, cave] of pairs) {
          if (!nonEmpty(cave)) { ok(false, `${id}: caveman ${label} is empty`); continue; }
          const lim = orig.length < 40 ? 0.8 : 0.6;
          ok(cave.length <= orig.length * lim, `${id}: caveman ${label} is at most ${lim * 100}% of the original (${cave.length} of ${orig.length})`);
          const miss = [...new Set((orig.match(CAVE_TOKEN) || []).filter(mustKeep).filter((t) => !hasToken(cave, t)))];
          ok(miss.length === 0, `${id}: caveman ${label} keeps every reagent token (missing: ${miss.join(' ')})`);
        }
      }
    }
    // lesson and mechanism steps resolve (a card with no lesson has none and no mechanism step)
    if (c.lesson === null) { ok(c.mech === undefined, `${id}: a card with no lesson has no mechanism step`); continue; }
    ok(c.lesson && /^\d\d$/.test(c.lesson.id) && /^s\d\d$/.test(c.lesson.step), `${id}: lesson ref shape`);
    const L = LESSONS.find((l) => l.id === c.lesson.id);
    ok(!!L, `${id}: lesson ${c.lesson.id} exists`);
    if (L) {
      ok(L.steps.some((s) => s.id === c.lesson.step), `${id}: step ${c.lesson.step} exists in lesson ${c.lesson.id}`);
      if (c.mech !== undefined) {
        const m = L.steps.find((s) => s.id === c.mech);
        ok(!!m, `${id}: mechanism step ${c.mech} exists in lesson ${c.lesson.id}`);
        ok(m && ['mechanism-player', 'resonance-drawer'].includes(m.widget), `${id}: mechanism step ${c.mech} is a mechanism-player or resonance-drawer step`);
      }
    }
    hrefs.push(lessonHref(c.lesson));
    if (c.mech) hrefs.push(lessonHref({ id: c.lesson.id, step: c.mech }));
  }
  ok(hrefs.every((x) => /^#lesson-\d\d\/s\d\d$/.test(x)), 'every hub link has the form #lesson-NN/sK');

  // ---- (2) every molecule parses (JS), then Python read-back
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-hub-'));
  try {
    const cases = [];
    for (const c of HUB_CARDS) {
      const mols = [c.example.substrate, ...c.example.product.split('.')];
      mols.forEach((s) => ok(canon(s) !== null, `${c.id}: ${s} parses in RDKit (JS)`));
      if (c.example2) {
        const m2 = [c.example2.substrate, ...c.example2.product.split('.')];
        m2.forEach((s) => ok(canon(s) !== null, `${c.id}: second example ${s} parses in RDKit (JS)`));
        cases.push({ id: c.id + '#2', smiles: m2 });
      }
      ok(!c.example.product.includes('..') && !/^\.|\.$/.test(c.example.product), `${c.id}: product SMILES has no empty component`);
      cases.push({ id: c.id, smiles: mols });
    }
    const inp = path.join(tmp, 'in.json'), outp = path.join(tmp, 'out.json');
    fs.writeFileSync(inp, JSON.stringify({ cases }));
    execFileSync('python3', ['-I', path.join(TOOLS, 'check_hub.py'), inp, outp], { stdio: ['ignore', 'ignore', 'inherit'] });
    const py = JSON.parse(fs.readFileSync(outp, 'utf8')).cases;
    eq(py.length, HUB_CARDS.length + HUB_CARDS.filter((c) => c.example2).length, 'Python read every card and every second example');
    for (const c of HUB_CARDS.filter((x) => x.example2)) {
      const row = py.find((x) => x.id === c.id + '#2');
      ok(!!row && row.mols.every((m) => m.ok), `${c.id}: second example parses in Python RDKit`);
      const e2x = EXPECT2[c.id];
      if (!e2x) ok(!!row && row.mols.every((m) => m.centres.length === 0 && m.unassigned === 0 && m.ez.length === 0), `${c.id}: second example has no stereochemistry to show`);
      else if (row) {
        // a second example that shows stereochemistry on purpose: the substrate's written centres (and ring relationship), the products' letters, nothing left open
        const [sub2, ...prods2] = row.mols;
        eq(sub2.centres.length, e2x.subCentres, `${c.id}: second example substrate has ${e2x.subCentres} written stereocentre(s)`);
        if (e2x.subLetters) eq(sub2.centres, e2x.subLetters, `${c.id}: second example substrate CIP letters`);
        if (e2x.subCistrans) eq(sub2.cistrans, e2x.subCistrans, `${c.id}: second example substrate is ${e2x.subCistrans} on the ring (3D)`);
        eq(prods2.map((m) => m.centres.join()).sort(), e2x.products.map((a) => a.join()).sort(), `${c.id}: second example product letters`);
        ok(sub2.unassigned === 0 && prods2.every((m) => m.unassigned === 0 && m.ez.length === 0 && m.unassignedBonds === 0), `${c.id}: second example leaves nothing unspecified`);
      }
    }
    const centres0 = (prods) => prods.flatMap((m) => m.centres);
    for (const c of HUB_CARDS) {
      const row = py.find((x) => x.id === c.id);
      const exp = EXPECT[c.id] || {};
      ok(!!row && row.mols.every((m) => m.ok), `${c.id}: every molecule parses in Python RDKit`);
      if (!row) continue;
      const [sub, ...prods] = row.mols;
      ok(sub.centres.length === (exp.subCentres || 0) && sub.unassigned === (exp.subUnassigned || 0), `${c.id}: the substrate has ${exp.subCentres || 'no'} specified stereocentre(s) (${exp.subUnassigned || 0} drawn flat on purpose)`);
      if (exp.subLetters) eq(sub.centres, exp.subLetters, `${c.id}: CIP letters of the substrate`);
      if (exp.subCistrans) eq(sub.cistrans, exp.subCistrans, `${c.id}: the substrate's two ring groups are ${exp.subCistrans} (3D)`);
      if (exp.letters) eq(centres0(prods), exp.letters, `${c.id}: CIP letters of the product`);
      const centres = prods.flatMap((m) => m.centres), ez = prods.flatMap((m) => m.ez);
      eq(centres.length, exp.centres || 0, `${c.id}: number of specified stereocentres in the product`);
      eq(prods.reduce((n, m) => n + m.unassigned, 0), exp.unassigned || 0, `${c.id}: stereocentres left unspecified on purpose`);
      eq(prods.reduce((n, m) => n + m.unassignedBonds, 0), exp.unassignedBonds || 0, `${c.id}: C=C left without E/Z on purpose`);
      eq(ez, exp.ez || [], `${c.id}: E/Z of the specified C=C in the product`);
      if (exp.centres) {
        const m = prods.find((x) => x.centres.length === exp.centres);
        ok(!!m, `${c.id}: one product carries the ${exp.centres} stereocentres`);
        if (m) {
          if (exp.chiral !== undefined) eq(!m.achiral, exp.chiral, `${c.id}: ${exp.chiral ? 'chiral (a racemic pair)' : 'meso (equal to its own mirror image)'}`);
          if (exp.labels) eq(m.centres[0] === m.centres[1] ? 'same' : 'opposite', exp.labels, `${c.id}: CIP letters ${m.centres.join(',')}`);
          if (exp.cistrans) eq(m.cistrans, exp.cistrans, `${c.id}: the two ring groups are ${exp.cistrans} (3D)`);
        }
      }
      // a card that says syn or anti must show it: two stereocentres or a C=C with geometry
      if ((c.facts.space === 'syn' || c.facts.space === 'anti') && c.group !== 'halide') ok((exp.centres || 0) >= 2 || (exp.ez || []).length > 0 || (exp.flat && exp.unassigned >= 2), `${c.id}: syn/anti card shows its stereochemistry in the product (or is drawn flat on purpose with two stereocentres)`);
      if (exp.flat) ok(/racemate/.test(c.example.note || ''), `${c.id}: a flat drawing says so in the note`);
      // hydroboration is syn: H and OH end up on the same face, so OH is TRANS to the CH3 (read back in 3D, not just claimed)
      if (c.id === 'alkene-hydroboration') ok(prods.some((m) => m.cistrans === 'trans'), `${c.id}: the drawn product has the OH trans to the CH3`);
      // a single stereocentre that forms as a racemate is drawn flat AND the card says so
      if (exp.unassigned) ok(/racemate/.test(c.example.note || ''), `${c.id}: a flat racemic centre is explained in the note`);
      if (exp.centres && exp.chiral) ok(/racemate/.test(c.example.note || ''), `${c.id}: a chiral drawn product says it is one of two mirror images`);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }

  // ---- (3) the engine's product equals the card's product; space agrees with the engine
  const modelled = [], byHand = [];
  for (const c of HUB_CARDS) {
    const fn = ENGINE[c.id];
    if (!fn) {
      const hand = HAND[c.id];
      if (!hand) { ok(false, `${c.id}: no engine check and no hand-authored marker`); continue; }
      byHand.push(c.id);
      // (3b) formulas written by hand: the drawn product has the formula the chemistry gives
      const fp = c.example.product.split('.').map((x) => formulaOf(x));
      eq(fp, [].concat(hand.formula), `${c.id}: formula of the example product`);
      if (hand.sum) {
        const sub = c.example.substrate.split('.').map((x) => formulaOf(x));
        eq(sub, hand.sum, `${c.id}: the two reactants`);
      }
      ok(!c.example.substrate.split('.').some((x) => parts(x).join() === parts(c.example.product).join()), `${c.id}: the product differs from the substrate`);
      if (c.example2) {
        eq(c.example2.product.split('.').map((x) => formulaOf(x)), [hand.formula2], `${c.id}: formula of the second example product`);
        ok(canon(c.example2.substrate) !== canon(c.example2.product), `${c.id}: the second product differs from its substrate`);
      }
      continue;
    }
    let got;
    try { got = fn(c); } catch (e) { ok(false, `${c.id}: engine threw ${e.message}`); continue; }
    modelled.push(c.id);
    const want = parts(c.example.product);
    const have = got.products.map((p) => parts(p)).flat().sort();
    // a racemic product is drawn as ONE of the two mirror images: accept the engine's drawing or its mirror image
    let same = JSON.stringify(want) === JSON.stringify(have);
    if (!same && got.racemic) { try { same = JSON.stringify(want) === JSON.stringify(got.products.map((p) => parts(R.mirror(p))).flat().sort()); } catch (e) { same = false; } }
    ok(same, `${c.id}: card product ${JSON.stringify(want)} equals engine product ${JSON.stringify(have)}`);
    if (got.rel !== undefined && got.rel !== null) eq(c.facts.space, got.rel, `${c.id}: space agrees with the engine (${got.rel})`);
    if (got.racemic !== undefined) ok(!!got.racemic === /racemate/.test(c.example.note || '') || got.racemic === false, `${c.id}: racemate noted when the engine says racemic`);
  }
  eq(modelled.length + byHand.length, HUB_CARDS.length, 'every card has an engine model or a hand-written formula check');
  // no card is left out of the engine map, and the map has no stale card
  eq([...Object.keys(ENGINE), ...Object.keys(HAND)].sort(), HUB_CARDS.map((c) => c.id).sort(), 'ENGINE and HAND together cover exactly the hub cards');

  // ---- (4) router and view promises, read from the source
  const app = fs.readFileSync(path.join(HERE, '..', 'app.js'), 'utf8');
  ok(/lesson-\(\\d\+\)\(\?:\\\/\(s\\d\+\)\)\?\$/.test(app), 'router accepts #lesson-NN and #lesson-NN/sK');
  const view = fs.readFileSync(path.join(HERE, '..', 'hub-view.js'), 'utf8');
  eq(NO_LESSON, 'Not in a lesson: this card is the short version', 'the no-lesson line');
  ok(/c\.lesson\s*\?/.test(view) && /NO_LESSON/.test(view), 'hub view shows the no-lesson line when a card has no lesson, the lesson link otherwise');
  ok(/c\.subgroup/.test(view) && /hub-subhead/.test(view), 'hub view draws the sub-header for cards that have one');
  ok(/hash === 'reactions'/.test(app) && /buildHub\(/.test(app), 'router serves #reactions with the hub view');
  ok(/href: '#reactions'/.test(app), 'home screen has a button to #reactions');
  ok(/class: 'side'/.test(app) && /h\('h2', \{ id: 'rx-h' \}, 'Reactions'\)/.test(app), 'home screen has a Reactions panel');
  ok(/const deepAt = startId \?/.test(app) && !/done\.add\(L\.steps/.test(app), 'deep link sets the step without marking earlier steps done');
  ok(/idx: deep \? resumeIdx : idx/.test(app), 'a deep-link visit does not move the saved resume point');
  // ---- (4b) navigation: the sticky jump bar (one chip per group), the search box, and the card links inside the steps
  const hit = (q) => HUB_CARDS.filter((c) => matchesQuery(c, q)).map((c) => c.id);
  eq(hit('').length, HUB_CARDS.length, 'an empty search shows every card');
  ok(hit('PCC').includes('oxidation-pcc') && hit('pcc').length >= 1, 'search "PCC" finds the PCC card');
  ok(hit('Br2').includes('eas-bromination') && hit('Br2').includes('alkene-x2'), 'search "Br2" finds the bromination and the alkene X2 cards (subscripts folded)');
  ok(hit('hno3 h2so4').includes('eas-nitration'), 'search "hno3 h2so4" finds nitration (several words, all must match)');
  ok(hit('benzene').length > 3 && hit('benzene').every((id) => HUB_BY_ID[id]), 'search "benzene" finds the aromatic cards');
  eq(hit('zzzqq'), [], 'a search that matches nothing shows no card');
  eq(fold('Br₂, FeBr₃'), 'br2febr3', 'fold turns "Br₂, FeBr₃" into br2febr3');
  ok(HUB_CARDS.every((c) => hubText(c).length > 20), 'every card has searchable text');
  ok(/class: 'hub-jump'/.test(view) && /data-jump/.test(view) && HUB_GROUPS.length === 5 && /HUB_GROUPS\.map\(\(g\) => \{\s*const b = h\('button'/.test(view), 'hub view has a jump bar with one chip per group (five groups)');
  ok(/type: 'search'/.test(view) && /state\.q = search\.value/.test(view) && /matchesQuery\(c, state\.q\)/.test(view), 'hub view has a text search that filters the cards');
  const hubHtml = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
  ok(/\.hub-jump \{[^}]*position: sticky/.test(hubHtml), 'the jump bar is sticky');
  const links = HUB_CARDS.flatMap((c) => [...(c.apply.steps || []), ...(c.draw || []), ...((c.caveman && c.caveman.steps) || [])].flatMap((x) => [...x.matchAll(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g)].map((m) => m[1])));
  ok(links.length >= 3 && links.every((id) => HUB_BY_ID[id]), 'every [[card|words]] link inside a step points at a real card');
  ok(/director-activating/.test(JSON.stringify(HUB_BY_ID['eas-bromination'].apply.steps)) && /director-meta/.test(JSON.stringify(HUB_BY_ID['eas-bromination'].apply.steps)), 'the Br2/FeBr3 card links to the director cards in its last step');
  ok(/ring neighbour/i.test(HUB_BY_ID['alkene-hx'].apply.steps[0]), 'the HBr card says a ring neighbour counts as an alkyl group');
  const da = HUB_BY_ID['diels-alder'].draw.join(' ');
  ok(['ortho-like', 'stereocentre', 'racemate', 'Cis stays cis', 'electron-rich C4'].every((w) => da.includes(w)), 'the Diels-Alder walk-through explains ortho-like, stereocentre, racemate, "cis stays cis" and why C4 joins b');
  ok(/dielsAlderFrames\(\)/.test(view), 'the Diels-Alder card shows the three-frame hexagon sketch');
  // ---- (5) the Caveman switch on the hub: t() gives each card's caveman text when the mode is on, the normal text when it is off
  V.setCaveman(false);
  ok(HUB_CARDS.every((c) => V.t(c.what, c.caveman.what) === c.what), 'caveman off: every card shows its normal text');
  V.setCaveman(true);
  ok(HUB_CARDS.every((c) => V.t(c.what, c.caveman.what) === c.caveman.what && V.t(c.what, c.caveman.what) !== c.what), 'caveman on: every card shows its caveman text');
  ok(HUB_CARDS.every((c) => c.apply.steps.every((s, i) => V.t(s, c.caveman.steps[i]) === c.caveman.steps[i])), 'caveman on: every step shows its caveman step');
  V.setCaveman(false);
  ok(/\bt\(c\.what, c\.caveman && c\.caveman\.what\)/.test(view) && /onVoiceChange\(/.test(view), 'the hub view reads the caveman text and repaints in place on a toggle');
  ok(/id: 'caveman-switch'/.test(app) && /voice\.setCaveman\(/.test(app), 'the header has the Caveman switch');
  const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
  ok((html.match(/\/\* reaction hub \*\//g) || []).length === 1, 'index.html has one "/* reaction hub */" CSS block');
  const hubCss = html.slice(html.indexOf('/* reaction hub */'), html.indexOf('</style>'));
  ok(!/#[0-9a-fA-F]{3,6}\b/.test(hubCss), 'hub CSS uses the existing colour tokens only (no hex colours)');
  ok(!/@import|font-family\s*:\s*['"]/.test(hubCss), 'hub CSS adds no new fonts');
}

// run alone: node learn/tests/hub.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  await hub({ ok, eq });
  console.log(`\n${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
