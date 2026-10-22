// Orbital and effect glyphs for the animated mechanism scenes. Plain ES module, no DOM, no dependencies: every builder
// returns an SVG *string* to be dropped inside the scene's <svg viewBox="0 0 640 400"> (ORBITALS layer for the orbital
// glyphs, ARROWS layer for the arrows and ghosts).
//
// House style: teal (--accent) for orbitals and forming things, amber (--electron) for electrons and arrows, coral (--bad) for
// breaking things and the nucleophile-blocked side, --muted for supporting marks, --ink for atoms. Colours always come from
// CSS variables with a light-theme fallback, so the scene follows the app's light and dark themes with no extra code.
// Only the five variables in GLYPH_VARS are used (tests/scenes-assets.mjs checks that). Every stroke is >= 2 user units at
// 640 wide. Anything that animates is left out when opts.static is true (prefers-reduced-motion).
//
// Coordinates are SVG user units (y down). Angles are in degrees on screen: 0 = right, 90 = down, -90 = up.

export const GLYPH_VARS = ['--accent', '--electron', '--bad', '--muted', '--ink'];

const C = {
  accent: 'var(--accent, #0a727c)',
  electron: 'var(--electron, #cf7f00)',
  bad: 'var(--bad, #b23a26)',
  muted: 'var(--muted, #4f666d)',
  ink: 'var(--ink, #0c1d23)'
};

const n1 = (v) => String(Math.round(v * 10) / 10);
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const pick = (name, fallback) => C[name] || C[fallback];

// A bond angle folded into (-90, 90] so that local -y always means "up the screen" after rotating.
function foldAngle(a) {
  let d = a;
  while (d > 90) d -= 180;
  while (d <= -90) d += 180;
  return d;
}

// One lobe (teardrop) pointing along +x from the origin, length L, half-width W.
const lobe = (L, W) => `M0 0C${n1(L * 0.28)} ${n1(-W * 1.35)} ${n1(L * 1.02)} ${n1(-W * 1.1)} ${n1(L)} 0C${n1(L * 1.02)} ${n1(W * 1.1)} ${n1(L * 0.28)} ${n1(W * 1.35)} 0 0Z`;

/** Two pi lobes above and/or below the bond (x1,y1)-(x2,y2): the pi cloud seen from the side. side: 'both' | 'top' | 'bottom'. */
export function piCloud(x1, y1, x2, y2, opts = {}) {
  const { side = 'both', color = 'accent', cls = 'g-pi' } = opts;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ang = foldAngle(deg(Math.atan2(y2 - y1, x2 - x1)));
  const rx = len / 2 + 11, ry = 15, off = 14;
  const col = pick(color, 'accent');
  const one = (sy) => `<ellipse cx="0" cy="${n1(sy * off)}" rx="${n1(rx)}" ry="${ry}" fill="${col}" fill-opacity="0.16" stroke="${col}" stroke-width="2" stroke-opacity="0.85"/>`;
  const parts = [];
  if (side === 'both' || side === 'top') parts.push(one(-1));
  if (side === 'both' || side === 'bottom') parts.push(one(1));
  return `<g class="${cls}" transform="translate(${n1(mx)} ${n1(my)}) rotate(${n1(ang)})">${parts.join('')}</g>`;
}

/** A single p orbital on the atom at (x,y), axis pointing along `angle`. opts.empty: dashed outline and no fill (an empty p orbital). */
export function pOrbital(x, y, angle = -90, opts = {}) {
  const { empty = false, size = 1, color = 'accent', cls = 'g-p', gap = 0 } = opts;   // gap: each lobe starts this far from the atom centre (clears a label drawn on the atom)
  const L = 26 * size, W = 8.5 * size;
  const col = pick(color, 'accent');
  const attrs = empty
    ? `fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round"`
    : `fill="${col}" fill-opacity="0.2" stroke="${col}" stroke-width="2"`;
  return `<g class="${cls}${empty ? ' is-empty' : ''}" transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(angle)})">` +
    `<path d="${lobe(L, W)}" transform="translate(${n1(gap)} 0)" ${attrs}/><path d="${lobe(L, W)}" transform="rotate(180) translate(${n1(gap)} 0)" ${attrs}/></g>`;
}

/** A lone pair on the atom at (x,y): two amber dots a short way out along `angle`. */
export function lonePair(x, y, angle = -90, opts = {}) {
  const { r = 15, gap = 4, dot = 3.2, color = 'electron', cls = 'g-lp' } = opts;
  const col = pick(color, 'electron');
  const a = rad(angle);
  const cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
  const px = -Math.sin(a) * gap, py = Math.cos(a) * gap;
  return `<g class="${cls}"><circle cx="${n1(cx + px)}" cy="${n1(cy + py)}" r="${dot}" fill="${col}"/>` +
    `<circle cx="${n1(cx - px)}" cy="${n1(cy - py)}" r="${dot}" fill="${col}"/></g>`;
}

/** The back lobe of a sigma* orbital, for SN2 backside attack: the bond runs from the carbon (x1,y1) to the leaving group
 *  (x2,y2); the faint lobe sits on the carbon, on the side facing away from the leaving group. */
export function sigmaStar(x1, y1, x2, y2, opts = {}) {
  const { size = 1, color = 'bad', cls = 'g-sigmastar' } = opts;
  const a = deg(Math.atan2(y1 - y2, x1 - x2)); // from the leaving group through the carbon and onwards
  const col = pick(color, 'bad');
  return `<g class="${cls}" transform="translate(${n1(x1)} ${n1(y1)}) rotate(${n1(a)})">` +
    `<path d="${lobe(40 * size, 13 * size)}" fill="${col}" fill-opacity="0.10" stroke="${col}" stroke-opacity="0.7" stroke-width="2" stroke-dasharray="6 5" stroke-linecap="round"/></g>`;
}

/** The three-membered ring highlight of a bromonium (or epoxide) ion: carbons a=(ax,ay), b=(bx,by) and the bridging atom (brx,bry). */
export function bromonium(ax, ay, bx, by, brx, bry, opts = {}) {
  const { color = 'accent', cls = 'g-bromonium' } = opts;
  const col = pick(color, 'accent');
  const cx = (ax + bx + brx) / 3, cy = (ay + by + bry) / 3;
  const grow = (x, y, k) => `${n1(cx + (x - cx) * k)},${n1(cy + (y - cy) * k)}`;
  const pts = [[ax, ay], [bx, by], [brx, bry]].map(([x, y]) => grow(x, y, 1.0)).join(' ');
  return `<g class="${cls}"><polygon points="${pts}" fill="${col}" fill-opacity="0.14" stroke="${col}" stroke-width="3" stroke-linejoin="round" stroke-opacity="0.9"/>` +
    `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(Math.max(Math.hypot(ax - cx, ay - cy), Math.hypot(brx - cx, bry - cy)) + 8)}" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="3 5" stroke-opacity="0.55"/></g>`;
}

/** A metal catalyst surface: a band at height y, `width` wide (from opts.x, default 0), with H atoms sitting on top of it.
 *  opts.h: array of x positions for the H atoms (default two, at 38% and 62% of the width). */
export function surface(y, width, opts = {}) {
  const { x = 0, h = null, height = 20, cls = 'g-surface' } = opts;
  const xs = h || [x + width * 0.38, x + width * 0.62];
  const hatch = [];
  for (let hx = x + 10; hx < x + width - 4; hx += 22) {
    hatch.push(`M${n1(hx)} ${n1(y + height)}L${n1(hx + 12)} ${n1(y + 3)}`);
  }
  const atoms = xs.map((hx) => `<g class="g-surface-h"><circle cx="${n1(hx)}" cy="${n1(y - 8)}" r="9" fill="${C.electron}" fill-opacity="0.25" stroke="${C.electron}" stroke-width="2"/>` +
    `<text x="${n1(hx)}" y="${n1(y - 4.2)}" text-anchor="middle" font-size="12" font-weight="600" fill="${C.ink}" font-family="inherit">H</text></g>`).join('');
  return `<g class="${cls}"><rect x="${n1(x)}" y="${n1(y)}" width="${n1(width)}" height="${height}" rx="4" fill="${C.muted}" fill-opacity="0.22" stroke="${C.muted}" stroke-width="2"/>` +
    `<path d="${hatch.join('')}" fill="none" stroke="${C.muted}" stroke-width="2" stroke-opacity="0.45" stroke-linecap="round"/>` +
    atoms + '</g>';
}

/** "top face" and "bottom face" markers either side of the molecular plane, centred on (x,y): a dashed plane line and two labelled chevrons. */
export function facesLabel(x, y, opts = {}) {
  const { width = 120, gap = 30, cls = 'g-faces' } = opts;
  const half = width / 2;
  const label = (t, dir) => `<text x="${n1(x)}" y="${n1(y + dir * gap + (dir > 0 ? 12 : -4))}" text-anchor="middle" font-size="13" font-weight="600" letter-spacing=".04em" fill="${C.muted}" font-family="inherit">${t}</text>`;
  return `<g class="${cls}"><line x1="${n1(x - half)}" y1="${n1(y)}" x2="${n1(x + half)}" y2="${n1(y)}" stroke="${C.muted}" stroke-width="2" stroke-dasharray="7 6" stroke-opacity="0.6"/>` +
    `<path d="M${n1(x - 6)} ${n1(y - gap + 20)}L${n1(x)} ${n1(y - gap + 13)}L${n1(x + 6)} ${n1(y - gap + 20)}" fill="none" stroke="${C.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M${n1(x - 6)} ${n1(y + gap - 20)}L${n1(x)} ${n1(y + gap - 13)}L${n1(x + 6)} ${n1(y + gap - 20)}" fill="none" stroke="${C.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
    label('top face', -1) + label('bottom face', 1) + '</g>';
}

// first point of an SVG path string ("M x y ..." or "Mx,y ...")
function firstPoint(d) {
  const m = /M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/.exec(d);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [0, 0];
}

/** The travelling electron pair: a group with two amber circles that rides along the path `pathD` (animateMotion, loops).
 *  opts.static: no animation, the pair sits at the start of the path (or at opts.t, 0..1, using CSS offset-path, which is also
 *  how a scrubber can place the pair at any time). opts.dur: seconds per trip. */
export function electronPair(pathD, opts = {}) {
  const { static: isStatic = false, t = null, dur = 1.8, r = 4, color = 'electron', cls = 'g-pair' } = opts;
  const col = pick(color, 'electron');
  const dots = `<circle cx="0" cy="-4.5" r="${r}" fill="${col}" stroke="${C.ink}" stroke-width="2" stroke-opacity="0.35"/>` +
    `<circle cx="0" cy="4.5" r="${r}" fill="${col}" stroke="${C.ink}" stroke-width="2" stroke-opacity="0.35"/>`;
  if (t !== null && t !== undefined) {
    return `<g class="${cls}" style="offset-path:path('${pathD}');offset-distance:${n1(Math.min(1, Math.max(0, t)) * 100)}%;offset-rotate:auto">${dots}</g>`;
  }
  if (isStatic) {
    const [px, py] = firstPoint(pathD);
    return `<g class="${cls}" transform="translate(${n1(px)} ${n1(py)})">${dots}</g>`;
  }
  return `<g class="${cls}">${dots}<animateMotion dur="${dur}s" repeatCount="indefinite" rotate="auto" path="${pathD}"/></g>`;
}

/** The path `d` of a curved (electron-pushing) arrow from (fx,fy) to (tx,ty). bulge: how far the middle of the curve sits off the
 *  straight line, in px; positive bulges to the right of the direction of travel on screen, negative to the left. */
export function arrowPathD(fx, fy, tx, ty, bulge = 30) {
  const mx = (fx + tx) / 2, my = (fy + ty) / 2;
  const dx = tx - fx, dy = ty - fy;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L; // right-hand normal on a y-down screen is (-dy, dx)/L
  const cx = mx + nx * bulge * 2, cy = my + ny * bulge * 2;
  return `M${n1(fx)} ${n1(fy)}Q${n1(cx)} ${n1(cy)} ${n1(tx)} ${n1(ty)}`;
}

/** A curved arrow (path plus its own arrow head, no <marker> needed). Colour: opts.color 'electron' (default) | 'accent' | 'bad' | 'ink'. */
export function curvedArrow(fx, fy, tx, ty, opts = {}) {
  const { bulge = 30, color = 'electron', width = 2.5, head = 11, cls = 'g-arrow' } = opts;
  const col = pick(color, 'electron');
  const mx = (fx + tx) / 2, my = (fy + ty) / 2;
  const dx = tx - fx, dy = ty - fy;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const cx = mx + nx * bulge * 2, cy = my + ny * bulge * 2;
  const d = `M${n1(fx)} ${n1(fy)}Q${n1(cx)} ${n1(cy)} ${n1(tx)} ${n1(ty)}`;
  // head direction = tangent at the end of the quadratic = end - control
  const tdx = tx - cx, tdy = ty - cy;
  const tl = Math.hypot(tdx, tdy) || 1;
  const ux = tdx / tl, uy = tdy / tl;
  // pull the line back so it does not poke through the head
  const bx = tx - ux * head * 0.8, by = ty - uy * head * 0.8;
  const dLine = `M${n1(fx)} ${n1(fy)}Q${n1(cx)} ${n1(cy)} ${n1(bx)} ${n1(by)}`;
  const hx1 = tx - ux * head + -uy * head * 0.5, hy1 = ty - uy * head + ux * head * 0.5;
  const hx2 = tx - ux * head - -uy * head * 0.5, hy2 = ty - uy * head - ux * head * 0.5;
  return `<g class="${cls}" data-d="${d}"><path d="${dLine}" fill="none" stroke="${col}" stroke-width="${width}" stroke-linecap="round"/>` +
    `<path d="M${n1(tx)} ${n1(ty)}L${n1(hx1)} ${n1(hy1)}L${n1(hx2)} ${n1(hy2)}Z" fill="${col}" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>` +
    '</g>';
}

/** A dashed bond that is forming (teal, dashes flow towards the second atom) or breaking (coral, dashes flow away). */
export function bondGhost(x1, y1, x2, y2, opts = {}) {
  const { state = 'forming', static: isStatic = false, cls = 'g-ghost' } = opts;
  const forming = state !== 'breaking';
  const col = forming ? C.accent : C.bad;
  const flow = isStatic ? '' : `<animate attributeName="stroke-dashoffset" from="0" to="${forming ? -22 : 22}" dur="1.2s" repeatCount="indefinite"/>`;
  return `<line class="${cls} is-${forming ? 'forming' : 'breaking'}" x1="${n1(x1)}" y1="${n1(y1)}" x2="${n1(x2)}" y2="${n1(y2)}" stroke="${col}" stroke-width="3" stroke-dasharray="${forming ? '8 5' : '3 7'}" stroke-linecap="round" stroke-opacity="0.9">${flow}</line>`;
}

/** All builders by name (the scene widget looks glyphs up here when a storyboard names one). */
export const GLYPHS = { piCloud, pOrbital, lonePair, sigmaStar, bromonium, surface, facesLabel, electronPair, curvedArrow, bondGhost };
