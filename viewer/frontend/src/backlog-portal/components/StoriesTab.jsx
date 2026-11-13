import { useEffect, useMemo, useRef, useState } from 'react';
import { fitWidths, makeRoom } from '../../lib/panel-size.js';
import { displayOrder } from '../../../../logic/backlog/model.js';
import { matchesQuery } from '../../../../logic/backlog/story-search.js';
import { filterOptions, filterStories, sortStories, visibleChecked } from '../../lib/story-table.js';
import TabHeader from './TabHeader.jsx';
import EmptyState from './EmptyState.jsx';
import StoriesBulkBar, { KEEP } from './StoriesBulkBar.jsx';
import StoriesFilters from './StoriesFilters.jsx';
import StoriesTable from './StoriesTable.jsx';
import {
  COLUMNS, SIZED, FIXED_TOTAL, CHECK_WIDTH, COLUMN_LIMITS, COLUMN_DEFAULTS, SHRINK_ORDER, fittedWidth,
} from './storiesColumns.js';
import { useConfirm } from '../hooks/useConfirm.js';
import usePanelSizes from '../hooks/usePanelSizes.js';

const distinct = (stories, key) => [...new Set(stories.map((o) => o[key].trim()).filter(Boolean))];

const NO_FILTER = { priority: '', epic: '', feature: '' };

// Every story in one table, with ticks and a bulk edit bar. The table itself is read-only.
export default function StoriesTab({ stories, headers, problems, checked, lastChecked, hidden, onOpen, onCheck, onCheckAll, onApplyBulk, onDeleteChecked }) {
  const ask = useConfirm();
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
  const columns = usePanelSizes('planner.colWidth', COLUMN_DEFAULTS, COLUMN_LIMITS);
  // Stored widths scaled down when they do not fit the container, so the table does not scroll sideways (unless even the
  // minimum widths do not fit). The stored widths stay as the user set them and apply again in a wider window.
  const shown = useMemo(() => {
    const keys = SIZED.map((c) => c.key);
    const fitted = fitWidths(keys.map((k) => columns.widths[k]), available, COLUMN_LIMITS.min);
    return Object.fromEntries(keys.map((k, i) => [k, fitted[i]]));
  }, [columns.widths, available]);
  // The Title column takes the width the others leave, so the table fills its container with no empty column.
  const spare = Number.isFinite(available) ? Math.max(0, available - SIZED.reduce((sum, c) => sum + shown[c.key], 0)) : 0;
  const widthOf = ({ key, fixed }) => fixed ?? shown[key] + (key === 'title' ? spare : 0);

  useEffect(() => {
    const measure = () => setAvailable(wrap.current.clientWidth ? wrap.current.clientWidth - CHECK_WIDTH - FIXED_TOTAL : Infinity);
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
  // Bulk actions work on the ticked rows on screen only. Ticked stories the search or filters hide keep their tick, are counted
  // as hidden and are never edited or deleted.
  const { ids: visibleIds, hiddenCount: hiddenChecked } = useMemo(() => visibleChecked(rows, checked), [rows, checked]);
  const n = visibleIds.size;
  const shownChecked = n;

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
    const others = SIZED.reduce((sum, c) => (c.key === key ? sum : sum + shown[c.key]), 0);
    columns.setWidths({ ...shown, [key]: Math.min(width, available - others) });
  };
  const commitAll = () => columns.commit(SIZED.map((c) => c.key));
  const fit = (key) => {
    const wanted = Math.min(fittedWidth(table.current, COLUMNS.findIndex((c) => c.key === key) + 1), COLUMN_LIMITS.max);
    columns.setWidths(makeRoom(shown, key, wanted, available, COLUMN_LIMITS.min, SHRINK_ORDER));
    commitAll();
  };

  // Click a header: ascending, then descending, then back to backlog order.
  const toggleSort = (key) => setSort((cur) => (cur?.key !== key ? { key, dir: 'asc' } : cur.dir === 'asc' ? { key, dir: 'desc' } : null));
  const clearSearch = () => {
    setQuery('');
    setFilter(NO_FILTER);
  };
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

  const apply = async () => {
    if (!n || isEmpty) return;
    const parts = [];
    if (patch.priority !== undefined) parts.push(patch.priority ? `Priority to "${patch.priority}"` : 'Priority to none');
    if (patch.epic) parts.push(`Epic to "${patch.epic}"`);
    const frozenSkipped = stories.filter((s) => visibleIds.has(s.id) && s.frozen).length; // read-only, so a bulk edit leaves them
    const renumbered = patch.epic ? stories.filter((s) => visibleIds.has(s.id) && !s.frozen && s.epic.trim() !== patch.epic).length : 0;
    if (patch.feature) parts.push(`Feature to "${patch.feature}"`);
    const noun = n === 1 ? 'story' : 'stories';
    const hiddenNote = hiddenChecked ? `\n\n${hiddenChecked} ticked ${hiddenChecked === 1 ? 'story is' : 'stories are'} hidden by the search or filters and stay unchanged.` : '';
    const message = `Set ${parts.join(', ')} on ${n} visible ${noun}.${hiddenNote}${renumbered ? `\n\n${renumbered} ${renumbered === 1 ? 'story gets' : 'stories get'} new IDs, and links to them are updated.` : ''}${frozenSkipped ? `\n\n${frozenSkipped} frozen ${frozenSkipped === 1 ? 'story is' : 'stories are'} skipped.` : ''}\n\nThis cannot be undone.`;
    if (!(await ask({ title: `Change ${n} ${noun}?`, message, confirmLabel: 'Apply to selected' }))) return;
    const { skipped } = onApplyBulk(patch, visibleIds);
    setNote(skipped ? `${skipped} frozen ${skipped === 1 ? 'story was' : 'stories were'} skipped.` : '');
    setPriority(KEEP);
    setEpic('');
    setFeature('');
  };

  const remove = async () => {
    const { deleted, skipped } = await onDeleteChecked(visibleIds, hiddenChecked);
    if (deleted) setNote(skipped ? `${skipped} frozen ${skipped === 1 ? 'story was' : 'stories were'} skipped.` : '');
    else if (skipped) setNote(`Nothing deleted: ${skipped === 1 ? 'the selected story is' : 'all selected stories are'} frozen.`);
  };

  return (
    <section id="storiesView" className="card stories-view" role="tabpanel" aria-labelledby="tabStories" hidden={hidden}>
      <TabHeader title="Stories" />
      <StoriesBulkBar
        checkedCount={checked.size} n={n} hiddenChecked={hiddenChecked} priority={priority} epic={epic} feature={feature}
        note={note} isEmpty={isEmpty} onPriority={setPriority} onEpic={setEpic} onFeature={setFeature}
        onApply={apply} onDelete={remove} onDeselectAll={() => onCheckAll(false, [...checked])}
      />
      <StoriesFilters
        query={query} filter={filter} options={options} filtering={filtering}
        onQuery={setQuery} onFilter={setFilterKey} onClear={() => setFilter(NO_FILTER)}
      />
      <p id="storiesCount" className="muted" role="status" aria-live="polite">{`${rows.length} of ${allRows.length} stories`}</p>
      <StoriesTable
        rows={rows} problems={problems} checked={checked} shownChecked={shownChecked} sort={sort} widthOf={widthOf}
        wrapRef={wrap} tableRef={table} selectAllRef={selectAll}
        onSort={toggleSort} onResize={resize} onCommitWidths={commitAll} onFit={fit}
        onCheckAll={onCheckAll} onTick={tick} onOpen={onOpen}
      />
      {rows.length === 0 && (narrowed && allRows.length
        ? <EmptyState title="No story matches" help="Change the search or the filters to see more stories." action={{ id: 'clearSearchBtn', label: 'Clear filters', onClick: clearSearch }} />
        : <EmptyState title="No stories yet" help="Add a story in the Editor tab, or propose some with the story skills." />)}
      <datalist id="bulkEpicList">{distinct(stories, 'epic').map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="bulkFeatureList">{distinct(stories, 'feature').map((v) => <option key={v} value={v} />)}</datalist>
    </section>
  );
}
