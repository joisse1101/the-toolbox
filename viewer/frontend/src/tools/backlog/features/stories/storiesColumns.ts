// Column layout of the Stories table.

// A column with `fixed` has that width always and no drag handle: it fits its longest ID or its header label, so it is never clipped.
export const COLUMNS = [
  { key: 'code', label: 'ID', fixed: 136 }, { key: 'epic', label: 'Epic' }, { key: 'feature', label: 'Feature' },
  { key: 'title', label: 'Title' }, { key: 'points', label: 'Points', className: 'num', fixed: 96 },
  { key: 'priority', label: 'Priority', fixed: 88 }, // filtered, not sorted
  { key: 'dependsOn', label: 'Depends On', fixed: 144 },
];
export const SIZED = COLUMNS.filter((c) => !c.fixed); // the columns a user can drag
export const FIXED_TOTAL = COLUMNS.reduce((sum, c) => sum + (c.fixed ?? 0), 0);
export const CHECK_WIDTH = 28; // the selection column: fixed, no handle
export const COLUMN_LIMITS = { min: 48, max: 800 };
export const COLUMN_DEFAULTS = { epic: 160, feature: 160, title: 380 };
// When a column fitted to its text needs room, the others shrink to the minimum in this order.
export const SHRINK_ORDER = ['title', 'feature', 'epic'];
const CELL_PADDING = 16; // the 8px left and right padding of .stories-table cells
const HANDLE_ROOM = 6;

// Width of the widest text in a column, header included, like double-clicking a column border in Excel.
export function fittedWidth(table, index) {
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
