import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const { legacyDataHint } = createRequire(import.meta.url)('../../logic/storage/paths.cjs');

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paths-'));
  return { root, dataDir: path.join(root, 'planner', 'data') };
}

test('legacyDataHint: nothing to move gives no hint', () => {
  const { root, dataDir } = repo();
  fs.mkdirSync(path.join(dataDir, 'backlogs'), { recursive: true });
  assert.equal(legacyDataHint({ root, dataDir, custom: false }), null);
});

test('legacyDataHint: data still in <repo>/data names both steps', () => {
  const { root, dataDir } = repo();
  fs.mkdirSync(path.join(root, 'data'));
  const hint = legacyDataHint({ root, dataDir, custom: false });
  assert.match(hint, /Move-Item data planner\/data/);
  assert.match(hint, /Rename-Item planner\/data\/user-stories backlogs/);
});

test('legacyDataHint: a user-stories folder beside no backlogs folder is renamed, a custom data dir is never moved', () => {
  const { root, dataDir } = repo();
  fs.mkdirSync(path.join(root, 'data'));
  fs.mkdirSync(path.join(dataDir, 'user-stories'), { recursive: true });
  assert.match(legacyDataHint({ root, dataDir, custom: true }), /Rename-Item .*user-stories.* backlogs/);
  fs.mkdirSync(path.join(dataDir, 'backlogs'));
  assert.equal(legacyDataHint({ root, dataDir, custom: true }), null);
});
