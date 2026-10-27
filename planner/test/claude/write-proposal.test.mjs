import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeProposal, checkProposal, missingAfterWrite } from '../../../.claude/skills/propose-stories/write-proposal.mjs';
import { loadBacklog, serializeBacklog, proposalHeaders } from '../../logic/backlog/model.js';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.claude/skills/propose-stories/write-proposal.mjs');

const CSV =
  'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes,Team\r\n' +
  'IAM-0001,Identity & Access Management,Auth,Login,"As a user, I want to log in, so that I can access the portal",5,High,,"AC1: Given a, when b, then c",,Blue\r\n';

function temp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'proposal-test-'));
  fs.mkdirSync(path.join(root, 'backlogs'));
  fs.writeFileSync(path.join(root, 'backlogs', 'data.csv'), CSV);
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
  const before = fs.readFileSync(path.join(root, 'backlogs', 'data.csv'));
  const r = run(root, [story(), story({ title: 'Two', dependsOn: ['NEW-1', 'IAM-0001'] })]);
  assert.deepEqual([r.ok, r.ids, r.count], [true, ['NEW-1', 'NEW-2'], 2]);
  assert.deepEqual(fs.readFileSync(path.join(root, 'backlogs', 'data.csv')), before);
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
  const r = run(root, [story(), story({ title: 'Two', epic: '' }), story({ title: 'Three', points: 21 })]);
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
  fs.writeFileSync(proposalPath(root), [head, two.replace('Two', 'Edited by the user').replace(/,,,,$/, ',Red,,,'), one, ''].join('\r\n'));
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
  // The real script, pointed at a temp data folder through PLANNER_DATA_DIR.
  const root = temp();
  const cli = (args, input) => spawnSync(process.execPath, [SCRIPT, ...args], {
    input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, PLANNER_DATA_DIR: root },
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
  fs.writeFileSync(proposalPath(root), [head, one, two.replace(/,,,,$/, ',Red,,,'), three.replace(/,$/, ',Yes'), ''].join('\r\n'));
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
    input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, PLANNER_DATA_DIR: root },
  });
  cli([story()]);
  const patched = cli([{ id: 'NEW-1', points: 5 }]);
  assert.equal(patched.status, 0, patched.stderr);
  assert.match(patched.stdout, /^Patched 1 proposed story in proposals\/data\.csv \(NEW-1\); 1 in the file now\./);
  const both = cli([{ id: 'NEW-1', points: 2 }, story({ title: 'Two' })]);
  assert.match(both.stdout, /^Added 1 proposed story to proposals\/data\.csv \(NEW-2\); patched 1 proposed story \(NEW-1\); 2 in the file now\./);
});

// clarifications

test('a new story with questions is stored with open pairs', () => {
  const root = temp();
  const r = run(root, [story({ clarifications: ['Who owns approvals?', ' Is SSO needed? '] })]);
  assert.equal(r.ok, true);
  assert.deepEqual(load(root).stories[0].clarifications, [{ q: 'Who owns approvals?', a: '' }, { q: 'Is SSO needed?', a: '' }]);
});

test('a patch adds questions after the stored pairs and answers an empty pair, leaving the others unchanged', () => {
  const root = temp();
  run(root, [story({ clarifications: ['One?', 'Two?'] })]);
  const r = run(root, [{ id: 'NEW-1', clarifications: { add: ['Three?'], answer: [{ n: 2, text: 'Yes' }] } }]);
  assert.equal(r.ok, true);
  assert.deepEqual(load(root).stories[0].clarifications, [{ q: 'One?', a: '' }, { q: 'Two?', a: 'Yes' }, { q: 'Three?', a: '' }]);
});

test('an answer to a pair that has one, or that does not exist, writes nothing and names the pair', () => {
  const root = temp();
  run(root, [story({ clarifications: ['One?'] })]);
  run(root, [{ id: 'NEW-1', clarifications: { answer: [{ n: 1, text: 'First' }] } }]);
  const before = fs.readFileSync(proposalPath(root), 'utf8');
  for (const [n, re] of [[1, /pair 1, which already has an answer/], [2, /pair 2, but the story has 1 pair/]]) {
    const r = run(root, [{ id: 'NEW-1', title: 'Changed', clarifications: { answer: [{ n, text: 'Other' }] } }]);
    assert.equal(r.ok, false);
    assert.match(r.errors.join('\n'), re);
    assert.equal(fs.readFileSync(proposalPath(root), 'utf8'), before);
  }
});

test('clarifications of the wrong shape are refused, a patch to a benched story too', () => {
  const root = temp();
  assert.equal(run(root, [story({ clarifications: 'Who?' })]).ok, false);
  assert.equal(run(root, [story({ clarifications: [''] })]).ok, false);
  run(root, [story()]);
  for (const bad of [['Who?'], {}, { remove: [1] }, { add: 'Who?' }, { answer: [{ n: 1 }] }]) {
    assert.equal(run(root, [{ id: 'NEW-1', clarifications: bad }]).ok, false);
  }
  const p = load(root);
  p.stories[0].benched = true;
  fs.writeFileSync(proposalPath(root), serializeBacklog(p));
  const r = run(root, [{ id: 'NEW-1', clarifications: { add: ['Who?'] } }]);
  assert.match(r.errors.join('\n'), /benched/);
});

test('a valid clarifications patch and an invalid item together write nothing', () => {
  const root = temp();
  run(root, [story()]);
  const before = fs.readFileSync(proposalPath(root), 'utf8');
  const r = run(root, [{ id: 'NEW-1', clarifications: { add: ['Who?'] } }, story({ points: 21 })]);
  assert.equal(r.ok, false);
  assert.equal(fs.readFileSync(proposalPath(root), 'utf8'), before);
});

test('clarifications on a story whose cell is free text are refused', () => {
  const root = temp();
  run(root, [story()]);
  const p = load(root);
  p.stories[0].rawClarifications = 'ask Sam';
  fs.writeFileSync(proposalPath(root), serializeBacklog(p));
  const r = run(root, [{ id: 'NEW-1', clarifications: { add: ['Who?'] } }]);
  assert.match(r.errors.join('\n'), /free text/);
});

// multi-line Notes and resolving clarifications

test('Notes may have several lines on a new story and a patch, while a Title still may not', () => {
  const root = temp();
  assert.equal(run(root, [story({ notes: 'First.\r\nSecond.\n' })]).ok, true);
  assert.equal(load(root).stories[0].notes, 'First.\nSecond.');
  assert.equal(run(root, [{ id: 'NEW-1', notes: 'A\nB\nC' }]).ok, true);
  assert.equal(load(root).stories[0].notes, 'A\nB\nC');
  const bad = run(root, [{ id: 'NEW-1', title: 'Two\nlines' }]);
  assert.equal(bad.ok, false);
  assert.match(bad.errors.join('\n'), /Title must be on one line/);
});

test('resolve moves a pair into Notes and removes it; a filled and an open pair both work', () => {
  const root = temp();
  run(root, [story({ notes: 'Existing.', clarifications: ['One?', 'Two?', 'Three?'] })]);
  run(root, [{ id: 'NEW-1', clarifications: { answer: [{ n: 1, text: 'Yes' }] } }]);
  const r = run(root, [{ id: 'NEW-1', clarifications: { resolve: [{ n: 1, note: 'One is yes' }, { n: 3, note: 'Three is\nfor Finance' }] } }]);
  assert.equal(r.ok, true, r.errors?.join('\n'));
  const s = load(root).stories[0];
  assert.equal(s.notes, 'Existing.\nOne is yes\nThree is\nfor Finance');
  assert.deepEqual(s.clarifications, [{ q: 'Two?', a: '' }]);
});

test('resolve fills an empty Notes, runs with add and notes, and add comes after the removal', () => {
  const root = temp();
  run(root, [story({ clarifications: ['One?', 'Two?'] })]);
  const r = run(root, [{ id: 'NEW-1', notes: 'Fresh', clarifications: { resolve: [{ n: 1, note: 'Decided' }], add: ['Three?'] } }]);
  assert.equal(r.ok, true, r.errors?.join('\n'));
  const s = load(root).stories[0];
  assert.equal(s.notes, 'Fresh\nDecided');
  assert.deepEqual(s.clarifications, [{ q: 'Two?', a: '' }, { q: 'Three?', a: '' }]);
  run(root, [story({ title: 'Other', clarifications: ['Only?'] })]);
  run(root, [{ id: 'NEW-2', clarifications: { resolve: [{ n: 1, note: 'Done' }] } }]);
  assert.equal(load(root).stories[1].notes, 'Done');
});

test('a bad resolve writes nothing and names the pair', () => {
  const root = temp();
  run(root, [story({ clarifications: ['One?', 'Two?'] })]);
  const before = fs.readFileSync(proposalPath(root), 'utf8');
  const cases = [
    [{ resolve: [{ n: 3, note: 'x' }] }, /pair 3, but the story has 2 pairs/],
    [{ resolve: [{ n: 1, note: '  ' }] }, /each clarifications\.resolve item/],
    [{ resolve: [{ n: 1 }] }, /each clarifications\.resolve item/],
    [{ resolve: [{ n: 1, note: 'a' }, { n: 1, note: 'b' }] }, /resolves pair 1 more than once/],
    [{ answer: [{ n: 2, text: 'y' }], resolve: [{ n: 2, note: 'x' }] }, /pair 2 in both answer and resolve/],
    [{ resolve: 'x' }, /must be a list/],
    [{ resolve: [] }, /changes nothing/],
  ];
  for (const [clarifications, re] of cases) {
    const r = run(root, [{ id: 'NEW-1', clarifications }]);
    assert.equal(r.ok, false);
    assert.match(r.errors.join('\n'), re);
    assert.equal(fs.readFileSync(proposalPath(root), 'utf8'), before);
  }
});

test('resolve is refused on a benched story, on free text, and with an invalid item in the call', () => {
  const root = temp();
  run(root, [story({ clarifications: ['One?'] })]);
  const before = fs.readFileSync(proposalPath(root), 'utf8');
  const bad = run(root, [{ id: 'NEW-1', clarifications: { resolve: [{ n: 1, note: 'x' }] } }, story({ points: 21, title: 'Other' })]);
  assert.equal(bad.ok, false);
  assert.equal(fs.readFileSync(proposalPath(root), 'utf8'), before);
  const p = load(root);
  p.stories[0].rawClarifications = 'ask Sam';
  fs.writeFileSync(proposalPath(root), serializeBacklog(p));
  assert.match(run(root, [{ id: 'NEW-1', clarifications: { resolve: [{ n: 1, note: 'x' }] } }]).errors.join('\n'), /free text/);
  p.stories[0].rawClarifications = null;
  p.stories[0].benched = true;
  fs.writeFileSync(proposalPath(root), serializeBacklog(p));
  assert.match(run(root, [{ id: 'NEW-1', clarifications: { resolve: [{ n: 1, note: 'x' }] } }]).errors.join('\n'), /benched/);
});

test('a check leaves every file as it was, reports the same problems and what would be added', () => {
  const root = temp();
  const check = (stories) => checkProposal({ dataDir: root, name: 'data.csv', input: JSON.stringify(stories) });
  const ok = check([story(), story({ title: 'Two' })]);
  assert.deepEqual([ok.ok, ok.ids, ok.patchedIds, ok.skipped], [true, ['NEW-1', 'NEW-2'], [], []]);
  assert.equal(fs.existsSync(path.join(root, 'proposals')), false, 'a check creates nothing');

  const bad = check([story({ points: 21 })]);
  assert.deepEqual(bad.errors, run(root, [story({ points: 21 })]).errors, 'same problems as the writer');

  run(root, [story()]);
  const before = fs.readFileSync(proposalPath(root));
  const again = check([story(), story({ title: 'Two' })]);
  assert.deepEqual([again.ids, again.skipped.map((s) => s.id)], [['NEW-2'], ['NEW-1']]);
  assert.deepEqual(fs.readFileSync(proposalPath(root)), before, 'a check changes nothing');
});

test('sending a batch again adds nothing, leaves the file byte-for-byte as it was and reports the repeats', () => {
  const root = temp();
  const batch = [story(), story({ title: 'Two' })];
  run(root, batch);
  const before = fs.readFileSync(proposalPath(root));
  const r = run(root, batch);
  assert.deepEqual([r.ok, r.ids, r.count, r.skipped.map((s) => s.id)], [true, [], 2, ['NEW-1', 'NEW-2']]);
  assert.deepEqual(fs.readFileSync(proposalPath(root)), before);
});

test('a batch sent again after one story went missing adds only the missing one', () => {
  const root = temp();
  const batch = [story(), story({ title: 'Two' }), story({ title: 'Three' })];
  run(root, batch);
  const lines = fs.readFileSync(proposalPath(root), 'utf8').split('\r\n');
  fs.writeFileSync(proposalPath(root), [lines[0], lines[1], lines[3], ''].join('\r\n')); // 'Two' is gone
  const r = run(root, batch);
  assert.deepEqual([r.ok, r.ids, r.skipped.map((s) => s.id), r.count], [true, ['NEW-4'], ['NEW-1', 'NEW-3'], 3]);
  assert.deepEqual(load(root).stories.map((s) => s.title), ['Reset password', 'Three', 'Two']);
});

test('CLI: --check prints what would happen and writes nothing; a repeat is reported as skipped', () => {
  const root = temp();
  const cli = (args, input) => spawnSync(process.execPath, [SCRIPT, ...args], {
    input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, PLANNER_DATA_DIR: root },
  });
  const checked = cli(['data.csv', '--check'], [story()]);
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /^Check passed, nothing written\. Would be: Added 1 proposed story to proposals\/data\.csv \(NEW-1\)\./);
  assert.equal(fs.existsSync(path.join(root, 'proposals')), false);
  assert.equal(cli(['data.csv', '--check'], [story({ points: 21 })]).status, 1);
  assert.equal(cli(['data.csv', '--nope'], []).status, 2);

  cli(['data.csv'], [story()]);
  const again = cli(['data.csv'], [story(), story({ title: 'Two' })]);
  assert.match(again.stdout, /^Added 1 proposed story to proposals\/data\.csv \(NEW-2\); skipped 1 already in the file \(Story 1 = NEW-1\); 2 in the file now\./);
  const none = cli(['data.csv'], [story()]);
  assert.match(none.stdout, /^Skipped 1 already in the file \(Story 1 = NEW-1\); 2 in the file now\./);
});

test('the result comes from the file read back: row count and the IDs found on disk', () => {
  const root = temp();
  run(root, [story()]);
  const r = run(root, [{ id: 'NEW-1', points: 5 }, story({ title: 'Two' })]);
  assert.deepEqual([r.ok, r.count, r.found], [true, 2, ['NEW-2', 'NEW-1']]);
});

test('missingAfterWrite names the IDs that are not on disk, or a wrong row count', () => {
  const stored = loadBacklog(`${CSV.split('\r\n')[0]}\r\nNEW-1,E,F,One,,,,,,,\r\nNEW-3,E,F,Three,,,,,,,\r\n`, { placeholderIds: true });
  assert.equal(missingAfterWrite(stored, ['NEW-1', 'NEW-3'], 2), null);
  assert.match(missingAfterWrite(stored, ['NEW-1', 'NEW-2'], 3), /NEW-2 not found \(2 stories on disk, 3 expected\)/);
  assert.match(missingAfterWrite(stored, ['NEW-1'], 3), /2 stories on disk, 3 expected/);
});

test('a write that does not stick fails naming the missing story, and is not reported as written', () => {
  const root = temp();
  const realRename = fs.renameSync;
  // The rename "succeeds" but the last row never reaches the file.
  const lossy = mock.method(fs, 'renameSync', (from, to) => {
    const lines = fs.readFileSync(from, 'utf8').split('\r\n');
    fs.writeFileSync(from, [...lines.slice(0, -2), ''].join('\r\n'));
    realRename(from, to);
  });
  try {
    const r = run(root, [story(), story({ title: 'Two' })]);
    assert.equal(r.ok, false);
    assert.match(r.errors[0], /read back is wrong: NEW-2 not found \(1 stories on disk, 2 expected\)/);
    assert.match(r.errors[0], /Do not report these stories as written/);
  } finally {
    lossy.mock.restore();
  }
});

test('CLI and message: the IDs read back are listed', () => {
  const root = temp();
  const out = spawnSync(process.execPath, [SCRIPT, 'data.csv'], {
    input: JSON.stringify([story(), story({ title: 'Two' })]), encoding: 'utf8', env: { ...process.env, PLANNER_DATA_DIR: root },
  });
  assert.match(out.stdout, /2 in the file now\. On disk: NEW-1, NEW-2\./);
});

test('a write is recorded in the write log under the tool name; a check and a skipped repeat are not', () => {
  const root = temp();
  const logPath = path.join(root, 'logs', 'writes.jsonl');
  const logLines = () => (fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l)) : []);
  checkProposal({ dataDir: root, name: 'data.csv', input: JSON.stringify([story()]) });
  assert.deepEqual(logLines(), [], 'a check writes nothing and logs nothing');
  run(root, [story()]);
  run(root, [story()]); // a repeat: the file is not rewritten
  const lines = logLines();
  assert.equal(lines.length, 1);
  assert.deepEqual([lines[0].writer, lines[0].store, lines[0].file], ['write_proposals', 'proposals', 'data.csv']);
  assert.equal(lines[0].bytes, fs.statSync(proposalPath(root)).size);
});

test('requireTitles: a bare ID writes nothing, the Title form writes, and check reports the same problem', () => {
  const root = temp();
  const bare = [story({ dependsOn: ['IAM-0001'] })];
  const strict = (stories, fn = writeProposal) => fn({ dataDir: root, name: 'data.csv', input: JSON.stringify(stories), requireTitles: true });
  const refused = strict(bare);
  assert.equal(refused.ok, false);
  assert.match(refused.errors[0], /IAM-0001 needs the story's current Title/);
  assert.deepEqual(strict(bare, checkProposal).errors, refused.errors);
  assert.equal(fs.existsSync(proposalPath(root)), false);
  const stale = strict([story({ dependsOn: [{ id: 'IAM-0001', title: 'Logout' }] })]);
  assert.match(stale.errors[0], /IAM-0001 is now "Login" \(Identity & Access Management > Auth\), not "Logout"/);
  assert.equal(strict([story({ dependsOn: [{ id: 'IAM-0001', title: 'Login' }] })]).ok, true);
  assert.deepEqual(load(root).stories[0].dependsOn, ['IAM-0001']);
});
