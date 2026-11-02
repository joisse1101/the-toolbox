// Init, copy, folder check, confinement and saving of the project config. Temp folders only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const pc = createRequire(import.meta.url)('../../logic/storage/project-config.cjs');
const { initFolders, copyData, checkFolder, confineDir, saveConfig, loadConfig, FOLDERS, ROOT } = pc;

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'project-folders-'));
}
function put(dir, rel, text = 'x') {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

// ---- init (3.1)

test('init on an empty folder creates all eight folders', () => {
  const dir = path.join(tmp(), 'data');
  const r = initFolders(dir);
  assert.equal(FOLDERS.length, 8);
  assert.deepEqual(r.created, FOLDERS);
  assert.deepEqual(r.existing, []);
  assert.equal(r.createdDataDir, true);
  for (const f of FOLDERS) assert.ok(fs.statSync(path.join(dir, f)).isDirectory());
});

test('init on a partly prepared folder keeps what is there', () => {
  const dir = tmp();
  put(dir, 'backlogs/iam.csv', 'keep');
  const r = initFolders(dir);
  assert.deepEqual(r.existing, ['backlogs']);
  assert.equal(r.created.length, 7);
  assert.equal(fs.readFileSync(path.join(dir, 'backlogs', 'iam.csv'), 'utf8'), 'keep');
});

test('init a second time creates nothing', () => {
  const dir = tmp();
  initFolders(dir);
  const r = initFolders(dir);
  assert.deepEqual(r.created, []);
  assert.deepEqual(r.existing, FOLDERS);
  assert.equal(r.createdDataDir, false);
});

// ---- copy (3.2)

function source() {
  const s = tmp();
  put(s, 'backlogs/iam.csv', 'backlog');
  put(s, 'reviews/iam.csv', 'review');
  put(s, 'diagrams/iam/slice/UC-slice.md', 'doc');
  fs.mkdirSync(path.join(s, 'logs'));
  return s;
}

test('copy into an empty target copies everything and leaves the source unchanged', () => {
  const s = source();
  const t = path.join(tmp(), 'new');
  const r = copyData(s, t);
  assert.deepEqual(r.copied.sort(), ['backlogs/iam.csv', 'diagrams/iam/slice/UC-slice.md', 'reviews/iam.csv']);
  assert.deepEqual(r.skipped, []);
  assert.equal(r.stopped, undefined);
  assert.equal(fs.readFileSync(path.join(t, 'diagrams', 'iam', 'slice', 'UC-slice.md'), 'utf8'), 'doc');
  assert.ok(fs.statSync(path.join(t, 'logs')).isDirectory());
  assert.equal(fs.readFileSync(path.join(s, 'backlogs', 'iam.csv'), 'utf8'), 'backlog');
});

test('copy keeps a file that already exists in the target and lists it as skipped', () => {
  const s = source();
  const t = tmp();
  put(t, 'backlogs/iam.csv', 'mine');
  const r = copyData(s, t);
  assert.deepEqual(r.skipped, [{ file: 'backlogs/iam.csv', reason: 'exists' }]);
  assert.equal(r.copied.length, 2);
  assert.equal(fs.readFileSync(path.join(t, 'backlogs', 'iam.csv'), 'utf8'), 'mine');
});

test('copy refuses the same folder, a folder inside it and a folder that contains it', () => {
  const s = source();
  assert.match(copyData(s, s).refused, /inside|current/);
  assert.ok(copyData(s, path.join(s, 'sub')).refused);
  assert.equal(fs.existsSync(path.join(s, 'sub')), false);
  const parent = tmp();
  const child = path.join(parent, 'child');
  put(child, 'backlogs/a.csv');
  assert.match(copyData(child, parent).refused, /contains/);
});

test('copy skips a link in the source', (t) => {
  const s = source();
  const outside = tmp();
  put(outside, 'secret.txt');
  try {
    fs.symlinkSync(outside, path.join(s, 'linked'), 'junction');
  } catch (err) {
    return t.skip(`cannot create a junction here: ${err.code}`);
  }
  const target = tmp();
  const r = copyData(s, target);
  assert.deepEqual(r.skipped, [{ file: 'linked', reason: 'link' }]);
  assert.equal(fs.existsSync(path.join(target, 'linked')), false);
  fs.unlinkSync(path.join(s, 'linked')); // removes the junction only
  assert.ok(fs.existsSync(path.join(outside, 'secret.txt')));
});

test('copy stops naming a file it cannot read, and a second run resumes', () => {
  const s = source();
  const t = tmp();
  const locked = (from, to, flags) => {
    if (from.endsWith('iam.csv') && from.includes('reviews')) throw Object.assign(new Error('EBUSY: file is locked'), { code: 'EBUSY' });
    return fs.copyFileSync(from, to, flags);
  };
  const first = copyData(s, t, { copyFile: locked });
  assert.equal(first.stopped.file, 'reviews/iam.csv');
  assert.match(first.stopped.message, /locked/);
  assert.deepEqual(first.copied, ['backlogs/iam.csv', 'diagrams/iam/slice/UC-slice.md']);
  assert.equal(fs.existsSync(path.join(t, 'reviews', 'iam.csv')), false);
  const second = copyData(s, t);
  assert.equal(second.stopped, undefined);
  assert.equal(second.skipped.length, 2);
  assert.deepEqual(second.copied, ['reviews/iam.csv']);
});

// ---- folder check and confinement (3.3)

test('check: missing, empty, has-planner-files', () => {
  const base = tmp();
  assert.equal(checkFolder(path.join(base, 'nope')).status, 'missing');
  assert.equal(checkFolder(base).status, 'empty');
  put(base, 'notes.txt');
  assert.equal(checkFolder(base).status, 'empty');
  fs.mkdirSync(path.join(base, 'lexicons'));
  assert.equal(checkFolder(base).status, 'has-planner-files');
  const b2 = tmp();
  put(b2, 'backlogs/iam.csv');
  assert.equal(checkFolder(b2).status, 'has-planner-files');
});

test('check refuses a relative path, a drive root and a system folder with a reason', () => {
  const rel = checkFolder('..\\elsewhere');
  assert.equal(rel.status, 'refused');
  assert.match(rel.reason, /absolute/);
  const root = checkFolder(path.parse(os.tmpdir()).root);
  assert.equal(root.status, 'refused');
  assert.match(root.reason, /root/);
  const sys = process.platform === 'win32' ? process.env.SystemRoot : '/etc';
  const r = checkFolder(sys);
  assert.equal(r.status, 'refused');
  assert.match(r.reason, /system/);
});

test('check refuses the home folder itself but not a folder inside a temp home', () => {
  const home = tmp();
  assert.equal(confineDir(home, { home }).ok, false);
  assert.equal(confineDir(path.join(home, 'planner-data'), { home }).ok, true);
});

test('check refuses a file and folders in the repository except planner/data', () => {
  const dir = tmp();
  put(dir, 'a.txt');
  assert.match(checkFolder(path.join(dir, 'a.txt')).reason, /file/);
  assert.equal(checkFolder(path.join(ROOT, 'planner', 'logic')).status, 'refused');
  assert.equal(checkFolder(path.join(ROOT, 'planner', 'test', 'sample-data')).status, 'refused');
  assert.equal(confineDir(path.join(ROOT, 'planner', 'data')).ok, true);
  assert.equal(confineDir(path.join(ROOT, 'planner', 'data', 'sub')).ok, true);
});

test('check refuses a junction that leads into planner/logic', (t) => {
  const base = tmp();
  const link = path.join(base, 'looks-fine');
  try {
    fs.symlinkSync(path.join(ROOT, 'planner', 'logic'), link, 'junction');
  } catch (err) {
    return t.skip(`cannot create a junction here: ${err.code}`);
  }
  try {
    const r = checkFolder(link);
    assert.equal(r.status, 'refused');
    assert.match(r.reason, /repository/);
    assert.equal(checkFolder(path.join(link, 'newfolder')).status, 'refused');
  } finally {
    fs.unlinkSync(link); // removes the junction only
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'planner', 'logic', 'storage')));
});

// ---- saving (3.4)

function cfg(text) {
  const dir = tmp();
  const file = path.join(dir, 'planner.config.yaml');
  fs.writeFileSync(file, text);
  return file;
}

test('save keeps a comment the user wrote', () => {
  const data = tmp();
  const file = cfg('# my project\nprojectName: Old # the name\ndataDir: ./somewhere\n');
  const r = saveConfig({ projectName: 'New', dataDir: data }, { file });
  assert.equal(r.projectName, 'New');
  assert.equal(r.dataDir, fs.realpathSync.native(data) === data ? data : path.resolve(data));
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /# my project/);
  assert.match(text, /# the name/);
  assert.equal(loadConfig({ file }).projectName, 'New');
});

test('save creates a missing config file', () => {
  const file = path.join(tmp(), 'sub', 'planner.config.yaml');
  saveConfig({ projectName: 'Fresh' }, { file });
  assert.equal(loadConfig({ file }).projectName, 'Fresh');
});

test('an invalid value leaves the file unchanged', () => {
  const text = '# keep\nprojectName: Old\n';
  const file = cfg(text);
  assert.throws(() => saveConfig({ dataDir: '' }, { file }), /dataDir/);
  assert.throws(() => saveConfig({ dataDir: 42 }, { file }), /dataDir/);
  assert.throws(() => saveConfig({ projectName: 7 }, { file }), /projectName/);
  assert.throws(() => saveConfig({ dataDir: 'relative\\dir' }, { file }), /absolute/);
  assert.throws(() => saveConfig({ dataDir: path.parse(os.tmpdir()).root }, { file }), /root/);
  assert.equal(fs.readFileSync(file, 'utf8'), text);
});

test('a missing folder is refused for a plain save', () => {
  const text = 'projectName: Old\n';
  const file = cfg(text);
  assert.throws(() => saveConfig({ dataDir: path.join(tmp(), 'nope') }, { file }), /init or the copy first/);
  assert.equal(fs.readFileSync(file, 'utf8'), text);
});
