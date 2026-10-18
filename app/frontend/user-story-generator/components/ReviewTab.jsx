import { useMemo } from 'react';
import { reviewOverview, unitStoryCode } from '../../../../core/review.js';
import { Suggestion } from './Suggestions.jsx';
import { storyLabel } from '../../../../core/model.js';

// Every suggestion of the review in one place: open ones grouped by Area, out-of-date ones (Dismiss only) last.
export default function ReviewTab({ rows, stories, hidden, onOpen, onApply, onDismiss, onUnlock, onAcceptAll }) {
  const { sections, outOfDate, openCount } = useMemo(() => reviewOverview(rows, stories), [rows, stories]);
  const byCode = useMemo(() => new Map(stories.filter((s) => s.code).map((s) => [s.code, s])), [stories]);

  const heading = (unit) => {
    const story = byCode.get(unitStoryCode(unit));
    return (
      <div className="suggestion-story">
        {story
          ? <button type="button" className="link-btn" onClick={() => onOpen(story.id)}>{`${story.code} ${storyLabel(story)}`}</button>
          : <span className="muted">{unitStoryCode(unit) ?? 'New story'}</span>}
      </div>
    );
  };
  const entry = (unit) => (
    <Suggestion key={unit.key} unit={unit} stories={stories} heading={heading(unit)} onApply={onApply} onDismiss={onDismiss} onUnlock={onUnlock} />
  );

  return (
    <section id="reviewView" className="card review-view" role="tabpanel" aria-labelledby="tabReview" hidden={hidden}>
      <div className="row">
        <h2>{`Review suggestions (${openCount} open)`}</h2>
        <button type="button" id="acceptAllReviewBtn" disabled={!openCount} onClick={() => onAcceptAll(sections.flatMap((s) => s.units))}>Accept all</button>
      </div>
      {!openCount && !outOfDate.length && <p className="muted">Nothing to review.</p>}
      {sections.filter((s) => s.units.length).map((s) => (
        <div key={s.area} className="review-section">
          <div className="row">
            <h3>{`${s.area} (${s.units.length})`}</h3>
            <button type="button" onClick={() => onAcceptAll(s.units)}>{`Accept all ${s.area}`}</button>
          </div>
          <div className="suggestion-list">{s.units.map(entry)}</div>
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
