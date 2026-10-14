import l01 from './01-atoms-bonds.js';
import l02 from './02-shape-hybridization.js';
import l03 from './03-acids-bases.js';
import l04 from './04-skeletal-functional-groups.js';
import l05 from './05-naming-alkanes.js';
import l06 from './06-conformations-chairs.js';
import l07 from './07-alkenes-ez.js';

export const LESSONS = [l01, l02, l03, l04, l05, l06, l07];

// Locked placeholders (content files arrive later).
export const PLANNED = [
  ['08', 'How mechanisms work'], ['09', 'Alkene additions I'], ['10', 'Alkene additions II'],
  ['11', 'Resonance & dienes'], ['12', 'Alkynes'], ['13', 'Benzene & EAS'], ['14', 'Directors & synthesis'],
  ['15', 'Chirality & R/S'], ['16', 'Diastereomers, meso & racemates']
].map(([id, title]) => ({ id, title, locked: true }));
