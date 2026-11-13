import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const bp = require('../../logic/storage/backlog-paths.cjs');
const { validateBacklogName } =require('../../logic/storage/file-name.cjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-paths-'));
const D = path.join(os.tmpdir(), 'data');

test('backlogFile maps each kind to its fixed file in the backlog folder', () => {
  assert.equal(bp.backlogFile(D, 'iam', 'backlog'), path.join(D, 'iam', 'user-stories.csv'));
  assert.equal(bp.backlogFile(D, 'iam', 'review'), path.join(D, 'iam', 'user-stories', 'review.csv'));
  assert.equal(bp.backlogFile(D, 'iam', 'proposals'), path.join(D, 'iam', 'user-stories', 'proposals.csv'));
  assert.equal(bp.backlogFile(D, 'iam', 'lexicon'), path.join(D, 'iam', 'lexicon.csv'));
  assert.equal(bp.backlogFile(D, 'iam', 'lexicon-suggestions'), path.join(D, 'iam', 'lexicon', 'lexicon-suggestions.csv'));
  assert.deepEqual(bp.KINDS, ['backlog', 'review', 'proposals', 'lexicon', 'lexicon-suggestions']);
});

test('the other paths of a backlog', () => {
  assert.equal(bp.backlogDir(D, 'iam'), path.join(D, 'iam'));
  assert.equal(bp.reviewDecidedFile(D, 'iam'), path.join(D, 'iam', 'user-stories', 'review.csv.decided'));
  assert.equal(bp.slicesDir(D, 'iam'), path.join(D, 'iam', 'slices'));
  assert.deepEqual(bp.contextMapFiles(D, 'iam'), { json: path.join(D, 'iam', 'context-map.json'), md: path.join(D, 'iam', 'context-map.md') });
});

test('a name with a trailing .csv is the same backlog', () => {
  assert.equal(bp.backlogFile(D, 'iam.csv', 'backlog'), bp.backlogFile(D, 'iam', 'backlog'));
  assert.equal(validateBacklogName('IAM.CSV'), 'IAM');
  assert.equal(validateBacklogName('  iam  '), 'iam');
  assert.equal(validateBacklogName('sprint 12'), 'sprint 12');
});

test('an unknown kind is refused as unknown-store, including slices and logs', () => {
  for (const kind of ['slices', 'logs', 'repo', '', undefined, '__proto__', 'constructor']) {
    assert.throws(() => bp.backlogFile(D, 'iam', kind), (e) => e.status === 404 && e.code === 'unknown-store');
  }
});

test('unsafe names are rejected by every path builder', () => {
  const bad = ['../x', 'a/b', 'a\\b', '..', '.', 'x..y', '/abs', 'C:\\x', 'C:x', 'a:b', 'a*', 'a?', 'a"b', 'a<b', 'a>b', 'a|b',
    'a\x00b', 'a\nb', '', '   ', '.csv', ' .csv', 'name.', 'name. ', 'con', 'NUL', 'com1', 'lpt9', 'con.txt', 'logs', 'LOGS', 'Logs.csv',
    'x'.repeat(117), null, undefined, 5, {}];
  for (const name of bad) {
    assert.throws(() => validateBacklogName(name), (e) => e.status === 400, `validate ${JSON.stringify(name)}`);
    assert.throws(() => bp.backlogDir(D, name), (e) => e.status === 400);
    assert.throws(() => bp.backlogFile(D, name, 'backlog'), (e) => e.status === 400);
    assert.throws(() => bp.slicesDir(D, name), (e) => e.status === 400);
    assert.throws(() => bp.contextMapFiles(D, name), (e) => e.status === 400);
  }
});

test('the reserved name logs has its own code', () => {
  assert.throws(() => validateBacklogName('logs'), (e) => e.code === 'reserved-name');
});

test('a built path never leaves the data folder', () => {
  for (const name of ['iam', 'a b', 'x.y', 'iam.csv']) {
    for (const kind of bp.KINDS) {
      const rel = path.relative(D, bp.backlogFile(D, name, kind));
      assert.ok(!rel.startsWith('..') && !path.isAbsolute(rel), rel);
    }
  }
});

test('validateName (the older file rule) is gone: the backlog name rule is the only one', () => {
  assert.equal(require('../../logic/storage/file-name.cjs').validateName, undefined);
});

test('listBacklogs lists subfolders holding user-stories.csv, sorted, and not logs or loose files', () => {
  const dir = tmp();
  for (const n of ['payments', 'iam']) {
    fs.mkdirSync(path.join(dir, n));
    fs.writeFileSync(path.join(dir, n, 'user-stories.csv'), 'ID\n');
  }
  fs.mkdirSync(path.join(dir, 'logs'));
  fs.writeFileSync(path.join(dir, 'logs', 'user-stories.csv'), 'ID\n');
  fs.mkdirSync(path.join(dir, 'empty'));
  fs.mkdirSync(path.join(dir, 'notes'));
  fs.writeFileSync(path.join(dir, 'notes', 'notes.txt'), 'x');
  fs.mkdirSync(path.join(dir, 'dirfile'));
  fs.mkdirSync(path.join(dir, 'dirfile', 'user-stories.csv'));
  fs.writeFileSync(path.join(dir, 'stray.csv'), 'x');
  assert.deepEqual(bp.listBacklogs(dir), ['iam', 'payments']);
});

test('listBacklogs of a missing folder is empty', () => {
  assert.deepEqual(bp.listBacklogs(path.join(tmp(), 'nope')), []);
});

test('detectOlderLayout names the older folders present, and reads nothing in them', () => {
  const dir = tmp();
  assert.deepEqual(bp.detectOlderLayout(dir), []);
  fs.mkdirSync(path.join(dir, 'backlogs'));
  fs.writeFileSync(path.join(dir, 'backlogs', 'iam.csv'), 'ID\n');
  fs.mkdirSync(path.join(dir, 'diagrams'));
  fs.writeFileSync(path.join(dir, 'lexicons'), 'a file, not a folder');
  assert.deepEqual(bp.detectOlderLayout(dir), ['backlogs', 'diagrams']);
  assert.deepEqual(bp.listBacklogs(dir), []);
});
