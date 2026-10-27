import test from 'node:test';
import assert from 'node:assert/strict';
import { groupStories, layoutGraph } from '../../portal/web/user-story-generator/graph.js';

let n = 0;
const story = (epic, feature, code, dependsOn = []) => ({ id: ++n, epic, feature, code, dependsOn });
const named = (g) => [...g.groups.values()].map((x) => `${x.epic}/${x.name}`);
const idOf = (g, epic, name) => [...g.groups.values()].find((x) => x.epic === epic && x.name === name).id;

test('groups: a feature name in two epics is two groups', () => {
  const g = groupStories([story('Billing', 'Setup', 'B-1'), story('Auth', 'Setup', 'A-1')], 'features');
  assert.deepEqual(named(g), ['Billing/Setup', 'Auth/Setup']);
});

test('groups: one edge per pair of groups, with the story links behind it', () => {
  const a1 = story('E', 'Login', 'E-1'), a2 = story('E', 'Login', 'E-2');
  const b1 = story('E', 'Session', 'E-3', ['E-1', 'E-2']), b2 = story('E', 'Session', 'E-4', ['E-1']);
  const g = groupStories([a1, a2, b1, b2], 'features');
  const login = idOf(g, 'E', 'Login'), session = idOf(g, 'E', 'Session');
  assert.deepEqual([...g.pairs.keys()], [`${session}>${login}`]);
  assert.equal(g.pairs.get(`${session}>${login}`).length, 3);
  assert.deepEqual(g.items.find((x) => x.id === session).dependsOn, [g.groups.get(login).key]);
  assert.deepEqual(g.mutual, []);
});

test('groups: links inside a group are counted, not drawn', () => {
  const a = story('E', 'Login', 'E-1'), b = story('E', 'Login', 'E-2', ['E-1']);
  const g = groupStories([a, b], 'features');
  assert.equal(g.groups.get(1).internal, 1);
  assert.equal(g.pairs.size, 0);
  assert.equal(layoutGraph(g.items).unlinked.length, 1);
});

test('groups: a repeated Depends On entry counts once', () => {
  const a = story('E', 'X', 'E-1'), b = story('E', 'Y', 'E-2', ['E-1', 'E-1']);
  const g = groupStories([a, b], 'features');
  assert.equal([...g.pairs.values()][0].length, 1);
});

test('groups: stories without ID, Epic or Feature are left out', () => {
  const g = groupStories([story('E', 'F', ''), story('', 'F', 'X-1'), story('E', '', 'E-3'), story(' E ', ' F ', 'E-4')], 'features');
  assert.deepEqual(named(g), ['E/F']);
  assert.equal(g.groups.get(1).storyIds.length, 1);
});

test('groups: a dependency on a left-out story is ignored', () => {
  const g = groupStories([story('E', 'F', 'E-1', ['E-9']), story('E', '', 'E-9')], 'features');
  assert.equal(g.pairs.size, 0);
});

test('groups: the epics level ignores the feature', () => {
  const a = story('Auth', '', 'A-1'), b = story('Billing', 'Pay', 'B-1', ['A-1']), c = story('Billing', 'Refund', 'B-2', ['B-1']);
  const g = groupStories([a, b, c], 'epics');
  assert.deepEqual(named(g), ['Auth/Auth', 'Billing/Billing']);
  assert.equal(g.pairs.size, 1);
  assert.equal(g.groups.get(2).internal, 1);
  assert.equal(g.groups.get(2).storyIds.length, 2);
});

test('groups: two features that depend on each other are a mutual pair, not a story cycle', () => {
  const stories = [
    story('E', 'A', 'E-1'), story('E', 'A', 'E-2', ['E-3']),
    story('E', 'B', 'E-3'), story('E', 'B', 'E-4', ['E-1']),
  ];
  assert.equal(layoutGraph(stories).cyclic, false);
  const g = groupStories(stories, 'features');
  assert.deepEqual(g.mutual, [[1, 2]]);
  const layout = layoutGraph(g.items);
  assert.equal(layout.cyclic, true);
  assert.equal(layout.edges.length, 2);
  assert.equal(layout.edges.filter((e) => e.back).length, 1);
});

test('groups: a longer circle of groups has no mutual pair but lays out as cyclic', () => {
  const stories = [story('E', 'A', 'E-1', ['E-3']), story('E', 'B', 'E-2', ['E-1']), story('E', 'C', 'E-3', ['E-2'])];
  const g = groupStories(stories, 'features');
  assert.deepEqual(g.mutual, []);
  assert.equal(layoutGraph(g.items).cyclic, true);
});
