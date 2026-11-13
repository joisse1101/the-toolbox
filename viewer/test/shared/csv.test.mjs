import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, toCsv } from '../../logic/backlog/csv.js';

test('round-trips tricky values', () => {
  const rows = [
    ['a', 'b,c', 'say "hi"', 'line1\nline2', 'cr\r\nlf', '', ' spaced '],
    ['', '', '', '', '', '', ''],
    ['x', '"', ',', '\n', '"quoted"', 'é ✓', 'last'],
  ];
  assert.deepEqual(parseCsv(toCsv(rows)), rows);
});

test('handles LF, CRLF, no trailing newline and BOM', () => {
  assert.deepEqual(parseCsv('a,b\nc,d'), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(parseCsv('a,b\r\nc,d\r\n'), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(parseCsv('﻿a,b\n'), [['a', 'b']]);
});

test('empty input and header-only', () => {
  assert.deepEqual(parseCsv(''), []);
  assert.deepEqual(parseCsv('a,b\r\n'), [['a', 'b']]);
});

test('empty last field is kept', () => {
  assert.deepEqual(parseCsv('a,b,\n'), [['a', 'b', '']]);
});

test('toCsv quotes only when needed', () => {
  assert.equal(toCsv([['a', 'b c', 'd,e']]), 'a,b c,"d,e"\r\n');
});
