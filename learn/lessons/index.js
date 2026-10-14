import l01 from './01-atoms-bonds.js';

export const LESSONS = [l01];

// Locked placeholders (content files arrive later).
export const PLANNED = [
  ['02', 'Shape & hybridization'], ['03', 'Acids, bases & pKa'], ['04', 'Skeletal structures & functional groups'],
  ['05', 'Naming alkanes & rings'], ['06', 'Conformations & chairs'], ['07', 'Alkenes: cis/trans & E/Z'],
  ['08', 'How mechanisms work'], ['09', 'Alkene additions I'], ['10', 'Alkene additions II'],
  ['11', 'Resonance & dienes'], ['12', 'Alkynes'], ['13', 'Benzene & EAS'], ['14', 'Directors & synthesis'],
  ['15', 'Chirality & R/S'], ['16', 'Diastereomers, meso & racemates']
].map(([id, title]) => ({ id, title, locked: true }));
