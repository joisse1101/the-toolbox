import test from 'node:test';
import assert from 'node:assert/strict';
import { clampWidth, fitWidths, makeRoom, parseStoredWidth } from '../../portal/web/lib/panel-size.js';

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

test('fitWidths leaves widths that fit alone', () => {
  assert.deepEqual(fitWidths([100, 200], 300, 48), [100, 200]);
  assert.deepEqual(fitWidths([100, 200], Infinity, 48), [100, 200]);
});

test('fitWidths takes a share of each width above the minimum, so the sum fits', () => {
  const fitted = fitWidths([100, 200, 400], 500, 50);
  assert.ok(fitted.reduce((a, b) => a + b, 0) <= 500);
  assert.ok(fitted.every((w) => w >= 50));
  assert.ok(400 - fitted[2] > 100 - fitted[0], 'the wider column gives up more');
});

test('fitWidths goes to the minimum when even that does not fit', () => {
  assert.deepEqual(fitWidths([100, 200], 50, 48), [48, 48]);
});

const order = ['d', 'c', 'b'];

test('makeRoom keeps the others when the wanted width fits', () => {
  assert.deepEqual(makeRoom({ a: 100, b: 100, c: 100, d: 100 }, 'a', 150, 600, 50, order), { a: 150, b: 100, c: 100, d: 100 });
});

test('makeRoom shrinks the others to the minimum one by one, in order', () => {
  assert.deepEqual(makeRoom({ a: 100, b: 100, c: 100, d: 100 }, 'a', 200, 400, 50, order), { a: 200, b: 100, c: 50, d: 50 });
});

test('makeRoom stops the column at what the others can free', () => {
  assert.deepEqual(makeRoom({ a: 100, b: 100, c: 100, d: 100 }, 'a', 500, 400, 50, order), { a: 250, b: 50, c: 50, d: 50 });
});

test('makeRoom ignores the column itself in the order and keys it does not know', () => {
  assert.deepEqual(makeRoom({ a: 100, b: 100 }, 'a', 150, 200, 50, ['a', 'zzz', 'b']), { a: 150, b: 50 });
});
