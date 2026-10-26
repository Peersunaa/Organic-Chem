# Chapter 7 (Organohalides: SN1, SN2, E1, E2) — design draft

Date: 2026-10-26. Status: DRAFT, awaiting Peera's choice of the first piece. Course outline filed at `study-guide/prof/course-outline.pdf` (+ `.txt`; private, never deployed): McMurry *Fundamentals* 7th ed (the repo PDF is the 7th ed, numbers match), Ch 7 pp. 222-243, assigned problems **7.25, 7.29, 7.30, 7.31, 7.32, 7.34, 7.44, 7.45, 7.51** (these go first in every type's book list). Final = 40%, 2-3 h, covers everything after the midterm (Ch 7, 8, 9, 11, 10, 12, 16, 15, 14 in teaching order); exams use lecture material, readings and the assigned problems. Final covers Ch 7 so far; date unknown. Source: McMurry *Fundamentals* Ch 7 (book problems by number only) and the workbook's NYU items A5.2–A5.3 (SN2 mechanism, rate law, predict product).

## Scope (Peera, 2026-10-26: all of it)
- 7.1 naming alkyl halides; 7.2 preparing them (HX on alkenes, X₂/hν on alkanes, HX / PBr₃ / SOCl₂ on alcohols); 7.3 Grignard reagents (RMgX, their reaction with water / D₂O).
- 7.4–7.6 nucleophilic substitution: SN2 (one step, backside attack, inversion, rate = k[RX][Nu], 1° > 2° ≫ 3°, strong nucleophile, polar aprotic solvent, good leaving group I > Br > Cl) and SN1 (two steps, carbocation, racemisation, rate = k[RX], 3° > 2°, weak nucleophile, polar protic solvent, rearrangements NOT taught unless the outline says so).
- 7.7–7.8 elimination: E2 (one step, strong base, anti-periplanar H and X, Zaitsev more-substituted alkene, chair rule on cyclohexanes: X axial) and E1 (carbocation, weak base, heat, Zaitsev); E1cB only if the outline lists it.
- 7.9 the decision table: substrate class × base/nucleophile strength → SN2 / SN1 / E2 / E1 (and mixtures).
- Out unless the outline says so: E1cB, rearrangements, radical halogenation mechanism detail, biological examples (7.10).

## What the engine must compute (never hand-typed)
New `learn/engine/reactions-halides.js` (same pattern as `reactions-additions.js`):
- `halideSites(smiles)`: the C–X carbon, its class (methyl/1°/2°/3°, allylic/benzylic flags), the β-hydrogens available for elimination, ring membership.
- `predictSN2(RX, Nu)`: Nu replaces X at the same carbon with INVERSION of configuration (stereo-graph edit, graded by canonical isomeric SMILES); refuses 3° and neopentyl, vinyl/aryl halides.
- `predictSN1(RX, Nu)`: carbocation, Nu from either face → racemic pair when a stereocentre forms (both enantiomers accepted); refuses 1°/methyl (and rearranging cases are refused, as in reactions.js).
- `predictE2(RX, base)`: every β-H, Zaitsev ranking (more substituted alkene major; a bulky base like t-BuOK gives Hofmann minor/major switch only if the outline includes it); for cyclohexyl halides the anti-periplanar rule from the chair (uses `chair-core.js` roles: X must be axial; the trans-diaxial H decides which alkene can form).
- `predictE1(RX)`: carbocation then β-H loss, Zaitsev.
- `decide(RX, reagent)`: the 7.9 table → mechanism(s) + major product(s), with the one-line reason ("3° halide + weak nucleophile in a protic solvent: SN1 and E1 compete; SN1 major in the cold").
- Mechanisms in `mechanism-player` format (SN2 one step with the backside attack arrows; SN1 two steps; E2 one step with three arrows; E1 two steps), proven by `checkMechanism`.
- Python check `tools/check_halides.py`: reaction SMARTS + RDKit stereo for SN2 inversion / SN1 racemate / E2 alkene set, 150+ cases; fixture `tests/fixtures/halides.json` hand-checked, names via OPSIN.
- Reagent / nucleophile table `NUCLEOPHILES` (I⁻, Br⁻, Cl⁻, HO⁻, RO⁻, CN⁻, N₃⁻, RS⁻, NH₃, H₂O, ROH, acetate) with strength class, basicity, solvent notes, and `BASES` (HO⁻, RO⁻, t-BuO⁻, NH₂⁻, heat only).

## Pieces (each shipped, tested, published, committed)
1. **Engine + reaction cards.** `reactions-halides.js`, 8 hub cards (SN2 with CN⁻ / I⁻ / HO⁻ / RS⁻, SN1 solvolysis, E2 with NaOEt / t-BuOK, E1 with heat in ethanol, Grignard + D₂O), each with the three facts and the exam pattern; cards wired into `#reactions`, the predict-product drill, the builder and the tables (alkyl halide substrate tab × nucleophile/base reagents).
2. **Lesson 18: Substitution and elimination** (~30 steps, act-first): naming and classes → SN2 mechanism and inversion (3D moment: backside attack) → rate law and the TS → SN1 and racemisation → leaving groups, nucleophiles, solvents → E2, anti-periplanar, chair rule, Zaitsev → E1 → the decision table → Grignard. Mastery generator `halides` (skills `sn2`, `sn1`, `e2`, `e1`, `sub-vs-elim`, `halide-naming`). Caveman twins. Recap card and glossary terms (nucleophile already there; add leaving group, Zaitsev, anti-periplanar, solvolysis, protic/aprotic).
3. **Scenes 20–23:** SN2 backside attack with the umbrella flip, SN1 two-step with both faces, E2 anti-periplanar on a chair, E1. Storyboards in `docs/scenes/`.
4. **Mastery types (#master, group 6 "Substitution and elimination"):** predict-sn2 (with stereo), predict-sn1-racemic, predict-e2-zaitsev (incl. chair cases), which-mechanism (the 7.9 table), mechanism-arrows-sn2-e2, rate-law-and-factors (which change speeds it up), name-alkyl-halide, grignard. Book numbers 7.1–7.23 in-chapter and 7.24–7.65 end-of-chapter mapped by category; `LIVE_STAGE` 5.
5. **Mock paper section B7** (substitution/elimination, 4 q × 3 marks) and the PDF catalogue rebuilt with the new types; past-paper page gains the NYU A5.2/A5.3 items.
6. Student test on a snapshot; fixes; memory + docs.

Estimated effort: pieces 1+2 are the big ones (engine ~1 day of agent time with checks); 3–5 are a day together; 6 half a day.

## Open questions for Peera
- Which piece first (he said "something else" than lesson-first / mastery-first / builder-first)?
- The course outline: does the professor include E1cB, Hofmann (bulky base), rearrangements in SN1/E1, Williamson ether synthesis, or Grignard beyond RMgX + D₂O?
- Final exam date and format (same section letters as the midterm?).
