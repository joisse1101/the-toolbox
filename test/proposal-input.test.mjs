import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProposals } from '../core/proposal-input.js';
import { loadBacklog, serializeBacklog, criteriaCellText, storyCellText, proposalHeaders } from '../core/model.js';

const HEAD = 'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes,Team\r\n';
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
  assert.equal(s.cells.length, 13);
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
  assert.match(errorsOf([story({ id: 'IAM-0009' })]).join(), /id must be a proposed story ID/);
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
    assert.equal(s.cells.length, 14); // the Team and Benched columns are padded
    assert.equal(s.cells[11], '');
  });
  assert.deepEqual(back.stories[1].dependsOn, ['IAM-0001', 'NEW-10']);
});

// --- patches: an item with an "id" changes the named fields of a proposed story in place ---

const ROW = (code, over = {}) =>
  [
    code,
    over.epic ?? 'Identity & Access Management',
    over.feature ?? 'Auth',
    over.title ?? 'Reset password',
    over.userStory ?? '"As a user, I want to reset my password, so that I can regain access"',
    over.points ?? '3',
    '',
    over.dependsOn ?? '',
    over.criteria ?? '"AC1: Given a registered email, when I ask for a reset, then a link is sent"',
    over.notes ?? 'old note',
    'Blue',
    over.benched ?? '',
  ].join(',') + '\r\n';
const PHEAD = HEAD.replace(/\r\n$/, ',Benched\r\n');
const withRows = (...rows) => loadBacklog(PHEAD + rows.join(''), { placeholderIds: true });
const patch = (over = {}) => ({ id: 'NEW-10', ...over });
const patchOf = (input, rows = [ROW('NEW-10')]) => {
  const r = buildProposals({ input, backlog: backlog(), proposals: withRows(...rows) });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  return r;
};
const patchErrors = (input, rows = [ROW('NEW-10')]) => {
  const r = buildProposals({ input, backlog: backlog(), proposals: withRows(...rows) });
  assert.equal(r.ok, false, JSON.stringify(input));
  return r.errors;
};

test('a patch changes only the fields it names, in place', () => {
  const r = patchOf([patch({ points: 5 })], [ROW('NEW-9'), ROW('NEW-10'), ROW('NEW-11')]);
  assert.deepEqual(r.patchedIds, ['NEW-10']);
  assert.deepEqual(r.stories, []);
  assert.deepEqual(r.proposed.map((s) => s.code), ['NEW-9', 'NEW-10', 'NEW-11']);
  const before = withRows(ROW('NEW-10')).stories[0];
  const after = r.proposed[1];
  assert.equal(after.points, '5');
  assert.deepEqual({ ...after, points: '3', id: before.id }, before);
});

test('a patch replaces a list as a whole and can clear Notes', () => {
  const s = patchOf([patch({ criteria: ['AC1: Given x, when y, then z'], notes: '' })]).proposed[0];
  assert.deepEqual(s.criteria, [{ given: 'x', when: 'y', then: 'z' }]);
  assert.equal(s.notes, '');
  assert.equal(s.title, 'Reset password');
});

test('repeating the stored values changes nothing (the rebuild round-trips)', () => {
  const r = patchOf([
    patch({
      epic: 'Identity & Access Management',
      title: 'Reset password',
      userStory: 'As a user, I want to reset my password, so that I can regain access',
      criteria: ['AC1: Given a registered email, when I ask for a reset, then a link is sent'],
      notes: 'old note',
    }),
  ]);
  const stored = withRows(ROW('NEW-10'));
  assert.equal(serializeBacklog({ ...stored, stories: r.proposed }), serializeBacklog(stored));
});

test('patch rejections', () => {
  const rows = [ROW('NEW-10'), ROW('NEW-11', { benched: 'Yes' })];
  const cases = [
    [patch({ priority: 'High' }), /Patch 1 \(NEW-10\) .*unknown key "priority".*Priority is not set/],
    [patch({ code: 'x' }), /unknown key "code"/],
    [patch({ benched: 'Yes' }), /unknown key "benched"/],
    [patch({ nope: 1 }), /unknown key "nope"/],
    [{ id: 'NEW-10' }, /changes no field/],
    [patch({ id: 'IAM-0001', title: 'x' }), /id must be a proposed story ID/],
    [patch({ id: 12, title: 'x' }), /id must be a proposed story ID/],
    [patch({ id: 'NEW-99', title: 'x' }), /proposals file has no NEW-99/],
    [patch({ id: 'NEW-11', title: 'x' }), /NEW-11, which is benched/],
    [patch({ points: 21 }), /21.* split/],
    [patch({ title: '' }), /has no Title/],
    [patch({ userStory: 'nonsense' }), /User Story does not follow/],
  ];
  for (const [item, pattern] of cases) assert.match(patchErrors([item], rows).join('\n'), pattern, JSON.stringify(item));
});

test('one patch per proposed story', () => {
  assert.match(patchErrors([patch({ title: 'a' }), patch({ title: 'b' })]).join(), /Patch 2 \(NEW-10\) patches NEW-10 again/);
});

test('a patch against a missing proposals file is rejected', () => {
  const r = buildProposals({ input: [patch({ title: 'x' })], backlog: backlog(), proposals: null });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /proposals file has no NEW-10/);
});

test('a stored cell that cannot be rebuilt must be replaced by the patch, and the error names it', () => {
  const rows = [ROW('NEW-10', { userStory: 'free text', criteria: 'free text too' })];
  const errors = patchErrors([patch({ title: 'x' })], rows).join('\n');
  assert.match(errors, /User Story cell is free text/);
  assert.match(errors, /User Acceptance Criteria cell is free text/);
  const fixed = patchOf([patch({ userStory: 'As a user, I want a, so that b', criteria: ['AC1: Given a, when b, then c'] })], rows);
  assert.equal(fixed.proposed[0].rawUserStory, null);
  assert.equal(fixed.proposed[0].rawCriteria, null);
});

test('a patch is validated as the merged story', () => {
  const rows = [ROW('NEW-10', { points: '' })];
  assert.match(patchErrors([patch({ title: 'x' })], rows).join(), /Sprint points/);
  assert.equal(patchOf([patch({ points: 2 })], rows).proposed[0].points, '2');
});

test('a patch can set Depends On with the three forms, and omitting it keeps the stored list', () => {
  const rows = [ROW('NEW-9'), ROW('NEW-10', { dependsOn: 'NEW-9' })];
  assert.deepEqual(patchOf([patch({ title: 'x' })], rows).proposed[1].dependsOn, ['NEW-9']);
  assert.deepEqual(patchOf([patch({ dependsOn: ['IAM-0001', 'proposed:NEW-9'] })], rows).proposed[1].dependsOn, ['IAM-0001', 'NEW-9']);
  assert.deepEqual(patchOf([patch({ dependsOn: [] })], rows).proposed[1].dependsOn, []);
});

test('a patch and a new story can depend on each other, but not in a cycle', () => {
  const ok = patchOf([patch({ dependsOn: ['NEW-1'] }), story({ title: 'Fresh' })]);
  assert.equal(ok.stories[0].code, 'NEW-11');
  assert.deepEqual(ok.proposed[0].dependsOn, ['NEW-11']);
  const cycle = patchErrors([patch({ dependsOn: ['NEW-1'] }), story({ title: 'Fresh', dependsOn: ['proposed:NEW-10'] })]).join('\n');
  assert.match(cycle, /Patch 1 \(NEW-10\) .*cycle/);
  assert.match(cycle, /Story 2 .*cycle/);
});

test('NEW-<k> counts new stories only, and a patch cannot depend on itself', () => {
  assert.match(patchErrors([patch({ dependsOn: ['NEW-1'] })]).join(), /Patch 1 .*NEW-1.*only 0 stories/);
  assert.match(patchErrors([patch({ dependsOn: ['proposed:NEW-10'] })]).join(), /Patch 1 .*the story itself/);
  const r = patchOf([story({ title: 'First' }), patch({ title: 'x' }), story({ title: 'Second', dependsOn: ['NEW-1'] })]);
  assert.deepEqual(r.ids, ['NEW-11', 'NEW-12']);
  assert.deepEqual(r.stories[1].dependsOn, ['NEW-11']);
  assert.match(patchErrors([story({ title: 'First', dependsOn: ['NEW-1'] }), patch({ title: 'x' })]).join(), /Story 1 .*the story itself/);
});

test('a cycle through a patch is refused', () => {
  const rows = [ROW('NEW-10'), ROW('NEW-11', { dependsOn: 'NEW-10' })];
  assert.match(patchErrors([patch({ dependsOn: ['proposed:NEW-11'] })], rows).join('\n'), /Patch 1 \(NEW-10\) .*cycle/);
});

test('"As an" is accepted as written and the rejection message shows the form', () => {
  const text = 'As an approver, I want to sign off, so that releases are controlled';
  const r = build([story({ userStory: text })]);
  assert.equal(r.ok, true);
  assert.equal(r.stories[0].asA, 'an approver');
  assert.equal(storyCellText(r.stories[0]), text);
  assert.match(errorsOf([story({ userStory: 'Approvers sign off' })]).join(), /"As a …, I want …, so that …" .{1}"As an …" is accepted/);
});

test('a patch can set "As an", and the stored sentence survives a patch of another field', () => {
  const text = 'As an approver, I want to sign off, so that releases are controlled';
  const patched = patchOf([patch({ userStory: text })]).proposed[0];
  assert.equal(patched.asA, 'an approver');
  const rows = [ROW('NEW-10', { userStory: `"${text}"` })];
  assert.equal(storyCellText(patchOf([patch({ points: 5 })], rows).proposed[0]), text);
});

test('a role that is only an article is rejected', () => {
  assert.match(errorsOf([story({ userStory: 'As a , I want x, so that y' })]).join(), /User Story/);
});
