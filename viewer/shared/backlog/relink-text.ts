// Text-level relinking of the files of a backlog that is not open: the backlog CSV, its proposals CSV and its review
// CSV. Each helper takes the file's text and the ID changes of another backlog (old code -> new code, '' = deleted, see
// `idChanges` in ids.ts) and returns the new text, or `null` when the text would not change, so the caller writes nothing.
// Pure, no file access. Nothing is renumbered: only the entries that name a changed ID are rewritten.

import { parseCsv, toCsv } from './csv.ts';
import { relinkStories } from './ids.ts';
import type { Linked } from './ids.ts';
import { parseReview, retargetRows, serializeReview } from '../review/review.ts';

const BOM = '﻿';
const DEPENDS_ON = 'depends on';

// Rewrite the Depends On cell of every row. Rows are handled as the CSV holds them, so every other cell, row and column,
// the header order and an unknown column stay as they are, and a cell that names no changed ID keeps its exact text.
// A file without a Depends On column has nothing to rewrite.
function relinkDependsOnText(text: string, changes: ReadonlyMap<string, string>): string | null {
  if (!changes.size) return null;
  const table = parseCsv(text);
  const column = table.length ? table[0].findIndex((h) => h.trim().toLowerCase() === DEPENDS_ON) : -1;
  if (column < 0) return null;

  const rows = table.slice(1).flatMap((cells, at) => (cells[column] === undefined ? [] : [{ at, cells }]));
  const links: Linked[] = rows.map(({ cells }) => ({
    dependsOn: [...new Set(cells[column].split(';').map((e) => e.trim()).filter(Boolean))],
    ambiguous: [],
  }));
  const relinked = relinkStories(links, changes);
  if (relinked === links) return null;

  const out = table.map((cells) => cells.slice());
  rows.forEach(({ at }, i) => {
    if (relinked[i] !== links[i]) out[at + 1][column] = relinked[i].dependsOn.join(';');
  });
  return (text.charCodeAt(0) === 0xfeff ? BOM : '') + toCsv(out);
}

// The backlog's `user-stories.csv`.
export const relinkBacklogText = relinkDependsOnText;

// The backlog's `proposals.csv`: the backlog's columns plus Benched, so the same rewrite applies.
export const relinkProposalsText = relinkDependsOnText;

// The backlog's `review.csv`: `retargetRows` moves the open rows, so applied and dismissed rows stay as written. The text is
// written back with the review writer, which is how the portal saves it. A file that does not read as a review file throws,
// so the caller can report that file.
export function relinkReviewText(text: string, changes: ReadonlyMap<string, string>): string | null {
  if (!changes.size) return null;
  const parsed = parseReview(text);
  if (!parsed.ok) throw new Error(parsed.error);
  const rows = retargetRows(parsed.rows, changes);
  return rows === parsed.rows ? null : serializeReview(rows);
}
