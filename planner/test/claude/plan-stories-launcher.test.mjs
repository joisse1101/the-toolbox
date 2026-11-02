import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tempConfig } from '../helpers/temp-config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const LAUNCHER = path.join(ROOT, 'planner/claude/launchers/plan-stories.ps1');
const SAMPLE = path.join(ROOT, 'planner/test/sample-data');
const launcher = fs.readFileSync(LAUNCHER, 'utf8');

test('the launcher gives the session no Bash, Read or Grep, only the two servers, and pre-approves the readers and checks (check_drafts included) but no writer', () => {
  assert.match(launcher, /--tools "Skill,AskUserQuestion" `/);
  assert.match(launcher, /--strict-mcp-config/);
  assert.match(launcher, /--permission-mode default/);
  assert.match(launcher, /New-PlanStoriesConfig \$root \$file/);
  const approved = launcher.match(/--allowedTools (.*) `/)[1].match(/mcp__[a-z-]+__[a-z_]+/g);
  assert.deepEqual(approved.sort(), [
    'mcp__backlog-tools__check_drafts', 'mcp__backlog-tools__read_context', 'mcp__backlog-tools__read_file', 'mcp__backlog-tools__search_stories',
    'mcp__diagram-tools__check_context_map', 'mcp__diagram-tools__check_diagram', 'mcp__diagram-tools__read_context_map', 'mcp__diagram-tools__read_diagrams', 'mcp__diagram-tools__repo_grep', 'mcp__diagram-tools__repo_read', 'mcp__diagram-tools__repo_tree',
  ]);
  assert.doesNotMatch(launcher, /--allowedTools .*write_(diagram|context_map|proposals|lexicon|review)/);
  assert.doesNotMatch(launcher, /--allowedTools .*suggest_lexicon_change/);
});

// The refusals happen before Claude starts, so they can run here; Windows PowerShell is how the launchers are run.
const run = (args) => spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', LAUNCHER, ...args], {
  encoding: 'utf8', input: '', env: { ...process.env, PLANNER_CONFIG: tempConfig(SAMPLE) },
});

test('the launcher refuses an unknown backlog, an empty scope, a story ID not in the backlog and a -Repo that is not a folder', { skip: process.platform !== 'win32' }, () => {
  const cases = [
    [['-Backlog', 'nope', '-Scope', 'x'], /No backlog 'nope\.csv'.*Found: sample\.csv/],
    [['-Backlog', 'sample', '-Scope', ' '], /No scope given/],
    [['-Backlog', 'sample', '-Scope', 'IAM-9999'], /IAM-9999 is not in planner\/data\/backlogs\/sample\.csv/],
    [['-Backlog', 'sample', '-Scope', 'x', '-Repo', path.join(SAMPLE, 'no-such-folder')], /is not an existing folder/],
  ];
  for (const [args, message] of cases) {
    const r = run(args);
    assert.equal(r.status, 1, args.join(' '));
    assert.match(r.stdout + r.stderr, message);
  }
});

// All three launchers take the data folder from paths.cjs. `claude` on the PATH is replaced by a stub that only prints a marker.
const LAUNCHERS = [
  ['explore-stories.ps1', ['-Backlog', 'sample']],
  ['shape-stories.ps1', ['-Backlog', 'sample', '-Story', 'a new keyboard']],
  ['plan-stories.ps1', ['-Backlog', 'sample', '-Scope', 'x']],
];
function runWithStub(name, args, config) {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-stub-'));
  fs.writeFileSync(path.join(bin, 'claude.cmd'), '@echo CLAUDE-STARTED\r\n');
  return spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'planner/claude/launchers', name), ...args], {
    encoding: 'utf8', input: '', env: { ...process.env, PLANNER_CONFIG: config, PATH: bin + path.delimiter + process.env.PATH },
  });
}

test('each launcher prints the configured data folder and starts Claude', { skip: process.platform !== 'win32' }, () => {
  for (const [name, args] of LAUNCHERS) {
    const r = runWithStub(name, args, tempConfig(SAMPLE));
    assert.equal(r.status, 0, name + r.stdout + r.stderr);
    assert.ok(r.stdout.includes('Data folder: ' + path.resolve(SAMPLE)), name + r.stdout);
    assert.match(r.stdout, /CLAUDE-STARTED/, name);
  }
});

test('each launcher stops with the config message on a bad config, without starting Claude', { skip: process.platform !== 'win32' }, () => {
  const bad = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'planner-badconfig-')), 'planner.config.yaml');
  fs.writeFileSync(bad, 'dataDri: x\n');
  for (const [name, args] of LAUNCHERS) {
    const r = runWithStub(name, args, bad);
    assert.equal(r.status, 1, name);
    assert.match(r.stdout + r.stderr, /dataDri/, name);
    assert.doesNotMatch(r.stdout, /CLAUDE-STARTED|Data folder/, name);
  }
});
