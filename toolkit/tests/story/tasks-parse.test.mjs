import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTasks } from '../../skills/jois-story-plan/diagrams/tasks.js';
import { tasksText, LOGIN_TASK, RESET_TASK } from './tasks-fixture.mjs';

test('a valid file parses into its groups, task ids, titles, criteria, steps and verification', () => {
  const r = parseTasks(tasksText());
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.groups.map((g) => g.flow), ['login', 'reset']);
  assert.deepEqual(r.tasks.map((t) => [t.id, t.title, t.flow]), [
    [LOGIN_TASK, 'Show the dashboard after sign-in', 'login'],
    [RESET_TASK, 'Send the reset link', 'reset'],
  ]);
  assert.deepEqual(r.tasks[0].acIds, ['AC-sign-in-dashboard']);
  assert.deepEqual(r.tasks[0].steps, ['1.1', '2.5']);
  assert.equal(r.tasks[0].verify, 'sign in with the right password and see the dashboard');
});

test('a task with two criteria lists both AC ids', () => {
  const text = tasksText().replace('Satisfies: AC-sign-in-dashboard (steps', 'Satisfies: AC-sign-in-dashboard, AC-sign-in-other (steps');
  assert.deepEqual(parseTasks(text).tasks[0].acIds, ['AC-sign-in-dashboard', 'AC-sign-in-other']);
});

test('a task without a Verify line is a problem that names the task', () => {
  const text = tasksText().replace(/  Verify: sign in.*\n/, '');
  const r = parseTasks(text);
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0].message, new RegExp(`${LOGIN_TASK}.*has no "Verify:" line`));
});

test('a task with an empty Verify line is a problem that names the task', () => {
  const r = parseTasks(tasksText().replace(/Verify: sign in.*/, 'Verify:'));
  assert.match(r.problems[0].message, new RegExp(`${LOGIN_TASK}.*has no "Verify:" line`));
});

test('a repeated task id is a problem that names the id and both lines', () => {
  const text = tasksText().replace(RESET_TASK, LOGIN_TASK);
  const r = parseTasks(text);
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0].message, new RegExp(`the task id ${LOGIN_TASK} is used twice \\(lines 5 and 11\\)`));
  assert.equal(r.problems[0].file, 'tasks.md');
});

test('an unticked and a ticked task parse as open and done', () => {
  const r = parseTasks(tasksText({ login: ' ', reset: 'x' }));
  assert.deepEqual(r.tasks.map((t) => t.done), [false, true]);
});

test('an uppercase X parses as done', () => {
  assert.equal(parseTasks(tasksText({ login: 'X' })).tasks[0].done, true);
});

test('a task before any group is a problem', () => {
  const r = parseTasks(`- [ ] ${LOGIN_TASK} Title\n  Satisfies: AC-a (steps 1.1)\n  Verify: v\n`);
  assert.match(r.problems[0].message, /is not under a "## <flow>" group/);
});

test('a "# Tasks" title line before the first group is ignored', () => {
  const r = parseTasks(tasksText());
  assert.ok(tasksText().startsWith('# Tasks\n'));
  assert.deepEqual(r.problems, []);
  assert.equal(r.tasks.length, 2);
});

test('a blank line between two tasks still reads both tasks', () => {
  const text = tasksText().replace('## reset\n\n', '\n');
  const r = parseTasks(text);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.tasks.map((t) => t.id), [LOGIN_TASK, RESET_TASK]);
  assert.deepEqual(r.tasks.map((t) => t.flow), ['login', 'login']);
});

test('bare step ids separated by commas parse as separate steps', () => {
  assert.deepEqual(parseTasks(tasksText().replace('(steps 1.1, 2.5)', '(steps 1.1,2.5,3.5)')).tasks[0].steps, ['1.1', '2.5', '3.5']);
});

test('bare step ids separated by spaces parse as separate steps', () => {
  assert.deepEqual(parseTasks(tasksText().replace('(steps 1.1, 2.5)', '(steps 1.1 2.5 3.5)')).tasks[0].steps, ['1.1', '2.5', '3.5']);
});

test('a Satisfies line without steps is a problem that names the task', () => {
  const r = parseTasks(tasksText().replace(' (steps 1.1, 2.5)', ''));
  assert.match(r.problems[0].message, new RegExp(`${LOGIN_TASK}.*names no step`));
});
