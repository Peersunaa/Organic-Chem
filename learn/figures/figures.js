// Index of the six crafted explainer figures (anatomy-style isometric SVG, one per chapter anchor idea).
// Each file is a self-contained inline-able SVG: viewBox 0 0 640 400, colours from the app's CSS variables with fallbacks,
// motion in CSS keyframes inside the SVG (switched off by prefers-reduced-motion), no scripts, no raster images.
// `lesson` is the chapter's first lesson (where the figure is placed); `beforeStep` is the id of the step the card is shown above (the first step whose idea the figure
// illustrates, never earlier than the figure's vocabulary has been introduced); `hint` is the one-line interaction hint printed in the card.
export const FIGURES = {
  ch1: { file: 'figures/ch1-bonding.svg', title: 'Shell gauge: an atom as a drawer cabinet', hint: 'Empty seats are bonds.', lesson: '01', beforeStep: 's01' },
  ch2: { file: 'figures/ch2-acids.svg', title: 'Acid-base balance: pKa as weights', hint: 'Heavy pan = weak acid.', lesson: '03', beforeStep: 's05' },
  ch3: { file: 'figures/ch3-skeletal.svg', title: 'Plotter: a skeletal chain, every vertex a carbon', hint: 'Hover a vertex: hidden H.', lesson: '04', beforeStep: 's01' },
  ch4: { file: 'figures/ch4-alkene.svg', title: 'Two-stage lock: HBr adds to an alkene', hint: 'Key first, bolt second.', lesson: '09', beforeStep: 's01' },
  ch5: { file: 'figures/ch5-aromatic.svg', title: 'Turnstile: electrophilic aromatic substitution', hint: 'Lit gate = open.', lesson: '13', beforeStep: 's06' },
  ch6: { file: 'figures/ch6-stereo.svg', title: 'Mirror rig: R and S on a turntable', hint: 'Lamp on = H points away.', lesson: '15', beforeStep: 's12' },
};
