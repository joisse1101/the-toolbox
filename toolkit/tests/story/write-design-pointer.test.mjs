import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sampleTree, backlogPath } from './helpers/backlog-tree.mjs';
import { tempProject } from './helpers/temp-project.mjs';
import { writeDesignPointer, checkDesignPointer } from '../../skills/jois-story-design/write-design-pointer.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills/jois-story-design/write-design-pointer.mjs');
const SCOPE = { type: 'feature', epic: 'Habit tracking', feature: 'Streaks' };
const URL_A = 'https://claude.ai/artifact/abc123';
const URL_B = 'https://claude.ai/code/artifact/def456';

function temp() {
  const { dataDir } = tempProject();
  sampleTree({ into: dataDir });
  return dataDir;
}
const designsPath = (root) => path.join(backlogPath(root, 'sample'), 'designs.json');
const run = (root, entry) => writeDesignPointer({ dataDir: root, name: 'sample', input: JSON.stringify(entry) });
const check = (root, entry) => checkDesignPointer({ dataDir: root, name: 'sample', input: JSON.stringify(entry) });
const folderList = (root) => fs.readdirSync(backlogPath(root, 'sample')).sort();

test('--check writes nothing', () => {
  const root = temp();
  const before = folderList(root);
  const r = check(root, { scope: SCOPE, url: URL_A });
  assert.deepEqual([r.ok, r.action], [true, 'add']);
  assert.deepEqual(folderList(root), before);
  assert.equal(fs.existsSync(designsPath(root)), false);
});

test('a new entry is written, read back, and nothing else is left behind', () => {
  const root = temp();
  const before = folderList(root);
  const r = run(root, { scope: SCOPE, url: URL_A });
  assert.deepEqual([r.ok, r.changed, r.action], [true, true, 'add']);
  const text = fs.readFileSync(designsPath(root), 'utf8');
  assert.equal(text, `${JSON.stringify({ designs: [{ scope: SCOPE, url: URL_A }] }, null, 2)}\n`);
  assert.equal(text.includes('\r'), false);
  assert.deepEqual(folderList(root), [...before, 'designs.json'].sort());
});

test('a second scope is appended beside the first', () => {
  const root = temp();
  run(root, { scope: SCOPE, url: URL_A });
  const epic = { type: 'epic', epic: 'Focus timer' };
  assert.equal(run(root, { scope: epic, url: URL_B }).changed, true);
  assert.deepEqual(JSON.parse(fs.readFileSync(designsPath(root), 'utf8')).designs.map((d) => d.url), [URL_A, URL_B]);
});

test('the same entry twice is unchanged and leaves the file as it was', () => {
  const root = temp();
  run(root, { scope: SCOPE, url: URL_A });
  const once = fs.readFileSync(designsPath(root));
  const r = run(root, { scope: SCOPE, url: URL_A });
  assert.deepEqual([r.ok, r.changed, r.action], [true, false, 'unchanged']);
  assert.match(r.text, /Unchanged/);
  assert.deepEqual(fs.readFileSync(designsPath(root)), once);
});

test('another url for the same scope is refused and the file is unchanged', () => {
  const root = temp();
  run(root, { scope: SCOPE, url: URL_A });
  const once = fs.readFileSync(designsPath(root));
  for (const fn of [run, check]) {
    const r = fn(root, { scope: SCOPE, url: URL_B });
    assert.equal(r.ok, false);
    assert.match(r.errors[0], new RegExp(URL_A));
    assert.match(r.errors[0], new RegExp(URL_B));
  }
  assert.deepEqual(fs.readFileSync(designsPath(root)), once);
});

test('a bad url, a bad scope or an extra key is refused and writes nothing', () => {
  const root = temp();
  const cases = [
    [{ scope: SCOPE, url: 'https://example.com/artifact/abc' }, /url must be a claude\.ai artifact link/],
    [{ scope: SCOPE, url: `${URL_A}#frame` }, /url must be/],
    [{ scope: SCOPE, url: `${URL_A}/more` }, /url must be/],
    [{ scope: SCOPE }, /url must be/],
    [{ scope: { type: 'sprint', epic: 'x' }, url: URL_A }, /scope\.type/],
    [{ scope: { type: 'feature', epic: 'Habit tracking' }, url: URL_A }, /scope\.feature/],
    [{ scope: { ...SCOPE, extra: 'x' }, url: URL_A }, /scope\.extra/],
    [{ scope: SCOPE, url: URL_A, html: '<div/>' }, /html is not allowed/],
  ];
  for (const [entry, pattern] of cases) {
    const r = run(root, entry);
    assert.equal(r.ok, false, JSON.stringify(entry));
    assert.match(r.errors.join('\n'), pattern);
  }
  assert.equal(fs.existsSync(designsPath(root)), false);
});

test('a missing backlog is refused', () => {
  const root = temp();
  const r = writeDesignPointer({ dataDir: root, name: 'nope', input: JSON.stringify({ scope: SCOPE, url: URL_A }) });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /There is no backlog nope/);
  assert.deepEqual(fs.readdirSync(root).sort(), ['sample']);
});

test('the command line writes, repeats and refuses with the exit codes', () => {
  const root = temp();
  const call = (args, entry) => spawnSync(process.execPath, [SCRIPT, ...args], { input: JSON.stringify(entry), cwd: path.dirname(root), encoding: 'utf8' });
  const checked = call(['sample', '--check'], { scope: SCOPE, url: URL_A });
  assert.equal(checked.status, 0);
  assert.equal(fs.existsSync(designsPath(root)), false);
  assert.equal(call(['sample'], { scope: SCOPE, url: URL_A }).status, 0);
  const again = call(['sample'], { scope: SCOPE, url: URL_A });
  assert.equal(again.status, 0);
  assert.match(again.stdout, /Unchanged/);
  const clash = call(['sample'], { scope: SCOPE, url: URL_B });
  assert.equal(clash.status, 1);
  assert.match(clash.stderr, /Nothing was written/);
  assert.equal(call([], {}).status, 2);
});
