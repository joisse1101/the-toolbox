import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { tempData, SAMPLE, PLAN_FIXTURES } from '../helpers/backlog-tree.mjs';

const require = createRequire(import.meta.url);
const { migrateOlderLayout } = require('../../logic/storage/project-folders.cjs');
const { listBacklogs, detectOlderLayout } = require('../../logic/storage/backlog-paths.cjs');

// The older layout built in a temp folder from the committed sample: one file per backlog in each kind's folder.
function olderLayoutFromSample() {
  const root = tempData('sample-older-');
  const put = (rel, text) => {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  };
  const read = (rel) => fs.readFileSync(path.join(rel === 'user-stories.csv' ? path.join(SAMPLE, 'sample') : PLAN_FIXTURES, rel));
  put('backlogs/sample.csv', read('user-stories.csv'));
  put('lexicons/sample.csv', 'Term,Part of,Definition,Avoid,Notes\nAccount,,A person who signs in,,\n');
  for (const f of ['context-map.json', 'context-map.md']) put(`diagrams/sample/${f}`, read(f));
  for (const f of ['UC-streaks.md', 'source.json']) put(`diagrams/sample/streaks/${f}`, read(`slices/streaks/${f}`));
  return root;
}

test('the sample migrates from a copy of the older layout to the sample data layout', () => {
  const root = olderLayoutFromSample();
  assert.deepEqual(detectOlderLayout(root), ['backlogs', 'lexicons', 'diagrams']);
  assert.deepEqual(listBacklogs(root), []);

  const result = migrateOlderLayout(root);

  assert.deepEqual(result.failed, []);
  assert.deepEqual(result.skipped, []);
  assert.deepEqual(listBacklogs(root), ['sample']);
  for (const rel of ['user-stories.csv', 'context-map.json', 'context-map.md', 'slices/streaks/UC-streaks.md', 'slices/streaks/source.json']) {
    assert.deepEqual(fs.readFileSync(path.join(root, 'sample', rel)), fs.readFileSync(path.join(rel === 'user-stories.csv' ? path.join(SAMPLE, 'sample') : PLAN_FIXTURES, rel)), rel);
  }
  assert.ok(fs.existsSync(path.join(root, 'sample', 'lexicon.csv')));
  assert.ok(fs.existsSync(path.join(root, 'backlogs', 'sample.csv')), 'the older file is left in place');
});
