import { useState } from 'react';
import { emptyCriterion, criteriaCellText } from '../../../../logic/backlog/model.js';
import { criterionNumberOf } from '../../../../logic/review/review.js';
import { Label, CellWarning } from './FormParts.jsx';
import { needs, invalid } from './fieldCues.js';

const $ = (id) => document.getElementById(id);

const CRITERIA_WARNING = 'The User Acceptance Criteria cell does not follow "AC1: Given …, when …, then …", so it is kept as it is';

// `units`: the open suggestions for the criteria; `listOf(units)` renders a list of them.
export default function CriteriaSection({ story: s, frozen, cues, edit, units, listOf }) {
  const { criterionMissing } = cues;
  // Drag a criterion by its handle onto another to move it there; the AC numbers follow the new order.
  const [dragAc, setDragAc] = useState(null);
  const [overAc, setOverAc] = useState(null);
  const endAcDrag = () => { setDragAc(null); setOverAc(null); };
  const moveCriterion = (from, to) => edit((d) => {
    d.criteria.splice(to, 0, d.criteria.splice(from, 1)[0]);
    d.rawCriteria = null;
  });
  const addCriterion = () => edit((d) => { d.criteria.push(emptyCriterion()); d.rawCriteria = null; });

  // A criterion's replace/remove suggestions sit under it; adds and ones naming a missing criterion stay below the list.
  const unitsForCriterion = (n) => units.filter((u) => criterionNumberOf(u, s) === n);
  const unitsBelowCriteria = units.filter((u) => !criterionNumberOf(u, s));

  return (
    <fieldset>
      <legend>User acceptance criteria</legend>
      <div id="criteria">
        {s.criteria.map((c, i) => {
          const last = s.criteria.length === 1;
          return (
            <div
              className={['criterion', i === dragAc ? 'dragging' : '', dragAc !== null && i === overAc && i !== dragAc ? (i < dragAc ? 'drop-before' : 'drop-after') : ''].join(' ').trim()}
              key={i}
              onDragOver={(e) => {
                if (dragAc === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (overAc !== i) setOverAc(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragAc !== null && dragAc !== i) moveCriterion(dragAc, i);
                endAcDrag();
              }}
            >
              <span
                className="criterion-handle" draggable={!frozen} title="Drag to reorder" aria-hidden="true"
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(i)); // Firefox needs data to start a drag
                  e.dataTransfer.setDragImage(e.currentTarget.parentElement, 0, 0);
                  setDragAc(i);
                }}
                onDragEnd={endAcDrag}
              >
                ⠿
              </span>
              <div className="fields">
                {[['given', 'Given'], ['when', 'When'], ['then', 'Then']].map(([key, label]) => (
                  <div key={key}>
                    <Label htmlFor={`criterion-${i}-${key}`} note={needs(criterionMissing(c, key))}>{label}</Label>
                    <input
                      type="text" id={`criterion-${i}-${key}`} readOnly={frozen} value={c[key]} aria-invalid={invalid(criterionMissing(c, key))}
                      className={criterionMissing(c, key)}
                      onChange={(e) => {
                        const value = e.target.value;
                        edit((d) => { d.criteria[i][key] = value; d.rawCriteria = null; });
                      }}
                      onKeyDown={key === 'then' ? (e) => {
                        if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
                        e.preventDefault();
                        addCriterion();
                        // The new row does not exist until React has rendered it.
                        const id = `criterion-${s.criteria.length}-given`;
                        requestAnimationFrame(() => $(id)?.focus());
                      } : undefined}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button" className="criterion-move" aria-label={`Move criterion ${i + 1} up`} title="Move up"
                disabled={i === 0 || frozen} onClick={() => moveCriterion(i, i - 1)}
              >
                {'↑'}
              </button>
              <button
                type="button" className="criterion-move" aria-label={`Move criterion ${i + 1} down`} title="Move down"
                disabled={i === s.criteria.length - 1 || frozen} onClick={() => moveCriterion(i, i + 1)}
              >
                {'↓'}
              </button>
              <button
                type="button" className="danger criterion-remove" aria-label="Remove criterion"
                disabled={last || frozen} // every story keeps at least one criterion
                title={last ? 'A story needs at least one criterion' : 'Remove criterion'}
                onClick={() => edit((d) => { d.criteria.splice(i, 1); d.rawCriteria = null; })}
              >
                ✕
              </button>
              {unitsForCriterion(i + 1).length > 0 && <div className="criterion-suggestions">{listOf(unitsForCriterion(i + 1))}</div>}
            </div>
          );
        })}
      </div>
      <button type="button" id="addCriterionBtn" disabled={frozen} onClick={addCriterion}>Add criterion</button>
      {listOf(unitsBelowCriteria)}
      <CellWarning id="criteriaWarning" raw={s.rawCriteria} message={CRITERIA_WARNING} />
      <div className="preview-label">Saved as</div>
      <pre id="criteriaPreview" className="preview">{criteriaCellText(s)}</pre>
    </fieldset>
  );
}
