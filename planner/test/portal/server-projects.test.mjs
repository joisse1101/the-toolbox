import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { tempConfig } from '../helpers/temp-config.mjs';

// Mock data only: temp folders holding a copy of the sample backlog, a temp config and a temp parent folder for new
// projects. Nothing here touches the real planner/data or the real config.
const here = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE = path.join(here, '..', 'sample-data', 'sample', 'user-stories.csv');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'server-projects-test-'));
const dirA = path.join(tmp, 'a');
fs.mkdirSync(path.join(dirA, 'one'), { recursive: true });
fs.copyFileSync(SAMPLE, path.join(dirA, 'one', 'user-stories.csv'));
const parent = path.join(tmp, 'projects');
const configFile = tempConfig(dirA, 'Alpha');
const ORIGINAL = `# kept comment\n${fs.readFileSync(configFile, 'utf8')}`;
fs.writeFileSync(configFile, ORIGINAL);
process.env.PLANNER_CONFIG = configFile;
const { server, setNewProjectParent, setCopyOptions } = createRequire(import.meta.url)('../../portal/server/server.cjs');
setNewProjectParent(parent);

const HEADERS = { 'X-Requested-With': 'the-toolbox', 'Content-Type': 'application/json' };
let origin;
test.before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const call = (method, url, body) => fetch(`${origin}${url}`, { method, headers: HEADERS, body: body === undefined ? undefined : JSON.stringify(body) });
const post = (url, body) => call('POST', url, body);
const settings = async () => (await fetch(`${origin}/api/project`)).json();
const listed = async () => (await (await fetch(`${origin}/api/backlog/files`)).json()).files;
const config = () => fs.readFileSync(configFile, 'utf8');
// Every file under `dir` with its content, to prove a folder is unchanged.
const snapshot = (dir) => Object.fromEntries(fs.readdirSync(dir, { recursive: true }).sort()
  .filter((f) => fs.statSync(path.join(dir, f)).isFile()).map((f) => [f.split(path.sep).join('/'), fs.readFileSync(path.join(dir, f), 'utf8')]));
// Back to the starting config (no list, dirA served).
async function reset() {
  setCopyOptions({});
  fs.writeFileSync(configFile, ORIGINAL);
  assert.equal((await call('PUT', '/api/project', { dataDir: dirA })).status, 200);
  fs.writeFileSync(configFile, ORIGINAL);
}
const codeBaseWithPlans = (name, backlog = 'iam') => {
  const dir = path.join(tmp, name);
  fs.mkdirSync(path.join(dir, '.plans', backlog), { recursive: true });
  fs.copyFileSync(SAMPLE, path.join(dir, '.plans', backlog, 'user-stories.csv'));
  return dir;
};

// ---------- 3.1 reading the saved projects ----------

test('read: a config without a list shows the active path as one project and the file is untouched', async () => {
  await reset();
  const before = config();
  const body = await settings();
  assert.equal(body.projects.length, 1);
  assert.equal(body.activeProject, 0);
  assert.deepEqual(body.projects[0], { name: '', label: 'a', codeBase: null, dataDir: dirA, exists: true, synthetic: true });
  assert.equal(body.dataDir, dirA, 'the older fields are still there');
  assert.equal(config(), before);
});

test('read: saved projects come with an exists flag, a missing folder is flagged, the active one is named', async () => {
  const missing = path.join(tmp, 'gone');
  const other = path.join(tmp, 'other');
  fs.mkdirSync(other);
  fs.writeFileSync(configFile, `${ORIGINAL}projects:\n  - dataDir: ${JSON.stringify(dirA)}\n    name: Home\n  - dataDir: ${JSON.stringify(other)}\n  - dataDir: ${JSON.stringify(missing)}\n    name: Lost\n`);
  const body = await settings();
  assert.deepEqual(body.projects.map((p) => [p.label, p.exists]), [['Home', true], ['other', true], ['Lost', false]]);
  assert.equal(body.activeProject, 0);
  assert.ok(!body.projects.some((p) => p.synthetic));
  await reset();
});

// ---------- 3.2 adding a project ----------

test('add: a code base whose .plans holds planner files is added and switched to without a prompt', async () => {
  await reset();
  const cb = codeBaseWithPlans('cb-iam');
  const res = await post('/api/project/add', { codeBase: cb, name: 'Payments' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.added, true);
  assert.equal(body.switched, true);
  assert.deepEqual(await listed(), ['iam']);
  assert.deepEqual(body.projects.map((p) => p.label), ['a', 'Payments'], 'the active path was written first');
  assert.equal(body.activeProject, 1);
  assert.equal(body.codeBase, fs.realpathSync.native(cb));
  assert.match(config(), /# kept comment/, 'the comment is kept');
  assert.equal(fs.existsSync(path.join(dirA, 'one', 'user-stories.csv')), true);
});

test('add: a code base without .plans changes nothing until the user agrees, then creates .plans and its first backlog', async () => {
  await reset();
  const cb = path.join(tmp, 'cb-bare');
  fs.mkdirSync(cb);
  const before = config();
  const first = await (await post('/api/project/add', { codeBase: cb })).json();
  assert.equal(first.needsInit, true);
  assert.equal(first.added, false);
  assert.equal(first.status, 'missing');
  assert.equal(config(), before, 'offer declined: the config is unchanged');
  assert.deepEqual(fs.readdirSync(cb), [], 'and nothing is created');
  assert.deepEqual(await listed(), ['one']);

  const res = await post('/api/project/add', { codeBase: cb, init: true });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.added, true);
  assert.deepEqual(fs.readdirSync(cb), ['.plans']);
  assert.deepEqual(fs.readdirSync(path.join(cb, '.plans')), ['new-backlog']);
  assert.deepEqual(await listed(), ['new-backlog']);
  assert.equal(body.projects.length, 2);
});

test('add: a refused code base creates nothing and changes nothing', async () => {
  await reset();
  const before = config();
  const missing = path.join(tmp, 'no-such-code-base');
  for (const codeBase of [missing, '..\\relative', path.parse(tmp).root]) {
    const res = await post('/api/project/add', { codeBase });
    assert.equal(res.status, 400, codeBase);
    assert.equal((await res.json()).code, 'refused');
  }
  assert.equal((await post('/api/project/add', {})).status, 400);
  assert.equal(fs.existsSync(missing), false);
  assert.equal(config(), before);
});

test('add: a code base that is already saved is switched to, not added twice', async () => {
  await reset();
  const cb = codeBaseWithPlans('cb-twice');
  assert.equal((await (await post('/api/project/add', { codeBase: cb })).json()).added, true);
  assert.equal((await call('PUT', '/api/project', { dataDir: dirA })).status, 200);
  assert.deepEqual(await listed(), ['one']);
  const listBefore = (await settings()).projects;
  const body = await (await post('/api/project/add', { codeBase: cb })).json();
  assert.equal(body.added, false);
  assert.equal(body.switched, true);
  assert.equal(body.projects.length, 2, 'no second entry');
  assert.deepEqual(await listed(), ['iam']);
  assert.equal(body.codeBase, fs.realpathSync.native(cb));
  assert.deepEqual(body.projects, listBefore, 'the list is unchanged');
  // Linking the project that is already active does nothing.
  const again = await (await post('/api/project/add', { codeBase: cb })).json();
  assert.equal(again.added, false);
  assert.equal(again.switched, false);
  assert.equal(again.projects.length, 2);
});

test('add: a project name already taken (any case) is refused for a code base', async () => {
  await reset();
  const cb = codeBaseWithPlans('cb-named');
  await post('/api/project/add', { codeBase: cb, name: 'Payments' });
  const other = codeBaseWithPlans('cb-named-2');
  const before = config();
  const res = await post('/api/project/add', { codeBase: other, name: 'payments' });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'exists');
  assert.equal(config(), before);
});

test('add: a new project creates <parent>/<name> with the starting files, a dataDir entry with that name, and becomes active', async () => {
  await reset();
  const res = await post('/api/project/add', { newName: 'Billing' });
  assert.equal(res.status, 200);
  const body = await res.json();
  const dir = path.join(fs.realpathSync.native(tmp), 'projects', 'Billing');
  assert.equal(body.added, true);
  assert.equal(body.dataDir, dir);
  assert.deepEqual(body.projects.map((p) => p.label), ['a', 'Billing']);
  assert.equal(body.projects[1].codeBase, null);
  assert.equal(body.activeProject, 1);
  assert.deepEqual(fs.readdirSync(dir), ['new-backlog']);
  assert.deepEqual(await listed(), ['new-backlog']);
  assert.match(config(), /# kept comment/);
  assert.match(config(), /name: Billing/);
});

test('add: a new project name that clashes with a folder or project (any case) or breaks the name rules creates nothing', async () => {
  await reset();
  await post('/api/project/add', { newName: 'Billing' });
  await reset();
  const code = path.join(tmp, 'cb-clash');
  fs.mkdirSync(path.join(code, '.plans', 'x'), { recursive: true });
  fs.copyFileSync(SAMPLE, path.join(code, '.plans', 'x', 'user-stories.csv'));
  await post('/api/project/add', { codeBase: code, name: 'Payments' });
  const before = config();
  const folders = fs.readdirSync(parent).sort();
  for (const [newName, status] of [['billing', 409], ['BILLING', 409], ['payments', 409], ['a/b', 400], ['a\\b', 400], ['', 400], ['logs', 400]]) {
    const res = await post('/api/project/add', { newName });
    assert.equal(res.status, status, `"${newName}"`);
    assert.ok((await res.json()).error);
  }
  assert.deepEqual(fs.readdirSync(parent).sort(), folders, 'nothing is created');
  assert.equal(config(), before);
});

test('add: the header, the loopback Host and the busy rule apply as on the other settings routes', async () => {
  await reset();
  const before = config();
  const cb = codeBaseWithPlans('cb-busy');
  assert.equal((await fetch(`${origin}/api/project/add`, { method: 'POST', body: JSON.stringify({ codeBase: cb }) })).status, 403);
  assert.equal((await fetch(`${origin}/api/project/add`, { headers: HEADERS })).status, 405);
  const remote = await new Promise((resolve, reject) => {
    const req = http.request(`${origin}/api/project/add`, { method: 'POST', headers: { ...HEADERS, Host: 'planner.example.com' } }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject);
    req.end(JSON.stringify({ codeBase: cb }));
  });
  assert.equal(remote, 403);

  const pending = http.request(`${origin}/api/backlog/files/one`, { method: 'PUT', headers: HEADERS });
  pending.on('error', () => {});
  pending.write('a,b\r\n');
  await new Promise((resolve) => setTimeout(resolve, 100));
  for (const body of [{ codeBase: cb }, { newName: 'Busy' }]) {
    const res = await post('/api/project/add', body);
    assert.equal(res.status, 409);
    assert.equal((await res.json()).code, 'busy');
  }
  assert.equal(config(), before);
  assert.equal(fs.existsSync(path.join(parent, 'Busy')), false);
  const done = new Promise((resolve) => pending.on('response', (r) => { r.resume(); r.on('end', resolve); }));
  pending.end();
  await done;
  assert.equal((await post('/api/project/add', { newName: 'AfterBusy' })).status, 200, 'once the write is done the add is allowed');
});

// ---------- 3.3 relocating the active project ----------

const relocate = (body) => post('/api/project/relocate-apply', body);
const plan = async (body) => (await post('/api/project/relocate-plan', body)).json();

test('relocate plan: read-only, says whether a choice is needed, and lists the files an overwrite would replace', async () => {
  await reset();
  const before = config();
  const missing = path.join(tmp, 'plan-missing');
  const empty = path.join(tmp, 'plan-empty');
  fs.mkdirSync(empty);
  const full = path.join(tmp, 'plan-full');
  fs.mkdirSync(path.join(full, 'one'), { recursive: true });
  fs.writeFileSync(path.join(full, 'one', 'user-stories.csv'), 'mine');
  fs.mkdirSync(path.join(full, 'two'));
  fs.writeFileSync(path.join(full, 'two', 'user-stories.csv'), 'mine too');
  const older = path.join(tmp, 'plan-older');
  fs.mkdirSync(path.join(older, 'backlogs'), { recursive: true });
  fs.writeFileSync(path.join(older, 'backlogs', 'iam.csv'), 'x');

  assert.deepEqual(await plan({ dir: missing }), { status: 'missing', dir: path.join(fs.realpathSync.native(tmp), 'plan-missing'), action: 'copy', needsChoice: false, exists: [] });
  assert.equal((await plan({ dir: empty })).needsChoice, false);
  const f = await plan({ dir: full });
  assert.equal(f.needsChoice, true);
  assert.equal(f.action, 'choose');
  assert.deepEqual(f.exists, ['one/user-stories.csv']);
  const o = await plan({ dir: older });
  assert.equal(o.action, 'switch');
  assert.equal(o.needsChoice, false);
  assert.equal(fs.existsSync(missing), false, 'planning creates nothing');
  assert.equal(config(), before);
  assert.equal((await post('/api/project/relocate-plan', { dir: dirA })).status, 400, 'the target is the current folder');
  assert.equal((await post('/api/project/relocate-plan', { dir: 'relative' })).status, 400);
});

test('relocate: an empty target is copied into without a prompt, the entry changes path and the old folder is identical', async () => {
  await reset();
  const cb = codeBaseWithPlans('cb-reloc');
  await post('/api/project/add', { codeBase: cb, name: 'Payments' });
  await call('PUT', '/api/project', { dataDir: dirA });
  const oldTree = snapshot(dirA);
  const target = path.join(tmp, 'moved');
  fs.mkdirSync(target);
  const res = await relocate({ dir: target });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.relocated, true);
  assert.deepEqual(body.copy.copied, ['one/user-stories.csv']);
  assert.equal(body.dataDir, fs.realpathSync.native(target));
  assert.deepEqual(body.projects.map((p) => p.label), ['moved', 'Payments'], 'the entry changed path; no third entry');
  assert.equal(body.projects.length, 2);
  assert.deepEqual(await listed(), ['one']);
  assert.deepEqual(snapshot(target), oldTree);
  assert.deepEqual(snapshot(dirA), oldTree, 'the old folder is identical');
  assert.match(config(), /# kept comment/);
});

test('relocate: a missing target is created, and a code base target gets .plans with the copy and the codeBase key', async () => {
  await reset();
  const oldTree = snapshot(dirA);
  const missing = path.join(tmp, 'reloc-missing', 'deep');
  assert.equal((await relocate({ dir: missing })).status, 200);
  assert.deepEqual(snapshot(missing), oldTree);
  assert.equal(fs.existsSync(path.join(tmp, 'reloc-missing')), true);
  await reset();

  const code = path.join(tmp, 'reloc-code');
  fs.mkdirSync(code);
  const plansPlan = await plan({ codeBase: code });
  assert.equal(plansPlan.status, 'missing');
  assert.equal(plansPlan.dir, path.join(fs.realpathSync.native(code), '.plans'));
  const body = await (await relocate({ codeBase: code })).json();
  assert.equal(body.relocated, true);
  assert.equal(body.codeBase, fs.realpathSync.native(code));
  assert.deepEqual(snapshot(path.join(code, '.plans')), oldTree);
  assert.doesNotMatch(config(), /dataDir/);
  assert.match(config(), /codeBase/);
  assert.deepEqual(snapshot(dirA), oldTree);
});

function targetWithFiles(name) {
  const dir = path.join(tmp, name);
  fs.mkdirSync(path.join(dir, 'one'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'one', 'user-stories.csv'), 'THEIRS');
  fs.writeFileSync(path.join(dir, 'one', 'extra.txt'), 'only here');
  return dir;
}

test('relocate: a target with planner files needs a choice, and nothing happens without one', async () => {
  await reset();
  const target = targetWithFiles('choice-needed');
  const before = config();
  const targetBefore = snapshot(target);
  const res = await relocate({ dir: target });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'choice-needed');
  assert.equal((await relocate({ dir: target, choice: 'nonsense' })).status, 400);
  assert.equal(config(), before);
  assert.deepEqual(snapshot(target), targetBefore);
});

test('relocate: cancel changes nothing', async () => {
  await reset();
  const target = targetWithFiles('cancelled');
  const before = config();
  const targetBefore = snapshot(target);
  const body = await (await relocate({ dir: target, choice: 'cancel' })).json();
  assert.equal(body.cancelled, true);
  assert.equal(body.relocated, false);
  assert.equal(config(), before);
  assert.deepEqual(snapshot(target), targetBefore);
  assert.deepEqual(await listed(), ['one']);
});

test('relocate: switch copies nothing and saves the new path', async () => {
  await reset();
  const target = targetWithFiles('just-switch');
  const targetBefore = snapshot(target);
  const oldTree = snapshot(dirA);
  const body = await (await relocate({ dir: target, choice: 'switch' })).json();
  assert.equal(body.relocated, true);
  assert.equal(body.copy, undefined);
  assert.deepEqual(snapshot(target), targetBefore, 'the files already there are as they were');
  assert.equal(body.dataDir, fs.realpathSync.native(target));
  assert.deepEqual(await listed(), ['one']);
  assert.deepEqual(snapshot(dirA), oldTree);
});

test('relocate: overwrite replaces the same-named files only, and saves the new path', async () => {
  await reset();
  const target = targetWithFiles('overwrite');
  const oldTree = snapshot(dirA);
  const body = await (await relocate({ dir: target, choice: 'overwrite' })).json();
  assert.equal(body.relocated, true);
  assert.deepEqual(body.copy.overwritten, ['one/user-stories.csv']);
  assert.equal(fs.readFileSync(path.join(target, 'one', 'user-stories.csv'), 'utf8'), oldTree['one/user-stories.csv']);
  assert.equal(fs.readFileSync(path.join(target, 'one', 'extra.txt'), 'utf8'), 'only here', 'a file the source lacks is left as it was');
  assert.equal(body.dataDir, fs.realpathSync.native(target));
  assert.deepEqual(snapshot(dirA), oldTree);
});

test('relocate: a target holding only the older layout is switched to, with nothing copied', async () => {
  await reset();
  const older = path.join(tmp, 'older-target');
  fs.mkdirSync(path.join(older, 'backlogs'), { recursive: true });
  fs.writeFileSync(path.join(older, 'backlogs', 'iam.csv'), 'x');
  const body = await (await relocate({ dir: older })).json();
  assert.equal(body.relocated, true);
  assert.equal(body.action, 'switch');
  assert.deepEqual(body.olderLayout, ['backlogs']);
  assert.deepEqual(await listed(), []);
  assert.deepEqual(fs.readdirSync(older), ['backlogs'], 'nothing is copied in');
});

test('relocate: a copy that stops leaves the config and the old folder unchanged', async () => {
  await reset();
  const target = path.join(tmp, 'copy-stops');
  const before = config();
  const oldTree = snapshot(dirA);
  setCopyOptions({ copyFile: () => { throw new Error('disk full (stub)'); } });
  const res = await relocate({ dir: target });
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.code, 'copy-stopped');
  assert.match(body.error, /disk full/);
  setCopyOptions({});
  assert.equal(config(), before);
  assert.deepEqual(await listed(), ['one']);
  assert.deepEqual(snapshot(dirA), oldTree);
});

test('relocate: a copy that does not read back the same leaves the config and the old folder unchanged', async () => {
  await reset();
  const target = path.join(tmp, 'readback');
  const before = config();
  const oldTree = snapshot(dirA);
  setCopyOptions({ readFile: (p) => (String(p).startsWith(path.resolve(target)) || String(p).includes('readback') ? Buffer.from('different') : fs.readFileSync(p)) });
  const res = await relocate({ dir: target });
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.code, 'copy-failed');
  assert.equal(body.failed[0].file, 'one/user-stories.csv');
  setCopyOptions({});
  assert.equal(config(), before);
  assert.deepEqual(await listed(), ['one']);
  assert.deepEqual(snapshot(dirA), oldTree);
});

test('relocate: refused targets, the header and the busy rule', async () => {
  await reset();
  const before = config();
  assert.equal((await relocate({ dir: dirA })).status, 400, 'the target is the current folder');
  assert.equal((await relocate({ dir: path.join(dirA, 'one') })).status, 400, 'the target lies inside it');
  assert.equal((await relocate({ dir: path.parse(tmp).root })).status, 400);
  assert.equal((await fetch(`${origin}/api/project/relocate-apply`, { method: 'POST', body: '{}' })).status, 403);
  assert.equal((await fetch(`${origin}/api/project/relocate-plan`, { method: 'POST', body: '{}' })).status, 403);

  const pending = http.request(`${origin}/api/backlog/files/one`, { method: 'PUT', headers: HEADERS });
  pending.on('error', () => {});
  pending.write('a,b\r\n');
  await new Promise((resolve) => setTimeout(resolve, 100));
  const target = path.join(tmp, 'busy-target');
  const res = await relocate({ dir: target });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'busy');
  assert.equal(fs.existsSync(target), false, 'nothing is copied');
  assert.equal(config(), before);
  const done = new Promise((resolve) => pending.on('response', (r) => { r.resume(); r.on('end', resolve); }));
  pending.end();
  await done;
});
