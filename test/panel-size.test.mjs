import test from 'node:test';
import assert from 'node:assert/strict';
import { clampWidth, parseStoredWidth } from '../core/panel-size.js';

const limits = { min: 180, max: 600, fallback: 260 };

test('clampWidth keeps a width in range', () => {
  assert.equal(clampWidth(300, 180, 600), 300);
});

test('clampWidth stops at the minimum and the maximum', () => {
  assert.equal(clampWidth(50, 180, 600), 180);
  assert.equal(clampWidth(9000, 180, 600), 600);
});

test('clampWidth rounds to whole pixels', () => {
  assert.equal(clampWidth(300.6, 180, 600), 301);
});

test('parseStoredWidth reads a stored number', () => {
  assert.equal(parseStoredWidth('320', limits), 320);
  assert.equal(parseStoredWidth('320.4', limits), 320);
});

test('parseStoredWidth moves an out-of-range number to the nearest limit', () => {
  assert.equal(parseStoredWidth('99999', limits), 600);
  assert.equal(parseStoredWidth('-5', limits), 180);
});

test('parseStoredWidth falls back for anything that is not a number', () => {
  for (const raw of ['abc', '', '  ', null, undefined, 'NaN', 'Infinity', 12]) {
    assert.equal(parseStoredWidth(raw, limits), 260, String(raw));
  }
});
