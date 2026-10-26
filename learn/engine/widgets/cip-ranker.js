// Widget: rank the groups on a double bond with the CIP sequence rules, then call it E or Z.
// The learner taps the higher-priority group on each double-bond carbon (the hydrogens of the two carbons are drawn so they can be
// tapped), can press "Go one atom further" to see the attached-atom sets as a small table, then picks E or Z.
// Graded against engine/cip.js, which the tests check against RDKit's new CIP labeler.
//
// config: { smiles, bond?:[a,b] }   (bond defaults to the one stereogenic C=C of the molecule)
import { rdkit, svgPick } from '../chem.js';
import { ezInfo, symOf, usesDuplicate, sphereSets } from '../cip.js';

const ZSUM = { H: 1, C: 6, N: 7, O: 8, F: 9, P: 15, S: 16, Cl: 17, Br: 35, I: 53 };

/** The double bond being asked about: { e: ezInfo entry } */
export function target(config) {
  const all = ezInfo(config.smiles);
  const e = config.bond
    ? all.find((x) => (x.a === config.bond[0] && x.b === config.bond[1]) || (x.a === config.bond[1] && x.b === config.bond[0]))
    : all.find((x) => x.capable && x.label) || all.find((x) => x.capable);
  return e || null;
}

/** 2D drawing as a molblock: heavy atoms keep their SMILES indices; the H atoms of the two double-bond carbons are added after them. */
export function drawing(config) {
  const R = rdkit();
  const e = target(config);
  const m = R.get_mol(config.smiles);
  try {
    m.set_new_coords();
    const L = m.get_molblock().split('\n');
    const n = parseInt(L[3].slice(0, 3), 10), nb = parseInt(L[3].slice(3, 6), 10);
    const P = [];
    for (let i = 0; i < n; i++) { const l = L[4 + i]; P.push({ x: parseFloat(l.slice(0, 10)), y: parseFloat(l.slice(10, 20)), line: l }); }
    const bonds = L.slice(4 + n, 4 + n + nb);
    const nbrs = (v) => bonds.map((b) => [parseInt(b.slice(0, 3), 10) - 1, parseInt(b.slice(3, 6), 10) - 1]).filter(([x, y]) => x === v || y === v).map(([x, y]) => (x === v ? y : x));
    const extraAtoms = [], extraBonds = [], hIdx = {};
    for (const end of e.ends) {
      const v = end.atom;
      const nH = end.subs.filter((s) => s.atom === null).length;
      hIdx[v] = [];
      if (!nH) continue;
      const us = nbrs(v).map((w) => { const dx = P[w].x - P[v].x, dy = P[w].y - P[v].y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; });
      let dirs;
      if (us.length >= 2) { const sx = us.reduce((s, u) => s + u[0], 0), sy = us.reduce((s, u) => s + u[1], 0), d = Math.hypot(sx, sy) || 1; dirs = [[-sx / d, -sy / d]]; }
      else { const [ux, uy] = us[0]; const rot = (a) => [-ux * Math.cos(a) + uy * Math.sin(a), -ux * Math.sin(a) - uy * Math.cos(a)]; dirs = [rot(Math.PI / 3), rot(-Math.PI / 3)]; }
      for (let k = 0; k < nH; k++) {
        const d = dirs[k] || dirs[0];
        const idx = n + extraAtoms.length;
        extraAtoms.push(`${(P[v].x + 1.5 * d[0]).toFixed(4).padStart(10)}${(P[v].y + 1.5 * d[1]).toFixed(4).padStart(10)}${'0.0000'.padStart(10)} H   0  0  0  0  0  0  0  0  0  0  0  0`);
        extraBonds.push(`${String(v + 1).padStart(3)}${String(idx + 1).padStart(3)}  1  0`);
        hIdx[v].push(idx);
      }
    }
    const head = L.slice(0, 3);
    const counts = `${String(n + extraAtoms.length).padStart(3)}${String(nb + extraBonds.length).padStart(3)}  0  0  0  0  0  0  0  0999 V2000`;
    const molblock = [...head, counts, ...P.map((p) => p.line), ...extraAtoms, ...bonds, ...extraBonds, 'M  END', ''].join('\n');
    const coords = P.map((p) => ({ x: p.x, y: p.y })).concat(extraAtoms.map((l) => ({ x: parseFloat(l.slice(0, 10)), y: parseFloat(l.slice(10, 20)) })));
    return { molblock, hIdx, coords, nHeavy: n, e };
  } finally { m.delete(); }
}

/** Drawing atom index of substituent `k` of end `i` (an H is one of that carbon's added H atoms). */
export function subAtom(dr, i, k) {
  const end = dr.e.ends[i];
  const s = end.subs[k];
  if (s.atom !== null) return s.atom;
  const nth = end.subs.slice(0, k).filter((x) => x.atom === null).length;
  return dr.hIdx[end.atom][nth];
}

/** The correct answer: drawing indices of the higher-ranked group on each carbon, and E or Z. */
export function solution(config) {
  const dr = drawing(config);
  return { picks: dr.e.ends.map((end, i) => subAtom(dr, i, end.hi)), label: dr.e.label };
}

function pickDiagnosis(end, chosenK) {
  const hi = end.subs[end.hi], lo = end.subs[chosenK];
  const hiSym = symOf(hi.node.z), loSym = symOf(lo.node.z);
  if (end.sphere <= 1) {
    if (lo.atom === null) return `Hydrogen has the lowest atomic number of all, so any other group outranks it. Here ${hi.label} outranks H.`;
    return `Compare the atoms attached directly to the carbon: ${hiSym} (atomic number ${hi.node.z}) outranks ${loSym} (${lo.node.z}). The higher atomic number wins at the first atom, before you look at anything else.`;
  }
  const hiSet = sphereSets(hi.node, end.sphere)[end.sphere - 2], loSet = sphereSets(lo.node, end.sphere)[end.sphere - 2];
  const sum = (set) => set.split(/[()\s]+/).join(',').split(',').filter(Boolean).reduce((s, x) => s + (ZSUM[x] || 0), 0);
  const hiDup = usesDuplicate(hi.node, end.sphere), loDup = usesDuplicate(lo.node, end.sphere);
  if (hiDup && !loDup) {
    return `Duplicate the double bond: ${hi.label} counts as ${sphereSets(hi.node, 2)[0]}, because each end of a double bond also counts the atom at the other end. Written that way ${hiSet} outranks ${loSet}.`;
  }
  if (sum(loSet) > sum(hiSet)) {
    return `You compared the sum of atoms; compare the highest atom first. The first atoms tie, so line up the attached atoms from the highest down: ${hiSet} beats ${loSet} at the first point of difference, even though ${lo.label} has the larger total.`;
  }
  return `The first atoms tie (both are ${hiSym}), so compare the atoms attached to them, highest first, and stop at the first difference: ${hiSet} beats ${loSet}${end.sphere > 2 ? ' (go further out until the sets differ)' : ''}. Size of the group does not decide it.`;
}

/** picks: [drawing index for carbon 1, for carbon 2] (null when not chosen), label: 'E'|'Z'|null. Returns {ok, diagnosis, wrong?:[drawing indices], empty?} */
export function grade(config, picks, label) {
  const dr = drawing(config);
  const e = dr.e;
  if (picks.some((p) => p == null)) return { ok: false, empty: true, diagnosis: 'Tap one group on each double-bond carbon first: the one with the higher priority.' };
  const bad = [];
  const msgs = [];
  e.ends.forEach((end, i) => {
    const hiIdx = subAtom(dr, i, end.hi);
    if (picks[i] !== hiIdx) {
      const k = [0, 1].find((kk) => subAtom(dr, i, kk) === picks[i]);
      bad.push(picks[i]);
      msgs.push(pickDiagnosis(end, k === undefined ? end.lo : k));
    }
  });
  if (bad.length) return { ok: false, wrong: bad, diagnosis: (bad.length === 2 ? 'Neither pick is right yet. ' : '') + msgs.join(' ') };
  if (!label) return { ok: false, empty: true, diagnosis: 'Your two picks are right. Now decide: E or Z?' };
  if (label !== e.label) {
    return { ok: false, diagnosis: `Your higher-priority groups are right, but they sit on ${e.label === 'Z' ? 'the same side' : 'opposite sides'} of the double bond. Same side = Z (zusammen, "together"); opposite sides = E (entgegen).` };
  }
  return { ok: true, diagnosis: '', label: e.label };
}

/** Rows of the "go one atom further" table for each carbon, up to `level` spheres (1 = the atom itself). */
export function tableRows(config, level) {
  const e = target(config);
  return e.ends.map((end) => ({
    atom: end.atom,
    rows: end.subs.map((s) => ({
      label: s.label,
      first: `${symOf(s.node.z)} (${s.node.z})`,
      sets: sphereSets(s.node, level)
    }))
  }));
}
export function maxLevel(config) {
  const e = target(config);
  return Math.max(2, ...e.ends.map((x) => x.sphere));
}

const h = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const k in props) { if (k === 'class') el.className = props[k]; else if (k === 'html') el.innerHTML = props[k]; else if (props[k] != null && props[k] !== false) el.setAttribute(k, props[k]); }
  kids.flat().forEach((c) => { if (c != null) el.append(c); });
  return el;
};

export default {
  id: 'cip-ranker',
  mount(host, config, ctx) {
    host.innerHTML = '';
    const dr = drawing(config);
    const e = dr.e;
    const pick = svgPick(dr.molblock, { width: 320, height: 210, keepHs: true });
    const stage = h('div', { class: 'gf-stage cip-stage', html: pick.svg });
    stage.querySelector('svg')?.setAttribute('role', 'img');
    stage.querySelector('svg')?.setAttribute('aria-label', 'Alkene with the hydrogens of the two double-bond carbons drawn. Tap the higher-priority group on each double-bond carbon.');
    const sel = [null, null];
    let label = null, locked = false;
    const side = (end) => (dr.coords[end.atom].x <= dr.coords[e.ends[1 - e.ends.indexOf(end)].atom].x ? 'left' : 'right');
    const btns = [];
    e.ends.forEach((end, i) => {
      end.subs.forEach((s, k) => {
        const idx = subAtom(dr, i, k);
        const b = h('button', { type: 'button', class: 'gf-atom', 'aria-pressed': 'false', 'aria-label': `${side(end)} carbon: ${s.atom === null ? 'hydrogen' : 'the ' + s.label + ' group'}` });
        b.style.left = pick.pts[idx].x + '%'; b.style.top = pick.pts[idx].y + '%';
        b.dataset.atom = String(idx); b.dataset.end = String(i);
        b.addEventListener('click', () => {
          if (locked) return;
          sel[i] = sel[i] === idx ? null : idx;
          btns.filter((x) => x.dataset.end === String(i)).forEach((x) => x.setAttribute('aria-pressed', String(Number(x.dataset.atom) === sel[i])));
          btns.forEach((x) => x.classList.remove('bad'));
          msg.textContent = '';
        });
        stage.append(b); btns.push(b);
      });
    });

    const ask = h('p', { class: 'gf-ask', html: config.ask || 'Rank the groups with the CIP rules. <b>Tap the higher-priority group</b> on each double-bond carbon (hydrogens are drawn so you can tap them too), then choose E or Z.' });
    const tableBox = h('div', { class: 'cip-tables', 'aria-live': 'polite' });
    let level = 0;
    const draw = () => {
      tableBox.innerHTML = '';
      if (!level) return;
      const data = tableRows(config, level);
      data.forEach((c, i) => {
        const end = e.ends[i];
        const head = ['Group', 'Atom on the carbon'].concat(Array.from({ length: Math.max(0, level - 1) }, (_, k) => (k === 0 ? 'Atoms attached to it' : `Next atoms out (${k + 1})`)));
        const tbl = h('table', { class: 'cip-table' },
          h('caption', {}, `${side(end) === 'left' ? 'Left' : 'Right'} carbon`),
          h('thead', {}, h('tr', {}, head.map((t) => h('th', { scope: 'col' }, t)))),
          h('tbody', {}, c.rows.map((r) => h('tr', {}, h('th', { scope: 'row' }, r.label), h('td', {}, r.first), r.sets.map((st) => h('td', {}, st))))));
        tableBox.append(h('div', { class: 'cip-wrap' }, tbl));
      });
      tableBox.append(h('p', { class: 'muted small' }, level < maxLevel(config) ? 'Compare the highest atom of each set first; only if they match, move on to the next atom. Not the total.' : 'Line the sets up from the highest atom down and stop at the first difference. A double bond counts its far atom twice.'));
    };
    const more = h('button', { type: 'button', class: 'btn ghost cip-more' }, 'Go one atom further');
    more.addEventListener('click', () => {
      if (locked) return;
      level = Math.min(level + 1, maxLevel(config));
      draw();
      more.textContent = level >= maxLevel(config) ? 'That is as far as it goes' : 'Go one atom further';
      more.disabled = level >= maxLevel(config);
    });
    const ez = h('div', { class: 'cip-ez', role: 'group', 'aria-label': 'Is the double bond E or Z?' },
      ['E', 'Z'].map((t) => {
        const b = h('button', { type: 'button', class: 'btn cip-ez-btn', 'aria-pressed': 'false', 'data-ez': t }, t);
        b.addEventListener('click', () => { if (locked) return; label = label === t ? null : t; ez.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.ez === label))); msg.textContent = ''; });
        return b;
      }));
    const msg = h('p', { class: 'muted small gf-msg', 'aria-live': 'polite' });
    const check = h('button', { type: 'button', class: 'btn primary' }, 'Check');
    const clear = h('button', { type: 'button', class: 'btn ghost' }, 'Clear');
    clear.addEventListener('click', () => {
      if (locked) return;
      sel[0] = sel[1] = null; label = null;
      btns.forEach((x) => { x.setAttribute('aria-pressed', 'false'); x.classList.remove('bad'); });
      ez.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      msg.textContent = '';
    });
    check.addEventListener('click', () => {
      if (locked) return;
      const r = grade(config, sel, label);
      if (r.empty) { msg.textContent = r.diagnosis; return; }
      if (r.ok) {
        locked = true; check.disabled = true; clear.disabled = true; more.disabled = true;
        btns.forEach((b) => { b.disabled = true; b.classList.add('lock'); });
        ez.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        stage.classList.add('good');
        level = maxLevel(config); draw();
      } else { btns.forEach((b) => b.classList.toggle('bad', (r.wrong || []).includes(Number(b.dataset.atom)))); }
      ctx.onResult(r);
    });
    host.append(ask, stage, h('div', { class: 'gf-row' }, more), tableBox, h('p', { class: 'cip-q' }, 'E or Z?'), ez, msg, h('div', { class: 'gf-row' }, check, clear));
    return { destroy() {} };
  }
};
