import type { Story } from '#shared/types.ts';
import type { Cues, Edit, ListFields } from './formTypes.ts';
import { POINTS, SPLIT_ABOVE } from '#shared/backlog/model.ts';
import Info from '#frontend/src/shared/ui/Info.tsx';
import guideline from '#shared/guidelines/sprint-points-guideline.md?raw';
import { Row } from '#frontend/src/shared/ui/Layout.tsx';

// Sprint points (a radio group).
export default function EstimateSection({ story: s, frozen, cues, list, edit }: { story: Story; frozen: boolean; cues: Cues; list: ListFields; edit: Edit }) {
  const { noValue } = cues;
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
      </Row>
    </fieldset>
  );
}
