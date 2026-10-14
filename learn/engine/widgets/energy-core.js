// Pure logic for the energy-diagram widget (no DOM). Everything the learner is asked is COMPUTED from the levels.
//
// levels: [{label, kind: 'R'|'TS'|'I'|'P', E}] in reaction order: R, then (TS, I)* pairs ending TS, then P. E in kJ/mol (any common zero).
//   TS = energy maximum (cannot be isolated); I = energy minimum between two TS (an intermediate); R, P = start and end.
// step k (1-based) = the TS number k: it starts from the level before it (R or an I) and ends at the level after it (an I or P).
//   Eact(k) = E(TS k) - E(level before it);  dH = E(P) - E(R) (negative = exothermic).
//   Rate-determining step = the step whose TS is the highest on the diagram.

export const KIND_NAME = { R: 'reactants', TS: 'transition state', I: 'intermediate', P: 'products' };
export const letter = (i) => String.fromCharCode(65 + i);
const fmt = (n) => (n < 0 ? '−' + -n : String(n));

/** Problems with a set of levels; empty = a valid diagram (right order of kinds, TS are real maxima, I real minima). */
export function validate(levels) {
  const errs = [];
  if (levels.length < 3) return ['need at least R, TS, P'];
  if (levels[0].kind !== 'R') errs.push('first level must be R');
  if (levels[levels.length - 1].kind !== 'P') errs.push('last level must be P');
  levels.forEach((l, i) => {
    if (!['R', 'TS', 'I', 'P'].includes(l.kind)) errs.push(`level ${i}: bad kind ${l.kind}`);
    if (typeof l.E !== 'number' || !Number.isFinite(l.E)) errs.push(`level ${i}: E must be a number`);
    const expect = i === 0 ? 'R' : i === levels.length - 1 ? 'P' : i % 2 === 1 ? 'TS' : 'I';
    if (l.kind !== expect) errs.push(`level ${i}: expected ${expect} but found ${l.kind}`);
  });
  if (errs.length) return errs;
  levels.forEach((l, i) => {
    if (l.kind === 'TS' && !(l.E > levels[i - 1].E && l.E > levels[i + 1].E)) errs.push(`level ${i}: a TS must be higher than both neighbours`);
    if (l.kind === 'I' && !(l.E < levels[i - 1].E && l.E < levels[i + 1].E)) errs.push(`level ${i}: an intermediate must be lower than both neighbours`);
  });
  return errs;
}

/** Steps of the reaction with their barrier and energy change. */
export function steps(levels) {
  const out = [];
  levels.forEach((l, i) => {
    if (l.kind !== 'TS') return;
    out.push({ n: out.length + 1, from: i - 1, ts: i, to: i + 1, eact: l.E - levels[i - 1].E, dH: levels[i + 1].E - levels[i - 1].E });
  });
  return out;
}
export const overallDH = (levels) => levels[levels.length - 1].E - levels[0].E;
export const tsIndexes = (levels) => levels.map((l, i) => (l.kind === 'TS' ? i : -1)).filter((i) => i >= 0);
export const intermediateIndexes = (levels) => levels.map((l, i) => (l.kind === 'I' ? i : -1)).filter((i) => i >= 0);
/** The step with the highest TS (null if two TS are level). */
export function rdsStep(levels) {
  const st = steps(levels);
  const top = Math.max(...st.map((s) => levels[s.ts].E));
  const hit = st.filter((s) => levels[s.ts].E === top);
  return hit.length === 1 ? hit[0] : null;
}
/** The step with the smallest Eact is the fastest step. */
export function fastestStep(levels) {
  const st = steps(levels);
  const lo = Math.min(...st.map((s) => s.eact));
  const hit = st.filter((s) => s.eact === lo);
  return hit.length === 1 ? hit[0] : null;
}
/** A diagram is "consistent" when the step with the highest TS also has the largest Eact (so both rules of thumb agree). */
export function consistent(levels) {
  const st = steps(levels);
  const r = rdsStep(levels);
  if (!r) return false;
  return st.every((s) => s.n === r.n || s.eact < r.eact);
}

/** Candidate brackets for the Eact / dH tasks: {id, from, to, x} (levels it spans; x = where it is drawn: 'before ts', 'after ts', 'right'). */
export function brackets(levels) {
  const st = steps(levels);
  const out = [];
  st.forEach((s) => {
    out.push({ id: 'eact' + s.n, from: s.from, to: s.ts, side: 'left', of: s.ts });
    out.push({ id: 'rel' + s.n, from: s.ts, to: s.to, side: 'right', of: s.ts });
  });
  out.push({ id: 'dh', from: 0, to: levels.length - 1, side: 'end', of: levels.length - 1 });
  return out;
}

/** Task grading. `ans` = a level index (tap tasks), a bracket id (bracket tasks) or a string / number (choice tasks). */
export function gradeTask(levels, task, ans) {
  const [name, arg] = String(task).split(':');
  const st = steps(levels);
  const L = (i) => levels[i];
  const kindWord = { R: 'the starting level (the reactants)', P: 'the final level (the products)', I: 'an energy minimum', TS: 'an energy maximum' };
  if (name === 'ts') {
    const k = L(ans).kind;
    if (k === 'TS') return { ok: true, why: 'A transition state is an energy MAXIMUM: the highest-energy structure of that step. It is a fleeting arrangement, not a molecule you can isolate.' };
    if (k === 'I') return { ok: false, diagnosis: 'That is a valley, not a peak. A transition state is the highest point of a step. Valleys between two steps are intermediates.' };
    return { ok: false, diagnosis: `That is ${kindWord[k]}. A transition state is a peak on the path between two levels.` };
  }
  if (name === 'intermediate') {
    const k = L(ans).kind;
    if (k === 'I') return { ok: true, why: 'An intermediate is an energy MINIMUM between two transition states: a real species that forms and is used up again, so it is not in the final product.' };
    if (k === 'TS') return { ok: false, diagnosis: 'That is a peak, a transition state. An intermediate sits in a valley between two peaks.' };
    return { ok: false, diagnosis: `That is ${kindWord[k]}. An intermediate is a valley BETWEEN two peaks.` };
  }
  if (name === 'rds') {
    const r = rdsStep(levels);
    if (L(ans).kind !== 'TS') return { ok: false, diagnosis: 'Tap a transition state (a peak). The rate-determining step is the one whose peak is highest.' };
    if (r && ans === r.ts) return { ok: true, why: `This peak is the highest, so step ${r.n} is the rate-determining (slowest) step: it has the biggest barrier to climb.` };
    const mine = st.find((s) => s.ts === ans);
    return { ok: false, diagnosis: `That peak (step ${mine.n}) is lower than the highest one. The rate-determining step is the step with the highest transition state.` };
  }
  if (name === 'eact') {
    const k = Number(arg);
    const want = 'eact' + k;
    if (ans === want) return { ok: true, why: `Eact of step ${k} is measured from the level where the step starts UP to its transition state: ${st[k - 1].eact} kJ/mol here.` };
    if (ans === 'dh') return { ok: false, diagnosis: 'That bracket runs from the reactants to the products: it is the overall energy change, ΔH. Eact runs from where a step starts UP to that step’s peak.' };
    if (/^rel/.test(ans)) return { ok: false, diagnosis: 'That bracket goes DOWN from a peak. Eact is the climb up to the peak, from where the step starts.' };
    return { ok: false, diagnosis: `That is the barrier of step ${ans.slice(4)}, not step ${k}. Find the peak belonging to step ${k}, then the level the step starts from.` };
  }
  if (name === 'dh') {
    if (ans === 'dh') return { ok: true, why: `ΔH is final minus initial: from the reactants’ level to the products’ level, ${fmt(overallDH(levels))} kJ/mol here.` };
    if (/^eact/.test(ans)) return { ok: false, diagnosis: 'That bracket is a barrier (up to a peak). ΔH ignores the peaks: it compares only the reactants’ level with the products’ level.' };
    return { ok: false, diagnosis: 'That bracket does not run from the reactants to the products. ΔH compares only the very first and the very last level.' };
  }
  if (name === 'dhsign') {
    const dh = overallDH(levels);
    const sign = dh < 0 ? 'neg' : dh > 0 ? 'pos' : 'zero';
    if (ans === sign) return { ok: true, why: dh < 0 ? 'The products sit lower than the reactants, so energy is released: ΔH is negative (exothermic).' : dh > 0 ? 'The products sit higher than the reactants, so energy is absorbed: ΔH is positive (endothermic).' : 'Same level: ΔH is zero.' };
    if (sign === 'neg') return { ok: false, diagnosis: 'Compare the last level with the first. The products are LOWER, so the reaction releases energy: ΔH is negative.' };
    if (sign === 'pos') return { ok: false, diagnosis: 'Compare the last level with the first. The products are HIGHER, so the reaction absorbs energy: ΔH is positive.' };
    return { ok: false, diagnosis: 'The products and reactants are at the same level, so ΔH = 0.' };
  }
  if (name === 'faster') {
    const f = fastestStep(levels);
    if (f && Number(ans) === f.n) return { ok: true, why: `Step ${f.n} has the smaller Eact (${f.eact} kJ/mol), so more collisions get over its barrier: it is the faster step.` };
    return { ok: false, diagnosis: 'A SMALL activation energy means a fast step. Compare how high each step has to climb from where it starts.' };
  }
  if (name === 'nsteps') {
    if (Number(ans) === st.length) return { ok: true, why: `${st.length} peak${st.length > 1 ? 's' : ''} means ${st.length} step${st.length > 1 ? 's' : ''}: every step has its own transition state.` };
    return { ok: false, diagnosis: 'Count the peaks (transition states). Each step has exactly one.' };
  }
  throw new Error('unknown task ' + task);
}

/** Catalyst mode: `state` = current {ts, p} energies (the original levels are config.levels). */
export function gradeCatalyst(levels, state, opts = {}) {
  const orig = { ts: levels[1].E, p: levels[levels.length - 1].E };
  const minDrop = opts.minDrop ?? 10;
  if (state.p !== orig.p) return { ok: false, code: 'moved-p', diagnosis: 'You moved the level of the products. A catalyst cannot do that: the products are the same molecules with or without it, so ΔH (and the equilibrium) stay the same. Put the products back and lower the PEAK instead.' };
  if (orig.ts - state.ts < minDrop) return { ok: false, code: 'no-drop', diagnosis: orig.ts - state.ts < 0 ? 'You raised the peak, which would slow the reaction. A catalyst lowers the activation energy: drag the top of the peak DOWN.' : `The peak has barely moved. A catalyst gives a path with a clearly lower barrier: drag the top of the peak down by at least ${minDrop} kJ/mol.` };
  return { ok: true, code: 'ok', why: `Eact fell from ${orig.ts - levels[0].E} to ${state.ts - levels[0].E} kJ/mol, but ΔH is still ${fmt(overallDH(levels))} kJ/mol. A catalyst speeds the reaction up without changing where it ends up.` };
}

// ---------------------------------------------------------------- geometry
/** Smooth curve through the levels with horizontal tangents at every level (so peaks and valleys land exactly on their E). */
export function pathD(pts) {
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = (b.x - a.x) * 0.5;
    d += ` C${(a.x + dx).toFixed(1)} ${a.y.toFixed(1)} ${(b.x - dx).toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}
