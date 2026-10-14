// Widget: tap the chirality centers of a drawn molecule (Lesson 15; reusable). config: { rounds:[{smiles}] , ask? }
// A chirality center is an sp3 carbon with four DIFFERENT groups (engine/cip.js rules 1-3; the tests compare the set with RDKit's FindMolChiralCenters).
// Tap every center, or press "No chirality center". A wrong tap is explained from the structure: not carbon, sp2/sp, CH2/CH3, two identical groups,
// or two identical ring paths.
import { svgPick } from '../chem.js';
import { chiralCenters, tetraInfo, readGraph } from '../cip.js';
import { centerReason, groupList } from '../chirality.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export function expected(smiles) { return chiralCenters(smiles); }
/** picks: atom indices tapped; none: "No chirality center" pressed. */
export function grade(smiles, picks, none) {
  const want = expected(smiles);
  const got = [...new Set(picks)];
  if (!got.length && !none) return { ok: false, empty: true, diagnosis: 'Tap each chirality center, or press “No chirality center” if you think there is none.' };
  if (none && got.length) return { ok: false, diagnosis: 'You tapped atoms and also pressed “No chirality center”. Choose one: either tap the centers, or say there are none.' };
  const wrong = got.filter((a) => !want.includes(a)), missing = want.filter((a) => !got.includes(a));
  if (!wrong.length && !missing.length) return { ok: true, wrong, missing };
  const g = readGraph(smiles);
  const name = (a) => `${g.atoms[a].sym} atom ${a + 1}`;
  const parts = [];
  wrong.slice(0, 2).forEach((a) => parts.push(centerReason(smiles, a).why));
  if (missing.length) {
    const T = tetraInfo(smiles).find((x) => x.atom === missing[0]);
    parts.push(`${missing.length > 1 ? `${missing.length} chirality centers are still missing. For example` : 'You missed a chirality center'}: the carbon marked below is bonded to four different groups (${groupList(T)}).`);
  }
  if (none && want.length) {
    const T = tetraInfo(smiles).find((x) => x.atom === want[0]);
    return { ok: false, wrong, missing, diagnosis: `There is a chirality center: the carbon marked below has four different groups (${groupList(T)}).` };
  }
  return { ok: false, wrong, missing, diagnosis: parts.join(' ') };
}

export default {
  id: 'stereocenter-finder',
  mount(host, config, ctx = { onResult() {}, onProgress() {} }) {
    host.innerHTML = '';
    const rounds = config.rounds;
    let k = 0, locked = false;
    const root = el('div', 'scf'); host.append(root);
    root.append(el('p', 'gf-ask', config.ask || 'Tap every <b>chirality center</b> (an sp³ carbon with four different groups). Hydrogens are not drawn: each carbon has as many as it needs for four bonds. If there is none, press “No chirality center”.'));
    const count = el('p', 'muted small'); const stageHost = el('div'); const row = el('div', 'gf-row'); const msg = el('p', 'muted small gf-msg'); msg.setAttribute('aria-live', 'polite');
    const noneBtn = el('button', 'btn', 'No chirality center'); noneBtn.type = 'button'; noneBtn.setAttribute('aria-pressed', 'false');
    const check = el('button', 'btn primary', 'Check'); check.type = 'button';
    const clear = el('button', 'btn ghost', 'Clear'); clear.type = 'button';
    row.append(noneBtn, check, clear);
    root.append(count, stageHost, row, msg);
    let picks = new Set(), none = false, btns = [], stage = null, pick = null;

    const show = () => {
      const smiles = rounds[k].smiles;
      picks = new Set(); none = false; locked = false; btns = [];
      noneBtn.setAttribute('aria-pressed', 'false'); check.disabled = false; clear.disabled = false; noneBtn.disabled = false; msg.textContent = '';
      count.textContent = rounds.length > 1 ? `Molecule ${k + 1} of ${rounds.length}` : '';
      stageHost.innerHTML = '';
      pick = svgPick(smiles, { width: 330, height: 220 });
      stage = el('div', 'gf-stage scf-stage', pick.svg);
      stage.querySelector('svg')?.setAttribute('role', 'img');
      stage.querySelector('svg')?.setAttribute('aria-label', 'Molecule. Tap the atoms that are chirality centers.');
      const g = readGraph(smiles);
      g.atoms.forEach((a, i) => {
        const b = el('button', 'gf-atom'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', `${a.sym === 'C' ? 'carbon' : a.sym} atom ${i + 1}`);
        b.style.left = pick.pts[i].x + '%'; b.style.top = pick.pts[i].y + '%'; b.dataset.i = i;
        b.addEventListener('click', () => {
          if (locked) return;
          if (none) { none = false; noneBtn.setAttribute('aria-pressed', 'false'); }
          picks.has(i) ? picks.delete(i) : picks.add(i);
          b.setAttribute('aria-pressed', String(picks.has(i))); btns.forEach((x) => x.classList.remove('bad')); msg.textContent = '';
        });
        stage.append(b); btns.push(b);
      });
      stageHost.append(stage);
    };
    noneBtn.addEventListener('click', () => {
      if (locked) return;
      none = !none; noneBtn.setAttribute('aria-pressed', String(none));
      if (none) { picks.clear(); btns.forEach((b) => b.setAttribute('aria-pressed', 'false')); }
      msg.textContent = '';
    });
    clear.addEventListener('click', () => { if (locked) return; picks.clear(); none = false; noneBtn.setAttribute('aria-pressed', 'false'); btns.forEach((b) => { b.setAttribute('aria-pressed', 'false'); b.classList.remove('bad', 'miss'); }); msg.textContent = ''; });
    check.addEventListener('click', () => {
      if (locked) return;
      const smiles = rounds[k].smiles;
      const r = grade(smiles, [...picks], none);
      if (r.empty) { msg.textContent = r.diagnosis; return; }
      btns.forEach((b) => { b.classList.remove('bad', 'miss'); });
      if (r.ok) {
        locked = true; check.disabled = true; clear.disabled = true; noneBtn.disabled = true;
        btns.forEach((b) => { b.disabled = true; if (picks.has(Number(b.dataset.i))) b.classList.add('lock'); });
        const want = expected(smiles);
        const T = tetraInfo(smiles);
        msg.textContent = want.length
          ? want.map((a) => { const t = T.find((x) => x.atom === a); return `Center: bonded to ${groupList(t)}, all different.`; }).join(' ')
          : 'No carbon here has four different groups, so the molecule has no chirality center.';
        if (k + 1 < rounds.length) {
          const nb = el('button', 'btn primary', 'Next molecule'); nb.type = 'button';
          nb.addEventListener('click', () => { k++; nb.remove(); show(); ctx.onProgress && ctx.onProgress(); });
          row.append(nb); nb.focus();
        } else ctx.onResult({ ok: true });
        return;
      }
      (r.wrong || []).forEach((a) => btns[a] && btns[a].classList.add('bad'));
      (r.missing || []).slice(0, 1).forEach((a) => btns[a] && btns[a].classList.add('miss'));
      ctx.onResult({ ok: false, diagnosis: r.diagnosis });
    });
    show();
    return { destroy() {} };
  }
};
