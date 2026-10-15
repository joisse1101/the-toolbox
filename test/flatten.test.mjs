import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenCsv } from '../core/flatten.js';

test('one Header: value line per non-empty cell, one block per row', () => {
  const out = flattenCsv('ID,Epic,Priority\r\nA-1,Alpha,High\r\nA-2,Alpha,\r\n');
  assert.equal(out, '----\nID: A-1\nEpic: Alpha\nPriority: High\n----\nID: A-2\nEpic: Alpha\n');
});

test('a multi-line quoted cell stays together under its label, indented', () => {
  const out = flattenCsv('ID,User Acceptance Criteria\r\nA-1,"Given x\r\nWhen y\r\nThen z"\r\n');
  assert.equal(out, '----\nID: A-1\nUser Acceptance Criteria: Given x\n  When y\n  Then z\n');
});

test('an empty cell is omitted, so adding a value is one added line', () => {
  const before = flattenCsv('ID,Priority\r\nA-1,\r\n').split('\n');
  const after = flattenCsv('ID,Priority\r\nA-1,High\r\n').split('\n');
  assert.deepEqual(after.filter((l) => !before.includes(l)), ['Priority: High']);
});

test('an inserted row does not change the lines of the rows after it', () => {
  const rows = ['A-1,One', 'A-2,Two', 'A-3,Three'];
  const make = (list) => flattenCsv('ID,Title\r\n' + list.map((r) => r + '\r\n').join(''));
  const before = make(rows);
  const after = make([rows[0], 'A-9,New', ...rows.slice(1)]);
  const tail = '----\nID: A-2\nTitle: Two\n----\nID: A-3\nTitle: Three\n';
  assert.ok(before.endsWith(tail));
  assert.ok(after.endsWith(tail));
});

test('a file with only headers, and empty text, give empty output', () => {
  assert.equal(flattenCsv('ID,Epic\r\n'), '');
  assert.equal(flattenCsv(''), '');
});

test('a BOM is ignored and fully empty rows are skipped', () => {
  assert.equal(flattenCsv('﻿ID,Epic\r\nA-1,Alpha\r\n,\r\n'), '----\nID: A-1\nEpic: Alpha\n');
});

test('a cell beyond the header row gets a numbered label', () => {
  assert.equal(flattenCsv('ID\r\nA-1,extra\r\n'), '----\nID: A-1\nColumn 2: extra\n');
});
