import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startingFiles } from '../../logic/backlog/starting-files.js';
import { parseCsv } from '../../logic/backlog/csv.js';
import { COLUMNS, BENCHED_COLUMN, loadBacklog } from '../../logic/backlog/model.js';
import { parseReview, REVIEW_COLUMNS } from '../../logic/review/review.js';
import { parseLexicon, COLUMNS as LEXICON_COLUMNS } from '../../logic/lexicon/lexicon.js';
import { parseSuggestions, COLUMNS as SUGGESTION_COLUMNS } from '../../logic/lexicon/lexicon-suggestions.js';

const require = createRequire(import.meta.url);
const { KINDS } = require('../../logic/storage/backlog-paths.cjs');

const textOf = (kind) => startingFiles().find((f) => f.kind === kind).text;

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
