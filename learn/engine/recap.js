// Prerequisite recap: what each lesson leans on from earlier lessons, as one-line facts with a deep link to the step that taught it.
// RECAP[lessonId] = [{ n: 'lesson id', step: 'sK', fact: 'one line' }]. Lesson 1 needs nothing, so it has no card.
// app.js shows the card collapsed above step 1 (open on the learner's first visit to that lesson); tests check every link against the lesson files.
import { h } from './steps.js';
import { injectStyle } from './glossary.js';

export const RECAP = {
  '02': [
    { n: '01', step: 's04', fact: 'Atoms are happiest with 8 electrons around them (an octet); hydrogen wants 2. One bond is one shared pair.' },
    { n: '01', step: 's06', fact: 'A lone pair is a pair of valence electrons on one atom that is not shared in a bond (oxygen in water has two).' },
    { n: '01', step: 's09', fact: 'A double bond shares two pairs of electrons and a triple bond shares three.' }
  ],
  '03': [
    { n: '01', step: 's05', fact: 'A lone pair is a pair of electrons on one atom, not shared in a bond. Oxygen in water has two, nitrogen in ammonia has one.' },
    { n: '01', step: 's12', fact: 'Formal charge = valence electrons − lone-pair electrons − bonds. H₃O⁺ has a + on oxygen.' },
    { n: '02', step: 's15', fact: 'Electronegativity measures pull on shared electrons: H 2.1, C 2.5, N 3.0, O 3.5, F 4.0. The more electronegative atom is δ−.' }
  ],
  '04': [
    { n: '01', step: 's01', fact: 'Carbon makes four bonds in a stable neutral molecule.' },
    { n: '01', step: 's04', fact: 'Every line is a bond (a shared pair); a double bond counts as two lines and a triple bond as three.' }
  ],
  '05': [
    { n: '04', step: 's02', fact: 'In a skeletal drawing a carbon sits at every corner and every line end, and H atoms on carbon are not drawn.' },
    { n: '04', step: 's05', fact: 'Hydrogens on a carbon = 4 minus the lines going into it (a double bond counts as 2 lines).' },
    { n: '04', step: 's07', fact: 'You can read a molecular formula, such as C₄H₈O, straight off a skeletal drawing.' }
  ],
  '06': [
    { n: '02', step: 's01', fact: 'A carbon with four single bonds is sp³: tetrahedral, bond angles about 109.5°.' },
    { n: '02', step: 's02', fact: 'A σ bond is made by head-on overlap of orbitals along the line between the two nuclei.' },
    { n: '05', step: 's03', fact: 'Alkanes are CₙH₂ₙ₊₂ with only single bonds; a ring takes away two H (cycloalkanes are CₙH₂ₙ).' }
  ],
  '07': [
    { n: '02', step: 's05', fact: 'A double bond is one σ bond plus one π bond; the π bond is two p orbitals overlapping sideways, above and below the plane.' },
    { n: '02', step: 's03', fact: 'Each carbon of a C=C is sp² and flat, with bond angles near 120°.' },
    { n: '05', step: 's13', fact: 'The naming recipe: longest chain is the parent, number for the lowest numbers, then list branches alphabetically.' },
    { n: '04', step: 's02', fact: 'In skeletal drawings every corner and line end is a carbon and the H atoms on carbon are left out.' }
  ],
  '08': [
    { n: '01', step: 's05', fact: 'A lone pair is electron-rich: it is the kind of electrons a curved arrow can start from.' },
    { n: '02', step: 's15', fact: 'The more electronegative atom of a polar bond is δ−, the other is δ+.' },
    { n: '03', step: 's14', fact: 'A curved arrow starts at electrons (a lone pair or a bond) and points to the atom that receives them.' },
    { n: '03', step: 's16', fact: 'A Lewis base donates an electron pair; a Lewis acid accepts one.' }
  ],
  '09': [
    { n: '08', step: 's07', fact: 'A nucleophile is electron-rich and donates a pair of electrons; an electrophile is electron-poor and accepts a pair.' },
    { n: '08', step: 's09', fact: 'In HX addition the C=C π bond is the nucleophile: the first arrow runs from the π bond to the H of HX.' },
    { n: '08', step: 's12', fact: 'An energy diagram has transition states (peaks) and intermediates (valleys); the step with the bigger climb (Eact) is the slower one.' },
    { n: '05', step: 's09', fact: 'A carbon is primary, secondary, tertiary or quaternary by how many other carbons it is bonded to.' }
  ],
  '10': [
    { n: '09', step: 's04', fact: 'Markovnikov: in HX addition the H goes to the C=C carbon that already has more H, and the + lands on the more substituted carbon.' },
    { n: '09', step: 's08', fact: 'HX adds in two steps: the π bond attacks H to make a carbocation, then the halide attacks the carbocation.' },
    { n: '07', step: 's05', fact: 'Groups on the same side of a double bond are cis; on opposite sides they are trans. Cis groups crowd each other, so trans is usually more stable.' },
    { n: '06', step: 's09', fact: 'In a flat ring drawing a wedge comes toward you and a dash goes away from you.' }
  ],
  '11': [
    { n: '09', step: 's06', fact: 'A carbocation is stabilised by alkyl groups pushing electron density to the C⁺: tertiary is better than secondary, better than primary.' },
    { n: '08', step: 's08', fact: 'A curved arrow moves a pair of electrons from a lone pair or a bond to an atom or bond that can receive it.' },
    { n: '02', step: 's05', fact: 'A π bond is made of two p orbitals overlapping sideways, which is why π electrons can be shared with a neighbouring empty p orbital.' },
    { n: '03', step: 's07', fact: 'Acetate, CH₃CO₂⁻, is the conjugate base of acetic acid; its negative charge sits on oxygen.' }
  ],
  '12': [
    { n: '02', step: 's08', fact: 'A carbon with a triple bond is sp: it has two groups around it and the bond angle is 180° (a straight line).' },
    { n: '03', step: 's10', fact: 'A base can pull H⁺ off an acid if that acid has a lower pKa than the base’s own conjugate acid.' },
    { n: '07', step: 's13', fact: 'Alkenes are named from the longest chain that contains the double bond (-ene); a triple bond works the same way with -yne.' },
    { n: '09', step: 's04', fact: 'Markovnikov: H adds to the carbon that already has more H, because that leaves the + on the more stable carbon.' }
  ],
  '13': [
    { n: '11', step: 's03', fact: 'Resonance forms are drawings of one species that differ only in where π electrons and lone pairs sit; the real species is a blend.' },
    { n: '08', step: 's07', fact: 'An electrophile is electron-poor and accepts a pair; a nucleophile (here the ring’s π electrons) donates one.' },
    { n: '09', step: 's04', fact: 'A reaction goes through the more stable carbocation, which is also the one that forms faster.' },
    { n: '03', step: 's16', fact: 'A Lewis acid (such as FeBr₃) accepts an electron pair; here it makes Br₂ a stronger electrophile.' }
  ],
  '14': [
    { n: '13', step: 's19', fact: 'Benzene substitutes: the ring attacks an electrophile (slow), the carbocation shares its + over three carbons, then a base removes H⁺ (fast).' },
    { n: '13', step: 's13', fact: 'Ortho is the carbon next to a group, meta is one carbon further, and para is directly opposite.' },
    { n: '11', step: 's03', fact: 'Spreading a + charge over more atoms steadies a cation, which is why a + next to a C=C beats an ordinary one.' },
    { n: '09', step: 's06', fact: 'Alkyl groups donate electron density and stabilise a nearby + charge (the inductive effect).' }
  ],
  '15': [
    { n: '07', step: 's06', fact: 'CIP rules: the higher atomic number at the first point of difference ranks higher (Br > Cl > S > O > N > C > H).' },
    { n: '02', step: 's01', fact: 'A carbon with four single bonds is sp³ and tetrahedral, so its four groups point to the corners of a tetrahedron.' },
    { n: '06', step: 's09', fact: 'In a flat drawing a wedge bond comes toward you and a dashed bond goes away from you.' }
  ],
  '16': [
    { n: '15', step: 's04', fact: 'A chirality center is an sp³ carbon with four different groups; a molecule that is not superimposable on its mirror image is chiral.' },
    { n: '15', step: 's13', fact: 'R/S in three moves: rank the groups (CIP), put group 4 at the back, then read 1 → 2 → 3 as clockwise (R) or anticlockwise (S).' },
    { n: '10', step: 's03', fact: 'Br₂ adds anti: a bromonium ion forms, and Br⁻ attacks from the face opposite to it.' },
    { n: '15', step: 's09', fact: 'A polarimeter measures how far a solution turns plane-polarised light; enantiomers turn it equally in opposite directions.' }
  ]
};

const LABEL = (n) => 'Lesson ' + String(parseInt(n, 10));
const SEEN_KEY = 'orgo-learn-rc-seen';
function seenSet() { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch (e) { return []; } }
function markSeen(id) { try { const s = seenSet(); if (!s.includes(id)) { s.push(id); localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } } catch (e) { /* storage blocked: the card simply opens again */ } }

/** The "what you need from earlier lessons" card for a lesson, or null (Lesson 1). Collapsed, except on the first visit to that lesson. */
export function recapCard(lessonId) {
  const facts = RECAP[lessonId];
  if (!facts || !facts.length) return null;
  injectStyle();
  const first = !seenSet().includes(lessonId);
  const list = h('ul', { class: 'rc-list' }, facts.map((f) => h('li', {},
    h('span', {}, f.fact),
    h('span', { class: 'rc-from' }, `You need from ${LABEL(f.n)}: `, h('a', { class: 'rc-link', href: `#lesson-${f.n}/${f.step}` }, 'see the step')))));
  const d = h('details', { class: 'rc-card', 'data-gl-skip': '1', id: 'rc-card' }, h('summary', {}, 'Before you start: what you need from earlier lessons'), list);
  if (first) d.open = true;
  markSeen(lessonId);
  return d;
}
