import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBacklog } from '../../logic/backlog/model.js';
import { buildSource, compareSource, scopeStories, storyHash, criteriaOf, storiesBlock, applyStoriesBlock } from '../../logic/diagrams/source.js';

const HEADER = 'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes,Locked,Clarifications';
const row = (epic, feature, title, ac = 'AC1: Given a, when b, then c.', notes = '') =>
  `,${epic},${feature},${title},"As a member, I want ${title}, so that it works.",3,High,,"${ac}",${notes},,`;
const load = (...rows) => loadBacklog([HEADER, ...rows].join('\n')).stories;

const SCOPE = { type: 'feature', epic: 'Identity', feature: 'Sign in' };
const base = () => load(row('Identity', 'Sign in', 'Sign in with email'), row('Identity', 'Sign in', 'Reset a password'), row('Identity', 'Profile', 'Edit profile'));

test('a scope covers its Epic, Feature or story', () => {
  const stories = base();
  assert.equal(scopeStories(stories, { type: 'epic', epic: 'identity' }).length, 3);
  assert.equal(scopeStories(stories, SCOPE).length, 2);
  assert.deepEqual(scopeStories(stories, { type: 'story', epic: 'Identity', feature: 'Profile', title: 'edit PROFILE' }).map((s) => s.title), ['Edit profile']);
});

test('buildSource records id, title, hash, epic and feature, and the hash ignores Notes but not the criteria', () => {
  const source = buildSource(base(), SCOPE, '2026-01-01T00:00:00.000Z');
  assert.deepEqual(source.stories.map((s) => [s.id, s.title, s.feature]), [['I-0001', 'Sign in with email', 'Sign in'], ['I-0002', 'Reset a password', 'Sign in']]);
  const [a] = load(row('Identity', 'Sign in', 'Sign in with email', 'AC1: Given a, when b, then c.', 'a note'));
  const [b] = load(row('Identity', 'Sign in', 'Sign in with email', 'AC1: Given a, when b, then d.'));
  assert.equal(storyHash(a), source.stories[0].hash);
  assert.notEqual(storyHash(b), source.stories[0].hash);
});

test('an unchanged backlog is not stale and heals nothing', () => {
  const source = buildSource(base(), SCOPE);
  const r = compareSource(source, base());
  assert.equal(r.stale, false);
  assert.deepEqual(r.healed, []);
  assert.deepEqual(r.stories.map((s) => s.status), ['ok', 'ok']);
});

test('a renumber shifts the IDs and the next compare heals them by Title', () => {
  const source = buildSource(base(), SCOPE);
  const shifted = load(row('Identity', 'Sign in', 'Verify the email'), row('Identity', 'Sign in', 'Sign in with email'), row('Identity', 'Sign in', 'Reset a password'));
  const r = compareSource(source, shifted);
  assert.deepEqual(r.healed, [{ title: 'Sign in with email', from: 'I-0001', to: 'I-0002' }, { title: 'Reset a password', from: 'I-0002', to: 'I-0003' }]);
  assert.deepEqual(r.source.stories.map((s) => s.id), ['I-0002', 'I-0003']);
  assert.deepEqual(r.added, [{ id: 'I-0001', title: 'Verify the email' }]);
  assert.equal(r.stale, true);
});

test('a reworded story is changed; a story renamed is missing', () => {
  const source = buildSource(base(), SCOPE);
  const reworded = load(row('Identity', 'Sign in', 'Sign in with email', 'AC1: Given a, when b, then something else.'), row('Identity', 'Sign in', 'Reset a password'));
  assert.deepEqual(compareSource(source, reworded).stories.map((s) => s.status), ['changed', 'ok']);
  const renamed = load(row('Identity', 'Sign in', 'Log in with email'), row('Identity', 'Sign in', 'Reset a password'));
  const r = compareSource(source, renamed);
  assert.deepEqual(r.stories.map((s) => s.status), ['missing', 'ok']);
  assert.deepEqual(r.added.map((s) => s.title), ['Log in with email']);
});

test('a story added to the Feature is new', () => {
  const source = buildSource(base(), SCOPE);
  const r = compareSource(source, load(...[row('Identity', 'Sign in', 'Sign in with email'), row('Identity', 'Sign in', 'Reset a password'), row('Identity', 'Sign in', 'Sign out')]));
  assert.deepEqual(r.added, [{ id: 'I-0003', title: 'Sign out' }]);
  assert.equal(r.stale, true);
});

test('two stories with one Title in an Epic slice: the recorded Feature breaks the tie', () => {
  const stories = load(row('Identity', 'Sign in', 'Help'), row('Identity', 'Profile', 'Help'));
  const source = buildSource(stories, { type: 'epic', epic: 'Identity' });
  const r = compareSource(source, stories);
  assert.deepEqual(r.stories.map((s) => [s.status, s.id]), [['ok', 'I-0001'], ['ok', 'I-0002']]);
});

test('an unresolved tie is reported ambiguous and the source is left as it was', () => {
  const stories = load(row('Identity', 'Sign in', 'Help'), row('Identity', 'Sign in', 'Help'));
  const source = { scope: SCOPE, stories: [{ id: 'I-0009', title: 'Help', hash: 'x', epic: 'Identity', feature: 'Sign in' }] };
  const r = compareSource(source, stories);
  assert.equal(r.stories[0].status, 'ambiguous');
  assert.deepEqual(r.source.stories, source.stories);
});

test('criteriaOf gives the criterion text after its label', () => {
  const [story] = load(row('Identity', 'Sign in', 'Sign in', 'AC1: Given a, when b, then c.\nAC2: Given d, when e, then f.'));
  assert.deepEqual(criteriaOf(story), [{ label: 'AC1', text: 'Given a, when b, then c.' }, { label: 'AC2', text: 'Given d, when e, then f.' }]);
  assert.deepEqual(criteriaOf({ rawCriteria: 'free text' }), [{ label: 'AC1', text: 'free text' }]);
});

test('the generated story list is replaced between its markers and nowhere else', () => {
  const source = buildSource(base(), SCOPE);
  const md = `intro\n${storiesBlock({ stories: [] })}\noutro\n`;
  const out = applyStoriesBlock(md, source);
  assert.match(out, /- I-0001 Sign in with email\n- I-0002 Reset a password\n<!-- stories:end -->\noutro/);
  assert.equal(applyStoriesBlock(out, source), out);
  assert.throws(() => applyStoriesBlock('no markers', source), /stories:start/);
});
