// Widget: tap carbons on a skeletal drawing to trace the parent chain, choose ring vs chain, or tap the C1 end.
// Graded by the computed longest path (engine/naming.js), never by hand-typed answers.
//
// config: { smiles, task: 'trace' | 'parent' | 'number', ask? }
//   trace  : tap every carbon of the longest chain (acyclic alkane). A chain of the right length that has fewer branches loses a tie.
//   parent : molecule with a ring and a chain: tap the whole ring (any ring carbon) or the chain, whichever is the parent.
//   number : the parent chain is outlined; tap the carbon that must be C1. Numbers then appear along the chain.
import { svgPick } from '../chem.js';
import { parentInfo, alkaneInfo, locantsFrom } from '../naming.js';

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function setEq(a, b) { const s = new Set(a); return s.size === new Set(b).size && [...s].every((x) => new Set(b).has(x)); }
function induced(adj, sel) {
  const set = new Set(sel);
  const deg = new Map(sel.map((v) => [v, adj[v].filter((w) => set.has(w)).length]));
  const seen = new Set([sel[0]]); const st = [sel[0]];
  while (st.length) { const v = st.pop(); for (const w of adj[v]) if (set.has(w) && !seen.has(w)) { seen.add(w); st.push(w); } }
  return { set, deg, connected: seen.size === set.size };
}

/** The correct selections (arrays of atom indices) for a config. */
export function solution(config) {
  if (config.task === 'number') return alkaneInfo(config.smiles, 'new').ends;
  const info = parentInfo(config.smiles);
  if (config.task === 'parent') return info.kind === 'ring' ? info.ring : info.chains[0];
  return info.best[0];
}
/** Atoms shown outlined as the parent in 'number' mode. */
export function outlined(config) { return alkaneInfo(config.smiles, 'new').parentAtoms; }

/** selected: array of atom indices. Returns {ok, diagnosis, empty?, extra?}. */
export function grade(config, selected) {
  if (!selected.length) return { ok: false, empty: true, diagnosis: config.task === 'number' ? 'Tap the carbon that should be C1 first.' : 'Tap the carbons first, then press Check.' };
  if (config.task === 'number') return gradeNumber(config, selected);
  if (config.task === 'parent') return gradeParent(config, selected);
  return gradeTrace(config, selected);
}

function gradeTrace(config, sel) {
  const info = parentInfo(config.smiles);
  const { set, deg, connected } = induced(info.adj, sel);
  if (!connected) return { ok: false, diagnosis: 'Those carbons are not one unbroken chain: each carbon you tap must be bonded to the one before it.' };
  const fork = sel.find((v) => deg.get(v) > 2);
  if (fork !== undefined) return { ok: false, extra: [fork], diagnosis: 'A chain cannot fork. One of your carbons has three chosen neighbours: follow a single path and leave the branches out.' };
  const k = sel.length;
  if (k < info.L) {
    const ends = sel.filter((v) => deg.get(v) <= 1);
    const canExtend = ends.some((v) => info.adj[v].some((w) => !set.has(w)));
    return { ok: false, diagnosis: canExtend
      ? `Your chain stops early (${plural(k, 'carbon')}): at one end there is still a carbon you could add. The longest chain here has ${info.L}.`
      : `You picked a shorter chain (${plural(k, 'carbon')}): the longest chain bends through the branch and has ${info.L} carbons.` };
  }
  const subs = info.subsOf(sel);
  if (subs < info.maxSubs) return { ok: false, diagnosis: `Your chain is as long as the longest (${info.L}), but another chain of that length has more branches (${info.maxSubs} against ${subs}). When chains tie in length, the parent is the one with more branches.` };
  return { ok: true, diagnosis: '' };
}

function gradeParent(config, sel) {
  const info = parentInfo(config.smiles);
  const ringSet = new Set(info.ring);
  const onRing = sel.filter((v) => ringSet.has(v)), offRing = sel.filter((v) => !ringSet.has(v));
  if (onRing.length && offRing.length) return { ok: false, extra: offRing, diagnosis: 'Choose one parent: either the whole ring or a chain, not both together.' };
  if (onRing.length) {
    if (!setEq(onRing, info.ring)) return { ok: false, diagnosis: 'The ring is one unit: tap a ring carbon and the whole ring is selected.' };
    return info.kind === 'ring' ? { ok: true, diagnosis: '' }
      : { ok: false, diagnosis: `The ring has ${info.ringSize} carbons but the chain has ${info.chainLen}. The larger of the two is the parent, so here it is the chain.` };
  }
  if (info.kind === 'ring') return { ok: false, diagnosis: `The chain has ${info.chainLen} carbons but the ring has ${info.ringSize}. When the ring is at least as big as the chain, the ring is the parent. Tap the ring.` };
  const { connected } = induced(info.adj, sel);
  if (!connected) return { ok: false, diagnosis: 'Those carbons are not one unbroken chain.' };
  if (!info.chains.some((c) => setEq(c, sel))) return { ok: false, diagnosis: `Yes, the chain is the parent here, but select all of it: ${info.chainLen} carbons, from the one next to the ring to the far end.` };
  return { ok: true, diagnosis: '' };
}

function gradeNumber(config, sel) {
  const info = alkaneInfo(config.smiles, 'new');
  const v = sel[0];
  const path = info.parentAtoms;
  if (info.ends.includes(v)) return { ok: true, diagnosis: '' };
  if (!path.includes(v)) return { ok: false, extra: [v], diagnosis: 'Number the parent chain (the outlined carbons) only: C1 is one of its two ends.' };
  if (path[0] !== v && path[path.length - 1] !== v) return { ok: false, extra: [v], diagnosis: 'C1 is at an end of the chain, not in the middle. Pick one of the two end carbons.' };
  const other = path[0] === v ? path[path.length - 1] : path[0];
  const mine = locantsFrom(config.smiles, v), theirs = locantsFrom(config.smiles, other);
  const same = JSON.stringify(mine) === JSON.stringify(theirs);
  return { ok: false, extra: [v], diagnosis: same
    ? `Both ends give the branches the same numbers (${mine.join(', ')}). On a tie, the branch that comes first alphabetically (ethyl before methyl) gets the lower number.`
    : `From that end the branches get ${mine.join(', ')}; from the other end they get ${theirs.join(', ')}. Number from the end that gives the lower number at the first difference.` };
}

export default {
  id: 'chain-tracer',
  mount(host, config, ctx) {
    host.innerHTML = '';
    const task = config.task || 'trace';
    const info = parentInfo(config.smiles);
    const big = info.adj.length > 9;
    const pick = svgPick(config.smiles, big ? { width: 340, height: 230 } : { width: 300, height: 200 });
    const stage = document.createElement('div');
    stage.className = 'gf-stage ct-stage' + (big ? ' big' : '');
    stage.innerHTML = pick.svg;
    stage.querySelector('svg')?.setAttribute('role', 'img');
    stage.querySelector('svg')?.setAttribute('aria-label', 'Skeletal structure. Tap carbons to select them.');
    const sel = new Set();
    let locked = false;
    const ringSet = new Set(info.ring || []);
    const outline = new Set(task === 'number' ? outlined(config) : []);
    const btns = pick.pts.map((p, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'gf-atom' + (outline.has(i) ? ' ct-chain' : '');
      b.style.left = p.x + '%'; b.style.top = p.y + '%';
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', `Carbon ${i + 1}`);
      b.dataset.atom = String(i);
      b.addEventListener('click', () => {
        if (locked) return;
        let group = [i];
        if (task === 'parent' && ringSet.has(i)) group = [...ringSet];
        if (task === 'number') { sel.clear(); btns.forEach((x) => x.setAttribute('aria-pressed', 'false')); }
        const on = !sel.has(i);
        group.forEach((k) => { if (on) sel.add(k); else sel.delete(k); btns[k]?.setAttribute('aria-pressed', String(on)); });
        btns.forEach((x) => x.classList.remove('bad'));
        msg.textContent = '';
        count.textContent = task === 'number' ? '' : `${sel.size} selected`;
      });
      stage.append(b);
      return b;
    });
    const label = document.createElement('p');
    label.className = 'gf-ask';
    label.innerHTML = config.ask || ({
      trace: 'Tap every carbon of the <b>longest continuous chain</b>, then press Check.',
      parent: 'Tap the <b>parent</b>: the whole ring (any ring carbon) or the chain. Then press Check.',
      number: 'The parent chain is outlined. Tap the carbon that should be <b>C1</b>, then press Check.'
    })[task];
    const msg = document.createElement('p');
    msg.className = 'muted small gf-msg'; msg.setAttribute('aria-live', 'polite');
    const count = document.createElement('span');
    count.className = 'muted small';
    const row = document.createElement('div');
    row.className = 'gf-row';
    const check = document.createElement('button'); check.type = 'button'; check.className = 'btn primary'; check.textContent = 'Check';
    const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'btn ghost'; clear.textContent = 'Clear';
    row.append(check, clear, count);
    clear.addEventListener('click', () => { if (locked) return; sel.clear(); btns.forEach((b) => { b.setAttribute('aria-pressed', 'false'); b.classList.remove('bad'); }); msg.textContent = ''; count.textContent = ''; });
    check.addEventListener('click', () => {
      if (locked) return;
      const r = grade(config, [...sel]);
      if (r.empty) { msg.textContent = r.diagnosis; return; }
      if (r.ok) {
        locked = true; check.disabled = true; clear.disabled = true;
        btns.forEach((b) => { b.disabled = true; b.classList.add('lock'); });
        stage.classList.add('good');
        if (task === 'number') {
          const path = outlined(config);
          const start = [...sel][0];
          const order = path[0] === start ? path : path.slice().reverse();
          order.forEach((a, k) => {
            const n = document.createElement('span');
            n.className = 'ct-num'; n.textContent = String(k + 1);
            n.style.left = pick.pts[a].x + '%'; n.style.top = pick.pts[a].y + '%';
            n.style.animationDelay = `${k * 60}ms`;
            stage.append(n);
          });
        }
      } else { btns.forEach((b, i) => b.classList.toggle('bad', (r.extra || []).includes(i))); }
      ctx.onResult(r);
    });
    host.append(label, stage, msg, row);
    return { destroy() {} };
  }
};
