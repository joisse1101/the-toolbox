import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsv, toCsv } from '#shared/backlog/csv.ts';
import { relinkBacklogText, relinkProposalsText, relinkReviewText } from '#shared/backlog/relink-text.ts';
import { parseReview, serializeReview } from '#shared/review/review.ts';
import type { ReviewRow } from '#shared/types.ts';
import { SAMPLE_BACKLOG_CSV } from '../helpers/backlog-tree.ts';

// The committed sample, read as text and never written. B1-R-0002 depends on B1-R-0001, B1-IAM-0002 on B1-IAM-0001.
const sample = fs.readFileSync(SAMPLE_BACKLOG_CSV, 'utf8');
const dependsOnOf = (text: string): string[] => {
  const table = parseCsv(text);
  const at = table[0].indexOf('Depends On');
  return table.slice(1).map((r) => r[at]);
};
const map = (...pairs: [string, string][]) => new Map(pairs);
const rowsOf = (text: string): ReviewRow[] => (parseReview(text) as { rows: ReviewRow[] }).rows;

test('relinkBacklogText: rewrites only the Depends On entries that name a changed ID', () => {
  const out = relinkBacklogText(sample, map(['B1-R-0001', 'B1-R-0007'])) as string;
  const before = parseCsv(sample);
  const after = parseCsv(out);
  const at = before[0].indexOf('Depends On');
  assert.deepEqual(after[0], before[0]);
  assert.equal(after.length, before.length);
  after.forEach((row, r) => row.forEach((cell, c) => {
    if (r > 0 && c === at && before[r][c] === 'B1-R-0001') assert.equal(cell, 'B1-R-0007');
    else assert.equal(cell, before[r][c]);
  }));
  assert.deepEqual(dependsOnOf(out), ['', 'B1-IAM-0001', '', 'B1-R-0007', '']);
});

test('relinkBacklogText: a key that is only the ID of a row, not a link, changes nothing', () => {
  assert.equal(relinkBacklogText(sample, map(['B1-R-0002', 'B1-R-0001'])), null);
});

test('relinkBacklogText: a deleted ID leaves the cell and keeps the other entries', () => {
  const text = toCsv([['ID', 'Depends On'], ['A', 'X;Y;Z'], ['B', 'X']]);
  const out = relinkBacklogText(text, map(['X', ''])) as string;
  assert.deepEqual(dependsOnOf(out), ['Y;Z', '']);
});

test('relinkBacklogText: a swap A to B and B to A is applied once', () => {
  const text = toCsv([['ID', 'Depends On'], ['S', 'A;B']]);
  const out = relinkBacklogText(text, map(['A', 'B'], ['B', 'A'])) as string;
  assert.deepEqual(dependsOnOf(out), ['B;A']);
});

test('relinkBacklogText: keeps an unknown column, the header order, the BOM and CRLF', () => {
  const table = parseCsv(sample).map((r, i) => [i === 0 ? 'Jira Key' : `J-${i}`, ...r]);
  const text = '﻿' + toCsv(table);
  const out = relinkBacklogText(text, map(['B1-R-0001', 'B1-R-0007'])) as string;
  const after = parseCsv(out);
  assert.equal(out.charCodeAt(0), 0xfeff);
  assert.ok(!/(^|[^\r])\n/.test(out.replace(/"[^"]*"/g, '""')), 'every line break outside a quoted cell is CRLF');
  assert.deepEqual(after[0], table[0]);
  assert.deepEqual(after.map((r) => r[0]), table.map((r) => r[0]));
  assert.equal(after[4][table[0].indexOf('Depends On')], 'B1-R-0007');
});

test('relinkBacklogText: returns null when nothing would change', () => {
  assert.equal(relinkBacklogText(sample, map()), null);
  assert.equal(relinkBacklogText(sample, map(['B1-X-0001', 'B1-X-0002'])), null);
  assert.equal(relinkBacklogText(toCsv([['ID', 'Title'], ['A', 'x']]), map(['A', 'B'])), null); // no Depends On column
  assert.equal(relinkBacklogText('', map(['A', 'B'])), null);
  assert.equal(relinkBacklogText(toCsv([['ID', 'Depends On'], ['A', '']]), map(['A', 'B'])), null);
});

test('relinkBacklogText: a cell that names no changed ID keeps its exact text', () => {
  const text = toCsv([['ID', 'Depends On'], ['A', ' P ; P ;Q'], ['B', 'X']]);
  const out = relinkBacklogText(text, map(['X', 'Y'])) as string;
  assert.deepEqual(dependsOnOf(out), [' P ; P ;Q', 'Y']);
});

test('relinkProposalsText: rewrites a proposals file, placeholders and the Benched column stay', () => {
  const header = [...parseCsv(sample)[0], 'Benched'];
  const at = header.indexOf('Depends On');
  const row = (id: string, dep: string, benched: string) => header.map((h, i) => (i === 0 ? id : i === at ? dep : h === 'Benched' ? benched : ''));
  const text = toCsv([header, row('NEW-1', 'B1-R-0001;NEW-2', 'Yes'), row('NEW-2', 'B1-IAM-0002', '')]);
  const out = relinkProposalsText(text, map(['B1-R-0001', 'B1-R-0004'], ['B1-IAM-0002', ''])) as string;
  assert.deepEqual(dependsOnOf(out), ['B1-R-0004;NEW-2', '']);
  assert.deepEqual(parseCsv(out).map((r) => r[0]), ['ID', 'NEW-1', 'NEW-2']);
  assert.equal(parseCsv(out)[1][header.indexOf('Benched')], 'Yes');
  assert.equal(relinkProposalsText(text, map(['B1-R-0009', 'B1-R-0010'])), null);
});

const review = (over: Partial<ReviewRow>): ReviewRow => ({
  storyId: 'B1-R-0001', field: 'Title', action: 'replace', current: 'Export a list as CSV', suggested: 'Export as CSV', reason: 'Shorter',
  area: 'Hierarchy', confidence: 'ready', group: '', status: 'open', ...over,
});

test('relinkReviewText: open rows follow the story, dismissed and applied rows stay as written', () => {
  const rows = [
    review({}),
    review({ status: 'dismissed' }),
    review({ status: 'applied', field: 'Depends On', action: 'add', current: 'B1-R-0001', suggested: 'B1-R-0001' }),
    review({ storyId: 'B1-R-0002', field: 'Depends On', action: 'add', current: 'B1-R-0001;B1-R-0009', suggested: 'B1-R-0001' }),
    review({ storyId: 'B1-IAM-0001' }),
  ];
  const out = relinkReviewText(serializeReview(rows), map(['B1-R-0001', 'B1-R-0007'])) as string;
  const back = rowsOf(out);
  assert.deepEqual(back.map((r) => r.storyId), ['B1-R-0007', 'B1-R-0001', 'B1-R-0001', 'B1-R-0002', 'B1-IAM-0001']);
  assert.deepEqual(back[1], rows[1]);
  assert.deepEqual(back[2], rows[2]);
  assert.equal(back[3].current, 'B1-R-0007;B1-R-0009');
  assert.equal(back[3].suggested, 'B1-R-0007');
  assert.deepEqual(back[4], rows[4]);
  assert.ok(out.includes('\r\n'));
});

test('relinkReviewText: a deleted story keeps its open rows, and a deleted entry leaves Current', () => {
  const rows = [
    review({}),
    review({ storyId: 'B1-R-0002', field: 'Depends On', action: 'remove', current: 'B1-R-0001;B1-R-0009', suggested: 'B1-R-0001' }),
  ];
  const back = rowsOf(relinkReviewText(serializeReview(rows), map(['B1-R-0001', ''])) as string);
  assert.equal(back[0].storyId, 'B1-R-0001'); // not an empty ID
  assert.equal(back[1].current, 'B1-R-0009');
  assert.equal(back[1].suggested, 'B1-R-0001'); // one story, so the text stays
  assert.equal(relinkReviewText(serializeReview([review({})]), map(['B1-R-0001', ''])), null); // nothing else to change
});

test('relinkReviewText: returns null when nothing would change, throws on a file that is not a review file', () => {
  const text = serializeReview([review({}), review({ status: 'dismissed' })]);
  assert.equal(relinkReviewText(text, map()), null);
  assert.equal(relinkReviewText(text, map(['B1-R-0050', 'B1-R-0051'])), null);
  assert.equal(relinkReviewText(serializeReview([review({ status: 'dismissed' })]), map(['B1-R-0001', 'B1-R-0002'])), null);
  assert.throws(() => relinkReviewText('A,B\r\n1,2\r\n', map(['A', 'B'])), /missing the column/);
});
