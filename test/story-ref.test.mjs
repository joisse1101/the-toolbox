import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveStoryRef, sameTitle } from '../core/story-ref.js';

const stories = [
  { code: 'IAM-0004', title: 'Export audit log', epic: 'Identity', feature: 'Audit' },
  { code: 'IAM-0006', title: 'Reset password by email', epic: 'Identity', feature: 'Credentials' },
  { code: 'DAM-0002', title: 'Reset password by email', epic: 'Data', feature: 'Access', benched: true },
  { code: 'IAM-0001', title: 'Sign in', epic: 'Identity', feature: 'Credentials' },
];

test('sameTitle ignores case and surrounding spaces only', () => {
  assert.ok(sameTitle('  reset PASSWORD by email ', 'Reset password by email'));
  assert.ok(!sameTitle('Reset  password', 'Reset password'));
});

test('a matching pair resolves to the story, ignoring case and spacing', () => {
  const r = resolveStoryRef(stories, { id: 'IAM-0006', title: ' reset password BY email' }, { required: true });
  assert.equal(r.ok, true);
  assert.equal(r.story.code, 'IAM-0006');
});

test('the ID holds another story: says what it holds now and lists the candidates with Epic > Feature', () => {
  const r = resolveStoryRef(stories, { id: 'IAM-0004', title: 'Reset password by email' }, { required: true });
  assert.equal(r.ok, false);
  assert.match(r.message, /IAM-0004 is now "Export audit log" \(Identity > Audit\), not "Reset password by email"/);
  assert.match(r.message, /IAM-0006 \(Identity > Credentials\)/);
});

test('a Title shared by two stories lists both and marks a benched one', () => {
  const r = resolveStoryRef(stories, { id: 'IAM-0004', title: 'Reset password by email' });
  assert.match(r.message, /IAM-0006 \(Identity > Credentials\), DAM-0002 \(Data > Access\) \[benched\]/);
  assert.match(r.message, /ask the user/);
});

test('Title found nowhere: says so and points to the hint', () => {
  const r = resolveStoryRef(stories, { id: 'IAM-0004', title: 'Nothing like it' }, { hint: 'the proposals section' });
  assert.equal(r.ok, false);
  assert.match(r.message, /IAM-0004 is now "Export audit log"/);
  assert.match(r.message, /No story is titled "Nothing like it": look in the proposals section/);
});

test('ID not in the list: says so and still lists the stories with the Title', () => {
  const r = resolveStoryRef(stories, { id: 'IAM-0099', title: 'Sign in' });
  assert.equal(r.ok, false);
  assert.match(r.message, /^IAM-0099 is not in the file\. Stories titled "Sign in": IAM-0001 \(Identity > Credentials\)/);
});

test('required: a missing or blank Title is refused and names the key', () => {
  for (const title of [undefined, '', '   ']) {
    const r = resolveStoryRef(stories, { id: 'IAM-0001', title }, { required: true, key: 'targetTitle' });
    assert.equal(r.ok, false);
    assert.match(r.message, /IAM-0001 needs the story's current Title next to it \(targetTitle\)/);
  }
});

test('not required: no Title means no check, a given Title is still checked', () => {
  const found = resolveStoryRef(stories, { id: 'IAM-0001' });
  assert.deepEqual([found.ok, found.story.code], [true, 'IAM-0001']);
  const unknown = resolveStoryRef(stories, { id: 'IAM-0099' });
  assert.deepEqual([unknown.ok, unknown.story], [true, undefined]);
  assert.equal(resolveStoryRef(stories, { id: 'IAM-0001', title: 'Other' }).ok, false);
});

test('a story with no Epic or Feature is placed as "no Epic"', () => {
  const r = resolveStoryRef([{ code: 'NEW-1', title: 'A', epic: '', feature: '' }], { id: 'NEW-1', title: 'B' });
  assert.match(r.message, /now "A" \(no Epic\)/);
});
