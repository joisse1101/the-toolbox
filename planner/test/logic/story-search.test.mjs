import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBacklog } from '../../logic/model.js';
import { matchesQuery, findStories, searchReply, SEARCH_CAP } from '../../logic/story-search.js';

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

test('findStories: one line per match with ID, Title, Epic > Feature and source', () => {
  const { stories } = loadBacklog(CSV);
  const withIds = stories.map((s, i) => ({ ...s, code: `BIL-000${i + 1}` }));
  assert.deepEqual(findStories(withIds, 'csv', headers, 'backlog'), ['BIL-0001 | Export | Billing > Invoices | backlog']);
  assert.deepEqual(findStories(withIds, 'zebra', headers, 'backlog'), []);
  assert.deepEqual(findStories([{ ...withIds[0], epic: '', feature: '' }], 'csv', headers, 'proposed'), ['BIL-0001 | Export | (No epic) > (No feature) | proposed']);
});

test('findStories: a benched story never matches', () => {
  assert.deepEqual(findStories([{ ...first, code: 'NEW-1', benched: true }], 'csv', headers, 'proposed'), []);
});

test('searchReply: count, cap and what was left out', () => {
  assert.equal(searchReply([]), 'No story matches.');
  assert.match(searchReply(['a | b | c | backlog']), /^1 story matches/);
  const many = Array.from({ length: SEARCH_CAP + 15 }, (_, i) => `S-${i} | t | e > f | backlog`);
  const out = searchReply(many).split('\n');
  assert.equal(out.length, SEARCH_CAP + 2); // header, the capped lines, the tail
  assert.equal(out[0].startsWith('40 stories match'), true);
  assert.equal(out.at(-1), '15 more matched; narrow the query.');
});
