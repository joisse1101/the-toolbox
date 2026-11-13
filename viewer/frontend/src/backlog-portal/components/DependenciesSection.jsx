import { useState } from 'react';
import { storyLabel } from '../../../../logic/backlog/model.js';
import { dependencyChoices, dependentsOf } from '../../../../logic/backlog/ids.js';

// "Depends on" (IDs, with a picker) and "Required by".
export default function DependenciesSection({ story: s, stories, frozen, edit, list, onOpen }) {
  const [depInput, setDepInput] = useState('');
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

  return (
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
  );
}
