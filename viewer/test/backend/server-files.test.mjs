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
  put('logs', 'leftover.txt', '');
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
  assert.deepEqual(read, { name: 'a', content: 'ID\r\nA-1\r\n', initials: 'B1' }, 'a backlog comes with its initials (the default, on first open)');
  assert.equal((await (await fetch(`${origin}/api/backlog/files/a.csv`)).json()).name, 'a', 'a trailing .csv is dropped');
  assert.equal((await (await fetch(`${origin}/api/review/files/a`)).json()).content, 'R\r\n');
  assert.equal((await fetch(`${origin}/api/lexicon/files/no-such-backlog`)).status, 404, 'a file of a missing backlog is not found');

  const saved = await fetch(`${origin}/api/lexicon/files/a`, { method: 'PUT', headers: HEADERS, body: 'Term\r\nx\r\n' });
  assert.equal(saved.status, 200);
  assert.equal(fs.readFileSync(path.join(root, 'a', 'lexicon.csv'), 'utf8'), 'Term\r\nx\r\n');
  assert.equal((await fetch(`${origin}/api/proposals/files/a`, { method: 'PUT', headers: HEADERS, body: 'x' })).status, 404);
  assert.equal(fs.existsSync(path.join(root, 'a', 'user-stories', 'proposals.csv')), false, 'PUT did not create it');
});

test('a missing optional file of an existing backlog reads as empty; a missing backlog is still not found', async () => {
  put('stories-only', 'user-stories.csv', 'ID\r\n');
  for (const kind of ['proposals', 'lexicon', 'lexicon-suggestions', 'review']) {
    const res = await fetch(`${origin}/api/${kind}/files/stories-only`);
    assert.equal(res.status, 200, kind);
    assert.deepEqual(await res.json(), { name: 'stories-only', content: '' }, kind);
    assert.equal((await fetch(`${origin}/api/${kind}/files/no-such-backlog`)).status, 404, `${kind} of a missing backlog`);
  }
  assert.equal(fs.existsSync(path.join(root, 'stories-only', 'lexicon.csv')), false, 'reading did not create the file');
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
  const first = await call('POST', '/api/backlog/files', { name: 'sprint-12' });
  assert.equal(first.status, 201);
  assert.deepEqual(await first.json(), { name: 'sprint-12' });
  assert.equal(fs.existsSync(path.join(root, 'sprint-12', 'user-stories.csv')), true);

  put('sprint-12', 'user-stories.csv', 'mine\r\n');
  const second = await (await call('POST', '/api/backlog/files', { name: 'sprint-12.csv' })).json();
  assert.deepEqual(second, { name: 'sprint-12-2' });
  const third = await (await call('POST', '/api/backlog/files', { name: 'sprint-12' })).json();
  assert.deepEqual(third, { name: 'sprint-12-3' });
  assert.equal(fs.readFileSync(path.join(root, 'sprint-12', 'user-stories.csv'), 'utf8'), 'mine\r\n');
  assert.ok((await listed()).includes('sprint-12-3'));
});

test('create of a backlog ignores a content field: the server writes the header-only starting file', async () => {
  const res = await call('POST', '/api/backlog/files', { name: 'sent-content', content: 'ID,Epic\r\nX-1,Mine\r\n' });
  assert.equal(res.status, 201);
  const text = fs.readFileSync(path.join(root, 'sent-content', 'user-stories.csv'), 'utf8');
  assert.equal(text.includes('X-1'), false, 'the sent content was not written');
  assert.equal(text.trim().split(/\r?\n/).length, 1, 'one header row, no data row');
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

// ---------- initials (backlog.json) ----------

const initialsFile = (name) => path.join(root, name, 'backlog.json');
const savedInitials = (name) => JSON.parse(fs.readFileSync(initialsFile(name), 'utf8')).initials;
const openedInitials = async (name) => (await (await fetch(`${origin}/api/backlog/files/${name}`)).json()).initials;
const frozenStory = (code) => `ID,Epic,Title,Frozen\r\n${code},IAM,A story,Yes\r\n`;

test('create writes backlog.json with initials no other backlog uses; rename keeps them', async () => {
  put('init-old', 'user-stories.csv', 'ID\r\n');
  put('init-old', 'backlog.json', '{"initials":"B1"}\n');
  const made = (await (await call('POST', '/api/backlog/files', { name: 'init-new' })).json()).name;
  const initials = savedInitials(made);
  assert.match(initials, /^B\d+$/);
  assert.notEqual(initials, 'B1', 'a sibling holds B1');
  assert.equal(await openedInitials(made), initials, 'the backlog comes back with its initials');

  assert.equal((await call('PATCH', `/api/backlog/files/${made}`, { name: 'init-renamed' })).status, 200);
  assert.equal(savedInitials('init-renamed'), initials, 'a rename keeps the initials');
  assert.equal(fs.existsSync(initialsFile(made)), false);
});

test('first open of a backlog without backlog.json saves the lowest unused default, skipping initials frozen IDs hold', async () => {
  put('open-a', 'user-stories.csv', frozenStory('B1-IAM-0001'));
  put('open-a', 'backlog.json', '{"initials":"ZZ"}\n');
  put('open-b', 'user-stories.csv', 'ID\r\n');
  assert.equal(fs.existsSync(initialsFile('open-b')), false);
  const initials = await openedInitials('open-b');
  assert.notEqual(initials, 'B1', 'a frozen ID of open-a starts with B1');
  assert.equal(savedInitials('open-b'), initials, 'the default is saved on the first open');
  assert.equal(await openedInitials('open-b'), initials, 'a second open reads it back');
});

test('initials update: an accepted change is uppercased, saved, and a same value changes nothing', async () => {
  put('upd-a', 'user-stories.csv', 'ID\r\n');
  put('upd-a', 'backlog.json', '{"initials":"UPDA"}\n');
  const res = await call('PATCH', '/api/backlog/files/upd-a', { initials: 'upda2' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { name: 'upd-a', initials: 'UPDA2' });
  assert.equal(savedInitials('upd-a'), 'UPDA2');
  assert.equal(fs.readdirSync(path.join(root, 'upd-a')).some((f) => f.endsWith('.tmp')), false, 'no temp file is left');

  const same = await call('PATCH', '/api/backlog/files/upd-a', { initials: 'updA2' });
  assert.equal(same.status, 200, 'the own value is not a clash');
  assert.equal(savedInitials('upd-a'), 'UPDA2');
});

test('initials update: refused when a sibling uses them (ignoring case), the message names the sibling', async () => {
  put('ref-iam', 'user-stories.csv', 'ID\r\n');
  put('ref-iam', 'backlog.json', '{"initials":"RIAM"}\n');
  put('ref-billing', 'user-stories.csv', 'ID\r\n');
  put('ref-billing', 'backlog.json', '{"initials":"RBIL"}\n');
  const res = await call('PATCH', '/api/backlog/files/ref-billing', { initials: 'riam' });
  assert.equal(res.status, 409);
  assert.match((await res.json()).error, /ref-iam/);
  assert.equal(savedInitials('ref-billing'), 'RBIL');
});

test('initials update: refused when a sibling holds a frozen ID that starts with them, the message names the sibling', async () => {
  put('fz-iam', 'user-stories.csv', frozenStory('FZB1-IAM-0002'));
  put('fz-iam', 'backlog.json', '{"initials":"FZOPS"}\n');
  put('fz-billing', 'user-stories.csv', 'ID\r\n');
  put('fz-billing', 'backlog.json', '{"initials":"FZBIL"}\n');
  const res = await call('PATCH', '/api/backlog/files/fz-billing', { initials: 'FZB1' });
  assert.equal(res.status, 409);
  assert.match((await res.json()).error, /fz-iam/);
  assert.equal(savedInitials('fz-billing'), 'FZBIL');
});

test('initials update: an invalid value is refused with the rule and nothing is saved', async () => {
  put('bad-a', 'user-stories.csv', 'ID\r\n');
  put('bad-a', 'backlog.json', '{"initials":"BADA"}\n');
  for (const initials of ['1A', 'A-B', '', 'ABCDEFG', 5]) {
    const res = await call('PATCH', '/api/backlog/files/bad-a', { initials });
    assert.equal(res.status, 400, JSON.stringify(initials));
    assert.match((await res.json()).error, /1 to 6 letters or digits/);
  }
  assert.equal(savedInitials('bad-a'), 'BADA');
  assert.equal((await call('PATCH', '/api/backlog/files/nope-missing', { initials: 'OK' })).status, 404);
});
