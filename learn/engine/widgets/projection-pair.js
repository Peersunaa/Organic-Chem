// Widget: projection-pair (practice generator "stereo-projections"). Two drawings of a stereoisomer, each in its own projection (wedge-dash, Fischer,
// Newman, or just a name), and four answers: the same chiral compound / the same meso compound / enantiomers / diastereomers.
// config: { a, b, options:[{id,text}], whys:{id:'diagnosis'}, answer, readouts:{a,b} }   (everything is computed by engine/generators-stereo-projections.js:
//   the answer from R/S per centre and the meso check, never from how alike the pictures look; whys holds one diagnosis per wrong option).
// A drawing: { style:'wedge', smiles, rotate } | { style:'fischer', n:1, d } | { style:'fischer', n:2, stack } | { style:'newman', front, back, frontName, backName } | { style:'name', text }.
import { svg } from '../chem.js';
import { fischerSvg } from './fischer-quiz.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (x) => Math.round(x * 100) / 100;
const cls = (label) => (label === 'OH' ? 'fq-O' : label === 'NH₂' ? 'fq-N' : label === 'Cl' ? 'fq-Cl' : label === 'Br' ? 'fq-Br' : '');

/** A Fischer projection with two stacked centres: the vertical chain runs top to bottom, horizontal bonds point toward you, the chain bonds away. */
export function stackSvg(stack) {
  const C = 120, ys = stack.rows.map((_, k) => 98 + k * 92), last = ys[ys.length - 1];
  const p = [`<svg class="fq-svg pj-stack" viewBox="0 0 240 ${last + 128}" role="img" aria-label="Fischer projection: top ${esc(stack.top)}; ${stack.rows.map((r, k) => `centre ${k + 1} left ${esc(r.left)}, right ${esc(r.right)}`).join('; ')}; bottom ${esc(stack.bottom)}" xmlns="http://www.w3.org/2000/svg">`];
  p.push(`<line class="fq-bond" x1="${C}" y1="${ys[0] - 46}" x2="${C}" y2="${last + 46}"/>`);
  p.push(`<text class="fq-lab ${cls(stack.top)}" x="${C}" y="${ys[0] - 54}" text-anchor="middle">${esc(stack.top)}</text>`);
  stack.rows.forEach((r, k) => {
    const y = ys[k];
    p.push(`<line class="fq-bond" x1="${C - 50}" y1="${y}" x2="${C + 50}" y2="${y}"/><circle class="fq-core" cx="${C}" cy="${y}" r="3"/>`);
    p.push(`<text class="fq-lab ${cls(r.left)}" x="${C - 58}" y="${y + 6}" text-anchor="end">${esc(r.left)}</text>`);
    p.push(`<text class="fq-lab ${cls(r.right)}" x="${C + 58}" y="${y + 6}" text-anchor="start">${esc(r.right)}</text>`);
  });
  p.push(`<text class="fq-lab ${cls(stack.bottom)}" x="${C}" y="${last + 70}" text-anchor="middle">${esc(stack.bottom)}</text>`);
  p.push('</svg>');
  return p.join('');
}

/** A Newman projection from the drawn screen angles (degrees, counter-clockwise from the right): front bonds meet in the middle, rear bonds start at the circle. */
export function newmanSvg(dr) {
  const CX = 110, CY = 100, R = 38, BEND = 66, LAB = 80;
  const pol = (ang, r) => [CX + r * Math.cos((ang * Math.PI) / 180), CY - r * Math.sin((ang * Math.PI) / 180)];
  const anchor = (ang) => { const c = Math.cos((ang * Math.PI) / 180); return c > 0.2 ? 'start' : c < -0.2 ? 'end' : 'middle'; };
  const lab = (g, which) => {
    const [x, y] = pol(g.ang, LAB), a = anchor(g.ang);
    const dy = Math.sin((g.ang * Math.PI) / 180) > 0.6 ? -2 : Math.sin((g.ang * Math.PI) / 180) < -0.6 ? 12 : 5;
    return `<text class="pj-nlab ${which} ${cls(g.label)}" x="${num(x)}" y="${num(y + dy)}" text-anchor="${a}">${esc(g.short || g.label)}</text>`;
  };
  const p = [`<svg class="pj-newman" viewBox="0 0 220 200" role="img" aria-label="Newman projection looking from ${esc(dr.frontName)} to ${esc(dr.backName)}. Front carbon ${dr.front.map((g) => esc(g.label)).join(', ')}. Rear carbon ${dr.back.map((g) => esc(g.label)).join(', ')}." xmlns="http://www.w3.org/2000/svg">`];
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R}" class="nw-ring"/>`);
  dr.back.forEach((g) => { const [x1, y1] = pol(g.ang, R), [x2, y2] = pol(g.ang, BEND); p.push(`<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}" class="nw-bond back"/>`); });
  dr.front.forEach((g) => { const [x2, y2] = pol(g.ang, BEND); p.push(`<line x1="${CX}" y1="${CY}" x2="${num(x2)}" y2="${num(y2)}" class="nw-bond front"/>`); });
  p.push(`<circle cx="${CX}" cy="${CY}" r="3.2" class="nw-c"/>`);
  dr.back.forEach((g) => p.push(lab(g, 'back')));
  dr.front.forEach((g) => p.push(lab(g, 'front')));
  p.push('</svg>');
  return p.join('');
}

/** The picture (or name card) of one drawing, as markup. */
export function drawingMarkup(dr) {
  if (dr.style === 'wedge') return svg(dr.smiles, { width: 230, height: 170, style: 'skeletal', rotate: dr.rotate || 0 });
  if (dr.style === 'fischer') return dr.n === 1 ? fischerSvg(dr.d, { label: 'Fischer projection' }) : stackSvg(dr.stack);
  if (dr.style === 'newman') return newmanSvg(dr);
  return `<div class="pj-name" role="img" aria-label="Name: ${esc(dr.text)}"><span>${esc(dr.text)}</span></div>`;
}
export function drawingCaption(dr, tag) {
  const what = dr.style === 'wedge' ? 'wedge-dash drawing' : dr.style === 'fischer' ? 'Fischer projection' : dr.style === 'newman' ? `Newman projection, ${dr.frontName} in front` : 'name only';
  const extra = dr.style === 'newman' ? `<br><span class="nr-key"><i class="k-front"></i> ${esc(dr.frontName)} front <i class="k-back"></i> ${esc(dr.backName)} rear</span>` : '';
  return `<b>${tag}</b> · ${what}${extra}`;
}

export default {
  id: 'projection-pair',
  mount(host, config, ctx = { onResult() {}, onProgress() {} }) {
    host.innerHTML = '';
    const root = el('div', 'pj'); host.append(root);
    const ask = el('p', 'pj-ask muted small', config.ask || 'Write down the R or S letter of every stereocentre in each drawing, then compare the letters. The pictures can look alike or unlike for the wrong reason.');
    const figs = el('div', 'rd-figs pj-figs');
    const opts = el('div', 'opts pj-opts'); opts.setAttribute('role', 'group');
    root.append(ask, figs, opts);
    const caps = {};
    const fig = (dr, tag) => {
      const f = el('figure', 'rd-fig pj-fig');
      f.append(el('div', 'pj-box', drawingMarkup(dr)));
      caps[tag] = el('figcaption', '', drawingCaption(dr, tag));
      f.append(caps[tag]);
      return f;
    };
    figs.append(fig(config.a, 'A'), el('span', 'rd-vs', 'and'), fig(config.b, 'B'));
    let wrong = 0, locked = false;
    const reveal = () => {
      ['a', 'b'].forEach((k) => { const c = caps[k.toUpperCase()]; if (c && config.readouts) c.append(el('span', 'pj-read', ' ' + config.readouts[k])); });
      locked = true; opts.querySelectorAll('.opt').forEach((x) => { x.disabled = true; });
    };
    config.options.forEach((o) => {
      const b = el('button', 'opt', esc(o.text)); b.type = 'button'; b.dataset.k = o.id;
      b.addEventListener('click', () => {
        if (locked) return;
        if (o.id === config.answer) {
          b.classList.add('good'); reveal();
          ctx.onResult({ ok: true });
        } else {
          b.classList.add('bad'); b.disabled = true; wrong++;
          if (wrong >= 3) { const right = opts.querySelector(`.opt[data-k="${config.answer}"]`); if (right) right.classList.add('good'); reveal(); }
          ctx.onResult({ ok: false, diagnosis: config.whys[o.id] });
        }
      });
      opts.append(b);
    });
    return { destroy() {} };
  }
};
