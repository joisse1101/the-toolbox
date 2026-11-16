import test from 'node:test';
import assert from 'node:assert/strict';
import { ignoresKey, isTextEntry } from '#frontend/src/tools/backlog/shell/shortcuts.ts';

// A partial keyboard event: the code under test reads only these fields.
const key = (target: unknown, mods: Partial<KeyboardEvent> = {}) => ({ target, ctrlKey: false, altKey: false, metaKey: false, ...mods }) as unknown as KeyboardEvent;

test('a plain key typed in an input, textarea or select is ignored', () => {
  for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) assert.equal(ignoresKey(key({ tagName })), true, tagName);
});

test('a plain key typed in a contenteditable element is ignored', () => {
  assert.equal(ignoresKey(key({ tagName: 'DIV', isContentEditable: true })), true);
});

test('Ctrl+Down and Alt+N in an input are not ignored', () => {
  const input = { tagName: 'INPUT' };
  assert.equal(ignoresKey(key(input, { ctrlKey: true })), false);
  assert.equal(ignoresKey(key(input, { altKey: true })), false);
});

test('a plain key outside a field is not ignored', () => {
  assert.equal(ignoresKey(key({ tagName: 'DIV', isContentEditable: false })), false);
  assert.equal(ignoresKey(key({ tagName: 'BUTTON' })), false);
});

test('a missing target is not a text field', () => {
  assert.equal(isTextEntry(null), false);
  assert.equal(isTextEntry(undefined as unknown as null), false);
});
