// Widget: assign R or S to ONE chirality center (Lesson 15; reusable).
//   mode '3d'    a solid 3D model (data/3d/chiral.js, `model`, `which` = 'molblock' | 'mirror' for the enantiomer)
//   mode 'wedge' an exam-style wedge/dash drawing generated from the SMILES by engine/chirality.js `wedgeDrawing` (style 'low' | 'two', lowOn, pair)
// The learner: (1) taps the four groups in priority order (CIP rules 1-3, "go one atom further" shows the attached-atom sets);
//   (2) 3D: turns the model until group 4 points away (or presses "Point 4 away") and says where group 4 points;
//       wedge: says whether group 4 is on a wedge, a dash or a plain bond (a plain bond -> the swap trick);
//   (3) sees the 1 -> 2 -> 3 curve, says clockwise or counterclockwise, and then R or S.
// config.flow 'full' (all of that, default) | 'quick' (rank the groups, then R or S). Everything is graded against RDKit-checked data
// (engine/cip.js labels, tetrahedron sign of the real coordinates); wrong steps get a specific diagnosis.
import CHIRAL from '../../data/3d/chiral.js';
import { svgPick } from '../chem.js';
import { tetraInfo, sphereSets } from '../cip.js';
import { createView } from './view3d.js';
import { Pose, attachSpin, animate, arcThrough } from './spin3d.js';
import { model3dInfo, wedgeDrawing, rankDiagnosis, turnOf, pointing, rotBetween, axisAngle, rotAxisAngle, matMul, matVec, rotX, rotY, readRule } from '../chirality.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const WORD = { cw: 'clockwise', ccw: 'counterclockwise' };
const ARC = '#f0861f';

// ================================================================================================ pure logic
/** Everything the widget needs about one centre: groups with ranks, the true label, and (3d) coordinates or (wedge) the drawing. */
export function build(config) {
  if ((config.mode || '3d') === '3d') {
    const entry = CHIRAL[config.model];
    const which = config.which || 'molblock';
    const mi = model3dInfo(entry, which);
    return { mode: '3d', T: mi.info, groups: mi.groups, truth: mi.label, mol: mi.mol, center: mi.center, entry, which };
  }
  const dr = wedgeDrawing(config.smiles, { style: config.style, lowOn: config.lowOn, pair: config.pair, atom: config.atom });
  const T = dr.info;
  return { mode: 'wedge', T, groups: dr.groups, truth: dr.label, drawing: dr, center: dr.center, lowFlag: dr.lowFlag };
}
const grp = (S, rank) => S.groups.find((g) => g.rank === rank);

/** The learner taps `sub` as priority `n` (1..4). */
export function gradeRankTap(S, n, sub) {
  const want = S.T.order[n - 1];
  if (sub === want) return { ok: true };
  return { ok: false, diagnosis: rankDiagnosis(S.T, sub, n) };
}
/** 3D: rotated model atoms for a rotation matrix about the centroid (same convention as Pose). */
export function viewAtoms(S, rot) { return new Pose(S.mol.atoms).atoms(rot); }
/** 3D: where group 4 points for a viewer on +z: 'toward' | 'away' | 'side'. */
export function lowPointing(S, rot) {
  const A = viewAtoms(S, rot), c = A[S.center], g = A[grp(S, 4).atom];
  return pointing([g.x - c.x, g.y - c.y, g.z - c.z]);
}
/** 3D: the way 1 -> 2 -> 3 turns on screen for this orientation. */
export function viewDirection(S, rot) {
  const A = viewAtoms(S, rot);
  const P = (r) => { const a = A[grp(S, r).atom]; return [a.x, a.y]; };
  return turnOf(P(1), P(2), P(3));
}
/** Wedge: where each rank sits on the page (molblock coordinates, y up), after the learner's swap (rankAt[position rank] = rank placed there). */
export function pagePositions(S, swapped) {
  const d = S.drawing;
  const pos = {};
  d.groups.forEach((g) => { pos[g.rank] = [d.atoms[g.atom].x, d.atoms[g.atom].y]; });
  if (swapped) { const a = pos[swapped[0]]; pos[swapped[0]] = pos[swapped[1]]; pos[swapped[1]] = a; }
  return pos;
}
export function pageDirection(S, swapped) { const p = pagePositions(S, swapped); return turnOf(p[1], p[2], p[3]); }
/** The group that carries the dash (the one 4 swaps with), or null. */
export function dashedGroup(S) { return S.groups.find((g) => g.flag === 'dash') || null; }

export function gradeDirection(S, answer, dirNow) {
  if (Math.abs(dirNow.area) < 0.02) return { ok: false, diagnosis: 'From this angle groups 1, 2 and 3 almost line up, so the turn cannot be seen. Rotate the model a little until they open out into a triangle.' };
  if (answer === dirNow.dir) return { ok: true };
  return { ok: false, diagnosis: `Follow the orange curve from 1 to 2 to 3: it turns ${WORD[dirNow.dir]} on the screen, not ${WORD[answer]}.` };
}
export function gradeOrient(S, answer, now) {
  if (answer === now) return { ok: true };
  const say = { toward: 'toward you (it is nearer to you than the carbon)', away: 'away from you (it is behind the carbon)', side: 'sideways (neither clearly toward nor clearly away)' };
  return { ok: false, diagnosis: `Look at where group 4 sits relative to the carbon: right now it points ${say[now]}.` };
}
export function gradePosition(S, answer) {
  if (answer === S.lowFlag) return { ok: true };
  const word = { wedge: 'a wedge (toward you)', dash: 'a dash (away from you)', plain: 'a plain bond (in the plane of the page)' };
  return { ok: false, diagnosis: `Find the number 4 in the drawing: its bond to the carbon is ${word[S.lowFlag]}, not ${word[answer]}.` };
}
/**
 * The final R/S answer. `st` = { dir: 'cw'|'ccw' (what the learner saw), low: 'toward'|'away'|'side'|'wedge'|'dash'|'plain', swapped:boolean }.
 */
export function gradeLabel(S, answer, st) {
  if (answer === S.truth) return { ok: true };
  const direct = st.dir === 'cw' ? 'R' : st.dir === 'ccw' ? 'S' : null;
  const mapping = 'With group 4 pointing away from you, clockwise means R and counterclockwise means S.';
  if (st.low === 'toward' || st.low === 'wedge') {
    if (!st.swapped && (direct === null || answer === direct)) return { ok: false, diagnosis: `Group 4 is ${st.low === 'wedge' ? 'on a wedge, pointing toward you' : 'pointing toward you'}: reverse your answer. Seen from the front, 1 → 2 → 3 gives the opposite of the true configuration, because you are looking at the molecule from the wrong side.` };
  }
  if (st.swapped && (direct === null || answer === direct)) return { ok: false, diagnosis: 'You swapped two groups to bring group 4 onto the dash. Swapping any two groups turns a center into its mirror image, so the reading you just made belongs to the opposite molecule: reverse it once.' };
  if (st.low === 'away' || st.low === 'dash') return { ok: false, diagnosis: `${mapping} You saw ${WORD[st.dir] || 'a turn'}, so the reading is ${direct || 'the one that goes with it'}.` };
  if (st.low === 'side') return { ok: false, diagnosis: 'Group 4 is neither toward nor away from you yet. Turn the model (or press “Point 4 away”) until group 4 is behind the carbon, then read the direction.' };
  return { ok: false, diagnosis: 'Group 4 is a plain bond in the page, so the direction cannot be read directly. Use the swap trick first: swap group 4 with the group on the dash, read the direction, then reverse your answer once.' };
}

// ================================================================================================ widget
export default {
  id: 'rs-assigner',
  mount(host, config, ctx = { onResult() {}, onProgress() {} }) {
    host.innerHTML = '';
    const S = build(config);
    const T = S.T;
    const flow = config.flow || 'full';
    const root = el('div', 'rsa'); host.append(root);
    const cleanup = [];
    root.append(el('p', 'gf-ask', config.ask || (S.mode === '3d' ? 'Find the configuration of the ringed chirality center. First rank its four groups, then read the direction.' : 'Find the configuration of the chirality center in this drawing. First rank its four groups, then read the direction.')));
    const live = el('p', 'mp-live rs-say'); live.setAttribute('aria-live', 'polite');
    const note = el('p', 'm3-note');

    // ----- figure
    let pose = null, pose0 = null, view = null, pick = null, stage = null, arcSvg = null, paintFig = () => {};
    const badges = {};     // sub -> number
    let swapped = null;    // [rankA, rankB] swapped on the page
    const figBox = el('div', 'rs-fig');
    root.append(figBox);
    if (S.mode === '3d') {
      const box = el('div', 'spin-host'); figBox.append(box);
      view = createView(box, { label: 'Molecule model with the chirality center ringed', ortho: true });
      cleanup.push(() => view.destroy());
      pose = new Pose(S.mol.atoms);
      // start with group 4 toward the viewer, then a little off-axis so the learner has something to do
      const v4 = (() => { const a = S.mol.atoms[grp(S, 4).atom], c = S.mol.atoms[S.center], cc = pose.c; return [a.x - c.x, a.y - c.y, a.z - c.z]; })();
      pose.rot = matMul(matMul(rotX(0.35), rotY(-0.45)), rotBetween(v4, [0, 0, 1]));
      pose0 = pose.rot;
      attachSpin(box, pose, () => paintFig(), 'Molecule model. Drag to turn it, or use the arrow keys.');
      view.ready.then(() => { note.textContent = view.kind === 'svg' ? 'Flat view of the same 3D coordinates (3D graphics are not available here). Drag to turn it, or use the arrow keys when it is focused.' : 'Drag to turn the model (or use the arrow keys when it is focused).'; });
    } else {
      pick = svgPick(S.drawing.molblock, { width: 340, height: 240, keepHs: true, molBlockWedging: true });
      stage = el('div', 'gf-stage rs-stage', pick.svg);
      stage.querySelector('svg')?.setAttribute('role', 'img');
      stage.querySelector('svg')?.setAttribute('aria-label', 'Wedge and dash drawing of the molecule. Tap the four bonds around the center in priority order.');
      figBox.append(stage);
      arcSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arcSvg.setAttribute('viewBox', '0 0 340 240'); arcSvg.setAttribute('class', 'rs-arc'); arcSvg.setAttribute('aria-hidden', 'true');
      stage.append(arcSvg);
      note.textContent = 'A solid wedge comes toward you, a dashed bond goes away from you, a plain line is in the plane of the page.';
    }

    // ----- groups (chips; in wedge mode the atoms in the drawing are also tappable)
    const chipWrap = el('div', 'rs-chips'); chipWrap.setAttribute('role', 'group'); chipWrap.setAttribute('aria-label', 'The four groups on the center: tap them from priority 1 to priority 4');
    const chips = T.subs.map((s, k) => {
      const b = el('button', 'rs-chip', `<span class="rs-name">${s.label}</span><span class="rs-num" aria-hidden="true"></span>`);
      b.type = 'button'; b.dataset.sub = k; b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', `${s.label} group`);
      chipWrap.append(b); return b;
    });
    const atomBtns = [];
    if (S.mode === 'wedge') {
      S.groups.forEach((g) => {
        const b = el('button', 'gf-atom'); b.type = 'button'; b.setAttribute('aria-label', `${g.label} group`); b.dataset.sub = g.sub;
        b.style.left = pick.pts[g.atom].x + '%'; b.style.top = pick.pts[g.atom].y + '%';
        stage.append(b); atomBtns.push(b);
      });
    }
    const revealRow = el('div', 'gf-row'); const more = el('button', 'btn ghost cip-more', 'Go one atom further'); more.type = 'button'; revealRow.append(more);
    const tableBox = el('div', 'cip-tables'); tableBox.setAttribute('aria-live', 'polite');
    let level = 0;
    const maxLevel = Math.max(2, ...T.firstDiff);
    const drawTable = () => {
      tableBox.innerHTML = '';
      if (!level) return;
      const head = ['Group', 'Atom on the center'].concat(Array.from({ length: Math.max(0, level - 1) }, (_, k) => (k === 0 ? 'Atoms attached to it' : `Next atoms out (${k + 1})`)));
      const zsym = { 1: 'H', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 15: 'P', 16: 'S', 17: 'Cl', 35: 'Br', 53: 'I' };
      const tbl = el('table', 'cip-table'); tbl.append(el('caption', '', 'Atoms around the center'));
      tbl.append(el('thead', '', '<tr>' + head.map((t) => `<th scope="col">${t}</th>`).join('') + '</tr>'));
      const body = el('tbody');
      T.subs.forEach((s) => {
        const sets = sphereSets(s.node, level);
        body.append(el('tr', '', `<th scope="row">${s.label}</th><td>${zsym[s.node.z] || '?'} (${s.node.z})</td>` + sets.map((x) => `<td>${x}</td>`).join('')));
      });
      tbl.append(body);
      tableBox.append(el('div', 'cip-wrap', ''));
      tableBox.lastChild.append(tbl);
      tableBox.append(el('p', 'muted small', level < maxLevel ? 'Compare the highest atom of each set first; only if they match, move on to the next atom. Not the total.' : 'Line the sets up from the highest atom down and stop at the first difference. A double bond counts its far atom twice.'));
    };
    more.addEventListener('click', () => {
      level = Math.min(level + 1, maxLevel); drawTable();
      more.textContent = level >= maxLevel ? 'That is as far as it goes' : 'Go one atom further'; more.disabled = level >= maxLevel;
    });

    // ----- question panel
    const q = el('div', 'rs-q');
    const msg = el('p', 'muted small gf-msg'); msg.setAttribute('aria-live', 'polite');
    const bar = el('div', 'gf-row rs-bar');
    root.append(chipWrap, revealRow, tableBox, bar, q, msg, live, note);

    // ----- painting
    const rankOfSub = (k) => badges[k];
    const rankedSubs = () => Object.keys(badges).map(Number);
    const sceneNow = () => {
      const A = pose.atoms();
      const labels = [], lines = [];
      for (const g of S.groups) if (badges[g.sub]) { const a = A[g.atom]; labels.push({ p: [a.x, a.y + 0.5, a.z + 0.35], text: String(badges[g.sub]), big: true }); }
      if (arcOn) {
        const P = (r) => { const a = A[grp(S, r).atom]; return [a.x, a.y]; };
        const dir = turnOf(P(1), P(2), P(3)).dir;
        const { pts, tip } = arcThrough(P(1), P(2), P(3), dir);
        const zTop = Math.max(...A.map((a) => a.z)) + 0.9;
        for (let i = 0; i + 1 < pts.length; i++) lines.push({ a: [pts[i][0], pts[i][1], zTop], b: [pts[i + 1][0], pts[i + 1][1], zTop], color: ARC, thick: true, front: true });
        const L = Math.hypot(tip.dir[0], tip.dir[1]) || 1, ux = tip.dir[0] / L, uy = tip.dir[1] / L;
        for (const sgn of [1, -1]) { const ca = Math.cos(sgn * 2.6), sa = Math.sin(sgn * 2.6); lines.push({ a: [tip.at[0], tip.at[1], zTop], b: [tip.at[0] + 0.45 * (ux * ca - uy * sa), tip.at[1] + 0.45 * (ux * sa + uy * ca), zTop], color: ARC, thick: true, front: true }); }
      }
      return { atoms: A, bonds: S.mol.bonds.map((b) => [b[0], b[1]]), rings: [S.center], labels, lines };
    };
    let arcOn = false;
    const wedgePos = (r) => {   // screen position (px in the 340x240 viewBox) of the group that sits at rank r on the page (after a swap)
      const rr = swapped ? (r === swapped[0] ? swapped[1] : r === swapped[1] ? swapped[0] : r) : r;
      const g = grp(S, rr); const p = pick.pts[g.atom];
      return [p.x * 3.4, p.y * 2.4];
    };
    const paintWedge = () => {
      stage.querySelectorAll('.rs-badge').forEach((n) => n.remove());
      const c = pick.pts[S.center];
      S.groups.forEach((g) => {
        let r = badges[g.sub]; if (!r) return;
        if (swapped) r = r === swapped[0] ? swapped[1] : r === swapped[1] ? swapped[0] : r;   // the numbers trade places
        const p = pick.pts[g.atom];
        const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1;
        const b = el('span', 'rs-badge', String(r)); b.style.left = (p.x + (dx / d) * 6.5) + '%'; b.style.top = (p.y + (dy / d) * 9 - 2) + '%';
        stage.append(b);
      });
      arcSvg.innerHTML = '';
      if (arcOn) {
        const P = [1, 2, 3].map((r) => { const p = wedgePos(r); return [p[0], -p[1]]; });
        const dirNow = turnOf(P[0], P[1], P[2]).dir;
        const { pts, tip } = arcThrough(P[0], P[1], P[2], dirNow, 32);
        const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${(-p[1]).toFixed(1)}`).join(' ');
        const L = Math.hypot(tip.dir[0], tip.dir[1]) || 1, ux = tip.dir[0] / L, uy = tip.dir[1] / L;
        const head = [1, -1].map((sg) => { const ca = Math.cos(sg * 2.6), sa = Math.sin(sg * 2.6); return `M${tip.at[0].toFixed(1)},${(-tip.at[1]).toFixed(1)} L${(tip.at[0] + 13 * (ux * ca - uy * sa)).toFixed(1)},${(-(tip.at[1] + 13 * (ux * sa + uy * ca))).toFixed(1)}`; }).join(' ');
        arcSvg.innerHTML = `<path d="${path}" class="rs-arc-path"/><path d="${head}" class="rs-arc-path"/>`;
      }
    };
    paintFig = () => { if (S.mode === '3d') view.show(sceneNow()); else paintWedge(); };
    paintFig();
    if (config.view) {   // a picture only (worked examples): optional rank numbers and the 1 -> 2 -> 3 curve
      if (config.numbers) T.subs.forEach((_, k) => { badges[k] = T.rank[k]; });
      arcOn = !!config.arc; paintFig();
      return { destroy() { cleanup.forEach((f) => f()); } };
    }

    // ----- ranking
    let ranking = true, locked = false;
    const paintChips = () => chips.forEach((b, k) => {
      const r = badges[k]; b.setAttribute('aria-pressed', String(!!r)); b.querySelector('.rs-num').textContent = r ? String(r) : '';
      b.classList.toggle('ranked', !!r);
    });
    const tapGroup = (k) => {
      if (!ranking || locked) return;
      if (badges[k]) {   // tapping the last one again takes it back
        const last = rankedSubs().length;
        if (badges[k] === last) { delete badges[k]; paintChips(); paintFig(); }
        return;
      }
      const n = rankedSubs().length + 1;
      const r = gradeRankTap(S, n, k);
      if (!r.ok) {
        chips[k].classList.add('bad'); setTimeout(() => chips[k].classList.remove('bad'), 700);
        msg.textContent = ''; ctx.onResult({ ok: false, diagnosis: r.diagnosis }); return;
      }
      badges[k] = n; msg.textContent = '';
      if (n === 3) { const rest = T.order[3]; badges[rest] = 4; live.textContent = `The group left over, ${T.subs[rest].label}, is number 4.`; }
      paintChips(); paintFig(); ctx.onProgress && ctx.onProgress();
      if (rankedSubs().length === 4) { ranking = false; level = maxLevel; more.disabled = true; more.textContent = 'That is as far as it goes'; drawTable(); next('ranked'); }
    };
    chips.forEach((b, k) => b.addEventListener('click', () => tapGroup(k)));
    atomBtns.forEach((b) => b.addEventListener('click', () => tapGroup(Number(b.dataset.sub))));

    // ----- stages after the ranking
    let seenDir = null, lowNow = null;
    const opts = (list, onPick) => {
      q.querySelectorAll('.cf-ans').forEach((n) => n.remove());
      const row = el('div', 'cf-ans'); row.setAttribute('role', 'group');
      list.forEach(([v, text]) => { const b = el('button', 'btn rs-opt', text); b.type = 'button'; b.dataset.v = v; b.addEventListener('click', () => { if (!locked) onPick(v, b); }); row.append(b); });
      q.append(row);
    };
    const ask = (text) => { q.innerHTML = ''; q.append(el('p', 'cf-task', text)); };
    const fail = (b, r) => { if (b) { b.classList.add('bad'); setTimeout(() => b.classList.remove('bad'), 700); } ctx.onResult({ ok: false, diagnosis: r.diagnosis }); };

    function next(from) {
      if (from === 'ranked') {
        live.textContent = `Ranked: ${T.order.map((i, n) => `${n + 1} = ${T.subs[i].label}`).join(', ')}.`;
        if (flow === 'quick') return stageLabel();
        return S.mode === '3d' ? stageOrient() : stagePosition();
      }
    }
    function addBarButtons() {
      if (S.mode !== '3d' || bar.childElementCount) return;
      const away = el('button', 'btn', 'Point 4 away'); away.type = 'button';
      const reset = el('button', 'btn ghost', 'Reset the view'); reset.type = 'button';
      let busy = false;
      away.addEventListener('click', () => {
        if (busy || locked) return; busy = true;
        const A = pose.atoms(), c = A[S.center], g = A[grp(S, 4).atom];
        const R = rotBetween([g.x - c.x, g.y - c.y, g.z - c.z], [0, 0, -1]);
        const { axis, angle } = axisAngle(R), start = pose.rot;
        animate(800, (t) => { pose.rot = matMul(rotAxisAngle(axis, angle * t), start); paintFig(); }, () => { pose.rot = matMul(R, start); paintFig(); busy = false; live.textContent = 'Group 4 is now behind the carbon. You still have to read the direction yourself.'; });
      });
      reset.addEventListener('click', () => { if (busy || locked) return; pose.rot = pose0; paintFig(); });
      bar.append(away, reset);
    }
    // 3D: where does 4 point?
    function stageOrient() {
      addBarButtons();
      ask('Turn the model (drag it), or press “Point 4 away”. Then answer: right now, where does group 4 point?');
      opts([['toward', 'Toward me'], ['away', 'Away from me'], ['side', 'Sideways']], (v, b) => {
        const now = lowPointing(S, pose.rot);
        const r = gradeOrient(S, v, now);
        if (!r.ok) return fail(b, r);
        lowNow = now;
        live.textContent = now === 'away' ? 'Yes: group 4 is behind the carbon, so you are looking at the molecule from the side opposite group 4. That is the view the rule needs.' : now === 'toward' ? 'Yes: group 4 points toward you. You can still read the direction, but you will have to reverse it. (Or press “Point 4 away” first.)' : 'Yes: sideways. Turn it so 4 is behind the carbon, or you will not be able to trust the direction.';
        ctx.onProgress && ctx.onProgress(); stageDir();
      });
    }
    // wedge: where is 4 on the page?
    function stagePosition() {
      ask('Find group 4, the lowest priority. In this drawing, group 4 is on…');
      opts([['wedge', 'a wedge (toward you)'], ['dash', 'a dash (away from you)'], ['plain', 'a plain bond (in the page)']], (v, b) => {
        const r = gradePosition(S, v);
        if (!r.ok) return fail(b, r);
        lowNow = S.lowFlag;
        ctx.onProgress && ctx.onProgress();
        if (S.lowFlag === 'plain') { live.textContent = 'Group 4 is in the page, so it is neither toward nor away. Use the swap trick.'; return stageSwap(); }
        live.textContent = S.lowFlag === 'dash' ? 'On a dash: group 4 points away from you, exactly the view the rule wants.' : 'On a wedge: group 4 points toward you. You will have to reverse the direction you read.';
        stageDir();
      });
    }
    function stageSwap() {
      const d = dashedGroup(S);
      ask(`Swap trick: trade the numbers of group 4 and the group on the dash (number ${d ? d.rank : '?'}). That puts 4 on the dash, where it can be read.`);
      q.querySelectorAll('.cf-ans').forEach((n) => n.remove());
      const b = el('button', 'btn primary', 'Swap 4 with the dashed group'); b.type = 'button';
      b.addEventListener('click', () => {
        swapped = [4, d.rank]; b.disabled = true; arcOn = false; paintFig();
        live.textContent = `Swapped: the number 4 now sits on the dash and ${d.rank} sits where 4 was. A swap turns the center into its mirror image, so the answer will need reversing once.`;
        lowNow = 'dash'; ctx.onProgress && ctx.onProgress(); stageDir();
      });
      q.append(b);
    }
    function dirNowValue() {
      if (S.mode === '3d') return viewDirection(S, pose.rot);
      const P = [1, 2, 3].map((r) => { const p = wedgePos(r); return [p[0], -p[1]]; });
      return turnOf(P[0], P[1], P[2]);
    }
    function stageDir() {
      arcOn = true; paintFig();
      ask('Follow the orange curve from 1 to 2 to 3' + (S.mode === '3d' ? ' (turn the model if the three groups are hard to see)' : '') + '. Which way does it turn?');
      opts([['cw', 'Clockwise ↻'], ['ccw', 'Counterclockwise ↺']], (v, b) => {
        const r = gradeDirection(S, v, dirNowValue());
        if (!r.ok) return fail(b, r);
        seenDir = v; ctx.onProgress && ctx.onProgress();
        live.textContent = `Yes: ${WORD[v]} as you see it.`;
        stageLabel();
      });
    }
    function stageLabel() {
      ask(flow === 'quick' ? 'Now decide: is this center R or S?' : 'So what is the configuration of this center?');
      opts([['R', 'R'], ['S', 'S']], (v, b) => {
        let low = lowNow;
        if (flow === 'quick') low = S.mode === '3d' ? lowPointing(S, pose.rot) : S.lowFlag;
        else if (S.mode === '3d') low = lowPointing(S, pose.rot);   // judged when the answer is given
        const st = { dir: seenDir || (S.mode === '3d' ? viewDirection(S, pose.rot).dir : (S.lowFlag === 'plain' ? null : pageDirection(S, null).dir)), low, swapped: !!swapped };
        const r = gradeLabel(S, v, st);
        if (!r.ok) return fail(b, r);
        locked = true; q.querySelectorAll('button').forEach((x) => { x.disabled = true; }); b.classList.add('good');
        chips.forEach((c) => { c.disabled = true; }); atomBtns.forEach((c) => { c.disabled = true; });
        bar.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        live.textContent = `Yes: ${S.truth}. ${explainTruth(S, st)}`;
        ctx.onResult({ ok: true, label: S.truth });
      });
    }
    return { destroy() { cleanup.forEach((f) => f()); } };
  }
};

/** One sentence that ties the answer to the reading rule. */
export function explainTruth(S, st) {
  const dir = st.dir ? WORD[st.dir] : null;
  if (st.swapped) return `After the swap the curve turned ${dir}; reversing once for the swap gives ${S.truth}.`;
  if (st.low === 'away' || st.low === 'dash') return dir ? `With group 4 pointing away, 1 → 2 → 3 turns ${dir}, which is ${S.truth}.` : `That is ${S.truth}.`;
  if (st.low === 'toward' || st.low === 'wedge') return dir ? `Group 4 points toward you, so the ${dir} curve you saw is reversed: ${S.truth}.` : `That is ${S.truth}.`;
  return `That is ${S.truth}.`;
}
