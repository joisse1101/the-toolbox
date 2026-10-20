import { useEffect, useMemo, useRef, useState } from 'react';
import { fitWidths, makeRoom } from '../../../../core/panel-size.js';
import { PRIORITIES, displayOrder, storyIssues, storyLabel } from '../../../../core/model.js';
import { matchesQuery } from '../../../../core/story-search.js';
import { filterOptions, filterStories, sortStories } from '../../../../core/story-table.js';
import { issueClass, rowTooltip } from './issues.js';
import ResizeHandle from './ResizeHandle.jsx';
import usePanelSizes from '../hooks/usePanelSizes.js';

const KEEP = 'keep'; // bulk Priority "No change" ('' is "None", which clears)

// A cell's tooltip: its full text (the cell may be cut off), then the row's completeness reasons.
const cellTitle = (text, rowTip) => [text, rowTip].filter(Boolean).join('\n\n') || undefined;

const distinct = (stories, key) => [...new Set(stories.map((o) => o[key].trim()).filter(Boolean))];

const COLUMNS = [
  { key: 'code', label: 'ID' }, { key: 'epic', label: 'Epic' }, { key: 'feature', label: 'Feature' },
  { key: 'title', label: 'Title' }, { key: 'points', label: 'Points', className: 'num' },
  { key: 'priority', label: 'Priority' }, // filtered, not sorted
  { key: 'dependsOn', label: 'Depends On' },
];
const CHECK_WIDTH = 28; // the selection column: fixed, no handle
const COLUMN_LIMITS = { min: 48, max: 800 };
const COLUMN_DEFAULTS = { code: 90, epic: 160, feature: 160, title: 380, points: 70, priority: 90, dependsOn: 140 };
// When a column fitted to its text needs room, the others shrink to the minimum in this order.
const SHRINK_ORDER = ['dependsOn', 'title', 'feature', 'epic', 'priority', 'points', 'code'];
const CELL_PADDING = 16; // the 8px left and right padding of .stories-table cells
const HANDLE_ROOM = 6;

// Width of the widest text in a column, header included, like double-clicking a column border in Excel.
function fittedWidth(table, index) {
  const context = document.createElement('canvas').getContext('2d');
  let widest = 0;
  for (const row of table.rows) {
    const cell = row.cells[index];
    const style = getComputedStyle(cell);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    widest = Math.max(widest, context.measureText(cell.textContent.trim()).width);
  }
  return Math.ceil(widest) + CELL_PADDING + HANDLE_ROOM;
}
const NO_FILTER = { priority: '', epic: '', feature: '' };

// Every story in one table, with ticks and a bulk edit bar. The table itself is read-only.
export default function StoriesTab({ stories, headers, problems, checked, lastChecked, hidden, onOpen, onCheck, onCheckAll, onApplyBulk, onLockChecked, onDeleteChecked }) {
  const [priority, setPriority] = useState(KEEP);
  const [epic, setEpic] = useState('');
  const [feature, setFeature] = useState('');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(NO_FILTER);
  const [sort, setSort] = useState(null); // { key, dir } or null = backlog order
  const selectAll = useRef(null);
  const table = useRef(null);
  const wrap = useRef(null);
  const [available, setAvailable] = useState(Infinity); // width the columns can share; unknown (or the tab hidden) = no limit
  const columns = usePanelSizes('tlt.colWidth', COLUMN_DEFAULTS, COLUMN_LIMITS);
  // Stored widths scaled down when they do not fit the container, so the table does not scroll sideways (unless even the
  // minimum widths do not fit). The stored widths stay as the user set them and apply again in a wider window.
  const shown = useMemo(() => {
    const keys = COLUMNS.map((c) => c.key);
    const fitted = fitWidths(keys.map((k) => columns.widths[k]), available, COLUMN_LIMITS.min);
    return Object.fromEntries(keys.map((k, i) => [k, fitted[i]]));
  }, [columns.widths, available]);

  useEffect(() => {
    const measure = () => setAvailable(wrap.current.clientWidth ? wrap.current.clientWidth - CHECK_WIDTH : Infinity);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap.current);
    return () => observer.disconnect();
  }, []);

  const allRows = useMemo(() => displayOrder(stories), [stories]);
  const searching = query.trim() !== '';
  const filtering = Object.values(filter).some(Boolean);
  const narrowed = searching || filtering;
  const rows = useMemo(() => {
    const filtered = filterStories(allRows, filter);
    const found = searching ? filtered.filter((s) => matchesQuery(s, query, headers)) : filtered;
    return sort ? sortStories(found, sort.key, sort.dir) : found;
  }, [allRows, filter, searching, query, headers, sort]);
  const options = useMemo(() => ({
    priority: filterOptions(stories, 'priority'), epic: filterOptions(stories, 'epic'), feature: filterOptions(stories, 'feature'),
  }), [stories]);
  const n = checked.size;
  const shownChecked = rows.filter((r) => checked.has(r.id)).length;
  const hiddenChecked = n - shownChecked; // ticked stories the search or filters hide; select-all and shift-range leave them alone

  useEffect(() => {
    selectAll.current.indeterminate = shownChecked > 0 && shownChecked < rows.length;
  }, [shownChecked, rows.length]);

  const patch = {
    priority: priority === KEEP ? undefined : priority,
    epic: epic.trim(),
    feature: feature.trim(),
  };
  const isEmpty = patch.priority === undefined && !patch.epic && !patch.feature;

  // Double-click a column handle: the column gets the width of its widest text (up to the column maximum).
  // A column grows only into the room the others leave; the others keep the widths shown, so nothing else moves.
  const resize = (key, width) => {
    const others = COLUMNS.reduce((sum, c) => (c.key === key ? sum : sum + shown[c.key]), 0);
    columns.setWidths({ ...shown, [key]: Math.min(width, available - others) });
  };
  const commitAll = () => columns.commit(COLUMNS.map((c) => c.key));
  const fit = (key) => {
    const wanted = Math.min(fittedWidth(table.current, COLUMNS.findIndex((c) => c.key === key) + 1), COLUMN_LIMITS.max);
    columns.setWidths(makeRoom(shown, key, wanted, available, COLUMN_LIMITS.min, SHRINK_ORDER));
    commitAll();
  };

  // Click a header: ascending, then descending, then back to backlog order.
  const toggleSort = (key) => setSort((cur) => (cur?.key !== key ? { key, dir: 'asc' } : cur.dir === 'asc' ? { key, dir: 'desc' } : null));
  const setFilterKey = (key, value) => setFilter((cur) => ({ ...cur, [key]: value }));

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

  const remove = () => {
    const { deleted, skipped } = onDeleteChecked();
    if (deleted) setNote(skipped ? `${skipped} locked ${skipped === 1 ? 'story was' : 'stories were'} kept.` : '');
    else if (skipped) setNote(`Nothing deleted: ${skipped === 1 ? 'the selected story is' : 'all selected stories are'} locked. Unlock to delete.`);
  };

  return (
    <section id="storiesView" className="card stories-view" role="tabpanel" aria-labelledby="tabStories" hidden={hidden}>
      <div id="bulkBar" className="bulk-bar">
        <div>
          <label htmlFor="bulkPriority">Priority</label>
          <select id="bulkPriority" disabled={n === 0} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value={KEEP}>No change</option>
            <option value="">None</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bulkEpic">Epic</label>
          <input type="text" id="bulkEpic" disabled={n === 0} list="bulkEpicList" autoComplete="off" placeholder="No change" value={epic} onChange={(e) => setEpic(e.target.value)} />
        </div>
        <div>
          <label htmlFor="bulkFeature">Feature</label>
          <input type="text" id="bulkFeature" disabled={n === 0} list="bulkFeatureList" autoComplete="off" placeholder="No change" value={feature} onChange={(e) => setFeature(e.target.value)} />
        </div>
        <button type="button" id="bulkApplyBtn" className="primary" disabled={n === 0 || isEmpty} onClick={apply}>Apply to selected</button>
        <button type="button" id="lockSelectedBtn" disabled={n === 0} onClick={() => lock(true)} title="Lock the selected stories: reference only, not reviewed, reordered, moved or deleted">Lock selected</button>
        <button type="button" id="unlockSelectedBtn" disabled={n === 0} onClick={() => lock(false)}>Unlock selected</button>
        <button type="button" id="deleteSelectedBtn" className="danger" disabled={n === 0} onClick={remove} title="Delete the selected stories; locked ones are kept">{`Delete selected (${n})`}</button>
        <button type="button" id="deselectAllBtn" disabled={n === 0} onClick={() => onCheckAll(false, [...checked])}>Deselect all</button>
        <span id="bulkNote" className="muted" role="status" aria-live="polite">{note}</span>
      </div>
      <div className="row stories-search">
        <div className="grow">
          <input id="storiesSearch" type="text" autoComplete="off" value={query} placeholder="Search any word in any field of a story" onChange={(e) => setQuery(e.target.value)} />
        </div>
        {[['priority', 'Priority'], ['epic', 'Epic'], ['feature', 'Feature']].map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`filter-${key}`}>{label}</label>
            <select id={`filter-${key}`} value={filter[key]} onChange={(e) => setFilterKey(key, e.target.value)}>
              <option value="">All</option>
              {options[key].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        ))}
        <button type="button" id="clearFiltersBtn" aria-label="Clear filters" title="Clear filters" disabled={!filtering} onClick={() => setFilter(NO_FILTER)}>X</button>
      </div>
      <p id="storiesCount" className="muted" role="status" aria-live="polite">{`${rows.length} of ${allRows.length} stories, ${n} selected${hiddenChecked ? ` (${hiddenChecked} hidden by the search or filters)` : ''}`}</p>
      <div className="table-wrap" ref={wrap}>
        <table className="stories-table" ref={table}>
          <colgroup>
            <col style={{ width: CHECK_WIDTH }} />
            {COLUMNS.map(({ key }) => <col key={key} style={{ width: shown[key] }} />)}
            <col />{/* takes the width left over, so the table fills its container */}
          </colgroup>
          <thead>
            <tr>
              <th className="check">
                <input
                  type="checkbox" id="selectAll" aria-label="Select all stories" ref={selectAll}
                  checked={rows.length > 0 && shownChecked === rows.length} disabled={!rows.length}
                  onChange={(e) => onCheckAll(e.target.checked, rows.map((r) => r.id))}
                />
              </th>
              {COLUMNS.map(({ key, label, className }) => (
                <th key={key} className={className} aria-sort={sort?.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {key === 'priority' ? label : (
                    <button type="button" className="link-btn" onClick={() => toggleSort(key)} title={`Sort by ${label}`}>
                      {`${label}${sort?.key === key ? (sort.dir === 'asc' ? ' ▲   ' : '    ▼') : ' ▲▼'}`}
                    </button>
                  )}
                  <ResizeHandle
                    className="column-handle" label={`Resize the ${label} column`} value={shown[key]} {...COLUMN_LIMITS}
                    onChange={(w) => resize(key, w)} onCommit={commitAll} onReset={() => fit(key)}
                  />
                </th>
              ))}
              <th className="filler" />
            </tr>
          </thead>
          <tbody id="storiesBody">
            {rows.map((s) => {
              const { errors, warnings } = storyIssues(s, problems.get(s.id));
              const on = checked.has(s.id);
              const tip = rowTooltip(s, errors, warnings);
              return (
                <tr key={s.id} className={[issueClass(errors, warnings), on ? 'checked' : ''].join(' ').trim()} title={tip}>
                  <td className="check">
                    <input
                      type="checkbox" aria-label={`Select ${storyLabel(s)}`} checked={on}
                      onChange={() => {}}
                      onClick={(e) => tick(s.id, e.currentTarget.checked, e.shiftKey)}
                    />
                  </td>
                  <td title={cellTitle(s.code, tip)}>{s.locked && <span className="lock-mark" title="Locked: reference only" aria-label="Locked">🔒</span>}{s.code}</td>
                  <td title={cellTitle(s.epic, tip)}>{s.epic}</td>
                  <td title={cellTitle(s.feature, tip)}>{s.feature}</td>
                  <td title={cellTitle(storyLabel(s), tip)}><button type="button" className="link-btn" onClick={() => onOpen(s.id)}>{storyLabel(s)}</button></td>
                  <td className="num">{s.points}</td>
                  <td>{s.priority}</td>
                  <td title={cellTitle(s.dependsOn.join(', '), tip)}>{s.dependsOn.join(', ')}</td>
                  <td className="filler" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p id="storiesEmpty" className="muted" hidden={rows.length > 0}>{narrowed && allRows.length ? 'No story matches the search and filters.' : 'No stories yet.'}</p>
      <datalist id="bulkEpicList">{distinct(stories, 'epic').map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="bulkFeatureList">{distinct(stories, 'feature').map((v) => <option key={v} value={v} />)}</datalist>
    </section>
  );
}
