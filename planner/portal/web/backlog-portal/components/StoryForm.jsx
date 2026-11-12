import { useEffect, useState } from 'react';
import {
  POINTS, SPLIT_ABOVE, PRIORITIES, emptyCriterion, storyCellText, criteriaCellText, storyIssues, storyLabel,
} from '../../../../logic/backlog/model.js';
import { openCount, emptyClarification } from '../../../../logic/backlog/story-text.js';
import { dependencyChoices, dependentsOf } from '../../../../logic/backlog/ids.js';
import { criterionNumberOf } from '../../../../logic/review/review.js';
import { issueClass } from './issues.js';
import StateMark from './StateMark.jsx';
import Info from './Info.jsx';
import SuggestionList, { Suggestion } from './Suggestions.jsx';
import guideline from '../../../../guidelines/sprint-points-guideline.md?raw';

const $ = (id) => document.getElementById(id);

const distinct = (values) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];

// Rows of focusable fields for arrow-key navigation: Where it fits, User story, points, each criterion, notes.
function navRows(story) {
  return [
    ['epic', 'feature', 'title'].map($),
    ['asA', 'iWant', 'soThat'].map($),
    [...$('pointsGroup').children],
    ...story.criteria.map((_, i) => ['given', 'when', 'then'].map((k) => $(`criterion-${i}-${k}`))),
    [$('notes')],
  ];
}

function focusRow(row, col) {
  if (row.length && row[0].parentElement === $('pointsGroup')) {
    (row.find((b) => b.getAttribute('aria-checked') === 'true') ?? row[0]).focus();
  } else {
    row[Math.min(col, row.length - 1)].focus();
  }
}

// Left/right move within a row of fields (text inputs only at the caret edge, so editing still works), up/down
// move between rows. Sprint points: left/right step through the buttons, Alt+Right goes to Priority, Alt+Left back.
function onNavKeyDown(e, story) {
  if (e.nativeEvent.isComposing || (e.ctrlKey && !e.altKey) || e.metaKey || e.shiftKey || !e.key.startsWith('Arrow')) return;
  const el = e.target;
  const rows = navRows(story);
  const pointsRow = rows[2];
  const isPriority = el === $('priority');
  const rowIdx = isPriority ? 2 : rows.findIndex((r) => r.includes(el));
  if (rowIdx < 0) return;
  const col = isPriority ? pointsRow.length : rows[rowIdx].indexOf(el);

  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    if (el.parentElement === $('pointsGroup')) {
      if (e.altKey) {
        if (dir !== 1) return;
        $('priority').focus();
      } else {
        pointsRow[col + dir]?.focus();
      }
    } else if (isPriority) {
      if (!(e.altKey && dir === -1)) return;
      focusRow(pointsRow, 0);
    } else if (el.tagName === 'INPUT' && (!e.altKey || e.ctrlKey)) {
      // Ctrl+Alt jumps regardless of the caret position
      const atEdge = e.ctrlKey || (el.selectionStart === el.selectionEnd && el.selectionStart === (dir < 0 ? 0 : el.value.length));
      const next = rows[rowIdx][col + dir];
      if (!atEdge || !next) return;
      next.focus();
    } else {
      return;
    }
    e.preventDefault();
    return;
  }

  if (e.altKey) return;
  const dir = e.key === 'ArrowUp' ? -1 : 1;
  if (el.tagName === 'TEXTAREA') {
    const hasLineThatWay = dir < 0 ? el.value.slice(0, el.selectionStart).includes('\n') : el.value.slice(el.selectionEnd).includes('\n');
    if (hasLineThatWay) return;
  }
  const target = rows[rowIdx + dir];
  if (!target) return;
  e.preventDefault();
  focusRow(target, col);
}

// A label with the word that says why the field is flagged ("Required", "Not set"), beside the coloured border.
function Label({ htmlFor, note, children }) {
  return <label htmlFor={htmlFor}>{children}{note && <span className={`field-note ${note === 'Required' ? 'required' : ''}`}>{note}</span>}</label>;
}

function CellWarning({ id, raw, message }) {
  return (
    <p id={id} className="warning" hidden={raw === null}>
      {raw === null ? '' : `${message}: "${raw}". Typing in the fields above replaces it.`}
    </p>
  );
}

const STORY_WARNING = 'The User Story cell does not follow "As …, I want …, so that …", so it is kept as it is';
const CLARIFICATIONS_WARNING = 'The Clarifications cell does not follow "Q1: …" / "A1: …", so it is kept as it is';
const CRITERIA_WARNING = 'The User Acceptance Criteria cell does not follow "AC1: Given …, when …, then …", so it is kept as it is';

// `focusRequest` = { id } or null: focus the element with that id (default: Epic) once rendered, then call onFocused.
// `suggestions`: the open review units for this story ({ key, group, rows }); see review.js. Ungrouped ones sit next to
// their field, split groups in their own section.
export default function StoryForm({ story: s, stories, problems, suggestions = [], focusRequest, onFocused, onEdit, onCommitEpic, onOpen, onApplySuggestion, onDismissSuggestion, onMoveToProposed, onDelete, onBench }) {
  const [depInput, setDepInput] = useState('');
  useEffect(() => {
    if (!focusRequest) return;
    ($(focusRequest.id) ?? $('epic'))?.focus();
    onFocused();
  }, [focusRequest, onFocused]);

  const frozen = !!s.frozen; // every field is read-only; the reducer refuses an edit too
  const edit = (change) => onEdit(s.id, change);
  const setField = (key) => (e) => {
    const value = e.target.value;
    edit((d) => { d[key] = value; });
  };
  // Editing any of As / I want / So that replaces the original cell text.
  const setStoryPart = (key) => (e) => {
    const value = e.target.value;
    edit((d) => { d[key] = value; d.rawUserStory = null; });
  };
  // Drag a criterion by its handle onto another to move it there; the AC numbers follow the new order.
  const [dragAc, setDragAc] = useState(null);
  const [overAc, setOverAc] = useState(null);
  const endAcDrag = () => { setDragAc(null); setOverAc(null); };
  const moveCriterion = (from, to) => edit((d) => {
    d.criteria.splice(to, 0, d.criteria.splice(from, 1)[0]);
    d.rawCriteria = null;
  });
  // Editing the questions replaces the original cell text, as for the other cells.
  const editClarifications = (change) => edit((d) => { change(d.clarifications); d.rawClarifications = null; });

  const addCriterion = () => edit((d) => { d.criteria.push(emptyCriterion()); d.rawCriteria = null; });

  const { errors, warnings } = storyIssues(s, problems.get(s.id));

  // Dependencies are stored as IDs. The picker offers the stories that can still be linked without a cycle.
  const choices = dependencyChoices(stories, s);
  const byCode = new Map(stories.filter((o) => o.code).map((o) => [o.code, o]));
  const requiredBy = dependentsOf(stories, s.code);
  const pickDependency = (e) => {
    const value = e.target.value.trim();
    if (!choices.some((o) => o.code === value)) return setDepInput(e.target.value);
    setDepInput('');
    edit((d) => { d.dependsOn = [...d.dependsOn, value]; });
  };
  // The Epic is committed (and the ID follows it) when the field is left, or a suggestion is picked.
  const onEpicInput = (e) => {
    setField('epic')(e);
    if (e.nativeEvent.inputType === 'insertReplacementText') onCommitEpic(s.id);
  };
  // A benched story is parked, so it shows no red or yellow highlights.
  const cls = s.benched ? '' : issueClass(errors, warnings);
  // A missing field gets a red (required) or yellow (optional) border instead of a banner.
  const noValue = (v) => !s.benched && !String(v ?? '').trim();
  const missing = (key) => (noValue(s[key]) ? 'missing' : undefined);
  const partMissing = (key) => (s.rawUserStory === null && noValue(s[key]) ? 'missing' : undefined);
  const optional = (key) => (noValue(s[key]) ? 'missing-optional' : undefined);
  const criterionMissing = (c, key) => (s.rawCriteria === null && noValue(c[key]) ? 'missing' : undefined);
  const needs = (cls) => (cls === 'missing' ? 'Required' : null);
  const invalid = (cls) => (cls === 'missing' ? 'true' : undefined);
  const forField = (...fields) => suggestions.filter((u) => !u.group && fields.includes(u.rows[0].field));
  const groups = suggestions.filter((u) => u.group);
  const listOf = (units) => (
    <SuggestionList units={units} stories={stories} onApply={onApplySuggestion} onDismiss={onDismissSuggestion} />
  );
  const list = (...fields) => listOf(forField(...fields));
  // A criterion's replace/remove suggestions sit under it; adds and ones naming a missing criterion stay below the list.
  const criteriaUnits = forField('User Acceptance Criteria');
  const unitsForCriterion = (n) => criteriaUnits.filter((u) => criterionNumberOf(u, s) === n);
  const unitsBelowCriteria = criteriaUnits.filter((u) => !criterionNumberOf(u, s));

  // Suggestions come from the open backlog: Feature is narrowed by Epic. Title has none.
  const sameEpic = stories.filter((o) => o.epic === s.epic);
  const priorityOptions = ['', ...PRIORITIES];
  if (s.priority && !priorityOptions.includes(s.priority)) priorityOptions.push(s.priority); // never silently change a loaded value

  return (
    <section
      id="storyForm"
      className={`card story-form${cls === 'incomplete' ? ' incomplete' : ''}${cls === 'warn' ? ' warn' : ''}${frozen ? ' frozen' : ''}`}
      onKeyDown={(e) => onNavKeyDown(e, s)}
    >
      <div className="story-header" id="storyHeader">
        <div className="story-code" id="storyCode">
          {s.code ? <>ID: <strong>{s.code}</strong></> : 'No ID yet: one is assigned once an Epic is set.'}
          <StateMark kind={cls} />
          {frozen && <span className="frozen-mark" id="frozenMark" title="Frozen: reference only">{'\u2744'} Frozen</span>}
          {onBench && (
            <label className="lock-toggle" title="Bench this story: the jois-story-explore and jois-story-propose skills ignore it. Nothing else changes.">
              <input type="checkbox" id="benchToggle" checked={!!s.benched} onChange={(e) => onBench(s.id, e.target.checked)} />
              {' '}Benched
            </label>
          )}
        </div>
        <div className="story-actions" id="storyActions">
          {onMoveToProposed && (
            <button
              type="button" id="moveToProposedBtn" disabled={!s.code || frozen}
              title={!s.code ? 'Set an Epic first' : frozen ? 'A frozen story cannot be moved to Proposed' : 'Remove this story from the backlog and make it a proposed story'}
              onClick={() => onMoveToProposed(s)}
            >
              Move to Proposed
            </button>
          )}
          {onDelete && (
            <button
              type="button" id="deleteStoryBtn" disabled={frozen}
              title={frozen ? 'A frozen story cannot be deleted' : 'Delete this story'}
              onClick={() => onDelete()}
            >
              Delete story
            </button>
          )}
        </div>
      </div>

      {frozen && (
        <p className="frozen-note" id="frozenNote" role="status">
          This story is frozen and read-only. It keeps its ID, and a change needs a new story that supersedes it.
        </p>
      )}

      <fieldset>
        <legend>Where it fits</legend>
        <div className="grid3">
          <div><Label htmlFor="epic" note={needs(missing('epic'))}>Epic</Label><input type="text" id="epic" className={missing('epic')} aria-invalid={invalid(missing('epic'))} list="epicList" autoComplete="off" readOnly={frozen} value={s.epic} onChange={onEpicInput} onBlur={() => onCommitEpic(s.id)} />{list('Epic')}</div>
          <div><Label htmlFor="feature" note={needs(missing('feature'))}>Feature</Label><input type="text" id="feature" className={missing('feature')} aria-invalid={invalid(missing('feature'))} list="featureList" autoComplete="off" readOnly={frozen} value={s.feature} onChange={setField('feature')} />{list('Feature')}</div>
          <div><Label htmlFor="title" note={needs(missing('title'))}>Title</Label><input type="text" id="title" className={missing('title')} aria-invalid={invalid(missing('title'))} autoComplete="off" readOnly={frozen} value={s.title} onChange={setField('title')} />{list('Title')}</div>
        </div>
      </fieldset>

      <fieldset>
        <legend>User story</legend>
        <div className="grid3">
          <div><Label htmlFor="asA" note={needs(partMissing('asA'))}>As</Label><input type="text" id="asA" placeholder="a team lead" className={partMissing('asA')} aria-invalid={invalid(partMissing('asA'))}readOnly={frozen} value={s.asA} onChange={setStoryPart('asA')} /></div>
          <div><Label htmlFor="iWant" note={needs(partMissing('iWant'))}>I want</Label><input type="text" id="iWant" className={partMissing('iWant')} aria-invalid={invalid(partMissing('iWant'))}readOnly={frozen} value={s.iWant} onChange={setStoryPart('iWant')} /></div>
          <div><Label htmlFor="soThat" note={needs(partMissing('soThat'))}>So that</Label><input type="text" id="soThat" className={partMissing('soThat')} aria-invalid={invalid(partMissing('soThat'))}readOnly={frozen} value={s.soThat} onChange={setStoryPart('soThat')} /></div>
        </div>
        {list('User Story')}
        <CellWarning id="storyWarning" raw={s.rawUserStory} message={STORY_WARNING} />
        <div className="preview-label">Saved as</div>
        <pre id="storyPreview" className="preview">{storyCellText(s)}</pre>
      </fieldset>

      <fieldset>
        <legend>Estimate</legend>
        <div className="row">
          <div>
            <div className="label-row">
              <span id="pointsLabel" className="label-text">Sprint points</span>
              {noValue(s.points) && <span className="field-note">Not set</span>}
              <Info id="guideline" buttonId="guidelineBtn" label="Sprint points guideline" icon="i" popoverId="guidelineText">{guideline}</Info>
            </div>
            <div id="pointsGroup" className={`points${noValue(s.points) ? ' missing-optional' : ''}`} role="radiogroup" aria-labelledby="pointsLabel">
              {POINTS.map((p) => (
                <button
                  key={p} type="button" role="radio" data-points={String(p)}
                  className={p > SPLIT_ABOVE ? 'big' : undefined} title={p > SPLIT_ABOVE ? 'Consider splitting' : undefined}
                  aria-checked={String(s.points) === String(p)} disabled={frozen}
                  // Clicking the selected one again clears it.
                  onClick={() => edit((d) => { d.points = String(d.points) === String(p) ? '' : String(p); })}
                >
                  {p}
                </button>
              ))}
            </div>
            {list('Sprint points')}
          </div>
          <div>
            <Label htmlFor="priority" note={optional('priority') ? 'Not set' : null}>Priority</Label>
            <select id="priority" className={optional('priority')} disabled={frozen} value={s.priority} onChange={setField('priority')}>
              {priorityOptions.map((p) => <option key={p} value={p}>{p || 'None'}</option>)}
            </select>
            {list('Priority')}
          </div>
        </div>
      </fieldset>

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

      <fieldset>
        <legend>Dependencies</legend>
        <label htmlFor="dependsOn">Depends on</label>
        <ul id="dependsOnList" className="dep-list">
          {s.dependsOn.map((code) => {
            const target = byCode.get(code);
            return (
              <li key={code} className={target ? '' : 'dangling'}>
                {target
                  ? <button type="button" className="link-btn" title={storyLabel(target)} onClick={() => onOpen(target.id)}>{`${code} ${storyLabel(target)}`}</button>
                  : <span title={/^NEW-\d+$/.test(code) ? 'This story is still proposed' : 'No story has this ID'}>{code}</span>}
                <button type="button" className="remove" aria-label={`Remove ${code}`} disabled={frozen} onClick={() => edit((d) => { d.dependsOn = d.dependsOn.filter((c) => c !== code); })}>✕</button>
              </li>
            );
          })}
        </ul>
        <input
          type="text" id="dependsOn" list="dependsOnChoices" autoComplete="off" disabled={!s.code || frozen}
          placeholder={frozen ? 'Frozen' : s.code ? 'Type or pick a story ID' : 'Set an Epic first'} value={depInput} onChange={pickDependency}
        />
        <datalist id="dependsOnChoices">
          {choices.map((o) => <option key={o.id} value={o.code}>{storyLabel(o)}</option>)}
        </datalist>
        {list('Depends On')}
        <div className="dep-heading">Required by</div>
        <ul id="requiredByList" className="dep-list">
          {requiredBy.map((o) => (
            <li key={o.id}><button type="button" className="link-btn" onClick={() => onOpen(o.id)}>{`${o.code} ${storyLabel(o)}`}</button></li>
          ))}
          {!requiredBy.length && <li className="muted">No story depends on this one.</li>}
        </ul>
      </fieldset>

      <fieldset>
        <legend>Notes</legend>
        <label htmlFor="notes" className="sr-only">Notes</label>
        <textarea id="notes" rows={3} readOnly={frozen} value={s.notes} onChange={setField('notes')} />
        {list('Notes')}
      </fieldset>

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

      {groups.length > 0 && (
        <fieldset>
          <legend>Suggested split</legend>
          <SuggestionList units={groups} stories={stories} onApply={onApplySuggestion} onDismiss={onDismissSuggestion} />
        </fieldset>
      )}

      <datalist id="epicList">{distinct(stories.map((o) => o.epic)).map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="featureList">{distinct(sameEpic.map((o) => o.feature)).map((v) => <option key={v} value={v} />)}</datalist>
    </section>
  );
}
