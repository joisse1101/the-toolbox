import type { AddressInfo } from 'node:net';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Static serving and the page-address fallback. Mock data only: a temp dist folder built here under .scratch/,
// reached through VIEWER_DIST_DIR (read when the server loads, so it is set before the require).
const scratch = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.scratch');
fs.mkdirSync(scratch, { recursive: true });
const dist = fs.mkdtempSync(path.join(scratch, 'server-static-test-'));
const INDEX = '<!doctype html><title>temp app</title>';
fs.mkdirSync(path.join(dist, 'assets'));
fs.writeFileSync(path.join(dist, 'index.html'), INDEX);
fs.writeFileSync(path.join(dist, 'assets', 'app.js'), 'console.log(1);');
process.env.VIEWER_DIST_DIR = dist;
const { server, staticTarget } = await import('../../backend/server.ts');

let origin: string;
test.before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
test.after(() => {
  server.close();
  fs.rmSync(dist, { recursive: true });
});

test('staticTarget: api under /api/, file with an extension in the last segment, app otherwise', () => {
  assert.equal(staticTarget('/api/nothing'), 'api');
  assert.equal(staticTarget('/api'), 'api', 'the bare API root is not a page address');
  assert.equal(staticTarget('/assets/app.js'), 'file');
  assert.equal(staticTarget('/index.html'), 'file');
  assert.equal(staticTarget('/'), 'app');
  assert.equal(staticTarget('/backlog/graph'), 'app');
  assert.equal(staticTarget('/backlog-portal/'), 'app');
  assert.equal(staticTarget('/v1.2/graph'), 'app', 'a dot in an earlier segment is not an extension');
});

test('reload on a tab address: 200 with index.html (GET and HEAD)', async () => {
  const res = await fetch(`${origin}/backlog/graph`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), INDEX);
  const head = await fetch(`${origin}/backlog/graph`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal((await fetch(`${origin}/`)).status, 200);
});

test('missing asset: 404', async () => {
  assert.equal((await fetch(`${origin}/assets/missing.js`)).status, 404);
  assert.equal((await fetch(`${origin}/assets/missing.js`, { method: 'HEAD' })).status, 404);
});

test('unknown API route: 404 and not index.html', async () => {
  const res = await fetch(`${origin}/api/nothing`);
  assert.equal(res.status, 404);
  assert.notEqual(await res.text(), INDEX);
});

test('an existing built file is served with its type', async () => {
  const res = await fetch(`${origin}/assets/app.js`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'console.log(1);');
  assert.match(res.headers.get('content-type')!, /javascript/);
});

test('a path that climbs out of dist is not served', async () => {
  const res = await fetch(`${origin}/..%2F..%2Fpackage.json`);
  assert.equal(res.status, 404);
});
