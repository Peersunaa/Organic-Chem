// RDKit loader + chemistry helpers. Works in the browser and in Node (tests).
export const VALENCE = { H: 1, C: 4, N: 5, O: 6, F: 7, Cl: 7, Br: 7, I: 7, S: 6, P: 5, B: 3, Li: 1, Mg: 2, Al: 3, Fe: 3 }; // Al and Fe (Lesson 13): FeBr3 / AlCl3 are neutral with 3 bonds and no lone pairs; FeBr4- / AlCl4- have 4 bonds and charge -1
export const SYMBOL = { 1: 'H', 3: 'Li', 5: 'B', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 12: 'Mg', 13: 'Al', 15: 'P', 16: 'S', 17: 'Cl', 26: 'Fe', 35: 'Br', 53: 'I' };
export const NAME = { H: 'Hydrogen', C: 'Carbon', N: 'Nitrogen', O: 'Oxygen', F: 'Fluorine', Cl: 'Chlorine', Br: 'Bromine', I: 'Iodine', S: 'Sulfur', P: 'Phosphorus', B: 'Boron', Li: 'Lithium', Mg: 'Magnesium', Al: 'Aluminum', Fe: 'Iron' };
export const GROUP = { H: 1, C: 14, N: 15, O: 16, F: 17, Cl: 17, Br: 17, I: 17, S: 16, P: 15, B: 13, Li: 1, Mg: 2, Al: 13, Fe: 8 };

// Pauling electronegativities (McMurry Fig. 1.14). Bond polarity is always computed from this table.
export const ENEG = { H: 2.1, Li: 1.0, Mg: 1.2, B: 2.0, C: 2.5, N: 3.0, O: 3.5, F: 4.0, Cl: 3.0, Br: 2.8, I: 2.5, S: 2.5, P: 2.1 };
/** Rough bond classes from the electronegativity difference. */
export function bondClass(diff) { const d = Math.round(diff * 100) / 100; return d < 0.5 ? 'nonpolar' : d <= 2 ? 'polar' : 'ionic'; }

/** Electron groups on an atom = atoms bonded to it (incl. implicit H) + lone pairs. 4 sp3, 3 sp2, 2 sp. */
export function groupCount(a) { return a.nbrs.length + a.impH + a.lp; }
export function hybridOf(a) { const g = groupCount(a); return g === 4 ? 'sp3' : g === 3 ? 'sp2' : g === 2 ? 'sp' : null; }
/** sigma = one per bond (any order) incl. bonds to implicit H; pi = extra bonds beyond the first. */
export function sigmaPi(info) {
  const sigma = info.bonds.length + info.atoms.reduce((s, a) => s + a.impH, 0);
  const pi = info.bonds.reduce((s, b) => s + ((b.bo ?? 1) - 1), 0);
  return { sigma, pi };
}

let R = null;
let loading = null;

function loadScript(src) {
  return new Promise((res, rej) => {
    if (typeof window.initRDKitModule === 'function') return res();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => res();
    s.onerror = () => rej(new Error('Could not load RDKit'));
    document.head.appendChild(s);
  });
}

export function ready() {
  if (R) return Promise.resolve(R);
  if (loading) return loading;
  loading = (async () => {
    if (typeof window === 'undefined') {
      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);
      R = await require('../vendor/RDKit_minimal.js')();
    } else {
      await loadScript(new URL('../vendor/RDKit_minimal.js', import.meta.url).href);
      R = await window.initRDKitModule({ locateFile: () => new URL('../vendor/RDKit_minimal.wasm', import.meta.url).href });
    }
    return R;
  })();
  return loading;
}

export function rdkit() { if (!R) throw new Error('RDKit not ready'); return R; }

/** Canonical SMILES (explicit H atoms folded away) or null if invalid. Accepts SMILES or molblock. */
export function canon(input) {
  let m = null;
  try { m = rdkit().get_mol(input); } catch (e) { m = null; }
  if (!m) return null;
  let s = null;
  try { s = m.get_smiles(); } finally { m.delete(); }
  for (let i = 0; i < 3 && s && s.includes('[H]') && s.length > 5; i++) {
    const m2 = rdkit().get_mol(s);
    if (!m2) break;
    try { s = m2.get_smiles(); } finally { m2.delete(); }
  }
  return s;
}

/** Per-atom facts computed from RDKit atom data. */
export function analyze(smiles, opts = {}) {
  // opts.keepHs: keep explicit H atoms as atoms (SMILES like [H]O[H], or a molblock with H) instead of folding them into impH
  const m = opts.keepHs ? rdkit().get_mol(smiles, JSON.stringify({ removeHs: false })) : rdkit().get_mol(smiles);
  if (!m) return null;
  try {
    const j = JSON.parse(m.get_json()).molecules[0];
    const defAtom = { z: 6, impHs: 0, chg: 0 };
    const atoms = j.atoms.map((a, idx) => {
      const z = a.z ?? defAtom.z;
      const sym = SYMBOL[z];
      return { idx, z, sym, V: VALENCE[sym], fc: a.chg ?? 0, impH: a.impHs ?? 0, bondSum: 0, nbrs: [] };
    });
    for (const b of j.bonds || []) {
      const [x, y] = b.atoms;
      const bo = b.bo ?? 1;
      atoms[x].bondSum += bo; atoms[y].bondSum += bo;
      atoms[x].nbrs.push(y); atoms[y].nbrs.push(x);
    }
    for (const a of atoms) {
      a.bondSum += a.impH;
      a.lp = (a.V - a.fc - a.bondSum) / 2;
      a.electrons = 2 * a.lp + 2 * a.bondSum;
    }
    const heavy = atoms.filter((a) => a.z !== 1);
    const netCharge = atoms.reduce((s, a) => s + a.fc, 0);
    const totalValence = atoms.reduce((s, a) => s + a.V + a.impH, 0) - netCharge;
    return { atoms, heavy, netCharge, totalValence, bonds: j.bonds || [] };
  } finally { m.delete(); }
}

/** 2D coordinates (molblock units, y up) for the heavy atoms, scaled so a bond is ~1. */
export function coords2d(smiles) {
  const m = rdkit().get_mol(smiles);
  if (!m) return null;
  try {
    m.set_new_coords();
    const lines = m.get_molblock().split('\n');
    const n = parseInt(lines[3].slice(0, 3), 10);
    const out = [];
    for (let i = 0; i < n; i++) {
      const l = lines[4 + i];
      out.push({ x: parseFloat(l.slice(0, 10)) / 1.5, y: parseFloat(l.slice(10, 20)) / 1.5 });
    }
    return out;
  } finally { m.delete(); }
}

const COLORS = { '#FF0000': 'var(--c-O, #d33)', '#0000FF': 'var(--c-N, #36c)', '#33CCCC': 'var(--c-F, #2aa)', '#00CC00': 'var(--c-Cl, #2a2)', '#FFCC33': 'var(--hl, #fc3)', '#CC00FF': 'var(--c-P, #a2c)' };

/**
 * Drawing style for depictions. 'full' = every atom written out (C labels + all H),
 * used before skeletal structures are taught (Lessons 1–3). 'skeletal' = normal
 * line drawing. A lesson sets it with `drawing: 'full' | 'skeletal'`.
 */
let drawStyle = 'full';
export function setDrawStyle(s) { drawStyle = s === 'skeletal' ? 'skeletal' : 'full'; }
export function getDrawStyle() { return drawStyle; }

/** Themed RDKit depiction (no hardcoded black/white). */
export function svg(smiles, opts = {}) {
  const { width = 200, height = 140, highlight = [], style = drawStyle } = opts;
  const R = rdkit();
  // Lesson 11: opts.raw draws a structure RDKit would refuse (a carbon with five bonds, for the 'not a valid resonance form' traps), without sanitising it
  let m = opts.raw ? R.get_mol(smiles, JSON.stringify({ sanitize: false })) : R.get_mol(smiles);
  if (!m) return '';
  try {
    const details = { width, height, bondLineWidth: 2, padding: 0.12, addAtomIndices: false };
    if (style === 'full' && !opts.raw) {
      // add explicit H atoms (heavy-atom indices stay the same, so highlights still match)
      const mb = m.add_hs();
      const h = R.get_mol(mb, JSON.stringify({ removeHs: false }));
      if (h) {
        m.delete(); m = h;
        const labels = {};
        JSON.parse(m.get_json()).molecules[0].atoms.forEach((a, i) => { if ((a.z ?? 6) === 6) labels[i] = a.chg && opts.showCharge ? 'C<sup>' + (a.chg > 0 ? (a.chg > 1 ? a.chg : '') + '+' : (a.chg < -1 ? -a.chg : '') + '-') + '</sup>' : 'C'; });
        // opts.showCharge keeps the charge of a charged carbon (carbocations, carbanions); off by default so the formal-charge exercises of Lessons 1-3 do not show their answer
        details.atomLabels = labels;
      }
    }
    if (opts.rotate) details.rotate = opts.rotate; // Lesson 16: draw the same molecule turned in the plane of the page
    if (highlight.length) { details.atoms = highlight; details.highlightColour = [1, 0.8, 0.2]; details.highlightRadius = 0.45; }
    let s = m.get_svg_with_highlights(JSON.stringify(details));
    // highlights as a soft translucent ring so the atom underneath stays readable
    s = s.replace(/<ellipse([^>]*?)style='[^']*'/g, "<ellipse$1style='fill:var(--hl, #fc3);fill-opacity:0.28;stroke:var(--hl, #fc3);stroke-width:2px;stroke-opacity:0.9'");
    s = s.replace(/<\?xml[^>]*\?>/, '')
      .replace(/<rect [^>]*fill:#FFFFFF[^>]*>\s*<\/rect>/, '')
      .replace(/width='\d+(\.\d+)?px' height='\d+(\.\d+)?px'/, '')
      .replace(/#000000/g, 'currentColor');
    for (const k of Object.keys(COLORS)) s = s.split(k).join(COLORS[k]);
    return s;
  } finally { m.delete(); }
}

/**
 * Skeletal depiction for tapping atoms. Every heavy atom is "highlighted" while RDKit lays the molecule out so the
 * positions we read back (from the highlight ellipses) match the final drawing exactly; the ellipses are then removed.
 * Returns { svg, pts:[{x,y}] in percent of the drawing, w, h }.
 */
export function svgPick(smiles, opts = {}) {
  const { width = 300, height = 200 } = opts;
  const m = opts.keepHs ? rdkit().get_mol(smiles, JSON.stringify({ removeHs: false })) : rdkit().get_mol(smiles);
  if (!m) return null;
  try {
    const n = m.get_num_atoms();
    const details = { width, height, bondLineWidth: 2, padding: 0.12, addAtomIndices: false, atoms: [...Array(n).keys()], highlightRadius: 0.2 };
    if (opts.molBlockWedging) details.useMolBlockWedging = true; // Lesson 15: draw the wedge and dash bonds exactly as written in the molblock
    let s = m.get_svg_with_highlights(JSON.stringify(details));
    const pts = [];
    s = s.replace(/<ellipse cx='([\d.]+)' cy='([\d.]+)'[^>]*class='atom-(\d+)'[^>]*\/>/g, (all, x, y, i) => { pts[Number(i)] = { x: (Number(x) / width) * 100, y: (Number(y) / height) * 100 }; return ''; });
    s = s.replace(/<\?xml[^>]*\?>/, '').replace(/<rect [^>]*fill:#FFFFFF[^>]*>\s*<\/rect>/, '').replace(/width='\d+(\.\d+)?px' height='\d+(\.\d+)?px'/, '').replace(/#000000/g, 'currentColor');
    for (const k of Object.keys(COLORS)) s = s.split(k).join(COLORS[k]);
    return { svg: s, pts, w: width, h: height };
  } finally { m.delete(); }
}
