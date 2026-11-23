import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sampleTree, backlogPath } from './helpers/backlog-tree.mjs';
import { tempProject } from './helpers/temp-project.mjs';
import { writeDesignIndex, checkDesignIndexWrite } from '../../skills/jois-story-design/write-design-index.mjs';
import { parseDesignIndexCsv } from '../../skills/jois-story-design/lib/design/design-index-csv.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills/jois-story-design/write-design-index.mjs');
const CANVAS = 'https://claude.ai/artifact/mockhabits0001';
const AC_1 = 'Given a habit checked off on each of the last 3 days, when I open the habit list, then it shows a streak of 3.';
const AC_2 = 'Given a habit whose longest run was 5 days and whose current streak is 2, when I open the habit list, then it shows a best streak of 5.';
const AC_FOCUS = 'Given 2 coding sessions and 1 writing session, when I open the focus view, then it shows 2 for coding and 1 for writing.';

const criterion = (text, over = {}) => ({ text, kind: 'main', artboards: ['streaks-list-default-desktop', 'streaks-list-default-mobile'], ...over });
const request = (stories, over = {}) => ({ canvas: CANVAS, viewports: ['desktop', 'mobile'], stories, ...over });

// A data folder with the habits backlog, and the mock design files when `withDesign`.
function temp(withDesign = true) {
  const { dataDir } = tempProject();
  sampleTree({ into: dataDir, withDesign });
  return dataDir;
}
const indexPath = (root) => path.join(backlogPath(root, 'sample'), 'design-index.csv');
const rowsOf = (root) => parseDesignIndexCsv(fs.readFileSync(indexPath(root), 'utf8'));
const write = (root, body) => writeDesignIndex({ dataDir: root, name: 'sample', input: JSON.stringify(body) });
const check = (root, body) => checkDesignIndexWrite({ dataDir: root, name: 'sample', input: JSON.stringify(body) });

// A listing of every file under a folder with its SHA-256.
function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(dir, p)] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    }
  };
  walk(dir);
  return out;
}

test('--check writes nothing, whether the file exists or not', () => {
  for (const withDesign of [true, false]) {
    const root = temp(withDesign);
    const before = snapshot(root);
    const r = check(root, request([{ storyId: 'H1-HT-0001', criteria: [criterion(AC_1, { artboards: ['streaks-list-new-desktop'] })] }]));
    assert.equal(r.ok, true);
    assert.equal(r.changed, false);
    assert.match(r.text, /^Check passed; nothing was written/);
    assert.deepEqual(snapshot(root), before);
  }
});

test('a new story is written to a new file, in the CSV shape, and read back', () => {
  const root = temp(false);
  const r = write(root, request([{ storyId: 'H1-HT-0001', criteria: [criterion(AC_1)] }]));
  assert.deepEqual([r.ok, r.changed], [true, true]);
  assert.match(r.text, /Read back/);
  const text = fs.readFileSync(indexPath(root), 'utf8');
  assert.match(text, /^Story ID,Story,Criterion,Kind,Artboards,Viewports,Canvas\r\n/);
  assert.match(text, /streaks-list-default-desktop;streaks-list-default-mobile,desktop;mobile,/);
  assert.deepEqual(rowsOf(root).map((x) => [x.storyId, x.story, x.criterion, x.canvas]), [['H1-HT-0001', 'See the current streak', AC_1, CANVAS]]);
  assert.deepEqual(fs.readdirSync(backlogPath(root, 'sample')).filter((f) => f.includes('.tmp')), []);
});

test('a new story is added after the rows that stay', () => {
  const root = temp();
  const r = write(root, request([{ storyId: 'H1-FT-0001', criteria: [criterion(AC_FOCUS, { artboards: ['focus-view-default-desktop'] })] }]));
  assert.equal(r.changed, true);
  assert.deepEqual(rowsOf(root).map((x) => x.storyId), ['H1-HT-0001', 'H1-HT-0002', 'H1-FT-0001']);
});

test('a replaced story gets the new rows in its place and every other story keeps its rows', () => {
  const root = temp();
  const before = rowsOf(root);
  const reworded = 'Given a habit checked off on 3 days in a row, when I open the list, then it shows a streak of 3.';
  const r = write(root, request([{ storyId: 'H1-HT-0001', criteria: [criterion(reworded), criterion('A second criterion', { kind: 'failure', artboards: ['streaks-list-error-desktop'] })] }]));
  assert.equal(r.changed, true);
  assert.match(r.text, /replace H1-HT-0001: 1 row -> 2 rows/);
  const after = rowsOf(root);
  assert.deepEqual(after.map((x) => [x.storyId, x.criterion]), [['H1-HT-0001', reworded], ['H1-HT-0001', 'A second criterion'], ['H1-HT-0002', AC_2]]);
  assert.deepEqual(after[2], before[1]);
});

test('an empty criteria list removes the story, and removing a story with no rows changes nothing', () => {
  const root = temp();
  const r = write(root, request([{ storyId: 'H1-HT-0001', criteria: [] }]));
  assert.equal(r.changed, true);
  assert.match(r.text, /remove H1-HT-0001: 1 row dropped/);
  assert.deepEqual(rowsOf(root).map((x) => x.storyId), ['H1-HT-0002']);
  const once = fs.readFileSync(indexPath(root));
  const again = write(root, request([{ storyId: 'H1-HT-0001', criteria: [] }]));
  assert.deepEqual([again.ok, again.changed], [true, false]);
  assert.deepEqual(fs.readFileSync(indexPath(root)), once);
});

test('the rows of a story deleted from the backlog are dropped by an empty criteria list, and the summary says the story is gone', () => {
  const root = temp();
  const csv = path.join(backlogPath(root, 'sample'), 'user-stories.csv');
  const text = fs.readFileSync(csv, 'utf8');
  fs.writeFileSync(csv, text.split('\n').filter((l) => !l.includes('See the best streak')).join('\n'));
  const before = rowsOf(root);
  assert.ok(before.some((x) => x.storyId === 'H1-HT-0002'));
  // Naming it with criteria is still refused, and the refusal tells the way out; nothing is written.
  const refused = write(root, request([{ storyId: 'H1-HT-0002', criteria: [criterion(AC_2)] }]));
  assert.equal(refused.ok, false);
  assert.match(refused.errors.join('\n'), /not in the backlog sample; to drop the rows of a deleted story send it with an empty "criteria" list/);
  assert.equal(rowsOf(root).length, before.length);
  const r = write(root, request([{ storyId: 'H1-HT-0002', criteria: [] }]));
  assert.equal(r.ok, true);
  assert.match(r.text, /remove H1-HT-0002: the story is no longer in the backlog, \d+ rows? dropped/);
  assert.deepEqual(rowsOf(root).map((x) => x.storyId), before.filter((x) => x.storyId !== 'H1-HT-0002').map((x) => x.storyId));
  // A story that is neither in the backlog nor in the file has nothing to drop, and says so.
  const none = write(root, request([{ storyId: 'H1-HT-9999', criteria: [] }]));
  assert.equal(none.ok, false);
  assert.match(none.errors.join('\n'), /H1-HT-9999 is not in the backlog sample and has no rows to drop/);
});

test('the same request twice is unchanged and leaves the file as it was', () => {
  const root = temp(false);
  const body = request([{ storyId: 'H1-HT-0001', criteria: [criterion(AC_1)] }]);
  write(root, body);
  const once = fs.readFileSync(indexPath(root));
  const r = write(root, body);
  assert.deepEqual([r.ok, r.changed], [true, false]);
  assert.match(r.text, /^Unchanged/);
  assert.deepEqual(fs.readFileSync(indexPath(root)), once);
});

test('a column the file does not know is kept on the rows that stay and on a rewritten row of the same text', () => {
  const root = temp();
  const text = fs.readFileSync(indexPath(root), 'utf8').replace(/\r?\n/g, '\n').split('\n').filter(Boolean);
  fs.writeFileSync(indexPath(root), [`${text[0]},Reviewer`, `${text[1]},Ana`, `${text[2]},Ben`, ''].join('\n'));
  write(root, request([{ storyId: 'H1-HT-0001', criteria: [criterion(AC_1, { artboards: ['streaks-list-new-desktop'] })] }]));
  assert.deepEqual(rowsOf(root).map((x) => x.extra.Reviewer), ['Ana', 'Ben']);
});

test('a request that breaks a rule is refused, names the problem and leaves the folder as it was (SHA-256 listing)', () => {
  const ok = [criterion(AC_1)];
  const cases = [
    ['an unknown story ID', request([{ storyId: 'H1-HT-9999', criteria: ok }]), /story H1-HT-9999 is not in the backlog sample/],
    ['a story named twice', request([{ storyId: 'H1-HT-0001', criteria: ok }, { storyId: 'H1-HT-0001', criteria: ok }]), /story H1-HT-0001 is named twice/],
    ['a duplicate criterion', request([{ storyId: 'H1-HT-0001', criteria: [criterion(AC_1), criterion(` ${AC_1} `)] }]), /criterion 2: repeats a criterion of H1-HT-0001/],
    ['a bad Kind', request([{ storyId: 'H1-HT-0001', criteria: [criterion(AC_1, { kind: 'happy' })] }]), /"kind" must be "main" or "failure"/],
    ['an empty criterion', request([{ storyId: 'H1-HT-0001', criteria: [criterion('  ')] }]), /"text" must not be empty/],
    ['a stem with the wrong viewport', request([{ storyId: 'H1-HT-0001', criteria: [criterion(AC_1, { artboards: ['streaks-list-default-mobile'] })] }], { viewports: ['desktop'] }), /streaks-list-default-mobile must end in one of the row's viewports \(desktop\)/],
    ['a stem that is not kebab-case', request([{ storyId: 'H1-HT-0001', criteria: [criterion(AC_1, { artboards: ['Streaks_List-desktop'] })] }]), /lowercase kebab-case/],
    ['a bad viewport', request([{ storyId: 'H1-HT-0001', criteria: ok }], { viewports: ['tablet'] }), /viewports must hold only desktop and mobile/],
    ['a canvas that is not an artifact link', request([{ storyId: 'H1-HT-0001', criteria: ok }], { canvas: 'https://example.com/artifact/abc' }), /canvas must be a claude\.ai artifact link/],
    ['an unknown top-level key', request([{ storyId: 'H1-HT-0001', criteria: ok }], { html: '<div/>' }), /html is not allowed/],
    ['no story', request([]), /stories must be a non-empty list/],
  ];
  for (const [label, body, pattern] of cases) {
    for (const fn of [write, check]) {
      const root = temp();
      const before = snapshot(root);
      const r = fn(root, body);
      assert.equal(r.ok, false, label);
      assert.match(r.errors.join('\n'), pattern, label);
      assert.deepEqual(snapshot(root), before, label);
    }
  }
});

test('one refused story stops the whole request: the valid story is not written either', () => {
  const root = temp(false);
  const before = snapshot(root);
  const r = write(root, request([{ storyId: 'H1-HT-0001', criteria: [criterion(AC_1)] }, { storyId: 'H1-HT-9999', criteria: [criterion(AC_1)] }]));
  assert.equal(r.ok, false);
  assert.deepEqual(snapshot(root), before);
});

test('an unreadable existing file is refused with its row and column named, and left alone', () => {
  const root = temp();
  const text = fs.readFileSync(indexPath(root), 'utf8').replace('main,', 'happy,');
  fs.writeFileSync(indexPath(root), text);
  const before = snapshot(root);
  const r = write(root, request([{ storyId: 'H1-HT-0001', criteria: [criterion(AC_1)] }]));
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /design-index\.csv cannot be read: row 2: column "Kind"/);
  assert.deepEqual(snapshot(root), before);
});

test('a request that is not JSON, and a missing backlog, are refused', () => {
  const root = temp();
  const bad = writeDesignIndex({ dataDir: root, name: 'sample', input: '{ nope' });
  assert.equal(bad.ok, false);
  assert.match(bad.errors[0], /not valid JSON/);
  const none = writeDesignIndex({ dataDir: root, name: 'nope', input: JSON.stringify(request([])) });
  assert.equal(none.ok, false);
  assert.match(none.errors[0], /There is no backlog nope/);
});

test('the command line writes, repeats, checks and refuses with the exit codes', () => {
  const root = temp(false);
  const call = (args, body) => spawnSync(process.execPath, [SCRIPT, ...args], { input: JSON.stringify(body), cwd: path.dirname(root), encoding: 'utf8' });
  const body = request([{ storyId: 'H1-HT-0001', criteria: [criterion(AC_1)] }]);
  const checked = call(['sample', '--check'], body);
  assert.equal(checked.status, 0);
  assert.equal(fs.existsSync(indexPath(root)), false);
  assert.equal(call(['sample'], body).status, 0);
  assert.equal(fs.existsSync(indexPath(root)), true);
  const again = call(['sample'], body);
  assert.equal(again.status, 0);
  assert.match(again.stdout, /Unchanged/);
  const refused = call(['sample'], request([{ storyId: 'H1-HT-9999', criteria: [] }]));
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /Nothing was written/);
  assert.equal(call([], {}).status, 2);
});
