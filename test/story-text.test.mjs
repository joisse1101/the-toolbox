import test from 'node:test';
import assert from 'node:assert/strict';
import { composeStory, parseStory, composeCriteria, parseCriteria } from '../public/shared/story-text.js';

test('story round trip', () => {
  const f = { asA: 'team lead', iWant: 'to export a backlog', soThat: 'I can share it' };
  const text = composeStory(f);
  assert.equal(text, 'As a team lead, I want to export a backlog, so that I can share it');
  assert.deepEqual(parseStory(text), { ok: true, ...f });
});

test('story: missing commas tolerated, case-insensitive', () => {
  assert.deepEqual(parseStory('as A team lead I WANT to export SO THAT I can share'),
    { ok: true, asA: 'team lead', iWant: 'to export', soThat: 'I can share' });
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
