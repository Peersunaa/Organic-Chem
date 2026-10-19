// Lesson 08: How mechanisms work (McMurry ch. 3, sections 3.5 to 3.9).
// Original wording throughout; book problems are referenced by number only.
// Every mechanism is DATA (engine/mechanisms.js) checked step by step in the tests: atoms and charge balance, and applying the arrows
// reproduces the next structures. Energy-diagram answers are computed from the levels; the numbers on the diagrams are illustrative.
import { MECH, kindMove, RULE_CASES, HCL_ETHYLENE_LEVELS, CATALYST_LEVELS } from '../engine/mechanisms.js';
import { applyArrows } from '../engine/widgets/arrow-core.js';

const M = '−';

// ---- small inline pictures for the fishhook / full-arrow question (themed with currentColor)
function arrowSvg(kind) {
  const f = (n) => n.toFixed(1);
  const head = (tip, ctrl, half) => {
    const dx = tip[0] - ctrl[0], dy = tip[1] - ctrl[1], L = Math.hypot(dx, dy), t = [dx / L, dy / L], n = [-t[1], t[0]];
    const a = [tip[0] - 10 * t[0] + 5 * n[0], tip[1] - 10 * t[1] + 5 * n[1]], b = [tip[0] - 10 * t[0] - 5 * n[0], tip[1] - 10 * t[1] - 5 * n[1]];
    return half ? `<path d="M${f(tip[0])} ${f(tip[1])} L${f(a[0])} ${f(a[1])}"/>` : `<path d="M${f(a[0])} ${f(a[1])} L${f(tip[0])} ${f(tip[1])} L${f(b[0])} ${f(b[1])}"/>`;
  };
  const curve = (p, c, q, half) => `<path d="M${p[0]} ${p[1]} Q${c[0]} ${c[1]} ${q[0]} ${q[1]}"/>${head(q, c, half)}`;
  const txt = (x, s) => `<text x="${x}" y="47" font-size="18" font-weight="700" fill="currentColor" stroke="none" font-family="monospace">${s}</text>`;
  const body = {
    fishhooks: curve([72, 36], [52, 4], [34, 27], true) + curve([78, 36], [98, 4], [116, 27], true),
    full: curve([75, 36], [105, 0], [118, 27], false),
    twofull: curve([72, 36], [52, 4], [34, 27], false) + curve([78, 36], [98, 4], [116, 27], false)
  }[kind];
  const label = { fishhooks: 'two half-headed arrows, one to each atom', full: 'one full-headed arrow to atom B', twofull: 'two full-headed arrows, one to each atom' }[kind];
  return `<svg viewBox="0 0 150 56" role="img" aria-label="A–B bond with ${label}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:150px;height:56px">${txt(6, 'A')}<line x1="28" y1="42" x2="120" y2="42"/>${txt(126, 'B')}${body}</svg>`;
}
const opt = (kind, text) => `<span class="hom">${arrowSvg(kind)}<span class="hom-txt">${text}</span></span>`;

// ---- the wrong mechanisms of step 8 (data in engine/mechanisms.js; the product of case 2 is what those arrows really give)
const RC = RULE_CASES;
const fiveProduct = applyArrows({ atoms: RC.fiveBonds.atoms, bonds: RC.fiveBonds.bonds, arrows: RC.fiveBonds.arrows });
const sceneOf = (c, extra = {}) => ({ widget: 'arrow-draw', config: { atoms: c.atoms, bonds: c.bonds, arrows: c.arrows, preset: true, ...extra } });

/** Move the correct option to a different place in each question (deterministic), so the right answer is not always first. */
function arrange(lesson) {
  const place = (opts, k) => { const i = opts.findIndex((o) => o.correct); const [c] = opts.splice(i, 1); opts.splice(k % (opts.length + 1), 0, c); };
  lesson.steps.forEach((st, n) => {
    if (st.options && (st.type === 'predict' || st.type === 'choice')) place(st.options, n % st.options.length);
    if (st.type === 'worked' && st.id !== 's02') st.moves.forEach((m, k) => place(m.options, (n + k) % m.options.length));
  });
  return lesson;
}

export default arrange({
  id: '08', slug: 'mechanisms', title: 'How mechanisms work', minutes: 28,
  chapter: 3, sections: ['3.5', '3.6', '3.7', '3.8', '3.9'],
  drawing: 'skeletal',
  goals: [
    'Sort reactions into additions, eliminations, substitutions and rearrangements',
    'Find nucleophilic and electrophilic sites and draw curved arrows from one to the other, obeying the arrow rules',
    'Play the two-step mechanism of HCl adding to ethylene, then use it for HBr and but-2-ene',
    'Read an energy diagram: transition state, intermediate, Eact, ΔH, the slow step, and what a catalyst changes'
  ],
  steps: [
    {
      id: 's01', type: 'predict', skill: 'reaction-types',
      prompt: 'Ethylene and HCl react to give chloroethane. Count the molecules on each side of the arrow. What has happened?',
      equation: { reactants: ['C=C', 'Cl'], products: ['CCCl'] },
      reaction: { reactants: ['C=C', 'Cl'], products: ['CCCl'] },
      options: [
        { text: 'Two molecules joined into one, with no atoms left over', correct: true, why: 'Yes. C₂H₄ + HCl → C₂H₅Cl: every atom of both reactants ends up in the single product.' },
        { text: 'One molecule split into two smaller molecules', why: 'That would put one molecule on the left and two on the right. Here it is the other way round: two molecules become one.' },
        { text: 'Two molecules swapped parts and gave two different molecules', why: 'A swap needs two products. Here there is only one product, chloroethane.' },
        { text: 'One molecule reorganized into an isomer', why: 'A rearrangement starts from ONE molecule. Here two molecules (ethylene and HCl) go in.' }
      ],
      reveal: 'This is an <b>addition</b>. There are four broad kinds of reaction: <b>addition</b> (2 reactants → 1 product), <b>elimination</b> (1 reactant → 2 products), <b>substitution</b> (2 reactants swap parts → 2 products) and <b>rearrangement</b> (1 reactant → 1 isomer).'
    },
    {
      id: 's02', type: 'worked', skill: 'reaction-types',
      problem: 'Classify these four reactions. Count the reactants and products; when it is one reactant to one product, compare the formulas.',
      moves: [
        kindMove('ethanol-dehydration', 'Ethanol loses water in the presence of an acid catalyst. What kind of reaction is this?'),
        kindMove('bromomethane-hydroxide', 'Hydroxide ion meets bromomethane. What kind of reaction is this?'),
        kindMove('hcl-cyclohexene', 'Cyclohexene reacts with HCl. What kind of reaction is this?'),
        kindMove('butene-isomerization', 'But-1-ene is treated with an acid catalyst and becomes but-2-ene. What kind of reaction is this?')
      ],
      rule: '<b>Addition</b>: 2 → 1, nothing left over. <b>Elimination</b>: 1 → 2, a small molecule such as H₂O or HCl comes off. <b>Substitution</b>: 2 → 2, parts swapped. <b>Rearrangement</b>: 1 → 1, same formula, new structure.'
    },
    {
      id: 's03', type: 'predict', skill: 'mechanism',
      prompt: 'In a <b>mechanism</b> we follow the electrons. A covalent bond A–B holds two electrons. Light breaks it so that each atom keeps ONE of them. Which arrows show that?',
      aside: '<p><b>Arrow legend.</b> A full-headed arrow moves a <b>pair</b> of electrons (two electrons). A half-headed “fishhook” arrow moves <b>one</b> electron.</p>',
      options: [
        { text: opt('fishhooks', 'Two half-headed arrows, one to each atom'), correct: true, why: 'Yes. A half-headed (“fishhook”) arrow moves ONE electron. Two of them send one electron to A and one to B.' },
        { text: opt('full', 'One full-headed arrow to B'), why: 'A full-headed arrow moves a PAIR of electrons. Here both bonding electrons would land on B, leaving A with none.' },
        { text: opt('twofull', 'Two full-headed arrows, one to each atom'), why: 'Each full-headed arrow carries two electrons, so these would move four. The bond only has two to give.' }
      ],
      reveal: 'Splitting the pair evenly is <b>homolytic</b> cleavage (fishhook arrows). It makes <b>radicals</b>, neutral species with an unpaired electron. Giving both electrons to one atom is <b>heterolytic</b> cleavage (a full arrow), and it makes ions. Reactions of the first kind are radical reactions, the second kind <b>polar</b> reactions, and polar reactions are by far the more common.'
    },
    {
      id: 's04', type: 'choice', skill: 'mechanism',
      prompt: 'In water the H–Cl bond breaks in the polar way: BOTH bonding electrons stay with one atom. What forms?',
      options: [
        { text: 'H⁺ and Cl⁻ (chlorine keeps the pair)', correct: true, why: 'Yes. Cl is more electronegative (3.0 against 2.1 for H), so it holds on to the pair. H leaves as H⁺ and Cl becomes Cl⁻.' },
        { text: 'H⁻ and Cl⁺ (hydrogen keeps the pair)', why: 'It is the other way round. The pair stays with the more electronegative atom, and that is Cl (3.0), not H (2.1).' },
        { text: 'H· and Cl· (each atom keeps one electron)', why: 'That is a homolytic break, drawn with fishhook arrows, and it gives radicals. In a polar break one atom takes both electrons.' },
        { text: 'The electrons leave and neither atom keeps them', why: 'Electrons do not vanish. The pair stays on one of the two fragments, and charge is conserved.' }
      ],
      hints: ['In a polar (heterolytic) break one fragment gets both electrons and the other is left with an empty orbital.', 'Compare the electronegativities: H 2.1, Cl 3.0. The atom that pulls harder on the shared pair keeps it.'],
      worked: 'The bond pair goes to the more electronegative atom, Cl (3.0). Cl ends up with a fourth lone pair and a negative charge (Cl⁻); H is left with no electrons (H⁺).'
    },
    {
      id: 's05', type: 'try', skill: 'nuc-elec', widget: 'site-picker',
      aside: '<p>From Lesson 01: oxygen in water has <b>two</b> lone pairs, nitrogen in ammonia has <b>one</b>, and the Br⁻ ion has <b>four</b>. A C=C bond also holds electrons that can be donated.</p>',
      prompt: 'Polar reactions pair an electron-rich site with an electron-poor one. Nucleophiles donate a pair of electrons. For each molecule, tap the atom that would donate it.',
      config: { items: [{ id: 'water', role: 'nuc' }, { id: 'ammonia', role: 'nuc' }, { id: 'bromide', role: 'nuc' }, { id: 'ethylene', role: 'nuc' }] },
      confirm: 'Nucleophiles are electron-rich: a lone pair (H₂O, NH₃), a negative charge (Br⁻), or a π bond (C=C).',
      hints: ['A nucleophile is electron-rich. Look for a lone pair, a π bond or a negative charge.', 'H₂O: the O. NH₃: the N. Br⁻: the ion itself. Ethylene: either carbon of the C=C, the double bond is the electron source.'],
      worked: 'Tap O in H₂O (two lone pairs, δ−), N in NH₃ (one lone pair), the Br⁻ ion (four lone pairs and a negative charge), and either carbon of ethylene (the π electrons sit above and below the molecule where reagents can reach them).'
    },
    {
      id: 's06', type: 'try', skill: 'nuc-elec', widget: 'site-picker',
      prompt: 'Electrophiles accept a pair of electrons. For each molecule, tap the atom that would receive one.',
      config: { items: [{ id: 'hbr', role: 'elec' }, { id: 'ethylcation', role: 'elec' }, { id: 'bf3', role: 'elec' }, { id: 'acetone', role: 'elec' }] },
      confirm: 'Electrophiles are electron-poor: a δ+ atom (H in H–Br, the C=O carbon), a positive carbon, or an atom short of an octet (B).',
      hints: ['An electrophile is electron-poor: a positive charge, a δ+ atom, or an atom with fewer than eight electrons.', 'H–Br: the H (δ+). CH₃CH₂⁺: the positive carbon. BF₃: boron. Acetone: the carbonyl carbon, which O pulls on.'],
      worked: 'Tap H in H–Br (bonded to the more electronegative Br), the positively charged carbon of CH₃CH₂⁺ (six electrons), B in BF₃ (six electrons), and the C=O carbon of acetone (δ+ because oxygen pulls on it).'
    },
    {
      id: 's07', type: 'explain', skill: 'nuc-elec',
      html: '<p>A <b>nucleophile</b> (“nucleus-loving”) is electron-rich: a lone pair, a π bond or a negative charge. It donates a pair. An <b>electrophile</b> is electron-poor: a + or δ+ atom, or an atom short of an octet. It accepts a pair. In a polar reaction the pair moves from nucleophile to electrophile.</p><p>Lewis bases act as nucleophiles and Lewis acids as electrophiles. Neutral molecules can be both: water donates a lone pair from O, but donates H⁺ from H.</p>'
    },
    {
      id: 's08', type: 'worked', skill: 'curved-arrows',
      problem: 'A curved arrow shows where an <b>electron pair</b> goes. Three students each broke a rule. Look at each wrong mechanism and say what is wrong.',
      moves: [
        {
          ask: 'NH₃ picks up H⁺. This student started the arrow on the H⁺. What is wrong?',
          visual: sceneOf(RC.fromProton),
          options: [
            { text: 'The arrow starts on H⁺, which has no electrons. Arrows must start at a lone pair or a bond.', correct: true, why: 'Yes. H⁺ is a bare proton with no electrons to move. The arrow should start on the lone pair of nitrogen and end on H⁺.' },
            { text: 'H⁺ should be drawn with a lone pair', why: 'H⁺ has lost its only electron. Giving it a lone pair would turn it into a hydride ion, H⁻, a different species.' },
            { text: 'Arrows have to run from left to right', why: 'The direction on the page does not matter. What matters is that the arrow starts at electrons and ends at the atom or bond that receives them.' },
            { text: 'Ammonia has no electrons to give', why: 'Nitrogen in NH₃ has one lone pair, and that is exactly where the arrow should start.' }
          ]
        },
        {
          ask: 'HO⁻ attacks chloromethane. The student drew one arrow and then wrote this product. What is wrong with it?',
          visual: [
            Object.assign({ title: 'The student’s arrow' }, sceneOf(RC.fiveBonds)),
            { title: 'The student’s product', widget: 'arrow-draw', config: { atoms: fiveProduct.atoms, bonds: fiveProduct.bonds, arrows: [], preset: true } }
          ],
          options: [
            { text: 'Carbon ends up with five bonds (ten electrons). The C–Cl bond has to break, with a second arrow to Cl.', correct: true, why: 'Yes. Carbon can have only eight electrons (four bonds). When O bonds to C, the C–Cl pair must leave with Cl as Cl⁻.' },
            { text: 'The arrow starts at the wrong lone pair', why: 'Oxygen’s lone pair is the right place to start: it makes the new O–C bond. The trouble is what happens at carbon.' },
            { text: 'Hydroxide is not a nucleophile', why: 'Hydroxide is a good nucleophile: it is negative and has lone pairs. The problem is the five bonds on carbon.' },
            { text: 'The oxygen should keep a negative charge', why: 'After it shares a lone pair, oxygen has two bonds and two lone pairs: neutral. The charge to worry about is on carbon, which has too many bonds.' }
          ]
        },
        {
          ask: 'HO⁻ + HCl. Both arrows are right, but the student wrote the products as H₂O and Cl. What is wrong?',
          visual: sceneOf(RC.lostCharge),
          equation: { reactants: RC.lostCharge.reactants, products: RC.lostCharge.studentProducts },
          options: [
            { text: 'Charge is not conserved. The left side is −1 but the right side adds up to 0: Cl must be Cl⁻, because it kept the H–Cl pair.', correct: true, why: 'Yes. Charge is conserved in every step. Chlorine gains the bonding pair as a fourth lone pair, so it is Cl⁻ and the total stays −1.' },
            { text: 'A third arrow is missing', why: 'Two arrows are all this step needs: the lone pair forms the new O–H bond, and the H–Cl pair moves onto Cl.' },
            { text: 'The water should be written H₃O⁺', why: 'Oxygen made one new bond but began with a negative charge, so it ends up neutral: H₂O. Writing H₃O⁺ would give the wrong charge again.' },
            { text: 'Cl should have five bonds', why: 'Cl never has more than one bond here, and five would break the octet rule. The error is the missing negative charge.' }
          ]
        }
      ],
      rule: 'Curved-arrow rules: an arrow <b>starts at electrons</b> (a lone pair or a bond, never at H⁺), <b>ends at an atom or bond</b>, and runs from the nucleophile to the electrophile. <b>Charge is conserved</b>, and <b>no atom may go over an octet</b> (H: two electrons). A full atom that gains a bond must lose another.'
    },
    {
      id: 's09', type: 'predict', skill: 'mechanism',
      prompt: 'HCl meets ethylene. The C=C π electrons are exposed, and the H of HCl is δ+. Where does the FIRST curved arrow start?',
      equation: { reactants: ['C=C', 'Cl'], products: [] },
      options: [
        { text: 'On the C=C π bond, pointing at the H of HCl', correct: true, why: 'Yes. The alkene is the nucleophile and H is the electrophilic end of HCl, so the arrow runs from the π bond to H.' },
        { text: 'On the H–Cl bond, pointing at one of the carbons', why: 'The H–Cl pair does move, but it goes to Cl, the more electronegative atom. Sending it to a carbon would also give that carbon five bonds.' },
        { text: 'On a lone pair of Cl, pointing at one of the carbons', why: 'Cl in H–Cl is the electron-rich end, but its lone pairs are not what makes the new bond. In this reaction the alkene is the nucleophile.' }
      ],
      reveal: 'Nucleophile (the π bond) to electrophile (H). But H can hold only two electrons, so as the new C–H bond forms, the H–Cl bond must break: a <b>second arrow</b> sends its pair onto Cl. The result is a carbocation and Cl⁻.'
    },
    {
      id: 's10', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'Now draw the whole mechanism of HCl adding to ethylene. Draw the arrows for each step; when you are right, watch the electrons move and the structures change.',
      reaction: { reactants: MECH['hcl-ethylene'].reactants, products: MECH['hcl-ethylene'].products },
      config: { mech: MECH['hcl-ethylene'], mode: 'draw' },
      confirm: 'Step 1: the π bond attacks H and the H–Cl pair goes to Cl, giving a carbocation and Cl⁻. Step 2: Cl⁻ gives a lone pair to the positive carbon. The carbocation is an intermediate: it exists between the two steps.',
      hints: ['Step 1 has two arrows: nucleophile to electrophile, and the bond that must break because H is full. Step 2 has one arrow.', 'Step 1: C=C bond → H, and H–Cl bond → Cl. Step 2: a lone pair on Cl⁻ → the positive carbon.'],
      worked: 'Step 1: arrow from the C=C bond to the H of HCl, and arrow from the H–Cl bond to Cl. That gives CH₃CH₂⁺ and Cl⁻. Step 2: arrow from a lone pair on Cl⁻ to the positive carbon, giving CH₃CH₂Cl.'
    },
    {
      id: 's11', type: 'try', skill: 'energy-diagram', widget: 'energy-diagram',
      prompt: 'This energy diagram is for the reaction you just drew. The curve climbs and falls twice. A <b>transition state</b> is the top of a peak (an unstable in-between arrangement that cannot be isolated); a <b>reaction intermediate</b> is a real but short-lived species in a valley between two peaks. Find them.',
      config: { levels: HCL_ETHYLENE_LEVELS, mode: 'tasks', tasks: ['ts', 'intermediate'], caption: 'Illustrative energies, not measured values.' },
      confirm: 'The peaks are transition states (they cannot be isolated); the valley between them is the carbocation intermediate.',
      hints: ['A peak is the highest-energy point of a step. A valley between two peaks is something that really forms.', 'The transition states are the two peaks (B and D). The intermediate is the valley between them (C).'],
      worked: 'Transition states are the energy maxima, B and D. The intermediate is the minimum between them, C: the carbocation (CH₃CH₂⁺ with Cl⁻), which forms in step 1 and is used up in step 2.'
    },
    {
      id: 's12', type: 'try', skill: 'energy-diagram', widget: 'energy-diagram',
      prompt: 'Same reaction, now with the energies written in (kJ/mol). <b>Eact</b> (activation energy) is the climb from where a step starts up to its peak; <b>ΔH</b> is the overall energy change from reactants to products; the <b>rate-determining step</b> is the slowest step. Read the diagram.',
      config: { levels: HCL_ETHYLENE_LEVELS, mode: 'tasks', tasks: ['eact:1', 'dh', 'dhsign', 'rds'], showValues: true, reveal: true, caption: 'Illustrative energies, not measured values.' },
      confirm: 'Eact is the climb from where a step starts to its peak. ΔH compares the products with the reactants. The highest peak marks the rate-determining step.',
      hints: ['Eact starts at the level where the step begins (here the reactants) and goes UP to the peak. ΔH compares only the first and last level.', 'Step 1 climbs from A to B. ΔH runs from A to E (E is lower, so it is negative). The slow step has the highest peak: B.'],
      worked: 'Eact of step 1 = B − A = 120 − 50 = 70 kJ/mol. ΔH = E − A = 10 − 50 = −40 kJ/mol, so energy is released (exothermic). The highest transition state is B, so step 1 is the rate-determining step.'
    },
    {
      id: 's13', type: 'choice', skill: 'energy-diagram',
      prompt: 'In the diagram, step 1 has Eact = 70 kJ/mol and step 2 has Eact = 15 kJ/mol. Which statement is right?',
      visual: { widget: 'energy-diagram', config: { levels: HCL_ETHYLENE_LEVELS, mode: 'view', showValues: true } },
      options: [
        { text: 'Step 2 is faster, because its activation energy is smaller', correct: true, why: 'Yes. A small Eact means most collisions have enough energy to reach the transition state. A big Eact means few do. Step 1 is the slow, rate-determining step.' },
        { text: 'Step 1 is faster, because it comes first', why: 'Order has nothing to do with speed. What counts is the height of the barrier: step 1 has the larger Eact, so it is the slower step.' },
        { text: 'A bigger Eact makes a faster step, because the molecules end up with more energy', why: 'It is the opposite. A bigger barrier lets fewer molecules over it, so the step is slower.' },
        { text: 'The two steps must run at the same speed', why: 'Each step has its own barrier and its own rate. The overall reaction can only go as fast as its slowest step.' }
      ],
      hints: ['Think of hikers crossing a pass: a high pass means few hikers get over it quickly.', 'Compare the two Eact values: 70 and 15. The smaller barrier belongs to the faster step.'],
      worked: 'A large activation energy means few molecules have enough energy to reach the transition state, so the step is slow. Step 1 (70 kJ/mol) is slower than step 2 (15 kJ/mol), which is why step 1 is the rate-determining step.'
    },
    {
      id: 's14', type: 'predict', skill: 'energy-diagram',
      prompt: 'A reaction has Eact = 70 kJ/mol and ΔH = −40 kJ/mol. A chemist adds a catalyst. What changes?',
      options: [
        { text: 'Eact gets smaller; ΔH stays −40 kJ/mol', correct: true, why: 'Yes. The catalyst opens a different pathway with a lower barrier. The starting and ending molecules are the same, so ΔH does not change.' },
        { text: 'ΔH becomes more negative, so more product forms', why: 'A catalyst cannot change where the reaction ends up. Reactants and products are the same molecules, so ΔH and the equilibrium are unchanged.' },
        { text: 'Both Eact and ΔH get smaller', why: 'Only the barrier changes. ΔH depends on the reactants and products alone, and the catalyst changes neither.' },
        { text: 'Nothing: catalysts matter only in living things', why: 'Catalysts are used all the time in the lab and in industry (Pd, which helps add H₂ across a C=C). Enzymes are the biological case.' }
      ],
      reveal: 'A <b>catalyst</b> speeds a reaction by providing an alternative mechanism with a lower activation energy. It takes part, but is regenerated, so there is no net change in it. The reactants and products are the same, so <b>ΔH</b> and the equilibrium stay put. Enzymes are biological catalysts.'
    },
    {
      id: 's15', type: 'try', skill: 'energy-diagram', widget: 'energy-diagram',
      prompt: 'Add a catalyst yourself. Drag the transition state down to lower the barrier. The products handle is there too: see what happens if you move it, then press Check.',
      config: { levels: CATALYST_LEVELS, mode: 'catalyst', catalyst: { minDrop: 15 }, caption: 'Illustrative energies, not measured values.' },
      confirm: 'The barrier is lower, so the reaction is faster, but ΔH has not moved: the catalyst changes the pathway, not the reactants or products.',
      hints: ['Only one thing should move: the top of the peak.', 'Leave the products where they are. Drag the transition state down by at least 15 kJ/mol, then press Check.'],
      worked: 'Drag the transition state handle down (say from 120 to 90) and leave the products at 10. Eact falls from 70 to 40 kJ/mol while ΔH stays −40 kJ/mol.'
    },
    {
      id: 's16', type: 'worked', skill: 'mechanism',
      problem: 'Predict the product and the mechanism of <b>HBr + ethylene</b> by analogy with HCl, then do the same for <b>but-2-ene</b>.',
      moves: [
        {
          ask: 'In HBr + ethylene, which species is the nucleophile?',
          options: [
            { text: 'Ethylene: its C=C π bond donates a pair', correct: true, why: 'Yes. Same as with HCl: the exposed π electrons are the nucleophile.' },
            { text: 'HBr: the H is the electron-rich end', why: 'H is δ+, the electron-poor end, because Br pulls on the pair. That makes it the electrophile.' }
          ]
        },
        {
          ask: 'What does step 1 give?',
          options: [
            { text: 'A carbocation, CH₃CH₂⁺, and Br⁻', correct: true, why: 'Yes. The π bond forms a C–H bond and the H–Br pair goes to Br. The carbon that lost its share of the π bond is left with a + charge.' },
            { text: 'Bromoethane at once', why: 'The bromine has just left as Br⁻. It has not yet bonded to carbon, which only happens in step 2.' },
            { text: 'CH₃CH₂ and Br as two neutral radicals', why: 'Neutral radicals come from fishhook arrows. Here a full arrow moves a PAIR onto Br, so Br⁻ forms and the carbon is left with a + charge.' }
          ],
          figure: { smiles: 'C[CH2+]', drawing: 'full', showCharge: true, label: 'the carbocation' }
        },
        {
          ask: 'And step 2? What is the final product?',
          options: [
            { text: 'Bromoethane, CH₃CH₂Br', correct: true, why: 'Yes. A lone pair on Br⁻ attacks the positive carbon and becomes the new C–Br bond.' },
            { text: 'Ethane, CH₃CH₃', why: 'Nothing here adds hydrogen on its own. Br⁻ attacks the carbocation, so Br ends up in the product.' },
            { text: '1,2-Dibromoethane, BrCH₂CH₂Br', why: 'Only one HBr adds. One H and one Br go onto the two carbons.' }
          ],
          figure: { smiles: 'CCBr', drawing: 'full', label: 'bromoethane' }
        },
        {
          ask: 'Now but-2-ene, CH₃CH=CHCH₃. How many different carbocations can step 1 give?',
          options: [
            { text: 'One: the two C=C carbons are alike (each has H and CH₃), so H adding to either gives the same cation', correct: true, why: 'Yes. Either way the cation is CH₃CH₂CH⁺CH₃, so there is one intermediate and one product.' },
            { text: 'Two different ones, one for each carbon', why: 'The two C=C carbons are equivalent by symmetry: each carries an H and a CH₃. H adding to either one gives an identical cation.' },
            { text: 'None, because the CH₃ groups block the attack', why: 'The π bond is still exposed above and below the plane, so the reaction goes in the same way as with ethylene.' }
          ],
          figure: { smiles: 'CC[CH+]C', drawing: 'full', showCharge: true, label: 'the carbocation' }
        },
        {
          ask: 'So what is the product of but-2-ene + HBr?',
          options: [
            { text: '2-Bromobutane, CH₃CH₂CHBrCH₃', correct: true, why: 'Yes. Br⁻ attacks the positive carbon (carbon 2), giving the addition product.' },
            { text: '1-Bromobutane, BrCH₂CH₂CH₂CH₃', why: 'The positive carbon is carbon 2, not the end of the chain. Br⁻ bonds where the positive charge is.' },
            { text: '2,3-Dibromobutane', why: 'Only one HBr adds, giving one H and one Br in total.' },
            { text: 'CH₃CH=CHCH₂Br', why: 'The C=C is gone in an addition: both carbons end up with only single bonds. This answer still has the double bond.' }
          ],
          figure: { smiles: 'CCC(C)Br', drawing: 'skeletal', label: '2-bromobutane' }
        }
      ],
      rule: 'Any symmetric alkene plus H–X follows the same two steps: the π bond attacks H (the H–X pair goes to X), then X⁻ attacks the carbocation. The result is an <b>addition</b> product.'
    },
    {
      id: 's17', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'Check your prediction. Press play for each step and watch the mechanism of HBr adding to <name new="but-2-ene" old="2-butene"></name>.',
      reaction: { reactants: MECH['hbr-butene'].reactants, products: MECH['hbr-butene'].products },
      config: { mech: MECH['hbr-butene'], mode: 'watch' },
      confirm: 'The same two steps as before: π bond to H with the H–Br pair to Br, then Br⁻ to the carbocation.',
      hints: ['Press “Play the electron flow” in each step.', 'Step 1 ends with a carbocation and Br⁻. Step 2 joins them.'],
      worked: 'Step 1: the C=C π bond attacks H and the H–Br pair goes to Br, giving CH₃CH₂CH⁺CH₃ and Br⁻. Step 2: a lone pair on Br⁻ attacks the positive carbon, giving 2-bromobutane.'
    }
  ],
  mastery: { count: 3, generator: 'mechanism-basics' },
  useIt: {
    book: ['3.11', '3.12', '3.13', '3.14', '3.15', '3.16', '3.17', '3.18', '3.19', '3.22', '3.23', '3.24', '3.25', '3.26', '3.27', '3.28', '3.46', '3.47', '3.48', '3.49', '3.50', '3.51', '3.55', '3.56', '3.57', '3.58', '3.59', '3.60'],
    endFrom: 20,
    note: 'In-chapter 3.11 covers kinds of reactions, 3.12 to 3.14 polarity and nucleophiles/electrophiles, 3.15 and 3.16 the HCl mechanism, and 3.17 to 3.19 energy diagrams. End of chapter: 3.22 to 3.28 (visual and additional problems), 3.46 to 3.51 (Energy Diagrams) and 3.55 to 3.60 (General Problems, where 3.56 to 3.59 ask for curved arrows). Always draw the arrows from the nucleophile to the electrophile.'
  }
});
