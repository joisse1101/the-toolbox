import { useMemo } from 'react';
import type { ReviewUnit } from '#shared/review/review.ts';
import type { ReviewRow, Story } from '#shared/types.ts';
import { reviewOverview, unitStoryCode } from '#shared/review/review.ts';
import { Suggestion } from '#frontend/src/tools/backlog/shared/Suggestions.tsx';
import { storyLabel } from '#shared/backlog/model.ts';
import TabHeader from '#frontend/src/shared/ui/TabHeader.tsx';
import EmptyState from '#frontend/src/shared/ui/EmptyState.tsx';
import { useConfirm } from '#frontend/src/shared/hooks/useConfirm.ts';
import { Row } from '#frontend/src/shared/ui/Layout.tsx';

// Every suggestion of the review in one place: open ones grouped by Area, out-of-date ones (Dismiss only) last.
interface ReviewTabProps {
  rows: ReviewRow[];
  stories: Story[];
  hidden: boolean;
  onOpen: (id: number) => void;
  onApply: (unit: ReviewUnit) => void;
  onDismiss: (unit: ReviewUnit) => void;
  onAcceptAll: (units: ReviewUnit[]) => unknown;
  onClear: () => void;
}

export default function ReviewTab({ rows, stories, hidden, onOpen, onApply, onDismiss, onAcceptAll, onClear }: ReviewTabProps) {
  const ask = useConfirm();
  const { sections, outOfDate, openCount } = useMemo(() => reviewOverview(rows, stories), [rows, stories]);
  const byCode = useMemo(() => new Map(stories.filter((s) => s.code).map((s) => [s.code, s])), [stories]);

  // Clear all removes every row, open, applied and dismissed alike, so the dialog says how many go.
  const clearAll = async () => {
    const noun = rows.length === 1 ? 'suggestion' : 'suggestions';
    const message = `${rows.length} review ${noun} will be removed from the review file, ${openCount} of them still open.\n\nThis cannot be undone.`;
    if (await ask({ title: `Clear all ${rows.length} ${noun}?`, message, confirmLabel: 'Clear all', danger: true })) onClear();
  };

  const heading = (unit: ReviewUnit) => {
    const code = unitStoryCode(unit);
    const story = code ? byCode.get(code) : undefined;
    return (
      <div className="suggestion-story">
        {story
          ? <button type="button" className="link-btn" onClick={() => onOpen(story.id)}>{`${story.code} ${storyLabel(story)}`}</button>
          : <span className="muted">{unitStoryCode(unit) ?? 'New story'}</span>}
      </div>
    );
  };
  const entry = (unit: ReviewUnit) => (
    <Suggestion key={unit.key} unit={unit} stories={stories} heading={heading(unit)} onApply={onApply} onDismiss={onDismiss} />
  );

  return (
    <section id="reviewView" className="card review-view" role="tabpanel" aria-labelledby="tabReview" hidden={hidden}>
      <TabHeader title={`Review suggestions (${openCount} open)`}>
        {(openCount > 0 || outOfDate.length > 0) && (
          <>
            <button type="button" id="acceptAllReviewBtn" disabled={!openCount} onClick={() => onAcceptAll(sections.flatMap((s) => s.units))}>Accept all</button>
            <button type="button" id="clearAllReviewBtn" disabled={!rows.length} onClick={clearAll}>Clear all</button>
          </>
        )}
      </TabHeader>
      {!openCount && !outOfDate.length && <EmptyState title="Nothing to review" help="Run /jois-story:review to get suggestions for your stories." />}
      {sections.filter((s) => s.units.length).map((s) => (
        <div key={s.area} className="review-section">
          <Row>
            <h3>{`${s.area} (${s.units.length})`}</h3>
          </Row>
          <div className="suggestion-list">{s.units.map(entry)}</div>
          <button type="button" onClick={() => onAcceptAll(s.units)}>{`Accept all ${s.area}`}</button>
        </div>
      ))}
      {outOfDate.length > 0 && (
        <div className="review-section">
          <h3>{`Out of date (${outOfDate.length})`}</h3>
          <div className="suggestion-list">{outOfDate.map(entry)}</div>
        </div>
      )}
    </section>
  );
}
