import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { slugify, isRealDate, writeMinutes } from '../.claude/skills/meeting-minutes/write-minutes.mjs';

const tmpData = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tlt-minutes-'));
const listing = (dataDir) => fs.readdirSync(path.join(dataDir, 'meetings')).sort();
const read = (dataDir, file) => fs.readFileSync(path.join(dataDir, 'meetings', file), 'utf8');

test('slugify makes lowercase kebab-case and drops accents', () => {
  assert.equal(slugify('Sprint Planning'), 'sprint-planning');
  assert.equal(slugify('  Q3 / Roadmap: v2!! '), 'q3-roadmap-v2');
  assert.equal(slugify('Café sync'), 'cafe-sync');
  assert.equal(slugify('???'), '');
  assert.equal(slugify(undefined), '');
});

test('isRealDate accepts only real YYYY-MM-DD dates', () => {
  assert.equal(isRealDate('2026-10-14'), true);
  assert.equal(isRealDate('2028-02-29'), true);
  assert.equal(isRealDate('2026-02-30'), false);
  assert.equal(isRealDate('2026-13-01'), false);
  assert.equal(isRealDate('14-10-2026'), false);
  assert.equal(isRealDate(undefined), false);
});

test('first save creates the folder and <slug>_<date>.md', () => {
  const dataDir = tmpData();
  const r = writeMinutes({ dataDir, title: 'Sprint Planning', date: '2026-10-14', text: '# Minutes' });
  assert.deepEqual(r, { ok: true, file: 'sprint-planning_2026-10-14.md', replaced: false });
  assert.equal(read(dataDir, r.file), '# Minutes\n');
  assert.deepEqual(listing(dataDir), ['sprint-planning_2026-10-14.md']);
});

test('a taken name gets the next free suffix and nothing is overwritten', () => {
  const dataDir = tmpData();
  const save = (text) => writeMinutes({ dataDir, title: 'Sprint Planning', date: '2026-10-14', text });
  assert.equal(save('one').file, 'sprint-planning_2026-10-14.md');
  assert.equal(save('two').file, 'sprint-planning_2026-10-14_1.md');
  assert.equal(save('three').file, 'sprint-planning_2026-10-14_2.md');
  assert.equal(read(dataDir, 'sprint-planning_2026-10-14.md'), 'one\n');
  assert.equal(read(dataDir, 'sprint-planning_2026-10-14_1.md'), 'two\n');
  assert.deepEqual(listing(dataDir).length, 3); // no .tmp left behind
});

test('invalid title, date or empty input write nothing', () => {
  const dataDir = tmpData();
  for (const bad of [
    { title: '???', date: '2026-10-14', text: 'x' },
    { title: 'Sync', date: '2026-02-30', text: 'x' },
    { title: 'Sync', date: undefined, text: 'x' },
    { title: 'Sync', date: '2026-10-14', text: '  \n' },
  ]) {
    const r = writeMinutes({ dataDir, ...bad });
    assert.equal(r.ok, false);
    assert.ok(r.errors.length);
  }
  assert.equal(fs.existsSync(path.join(dataDir, 'meetings')), false);
});

test('replace swaps the content of an existing file and creates nothing', () => {
  const dataDir = tmpData();
  const first = writeMinutes({ dataDir, title: 'Sprint Planning', date: '2026-10-14', text: 'old' });
  const r = writeMinutes({ dataDir, replace: first.file, text: 'new' });
  assert.deepEqual(r, { ok: true, file: first.file, replaced: true });
  assert.equal(read(dataDir, first.file), 'new\n');
  assert.deepEqual(listing(dataDir), [first.file]);
});

test('replace refuses a missing file, a path and a wrong name, and never creates a file', () => {
  const dataDir = tmpData();
  writeMinutes({ dataDir, title: 'Sync', date: '2026-10-14', text: 'keep' });
  for (const replace of ['other_2026-10-14.md', '..\\notes.md', '../notes.md', 'sync_2026-10-14.csv', 'Sync_2026-10-14.md']) {
    const r = writeMinutes({ dataDir, replace, text: 'x' });
    assert.equal(r.ok, false, replace);
  }
  assert.deepEqual(listing(dataDir), ['sync_2026-10-14.md']);
  assert.equal(read(dataDir, 'sync_2026-10-14.md'), 'keep\n');
});
