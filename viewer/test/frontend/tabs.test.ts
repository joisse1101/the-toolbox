import test from 'node:test';
import assert from 'node:assert/strict';
import { TABS, resolveTab } from '#frontend/src/tools/backlog/tabs.ts';

const open = { hasBacklog: true, hasReview: true };
const noReview = { hasBacklog: true, hasReview: false };
const none = { hasBacklog: false, hasReview: false };

test('lists the seven tabs of the backlog tool', () => {
  assert.deepEqual(TABS, ['editor', 'stories', 'graph', 'proposed', 'lexicon', 'review', 'settings']);
});

test('shows the requested tab when a backlog is open', () => {
  for (const tab of TABS) assert.equal(resolveTab(tab, open), tab);
});

test('shows graph when /backlog/graph is opened with a backlog open', () => {
  assert.equal(resolveTab('graph', noReview), 'graph');
});

test('falls back to settings for every tab when no backlog is open', () => {
  for (const tab of TABS) assert.equal(resolveTab(tab, none), 'settings');
});

test('falls back to editor for review when the backlog has no review file', () => {
  assert.equal(resolveTab('review', noReview), 'editor');
});

test('keeps the other tabs when the backlog has no review file', () => {
  for (const tab of TABS.filter((t) => t !== 'review')) assert.equal(resolveTab(tab, noReview), tab);
});

test('returns null for an unknown tab', () => {
  assert.equal(resolveTab('nonsense', open), null);
  assert.equal(resolveTab('nonsense', none), null);
  assert.equal(resolveTab(undefined, open), null);
});
