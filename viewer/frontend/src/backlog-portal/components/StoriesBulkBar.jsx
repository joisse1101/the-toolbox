import { PRIORITIES } from '../../../../logic/backlog/model.js';

export const KEEP = 'keep'; // bulk Priority "No change" ('' is "None", which clears)

// The bulk edit bar: the fields and buttons for the ticked rows on screen, or a hint when nothing is ticked.
export default function StoriesBulkBar({ checkedCount, n, hiddenChecked, priority, epic, feature, note, isEmpty, onPriority, onEpic, onFeature, onApply, onDelete, onDeselectAll }) {
  return (
    <div id="bulkBar" className={checkedCount ? 'bulk-bar' : 'bulk-bar quiet'}>
      {checkedCount > 0 && (
        <>
          <strong id="bulkCount">{`${n} selected${hiddenChecked ? `, ${hiddenChecked} hidden by the search or filters` : ''}`}</strong>
          <div>
            <label htmlFor="bulkPriority">Set priority</label>
            <select id="bulkPriority" disabled={n === 0} value={priority} onChange={(e) => onPriority(e.target.value)}>
              <option value={KEEP}>No change</option>
              <option value="">None</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="bulkEpic">Set epic</label>
            <input type="text" id="bulkEpic" disabled={n === 0} list="bulkEpicList" autoComplete="off" placeholder="No change" value={epic} onChange={(e) => onEpic(e.target.value)} />
          </div>
          <div>
            <label htmlFor="bulkFeature">Set feature</label>
            <input type="text" id="bulkFeature" disabled={n === 0} list="bulkFeatureList" autoComplete="off" placeholder="No change" value={feature} onChange={(e) => onFeature(e.target.value)} />
          </div>
          <button type="button" id="bulkApplyBtn" className="primary" disabled={n === 0 || isEmpty} onClick={onApply}>Apply to selected</button>
          <button type="button" id="deleteSelectedBtn" disabled={n === 0} onClick={onDelete} title="Delete the selected stories; frozen ones are skipped">{`Delete selected (${n})`}</button>
          <button type="button" id="deselectAllBtn" onClick={onDeselectAll}>Deselect all</button>
        </>
      )}
      {checkedCount === 0 && <span className="muted">Tick rows to change or delete several stories at once.</span>}
      <span id="bulkNote" className="muted" role="status" aria-live="polite">{note}</span>
    </div>
  );
}
