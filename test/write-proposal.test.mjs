import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeProposal } from '../.claude/skills/propose-stories/write-proposal.mjs';
import { loadBacklog, proposalHeaders } from '../core/model.js';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.claude/skills/propose-stories/write-proposal.mjs');

const CSV =
  'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes,Team\r\n' +
  'IAM-0001,Identity & Access Management,Auth,Login,"As a user, I want to log in, so that I can access the portal",5,High,,"AC1: Given a, when b, then c",,Blue\r\n';

function temp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'proposal-test-'));
  fs.mkdirSync(path.join(root, 'user-stories'));
  fs.writeFileSync(path.join(root, 'user-stories', 'data.csv'), CSV);
  return root;
}

const story = (over = {}) => ({
  epic: 'Identity & Access Management',
  feature: 'Auth',
  title: 'Reset password',
  userStory: 'As a user, I want to reset my password, so that I can regain access',
  points: 3,
  dependsOn: [],
  criteria: ['AC1: Given a registered email, when I ask for a reset, then a link is sent'],
  ...over,
});
const run = (root, stories, name = 'data.csv') => writeProposal({ dataDir: root, name, input: JSON.stringify(stories) });
const proposalPath = (root) => path.join(root, 'proposals', 'data.csv');
const load = (root) => loadBacklog(fs.readFileSync(proposalPath(root), 'utf8'), { placeholderIds: true });

test('valid input creates proposals/<name> and leaves the backlog byte-for-byte unchanged', () => {
  const root = temp();
  const before = fs.readFileSync(path.join(root, 'user-stories', 'data.csv'));
  const r = run(root, [story(), story({ title: 'Two', dependsOn: ['NEW-1', 'IAM-0001'] })]);
  assert.deepEqual([r.ok, r.ids, r.count], [true, ['NEW-1', 'NEW-2'], 2]);
  assert.deepEqual(fs.readFileSync(path.join(root, 'user-stories', 'data.csv')), before);
  const p = load(root);
  assert.deepEqual(p.stories.map((s) => s.code), ['NEW-1', 'NEW-2']);
  assert.deepEqual(p.stories[1].dependsOn, ['NEW-1', 'IAM-0001']);
  assert.deepEqual(fs.readdirSync(path.join(root, 'proposals')), ['data.csv'], 'no temp file left behind');
});

test('a new file has the backlog columns (extra ones too) and a BOM', () => {
  const root = temp();
  run(root, [story()]);
  const text = fs.readFileSync(proposalPath(root), 'utf8');
  assert.equal(text.charCodeAt(0), 0xfeff);
  const p = load(root);
  assert.deepEqual(p.headers, proposalHeaders(loadBacklog(CSV).headers));
  assert.equal(p.stories[0].cells.length, p.headers.length);
});

test('unknown backlog and bad names write nothing', () => {
  const root = temp();
  assert.match(run(root, [story()], 'nope.csv').errors[0], /was not found/);
  for (const name of ['../x.csv', 'a/b.csv', 'x.txt', '']) assert.equal(run(root, [story()], name).ok, false, name);
  assert.equal(fs.existsSync(path.join(root, 'proposals')), false);
});

test('invalid input reports every problem and writes nothing, keeping an existing file', () => {
  const root = temp();
  run(root, [story()]);
  const good = fs.readFileSync(proposalPath(root), 'utf8');
  const r = run(root, [story(), story({ epic: '' }), story({ points: 21 })]);
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 2);
  assert.match(r.errors[0], /^Story 2 /);
  assert.match(r.errors[1], /^Story 3 /);
  assert.equal(fs.readFileSync(proposalPath(root), 'utf8'), good);
});

test('no file is created when validation fails', () => {
  const root = temp();
  assert.equal(run(root, [story({ priority: 'High' })]).ok, false);
  assert.equal(fs.existsSync(path.join(root, 'proposals')), false);
});

test('bad JSON reports line and column', () => {
  const root = temp();
  const r = writeProposal({ dataDir: root, name: 'data.csv', input: '[\n  {"epic": "x",}\n]' });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /not valid JSON.*line 2, column \d+/);
});

test('add-only: existing rows, order, unknown columns and user edits are kept, numbers continue', () => {
  const root = temp();
  run(root, [story(), story({ title: 'Two' })]);
  // The user edits and reorders rows in the portal: the file now holds NEW-2 (with a Team value), then NEW-1.
  const edited = fs.readFileSync(proposalPath(root), 'utf8').split('\r\n');
  const [head, one, two] = edited;
  fs.writeFileSync(proposalPath(root), [head, two.replace('Two', 'Edited by the user').replace(/,,,$/, ',Red,,'), one, ''].join('\r\n'));
  const before = load(root);
  assert.equal(before.stories[0].title, 'Edited by the user');
  assert.equal(before.stories[0].cells[before.headers.indexOf('Team')], 'Red');

  const r = run(root, [story({ title: 'Three' })]);
  assert.deepEqual([r.ok, r.ids, r.count], [true, ['NEW-3'], 3]);
  const after = load(root);
  assert.deepEqual(after.stories.slice(0, 2).map((s) => [s.code, s.title, s.cells]), before.stories.map((s) => [s.code, s.title, s.cells]));
  assert.deepEqual(after.stories.map((s) => s.code), ['NEW-2', 'NEW-1', 'NEW-3']);
  assert.equal(after.hasBom, true);
});

test('a dependency on an earlier proposal needs proposed:, and a failed run keeps the file', () => {
  const root = temp();
  run(root, [story()]);
  const ok = run(root, [story({ title: 'Two', dependsOn: ['proposed:NEW-1'] })]);
  assert.equal(ok.ok, true);
  assert.deepEqual(load(root).stories[1].dependsOn, ['NEW-1']);
  assert.equal(run(root, [story({ dependsOn: ['proposed:NEW-9'] })]).ok, false);
});

test('CLI: prints the IDs on success; exits 1 with "Nothing was written" on invalid input; extra arguments exit 2', () => {
  // The real script, pointed at a temp data folder through TLT_DATA_DIR.
  const root = temp();
  const cli = (args, input) => spawnSync(process.execPath, [SCRIPT, ...args], {
    input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, TLT_DATA_DIR: root },
  });

  const ok = cli(['data.csv'], [story()]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Added 1 proposed story to proposals\/data\.csv \(NEW-1\); 1 in the file now\./);
  const bad = cli(['data.csv'], [story({ points: 21 })]);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Nothing was written\. 1 problem:\n- Story 1 .*split/);
  assert.equal(cli(['data.csv', 'out.csv'], []).status, 2);
  assert.equal(load(root).stories.length, 1);
});

test('a patch changes that row in place; every other row is byte-identical and nothing is added', () => {
  const root = temp();
  run(root, [story(), story({ title: 'Two' }), story({ title: 'Three' })]);
  // The user adds a value in an unknown column and benches the last row in the portal.
  const [head, one, two, three] = fs.readFileSync(proposalPath(root), 'utf8').split('\r\n');
  fs.writeFileSync(proposalPath(root), [head, one, two.replace(/,,,$/, ',Red,,'), three.replace(/,$/, ',Yes'), ''].join('\r\n'));
  const before = fs.readFileSync(proposalPath(root), 'utf8').split('\r\n');

  const r = run(root, [{ id: 'NEW-2', points: 8, notes: 'sized again' }]);
  assert.deepEqual([r.ok, r.ids, r.patchedIds, r.count], [true, [], ['NEW-2'], 3]);
  const after = fs.readFileSync(proposalPath(root), 'utf8').split('\r\n');
  assert.equal(after[0], before[0]);
  assert.equal(after[1], before[1]);
  assert.equal(after[3], before[3]);
  assert.notEqual(after[2], before[2]);
  const p = load(root);
  assert.deepEqual(p.stories.map((s) => s.code), ['NEW-1', 'NEW-2', 'NEW-3']);
  assert.equal(p.stories[1].points, '8');
  assert.equal(p.stories[1].notes, 'sized again');
  assert.equal(p.stories[1].title, 'Two');
  assert.equal(p.stories[1].cells[p.headers.indexOf('Team')], 'Red', 'unknown column kept');
});

test('a mixed run adds and patches together; one invalid item writes neither', () => {
  const root = temp();
  run(root, [story()]);
  const before = fs.readFileSync(proposalPath(root));
  const ok = run(root, [{ id: 'NEW-1', points: 5 }, story({ title: 'Two', dependsOn: ['proposed:NEW-1'] })]);
  assert.deepEqual([ok.ok, ok.ids, ok.patchedIds, ok.count], [true, ['NEW-2'], ['NEW-1'], 2]);
  const p = load(root);
  assert.equal(p.stories[0].points, '5');
  assert.deepEqual(p.stories[1].dependsOn, ['NEW-1']);

  const mid = fs.readFileSync(proposalPath(root));
  assert.notDeepEqual(mid, before);
  const bad = run(root, [{ id: 'NEW-1', points: 2 }, story({ points: 21 })]);
  assert.equal(bad.ok, false);
  assert.deepEqual(fs.readFileSync(proposalPath(root)), mid, 'the valid patch was not written either');
});

test('a rejected patch writes nothing, and a patch against a missing file creates nothing', () => {
  const root = temp();
  assert.equal(run(root, [{ id: 'NEW-1', points: 2 }]).ok, false);
  assert.equal(fs.existsSync(path.join(root, 'proposals')), false);
  run(root, [story()]);
  const before = fs.readFileSync(proposalPath(root));
  for (const item of [{ id: 'NEW-9', points: 2 }, { id: 'NEW-1' }, { id: 'NEW-1', priority: 'High' }]) {
    assert.equal(run(root, [item]).ok, false, JSON.stringify(item));
  }
  assert.deepEqual(fs.readFileSync(proposalPath(root)), before);
});

test('CLI: reports patched IDs, with and without added ones', () => {
  const root = temp();
  const cli = (input) => spawnSync(process.execPath, [SCRIPT, 'data.csv'], {
    input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, TLT_DATA_DIR: root },
  });
  cli([story()]);
  const patched = cli([{ id: 'NEW-1', points: 5 }]);
  assert.equal(patched.status, 0, patched.stderr);
  assert.match(patched.stdout, /^Patched 1 proposed story in proposals\/data\.csv \(NEW-1\); 1 in the file now\./);
  const both = cli([{ id: 'NEW-1', points: 2 }, story({ title: 'Two' })]);
  assert.match(both.stdout, /^Added 1 proposed story to proposals\/data\.csv \(NEW-2\); patched 1 proposed story \(NEW-1\); 2 in the file now\./);
});
