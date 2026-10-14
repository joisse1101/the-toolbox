import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readBacklog, scopeOf, scopeLine } from '../.claude/skills/review-backlog/read-backlog.mjs';

const HEAD = 'ID,Epic,Feature,Title,Locked\r\n';

function temp(csv) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'read-backlog-test-'));
  fs.mkdirSync(path.join(root, 'user-stories'));
  fs.writeFileSync(path.join(root, 'user-stories', 'data.csv'), csv);
  const guidelines = path.join(root, 'guidelines');
  fs.mkdirSync(guidelines);
  fs.writeFileSync(path.join(guidelines, 'product-backlog.md'), '# Guidelines');
  return { dataDir: root, guidelinesDir: guidelines };
}

test('scope counts submitted and locked stories; locked rows stay in the printed CSV', () => {
  const csv = HEAD + 'E-0001,E,F,One,Yes\r\nE-0002,E,F,Two,\r\nE-0003,E,F,Three,Yes\r\n';
  const dirs = temp(csv);
  const r = readBacklog({ ...dirs, name: 'data.csv' });
  assert.deepEqual(r.scope, { total: 3, locked: 2, submitted: 1 });
  assert.equal(scopeLine(r.scope), '1 of 3 stories submitted for review, 2 locked (reference only)');
  assert.equal(r.csv, csv);
});

test('no locked story: everything is submitted', () => {
  const r = readBacklog({ ...temp(HEAD + 'E-0001,E,F,One,\r\nE-0002,E,F,Two,\r\n'), name: 'data.csv' });
  assert.equal(scopeLine(r.scope), '2 of 2 stories submitted for review, 0 locked (reference only)');
});

test('an older backlog without a Locked column counts as all submitted', () => {
  assert.deepEqual(scopeOf('ID,Epic,Title\r\nE-0001,E,One\r\n'), { total: 1, locked: 0, submitted: 1 });
});

test('a Locked value on a story without an ID does not count as locked', () => {
  assert.deepEqual(scopeOf(HEAD + ',,One,Yes\r\n'), { total: 1, locked: 0, submitted: 1 });
});

test('the CLI prints the scope line between the guidelines and the CSV', async () => {
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.claude/skills/review-backlog/read-backlog.mjs');
  const root = temp(HEAD + 'E-0001,E,F,One,Yes\r\n');
  const out = spawnSync(process.execPath, [script, 'data.csv'], { encoding: 'utf8', env: { ...process.env, TLT_DATA_DIR: root.dataDir } }).stdout;
  const at = (s) => out.indexOf(s);
  assert.ok(at('=== guidelines') < at('0 of 1 stories submitted for review, 1 locked (reference only)'));
  assert.ok(at('0 of 1 stories') < at('=== user-stories/data.csv'));
});

test('a CSV that cannot be read gives no scope (the line is left out)', () => {
  assert.equal(scopeOf(undefined), null);
});
