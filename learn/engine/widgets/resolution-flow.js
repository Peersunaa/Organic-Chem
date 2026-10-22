// Widget: resolution-flow (Lesson 16). Resolving a racemic acid (lactic acid) with a chiral amine, as four short decisions:
//   1 choose the reagent   2 say which salts form and how they are related   3 choose how to separate them   4 choose how to get the acids back
// The chemistry is computed in engine/resolution.js: the salts are ion pairs compared with relationship() (engine/chirality.js).
// Resolution works exactly when each group of salts with identical properties (same compound or enantiomers) holds only one acid configuration.
import { svg } from '../chem.js';
import { relationship } from '../chirality.js';
import { REAGENTS, analyseReagent, saltsFor, reagentById, ACID, acidFromSalt } from '../resolution.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fig = (smiles, label, w = 190, h = 120) => { const f = el('figure', 'mol rf-fig'); f.append(el('div', 'mol-svg', svg(smiles, { width: w, height: h, style: 'skeletal', showCharge: true }))); if (label) f.append(el('figcaption', '', label)); return f; };

/** Why a reagent does not resolve the acid (computed from analyseReagent). */
export function whyReagentFails(id) {
  const a = analyseReagent(id);
  if (a.works) return null;
  if (id === 'rac-amine') return 'A racemic amine pairs each acid with BOTH amine enantiomers, so four salts form. The (R)-acid·(R)-amine salt is the mirror image of the (S)-acid·(S)-amine salt, and the other two are mirror images as well, so each pair has identical properties and stays together. Both acids are still in every fraction.';
  return `${id === 'NaOH' ? 'Sodium ions' : 'Methylamine'} (and the ${id === 'NaOH' ? 'ion' : 'molecule'}) have no handedness, so the (R)-acid and (S)-acid salts are mirror images of each other. Enantiomers have identical properties, so no physical method can tell the two salts apart.`;
}

export default {
  id: 'resolution-flow',
  mount(host, config, ctx = { onResult() {}, onProgress() {} }) {
    host.innerHTML = '';
    const root = el('div', 'rf'); host.append(root);
    const stage = el('div', 'rf-stage'); const fb = el('div', 'fb'); fb.setAttribute('aria-live', 'polite');
    root.append(stage, fb);
    const bad = (t) => ctx.onResult({ ok: false, diagnosis: t });
    const good = (t) => { fb.className = 'fb ok'; fb.innerHTML = t; };
    const bar = (title, n) => el('p', 'muted small', `Step ${n} of 4: ${title}`);
    let chosen = null;

    const options = (list, onPick) => {
      const box = el('div', 'opts'); box.setAttribute('role', 'group');
      list.forEach((o) => {
        const b = el('button', 'opt', o.text); b.type = 'button';
        b.addEventListener('click', () => {
          const r = o.correct ? { ok: true } : { ok: false, why: o.why };
          if (r.ok) { box.querySelectorAll('.opt').forEach((x) => { x.disabled = true; }); b.classList.add('good'); onPick(o); }
          else { b.classList.add('bad'); b.disabled = true; bad(o.why); }
        });
        box.append(b);
      });
      return box;
    };

    // ---- 1 reagent
    const s1 = () => {
      stage.innerHTML = ''; fb.className = 'fb'; fb.textContent = '';
      stage.append(bar('choose the reagent', 1));
      stage.append(el('p', 'rf-q', 'You have a <b>racemic mixture of lactic acid</b>: equal amounts of (R)- and (S)-lactic acid. Which reagent lets you separate the two enantiomers?'));
      const pair = el('div', 'rf-row'); pair.append(fig(ACID.R, '(R)-lactic acid'), el('span', 'rf-plus', '+'), fig(ACID.S, '(S)-lactic acid')); stage.append(pair);
      stage.append(options(REAGENTS.map((r) => ({ id: r.id, text: r.label, correct: analyseReagent(r.id).works, why: whyReagentFails(r.id) })), (o) => {
        chosen = reagentById(o.id);
        good('Yes. A pure chiral amine turns the two enantiomers into salts that are <b>not</b> mirror images of each other.');
        ctx.onProgress && ctx.onProgress();
        add(s2);
      }));
    };
    const add = (fn) => { const next = el('button', 'btn primary', 'Next step'); next.type = 'button'; next.addEventListener('click', () => { next.remove(); fn(); }); root.append(next); next.focus({ preventScroll: true }); };

    // ---- 2 salts
    const s2 = () => {
      stage.innerHTML = ''; fb.className = 'fb'; fb.textContent = '';
      stage.append(bar('which salts form?', 2));
      const all = [
        ...saltsFor('rac-amine')
      ];
      stage.append(el('p', 'rf-q', 'The racemic acid reacts with <b>(R)-1-phenylethylamine</b> (proton transfer: the acid gives H⁺ to the amine). Tap the <b>two</b> ion-pair salts that form, then press Check.'));
      const grid = el('div', 'rf-salts'); const sel = new Set();
      all.forEach((s, i) => {
        const b = el('button', 'rf-salt'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
        b.append(fig(s.smiles, `(${s.acid})-acid · (${s.base})-amine`, 230, 130));
        b.addEventListener('click', () => { sel.has(i) ? sel.delete(i) : sel.add(i); b.setAttribute('aria-pressed', String(sel.has(i))); });
        grid.append(b);
      });
      const check = el('button', 'btn primary', 'Check'); check.type = 'button';
      stage.append(grid, check);
      check.addEventListener('click', () => {
        const want = all.map((s, i) => (s.base === 'R' ? i : -1)).filter((i) => i >= 0);
        const got = [...sel].sort();
        const okSel = got.length === 2 && got.join() === want.join();
        if (!okSel) {
          if (got.some((i) => all[i].base === 'S')) bad('Only the (R)-amine is in the flask, so a salt with the (S)-amine cannot form.');
          else if (got.length !== 2) bad('Two salts form: one from the (R)-acid and one from the (S)-acid, each with the (R)-amine.');
          else bad('Each salt pairs one acid enantiomer with the (R)-amine. Pick the one for the (R)-acid and the one for the (S)-acid.');
          return;
        }
        check.disabled = true; grid.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        const rel = relationship(all[want[0]].smiles, all[want[1]].smiles).kind;
        stage.append(el('p', 'rf-q', 'How are these two salts related?'));
        stage.append(options([
          { text: 'Enantiomers (mirror images)', correct: rel === 'enantiomers', why: 'The amine part is the same (R) in both, so one salt cannot be the mirror image of the other: the mirror image of an (R,R) salt would be (S,S).' },
          { text: 'Diastereomers', correct: rel === 'diastereomers' },
          { text: 'The same compound', correct: rel === 'identical', why: 'The two salts contain different acids, (R) and (S), so they are different compounds.' }
        ], () => {
          good('Diastereomers: (R)-acid·(R)-amine and (S)-acid·(R)-amine are the same at the amine center and opposite at the acid center. Diastereomers have <b>different</b> physical properties, such as solubility.');
          ctx.onProgress && ctx.onProgress();
          add(s3);
        }));
      });
    };

    // ---- 3 separate
    const s3 = () => {
      stage.innerHTML = ''; fb.className = 'fb'; fb.textContent = '';
      stage.append(bar('separate the salts', 3));
      stage.append(el('p', 'rf-q', 'You now have a mixture of two diastereomeric salts. How can you separate them?'));
      stage.append(options([
        { text: 'Crystallize: the two salts differ in solubility, so one comes out of solution first', correct: true },
        { text: 'Put the mixture in a polarimeter', why: 'A polarimeter only MEASURES how far light is turned; it does not pull molecules apart.' },
        { text: 'It cannot be done: the two salts have identical physical properties', why: 'That is true of enantiomers, but these salts are diastereomers, and diastereomers have different physical properties.' }
      ], () => {
        good('Fractional crystallization (or another physical method) works because diastereomers differ in properties. You now hold one salt on its own.');
        ctx.onProgress && ctx.onProgress();
        add(s4);
      }));
    };

    // ---- 4 recover
    const s4 = () => {
      stage.innerHTML = ''; fb.className = 'fb'; fb.textContent = '';
      stage.append(bar('get the pure acids back', 4));
      stage.append(el('p', 'rf-q', 'Each separated salt is a carboxylate (RCO₂⁻) with the ammonium ion. What do you add to free the carboxylic acid?'));
      stage.append(options([
        { text: 'Aqueous HCl: H⁺ turns RCO₂⁻ back into RCO₂H, and the amine stays behind as its hydrochloride', correct: true },
        { text: 'Aqueous NaOH', why: 'Base makes the carboxylate even more stable and frees the AMINE instead. The acid would stay as its sodium salt.' },
        { text: 'More (R)-amine', why: 'The acid is already paired with the amine. Adding more amine does not take that pairing apart.' }
      ], () => {
        good('Acidifying with HCl gives each acid in pure form, and the chiral amine can be recovered and reused.');
        stage.append(el('p', 'rf-q', 'Result: the racemate has been <b>resolved</b>.'));
        const end = el('div', 'rf-row'); end.append(fig(ACID.R, 'pure (R)-lactic acid'), el('span', 'rf-plus', '+'), fig(ACID.S, 'pure (S)-lactic acid'));
        stage.append(end);
        ctx.onResult({ ok: true });
      }));
    };
    s1();
    return { destroy() {} };
  }
};
