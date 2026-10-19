import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBacklog } from '../core/model.js';
import { parseLexicon } from '../core/lexicon.js';
import { backlogChecks } from '../core/backlog-checks.js';

const HEAD = 'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes,Locked,Clarifications';
const US = 'As a user, I want to do it, so that it is done';
const AC = 'AC1: Given a, when b, then c';
const q = (s) => `"${s.replace(/"/g, '""')}"`;
// A backlog row: overrides by column name.
const row = (o = {}) => {
  const v = { ID: '', Epic: 'Data', Feature: 'Export', Title: 'Export a file', 'User Story': US, 'Sprint points': '3', Priority: '', 'Depends On': '', 'User Acceptance Criteria': AC, Notes: '', Locked: '', Clarifications: '', ...o };
  return HEAD.split(',').map((h) => q(v[h])).join(',');
};
const backlog = (...rows) => loadBacklog([HEAD, ...rows].join('\n')).stories;
const proposed = (...rows) => loadBacklog([`${HEAD},Benched`, ...rows].join('\n'), { placeholderIds: true }).stories;
const lexicon = (...rows) => parseLexicon(['Term,Part of,Definition,Avoid,Notes', ...rows].join('\n'));
const kinds = (problems) => problems.map((p) => p.kind);

test('a clean backlog has no problems', () => {
  assert.deepEqual(backlogChecks({ stories: backlog(row()) }), []);
});

test('dangling dependency is reported on the story', () => {
  const out = backlogChecks({ stories: backlog(row({ 'Depends On': 'D-0099' })) });
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'dependency');
  assert.equal(out[0].storyId, 'D-0001');
  assert.match(out[0].message, /D-0099, which does not exist/);
});

test('a dependency on a proposed story is reported', () => {
  const out = backlogChecks({ stories: backlog(row({ 'Depends On': 'NEW-1' })) });
  assert.match(out[0].message, /still proposed/);
});

test('duplicate Epic, Feature and Title name each other, ignoring case and spaces', () => {
  const out = backlogChecks({ stories: backlog(row(), row({ Title: '  export  A FILE ' })) });
  assert.deepEqual(kinds(out), ['duplicate', 'duplicate']);
  assert.match(out[0].message, /D-0002/);
  assert.match(out[1].message, /D-0001/);
});

test('same Title under another Feature is not a duplicate', () => {
  assert.deepEqual(backlogChecks({ stories: backlog(row(), row({ Feature: 'Import' })) }), []);
});

test('a story with the same Epic, Feature and Title as a proposed story is reported', () => {
  const out = backlogChecks({ stories: backlog(row()), proposals: proposed(row({ ID: 'NEW-1' })) });
  assert.deepEqual(kinds(out), ['proposal-overlap']);
  assert.match(out[0].message, /proposed story NEW-1/);
});

test('a benched proposal is ignored', () => {
  const benched = `${row({ ID: 'NEW-1' })},Yes`;
  assert.deepEqual(backlogChecks({ stories: backlog(row()), proposals: proposed(benched) }), []);
});

test('points: missing, off the scale and above 13', () => {
  const out = backlogChecks({ stories: backlog(row({ 'Sprint points': '' }), row({ Title: 'B', 'Sprint points': '4' }), row({ Title: 'C', 'Sprint points': '21' }), row({ Title: 'D', 'Sprint points': '13' })) });
  assert.deepEqual(out.map((p) => p.title), ['Export a file', 'B', 'C']);
  assert.match(out[0].message, /missing/);
  assert.match(out[1].message, /not on the scale/);
  assert.match(out[2].message, /above 13/);
});

test('missing parts are reported as incomplete, and Priority is never reported', () => {
  const out = backlogChecks({ stories: backlog(row({ Feature: '', Priority: '' })) });
  assert.deepEqual(kinds(out), ['incomplete']);
  assert.match(out[0].message, /Feature is missing/);
});

test('an avoided word is reported whole-word and case-insensitively, naming the term to use', () => {
  const lex = lexicon('Dataset,,A set of rows,table;grid,');
  const out = backlogChecks({ stories: backlog(row({ Title: 'Export the Table', 'User Story': 'As a user, I want a stable view, so that it is done' })), lexicon: lex });
  assert.deepEqual(kinds(out), ['avoid-word']);
  assert.equal(out[0].message, 'Uses "table" in Title; the lexicon says to use "Dataset"');
});

test('an avoided word in the criteria and the user story is found', () => {
  const lex = lexicon('Dataset,,A set of rows,grid,');
  const out = backlogChecks({ stories: backlog(row({ 'User Story': 'As a user, I want a grid, so that it is done', 'User Acceptance Criteria': 'AC1: Given a, when b, then the grid shows' })), lexicon: lex });
  assert.match(out[0].message, /in User Story, User Acceptance Criteria/);
});

test('a missing lexicon gives no lexicon problems', () => {
  assert.deepEqual(backlogChecks({ stories: backlog(row()), lexicon: null }), []);
});

test('lexicon problems are reported against the term', () => {
  const out = backlogChecks({ stories: backlog(row()), lexicon: lexicon('Dataset,Missing,A set of rows,,') });
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'lexicon');
  assert.equal(out[0].term, 'Dataset');
  assert.equal(out[0].storyId, undefined);
});

test('an answered Clarifications pair is reported, an open one is not', () => {
  const out = backlogChecks({ stories: backlog(row({ Clarifications: 'Q1: Who approves?\nA1: Finance\nQ2: By when?\nA2:' })) });
  assert.deepEqual(kinds(out), ['unresolved-answer']);
  assert.match(out[0].message, /^Q1 is answered/);
});

test('a locked story is checked and marked locked', () => {
  const out = backlogChecks({ stories: backlog(row({ ID: 'D-0001', Locked: 'Yes', 'Depends On': 'D-0099' })) });
  assert.equal(out.length, 1);
  assert.equal(out[0].locked, true);
});
