import { storyIssues, storyLabel } from '../../../../logic/backlog/model.js';
import { issueClass, rowTooltip } from './issues.js';
import StateMark from './StateMark.jsx';
import ResizeHandle from './ResizeHandle.jsx';
import { COLUMNS, CHECK_WIDTH, COLUMN_LIMITS } from './storiesColumns.js';

// A cell's tooltip: its full text (the cell may be cut off), then the row's completeness reasons.
const cellTitle = (text, rowTip) => [text, rowTip].filter(Boolean).join('\n\n') || undefined;

// The read-only table: tick column, sortable headers with resize handles, one row per story.
// `wrapRef`, `tableRef` and `selectAllRef` are the refs StoriesTab measures and updates.
export default function StoriesTable({ rows, problems, checked, shownChecked, sort, widthOf, wrapRef, tableRef, selectAllRef, onSort, onResize, onCommitWidths, onFit, onCheckAll, onTick, onOpen }) {
  return (
    <div className="table-wrap" ref={wrapRef}>
      <table className="stories-table" ref={tableRef}>
        <colgroup>
          <col style={{ width: CHECK_WIDTH }} />
          {COLUMNS.map((column) => <col key={column.key} style={{ width: widthOf(column) }} />)}
        </colgroup>
        <thead>
          <tr>
            <th className="check">
              <input
                type="checkbox" id="selectAll" aria-label="Select all stories" ref={selectAllRef}
                checked={rows.length > 0 && shownChecked === rows.length} disabled={!rows.length}
                onChange={(e) => onCheckAll(e.target.checked, rows.map((r) => r.id))}
              />
            </th>
            {COLUMNS.map((column) => {
              const { key, label, className, fixed } = column;
              const sorted = sort?.key === key;
              const sortState = sorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th key={key} className={className} aria-sort={key === 'priority' ? undefined : sortState}>
                  {key === 'priority' ? label : (
                    <button type="button" className="link-btn" onClick={() => onSort(key)} title={`Sort by ${label}`}>
                      {label}
                      {sorted && <span className="sort-arrow" aria-hidden="true">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  )}
                  {!fixed && (
                    <ResizeHandle
                      className="column-handle" label={`Resize the ${label} column`} value={widthOf(column)} {...COLUMN_LIMITS}
                      onChange={(w) => onResize(key, w)} onCommit={onCommitWidths} onReset={() => onFit(key)}
                    />
                  )}
                </th>
              );
            })}
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
                    onClick={(e) => onTick(s.id, e.currentTarget.checked, e.shiftKey)}
                  />
                </td>
                <td title={cellTitle(s.code, tip)}>{s.frozen && <span className="frozen-mark" title="Frozen: reference only, read-only" aria-label="Frozen">{'❄'}</span>}{s.code}</td>
                <td title={cellTitle(s.epic, tip)}>{s.epic}</td>
                <td title={cellTitle(s.feature, tip)}>{s.feature}</td>
                <td title={cellTitle(storyLabel(s), tip)}><button type="button" className="link-btn" onClick={() => onOpen(s.id)}><StateMark kind={issueClass(errors, warnings)} iconOnly />{storyLabel(s)}</button></td>
                <td className="num">{s.points}</td>
                <td>{s.priority}</td>
                <td title={cellTitle(s.dependsOn.join(', '), tip)}>{s.dependsOn.join(', ')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
