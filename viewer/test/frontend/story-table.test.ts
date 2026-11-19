import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBacklog } from '#shared/backlog/model.ts';
import { NONE, filterOptions, filterStories, sortStories, tickRange, tickableIds, visibleChecked } from '#frontend/src/tools/backlog/features/stories/story-table.ts';

const CSV = [
  'ID,Epic,Feature,Title,User Story,Sprint points,Depends On',
  ',Billing,Invoices,beta,,13,',
  ',Billing,Payments,Alpha,,3,',
  ',Admin,Users,Gamma,,,',
  ',Admin,,delta,,5,',
].join('\n');

const { stories } = loadBacklog(CSV, { initials: 'B1' });
const titles = (list: Array<{ title: string }>) => list.map((s) => s.title);

test('a blank filter keeps every story', () => {
  assert.equal(filterStories(stories, {}).length, 4);
  assert.equal(filterStories(stories, { epic: '', feature: '' }).length, 4);
});

test('filters combine and NONE matches an empty field', () => {
  assert.deepEqual(titles(filterStories(stories, { epic: 'Billing' })), ['beta', 'Alpha']);
  assert.deepEqual(titles(filterStories(stories, { epic: 'Admin', feature: 'Users' })), ['Gamma']);
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

test('filter options are sorted, NONE last', () => {
  assert.deepEqual(filterOptions(stories, 'epic'), ['Admin', 'Billing']);
  assert.deepEqual(filterOptions(stories, 'feature'), ['Invoices', 'Payments', 'Users', NONE]);
});

test('visibleChecked keeps only ticked stories among the rows on screen and counts the hidden ones', () => {
  const [beta, alpha, gamma, delta] = stories;
  const checked = new Set([beta.id, gamma.id, delta.id]);
  const rows = filterStories(stories, { epic: 'Billing' }); // beta and alpha
  const { ids, hiddenCount } = visibleChecked(rows, checked);
  assert.deepEqual([...ids], [beta.id]);
  assert.equal(hiddenCount, 2);
  assert.ok(!ids.has(alpha.id));
});

test('visibleChecked returns no ids when a search hides every ticked story', () => {
  const checked = new Set([stories[0].id, stories[1].id]);
  const { ids, hiddenCount } = visibleChecked(filterStories(stories, { epic: 'Admin' }), checked);
  assert.equal(ids.size, 0);
  assert.equal(hiddenCount, 2);
});

test('visibleChecked hides nothing when every row is shown', () => {
  const checked = new Set([stories[2].id]);
  const { ids, hiddenCount } = visibleChecked(stories, checked);
  assert.deepEqual([...ids], [stories[2].id]);
  assert.equal(hiddenCount, 0);
});

const freeze = (list: typeof stories, ...at: number[]) => list.map((s, i) => (at.includes(i) ? { ...s, frozen: true } : s));

test('tickRange leaves a frozen row out of a shift range', () => {
  const rows = freeze(stories, 1);
  assert.deepEqual(tickRange(rows, rows[2].id, rows[0].id, true), [rows[0].id, rows[2].id]);
});

test('tickRange ticks one row without shift or when the anchor is not shown', () => {
  assert.deepEqual(tickRange(stories, stories[2].id, stories[0].id, false), [stories[2].id]);
  assert.deepEqual(tickRange(stories, stories[2].id, null, true), [stories[2].id]);
});

test('tickRange returns nothing for a click on a frozen row', () => {
  const rows = freeze(stories, 2);
  assert.deepEqual(tickRange(rows, rows[2].id, null, false), []);
});

test('tickableIds leaves frozen rows out of select-all', () => {
  const rows = freeze(stories, 0, 3);
  assert.deepEqual(tickableIds(rows), [rows[1].id, rows[2].id]);
});

test('tickableIds is empty when every shown row is frozen', () => {
  assert.deepEqual(tickableIds(freeze(stories, 0, 1, 2, 3)), []);
});
