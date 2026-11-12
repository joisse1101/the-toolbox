import { storyCellText } from '../../../../logic/backlog/model.js';
import { Grid } from './Layout.jsx';
import { Label, CellWarning } from './FormParts.jsx';
import { needs, invalid } from './fieldCues.js';

const STORY_WARNING = 'The User Story cell does not follow "As …, I want …, so that …", so it is kept as it is';

// "Where it fits": Epic, Feature, Title.
export function WhereItFitsSection({ story: s, frozen, cues, list, setField, onEpicInput, onCommitEpic }) {
  const { missing } = cues;
  return (
    <fieldset>
      <legend>Where it fits</legend>
      <Grid>
        <div><Label htmlFor="epic" note={needs(missing('epic'))}>Epic</Label><input type="text" id="epic" className={missing('epic')} aria-invalid={invalid(missing('epic'))} list="epicList" autoComplete="off" readOnly={frozen} value={s.epic} onChange={onEpicInput} onBlur={() => onCommitEpic(s.id)} />{list('Epic')}</div>
        <div><Label htmlFor="feature" note={needs(missing('feature'))}>Feature</Label><input type="text" id="feature" className={missing('feature')} aria-invalid={invalid(missing('feature'))} list="featureList" autoComplete="off" readOnly={frozen} value={s.feature} onChange={setField('feature')} />{list('Feature')}</div>
        <div><Label htmlFor="title" note={needs(missing('title'))}>Title</Label><input type="text" id="title" className={missing('title')} aria-invalid={invalid(missing('title'))} autoComplete="off" readOnly={frozen} value={s.title} onChange={setField('title')} />{list('Title')}</div>
      </Grid>
    </fieldset>
  );
}

// "User story": As, I want, So that, and the cell text they are saved as.
export function UserStorySection({ story: s, frozen, cues, list, setStoryPart }) {
  const { partMissing } = cues;
  return (
    <fieldset>
      <legend>User story</legend>
      <Grid>
        <div><Label htmlFor="asA" note={needs(partMissing('asA'))}>As</Label><input type="text" id="asA" placeholder="a team lead" className={partMissing('asA')} aria-invalid={invalid(partMissing('asA'))} readOnly={frozen} value={s.asA} onChange={setStoryPart('asA')} /></div>
        <div><Label htmlFor="iWant" note={needs(partMissing('iWant'))}>I want</Label><input type="text" id="iWant" className={partMissing('iWant')} aria-invalid={invalid(partMissing('iWant'))} readOnly={frozen} value={s.iWant} onChange={setStoryPart('iWant')} /></div>
        <div><Label htmlFor="soThat" note={needs(partMissing('soThat'))}>So that</Label><input type="text" id="soThat" className={partMissing('soThat')} aria-invalid={invalid(partMissing('soThat'))} readOnly={frozen} value={s.soThat} onChange={setStoryPart('soThat')} /></div>
      </Grid>
      {list('User Story')}
      <CellWarning id="storyWarning" raw={s.rawUserStory} message={STORY_WARNING} />
      <div className="preview-label">Saved as</div>
      <pre id="storyPreview" className="preview">{storyCellText(s)}</pre>
    </fieldset>
  );
}
