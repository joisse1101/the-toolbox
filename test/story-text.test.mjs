import test from 'node:test';
import assert from 'node:assert/strict';
import { composeStory, parseStory, roleIsBlank, composeCriteria, parseCriteria } from '../core/story-text.js';

test('story round trip', () => {
  const f = { asA: 'a team lead', iWant: 'to export a backlog', soThat: 'I can share it' };
  const text = composeStory(f);
  assert.equal(text, 'As a team lead, I want to export a backlog, so that I can share it');
  assert.deepEqual(parseStory(text), { ok: true, ...f });
});

test('story: "As an" is read and written as typed', () => {
  const text = 'As an approver, I want to sign off, so that releases are controlled';
  const parsed = parseStory(text);
  assert.deepEqual(parsed, { ok: true, asA: 'an approver', iWant: 'to sign off', soThat: 'releases are controlled' });
  assert.equal(composeStory(parsed), text);
  assert.equal(composeStory({ asA: 'an admin', iWant: 'x', soThat: 'y' }), 'As an admin, I want x, so that y');
});

test('a role that is empty or only an article is blank', () => {
  for (const role of ['', '  ', 'a', 'An', ' an ', undefined]) assert.equal(roleIsBlank(role), true, String(role));
  for (const role of ['a user', 'an approver', 'admin', 'another user']) assert.equal(roleIsBlank(role), false, role);
  assert.equal(roleIsBlank(parseStory('As a , I want x, so that y').asA), true);
});

test('story: missing commas tolerated, case-insensitive', () => {
  assert.deepEqual(parseStory('as A team lead I WANT to export SO THAT I can share'),
    { ok: true, asA: 'A team lead', iWant: 'to export', soThat: 'I can share' });
});

test('story: failures and empties', () => {
  assert.equal(parseStory('Just some free text').ok, false);
  assert.equal(parseStory('As a x, so that z, I want y').ok, false);
  assert.deepEqual(parseStory(''), { ok: true, asA: '', iWant: '', soThat: '' });
  assert.equal(composeStory({}), '');
});

test('criteria round trip with several lines', () => {
  const list = [
    { given: 'a file', when: 'I open it', then: 'I see it' },
    { given: 'x, y', when: 'I "z"', then: 'done' },
  ];
  const text = composeCriteria(list);
  assert.equal(text.split('\n')[1].startsWith('AC2: Given '), true);
  assert.deepEqual(parseCriteria(text), { ok: true, criteria: list });
});

test('criteria: AC label ignored, renumbered, case-insensitive, CRLF', () => {
  const r = parseCriteria('AC7: given a, WHEN b, Then c\r\nGiven d when e then f');
  assert.deepEqual(r.criteria, [
    { given: 'a', when: 'b', then: 'c' },
    { given: 'd', when: 'e', then: 'f' },
  ]);
  assert.equal(composeCriteria(r.criteria).startsWith('AC1: Given a, when b, then c\nAC2:'), true);
});

test('criteria: missing keyword fails, empty ok, blank criteria skipped', () => {
  assert.equal(parseCriteria('AC1: Given a, when b').ok, false);
  assert.deepEqual(parseCriteria(''), { ok: true, criteria: [] });
  assert.equal(composeCriteria([{ given: '', when: '', then: '' }]), '');
});

import { composeClarifications, parseClarifications, openCount } from '../core/story-text.js';

test('clarifications round trip with an open pair', () => {
  const text = 'Q1: Which export format?\nA1: CSV only\nQ2: Who owns the schema?\nA2:';
  const parsed = parseClarifications(text);
  assert.deepEqual(parsed, { ok: true, pairs: [{ q: 'Which export format?', a: 'CSV only' }, { q: 'Who owns the schema?', a: '' }] });
  assert.equal(composeClarifications(parsed.pairs), text);
  assert.equal(openCount(parsed.pairs), 1);
});

test('clarifications: multi-line answers run until the next question', () => {
  const text = 'Q1: Why?\nA1: first line\nsecond line\n\nthird\nQ2: Next?\nA2: yes';
  const { pairs } = parseClarifications(text);
  assert.equal(pairs[0].a, 'first line\nsecond line\n\nthird');
  assert.equal(pairs[1].q, 'Next?');
  assert.equal(composeClarifications(pairs), text);
});

test('clarifications: empty, missing answer line and renumbering', () => {
  assert.deepEqual(parseClarifications(''), { ok: true, pairs: [] });
  assert.equal(composeClarifications([]), '');
  assert.deepEqual(parseClarifications('Q1: Alone?').pairs, [{ q: 'Alone?', a: '' }]);
  const text = composeClarifications([{ q: 'one', a: '' }, { q: '', a: '' }, { q: 'two', a: 'b' }]);
  assert.equal(text, 'Q1: one\nA1:\nQ2: two\nA2: b');
});

test('clarifications: free text is not parsed', () => {
  assert.equal(parseClarifications('Ask Sam about the schema').ok, false);
  assert.equal(parseClarifications('A1: orphan answer').ok, false);
});
