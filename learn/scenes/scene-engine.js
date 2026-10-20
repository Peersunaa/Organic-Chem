// Mechanism scene renderer. Pure functions, no DOM: (scene storyboard, layout, time t, options) -> SVG string.
//
//   renderScene(scene, layout, t, { layer: 'both' | 'arrows' | 'orbitals', static: false, caveman: false }) -> '<svg viewBox="0 0 640 400">...</svg>'
//
// `scene` is scenes/scenes/<id>.json (beats: timing, arrows, orbitals, badges, camera, captions); `layout` is scenes/layouts/<id>.json, written by
// build-layouts.mjs from the same storyboard: per beat the topology at the END of the beat, the start positions, and the motions (rigid segments,
// relayout tweens) that take the atoms from start to end. A frame is a pure function of t: find the beat, take progress p (house ease on the motion
// window, p = 1 during the hold), play the motions to p, draw the atoms and bonds of the start and the end state with their own fades, then the
// glyph layers on top. Scrubbing and Back / Next need no history.
//
// Colour meaning (CSS tokens only): amber --electron = electrons, teal --accent = nucleophile / electron-rich / minus, coral --bad = electrophile /
// electron-poor / plus / empty orbitals. A new bond fades in with an amber glow, a breaking bond fades out; nothing teleports.
import * as G from './glyphs.js';
import { rigidAt } from './scene-compile.js';
import { curve } from '../engine/widgets/arrow-core.js';
import { lonePairAngles } from '../engine/widgets/lewis-core.js';
import { compress } from '../engine/voice.js';
import { lpOf } from './scene-parse.js';

export const W = 640, H = 400, SC = 64;

// ------------------------------------------------------------------ small numeric helpers
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const f1 = (v) => String(Math.round(v * 10) / 10);
const smooth = (p, a, b) => { const u = clamp((p - a) / (b - a || 1)); return u * u * (3 - 2 * u); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MINUS = '−';

/** The house ease, cubic-bezier(.4, 0, .2, 1). */
export function ease(x) {
  x = clamp(x);
  if (x === 0 || x === 1) return x;
  const x1 = 0.4, y1 = 0, x2 = 0.2, y2 = 1;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const e = ((ax * t + bx) * t + cx) * t - x;
    const d = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
    t -= e / d;
  }
  t = clamp(t);
  return ((ay * t + by) * t + cy) * t;
}

// ------------------------------------------------------------------ timing
export const beatStart = (scene, i) => scene.beats[i].t0;
export const beatEnd = (scene, i) => scene.beats[i].t1 + scene.beats[i].hold;
export const sceneDuration = (scene) => { const b = scene.beats[scene.beats.length - 1]; return b.t1 + b.hold; };

/** Which beat is on screen at time t, and how far its motion has got (p, eased). Between t1 and the next t0 (the hold) p stays 1. */
export function beatAt(scene, t) {
  const bs = scene.beats;
  if (!(t > bs[0].t0)) return { i: 0, p: 0, raw: 0 };
  for (let i = bs.length - 1; i >= 0; i--) {
    if (t >= bs[i].t0) {
      const raw = clamp((t - bs[i].t0) / (bs[i].t1 - bs[i].t0));
      return { i, p: ease(raw), raw };
    }
  }
  return { i: 0, p: 0, raw: 0 };
}

// ------------------------------------------------------------------ captions
/** The caption of beat i: the ORBITALS wording when that layer is the only one on and the beat has one; the caveman squeeze when caveman is on. */
export function captionFor(scene, i, opts = {}) {
  const b = scene.beats[i];
  const text = opts.layer === 'orbitals' && b.captionOrbitals ? b.captionOrbitals : b.caption;
  return opts.caveman ? compress(text) : text;
}
/** The `why` lines of the arrows of beat i that have started by progress p (all of them when static). */
export function whyLines(scene, i, p, opts = {}) {
  return (scene.beats[i].arrows || []).filter((a) => opts.static || p >= a.at[0]).map((a) => (opts.caveman ? compress(a.why) : a.why));
}

// ------------------------------------------------------------------ motion: atom positions at progress p
function arcOffset(seg, from, u) {
  // moving species travel along a gentle curve: a sideways bow of 12 % of the distance, peaking half way
  if (seg.relayout || seg.ang) return null;
  const d = seg.d, dist = Math.hypot(d[0], d[1]);
  if (dist < 0.9) return null;
  return [(-d[1] / dist) * dist * 0.12 * Math.sin(Math.PI * u), (d[0] / dist) * dist * 0.12 * Math.sin(Math.PI * u), 0];
}
/** Map id -> [x, y, z] (layout units) of every atom of beat `lb` at progress p. */
export function posAt(lb, p) {
  const out = {};
  for (const id in lb.pos0) out[id] = lb.pos0[id];
  for (const seg of lb.segs) {
    const u = ease((p - seg.at[0]) / (seg.at[1] - seg.at[0]));
    if (u <= 0) continue;
    for (const id of seg.ids) {
      if (seg.relayout) { const a = seg.from[id], b = seg.to[id]; out[id] = [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]; } else {
        const q = rigidAt(seg, seg.from[id], u), arc = arcOffset(seg, seg.from[id], u);
        out[id] = arc ? [q[0] + arc[0], q[1] + arc[1], q[2]] : q;
      }
    }
  }
  return out;
}
/** Segments that are still moving or have just stopped, for the dotted motion trails. */
const trailSegs = (lb) => lb.segs.filter((s) => s.trail);

// ------------------------------------------------------------------ camera
/** The storyboards' zoom values are for a 64 px bond; on a 400 px phone that is small, so every beat is drawn half as large again (never beyond what fits). */
const ZOOM_BOOST = 1.5;
const camCache = new WeakMap();
function structMap(atoms) { const m = new Map(); atoms.forEach((a) => m.set(a.i, a)); return m; }
/** Camera at the END of beat i: { k, fx, fy, tilt (radians), cx, cy }, from the storyboard's camera {zoom, focus, tilt}, fitted so the picture is not cut off. */
function camEnd(scene, layout, i) {
  let arr = camCache.get(layout);
  if (!arr) { arr = []; camCache.set(layout, arr); }
  if (arr[i]) return arr[i];
  const b = scene.beats[i], lb = layout.beats[i];
  const c = b.camera || { zoom: 1, focus: [], tilt: 0 };
  const tilt = ((c.tilt || 0) * Math.PI) / 180, ct = Math.cos(tilt), st = Math.sin(tilt);
  const P = lb.pos1;
  const ids = lb.atoms.map((a) => a.i).filter((id) => P[id]);
  const focus = (c.focus || []).filter((id) => P[id]);
  const mirror = (lb.ghosts || []).filter((g) => g.k === 'mirror');
  const ext = ids.map((id) => P[id]).concat(...mirror.map((g) => Object.values(g.pos)));
  const hasForms = (lb.forms || []).length > 0;
  const hasMini = (lb.ghosts || []).some((g) => g.k === 'mini');
  const x0 = 0, x1 = hasMini ? 428 : W, y0 = hasForms ? 100 : 0, y1 = H;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, margin = 58;
  // (1) the whole stage: centred on its bounding box (in screen terms), as big as fits
  const xs = ext.map((p) => p[0]), pys = ext.map((p) => p[1] * ct - p[2] * st);
  const bx = (Math.min(...xs) + Math.max(...xs)) / 2, by = (Math.min(...pys) + Math.max(...pys)) / 2;
  const hxA = Math.max(0.2, ...ext.map((p) => Math.abs(SC * (p[0] - bx)))), hyA = Math.max(0.2, ...pys.map((q) => Math.abs(SC * (q - by))));
  const kAll = Math.min(((x1 - x0) / 2 - margin) / hxA, ((y1 - y0) / 2 - margin) / hyA);
  // (2) the stage is too big to show whole: keep what the storyboard focuses on in view, with the pieces it belongs to and anything within 4 bonds of it;
  //     far-off spectators (a spare ion on the right) may leave the picture
  let fx, fy, kfit = kAll;
  if (kAll >= 0.75 || !focus.length) { fx = bx; fy = by / ct; } else {
    const fc = focus.map((id) => P[id]);
    const gx = fc.reduce((s, p) => s + p[0], 0) / fc.length, gy = fc.reduce((s, p) => s + p[1], 0) / fc.length;
    const adj = new Map(ids.map((id) => [id, []]));
    lb.bonds.forEach(([x, y]) => { if (adj.has(x) && adj.has(y)) { adj.get(x).push(y); adj.get(y).push(x); } });
    const keep = new Set(focus), stack = [...focus];
    while (stack.length) { const x = stack.pop(); adj.get(x).forEach((y) => { if (!keep.has(y)) { keep.add(y); stack.push(y); } }); }
    ids.forEach((id) => { if (Math.hypot(P[id][0] - gx, P[id][1] - gy) < 4) keep.add(id); });
    const use = [...keep].map((id) => P[id]);
    const ux = use.map((p) => p[0]), uy = use.map((p) => p[1] * ct - p[2] * st);
    fx = (Math.min(...ux) + Math.max(...ux)) / 2; fy = ((Math.min(...uy) + Math.max(...uy)) / 2) / ct;
    const hx = Math.max(0.2, ...use.map((p) => Math.abs(SC * (p[0] - fx)))), hy = Math.max(0.2, ...use.map((p) => Math.abs(SC * ((p[1] - fy) * ct - p[2] * st))));
    kfit = Math.min(((x1 - x0) / 2 - margin) / hx, ((y1 - y0) / 2 - margin) / hy);
  }
  const k = Math.max(0.3, Math.min((c.zoom || 1) * ZOOM_BOOST, kfit));
  return (arr[i] = { k, fx, fy, tilt, cx, cy, kfit, mode: kAll >= 0.75 || !focus.length ? 'all' : 'focus' });
}
/** The camera at the end of beat i (k, fx, fy, tilt, mode 'all' = the whole stage is in view, 'focus' = the storyboard's focus atoms are). */
export const cameraOf = (scene, layout, i) => camEnd(scene, layout, i);
const camAt = (scene, layout, i, p) => {
  const b = camEnd(scene, layout, i), a = i > 0 ? camEnd(scene, layout, i - 1) : b;
  const u = ease(p / 0.5);
  return { k: lerp(a.k, b.k, u), fx: lerp(a.fx, b.fx, u), fy: lerp(a.fy, b.fy, u), tilt: lerp(a.tilt, b.tilt, u), cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u) };
};
const projector = (cam) => {
  const s = SC * cam.k, ct = Math.cos(cam.tilt), st = Math.sin(cam.tilt);
  return (P) => [cam.cx + s * (P[0] - cam.fx), cam.cy + s * ((P[1] - cam.fy) * ct - P[2] * st)];
};

// ------------------------------------------------------------------ atoms: labels and shapes
const LP_ATOMS = new Set(['O', 'N', 'Br', 'Cl', 'F', 'I', 'S']);
const labelled = (a, nb) => a.s === 'H' || (a.s === 'C' ? (a.st === 'full' || nb === 0) : a.s !== 'Pd');
const rOf = (a, lab) => (a.s === 'H' ? 10 : lab ? 14 : 6);

/** Atom text: the symbol, then its H and the count as a subscript, on the free side of the atom: right (OH, NH2, CH3), else left, above or below, whichever is
 *  farthest from the bonds. `dirs` = the directions (radians, screen) of the atom's bonds. */
function labelSvg(a, x, y, dirs, fs, op) {
  const sym = a.s, h = a.h || 0;
  const fsH = fs * 0.82;
  const symW = fs * 0.62 * sym.length;
  const base = y + fs * 0.34;
  let out = `<text x="${f1(x)}" y="${f1(base)}" text-anchor="middle" font-size="${fs}" font-weight="${sym === 'H' ? 500 : 700}" fill="var(--ink)">${esc(sym)}</text>`;
  if (h > 0 && sym !== 'H') {
    const sub = h > 1 ? `<tspan dy="${f1(fs * 0.22)}" font-size="${f1(fsH * 0.75)}">${h}</tspan>` : '';
    const sep = (t) => (dirs.length ? Math.min(...dirs.map((d) => { const z = Math.abs(t - d) % (Math.PI * 2); return z > Math.PI ? Math.PI * 2 - z : z; })) : Math.PI);
    const slots = [['r', 0, 0.45], ['l', Math.PI, 0.1], ['u', -Math.PI / 2, 0.05], ['d', Math.PI / 2, 0]];
    let best = slots[0], bs = -1;
    slots.forEach((sl) => { const sc = sep(sl[1]) + sl[2]; if (sc > bs) { bs = sc; best = sl; } });
    const k = best[0];
    if (k === 'r') out += `<text x="${f1(x + symW / 2 + 1)}" y="${f1(base)}" text-anchor="start" font-size="${f1(fsH)}" font-weight="600" fill="var(--ink)">H${sub}</text>`;
    else if (k === 'l') out += `<text x="${f1(x - symW / 2 - 1)}" y="${f1(base)}" text-anchor="end" font-size="${f1(fsH)}" font-weight="600" fill="var(--ink)">H${sub}</text>`;
    else out += `<text x="${f1(x)}" y="${f1(base + (k === 'u' ? -fs * 0.95 : fs * 0.95))}" text-anchor="middle" font-size="${f1(fsH)}" font-weight="600" fill="var(--ink)">H${sub}</text>`;
  }
  return op >= 0.999 ? out : `<g opacity="${f1(op * 100) / 100}">${out}</g>`;
}
/** Circled + (coral) or circled − (teal): the glyph carries the meaning, not only the colour. */
function chargeSvg(x, y, q, s = 1) {
  if (!q) return '';
  const col = q > 0 ? 'var(--bad)' : 'var(--accent)';
  const n = Math.abs(q);
  const r = (n > 1 ? 9.5 : 7.5) * s;
  const txt = n > 1 ? `${n}${q > 0 ? '+' : MINUS}` : q > 0 ? '+' : MINUS;
  return `<g class="ms-chg"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="var(--surface)" fill-opacity=".85" stroke="${col}" stroke-width="2"/>` +
    `<text x="${f1(x)}" y="${f1(y + (n > 1 ? 4 : 4.6) * s)}" text-anchor="middle" font-size="${f1((n > 1 ? 10.5 : 13) * s)}" font-weight="700" fill="${col}">${txt}</text></g>`;
}

// ------------------------------------------------------------------ bonds
const OFFS = { 1: [0], 2: [-3.4, 3.4], 3: [-5.2, 0, 5.2] };
function lineSvg(x1, y1, x2, y2, o, w, extra = '') {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return `<line x1="${f1(x1 + nx * o)}" y1="${f1(y1 + ny * o)}" x2="${f1(x2 + nx * o)}" y2="${f1(y2 + ny * o)}" stroke-width="${w}" ${extra}/>`;
}
/** The lines of a bond whose order goes o0 -> o1 as w goes 0 -> 1: lines that stay slide into place, new lines fade in, old ones fade out. */
function bondLines(x1, y1, x2, y2, o0, o1, w, opts = {}) {
  const { colour = 'var(--ink)', width = 2.5, dash = '', op = 1 } = opts;
  const parts = [];
  const a = Math.max(o0, 0), b = Math.max(o1, 0);
  const oa = OFFS[clamp(Math.round(a), 1, 3)], ob = OFFS[clamp(Math.round(b), 1, 3)];
  const n = Math.max(a, b);
  for (let i = 0; i < n; i++) {
    let off, vis;
    if (i < a && i < b) { off = lerp(oa[i], ob[i], w); vis = 1; } else if (i < b) { off = ob[i]; vis = w; } else { off = oa[i]; vis = 1 - w; }
    if (vis <= 0.01) continue;
    parts.push(lineSvg(x1, y1, x2, y2, off, width, `stroke="${colour}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''} stroke-opacity="${f1(vis * op * 100) / 100}"`));
  }
  return parts.join('');
}
const shorten = (x1, y1, x2, y2, g1, g2) => {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const a = Math.min(g1, L * 0.45), b = Math.min(g2, L * 0.45);
  return [x1 + (dx / L) * a, y1 + (dy / L) * a, x2 - (dx / L) * b, y2 - (dy / L) * b];
};
function wedgeSvg(x1, y1, x2, y2, hashed) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  if (!hashed) return `<polygon points="${f1(x1)},${f1(y1)} ${f1(x2 + nx * 6)},${f1(y2 + ny * 6)} ${f1(x2 - nx * 6)},${f1(y2 - ny * 6)}" fill="var(--ink)"/>`;
  let s = '';
  for (let k = 1; k <= 5; k++) { const t = k / 5.5, cx = x1 + dx * t, cy = y1 + dy * t, hw = 1 + 5 * t; s += `<line x1="${f1(cx + nx * hw)}" y1="${f1(cy + ny * hw)}" x2="${f1(cx - nx * hw)}" y2="${f1(cy - ny * hw)}" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round"/>`; }
  return s;
}

// ------------------------------------------------------------------ static structures (mirror ghost, mini ghosts, resonance forms)
/** A finished drawing of atoms/bonds at screen positions S (id -> [X, Y]): used for pictures that do not animate. fs = atom label size. */
function structSvg(atoms, bonds, S, { fs = 22, op = 1, wBond = 2.5 } = {}) {
  const A = structMap(atoms);
  const deg = new Map(); const dirs = new Map();
  const addDir = (id, v) => { if (!dirs.has(id)) dirs.set(id, []); dirs.get(id).push(v); };
  bonds.forEach(([a, b]) => {
    if (!S[a] || !S[b]) return;
    deg.set(a, (deg.get(a) || 0) + 1); deg.set(b, (deg.get(b) || 0) + 1);
    const d = [S[b][0] - S[a][0], S[b][1] - S[a][1]], L = Math.hypot(d[0], d[1]) || 1;
    addDir(a, Math.atan2(d[1], d[0])); addDir(b, Math.atan2(-d[1], -d[0]));
  });
  const gap = (id) => { const a = A.get(id); return labelled(a, deg.get(id) || 0) ? fs * 0.62 : 0; };
  let out = '';
  bonds.forEach(([a, b, o]) => {
    if (!S[a] || !S[b]) return;
    const [x1, y1, x2, y2] = shorten(S[a][0], S[a][1], S[b][0], S[b][1], gap(a), gap(b));
    out += bondLines(x1, y1, x2, y2, o, o, 1, { width: wBond });
  });
  atoms.forEach((a) => {
    const p = S[a.i]; if (!p) return;
    if (labelled(a, deg.get(a.i) || 0)) out += labelSvg(a, p[0], p[1], dirs.get(a.i) || [], fs, 1);
    if (a.c) out += chargeSvg(p[0] + fs * 0.7, p[1] - fs * 0.7, a.c, fs / 22);
  });
  return `<g opacity="${op}">${out}</g>`;
}

// ------------------------------------------------------------------ orbitals
const EMPH = { focus: 1, normal: 0.62, ghost: 0.26 };
const lobePath = (L, Wd) => `M0 0C${f1(L * 0.28)} ${f1(-Wd * 1.35)} ${f1(L * 1.02)} ${f1(-Wd * 1.1)} ${f1(L)} 0C${f1(L * 1.02)} ${f1(Wd * 1.1)} ${f1(L * 0.28)} ${f1(Wd * 1.35)} 0 0Z`;
const dotSvg = (x, y, r = 3) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="var(--electron)" stroke="var(--ink)" stroke-opacity=".3" stroke-width="1"/>`;
const faceOf = (side) => (side === 'top' ? [1] : side === 'bottom' ? [-1] : [1, -1]);

/** One ORBITALS glyph at the current frame. ctx: { S(id), P(id) 3D, cam, atoms: Map id -> atom }. */
function orbitalSvg(o, ctx) {
  const { S, cam } = ctx;
  const st = Math.sin(cam.tilt), ct = Math.cos(cam.tilt), k = cam.k;
  const have = o.atoms.every((id) => S(id));
  if (!have) return '';
  const lab = (x, y) => (o.label ? `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-size="14" font-weight="600" fill="var(--muted)">${esc(o.label)}</text>` : '');
  const dash = o.emphasis === 'ghost' ? 'stroke-dasharray="6 5"' : '';
  switch (o.kind) {
    case 'pi': {
      if (o.atoms.length === 2) {
        const [a, b] = o.atoms.map(S);
        if (o.plane === 'y' || cam.tilt < 0.2) return `<g class="ms-orb" opacity="${EMPH[o.emphasis]}">${G.piCloud(a[0], a[1], b[0], b[1], { side: o.side, color: 'electron' })}${o.electrons === 2 ? faceOf(o.side).map((s) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; return dotSvg(mx, my - s * 14, 3); }).join('') : ''}${lab((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 36)}</g>`;
        const off = Math.max(14, 0.6 * SC * k * st), ry = clamp(Math.hypot(0.55 * st, 0.35 * ct) * SC * k, 11, 24);
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
        const fold = ang > 90 ? ang - 180 : ang <= -90 ? ang + 180 : ang;
        const rx = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2 + 11;
        const lobes = faceOf(o.side).map((s) => `<ellipse cx="${f1(mx)}" cy="${f1(my - s * off)}" rx="${f1(rx)}" ry="${f1(ry)}" transform="rotate(${f1(fold)} ${f1(mx)} ${f1(my - s * off)})" fill="var(--electron)" fill-opacity=".2" stroke="var(--electron)" stroke-width="2" stroke-opacity=".8" ${dash}/>${o.electrons === 2 ? dotSvg(mx, my - s * off, 3) : ''}`).join('');
        return `<g class="ms-orb" opacity="${EMPH[o.emphasis]}">${lobes}${lab(mx, my - off - ry - 8)}</g>`;
      }
      // a conjugated cloud: one soft lobe per atom, neighbours overlapping
      const pts = o.atoms.map(S);
      const r = 0.46 * SC * k;
      const lobes = (cam.tilt < 0.2 ? [0] : faceOf(o.side)).map((s) => pts.map((p, i) => {
        const y = p[1] - s * 0.6 * SC * k * st;
        return `<ellipse cx="${f1(p[0])}" cy="${f1(y)}" rx="${f1(r)}" ry="${f1(Math.max(r * 0.55, r * Math.hypot(ct, 0.4)))}" fill="var(--electron)" fill-opacity=".14" stroke="var(--electron)" stroke-opacity=".45" stroke-width="2" ${dash}/>`;
      }).join('')).join('');
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = Math.min(...pts.map((p) => p[1]));
      return `<g class="ms-orb" opacity="${EMPH[o.emphasis]}">${lobes}${lab(cx, cy - 0.6 * SC * k * Math.max(st, 0.4) - 24)}</g>`;
    }
    case 'p-empty': {
      const [x, y] = S(o.atoms[0]);
      const inPlane = o.plane === 'y';
      let body;
      if (inPlane) {
        // the lobes lie in the molecular plane, perpendicular to the bond
        const nb = ctx.nbrs(o.atoms[0]).map((id) => S(id)).filter(Boolean);
        const ang = nb.length ? Math.atan2(nb[0][1] - y, nb[0][0] - x) * 180 / Math.PI + 90 : -90;
        body = G.pOrbital(x, y, ang, { empty: true, color: 'bad', size: clamp(k, 0.8, 1.4) });
      } else if (cam.tilt < 0.2) {
        body = `<circle cx="${f1(x - 3)}" cy="${f1(y - 3)}" r="${f1(0.5 * SC * k)}" fill="var(--bad)" fill-opacity=".08" stroke="var(--bad)" stroke-width="2" stroke-dasharray="5 4"/>`;
      } else {
        const only = o.side === 'top' ? 'up' : o.side === 'bottom' ? 'down' : null;
        body = G.pOrbital(x, y, -90, { empty: true, color: 'bad', size: clamp(k, 0.8, 1.4) });
        if (only) body = `<g style="clip-path:inset(${only === 'up' ? '0 0 50% 0' : '50% 0 0 0'})">${body}</g>`;
      }
      return `<g class="ms-orb" opacity="${EMPH[o.emphasis]}" ${dash}>${body}${lab(x, y - 0.6 * SC * k * Math.max(st, 0.55) - 26)}</g>`;
    }
    case 'lone-pair': {
      const [x, y] = S(o.atoms[0]);
      if (o.plane === 'z') return `<g class="ms-orb" opacity="${EMPH[o.emphasis]}">${G.pOrbital(x, y, -90, { color: 'electron', size: clamp(k, 0.8, 1.3) })}${dotSvg(x, y - 20)}${dotSvg(x, y + 20)}${lab(x, y - 52)}</g>`;
      let ang;
      if (o.toward != null && S(o.toward)) { const q = S(o.toward); ang = Math.atan2(q[1] - y, q[0] - x); } else if (o.away != null && S(o.away)) { const q = S(o.away); ang = Math.atan2(y - q[1], x - q[0]); } else {
        const nb = ctx.nbrs(o.atoms[0]).map((id) => S(id)).filter(Boolean).map((q) => Math.atan2(q[1] - y, q[0] - x));
        ang = lonePairAngles(nb, 1)[0] ?? -Math.PI / 2;
      }
      const L = 0.7 * SC * k * 0.8, d = (ang * 180) / Math.PI, r0 = o.away != null ? 6 : 15;
      const dx = Math.cos(ang), dy = Math.sin(ang);
      return `<g class="ms-orb" opacity="${EMPH[o.emphasis]}"><g transform="translate(${f1(x + dx * r0)} ${f1(y + dy * r0)}) rotate(${f1(d)})"><path d="${lobePath(L, 11)}" fill="var(--electron)" fill-opacity=".22" stroke="var(--electron)" stroke-opacity=".6" stroke-width="2"/></g>${dotSvg(x + dx * (r0 + L * 0.5) - dy * 4, y + dy * (r0 + L * 0.5) + dx * 4)}${dotSvg(x + dx * (r0 + L * 0.5) + dy * 4, y + dy * (r0 + L * 0.5) - dx * 4)}${lab(x + dx * (r0 + L) , y + dy * (r0 + L) - 14)}</g>`;
    }
    case 'sigma-star': {
      const a = S(o.axis[0]), b = S(o.axis[1]);
      return `<g class="ms-orb" opacity="${EMPH[o.emphasis]}">${G.sigmaStar(a[0], a[1], b[0], b[1], { size: clamp(k, 0.8, 1.3) })}${lab((a[0] * 2 - b[0] + a[0]) / 2, a[1] - 26)}</g>`;
    }
    case 'bromonium': {
      const [a, b, c] = o.atoms.map(S);
      return `<g class="ms-orb" opacity="${EMPH[o.emphasis]}">${G.bromonium(a[0], a[1], b[0], b[1], c[0], c[1], { color: 'bad' })}</g>`;
    }
    case 'aromatic': {
      const pts = o.atoms.map(S);
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const r = pts.reduce((s, p) => s + Math.hypot(p[0] - cx, p[1] - cy), 0) / pts.length * 0.72;
      const faces = cam.tilt < 0.2 ? [0] : faceOf(o.side);
      const parts = faces.map((s) => {
        const yy = cy - s * 0.5 * SC * k * st;
        const dots = o.electrons === 6 ? Array.from({ length: 6 }, (_, i) => { const t = (i / 6) * Math.PI * 2; return dotSvg(cx + Math.cos(t) * r, yy + Math.sin(t) * r * (cam.tilt < 0.2 ? 1 : ct), 2.8); }).join('') : '';
        return `<ellipse cx="${f1(cx)}" cy="${f1(yy)}" rx="${f1(r)}" ry="${f1(cam.tilt < 0.2 ? r : r * ct + 5)}" fill="var(--electron)" fill-opacity=".1" stroke="var(--electron)" stroke-opacity=".55" stroke-width="3" ${dash}/>${dots}`;
      }).join('');
      return `<g class="ms-orb" opacity="${EMPH[o.emphasis]}">${parts}${lab(cx, cy + r * 1.5 + 20)}</g>`;
    }
    case 'ring': {
      const lift = (o.side === 'bottom' ? -1 : 1) * 0.15;
      const pts = o.atoms.map((id) => ctx.S3(id, lift)).filter(Boolean);
      return `<g class="ms-orb" opacity="${EMPH[o.emphasis]}"><polygon points="${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ')}" fill="var(--accent)" fill-opacity=".1" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-opacity=".8" ${o.emphasis === 'ghost' ? 'stroke-dasharray="6 5"' : ''}/></g>`;
    }
    default: return '';
  }
}

// ------------------------------------------------------------------ the frame
/** Where a label may go around an atom: the direction (radians, screen) with the biggest gap to the bonds and to labels already placed there. */
function freeAngle(taken) {
  let best = -Math.PI / 2, score = -1;
  for (let i = 0; i < 24; i++) {
    const t = -Math.PI / 2 + (i * Math.PI * 2) / 24;
    const m = taken.length ? Math.min(...taken.map((u) => { let d = Math.abs(t - u) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; })) : Math.PI;
    const s = m - Math.abs(i === 0 ? 0 : 0) - (i > 0 ? i * 1e-4 : 0);
    if (s > score + 1e-9) { score = s; best = t; }
  }
  return best;
}
const keyOfOrb = (o) => `${o.kind}|${o.atoms.join(',')}|${o.plane || 'z'}|${o.axis ? o.axis.join(',') : ''}`;
const pairKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const sameBond = (bond, x, y) => (bond[0] === x && bond[1] === y) || (bond[0] === y && bond[1] === x);

/** Everything about beat i at time t that the drawing needs. */
function buildFrame(scene, layout, t, opts) {
  const { i, p: pRaw } = beatAt(scene, t);
  const stat = !!opts.static;
  const p = stat ? 1 : pRaw;
  const beat = scene.beats[i], lb = layout.beats[i];
  const prev = i > 0 ? layout.beats[i - 1] : { atoms: layout.stage0.atoms, bonds: layout.stage0.bonds, pos1: layout.stage0.pos, ghosts: [], forms: [] };
  let cam = stat ? camEnd(scene, layout, i) : camAt(scene, layout, i, p);
  if (opts.thumb) { const e = camEnd(scene, layout, i); cam = { ...e, k: Math.max(e.k, Math.min(1.9, e.kfit)) }; }
  return { i, p, beat, lb, prev, stat, pos: posAt(lb, p), cam };
}

export function renderScene(scene, layout, t, opts = {}) {
  const layer = opts.layer || 'both';
  const showArrows = layer === 'both' || layer === 'arrows';
  const showOrbitals = layer === 'both' || layer === 'orbitals';
  const fr = buildFrame(scene, layout, t, opts);
  const { i, p, beat, lb, prev, stat, cam, pos } = fr;
  const proj = projector(cam);
  const reset = lb.reset;
  const parts = [];
  const fin = stat || i === 0 ? 1 : smooth(p, 0, 0.3);   // things that join this beat fade in over its first 30 %; the very first beat starts with everything in place

  // ---- topology of the two ends of the beat (a reset cross-fades two whole pictures instead)
  const A0 = structMap(prev.atoms), A1 = structMap(lb.atoms);
  const ids = reset ? [...A1.keys()] : [...new Set([...A0.keys(), ...A1.keys()])];
  const S = (id) => (pos[id] ? proj(pos[id]) : null);
  const S3 = (id, dz) => (pos[id] ? proj([pos[id][0], pos[id][1], pos[id][2] + dz]) : null);
  const atomOp = (id) => {
    const a0 = A0.has(id), a1 = A1.has(id);
    if (reset) return 1;
    const sum = beat.kind === 'summary';
    if (a0 && a1) return 1;
    if (!a0) return stat ? 1 : smooth(p, 0, sum ? 0.8 : 0.25);
    return stat ? 0 : 1 - smooth(p, sum ? 0.3 : 0, sum ? 0.8 : 0.2);
  };

  // ---- arrows' windows, used by bond fades
  const arrows = beat.arrows || [];
  const travel = (a) => [a.at[0] + 0.3 * (a.at[1] - a.at[0]), a.at[1]];
  const winFor = (a, b, forming) => {
    for (const ar of arrows) {
      const [t0, t1] = travel(ar), dur = t1 - t0;
      if (forming) {
        const viaBond = ar.to.bond && sameBond(ar.to.bond, a, b);
        const viaLp = ar.from.lp != null && ar.to.atom != null && sameBond([ar.from.lp, ar.to.atom], a, b);
        if (viaBond || viaLp) return [t0 + 0.6 * dur, t1];
      } else if (ar.from.bond && sameBond(ar.from.bond, a, b)) return [t0, t0 + 0.4 * dur];
    }
    return [0.3, 0.8];
  };
  const bondMap = new Map();
  (reset ? [] : prev.bonds).forEach(([a, b, o]) => bondMap.set(pairKey(a, b), { a, b, o0: o, o1: 0 }));
  lb.bonds.forEach(([a, b, o]) => { const k = pairKey(a, b); const e = bondMap.get(k); if (e) e.o1 = o; else bondMap.set(k, { a, b, o0: 0, o1: o }); });

  // ---- screen positions of what is on stage this frame
  const scr = {};
  ids.forEach((id) => { const q = S(id); if (q) scr[id] = q; });
  const nbrCache = new Map();
  const bondsNow = reset ? lb.bonds : [...bondMap.values()].map((e) => [e.a, e.b, Math.max(e.o0, e.o1)]);
  const nbrs = (id) => { if (!nbrCache.has(id)) { nbrCache.set(id, bondsNow.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a))); } return nbrCache.get(id); };
  const degOf = (id) => nbrs(id).length;
  const ctx = { S, S3, cam, nbrs };

  // ---- surface, faces
  const surf = layout.surface;
  if (surf) {
    const sites = ids.filter((id) => (A1.get(id) || A0.get(id)).st === 'surface').map((id) => pos[id]).filter(Boolean);
    if (sites.length) {
      const xs = sites.map((q) => proj(q)[0]);
      const focusSurface = (beat.orbitals || []).find((o) => o.kind === 'surface');
      const op = focusSurface ? EMPH[focusSurface.emphasis] * (focusSurface.emphasis === 'focus' ? 1 : 1.25) : 0.9;
      const yy = proj(sites[0])[1];
      parts.push(`<g opacity="${clamp(op, 0.25, 1)}">${G.surface(yy + 8, Math.max(...xs) - Math.min(...xs) + 120, { x: Math.min(...xs) - 60, h: [], height: 20 })}</g>`);
      parts.push(`<text x="${f1(Math.min(...xs) - 54)}" y="${f1(yy + 46)}" font-size="14" font-weight="600" fill="var(--muted)">${esc(surf.label)}</text>`);
    }
  }
  if (beat.faces && beat.faces.show && cam.tilt >= 0.5) {
    const L = (beat.faces.labels && beat.faces.labels.top) || 'top face', B = (beat.faces.labels && beat.faces.labels.bottom) || 'bottom face';
    // the guides sit one bond above and below the plane of the molecule in focus (not of the whole stage)
    const fp = (beat.camera.focus || []).map((id) => pos[id]).filter(Boolean);
    const gx = fp.length ? fp.reduce((s, q) => s + q[0], 0) / fp.length : cam.fx, gy = fp.length ? fp.reduce((s, q) => s + q[1], 0) / fp.length : cam.fy;
    const yT = proj([gx, gy, 1])[1], yB = proj([gx, gy, -1])[1];
    const x0 = clamp(proj([gx - 2.4, gy, 0])[0], 6, 200), x1 = clamp(proj([gx + 2.4, gy, 0])[0], 440, W - 6);
    const line = (y) => `<line x1="${f1(x0)}" y1="${f1(y)}" x2="${f1(x1)}" y2="${f1(y)}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="7 6" stroke-opacity=".55"/>`;
    parts.push(`<g class="ms-faces">${line(yT)}${line(yB)}<text x="${f1(x0 + 4)}" y="${f1(yT - 6)}" font-size="14" font-weight="600" fill="var(--muted)">${esc(L)}</text><text x="${f1(x0 + 4)}" y="${f1(yB + 17)}" font-size="14" font-weight="600" fill="var(--muted)">${esc(B)}</text></g>`);
  }

  // ---- ghosts (atom copies, mirror image, mini drawings): fade in over the first 30 % of the beat
  const gIn = fin;
  (lb.ghosts || []).forEach((g) => {
    if (g.k === 'mirror') {
      const Sg = {}; Object.keys(g.pos).forEach((id) => { Sg[id] = proj(g.pos[id]); });
      parts.push(`<g opacity="${f1(0.3 * gIn * 100) / 100}">${structSvg(g.atoms, g.bonds, Sg, { fs: 22 })}</g>`);
      const xs = Object.values(Sg).map((q) => q[0]), ys = Object.values(Sg).map((q) => q[1]);
      parts.push(`<text x="${f1((Math.min(...xs) + Math.max(...xs)) / 2)}" y="${f1(Math.max(...ys) + 40)}" text-anchor="middle" font-size="14" fill="var(--muted)" opacity="${gIn}">${esc(g.label)}</text>`);
    } else if (g.k === 'mini') {
      const sc = SC * 0.6, cx = 533, cy = 190;
      const Sg = {}; Object.keys(g.pos).forEach((id) => { Sg[id] = [cx + g.pos[id][0] * sc, cy + g.pos[id][1] * sc]; });
      const ys = Object.values(Sg).map((q) => q[1]);
      parts.push(`<g opacity="${gIn}">${structSvg(g.atoms, g.bonds, Sg, { fs: 17, wBond: 2.2 })}<text x="${cx}" y="${f1(Math.max(...ys) + 34)}" text-anchor="middle" font-size="13.5" fill="var(--muted)">${esc(wrap(g.label, 26)[0])}</text>${wrap(g.label, 26).slice(1).map((s, k) => `<text x="${cx}" y="${f1(Math.max(...ys) + 52 + k * 17)}" text-anchor="middle" font-size="13.5" fill="var(--muted)">${esc(s)}</text>`).join('')}</g>`);
    } else if (g.k === 'atoms') {
      const ps = g.ids.map((id) => g.pos[id]).filter(Boolean).map(proj);
      ps.forEach((q, k) => {
        const a = g.atoms[k];
        parts.push(`<g opacity="${f1(0.3 * gIn * 100) / 100}"><circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="14" fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 4"/><text x="${f1(q[0])}" y="${f1(q[1] + 7)}" text-anchor="middle" font-size="22" font-weight="700" fill="var(--ink)">${esc(a.s)}</text>${a.c ? chargeSvg(q[0] + 15, q[1] - 15, a.c) : ''}</g>`);
      });
      if (ps.length) {
        const q = ps[0];
        parts.push(`<text x="${f1(clamp(q[0], 70, W - 70))}" y="${f1(clamp(q[1] + 36, 16, H - 8))}" text-anchor="middle" font-size="14" font-weight="600" fill="var(--muted)" opacity="${gIn}">${esc(g.label)}</text>`);
      }
    }
  });

  // ---- bonds
  const arrowsDone = stat ? 1 : p;
  const bondSvgs = [];
  const gOf = (id) => { const a = A1.get(id) || A0.get(id); return labelled(a, degOf(id)) ? (a.s === 'H' ? 10 : 15) : 0; };
  const tilt0 = cam.tilt < 0.45;
  if (reset) {
    // cross-fade: old picture out, new picture in, over the first 10 %
    const g = stat ? 1 : smooth(p, 0, 0.1);
    const oldPos = lb.posOld || lb.pos0;
    const Sold = {}; Object.keys(oldPos).forEach((id) => { Sold[id] = proj(oldPos[id]); });
    if (g < 1) parts.push(`<g opacity="${f1((1 - g) * 100) / 100}">${structSvg(prev.atoms.map((a) => ({ ...a, st: a.st })), prev.bonds, Sold, { fs: 22 })}</g>`);
  }
  (reset ? lb.bonds.map(([a, b, o]) => ({ a, b, o0: o, o1: o })) : [...bondMap.values()]).forEach((e) => {
    const P1 = scr[e.a], P2 = scr[e.b];
    if (!P1 || !P2) return;
    const aOp = Math.min(atomOp(e.a), atomOp(e.b));
    let w;
    if (reset || e.o0 === e.o1) w = 1; else {
      const [w0, w1] = winFor(e.a, e.b, e.o1 > e.o0);
      w = stat ? 1 : smooth(p, w0, w1);
    }
    const [x1, y1, x2, y2] = shorten(P1[0], P1[1], P2[0], P2[1], gOf(e.a), gOf(e.b));
    const formingNow = e.o1 > e.o0 && w < 1 && !stat, breakingNow = e.o1 < e.o0 && w < 1 && !stat;
    const infoA = A1.get(e.a) || A0.get(e.a), infoB = A1.get(e.b) || A0.get(e.b);
    const metal = infoA.s === 'Pd' || infoB.s === 'Pd';
    // wedges after a relayout with a pose
    const za = pos[e.a][2], zb = pos[e.b][2];
    if (!metal && cam.tilt < 0.45 && e.o1 === 1 && e.o0 === 1 && ((Math.abs(zb) >= 0.5 && Math.abs(za) < 0.5) || (Math.abs(za) >= 0.5 && Math.abs(zb) < 0.5))) {
      const up = Math.abs(zb) >= 0.5 ? zb : za;
      const [sx, sy, ex, ey] = Math.abs(zb) >= 0.5 ? [x1, y1, x2, y2] : [x2, y2, x1, y1];
      bondSvgs.push(`<g opacity="${aOp}">${wedgeSvg(sx, sy, ex, ey, up < 0)}</g>`);
      return;
    }
    const ts = beat.ts && (formingNow || breakingNow);
    bondSvgs.push(bondLines(x1, y1, x2, y2, e.o0, e.o1, w, { op: aOp, dash: metal ? '4 5' : ts ? '7 5' : '', colour: metal ? 'var(--muted)' : 'var(--ink)', width: metal ? 2 : 2.5 }));
    // amber glow while a new bond forms, then it cools; a teal / coral dashed ghost marks a bond in the middle of forming or breaking
    if (e.o1 > e.o0 && !stat) {
      const [w0, w1] = winFor(e.a, e.b, true);
      const glow = w >= 0.05 ? 1 - smooth(p, w1, Math.min(1, w1 + 0.15)) : 0;
      if (glow > 0.02 && w > 0) bondSvgs.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="var(--electron)" stroke-width="6" stroke-linecap="round" stroke-opacity="${f1(glow * 0.45 * 100) / 100}"/>`);
    }
    if (formingNow && w > 0.02) bondSvgs.push(`<g opacity="${f1((1 - w) * 100) / 100}">${G.bondGhost(x1, y1, x2, y2, { state: 'forming', static: true })}</g>`);
    if (breakingNow && w > 0.02) bondSvgs.push(`<g opacity="${f1((1 - w) * 100) / 100}">${G.bondGhost(x1, y1, x2, y2, { state: 'breaking', static: true })}</g>`);
  });
  const gNew = reset ? (stat ? 1 : smooth(p, 0, 0.1)) : 1;
  parts.push(`<g class="ms-bonds" opacity="${gNew}">${bondSvgs.join('')}</g>`);

  // ---- motion trails
  if (!stat) {
    trailSegs(lb).forEach((s) => {
      const u = ease((p - s.at[0]) / (s.at[1] - s.at[0]));
      if (u <= 0) return;
      const fade = u < 1 ? 1 : 1 - smooth(p, s.at[1], Math.min(1, s.at[1] + 0.12));
      if (fade <= 0.02) return;
      s.ids.forEach((id) => {
        const a = proj(s.from[id]), b = scr[id];
        if (b) parts.push(`<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="var(--electron)" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" stroke-opacity="${f1(fade * 0.7 * 100) / 100}"/>`);
      });
    });
  }

  // ---- orbitals, behind the atoms
  if (showOrbitals) {
    const now = beat.orbitals || [], before = i > 0 ? scene.beats[i - 1].orbitals || [] : [];
    const nowKeys = new Set(now.map(keyOfOrb)), beforeKeys = new Set(before.map(keyOfOrb));
    const f = fin;
    const cache = { ...ctx, atoms: A1 };
    const orbs = [];
    now.forEach((o) => { if (o.kind === 'surface') return; const op = beforeKeys.has(keyOfOrb(o)) ? 1 : f; orbs.push(`<g opacity="${op}">${orbitalSvg(o, cache)}</g>`); });
    if (!stat) before.forEach((o) => { if (o.kind === 'surface' || nowKeys.has(keyOfOrb(o)) || f >= 1) return; orbs.push(`<g opacity="${f1((1 - f) * 100) / 100}">${orbitalSvg(o, cache)}</g>`); });
    parts.push(`<g class="ms-orbitals">${orbs.join('')}</g>`);
  }

  // ---- atoms: labels, lone pairs, charges
  const lpArrows = arrows.filter((a) => a.from.lp != null);
  const atomSvgs = [];
  const chargeWin = stat ? 1 : smooth(p, 0.85, 1);
  const takenAt = new Map();      // id -> directions already used by a label around that atom
  ids.forEach((id) => {
    const q = scr[id]; if (!q) return;
    const a1 = A1.get(id), a0 = A0.get(id), a = a1 || a0;
    const op = atomOp(id);
    if (op <= 0.01) return;
    const nbr = nbrs(id);
    const dirs = nbr.map((j) => scr[j]).filter(Boolean).map((r) => Math.atan2(r[1] - q[1], r[0] - q[0]));
    const lab = labelled(a, nbr.length);
    const out = [];
    // the symbol: crossfade the H count when it changes
    const h0 = a0 ? a0.h : null, h1 = a1 ? a1.h : null;
    if (lab) {
      if (a0 && a1 && h0 !== h1 && !stat && chargeWin > 0 && chargeWin < 1) {
        out.push(labelSvg({ ...a0 }, q[0], q[1], dirs, 22, (1 - chargeWin) * op));
        out.push(labelSvg({ ...a1 }, q[0], q[1], dirs, 22, chargeWin * op));
      } else out.push(labelSvg(stat || p >= 0.85 ? (a1 || a0) : (a0 || a1), q[0], q[1], dirs, 22, op));
    }
    if (a.s === 'Pd') out.push(`<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="9" fill="var(--muted)" fill-opacity=".35" stroke="var(--muted)" stroke-width="2" opacity="${op}"/>`);
    // lone pairs
    if (LP_ATOMS.has(a.s)) {
      const lpOfState = (T, A) => (A ? lpOf(A.s, A.c, T.bonds.filter(([x, y]) => x === id || y === id).reduce((s, b) => s + b[2], 0), A.h) : 0);
      const n0 = lpOfState(prev, a0), n1 = lpOfState(lb, a1);
      const started = stat ? 0 : lpArrows.filter((ar) => ar.from.lp === id && p >= ar.at[0]).length;
      const mine = lpArrows.filter((ar) => ar.from.lp === id);
      const drawSet = (n, alpha, skipNear) => {
        if (n <= 0 || alpha <= 0.01) return;
        let angs = lonePairAngles(dirs, n);
        if (skipNear != null) {
          // the pair that lifts off is the one nearest the target
          const tgt = skipNear;
          let bi = 0, bd = 9;
          angs.forEach((t, k) => { let d = Math.abs(t - tgt) % (Math.PI * 2); d = d > Math.PI ? Math.PI * 2 - d : d; if (d < bd) { bd = d; bi = k; } });
          angs = angs.filter((_, k) => k !== bi);
        }
        const g = angs.map((t) => G.lonePair(q[0], q[1], (t * 180) / Math.PI, { r: 23 })).join('');
        out.push(`<g opacity="${f1(alpha * op * 100) / 100}">${g}</g>`);
        takenAt.set(id, (takenAt.get(id) || []).concat(angs));
      };
      const towardOf = (ar) => { const r = ar.to.atom != null ? scr[ar.to.atom] : ar.to.bond ? [(scr[ar.to.bond[0]] || q)[0] / 2 + (scr[ar.to.bond[1]] || q)[0] / 2, (scr[ar.to.bond[0]] || q)[1] / 2 + (scr[ar.to.bond[1]] || q)[1] / 2] : null; return r ? Math.atan2(r[1] - q[1], r[0] - q[0]) : null; };
      if (n0 === n1 && !started) drawSet(n1, 1);
      else {
        // before-set (minus the pair that has left), crossfaded to the after-set at the end of the beat
        const lifted = started > 0 && mine.length ? towardOf(mine[0]) : null;
        drawSet(started > 0 ? n0 - started : n0, stat ? 0 : 1 - chargeWin, lifted);
        drawSet(n1, stat ? 1 : chargeWin);
      }
    }
    // charge
    const c0 = a0 ? a0.c : 0, c1 = a1 ? a1.c : 0;
    const cx = q[0] + (lab ? 17 : 11), cy = q[1] - (lab ? 17 : 13);
    if (c0 === c1) { if (c1) out.push(`<g opacity="${op}">${chargeSvg(cx, cy, c1)}</g>`); } else {
      if (c0) out.push(`<g opacity="${f1((1 - chargeWin) * op * 100) / 100}">${chargeSvg(cx, cy, c0)}</g>`);
      if (c1) out.push(`<g opacity="${f1(chargeWin * op * 100) / 100}">${chargeSvg(cx, cy, c1)}</g>`);
    }
    if (c0 || c1) takenAt.set(id, (takenAt.get(id) || []).concat(-Math.PI / 4));
    if (out.length) atomSvgs.push(`<g class="ms-atom" data-id="${id}">${out.join('')}</g>`);
  });
  parts.push(`<g class="ms-atoms" opacity="${gNew}">${atomSvgs.join('')}</g>`);

  // ---- species labels
  (lb.labels || []).forEach((lab) => {
    const pts = lab.ids.map((id) => scr[id]).filter(Boolean);
    if (!pts.length || cam.k > 1.35) return;
    const x = clamp(pts.reduce((s, q) => s + q[0], 0) / pts.length, 60, W - 60), y = clamp(Math.max(...pts.map((q) => q[1])) + 54, 18, H - 8);
    parts.push(`<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-size="14" fill="var(--muted)" opacity="${fin}">${esc(lab.text)}</text>`);
  });

  // ---- ARROWS layer: δ labels, badges, arrows, electron dots
  if (showArrows) {
    const partialsNow = beat.partials || [], partialsBefore = i > 0 ? scene.beats[i - 1].partials || [] : [];
    const f = fin;
    const labelOf = (atomId, text, tone, op, kind) => {
      const q = scr[atomId]; if (!q) return '';
      const dirs = nbrs(atomId).map((j) => scr[j]).filter(Boolean).map((r) => Math.atan2(r[1] - q[1], r[0] - q[0]));
      const taken = dirs.concat(takenAt.get(atomId) || []);
      const ang = freeAngle(taken);
      takenAt.set(atomId, (takenAt.get(atomId) || []).concat(ang));
      const col = tone === 'elec' ? 'var(--bad)' : tone === 'nuc' ? 'var(--accent)' : 'var(--muted)';
      if (kind === 'delta') {
        const r = 26;
        return `<text x="${f1(q[0] + Math.cos(ang) * r)}" y="${f1(q[1] + Math.sin(ang) * r + 5)}" text-anchor="middle" font-size="17" font-weight="700" fill="${col}" opacity="${op}">${esc(text)}</text>`;
      }
      const wpx = text.length * 8.6 + 18, r = 28 + wpx / 2 * Math.abs(Math.cos(ang)) * 0.9;
      const px = clamp(q[0] + Math.cos(ang) * r, wpx / 2 + 4, W - wpx / 2 - 4), py = clamp(q[1] + Math.sin(ang) * (28 + 6) , 16, H - 14);
      return `<g opacity="${op}"><rect x="${f1(px - wpx / 2)}" y="${f1(py - 12)}" width="${f1(wpx)}" height="24" rx="12" fill="var(--surface)" fill-opacity=".92" stroke="${col}" stroke-width="2"/><text x="${f1(px)}" y="${f1(py + 5)}" text-anchor="middle" font-size="14" font-weight="600" fill="${col}">${esc(text)}</text></g>`;
    };
    const items = [];
    partialsNow.forEach((d) => { const was = partialsBefore.some((x) => x.atom === d.atom && x.sign === d.sign); items.push(labelOf(d.atom, d.sign === '+' ? 'δ+' : 'δ' + MINUS, d.sign === '+' ? 'elec' : 'nuc', was ? 1 : f, 'delta')); });
    (beat.badges || []).forEach((b) => { const was = i > 0 && (scene.beats[i - 1].badges || []).some((x) => x.atom === b.atom && x.text === b.text); items.push(labelOf(b.atom, b.text, b.tone, was ? 1 : f, 'badge')); });
    parts.push(`<g class="ms-labels">${items.join('')}</g>`);
  }

  // ---- arrows and the electrons riding them (ORBITALS only: no curved arrow, the dots still travel, in a straight line)
  {
    const f = fin;
    const arr = [];
    arrows.forEach((ar, k) => {
      const [t0, t1] = travel(ar);
      const u = stat ? 1 : clamp((p - ar.at[0]) / (ar.at[1] - ar.at[0]));
      if (!(stat || p >= ar.at[0])) return;
      const geo = arrowGeo(ar, scr, ctx, A1);
      if (!geo) return;
      const draw = stat ? 1 : smooth(u, 0, 0.3);
      const run = stat ? 1 : clamp((u - 0.3) / 0.7);
      const trace = !stat && p >= 1 ? 0.35 : 1;
      const tn = ar.tone || {};
      const halo = (x, y, col, tag) => `<g opacity="${stat ? 0.9 : f1((1 - (p >= 1 ? 1 : 0)) * 0.9 * 100) / 100}"><circle cx="${f1(x)}" cy="${f1(y)}" r="17" fill="${col}" fill-opacity=".14" stroke="${col}" stroke-width="2.5" stroke-opacity=".7"/>${tag ? `<text x="${f1(x - 16)}" y="${f1(y - 16)}" text-anchor="end" font-size="13" font-weight="700" fill="${col}">${tag}</text>` : ''}</g>`;
      if (showArrows && tn.src === 'nuc' && geo.srcPt) arr.push(halo(geo.srcPt[0], geo.srcPt[1], 'var(--accent)', k === 0 ? 'Nu' : ''));
      if (showArrows && tn.dst === 'elec' && geo.dstPt) arr.push(halo(geo.dstPt[0], geo.dstPt[1], 'var(--bad)', k === 0 ? 'E' : ''));
      if (showArrows) {
        arr.push(`<g class="ms-arrow" opacity="${trace}"><path d="${geo.d}" pathLength="1" fill="none" stroke="var(--electron)" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="${f1((1 - draw) * 1000) / 1000}"/>${draw >= 0.999 ? `<polygon points="${geo.head}" fill="var(--electron)" stroke="var(--electron)" stroke-width="2" stroke-linejoin="round"/>` : ''}</g>`);
      }
      // the electrons: two amber dots riding the arrow (a straight line from source to target when only ORBITALS is on)
      const showDots = stat ? true : (u > 0.3 && p < 1);
      if (showDots) {
        const s = stat ? 1 : ease(run);
        const pt = layer === 'orbitals' ? straightPt(geo, s) : bezierPt(geo, s);
        arr.push(pairDots(pt[0], pt[1], pt[2]));
      }
    });
    parts.push(`<g class="ms-arrows">${arr.join('')}</g>`);
  }

  // ---- resonance forms row (top band)
  if ((lb.forms || []).length) parts.push(formsSvg(lb, pos, fin));

  const title = esc(scene.title);
  const font = 'style="font-family:var(--body,system-ui,sans-serif)"';
  if (opts.thumb) return `<svg class="ms-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" ${font}>${parts.join('')}</svg>`;
  const desc = esc(captionFor(scene, i, { layer, caveman: opts.caveman }) + ' ' + whyLines(scene, i, p, { static: stat, caveman: opts.caveman }).join(' '));
  return `<svg class="ms-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}" xmlns="http://www.w3.org/2000/svg" ${font}><title>${title}</title><desc>${desc}</desc>${parts.join('')}</svg>`;
}

// ------------------------------------------------------------------ arrows
function atomRad(id, A, deg) { const a = A.get(id); return a && labelled(a, deg) ? (a.s === 'H' ? 11 : 15) : 6; }
/** Curve geometry of one arrow from the current screen positions. Returns null when an end is not on stage. */
function arrowGeo(ar, scr, ctx, A) {
  const rad = (id) => atomRad(id, A, ctx.nbrs(id).length);
  const mid = (b) => (scr[b[0]] && scr[b[1]] ? [(scr[b[0]][0] + scr[b[1]][0]) / 2, (scr[b[0]][1] + scr[b[1]][1]) / 2] : null);
  // head target
  let head, headGap = 3, dstPt = null;
  if (ar.to.atom != null) { head = scr[ar.to.atom]; headGap = rad(ar.to.atom) + 6; dstPt = head; } else if (ar.to.bond) { head = mid(ar.to.bond); dstPt = head; }
  if (!head) return null;
  // tail
  let tail, srcPt = null;
  if (ar.from.bond) { tail = mid(ar.from.bond); srcPt = tail; } else if (ar.from.lp != null) {
    const q = scr[ar.from.lp]; if (!q) return null;
    const dx = head[0] - q[0], dy = head[1] - q[1], L = Math.hypot(dx, dy) || 1;
    tail = [q[0] + (dx / L) * (rad(ar.from.lp) + 9), q[1] + (dy / L) * (rad(ar.from.lp) + 9)]; srcPt = q;
  }
  if (!tail) return null;
  if (Math.hypot(head[0] - tail[0], head[1] - tail[1]) < 6) return null;
  const c = curve({ x: tail[0], y: tail[1] }, { x: head[0], y: head[1] }, headGap);
  return { d: c.d, head: c.head, p0: [tail[0], tail[1]], c: [c.ctrl.x, c.ctrl.y], p1: [c.stem.x, c.stem.y], srcPt, dstPt };
}
function bezierPt(g, s) {
  const u = 1 - s;
  const x = u * u * g.p0[0] + 2 * u * s * g.c[0] + s * s * g.p1[0], y = u * u * g.p0[1] + 2 * u * s * g.c[1] + s * s * g.p1[1];
  const tx = 2 * u * (g.c[0] - g.p0[0]) + 2 * s * (g.p1[0] - g.c[0]), ty = 2 * u * (g.c[1] - g.p0[1]) + 2 * s * (g.p1[1] - g.c[1]);
  return [x, y, Math.atan2(ty, tx)];
}
const straightPt = (g, s) => [lerp(g.p0[0], g.p1[0], s), lerp(g.p0[1], g.p1[1], s), Math.atan2(g.p1[1] - g.p0[1], g.p1[0] - g.p0[0])];
/** The electron pair: two amber dots side by side across the direction of travel. */
function pairDots(x, y, ang) {
  const nx = -Math.sin(ang) * 4.6, ny = Math.cos(ang) * 4.6;
  return `<g class="ms-pair">${dotSvg(x + nx, y + ny, 4.2)}${dotSvg(x - nx, y - ny, 4.2)}</g>`;
}

// ------------------------------------------------------------------ resonance forms
function formsSvg(lb, pos, f) {
  const forms = lb.forms;
  // natural size of each card at 0.45 of the stage scale
  let s = SC * 0.45;
  const sizeOf = (form, k) => { const q = form.atoms.map((a) => pos[a.i]).filter(Boolean); const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]); return [(Math.max(...xs) - Math.min(...xs)) * k + 34, (Math.max(...ys) - Math.min(...ys)) * k + 26]; };
  const total = (k) => forms.reduce((t, fm) => t + sizeOf(fm, k)[0], 0) + (forms.length - 1) * 26;
  while (total(s) > W - 24 && s > 10) s -= 1;
  const heightMax = Math.max(...forms.map((fm) => sizeOf(fm, s)[1]));
  while (heightMax > 82 && s > 10) { s -= 1; break; }
  let x = (W - total(s)) / 2;
  const curKey = lb.atoms.map((a) => a.i + ':' + a.c).sort().join(',') + '|' + lb.bonds.map((b) => pairKey(b[0], b[1]) + ':' + b[2]).sort().join(',');
  let out = '';
  forms.forEach((fm, k) => {
    const [w] = sizeOf(fm, s);
    const q = fm.atoms.map((a) => pos[a.i]).filter(Boolean);
    const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
    const cx0 = (Math.min(...xs) + Math.max(...xs)) / 2, cy0 = (Math.min(...ys) + Math.max(...ys)) / 2;
    const Sg = {};
    fm.atoms.forEach((a) => { const p = pos[a.i]; if (p) Sg[a.i] = [x + w / 2 + (p[0] - cx0) * s, 49 + (p[1] - cy0) * s]; });
    // is this the card of the picture on screen? same charges on the shared atoms and the same bonds
    const mineAtoms = fm.atoms.filter((a) => lb.atoms.some((b) => b.i === a.i));
    const same = mineAtoms.every((a) => (lb.atoms.find((b) => b.i === a.i) || {}).c === a.c) && fm.bonds.every(([a, b, o]) => lb.bonds.some((z) => pairKey(z[0], z[1]) === pairKey(a, b) && z[2] === o));
    out += `<g opacity="${f}">${same ? `<rect x="${f1(x)}" y="6" width="${f1(w)}" height="86" rx="10" fill="var(--accent)" fill-opacity=".07" stroke="var(--accent)" stroke-width="2"/>` : `<rect x="${f1(x)}" y="6" width="${f1(w)}" height="86" rx="10" fill="none" stroke="var(--line-strong)" stroke-width="1.5"/>`}${structSvg(fm.atoms, fm.bonds, Sg, { fs: 13, wBond: 2 })}</g>`;
    if (k < forms.length - 1) out += `<text x="${f1(x + w + 13)}" y="55" text-anchor="middle" font-size="18" fill="var(--muted)" opacity="${f}">↔</text>`;
    x += w + 26;
  });
  return `<g class="ms-forms">${out}</g>`;
}

// ------------------------------------------------------------------ misc
/** Greedy word wrap into lines of at most n characters. */
function wrap(text, n) {
  const words = String(text).split(/\s+/), lines = [];
  let cur = '';
  words.forEach((w) => { if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lines.push(cur);
  return lines;
}

/** Screen positions (viewBox units) of the atoms on stage at time t, for the tests and for anything that wants to overlay on the picture. */
export function screenPositions(scene, layout, t, opts = {}) {
  const fr = buildFrame(scene, layout, t, opts);
  const proj = projector(fr.cam);
  const out = {};
  fr.lb.atoms.forEach((a) => { if (fr.pos[a.i]) out[a.i] = proj(fr.pos[a.i]); });
  return out;
}

/** Atom positions at the end of the last beat (layout units), for the tests. */
export const finalPositions = (layout) => layout.beats[layout.beats.length - 1].pos1;
