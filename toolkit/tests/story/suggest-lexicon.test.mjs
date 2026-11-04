import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pathOf } from './helpers/backlog-tree.mjs';
import { suggestLexicon, checkSuggestion } from '../../skills/jois-story-propose/suggest-lexicon.mjs';
import { tempConfig } from './helpers/temp-config.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills/jois-story-propose/suggest-lexicon.mjs');
const LEXICON = 'Term,Part of,Definition,Avoid,Notes\r\nRole,,A set of privileges.,,\r\nUser,,A person with a login.,customer,\r\n';

function temp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'suggest-test-'));
  fs.mkdirSync(path.dirname(pathOf(root, 'data', 'backlog')), { recursive: true });
  fs.writeFileSync(pathOf(root, 'data', 'backlog'), 'Epic,Title\r\nIdentity,Login\r\n');
  fs.writeFileSync(pathOf(root, 'data', 'lexicon'), LEXICON);
  return root;
}

const suggestionsPath = (root) => pathOf(root, 'data', 'lexicon-suggestions');
const rename = { term: 'Role', action: 'rename', newName: 'Privilege', reason: 'Role clashes with job roles.' };

test('a suggestion appends an open row, reports its impact and leaves the lexicon alone', () => {
  const root = temp();
  const lexiconBefore = fs.readFileSync(pathOf(root, 'data', 'lexicon'));
  const r = suggestLexicon({ dataDir: root, name: 'data', items: [rename] });
  assert.deepEqual([r.ok, r.added, r.count], [true, 1, 1]);
  assert.match(fs.readFileSync(suggestionsPath(root), 'utf8'), /Role,rename,Privilege/);
  assert.deepEqual(fs.readFileSync(pathOf(root, 'data', 'lexicon')), lexiconBefore);
});

test('a check reports the same problems and what it would add, and creates no file', () => {
  const root = temp();
  const ok = checkSuggestion({ dataDir: root, name: 'data', items: [rename] });
  assert.deepEqual([ok.ok, ok.added, ok.count], [true, 1, 1]);
  assert.equal(fs.existsSync(suggestionsPath(root)), false, 'a check writes nothing');
  const bad = checkSuggestion({ dataDir: root, name: 'data', items: [{ term: 'Nope', action: 'delete', reason: 'x' }] });
  assert.equal(bad.ok, false);
  assert.equal(suggestLexicon({ dataDir: root, name: 'data', items: [{ term: 'Nope', action: 'delete', reason: 'x' }] }).ok, false);
  assert.equal(fs.existsSync(suggestionsPath(root)), false);
});

test('a check leaves an existing suggestions file byte-for-byte as it was', () => {
  const root = temp();
  suggestLexicon({ dataDir: root, name: 'data', items: [rename] });
  const before = fs.readFileSync(suggestionsPath(root));
  const r = checkSuggestion({ dataDir: root, name: 'data', items: [{ term: 'User', action: 'delete', reason: 'Replaced.' }] });
  assert.deepEqual([r.ok, r.added, r.count], [true, 1, 2]);
  assert.deepEqual(fs.readFileSync(suggestionsPath(root)), before);
});

test('CLI: --check prints the impact and writes nothing; without it the row is written', () => {
  const root = temp();
  const env = { ...process.env, PLANNER_CONFIG: tempConfig(root) };
  const input = JSON.stringify([rename]);
  const check = spawnSync(process.execPath, [SCRIPT, 'data', '--check'], { input, env, encoding: 'utf8' });
  assert.equal(check.status, 0);
  assert.match(check.stdout, /^Check passed, nothing written\. Would add 1 suggestion to the lexicon suggestions of data/);
  assert.match(check.stdout, /rename "Role" to "Privilege"/);
  assert.equal(fs.existsSync(suggestionsPath(root)), false);
  const written = spawnSync(process.execPath, [SCRIPT, 'data'], { input, env, encoding: 'utf8' });
  assert.equal(written.status, 0);
  assert.match(written.stdout, /^Added 1 suggestion to the lexicon suggestions of data; 1 in the file now\./);
  assert.equal(fs.existsSync(suggestionsPath(root)), true);
  const bad = spawnSync(process.execPath, [SCRIPT, 'data', '--check'], { input: '[{"term":"Nope","action":"delete","reason":"x"}]', env, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Nothing was written/);
  assert.equal(spawnSync(process.execPath, [SCRIPT], { input: '[]', env, encoding: 'utf8' }).status, 2);
});
