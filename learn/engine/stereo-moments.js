// Piece 4 (3D stereo toggle): the lesson steps where the 3D shape decides the answer, each with a solid model from data/3d/models.js
// (made by tools/gen3d.py) and a short "what to look at" caption. The "See it in 3D" button under the mechanism player looks a step up here.
// `shows` says what the model demonstrates, and tests/stereo-moments.mjs checks it against the real 3D geometry:
//   planar = the cationic carbon is flat; bridged = the Br+ bonds to both ring carbons; cis / trans = the two substituents on the ring lie on the same / opposite faces.
// `contrast` is an optional second model (shown side by side) with its own caption and `shows`.
export const STEREO_MOMENTS = [
  {
    id: 'planar-carbocation', lesson: '09', step: 's08', title: 'The flat carbocation',
    model: 'methylcyclohexyl-cation', shows: 'planar',
    caption: 'Look at the + carbon: the three bonds to it lie in one flat plane. Br⁻ can land on the top face or the bottom face, so both products form.'
  },
  {
    id: 'bromonium-backside', lesson: '10', step: 's04', title: 'Bromonium ion: attack from behind',
    model: 'bromonium-cyclohexene', shows: 'bridged',
    caption: 'The Br⁺ makes a bridge across both carbons on one face of the ring. Br⁻ can only come in from the other face, straight behind the C–Br⁺ bond.',
    contrast: {
      model: 'trans-1-2-dibromocyclohexane', shows: 'trans',
      caption: 'Result: the two Br atoms sit on opposite faces of the ring (trans). That is anti addition.'
    }
  },
  {
    id: 'syn-hydrogenation', lesson: '10', step: 's06', title: 'H₂ / Pd adds to one face (syn)',
    model: 'cis-1-2-dimethylcyclohexane', shows: 'cis',
    caption: 'Both new H atoms arrive on the same face, so the two CH₃ groups end up on the same side of the ring: the cis product.',
    contrast: {
      model: 'trans-1-2-dimethylcyclohexane', shows: 'trans',
      caption: 'For contrast, the trans isomer has its CH₃ groups on opposite faces. Syn addition of H₂ does not make this one.'
    }
  },
  {
    id: 'epoxide-same-face', lesson: '10', step: 's09', title: 'The epoxide O bridges one face',
    model: 'cis-2-3-epoxybutane', shows: 'cis',
    caption: 'The O adds to both carbons from the same face, so nothing else moves. The cis alkene gives this cis epoxide, with both CH₃ on the same side of the ring.'
  },
  {
    id: 'syn-diol', lesson: '10', step: 's12', title: 'Syn diol: both OH on one face',
    model: 'cis-cyclohexane-1-2-diol', shows: 'cis',
    caption: 'KMnO₄ in base puts both OH groups on the same face of the ring. Look for the two O atoms on the same side: this is the cis diol.'
  }
];
