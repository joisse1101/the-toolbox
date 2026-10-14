import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProposals } from '../core/proposal-input.js';
import { loadBacklog, serializeBacklog, criteriaCellText, storyCellText, proposalHeaders } from '../core/model.js';

const HEAD = 'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,Acceptance Criteria,Notes,Team\r\n';
const BACKLOG =
  HEAD +
  'IAM-0001,Identity & Access Management,Auth,Login,"As a user, I want to log in, so that I can access the portal",5,High,,"AC1: Given a, when b, then c",,Blue\r\n' +
  'IAM-0002,Identity & Access Management,SSO,SSO Login,"As a user, I want SSO, so that no credentials",3,,IAM-0001;NEW-9,,,\r\n';

const backlog = () => loadBacklog(BACKLOG);
const proposals = (rows = '') => loadBacklog(HEAD + rows, { placeholderIds: true });

const story = (over = {}) => ({
  epic: 'Identity & Access Management',
  feature: 'Auth',
  title: 'Reset password',
  userStory: 'As a user, I want to reset my password, so that I can regain access',
  points: 3,
  dependsOn: [],
  criteria: ['AC1: Given a registered email, when I ask for a reset, then a link is sent', 'AC2: Given an unknown email, when I ask for a reset, then no link is sent'],
  ...over,
});
const build = (input, over = {}) => buildProposals({ input, backlog: backlog(), proposals: null, ...over });
const errorsOf = (input, over) => {
  const r = build(input, over);
  assert.equal(r.ok, false, JSON.stringify(input));
  return r.errors;
};

test('a valid story is built with a placeholder ID and the fields set', () => {
  const r = build([story({ notes: 'From the audit' })]);
  assert.equal(r.ok, true);
  const [s] = r.stories;
  assert.deepEqual(r.ids, ['NEW-10']); // the backlog's Depends On names NEW-9
  assert.equal(s.code, 'NEW-10');
  assert.equal(s.epic, 'Identity & Access Management');
  assert.equal(s.codedEpic, s.epic);
  assert.equal(s.points, '3');
  assert.equal(s.priority, '');
  assert.equal(s.notes, 'From the audit');
  assert.equal(s.criteria.length, 2);
  assert.equal(s.cells.length, 12);
});

test('points may be a numeral string; each allowed value is accepted', () => {
  for (const p of [1, 2, 3, 5, 8, 13, '8']) assert.equal(build([story({ points: p })]).ok, true, String(p));
});

test('points above 13 give the split message; other values are refused', () => {
  assert.match(errorsOf([story({ points: 21 })])[0], /Story 1 .*21.* split/);
  for (const p of [4, 0, -1, 1.5, 'big', '', null]) assert.equal(build([story({ points: p })]).ok, false, String(p));
});

test('Epic, Feature and Title are required', () => {
  for (const key of ['epic', 'feature', 'title']) {
    assert.match(errorsOf([story({ [key]: '  ' })]).join(), /has no /);
    const s = story();
    delete s[key];
    assert.match(errorsOf([s]).join(), new RegExp(`missing the key "${key}"`));
  }
});

test('the User Story must follow As a / I want / so that', () => {
  for (const text of ['Reset passwords', 'As a user, I want a reset', 'As a , I want x, so that y', 5]) {
    assert.match(errorsOf([story({ userStory: text })]).join(), /User Story/, String(text));
  }
});

test('criteria need at least one Given-When-Then line', () => {
  for (const c of [[], 'AC1: Given a, when b, then c', ['Given only a'], ['AC1: Given a, when b, then '], [5]]) {
    assert.match(errorsOf([story({ criteria: c })]).join(), /criteri/, JSON.stringify(c));
  }
});

test('line breaks in single-line fields are refused', () => {
  for (const key of ['epic', 'feature', 'title', 'notes', 'userStory']) {
    assert.match(errorsOf([story({ [key]: 'a\nb' })]).join(), /one line|must be/, key);
  }
  assert.match(errorsOf([story({ criteria: ['AC1: Given a,\nwhen b, then c'] })]).join(), /one line/);
});

test('unknown keys are refused, and Priority says why', () => {
  assert.match(errorsOf([story({ priority: 'High' })]).join(), /unknown key "priority".*Priority is not set/);
  assert.match(errorsOf([story({ id: 'IAM-0009' })]).join(), /unknown key "id"/);
  assert.match(errorsOf([story({ code: 'x' })]).join(), /unknown key "code"/);
});

test('the input must be a non-empty list of objects', () => {
  for (const input of [{}, [], 'x', [null], [[]]]) assert.equal(build(input).ok, false);
});

test('several problems are reported together, each naming its story', () => {
  const errors = errorsOf([story(), story({ epic: '' }), story({ points: 21 })]);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /^Story 2 /);
  assert.match(errors[1], /^Story 3 /);
});

test('numbers continue after the proposals file and rise per story in input order', () => {
  const p = proposals(
    'NEW-1,Identity & Access Management,Auth,A,,,,,,,\r\nNEW-4,Identity & Access Management,Auth,B,,,,,,,\r\n',
  );
  const r = buildProposals({ input: [story(), story({ title: 'Two' })], backlog: loadBacklog(HEAD), proposals: p });
  assert.deepEqual(r.ids, ['NEW-5', 'NEW-6']);
});

test('a number named only by the backlog is not reused', () => {
  assert.deepEqual(build([story()]).ids, ['NEW-10']);
});

test('Depends On: a backlog ID is kept, an unknown one is refused', () => {
  assert.deepEqual(build([story({ dependsOn: ['IAM-0001'] })]).stories[0].dependsOn, ['IAM-0001']);
  assert.match(errorsOf([story({ dependsOn: ['IAM-0099'] })]).join(), /IAM-0099/);
});

test('Depends On: NEW-<k> names the k-th story of the input and is stored as its allocated ID', () => {
  const r = build([story(), story({ title: 'Two', dependsOn: ['NEW-1'] })]);
  assert.deepEqual(r.stories[1].dependsOn, [r.ids[0]]);
  assert.match(errorsOf([story({ dependsOn: ['NEW-3'] })]).join(), /NEW-3.*only 1 story/);
  assert.match(errorsOf([story({ dependsOn: ['NEW-1'] })]).join(), /the story itself/);
});

test('Depends On: proposed:NEW-<n> must exist in the proposals file', () => {
  const p = proposals('NEW-7,Identity & Access Management,Auth,A,,,,,,,\r\n');
  const ok = buildProposals({ input: [story({ dependsOn: ['proposed:NEW-7'] })], backlog: backlog(), proposals: p });
  assert.deepEqual(ok.stories[0].dependsOn, ['NEW-7']);
  assert.match(errorsOf([story({ dependsOn: ['proposed:NEW-2'] })], { proposals: p }).join(), /no NEW-2/);
  assert.match(errorsOf([story({ dependsOn: ['proposed:NEW-7'] })]).join(), /no NEW-7/);
});

test('Depends On: repeats and a cycle inside the input are refused', () => {
  assert.match(errorsOf([story({ dependsOn: ['IAM-0001', 'IAM-0001'] })]).join(), /more than once/);
  const errors = errorsOf([story({ dependsOn: ['NEW-2'] }), story({ title: 'Two', dependsOn: ['NEW-1'] })]);
  assert.match(errors.join(), /Story 1 .*cycle/);
  assert.match(errors.join(), /Story 2 .*cycle/);
});

test('built stories round-trip through the file with no raw-text fallback', () => {
  const r = build([story({ notes: 'n' }), story({ title: 'Two', points: '5', dependsOn: ['IAM-0001', 'NEW-1'] })]);
  const file = { headers: proposalHeaders(backlog().headers), stories: r.stories, hasBom: true };
  const back = loadBacklog(serializeBacklog(file), { placeholderIds: true });
  assert.equal(back.stories.length, 2);
  back.stories.forEach((s, i) => {
    const want = r.stories[i];
    assert.equal(s.rawUserStory, null);
    assert.equal(s.rawCriteria, null);
    for (const k of ['code', 'epic', 'feature', 'title', 'asA', 'iWant', 'soThat', 'points', 'notes', 'priority']) assert.equal(s[k], want[k], k);
    assert.deepEqual(s.dependsOn, want.dependsOn);
    assert.deepEqual(s.criteria, want.criteria);
    assert.equal(storyCellText(s), storyCellText(want));
    assert.equal(criteriaCellText(s), criteriaCellText(want));
    assert.equal(s.cells.length, 13); // the Team and Benched columns are padded
    assert.equal(s.cells[11], '');
  });
  assert.deepEqual(back.stories[1].dependsOn, ['IAM-0001', 'NEW-10']);
});
