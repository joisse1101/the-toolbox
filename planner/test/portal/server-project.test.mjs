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
const SAMPLE = path.join(here, '..', 'sample-data', 'backlogs', 'sample.csv');
const REPO = path.resolve(here, '..', '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'server-project-test-'));
const dirA = path.join(tmp, 'a');
const dirB = path.join(tmp, 'b');
for (const [dir, file] of [[dirA, 'one.csv'], [dirB, 'two.csv']]) {
  fs.mkdirSync(path.join(dir, 'backlogs'), { recursive: true });
  fs.copyFileSync(SAMPLE, path.join(dir, 'backlogs', file));
}
const configFile = tempConfig(dirA, 'Alpha');
process.env.PLANNER_CONFIG = configFile;
const { server } = createRequire(import.meta.url)('../../portal/server/server.cjs');

const HEADERS = { 'X-Requested-With': 'the-toolbox', 'Content-Type': 'application/json' };
let origin;
test.before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const call = (method, url, body) => fetch(`${origin}${url}`, { method, headers: HEADERS, body: body === undefined ? undefined : JSON.stringify(body) });
const listed = async () => (await (await fetch(`${origin}/api/backlogs/files`)).json()).files;
const save = (body) => call('PUT', '/api/project', body);
const tree = (dir) => fs.readdirSync(dir, { recursive: true }).sort();
const switchBack = async () => assert.equal((await save({ dataDir: dirA })).status, 200);

test('read settings: the reply holds the project name, the data directory and the config file path', async () => {
  const body = await (await fetch(`${origin}/api/project`)).json();
  assert.deepEqual(body, { projectName: 'Alpha', dataDir: dirA, configPath: path.resolve(configFile) });
});

test('switch while idle: the next list, read and write are answered from the new directory, and the log follows', async () => {
  assert.deepEqual(await listed(), ['one.csv']);
  const res = await save({ dataDir: dirB });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).switched, true);
  assert.match(fs.readFileSync(configFile, 'utf8'), /dataDir/);
  assert.deepEqual(await listed(), ['two.csv']);

  const created = await call('POST', '/api/proposals/files', { name: 'p.csv', content: 'a\r\n' });
  assert.equal(created.status, 201);
  assert.equal(fs.existsSync(path.join(dirB, 'proposals', 'p.csv')), true);
  assert.equal(fs.existsSync(path.join(dirA, 'proposals', 'p.csv')), false);
  const log = fs.readFileSync(path.join(dirB, 'logs', 'writes.jsonl'), 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(log.map((l) => [l.store, l.file]), [['proposals', 'p.csv']]);
  assert.equal(fs.existsSync(path.join(dirA, 'logs', 'writes.jsonl')), false, 'nothing is logged in the old folder');

  const backup = await call('POST', '/api/backup/two.csv');
  assert.equal(backup.status, 201);
  assert.equal(fs.existsSync(path.join(dirB, 'backups', 'two.csv')), true, 'backups follow the switch');
  await switchBack();
});

test('switch during a write: busy, config and served folder unchanged, nothing written by the refused request', async () => {
  const before = fs.readFileSync(configFile, 'utf8');
  const [treeA, treeB] = [tree(dirA), tree(dirB)];
  // A save whose body has not finished arriving is a write in progress.
  const pending = http.request(`${origin}/api/backlogs/files/one.csv`, { method: 'PUT', headers: HEADERS });
  pending.on('error', () => {});
  pending.write('a,b\r\n');
  await new Promise((resolve) => setTimeout(resolve, 100));

  const res = await save({ dataDir: dirB });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'busy');
  assert.equal(fs.readFileSync(configFile, 'utf8'), before);
  assert.deepEqual(await listed(), ['one.csv']);
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
  assert.deepEqual(await listed(), ['one.csv']);
});

test('check, init and copy, then save and switch', async () => {
  const target = path.join(tmp, 'new-data');
  assert.equal((await (await call('POST', '/api/project/check', { dir: target })).json()).status, 'missing');
  assert.equal((await (await call('POST', '/api/project/check', { dir: dirB })).json()).status, 'has-planner-files');

  const copy = await call('POST', '/api/project/copy', { dir: target });
  assert.equal(copy.status, 200);
  const copied = await copy.json();
  assert.ok(copied.copied.includes('backlogs/one.csv'));
  assert.equal(copied.skipped.length, 0);
  const again = await (await call('POST', '/api/project/copy', { dir: target })).json();
  assert.deepEqual(again.copied, []);
  assert.ok(again.skipped.some((f) => f.file === 'backlogs/one.csv' && f.reason === 'exists'));
  assert.equal((await call('POST', '/api/project/copy', { dir: dirA })).status, 400, 'the target is the source');

  const empty = path.join(tmp, 'empty-data');
  fs.mkdirSync(empty);
  assert.equal((await (await call('POST', '/api/project/check', { dir: empty })).json()).status, 'empty');
  const init = await (await call('POST', '/api/project/init', { dir: empty })).json();
  assert.equal(init.created.length, 8);
  assert.equal(init.existing.length, 0);

  assert.equal((await save({ dataDir: target, projectName: 'Beta' })).status, 200);
  assert.deepEqual(await listed(), ['one.csv']);
  assert.equal((await (await fetch(`${origin}/api/project`)).json()).projectName, 'Beta');
  assert.equal((await save({ projectName: 'Alpha' })).status, 200);
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
