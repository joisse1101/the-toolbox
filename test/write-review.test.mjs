import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeReview } from '../.claude/skills/review-backlog/write-review.mjs';
import { parseReview, serializeReview } from '../src/user-story-generator/review.js';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.claude/skills/review-backlog/write-review.mjs');

const CSV =
  'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,Acceptance Criteria,Notes\r\n' +
  'IAM-0001,Identity & Access Management,Auth,Login,"As a user, I want to log in, so that I can access the portal",5,High,,"AC1: Given a, when b, then c",\r\n' +
  'IAM-0002,Identity & Access Management,SSO,SSO Login,"As a user, I want SSO, so that no credentials",55,,,,\r\n';

function temp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'review-test-'));
  fs.mkdirSync(path.join(root, 'user-stories'));
  fs.writeFileSync(path.join(root, 'user-stories', 'data.csv'), CSV);
  return root;
}

const finding = (over = {}) => ({
  storyId: 'IAM-0001', field: 'Title', action: 'replace', suggested: 'Log in with a password', reason: 'Clearer',
  area: 'Hierarchy', confidence: 'ready', group: '', ...over,
});
const run = (root, findings, name = 'data.csv') => writeReview({ root, name, input: JSON.stringify(findings) });
const reviewPath = (root) => path.join(root, 'reviews', 'data.csv');

test('valid input writes reviews/<name> and leaves the backlog untouched', () => {
  const root = temp();
  const before = fs.readFileSync(path.join(root, 'user-stories', 'data.csv'));
  const r = run(root, [finding(), finding({ storyId: 'IAM-0002', field: 'Sprint points', suggested: '8', confidence: 'confirm' })]);
  assert.deepEqual([r.ok, r.count], [true, 2]);
  assert.deepEqual(fs.readFileSync(path.join(root, 'user-stories', 'data.csv')), before);
  const rows = parseReview(fs.readFileSync(reviewPath(root), 'utf8')).rows;
  assert.equal(rows[0].current, 'Login');
  assert.equal(rows[1].current, '55');
  assert.equal(rows[0].status, 'open');
  assert.deepEqual(fs.readdirSync(path.join(root, 'reviews')), ['data.csv'], 'no temp file left behind');
});

test('invalid input reports every problem and writes nothing, keeping an existing review', () => {
  const root = temp();
  run(root, [finding()]);
  const good = fs.readFileSync(reviewPath(root), 'utf8');
  const r = run(root, [finding({ storyId: 'ZZ-0009' }), finding({ suggested: '' })]);
  assert.equal(r.ok, false);
  assert.ok(r.errors.length >= 2);
  assert.equal(fs.readFileSync(reviewPath(root), 'utf8'), good);
});

test('no review file is created when validation fails', () => {
  const root = temp();
  assert.equal(run(root, [finding({ field: 'Nope' })]).ok, false);
  assert.equal(fs.existsSync(path.join(root, 'reviews')), false);
});

test('bad or missing backlog names are rejected', () => {
  const root = temp();
  for (const name of ['..\\x.csv', '../x.csv', 'sub/x.csv', 'missing.csv', '']) {
    const r = run(root, [finding()], name);
    assert.equal(r.ok, false, name);
  }
  assert.equal(fs.existsSync(path.join(root, 'reviews')), false);
});

test('input that is not JSON is rejected', () => {
  const root = temp();
  assert.equal(writeReview({ root, name: 'data.csv', input: 'not json' }).ok, false);
});

test('a split group and multi-line values are written and read back intact', () => {
  const root = temp();
  const multi = 'AC2: Given a "quoted", value, when it has commas, then it survives';
  const reason = 'Line one\nline two, "quoted"';
  const r = run(root, [
    finding({ field: 'Acceptance Criteria', action: 'add', suggested: multi, reason }),
    finding({ storyId: 'IAM-0002', field: 'Title', suggested: 'SSO sign-in', confidence: 'confirm', group: 'split-2' }),
    finding({ storyId: 'NEW-1', field: 'Title', action: 'add-story', suggested: 'SSO sign-out', confidence: 'confirm', group: 'split-2' }),
  ]);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const rows = parseReview(fs.readFileSync(reviewPath(root), 'utf8')).rows;
  assert.equal(rows[0].suggested, multi);
  assert.equal(rows[0].reason, reason);
  assert.equal(rows.filter((x) => x.group === 'split-2').length, 2);
});

test('re-running keeps the status of rows already decided', () => {
  const root = temp();
  run(root, [finding()]);
  const rows = parseReview(fs.readFileSync(reviewPath(root), 'utf8')).rows;
  rows[0].status = 'dismissed';
  fs.writeFileSync(reviewPath(root), serializeReview(rows));
  run(root, [finding(), finding({ suggested: 'Another' })]);
  const after = parseReview(fs.readFileSync(reviewPath(root), 'utf8')).rows;
  assert.deepEqual(after.map((x) => x.status), ['dismissed', 'open']);
});

test('CLI: bad name exits non-zero and writes nothing; extra arguments are refused', () => {
  const bad = spawnSync(process.execPath, [SCRIPT, '..\\x.csv'], { input: '[]', encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Nothing was written/);
  const extra = spawnSync(process.execPath, [SCRIPT, 'data.csv', 'elsewhere.csv'], { input: '[]', encoding: 'utf8' });
  assert.equal(extra.status, 2);
});
