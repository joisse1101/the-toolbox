import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTasks, criteriaTable } from '../../skills/jois-story-plan/diagrams/tasks.js';
import { document, tasksText, CURRENT_TASK, BEST_TASK } from './tasks-fixture.mjs';

const check = (tasks) => checkTasks({ tasksText: tasks, document, slice: 'streaks' });
const messages = (tasks) => check(tasks).map((p) => p.message).join('\n');

test('the valid tasks pass every check', () => {
  assert.deepEqual(check(tasksText()), []);
});

test('the criteria table gives each row its AC id without bold marks, its story Title and its text', () => {
  const rows = criteriaTable(document);
  assert.deepEqual(rows.map((r) => [r.id, r.story, r.flow]), [
    ['AC-streaks-current', 'See the current streak', 'current'],
    ['AC-streaks-best', 'See the best streak', 'best'],
  ]);
  assert.match(rows[0].text, /^Given a habit checked off on each of the last 3 days, when I open the habit list/);
});

test('a group that is not a flow of the document is named', () => {
  const text = tasksText().replace('## best', '## logout');
  const problems = check(text);
  assert.match(problems[0].message, /the group "logout" is not a flow/);
  assert.equal(problems[0].file, 'tasks.md');
  assert.equal(problems[0].line, 9);
});

test('a task without Verify is refused and named', () => {
  assert.match(messages(tasksText().replace(/  Verify: build.*\n/, '')), new RegExp(`${BEST_TASK}.*has no "Verify:" line`));
});

test('a table row with no task names the AC id and its story by Title', () => {
  const text = tasksText().replace('AC-streaks-best', 'AC-streaks-current');
  assert.match(messages(text), /the AC id AC-streaks-best \(story "See the best streak"\) has no task/);
});

test('a task naming an AC id that is not in the table is named with that id', () => {
  const text = tasksText().replace('Satisfies: AC-streaks-current', 'Satisfies: AC-streaks-current, AC-streaks-ghost');
  assert.match(messages(text), new RegExp(`the task ${CURRENT_TASK} .* names the AC id AC-streaks-ghost, which is not a row`));
});

test('two tasks with one id are refused', () => {
  assert.match(messages(tasksText().replace(BEST_TASK, CURRENT_TASK)), /the task id T-streaks-current-count is used twice/);
});

test('a step id that is not in the flow diagram is named with its flow', () => {
  const text = tasksText().replace('(steps 1.1, 2.5)', '(steps 1.1, 9.9)');
  assert.match(messages(text), new RegExp(`${CURRENT_TASK}.*names the step 9\\.9, which the "### Sequence: current" diagram does not contain`));
});

test('a task naming two criteria passes when its steps are pooled from both rows', () => {
  // 3.5 is only in the current row's Steps, 2.7 only in the best row's; both exist in the current diagram
  const text = tasksText().replace('Satisfies: AC-streaks-current (steps 1.1, 2.5)', 'Satisfies: AC-streaks-current, AC-streaks-best (steps 3.5, 2.7)');
  assert.deepEqual(check(text), []);
});

test('a step that exists in the flow but is outside the row Steps column is not refused', () => {
  // 1.3 is in the current diagram, not in the Steps column of AC-streaks-current
  assert.deepEqual(check(tasksText().replace('(steps 1.1, 2.5)', '(steps 1.1, 1.3)')), []);
});

test('a step written with its flow as a prefix is refused naming the task and the step', () => {
  const problems = check(tasksText().replace('(steps 1.1, 2.5)', '(steps current 1.1, 2.5)'));
  const text = problems.map((p) => p.message).join('\n');
  assert.match(text, new RegExp(`${CURRENT_TASK}.*names the step current, which the "### Sequence: current" diagram does not contain`));
});

test('a task id that does not follow T-<slice>-<name> is refused', () => {
  assert.match(messages(tasksText().replace(CURRENT_TASK, 'T-other-current')), /the task id "T-other-current" must be T-streaks-<name> in kebab-case/);
});
