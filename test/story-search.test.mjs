import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBacklog } from '../core/model.js';
import { matchesQuery } from '../core/story-search.js';

const CSV = [
  'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes,Legacy Ref',
  ',Billing,Invoices,Export,"As a lead, I want to export so that I can share",3,High,,"Given an invoice, when I export, then I get a file",needs csv,OLD-42',
  ',Billing,Invoices,Other,,1,,,,,',
].join('\n');

const open = () => loadBacklog(CSV);
const [first, second] = open().stories;
const headers = open().headers;
const hit = (story, q) => matchesQuery(story, q, headers);

test('a word in a field the table does not show matches', () => {
  assert.equal(hit(first, 'invoice'), true); // criteria
  assert.equal(hit(first, 'csv'), true); // notes
  assert.equal(hit(first, 'share'), true); // user story
  assert.equal(hit(second, 'invoice'), true); // its Feature
  assert.equal(hit(second, 'share'), false);
});

test('a column the tool does not know is searched', () => {
  assert.equal(hit(first, 'old-42'), true);
  assert.equal(hit(second, 'old-42'), false);
});

test('case is ignored', () => {
  assert.equal(hit(first, 'EXPORT'), true);
});

test('every word must appear, in any fields', () => {
  assert.equal(hit(first, 'export csv'), true);
  assert.equal(hit(first, 'export zebra'), false);
  assert.equal(hit(second, 'export csv'), false);
});

test('extra spaces are ignored and a blank query matches all', () => {
  assert.equal(hit(first, '  export   csv  '), true);
  assert.equal(hit(first, ''), true);
  assert.equal(hit(second, '   '), true);
});

test('an edited field is searched by its new text, not the loaded one', () => {
  const edited = { ...first, title: 'Download' };
  assert.equal(hit(edited, 'download'), true);
  assert.equal(hit({ ...edited, notes: '' }, 'csv'), false);
  assert.equal(hit(edited, 'Export'), true); // still in its user story and criteria
  assert.equal(hit({ ...edited, rawUserStory: null, asA: '', iWant: '', soThat: '', criteria: [], rawCriteria: null }, 'export'), false);
});

test('clarifications are searched', () => {
  const asked = { ...first, clarifications: [{ q: 'Which currency?', a: '' }], rawClarifications: null };
  assert.equal(hit(asked, 'currency'), true);
  assert.equal(hit(first, 'currency'), false);
});
