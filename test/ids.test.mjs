import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../core/csv.js';
import { loadBacklog, serializeBacklog, newStory, storyIssues, COLUMNS } from '../core/model.js';
import {
  epicPrefix, renumber, moveStory, commitEpic, commitEpics, removeStory, lockStories, unlockStories, dependentsOf, wouldCycle, dependencyChoices, backlogProblems,
} from '../core/ids.js';

let n = 0;
// A committed story, as if loaded.
const st = (epic, extra = {}) => Object.assign(newStory(COLUMNS), { id: ++n, epic, codedEpic: epic, ...extra });
const codes = (stories) => stories.map((s) => s.code);

test('epicPrefix: initials, ignoring & and punctuation', () => {
  assert.equal(epicPrefix('Identity & Access Management'), 'IAM');
  assert.equal(epicPrefix('Data Delivery'), 'DD');
  assert.equal(epicPrefix('  data-delivery, (v2)  '), 'DDV');
  assert.equal(epicPrefix('Billing'), 'B');
  assert.equal(epicPrefix('& !'), '');
  assert.equal(epicPrefix(''), '');
});

test('renumber: position within the epic, in array order, interleaved epics', () => {
  const out = renumber([st('Data Delivery'), st('Identity & Access Management'), st('Data Delivery'), st('Identity & Access Management')]);
  assert.deepEqual(codes(out), ['DD-0001', 'IAM-0001', 'DD-0002', 'IAM-0002']);
});

test('renumber: blank epic has no ID, later epic with the same prefix is lengthened', () => {
  const out = renumber([st('Data Delivery'), st(''), st('Digital Dashboards'), st('Digital Dashboards')]);
  assert.deepEqual(codes(out), ['DD-0001', '', 'DDI-0001', 'DDI-0002']);
  assert.deepEqual(codes(renumber([st('A B'), st('Ab Bc'), st('Ac Bd')])), ['AB-0001', 'ABB-0001', 'ABC-0001']);
});

test('renumber: unchanged input returns the very same array and objects', () => {
  const once = renumber([st('Billing'), st('Billing')]);
  assert.equal(renumber(once), once);
});

test('renumber: references follow the story, also when two stories swap', () => {
  const [a, b] = renumber([st('Billing'), st('Billing')]);
  const c = st('Other', { code: 'O-0001', dependsOn: [a.code] });
  const swapped = renumber([b, a, c]);
  assert.deepEqual(codes(swapped), ['B-0001', 'B-0002', 'O-0001']);
  assert.deepEqual(swapped[2].dependsOn, ['B-0002']); // still story a
});

test('renumber: ambiguous old codes and unknown entries are left alone and recorded', () => {
  const x = st('Billing', { code: 'B-0001' });
  const y = st('Billing', { code: 'B-0001' });
  const z = st('Other', { dependsOn: ['B-0001', 'ZZ-0009'] });
  const out = renumber([x, y, z]);
  assert.deepEqual(codes(out), ['B-0001', 'B-0002', 'O-0001']);
  assert.deepEqual(out[2].dependsOn, ['B-0001', 'ZZ-0009']);
  assert.deepEqual(out[2].ambiguous, ['B-0001']);
  const problems = backlogProblems(out).get(z.id);
  assert.equal(problems.length, 2);
  assert.match(problems.join('|'), /ZZ-0009, which does not exist/);
  assert.match(problems.join('|'), /B-0001, which more than one/);
  const issues = storyIssues(out[2], problems);
  assert.equal(issues.errors.length, storyIssues(out[2]).errors.length);
  assert.ok(problems.every((p) => issues.warnings.includes(p)));
});

test('a story losing its epic loses its ID and the links to it', () => {
  const [a, b] = renumber([st('Billing'), st('Billing')]);
  const dep = { ...b, dependsOn: [a.code] };
  const out = commitEpic([{ ...a, epic: '  ' }, dep], a.id);
  assert.equal(out[0].code, '');
  assert.deepEqual(out[1].dependsOn, []);
});

test("moveStory within an epic rearranges only that epic's rows", () => {
  const stories = renumber([st('A1 X'), st('B1 Y'), st('A1 X'), st('B1 Y'), st('A1 X')]);
  const [a1, b1, a2, b2, a3] = stories;
  const out = moveStory(stories, a3.id, 'A1 X', a1.id);
  assert.deepEqual(out.map((s) => s.id), [a3.id, b1.id, a1.id, b2.id, a2.id]);
  assert.deepEqual(codes(out), ['AX-0001', 'BY-0001', 'AX-0002', 'BY-0002', 'AX-0003']);
  assert.equal(moveStory(stories, a1.id, 'A1 X', a2.id), stories); // dropped where it was
  assert.notEqual(moveStory(stories, a1.id, 'A1 X', null), stories);
  assert.equal(moveStory(stories, a1.id, '', null), stories); // no epic: no drop
  assert.equal(moveStory(stories, a1.id, 'A1 X', a1.id), stories);
});

test('moveStory keeps links pointing at the same stories', () => {
  const [a, b, c] = renumber([st('Billing'), st('Billing'), st('Billing')]);
  const dependent = st('Other', { dependsOn: [b.code] });
  const out = moveStory([a, b, c, dependent], c.id, 'Billing', a.id);
  assert.equal(out.find((s) => s.id === b.id).code, 'B-0003');
  assert.deepEqual(out.at(-1).dependsOn, ['B-0003']);
});

test('moveStory to another epic: at a position, at the end, and in an empty target', () => {
  const stories = renumber([st('Billing'), st('Billing'), st('Onboarding'), st('Onboarding')]);
  const [b1, b2, , o2] = stories;
  const dep = st('Other', { dependsOn: [b2.code] });
  const mid = moveStory([...stories, dep], b2.id, 'Onboarding', o2.id);
  const moved = mid.find((s) => s.id === b2.id);
  assert.equal(moved.epic, 'Onboarding');
  assert.equal(moved.code, 'O-0002');
  assert.deepEqual(codes(mid.filter((s) => s.epic === 'Onboarding')), ['O-0001', 'O-0002', 'O-0003']);
  assert.deepEqual(mid.at(-1).dependsOn, ['O-0002']);
  const end = moveStory(stories, b1.id, 'Onboarding', null);
  assert.equal(end.find((s) => s.id === b1.id).code, 'O-0003');
  assert.equal(end.find((s) => s.id === b2.id).code, 'B-0001');
  const fresh = moveStory(stories, b1.id, 'Brand New', null);
  assert.equal(fresh.find((s) => s.id === b1.id).code, 'BN-0001');
});

test('commitEpic: typing alone changes nothing; committing moves to the bottom of the epic', () => {
  const stories = renumber([st('Billing'), st('Billing'), st('Onboarding')]);
  assert.equal(commitEpic(stories, stories[0].id), stories);
  const typed = stories.map((s, i) => (i === 0 ? { ...s, epic: 'Onboarding' } : s));
  assert.deepEqual(codes(typed), codes(stories));
  const done = commitEpic(typed, stories[0].id);
  assert.deepEqual(done.map((s) => s.code), ['B-0001', 'O-0001', 'O-0002']);
  assert.equal(done[2].id, stories[0].id);
});

test('commitEpics: several stories, in array order', () => {
  const stories = renumber([st('Billing'), st('Billing'), st('Onboarding')]);
  const edited = stories.map((s, i) => (i < 2 ? { ...s, epic: 'Onboarding' } : s));
  const out = commitEpics(edited, new Set([stories[0].id, stories[1].id]));
  assert.deepEqual(out.map((s) => s.id), [stories[2].id, stories[0].id, stories[1].id]);
  assert.deepEqual(codes(out), ['O-0001', 'O-0002', 'O-0003']);
});

test('removeStory strips references and closes the gap', () => {
  const [a, b, c] = renumber([st('Billing'), st('Billing'), st('Billing')]);
  const withDeps = [a, { ...b, dependsOn: [a.code] }, { ...c, dependsOn: [a.code, b.code] }];
  const out = removeStory(withDeps, a.id);
  assert.deepEqual(codes(out), ['B-0001', 'B-0002']);
  assert.deepEqual(out[0].dependsOn, []);
  assert.deepEqual(out[1].dependsOn, ['B-0001']); // was b, now B-0001
});

test('dependents, cycles and choices', () => {
  const [a, b, c, d] = renumber([st('Billing'), st('Billing'), st('Billing'), st('Billing')]);
  const stories = [a, { ...b, dependsOn: [a.code] }, { ...c, dependsOn: [b.code] }, d];
  assert.deepEqual(dependentsOf(stories, a.code).map((s) => s.id), [b.id]);
  assert.equal(wouldCycle(stories, a.code, b.code), true); // direct
  assert.equal(wouldCycle(stories, a.code, c.code), true); // indirect
  assert.equal(wouldCycle(stories, a.code, d.code), false);
  assert.equal(wouldCycle(stories, a.code, a.code), true);
  assert.deepEqual(dependencyChoices(stories, stories[0]).map((s) => s.id), [d.id]);
  assert.deepEqual(dependencyChoices(stories, stories[2]).map((s) => s.id), [a.id, d.id]);
  assert.deepEqual(dependencyChoices(stories, st('')), []);
});

test('backlogProblems: self, dangling, cycle', () => {
  const [a, b] = renumber([st('Billing'), st('Billing')]);
  const cyc = [{ ...a, dependsOn: [b.code] }, { ...b, dependsOn: [a.code, b.code, 'X-1'] }];
  const p = backlogProblems(cyc);
  assert.match(p.get(a.id).join('|'), /cycle/);
  assert.match(p.get(b.id).join('|'), /itself/);
  assert.match(p.get(b.id).join('|'), /X-1/);
  assert.equal(backlogProblems([a, b]).size, 0);
});

test('load: old file gets IDs, saves with ID and Depends On columns, other columns keep their order', () => {
  const text = 'Jira Key,Epic,Feature,Title\r\nJ-1,Billing & Invoicing,C,F1\r\nJ-2,Billing & Invoicing,C,F2\r\nJ-3,,C,F3\r\n';
  const b = loadBacklog(text);
  assert.equal(b.changed, true);
  assert.deepEqual(codes(b.stories), ['BI-0001', 'BI-0002', '']);
  const rows = parseCsv(serializeBacklog(b));
  assert.deepEqual(rows[0].slice(0, 4), ['Jira Key', 'Epic', 'Feature', 'Title']);
  assert.ok(rows[0].includes('ID') && rows[0].includes('Depends On'));
  assert.equal(rows[1][rows[0].indexOf('ID')], 'BI-0001');
  assert.equal(rows[1][0], 'J-1');
});

test('load: rows reordered outside the tool get new IDs and links are rewritten; dependencies round trip', () => {
  const text = 'ID,Epic,Depends On\r\nB-0002,Billing,\r\nB-0001,Billing,\r\nO-0001,Onboarding,B-0001;B-0002\r\n';
  const b = loadBacklog(text);
  assert.deepEqual(codes(b.stories), ['B-0001', 'B-0002', 'O-0001']);
  assert.deepEqual(b.stories[2].dependsOn, ['B-0002', 'B-0001']);
  const again = loadBacklog(serializeBacklog(b));
  assert.equal(again.changed, false);
  assert.deepEqual(again.stories[2].dependsOn, ['B-0002', 'B-0001']);
  const rows = parseCsv(serializeBacklog(b));
  assert.equal(rows[3][rows[0].indexOf('Depends On')], 'B-0002;B-0001');
});

test('backlogProblems: a missing NEW-<n> entry says it is still proposed, other missing entries keep their message', () => {
  const [a] = renumber([st('Billing', { dependsOn: ['NEW-5', 'ZZ-0009'] })]);
  const msgs = backlogProblems([a]).get(a.id);
  assert.deepEqual(msgs, ['Depends On lists NEW-5, a story that is still proposed', 'Depends On lists ZZ-0009, which does not exist']);
});

// A locked story with its code, as if loaded.
const lk = (epic, code, extra = {}) => st(epic, { code, locked: true, ...extra });
const IAM = 'Identity & Access Management';

test('renumber: unlocked stories take the lowest free numbers around a locked one', () => {
  const out = renumber([st(IAM), lk(IAM, 'IAM-0002'), st(IAM), st(IAM)]);
  assert.deepEqual(codes(out), ['IAM-0001', 'IAM-0002', 'IAM-0003', 'IAM-0004']);
  const gap = renumber([st(IAM), lk(IAM, 'IAM-0005'), st(IAM)]);
  assert.deepEqual(codes(gap), ['IAM-0001', 'IAM-0005', 'IAM-0002']);
  assert.equal(gap[1].locked, true);
});

test('renumber: deleting a story above a locked one leaves the locked ID alone', () => {
  const a = st(IAM);
  const stories = renumber([a, st(IAM), lk(IAM, 'IAM-0003')]);
  const out = removeStory(stories, a.id);
  assert.deepEqual(codes(out), ['IAM-0001', 'IAM-0003']);
});

test('renumber: a new story goes into the lowest free number', () => {
  const out = renumber([lk(IAM, 'IAM-0001'), lk(IAM, 'IAM-0002'), st(IAM)]);
  assert.deepEqual(codes(out), ['IAM-0001', 'IAM-0002', 'IAM-0003']);
});

test('renumber: an epic keeps the locked prefix when the epic order changes and initials are equal', () => {
  // "Digital Dashboards" locked as DDI (it was second); "Data Delivery" now comes first and would take DD, not DDI.
  const out = renumber([st('Data Delivery'), lk('Digital Dashboards', 'DD-0001'), st('Digital Dashboards')]);
  assert.deepEqual(codes(out), ['DDA-0001', 'DD-0001', 'DD-0002']);
  assert.equal(new Set(codes(out)).size, 3);
});

test('renumber: duplicate or malformed locked codes are demoted and renumbered', () => {
  const out = renumber([lk(IAM, 'IAM-0001'), lk(IAM, 'IAM-0001'), lk(IAM, 'nonsense'), lk('', 'X-0001')]);
  assert.deepEqual(codes(out), ['IAM-0001', 'IAM-0002', 'IAM-0003', '']);
  assert.deepEqual(out.map((s) => s.locked), [true, false, false, false]);
});

test('renumber: a second epic claiming a prefix a locked epic already holds is demoted', () => {
  const out = renumber([lk('Data Delivery', 'DD-0001'), lk('Digital Dashboards', 'DD-0002')]);
  assert.equal(new Set(codes(out)).size, 2);
  assert.deepEqual(out.map((s) => s.locked), [true, false]);
  assert.equal(out[0].code, 'DD-0001');
});

test('renumber: links to a locked story survive, links to moved stories follow them', () => {
  const locked = lk(IAM, 'IAM-0003');
  const first = st(IAM, { code: 'IAM-0001' });
  const dep = st(IAM, { code: 'IAM-0002', dependsOn: ['IAM-0003', 'IAM-0001'] });
  const out = renumber([dep, first, locked]);
  // dep is now first (IAM-0001), first is second (IAM-0002); the locked story stays IAM-0003.
  assert.deepEqual(codes(out), ['IAM-0001', 'IAM-0002', 'IAM-0003']);
  assert.deepEqual(out[0].dependsOn, ['IAM-0003', 'IAM-0002']);
});

test('renumber: returns the same array when locked codes are already right', () => {
  const stories = [st(IAM, { code: 'IAM-0001' }), lk(IAM, 'IAM-0004')];
  assert.equal(renumber(stories), stories);
});

test('guards: a locked story cannot be moved, deleted or have its Epic committed', () => {
  const a = lk(IAM, 'IAM-0001');
  const stories = renumber([a, st(IAM)]);
  assert.equal(moveStory(stories, a.id, IAM, null), stories);
  assert.equal(moveStory(stories, a.id, 'Billing', null), stories);
  assert.equal(removeStory(stories, a.id), stories);
  const edited = [{ ...stories[0], epic: 'Billing' }, stories[1]];
  assert.equal(commitEpic(edited, a.id), edited);
  assert.equal(commitEpics(edited, new Set([a.id])), edited);
});

test('guards: other stories can still be dragged past a locked one', () => {
  const a = lk(IAM, 'IAM-0002');
  const b = st(IAM);
  const c = st(IAM);
  const out = moveStory(renumber([b, a, c]), c.id, IAM, b.id);
  assert.deepEqual(out.map((s) => s.id), [c.id, b.id, a.id]);
  assert.equal(out.find((s) => s.id === a.id).code, 'IAM-0002');
  assert.equal(new Set(codes(out)).size, 3);
});

test('lockStories / unlockStories: skip stories without an ID', () => {
  const [x, y] = renumber([st(IAM), st('')]);
  const locked = lockStories([x, y], new Set([x.id, y.id]));
  assert.equal(locked.skipped, 1);
  assert.deepEqual(locked.stories.map((s) => s.locked), [true, false]);
  assert.equal(lockStories(locked.stories, new Set([x.id])).stories, locked.stories);
  const open = unlockStories(locked.stories, new Set([x.id, y.id]));
  assert.deepEqual(open.stories.map((s) => s.locked), [false, false]);
  assert.equal(open.skipped, 0);
});
