// Scene compiler: a storyboard (scenes/scenes/<id>.json) -> a layout (scenes/layouts/<id>.json) that the renderer interpolates.
// Pure JS. It needs one outside service, `draw(smiles)` (RDKit 2D coordinates, see build-layouts.mjs), so it runs at build time and in the tests; the
// browser only ever loads the finished layout.
//
// What the storyboard gives (SCENE-SCHEMA.md): every beat ends on a mapped `state`, and says how to get there with `adds`, `moves`, `relayout`, `pose`, `ghosts`.
// What this file does with it, in layout units (one unit = one bond length; +x right, +y DOWN the screen, +z toward the viewer = the "top" face):
//   1. lay every species out with RDKit and shift it to its `at` (min x, vertical centre), exactly as section 3 says;
//   2. for each beat: add the `adds` / `reset` species, run the `moves` one after the other (translate, anchor+near+offset, orient, dock `pairs`, `backside`,
//      `rotate`) and record each as a rigid motion {c, axis, ang, d} so the renderer can play it at any progress, then `relayout`;
//   3. record topology (atoms, bonds, charges, H counts) and positions at the end of the beat, label the intact species, resolve ghosts and resonance forms.
//
// Layout shape (all numbers rounded to 3 decimals by roundDeep()):
//   { id, v, stage0: {atoms, bonds, pos}, surface?: {...}, beats: [{ id, atoms:[{i,s,c,h,sp,st}], bonds:[[a,b,o]], pos0:{id:[x,y,z]}, segs:[...], pos1:{id:[x,y,z]},
//       removed:[id], added:[id], labels:[{text,ids}], ghosts:[...], forms:[...], relaid:bool }] }
//   seg = { at:[a,b], ids:[id], from:{id:[x,y,z]}, c, axis, ang, d, trail? }   position(u) = c + Rot(axis, ang*u)(from - c) + d*u
//       or { at, ids, from, to:{id:[x,y,z]}, relayout:true }                   position(u) = from + (to - from)*u

import { parseSmiles, stripMaps, splitDots } from './scene-parse.js';

// ---------------------------------------------------------------- tiny vector helpers
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const centroid = (ps) => mul(ps.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / (ps.length || 1));
/** Rodrigues: rotate v about the unit axis by ang radians. */
export function rotate(v, axis, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), k = axis;
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
}
/** position at progress u of a rigid seg from `from` */
export function rigidAt(seg, from, u) {
  return add(add(seg.c, rotate(sub(from, seg.c), seg.axis, seg.ang * u)), mul(seg.d, u));
}

const ZERO = [0, 0, 0];

// ---------------------------------------------------------------- drawing helpers
/** Species (parsed) + RDKit drawing -> Map id -> [x, y] in bond units, y DOWN, with the drawing's own origin. Fixes aromatic (1.5) bond orders from RDKit's Kekulé form. */
function drawn(smiles, draw, base = 0) {
  const P = parseSmiles(smiles, base);
  const D = draw(stripMaps(smiles));
  if (!D) throw new Error('scene-compile: RDKit cannot draw ' + smiles);
  const byOi = new Map(P.atoms.map((a) => [a.oi, a.id]));
  P.bonds.forEach((b) => {
    if (b.order !== 1.5) return;
    const ia = P.atoms.find((a) => a.id === b.a).oi, ib = P.atoms.find((a) => a.id === b.b).oi;
    const hit = D.bonds.find(([i, j]) => (i === ia && j === ib) || (i === ib && j === ia));
    b.order = hit ? hit[2] : 1;
  });
  const pts = new Map();
  P.atoms.forEach((a) => pts.set(a.id, [D.pts[a.oi].x, -D.pts[a.oi].y]));
  return { P, pts };
}
const bbox = (pts) => { const xs = [...pts.values()].map((p) => p[0]), ys = [...pts.values()].map((p) => p[1]); return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }; };

/** Orientation of a freshly drawn species: an elongated one (a diatomic, an alkyne, a chain) is laid horizontally with the first atom of its SMILES on the left,
 *  so "H goes to the left end" reads the way the storyboards assume; a compact one keeps RDKit's own orientation. `cfg` {rot (deg, clockwise on screen), flipX, flipY}
 *  is a per-species override applied afterwards. */
export function normalizePts(P, pts, cfg) {
  const ids = [...pts.keys()];
  if (ids.length >= 2) {
    const n = ids.length, cx = ids.reduce((t, id) => t + pts.get(id)[0], 0) / n, cy = ids.reduce((t, id) => t + pts.get(id)[1], 0) / n;
    let sxx = 0, syy = 0, sxy = 0;
    ids.forEach((id) => { const dx = pts.get(id)[0] - cx, dy = pts.get(id)[1] - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; });
    const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
    if (l2 < 1e-9 || l1 / l2 > 1.5) {
      const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), c = Math.cos(-th), s = Math.sin(-th);
      ids.forEach((id) => { const p = pts.get(id), dx = p[0] - cx, dy = p[1] - cy; pts.set(id, [dx * c - dy * s, dx * s + dy * c]); });
      const first = P.atoms[0].id, last = P.atoms[P.atoms.length - 1].id;
      if (pts.get(first)[0] > pts.get(last)[0]) ids.forEach((id) => { const p = pts.get(id); pts.set(id, [-p[0], p[1]]); });
    }
  }
  if (cfg) {
    const a = ((cfg.rot || 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    ids.forEach((id) => {
      let [x, y] = pts.get(id);
      if (cfg.flipX) x = -x;
      if (cfg.flipY) y = -y;
      pts.set(id, [x * c - y * s, x * s + y * c]);
    });
  }
  return pts;
}

/** 2D rigid fit (rotation + translation, mirror only if it cuts the error by more than 20 %) of `src` points onto `dst` points. Returns a function (x,y)->[x,y]. */
function fit2D(src, dst) {
  const n = src.length;
  const cs = [src.reduce((s, p) => s + p[0], 0) / n, src.reduce((s, p) => s + p[1], 0) / n];
  const cd = [dst.reduce((s, p) => s + p[0], 0) / n, dst.reduce((s, p) => s + p[1], 0) / n];
  const solve = (mirror) => {
    const S = src.map((p) => [mirror ? -(p[0] - cs[0]) : p[0] - cs[0], p[1] - cs[1]]);
    let a = 0, b = 0;
    for (let i = 0; i < n; i++) { const q = [dst[i][0] - cd[0], dst[i][1] - cd[1]]; a += S[i][0] * q[0] + S[i][1] * q[1]; b += S[i][0] * q[1] - S[i][1] * q[0]; }
    const th = Math.atan2(b, a), c = Math.cos(th), s = Math.sin(th);
    const f = (x, y) => { const X = mirror ? -(x - cs[0]) : x - cs[0], Y = y - cs[1]; return [cd[0] + X * c - Y * s, cd[1] + X * s + Y * c]; };
    let err = 0;
    for (let i = 0; i < n; i++) { const q = f(src[i][0], src[i][1]); err += (q[0] - dst[i][0]) ** 2 + (q[1] - dst[i][1]) ** 2; }
    return { f, err };
  };
  const A = solve(false), B = solve(true);
  return B.err < A.err * 0.8 ? B.f : A.f;
}

const components = (ids, bonds) => {
  const set = new Set(ids), adj = new Map(ids.map((i) => [i, []]));
  bonds.forEach((b) => { if (set.has(b.a) && set.has(b.b)) { adj.get(b.a).push(b.b); adj.get(b.b).push(b.a); } });
  const seen = new Set(), out = [];
  ids.forEach((i) => {
    if (seen.has(i)) return;
    const comp = [], stack = [i]; seen.add(i);
    while (stack.length) { const x = stack.pop(); comp.push(x); adj.get(x).forEach((y) => { if (!seen.has(y)) { seen.add(y); stack.push(y); } }); }
    out.push(comp);
  });
  return out;
};

/** Heavy-atom graph isomorphisms (element + connectivity) between a parsed fragment and the stages of coords.json. Returns a list of Maps atomId -> [x, y] in bond units (y down), or null.
 *  coords.json is drawn at 44 px per bond; the heavy atoms of the biggest piece of a stage that matches the fragment take their positions from it. */
export function bindCoords(P, stages) {
  const heavy = P.atoms.filter((a) => a.sym !== 'H');
  if (heavy.length < 3 || !stages.length) return null;
  const adjA = new Map(heavy.map((a) => [a.id, new Set()]));
  P.bonds.forEach((b) => { if (adjA.has(b.a) && adjA.has(b.b)) { adjA.get(b.a).add(b.b); adjA.get(b.b).add(b.a); } });
  const symA = new Map(heavy.map((a) => [a.id, a.sym]));
  for (const st of stages) {
    const hv = st.atoms.filter((a) => a.sym !== 'H');
    if (hv.length < heavy.length) continue;
    const adjB = new Map(hv.map((a) => [a.idx, new Set()]));
    st.bonds.forEach((b) => { if (adjB.has(b.a) && adjB.has(b.b)) { adjB.get(b.a).add(b.b); adjB.get(b.b).add(b.a); } });
    // pieces of the stage with exactly as many heavy atoms as the fragment
    const seen = new Set();
    for (const a of hv) {
      if (seen.has(a.idx)) continue;
      const comp = [], stack = [a.idx]; seen.add(a.idx);
      while (stack.length) { const x = stack.pop(); comp.push(x); adjB.get(x).forEach((y) => { if (!seen.has(y)) { seen.add(y); stack.push(y); } }); }
      if (comp.length !== heavy.length) continue;
      const symB = new Map(comp.map((i) => [i, st.atoms[i].sym]));
      const order = [], inOrder = new Set([heavy[0].id]), q = [heavy[0].id];
      while (q.length) { const x = q.shift(); order.push(x); adjA.get(x).forEach((y) => { if (!inOrder.has(y)) { inOrder.add(y); q.push(y); } }); }
      if (order.length !== heavy.length) continue;
      const map = new Map(), used = new Set();
      const all = [];
      const rec = (k) => {
        if (k === order.length) { all.push(new Map([...map].map(([x, y]) => [x, [st.atoms[y].x / 44, st.atoms[y].y / 44]]))); return all.length >= 400; }
        const x = order[k];
        for (const y of comp) {
          if (used.has(y) || symB.get(y) !== symA.get(x) || adjB.get(y).size !== adjA.get(x).size) continue;
          let good = true;
          adjA.get(x).forEach((n) => { if (map.has(n) && !adjB.get(y).has(map.get(n))) good = false; });
          if (!good) continue;
          map.set(x, y); used.add(y);
          if (rec(k + 1)) return true;
          map.delete(x); used.delete(y);
        }
        return false;
      };
      rec(0);
      if (all.length) return all;
    }
  }
  return null;
}

// ---------------------------------------------------------------- the compiler
export function compileScene(scene, { draw, orient = {}, coords = [] }) {
  const info = new Map();                  // id -> { s: symbol, sp: species key, st: style }
  const species = new Map();               // key -> { ids:Set, label, style }
  const pos = new Map();                   // id -> [x,y,z] (current)
  let topo = { atoms: [], bonds: [] };     // topology at the end of the previous beat

  const registerSpecies = (sp, P, style) => {
    species.set(sp.key, { ids: new Set(P.atoms.map((a) => a.id)), label: sp.label, style: style || sp.style });
    P.atoms.forEach((a) => { if (!info.has(a.id) || info.get(a.id).sp !== sp.key) info.set(a.id, { s: a.sym, sp: sp.key, st: style || sp.style }); });
  };
  const bounds = () => {
    const ps = [...pos.values()];
    return { maxX: Math.max(...ps.map((p) => p[0])), minX: Math.min(...ps.map((p) => p[0])) };
  };
  const placeFlat = (D, at) => {                       // D = drawn(); at = [minX, centreY]
    const b = bbox(D.pts), cy = (b.minY + b.maxY) / 2;
    const out = new Map();
    D.pts.forEach((p, id) => out.set(id, [p[0] - b.minX + at[0], p[1] - cy + at[1], 0]));
    return out;
  };

  // ---- stage: lay out the starting species
  const surf = scene.stage.surface || null;
  let initial = { atoms: [], bonds: [] };
  const stageDrawn = [];
  scene.stage.species.forEach((sp) => {
    if (sp.at === 'surface') { stageDrawn.push({ sp, surface: true }); return; }
    const D = drawn(sp.smiles, draw);
    normalizePts(D.P, D.pts, orient[sp.key]);
    const placed = placeFlat(D, Array.isArray(sp.at) ? sp.at : [0, 0]);
    placed.forEach((p, id) => pos.set(id, p));
    registerSpecies(sp, D.P);
    initial.atoms.push(...D.P.atoms); initial.bonds.push(...D.P.bonds);
    stageDrawn.push({ sp, D });
  });
  // metal sites: evenly spaced, centred under the stage
  stageDrawn.filter((s) => s.surface).forEach(({ sp }) => {
    const P = parseSmiles(sp.smiles);
    const b = bounds(), cx = (b.minX + b.maxX) / 2;
    const ys = [...pos.values()].map((p) => p[1]);
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const n = P.atoms.length;
    P.atoms.forEach((a, k) => {
      const x = cx + (k - (n - 1) / 2) * 1.6;
      pos.set(a.id, surf && surf.plane === 'y' ? [x, surf.y, 0] : [x, cy, surf ? surf.z : -1.4]);
    });
    registerSpecies(sp, P, 'surface');
    initial.atoms.push(...P.atoms); initial.bonds.push(...P.bonds);
  });
  // topology of the very first state = the stage state (same atoms as the species; bond orders already Kekulé-fixed in `initial`)
  const parseState = (smi, hint) => {
    const P = parseSmiles(smi);
    // aromatic bond orders: take them from a species/atom drawing that has the same pair, else the Kekulé form RDKit gives for this very string
    if (P.bonds.some((b) => b.order === 1.5)) {
      const D = draw(stripMaps(smi));
      const oiOf = new Map(P.atoms.map((a) => [a.id, a.oi]));
      P.bonds.forEach((b) => {
        if (b.order !== 1.5) return;
        const ia = oiOf.get(b.a), ib = oiOf.get(b.b);
        const hit = D.bonds.find(([i, j]) => (i === ia && j === ib) || (i === ib && j === ia));
        b.order = hit ? hit[2] : 1;
      });
    }
    return P;
  };
  topo = parseState(scene.stage.state);

  const snapshot = () => Object.fromEntries([...pos].map(([id, p]) => [id, p.slice()]));
  const stageAtoms = (T) => T.atoms.map((a) => ({ i: a.id, s: a.sym, c: a.charge, h: a.h, sp: (info.get(a.id) || {}).sp, st: (info.get(a.id) || {}).st }));
  const stageBonds = (T) => T.bonds.map((b) => [b.a, b.b, b.order]);

  const out = { id: scene.id, v: 1, stage0: { atoms: stageAtoms(topo), bonds: stageBonds(topo), pos: snapshot() }, surface: surf, beats: [] };

  // ---- beats
  let lastAnchor = null;
  scene.beats.forEach((beat, bi) => {
    const prevIds = new Set(topo.atoms.map((a) => a.id));
    const next = parseState(beat.state);
    const nextIds = new Set(next.atoms.map((a) => a.id));
    // before-state used by the moves: the previous end state plus whatever joins now
    const before = { atoms: topo.atoms.slice(), bonds: topo.bonds.slice() };
    const pos0Added = [];
    let resetOld = null;

    if (beat.reset) {
      // replace the whole stage: survivors keep their xy; each new species is drawn and fitted onto them
      const oldPos = new Map(pos);
      resetOld = Object.fromEntries([...oldPos].map(([id, p]) => [id, p.slice()]));
      pos.clear(); species.clear();
      const newAtoms = [], newBonds = [];
      let cursorX = null;
      beat.reset.species.forEach((sp, k) => {
        const D = drawn(sp.smiles, draw, k);
        const surv = D.P.atoms.filter((a) => oldPos.has(a.id));
        let placed;
        if (surv.length >= 2) {
          const f = fit2D(surv.map((a) => D.pts.get(a.id)), surv.map((a) => [oldPos.get(a.id)[0], oldPos.get(a.id)[1]]));
          placed = new Map([...D.pts].map(([id, p]) => [id, [...f(p[0], p[1]), 0]]));
        } else if (surv.length === 1 && D.P.atoms.length > 1) {
          const a = surv[0], o = oldPos.get(a.id), q = D.pts.get(a.id);
          placed = new Map([...D.pts].map(([id, p]) => [id, [p[0] - q[0] + o[0], p[1] - q[1] + o[1], 0]]));
        } else if (surv.length === 1) {
          const o = oldPos.get(surv[0].id);
          placed = new Map([[surv[0].id, [o[0], o[1], 0]]]);
        } else {
          // nothing survives (the closing summary row): lay the new species out left to right, centred on the origin
          const b = bbox(D.pts);
          if (cursorX === null) cursorX = 0;
          placed = new Map([...D.pts].map(([id, p]) => [id, [p[0] - b.minX + cursorX, p[1] - (b.minY + b.maxY) / 2, 0]]));
          cursorX += (b.maxX - b.minX) + 1.8;
        }
        placed.forEach((p, id) => { pos.set(id, p); pos0Added.push(id); });
        registerSpecies(sp, D.P);
        newAtoms.push(...D.P.atoms); newBonds.push(...D.P.bonds);
      });
      // a lone ion that survived on top of the new drawing (E+ left next to the ring): park it to the right
      beat.reset.species.forEach((sp) => {
        const P = parseSmiles(sp.smiles);
        if (P.atoms.length !== 1) return;
        const id = P.atoms[0].id, p = pos.get(id);
        const near = [...pos].some(([j, q]) => j !== id && Math.hypot(q[0] - p[0], q[1] - p[1]) < 1.4);
        if (near) { const b = bounds(); pos.set(id, [b.maxX + 1.6, 0, 0]); }
      });
      if (!(beat.reset.species.length) || cursorX !== null) {
        // recentre a fresh summary row
        const ps = [...pos.values()];
        const cx = (Math.min(...ps.map((p) => p[0])) + Math.max(...ps.map((p) => p[0]))) / 2;
        [...pos].forEach(([id, p]) => pos.set(id, [p[0] - cx, p[1], p[2]]));
      }
      before.atoms = newAtoms; before.bonds = newBonds;
      // atoms that existed before and vanish with the reset must still be drawn fading out from where they were
      topo.atoms.forEach((a) => { if (!pos.has(a.id)) pos.set(a.id, oldPos.get(a.id) || [0, 0, 0]); });
    } else if (beat.adds && beat.adds.length) {
      beat.adds.forEach((sp) => {
        const D = drawn(sp.smiles, draw);
        normalizePts(D.P, D.pts, orient[sp.key]);
        let at = sp.at;
        if (at === 'auto' || !Array.isArray(at)) { const b = bounds(); at = [b.maxX + 1.5, 0]; }
        const placed = placeFlat(D, at);
        placed.forEach((p, id) => { pos.set(id, p); pos0Added.push(id); });
        registerSpecies(sp, D.P);
        before.atoms.push(...D.P.atoms); before.bonds.push(...D.P.bonds);
      });
    }
    // anything the new state mentions that nobody placed yet is an authoring error
    next.atoms.forEach((a) => { if (!pos.has(a.id)) throw new Error(`scene-compile ${scene.id} ${beat.id}: atom ${a.id} (${a.sym}) has no position`); });
    next.atoms.forEach((a) => { if (!info.has(a.id)) info.set(a.id, { s: a.sym, sp: null, st: 'full' }); });

    const pos0 = snapshot();
    const beforeIds = before.atoms.map((a) => a.id).filter((id) => pos.has(id));
    const segs = [];

    // ---- species lookup for moves: the connected piece (in the before-state) holding most of the species' atoms
    const pieceOfSpecies = (key) => {
      const sp = species.get(key);
      if (!sp) throw new Error(`scene-compile ${scene.id} ${beat.id}: unknown species "${key}"`);
      const present = beforeIds.filter((id) => sp.ids.has(id));
      const comps = components(beforeIds, before.bonds);
      let best = [], score = -1;
      comps.forEach((c) => { const sc = c.filter((id) => sp.ids.has(id)).length; if (sc > score) { score = sc; best = c; } });
      return score > 0 ? best : present;
    };
    // atoms the storyboard cannot name (an unmapped O of H2SO4) travel with the mapped atom they hang on
    const withAnonymous = (ids) => {
      const out = ids.slice(), have = new Set(out);
      for (let k = 0; k < out.length; k++) before.bonds.forEach((b) => { const o = b.a === out[k] ? b.b : b.b === out[k] ? b.a : null; if (o != null && o >= 1000 && !have.has(o) && pos.has(o)) { have.add(o); out.push(o); } });
      return out;
    };
    const targetAtoms = (m) => (m.atoms && !m.species ? withAnonymous(m.atoms.filter((id) => pos.has(id))) : m.species ? pieceOfSpecies(m.species) : []);
    const pushSeg = (m, ids, c, axis, ang, d) => {
      const win = m.at || [0, 0.4];
      const from = {};
      ids.forEach((id) => { from[id] = pos.get(id).slice(); });
      const seg = { at: win, ids: ids.slice(), from, c, axis, ang, d };
      if (m.trail) seg.trail = true;
      // apply
      ids.forEach((id) => pos.set(id, rigidAt(seg, from[id], 1)));
      segs.push(seg);
    };
    const nearPoint = (near) => centroid((Array.isArray(near) ? near : [near]).map((id) => pos.get(id)));

    (beat.moves || []).forEach((m) => {
      if (m.rotate) {
        // group = the atoms attached to m.atoms[0] on its own side of the axis p-q
        const [p, q] = m.rotate.axis;
        const blocked = new Set([p, q]);
        const start = m.atoms[0], grp = [start], seen = new Set([start, ...blocked]);
        for (let k = 0; k < grp.length; k++) before.bonds.forEach((b) => { const o = b.a === grp[k] ? b.b : b.b === grp[k] ? b.a : null; if (o != null && !seen.has(o)) { seen.add(o); grp.push(o); } });
        const ax = unit(sub(pos.get(q), pos.get(p)));
        pushSeg(m, grp, pos.get(p).slice(), ax, (m.rotate.deg * Math.PI) / 180, ZERO);
        return;
      }
      if (m.pairs) {
        const ids = targetAtoms(m);
        const gap = m.gap || ZERO;
        const A = m.pairs.map(([a]) => pos.get(a)), T = m.pairs.map(([, p]) => add(pos.get(p), gap));
        const ca = centroid(A), ct = centroid(T);
        let a = 0, b = 0;
        for (let i = 0; i < A.length; i++) { const u = [A[i][0] - ca[0], A[i][1] - ca[1]], v = [T[i][0] - ct[0], T[i][1] - ct[1]]; a += u[0] * v[0] + u[1] * v[1]; b += u[0] * v[1] - u[1] * v[0]; }
        const ang = A.length > 1 ? Math.atan2(b, a) : 0;
        pushSeg(m, ids, [ca[0], ca[1], 0], [0, 0, 1], ang, [ct[0] - ca[0], ct[1] - ca[1], ct[2] - ca[2]]);
        return;
      }
      if (m.backside) {
        const { of, leaving, attacker, dist } = m.backside;
        const ids = targetAtoms(m);
        if (attacker != null) {
          // the attacker stays; the species turns so that `of` sits between attacker and leaving group, `dist` from the attacker
          const u = unit(sub(pos.get(of), pos.get(attacker)));
          const cur = sub(pos.get(leaving), pos.get(of));
          const ang = Math.atan2(u[1], u[0]) - Math.atan2(cur[1], cur[0]);
          const target = add(pos.get(attacker), mul(u, dist));
          pushSeg(m, ids, pos.get(of).slice(), [0, 0, 1], ang, sub(target, pos.get(of)));
        } else {
          const u = unit(sub(pos.get(of), pos.get(leaving)));
          const target = add(pos.get(of), mul(u, dist));
          pushSeg(m, ids, ZERO, [0, 0, 1], 0, sub(target, pos.get(ids[0])));
        }
        return;
      }
      const ids = targetAtoms(m);
      if (!ids.length) return;
      if (m.by) { pushSeg(m, ids, ZERO, [0, 0, 1], 0, m.by); return; }
      if (m.anchor != null) {
        let axis = [0, 0, 1], ang = 0;
        const c = pos.get(m.anchor).slice();
        if (m.orient) {
          const [oa, ob] = m.orient.atoms;
          const v = unit(sub(pos.get(ob), pos.get(oa))), want = unit(m.orient.dir);
          const k = cross(v, want);
          if (len(k) > 1e-6) { axis = unit(k); ang = Math.acos(Math.max(-1, Math.min(1, dot(v, want)))); }
        }
        const target = add(nearPoint(m.near), m.offset || ZERO);
        pushSeg(m, ids, c, axis, ang, sub(target, c));
      }
    });

    // ---- a bond that forms between atoms that ended up far apart (an H hopping to the other O, a group swinging from B to C): the smaller piece closes the gap
    if (!beat.relayout) {
      const bondsBefore = new Map(before.bonds.map((b) => [b.a < b.b ? `${b.a}-${b.b}` : `${b.b}-${b.a}`, b.order]));
      next.bonds.forEach((b) => {
        const k = b.a < b.b ? `${b.a}-${b.b}` : `${b.b}-${b.a}`;
        if (bondsBefore.has(k) || !pos.has(b.a) || !pos.has(b.b)) return;
        const A = pos.get(b.a), B = pos.get(b.b), L = len(sub(A, B));
        const info1 = info.get(b.a) || {}, info2 = info.get(b.b) || {};
        if (L <= 1.8 || info1.st === 'surface' || info2.st === 'surface') return;
        // the two sides of the new bond, taken without it
        const others = next.bonds.filter((x) => x !== b);
        const side = (start) => { const seen = new Set([start]), q = [start]; for (let i = 0; i < q.length; i++) others.forEach((x) => { const o = x.a === q[i] ? x.b : x.b === q[i] ? x.a : null; if (o != null && !seen.has(o) && pos.has(o)) { seen.add(o); q.push(o); } }); return [...seen]; };
        const sa = side(b.a), sb = side(b.b);
        if (sa.includes(b.b)) return;                                  // a ring closure: the ring is drawn by a relayout
        const [mover, anchor] = sa.length <= sb.length ? [sa, b.a] : [sb, b.b];
        const M = anchor === b.a ? A : B, F = anchor === b.a ? B : A;       // M: the end on the moving piece, F: the end that stays
        const d = sub(add(F, mul(unit(sub(M, F)), 1.1)), M);
        pushSeg({ at: [0.45, 0.9] }, mover, ZERO, [0, 0, 1], 0, d);
      });
      // a new bond that points straight at the viewer (an electrophile sitting right above the ring carbon it bonds to) cannot be seen in a flat view:
      // when the camera looks straight down, the group steps aside, into the free direction round that carbon
      if (((beat.camera && beat.camera.tilt) || 0) < 20) {
        next.bonds.forEach((b) => {
          const k = b.a < b.b ? `${b.a}-${b.b}` : `${b.b}-${b.a}`;
          if (bondsBefore.has(k) || !pos.has(b.a) || !pos.has(b.b)) return;
          const A = pos.get(b.a), B = pos.get(b.b);
          if (Math.hypot(A[0] - B[0], A[1] - B[1]) >= 0.5 || Math.abs(A[2] - B[2]) < 0.4) return;
          const others = next.bonds.filter((x) => x !== b);
          const side = (start) => { const seen = new Set([start]), q = [start]; for (let i = 0; i < q.length; i++) others.forEach((x) => { const o = x.a === q[i] ? x.b : x.b === q[i] ? x.a : null; if (o != null && !seen.has(o) && pos.has(o)) { seen.add(o); q.push(o); } }); return [...seen]; };
          const sa = side(b.a), sb = side(b.b);
          if (sa.includes(b.b)) return;
          const [mover, anchor, fixedId] = sa.length <= sb.length ? [sa, b.a, b.b] : [sb, b.b, b.a];
          const F = pos.get(fixedId), M = pos.get(anchor);
          // free direction round F: the widest gap between its other bonds
          const angs = others.filter((x) => x.a === fixedId || x.b === fixedId).map((x) => { const o = pos.get(x.a === fixedId ? x.b : x.a); return o ? Math.atan2(o[1] - F[1], o[0] - F[0]) : null; }).filter((v) => v != null).sort((p, q) => p - q);
          let dir = -Math.PI / 2;
          if (angs.length) {
            let best = -1;
            angs.forEach((a0, i) => { const a1 = i + 1 < angs.length ? angs[i + 1] : angs[0] + Math.PI * 2; const gap = a1 - a0; const mid = a0 + gap / 2; if (gap > best + 0.15 || (gap > best - 0.15 && Math.sin(mid) < Math.sin(dir) - 1e-6)) { best = Math.max(best, gap); dir = mid; } });
          }
          const target = [F[0] + Math.cos(dir) * 1.0, F[1] + Math.sin(dir) * 1.0, M[2]];
          // the group also turns about the atom it hangs on, so that it points away from the carbon (NO2 with its two O's outermost)
          const rest = mover.filter((id) => id !== anchor).map((id) => pos.get(id));
          let ang = 0;
          if (rest.length) { const cc = centroid(rest); const cur = Math.atan2(cc[1] - M[1], cc[0] - M[0]); ang = dir - cur; }
          pushSeg({ at: [0.3, 0.85] }, mover, M.slice(), [0, 0, 1], ang, sub(target, M));
        });
      }
    }

    // ---- relayout: redraw each piece that holds an anchor atom, fitted onto the anchor atoms' current places
    let relaid = false;
    if (beat.relayout) {
      relaid = true;
      lastAnchor = beat.relayout.anchor;
      const anchors = new Set(beat.relayout.anchor);
      const to = {}, from = {}, ids = [];
      splitDots(beat.state).forEach((frag) => {
        const D = drawn(frag, draw);
        const hit = D.P.atoms.filter((a) => anchors.has(a.id));
        if (!hit.length) return;
        // the curated drawing in coords.json, when this fragment is the same molecule as one of the stages: heavy atoms take its positions exactly,
        // explicit H atoms ride along on the RDKit drawing fitted onto it
        const options = bindCoords(D.P, coords);
        let place = (id) => D.pts.get(id);
        if (options) {
          // equivalent atoms (the CH2 groups of a ring) can be matched in several ways: take the one that moves the atoms least
          let best = null;
          options.forEach((bound) => {
            const heavy = D.P.atoms.filter((a) => bound.has(a.id));
            const f0 = fit2D(heavy.map((a) => bound.get(a.id)), heavy.map((a) => [pos.get(a.id)[0], pos.get(a.id)[1]]));
            const err = heavy.reduce((e, a) => { const q = f0(bound.get(a.id)[0], bound.get(a.id)[1]), o = pos.get(a.id); return e + (q[0] - o[0]) ** 2 + (q[1] - o[1]) ** 2; }, 0);
            if (!best || err < best.err - 1e-9) best = { bound, heavy, err };
          });
          const { bound, heavy } = best;
          const g = fit2D(heavy.map((a) => D.pts.get(a.id)), heavy.map((a) => bound.get(a.id)));
          place = (id) => (bound.has(id) ? bound.get(id) : g(D.pts.get(id)[0], D.pts.get(id)[1]));
        }
        let f;
        if (hit.length >= 2) f = fit2D(hit.map((a) => place(a.id)), hit.map((a) => [pos.get(a.id)[0], pos.get(a.id)[1]]));
        else { const a = hit[0], q = place(a.id), o = pos.get(a.id); f = (x, y) => [x - q[0] + o[0], y - q[1] + o[1]]; }
        D.P.atoms.forEach((a) => {
          const p = place(a.id), xy = f(p[0], p[1]);
          const z = beat.pose && beat.pose[a.id] != null ? beat.pose[a.id] : 0;
          ids.push(a.id); from[a.id] = pos.get(a.id).slice(); to[a.id] = [xy[0], xy[1], z];
        });
      });
      // the other pieces on stage are redrawn too (a stretched bond from a mid-way move is tidied), fitted onto where they are, then kept clear of the main drawing
      const anchorIds = new Set(ids);
      const piece = [];
      splitDots(beat.state).forEach((frag) => {
        const D = drawn(frag, draw);
        if (D.P.atoms.some((a) => anchorIds.has(a.id)) || D.P.atoms.some((a) => (info.get(a.id) || {}).st === 'surface')) return;
        const f = fit2D(D.P.atoms.map((a) => D.pts.get(a.id)), D.P.atoms.map((a) => [pos.get(a.id)[0], pos.get(a.id)[1]]));
        const pts = new Map(D.P.atoms.map((a) => [a.id, f(...D.pts.get(a.id))]));
        piece.push({ atoms: D.P.atoms, pts });
      });
      const box = (pts) => { const v = [...pts.values()]; return { x0: Math.min(...v.map((p) => p[0])), x1: Math.max(...v.map((p) => p[0])), y0: Math.min(...v.map((p) => p[1])), y1: Math.max(...v.map((p) => p[1])) }; };
      const mainPts = new Map(ids.map((id) => [id, to[id]]));
      let placed = ids.length ? [box(mainPts)] : [];
      piece.forEach((pc) => {
        let bx = box(pc.pts);
        const clash = (a, b) => a.x0 < b.x1 + 0.9 && b.x0 < a.x1 + 0.9 && a.y0 < b.y1 + 0.9 && b.y0 < a.y1 + 0.9;
        if (placed.some((q) => clash(bx, q))) {
          const right = Math.max(...placed.map((q) => q.x1)), mid = placed.length ? (placed[0].y0 + placed[0].y1) / 2 : 0;
          const dx = right + 1.8 - bx.x0, dy = mid - (bx.y0 + bx.y1) / 2;
          pc.pts.forEach((p, id) => pc.pts.set(id, [p[0] + dx, p[1] + dy]));
          bx = box(pc.pts);
        }
        placed.push(bx);
        pc.atoms.forEach((a) => { const xy = pc.pts.get(a.id); ids.push(a.id); from[a.id] = pos.get(a.id).slice(); to[a.id] = [xy[0], xy[1], beat.pose && beat.pose[a.id] != null ? beat.pose[a.id] : 0]; });
      });
      if (ids.length) {
        segs.push({ at: [0.4, 1], ids, from, to, relayout: true });
        ids.forEach((id) => pos.set(id, to[id].slice()));
      }
    }

    // ---- ghosts
    const ghosts = [];
    (beat.ghosts || []).forEach((g) => {
      if (g.mirror) {
        const anchorIds = (beat.relayout && beat.relayout.anchor) || lastAnchor || [];
        const comps = components(next.atoms.map((a) => a.id), next.bonds);
        const comp = comps.find((c) => anchorIds.some((a) => c.includes(a))) || comps.sort((p, q) => q.length - p.length)[0];
        const xs = comp.map((id) => pos.get(id)[0]);
        const xl = Math.max(...xs) + 0.8;
        const set = new Set(comp);
        // the mirror image takes the room to the right of the product: whatever else sits there steps aside
        const mx0 = xl + 0.8 - 0.4, mx1 = xl + (xl - Math.min(...xs)) + 0.4;
        const rest = comps.filter((c) => c !== comp && !c.some((id) => (info.get(id) || {}).st === 'surface'));
        const rx0 = Math.min(Infinity, ...rest.flat().map((id) => pos.get(id)[0]));
        if (rest.length && rx0 < mx1 + 0.6) {
          const dx = mx1 + 1.8 - rx0, ids = rest.flat();
          pushSeg({ at: [0, 0.4] }, ids, ZERO, [0, 0, 1], 0, [dx, 0, 0]);
        }
        ghosts.push({ k: 'mirror', label: g.label, atoms: next.atoms.filter((a) => set.has(a.id)).map((a) => ({ i: a.id, s: a.sym, c: a.charge, h: a.h })), bonds: next.bonds.filter((b) => set.has(b.a) && set.has(b.b)).map((b) => [b.a, b.b, b.order]), pos: Object.fromEntries(comp.map((id) => { const p = pos.get(id); return [id, [2 * xl - p[0], p[1], p[2]]]; })) });
      } else if (g.smiles) {
        const D = drawn(g.smiles, draw);
        normalizePts(D.P, D.pts, null);
        const b = bbox(D.pts), cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
        ghosts.push({ k: 'mini', label: g.label, atoms: D.P.atoms.map((a) => ({ i: a.id, s: a.sym, c: a.charge, h: a.h })), bonds: D.P.bonds.map((x) => [x.a, x.b, x.order]), pos: Object.fromEntries(D.P.atoms.map((a) => [a.id, [D.pts.get(a.id)[0] - cx, D.pts.get(a.id)[1] - cy, 0]])) });
      } else if (g.atoms) {
        ghosts.push({ k: 'atoms', label: g.label, ids: g.atoms.slice(), atoms: g.atoms.map((id) => { const a = next.atoms.find((x) => x.id === id) || { sym: (info.get(id) || {}).s, charge: 0, h: 0 }; return { i: id, s: a.sym || (info.get(id) || {}).s, c: a.charge, h: a.h }; }), pos: Object.fromEntries(g.atoms.map((id) => [id, add(pos.get(id), g.offset || ZERO)])) });
      }
    });

    // ---- labels of intact species
    const labels = [];
    const comps = components(next.atoms.map((a) => a.id), next.bonds);
    species.forEach((sp) => {
      if (!sp.label) return;
      const comp = comps.find((c) => c.length === sp.ids.size && c.every((id) => sp.ids.has(id)));
      if (comp && comp.length > 1) labels.push({ text: sp.label, ids: comp });
    });

    // ---- resonance forms (same atoms and sigma skeleton as the picture; topology only, positions come from the frame)
    const forms = (beat.forms || []).map((smi) => {
      const P = parseState(smi);
      return { atoms: P.atoms.map((a) => ({ i: a.id, s: a.sym, c: a.charge, h: a.h })), bonds: P.bonds.map((b) => [b.a, b.b, b.order]) };
    });

    const removed = [...prevIds].filter((id) => !nextIds.has(id));
    const added = next.atoms.map((a) => a.id).filter((id) => !prevIds.has(id));
    const entry = {
      id: beat.id,
      atoms: stageAtoms(next), bonds: stageBonds(next),
      pos0: Object.fromEntries([...new Set([...beforeIds, ...next.atoms.map((a) => a.id), ...removed])].filter((id) => pos0[id]).map((id) => [id, pos0[id]])),
      segs, pos1: Object.fromEntries([...new Set([...beforeIds, ...next.atoms.map((a) => a.id), ...removed])].filter((id) => pos.has(id)).map((id) => [id, pos.get(id).slice()])),
      removed, added, labels, ghosts, forms, relaid, reset: !!beat.reset
    };
    if (resetOld) entry.posOld = resetOld;
    out.beats.push(entry);
    // atoms that left the picture stop existing for the next beat
    removed.forEach((id) => pos.delete(id));
    topo = next;
  });
  return roundDeep(out);
}

export function roundDeep(v) {
  if (typeof v === 'number') return Math.round(v * 1000) / 1000;
  if (Array.isArray(v)) return v.map(roundDeep);
  if (v && typeof v === 'object') { const o = {}; Object.keys(v).forEach((k) => { o[k] = roundDeep(v[k]); }); return o; }
  return v;
}
