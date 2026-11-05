// The five files every new backlog starts with, each holding only its header row (BOM so Excel opens it as UTF-8).
// The one definition used by every way the system creates a backlog. Built from the column constants of each file's own
// module, so a column change shows up here with no second edit. Pure: no file access; the writer is
// storage/backlog-files.cjs, which places each file by its kind.

import { toCsv } from './csv.js';
import { COLUMNS, BENCHED_COLUMN } from './model.js';
import { REVIEW_COLUMNS } from '../review/review.js';
import { COLUMNS as LEXICON_COLUMNS } from '../lexicon/lexicon.js';
import { COLUMNS as SUGGESTION_COLUMNS } from '../lexicon/lexicon-suggestions.js';

const BOM = '﻿';

const headerOnly = (columns) => BOM + toCsv([columns]);

// A proposals file carries the Benched column that the backlog file has not (see proposalHeaders in model.js).
export function startingFiles() {
  return [
    { kind: 'backlog', text: headerOnly(COLUMNS) },
    { kind: 'review', text: headerOnly(REVIEW_COLUMNS) },
    { kind: 'proposals', text: headerOnly([...COLUMNS, BENCHED_COLUMN]) },
    { kind: 'lexicon', text: headerOnly(LEXICON_COLUMNS) },
    { kind: 'lexicon-suggestions', text: headerOnly(SUGGESTION_COLUMNS) },
  ];
}
