import type { AddressInfo } from 'node:net';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tempConfig } from '../helpers/temp-config.ts';
import { SAMPLE_BACKLOG_CSV } from '../helpers/backlog-tree.ts';
import { parseCsv, toCsv } from '#shared/backlog/csv.ts';
import { parseReview, serializeReview } from '#shared/review/review.ts';
import type { ReviewRow, RelinkReply } from '#shared/types.ts';
import { parseDesignIndexCsv, serializeDesignIndex } from '#shared/design/design-index-csv.ts';
import type { DesignIndexRow } from '#shared/design/design-index-csv.ts';

// POST /api/relink. Mock data only: a temp data folder built here, one folder per backlog.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'server-relink-test-'));
process.env.VIEWER_CONFIG = tempConfig(root);
const { server } = await import('#backend/server.ts');

const HEADERS = { 'X-Requested-With': 'the-toolbox', 'Content-Type': 'application/json' };
let origin: string;
test.before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
test.after(() => server.close());

const relink = (body: unknown) => fetch(`${origin}/api/relink`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
const file = (...parts: string[]) => path.join(root, ...parts);
const write = (text: string, ...parts: string[]) => {
  fs.mkdirSync(path.dirname(file(...parts)), { recursive: true });
  fs.writeFileSync(file(...parts), text);
};
const read = (...parts: string[]) => fs.readFileSync(file(...parts), 'utf8');
const dependsOf = (text: string) => {
  const table = parseCsv(text);
  const at = table[0].indexOf('Depends On');
  return table.slice(1).map((row) => row[at]);
};
const review = (over: Partial<ReviewRow>): ReviewRow => ({
  storyId: 'A-1', field: 'Title', action: 'replace', current: 'x', suggested: 'y', reason: 'r',
  area: 'Hierarchy', confidence: 'ready', group: '', status: 'open', ...over,
});

const STORIES = toCsv([['ID', 'Depends On'], ['S-1', 'A-1;A-2;A-3'], ['S-2', '']]);
const PROPOSALS = toCsv([['ID', 'Depends On', 'Benched'], ['P-1', 'A-1', 'No']]);
const REVIEW = serializeReview([review({ storyId: 'A-1' }), review({ storyId: 'S-1' })]);
const CHANGES = { 'A-1': 'A-9', 'A-2': '' };
const PAST = new Date('2020-01-01T00:00:00Z');

// Rebuilds the backlogs: `from` holds links that must stay, `b` and `d` hold links to the changed IDs, `c` holds none.
function build() {
  fs.rmSync(root, { recursive: true, force: true });
  write(STORIES, 'from', 'user-stories.csv');
  for (const name of ['b', 'd']) {
    write(STORIES, name, 'user-stories.csv');
    write(PROPOSALS, name, 'user-stories', 'proposals.csv');
    write(REVIEW, name, 'user-stories', 'review.csv');
  }
  write(toCsv([['ID', 'Depends On'], ['C-1', 'Z-1']]), 'c', 'user-stories.csv');
  fs.utimesSync(file('c', 'user-stories.csv'), PAST, PAST);
}

test('rewrites the links in the stories, proposals and review of every other backlog; from and an untouched backlog are not written', async () => {
  build();
  const res = await relink({ from: 'from', changes: CHANGES });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { updated: ['b', 'd'], failed: [] } satisfies RelinkReply);

  for (const name of ['b', 'd']) {
    assert.deepEqual(dependsOf(read(name, 'user-stories.csv')), ['A-9;A-3', ''], `${name} stories`);
    assert.deepEqual(dependsOf(read(name, 'user-stories', 'proposals.csv')), ['A-9'], `${name} proposals`);
    const rows = (parseReview(read(name, 'user-stories', 'review.csv')) as { rows: ReviewRow[] }).rows;
    assert.deepEqual(rows.map((r) => r.storyId), ['A-9', 'S-1'], `${name} review`);
  }
  assert.equal(read('from', 'user-stories.csv'), STORIES, 'from is untouched');
  assert.equal(fs.statSync(file('c', 'user-stories.csv')).mtime.getTime(), PAST.getTime(), 'a backlog with no changed link is not written');
  assert.equal(fs.existsSync(file('c', 'user-stories', 'proposals.csv')), false, 'a missing file is not created');
  assert.deepEqual(fs.readdirSync(file('b')).filter((n) => n.endsWith('.tmp')), [], 'no temp file is left');
});

test('only limits the update to the named backlogs', async () => {
  build();
  const res = await relink({ from: 'from', changes: CHANGES, only: ['d', 'from'] });
  assert.deepEqual(await res.json(), { updated: ['d'], failed: [] });
  assert.equal(read('b', 'user-stories.csv'), STORIES, 'b was not named');
  assert.deepEqual(dependsOf(read('d', 'user-stories.csv')), ['A-9;A-3', '']);
});

test('empty changes answer an empty reply and write nothing', async () => {
  build();
  const res = await relink({ from: 'from', changes: {} });
  assert.deepEqual(await res.json(), { updated: [], failed: [] });
  assert.equal(read('b', 'user-stories.csv'), STORIES);
});

test('a bad body is refused with 400 and writes nothing', async () => {
  build();
  const bad: unknown[] = [
    {},
    { changes: CHANGES },
    { from: '', changes: CHANGES },
    { from: 5, changes: CHANGES },
    { from: 'ghost', changes: CHANGES },
    { from: '../x', changes: CHANGES },
    { from: 'from' },
    { from: 'from', changes: null },
    { from: 'from', changes: ['A-1', 'A-2'] },
    { from: 'from', changes: { 'A-1': 5 } },
    { from: 'from', changes: CHANGES, only: 'b' },
    { from: 'from', changes: CHANGES, only: [1] },
    { from: 'from', changes: CHANGES, only: ['ghost'] },
    { from: 'from', changes: CHANGES, only: ['..%2Fb'] },
  ];
  for (const body of bad) assert.equal((await relink(body)).status, 400, JSON.stringify(body));
  const notJson = await fetch(`${origin}/api/relink`, { method: 'POST', headers: HEADERS, body: '{' });
  assert.equal(notJson.status, 400);
  assert.equal(read('b', 'user-stories.csv'), STORIES);
});

test('the request needs the header and the POST method', async () => {
  build();
  const noHeader = await fetch(`${origin}/api/relink`, { method: 'POST', body: JSON.stringify({ from: 'from', changes: CHANGES }) });
  assert.equal(noHeader.status, 403);
  assert.equal((await fetch(`${origin}/api/relink`, { headers: HEADERS })).status, 405);
  assert.equal(read('b', 'user-stories.csv'), STORIES);
});

test('a file that cannot be written is listed in failed while the other backlogs are still updated', async (t) => {
  build();
  const real = fs.promises.rename;
  t.mock.method(fs.promises, 'rename', async (from: fs.PathLike, to: fs.PathLike) => {
    if (String(to) === file('b', 'user-stories.csv')) throw Object.assign(new Error('EBUSY: resource busy or locked, rename'), { code: 'EBUSY' });
    return real(from, to);
  });
  const res = await relink({ from: 'from', changes: CHANGES });
  t.mock.restoreAll();

  assert.equal(res.status, 200);
  const reply = await res.json() as RelinkReply;
  assert.deepEqual(reply.updated, ['b', 'd'], 'b still had its other files written');
  assert.equal(reply.failed.length, 1);
  assert.equal(reply.failed[0].name, 'b');
  assert.equal(reply.failed[0].file, 'user-stories.csv');
  assert.match(reply.failed[0].message, /locked/);
  assert.equal(read('b', 'user-stories.csv'), STORIES, 'the locked file keeps its text');
  assert.deepEqual(dependsOf(read('b', 'user-stories', 'proposals.csv')), ['A-9']);
  assert.deepEqual(dependsOf(read('d', 'user-stories.csv')), ['A-9;A-3', '']);
  assert.deepEqual(fs.readdirSync(file('b')).filter((n) => n.endsWith('.tmp')), [], 'the temp file was removed');
});

test('a review file that does not parse is listed in failed and the backlog is not stopped', async () => {
  build();
  write('A,B\r\n1,2\r\n', 'b', 'user-stories', 'review.csv');
  const reply = await (await relink({ from: 'from', changes: CHANGES })).json() as RelinkReply;
  assert.deepEqual(reply.updated, ['b', 'd']);
  assert.deepEqual(reply.failed.map((f) => [f.name, f.file]), [['b', 'user-stories/review.csv']]);
  assert.deepEqual(dependsOf(read('b', 'user-stories.csv')), ['A-9;A-3', '']);
});

test('a migration forward reaches the proposals and open review rows of a third backlog; dismissed rows stay', async () => {
  build();
  // `from` is a copy of the sample backlog, the one that gave up B1-IAM-0002 (it moved to B3 as B3-IAM-0007).
  fs.mkdirSync(path.dirname(file('sample', 'user-stories.csv')), { recursive: true });
  fs.copyFileSync(SAMPLE_BACKLOG_CSV, file('sample', 'user-stories.csv'));
  const dismissed = review({ storyId: 'T-1', field: 'Depends On', action: 'add', current: '', suggested: 'B1-IAM-0002', status: 'dismissed' });
  write(toCsv([['ID', 'Depends On'], ['T-1', 'B1-IAM-0002']]), 'third', 'user-stories.csv');
  write(toCsv([['ID', 'Depends On', 'Benched'], ['NEW-1', 'B1-IAM-0002', 'No']]), 'third', 'user-stories', 'proposals.csv');
  write(serializeReview([
    review({ storyId: 'T-1', field: 'Depends On', action: 'add', current: '', suggested: 'B1-IAM-0002' }),
    dismissed,
  ]), 'third', 'user-stories', 'review.csv');

  const res = await relink({ from: 'sample', changes: { 'B1-IAM-0002': 'B3-IAM-0007' }, only: ['third'] });
  assert.deepEqual(await res.json(), { updated: ['third'], failed: [] } satisfies RelinkReply);

  assert.deepEqual(dependsOf(read('third', 'user-stories.csv')), ['B3-IAM-0007']);
  assert.deepEqual(dependsOf(read('third', 'user-stories', 'proposals.csv')), ['B3-IAM-0007']);
  const rows = (parseReview(read('third', 'user-stories', 'review.csv')) as { rows: ReviewRow[] }).rows;
  assert.deepEqual(rows.map((r) => [r.suggested, r.status]), [['B3-IAM-0007', 'open'], ['B1-IAM-0002', 'dismissed']]);
  assert.deepEqual(rows[1], dismissed, 'the dismissed row is unchanged');
});

// ---------- design-index.csv ----------

const design = (storyId: string, criterion = 'It works.', canvas = 'https://canvas.example/mock'): DesignIndexRow => ({
  storyId, story: `Story ${storyId}`, criterion, kind: 'main', artboards: ['home-desktop'], viewports: ['desktop'], canvas, extra: {},
});
const designText = (...ids: string[]) => serializeDesignIndex(ids.map((id) => design(id)));
const designIds = (text: string) => parseDesignIndexCsv(text).map((r) => r.storyId);

test('the changing backlog\'s own design index follows a renumber and drops the rows of a deleted story', async () => {
  build();
  write(designText('A-1', 'A-2', 'A-3'), 'from', 'design-index.csv');
  const res = await relink({ from: 'from', changes: CHANGES });
  assert.deepEqual(await res.json(), { updated: ['b', 'd', 'from'], failed: [] } satisfies RelinkReply);
  assert.deepEqual(designIds(read('from', 'design-index.csv')), ['A-9', 'A-3'], 'A-1 renamed, A-2 dropped');
  assert.equal(parseDesignIndexCsv(read('from', 'design-index.csv'))[0].canvas, 'https://canvas.example/mock', 'the canvas stays on the row');
  assert.deepEqual(fs.readdirSync(file('from')).filter((n) => n.endsWith('.tmp')), []);
});

test('a swap of two IDs is applied once to the own design index, and a retry for another backlog does not apply it again', async (t) => {
  build();
  write(designText('A-1', 'A-2'), 'from', 'design-index.csv');
  const swap = { 'A-1': 'A-2', 'A-2': 'A-1' };
  const real = fs.promises.rename;
  t.mock.method(fs.promises, 'rename', async (from: fs.PathLike, to: fs.PathLike) => {
    if (String(to) === file('b', 'user-stories.csv')) throw Object.assign(new Error('EBUSY: resource busy or locked, rename'), { code: 'EBUSY' });
    return real(from, to);
  });
  const first = await (await relink({ from: 'from', changes: swap })).json() as RelinkReply;
  t.mock.restoreAll();
  assert.deepEqual(first.failed.map((f) => [f.name, f.file]), [['b', 'user-stories.csv']]);
  assert.deepEqual(designIds(read('from', 'design-index.csv')), ['A-2', 'A-1'], 'swapped once');

  const retry = await (await relink({ from: 'from', changes: swap, only: ['b'] })).json() as RelinkReply;
  assert.deepEqual(retry.failed, []);
  assert.deepEqual(designIds(read('from', 'design-index.csv')), ['A-2', 'A-1'], 'the retry for b did not swap it again');
});

test('a locked own design index is reported in failed under the backlog\'s own name, and a retry that names it writes it once', async (t) => {
  build();
  write(designText('A-1', 'A-2'), 'from', 'design-index.csv');
  const before = read('from', 'design-index.csv');
  const swap = { 'A-1': 'A-2', 'A-2': 'A-1' };
  const real = fs.promises.rename;
  t.mock.method(fs.promises, 'rename', async (from: fs.PathLike, to: fs.PathLike) => {
    if (String(to) === file('from', 'design-index.csv')) throw Object.assign(new Error('EBUSY: resource busy or locked, rename'), { code: 'EBUSY' });
    return real(from, to);
  });
  const first = await (await relink({ from: 'from', changes: swap })).json() as RelinkReply;
  t.mock.restoreAll();
  assert.deepEqual(first.failed.map((f) => [f.name, f.file]), [['from', 'design-index.csv']]);
  assert.match(first.failed[0].message, /locked/);
  assert.equal(read('from', 'design-index.csv'), before, 'the locked file keeps its text');

  const retry = await (await relink({ from: 'from', changes: swap, only: ['from'] })).json() as RelinkReply;
  assert.deepEqual(retry, { updated: ['from'], failed: [] });
  assert.deepEqual(designIds(read('from', 'design-index.csv')), ['A-2', 'A-1']);
});

test('an own design index that names none of the IDs, and one that is missing, are not written', async () => {
  build();
  write(designText('Z-1'), 'from', 'design-index.csv');
  fs.utimesSync(file('from', 'design-index.csv'), PAST, PAST);
  const res = await relink({ from: 'from', changes: CHANGES });
  assert.deepEqual((await res.json() as RelinkReply).updated, ['b', 'd']);
  assert.equal(fs.statSync(file('from', 'design-index.csv')).mtime.getTime(), PAST.getTime(), 'untouched file keeps its time');
  assert.equal(fs.existsSync(file('b', 'design-index.csv')), false, 'a missing file is not created');
});

test('the design index of another backlog follows IDs that its rows name; a file that names none is not written', async () => {
  build();
  write(designText('A-1', 'S-1'), 'b', 'design-index.csv'); // a migrated row names the source's old ID
  write(designText('Q-1'), 'd', 'design-index.csv');
  fs.utimesSync(file('d', 'design-index.csv'), PAST, PAST);
  const res = await relink({ from: 'from', changes: { 'A-1': 'B3-0007' } });
  assert.deepEqual((await res.json() as RelinkReply).failed, []); // d's stories change, its design index does not
  assert.deepEqual(designIds(read('b', 'design-index.csv')), ['B3-0007', 'S-1']);
  assert.equal(fs.statSync(file('d', 'design-index.csv')).mtime.getTime(), PAST.getTime());
});

test('a design index that does not read is listed in failed with its row and column', async () => {
  build();
  write('Story ID,Story,Criterion,Kind,Artboards,Viewports,Canvas\r\nA-1,S,c,sideways,,desktop,u\r\n', 'b', 'design-index.csv');
  const reply = await (await relink({ from: 'from', changes: CHANGES })).json() as RelinkReply;
  assert.deepEqual(reply.failed.map((f) => [f.name, f.file]), [['b', 'design-index.csv']]);
  assert.match(reply.failed[0].message, /row 2/);
  assert.match(reply.failed[0].message, /Kind/);
});
