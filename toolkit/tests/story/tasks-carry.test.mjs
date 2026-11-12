import test from 'node:test';
import assert from 'node:assert/strict';
import { carryTicks, parseTasks } from '../../skills/jois-story-plan/diagrams/tasks.js';
import { document, tasksText, CURRENT_TASK, BEST_TASK } from './tasks-fixture.mjs';

const carry = (over) => carryTicks({ oldTasksText: tasksText({ current: 'x', best: 'x' }), oldDocument: document, newTasksText: tasksText(), newDocument: document, ...over });
const doneIds = (text) => parseTasks(text).tasks.filter((t) => t.done).map((t) => t.id);

test('a ticked task is written ticked when its criterion text is unchanged', () => {
  const r = carry();
  assert.deepEqual(doneIds(r.text), [CURRENT_TASK, BEST_TASK]);
  assert.deepEqual([r.reset, r.dropped], [[], []]);
});

test('a ticked task whose criterion was reworded is written unticked and listed as reset with its title', () => {
  const reworded = document.replace('then it shows a streak of 3.', 'then it shows a streak of 4.');
  const r = carry({ newDocument: reworded });
  assert.deepEqual(doneIds(r.text), [BEST_TASK]);
  assert.deepEqual(r.reset, [{ id: CURRENT_TASK, title: 'Show the current streak of a habit' }]);
});

test('a ticked task the new file no longer holds is listed as dropped with its title', () => {
  const r = carry({ newTasksText: tasksText().replace(BEST_TASK, 'T-streaks-other') });
  assert.deepEqual(r.dropped, [{ id: BEST_TASK, title: 'Show the best streak of a habit' }]);
});

test('a renamed task id is written unticked, and the old id is dropped', () => {
  const r = carry({ newTasksText: tasksText().replace(CURRENT_TASK, 'T-streaks-current-page') });
  assert.deepEqual(doneIds(r.text), [BEST_TASK]);
  assert.deepEqual(r.dropped.map((t) => t.id), [CURRENT_TASK]);
});

test('a task unticked in the old file stays unticked', () => {
  const r = carry({ oldTasksText: tasksText({ current: ' ', best: 'x' }) });
  assert.deepEqual(doneIds(r.text), [BEST_TASK]);
});

test('a tick sent in the new text is cleared when the old file did not tick the task', () => {
  const r = carry({ oldTasksText: tasksText(), newTasksText: tasksText({ current: 'x' }) });
  assert.deepEqual(doneIds(r.text), []);
});

test('carrying the output again with the same documents gives the same bytes', () => {
  const first = carry();
  const second = carryTicks({ oldTasksText: first.text, oldDocument: document, newTasksText: tasksText(), newDocument: document });
  assert.equal(second.text, first.text);
  assert.deepEqual([second.reset, second.dropped], [[], []]);
});

test('carrying an unticked file over itself changes no byte', () => {
  const same = tasksText();
  assert.equal(carryTicks({ oldTasksText: same, oldDocument: document, newTasksText: same, newDocument: document }).text, same);
});

test('only the checkbox characters change, and CRLF line endings stay', () => {
  const crlf = tasksText().replace(/\n/g, '\r\n');
  const r = carry({ newTasksText: crlf });
  assert.equal(r.text, tasksText({ current: 'x', best: 'x' }).replace(/\n/g, '\r\n'));
});
