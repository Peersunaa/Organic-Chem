// Resonance (Lesson 11, McMurry 4.9 and 4.10). Pure logic, no DOM.
//
// A resonance form is the SAME set of atoms and sigma bonds as the start with only electrons (pi bonds and lone pairs) moved.
// Three things live here:
//   1. applyAndCheck(scene, arrows): the learner's curved arrows (arrow-core format) are applied to a scene {atoms, bonds} and the result is judged:
//      every problem gets its own diagnosis (an arrow from a sigma bond, an atom moved, an atom over its octet, charge not conserved ...).
//   2. compareForm(start, candidate): a drawn candidate (SMILES) against the start: same atoms? same sigma framework (hydrogens included)? same total
//      charge? octets? Used by the "which is NOT a valid resonance form" traps and the mastery generator.
//   3. enumerate(start): every resonance form of a start structure, found by sliding electrons with the two moves of McMurry 4.10 (a lone pair or an empty
//      p orbital next to a pi bond; a ring of alternating bonds flipping), each with the arrows that make it. tools/check_resonance.py proves these sets
//      against RDKit's ResonanceMolSupplier. Radicals are not modelled (they need single-barbed arrows, and RDKit does not enumerate them).
// Forms are compared by ATOM INDEX (bond orders + charges per atom), because in a resonance form no atom ever changes place.
import { analyze, rdkit, VALENCE } from './chem.js';
import { applyArrows, validate, bondOrderSum, findBond, lpCount } from './widgets/arrow-core.js';
import { buildMolblock } from './widgets/lewis-core.js';

const MINUS = '−';
const fmtQ = (q) => (q === 0 ? '0' : q > 0 ? (q === 1 ? '+' : q + '+') : (q === -1 ? MINUS : -q + MINUS));
const NAMES = { H: 'hydrogen', C: 'carbon', N: 'nitrogen', O: 'oxygen', S: 'sulfur', Cl: 'chlorine', Br: 'bromine', F: 'fluorine' };
const nameOf = (el) => NAMES[el] || el;

// ---------------------------------------------------------------- index-space states
/** Heavy-atom state of a SMILES written with its atoms in the order we want to keep: {el[], impH[], charge[], bonds:[{a,b,order}]}. */
export function stateOf(smiles, opts = {}) {
  const info = analyze(smiles, opts);
  if (!info) return null;
  return {
    el: info.atoms.map((a) => a.sym), impH: info.atoms.map((a) => a.impH), charge: info.atoms.map((a) => a.fc),
    bonds: info.bonds.map((b) => ({ a: b.atoms[0], b: b.atoms[1], order: b.bo ?? 1 }))
  };
}
const orderSum = (st, i) => st.bonds.reduce((s, b) => s + (b.a === i || b.b === i ? b.order : 0), 0) + st.impH[i];
const lpOf = (st, i) => (VALENCE[st.el[i]] - st.charge[i] - orderSum(st, i)) / 2;
const bondIdx = (st, i, j) => st.bonds.findIndex((b) => (b.a === i && b.b === j) || (b.a === j && b.b === i));
const clone = (st) => ({ el: st.el, impH: st.impH, charge: st.charge.slice(), bonds: st.bonds.map((b) => ({ ...b })) });
/** Recompute formal charges from bond orders and lone pairs that the move left behind (lone pairs tracked in lp[]). */
function recharge(st, lp) { for (let i = 0; i < st.el.length; i++) st.charge[i] = VALENCE[st.el[i]] - 2 * lp[i] - orderSum(st, i); }

/** Key of a state: charges + bond orders (so the two Kekule drawings of a ring differ). `fold` ignores bond orders (charges only). */
export const keyOfState = (st, fold = false) => st.charge.join(',') + (fold ? '' : '|' + st.bonds.map((b) => Math.min(b.a, b.b) + '-' + Math.max(b.a, b.b) + ':' + b.order).sort().join(','));

// ---------------------------------------------------------------- enumeration
/**
 * All single moves from a state: [{arrows, state}] with arrows in arrow-core format on the HEAVY-ATOM indices of the state.
 *   lone pair D next to a pi bond A=B :   D-A gains a bond, A=B loses one, B gets the lone pair         arrows  lp(D) -> bond(D,A) ; bond(A,B) -> atom(B)
 *   empty p orbital X next to a pi bond:  X-A gains a bond, A=B loses one, B is left with the empty orbital   arrow  bond(A,B) -> bond(X,A)
 *   a six-ring with alternating double / single bonds flips (the two Kekule drawings)                   arrows  three of bond(i,j) -> bond(j,k)
 */
export function movesFrom(st) {
  const out = [];
  const n = st.el.length;
  const nb = Array.from({ length: n }, () => []);
  st.bonds.forEach((b) => { nb[b.a].push(b.b); nb[b.b].push(b.a); });
  const ord = (i, j) => { const k = bondIdx(st, i, j); return k < 0 ? 0 : st.bonds[k].order; };
  for (let D = 0; D < n; D++) {
    const lp = lpOf(st, D);
    const empty = lp === 0 && orderSum(st, D) <= 3 && st.el[D] !== 'H';
    for (const A of nb[D]) {
      for (const B of nb[A]) {
        if (B === D || ord(A, B) < 2) continue;
        if (lp >= 1) {
          const next = clone(st);
          next.bonds[bondIdx(next, D, A)].order += 1; next.bonds[bondIdx(next, A, B)].order -= 1;
          const lps = st.el.map((_, i) => lpOf(st, i)); lps[D] -= 1; lps[B] += 1;
          recharge(next, lps);
          out.push({ arrows: [{ from: { lp: D }, to: { bond: [D, A] } }, { from: { bond: [A, B] }, to: { atom: B } }], state: next });
        }
        if (empty && ord(D, A) === 1) {
          const next = clone(st);
          next.bonds[bondIdx(next, D, A)].order += 1; next.bonds[bondIdx(next, A, B)].order -= 1;
          const lps = st.el.map((_, i) => lpOf(st, i));
          recharge(next, lps);
          out.push({ arrows: [{ from: { bond: [A, B] }, to: { bond: [D, A] } }], state: next });
        }
      }
    }
  }
  // six-membered rings of alternating bonds (benzene-type Kekule flip)
  const seen = new Set();
  for (let s = 0; s < n; s++) {
    const walk = (path) => {
      const last = path[path.length - 1];
      if (path.length === 6) { if (nb[last].includes(path[0])) tryRing(path); return; }
      for (const m of nb[last]) if (!path.includes(m) && m > path[0]) walk(path.concat(m));
    };
    walk([s]);
  }
  function tryRing(p) {
    const key = p.slice().sort((a, b) => a - b).join(',');
    if (seen.has(key)) return;
    const os = p.map((v, i) => ord(v, p[(i + 1) % 6]));
    const alt = os.every((o, i) => o === (i % 2 === 0 ? os[0] : os[1])) && ((os[0] === 2 && os[1] === 1) || (os[0] === 1 && os[1] === 2));
    if (!alt) return;
    seen.add(key);
    const dbl = os[0] === 2 ? 0 : 1; // first index i such that bond p[i]-p[i+1] is double
    const next = clone(st);
    p.forEach((v, i) => { const k = bondIdx(next, v, p[(i + 1) % 6]); next.bonds[k].order = next.bonds[k].order === 2 ? 1 : 2; });
    const arrows = [0, 2, 4].map((t) => { const i = (dbl + t) % 6; const a = p[i], b = p[(i + 1) % 6], c = p[(i + 2) % 6]; return { from: { bond: [a, b] }, to: { bond: [b, c] } }; });
    out.push({ arrows, state: next });
  }
  return out;
}

/**
 * Every resonance form reachable from `smiles`: [{state, key, via: arrows from the start's heavy atoms, smiles}] in discovery order (the start is first).
 * `fold` groups the forms by charge pattern only (the benzyl cation counts its two Kekule drawings of the ring once: 4 forms).
 */
export function enumerate(smiles, opts = {}) {
  const start = stateOf(smiles);
  const fold = !!opts.fold;
  const forms = [{ state: start, key: keyOfState(start, fold), via: [], parent: -1, from: -1 }];
  const seen = new Map([[forms[0].key, 0]]);
  for (let q = 0; q < forms.length; q++) {
    for (const m of movesFrom(forms[q].state)) {
      const key = keyOfState(m.state, fold);
      if (seen.has(key)) continue;
      seen.set(key, forms.length);
      forms.push({ state: m.state, key, via: m.arrows, parent: q, from: q });
    }
  }
  return forms.map((f) => ({ ...f, smiles: toSmiles(f.state) }));
}

/** Count of distinct forms. */
export const countForms = (smiles, opts) => enumerate(smiles, opts).length;

/** SMILES for an index-space state, atoms in the SAME ORDER as the start (so a form can be compared to the start by atom index). Kekule bonds are kept. */
export function toSmiles(st, opts = {}) {
  const n = st.el.length;
  const adj = Array.from({ length: n }, () => []);
  st.bonds.forEach((b) => { adj[b.a].push([b.b, b.order]); adj[b.b].push([b.a, b.order]); });
  // a spanning-tree depth-first walk with ring-closure digits; atom order in the string differs from index order, so we keep it readable not index-faithful
  const visited = new Array(n).fill(false), ringOpen = new Map(), ringsAt = Array.from({ length: n }, () => []);
  const tree = new Set(); let ringNo = 0;
  const order = [];
  const dfs = (v, from) => {
    visited[v] = true; order.push(v);
    for (const [w] of adj[v]) { if (w === from || visited[w]) continue; tree.add(v + '-' + w); dfs(w, v); }
  };
  const comps = [];
  for (let v = 0; v < n; v++) if (!visited[v]) { dfs(v, -1); comps.push(v); }
  const closure = [];
  st.bonds.forEach((b) => { if (!tree.has(b.a + '-' + b.b) && !tree.has(b.b + '-' + b.a)) closure.push(b); });
  closure.forEach((b) => { ringNo++; ringsAt[b.a].push({ no: ringNo, order: b.order }); ringsAt[b.b].push({ no: ringNo, order: b.order }); });
  const sym = (o) => (o === 2 ? '=' : o === 3 ? '#' : '');
  const atomText = (i) => {
    const q = st.charge[i], h = st.impH[i];
    const needBracket = opts.brackets || q !== 0 || !['C', 'N', 'O', 'S', 'F', 'Cl', 'Br', 'I'].includes(st.el[i]) || lpOf(st, i) % 1 !== 0;
    if (!needBracket) return st.el[i];
    return '[' + st.el[i] + (h ? 'H' + (h > 1 ? h : '') : '') + (q ? (q > 0 ? '+' : '-') + (Math.abs(q) > 1 ? Math.abs(q) : '') : '') + ']';
  };
  const done = new Array(n).fill(false);
  const write = (v, from, ord) => {
    done[v] = true;
    let s = sym(ord) + atomText(v);
    ringsAt[v].forEach((r) => { s += (r.order === 2 ? '=' : r.order === 3 ? '#' : '') + (r.no > 9 ? '%' + r.no : r.no); });
    const kids = adj[v].filter(([w]) => w !== from && tree.has(v + '-' + w));
    kids.forEach(([w, o], idx) => { const sub = write(w, v, o); s += idx < kids.length - 1 ? '(' + sub + ')' : sub; });
    return s;
  };
  return comps.map((c) => write(c, -1, 0)).join('.');
}

// ---------------------------------------------------------------- checks on arrows
const sigmaPairs = (bonds) => new Set(bonds.map((b) => Math.min(b.a, b.b) + '-' + Math.max(b.a, b.b)));
const where = (scene, i) => `${nameOf(scene.atoms[i].el)}${scene.atoms[i].label ? ' ' + scene.atoms[i].label : ''}`;
const electronsAround = (state, i) => 2 * Math.max(0, state.atoms[i].lp) + 2 * bondOrderSum(state.atoms, state.bonds, i);

/**
 * Judge the learner's arrows on a scene. scene = {atoms:[{el,x,y,charge}], bonds:[{a,b,order}]} (explicit H atoms allowed).
 * Returns {ok, code, diagnosis, result?: {atoms, bonds} (the structure after the arrows), wrong?: [arrow indices]}.
 * codes: empty, source-none, sigma, moved, octet, charge, same, ok
 */
export function applyAndCheck(scene, arrows) {
  if (!arrows.length) return { ok: false, code: 'empty', diagnosis: 'Draw at least one curved arrow: tap the electrons it starts from (a pi bond or a lone pair), then the bond or atom that receives them.', wrong: [] };
  const cfg = { atoms: scene.atoms, bonds: scene.bonds, arrows };
  // 1. arrows start at a lone pair or a pi bond, never at a sigma bond
  for (let n = 0; n < arrows.length; n++) {
    const f = arrows[n].from;
    if (f.bond) {
      const k = findBond(scene.bonds, f.bond[0], f.bond[1]);
      const ord = k < 0 ? 0 : scene.bonds[k].order || 1;
      if (ord < 2) {
        const hs = f.bond.filter((i) => scene.atoms[i].el === 'H');
        const a = where(scene, f.bond[0]), b = where(scene, f.bond[1]);
        return {
          ok: false, code: 'sigma', wrong: [n],
          diagnosis: hs.length
            ? `Arrows must start at a lone pair or a π bond, not a σ bond. That arrow starts at a ${a}${MINUS}${b} bond, a σ bond to hydrogen. Breaking it moves an H atom: that gives a different molecule, not a resonance form.`
            : `Arrows must start at a lone pair or a π bond, not a σ bond. The ${a}${MINUS}${b} bond you started from is a single (σ) bond. σ bonds hold the atoms together, and in resonance no atom ever moves. Start from a double bond or a lone pair.`
        };
      }
    } else if (f.lp != null && lpCount(scene.atoms, scene.bonds, f.lp) < 1) {
      return { ok: false, code: 'source-none', wrong: [n], diagnosis: `${nameOf(scene.atoms[f.lp].el)[0].toUpperCase() + nameOf(scene.atoms[f.lp].el).slice(1)} has no lone pair to move. Arrows start at a lone pair or a π bond.` };
    }
  }
  const errs = validate(cfg);
  if (errs.length) return { ok: false, code: 'invalid', diagnosis: 'That set of arrows does not work: ' + errs[0] + '.', wrong: [] };
  // 2. apply, then compare with the start
  const result = applyArrows(cfg);
  const before = sigmaPairs(scene.bonds), after = sigmaPairs(result.bonds);
  for (const k of after) {
    if (!before.has(k)) {
      const [i, j] = k.split('-').map(Number);
      return { ok: false, code: 'moved', result, wrong: arrows.map((_, n) => n).filter((n) => { const t = arrows[n].to; return t.bond && sigmaPairs([{ a: t.bond[0], b: t.bond[1] }]).has(k); }), diagnosis: `You moved an atom. Your arrows make a new bond between ${where(scene, i)} and ${where(scene, j)}, which were not bonded. That is a different molecule, not a resonance form: atoms and σ bonds never move, only π electrons and lone pairs do.` };
    }
  }
  for (const k of before) {
    if (!after.has(k)) {
      const [i, j] = k.split('-').map(Number);
      return { ok: false, code: 'moved', result, wrong: [], diagnosis: `You moved an atom. Your arrows break the ${where(scene, i)}${MINUS}${where(scene, j)} bond completely. That is a different molecule, not a resonance form: a π bond can lose a pair of electrons, but the σ bond underneath stays.` };
    }
  }
  const lowLp = result.atoms.findIndex((a) => a.lp < 0);
  if (lowLp >= 0) return { ok: false, code: 'source-none', result, wrong: [], diagnosis: `${nameOf(scene.atoms[lowLp].el)[0].toUpperCase() + nameOf(scene.atoms[lowLp].el).slice(1)} does not have enough electrons for those arrows (you used the same pair twice).` };
  const over = result.atoms.findIndex((a, i) => electronsAround(result, i) > (a.el === 'H' ? 2 : 8));
  if (over >= 0) {
    const bondsAt = bondOrderSum(result.atoms, result.bonds, over);
    const el = result.atoms[over].el;
    return {
      ok: false, code: 'octet', result, wrong: [],
      diagnosis: el === 'C' ? `This carbon now has ${bondsAt} bonds. Carbon never has more than 4 (an octet). When a pair of electrons arrives at an atom that already has an octet, another pair has to leave it: add the arrow that moves a π bond away from that atom.`
        : `This ${nameOf(el)} atom now has ${electronsAround(result, over)} electrons around it, more than an octet. When a pair arrives at an atom that already has 8 electrons, another pair has to leave it: add the arrow that moves a π bond away.`
    };
  }
  const q0 = scene.atoms.reduce((s, a) => s + (a.charge || 0), 0), q1 = result.atoms.reduce((s, a) => s + a.charge, 0);
  if (q0 !== q1) return { ok: false, code: 'charge', result, wrong: [], diagnosis: `Charge not conserved: the start has a total charge of ${fmtQ(q0)} and your result ${fmtQ(q1)}. Electrons only move; none are added or removed.` };
  const same = result.atoms.every((a, i) => a.charge === (scene.atoms[i].charge || 0)) && result.bonds.every((b) => (scene.bonds[findBond(scene.bonds, b.a, b.b)] || {}).order === b.order);
  if (same) return { ok: false, code: 'same', result, wrong: [], diagnosis: 'Those arrows put every electron back where it started, so the structure did not change. Move a pair of π electrons (or a lone pair) over by one bond.' };
  return { ok: true, code: 'ok', result, wrong: [], diagnosis: '' };
}

/** Index-space state of a scene result (heavy atoms only; hydrogens are folded into impH), for comparing with enumerate() forms. */
export function stateFromScene(res, heavyCount) {
  const el = [], impH = [], charge = [];
  for (let i = 0; i < heavyCount; i++) { el.push(res.atoms[i].el); charge.push(res.atoms[i].charge || 0); impH.push(res.bonds.filter((b) => (b.a === i && res.atoms[b.b].el === 'H') || (b.b === i && res.atoms[b.a].el === 'H')).length); }
  const bonds = res.bonds.filter((b) => b.a < heavyCount && b.b < heavyCount).map((b) => ({ a: b.a, b: b.b, order: b.order }));
  return { el, impH, charge, bonds };
}

// ---------------------------------------------------------------- comparing a drawn candidate with the start
/** Atom list, bonds (explicit unsanitised parse so that an over-valent atom can still be read). */
function rawParse(smiles) {
  const ok = analyze(smiles);                       // a valid structure keeps its implicit hydrogens
  if (ok) return { el: ok.atoms.map((a) => a.sym), charge: ok.atoms.map((a) => a.fc), impH: ok.atoms.map((a) => a.impH), bonds: ok.bonds.map((b) => ({ a: b.atoms[0], b: b.atoms[1], order: b.bo ?? 1 })) };
  // an invalid one (a carbon with five bonds) is read without sanitising: every atom must be written in [brackets] with its H count
  const m = rdkit().get_mol(smiles, JSON.stringify({ sanitize: false }));
  if (!m) return null;
  try {
    const j = JSON.parse(m.get_json()).molecules[0];
    const SYM = { 1: 'H', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 15: 'P', 16: 'S', 17: 'Cl', 35: 'Br', 53: 'I' };
    const atoms = j.atoms.map((a) => ({ el: SYM[a.z ?? 6], charge: a.chg ?? 0, impH: a.impHs ?? 0 }));
    const bonds = (j.bonds || []).map((b) => ({ a: b.atoms[0], b: b.atoms[1], order: b.bo ?? 1 }));
    return { el: atoms.map((a) => a.el), charge: atoms.map((a) => a.charge), impH: atoms.map((a) => a.impH), bonds };
  } finally { m.delete(); }
}
const rawState = (smiles) => { const s = rawParse(smiles); return s; };

/** Is there a bijection of atoms that keeps element, attached H count and adjacency (bond orders ignored)? Small molecules only. */
export function sameFramework(A, B) {
  if (A.el.length !== B.el.length) return false;
  const n = A.el.length;
  const adj = (S) => { const m = Array.from({ length: n }, () => new Set()); S.bonds.forEach((b) => { m[b.a].add(b.b); m[b.b].add(b.a); }); return m; };
  const a = adj(A), b = adj(B);
  const sig = (S, m, i) => S.el[i] + S.impH[i] + ':' + [...m[i]].map((j) => S.el[j] + S.impH[j]).sort().join(',');
  const sa = A.el.map((_, i) => sig(A, a, i)), sb = B.el.map((_, i) => sig(B, b, i));
  if ([...sa].sort().join('|') !== [...sb].sort().join('|')) return false;
  const map = new Array(n).fill(-1), used = new Array(n).fill(false);
  const go = (i) => {
    if (i === n) return true;
    for (let j = 0; j < n; j++) {
      if (used[j] || sa[i] !== sb[j]) continue;
      let ok = true;
      for (const k of a[i]) if (k < i && !b[j].has(map[k])) { ok = false; break; }
      if (ok) for (let k = 0; k < i; k++) if (b[j].has(map[k]) && !a[i].has(k)) { ok = false; break; }
      if (!ok) continue;
      map[i] = j; used[j] = true;
      if (go(i + 1)) return true;
      used[j] = false; map[i] = -1;
    }
    return false;
  };
  return go(0);
}

const formulaKey = (S) => { const c = {}; S.el.forEach((e, i) => { c[e] = (c[e] || 0) + 1; if (S.impH[i]) c.H = (c.H || 0) + S.impH[i]; }); return Object.keys(c).sort().map((k) => k + c[k]).join(''); };

/** Over-full atoms of a raw state: [{i, el, bonds, electrons}]. */
export function overfull(S) {
  const out = [];
  S.el.forEach((el, i) => {
    const bonds = orderSum(S, i);
    const lp = lpOf(S, i);
    const e = 2 * bonds + 2 * Math.max(0, lp);
    if (e > (el === 'H' ? 2 : 8) || bonds > (el === 'H' ? 1 : 4) && el === 'C') out.push({ i, el, bonds, electrons: e });
  });
  return out;
}

/**
 * Is `candidate` (SMILES) a valid resonance form of `start`? Checks, in this order: same atoms (formula), same σ framework (nothing moved),
 * no atom over its octet (5-bond carbon), same total charge. Returns {ok, code, diagnosis}. codes: atoms, moved, octet, charge, same, ok
 * `same` = the candidate is the start itself (valid but not a new form).
 */
export function compareForm(start, candidate) {
  const A = stateOf(start), B = rawState(candidate);
  if (!A || !B) return { ok: false, code: 'parse', diagnosis: 'That structure cannot be read.' };
  if (formulaKey(A) !== formulaKey(B)) return { ok: false, code: 'atoms', diagnosis: 'This structure has different atoms from the start (the formula differs), so it is a different substance, not a resonance form.' };
  if (!sameFramework(A, B)) return { ok: false, code: 'moved', diagnosis: 'An atom has moved: the atoms are joined in a different way from the start (for example an H sits on a different atom). That is a different molecule, not a resonance form. Resonance moves only π electrons and lone pairs; atoms and σ bonds never move.' };
  const ov = overfull(B);
  if (ov.length) {
    const o = ov[0];
    return { ok: false, code: 'octet', diagnosis: o.el === 'C' ? `This carbon has ${o.bonds} bonds, which is ${2 * o.bonds} electrons around carbon. Carbon can never have more than 4 bonds (an octet), so this is not a valid Lewis structure and cannot be a resonance form.` : `This ${nameOf(o.el)} atom has ${o.electrons} electrons around it, more than an octet, so it is not a valid Lewis structure.` };
  }
  const q0 = A.charge.reduce((s, x) => s + x, 0), q1 = B.charge.reduce((s, x) => s + x, 0);
  if (q0 !== q1) return { ok: false, code: 'charge', diagnosis: `Charge not conserved: the start has a total charge of ${fmtQ(q0)}, this structure ${fmtQ(q1)}. Resonance forms are the same species, so the total charge must be identical in every form.` };
  const isStart = keyOfState(A) === keyOfState(B);
  return isStart ? { ok: true, code: 'same', diagnosis: 'This is the same structure as the start.' } : { ok: true, code: 'ok', diagnosis: 'A valid resonance form: same atoms, same σ framework, same charge, all octets respected.' };
}
/** The set of valid forms of a system as the rule-based check sees them (used by tests: every enumerated form passes compareForm). */
export function checkAll(smiles, opts) { return enumerate(smiles, opts).map((f) => ({ smiles: f.smiles, ...compareForm(smiles, f.smiles) })); }

// ---------------------------------------------------------------- the hybrid
/** Average over all forms: bond order per bond (1.5 = a bond drawn partly dashed) and charge per atom (+1/2 = δ+). */
export function hybridOf(forms) {
  const st0 = forms[0].state;
  const bonds = st0.bonds.map((b, k) => ({ a: b.a, b: b.b, order: forms.reduce((s, f) => s + f.state.bonds[bondIdx(f.state, b.a, b.b)].order, 0) / forms.length }));
  const charge = st0.el.map((_, i) => forms.reduce((s, f) => s + f.state.charge[i], 0) / forms.length);
  return { el: st0.el, impH: st0.impH, charge, bonds };
}
/** Text for a partial charge: δ+ (positive share), δ− (negative share), with the share when it is a simple fraction. */
export function partialLabel(q) {
  const a = Math.abs(q);
  if (a < 1e-9) return '';
  const frac = Math.abs(a - Math.round(a)) < 1e-9 ? '' : a === 0.5 ? '½' : a === 1 / 3 ? '⅓' : a === 2 / 3 ? '⅔' : a === 0.25 ? '¼' : a === 0.75 ? '¾' : a.toFixed(2);
  return `δ${q > 0 ? '+' : MINUS}${frac ? ' ' + frac : ''}`;
}

export { MINUS, fmtQ, buildMolblock };
