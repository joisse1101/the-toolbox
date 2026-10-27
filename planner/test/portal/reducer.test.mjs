import test from 'node:test';
import assert from 'node:assert/strict';
import { reducer } from '../../portal/web/backlog-portal/hooks/useBacklog.js';
import { loadBacklog, applyBulk } from '../../logic/backlog/model.js';

const FILE = 'Epic,Title,Depends On\r\nBilling,A,\r\nBilling,B,\r\nOnboarding,C,\r\n';

function opened(text = FILE) {
  const backlog = loadBacklog(text);
  let state = {
    files: [], current: 'x.csv', backlog: null, selectedId: null, view: 'editor', checked: new Set(), lastChecked: null, edits: 0,
  };
  state = reducer(state, { type: 'loaded', name: 'x.csv', backlog });
  return state;
}
const byTitle = (state, f) => state.backlog.stories.find((s) => s.title === f);
const edit = (state, id, change) => reducer(state, { type: 'edit', id, change });

test('loaded: IDs assigned on load count as an edit so they get saved; an up-to-date file does not', () => {
  const state = opened();
  assert.equal(state.edits, 1);
  assert.deepEqual(state.backlog.stories.map((s) => s.code), ['B-0001', 'B-0002', 'O-0001']);
  const clean = opened('ID,Epic,Title,Depends On\r\nB-0001,Billing,A,\r\n');
  assert.equal(clean.edits, 0);
});

test('delete: closes the gap, strips links, keeps another story selected', () => {
  let state = opened();
  const [a, b, c] = state.backlog.stories;
  state = edit(state, c.id, (d) => { d.dependsOn = [a.code, b.code]; });
  state = reducer(state, { type: 'delete', id: a.id });
  assert.deepEqual(state.backlog.stories.map((s) => s.code), ['B-0001', 'O-0001']);
  assert.deepEqual(state.backlog.stories[1].dependsOn, ['B-0001']); // story b
});

test('commitEpic: typing changes no ID; committing does; a second commit is a no-op that bumps nothing', () => {
  let state = opened();
  const a = byTitle(state, 'A');
  state = edit(state, a.id, (d) => { d.epic = 'Onboarding'; });
  assert.equal(byTitle(state, 'A').code, 'B-0001');
  state = reducer(state, { type: 'commitEpic', id: a.id });
  assert.equal(byTitle(state, 'A').code, 'O-0002');
  assert.equal(byTitle(state, 'B').code, 'B-0001');
  const after = reducer(state, { type: 'commitEpic', id: a.id });
  assert.equal(after, state);
});

test('move: reorders, keeps the dragged story selected, same position bumps nothing', () => {
  let state = opened();
  const [a, b] = state.backlog.stories;
  state = reducer(state, { type: 'select', id: b.id });
  const edits = state.edits;
  const moved = reducer(state, { type: 'move', id: b.id, epic: 'Billing', beforeId: a.id });
  assert.equal(moved.selectedId, b.id);
  assert.equal(moved.edits, edits + 1);
  assert.equal(byTitle(moved, 'B').code, 'B-0001');
  assert.equal(byTitle(moved, 'A').code, 'B-0002');
  assert.equal(reducer(state, { type: 'move', id: a.id, epic: 'Billing', beforeId: b.id }), state);
});

test('bulk epic change: moved stories go to the bottom of the new epic and links follow', () => {
  let state = opened();
  const [a, b, c] = state.backlog.stories;
  state = edit(state, c.id, (d) => { d.dependsOn = [a.code]; });
  state = reducer(state, { type: 'check', ids: [a.id, b.id], on: true, anchor: a.id });
  state = reducer(state, { type: 'bulk', patch: { epic: 'Onboarding' } });
  assert.deepEqual(state.backlog.stories.map((s) => s.title), ['C', 'A', 'B']);
  assert.deepEqual(state.backlog.stories.map((s) => s.code), ['O-0001', 'O-0002', 'O-0003']);
  assert.deepEqual(state.backlog.stories[0].dependsOn, ['O-0002']);
  // priority only: IDs untouched
  const prio = reducer(state, { type: 'bulk', patch: { priority: 'High' } });
  assert.deepEqual(prio.backlog.stories.map((s) => s.code), ['O-0001', 'O-0002', 'O-0003']);
  assert.ok(applyBulk);
});

test('addDependency / removeDependency: edit links, ignore self, repeats, cycles and unknown codes', () => {
  let state = opened();
  const [a, b, c] = state.backlog.stories;
  const link = (from, to) => reducer(state, { type: 'addDependency', id: from.id, code: to.code });
  const edits = state.edits;

  state = link(b, a);
  assert.deepEqual(byTitle(state, 'B').dependsOn, [a.code]);
  assert.equal(state.edits, edits + 1);

  for (const next of [link(b, a), link(a, a), link(a, b), reducer(state, { type: 'addDependency', id: a.id, code: 'Z-9' })]) {
    assert.equal(next, state); // repeat, self, cycle, unknown
  }

  state = link(c, b);
  assert.deepEqual(byTitle(state, 'C').dependsOn, [b.code]);
  assert.equal(link(a, c), state); // indirect cycle: a -> c -> b -> a

  const removed = reducer(state, { type: 'removeDependency', id: b.id, code: a.code });
  assert.deepEqual(byTitle(removed, 'B').dependsOn, []);
  assert.equal(reducer(removed, { type: 'removeDependency', id: b.id, code: a.code }), removed);
});

// ---- review suggestions ----

const sRow = (over) => ({
  storyId: 'B-0001', field: 'Title', action: 'replace', current: 'A', suggested: 'Renamed', reason: 'r', area: 'INVEST',
  confidence: 'ready', group: '', status: 'open', ...over,
});

test('applySuggestions: replace goes through the reducer as an edit (bumps edits so it autosaves)', () => {
  const state = opened();
  const next = reducer(state, { type: 'applySuggestions', rows: [sRow()] });
  assert.equal(byTitle(next, 'Renamed').code, 'B-0001');
  assert.equal(next.edits, state.edits + 1);
});

test('applySuggestions: a stale row leaves the state untouched', () => {
  const state = opened();
  const next = reducer(state, { type: 'applySuggestions', rows: [sRow({ current: 'something else' })] });
  assert.equal(next, state);
});

test('applySuggestions: changing the Epic renumbers and moves links with the story', () => {
  let state = opened();
  const [a, b] = state.backlog.stories;
  state = edit(state, b.id, (d) => { d.dependsOn = [a.code]; });
  const next = reducer(state, { type: 'applySuggestions', rows: [sRow({ field: 'Epic', current: 'Billing', suggested: 'Onboarding' })] });
  const moved = byTitle(next, 'A');
  assert.match(moved.code, /^O-/);
  assert.deepEqual(byTitle(next, 'B').dependsOn, [moved.code]);
});

test('applySuggestions: Depends On cycle is refused, a valid link is added', () => {
  let state = opened();
  const [a, b] = state.backlog.stories;
  state = edit(state, b.id, (d) => { d.dependsOn = [a.code]; });
  const cycle = reducer(state, { type: 'applySuggestions', rows: [sRow({ field: 'Depends On', action: 'add', current: '', suggested: 'B-0002' })] });
  assert.equal(cycle, state);
  const ok = reducer(state, { type: 'applySuggestions', rows: [sRow({ storyId: 'O-0001', field: 'Depends On', action: 'add', current: '', suggested: 'B-0001' })] });
  assert.deepEqual(byTitle(ok, 'C').dependsOn, ['B-0001']);
});

test('applySuggestions: a split group narrows the original and adds stories in one edit', () => {
  const state = opened();
  const rows = [
    sRow({ suggested: 'A narrowed', group: 'g', confidence: 'confirm' }),
    sRow({ storyId: 'NEW-1', field: 'Title', action: 'add-story', current: '', suggested: 'A second part', group: 'g', confidence: 'confirm' }),
  ];
  const next = reducer(state, { type: 'applySuggestions', rows });
  assert.equal(next.backlog.stories.length, state.backlog.stories.length + 1);
  assert.equal(next.edits, state.edits + 1);
  assert.equal(byTitle(next, 'A second part').epic, 'Billing');
  assert.equal(byTitle(next, 'A second part').code, 'B-0003');
});

test('replaceStories: stores the list, marks it edited, keeps the selection when it survives', () => {
  const state = opened();
  const [a, b, c] = state.backlog.stories;
  const next = reducer({ ...state, selectedId: b.id }, { type: 'replaceStories', stories: [c, b] });
  assert.deepEqual(next.backlog.stories, [c, b]);
  assert.equal(next.selectedId, b.id);
  assert.equal(next.edits, state.edits + 1);
  const gone = reducer({ ...state, selectedId: a.id }, { type: 'replaceStories', stories: [c, b] });
  assert.equal(gone.selectedId, c.id);
  assert.equal(reducer(state, { type: 'replaceStories', stories: [] }).selectedId, null);
});

import { reducer as proposalsReducer } from '../../portal/web/backlog-portal/hooks/useProposals.js';

const PROPOSALS = 'ID,Epic,Feature,Title,Depends On\r\nNEW-2,Billing,Invoices,A,\r\nNEW-5,Reports,Exports,B,NEW-2\r\n';

function proposalsOpened(text = PROPOSALS) {
  const backlog = loadBacklog(text, { placeholderIds: true });
  return proposalsReducer({ current: null, backlog: null, selectedId: null, edits: 0 }, { type: 'loaded', name: 'x.csv', backlog });
}

test('proposals: opening changes nothing on disk (no edit counted) and keeps NEW-<n> IDs', () => {
  const state = proposalsOpened();
  assert.equal(state.edits, 0);
  assert.deepEqual(state.backlog.stories.map((s) => s.code), ['NEW-2', 'NEW-5']);
  assert.equal(state.selectedId, state.backlog.stories[0].id);
});

test('proposals: editing the Epic and committing it keeps the ID', () => {
  let state = proposalsOpened();
  const a = state.backlog.stories[0];
  state = proposalsReducer(state, { type: 'edit', id: a.id, change: (d) => { d.epic = 'Reports'; } });
  state = proposalsReducer(state, { type: 'commitEpic', id: a.id });
  assert.equal(state.backlog.stories[0].code, 'NEW-2');
  assert.equal(state.backlog.stories[0].codedEpic, 'Reports');
  assert.equal(proposalsReducer(state, { type: 'commitEpic', id: a.id }), state);
});

test('proposals: add takes a number above the proposals and the backlog Depends On; delete and move keep IDs', () => {
  let state = proposalsOpened();
  const backlogStories = loadBacklog('ID,Epic,Title,Depends On\r\nB-0001,Billing,X,NEW-9\r\n').stories;
  state = proposalsReducer(state, { type: 'add', story: { ...state.backlog.stories[0], id: 99, code: '' }, backlogStories });
  assert.equal(state.backlog.stories[2].code, 'NEW-10');
  assert.equal(state.selectedId, 99);
  assert.equal(state.edits, 1);

  const [a, b] = state.backlog.stories;
  state = proposalsReducer(state, { type: 'move', id: b.id, epic: 'Billing', beforeId: a.id });
  assert.deepEqual(state.backlog.stories.map((s) => s.code), ['NEW-5', 'NEW-2', 'NEW-10']);
  state = proposalsReducer(state, { type: 'delete', id: a.id });
  assert.deepEqual(state.backlog.stories.map((s) => s.code), ['NEW-5', 'NEW-10']);
  assert.deepEqual(state.backlog.stories[0].dependsOn, []); // NEW-5 depended on the deleted NEW-2
});

test('proposals: replaceStories marks an edit', () => {
  const state = proposalsOpened();
  const next = proposalsReducer(state, { type: 'replaceStories', stories: [state.backlog.stories[1]] });
  assert.equal(next.edits, 1);
  assert.equal(next.selectedId, state.backlog.stories[1].id);
});

test('lock: locks a story with an ID, skips none for unlock, a no-op bumps nothing', () => {
  let state = opened();
  const a = byTitle(state, 'A');
  const before = state.edits;
  state = reducer(state, { type: 'lock', ids: new Set([a.id]), on: true });
  assert.equal(byTitle(state, 'A').locked, true);
  assert.equal(state.edits, before + 1);
  assert.equal(reducer(state, { type: 'lock', ids: new Set([a.id]), on: true }), state);
  state = reducer(state, { type: 'lock', ids: new Set([a.id]), on: false });
  assert.equal(byTitle(state, 'A').locked, false);
});

test('a story without an ID cannot be locked', () => {
  let state = opened('Epic,Title\r\n,Loose\r\nBilling,A\r\n');
  const loose = byTitle(state, 'Loose');
  const next = reducer(state, { type: 'lock', ids: new Set([loose.id]), on: true });
  assert.equal(next, state);
});

test('locked story: edit cannot change the Epic, other fields still change; delete does nothing', () => {
  let state = opened();
  const a = byTitle(state, 'A');
  state = reducer(state, { type: 'lock', ids: new Set([a.id]), on: true });
  state = edit(state, a.id, (d) => { d.epic = 'Onboarding'; d.title = 'A2'; d.points = '3'; });
  const locked = state.backlog.stories.find((s) => s.id === a.id);
  assert.deepEqual([locked.epic, locked.title, locked.points], ['Billing', 'A2', '3']);
  const after = reducer(state, { type: 'delete', id: a.id });
  assert.equal(after, state);
});

test('locked story: move and commitEpic leave it alone, other stories shift around its fixed ID', () => {
  let state = opened();
  const [a, b] = state.backlog.stories;
  state = reducer(state, { type: 'lock', ids: new Set([b.id]), on: true });
  assert.equal(reducer(state, { type: 'move', id: b.id, epic: 'Onboarding', beforeId: null }), state);
  state = reducer(state, { type: 'delete', id: a.id });
  assert.deepEqual(state.backlog.stories.map((s) => s.code), ['B-0002', 'O-0001']);
});

test('bulk: an Epic change skips locked stories, Priority still applies to them', () => {
  let state = opened();
  const [a, b] = state.backlog.stories;
  state = reducer(state, { type: 'lock', ids: new Set([a.id]), on: true });
  state = reducer(state, { type: 'checkAll', on: true, ids: [a.id, b.id] });
  state = reducer(state, { type: 'bulk', patch: { epic: 'Onboarding', priority: 'High' } });
  const lockedA = state.backlog.stories.find((s) => s.id === a.id);
  assert.deepEqual([lockedA.epic, lockedA.priority, lockedA.code], ['Billing', 'High', 'B-0001']);
  assert.equal(state.backlog.stories.find((s) => s.id === b.id).epic, 'Onboarding');
});

test('applySuggestions on a locked story leaves the state alone', () => {
  let state = opened();
  const a = byTitle(state, 'A');
  state = reducer(state, { type: 'lock', ids: new Set([a.id]), on: true });
  const row = { storyId: a.code, field: 'Title', action: 'replace', current: 'A', suggested: 'New', reason: 'r', area: 'INVEST', confidence: 'ready', group: '', status: 'open' };
  assert.equal(reducer(state, { type: 'applySuggestions', rows: [row] }), state);
});

test('editing clarifications copies them: the previous state keeps its pairs', () => {
  const before = opened();
  const a = byTitle(before, 'A');
  const added = edit(before, a.id, (d) => { d.clarifications.push({ q: 'Which format?', a: '' }); d.rawClarifications = null; });
  assert.deepEqual(byTitle(added, 'A').clarifications, [{ q: 'Which format?', a: '' }]);
  assert.deepEqual(a.clarifications, []);
  const answered = edit(added, a.id, (d) => { d.clarifications[0].a = 'CSV'; });
  assert.equal(byTitle(added, 'A').clarifications[0].a, '');
  assert.equal(byTitle(answered, 'A').clarifications[0].a, 'CSV');
});

test('checkAll ticks or unticks only the given ids, so stories a search hides keep their tick', () => {
  let state = opened();
  const [a, b] = state.backlog.stories;
  state = reducer(state, { type: 'check', ids: [a.id], on: true, anchor: a.id });
  state = reducer(state, { type: 'checkAll', on: true, ids: [b.id] });
  assert.deepEqual([...state.checked].sort(), [a.id, b.id].sort());
  state = reducer(state, { type: 'checkAll', on: false, ids: [b.id] });
  assert.deepEqual([...state.checked], [a.id]);
  state = reducer(state, { type: 'checkAll', on: false, ids: state.backlog.stories.map((s) => s.id) });
  assert.equal(state.checked.size, 0);
});
