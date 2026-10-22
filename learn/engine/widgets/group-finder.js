// Widget: tap the atoms that make up a named functional group on a skeletal drawing.
// Graded by an RDKit SMARTS match (mol.get_substruct_match) with the SMARTS defined in engine/functional-groups.js.
//
// config: { smiles, group: 'ketone' }   (group is a key of FG)
import { svgPick, analyze, NAME } from '../chem.js';
import { FG, matchGroup, allMatches } from '../functional-groups.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** The atoms a perfect learner taps. */
export function solution(config) { return matchGroup(config.smiles, config.group) || []; }
/** True when the molecule has exactly one distinct instance of the group (so there is one right answer). */
export function isUnique(config) { return allMatches(config.smiles, config.group).length === 1; }

function describe(info, idxs) {
  const cnt = {};
  idxs.forEach((i) => { const n = NAME[info.atoms[i].sym].toLowerCase(); cnt[n] = (cnt[n] || 0) + 1; });
  return Object.entries(cnt).map(([n, c]) => (c === 1 ? 'one ' + n : `${c} ${n === 'oxygen' || n === 'nitrogen' || n === 'sulfur' ? n : n + 's'}`)).join(' and ');
}

/** selected: array of atom indices. */
export function grade(config, selected) {
  const g = FG[config.group];
  const want = new Set(solution(config));
  const got = new Set(selected);
  if (!got.size) return { ok: false, empty: true, diagnosis: 'Tap the atoms of the group first, then press Check.' };
  const extra = [...got].filter((i) => !want.has(i));
  const missing = [...want].filter((i) => !got.has(i));
  if (!extra.length && !missing.length) return { ok: true, diagnosis: '' };
  const info = analyze(config.smiles);
  const rule = `${cap(g.name)}: ${g.look}. Tap ${g.tap}.`;
  let msg;
  if (extra.length && !missing.length) msg = `${cap(describe(info, extra))} you tapped ${extra.length === 1 ? 'is' : 'are'} not part of the group. ${rule}`;
  else if (missing.length && !extra.length) msg = `You have part of it, but the group also includes ${describe(info, missing)}. ${rule}`;
  else msg = `Not quite: you tapped ${describe(info, extra)} that ${extra.length === 1 ? 'does' : 'do'} not belong, and the group also needs ${describe(info, missing)}. ${rule}`;
  return { ok: false, diagnosis: msg, extra, missing };
}

export default {
  id: 'group-finder',
  mount(host, config, ctx) {
    host.innerHTML = '';
    const g = FG[config.group];
    const big = analyze(config.smiles).heavy.length > 9;
    const pick = svgPick(config.smiles, big ? { width: 340, height: 230 } : { width: 300, height: 200 });
    const stage = document.createElement('div');
    stage.className = 'gf-stage' + (big ? ' big' : '');
    stage.innerHTML = pick.svg;
    stage.querySelector('svg')?.setAttribute('role', 'img');
    stage.querySelector('svg')?.setAttribute('aria-label', 'Skeletal structure. Tap atoms to select them.');
    const info = analyze(config.smiles);
    const sel = new Set();
    let locked = false;
    const btns = pick.pts.map((p, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'gf-atom';
      b.style.left = p.x + '%'; b.style.top = p.y + '%';
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', `${NAME[info.atoms[i].sym]} atom ${i + 1}`);
      b.dataset.atom = String(i);
      b.addEventListener('click', () => {
        if (locked) return;
        if (sel.has(i)) sel.delete(i); else sel.add(i);
        b.setAttribute('aria-pressed', String(sel.has(i)));
        stage.classList.remove('bad');
        b.classList.remove('bad');
        msg.textContent = '';
      });
      stage.append(b);
      return b;
    });
    const label = document.createElement('p');
    label.className = 'gf-ask';
    label.innerHTML = `Tap every atom in the <b>${g.name}</b>, then press Check.`;
    const msg = document.createElement('p');
    msg.className = 'muted small gf-msg'; msg.setAttribute('aria-live', 'polite');
    const row = document.createElement('div');
    row.className = 'gf-row';
    const check = document.createElement('button'); check.type = 'button'; check.className = 'btn primary'; check.textContent = 'Check';
    const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'btn ghost'; clear.textContent = 'Clear';
    row.append(check, clear);
    clear.addEventListener('click', () => { if (locked) return; sel.clear(); btns.forEach((b) => { b.setAttribute('aria-pressed', 'false'); b.classList.remove('bad'); }); msg.textContent = ''; });
    check.addEventListener('click', () => {
      if (locked) return;
      const r = grade(config, [...sel]);
      if (r.empty) { msg.textContent = r.diagnosis; return; }
      if (r.ok) { locked = true; check.disabled = true; clear.disabled = true; btns.forEach((b) => { b.disabled = true; b.classList.add('lock'); }); stage.classList.add('good'); }
      else { btns.forEach((b, i) => b.classList.toggle('bad', (r.extra || []).includes(i))); }
      ctx.onResult(r);
    });
    host.append(label, stage, msg, row);
    return { destroy() {} };
  }
};
