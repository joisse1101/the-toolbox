import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBacklog } from '../../logic/model.js';
import { NONE, filterOptions, filterStories, sortStories } from '../../logic/story-table.js';

const CSV = [
  'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On',
  ',Billing,Invoices,beta,,13,High,',
  ',Billing,Payments,Alpha,,3,Low,',
  ',Admin,Users,Gamma,,,,',
  ',Admin,,delta,,5,High,',
].join('\n');

const { stories } = loadBacklog(CSV);
const titles = (list) => list.map((s) => s.title);

test('a blank filter keeps every story', () => {
  assert.equal(filterStories(stories, {}).length, 4);
  assert.equal(filterStories(stories, { priority: '', epic: '', feature: '' }).length, 4);
});

test('filters combine and NONE matches an empty field', () => {
  assert.deepEqual(titles(filterStories(stories, { priority: 'High' })), ['beta', 'delta']);
  assert.deepEqual(titles(filterStories(stories, { priority: 'High', epic: 'Admin' })), ['delta']);
  assert.deepEqual(titles(filterStories(stories, { priority: NONE })), ['Gamma']);
  assert.deepEqual(titles(filterStories(stories, { feature: NONE })), ['delta']);
});

test('sort is alphabetical ignoring case, either direction, empty values last', () => {
  assert.deepEqual(titles(sortStories(stories, 'title')), ['Alpha', 'beta', 'delta', 'Gamma']);
  assert.deepEqual(titles(sortStories(stories, 'title', 'desc')), ['Gamma', 'delta', 'beta', 'Alpha']);
  assert.deepEqual(titles(sortStories(stories, 'feature')), ['beta', 'Alpha', 'Gamma', 'delta']);
  assert.deepEqual(titles(sortStories(stories, 'feature', 'desc')), ['Gamma', 'Alpha', 'beta', 'delta']);
});

test('digit runs sort in numeric order and the input is not changed', () => {
  const before = titles(stories);
  assert.deepEqual(titles(sortStories(stories, 'points')), ['Alpha', 'delta', 'beta', 'Gamma']);
  assert.deepEqual(titles(stories), before);
});

test('priority is not a sort key', () => {
  assert.equal(sortStories(stories, 'priority'), stories);
});

test('filter options are sorted, priority keeps its own order, NONE last', () => {
  assert.deepEqual(filterOptions(stories, 'epic'), ['Admin', 'Billing']);
  assert.deepEqual(filterOptions(stories, 'feature'), ['Invoices', 'Payments', 'Users', NONE]);
  assert.deepEqual(filterOptions(stories, 'priority'), ['High', 'Low', NONE]);
});
