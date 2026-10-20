// Widget: site-picker. Tap the nucleophilic or electrophilic atom on a molecule; graded from the site table (engine/mechanisms.js SITES),
// every item shows its reason after a correct tap, every wrong tap gets a specific diagnosis computed from the atom's own facts.
//
// config: { items: [{ id: 'water', role: 'nuc' | 'elec' }, ...], words?: 'names' | 'rich' }   (ids are keys of SITES; a round of several molecules per step)
//   words:'rich' (Lesson 08, before the names are taught) asks for the "electron-rich" / "electron-poor" atom and words every diagnosis that way.
// A wrong tap's diagnosis goes to the step's feedback box only (ctx.onResult), never twice; a right tap shows its reason here and clears that box (ctx.onProgress).
// Every tappable atom wears a faint dashed ring, so a learner can see the letters are buttons.
import { svgPick, analyze, NAME, rdkit } from '../chem.js';
import { SITES, siteRules } from '../mechanisms.js';
import { lonePairGroup } from '../lp-draw.js';

const WORDS = { names: { nuc: 'nucleophilic', elec: 'electrophilic' }, rich: { nuc: 'electron-rich', elec: 'electron-poor' } };
const NEED = { nuc: 'electron-rich: a lone pair, a π bond or a negative charge', elec: 'electron-poor: positive, δ+, or short of an octet' };

/** Atoms a perfect learner may tap for this item and role. */
export function solution(item) { return SITES[item.id][item.role].atoms.slice(); }

function facts(smiles, idx) {
  const m0 = rdkit().get_mol(smiles, JSON.stringify({ removeHs: false }));
  const mb = m0.add_hs(); m0.delete();
  const a = analyze(mb, { keepHs: true }).atoms[idx];
  return a;
}

/** Grade one tap. Returns {ok, why?, diagnosis?}. `words` = 'names' (default) or 'rich'. */
export function grade(item, idx, words = 'names') {
  const ROLE_WORD = WORDS[words] || WORDS.names;
  const S = SITES[item.id];
  const want = S[item.role];
  if (want.atoms.includes(idx)) return { ok: true, why: want.why };
  const a = facts(S.smiles, idx);
  const el = NAME[a.sym];
  const rules = siteRules(S.smiles);
  const other = item.role === 'nuc' ? 'elec' : 'nuc';
  const lpTxt = a.lp > 0 ? `${a.lp} lone pair${a.lp === 1 ? '' : 's'}` : 'no lone pair';
  if (rules[other].includes(idx) && !rules[item.role].includes(idx)) {
    const reason = S[other] ? S[other].why : item.role === 'nuc' ? 'it is electron-poor: δ+ or short of electrons' : 'it is electron-rich: it has a lone pair or a negative charge';
    const site = words === 'rich' ? `An ${ROLE_WORD[item.role]} atom has ${item.role === 'nuc' ? 'a lone pair, a π bond or a negative charge' : 'a + or δ+ charge, or fewer than eight electrons'}.` : `A ${ROLE_WORD[item.role]} site is ${NEED[item.role]}.`;
    return { ok: false, diagnosis: `That ${a.sym} is the ${ROLE_WORD[other]} end, the opposite of what you are looking for. ${S[other] ? reason : reason[0].toUpperCase() + reason.slice(1) + '.'} ${site}` };
  }
  const site = words === 'rich' ? `An ${ROLE_WORD[item.role]} atom has ${item.role === 'nuc' ? 'a lone pair, a π bond or a negative charge' : 'a + or δ+ charge, or fewer than eight electrons'}.` : `A ${ROLE_WORD[item.role]} site is ${NEED[item.role]}.`;
  return { ok: false, diagnosis: `This ${el.toLowerCase()} atom has ${lpTxt}${a.fc ? ' and a ' + (a.fc > 0 ? '+' : '−') + ' charge' : ''}, and nothing makes it ${item.role === 'nuc' ? 'electron-rich' : 'electron-poor'}. ${site}` };
}

export default {
  id: 'site-picker',
  mount(host, config, ctx) {
    host.innerHTML = '';
    let k = 0, locked = false;
    const root = document.createElement('div');
    root.className = 'sp';
    host.append(root);

    function show() {
      root.innerHTML = '';
      const item = config.items[k];
      const S = SITES[item.id];
      const keep = S.smiles.includes('[H]');
      const pick = svgPick(S.smiles, { width: 300, height: 190, keepHs: keep });
      const info = analyze(S.smiles, { keepHs: keep });
      const ask = document.createElement('p');
      ask.className = 'sp-ask';
      const RW = WORDS[config.words] || WORDS.names;
      ask.innerHTML = `<span class="ed-count">${k + 1} of ${config.items.length}</span> Tap the <b>${RW[item.role]}</b> atom of <b>${S.label}</b>.`;
      const stage = document.createElement('div');
      stage.className = 'gf-stage sp-stage';
      stage.innerHTML = pick.svg;
      // lone pairs as pairs of dots (the question is about electron pairs, so the picture shows them; they sit in the gaps between the bonds)
      const svgEl = stage.querySelector('svg');
      if (svgEl) svgEl.append(lonePairGroup(pick, info));
      stage.querySelector('svg')?.setAttribute('role', 'img');
      stage.querySelector('svg')?.setAttribute('aria-label', `${S.label}. Tap an atom.`);
      const msg = document.createElement('p');
      msg.className = 'sp-msg'; msg.setAttribute('aria-live', 'polite');
      const row = document.createElement('div');
      row.className = 'lb-actions';
      root.append(ask, stage, msg, row);
      let settled = false;
      // a skeletal drawing shows no letter at a carbon: the button says "C" so the learner knows what it is (novice review 2026-10-20, #2)
      const label = (b, i) => { const a = info.atoms[i]; if (a.sym === 'C' && !a.fc && !keep) { const t = document.createElement('span'); t.className = 'sp-el'; t.textContent = 'C'; t.setAttribute('aria-hidden', 'true'); b.append(t); } };
      // a C=C double bond is a target of its own (either line or the gap between them): the π bond IS the rich site, so tapping it counts as either carbon
      const piBonds = info.bonds.filter((bd) => bd.bo === 2 && bd.atoms.every((j) => info.atoms[j].sym === 'C'));
      if (piBonds.length) ask.innerHTML = ask.innerHTML.replace(/ atom of <b>/, ' atom (or the C=C bond, marked π) of <b>');
      piBonds.forEach((bd) => {
        const [i, j] = bd.atoms, P1 = pick.pts[i], P2 = pick.pts[j];
        if (!P1 || !P2) return;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'gf-atom sp-bond';
        b.style.left = (P1.x + P2.x) / 2 + '%'; b.style.top = (P1.y + P2.y) / 2 + '%';
        b.setAttribute('aria-label', `The C=C double bond (π bond) of ${S.label}`);
        b.innerHTML = '<span class="sp-el" aria-hidden="true">π</span>';
        b.dataset.atom = String(i);
        stage.append(b);
        wireTap(b, i);
      });
      pick.pts.forEach((p, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'gf-atom';
        b.style.left = p.x + '%'; b.style.top = p.y + '%';
        b.setAttribute('aria-label', `${NAME[info.atoms[i].sym]} atom of ${S.label}`);
        b.dataset.atom = String(i);
        label(b, i);
        wireTap(b, i);
        stage.append(b);
      });
      function wireTap(b, i) {
        b.addEventListener('click', () => {
          if (settled || locked) return;
          const r = grade(item, i, config.words);
          if (r.ok) {
            ctx.onProgress?.();
            settled = true;
            stage.querySelectorAll('.gf-atom').forEach((x) => { x.disabled = true; });
            b.classList.add('lock'); b.setAttribute('aria-pressed', 'true');
            msg.className = 'sp-msg ok'; msg.textContent = r.why;
            const next = document.createElement('button');
            next.type = 'button'; next.className = 'btn primary';
            const last = k === config.items.length - 1;
            next.textContent = last ? 'Done' : 'Next molecule';
            next.addEventListener('click', () => { if (last) { locked = true; next.disabled = true; ctx.onResult({ ok: true }); } else { k++; ctx.onProgress?.({ task: true }); show(); } });   // a new molecule: no stale hints
            row.append(next); next.focus({ preventScroll: true });
          } else {
            stage.querySelectorAll('.gf-atom.bad').forEach((x) => x.classList.remove('bad'));
            b.classList.add('bad');
            msg.className = 'sp-msg'; msg.textContent = '';      // the step's feedback box shows the diagnosis (once)
            ctx.onResult(r);
          }
        });
      }
    }
    show();
    return { destroy() {} };
  }
};
