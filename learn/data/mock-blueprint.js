// Mock midterm blueprint (#mock): the sections of the paper, how many questions each has, what each is worth, and which generators feed it.
// The default paper mirrors the in-scope workbook mix (see data/pastpaper.js): A1, A2, A3, A5 (HBr addition), B1, B2, B3, B4, B6.
//   count, marks   defaults for the editable blueprint (marks are PER QUESTION)
//   instruction    the exam-style wording shown above the section (the workbook's own phrasing, see the `ask` strings of data/pastpaper.js)
//   note           optional one line about how a question is answered on screen (the workbook draws; here you pick or type)
//   feeds          the generators behind the section, each with an optional `skill` (passed to the generator to pick its task family: `directors` is the classify / position / product family, not the slow synthesis planner) and a weight w (a section of n questions splits n between its feeds in proportion to w)
//                  and `skills`: the weak-spot skill ids that feed can produce (the weighting reads these; tests/mock.mjs checks every generated question's skill is listed)
//   skills         the union of the feeds' skills (the section's weak-spot score is the sum over these)
// A feed is { gen, w, skills, settings?, pick? }. `pick: 'hbr'` is the special A5 feed (HBr on an alkene whose product has a stereocentre or ring stereo).
// Pure data: engine/mock.js builds papers from it; nothing here touches the DOM or the store.

/** naming-levels settings shared by A1 and B1: every class, stereo anywhere, any mix of substituents, either IUPAC style accepted. */
const NAME_BASE = { difficulty: '', classes: ['alkane', 'cycloalkane', 'halide', 'alkene', 'cycloalkene', 'alkyne', 'mixed'], length: 'c10', subs: ['one', 'two', 'three'], complex: 'any', halogens: 'any', stereo: 'any', style: 'either', traps: [], count: 10, timer: 0 };
export const NAME_TYPE = { ...NAME_BASE, qtypes: ['type'] };
export const NAME_FIX = { ...NAME_BASE, qtypes: ['fix'] };

export const SECTIONS = [
  {
    id: 'A1', title: 'Naming', count: 4, marks: 2,
    instruction: 'Give the IUPAC name of each compound. Include (E)/(Z), (R)/(S) or cis/trans wherever the structure needs it.',
    feeds: [{ gen: 'naming-levels', w: 1, settings: NAME_TYPE, skills: ['naming-levels'] }]
  },
  {
    id: 'A2', title: 'Stereochemistry', count: 5, marks: 2,
    instruction: 'Assign R or S, name the stereoisomer, and say how each pair is related (identical, enantiomers, diastereomers) or whether a compound is chiral, achiral or meso.',
    feeds: [
      { gen: 'rs', w: 2, skills: ['chirality', 'rs'] },
      { gen: 'stereo-relationships', w: 2, skills: ['stereo-relationships', 'meso', 'racemates'] },
      { gen: 'stereo-projections', w: 1, skills: ['stereo-projections'] }
    ]
  },
  {
    id: 'A3', title: 'Conformations and chairs', count: 3, marks: 3,
    instruction: 'Decide which chair or conformation is the more stable and why, or work out the energy.',
    feeds: [{ gen: 'chairs', w: 1, skills: ['chairs', 'conformations'] }]
  },
  {
    id: 'A5', title: 'HBr addition', count: 1, marks: 4,
    instruction: 'Draw, with stereochemistry, the major product(s) when HBr adds to the alkene.',
    note: 'Pick the drawing that matches your answer. A flat drawing stands for both enantiomers when the product is a racemic pair.',
    feeds: [{ gen: 'predict-product', w: 1, pick: 'hbr', skills: ['predict-product'] }]
  },
  {
    id: 'B1', title: 'Fix the name', count: 1, marks: 2,
    instruction: 'The name given for this compound is wrong. Write the correct IUPAC name.',
    feeds: [{ gen: 'naming-levels', w: 1, settings: NAME_FIX, skills: ['naming-levels'] }]
  },
  {
    id: 'B2', title: 'Aromaticity', count: 2, marks: 2,
    instruction: 'Count the π electrons of each ring and decide whether it is aromatic, anti-aromatic or not aromatic (Hückel’s rule).',
    feeds: [{ gen: 'huckel', w: 1, skills: ['aromaticity'] }]
  },
  {
    id: 'B3', title: 'Reactions', count: 8, marks: 3,
    instruction: 'Write the structure of the major product. Indicate stereochemistry where necessary.',
    note: 'Pick the drawing (or the reagent) that matches your answer.',
    feeds: [
      { gen: 'predict-product', w: 5, skills: ['predict-product'] },
      { gen: 'guess-reagent', w: 3, skills: ['guess-reagent'] }
    ]
  },
  {
    id: 'B4', title: 'Directors and resonance', count: 3, marks: 3,
    instruction: 'Use resonance and directing effects to decide where the electrophile attacks, and why the ring is more or less reactive.',
    feeds: [
      { gen: 'directors', w: 2, skill: 'directors', skills: ['directors'] },
      { gen: 'resonance', w: 1, skills: ['resonance', 'dienes'] }
    ]
  },
  {
    id: 'B6', title: 'Stereocontrol', count: 2, marks: 4,
    instruction: 'Predict the products and indicate any appropriate stereochemistry: major and minor, racemic or single isomer.',
    feeds: [
      { gen: 'stereo-outcome', w: 1, skills: ['stereo-outcome'] },
      { gen: 'two-step', w: 1, skills: ['two-step'] }
    ]
  }
];
SECTIONS.forEach((s) => { s.skills = [...new Set(s.feeds.flatMap((f) => f.skills))]; });
export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
export const SECTION_IDS = SECTIONS.map((s) => s.id);

export const DEFAULT_MINUTES = 90;
/** Limits of the editable blueprint. */
export const LIMITS = { count: [0, 15], marks: [1, 10], minutes: [10, 180], minuteStep: 5, weightBand: 0.5 };

/** Presets: counts per section (a section not listed has 0 questions); marks stay at their defaults. */
export const PRESETS = [
  { id: 'full', label: 'Full paper (90 min)', minutes: 90, counts: Object.fromEntries(SECTIONS.map((s) => [s.id, s.count])) },
  { id: 'half', label: 'Half paper (45 min)', minutes: 45, counts: { A1: 2, A2: 3, A3: 2, A5: 1, B1: 1, B2: 1, B3: 4, B4: 2, B6: 1 } },
  { id: 'reactions', label: 'Reactions only', minutes: 45, counts: { A5: 1, B3: 10, B6: 3 } },
  { id: 'stereo-naming', label: 'Stereo and naming only', minutes: 50, counts: { A1: 5, A2: 6, A3: 3, B1: 2 } }
];
export const PRESET_BY_ID = Object.fromEntries(PRESETS.map((p) => [p.id, p]));
