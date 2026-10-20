// Lesson 08: How mechanisms work (McMurry ch. 3, sections 3.5 to 3.9). Rebuilt 2026-10-20 around ONE spine (docs/reviews/2026-10-20-lesson08-audit.md):
//   1 rich gives a pair to poor  ->  2 arrow grammar (three legal arrows, one draw each)  ->  3 HCl + ethylene in two steps, the carbocation as a real thing
//   ->  4 why that carbon (3° > 2° > 1°)  ->  5 the energy diagram (picture first, words after)  ->  6 reaction types on one screen  ->  7 nucleophile and
//   electrophile named LAST, as labels for rich and poor  ->  8 the five things to carry into Lesson 09.
// Original wording throughout; book problems are referenced by number only. Every predict says in `answerable` what earlier step makes it answerable
// (tests/lesson08.mjs checks the field and that the step it leans on comes first). Every mechanism and arrow scene is DATA (engine/mechanisms.js), checked in the
// tests: atoms and charge balance, and applying the arrows gives the products. Energy-diagram answers are computed from the levels; the numbers are illustrative.
import { MECH, HCL_STEP1, GRAMMAR, kindMove, RULE_CASES, HCL_ETHYLENE_LEVELS } from '../engine/mechanisms.js';
import { applyArrows } from '../engine/widgets/arrow-core.js';
import models from '../data/3d/models.js';

// ---- the wrong mechanisms of the "spot the broken rule" step (data in engine/mechanisms.js; the product of case 2 is what those arrows really give)
const RC = RULE_CASES;
const fiveProduct = applyArrows({ atoms: RC.fiveBonds.atoms, bonds: RC.fiveBonds.bonds, arrows: RC.fiveBonds.arrows });
const sceneOf = (c, extra = {}) => ({ widget: 'arrow-draw', config: { atoms: c.atoms, bonds: c.bonds, arrows: c.arrows, preset: true, ...extra } });
// ---- the three grammar scenes, with the wrong-destination diagnosis each arrow gives (arrow-core grade reads `note`)
const NOTE = {
  lpToAtom: 'That H already has its bond, and H holds only two electrons. The new bond goes to H⁺, which has none.',
  bondToAtom: 'Cl pulls harder on the shared pair (Lesson 02: 3.0 against 2.1), so Cl keeps it and H leaves with none.',
  bondToBond: 'The π pair goes to the electron-poor partner, H⁺, which has no electrons. The H atoms on carbon are already full.'
};
// what Check says about an arrow that is not needed at all, worded for each case (novice review #8: in HO⁻ + H⁺ nothing breaks, so "which bond has to break" misleads)
const EXTRA = {
  lpToAtom: 'In HO⁻ + H⁺ no bond breaks: the only arrow starts on a lone pair of O (the dots) and ends on H⁺.',
  bondToAtom: 'Only one bond is involved: the H–Cl line. Start the arrow there and end it on the atom that keeps the pair.',
  bondToBond: 'Only the π pair moves: start on the C=C and end on H⁺. The C–H bonds stay as they are.'
};
const grammarStep = (key) => { const g = GRAMMAR[key]; return { atoms: g.atoms, bonds: g.bonds, arrows: g.arrows.map((a) => ({ ...a, note: NOTE[key] })), products: g.products, after: true, afterNote: g.afterNote, extraHint: EXTRA[key] }; };
// ---- still pictures for the predicts of part 3 (novice review #12: the molecules are on screen before the question about them). Written out like GRAMMAR (bond length 1, y down).
const PIC_HCL_ETHYLENE = {
  atoms: [{ el: 'C', x: 0, y: 0 }, { el: 'C', x: 1, y: 0 }, { el: 'H', x: -0.5, y: 0.87 }, { el: 'H', x: -0.5, y: -0.87 }, { el: 'H', x: 1.5, y: 0.87 }, { el: 'H', x: 1.5, y: -0.87 },
    { el: 'H', x: 0.5, y: -1.45 }, { el: 'Cl', x: 0.5, y: -2.6 }],
  bonds: [{ a: 0, b: 1, order: 2 }, { a: 0, b: 2, order: 1 }, { a: 0, b: 3, order: 1 }, { a: 1, b: 4, order: 1 }, { a: 1, b: 5, order: 1 }, { a: 6, b: 7, order: 1 }],
  arrows: [], preset: true, partials: [{ atom: 6, sign: '+' }, { atom: 7, sign: '-' }],
  caption: 'Ethylene and HCl. The double line is the C=C: its second bond, the π bond, is the electron-rich pair. Cl pulls the H–Cl pair, so the H is δ+: electron-poor.'
};
const PIC_CATION_CL = {
  atoms: [{ el: 'C', x: 0, y: 0 }, { el: 'C', x: 1, y: 0, charge: 1 }, { el: 'H', x: -0.5, y: -0.87 }, { el: 'H', x: -0.5, y: 0.87 }, { el: 'H', x: -1, y: 0 }, { el: 'H', x: 1.5, y: -0.87 }, { el: 'H', x: 1.5, y: 0.87 },
    { el: 'Cl', x: 2.9, y: 0, charge: -1 }],
  bonds: [{ a: 0, b: 1, order: 1 }, { a: 0, b: 2, order: 1 }, { a: 0, b: 3, order: 1 }, { a: 0, b: 4, order: 1 }, { a: 1, b: 5, order: 1 }, { a: 1, b: 6, order: 1 }],
  arrows: [], preset: true,
  caption: 'After step 1: the carbocation CH₃CH₂⁺ (the + carbon has three bonds and six electrons) and Cl⁻ (four lone pairs, a − charge).'
};
// ---- the three legal arrows, each drawn on a case the learner does not draw later, shown in the grammar step itself (novice review #6, re-test: all three, picture first)
const PIC_ARROW1 = {
  atoms: RC.fromProton.atoms, bonds: RC.fromProton.bonds, arrows: [{ from: { lp: 0 }, to: { atom: 4 } }], preset: true,
  caption: 'Starts on the lone pair of N (the dots), ends on H⁺: a new N–H bond. NH₃ + H⁺ → NH₄⁺.'
};
const PIC_ARROW2 = {
  atoms: [{ el: 'H', x: 0, y: 0 }, { el: 'Br', x: 1, y: 0 }], bonds: [{ a: 0, b: 1, order: 1 }], arrows: [{ from: { bond: [0, 1] }, to: { atom: 1 } }], preset: true,
  caption: 'Starts on the H–Br bond (the line), ends on Br: the bond breaks. H–Br → H⁺ + Br⁻.'
};
// but-2-ene + H⁺ (symmetric, so it gives nothing away about which end H prefers: that is step 20)
const PIC_ARROW3 = {
  atoms: [{ el: 'C', x: 0, y: 0 }, { el: 'C', x: 1, y: 0 }, { el: 'C', x: -0.5, y: 0.87 }, { el: 'C', x: 1.5, y: -0.87 }, { el: 'H', x: -0.5, y: -0.87 }, { el: 'H', x: 1.5, y: 0.87 },
    { el: 'H', x: -1, y: 1.74 }, { el: 'H', x: 0.14, y: 1.64 }, { el: 'H', x: -1.48, y: 0.7 }, { el: 'H', x: 2, y: -1.74 }, { el: 'H', x: 2.48, y: -0.7 }, { el: 'H', x: 0.86, y: -1.64 },
    { el: 'H', x: -0.6, y: -2.1, charge: 1 }],
  bonds: [{ a: 0, b: 1, order: 2 }, { a: 0, b: 2, order: 1 }, { a: 1, b: 3, order: 1 }, { a: 0, b: 4, order: 1 }, { a: 1, b: 5, order: 1 }, { a: 2, b: 6, order: 1 }, { a: 2, b: 7, order: 1 },
    { a: 2, b: 8, order: 1 }, { a: 3, b: 9, order: 1 }, { a: 3, b: 10, order: 1 }, { a: 3, b: 11, order: 1 }],
  arrows: [{ from: { bond: [0, 1] }, to: { bond: [0, 12] } }], preset: true,
  caption: 'Starts on the C=C of but-2-ene, ends on H⁺: the π pair becomes a new C–H bond, and the other carbon is left with a +.'
};
// ---- still pictures for the predicts that were text only (novice re-test #12): the molecules each question is about, nothing that gives the answer away
const PIC_NH3_H = { atoms: RC.fromProton.atoms, bonds: RC.fromProton.bonds, arrows: [], preset: true, caption: 'NH₃ and H⁺. A pair of dots is a lone pair (two electrons on one atom); a line is a bond (a shared pair). H⁺ has neither.' };
const PIC_ARROW_HCL = { ...PIC_HCL_ETHYLENE, arrows: [{ from: { bond: [0, 1] }, to: { bond: [0, 6] } }], caption: 'The first arrow drawn: the π pair starts a new C–H bond to the H of HCl. That H is still bonded to Cl.' };
const PIC_ETHYL = { atoms: PIC_CATION_CL.atoms.slice(0, 7), bonds: PIC_CATION_CL.bonds, arrows: [], preset: true, caption: 'CH₃CH₂⁺. The + carbon (right) has three bonds and no dots: no lone pair.' };
const cation = (atoms, bonds) => ({ widget: 'arrow-draw', config: { atoms, bonds, arrows: [], preset: true } });
const PIC_THREE_CATIONS = [
  { title: 'CH₃⁺', ...cation([{ el: 'C', x: 0, y: 0, charge: 1 }, { el: 'H', x: 0, y: -1 }, { el: 'H', x: 0.87, y: 0.5 }, { el: 'H', x: -0.87, y: 0.5 }], [{ a: 0, b: 1, order: 1 }, { a: 0, b: 2, order: 1 }, { a: 0, b: 3, order: 1 }]) },
  { title: 'CH₃CH₂⁺', ...cation(PIC_CATION_CL.atoms.slice(0, 7), PIC_CATION_CL.bonds) },
  { title: '(CH₃)₃C⁺', ...cation(
    [{ el: 'C', x: 0, y: 0, charge: 1 }, { el: 'C', x: 0, y: -1 }, { el: 'C', x: 0.87, y: 0.5 }, { el: 'C', x: -0.87, y: 0.5 },
      { el: 'H', x: 0, y: -2 }, { el: 'H', x: 0.94, y: -1.34 }, { el: 'H', x: -0.94, y: -1.34 }, { el: 'H', x: 1.73, y: 1 }, { el: 'H', x: 1.63, y: -0.14 }, { el: 'H', x: 0.69, y: 1.48 },
      { el: 'H', x: -1.73, y: 1 }, { el: 'H', x: -1.63, y: -0.14 }, { el: 'H', x: -0.69, y: 1.48 }],
    [{ a: 0, b: 1, order: 1 }, { a: 0, b: 2, order: 1 }, { a: 0, b: 3, order: 1 }, { a: 1, b: 4, order: 1 }, { a: 1, b: 5, order: 1 }, { a: 1, b: 6, order: 1 },
      { a: 2, b: 7, order: 1 }, { a: 2, b: 8, order: 1 }, { a: 2, b: 9, order: 1 }, { a: 3, b: 10, order: 1 }, { a: 3, b: 11, order: 1 }, { a: 3, b: 12, order: 1 }]) }
];
const PIC_PROPENE_HCL = {
  atoms: [{ el: 'C', x: 0, y: 0 }, { el: 'C', x: 1, y: 0 }, { el: 'C', x: 1.5, y: -0.87 }, { el: 'H', x: -0.5, y: 0.87 }, { el: 'H', x: -0.5, y: -0.87 }, { el: 'H', x: 1.5, y: 0.87 },
    { el: 'H', x: 2, y: -1.74 }, { el: 'H', x: 2.48, y: -0.7 }, { el: 'H', x: 0.86, y: -1.64 }, { el: 'H', x: -1, y: -2 }, { el: 'Cl', x: -2, y: -2.55 }],
  bonds: [{ a: 0, b: 1, order: 2 }, { a: 1, b: 2, order: 1 }, { a: 0, b: 3, order: 1 }, { a: 0, b: 4, order: 1 }, { a: 1, b: 5, order: 1 }, { a: 2, b: 6, order: 1 }, { a: 2, b: 7, order: 1 },
    { a: 2, b: 8, order: 1 }, { a: 9, b: 10, order: 1 }],
  arrows: [], preset: true, partials: [{ atom: 9, sign: '+' }, { atom: 10, sign: '-' }],
  caption: 'Propene and HCl. The two carbons of the C=C differ: the left one (CH₂) holds two H; the right one (CH) holds one H and the CH₃.'
};
// ---- the 3D tert-butyl cation turned so its plane is horizontal and seen almost edge-on (tilted 20°), with the empty p orbital's axis pointing up the screen
//      (novice re-test N8: the stock model came up tilted, so its flatness did not show). Same atoms, same order, only rotated.
function edgeOnModel(mb, centre, ref, tiltDeg) {
  const L = mb.split('\n'), n = parseInt(L[3].slice(0, 3), 10);
  const P = (i) => [0, 10, 20].map((k) => parseFloat(L[4 + i].slice(k, k + 10)));
  const sub = (a, b) => a.map((v, k) => v - b[k]), dot = (a, b) => a.reduce((t, v, k) => t + v * b[k], 0);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const m = Math.hypot(...a); return a.map((v) => v / m); };
  const c = P(centre), u = sub(P(ref[0]), c), w = sub(P(ref[1]), c);
  const ey = unit(cross(u, w)), ex = unit(sub(u, ey.map((v) => v * dot(u, ey)))), ez = cross(ex, ey);
  const t = (tiltDeg * Math.PI) / 180, ph = 0;   // no in-plane turn: one methyl points right, the other two sit left (one in front, one behind), so nothing hides the + carbon in the middle (novice re-test 3, N8)
  const out = L.slice();
  for (let i = 0; i < n; i++) {
    const d = sub(P(i), c);
    let x = dot(d, ex), y = dot(d, ey), z = dot(d, ez);
    [x, z] = [x * Math.cos(ph) - z * Math.sin(ph), x * Math.sin(ph) + z * Math.cos(ph)];
    [y, z] = [y * Math.cos(t) - z * Math.sin(t), y * Math.sin(t) + z * Math.cos(t)];
    out[4 + i] = [x, y, z].map((v) => v.toFixed(4).padStart(10)).join('') + L[4 + i].slice(30);
  }
  return out.join('\n');
}
const EDGE_ID = 'tert-butyl-cation-edge-on';
if (!models[EDGE_ID] && models['tert-butyl-cation']) models[EDGE_ID] = { smiles: models['tert-butyl-cation'].smiles, molblock: edgeOnModel(models['tert-butyl-cation'].molblock, 1, [0, 2], 20) };

export default {
  id: '08', slug: 'mechanisms', title: 'How mechanisms work', minutes: 35,
  chapter: 3, sections: ['3.5', '3.6', '3.7', '3.8', '3.9'],
  drawing: 'skeletal',
  goals: [
    'Spot the electron-rich and the electron-poor site, and say which gives a pair to which',
    'Draw the three legal curved arrows and say what the picture looks like after each one',
    'Play HCl + ethylene in two steps, explain the carbocation and why 3° > 2° > 1°',
    'Read an energy diagram, sort reactions into four kinds, and name nucleophiles and electrophiles'
  ],
  steps: [
    // ======================================================== 1. one idea: rich gives a pair to poor
    {
      caveman: {"prompt":"Electrons negative. Molecule has pair to share. Pair drawn to which partner?","reveal":"Whole lesson idea: <b>electron-rich</b> site gives pair to <b>electron-poor</b> site. Every mechanism step does this.","options":[{"why":"Yes. Opposites attract: pair pulled to where electrons missing."},{"why":"Two negatives repel. Electrons go where electrons missing."},{"why":"Charge matters. + or electron-short partner pulls hardest."},{"why":"Full partner: no room. Pair goes to short or + atom."}]}, // CAVEMAN
      id: 's01', type: 'predict', skill: 'nuc-elec',
      answerable: 'Everyday reasoning: opposite charges attract, so negative electrons go to a + or electron-short partner.',
      prompt: 'Electrons carry a negative charge. A molecule has a pair of electrons it can share. Which partner will that pair be drawn to?',
      options: [
        { text: 'A partner with a + charge, or one that is short of electrons', correct: true, why: 'Yes. Opposite charges attract: a pair of electrons is pulled toward a place that lacks electrons.' },
        { text: 'A partner that already carries a negative charge, since like goes with like', why: 'Two negative things push each other away. Electrons go where electrons are missing, not where there are already plenty.' },
        { text: 'Any partner at all, because charge does not matter here', why: 'Charge is exactly what matters. Electrons are negative, so a + or electron-short partner pulls on them hardest.' },
        { text: 'A partner that already has a full set of electrons', why: 'A full partner has no room for more. The pair goes to an atom that is short of electrons or carries a +.' }
      ],
      reveal: 'That is the whole idea of this lesson: an <b>electron-rich</b> site gives a pair of electrons to an <b>electron-poor</b> site. Every step of every mechanism you will meet does exactly this.'
    },
    {
      caveman: {"prompt":"H–Cl share one pair; Cl pulls harder (Cl 3.0, H 2.1). Which end electron-poor?","reveal":"Atom losing fair share: <b>δ+</b>, electron-poor. H of H–Cl gets the pair. Cl end: <b>δ−</b>.","options":[{"why":"Yes. Cl hogs pair: H short: δ+, poor."},{"why":"Pulling harder: Cl gets MORE: δ−, rich. H is poor end."},{"why":"Equal share needs equal pull. Cl 3.0 > H 2.1: pair nearer Cl."},{"why":"One end gains what other loses. Only H short (δ+)."}]}, // CAVEMAN
      id: 's02', type: 'predict', skill: 'nuc-elec',
      answerable: 'The prompt says Cl pulls the shared pair harder (Lesson 02 electronegativity), so the other end is left short.',
      prompt: 'In H–Cl the two atoms share one pair of electrons, but chlorine pulls on it much harder than hydrogen does (Lesson 02: Cl 3.0, H 2.1). Which end of H–Cl is left electron-poor?',
      options: [
        { text: 'The H end, because the shared pair is pulled away from it', correct: true, why: 'Yes. Cl hogs the shared pair, so H is left short of electrons: δ+, electron-poor.' },
        { text: 'The Cl end, because it pulls so hard that it loses electrons', why: 'Pulling harder means Cl ends up with MORE of the shared pair, so Cl is δ−, the rich end. H is the poor end.' },
        { text: 'Neither end, because one shared pair is split half and half', why: 'Only atoms that pull equally share equally. Cl (3.0) pulls harder than H (2.1), so the pair sits closer to Cl.' },
        { text: 'Both ends, because one pair cannot satisfy two atoms', why: 'One end gains what the other loses. The pair sits nearer Cl (δ−), so only H is left short (δ+).' }
      ],
      reveal: 'The atom that loses its fair share is <b>δ+</b> (partly positive): electron-poor. So the H of H–Cl is where a pair of electrons will be given. The Cl end is <b>δ−</b>.'
    },
    {
      caveman: {"html":"<p><b>One idea:</b> electron-rich site gives pair to electron-poor site.</p><p><b>Rich</b>: <b>π bond</b> (C=C second bond), <b>lone pair</b> (O of H₂O, N of NH₃), <b>negative charge</b> (Cl⁻, HO⁻).</p><p><b>Poor</b>: <b>δ+ H</b> (H–Cl), <b>positive carbon</b> (+, three bonds: CH₃CH₂⁺), <b>short of octet</b> (B of BF₃: six).</p>"}, // CAVEMAN
      id: 's03', type: 'explain', skill: 'nuc-elec',
      html: '<p><b>One idea:</b> an electron-rich site gives a pair of electrons to an electron-poor site.</p><p><b>Electron-rich</b> (a pair to give): a <b>π bond</b> (the second bond of a C=C, its pair above and below), a <b>lone pair</b> (O in H₂O, N in NH₃), a <b>negative charge</b> (Cl⁻, HO⁻).</p><p><b>Electron-poor</b> (can take a pair): a <b>δ+ H</b> (in H–Cl), a <b>positive carbon</b> (+, three bonds: CH₃CH₂⁺), an atom <b>short of an octet</b> (B in BF₃ has six outer electrons, not eight).</p>'
    },
    {
      caveman: {"prompt":"Use two lists. Each molecule: tap atom asked for.","worked":"O of H₂O (two lone pairs), H of H–Br (δ+), C=C of ethylene (π pair; line or either C), B of BF₃ (six electrons).","hints":["Rich: lone pair, π bond, − charge. Poor: δ+, +, under eight electrons.","H₂O: O. H–Br: H. Ethylene: C=C or either C. BF₃: B."]}, // CAVEMAN
      id: 's04', type: 'try', skill: 'nuc-elec', widget: 'site-picker',
      prompt: 'Use the two lists from the last screen. For each molecule, tap the atom the question asks for.',
      aside: '<p><b>Rich:</b> π bond, lone pair, negative charge. <b>Poor:</b> δ+ H, positive carbon, atom short of an octet.</p>',
      config: { words: 'rich', items: [{ id: 'water', role: 'nuc' }, { id: 'hbr', role: 'elec' }, { id: 'ethylene', role: 'nuc' }, { id: 'bf3', role: 'elec' }] },
      confirm: 'Rich: the O of water (lone pairs) and the C=C of ethylene (the π pair). Poor: the δ+ H of H–Br and the B of BF₃, which has only six electrons.',
      hints: ['Rich means it has electrons to give: a lone pair, a π bond or a − charge. Poor means it is missing some: δ+, +, or fewer than eight electrons.', 'H₂O: the O (two lone pairs). H–Br: the H (Br pulls the pair away). Ethylene: the C=C double bond (marked π) or either C. BF₃: the B (six electrons).'],
      worked: 'Tap O in H₂O (two lone pairs), H in H–Br (δ+, because Br pulls the shared pair), the C=C of ethylene (the π pair: the double line, marked π, or either carbon), and B in BF₃ (three bonds, no lone pair: six electrons).'
    },

    // ======================================================== 2. arrow grammar, taught before any use
    {
      caveman: {"prompt": "<b>Curved arrow</b> = electron pair moving, like map arrow for car. Every arrow STARTS where?", "reveal": "Start on electrons, end where they go: <b>three legal arrows</b>. Next screen.", "options": [{"why": "Yes. Arrow follows electrons: starts at lone-pair dots or bond line."}, {"why": "That is where arrow ENDS. Starts where moving thing is: electrons."}, {"why": "+ atom pulls electrons in: target. Never start on atom with no electrons."}, {"why": "Arrow tracks one pair. Start on that pair: lone pair or bond."}]}, // CAVEMAN
      id: 's05', type: 'predict', skill: 'curved-arrows',
      answerable: 'Everyday reasoning: a map arrow starts where the moving thing is now; here the moving thing is the electron pair.',
      prompt: 'Chemists draw a <b>curved arrow</b> to show a pair of electrons moving, the way a map arrow shows where a car drives. Where must every curved arrow START?',
      aside: '<p><b>Arrow legend.</b> A full-headed arrow moves a <b>pair</b> of electrons (two electrons); every arrow in this course is one. (A half-headed “fishhook” arrow moves <b>one</b> electron; you will not need it here.)</p>',
      options: [
        { text: 'On the electrons that move: a lone pair (dots) or a bond (a line)', correct: true, why: 'Yes. The arrow follows the electrons, so it starts where they are now: the dots of a lone pair, or the line of a bond.' },
        { text: 'On the atom that will receive the electrons at the very end of the move', why: 'That is where the arrow ENDS. Like a map arrow, it starts where the moving thing is now: the electrons.' },
        { text: 'On the positive atom, because the + is what attracts the pair', why: 'A + atom pulls electrons in, so it is the target. An arrow never starts on an atom that has no electrons to send.' },
        { text: 'On any atom, as long as the arrow points at the other molecule', why: 'The arrow tracks one particular pair of electrons. It must start on that pair: a lone pair or a bond.' }
      ],
      reveal: 'An arrow starts on the electrons and ends where they go. That gives exactly <b>three legal arrows</b>, and the next screen shows them.',
      visual: { widget: 'arrow-draw', config: PIC_NH3_H }
    },
    {
      caveman: {"html": "<p><b>Arrow grammar.</b> Start at pair, end where pair goes. Three legal:</p><ol><li><b>Lone pair → atom</b>: new bond.</li><li><b>Bond → atom</b>: bond breaks; new lone pair.</li><li><b>Bond → new bond</b>: pair bonds to other atom.</li></ol><p>Never from H⁺ or + atom. Pictures above: one per arrow.</p>"}, // CAVEMAN
      id: 's06', type: 'explain', skill: 'curved-arrows',
      html: '<p><b>Arrow grammar.</b> An arrow starts at a pair and ends where it goes. Three arrows are legal:</p><ol><li><b>Lone pair → atom</b>: the pair becomes a new bond to that atom.</li><li><b>Bond → atom</b>: the bond breaks; its pair becomes a lone pair on that atom.</li><li><b>Bond → new bond</b>: the pair leaves its bond and bonds to another atom.</li></ol><p>Never start on H⁺ or a + atom: nothing there to move. Each is pictured above.</p>',
      visualFirst: true,
      visual: [{ title: 'Arrow 1: lone pair → atom', widget: 'arrow-draw', config: PIC_ARROW1 }, { title: 'Arrow 2: bond → atom', widget: 'arrow-draw', config: PIC_ARROW2 }, { title: 'Arrow 3: bond → new bond', widget: 'arrow-draw', config: PIC_ARROW3 }]
    },
    {
      caveman: {"prompt": "Arrow 1, <b>lone pair → atom</b>. HO⁻ meets H⁺. Draw arrow making O–H bond.", "worked": "Tap O lone pair, then H⁺: HO⁻ + H⁺ → H₂O.", "hints": ["Start at electrons: dots on O (HO⁻ rich).", "Tap any dots on O, then H⁺."]}, // CAVEMAN
      id: 's07', type: 'try', skill: 'curved-arrows', widget: 'arrow-draw',
      prompt: 'Arrow 1, <b>lone pair → atom</b>. Hydroxide, HO⁻, meets a bare proton, H⁺. Draw the arrow that makes the new O–H bond.',
      aside: '<p>Tap a pair of dots on O first (where the electrons are), then tap the atom they go to. Then press Check.</p>',
      config: grammarStep('lpToAtom'),
      confirm: 'Lone pair → atom: the pair became the new O–H bond, and HO⁻ became H₂O. Press “Show before” to compare the two pictures.',
      hints: ['Start where the electrons are: the dots on O. HO⁻ is the electron-rich partner.', 'Tap any pair of dots on O, then tap H⁺.'],
      hintsFor: { dest: ['Your start is right: a lone pair on O. Now the end: H⁺, the H with no electrons at all, not the H already bonded to O.', 'Start right. End on H⁺, not H on O.'] },
      worked: 'Tap a lone pair on O, then tap H⁺. The pair becomes the new O–H bond: HO⁻ + H⁺ → H₂O.'
    },
    {
      caveman: {"prompt": "Arrow 2, <b>bond → atom</b>. H–Cl gives up H⁺: send bond pair onto Cl.", "worked": "Tap H–Cl bond, then Cl. Pair: Cl's fourth lone pair: Cl⁻; H left as H⁺.", "hints": ["Electrons in bond: start on H–Cl line.", "Tap H–Cl line, then Cl (it keeps pair)."]}, // CAVEMAN
      id: 's08', type: 'try', skill: 'curved-arrows', widget: 'arrow-draw',
      prompt: 'Arrow 2, <b>bond → atom</b>. In water, H–Cl gives up H⁺. Draw the arrow that sends the H–Cl bond pair onto chlorine.',
      aside: '<p>Tap the H–Cl bond (the line) first, then the atom that keeps the pair. Then press Check.</p>',
      config: grammarStep('bondToAtom'),
      confirm: 'Bond → atom: the bond broke and its pair became a lone pair on Cl. H–Cl → H⁺ + Cl⁻.',
      hints: ['The electrons are in the bond: start on the line between H and Cl.', 'Tap the H–Cl line, then tap Cl (the more electronegative atom keeps the pair).'],
      hintsFor: { dest: ['Your start is right: the H–Cl line. Now the end: the pair stays on the atom that pulls harder, Cl (3.0 against 2.1).', 'Start right. End on Cl: pulls harder.'] },
      worked: 'Tap the H–Cl bond, then tap Cl. The bond pair becomes the fourth lone pair on Cl: Cl⁻, and H is left with no electrons as H⁺.'
    },
    {
      caveman: {"prompt": "Arrow 3, <b>bond → new bond</b>. Make π pair a C–H bond to H⁺.", "worked": "Tap C=C, then H⁺: new C–H bond; other C now C⁺: CH₃CH₂⁺.", "hints": ["Rich part: π bond. Start on C=C line.", "Tap C=C, then H⁺ (H with + charge)."]}, // CAVEMAN
      id: 's09', type: 'try', skill: 'curved-arrows', widget: 'arrow-draw',
      prompt: 'Arrow 3, <b>bond → new bond</b>. Ethylene meets H⁺. Draw the arrow that turns the π pair into a new C–H bond.',
      aside: '<p>Tap the C=C (the double line) first, then tap H⁺: the arrow head points at the atom the new bond goes to. Then press Check.</p>',
      config: grammarStep('bondToBond'),
      confirm: 'Bond → new bond: the π pair became a C–H bond, and the other carbon, which lost its share of that pair, is left with a + charge.',
      hints: ['The electron-rich part of ethylene is the π bond: start on the C=C line.', 'Tap the C=C, then tap H⁺ (the H with the + charge).'],
      hintsFor: { dest: ['Your start is right: the C=C. Now the end: the electron-poor partner, H⁺ (the H with the + charge).', 'Start right. End on H⁺.'] },
      worked: 'Tap the C=C bond, then tap H⁺. The π pair becomes a new C–H bond; the carbon that lost its share is now C⁺: CH₃CH₂⁺.'
    },
    {
      caveman: {"problem": "You know three legal arrows. Three students broke a rule: find each.", "rule": "Arrow <b>starts at electrons</b> (never H⁺), ends at atom or new bond. <b>Charge conserved</b>; <b>no atom over octet</b> (H: two). Full atom gaining bond loses one.", "moves": [{"ask": "NH₃ picks up H⁺. Arrow started on H⁺. Wrong?", "options": [{"why": "Yes. H⁺ bare proton, no electrons. Start on N lone pair, end on H⁺."}, {"why": "H⁺ lost its only electron. Lone pair makes hydride H⁻, different."}, {"why": "Page direction irrelevant. Starts at electrons, ends at receiver."}, {"why": "N of NH₃ has one lone pair: right start."}]}, {"ask": "HO⁻ attacks chloromethane. One arrow, this product. Wrong?", "options": [{"why": "Yes. Carbon max eight electrons. O bonds C: C–Cl pair leaves as Cl⁻."}, {"why": "O lone pair right start: makes O–C. Trouble at carbon."}, {"why": "Hydroxide good electron donor. Problem: five bonds on carbon."}, {"why": "O ends neutral (two bonds, two lone pairs). Problem: carbon."}]}, {"ask": "HO⁻ + HCl. Arrows right; products H₂O and Cl. Wrong?", "options": [{"why": "Yes. Charge conserved each step. Cl gains pair: Cl⁻, total −1."}, {"why": "Two arrows suffice: lone pair forms O–H, H–Cl pair to Cl."}, {"why": "O made one bond, began negative: neutral H₂O. H₃O⁺ wrong charge."}, {"why": "Cl one bond here; five breaks octet. Error: missing − charge."}]}]}, // CAVEMAN
      id: 's10', type: 'worked', skill: 'curved-arrows',
      problem: 'You know the three legal arrows. Three students each broke a rule. Look at each wrong mechanism and say what is wrong.',
      moves: [
        {
          ask: 'NH₃ picks up H⁺. This student started the arrow on the H⁺. What is wrong?',
          visual: sceneOf(RC.fromProton),
          options: [
            { text: 'It starts on H⁺, which has no electrons; an arrow must start at a lone pair or a bond', correct: true, why: 'Yes. H⁺ is a bare proton with no electrons to move. The arrow should start on the lone pair of nitrogen and end on H⁺.' },
            { text: 'H⁺ should be drawn with a lone pair of its own, so it has a pair to send', why: 'H⁺ has lost its only electron. Giving it a lone pair would turn it into a hydride ion, H⁻, a different species.' },
            { text: 'Arrows have to run from left to right on the page, and this one runs the other way', why: 'The direction on the page does not matter. What matters is that the arrow starts at electrons and ends at the atom or bond that receives them.' },
            { text: 'Ammonia has no electrons that it could give, so no arrow can start on its N', why: 'Nitrogen in NH₃ has one lone pair, and that is exactly where the arrow should start.' }
          ]
        },
        {
          ask: 'HO⁻ attacks chloromethane. The student drew one arrow and then wrote this product. What is wrong with it?',
          visual: [
            Object.assign({ title: 'The student’s arrow' }, sceneOf(RC.fiveBonds)),
            { title: 'The student’s product', widget: 'arrow-draw', config: { atoms: fiveProduct.atoms, bonds: fiveProduct.bonds, arrows: [], preset: true } }
          ],
          options: [
            { text: 'Carbon ends up with five bonds (ten electrons): the C–Cl bond must break, with an arrow to Cl', correct: true, why: 'Yes. Carbon can have only eight electrons (four bonds). When O bonds to C, the C–Cl pair must leave with Cl as Cl⁻.' },
            { text: 'The arrow starts at the wrong lone pair of oxygen: it should use the pair facing away from carbon', why: 'Oxygen’s lone pair is the right place to start: it makes the new O–C bond. The trouble is what happens at carbon.' },
            { text: 'Hydroxide cannot give electrons to anything, because its − charge holds them on oxygen', why: 'Hydroxide is a good electron donor: it is negative and has lone pairs. The problem is the five bonds on carbon.' },
            { text: 'The oxygen should keep its negative charge after the new O–C bond forms, so the charge is wrong', why: 'After it shares a lone pair, oxygen has two bonds and two lone pairs: neutral. The charge to worry about is on carbon, which has too many bonds.' }
          ]
        },
        {
          ask: 'HO⁻ + HCl. Both arrows are right, but the student wrote the products as H₂O and Cl. What is wrong?',
          visual: sceneOf(RC.lostCharge),
          equation: { reactants: RC.lostCharge.reactants, products: RC.lostCharge.studentProducts },
          options: [
            { text: 'Charge is not conserved: the left side is −1, the right side 0. Cl kept the pair, so it is Cl⁻', correct: true, why: 'Yes. Charge is conserved in every step. Chlorine gains the bonding pair as a fourth lone pair, so it is Cl⁻ and the total stays −1.' },
            { text: 'A third arrow is missing from the drawing: one from the new O–H bond back onto oxygen', why: 'Two arrows are all this step needs: the lone pair forms the new O–H bond, and the H–Cl pair moves onto Cl.' },
            { text: 'The water should be written as H₃O⁺ instead, because oxygen gained a bond to hydrogen', why: 'Oxygen made one new bond but began with a negative charge, so it ends up neutral: H₂O. Writing H₃O⁺ would give the wrong charge again.' },
            { text: 'Cl should end up with five bonds, because it keeps the pair and must share it again', why: 'Cl never has more than one bond here, and five would break the octet rule. The error is the missing negative charge.' }
          ]
        }
      ],
      rule: 'Curved-arrow rules: an arrow <b>starts at electrons</b> (a lone pair or a bond, never at H⁺) and ends at an atom or makes a new bond. <b>Charge is conserved</b>, and <b>no atom may go over an octet</b> (H: two electrons). A full atom that gains a bond must lose one.'
    },

    // ======================================================== 3. a polar reaction in two steps: HCl + ethylene
    {
      caveman: {"prompt": "Real reaction: CH₂=CH₂ + HCl → CH₃CH₂Cl. Rich gives to poor. FIRST arrow from where to where?", "reveal": "π pair makes C–H bond (bond → new bond). But H holds only two: something else must happen.", "options": [{"why": "Yes. π bond rich, δ+ H poor: π bond → H (bond → new bond)."}, {"why": "Backwards. H δ+, poor: no pair to send. Start at electrons, π bond."}, {"why": "Cl δ− end, C=C rich too: rich not give to rich. Poor site: δ+ H."}, {"why": "Pushes electrons onto rich carbon (five bonds). C=C pair goes to poor H."}]}, // CAVEMAN
      id: 's11', type: 'predict', skill: 'mechanism',
      answerable: 's02-s03: the C=C π bond is on the rich list and the δ+ H of H–Cl on the poor list; s06 gives the arrow kind.',
      prompt: 'Now a real reaction: HCl adds to ethylene, CH₂=CH₂ + HCl → CH₃CH₂Cl. Use “rich gives to poor”. Where does the FIRST arrow start, and where does it point?',
      visual: { widget: 'arrow-draw', config: PIC_HCL_ETHYLENE },
      options: [
        { text: 'From the C=C π bond to the H of HCl', correct: true, why: 'Yes. The π bond is the rich site and the δ+ H is the poor site, so the arrow runs from the π bond to H (bond → new bond).' },
        { text: 'From the H of HCl to the C=C π bond', why: 'That runs backwards. H is δ+, the poor end: it has no pair to send. The arrow starts at the electrons, in the π bond.' },
        { text: 'From a lone pair on Cl to a carbon of the C=C', why: 'Cl is the δ− end of HCl, but the C=C is rich too: rich does not give to rich. The poor site here is the δ+ H.' },
        { text: 'From the H–Cl bond to a carbon of the C=C', why: 'That would push electrons onto a carbon that is already rich (and give it five bonds). The pair of the C=C goes to the poor H.' }
      ],
      reveal: 'The π pair makes a new C–H bond: arrow 3 of the grammar, bond → new bond. But H can hold only two electrons, so something else must happen at the same moment.'
    },
    {
      caveman: {"prompt": "New C–H: H would hold four electrons, but holds only two. Second arrow does what?", "reveal": "Step 1: π bond → new C–H, H–Cl bond → Cl. Result: Cl⁻ and three-bond + carbon: <b>carbocation</b>.", "options": [{"why": "Yes. Bond → atom: H–Cl breaks, pair stays on Cl (pulls harder)."}, {"why": "Cl pulls harder: keeps pair. Carbon that took H has four bonds: five."}, {"why": "H never holds more than two. H–Cl must break."}, {"why": "Then nothing happened. OLD bond, H–Cl, breaks; pair to Cl."}]}, // CAVEMAN
      id: 's12', type: 'predict', skill: 'mechanism',
      answerable: 'The aside says H holds two electrons; s08 drew bond → atom; s02 says Cl pulls the H–Cl pair harder.',
      prompt: 'As the π pair forms the new C–H bond, that H would hold four electrons, but H can hold only two. What must the second arrow do?',
      aside: '<p>From Lesson 01: hydrogen is full with two electrons, which is one bond.</p>',
      visual: { widget: 'arrow-draw', config: PIC_ARROW_HCL },
      options: [
        { text: 'Send the H–Cl bond pair onto Cl, so the H–Cl bond breaks', correct: true, why: 'Yes. Bond → atom: the old bond breaks and its pair stays on Cl, the atom that pulls harder. H keeps only its new bond to carbon.' },
        { text: 'Send the H–Cl bond pair onto one of the two carbons of the C=C', why: 'Cl pulls harder on that pair (Lesson 02), so Cl keeps it. And the carbon that just took the H already has four bonds: one more pair there would give it five.' },
        { text: 'Nothing, because H can hold four electrons for a moment', why: 'H never holds more than two electrons. The H–Cl bond must break as the C–H bond forms.' },
        { text: 'Break the new C–H bond again a moment later, undoing it', why: 'Then nothing would have happened. The bond that breaks is the OLD one, H–Cl, and its pair goes to Cl.' }
      ],
      reveal: 'Step 1 has two arrows: π bond → new C–H bond, and H–Cl bond → Cl. The result is Cl⁻ and a carbon with only three bonds and a + charge: a <b>carbocation</b>.'
    },
    {
      caveman: {"prompt": "Draw step 1: both arrows, Check, then Next to watch.", "worked": "Arrow 1: C=C → H of HCl. Arrow 2: H–Cl bond → Cl. Gives CH₃CH₂⁺, Cl⁻.", "hints": ["Two arrows: make C–H, break H–Cl.", "1: C=C then H. 2: H–Cl line then Cl."]}, // CAVEMAN
      id: 's13', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'Draw step 1. Draw both arrows and press Check; then press Next to watch each pair of electrons move.',
      config: { mech: HCL_STEP1, mode: 'draw', whatIf: false, endLabel: false },
      confirm: 'Next: the + carbon that step 1 leaves behind.',
      recap: { q: 'Step 1 of HCl + ethylene.', note: 'Two arrows: the π bond reaches the H of HCl, and the H–Cl pair leaves with Cl. That leaves CH₃CH₂⁺ and Cl⁻.' },
      hints: ['Two arrows: one makes the new C–H bond, one breaks the H–Cl bond.', 'Arrow 1: tap the C=C, then the H of HCl. Arrow 2: tap the H–Cl line, then Cl.'],
      hintsFor: { dest: ['Each start is right; check where each one ends. The π pair ends on the H of HCl; the H–Cl pair ends on Cl.', 'Starts right. π pair to H; H–Cl pair to Cl.'] },
      worked: 'Arrow 1: from the C=C bond to the H of HCl (the new C–H bond). Arrow 2: from the H–Cl bond onto Cl. That gives CH₃CH₂⁺ and Cl⁻.'
    },
    {
      caveman: {"prompt": "CH₃CH₂⁺ + carbon: three bonds, no lone pair. Electrons?", "reveal": "Six: two short of octet. <b>Carbocation</b> is poor.", "options": [{"why": "Yes. 3 bonds × 2 = 6, no lone pair. Two short of octet: very poor."}, {"why": "Eight needs fourth bond or lone pair. Here 3 × 2 = 6."}, {"why": "Pairs here: 3 × 2 = 6. Odd number = radical."}, {"why": "Counts bonds, not electrons. Each bond 2: 3 × 2 = 6."}]}, // CAVEMAN
      id: 's14', type: 'predict', skill: 'carbocations',
      answerable: 'Counting rule in the aside (Lesson 01): each bond is two electrons, a lone pair two more.',
      prompt: 'Count the electrons around the + carbon of CH₃CH₂⁺. It has three bonds and no lone pair.',
      aside: '<p>Each bond is one shared pair: 2 electrons. A lone pair is 2 more.</p>',
      visual: { widget: 'arrow-draw', config: PIC_ETHYL },
      options: [
        { text: '6', correct: true, why: 'Yes. Three bonds × 2 electrons = 6, and no lone pair. Two short of an octet: that is why the + carbon is so electron-poor.' },
        { text: '8', why: 'Eight would need a fourth bond or a lone pair. This carbon has three bonds only: 3 × 2 = 6.' },
        { text: '7', why: 'Electrons come in pairs here: three bonds give 3 × 2 = 6. An odd number would mean a radical.' },
        { text: '3', why: 'That counts the bonds, not the electrons. Each bond holds 2 electrons: 3 × 2 = 6.' }
      ],
      reveal: 'Six electrons: two short of an octet. That is what makes a <b>carbocation</b> electron-poor.'
    },
    {
      caveman: {"html":"<p><b>Carbocation</b>: real. + C: three bonds, six electrons, no lone pair: <b>flat</b> (sp², one plane, 120°).</p><p><b>Empty p orbital</b>: lobe above, lobe below, empty: pair comes in. Model (CH₃)₃C⁺ edge-on: flat sheet; coral blobs = empty p.</p>"}, // CAVEMAN
      id: 's15', type: 'explain', skill: 'carbocations',
      html: '<p>A <b>carbocation</b> is a real species. Its + carbon has three bonds, six electrons and no lone pair, so it is <b>flat</b>: <b>sp²</b>, three groups in one plane, 120° apart.</p><p>Its unused orbital is an <b>empty p orbital</b>: a dumbbell through the carbon, one lobe above the plane and one below, no electrons: room for an incoming pair. In the (CH₃)₃C⁺ model below the flat sheet is edge-on and the coral blobs are the empty p orbital.</p>',
      recap: { idea: true, note: '<p>A <b>carbocation</b> is a real species. Its + carbon has three bonds, six electrons and no lone pair, so it is <b>flat</b> (<b>sp²</b>: three groups in one plane, 120° apart).</p><p>Its unused orbital is an <b>empty p orbital</b>: one lobe above the plane, one below, no electrons: room for an incoming pair.</p>' },
      visual: { widget: 'model3d', config: { mol: EDGE_ID, highlight: [1], lobes: { center: 1, ref: [0, 2] }, labels: { 1: { text: 'C⁺', up: 3.1 } } } }
    },
    {
      caveman: {"prompt": "Cl⁻ meets CH₃CH₂⁺. Which arrow joins?", "reveal": "Lone pair → atom: Cl⁻ pair into empty p orbital: C–Cl. Product CH₃CH₂Cl.", "options": [{"why": "Yes. Cl⁻ rich, C⁺ poor (six): lone pair → atom makes C–Cl."}, {"why": "C⁺ has no spare pair. Start at electrons: Cl⁻."}, {"why": "Cl⁻ already rich. Poor partner: + carbon."}, {"why": "Every new bond needs a pair; arrow shows source: Cl⁻ lone pair."}]}, // CAVEMAN
      id: 's16', type: 'predict', skill: 'mechanism',
      answerable: 's03 (negative charge is rich, positive carbon is poor), s06/s07 (lone pair → atom) and s14-s15 (C⁺ has six electrons and an empty p orbital).',
      prompt: 'Step 2: Cl⁻ meets the carbocation, CH₃CH₂⁺. Which arrow joins them?',
      visual: { widget: 'arrow-draw', config: PIC_CATION_CL },
      options: [
        { text: 'From a lone pair on Cl⁻ to the + carbon', correct: true, why: 'Yes. Cl⁻ is rich (negative, four lone pairs) and C⁺ is poor (six electrons): lone pair → atom, and the pair becomes the C–Cl bond.' },
        { text: 'From the + carbon to a lone pair on Cl⁻', why: 'C⁺ has no spare electrons to send: it is the poor partner. Arrows start at electrons, on Cl⁻.' },
        { text: 'From a C–H bond of the cation to Cl⁻', why: 'Cl⁻ is already rich; nothing needs to give it more electrons. The poor partner is the + carbon.' },
        { text: 'No arrow, because opposite charges join on their own', why: 'Every new bond needs a pair of electrons, and an arrow shows where it comes from: a lone pair of Cl⁻.' }
      ],
      reveal: 'Lone pair → atom: Cl⁻ gives a pair into the empty p orbital, and the C–Cl bond forms. The product is chloroethane, CH₃CH₂Cl.'
    },
    {
      caveman: {"prompt": "Whole mechanism. Next replays step 1; then draw step 2.", "worked": "Step 2: tap Cl⁻ lone pair, then + carbon: C–Cl bond, CH₃CH₂Cl.", "hints": ["Step 2: one arrow. Start at rich partner.", "Tap lone pair on Cl⁻, then + carbon."]}, // CAVEMAN
      id: 's17', type: 'try', skill: 'mechanism', widget: 'mechanism-player',
      prompt: 'The whole mechanism. Press Next to replay step 1 one arrow at a time; then draw step 2 yourself.',
      reaction: { reactants: MECH['hcl-ethylene'].reactants, products: MECH['hcl-ethylene'].products },
      config: { mech: MECH['hcl-ethylene'], modes: ['watch', 'draw'], whatIf: false, endLabel: false },
      confirm: 'The whole mechanism, in two steps. Every arrow ran from an electron-rich site to an electron-poor one.',
      recap: { q: 'HCl + ethylene, both steps.', note: 'Two steps: the π bond reaches the H of HCl and Cl leaves as Cl⁻, then a lone pair of Cl⁻ fills the empty p orbital of the + carbon. Every arrow ran from an electron-rich site to an electron-poor one.' },
      hints: ['Step 2 has one arrow. Start at the electron-rich partner.', 'Tap a lone pair on Cl⁻, then tap the + carbon.'],
      hintsFor: { dest: ['Your start is right: a lone pair on Cl⁻. End it on the + carbon, the one with only three bonds.', 'Start right. End on + carbon.'] },
      worked: 'Step 1 plays on its own. Step 2: tap a lone pair on Cl⁻, then tap the + carbon. The pair becomes the C–Cl bond: CH₃CH₂Cl.'
    },

    // ======================================================== 4. why that carbon: cation stability
    {
      caveman: {"prompt": "Carbon groups (CH₃, CH₂…) slightly rich: lend density to next-door + carbon. Most stable cation?", "reveal": "More C neighbours = steadier. 3: <b>tertiary (3°)</b>, 2: <b>secondary (2°)</b>, 1: <b>primary (1°)</b>.", "options": [{"why": "Yes. Three neighbours each lend: + softened most: most stable."}, {"why": "One neighbour helps little. (CH₃)₃C⁺: three lend: steadier."}, {"why": "No neighbour lends: CH₃⁺ least stable. More groups = steadier."}, {"why": "Same charge, not same help. More lenders = more stable."}]}, // CAVEMAN
      id: 's18', type: 'predict', skill: 'carbocations',
      answerable: 'The prompt says carbon groups lend density to the + carbon; everyday reasoning: more helpers = steadier.',
      prompt: 'Carbon groups (CH₃, CH₂ …) are slightly electron-rich: each one can lend a little electron density to a + carbon right next to it. Which carbocation is the most stable?',
      visual: PIC_THREE_CATIONS,
      options: [
        { text: '(CH₃)₃C⁺: three carbon groups lend to the + carbon', correct: true, why: 'Yes. Three neighbours each lend a little electron density, so the + is softened the most: the most stable cation.' },
        { text: 'CH₃CH₂⁺: one carbon group lends to the + carbon', why: 'One neighbour helps only a little. (CH₃)₃C⁺ has three carbon groups lending, so it is steadier.' },
        { text: 'CH₃⁺: only small H atoms sit on the + carbon, no carbon group at all', why: 'With no carbon neighbour, nothing lends electron density: CH₃⁺ is the least stable. More carbon groups = steadier.' },
        { text: 'All three equally, since each carries one + charge', why: 'The charge is the same, but the help it gets is not. More carbon neighbours lending density = more stable.' }
      ],
      reveal: 'More carbon neighbours = a more stable cation. A + carbon with three carbon neighbours is <b>tertiary (3°)</b>, with two <b>secondary (2°)</b>, with one <b>primary (1°)</b>.'
    },
    {
      caveman: {"html":"<p><b>3° > 2° > 1°.</b> Count C on C⁺ (Lesson 05). Alkyl group (CH₃) pushes density to poor C along σ bond: <b>inductive effect</b>.</p><p>Steadier cation: cheaper, forms faster. H goes to C=C end leaving <b>more stable</b> cation.</p>"}, // CAVEMAN
      id: 's19', type: 'explain', skill: 'carbocations',
      html: '<p><b>Cation stability: 3° > 2° > 1°.</b> Count the carbons bonded to the C⁺ (Lesson 05). Each <b>alkyl group</b> (a carbon group such as CH₃) pushes a little electron density to the poor carbon through the <b>σ bond</b> (single bond) joining them: the <b>inductive effect</b>.</p><p>A steadier cation takes less energy to make, so it forms faster. So H adds to the end of a C=C that leaves the <b>more stable</b> cation behind.</p>'
    },
    {
      caveman: {"prompt": "Propene CH₃CH=CH₂ + HCl. H bonds either C=C carbon. Which cation, product?", "reveal": "H goes to carbon with more H: + on more substituted carbon. Lesson 09 names it.", "options": [{"why": "Yes. H on end C: + on middle C, two C neighbours (2°). 2° wins; Cl⁻ bonds there."}, {"why": "+ on end carbon, one neighbour (1°). 2° steadier, forms faster."}, {"why": "Not equal: 2° beats 1°. Faster path wins: one major product."}, {"why": "HCl adds in two steps: H first, then Cl⁻ onto cation. 2° cation decides."}]}, // CAVEMAN
      id: 's20', type: 'predict', skill: 'carbocations',
      answerable: 's18-s19: 2° beats 1°, and the faster (steadier-cation) path wins; s16 says Cl⁻ bonds where the + is.',
      prompt: 'Propene, CH₃CH=CH₂, meets HCl. H can bond to either carbon of the C=C. Which cation forms, and which product do you get?',
      aside: '<p><b>Reading the names:</b> the number says which carbon of the three-carbon chain holds the Cl. <b>2-chloropropane</b> (CH₃CHClCH₃) has it on the middle carbon; <b>1-chloropropane</b> (CH₃CH₂CH₂Cl) on an end carbon.</p>',
      visual: { widget: 'arrow-draw', config: PIC_PROPENE_HCL },
      options: [
        { text: 'H on the end CH₂ leaves a 2° cation in the middle: 2-chloropropane, CH₃CHClCH₃', correct: true, why: 'Yes. H on the end carbon leaves the + on the middle carbon, which has two carbon neighbours (2°). The 2° cation wins, and Cl⁻ bonds there.' },
        { text: 'H on the middle CH leaves a 1° cation at the end: 1-chloropropane, CH₃CH₂CH₂Cl', why: 'That leaves the + on the end carbon, with only one carbon neighbour (1°). The 2° cation is steadier and forms faster.' },
        { text: 'Both cations form equally: a 50:50 mix of 1- and 2-chloropropane', why: 'The two cations are not equal: 2° beats 1°. The faster path wins, so one product is the major one.' },
        { text: 'No cation forms: Cl bonds straight to the end carbon (1-chloropropane)', why: 'HCl always adds in the two steps you drew: H first, then Cl⁻ onto the cation. The 2° cation decides where Cl goes.' }
      ],
      reveal: 'H goes to the carbon that already has more H, so the + lands on the more substituted carbon. Lesson 09 gives this pattern its name.'
    },

    // ======================================================== 5. the energy diagram: picture first, words after
    {
      caveman: {"prompt": "Step = ball over hill: climb, then roll. Step 1 of HCl + ethylene: high hill; step 2: low. Slower step?", "reveal": "Higher hill = slower step: drawn in <b>energy diagram</b>.", "options": [{"why": "Yes. High hill: few molecules cross each second: slow."}, {"why": "Order not speed. Step 2 low hill: fast once cation exists."}, {"why": "Each step own hill. Higher hill: fewer over: slower."}, {"why": "Low hill crossed easily. Step 1 hill: bottleneck."}]}, // CAVEMAN
      id: 's21', type: 'predict', skill: 'energy-diagram',
      answerable: 'Everyday reasoning: a higher hill is harder to get over, so fewer molecules cross it each second.',
      prompt: 'Think of each step as rolling a ball over a hill: it has to climb before it can roll down. Step 1 of HCl + ethylene has a high hill; step 2 a low one. Which step is slower?',
      options: [
        { text: 'Step 1, because few molecules have the energy to cross a high hill', correct: true, why: 'Yes. A high hill means few molecules have enough energy to get over it each second, so step 1 is slow.' },
        { text: 'Step 2, because it comes last and has to wait for step 1', why: 'Order is not speed. The low hill of step 2 is easy to cross, so step 2 is fast once the cation exists.' },
        { text: 'Neither: both steps are parts of one reaction and share one speed', why: 'Each step has its own hill. A higher hill means fewer molecules make it over each second: a slower step.' },
        { text: 'Step 2, because a low hill makes the ball roll on too fast to stop', why: 'A low hill is crossed easily and quickly. The high hill of step 1 is the bottleneck.' }
      ],
      reveal: 'A higher hill means a slower step. Chemists draw these hills in an <b>energy diagram</b>.'
    },
    {
      caveman: {"html": "<p><b>Energy diagram.</b> Up = energy; left to right = reaction forward.</p><p><b>Hill top</b> = <b>transition state</b>: bonds half-made, gone instantly. <b>Valley</b> between hills = <b>intermediate</b>: real, brief (carbocation). <b>Higher hill</b> = <b>slower step</b>.</p>"}, // CAVEMAN
      id: 's22', type: 'explain', skill: 'energy-diagram',
      html: '<p><b>Reading an energy diagram</b> (above). Up the side is energy. Left to right is the reaction going forward.</p><p>Each <b>hill top</b> is a <b>transition state</b>: bonds half-made and half-broken, gone in an instant. A <b>valley</b> between two hills is an <b>intermediate</b>: a real species that lasts a moment (here the carbocation). The <b>higher hill</b> belongs to the <b>slower step</b>.</p>',
      visualFirst: true,
      visual: { widget: 'energy-diagram', config: { levels: HCL_ETHYLENE_LEVELS, mode: 'view', reveal: true, notes: { 1: 'step 1', 2: 'the carbocation', 3: 'step 2' }, caption: 'HCl + ethylene: A reactants, B and D the hill tops of step 1 and step 2, C the carbocation valley, E the product. Illustrative energies, not measured values.' } }
    },
    {
      caveman: {"prompt": "Diagram for HCl + ethylene. Find each part.", "worked": "Hill tops B, D: transition states. Valley C: carbocation with Cl⁻. B higher: step 1 slow.", "hints": ["Hill top: transition state. Valley: intermediate.", "Transition states B, D. Intermediate C. Higher: B."]}, // CAVEMAN
      id: 's23', type: 'try', skill: 'energy-diagram', widget: 'energy-diagram',
      prompt: 'This is the diagram for HCl + ethylene. Find each part.',
      aside: '<p><b>From step 22:</b> a hill top is a <b>transition state</b> (the brief peak a step has to climb). A valley between two hills is an <b>intermediate</b> (a real, short-lived species: here the carbocation). Letters are only names for the levels.</p>',
      config: { levels: HCL_ETHYLENE_LEVELS, mode: 'tasks', tasks: ['ts', 'intermediate', { task: 'rds', ask: 'Tap the hill top of the slower step.' }], caption: 'Illustrative energies, not measured values.' },
      confirm: 'Hill tops B and D are transition states; the valley C is the carbocation intermediate; B is the higher hill, so step 1 is the slow step.',
      hints: ['A hill top is a transition state. A valley between two hills is an intermediate.', 'The transition states are B and D. The intermediate is C. The higher hill top is B.'],
      worked: 'Transition states are the hill tops, B and D. The intermediate is the valley between them, C: the carbocation with Cl⁻. B is higher than D, so step 1 is the slower step.'
    },
    {
      caveman: {"prompt": "Now numbers (kJ/mol). Read climb and change.", "worked": "Eact = 120 − 50 = 70. ΔH = 10 − 50 = −40 kJ/mol: released.", "hints": ["Eact: from step's start UP to hill top. ΔH: first, last level only.", "Step 1: A to B. ΔH: A to E (E lower: negative)."]}, // CAVEMAN
      id: 's24', type: 'try', skill: 'energy-diagram', widget: 'energy-diagram',
      prompt: 'Now with numbers (kJ/mol). Read the climb of step 1 and the overall change.',
      aside: '<p><b>Eact</b> (activation energy) = the climb from where a step starts up to its hill top. <b>ΔH</b> = the products’ level minus the reactants’ level.</p>',
      config: { levels: HCL_ETHYLENE_LEVELS, mode: 'tasks', tasks: ['eact:1', 'dh', 'dhsign'], showValues: true, reveal: true, caption: 'Illustrative energies, not measured values.' },
      confirm: 'Eact of step 1 = 120 − 50 = 70 kJ/mol. ΔH = 10 − 50 = −40 kJ/mol: the products sit lower, so energy is released.',
      hints: ['Eact starts at the level where the step begins (here the reactants) and goes UP to the hill top. ΔH compares only the first and the last level.', 'Step 1 climbs from A to B. ΔH runs from A to E (E is lower, so it is negative).'],
      worked: 'Eact of step 1 = B − A = 120 − 50 = 70 kJ/mol. ΔH = E − A = 10 − 50 = −40 kJ/mol, so energy is released.'
    },
    {
      caveman: {"html": "<p>Words for the picture:</p><ul><li><b>Exothermic</b>: products lower, ΔH negative, energy out (−40 kJ/mol here).</li><li><b>Endothermic</b>: products higher, ΔH positive.</li><li><b>Rate-determining step</b>: slowest, highest hill (step 1).</li></ul><p><b>Catalyst</b>: lowers hill, ends fixed: ΔH same.</p>"}, // CAVEMAN
      id: 's25', type: 'explain', skill: 'energy-diagram',
      html: '<p>Now the words, for the picture you just read:</p><ul><li><b>Exothermic</b>: products lower than reactants, ΔH negative, energy released (HCl + ethylene: −40 kJ/mol).</li><li><b>Endothermic</b>: products higher, ΔH positive, energy absorbed.</li><li><b>Rate-determining step</b>: the slowest step, the one with the highest hill (step 1 here).</li></ul><p>A <b>catalyst</b> lowers a hill without moving the start or the end, so ΔH stays the same.</p>'
    },

    // ======================================================== 6. reaction types on one screen
    {
      caveman: {"html": "<p>Four kinds. (Skeletal: corner or line end = C; H on C not drawn.)</p><p><b>Addition</b> (2 → 1)<br><span style=\"display:inline-block;white-space:nowrap\"><mol smiles=\"C1=CCCCC1\" label=\"cyclohexene\"></mol> + HCl</span> <span style=\"display:inline-block;white-space:nowrap\">→ <mol smiles=\"ClC1CCCCC1\" label=\"chlorocyclohexane\"></mol></span></p><p><b>Elimination</b> (1 → 2)<br><span style=\"display:inline-block;white-space:nowrap\"><mol smiles=\"OC1CCCCC1\" label=\"cyclohexanol\"></mol> →</span> <span style=\"display:inline-block;white-space:nowrap\"><mol smiles=\"C1=CCCCC1\" label=\"cyclohexene\"></mol> + H₂O</span></p><p><b>Substitution</b> (2 → 2)<br><span style=\"display:inline-block;white-space:nowrap\"><mol smiles=\"CCBr\" label=\"bromoethane\"></mol> + HO⁻</span> <span style=\"display:inline-block;white-space:nowrap\">→ <mol smiles=\"CCO\" label=\"ethanol\"></mol> + Br⁻</span></p><p><b>Rearrangement</b> (1 → 1)<br><span style=\"display:inline-block;white-space:nowrap\"><mol smiles=\"C=CCC\" label=\"but-1-ene\"></mol> →</span> <span style=\"display:inline-block;white-space:nowrap\"><mol smiles=\"CC=CC\" label=\"but-2-ene\"></mol> (isomer)</span><br>Acid moves C=C one carbon along.</p>"}, // CAVEMAN
      id: 's26', type: 'explain', skill: 'reaction-types',
      html: '<p>Reactions come in four kinds, sorted by counting molecules on each side of the arrow. (Skeletal drawings: each corner or line end is a C; H on C is not drawn.)</p><p><b>Addition</b> (2 → 1)<br><span style="display:inline-block;white-space:nowrap"><mol smiles="C1=CCCCC1" label="cyclohexene"></mol> + HCl</span> <span style="display:inline-block;white-space:nowrap">→ <mol smiles="ClC1CCCCC1" label="chlorocyclohexane"></mol></span></p><p><b>Elimination</b> (1 → 2)<br><span style="display:inline-block;white-space:nowrap"><mol smiles="OC1CCCCC1" label="cyclohexanol"></mol> →</span> <span style="display:inline-block;white-space:nowrap"><mol smiles="C1=CCCCC1" label="cyclohexene"></mol> + H₂O</span></p><p><b>Substitution</b> (2 → 2, parts swap)<br><span style="display:inline-block;white-space:nowrap"><mol smiles="CCBr" label="bromoethane"></mol> + HO⁻</span> <span style="display:inline-block;white-space:nowrap">→ <mol smiles="CCO" label="ethanol"></mol> + Br⁻</span></p><p><b>Rearrangement</b> (1 → 1, same formula)<br><span style="display:inline-block;white-space:nowrap"><mol smiles="C=CCC" label="but-1-ene"></mol> →</span> <span style="display:inline-block;white-space:nowrap"><mol smiles="CC=CC" label="but-2-ene"></mol> (isomer)</span><br>Acid moves the C=C one carbon along: McMurry’s example.</p>'
    },
    {
      caveman: {"problem": "Sort four: count both sides; 1 → 1: compare formulas.", "rule": "Addition: 2 → 1. Elimination: 1 → 2 (H₂O or HCl off). Substitution: 2 → 2. Rearrangement: 1 → 1, same formula.", "moves": [{"ask": "Ethylene + bromine. Kind?", "options": [{"why": "Yes. 2 → 1 (CH₂=CH₂ + Br₂ → BrCH₂CH₂Br): joined, nothing left."}, {"why": "Elimination: ONE reactant splits. Here: 2 reactants, 1 product."}, {"why": "Substitution: two in, two out. Here: 2 reactants, 1 product."}, {"why": "Rearrangement: ONE in, ONE out. Here: 2 reactants, 1 product."}]}, {"ask": "Propan-2-ol, CH₃CH(OH)CH₃, loses water, acid. Kind?", "options": [{"why": "Addition: ONE product. Here: 1 reactant, 2 products."}, {"why": "Yes. 1 → 2 (CH₃CH(OH)CH₃ → CH₃CH=CH₂ + H₂O): split."}, {"why": "Substitution: two in, two out. Here: 1 reactant, 2 products."}, {"why": "Rearrangement: ONE in, ONE out. Here: 1 reactant, 2 products."}]}, {"ask": "Cyanide meets bromomethane. Kind?", "options": [{"why": "Addition: ONE product. Here: 2 reactants, 2 products."}, {"why": "Elimination: ONE reactant splits. Here: 2 reactants, 2 products."}, {"why": "Yes. 2 → 2 (CH₃Br + CN⁻ → CH₃CN + Br⁻): swapped parts."}, {"why": "Rearrangement: ONE in, ONE out. Here: 2 reactants, 2 products."}]}, {"ask": "CH₂=CHCH(CH₃)₂, acid, becomes (CH₃)₂C=CHCH₃. Kind?", "options": [{"why": "Addition: two join into one. Here: 1 reactant, 1 product."}, {"why": "Elimination: ONE reactant splits. Here: 1 reactant, 1 product."}, {"why": "Substitution: two in, two out. Here: 1 reactant, 1 product."}, {"why": "Yes. 1 → 1 (CH₂=CHCH(CH₃)₂ → (CH₃)₂C=CHCH₃): same formula, isomer."}]}]}, // CAVEMAN
      id: 's27', type: 'worked', skill: 'reaction-types',
      problem: 'Sort these four reactions. Count the reactants and the products; when it is one to one, compare the formulas.',
      moves: [
        kindMove('br2-ethylene', 'Ethylene reacts with bromine. What kind of reaction is this?'),
        kindMove('propanol-dehydration', 'Propan-2-ol, CH₃CH(OH)CH₃, loses water in the presence of an acid catalyst. What kind of reaction is this?'),
        kindMove('bromomethane-cyanide', 'Cyanide ion meets bromomethane. What kind of reaction is this?'),
        kindMove('methylbutene-isomerization', '3-Methylbut-1-ene, CH₂=CHCH(CH₃)₂, is treated with an acid catalyst and becomes 2-methylbut-2-ene, (CH₃)₂C=CHCH₃. What kind of reaction is this?')
      ],
      rule: '<b>Addition</b>: 2 → 1, nothing left over. <b>Elimination</b>: 1 → 2, a small molecule such as H₂O or HCl comes off. <b>Substitution</b>: 2 → 2, parts swapped. <b>Rearrangement</b>: 1 → 1, same formula, new structure.'
    },

    // ======================================================== 7. nucleophile and electrophile, named last
    {
      caveman: {"html": "<p>Names. Rich site giving pair: <b>nucleophile</b> (seeks + centre). Poor site taking pair: <b>electrophile</b>.</p><p>Every arrow: nucleophile → electrophile (π bond → H, Cl⁻ → C⁺). Lesson 03: nucleophile = <b>Lewis base</b>, electrophile = <b>Lewis acid</b>.</p>"}, // CAVEMAN
      id: 's28', type: 'explain', skill: 'nuc-elec',
      html: '<p>Now the names. An electron-rich site that gives a pair is a <b>nucleophile</b> (“nucleus-lover”: it seeks a + centre). An electron-poor site that takes a pair is an <b>electrophile</b> (“electron-lover”).</p><p>Every arrow you drew ran from a nucleophile to an electrophile: π bond → H, Cl⁻ → C⁺. Lesson 03’s names fit too: a nucleophile acts as a <b>Lewis base</b>, an electrophile as a <b>Lewis acid</b>.</p>'
    },
    {
      caveman: {"prompt": "New names. Tap atom: nucleophilic = rich, electrophilic = poor. Acetone CH₃COCH₃: C=O.", "worked": "Acetone: O, then C=O carbon (δ+). Water: O, then either H (δ+). CH₃CH₂⁺: + carbon.", "hints": ["Nucleophilic: pair to give. Electrophilic: short (δ+, +, under octet).", "Acetone: O, then C=O carbon. Water: O, then H. CH₃CH₂⁺: + C."]}, // CAVEMAN
      id: 's29', type: 'try', skill: 'nuc-elec', widget: 'site-picker',
      prompt: 'Same skill, new names. Tap the atom each question names: nucleophilic means electron-rich, electrophilic means electron-poor. Acetone, CH₃COCH₃, has a carbonyl group: a C=O.',
      config: { items: [{ id: 'acetone', role: 'nuc' }, { id: 'acetone', role: 'elec' }, { id: 'water', role: 'nuc' }, { id: 'water', role: 'elec' }, { id: 'ethylcation', role: 'elec' }] },
      confirm: 'One molecule can be both: acetone’s O is nucleophilic and its C=O carbon electrophilic; water’s O gives pairs and its δ+ H can be taken as H⁺. CH₃CH₂⁺ is all electrophile.',
      hints: ['Nucleophilic = has a pair to give (lone pair, π bond, − charge). Electrophilic = short of electrons (δ+, +, under an octet).', 'Acetone: O (nucleophilic), the C=O carbon (electrophilic). Water: O, then either H. CH₃CH₂⁺: the + carbon.'],
      worked: 'Acetone: tap O (two lone pairs, δ−), then the C=O carbon (δ+, because O pulls on it). Water: tap O, then either H (δ+). CH₃CH₂⁺: tap the + carbon (six electrons).'
    },

    // ======================================================== 8. the last step: what to carry into Lesson 09
    {
      caveman: {"html": "<p><b>Carry five into Lesson 09:</b></p><ol><li>Rich → poor (<a href=\"#lesson-08/s03\">3</a>).</li><li>Arrows: lone pair → atom, bond → atom, bond → new bond (<a href=\"#lesson-08/s06\">6</a>).</li><li>HX: π → H, then X⁻ → C⁺ (<a href=\"#lesson-08/s17\">17</a>).</li><li>3° > 2° > 1° (<a href=\"#lesson-08/s19\">19</a>).</li><li>High hill slow; valley = intermediate (<a href=\"#lesson-08/s22\">22</a>).</li></ol>"}, // CAVEMAN
      id: 's30', type: 'explain', skill: 'mechanism',
      html: '<p><b>Last step: carry these five into Lesson 09</b> (tap one to review it).</p><ol><li><a href="#lesson-08/s03">Rich gives a pair to poor</a>.</li><li><a href="#lesson-08/s06">Three legal arrows</a>: lone pair → atom, bond → atom, bond → new bond.</li><li><a href="#lesson-08/s17">HX adds in two steps</a>: π bond → H, then X⁻ → C⁺.</li><li><a href="#lesson-08/s19">Cations: 3° > 2° > 1°</a>; H goes where it leaves the steadier one.</li><li><a href="#lesson-08/s22">Higher hill = slower step</a>; a valley is an intermediate.</li></ol>'
    }
  ],
  mastery: { count: 3, generator: 'mechanism-mastery' },   // 3 right first try; problems alternate: drawing arrows (HX + a symmetric alkene, HBr + propene) and reading energy diagrams (novice review #13)
  useIt: {
    book: ['3.11', '3.12', '3.13', '3.14', '3.15', '3.16', '3.17', '3.18', '3.19', '3.22', '3.23', '3.24', '3.25', '3.26', '3.27', '3.28', '3.46', '3.47', '3.48', '3.49', '3.50', '3.51', '3.55', '3.56', '3.57', '3.58', '3.59', '3.60'],
    endFrom: 20,
    note: 'From McMurry, <i>Fundamentals of Organic Chemistry</i>, Chapter 3 (sections 3.5 to 3.9). In-chapter 3.11 covers kinds of reactions, 3.12 to 3.14 polarity and nucleophiles/electrophiles, 3.15 and 3.16 the HCl mechanism, and 3.17 to 3.19 energy diagrams. End of chapter: 3.22 to 3.28 (visual and additional problems), 3.46 to 3.51 (Energy Diagrams) and 3.55 to 3.60 (General Problems, where 3.56 to 3.59 ask for curved arrows). Always draw the arrows from the electron-rich site to the electron-poor one.'
  }
};
