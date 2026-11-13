import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { PLANS_FILES, gitignoreBlock } from '../../logic/skill-support/plans-files.mjs';

// "One table lists every file under the data folder" and "A gitignore block is printed from the table".
const lifecycleOf = (rowPath) => PLANS_FILES.find((row) => row.path === rowPath)?.lifecycle;
const pathsWith = (lifecycle) => PLANS_FILES.filter((row) => row.lifecycle.join(', ') === lifecycle).map((row) => row.path);

const EXPECTED_PLANS_BLOCK = `# planner data: committed files only (printed by jois-story-plan/print-gitignore.mjs)
!.plans/
.plans/*
!.plans/*/
.plans/*/*
!.plans/*/user-stories.csv
!.plans/*/lexicon.csv
!.plans/*/backlog.json
!.plans/*/context-map.json
!.plans/*/context-map.md
!.plans/*/slices/
.plans/*/slices/*
!.plans/*/slices/*/
.plans/*/slices/*/*
!.plans/*/slices/*/ARCHIVED.md
!.plans/*/slices/*/source.json
!.plans/*/slices/*/UC-*.md
!.plans/*/slices/*/tasks.md
`;

const root = path.resolve('some', 'project');

test('the rows hold the paths and lifecycles of the spec', () => {
  assert.deepEqual(pathsWith('committed'), [
    'user-stories.csv', 'lexicon.csv', 'backlog.json', 'context-map.json', 'context-map.md',
    'slices/<slice>/ARCHIVED.md', 'slices/<slice>/source.json',
  ]);
  assert.deepEqual(pathsWith('local'), [
    'user-stories/proposals.csv', 'user-stories/review.csv', 'user-stories/review.csv.decided', 'lexicon/lexicon-suggestions.csv',
  ]);
  assert.deepEqual(pathsWith('user decides, removed by archive'), ['slices/<slice>/UC-<slice>.md', 'slices/<slice>/tasks.md']);
  assert.deepEqual(pathsWith('local, removed by archive'), [
    'slices/<slice>/review.md', 'slices/<slice>/validation.md', 'slices/<slice>/validation.partial.md',
  ]);
  assert.equal(PLANS_FILES.length, 16);
  assert.deepEqual(lifecycleOf('slices/<slice>/tasks.md'), ['user decides', 'removed by archive']);
});

test('every row names a writer and each path appears once', () => {
  for (const row of PLANS_FILES) assert.ok(row.writer.length > 0, row.path);
  assert.equal(new Set(PLANS_FILES.map((row) => row.path)).size, PLANS_FILES.length);
});

test('the block for .plans equals the block of the design', () => {
  assert.equal(gitignoreBlock({ dataDir: path.join(root, '.plans'), root }), EXPECTED_PLANS_BLOCK);
});

test('no line ignores a folder without its /*', () => {
  const lines = gitignoreBlock({ dataDir: path.join(root, '.plans'), root }).split('\n').filter((l) => l && !l.startsWith('#'));
  const ignores = lines.filter((l) => !l.startsWith('!'));
  assert.ok(ignores.length > 0);
  for (const line of ignores) assert.match(line, /\/\*$/, `${line} must ignore contents (/*), not a folder`);
  // A folder that is re-included with `!x/` is ignored first through its parent's `/*`.
  for (const line of lines.filter((l) => l.startsWith('!') && l.endsWith('/'))) {
    const parent = line.slice(1).replace(/[^/]*\/$/, '');
    assert.ok(parent === '' || lines.includes(`${parent}*`), `${line} has no ignore of its parent's contents`);
  }
});

test('a data folder elsewhere inside the project uses that path', () => {
  const block = gitignoreBlock({ dataDir: path.join(root, 'docs', 'plans'), root });
  assert.match(block, /^!docs\/plans\/$/m);
  assert.match(block, /^docs\/plans\/\*\/slices\/\*\/\*$/m);
  assert.doesNotMatch(block, /\.plans/);
});

test('a data folder outside the project, or the project itself, yields no block', () => {
  assert.equal(gitignoreBlock({ dataDir: path.resolve('other', 'plans'), root }), null);
  assert.equal(gitignoreBlock({ dataDir: path.join(root, '..', 'plans'), root }), null);
  assert.equal(gitignoreBlock({ dataDir: root, root }), null);
});
