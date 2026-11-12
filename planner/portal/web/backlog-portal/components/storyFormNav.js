const $ = (id) => document.getElementById(id);

// Rows of focusable fields for arrow-key navigation: Where it fits, User story, points, each criterion, notes.
function navRows(story) {
  return [
    ['epic', 'feature', 'title'].map($),
    ['asA', 'iWant', 'soThat'].map($),
    [...$('pointsGroup').children],
    ...story.criteria.map((_, i) => ['given', 'when', 'then'].map((k) => $(`criterion-${i}-${k}`))),
    [$('notes')],
  ];
}

function focusRow(row, col) {
  if (row.length && row[0].parentElement === $('pointsGroup')) {
    (row.find((b) => b.getAttribute('aria-checked') === 'true') ?? row[0]).focus();
  } else {
    row[Math.min(col, row.length - 1)].focus();
  }
}

// Left/right move within a row of fields (text inputs only at the caret edge, so editing still works), up/down
// move between rows. Sprint points: left/right step through the buttons, Alt+Right goes to Priority, Alt+Left back.
export function onNavKeyDown(e, story) {
  if (e.nativeEvent.isComposing || (e.ctrlKey && !e.altKey) || e.metaKey || e.shiftKey || !e.key.startsWith('Arrow')) return;
  const el = e.target;
  const rows = navRows(story);
  const pointsRow = rows[2];
  const isPriority = el === $('priority');
  const rowIdx = isPriority ? 2 : rows.findIndex((r) => r.includes(el));
  if (rowIdx < 0) return;
  const col = isPriority ? pointsRow.length : rows[rowIdx].indexOf(el);

  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    if (el.parentElement === $('pointsGroup')) {
      if (e.altKey) {
        if (dir !== 1) return;
        $('priority').focus();
      } else {
        pointsRow[col + dir]?.focus();
      }
    } else if (isPriority) {
      if (!(e.altKey && dir === -1)) return;
      focusRow(pointsRow, 0);
    } else if (el.tagName === 'INPUT' && (!e.altKey || e.ctrlKey)) {
      // Ctrl+Alt jumps regardless of the caret position
      const atEdge = e.ctrlKey || (el.selectionStart === el.selectionEnd && el.selectionStart === (dir < 0 ? 0 : el.value.length));
      const next = rows[rowIdx][col + dir];
      if (!atEdge || !next) return;
      next.focus();
    } else {
      return;
    }
    e.preventDefault();
    return;
  }

  if (e.altKey) return;
  const dir = e.key === 'ArrowUp' ? -1 : 1;
  if (el.tagName === 'TEXTAREA') {
    const hasLineThatWay = dir < 0 ? el.value.slice(0, el.selectionStart).includes('\n') : el.value.slice(el.selectionEnd).includes('\n');
    if (hasLineThatWay) return;
  }
  const target = rows[rowIdx + dir];
  if (!target) return;
  e.preventDefault();
  focusRow(target, col);
}
