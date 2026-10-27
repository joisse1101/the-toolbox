import test from 'node:test';
import assert from 'node:assert/strict';
import { reducer } from '../../portal/web/user-story-generator/hooks/useLexicon.js';
import { parseLexicon } from '../../logic/lexicon/lexicon.js';

const FILE = ['Term,Part of,Definition', 'Dataset,,A table.', 'Dataset attribute,Dataset,A column.', 'User,,A person.', ''].join('\r\n');

const opened = (text = FILE) => reducer(
  { current: null, backlog: null, selected: null, error: null, edits: 0 },
  { type: 'loaded', name: 'IAM.csv', lexicon: parseLexicon(text) },
);
const names = (state) => state.backlog.terms.map((t) => t.name);

test('loaded selects the first term and is not an edit', () => {
  const state = opened();
  assert.equal(state.selected, 'Dataset');
  assert.equal(state.edits, 0);
  assert.equal(opened('').selected, null);
});

test('reload keeps the selection when the term is still there', () => {
  const state = reducer(opened(), { type: 'select', name: 'User' });
  assert.equal(reducer(state, { type: 'loaded', name: 'IAM.csv', lexicon: parseLexicon(FILE), keepSelection: true }).selected, 'User');
  assert.equal(reducer(state, { type: 'loaded', name: 'IAM.csv', lexicon: parseLexicon('Term,Definition\r\nA,a\r\n'), keepSelection: true }).selected, 'A');
});

test('save adds a term, selects it and counts as an edit', () => {
  const state = reducer(opened(), { type: 'save', term: { name: ' Role ', definition: 'A set of permissions.' } });
  assert.deepEqual(names(state), ['Dataset', 'Dataset attribute', 'User', 'Role']);
  assert.equal(state.selected, 'Role');
  assert.equal(state.edits, 1);
});

test('a refused save keeps the lexicon, reports why and is not an edit', () => {
  const state = opened();
  const next = reducer(state, { type: 'save', term: { name: 'user', definition: 'x' } });
  assert.equal(next.backlog, state.backlog);
  assert.equal(next.edits, 0);
  assert.match(next.error[0], /already exists/);
  assert.equal(reducer(next, { type: 'select', name: 'User' }).error, null);
});

test('rename updates the children and keeps the order', () => {
  const state = opened();
  const dataset = state.backlog.terms[0];
  const next = reducer(state, { type: 'save', term: { ...dataset, name: 'Data set' }, replaces: 'Dataset' });
  assert.equal(next.selected, 'Data set');
  assert.equal(next.backlog.terms[1].partOf, 'Data set');
  assert.deepEqual(names(next), ['Data set', 'Dataset attribute', 'User']);
});

test('delete is refused while a term is part of it; deleting a leaf selects its neighbour', () => {
  const state = opened();
  const refused = reducer(state, { type: 'delete', name: 'Dataset' });
  assert.match(refused.error[0], /"Dataset attribute" is part of it/);
  assert.equal(refused.edits, 0);
  const removed = reducer(state, { type: 'delete', name: 'Dataset attribute' });
  assert.deepEqual(names(removed), ['Dataset', 'User']);
  assert.equal(removed.selected, 'User');
  assert.equal(removed.edits, 1);
  const last = reducer(reducer(removed, { type: 'delete', name: 'User' }), { type: 'delete', name: 'Dataset' });
  assert.equal(last.selected, null);
  assert.deepEqual(last.backlog.terms, []);
});

test('cleared forgets the lexicon', () => {
  const state = reducer(opened(), { type: 'cleared' });
  assert.equal(state.backlog, null);
  assert.equal(state.current, null);
});
