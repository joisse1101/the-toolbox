import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeReview, checkReview } from '../../../.claude/skills/review-backlog/write-review.mjs';
import { parseReview, serializeReview } from '../../logic/review/review.js';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.claude/skills/review-backlog/write-review.mjs');

const CSV =
  'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes\r\n' +
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
const run = (root, findings, name = 'data.csv') => writeReview({ dataDir: root, name, input: JSON.stringify(findings) });
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
  assert.equal(writeReview({ dataDir: root, name: 'data.csv', input: 'not json' }).ok, false);
});

test('a split group and multi-line values are written and read back intact', () => {
  const root = temp();
  const multi = 'AC2: Given a "quoted", value, when it has commas, then it survives';
  const reason = 'Line one\nline two, "quoted"';
  const r = run(root, [
    finding({ field: 'User Acceptance Criteria', action: 'add', suggested: multi, reason }),
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

// ---------- harden-review-scripts: parse errors, batches, decided statuses ----------

import { parseArgs } from '../../../.claude/skills/review-backlog/write-review.mjs';

const appendRun = (root, findings) => writeReview({ dataDir: root, name: 'data.csv', input: JSON.stringify(findings), append: true });
const readRows = (root) => parseReview(fs.readFileSync(reviewPath(root), 'utf8')).rows;
const setStatus = (root, index, status) => {
  const rows = readRows(root);
  rows[index].status = status;
  fs.writeFileSync(reviewPath(root), serializeReview(rows));
};

test('malformed JSON reports the parser message with line, column and an excerpt', () => {
  const root = temp();
  const text = '[\n  {"storyId": "IAM-0001"}\n  {"storyId": "IAM-0002"}\n]';
  const r = writeReview({ dataDir: root, name: 'data.csv', input: text });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /not valid JSON/);
  assert.match(r.errors[0], /line 3, column 3/);
  assert.match(r.errors[0], /near ".*IAM-0002/);
  assert.equal(fs.existsSync(path.join(root, 'reviews')), false);
});

test('validation errors say they refer to this batch and keep the finding number', () => {
  const root = temp();
  const r = run(root, [finding(), finding({ storyId: 'ZZ-0009' })]);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.startsWith('Finding 2 in this batch (ZZ-0009 Title)')), r.errors.join('\n'));
});

test('three batches give all rows; an invalid middle batch keeps the first and the third still appends', () => {
  const root = temp();
  assert.equal(run(root, [finding({ suggested: 'One' })]).ok, true);
  const bad = appendRun(root, [finding({ storyId: 'ZZ-0009' })]);
  assert.equal(bad.ok, false);
  assert.equal(readRows(root).length, 1);
  const third = appendRun(root, [finding({ suggested: 'Three' }), finding({ suggested: 'Four' })]);
  assert.deepEqual([third.ok, third.added, third.count], [true, 2, 3]);
  assert.deepEqual(readRows(root).map((x) => x.suggested), ['One', 'Three', 'Four']);
});

test('append creates the review when there is none and leaves the backlog alone', () => {
  const root = temp();
  const before = fs.readFileSync(path.join(root, 'user-stories', 'data.csv'));
  const r = appendRun(root, [finding()]);
  assert.deepEqual([r.ok, r.added, r.count], [true, 1, 1]);
  assert.deepEqual(fs.readFileSync(path.join(root, 'user-stories', 'data.csv')), before);
});

test('a Group already in the review is rejected on append and nothing changes', () => {
  const root = temp();
  const grouped = (suggested) => [
    finding({ storyId: 'IAM-0002', suggested, confidence: 'confirm', group: 'split-1' }),
    finding({ storyId: 'NEW-1', action: 'add-story', suggested: 'Other', confidence: 'confirm', group: 'split-1' }),
  ];
  assert.equal(run(root, grouped('SSO sign-in')).ok, true);
  const text = fs.readFileSync(reviewPath(root), 'utf8');
  const r = appendRun(root, grouped('SSO sign-on'));
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /Group "split-1" is already in reviews\/data.csv/);
  assert.equal(fs.readFileSync(reviewPath(root), 'utf8'), text);
});

test('a decided row repeated in a later batch keeps its status', () => {
  const root = temp();
  run(root, [finding({ suggested: 'Keep' })]);
  setStatus(root, 0, 'dismissed');
  // New run: batch 1 replaces the review without that row, batch 2 repeats it.
  assert.equal(run(root, [finding({ suggested: 'Other' })]).ok, true);
  assert.equal(appendRun(root, [finding({ suggested: 'Keep' })]).ok, true);
  assert.deepEqual(readRows(root).map((x) => [x.suggested, x.status]), [['Other', 'open'], ['Keep', 'dismissed']]);
});

test('decisions accumulate in .decided and are never listed as a review file', () => {
  const root = temp();
  run(root, [finding({ suggested: 'A' }), finding({ suggested: 'B' })]);
  setStatus(root, 0, 'applied');
  run(root, [finding({ suggested: 'B' })]);
  setStatus(root, 0, 'dismissed');
  run(root, [finding({ suggested: 'C' })]);
  const decided = parseReview(fs.readFileSync(path.join(root, 'reviews', 'data.csv.decided'), 'utf8')).rows;
  assert.deepEqual(decided.map((x) => [x.suggested, x.status]).sort(), [['A', 'applied'], ['B', 'dismissed']]);
  assert.deepEqual(fs.readdirSync(path.join(root, 'reviews')).filter((f) => f.endsWith('.csv')), ['data.csv']);
});

test('only the review is a .csv file, so the file API (which lists *.csv) never shows .decided or .tmp', () => {
  const root = temp();
  run(root, [finding()]);
  setStatus(root, 0, 'applied');
  run(root, [finding({ suggested: 'New' })]);
  fs.writeFileSync(path.join(root, 'reviews', 'data.csv.123.tmp'), '');
  const files = fs.readdirSync(path.join(root, 'reviews'));
  assert.ok(files.includes('data.csv.decided'));
  assert.deepEqual(files.filter((f) => /.csv$/i.test(f)), ['data.csv']);
});

test('arguments: a name, or a name with --append; nothing else', () => {
  assert.deepEqual(parseArgs(['data.csv']), { name: 'data.csv', append: false });
  assert.deepEqual(parseArgs(['data.csv', '--append']), { name: 'data.csv', append: true });
  for (const bad of [[], ['--append'], ['--append', 'data.csv'], ['data.csv', 'out.csv'], ['data.csv', '--append', 'x'], ['data.csv', '--appendx']]) {
    assert.equal(parseArgs(bad), null, JSON.stringify(bad));
  }
});

test('CLI: --append prints the batch size and the total; unknown arguments exit 2', () => {
  const bad = spawnSync(process.execPath, [SCRIPT, 'data.csv', '--other'], { input: '[]', encoding: 'utf8' });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /\[--append\]/);
});

// IAM-0002 locked: a Locked column on the backlog.
function tempLocked() {
  const root = temp();
  const csv = CSV.replace(/\r\n/, ',Locked\r\n').replace(/,,,\r\n$/, ',,,,Yes\r\n');
  fs.writeFileSync(path.join(root, 'user-stories', 'data.csv'), csv);
  return root;
}
const unlock = (over = {}) => ({ storyId: 'IAM-0002', field: '', action: 'unlock', suggested: '', reason: 'Too big', area: 'INVEST', confidence: 'ready', group: '', ...over });
const lockedEdit = (over = {}) => finding({ storyId: 'IAM-0002', field: 'Sprint points', suggested: '8', confidence: 'confirm', ...over });

test('an unlock row for a locked story is accepted and written with empty Field and Current', () => {
  const root = tempLocked();
  const r = run(root, [unlock()]);
  assert.deepEqual([r.ok, r.count], [true, 1], JSON.stringify(r.errors));
  const [row] = parseReview(fs.readFileSync(reviewPath(root), 'utf8')).rows;
  assert.deepEqual([row.storyId, row.action, row.field, row.suggested, row.current, row.status], ['IAM-0002', 'unlock', '', '', '', 'open']);
});

test('an unlock row for an unlocked story is rejected and nothing is written', () => {
  const root = tempLocked();
  const r = run(root, [unlock({ storyId: 'IAM-0001' })]);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('not locked')));
  assert.equal(fs.existsSync(path.join(root, 'reviews')), false);
});

test('a field edit on a locked story needs an unlock row: in the batch, or from an earlier batch', () => {
  const root = tempLocked();
  const without = run(root, [lockedEdit()]);
  assert.equal(without.ok, false);
  assert.ok(without.errors.some((e) => e.includes('IAM-0002') && e.includes('locked')));
  assert.equal(fs.existsSync(path.join(root, 'reviews')), false);

  assert.equal(run(root, [lockedEdit(), unlock()]).ok, true);

  const root2 = tempLocked();
  assert.equal(run(root2, [unlock()]).ok, true);
  const later = writeReview({ dataDir: root2, name: 'data.csv', input: JSON.stringify([lockedEdit()]), append: true });
  assert.deepEqual([later.ok, later.count], [true, 2], JSON.stringify(later.errors));
});

test('a replacing write ignores the unlock row of the review it replaces', () => {
  const root = tempLocked();
  assert.equal(run(root, [unlock()]).ok, true);
  assert.equal(run(root, [lockedEdit()]).ok, false);
});

test('clarification rows are accepted, also with --append, and existing rows are kept', () => {
  const root = temp();
  const ask = (over = {}) => finding({ field: 'Clarifications', action: 'append', suggested: 'Which format?', area: 'Clarification', confidence: 'confirm', ...over });
  assert.equal(run(root, [finding()]).ok, true);
  const r = writeReview({ dataDir: root, name: 'data.csv', input: JSON.stringify([ask()]), append: true });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const rows = parseReview(fs.readFileSync(reviewPath(root), 'utf8')).rows;
  assert.deepEqual(rows.map((x) => x.field), ['Title', 'Clarifications']);
  assert.equal(rows[1].area, 'Clarification');
  const bad = writeReview({ dataDir: root, name: 'data.csv', input: JSON.stringify([ask({ suggested: 'Q1: no' })]), append: true });
  assert.equal(bad.ok, false);
  assert.equal(parseReview(fs.readFileSync(reviewPath(root), 'utf8')).rows.length, 2);
});

test('a resolve row stores the question of its pair in Current and not the pair number', () => {
  const root = temp();
  const p = path.join(root, 'user-stories', 'data.csv');
  fs.writeFileSync(p, CSV.replace('"AC1: Given a, when b, then c",', '"AC1: Given a, when b, then c",,,"Q1: Who owns approvals?\nA1:\nQ2: Which format?\nA2: CSV"').replace('Notes\r\n', 'Notes,Locked,Clarifications\r\n'));
  const resolve = (over = {}) => finding({ field: 'Clarifications', action: 'resolve', pair: 2, suggested: 'Format is CSV', area: 'Clarification', ...over });
  const r = run(root, [resolve()]);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const [row] = parseReview(fs.readFileSync(reviewPath(root), 'utf8')).rows;
  assert.deepEqual([row.action, row.current, row.suggested], ['resolve', 'Which format?', 'Format is CSV']);
  const bad = run(root, [resolve({ pair: 3 })]);
  assert.equal(bad.ok, false);
  assert.match(bad.errors.join('\n'), /no question 3 \(it has 2\)/);
  assert.equal(parseReview(fs.readFileSync(reviewPath(root), 'utf8')).rows.length, 1, 'the earlier review is kept');
});

test('a check reports the same problems and the rows it would add, and changes nothing', () => {
  const root = temp();
  const check = (findings, append = false) => checkReview({ dataDir: root, name: 'data.csv', input: JSON.stringify(findings), append });
  const ok = check([finding(), finding({ field: 'Notes', suggested: 'n' })]);
  assert.deepEqual([ok.ok, ok.added], [true, 2]);
  assert.equal(fs.existsSync(path.join(root, 'reviews')), false, 'a check creates nothing');

  const bad = [finding({ storyId: 'ZZ-0009' })];
  assert.deepEqual(check(bad).errors, run(root, bad).errors, 'same problems as the writer');

  run(root, [finding()]);
  const before = fs.readFileSync(reviewPath(root));
  assert.equal(check([finding({ field: 'Notes', suggested: 'n' })], true).ok, true);
  assert.deepEqual(fs.readFileSync(reviewPath(root)), before);
});

test('the row count in the result is the one read back from the file', () => {
  const root = temp();
  run(root, [finding()]);
  const r = writeReview({ dataDir: root, name: 'data.csv', input: JSON.stringify([finding({ field: 'Notes', suggested: 'n' })]), append: true });
  assert.deepEqual([r.ok, r.added, r.count], [true, 1, 2]);
});

test('a write that does not stick fails with the row counts, and is not reported as written', () => {
  const root = temp();
  const realRename = fs.renameSync;
  const lossy = mock.method(fs, 'renameSync', (from, to) => {
    const lines = fs.readFileSync(from, 'utf8').split('\r\n');
    fs.writeFileSync(from, [...lines.slice(0, -2), ''].join('\r\n')); // the last row never reaches the file
    realRename(from, to);
  });
  try {
    const r = run(root, [finding(), finding({ field: 'Notes', suggested: 'n' })]);
    assert.equal(r.ok, false);
    assert.match(r.errors[0], /read back is wrong: 1 rows on disk, 2 expected/);
    assert.match(r.errors[0], /Do not report these suggestions as written/);
  } finally {
    lossy.mock.restore();
  }
});

test('with requireTitles each row needs its story Title, a stale pair writes nothing and the stored row is the same', () => {
  const root = temp();
  const strict = (rows, fn = writeReview) => fn({ dataDir: root, name: 'data.csv', input: JSON.stringify(rows), append: true, requireTitles: true });
  const missing = strict([finding()]);
  assert.match(missing.errors[0], /IAM-0001 needs the story's current Title next to it \(storyTitle\)/);
  const stale = strict([finding({ storyTitle: 'SSO Login' })]);
  assert.match(stale.errors[0], /IAM-0001 is now "Login" \(Identity & Access Management > Auth\), not "SSO Login"\. Stories titled "SSO Login": IAM-0002/);
  assert.deepEqual(strict([finding({ storyTitle: 'SSO Login' })], checkReview).errors, stale.errors);
  assert.equal(fs.existsSync(reviewPath(root)), false);
  assert.equal(strict([finding({ storyTitle: ' login ' })]).ok, true);
  const plain = temp();
  run(plain, [finding()]);
  assert.equal(fs.readFileSync(reviewPath(root), 'utf8'), fs.readFileSync(reviewPath(plain), 'utf8'));
});

test('a Depends On row names the Title of its target; a stale target writes nothing', () => {
  const root = temp();
  const dep = (over = {}) => finding({ field: 'Depends On', action: 'add', suggested: 'IAM-0001', storyId: 'IAM-0002', storyTitle: 'SSO Login', area: 'INVEST', ...over });
  const strict = (rows) => writeReview({ dataDir: root, name: 'data.csv', input: JSON.stringify(rows), append: true, requireTitles: true });
  assert.match(strict([dep()]).errors[0], /Suggested: IAM-0001 needs the story's current Title next to it \(targetTitle\)/);
  assert.match(strict([dep({ targetTitle: 'Logout' })]).errors[0], /Suggested: IAM-0001 is now "Login".*not "Logout"/);
  assert.equal(strict([dep({ targetTitle: 'Login' })]).ok, true);
  assert.equal(run(temp(), [dep({ storyTitle: undefined })]).ok, true, 'the CLI form without Titles is unchanged');
});

test('an unlock row is checked against the Title as well', () => {
  const root = temp();
  const r = writeReview({ dataDir: root, name: 'data.csv', append: true, requireTitles: true, input: JSON.stringify([{ storyId: 'IAM-0001', storyTitle: 'Nope', field: '', action: 'unlock', suggested: '', reason: 'r', area: 'INVEST', confidence: 'confirm' }]) });
  assert.match(r.errors[0], /IAM-0001 is now "Login"/);
});
