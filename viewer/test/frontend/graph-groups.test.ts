import test from 'node:test';
import assert from 'node:assert/strict';
import type { Story } from '#shared/types.ts';
import { groupStories, groupBacklogs, layoutGraph, withOtherStories } from '#frontend/src/tools/backlog/features/graph/graph.ts';

let n = 0;
// A partial story: the grouping code reads only these fields.
const story = (epic: string, feature: string, code: string, dependsOn: string[] = []) => ({ id: ++n, epic, feature, code, dependsOn }) as Story;
type Grouped = ReturnType<typeof groupStories>;
const named = (g: Grouped) => [...g.groups.values()].map((x) => `${x.epic}/${x.name}`);
const idOf = (g: Grouped, epic: string, name: string) => [...g.groups.values()].find((x) => x.epic === epic && x.name === name)!.id;

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
  assert.equal(g.pairs.get(`${session}>${login}`)!.length, 3);
  assert.deepEqual(g.items.find((x) => x.id === session)!.dependsOn, [g.groups.get(login)!.key]);
  assert.deepEqual(g.mutual, []);
});

test('groups: links inside a group are counted, not drawn', () => {
  const a = story('E', 'Login', 'E-1'), b = story('E', 'Login', 'E-2', ['E-1']);
  const g = groupStories([a, b], 'features');
  assert.equal(g.groups.get(1)!.internal, 1);
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
  assert.equal(g.groups.get(1)!.storyIds.length, 1);
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
  assert.equal(g.groups.get(2)!.internal, 1);
  assert.equal(g.groups.get(2)!.storyIds.length, 2);
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

// A story with a title, for the cases that read another backlog's stories.
const titled = (epic: string, code: string, dependsOn: string[] = [], title = code) => ({ ...story(epic, '', code, dependsOn), title }) as Story;

test('groups: stories of another backlog are one group named after it, with its linked stories counted', () => {
  const open = [titled('Billing', 'B1-1', ['B3-1']), titled('Billing', 'B1-2', ['B3-2']), titled('Billing', 'B1-3')];
  const payments = [titled('Pay', 'B3-1'), titled('Pay', 'B3-2'), titled('Pay', 'B3-9')];
  const g = groupStories(withOtherStories(open, [{ name: 'payments', stories: payments }]), 'epics');
  assert.deepEqual(named(g), ['Billing/Billing', '/payments']);
  const billing = g.groups.get(1)!, other = g.groups.get(2)!;
  assert.equal(other.other, true);
  assert.equal(other.storyIds.length, 2);
  assert.equal(g.pairs.get(`${billing.id}>${other.id}`)!.length, 2);
  assert.deepEqual(layoutGraph(g.items).unlinked, []);
});

test('groups: another backlog is a group at the features level too, and a dependent counts as a link', () => {
  const open = [{ ...titled('E', 'B1-1'), feature: 'Login' } as Story];
  const reporting = [titled('R', 'B2-1', ['B1-1', 'B2-9']), titled('R', 'B2-2', ['B2-1'])];
  const g = groupStories(withOtherStories(open, [{ name: 'reporting', stories: reporting }]), 'features');
  assert.equal(g.groups.get(2)!.name, 'reporting');
  assert.equal(g.pairs.get('2>1')!.length, 1);
});

test('backlogs: arrow weights count the story links between two backlogs', () => {
  const core = [titled('A', 'C-1', ['P-1']), titled('A', 'C-2')];
  const reporting = [titled('R', 'R-1', ['C-1']), titled('R', 'R-2', ['C-2'])];
  const payments = [titled('P', 'P-1')];
  const g = groupBacklogs([
    { name: 'core', initials: 'C', stories: core, open: true },
    { name: 'reporting', initials: 'R', stories: reporting },
    { name: 'payments', initials: 'P', stories: payments },
  ]);
  const id = (name: string) => [...g.groups.values()].find((x) => x.name === name)!.id;
  assert.equal(g.pairs.get(`${id('reporting')}>${id('core')}`)!.length, 2);
  assert.equal(g.pairs.get(`${id('core')}>${id('payments')}`)!.length, 1);
  assert.equal(g.groups.get(id('core'))!.open, true);
  assert.equal(g.groups.get(id('payments'))!.initials, 'P');
  assert.equal(layoutGraph(g.items).nodes.length, 3);
});

test('backlogs: a link between two other backlogs is an arrow', () => {
  const g = groupBacklogs([
    { name: 'core', initials: 'C', stories: [titled('A', 'C-1')], open: true },
    { name: 'reporting', initials: 'R', stories: [titled('R', 'R-1', ['P-1'])] },
    { name: 'payments', initials: 'P', stories: [titled('P', 'P-1')] },
  ]);
  assert.deepEqual([...g.pairs.keys()], ['2>3']);
  const [pair] = g.pairs.get('2>3')!;
  assert.equal(g.members.get(pair.from)!.backlog, 'reporting');
  assert.equal(g.members.get(pair.to)!.story.code, 'P-1');
});

test('backlogs: a backlog with no link to another is unlinked, with its story count', () => {
  const g = groupBacklogs([
    { name: 'core', initials: 'C', stories: [titled('A', 'C-1'), titled('A', 'C-2', ['C-1'])], open: true },
    { name: 'reporting', initials: 'R', stories: [titled('R', 'R-1', ['P-1'])] },
    { name: 'payments', initials: 'P', stories: [titled('P', 'P-1'), titled('P', 'P-2')] },
  ]);
  const layout = layoutGraph(g.items);
  const core = [...g.groups.values()].find((x) => x.name === 'core')!;
  assert.deepEqual(layout.unlinked.map((u) => u.id), [core.id]);
  assert.equal(core.storyIds.length, 2);
  assert.equal(core.internal, 1);
});

test('backlogs: two backlogs that depend on each other are a mutual pair, not a story cycle', () => {
  const core = [titled('A', 'C-1', ['P-1']), titled('A', 'C-2')];
  const payments = [titled('P', 'P-1'), titled('P', 'P-2', ['C-2'])];
  assert.equal(layoutGraph([...core, ...payments]).cyclic, false);
  const g = groupBacklogs([
    { name: 'core', initials: 'C', stories: core, open: true },
    { name: 'payments', initials: 'P', stories: payments },
  ]);
  assert.deepEqual(g.mutual, [[1, 2]]);
  assert.equal(g.pairs.size, 2);
});

test('backlogs: stories of two backlogs that share an id stay apart', () => {
  const a = { ...titled('A', 'C-1'), id: 1 } as Story, b = { ...titled('R', 'R-1', ['C-1']), id: 1 } as Story;
  const g = groupBacklogs([{ name: 'core', initials: 'C', stories: [a], open: true }, { name: 'reporting', initials: 'R', stories: [b] }]);
  assert.equal(g.members.size, 2);
  const [pair] = g.pairs.get('2>1')!;
  assert.notEqual(pair.from, pair.to);
});
