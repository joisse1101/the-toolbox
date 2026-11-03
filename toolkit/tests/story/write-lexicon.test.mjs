import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathOf, decidedPath } from './helpers/backlog-tree.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeLexicon, checkLexicon } from '../../skills/jois-story-propose/write-lexicon.mjs';
import { parseLexicon } from '../../skills/jois-story-propose/lib/lexicon/lexicon.js';
import { tempConfig } from './helpers/temp-config.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills/jois-story-propose/write-lexicon.mjs');
const BACKLOG = 'Epic,Title\r\nIdentity,Login\r\n';

function temp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lexicon-test-'));
  fs.mkdirSync(path.dirname(pathOf(root, 'data', 'backlog')), { recursive: true });
  fs.writeFileSync(pathOf(root, 'data', 'backlog'), BACKLOG);
  return root;
}

const run = (root, items, name = 'data.csv') => writeLexicon({ dataDir: root, name, input: JSON.stringify(items) });
const lexiconPath = (root) => pathOf(root, 'data', 'lexicon');
const load = (root) => parseLexicon(fs.readFileSync(lexiconPath(root), 'utf8'));
const seed = (root, text) => {
  fs.mkdirSync(path.dirname(pathOf(root, 'data', 'lexicon')), { recursive: true });
  fs.writeFileSync(lexiconPath(root), text);
};

test('valid input creates lexicons/<name> and leaves the backlog byte-for-byte unchanged', () => {
  const root = temp();
  const before = fs.readFileSync(pathOf(root, 'data', 'backlog'));
  const result = run(root, [{ term: 'User', definition: 'A person with a login.', avoid: ['customer'] }]);
  assert.deepEqual([result.ok, result.added, result.count], [true, ['User'], 1]);
  assert.deepEqual(load(root).terms.map((t) => [t.name, t.avoid]), [['User', ['customer']]]);
  assert.ok(fs.readFileSync(lexiconPath(root), 'utf8').startsWith('﻿Term,Part of,Definition,Avoid,Notes\r\n'));
  assert.deepEqual(fs.readFileSync(pathOf(root, 'data', 'backlog')), before);
  assert.deepEqual(fs.readdirSync(path.dirname(pathOf(root, 'data', 'lexicon'))), ['lexicon.csv', 'user-stories.csv'], 'no temp file is left');
});

test('a parent and its child can be added in one run', () => {
  const root = temp();
  const result = run(root, [
    { term: 'Dataset', definition: 'A table.' },
    { term: 'Dataset attribute', definition: 'A column.', partOf: 'Dataset' },
  ]);
  assert.equal(result.ok, true);
  assert.deepEqual(load(root).terms.map((t) => [t.name, t.partOf]), [['Dataset', ''], ['Dataset attribute', 'Dataset']]);
});

test('a term that exists is refused and the file is untouched', () => {
  const root = temp();
  const seeded = 'Term,Owner,Definition,Avoid\r\nUser,Ana,A person.,customer\r\nRole,Bo,Permissions.,\r\n';
  seed(root, seeded);
  const result = run(root, [{ term: 'user', definition: 'x', avoid: ['customer', 'member'] }]);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^item 1: "user" is already a term: suggest a change to it with suggest_lexicon_change/);
  assert.equal(fs.readFileSync(lexiconPath(root), 'utf8'), seeded);
});

test('adding a term keeps unknown columns and the other rows', () => {
  const root = temp();
  seed(root, 'Term,Owner,Definition,Avoid\r\nUser,Ana,A person.,customer\r\nRole,Bo,Permissions.,\r\n');
  const result = run(root, [{ term: 'Group', definition: 'Users together.' }]);
  assert.deepEqual([result.ok, result.added], [true, ['Group']]);
  const text = fs.readFileSync(lexiconPath(root), 'utf8');
  assert.equal(text, 'Term,Owner,Definition,Avoid,Part of,Notes\r\nUser,Ana,A person.,customer,,\r\nRole,Bo,Permissions.,,,\r\nGroup,,Users together.,,,\r\n');
});

test('a term the lexicon rules refuse writes nothing and every problem is reported by item', () => {
  const root = temp();
  seed(root, 'Term,Definition,Avoid\r\nUser,A person.,customer\r\n');
  const before = fs.readFileSync(lexiconPath(root));
  const result = run(root, [{ term: 'Role' }, { term: 'Permission', definition: 'd', partOf: 'Nope' }, { term: 'Customer', definition: 'x' }]);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 3);
  assert.match(result.errors[0], /^item 1: new term "Role" needs a definition/);
  assert.match(result.errors.join('\n'), /item 2: "Permission" is part of "Nope"/);
  assert.match(result.errors.join('\n'), /"User" avoids "customer"/);
  assert.deepEqual(fs.readFileSync(lexiconPath(root)), before);
});

test('an unknown key is rejected', () => {
  const root = temp();
  const result = run(root, [{ term: 'User', definition: 'x', synonym: 'y' }]);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /unknown key "synonym"/);
  assert.equal(fs.existsSync(lexiconPath(root)), false);
});

test('a backlog that does not exist is refused', () => {
  const root = temp();
  const result = run(root, [{ term: 'User', definition: 'x' }], 'missing.csv');
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /missing\/user-stories\.csv was not found/);
  assert.equal(fs.existsSync(pathOf(root, 'data', 'lexicon')), false);
});

test('file names follow the file store rules', () => {
  const root = temp();
  for (const bad of ['../x.csv', 'sub/x.csv', 'a:b.csv']) {
    assert.equal(run(root, [{ term: 'A', definition: 'b' }], bad).ok, false, bad);
  }
  assert.equal(fs.existsSync(pathOf(root, 'data', 'lexicon')), false);
});

test('invalid JSON is reported with a position and writes nothing', () => {
  const root = temp();
  const result = writeLexicon({ dataDir: root, name: 'data.csv', input: '[{"term": "A", "definition": "b",}]' });
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^The terms on stdin are not valid JSON/);
  assert.match(result.errors[0], /line 1, column/);
  assert.equal(fs.existsSync(pathOf(root, 'data', 'lexicon')), false);
});

test('the script reports what it did, and a refused run exits 1', () => {
  const root = temp();
  const env = { ...process.env, PLANNER_CONFIG: tempConfig(root) };
  const ok = spawnSync('node', [SCRIPT, 'data.csv'], { input: '[{"term":"User","definition":"A person."}]', env, encoding: 'utf8' });
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /^Added 1 term to the lexicon of data \(User\); 1 in the lexicon now\./);
  const again = spawnSync('node', [SCRIPT, 'data.csv'], { input: '[{"term":"User","definition":"A person."}]', env, encoding: 'utf8' });
  assert.equal(again.status, 1);
  assert.match(again.stderr, /"User" is already a term/);
  const bad = spawnSync('node', [SCRIPT, 'data.csv'], { input: '[{"term":"X"}]', env, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Nothing was written\. 1 problem:/);
  assert.equal(spawnSync('node', [SCRIPT], { input: '[]', env, encoding: 'utf8' }).status, 2);
});

test('a check reports the same problems and the terms it would add, and changes nothing', () => {
  const root = temp();
  const check = (items) => checkLexicon({ dataDir: root, name: 'data.csv', input: JSON.stringify(items) });
  const ok = check([{ term: 'User', definition: 'A person with a login.' }]);
  assert.deepEqual([ok.ok, ok.added], [true, ['User']]);
  assert.equal(fs.existsSync(pathOf(root, 'data', 'lexicon')), false, 'a check creates nothing');

  const bad = [{ term: 'User' }];
  assert.deepEqual(check(bad).errors, run(root, bad).errors, 'same problems as the writer');

  run(root, [{ term: 'User', definition: 'A person with a login.' }]);
  const before = fs.readFileSync(lexiconPath(root));
  assert.equal(check([{ term: 'user', definition: 'again' }]).ok, false, 'an existing term is refused');
  assert.deepEqual(fs.readFileSync(lexiconPath(root)), before);
});

test('a write that does not stick fails naming the missing term', () => {
  const root = temp();
  const realRename = fs.renameSync;
  const lossy = mock.method(fs, 'renameSync', (from, to) => {
    const lines = fs.readFileSync(from, 'utf8').split('\r\n');
    fs.writeFileSync(from, [...lines.slice(0, -2), ''].join('\r\n')); // the last term never reaches the file
    realRename(from, to);
  });
  try {
    const r = run(root, [{ term: 'User', definition: 'A person.' }, { term: 'Role', definition: 'A set of rights.' }]);
    assert.equal(r.ok, false);
    assert.match(r.errors[0], /read back is wrong: Role not found/);
    assert.match(r.errors[0], /Do not report these terms as written/);
  } finally {
    lossy.mock.restore();
  }
});

test('CLI: --check reports the terms it would add and writes no file; a bad item fails the check', () => {
  const root = temp();
  const env = { ...process.env, PLANNER_CONFIG: tempConfig(root) };
  const before = fs.readdirSync(path.dirname(pathOf(root, 'data', 'lexicon')));
  const ok = spawnSync('node', [SCRIPT, 'data.csv', '--check'], { input: '[{"term":"User","definition":"A person."}]', env, encoding: 'utf8' });
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /^Check passed, nothing written\. Would add 1 term to the lexicon of data \(User\)\./);
  const bad = spawnSync('node', [SCRIPT, 'data.csv', '--check'], { input: '[{"term":"X"}]', env, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Nothing was written\. 1 problem:/);
  assert.equal(spawnSync('node', [SCRIPT, 'data.csv', '--oops'], { input: '[]', env, encoding: 'utf8' }).status, 2);
  assert.deepEqual(fs.readdirSync(path.dirname(pathOf(root, 'data', 'lexicon'))), before, 'no file was created');
  assert.equal(fs.existsSync(path.join(root, 'logs', 'writes.jsonl')), false, 'nothing was logged');
});
