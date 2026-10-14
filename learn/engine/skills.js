// Skill labels + generic (but specific-to-the-skill) diagnoses.
export const SKILLS = {
  'valence-electrons': { label: 'Valence electrons', rule: 'Valence electrons are the outer-shell electrons. For a main-group atom that is the last digit of its group number (C is group 14, so 4).' },
  'bond-count': { label: 'Bonds per atom (HONC)', rule: 'Bonds needed = 8 minus valence electrons (H: 2 minus 1). That gives H 1, O 2, N 3, C 4, halogens 1.' },
  'lone-pairs': { label: 'Lone pairs', rule: 'Lone pairs = (valence electrons minus formal charge minus bonds) divided by 2. Each bond uses one of the atom’s electrons.' },
  'octet': { label: 'Octet counting', rule: 'Count 2 electrons for every bond and 2 for every lone pair. Most atoms want 8 around them; hydrogen wants 2.' },
  'multiple-bonds': { label: 'Double and triple bonds', rule: 'When an atom is short of an octet, share more pairs: a lone pair on a neighbour can become a second or third bond.' },
  'formal-charge': { label: 'Formal charge', rule: 'FC = valence e⁻ − lone-pair e⁻ − number of bonds. Owning more electrons than normal is negative; fewer is positive.' },
  'hybridization': { label: 'Hybridization & shape', rule: 'Count electron groups on the atom: atoms bonded to it (a double or triple bond is still one neighbour) plus lone pairs. 4 groups = sp³ (109.5°), 3 = sp² (120°), 2 = sp (180°).' },
  'sigma-pi': { label: 'σ and π bonds', rule: 'Every bond has exactly one σ bond (head-on overlap). A double bond adds one π bond and a triple bond adds two (sideways p overlap). Bonds to H are σ bonds too.' },
  'polarity': { label: 'Bond polarity', rule: 'Compare electronegativities (H 2.1, C 2.5, N 3.0, O 3.5, Cl 3.0, Li 1.0). The more electronegative atom is δ−. A difference under 0.5 is nearly nonpolar.' },
  'electron-count-total': { label: 'Total valence electrons', rule: 'Add each atom’s valence electrons (H 1, C 4, N 5, O 6, halogens 7). Subtract 1 for each + charge, add 1 for each − charge.' }
};
export function skillLabel(s) { return (SKILLS[s] && SKILLS[s].label) || s; }
export function skillRule(s) { return (SKILLS[s] && SKILLS[s].rule) || ''; }
