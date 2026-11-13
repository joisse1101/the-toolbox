// The cues a story form field shows when it has no value: a red (required) or yellow (optional) border, and a note.
// A benched story is parked, so it shows none.
export const needs = (cls) => (cls === 'missing' ? 'Required' : null);
export const invalid = (cls) => (cls === 'missing' ? 'true' : undefined);

export function fieldCues(s) {
  const noValue = (v) => !s.benched && !String(v ?? '').trim();
  return {
    noValue,
    missing: (key) => (noValue(s[key]) ? 'missing' : undefined),
    partMissing: (key) => (s.rawUserStory === null && noValue(s[key]) ? 'missing' : undefined),
    optional: (key) => (noValue(s[key]) ? 'missing-optional' : undefined),
    criterionMissing: (c, key) => (s.rawCriteria === null && noValue(c[key]) ? 'missing' : undefined),
  };
}
