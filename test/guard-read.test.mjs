import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { check, allowedFiles } from '../ai/mcp/guard-read.mjs';

const DATA = path.resolve('/tlt-data');
const LEXICON = path.join(DATA, 'lexicons', 'portal.csv');
const PROPOSALS = path.join(DATA, 'proposals', 'portal.csv');
const ALLOWED = [LEXICON, PROPOSALS];

test('Read of an allowed file is allowed, with or without offset and limit', () => {
  assert.equal(check('Read', { file_path: LEXICON }, ALLOWED), null);
  assert.equal(check('Read', { file_path: PROPOSALS, offset: 10, limit: 50 }, ALLOWED), null);
});

test('Grep with an allowed file as path is allowed', () => {
  assert.equal(check('Grep', { pattern: 'dataset', path: LEXICON }, ALLOWED), null);
});

test('a file that does not exist yet is still allowed', () => {
  assert.equal(check('Read', { file_path: path.join(DATA, 'proposals', 'portal.csv') }, ALLOWED), null);
});

test('another backlog, another store, backups and meetings are denied, naming the allowed files', () => {
  for (const p of [
    path.join(DATA, 'lexicons', 'other.csv'),
    path.join(DATA, 'user-stories', 'portal.csv'),
    path.join(DATA, 'backups', 'portal.csv', '2026-01-01_000000', 'proposals.csv'),
    path.join(DATA, 'meetings', 'x.md'),
    path.join(DATA, 'logs', 'writes.jsonl'),
    `${LEXICON}.decided`,
  ]) {
    const error = check('Read', { file_path: p }, ALLOWED);
    assert.ok(error, p);
    assert.ok(error.includes(LEXICON) && error.includes(PROPOSALS), p);
  }
});

test('a folder and a path that climbs out are denied', () => {
  assert.ok(check('Read', { file_path: path.join(DATA, 'lexicons') }, ALLOWED));
  assert.ok(check('Read', { file_path: path.join(DATA, 'lexicons', '..', 'backups', 'x', 'y.csv') }, ALLOWED));
  assert.ok(check('Grep', { pattern: 'x', path: DATA }, ALLOWED));
});

test('a path that climbs and comes back to an allowed file is the allowed file', () => {
  assert.equal(check('Read', { file_path: path.join(DATA, 'backups', '..', 'lexicons', 'portal.csv') }, ALLOWED), null);
});

test('Grep without a path is denied', () => {
  assert.ok(check('Grep', { pattern: 'dataset' }, ALLOWED));
  assert.ok(check('Grep', { pattern: 'dataset', path: '  ' }, ALLOWED));
});

test('no allow list denies everything', () => {
  assert.ok(check('Read', { file_path: LEXICON }, []));
  assert.deepEqual(allowedFiles(''), []);
  assert.deepEqual(allowedFiles(undefined), []);
});

test('another tool, no tool input and a non-string path are denied', () => {
  assert.ok(check('Bash', { command: 'cat x' }, ALLOWED));
  assert.ok(check('Read', undefined, ALLOWED));
  assert.ok(check('Read', { file_path: 42 }, ALLOWED));
  assert.ok(check(undefined, undefined, ALLOWED));
});

test('the list is split on the platform delimiter', () => {
  assert.deepEqual(allowedFiles(ALLOWED.join(path.delimiter)), ALLOWED);
});

if (process.platform === 'win32') {
  test('Windows paths compare ignoring case', () => {
    assert.equal(check('Read', { file_path: LEXICON.toUpperCase() }, ALLOWED), null);
  });
}

// The hook as Claude Code runs it: JSON on stdin, a deny as JSON on stdout, silence for an allow.
const script = fileURLToPath(new URL('../ai/mcp/guard-read.mjs', import.meta.url));
const run = (input, env) => spawnSync(process.execPath, [script], { input, encoding: 'utf8', env: { ...process.env, TLT_READ_ALLOW: '', ...env } });

test('as a process: allow is silent, deny is a PreToolUse deny, bad input and no env deny', () => {
  const env = { TLT_READ_ALLOW: ALLOWED.join(path.delimiter) };
  assert.equal(run(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: LEXICON } }), env).stdout, '');
  const denied = JSON.parse(run(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: path.join(DATA, 'backups', 'x') } }), env).stdout);
  assert.equal(denied.hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(JSON.parse(run('not json', env).stdout).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(JSON.parse(run(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: LEXICON } }), {}).stdout).hookSpecificOutput.permissionDecision, 'deny');
});
