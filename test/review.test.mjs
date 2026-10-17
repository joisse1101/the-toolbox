import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBacklog } from '../core/model.js';
import {
  parseReview, serializeReview, validateFindings, fillCurrent, mergeStatus, suggestionState, applySuggestions,
  unitsOf, unitState, criterionNumberOf, openCounts, openUnitsFor, retargetRows, reviewOverview, REVIEW_COLUMNS,
} from '../core/review.js';

const CSV =
  'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes\r\n' +
  'IAM-0001,Identity & Access Management,Auth,Login,"As a user, I want to log in, so that I can access the portal",5,High,,"AC1: Given a, when b, then c\nAC2: Given d, when e, then f",\r\n' +
  'IAM-0002,Identity & Access Management,Auth,Logout,"As a user, I want to log out, so that I end my session",3,High,IAM-0001,"AC1: Given g, when h, then i",note one\r\n' +
  'IAM-0003,Identity & Access Management,SSO,SSO Login,"As a user, I want SSO, so that no credentials",55,,,,\r\n';

const backlog = () => loadBacklog(CSV);

const finding = (over = {}) => ({
  storyId: 'IAM-0001', field: 'Title', action: 'replace', suggested: 'Log in with a password', reason: 'Clearer title',
  area: 'Hierarchy', confidence: 'ready', group: '', ...over,
});

test('review CSV round-trips values with commas, quotes and line breaks', () => {
  const rows = [{
    storyId: 'IAM-0001', field: 'User Acceptance Criteria', action: 'add', current: '',
    suggested: 'AC3: Given "x", when y,\nz, then w', reason: 'Missing, "failure" path', area: 'Acceptance criteria',
    confidence: 'ready', group: '', status: 'open',
  }];
  const text = serializeReview(rows);
  assert.equal(text.charCodeAt(0), 0xfeff);
  const back = parseReview(text);
  assert.equal(back.ok, true);
  assert.deepEqual(back.rows, rows);
  assert.deepEqual(parseCsvHeader(text), REVIEW_COLUMNS);
});

function parseCsvHeader(text) {
  return text.replace(/^﻿/, '').split('\r\n')[0].split(',');
}

test('parseReview reports a missing column and skips unknown fields', () => {
  assert.equal(parseReview('Story ID,Field\r\nA,Title\r\n').ok, false);
  const text = serializeReview([
    { storyId: 'A-1', field: 'Bogus', action: 'replace', current: '', suggested: 'x', reason: 'r', area: 'INVEST', confidence: 'ready', group: '', status: 'open' },
  ]);
  const r = parseReview(text);
  assert.equal(r.rows.length, 0);
  assert.equal(r.skipped, 1);
});

test('valid findings pass validation', () => {
  assert.deepEqual(validateFindings([finding()], backlog()), []);
});

test('unknown story, bad enums and empty suggestion are all reported together', () => {
  const errors = validateFindings(
    [finding({ storyId: 'ZZ-0009' }), finding({ action: 'delete' }), finding({ suggested: '' }), finding({ area: 'Misc' })],
    backlog(),
  );
  assert.ok(errors.some((e) => e.includes('ZZ-0009')));
  assert.ok(errors.some((e) => e.includes('Action "delete"')));
  assert.ok(errors.some((e) => e.includes('Suggested is empty')));
  assert.ok(errors.some((e) => e.includes('Area "Misc"')));
});

test('action must fit the field', () => {
  const errors = validateFindings([finding({ action: 'add' })], backlog());
  assert.ok(errors.some((e) => e.includes('does not fit Field Title')));
});

test('value checks: user story syntax, points scale, priority, criterion shape', () => {
  const b = backlog();
  assert.ok(validateFindings([finding({ field: 'User Story', suggested: 'free text' })], b).length);
  assert.ok(validateFindings([finding({ field: 'Sprint points', suggested: '7' })], b).length);
  assert.ok(validateFindings([finding({ field: 'Priority', suggested: 'Urgent' })], b).length);
  assert.ok(validateFindings([finding({ field: 'User Acceptance Criteria', action: 'add', suggested: 'not a criterion' })], b).length);
  assert.deepEqual(validateFindings([finding({ field: 'Sprint points', suggested: '8' })], b), []);
});

test('criterion replace needs an existing AC label', () => {
  const b = backlog();
  const ok = finding({ field: 'User Acceptance Criteria', action: 'replace', suggested: 'AC2: Given x, when y, then z' });
  assert.deepEqual(validateFindings([ok], b), []);
  assert.ok(validateFindings([{ ...ok, suggested: 'AC9: Given x, when y, then z' }], b).some((e) => e.includes('no criterion AC9')));
  assert.ok(validateFindings([{ ...ok, suggested: 'Given x, when y, then z' }], b).some((e) => e.includes('label')));
});

test('Depends On targets and removal are checked', () => {
  const b = backlog();
  const dep = (over) => finding({ field: 'Depends On', action: 'add', suggested: 'IAM-0003', ...over });
  assert.deepEqual(validateFindings([dep({})], b), []);
  assert.ok(validateFindings([dep({ suggested: 'ZZ-1' })], b).length);
  assert.ok(validateFindings([dep({ suggested: 'IAM-0001' })], b).some((e) => e.includes('itself')));
  assert.ok(validateFindings([dep({ storyId: 'IAM-0002', action: 'remove', suggested: 'IAM-0003' })], b).some((e) => e.includes('does not depend')));
});

test('split groups need NEW ids, a Title per new story and all rows confirm', () => {
  const b = backlog();
  const group = (over = {}) => [
    finding({ storyId: 'IAM-0003', field: 'Title', suggested: 'SSO sign-in', confidence: 'confirm', group: 'split-3' }),
    finding({ storyId: 'NEW-1', field: 'Title', action: 'add-story', suggested: 'SSO sign-out', confidence: 'confirm', group: 'split-3' }),
    finding({ storyId: 'NEW-1', field: 'Depends On', action: 'add-story', suggested: 'IAM-0003', confidence: 'confirm', group: 'split-3' }),
    ...(over.extra ?? []),
  ];
  assert.deepEqual(validateFindings(group(), b), []);
  const noTitle = group().filter((r) => !(r.storyId === 'NEW-1' && r.field === 'Title'));
  assert.ok(validateFindings(noTitle, b).some((e) => e.includes('no Title')));
  const notConfirm = group().map((r, i) => (i === 0 ? { ...r, confidence: 'ready' } : r));
  assert.ok(validateFindings(notConfirm, b).some((e) => e.includes('every row in a group')));
  const noGroup = group().map((r) => ({ ...r, group: '' }));
  assert.ok(validateFindings(noGroup, b).some((e) => e.includes('needs a Group')));
});

test('fillCurrent reads Current from the backlog and ignores what the caller sent', () => {
  const b = backlog();
  const rows = fillCurrent([
    { ...finding({ field: 'User Story', suggested: 'As a user, I want x, so that y' }), current: 'LIES', status: 'applied' },
    finding({ field: 'User Acceptance Criteria', action: 'replace', suggested: 'AC2: Given x, when y, then z' }),
    finding({ field: 'User Acceptance Criteria', action: 'add', suggested: 'AC3: Given x, when y, then z' }),
    finding({ storyId: 'IAM-0002', field: 'Depends On', action: 'remove', suggested: 'IAM-0001' }),
  ], b);
  assert.equal(rows[0].current, 'As a user, I want to log in, so that I can access the portal');
  assert.equal(rows[0].status, 'open');
  assert.equal(rows[1].current, 'AC2: Given d, when e, then f');
  assert.equal(rows[2].current, '');
  assert.equal(rows[3].current, 'IAM-0001');
});

test('re-run keeps the status of identical rows', () => {
  const b = backlog();
  const fresh = fillCurrent([finding(), finding({ suggested: 'Another title' })], b);
  const old = [{ ...fresh[0], status: 'dismissed' }];
  const merged = mergeStatus(fresh, old);
  assert.equal(merged[0].status, 'dismissed');
  assert.equal(merged[1].status, 'open');
});

const rowsFor = (findings, b = backlog()) => fillCurrent(findings, b);

test('replace is open until the field is edited, then stale', () => {
  const b = backlog();
  const [row] = rowsFor([finding()], b);
  assert.equal(suggestionState(row, b.stories).state, 'open');
  const edited = b.stories.map((s) => (s.code === 'IAM-0001' ? { ...s, title: 'Changed by hand' } : s));
  assert.equal(suggestionState(row, edited).state, 'stale');
  assert.equal(suggestionState(row, []).state, 'stale');
});

test('applying replace, append and criterion add/replace', () => {
  const b = backlog();
  const rows = rowsFor([
    finding({ field: 'Title', suggested: 'New title' }),
    finding({ storyId: 'IAM-0002', field: 'Notes', action: 'append', suggested: 'Question: split or merge?', confidence: 'confirm' }),
    finding({ field: 'User Acceptance Criteria', action: 'replace', suggested: 'AC1: Given A, when B, then C' }),
    finding({ field: 'User Acceptance Criteria', action: 'add', suggested: 'AC3: Given x, when y, then z' }),
  ], b);
  const r = applySuggestions(b.stories, rows, b.headers);
  assert.equal(r.error, undefined);
  const s1 = r.stories.find((s) => s.code === 'IAM-0001');
  assert.equal(s1.title, 'New title');
  assert.deepEqual(s1.criteria.map((c) => c.given), ['A', 'd', 'x']);
  assert.equal(r.stories.find((s) => s.code === 'IAM-0002').notes, 'note one\nQuestion: split or merge?');
  assert.equal(b.stories.find((s) => s.code === 'IAM-0001').title, 'Login', 'input is not mutated');
});

test('applying a User Story replace parses it into the three fields', () => {
  const b = backlog();
  const rows = rowsFor([finding({ field: 'User Story', suggested: 'As a visitor, I want in, so that I see things' })], b);
  const s = applySuggestions(b.stories, rows, b.headers).stories.find((x) => x.code === 'IAM-0001');
  assert.deepEqual([s.asA, s.iWant, s.soThat], ['visitor', 'in', 'I see things']);
});

test('adding a criterion to a story with only the blank placeholder replaces the placeholder', () => {
  const b = backlog();
  const rows = rowsFor([finding({ storyId: 'IAM-0003', field: 'User Acceptance Criteria', action: 'add', suggested: 'AC1: Given x, when y, then z' })], b);
  const s = applySuggestions(b.stories, rows, b.headers).stories.find((x) => x.code === 'IAM-0003');
  assert.equal(s.criteria.length, 1);
  assert.equal(s.criteria[0].then, 'z');
});

test('Depends On add and remove, and a cycle is refused', () => {
  const b = backlog();
  const add = rowsFor([finding({ storyId: 'IAM-0003', field: 'Depends On', action: 'add', suggested: 'IAM-0002' })], b);
  const r = applySuggestions(b.stories, add, b.headers);
  assert.deepEqual(r.stories.find((s) => s.code === 'IAM-0003').dependsOn, ['IAM-0002']);

  const remove = rowsFor([finding({ storyId: 'IAM-0002', field: 'Depends On', action: 'remove', suggested: 'IAM-0001' })], b);
  assert.deepEqual(applySuggestions(b.stories, remove, b.headers).stories.find((s) => s.code === 'IAM-0002').dependsOn, []);

  const cycle = rowsFor([finding({ storyId: 'IAM-0001', field: 'Depends On', action: 'add', suggested: 'IAM-0002' })], b);
  const bad = applySuggestions(b.stories, cycle, b.headers);
  assert.match(bad.error, /cycle/);
  assert.equal(bad.stories, undefined);
});

test('changing the Epic renumbers and links follow the story', () => {
  const b = backlog();
  const rows = rowsFor([finding({ storyId: 'IAM-0001', field: 'Epic', suggested: 'Billing' })], b);
  const r = applySuggestions(b.stories, rows, b.headers);
  const moved = r.stories.find((s) => s.title === 'Login');
  assert.match(moved.code, /^B-/);
  assert.deepEqual(r.stories.find((s) => s.title === 'Logout').dependsOn, [moved.code]);
});

test('a split group narrows the original and creates new stories', () => {
  const b = backlog();
  const rows = rowsFor([
    finding({ storyId: 'IAM-0003', field: 'Title', suggested: 'SSO sign-in', confidence: 'confirm', group: 'split-3' }),
    finding({ storyId: 'IAM-0003', field: 'Sprint points', suggested: '13', confidence: 'confirm', group: 'split-3' }),
    finding({ storyId: 'NEW-1', field: 'Title', action: 'add-story', suggested: 'SSO sign-out', confidence: 'confirm', group: 'split-3' }),
    finding({ storyId: 'NEW-1', field: 'Sprint points', action: 'add-story', suggested: '5', confidence: 'confirm', group: 'split-3' }),
    finding({ storyId: 'NEW-1', field: 'User Acceptance Criteria', action: 'add-story', suggested: 'AC1: Given a, when b, then c', confidence: 'confirm', group: 'split-3' }),
    finding({ storyId: 'NEW-1', field: 'Depends On', action: 'add-story', suggested: 'IAM-0003', confidence: 'confirm', group: 'split-3' }),
  ], b);
  const r = applySuggestions(b.stories, rows, b.headers);
  assert.equal(r.error, undefined);
  assert.equal(r.stories.length, 4);
  const orig = r.stories.find((s) => s.title === 'SSO sign-in');
  assert.equal(orig.points, '13');
  const created = r.stories.find((s) => s.title === 'SSO sign-out');
  assert.equal(created.epic, "Identity & Access Management");
  assert.equal(created.feature, 'SSO');
  assert.equal(created.code, 'IAM-0004');
  assert.deepEqual(created.dependsOn, [orig.code]);
  assert.equal(created.criteria.length, 1);
});

test('a group is stale as a whole when one row is stale, and nothing is applied', () => {
  const b = backlog();
  const rows = rowsFor([
    finding({ storyId: 'IAM-0003', field: 'Title', suggested: 'SSO sign-in', confidence: 'confirm', group: 'g' }),
    finding({ storyId: 'NEW-1', field: 'Title', action: 'add-story', suggested: 'Other', confidence: 'confirm', group: 'g' }),
  ], b);
  const edited = b.stories.map((s) => (s.code === 'IAM-0003' ? { ...s, title: 'By hand' } : s));
  const [unit] = unitsOf(rows);
  assert.equal(unitState(unit, edited).state, 'stale');
  assert.ok(applySuggestions(edited, rows, b.headers).error);
});

test('open counts skip stale and decided rows and do not count new-story rows', () => {
  const b = backlog();
  const rows = rowsFor([finding(), finding({ suggested: 'Second' }), finding({ storyId: 'IAM-0002', field: 'Title', suggested: 'X' })], b);
  rows[1].status = 'dismissed';
  const edited = b.stories.map((s) => (s.code === 'IAM-0002' ? { ...s, title: 'edited' } : s));
  const counts = openCounts(rows, edited);
  assert.equal(counts.get('IAM-0001'), 1);
  assert.equal(counts.get('IAM-0002'), undefined);
});

// ---- criterion remove, Priority not reviewed, Review tab overview ----

const removeAc = (n, over = {}) => finding({ field: 'User Acceptance Criteria', action: 'remove', suggested: `AC${n}`, ...over });

test('Priority is not a reviewable field', () => {
  const errors = validateFindings([finding({ field: 'Priority', suggested: 'High' })], backlog());
  assert.ok(errors.some((e) => e.includes('Field "Priority"')));
});

test('remove on User Acceptance Criteria takes the label alone and needs an existing criterion', () => {
  const b = backlog();
  assert.deepEqual(validateFindings([removeAc(2)], b), []);
  assert.ok(validateFindings([removeAc(9)], b).some((e) => e.includes('no criterion AC9')));
  assert.ok(validateFindings([removeAc(1, { suggested: 'AC1: Given a, when b, then c' })], b).some((e) => e.includes('just the label')));
  assert.ok(validateFindings([removeAc(1, { storyId: 'IAM-0003' })], b).length, 'blank placeholder criteria cannot be removed');
});

test('remove fills Current with the criterion text and is stale when that criterion changed', () => {
  const b = backlog();
  const [row] = fillCurrent([removeAc(2)], b);
  assert.equal(row.current, 'AC2: Given d, when e, then f');
  assert.equal(suggestionState(row, b.stories).state, 'open');
  const edited = b.stories.map((s) => (s.code === 'IAM-0001' ? { ...s, criteria: [s.criteria[0], { ...s.criteria[1], then: 'changed' }] } : s));
  assert.equal(suggestionState(row, edited).state, 'stale');
});

test('applying remove drops the criterion; several removes use the labels the review saw', () => {
  const b = backlog();
  const one = applySuggestions(b.stories, fillCurrent([removeAc(1)], b), b.headers);
  assert.deepEqual(one.stories.find((s) => s.code === 'IAM-0001').criteria.map((c) => c.given), ['d']);

  const both = applySuggestions(b.stories, fillCurrent([removeAc(1), removeAc(2)], b), b.headers);
  const left = both.stories.find((s) => s.code === 'IAM-0001').criteria;
  assert.equal(left.length, 1, 'a story keeps one (blank) criterion row');
  assert.equal(left[0].given, '');

  const mixed = applySuggestions(b.stories, fillCurrent([
    removeAc(1),
    finding({ field: 'User Acceptance Criteria', action: 'replace', suggested: 'AC2: Given x, when y, then z' }),
    finding({ field: 'User Acceptance Criteria', action: 'add', suggested: 'AC3: Given n, when o, then p' }),
  ], b), b.headers);
  assert.deepEqual(mixed.stories.find((s) => s.code === 'IAM-0001').criteria.map((c) => c.given), ['x', 'n']);
});

test('overview groups open suggestions by Area in backlog order and lists out-of-date ones apart', () => {
  const b = backlog();
  const rows = fillCurrent([
    finding({ storyId: 'IAM-0002', field: 'Title', suggested: 'Log out', area: 'INVEST' }),
    finding({ storyId: 'IAM-0001', field: 'Title', suggested: 'Log in', area: 'INVEST' }),
    finding({ storyId: 'IAM-0001', field: 'Feature', suggested: 'Sign in', area: 'Hierarchy' }),
    finding({ storyId: 'IAM-0003', field: 'Title', suggested: 'SSO', area: 'Acceptance criteria' }),
    finding({ storyId: 'ZZ-0001', field: 'Title', suggested: 'Gone', area: 'INVEST' }),
  ].filter((f) => f.storyId !== 'ZZ-0001'), b);
  rows.push({ ...rows[0], storyId: 'ZZ-0001', suggested: 'Gone' });
  const staleRow = rows.find((r) => r.storyId === 'IAM-0003');
  const edited = b.stories.map((s) => (s.code === 'IAM-0003' ? { ...s, title: 'By hand' } : s));
  const o = reviewOverview(rows, edited);
  assert.deepEqual(o.sections.map((s) => [s.area, s.units.length]), [['Hierarchy', 1], ['INVEST', 2], ['Acceptance criteria', 0], ['Clarification', 0]]);
  assert.deepEqual(o.sections[1].units.map((u) => u.rows[0].storyId), ['IAM-0001', 'IAM-0002']);
  assert.equal(o.outOfDate.length, 2, 'the hand-edited title and the missing story');
  assert.equal(o.openCount, 3);
  assert.ok(o.outOfDate.some((u) => u.rows[0] === staleRow));
});

test('overview shows a split group once, under the story it narrows', () => {
  const b = backlog();
  const rows = fillCurrent([
    finding({ storyId: 'IAM-0003', field: 'Title', suggested: 'SSO sign-in', confidence: 'confirm', group: 'g', area: 'INVEST' }),
    finding({ storyId: 'NEW-1', field: 'Title', action: 'add-story', suggested: 'Other', confidence: 'confirm', group: 'g', area: 'INVEST' }),
  ], b);
  const o = reviewOverview(rows, b.stories);
  assert.equal(o.openCount, 1);
  assert.equal(o.sections[1].units[0].rows.length, 2);
});

test('openUnitsFor: open and stale units of the story, not applied or dismissed ones', () => {
  const b = backlog();
  const rows = rowsFor([finding(), finding({ suggested: 'Second' }), finding({ storyId: 'IAM-0002', field: 'Title', suggested: 'X' })], b);
  rows[1].status = 'dismissed';
  assert.deepEqual(openUnitsFor(rows, 'IAM-0001').map((u) => u.indexes), [[0]]);
  assert.equal(openUnitsFor(rows, 'IAM-0002').length, 1);
  rows[0].status = 'applied';
  assert.equal(openUnitsFor(rows, 'IAM-0001').length, 0);
  assert.equal(openUnitsFor(rows, ''). length, 0);
});

test('openUnitsFor: a stale suggestion still counts, a split group is one unit', () => {
  const b = backlog();
  const rows = rowsFor([finding({ group: 'g1' }), finding({ group: 'g1', suggested: 'B' })], b);
  const edited = b.stories.map((s) => (s.code === 'IAM-0001' ? { ...s, title: 'Changed by hand' } : s));
  assert.equal(unitState(openUnitsFor(rows, 'IAM-0001')[0], edited).state, 'stale');
  assert.deepEqual(openUnitsFor(rows, 'IAM-0001').map((u) => u.indexes), [[0, 1]]);
});

test('retargetRows: open rows follow renumbered stories, history stays, Depends On targets follow too', () => {
  const b = backlog();
  const rows = rowsFor([
    finding({ storyId: 'IAM-0002', field: 'Title', suggested: 'X' }),
    finding({ storyId: 'IAM-0002', field: 'Depends On', action: 'add', suggested: 'IAM-0003' }),
    finding({ storyId: 'IAM-0003', field: 'Title', suggested: 'Y' }),
  ], b);
  rows[2].status = 'dismissed';
  const out = retargetRows(rows, new Map([['IAM-0002', 'IAM-0001'], ['IAM-0003', 'IAM-0002']]));
  assert.deepEqual(out.map((r) => r.storyId), ['IAM-0001', 'IAM-0001', 'IAM-0003']);
  assert.equal(out[1].suggested, 'IAM-0002');
  assert.equal(retargetRows(rows, new Map()), rows);
});

// ---------- locked stories ----------

// IAM-0002 (Logout) locked.
const lockedBacklog = () => {
  const b = backlog();
  b.stories = b.stories.map((s) => (s.code === 'IAM-0002' ? { ...s, locked: true } : s));
  return b;
};
const unlockFinding = (over = {}) => ({
  storyId: 'IAM-0002', field: '', action: 'unlock', suggested: '', reason: 'Far too vague to build', area: 'INVEST', confidence: 'ready', group: '', ...over,
});
const editLogout = (over = {}) => finding({ storyId: 'IAM-0002', ...over });

test('an unlock row round-trips through the review CSV and is valid for a locked story', () => {
  assert.deepEqual(validateFindings([unlockFinding()], lockedBacklog()), []);
  const rows = fillCurrent([unlockFinding()], lockedBacklog());
  assert.equal(rows[0].current, '');
  assert.equal(rows[0].status, 'open');
  const back = parseReview(serializeReview(rows));
  assert.deepEqual(back.rows, rows);
  assert.equal(back.skipped, 0);
});

test('unlock rows: the story must be locked, Field/Suggested/Group must be empty', () => {
  assert.ok(validateFindings([unlockFinding({ storyId: 'IAM-0001' })], lockedBacklog()).some((e) => e.includes('not locked')));
  assert.ok(validateFindings([unlockFinding({ storyId: 'ZZ-0001' })], lockedBacklog()).some((e) => e.includes('ZZ-0001')));
  for (const over of [{ field: 'Title' }, { suggested: 'x' }, { group: 'g' }]) {
    assert.ok(validateFindings([unlockFinding(over)], lockedBacklog()).some((e) => e.includes('empty Field, Suggested and Group')), JSON.stringify(over));
  }
  assert.ok(validateFindings([unlockFinding({ reason: '' })], lockedBacklog()).some((e) => e.includes('Reason')));
});

test('a field edit on a locked story needs an unlock row in the batch or in the existing rows', () => {
  const b = lockedBacklog();
  const without = validateFindings([editLogout()], b);
  assert.ok(without.some((e) => e.includes('IAM-0002') && e.includes('locked')));
  assert.deepEqual(validateFindings([editLogout(), unlockFinding()], b), []);
  const earlier = fillCurrent([unlockFinding()], b);
  assert.deepEqual(validateFindings([editLogout()], b, { existingRows: earlier }), []);
  // an unlock row for another story does not count
  assert.ok(validateFindings([editLogout()], b, { existingRows: [{ ...earlier[0], storyId: 'IAM-0003' }] }).length > 0);
  // unlocked stories need nothing
  assert.deepEqual(validateFindings([finding()], b), []);
});

test('a split group that narrows a locked story needs an unlock row too', () => {
  const group = [
    editLogout({ confidence: 'confirm', group: 'split', suggested: 'Sign out' }),
    { storyId: 'NEW-1', field: 'Title', action: 'add-story', suggested: 'Expire session', reason: 'r', area: 'INVEST', confidence: 'confirm', group: 'split' },
  ];
  assert.ok(validateFindings(group, lockedBacklog()).some((e) => e.includes('locked')));
  assert.deepEqual(validateFindings([...group, unlockFinding()], lockedBacklog()), []);
});

test('suggestions on a locked story are in the locked state, unlock rows are open while locked', () => {
  const b = lockedBacklog();
  const [edit, unlock] = fillCurrent([editLogout({ suggested: 'Sign out' }), unlockFinding()], b);
  assert.deepEqual(suggestionState(edit, b.stories), { state: 'locked' });
  assert.deepEqual(suggestionState(unlock, b.stories), { state: 'open' });
  const plain = backlog();
  assert.deepEqual(suggestionState(edit, plain.stories), { state: 'open' });
  assert.equal(suggestionState(unlock, plain.stories).state, 'stale');
  assert.equal(suggestionState({ ...unlock, storyId: 'ZZ-0001' }, b.stories).state, 'stale');
  // stale wins over locked: the field was edited since the review
  const edited = b.stories.map((s) => (s.code === 'IAM-0002' ? { ...s, title: 'Other' } : s));
  assert.equal(suggestionState(edit, edited).state, 'stale');
});

test('unitState: a group with a locked story is locked; applying it is refused', () => {
  const b = lockedBacklog();
  const rows = fillCurrent([
    editLogout({ confidence: 'confirm', group: 'split', suggested: 'Sign out' }),
    { storyId: 'NEW-1', field: 'Title', action: 'add-story', suggested: 'Expire session', reason: 'r', area: 'INVEST', confidence: 'confirm', group: 'split' },
  ], b);
  const [unit] = unitsOf(rows);
  assert.equal(unitState(unit, b.stories).state, 'locked');
  assert.ok(applySuggestions(b.stories, unit.rows, b.headers).error.includes('locked'));
  const open = backlog();
  assert.equal(unitState(unit, open.stories).state, 'open');
  assert.ok(applySuggestions(open.stories, unit.rows, open.headers).stories);
});

test('applySuggestions refuses an unlock row; counts include locked-held and unlock rows', () => {
  const b = lockedBacklog();
  const rows = fillCurrent([editLogout({ suggested: 'Sign out' }), unlockFinding()], b);
  assert.ok(applySuggestions(b.stories, [rows[1]], b.headers).error);
  assert.equal(openCounts(rows, b.stories).get('IAM-0002'), 2);
  const overview = reviewOverview(rows, b.stories);
  assert.equal(overview.openCount, 2);
  assert.equal(overview.outOfDate.length, 0);
  // once unlocked by hand the unlock row is out of date and the edit is a normal suggestion
  const free = reviewOverview(rows, backlog().stories);
  assert.equal(free.outOfDate.length, 1);
  assert.equal(free.openCount, 1);
});

test('re-run keeps the status of an identical unlock row', () => {
  const [row] = fillCurrent([unlockFinding()], lockedBacklog());
  const merged = mergeStatus([row], [{ ...row, status: 'dismissed' }]);
  assert.equal(merged[0].status, 'dismissed');
});

const ask = (over = {}) => finding({ field: 'Clarifications', action: 'append', suggested: 'Which export format?', area: 'Clarification', confidence: 'confirm', ...over });

test('clarification suggestions: valid rows pass, labels, groups and other actions are rejected', () => {
  assert.deepEqual(validateFindings([ask(), ask({ area: 'Hierarchy', storyId: 'IAM-0002' })], backlog()), []);
  assert.match(validateFindings([ask({ suggested: 'Q1: Which?' })], backlog())[0], /without a "Q<n>:" label/);
  assert.match(validateFindings([ask({ group: 'g' })], backlog())[0], /takes no Group/);
  assert.match(validateFindings([ask({ action: 'replace' })], backlog())[0], /does not fit Field Clarifications/);
});

test('clarification suggestion: Apply adds an open question; asking twice is out of date', () => {
  const b = backlog();
  const [row] = fillCurrent([ask()], b);
  assert.equal(row.current, '');
  assert.equal(suggestionState(row, b.stories).state, 'open');
  const out = applySuggestions(b.stories, [row], b.headers);
  const story = out.stories.find((s) => s.code === 'IAM-0001');
  assert.deepEqual(story.clarifications, [{ q: 'Which export format?', a: '' }]);
  assert.equal(b.stories[0].clarifications.length, 0, 'input is not mutated');
  const again = suggestionState(row, out.stories);
  assert.equal(again.state, 'stale');
  assert.match(again.why, /already asked/);
  const dup = { ...row, suggested: '  which EXPORT format?  ' };
  assert.equal(suggestionState(dup, out.stories).state, 'stale');
});

test('clarification suggestion on a locked story waits for an unlock; free text cells are stale', () => {
  const b = backlog();
  const locked = b.stories.map((s) => (s.code === 'IAM-0001' ? { ...s, locked: true } : s));
  const [row] = fillCurrent([ask()], b);
  assert.equal(suggestionState(row, locked).state, 'locked');
  assert.match(applySuggestions(locked, [row], b.headers).error, /locked/);
  const raw = b.stories.map((s) => (s.code === 'IAM-0001' ? { ...s, rawClarifications: 'Ask Sam' } : s));
  assert.equal(suggestionState(row, raw).state, 'stale');
});

test('clarification rows round trip through the review CSV and show in the Clarification section', () => {
  const b = backlog();
  const rows = fillCurrent([ask({ reason: 'Matters, "a lot"' })], b);
  const back = parseReview(serializeReview(rows));
  assert.deepEqual(back.rows, rows);
  const o = reviewOverview(back.rows, b.stories);
  assert.deepEqual(o.sections.find((s) => s.area === 'Clarification').units.length, 1);
});

test('criterionNumberOf places a replace or remove row on the criterion its Current text names, only', () => {
  const story = backlog().stories.find((s) => s.code === 'IAM-0001');
  const unit = (over, group = '') => ({ group, rows: [finding({
    field: 'User Acceptance Criteria', suggested: 'AC2: Given d, when e, then x', current: 'AC2: Given d, when e, then f', ...over,
  })] });
  assert.equal(criterionNumberOf(unit({}), story), 2);
  assert.equal(criterionNumberOf(unit({ action: 'remove', suggested: 'AC1', current: 'AC1: Given a, when b, then c' }), story), 1);
  assert.equal(criterionNumberOf(unit({ suggested: 'AC9: Given d, when e, then x' }), story), 2, 'a moved criterion is found by its text');
  assert.equal(criterionNumberOf(unit({ current: 'AC2: Given d, when e, then gone' }), story), null);
  assert.equal(criterionNumberOf(unit({ action: 'add', suggested: 'AC4: Given a, when b, then c' }), story), null);
  assert.equal(criterionNumberOf(unit({ field: 'Title', suggested: 'AC2: x' }), story), null);
  assert.equal(criterionNumberOf(unit({}, 'split-1'), story), null);
});

// ---- criteria are tracked by their text, not their position ----

const criteriaCsv = (count) => {
  const cells = Array.from({ length: count }, (_, i) => `AC${i + 1}: Given g${i + 1}, when w${i + 1}, then t${i + 1}`).join('\n');
  return 'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes\r\n' +
    `DAM-0001,Data Asset Management,Sets,Big,"As a user, I want data, so that I know",5,High,,"${cells}",\r\n`;
};
const acRow = (action, suggested) => finding({ storyId: 'DAM-0001', field: 'User Acceptance Criteria', action, suggested });
const givens = (stories) => stories.find((s) => s.code === 'DAM-0001').criteria.map((c) => c.given);

test('rows on one story can be applied one at a time after a removal', () => {
  const b = loadBacklog(criteriaCsv(17));
  const rows = fillCurrent([
    acRow('remove', 'AC12'),
    acRow('remove', 'AC15'),
    acRow('replace', 'AC16: Given g16, when w16, then new'),
    acRow('add', 'AC18: Given extra, when w, then t'),
  ], b);
  let stories = b.stories;
  for (const row of rows) {
    assert.equal(suggestionState(row, stories).state, 'open', `${row.action} ${row.suggested} stays current`);
    const out = applySuggestions(stories, [row], b.headers);
    assert.equal(out.error, undefined);
    stories = out.stories;
  }
  const left = givens(stories);
  assert.equal(left.length, 16);
  assert.ok(!left.includes('g12') && !left.includes('g15'));
  assert.equal(stories.find((s) => s.code === 'DAM-0001').criteria[left.indexOf('g16')].then, 'new');
  assert.equal(left.at(-1), 'extra');
});

test('rows applied in any order give the same story', () => {
  const b = loadBacklog(criteriaCsv(17));
  const rows = fillCurrent([acRow('remove', 'AC12'), acRow('remove', 'AC15'), acRow('replace', 'AC16: Given g16, when w16, then new')], b);
  const run = (order) => order.reduce((stories, i) => applySuggestions(stories, [rows[i]], b.headers).stories, b.stories);
  assert.deepEqual(givens(run([0, 1, 2])), givens(run([2, 1, 0])));
  assert.deepEqual(givens(run([1, 0, 2])), givens(run([0, 2, 1])));
});

test('a criterion deleted by hand moves the rows of the others instead of staling them', () => {
  const b = loadBacklog(criteriaCsv(5));
  const rows = fillCurrent([acRow('replace', 'AC5: Given g5, when w5, then new'), acRow('remove', 'AC4')], b);
  const handDeleted = b.stories.map((s) => ({ ...s, criteria: s.criteria.filter((_, i) => i !== 1) }));
  assert.equal(suggestionState(rows[0], handDeleted).state, 'open');
  assert.equal(suggestionState(rows[1], handDeleted).state, 'open');
  const out = applySuggestions(handDeleted, [rows[1]], b.headers);
  assert.deepEqual(givens(out.stories), ['g1', 'g3', 'g5']);
});

test('a criterion edited by hand, or whose text appears twice away from its slot, is stale', () => {
  const b = loadBacklog(criteriaCsv(4));
  const [row] = fillCurrent([acRow('remove', 'AC3')], b);
  const edit = (fn) => b.stories.map((s) => ({ ...s, criteria: fn(s.criteria) }));

  const edited = edit((c) => c.map((x, i) => (i === 2 ? { ...x, then: 'changed' } : x)));
  assert.match(suggestionState(row, edited).why, /edited or removed/);

  const twice = edit((c) => [c[2], { ...c[2] }, c[0], c[1]]); // slot 3 now holds g1, g3 sits at slots 1 and 2
  const dup = suggestionState(row, twice);
  assert.equal(dup.state, 'stale');
  assert.match(dup.why, /2 criteria/);

  const nameSlot = edit((c) => [c[0], c[1], { ...c[2] }, { ...c[2] }]); // the named slot is one of the two matches
  assert.equal(suggestionState(row, nameSlot).state, 'open');
});
