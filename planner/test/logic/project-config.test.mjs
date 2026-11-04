import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const { PLANS_DIR } = createRequire(import.meta.url)('../../logic/storage/backlog-paths.cjs');
const { loadConfig, saveConfig, configPath, DEFAULT_DATA_DIR } = createRequire(import.meta.url)('../../logic/storage/project-config.cjs');

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

test('code base present: the data directory is <codeBase>/.plans', () => {
  const dir = tmp();
  const abs = path.join(dir, 'payments');
  const cfg = loadConfig({ file: write(dir, `codeBase: '${abs}'\n`) });
  assert.equal(PLANS_DIR, '.plans');
  assert.equal(cfg.codeBase, abs);
  assert.equal(cfg.dataDir, path.join(abs, '.plans'));
});

test('relative code base is resolved against the config file folder', () => {
  const dir = tmp();
  const cfg = loadConfig({ file: write(dir, 'codeBase: ./code/app\n') });
  assert.equal(cfg.dataDir, path.join(dir, 'code', 'app', '.plans'));
});

test('both folder keys fail naming both', () => {
  assert.throws(() => loadConfig({ file: write(tmp(), 'codeBase: a\ndataDir: b\n') }), (err) => /codeBase/.test(err.message) && /dataDir/.test(err.message));
});

test('an empty or non-text codeBase fails naming the key', () => {
  assert.throws(() => loadConfig({ file: write(tmp(), "codeBase: ''\n") }), /codeBase/);
  assert.throws(() => loadConfig({ file: write(tmp(), 'codeBase: 5\n') }), /codeBase/);
});

test('data directory config and no config keep working', () => {
  const dir = tmp();
  const cfg = loadConfig({ file: write(dir, 'dataDir: ./d\n') });
  assert.equal(cfg.dataDir, path.join(dir, 'd'));
  assert.equal(cfg.codeBase, null);
  assert.equal(loadConfig({ file: path.join(dir, 'none.yaml') }).dataDir, DEFAULT_DATA_DIR);
});

test('saveConfig writes codeBase, removes dataDir, keeps comments: one folder key remains', () => {
  const dir = tmp();
  const code = path.join(dir, 'code');
  fs.mkdirSync(code);
  const file = write(dir, `# my note
projectName: P # name
dataDir: ./d
`);
  const cfg = saveConfig({ codeBase: code }, { file });
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /# my note/);
  assert.match(text, /# name/);
  assert.equal((text.match(/^(codeBase|dataDir):/gm) || []).length, 1);
  assert.doesNotMatch(text, /dataDir/);
  assert.equal(cfg.dataDir, path.join(code, '.plans'));
  assert.equal(loadConfig({ file }).codeBase, code);
});

test('saveConfig of a dataDir removes codeBase; bad code bases are refused and write nothing', () => {
  const dir = tmp();
  const data = path.join(dir, 'data');
  fs.mkdirSync(data);
  const file = write(dir, `codeBase: ${dir.split(path.sep).join('/')}\n`);
  saveConfig({ dataDir: data }, { file });
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /codeBase/);
  assert.equal(loadConfig({ file }).dataDir, data);
  fs.writeFileSync(file, `codeBase: ${dir.split(path.sep).join('/')}\n`);
  const before = fs.readFileSync(file, 'utf8');
  assert.throws(() => saveConfig({ codeBase: 'relative' }, { file }), /absolute/);
  assert.throws(() => saveConfig({ codeBase: path.join(dir, 'missing') }, { file }), /does not exist/);
  assert.throws(() => saveConfig({ codeBase: '' }, { file }), /codeBase/);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('the example config file parses with loadConfig', () => {
  const example = path.resolve(import.meta.dirname, '..', '..', 'planner.config.example.yaml');
  const cfg = loadConfig({ file: example });
  assert.equal(cfg.projectName, 'My project');
  assert.equal(cfg.dataDir, path.join(path.dirname(example), 'data'));
});
