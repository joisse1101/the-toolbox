import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sampleTree, backlogPath, pathOf } from './helpers/backlog-tree.mjs';
import { tempProject } from './helpers/temp-project.mjs';
import { checkDesignIndex, formatCheck } from '../../skills/jois-story-design/check-design-index.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills/jois-story-design/check-design-index.mjs');
const AC_1_END = 'then it shows a streak of 3.';
const NEW_STORY = 'H1-HT-0003,Habit tracking,Streaks,See the weekly streak,"As a person building habits, I want a weekly streak, so that I see weeks.",2,,"AC1: Given a, when b, then c.",,,\n';

// A data folder with the habits backlog and the mock design files (a made-up canvas link).
function temp(over = {}) {
  const { dataDir } = tempProject();
  sampleTree({ into: dataDir, withDesign: true, ...over });
  return dataDir;
}
const check = (root, name = 'sample') => checkDesignIndex({ dataDir: root, name });
const editBacklog = (root, fn) => {
  const file = pathOf(root, 'sample', 'backlog');
  fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')));
};
const designFile = (root, file) => path.join(backlogPath(root, 'sample'), file);

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

test('the mock design files are current against the habits backlog: no findings', () => {
  const r = check(temp());
  assert.equal(r.ok, true);
  assert.equal(r.stale.stale, false);
  assert.equal(r.coverage.ok, true);
  assert.match(formatCheck(r), /^no findings/);
});

test('a reworded criterion is reported as changed with the old and the new text, and no file changes', () => {
  const root = temp();
  editBacklog(root, (t) => t.replace(AC_1_END, 'then it shows 3 days.'));
  const before = snapshot(root);
  const r = check(root);
  assert.equal(r.ok, true);
  assert.deepEqual(r.stale.changed.map((c) => [c.storyId, c.removed.length, c.added.length]), [['H1-HT-0001', 1, 1]]);
  const text = formatCheck(r);
  assert.match(text, /changed: H1-HT-0001 "See the current streak"/);
  assert.match(text, /old \(in the index, not in the backlog\): .*then it shows a streak of 3\./);
  assert.match(text, /new \(in the backlog, not in the index\): .*then it shows 3 days\./);
  // One reworded story is one finding, however many old and new lines it prints.
  assert.match(text, /^1 finding:/);
  assert.deepEqual(snapshot(root), before);
});

test('a renamed story is reported as changed with its old title, and a renumbered story reports nothing', () => {
  const root = temp();
  editBacklog(root, (t) => t.replace('See the current streak', 'See the running streak'));
  const renamed = check(root);
  assert.deepEqual(renamed.stale.changed.map((c) => [c.storyId, c.oldTitle]), [['H1-HT-0001', 'See the current streak']]);
  // The backlog numbers its stories in order, so deleting the first one renumbers the second. The portal rewrites the rows the
  // same way (the first story's rows go, the second's take its new ID), and then nothing is stale.
  const other = temp();
  const without = (text) => text.split('\n').filter((l) => !l.startsWith('H1-HT-0001')).join('\n');
  editBacklog(other, without);
  const file = designFile(other, 'design-index.csv');
  fs.writeFileSync(file, without(fs.readFileSync(file, 'utf8')).replaceAll('H1-HT-0002', 'H1-HT-0001'));
  assert.equal(check(other).stale.stale, false);
});

test('a deleted story is reported as missing, with the title the rows hold', () => {
  const root = temp();
  editBacklog(root, (t) => t.split('\n').filter((l) => !l.startsWith('H1-HT-0002')).join('\n'));
  const r = check(root);
  assert.deepEqual(r.stale.missing, [{ storyId: 'H1-HT-0002', title: 'See the best streak' }]);
  assert.match(formatCheck(r), /missing: H1-HT-0002 "See the best streak"/);
});

test('a story added to the designed scope is reported as new, and one outside the scope is not', () => {
  const root = temp();
  editBacklog(root, (t) => `${t.replace(/\r?\n$/, '\n')}${NEW_STORY}`);
  const r = check(root);
  assert.deepEqual(r.stale.new, [{ storyId: 'H1-HT-0003', title: 'See the weekly streak' }]);
  assert.match(formatCheck(r), /new: H1-HT-0003 "See the weekly streak" is in the designed scope/);
  assert.equal(r.stale.new.some((s) => s.storyId === 'H1-FT-0001'), false);
});

test('a row whose canvas designs.json does not list never reports new stories', () => {
  const root = temp();
  fs.writeFileSync(designFile(root, 'designs.json'), JSON.stringify({ designs: [{ scope: { type: 'epic', epic: 'Other epic' }, url: 'https://claude.ai/artifact/other0001' }] }));
  editBacklog(root, (t) => `${t.replace(/\r?\n$/, '\n')}${NEW_STORY}`);
  assert.deepEqual(check(root).stale.new, []);
});

test('coverage findings: a criterion with no artboard, and a failure criterion with no error artboard', () => {
  const root = temp();
  const file = designFile(root, 'design-index.csv');
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  lines[1] = lines[1].replace('streaks-list-default-desktop;streaks-list-default-mobile,desktop;mobile', ',desktop;mobile');
  lines[2] = lines[2].replace('streaks-best-error-desktop', 'streaks-best-default-desktop');
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
  const r = check(root);
  assert.equal(r.coverage.ok, false);
  assert.deepEqual(r.coverage.noArtboard.map((p) => p.storyId), ['H1-HT-0001']);
  assert.deepEqual(r.coverage.noErrorArtboard.map((p) => p.storyId), ['H1-HT-0002']);
  const text = formatCheck(r);
  assert.match(text, /no artboard: H1-HT-0001 "See the current streak"/);
  assert.match(text, /no error artboard: H1-HT-0002 "See the best streak"/);
});

test('an unreadable design-index.csv is an error naming its row and column, and no file changes', () => {
  const root = temp();
  const file = designFile(root, 'design-index.csv');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(',failure,', ',oops,'));
  const before = snapshot(root);
  const r = check(root);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /design-index\.csv cannot be read: row 3: column "Kind"/);
  assert.deepEqual(snapshot(root), before);
});

test('an unreadable designs.json is an error naming the file', () => {
  const root = temp();
  fs.writeFileSync(designFile(root, 'designs.json'), '{ "designs": [ { "scope": { "type": "epic" }, "url": "x" } ] }');
  const r = check(root);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /designs\.json cannot be read: designs\[0\] must hold a scope/);
});

test('with designs.json and no design-index.csv every story of the scope is new; with neither file there is no design', () => {
  const root = temp();
  fs.rmSync(designFile(root, 'design-index.csv'));
  assert.deepEqual(check(root).stale.new.map((s) => s.storyId), ['H1-HT-0001', 'H1-HT-0002']);
  const bare = temp({ withDesign: false });
  const r = check(bare);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /There is no design for sample/);
});

test('a missing backlog is refused', () => {
  const none = check(temp(), 'nope');
  assert.equal(none.ok, false);
  assert.match(none.errors[0], /There is no backlog nope/);
});

test('the command line reads the files itself, prints findings, exits 0, and changes no file', () => {
  const root = temp();
  editBacklog(root, (t) => t.split('\n').filter((l) => !l.startsWith('H1-HT-0002')).join('\n'));
  const before = snapshot(path.dirname(root));
  const call = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: path.dirname(root), encoding: 'utf8', input: '' });
  const r = call(['sample']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /missing: H1-HT-0002 "See the best streak"/);
  const asJson = call(['sample', '--json']);
  assert.deepEqual(JSON.parse(asJson.stdout).stale.missing, [{ storyId: 'H1-HT-0002', title: 'See the best streak' }]);
  assert.equal(call(['nope']).status, 1);
  assert.equal(call([]).status, 2);
  assert.deepEqual(snapshot(path.dirname(root)), before);
});
