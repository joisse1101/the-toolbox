import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTasks } from '../../skills/jois-story-plan/diagrams/tasks.js';
import { tasksText, CURRENT_TASK, BEST_TASK } from './tasks-fixture.mjs';

test('a valid file parses into its groups, task ids, titles, criteria, steps and verification', () => {
  const r = parseTasks(tasksText());
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.groups.map((g) => g.flow), ['current', 'best']);
  assert.deepEqual(r.tasks.map((t) => [t.id, t.title, t.flow]), [
    [CURRENT_TASK, 'Show the current streak of a habit', 'current'],
    [BEST_TASK, 'Show the best streak of a habit', 'best'],
  ]);
  assert.deepEqual(r.tasks[0].acIds, ['AC-streaks-current']);
  assert.deepEqual(r.tasks[0].steps, ['1.1', '2.5']);
  assert.equal(r.tasks[0].verify, 'check a habit off on 3 days in a row and see a streak of 3');
});

test('a task with two criteria lists both AC ids', () => {
  const text = tasksText().replace('Satisfies: AC-streaks-current (steps', 'Satisfies: AC-streaks-current, AC-streaks-other (steps');
  assert.deepEqual(parseTasks(text).tasks[0].acIds, ['AC-streaks-current', 'AC-streaks-other']);
});

test('a task without a Verify line is a problem that names the task', () => {
  const text = tasksText().replace(/  Verify: check.*\n/, '');
  const r = parseTasks(text);
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0].message, new RegExp(`${CURRENT_TASK}.*has no "Verify:" line`));
});

test('a task with an empty Verify line is a problem that names the task', () => {
  const r = parseTasks(tasksText().replace(/Verify: check.*/, 'Verify:'));
  assert.match(r.problems[0].message, new RegExp(`${CURRENT_TASK}.*has no "Verify:" line`));
});

test('a repeated task id is a problem that names the id and both lines', () => {
  const text = tasksText().replace(BEST_TASK, CURRENT_TASK);
  const r = parseTasks(text);
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0].message, new RegExp(`the task id ${CURRENT_TASK} is used twice \\(lines 5 and 11\\)`));
  assert.equal(r.problems[0].file, 'tasks.md');
});

test('an unticked and a ticked task parse as open and done', () => {
  const r = parseTasks(tasksText({ current: ' ', best: 'x' }));
  assert.deepEqual(r.tasks.map((t) => t.done), [false, true]);
});

test('an uppercase X parses as done', () => {
  assert.equal(parseTasks(tasksText({ current: 'X' })).tasks[0].done, true);
});

test('a task before any group is a problem', () => {
  const r = parseTasks(`- [ ] ${CURRENT_TASK} Title\n  Satisfies: AC-a (steps 1.1)\n  Verify: v\n`);
  assert.match(r.problems[0].message, /is not under a "## <flow>" group/);
});

test('a "# Tasks" title line before the first group is ignored', () => {
  const r = parseTasks(tasksText());
  assert.ok(tasksText().startsWith('# Tasks\n'));
  assert.deepEqual(r.problems, []);
  assert.equal(r.tasks.length, 2);
});

test('a blank line between two tasks still reads both tasks', () => {
  const text = tasksText().replace('## best\n\n', '\n');
  const r = parseTasks(text);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.tasks.map((t) => t.id), [CURRENT_TASK, BEST_TASK]);
  assert.deepEqual(r.tasks.map((t) => t.flow), ['current', 'current']);
});

test('bare step ids separated by commas parse as separate steps', () => {
  assert.deepEqual(parseTasks(tasksText().replace('(steps 1.1, 2.5)', '(steps 1.1,2.5,3.5)')).tasks[0].steps, ['1.1', '2.5', '3.5']);
});

test('bare step ids separated by spaces parse as separate steps', () => {
  assert.deepEqual(parseTasks(tasksText().replace('(steps 1.1, 2.5)', '(steps 1.1 2.5 3.5)')).tasks[0].steps, ['1.1', '2.5', '3.5']);
});

test('a Satisfies line without steps is a problem that names the task', () => {
  const r = parseTasks(tasksText().replace(' (steps 1.1, 2.5)', ''));
  assert.match(r.problems[0].message, new RegExp(`${CURRENT_TASK}.*names no step`));
});
