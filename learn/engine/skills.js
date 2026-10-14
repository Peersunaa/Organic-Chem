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
  'conjugate-pairs': { label: 'Acids, bases & conjugate pairs', rule: 'A Brønsted–Lowry acid donates H⁺ and a base accepts it. The acid minus H⁺ is its conjugate base; the base plus H⁺ is its conjugate acid.' },
  'pka-direction': { label: 'pKa & equilibrium direction', rule: 'A smaller pKa means a stronger acid and a weaker conjugate base. An equilibrium favours the side with the weaker acid (the higher pKa).' },
  'curved-arrows': { label: 'Curved arrows', rule: 'A curved arrow starts at electrons (a lone pair or a bond) and points to the atom that receives them. It never starts at an atom without electrons, such as H⁺.' },
  'lewis-acid-base': { label: 'Lewis acids & bases', rule: 'A Lewis base donates an electron pair (it has a lone pair). A Lewis acid accepts one (an atom short of an octet, or a positive ion).' },
  'skeletal': { label: 'Skeletal structures', rule: 'In a skeletal drawing there is a C at every corner and line end. Hydrogens on carbon are not drawn: each carbon has 4 minus (lines into it) H, and a double bond counts as 2 lines. Atoms other than C and H are always written.' },
  'functional-groups': { label: 'Functional groups', rule: 'A functional group is a small unit of atoms with its own chemistry. Look at what is on the C=O carbon (H, C, O or N) and what the O or N is bonded to.' },
  'naming': { label: 'Naming alkanes & rings', rule: 'Find the parent (the longest chain, or the ring when it is at least as big as any chain on it). Number from the end that gives the first branch the lowest number, name each branch, put the prefixes in alphabetical order (ignoring di-, tri-, sec- and tert-) and write one word with commas and hyphens.' },
  'conformations': { label: 'Conformations & Newman projections', rule: 'Rotation about a C–C single bond changes the conformation, not the molecule. Staggered (each rear bond between two front bonds) is the lowest energy; eclipsed (rear bonds hidden behind front bonds) is the highest. Ethane: 12 kJ/mol barrier = 3 H–H eclipsing pairs × 4.0 kJ/mol.' },
  'chairs': { label: 'Cyclohexane chairs & cis/trans', rule: 'Axial bonds are parallel to the ring axis, equatorial ones point out around the rim. A ring flip swaps them while up stays up. Groups prefer equatorial (1,3-diaxial strain); both can be equatorial for trans-1,2, cis-1,3 and trans-1,4, and otherwise the bigger group goes equatorial.' },
  'ez': { label: 'Alkene naming, cis/trans & E/Z', rule: 'A C=C shows cis/trans only if EACH double-bond carbon has two different groups. Rank the two groups on each carbon by the CIP rules: higher atomic number first; on a tie compare the sets of atoms attached (never a sum); a double bond counts its far atom twice. Higher-ranked groups on the same side = Z, on opposite sides = E.' },
  'electron-count-total': { label: 'Total valence electrons', rule: 'Add each atom’s valence electrons (H 1, C 4, N 5, O 6, halogens 7). Subtract 1 for each + charge, add 1 for each − charge.' }
};
export function skillLabel(s) { return (SKILLS[s] && SKILLS[s].label) || s; }
export function skillRule(s) { return (SKILLS[s] && SKILLS[s].rule) || ''; }
