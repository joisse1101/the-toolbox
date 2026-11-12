import { useEffect, useMemo, useState } from 'react';
import { unitsOf, unitStoryCode, openCounts, orphanUnits, reviewOverview, acceptAll as acceptReviewUnits, acceptSummaryText } from '../../../../logic/review/review.js';
import { useReview } from './useReview.js';

// Review suggestions for the open backlog (its review file), shown next to the fields they concern: the counts and
// units the Editor needs, Apply, Dismiss and Accept all, and leaving the Review tab when the file goes away.
export function useReviewFlow({ current, stories, backlog, initials, selected, view, actions, ask }) {
  const review = useReview(current);
  const reviewUnits = useMemo(() => unitsOf(review.rows), [review.rows]);
  const suggestionCounts = useMemo(() => openCounts(review.rows, stories), [review.rows, stories]);
  const orphans = useMemo(() => orphanUnits(review.rows, stories), [review.rows, stories]);
  const selectedUnits = selected?.code ? reviewUnits.filter((u) => unitStoryCode(u) === selected.code) : [];
  const applyUnit = (unit) => {
    const result = actions.applySuggestions(unit.rows);
    if (result.error) review.notify(result.error);
    else review.decide(unit.indexes, 'applied');
  };
  const dismissUnit = (unit) => review.decide(unit.indexes, 'dismissed');
  // Accept all (whole review or one Area): confirm with the number a dry run applies, then apply the run as one edit.
  const [acceptSummary, setAcceptSummary] = useState(null);
  useEffect(() => setAcceptSummary(null), [current]);
  const acceptUnits = async (units) => {
    const expected = acceptReviewUnits(stories, units, backlog.headers, initials).applied.length;
    const noun = `review suggestion${expected > 1 ? 's' : ''}`;
    if (expected && !(await ask({ title: `Apply ${expected} ${noun}?`, message: `${expected} ${noun} will be applied to the backlog.`, confirmLabel: 'Apply' }))) return;
    const { applied, skipped } = actions.acceptAll(units);
    if (applied.length) review.decide(applied.flatMap((u) => u.indexes), 'applied');
    review.notify(null);
    setAcceptSummary(acceptSummaryText(applied.length, skipped));
  };
  const openReviewCount = useMemo(() => reviewOverview(review.rows, stories).openCount, [review.rows, stories]);
  const dismissOrphans = () => review.decide(orphans.flatMap((u) => u.indexes), 'dismissed');
  // The Review tab only exists while the backlog has a review file; leave it when the file goes away.
  const leaveReview = view === 'review' && !review.exists;
  useEffect(() => {
    if (leaveReview) actions.setView('editor');
  }, [leaveReview, actions]);

  return { review, suggestionCounts, orphans, selectedUnits, applyUnit, dismissUnit, acceptSummary, acceptUnits, openReviewCount, dismissOrphans };
}
