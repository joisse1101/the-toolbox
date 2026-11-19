import type { RefObject } from 'react';
import { storyIssues, storyLabel } from '#shared/backlog/model.ts';
import { issueClass, rowTooltip } from '#frontend/src/tools/backlog/shared/issues.ts';
import StateMark from '#frontend/src/shared/ui/StateMark.tsx';
import ResizeHandle from '#frontend/src/shared/ui/ResizeHandle.tsx';
import { COLUMNS, CHECK_WIDTH, COLUMN_LIMITS } from './storiesColumns.ts';
import type { Column } from './storiesColumns.ts';
import type { SortDir } from './story-table.ts';
import type { Story } from '#shared/types.ts';

const FROZEN_TICK_HINT = 'A frozen story cannot be changed in bulk';

// A cell's tooltip: its full text (the cell may be cut off), then the row's completeness reasons.
const cellTitle = (text: string, rowTip: string | undefined) => [text, rowTip].filter(Boolean).join('\n\n') || undefined;

// The read-only table: tick column, sortable headers with resize handles, one row per story.
// `wrapRef`, `tableRef` and `selectAllRef` are the refs StoriesTab measures and updates.
export default function StoriesTable({ rows, tickable, problems, checked, shownChecked, sort, widthOf, wrapRef, tableRef, selectAllRef, onSort, onResize, onCommitWidths, onFit, onCheckAll, onTick, onOpen }: {
  rows: Story[]; tickable: number[]; problems: ReadonlyMap<number, string[]>; checked: ReadonlySet<number>; shownChecked: number;
  sort: { key: string; dir: SortDir } | null; widthOf: (column: Column) => number;
  wrapRef: RefObject<HTMLDivElement | null>; tableRef: RefObject<HTMLTableElement | null>; selectAllRef: RefObject<HTMLInputElement | null>;
  onSort: (key: string) => void; onResize: (key: string, width: number) => void; onCommitWidths: () => void; onFit: (key: string) => void;
  onCheckAll: (on: boolean, ids: number[]) => void; onTick: (id: number, on: boolean, shift: boolean) => void; onOpen: (id: number) => void;
}) {
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
                checked={tickable.length > 0 && shownChecked === tickable.length} disabled={!tickable.length}
                onChange={(e) => onCheckAll(e.target.checked, tickable)}
              />
            </th>
            {COLUMNS.map((column) => {
              const { key, label, className, fixed } = column;
              const sorted = sort?.key === key;
              const sortState = sorted ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th key={key} className={className} aria-sort={sortState}>
                  <button type="button" className="link-btn" onClick={() => onSort(key)} title={`Sort by ${label}`}>
                    {label}
                    {sorted && <span className="sort-arrow" aria-hidden="true">{sort!.dir === 'asc' ? '▲' : '▼'}</span>}
                  </button>
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
                    disabled={s.frozen} title={s.frozen ? FROZEN_TICK_HINT : undefined}
                    onChange={() => {}}
                    onClick={(e) => onTick(s.id, e.currentTarget.checked, e.shiftKey)}
                  />
                </td>
                <td title={cellTitle(s.code, tip)}>{s.frozen && <span className="frozen-mark" title="Frozen: reference only, read-only" aria-label="Frozen">{'❄'}</span>}{s.code}</td>
                <td title={cellTitle(s.epic, tip)}>{s.epic}</td>
                <td title={cellTitle(s.feature, tip)}>{s.feature}</td>
                <td title={cellTitle(storyLabel(s), tip)}><button type="button" className="link-btn" onClick={() => onOpen(s.id)}><StateMark kind={issueClass(errors, warnings)} iconOnly />{storyLabel(s)}</button></td>
                <td className="num">{s.points}</td>
                <td title={cellTitle(s.dependsOn.join(', '), tip)}>{s.dependsOn.join(', ')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
