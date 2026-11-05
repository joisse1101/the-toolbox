import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolveDataDir, dataDirOrThrow, parseFlatConfig, PLANS_DIR } from '../../logic/skill-support/resolve-data-dir.mjs';

// The scenarios of "A story skill finds the data folder in the current folder" in the toolkit-story-skills spec.
const TEST_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SAMPLE_CONFIG = path.join(TEST_DIR, 'sample-config.yaml');
const SAMPLE_DATA = path.join(TEST_DIR, 'sample-data');

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-data-dir-'));
const withConfig = (text) => {
  const dir = temp();
  fs.writeFileSync(path.join(dir, 'planner.config.yaml'), text);
  return dir;
};

test('the .plans name matches PLANS_DIR of backlog-paths.cjs', () => {
  const { PLANS_DIR: planner } = createRequire(import.meta.url)('../../logic/storage/backlog-paths.cjs');
  assert.equal(PLANS_DIR, planner);
});

test('variable wins: PLANNER_CONFIG beats a .plans folder in the current folder', () => {
  const cwd = temp();
  fs.mkdirSync(path.join(cwd, '.plans'));
  const found = resolveDataDir({ env: { PLANNER_CONFIG: SAMPLE_CONFIG }, cwd });
  assert.deepEqual(found, { status: 'found', dataDir: SAMPLE_DATA, configFile: SAMPLE_CONFIG });
});

test('variable wins: PLANNER_CONFIG beats a planner.config.yaml in the current folder', () => {
  const cwd = withConfig('dataDir: ./elsewhere\n');
  assert.equal(resolveDataDir({ env: { PLANNER_CONFIG: SAMPLE_CONFIG }, cwd }).dataDir, SAMPLE_DATA);
});

test('a relative PLANNER_CONFIG is taken from the current folder', () => {
  const found = resolveDataDir({ env: { PLANNER_CONFIG: 'sample-config.yaml' }, cwd: TEST_DIR });
  assert.equal(found.dataDir, SAMPLE_DATA);
});

test('.plans in the current folder is the data folder', () => {
  const cwd = temp();
  fs.mkdirSync(path.join(cwd, '.plans'));
  assert.deepEqual(resolveDataDir({ env: {}, cwd }), { status: 'found', dataDir: path.join(cwd, '.plans'), configFile: null });
});

test('.plans wins over a planner.config.yaml in the same folder', () => {
  const cwd = withConfig('dataDir: ./other\n');
  fs.mkdirSync(path.join(cwd, '.plans'));
  assert.equal(resolveDataDir({ env: {}, cwd }).dataDir, path.join(cwd, '.plans'));
});

test('config in the current folder with codeBase: that code base\'s .plans, relative value against the config folder', () => {
  const cwd = withConfig('projectName: P\ncodeBase: ./app\n');
  const found = resolveDataDir({ env: {}, cwd });
  assert.deepEqual(found, { status: 'found', dataDir: path.join(cwd, 'app', '.plans'), configFile: path.join(cwd, 'planner.config.yaml') });
});

test('config in the current folder with dataDir: relative value against the config folder', () => {
  const cwd = withConfig('projectName: P\ndataDir: ./backlog-data\n');
  assert.equal(resolveDataDir({ env: {}, cwd }).dataDir, path.join(cwd, 'backlog-data'));
});

test('an absolute dataDir is used as it is', () => {
  const abs = path.join(temp(), 'abs-data');
  const cwd = withConfig(`dataDir: "${abs.replace(/\\/g, '/')}"\n`);
  assert.equal(resolveDataDir({ env: {}, cwd }).dataDir, path.resolve(abs));
});

test('started in a sub-folder: the parent is not examined and nothing is found', () => {
  const root = withConfig('codeBase: .\n');
  fs.mkdirSync(path.join(root, '.plans'));
  const sub = path.join(root, 'a', 'b');
  fs.mkdirSync(sub, { recursive: true });
  assert.deepEqual(resolveDataDir({ env: {}, cwd: sub }), { status: 'none', cwd: sub });
});

test('nothing in the current folder: reports none and names the folder', () => {
  const cwd = temp();
  assert.deepEqual(resolveDataDir({ env: {}, cwd }), { status: 'none', cwd });
});

test('unreadable config: both codeBase and dataDir is reported with the file', () => {
  const cwd = withConfig('codeBase: ./a\ndataDir: ./b\n');
  const found = resolveDataDir({ env: {}, cwd });
  assert.equal(found.status, 'error');
  assert.equal(found.configFile, path.join(cwd, 'planner.config.yaml'));
  assert.match(found.problem, /both a `codeBase` and a `dataDir`/);
  assert.equal('dataDir' in found, false);
});

test('unreadable config: neither key is reported with the file', () => {
  const cwd = withConfig('projectName: P\n');
  const found = resolveDataDir({ env: {}, cwd });
  assert.equal(found.status, 'error');
  assert.match(found.problem, /neither a `codeBase` nor a `dataDir`/);
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

test('.plans is a file: reported, no folder guessed, even with a config beside it', () => {
  const cwd = withConfig('dataDir: ./x\n');
  fs.writeFileSync(path.join(cwd, '.plans'), 'not a folder');
  const found = resolveDataDir({ env: {}, cwd });
  assert.deepEqual(found, { status: 'error', configFile: path.join(cwd, '.plans'), problem: 'is a file, not a folder' });
});

test('parseFlatConfig skips comments and blank lines, trims trailing comments and unquotes', () => {
  const keys = parseFlatConfig('# top\n\nprojectName: "My: App" # name\ndataDir: ./d # folder\nempty:\n');
  assert.deepEqual(keys, { projectName: 'My: App', dataDir: './d', empty: '' });
});

test('dataDirOrThrow returns the folder, and otherwise throws a message that says what to do', () => {
  assert.equal(dataDirOrThrow({ env: { PLANNER_CONFIG: SAMPLE_CONFIG }, cwd: temp() }), SAMPLE_DATA);
  const empty = temp();
  assert.throws(() => dataDirOrThrow({ env: {}, cwd: empty }), (err) => err.message.includes(empty) && /parent folders are not searched/.test(err.message) && /ask/i.test(err.message));
  const cwd = withConfig('projectName: P\n');
  assert.throws(() => dataDirOrThrow({ env: {}, cwd }), (err) => err.message.includes(path.join(cwd, 'planner.config.yaml')) && /neither/.test(err.message));
});

test('a fresh code base after init: .plans is found with no yaml present, and its backlog is listed', async () => {
  const { initCodeBase } = createRequire(import.meta.url)('../../logic/storage/project-config.cjs');
  const { listBacklogs } = createRequire(import.meta.url)('../../logic/storage/backlog-paths.cjs');
  const codeBase = temp();
  assert.deepEqual((await initCodeBase(codeBase)).created, ['.plans', 'new-backlog']);
  assert.deepEqual(fs.readdirSync(codeBase), ['.plans'], 'init writes no yaml into the code base');
  const found = resolveDataDir({ env: {}, cwd: codeBase });
  assert.equal(found.status, 'found');
  assert.equal(found.configFile, null);
  assert.equal(found.dataDir, path.join(codeBase, PLANS_DIR));
  assert.deepEqual(listBacklogs(found.dataDir), ['new-backlog']);
});
