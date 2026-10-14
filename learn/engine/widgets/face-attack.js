// Widget: face-attack. The bromonium ion of cyclohexene as a solid 3D model (coordinates from data/3d/bromonium-cyclohexene.mol, made by tools/gen3d.py).
// The Br+ bridges two ring carbons on ONE face. Two candidate sites for the incoming Br- are drawn as ghost atoms next to one bridging carbon:
//   A = the same face as the bridge (the front), B = directly opposite the C-Br+ bond (the back). The learner taps the site Br- really uses.
// Both sites are computed from the coordinates (nothing typed). Same viewer as Lesson 06 (view3d.js: 3Dmol/WebGL, or a drag-to-rotate flat projection).
// config: { mol?: 'bromonium-cyclohexene' }.  ctx.onResult({ok:false, diagnosis}) on a wrong tap, ctx.onResult({ok:true}) on the back site.
import models from '../../data/3d/models.js';
import { parseMol, P, sub, add, mul, unit, dot, cross, mean, len, neighbours } from './geom.js';
import { createView } from './view3d.js';

const SITE = '#14a8b6';

/** Pure geometry: ring plane, the face the Br sits on, and the two attack sites. Used by the widget and the tests. */
export function faceModel(molId = 'bromonium-cyclohexene') {
  const mol = parseMol(models[molId].molblock);
  const n = mol.atoms.length;
  const nb = neighbours(mol.bonds, n);
  const br = mol.atoms.findIndex((a) => a.el === 'Br');
  const bridge = nb[br];                                   // the two carbons the bromine bonds to
  const carbons = mol.atoms.map((a, i) => (a.el === 'C' ? i : -1)).filter((i) => i >= 0);
  // ring plane: normal from the bridging C-C direction and the direction to the far ring carbons, signed towards Br
  const far = carbons.filter((i) => !bridge.includes(i));
  const mid = mean(bridge.map((i) => P(mol.atoms[i])));
  const u = unit(sub(P(mol.atoms[bridge[0]]), P(mol.atoms[bridge[1]])));
  const v = sub(mean(far.map((i) => P(mol.atoms[i]))), mid);
  let normal = unit(cross(u, v));
  const centre = mean(carbons.map((i) => P(mol.atoms[i])));
  if (dot(normal, sub(P(mol.atoms[br]), centre)) < 0) normal = mul(normal, -1);
  const target = bridge[0];
  const T = P(mol.atoms[target]), B = P(mol.atoms[br]);
  const back = add(T, mul(unit(sub(T, B)), 2.7));                                // 180 degrees from the C-Br+ bond
  const away = unit(sub(T, P(mol.atoms[bridge[1]])));                              // in the ring plane, away from the other bridging carbon
  const front = add(T, mul(unit(add(mul(normal, 0.7), mul(away, 0.75))), 2.7));   // on the Br face, beside the bridge
  return { mol, br, bridge, target, normal, centre, front, back, T, B };
}

/** A frame that shows the model edge-on at the start: the ring plane normal up, the bridged C-C bond left-right, so the Br is above the ring and the two sites are clearly apart. */
export function viewFrame(m) {
  const ex = unit(sub(m.T, P(m.mol.atoms[m.bridge[1]])));
  const ey = m.normal;
  const exo = unit(sub(ex, mul(ey, dot(ex, ey))));       // make ex exactly perpendicular to the normal
  return { o: m.centre, ex: exo, ey, ez: cross(exo, ey) };
}

export default {
  id: 'face-attack',
  mount(host, config, ctx) {
    const m = faceModel(config.mol || 'bromonium-cyclohexene');
    const nA = m.mol.atoms.length, nB = nA + 1;
    host.innerHTML = '';
    const root = document.createElement('div'); root.className = 'fa';
    const help = document.createElement('p'); help.className = 'lb-help';
    help.textContent = 'Drag to turn the model. The two teal balls are the places where a bromide ion (Br⁻) could attack the highlighted carbon. Tap the one it really uses.';
    const box = document.createElement('div');
    const out = document.createElement('p'); out.className = 'fa-out muted small'; out.setAttribute('aria-live', 'polite');
    root.append(help, box, out);
    host.append(root);
    const fr = viewFrame(m);
    const V = (p) => { const v = sub(p, fr.o); return [dot(v, fr.ex), dot(v, fr.ey), dot(v, fr.ez)]; };   // model coordinates -> the edge-on starting view
    const atoms = m.mol.atoms.map((a) => { const q = V(P(a)); return { el: a.el, x: q[0], y: q[1], z: q[2] }; }).concat([m.front, m.back].map((p) => { const q = V(p); return { el: 'Br', x: q[0], y: q[1], z: q[2] }; }));
    const front = V(m.front), back = V(m.back), Tp = V(m.T), Bp = V(m.B);
    let solved = false;
    const scene = () => ({
      atoms, bonds: m.mol.bonds.map(([i, j]) => [i, j]),
      colors: { [nA]: SITE, [nB]: SITE },
      rings: [m.br],
      lines: [
        { a: front, b: Tp, dashed: true, color: SITE },
        { a: back, b: Tp, dashed: true, color: SITE }
      ],
      labels: [
        { p: add(front, [0, 0.5, 0]), text: 'A' },
        { p: add(back, [0, -0.6, 0]), text: 'B' },
        { p: add(Bp, [0, 0.9, 0]), text: 'Br⁺' }
      ],
      pickable: solved ? null : [nA, nB],
      tags: { [nA]: 'Site A: the same face as the bromine bridge', [nB]: 'Site B: the opposite face, directly behind the carbon–bromine bond' }
    });
    const view = createView(box, {
      label: 'Bromonium ion of cyclohexene, 3D model. Drag to rotate. Tap site A or site B for the incoming bromide.',
      onPick: (i) => {
        if (solved) return;
        if (i === nB) {
          solved = true; view.show(scene());
          out.textContent = 'Site B. It sits 180° from the C–Br⁺ bond, on the face the bromine does not cover. The new Br ends up on the opposite face from the first Br: anti addition.';
          ctx.onResult({ ok: true });
        } else if (i === nA) {
          const d = 'Site A is on the same face as the bridging Br⁺, so the bromine blocks it: Br⁻ cannot get there. It attacks from the opposite face (site B), pushing the C–Br⁺ bond away.';
          out.textContent = d;
          ctx.onResult({ ok: false, diagnosis: d });
        } else {
          const d = 'Tap one of the two teal balls (A or B): they are the two places where the incoming bromide could approach.';
          out.textContent = d;
        }
      }
    });
    view.show(scene());
    return { destroy() { view.destroy(); } };
  }
};
void len;
