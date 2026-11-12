import { openCount, emptyClarification } from '../../../../logic/backlog/story-text.js';
import { CellWarning } from './FormParts.jsx';

const CLARIFICATIONS_WARNING = 'The Clarifications cell does not follow "Q1: …" / "A1: …", so it is kept as it is';

export default function ClarificationsSection({ story: s, frozen, edit, list }) {
  // Editing the questions replaces the original cell text, as for the other cells.
  const editClarifications = (change) => edit((d) => { change(d.clarifications); d.rawClarifications = null; });
  return (
    <fieldset>
      <legend>{`Clarifications${openCount(s.clarifications) ? ` (${openCount(s.clarifications)} open)` : ''}`}</legend>
      <div id="clarifications">
        {s.clarifications.map((p, i) => (
          <div className="clarification" key={i}>
            <div className="fields">
              <div>
                <label htmlFor={`clarification-${i}-q`}>{`Question ${i + 1}`}</label>
                <input
                  type="text" id={`clarification-${i}-q`} autoComplete="off" readOnly={frozen} value={p.q}
                  onChange={(e) => { const value = e.target.value; editClarifications((c) => { c[i].q = value; }); }}
                />
              </div>
              <div>
                <label htmlFor={`clarification-${i}-a`}>{`Answer ${i + 1}`}</label>
                <textarea
                  id={`clarification-${i}-a`} rows={2} readOnly={frozen} value={p.a} placeholder="Open until answered"
                  onChange={(e) => { const value = e.target.value; editClarifications((c) => { c[i].a = value; }); }}
                />
              </div>
            </div>
            <button type="button" className="danger criterion-remove" aria-label={`Remove question ${i + 1}`} title="Remove question" disabled={frozen} onClick={() => editClarifications((c) => { c.splice(i, 1); })}>✕</button>
          </div>
        ))}
      </div>
      <button type="button" id="addClarificationBtn" disabled={frozen} onClick={() => editClarifications((c) => { c.push(emptyClarification()); })}>Add question</button>
      {list('Clarifications')}
      <CellWarning id="clarificationsWarning" raw={s.rawClarifications} message={CLARIFICATIONS_WARNING} />
    </fieldset>
  );
}
