import test from 'node:test';
import assert from 'node:assert/strict';
import { newStory, loadBacklog, serializeBacklog, COLUMNS } from '../src/user-story-generator/model.js';
import { renumber } from '../src/user-story-generator/ids.js';
import {
  isPlaceholder, nextPlaceholder, removeProposed, reorderProposed, moveProposed, acceptProposed,
} from '../src/user-story-generator/proposals.js';

let n = 1000;
const st = (epic, extra = {}) => Object.assign(newStory(COLUMNS), { id: ++n, epic, codedEpic: epic, ...extra });
// A proposed story: placeholder code, as loaded with placeholderIds.
const prop = (code, epic, extra = {}) => st(epic, { code, title: `T ${code}`, ...extra });
const backlogOf = (...stories) => renumber(stories);
const codes = (stories) => stories.map((s) => s.code);
const accept = (backlog, proposed, which, headers = COLUMNS) =>
  acceptProposed(backlog, proposed, new Set(which.map((c) => proposed.find((s) => s.code === c).id)), headers);

test('isPlaceholder', () => {
  assert.equal(isPlaceholder('NEW-12'), true);
  assert.equal(isPlaceholder('IAM-0001'), false);
  assert.equal(isPlaceholder('NEW-'), false);
});

test('nextPlaceholder: one above the highest in proposals', () => {
  assert.equal(nextPlaceholder([], []), 'NEW-1');
  assert.equal(nextPlaceholder([prop('NEW-1', 'A'), prop('NEW-4', 'A')], []), 'NEW-5');
});

test('nextPlaceholder: a number only the backlog still names is not reused', () => {
  const backlog = backlogOf(st('Billing', { dependsOn: ['NEW-5'] }));
  assert.equal(nextPlaceholder([prop('NEW-2', 'A')], backlog), 'NEW-6');
  const ambiguous = [st('Billing', { ambiguous: ['NEW-9'], dependsOn: ['NEW-9'] })];
  assert.equal(nextPlaceholder([], ambiguous), 'NEW-10');
});

test('removeProposed: removes the story and strips its code from the others, no ID changes', () => {
  const a = prop('NEW-1', 'A');
  const b = prop('NEW-2', 'A', { dependsOn: ['NEW-1', 'IAM-0001'] });
  const c = prop('NEW-3', 'B');
  const out = removeProposed([a, b, c], a.id);
  assert.deepEqual(codes(out), ['NEW-2', 'NEW-3']);
  assert.deepEqual(out[0].dependsOn, ['IAM-0001']);
  assert.equal(out[1], c);
  assert.equal(removeProposed([a, b, c], 0).length, 3);
});

test('reorderProposed: array move only, codes untouched', () => {
  const [a, b, c] = [prop('NEW-1', 'A'), prop('NEW-2', 'B'), prop('NEW-3', 'A')];
  assert.deepEqual(codes(reorderProposed([a, b, c], c.id, a.id)), ['NEW-3', 'NEW-1', 'NEW-2']);
  assert.deepEqual(codes(reorderProposed([a, b, c], a.id, null)), ['NEW-2', 'NEW-3', 'NEW-1']);
  const same = [a, b, c];
  assert.equal(reorderProposed(same, a.id, b.id), same);
});

test('accept one: goes to the end of its Epic under a middle Feature (7 -> 8th)', () => {
  const seven = Array.from({ length: 7 }, (_, i) => st('Billing', { feature: i < 3 ? 'Invoices' : 'Payments' }));
  const backlog = backlogOf(...seven, st('Reports'));
  const p = prop('NEW-1', 'Billing', { feature: 'Invoices' });
  const r = accept(backlog, [p], ['NEW-1']);
  assert.deepEqual(codes(r.backlog), ['B-0001', 'B-0002', 'B-0003', 'B-0004', 'B-0005', 'B-0006', 'B-0007', 'B-0008', 'R-0001']);
  assert.equal(r.backlog[7].feature, 'Invoices');
  assert.equal(r.backlog[7].id, p.id);
  assert.deepEqual(r.proposals, []);
  assert.deepEqual(codes(r.accepted), ['B-0008']);
});

test('accept: a new Epic starts at the end of the backlog', () => {
  const backlog = backlogOf(st('Billing'), st('Reports'));
  const r = accept(backlog, [prop('NEW-1', 'Identity & Access')], ['NEW-1']);
  assert.deepEqual(codes(r.backlog), ['B-0001', 'R-0001', 'IA-0001']);
});

test('accept several: file order kept within an Epic, the rest stay proposed', () => {
  const backlog = backlogOf(st('Billing'), st('Reports'));
  const proposed = [prop('NEW-3', 'Billing'), prop('NEW-1', 'Reports'), prop('NEW-2', 'Billing'), prop('NEW-4', 'Billing')];
  const r = accept(backlog, proposed, ['NEW-3', 'NEW-2', 'NEW-1']);
  assert.deepEqual(r.backlog.map((s) => s.title), ['', 'T NEW-3', 'T NEW-2', '', 'T NEW-1']);
  assert.deepEqual(codes(r.backlog), ['B-0001', 'B-0002', 'B-0003', 'R-0001', 'R-0002']);
  assert.deepEqual(codes(r.proposals), ['NEW-4']);
});

test('accept: a blank Epic is refused and nothing moves', () => {
  const backlog = backlogOf(st('Billing'));
  const proposed = [prop('NEW-1', 'Billing'), prop('NEW-2', '  ', { title: 'Orphan' })];
  const r = accept(backlog, proposed, ['NEW-1', 'NEW-2']);
  assert.match(r.error, /NEW-2 "Orphan".*Epic/);
  assert.equal(r.backlog, undefined);
  assert.equal(accept(backlog, proposed, ['NEW-1']).error, undefined);
  assert.match(acceptProposed(backlog, proposed, new Set(), COLUMNS).error, /no proposed story/);
});

test('accept: unknown columns are kept and cells padded to the backlog headers', () => {
  const headers = [...COLUMNS, 'Jira Key'];
  const p = prop('NEW-1', 'Billing', { cells: [...COLUMNS.map(() => ''), 'ABC-9'] });
  const short = prop('NEW-2', 'Billing', { cells: ['x'] });
  const r = acceptProposed([], [p, short], new Set([p.id, short.id]), headers);
  assert.equal(r.backlog[0].cells[COLUMNS.length], 'ABC-9');
  assert.equal(r.backlog[1].cells.length, headers.length);
  assert.equal(r.backlog[0].epic, 'Billing');
});

test('accept: inputs are not mutated', () => {
  const backlog = backlogOf(st('Billing'));
  const proposed = [prop('NEW-1', 'Billing ', { dependsOn: ['B-0001'] }), prop('NEW-2', 'Billing')];
  const snapshot = JSON.stringify([backlog, proposed]);
  accept(backlog, proposed, ['NEW-1']);
  assert.equal(JSON.stringify([backlog, proposed]), snapshot);
});

test('accept: a link to a backlog story stays on the same story after renumber', () => {
  const backlog = backlogOf(st('Billing'), st('Reports'));
  const target = backlog[1]; // R-0001
  const p = prop('NEW-1', 'Reports', { dependsOn: [target.code] });
  const r = accept(backlog, [p], ['NEW-1']);
  const added = r.backlog.find((s) => s.id === p.id);
  assert.deepEqual(added.dependsOn, ['R-0001']);
  // an insert before the target moves its ID; the link follows
  const first = backlogOf(st('Reports'), st('Reports'));
  const q = prop('NEW-1', 'Billing', { dependsOn: [first[1].code] });
  const r2 = accept(first, [q], ['NEW-1']);
  assert.deepEqual(r2.backlog.find((s) => s.id === q.id).dependsOn, ['R-0002']);
});

test('accept: links among stories accepted together are remapped', () => {
  const backlog = backlogOf(st('Billing'));
  const proposed = [prop('NEW-1', 'Billing'), prop('NEW-2', 'Billing', { dependsOn: ['NEW-1'] })];
  const r = accept(backlog, proposed, ['NEW-1', 'NEW-2']);
  assert.deepEqual(codes(r.backlog), ['B-0001', 'B-0002', 'B-0003']);
  assert.deepEqual(r.backlog[2].dependsOn, ['B-0002']);
});

test('accept one at a time: the placeholder stays, then a later accept rewrites it', () => {
  const backlog = backlogOf(st('Billing'));
  const proposed = [prop('NEW-1', 'Reports'), prop('NEW-2', 'Billing', { dependsOn: ['NEW-1'] })];
  const first = accept(backlog, proposed, ['NEW-2']);
  const waiting = first.backlog.find((s) => s.code === 'B-0002');
  assert.deepEqual(waiting.dependsOn, ['NEW-1']);
  assert.deepEqual(codes(first.proposals), ['NEW-1']);
  const second = accept(first.backlog, first.proposals, ['NEW-1']);
  assert.deepEqual(second.backlog.find((s) => s.title === 'T NEW-2').dependsOn, ['R-0001']);
});

test('accept: remaining proposals that depended on an accepted story are re-pointed', () => {
  const backlog = backlogOf(st('Billing'));
  const proposed = [prop('NEW-1', 'Billing'), prop('NEW-3', 'Billing', { dependsOn: ['NEW-1', 'NEW-9'] })];
  const r = accept(backlog, proposed, ['NEW-1']);
  assert.deepEqual(r.proposals[0].dependsOn, ['B-0002', 'NEW-9']);
  assert.equal(r.proposals[0].code, 'NEW-3');
});

test('accept: a cycle is refused and nothing moves', () => {
  // the backlog story already waits for NEW-1; NEW-1 depends on that story
  const backlog = backlogOf(st('Billing', { dependsOn: ['NEW-1'] }));
  const p = prop('NEW-1', 'Billing', { dependsOn: ['B-0001'] });
  const r = accept(backlog, [p], ['NEW-1']);
  assert.match(r.error, /dependency cycle/);
  assert.equal(r.backlog, undefined);
});

test('accept: a cycle that already exists in the backlog does not block an unrelated accept', () => {
  const [a, b] = backlogOf(st('Billing'), st('Billing'));
  const cyclic = [{ ...a, dependsOn: [b.code] }, { ...b, dependsOn: [a.code] }];
  const r = accept(cyclic, [prop('NEW-1', 'Reports')], ['NEW-1']);
  assert.equal(r.error, undefined);
});

test('round trip: an accepted backlog serializes with real IDs and the proposals file keeps its placeholders', () => {
  const backlog = loadBacklog('ID,Epic,Feature,Title,Depends On\r\nB-0001,Billing,Invoices,First,\r\n');
  const proposals = loadBacklog('ID,Epic,Feature,Title,Depends On\r\nNEW-2,Billing,Invoices,Second,B-0001\r\nNEW-3,Billing,Invoices,Third,NEW-2\r\n', { placeholderIds: true });
  const r = acceptProposed(backlog.stories, proposals.stories, new Set([proposals.stories[0].id]), backlog.headers);
  const back = loadBacklog(serializeBacklog({ ...backlog, stories: r.backlog }));
  assert.deepEqual(back.stories.map((s) => [s.code, s.dependsOn]), [['B-0001', []], ['B-0002', ['B-0001']]]);
  const left = loadBacklog(serializeBacklog({ ...proposals, stories: r.proposals }), { placeholderIds: true });
  assert.deepEqual(left.stories.map((s) => [s.code, s.dependsOn]), [['NEW-3', ['B-0002']]]);
});

test('moveProposed: joins an epic before a story or at the end of it, ID kept', () => {
  const [a, b, c] = [prop('NEW-1', 'A'), prop('NEW-2', 'B'), prop('NEW-3', 'A')];
  const toB = moveProposed([a, b, c], a.id, 'B', null);
  assert.deepEqual(codes(toB), ['NEW-2', 'NEW-1', 'NEW-3']);
  assert.equal(toB[1].epic, 'B');
  assert.equal(toB[1].codedEpic, 'B');
  assert.deepEqual(codes(moveProposed([a, b, c], c.id, 'A', a.id)), ['NEW-3', 'NEW-1', 'NEW-2']);
  assert.deepEqual(codes(moveProposed([a, b, c], a.id, 'New epic', null)), ['NEW-2', 'NEW-3', 'NEW-1']);
  const same = [a, b, c];
  assert.equal(moveProposed(same, a.id, 'A', a.id), same);
  assert.equal(moveProposed(same, c.id, 'A', null), same); // already last of its epic
});
