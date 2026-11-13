import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const { legacyDataHint, DATA_DIR } = await import('../../backend/storage/paths.ts');

// Guard: `npm test` loads test/setup.mjs, which points VIEWER_CONFIG at the committed test config, whose dataDir is the
// sample data. Without it a test that forgets to isolate itself would read the real viewer/data/.
test('under npm test VIEWER_CONFIG is set and the data folder is the committed sample data, not the real viewer/data', () => {
  assert.ok(process.env.VIEWER_CONFIG, 'VIEWER_CONFIG is not set: run the tests with npm test (node --import ./test/setup.mjs)');
  assert.equal(path.resolve(process.env.VIEWER_CONFIG), path.resolve(import.meta.dirname, '../sample-config.yaml'));
  assert.equal(DATA_DIR, path.resolve(import.meta.dirname, '../sample-data'));
});

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paths-'));
  return { root, dataDir: path.join(root, 'viewer', 'data') };
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
  assert.match(hint, /Move-Item data viewer\/data/);
  assert.match(hint, /Rename-Item viewer\/data\/user-stories backlogs/);
});

test('legacyDataHint: a user-stories folder beside no backlogs folder is renamed, a custom data dir is never moved', () => {
  const { root, dataDir } = repo();
  fs.mkdirSync(path.join(root, 'data'));
  fs.mkdirSync(path.join(dataDir, 'user-stories'), { recursive: true });
  assert.match(legacyDataHint({ root, dataDir, custom: true }), /Rename-Item .*user-stories.* backlogs/);
  fs.mkdirSync(path.join(dataDir, 'backlogs'));
  assert.equal(legacyDataHint({ root, dataDir, custom: true }), null);
});

const PATHS = path.resolve(import.meta.dirname, '../../backend/storage/paths.ts');
const run = (env) => spawnSync(process.execPath, ['-e', "import(require('node:url').pathToFileURL(process.argv[1]).href).then((m) => console.log(m.DATA_DIR))", PATHS], {
  encoding: 'utf8', env: { ...process.env, VIEWER_CONFIG: '', PLANNER_DATA_DIR: '', TLT_DATA_DIR: '', ...env },
});

test('the default data folder is viewer/data when no config exists', () => {
  const out = run({ VIEWER_CONFIG: path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'paths-')), 'none.yaml') });
  assert.equal(out.stdout.trim(), path.resolve(import.meta.dirname, '../../data'));
});

test('a set PLANNER_DATA_DIR or TLT_DATA_DIR is ignored, with no warning; the config folder is used', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paths-'));
  const config = path.join(dir, 'viewer.config.yaml');
  fs.writeFileSync(config, 'dataDir: ./from-config\n');
  const out = run({ VIEWER_CONFIG: config, PLANNER_DATA_DIR: path.resolve('x-new'), TLT_DATA_DIR: path.resolve('x-old') });
  assert.equal(out.stdout.trim(), path.join(dir, 'from-config'));
  assert.equal(out.stderr, '');
});

test('setDataDir changes getDataDir but not DATA_DIR', async () => {
  const paths = await import('../../backend/storage/paths.ts');
  const before = paths.getDataDir();
  try {
    paths.setDataDir(path.join(os.tmpdir(), 'elsewhere'));
    assert.equal(paths.getDataDir(), path.join(os.tmpdir(), 'elsewhere'));
    assert.equal(paths.DATA_DIR, before);
  } finally {
    paths.setDataDir(before);
  }
});
