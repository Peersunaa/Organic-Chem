// The 20 mechanism scenes: which hub card, lesson step and weak-spot skill each one belongs to. 01-16 and 20 each animate one hub card's reagent; 17, 18 and 19 are Lesson 08
// PRIMERS (`primer: true`, no hub card of their own: HCl + ethylene as the model reaction, the three legal arrows, and the carbocation), reached from Lesson 08 steps and the #scenes list. Plain data, importable without fetching anything
// (app.js, hub-view.js and the tests use it); tests/scenes.mjs checks every row against the scene JSON it names.
//   id     = the storyboard's id and file name (scenes/scenes/<id>.json, scenes/layouts/<id>.json)
//   short  = the id without its number: the route is #scene/<short> (the full id works too)
//   cards  = hub cards this scene serves (HUB_BY_ID keys): the storyboard's reagentCard plus the "also" cards the scene truly shows
//   lesson = [{ id, step }] lesson steps whose mechanism this scene animates (the storyboard's lesson field, plus the matching mechanism step of a second card)
//   skill  = what a wrong quiz answer is logged under (engine/skills.js)
export const SCENES = [
  { id: '01-alkene-hx', title: 'HBr adds to 2-methylpropene', reagent: 'HBr', cards: ['alkene-hx'], lesson: [{ id: '09', step: 's08' }], skill: 'markovnikov' },
  { id: '02-alkene-hydration', title: 'Acid-catalysed hydration of 1-methylcyclohexene', reagent: 'H₂O, H₂SO₄ (cat.)', cards: ['alkene-hydration'], lesson: [{ id: '09', step: 's11' }], skill: 'markovnikov' },
  { id: '03-alkene-x2', title: 'Br₂ adds to cyclohexene', reagent: 'Br₂ in CH₂Cl₂', cards: ['alkene-x2'], lesson: [{ id: '10', step: 's04' }], skill: 'stereo-addition' },
  { id: '04-alkene-h2-pd', title: 'H₂ on Pd/C: syn addition to 1,2-dimethylcyclohexene', reagent: 'H₂, Pd/C', cards: ['alkene-h2-pd'], lesson: [{ id: '10', step: 's06' }], skill: 'stereo-addition' },
  { id: '05-alkene-epoxide', title: 'Peroxyacid epoxidation of (E)-but-2-ene', reagent: 'RCO₃H', cards: ['alkene-epoxide'], lesson: [{ id: '10', step: 's09' }], skill: 'stereo-addition' },
  { id: '06-alkene-kmno4-cold', title: 'Cold basic KMnO₄: syn diol from cyclohexene', reagent: 'KMnO₄, OH⁻, H₂O (cold)', cards: ['alkene-kmno4-base'], lesson: [{ id: '10', step: 's12' }], skill: 'alkene-oxidation' },
  { id: '07-alkene-hydroboration', title: 'Hydroboration–oxidation of 1-methylcyclohexene', reagent: 'BH₃·THF, then H₂O₂, NaOH', cards: ['alkene-hydroboration'], lesson: [], skill: 'stereo-addition' },
  { id: '08-alkyne-hx', title: 'HBr adds to hex-1-yne, once and twice', reagent: 'HBr (1 equiv., then 2)', cards: ['alkyne-hx-1', 'alkyne-hx-2'], lesson: [{ id: '12', step: 's07' }], skill: 'alkynes' },
  { id: '09-alkyne-hydration', title: 'Hg²⁺-catalysed hydration of hex-1-yne', reagent: 'H₂O, H₂SO₄, HgSO₄', cards: ['alkyne-hydration'], lesson: [{ id: '12', step: 's09' }], skill: 'alkynes' },
  { id: '10-alkyne-lindlar', title: 'H₂ with the Lindlar catalyst: but-2-yne to the cis alkene', reagent: 'H₂, Lindlar catalyst', cards: ['alkyne-lindlar'], lesson: [{ id: '12', step: 's11' }], skill: 'alkynes' },
  { id: '11-alkyne-acetylide', title: 'Acetylide: NaNH₂ deprotonates propyne, then SN2 on CH₃Br', reagent: 'NaNH₂, then CH₃Br', cards: ['alkyne-acetylide'], lesson: [{ id: '12', step: 's15' }], skill: 'acetylides' },
  { id: '12-eas-bromination', title: 'Bromination of benzene: Br₂ with FeBr₃', reagent: 'Br₂, FeBr₃', cards: ['eas-bromination'], lesson: [{ id: '13', step: 's06' }], skill: 'eas' },
  { id: '13-eas-nitration', title: 'Nitration of benzene: HNO₃ with H₂SO₄', reagent: 'HNO₃, H₂SO₄', cards: ['eas-nitration'], lesson: [{ id: '13', step: 's10' }], skill: 'eas' },
  { id: '14-fc-acylation', title: 'Friedel–Crafts acylation: acetophenone from benzene', reagent: 'CH₃COCl, AlCl₃', cards: ['fc-acylation'], lesson: [{ id: '13', step: 's17' }], skill: 'eas' },
  { id: '15-directors', title: 'Directors: why –OCH₃ sends E⁺ ortho/para and –NO₂ sends it meta', reagent: 'E⁺ (here Br⁺)', cards: ['director-activating', 'director-meta'], lesson: [{ id: '14', step: 's04' }, { id: '14', step: 's05' }], skill: 'directors' },
  { id: '16-diels-alder', title: 'Diels–Alder: penta-1,3-diene + acrolein', reagent: 'acrolein, heat', cards: ['diels-alder'], lesson: [], skill: 'dienes' },
  { id: '17-hcl-ethylene', title: 'HCl adds to ethylene: the model polar reaction', reagent: 'HCl', cards: [], primer: true, lesson: [{ id: '08', step: 's17' }, { id: '08', step: 's13' }], skill: 'mechanism' },
  { id: '18-arrow-grammar', title: 'Arrow grammar: the three legal arrows, one simple case each', reagent: 'none (three cases, one arrow each)', cards: [], primer: true, lesson: [{ id: '08', step: 's06' }], skill: 'curved-arrows' },
  { id: '19-carbocation', title: 'The carbocation: a flat + carbon and its empty p orbital', reagent: 'Cl⁻', cards: [], primer: true, lesson: [{ id: '08', step: 's15' }], skill: 'carbocations' },
  { id: '20-alkene-kmno4-hot', title: 'Hot, acidic KMnO₄: how it attaches and how it cleaves', reagent: 'KMnO₄, H₃O⁺, heat', cards: ['alkene-kmno4-acid'], lesson: [{ id: '10', step: 's13' }], skill: 'alkene-oxidation' }
];

export const SCENE_BY_ID = Object.fromEntries(SCENES.map((s) => [s.id, s]));
/** "alkene-hx" -> "01-alkene-hx"; also accepts the full id. null when there is no such scene. */
export function sceneId(any) {
  const k = String(any || '');
  if (SCENE_BY_ID[k]) return k;
  const s = SCENES.find((x) => x.id.slice(3) === k);
  return s ? s.id : null;
}
export const shortId = (id) => String(id).replace(/^\d\d-/, '');
export const sceneNumber = (id) => Number(String(id).slice(0, 2));
/** hub card id -> scene id (a card with no scene is absent) */
export const CARD_SCENE = Object.fromEntries(SCENES.flatMap((s) => s.cards.map((c) => [c, s.id])));
/** "09/s08" -> scene id, for the "Watch the scene" button on a lesson step */
export const STEP_SCENE = Object.fromEntries(SCENES.flatMap((s) => s.lesson.map((l) => [`${l.id}/${l.step}`, s.id])));
export const sceneForStep = (lesson, step) => STEP_SCENE[`${lesson}/${step}`] || null;
export const sceneForCard = (card) => CARD_SCENE[card] || null;
export function neighbours(id) {
  const i = SCENES.findIndex((s) => s.id === id);
  return { prev: i > 0 ? SCENES[i - 1].id : null, next: i >= 0 && i < SCENES.length - 1 ? SCENES[i + 1].id : null };
}
