import { unitState, displayRow } from '../../../../logic/review/review.js';
import { wordDiff } from '../../lib/word-diff.js';

// An append adds to the field the row names (Notes text, or a Clarifications question).
const VERB = { replace: 'Suggested', add: 'Add', remove: 'Remove', append: 'Add', resolve: 'Resolve', 'add-story': 'New story' };

// What a row proposes, as text. Removing a criterion shows the criterion itself, not just its label.
const valueOf = (row) => (row.action === 'remove' && row.field === 'User Acceptance Criteria' ? row.current : row.suggested);

// A replace shows what changed against the current value (added words marked, removed words struck through).
function SuggestedValue({ row }) {
  if (row.action !== 'replace' || !row.current) return valueOf(row);
  return wordDiff(row.current, row.suggested).map((p, i) => (
    p.kind === 'added' ? <mark key={i}>{p.text}</mark> : p.kind === 'removed' ? <del key={i}>{p.text}</del> : <span key={i}>{p.text}</span>
  ));
}

function rowLine(row) {
  if (row.action === 'add-story' || row.action === 'replace' || row.action === 'append') return `${row.storyId} ${row.field}: ${row.suggested}`;
  return `${VERB[row.action]} ${row.field}: ${valueOf(row)}`;
}

// One suggestion unit (a row, or a whole split group): the proposed value, why, and Apply / Dismiss.
// A stale unit explains itself and only offers Dismiss. A unit of a frozen story can be dismissed but never applied.
// An unlock row left in an old review file is stale: it only offers Dismiss.
// `heading` adds a line above (the Review tab names the story).
export function Suggestion({ unit, stories, onApply, onDismiss, heading = null }) {
  const { state, why } = unitState(unit, stories);
  const first = unit.group ? unit.rows[0] : displayRow(unit.rows[0], stories);
  const confirm = unit.rows.some((r) => r.confidence === 'confirm');
  const isGroup = !!unit.group;
  if (first.action === 'unlock') {
    return (
      <div className="suggestion stale" role="group" aria-label="Old unlock suggestion">
        {heading}
        <div className="suggestion-head">
          <span className="suggestion-kind">Old suggestion to unlock this story</span>
          <span className="suggestion-area">{first.area}</span>
        </div>
        <p className="suggestion-reason">{first.reason}</p>
        <p className="suggestion-why">Out of date: {why}. It can only be dismissed.</p>
        <div className="suggestion-actions">
          <button type="button" onClick={() => onDismiss(unit)}>Dismiss</button>
        </div>
      </div>
    );
  }
  return (
    <div className={`suggestion${state === 'stale' ? ' stale' : ''}`} role="group" aria-label={isGroup ? `Split suggestion ${unit.group}` : `Suggestion for ${first.field}`}>
      {heading}
      <div className="suggestion-head">
        <span className="suggestion-kind">{isGroup ? 'Suggested split' : first.action === 'append' ? `Add to ${first.field}` : first.action === 'resolve' ? 'Move to Notes' : `${VERB[first.action]}: ${first.field}`}</span>
        <span className="suggestion-area">{first.area}</span>
        {confirm && <span className="suggestion-confirm" title="A proposed default: check it before applying">check this default</span>}
      </div>
      {isGroup ? (
        <ul className="suggestion-rows">
          {unit.rows.map((r, i) => <li key={i}>{rowLine(r)}</li>)}
        </ul>
      ) : (
        <pre className="suggestion-value"><SuggestedValue row={first} /></pre>
      )}
      {first.action === 'resolve' && <p className="suggestion-reason">Removes the question: {first.current}</p>}
      <p className="suggestion-reason">{first.reason}</p>
      {state === 'stale' && <p className="suggestion-why">Out of date: {why}. It can no longer be applied.</p>}
      {state === 'frozen' && <p className="suggestion-why">This story is frozen, so this cannot be applied. A change needs a superseding story.</p>}
      <div className="suggestion-actions">
        <button type="button" className="primary" disabled={state === 'stale' || state === 'frozen'} title={state === 'frozen' ? 'A frozen story cannot be edited' : undefined} onClick={() => onApply(unit)}>
          {isGroup ? 'Apply split' : 'Apply'}
        </button>
        <button type="button" onClick={() => onDismiss(unit)}>Dismiss</button>
      </div>
    </div>
  );
}

// The suggestions for one field of the open story (nothing renders when there are none).
export default function SuggestionList({ units, stories, onApply, onDismiss }) {
  if (!units.length) return null;
  return (
    <div className="suggestion-list">
      {units.map((u) => <Suggestion key={u.key} unit={u} stories={stories} onApply={onApply} onDismiss={onDismiss} />)}
    </div>
  );
}
