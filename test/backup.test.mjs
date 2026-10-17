import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { backupFolderName, isBackupFolderName, backupFiles } = createRequire(import.meta.url)('../core/backup.cjs');

test('backupFolderName uses local time and zero-pads every part', () => {
  assert.equal(backupFolderName(new Date(2026, 0, 5, 3, 4, 9)), '2026-01-05_030409');
  assert.equal(backupFolderName(new Date(2026, 9, 15, 14, 32, 5)), '2026-10-15_143205');
});

test('backupFolderName at midnight', () => {
  assert.equal(backupFolderName(new Date(2026, 11, 31, 0, 0, 0)), '2026-12-31_000000');
});

test('isBackupFolderName accepts a name and a numbered name', () => {
  assert.equal(isBackupFolderName('2026-10-15_143205'), true);
  assert.equal(isBackupFolderName('2026-10-15_143205-2'), true);
  assert.equal(isBackupFolderName('2026-10-15_143205-12'), true);
});

test('isBackupFolderName rejects paths and other text', () => {
  for (const bad of ['..', '../x', '2026-10-15_143205/..', '2026-10-15_143205\\x', 'current', '', '2026-10-15_14320', '2026-10-15_143205-', '2026-10-15_143205-0', '2026-10-15_143205-1x', ' 2026-10-15_143205', undefined, null, 5]) {
    assert.equal(isBackupFolderName(bad), false, String(bad));
  }
});

test('backupFiles lists the five stores for the name and never a sidecar', () => {
  assert.deepEqual(backupFiles('sprint-12.csv'), [
    { store: 'user-stories', name: 'sprint-12.csv' },
    { store: 'reviews', name: 'sprint-12.csv' },
    { store: 'proposals', name: 'sprint-12.csv' },
    { store: 'lexicons', name: 'sprint-12.csv' },
    { store: 'lexicon-suggestions', name: 'sprint-12.csv' },
  ]);
  assert.ok(backupFiles('a.csv').every((f) => !f.name.endsWith('.decided')));
});
