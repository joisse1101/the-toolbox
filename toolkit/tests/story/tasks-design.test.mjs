import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTasks, parseTasks, criteriaTable } from '../../skills/jois-story-plan/diagrams/tasks.js';
import { document, tasksText, CURRENT_TASK, BEST_TASK } from './tasks-fixture.mjs';

const URL = 'https://claude.ai/artifact/abc123';
const OTHER_URL = 'https://claude.ai/artifact/zzz999';
const FORM = `${URL}#artboard-current-list-default-desktop`;
const ERROR = `${URL}#artboard-current-list-default-mobile`;
const BEST_BOARD = `${URL}#artboard-best-list-default-desktop`;

const [currentRow, bestRow] = criteriaTable(document);
const STORIES = [{ id: 'H1-HT-0001', title: currentRow.story }, { id: 'H1-HT-0002', title: bestRow.story }];
const rowOf = (storyId, row, artboards, canvas = URL) => ({ storyId, story: row.story, criterion: row.text, kind: 'main', artboards, viewports: ['desktop', 'mobile'], canvas, extra: {} });

// The design: the current criterion has two artboards, the best criterion has none unless `best` names some. `canvas` is the Canvas of the current row.
const designOf = ({ best = [], canvas = URL } = {}) => ({
  stories: STORIES,
  rows: [rowOf('H1-HT-0001', currentRow, ['current-list-default-desktop', 'current-list-default-mobile'], canvas), rowOf('H1-HT-0002', bestRow, best)],
});

const withDesign = (text, task, links) => text.replace(new RegExp(String.raw`(- \[ \] ${task} .*\n  Satisfies: .*\n)`), `$1  Design: ${links}\n`);
const check = (tasks, design = designOf()) => checkTasks({ tasksText: tasks, document, slice: 'streaks', design });
const messages = (tasks, design) => check(tasks, design).map((p) => p.message).join('\n');

test('a Design line parses into its comma-separated links and a task without one has none', () => {
  const r = parseTasks(withDesign(tasksText(), CURRENT_TASK, `${FORM}, ${ERROR}`));
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.tasks[0].design, [FORM, ERROR]);
  assert.deepEqual(r.tasks[1].design, []);
});

test('a valid Design line passes, and a backend task with no artboard needs none', () => {
  assert.deepEqual(check(withDesign(tasksText(), CURRENT_TASK, FORM)), []);
  assert.deepEqual(check(withDesign(tasksText(), CURRENT_TASK, `${FORM}, ${ERROR}`)), []);
});

test('a screen task without a Design line is refused naming the task and the criterion', () => {
  const problems = check(tasksText());
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, new RegExp(`the task ${CURRENT_TASK} .*AC-streaks-current .*Given a habit checked off.*has no "Design:" line`));
  assert.equal(problems[0].line, 5);
});

test('a backend task whose criteria have no artboard passes without a Design line', () => {
  assert.doesNotMatch(messages(withDesign(tasksText(), CURRENT_TASK, FORM)), new RegExp(BEST_TASK));
});

test('without a design the check behaves as before: no Design line is needed and none is checked', () => {
  assert.deepEqual(checkTasks({ tasksText: tasksText(), document, slice: 'streaks' }), []);
  assert.deepEqual(checkTasks({ tasksText: withDesign(tasksText(), CURRENT_TASK, `${OTHER_URL}#artboard-x`), document, slice: 'streaks' }), []);
});

test('a link to an artboard of another canvas is refused naming the task and the link', () => {
  const link = `${OTHER_URL}#artboard-current-list-default-desktop`;
  const text = messages(withDesign(tasksText(), CURRENT_TASK, link));
  assert.match(text, new RegExp(`the task ${CURRENT_TASK} .*Design link ${link}, which is not an artboard of the canvas ${URL}`));
});

test('a link to an artboard of a criterion the task does not satisfy is refused naming the task and the link', () => {
  const design = designOf({ best: ['best-list-default-desktop'] });
  const text = messages(withDesign(tasksText(), CURRENT_TASK, BEST_BOARD), design);
  assert.match(text, new RegExp(`the task ${CURRENT_TASK} .*Design link ${BEST_BOARD}, which is not an artboard of a criterion the task satisfies`));
  // the best task now satisfies a criterion with an artboard, so it needs its own line, and the current task still has none that is valid
  assert.match(text, new RegExp(`the task ${BEST_TASK} .*has no "Design:" line`));
});

test('a link to an unknown artboard of the right canvas is refused', () => {
  assert.match(messages(withDesign(tasksText(), CURRENT_TASK, `${URL}#artboard-nope`)), /Design link .*#artboard-nope, which is not an artboard of a criterion the task satisfies/);
});

test('a row matches by story ID and exact criterion text, so a row for another ID or a reworded text gives no link', () => {
  const otherId = { stories: STORIES, rows: [rowOf('H1-HT-0099', currentRow, ['current-list-default-desktop'])] };
  assert.deepEqual(check(tasksText(), otherId), []);
  const reworded = { stories: STORIES, rows: [rowOf('H1-HT-0001', { ...currentRow, text: `${currentRow.text} Also more.` }, ['current-list-default-desktop'])] };
  assert.deepEqual(check(tasksText(), reworded), []);
});

test('a link built from the Canvas of a migrated row passes even when no designs.json lists that canvas', () => {
  const migrated = designOf({ canvas: OTHER_URL });
  const link = `${OTHER_URL}#artboard-current-list-default-desktop`;
  assert.deepEqual(check(withDesign(tasksText(), CURRENT_TASK, link), migrated), []);
  assert.match(messages(withDesign(tasksText(), CURRENT_TASK, `https://claude.ai/artifact/third01#artboard-x`), migrated), /Design link .*, which is not an artboard of the canvas https:\/\/claude\.ai\/artifact\/zzz999 or /);
});
