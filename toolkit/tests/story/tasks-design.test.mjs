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
const entry = (row, artboards) => ({ title: row.story, criteria: [{ text: row.text, kind: 'main', artboards }] });

// The index: the current criterion has two artboards, the best criterion has none unless `best` names some.
const designOf = ({ best = [] } = {}) => ({
  url: URL,
  index: {
    version: 1,
    backlog: 'sample',
    scope: { type: 'feature', epic: 'Habit tracking', feature: 'Streaks' },
    viewports: ['desktop', 'mobile'],
    stories: [entry(currentRow, ['current-list-default-desktop', 'current-list-default-mobile']), entry(bestRow, best)],
  },
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
