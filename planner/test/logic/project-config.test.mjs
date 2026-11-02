import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const { loadConfig, configPath, DEFAULT_DATA_DIR } = createRequire(import.meta.url)('../../logic/storage/project-config.cjs');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'project-config-'));
}
function write(dir, text) {
  const file = path.join(dir, 'planner.config.yaml');
  fs.writeFileSync(file, text);
  return file;
}

test('config present: name and absolute data directory are read', () => {
  const dir = tmp();
  const abs = path.join(dir, 'planner-data');
  const cfg = loadConfig({ file: write(dir, `projectName: Payments\ndataDir: '${abs}'\n`) });
  assert.equal(cfg.projectName, 'Payments');
  assert.equal(cfg.dataDir, abs);
});

test('relative data directory is resolved against the config file folder', () => {
  const dir = tmp();
  const cfg = loadConfig({ file: write(dir, 'dataDir: ./sub/data\n') });
  assert.equal(cfg.dataDir, path.join(dir, 'sub', 'data'));
});

test('PLANNER_CONFIG names the file that is read', () => {
  const dir = tmp();
  const file = write(dir, 'projectName: Other\n');
  assert.equal(configPath({ PLANNER_CONFIG: file }), file);
  assert.equal(loadConfig({ file: configPath({ PLANNER_CONFIG: file }) }).projectName, 'Other');
  assert.match(configPath({}), /planner[\\/]planner\.config\.yaml$/);
});

test('no config file: defaults, and loading does not fail', () => {
  const cfg = loadConfig({ file: path.join(tmp(), 'missing.yaml') });
  assert.equal(cfg.dataDir, DEFAULT_DATA_DIR);
  assert.equal(cfg.projectName, '');
  assert.match(cfg.dataDir, /planner[\\/]data$/);
});

test('key missing: projectName without dataDir uses the default data directory', () => {
  const cfg = loadConfig({ file: write(tmp(), 'projectName: Payments\n') });
  assert.equal(cfg.projectName, 'Payments');
  assert.equal(cfg.dataDir, DEFAULT_DATA_DIR);
});

test('an empty file loads as the defaults', () => {
  assert.equal(loadConfig({ file: write(tmp(), '') }).dataDir, DEFAULT_DATA_DIR);
});

test('unknown key fails naming the key', () => {
  assert.throws(() => loadConfig({ file: write(tmp(), 'dataFolder: x\n') }), /dataFolder/);
});

test('wrong type fails naming the key', () => {
  assert.throws(() => loadConfig({ file: write(tmp(), 'dataDir: 42\n') }), /dataDir/);
  assert.throws(() => loadConfig({ file: write(tmp(), 'projectName: 7\n') }), /projectName/);
});

test('an empty dataDir fails naming the key', () => {
  assert.throws(() => loadConfig({ file: write(tmp(), "dataDir: ''\n") }), /dataDir/);
});

test('malformed YAML fails naming the file', () => {
  const file = write(tmp(), 'projectName: [unclosed\n  : : x\n');
  assert.throws(() => loadConfig({ file }), (err) => err.message.includes(file));
});
