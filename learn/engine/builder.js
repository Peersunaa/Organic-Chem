// Reaction builder (#build): pick a substrate, pick a reagent, see what forms and why. Pure logic, no DOM; RDKit must be ready.
//   SUBSTRATES / REAGENTS   the tiles (alkenes, alkynes, rings; reagents grouped as the professor numbers them, then the alkene and alkyne reagents)
//   react(substrate, reagentId, {full})   one unified result for every pair:
//       { status: 'ok' | 'none' (no reaction, with the reason) | 'na' (not modelled), products:[{smiles, share, label, minor, major}], facts, mechanism:{scene, alsoScene,
//         card, mech? (full:true)}, rule, ruleName, why, warnings:[{id,text}], energy? (ring reactions), next (the product to carry on with), noReaction?:{reason, rule} }
//   pairs()                 every substrate x reagent with its status; PAIR_COUNT = how many give a product (tests recompute it)
//   classifySubstrate / resolveSubstrate   custom input (SMILES or a course name), validated by RDKit
//   quizFor(substrate, reagentId, rng)     four drawn options: the drill's own question (generators-predict.js) when it matches, else products of three other reagents
// Products come from the course engines (reactions.js and friends: alkenes, alkynes, Lessons 13-14 EAS, Chapter 7 alkyl halides) and from engine/eas-rules.js (the professor's ring rules,
// ipso, deuteration, Friedel-Crafts limits). Nothing here types a product SMILES: every one is built by a graph edit or an engine call.
import { canon, analyze } from './chem.js';
import * as R from './reactions.js';
import * as ER from './eas-rules.js';
import { HUB_BY_ID } from './reaction-hub.js';
import { sceneForCard } from '../scenes/scene-index.js';
import * as SG from './stereo-graph.js';
import { nameAlkeneBoth, normName } from './naming.js';
import { nameBothAny } from './naming-chain.js';
import { nameBothArene, findRing } from './naming-arene.js';
import { describeMol } from './mol-name.js';
import { DRILL, problemFor } from './generators-predict.js';
import * as H from './reactions-halides.js';

// ---------------------------------------------------------------- substrates
const S = (id, smiles, group, name = null, extra = {}) => ({ id, smiles, group, name, ...extra });
export const SUBSTRATE_GROUPS = [
  { id: 'alkene', label: 'Alkenes' }, { id: 'alkyne', label: 'Alkynes' }, { id: 'ring', label: 'Rings' }, { id: 'ring2', label: 'Two groups (page 9)' }, { id: 'halide', label: 'Alkyl halides' }
];
export const SUBSTRATES = [
  S('ethylene', 'C=C', 'alkene', { new: 'ethene', old: 'ethylene' }), S('propene', 'CC=C', 'alkene'), S('2-methylpropene', 'CC(C)=C', 'alkene'), S('but-1-ene', 'CCC=C', 'alkene'),
  S('cis-but-2-ene', 'C/C=C\\C', 'alkene', { new: '(Z)-but-2-ene', old: 'cis-2-butene' }), S('trans-but-2-ene', 'C/C=C/C', 'alkene', { new: '(E)-but-2-ene', old: 'trans-2-butene' }),
  S('2-methylbut-2-ene', 'CC=C(C)C', 'alkene'), S('cyclohexene', 'C1=CCCCC1', 'alkene'), S('1-methylcyclohexene', 'CC1=CCCCC1', 'alkene'), S('1,2-dimethylcyclohexene', 'CC1=C(C)CCCC1', 'alkene'),
  S('styrene', 'C=Cc1ccccc1', 'alkene', { new: 'ethenylbenzene', old: 'styrene' }), S('methylenecyclohexane', 'C=C1CCCCC1', 'alkene', { new: 'methylidenecyclohexane', old: 'methylenecyclohexane' }),
  S('ethyne', 'C#C', 'alkyne', { new: 'ethyne', old: 'acetylene' }), S('propyne', 'CC#C', 'alkyne'), S('but-1-yne', 'CCC#C', 'alkyne'), S('but-2-yne', 'CC#CC', 'alkyne'),
  S('hex-1-yne', 'CCCCC#C', 'alkyne'), S('hex-3-yne', 'CCC#CCC', 'alkyne'), S('phenylacetylene', 'C#Cc1ccccc1', 'alkyne', { new: 'ethynylbenzene', old: 'phenylacetylene' }),
  S('benzene', 'c1ccccc1', 'ring'), S('toluene', 'Cc1ccccc1', 'ring'), S('ethylbenzene', 'CCc1ccccc1', 'ring'), S('propylbenzene', 'CCCc1ccccc1', 'ring'), S('isopropylbenzene', 'CC(C)c1ccccc1', 'ring'),
  S('tert-butylbenzene', 'CC(C)(C)c1ccccc1', 'ring'), S('anisole', 'COc1ccccc1', 'ring'), S('phenol', 'Oc1ccccc1', 'ring'), S('aniline', 'Nc1ccccc1', 'ring'),
  S('acetanilide', 'CC(=O)Nc1ccccc1', 'ring', { new: 'N-phenylacetamide', old: 'acetanilide' }), S('chlorobenzene', 'Clc1ccccc1', 'ring'), S('bromobenzene', 'Brc1ccccc1', 'ring'),
  S('fluorobenzene', 'Fc1ccccc1', 'ring'), S('nitrobenzene', 'O=[N+]([O-])c1ccccc1', 'ring'), S('benzaldehyde', 'O=Cc1ccccc1', 'ring'), S('acetophenone', 'CC(=O)c1ccccc1', 'ring'),
  S('benzoic-acid', 'OC(=O)c1ccccc1', 'ring'), S('benzenesulfonic-acid', 'OS(=O)(=O)c1ccccc1', 'ring'), S('p-xylene', 'Cc1ccc(C)cc1', 'ring'), S('p-bromotoluene', 'Cc1ccc(Br)cc1', 'ring'),
  S('p-chlorotoluene', 'Cc1ccc(Cl)cc1', 'ring'), S('m-nitrotoluene', 'Cc1cccc([N+](=O)[O-])c1', 'ring'), S('p-methoxyphenol', 'COc1ccc(O)cc1', 'ring', { new: '4-methoxyphenol', old: 'p-methoxyphenol' }),
  S('4-tert-butyltoluene', 'Cc1ccc(C(C)(C)C)cc1', 'ring', { new: '1-tert-butyl-4-methylbenzene', old: 'p-tert-butyltoluene' }),
  S('p-toluenesulfonic-acid', 'Cc1ccc(S(=O)(=O)O)cc1', 'ring', { new: '4-methylbenzenesulfonic acid', old: 'p-toluenesulfonic acid' }),
  S('o-fluoroanisole', 'COc1ccccc1F', 'ring2', { new: '1-fluoro-2-methoxybenzene', old: 'o-fluoroanisole' }), S('3-bromobenzoic-acid', 'OC(=O)c1cccc(Br)c1', 'ring2'),
  S('o-chlorotoluene', 'Cc1ccccc1Cl', 'ring2'), S('m-chlorotoluene', 'Cc1cccc(Cl)c1', 'ring2'), S('m-dichlorobenzene', 'Clc1cccc(Cl)c1', 'ring2'),
  S('phthalic-acid', 'OC(=O)c1ccccc1C(=O)O', 'ring2', { new: 'benzene-1,2-dicarboxylic acid', old: 'phthalic acid' }),
  S('2-methoxyacetanilide', 'COc1ccccc1NC(C)=O', 'ring2', { new: 'N-(2-methoxyphenyl)acetamide', old: '2-methoxyacetanilide' }), S('m-chloronitrobenzene', 'O=[N+]([O-])c1cccc(Cl)c1', 'ring2'),
  // Chapter 7: alkyl halides (the pool of engine/reactions-halides.js; both naming styles come from halideName, verified with OPSIN in tests/halides.mjs)
  ...['bromomethane', '1-bromobutane', '1-bromo-2-methylpropane', '1-chlorobutane', '2-bromopropane', '(R)-2-bromobutane', '(S)-2-bromobutane', 'bromocyclohexane', '2-bromo-2-methylpropane', '2-bromo-2-methylbutane',
    '2-chloro-2-methylpropane', '1-bromo-1-methylcyclohexane', 'cis-1-bromo-2-methylcyclohexane', 'trans-1-bromo-2-methylcyclohexane', 'benzyl bromide', 'allyl bromide', '(R)-3-bromo-3-methylhexane']
    .map((id) => { const e = H.HALIDE_BY_ID[id]; return S(id, e.smiles, 'halide', { new: e.iupac || e.id, old: e.old || e.iupac || e.id }); })
];
export const SUBSTRATE_BY_ID = Object.fromEntries(SUBSTRATES.map((s) => [s.id, s]));

// ---------------------------------------------------------------- reagents (ring groups numbered as the professor numbers them)
export const REAGENT_GROUPS = [
  { id: 'r1', top: 'ring', num: '1', label: 'Halogenation' }, { id: 'r2', top: 'ring', num: '2', label: 'Protonation, deuteration' }, { id: 'r3', top: 'ring', num: '3', label: 'Nitration' },
  { id: 'r4', top: 'ring', num: '4', label: 'Friedel–Crafts acylation' }, { id: 'r5', top: 'ring', num: '5', label: 'Friedel–Crafts alkylation' }, { id: 'r6', top: 'ring', num: '6', label: 'Sulfonation' },
  { id: 'rR', top: 'ring', num: 'R', label: 'Reductions' }, { id: 'rS', top: 'ring', num: 'S', label: 'Side chain' },
  { id: 'ae', top: 'alkene', num: '', label: 'Alkene reagents' }, { id: 'ay', top: 'alkyne', num: '', label: 'Alkyne reagents' },
  { id: 'hn', top: 'halide', num: '', label: 'Nucleophiles (SN2 / SN1)' }, { id: 'hb', top: 'halide', num: '', label: 'Bases (E2)' }, { id: 'hs', top: 'halide', num: '', label: 'Solvolysis (SN1 / E1)' }, { id: 'hg', top: 'halide', num: '', label: 'Grignard' }
];
export const TOPS = [{ id: 'ring', label: 'Ring' }, { id: 'alkene', label: 'Alkene' }, { id: 'alkyne', label: 'Alkyne' }, { id: 'halide', label: 'Alkyl halide' }];
const RG = (id, g, label, spec) => ({ id, group: g, top: REAGENT_GROUPS.find((x) => x.id === g).top, label, ...spec });
export const REAGENTS = [
  RG('Br2-FeBr3', 'r1', 'Br₂, FeBr₃', { type: 'eas', E: 'Br', card: 'eas-bromination', scene: '12-eas-bromination', easId: 'Br2' }),
  RG('Cl2-AlCl3', 'r1', 'Cl₂, AlCl₃', { type: 'eas', E: 'Cl', card: 'eas-bromination', easId: 'Cl2' }),
  RG('Cl2-AcOH', 'r1', 'Cl₂, CH₃COOH (no Lewis acid)', { type: 'eas', E: 'Cl', mild: true, card: 'eas-bromination' }),
  RG('I2-HNO3', 'r1', 'I₂, HNO₃', { type: 'eas', E: 'I', card: 'eas-bromination', easId: 'I2' }),
  RG('D2SO4', 'r2', 'D₂SO₄, D₂O', { type: 'deut', card: 'desulfonation' }),
  RG('H-ipso', 'r2', 'H⁺ (H₂SO₄, H₂O, heat): ipso', { type: 'ipso', card: 'desulfonation' }),
  RG('HNO3', 'r3', 'HNO₃, H₂SO₄', { type: 'eas', E: 'nitro', card: 'eas-nitration', scene: '13-eas-nitration', easId: 'HNO3' }),
  RG('AcCl', 'r4', 'CH₃COCl, AlCl₃; then H₃O⁺', { type: 'acyl', acid: 'CC(=O)Cl', card: 'fc-acylation', scene: '14-fc-acylation', easId: 'RCOCl', halide: 'CC(=O)Cl' }),
  RG('Ac2O', 'r4', '(CH₃CO)₂O, AlCl₃; then H₃O⁺', { type: 'acyl', acid: 'CC(=O)OC(C)=O', card: 'fc-acylation', scene: '14-fc-acylation' }),
  RG('EtCOCl', 'r4', 'CH₃CH₂COCl, AlCl₃; then H₃O⁺', { type: 'acyl', acid: 'CCC(=O)Cl', card: 'fc-acylation', scene: '14-fc-acylation', easId: 'RCOCl', halide: 'CCC(=O)Cl' }),
  RG('HexCOCl', 'r4', 'CH₃(CH₂)₄COCl, AlCl₃; then H₃O⁺', { type: 'acyl', acid: 'CCCCCC(=O)Cl', card: 'fc-acylation', scene: '14-fc-acylation' }),
  RG('PhCOCl', 'r4', 'C₆H₅COCl, AlCl₃; then H₃O⁺', { type: 'acyl', acid: 'O=C(Cl)c1ccccc1', card: 'fc-acylation', scene: '14-fc-acylation' }),
  RG('MeCl', 'r5', 'CH₃Cl, AlCl₃', { type: 'alkyl', source: { type: 'halide', smiles: 'CCl' }, card: 'fc-alkylation', easId: 'RCl', halide: 'CCl' }),
  RG('EtCl', 'r5', 'CH₃CH₂Cl, AlCl₃', { type: 'alkyl', source: { type: 'halide', smiles: 'CCCl' }, card: 'fc-alkylation', easId: 'RCl', halide: 'CCCl' }),
  RG('iPrCl', 'r5', '(CH₃)₂CHCl, AlCl₃ (2°)', { type: 'alkyl', source: { type: 'halide', smiles: 'CC(C)Cl' }, card: 'fc-alkylation', easId: 'RCl', halide: 'CC(C)Cl' }),
  RG('tBuCl', 'r5', '(CH₃)₃CCl, AlCl₃ (3°)', { type: 'alkyl', source: { type: 'halide', smiles: 'CC(C)(C)Cl' }, card: 'fc-alkylation', easId: 'RCl', halide: 'CC(C)(C)Cl' }),
  RG('PrCl', 'r5', 'CH₃CH₂CH₂Cl, AlCl₃ (1°)', { type: 'alkyl', source: { type: 'halide', smiles: 'CCCCl' }, card: 'fc-alkylation' }),
  RG('propene-HF', 'r5', 'CH₂=CHCH₃, HF, BF₃', { type: 'alkyl', source: { type: 'alkene', smiles: 'C=CC' }, card: 'fc-alkylation' }),
  RG('isobutylene-HF', 'r5', '(CH₃)₂C=CH₂, HF, BF₃', { type: 'alkyl', source: { type: 'alkene', smiles: 'C=C(C)C' }, card: 'fc-alkylation' }),
  RG('butene-HF', 'r5', 'CH₃CH₂CH=CH₂, HF, BF₃', { type: 'alkyl', source: { type: 'alkene', smiles: 'C=CCC' }, card: 'fc-alkylation' }),
  RG('tBuOH-BF3', 'r5', '(CH₃)₃COH, BF₃', { type: 'alkyl', source: { type: 'alcohol', smiles: 'CC(C)(C)O' }, card: 'fc-alkylation', alcohol: true }),
  RG('CH2O-HCl', 'r5', 'CH₂O, HCl, ZnCl₂ (chloromethylation)', { type: 'eas', E: 'CH2Cl', fc: true, card: 'fc-alkylation' }),
  RG('SO3', 'r6', 'SO₃, H₂SO₄', { type: 'eas', E: 'sulfo', card: 'eas-sulfonation', easId: 'SO3' }),
  RG('desulf', 'r6', 'Dilute H₂SO₄, heat (desulfonation)', { type: 'desulf', card: 'desulfonation' }),
  RG('Clemmensen', 'rR', 'Zn(Hg), HCl, heat (Clemmensen)', { type: 'clem', card: 'clemmensen' }),
  RG('Wolff-Kishner', 'rR', 'H₂NNH₂, KOH, heat (Wolff–Kishner)', { type: 'wk', card: 'clemmensen' }),
  RG('Fe-H3O', 'rR', 'Fe, H₃O⁺; then HO⁻', { type: 'fe', card: 'nitro-reduction' }),
  RG('KMnO4-ring', 'rS', 'KMnO₄, H₂O, heat (side chain)', { type: 'kmno4', card: 'side-chain-kmno4' }),
  RG('NBS', 'rS', 'NBS, hν (benzylic bromination)', { type: 'nbs', card: 'benzylic-bromination' }),
  RG('HBr', 'ae', 'HBr', { type: 'alkene', key: 'HBr', card: 'alkene-hx' }), RG('HCl', 'ae', 'HCl', { type: 'alkene', key: 'HCl', card: 'alkene-hx' }),
  RG('H2O-H', 'ae', 'H₂O, H₂SO₄ (cat.)', { type: 'alkene', key: 'H2O', card: 'alkene-hydration' }),
  RG('Br2', 'ae', 'Br₂, CH₂Cl₂', { type: 'alkene', key: 'Br2', card: 'alkene-x2' }), RG('Cl2', 'ae', 'Cl₂, CH₂Cl₂', { type: 'alkene', key: 'Cl2', card: 'alkene-x2' }),
  RG('H2-Pd', 'ae', 'H₂, Pd/C', { type: 'alkene', key: 'H2', card: 'alkene-h2-pd' }),
  RG('KMnO4-cold', 'ae', 'KMnO₄, cold, dilute, OH⁻', { type: 'alkene', key: 'KMnO4_OH', card: 'alkene-kmno4-base' }),
  RG('KMnO4-hot', 'ae', 'KMnO₄, hot or acidic', { type: 'alkene', key: 'KMnO4_H', card: 'alkene-kmno4-acid', tags: ['cleave'] }),
  RG('RCO3H', 'ae', 'RCO₃H (mCPBA)', { type: 'alkene', key: 'RCO3H', card: 'alkene-epoxide' }),
  RG('RCO3H-H3O', 'ae', 'RCO₃H, then H₃O⁺', { type: 'alkene', key: 'RCO3H_H3O', card: 'alkene-epoxide-diol' }),
  RG('BH3', 'ae', '1) BH₃·THF  2) H₂O₂, NaOH', { type: 'alkene', key: 'BH3', card: 'alkene-hydroboration' }),
  RG('HBr-1', 'ay', 'HBr (1 equiv.)', { type: 'alkyne', key: 'HBr_1', card: 'alkyne-hx-1' }), RG('HBr-2', 'ay', 'HBr (2 equiv.)', { type: 'alkyne', key: 'HBr_2', card: 'alkyne-hx-2' }),
  RG('HCl-1', 'ay', 'HCl (1 equiv.)', { type: 'alkyne', key: 'HCl_1', card: 'alkyne-hx-1' }), RG('HCl-2', 'ay', 'HCl (2 equiv.)', { type: 'alkyne', key: 'HCl_2', card: 'alkyne-hx-2' }),
  RG('Br2-1', 'ay', 'Br₂ (1 equiv.)', { type: 'alkyne', key: 'Br2_1', card: 'alkyne-x2-1' }), RG('Br2-2', 'ay', 'Br₂ (2 equiv.)', { type: 'alkyne', key: 'Br2_2', card: 'alkyne-x2-2' }),
  RG('Cl2-1', 'ay', 'Cl₂ (1 equiv.)', { type: 'alkyne', key: 'Cl2_1', card: 'alkyne-x2-1' }), RG('Cl2-2', 'ay', 'Cl₂ (2 equiv.)', { type: 'alkyne', key: 'Cl2_2', card: 'alkyne-x2-2' }),
  RG('H2O-Hg', 'ay', 'H₂O, H₂SO₄, HgSO₄', { type: 'alkyne', key: 'H2O_Hg', card: 'alkyne-hydration' }),
  RG('Lindlar', 'ay', 'H₂, Lindlar catalyst', { type: 'alkyne', key: 'H2_Lindlar', card: 'alkyne-lindlar' }),
  RG('Na-NH3', 'ay', 'Na, NH₃ (liquid)', { type: 'alkyne', key: 'Na_NH3', card: 'alkyne-lindlar' }),
  RG('H2-Pd-2', 'ay', 'H₂ (2 equiv.), Pd/C', { type: 'alkyne', key: 'H2_Pd', card: 'alkyne-h2-pd' }),
  RG('NaNH2-MeBr', 'ay', 'NaNH₂, then CH₃Br', { type: 'alkyne', key: 'acetylide', halide: 'CBr', card: 'alkyne-acetylide' }),
  RG('NaNH2-EtBr', 'ay', 'NaNH₂, then CH₃CH₂Br', { type: 'alkyne', key: 'acetylide', halide: 'CCBr', card: 'alkyne-acetylide' }),
  RG('BH3-alkyne', 'ay', '1) BH₃  2) H₂O₂, NaOH', { type: 'alkyne', key: 'BH3', card: 'alkyne-hydroboration' }),
  RG('KMnO4-hot-alkyne', 'ay', 'KMnO₄, hot, H₃O⁺', { type: 'alkyne', key: 'KMnO4_H', card: 'alkyne-kmno4-hot', tags: ['cleave'] }),
  // Chapter 7: alkyl halides. hid = the id in reactions-halides.js (a NUCLEOPHILES id or a BASES id); decide() chooses the mechanism
  ...[['I', 'sn2-i'], ['Br', 'sn2-i'], ['Cl', 'sn2-i'], ['CN', 'sn2-cn'], ['N3', 'sn2-cn'], ['MeS', 'sn2-rs'], ['HS', 'sn2-rs'], ['NH3', 'sn2-cn'], ['AcO', 'sn2-cn'], ['HO', 'sn2-oh']]
    .map(([n, card]) => RG('h-' + n, 'hn', H.NUCLEOPHILES[n].label, { type: 'halide', hid: n, card })),
  ...[['KOH', 'e2-zaitsev'], ['NaOEt', 'e2-zaitsev'], ['NaOMe', 'e2-zaitsev']].map(([b, card]) => RG('h-' + b, 'hb', H.BASES[b].label, { type: 'halide', hid: b, card })),
  RG('h-H2O', 'hs', H.NUCLEOPHILES.H2O.label, { type: 'halide', hid: 'H2O', card: 'sn1-solvolysis' }),
  RG('h-MeOH', 'hs', H.NUCLEOPHILES.MeOH.label, { type: 'halide', hid: 'MeOH', card: 'sn1-solvolysis' }),
  RG('h-EtOH', 'hs', H.NUCLEOPHILES.EtOH.label, { type: 'halide', hid: 'EtOH', card: 'e1-heat' }),
  RG('h-Mg-D2O', 'hg', 'Mg, ether; then D₂O', { type: 'grignard', card: 'grignard-d2o' })
];
export const REAGENT_BY_ID = Object.fromEntries(REAGENTS.map((r) => [r.id, r]));
/** How many substrate x reagent pairs give a product (tests/builder.mjs recomputes it with pairs() and fails when it is stale). */
export const PAIR_COUNT = 1034;

// ---------------------------------------------------------------- names
const PLAIN = Object.fromEntries(SUBSTRATES.filter((s) => s.name).map((s) => [s.smiles, s.name]));
let PLAIN_CAN = null;
/** {new, old} name of a molecule, or null (the UI then describes it). */
export function nameOf(smiles) {
  if (!smiles) return null;
  if (!PLAIN_CAN) PLAIN_CAN = Object.fromEntries(Object.entries(PLAIN).map(([k, v]) => [canon(k), v]));
  const c = canon(smiles);
  if (PLAIN_CAN[c]) return PLAIN_CAN[c];
  let n = null;
  const tries = [() => nameBothArene(smiles), () => nameAlkeneBoth(smiles), () => nameBothAny(smiles)];
  for (const f of tries) { try { n = f(); } catch (e) { n = null; } if (n && n.new) return n; }
  return null;
}
export const describe = (smiles) => { const n = nameOf(smiles); return n ? n.new : describeMol(smiles); };

// ---------------------------------------------------------------- what kind of substrate
/** 'halide' | 'alkene' | 'alkyne' | 'arene' | 'none', with flags: ring (has a benzene ring), cc (C=C outside a ring of benzene), ccc (C≡C). */
export function classifySubstrate(smiles) {
  const c = canon(smiles);
  if (!c) return { kind: 'invalid', why: 'RDKit cannot read that structure.' };
  const info = analyze(c);
  const ring = findRing(info);
  const ringSet = new Set(ring || []);
  let cc = 0, ccc = 0;
  info.bonds.forEach((b) => {
    const [x, y] = b.atoms;
    if (info.atoms[x].sym !== 'C' || info.atoms[y].sym !== 'C') return;
    if ((b.bo ?? 1) === 3) ccc++;
    else if ((b.bo ?? 1) === 2 && !(ringSet.has(x) && ringSet.has(y))) cc++;
  });
  if (c.includes('.')) return { kind: 'none', smiles: c, why: 'One molecule at a time, please.' };
  // an alkyl halide: a halogen on a carbon that is not part of the benzene ring (bromobenzene stays an arene; benzyl bromide and allyl bromide are halides)
  const halide = info.atoms.some((a) => ['F', 'Cl', 'Br', 'I'].includes(a.sym) && a.nbrs.length === 1 && info.atoms[a.nbrs[0]].sym === 'C' && !ringSet.has(a.nbrs[0]));
  const kind = halide ? 'halide' : ccc ? 'alkyne' : cc ? 'alkene' : ring ? 'arene' : 'none';
  return { kind, smiles: c, ring: !!ring, cc, ccc, why: kind === 'none' ? 'This molecule has no C=C, no C≡C, no benzene ring and no C–X bond, so none of these reagents is taught on it.' : '' };
}
let NAME_INDEX = null;
function nameIndex() {
  if (NAME_INDEX) return NAME_INDEX;
  NAME_INDEX = new Map();
  const add = (n, s) => { if (n) NAME_INDEX.set(normName(n), s); };
  const pool = new Set(SUBSTRATES.map((s) => s.smiles));
  for (const id of Object.keys(DRILL)) (DRILL[id].subs || []).forEach((s) => { if (!s.includes('.')) pool.add(s); });
  for (const s of pool) { const n = nameOf(s); if (n) { add(n.new, s); add(n.old, s); } }
  SUBSTRATES.forEach((s) => { add(s.id.replace(/-/g, ' '), s.smiles); add(s.id, s.smiles); if (s.name) { add(s.name.new, s.smiles); add(s.name.old, s.smiles); } });
  return NAME_INDEX;
}
/** Custom substrate typed by the learner: a SMILES, or a name the course uses (both naming styles). -> {ok, smiles, kind, name} | {ok:false, why} */
export function resolveSubstrate(text) {
  const t = String(text || '').trim();
  if (!t) return { ok: false, why: 'Type a SMILES (for example Cc1ccccc1) or a name the course uses (for example toluene).' };
  const hit = nameIndex().get(normName(t));
  let smiles = hit || null;
  if (!smiles && /^[A-Za-z0-9@+\-[\]()=#$/\\.%:*]+$/.test(t) && !/\s/.test(t)) smiles = canon(t);
  if (!smiles) return { ok: false, why: `“${t}” is not a SMILES RDKit can read, and it is not a name from the course list. Try a SMILES such as CC=C, or a name such as propene or toluene.` };
  const k = classifySubstrate(smiles);
  if (k.kind === 'invalid' || k.kind === 'none') return { ok: false, why: k.why };
  return { ok: true, smiles: k.smiles, kind: k.kind, name: nameOf(k.smiles) };
}

// ---------------------------------------------------------------- small graph edits for the cases the course engines refuse (a C=C or C≡C on a benzene ring)
const G_ = ER;
function frag(smiles) { return G_.readG(smiles); }
/** Add groups A and B (closed-shell molecules H-A, H-B, or 'H') to atoms a and b after lowering the a-b bond order by `drop`. */
function addAcross(G, a, b, A, B, drop = 1) {
  let H = G_.cloneG(G);
  const bd = G_.bondG(H, a, b); bd.o -= drop;
  H.h[a] += drop; H.h[b] += drop;
  const put = (at, X) => { for (const x of [].concat(X)) { if (x === 'H') continue; H = G_.joinG(H, at, frag(x)); } };
  // 'H' adds just keep the extra H; each real group replaces one of those H
  put(a, A); put(b, B);
  return H;
}
/** The vinyl or ethynyl unit on a benzene ring: {G, a (the carbon on the ring), b (the end carbon), order}, or null. Only Ar-CH=CH2 and Ar-C≡CH. */
function arylUnsat(smiles) {
  const G = G_.readG(smiles);
  if (!G) return null;
  const info = { atoms: G.el.map((sym, idx) => ({ idx, sym, nbrs: G_.nbrsG(G, idx) })), bonds: G.bonds.map((b) => ({ atoms: [b.a, b.b], bo: b.o })) };
  const ring = findRing(info);
  if (!ring) return null;
  const rs = new Set(ring);
  const cands = G.bonds.filter((b) => b.o >= 2 && G.el[b.a] === 'C' && G.el[b.b] === 'C' && !(rs.has(b.a) && rs.has(b.b)));
  if (cands.length !== 1) return null;
  const bd = cands[0];
  const onRing = (i) => G_.nbrsG(G, i).some((k) => rs.has(k));
  const a = onRing(bd.a) ? bd.a : onRing(bd.b) ? bd.b : -1;
  if (a < 0) return null;
  const b = a === bd.a ? bd.b : bd.a;
  if (G_.nbrsG(G, b).length !== 1 || G.h[b] !== (bd.o === 2 ? 2 : 1) || G.h[a] !== (bd.o === 2 ? 1 : 0)) return null;
  if (G.el.some((e) => !['C', 'H'].includes(e))) return null;
  return { G, a, b, order: bd.o, ring };
}
const W = (G) => G_.writeG(G);
/** A product with exactly one stereocentre forms as a racemate: drawn flat, as the course engines do. */
function flatIfOne(smiles) {
  const n = (String(smiles).match(/@+/g) || []).length;
  return n === 1 ? canon(String(smiles).replace(/@+/g, '')) : smiles;
}

// ---------------------------------------------------------------- results
const NOPE = (status, reason, rule = null, extra = {}) => ({ status, products: [], reason, noReaction: { reason, rule }, warnings: [], ...extra });
const prod = (smiles, extra = {}) => ({ smiles, share: null, label: '', ...extra });
const cardFacts = (id) => { const c = HUB_BY_ID[id]; return c ? { adds: c.facts.adds, where: c.facts.where, space: c.facts.space, cave: c.caveman && c.caveman.facts } : null; };
const sceneOf = (r) => r.scene || sceneForCard(r.card) || null;

/** HX, H2O, X2, H2, KMnO4, RCO3H, BH3 on an alkene. */
function alkeneReact(sub, r, k, full) {
  if (k.kind === 'arene') {
    if (r.key === 'H2') { const h = R.hydrogenate(sub, 'H2_Pd'); if (h.ok && !h.reacts) return NOPE('none', h.why, 'aromatic'); }
    if (r.key === 'KMnO4_H') return ringSideOx(sub, r);
    return NOPE('none', `A benzene ring does not add ${r.label}. Its π electrons belong to the aromatic ring, and adding across a ring C=C would destroy that extra stability. ${['Br2', 'Cl2'].includes(r.key) ? 'To put a halogen on the ring, use the ring reagent with a Lewis acid (Br₂, FeBr₃): substitution, not addition.' : 'Ring reactions are substitutions (ring reagents, groups 1 to 6).'}`, 'aromatic');
  }
  if (k.kind === 'alkyne') return NOPE('na', 'This tile is the alkene version. For a C≡C pick the alkyne reagents (they come in 1 and 2 equivalents).');
  if (k.kind !== 'alkene') return NOPE('na', 'This reagent works on a C=C.');
  if (k.ring) return vinylArene(sub, r);
  try {
    if (r.key === 'HBr' || r.key === 'HCl' || r.key === 'H2O') {
      const p = R.predict(sub, r.key);
      const products = p.products.map((s) => prod(s, { label: p.outcome === 'mixture' ? 'mixture: both carbons are alike in class' : p.outcome === 'markovnikov' ? 'Markovnikov product' : '' }));
      const why = p.outcome === 'markovnikov' ? `H⁺ adds first, to the C=C carbon with more H, so the + sits on the more substituted carbon (the more stable ${R.CLASS_NAME[p.major[0].cls]} cation). ${r.key === 'H2O' ? 'Water' : (r.key === 'HBr' ? 'Br⁻' : 'Cl⁻')} then bonds to that carbon: Markovnikov’s rule.` : p.outcome === 'mixture' ? 'Both C=C carbons give a cation of the same class, so both products form (a mixture).' : 'The two C=C carbons are alike, so there is one product.';
      return { status: 'ok', products, rule: 'markovnikov', ruleName: 'Markovnikov’s rule (the more stable carbocation)', why, warnings: [], mech: full ? p.major[0].mech : null, hasMech: true };
    }
    if (r.key === 'BH3') return hydroboration(sub);
    const p = R.predictAdd(sub, r.key);
    const products = p.products.map((s) => prod(s, { label: p.racemic ? 'forms as a racemate: this is one of the two mirror images' : '' }));
    const RULES = { Br2: ['anti-addition', 'Anti addition through a bromonium ion'], Cl2: ['anti-addition', 'Anti addition through a chloronium ion'], H2: ['syn-addition', 'Syn addition on the catalyst surface'], KMnO4_OH: ['syn-addition', 'Syn addition: a cis diol'], KMnO4_H: ['cleavage', 'Oxidative cleavage: the C=C is cut'], RCO3H: ['syn-addition', 'One O delivered to one face: the alkene geometry is kept'], RCO3H_H3O: ['anti-addition', 'Epoxide, then back-side opening: anti diol'] };
    const [rule, ruleName] = RULES[r.key];
    const why = r.key === 'KMnO4_H' ? 'Hot or acidic KMnO₄ cuts the C=C. Each end becomes C=O: an end with no H gives a ketone, an end with one H gives a carboxylic acid, a =CH₂ end gives CO₂.'
      : `${HUB_BY_ID[r.card].what}${p.rel ? ` Here the two new groups add ${p.rel}${p.ring ? `, so on the ring they end up ${p.ring}` : ''}.` : ''}`;
    let mech = null;
    if (full && (r.key === 'Br2' || r.key === 'Cl2')) { try { mech = R.halogenMechanism(sub, r.key === 'Br2' ? 'Br' : 'Cl'); } catch (e) { mech = null; } }
    return { status: 'ok', products, rule, ruleName, why, warnings: [], mech, hasMech: r.key === 'Br2' || r.key === 'Cl2', racemic: !!p.racemic };
  } catch (e) {
    return NOPE('na', String(e.message || e).replace(/^excluded:\s*/, 'Not modelled: '));
  }
}
/** Hydroboration-oxidation: syn addition of H and OH, OH on the less substituted carbon. Built from the syn diol (cold KMnO4 engine): the OH on the MORE substituted
 *  carbon is turned into H in place (same face), so H and OH end up syn. */
function hydroboration(sub) {
  const p = R.predictAdd(sub, 'KMnO4_OH');
  const diol = p.products[0];
  const g = SG.parse(diol);
  const os = g.atoms.map((a, i) => i).filter((i) => g.atoms[i].el === 'O');
  if (os.length !== 2) throw new Error('unexpected diol');
  const carbonOf = (o) => SG.neighbours(g, o)[0];
  const subst = (c) => SG.neighbours(g, c).filter((k) => g.atoms[k].el === 'C').length;
  const [c1, c2] = os.map(carbonOf);
  const choices = subst(c1) > subst(c2) ? [os[0]] : subst(c2) > subst(c1) ? [os[1]] : os;
  const out = [...new Set(choices.map((o) => { const w = SG.clone(g); w.atoms[o] = { ...w.atoms[o], el: 'H', h: 0, bracket: true }; return flatIfOne(canon(SG.write(w).smiles)); }))].sort();
  const products = out.map((s) => prod(s, { label: out.length > 1 ? 'mixture: both carbons are equally substituted' : (/@/.test(s) ? 'forms as a racemate: one of the two mirror images' : '') }));
  return { status: 'ok', products, rule: 'anti-markovnikov', ruleName: 'Anti-Markovnikov, syn addition (B goes to the less hindered carbon)', why: 'BH₃ adds B and H across the C=C in one step, on the same face (syn). B bonds to the carbon with MORE H (less crowded), and H₂O₂/NaOH then swaps B for OH with the same geometry: the OH ends up on the less substituted carbon, H and OH syn.', warnings: [], hasMech: false };
}
/** Styrene-type alkenes (Ar-CH=CH2): the course engines leave aromatic rings out, so the products are built here: the benzylic cation is the stable one. */
function vinylArene(sub, r) {
  const U = arylUnsat(sub);
  if (!U || U.order !== 2) return NOPE('na', 'Only a plain Ar–CH=CH₂ (styrene) is modelled when the C=C sits on a benzene ring.');
  const { G, a, b } = U;
  const one = (H, label = '') => prod(flatIfOne(W(H)), { label });
  let products, rule, ruleName, why;
  switch (r.key) {
    case 'HBr': case 'HCl': case 'H2O': {
      const X = r.key === 'H2O' ? 'O' : r.key === 'HBr' ? 'Br' : 'Cl';
      products = [one(addAcross(G, a, b, X, 'H'), 'Markovnikov: on the benzylic carbon')];
      rule = 'markovnikov'; ruleName = 'Markovnikov’s rule (the more stable carbocation)';
      why = 'H⁺ goes on the =CH₂ end, so the + sits on the carbon next to the ring: a benzylic cation, spread over the ring by resonance (more stable than any simple 2° cation). The nucleophile bonds there. Drawn flat: the new stereocentre forms as a racemate.';
      break;
    }
    case 'Br2': case 'Cl2': { const X = r.key[0] + r.key[1].toLowerCase(); products = [one(addAcross(G, a, b, X === 'Br' ? 'Br' : 'Cl', X === 'Br' ? 'Br' : 'Cl'))]; rule = 'anti-addition'; ruleName = 'Anti addition through a halonium ion'; why = 'One halogen on each C=C carbon (anti). One stereocentre, so it forms as a racemate and is drawn flat. The ring is not touched: no FeBr₃, no ring substitution.'; break; }
    case 'H2': { const h = R.hydrogenate(sub, 'H2_Pd'); products = [prod(h.product)]; rule = 'syn-addition'; ruleName = 'H₂ on Pd: the C=C outside the ring'; why = h.why; break; }
    case 'KMnO4_OH': products = [one(addAcross(G, a, b, 'O', 'O'))]; rule = 'syn-addition'; ruleName = 'Syn addition: a diol'; why = 'Cold, dilute KMnO₄ puts an OH on each C=C carbon (syn). One stereocentre: racemate, drawn flat.'; break;
    case 'RCO3H': { const H = G_.cloneG(G); G_.bondG(H, a, b).o = 1; H.el.push('O'); H.h.push(0); H.q.push(0); H.bonds.push({ a: H.el.length - 1, b: a, o: 1 }, { a: H.el.length - 1, b, o: 1 }); products = [one(H)]; rule = 'syn-addition'; ruleName = 'One O delivered to one face'; why = 'The peroxyacid gives one O to the C=C: an epoxide (styrene oxide). One stereocentre: racemate, drawn flat.'; break; }
    case 'RCO3H_H3O': products = [one(addAcross(G, a, b, 'O', 'O'))]; rule = 'anti-addition'; ruleName = 'Epoxide, then ring opening: a diol'; why = 'The epoxide opens in acid and water adds: an OH on each carbon. With only one stereocentre the anti/syn difference does not show (racemate, drawn flat).'; break;
    case 'KMnO4_H': {
      const H = G_.cloneG(G);
      const { G: H2, map } = G_.dropG(H, new Set([b]));
      const at = map.get(a); H2.h[at] = 0;
      H2.el.push('O', 'O'); H2.h.push(0, 1); H2.q.push(0, 0); H2.bonds.push({ a: at, b: H2.el.length - 2, o: 2 }, { a: at, b: H2.el.length - 1, o: 1 });
      const co2 = { el: ['C', 'O', 'O'], h: [0, 0, 0], q: [0, 0, 0], bonds: [{ a: 0, b: 1, o: 2 }, { a: 0, b: 2, o: 2 }] };
      products = [prod(W(H2)), prod(W(co2), { label: 'the =CH₂ end' })]; rule = 'cleavage'; ruleName = 'Oxidative cleavage: the C=C is cut'; why = 'Hot KMnO₄ cuts the C=C: the ring end (one H) becomes a carboxylic acid, the =CH₂ end becomes CO₂.'; break;
    }
    case 'BH3': products = [one(addAcross(G, a, b, 'H', 'O'))]; rule = 'anti-markovnikov'; ruleName = 'Anti-Markovnikov, syn addition'; why = 'B (then OH) goes on the end carbon with more H: 2-phenylethanol.'; break;
    default: return NOPE('na', 'Not modelled for styrene.');
  }
  return { status: 'ok', products, rule, ruleName, why, warnings: [{ id: 'aryl-alkene', text: 'Built for the C=C next to the ring (not from a course engine: the lessons leave out alkenes on a benzene ring). The ring itself does not react with these reagents.' }], hasMech: false };
}

/** Flip the one C=C of a disubstituted (Z) alkene to (E): swap the bond mark after the '=' (Na/NH3 gives the trans alkene). */
function flipEZ(smiles) {
  const s = String(smiles);
  const i = s.indexOf('=');
  if (i < 0 || !/[/\\]/.test(s)) return s;
  let j = s.slice(i).search(/[/\\]/);
  if (j < 0) return s;
  j += i;
  return canon(s.slice(0, j) + (s[j] === '/' ? '\\' : '/') + s.slice(j + 1));
}
/** Hot KMnO₄ on a C≡C (no course engine models it; hub card alkyne-kmno4-hot, scene 21): the triple bond is cut right through. An end whose carbon has no H
 *  becomes –CO₂H; a ≡C–H end leaves as CO₂ (ethyne: both ends). Every other atom stays where it was. */
function alkyneCleave(sub, k) {
  const G = G_.readG(sub);
  const t = G && G.bonds.find((b) => b.o === 3 && G.el[b.a] === 'C' && G.el[b.b] === 'C');
  if (!t) return NOPE('na', 'There is no C≡C to cut.');
  const H = G_.cloneG(G);
  H.bonds = H.bonds.filter((b) => !((b.a === t.a && b.b === t.b) || (b.a === t.b && b.b === t.a)));
  const piece = (start) => { const seen = new Set([start]), q = [start]; for (let i = 0; i < q.length; i++) G_.nbrsG(H, q[i]).forEach((n) => { if (!seen.has(n)) { seen.add(n); q.push(n); } }); return seen; };
  const products = [];
  [t.a, t.b].forEach((c, i) => {
    if (H.h[c] >= 1) { products.push(prod(canon('O=C=O'), { label: 'the ≡C–H end: CO₂' })); return; }
    const keep = piece(c);
    const { G: P, map } = G_.dropG(H, new Set(H.el.map((_, j) => j).filter((j) => !keep.has(j))));
    const at = map.get(c);
    P.el.push('O', 'O'); P.h.push(0, 1); P.q.push(0, 0);
    P.bonds.push({ a: at, b: P.el.length - 2, o: 2 }, { a: at, b: P.el.length - 1, o: 1 });
    products.push(prod(W(P), { label: H.h[t.a] + H.h[t.b] === 0 ? (i === 0 ? 'one end (no H): –CO₂H' : 'the other end (no H): –CO₂H') : 'the end with no H: –CO₂H' }));
  });
  products.sort((x, y) => (x.smiles === canon('O=C=O') ? 1 : 0) - (y.smiles === canon('O=C=O') ? 1 : 0));   // the acid first, CO₂ last
  const terminal = H.h[t.a] + H.h[t.b];
  const why = terminal === 2 ? 'Hot KMnO₄ cuts the C≡C right through. Both ends are ≡C–H, so both carbons leave as CO₂.'
    : terminal === 1 ? 'Hot KMnO₄ cuts the C≡C right through. The end with no H becomes a carboxylic acid, –CO₂H; the ≡C–H end goes on to CO₂.'
      : 'Hot KMnO₄ cuts the C≡C right through. Neither carbon has an H, so each end becomes a carboxylic acid, –CO₂H.';
  const warnings = k.ring ? [{ id: 'aryl-alkyne', text: 'Built for the C≡C next to the ring (the lessons leave alkynes on a benzene ring out). The ring itself does not react.' }] : [];
  return { status: 'ok', products, rule: 'cleavage', ruleName: 'Oxidative cleavage: the C≡C is cut', why, warnings, hasMech: false };
}
/** HX, X2, hydration, H2 (Lindlar, Pd, Na/NH3), acetylides, hydroboration, hot KMnO₄ on an alkyne. */
function alkyneReact(sub, r, k, full) {
  if (k.kind !== 'alkyne') return NOPE(k.kind === 'arene' ? 'none' : 'na', k.kind === 'arene' ? 'A benzene ring has no C≡C. These reagents add to a triple bond.' : 'This tile is for a C≡C. For a C=C pick the alkene reagents.', k.kind === 'arene' ? 'aromatic' : null);
  if (r.key === 'KMnO4_H') return alkyneCleave(sub, k);
  if (k.ring) return ethynylArene(sub, r);
  try {
    if (r.key === 'Na_NH3') {
      const p = R.predictAlkyne(sub, 'H2_Lindlar');
      const s = R.alkyneSites(sub);
      const terminal = s.terminal !== null || s.bothTerminal;
      const out = terminal ? p.products[0] : flipEZ(p.products[0]);
      return { status: 'ok', products: [prod(out, { label: terminal ? '' : 'the (E) alkene: trans' })], rule: 'anti-reduction', ruleName: 'Dissolving-metal reduction: anti, the trans alkene', why: 'Na gives the triple bond one electron at a time and NH₃ gives H⁺: the two H atoms end up on opposite sides, so an internal alkyne gives the (E), trans alkene (Lindlar gives the cis one).', warnings: terminal ? [{ id: 'terminal', text: 'A terminal alkyne has no cis/trans to show, and NaNH₂ formed in the mixture can also remove its ≡C–H: exam questions use Na/NH₃ on internal alkynes.' }] : [], hasMech: false };
    }
    if (r.key === 'acetylide') {
      const s = R.alkyneSites(sub);
      if (s.terminal === null && !s.bothTerminal) return NOPE('none', 'An internal alkyne has no H on the triple bond (no ≡C–H), so NaNH₂ cannot make an acetylide and nothing happens.', 'no-terminal-h');
      const out = R.alkylateAcetylide(R.acetylideOf(sub), r.halide);
      let mech = null;
      if (full && r.halide === 'CBr') { try { mech = R.acetylideAlkylationMechanism(sub, 'CBr'); } catch (e) { mech = null; } }
      return { status: 'ok', products: [prod(out)], rule: 'acetylide', ruleName: 'Acetylide anion, then SN2 on the alkyl bromide', why: 'NaNH₂ (pKa of NH₃ about 35) removes the ≡C–H (pKa about 25). The acetylide anion attacks the CH₂ or CH₃ carbon of the alkyl bromide and pushes Br⁻ out: the chain grows by the R of R–Br.', warnings: s.bothTerminal ? [{ id: 'twice', text: 'Ethyne has two ≡C–H: with more NaNH₂ and R–Br both ends are alkylated. One alkylation is shown.' }] : [], mech, hasMech: r.halide === 'CBr' };
    }
    if (r.key === 'BH3') {
      const s = R.alkyneSites(sub);
      if (s.terminal !== null && !s.bothTerminal) {
        const G = G_.readG(sub);
        const t = s.terminal, o = s.carbons.find((c) => c !== t);
        const H = G_.cloneG(G); G_.bondG(H, t, o).o = 1; H.h[o] += 2; H.el.push('O'); H.h.push(0); H.q.push(0); H.bonds.push({ a: t, b: H.el.length - 1, o: 2 });
        return { status: 'ok', products: [prod(W(H), { label: 'an aldehyde' })], rule: 'anti-markovnikov', ruleName: 'Anti-Markovnikov: B and then OH on the END carbon', why: 'Boron goes to the end carbon (less crowded); after H₂O₂/NaOH the enol has its OH on the end carbon and tautomerises to an aldehyde. Hg²⁺/H₂O gives the methyl ketone instead.', warnings: [], hasMech: false };
      }
      if (s.bothTerminal) return NOPE('na', 'Hydroboration of ethyne itself is not modelled.');
      const p = R.predictAlkyne(sub, 'H2O_Hg');
      return { status: 'ok', products: p.products.map((x) => prod(x, { label: p.outcome === 'mixture' ? 'mixture' : '' })), rule: 'hydroboration', ruleName: 'Hydroboration of an internal alkyne: a ketone', why: p.outcome === 'mixture' ? 'An unsymmetrical internal alkyne: B can go to either triple-bond carbon, so both ketones form.' : 'Both ends of a symmetrical internal alkyne are alike, so hydroboration gives the same ketone as hydration.', warnings: [], hasMech: false };
    }
    const p = R.predictAlkyne(sub, r.key);
    const products = p.products.map((x) => prod(x, { label: p.outcome === 'mixture' ? 'mixture' : p.stereo ? `the (${p.stereo}) alkene` : '' }));
    let mech = null;
    if (full && (r.key === 'HBr_1' || r.key === 'HCl_1')) { try { mech = R.alkyneHXMechanism(sub, r.key[1] === 'B' ? 'Br' : 'Cl'); } catch (e) { mech = null; } }
    const rx = p.rx;
    const why = rx.kind === 'HX' ? `H⁺ adds to the triple-bond carbon with more H; the vinyl cation sits on the more substituted carbon, so ${rx.X} goes there (Markovnikov).${rx.equiv === 2 ? ` The second H${rx.X} adds the same way, so both ${rx.X} end on the SAME carbon (a geminal dihalide).` : ''}`
      : rx.kind === 'X2' ? (rx.equiv === 1 ? `One ${rx.X}₂ adds anti across the triple bond: the two ${rx.X} end up trans, the (E) dihaloalkene.` : `Two ${rx.X}₂ add: two ${rx.X} on each carbon (a tetrahalide).`)
        : rx.kind === 'hydration' ? 'Hg²⁺ helps water add Markovnikov: the enol (C=C–OH) forms first and flips at once to the ketone. A terminal alkyne gives a methyl ketone.'
          : rx.kind === 'lindlar' ? 'The poisoned Lindlar catalyst adds one H₂ to one face (syn) and stops at the alkene: an internal alkyne gives the cis, (Z) alkene.'
            : 'Pd/C adds two H₂ and does not stop at the alkene: the alkane.';
    const RULE = { HX: ['markovnikov', 'Markovnikov (the more stable vinyl cation)'], X2: ['anti-addition', 'Anti addition: the (E) dihalide'], hydration: ['markovnikov', 'Markovnikov hydration, enol → ketone'], lindlar: ['syn-addition', 'Syn addition on the poisoned catalyst: cis'], pd: ['full-reduction', 'Two H₂: all the way to the alkane'] };
    const [rule, ruleName] = RULE[rx.kind];
    return { status: 'ok', products, rule, ruleName, why, warnings: [], mech, hasMech: r.key === 'HBr_1' || r.key === 'HCl_1' };
  } catch (e) {
    return NOPE('na', String(e.message || e).replace(/^excluded:\s*/, 'Not modelled: '));
  }
}
/** Phenylacetylene-type alkynes (Ar-C≡CH): built here (the course engines leave rings out). */
function ethynylArene(sub, r) {
  const U = arylUnsat(sub);
  if (!U || U.order !== 3) return NOPE('na', 'Only a plain Ar–C≡CH (phenylacetylene) is modelled when the C≡C sits on a benzene ring.');
  const { G, a, b } = U;
  let products, rule, ruleName, why, warnings = [];
  const X = /Br/.test(r.key) ? 'Br' : 'Cl';
  switch (r.key) {
    case 'HBr_1': case 'HCl_1': products = [prod(W(addAcross(G, a, b, X, 'H')))]; rule = 'markovnikov'; ruleName = 'Markovnikov (the cation next to the ring)'; why = `${X} goes on the carbon next to the ring (the vinyl cation there is the stable one); the end becomes =CH₂.`; break;
    case 'HBr_2': case 'HCl_2': products = [prod(W(addAcross(G, a, b, [X, X], ['H', 'H'], 2)))]; rule = 'markovnikov'; ruleName = 'Markovnikov twice: a geminal dihalide'; why = `Both H${X} add Markovnikov: both ${X} on the carbon next to the ring.`; break;
    case 'Br2_2': case 'Cl2_2': products = [prod(W(addAcross(G, a, b, [X, X], [X, X], 2)))]; rule = 'anti-addition'; ruleName = 'Two X₂: a tetrahalide'; why = `Two ${X}₂ add: two ${X} on each carbon.`; break;
    case 'Br2_1': case 'Cl2_1': {
      // the (E) dihalide: the course engine's product for propyne, with its CH3 swapped for the ring (written first in the SMILES, so the bond marks are unchanged)
      if (canon(sub) !== canon('C#Cc1ccccc1')) return NOPE('na', 'The (E)/(Z) product is only built for phenylacetylene itself.');
      const ref = R.predictAlkyne('CC#C', r.key).products[0];
      if (!/^C[/\\]/.test(ref)) return NOPE('na', 'Not modelled.');
      products = [prod(canon('c1ccccc1' + ref.slice(1)), { label: 'the (E) alkene' })]; rule = 'anti-addition'; ruleName = 'Anti addition: the (E) dihalide'; why = `One ${X}₂ adds anti: the two ${X} end up trans.`; break;
    }
    case 'H2O_Hg': { const H = G_.cloneG(G); G_.bondG(H, a, b).o = 1; H.h[b] += 2; H.el.push('O'); H.h.push(0); H.q.push(0); H.bonds.push({ a, b: H.el.length - 1, o: 2 }); products = [prod(W(H))]; rule = 'markovnikov'; ruleName = 'Markovnikov hydration, enol → ketone'; why = 'Water adds Markovnikov (OH next to the ring); the enol flips to the ketone: acetophenone.'; break; }
    case 'H2_Lindlar': case 'Na_NH3': products = [prod(W(addAcross(G, a, b, 'H', 'H')))]; rule = r.key === 'Na_NH3' ? 'anti-reduction' : 'syn-addition'; ruleName = r.key === 'Na_NH3' ? 'Dissolving-metal reduction' : 'Syn addition, stops at the alkene'; why = 'One H₂ adds and the reaction stops at the alkene: styrene (a terminal alkene has no cis/trans).'; if (r.key === 'Na_NH3') warnings = [{ id: 'terminal', text: 'A terminal alkyne has no cis/trans to show, and NaNH₂ formed in the mixture can also remove its ≡C–H.' }]; break;
    case 'H2_Pd': { const h = R.hydrogenate(sub, 'H2_Pd'); products = [prod(h.product)]; rule = 'full-reduction'; ruleName = 'Two H₂: all the way, the ring stays'; why = h.why; break; }
    case 'acetylide': { const H = G_.joinG(G, b, frag(r.halide.replace('Br', ''))); products = [prod(W(H))]; rule = 'acetylide'; ruleName = 'Acetylide anion, then SN2'; why = 'NaNH₂ removes the ≡C–H; the acetylide attacks R–Br and the chain grows on the end carbon.'; break; }
    case 'BH3': { const H = G_.cloneG(G); G_.bondG(H, a, b).o = 1; H.h[a] += 2; H.el.push('O'); H.h.push(0); H.q.push(0); H.bonds.push({ a: b, b: H.el.length - 1, o: 2 }); products = [prod(W(H), { label: 'an aldehyde' })]; rule = 'anti-markovnikov'; ruleName = 'Anti-Markovnikov: OH on the END carbon'; why = 'B and then OH go on the end carbon; the enol tautomerises to the aldehyde (phenylacetaldehyde).'; break; }
    default: return NOPE('na', 'Not modelled for this alkyne.');
  }
  warnings.push({ id: 'aryl-alkyne', text: 'Built for the C≡C next to the ring (the lessons leave alkynes on a benzene ring out). The ring itself does not react.' });
  return { status: 'ok', products, rule, ruleName, why, warnings, hasMech: false };
}

// ---------------------------------------------------------------- rings
const hasGroup = (scan, f) => scan.groups.some(f);
const FC_FAIL = (scan) => {
  const m = scan.groups.find((g) => g.dir === 'm');
  if (m) return NOPE('none', `No reaction. The ring carries ${m.label} (a meta director, class 3): it is so deactivated that a Friedel–Crafts electrophile gets nowhere. The professor: meta-orienting rings substitute cleanly with Br₂ or HNO₃, BUT NOT by acylation (nitrobenzene + CH₃COCl, AlCl₃: no reaction).`, 'fc-meta');
  const a = scan.groups.find((g) => ER.isAmine(g.id));
  if (a) return NOPE('none', `No reaction. The N of ${a.label} is a Lewis base: its lone pair bonds to AlCl₃, which puts a + on N right next to the ring and deactivates it. Friedel–Crafts fails on aniline and its relatives.`, 'fc-amine');
  const o = scan.groups.find((g) => g.id === 'OH' || g.id === 'NHCOR');
  if (o) return NOPE('na', `Not modelled: the O–H or N–H of ${o.label} binds the Lewis acid as well, and with an acyl chloride a phenol reacts on O (an ester). The course does not cover it.`, 'fc-oh');
  return null;
};
/** One electrophilic substitution through eas-rules, wrapped into a builder result. */
function easResult(sub, r, scan, E, opts = {}) {
  const res = ER.substituteRing(sub, E, opts);
  if (!res.ok) return NOPE('na', res.why);
  const products = res.products.map((p) => prod(p.smiles, { share: p.share, label: p.label, minor: !!p.minor, major: !!p.major, between: !!p.between }));
  return { status: 'ok', products, rule: res.rule, ruleName: res.ruleName, ruleCave: res.ruleCave, why: res.why, source: res.source, warnings: res.warnings.slice(), leaders: res.leaders, orient: res.orient, amineAcid: !!(typeof E === 'string' ? ER.ELECTROPHILES[E].acid : E.acid) };
}
function ringSideOx(sub, r) {
  const x = R.oxidizeSideChain(sub);
  if (!x.ok) return NOPE('na', x.why);
  if (!x.reacts) return NOPE('none', `No reaction. ${x.why}`, 'no-benzylic-h');
  return { status: 'ok', products: [prod(x.product)], rule: 'side-chain-ox', ruleName: 'KMnO₄ oxidises a side chain with a benzylic H to CO₂H', why: x.why, warnings: [], hasMech: false };
}
function ringReact(sub, r, k) {
  if (k.kind !== 'arene' && !['clem', 'wk'].includes(r.type)) {
    if (k.ring) return NOPE('na', 'The C=C or C≡C outside the ring would react first with this reagent; that competition is not modelled. Use the alkene or alkyne reagents.');
    return NOPE('na', 'This is a benzene-ring reagent, and this molecule has no benzene ring.');
  }
  const scan = k.kind === 'arene' ? ER.ringScan(sub) : null;
  if (scan && !scan.ok && !['clem', 'wk'].includes(r.type)) return NOPE('na', scan.why);
  switch (r.type) {
    case 'eas': {
      const E = ER.ELECTROPHILES[r.E];
      if (r.fc) { const f = FC_FAIL(scan); if (f) return f; }
      if (r.mild) {
        const act = scan.groups.some((g) => g.cls === 1) || (scan.groups.some((g) => g.rank === 4) && !scan.groups.some((g) => g.rank <= 3));
        if (!act) return NOPE('none', 'No reaction. Without a Lewis acid, Cl₂ is too weak an electrophile for this ring. The professor: an ACTIVATED ring (p-xylene, anisole) permits milder conditions such as Cl₂ in CH₃COOH; a plain or deactivated ring needs Cl₂ with AlCl₃ or FeCl₃.', 'mild-cl');
      }
      if (E.weak && scan.groups.some((g) => g.dir === 'm') && !scan.groups.some((g) => g.cls === 1)) return NOPE('none', 'No reaction. I⁺ (made from I₂ by HNO₃) is the weakest of the halogen electrophiles, and this ring is deactivated by a meta director.', 'iodination');
      const out = easResult(sub, r, scan, E);
      if (out.status !== 'ok') return out;
      if (r.E === 'I') { out.warnings.unshift({ id: 'iodination', text: 'Iodination needs I₂ PLUS an oxidant (HNO₃): it turns I₂ into I⁺ (I₂ → 2 I⁺ + 2 e⁻), the real electrophile (professor, page 2).' }); out.ruleName2 = 'Iodination: I₂ + HNO₃'; }
      if (r.mild) { out.warnings.unshift({ id: 'mild-cl', text: 'Activated system permits milder conditions: Cl₂ in CH₃COOH, no Lewis acid (professor, page 2).' }); }
      if (r.E === 'sulfo') out.warnings.push({ id: 'reversible', text: 'Sulfonation is reversible (2 H₂SO₄ ⇌ H₃O⁺ + HSO₄⁻ + SO₃): hot dilute acid takes the SO₃H off again. That is why it works as a blocking group.' });
      if (r.fc) out.warnings.push({ id: 'chloromethylation', text: 'Chloromethylation (professor, page 6): CH₂O, HCl and ZnCl₂ make the electrophile ⁺CH₂–O–ZnCl₂⁻; the product, a benzyl chloride, can go on to alkylate a second ring.' });
      if ((r.E === 'Br' || r.E === 'Cl') && scan.groups.some((g) => g.cls === 1 && g.rank === 6) && !out.amineAcid) out.warnings.push({ id: 'poly', text: `${scan.groups.find((g) => g.cls === 1 && g.rank === 6).label} activates the ring so strongly that halogenation goes fast, even without the Lewis acid, and easily goes on to the 2,4,6-trihalo product. One substitution is shown.` });
      if (r.E === 'nitro' && scan.groups.length === 2) {
        const ring2 = ER.secondNitration(out.products.map((p) => p.smiles));
        if (ring2 && scan.groups.some((g) => g.rank === 3) && scan.groups.some((g) => g.rank === 4)) {
          out.products.push(prod(ring2, { label: 'with more HNO₃: the second NO₂ goes ortho to the first (ortho effect): the professor’s example, page 9', excess: true, minor: false }));
          out.warnings.push({ id: 'second-nitration', text: 'With more HNO₃ every mono-nitro product nitrates again by the ortho effect (each NO₂ is meta to an o,p director), and they all meet at ONE dinitro compound. The professor’s example: p-bromotoluene → 2,3-dinitro-4-bromotoluene.' });
        }
      }
      return out;
    }
    case 'acyl': {
      const f = FC_FAIL(scan); if (f) return f;
      const A = ER.acylFrag(r.acid);
      const out = easResult(sub, r, scan, { kind: 'acyl', E: 'RC≡O⁺ (acylium ion)', text: 'acyl', bulky: true }, { fragment: A.frag, fragAt: A.at, reagent: r.id, bulky: true });
      if (out.status !== 'ok') return out;
      out.warnings.push({ id: 'acylation', text: 'Acylation is clean: the acylium ion does not rearrange, and the ketone product is deactivated, so it does not react a second time. H₃O⁺ in the workup frees the ketone from AlCl₃ (professor, page 4).' });
      if (out.leaders && out.leaders.length === 1 && scan.groups.length === 1 && scan.groups[0].dir === 'op') { out.rule = 'bulky-para'; out.ruleName = 'Acylation agent (RCOCl + AlCl₃) is bulky: more para'; }
      return out;
    }
    case 'alkyl': {
      const f = FC_FAIL(scan); if (f) return f;
      const c = ER.fcCation(r.source);
      const tBu = c.cls === 3 && ER.readG(ER.writeG(c.frag)).el.length === 4;
      const out = easResult(sub, r, scan, { kind: 'alkyl', E: 'R⁺ (a carbocation)', text: 'alkyl', bulky: tBu }, { fragment: c.frag, fragAt: c.at, bulky: tBu, paraOnly: tBu, bulkyText: tBu ? ' The tert-butyl cation is very bulky, so it goes para (the professor’s blocking-group route starts this way).' : '' });
      if (out.status !== 'ok') return out;
      if (tBu && scan.groups.length === 1 && scan.groups[0].dir === 'op') { out.rule = 'bulky-para'; out.ruleName = 'A bulky electrophile (the t-butyl cation): para'; }
      if (c.shifted) {
        out.warnings.unshift({ id: 'rearrangement', text: `Rearrangement of carbocations: the ${c.cls0 === 1 ? '1°' : '2°'} cation ${c.cationBefore} does a 1,2-${c.shifted === 'H' ? 'hydride' : 'methyl'} shift to the more stable ${c.cls === 3 ? '3°' : '2°'} cation ${c.cationAfter} before the ring attacks, so the chain on the ring is branched, NOT straight (professor, page 5). For a straight chain: acylate, then Clemmensen or Wolff–Kishner.` });
        out.rule = 'fc-rearrangement'; out.ruleName = 'Rearrangement of carbocations (1° alkyl halide)';
      }
      if (!c.shifted && r.source.type === 'alkene') { out.rule = 'fc-alkene'; out.ruleName = 'Alkene + HF, BF₃: the same carbocation as the alkyl halide'; }
      if (!c.shifted && r.alcohol) { out.rule = 'fc-alcohol'; out.ruleName = 'Reactions with alcohols: limited'; }
      if (r.source.type === 'alkene') out.warnings.unshift({ id: 'alkene-hf', text: 'HF with BF₃ protonates the alkene on its =CH₂ end (Markovnikov), which gives the SAME carbocation as the alkyl halide would; the ring then attacks it (professor, page 5).' });
      if (r.alcohol) out.warnings.unshift({ id: 'alcohol', text: 'Reactions with alcohols are LIMITED (professor, page 5): the cation can rearrange, and the water formed coordinates the Lewis acid (H₂O→BF₃), so a full equivalent of BF₃ is used up.' });
      out.warnings.push({ id: 'polyalkylation', text: 'Polyalkylation: the alkylated product is MORE activated toward E⁺ than the starting ring, so it reacts again (professor, page 4). An excess of the arene keeps it mostly to one alkyl group.' });
      return out;
    }
    case 'deut': {
      const ip = ER.ipsoRemove(sub, 'both', true);
      if (ip) return { status: 'ok', products: [prod(ip.smiles, { label: `D takes the place of ${ip.removed.join(' and ')}` })], rule: 'ipso', ruleName: 'Ipso substitution: a blocking group comes off', why: `D⁺ attacks the ring carbon that carries ${ip.removed.join(' and ')} (ipso attack): that σ-complex loses the group (${ip.removed.includes('t-butyl') ? 't-butyl leaves as isobutylene, (CH₃)₂C=CH₂' : ''}${ip.removed.length > 1 ? '; ' : ''}${ip.removed.includes('SO₃H') ? 'SO₃H leaves as SO₃' : ''}) instead of H⁺, so D ends up exactly where the group was.`, warnings: [], hasMech: false };
      if (!scan.groups.length) {
        const all = ER.perdeuterate(sub);
        const one = ER.substituteRing(sub, 'D');
        return { status: 'ok', products: [prod(one.products[0].smiles, { label: 'one exchange' }), prod(all, { label: 'excess D₂O: every ring H is exchanged (C₆D₆, professor page 3)' })], rule: 'deuteration', ruleName: 'Protonation: D⁺ exchanges a ring H (reversible)', why: 'D⁺ is the electrophile. The σ-complex can lose H⁺ or D⁺; losing H⁺ swaps one H for D. Repeated with excess D₂O, every ring H is replaced: C₆D₆.', warnings: [], hasMech: false };
      }
      const out = easResult(sub, r, scan, 'D');
      if (out.status !== 'ok') return out;
      out.why = 'D⁺ is the electrophile and the σ-complex loses H⁺: an H is swapped for D at the positions the groups direct to. ' + out.why;
      out.warnings.push({ id: 'exchange', text: 'Every step is reversible; with excess D₂O all the activated positions exchange in turn. One exchange is shown.' });
      return out;
    }
    case 'ipso': case 'desulf': {
      const ip = ER.ipsoRemove(sub, r.type === 'ipso' ? 'both' : 'SO3H', false);
      if (!ip) return NOPE('none', r.type === 'ipso' ? 'No visible change. H⁺ does attack the ring, but with no t-butyl or SO₃H group to lose, the σ-complex just loses H⁺ again: an H is swapped for an H.' : 'No reaction: there is no SO₃H group to remove.', r.type === 'ipso' ? 'ipso' : 'desulfonation');
      const why = `H⁺ attacks the ring carbon that carries ${ip.removed.join(' and ')} (ipso attack). That σ-complex loses ${ip.removed.map((x) => (x === 't-butyl' ? 'the t-butyl group (as isobutylene)' : 'SO₃ (sulfonation in reverse)')).join(' and ')} instead of H⁺, so H takes its place. This is how a blocking group is removed at the end of a synthesis (professor, pages 3 and 11).`;
      return { status: 'ok', products: [prod(ip.smiles, { label: `${ip.removed.join(' and ')} removed` })], rule: r.type === 'ipso' ? 'ipso' : 'desulfonation', ruleName: r.type === 'ipso' ? 'Ipso substitution: a blocking group comes off' : 'Sulfonation is reversible: desulfonation', why, warnings: [], hasMech: false };
    }
    case 'clem': case 'wk': return carbonylToCH2(sub, r);
    case 'fe': {
      let cur = canon(sub), n = 0;
      for (let i = 0; i < 4; i++) { const x = R.reduceNitro(cur); if (!x) break; cur = x; n++; }
      if (!n) return NOPE('none', 'No reaction: there is no NO₂ group to reduce.', 'nitro-reduction');
      return { status: 'ok', products: [prod(cur)], rule: 'nitro-reduction', ruleName: 'Fe (or Sn) and H₃O⁺ reduce NO₂ to NH₂', why: `Fe with H₃O⁺, then HO⁻, turns ${n > 1 ? 'each' : 'the'} NO₂ into NH₂ on the same ring carbon; the ring is not touched.`, warnings: [], hasMech: false };
    }
    case 'kmno4': return ringSideOx(sub, r);
    case 'nbs': {
      const cands = scan.groups.filter((g) => (g.id === 'alkyl' || g.id === 'alkylX') && scan.G.h[g.att] > 0 && !g.comp.some((i) => scan.G.el[i] === 'Br'));
      if (!cands.length) return NOPE('none', scan.groups.some((g) => g.id === 'alkyl') ? 'No reaction: there is no H on a benzylic carbon (the carbon bonded to the ring), so no benzylic radical can form.' : 'No reaction: NBS with light brominates a BENZYLIC carbon, and this ring has no alkyl group.', 'benzylic-br');
      const out = [...new Set(cands.map((g) => ER.writeG(ER.joinG(scan.G, g.att, ER.readG('Br')))))];
      return { status: 'ok', products: out.map((s) => prod(s, { label: out.length > 1 ? 'mixture: either benzylic carbon' : '' })), rule: 'benzylic-br', ruleName: 'Radical bromination at the benzylic carbon', why: 'Light (or NBS, heat) makes Br· radicals. They take the H from the benzylic carbon, because that radical is stabilised by the ring; Br ends up there. A new stereocentre forms as a racemate (drawn flat).', warnings: [], hasMech: false };
    }
    default: return NOPE('na', 'Not modelled.');
  }
}
/** Clemmensen (Zn(Hg), HCl) and Wolff-Kishner (H2NNH2, KOH): a ketone or aldehyde C=O becomes CH2. Zn/HCl also reduces NO2 to NH2. */
function carbonylToCH2(sub, r) {
  const G = ER.readG(sub);
  const isCO = (c) => G.el[c] === 'C' && ER.nbrsG(G, c).some((o) => G.el[o] === 'O' && ER.bondG(G, c, o).o === 2) && ER.nbrsG(G, c).every((k) => G.el[k] === 'C' || (G.el[k] === 'O' && ER.bondG(G, c, k).o === 2));
  const cs = G.el.map((_, i) => i).filter(isCO);
  if (!cs.length) return NOPE('none', 'No reaction: there is no ketone or aldehyde C=O to reduce (a CO₂H, ester or amide C=O is not touched).', r.type === 'clem' ? 'clemmensen' : 'wolff-kishner');
  const drop = new Set();
  const H = ER.cloneG(G);
  cs.forEach((c) => { const o = ER.nbrsG(H, c).find((k) => H.el[k] === 'O'); drop.add(o); H.h[c] += 2; });
  let out = ER.writeG(ER.dropG(H, drop).G);
  const warnings = [];
  if (r.type === 'clem') {
    let n = 0;
    for (let i = 0; i < 4; i++) { const x = R.reduceNitro(out); if (!x) break; out = x; n++; }
    if (n) warnings.push({ id: 'nitro', text: 'Zn with HCl also reduces an NO₂ group to NH₂, so that is reduced too.' });
  }
  return { status: 'ok', products: [prod(out)], rule: r.type === 'clem' ? 'clemmensen' : 'wolff-kishner', ruleName: r.type === 'clem' ? 'Clemmensen: C=O → CH₂ in acid' : 'Wolff–Kishner: C=O → CH₂ in base', why: `${r.type === 'clem' ? 'Zn(Hg) with HCl and heat' : 'Hydrazine with KOH and heat'} reduces the ketone or aldehyde C=O all the way to CH₂ and leaves the ring alone. The professor: Friedel–Crafts acylation, then this reduction, is the way to put a STRAIGHT chain on a ring (alkylation would rearrange).`, warnings, hasMech: false };
}

// ---------------------------------------------------------------- alkyl halides (Chapter 7): substitution, elimination, Grignard
const MECH_NAME = { SN2: 'SN2: back-side attack, inversion', SN1: 'SN1: carbocation, either face', E2: 'E2: strong base, anti H and halogen (Zaitsev)', E1: 'E1: carbocation, loses H⁺ (Zaitsev)' };
const RULE_NAME = { sn2: MECH_NAME.SN2, sn1: MECH_NAME.SN1, e2: MECH_NAME.E2, e1: MECH_NAME.E1, 'sn1+e1': 'SN1 and E1 compete (one carbocation)', 'e2+sn2': 'E2 with SN2 beside it (a mixture)', 'sn2+e2': 'SN2 with E2 beside it (a mixture)', grignard: 'Grignard reagent, then D₂O' };
/** The label of one product of decide(): says what the product is, and the stereochemistry in words. */
function halideLabel(p, pair) {
  if (p.mech === 'SN2') return /@/.test(p.smiles) ? 'SN2 product: the nucleophile replaces the halogen, with INVERSION at the carbon' : 'SN2 product: the nucleophile replaces the halogen';
  if (p.mech === 'SN1') return pair ? 'SN1 product, one of two enantiomers: the flat carbocation is attacked from either face (racemic)' : 'SN1 product: the solvent bonds to the carbocation';
  if (p.mech === 'E2') return p.role === 'major' ? 'E2 product, the more substituted alkene (Zaitsev)' : 'E2 product, the less substituted alkene';
  return p.role === 'major' ? 'E1 product, the more substituted alkene (Zaitsev)' : 'E1 product, the less substituted alkene';
}
/** The mechanism a halide result walks through in the mechanism player: the major mechanism, ending at its first major product. */
function halideMech(sub, P, d) {
  const prod = d.products.find((p) => p.mech === d.major && p.role === 'major') || d.products.find((p) => p.mech === d.major);
  if (d.major === 'SN2') return H.sn2Mechanism(sub, P.nuId);
  if (d.major === 'SN1') return H.sn1Mechanism(sub, P.nuId);
  if (d.major === 'E2') { const pr = H.predictE2(sub, P.baseId || P.nuId); const a = pr.alkenes.find((x) => x.smiles === prod.smiles); return H.e2Mechanism(sub, P.baseId || P.nuId, { beta: a.betas[0] }); }
  return H.e1Mechanism(sub, { alkene: prod.smiles, solvent: P.nuId === 'MeOH' ? 'MeOH' : P.nuId === 'EtOH' ? 'EtOH' : 'H2O' });
}
function halideReact(sub, r, k, full) {
  if (r.type === 'grignard') {
    let g;
    try { g = H.grignard(sub); } catch (e) { const why = String(e.message || e).replace(/^excluded:\s*/, ''); return /acidic hydrogen|react with the Grignard/.test(why) ? NOPE('none', `No reaction: ${why}.`, 'grignard-acidic') : NOPE('na', 'Not modelled: ' + why); }
    return { status: 'ok', products: [prod(g.protonolysis.D2O, { label: 'R–D: D takes the place of the halogen' })], rule: 'grignard', ruleName: RULE_NAME.grignard, why: g.why, warnings: [{ id: 'dry-ether', text: 'The Grignard reagent forms in dry ether and is destroyed by any acidic H (O–H, N–H, S–H, CO₂H), which is why the halide must not carry one.' }], hasMech: false };
  }
  const d = H.decide(sub, r.hid);
  if (!d.ok) return /no halogen/.test(d.reason) ? NOPE('na', 'This reagent works on an alkyl halide (a C–X bond). This molecule has none.') : NOPE('na', 'Not modelled: ' + d.reason);
  if (d.noReaction) return NOPE('none', `No reaction: ${d.reason}`, /sp²/.test(d.reason) ? 'sp2-halide' : 'no-sn-e');
  const P = H.reagentProfile(r.hid);
  const seen = new Set();
  const list = d.products.filter((p) => !seen.has(p.smiles) && seen.add(p.smiles));
  const nSN1 = list.filter((x) => x.mech === 'SN1').length;
  const products = list.map((p) => prod(p.smiles, { label: halideLabel(p, p.mech === 'SN1' && nSN1 === 2), minor: p.role === 'minor', major: p.role === 'major' }));
  const rule = d.mechs.map((m) => m.toLowerCase()).join('+');
  const warnings = [];
  if (d.mechs.length > 1) warnings.push({ id: 'mixture', text: d.mechs.includes('SN1') ? 'One carbocation gives both products: the solvent either bonds to it (SN1) or takes a β H (E1). Substitution is the bigger share in the cold; heat makes elimination grow.' : 'A strong base that is also a nucleophile does both: it takes a β H (E2) and attacks the carbon (SN2). The book’s table says E2 here; heat favours elimination.' });
  let ringRule = false;
  if (d.mechs.includes('E2')) {
    try {
      const e = H.predictE2(sub, P.baseId || P.nuId);
      if (e.ring) { ringRule = true; warnings.push({ id: 'chair', text: e.ringBlocked.length ? 'Six-membered ring: E2 needs the β H trans to the halogen (trans-diaxial in the chair). The H on the more substituted carbon is cis to the halogen here, so that alkene cannot form.' : 'Six-membered ring: E2 needs a β H trans to the halogen; every β carbon here has one, so the more substituted alkene (Zaitsev) can form.' }); }
    } catch (e) { /* no ring note */ }
  }
  if (d.mechs.includes('SN2') && /@/.test(sub)) warnings.push({ id: 'inversion', text: 'The carbon is a stereocentre: the nucleophile comes in from the back, so its configuration inverts.' });
  let mech = null;
  if (full) { try { mech = halideMech(sub, P, d); } catch (e) { mech = null; } }
  return { status: 'ok', products, rule, ruleName: RULE_NAME[rule] || rule, why: d.reason, caveWhy: d.caveman, warnings, mech, hasMech: true, ringRule };
}

// ---------------------------------------------------------------- energy sketch (the professor's pages 7 and 8: sigma complexes of o/p against meta attack)
const LV = (ts) => [{ label: 'ring + E⁺', kind: 'R', E: 0 }, { label: 'TS', kind: 'TS', E: ts }, { label: 'σ-complex', kind: 'I', E: ts - 16 }, { label: 'TS', kind: 'TS', E: ts - 8 }, { label: 'product + H⁺', kind: 'P', E: -20 }];
export function energyFor(kind) {
  if (kind === 'activating') return { kind, main: { label: 'ortho/para attack', levels: LV(56) }, overlay: { label: 'meta attack', levels: LV(74) }, caption: 'Activating group (like CH₃ in toluene, the professor’s page 7): the ortho and para σ-complexes lie lowest, the meta one higher, and both below benzene’s. Lower hill = faster = the product you get.' };
  if (kind === 'halogen') return { kind, main: { label: 'ortho/para attack', levels: LV(98) }, overlay: { label: 'meta attack', levels: LV(116) }, caption: 'Halogen: both σ-complexes lie ABOVE benzene’s (the ring is deactivated, slower), but ortho/para is still lower than meta, so the product is ortho and para.' };
  if (kind === 'meta') return { kind, main: { label: 'meta attack', levels: LV(100) }, overlay: { label: 'ortho/para attack', levels: LV(118) }, caption: 'Meta director (like NO₂, the professor’s page 8): every σ-complex lies above benzene’s, and ortho/para attack is the highest (the + would sit next to the δ+ atom), so meta wins.' };
  return { kind: 'benzene', main: { label: 'benzene + E⁺', levels: LV(84) }, overlay: null, caption: 'Benzene (professor, page 1): slow step to the σ-complex, then fast loss of H⁺ that restores the aromatic ring.' };
}

// ---------------------------------------------------------------- the one entry point
const cache = new Map();
/**
 * react(substrateSmiles, reagentId, {full}) -> the unified result (see the top of this file). Results without `full` are cached.
 */
export function react(substrate, reagentId, opts = {}) {
  const full = !!opts.full;
  const key = `${substrate}\u0001${reagentId}`;
  if (!full && cache.has(key)) return cache.get(key);
  const r = REAGENT_BY_ID[reagentId];
  if (!r) throw new Error('unknown reagent ' + reagentId);
  const k = classifySubstrate(substrate);
  let res;
  if (k.kind === 'invalid' || k.kind === 'none') res = NOPE('na', k.why || 'Not a substrate these reagents work on.');
  else {
    const sub = k.smiles;
    try {
      res = r.top === 'alkene' ? alkeneReact(sub, r, k, full) : r.top === 'alkyne' ? alkyneReact(sub, r, k, full) : r.top === 'halide' ? halideReact(sub, r, k, full) : ringReact(sub, r, k);
    } catch (e) {
      res = NOPE('na', 'Not modelled: ' + String(e.message || e).replace(/^excluded:\s*/, ''));
    }
  }
  res.substrate = k.smiles || substrate;
  res.kind = k.kind;
  res.reagent = { id: r.id, label: r.label, group: r.group, top: r.top };
  res.products = (res.products || []).filter((p) => p.smiles);
  if (res.status === 'ok' && !res.products.length) res = { ...NOPE('na', 'The engine gave no product.'), substrate: res.substrate, kind: res.kind, reagent: res.reagent };
  res.products.forEach((p) => { p.name = nameOf(p.smiles); });
  // the product to carry on with: the biggest share, else the first major, else the first
  if (res.status === 'ok') {
    const main = res.products.filter((p) => !p.excess && !(p.label || '').startsWith('the =CH₂') && !(p.label || '').startsWith('the ≡C–H'));
    const best = main.slice().sort((a, b) => (b.share ?? (b.minor ? -1 : 50)) - (a.share ?? (a.minor ? -1 : 50)))[0] || res.products[0];
    res.next = best.smiles;
  } else res.next = null;
  // facts (what adds / where / in space; for rings: which position and why)
  const cf = cardFacts(res.ringRule ? 'e2-chair' : r.card);
  if (res.status === 'ok') {
    if (k.kind === 'arene' && ['eas', 'acyl', 'alkyl', 'deut'].includes(r.type) && res.orient) {
      const L = res.leaders || [];
      res.facts = { adds: cf ? cf.adds : '', where: summaryWhere(res), space: 'n.a.', director: L.length ? L.map((g) => `${g.label}: ${ER.CLASS_NAME[g.cls]}`).join('; ') : 'none (benzene)', ring: true };
    } else res.facts = cf ? { adds: cf.adds, where: cf.where, space: cf.space, cave: cf.cave } : null;
  } else res.facts = null;
  // mechanism: scene when one exists, else the engine's step-by-step mechanism, else the hub card's scheme
  const scene = sceneOf(r);
  const mechanism = { scene, card: res.ringRule ? 'e2-chair' : r.card, alsoScene: k.kind === 'arene' && res.status === 'ok' && ['eas', 'acyl', 'alkyl'].includes(r.type) && res.orient && res.orient.groups.length ? '15-directors' : null };
  if (res.status === 'ok') {
    if (res.mech) mechanism.mech = res.mech;
    else if (full && k.kind === 'arene' && r.easId && ['eas', 'acyl', 'alkyl'].includes(r.type) && !(r.source && r.source.smiles === 'CCCCl')) { try { mechanism.mech = R.easMechanism(r.easId, r.halide || null); mechanism.mechOnBenzene = true; } catch (e) { /* no mechanism */ } }
    mechanism.hasMech = !!(res.hasMech || (k.kind === 'arene' && r.easId && ['eas', 'acyl', 'alkyl'].includes(r.type)));
    mechanism.scheme = HUB_BY_ID[mechanism.card] ? { card: mechanism.card, example: HUB_BY_ID[mechanism.card].example } : null;
  }
  delete res.mech;
  res.mechanism = mechanism;
  // the energy sketch for ring substitutions
  if (res.status === 'ok' && k.kind === 'arene' && ['eas', 'acyl', 'alkyl'].includes(r.type)) {
    const scan = ER.ringScan(res.substrate);
    res.energy = energyFor(ER.ringKind(scan, !!res.amineAcid));
  }
  delete res.orient; delete res.hasMech; delete res.ringRule;
  if (!full) cache.set(key, res);
  return res;
}
function summaryWhere(res) {
  const ps = res.products.filter((p) => !p.excess);
  if (!ps.length) return '';
  const major = ps.filter((p) => !p.minor);
  return (major.length ? major : ps).map((p) => p.label).filter(Boolean).join('; ') || 'on the ring';
}

// ---------------------------------------------------------------- coverage
let PAIRS = null;
/** Every substrate tile x every reagent, with its status ('ok' | 'none' | 'na'). */
export function pairs() {
  if (PAIRS) return PAIRS;
  PAIRS = [];
  for (const s of SUBSTRATES) for (const r of REAGENTS) { const x = react(s.smiles, r.id); PAIRS.push({ substrate: s.id, smiles: s.smiles, reagent: r.id, status: x.status, available: x.status === 'ok' }); }
  return PAIRS;
}

// ---------------------------------------------------------------- quiz me
/** The drill card and reagent variant for a builder reagent on this substrate (null when the drill has no such reagent). */
export function drillLink(reagentId, substrate) {
  const r = REAGENT_BY_ID[reagentId];
  if (!r) return null;
  const isBenzene = canon(substrate) === R.BENZENE;
  const pickV = (card, f) => { const e = DRILL[card]; if (!e || e.fixed) return null; const v = e.variants.find(f); return v ? { card, variant: v } : null; };
  if (r.top === 'ring') {
    if (r.easId === 'Br2' || r.easId === 'Cl2') return pickV(isBenzene ? 'eas-bromination' : 'director-halogen', (v) => v.id === r.easId) || pickV('eas-bromination', (v) => v.id === r.easId);
    if (r.easId === 'HNO3') return pickV('eas-nitration', (v) => v.id === 'HNO3');
    if (r.easId === 'SO3') return pickV('eas-sulfonation', (v) => v.id === 'SO3');
    if (r.easId === 'RCOCl') return pickV('fc-acylation', (v) => v.halide === r.halide);
    if (r.easId === 'RCl') return pickV('fc-alkylation', (v) => v.halide === r.halide);
    if (r.type === 'kmno4') return pickV('side-chain-kmno4', () => true);
    if (r.type === 'fe') return pickV('nitro-reduction', () => true);
    return null;
  }
  if (r.top === 'alkene') {
    if (['HBr', 'HCl', 'H2O'].includes(r.key)) return pickV(r.card, (v) => v.id === r.key);
    return pickV(r.card, (v) => v.id === r.key);
  }
  if (r.top === 'halide') {
    const MAP = { 'h-CN': ['sn2-cn', 'CN'], 'h-I': ['sn2-i', 'I'], 'h-HO': ['sn2-oh', 'HO'], 'h-MeS': ['sn2-rs', 'MeS'], 'h-H2O': ['sn1-solvolysis', 'H2O'], 'h-MeOH': ['sn1-solvolysis', 'MeOH'], 'h-EtOH': ['sn1-solvolysis', 'EtOH'],
      'h-KOH': ['e2-zaitsev', 'KOH'], 'h-NaOEt': ['e2-zaitsev', 'NaOEt'], 'h-NaOMe': ['e2-zaitsev', 'NaOMe'], 'h-Mg-D2O': ['grignard-d2o', 'grignard'] };
    const m = MAP[r.id];
    return m ? pickV(m[0], (v) => v.id === m[1]) : null;
  }
  if (r.key === 'acetylide') return pickV('alkyne-acetylide', (v) => v.halide === r.halide);
  return pickV(r.card, (v) => v.id === r.key);
}
/** Which builder reagent is the one in each hub card's worked example (the tests check the builder reproduces every such example). */
export const HUB_EXAMPLE_REAGENT = {
  'eas-bromination': 'Br2-FeBr3', 'eas-nitration': 'HNO3', 'eas-sulfonation': 'SO3', 'fc-alkylation': 'EtCl', 'fc-acylation': 'AcCl', 'director-activating': 'HNO3', 'director-halogen': 'HNO3',
  'director-meta': 'Br2-FeBr3', 'side-chain-kmno4': 'KMnO4-ring', 'nitro-reduction': 'Fe-H3O', clemmensen: 'Clemmensen', 'benzylic-bromination': 'NBS', 'amine-in-acid': 'HNO3', desulfonation: 'D2SO4',
  'side-chain-h2pd': 'H2-Pd', 'alkene-hx': 'HBr', 'alkene-hydration': 'H2O-H', 'alkene-x2': 'Br2', 'alkene-h2-pd': 'H2-Pd', 'alkene-kmno4-base': 'KMnO4-cold', 'alkene-kmno4-acid': 'KMnO4-hot',
  'alkene-epoxide': 'RCO3H', 'alkene-epoxide-diol': 'RCO3H-H3O', 'alkene-hydroboration': 'BH3', 'alkyne-hx-1': 'HBr-1', 'alkyne-hx-2': 'HBr-2', 'alkyne-x2-1': 'Br2-1', 'alkyne-x2-2': 'Br2-2',
  'alkyne-hydration': 'H2O-Hg', 'alkyne-lindlar': 'Lindlar', 'alkyne-h2-pd': 'H2-Pd-2', 'alkyne-acetylide': 'NaNH2-EtBr', 'alkyne-hydroboration': 'BH3-alkyne',
  'alkyne-kmno4-hot': 'KMnO4-hot-alkyne',
  'sn2-cn': 'h-CN', 'sn2-i': 'h-I', 'sn2-oh': 'h-HO', 'sn2-rs': 'h-MeS', 'sn1-solvolysis': 'h-H2O', 'e2-zaitsev': 'h-KOH', 'e2-chair': 'h-KOH', 'e1-heat': 'h-EtOH', 'grignard-d2o': 'h-Mg-D2O'
};
/** The hub examples this pair reproduces: [{card, product}] (for the tests). */
export function hubExampleFor(reagentId, substrate) {
  const out = [];
  for (const [card, rid] of Object.entries(HUB_EXAMPLE_REAGENT)) {
    if (rid !== reagentId || !HUB_BY_ID[card]) continue;
    const c = HUB_BY_ID[card];
    [c.example, c.example2].filter(Boolean).forEach((e) => { if (!e.substrate.includes('.') && canon(e.substrate) === canon(substrate)) out.push({ card, product: e.product, reagent: e.reagent || c.reagent }); });
  }
  return out.length ? out : null;
}
const keyOf = (list) => list.map((s) => R.stereoKey(s)).sort().join('|');
const mainSet = (res) => { const m = res.products.filter((p) => !p.minor && !p.excess); return (m.length ? m : res.products).map((p) => p.smiles); };
/**
 * quizFor(substrate, reagentId, rng) -> {source:'drill'|'builder', prompt, options:[{smiles:[...], correct, why}], answerKey} | null
 * The drill's own four-option question (engine distractors with a specific why each) when its right answer is this result; otherwise the products of three other reagents.
 */
export function quizFor(substrate, reagentId, rng = Math.random) {
  const res = react(substrate, reagentId);
  if (res.status !== 'ok') return null;
  const right = mainSet(res);
  const link = drillLink(reagentId, substrate);
  if (link) {
    let p = null;
    try { p = problemFor(link.card, res.substrate, link.variant, rng); } catch (e) { p = null; }
    if (!p) { try { p = problemFor(link.card, substrate, link.variant, rng); } catch (e) { p = null; } }
    if (p) {
      const corr = p.options.find((o) => o.correct);
      if (corr && keyOf(corr.smiles.split('.')) === keyOf(right)) {
        return { source: 'drill', prompt: `Which is the major product${right.length > 1 ? ' (or products)' : ''}?`, options: p.options.map((o) => ({ smiles: o.smiles.split('.'), correct: !!o.correct, why: o.why })) };
      }
    }
  }
  // builder options: the right set, and the products of other reagents that work on this substrate (same family first)
  const others = REAGENTS.filter((x) => x.id !== reagentId && (x.top === res.reagent.top) && x.label !== res.reagent.label);
  const order = others.map((x) => [x, rng()]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  const seen = new Set([keyOf(right)]);
  const opts = [{ smiles: right, correct: true, why: `Yes. ${res.why}` }];
  for (const x of order) {
    if (opts.length >= 4) break;
    const o = react(res.substrate, x.id);
    if (o.status !== 'ok') continue;
    const s = mainSet(o);
    const k = keyOf(s);
    if (seen.has(k)) continue;
    seen.add(k);
    opts.push({ smiles: s, correct: false, why: `That is what ${x.label} gives (${o.ruleName || 'a different reaction'}). ${res.reagent.label} does something else: ${res.ruleName || ''}.` });
  }
  if (opts.length < 4 && !seen.has(keyOf([res.substrate]))) { opts.push({ smiles: [res.substrate], correct: false, why: `That is the starting material. ${res.reagent.label} does react with it.` }); }
  if (opts.length < 3) return null;
  const shuffled = opts.map((o) => [o, rng()]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  return { source: 'builder', prompt: `Which is the major product${right.length > 1 ? ' (or products)' : ''}?`, options: shuffled };
}

/** The route as text: "toluene → [(CH₃)₃CCl, AlCl₃] → 1-tert-butyl-4-methylbenzene → ...". steps = [{from, reagentId, to}] */
export function routeText(steps, mode = 'new') {
  if (!steps.length) return '';
  const nm = (s) => { const n = nameOf(s); return n ? n[mode] || n.new : s; };
  return [nm(steps[0].from)].concat(steps.map((st) => `→ [${REAGENT_BY_ID[st.reagentId].label}] → ${nm(st.to)}`)).join(' ');
}
