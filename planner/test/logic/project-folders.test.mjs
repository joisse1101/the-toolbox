// Init, copy, folder check, confinement and saving of the project config. Temp folders only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const pc = createRequire(import.meta.url)('../../logic/storage/project-config.cjs');
const { initFolders, copyData, migrateOlderLayout, checkFolder, confineDir, saveConfig, loadConfig, FOLDERS, ROOT } = pc;

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'project-folders-'));
}
function put(dir, rel, text = 'x') {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

// ---- init (3.1)

test('init on an empty folder creates the data folder and only logs', () => {
  const dir = path.join(tmp(), 'data');
  const r = initFolders(dir);
  assert.deepEqual(FOLDERS, ['logs']);
  assert.deepEqual(r.created, ['logs']);
  assert.deepEqual(r.existing, []);
  assert.equal(r.createdDataDir, true);
  assert.deepEqual(fs.readdirSync(dir), ['logs']);
});

test('init on a folder that holds a backlog keeps it and creates logs', () => {
  const dir = tmp();
  put(dir, 'iam/user-stories.csv', 'keep');
  const r = initFolders(dir);
  assert.deepEqual(r.existing, []);
  assert.deepEqual(r.created, ['logs']);
  assert.equal(fs.readFileSync(path.join(dir, 'iam', 'user-stories.csv'), 'utf8'), 'keep');
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

test('copy leaves out any backups folder, at any depth, without listing it as skipped', () => {
  const s = source();
  put(s, 'backups/iam.csv/2026-01-01_000000/backlogs/iam.csv', 'old');
  put(s, 'iam/Backups/x.csv', 'old');
  put(s, 'iam/user-stories.csv', 'kept');
  const t = path.join(tmp(), 'new');
  const r = copyData(s, t);
  assert.deepEqual(r.copied.sort(), ['backlogs/iam.csv', 'diagrams/iam/slice/UC-slice.md', 'iam/user-stories.csv', 'reviews/iam.csv']);
  assert.deepEqual(r.skipped, []);
  assert.equal(fs.existsSync(path.join(t, 'backups')), false);
  assert.equal(fs.existsSync(path.join(t, 'iam', 'Backups')), false);
  assert.equal(fs.readFileSync(path.join(s, 'backups', 'iam.csv', '2026-01-01_000000', 'backlogs', 'iam.csv'), 'utf8'), 'old', 'the source is unchanged');
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

// ---- migration of the older layout (mock tree built here; temp folders only)

function older() {
  const d = tmp();
  put(d, 'backlogs/iam.csv', 'backlog');
  put(d, 'reviews/iam.csv', 'review');
  put(d, 'reviews/iam.csv.decided', 'decided');
  put(d, 'proposals/iam.csv', 'proposals');
  put(d, 'lexicons/iam.csv', 'lexicon');
  put(d, 'lexicon-suggestions/iam.csv', 'suggestions');
  put(d, 'diagrams/iam/UC-login/UC-login.md', 'doc');
  put(d, 'diagrams/iam/UC-login/source.json', '{}');
  put(d, 'diagrams/iam/repo.json', '{"path":"x"}');
  put(d, 'diagrams/iam/context-map.json', '{}');
  put(d, 'diagrams/iam/context-map.md', 'map');
  put(d, 'backlogs/pay.csv', 'pay');
  return d;
}
const snapshot = (dir, names) => Object.fromEntries(names.map((n) => [n, fs.readFileSync(path.join(dir, n), 'utf8')]));

test('migrate copies each backlog into its folder and leaves the older files unchanged', () => {
  const d = older();
  const before = fs.readdirSync(d, { recursive: true }).sort();
  const r = migrateOlderLayout(d);
  assert.deepEqual(r.failed, []);
  assert.deepEqual(r.skipped, []);
  assert.deepEqual(r.copied.sort(), [
    'iam/context-map.json', 'iam/context-map.md', 'iam/lexicon.csv', 'iam/lexicon/lexicon-suggestions.csv', 'iam/repo.json',
    'iam/slices/UC-login/UC-login.md', 'iam/slices/UC-login/source.json', 'iam/user-stories.csv',
    'iam/user-stories/proposals.csv', 'iam/user-stories/review.csv', 'iam/user-stories/review.csv.decided', 'pay/user-stories.csv',
  ]);
  assert.deepEqual(snapshot(d, ['iam/user-stories.csv', 'iam/user-stories/review.csv.decided', 'iam/slices/UC-login/UC-login.md', 'iam/repo.json']),
    { 'iam/user-stories.csv': 'backlog', 'iam/user-stories/review.csv.decided': 'decided', 'iam/slices/UC-login/UC-login.md': 'doc', 'iam/repo.json': '{"path":"x"}' });
  assert.deepEqual(fs.readdirSync(d, { recursive: true }).filter((n) => before.includes(n)).sort(), before, 'every older path is still there');
  assert.equal(fs.readFileSync(path.join(d, 'backlogs', 'iam.csv'), 'utf8'), 'backlog');
  assert.deepEqual(checkFolder(d).status, 'has-planner-files');
});

test('migrate lists a file with no backlog as skipped and creates nothing for it', () => {
  const d = older();
  put(d, 'reviews/ghost.csv', 'g');
  put(d, 'diagrams/ghost/UC-x/UC-x.md', 'g');
  put(d, 'proposals/notes.txt', 'n');
  const r = migrateOlderLayout(d);
  assert.deepEqual(r.skipped.map((s) => s.file).sort(), ['diagrams/ghost/UC-x/UC-x.md', 'proposals/notes.txt', 'reviews/ghost.csv']);
  assert.ok(r.skipped.every((s) => s.reason));
  assert.equal(fs.existsSync(path.join(d, 'ghost')), false);
  assert.equal(fs.existsSync(path.join(d, 'notes.txt')), false);
});

test('migrate keeps a file that already exists, lists it as skipped, and copies the rest of the backlog', () => {
  const d = older();
  put(d, 'iam/user-stories.csv', 'mine');
  const r = migrateOlderLayout(d);
  assert.deepEqual(r.skipped, [{ file: 'iam/user-stories.csv', reason: 'exists' }]);
  assert.equal(fs.readFileSync(path.join(d, 'iam', 'user-stories.csv'), 'utf8'), 'mine');
  assert.ok(r.copied.includes('iam/user-stories/review.csv'));
  const again = migrateOlderLayout(d);
  assert.deepEqual(again.copied, [], 'a second run copies nothing');
  assert.deepEqual(again.failed, []);
});

test('migrate leaves out a backups folder at any depth without listing it', () => {
  const d = older();
  put(d, 'backups/iam.csv/2026-01-01_000000/backlogs/iam.csv', 'old');
  put(d, 'diagrams/iam/Backups/x.md', 'old');
  put(d, 'diagrams/iam/UC-login/backups/y.md', 'old');
  const r = migrateOlderLayout(d);
  assert.equal(r.copied.some((f) => /backups/i.test(f)), false);
  assert.equal(r.skipped.some((s) => /backups/i.test(s.file)), false);
  assert.equal(fs.existsSync(path.join(d, 'iam', 'slices', 'UC-login', 'backups')), false);
  assert.equal(fs.existsSync(path.join(d, 'iam', 'Backups')), false);
});

test('migrate reports a copy that does not read back the same as failed, removes that copy and keeps the older file', () => {
  const d = older();
  const corrupt = (from, to, flags) => {
    fs.copyFileSync(from, to, flags);
    if (from.includes('reviews') && from.endsWith('iam.csv')) fs.writeFileSync(to, 'garbled');
  };
  const r = migrateOlderLayout(d, { copyFile: corrupt });
  assert.equal(r.failed.length, 1);
  assert.equal(r.failed[0].file, 'reviews/iam.csv');
  assert.match(r.failed[0].message, /read back/);
  assert.equal(r.copied.includes('iam/user-stories/review.csv'), false);
  assert.equal(fs.existsSync(path.join(d, 'iam', 'user-stories', 'review.csv')), false, 'the bad copy is removed so a rerun can retry');
  assert.equal(fs.readFileSync(path.join(d, 'reviews', 'iam.csv'), 'utf8'), 'review');
  assert.ok(r.copied.includes('iam/user-stories.csv'), 'the other files are still copied');
  const retry = migrateOlderLayout(d);
  assert.deepEqual(retry.copied, ['iam/user-stories/review.csv']);
});

test('migrate reports a file it cannot copy as failed and keeps going', () => {
  const d = older();
  const locked = (from, to, flags) => {
    if (from.includes('lexicons')) throw Object.assign(new Error('EBUSY: file is locked'), { code: 'EBUSY' });
    return fs.copyFileSync(from, to, flags);
  };
  const r = migrateOlderLayout(d, { copyFile: locked });
  assert.deepEqual(r.failed.map((f) => f.file), ['lexicons/iam.csv']);
  assert.match(r.failed[0].message, /locked/);
  assert.ok(r.copied.includes('pay/user-stories.csv'));
});

test('migrate refuses a data folder that does not exist', () => {
  assert.ok(migrateOlderLayout(path.join(tmp(), 'nope')).refused);
});

// ---- folder check and confinement (3.3)

test('check: missing, empty, older-layout, has-planner-files', () => {
  const base = tmp();
  assert.equal(checkFolder(path.join(base, 'nope')).status, 'missing');
  assert.equal(checkFolder(base).status, 'empty');
  put(base, 'notes.txt');
  fs.mkdirSync(path.join(base, 'logs'));
  put(base, 'plain-folder/x.csv');
  assert.equal(checkFolder(base).status, 'empty', 'logs, a loose file and a folder without user-stories.csv are not planner files');
  fs.mkdirSync(path.join(base, 'lexicons'));
  assert.equal(checkFolder(base).status, 'older-layout');
  put(base, 'iam/user-stories.csv');
  assert.equal(checkFolder(base).status, 'has-planner-files', 'a backlog folder wins over the older layout');
  const b2 = tmp();
  put(b2, 'backlogs/iam.csv');
  assert.equal(checkFolder(b2).status, 'older-layout');
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
