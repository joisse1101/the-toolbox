import test from 'node:test';
import assert from 'node:assert/strict';
import { createRelinkQueue } from '#frontend/src/shared/lib/relink-queue.ts';
import type { RelinkCall } from '#frontend/src/shared/lib/relink-queue.ts';
import type { RelinkReply } from '#shared/types.ts';

type Call = { from: string; changes: Record<string, string>; only: readonly string[] | undefined };

// A stub server: `reply(call, n)` answers the n-th call (0-based); every call is recorded.
function stub(reply: (call: Call, n: number) => RelinkReply | Error) {
  const calls: Call[] = [];
  const relink: RelinkCall = async (from, changes, only) => {
    const call = { from, changes: Object.fromEntries(changes), only };
    calls.push(call);
    const answer = reply(call, calls.length - 1);
    if (answer instanceof Error) throw answer;
    return answer;
  };
  return { calls, relink };
}

const ok: RelinkReply = { updated: ['b'], failed: [] };

test('runs the jobs one after the other in the order they were queued', async () => {
  const { calls, relink } = stub(() => ok);
  const queue = createRelinkQueue(relink);
  queue.enqueue('a', new Map([['A1', 'A2']]));
  queue.enqueue('a', new Map([['A2', 'A3']]));
  queue.enqueue('c', new Map([['C1', '']]));
  assert.deepEqual(await queue.run(), { ok: true });
  assert.deepEqual(calls.map((c) => [c.from, c.changes]), [['a', { A1: 'A2' }], ['a', { A2: 'A3' }], ['c', { C1: '' }]]);
  assert.ok(queue.isEmpty());
});

test('does not start a job before the previous one has answered', async () => {
  let release = (): void => {};
  let started = 0;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const relink: RelinkCall = async () => {
    started++;
    await gate;
    return ok;
  };
  const queue = createRelinkQueue(relink);
  queue.enqueue('a', new Map([['A1', 'A2']]));
  queue.enqueue('a', new Map([['A2', 'A3']]));
  const run = queue.run();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 1);
  release();
  await run;
  assert.equal(started, 2);
});

test('shares one run between callers that ask while it is going', async () => {
  const { calls, relink } = stub(() => ok);
  const queue = createRelinkQueue(relink);
  queue.enqueue('a', new Map([['A1', 'A2']]));
  const [first, second] = await Promise.all([queue.run(), queue.run()]);
  assert.deepEqual(first, { ok: true });
  assert.deepEqual(second, { ok: true });
  assert.equal(calls.length, 1);
});

test('stops at a failed job, names its file and keeps the later jobs waiting', async () => {
  const { calls, relink } = stub(() => ({ updated: ['b'], failed: [{ name: 'c', file: 'user-stories.csv', message: 'File is open in another program.' }] }));
  const queue = createRelinkQueue(relink);
  queue.enqueue('a', new Map([['A1', 'A2']]));
  queue.enqueue('a', new Map([['A2', 'A3']]));
  const result = await queue.run();
  assert.deepEqual(result, { ok: false, message: 'c/user-stories.csv: File is open in another program.' });
  assert.equal(calls.length, 1);
  assert.ok(!queue.isEmpty());
});

test('retries a failed job only for the backlogs that failed, then runs the later jobs', async () => {
  const failure = { name: 'c', file: 'user-stories.csv', message: 'locked' };
  const { calls, relink } = stub((_call, n) => (n === 0 ? { updated: ['b'], failed: [failure] } : ok));
  const queue = createRelinkQueue(relink);
  queue.enqueue('a', new Map([['A1', 'A2']]));
  queue.enqueue('a', new Map([['A2', 'A3']]));
  assert.equal((await queue.run()).ok, false);
  assert.deepEqual(await queue.run(), { ok: true });
  assert.deepEqual(calls.map((c) => [c.changes, c.only]), [[{ A1: 'A2' }, undefined], [{ A1: 'A2' }, ['c']], [{ A2: 'A3' }, undefined]]);
});

test('narrows again when a retry fails for fewer backlogs, and never re-runs a done one', async () => {
  const fail = (name: string) => ({ name, file: 'user-stories.csv', message: 'locked' });
  const answers: RelinkReply[] = [
    { updated: [], failed: [fail('b'), fail('c'), fail('c')] },
    { updated: ['b'], failed: [fail('c')] },
    ok,
  ];
  const { calls, relink } = stub((_call, n) => answers[n]!);
  const queue = createRelinkQueue(relink);
  queue.enqueue('a', new Map([['A1', 'A2']]));
  await queue.run();
  await queue.run();
  await queue.run();
  assert.deepEqual(calls.map((c) => c.only), [undefined, ['b', 'c'], ['c']]);
});

test('keeps a job as it is when the call throws, and runs it again whole', async () => {
  const { calls, relink } = stub((_call, n) => (n === 0 ? new Error('Cannot reach the local server.') : ok));
  const queue = createRelinkQueue(relink);
  queue.enqueue('a', new Map([['A1', 'A2']]));
  assert.deepEqual(await queue.run(), { ok: false, message: 'Cannot reach the local server.' });
  assert.deepEqual(await queue.run(), { ok: true });
  assert.deepEqual(calls.map((c) => c.only), [undefined, undefined]);
});

test('an empty queue runs to ok without calling the server', async () => {
  const { calls, relink } = stub(() => ok);
  assert.deepEqual(await createRelinkQueue(relink).run(), { ok: true });
  assert.equal(calls.length, 0);
});

test('a failure of the backlog\'s own design index is retried with only naming that backlog', async () => {
  const failure = { name: 'a', file: 'design-index.csv', message: 'locked' };
  const { calls, relink } = stub((_call, n) => (n === 0 ? { updated: ['b'], failed: [failure] } : ok));
  const queue = createRelinkQueue(relink);
  queue.enqueue('a', new Map([['A1', 'A2'], ['A2', 'A1']]));
  assert.equal((await queue.run()).ok, false);
  assert.deepEqual(await queue.run(), { ok: true });
  assert.deepEqual(calls.map((c) => c.only), [undefined, ['a']]);
});
