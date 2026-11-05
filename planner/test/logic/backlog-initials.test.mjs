import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const bi = require('../../logic/storage/backlog-initials.cjs');

const sib = (name, initials, frozenCodes = []) => ({ name, initials, frozenCodes });

test('validateInitials uppercases and accepts 1 to 6 letters or digits starting with a letter', () => {
  assert.equal(bi.validateInitials('ops'), 'OPS');
  assert.equal(bi.validateInitials('B1'), 'B1');
  assert.equal(bi.validateInitials('A'), 'A');
  assert.equal(bi.validateInitials('ab12cd'), 'AB12CD');
});

test('validateInitials rejects a bad value with a message that says what is valid', () => {
  for (const bad of ['1A', 'A-B', '', '   ', 'ABCDEFG', 'A B', 'é1', undefined, 5]) {
    assert.throws(() => bi.validateInitials(bad), (e) => e.status === 400 && /1 to 6 letters or digits/.test(e.message) && /start with a letter/.test(e.message) && /no hyphen/.test(e.message), String(bad));
  }
});

test('defaultInitials skips a used B1 and takes the lowest unused number', () => {
  assert.equal(bi.defaultInitials([]), 'B1');
  assert.equal(bi.defaultInitials([sib('iam', 'B1')]), 'B2');
  assert.equal(bi.defaultInitials([sib('a', 'B1'), sib('b', 'B3')]), 'B2');
  assert.equal(bi.defaultInitials([sib('a', 'B1'), sib('b', 'b2')]), 'B3');
});

test('defaultInitials skips initials held by a sibling frozen ID', () => {
  assert.equal(bi.defaultInitials([sib('iam', 'OPS', ['B1-IAM-0002'])]), 'B2');
});

test('findConflict finds a sibling with the same initials ignoring case', () => {
  const iam = sib('iam', 'B1');
  assert.equal(bi.findConflict('b1', [iam, sib('x', 'B2')]), iam);
  assert.equal(bi.findConflict('B3', [iam]), undefined);
});

test('findConflict finds a sibling whose frozen ID starts with the initials and a hyphen', () => {
  const iam = sib('iam', 'OPS', ['B1-IAM-0002']);
  assert.equal(bi.findConflict('B1', [iam]), iam);
  assert.equal(bi.findConflict('B', [iam]), undefined);
  assert.equal(bi.findConflict('B1-IAM', [iam]), undefined);
});

test('no conflict with the backlog own frozen IDs when its entry is left out', () => {
  const own = sib('billing', 'B1', ['B1-BIL-0001']);
  const others = [own, sib('iam', 'B2')].filter((s) => s.name !== 'billing');
  assert.equal(bi.findConflict('B1', others), undefined);
});

test('writeInitials and readInitials round-trip backlog.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-initials-'));
  try {
    assert.equal(bi.readInitials(dir, 'iam'), null);
    assert.equal(bi.writeInitials(dir, 'iam', 'ops'), 'OPS');
    assert.equal(fs.readFileSync(path.join(dir, 'iam', 'backlog.json'), 'utf8').trim(), '{"initials":"OPS"}');
    assert.equal(bi.readInitials(dir, 'iam'), 'OPS');
    assert.throws(() => bi.writeInitials(dir, 'iam', '1A'), /letters or digits/);
    assert.equal(bi.readInitials(dir, 'iam'), 'OPS');
    fs.writeFileSync(path.join(dir, 'iam', 'backlog.json'), 'not json');
    assert.equal(bi.readInitials(dir, 'iam'), null);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
