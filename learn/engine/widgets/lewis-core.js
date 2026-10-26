// Pure logic for the Lewis builder (no DOM): state, molblock, grading. Shared by the widget, generators and tests.
import { VALENCE, NAME, canon } from '../chem.js';

const MINUS = '−';
export const fmtCharge = (n) => (n === 0 ? '0' : n > 0 ? '+' + (n === 1 ? '' : n) : MINUS + (n === -1 ? '' : -n));
const fmtFC = (n) => (n > 0 ? '+' + n : n < 0 ? MINUS + -n : '0');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function initialState(config) {
  return {
    atoms: config.atoms.map((a) => ({ el: a.el, x: a.x, y: a.y, lp: a.lp || 0, charge: a.charge || 0 })),
    bonds: config.bonds.map((b) => ({ a: b.a, b: b.b, order: b.order || 1 }))
  };
}

/** The state a learner would reach by following the correct solution (config.solution). */
export function solutionState(config) {
  const s = initialState(config);
  const sol = config.solution;
  sol.bonds.forEach((o, i) => { s.bonds[i].order = o; });
  sol.lp.forEach((n, i) => { s.atoms[i].lp = n; });
  sol.charge.forEach((n, i) => { s.atoms[i].charge = n; });
  return s;
}

export function bondOrderSum(state, i) {
  let n = 0;
  for (const b of state.bonds) if (b.a === i || b.b === i) n += b.order;
  return n;
}

/** Molblock with explicit H, bond orders, charges and explicit valence (so RDKit never adds H). */
export function buildMolblock(state) {
  const lines = ['', '  orgo-learn', ''];
  const pad = (n, w) => String(n).padStart(w, ' ');
  lines.push(`${pad(state.atoms.length, 3)}${pad(state.bonds.length, 3)}  0  0  0  0  0  0  0  0999 V2000`);
  const chg = [];
  state.atoms.forEach((a, i) => {
    const bo = bondOrderSum(state, i);
    const val = bo === 0 ? 15 : Math.min(bo, 14);
    lines.push(`${(a.x * 1.5).toFixed(4).padStart(10)}${(-a.y * 1.5).toFixed(4).padStart(10)}${(0).toFixed(4).padStart(10)} ${a.el.padEnd(3)} 0  0  0  0  0${pad(val, 3)}  0  0  0  0  0  0`);
    if (a.charge) chg.push([i + 1, a.charge]);
  });
  for (const b of state.bonds) lines.push(`${pad(b.a + 1, 3)}${pad(b.b + 1, 3)}${pad(b.order, 3)}  0`);
  for (let i = 0; i < chg.length; i += 8) {
    const part = chg.slice(i, i + 8);
    lines.push(`M  CHG${pad(part.length, 3)}${part.map(([n, c]) => `${pad(n, 4)}${pad(c, 4)}`).join('')}`);
  }
  lines.push('M  END', '');
  return lines.join('\n');
}

export function stateCanon(state) { return canon(buildMolblock(state)); }

function describe(a, bo) {
  const parts = [];
  if (a.lp) parts.push(`${plural(a.lp, 'lone pair')} = ${2 * a.lp}`);
  if (bo) parts.push(`${plural(bo, 'bond')} = ${2 * bo}`);
  return parts.join(', plus ') || 'no bonds or lone pairs';
}

/** Grade a builder state. Order: electron count per atom, then charge, then connectivity. */
export function evaluate(state, config) {
  const diag = config.diagnoses || [];
  for (let i = 0; i < state.atoms.length; i++) {
    const a = state.atoms[i];
    const bo = bondOrderSum(state, i);
    const e = 2 * a.lp + 2 * bo;
    const want = a.el === 'H' ? 2 : 8;
    const carbocation = a.el === 'C' && e === 6 && a.lp === 0 && a.charge === 1; // a real sextet
    if (e !== want && !carbocation) {
      const custom = diag.find((d) => d.el === a.el && d.electrons === e);
      if (custom) return { ok: false, diagnosis: custom.why, code: 'electrons', atom: i };
      const name = NAME[a.el] || a.el;
      let why;
      if (e > want) why = a.el === 'H' ? `Hydrogen has ${e} electrons around it (${describe(a, bo)}). It can hold only 2.` : `${name} has ${e} electrons around it (${describe(a, bo)}). An octet is 8, so remove a lone pair or a bond.`;
      else why = `${name} has ${e} electrons around it (${describe(a, bo)}). It wants ${want}: add a lone pair or turn a bond into a double bond.`;
      return { ok: false, diagnosis: why, code: 'electrons', atom: i };
    }
  }
  for (let i = 0; i < state.atoms.length; i++) {
    const a = state.atoms[i];
    const bo = bondOrderSum(state, i);
    const V = VALENCE[a.el];
    const fc = V - 2 * a.lp - bo;
    if (fc !== a.charge) {
      const owned = 2 * a.lp + bo;
      const name = NAME[a.el] || a.el;
      let why;
      const custom = config.chargeWhy && config.chargeWhy[a.el];
      if (custom && a.charge === 0) why = custom;
      else if (fc === 0) why = `${name} owns ${2 * a.lp} lone-pair electrons + ${bo} from its bonds = ${owned}, exactly the ${V} a neutral ${a.el} brings. Its charge should be 0.`;
      else why = `${name} owns ${2 * a.lp} lone-pair electrons + ${bo} from its bonds = ${owned}, but a neutral ${a.el} brings ${V}. Its formal charge is ${V} ${MINUS} ${owned} = ${fmtFC(fc)}: set it.`;
      return { ok: false, diagnosis: why, code: 'charge', atom: i };
    }
  }
  const got = stateCanon(state);
  const want = canon(config.target);
  if (got && got === want) return { ok: true, diagnosis: '', code: 'ok' };
  return { ok: false, diagnosis: 'Every atom is balanced, but this is not the molecule asked for. Check which atoms are joined and the bond orders.', code: 'connectivity' };
}

// ---- geometry helpers (angles in radians, SVG coordinates: y down) ----
const TAU = Math.PI * 2;
const angDist = (a, b) => { let d = Math.abs(a - b) % TAU; return d > Math.PI ? TAU - d : d; };

/** Pick k directions as far as possible from the occupied angles (deterministic greedy, stable as k grows). */
export function freeAngles(occupied, k) {
  const cands = [];
  for (let i = 0; i < 24; i++) cands.push(-Math.PI / 2 + (i * TAU) / 24);
  const taken = occupied.slice();
  const out = [];
  for (let n = 0; n < k; n++) {
    let best = null, bestD = -1;
    for (const c of cands) {
      const d = taken.length ? Math.min(...taken.map((t) => angDist(c, t))) : 99;
      if (d > bestD + 1e-9) { bestD = d; best = c; }
    }
    out.push(best); taken.push(best);
  }
  return out;
}

/**
 * Angles for k lone pairs on an atom whose bonds point along `bondAngs`.
 * Pairs go into the open gaps between bonds, spread evenly inside each gap,
 * always filling the gap that leaves the widest spacing (so water's two pairs
 * sit on the open side, not squeezed between the O–H bonds).
 */
export function lonePairAngles(bondAngs, k) {
  if (k <= 0) return [];
  if (!bondAngs.length) return Array.from({ length: k }, (_, i) => -Math.PI / 2 + (i * TAU) / Math.max(k, 4));
  const s = bondAngs.map((t) => ((t % TAU) + TAU) % TAU).sort((a, b) => a - b);
  const gaps = s.map((t, i) => {
    const next = i + 1 < s.length ? s[i + 1] : s[0] + TAU;
    return { start: t, size: next - t, n: 0 };
  });
  // on equal gaps prefer the one facing up (screen angle −90°), the way pairs are usually drawn
  const upness = (g) => angDist(g.start + g.size / 2, -Math.PI / 2);
  for (let p = 0; p < k; p++) {
    let best = gaps[0];
    for (const g of gaps) {
      const a = g.size / (g.n + 2), b = best.size / (best.n + 2);
      if (a > b + 1e-6 || (Math.abs(a - b) <= 1e-6 && upness(g) < upness(best))) best = g;
    }
    best.n++;
  }
  const out = [];
  for (const g of gaps) for (let j = 1; j <= g.n; j++) out.push(g.start + (g.size * j) / (g.n + 1));
  return out;
}

export function bondAngles(state, i) {
  const a = state.atoms[i];
  const out = [];
  for (const b of state.bonds) {
    const j = b.a === i ? b.b : b.b === i ? b.a : -1;
    if (j >= 0) out.push(Math.atan2(state.atoms[j].y - a.y, state.atoms[j].x - a.x));
  }
  return out;
}

/** Place `count` hydrogens around a heavy atom at (x,y) given the angles of its other neighbours. */
export function hydrogenPositions(x, y, nbrAngles, count) {
  let angs;
  if (nbrAngles.length === 0) angs = Array.from({ length: count }, (_, i) => -Math.PI / 2 + (i * TAU) / count);
  else angs = freeAngles(nbrAngles, count);
  return angs.map((t) => ({ x: x + Math.cos(t), y: y + Math.sin(t) }));
}
