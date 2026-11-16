import { useEffect, useMemo, useState } from 'react';
import type { BacklogFile, Story } from '#shared/types.ts';
import type { Ask } from '#frontend/src/shared/hooks/useConfirm.ts';
import type { BacklogActions } from '#frontend/src/tools/backlog/shell/useBacklog.ts';
import type { ReviewUnit } from '#shared/review/review.ts';
import { unitsOf, unitStoryCode, openCounts, orphanUnits, reviewOverview, acceptAll as acceptReviewUnits, acceptSummaryText } from '#shared/review/review.ts';
import { useReview } from './useReview.ts';

// Review suggestions for the open backlog (its review file), shown next to the fields they concern: the counts and
// units the Editor needs, Apply, Dismiss and Accept all. (Leaving the Review tab when the file goes away is resolveTab's job, see useTab.)
export function useReviewFlow({ current, stories, backlog, initials, selected, actions, ask }: {
  current: string | null;
  stories: Story[];
  backlog: BacklogFile | null;
  initials: string;
  selected: Story | null;
  actions: BacklogActions;
  ask: Ask;
}) {
  const review = useReview(current);
  const reviewUnits = useMemo(() => unitsOf(review.rows), [review.rows]);
  const suggestionCounts = useMemo(() => openCounts(review.rows, stories), [review.rows, stories]);
  const orphans = useMemo(() => orphanUnits(review.rows, stories), [review.rows, stories]);
  const selectedUnits = selected?.code ? reviewUnits.filter((u) => unitStoryCode(u) === selected.code) : [];
  const applyUnit = (unit: ReviewUnit) => {
    const result = actions.applySuggestions(unit.rows);
    if ('error' in result) review.notify(result.error);
    else review.decide(unit.indexes, 'applied');
  };
  const dismissUnit = (unit: ReviewUnit) => review.decide(unit.indexes, 'dismissed');
  // Accept all (whole review or one Area): confirm with the number a dry run applies, then apply the run as one edit.
  const [acceptSummary, setAcceptSummary] = useState<string | null>(null);
  useEffect(() => setAcceptSummary(null), [current]);
  const acceptUnits = async (units: ReviewUnit[]) => {
    const expected = acceptReviewUnits(stories, units, backlog!.headers, initials).applied.length;
    const noun = `review suggestion${expected > 1 ? 's' : ''}`;
    if (expected && !(await ask({ title: `Apply ${expected} ${noun}?`, message: `${expected} ${noun} will be applied to the backlog.`, confirmLabel: 'Apply' }))) return;
    const { applied, skipped } = actions.acceptAll(units);
    if (applied.length) review.decide(applied.flatMap((u) => u.indexes), 'applied');
    review.notify(null);
    setAcceptSummary(acceptSummaryText(applied.length, skipped));
  };
  const openReviewCount = useMemo(() => reviewOverview(review.rows, stories).openCount, [review.rows, stories]);
  const dismissOrphans = () => review.decide(orphans.flatMap((u) => u.indexes), 'dismissed');
  return { review, suggestionCounts, orphans, selectedUnits, applyUnit, dismissUnit, acceptSummary, acceptUnits, openReviewCount, dismissOrphans };
}
