// Widget: isomer-tree (Lesson 16; McMurry 6.9). The isomer decision tree as a flowchart the learner WALKS for several pairs of molecules.
// config: { pairs:[{ a, b, sub?:'skeletal'|'functional'|'positional', title? }] }
//   Questions in order (each answer is computed from the two structures with engine/chirality.js, never typed in):
//     Q1 same molecular formula?            no  -> not isomers
//     Q2 atoms connected in the same order? no  -> constitutional isomers (then: skeletal, functional or positional?)
//     Q3 identical (superimposable)?        yes -> the same compound
//     Q4 mirror images (opposite at EVERY center)?  yes -> enantiomers, no -> diastereomers (cis-trans isomers included)
//   `sub` (the kind of constitutional isomerism) is hand-labelled on the pair; the tests only check that the pair really is constitutional.
import { svg } from '../chem.js';
import { relationship, formulaKey } from '../chirality.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const subscript = (s) => s.replace(/(\d+)/g, (d) => d.split('').map((c) => '₀₁₂₃₄₅₆₇₈₉'[c]).join(''));

export const QUESTIONS = [
  { id: 'formula', q: 'Do the two molecules have the same molecular formula?', yes: 'next', no: 'Not isomers (different formulas)' },
  { id: 'connect', q: 'Are the atoms connected in the same order (the same constitution)?', yes: 'next', no: 'Constitutional isomers' },
  { id: 'same', q: 'Can one be laid exactly on top of the other (are they the same compound)?', yes: 'The same compound', no: 'next' },
  { id: 'mirror', q: 'Is each one the mirror image of the other (opposite at EVERY center)?', yes: 'Enantiomers', no: 'Diastereomers (cis–trans isomers included)' }
];
export const SUBS = { skeletal: 'different carbon skeletons', functional: 'different functional groups', positional: 'the same groups in different positions' };

/** The correct answer ('yes'|'no') to each question for a pair, and the leaf where the walk ends. */
export function walk(pair) {
  const info = relationship(pair.a, pair.b);
  const ans = { formula: info.sameFormula ? 'yes' : 'no' };
  let leaf = 'Not isomers';
  if (info.sameFormula) {
    ans.connect = info.sameConstitution ? 'yes' : 'no';
    if (!info.sameConstitution) leaf = 'Constitutional isomers';
    else {
      ans.same = info.kind === 'identical' ? 'yes' : 'no';
      if (info.kind === 'identical') leaf = 'The same compound';
      else { ans.mirror = info.kind === 'enantiomers' ? 'yes' : 'no'; leaf = info.kind === 'enantiomers' ? 'Enantiomers' : 'Diastereomers'; }
    }
  }
  return { ans, leaf, info };
}
/** Diagnosis for a wrong yes/no on question `qid` (what the learner should check). */
export function whyAnswer(pair, qid, said) {
  const { info } = walk(pair);
  const right = walk(pair).ans[qid];
  const f = subscript(formulaKey(pair.a)), g = subscript(formulaKey(pair.b));
  if (qid === 'formula') return right === 'yes' ? `Count the atoms: both are ${f}, so they ARE isomers so far.` : `Count the atoms: A is ${f} and B is ${g}. Different formulas mean they are not isomers at all.`;
  if (qid === 'connect') return right === 'yes' ? 'Trace the bonds: every atom is bonded to the same neighbours in A and in B, so the constitution is the same. Any difference is only in 3D arrangement.' : `Trace the bonds: the atoms are joined in a different order in A and in B (both ${f}). That makes them constitutional isomers.`;
  if (qid === 'same') return right === 'yes' ? (info.mesoA ? 'Reflect A: it is meso, a plane of symmetry inside it, so it equals its own mirror image. The two drawings are one compound.' : 'Turn B round in the plane of the page: every center has the same configuration as in A. They are the same compound.') : 'They differ at one or more centers, so one cannot be turned into the other: they are different compounds.';
  return right === 'yes' ? 'Compare each center: they are opposite at EVERY center, so each is the mirror image of the other.' : 'Enantiomers are opposite at every center. Here at least one center is the same in both (or one molecule is meso), so they are not mirror images.';
}

export default {
  id: 'isomer-tree',
  mount(host, config, ctx = { onResult() {}, onProgress() {} }) {
    host.innerHTML = '';
    const pairs = config.pairs;
    let k = 0, qi = 0, subPending = false;
    const root = el('div', 'it'); host.append(root);
    const count = el('p', 'muted small');
    const figs = el('div', 'rd-figs');
    const chart = el('ol', 'it-chart');
    const fb = el('div', 'fb'); fb.setAttribute('aria-live', 'polite');
    const bar = el('div', 'cf-bar');
    root.append(count, figs, chart, fb, bar);

    const draw = (s, label) => { const f = el('figure', 'rd-fig'); f.append(el('div', 'rd-svg', svg(s, { width: 220, height: 150, style: 'skeletal' })), el('figcaption', '', label)); return f; };
    const show = () => {
      const p = pairs[k]; qi = 0; subPending = false;
      count.textContent = `Pair ${k + 1} of ${pairs.length}${p.title ? ': ' + p.title : ''}. Walk the chart from the top.`;
      figs.innerHTML = ''; figs.append(draw(p.a, 'A'), el('span', 'rd-vs', 'and'), draw(p.b, 'B'));
      fb.className = 'fb'; fb.textContent = ''; bar.innerHTML = '';
      chart.innerHTML = '';
      QUESTIONS.forEach((Q, i) => {
        const li = el('li', 'it-node'); li.dataset.q = Q.id; li.dataset.state = i === 0 ? 'now' : 'wait';
        li.append(el('p', 'it-q', `<span class="it-n">${i + 1}</span> ${Q.q}`));
        const row = el('div', 'it-ans');
        const yes = el('button', 'btn small', 'Yes'), no = el('button', 'btn small', 'No');
        yes.type = no.type = 'button'; yes.dataset.a = 'yes'; no.dataset.a = 'no';
        row.append(yes, no);
        li.append(row, el('p', 'it-out small', `Yes → ${Q.yes === 'next' ? 'next question' : Q.yes}. &nbsp; No → ${Q.no === 'next' ? 'next question' : Q.no}.`));
        row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => answer(i, b)));
        chart.append(li);
      });
      setStates();
    };
    const setStates = () => { chart.querySelectorAll('.it-node').forEach((li, i) => { li.dataset.state = li.dataset.state === 'done' || li.dataset.state === 'end' ? li.dataset.state : i === qi ? 'now' : 'wait'; li.querySelectorAll('button').forEach((b) => { b.disabled = li.dataset.state !== 'now'; }); }); };
    const finish = (leaf) => {
      const p = pairs[k];
      const w = walk(p);
      chart.querySelectorAll('.it-node').forEach((li) => { li.querySelectorAll('button').forEach((b) => { b.disabled = true; }); });
      fb.className = 'fb ok'; fb.innerHTML = '';
      fb.append(el('p', '', `<b>${leaf}.</b> ${p.note || ''}`));
      if (k + 1 < pairs.length) {
        const nb = el('button', 'btn primary', 'Next pair'); nb.type = 'button';
        nb.addEventListener('click', () => { k++; show(); ctx.onProgress && ctx.onProgress(); });
        bar.append(nb); nb.focus({ preventScroll: true });
      } else ctx.onResult({ ok: true });
    };
    const answer = (i, btn) => {
      if (i !== qi || subPending) return;
      const p = pairs[k], Q = QUESTIONS[i];
      const w = walk(p);
      const said = btn.dataset.a;
      if (said !== w.ans[Q.id]) { btn.classList.add('bad'); btn.disabled = true; ctx.onResult({ ok: false, diagnosis: whyAnswer(p, Q.id, said) }); return; }
      const li = chart.children[i];
      li.dataset.state = 'done'; btn.classList.add('good'); li.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      const nxt = Q[said];
      if (nxt === 'next') { qi = i + 1; setStates(); ctx.onProgress && ctx.onProgress(); return; }
      li.dataset.state = 'end';
      li.append(el('p', 'it-leaf', `→ ${nxt}`));
      if (nxt === 'Constitutional isomers' && p.sub) { askSub(li); return; }
      finish(nxt);
    };
    const askSub = (li) => {
      subPending = true;
      const p = pairs[k];
      const box = el('div', 'it-sub'); box.append(el('p', 'it-q', 'What kind of constitutional isomers are they?'));
      const row = el('div', 'cf-ans');
      [['skeletal', 'Skeletal: different carbon skeletons'], ['functional', 'Functional: different functional groups'], ['positional', 'Positional: the same groups in different positions']].forEach(([id, t]) => {
        const b = el('button', 'btn small', t); b.type = 'button';
        b.addEventListener('click', () => {
          if (id !== p.sub) { b.classList.add('bad'); b.disabled = true; ctx.onResult({ ok: false, diagnosis: p.subWhy && p.subWhy[id] ? p.subWhy[id] : `Look at the carbon skeleton and where the groups sit: these are ${SUBS[p.sub]}.` }); return; }
          row.querySelectorAll('button').forEach((x) => { x.disabled = true; }); b.classList.add('good');
          subPending = false; finish(`Constitutional isomers (${p.sub}: ${SUBS[p.sub]})`);
        });
        row.append(b);
      });
      box.append(row); li.append(box);
    };
    show();
    return { destroy() {} };
  }
};
