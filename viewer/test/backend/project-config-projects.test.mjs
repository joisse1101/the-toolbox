import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const { loadConfig, saveConfig, DEFAULT_DATA_DIR } = createRequire(import.meta.url)('../../logic/storage/project-config.cjs');

// Temp folders live under the project's .scratch/ (git-ignored) and are removed afterwards.
const SCRATCH = path.resolve(import.meta.dirname, '..', '..', '..', '.scratch', 'project-config-projects');
fs.mkdirSync(SCRATCH, { recursive: true });
const made = [];
after(() => { for (const d of made) fs.rmSync(d, { recursive: true }); });

function tmp() {
  const dir = fs.mkdtempSync(path.join(SCRATCH, 't-'));
  made.push(dir);
  return dir;
}
function write(dir, text) {
  const file = path.join(dir, 'planner.config.yaml');
  fs.writeFileSync(file, text);
  return file;
}
function folder(dir, name) {
  const p = path.join(dir, name);
  fs.mkdirSync(p, { recursive: true });
  return p;
}
// The scratch folder lies inside the repository, which confineDir refuses, so the repository root is moved elsewhere.
const confine = { root: path.join(path.parse(SCRATCH).root, 'no-such-repo-root') };
const q = (p) => `'${p}'`;

// Invalid config fails at load

test('projects that is not a list fails naming projects', () => {
  assert.throws(() => loadConfig({ file: write(tmp(), 'projects: text\n') }), /"projects"/);
  assert.throws(() => loadConfig({ file: write(tmp(), 'projects:\n') }), /"projects"/);
  assert.throws(() => loadConfig({ file: write(tmp(), 'projects:\n  a: 1\n') }), /"projects"/);
});

test('an entry that is not an object fails naming projects and its position', () => {
  assert.throws(() => loadConfig({ file: write(tmp(), 'projects:\n  - dataDir: a\n  - just text\n') }), /"projects" entry 1/);
  assert.throws(() => loadConfig({ file: write(tmp(), 'projects:\n  - [a]\n') }), /"projects" entry 0/);
});

test('an entry with an unknown key fails naming the key and position', () => {
  assert.throws(() => loadConfig({ file: write(tmp(), 'projects:\n  - dataDir: a\n    path: b\n') }), (e) => /entry 0/.test(e.message) && /path/.test(e.message));
});

test('an entry with both or neither folder key fails naming projects and position', () => {
  assert.throws(() => loadConfig({ file: write(tmp(), 'projects:\n  - dataDir: a\n  - codeBase: b\n    dataDir: c\n') }), (e) => /"projects" entry 1/.test(e.message) && /codeBase/.test(e.message) && /dataDir/.test(e.message));
  assert.throws(() => loadConfig({ file: write(tmp(), 'projects:\n  - name: x\n') }), /"projects" entry 0/);
});

test('an entry with an empty or non-text path fails naming projects and position', () => {
  assert.throws(() => loadConfig({ file: write(tmp(), "projects:\n  - dataDir: ''\n") }), (e) => /entry 0/.test(e.message) && /dataDir/.test(e.message));
  assert.throws(() => loadConfig({ file: write(tmp(), "projects:\n  - codeBase: '  '\n") }), (e) => /entry 0/.test(e.message) && /codeBase/.test(e.message));
  assert.throws(() => loadConfig({ file: write(tmp(), 'projects:\n  - dataDir: 5\n') }), /entry 0/);
});

test('an entry name that is not text fails naming projects and position', () => {
  assert.throws(() => loadConfig({ file: write(tmp(), 'projects:\n  - dataDir: a\n    name: 4\n') }), (e) => /entry 0/.test(e.message) && /name/.test(e.message));
});

test('a valid list loads, with an empty list too', () => {
  const dir = tmp();
  const cfg = loadConfig({ file: write(dir, 'projects:\n  - name: A\n    dataDir: ./a\n  - codeBase: ./b\n') });
  assert.equal(cfg.projects.filter((p) => !p.synthetic).length, 2);
  assert.equal(loadConfig({ file: write(dir, 'projects: []\n') }).projects.filter((p) => !p.synthetic).length, 0);
});

// loadConfig result

test('legacy config without a list shows the active path as one synthetic entry', () => {
  const dir = tmp();
  const cfg = loadConfig({ file: write(dir, 'dataDir: ./d\n') });
  assert.equal(cfg.projects.length, 1);
  assert.equal(cfg.activeProject, 0);
  assert.equal(cfg.projects[0].dataDir, path.join(dir, 'd'));
  assert.equal(cfg.projects[0].synthetic, true);
});

test('no config file gives one synthetic entry for the default data folder', () => {
  const cfg = loadConfig({ file: path.join(tmp(), 'missing.yaml') });
  assert.equal(cfg.projects.length, 1);
  assert.equal(cfg.projects[0].dataDir, DEFAULT_DATA_DIR);
  assert.equal(cfg.activeProject, 0);
});

test('relative paths in entries resolve against the config folder, and .plans applies to a code base', () => {
  const dir = tmp();
  const cfg = loadConfig({ file: write(dir, 'dataDir: ./a\nprojects:\n  - name: A\n    dataDir: ./a\n  - name: B\n    codeBase: ./code/b\n') });
  assert.deepEqual(cfg.projects.map((p) => p.dataDir), [path.join(dir, 'a'), path.join(dir, 'code', 'b', '.plans')]);
  assert.equal(cfg.projects[1].codeBase, path.join(dir, 'code', 'b'));
  assert.equal(cfg.projects[0].codeBase, null);
  assert.equal(cfg.projects[1].name, 'B');
});

test('the active project is matched by resolved path, relative against absolute', () => {
  const dir = tmp();
  const abs = path.join(dir, 'code', 'b');
  const cfg = loadConfig({ file: write(dir, `codeBase: ./code/b\nprojects:\n  - dataDir: ./a\n  - codeBase: ${q(abs)}\n`) });
  assert.equal(cfg.projects.length, 2);
  assert.equal(cfg.activeProject, 1);
});

test('an active path missing from the list is added as a synthetic entry and marked active', () => {
  const dir = tmp();
  const cfg = loadConfig({ file: write(dir, 'dataDir: ./z\nprojects:\n  - dataDir: ./a\n') });
  assert.equal(cfg.projects.length, 2);
  assert.equal(cfg.activeProject, 1);
  assert.equal(cfg.projects[1].synthetic, true);
});

// saveConfig: add and replace

test('first add writes the active path into the list, then the new entry, and keeps a comment', () => {
  const dir = tmp();
  const a = folder(dir, 'a');
  const b = folder(dir, 'b');
  const file = write(dir, `# my note\nprojectName: P # name\ndataDir: ${q(a)}\n`);
  const cfg = saveConfig({ addProject: { dataDir: b, name: 'B' }, dataDir: b }, { file, confine });
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /# my note/);
  assert.match(text, /# name/);
  assert.deepEqual(cfg.projects.map((p) => p.dataDir), [a, b]);
  assert.equal(cfg.projects[1].name, 'B');
  assert.equal(cfg.activeProject, 1);
  assert.equal(cfg.dataDir, b);
});

test('first add on a config with no file seeds the default data folder', () => {
  const dir = tmp();
  const b = folder(dir, 'b');
  const file = path.join(dir, 'new.yaml');
  const cfg = saveConfig({ addProject: { dataDir: b }, dataDir: b }, { file, confine });
  assert.deepEqual(cfg.projects.map((p) => p.dataDir), [DEFAULT_DATA_DIR, b]);
});

test('adding a code base entry stores codeBase and the active key follows', () => {
  const dir = tmp();
  const a = folder(dir, 'a');
  const code = folder(dir, 'code');
  const file = write(dir, `dataDir: ${q(a)}\n`);
  const cfg = saveConfig({ addProject: { codeBase: code }, codeBase: code }, { file, confine });
  assert.equal(cfg.projects[1].codeBase, code);
  assert.equal(cfg.dataDir, path.join(code, '.plans'));
  assert.doesNotMatch(fs.readFileSync(file, 'utf8').replace(/projects:[\s\S]*/, ''), /dataDir/);
});

test('a later add appends one entry, and a project already listed is not added twice', () => {
  const dir = tmp();
  const a = folder(dir, 'a');
  const b = folder(dir, 'b');
  const c = folder(dir, 'c');
  const file = write(dir, `dataDir: ${q(a)}\n`);
  saveConfig({ addProject: { dataDir: b } }, { file, confine });
  saveConfig({ addProject: { dataDir: c } }, { file, confine });
  const cfg = saveConfig({ addProject: { dataDir: b } }, { file, confine });
  assert.deepEqual(cfg.projects.map((p) => p.dataDir), [a, b, c]);
});

test('a refused change leaves the file byte-identical', () => {
  const dir = tmp();
  const a = folder(dir, 'a');
  const file = write(dir, `# keep\ndataDir: ${q(a)}\nprojects:\n  - dataDir: ${q(a)}\n`);
  const before = fs.readFileSync(file);
  assert.throws(() => saveConfig({ addProject: { dataDir: path.join(dir, 'missing') } }, { file, confine }), /does not exist/);
  assert.throws(() => saveConfig({ addProject: { codeBase: 'relative' } }, { file, confine }), /absolute/);
  assert.throws(() => saveConfig({ addProject: { codeBase: a, dataDir: a } }, { file, confine }), /exactly one/);
  assert.throws(() => saveConfig({ addProject: { dataDir: a, name: 5 } }, { file, confine }), /name/);
  assert.throws(() => saveConfig({ addProject: { dataDir: '' } }, { file, confine }), /dataDir/);
  assert.throws(() => saveConfig({ replaceActive: true }, { file, confine }), /replaceActive/);
  assert.throws(() => saveConfig({ replaceActive: true, codeBase: path.join(dir, 'missing') }, { file, confine }), /does not exist/);
  assert.ok(fs.readFileSync(file).equals(before));
});

test('replace changes the active entry path and adds no second entry', () => {
  const dir = tmp();
  const a = folder(dir, 'a');
  const b = folder(dir, 'b');
  const code = folder(dir, 'code');
  const file = write(dir, `# note\nprojectName: P\ndataDir: ${q(a)}\nprojects:\n  - name: A # mine\n    dataDir: ${q(a)}\n  - dataDir: ${q(b)}\n`);
  let cfg = saveConfig({ replaceActive: true, codeBase: code }, { file, confine });
  assert.equal(cfg.projects.length, 2);
  assert.equal(cfg.projects[0].codeBase, code);
  assert.equal(cfg.projects[0].name, 'A');
  assert.equal(cfg.projects[1].dataDir, b);
  assert.equal(cfg.activeProject, 0);
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /# note/);
  assert.match(text, /# mine/);
  cfg = saveConfig({ replaceActive: true, dataDir: a }, { file, confine });
  assert.equal(cfg.projects.length, 2);
  assert.equal(cfg.projects[0].dataDir, a);
  assert.equal(cfg.projects[0].codeBase, null);
});

test('replace on a config with no list changes the active key and does not create a list', () => {
  const dir = tmp();
  const a = folder(dir, 'a');
  const b = folder(dir, 'b');
  const file = write(dir, `dataDir: ${q(a)}\n`);
  const cfg = saveConfig({ replaceActive: true, dataDir: b }, { file, confine });
  assert.doesNotMatch(fs.readFileSync(file, "utf8"), /^projects:/m);
  assert.equal(cfg.projects.length, 1);
  assert.equal(cfg.dataDir, b);
});

test('a config with no projects key is rewritten as before by other saves', () => {
  const dir = tmp();
  const file = write(dir, 'projectName: P\n');
  saveConfig({ projectName: 'Q' }, { file, confine });
  assert.equal(fs.readFileSync(file, 'utf8'), 'projectName: Q\n');
});

test('the example config still loads, and its documented projects block parses once uncommented', () => {
  const example = path.resolve(import.meta.dirname, '..', '..', 'planner.config.example.yaml');
  const text = fs.readFileSync(example, 'utf8');
  assert.match(text, /projects/);
  assert.equal(loadConfig({ file: example }).projects.length, 1);
  const uncommented = text.split('\n').map((l) => l.replace(/^# (projects:|  - |    )/, '$1')).join('\n');
  const dir = tmp();
  const cfg = loadConfig({ file: write(dir, uncommented) });
  assert.equal(cfg.projects.filter((p) => !p.synthetic).length, 2);
});
