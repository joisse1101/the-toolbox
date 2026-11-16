import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startingFiles } from '#backend/storage/starting-files.ts';
import { parseCsv } from '#shared/backlog/csv.ts';
import { COLUMNS, BENCHED_COLUMN, loadBacklog } from '#shared/backlog/model.ts';
import { parseReview, REVIEW_COLUMNS } from '#shared/review/review.ts';
import { parseLexicon, COLUMNS as LEXICON_COLUMNS } from '#shared/lexicon/lexicon.ts';
import { parseSuggestions, COLUMNS as SUGGESTION_COLUMNS } from '#shared/lexicon/lexicon-suggestions.ts';

import { KINDS } from '#shared/storage/backlog-paths.ts';

const textOf = (kind: string) => startingFiles().find((f) => f.kind === kind)!.text;

test('startingFiles returns one entry for each kind of file, in the order of KINDS', () => {
  assert.deepEqual(startingFiles().map((f) => f.kind), KINDS);
});

test('each starting file is a BOM and its own header row, with no rows', () => {
  const expected = {
    backlog: COLUMNS,
    review: REVIEW_COLUMNS,
    proposals: [...COLUMNS, BENCHED_COLUMN],
    lexicon: LEXICON_COLUMNS,
    'lexicon-suggestions': SUGGESTION_COLUMNS,
  };
  for (const { kind, text } of startingFiles()) {
    assert.equal(text.charCodeAt(0), 0xfeff, `${kind} starts with a BOM`);
    assert.deepEqual(parseCsv(text), [expected[kind]], `${kind} holds only its header row`);
  }
});

test('each starting file parses as an empty file', () => {
  const backlog = loadBacklog(textOf('backlog'), { initials: 'B1' });
  assert.equal(backlog.stories.length, 0);
  assert.deepEqual(backlog.headers, COLUMNS);

  const proposals = loadBacklog(textOf('proposals'), { placeholderIds: true });
  assert.equal(proposals.stories.length, 0);
  assert.equal(proposals.changed, false);

  assert.deepEqual(parseReview(textOf('review')), { ok: true, rows: [], skipped: 0 });
  assert.equal(parseLexicon(textOf('lexicon')).terms.length, 0);
  const suggestions = parseSuggestions(textOf('lexicon-suggestions'));
  assert.equal(suggestions.rows.length, 0);
  assert.equal(suggestions.skipped, 0);
});
