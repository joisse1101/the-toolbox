import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolveDataDir, dataDirOrThrow, PLANS_DIR } from '../../shared/skill-support/resolve-data-dir.ts';

// The scenarios of "A story skill uses only .plans in the current folder" in the toolkit-story-skills spec.
const TEST_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SAMPLE_CONFIG = path.join(TEST_DIR, 'sample-config.yaml');

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-data-dir-'));
const withConfig = (text) => {
  const dir = temp();
  fs.writeFileSync(path.join(dir, 'viewer.config.yaml'), text);
  return dir;
};

// Runs fn with VIEWER_CONFIG set, then restores the old value.
function withVariable(value, fn) {
  const old = process.env.VIEWER_CONFIG;
  process.env.VIEWER_CONFIG = value;
  try {
    return fn();
  } finally {
    if (old === undefined) delete process.env.VIEWER_CONFIG;
    else process.env.VIEWER_CONFIG = old;
  }
}

test('the .plans name matches PLANS_DIR of backlog-paths.cjs', () => {
  const { PLANS_DIR: planner } = createRequire(import.meta.url)('../../shared/storage/backlog-paths.ts');
  assert.equal(PLANS_DIR, planner);
});

test('.plans in the current folder is the data folder', () => {
  const cwd = temp();
  fs.mkdirSync(path.join(cwd, '.plans'));
  assert.deepEqual(resolveDataDir({ cwd }), { status: 'found', dataDir: path.join(cwd, '.plans') });
});

test('the variable is ignored: .plans is used although VIEWER_CONFIG names a config file', () => {
  const cwd = temp();
  fs.mkdirSync(path.join(cwd, '.plans'));
  const found = withVariable(SAMPLE_CONFIG, () => resolveDataDir({ cwd }));
  assert.deepEqual(found, { status: 'found', dataDir: path.join(cwd, '.plans') });
});

test('the variable alone finds nothing', () => {
  const cwd = temp();
  const found = withVariable(SAMPLE_CONFIG, () => resolveDataDir({ cwd }));
  assert.deepEqual(found, { status: 'none', cwd });
});

test('a config file alone finds nothing, with codeBase or dataDir', () => {
  for (const text of ['codeBase: ./app\n', 'dataDir: ./backlog-data\n']) {
    const cwd = withConfig(text);
    assert.deepEqual(resolveDataDir({ cwd }), { status: 'none', cwd });
  }
});

test('started in a sub-folder: the parent is not examined and nothing is found', () => {
  const root = temp();
  fs.mkdirSync(path.join(root, '.plans'));
  const sub = path.join(root, 'a', 'b');
  fs.mkdirSync(sub, { recursive: true });
  assert.deepEqual(resolveDataDir({ cwd: sub }), { status: 'none', cwd: sub });
});

test('the message names the current folder and .plans, and not the variable or the config file', () => {
  const empty = temp();
  assert.throws(() => dataDirOrThrow({ cwd: empty }), (err) => {
    assert.ok(err.message.includes(empty));
    assert.ok(err.message.includes(PLANS_DIR));
    assert.match(err.message, /ask/i);
    assert.doesNotMatch(err.message, /VIEWER_CONFIG|viewer\.config/);
    return true;
  });
});

test('.plans is a file: reported with its path, no folder guessed, even with a config beside it', () => {
  const cwd = withConfig('dataDir: ./x\n');
  fs.writeFileSync(path.join(cwd, '.plans'), 'not a folder');
  const found = resolveDataDir({ cwd });
  assert.deepEqual(found, { status: 'error', path: path.join(cwd, '.plans'), problem: 'is a file, not a folder' });
  assert.throws(() => dataDirOrThrow({ cwd }), (err) => {
    assert.ok(err.message.includes(path.join(cwd, '.plans')));
    assert.doesNotMatch(err.message, /VIEWER_CONFIG|viewer\.config/);
    return true;
  });
});

test('dataDirOrThrow returns the .plans folder when it exists', () => {
  const cwd = temp();
  fs.mkdirSync(path.join(cwd, '.plans'));
  assert.equal(dataDirOrThrow({ cwd }), path.join(cwd, '.plans'));
});

test('a fresh code base after init: .plans is found with no yaml present, and its backlog is listed', async () => {
  const { initCodeBase } = createRequire(import.meta.url)('../../backend/storage/project-config.cjs');
  const { listBacklogs } = createRequire(import.meta.url)('../../shared/storage/backlog-paths.ts');
  const codeBase = temp();
  assert.deepEqual((await initCodeBase(codeBase)).created, ['.plans', 'new-backlog']);
  assert.deepEqual(fs.readdirSync(codeBase), ['.plans'], 'init writes no yaml into the code base');
  const found = resolveDataDir({ cwd: codeBase });
  assert.equal(found.status, 'found');
  assert.equal(found.dataDir, path.join(codeBase, PLANS_DIR));
  assert.deepEqual(listBacklogs(found.dataDir), ['new-backlog']);
});
