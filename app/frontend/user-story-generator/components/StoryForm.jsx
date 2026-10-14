import { useEffect, useState } from 'react';
import {
  POINTS, SPLIT_ABOVE, PRIORITIES, emptyCriterion, storyCellText, criteriaCellText, storyIssues, storyLabel,
} from '../../../../core/model.js';
import { dependencyChoices, dependentsOf } from '../../../../core/ids.js';
import { issueClass } from './issues.js';
import Info from './Info.jsx';
import SuggestionList, { Suggestion } from './Suggestions.jsx';
import guideline from '../../../../ai/guidelines/sprint-points-guideline.md?raw';

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

function CellWarning({ id, raw, message }) {
  return (
    <p id={id} className="warning" hidden={raw === null}>
      {raw === null ? '' : `${message}: "${raw}". Typing in the fields above replaces it.`}
    </p>
  );
}

const STORY_WARNING = 'The User Story cell does not follow "As a …, I want …, so that …", so it is kept as it is';
const CRITERIA_WARNING = 'The Acceptance Criteria cell does not follow "AC1: Given …, when …, then …", so it is kept as it is';

// `focusRequest` = { id } or null: focus the element with that id (default: Epic) once rendered, then call onFocused.
// `suggestions`: the open review units for this story ({ key, group, rows }); see review.js. Ungrouped ones sit next to
// their field, split groups in their own section.
export default function StoryForm({ story: s, stories, problems, suggestions = [], focusRequest, onFocused, onEdit, onCommitEpic, onOpen, onApplySuggestion, onDismissSuggestion, onUnlockSuggestion, onMoveToProposed, onLock, onBench }) {
  const [depInput, setDepInput] = useState('');
  useEffect(() => {
    if (!focusRequest) return;
    ($(focusRequest.id) ?? $('epic'))?.focus();
    onFocused();
  }, [focusRequest, onFocused]);

  const edit = (change) => onEdit(s.id, change);
  const setField = (key) => (e) => {
    const value = e.target.value;
    edit((d) => { d[key] = value; });
  };
  // Editing any of As a / I want / So that replaces the original cell text.
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
  const cls = issueClass(errors, warnings);
  // A missing field gets a red (required) or yellow (optional) border instead of a banner.
  const noValue = (v) => !String(v ?? '').trim();
  const missing = (key) => (noValue(s[key]) ? 'missing' : undefined);
  const partMissing = (key) => (s.rawUserStory === null && noValue(s[key]) ? 'missing' : undefined);
  const optional = (key) => (noValue(s[key]) ? 'missing-optional' : undefined);
  const unlockUnits = suggestions.filter((u) => u.rows[0].action === 'unlock');
  const forField = (...fields) => suggestions.filter((u) => !u.group && fields.includes(u.rows[0].field));
  const groups = suggestions.filter((u) => u.group);
  const list = (...fields) => (
    <SuggestionList units={forField(...fields)} stories={stories} onApply={onApplySuggestion} onDismiss={onDismissSuggestion} onUnlock={onUnlockSuggestion} />
  );

  // Suggestions come from the open backlog: Feature is narrowed by Epic. Title has none.
  const sameEpic = stories.filter((o) => o.epic === s.epic);
  const priorityOptions = ['', ...PRIORITIES];
  if (s.priority && !priorityOptions.includes(s.priority)) priorityOptions.push(s.priority); // never silently change a loaded value

  return (
    <section
      id="storyForm"
      className={`card story-form${cls === 'incomplete' ? ' incomplete' : ''}${cls === 'warn' ? ' warn' : ''}${s.locked ? ' locked' : ''}`}
      onKeyDown={(e) => onNavKeyDown(e, s)}
    >
      <div className="story-code" id="storyCode">
        {s.code ? <>ID: <strong>{s.code}</strong></> : 'No ID yet: one is assigned once an Epic is set.'}
        {onLock && (
          <label className="lock-toggle" title={s.code ? (s.locked ? 'Locked: reference only. It is not reviewed, reordered, moved or deleted, and its Epic and ID stay.' : 'Lock this story: reference only, not submitted for review') : 'Set an Epic first'}>
            <input type="checkbox" id="lockToggle" checked={!!s.locked} disabled={!s.code} onChange={(e) => onLock(s.id, e.target.checked)} />
            {' '}Locked
          </label>
        )}
        {onBench && (
          <label className="lock-toggle" title="Bench this story: the explore and propose skills ignore it. Nothing else changes.">
            <input type="checkbox" id="benchToggle" checked={!!s.benched} onChange={(e) => onBench(s.id, e.target.checked)} />
            {' '}Benched
          </label>
        )}
        {onMoveToProposed && (
          <button
            type="button" id="moveToProposedBtn" disabled={!s.code || s.locked}
            title={!s.code ? 'Set an Epic first' : s.locked ? 'Unlock the story first' : 'Remove this story from the backlog and make it a proposed story'}
            onClick={() => onMoveToProposed(s)}
          >
            Move to Proposed
          </button>
        )}
      </div>

      {unlockUnits.length > 0 && (
        <div className="unlock-banner" id="unlockBanner" role="status">
          {unlockUnits.map((u) => (
            <Suggestion
              key={u.key} unit={u} stories={stories} onApply={onApplySuggestion} onDismiss={onDismissSuggestion} onUnlock={onUnlockSuggestion}
              heading={<p className="unlock-banner-title">The review suggests unlocking and reviewing this story.</p>}
            />
          ))}
        </div>
      )}

      <fieldset>
        <legend>Where it fits</legend>
        <div className="grid3">
          <div><label htmlFor="epic">Epic</label><input type="text" id="epic" className={missing('epic')} list="epicList" autoComplete="off" readOnly={!!s.locked} title={s.locked ? 'Unlock the story to change its Epic' : undefined} value={s.epic} onChange={onEpicInput} onBlur={() => onCommitEpic(s.id)} />{list('Epic')}</div>
          <div><label htmlFor="feature">Feature</label><input type="text" id="feature" className={missing('feature')} list="featureList" autoComplete="off" value={s.feature} onChange={setField('feature')} />{list('Feature')}</div>
          <div><label htmlFor="title">Title</label><input type="text" id="title" className={missing('title')} autoComplete="off" value={s.title} onChange={setField('title')} />{list('Title')}</div>
        </div>
      </fieldset>

      <fieldset>
        <legend>User story</legend>
        <div className="grid3">
          <div><label htmlFor="asA">As a</label><input type="text" id="asA" className={partMissing('asA')} value={s.asA} onChange={setStoryPart('asA')} /></div>
          <div><label htmlFor="iWant">I want</label><input type="text" id="iWant" className={partMissing('iWant')} value={s.iWant} onChange={setStoryPart('iWant')} /></div>
          <div><label htmlFor="soThat">So that</label><input type="text" id="soThat" className={partMissing('soThat')} value={s.soThat} onChange={setStoryPart('soThat')} /></div>
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
              <Info id="guideline" buttonId="guidelineBtn" label="Sprint points guideline" icon="i" popoverId="guidelineText">{guideline}</Info>
            </div>
            <div id="pointsGroup" className={`points${noValue(s.points) ? ' missing-optional' : ''}`} role="radiogroup" aria-labelledby="pointsLabel">
              {POINTS.map((p) => (
                <button
                  key={p} type="button" role="radio" data-points={String(p)}
                  className={p > SPLIT_ABOVE ? 'big' : undefined} title={p > SPLIT_ABOVE ? 'Consider splitting' : undefined}
                  aria-checked={String(s.points) === String(p)}
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
            <label htmlFor="priority">Priority</label>
            <select id="priority" className={optional('priority')} value={s.priority} onChange={setField('priority')}>
              {priorityOptions.map((p) => <option key={p} value={p}>{p || 'None'}</option>)}
            </select>
            {list('Priority')}
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Acceptance criteria</legend>
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
                  className="criterion-handle" draggable title="Drag to reorder" aria-hidden="true"
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
                      <label htmlFor={`criterion-${i}-${key}`}>{label}</label>
                      <input
                        type="text" id={`criterion-${i}-${key}`} value={c[key]}
                        className={s.rawCriteria === null && noValue(c[key]) ? 'missing' : undefined}
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
                  type="button" className="danger criterion-remove" aria-label="Remove criterion"
                  disabled={last} // every story keeps at least one criterion
                  title={last ? 'A story needs at least one criterion' : 'Remove criterion'}
                  onClick={() => edit((d) => { d.criteria.splice(i, 1); d.rawCriteria = null; })}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" id="addCriterionBtn" onClick={addCriterion}>Add criterion</button>
        {list('Acceptance Criteria')}
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
                <button type="button" className="remove" aria-label={`Remove ${code}`} onClick={() => edit((d) => { d.dependsOn = d.dependsOn.filter((c) => c !== code); })}>✕</button>
              </li>
            );
          })}
        </ul>
        <input
          type="text" id="dependsOn" list="dependsOnChoices" autoComplete="off" disabled={!s.code}
          placeholder={s.code ? 'Type or pick a story ID' : 'Set an Epic first'} value={depInput} onChange={pickDependency}
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
        <textarea id="notes" rows={3} value={s.notes} onChange={setField('notes')} />
        {list('Notes')}
      </fieldset>

      {groups.length > 0 && (
        <fieldset>
          <legend>Suggested split</legend>
          <SuggestionList units={groups} stories={stories} onApply={onApplySuggestion} onDismiss={onDismissSuggestion} onUnlock={onUnlockSuggestion} />
        </fieldset>
      )}

      <datalist id="epicList">{distinct(stories.map((o) => o.epic)).map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="featureList">{distinct(sameEpic.map((o) => o.feature)).map((v) => <option key={v} value={v} />)}</datalist>
    </section>
  );
}
