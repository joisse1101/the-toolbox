import test from 'node:test';
import assert from 'node:assert/strict';
import { countTasks } from '../../skills/jois-story-plan/diagrams/tasks.js';

test('- [x] and - [X] count as done and - [ ] as open', () => {
  assert.deepEqual(countTasks('- [x] T-a-one One\n- [X] T-a-two Two\n- [ ] T-a-three Three\n'), { done: 2, total: 3 });
});

test('a line without a checkbox is not counted', () => {
  const text = '# Tasks\n\n## flow\n\n- a plain bullet\n- [ ] T-a-one One\n  Satisfies: AC-a-one (steps 1.1)\n  Verify: v\n';
  assert.deepEqual(countTasks(text), { done: 0, total: 1 });
});

test('an empty text counts zero of zero', () => {
  assert.deepEqual(countTasks(''), { done: 0, total: 0 });
});
