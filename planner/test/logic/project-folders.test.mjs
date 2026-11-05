// Init, copy, folder check, confinement and saving of the project config. Temp folders only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const pc = createRequire(import.meta.url)('../../logic/storage/project-config.cjs');
const { initFolders, copyData, migrateOlderLayout, checkFolder, confineDir, confineCodeBase, checkCodeBase, initCodeBase, copyToCodeBase, planCopy, planCopyToCodeBase, saveConfig, loadConfig, ROOT } = pc;

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'project-folders-'));
}
function put(dir, rel, text = 'x') {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

// ---- init (3.1)

// Init tests that need no confinement keep their folders under the project's .scratch/ and remove them afterwards.
const SCRATCH = path.resolve(import.meta.dirname, '..', '..', '..', '.scratch', 'project-folders-init');
function scratch() {
  fs.mkdirSync(SCRATCH, { recursive: true });
  return fs.mkdtempSync(path.join(SCRATCH, 'init-'));
}
test.after(() => fs.rmSync(SCRATCH, { recursive: true, force: true }));

const loadStartingFiles = async () => (await import('../../logic/backlog/starting-files.js')).startingFiles();
const KIND_PATHS = { backlog: 'user-stories.csv', review: 'user-stories/review.csv', proposals: 'user-stories/proposals.csv', lexicon: 'lexicon.csv', 'lexicon-suggestions': 'lexicon/lexicon-suggestions.csv' };

async function assertStartingFiles(backlogDir) {
  for (const { kind, text } of await loadStartingFiles()) {
    assert.equal(fs.readFileSync(path.join(backlogDir, KIND_PATHS[kind]), 'utf8'), text, `${kind} holds its starting header`);
  }
}

test('init on a missing folder creates the data folder and new-backlog with its five starting files', async () => {
  const dir = path.join(scratch(), 'data');
  const r = await initFolders(dir);
  assert.deepEqual(r.created, ['data', 'new-backlog']);
  assert.deepEqual(r.existing, []);
  assert.equal(r.createdDataDir, true);
  assert.equal(r.createdBacklog, 'new-backlog');
  assert.deepEqual(fs.readdirSync(dir), ['new-backlog']);
  await assertStartingFiles(path.join(dir, 'new-backlog'));
});

test('init on an empty folder creates new-backlog and lists the folder as existing', async () => {
  const dir = scratch();
  const r = await initFolders(dir);
  assert.deepEqual(r.created, ['new-backlog']);
  assert.deepEqual(r.existing, [path.basename(dir)]);
  assert.equal(r.createdDataDir, false);
  assert.deepEqual(fs.readdirSync(dir), ['new-backlog']);
  await assertStartingFiles(path.join(dir, 'new-backlog'));
});

test('init on a folder that holds a backlog keeps it, lists it as existing and creates nothing', async () => {
  const dir = scratch();
  put(dir, 'iam/user-stories.csv', 'keep');
  const r = await initFolders(dir);
  assert.deepEqual(r.existing, [path.basename(dir), 'iam']);
  assert.deepEqual(r.created, []);
  assert.equal(r.createdBacklog, null);
  assert.deepEqual(fs.readdirSync(dir), ['iam']);
  assert.deepEqual(fs.readdirSync(path.join(dir, 'iam')), ['user-stories.csv']);
  assert.equal(fs.readFileSync(path.join(dir, 'iam', 'user-stories.csv'), 'utf8'), 'keep');
});

test('init a second time creates nothing and lists the folder and its backlog as existing', async () => {
  const dir = path.join(scratch(), 'data');
  await initFolders(dir);
  const file = path.join(dir, 'new-backlog', 'user-stories.csv');
  fs.appendFileSync(file, 'x');
  const before = fs.readFileSync(file, 'utf8');
  const r = await initFolders(dir);
  assert.deepEqual(r.created, []);
  assert.deepEqual(r.existing, ['data', 'new-backlog']);
  assert.equal(r.createdDataDir, false);
  assert.equal(r.createdBacklog, null);
  assert.deepEqual(fs.readdirSync(dir), ['new-backlog']);
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'the existing file is not touched');
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

// ---- copy plan, overwrite and read-back (mock trees in temp folders)

const listing = (dir) => fs.readdirSync(dir, { recursive: true }).map((n) => n.split(path.sep).join('/')).sort();

test('plan on an empty target lists no clash and creates nothing, not even a missing target', () => {
  const s = source();
  const t = tmp();
  assert.deepEqual(planCopy(s, t), { exists: [] });
  assert.deepEqual(fs.readdirSync(t), []);
  const missing = path.join(tmp(), 'nope', 'deeper');
  assert.deepEqual(planCopy(s, missing), { exists: [] });
  assert.equal(fs.existsSync(path.dirname(missing)), false);
});

test('plan lists the one file that clashes and changes nothing', () => {
  const s = source();
  const t = tmp();
  put(t, 'backlogs/iam.csv', 'mine');
  put(t, 'extra.txt', 'extra');
  const before = listing(t);
  assert.deepEqual(planCopy(s, t), { exists: ['backlogs/iam.csv'] });
  assert.deepEqual(listing(t), before);
  assert.equal(fs.readFileSync(path.join(t, 'backlogs', 'iam.csv'), 'utf8'), 'mine');
});

test('plan ignores a backups folder like the copy does', () => {
  const s = source();
  put(s, 'iam/backups/x.csv', 'old');
  const t = tmp();
  put(t, 'iam/backups/x.csv', 'old');
  assert.deepEqual(planCopy(s, t), { exists: [] }, 'backups never clash');
});

test('plan refuses the same folder, a folder inside it, a folder that contains it and a file', () => {
  const s = source();
  assert.match(planCopy(s, s).refused, /inside|current/);
  assert.ok(planCopy(s, path.join(s, 'sub')).refused);
  assert.equal(fs.existsSync(path.join(s, 'sub')), false);
  const parent = tmp();
  const child = path.join(parent, 'child');
  put(child, 'backlogs/a.csv');
  assert.match(planCopy(child, parent).refused, /contains/);
  const file = path.join(tmp(), 'f.txt');
  fs.writeFileSync(file, 'x');
  assert.match(planCopy(s, file).refused, /file/);
});

test('plan for a code base looks in .plans, creates nothing and refuses a missing code base', () => {
  const s = tmp();
  put(s, 'iam/user-stories.csv', 'theirs');
  const cb = tmp();
  assert.deepEqual(planCopyToCodeBase(s, cb), { exists: [] });
  assert.equal(fs.existsSync(path.join(cb, '.plans')), false);
  put(cb, '.plans/iam/user-stories.csv', 'mine');
  assert.deepEqual(planCopyToCodeBase(s, cb), { exists: ['iam/user-stories.csv'] });
  assert.match(planCopyToCodeBase(s, path.join(tmp(), 'nope')).refused, /does not exist/);
});

test('copy by default still skips a clash and reports an empty overwritten list', () => {
  const s = source();
  const t = tmp();
  put(t, 'backlogs/iam.csv', 'mine');
  const r = copyData(s, t);
  assert.deepEqual(r.overwritten, []);
  assert.deepEqual(r.failed, []);
  assert.deepEqual(r.skipped, [{ file: 'backlogs/iam.csv', reason: 'exists' }]);
  assert.equal(fs.readFileSync(path.join(t, 'backlogs', 'iam.csv'), 'utf8'), 'mine');
});

test('overwrite replaces the clash, leaves an extra target file alone and leaves the source unchanged', () => {
  const s = source();
  const t = tmp();
  put(t, 'backlogs/iam.csv', 'mine');
  put(t, 'extra/keep.txt', 'extra');
  const srcBefore = listing(s);
  const r = copyData(s, t, { overwrite: true });
  assert.deepEqual(r.overwritten, ['backlogs/iam.csv']);
  assert.deepEqual(r.copied.sort(), ['diagrams/iam/slice/UC-slice.md', 'reviews/iam.csv']);
  assert.deepEqual(r.skipped, []);
  assert.deepEqual(r.failed, []);
  assert.equal(fs.readFileSync(path.join(t, 'backlogs', 'iam.csv'), 'utf8'), 'backlog');
  assert.equal(fs.readFileSync(path.join(t, 'extra', 'keep.txt'), 'utf8'), 'extra');
  assert.deepEqual(listing(s), srcBefore);
  assert.equal(fs.readFileSync(path.join(s, 'backlogs', 'iam.csv'), 'utf8'), 'backlog');
});

test('overwrite through a code base replaces only the clash in .plans', () => {
  const s = tmp();
  put(s, 'iam/user-stories.csv', 'theirs');
  put(s, 'iam/lexicon.csv', 'lex');
  const cb = tmp();
  put(cb, '.plans/iam/user-stories.csv', 'mine');
  put(cb, '.plans/iam/own.csv', 'own');
  const r = copyToCodeBase(s, cb, { overwrite: true });
  assert.deepEqual(r.overwritten, ['iam/user-stories.csv']);
  assert.deepEqual(r.copied, ['iam/lexicon.csv']);
  assert.equal(fs.readFileSync(path.join(cb, '.plans', 'iam', 'user-stories.csv'), 'utf8'), 'theirs');
  assert.equal(fs.readFileSync(path.join(cb, '.plans', 'iam', 'own.csv'), 'utf8'), 'own');
  assert.equal(fs.readFileSync(path.join(s, 'iam', 'user-stories.csv'), 'utf8'), 'theirs');
});

test('read-back reports a copy that differs, removes a bad new copy and keeps a bad overwrite listed as failed', () => {
  const s = source();
  const t = tmp();
  put(t, 'backlogs/iam.csv', 'mine');
  const wrong = (from, to, flags) => {
    fs.copyFileSync(from, to, flags);
    if (from.endsWith('iam.csv')) fs.writeFileSync(to, 'garbled');
  };
  const r = copyData(s, t, { overwrite: true, copyFile: wrong });
  assert.deepEqual(r.failed.map((f) => f.file).sort(), ['backlogs/iam.csv', 'reviews/iam.csv']);
  assert.ok(r.failed.every((f) => /read back/.test(f.message)));
  assert.deepEqual(r.overwritten, []);
  assert.deepEqual(r.copied, ['diagrams/iam/slice/UC-slice.md']);
  assert.equal(fs.existsSync(path.join(t, 'reviews', 'iam.csv')), false, 'the bad new copy is removed');
  assert.equal(fs.readFileSync(path.join(s, 'backlogs', 'iam.csv'), 'utf8'), 'backlog', 'the source is unchanged');
});

test('read-back reports a file that cannot be read back', () => {
  const s = source();
  const t = tmp();
  const readFile = (p) => {
    if (p.includes(path.basename(t)) && p.endsWith('iam.csv')) throw new Error('EBUSY: locked');
    return fs.readFileSync(p);
  };
  const r = copyData(s, t, { readFile });
  assert.equal(r.failed.length, 2);
  assert.match(r.failed[0].message, /could not be read back/);
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

// ---- code base: confinement (2.1)

test('code base: a relative path is refused', () => {
  const r = confineCodeBase('..\\elsewhere');
  assert.equal(r.ok, false);
  assert.match(r.reason, /absolute/);
});

test('code base: a system folder and a drive root are refused', () => {
  const sys = process.platform === 'win32' ? process.env.SystemRoot : '/etc';
  const r = confineCodeBase(sys);
  assert.equal(r.ok, false);
  assert.match(r.reason, /system/);
  const root = confineCodeBase(path.parse(os.tmpdir()).root);
  assert.equal(root.ok, false);
  assert.match(root.reason, /root/);
});

test('code base: the home folder itself is refused, a folder inside it is accepted', () => {
  const home = tmp();
  const r = confineCodeBase(home, { home });
  assert.equal(r.ok, false);
  assert.match(r.reason, /home/);
  const inner = path.join(home, 'payments');
  fs.mkdirSync(inner);
  const ok = confineCodeBase(inner, { home });
  assert.equal(ok.ok, true);
  assert.equal(ok.plansDir, path.join(ok.dir, '.plans'));
});

test('code base: a folder inside the repository is refused, planner/data included', () => {
  const r = confineCodeBase(path.join(ROOT, 'planner', 'logic'));
  assert.equal(r.ok, false);
  assert.match(r.reason, /repository/);
  assert.equal(confineCodeBase(path.join(ROOT, 'planner', 'data')).ok, false, 'no planner/data exception');
  assert.equal(confineCodeBase(ROOT).ok, false);
});

test('code base: a missing folder is refused and not created', () => {
  const missing = path.join(tmp(), 'nope');
  const r = confineCodeBase(missing);
  assert.equal(r.ok, false);
  assert.match(r.reason, /does not exist/);
  assert.equal(fs.existsSync(missing), false);
});

test('code base: a path that is a file is refused', () => {
  const dir = tmp();
  put(dir, 'a.txt');
  assert.match(confineCodeBase(path.join(dir, 'a.txt')).reason, /file/);
});

test('code base: a file named .plans is refused and said so', () => {
  const dir = tmp();
  put(dir, '.plans', 'x');
  const r = confineCodeBase(dir);
  assert.equal(r.ok, false);
  assert.match(r.reason, /\.plans/);
  assert.match(r.reason, /file/);
});

test('code base: an existing folder with and without .plans is accepted', () => {
  const dir = tmp();
  assert.equal(confineCodeBase(dir).ok, true);
  fs.mkdirSync(path.join(dir, '.plans'));
  assert.equal(confineCodeBase(dir).ok, true);
});

// ---- code base: check, init and copy on .plans (2.2)

test('code base check: missing .plans, empty .plans, has-planner-files, refused', () => {
  const cb = tmp();
  assert.equal(checkCodeBase(cb).status, 'missing');
  assert.equal(checkCodeBase(cb).dir, path.join(fs.realpathSync.native(cb), '.plans'));
  fs.mkdirSync(path.join(cb, '.plans'));
  assert.equal(checkCodeBase(cb).status, 'empty');
  put(cb, '.plans/iam/user-stories.csv');
  assert.equal(checkCodeBase(cb).status, 'has-planner-files');
  assert.equal(checkCodeBase('relative').status, 'refused');
  assert.equal(checkCodeBase(path.join(cb, 'nope')).status, 'refused');
});

test('code base init creates .plans and .plans/new-backlog with its starting files, and nothing else', async () => {
  const cb = tmp();
  put(cb, 'src/app.js', 'code');
  const r = await initCodeBase(cb);
  assert.deepEqual(r.created, ['.plans', 'new-backlog']);
  assert.deepEqual(r.existing, []);
  assert.equal(r.createdDataDir, true);
  assert.deepEqual(fs.readdirSync(cb).sort(), ['.plans', 'src']);
  assert.deepEqual(fs.readdirSync(path.join(cb, '.plans')), ['new-backlog']);
  await assertStartingFiles(path.join(cb, '.plans', 'new-backlog'));
  assert.equal(fs.existsSync(path.join(cb, 'planner.config.yaml')), false, 'no config is written');
  assert.equal(fs.readFileSync(path.join(cb, 'src', 'app.js'), 'utf8'), 'code');
});

test('code base init twice creates nothing the second time and lists .plans and its backlog as existing', async () => {
  const cb = tmp();
  await initCodeBase(cb);
  const r = await initCodeBase(cb);
  assert.deepEqual(r.created, []);
  assert.deepEqual(r.existing, ['.plans', 'new-backlog']);
  assert.equal(r.createdDataDir, false);
  assert.deepEqual(fs.readdirSync(path.join(cb, '.plans')), ['new-backlog']);
});

test('code base init on a .plans that holds a backlog creates nothing', async () => {
  const cb = tmp();
  put(cb, '.plans/iam/user-stories.csv', 'keep');
  const r = await initCodeBase(cb);
  assert.deepEqual(r.created, []);
  assert.deepEqual(r.existing, ['.plans', 'iam']);
  assert.deepEqual(fs.readdirSync(path.join(cb, '.plans')), ['iam']);
  assert.equal(fs.readFileSync(path.join(cb, '.plans', 'iam', 'user-stories.csv'), 'utf8'), 'keep');
});

test('code base init refuses a missing code base and creates nothing', async () => {
  const missing = path.join(tmp(), 'nope');
  const r = await initCodeBase(missing);
  assert.match(r.refused, /does not exist/);
  assert.equal(fs.existsSync(missing), false);
});

test('code base init refuses a .plans that is a file', async () => {
  const cb = tmp();
  put(cb, '.plans', 'x');
  assert.match((await initCodeBase(cb)).refused, /file/);
  assert.equal(fs.readFileSync(path.join(cb, '.plans'), 'utf8'), 'x');
});

test('code base copy skips an existing file, copies the rest and leaves the source untouched', () => {
  const s = tmp();
  put(s, 'iam/user-stories.csv', 'theirs');
  put(s, 'iam/lexicon.csv', 'lex');
  const cb = tmp();
  put(cb, '.plans/iam/user-stories.csv', 'mine');
  const r = copyToCodeBase(s, cb);
  assert.deepEqual(r.skipped, [{ file: 'iam/user-stories.csv', reason: 'exists' }]);
  assert.deepEqual(r.copied, ['iam/lexicon.csv']);
  assert.equal(fs.readFileSync(path.join(cb, '.plans', 'iam', 'user-stories.csv'), 'utf8'), 'mine');
  assert.equal(fs.readFileSync(path.join(cb, '.plans', 'iam', 'lexicon.csv'), 'utf8'), 'lex');
  assert.deepEqual(fs.readdirSync(s, { recursive: true }).map((n) => n.split(path.sep).join('/')).sort(), ['iam', 'iam/lexicon.csv', 'iam/user-stories.csv']);
  assert.equal(fs.readFileSync(path.join(s, 'iam', 'user-stories.csv'), 'utf8'), 'theirs');
});

test('code base copy creates .plans when missing and refuses a missing code base', () => {
  const s = tmp();
  put(s, 'iam/user-stories.csv', 'x');
  const cb = tmp();
  assert.deepEqual(copyToCodeBase(s, cb).copied, ['iam/user-stories.csv']);
  assert.ok(fs.existsSync(path.join(cb, '.plans', 'iam', 'user-stories.csv')));
  const missing = path.join(tmp(), 'nope');
  assert.match(copyToCodeBase(s, missing).refused, /does not exist/);
  assert.equal(fs.existsSync(missing), false);
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
