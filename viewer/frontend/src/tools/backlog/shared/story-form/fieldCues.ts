// The cues a story form field shows when it has no value: a red (required) or yellow (optional) border, and a note.
// A benched story is parked, so it shows none.
import type { Criterion, Story } from '../../../../../../shared/types.ts';

export const needs = (cls: string | undefined) => (cls === 'missing' ? 'Required' : null);
export const invalid = (cls: string | undefined): 'true' | undefined => (cls === 'missing' ? 'true' : undefined);

export function fieldCues(s: Story) {
  const noValue = (v: unknown) => !s.benched && !String(v ?? '').trim();
  return {
    noValue,
    missing: (key: keyof Story) => (noValue(s[key]) ? 'missing' : undefined),
    partMissing: (key: keyof Story) => (s.rawUserStory === null && noValue(s[key]) ? 'missing' : undefined),
    optional: (key: keyof Story) => (noValue(s[key]) ? 'missing-optional' : undefined),
    criterionMissing: (c: Criterion, key: keyof Criterion) => (s.rawCriteria === null && noValue(c[key]) ? 'missing' : undefined),
  };
}
