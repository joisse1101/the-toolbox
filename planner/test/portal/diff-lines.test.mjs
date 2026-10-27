import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffLines } from '../../portal/web/user-story-generator/diff-lines.js';

test('plain text becomes uncolored lines', () => {
  assert.deepEqual(diffLines('a\nb\n'), [[{ text: 'a', kind: null }], [{ text: 'b', kind: null }]]);
});

test('added, removed and moved colors map to kinds, and reset ends them', () => {
  const text = '\x1b[31m-old\x1b[m\n\x1b[32m+\x1b[m\x1b[32mnew\x1b[m\n\x1b[36mmoved\x1b[m\n';
  assert.deepEqual(diffLines(text), [
    [{ text: '-old', kind: 'removed' }],
    [{ text: '+', kind: 'added' }, { text: 'new', kind: 'added' }],
    [{ text: 'moved', kind: 'moved-to' }],
  ]);
});

test('bold is meta, magenta is a hunk header, and text after a reset is uncolored', () => {
  const [meta, hunk] = diffLines('\x1b[1mdiff --git\x1b[m\n\x1b[35m@@ -1 +1 @@\x1b[m rest\n');
  assert.equal(meta[0].kind, 'meta');
  assert.deepEqual(hunk, [{ text: '@@ -1 +1 @@', kind: 'hunk' }, { text: ' rest', kind: null }]);
});

test('markup in the text is kept as plain text for the renderer to escape', () => {
  assert.deepEqual(diffLines('\x1b[32m+<img onerror=x>\x1b[m\n'), [[{ text: '+<img onerror=x>', kind: 'added' }]]);
});

test('an unknown color code is shown uncolored, and empty input gives no lines', () => {
  assert.deepEqual(diffLines('\x1b[33mhi\x1b[m'), [[{ text: 'hi', kind: null }]]);
  assert.deepEqual(diffLines(''), []);
});
