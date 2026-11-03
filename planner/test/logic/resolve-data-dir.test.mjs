import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDataDir, parseFlatConfig } from '../../logic/skill-support/resolve-data-dir.mjs';

// The scenarios of "The data folder is found without the planner" in the toolkit-story-skills spec.
const TEST_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SAMPLE_CONFIG = path.join(TEST_DIR, 'sample-config.yaml');
const SAMPLE_DATA = path.join(TEST_DIR, 'sample-data');

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-data-dir-'));
const withConfig = (text) => {
  const dir = temp();
  fs.writeFileSync(path.join(dir, 'planner.config.yaml'), text);
  return dir;
};

test('variable wins: PLANNER_CONFIG beats a planner.config.yaml in the current folder', () => {
  const cwd = withConfig('dataDir: ./elsewhere\n');
  const found = resolveDataDir({ env: { PLANNER_CONFIG: SAMPLE_CONFIG }, cwd });
  assert.deepEqual(found, { status: 'found', dataDir: SAMPLE_DATA, configFile: SAMPLE_CONFIG });
});

test('a relative PLANNER_CONFIG is taken from the current folder', () => {
  const found = resolveDataDir({ env: { PLANNER_CONFIG: 'sample-config.yaml' }, cwd: TEST_DIR });
  assert.equal(found.dataDir, SAMPLE_DATA);
});

test('config found in a parent folder: the nearest planner.config.yaml upward, relative dataDir against its folder', () => {
  const root = withConfig('projectName: P\ndataDir: ./backlog-data\n');
  const sub = path.join(root, 'a', 'b');
  fs.mkdirSync(sub, { recursive: true });
  const found = resolveDataDir({ env: {}, cwd: sub });
  assert.equal(found.status, 'found');
  assert.equal(found.dataDir, path.join(root, 'backlog-data'));
  assert.equal(found.configFile, path.join(root, 'planner.config.yaml'));
});

test('the nearest config wins over one further up', () => {
  const root = withConfig('dataDir: ./outer\n');
  const inner = path.join(root, 'inner');
  fs.mkdirSync(inner);
  fs.writeFileSync(path.join(inner, 'planner.config.yaml'), 'dataDir: ./nearer\n');
  assert.equal(resolveDataDir({ env: {}, cwd: inner }).dataDir, path.join(inner, 'nearer'));
});

test('an absolute dataDir is used as it is', () => {
  const abs = path.join(temp(), 'abs-data');
  const cwd = withConfig(`dataDir: "${abs.replace(/\\/g, '/')}"\n`);
  assert.equal(resolveDataDir({ env: {}, cwd }).dataDir, path.resolve(abs));
});

test('no config: asks the user and names no folder', () => {
  const cwd = temp(); // a temp folder has no planner.config.yaml above it
  assert.deepEqual(resolveDataDir({ env: {}, cwd }), { status: 'ask' });
});

test('unreadable config: no dataDir key is reported with the file', () => {
  const cwd = withConfig('projectName: P\n');
  const found = resolveDataDir({ env: {}, cwd });
  assert.equal(found.status, 'error');
  assert.equal(found.configFile, path.join(cwd, 'planner.config.yaml'));
  assert.match(found.problem, /no `dataDir` key/);
  assert.equal('dataDir' in found, false);
});

test('unreadable config: a file that is not flat key: value names the line', () => {
  const cwd = withConfig('projectName: P\ndataDir:\n  - a\n');
  const found = resolveDataDir({ env: {}, cwd });
  assert.equal(found.status, 'error');
  assert.match(found.problem, /line 3 is not a flat "key: value" line/);
});

test('unreadable config: PLANNER_CONFIG naming a missing file is an error, not a fallback', () => {
  const cwd = withConfig('dataDir: ./x\n');
  const found = resolveDataDir({ env: { PLANNER_CONFIG: path.join(cwd, 'missing.yaml') }, cwd });
  assert.equal(found.status, 'error');
  assert.match(found.problem, /cannot be read/);
});

test('parseFlatConfig skips comments and blank lines, trims trailing comments and unquotes', () => {
  const keys = parseFlatConfig('# top\n\nprojectName: "My: App" # name\ndataDir: ./d # folder\nempty:\n');
  assert.deepEqual(keys, { projectName: 'My: App', dataDir: './d', empty: '' });
});
