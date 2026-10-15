import { unitState } from '../../../../core/review.js';

const VERB = { replace: 'Suggested', add: 'Add', remove: 'Remove', append: 'Add to Notes', 'add-story': 'New story', unlock: 'Unlock' };

// What a row proposes, as text. Removing a criterion shows the criterion itself, not just its label.
const valueOf = (row) => (row.action === 'remove' && row.field === 'User Acceptance Criteria' ? row.current : row.suggested);

function rowLine(row) {
  if (row.action === 'add-story' || row.action === 'replace' || row.action === 'append') return `${row.storyId} ${row.field}: ${row.suggested}`;
  return `${VERB[row.action]} ${row.field}: ${valueOf(row)}`;
}

// One suggestion unit (a row, or a whole split group): the proposed value, why, and Apply / Dismiss.
// A stale unit explains itself and only offers Dismiss. A unit of a locked story can be dismissed but not applied
// until the story is unlocked. An unlock row offers Unlock (lifts the lock, edits nothing) and Dismiss.
// `heading` adds a line above (the Review tab names the story).
export function Suggestion({ unit, stories, onApply, onDismiss, onUnlock, heading = null }) {
  const { state, why } = unitState(unit, stories);
  const first = unit.rows[0];
  const confirm = unit.rows.some((r) => r.confidence === 'confirm');
  const isGroup = !!unit.group;
  if (first.action === 'unlock') {
    return (
      <div className={`suggestion unlock${state === 'stale' ? ' stale' : ''}`} role="group" aria-label="Suggestion to unlock">
        {heading}
        <div className="suggestion-head">
          <span className="suggestion-kind">Suggest unlocking and reviewing this story</span>
          <span className="suggestion-area">{first.area}</span>
        </div>
        <p className="suggestion-reason">{first.reason}</p>
        {state === 'stale' && <p className="suggestion-why">Out of date: {why}. It can only be dismissed.</p>}
        <div className="suggestion-actions">
          {state !== 'stale' && <button type="button" className="primary" onClick={() => onUnlock(unit)}>Unlock</button>}
          <button type="button" onClick={() => onDismiss(unit)}>Dismiss</button>
        </div>
      </div>
    );
  }
  return (
    <div className={`suggestion${state === 'stale' ? ' stale' : ''}`} role="group" aria-label={isGroup ? `Split suggestion ${unit.group}` : `Suggestion for ${first.field}`}>
      {heading}
      <div className="suggestion-head">
        <span className="suggestion-kind">{isGroup ? 'Suggested split' : `${VERB[first.action]}: ${first.field}`}</span>
        <span className="suggestion-area">{first.area}</span>
        {confirm && <span className="suggestion-confirm" title="A proposed default: check it before applying">check this default</span>}
      </div>
      {isGroup ? (
        <ul className="suggestion-rows">
          {unit.rows.map((r, i) => <li key={i}>{rowLine(r)}</li>)}
        </ul>
      ) : (
        <pre className="suggestion-value">{valueOf(first)}</pre>
      )}
      <p className="suggestion-reason">{first.reason}</p>
      {state === 'stale' && <p className="suggestion-why">Out of date: {why}. It can no longer be applied.</p>}
      {state === 'locked' && <p className="suggestion-why">This story is locked, so this cannot be applied. Unlock the story first.</p>}
      <div className="suggestion-actions">
        <button type="button" className="primary" disabled={state === 'stale' || state === 'locked'} title={state === 'locked' ? 'Unlock the story to apply this' : undefined} onClick={() => onApply(unit)}>
          {isGroup ? 'Apply split' : 'Apply'}
        </button>
        <button type="button" onClick={() => onDismiss(unit)}>Dismiss</button>
      </div>
    </div>
  );
}

// The suggestions for one field of the open story (nothing renders when there are none).
export default function SuggestionList({ units, stories, onApply, onDismiss, onUnlock }) {
  if (!units.length) return null;
  return (
    <div className="suggestion-list">
      {units.map((u) => <Suggestion key={u.key} unit={u} stories={stories} onApply={onApply} onDismiss={onDismiss} onUnlock={onUnlock} />)}
    </div>
  );
}
