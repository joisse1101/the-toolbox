import { useEffect } from 'react';
import { storyIssues } from '../../../../logic/backlog/model.js';
import { issueClass } from './issues.js';
import SuggestionList from './Suggestions.jsx';
import { onNavKeyDown } from './storyFormNav.js';
import { fieldCues } from './fieldCues.js';
import StoryHeader from './StoryHeader.jsx';
import { WhereItFitsSection, UserStorySection } from './StoryFitSections.jsx';
import EstimateSection from './EstimateSection.jsx';
import CriteriaSection from './CriteriaSection.jsx';
import DependenciesSection from './DependenciesSection.jsx';
import ClarificationsSection from './ClarificationsSection.jsx';

const $ = (id) => document.getElementById(id);

const distinct = (values) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];

// `focusRequest` = { id } or null: focus the element with that id (default: Epic) once rendered, then call onFocused.
// `suggestions`: the open review units for this story ({ key, group, rows }); see review.js. Ungrouped ones sit next to
// their field, split groups in their own section.
export default function StoryForm({ story: s, stories, problems, suggestions = [], focusRequest, onFocused, onEdit, onCommitEpic, onOpen, onApplySuggestion, onDismissSuggestion, onMoveToProposed, onDelete, onBench }) {
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

  const { errors, warnings } = storyIssues(s, problems.get(s.id));

  // The Epic is committed (and the ID follows it) when the field is left, or a suggestion is picked.
  const onEpicInput = (e) => {
    setField('epic')(e);
    if (e.nativeEvent.inputType === 'insertReplacementText') onCommitEpic(s.id);
  };
  // A benched story is parked, so it shows no red or yellow highlights.
  const cls = s.benched ? '' : issueClass(errors, warnings);
  // A missing field gets a red (required) or yellow (optional) border instead of a banner.
  const cues = fieldCues(s);
  const forField = (...fields) => suggestions.filter((u) => !u.group && fields.includes(u.rows[0].field));
  const groups = suggestions.filter((u) => u.group);
  const listOf = (units) => (
    <SuggestionList units={units} stories={stories} onApply={onApplySuggestion} onDismiss={onDismissSuggestion} />
  );
  const list = (...fields) => listOf(forField(...fields));

  // Suggestions come from the open backlog: Feature is narrowed by Epic. Title has none.
  const sameEpic = stories.filter((o) => o.epic === s.epic);

  return (
    <section
      id="storyForm"
      className={`card story-form${cls === 'incomplete' ? ' incomplete' : ''}${cls === 'warn' ? ' warn' : ''}${frozen ? ' frozen' : ''}`}
      onKeyDown={(e) => onNavKeyDown(e, s)}
    >
      <StoryHeader story={s} cls={cls} frozen={frozen} onBench={onBench} onMoveToProposed={onMoveToProposed} onDelete={onDelete} />

      <WhereItFitsSection story={s} frozen={frozen} cues={cues} list={list} setField={setField} onEpicInput={onEpicInput} onCommitEpic={onCommitEpic} />

      <UserStorySection story={s} frozen={frozen} cues={cues} list={list} setStoryPart={setStoryPart} />

      <EstimateSection story={s} frozen={frozen} cues={cues} list={list} edit={edit} setField={setField} />

      <CriteriaSection story={s} frozen={frozen} cues={cues} edit={edit} units={forField('User Acceptance Criteria')} listOf={listOf} />

      <DependenciesSection story={s} stories={stories} frozen={frozen} edit={edit} list={list} onOpen={onOpen} />

      <fieldset>
        <legend>Notes</legend>
        <label htmlFor="notes" className="sr-only">Notes</label>
        <textarea id="notes" rows={3} readOnly={frozen} value={s.notes} onChange={setField('notes')} />
        {list('Notes')}
      </fieldset>

      <ClarificationsSection story={s} frozen={frozen} edit={edit} list={list} />

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
