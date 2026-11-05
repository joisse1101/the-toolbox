import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../../logic/backlog/csv.js';
import { loadBacklog, serializeBacklog, newStory, storyIssues, COLUMNS } from '../../logic/backlog/model.js';
import {
  epicPrefix, renumber, moveStory, moveGroup, gatherFeatures, recodedBetween, commitEpic, commitEpics, removeStory, removeStories, freezeStories, dependentsOf, wouldCycle, dependencyChoices, backlogProblems,
} from '../../logic/backlog/ids.js';

const I = 'B1'; // the backlog initials of most tests
let n = 0;
// A committed story, as if loaded.
const st = (epic, extra = {}) => Object.assign(newStory(COLUMNS), { id: ++n, epic, codedEpic: epic, ...extra });
const codes = (stories) => stories.map((s) => s.code);
const rn = (stories) => renumber(stories, I);

test('epicPrefix: initials, ignoring & and punctuation', () => {
  assert.equal(epicPrefix('Identity & Access Management'), 'IAM');
  assert.equal(epicPrefix('Data Delivery'), 'DD');
  assert.equal(epicPrefix('  data-delivery, (v2)  '), 'DDV');
  assert.equal(epicPrefix('Billing'), 'B');
  assert.equal(epicPrefix('& !'), '');
  assert.equal(epicPrefix(''), '');
});

test('renumber: every code starts with the backlog initials, then the epic prefix and the position', () => {
  const stories = [st('Data Delivery'), st('Identity & Access Management'), st('Data Delivery'), st('Identity & Access Management')];
  assert.deepEqual(codes(renumber(stories, 'B1')), ['B1-DD-0001', 'B1-IAM-0001', 'B1-DD-0002', 'B1-IAM-0002']);
  assert.deepEqual(codes(renumber(stories, 'XY')), ['XY-DD-0001', 'XY-IAM-0001', 'XY-DD-0002', 'XY-IAM-0002']);
});

test('renumber: needs the initials of the backlog', () => {
  assert.throws(() => renumber([st('Billing')]), /initials/);
  assert.throws(() => renumber([st('Billing')], '  '), /initials/);
});

test('renumber: blank epic has no ID', () => {
  assert.deepEqual(codes(rn([st('Data Delivery'), st(''), st('Billing')])), ['B1-DD-0001', '', 'B1-B-0001']);
});

test('renumber: two epics with equal initials, the later ones get the next digit', () => {
  const out = rn([st('Data Delivery'), st(''), st('Digital Dashboards'), st('Digital Dashboards'), st('Dynamic Dashboards')]);
  assert.deepEqual(codes(out), ['B1-DD-0001', '', 'B1-DD1-0001', 'B1-DD1-0002', 'B1-DD2-0001']);
  assert.deepEqual(codes(rn([st('A B'), st('Ab Bc'), st('Ac Bd')])), ['B1-AB-0001', 'B1-AB1-0001', 'B1-AB2-0001']);
});

test('renumber: a digit already used by another epic prefix is skipped', () => {
  // "Phase 1" has the prefix P1, which the second "Pb" epic would take as P + 1.
  const out = rn([st('Phase 1'), st('Pa'), st('Pb')]);
  assert.deepEqual(codes(out), ['B1-P1-0001', 'B1-P-0001', 'B1-P2-0001']);
});

test('renumber: unchanged input returns the very same array and objects', () => {
  const once = rn([st('Billing'), st('Billing')]);
  assert.equal(rn(once), once);
});

test('renumber: references follow the story, also when two stories swap', () => {
  const [a, b] = rn([st('Billing'), st('Billing')]);
  const c = st('Other', { code: 'B1-O-0001', dependsOn: [a.code] });
  const swapped = rn([b, a, c]);
  assert.deepEqual(codes(swapped), ['B1-B-0001', 'B1-B-0002', 'B1-O-0001']);
  assert.deepEqual(swapped[2].dependsOn, ['B1-B-0002']); // still story a
});

test('renumber: ambiguous old codes and unknown entries are left alone and recorded', () => {
  const x = st('Billing', { code: 'B1-B-0001' });
  const y = st('Billing', { code: 'B1-B-0001' });
  const z = st('Other', { dependsOn: ['B1-B-0001', 'ZZ-0009'] });
  const out = rn([x, y, z]);
  assert.deepEqual(codes(out), ['B1-B-0001', 'B1-B-0002', 'B1-O-0001']);
  assert.deepEqual(out[2].dependsOn, ['B1-B-0001', 'ZZ-0009']);
  assert.deepEqual(out[2].ambiguous, ['B1-B-0001']);
  const problems = backlogProblems(out).get(z.id);
  assert.equal(problems.length, 2);
  assert.match(problems.join('|'), /ZZ-0009, which does not exist/);
  assert.match(problems.join('|'), /B1-B-0001, which more than one/);
  const issues = storyIssues(out[2], problems);
  assert.equal(issues.errors.length, storyIssues(out[2]).errors.length);
  assert.ok(problems.every((p) => issues.warnings.includes(p)));
});

test('a story losing its epic loses its ID and the links to it', () => {
  const [a, b] = rn([st('Billing'), st('Billing')]);
  const dep = { ...b, dependsOn: [a.code] };
  const out = commitEpic([{ ...a, epic: '  ' }, dep], a.id, I);
  assert.equal(out[0].code, '');
  assert.deepEqual(out[1].dependsOn, []);
});

test("moveStory within an epic rearranges only that epic's rows", () => {
  const stories = rn([st('A1 X'), st('B1 Y'), st('A1 X'), st('B1 Y'), st('A1 X')]);
  const [a1, b1, a2, b2, a3] = stories;
  const out = moveStory(stories, a3.id, 'A1 X', a1.id, I);
  assert.deepEqual(out.map((s) => s.id), [a3.id, b1.id, a1.id, b2.id, a2.id]);
  assert.deepEqual(codes(out), ['B1-AX-0001', 'B1-BY-0001', 'B1-AX-0002', 'B1-BY-0002', 'B1-AX-0003']);
  assert.equal(moveStory(stories, a1.id, 'A1 X', a2.id, I), stories); // dropped where it was
  assert.notEqual(moveStory(stories, a1.id, 'A1 X', null, I), stories);
  assert.equal(moveStory(stories, a1.id, '', null, I), stories); // no epic: no drop
  assert.equal(moveStory(stories, a1.id, 'A1 X', a1.id, I), stories);
});

test('moveStory keeps links pointing at the same stories', () => {
  const [a, b, c] = rn([st('Billing'), st('Billing'), st('Billing')]);
  const dependent = st('Other', { dependsOn: [b.code] });
  const out = moveStory([a, b, c, dependent], c.id, 'Billing', a.id, I);
  assert.equal(out.find((s) => s.id === b.id).code, 'B1-B-0003');
  assert.deepEqual(out.at(-1).dependsOn, ['B1-B-0003']);
});

test('moveStory to another epic: at a position, at the end, and in an empty target', () => {
  const stories = rn([st('Billing'), st('Billing'), st('Onboarding'), st('Onboarding')]);
  const [b1, b2, , o2] = stories;
  const dep = st('Other', { dependsOn: [b2.code] });
  const mid = moveStory([...stories, dep], b2.id, 'Onboarding', o2.id, I);
  const moved = mid.find((s) => s.id === b2.id);
  assert.equal(moved.epic, 'Onboarding');
  assert.equal(moved.code, 'B1-O-0002');
  assert.deepEqual(codes(mid.filter((s) => s.epic === 'Onboarding')), ['B1-O-0001', 'B1-O-0002', 'B1-O-0003']);
  assert.deepEqual(mid.at(-1).dependsOn, ['B1-O-0002']);
  const end = moveStory(stories, b1.id, 'Onboarding', null, I);
  assert.equal(end.find((s) => s.id === b1.id).code, 'B1-O-0003');
  assert.equal(end.find((s) => s.id === b2.id).code, 'B1-B-0001');
  const fresh = moveStory(stories, b1.id, 'Brand New', null, I);
  assert.equal(fresh.find((s) => s.id === b1.id).code, 'B1-BN-0001');
});

test('commitEpic: typing alone changes nothing; committing moves to the bottom of the epic', () => {
  const stories = rn([st('Billing'), st('Billing'), st('Onboarding')]);
  assert.equal(commitEpic(stories, stories[0].id, I), stories);
  const typed = stories.map((s, i) => (i === 0 ? { ...s, epic: 'Onboarding' } : s));
  assert.deepEqual(codes(typed), codes(stories));
  const done = commitEpic(typed, stories[0].id, I);
  assert.deepEqual(done.map((s) => s.code), ['B1-B-0001', 'B1-O-0001', 'B1-O-0002']);
  assert.equal(done[2].id, stories[0].id);
});

test('commitEpics: several stories, in array order', () => {
  const stories = rn([st('Billing'), st('Billing'), st('Onboarding')]);
  const edited = stories.map((s, i) => (i < 2 ? { ...s, epic: 'Onboarding' } : s));
  const out = commitEpics(edited, new Set([stories[0].id, stories[1].id]), I);
  assert.deepEqual(out.map((s) => s.id), [stories[2].id, stories[0].id, stories[1].id]);
  assert.deepEqual(codes(out), ['B1-O-0001', 'B1-O-0002', 'B1-O-0003']);
});

test('removeStory strips references and closes the gap', () => {
  const [a, b, c] = rn([st('Billing'), st('Billing'), st('Billing')]);
  const withDeps = [a, { ...b, dependsOn: [a.code] }, { ...c, dependsOn: [a.code, b.code] }];
  const out = removeStory(withDeps, a.id, I);
  assert.deepEqual(codes(out), ['B1-B-0001', 'B1-B-0002']);
  assert.deepEqual(out[0].dependsOn, []);
  assert.deepEqual(out[1].dependsOn, ['B1-B-0001']); // was b, now B1-B-0001
});

test('removeStories: removes several, cleans links and renumbers once', () => {
  const [a, b, c, d] = rn([st('Billing'), st('Billing'), st('Billing'), st('Billing')]);
  const withDeps = [a, b, { ...c, dependsOn: [a.code, b.code] }, { ...d, dependsOn: [a.code, c.code] }];
  const out = removeStories(withDeps, new Set([a.id, c.id]), I);
  assert.equal(out.skipped, 0);
  assert.deepEqual(codes(out.stories), ['B1-B-0001', 'B1-B-0002']);
  assert.deepEqual(out.stories.map((s) => s.id), [b.id, d.id]);
  assert.deepEqual(out.stories[1].dependsOn, []);
});

// A frozen story with its code, as if loaded.
const fz = (epic, code, extra = {}) => st(epic, { code, frozen: true, ...extra });
const IAM = 'Identity & Access Management';

test('removeStories: a frozen story is kept and counted', () => {
  const a = st(IAM);
  const stories = rn([a, st(IAM), fz(IAM, 'B1-IAM-0003')]);
  const frozen = stories[2];
  const out = removeStories(stories, new Set([a.id, stories[1].id, frozen.id]), I);
  assert.equal(out.skipped, 1);
  assert.deepEqual(codes(out.stories), ['B1-IAM-0003']);
  assert.equal(out.stories[0].id, frozen.id);
});

test('removeStories: same array when nothing is removed', () => {
  const stories = rn([fz(IAM, 'B1-IAM-0001'), st(IAM)]);
  const onlyFrozen = removeStories(stories, new Set([stories[0].id]), I);
  assert.equal(onlyFrozen.stories, stories);
  assert.equal(onlyFrozen.skipped, 1);
  assert.equal(removeStories(stories, new Set(), I).stories, stories);
});

test('dependents, cycles and choices', () => {
  const [a, b, c, d] = rn([st('Billing'), st('Billing'), st('Billing'), st('Billing')]);
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
  const [a, b] = rn([st('Billing'), st('Billing')]);
  const cyc = [{ ...a, dependsOn: [b.code] }, { ...b, dependsOn: [a.code, b.code, 'X-1'] }];
  const p = backlogProblems(cyc);
  assert.match(p.get(a.id).join('|'), /cycle/);
  assert.match(p.get(b.id).join('|'), /itself/);
  assert.match(p.get(b.id).join('|'), /X-1/);
  assert.equal(backlogProblems([a, b]).size, 0);
});

test('load: old file gets IDs with the initials, saves with ID and Depends On columns, other columns keep their order', () => {
  const text = 'Jira Key,Epic,Feature,Title\r\nJ-1,Billing & Invoicing,C,F1\r\nJ-2,Billing & Invoicing,C,F2\r\nJ-3,,C,F3\r\n';
  const b = loadBacklog(text, { initials: 'B1' });
  assert.equal(b.changed, true);
  assert.deepEqual(codes(b.stories), ['B1-BI-0001', 'B1-BI-0002', '']);
  const rows = parseCsv(serializeBacklog(b));
  assert.deepEqual(rows[0].slice(0, 4), ['Jira Key', 'Epic', 'Feature', 'Title']);
  assert.ok(rows[0].includes('ID') && rows[0].includes('Depends On'));
  assert.equal(rows[1][rows[0].indexOf('ID')], 'B1-BI-0001');
  assert.equal(rows[1][0], 'J-1');
});

test('load: IDs without the initials gain them and Depends On is rewritten', () => {
  const text = 'ID,Epic,Depends On\r\nIAM-0001,Identity & Access Management,\r\nIAM-0002,Identity & Access Management,IAM-0001\r\n';
  const b = loadBacklog(text, { initials: 'B1' });
  assert.deepEqual(codes(b.stories), ['B1-IAM-0001', 'B1-IAM-0002']);
  assert.deepEqual(b.stories[1].dependsOn, ['B1-IAM-0001']);
  assert.equal(b.changed, true);
  const rows = parseCsv(serializeBacklog(b));
  assert.equal(rows[2][rows[0].indexOf('Depends On')], 'B1-IAM-0001');
  assert.equal(loadBacklog(serializeBacklog(b), { initials: 'B1' }).changed, false);
});

test('load: rows reordered outside the tool get new IDs and links are rewritten; dependencies round trip', () => {
  const text = 'ID,Epic,Depends On\r\nB1-B-0002,Billing,\r\nB1-B-0001,Billing,\r\nB1-O-0001,Onboarding,B1-B-0001;B1-B-0002\r\n';
  const b = loadBacklog(text, { initials: 'B1' });
  assert.deepEqual(codes(b.stories), ['B1-B-0001', 'B1-B-0002', 'B1-O-0001']);
  assert.deepEqual(b.stories[2].dependsOn, ['B1-B-0002', 'B1-B-0001']);
  const again = loadBacklog(serializeBacklog(b), { initials: 'B1' });
  assert.equal(again.changed, false);
  assert.deepEqual(again.stories[2].dependsOn, ['B1-B-0002', 'B1-B-0001']);
  const rows = parseCsv(serializeBacklog(b));
  assert.equal(rows[3][rows[0].indexOf('Depends On')], 'B1-B-0002;B1-B-0001');
});

test('load: changed initials renumber unfrozen stories and keep frozen ones', () => {
  const text = 'ID,Epic,Depends On,Frozen\r\nB1-IAM-0001,Identity & Access Management,,Yes\r\nB1-IAM-0002,Identity & Access Management,B1-IAM-0001,\r\n';
  const b = loadBacklog(text, { initials: 'B2' });
  assert.deepEqual(codes(b.stories), ['B1-IAM-0001', 'B2-IAM-0001']);
  assert.deepEqual(b.stories.map((s) => s.frozen), [true, false]);
  assert.deepEqual(b.stories[1].dependsOn, ['B1-IAM-0001']);
});

test('backlogProblems: a missing NEW-<n> entry says it is still proposed, other missing entries keep their message', () => {
  const [a] = rn([st('Billing', { dependsOn: ['NEW-5', 'ZZ-0009'] })]);
  const msgs = backlogProblems([a]).get(a.id);
  assert.deepEqual(msgs, ['Depends On lists NEW-5, a story that is still proposed', 'Depends On lists ZZ-0009, which does not exist']);
});

test('renumber: unfrozen stories take the lowest free numbers around a frozen one', () => {
  const out = rn([st(IAM), fz(IAM, 'B1-IAM-0002'), st(IAM), st(IAM)]);
  assert.deepEqual(codes(out), ['B1-IAM-0001', 'B1-IAM-0002', 'B1-IAM-0003', 'B1-IAM-0004']);
  const gap = rn([st(IAM), fz(IAM, 'B1-IAM-0005'), st(IAM)]);
  assert.deepEqual(codes(gap), ['B1-IAM-0001', 'B1-IAM-0005', 'B1-IAM-0002']);
  assert.equal(gap[1].frozen, true);
});

test('renumber: deleting a story above a frozen one leaves the frozen ID alone', () => {
  const a = st(IAM);
  const stories = rn([a, st(IAM), fz(IAM, 'B1-IAM-0003')]);
  const out = removeStory(stories, a.id, I);
  assert.deepEqual(codes(out), ['B1-IAM-0001', 'B1-IAM-0003']);
});

test('renumber: a new story goes into the lowest free number', () => {
  const out = rn([fz(IAM, 'B1-IAM-0001'), fz(IAM, 'B1-IAM-0002'), st(IAM)]);
  assert.deepEqual(codes(out), ['B1-IAM-0001', 'B1-IAM-0002', 'B1-IAM-0003']);
});

test('renumber: a frozen epic prefix is kept when the initials change, and only unfrozen stories take the new initials', () => {
  const out = renumber([fz(IAM, 'B1-IAM-0002'), st(IAM), st(IAM)], 'B2');
  assert.deepEqual(codes(out), ['B1-IAM-0002', 'B2-IAM-0001', 'B2-IAM-0002']);
  assert.equal(out[0].frozen, true);
});

test('renumber: the epic keeps its frozen prefix even when its own initials differ from it', () => {
  // "Identity & Access Management" gives IAM; this epic was frozen as XYZ and keeps XYZ.
  const out = rn([st(IAM), fz(IAM, 'B1-XYZ-0001')]);
  assert.deepEqual(codes(out), ['B1-XYZ-0002', 'B1-XYZ-0001']);
  assert.deepEqual(codes(rn([st('Other'), st('Xyz Yellow Zebra')])), ['B1-O-0001', 'B1-XYZ-0001']); // not taken by the frozen one here
});

test('renumber: numbers are reserved per full prefix, so equal numbers under other initials do not clash', () => {
  const out = renumber([st(IAM), st(IAM), fz(IAM, 'B1-IAM-0001')], 'B2');
  assert.deepEqual(codes(out), ['B2-IAM-0001', 'B2-IAM-0002', 'B1-IAM-0001']);
  assert.equal(new Set(codes(out)).size, 3);
  const same = renumber([st(IAM), fz(IAM, 'B2-IAM-0001')], 'B2');
  assert.deepEqual(codes(same), ['B2-IAM-0002', 'B2-IAM-0001']);
});

test('renumber: an epic keeps the frozen prefix when the epic order changes and initials are equal', () => {
  // "Digital Dashboards" was frozen as DD (it was first); "Data Delivery" now comes first and gets DD1, not DD.
  const out = rn([st('Data Delivery'), fz('Digital Dashboards', 'B1-DD-0001'), st('Digital Dashboards')]);
  assert.deepEqual(codes(out), ['B1-DD1-0001', 'B1-DD-0001', 'B1-DD-0002']);
  assert.equal(new Set(codes(out)).size, 3);
});

test('renumber: a frozen story with an old-form ID (no initials) is demoted and renumbered', () => {
  const out = rn([fz(IAM, 'IAM-0003'), st(IAM)]);
  assert.deepEqual(codes(out), ['B1-IAM-0001', 'B1-IAM-0002']);
  assert.deepEqual(out.map((s) => s.frozen), [false, false]);
});

test('renumber: duplicate or malformed frozen codes are demoted and renumbered', () => {
  const out = rn([fz(IAM, 'B1-IAM-0001'), fz(IAM, 'B1-IAM-0001'), fz(IAM, 'nonsense'), fz('', 'B1-X-0001')]);
  assert.deepEqual(codes(out), ['B1-IAM-0001', 'B1-IAM-0002', 'B1-IAM-0003', '']);
  assert.deepEqual(out.map((s) => s.frozen), [true, false, false, false]);
});

test('renumber: a second epic claiming a prefix a frozen epic already holds is demoted', () => {
  const out = rn([fz('Data Delivery', 'B1-DD-0001'), fz('Digital Dashboards', 'B1-DD-0002')]);
  assert.equal(new Set(codes(out)).size, 2);
  assert.deepEqual(out.map((s) => s.frozen), [true, false]);
  assert.equal(out[0].code, 'B1-DD-0001');
  assert.equal(out[1].code, 'B1-DD1-0001');
});

test('renumber: links to a frozen story survive, links to moved stories follow them', () => {
  const frozen = fz(IAM, 'B1-IAM-0003');
  const first = st(IAM, { code: 'B1-IAM-0001' });
  const dep = st(IAM, { code: 'B1-IAM-0002', dependsOn: ['B1-IAM-0003', 'B1-IAM-0001'] });
  const out = rn([dep, first, frozen]);
  // dep is now first (B1-IAM-0001), first is second (B1-IAM-0002); the frozen story stays B1-IAM-0003.
  assert.deepEqual(codes(out), ['B1-IAM-0001', 'B1-IAM-0002', 'B1-IAM-0003']);
  assert.deepEqual(out[0].dependsOn, ['B1-IAM-0003', 'B1-IAM-0002']);
});

test('renumber: returns the same array when frozen codes are already right', () => {
  const stories = [st(IAM, { code: 'B1-IAM-0001' }), fz(IAM, 'B1-IAM-0004')];
  assert.equal(rn(stories), stories);
});

test('guards: a frozen story cannot be moved, deleted or have its Epic committed', () => {
  const a = fz(IAM, 'B1-IAM-0001');
  const stories = rn([a, st(IAM)]);
  assert.equal(moveStory(stories, a.id, IAM, null, I), stories);
  assert.equal(moveStory(stories, a.id, 'Billing', null, I), stories);
  assert.equal(removeStory(stories, a.id, I), stories);
  const edited = [{ ...stories[0], epic: 'Billing' }, stories[1]];
  assert.equal(commitEpic(edited, a.id, I), edited);
  assert.equal(commitEpics(edited, new Set([a.id]), I), edited);
});

test('guards: a frozen story is not renumbered, whatever happens around it', () => {
  const a = fz(IAM, 'B1-IAM-0002');
  const first = st(IAM);
  const stories = rn([first, a, st(IAM)]);
  const out = removeStory(stories, first.id, I);
  assert.equal(out.find((s) => s.id === a.id), stories[1]);
  assert.equal(renumber(stories, 'B9')[1].code, 'B1-IAM-0002');
});

test('guards: other stories can still be dragged past a frozen one', () => {
  const a = fz(IAM, 'B1-IAM-0002');
  const b = st(IAM);
  const c = st(IAM);
  const out = moveStory(rn([b, a, c]), c.id, IAM, b.id, I);
  assert.deepEqual(out.map((s) => s.id), [c.id, b.id, a.id]);
  assert.equal(out.find((s) => s.id === a.id).code, 'B1-IAM-0002');
  assert.equal(new Set(codes(out)).size, 3);
});

test('freezeStories: freezes stories with an ID and returns the ones without', () => {
  const [x, y] = rn([st(IAM), st('')]);
  const res = freezeStories([x, y], new Set([x.id, y.id]));
  assert.deepEqual(res.stories.map((s) => s.frozen), [true, false]);
  assert.deepEqual(res.skipped.map((s) => s.id), [y.id]);
  assert.equal(res.stories[1], y);
});

test('freezeStories: freezing twice changes nothing', () => {
  const [x, y] = rn([st(IAM), st(IAM)]);
  const once = freezeStories([x, y], new Set([x.id])).stories;
  const twice = freezeStories(once, new Set([x.id]));
  assert.equal(twice.stories, once);
  assert.deepEqual(twice.skipped, []);
  assert.equal(freezeStories(once, new Set()).stories, once);
});

test('freezeStories: only the listed stories are frozen, nothing else changes', () => {
  const stories = rn([st(IAM), st(IAM), st(IAM)]);
  const out = freezeStories(stories, new Set([stories[1].id])).stories;
  assert.deepEqual(out.map((s) => s.frozen), [false, true, false]);
  assert.equal(out[0], stories[0]);
  assert.deepEqual(out.map((s) => s.code), codes(stories));
});

test('freezeStories: a story with no ID is skipped and the array stays the same when only such stories are listed', () => {
  const noCode = st('');
  const stories = [noCode];
  const res = freezeStories(stories, new Set([noCode.id]));
  assert.equal(res.stories, stories);
  assert.deepEqual(res.skipped, [noCode]);
});

const ft = (epic, feature, extra = {}) => st(epic, { feature, ...extra });
const features = (stories) => stories.map((s) => s.feature);

test('moveGroup feature: block moves inside its epic, other epics keep their rows', () => {
  const stories = rn([ft('Billing', 'Pay'), ft('Onboarding', 'Intro'), ft('Billing', 'Refund'), ft('Billing', 'Pay'), ft('Billing', 'Invoice')]);
  const [p1, o1, r1, p2, i1] = stories;
  const out = moveGroup(stories, { epic: 'Billing', feature: 'Invoice' }, 'Pay', I);
  assert.deepEqual(out.map((s) => s.id), [i1.id, o1.id, p1.id, p2.id, r1.id]); // Onboarding stays in row 2
  assert.deepEqual(codes(out), ['B1-B-0001', 'B1-O-0001', 'B1-B-0002', 'B1-B-0003', 'B1-B-0004']);
  const last = moveGroup(stories, { epic: 'Billing', feature: 'Pay' }, null, I);
  assert.deepEqual(last.map((s) => s.id), [r1.id, o1.id, i1.id, p1.id, p2.id]);
});

test('moveGroup feature: same order, another epic, unknown or blank group return the same array', () => {
  const stories = rn([ft('Billing', 'Pay'), ft('Billing', 'Refund'), ft('Onboarding', 'Intro')]);
  assert.equal(moveGroup(stories, { epic: 'Billing', feature: 'Pay' }, 'Refund', I), stories); // already before it
  assert.equal(moveGroup(stories, { epic: 'Billing', feature: 'Pay' }, 'Pay', I), stories);
  assert.equal(moveGroup(stories, { epic: 'Billing', feature: 'Pay' }, 'Intro', I), stories); // feature of another epic
  assert.equal(moveGroup(stories, { epic: 'Billing', feature: 'Nope' }, null, I), stories);
  assert.equal(moveGroup(stories, { epic: '', feature: 'Pay' }, null, I), stories);
});

test('moveGroup epic: whole block moves, interleaved epics are gathered', () => {
  const stories = rn([ft('Billing', 'Pay'), ft('Onboarding', 'Intro'), ft('Billing', 'Refund'), ft('Onboarding', 'Intro')]);
  const [b1, o1, b2, o2] = stories;
  const out = moveGroup(stories, { epic: 'Onboarding' }, 'Billing', I);
  assert.deepEqual(out.map((s) => s.id), [o1.id, o2.id, b1.id, b2.id]);
  assert.deepEqual(codes(out), ['B1-O-0001', 'B1-O-0002', 'B1-B-0001', 'B1-B-0002']);
  assert.equal(moveGroup(stories, { epic: 'Billing' }, 'Onboarding', I), stories); // group order unchanged: nothing is gathered
  assert.equal(moveGroup(stories, { epic: 'Billing' }, 'Billing', I), stories);
  assert.equal(moveGroup(stories, { epic: 'Billing' }, 'Nope', I), stories);
  assert.equal(moveGroup(stories, { epic: '' }, null, I), stories);
  assert.deepEqual(moveGroup(stories, { epic: 'Billing' }, null, I).map((s) => s.id), [o1.id, o2.id, b1.id, b2.id]);
});

test('moveGroup: a frozen story keeps its ID, shared prefixes swap, links follow', () => {
  const stories = rn([ft('Billing', 'Pay'), ft('Billing', 'Refund'), ft('Billing', 'Refund')]);
  const frozen = freezeStories(stories, new Set([stories[1].id])).stories; // B1-B-0002 in Refund
  const out = moveGroup(frozen, { epic: 'Billing', feature: 'Refund' }, 'Pay', I);
  assert.deepEqual(features(out), ['Refund', 'Refund', 'Pay']);
  assert.equal(out.find((s) => s.id === frozen[1].id).code, 'B1-B-0002');
  assert.deepEqual(codes(out), ['B1-B-0002', 'B1-B-0001', 'B1-B-0003']); // the frozen story keeps B1-B-0002

  const dd = rn([st('Data Delivery'), st('Digital Dashboards')]);
  const dep = st('Other', { dependsOn: [dd[1].code] });
  const swapped = moveGroup([...dd, dep], { epic: 'Digital Dashboards' }, 'Data Delivery', I);
  assert.deepEqual(codes(swapped), ['B1-DD-0001', 'B1-DD1-0001', 'B1-O-0001']);
  assert.deepEqual(swapped[2].dependsOn, ['B1-DD-0001']); // still the Digital Dashboards story
});

test('moveGroup epic: a fixed epic prefix stays when the epic order changes', () => {
  const stories = rn([fz('Data Delivery', 'B1-DD-0001'), st('Digital Dashboards', { code: 'B1-DD1-0001' })]);
  assert.deepEqual(codes(stories), ['B1-DD-0001', 'B1-DD1-0001']);
  const out = moveGroup(stories, { epic: 'Digital Dashboards' }, 'Data Delivery', I);
  assert.deepEqual(out.map((s) => s.epic), ['Digital Dashboards', 'Data Delivery']);
  assert.deepEqual(codes(out), ['B1-DD1-0001', 'B1-DD-0001']);
});

test('gatherFeatures: interleaved features become blocks, other epics untouched, no-op returns the same array', () => {
  const stories = rn([ft('Billing', 'Pay'), ft('Onboarding', 'Intro'), ft('Billing', 'Refund'), ft('Billing', 'Pay')]);
  const [p1, o1, r1, p2] = stories;
  const out = gatherFeatures(stories, I);
  assert.deepEqual(out.map((s) => s.id), [p1.id, o1.id, p2.id, r1.id]);
  assert.deepEqual(codes(out), ['B1-B-0001', 'B1-O-0001', 'B1-B-0002', 'B1-B-0003']);
  assert.equal(gatherFeatures(out, I), out);
});

test('gatherFeatures: a frozen story keeps its ID', () => {
  const stories = rn([ft('Billing', 'Pay'), ft('Billing', 'Refund'), ft('Billing', 'Pay')]);
  const frozen = freezeStories(stories, new Set([stories[1].id])).stories; // B1-B-0002 in Refund
  const out = gatherFeatures(frozen, I);
  assert.deepEqual(features(out), ['Pay', 'Pay', 'Refund']);
  assert.equal(out[2].code, 'B1-B-0002');
  assert.deepEqual(codes(out), ['B1-B-0001', 'B1-B-0003', 'B1-B-0002']);
});

test('recodedBetween: old code -> new code for changed stories only', () => {
  const stories = rn([ft('Billing', 'Pay'), ft('Billing', 'Refund'), ft('Billing', 'Invoice'), st('')]);
  const out = moveGroup(stories, { epic: 'Billing', feature: 'Invoice' }, 'Pay', I);
  assert.deepEqual([...recodedBetween(stories, out)], [['B1-B-0001', 'B1-B-0002'], ['B1-B-0002', 'B1-B-0003'], ['B1-B-0003', 'B1-B-0001']]);
  assert.equal(recodedBetween(stories, stories).size, 0);
  const gathered = gatherFeatures(rn([ft('Billing', 'Pay'), ft('Billing', 'Refund'), ft('Billing', 'Pay')]), I);
  assert.equal(recodedBetween(stories.slice(0, 2), gathered.slice(0, 2)).size, 0); // other ids: nothing to map
});

test('recodedBetween: a frozen story that keeps its code is not listed; a repeated old code is left out', () => {
  const stories = rn([ft('Billing', 'Pay'), ft('Billing', 'Refund'), ft('Billing', 'Refund')]);
  const frozen = freezeStories(stories, new Set([stories[1].id])).stories;
  const out = moveGroup(frozen, { epic: 'Billing', feature: 'Refund' }, 'Pay', I);
  assert.ok(![...recodedBetween(frozen, out).keys()].includes('B1-B-0002'));
  const twin = [{ ...stories[0] }, { ...stories[1], code: stories[0].code }];
  assert.equal(recodedBetween(twin, [{ ...twin[0], code: 'X-0001' }, { ...twin[1], code: 'X-0002' }]).size, 0);
});
