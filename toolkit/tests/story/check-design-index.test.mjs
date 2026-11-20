import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sampleTree } from './helpers/backlog-tree.mjs';
import { tempProject } from './helpers/temp-project.mjs';
import { checkDesignIndex, formatCheck } from '../../skills/jois-story-design/check-design-index.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills/jois-story-design/check-design-index.mjs');
const AC_1 = 'Given a habit checked off on each of the last 3 days, when I open the habit list, then it shows a streak of 3.';
const AC_2 = 'Given a habit whose longest run was 5 days and whose current streak is 2, when I open the habit list, then it shows a best streak of 5.';

const board = (text, artboards = ['streak-main'], kind = 'main') => ({ text, kind, artboards });
function makeIndex(overrides = {}) {
  return {
    version: 1,
    backlog: 'sample',
    scope: { type: 'feature', epic: 'Habit tracking', feature: 'Streaks' },
    viewports: ['desktop'],
    stories: [
      { title: 'See the current streak', criteria: [board(AC_1)] },
      { title: 'See the best streak', criteria: [board(AC_2)] },
    ],
    ...overrides,
  };
}
const withStories = (stories) => makeIndex({ stories });

function temp() {
  const { dataDir } = tempProject();
  sampleTree({ into: dataDir });
  return dataDir;
}
const check = (root, index, name = 'sample') => checkDesignIndex({ dataDir: root, name, input: typeof index === 'string' ? index : JSON.stringify(index) });

// A listing of every file under a folder with its hash.
function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(dir, p)] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    }
  };
  walk(dir);
  return out;
}

test('a clean index has no findings', () => {
  const root = temp();
  const r = check(root, makeIndex());
  assert.equal(r.ok, true);
  assert.equal(r.stale.stale, false);
  assert.equal(r.coverage.ok, true);
  assert.match(formatCheck(r), /^no findings/);
});

test('a renamed story is reported as missing and the real one as new, and no file changes', () => {
  const root = temp();
  const before = snapshot(root);
  const renamed = withStories([
    { title: 'See the running streak', criteria: [board(AC_1)] },
    { title: 'See the best streak', criteria: [board(AC_2)] },
  ]);
  const r = check(root, renamed);
  assert.equal(r.ok, true);
  assert.deepEqual(r.stale.missing, ['See the running streak']);
  assert.deepEqual(r.stale.new, ['See the current streak']);
  const text = formatCheck(r);
  assert.match(text, /missing: "See the running streak"/);
  assert.match(text, /new: "See the current streak"/);
  assert.deepEqual(snapshot(root), before);
});

test('a reworded criterion is reported as changed', () => {
  const root = temp();
  const r = check(root, withStories([
    { title: 'See the current streak', criteria: [board('Given an old wording, when x, then y.')] },
    { title: 'See the best streak', criteria: [board(AC_2)] },
  ]));
  assert.deepEqual(r.stale.changed.map((c) => c.title), ['See the current streak']);
  assert.match(formatCheck(r), /changed: "See the current streak"/);
});

test('coverage findings: a criterion with no artboard, and a failure criterion with no error artboard', () => {
  const root = temp();
  const r = check(root, withStories([
    { title: 'See the current streak', criteria: [board(AC_1, [])] },
    { title: 'See the best streak', criteria: [board(AC_2, ['streak-main'], 'failure')] },
  ]));
  assert.equal(r.coverage.ok, false);
  assert.deepEqual(r.coverage.noArtboard.map((p) => p.story), ['See the current streak']);
  assert.deepEqual(r.coverage.noErrorArtboard.map((p) => p.story), ['See the best streak']);
  const text = formatCheck(r);
  assert.match(text, /no artboard: "See the current streak"/);
  assert.match(text, /no error artboard: "See the best streak"/);
});

test('an index inside Main.dc.html text is read, and an unparseable one names its line', () => {
  const root = temp();
  const page = `<html>\n<script>\nconst index = ${JSON.stringify(makeIndex(), null, 2)};\n</script>\n</html>\n`;
  assert.equal(check(root, page).ok, true);
  const broken = `<html>\n<script>\nconst index = {\n  "version": 1,\n  "backlog": "sample",\n  oops: 1\n};\n</script>\n`;
  const r = check(root, broken);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /line 6/);
});

test('an index of another backlog, or a missing backlog, is refused', () => {
  const root = temp();
  const other = check(root, makeIndex({ backlog: 'other' }));
  assert.equal(other.ok, false);
  assert.match(other.errors[0], /"other", not "sample"/);
  const none = check(root, makeIndex({ backlog: 'nope' }), 'nope');
  assert.equal(none.ok, false);
  assert.match(none.errors[0], /There is no backlog nope/);
});

test('index content is data: it is never run', () => {
  const root = temp();
  const page = `const index = ${JSON.stringify(makeIndex())};\nglobalThis.__ran = true;`;
  assert.equal(check(root, page).ok, true);
  assert.equal(globalThis.__ran, undefined);
});

test('the command line prints findings, exits 0, and changes no file', () => {
  const root = temp();
  const before = snapshot(path.dirname(root));
  const call = (args, input) => spawnSync(process.execPath, [SCRIPT, ...args], { input, cwd: path.dirname(root), encoding: 'utf8' });
  const renamed = JSON.stringify(withStories([{ title: 'See the running streak', criteria: [board(AC_1)] }]));
  const r = call(['sample'], renamed);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /missing: "See the running streak"/);
  const asJson = call(['sample', '--json'], renamed);
  assert.deepEqual(JSON.parse(asJson.stdout).stale.missing, ['See the running streak']);
  const bad = call(['sample'], '{ nope');
  assert.equal(bad.status, 1);
  assert.equal(call([], '').status, 2);
  assert.deepEqual(snapshot(path.dirname(root)), before);
});
