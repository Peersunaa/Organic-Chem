// Reaction tables (engine/tables.js, tables-view.js, route #table; study-guide/_tables_export.mjs for the printable PDFs).
//  (1) sizes: every builder tile of the class is a row, in the builder's order; the columns are the listed builder reagents
//  (2) every row x column pair resolves through react(): the cell's status equals react() and pairs(); ok cells draw products react() made; none/na carry a reason
//  (3) tags: every tag is in the table's allowed set, and it matches the builder's facts (anti only with space anti, cis only with Z, meta only with meta leaders ...)
//  (4) families, skills (skills.js ids) and caveman notes for every ok cell
//  (5) quiz: for every ok cell four drawn options, all different, exactly one right, and the right one is the builder's main product set
//  (6) the export JSON for the PDFs (node study-guide/_tables_export.mjs) equals this page's data; a saved study-guide/_data/tables.json must not be stale
//  (7) wiring: route, home button, builder link, CSS block, the view reads engine/tables.js and the builder's result panel
import { ready, canon, analyze } from '../engine/chem.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from '../engine/builder.js';
import * as TB from '../engine/tables.js';
import { HUB_BY_ID } from '../engine/reaction-hub.js';
import { SKILLS } from '../engine/skills.js';
import { stereoKey } from '../engine/reactions-additions.js';
import { ezInfo } from '../engine/cip.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const REPO = path.join(ROOT, '..');
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const key = (list) => list.map((s) => stereoKey(s)).sort().join('|');
// the halide table's quiz options may be enantiomers of each other (inversion against retention), so its options are compared exactly
const exact = (list) => list.map((s) => canon(s)).sort().join('|');
const els = (s) => analyze(s).atoms;
const count = (s, sym) => els(s).filter((a) => a.sym === sym).length;
const carbons = (s) => count(s, 'C');
const halogens = (s) => els(s).filter((a) => a.sym === 'Br' || a.sym === 'Cl').length;
/** an O bonded to two carbons that are bonded to each other (an epoxide) */
function hasEpoxide(s) {
  const info = analyze(s);
  const bonded = (x, y) => info.atoms[x].nbrs.includes(y);
  return info.atoms.some((a) => a.sym === 'O' && a.nbrs.length === 2 && a.nbrs.every((n) => info.atoms[n].sym === 'C') && bonded(a.nbrs[0], a.nbrs[1]));
}
/** C=O carbons: {ketone: two C neighbours, aldehyde: carries an H} */
function carbonyls(s) {
  const info = analyze(s);
  const out = [];
  info.bonds.forEach((b) => {
    if ((b.bo ?? 1) !== 2) return;
    const [x, y] = b.atoms;
    const c = info.atoms[x].sym === 'C' && info.atoms[y].sym === 'O' ? x : info.atoms[y].sym === 'C' && info.atoms[x].sym === 'O' ? y : -1;
    if (c < 0) return;
    const nC = info.atoms[c].nbrs.filter((n) => info.atoms[n].sym === 'C').length;
    out.push(nC === 2 ? 'ketone' : info.atoms[c].impH > 0 ? 'aldehyde' : 'other');
  });
  return out;
}
const ezLabels = (s) => (ezInfo(s) || []).map((e) => e.label).filter(Boolean);

export async function tables({ ok, eq }) {
  await ready();
  // ---- (1) sizes
  const SIZES = { alkenes: [12, 11], alkynes: [7, 11], rings: [25, 6], halides: [17, 9] };
  for (const T of TB.TABLES) {
    const d = TB.tableData(T.id);
    eq([d.rows.length, d.cols.length], SIZES[T.id], `table ${T.id}: ${SIZES[T.id].join(' x ')}`);
    eq(d.rows.map((r) => r.id), B.SUBSTRATES.filter((s) => s.group === T.group).map((s) => s.id), `table ${T.id}: every builder tile of the class, in order`);
    T.cols.forEach((c) => ok(!!B.REAGENT_BY_ID[c.id], `table ${T.id}: column ${c.id} is a builder reagent`));
    eq(new Set(T.cols.map((c) => c.id)).size, T.cols.length, `table ${T.id}: no repeated column`);
    ok(d.rows.every((r) => r.name && r.name.new && r.name.old), `table ${T.id}: every row has a name in both styles`);
  }

  // ---- (2)-(4) every cell
  const P = new Map(B.pairs().map((p) => [p.smiles + '|' + p.reagent, p.status]));
  const tagCount = {};
  let cells = 0;
  for (const T of TB.TABLES) {
    const d = TB.tableData(T.id);
    const allowed = new Set(TB.TAGS[T.id]);
    for (const row of d.rows) {
      row.cells.forEach((c, i) => {
        const col = d.cols[i];
        const where = `${T.id} ${row.id} + ${col.id}`;
        cells++;
        eq(c.reagent, col.id, `${where}: cell in its column`);
        const res = B.react(row.smiles, col.id);
        eq(c.status, res.status, `${where}: status from react()`);
        eq(c.status, P.get(row.smiles + '|' + col.id), `${where}: status consistent with pairs()`);
        if (c.status !== 'ok') {
          ok(c.reason.length > 10, `${where}: ${c.status} cell has a reason`);
          eq(c.tag, c.status === 'none' ? 'no rxn' : null, `${where}: ${c.status} tag`);
          eq(c.draw.length, 0, `${where}: nothing drawn`);
          return;
        }
        tagCount[T.id + ':' + c.tag] = (tagCount[T.id + ':' + c.tag] || 0) + 1;
        ok(allowed.has(c.tag) && c.tag !== 'no rxn', `${where}: tag "${c.tag}" is allowed`);
        const prods = res.products.map((p) => p.smiles);
        ok(c.draw.length >= 1 && c.draw.length <= 2 && c.draw.every((s) => prods.includes(s) && canon(s) !== null), `${where}: draws 1-2 of react()'s own products`);
        const main = res.products.filter((p) => !p.minor && !p.excess).map((p) => p.smiles);
        ok(c.draw.every((s) => !main.length || main.includes(s)), `${where}: only major products are drawn`);
        const card = HUB_BY_ID[col.card];
        const sp = card.facts.space;
        // tag against the builder's facts
        const D = c.draw;
        switch (c.tag) {
          case 'Markovnikov': ok(res.rule === 'markovnikov' && /^Markovnikov/.test(card.facts.where), `${where}: Markovnikov from the rule and the card`); break;
          case 'anti-Markov.': ok(res.rule === 'anti-markovnikov' && /^Anti-Markovnikov/.test(card.facts.where), `${where}: anti-Markovnikov from the rule and the card`); break;
          case 'anti': ok(sp === 'anti' && res.rule === 'anti-addition', `${where}: anti only when the card's space is anti (${sp})`); break;
          case 'syn': ok(sp === 'syn' && res.rule === 'syn-addition', `${where}: syn only when the card's space is syn (${sp})`); break;
          case 'epoxide': ok(sp === 'syn' && D.every(hasEpoxide), `${where}: epoxide drawn, space syn`); break;
          case 'cleave': ok(res.rule === 'cleavage' && D.every((s) => !hasEpoxide(s)) && (D.length > 1 || carbons(D[0]) <= carbons(row.smiles)), `${where}: cleavage`); break;
          case 'Markov.': ok(res.rule === 'markovnikov' && D.every((s) => halogens(s) === 1), `${where}: one HX, Markovnikov`); break;
          case 'gem': ok(D.every((s) => analyze(s).atoms.some((a) => a.sym === 'C' && a.nbrs.filter((n) => ['Br', 'Cl'].includes(analyze(s).atoms[n].sym)).length === 2) && halogens(s) === 2), `${where}: both X on one carbon`); break;
          case '2×': ok(D.every((s) => halogens(s) === 4), `${where}: two X₂, four X`); break;
          case 'cis': ok(res.rule === 'syn-addition' && sp === 'syn' && D.every((s) => ezLabels(s).every((l) => l === 'Z')), `${where}: cis = syn, any C=C drawn is Z`); break;
          case 'trans': ok(['anti-addition', 'anti-reduction'].includes(res.rule) && D.every((s) => ezLabels(s).every((l) => l === 'E')), `${where}: trans = anti, any C=C drawn is E`); break;
          case 'alkane': ok(D.every((s) => !/[=#]/.test(canon(s))) && res.rule === 'full-reduction', `${where}: alkane, no C=C or C≡C left outside a ring`); break;
          case 'ketone': ok(D.every((s) => carbonyls(s).includes('ketone')), `${where}: ketone drawn`); break;
          case 'aldehyde': ok(res.rule === 'anti-markovnikov' && D.every((s) => carbonyls(s).includes('aldehyde')), `${where}: aldehyde drawn, anti-Markovnikov`); break;
          case 'C–C': ok(res.rule === 'acetylide' && D.every((s) => carbons(s) > carbons(row.smiles)), `${where}: chain grows`); break;
          case 'meta': ok(res.leaders.length && res.leaders.every((g) => g.dir === 'm'), `${where}: meta only with meta-directing leaders`); break;
          case 'o/p': ok(res.leaders.some((g) => g.dir === 'op') && res.products.filter((p) => !p.minor && !p.excess).every((p) => /\b(ortho|para)\b/.test(p.label)), `${where}: o/p leaders, major products ortho or para`); break;
          case 'one isomer': ok(res.products.filter((p) => !p.excess).length === 1, `${where}: one isomer = one product`); break;
          // Chapter 7: the tag is the mechanism(s) decide() names, read from res.rule; substitution products carry no new C=C, elimination products no halogen and the substrate's carbons
          case 'SN2': ok(res.rule === 'sn2' && D.every((s) => canon(s) !== canon(row.smiles)), `${where}: SN2 from the rule`); break;
          case 'SN1': ok(res.rule === 'sn1' && D.every((s) => halogens(s) === 0), `${where}: SN1 from the rule, the halogen is gone`); break;
          case 'SN1+E1': ok(res.rule === 'sn1+e1' && D.every((s) => halogens(s) === 0) && res.products.some((p) => p.minor), `${where}: SN1 and E1 together: the substitution product is drawn, an alkene is minor`); break;
          case 'E2': ok(res.rule === 'e2' && D.every((s) => halogens(s) === 0 && carbons(s) === carbons(row.smiles) && /=/.test(s)), `${where}: E2: an alkene with the substrate's carbons`); break;
          case 'SN2+E2': ok(res.rule === 'sn2+e2' && D.every((s) => halogens(s) === 0 && canon(s) !== canon(row.smiles)) && res.products.some((p) => p.minor), `${where}: SN2 product drawn (the alcohol), the E2 alkene is minor`); break;
          case 'E2+SN2': ok(res.rule === 'e2+sn2' && D.every((s) => halogens(s) === 0 && /=/.test(s)) && res.products.some((p) => p.minor), `${where}: E2 drawn, the SN2 product is minor`); break;
          case 'E1': ok(res.rule === 'e1' && D.every((s) => halogens(s) === 0 && /=/.test(s)), `${where}: E1`); break;
          case 'Grignard': ok(res.rule === 'grignard' && D.every((s) => /\[2H\]/.test(s) && halogens(s) === 0), `${where}: Grignard then D₂O: D replaces the halogen`); break;
          default: ok(false, `${where}: unchecked tag ${c.tag}`);
        }
        ok(c.family === null || !!TB.FAMILY_BY_ID[c.family], `${where}: family is known`);
        eq(c.family, TB.familyOf(c.tag, res.rule), `${where}: family from the tag`);
        ok(!!SKILLS[c.skill], `${where}: skill ${c.skill} is a skills.js id`);
        ok(c.cave.length > 4 && c.cave.length <= 60, `${where}: caveman note (${c.cave.length} chars)`);
        if (c.more) ok(main.length > 2, `${where}: "+N" only when more than two majors`);
      });
    }
  }
  console.log(`  tables: ${cells} cells; tags ${JSON.stringify(tagCount)}`);
  // (E1 alone is an allowed tag of the halide table but no column makes it: heat in a protic solvent gives SN1 and E1 together)
  const NEVER_ALONE = { halides: ['E1'] };
  ok(TB.TABLES.every((T) => TB.TAGS[T.id].filter((x) => x !== 'no rxn' && !(NEVER_ALONE[T.id] || []).includes(x)).every((tg) => tagCount[T.id + ':' + tg])), 'tables: every allowed tag is used at least once (E1 alone excepted in the halide table)');

  // ---- (5) quiz
  const rng = mulberry32(2026);
  let quizzes = 0;
  for (const T of TB.TABLES) {
    for (const row of TB.tableData(T.id).rows) {
      row.cells.forEach((c) => {
        if (c.status !== 'ok') { eq(TB.cellQuiz(row.smiles, c.reagent, rng), null, `quiz ${T.id} ${row.id} + ${c.reagent}: none for a non-reacting pair`); return; }
        const q = TB.cellQuiz(row.smiles, c.reagent, rng);
        const where = `quiz ${T.id} ${row.id} + ${c.reagent}`;
        ok(!!q, `${where}: exists`);
        if (!q) return;
        quizzes++;
        eq(q.options.length, 4, `${where}: four options`);
        eq(q.options.filter((o) => o.correct).length, 1, `${where}: exactly one right`);
        const kx = T.id === 'halides' ? exact : key;
        eq(new Set(q.options.map((o) => kx(o.smiles))).size, q.options.length, `${where}: options all different`);
        ok(q.options.every((o) => o.why && o.smiles.length && o.smiles.every((s) => canon(s) !== null)), `${where}: every option parses and has a why`);
        const res = B.react(row.smiles, c.reagent);
        const m = res.products.filter((p) => !p.minor && !p.excess).map((p) => p.smiles);
        eq(kx(q.options.find((o) => o.correct).smiles), kx(m.length ? m : res.products.map((p) => p.smiles)), `${where}: the right option is the builder's main product set`);
      });
    }
  }
  console.log(`  tables: ${quizzes} quizzes checked`);

  // ---- (6) export for the PDFs
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tbl-'));
    const out = path.join(tmp, 'tables.json');
    execFileSync(process.execPath, [path.join(REPO, 'study-guide', '_tables_export.mjs'), out], { stdio: ['ignore', 'ignore', 'inherit'] });
    const page = JSON.parse(JSON.stringify(TB.exportTables()));
    const exp = JSON.parse(fs.readFileSync(out, 'utf8'));
    eq(JSON.stringify(exp), JSON.stringify(page), 'export: study-guide/_tables_export.mjs gives exactly the page data');
    TB.TABLES.forEach((T) => {
      const d = TB.tableData(T.id), x = page.tables.find((t) => t.id === T.id);
      ok(x.rows.every((r, i) => r.cells.every((c, j) => c.status === d.rows[i].cells[j].status && JSON.stringify(c.draw) === JSON.stringify(d.rows[i].cells[j].draw) && c.tag === d.rows[i].cells[j].tag)), `export ${T.id}: every cell as on the page`);
    });
    const saved = path.join(REPO, 'study-guide', '_data', 'tables.json');
    if (fs.existsSync(saved)) eq(JSON.stringify(JSON.parse(fs.readFileSync(saved, 'utf8'))), JSON.stringify(page), 'export: study-guide/_data/tables.json is current (else rerun python study-guide/build_tables.py)');
  }

  // ---- (7) wiring
  {
    const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const view = fs.readFileSync(path.join(ROOT, 'tables-view.js'), 'utf8');
    const bv = fs.readFileSync(path.join(ROOT, 'builder-view.js'), 'utf8');
    ok(/hash === 'table'/.test(app) && /tablesPage/.test(app), 'wiring: #table route in app.js');
    ok(/id: 'open-tables'/.test(app), 'wiring: home builder panel has the tables button');
    ok(/id: 'bld-tables'/.test(bv), 'wiring: builder page links to the tables');
    ok(html.includes('/* reaction tables */'), 'wiring: the CSS block');
    ok(/TB\.tableData\(/.test(view) && /resultBlocks\(/.test(view) && /TB\.cellQuiz\(/.test(view) && /logMistake/.test(view), 'wiring: the view reads tables.js, the builder result panel, the quiz and the weak-spot log');
    ok(!/['"](?:C|c1)[^'"]*\[N\+\]/.test(view), 'wiring: the view types no SMILES');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pass = 0, fail = 0; const failures = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
  const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
  await tables({ ok, eq });
  console.log(`${pass} passed, ${fail} failed`);
  failures.slice(0, 60).forEach((f) => console.log(' FAIL ' + f));
  process.exit(fail ? 1 : 0);
}
