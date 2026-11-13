import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { tempConfig } from '../helpers/temp-config.mjs';
import { startingFiles } from '../../logic/backlog/starting-files.js';
import { backlogFile } from '../../logic/storage/backlog-paths.cjs';

// The New button's create route. Mock data only: the committed sample data copied to a temp folder under .scratch/.
const here = path.dirname(fileURLToPath(import.meta.url));
const scratch = path.resolve(here, '..', '..', '..', '.scratch');
fs.mkdirSync(scratch, { recursive: true });
const root = fs.mkdtempSync(path.join(scratch, 'server-create-backlog-'));
fs.cpSync(path.join(here, '..', 'sample-data'), root, { recursive: true });
process.env.PLANNER_CONFIG = tempConfig(root);
const { server } = createRequire(import.meta.url)('../../portal/server/server.cjs');

const HEADERS = { 'X-Requested-With': 'the-toolbox', 'Content-Type': 'application/json' };
let origin;
test.before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => {
  server.close();
  fs.rmSync(root, { recursive: true });
});

const create = (name) => fetch(`${origin}/api/backlog/files`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ name }) });
const fileOf = (backlog, kind) => backlogFile(root, backlog, kind);
const snapshot = (dir) => Object.fromEntries(
  fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => { const f = path.join(e.parentPath, e.name); return [path.relative(dir, f), fs.readFileSync(f, 'utf8')]; }),
);

test('New creates all five files, each holding only its header row', async () => {
  const res = await create('new-backlog');
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { name: 'new-backlog' });
  const files = startingFiles();
  assert.equal(files.length, 5);
  for (const { kind, text } of files) {
    const file = fileOf('new-backlog', kind);
    assert.equal(fs.readFileSync(file, 'utf8'), text, kind);
    assert.equal(text.trim().split(/\r?\n/).length, 1, `${kind} has one row`);
  }
});

test('a second New is numbered and leaves the first unchanged', async () => {
  const before = snapshot(path.join(root, 'new-backlog'));
  const res = await create('new-backlog');
  assert.deepEqual(await res.json(), { name: 'new-backlog-2' });
  assert.deepEqual(snapshot(path.join(root, 'new-backlog')), before);
  assert.equal(Object.keys(snapshot(path.join(root, 'new-backlog-2'))).length, 6, 'the five starting files and backlog.json');
});

test('nothing is taken from an existing backlog, and the existing backlog is unchanged', async () => {
  const sample = path.join(root, 'sample');
  fs.mkdirSync(path.join(sample, 'user-stories'), { recursive: true });
  fs.writeFileSync(path.join(sample, 'lexicon.csv'), 'Term,Part of,Definition,Avoid,Notes\r\nWidget,,A thing,,\r\n');
  fs.writeFileSync(path.join(sample, 'user-stories', 'proposals.csv'), 'ID,Title\r\nNEW-1,Proposed one\r\n');
  const before = snapshot(sample);
  assert.ok(before['user-stories.csv'].split(/\r?\n/).length > 2, 'the sample backlog has stories');

  const res = await create('fresh');
  assert.equal(res.status, 201);
  for (const { kind, text } of startingFiles()) {
    assert.equal(fs.readFileSync(fileOf('fresh', kind), 'utf8'), text, kind);
  }
  assert.deepEqual(snapshot(sample), before);
});
