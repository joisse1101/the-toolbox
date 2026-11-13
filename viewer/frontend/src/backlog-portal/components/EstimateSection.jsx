import { POINTS, SPLIT_ABOVE, PRIORITIES } from '../../../../logic/backlog/model.js';
import Info from './Info.jsx';
import guideline from '../../../../guidelines/sprint-points-guideline.md?raw';
import { Row } from './Layout.jsx';
import { Label } from './FormParts.jsx';

// Sprint points (a radio group) and Priority.
export default function EstimateSection({ story: s, frozen, cues, list, edit, setField }) {
  const { noValue, optional } = cues;
  const priorityOptions = ['', ...PRIORITIES];
  if (s.priority && !priorityOptions.includes(s.priority)) priorityOptions.push(s.priority); // never silently change a loaded value
  return (
    <fieldset>
      <legend>Estimate</legend>
      <Row>
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
      </Row>
    </fieldset>
  );
}
