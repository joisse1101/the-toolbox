import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// "The slice is reduced to its record": remove-working-files.mjs deletes only the five working files, only when the slice
// holds ARCHIVED.md, says which are tracked by git, keeps every other file and deletes nothing with --check.
// Each test works on a temp copy of the habits fixture, kept under .scratch/ and made a git repository of its own.
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SCRIPT = path.join(REPO, 'toolkit', 'skills', 'jois-story-plan', 'remove-working-files.mjs');
const FIXTURE = path.join(REPO, 'toolkit', 'tests', 'story', 'fixtures', 'habits');
const scratch = path.join(REPO, '.scratch');
fs.mkdirSync(scratch, { recursive: true });

const WORKING = ['UC-streaks.md', 'tasks.md', 'review.md', 'validation.md', 'validation.partial.md'];

// A project folder with .plans/habits/ copied from the fixture, a config naming it, and the slice's extra files.
function project({ archived = true, extra = [] } = {}) {
  const root = fs.mkdtempSync(path.join(scratch, 'remove-working-files-'));
  const dataDir = path.join(root, '.plans');
  fs.cpSync(FIXTURE, path.join(dataDir, 'habits'), { recursive: true });
  const sliceDir = path.join(dataDir, 'habits', 'slices', 'streaks');
  const config = path.join(root, 'planner.config.yaml');
  fs.writeFileSync(config, `dataDir: ${JSON.stringify(dataDir)}\n`);
  for (const name of ['review.md', 'validation.md', 'validation.partial.md', ...extra]) fs.writeFileSync(path.join(sliceDir, name), `${name}\n`);
  if (archived) fs.writeFileSync(path.join(sliceDir, 'ARCHIVED.md'), '# Archived: habits/streaks\n');
  return { root, sliceDir, config };
}

const run = (p, args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: p.root, encoding: 'utf8', env: { ...process.env, PLANNER_CONFIG: p.config } });
const git = (p, args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: p.root, encoding: 'utf8' });
const names = (p) => fs.readdirSync(p.sliceDir).sort();
const cleanup = (p) => fs.rmSync(p.root, { recursive: true });

test('it refuses a slice with no ARCHIVED.md and deletes nothing', () => {
  const p = project({ archived: false });
  try {
    const before = names(p);
    const result = run(p, ['habits', 'streaks']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /holds no ARCHIVED\.md/);
    assert.equal(result.stdout, '');
    assert.deepEqual(names(p), before);
  } finally {
    cleanup(p);
  }
});

test('it deletes the five working files of an untracked slice and keeps ARCHIVED.md and source.json', () => {
  const p = project();
  try {
    const result = run(p, ['habits', 'streaks']);
    assert.equal(result.status, 0, result.stderr);
    for (const name of WORKING) assert.match(result.stdout, new RegExp(`^deleted: ${name.replace('.', '\\.')} \\(untracked\\)$`, 'm'));
    assert.deepEqual(names(p), ['ARCHIVED.md', 'source.json']);
  } finally {
    cleanup(p);
  }
});

test('--check prints the same list and deletes nothing', () => {
  const p = project();
  try {
    const before = names(p);
    const result = run(p, ['habits', 'streaks', '--check']);
    assert.equal(result.status, 0, result.stderr);
    for (const name of WORKING) assert.ok(result.stdout.includes(`would delete: ${name} (untracked)`), result.stdout);
    assert.doesNotMatch(result.stdout, /^deleted:/m);
    assert.deepEqual(names(p), before);
  } finally {
    cleanup(p);
  }
});

test('it marks a file tracked when git lists it and untracked when it does not', () => {
  const p = project();
  try {
    assert.equal(git(p, ['init', '-q']).status, 0);
    assert.equal(git(p, ['add', '-f', '--', '.plans/habits/slices/streaks/tasks.md', '.plans/habits/slices/streaks/UC-streaks.md']).status, 0);
    assert.equal(git(p, ['commit', '-q', '-m', 'plan']).status, 0);
    const result = run(p, ['habits', 'streaks']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^deleted: tasks\.md \(tracked\)$/m);
    assert.match(result.stdout, /^deleted: UC-streaks\.md \(tracked\)$/m);
    assert.match(result.stdout, /^deleted: review\.md \(untracked\)$/m);
    assert.match(result.stdout, /^deleted: validation\.md \(untracked\)$/m);
    assert.deepEqual(names(p), ['ARCHIVED.md', 'source.json']);
  } finally {
    cleanup(p);
  }
});

test('it names and keeps a file that is not a working file', () => {
  const p = project({ extra: ['notes.md'] });
  try {
    const result = run(p, ['habits', 'streaks']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^kept: notes\.md \(not a working file\)$/m);
    assert.deepEqual(names(p), ['ARCHIVED.md', 'notes.md', 'source.json']);
  } finally {
    cleanup(p);
  }
});

test('it deletes nothing from a reduced slice and still succeeds', () => {
  const p = project();
  try {
    assert.equal(run(p, ['habits', 'streaks']).status, 0);
    const again = run(p, ['habits', 'streaks']);
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /no working files present/);
    assert.deepEqual(names(p), ['ARCHIVED.md', 'source.json']);
  } finally {
    cleanup(p);
  }
});

test('it refuses a slice name that is not a slug and a wrong argument count', () => {
  const p = project();
  try {
    const bad = run(p, ['habits', '../streaks']);
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /lowercase slug/);
    const usage = run(p, ['habits']);
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /Usage:/);
  } finally {
    cleanup(p);
  }
});
