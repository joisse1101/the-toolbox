import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../public/shared/csv.js';
import {
  loadBacklog, serializeBacklog, newStory, newBacklogText, shouldSplit, COLUMNS,
} from '../public/user-story-generator/model.js';

const SAMPLE =
  '﻿Jira Key,Feature,Sprint points,Epic,User Story,Capability,Acceptance Criteria,Priority,Notes\r\n' +
  'ABC-1,Export,4,Reporting,As a lead I want export so that share,Files,"AC1: Given a, when I b, then I am c\nAC2: Given d, when I e, then I am f",Urgent,"line1\nline2"\r\n' +
  'ABC-2,Import,100,Reporting,Free text story,Files,,,\r\n';

test('loads by header name in any order, keeps extras and odd values', () => {
  const b = loadBacklog(SAMPLE);
  assert.equal(b.hasBom, true);
  assert.equal(b.stories.length, 2);
  const s = b.stories[0];
  assert.equal(s.epic, 'Reporting');
  assert.equal(s.feature, 'Export');
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
