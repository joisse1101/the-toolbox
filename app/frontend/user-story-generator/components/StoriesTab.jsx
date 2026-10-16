import { useEffect, useMemo, useRef, useState } from 'react';
import { PRIORITIES, displayOrder, storyIssues, storyLabel } from '../../../../core/model.js';
import { matchesQuery } from '../../../../core/story-search.js';
import { issueClass, rowTooltip } from './issues.js';

const KEEP = 'keep'; // bulk Priority "No change" ('' is "None", which clears)

const distinct = (stories, key) => [...new Set(stories.map((o) => o[key].trim()).filter(Boolean))];

// Every story in one table, with ticks and a bulk edit bar. The table itself is read-only.
export default function StoriesTab({ stories, headers, problems, checked, lastChecked, hidden, onOpen, onCheck, onCheckAll, onApplyBulk, onLockChecked }) {
  const [priority, setPriority] = useState(KEEP);
  const [epic, setEpic] = useState('');
  const [feature, setFeature] = useState('');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const selectAll = useRef(null);

  const allRows = useMemo(() => displayOrder(stories), [stories]);
  const searching = query.trim() !== '';
  const rows = useMemo(() => (searching ? allRows.filter((s) => matchesQuery(s, query, headers)) : allRows), [allRows, searching, query, headers]);
  const n = checked.size;
  const shownChecked = rows.filter((r) => checked.has(r.id)).length;
  const hiddenChecked = n - shownChecked; // ticked stories the search hides; select-all and shift-range leave them alone

  useEffect(() => {
    selectAll.current.indeterminate = shownChecked > 0 && shownChecked < rows.length;
  }, [shownChecked, rows.length]);

  const patch = {
    priority: priority === KEEP ? undefined : priority,
    epic: epic.trim(),
    feature: feature.trim(),
  };
  const isEmpty = patch.priority === undefined && !patch.epic && !patch.feature;

  const tick = (id, on, shift) => {
    const ids = rows.map((r) => r.id);
    let range = [id];
    if (shift && lastChecked !== null && ids.includes(lastChecked)) {
      const [from, to] = [ids.indexOf(lastChecked), ids.indexOf(id)].sort((a, b) => a - b);
      range = ids.slice(from, to + 1);
    }
    onCheck(range, on, id);
  };

  const apply = () => {
    if (!n || isEmpty) return;
    const parts = [];
    if (patch.priority !== undefined) parts.push(patch.priority ? `Priority to "${patch.priority}"` : 'Priority to none');
    if (patch.epic) parts.push(`Epic to "${patch.epic}"`);
    const lockedKept = patch.epic ? stories.filter((s) => checked.has(s.id) && s.locked).length : 0; // their Epic is read-only
    const renumbered = patch.epic ? stories.filter((s) => checked.has(s.id) && !s.locked && s.epic.trim() !== patch.epic).length : 0;
    if (patch.feature) parts.push(`Feature to "${patch.feature}"`);
    if (!confirm(`Set ${parts.join(', ')} on ${n} ${n === 1 ? 'story' : 'stories'}?${renumbered ? `\n\n${renumbered} ${renumbered === 1 ? 'story gets' : 'stories get'} new IDs, and links to them are updated.` : ''}${lockedKept ? `\n\n${lockedKept} locked ${lockedKept === 1 ? 'story keeps' : 'stories keep'} ${lockedKept === 1 ? 'its' : 'their'} Epic.` : ''}\n\nThis cannot be undone.`)) return;
    const { skipped } = onApplyBulk(patch);
    setNote(skipped ? `${skipped} locked ${skipped === 1 ? 'story' : 'stories'} kept ${skipped === 1 ? 'its' : 'their'} Epic.` : '');
    setPriority(KEEP);
    setEpic('');
    setFeature('');
  };

  const lock = (on) => {
    const { skipped } = onLockChecked(on);
    setNote(skipped ? `${skipped} skipped (no ID)` : '');
  };

  return (
    <section id="storiesView" className="card stories-view" role="tabpanel" aria-labelledby="tabStories" hidden={hidden}>
      <div id="bulkBar" className="bulk-bar" hidden={n === 0}>
        <strong id="selectedCount" role="status" aria-live="polite">{`${n} selected${hiddenChecked ? ` (${hiddenChecked} hidden by the search)` : ''}`}</strong>
        <div>
          <label htmlFor="bulkPriority">Priority</label>
          <select id="bulkPriority" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value={KEEP}>No change</option>
            <option value="">None</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bulkEpic">Epic</label>
          <input type="text" id="bulkEpic" list="bulkEpicList" autoComplete="off" placeholder="No change" value={epic} onChange={(e) => setEpic(e.target.value)} />
        </div>
        <div>
          <label htmlFor="bulkFeature">Feature</label>
          <input type="text" id="bulkFeature" list="bulkFeatureList" autoComplete="off" placeholder="No change" value={feature} onChange={(e) => setFeature(e.target.value)} />
        </div>
        <button type="button" id="bulkApplyBtn" className="primary" disabled={isEmpty} onClick={apply}>Apply to selected</button>
        <button type="button" id="lockSelectedBtn" onClick={() => lock(true)} title="Lock the selected stories: reference only, not reviewed, reordered, moved or deleted">Lock selected</button>
        <button type="button" id="unlockSelectedBtn" onClick={() => lock(false)}>Unlock selected</button>
        <span id="bulkNote" className="muted" role="status" aria-live="polite">{note}</span>
      </div>
      <div className="row stories-search">
        <div className="grow">
          <input id="storiesSearch" type="text" autoComplete="off" value={query} placeholder="Search any word in any field of a story" onChange={(e) => setQuery(e.target.value)} />
        </div>
        {searching && <span id="storiesCount" className="muted" role="status" aria-live="polite">{`${rows.length} of ${allRows.length} stories`}</span>}
      </div>
      <div className="table-wrap">
        <table className="stories-table">
          <thead>
            <tr>
              <th className="check">
                <input
                  type="checkbox" id="selectAll" aria-label="Select all stories" ref={selectAll}
                  checked={rows.length > 0 && shownChecked === rows.length} disabled={!rows.length}
                  onChange={(e) => onCheckAll(e.target.checked, rows.map((r) => r.id))}
                />
              </th>
              <th>ID</th><th>Epic</th><th>Feature</th><th>Title</th><th className="num">Points</th><th>Priority</th><th>Depends On</th>
            </tr>
          </thead>
          <tbody id="storiesBody">
            {rows.map((s) => {
              const { errors, warnings } = storyIssues(s, problems.get(s.id));
              const on = checked.has(s.id);
              return (
                <tr key={s.id} className={[issueClass(errors, warnings), on ? 'checked' : ''].join(' ').trim()} title={rowTooltip(s, errors, warnings)}>
                  <td className="check">
                    <input
                      type="checkbox" aria-label={`Select ${storyLabel(s)}`} checked={on}
                      onChange={() => {}}
                      onClick={(e) => tick(s.id, e.currentTarget.checked, e.shiftKey)}
                    />
                  </td>
                  <td>{s.locked && <span className="lock-mark" title="Locked: reference only" aria-label="Locked">🔒</span>}{s.code}</td>
                  <td>{s.epic}</td>
                  <td>{s.feature}</td>
                  <td><button type="button" className="link-btn" onClick={() => onOpen(s.id)}>{storyLabel(s)}</button></td>
                  <td className="num">{s.points}</td>
                  <td>{s.priority}</td>
                  <td>{s.dependsOn.join(', ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p id="storiesEmpty" className="muted" hidden={rows.length > 0}>{searching && allRows.length ? `No story matches “${query.trim()}”.` : 'No stories yet.'}</p>
      <datalist id="bulkEpicList">{distinct(stories, 'epic').map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="bulkFeatureList">{distinct(stories, 'feature').map((v) => <option key={v} value={v} />)}</datalist>
    </section>
  );
}
