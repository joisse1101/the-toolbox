import type { KeyboardEvent } from 'react';
import type { Story } from '#shared/types.ts';

const $ = (id: string) => document.getElementById(id)!;

// Rows of focusable fields for arrow-key navigation: Where it fits, User story, points, each criterion, notes.
function navRows(story: Story): HTMLElement[][] {
  return [
    ['epic', 'feature', 'title'].map($),
    ['asA', 'iWant', 'soThat'].map($),
    [...$('pointsGroup').children] as HTMLElement[],
    ...story.criteria.map((_, i) => ['given', 'when', 'then'].map((k) => $(`criterion-${i}-${k}`))),
    [$('notes')],
  ];
}

function focusRow(row: HTMLElement[], col: number) {
  if (row.length && row[0].parentElement === $('pointsGroup')) {
    (row.find((b) => b.getAttribute('aria-checked') === 'true') ?? row[0]).focus();
  } else {
    row[Math.min(col, row.length - 1)].focus();
  }
}

// Left/right move within a row of fields (text inputs only at the caret edge, so editing still works), up/down
// move between rows. Sprint points: left/right step through the buttons.
export function onNavKeyDown(e: KeyboardEvent<HTMLElement>, story: Story) {
  if (e.nativeEvent.isComposing || (e.ctrlKey && !e.altKey) || e.metaKey || e.shiftKey || !e.key.startsWith('Arrow')) return;
  const el = e.target as HTMLInputElement | HTMLTextAreaElement; // a field of the form: input, textarea or a points button
  const rows = navRows(story);
  const pointsRow = rows[2];
  const rowIdx = rows.findIndex((r) => r.includes(el));
  if (rowIdx < 0) return;
  const col = rows[rowIdx].indexOf(el);

  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    if (el.parentElement === $('pointsGroup')) {
      if (e.altKey) return;
      pointsRow[col + dir]?.focus();
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
    const hasLineThatWay = dir < 0 ? el.value.slice(0, el.selectionStart as number).includes('\n') : el.value.slice(el.selectionEnd as number).includes('\n');
    if (hasLineThatWay) return;
  }
  const target = rows[rowIdx + dir];
  if (!target) return;
  e.preventDefault();
  focusRow(target, col);
}
