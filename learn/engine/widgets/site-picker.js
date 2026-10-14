// Widget: site-picker. Tap the nucleophilic or electrophilic atom on a molecule; graded from the site table (engine/mechanisms.js SITES),
// every item shows its reason after a correct tap, every wrong tap gets a specific diagnosis computed from the atom's own facts.
//
// config: { items: [{ id: 'water', role: 'nuc' | 'elec' }, ...] }   (ids are keys of SITES; a round of several molecules per step)
import { svgPick, analyze, NAME, rdkit } from '../chem.js';
import { SITES, siteRules } from '../mechanisms.js';

const ROLE_WORD = { nuc: 'nucleophilic', elec: 'electrophilic' };

/** Atoms a perfect learner may tap for this item and role. */
export function solution(item) { return SITES[item.id][item.role].atoms.slice(); }

function facts(smiles, idx) {
  const m0 = rdkit().get_mol(smiles, JSON.stringify({ removeHs: false }));
  const mb = m0.add_hs(); m0.delete();
  const a = analyze(mb, { keepHs: true }).atoms[idx];
  return a;
}

/** Grade one tap. Returns {ok, why?, diagnosis?}. */
export function grade(item, idx) {
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
    return { ok: false, diagnosis: `That ${a.sym} is the ${ROLE_WORD[other]} end, the opposite of what you are looking for. ${S[other] ? reason : reason[0].toUpperCase() + reason.slice(1) + '.'} A ${ROLE_WORD[item.role]} site is ${item.role === 'nuc' ? 'electron-rich: a lone pair, a π bond or a negative charge' : 'electron-poor: positive, δ+, or short of an octet'}.` };
  }
  return { ok: false, diagnosis: `This ${el.toLowerCase()} atom has ${lpTxt}${a.fc ? ' and a ' + (a.fc > 0 ? '+' : '−') + ' charge' : ''}, and nothing makes it ${item.role === 'nuc' ? 'electron-rich' : 'electron-poor'}. A ${ROLE_WORD[item.role]} site is ${item.role === 'nuc' ? 'electron-rich: a lone pair, a π bond or a negative charge' : 'electron-poor: positive, δ+, or short of an octet'}.` };
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
      ask.innerHTML = `<span class="ed-count">${k + 1} of ${config.items.length}</span> Tap the <b>${ROLE_WORD[item.role]}</b> atom of <b>${S.label}</b>.`;
      const stage = document.createElement('div');
      stage.className = 'gf-stage sp-stage';
      stage.innerHTML = pick.svg;
      stage.querySelector('svg')?.setAttribute('role', 'img');
      stage.querySelector('svg')?.setAttribute('aria-label', `${S.label}. Tap an atom.`);
      const msg = document.createElement('p');
      msg.className = 'sp-msg'; msg.setAttribute('aria-live', 'polite');
      const row = document.createElement('div');
      row.className = 'lb-actions';
      root.append(ask, stage, msg, row);
      let settled = false;
      pick.pts.forEach((p, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'gf-atom';
        b.style.left = p.x + '%'; b.style.top = p.y + '%';
        b.setAttribute('aria-label', `${NAME[info.atoms[i].sym]} atom of ${S.label}`);
        b.dataset.atom = String(i);
        b.addEventListener('click', () => {
          if (settled || locked) return;
          const r = grade(item, i);
          if (r.ok) {
            settled = true;
            stage.querySelectorAll('.gf-atom').forEach((x) => { x.disabled = true; });
            b.classList.add('lock'); b.setAttribute('aria-pressed', 'true');
            msg.className = 'sp-msg ok'; msg.textContent = r.why;
            const next = document.createElement('button');
            next.type = 'button'; next.className = 'btn primary';
            const last = k === config.items.length - 1;
            next.textContent = last ? 'Done' : 'Next molecule';
            next.addEventListener('click', () => { if (last) { locked = true; next.disabled = true; ctx.onResult({ ok: true }); } else { k++; show(); } });
            row.append(next); next.focus({ preventScroll: true });
          } else {
            b.classList.add('bad');
            msg.className = 'sp-msg bad'; msg.textContent = r.diagnosis;
            ctx.onResult(r);
          }
        });
        stage.append(b);
      });
    }
    show();
    return { destroy() {} };
  }
};
