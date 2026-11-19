import test from 'node:test';
import assert from 'node:assert/strict';
import { newStory, loadBacklog, serializeBacklog, COLUMNS } from '#shared/backlog/model.ts';
import { renumber, idChanges, relinkStories } from '#shared/backlog/ids.ts';
import {
  isPlaceholder, nextPlaceholder, removeProposed, reorderProposed, moveProposed, acceptProposed, moveToProposed, migrateStories,
} from '#shared/backlog/proposals.ts';
import type { Story } from '#shared/types.ts';

type Accepted = Exclude<ReturnType<typeof acceptProposed>, { error: string }> & { error?: undefined };
type Moved = Exclude<ReturnType<typeof moveToProposed>, { error: string }> & { error?: undefined };
type Refused = { error: string; backlog?: undefined; moved?: undefined }; // the reply of a refused accept or move

let n = 1000;
const st = (epic: string, extra: Partial<Story> = {}) => Object.assign(newStory(COLUMNS), { id: ++n, epic, codedEpic: epic, ...extra });
// A proposed story: placeholder code, as loaded with placeholderIds.
const prop = (code: string, epic: string, extra: Partial<Story> = {}) => st(epic, { code, title: `T ${code}`, ...extra });
const INITIALS = 'B1';
const backlogOf = (...stories: Story[]) => renumber(stories, INITIALS);
const codes = (stories: Story[]) => stories.map((s) => s.code);
const accept = (backlog: Story[], proposed: Story[], which: string[], headers: readonly string[] = COLUMNS) =>
  acceptProposed(backlog, proposed, new Set(which.map((c) => proposed.find((s) => s.code === c)!.id)), headers, INITIALS);

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
  const r = accept(backlog, [p], ['NEW-1']) as Accepted;
  assert.deepEqual(codes(r.backlog), ['B1-B-0001', 'B1-B-0002', 'B1-B-0003', 'B1-B-0004', 'B1-B-0005', 'B1-B-0006', 'B1-B-0007', 'B1-B-0008', 'B1-R-0001']);
  assert.equal(r.backlog[7].feature, 'Invoices');
  assert.equal(r.backlog[7].id, p.id);
  assert.deepEqual(r.proposals, []);
  assert.deepEqual(codes(r.accepted), ['B1-B-0008']);
});

test('accept: a new Epic starts at the end of the backlog', () => {
  const backlog = backlogOf(st('Billing'), st('Reports'));
  const r = accept(backlog, [prop('NEW-1', 'Identity & Access')], ['NEW-1']) as Accepted;
  assert.deepEqual(codes(r.backlog), ['B1-B-0001', 'B1-R-0001', 'B1-IA-0001']);
});

test('accept several: file order kept within an Epic, the rest stay proposed', () => {
  const backlog = backlogOf(st('Billing'), st('Reports'));
  const proposed = [prop('NEW-3', 'Billing'), prop('NEW-1', 'Reports'), prop('NEW-2', 'Billing'), prop('NEW-4', 'Billing')];
  const r = accept(backlog, proposed, ['NEW-3', 'NEW-2', 'NEW-1']) as Accepted;
  assert.deepEqual(r.backlog.map((s) => s.title), ['', 'T NEW-3', 'T NEW-2', '', 'T NEW-1']);
  assert.deepEqual(codes(r.backlog), ['B1-B-0001', 'B1-B-0002', 'B1-B-0003', 'B1-R-0001', 'B1-R-0002']);
  assert.deepEqual(codes(r.proposals), ['NEW-4']);
});

test('accept: a blank Epic is refused and nothing moves', () => {
  const backlog = backlogOf(st('Billing'));
  const proposed = [prop('NEW-1', 'Billing'), prop('NEW-2', '  ', { title: 'Orphan' })];
  const r = accept(backlog, proposed, ['NEW-1', 'NEW-2']) as Refused;
  assert.match(r.error, /NEW-2 "Orphan".*Epic/);
  assert.equal(r.backlog, undefined);
  assert.equal((accept(backlog, proposed, ['NEW-1']) as Accepted).error, undefined);
  assert.match((acceptProposed(backlog, proposed, new Set(), COLUMNS, INITIALS) as Refused).error, /no proposed story/);
});

test('accept: unknown columns are kept and cells padded to the backlog headers', () => {
  const headers = [...COLUMNS, 'Jira Key'];
  const p = prop('NEW-1', 'Billing', { cells: [...COLUMNS.map(() => ''), 'ABC-9'] });
  const short = prop('NEW-2', 'Billing', { cells: ['x'] });
  const r = acceptProposed([], [p, short], new Set([p.id, short.id]), headers, INITIALS) as Accepted;
  assert.equal(r.backlog[0].cells[COLUMNS.length], 'ABC-9');
  assert.equal(r.backlog[1].cells.length, headers.length);
  assert.equal(r.backlog[0].epic, 'Billing');
});

test('accept: inputs are not mutated', () => {
  const backlog = backlogOf(st('Billing'));
  const proposed = [prop('NEW-1', 'Billing ', { dependsOn: ['B1-B-0001'] }), prop('NEW-2', 'Billing')];
  const snapshot = JSON.stringify([backlog, proposed]);
  accept(backlog, proposed, ['NEW-1']);
  assert.equal(JSON.stringify([backlog, proposed]), snapshot);
});

test('accept: a link to a backlog story stays on the same story after renumber', () => {
  const backlog = backlogOf(st('Billing'), st('Reports'));
  const target = backlog[1]; // R-0001
  const p = prop('NEW-1', 'Reports', { dependsOn: [target.code] });
  const r = accept(backlog, [p], ['NEW-1']) as Accepted;
  const added = r.backlog.find((s) => s.id === p.id)!;
  assert.deepEqual(added.dependsOn, ['B1-R-0001']);
  // an insert before the target moves its ID; the link follows
  const first = backlogOf(st('Reports'), st('Reports'));
  const q = prop('NEW-1', 'Billing', { dependsOn: [first[1].code] });
  const r2 = accept(first, [q], ['NEW-1']) as Accepted;
  assert.deepEqual(r2.backlog.find((s) => s.id === q.id)!.dependsOn, ['B1-R-0002']);
});

test('accept: links among stories accepted together are remapped', () => {
  const backlog = backlogOf(st('Billing'));
  const proposed = [prop('NEW-1', 'Billing'), prop('NEW-2', 'Billing', { dependsOn: ['NEW-1'] })];
  const r = accept(backlog, proposed, ['NEW-1', 'NEW-2']) as Accepted;
  assert.deepEqual(codes(r.backlog), ['B1-B-0001', 'B1-B-0002', 'B1-B-0003']);
  assert.deepEqual(r.backlog[2].dependsOn, ['B1-B-0002']);
});

test('accept one at a time: the placeholder stays, then a later accept rewrites it', () => {
  const backlog = backlogOf(st('Billing'));
  const proposed = [prop('NEW-1', 'Reports'), prop('NEW-2', 'Billing', { dependsOn: ['NEW-1'] })];
  const first = accept(backlog, proposed, ['NEW-2']) as Accepted;
  const waiting = first.backlog.find((s) => s.code === 'B1-B-0002')!;
  assert.deepEqual(waiting.dependsOn, ['NEW-1']);
  assert.deepEqual(codes(first.proposals), ['NEW-1']);
  const second = accept(first.backlog, first.proposals, ['NEW-1']) as Accepted;
  assert.deepEqual(second.backlog.find((s) => s.title === 'T NEW-2')!.dependsOn, ['B1-R-0001']);
});

test('accept: remaining proposals that depended on an accepted story are re-pointed', () => {
  const backlog = backlogOf(st('Billing'));
  const proposed = [prop('NEW-1', 'Billing'), prop('NEW-3', 'Billing', { dependsOn: ['NEW-1', 'NEW-9'] })];
  const r = accept(backlog, proposed, ['NEW-1']) as Accepted;
  assert.deepEqual(r.proposals[0].dependsOn, ['B1-B-0002', 'NEW-9']);
  assert.equal(r.proposals[0].code, 'NEW-3');
});

test('accept: a cycle is refused and nothing moves', () => {
  // the backlog story already waits for NEW-1; NEW-1 depends on that story
  const backlog = backlogOf(st('Billing', { dependsOn: ['NEW-1'] }));
  const p = prop('NEW-1', 'Billing', { dependsOn: ['B1-B-0001'] });
  const r = accept(backlog, [p], ['NEW-1']) as Refused;
  assert.match(r.error, /dependency cycle/);
  assert.equal(r.backlog, undefined);
});

test('accept: a cycle that already exists in the backlog does not block an unrelated accept', () => {
  const [a, b] = backlogOf(st('Billing'), st('Billing'));
  const cyclic = [{ ...a, dependsOn: [b.code] }, { ...b, dependsOn: [a.code] }];
  const r = accept(cyclic, [prop('NEW-1', 'Reports')], ['NEW-1']) as Accepted;
  assert.equal(r.error, undefined);
});

test('round trip: an accepted backlog serializes with real IDs and the proposals file keeps its placeholders', () => {
  const backlog = loadBacklog('ID,Epic,Feature,Title,Depends On\r\nB1-B-0001,Billing,Invoices,First,\r\n', { initials: INITIALS });
  const proposals = loadBacklog('ID,Epic,Feature,Title,Depends On\r\nNEW-2,Billing,Invoices,Second,B1-B-0001\r\nNEW-3,Billing,Invoices,Third,NEW-2\r\n', { placeholderIds: true });
  const r = acceptProposed(backlog.stories, proposals.stories, new Set([proposals.stories[0].id]), backlog.headers, INITIALS) as Accepted;
  const back = loadBacklog(serializeBacklog({ ...backlog, stories: r.backlog }), { initials: INITIALS });
  assert.deepEqual(back.stories.map((s) => [s.code, s.dependsOn]), [['B1-B-0001', []], ['B1-B-0002', ['B1-B-0001']]]);
  const left = loadBacklog(serializeBacklog({ ...proposals, stories: r.proposals }), { placeholderIds: true });
  assert.deepEqual(left.stories.map((s) => [s.code, s.dependsOn]), [['NEW-3', ['B1-B-0002']]]);
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

test('moveToProposed: story leaves the backlog, joins proposals under a new placeholder, rest renumbered', () => {
  const b = backlogOf(st('Alpha', { title: 'a1' }), st('Alpha', { title: 'a2' }), st('Alpha', { title: 'a3' }));
  const target = b[1];
  const out = moveToProposed(b, [prop('NEW-2', 'Beta')], target.id, COLUMNS, INITIALS) as Moved;
  assert.deepEqual(out.backlog.map((s) => s.title), ['a1', 'a3']);
  assert.deepEqual(codes(out.backlog), ['B1-A-0001', 'B1-A-0002']);
  assert.deepEqual(codes(out.proposals), ['NEW-2', 'NEW-3']);
  assert.equal(out.moved.title, 'a2');
});

test('moveToProposed: links to the story follow it, own dependencies are kept and follow renumbering', () => {
  const b0 = backlogOf(st('Alpha', { title: 'a1' }), st('Alpha', { title: 'a2' }), st('Alpha', { title: 'a3' }));
  const b = renumber([b0[0], b0[1], { ...b0[2], dependsOn: ['B1-A-0002'] }, st('Alpha', { title: 'a4', dependsOn: ['B1-A-0003'] })], INITIALS);
  const withOwn = b.map((s) => (s.title === 'a2' ? { ...s, dependsOn: ['B1-A-0001'] } : s));
  const out = moveToProposed(withOwn, [prop('NEW-1', 'Beta', { dependsOn: ['B1-A-0003', 'B1-A-0002'] })], withOwn[1].id, COLUMNS, INITIALS) as Moved;
  const by = (t: string) => out.backlog.find((s) => s.title === t)!;
  assert.deepEqual(by('a3').dependsOn, ['NEW-2']);
  assert.equal(by('a3').code, 'B1-A-0002');
  assert.deepEqual(by('a4').dependsOn, ['B1-A-0002']);
  assert.deepEqual(out.moved.dependsOn, ['B1-A-0001']);
  assert.deepEqual(out.proposals[0].dependsOn, ['B1-A-0002', 'NEW-2']);
});

test('moveToProposed: placeholder skips numbers the backlog still names; a story without an ID is refused', () => {
  const b = backlogOf(st('Alpha', { dependsOn: ['NEW-7'] }), st('Alpha'));
  assert.equal((moveToProposed(b, [], b[1].id, COLUMNS, INITIALS) as Moved).moved.code, 'NEW-8');
  const noEpic = [st('')];
  assert.ok((moveToProposed(noEpic, [], noEpic[0].id, COLUMNS, INITIALS) as Refused).error);
});

test('moveToProposed then acceptProposed: back at the end of its Epic, links follow back', () => {
  const b = backlogOf(st('Alpha', { title: 'a1' }), st('Alpha', { title: 'a2' }), st('Alpha', { title: 'a3' }));
  b[2] = { ...b[2], dependsOn: ['B1-A-0002'] };
  const out = moveToProposed(b, [], b[1].id, COLUMNS, INITIALS) as Moved;
  const back = acceptProposed(out.backlog, out.proposals, new Set([out.moved.id]), COLUMNS, INITIALS) as Accepted;
  assert.deepEqual(back.backlog.map((s) => s.title), ['a1', 'a3', 'a2']);
  assert.deepEqual(back.backlog.find((s) => s.title === 'a3')!.dependsOn, ['B1-A-0003']);
});

test('moveToProposed refuses a frozen story and moves nothing', () => {
  const b = backlogOf(st('Alpha'), st('Alpha'));
  const frozen = [{ ...b[0], frozen: true }, b[1]];
  const out = moveToProposed(frozen, [], frozen[0].id, COLUMNS, INITIALS) as Refused;
  assert.match(out.error, /frozen story cannot be moved/);
  assert.equal(out.backlog, undefined);
});

test('acceptProposed leaves the accepted story unfrozen, and moveToProposed leaves the moved story unfrozen', () => {
  const b = backlogOf(st('Alpha'), st('Alpha'));
  const p = prop('NEW-1', 'Alpha', { frozen: true });
  const accepted = acceptProposed(b, [p], new Set([p.id]), COLUMNS, INITIALS) as Accepted;
  assert.equal(accepted.accepted[0].frozen, false);
  assert.ok(accepted.backlog.every((s) => !s.frozen));
  const out = moveToProposed(b, [], b[1].id, COLUMNS, INITIALS) as Moved;
  assert.equal(out.moved.frozen, false);
  assert.ok(out.proposals.every((s) => !s.frozen));
});

test('a frozen story among the backlog keeps its ID when another story is accepted or moved', () => {
  const b = backlogOf(st('Alpha'), st('Alpha'), st('Alpha'));
  const frozen = renumber([b[0], { ...b[1], frozen: true }, b[2]], INITIALS);
  const p = prop('NEW-1', 'Alpha');
  const accepted = acceptProposed(frozen, [p], new Set([p.id]), COLUMNS, INITIALS) as Accepted;
  assert.equal(accepted.backlog.find((s) => s.id === frozen[1].id)!.code, 'B1-A-0002');
  const out = moveToProposed(frozen, [], frozen[0].id, COLUMNS, INITIALS) as Moved;
  assert.equal(out.backlog.find((s) => s.id === frozen[1].id)!.code, 'B1-A-0002');
});

test('acceptProposed refuses a benched story and moves nothing, for a selection and for all', () => {
  const b = backlogOf(st('Alpha'));
  const ok = prop('NEW-1', 'Alpha');
  const parked = prop('NEW-2', 'Alpha', { benched: true });
  for (const which of [[parked], [ok, parked]]) {
    const r = acceptProposed(b, [ok, parked], new Set(which.map((s) => s.id)), COLUMNS, INITIALS) as Refused;
    assert.match(r.error, /NEW-2 "T NEW-2" is benched/);
    assert.equal(r.backlog, undefined);
  }
});

test('acceptProposed: open questions do not block and the cell travels both ways', () => {
  const clar = [{ q: 'Which format?', a: '' }];
  const p = prop('NEW-1', 'Alpha', { clarifications: clar });
  const acc = acceptProposed(backlogOf(st('Alpha')), [p], new Set([p.id]), COLUMNS, INITIALS) as Accepted;
  assert.equal(acc.error, undefined);
  assert.deepEqual(acc.accepted[0].clarifications, clar);
  assert.equal(acc.accepted[0].benched, false);
  const back = moveToProposed(acc.backlog, [], acc.accepted[0].id, COLUMNS, INITIALS) as Moved;
  assert.deepEqual(back.moved.clarifications, clar);
});

// ---------- migrateStories ----------

type Migrated = Exclude<ReturnType<typeof migrateStories>, { error: string }> & { error?: undefined };
const TARGET_INITIALS = 'B3';
const targetOf = (...stories: Story[]) => renumber(stories, TARGET_INITIALS);
const migrate = (source: Story[], target: Story[], which: Story[], sourceHeaders: string[] = [...COLUMNS], targetHeaders: string[] = [...COLUMNS]) =>
  migrateStories({
    source: { stories: source, headers: sourceHeaders },
    target: { stories: target, headers: targetHeaders },
    ids: new Set(which.map((s) => s.id)),
    sourceInitials: INITIALS,
    targetInitials: TARGET_INITIALS,
  });

test('migrate: joins the end of an existing Epic under another Feature', () => {
  const source = backlogOf(st('Billing', { feature: 'Invoices' }));
  const target = targetOf(...Array.from({ length: 4 }, () => st('Billing')), st('Reports'));
  const r = migrate(source, target, [source[0]]) as Migrated;
  assert.deepEqual(codes(r.target), ['B3-B-0001', 'B3-B-0002', 'B3-B-0003', 'B3-B-0004', 'B3-B-0005', 'B3-R-0001']);
  assert.equal(r.target[4].feature, 'Invoices');
  assert.deepEqual(codes(r.source), []);
});

test('migrate: a new Epic starts at the end of the target', () => {
  const source = backlogOf(st('Search'));
  const target = targetOf(st('Billing'), st('Reports'));
  const r = migrate(source, target, [source[0]]) as Migrated;
  assert.deepEqual(codes(r.target), ['B3-B-0001', 'B3-R-0001', 'B3-S-0001']);
});

test('migrate: several stories keep their relative order', () => {
  const source = backlogOf(st('Billing', { title: 'a' }), st('Reports', { title: 'x' }), st('Billing', { title: 'b' }), st('Billing', { title: 'c' }));
  const target = targetOf(st('Billing', { title: 'old' }), st('Reports', { title: 'old2' }));
  const r = migrate(source, target, [source[3], source[0], source[2]]) as Migrated;
  assert.deepEqual(r.target.map((s) => s.title), ['old', 'a', 'b', 'c', 'old2']);
  assert.deepEqual(codes(r.target), ['B3-B-0001', 'B3-B-0002', 'B3-B-0003', 'B3-B-0004', 'B3-R-0001']);
  assert.deepEqual(codes(r.source), ['B1-R-0001']);
});

test('migrate: fields and unknown columns move unchanged, the target gains the column', () => {
  const sourceHeaders = [...COLUMNS, 'Owner'];
  const moving = st('Billing', {
    notes: 'keep me', cells: [...COLUMNS.map(() => ''), 'Ann'],
    clarifications: [{ q: 'q1', a: 'a1' }, { q: 'q2', a: 'a2' }],
  });
  const source = backlogOf(moving);
  const target = targetOf(st('Billing'));
  const r = migrate(source, target, [source[0]], sourceHeaders) as Migrated;
  assert.deepEqual(r.targetHeaders, [...COLUMNS, 'Owner']);
  const copy = r.target[1];
  assert.equal(copy.notes, 'keep me');
  assert.deepEqual(copy.clarifications, [{ q: 'q1', a: 'a1' }, { q: 'q2', a: 'a2' }]);
  assert.equal(copy.cells[COLUMNS.length], 'Ann');
  assert.equal(r.target[0].cells.length, COLUMNS.length + 1);
  assert.equal(r.target[0].cells[COLUMNS.length], '');
  const text = serializeBacklog({ headers: r.targetHeaders, stories: r.target, hasBom: false });
  assert.match(text, /Owner/);
  assert.match(text, /Ann/);
});

test('migrate: a source column matches the target column without regard to case', () => {
  const targetHeaders = [...COLUMNS, 'owner'];
  const source = backlogOf(st('Billing', { cells: [...COLUMNS.map(() => ''), 'Ann'] }));
  const target = targetOf(st('Billing', { cells: [...COLUMNS.map(() => ''), 'Bob'] }));
  const r = migrate(source, target, [source[0]], [...COLUMNS, 'Owner'], targetHeaders) as Migrated;
  assert.deepEqual(r.targetHeaders, targetHeaders);
  assert.deepEqual(r.target.map((s) => s.cells[COLUMNS.length]), ['Bob', 'Ann']);
});

test('migrate: a frozen story or a story without an ID is refused and nothing moves', () => {
  const source = backlogOf(st('Billing'), st('Billing'));
  const frozen = [source[0], { ...source[1], frozen: true }];
  const target = targetOf(st('Billing'));
  assert.match((migrate(frozen, target, [frozen[1]]) as Refused).error, /frozen/);
  const noId = [st('', {})];
  assert.match((migrate(noId, target, noId) as Refused).error, /Epic/);
  assert.match((migrate(source, target, []) as Refused).error, /no story/);
});

test('migrate: a frozen story that stays in the source keeps its ID', () => {
  const frozenStory = st('Billing', { code: 'B1-B-0003', frozen: true });
  const source = renumber([st('Billing'), st('Billing'), frozenStory, st('Billing')], INITIALS);
  assert.equal(source[2].code, 'B1-B-0003');
  const r = migrate(source, targetOf(st('Billing')), [source[0]]) as Migrated;
  assert.equal(r.source.find((s) => s.id === frozenStory.id)!.code, 'B1-B-0003');
  assert.deepEqual(codes(r.source), ['B1-B-0001', 'B1-B-0003', 'B1-B-0002']);
});

test('migrate: the target keeps its existing IDs and the copies get fresh internal ids', () => {
  const target = targetOf(st('Billing'), st('Reports'), st('Billing'));
  const source = backlogOf(st('Billing'), st('Reports'));
  const r = migrate(source, target, source) as Migrated;
  const existing = new Map(target.map((s) => [s.id, s.code]));
  const kept = r.target.filter((s) => existing.has(s.id));
  assert.equal(kept.length, 3);
  assert.deepEqual(kept.map((s) => s.code), kept.map((s) => existing.get(s.id)));
  const ids = r.target.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('migrate: forwards map old source codes to target codes; recoded lists the stories that stay', () => {
  const source = backlogOf(st('Billing'), st('Billing'), st('Billing'));
  const target = targetOf(st('Billing'));
  const r = migrate(source, target, [source[0], source[2]]) as Migrated;
  assert.deepEqual([...r.forwards], [['B1-B-0001', 'B3-B-0002'], ['B1-B-0003', 'B3-B-0003']]);
  assert.deepEqual([...r.recoded], [['B1-B-0002', 'B1-B-0001']]);
});

test('migrate: the source links to a moved story point at its target code, and moved links stay on old source codes', () => {
  const source = backlogOf(st('Billing'), st('Billing'), st('Billing'));
  const withDeps = [source[0], { ...source[1], dependsOn: ['B1-B-0001', 'B1-B-0003'] }, { ...source[2], dependsOn: ['B1-B-0001', 'B1-B-0002'] }];
  const r = migrate(withDeps, targetOf(st('Billing')), [withDeps[0], withDeps[2]]) as Migrated;
  assert.deepEqual(r.source.map((s) => [s.code, s.dependsOn]), [['B1-B-0001', ['B3-B-0002', 'B3-B-0003']]]);
  assert.deepEqual(r.target.slice(1).map((s) => s.dependsOn), [[], ['B1-B-0001', 'B1-B-0002']]);
});

test('migrate end to end: applying the source save list to the target leaves every link on the intended story', () => {
  // Source S1..S4 (Billing); S2 and S4 move. S1 -> S4. S3 -> S2, S1. S4 -> S2, S3, S1.
  const s = backlogOf(st('Billing', { title: 'S1' }), st('Billing', { title: 'S2' }), st('Billing', { title: 'S3' }), st('Billing', { title: 'S4' }));
  const dep = (i: number, ...d: string[]) => ({ ...s[i], dependsOn: d });
  const source = [dep(0, 'B1-B-0004'), s[1], dep(2, 'B1-B-0002', 'B1-B-0001'), dep(3, 'B1-B-0002', 'B1-B-0003', 'B1-B-0001')];
  // Target T1 -> source S3 (a link into the source), T2 -> T1.
  const t = targetOf(st('Billing', { title: 'T1' }), st('Billing', { title: 'T2' }));
  const target = [{ ...t[0], dependsOn: ['B1-B-0003'] }, { ...t[1], dependsOn: ['B3-B-0001'] }];

  const r = migrate(source, target, [source[1], source[3]]) as Migrated;
  assert.deepEqual(r.target.map((x) => x.title), ['T1', 'T2', 'S2', 'S4']);
  assert.deepEqual(codes(r.target), ['B3-B-0001', 'B3-B-0002', 'B3-B-0003', 'B3-B-0004']);

  // The save of the source sends idChanges(baseline, saved) with the forwards in place of the empty entries.
  const changes = idChanges(source, r.source);
  for (const [oldCode, newCode] of r.forwards) changes.set(oldCode, newCode);
  const relinked = relinkStories(r.target, changes);
  const byTitle = (title: string) => relinked.find((x) => x.title === title)!;

  assert.deepEqual(r.source.map((x) => [x.title, x.code]), [['S1', 'B1-B-0001'], ['S3', 'B1-B-0002']]);
  assert.deepEqual(byTitle('T1').dependsOn, ['B1-B-0002']); // S3
  assert.deepEqual(byTitle('T2').dependsOn, ['B3-B-0001']); // T1, untouched
  assert.deepEqual(byTitle('S2').dependsOn, []);
  assert.deepEqual(byTitle('S4').dependsOn, ['B3-B-0003', 'B1-B-0002', 'B1-B-0001']); // S2 (moved), S3, S1
  assert.deepEqual(r.source[0].dependsOn, ['B3-B-0004']); // S1 -> S4
  assert.deepEqual(r.source[1].dependsOn, ['B3-B-0003', 'B1-B-0001']); // S3 -> S2, S1
});
