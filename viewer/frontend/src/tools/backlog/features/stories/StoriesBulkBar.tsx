// The bulk edit bar: the fields and buttons for the ticked rows on screen, or a hint when nothing is ticked.
export default function StoriesBulkBar({ checkedCount, n, hiddenChecked, epic, feature, isEmpty, migrateHint, migrateBusy, note, onEpic, onFeature, onApply, onDelete, onMigrate, onDeselectAll }: {
  checkedCount: number; n: number; hiddenChecked: number; epic: string; feature: string; isEmpty: boolean;
  migrateHint: string | null; migrateBusy: boolean; note: { kind: 'ok' | 'error'; text: string } | null; // migrateHint: why Migrate is disabled, or null when it can run
  onEpic: (value: string) => void; onFeature: (value: string) => void;
  onApply: () => void; onDelete: () => void; onMigrate: () => void; onDeselectAll: () => void;
}) {
  return (
    <div id="bulkBar" className={checkedCount ? 'bulk-bar' : 'bulk-bar quiet'}>
      {checkedCount > 0 && (
        <>
          <strong id="bulkCount">{`${n} selected${hiddenChecked ? `, ${hiddenChecked} hidden by the search or filters` : ''}`}</strong>
          <div>
            <label htmlFor="bulkEpic">Set epic</label>
            <input type="text" id="bulkEpic" disabled={n === 0} list="bulkEpicList" autoComplete="off" placeholder="No change" value={epic} onChange={(e) => onEpic(e.target.value)} />
          </div>
          <div>
            <label htmlFor="bulkFeature">Set feature</label>
            <input type="text" id="bulkFeature" disabled={n === 0} list="bulkFeatureList" autoComplete="off" placeholder="No change" value={feature} onChange={(e) => onFeature(e.target.value)} />
          </div>
          <button type="button" id="bulkApplyBtn" className="primary" disabled={n === 0 || isEmpty} onClick={onApply}>Apply to selected</button>
          <button type="button" id="deleteSelectedBtn" disabled={n === 0} onClick={onDelete} title="Delete the selected stories">{`Delete selected (${n})`}</button>
          <button type="button" id="migrateBtn" disabled={migrateHint !== null || migrateBusy} onClick={onMigrate} title={migrateHint ?? 'Move the selected stories to another backlog'} aria-describedby={migrateHint ? 'migrateHint' : undefined}>{`Migrate (${n})`}</button>
          {migrateHint && <span id="migrateHint" className="sr-only">{migrateHint}</span>}
          <button type="button" id="deselectAllBtn" onClick={onDeselectAll}>Deselect all</button>
        </>
      )}
      {checkedCount === 0 && <span className="muted">Tick rows to change, delete or migrate several stories at once.</span>}
      <span id="bulkNote" className={note?.kind === 'error' ? 'error bulk-note' : 'muted bulk-note'} role="status" aria-live="polite">{note?.text ?? ''}</span>
    </div>
  );
}
