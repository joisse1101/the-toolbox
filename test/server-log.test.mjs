import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// The server reads TLT_DATA_DIR when it is loaded, so the folder is set before it is required.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'server-log-test-'));
process.env.TLT_DATA_DIR = root;
const { server } = createRequire(import.meta.url)('../app/backend/server.cjs');

const HEADERS = { 'X-Requested-With': 'the-toolbox', 'Content-Type': 'application/json' };
const logLines = () => fs.readFileSync(path.join(root, 'logs', 'writes.jsonl'), 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));

test("the portal's create, save and rename are logged; the log is not reachable through the file API", async (t) => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}`;
  const base = `${origin}/api/proposals/files`;

  const created = await fetch(base, { method: 'POST', headers: HEADERS, body: JSON.stringify({ name: 'data.csv', content: 'a,b\r\n' }) });
  assert.equal(created.status, 201);
  const saved = await fetch(`${base}/data.csv`, { method: 'PUT', headers: HEADERS, body: 'a,b\r\n1,2\r\n' });
  assert.equal(saved.status, 200);
  const renamed = await fetch(`${base}/data.csv`, { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ name: 'moved.csv' }) });
  assert.equal(renamed.status, 200);

  const lines = logLines();
  assert.deepEqual(lines.map((l) => [l.writer, l.store, l.file, l.bytes]), [
    ['portal', 'proposals', 'data.csv', 5],
    ['portal', 'proposals', 'data.csv', 10],
    ['portal', 'proposals', 'moved.csv', 10],
  ]);
  assert.equal(lines[1].hash, lines[2].hash, 'a rename keeps the content, so the hash is the same');

  assert.equal((await fetch(`${origin}/api/logs/files`)).status, 404);
  assert.equal((await fetch(`${origin}/api/logs/files/writes.jsonl`)).status, 404);
});
