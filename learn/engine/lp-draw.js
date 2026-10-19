// Lone pairs as pairs of dots on a flat RDKit drawing (the drawings the course uses for questions ABOUT electron pairs: nucleophile sites, formal charge).
// RDKit does not draw lone pairs, so they are laid over the picture in the gaps between the bonds (the same rule as the Lewis builder: engine/widgets/lewis-core.js lonePairAngles).
import { svgPick, analyze } from './chem.js';
import { lonePairAngles } from './widgets/lewis-core.js';

const NS = 'http://www.w3.org/2000/svg';

/** The dots, as an SVG <g> in the viewBox units of a picture that svgPick drew: {pts, w, h} from svgPick, `info` from analyze (same smiles, same keepHs). */
export function lonePairGroup(pick, info) {
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'sp-lps'); g.setAttribute('aria-hidden', 'true'); g.style.pointerEvents = 'none';
  const px = (p) => ({ x: (p.x / 100) * pick.w, y: (p.y / 100) * pick.h });
  info.atoms.forEach((a, i) => {
    if (!pick.pts[i] || a.sym === 'H' || !(a.lp > 0)) return;
    const c = px(pick.pts[i]);
    const angs = info.bonds.filter((b) => b.atoms.includes(i)).map((b) => { const j = b.atoms[0] === i ? b.atoms[1] : b.atoms[0]; const q = px(pick.pts[j]); return Math.atan2(q.y - c.y, q.x - c.x); });
    lonePairAngles(angs, a.lp).forEach((t) => {
      const d = 0.1 * pick.h + 15, ox = -Math.sin(t) * 5.5, oy = Math.cos(t) * 5.5;
      for (const sgn of [1, -1]) {
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', (c.x + Math.cos(t) * d + sgn * ox).toFixed(1)); dot.setAttribute('cy', (c.y + Math.sin(t) * d + sgn * oy).toFixed(1));
        dot.setAttribute('r', '4.2'); dot.setAttribute('fill', 'var(--electron, #cf7f00)');
        g.append(dot);
      }
    });
  });
  return g;
}

/** An SVG string of the molecule with its lone pairs drawn. */
export function svgWithLonePairs(smiles, opts = {}) {
  const pick = svgPick(smiles, { width: opts.width || 220, height: opts.height || 160, keepHs: !!opts.keepHs });
  if (!pick) return '';
  const box = document.createElement('div');
  box.innerHTML = pick.svg;
  const svg = box.querySelector('svg');
  if (svg) svg.append(lonePairGroup(pick, analyze(smiles, { keepHs: !!opts.keepHs })));
  return box.innerHTML;
}
