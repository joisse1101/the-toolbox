import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTasks, criteriaTable } from '../../skills/jois-story-plan/diagrams/tasks.js';
import { document, tasksText, LOGIN_TASK, RESET_TASK } from './tasks-fixture.mjs';

const check = (tasks) => checkTasks({ tasksText: tasks, document, slice: 'sign-in' });
const messages = (tasks) => check(tasks).map((p) => p.message).join('\n');

test('the valid tasks pass every check', () => {
  assert.deepEqual(check(tasksText()), []);
});

test('the criteria table gives each row its AC id without bold marks, its story Title and its text', () => {
  const rows = criteriaTable(document);
  assert.deepEqual(rows.map((r) => [r.id, r.story, r.flow]), [
    ['AC-sign-in-dashboard', 'Sign in with email', 'login'],
    ['AC-sign-in-reset-link', 'Reset a password', 'reset'],
  ]);
  assert.match(rows[0].text, /^Given a registered member, when they sign in with the right password/);
});

test('a group that is not a flow of the document is named', () => {
  const text = tasksText().replace('## reset', '## logout');
  const problems = check(text);
  assert.match(problems[0].message, /the group "logout" is not a flow/);
  assert.equal(problems[0].file, 'tasks.md');
  assert.equal(problems[0].line, 9);
});

test('a task without Verify is refused and named', () => {
  assert.match(messages(tasksText().replace(/  Verify: ask.*\n/, '')), new RegExp(`${RESET_TASK}.*has no "Verify:" line`));
});

test('a table row with no task names the AC id and its story by Title', () => {
  const text = tasksText().replace('AC-sign-in-reset-link', 'AC-sign-in-dashboard');
  assert.match(messages(text), /the AC id AC-sign-in-reset-link \(story "Reset a password"\) has no task/);
});

test('a task naming an AC id that is not in the table is named with that id', () => {
  const text = tasksText().replace('Satisfies: AC-sign-in-dashboard', 'Satisfies: AC-sign-in-dashboard, AC-sign-in-ghost');
  assert.match(messages(text), new RegExp(`the task ${LOGIN_TASK} .* names the AC id AC-sign-in-ghost, which is not a row`));
});

test('two tasks with one id are refused', () => {
  assert.match(messages(tasksText().replace(RESET_TASK, LOGIN_TASK)), /the task id T-sign-in-login-dashboard is used twice/);
});

test('a step id that is not in the flow diagram is named with its flow', () => {
  const text = tasksText().replace('(steps 1.1, 2.5)', '(steps 1.1, 9.9)');
  assert.match(messages(text), new RegExp(`${LOGIN_TASK}.*names the step 9\\.9, which the "### Sequence: login" diagram does not contain`));
});

test('a task id that does not follow T-<slice>-<name> is refused', () => {
  assert.match(messages(tasksText().replace(LOGIN_TASK, 'T-other-login')), /the task id "T-other-login" must be T-sign-in-<name> in kebab-case/);
});
