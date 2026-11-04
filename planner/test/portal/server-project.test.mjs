import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { tempConfig } from '../helpers/temp-config.mjs';

// Mock data only: temp folders holding a copy of the sample backlog. The config is a temp copy, never the real one.
const here = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE = path.join(here, '..', 'sample-data', 'sample', 'user-stories.csv');
const REPO = path.resolve(here, '..', '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'server-project-test-'));
const dirA = path.join(tmp, 'a');
const dirB = path.join(tmp, 'b');
for (const [dir, name] of [[dirA, 'one'], [dirB, 'two']]) {
  fs.mkdirSync(path.join(dir, name), { recursive: true });
  fs.copyFileSync(SAMPLE, path.join(dir, name, 'user-stories.csv'));
}
// A leftover backups folder from an earlier version: the copy leaves it out.
fs.mkdirSync(path.join(dirA, 'backups', 'one.csv'), { recursive: true });
fs.writeFileSync(path.join(dirA, 'backups', 'one.csv', 'old.csv'), 'x');
const configFile = tempConfig(dirA, 'Alpha');
process.env.PLANNER_CONFIG = configFile;
const { server, setFolderDialog } = createRequire(import.meta.url)('../../portal/server/server.cjs');
// Tests never open the real folder dialog: every pick goes through this stub.
setFolderDialog(async () => {
  throw new Error('the real folder dialog must not open in a test');
});

const HEADERS = { 'X-Requested-With': 'the-toolbox', 'Content-Type': 'application/json' };
let origin;
test.before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const call = (method, url, body) => fetch(`${origin}${url}`, { method, headers: HEADERS, body: body === undefined ? undefined : JSON.stringify(body) });
const listed = async () => (await (await fetch(`${origin}/api/backlog/files`)).json()).files;
const save = (body) => call('PUT', '/api/project', body);
const tree = (dir) => fs.readdirSync(dir, { recursive: true }).sort();
const switchBack = async () => assert.equal((await save({ dataDir: dirA })).status, 200);

test('read settings: the reply holds the project name, the data directory and the config file path', async () => {
  const body = await (await fetch(`${origin}/api/project`)).json();
  assert.deepEqual(body, { projectName: 'Alpha', dataDir: dirA, configPath: path.resolve(configFile), olderLayout: [] });
});

test('switch while idle: the next list, read and write are answered from the new directory', async () => {
  assert.deepEqual(await listed(), ['one']);
  const res = await save({ dataDir: dirB });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).switched, true);
  assert.match(fs.readFileSync(configFile, 'utf8'), /dataDir/);
  assert.deepEqual(await listed(), ['two']);

  const created = await call('POST', '/api/proposals/files', { name: 'two', content: 'a\r\n' });
  assert.equal(created.status, 201);
  assert.equal(fs.existsSync(path.join(dirB, 'two', 'user-stories', 'proposals.csv')), true);
  assert.equal(fs.existsSync(path.join(dirA, 'two', 'user-stories', 'proposals.csv')), false);

  assert.equal((await call('POST', '/api/backup/two')).status, 404, 'the backup routes are gone');
  await switchBack();
});

test('switch during a write: busy, config and served folder unchanged, nothing written by the refused request', async () => {
  const before = fs.readFileSync(configFile, 'utf8');
  const [treeA, treeB] = [tree(dirA), tree(dirB)];
  // A save whose body has not finished arriving is a write in progress.
  const pending = http.request(`${origin}/api/backlog/files/one`, { method: 'PUT', headers: HEADERS });
  pending.on('error', () => {});
  pending.write('a,b\r\n');
  await new Promise((resolve) => setTimeout(resolve, 100));

  const res = await save({ dataDir: dirB });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'busy');
  assert.equal(fs.readFileSync(configFile, 'utf8'), before);
  assert.deepEqual(await listed(), ['one']);
  assert.deepEqual(tree(dirA), treeA, 'nothing is written to the served folder');
  assert.deepEqual(tree(dirB), treeB, 'nothing is written to the refused folder');

  const done = new Promise((resolve) => pending.on('response', (r) => { r.resume(); r.on('end', resolve); }));
  pending.end();
  await done;
  assert.equal((await save({ dataDir: dirB })).status, 200, 'once the write is done the switch is allowed');
  await switchBack();
});

test('refused directories: the config is unchanged and no folder is created', async () => {
  const before = fs.readFileSync(configFile, 'utf8');
  const link = path.join(tmp, 'link-to-logic');
  fs.symlinkSync(path.join(REPO, 'planner', 'logic'), link, 'junction');
  const system = process.platform === 'win32' ? process.env.SystemRoot : '/etc';
  const missing = path.join(tmp, 'never-created');
  const cases = [
    ['relative path', '..\\elsewhere'],
    ['system folder', system],
    ['drive root', path.parse(tmp).root],
    ['link into the repository', link],
    ['source folder of the repository', path.join(REPO, 'planner', 'logic')],
    ['a file', SAMPLE],
  ];
  for (const [label, dir] of cases) {
    for (const [method, url, body] of [['PUT', '/api/project', { dataDir: dir }], ['POST', '/api/project/init', { dir }], ['POST', '/api/project/copy', { dir }]]) {
      const res = await call(method, url, body);
      assert.equal(res.status, 400, `${label}: ${url}`);
      assert.equal((await res.json()).code, 'refused', label);
    }
    const check = await (await call('POST', '/api/project/check', { dir })).json();
    assert.equal(check.status, 'refused', label);
    assert.ok(check.reason, label);
  }
  assert.equal(fs.readFileSync(configFile, 'utf8'), before);
  assert.equal(fs.existsSync(path.join(REPO, 'planner', 'logic', 'backlogs')), false);

  // A missing folder cannot be saved directly; only init or the copy creates it.
  const direct = await save({ dataDir: missing });
  assert.equal(direct.status, 400);
  assert.match((await direct.json()).error, /init or the copy/);
  assert.equal(fs.existsSync(missing), false);
  assert.equal(fs.readFileSync(configFile, 'utf8'), before);
  assert.deepEqual(await listed(), ['one']);
});

test('check, init and copy, then save and switch', async () => {
  const target = path.join(tmp, 'new-data');
  assert.equal((await (await call('POST', '/api/project/check', { dir: target })).json()).status, 'missing');
  assert.equal((await (await call('POST', '/api/project/check', { dir: dirB })).json()).status, 'has-planner-files');

  const copy = await call('POST', '/api/project/copy', { dir: target });
  assert.equal(copy.status, 200);
  const copied = await copy.json();
  assert.ok(copied.copied.includes('one/user-stories.csv'));
  assert.equal(copied.skipped.length, 0, 'the backups folder is left out without being listed');
  assert.equal(copied.copied.some((f) => f.startsWith('backups')), false);
  assert.equal(fs.existsSync(path.join(target, 'backups')), false);
  const again = await (await call('POST', '/api/project/copy', { dir: target })).json();
  assert.deepEqual(again.copied, []);
  assert.ok(again.skipped.some((f) => f.file === 'one/user-stories.csv' && f.reason === 'exists'));
  assert.equal((await call('POST', '/api/project/copy', { dir: dirA })).status, 400, 'the target is the source');

  const empty = path.join(tmp, 'empty-data');
  fs.mkdirSync(empty);
  assert.equal((await (await call('POST', '/api/project/check', { dir: empty })).json()).status, 'empty');
  const init = await (await call('POST', '/api/project/init', { dir: empty })).json();
  assert.deepEqual(init.created, [], 'the folder was there and nothing else is created');
  assert.deepEqual(init.existing, ['empty-data']);
  assert.deepEqual(fs.readdirSync(empty), []);

  assert.equal((await save({ dataDir: target, projectName: 'Beta' })).status, 200);
  assert.deepEqual(await listed(), ['one']);
  assert.equal((await (await fetch(`${origin}/api/project`)).json()).projectName, 'Beta');
  assert.equal((await save({ projectName: 'Alpha' })).status, 200);
  await switchBack();
});

test('migrate: runs only on request, copies the older layout of the served folder and reports it', async () => {
  const older = path.join(tmp, 'older-data');
  fs.mkdirSync(path.join(older, 'backlogs'), { recursive: true });
  fs.copyFileSync(SAMPLE, path.join(older, 'backlogs', 'one.csv'));
  fs.mkdirSync(path.join(older, 'reviews'));
  fs.writeFileSync(path.join(older, 'reviews', 'ghost.csv'), 'x');
  fs.mkdirSync(path.join(older, 'backups', 'one.csv'), { recursive: true });
  fs.writeFileSync(path.join(older, 'backups', 'one.csv', 'old.csv'), 'x');

  assert.equal((await (await call('POST', '/api/project/check', { dir: older })).json()).status, 'older-layout');
  assert.equal((await save({ dataDir: older })).status, 200);
  assert.deepEqual(await listed(), [], 'the older layout is not read as data');
  const settings = await (await fetch(`${origin}/api/project`)).json();
  assert.deepEqual(settings.olderLayout, ['backlogs', 'reviews']);
  assert.equal(fs.existsSync(path.join(older, 'one')), false, 'nothing is copied until asked');

  const noHeader = await fetch(`${origin}/api/project/migrate`, { method: 'POST' });
  assert.equal(noHeader.status, 403);
  assert.equal((await fetch(`${origin}/api/project/migrate`, { headers: HEADERS })).status, 405);

  const res = await call('POST', '/api/project/migrate');
  assert.equal(res.status, 200);
  const result = await res.json();
  assert.deepEqual(result.copied, ['one/user-stories.csv']);
  assert.deepEqual(result.skipped, [{ file: 'reviews/ghost.csv', reason: 'no backlog with this name in backlogs/' }]);
  assert.deepEqual(result.failed, []);
  assert.deepEqual(await listed(), ['one']);
  assert.equal(fs.existsSync(path.join(older, 'backlogs', 'one.csv')), true, 'the older file is unchanged');
  await switchBack();
});

test('a write to a settings route needs the request header', async () => {
  const res = await fetch(`${origin}/api/project`, { method: 'PUT', body: JSON.stringify({ projectName: 'X' }) });
  assert.equal(res.status, 403);
});

test('remote client: a request whose Host is not this machine is refused on the settings routes', async () => {
  const status = await new Promise((resolve, reject) => {
    const req = http.request(`${origin}/api/project`, { method: 'GET', headers: { Host: 'planner.example.com' } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(status, 403);
});

test('folder picker: a chosen folder is returned, started in the served folder, and nothing is saved or switched', async () => {
  const before = fs.readFileSync(configFile, 'utf8');
  const starts = [];
  setFolderDialog(async (start) => {
    starts.push(start);
    return dirB;
  });
  const res = await call('POST', '/api/project/pick');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { dir: dirB });
  assert.deepEqual(starts, [dirA]);
  assert.equal(fs.readFileSync(configFile, 'utf8'), before);
  assert.deepEqual(await listed(), ['one']);
});

test('folder picker: a cancelled dialog answers cancelled and changes nothing', async () => {
  const before = fs.readFileSync(configFile, 'utf8');
  setFolderDialog(async () => null);
  const res = await call('POST', '/api/project/pick');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { cancelled: true });
  assert.equal(fs.readFileSync(configFile, 'utf8'), before);
});

test('folder picker: a dialog that cannot open answers a clear error and changes nothing', async () => {
  const before = fs.readFileSync(configFile, 'utf8');
  setFolderDialog(async () => {
    throw new Error('Could not open the folder dialog: stubbed failure');
  });
  const res = await call('POST', '/api/project/pick');
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.code, 'picker-unavailable');
  assert.match(body.error, /stubbed failure/);
  assert.equal(fs.readFileSync(configFile, 'utf8'), before);
});

test('folder picker: no request header and a remote Host are refused before the dialog opens', async () => {
  let opened = 0;
  setFolderDialog(async () => {
    opened++;
    return dirB;
  });
  const noHeader = await fetch(`${origin}/api/project/pick`, { method: 'POST' });
  assert.equal(noHeader.status, 403);
  const remote = await new Promise((resolve, reject) => {
    const req = http.request(`${origin}/api/project/pick`, { method: 'POST', headers: { ...HEADERS, Host: 'planner.example.com' } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(remote, 403);
  assert.equal(opened, 0);
});

test('code base: confined on every route, config and served folder unchanged when refused', async () => {
  const before = fs.readFileSync(configFile, 'utf8');
  const system = process.platform === 'win32' ? process.env.SystemRoot : '/etc';
  const missing = path.join(tmp, 'no-such-code-base');
  const withFile = path.join(tmp, 'plans-is-a-file');
  fs.mkdirSync(withFile);
  fs.writeFileSync(path.join(withFile, '.plans'), 'x');
  const cases = [
    ['relative path', '..\elsewhere'],
    ['system folder', system],
    ['drive root', path.parse(tmp).root],
    ['inside the repository', path.join(REPO, 'planner', 'data')],
    ['missing folder', missing],
    ['.plans is a file', withFile],
  ];
  for (const [label, codeBase] of cases) {
    for (const [method, url] of [['PUT', '/api/project'], ['POST', '/api/project/init'], ['POST', '/api/project/copy']]) {
      const res = await call(method, url, { codeBase });
      assert.equal(res.status, 400, `${label}: ${url}`);
      assert.equal((await res.json()).code, 'refused', `${label}: ${url}`);
    }
    const check = await (await call('POST', '/api/project/check', { codeBase })).json();
    assert.equal(check.status, 'refused', label);
    assert.ok(check.reason, label);
  }
  assert.equal(fs.existsSync(missing), false, 'the code base is never created');
  assert.equal(fs.readFileSync(configFile, 'utf8'), before);
  assert.deepEqual(await listed(), ['one']);
});

test('code base: check, init, copy, then save and switch live; the config holds codeBase and no dataDir', async () => {
  const codeBase = path.join(tmp, 'code-base');
  fs.mkdirSync(codeBase);
  const plans = path.join(codeBase, '.plans');
  const real = fs.realpathSync.native(codeBase);

  const check = await (await call('POST', '/api/project/check', { codeBase })).json();
  assert.equal(check.status, 'missing');
  assert.equal(check.dir, path.join(real, '.plans'));

  // A code base without .plans cannot be saved yet.
  const early = await save({ codeBase });
  assert.equal(early.status, 400);
  assert.match((await early.json()).error, /init or the copy/);

  const init = await (await call('POST', '/api/project/init', { codeBase })).json();
  assert.equal(init.createdDataDir, true);
  assert.deepEqual(fs.readdirSync(codeBase), ['.plans'], 'only .plans is created');
  assert.deepEqual(fs.readdirSync(plans), []);
  assert.equal((await (await call('POST', '/api/project/init', { codeBase })).json()).createdDataDir, false, 'init twice changes nothing');
  assert.equal((await (await call('POST', '/api/project/check', { codeBase })).json()).status, 'empty');

  const copy = await (await call('POST', '/api/project/copy', { codeBase })).json();
  assert.ok(copy.copied.includes('one/user-stories.csv'));
  assert.equal(fs.existsSync(path.join(plans, 'one', 'user-stories.csv')), true);
  assert.equal(fs.existsSync(path.join(dirA, 'one', 'user-stories.csv')), true, 'the source keeps its files');
  const again = await (await call('POST', '/api/project/copy', { codeBase })).json();
  assert.deepEqual(again.copied, []);
  assert.ok(again.skipped.some((f) => f.file === 'one/user-stories.csv' && f.reason === 'exists'));
  assert.equal((await (await call('POST', '/api/project/check', { codeBase })).json()).status, 'has-planner-files');

  const res = await save({ codeBase });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.switched, true);
  assert.equal(body.codeBase, real);
  assert.equal(body.dataDir, path.join(real, '.plans'));
  const saved = fs.readFileSync(configFile, 'utf8');
  assert.match(saved, /codeBase/);
  assert.doesNotMatch(saved, /dataDir/);
  assert.deepEqual(await listed(), ['one'], 'the next list is answered from <code base>/.plans');
  const created = await call('POST', '/api/proposals/files', { name: 'one', content: 'a\r\n' });
  assert.equal(created.status, 201);
  assert.equal(fs.existsSync(path.join(plans, 'one', 'user-stories', 'proposals.csv')), true);
  assert.deepEqual((await (await fetch(`${origin}/api/project`)).json()).codeBase, real);

  assert.equal((await save({ codeBase, dataDir: dirA })).status, 400, 'both keys in one request are refused');
  await switchBack();
  const back = await (await fetch(`${origin}/api/project`)).json();
  assert.equal('codeBase' in back, false, 'codeBase is reported only when set');
  assert.doesNotMatch(fs.readFileSync(configFile, 'utf8'), /codeBase/);
});

test('code base: busy refusal still applies, config and served folder unchanged', async () => {
  const codeBase = path.join(tmp, 'code-base-busy');
  fs.mkdirSync(path.join(codeBase, '.plans'), { recursive: true });
  const before = fs.readFileSync(configFile, 'utf8');
  const pending = http.request(`${origin}/api/backlog/files/one`, { method: 'PUT', headers: HEADERS });
  pending.on('error', () => {});
  pending.write('a,b\r\n');
  await new Promise((resolve) => setTimeout(resolve, 100));

  const res = await save({ codeBase });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'busy');
  assert.equal(fs.readFileSync(configFile, 'utf8'), before);
  assert.deepEqual(await listed(), ['one']);

  const done = new Promise((resolve) => pending.on('response', (r) => { r.resume(); r.on('end', resolve); }));
  pending.end();
  await done;
  assert.equal((await save({ codeBase })).status, 200, 'once the write is done the switch is allowed');
  await switchBack();
});
