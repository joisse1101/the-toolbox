import { useEffect, useRef, useState } from 'react';
import { PRIORITIES, displayOrder, storyIssues, storyLabel } from '../model.js';
import { issueClass, rowTooltip } from './issues.js';

const KEEP = 'keep'; // bulk Priority "No change" ('' is "None", which clears)

const distinct = (stories, key) => [...new Set(stories.map((o) => o[key].trim()).filter(Boolean))];

// Every story in one table, with ticks and a bulk edit bar. The table itself is read-only.
export default function StoriesTab({ stories, checked, lastChecked, hidden, onOpen, onCheck, onCheckAll, onApplyBulk }) {
  const [priority, setPriority] = useState(KEEP);
  const [epic, setEpic] = useState('');
  const [capability, setCapability] = useState('');
  const selectAll = useRef(null);

  const rows = displayOrder(stories);
  const n = checked.size;

  useEffect(() => {
    selectAll.current.indeterminate = n > 0 && n < rows.length;
  }, [n, rows.length]);

  const patch = {
    priority: priority === KEEP ? undefined : priority,
    epic: epic.trim(),
    capability: capability.trim(),
  };
  const isEmpty = patch.priority === undefined && !patch.epic && !patch.capability;

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
    if (patch.capability) parts.push(`Capability to "${patch.capability}"`);
    if (!confirm(`Set ${parts.join(', ')} on ${n} ${n === 1 ? 'story' : 'stories'}?\n\nThis cannot be undone.`)) return;
    onApplyBulk(patch);
    setPriority(KEEP);
    setEpic('');
    setCapability('');
  };

  return (
    <section id="storiesView" className="card stories-view" role="tabpanel" aria-labelledby="tabStories" hidden={hidden}>
      <div id="bulkBar" className="bulk-bar" hidden={n === 0}>
        <strong id="selectedCount" role="status" aria-live="polite">{`${n} selected`}</strong>
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
          <label htmlFor="bulkCapability">Capability</label>
          <input type="text" id="bulkCapability" list="bulkCapabilityList" autoComplete="off" placeholder="No change" value={capability} onChange={(e) => setCapability(e.target.value)} />
        </div>
        <button type="button" id="bulkApplyBtn" className="primary" disabled={isEmpty} onClick={apply}>Apply to selected</button>
      </div>
      <div className="table-wrap">
        <table className="stories-table">
          <thead>
            <tr>
              <th className="check">
                <input
                  type="checkbox" id="selectAll" aria-label="Select all stories" ref={selectAll}
                  checked={rows.length > 0 && n === rows.length} disabled={!rows.length}
                  onChange={(e) => onCheckAll(e.target.checked, rows.map((r) => r.id))}
                />
              </th>
              <th>Epic</th><th>Capability</th><th>Feature</th><th className="num">Points</th><th>Priority</th>
            </tr>
          </thead>
          <tbody id="storiesBody">
            {rows.map((s) => {
              const { errors, warnings } = storyIssues(s);
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
                  <td>{s.epic}</td>
                  <td>{s.capability}</td>
                  <td><button type="button" className="link-btn" onClick={() => onOpen(s.id)}>{s.feature.trim() || 'New story'}</button></td>
                  <td className="num">{s.points}</td>
                  <td>{s.priority}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p id="storiesEmpty" className="muted" hidden={rows.length > 0}>No stories yet.</p>
      <datalist id="bulkEpicList">{distinct(stories, 'epic').map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="bulkCapabilityList">{distinct(stories, 'capability').map((v) => <option key={v} value={v} />)}</datalist>
    </section>
  );
}
