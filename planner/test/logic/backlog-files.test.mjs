import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { startingFiles } from '../../logic/backlog/starting-files.js';

const require = createRequire(import.meta.url);
const { writeBacklogFiles } = require('../../logic/storage/backlog-files.cjs');
const { backlogFile, listBacklogs, KINDS } = require('../../logic/storage/backlog-paths.cjs');

// Temp folders go under the project's .scratch/, never the system temp folder.
const scratch = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.scratch');
fs.mkdirSync(scratch, { recursive: true });
const root = fs.mkdtempSync(path.join(scratch, 'backlog-files-'));
after(() => fs.rmSync(root, { recursive: true }));

const newDataDir = () => fs.mkdtempSync(path.join(root, 'data-'));
const read = (dataDir, name, kind) => fs.readFileSync(backlogFile(dataDir, name, kind), 'utf8');

test('writes every starting file by its kind and returns the name', async () => {
  const dataDir = newDataDir();
  const files = startingFiles();

  const name = await writeBacklogFiles(dataDir, 'sprint-12', files);

  assert.equal(name, 'sprint-12');
  for (const { kind, text } of files) assert.equal(read(dataDir, name, kind), text);
  assert.deepEqual(listBacklogs(dataDir), ['sprint-12']);
});

test('uses the next free numbered name and leaves the taken one untouched when the name is taken', async () => {
  const dataDir = newDataDir();
  const files = startingFiles();
  await writeBacklogFiles(dataDir, 'sprint-12', files);
  fs.writeFileSync(backlogFile(dataDir, 'sprint-12', 'backlog'), 'kept');

  const second = await writeBacklogFiles(dataDir, 'sprint-12', files);
  const third = await writeBacklogFiles(dataDir, 'sprint-12', files);

  assert.equal(second, 'sprint-12-2');
  assert.equal(third, 'sprint-12-3');
  assert.equal(read(dataDir, 'sprint-12', 'backlog'), 'kept');
});

test('creates the data folder when it does not exist', async () => {
  const dataDir = path.join(newDataDir(), 'missing', 'plans');

  const name = await writeBacklogFiles(dataDir, 'first', startingFiles());

  assert.deepEqual(listBacklogs(dataDir), [name]);
});

test('removes the folder it made and rethrows when a file cannot be written', async () => {
  const dataDir = newDataDir();
  const [first] = startingFiles();
  // The same kind twice: the second write finds the file and fails with EEXIST (the no-overwrite write).
  const files = [first, first];

  await assert.rejects(writeBacklogFiles(dataDir, 'broken', files), { code: 'EEXIST' });

  assert.equal(fs.existsSync(path.join(dataDir, 'broken')), false);
  assert.deepEqual(listBacklogs(dataDir), []);
});

test('leaves a backlog it did not make alone when a later create fails', async () => {
  const dataDir = newDataDir();
  await writeBacklogFiles(dataDir, 'kept', startingFiles());

  await assert.rejects(writeBacklogFiles(dataDir, 'broken', [{ kind: 'nope', text: '' }]), { code: 'unknown-store' });

  assert.deepEqual(listBacklogs(dataDir), ['kept']);
  assert.equal(fs.readdirSync(path.join(dataDir, 'kept')).length > 0, true);
  assert.equal(KINDS.every((kind) => fs.existsSync(backlogFile(dataDir, 'kept', kind))), true);
});
