import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { tempConfig } from '../helpers/temp-config.mjs';

// The server reads the config when it is loaded, so PLANNER_CONFIG is set before it is required.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'server-log-test-'));
process.env.PLANNER_CONFIG = tempConfig(root);
const { server } = createRequire(import.meta.url)('../../portal/server/server.cjs');

const HEADERS = { 'X-Requested-With': 'the-toolbox', 'Content-Type': 'application/json' };
const logLines = () => fs.readFileSync(path.join(root, 'logs', 'writes.jsonl'), 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));

test("the portal's create, save and rename are logged by backlog and kind; the log is not reachable through the file API", async (t) => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}`;

  const made = await fetch(`${origin}/api/backlog/files`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ name: 'data', content: 'ID\r\n' }) });
  assert.equal(made.status, 201);
  const base = `${origin}/api/proposals/files`;
  const created = await fetch(base, { method: 'POST', headers: HEADERS, body: JSON.stringify({ name: 'data', content: 'a,b\r\n' }) });
  assert.equal(created.status, 201);
  const saved = await fetch(`${base}/data`, { method: 'PUT', headers: HEADERS, body: 'a,b\r\n1,2\r\n' });
  assert.equal(saved.status, 200);
  const renamed = await fetch(`${origin}/api/backlog/files/data`, { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ name: 'moved' }) });
  assert.equal(renamed.status, 200);

  const lines = logLines();
  assert.deepEqual(lines.map((l) => [l.writer, l.backlog, l.kind, l.bytes]), [
    ['portal', 'data', 'backlog', 4],
    ['portal', 'data', 'proposals', 5],
    ['portal', 'data', 'proposals', 10],
    ['portal', 'moved', 'backlog', 4],
  ]);
  assert.ok(lines.every((l) => l.store === undefined && l.file === undefined), 'the line names backlog and kind, not store and file');

  assert.equal((await fetch(`${origin}/api/logs/files`)).status, 404);
  assert.equal((await fetch(`${origin}/api/logs/files/writes`)).status, 404);
});

test('slices and the older diagrams folder are not kinds: the file API neither lists, reads nor writes them', async (t) => {
  fs.mkdirSync(path.join(root, 'moved', 'slices', 'sign-in'), { recursive: true });
  fs.writeFileSync(path.join(root, 'moved', 'repo.json'), '{ "path": "." }');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const kind of ['slices', 'diagrams']) {
    const base = `${origin}/api/${kind}/files`;
    const listed = await fetch(base);
    assert.equal(listed.status, 404, kind);
    assert.equal((await listed.json()).code, 'unknown-store', kind);
    assert.equal((await fetch(`${base}/moved`)).status, 404);
    assert.equal((await fetch(base, { method: 'POST', headers: HEADERS, body: JSON.stringify({ name: 'x', content: 'a\r\n' }) })).status, 404);
    assert.equal((await fetch(`${base}/moved`, { method: 'PUT', headers: HEADERS, body: 'a\r\n' })).status, 404);
  }
  assert.equal(fs.existsSync(path.join(root, 'x')), false);
  assert.equal(fs.readFileSync(path.join(root, 'moved', 'repo.json'), 'utf8'), '{ "path": "." }');
});
