// Mechanism step player checks (widgets/mechanism-player.js, widgets/mechanism-core.js, the `why` data on every arrow).
//  (1) every mechanism a lesson step plays, plus every mechanism the reaction lab and the generators can build, has a `why` on EVERY arrow:
//      a non-empty string of one or two sentences, at most 160 characters, that names the destination atom (or both atoms of the new bond) in words or symbols;
//  (2) applying the arrows ONE AT A TIME from `before` is legal at every point (whole lone pairs, charge conserved) and ends at `after`;
//      partialState(step, 0) is the drawn scene and partialState(step, k) is what applying the first k arrows gives;
//  (3) the fallback (no `why`: the step's label) and the player's promises, read from its source (Back / Next / Auto, slow 2.4 s / normal 1.4 s hold, reduced motion,
//      onResult after the last arrow), and its CSS (focus rings, 44 px targets, tokens only).
// Run on its own with `node learn/tests/player.mjs`, or as part of run.mjs.
import { ready, canon } from '../engine/chem.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../lessons/index.js';
import * as R from '../engine/reactions.js';
import * as M from '../engine/mechanisms.js';
import * as MC from '../engine/widgets/mechanism-core.js';
import { WIDGETS } from '../engine/widgets/index.js';
import { buildMolblock } from '../engine/widgets/lewis-core.js';
import { lpCount } from '../engine/widgets/arrow-core.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NAMES = { H: 'hydrogen', C: 'carbon', N: 'nitrogen', O: 'oxygen', S: 'sulfur', F: 'fluorine', Cl: 'chlorine', Br: 'bromine', I: 'iodine', Fe: 'iron', Al: 'aluminum', B: 'boron' };
const mentions = (text, el) => new RegExp(`(^|[^A-Za-z])${el}(?![a-z])`).test(text) || new RegExp(NAMES[el] || '@@', 'i').test(text);
const sentences = (t) => t.trim().split(/(?<=[.!?])\s+(?=[A-ZΠ(])/).filter(Boolean);

/** Every mechanism the course can play, with where it comes from. */
function collect() {
  const out = [];
  const add = (src, f) => { try { const m = f(); if (m) out.push({ src, mech: m }); } catch (e) { /* an excluded substrate: not a mechanism the course plays */ } };
  for (const L of LESSONS) for (const s of L.steps) if (s.widget === 'mechanism-player') add(`lesson ${L.id} ${s.id}`, () => s.config.mech);
  for (const [id, m] of Object.entries(M.MECH)) add(`MECH ${id}`, () => m);
  for (const a of M.HX_ALKENES) for (const X of ['Cl', 'Br']) add(`hxMechanism ${a.label} + H${X}`, () => M.hxMechanism(a.smiles, X));
  // the reaction lab: every alkene x HX / hydration, both orientations (the minor path too), the halogens, the dienes, the alkynes, benzene
  for (const a of R.LAB_ALKENES) {
    const sites = R.alkeneSites(a.smiles);
    if (!sites.ok) continue;
    const [p, q] = sites.carbons;
    for (const id of R.REAGENT_IDS) for (const [hC, pC] of [[p, q], [q, p]]) add(`buildMechanism ${a.id} ${id} ${hC}`, () => R.buildMechanism(a.smiles, id, hC, pC));
  }
  for (const a of ['C=C', 'C1=CCCCC1', 'C/C=C/C', 'CC1=CCCCC1']) for (const X of ['Br', 'Cl']) add(`halogenMechanism ${a} ${X}`, () => R.halogenMechanism(a, X));
  for (const d of R.LAB_DIENES) for (const X of ['Cl', 'Br', 'I']) for (const route of ['1,2', '1,4']) for (const orient of ['a1', 'a4']) add(`dieneMechanism ${d.id} H${X} ${route} ${orient}`, () => R.dieneMechanism(d.smiles, 'H' + X, route, orient));
  for (const a of R.LAB_ALKYNES) for (const X of ['Cl', 'Br', 'I']) add(`alkyneHXMechanism ${a.id} ${X}`, () => R.alkyneHXMechanism(a.smiles, X));
  for (const rx of ['CBr', 'CCBr', 'CCCI', 'CCCl']) add(`acetylideAlkylationMechanism C#C ${rx}`, () => R.acetylideAlkylationMechanism('C#C', rx));
  add('acetylideAlkylationMechanism propyne', () => R.acetylideAlkylationMechanism('CC#C', 'CBr'));
  for (const id of R.EAS_IDS) for (const halide of id === 'RCl' ? R.ALKYL_HALIDES : id === 'RCOCl' ? R.ACYL_HALIDES : [null]) add(`easMechanism ${id} ${halide || ''}`, () => R.easMechanism(id, halide));
  return out;
}

export async function player({ ok, eq }) {
  await ready();
  const all = collect();
  const seen = new Set();
  const uniq = all.filter(({ mech }) => { const k = JSON.stringify(mech.steps.map((s) => [s.before, s.arrows, s.after])); if (seen.has(k)) return false; seen.add(k); return true; });
  const lessonMechs = all.filter((x) => x.src.startsWith('lesson'));
  eq(lessonMechs.length, 11, 'eleven lesson steps play a mechanism (L08 x2, L09 x2, L10, L11 x2, L12 x2, L13 x2)');
  ok(uniq.length >= 100, `the course builds ${uniq.length} distinct mechanisms to check (at least 100)`);
  let arrows = 0;

  for (const { src, mech } of uniq) {
    mech.steps.forEach((st, n) => {
      const t = `${src} step ${n + 1}`;
      const sc = MC.buildScene(st);
      const cfg = MC.stepConfig(st);
      // ---- (1) why on every arrow
      st.arrows.forEach((ar, k) => {
        arrows++;
        const w = ar.why;
        const tt = `${t} arrow ${k + 1}`;
        ok(typeof w === 'string' && w.trim().length > 0, `${tt} has a why`);
        if (typeof w !== 'string') return;
        ok(w.length <= 160, `${tt} why is at most 160 characters (${w.length}): ${w}`);
        const ns = sentences(w).length;
        ok(ns >= 1 && ns <= 2, `${tt} why is one or two sentences (${ns}): ${w}`);
        ok(w === w.trim() && !/\s{2,}/.test(w) && /[.)]$/.test(w), `${tt} why is tidy and ends with a full stop: ${w}`);
        // it names where the electrons go
        const dest = ar.to.atom != null ? [sc.atoms[ar.to.atom].el] : [...new Set(ar.to.bond.map((i) => sc.atoms[i].el))];
        for (const el of dest) ok(mentions(w, el), `${tt} why names the destination ${el}: ${w}`);
        eq(MC.whyOf(st, k), w, `${tt} the player shows the arrow's own why`);
      });
      // ---- (2) one arrow at a time
      const p0 = MC.partialState(st, 0);
      eq(p0.atoms.map((a) => [a.el, a.charge || 0]), cfg.atoms.map((a) => [a.el, a.charge || 0]), `${t} partialState(0) is the drawn scene (elements and charges)`);
      eq(p0.bonds.map((b) => [b.a, b.b, b.order]), cfg.bonds.map((b) => [b.a, b.b, b.order || 1]), `${t} partialState(0) has the drawn bonds`);
      const q0 = cfg.atoms.reduce((s, a) => s + (a.charge || 0), 0);
      for (let k = 1; k <= st.arrows.length; k++) {
        const pk = MC.partialState(st, k);
        ok(pk.lp.every((v) => Number.isInteger(v) && v >= 0), `${t} after arrow ${k} every atom has a whole, non-negative number of lone pairs`);
        eq(pk.atoms.reduce((s, a) => s + a.charge, 0), q0, `${t} after arrow ${k} the total charge is unchanged`);
        ok(pk.atoms.every((a, i) => a.x === cfg.atoms[i].x && a.y === cfg.atoms[i].y), `${t} after arrow ${k} no atom has moved (the picture only changes where the electrons do)`);
        ok(pk.bonds.every((b) => b.order >= 1), `${t} after arrow ${k} bond orders are legal`);
        // the arrow that was just played starts on electrons that exist in the picture before it
        const prev = MC.partialState(st, k - 1);
        const ar = st.arrows[k - 1];
        if (ar.from.lp != null) ok(lpCount(prev.atoms, prev.bonds, ar.from.lp) >= 1, `${t} arrow ${k} starts on a lone pair that is there`);
        else ok(prev.bonds.some((b) => (b.a === ar.from.bond[0] && b.b === ar.from.bond[1]) || (b.a === ar.from.bond[1] && b.b === ar.from.bond[0])), `${t} arrow ${k} starts on a bond that is there`);
      }
      const last = MC.partialState(st, st.arrows.length);
      const got = MC.canonFlat(buildMolblock({ atoms: last.atoms, bonds: last.bonds }));
      eq(got, MC.canonFlat(st.after.join('.')), `${t} playing the arrows one at a time reaches after`);
      // the fallback when a step has no why
      const bare = { ...st, arrows: st.arrows.map((a) => ({ from: a.from, to: a.to })) };
      eq(MC.whyOf(bare, 0), st.label, `${t} without a why the player shows the step's label`);
    });
  }

  // ---- the shared texts
  ok(Object.values(MC.WHY).every((v) => typeof v === 'string' || typeof v === 'function'), 'the shared why texts are strings or functions');
  ok(/more H/.test(MC.WHY.MORE_H) && /fewer H/.test(MC.WHY.FEWER_H), 'the regiochemistry texts say which carbon gets the H');

  // ---- HX: the minor orientation never claims "more H"
  {
    const pred = R.predict('CC=C', 'HBr');
    const minor = pred.minor;
    ok(minor && !/more H/.test(minor.mech.steps[0].arrows[0].why) && /fewer H/.test(minor.mech.steps[0].arrows[0].why), 'propene + HBr: the minor path says the H goes to the carbon with FEWER H');
    ok(pred.major[0].mech.steps[0].arrows[0].why.includes('more H'), 'propene + HBr: the major path says the H goes to the carbon with more H');
    const sym = R.buildMechanism('CC=CC', 'HBr', 1, 2);
    ok(!/more H|fewer H/.test(sym.steps[0].arrows[0].why), 'but-2-ene + HBr: both ends are alike, so no regiochemistry is claimed');
  }

  // ---- (3) the player, read from its source
  ok(WIDGETS['mechanism-player'] && typeof WIDGETS['mechanism-player'].mount === 'function', 'mechanism-player is registered');
  const src = fs.readFileSync(path.join(HERE, '..', 'engine', 'widgets', 'mechanism-player.js'), 'utf8');
  ok(/'Back'/.test(src) && /'Next'/.test(src) && /'Auto'/.test(src), 'the controls are Back, Next and Auto');
  ok(/slow: 2400/.test(src) && /normal: 1400/.test(src) && /<option value="slow">Slow<\/option><option value="normal" selected>Normal<\/option>/.test(src), 'Auto has a slow (2.4 s) and a normal (1.4 s) hold in a speed select');
  ok(/reduceMotion\(\)/.test(src) && /prefers-reduced-motion/.test(src), 'the player reads prefers-reduced-motion');
  ok(/if \(reduceMotion\(\)\) \{ showState\(j \+ 1, prev\); \}/.test(src), 'under reduced motion a press swaps the state at once (no travelling electrons)');
  ok(/ctx\.onResult\(\{ ok: true \}\)/.test(src) && /n === N - 1 && c === step\.arrows\.length && !reported/.test(src), 'ctx.onResult({ok:true}) fires once, when the last arrow of the last step has played');
  ok(/whyOf\(step/.test(src), 'the why line comes from whyOf (the arrow\'s why, else the step label)');
  ok(/Arrow \$\{k\} of \$\{L\}/.test(src), 'the arrow counter reads "Arrow k of n"');
  ok(/mp-strip/.test(src) && /mp-dot/.test(src), 'the step-progress strip is kept');
  ok(/'Show me this step'/.test(src) && /arrowDraw\.mount\(box, \{ atoms: cfg\.atoms, bonds: cfg\.bonds, arrows: step\.arrows, products: step\.after/.test(src), 'draw mode still grades with arrow-draw against the step\'s arrows');
  const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
  const i0 = html.indexOf('/* mechanism step player'), i1 = html.indexOf('.ed { display: grid');
  ok(i0 > 0 && i1 > i0, 'index.html has the step-player CSS inside the Lesson 08 mechanism block');
  const css = html.slice(i0, i1);
  ok(!/#[0-9a-fA-F]{3,6}\b/.test(css), 'the player CSS uses the colour tokens only (no hex colours)');
  ok(/focus-visible/.test(css) && /min-height: 44px/.test(css), 'the player CSS has focus rings and 44 px touch targets');
  ok(/prefers-reduced-motion/.test(css) && /max-width: 460px/.test(css), 'the player CSS handles reduced motion and a 400 px screen');
  ok(!/@import|font-family\s*:\s*['"]/.test(css), 'the player CSS adds no new fonts');
  return { mechanisms: uniq.length, arrows };
}

// run alone: node learn/tests/player.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  const r = await player({ ok, eq });
  console.log(`player: ${r.mechanisms} distinct mechanisms, ${r.arrows} arrows checked; ${pass} checks passed, ${fail} failed`);
  if (fail) { failures.slice(0, Number(process.env.NFAIL || 40)).forEach((f) => console.log(' FAIL ' + f)); process.exit(1); }
}
