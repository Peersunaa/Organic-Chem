// Lesson 13: Benzene and electrophilic aromatic substitution (McMurry ch. 5, sections 5.1 to 5.5).
// Original wording throughout; book problems are referenced by number only.
// Everything chemical is computed: products, electrophiles, sigma complexes and mechanisms by engine/reactions-aromatic.js (products and resonance forms proven against Python RDKit by
// tools/check_eas.py), names by engine/naming-arene.js (every name round-tripped through OPSIN in tests/lesson13.mjs), plans by engine/synthesis.js. Drawn answers below were generated
// from those engines and tests/lesson13.mjs recomputes each one (option `chk`). Mechanisms are getters, so they are built when the widget mounts (RDKit is ready by then).
// Not covered here: how a group already on the ring steers the next one (Lesson 14), Hueckel's rule, carbocation rearrangements in Friedel-Crafts (not in the book).
import { easMechanism, mechanismPart, predictEAS, BENZENE } from '../engine/reactions.js';

const opt = (text, correct, why, extra = {}) => ({ text, ...(correct ? { correct: true } : {}), why, ...extra });
const mo = (smiles, label, correct, why, extra = {}) => ({ smiles, label, ...(correct ? { correct: true } : {}), why, ...extra });
const mol = (s, l) => `<mol smiles="${s}" label="${l}">`;

/** Move the correct option to a different place in each question (deterministic), so the right answer is not always first. */
function arrange(lesson) {
  const place = (opts, k) => { const i = opts.findIndex((o) => o.correct); const [c] = opts.splice(i, 1); opts.splice(k % (opts.length + 1), 0, c); };
  lesson.steps.forEach((st, n) => {
    if (st.options && (st.type === 'predict' || st.type === 'choice')) place(st.options, n % st.options.length);
    if (st.type === 'worked') st.moves.forEach((m, k) => place(m.options, (n + k) % m.options.length));
  });
  return lesson;
}

// illustrative energies (kJ/mol, not measured): the same first step for substitution and for the (hypothetical) addition, then they part
const SUBST = [
  { label: 'benzene + Br₂ (FeBr₃)', kind: 'R', E: 50 }, { label: '', kind: 'TS', E: 120 }, { label: 'carbocation', kind: 'I', E: 100 }, { label: '', kind: 'TS', E: 106 }, { label: 'bromobenzene + HBr', kind: 'P', E: 30 }
];
const ADD = [
  { label: 'benzene + Br₂', kind: 'R', E: 50 }, { label: '', kind: 'TS', E: 120 }, { label: 'carbocation', kind: 'I', E: 100 }, { label: '', kind: 'TS', E: 112 }, { label: 'addition product', kind: 'P', E: 62 }
];

export default arrange({
  id: '13', slug: 'benzene-eas', title: 'Benzene & electrophilic aromatic substitution', minutes: 29,
  chapter: 5, sections: ['5.1', '5.2', '5.3', '5.4', '5.5'],
  drawing: 'skeletal',
  goals: [
    'Describe benzene as a flat hybrid of two Kekulé drawings with six delocalised π electrons, and explain why it substitutes instead of adding',
    'Draw the two-step mechanism of electrophilic aromatic substitution, including the three resonance forms of the carbocation intermediate',
    'Choose the reagents for bromination, chlorination, iodination, nitration, sulfonation and Friedel–Crafts alkylation and acylation, name each electrophile, and state the Friedel–Crafts limits',
    'Name monosubstituted, disubstituted (ortho, meta, para) and polysubstituted benzenes'
  ],
  steps: [
    {
      id: 's01', type: 'predict', skill: 'eas',
      prompt: `Cyclohexene reacts with Br₂ at once and gives the addition product 1,2-dibromocyclohexane. Benzene, C₆H₆ ${mol('c1ccccc1', 'benzene')}, is drawn as a ring with three C=C. It is mixed with Br₂ and a little FeBr₃ catalyst. What do you expect?`,
      options: [
        opt(`A Br replaces an H on the ring, giving bromobenzene ${mol('Brc1ccccc1', 'bromobenzene')} and HBr`, true, 'Yes. This is what is observed: the ring keeps its six π electrons and one H is substituted by Br. Benzene is not an ordinary alkene.'),
        opt(`Br₂ adds across one C=C, as it does to cyclohexene: ${mol('BrC1C=CC=CC1Br', '5,6-dibromocyclohexa-1,3-diene')}`, false, 'That is what the "three C=C" picture predicts, but it is not what happens. Adding Br₂ would destroy the ring’s special stability, so benzene substitutes instead.'),
        opt(`Three Br₂ add, one to each C=C: ${mol('BrC1C(Br)C(Br)C(Br)C(Br)C1Br', '1,2,3,4,5,6-hexabromocyclohexane')}`, false, 'Benzene does not behave like three separate double bonds. Its π electrons are shared round the whole ring, which makes it much less reactive than an alkene and stops it adding Br₂.'),
        opt('Nothing at all: benzene never reacts with any reagent', false, 'Benzene does react: with Br₂ and FeBr₃ it gives bromobenzene. Without the catalyst, Br₂ alone does not react with it at room temperature, but it is not inert.')
      ],
      reveal: 'Benzene <b>substitutes</b>: C₆H₆ + Br₂ → C₆H₅Br + HBr, with FeBr₃ as catalyst. It does not add like cyclohexene. Next: what is special about the ring that makes it behave this way?'
    },
    {
      id: 's02', type: 'choice', skill: 'hybridization',
      prompt: 'Here is a solid model of <b>benzene</b>. Turn it, and press <b>Show the π cloud</b>. Which statement matches what you see?',
      visual: { widget: 'model3d', config: { mol: 'benzene', pi: true, highlight: [0, 1, 2, 3, 4, 5] } },
      options: [
        opt('A flat regular hexagon: all six C–C bonds are the same length (139 pm, between a single bond at 154 pm and a double bond at 134 pm), and the π electrons form a cloud above and below the ring', true, 'Yes. All six carbons are sp² (120° angles) and each has a p orbital pointing up and down, so the π electrons are shared by the whole ring.'),
        opt('A puckered ring like the cyclohexane chair, with three short and three long bonds', false, 'Cyclohexane puckers because its carbons are sp³. Benzene’s carbons are sp², so the ring is flat, and the six bonds are equal.'),
        opt('A flat ring with three short C=C bonds (134 pm) alternating with three long C–C bonds (154 pm)', false, 'That is how one line drawing looks, but the measured bonds are all 139 pm. No bond is a plain single or a plain double bond.'),
        opt('A flat ring in which each carbon is sp³ with four single bonds', false, 'Each carbon has only three bonded atoms (two ring carbons and one H), so it is sp², and the fourth p orbital forms the π cloud.')
      ],
      hints: ['Rotate the model so you look along the ring edge-on. Do all twelve atoms lie in one plane? Then compare the six C–C bonds with each other.', 'Count the atoms around one carbon: two carbons and one H, so three groups, which means sp² (Lesson 02). The leftover p orbital points up and down.'],
      worked: 'Each ring carbon has three neighbours, so it is sp² and flat (120°). The remaining p orbital on each carbon overlaps equally with both neighbours, so the six π electrons are shared round the ring. Every C–C is 139 pm, between a single (154 pm) and a double (134 pm) bond.'
    },
    {
      id: 's03', type: 'try', skill: 'resonance', widget: 'resonance-drawer',
      prompt: 'Chemists draw benzene with three C=C, but the double bonds could sit in two places. Slide the π electrons round the ring: draw the curved arrows that turn this drawing into the <b>other</b> Kekulé drawing, then press Check.',
      config: { start: 'C1=CC=CC=C1', name: 'benzene' },
      confirm: 'Three arrows, each moving a π pair one bond round the ring, turn one drawing into the other. Neither drawing is real alone: benzene is the hybrid of both, with every C–C between single and double.',
      hints: ['Arrows start at electrons. Tap a C=C π bond, then tap the single bond next to it where its electrons go. Do the same for each of the three double bonds.', 'Each of the three arrows goes from a double bond to the neighbouring single bond in the same direction round the ring (all clockwise or all anticlockwise). Press Check when all three are drawn.'],
      worked: 'Three arrows, all in the same direction round the ring: each C=C π bond moves to the single bond next to it. Every double bond becomes single and every single becomes double. The atoms do not move, so this is resonance, and the hybrid has six equal bonds.'
    },
    {
      id: 's04', type: 'explain', skill: 'eas',
      html: '<p><b>Benzene is aromatic.</b> Its six π electrons are spread over the whole ring: benzene is the hybrid of the two Kekulé drawings, flat and with six equal C–C bonds. That resonance makes it far more stable than an alkene, so it does not add Br₂. Instead FeBr₃ makes it <b>substitute</b>: the ring survives and one H is replaced. The ring as a group is <b>aryl</b>, Ar–.</p>'
    },
    {
      id: 's05', type: 'choice', skill: 'energy-diagram',
      prompt: 'The diagram follows benzene + Br₂ through the same slow first step. Then it forks: the solid curve loses H⁺ (<b>substitution</b>), the dashed curve would add Br⁻ (<b>addition</b>). Which statement is right?',
      visual: { widget: 'energy-diagram', config: { levels: SUBST, label: 'substitution (the ring is restored)', overlay: { levels: ADD, label: 'addition (the ring is lost)' }, mode: 'view', caption: 'Illustrative energies, not measured values.' } },
      options: [
        opt('Substitution ends lower: the product regains the aromatic ring, while the addition product has lost it and sits higher than the starting materials', true, 'Yes. Addition would give up the ring’s resonance stability, so it would be energetically unfavourable. Substitution keeps it, so the reaction goes downhill.'),
        opt('Addition ends lower, because it makes two new C–Br bonds and uses up a whole C=C', false, 'New bonds form, but losing the aromatic stabilisation costs more. That is why the dashed curve ends above the starting level.'),
        opt('Both end at the same energy, because both start from the same carbocation', false, 'The same intermediate does not force the same product energy. What each pathway does with the intermediate (lose H⁺ or add Br⁻) decides whether the ring is restored.'),
        opt('Substitution ends higher, because it releases HBr, which carries energy away', false, 'Releasing HBr does not make the product energy go up here. The deciding factor is that the product of substitution is aromatic again.')
      ],
      hints: ['Look at where each curve finishes compared with the starting level at the left. Which pathway is downhill overall?', 'Ask which product still contains the benzene ring. The ring’s extra stability (resonance) is only kept by the pathway that loses H⁺.'],
      worked: 'Both curves share the slow first step, which makes a resonance-stabilised carbocation that is much less stable than benzene itself. Then H⁺ can leave (the ring returns, energy falls below the start) or Br⁻ can add (the ring is lost, the product stays above the start). Only substitution is favourable.'
    },
    {
      id: 's06', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'Now draw the first two steps of the bromination yourself. <b>Step 1:</b> FeBr₃ activates Br₂. A lone pair on one Br of Br₂ goes to Fe (a new Br–Fe bond), and the Br–Br bond pair goes back onto that Br, leaving Br⁺ and FeBr₄⁻. <b>Step 2:</b> a π bond of benzene attacks the Br⁺ (tap the double bond, then the Br⁺).',
      config: { get mech() { return mechanismPart(easMechanism('Br2'), 0, 2); }, modes: ['draw', 'draw'], drawing: 'skeletal' },
      confirm: 'In step 1 the Br–Br bond pair stays on the Br that bonded to Fe, so the other Br is left without its pair: an electrophile, Br⁺. In step 2 the ring’s π electrons become a C–Br bond, and the ring carries a + charge: the carbocation intermediate.',
      hints: ['Step 1 has two arrows: a lone pair on Br (of Br₂) to the Fe atom, and the Br–Br bond to that same Br atom. Step 2 has one arrow: from a C=C π bond of the ring to the Br⁺.', 'Arrows start at electrons and end where they go. In step 2 the arrow starts on a double bond (any of the three, they are equivalent) and ends on the Br⁺ atom: those π electrons make the new C–Br bond.'],
      worked: 'Step 1: lone pair on one Br of Br₂ → Fe; Br–Br bond → onto that Br. Result: Br⁺ and FeBr₄⁻. Step 2: one ring C=C π bond → the Br⁺, making a new C–Br bond. The carbon that lost its π partner is the one that now carries the + charge.'
    },
    {
      id: 's07', type: 'try', skill: 'resonance', widget: 'resonance-drawer',
      prompt: 'The carbocation from step 2 is drawn below: one sp³ carbon (with Br and H) and a + on a neighbouring carbon. That + is not stuck. Slide the ring π electrons toward the C⁺ with curved arrows to move the + charge, and keep going until you have found <b>every</b> resonance form.',
      config: { get start() { return predictEAS(BENZENE, 'Br2').sigma; }, name: 'carbocation intermediate' },
      confirm: 'The + sits on the two carbons next to the sp³ carbon and on the carbon opposite it (ortho, para, ortho): three forms, so the charge is shared by three carbons. This resonance is why the intermediate is reasonably stable, though still much less stable than benzene.',
      hints: ['Arrows start at electrons: tap the C=C π bond that is NEXT to the C⁺, then tap the single bond between them, where those electrons go. The + moves to the far end of that C=C.', 'Press an earlier form in the row to start from it. The sp³ carbon never takes part: only the five sp² carbons share the + charge, on every second carbon (ortho, para, ortho).'],
      worked: 'Arrow 1: the π bond next to the C⁺ → the single bond between them. The + moves two carbons round the ring (to the carbon opposite the sp³ carbon). Arrow 2 from there moves it again, to the other carbon next to the sp³ carbon. Three forms in all; the sp³ carbon cannot hold the +.'
    },
    {
      id: 's08', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'Last step: FeBr₄⁻ is the base. Draw three arrows. (1) A lone pair on one Br of FeBr₄⁻ goes to the H on the sp³ carbon. (2) The electrons of that C–H bond go into the ring (point at the bond to the C⁺ neighbour, making a new π bond). (3) The Fe–Br bond pair goes back onto that Br, so FeBr₃ is given back.',
      config: { get mech() { return mechanismPart(easMechanism('Br2'), 2, 3); }, modes: ['draw'], drawing: 'skeletal' },
      confirm: 'The C–H electrons became a π bond again, so the ring is aromatic once more, and the product is bromobenzene. The base left as HBr and FeBr₃ was regenerated: it is a catalyst.',
      hints: ['Three arrows: (a) lone pair on a Br of FeBr₄⁻ → the H on the sp³ carbon; (b) the C–H bond → the single bond between the sp³ carbon and the C⁺ carbon; (c) the Fe–Br bond → the Br.', 'The ring is restored when the C–H electrons make a double bond to the C⁺ carbon. Arrow (c) is bookkeeping: the Br that took H⁺ leaves as HBr, so the Fe–Br pair must go onto that Br.'],
      worked: 'Arrow 1: lone pair on Br (of FeBr₄⁻) → H. Arrow 2: C–H bond → into the neighbouring C–C bond (it becomes C=C and the + disappears). Arrow 3: Fe–Br bond → onto Br. Products: bromobenzene, HBr and FeBr₃.'
    },
    {
      id: 's09', type: 'worked', skill: 'eas',
      problem: 'Every reaction of this kind needs an <b>electrophile</b>: an electron-poor species (positive) that the ring’s π electrons can attack. Name it for each reagent, one at a time.',
      moves: [
        {
          ask: '<b>HNO₃ with H₂SO₄</b> (nitration). Which species is the electrophile?',
          options: [
            opt('NO₂⁺, the nitronium ion: H₂SO₄ protonates HNO₃ and H₂O leaves', true, 'Yes. HNO₃ + 2 H₂SO₄ → NO₂⁺ + H₃O⁺ + 2 HSO₄⁻. The ring’s π electrons attack the N.'),
            opt('HSO₄⁻, the anion that H₂SO₄ leaves behind', false, 'A negative ion is electron-rich, like the ring. The ring needs an electron-poor partner. HSO₄⁻ is the base that takes the H⁺ at the end.'),
            opt('H₃O⁺, the ion formed when H₂O picks up H⁺', false, 'H₃O⁺ is a by-product. The group that ends up on the ring is NO₂, so the electrophile has to contain the N.')
          ],
          then: 'Nitration puts –NO₂ on the ring.',
          figure: { smiles: 'O=[N+]=O', label: 'NO₂⁺', showCharge: true }
        },
        {
          ask: '<b>SO₃ with H₂SO₄</b> (fuming sulfuric acid, sulfonation). The electrophile is…',
          options: [
            opt('HSO₃⁺, made when H₂SO₄ gives H⁺ to SO₃', true, 'Yes. SO₃ + H₂SO₄ → HSO₃⁺ + HSO₄⁻. The ring attacks the S atom.'),
            opt('HSO₄⁻', false, 'That is the negative ion left behind. The electrophile must be positive (electron-poor), and the group that ends up on the ring is SO₃H.'),
            opt('A bare proton, H⁺', false, 'Attack by H⁺ would just put an H where an H already is. The group that is substituted is –SO₃H, so the electrophile carries the S.')
          ],
          then: 'Sulfonation puts –SO₃H on the ring.',
          figure: { smiles: 'O[S+](=O)=O', label: 'HSO₃⁺', showCharge: true }
        },
        {
          ask: '<b>Cl₂ with FeCl₃</b> (chlorination). The electrophile is…',
          options: [
            opt('Cl⁺, made by FeCl₃ taking one Cl of Cl₂ (as FeCl₄⁻)', true, 'Yes. Exactly like bromination: the Lewis acid makes one Cl of Cl₂ electron-poor, and the ring attacks it.'),
            opt('Cl⁻', false, 'Cl⁻ is a nucleophile with lone pairs, not something the ring attacks. It is the leaving partner (part of FeCl₄⁻).'),
            opt('FeCl₄⁻', false, 'FeCl₄⁻ is a negative ion; it is the base that removes the H⁺ at the end. The electrophile is the positive partner.')
          ],
          then: 'Iodination works the same way, with I₂ and an oxidant making I⁺.',
          figure: { smiles: '[Cl+]', label: 'Cl⁺', showCharge: true }
        },
        {
          ask: '<b>CH₃CH₂Cl with AlCl₃</b> (Friedel–Crafts alkylation). The electrophile is…',
          options: [
            opt('The carbocation CH₃CH₂⁺, made by AlCl₃ pulling off Cl⁻', true, 'Yes. AlCl₃ helps the alkyl chloride ionise: R–Cl + AlCl₃ → R⁺ + AlCl₄⁻. The ring attacks the positive carbon.'),
            opt('AlCl₄⁻', false, 'That is the anion left over; it becomes the base at the end. The electrophile is the carbocation.'),
            opt('Cl⁻', false, 'Cl⁻ is electron-rich. The ring needs the electron-poor carbon instead.')
          ],
          then: 'Only alkyl halides will do (aryl and vinylic halides do not give carbocations).',
          figure: { smiles: 'C[CH2+]', label: 'CH₃CH₂⁺', showCharge: true }
        },
        {
          ask: '<b>CH₃COCl with AlCl₃</b> (Friedel–Crafts acylation). The electrophile is…',
          options: [
            opt('The acylium ion CH₃C≡O⁺, made when AlCl₃ takes Cl⁻', true, 'Yes. The C–Cl electrons make the C≡O triple bond. The ring attacks the acyl carbon, so the product keeps its C=O (a ketone).'),
            opt('CH₃⁺, with the C=O lost', false, 'The acyl carbon keeps its oxygen: the product is a ketone (an aryl ketone, Ar–CO–CH₃), not a methylated ring.'),
            opt('Cl⁺', false, 'The Cl is the group that leaves, as AlCl₄⁻. It is not what the ring attacks.')
          ],
          then: 'Acylation puts an acyl group, RC=O, on the ring.',
          figure: { smiles: 'CC#[O+]', label: 'CH₃C≡O⁺', showCharge: true }
        }
      ],
      rule: 'The electrophile is always a <b>positive, electron-poor</b> species made from the reagent mixture: X⁺ (X₂ + FeX₃), I⁺ (I₂ + oxidant), NO₂⁺ (HNO₃ + H₂SO₄), HSO₃⁺ (SO₃ + H₂SO₄), R⁺ (RCl + AlCl₃) or RC≡O⁺ (RCOCl + AlCl₃). The ring attacks it, then H⁺ leaves.'
    },
    {
      id: 's10', type: 'choice', skill: 'eas',
      prompt: 'Benzene is treated with a mixture of <b>concentrated nitric acid and sulfuric acid</b>. Which product forms?',
      equation: { reactants: [BENZENE], products: [], cond: 'HNO₃, H₂SO₄' },
      options: [
        mo('O=[N+]([O-])c1ccccc1', 'nitrobenzene', true, 'Yes. NO₂⁺ replaces one H on the ring; the ring stays aromatic. Nitrobenzene can later be reduced to aniline.', { chk: ['HNO3', null, 'major'] }),
        mo('O=[N+]([O-])C1C=CC=CC1O', '6-nitrocyclohexa-2,4-dien-1-ol', false, 'That would be NO₂ and OH adding across a C=C. It destroys the aromatic ring, which benzene avoids: it substitutes instead.', { chk: ['HNO3', null, 'addition'] }),
        mo('CC(C)c1ccccc1', '(propan-2-yl)benzene', false, 'That is an alkylated ring, the product of an alkyl halide with AlCl₃. HNO₃ and H₂SO₄ make NO₂⁺, which puts –NO₂ on the ring.', { chk: ['HNO3', null, 'otherReagent'] }),
        mo('O=[N+]([O-])c1ccc([N+](=O)[O-])cc1', '1,4-dinitrobenzene', false, 'This ring has two new groups. One NO₂⁺ replaces one H, and the question asks for the monosubstituted product. (Where a second group would go is Lesson 14.)', { chk: ['HNO3', null, 'twice'] })
      ],
      hints: ['First name the electrophile made by HNO₃ and H₂SO₄ (NO₂⁺). The ring attacks it, then H⁺ leaves.', 'Substitution: ONE H on the ring is replaced by –NO₂, and the ring stays aromatic. Check that your answer has exactly one new group and no lost C=C.'],
      worked: 'HNO₃ with H₂SO₄ makes NO₂⁺ (the nitronium ion). The π electrons of benzene attack the N, giving a carbocation; HSO₄⁻ then removes H⁺ and the ring is aromatic again. The product is nitrobenzene, C₆H₅NO₂.',
      confirm: 'Nitrobenzene: NO₂⁺ replaces one H. Nitration is useful because the –NO₂ can be reduced to –NH₂ (next step).'
    },
    {
      id: 's11', type: 'try', skill: 'synthesis', widget: 'synthesis-planner',
      prompt: 'Aromatic amines are made from benzene in <b>two steps</b>. Make <b>aniline</b> from benzene: tap reagent cards into order, then press <b>Run the plan</b>. The plan is run on the real reaction rules, so a wrong card or order tells you why.',
      config: { start: BENZENE, target: 'Nc1ccccc1', deck: ['HNO3_H2SO4', 'Fe_H3O', 'Br2_FeBr3', 'SO3_H2SO4', 'MeCl_AlCl3', 'AcCl_AlCl3'] },
      confirm: 'First nitrate the ring (HNO₃ with H₂SO₄ puts –NO₂ on it), then reduce the nitro group with Fe, Sn or SnCl₂ in acid (and HO⁻ to finish) to –NH₂. The order matters: there is nothing to reduce until the NO₂ is on the ring.',
      hints: ['Aniline is benzene with an –NH₂ group. There is no reagent here that puts –NH₂ on directly. Which group on a ring can be reduced to –NH₂?', 'A nitro group, –NO₂, is reduced to –NH₂ by Fe (or Sn, SnCl₂) with H₃O⁺. So put the nitro group on first, with the nitration reagents, and reduce second.'],
      worked: 'Step 1: HNO₃, H₂SO₄ turns benzene into nitrobenzene. Step 2: Fe (or Sn, SnCl₂), H₃O⁺, then HO⁻ reduces –NO₂ to –NH₂, giving aniline. Reduction first would fail (no nitro group yet), and the other cards put different groups on the ring.'
    },
    {
      id: 's12', type: 'choice', skill: 'eas',
      prompt: 'Friedel–Crafts reactions have limits. <b>Only one</b> of these four reactions works. Which?',
      options: [
        opt('Benzene + CH₃CH₂Cl, AlCl₃', true, 'Yes. An alkyl halide and an ordinary ring: AlCl₃ makes CH₃CH₂⁺, the ring attacks it, and ethylbenzene forms.', { chk: { arene: 'c1ccccc1', reagent: 'RCl', halide: 'CCCl', ok: true } }),
        opt('Benzene + chlorobenzene, AlCl₃', false, 'Only alkyl halides work. In chlorobenzene the Cl is on a ring carbon (an aryl halide), and no carbocation forms.', { chk: { arene: 'c1ccccc1', reagent: 'RCl', halide: 'Clc1ccccc1', ok: false, code: 'arylHalide' } }),
        opt('Benzene + CH₂=CHCl (vinyl chloride), AlCl₃', false, 'A vinylic halide has Cl on a C=C carbon. AlCl₃ cannot pull it off to make a carbocation, so nothing happens.', { chk: { arene: 'c1ccccc1', reagent: 'RCl', halide: 'C=CCl', ok: false, code: 'vinylicHalide' } }),
        opt('Nitrobenzene + CH₃Cl, AlCl₃', false, 'The ring already carries an –NO₂ group, which makes it far less reactive than benzene. Friedel–Crafts fails on rings with –NO₂, –C≡N, –SO₃H or –COR.', { chk: { arene: 'O=[N+]([O-])c1ccccc1', reagent: 'RCl', halide: 'CCl', ok: false, code: 'deactivated' } })
      ],
      hints: ['Check two things in each option: is the halide an ALKYL halide (Cl on a saturated carbon), and is the ring free of deactivating groups?', 'Aryl halides (Cl on the ring) and vinylic halides (Cl on a C=C) do not make carbocations. Rings with –NO₂, –C≡N, –SO₃H or –COR are too unreactive.'],
      worked: 'The two halide traps are chlorobenzene (aryl) and vinyl chloride (vinylic): neither gives a carbocation. The nitro-substituted ring is too deactivated. Only benzene + an alkyl chloride works: CH₃CH₂Cl and AlCl₃ give ethylbenzene.',
      confirm: 'Friedel–Crafts needs an alkyl (or acyl) halide and a ring that is not deactivated by –NO₂, –C≡N, –SO₃H or –COR.'
    },
    {
      id: 's13', type: 'try', skill: 'aromatic-naming', widget: 'ring-position',
      prompt: 'Rings with two groups are named by how far apart the groups are: <b>ortho</b> (next to it), <b>meta</b> (one carbon between), <b>para</b> (opposite). Start from the CH₃ of toluene. Tap the ring carbons that are ortho, then meta, then para to it.',
      config: { smiles: 'Cc1ccccc1', tasks: ['ortho', 'meta', 'para'] },
      confirm: 'ortho = the two carbons next to the CH₃ (1,2), meta = the next two round (1,3), para = the single carbon opposite (1,4). A second group on a ring is described by which of these positions it takes.',
      hints: ['Start at the carbon that carries the CH₃ (outlined). The ortho carbons are its two neighbours on the ring.', 'Meta carbons: one carbon in between, on each side. Para: straight across the ring, three bonds away from the CH₃ carbon.'],
      worked: 'Number the ring from the CH₃ carbon as 1. Ortho = carbons 2 and 6, meta = carbons 3 and 5, para = carbon 4. The two ortho carbons are equivalent, as are the two meta carbons; there is only one para carbon.'
    },
    {
      id: 's14', type: 'input', skill: 'aromatic-naming',
      prompt: 'Name this disubstituted benzene. Either style is accepted: numbers or <b>o-, m-, p-</b>. Aniline is the parent, so its NH₂ is carbon 1. Spaces, capitals and hyphens do not matter.',
      smiles: 'Nc1ccc(Cl)cc1', name: true,
      answer: '4-chloroaniline', accept: ['p-chloroaniline'],
      diagnose: [
        { match: '3-chloroaniline', why: 'The Cl in your name is meta to the NH₂ (carbons 1 and 3). In this molecule the Cl is directly across the ring from the NH₂, which is para (1,4).' },
        { match: 'm-chloroaniline', why: 'Meta means a 1,3 relationship. In this molecule the Cl is directly across the ring from the NH₂: para (1,4).' },
        { match: '2-chloroaniline', why: 'Position 2 is next to the NH₂ (ortho). In this molecule the Cl is directly across the ring from the NH₂, which is position 4 (para).' },
        { match: 'o-chloroaniline', why: 'Ortho means next to the NH₂ (1,2). In this molecule the Cl is directly across the ring: para (1,4).' },
        { match: 'chloroaniline', why: 'The parent and the group are right, but the name must say where the Cl is: p- (or 4-) tells you it is directly across the ring from the NH₂.' },
        { match: 'p-aminochlorobenzene', why: 'This describes the right molecule, but the NH₂ group makes the whole compound aniline, which becomes the parent name. Write the other group in front of it: chloro + aniline.' },
        { match: '1-amino-4-chlorobenzene', why: 'This describes the right molecule, but the NH₂ group makes the whole compound aniline, which becomes the parent name (its NH₂ carbon is 1). Write chloro in front of aniline.' }
      ],
      confirm: '<name new="4-chloroaniline" old="p-chloroaniline"></name>: the groups are 1,4 (para) to each other, and NH₂ makes the parent aniline, with its carbon as C1.',
      hints: ['Count the ring carbons from the NH₂ carbon to the Cl carbon: next door (ortho, 1,2), one between (meta, 1,3) or opposite (para, 1,4).', 'The parent is aniline (the NH₂ group is C1). Write the position of the Cl, then chloro, then aniline: p-chloroaniline, or 4-chloroaniline in numbers.'],
      worked: 'The Cl is on the carbon directly opposite the NH₂ carbon: a para (1,4) relationship. NH₂ makes the parent aniline with that carbon as C1, so the name is <name new="4-chloroaniline" old="p-chloroaniline"></name>.'
    },
    {
      id: 's15', type: 'choice', skill: 'aromatic-naming',
      prompt: 'With <b>three or more</b> groups, give each a number: C1 is chosen so that the numbers are as low as possible, and when there is a tie the group that comes first <b>alphabetically</b> gets the lower number. Name this compound.',
      smiles: 'Cc1cc(C)cc(Br)c1',
      options: [
        opt('1-bromo-3,5-dimethylbenzene', true, 'Yes. The numbers 1, 3, 5 are the lowest possible whichever way you count, so the tie is broken alphabetically: bromo comes before methyl, so Br is C1.', { chk: 'Cc1cc(C)cc(Br)c1' }),
        opt('5-bromo-1,3-dimethylbenzene', false, 'The numbers 1,3,5 are right, but when there is a tie the group that comes first alphabetically (bromo) must get the lowest number, 1.'),
        opt('3-bromo-1,5-dimethylbenzene', false, 'The set 1,3,5 is right, but bromo is first alphabetically, so Br takes number 1 and the two methyl groups get 3 and 5.'),
        opt('1,3-dimethyl-5-bromobenzene', false, 'The groups must be listed in alphabetical order in the name (bromo before methyl), and the lowest number goes to the one named first.')
      ],
      hints: ['Number the ring in either direction from any group: what is the lowest set of numbers for three groups spaced like this? Do both directions give the same set?', 'The set is 1,3,5 whichever way you go, so use the alphabet: bromo (b) before methyl (m). The name lists substituents alphabetically, with di- ignored when alphabetising.'],
      worked: 'The three groups are spaced one carbon apart round the ring, so the locants are 1,3,5 in every numbering. The tie is broken alphabetically: Br (bromo) gets 1. The two CH₃ groups are 3 and 5, written dimethyl: <name new="1-bromo-3,5-dimethylbenzene" old="1-bromo-3,5-dimethylbenzene"></name>.'
    },
    {
      id: 's16', type: 'choice', skill: 'aromatic-naming',
      prompt: 'A benzene ring can also be a <b>group</b> on another molecule. The highlighted part of benzyl chloride, C₆H₅CH₂–, has its own name. Which?',
      smiles: 'ClCc1ccccc1', highlight: [1, 2, 3, 4, 5, 6, 7],
      options: [
        opt('Benzyl', true, 'Yes. Benzyl is C₆H₅CH₂–: the ring plus one CH₂.'),
        opt('Phenyl', false, 'Phenyl is the ring alone, C₆H₅–, bonded straight to the rest of the molecule. This group has a CH₂ as well.'),
        opt('Aryl', false, 'Aryl is the general name for an aromatic group joined directly to the rest of the molecule (Ar–). Here a CH₂ sits between, and the specific name is benzyl.'),
        opt('Toluene', false, 'Toluene is the whole molecule methylbenzene, C₆H₅CH₃. The name of the C₆H₅CH₂– group is different.')
      ],
      hints: ['Count what is in the highlighted part: six ring carbons with five H, plus another carbon. Is that C a CH₂ bonded to the ring?', 'Phenyl is only C₆H₅–. Benzyl is C₆H₅CH₂–: it has the extra CH₂. Aryl (Ar) is the general label for any aromatic substituent.'],
      worked: 'The group is C₆H₅ plus a CH₂ that carries the bond to Cl: C₆H₅CH₂–, called benzyl. Without the CH₂ it would be phenyl, C₆H₅–, the ring alone. Aryl (Ar) is the general term for an aromatic ring group.'
    },
    {
      id: 's17', type: 'worked', skill: 'eas',
      problem: `Plan and explain how to make <b>acetophenone</b> ${mol('CC(=O)c1ccccc1', 'acetophenone')} from benzene. Decide each move.`,
      moves: [
        {
          ask: 'Acetophenone has a C(=O)CH₃ group on the ring. Which reagents put an acyl group on benzene?',
          options: [
            opt('CH₃COCl with AlCl₃ (Friedel–Crafts acylation)', true, 'Yes. An acid chloride with AlCl₃ gives an aryl ketone.'),
            opt('CH₃CH₂Cl with AlCl₃', false, 'That is alkylation: it would put an ethyl group on the ring (ethylbenzene), with no C=O.'),
            opt('HNO₃ with H₂SO₄', false, 'That makes NO₂⁺ and puts –NO₂ on the ring.')
          ]
        },
        {
          ask: 'What does AlCl₃ do to CH₃COCl?',
          options: [
            opt('It takes Cl⁻ (as AlCl₄⁻), leaving the acylium ion CH₃C≡O⁺', true, 'Yes. AlCl₃ is a Lewis acid: it accepts a lone pair from Cl, and the C–Cl electrons end up as the C≡O triple bond.'),
            opt('It gives a pair of electrons to the C=O carbon', false, 'AlCl₃ has only six electrons; it ACCEPTS a pair, it does not donate one.'),
            opt('It splits CH₃COCl into radicals', false, 'This is a polar reaction: electron pairs move, and ions form, not radicals.')
          ]
        },
        {
          ask: 'The π electrons of benzene attack the acylium carbon. What is the next intermediate?',
          options: [
            opt('A carbocation with the + shared over three ring carbons (and an sp³ carbon holding H and COCH₃)', true, 'Yes. The same kind of intermediate as in bromination: three resonance forms, ring no longer aromatic.'),
            opt('Neutral acetophenone straight away', false, 'The ring would first have to lose H⁺. After the attack the ring carries a + charge.'),
            opt('A carbanion with a − charge on the ring', false, 'The ring donated electrons to the electrophile, so it is left short of electrons: a carbocation, not a carbanion.')
          ]
        },
        {
          ask: 'How does the ring become aromatic again?',
          options: [
            opt('AlCl₄⁻ removes H⁺ from the sp³ carbon: acetophenone, HCl and AlCl₃ come out', true, 'Yes. The C–H electrons go back into the ring. AlCl₃ is regenerated, so it is a catalyst.'),
            opt('Cl⁻ adds to the carbocation, giving a chloro-cyclohexadiene', false, 'That is addition: it would leave the ring non-aromatic. Benzene substitutes: it loses H⁺ and keeps the ring.'),
            opt('The carbocation loses CH₃⁺', false, 'The COCH₃ group stays on the ring. The group that leaves is the H on the sp³ carbon, as H⁺.')
          ],
          then: 'The product is acetophenone: benzene with an acyl group.',
          figure: { smiles: 'CC(=O)c1ccccc1', label: 'acetophenone' }
        }
      ],
      rule: 'Friedel–Crafts <b>acylation</b>: RCOCl + AlCl₃ → the acylium ion RC≡O⁺ → ring attack → sigma complex → loss of H⁺ → an <b>aryl ketone</b>. Alkylation uses R–Cl and gives R–Ar. Both fail on rings with –NO₂, –C≡N, –SO₃H or –COR.'
    },
    {
      id: 's18', type: 'try', skill: 'eas', widget: 'reaction-lab',
      prompt: 'Back to the lab, now with benzene. Pick a reagent and predict the product BEFORE the lab shows it. Watch for substitution (not addition), and for which group each electrophile puts on the ring. Get two predictions right, using at least two different reagents.',
      config: { need: 2, eas: ['bromination', 'chlorination', 'iodination', 'nitration', 'sulfonation', 'methylation', 'ethylation', 'isopropylation', 'tert-butylation', 'acetylation', 'propanoylation'] },
      confirm: 'Two right. Each time the electrophile was the key: Br⁺, Cl⁺, I⁺, NO₂⁺, HSO₃⁺, R⁺ or RC≡O⁺, then the ring attacks it and loses H⁺.',
      hints: ['Name the electrophile from the reagents, then ask what group it puts on the ring. Alkyl halides and AlCl₃ put an ALKYL group on; acid chlorides and AlCl₃ put an ACYL group (C=O) on.', 'The right answer is always aromatic with ONE new group. An answer with a lost C=O, a missing ring, or two new groups belongs to a different reaction.'],
      worked: 'For example: Br₂/FeBr₃ gives bromobenzene; HNO₃/H₂SO₄ gives nitrobenzene; SO₃/H₂SO₄ gives benzenesulfonic acid; CH₃CH₂Cl/AlCl₃ gives ethylbenzene; CH₃COCl/AlCl₃ gives acetophenone (an aryl ketone).'
    },
    {
      id: 's19', type: 'explain', skill: 'eas',
      html: '<p><b>Recap.</b> Benzene is a flat hybrid with six delocalised π electrons, so it substitutes instead of adding. An electrophile (Br⁺, Cl⁺, I⁺, NO₂⁺, HSO₃⁺, R⁺ or RC≡O⁺) is attacked by the ring (slow); the carbocation shares its + over three carbons; a base removes H⁺ (fast). NO₂ reduces to NH₂ with Fe, Sn or SnCl₂ and H₃O⁺. Next lesson: what a group already on the ring does.</p>'
    }
  ],
  mastery: { count: 3, generator: 'eas-basics' },
  useIt: {
    book: ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9', '5.10', '5.26', '5.27', '5.28', '5.29', '5.30', '5.31', '5.43', '5.44'],
    endFrom: 21,
    note: 'In-chapter: 5.1 (why there is only one 1,2-dibromobenzene), 5.2 to 5.4 (ortho, meta, para; names and structures), 5.5 (draw and name the isomers from toluene), 5.6 (nitration mechanism), 5.7 and 5.8 (how many products when a xylene is chlorinated), 5.9 and 5.10 (Friedel–Crafts products). End of chapter: 5.26 to 5.29 (naming and drawing), 5.30 (hydrocarbons from the number of substitution products), 5.31 and 5.43 (Friedel–Crafts alkylation and its mechanism), 5.44 (H/D exchange with D₂SO₄: an electrophilic substitution with D⁺). Problems that need a group already on the ring to steer the new group wait for Lesson 14.'
  }
});
