// Mastery generator "shape-basic" (Lesson 02). Every answer is computed from RDKit atom/bond data
// and the electronegativity table in chem.js; nothing is hand-typed per molecule.
import { analyze, ENEG, NAME, bondClass, groupCount, hybridOf, sigmaPi } from './chem.js';

export const SHAPE_POOL = ['CC', 'C=C', 'C#C', 'C=O', 'CO', 'CN', 'CC#N', 'C=CC', 'O=C=O', 'CCl', 'C[Li]', 'CC(=O)O', 'CC=O'];
const MINUS = '−';
const HYB_LABEL = { sp3: 'sp³', sp2: 'sp²', sp: 'sp' };
const ANGLE = { sp3: 109.5, sp2: 120, sp: 180 };
const GLYPH = { 1: '–', 2: '=', 3: '≡' };
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const round2 = (x) => Math.round(x * 100) / 100;
const hasPi = (smi) => analyze(smi).bonds.some((b) => (b.bo ?? 1) > 1);

/** Everything bonded to atom a, e.g. "H, H, H, Li" (implicit H listed first). */
function nbrList(info, a) {
  const syms = Array(a.impH).fill('H').concat(a.nbrs.map((j) => info.atoms[j].sym));
  return syms.join(', ');
}
function groupsText(info, a) {
  const g = groupCount(a);
  return `This C is bonded to ${a.nbrs.length + a.impH} atoms (${nbrList(info, a)}) and has ${a.lp} lone pairs: ${a.nbrs.length + a.impH} + ${a.lp} = ${g} electron groups`;
}

function hybProblem(rng, smi) {
  const info = analyze(smi);
  const a = pick(rng, info.atoms.filter((x) => x.sym === 'C'));
  const right = hybridOf(a);
  return {
    kind: 'choice', skill: 'hybridization', smiles: smi, highlight: [a.idx],
    prompt: 'What is the hybridization of the highlighted carbon?',
    options: ['sp3', 'sp2', 'sp'].map((h) => ({
      text: HYB_LABEL[h], correct: h === right,
      why: h === right ? `Yes: ${groupsText(info, a)}, so ${HYB_LABEL[h]}.` : `${groupsText(info, a)}. That points to ${HYB_LABEL[right]}, not ${HYB_LABEL[h]} (4 groups = sp³, 3 = sp², 2 = sp).`
    })),
    answer: HYB_LABEL[right],
    derive: `${groupsText(info, a)}. 4 groups = sp³, 3 = sp², 2 = sp, so this carbon is ${HYB_LABEL[right]}.`,
    hints: ['Count what surrounds the carbon: every atom bonded to it (a double bond is still ONE neighbour) plus lone pairs.', '4 groups = sp³, 3 groups = sp², 2 groups = sp.']
  };
}

function angleProblem(rng, smi) {
  const info = analyze(smi);
  const a = pick(rng, info.atoms.filter((x) => x.sym === 'C'));
  const right = hybridOf(a);
  return {
    kind: 'choice', skill: 'hybridization', smiles: smi, highlight: [a.idx],
    prompt: 'About what bond angle do you expect around the highlighted carbon?',
    options: ['sp3', 'sp2', 'sp'].map((h) => ({
      text: ANGLE[h] + '°', correct: h === right,
      why: h === right ? `Yes: ${groupsText(info, a)}, so ${HYB_LABEL[h]} and about ${ANGLE[h]}°.` : `${groupsText(info, a)}, so ${HYB_LABEL[right]} and about ${ANGLE[right]}°, not ${ANGLE[h]}° (that is the ${HYB_LABEL[h]} angle).`
    })),
    answer: ANGLE[right] + '°',
    derive: `${groupsText(info, a)}: ${HYB_LABEL[right]}, so the bonds spread to about ${ANGLE[right]}° (sp³ 109.5°, sp² 120°, sp 180°).`,
    hints: ['First find the hybridization: count atoms bonded to the carbon plus lone pairs.', 'sp³ gives 109.5°, sp² gives 120°, sp gives 180°.']
  };
}

function sigmaProblem(rng, smi) {
  const info = analyze(smi);
  const { sigma, pi } = sigmaPi(info);
  const nH = info.atoms.reduce((s, a) => s + a.impH, 0);
  return {
    kind: 'input', skill: 'sigma-pi', smiles: smi, highlight: [],
    prompt: 'How many σ bonds does this molecule have? (Count every bond, including each bond to H.)',
    answer: sigma,
    derive: `Each bond (single, double or triple) contains exactly one σ bond. ${info.bonds.length} bond${info.bonds.length === 1 ? '' : 's'} between non-H atoms + ${nH} bond${nH === 1 ? '' : 's'} to H = ${sigma}.`,
    wrong: pi > 0 ? [{ match: sigma + pi, why: `${sigma + pi} counts every line in the drawing. In a double bond only one line is σ and the other is π, and a triple bond is 1 σ + 2 π. Count one σ per bond.` }] : [{ match: sigma - nH, why: `${sigma - nH} leaves out the bonds to H. Every C–H bond is a σ bond too.` }].filter((w) => w.match !== sigma),
    hints: ['A σ bond is the first bond between any two bonded atoms.', 'Count every bonded pair once, including each H. Extra lines in a double or triple bond are π.']
  };
}

function piProblem(rng, smi) {
  const info = analyze(smi);
  const { sigma, pi } = sigmaPi(info);
  const mult = info.bonds.filter((b) => (b.bo ?? 1) > 1).map((b) => `${info.atoms[b.atoms[0]].sym}${GLYPH[b.bo]}${info.atoms[b.atoms[1]].sym} (${b.bo - 1} π)`);
  return {
    kind: 'input', skill: 'sigma-pi', smiles: smi, highlight: [],
    prompt: 'How many π bonds does this molecule have?',
    answer: pi,
    derive: `π bonds are the extra bonds beyond the first one in each multiple bond: ${mult.join(' + ')} = ${pi}.`,
    wrong: [{ match: sigma, why: `${sigma} is the σ count. π bonds appear only as the 2nd (and 3rd) bond of a double (or triple) bond.` }, { match: pi + 1, why: 'Subtract the σ bond: a double bond is 1 σ + 1 π, a triple bond 1 σ + 2 π.' }].filter((w, i, arr) => w.match !== pi && arr.findIndex((v) => v.match === w.match) === i),
    hints: ['Single bonds have no π bond. Look for double and triple bonds.', 'Double = 1 π, triple = 2 π. Add them up.']
  };
}

/** All bond "types" in a molecule: element pair + order, with ΔEN. H bonds included. */
export function bondTypes(smi) {
  const info = analyze(smi);
  const seen = new Map();
  const add = (x, y, bo, a, b) => {
    const key = [x, y].sort().join('') + bo;
    if (seen.has(key)) return;
    const diff = round2(Math.abs(ENEG[x] - ENEG[y]));
    seen.set(key, { key, a: x, b: y, bo, diff, atoms: [a, b], label: `${x}${GLYPH[bo]}${y}` });
  };
  info.bonds.forEach((bd) => { const [i, j] = bd.atoms; add(info.atoms[i].sym, info.atoms[j].sym, bd.bo ?? 1, i, j); });
  info.atoms.forEach((a) => { if (a.impH) add(a.sym, 'H', 1, a.idx, 'H'); });
  return [...seen.values()];
}

function polar2Pairs() {
  const out = [];
  for (const smi of SHAPE_POOL) {
    const t = bondTypes(smi);
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) {
      const hi = Math.max(t[i].diff, t[j].diff), lo = Math.min(t[i].diff, t[j].diff);
      if (hi >= 0.5 && round2(hi - lo) >= 0.4) out.push({ smi, x: t[i], y: t[j] });
    }
  }
  return out;
}

function polar2Problem(rng) {
  const c = pick(rng, polar2Pairs());
  const [first, second] = shuffle(rng, [c.x, c.y]);
  const right = first.diff > second.diff ? first : second;
  const other = right === first ? second : first;
  const calc = (t) => `${t.label}: ${t.a} ${ENEG[t.a]}, ${t.b} ${ENEG[t.b]}, ΔEN = ${t.diff}`;
  return {
    kind: 'choice', skill: 'polarity', smiles: c.smi, highlight: [],
    prompt: `Which bond is more polar: ${first.label} or ${second.label}?`,
    options: [first, second].map((t) => ({
      text: t.label, correct: t === right,
      why: t === right ? `Yes. ${calc(t)} is the bigger gap (${calc(other)}).` : `${calc(t)}, but ${calc(right)} is bigger. The larger the difference in electronegativity, the more polar the bond.`
    })),
    answer: right.label,
    derive: `Polarity follows the electronegativity difference. ${calc(first)}; ${calc(second)}. So ${right.label} is more polar.`,
    hints: ['Look up the electronegativity of the two atoms in each bond (H 2.1, C 2.5, N 3.0, O 3.5, Cl 3.0, Li 1.0).', 'Subtract the two values for each bond. The bigger difference is the more polar bond.']
  };
}

function deltaProblem(rng, smi) {
  const info = analyze(smi);
  const polar = bondTypes(smi).filter((t) => bondClass(t.diff) === 'polar');
  const t = pick(rng, polar);
  // t.atoms = [i, j|'H']; randomly swap sides so the answer is not always on the left
  let [x, y] = t.atoms;
  if (rng() < 0.5) [x, y] = [y, x];
  const A = x === 'H' ? 'H' : info.atoms[x].sym, B = y === 'H' ? 'H' : info.atoms[y].sym;
  const lo = ENEG[A] < ENEG[B] ? A : B, hi = lo === A ? B : A;
  const clue = lo === 'Li' || lo === 'Mg' ? ` A metal like ${NAME[lo]} gives electrons away inductively, so carbon is the δ${MINUS} end.` : '';
  return {
    kind: 'polarity', skill: 'polarity', smiles: smi, highlight: [x, y].filter((v) => typeof v === 'number'),
    prompt: `Tap the δ${MINUS} atom of the ${A}${GLYPH[t.bo]}${B} bond.`,
    config: { smiles: smi, bonds: [{ a: x, b: y }], showTable: true },
    answer: hi,
    derive: `${A} ${ENEG[A]} vs ${B} ${ENEG[B]}: ΔEN = ${t.diff}. ${hi} is more electronegative, so it holds the electrons: δ${MINUS} on ${hi}, δ+ on ${lo}.${clue}`,
    hints: ['Compare the two electronegativities (shown under the molecule).', 'The more electronegative atom is δ' + MINUS + '; the other end is δ+.']
  };
}

const TASKS = { hyb: hybProblem, angle: angleProblem, sigma: sigmaProblem, pi: (r) => piProblem(r, pick(r, SHAPE_POOL.filter(hasPi))), polar2: polar2Problem, delta: deltaProblem };
const BY_SKILL = { hybridization: ['hyb', 'angle'], 'sigma-pi': ['sigma', 'pi'], polarity: ['polar2', 'delta'] };
export const SHAPE_SKILLS = Object.keys(BY_SKILL);

export function makeShapeProblem(rng, task, smi) {
  const f = TASKS[task];
  if (!f) throw new Error('unknown task ' + task);
  if (task === 'pi') return smi ? piProblem(rng, smi) : f(rng);
  if (task === 'polar2') return f(rng);
  if (task === 'delta') return f(rng, smi || pick(rng, SHAPE_POOL.filter((s) => bondTypes(s).some((t) => bondClass(t.diff) === 'polar'))));
  return f(rng, smi || pick(rng, SHAPE_POOL));
}

export function generateShape(count, { skill = null, rng = Math.random } = {}) {
  const tasks = skill && BY_SKILL[skill] ? BY_SKILL[skill] : Object.keys(TASKS);
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeShapeProblem(rng, pick(rng, tasks)); tries++; } while (last && p.smiles === last && tries < 6);
    last = p.smiles;
    out.push(p);
  }
  return out;
}
