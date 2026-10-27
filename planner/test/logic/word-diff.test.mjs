import test from 'node:test';
import assert from 'node:assert/strict';
import { wordDiff } from '../../logic/word-diff.js';

const kinds = (parts) => parts.map((p) => [p.text.trim(), p.kind]);
const rejoin = (parts) => parts.filter((p) => p.kind !== 'removed').map((p) => p.text).join('');

test('an inserted word is the only added part', () => {
  assert.deepEqual(kinds(wordDiff('i see each request', "i won't see each request")), [
    ['i', 'same'], ["won't", 'added'], ['see each request', 'same'],
  ]);
});

test('a deleted word is removed and a changed word is removed plus added', () => {
  assert.deepEqual(kinds(wordDiff('then i see each request', 'then i see requests')), [
    ['then i see', 'same'], ['each request', 'removed'], ['requests', 'added'],
  ]);
});

test('identical text is all same', () => {
  assert.deepEqual(kinds(wordDiff('a b c', 'a b c')), [['a b c', 'same']]);
});

test('whitespace-only differences are not changes', () => {
  assert.deepEqual(kinds(wordDiff('a  b\nc', 'a b c')), [['a b c', 'same']]);
});

test('empty old or new text', () => {
  assert.deepEqual(kinds(wordDiff('', 'a b')), [['a b', 'added']]);
  assert.deepEqual(kinds(wordDiff('a b', '')), [['a b', 'removed']]);
  assert.deepEqual(wordDiff('', ''), []);
});

test('the parts that are not removed join back to the new text', () => {
  const next = 'AC2: Given a list,\nwhen I open it, then i won\'t see each request';
  assert.equal(rejoin(wordDiff('AC2: Given a list, when I open it, then i see each request', next)), next);
});
