import type { AddressInfo } from 'node:net';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tempConfig } from '../helpers/temp-config.ts';
import { parseCsv, toCsv } from '#shared/backlog/csv.ts';
import { parseReview, serializeReview } from '#shared/review/review.ts';
import type { ReviewRow, RelinkReply } from '#shared/types.ts';

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
