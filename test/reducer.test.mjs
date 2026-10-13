import test from 'node:test';
import assert from 'node:assert/strict';
import { reducer } from '../src/user-story-generator/hooks/useBacklog.js';
import { loadBacklog, applyBulk } from '../src/user-story-generator/model.js';

const FILE = 'Epic,Feature,Depends On\r\nBilling,A,\r\nBilling,B,\r\nOnboarding,C,\r\n';

function opened(text = FILE) {
  const backlog = loadBacklog(text);
  let state = {
    files: [], current: 'x.csv', backlog: null, selectedId: null, view: 'editor', checked: new Set(), lastChecked: null, edits: 0,
  };
  state = reducer(state, { type: 'loaded', name: 'x.csv', backlog });
  return state;
}
const byFeature = (state, f) => state.backlog.stories.find((s) => s.feature === f);
const edit = (state, id, change) => reducer(state, { type: 'edit', id, change });

test('loaded: IDs assigned on load count as an edit so they get saved; an up-to-date file does not', () => {
  const state = opened();
  assert.equal(state.edits, 1);
  assert.deepEqual(state.backlog.stories.map((s) => s.code), ['B-0001', 'B-0002', 'O-0001']);
  const clean = opened('ID,Epic,Feature,Depends On\r\nB-0001,Billing,A,\r\n');
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
  const a = byFeature(state, 'A');
  state = edit(state, a.id, (d) => { d.epic = 'Onboarding'; });
  assert.equal(byFeature(state, 'A').code, 'B-0001');
  state = reducer(state, { type: 'commitEpic', id: a.id });
  assert.equal(byFeature(state, 'A').code, 'O-0002');
  assert.equal(byFeature(state, 'B').code, 'B-0001');
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
  assert.equal(byFeature(moved, 'B').code, 'B-0001');
  assert.equal(byFeature(moved, 'A').code, 'B-0002');
  assert.equal(reducer(state, { type: 'move', id: a.id, epic: 'Billing', beforeId: b.id }), state);
});

test('bulk epic change: moved stories go to the bottom of the new epic and links follow', () => {
  let state = opened();
  const [a, b, c] = state.backlog.stories;
  state = edit(state, c.id, (d) => { d.dependsOn = [a.code]; });
  state = reducer(state, { type: 'check', ids: [a.id, b.id], on: true, anchor: a.id });
  state = reducer(state, { type: 'bulk', patch: { epic: 'Onboarding' } });
  assert.deepEqual(state.backlog.stories.map((s) => s.feature), ['C', 'A', 'B']);
  assert.deepEqual(state.backlog.stories.map((s) => s.code), ['O-0001', 'O-0002', 'O-0003']);
  assert.deepEqual(state.backlog.stories[0].dependsOn, ['O-0002']);
  // priority only: IDs untouched
  const prio = reducer(state, { type: 'bulk', patch: { priority: 'High' } });
  assert.deepEqual(prio.backlog.stories.map((s) => s.code), ['O-0001', 'O-0002', 'O-0003']);
  assert.ok(applyBulk);
});
