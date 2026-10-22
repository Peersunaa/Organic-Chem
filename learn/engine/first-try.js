// First-try scoring (pure, no DOM). A problem counts as right only when the FIRST answer given to it was right. Later tries still teach (the answer is revealed,
// the hints appear) but score 0, and the slip stays in the log. Used by the reaction lab (the "n right" counter), the mastery / practice player (steps.js) and the tests.

/** One problem's attempts. wrong() records a wrong answer; right() records the right one and says whether it COUNTS (true only if nothing was wrong before it). */
export function firstTry() {
  let misses = 0, settled = false, counted = null;
  return {
    wrong() { misses++; return misses; },
    right() { if (!settled) { settled = true; counted = misses === 0; } return counted; },
    get misses() { return misses; },
    get counted() { return counted === true; },
    get slipped() { return misses > 0; }
  };
}

/** A run of problems: how many were answered right on the first try, out of how many were shown. */
export function firstTryTally() {
  let shown = 0, good = 0;
  return {
    add(counted) { shown++; if (counted) good++; },
    get shown() { return shown; },
    get good() { return good; },
    /** "2 of 3 right first try" */
    text() { return `${good} of ${shown} right first try`; }
  };
}
