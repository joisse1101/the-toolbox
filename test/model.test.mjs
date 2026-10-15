import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../core/csv.js';
import {
  loadBacklog, serializeBacklog, newStory, newBacklogText, shouldSplit, storyIssues, storyLabel, COLUMNS,
  groupByEpic, displayOrder, applyBulk,
} from '../core/model.js';

const SAMPLE =
  '﻿Jira Key,Title,Sprint points,Epic,User Story,Feature,User Acceptance Criteria,Priority,Notes\r\n' +
  'ABC-1,Export,4,Reporting,As a lead I want export so that share,Files,"AC1: Given a, when I b, then c\nAC2: Given d, when I e, then f",Urgent,"line1\nline2"\r\n' +
  'ABC-2,Import,100,Reporting,Free text story,Files,,,\r\n';

test('loads by header name in any order, keeps extras and odd values', () => {
  const b = loadBacklog(SAMPLE);
  assert.equal(b.hasBom, true);
  assert.equal(b.stories.length, 2);
  const s = b.stories[0];
  assert.equal(s.epic, 'Reporting');
  assert.equal(s.title, 'Export');
  assert.equal(s.feature, 'Files');
  assert.equal(s.iWant, 'export');
  assert.equal(s.criteria.length, 2);
  assert.equal(s.points, '4');
  assert.equal(s.priority, 'Urgent');
  assert.equal(s.notes, 'line1\nline2');
  const bad = b.stories[1];
  assert.equal(bad.rawUserStory, 'Free text story');
  assert.equal(shouldSplit(bad), true);
  assert.equal(shouldSplit(s), false);
});

test('save keeps extra column, malformed cell, odd points and priority unchanged', () => {
  const b = loadBacklog(SAMPLE);
  b.stories[0].epic = 'Reporting v2';
  const rows = parseCsv(serializeBacklog(b));
  assert.deepEqual(rows[0], b.headers);
  const jira = rows[0].indexOf('Jira Key');
  const us = rows[0].indexOf('User Story');
  const pts = rows[0].indexOf('Sprint points');
  const pr = rows[0].indexOf('Priority');
  assert.equal(rows[1][jira], 'ABC-1');
  assert.equal(rows[2][jira], 'ABC-2');
  assert.equal(rows[2][us], 'Free text story');
  assert.equal(rows[1][pts], '4');
  assert.equal(rows[1][pr], 'Urgent');
  assert.equal(rows[1][rows[0].indexOf('Epic')], 'Reporting v2');
  // missing commas are normalised on save
  assert.equal(rows[1][us], 'As a lead, I want export, so that share');
});

test('new story round-trips through a header-only file', () => {
  const b = loadBacklog(newBacklogText());
  assert.deepEqual(b.headers, COLUMNS);
  assert.equal(b.stories.length, 0);
  const s = newStory(b.headers);
  Object.assign(s, { asA: 'lead', iWant: 'x', soThat: 'y', points: '5', notes: 'a\nb' });
  s.criteria = [{ given: 'g', when: 'w', then: 't' }];
  b.stories.push(s);
  const again = loadBacklog(serializeBacklog(b));
  assert.equal(again.stories[0].asA, 'lead');
  assert.equal(again.stories[0].points, '5');
  assert.equal(again.stories[0].notes, 'a\nb');
  assert.deepEqual(again.stories[0].criteria, s.criteria);
});

test('missing recognised columns are appended', () => {
  const b = loadBacklog('Epic\r\nE1\r\n');
  assert.deepEqual(b.headers, ['Epic', ...COLUMNS.filter((c) => c !== 'Epic')]);
  assert.equal(b.stories[0].epic, 'E1');
});

const complete = () => {
  const s = newStory(COLUMNS);
  Object.assign(s, {
    epic: 'E', feature: 'F', title: 'T', asA: 'a', iWant: 'b', soThat: 'c', points: '5', priority: 'High',
  });
  s.criteria = [{ given: 'g', when: 'w', then: 't' }];
  return s;
};

test('complete story has no issues', () => {
  assert.deepEqual(storyIssues(complete()), { errors: [], warnings: [] });
});

test('blank feature is an error', () => {
  const s = complete();
  s.feature = '  ';
  const { errors } = storyIssues(s);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Feature/);
});

test('blank title is an error', () => {
  const s = complete();
  s.title = '';
  const { errors } = storyIssues(s);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Title/);
});

test('an old Capability column is kept as an unknown column and not copied into Feature or Title', () => {
  const b = loadBacklog('Epic,Capability\r\nE,Authentication\r\n');
  const s = b.stories[0];
  assert.equal(s.feature, ''); // headers are matched by name, so nothing is translated
  assert.equal(s.title, '');
  const rows = parseCsv(serializeBacklog(b));
  assert.equal(rows[1][rows[0].indexOf('Capability')], 'Authentication');
  assert.equal(rows[1][rows[0].indexOf('Feature')], '');
  assert.equal(rows[1][rows[0].indexOf('Title')], '');
});

test('a file without a Title column gets one on save', () => {
  const b = loadBacklog('Epic,Feature\r\nE,F\r\n');
  const rows = parseCsv(serializeBacklog(b));
  assert.ok(rows[0].includes('Title'));
  assert.equal(rows[1][rows[0].indexOf('Feature')], 'F');
});

test('half-filled criterion is an error; no criterion is an error', () => {
  const s = complete();
  s.criteria = [{ given: 'g', when: 'w', then: '' }];
  assert.match(storyIssues(s).errors[0], /Acceptance criteria/);
  s.criteria = [];
  assert.match(storyIssues(s).errors[0], /Acceptance criteria/);
});

test('missing points and priority are warnings only', () => {
  const s = complete();
  s.points = '';
  s.priority = '';
  const r = storyIssues(s);
  assert.equal(r.errors.length, 0);
  assert.equal(r.warnings.length, 2);
});

test('red and split together', () => {
  const s = complete();
  s.epic = '';
  s.points = '21';
  const r = storyIssues(s);
  assert.equal(r.errors.length, 1);
  assert.match(r.warnings[0], /splitting/);
});

test('raw text cells count as present', () => {
  const s = complete();
  Object.assign(s, { asA: '', iWant: '', soThat: '', rawUserStory: 'free text', rawCriteria: 'free', criteria: [] });
  assert.equal(storyIssues(s).errors.length, 0);
});

test('storyLabel', () => {
  const s = newStory(COLUMNS);
  assert.equal(storyLabel(s), 'New story');
  s.feature = 'Authentication';
  assert.equal(storyLabel(s), 'New story');
  s.title = '  Local Login ';
  assert.equal(storyLabel(s), 'Local Login');
});

test('loaded story with empty criteria cell shows one blank criterion and saves an empty cell', () => {
  const text = COLUMNS.join(',') + String.fromCharCode(13,10) + 'E-0001,E,C,F,,,,,,,' + String.fromCharCode(13,10) + '';
  const b = loadBacklog(text);
  assert.equal(b.changed, false);
  assert.deepEqual(b.stories[0].criteria, [{ given: '', when: '', then: '' }]);
  assert.equal(serializeBacklog(b), text);
});

const withEpic = (epic, id) => Object.assign(newStory(COLUMNS), { epic, id });

test('groupByEpic and displayOrder group by first occurrence without reordering the input', () => {
  const stories = [withEpic('Billing', 1), withEpic('Onboarding', 2), withEpic('Billing', 3), withEpic('  ', 4), withEpic('', 5)];
  const groups = groupByEpic(stories);
  assert.deepEqual(groups.map((g) => [g.label, g.stories.map((s) => s.id)]), [
    ['Billing', [1, 3]], ['Onboarding', [2]], ['(No epic)', [4, 5]],
  ]);
  assert.deepEqual(displayOrder(stories).map((s) => s.id), [1, 3, 2, 4, 5]);
  assert.deepEqual(stories.map((s) => s.id), [1, 2, 3, 4, 5]);
});

test('groupByEpic splits each epic by feature and displayOrder follows epic then feature', () => {
  const s = (id, epic, feature) => Object.assign(withEpic(epic, id), { feature });
  const stories = [s(1, 'Billing', 'Invoices'), s(2, 'Billing', 'Refunds'), s(3, 'Billing', 'Invoices'), s(4, 'Billing', ' '), s(5, 'Onboarding', '')];
  const groups = groupByEpic(stories);
  assert.deepEqual(groups.map((g) => [g.label, g.features.map((f) => [f.label, f.stories.map((x) => x.id)])]), [
    ['Billing', [['Invoices', [1, 3]], ['Refunds', [2]], ['(No feature)', [4]]]],
    ['Onboarding', [['(No feature)', [5]]]],
  ]);
  assert.deepEqual(groups[0].stories.map((x) => x.id), [1, 2, 3, 4]);
  assert.deepEqual(displayOrder(stories).map((x) => x.id), [1, 3, 2, 4, 5]);
  assert.deepEqual(stories.map((x) => x.id), [1, 2, 3, 4, 5]);
});

test('applyBulk sets only the chosen fields on the selected stories', () => {
  const stories = [1, 2, 3].map((id) => Object.assign(newStory(COLUMNS), { id, epic: 'E', feature: 'C', priority: 'Low' }));
  assert.deepEqual(applyBulk(stories, new Set([1, 3]), { priority: 'High', epic: ' ', feature: 'New' }), { changed: 2, skipped: 0 });
  assert.deepEqual(stories.map((s) => [s.epic, s.feature, s.priority]), [['E', 'New', 'High'], ['E', 'C', 'Low'], ['E', 'New', 'High']]);
  applyBulk(stories, new Set([1]), { priority: '', epic: 'Billing' });
  assert.deepEqual([stories[0].epic, stories[0].priority], ['Billing', '']);
  applyBulk(stories, new Set([2]), {});
  assert.deepEqual([stories[1].epic, stories[1].feature, stories[1].priority], ['E', 'C', 'Low']);
});

const PROPOSED =
  'ID,Epic,Feature,Title,Depends On\r\n' +
  'NEW-3,Billing,Invoices,Create invoice,NEW-1;IAM-0002\r\n' +
  'NEW-1,Billing,Invoices,Send invoice,\r\n';

test('loadBacklog derives IDs by default, placeholderIds keeps the written ones', () => {
  const derived = loadBacklog(PROPOSED);
  assert.deepEqual(derived.stories.map((s) => s.code), ['B-0001', 'B-0002']);
  assert.equal(derived.changed, true);

  const kept = loadBacklog(PROPOSED, { placeholderIds: true });
  assert.deepEqual(kept.stories.map((s) => s.code), ['NEW-3', 'NEW-1']);
  assert.deepEqual(kept.stories[0].dependsOn, ['NEW-1', 'IAM-0002']);
  assert.equal(kept.changed, false);
});

test('placeholder IDs and their Depends On survive a load/serialize round trip', () => {
  const kept = loadBacklog(PROPOSED, { placeholderIds: true });
  const again = loadBacklog(serializeBacklog(kept), { placeholderIds: true });
  assert.deepEqual(again.stories.map((s) => [s.code, s.dependsOn]), [['NEW-3', ['NEW-1', 'IAM-0002']], ['NEW-1', []]]);
});

test('Locked column: Yes loads as locked and round-trips', () => {
  const text = COLUMNS.join(',') + '\r\nE-0001,E,F,One,,,,,,,Yes\r\nE-0002,E,F,Two,,,,,,,\r\n';
  const b = loadBacklog(text);
  assert.deepEqual(b.stories.map((s) => s.locked), [true, false]);
  assert.equal(b.changed, false);
  assert.equal(serializeBacklog(b), text);
});

test('an older file gains the Locked column on save', () => {
  const b = loadBacklog('ID,Epic,Title\r\nE-0001,E,One\r\n');
  assert.ok(b.headers.includes('Locked'));
  assert.equal(b.stories[0].locked, false);
  assert.match(serializeBacklog(b), /Locked\r\n/);
});

test('Locked: Yes without an ID, or any other value, loads unlocked', () => {
  const b = loadBacklog('ID,Epic,Title,Locked\r\n,,One,Yes\r\nE-0001,E,Two,maybe\r\nE-0002,E,Three, YES \r\n');
  assert.deepEqual(b.stories.map((s) => s.locked), [false, false, true]);
});

test('proposed stories are never locked', () => {
  const b = loadBacklog('ID,Epic,Title,Locked\r\nNEW-1,E,One,Yes\r\n', { placeholderIds: true });
  assert.equal(b.stories[0].locked, false);
});

test('applyBulk: an Epic change skips locked stories but Priority and Feature still apply', () => {
  const stories = [1, 2, 3].map((id) => Object.assign(newStory(COLUMNS), { id, epic: 'E', feature: 'C', priority: 'Low', locked: id === 2 }));
  assert.deepEqual(applyBulk(stories, new Set([1, 2, 3]), { epic: 'Billing' }), { changed: 2, skipped: 1 });
  assert.deepEqual(stories.map((s) => s.epic), ['Billing', 'E', 'Billing']);
  assert.deepEqual(applyBulk(stories, new Set([2]), { priority: 'High', epic: 'Billing', feature: 'F' }), { changed: 1, skipped: 1 });
  assert.deepEqual([stories[1].epic, stories[1].priority, stories[1].feature], ['E', 'High', 'F']);
  assert.deepEqual(applyBulk(stories, new Set([2]), { priority: 'Low' }), { changed: 1, skipped: 0 });
});

test('Benched: only a proposals file has the column, and it round-trips', async () => {
  const { loadBacklog, serializeBacklog, proposalHeaders } = await import('../core/model.js');
  assert.ok(!loadBacklog('ID,Epic\r\n').headers.includes('Benched'));
  const loaded = loadBacklog('ID,Epic,Benched\r\nNEW-1,IAM,Yes\r\nNEW-2,IAM,\r\n', { placeholderIds: true });
  assert.deepEqual(loaded.stories.map((s) => s.benched), [true, false]);
  assert.match(serializeBacklog(loaded), /NEW-1,IAM,.*Yes/);
  assert.ok(loadBacklog('ID,Epic\r\n', { placeholderIds: true }).headers.includes('Benched'));
  assert.deepEqual(proposalHeaders(['ID', 'Benched']), ['ID', 'Benched']);
  assert.equal(proposalHeaders(['ID']).at(-1), 'Benched');
});
