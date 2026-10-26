// Mastery / practice generator "halides" (Lesson 18, McMurry ch. 7, sections 7.1 to 7.9; BOOK SCOPE ONLY: no E1cB, no Hofmann, no rearrangements).
// Every answer comes from engine/reactions-halides.js (the same functions the lesson and the hub cards use), never from typed tables.
// Tasks (pin them with `tasks`):
//   sn2      : the SN2 product of a methyl / 1° / 2° halide with a strong nucleophile, stereochemistry included (inversion), four drawn answers
//   sn1      : the SN1 product of a 3° (or 2° benzylic) halide in a protic solvent; a new stereocentre comes out racemic, a single enantiomer is the trap
//   e2       : the major (Zaitsev) alkene with KOH / NaOEt / NaOMe; on a six-membered ring only the beta H trans to X can go (the chair rule)
//   e1       : the alkene made in a hot protic solvent with no base (the substitution product and the other ether are the traps)
//   which    : name the mechanism (SN1 / SN2 / E1 / E2 / no reaction) for pairs whose book answer is unambiguous (the 7.9 table; never 1° / 2° + NaOH, never 3° + CN⁻)
//   rate     : rate-law arithmetic (typed number) and "which change speeds it up" (leaving group, solvent, class, nucleophile, concentration)
//   leaving  : which ion is the best leaving group (betterLeaving)
//   name     : name an alkyl halide (the naming-levels drill with the class pinned to halides; either IUPAC style is accepted)
//   grignard : the product after Mg then D2O / H2O, and "which halide cannot make a Grignard reagent"
//   prep     : an alcohol to a halide (PBr3, SOCl2: inversion; HX on 3°: SN1), and how many monohalogenation products an alkane gives (and how many are chiral)
// Each problem carries a `derive` line that states the procedure, not only the result.
import {
  LAB_HALIDES, E2_RING_POOL, ALCOHOLS, ALKANES, NUCLEOPHILES, BASES, LEAVING, betterLeaving, halideSites, halideName, HALIDE_CLASS_NAME, HALIDE_CLASS_SHORT,
  predictSN2, predictSN1, predictE2, predictE1, decide, reagentProfile, grignard, fromAlcohol, monohalogenation, halideChoices, ALCOHOL_REAGENTS
} from './reactions-halides.js';
import { canon } from './chem.js';
import { nameBothAny } from './naming-chain.js';
import { tetraInfo } from './cip.js';
import { resolveTasks } from './task-list.js';

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const LETTERS = 'ABCD';
const tryOf = (f) => { try { return f(); } catch (e) { return null; } };
const MINUS = '−';

/** Name of a molecule when the course can give one (pool names, then the chain namer), else null. */
export function nm(smiles) {
  const h = tryOf(() => halideName(smiles));
  if (h) return h.new;
  const n = tryOf(() => nameBothAny(smiles));
  return n ? n.new : null;
}
const nmOr = (s, fb = 'this compound') => nm(s) || fb;
/** nm() with the CIP letter in front when the molecule has exactly one stereocentre ('(S)-2-iodobutane'); the pool names already carry theirs. */
export function nmStereo(smiles) {
  const n = nm(smiles);
  if (!n || /^\(/.test(n)) return n;
  const c = tryOf(() => tetraInfo(smiles).filter((t) => t.center && t.label));
  return c && c.length === 1 && /@/.test(smiles) ? `(${c[0].label})-${n}` : n;
}
const optText = (list) => list.map((s) => `<mol smiles="${s}" label="${nmStereo(s) || ''}"></mol>`).join(' + ');

/** The four options of a drawn-answer problem: the right answer plus three wrong ones taken in the order of `kinds` (a kind not offered by the engine is skipped). */
function fourOptions(rng, choices, kinds) {
  const right = choices[0];
  const wrong = [];
  for (const k of kinds) {
    for (const c of choices) if (c.kind === k && !c.correct && wrong.length < 3 && !wrong.includes(c)) { wrong.push(c); break; }
    if (wrong.length >= 3) break;
  }
  for (const c of choices) if (wrong.length < 3 && !c.correct && !wrong.includes(c)) wrong.push(c);   // fill up with anything else
  if (wrong.length < 3) return null;
  const set = shuffle(rng, [right, ...wrong]);
  const multi = set.some((o) => o.smiles.length > 1);
  return set.map((o, i) => ({
    ...(multi ? { text: optText(o.smiles) } : { smiles: o.smiles[0], text: 'Option ' + LETTERS[i] }),
    correct: o.correct, why: o.why, kind: o.kind, products: o.smiles
  }));
}

const CLS = HALIDE_CLASS_SHORT;
const clsWord = (c) => (c === 0 ? 'methyl' : CLS[c]);
const nuLabel = (id) => (NUCLEOPHILES[id] ? NUCLEOPHILES[id].label : BASES[id].label);
const nuShort = (id) => (NUCLEOPHILES[id] ? NUCLEOPHILES[id].short : BASES[id].short);
/** How to describe a nucleophile in a derive line. */
function nuKind(id) {
  const P = reagentProfile(id);
  if (id === 'HO') return 'hydroxide (aqueous NaOH)';
  if (P.nuc === 'strong' && !P.strongBase) return `${nuShort(id)}, a strong nucleophile that is a weak base`;
  if (P.strongBase) return `${nuShort(id)}, a strong base`;
  return `${nuShort(id)}, a weak nucleophile`;
}

// ---------------------------------------------------------------- pools (built lazily: they need RDKit)
let POOLS = null;
function pools() {
  if (POOLS) return POOLS;
  const all = LAB_HALIDES.filter((h) => !h.refuses);
  const info = all.map((h) => ({ h, s: halideSites(h.smiles) })).filter((x) => x.s.ok);
  const sn2 = info.filter((x) => tryOf(() => predictSN2(x.h.smiles, 'I')) && !x.s.vinylic && !x.s.aryl).map((x) => x.h);
  const sn1 = ['CC(C)(C)Br', 'CCC(C)(C)Br', 'CCCC(C)(C)Br', 'CC(C)(C)Cl', 'CCC[C@](C)(Br)CC', 'CC1(Br)CCCCC1', 'CC(Br)c1ccccc1'];
  const e1 = ['CC(C)(C)Br', 'CCC(C)(C)Br', 'CCCC(C)(C)Br', 'CC(C)(C)Cl', 'CC1(Br)CCCCC1'];
  const e2plain = info.filter((x) => !x.s.vinylic && !x.s.aryl && !x.s.allylic && x.s.betas.length > 0 && !x.s.ring && x.s.X !== undefined && !x.s.benzylic).map((x) => x.h.smiles)
    .filter((smi) => { const p = tryOf(() => predictE2(smi, 'KOH')); return p && !p.mixture; });
  const e2ring = [...E2_RING_POOL.map((h) => h.smiles), 'BrC1CCCCC1', 'BrC1CCCC1', 'CC1(Br)CCCCC1'].filter((smi) => { const p = tryOf(() => predictE2(smi, 'KOH')); return p && !p.mixture; });
  POOLS = { sn2, sn1: sn1.filter((s) => tryOf(() => predictSN1(s, 'H2O'))), e1: e1.filter((s) => tryOf(() => predictE1(s))), e2plain, e2ring, stereoSn2: sn2.filter((h) => h.label) };
  return POOLS;
}

// ---------------------------------------------------------------- 1. SN2
const SN2_NU = ['I', 'Br', 'Cl', 'CN', 'N3', 'MeS', 'HS', 'AcO'];
function sn2Problem(rng) {
  const P = pools();
  for (let tries = 0; tries < 120; tries++) {
    const h = rng() < 0.45 && P.stereoSn2.length ? pick(rng, P.stereoSn2) : pick(rng, P.sn2);
    const s = halideSites(h.smiles);
    const nus = s.cls <= 1 && !s.benzylic && !s.allylic ? [...SN2_NU, 'HO'] : SN2_NU;
    const nu = pick(rng, nus.filter((x) => x !== s.X || (x !== 'I' && x !== 'Br' && x !== 'Cl')));
    if (['I', 'Br', 'Cl'].includes(nu) && nu === s.X) continue;
    const pred = tryOf(() => predictSN2(h.smiles, nu));
    if (!pred || canon(pred.product) === canon(h.smiles)) continue;
    const ch = halideChoices(pred, { n: 14 });
    const kinds = pred.inverted ? ['retention', 'racemic', 'elim', 'unchanged', 'wrongNu'] : ['elim', 'unchanged', 'wrongNu'];
    const options = fourOptions(rng, ch, kinds);
    if (!options) continue;
    const Nu = NUCLEOPHILES[nu];
    const stereo = pred.inverted ? `, back-side attack, so (${pred.labels.before}) becomes (${pred.labels.after})${pred.sameOrder === false ? ' (the priorities were re-ranked, so check the letter with the CIP rules)' : ''}` : ', back-side attack (the carbon is not a stereocentre, so nothing shows)';
    const pn = nmStereo(pred.product);
    return {
      kind: 'choice', skill: 'sn2', smiles: null, task: 'sn2',
      equation: { reactants: [h.smiles], products: [], cond: Nu.label },
      prompt: `What is the product of ${nmOr(h.smiles, 'this alkyl halide')} with ${Nu.label}?${pred.inverted ? ' Show the stereochemistry.' : ''}`,
      options, answer: options.find((o) => o.correct).text,
      sub: h.smiles, nu, products: pred.products, pred: { mech: 'SN2', inverted: pred.inverted },
      derive: `${clsWord(s.cls)[0].toUpperCase()}${clsWord(s.cls).slice(1)} halide + ${nuKind(nu)}: SN2${stereo}. ${Nu.short} takes the place of the ${s.X}.${pn ? ` Product: ${pn}.` : ''}`,
      hints: ['Class the carbon with the halogen, then ask whether the nucleophile is strong. SN2 attacks from the side opposite the leaving group, in one step.', pred.inverted ? 'The nucleophile takes the halogen’s place, but from the back, so the configuration at that carbon is the mirror image of the starting material. Compare the drawings with that in mind.' : 'The nucleophile takes the place of the halogen on the same carbon and nothing else changes. Check that the new group is the one in the reagent.']
    };
  }
  throw new Error('no SN2 problem');
}

// ---------------------------------------------------------------- 2. SN1
const SN1_SOLV = ['H2O', 'MeOH', 'EtOH'];
function sn1Problem(rng) {
  const P = pools();
  for (let tries = 0; tries < 120; tries++) {
    const smi = pick(rng, P.sn1);
    const nu = pick(rng, SN1_SOLV);
    const pred = tryOf(() => predictSN1(smi, nu));
    if (!pred) continue;
    const ch = halideChoices(pred, { n: 14 });
    const options = fourOptions(rng, ch, ['oneEnantiomer', 'elim', 'unchanged', 'wrongNu']);
    if (!options) continue;
    const s = halideSites(smi), Nu = NUCLEOPHILES[nu];
    const pn = pred.racemic ? null : nm(pred.product);
    return {
      kind: 'choice', skill: 'sn1', smiles: null, task: 'sn1',
      equation: { reactants: [smi], products: [], cond: Nu.label },
      prompt: `${nmOr(smi, 'This halide')} is heated in ${Nu.short}. Which answer is the SN1 (substitution) product?${pred.racemic ? ' Show the stereochemistry.' : ''}`,
      options, answer: options.find((o) => o.correct).text,
      sub: smi, nu, products: pred.products, racemic: pred.racemic, pred: { mech: 'SN1', racemic: pred.racemic },
      derive: `${s.benzylic ? '2° benzylic' : clsWord(s.cls)} halide + ${nuKind(nu)} in a protic solvent: SN1. The ${s.X} leaves first and leaves a flat carbocation; ${Nu.short} bonds to it and a second solvent molecule removes H⁺.${pred.racemic ? ' The carbon becomes a new stereocentre from a flat cation, so both enantiomers form: a racemic mixture.' : ''}${pn ? ` Product: ${pn}.` : ''}`,
      hints: ['A 3° (or benzylic) halide with a weak nucleophile in a protic solvent ionises first: the halogen leaves and a flat carbocation forms. The nucleophile bonds to it afterwards.', pred.racemic ? 'The cation is flat, so the nucleophile can arrive from either face. If the carbon becomes a stereocentre, both enantiomers appear in equal amounts.' : 'The solvent molecule ends up on the carbon that held the halogen (after losing H⁺), so the product is the alcohol or ether on that same carbon.']
    };
  }
  throw new Error('no SN1 problem');
}

// ---------------------------------------------------------------- 3. E2
const E2_BASES = ['KOH', 'NaOEt', 'NaOMe'];
function e2Problem(rng) {
  const P = pools();
  for (let tries = 0; tries < 160; tries++) {
    const ring = rng() < 0.4;
    const smi = pick(rng, ring ? P.e2ring : P.e2plain);
    const base = pick(rng, E2_BASES);
    const pred = tryOf(() => predictE2(smi, base));
    if (!pred || pred.mixture) continue;
    if (!pred.zaitsev && !pred.ring && rng() < 0.7) continue;     // prefer problems where two alkenes compete
    const ch = halideChoices(pred, { n: 14 });
    const options = fourOptions(rng, ch, ['notAnti', 'hofmann', 'subst', 'unchanged', 'subst2', 'wrongNu']);
    if (!options) continue;
    const s = halideSites(smi), B = BASES[base];
    const an = nm(pred.major[0]);
    const ringNote = pred.ring ? ` On this six-membered ring only a β H trans to the ${s.X} (anti to it, trans-diaxial in the chair) can leave${pred.ringBlocked.length ? `; the H that would give the Zaitsev alkene is cis to the ${s.X}, so that alkene is blocked` : ''}.` : '';
    return {
      kind: 'choice', skill: 'e2', smiles: null, task: 'e2',
      equation: { reactants: [smi], products: [], cond: B.label },
      prompt: `What is the major alkene from ${nmOr(smi, 'this halide')} with ${B.label}? (Ignore E/Z.)${pred.ring ? ' On a ring, E2 needs the β H trans (anti) to the halogen.' : ''}`,
      options, answer: options.find((o) => o.correct).text,
      sub: smi, base, products: pred.major, ring: pred.ring, blocked: pred.ringBlocked.length > 0, pred: { mech: 'E2' },
      derive: `${clsWord(s.cls)[0].toUpperCase()}${clsWord(s.cls).slice(1)} halide + ${B.short}, a strong base: E2. The base takes a β H anti to the ${s.X} in one step.${pred.zaitsev && !pred.ringBlocked.length ? ' With two alkenes possible, the one with more carbon groups on the C=C is major (Zaitsev).' : ''}${ringNote}${an ? ` Major product: ${an}.` : ''}`,
      hints: ['A strong base gives E2: it removes a β H (an H on a carbon next to the C–X carbon) while the halogen leaves. Draw each alkene that could form.', pred.ring ? 'Zaitsev says the more substituted alkene is major, but on a ring the β H must be trans to the halogen. Check, for each neighbouring carbon, whether an H is trans to the halogen (a CH₂ always has one; a CH(R) only if R is cis to the halogen).' : 'Zaitsev: the alkene with more carbon groups on the C=C is the major product. Count the carbon groups on the double bond of each candidate.']
    };
  }
  throw new Error('no E2 problem');
}

// ---------------------------------------------------------------- 4. E1
function e1Problem(rng) {
  const P = pools();
  for (let tries = 0; tries < 120; tries++) {
    const smi = pick(rng, P.e1);
    const solv = pick(rng, SN1_SOLV);
    const pred = tryOf(() => predictE1(smi));
    const sn1 = tryOf(() => predictSN1(smi, solv));
    const other = tryOf(() => predictSN1(smi, solv === 'MeOH' ? 'EtOH' : 'MeOH'));
    if (!pred || !sn1 || !other || pred.mixture) continue;
    const hof = pred.alkenes.filter((a) => !a.major).map((a) => a.smiles);
    const uniq = [];
    const cand = [
      { kind: 'subst', smiles: sn1.products, why: `This is the substitution (SN1) product: ${NUCLEOPHILES[solv].short} bonds to the carbocation. It forms beside the alkene, but the question asks for the elimination product, with a C=C.` },
      { kind: 'subst2', smiles: other.products, why: `This ether comes from the wrong solvent: the molecule that reacts is the one the halide is heated in (${NUCLEOPHILES[solv].short}), and the question wants the alkene anyway.` },
      ...(hof.length ? [{ kind: 'hofmann', smiles: [hof[0]], why: 'This is the less substituted alkene. Zaitsev: the more substituted C=C is the major product.' }] : []),
      { kind: 'unchanged', smiles: [canon(smi)], why: 'That is the starting halide again. The C–X bond breaks and a β H is lost, so the product is an alkene.' }
    ];
    const right = { smiles: pred.major.slice(), correct: true, kind: 'major', why: `Yes. E1: the halide leaves, then the solvent removes a β H and the more substituted alkene forms (Zaitsev).` };
    const wrong = cand.filter((c) => c.smiles.every((x) => x)).slice(0, 3).map((c) => ({ ...c, smiles: c.smiles.map((x) => canon(x)), correct: false }));
    if (wrong.length < 3 || new Set([right, ...wrong].map((o) => o.smiles.slice().sort().join('|'))).size < 4) continue;
    void uniq;
    const set = shuffle(rng, [right, ...wrong]);
    const multi = set.some((o) => o.smiles.length > 1);
    const options = set.map((o, i) => ({ ...(multi ? { text: optText(o.smiles) } : { smiles: o.smiles[0], text: 'Option ' + LETTERS[i] }), correct: o.correct, why: o.why, kind: o.kind, products: o.smiles }));
    const s = halideSites(smi), an = nm(pred.major[0]);
    return {
      kind: 'choice', skill: 'e1', smiles: null, task: 'e1',
      equation: { reactants: [smi], products: [], cond: NUCLEOPHILES[solv].label },
      prompt: `${nmOr(smi, 'This halide')} is heated in ${NUCLEOPHILES[solv].short} with no added base. Which answer is the E1 (elimination) product? (Ignore E/Z.)`,
      options, answer: options.find((o) => o.correct).text,
      sub: smi, solvent: solv, products: pred.major, pred: { mech: 'E1' },
      derive: `${clsWord(s.cls)[0].toUpperCase()}${clsWord(s.cls).slice(1)} halide, no strong base, protic solvent: SN1 and E1 share one carbocation. The ${s.X} leaves first; the solvent then removes a β H and the more substituted alkene forms (Zaitsev). Heat favours this alkene.${an ? ` Alkene: ${an}.` : ''}`,
      hints: ['With no strong base, a 3° halide ionises first (as in SN1). The carbocation then has two exits: the solvent bonds to it, or the solvent takes a β H. This question asks for the second one.', 'Remove the halogen and one β H from a neighbouring carbon and put in the C=C. If two alkenes are possible, the one with more carbon groups on the C=C (Zaitsev) is the major product.']
    };
  }
  throw new Error('no E1 problem');
}

// ---------------------------------------------------------------- 5. which mechanism (the 7.9 table, only the unambiguous cells)
const NONBASIC = ['I', 'CN', 'N3', 'MeS', 'HS', 'AcO'];
const WEAK = ['H2O', 'MeOH', 'EtOH'];
const WHICH_SUBS = {
  methyl: ['CBr'], primary: ['CCBr', 'CCCBr', 'CCCCBr', 'CCCCCl', 'CCCI'], secondary: ['CC(C)Br', 'CCC(C)Br', 'CCC(Br)CC', 'CCCC(C)Br', 'BrC1CCCCC1', 'BrC1CCCC1'],
  tertiary: ['CC(C)(C)Br', 'CCC(C)(C)Br', 'CCCC(C)(C)Br', 'CC(C)(C)Cl', 'CC1(Br)CCCCC1'], benzylic: ['BrCc1ccccc1', 'CC(Br)c1ccccc1'], sp2: ['Brc1ccccc1', 'CC=CBr']
};
let WHICH = null;
/** [{sub, reagent, cat, expect: 'SN1'|'SN2'|'E2'|'none', ask: 'mech'|'substitution'}] for every cell of the table the book answers without a caveat; each is confirmed with decide(). */
export function whichCases() {
  if (WHICH) return WHICH;
  const out = [];
  const add = (cat, subs, reagents, expect, ask = 'mech') => subs.forEach((sub) => reagents.forEach((reagent) => {
    const d = decide(sub, reagent);
    const got = d.noReaction ? 'none' : d.major;
    if (d.ok && got === expect) out.push({ sub, reagent, cat, expect, ask });
  }));
  add('methyl + strong nucleophile', WHICH_SUBS.methyl, NONBASIC, 'SN2');
  add('1° + strong nucleophile', WHICH_SUBS.primary, NONBASIC, 'SN2');
  add('2° + strong nucleophile', WHICH_SUBS.secondary, NONBASIC, 'SN2');
  add('2° + strong base', WHICH_SUBS.secondary, E2_BASES, 'E2');
  add('3° + strong base', WHICH_SUBS.tertiary, E2_BASES, 'E2');
  add('3° + weak nucleophile', WHICH_SUBS.tertiary, WEAK, 'SN1', 'substitution');
  add('benzylic + weak nucleophile', WHICH_SUBS.benzylic, WEAK, 'SN1', 'substitution');
  add('sp² carbon', WHICH_SUBS.sp2, [...NONBASIC.slice(0, 3), ...WEAK], 'none');
  WHICH = out;
  return out;
}
const MECHS = ['SN1', 'SN2', 'E1', 'E2', 'No reaction'];
function whyNot(mech, s, P, rid, d) {
  const sh = nuShort(rid);
  const weakBase = !P.strongBase;
  if (mech === 'No reaction') return `This pair does react. ${d.reason}`;
  if ((s.vinylic || s.aryl) && mech === 'SN2') return 'An sp² carbon cannot do SN2: the ring or the C=C blocks the back side and the C–X bond is stronger.';
  if ((s.vinylic || s.aryl) && (mech === 'SN1' || mech === 'E1')) return 'The cation would sit on an sp² carbon, which is very unstable, so a vinylic or aryl halide does not ionise.';
  if (mech === 'SN2') {
    if (s.cls === 3) return 'SN2 never happens at a 3° carbon: the three alkyl groups block the back side.';
    if (P.strongBase) return `${sh} is a strong base as well as a nucleophile: on a 2° carbon the table gives E2, because the base takes a β H faster than it can reach the crowded carbon.`;
    return `SN2 needs a strong nucleophile, and ${sh} is neutral and weak.`;
  }
  if (mech === 'SN1') {
    if (s.cls <= 1 && !s.benzylic) return 'A methyl or 1° carbocation is far too unstable to form, so there is no SN1.';
    if (P.nuc === 'strong' || P.strongBase) return `SN1 belongs to weak nucleophiles in a protic solvent. ${sh} is strong, so it reacts with the halide directly (${P.strongBase ? 'E2' : 'SN2'}) before ionisation matters.`;
    return 'The halide could ionise, but this reagent decides the path another way; check the class of the carbon and the strength of the reagent.';
  }
  if (mech === 'E1') {
    if (s.cls <= 1 && !s.benzylic) return 'E1 needs a carbocation, and a methyl or 1° cation does not form.';
    if (P.strongBase) return `E1 is for a weak base in a protic solvent. With ${sh}, a strong base, the elimination is a one-step E2.`;
    return 'E1 does happen beside SN1 with a weak nucleophile, but it gives an alkene and the question asks for the main (substitution) path.';
  }
  if (mech === 'E2') {
    if (weakBase) return `E2 needs a strong base, and ${sh} is a weak base.`;
    return 'The base would work on a different class of halide; here the table gives another path.';
  }
  return '';
}
function whichProblem(rng) {
  const cases = whichCases();
  const c = pick(rng, cases);
  const s = halideSites(c.sub), rid = c.reagent, P = reagentProfile(rid);
  const d = decide(c.sub, rid);
  const want = c.expect === 'none' ? 'No reaction' : c.expect;
  const options = MECHS.map((m) => ({
    text: m, correct: m === want,
    why: m === want ? `Yes. ${d.reason}` : whyNot(m, s, P, rid, d)
  }));
  const kind = P.kind === 'base' ? 'a strong base' : P.nuc === 'strong' ? 'a strong nucleophile that is a weak base' : 'a weak nucleophile in a protic solvent';
  const subWord = s.vinylic || s.aryl ? 'an sp² (vinylic or aryl) halide' : s.benzylic ? `a ${s.cls === 1 ? '1°' : '2°'} benzylic halide` : s.cls === 0 ? 'a methyl halide' : `a ${CLS[s.cls]} halide`;
  return {
    kind: 'choice', skill: 'sub-vs-elim', smiles: null, task: 'which',
    equation: { reactants: [c.sub], products: [], cond: nuLabel(rid) },
    prompt: c.ask === 'substitution' ? `${nmOr(c.sub, 'This halide')} is heated with ${nuLabel(rid)}. Which mechanism makes the substitution product (the alcohol or ether)?` : c.expect === 'none' ? `What happens when ${nmOr(c.sub, 'this halide')} is treated with ${nuLabel(rid)}?` : `Which mechanism describes the reaction of ${nmOr(c.sub, 'this halide')} with ${nuLabel(rid)}?`,
    options, answer: want, sub: c.sub, reagent: rid, cat: c.cat, expect: c.expect, ask: c.ask,
    derive: `Class the carbon: ${subWord}. The reagent is ${kind}. ${d.reason}`,
    hints: ['Class the carbon with the halogen (methyl, 1°, 2°, 3°, or sp²), then class the reagent: strong base, strong nucleophile that is a weak base, or weak nucleophile in a protic solvent.', 'Table: a strong base gives E2 (3° never SN2). A strong nucleophile that is a weak base gives SN2 on methyl, 1° and 2° halides. A weak nucleophile gives SN1 (with E1) on a 3° or benzylic halide. An sp² carbon does neither SN1 nor SN2.']
  };
}

// ---------------------------------------------------------------- 6. rates
const times = (k) => (k === 0.5 ? 'halved' : k === 2 ? 'doubled' : k === 3 ? 'tripled' : k === 4 ? 'quadrupled' : `multiplied by ${k}`);
function rateNumberProblem(rng, mech) {
  let a, b;
  do {
    a = pick(rng, [2, 3, 4, 5]);
    b = mech === 'SN2' ? pick(rng, [2, 3, 4]) : pick(rng, [2, 3, 0.5, 4]);
  } while (mech === 'SN2' && a + b === a * b);       // 2 and 2: the sum and the product agree, so the "added them" trap would be the right number
  const sub = mech === 'SN2' ? pick(rng, ['CCCCBr', 'CCBr', 'CCCBr', 'CC(C)Br']) : pick(rng, ['CC(C)(C)Br', 'CCC(C)(C)Br']);
  const nu = mech === 'SN2' ? pick(rng, ['CN', 'I', 'HS', 'MeS']) : pick(rng, ['H2O', 'MeOH', 'EtOH']);
  const answer = mech === 'SN2' ? a * b : a;
  const law = mech === 'SN2' ? 'rate = k[RX][Nu]' : 'rate = k[RX]';
  const wrong = [];
  const add = (v, why) => { if (v !== answer && !wrong.some((w) => w.match === v)) wrong.push({ match: v, why }); };
  if (mech === 'SN2') { add(a + b, 'Adding the factors is the trap. In a rate law the concentrations are multiplied, so the two changes multiply.'); add(a, 'That counts only the alkyl halide. In SN2 the nucleophile is in the same single step, so its concentration is in the rate law too.'); add(b, 'That counts only the nucleophile. The alkyl halide is in the one step as well, so its change counts too.'); }
  else { add(a * b, 'That multiplies by the nucleophile factor as well, as if this were SN2. In SN1 the nucleophile is not in the slow step, so only the halide counts.'); add(b, 'That uses the nucleophile factor. In SN1 the nucleophile only bonds after the slow step and is not in the rate law.'); add(a + b, 'Adding the factors is wrong here: the rate law of SN1 has the halide only, so only its factor counts.'); }
  return {
    kind: 'input', skill: mech === 'SN2' ? 'sn2' : 'sn1', smiles: null, task: 'rate', variant: 'arithmetic', mech,
    equation: { reactants: [sub], products: [], cond: NUCLEOPHILES[nu].label },
    prompt: `The ${mech} reaction of ${nmOr(sub, 'this halide')} with ${NUCLEOPHILES[nu].short} follows ${law}. The concentration of the halide is ${times(a)} and the concentration of ${NUCLEOPHILES[nu].short} is ${times(b)}. By what factor does the rate change? Type a number (such as 6 or 1.5).`,
    answer, accept: [], wrong, a, b, sub, nu,
    derive: mech === 'SN2' ? `SN2: ${law}, both molecules are in the one step, so the factors multiply: ${a} × ${b} = ${answer}.` : `SN1: ${law}. The nucleophile is not in the slow step, so only the halide counts: the factor is ${a}${b !== 1 ? ` (the factor of ${b} for the nucleophile changes nothing)` : ''}.`,
    hints: [mech === 'SN2' ? 'Both the halide and the nucleophile are in the SN2 rate law, so a change in either one changes the rate.' : 'The rate law of SN1 shows which species are in the slow step. Which one is named?', mech === 'SN2' ? 'Multiply the two factors; do not add them.' : 'Only the alkyl halide appears: apply its factor and ignore the nucleophile.']
  };
}

/** A change that speeds up, slows or leaves the rate alone, with the rule behind it (all effects follow from LEAVING ranks, the class order and the rate laws). */
function changesSN2(sub) {
  const s = halideSites(sub);
  const lg = (to) => ({ text: `Change the leaving group from ${s.X} to ${to}`, effect: betterLeaving(to, s.X) === to ? 'faster' : 'slower', why: (e) => e === 'faster' ? `Yes. ${to}⁻ is a weaker base than ${s.X}⁻, so it is the better leaving group and the C–${to} bond breaks more easily as the nucleophile attacks.` : `${to}⁻ is a stronger base than ${s.X}⁻, so it is the poorer leaving group and SN2 is slower.` });
  return [
    lg('I'), lg('Cl'),
    { text: 'Switch the solvent from methanol to DMSO, a polar aprotic solvent', effect: 'faster', why: () => 'Yes. Methanol hydrogen-bonds to an anionic nucleophile and holds it back; DMSO has no O–H, so the nucleophile is free and SN2 speeds up.' },
    { text: 'Double the concentration of the nucleophile', effect: 'faster', why: () => 'Yes. The nucleophile is in the SN2 rate law (rate = k[RX][Nu]), so doubling it doubles the rate.' },
    { text: 'Halve the concentration of the nucleophile', effect: 'slower', why: () => 'The nucleophile is in the SN2 rate law, so halving it halves the rate: slower, not faster.' },
    { text: 'Use the 2° isomer in place of this halide', effect: 'slower', why: () => 'A 2° carbon is more crowded around its back side than a 1° carbon, so SN2 is slower. SN2 order: methyl > 1° > 2°.' },
    { text: 'Use a 3° halide in place of this halide', effect: 'slower', why: () => 'A 3° carbon blocks the back side completely, so there is no SN2 at all: that is the slowest change of all.' }
  ];
}
function changesSN1(sub) {
  const s = halideSites(sub);
  const lg = (to) => ({ text: `Change the leaving group from ${s.X} to ${to}`, effect: betterLeaving(to, s.X) === to ? 'faster' : 'slower', why: (e) => e === 'faster' ? `Yes. The slow step of SN1 is the halide leaving, and ${to}⁻ is a better leaving group than ${s.X}⁻.` : `${to}⁻ is the poorer leaving group, and its departure is the slow step of SN1, so the reaction is slower.` });
  const list = [
    lg('I'), lg('Cl'),
    { text: 'Double the concentration of the alkyl halide', effect: 'faster', why: () => 'Yes. The halide is in the SN1 rate law (rate = k[RX]), so doubling it doubles the rate.' },
    { text: 'Halve the concentration of the alkyl halide', effect: 'slower', why: () => 'The halide is the only reagent in the SN1 rate law, so halving it halves the rate.' },
    { text: 'Double the concentration of the nucleophile', effect: 'same', why: () => 'The nucleophile is not in the slow step and not in the rate law (rate = k[RX]), so doubling it changes nothing.' },
    { text: 'Use a stronger nucleophile (for example NaCN in place of H₂O)', effect: 'same', why: () => 'The nucleophile only bonds to the cation after the slow step, so its strength does not change the rate of SN1.' }
  ];
  if (s.cls === 2) list.push({ text: 'Use the 3° isomer in place of this 2° halide', effect: 'faster', why: () => 'Yes. A 3° halide makes a more stable carbocation than a 2° one, and the more stable the cation, the faster SN1 goes.' });
  else list.push({ text: 'Use the 2° isomer in place of this 3° halide', effect: 'slower', why: () => 'A 2° carbocation is less stable than a 3° one, so the first step is slower. SN1 order: 3° > 2° (1° never).' });
  return list;
}
function rateChangeProblem(rng, mech) {
  for (let tries = 0; tries < 60; tries++) {
    const sub = mech === 'SN2' ? pick(rng, ['CCCCBr', 'CCBr', 'CCCBr']) : pick(rng, ['CC(C)(C)Br', 'CCC(C)(C)Br', 'CCC(Br)CC', 'CCCC(C)Br']);
    const list = mech === 'SN2' ? changesSN2(sub) : changesSN1(sub);
    const fast = list.filter((c) => c.effect === 'faster'), rest = list.filter((c) => c.effect !== 'faster');
    if (!fast.length || rest.length < 3) continue;
    const right = pick(rng, fast);
    const wrong = shuffle(rng, rest).slice(0, 3);
    const set = shuffle(rng, [right, ...wrong]).map((c) => ({ text: c.text, correct: c === right, why: c === right ? c.why('faster') : c.why(c.effect), effect: c.effect }));
    const Nu = mech === 'SN2' ? pick(rng, ['CN', 'HS', 'MeS']) : pick(rng, ['H2O', 'EtOH']);
    return {
      kind: 'choice', skill: mech === 'SN2' ? 'sn2' : 'sn1', smiles: null, task: 'rate', variant: 'change', mech,
      equation: { reactants: [sub], products: [], cond: mech === 'SN2' ? `${NUCLEOPHILES[Nu].label}, methanol` : `${NUCLEOPHILES[Nu].label}, heat` },
      prompt: `${mech === 'SN2' ? 'This SN2 reaction' : 'This SN1 reaction'} of ${nmOr(sub, 'the halide')} with ${NUCLEOPHILES[Nu].short}${mech === 'SN2' ? ' in methanol' : ''} is slow. Which single change would make it <b>faster</b>?`.replace(/<\/?b>/g, ''),
      options: set, answer: right.text, sub, nu: Nu,
      derive: mech === 'SN2'
        ? `SN2 rate = k[RX][Nu]: it goes faster with a better leaving group (I⁻ > Br⁻ > Cl⁻), a less crowded carbon (methyl > 1° > 2°), a polar aprotic solvent and more of either reagent. ${right.text}: ${right.why('faster').replace(/^Yes\.\s*/, '')}`
        : `SN1 rate = k[RX]: it goes faster with a better leaving group, a more stable carbocation (3° > 2°) and more halide; the nucleophile does not matter. ${right.text}: ${right.why('faster').replace(/^Yes\.\s*/, '')}`,
      hints: [mech === 'SN2' ? 'Write the rate law first. Then ask what makes the nucleophile attack easier (a free, strong nucleophile, an open carbon) and what makes the leaving group go (a weak base).' : 'Write the rate law first: SN1 depends only on the halide. What makes the halide ionise faster?', mech === 'SN2' ? 'Faster: a better leaving group, a polar aprotic solvent, a less crowded carbon, more nucleophile or more halide.' : 'Faster: a better leaving group, a more stable (more substituted) carbocation, more halide. The nucleophile has no effect.']
    };
  }
  throw new Error('no rate problem');
}
function rateProblem(rng, skill) {
  const mech = skill === 'sn1' ? 'SN1' : skill === 'sn2' ? 'SN2' : pick(rng, ['SN1', 'SN2']);
  const p = skill === 'sub-vs-elim' || rng() < 0.5 ? rateChangeProblem(rng, mech) : rateNumberProblem(rng, mech);
  return skill === 'sub-vs-elim' ? { ...p, skill: 'sub-vs-elim' } : p;
}

// ---------------------------------------------------------------- 7. leaving groups
function leavingProblem(rng) {
  const ids = shuffle(rng, LEAVING.map((l) => l.id)).slice(0, 4);
  const best = ids.reduce((b, x) => betterLeaving(b, x) === x ? x : b);
  const by = Object.fromEntries(LEAVING.map((l) => [l.id, l]));
  const options = ids.map((id) => ({
    text: by[id].label, correct: id === best,
    why: id === best ? `Yes. ${by[id].label} is ${by[id].why}: the weakest base of these four, so the best leaving group.` : `${by[id].label} is ${by[id].why}; ${by[best].label} is ${by[best].why}, so it leaves more easily.`
  }));
  return {
    kind: 'choice', skill: 'sn2', smiles: null, task: 'leaving',
    prompt: 'Which of these ions is the best leaving group?',
    options, answer: by[best].label, ids, best,
    derive: `A leaving group takes the bonding pair with it, so the weaker a base it is, the better it leaves (a strong acid has a weak conjugate base). Order: I⁻ > Br⁻ > Cl⁻ > F⁻ > HO⁻ > NH₂⁻. Of these four: ${by[best].label}.`,
    hints: ['A good leaving group is a weak base: it is stable once it has the bonding pair. A strong acid has a weak conjugate base.', 'Order of leaving ability: I⁻ > Br⁻ > Cl⁻ > F⁻, then HO⁻ and NH₂⁻, which are strong bases and do not leave.']
  };
}

// ---------------------------------------------------------------- 8. naming (the naming drill, class pinned to halides)
function nameProblem(rng, nameGen) {
  if (!nameGen) throw new Error('the name task needs the naming drill (pass nameGen)');
  const p = nameGen(1, { rng, settings: { classes: ['halide'], length: 'c10', subs: ['one', 'two', 'three'], stereo: 'none', qtypes: ['type', 'pick'], style: 'either' } })[0];
  const { visual, ...rest } = p;   // the naming drill's settings card belongs to the naming practice page, not to a halide problem
  void visual;
  return { ...rest, skill: 'halide-naming', task: 'name' };
}

// ---------------------------------------------------------------- 9. Grignard
const GR_OK = ['BrC1CCCCC1', 'CCBr', 'CCCBr', 'CC(C)Br', 'CCC(C)Br', 'CCCCBr', 'BrCc1ccccc1', 'Brc1ccccc1', 'CCCCCl', 'BrC1CCCC1'];
const GR_BAD = ['BrCCO', 'BrCCCN', 'BrCCC(=O)O', 'BrCCC#C', 'BrCCS', 'BrCCCO', 'OC1CCCC(Br)C1'];
function grignardProductProblem(rng) {
  for (let tries = 0; tries < 40; tries++) {
    const smi = pick(rng, GR_OK);
    const water = rng() < 0.6 ? 'D2O' : 'H2O';
    const pred = tryOf(() => grignard(smi));
    if (!pred) continue;
    const ch = halideChoices(pred, { n: 10, water });
    const options = fourOptions(rng, ch, ['noD', 'alcohol', 'reagent', 'unchanged']);
    if (!options) continue;
    const W = water === 'D2O' ? 'D₂O' : 'H₂O', E = water === 'D2O' ? 'D' : 'H';
    const pn = nm(pred.protonolysis[water]);
    return {
      kind: 'choice', skill: 'grignard', smiles: null, task: 'grignard', variant: 'product',
      equation: { reactants: [smi], products: [], cond: `Mg, ether; then ${W}` },
      prompt: `${nmOr(smi, 'This halide')} is stirred with magnesium in dry ether, and the mixture is then treated with ${W}. What is the final organic product?`,
      options, answer: options.find((o) => o.correct).text, sub: smi, water, products: [pred.protonolysis[water]],
      derive: `Mg inserts into the C–${pred.X} bond to give R–Mg–${pred.X}: the carbon is now a strong base and nucleophile. ${W} gives it ${E}⁺, so the carbon that held the ${pred.X} now holds ${E}; the carbon skeleton is unchanged.${pn ? ` Product: ${pn}${water === 'D2O' ? ' with one D' : ''}.` : ''}`,
      hints: ['Mg inserts into the C–halogen bond to make R–MgX. That carbon is now very basic, like a carbanion.', `${W} hands ${E}⁺ to that carbon, so the ${E} ends up exactly where the halogen was. The OH (or OD) of the water does not bond to carbon.`]
    };
  }
  throw new Error('no Grignard product problem');
}
function grignardTrapProblem(rng) {
  for (let tries = 0; tries < 40; tries++) {
    const bad = pick(rng, GR_BAD);
    const ok = shuffle(rng, GR_OK).slice(0, 3);
    let reason = null;
    try { grignard(bad); } catch (e) { reason = String(e.message).replace(/^excluded:\s*/, ''); }
    if (!reason || !ok.every((s) => tryOf(() => grignard(s)))) continue;
    const set = shuffle(rng, [bad, ...ok]);
    const options = set.map((s, i) => ({
      smiles: s, text: 'Option ' + LETTERS[i], correct: s === bad,
      why: s === bad ? `Yes. ${reason[0].toUpperCase()}${reason.slice(1)}.` : `This halide has no O–H, N–H, S–H or CO₂H group, so Mg inserts into the C–${halideSites(s, { any: true }).X} bond without trouble and the Grignard reagent survives.`
    }));
    return {
      kind: 'choice', skill: 'grignard', smiles: null, task: 'grignard', variant: 'trap',
      prompt: 'Which of these halides cannot be turned into a Grignard reagent with Mg in ether?',
      options, answer: options.find((o) => o.correct).text, sub: bad,
      derive: `A Grignard reagent is a strong base: any acidic H in the same molecule (O–H, N–H, S–H, CO₂H, a terminal alkyne C–H) would give its H to the C–Mg carbon as soon as it formed. ${reason[0].toUpperCase()}${reason.slice(1)}.`,
      hints: ['The C–Mg carbon is a very strong base. Look for another group in the molecule that could give it an H⁺.', 'An O–H, N–H, S–H, CO₂H or terminal ≡C–H would do it. A halogen on carbon, a ring or a plain chain is fine.']
    };
  }
  throw new Error('no Grignard trap problem');
}
function grignardProblem(rng) { return rng() < 0.7 ? grignardProductProblem(rng) : grignardTrapProblem(rng); }

// ---------------------------------------------------------------- 10. preparing halides
const ALC_REAGENTS = ['PBr3', 'SOCl2', 'HBr', 'HCl'];
function alcoholProblem(rng) {
  for (let tries = 0; tries < 80; tries++) {
    const al = pick(rng, ALCOHOLS), rid = pick(rng, ALC_REAGENTS);
    const pred = tryOf(() => fromAlcohol(al.smiles, rid));
    if (!pred) continue;
    const ch = halideChoices(pred, { n: 12 });
    const kinds = pred.inverted ? ['retention', 'racemic', 'wrongHalogen', 'elim', 'unchanged'] : ['wrongHalogen', 'elim', 'unchanged', 'racemic'];
    const options = fourOptions(rng, ch, kinds);
    if (!options) continue;
    const R = ALCOHOL_REAGENTS[rid];
    const how = pred.mech === 'SN2' ? (pred.reagent === 'HBr' || pred.reagent === 'HCl' || pred.reagent === 'HI' ? `${R.label} protonates the OH and ${R.X}⁻ displaces water from the back (SN2, a 1° alcohol cannot make a cation)` : `${R.label} turns the OH into a good leaving group and ${R.X}⁻ attacks from the back (SN2)`) : `${R.label} protonates the OH, water leaves and ${R.X}⁻ bonds to the carbocation (SN1)`;
    const stereo = pred.inverted ? `, so the stereocentre inverts: (${pred.labels.before}) becomes (${pred.labels.after})` : pred.racemic ? '; the cation is flat, so a new stereocentre would come out racemic (drawn flat)' : '';
    const pn = nmStereo(pred.product);
    return {
      kind: 'choice', skill: 'sn2', smiles: null, task: 'prep', variant: 'alcohol',
      equation: { reactants: [al.smiles], products: [], cond: R.label },
      prompt: `${nmOr(al.smiles, 'This alcohol')} is treated with ${R.label}. What is the product?${pred.inverted ? ' Show the stereochemistry.' : ''}`,
      options, answer: options.find((o) => o.correct).text, sub: al.smiles, reagent: rid, products: pred.products,
      derive: `${HALIDE_CLASS_SHORT[pred.cls] === '3°' ? '3°' : HALIDE_CLASS_SHORT[pred.cls]} alcohol + ${R.label}: ${how}${stereo}. The halogen that replaces the OH is the one in the reagent (${R.X}).${pn ? ` Product: ${pn}.` : ''}`,
      hints: ['The OH is replaced by the halogen of the reagent, on the same carbon: PBr₃ gives a bromide, SOCl₂ a chloride, HBr a bromide, HCl a chloride.', pred.inverted ? 'PBr₃ and SOCl₂ work by a back-side SN2 attack, so a stereocentre inverts. Draw the mirror image at that carbon.' : 'HX on a 3° alcohol goes through a flat carbocation (SN1); on a 1° alcohol the halide displaces water from the back (SN2).']
    };
  }
  throw new Error('no alcohol problem');
}
function halogenationProblem(rng) {
  for (let tries = 0; tries < 60; tries++) {
    const alk = pick(rng, ALKANES), X = pick(rng, ['Cl', 'Br']);
    const list = monohalogenation(alk.smiles, X);
    const acyclic = !alk.smiles.includes('1');
    const centres = (e) => { try { return tetraInfo(e.smiles).filter((t) => t.center).length; } catch (err) { return 0; } };
    const chiralQ = acyclic && rng() < 0.5 && list.some((e) => e.chiral) && list.every((e) => centres(e) <= 1);
    const n = list.length, nc = list.filter((e) => e.chiral).length;
    const answer = chiralQ ? nc : n;
    const XN = X === 'Cl' ? 'chloro' : 'bromo';
    const hs = list.map((e) => `${e.nH} H`).join(', ');
    return {
      kind: 'input', skill: 'halide-naming', smiles: alk.smiles, task: 'prep', variant: chiralQ ? 'chiral' : 'count',
      prompt: chiralQ ? `${X}₂ and light replace one H of ${alk.id} by ${X} without choosing. How many of the different mono${XN} products are chiral (have a stereocentre)? Type a number.` : `${X}₂ and light replace one H of ${alk.id} by ${X} without choosing. How many different mono${XN} products can form? (Count constitutional isomers; ignore stereoisomers.) Type a number.`,
      answer, alkane: alk.smiles, X, products: list.map((e) => e.smiles), nH: list.map((e) => e.nH),
      wrong: [{ match: chiralQ ? n : n + 1, why: chiralQ ? 'That counts every product, chiral or not. Only a product whose C–X carbon has four different groups is chiral.' : 'That is one too many: hydrogens that are equivalent by symmetry give the same compound, so count the different kinds of H, not the carbons.' }].filter((w) => w.match !== answer),
      derive: `Group the hydrogens by symmetry (${hs}): each different kind gives one mono${XN} product, so ${n} products.${chiralQ ? ` A product is chiral when the carbon with the ${X} has four different groups: ${nc} of the ${n}.` : ''}`,
      hints: ['Radical halogenation is not selective: any H can be replaced. Group the H atoms that are equivalent by symmetry; each group gives one product.', chiralQ ? 'For each product, look at the carbon that now holds the halogen: four different groups means a stereocentre, so the product is chiral.' : 'Count the different kinds of H, for example the end CH₃ groups, the CH₂ groups and the CH, noticing which ones are mirror-equivalent.']
    };
  }
  throw new Error('no halogenation problem');
}
function prepProblem(rng, skill) {
  if (skill === 'halide-naming') return halogenationProblem(rng);
  if (skill === 'sn2') return alcoholProblem(rng);
  return rng() < 0.65 ? alcoholProblem(rng) : halogenationProblem(rng);
}

// ---------------------------------------------------------------- registry
const TASKS = {
  sn2: (rng) => sn2Problem(rng), sn1: (rng) => sn1Problem(rng), e2: (rng) => e2Problem(rng), e1: (rng) => e1Problem(rng), which: (rng) => whichProblem(rng),
  rate: (rng, skill) => rateProblem(rng, skill), leaving: (rng) => leavingProblem(rng), name: (rng, skill, o) => nameProblem(rng, o.nameGen), grignard: (rng) => grignardProblem(rng), prep: (rng, skill) => prepProblem(rng, skill)
};
const BY_SKILL = {
  sn2: ['sn2', 'rate', 'leaving', 'prep'], sn1: ['sn1', 'rate'], e2: ['e2'], e1: ['e1'], 'sub-vs-elim': ['which', 'rate'], grignard: ['grignard'], 'halide-naming': ['name', 'prep']
};
export const HALIDE_SKILLS = Object.keys(BY_SKILL);
export const HALIDE_TASKS = Object.keys(TASKS);
export function makeHalideProblem(rng, task, { skill = null, nameGen = null } = {}) {
  const f = TASKS[task];
  if (!f) throw new Error('unknown task ' + task);
  return f(rng, skill, { nameGen });
}
export function generateHalides(count, { skill = null, rng = Math.random, tasks: only = null, nameGen = null } = {}) {
  const tasks = resolveTasks(only, skill && BY_SKILL[skill] ? BY_SKILL[skill] : HALIDE_TASKS, TASKS);
  const sk = only ? null : skill;
  const out = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    let p, tries = 0;
    do { p = makeHalideProblem(rng, pick(rng, tasks), { skill: sk, nameGen }); tries++; } while (last && JSON.stringify([p.prompt, p.equation, p.smiles]) === last && tries < 8);
    last = JSON.stringify([p.prompt, p.equation, p.smiles]);
    out.push(p);
  }
  return out;
}
export { MINUS };
