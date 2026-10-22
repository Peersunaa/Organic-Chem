// Which task families a generator draws from. generate(id, n, { tasks }) pins them (and ignores `skill`); every name must exist in that generator's own task table.
/** `requested` when given (each name checked against `valid`, an array or an object keyed by task), else `fallback`. Throws "unknown task X" for a name the generator does not have. */
export function resolveTasks(requested, fallback, valid) {
  if (!requested || !requested.length) return fallback;
  const ok = Array.isArray(valid) ? valid : Object.keys(valid);
  requested.forEach((t) => { if (!ok.includes(t)) throw new Error('unknown task ' + t); });
  return requested;
}
