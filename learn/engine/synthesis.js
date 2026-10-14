// Sequence engine for the `synthesis-planner` widget (Lesson 12, McMurry 4.11 and problems 4.46 / 4.47): reagent cards, what each card does to the molecule in hand,
// and a grader that RUNS the learner's sequence on the engine (engine/reactions-alkynes.js) and compares the final product with the target by canonical isomeric SMILES.
// The state in hand is one species: a neutral molecule, or an acetylide anion (the intermediate after NaNH2). Every wrong card gets its own reason.
// Re-exported by engine/reactions.js. No DOM, no RDKit at import time.
import { analyze, canon } from './chem.js';
import { ALKYNE_RXN, alkyneSites, predictAlkyne, acetylideOf, halideClass, alkylateAcetylide, ALKYNE_PKA, deprotonates, saturate } from './reactions-alkynes.js';
import { nameBothAny } from './naming-chain.js';
import { ACID } from './acidbase.js';
import { predictEAS, reduceNitro, BENZENE, EAS, predictSubst, oxidizeSideChain, ringGroups, DIRECTORS, dirDirects } from './reactions-aromatic.js';
import { arene, relation } from './naming-arene.js';

/** Reagent cards. kind: 'base' (NaNH₂, NaOH), 'rx' (an alkyl halide), 'rxn' (a reagent that reacts with the C≡C: key into ALKYNE_RXN). */
export const CARDS = {
  NaNH2: { id: 'NaNH2', kind: 'base', label: 'NaNH₂', baseId: 'ammonia' },
  NaOH: { id: 'NaOH', kind: 'base', label: 'NaOH', baseId: 'water' },
  CH3Br: { id: 'CH3Br', kind: 'rx', label: 'CH₃Br', smiles: 'CBr' },
  EtBr: { id: 'EtBr', kind: 'rx', label: 'CH₃CH₂Br', smiles: 'CCBr' },
  PrBr: { id: 'PrBr', kind: 'rx', label: 'CH₃CH₂CH₂Br', smiles: 'CCCBr' },
  BuBr: { id: 'BuBr', kind: 'rx', label: 'CH₃CH₂CH₂CH₂Br', smiles: 'CCCCBr' },
  iPrBr: { id: 'iPrBr', kind: 'rx', label: '(CH₃)₂CHBr', smiles: 'CC(C)Br' },
  tBuBr: { id: 'tBuBr', kind: 'rx', label: '(CH₃)₃CBr', smiles: 'CC(C)(C)Br' },
  ...Object.fromEntries(['H2O_Hg', 'H2_Lindlar', 'H2_Pd', 'HBr_1', 'HBr_2', 'Br2_1', 'Br2_2', 'HCl_1', 'HCl_2', 'Cl2_1', 'Cl2_2'].map((k) => [k, { id: k, kind: 'rxn', key: k, label: ALKYNE_RXN[k].label }]))
};
export const CARD_IDS = Object.keys(CARDS);
// Lesson 13: reagent cards for aromatic substitution on benzene and the nitro -> amine reduction (applied by applyAreneCard below).
Object.assign(CARDS, {
  Br2_FeBr3: { id: 'Br2_FeBr3', kind: 'eas', label: 'Br₂, FeBr₃', reagent: 'Br2' },
  Cl2_FeCl3: { id: 'Cl2_FeCl3', kind: 'eas', label: 'Cl₂, FeCl₃', reagent: 'Cl2' },
  HNO3_H2SO4: { id: 'HNO3_H2SO4', kind: 'eas', label: 'HNO₃, H₂SO₄', reagent: 'HNO3' },
  SO3_H2SO4: { id: 'SO3_H2SO4', kind: 'eas', label: 'SO₃, H₂SO₄', reagent: 'SO3' },
  MeCl_AlCl3: { id: 'MeCl_AlCl3', kind: 'eas', label: 'CH₃Cl, AlCl₃', reagent: 'RCl', halide: 'CCl' },
  EtCl_AlCl3: { id: 'EtCl_AlCl3', kind: 'eas', label: 'CH₃CH₂Cl, AlCl₃', reagent: 'RCl', halide: 'CCCl' },
  tBuCl_AlCl3: { id: 'tBuCl_AlCl3', kind: 'eas', label: '(CH₃)₃CCl, AlCl₃', reagent: 'RCl', halide: 'CC(C)(C)Cl' },
  AcCl_AlCl3: { id: 'AcCl_AlCl3', kind: 'eas', label: 'CH₃COCl, AlCl₃', reagent: 'RCOCl', halide: 'CC(=O)Cl' },
  Fe_H3O: { id: 'Fe_H3O', kind: 'red', label: 'Fe (or Sn, SnCl₂), H₃O⁺; then HO⁻' }
});
// Lesson 14: the side-chain oxidation card. The Lesson 14 planner (config.directors) runs the substituted-ring engine; without it the old Lesson 13 rules apply unchanged.
Object.assign(CARDS, { KMnO4_H2O: { id: 'KMnO4_H2O', kind: 'ox', label: 'KMnO₄, H₂O' } });

/** A card on a molecule with a benzene ring (Lesson 13). Returns the same {ok, state, note} / {ok:false, code, diag} shape as applyCard. */
function applyAreneCard(state, card) {
  if (state.kind === 'acetylide') return { ok: false, code: 'anion', diag: 'The acetylide anion is not a benzene ring: this card needs a ring to react with.' };
  const isRing = !!arene(state.smiles);
  if (card.kind === 'red') {
    const out = isRing ? reduceNitro(state.smiles) : null;
    if (!out) return { ok: false, code: 'noNitro', diag: 'Fe with H₃O⁺ (then HO⁻) reduces a nitro group, –NO₂, to an amine, –NH₂. There is no nitro group on the ring at this point, so there is nothing to reduce: nitrate the ring first.' };
    return { ok: true, state: { kind: 'neutral', smiles: out }, note: 'Fe (or Sn, SnCl₂) with H₃O⁺ reduces –NO₂ to –NH₃⁺; HO⁻ then removes the extra H⁺, so the product is the arylamine, –NH₂.' };
  }
  if (!isRing) return { ok: false, code: 'noRing', diag: 'This is an aromatic substitution reagent, and there is no benzene ring in the molecule at this point.' };
  const pred = predictEAS(state.smiles, card.reagent, card.halide || null);
  if (!pred.ok) {
    const why = pred.code === 'notBenzene' ? 'The ring already carries a group, so where the next group would go depends on directing effects (Lesson 14). The plans here need only ONE substitution on the ring.' : pred.why;
    return { ok: false, code: pred.code, diag: why };
  }
  return { ok: true, state: { kind: 'neutral', smiles: pred.product }, note: `${EAS[card.reagent].Elabel === 'R⁺' ? 'The carbocation' : 'The electrophile ' + EAS[card.reagent].Elabel} is attacked by the ring’s π electrons, then H⁺ leaves: one H on the ring is replaced.` };
}

// ---------------------------------------------------------------- Lesson 14: cards on rings with groups (planner option `directors`)
// The state may carry `pool`: the isomers made so far (ortho + para are formed together; the book says to assume they can be separated). A card is applied to every member.
const NOTE_REL = { ortho: 'ortho', para: 'para', meta: 'meta' };
function oneDirectorCard(smiles, card) {
  if (card.kind === 'red') {
    const out = ringGroups(smiles).ok ? reduceNitro(smiles) : null;
    return out ? { products: [out], note: 'Fe (or Sn, SnCl₂) with H₃O⁺ (then HO⁻) reduces –NO₂ to –NH₂. Nothing else on the ring changes.' } : { fail: { code: 'noNitro', diag: 'Fe with H₃O⁺ (then HO⁻) reduces a nitro group, –NO₂, to an amine, –NH₂. There is no nitro group on the ring at this point, so there is nothing to reduce: nitrate the ring first.' } };
  }
  if (card.kind === 'ox') {
    const r = oxidizeSideChain(smiles);
    if (!r.ok) return { fail: { code: r.code, diag: r.why } };
    if (!r.reacts) return { fail: { code: 'nothing', diag: r.why } };
    return { products: [r.product], note: 'KMnO₄ oxidises every alkyl group that has a benzylic H to –CO₂H (the ortho/para-directing CH₃ becomes the meta-directing CO₂H).' };
  }
  if (!ringGroups(smiles).ok) return { fail: { code: 'noRing', diag: 'This is an aromatic substitution reagent, and the molecule in hand is not a benzene ring it can work on.' } };
  const pred = predictSubst(smiles, card.reagent, card.halide || null);
  if (!pred.ok) return { fail: { code: pred.code, diag: pred.why } };
  let note;
  if (pred.outcome === 'none') note = `${EAS[card.reagent].Elabel === 'R⁺' ? 'The carbocation' : 'The electrophile ' + EAS[card.reagent].Elabel} is attacked by the ring’s π electrons, then H⁺ leaves: one H on the ring is replaced.`;
  else if (pred.outcome === 'op') note = `${DIRECTORS[pred.subs[0].id].label} is an ortho/para director, so the new group goes ortho and para to it. Both isomers form; the book assumes they can be separated.`;
  else if (pred.outcome === 'm') note = `${DIRECTORS[pred.subs[0].id].label} is a meta director, so the new group goes meta to it.`;
  else note = pred.why;
  return { products: pred.products, note };
}
function applyDirectorCard(state, card) {
  if (state.kind === 'acetylide') return { ok: false, code: 'anion', diag: 'The acetylide anion is not a benzene ring: this card needs a ring to react with.' };
  const members = state.pool && state.pool.length ? state.pool : [state.smiles];
  const outs = []; let fail = null, note = '';
  members.forEach((m) => {
    const r = oneDirectorCard(m, card);
    if (r.fail) { fail = fail || r.fail; return; }
    r.products.forEach((p) => { if (!outs.includes(p)) outs.push(p); });
    note = note || r.note;
  });
  if (!outs.length) return { ok: false, code: fail.code, diag: fail.diag };
  outs.sort();
  return { ok: true, state: { kind: 'neutral', smiles: outs[0], ...(outs.length > 1 ? { pool: outs } : {}) }, note };
}
const GROUP_REL_TEXT = { ortho: 'ortho (1,2)', meta: 'meta (1,3)', para: 'para (1,4)' };
/** The slip in a plan whose steps all ran but whose product is not the target, for rings (Lesson 14): usually the ORDER of the two substitutions. */
export function orderWhy(run, target, ids) {
  const fin = run.final.pool || [run.final.smiles];
  const head = `You made ${fin.map(say).join(' and ')}${fin.length > 1 ? ' (isomers, assumed separable)' : ''}, but the target is ${say(target)}.`;
  const T = ringGroups(target), F = ringGroups(fin[0]);
  const lab = (id) => DIRECTORS[id].label;
  if (!T.ok || !F.ok) return head;
  const tIds = T.subs.map((x) => x.id).sort(), fIds = F.subs.map((x) => x.id).sort();
  if (JSON.stringify(tIds) !== JSON.stringify(fIds)) {
    const missing = tIds.filter((x) => !fIds.includes(x)), extra = fIds.filter((x) => !tIds.includes(x));
    const bits = [];
    if (missing.length) bits.push(`The target has ${missing.map(lab).join(' and ')}, which your product does not.`);
    if (extra.length) bits.push(`Your product has ${extra.map(lab).join(' and ')}, which the target does not have.`);
    if (fIds.includes('alkyl') && tIds.includes('COOH')) bits.push('The alkyl group is still there: KMnO₄ turns it into –CO₂H.');
    return [head, ...bits].join(' ');
  }
  if (T.subs.length !== 2) return head;
  // two groups, same set: the positions are wrong, so the order of the steps is
  const relT = relation(T.subs[0].pos, T.subs[1].pos);
  let before = null;
  run.steps.forEach((st, i) => {
    if (!st.ok || CARDS[st.card].kind !== 'eas') return;
    const prevSmiles = i === 0 ? run.start : (run.steps[i - 1].state.pool || [run.steps[i - 1].state.smiles])[0];
    const g = prevSmiles ? ringGroups(prevSmiles) : null;
    const g2 = ringGroups((st.state.pool || [st.state.smiles])[0]);
    if (g && g.ok && g2.ok && g.subs.length === 1) {
      const rest = g2.subs.slice(); const k = rest.findIndex((x) => x.id === g.subs[0].id); if (k >= 0) rest.splice(k, 1);
      before = { first: g.subs[0].id, firstText: g.subs[0].text, added: rest[0] ? rest[0].id : null, addedText: rest[0] ? rest[0].text : '' };
    }
  });
  if (!before || !before.added) return head;
  const fd = dirDirects(before.first) === 'm' ? 'a meta director' : 'an ortho/para director';
  const went = dirDirects(before.first) === 'm' ? 'meta' : 'ortho and para';
  const out = [head, `${before.firstText} was already on the ring when ${before.addedText} went on. ${before.firstText} is ${fd}, so ${before.addedText} went ${went}; the target has the two groups ${GROUP_REL_TEXT[relT]} to each other.`];
  const mDir = T.subs.find((x) => dirDirects(x.id) === 'm'), opDir = T.subs.find((x) => dirDirects(x.id) === 'op');
  if (relT === 'meta') {
    if (mDir) out.push(`For a meta relationship the meta director ${lab(mDir.id)} has to be on the ring first, and then the other group goes meta to it.${mDir.id === 'COOH' && ids.includes('KMnO4_H2O') ? ' KMnO₄ turns CH₃ into –CO₂H, so do that step first.' : ''}`);
    else out.push('Two ortho/para directors cannot give a meta product this way.');
  } else if (opDir) out.push(`For ${relT === 'ortho' ? 'an' : 'a'} ${NOTE_REL[relT]} relationship the ortho/para director ${lab(opDir.id)} has to be on the ring first; the new group then goes ortho and para to it, and the isomers can be separated.`);
  return out.join(' ');
}

export const primaryHalideCards = () => CARD_IDS.filter((id) => CARDS[id].kind === 'rx' && ['methyl', 'primary'].includes(halideClass(CARDS[id].smiles)));

const nameOf = (smi) => { const n = nameBothAny(smi); return n ? n.new : null; };
const say = (smi) => nameOf(smi) || smi;

/** What kind of molecule is this? {type: 'alkyne'|'alkene'|'alkane'|'ketone'|'halide'|'other', nC, terminal} */
export function speciesType(smiles) {
  let info = null;
  try { info = analyze(smiles); } catch (e) { info = null; }
  if (!info) return { type: 'other', nC: 0 };
  const nC = info.atoms.filter((a) => a.sym === 'C').length;
  const hasHal = info.atoms.some((a) => ['F', 'Cl', 'Br', 'I'].includes(a.sym));
  const hasO = info.atoms.some((a) => a.sym === 'O');
  const trip = info.bonds.some((b) => (b.bo ?? 1) === 3);
  const dbl = info.bonds.some((b) => (b.bo ?? 1) === 2 && info.atoms[b.atoms[0]].sym === 'C' && info.atoms[b.atoms[1]].sym === 'C');
  let type = 'alkane';
  if (hasHal) type = 'halide';
  else if (hasO) type = 'ketone';
  else if (trip) type = 'alkyne';
  else if (dbl) type = 'alkene';
  return { type, nC };
}

const protonated = (acetylide) => acetylide.replace('[C-]', 'C');

/**
 * Apply one card to the species in hand. state = {kind: 'neutral' | 'acetylide', smiles}.
 * Returns {ok:true, state, note} or {ok:false, code, diag}. `reverted` marks an acid that just gives H⁺ back to an acetylide.
 */
export function applyCard(state, cardId, opts = {}) {
  const card = CARDS[cardId];
  if (!card) throw new Error('unknown card ' + cardId);
  if (card.kind === 'ox' || (opts.directors && (card.kind === 'eas' || card.kind === 'red'))) return applyDirectorCard(state, card);
  if (card.kind === 'eas' || card.kind === 'red') return applyAreneCard(state, card);
  if (state.kind === 'neutral' && arene(state.smiles)) return { ok: false, code: 'notAlkyne', diag: 'This card is one of the alkyne reactions of Lesson 12. It does nothing useful to a benzene ring here.' };
  const { kind, smiles } = state;
  const sp = kind === 'acetylide' ? { type: 'anion' } : speciesType(smiles);
  const alkyne = kind === 'neutral' && sp.type === 'alkyne' ? alkyneSites(smiles) : null;
  const terminal = !!alkyne && alkyne.ok && (alkyne.terminal !== null || alkyne.bothTerminal);

  if (card.kind === 'base') {
    const d = deprotonates(card.baseId);
    if (kind === 'acetylide') return { ok: false, code: 'repeat', diag: 'The molecule is already an acetylide anion; a second base does nothing.' };
    if (card.id === 'NaNH2') {
      if (terminal) return { ok: true, state: { kind: 'acetylide', smiles: acetylideOf(smiles) }, note: `NH₂⁻ (the conjugate base of NH₃, pKa ≈ ${ACID.ammonia.pka}) removes the terminal H (pKa ≈ ${ALKYNE_PKA}). The equilibrium favours the weaker acid, NH₃, so the acetylide anion forms.` };
      if (alkyne && alkyne.ok) return { ok: false, code: 'noH', diag: 'An internal alkyne has no H on the triple bond to remove: only a terminal alkyne, R–C≡C–H, is acidic (pKa ≈ 25). NaNH₂ does nothing useful here.' };
      return { ok: false, code: 'noH', diag: 'There is no terminal alkyne C–H (pKa ≈ 25) in this molecule for NaNH₂ to remove, so this step does nothing in this plan.' };
    }
    // NaOH
    if (terminal) return { ok: false, code: 'weakBase', diag: `Hydroxide is too weak a base for this. Its conjugate acid, water, has pKa ${ACID.water.pkaText}, which is LOWER than the alkyne’s ≈ ${ALKYNE_PKA}: the equilibrium lies on the side of the alkyne and HO⁻ (${d.favoured === 'left' ? 'left' : 'right'} side favoured), so almost no acetylide forms. Use a base whose conjugate acid has a pKa above 25, such as NaNH₂ (NH₃, ≈ 36).` };
    return { ok: false, code: 'noH', diag: 'NaOH does nothing useful to this molecule in this plan.' };
  }

  if (card.kind === 'rx') {
    const hc = halideClass(card.smiles);
    if (kind !== 'acetylide') return { ok: false, code: 'noAnion', diag: `An alkyl halide needs an acetylide anion to react with: a neutral alkyne is not nucleophilic enough. Make the acetylide anion first with NaNH₂ (that comes BEFORE the alkyl halide), then add ${card.label}.` };
    if (hc !== 'methyl' && hc !== 'primary') return { ok: false, code: 'notPrimary', diag: `A ${hc} alkyl halide will not work with an acetylide anion: only methyl and primary alkyl halides (RCH₂X) can be used. The book explains why in Chapter 7. Pick a primary halide, and, if the carbon skeleton needs it, build the branched piece into the alkyne instead.` };
    const prod = alkylateAcetylide(smiles, card.smiles);
    return { ok: true, state: { kind: 'neutral', smiles: prod }, note: `The acetylide carbon attacks the carbon of ${card.label} and Br⁻ leaves: a new C–C bond. The chain is longer and the product is an internal alkyne (or a longer terminal alkyne when acetylene was the start).` };
  }

  // reagents that react with the triple bond (or with alkenes)
  const rx = ALKYNE_RXN[card.key];
  if (kind === 'acetylide') {
    if (rx.kind === 'hydration' || rx.kind === 'HX') return { ok: true, state: { kind: 'neutral', smiles: protonated(smiles) }, reverted: true, note: `Water or acid simply gives H⁺ back to the acetylide anion (water, pKa ${ACID.water.pkaText}, is a far stronger acid than the alkyne, ≈ ${ALKYNE_PKA}). You are back at the alkyne, and the NaNH₂ step was wasted.` };
    return { ok: false, code: 'anion', diag: 'The acetylide anion is not the molecule this reagent is meant for. An acetylide has one job here: to attack an alkyl halide and build a longer chain. Do that first.' };
  }
  if (sp.type === 'alkyne' && alkyne && alkyne.ok) {
    try {
      const pred = predictAlkyne(smiles, card.key);
      if (pred.outcome === 'mixture') {
        const names = pred.products.map(say).join(' and ');
        return { ok: false, code: 'mixture', diag: `${say(smiles)} is unsymmetrical, so hydration puts OH on either carbon of the triple bond and gives a MIXTURE of two ketones (${names}), as the book says. The route does not give one pure product. Hydrate a terminal alkyne (a methyl ketone) or a symmetrical internal alkyne instead.` };
      }
      return { ok: true, state: { kind: 'neutral', smiles: pred.products[0] }, note: stepNote(pred) };
    } catch (e) {
      return { ok: false, code: 'excluded', diag: String(e.message).replace(/^excluded: /, 'Not covered here: ') };
    }
  }
  if (sp.type === 'alkene' || sp.type === 'alkane' || sp.type === 'ketone' || sp.type === 'halide') {
    if (rx.kind === 'pd' && sp.type === 'alkene') return { ok: true, state: { kind: 'neutral', smiles: saturate(smiles) }, note: 'H₂ over Pd/C also hydrogenates a C=C, so the alkene becomes the alkane.' };
    if (rx.kind === 'pd') return { ok: false, code: 'nothing', diag: 'H₂ over Pd/C is used on C≡C and C=C bonds. There is nothing here for it to reduce, so the step does nothing.' };
    if (rx.kind === 'lindlar') return { ok: false, code: 'nothing', diag: sp.type === 'alkene' ? 'The Lindlar catalyst takes an alkyne only as far as the alkene and goes no further. With no C≡C left, nothing happens.' : 'There is no C≡C left for the Lindlar catalyst to reduce, so the step does nothing.' };
    return { ok: false, code: 'noAlkyne', diag: 'No triple bond is left: the C≡C was already used up. This reagent is an alkyne reaction here (on an alkene it would start alkene chemistry from Lessons 09 and 10, which takes you away from the target).' };
  }
  return { ok: false, code: 'nothing', diag: 'This reagent has nothing to react with in the molecule at this point.' };
}

function stepNote(pred) {
  const rx = pred.rx;
  if (rx.kind === 'hydration') return 'Markovnikov hydration gives an enol, which tautomerises to the ketone: the C=O ends up on the more substituted carbon.';
  if (rx.kind === 'lindlar') return pred.stereo ? 'Lindlar stops at the alkene; both H atoms add to the same face (syn), so the cis (Z) alkene forms.' : 'Lindlar stops at the alkene.';
  if (rx.kind === 'pd') return 'H₂ over Pd/C adds two H₂: all the way to the alkane.';
  if (rx.kind === 'HX') return rx.equiv === 1 ? `H–${rx.X} adds Markovnikov and stops at the vinylic halide.` : `Two H–${rx.X} add, both ${rx.X} on the same carbon.`;
  return rx.equiv === 1 ? `${rx.X}₂ adds anti and stops at the 1,2-dihaloalkene.` : `Two ${rx.X}₂ add: a tetrahalide.`;
}

/** Run a list of card ids from a start molecule. steps[i] = {card, ok, state?, diag?, note?, name?}; stops at the first card that cannot be applied. */
export function runSequence(start, ids, opts = {}) {
  let state = { kind: 'neutral', smiles: canon(start) };
  const steps = [];
  for (const id of ids) {
    const r = applyCard(state, id, opts);
    if (!r.ok) { steps.push({ card: id, ok: false, code: r.code, diag: r.diag }); return { steps, ok: false, final: state, failedAt: steps.length - 1, start: canon(start) }; }
    state = r.state;
    steps.push({ card: id, ok: true, state, note: r.note, reverted: !!r.reverted, name: state.kind === 'neutral' ? nameOf(state.smiles) : null, names: state.pool ? state.pool.map(nameOf) : null });
  }
  return { steps, ok: true, final: state, failedAt: -1, start: canon(start) };
}

/** Why the final product is not the target: one concrete sentence per kind of slip. */
export function mismatchWhy(finalSmiles, target, ids = []) {
  if (arene(target) || arene(finalSmiles)) {
    const head0 = `You made ${say(finalSmiles)}, but the target is ${say(target)}.`;
    const tips0 = [];
    if (canon(finalSmiles) === BENZENE) tips0.push('The ring still has no group on it.');
    else if (reduceNitro(finalSmiles) && !reduceNitro(target)) tips0.push('The nitro group is still there: Fe (or Sn, SnCl₂) with H₃O⁺ (then HO⁻) reduces it.');
    else if (reduceNitro(target) && !reduceNitro(finalSmiles) && !arene(finalSmiles)) tips0.push('Check which group the target has on the ring.');
    else tips0.push('The group on the ring is not the one the target has: check which reagent puts that group on.');
    return [head0, ...tips0].join(' ');
  }
  const f = speciesType(finalSmiles), t = speciesType(target);
  const last = ids[ids.length - 1];
  const head = `You made ${say(finalSmiles)}, but the target is ${say(target)}.`;
  const tips = [];
  if (f.nC < t.nC) tips.push('The chain is too short: an acetylide plus an alkyl halide adds the missing carbons (CH₃Br adds 1, CH₃CH₂Br adds 2, CH₃CH₂CH₂Br adds 3).');
  else if (f.nC > t.nC) tips.push('The chain is too long: use a smaller primary alkyl halide, or start from a smaller alkyne.');
  const pair = f.type + '>' + t.type;
  const T = {
    'alkyne>ketone': 'It is still an alkyne: hydration (H₂O, H₂SO₄, HgSO₄) is the step that puts the C=O in.',
    'alkyne>alkene': 'It is still an alkyne: H₂ with the Lindlar catalyst takes it to the cis alkene.',
    'alkyne>alkane': 'It is still an alkyne: 2 equivalents of H₂ over Pd/C take it to the alkane.',
    'alkene>ketone': (last === 'H2_Lindlar' ? 'Lindlar gives the alkene, not a ketone. ' : '') + 'A ketone comes from HYDRATING the alkyne (H₂O, H₂SO₄, HgSO₄), so that step has to act on the C≡C, before it is reduced.',
    'alkene>alkane': 'Lindlar stops at the alkene. Two equivalents of H₂ over Pd/C go all the way to the alkane.',
    'alkane>alkene': 'Pd/C with H₂ goes all the way to the alkane. The Lindlar catalyst is the one that stops at the cis alkene.',
    'alkane>ketone': 'Pd/C removes the triple bond completely. The C=O has to come from hydrating the alkyne, before any reduction.',
    'alkane>alkyne': 'Pd/C with H₂ reduced the triple bond completely; the target keeps its triple bond, so no hydrogenation is wanted.',
    'alkene>alkyne': 'The triple bond was reduced; the target still has one, so no hydrogenation is wanted.',
    'ketone>alkene': 'The alkyne was hydrated to a ketone. The target is an alkene, which needs H₂ and the Lindlar catalyst on the alkyne instead.',
    'ketone>alkane': 'The alkyne was hydrated to a ketone. The target is an alkane: use 2 equivalents of H₂ over Pd/C on the alkyne.',
    'ketone>alkyne': 'The alkyne was hydrated to a ketone; the target is still an alkyne, so leave the hydration out.',
    'halide>ketone': 'A reagent such as HBr or Br₂ added halogen atoms; the target has none.',
    'halide>alkene': 'A reagent such as HBr or Br₂ added halogen atoms; the target has none.',
    'halide>alkane': 'A reagent such as HBr or Br₂ added halogen atoms; the target has none.',
    'halide>alkyne': 'A reagent such as HBr or Br₂ added halogen atoms; the target has none.',
    'alkyne>alkyne': tips.length ? '' : 'Same kind of compound but a different structure: check which alkyl halide (and how many carbons) you used.',
    'alkene>alkene': tips.length ? '' : 'Both are alkenes but not the same one: check the alkyl halide and the order of the steps.',
    'ketone>ketone': tips.length ? '' : 'Both are ketones but not the same one: check the alkyl halide and the starting alkyne.'
  };
  if (T[pair]) tips.push(T[pair]);
  return [head, ...tips.filter(Boolean)].join(' ');
}

/**
 * Grade a learner's sequence. Returns {ok, code, diagnosis, run}: code 'empty' | 'step' | 'anion' | 'wrong' | 'ok'.
 * The sequence is RUN on the engine; only the final product (canonical isomeric SMILES) is compared with the target.
 */
export function gradeSequence(start, target, ids, opts = {}) {
  if (!ids.length) return { ok: false, code: 'empty', diagnosis: 'Choose at least one reagent card and put the cards in the order you would use them.', run: null };
  const run = runSequence(start, ids, opts);
  if (!run.ok) {
    const st = run.steps[run.failedAt];
    return { ok: false, code: 'step', failedAt: run.failedAt, diagnosis: `Step ${run.failedAt + 1} (${CARDS[st.card].label}): ${st.diag}`, run };
  }
  if (opts.directors) {
    const pool = run.final.pool || [run.final.smiles];
    if (pool.includes(canon(target))) return { ok: true, code: 'ok', diagnosis: '', run, wasted: false, pool };
    return { ok: false, code: 'wrong', diagnosis: orderWhy(run, target, ids), run };
  }
  if (run.final.kind === 'acetylide') return { ok: false, code: 'anion', diagnosis: `Your plan ends with the acetylide anion. It still has to react with an alkyl halide (a primary one) to make the new C–C bond and the target, ${say(target)}.`, run };
  if (canon(run.final.smiles) === canon(target)) {
    const wasted = run.steps.some((s) => s.reverted);
    return { ok: true, code: 'ok', diagnosis: '', run, wasted };
  }
  const undone = run.steps.some((x) => x.reverted) ? ' Note that an acid (or water) undoes an acetylide anion, so the alkyl halide step has to come before any hydration.' : '';
  return { ok: false, code: 'wrong', diagnosis: mismatchWhy(run.final.smiles, target, ids) + undone, run };
}

/** Every sequence of at most maxLen cards from `deck` that runs without a failed step and ends at the target. */
export function solveSequences(start, target, deck, maxLen = 4, opts = {}) {
  const out = [];
  const want = canon(target);
  const go = (state, seq) => {
    if (seq.length && state.kind === 'neutral' && (opts.directors ? (state.pool || [state.smiles]).includes(want) : state.smiles === want)) out.push(seq.slice());
    if (seq.length >= maxLen) return;
    for (const id of deck) {
      const r = applyCard(state, id, opts);
      if (!r.ok || r.reverted) continue;
      seq.push(id); go(r.state, seq); seq.pop();
    }
  };
  go({ kind: 'neutral', smiles: canon(start) }, []);
  return out;
}
