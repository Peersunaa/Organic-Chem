// Lesson 14: Directors, side chains & aromatic synthesis (McMurry ch. 5, sections 5.6 to 5.10).
// Original wording throughout; book problems are referenced by number only.
// Everything chemical is computed: which positions a group sends E+ to, the products, the carbocations and their resonance forms (engine/reactions-aromatic.js, proven against Python
// RDKit by tools/check_directors.py), side-chain oxidation and hydrogenation, and the order puzzles (engine/synthesis.js runs every plan). Drawn answers below were generated from those
// engines and tests/lesson14.mjs recomputes each one (option `chk`). Steps that show carbocations are getters, so they are built when the step mounts (RDKit is ready by then).
// Not covered: rings with three or more groups, steric effects, the small meta product of o/p directors, Friedel-Crafts on rings with O-H or N-H groups, nitration of free amines.
import { sigmaAttack, ringGroups } from '../engine/reactions.js';
import { relation } from '../engine/naming-arene.js';

const opt = (text, correct, why, extra = {}) => ({ text, ...(correct ? { correct: true } : {}), why, ...extra });
const mo = (smiles, label, correct, why, extra = {}) => ({ smiles, label, ...(correct ? { correct: true } : {}), why, ...extra });
const mol = (s, l) => `<mol smiles="${s}" label="${l}"></mol>`;       // closed tag: an open <mol> would swallow the text after it

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

/** The carbocation for attack (electrophile written Br) at the ortho / meta / para carbon of a ring with one group. */
const attackAt = (smi, rel) => { const P = ringGroups(smi); const q = [0, 1, 2, 3, 4, 5].find((x) => relation(P.subs[0].pos, x) === rel); return sigmaAttack(smi, q, 'Br2'); };
const formTags = (a, name) => a.forms.map((f, i) => mol(f.smiles, `${name}, form ${i + 1}`)).join(' ');

const BZ = 'c1ccccc1';

export default arrange({
  id: '14', slug: 'directors-synthesis', title: 'Directors, side chains & aromatic synthesis', minutes: 29,
  chapter: 5, sections: ['5.6', '5.7', '5.8', '5.9', '5.10'],
  drawing: 'skeletal',
  goals: [
    'Sort substituents into activating ortho/para, deactivating ortho/para (the halogens) and deactivating meta directors, and predict where an electrophile goes on a substituted benzene',
    'Explain directing effects by drawing the carbocation for ortho, meta and para attack and finding the form that puts the + on the carbon that carries the group',
    'Predict side-chain oxidation with KMnO₄ (benzylic H needed) and ring hydrogenation, and recognise aromatic heterocycles by counting six π electrons',
    'Plan a multistep synthesis of a disubstituted benzene by working backward, choosing the ORDER of the steps'
  ],
  steps: [
    {
      caveman: {"prompt":"Toluene <mol smiles=\"Cc1ccccc1\" label=\"toluene\"></mol>: nitrated (HNO₃, H₂SO₄; electrophile NO₂⁺). C–H: two <b>ortho</b>, two <b>meta</b>, one <b>para</b> to CH₃. NO₂ goes where?","reveal":"<b>Ortho and para.</b> Group on ring decides how <i>fast</i> next substitution goes (vs benzene) and <i>where</i> new group lands. Three families. Sort some.","options":[{"why":"Yes. CH₃ steers NO₂ ortho and para; ring also reacts faster than benzene."},{"why":"Not observed. CH₃ sends new group ortho and para, not meta. (Some groups send meta: soon.)"},{"why":"Ratios if CH₃ had no influence (two ortho, two meta, one para C–H). It does: almost nothing meta."},{"why":"NO₂⁺ attacked by π electrons of RING, not CH₃ C–H bonds: substitution on ring."}]}, // CAVEMAN
      id: 's01', type: 'predict', skill: 'directors',
      prompt: `Toluene ${mol('Cc1ccccc1', 'toluene')} has a CH₃ group on the ring. It is nitrated with HNO₃ and H₂SO₄ (the electrophile is NO₂⁺). The ring has three kinds of C–H: two <b>ortho</b>, two <b>meta</b> and one <b>para</b> to the CH₃. Where does the NO₂ go?`,
      options: [
        opt(`Ortho and para to the CH₃: a mixture of ${mol('Cc1ccccc1[N+](=O)[O-]', 'o-nitrotoluene')} and ${mol('Cc1ccc(cc1)[N+](=O)[O-]', 'p-nitrotoluene')}`, true, 'Yes. The CH₃ group steers the NO₂ to the ortho and para positions, and the ring also reacts faster than benzene does.', { chk: { arene: 'Cc1ccccc1', reagent: 'HNO3', products: ['Cc1ccccc1[N+](=O)[O-]', 'Cc1ccc(cc1)[N+](=O)[O-]'] } }),
        opt(`Meta to the CH₃: ${mol('Cc1cccc(c1)[N+](=O)[O-]', 'm-nitrotoluene')}`, false, 'That is not what is observed. A CH₃ group does not send the new group meta; it sends it ortho and para. (Some groups do send it meta: you will meet them in a moment.)'),
        opt('Everywhere with equal chance, so the mixture is 2 ortho : 2 meta : 1 para', false, 'Those would be the ratios if the CH₃ had no influence (two ortho C–H, two meta C–H, one para C–H). It does have an influence: almost nothing goes meta.'),
        opt(`On the CH₃ group itself: ${mol('[O-][N+](=O)CC1=CC=CC=C1', 'phenylnitromethane')}`, false, 'NO₂⁺ is attacked by the π electrons of the RING, not by the C–H bonds of the CH₃, so the substitution happens on the ring.')
      ],
      reveal: '<b>Ortho and para.</b> Whatever group is already on the ring decides two things: how <i>fast</i> the next substitution goes (compared with benzene) and <i>where</i> the new group lands. There are only three families of groups. Sort some of them yourself.'
    },
    {
      caveman: {"prompt":"Sort eight groups into three bins. <b>Giving</b> electrons to ring <b>activates</b>; <b>pulling</b> out <b>deactivates</b>. Wrong bin explained.","worked":"Activator, ortho/para: –NH₂, –OR, alkyl. Deactivator, ortho/para: –Cl (halogen). Deactivator, meta: –NO₂, –C≡N, –CHO, –CO₂H. Lone pair or alkyl: activator; δ+ atom: deactivator, meta; halogen excepted","hints":["Atom on ring: lone pair (N or O) shared with ring: –NH₂, –OR activate. Alkyl pushes electrons in. δ+ atom (N of –NO₂, C of –C≡N, carbonyl C of –CHO, –CO₂H) pulls out: deactivate, direct meta.","Exception: halogen. Electronegative: deactivates, yet directs ortho/para. Other deactivators direct meta; no activator directs meta."]}, // CAVEMAN
      id: 's02', type: 'try', skill: 'directors', widget: 'director-sort',
      prompt: 'Sort these eight groups into the three bins. A group that <b>gives</b> electrons to the ring <b>activates</b> it; a group that <b>pulls</b> electrons out <b>deactivates</b> it. A wrong bin is explained, so a guess costs nothing.',
      config: { groups: ['NH2', 'OR', 'alkyl', 'Cl', 'NO2', 'CN', 'CHO', 'COOH'] },
      confirm: 'Three bins, from the book’s Figure 5.6: activators direct ortho/para; the halogens deactivate but still direct ortho/para; every other deactivator directs meta. No group is a meta-directing activator.',
      hints: ['Look at the atom bonded to the ring. A lone pair on it (N or O) can be shared with the ring, so –NH₂ and –OR activate. An alkyl group pushes electrons toward the ring. A δ+ atom (the N of –NO₂, the C of –C≡N, the carbonyl C of –CHO or –CO₂H) pulls electrons out: those groups deactivate and direct meta.', 'One group does not follow the pattern: the halogen. It is electronegative, so it deactivates, yet it still directs ortho/para. Every other deactivator on your list directs meta, and no activator directs meta.'],
      worked: 'Activator, ortho/para: –NH₂, –OR, alkyl. Deactivator, ortho/para: –Cl (the halogens). Deactivator, meta: –NO₂, –C≡N, –CHO, –CO₂H. Rule of thumb: a lone pair on the ring atom or an alkyl group means activator and ortho/para; a δ+ atom on the ring means deactivator and meta; the halogens are the one exception.'
    },
    {
      caveman: {}, // CAVEMAN
      id: 's03', type: 'explain', skill: 'directors',
      html: '<p><b>The map (McMurry Figure 5.6).</b> Activators, ortho/para: –NH₂, –NHR, –NR₂, –OH, –OR, –NHCOR, alkyl, –C₆H₅. Deactivators, ortho/para: –F, –Cl, –Br, –I. Deactivators, meta: –NO₂, –C≡N, –SO₃H, –CHO, –COR, –CO₂H, –CO₂R, –NR₃⁺. There are <b>no meta-directing activators</b>. In nitration an –OH ring reacts about 1000 times faster than benzene and an –NO₂ ring more than ten million times slower. Why? Look at the carbocation.</p>'
    },
    {
      caveman: {"prompt":"Why CH₃ sends E⁺ ortho and para? Carbocation: E⁺ (drawn Br) attacks carbon <b>para</b> to CH₃ of toluene. Draw curved arrows: all ring resonance forms. Pick <b>special form</b>: + on carbon carrying CH₃.","worked":"Three forms: + on two carbons next to sp³ carbon, and carbon opposite. In para attack opposite carbon carries CH₃: special form: + on carbon with electron-donating group.","hints":["Arrows start at electrons: C=C π bond next to C⁺, then single bond between. + moves to other end. Repeat until no new form.","sp³ carbon (Br, H) never holds +. After three ring forms, look at carbon carrying CH₃: in exactly one form it has +."]}, // CAVEMAN
      id: 's04', type: 'try', skill: 'directors', widget: 'resonance-drawer',
      prompt: 'Why does CH₃ send E⁺ ortho and para? Below is the carbocation made when an electrophile E⁺ (drawn as Br) attacks the carbon <b>para</b> to the CH₃ of toluene. Draw curved arrows to find all its ring resonance forms. Then pick the <b>special form</b>: the one where the + sits on the carbon that carries the CH₃.',
      config: {
        get start() { return attackAt('Cc1ccccc1', 'para').sigma; }, name: 'para attack on toluene', ringOnly: true,
        find: { ask: 'Which form puts the + on the carbon that carries the CH₃? Tap it.', right: 'Yes. In that form the + sits on the carbon that holds the CH₃, a carbocation with three carbon neighbours.' }
      },
      confirm: 'The special form puts the + on the carbon that holds the CH₃. Alkyl groups donate electrons, so that form is stabilised, and the whole carbocation is lower in energy than its meta counterpart. Ortho attack has this special form too.',
      hints: ['Arrows start at electrons: tap the C=C π bond next to the C⁺, then tap the single bond between them. The + moves to the other end of that C=C. Repeat from the new form until no new form appears.', 'The sp³ carbon (the one with Br and H) never holds the +. After the three ring forms are found, look at the carbon that carries the CH₃ in each one: in exactly one form it is the carbon with the + charge.'],
      worked: 'Three forms: the + sits on the two ring carbons next to the sp³ carbon, and on the carbon opposite it. For para attack the carbon opposite the sp³ carbon is the one that carries the CH₃. That form is the special one: the + is on the carbon that holds an electron-donating group.'
    },
    {
      caveman: {"prompt":"Nitrobenzene. E⁺ attacks carbon <b>ortho</b> to NO₂. Find ring resonance forms (NO₂'s own not asked). Pick form with + on carbon carrying NO₂.","worked":"Three ring forms: + on two carbons next to sp³, and opposite. In ortho attack one carbon next to sp³ carries NO₂. Form with + there is bad: next to δ+ nitrogen.","hints":["Arrows start at ring C=C π bond next to C⁺, end on single bond between. Repeat until no new form (three).","Carbon carrying NO₂ in each form. In one it has +."]}, // CAVEMAN
      id: 's05', type: 'try', skill: 'directors', widget: 'resonance-drawer',
      prompt: 'Now nitrobenzene. E⁺ attacks the carbon <b>ortho</b> to the NO₂. Find the ring resonance forms (the NO₂ group’s own resonance is not asked for). Then pick the form that puts the + on the carbon that carries the NO₂ group.',
      config: {
        get start() { return attackAt('O=[N+]([O-])c1ccccc1', 'ortho').sigma; }, name: 'ortho attack on nitrobenzene', ringOnly: true,
        find: { ask: 'Which form puts the + on the carbon that carries the NO₂? Tap it.', right: 'Yes. That is the unfavourable form: the + is on the carbon bonded to the nitrogen, which already carries a positive charge.' }
      },
      confirm: 'That form puts a + on the ring carbon bonded to the N of NO₂, and the N already carries a partial positive charge: two positive charges side by side. Very unfavourable, so ortho (and para) attack is slow. Meta attack never makes this form.',
      hints: ['Arrows start at a ring C=C π bond next to the C⁺ and end on the single bond between them. Keep going from each new form until no new ring form appears (three in all).', 'Look at the carbon that carries the NO₂ in each form. In one of the three forms it is the carbon with the + charge.'],
      worked: 'Three ring forms again: the + on the two carbons next to the sp³ carbon and on the carbon opposite it. For ortho attack, one of the carbons next to the sp³ carbon is the one that carries the NO₂. The form with the + on that carbon is the bad one, because it sits next to the δ+ nitrogen.'
    },
    {
      caveman: {"worked":"Attack at C3: C3 sp³. + on C2, C4, C6. Group carbon C1: no form has + there. For ortho attack (C2): + on C1, C3, C5; para attack (C4): C3, C5, C1: C1 appears.","hints":["Number from group carbon (1). Meta attack at carbon 3 (sp³). Which carbons hold +?","+ on carbons next to sp³ (2, 4) and opposite (6). Group carbon 1: not on list."],"options":[{"why":"Yes. Special form needs + on group carbon; meta attack cannot. No extra stabilised form with CH₃, no bad form with NO₂."},{"why":"Only ortho and para attack put + on group carbon. Check forms: + always on carbon with only H."},{"why":"Donor or withdrawer does not change where + sits. Count: neither ring has + on group carbon in meta attack."},{"why":"sp³ carbon holds no +; + moves two bonds. In meta attack none is group carbon."}], get prompt() { const t = attackAt('Cc1ccccc1', 'meta'), n = attackAt('O=[N+]([O-])c1ccccc1', 'meta'); return `<b>meta</b> attack, both rings: toluene, nitrobenzene ring forms. Six forms: how many put + on carbon with the group?<br>${formTags(t, 'toluene, meta attack')}<br>${formTags(n, 'nitrobenzene, meta attack')}`; } }, // CAVEMAN
      id: 's06', type: 'choice', skill: 'directors',
      get prompt() {
        const t = attackAt('Cc1ccccc1', 'meta'), n = attackAt('O=[N+]([O-])c1ccccc1', 'meta');
        return `Now <b>meta</b> attack on both rings. Here are the three ring forms of the carbocation for toluene and for nitrobenzene. How many of the six forms put the + on the carbon that carries the group?<br>${formTags(t, 'toluene, meta attack')}<br>${formTags(n, 'nitrobenzene, meta attack')}`;
      },
      options: [
        opt('None: the + only ever lands on carbons that carry just an H', true, 'Yes. The special form needs the + on the carbon that carries the group, and meta attack cannot put it there. So meta attack has no extra stabilised form with CH₃, and no bad form with NO₂.', { chk: { arene: 'Cc1ccccc1', rel: 'meta', special: false } }),
        opt('One in each ring, the same as for ortho and para attack, so it carries over', false, 'Only ortho and para attack can put the + on the carbon that carries the group. Check the three forms of each ring: the + is always on a carbon with only an H.'),
        opt('Only in toluene, because CH₃ is an electron donor, so it can hold the +', false, 'Whether a group donates or withdraws does not change where the + can sit. Count the forms: in neither ring does a meta-attack form have the + on the carbon that carries the group.'),
        opt('All six, because the + can reach every carbon', false, 'The sp³ carbon cannot hold the +, and the + moves only to carbons two bonds apart. In meta attack none of those is the carbon that carries the group.')
      ],
      hints: ['Number the ring carbons from the carbon that carries the group (1). Meta attack happens at carbon 3; the sp³ carbon is carbon 3. Which carbons can hold the +?', 'The + sits on the carbons next to the sp³ carbon (2 and 4) and on the carbon opposite it (6). The carbon that carries the group is carbon 1: it is not on that list.'],
      worked: 'Attack at carbon 3 makes C3 sp³. The + can be on C2, C4 or C6, the carbons next to C3 and opposite it. The carbon that carries the group is C1, so no form puts the + there. For ortho attack (C2) the + can be on C1, C3 or C5, and for para attack (C4) on C3, C5 or C1: C1 appears.',
      confirm: 'So the result is general. For an ortho or para attack one form puts the + on the carbon that carries the group: a donor (CH₃, lone pair) makes that form extra stable, so ortho/para win; a δ+ atom (NO₂) makes it very unstable, so meta wins by avoiding it.'
    },
    {
      caveman: {"worked":"Rate: Cl withdraws through σ bond (inductive): less reactive. Position: ortho, para attack: one form + on Cl-bearing carbon, Cl lone pair shares it. Meta: no such form. Halogens deactivating yet ortho/para directing.","hints":["Two facts: rate (slower), position (ortho/para). Different Cl effects.","Cl more electronegative: withdraws through σ bond. Cl has lone pairs: last form shows what lone pair does for +."],"options":[{"why":"Yes. Inductive withdrawal (through σ bond): deactivating; lone-pair donation helps only ortho, para carbocations: ortho/para."},{"why":"Lone-pair donation real, but helps only ortho, para attack. Ring 30 times slower than benzene: σ-bond withdrawal wins on rate."},{"why":"Ring atom is Cl: more electronegative than carbon: δ−, lone pairs. –NO₂: δ+ nitrogen, no lone pair."},{"why":"Size irrelevant: meta carbons no more crowded than para. Directing effect: lone pair donation in carbocation."}], get prompt() { const a = attackAt('Clc1ccccc1', 'ortho'); return `Chlorobenzene: nitration about 30 times <b>slower</b>, yet ortho, para products. Ortho attack forms (last: + on Cl).<br>${formTags(a, 'chlorobenzene, ortho attack')} ${mol(a.donor, 'extra form: + on Cl')}<br>What explains <b>both</b>?`; } }, // CAVEMAN
      id: 's07', type: 'choice', skill: 'directors',
      get prompt() {
        const a = attackAt('Clc1ccccc1', 'ortho');
        return `Chlorobenzene is nitrated about 30 times <b>slower</b> than benzene, yet the products are the ortho and para isomers. Here are the carbocation forms for ortho attack on chlorobenzene (the last has the + on Cl).<br>${formTags(a, 'chlorobenzene, ortho attack')} ${mol(a.donor, 'extra form: + on Cl')}<br>Which statement explains <b>both</b> facts?`;
      },
      options: [
        opt('Cl pulls electrons through the σ bond, which slows every attack; but in ortho and para attack its lone pair can share the +', true, 'Yes. The inductive withdrawal (pulling electrons through the σ bond) makes the ring less reactive than benzene (deactivating), while the lone-pair donation only helps the ortho and para carbocations, so the orientation is ortho/para.', { chk: { arene: 'Clc1ccccc1', rel: 'ortho', donor: true } }),
        opt('Cl is a strong electron donor, so it activates the ring and directs ortho/para, as OCH₃ does in anisole', false, 'The lone-pair donation is real, but it only helps in ortho and para attack. Overall the ring is less reactive than benzene (30 times slower), so the electron-withdrawing effect through the σ bond must win on rate.'),
        opt('Cl carries a δ+ atom on the ring like NO₂, so it deactivates the ring and should direct meta', false, 'The atom on the ring is Cl itself, and it is more electronegative than carbon: it is δ− and has lone pairs. –NO₂ is different: its atom on the ring is a δ+ nitrogen with no lone pair to give.'),
        opt('Cl is large, so it blocks the carbons next to it, and ortho/para is all that is left over', false, 'Size does not explain it: the meta carbons are no more crowded than the para carbon. The directing effect comes from electron donation by the lone pair in the carbocation.')
      ],
      hints: ['There are two separate facts: the rate (slower than benzene) and the position (ortho/para). One effect of Cl may explain the rate, a different effect the position.', 'Cl is more electronegative than C, so it withdraws electrons through the σ bond. Cl also has lone pairs, and the last form above shows what a lone pair can do for the + charge.'],
      worked: 'Rate: Cl withdraws electrons through the σ bond (inductive effect), so the ring is less reactive. Position: in ortho and para attack, one form puts the + on the carbon that carries Cl, and Cl’s lone pair can share it (the form with + on Cl). Meta attack has no such form. That is why the halogens are deactivating yet ortho/para directing.',
      confirm: 'The halogens are the paradox of Figure 5.6: electron-withdrawing by induction (deactivating) and electron-donating by resonance (ortho/para directing).'
    },
    {
      caveman: {"prompt":"Predict where electrophile goes. Tap <b>every</b> carbon getting new group. Fifth ring: methyl, nitro: groups agree, no conflict.","worked":"Phenol: –OH ortho/para: two ortho, para carbons. Nitrobenzene, acetophenone: meta directors: two meta carbons. Chlorobenzene: halogens ortho/para. p-Nitrotoluene: both send E⁺ next to CH₃ (meta to NO₂).","hints":["Group's bin first. Ortho/para: E⁺ to two carbons next to group, and opposite. Meta: two carbons one further.","Tap equivalent carbons too: two ortho, two meta, one para. p-Nitrotoluene: carbons ortho to CH₃ AND meta to NO₂."]}, // CAVEMAN
      id: 's08', type: 'try', skill: 'directors', widget: 'ring-position',
      prompt: 'Predict where the electrophile goes. For each ring, tap <b>every</b> carbon that will carry the new group. The fifth ring has two groups (a methyl and a nitro group): when the groups agree, there is no conflict.',
      config: { attack: ['Oc1ccccc1', 'O=[N+]([O-])c1ccccc1', 'Clc1ccccc1', 'CC(=O)c1ccccc1', 'Cc1ccc(cc1)[N+](=O)[O-]'] },
      confirm: 'The rule: –OH and –Cl send E⁺ ortho and para; –NO₂ and –COCH₃ send it meta. In p-nitrotoluene the CH₃ points to the carbons next to it and the NO₂ points to the very same carbons (meta to the NO₂), so they cooperate.',
      hints: ['First decide the bin of the group on the ring. Ortho/para directors send E⁺ to the two carbons next to the group and to the carbon opposite it. Meta directors send it to the two carbons one further round.', 'Tap equivalent carbons too: there are two ortho carbons and two meta carbons, but only one para carbon. For p-nitrotoluene, find the carbons that are ortho to the CH₃ AND meta to the NO₂.'],
      worked: 'Phenol: –OH is an ortho/para director, so the two ortho carbons and the para carbon. Nitrobenzene and acetophenone: meta directors, so the two meta carbons. Chlorobenzene: the halogens direct ortho/para. p-Nitrotoluene: the carbons next to the CH₃ are meta to the NO₂, so both groups send E⁺ to those two carbons.'
    },
    {
      caveman: {"prompt":"Lab: pick ring, reagent; predict product <b>or products</b> BEFORE lab (ortho/para director: two isomers). Some combinations fail: lab says why. Three right.","hints":["Group on ring, its bin: ortho/para director: TWO products (one answer); meta director: ONE.","Wrong answers: other bin's product, one of two isomers, or two new groups. Lab refuses combination: read why."]}, // CAVEMAN
      id: 's09', type: 'try', skill: 'directors', widget: 'reaction-lab',
      prompt: 'Back in the lab with substituted rings. Pick a ring and a reagent, and predict the product <b>or products</b> BEFORE the lab shows them (an ortho/para director gives two isomers, drawn together). Some combinations do not work, and the lab says why. Get three predictions right.',
      config: { need: 3, subst: { arenes: ['toluene', 'phenol', 'chlorobenzene', 'bromobenzene', 'nitrobenzene', 'benzoic-acid', 'acetophenone', 'benzonitrile', 'aniline'], reagents: ['bromination', 'chlorination', 'nitration', 'sulfonation', 'acetylation', 'methylation'] } },
      confirm: 'Three right. For each one: name the group, find its bin, send E⁺ ortho and para or meta. Remember the two exceptions: Friedel–Crafts fails on rings with –NO₂, –C≡N, –SO₃H or –COR, and on amines such as aniline.',
      hints: ['Name the group on the ring and find its bin: an ortho/para director gives TWO products (ortho and para, drawn together in one answer); a meta director gives ONE.', 'The wrong answers are the other bin’s product, only one of the two isomers, or a ring with two new groups. If the lab refuses a combination, read why: that is part of the lesson.'],
      worked: 'For example: toluene + Br₂/FeBr₃ gives o- and p-bromotoluene; nitrobenzene + Cl₂/FeCl₃ gives m-chloronitrobenzene; bromobenzene + HNO₃/H₂SO₄ gives o- and p-bromonitrobenzene; benzoic acid + HNO₃/H₂SO₄ gives m-nitrobenzoic acid. Nitrobenzene + CH₃Cl/AlCl₃ gives nothing, because the ring is too deactivated.'
    },
    {
      caveman: {"prompt":"Ring resists KMnO₄; side chain does not. Propylbenzene <mol smiles=\"CCCc1ccccc1\" label=\"propylbenzene\"></mol> + KMnO₄, water, heated: aromatic product?","worked":"Propylbenzene benzylic carbon CH₂: has H. KMnO₄ oxidises chain to –CO₂H on ring carbon; other two carbons lost: benzoic acid. Ring untouched.","hints":["Ring not oxidised: look at alkyl group. Benzylic carbon (bonded to ring): has H?","Alkyl with benzylic H becomes –CO₂H on same ring carbon, any length (butylbenzene: benzoic acid)."],"options":[{"why":"Yes. KMnO₄ attacks benzylic C–H (carbon on ring), oxidises whole alkyl group to –CO₂H, any length. Rest lost."},{"why":"That oxidises far end. KMnO₄ attacks benzylic position, next to ring: carboxylic acid there."},{"why":"Not stopping at ketone: KMnO₄ takes benzylic carbon to carboxylic acid, cleaves rest."},{"why":"No H on benzylic carbon: no reaction. Here two: KMnO₄ oxidises."}]}, // CAVEMAN
      id: 's10', type: 'choice', skill: 'side-chains',
      prompt: `A benzene ring resists strong oxidants such as KMnO₄, but a side chain on it does not. Propylbenzene ${mol('CCCc1ccccc1', 'propylbenzene')} is heated with KMnO₄ in water. What is the aromatic product?`,
      options: [
        mo('OC(=O)c1ccccc1', 'benzoic acid', true, 'Yes. KMnO₄ attacks the C–H bonds on the benzylic carbon (the carbon bonded to the ring) and oxidises the whole alkyl group to –CO₂H, whatever its length. The rest of the chain is lost.', { chk: { sm: 'CCCc1ccccc1', product: 'OC(=O)c1ccccc1' } }),
        mo('OC(=O)CCc1ccccc1', '3-phenylpropanoic acid', false, 'That would oxidise the far end of the chain. KMnO₄ attacks the benzylic position, next to the ring, and carries the oxidation to a carboxylic acid right there.'),
        mo('CCC(=O)c1ccccc1', '1-phenylpropan-1-one', false, 'The oxidation does not stop at the ketone: with KMnO₄ the benzylic carbon goes on to the carboxylic acid, and the rest of the chain is cleaved off.'),
        mo('CCCc1ccccc1', 'propylbenzene', false, 'No reaction is the answer only when the benzylic carbon has no H. This one has two, so KMnO₄ oxidises the chain.')
      ],
      hints: ['The ring is not oxidised, so look at what happens to the alkyl group. Find the benzylic carbon (the one bonded to the ring): does it have an H?', 'Any alkyl group with a benzylic H is converted into –CO₂H on the same ring carbon. Chain length does not matter (butylbenzene gives benzoic acid in the book’s example).'],
      worked: 'The benzylic carbon of propylbenzene is a CH₂, so it has H. KMnO₄ oxidises the side chain to –CO₂H right on the ring carbon, and the other two carbons are lost: the product is benzoic acid. The ring itself is untouched.',
      confirm: 'Alkylbenzene to benzoic acid. That makes KMnO₄ useful in synthesis: it turns an ortho/para-directing CH₃ into a meta-directing –CO₂H.'
    },
    {
      caveman: {"prompt":"tert-Butylbenzene <mol smiles=\"CC(C)(C)c1ccccc1\" label=\"tert-butylbenzene\"></mol> + KMnO₄, water, heated: what happens?","worked":"Benzylic carbon of tert-butyl, –C(CH₃)₃: ring, three CH₃: four bonds, no H. KMnO₄ cannot attack absent benzylic C–H: tert-butylbenzene recovered. (A flaw in a book synthesis problem.)","hints":["KMnO₄ needs what? Check carbon on ring in tert-butyl.","Draw tert-butyl: carbon, three CH₃, on ring. Count H."],"options":[{"why":"Yes. Oxidation starts at benzylic C–H. tert-Butyl benzylic carbon: three CH₃, ring, no H. Ring not attacked either."},{"why":"The trap. Benzoic acid needs benzylic H. tert-Butyl has none."},{"why":"KMnO₄ does not oxidise ring (aromatic stability): nothing else to attack."},{"why":"Needs CH₃ of tert-butyl oxidised. KMnO₄ attacks benzylic C–H: none: not attacked."}]}, // CAVEMAN
      id: 's11', type: 'choice', skill: 'side-chains',
      prompt: `Is every alkyl group oxidised? tert-Butylbenzene ${mol('CC(C)(C)c1ccccc1', 'tert-butylbenzene')} is heated with KMnO₄ in water. What happens?`,
      options: [
        opt('Nothing: the side chain has no benzylic H, so it comes back unchanged', true, 'Yes. The oxidation starts by attacking a C–H bond on the benzylic carbon. The benzylic carbon of tert-butyl is bonded to three CH₃ groups and the ring, and has no H. The ring itself is not attacked either.', { chk: { sm: 'CC(C)(C)c1ccccc1', reacts: false } }),
        opt(`It gives benzoic acid ${mol('OC(=O)c1ccccc1', 'benzoic acid')}, like every other alkylbenzene`, false, 'This is the trap. Benzoic acid forms only from an alkyl group that has an H on the benzylic carbon. tert-Butyl does not.'),
        opt('The ring is oxidised instead, since the side chain cannot be', false, 'A benzene ring is not oxidised by KMnO₄ (its aromatic stability protects it), so there is nothing else for the oxidant to attack.'),
        opt(`The CH₃ groups are oxidised: ${mol('OC(=O)C(C)(C)c1ccccc1', '2-methyl-2-phenylpropanoic acid')}`, false, 'That would need one of the CH₃ groups of the tert-butyl group to be oxidised. KMnO₄ attacks benzylic C–H bonds, and there are none here, so the tert-butyl group is not attacked.')
      ],
      hints: ['What does KMnO₄ need to start the oxidation? Check the carbon bonded directly to the ring in tert-butyl.', 'Draw tert-butyl: a carbon with three CH₃ groups, bonded to the ring. Count its H atoms.'],
      worked: 'The benzylic carbon of tert-butyl, –C(CH₃)₃, is bonded to the ring and three CH₃ groups: four bonds, no H. KMnO₄ cannot attack a benzylic C–H that is not there, so tert-butylbenzene is recovered unchanged. (This is one of the flaws in a synthesis in the book’s end-of-chapter problems.)',
      confirm: 'Rule: KMnO₄ oxidises an alkyl group only if its benzylic carbon has at least one H. tert-Butyl is the classic exception.'
    },
    {
      caveman: {"prompt":"H₂ + Pd/C, ordinary pressure, adds to ordinary C=C. Styrene <mol smiles=\"C=Cc1ccccc1\" label=\"styrene\"></mol> (C=C on ring), H₂ and Pd/C, 1 atm. Product?","worked":"Vinyl C=C hydrogenated to CH₂–CH₃: ethylbenzene. Ring untouched under mild conditions. H₂, Pt, high pressure: ring too (benzene → cyclohexane).","hints":["Two kinds of C=C in styrene. Ordinary alkene? Aromatic ring, so stable?","Mild (Pd/C, 1 atm): ordinary C=C only. Ring: Pt (or Rh), high pressure, high temperature."],"options":[{"why":"Yes. Outside C=C hydrogenated; ring survives: harder to reduce."},{"why":"Reduces ring too. Ring needs Pt (or Rh), high pressure and temperature (book: o-xylene at 130 atm)."},{"why":"Reverse: ordinary C=C reacts easily; ring does not."},{"why":"C=C outside ring ordinary alkene: hydrogenated easily."}]}, // CAVEMAN
      id: 's12', type: 'choice', skill: 'side-chains',
      prompt: `Hydrogen with a Pd/C catalyst at ordinary pressure adds to ordinary C=C bonds. Styrene ${mol('C=Cc1ccccc1', 'styrene')} (a C=C on a benzene ring) is shaken with H₂ and Pd/C at 1 atm. What is the product?`,
      options: [
        mo('CCc1ccccc1', 'ethylbenzene', true, 'Yes. The C=C outside the ring is hydrogenated; the ring survives. A benzene ring is much harder to reduce than an alkene.', { chk: { sm: 'C=Cc1ccccc1', cond: 'H2_Pd', product: 'CCc1ccccc1' } }),
        mo('CCC1CCCCC1', 'ethylcyclohexane', false, 'That reduces the ring as well. The ring is reduced only with a Pt (or Rh) catalyst under high pressure and temperature (the book reduces o-xylene at 130 atm).'),
        mo('C=CC1CCCCC1', 'vinylcyclohexane', false, 'That would reduce the ring and leave the C=C. It is the other way round: the ordinary C=C reacts easily; the aromatic ring does not.'),
        mo('C=Cc1ccccc1', 'styrene', false, 'The C=C outside the ring is an ordinary alkene and is hydrogenated easily, so styrene does not survive.')
      ],
      hints: ['There are two kinds of C=C bond in styrene. Which is an ordinary alkene, and which belongs to the aromatic ring that is so stable?', 'Mild conditions (Pd/C, 1 atm) reduce only the ordinary C=C. To reduce the ring itself you need a Pt (or Rh) catalyst, high pressure and high temperature.'],
      worked: 'The vinyl C=C is hydrogenated to CH₂–CH₃: ethylbenzene. The ring is untouched under mild conditions. With H₂ and Pt at high pressure the ring is reduced too (benzene gives cyclohexane; o-xylene gives cis-1,2-dimethylcyclohexane in the book).',
      confirm: 'Selective reduction: C=C outside the ring first, the ring only under forcing conditions (H₂, Pt, high pressure). Benzene itself is reduced to cyclohexane only that way.'
    },
    {
      caveman: {"prompt":"Aromatic rings with non-carbon atom: heterocycles. <b>Pyridine</b>: ring N replaces one CH. Six ring atoms sp², one p orbital each, up and down; N lone pair <i>outward</i> in plane, not π system. π electrons in pyridine ring?","worked":"Three π bonds × 2 = 6 π electrons, one per sp² ring atom. N lone pair in plane (sp²). Six, cyclic, conjugated: aromatic.","hints":["Three double bonds: each one π bond, 2 electrons. Count double bonds.","Or: one π electron per six sp² ring atoms. N lone pair in plane: not counted."]}, // CAVEMAN
      id: 's13', type: 'input', skill: 'directors',
      prompt: 'Aromatic rings are not always benzene: some contain an atom other than carbon (these are heterocycles). <b>Pyridine</b> has a ring N in place of one CH. Each of the six ring atoms is sp² and has one p orbital pointing up and down; the N lone pair points <i>outward</i> in the plane of the ring, not into the π system. How many π electrons does the ring of pyridine have?',
      smiles: 'c1ccncc1',
      answer: 6, accept: ['six'],
      diagnose: [
        { match: '5', why: 'Five would leave out one ring atom. In pyridine the N is part of a C=N double bond, so it contributes one π electron, like each carbon. Count one electron for each of the six ring atoms.' },
        { match: '7', why: 'The N lone pair is not in the π system: it lies in the plane of the ring. Count one π electron for each of the six ring atoms, nothing more.' },
        { match: '8', why: 'The N lone pair points outward in the plane of the ring, so it is not one of the π electrons. Count only one π electron on each of the six ring atoms.' },
        { match: '3', why: 'Three is the number of double bonds. Each double bond holds two π electrons, so the ring has 3 × 2 π electrons.' }
      ],
      hints: ['In a drawing with three double bonds, each double bond contributes one π bond, which holds 2 electrons. Count the double bonds in the ring.', 'Equivalent count: one π electron on each of the six sp² ring atoms. The lone pair on the N is in the plane, so it is not part of the count.'],
      worked: 'Three C=C/C=N π bonds × 2 electrons = 6 π electrons: one on each ring atom (sp², one p orbital each). The N lone pair is in an sp² orbital in the plane. Six π electrons in a cyclic conjugated ring: aromatic, like benzene.',
      confirm: 'Six π electrons, one from each ring atom. Pyrimidine (two ring N) counts the same way.'
    },
    {
      caveman: {"prompt":"<b>Pyrrole</b>: five-membered ring, two C=C, one N–H; lone pair in p orbital parallel to carbon p. π electrons?","worked":"Four carbons one π electron each (4). N–H nitrogen: lone pair in p orbital joins ring (2). 4 + 2 = 6: aromatic. Imidazole same: N–H lone pair plus one electron on other four ring atoms.","hints":["Two C=C π bonds first: 4. Then N–H nitrogen lone pair in p orbital adds?","Four carbons × 1 + 2 from N lone pair = ?"]}, // CAVEMAN
      id: 's14', type: 'input', skill: 'directors',
      prompt: '<b>Pyrrole</b> has a five-membered ring: four CH carbons in two C=C bonds, and an N–H. The N–H lone pair sits in a p orbital, parallel to the p orbitals of the carbons. How many π electrons does pyrrole have?',
      smiles: 'c1cc[nH]c1',
      answer: 6, accept: ['six'],
      diagnose: [
        { match: '4', why: 'Four is the count from the two C=C bonds only. The N–H nitrogen has a lone pair in a p orbital, so it joins the π system with its two electrons.' },
        { match: '5', why: 'Five is one electron per ring atom. But the N–H nitrogen has no double bond: it contributes its LONE PAIR (two electrons) from a p orbital, and the four carbons contribute one each.' },
        { match: '8', why: 'Too many: the two C=C bonds give four π electrons and the N lone pair adds two, 4 + 2 = 6. The N–H bond’s own electrons are σ electrons and do not count.' },
        { match: '7', why: 'Four electrons from the carbons plus the N lone pair (two) is six, not seven. The N–H bond’s electrons are σ electrons.' }
      ],
      hints: ['Count the electrons in the two C=C π bonds first: that is 4. Then ask what the N–H nitrogen can add from its lone pair sitting in a p orbital.', 'Four carbons × 1 electron + 2 electrons from the N lone pair = ?'],
      worked: 'Four ring carbons each give one π electron (4). The N–H nitrogen has no double bond, but its lone pair is in a p orbital and joins the ring (2). 4 + 2 = 6 π electrons, so pyrrole is aromatic. Imidazole counts the same way: the N–H lone pair plus one electron on each of the other four ring atoms.',
      confirm: `Six again. Pyridine and pyrimidine: one π electron on each of the six ring atoms. Pyrrole and imidazole: one on each of four ring atoms plus the N–H lone pair. Naphthalene (two fused benzene rings) is a polycyclic aromatic hydrocarbon. ${mol('c1ccncc1', 'pyridine')} ${mol('c1cncnc1', 'pyrimidine')} ${mol('c1cc[nH]c1', 'pyrrole')} ${mol('c1c[nH]cn1', 'imidazole')} ${mol('c1ccc2ccccc2c1', 'naphthalene')}`
    },
    {
      caveman: {"prompt":"<b>Make m-bromonitrobenzene from benzene.</b> Step order decides isomer. Tap cards into order, run plan: real directing rules.","worked":"Step 1: HNO₃, H₂SO₄: nitrobenzene. Step 2: Br₂, FeBr₃: m-bromonitrobenzene: –NO₂ meta director. Reversed: Br sends NO₂ ortho, para.","hints":["Backward. Br, NO₂ meta (1,3). Which is meta director?","Group on FIRST decides where second goes. Meta director first: next group meta."]}, // CAVEMAN
      id: 's15', type: 'try', skill: 'aromatic-synthesis', widget: 'synthesis-planner',
      prompt: 'Now put it together. <b>Make m-bromonitrobenzene from benzene.</b> The order of the two steps decides which isomer you get. Tap the cards into order and run the plan: it runs on the real directing rules.',
      config: { start: BZ, target: 'Brc1cccc(c1)[N+](=O)[O-]', deck: ['Br2_FeBr3', 'HNO3_H2SO4', 'Cl2_FeCl3', 'SO3_H2SO4', 'MeCl_AlCl3', 'Fe_H3O'], directors: true },
      confirm: 'Nitrate first: –NO₂ is a meta director, so the Br lands meta to it. Brominating first would put Br on the ring as an ortho/para director and NO₂ would go ortho and para.',
      hints: ['Work backward. Br and NO₂ must end up meta (1,3). Which of the two groups is the meta director?', 'The group that goes on FIRST decides where the second one goes. A meta director on the ring first sends the next group meta. Put it on first.'],
      worked: 'Step 1: HNO₃, H₂SO₄ turns benzene into nitrobenzene. Step 2: Br₂, FeBr₃ on nitrobenzene gives m-bromonitrobenzene, because –NO₂ is a meta director. Reversed, the bromine on the ring sends NO₂ ortho and para.'
    },
    {
      caveman: {"prompt":"<b>Make p-bromonitrobenzene from benzene.</b> Same groups, now <i>para</i>. Which first? (ortho, para separable.)","worked":"Step 1: Br₂, FeBr₃: bromobenzene. Step 2: HNO₃, H₂SO₄: o-, p-bromonitrobenzene; para separated. NO₂ first: meta isomer.","hints":["Backward: groups para (1,4). Which is ortho/para director?","Ortho/para director first. Next group ortho, para to it; separate isomers."]}, // CAVEMAN
      id: 's16', type: 'try', skill: 'aromatic-synthesis', widget: 'synthesis-planner',
      prompt: '<b>Make p-bromonitrobenzene from benzene.</b> The same two groups, but now they must end up <i>para</i>. Which goes on first? (Assume ortho and para isomers can be separated.)',
      config: { start: BZ, target: 'Brc1ccc(cc1)[N+](=O)[O-]', deck: ['Br2_FeBr3', 'HNO3_H2SO4', 'Cl2_FeCl3', 'SO3_H2SO4', 'MeCl_AlCl3', 'Fe_H3O'], directors: true },
      confirm: 'Brominate first: –Br is an ortho/para director, so the NO₂ goes ortho and para to it. Separate the para isomer from the ortho isomer. Nitrating first would give the meta compound.',
      hints: ['Work backward: the groups must be para (1,4). Which of the two groups is an ortho/para director?', 'Put the ortho/para director on first. The next group then goes ortho and para to it, and you separate the isomers.'],
      worked: 'Step 1: Br₂, FeBr₃ on benzene gives bromobenzene. Step 2: HNO₃, H₂SO₄ on bromobenzene gives o- and p-bromonitrobenzene; the para isomer is separated. The order NO₂ first would give the meta isomer.'
    },
    {
      caveman: {"prompt":"<b>Make m-chlorobenzoic acid from toluene.</b> One step changes a director: KMnO₄ on CH₃.","worked":"Step 1: KMnO₄, H₂O: benzoic acid. Step 2: Cl₂, FeCl₃: Cl meta to –CO₂H. Other order: Cl goes ortho, para of CH₃: o-, p-chlorobenzoic acid.","hints":["Cl, CO₂H meta. Which meta director; which reaction makes it from CH₃?","meta director first. KMnO₄: CH₃ to –CO₂H."]}, // CAVEMAN
      id: 's17', type: 'try', skill: 'aromatic-synthesis', widget: 'synthesis-planner',
      prompt: '<b>Make m-chlorobenzoic acid from toluene.</b> Two steps again, but one of them changes a director: remember what KMnO₄ does to a CH₃ group.',
      config: { start: 'Cc1ccccc1', target: 'OC(=O)c1cccc(Cl)c1', deck: ['Cl2_FeCl3', 'KMnO4_H2O', 'HNO3_H2SO4', 'Br2_FeBr3', 'Fe_H3O'], directors: true },
      confirm: 'Oxidise first: KMnO₄ turns the ortho/para-directing CH₃ into the meta-directing –CO₂H, and then Cl₂/FeCl₃ puts Cl meta. Chlorinating toluene first gives ortho/para chlorotoluene, and oxidising that gives o- and p-chlorobenzoic acid.',
      hints: ['Cl and CO₂H must be meta. Which of them is a meta director, and which reaction makes it from the CH₃ on toluene?', 'The meta director has to be on the ring before the chlorination. KMnO₄ makes –CO₂H from CH₃.'],
      worked: 'Step 1: KMnO₄, H₂O turns toluene into benzoic acid. Step 2: Cl₂, FeCl₃ puts Cl meta to the –CO₂H: m-chlorobenzoic acid. In the other order the CH₃ sends Cl ortho and para, and oxidation then gives o- and p-chlorobenzoic acid.'
    },
    {
      caveman: {"prompt":"<b>Make m-nitroacetophenone from benzene.</b> Order puzzle: Friedel–Crafts fails on rings with –NO₂, –C≡N, –SO₃H, –COR.","worked":"Step 1: CH₃COCl, AlCl₃: acetophenone. Step 2: HNO₃, H₂SO₄: NO₂ meta to acetyl. Reverse fails: no acylation of nitrobenzene.","hints":["Both meta directors: either first for position. But one reaction cannot run on ring with other group. Which?","Acylation fails on ring with –NO₂: acylate first."]}, // CAVEMAN
      id: 's18', type: 'try', skill: 'aromatic-synthesis', widget: 'synthesis-planner',
      prompt: '<b>Make m-nitroacetophenone from benzene.</b> Another order puzzle, with a second rule hiding in it: Friedel–Crafts reactions fail on a ring that already carries –NO₂, –C≡N, –SO₃H or –COR.',
      config: { start: BZ, target: 'CC(=O)c1cccc(c1)[N+](=O)[O-]', deck: ['HNO3_H2SO4', 'AcCl_AlCl3', 'Br2_FeBr3', 'MeCl_AlCl3', 'Fe_H3O'], directors: true },
      confirm: 'Acylate first, then nitrate. The acetyl group is a meta director, so NO₂ goes meta; and nitrating first would make a ring on which the Friedel–Crafts acylation fails.',
      hints: ['Both groups are meta directors, so either could go first as far as position goes. But one of the two reactions cannot be run on a ring that has the other group. Which?', 'Friedel–Crafts acylation does not work on a ring with –NO₂. So the acylation must come before the nitration.'],
      worked: 'Step 1: CH₃COCl, AlCl₃ on benzene gives acetophenone. Step 2: HNO₃, H₂SO₄ puts NO₂ meta to the acetyl group. The other order fails at the first step (acylation of nitrobenzene does not work).'
    },
    {
      caveman: {"problem":"Backward plan: p-bromobenzoic acid <mol smiles=\"OC(=O)c1ccc(Br)cc1\" label=\"p-bromobenzoic acid\"></mol>.","rule":"<b>Backward</b>: each group meta or ortho/para? Which step made it? Step must run on ring as it is. p-Bromobenzoic acid = benzene → CH₃Cl, AlCl₃ → Br₂, FeBr₃ → KMnO₄.","moves":[{"ask":"Br, CO₂H para. Brominate benzoic acid?","options":[{"why":"Yes. Gives m-bromobenzoic acid: wrong isomer."},{"why":"Para only for ortho/para directors; meta director sends meta."},{"why":"More catalyst: orientation set by group on ring."}]},{"ask":"Where could –CO₂H come from, Br para?","then":"Precursor: p-bromotoluene.","options":[{"why":"Yes. KMnO₄: CH₃ to –CO₂H; Br already para."},{"why":"That route failed: meta isomer."},{"why":"m-bromotoluene: CH₃ meta to Br. Needs para."}]},{"ask":"p-Bromotoluene from toluene?","options":[{"why":"Yes. o-, p-bromotoluene, separated. (Book: bromobenzene + CH₃Cl, AlCl₃ works: Br ortho/para director.)"},{"why":"Ortho equally good (two ortho carbons): both isomers form, separate."},{"why":"Wrong order: –CO₂H first, meta director."}]},{"ask":"Toluene from benzene?","then":"Backward: product ← p-bromotoluene ← toluene ← benzene.","options":[{"why":"Yes. Benzene not deactivated: alkylation works, first."},{"why":"FeBr₃ makes Br⁺, not CH₃⁺. Alkylation: alkyl halide, AlCl₃."},{"why":"KMnO₄: CH₃ to CO₂H; adds none."}]}]}, // CAVEMAN
      id: 's19', type: 'worked', skill: 'aromatic-synthesis',
      problem: `Work backward to plan <b>p-bromobenzoic acid</b> ${mol('OC(=O)c1ccc(Br)cc1', 'p-bromobenzoic acid')} from benzene. Pick each move.`,
      moves: [
        {
          ask: 'Br and CO₂H are para. Could you simply brominate benzoic acid?',
          options: [
            opt('No: –CO₂H is a meta director, so Br would go meta', true, 'Yes. Bromination of benzoic acid gives m-bromobenzoic acid, the wrong isomer. A different route is needed.'),
            opt('Yes: bromine always goes para', false, 'Not always. Para is only the answer for ortho/para directors; a meta director sends the new group meta.'),
            opt('Yes, if you use more FeBr₃', false, 'More catalyst does not change the orientation, which is set by the group already on the ring.')
          ]
        },
        {
          ask: 'Where could the –CO₂H come from, with Br already in place para to it?',
          options: [
            opt('From oxidising a CH₃: the immediate precursor is p-bromotoluene', true, 'Yes. KMnO₄ turns the CH₃ into –CO₂H, and the Br is already para to it.'),
            opt('From brominating benzoic acid', false, 'That is the route that failed: it gives the meta isomer.'),
            opt('From oxidising m-bromotoluene', false, 'That would give m-bromobenzoic acid. The Br and CH₃ must be para in the precursor.')
          ],
          then: 'The precursor is p-bromotoluene.',
          figure: { smiles: 'Cc1ccc(Br)cc1', label: 'p-bromotoluene' }
        },
        {
          ask: 'How do you make p-bromotoluene from toluene?',
          options: [
            opt('Br₂, FeBr₃: CH₃ is an ortho/para director, so Br goes ortho and para; separate the para isomer', true, 'Yes. You get o- and p-bromotoluene together, and the isomers are separated. (The book also accepts bromobenzene + CH₃Cl, AlCl₃: Br is an ortho/para director and Friedel–Crafts works on a bromobenzene ring.)'),
            opt('Br₂, FeBr₃: only the para isomer forms', false, 'Ortho is equally good electronically (and there are two ortho carbons), so both isomers form and must be separated.'),
            opt('KMnO₄ first, then Br₂, FeBr₃', false, 'That is the order that fails: oxidising first would make –CO₂H, a meta director.')
          ]
        },
        {
          ask: 'And toluene itself, from benzene?',
          options: [
            opt('CH₃Cl, AlCl₃ (Friedel–Crafts alkylation)', true, 'Yes. Benzene is not deactivated, so the alkylation works. It has to come before anything deactivating is added.'),
            opt('CH₃Br, FeBr₃', false, 'FeBr₃ with a bromo compound makes Br⁺, not a carbocation CH₃⁺. Alkylation needs an alkyl halide with AlCl₃.'),
            opt('KMnO₄, H₂O', false, 'KMnO₄ turns a CH₃ into CO₂H; it does not add one to the ring.')
          ],
          then: 'Backward: product ← p-bromotoluene ← toluene ← benzene.',
          figure: { smiles: 'Cc1ccccc1', label: 'toluene' }
        }
      ],
      rule: 'Work <b>backward</b> from the target: look at each group (is it meta or ortho/para?), ask which step could have made it, and check that every step runs on the ring as it is at that moment. Order matters: p-bromobenzoic acid = benzene → CH₃Cl, AlCl₃ → Br₂, FeBr₃ → KMnO₄.'
    },
    {
      caveman: {"prompt":"<b>Exam.</b> Plan synthesis of <b>p-nitrobenzoic acid</b> from benzene. Order matters; some reactions fail on some rings. ortho, para separable.","worked":"Step 1: CH₃Cl, AlCl₃: toluene (alkylation first). Step 2: HNO₃, H₂SO₄: o-, p-nitrotoluene; keep para. Step 3: KMnO₄: CH₃ to –CO₂H: p-nitrobenzoic acid. Oxidising first: NO₂ meta.","hints":["Backward. NO₂, CO₂H para: add NO₂ while ortho/para director on ring. –CO₂H from where?","CO₂H from CH₃ (KMnO₄); CH₃ from benzene (CH₃Cl, AlCl₃)."]}, // CAVEMAN
      id: 's20', type: 'try', skill: 'aromatic-synthesis', widget: 'synthesis-planner',
      prompt: '<b>Exam style.</b> Plan the synthesis of <b>p-nitrobenzoic acid</b> from benzene. Use only what you have learned: the order of the steps matters, and some reactions cannot be run on some rings. Assume ortho and para isomers can be separated.',
      config: { start: BZ, target: 'OC(=O)c1ccc(cc1)[N+](=O)[O-]', deck: ['MeCl_AlCl3', 'HNO3_H2SO4', 'KMnO4_H2O', 'Br2_FeBr3', 'AcCl_AlCl3', 'Fe_H3O'], directors: true },
      confirm: 'Benzene → CH₃Cl, AlCl₃ → toluene; HNO₃, H₂SO₄ → o- and p-nitrotoluene (CH₃ is an ortho/para director; separate the para); KMnO₄ → p-nitrobenzoic acid. Oxidising before nitrating would make –CO₂H first, and the NO₂ would go meta.',
      hints: ['Work backward. NO₂ and CO₂H are para, so the NO₂ has to be added while an ortho/para director is on the ring. Where does the –CO₂H come from?', 'The CO₂H comes from a CH₃ (KMnO₄), and the CH₃ comes from benzene (CH₃Cl, AlCl₃). Order: methylate, nitrate, oxidise.'],
      worked: 'Step 1: CH₃Cl, AlCl₃ gives toluene (the alkylation must come first; the ring is not deactivated yet). Step 2: HNO₃, H₂SO₄ gives o- and p-nitrotoluene; keep the para isomer. Step 3: KMnO₄ turns the CH₃ into –CO₂H: p-nitrobenzoic acid. Oxidising before nitrating would send NO₂ meta.'
    }
  ],
  mastery: { count: 3, generator: 'directors' },
  useIt: {
    book: ['5.11', '5.12', '5.13', '5.14', '5.15', '5.16', '5.17', '5.18', '5.19', '5.20', '5.32', '5.33', '5.34', '5.35', '5.36', '5.37', '5.38', '5.39', '5.40', '5.41', '5.42', '5.45', '5.46', '5.47', '5.48', '5.49', '5.52', '5.53', '5.54', '5.55'],
    endFrom: 21,
    note: 'In-chapter: 5.11 (rank by reactivity), 5.12 (products of chlorination), 5.13 (sulfonation products), 5.14 and 5.15 (resonance forms: methoxy ortho/para, acetyl meta), 5.16 (KMnO₄ products), 5.17 (naphthalene resonance), 5.18 to 5.20 (syntheses from benzene). End of chapter, reactions and substituent effects: 5.32 to 5.42. Mechanisms: 5.45, 5.46, 5.49. Synthesis: 5.47, 5.48. General: 5.52 (find the flaw: watch benzylic H and Friedel–Crafts limits), 5.53 (indole), 5.54 (trimethylammonium), 5.55 (the three nitrobenzoic acids).'
  }
});
