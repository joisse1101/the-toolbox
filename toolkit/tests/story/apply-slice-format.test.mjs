import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTasks, checkTasks, countTasks } from '../../skills/jois-story-plan/diagrams/tasks.js';
import { document, LOGIN_TASK, RESET_TASK } from './tasks-fixture.mjs';

// The slice task format that /jois-code:apply slice <backlog>/<slice> relies on, read from the sample slice
// (a mock slice in the repo, never a real backlog).

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SLICE = path.join(HERE, 'fixtures', 'sample', 'slices', 'sign-in');
const APPLY = path.join(HERE, '..', '..', 'commands', 'jois-code', 'apply.md');
const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const tasksText = read(path.join(SLICE, 'tasks.md'));

// What the apply command does after a report: tick the box and copy the clause on a line after the Verify: line.
const tick = (text, id, clause) =>
  text.split('\n').map((line) => (line.startsWith('- [ ] ' + id) ? line.replace('- [ ]', '- [x]') : line)).join('\n').replace(new RegExp(`(- \\[x\\] ${id}[^\\n]*\\n(?:  [^\\n]*\\n)*?  Verify: [^\\n]*\\n)`), `$1  ${clause}\n`);

test('the sample slice has the groups in file order, each with one pending task', () => {
  const r = parseTasks(tasksText);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.groups.map((g) => g.flow), ['login', 'reset']);
  assert.deepEqual(r.tasks.filter((t) => !t.done).map((t) => t.id), [LOGIN_TASK, RESET_TASK]);
});

test('every task of the sample slice carries Satisfies and Verify lines and a T-<slice>-<name> id', () => {
  const r = parseTasks(tasksText);
  for (const t of r.tasks) {
    assert.match(t.id, /^T-sign-in-[a-z0-9-]+$/);
    assert.ok(t.acIds.length > 0, `${t.id} names a criterion`);
    assert.notEqual(t.verify, '');
  }
  assert.deepEqual(checkTasks({ tasksText, document, slice: 'sign-in' }), []);
});

test('ticking one task and writing its clause after the Verify line leaves the file valid and ticks only that task', () => {
  const clause = `${LOGIN_TASK} (result: node --test -> 3 passed)`;
  const ticked = tick(tasksText, LOGIN_TASK, clause);
  const lines = ticked.split('\n');
  const verifyAt = lines.findIndex((l) => l.startsWith('  Verify: sign in'));
  assert.equal(lines[verifyAt + 1], `  ${clause}`);
  const r = parseTasks(ticked);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.tasks.map((t) => [t.id, t.done]), [[LOGIN_TASK, true], [RESET_TASK, false]]);
  assert.deepEqual(countTasks(ticked), { done: 1, total: 2 });
  assert.deepEqual(checkTasks({ tasksText: ticked, document, slice: 'sign-in' }), []);
});

test('the apply command names the slice form and its one narrow script entry, and the entry matches the script path', () => {
  const text = read(APPLY);
  const allowed = /^allowed-tools: (.*)$/m.exec(text)[1];
  const entries = [...allowed.matchAll(/Bash\(([^)]*)\)/g)].map((m) => m[1]);
  const entry = entries.find((e) => e.startsWith('node '));
  assert.ok(entry, 'has a node entry');
  assert.equal(entries.filter((e) => e.startsWith('node')).length, 1);
  const re = new RegExp(`^${entry.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  assert.ok(re.test('node /home/u/.claude/skills/jois-story-plan/read-diagrams.mjs accounts --slice sign-in'));
  assert.ok(re.test('node C:\\Users\\u\\.claude\\skills\\jois-story-plan\\read-diagrams.mjs accounts --slice sign-in'));
  assert.ok(!re.test('node other.mjs'));
  assert.match(text, /`\/jois-code:apply slice <backlog>\/<slice>`/);
});
