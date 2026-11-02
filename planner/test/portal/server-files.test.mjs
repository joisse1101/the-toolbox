import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { tempConfig } from '../helpers/temp-config.mjs';

// The file API on backlog folders. Mock data only: a temp data folder built here in the one-folder-per-backlog layout.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'server-files-test-'));
process.env.PLANNER_CONFIG = tempConfig(root);
const { server } = createRequire(import.meta.url)('../../portal/server/server.cjs');

const HEADERS = { 'X-Requested-With': 'the-toolbox', 'Content-Type': 'application/json' };
let origin;
test.before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const call = (method, url, body) => fetch(`${origin}${url}`, { method, headers: HEADERS, body: body === undefined ? undefined : JSON.stringify(body) });
const listed = async (kind = 'backlog') => (await (await fetch(`${origin}/api/${kind}/files`)).json()).files;
const put = (dir, file, text) => {
  fs.mkdirSync(path.dirname(path.join(root, dir, file)), { recursive: true });
  fs.writeFileSync(path.join(root, dir, file), text);
};

test('list: the subfolders holding user-stories.csv, sorted, by folder name; logs, other folders and the older layout are not backlogs', async () => {
  assert.deepEqual(await listed(), [], 'an empty data folder lists nothing and raises no error');
  put('b', 'user-stories.csv', 'ID\r\n');
  put('a', 'user-stories.csv', 'ID\r\n');
  put('notes', 'readme.txt', 'x');
  put('logs', 'writes.jsonl', '');
  put('backlogs', 'old.csv', 'ID\r\n'); // the older layout is never read
  assert.deepEqual(await listed(), ['a', 'b']);
});

test('list of another kind: only the backlogs that have that file', async () => {
  put('a', 'lexicon.csv', 'Term\r\n');
  assert.deepEqual(await listed('lexicon'), ['a']);
  assert.deepEqual(await listed('proposals'), []);
});

test('read and write go to the fixed file of the kind; a write never creates', async () => {
  put('a', 'user-stories.csv', 'ID\r\nA-1\r\n');
  put('a', 'user-stories/review.csv', 'R\r\n');
  const read = await (await fetch(`${origin}/api/backlog/files/a`)).json();
  assert.deepEqual(read, { name: 'a', content: 'ID\r\nA-1\r\n' });
  assert.equal((await (await fetch(`${origin}/api/backlog/files/a.csv`)).json()).name, 'a', 'a trailing .csv is dropped');
  assert.equal((await (await fetch(`${origin}/api/review/files/a`)).json()).content, 'R\r\n');
  assert.equal((await fetch(`${origin}/api/lexicon/files/b`)).status, 404, 'a missing file is not found');

  const saved = await fetch(`${origin}/api/lexicon/files/a`, { method: 'PUT', headers: HEADERS, body: 'Term\r\nx\r\n' });
  assert.equal(saved.status, 200);
  assert.equal(fs.readFileSync(path.join(root, 'a', 'lexicon.csv'), 'utf8'), 'Term\r\nx\r\n');
  assert.equal((await fetch(`${origin}/api/proposals/files/a`, { method: 'PUT', headers: HEADERS, body: 'x' })).status, 404);
  assert.equal(fs.existsSync(path.join(root, 'a', 'user-stories', 'proposals.csv')), false, 'PUT did not create it');
});

test('unsafe names are rejected and touch nothing', async () => {
  const before = fs.readdirSync(root, { recursive: true }).sort();
  for (const name of ['..%2Fsecret', 'a%2Fb', 'a%5Cb', '..%2F..', 'logs']) {
    for (const method of ['GET', 'PUT']) {
      const res = await fetch(`${origin}/api/backlog/files/${name}`, { method, headers: HEADERS, body: method === 'PUT' ? 'x' : undefined });
      assert.equal(res.status, 400, `${method} ${name}`);
    }
  }
  for (const name of ['../x', 'a/b', 'a\\b', 'logs']) {
    assert.equal((await call('POST', '/api/backlog/files', { name, content: '' })).status, 400, `create ${name}`);
  }
  assert.equal((await call('PATCH', '/api/backlog/files/a', { name: '../x' })).status, 400);
  assert.equal((await call('PATCH', '/api/backlog/files/a', { name: 'logs' })).status, 400, 'logs is a reserved name');
  assert.deepEqual(fs.readdirSync(root, { recursive: true }).sort(), before, 'nothing was created or moved');
});

test('other kinds and routes are unknown: slices, logs, backups and a store-style name', async () => {
  for (const kind of ['slices', 'logs', 'backups', 'backlogs', 'lexicons']) {
    assert.equal((await fetch(`${origin}/api/${kind}/files`)).status, 404, kind);
  }
  assert.equal((await call('POST', '/api/backup/a')).status, 404);
  assert.equal((await fetch(`${origin}/api/backup/a`)).status, 404);
});

test('a write needs the request header', async () => {
  const res = await fetch(`${origin}/api/backlog/files`, { method: 'POST', body: JSON.stringify({ name: 'nohdr', content: '' }) });
  assert.equal(res.status, 403);
  assert.equal(fs.existsSync(path.join(root, 'nohdr')), false);
});

test('create: a free name makes the folder with user-stories.csv; a taken name is numbered and the original is untouched', async () => {
  const first = await call('POST', '/api/backlog/files', { name: 'sprint-12', content: 'ID,Epic\r\n' });
  assert.equal(first.status, 201);
  assert.deepEqual(await first.json(), { name: 'sprint-12' });
  assert.equal(fs.readFileSync(path.join(root, 'sprint-12', 'user-stories.csv'), 'utf8'), 'ID,Epic\r\n');

  put('sprint-12', 'user-stories.csv', 'mine\r\n');
  const second = await (await call('POST', '/api/backlog/files', { name: 'sprint-12.csv', content: 'other\r\n' })).json();
  assert.deepEqual(second, { name: 'sprint-12-2' });
  const third = await (await call('POST', '/api/backlog/files', { name: 'sprint-12', content: 'x\r\n' })).json();
  assert.deepEqual(third, { name: 'sprint-12-3' });
  assert.equal(fs.readFileSync(path.join(root, 'sprint-12', 'user-stories.csv'), 'utf8'), 'mine\r\n');
  assert.equal(fs.readFileSync(path.join(root, 'sprint-12-2', 'user-stories.csv'), 'utf8'), 'other\r\n');
  assert.ok((await listed()).includes('sprint-12-3'));

  const empty = await call('POST', '/api/backlog/files', { name: 'blank' });
  assert.equal(empty.status, 201);
  assert.equal(fs.readFileSync(path.join(root, 'blank', 'user-stories.csv'), 'utf8'), '', 'no content gives an empty file');
});

test('create of another kind: in an existing backlog only, never over an existing file', async () => {
  const made = await call('POST', '/api/proposals/files', { name: 'a', content: 'P\r\n' });
  assert.equal(made.status, 201);
  assert.deepEqual(await made.json(), { name: 'a' });
  assert.equal(fs.readFileSync(path.join(root, 'a', 'user-stories', 'proposals.csv'), 'utf8'), 'P\r\n');
  const again = await call('POST', '/api/proposals/files', { name: 'a', content: 'Q\r\n' });
  assert.equal(again.status, 409);
  assert.equal(fs.readFileSync(path.join(root, 'a', 'user-stories', 'proposals.csv'), 'utf8'), 'P\r\n');
  assert.equal((await call('POST', '/api/proposals/files', { name: 'ghost', content: 'x' })).status, 404);
  assert.equal(fs.existsSync(path.join(root, 'ghost')), false, 'no folder is made for a missing backlog');
});

test('rename: the folder moves with all its files and slices; the target must be free and valid', async () => {
  put('iam', 'user-stories.csv', 'ID\r\n');
  put('iam', 'lexicon.csv', 'Term\r\n');
  put('iam', 'slices/login/UC-login.md', 'doc');
  const ok = await call('PATCH', '/api/backlog/files/iam', { name: 'identity' });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { name: 'identity' });
  assert.equal(fs.existsSync(path.join(root, 'iam')), false);
  assert.equal(fs.readFileSync(path.join(root, 'identity', 'lexicon.csv'), 'utf8'), 'Term\r\n');
  assert.equal(fs.readFileSync(path.join(root, 'identity', 'slices', 'login', 'UC-login.md'), 'utf8'), 'doc');

  const conflict = await call('PATCH', '/api/backlog/files/identity', { name: 'a' });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, 'exists');
  assert.equal(fs.existsSync(path.join(root, 'identity', 'user-stories.csv')), true, 'neither backlog changed');
  assert.equal(fs.readFileSync(path.join(root, 'a', 'user-stories.csv'), 'utf8'), 'ID\r\nA-1\r\n');

  assert.equal((await call('PATCH', '/api/backlog/files/ghost', { name: 'x' })).status, 404);
  assert.equal((await call('PATCH', '/api/backlog/files/identity', { name: '' })).status, 400);
  assert.equal((await call('PATCH', '/api/backlog/files/identity', { name: 'a:b' })).status, 400);
  assert.deepEqual(await (await call('PATCH', '/api/backlog/files/identity', { name: 'identity' })).json(), { name: 'identity' });
  assert.equal((await call('PATCH', '/api/lexicon/files/a', { name: 'zzz' })).status, 405, 'only a backlog is renamed');
});

test('rename: a folder another program holds open answers locked and keeps its name', async (t) => {
  put('held', 'user-stories.csv', 'ID\r\n');
  t.mock.method(fs.promises, 'rename', async () => {
    throw Object.assign(new Error('EPERM: operation not permitted, rename'), { code: 'EPERM' });
  });
  const res = await call('PATCH', '/api/backlog/files/held', { name: 'free' });
  assert.equal(res.status, 423);
  assert.equal((await res.json()).code, 'locked');
  t.mock.restoreAll();
  assert.equal(fs.existsSync(path.join(root, 'held', 'user-stories.csv')), true);
  assert.equal(fs.existsSync(path.join(root, 'free')), false);
});

test('a create that cannot write leaves no empty backlog folder behind', async (t) => {
  t.mock.method(fs.promises, 'open', async () => {
    throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
  });
  const res = await call('POST', '/api/backlog/files', { name: 'failing', content: 'x' });
  t.mock.restoreAll();
  assert.equal(res.status, 423);
  assert.equal(fs.existsSync(path.join(root, 'failing')), false);
});

test('a request whose Host is not this machine is refused', async () => {
  const status = await new Promise((resolve, reject) => {
    const req = http.request(`${origin}/api/backlog/files`, { method: 'GET', headers: { Host: 'planner.example.com' } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(status, 403);
});
