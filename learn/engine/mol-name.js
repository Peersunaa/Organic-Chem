// Accessible names for drawn molecules (pure; needs RDKit ready). describeMol(smiles) -> a short phrase for a screen reader and for the visually hidden text of an image option:
// the generated IUPAC name when the naming engine can name the molecule (engine/naming-chain.js), else the formula plus what makes the molecule different from its isomers
// (ring or chain, the groups and the kind of carbon they sit on). Stereocentres add their R / S labels, so a meso compound and a racemate with the same name still read differently.
import { analyze, rdkit } from './chem.js';
import { formulaOf } from './skeletal.js';
import { nameAny } from './naming-chain.js';

const KIND = (n) => (n <= 1 ? 'primary' : n === 2 ? 'secondary' : n === 3 ? 'tertiary' : 'quaternary');

/** R / S labels of the stereocentres, in atom order (RDKit's CIP labeller), or ''. */
function cipLabels(smiles) {
  if (!/@/.test(smiles)) return '';
  let m = null;
  try {
    m = rdkit().get_mol(smiles);
    if (!m || !m.get_stereo_tags) return '';
    const tags = JSON.parse(m.get_stereo_tags()).CIP_atoms || [];
    const labs = tags.map((t) => String(t[1]).replace(/[()]/g, '')).filter((x) => x === 'R' || x === 'S');
    return labs.length ? `stereocentres ${labs.join(' and ')}` : '';
  } catch (e) { return ''; } finally { if (m) m.delete(); }
}

/** Indices of aromatic atoms (RDKit's own perception: the rdkitRepresentation extension of its JSON), or an empty set. */
function aromaticSet(smiles) {
  const out = new Set();
  let m = null;
  try {
    m = rdkit().get_mol(smiles);
    const ext = (JSON.parse(m.get_json()).molecules[0].extensions || []).find((e) => e.name === 'rdkitRepresentation');
    ((ext && ext.aromaticAtoms) || []).forEach((i) => out.add(i));
  } catch (e) { /* none */ } finally { if (m) m.delete(); }
  return out;
}

/** Ring count and the groups of a molecule that has no generated name. */
function features(smiles) {
  const info = analyze(smiles);
  if (!info) return [];
  const arom = aromaticSet(smiles);
  const atoms = info.atoms.filter((a) => a.z !== 1), n = atoms.length, bonds = info.bonds.length;
  const rings = bonds - n + 1;                                // one connected molecule
  const nC = atoms.filter((a) => a.sym === 'C').length;
  const out = [];
  const say = (s) => { if (s && !out.includes(s)) out.push(s); };
  const benz = arom.size >= 6 ? 1 : 0;
  say(benz ? 'a benzene ring' : '');
  const other = rings - benz;
  say(other > 0 ? `${other > 1 ? other + ' more rings' : 'a ring'}, ${nC} carbons` : benz ? `${nC} carbons` : `a chain of ${nC} carbons`);
  const isC = (i) => info.atoms[i].sym === 'C';
  const bo = (i, j) => { const b = info.bonds.find((x) => (x.atoms[0] === i && x.atoms[1] === j) || (x.atoms[0] === j && x.atoms[1] === i)); return b ? (b.bo ?? 1) : 0; };
  const cn = (a) => a.nbrs.filter(isC).length;
  const onC = (c) => (arom.has(c.idx) ? 'a ring carbon' : c.nbrs.some((j) => isC(j) && bo(c.idx, j) === 2) ? 'a C=C carbon' : `a ${KIND(cn(c))} carbon`);
  for (const a of atoms) {
    if (['F', 'Cl', 'Br', 'I'].includes(a.sym) && a.nbrs.length === 1) say(`${a.sym} on ${onC(info.atoms[a.nbrs[0]])}`);
    else if (a.sym === 'O') {
      if (a.nbrs.length === 2 && a.nbrs.every(isC)) say(info.atoms[a.nbrs[0]].nbrs.includes(a.nbrs[1]) ? 'an epoxide O' : 'an ether O');
      else if (a.nbrs.length === 1 && a.impH >= 1) {
        const c = info.atoms[a.nbrs[0]];
        if (!c.nbrs.some((j) => j !== a.idx && info.atoms[j].sym === 'O' && bo(c.idx, j) === 2)) say(`OH on ${onC(c)}`);
      }
    } else if (a.sym === 'N') say(a.fc > 0 ? 'a nitro group' : 'an amine N');
    else if (a.sym === 'S') say('sulfur');
    if (a.sym === 'C') {
      const dO = a.nbrs.find((j) => info.atoms[j].sym === 'O' && bo(a.idx, j) === 2);
      if (dO !== undefined) {
        const hasOH = a.nbrs.some((j) => info.atoms[j].sym === 'O' && j !== dO && info.atoms[j].impH >= 1);
        const rest = a.nbrs.filter((j) => isC(j));
        const kind = hasOH ? 'carboxylic acid' : a.impH >= 1 ? 'aldehyde' : 'ketone';
        say(kind === 'ketone' ? 'a ketone C=O' : `${kind === 'aldehyde' ? 'an' : 'a'} ${kind}${rest.length === 1 ? ' on ' + onC(info.atoms[rest[0]]) : ''}`);
      }
    }
  }
  const cc = info.bonds.filter((b) => !(arom.has(b.atoms[0]) && arom.has(b.atoms[1])) && b.bo === 2 && isC(b.atoms[0]) && isC(b.atoms[1]));
  if (cc.length) {
    const conj = cc.length > 1 && cc.some((x, i) => cc.some((y, j) => j > i && x.atoms.some((p) => y.atoms.some((q) => bo(p, q) === 1))));
    say(cc.length === 1 ? 'a C=C' : `${cc.length} C=C bonds, ${conj ? 'conjugated' : 'not conjugated'}`);
  }
  if (info.bonds.some((b) => b.bo === 3)) say('a C≡C');
  return out;
}

function describeOne(smiles) {
  let name = null;
  try { name = nameAny(smiles, 'new'); } catch (e) { name = null; }
  const stereo = cipLabels(smiles);
  if (name) return stereo ? `${name}, ${stereo}` : name;
  let f = '';
  try { f = formulaOf(smiles); } catch (e) { f = ''; }
  let feat = [];
  try { feat = features(smiles); } catch (e) { feat = []; }
  const head = f ? `formula ${f}` : 'structure';
  return [head].concat(feat, stereo ? [stereo] : []).join(', ');
}

/** "name" for one molecule; several molecules (a dot-separated SMILES) read "A and B". */
export function describeMol(smiles) {
  const parts = String(smiles || '').split('.').filter(Boolean);
  if (!parts.length) return '';
  return parts.map(describeOne).join(' and ');
}

/** The distinct text for every drawn option of a step: describeMol of each, with a word added when two come out identical (it never returns two equal names). */
export function describeAll(list) {
  const base = list.map((s) => { try { return describeMol(s); } catch (e) { return ''; } });
  const count = {}; base.forEach((b) => { count[b] = (count[b] || 0) + 1; });
  const seen = {};
  return base.map((b) => { if (count[b] < 2) return b; seen[b] = (seen[b] || 0) + 1; return `${b}, drawing ${seen[b]} of ${count[b]}`; });
}
