// The five files every new backlog starts with, each holding only its header row (BOM so Excel opens it as UTF-8).
// The one definition used by every way the system creates a backlog. Built from the column constants of each file's own
// module, so a column change shows up here with no second edit. Pure: no file access; the writer is
// storage/backlog-files.ts, which places each file by its kind.

import { toCsv } from '#shared/backlog/csv.ts';
import { COLUMNS, BENCHED_COLUMN } from '#shared/backlog/model.ts';
import { REVIEW_COLUMNS } from '#shared/review/review.ts';
import { COLUMNS as LEXICON_COLUMNS } from '#shared/lexicon/lexicon.ts';
import type { BacklogKind } from '#shared/types.ts';
import { COLUMNS as SUGGESTION_COLUMNS } from '#shared/lexicon/lexicon-suggestions.ts';

const BOM = '﻿';

const headerOnly = (columns: string[]) => BOM + toCsv([columns]);

// A proposals file carries the Benched column that the backlog file has not (see proposalHeaders in model.ts).
// The design index is not one of them: the design skill writes it.
export function startingFiles(): { kind: Exclude<BacklogKind, 'design-index'>; text: string }[] {
  return [
    { kind: 'backlog', text: headerOnly(COLUMNS) },
    { kind: 'review', text: headerOnly(REVIEW_COLUMNS) },
    { kind: 'proposals', text: headerOnly([...COLUMNS, BENCHED_COLUMN]) },
    { kind: 'lexicon', text: headerOnly(LEXICON_COLUMNS) },
    { kind: 'lexicon-suggestions', text: headerOnly(SUGGESTION_COLUMNS) },
  ];
}
