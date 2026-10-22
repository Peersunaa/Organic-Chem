// Mastery / practice generator "eas-basics" (Lesson 13, McMurry 5.1 to 5.5). Every answer comes from engine/reactions-aromatic.js and engine/naming-arene.js
// (products proven against Python RDKit by tools/check_eas.py, names against OPSIN), never from typed tables. Fresh problems each run.
// Tasks:
//   product      : reagent -> product (choose among four drawn answers: substitution, addition, another reagent's product, two groups)
//   reagent      : product -> reagent
//   electrophile : which species is the electrophile for these reagents?
//   fc           : the Friedel-Crafts trap: which of these four reactions will work?   (skill eas)
//   name         : name a mono- or disubstituted benzene, typed, either style accepted            (skill aromatic-naming)
//   tap          : tap the ortho / meta / para carbons with the ring-position widget            (skill aromatic-naming)
import { LAB_EAS, EAS, predictEAS, easChoices, easRightWhy, EAS_HINTS, labLabel, halideText, BENZENE, generationOf } from './reactions-aromatic.js';
import { SUB, buildArene, nameBothArene, ringLayout } from './naming-arene.js';
import { normName } from './naming.js';
import { resolveTasks } from './task-list.js';

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const LETTERS = 'ABCD';
const nm = (smi) => { const n = nameBothArene(smi); return n ? n.new : smi; };
const CATION = { CCl: 'CH₃⁺', CCCl: 'CH₃CH₂⁺', 'CC(C)Cl': '(CH₃)₂CH⁺', 'CC(C)(C)Cl': '(CH₃)₃C⁺', 'CC(=O)Cl': 'CH₃C≡O⁺', 'CCC(=O)Cl': 'CH₃CH₂C≡O⁺' };
/** Name of the electrophile for a lab entry (the specific cation for Friedel-Crafts). */
export const electrophileText = (x) => (x.reagent === 'RCl' || x.reagent === 'RCOCl' ? CATION[x.halide] : EAS[x.reagent].Elabel);

// ---------------------------------------------------------------- 1. reagent -> product
function productProblem(rng) {
  const x = pick(rng, LAB_EAS);
  const pred = predictEAS(BENZENE, x.reagent, x.halide || null);
  const ch = shuffle(rng, easChoices(pred, rng));
  const opts = ch.map((o, i) => ({ smiles: o.smiles[0], text: 'Option ' + LETTERS[i], correct: o.correct, why: o.why, kind: o.kind }));
  return {
    kind: 'choice', skill: 'eas', smiles: null, equation: { reactants: [BENZENE], products: [], cond: labLabel(x) },
    prompt: `Benzene reacts with ${labLabel(x)}. What is the monosubstituted product?`,
    options: opts, answer: opts.find((o) => o.correct).text,
    reaction: x.id, reagent: x.reagent, halide: x.halide || null, product: pred.product,
    derive: `${easRightWhy(pred).replace(/^Yes\. /, '')} (${nm(pred.product)}).`,
    hints: EAS_HINTS
  };
}

// ---------------------------------------------------------------- 2. product -> reagent
function reagentProblem(rng) {
  const x = pick(rng, LAB_EAS);
  const pred = predictEAS(BENZENE, x.reagent, x.halide || null);
  const others = shuffle(rng, LAB_EAS.filter((y) => predictEAS(BENZENE, y.reagent, y.halide || null).product !== pred.product && labLabel(y) !== labLabel(x)));
  const set = [x, ...others.filter((y, i, arr) => arr.findIndex((z) => labLabel(z) === labLabel(y)) === i).slice(0, 3)];
  const opts = shuffle(rng, set).map((y) => {
    const py = predictEAS(BENZENE, y.reagent, y.halide || null);
    return {
      text: labLabel(y), correct: y === x,
      why: y === x ? `Yes. ${labLabel(y)} makes ${electrophileText(y)}, the electrophile that puts ${nm(pred.product)}’s group on the ring.` : `${labLabel(y)} makes ${electrophileText(y)}, which puts a different group on the ring: it gives ${nm(py.product)}, not ${nm(pred.product)}.`
    };
  });
  return {
    kind: 'choice', skill: 'eas', smiles: null, equation: { reactants: [BENZENE], products: [pred.product], cond: '?' },
    prompt: `Which reagents turn benzene into ${nm(pred.product)}?`,
    options: opts, answer: opts.find((o) => o.correct).text,
    reaction: x.id, reagent: x.reagent, halide: x.halide || null, product: pred.product,
    derive: `${labLabel(x)} makes ${electrophileText(x)}, the electrophile that puts the group of ${nm(pred.product)} on the ring.`,
    hints: ['Look at the group on the ring in the product: which electrophile would put that group on? (Br⁺, Cl⁺, I⁺, NO₂⁺, HSO₃⁺, a carbocation R⁺ or an acylium RC≡O⁺.)', 'Then pick the reagent mixture that makes that electrophile: X₂ with the matching Lewis acid, HNO₃ with H₂SO₄, SO₃ with H₂SO₄, an alkyl chloride with AlCl₃, an acid chloride with AlCl₃.']
  };
}

// ---------------------------------------------------------------- 3. the electrophile
function electrophileProblem(rng) {
  const x = pick(rng, LAB_EAS);
  const E = electrophileText(x);
  const pool = [...new Set(LAB_EAS.map(electrophileText))].filter((e) => e !== E);
  const set = shuffle(rng, [E, ...shuffle(rng, pool).slice(0, 3)]);
  const who = (e) => LAB_EAS.find((y) => electrophileText(y) === e);
  const opts = set.map((e) => ({
    text: e, correct: e === E,
    why: e === E ? `Yes. ${labLabel(x)} generates ${E}: ${generationOf(x.reagent, x.halide || null).text}` : `${e} is the electrophile of ${labLabel(who(e))}, not of ${labLabel(x)}.`
  }));
  return {
    kind: 'choice', skill: 'eas', smiles: null,
    prompt: `Benzene reacts with ${labLabel(x)}. Which species is the electrophile that the ring’s π electrons attack?`,
    options: opts, answer: E, reaction: x.id, reagent: x.reagent, halide: x.halide || null,
    derive: `${generationOf(x.reagent, x.halide || null).text} The ring attacks ${E}.`,
    hints: ['The electrophile is the positive species made from the reagent mixture by the catalyst or the acid. The ring’s π electrons attack it.', 'Halogens make X⁺ (with FeX₃), HNO₃ with H₂SO₄ makes NO₂⁺, SO₃ with H₂SO₄ makes HSO₃⁺, R–Cl with AlCl₃ makes R⁺, RCOCl with AlCl₃ makes the acylium ion RC≡O⁺.']
  };
}

// ---------------------------------------------------------------- 4. the Friedel-Crafts trap
const BAD_RINGS = [['O=[N+]([O-])c1ccccc1', 'nitrobenzene'], ['N#Cc1ccccc1', 'benzonitrile'], ['OS(=O)(=O)c1ccccc1', 'benzenesulfonic acid'], ['CC(=O)c1ccccc1', 'acetophenone']];
function fcProblem(rng) {
  const good = pick(rng, LAB_EAS.filter((x) => x.reagent === 'RCl' || x.reagent === 'RCOCl'));
  const goodPred = predictEAS(BENZENE, good.reagent, good.halide);
  const bads = [];
  const ring = pick(rng, BAD_RINGS), ring2 = pick(rng, BAD_RINGS.filter((r) => r !== ring));
  const hal = () => pick(rng, ['CCl', 'CCCl', 'CC(=O)Cl']);
  const h1 = hal();
  bads.push({ arene: ring[0], reagent: h1 === 'CC(=O)Cl' ? 'RCOCl' : 'RCl', halide: h1, text: `${ring[1]} + ${halideText(h1)}, AlCl₃` });
  if (rng() < 0.5) bads.push({ arene: ring2[0], reagent: 'RCl', halide: 'CCCl', text: `${ring2[1]} + CH₃CH₂Cl, AlCl₃` });
  bads.push({ arene: BENZENE, reagent: 'RCl', halide: 'Clc1ccccc1', text: 'benzene + chlorobenzene, AlCl₃' });
  bads.push({ arene: BENZENE, reagent: 'RCl', halide: 'C=CCl', text: 'benzene + CH₂=CHCl (vinyl chloride), AlCl₃' });
  const chosen = shuffle(rng, bads).slice(0, 3);
  const opts = shuffle(rng, [
    { text: `benzene + ${halideText(good.halide)}, AlCl₃`, correct: true, why: `Yes. ${halideText(good.halide)} is ${good.reagent === 'RCl' ? 'an alkyl halide' : 'an acid chloride'} and the ring is benzene, so AlCl₃ makes ${electrophileText(good)} and the ring attacks it: ${nm(goodPred.product)}.` },
    ...chosen.map((b) => { const p = predictEAS(b.arene, b.reagent, b.halide); return { text: b.text, correct: false, why: p.ok ? 'This one works.' : p.why }; })
  ]);
  return {
    kind: 'choice', skill: 'eas', smiles: null,
    prompt: 'Friedel–Crafts reactions have limits. Only ONE of these will work. Which?',
    options: opts, answer: opts.find((o) => o.correct).text, reaction: good.id,
    derive: `Friedel–Crafts needs an alkyl halide (or an acid chloride) and a ring that is not deactivated. Aryl and vinylic halides do not give carbocations, and a ring that carries –NO₂, –C≡N, –SO₃H or –COR is too unreactive. Benzene with ${halideText(good.halide)} works.`,
    hints: ['Check the halide first: it must be an alkyl halide (Cl on a saturated carbon) or an acid chloride. Then check the ring: it must not carry –NO₂, –C≡N, –SO₃H or –COR.', 'Chlorobenzene and vinyl chloride have the Cl on an sp² carbon, so no carbocation forms. Nitrobenzene, benzonitrile, benzenesulfonic acid and acetophenone are rings with deactivating groups.']
  };
}

// ---------------------------------------------------------------- 5. naming
const FRIENDLY = ['F', 'Cl', 'Br', 'I', 'NO2', 'NH2', 'OH', 'CH3', 'Et', 'CHO', 'COOH', 'CN', 'SO3H', 'tBu'];
const MONO = ['F', 'Cl', 'Br', 'I', 'NO2', 'NH2', 'OH', 'CH3', 'Et', 'Pr', 'iPr', 'tBu', 'CHO', 'COOH', 'CN', 'SO3H', 'Ac'];
const REL_POS = { ortho: 1, meta: 2, para: 3 };
/** A random mono- or disubstituted benzene: {smiles, groups:{pos:key}, rel?}. */
export function randomArene(rng, kind = null) {
  const k = kind || (rng() < 0.4 ? 'mono' : 'di');
  if (k === 'mono') { const g = pick(rng, MONO); return { smiles: buildArene({ 0: g }), groups: { 0: g } }; }
  for (let t = 0; t < 50; t++) {
    const a = pick(rng, FRIENDLY), b = pick(rng, FRIENDLY), rel = pick(rng, ['ortho', 'meta', 'para']);
    const smiles = buildArene({ 0: a, [REL_POS[rel]]: b });
    if (nameBothArene(smiles)) return { smiles, groups: { 0: a, [REL_POS[rel]]: b }, rel, a, b };
  }
  throw new Error('no arene');
}
/** Diagnosis of a typed name: if it names the ortho / meta / para isomer of the same two groups, say so. */
function diagnoseName(spec) {
  return (raw) => {
    const t = normName(raw);
    if (spec.rel) {
      for (const rel of ['ortho', 'meta', 'para']) {
        if (rel === spec.rel) continue;
        const other = buildArene({ 0: spec.a, [REL_POS[rel]]: spec.b });
        const nb = nameBothArene(other);
        if (nb && (normName(nb.new) === t || normName(nb.old) === t)) return `That name is for the ${rel} isomer (the groups are ${rel === 'ortho' ? '1,2' : rel === 'meta' ? '1,3' : '1,4'} to each other). Count the ring carbons between the two groups here: ortho = next to each other (1,2), meta = one carbon between (1,3), para = opposite (1,4).`;
      }
    }
    const tn = t.replace(/^[omp]/, '');
    if (/^(o|m|p)/.test(t) && !spec.rel) return 'A monosubstituted benzene needs no o, m or p: those prefixes describe the relationship of TWO groups. Name the one group and add -benzene (or use the special name: toluene, phenol, aniline, benzoic acid ...).';
    return null;
  };
}
function nameProblem(rng) {
  const spec = randomArene(rng);
  const nb = nameBothArene(spec.smiles);
  const accept = [...new Set([nb.old])].filter((x) => x !== nb.new);
  const sy = (k) => SUB[k].label;
  return {
    kind: 'input', skill: 'aromatic-naming', smiles: spec.smiles, highlight: [], name: true,
    prompt: spec.rel ? 'Name this disubstituted benzene. Either style is accepted: numbers (1,2 / 1,3 / 1,4) or o-, m-, p-. Spaces, capitals and hyphens do not matter.' : 'Name this monosubstituted benzene. Use the special name when there is one (toluene, phenol, aniline, benzoic acid, benzaldehyde, acetophenone, benzonitrile).',
    answer: nb.new, accept,
    diagnoseFn: diagnoseName(spec),
    fallback: 'That is not the name I get. Name the group (or groups) in alphabetical order, with -benzene as the parent, or the special parent name (phenol, aniline, benzoic acid, toluene …) when its group is present. For two groups give o/m/p or the numbers 1,2 / 1,3 / 1,4.',
    derive: spec.rel
      ? `The groups are ${spec.rel} to each other (${spec.rel === 'ortho' ? '1,2' : spec.rel === 'meta' ? '1,3' : '1,4'}). Name: ${nb.new}${nb.old !== nb.new ? ` (or ${nb.old})` : ''}.`
      : `One group on the ring: ${nb.new}${nb.old !== nb.new ? ` (or ${nb.old})` : ''}.`,
    hints: spec.rel
      ? ['First decide the relationship of the two groups: next to each other (ortho, 1,2), one carbon between (meta, 1,3) or opposite (para, 1,4).', 'List the group names in alphabetical order before -benzene (or use the special parent name such as phenol or benzoic acid, whose group is then carbon 1). Use o-/m-/p- or the numbers.']
      : ['Name the group and add -benzene. A few groups have a special name for the whole molecule: –CH₃ toluene, –OH phenol, –NH₂ aniline, –CO₂H benzoic acid, –CHO benzaldehyde, –COCH₃ acetophenone, –C≡N benzonitrile.', `Here the group is ${sy(spec.groups[0])}. Write its name in front of benzene (or use the special name).`]
  };
}

// ---------------------------------------------------------------- 6. ortho / meta / para taps
function tapProblem(rng) {
  const spec = randomArene(rng, rng() < 0.7 ? 'mono' : 'di');
  const L = ringLayout(spec.smiles);
  const ref = L.subs[0].pos;
  const task = pick(rng, ['ortho', 'meta', 'para']);
  const lab = L.labels[ref].text;
  return {
    kind: 'widget', widget: 'ring-position', skill: 'aromatic-naming', smiles: null,
    prompt: `Tap the ${task} carbon${task === 'para' ? '' : 's'} relative to the ${lab} group.`,
    config: { smiles: spec.smiles, ref, tasks: [task] },
    ring: spec.smiles, ref, task,
    derive: `Counting round the ring from the carbon that carries ${lab}: ortho = next door (1,2), meta = one in between (1,3), para = directly opposite (1,4). Here there ${task === 'para' ? 'is one para carbon' : 'are two ' + task + ' carbons, one each side'}.`,
    hints: ['Start at the carbon that carries the outlined group. The ortho carbons are its two neighbours on the ring.', 'Meta carbons are the next ones round (one carbon between them and the group); the para carbon is straight across the ring, three bonds away.']
  };
}

const TASKS = { product: productProblem, reagent: reagentProblem, electrophile: electrophileProblem, fc: fcProblem, name: nameProblem, tap: tapProblem };
const BY_SKILL = { eas: ['product', 'reagent', 'electrophile', 'fc'], 'aromatic-naming': ['name', 'tap'] };
export const EAS_SKILLS = Object.keys(BY_SKILL);
export const EAS_TASKS = Object.keys(TASKS);
export function makeEasProblem(rng, task) {
  const f = TASKS[task];
  if (!f) throw new Error('unknown task ' + task);
  return f(rng);
}
export function generateEas(count, { skill = null, rng = Math.random, tasks: only = null } = {}) {
  const tasks = resolveTasks(only, skill && BY_SKILL[skill] ? BY_SKILL[skill] : EAS_TASKS, TASKS);
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeEasProblem(rng, pick(rng, tasks)); tries++; } while (last && JSON.stringify([p.prompt, p.config, p.smiles]) === last && tries < 8);
    last = JSON.stringify([p.prompt, p.config, p.smiles]);
    out.push(p);
  }
  return out;
}
