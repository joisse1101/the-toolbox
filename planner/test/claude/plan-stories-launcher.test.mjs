import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
  encoding: 'utf8', input: '', env: { ...process.env, PLANNER_DATA_DIR: SAMPLE },
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
