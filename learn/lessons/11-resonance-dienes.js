// Lesson 11: Resonance and conjugated dienes (McMurry ch. 4, sections 4.8 to 4.10).
// Original wording throughout; book problems are referenced by number only.
// Everything chemical is computed: resonance forms by engine/resonance.js (checked against RDKit's ResonanceMolSupplier, tools/check_resonance.py),
// the diene + HX products and mechanisms by engine/reactions-dienes.js. Drawn answers below were generated from those engines and tests/lesson11.mjs
// recomputes each one (option `chk`). Mechanisms are getters, so they are built when the widget mounts (RDKit is ready by then).
// Not covered, because the book does not cover it: kinetic against thermodynamic control of the 1,2/1,4 ratio, Diels-Alder, radical resonance.
import { dieneMechanism } from '../engine/reactions.js';

const opt = (text, correct, why, extra = {}) => ({ text, ...(correct ? { correct: true } : {}), why, ...extra });
const mo = (smiles, label, correct, why, extra = {}) => ({ smiles, label, ...(correct ? { correct: true } : {}), why, ...extra });
const mols = (list) => list.map(([s, l]) => `<mol smiles="${s}" label="${l}"></mol>`).join(' + ');

/** Move the correct option to a different place in each question (deterministic), so the right answer is not always first. */
function arrange(lesson) {
  // the caveman copies of the options (st.caveman.options, in the same order as options) move together with the options they belong to
  const place = (opts, k, cv) => { const n = opts.length, i = opts.findIndex((o) => o.correct); const [c] = opts.splice(i, 1); opts.splice(k % (opts.length + 1), 0, c); if (cv && cv.length === n) { const [d] = cv.splice(i, 1); cv.splice(k % (cv.length + 1), 0, d); } };
  lesson.steps.forEach((st, n) => {
    if (st.options && (st.type === 'predict' || st.type === 'choice')) place(st.options, n % st.options.length, st.caveman && st.caveman.options);
    if (st.type === 'worked') st.moves.forEach((m, k) => place(m.options, (n + k) % m.options.length, st.caveman && st.caveman.moves && st.caveman.moves[k] && st.caveman.moves[k].options));
  });
  return lesson;
}

export default arrange({
  id: '11', slug: 'resonance-dienes', title: 'Resonance & conjugated dienes', minutes: 28,
  chapter: 4, sections: ['4.8', '4.9', '4.10'],
  drawing: 'skeletal',
  goals: [
    'Draw the resonance forms of the allyl cation, acetate and the benzyl cation with curved arrows, and spot structures that are NOT valid forms',
    'Explain why a resonance hybrid, with its charge shared over several atoms, is more stable than any single form',
    'Describe a conjugated diene as four coplanar sp² carbons whose p orbitals overlap across the central single bond',
    'Predict the 1,2- and 1,4-addition products of HX with a conjugated diene and draw the mechanism through the allylic cation'
  ],
  steps: [
    {
      caveman: {"prompt":"Two <b>primary</b> carbocations (C⁺ one carbon neighbour): <b>allyl cation</b> <mol smiles=\"[CH2+]C=C\" label=\"allyl cation, CH₂=CH–CH₂⁺\"></mol> and <b>propyl cation</b> <mol smiles=\"[CH2+]CC\" label=\"propyl cation, CH₃CH₂CH₂⁺\"></mol>. Lesson 09: which more stable, why?","reveal":"<b>Allyl cation</b> much more stable. Empty p orbital overlaps next π bond: + shared by two end carbons. Next: draw exactly how.","options":[{"why":"Yes. Charge shared by two atoms steadier. Sharing = resonance."},{"why":"Lesson 09 compared alkyl group counts on C⁺. Here both primary. C=C beside C⁺ does far more than alkyl group."},{"why":"Neighbour count is only part. Allyl cation: π bond next to C⁺, π electrons reach empty orbital: much more stable."},{"why":"Pulling density AWAY from positive carbon destabilises. Real reason: π electrons shared with empty orbital."}]}, // CAVEMAN
      id: 's01', type: 'predict', skill: 'resonance',
      prompt: 'Two carbocations are both <b>primary</b>: the C⁺ has just one carbon neighbour. One is the <b>allyl cation</b> <mol smiles="[CH2+]C=C" label="allyl cation, CH₂=CH–CH₂⁺"></mol>, the other the <b>propyl cation</b> <mol smiles="[CH2+]CC" label="propyl cation, CH₃CH₂CH₂⁺"></mol>. From Lesson 09, which do you expect to be more stable, and why?',
      options: [
        opt('The allyl cation: its C⁺ sits next to a C=C, so the + charge is spread over two carbons', true, 'Yes. A charge shared by two atoms is steadier than a charge stuck on one. Chemists call this sharing resonance.'),
        opt('The propyl cation: it has an extra CH₂ group, and more alkyl groups make a cation more stable', false, 'Lesson 09 compared cations with different numbers of alkyl groups on C⁺. Here both C⁺ carbons have one carbon neighbour, so they are both primary. The C=C beside the C⁺ in the allyl cation does something far stronger than an alkyl group does.'),
        opt('They are equally stable, because both are primary carbocations with one carbon neighbour', false, 'Counting carbon neighbours is only part of the story. The allyl cation has a π bond right next to the C⁺, and the π electrons can reach the empty orbital. That makes it much more stable than the propyl cation.'),
        opt('The allyl cation, because sp² carbons are more electronegative and pull electron density toward the + charge', false, 'Pulling electron density AWAY from a positive carbon would make a cation less stable, not more. The real reason is that the π electrons are shared with the empty orbital.')
      ],
      reveal: 'The <b>allyl cation</b> is much more stable. Its empty p orbital overlaps the π bond next to it, so the + charge is not stuck on one carbon: it is shared by the two end carbons. Next you will draw exactly how.'
    },
    {
      caveman: {"prompt":"Allyl cation: C⁺ has <b>empty p orbital</b> beside C=C. Where can π electrons go to help C⁺? Draw curved arrow (electrons start to destination), Check. Only electrons move.","worked":"One arrow: C=C π bond to C–C single bond beside C⁺. Single becomes double; far carbon loses π share: new C⁺. Same atoms, same σ bonds, same +1 charge.","hints":["Arrows start at electrons: tap C=C π bond first.","Pair ends between middle carbon and old C⁺: tap that single bond. Check."]}, // CAVEMAN
      id: 's02', type: 'try', skill: 'resonance', widget: 'resonance-drawer',
      prompt: 'Here is the allyl cation with every atom drawn. Its C⁺ has an <b>empty p orbital</b> next to a C=C. Where could the π electrons of the C=C go to help the C⁺? Draw the curved arrow (it starts at electrons and points to where they end up), then press Check. Atoms never move, only electrons.',
      config: { start: '[CH2+]C=C', name: 'allyl cation' },
      confirm: 'The π pair became a new π bond next to the old C⁺, so the + charge moved to the other end carbon. Both drawings are the same ion, joined by ↔. In the hybrid each end carbon holds half of the + charge (δ+).',
      hints: ['Arrows start at electrons. Here the electrons that can move are the C=C π bond: tap that double bond first.', 'The pair ends up between the middle carbon and the old C⁺, so tap the single bond between them as the destination. Then press Check.'],
      worked: 'One arrow: from the C=C π bond to the C–C single bond next to the C⁺. That single bond becomes a double bond, and the carbon at the far end loses its share of the π pair, so it becomes the new C⁺. Same atoms, same σ bonds, same +1 charge.'
    },
    {
      caveman: {"html":"<p><b>Resonance forms.</b> Neither drawing real alone. Real ion = <b>resonance hybrid</b>: each end carbon half the + (δ+), both C–C bonds between single and double. Join with ↔. Charge over more atoms steadies: allylic cations (+ next to C=C) beat ordinary.</p>"}, // CAVEMAN
      id: 's03', type: 'explain', skill: 'resonance',
      html: '<p><b>Resonance forms.</b> Neither drawing of the allyl cation is real alone. The ion has one fixed structure, a <b>resonance hybrid</b> of both: each end carbon holds half the + charge (δ+) and both C–C bonds lie between single and double. We join the drawings with a double-headed arrow, ↔. Spreading charge over more atoms steadies it, so allylic cations (the + next to a C=C) beat ordinary ones.</p>'
    },
    {
      caveman: {"prompt":"Lesson 03: <b>acetate ion</b>. One O drawn C=O, other C–O⁻. Find other resonance form. <b>Two</b> arrows (lone pair, π bond). Check when drawn.","worked":"Arrow 1: O⁻ lone pair → C–O bond (becomes C=O). Arrow 2: C=O π bond → other oxygen (O⁻, third lone pair). Carbon four bonds, charge −1, no atom moved.","hints":["First arrow starts at O⁻ lone pair (dots), aims at O–C bond.","Second arrow: C=O π bond to that oxygen: takes π pair from carbon (else five bonds)."]}, // CAVEMAN
      id: 's04', type: 'try', skill: 'resonance', widget: 'resonance-drawer',
      prompt: 'Back to Lesson 03: the <b>acetate ion</b>. One oxygen is drawn with C=O, the other with C–O⁻. Find its other resonance form. This one needs <b>two</b> arrows (one from a lone pair, one from a π bond). Press Check when both are drawn.',
      config: { start: 'CC(=O)[O-]', name: 'acetate ion' },
      confirm: 'The lone pair on the O⁻ became a C=O π bond, and the old C=O π pair moved onto the other oxygen. Now each oxygen carries half the − charge in the hybrid, which is why both C–O bonds of acetate have the same length.',
      hints: ['Start the first arrow at a lone pair (the dots) on the O⁻ and aim it at the bond between that oxygen and the carbon.', 'The second arrow starts at the C=O π bond and ends on that oxygen: it takes the π pair away from carbon, which would otherwise have five bonds.'],
      worked: 'Arrow 1: lone pair on the O⁻ → the C–O bond (it becomes C=O). Arrow 2: the C=O π bond → onto the other oxygen (it becomes O⁻ with a third lone pair). The carbon still has four bonds, the total charge is still −1, and no atom moved.'
    },
    {
      caveman: {"prompt":"Only one is a <b>valid</b> resonance form of acetate ion. Other three break a rule. Which?","worked":"Form: same atoms places, same total charge, valid Lewis. A swaps which O has double bond and −. B moved H; C: carbon five bonds; D lost −.","hints":["Compare with acetate: atoms same places? total charge same? octets kept (carbon: four bonds max)?","B: H on different atom. C: carbon five bonds. D: different charge. Valid form moved lone pair and π pair."],"options":[{"why":"Yes. Same atoms joined same way, charge −1, every octet kept. Only lone pair and π pair moved."},{"why":"H moved from carbon to oxygen: different molecule, not resonance. Atoms and σ bonds never move."},{"why":"Carbon five bonds (ten electrons). Never more than four: invalid."},{"why":"No − charge: neutral, unpaired electron on O. Resonance forms keep total charge (−1): only electrons move, none added or removed."}]}, // CAVEMAN
      id: 's05', type: 'choice', skill: 'resonance',
      prompt: 'Only one of these is a <b>valid</b> resonance form of the acetate ion shown above. The other three break a rule of resonance. Which one is valid?',
      smiles: 'CC(=O)[O-]',
      options: [
        mo('CC([O-])=O', 'Option A', true, 'Yes. The same atoms are joined in the same way, the total charge is still −1, and every atom keeps its octet. Only a lone pair and a π pair moved.', { chk: { code: 'ok' } }),
        mo('[CH2-]C(=O)O', 'Option B', false, 'An H has moved from the carbon to an oxygen. That changes how the atoms are joined, so it is a different molecule (the anion of an acid with a C–H removed), not a resonance form. Atoms and σ bonds never move.', { chk: { code: 'moved' } }),
        mo('[CH3][C](=[O])=[O]', 'Option C', false, 'This carbon has five bonds (one single and two double bonds), ten electrons. Carbon can never have more than four bonds, so this is not a valid Lewis structure and not a resonance form.', { raw: true, chk: { code: 'octet' } }),
        mo('[CH3][C]([O])=[O]', 'Option D', false, 'There is no − charge any more: the structure is neutral with an unpaired electron on oxygen. Resonance forms must have the same total charge as the start (−1), because only electrons move around, none are added or removed.', { chk: { code: 'charge' } })
      ],
      hints: ['Compare each option with acetate above, asking three questions: are all atoms in the same places, is the total charge the same, and does every atom keep to its octet (carbon: four bonds at most)?', 'Option B has an H on a different atom, option C has a carbon with five bonds, and option D has a different total charge. The valid form only moved a lone pair and a π pair.'],
      worked: 'A resonance form must keep every atom where it was, keep the same total charge, and be a valid Lewis structure. Option A swaps which oxygen carries the double bond and the − charge. Option B moved an H, C gives carbon five bonds, and D lost the − charge.'
    },
    {
      caveman: {"prompt":"<b>Benzyl cation</b>: CH₂⁺ on benzene ring. Find <b>all four</b> resonance forms: slide ring π bond toward C⁺, repeat. Press a form to start from it. (Ring bond shifts count once.)","worked":"Form 1: + on CH₂. Arrow: nearest ring π bond to CH₂–ring bond: + on ortho carbon (form 2). Next: para (form 3). Next: other ortho (form 4). Four carbons share +.","hints":["Start with ring bond nearest CH₂⁺: arrow from that π bond to ring–CH₂ bond: C=C there, + into ring.","From form with + in ring: arrow from π bond next to new C⁺. Round ring: ortho, para, second ortho. The meta carbons never get it."]}, // CAVEMAN
      id: 's06', type: 'try', skill: 'resonance', widget: 'resonance-drawer',
      prompt: 'The <b>benzyl cation</b> has a CH₂⁺ next to a benzene ring. Its empty p orbital overlaps the ring’s π bonds. Find <b>all four</b> resonance forms: slide a ring π bond toward the C⁺, then keep going. Press a form in the row to start from it. (Two drawings that differ only in which ring bonds are double count as one.)',
      config: { start: '[CH2+]C1=CC=CC=C1', fold: true, name: 'benzyl cation' },
      confirm: 'Four forms: the + charge on the CH₂ carbon, then on an ortho carbon, the para carbon, and the other ortho carbon. The charge is shared by four carbons, which is why benzylic cations are more stable than ordinary ones.',
      hints: ['Start with the ring bond closest to the CH₂⁺: one arrow from that π bond to the bond between the ring and the CH₂ makes a C=C there and moves the + into the ring.', 'From a form with + inside the ring, draw the arrow again from a π bond next to the new C⁺. Going around the ring you reach the ortho, para and the second ortho carbon. The meta carbons never get the charge.'],
      worked: 'Form 1: + on CH₂. Arrow from the nearest ring π bond to the CH₂–ring bond: + moves to an ortho carbon (form 2). Next arrow from the π bond beyond it: + on the para carbon (form 3). Next: + on the other ortho carbon (form 4). Four carbons share the charge.'
    },
    {
      caveman: {"prompt":"<b>Pentadienyl cation</b> <mol smiles=\"[CH2+]C=CC=C\" label=\"CH₂⁺–CH=CH–CH=CH₂\"></mol>: C⁺ at end of two conjugated C=C. Resonance forms, counting shown?","worked":"Form 1: + on C1. Slide C2=C3 π: + on C3 (form 2). Slide C4=C5 π: + on C5 (form 3). C2, C4 cannot carry +. Three forms, charge on three carbons: more forms, more stable.","hints":["Slide first π bond toward C⁺. Repeat from new structure. Stop at repeats.","+ lands on every second carbon: end, middle, other end."]}, // CAVEMAN
      id: 's07', type: 'input', skill: 'resonance',
      prompt: 'Count the forms. The <b>pentadienyl cation</b> <mol smiles="[CH2+]C=CC=C" label="CH₂⁺–CH=CH–CH=CH₂"></mol> has a C⁺ at the end of two conjugated C=C bonds. How many resonance forms does it have, counting the one shown?',
      answer: 3, resonanceCount: { start: '[CH2+]C=CC=C' },
      diagnose: [
        { match: 2, why: 'Two forms move the + charge only one step. Slide the second π bond too: from the form with + on C3 you can draw another arrow and the + reaches C5.' },
        { match: 5, why: 'The + charge can sit only on carbons 1, 3 and 5 of the chain. On carbons 2 and 4 it would need the π electrons to leave an atom that has no π bond to give.' }
      ],
      hints: ['Draw the form you get by sliding the first π bond toward the C⁺. Then do the same again from that new structure, and stop when you only get structures you already have.', 'The + charge lands on every second carbon of the chain: the end carbon, the middle carbon and the other end carbon.'],
      worked: 'Form 1: + on C1. Slide the C2=C3 π bond over: + on C3 (form 2). Slide the C4=C5 π bond over: + on C5 (form 3). Carbons 2 and 4 cannot carry the charge. So there are three forms, and the charge is shared by three carbons: the more forms, the more stable the ion.'
    },
    {
      caveman: {"prompt":"Glimpse of Lesson 13. <b>Benzene</b>, C₆H₆, three double bonds. <b>Three</b> arrows, each double bond to next single bond, same direction. Result?","worked":"Three arrows, each C=C to following C–C. Double becomes single, single double: other Kekulé form, all atoms in place, no charge.","hints":["Each arrow: double bond (π pair) to next single bond, one direction round ring.","Tap double bond, then single bond clockwise next. Repeat for other two, Check."]}, // CAVEMAN
      id: 's08', type: 'try', skill: 'resonance', widget: 'resonance-drawer',
      prompt: 'A glimpse of Lesson 13. <b>Benzene</b>, C₆H₆, is drawn here with three double bonds. Draw <b>three</b> arrows, each from a double bond to the single bond next to it, all going the same way around the ring. What do you get?',
      config: { start: 'C1=CC=CC=C1', name: 'benzene' },
      confirm: 'The double and single bonds swapped places: the second Kekulé form (the other way of placing the three double bonds). Neither is real. Benzene is a hybrid in which all six C–C bonds are the same, halfway between single and double (the dashed ring). This is why benzene is so stable; Lesson 13 builds on it.',
      hints: ['Each arrow starts at a double bond (its π pair) and ends at the single bond that comes next, going round the ring in one direction.', 'Tap a double bond, then the single bond clockwise next to it. Repeat for the other two double bonds so every π pair moves one place, then press Check.'],
      worked: 'Three arrows, each from a C=C bond to the C–C bond after it in the same direction. Every double bond becomes single and every single bond becomes double: the other Kekulé form, with all atoms in place and no charge anywhere.'
    },
    {
      caveman: {"html":"<p><b>Ground rules.</b> Forms imaginary; real species = hybrid, more stable. Only π electrons, lone pairs move; never atoms, σ bonds. Valid Lewis structure, same charge, no five-bond carbon. Pattern: p orbital or lone pair beside π bond (cations, anions, enolates, nitro, amides).</p>"}, // CAVEMAN
      id: 's09', type: 'explain', skill: 'resonance',
      html: '<p><b>The ground rules.</b> Forms are imaginary; the real species is the hybrid, more stable than any form. Only π electrons and lone pairs move; atoms and σ bonds never do (moving an H gives a different molecule). Every form is a valid Lewis structure with the same total charge and no carbon with five bonds. The pattern: a p orbital or lone pair next to a π bond (cations, anions, enolates, nitro, amides). More forms means more stability.</p>'
    },
    {
      caveman: {"prompt":"3D <b>buta-1,3-diene</b>, simplest <b>conjugated diene</b>: alternating double, single (C=C–C=C). Turn it. Four highlighted carbons: what, why matter?","worked":"Model = s-trans conformer (C=C opposite across C2–C3, about 180°), four carbons one plane. Each sp², one p perpendicular: four parallel p overlap in row: π electrons shared over all four.","hints":["Look along chain from side. All four in one sheet?","Count p orbitals: one per sp² carbon, perpendicular. All parallel: overlap in row."],"options":[{"why":"Yes. Each sp² with p orbital; flat: four p parallel, overlap whole chain. π electrons not stuck in two double bonds. C2–C3 stays single, some double-bond character."},{"why":"Not twisted: one plane. Twisted p could not overlap; these can."},{"why":"C2–C3 still single: one σ bond, only some double-bond character. Two π bonds total."},{"why":"All sp²: three groups, one p orbital. C2, C3 have p orbitals like C1, C4."}]}, // CAVEMAN
      id: 's10', type: 'choice', skill: 'dienes',
      prompt: 'This is a solid 3D model of <b>buta-1,3-diene</b>, the simplest <b>conjugated diene</b>: double bonds alternating with a single bond (C=C–C=C). Turn it around. What do you notice about the four highlighted carbons, and why does it matter?',
      visual: { widget: 'model3d', config: { mol: 'buta-1-3-diene', highlight: [0, 1, 2, 3], labels: { 0: 'C1', 1: 'C2', 2: 'C3', 3: 'C4' } } },
      options: [
        opt('All four carbons lie in one plane, so their p orbitals are parallel and overlap along the whole chain', true, 'Yes. Each carbon is sp² with a p orbital, and in a flat molecule all four p orbitals point the same way. They overlap, so the π electrons are not stuck in two separate double bonds. The C2–C3 bond stays a single bond, but with some double-bond character.'),
        opt('The two C=C bonds are twisted at 90° to each other, so the double bonds work separately and do not overlap', false, 'In the model they are not twisted: all four carbons are in one plane. Twisted p orbitals could not overlap, but these can.'),
        opt('The C2–C3 bond is a full double bond, because the two π bonds overlap across it and merge', false, 'C2–C3 is still a single bond: one σ bond. The overlapping p orbitals give it only some double-bond character. The four carbons have two π bonds in total.'),
        opt('C2 and C3 are sp³ carbons because each carries an H, so only C1 and C4 have p orbitals to overlap', false, 'Every carbon of C=C–C=C is sp²: three groups around it (the carbons or H atoms) and one p orbital. C2 and C3 have p orbitals just as C1 and C4 do.')
      ],
      hints: ['Rotate the model so you look along the chain from the side. Do all four highlighted carbons sit in one sheet?', 'Count the p orbitals: each sp² carbon has one, perpendicular to the plane. If they are all parallel, they can all overlap in a row.'],
      worked: 'The model is the s-trans conformer (the two C=C bonds point in opposite directions across C2–C3, a twist of about 180°) and all four carbons lie in one plane. Each is sp², so each has one p orbital perpendicular to that plane, and the four parallel p orbitals overlap in a row: the π electrons are shared over all four carbons.'
    },
    {
      caveman: {"prompt":"<b>One equivalent of HBr</b> (one HBr per diene) added to buta-1,3-diene. Lesson 09: one Markovnikov product per C=C. How many different bromides?","reveal":"Two: <b>3-bromobut-1-ene</b> (<b>1,2-addition</b>: H C1, Br C2) and <b>1-bromobut-2-ene</b> (<b>1,4-addition</b>: H C1, Br C4, C=C now C2=C3). Cause: allylic cation, H⁺ on C1, + shared.","options":[{"why":"Half the answer. Cation + shared by two carbons: Br⁻ attacks either."},{"why":"Yes. First: expected Markovnikov product. Second: C=C moved to C2=C3, H and Br on C1, C4."},{"why":"H⁺ adds only to end carbon: only stable cation. Inner carbons: unstable cation: no product."},{"why":"Conjugated diene still alkene: π electrons attack H⁺. Conjugation changes what happens next."}]}, // CAVEMAN
      id: 's11', type: 'predict', skill: 'dienes',
      prompt: 'Now the chemistry. <b>One equivalent of HBr</b> (one HBr molecule for each diene molecule) is added to buta-1,3-diene. Lesson 09 would give one Markovnikov product for each C=C. How many different bromides do you expect from this diene?',
      equation: { reactants: ['C=CC=C'], products: [], cond: 'HBr (1 equiv.)' },
      options: [
        opt('One: only the Markovnikov product, 3-bromobut-1-ene', false, 'That is half the answer. The cation made here is special: its + charge is shared by two carbons, and Br⁻ can attack either of them.'),
        opt('Two: 3-bromobut-1-ene and 1-bromobut-2-ene', true, 'Yes. The first is the expected Markovnikov product. The second looks odd: the C=C has moved to C2=C3 and H and Br have added to C1 and C4.'),
        opt('Four: H and Br could go on either carbon of either C=C', false, 'H⁺ adds only to an end carbon, because that is the only way to make the stable cation. Adding to the inner carbons would give a cation that is not stable, so those products do not form.'),
        opt('None: conjugation makes the diene unreactive toward HBr', false, 'A conjugated diene is still an alkene: its π electrons attack H⁺ just as before. Conjugation changes what happens next, not whether it happens.')
      ],
      reveal: 'Two products form: <b>3-bromobut-1-ene</b> (<b>1,2-addition</b>, H on C1 and Br on C2) and <b>1-bromobut-2-ene</b> (<b>1,4-addition</b>, H on C1 and Br on C4, with the C=C now between C2 and C3). The reason is an allylic carbocation: H⁺ adds to C1 and the + charge is shared.'
    },
    {
      caveman: {"prompt":"H⁺ adds to C1 or C2 of buta-1,3-diene. Which carbocation?","worked":"H⁺ to C1: + on C2 beside C3=C4: allylic secondary cation (CH₃–CH⁺–CH=CH₂ ↔ CH₃–CH=CH–CH₂⁺). H⁺ on C2: plain primary cation, no resonance: far higher energy.","hints":["Where does + end in each cation? Next to C=C: empty p overlaps π bond?","+ beside other C=C: allylic, two resonance forms. Other: none: far less stable."],"options":[{"why":"Yes. + on C2 beside remaining C=C: allylic, secondary, two resonance forms. Forms faster: more stable."},{"why":"H⁺ to inner carbon: + on end carbon C1, NOT next to C=C. Primary, no resonance: far less stable: not formed."},{"why":"π electrons attack H of HBr, as alkene in Lesson 09."}]}, // CAVEMAN
      id: 's12', type: 'choice', skill: 'dienes',
      prompt: 'H⁺ can add to C1 or to C2 of buta-1,3-diene. Which carbocation does the reaction go through?',
      equation: { reactants: ['C=CC=C'], products: [], cond: 'H⁺ (from HBr)' },
      options: [
        mo('C[CH+]C=C', 'H⁺ added to C1', true, 'Yes. The + charge sits on C2, right next to the remaining C=C: an allylic cation, secondary, with two resonance forms. It forms faster because it is the more stable cation.', { chk: { cation: 'C=C[CH+]C' } }),
        mo('[CH2+]CC=C', 'H⁺ added to C2', false, 'Here H⁺ went to the inner carbon, leaving the + charge on the end carbon C1, which is NOT next to the C=C. It is a primary cation with no resonance form: much less stable, so it is not formed.', { chk: { nonAllylic: 'C=CC[CH2+]' } }),
        mo('C=CC=C', 'no cation: the diene is not attacked', false, 'The diene is attacked: its π electrons react with the H of HBr, just as an ordinary alkene does in Lesson 09.')
      ],
      hints: ['Compare where the + charge ends up in each cation. Is it next to a C=C so that its empty p orbital can overlap a π bond?', 'The cation with the + charge beside the other C=C is allylic and has two resonance forms. The other has none, so it is far less stable.'],
      worked: 'H⁺ adds to the END carbon C1. That leaves the + on C2, next to the C3=C4 π bond: an allylic secondary cation (CH₃–CH⁺–CH=CH₂ ↔ CH₃–CH=CH–CH₂⁺). H⁺ on C2 would leave a plain primary cation on C1 with no resonance, which is much higher in energy.'
    },
    {
      caveman: {"prompt":"Draw <b>1,4 route</b>. <b>1</b>: π bond attacks H of H–Br (which carbon?), H–Br leaves with Br. <b>2</b>: π bond beside C⁺ slides (one arrow). <b>3</b>: Br⁻ attacks far C⁺.","worked":"Step 1: π bond (C1=C2) → H, H–Br → Br: C2 becomes C⁺. Step 2: π bond (C3=C4) → C2–C3: C4 becomes C⁺. Step 3: Br⁻ lone pair → C4: 1-bromobut-2-ene.","hints":["Step 1: two arrows: C=C π bond to H, H–Br to Br. END carbon bonds H. Step 2: one arrow, C=C bond to single bond beside C⁺. Step 3: one arrow, Br⁻ lone pair to C⁺.","Step 2: arrow from C=C π bond to C–C single bond between C⁺ and that C=C. Then + on far carbon: Br⁻ attacks there in step 3."]}, // CAVEMAN
      id: 's13', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'Draw the mechanism of the <b>1,4 route</b>, in three steps. <b>1</b>: a C=C π bond attacks the H of H–Br (say which carbon bonds to H); the H–Br pair leaves with Br. <b>2</b>: the resonance step: the π bond next to the C⁺ slides over (one arrow). <b>3</b>: Br⁻ attacks the C⁺ at the far end.',
      reaction: { reactants: ['C=CC=C', 'Br'], products: ['CC=CCBr'] },
      config: { get mech() { return dieneMechanism('C=CC=C', 'HBr', '1,4'); }, mode: 'draw', drawing: 'skeletal' },
      confirm: 'Step 2 is not a reaction but a redrawing of the same cation (↔): the π bond slid over and the + moved from C2 to C4. Step 3 is then an ordinary cation + Br⁻ step at the new C⁺, so the C=C ends up between C2 and C3: 1,4-addition.',
      hints: ['Step 1 has two arrows: the π bond of a C=C to the H, and the H–Br bond to Br. Choose the END carbon of the diene to bond to H. Step 2 has one arrow, from the C=C bond to the single bond beside the C⁺. Step 3 has one arrow, from a lone pair on Br⁻ to the C⁺.', 'In step 2 the arrow starts at the C=C π bond and ends at the C–C single bond between the C⁺ and that C=C. Afterwards the + charge is on the far carbon, and that is where Br⁻ attacks in step 3.'],
      worked: 'Step 1: π bond (C1=C2) → H, H–Br bond → Br; H bonds to C1 and C2 becomes C⁺. Step 2: π bond (C3=C4) → the C2–C3 bond; C2=C3 forms and C4 becomes C⁺ (the other resonance form). Step 3: lone pair on Br⁻ → C4. The product is 1-bromobut-2-ene.'
    },
    {
      caveman: {"prompt":"Same allylic cation gives <b>1,2 product</b>. Step 1 shown; draw step 2: Br⁻ attacks carbon carrying + as first drawn.","worked":"Br⁻ lone pair → C⁺ (C2, bears CH₃): C–Br at C2, C=C stays C3=C4: 3-bromobut-1-ene (1,2-addition). Attack at C4: 1-bromobut-2-ene (1,4).","hints":["One arrow: Br⁻ lone pair to carbon holding + in structure shown.","Tap Br⁻ lone pair, then carbon marked +: C2, next to CH₃."]}, // CAVEMAN
      id: 's14', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'The same allylic cation also gives the <b>1,2 product</b>. Watch step 1 (you drew it), then draw step 2 yourself: this time Br⁻ attacks the carbon that carries the + charge in the cation as first drawn.',
      reaction: { reactants: ['C=CC=C', 'Br'], products: ['C=CC(C)Br'] },
      config: { get mech() { return dieneMechanism('C=CC=C', 'HBr', '1,2'); }, modes: ['watch', 'draw'], drawing: 'skeletal' },
      confirm: 'Br⁻ attacked C2, the other carbon that shares the + charge. The C=C stays between C3 and C4 and the product is 3-bromobut-1-ene. The same cation, attacked at either end, gives both products.',
      hints: ['Only one arrow is needed: a lone pair on Br⁻ goes to the carbon that holds the + charge in the structure shown.', 'Tap a lone pair on the bromide ion, then tap the carbon marked +: that carbon is C2, next to the CH₃ group.'],
      worked: 'A lone pair on Br⁻ → the C⁺ carbon (C2, which bears the CH₃). The new C–Br bond forms at C2 and the C=C stays at C3=C4: 3-bromobut-1-ene, the 1,2-addition product. Attack at C4 instead gives 1-bromobut-2-ene, the 1,4-product.'
    },
    {
      caveman: {"prompt":"<b>Isoprene</b> (2-methylbuta-1,3-diene) + one equivalent HCl: H⁺ to C1: allylic cation, <b>tertiary</b> end (C2, CH₃), <b>primary</b> end (C4). Cl⁻ either end. Products?","worked":"CH₂=CH–C⁺(CH₃)₂ ↔ ⁺CH₂–CH=C(CH₃)₂. Cl⁻ tertiary end: 3-chloro-3-methylbut-1-ene (1,2); primary end: 1-chloro-3-methylbut-2-ene (1,4).","hints":["H⁺ on C1. Write cation and resonance form: where can + sit? Cl⁻ attacks both.","Attack at C2: Cl on carbon with CH₃ (1,2). Attack at C4: Cl on CH₂ end, C=C to C2=C3 (1,4). Both form."],"options":[{"why":"Yes. Cl⁻ at C2 (1,2, tertiary) or C4 (1,4, C=C to C2=C3). Both share +."},{"why":"Only 1,2-product (Cl on tertiary carbon). Primary end shares + too: Cl⁻ attacks: 1,4-product forms."},{"why":"Only 1,4-product. Cl⁻ also attacks tertiary C2 (much of +): 1,2-product forms too."},{"why":"Needs H⁺ on inner C2: non-allylic primary cation on C1: far less stable: no product."}]}, // CAVEMAN
      id: 's15', type: 'choice', skill: 'dienes',
      prompt: '<b>Isoprene</b> (2-methylbuta-1,3-diene) reacts with one equivalent of HCl. H⁺ adds to C1 and gives an allylic cation with a <b>tertiary</b> end (C2, bonded to CH₃) and a <b>primary</b> end (C4). Cl⁻ can attack either end. Which set of products forms?',
      equation: { reactants: ['C=C(C)C=C'], products: [], cond: 'HCl (1 equiv.)' },
      options: [
        opt(mols([['C=CC(C)(C)Cl', '3-chloro-3-methylbut-1-ene (1,2)'], ['CC(C)=CCCl', '1-chloro-3-methylbut-2-ene (1,4)']]), true, 'Yes. Cl⁻ attacks C2 (1,2-addition, tertiary chloride) or C4 (1,4-addition, C=C moved to C2=C3). Both ends share the + charge.', { chk: { diene: 'C=C(C)C=C', reagent: 'HCl', kind: 'major' } }),
        opt(mols([['C=CC(C)(C)Cl', '3-chloro-3-methylbut-1-ene (1,2)']]), false, 'This is only the 1,2-product, with Cl on the tertiary carbon. The primary end shares the + charge too, so Cl⁻ attacks there as well and the 1,4-product forms.', { chk: { diene: 'C=C(C)C=C', reagent: 'HCl', kind: 'only12' } }),
        opt(mols([['CC(C)=CCCl', '1-chloro-3-methylbut-2-ene (1,4)']]), false, 'This is only the 1,4-product. Cl⁻ can also attack the tertiary end (C2), which carries much of the + charge, so the 1,2-product forms too.', { chk: { diene: 'C=C(C)C=C', reagent: 'HCl', kind: 'only14' } }),
        opt(mols([['C=CC(C)CCl', '4-chloro-3-methylbut-1-ene']]), false, 'This needs H⁺ to add to the inner carbon C2, which would leave a non-allylic primary cation on C1. That cation is far less stable than the allylic one, so this product does not form.', { chk: { diene: 'C=C(C)C=C', reagent: 'HCl', kind: 'nonallylic' } })
      ],
      hints: ['H⁺ adds to C1. Write the cation and its resonance form: where can the + charge sit? Both of those carbons can be attacked by Cl⁻.', 'Attack at C2 puts Cl on the carbon that also has the CH₃ (1,2-addition). Attack at C4 puts Cl on the CH₂ end and moves the C=C to C2=C3 (1,4-addition). Both products form.'],
      worked: 'H⁺ adds to C1, which gives the cation CH₂=CH–C⁺(CH₃)₂ ↔ ⁺CH₂–CH=C(CH₃)₂. Cl⁻ attacks the tertiary end to give 3-chloro-3-methylbut-1-ene (1,2), or the primary end to give 1-chloro-3-methylbut-2-ene (1,4). Both form.'
    },
    {
      caveman: {"prompt":"<b>Cyclohexa-1,3-diene</b> + one equivalent HBr. H⁺ to one diene end; + shared by two ring carbons (allylic cation ends). How many products?","worked":"H⁺ to ring C1: + on C2 and C4 (resonance). Br at C2 or C4: same compound, 3-bromocyclohexene. 1,2- and 1,4-addition meet at one product.","hints":["Allylic cation: H⁺ on one ring end carbon, + on next carbon, shared with carbon two further round. Br on each.","The two bromides: same molecule here: Br next to remaining C=C in both."],"options":[{"why":"Yes. Either end of allylic cation gives 3-bromocyclohexene: 1,2 and 1,4 same compound here: one product."},{"why":"Needs H⁺ on inner diene carbon: non-allylic cation. Not formed: allylic much more stable."},{"why":"Halogen added is the acid's. HBr: Br, not Cl."},{"why":"Starting diene. One π bond used up."}]}, // CAVEMAN
      id: 's16', type: 'choice', skill: 'dienes',
      prompt: '<b>Cyclohexa-1,3-diene</b> reacts with one equivalent of HBr. H⁺ adds to one end of the diene, and the + charge is shared by two ring carbons (the two ends of the allylic cation). How many different products form?',
      equation: { reactants: ['C1=CC=CCC1'], products: [], cond: 'HBr (1 equiv.)' },
      options: [
        opt(mols([['BrC1C=CCCC1', '3-bromocyclohexene']]), true, 'Yes. Attack at either end of the allylic cation gives 3-bromocyclohexene: the 1,2- and the 1,4-addition products are the same compound in this ring, so there is only one product.', { chk: { diene: 'C1=CC=CCC1', reagent: 'HBr', kind: 'major' } }),
        opt(mols([['BrC1CC=CCC1', '4-bromocyclohexene']]), false, 'That would need H⁺ to add to an inner carbon of the diene and leave a non-allylic cation. It is not formed; the allylic cation is much more stable.', { chk: { diene: 'C1=CC=CCC1', reagent: 'HBr', kind: 'nonallylic' } }),
        opt(mols([['ClC1C=CCCC1', '3-chlorocyclohexene']]), false, 'The halogen that adds is the one in the acid. The reagent here is HBr, so the product contains Br, not Cl.', { chk: { diene: 'C1=CC=CCC1', reagent: 'HBr', kind: 'wrongHalogen' } }),
        opt(mols([['C1=CC=CCC1', 'cyclohexa-1,3-diene']]), false, 'That is the starting diene. One π bond is used up in this addition.', { chk: { diene: 'C1=CC=CCC1', reagent: 'HBr', kind: 'unchanged' } })
      ],
      hints: ['Write the allylic cation: H⁺ on one end carbon of the ring diene, the + charge on the carbon next to it, shared with the carbon two further round the ring. Then put Br on each of those two carbons.', 'Look at the two bromides you get. In this ring they are the same molecule: Br on a carbon next to the remaining C=C in both.'],
      worked: 'H⁺ adds to C1 of the ring; the cation has its + on C2 and C4 (resonance). Br at C2 gives a ring with Br on a carbon beside the C=C; Br at C4 gives exactly the same compound, 3-bromocyclohexene. 1,2- and 1,4-addition meet at one product.'
    },
    {
      caveman: {"prompt":"Three are resonance forms of <b>hepta-2,4,6-trien-1-yl cation</b> above (C⁺ at chain end). Which <b>NOT</b> valid?","worked":"Valid: same atoms, same +1 charge, no carbon over four bonds. A, B, D put + on carbons 3, 5, 7. C: one carbon two double bonds plus H (five bonds), no + charge: NOT a resonance form.","hints":["Each option: same atoms, charge +1, no carbon over four bonds. Count bonds.","Valid forms: + on different chain carbon. One option: carbon two double bonds and H, no charge."],"options":[{"why":"Valid: + moved two carbons along by sliding one π bond. Same atoms, same +1."},{"why":"Valid: + moved on again, next π bond slid. Only π electrons moved."},{"why":"Odd one out. Middle carbon of first three: two double bonds and H: five bonds, never. Also lost + charge. Invalid Lewis structure: not resonance."},{"why":"Valid: + on far end carbon, three π bonds slid one place. Same atoms, charge."}]}, // CAVEMAN
      id: 's17', type: 'choice', skill: 'resonance',
      prompt: 'Three of these structures are resonance forms of the <b>hepta-2,4,6-trien-1-yl cation</b> shown above: a C⁺ at the end of three conjugated C=C bonds. Which one is <b>NOT</b> a valid resonance form?',
      smiles: '[CH2+]C=CC=CC=C',
      options: [
        mo('C=C[CH+]C=CC=C', 'Option A', false, 'This one is valid: the + charge moved two carbons along the chain by sliding one π bond, with the same atoms and the same +1 charge.', { chk: { code: 'ok' } }),
        mo('C=CC=C[CH+]C=C', 'Option B', false, 'This one is valid: the + charge moved on again by sliding the next π bond over. Nothing moved but π electrons.', { chk: { code: 'ok' } }),
        mo('[CH2]=[CH]=[CH][CH]=[CH][CH]=[CH2]', 'Option C', true, 'This is the odd one out. The middle carbon of the first three has two double bonds and an H: five bonds, which carbon never has. It also has lost the + charge. It is not a valid Lewis structure, so it cannot be a resonance form.', { raw: true, chk: { code: 'octet' } }),
        mo('C=CC=CC=C[CH2+]', 'Option D', false, 'This one is valid: the + charge sits on the far end carbon, three π bonds slid over one place each. Same atoms, same charge.', { chk: { code: 'ok' } })
      ],
      hints: ['For each option ask: same atoms in the same places, total charge +1, and no carbon with more than four bonds. Count the bonds on each carbon.', 'The valid forms have the + charge on a different carbon of the chain. One option has a carbon with two double bonds and an H, and no charge at all.'],
      worked: 'Valid forms keep the same atoms and the same +1 charge, and every carbon has at most four bonds. Options A, B and D put the + on carbons 3, 5 and 7. Option C gives one carbon two double bonds plus an H (five bonds) and has no + charge, so it is the one that is NOT a resonance form.'
    },
    {
      caveman: {"problem":"Major product: <b>penta-1,3-diene + HCl</b> (1 equivalent).","rule":"H⁺ on <b>end carbon giving better allylic cation</b> (ends more substituted). Resonance form: halide on <b>each</b> carbon sharing +. Products differ?","moves":[{"ask":"H⁺ adds to END carbon: =CH₂ (C1) or CH(CH₃)= (C4). Better cation?","options":[{"why":"Yes. CH₃–CH⁺–CH=CH–CH₃ ↔ CH₃–CH=CH–CH⁺–CH₃: both secondary."},{"why":"Also allylic, but + on primary CH₂ end in resonance form. H on C1 better: both ends secondary."},{"why":"H⁺ on inner carbon: cation not beside C=C, no resonance. Far less stable than allylic."}]},{"ask":"Cation vs its resonance form?","options":[{"why":"Yes. Slide π bond: same structure from other end. Symmetrical, + shared equally."},{"why":"Not primary: + moves C2 to C4, also bonded to CH₃: both secondary. Drawings identical."}]},{"ask":"Cl⁻ attacks C2 or C4. How many different products?","options":[{"why":"Yes. Symmetrical: same molecule, CH₃–CHCl–CH=CH–CH₃."},{"why":"Usually two. Here ends equivalent: C2 and C4 attack give same molecule: one product."}]},{"ask":"Product?","options":[{"why":"Yes. 4-chloropent-2-ene (pent-3-en-2-yl chloride)."},{"why":"No C=C next to Cl carbon. From non-allylic cation: does not form."},{"why":"1,2-product from less stable allylic cation (H on C4, + on C3, C1, one end primary). H on C1 better: not major."}]}]}, // CAVEMAN
      id: 's18', type: 'worked', skill: 'dienes',
      problem: 'Predict the major product of <b>penta-1,3-diene + HCl</b> (1 equivalent) one decision at a time.',
      smiles: 'CC=CC=C',
      moves: [
        {
          ask: 'H⁺ must add to an END carbon of the diene to make an allylic cation, either the =CH₂ end (C1) or the CH(CH₃)= end (C4). Which end gives the better cation?',
          options: [
            opt('C1: the + lands on C2, and both ends of the allyl unit (C2 and C4) are secondary', true, 'Yes. H on C1 gives CH₃–CH⁺–CH=CH–CH₃ ↔ CH₃–CH=CH–CH⁺–CH₃: two secondary ends, which share the charge best.'),
            opt('C4: the + lands on C3, and one end of the allyl unit is secondary and the other primary', false, 'This cation is also allylic, but its resonance form has the + on the primary CH₂ end. The cation from H on C1 is better: both of its ends are secondary.'),
            opt('Either inner carbon, C2 or C3', false, 'Adding H⁺ to an inner carbon leaves a cation that is not next to a C=C, with no resonance form. It is much less stable than any allylic cation.')
          ]
        },
        {
          ask: 'Write the cation. What is its relationship to its resonance form?',
          options: [
            opt('The two drawings are identical: CH₃–CH⁺–CH=CH–CH₃ ↔ CH₃–CH=CH–CH⁺–CH₃', true, 'Yes. Slide the π bond over and you get the same structure read from the other end. The ion is symmetrical, with the + charge shared equally.'),
            opt('The two drawings are different cations, one secondary and one primary', false, 'One is not primary: the + charge moves from C2 to C4, and C4 is also bonded to the CH₃ group, so both are secondary. The two drawings are identical.')
          ]
        },
        {
          ask: 'Cl⁻ can attack C2 or C4. How many different products form?',
          options: [
            opt('One: attack at either end gives the same compound', true, 'Yes. Because the cation is symmetrical, 1,2- and 1,4-addition give the same molecule: CH₃–CHCl–CH=CH–CH₃.'),
            opt('Two: a 1,2-product and a different 1,4-product', false, 'Usually a diene gives two. Here the two ends are equivalent, so attack at C2 and attack at C4 produce the very same molecule, and there is one product.')
          ]
        },
        {
          ask: 'So the product is…',
          options: [
            opt('<mol smiles="CC=CC(C)Cl" label="4-chloropent-2-ene"></mol>', true, 'Yes. Cl on a carbon next to the C=C: 4-chloropent-2-ene (also called pent-3-en-2-yl chloride).'),
            opt('<mol smiles="C=CCC(C)Cl" label="4-chloropent-1-ene"></mol>', false, 'This has no C=C next to the Cl-bearing carbon. It would come from a non-allylic cation, which does not form.'),
            opt('<mol smiles="C=CC(Cl)CC" label="3-chloropent-1-ene"></mol>', false, 'That is the 1,2-product from the less stable allylic cation (H on C4, + shared by C3 and C1, one end primary). The cation with H on C1 is better, so this is not the major product.')
          ]
        }
      ],
      rule: 'Put H⁺ on the <b>end carbon that gives the better allylic cation</b> (the one whose two ends are more substituted). Draw its resonance form, put the halide on <b>each</b> carbon that shares the + charge, and check whether the two products are really different.'
    },
    {
      caveman: {"prompt":"Lab. Pick diene and acid, predict products BEFORE answer: choose set with both 1,2- and 1,4-addition product, unless same compound. Two right, two different dienes.","worked":"Buta-1,3-diene + HBr: 3-bromobut-1-ene (1,2), 1-bromobut-2-ene (1,4). Cyclohexa-1,3-diene + HBr: only 3-bromocyclohexene. Isoprene + HCl: 1,2 and 1,4.","hints":["Allylic cation first: H⁺ on end carbon, + on neighbour and far end carbon. Halide of the acid on each.","Answer with one product misses other end; halide on carbon not sharing +: non-forming cation. Check halogen matches acid."]}, // CAVEMAN
      id: 's19', type: 'try', skill: 'dienes', widget: 'reaction-lab',
      prompt: 'Your turn in the lab. Pick a diene and an acid, then predict the products BEFORE the lab shows the answer: choose the set that includes both the 1,2- and the 1,4-addition product, unless they are the same compound. Get two predictions right, using at least two different dienes.',
      config: { need: 2, dienes: ['buta-1,3-diene', 'cyclohexa-1,3-diene', '2-methylbuta-1,3-diene'], reagents: ['HCl', 'HBr', 'HI'] },
      confirm: 'Two predictions right. You put H⁺ on an end carbon to make the allylic cation, shared the + charge over its two ends, and put the halide on each end, checking whether the 1,2- and 1,4-products were the same compound.',
      hints: ['Write the allylic cation first: H⁺ on an end carbon, + on the neighbouring carbon and on the far end carbon. The halide of the acid goes on each of those carbons.', 'If one answer shows only one of the two products, it is missing the other end; if an answer has the halide on a carbon that is not one of the two sharing the + charge, it came from a cation that does not form. Check the halogen matches the acid.'],
      worked: 'For example: buta-1,3-diene + HBr gives 3-bromobut-1-ene (1,2) and 1-bromobut-2-ene (1,4); cyclohexa-1,3-diene + HBr gives only 3-bromocyclohexene (both routes meet); isoprene + HCl gives 3-chloro-3-methylbut-1-ene and 1-chloro-3-methylbut-2-ene.'
    },
    {
      caveman: {"html":"<p>Conjugated diene: four coplanar sp² carbons, overlapping p orbitals. HX adds H⁺ to end carbon: <b>allylic cation</b>, + on two carbons (two resonance forms). Halide attacks either: <b>1,2-</b> and <b>1,4-addition</b>. Resonance steadies cation: faster.</p>"}, // CAVEMAN
      id: 's20', type: 'explain', skill: 'dienes',
      html: '<p><b>Recap.</b> A conjugated diene has four coplanar (in one plane) sp² carbons with overlapping p orbitals. HX adds H⁺ to an end carbon, making an <b>allylic cation</b> whose + charge is shared by two carbons (two resonance forms). The halide attacks either one: <b>1,2-</b> and <b>1,4-addition</b> products, a mixture. Resonance steadies the cation, so it forms faster than a non-allylic one.</p>'
    }
  ],
  mastery: { count: 3, generator: 'resonance' },
  useIt: {
    book: ['4.12', '4.13', '4.14', '4.15', '4.26', '4.31', '4.36', '4.48', '4.49', '4.50', '4.51'],
    endFrom: 21,
    note: 'In-chapter: 4.12 (Br₂ and buta-1,3-diene: 1,2 and 1,4 products), 4.13 and 4.14 (HCl and penta-1,3-diene: all adducts and the most stable cation), 4.15 (draw resonance structures). End of chapter: 4.26 (an allylic cation from a diene + HBr), 4.31 (the diene isomers of C₅H₈ and which are conjugated), 4.36 (cyclohexa-1,3-diene with reagents), 4.48 to 4.50 (additional resonance structures, which pair are resonance forms, the benzyl cation) and 4.51 (what its resonance implies for a reaction).'
  }
});
