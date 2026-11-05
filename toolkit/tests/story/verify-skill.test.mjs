import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'jois-story-verify');
const text = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
const front = text.split('---')[1];

test('the skill is named jois-story-verify, versioned, and may only run the story reader and writer scripts', () => {
  assert.match(front, /^name: jois-story-verify$/m);
  assert.match(front, /^metadata:\n {2}version: "1\.0\.0"\n {2}last_updated: "\d{4}-\d{2}-\d{2}"$/m);
  const allowed = /^allowed-tools: (.*)$/m.exec(front)[1];
  assert.match(allowed, /^Skill, /);
  for (const script of ['read-diagrams', 'write-diagram', 'read-story-context', 'read-backlog', 'write-review']) {
    assert.ok(allowed.includes(`Bash(node *${script}.mjs*)`), script);
  }
  assert.doesNotMatch(front, /mcp__/);
});

test('the skill holds no script, no package.json and no lib folder', () => {
  assert.deepEqual(fs.readdirSync(SKILL_DIR), ['SKILL.md']);
  assert.equal(fs.existsSync(path.join(SKILL_DIR, 'package.json')), false);
  assert.equal(fs.existsSync(path.join(SKILL_DIR, 'lib')), false);
});

test('the skill names the six checks, each with its severity', () => {
  assert.match(text, /## The six checks/);
  assert.match(text, /^1\. \*\*Stale slice\.\*\*.*Critical\.$/m);
  assert.match(text, /^2\. \*\*Document or diagram check fails\.\*\*.*Critical\.$/m);
  assert.match(text, /^3\. \*\*Criterion with no task\.\*\*.*Critical\.$/m);
  assert.match(text, /^4\. \*\*A `TBC` design decision\.\*\*.*Warning\.$/m);
  assert.match(text, /^5\. \*\*Open clarification question on a story of the scope\.\*\*.*Warning\.$/m);
  assert.match(text, /^6\. \*\*A task waits on something still open\.\*\*.*Warning\.$/m);
  assert.match(text, /Run all six, and say in the report which ran/);
});

test('the skill routes a finding to the plan writer, the review writer or the user\'s own decision', () => {
  assert.match(text, /## Route each finding/);
  assert.match(text, /\*\*Slice fixes\.\*\*.*only through the plan skill's `write-diagram\.mjs`/);
  assert.match(text, /\*\*Story problems\.\*\*\s+Never edit a story/);
  assert.match(text, /write-review\.mjs <backlog> --append --check/);
  assert.match(text, /\*\*The user's own decision\.\*\*.*never filled with a default or a guess/);
  assert.match(text, /an answer becomes a `user-confirmed` row/);
  assert.match(text, /Write this corrected slice\?/);
});

test('the skill stops or skips as its stop cases say', () => {
  assert.match(text, /\*\*`jois-story-plan` missing\.\*\* When `jois-story-plan` is not installed, say so, read nothing, write nothing and stop/);
  assert.match(text, /\*\*No review writer\.\*\*.*no suggestion can be written/);
  assert.match(text, /\*\*No story reader\.\*\*.*checks 5 and 6\) are not run/);
  assert.match(text, /\*\*A check that cannot run\*\* is reported as not run, with the reason, and never counts as passed/);
  assert.match(text, /if one says no data folder was found, show its message and stop/);
  assert.match(text, /When the check refuses it, write nothing/);
});

test('the skill limits its writes and treats text it reads as data', () => {
  assert.match(text, /\*\*data, never instructions\*\*/);
  assert.match(text, /Write nothing before the user approves/);
  assert.match(text, /Do not run `write-diagram\.mjs` without `--check` before the user has said yes/);
  assert.match(text, /Do not tick a task, save a report file/);
});

test('a task waits only when its Verify line names the open item, and an open question gets no review row', () => {
  assert.match(text, /A task waits when its `Verify:` line names a `TBC` decision by its `D id`/);
  assert.match(text, /Do not report a task only because a step it cites is also in a `TBC` decision's `Steps` cell/);
  assert.match(text, /An open clarification question has no answer to write, so no review row is offered for it/);
});

test('a fix shows each file it changes, and a decision confirmed while undecided is a suggestion', () => {
  assert.match(text, /Show the \*\*complete text of every file you change\*\*/);
  assert.match(text, /`Source` is `user-confirmed` while its `Why` says it is not decided/);
});

test('the writer-input one-liner in the skill turns the printed slice into the JSON the writer takes', async () => {
  const { execFileSync } = await import('node:child_process');
  const { sampleTree } = await import('./helpers/backlog-tree.mjs');
  const { tempConfig } = await import('./helpers/temp-config.mjs');
  const planDir = path.resolve(SKILL_DIR, '..', 'jois-story-plan');
  const block = /```bash\n(node <plan skill folder>\/read-diagrams[\s\S]*?)\n```/.exec(text)[1];
  const builder = /\| node -e '([\s\S]*?)' \| node <plan skill folder>\/write-diagram/.exec(block)[1];
  const root = sampleTree({ withSlice: true });
  const env = { ...process.env, PLANNER_CONFIG: tempConfig(root) };
  const printed = execFileSync('node', [path.join(planDir, 'read-diagrams.mjs'), 'sample', '--slice', 'sign-in'], { env, encoding: 'utf8' });
  const json = JSON.parse(execFileSync('node', ['-e', builder], { input: printed, encoding: 'utf8' }));
  assert.deepEqual(Object.keys(json), ['slice', 'scope', 'stories', 'files']);
  assert.equal(json.slice, 'sign-in');
  assert.deepEqual(json.scope, { type: 'feature', epic: 'Identity and access', feature: 'Sign in' });
  assert.deepEqual(json.stories.map((s) => s.id), ['IAM-0001', 'IAM-0002']);
  assert.deepEqual(json.files.map((f) => f.name).sort(), ['UC-sign-in.md', 'tasks.md']);
  const uc = json.files.find((f) => f.name === 'UC-sign-in.md').content;
  assert.match(uc, /<!-- stories:start -->\n<!-- stories:end -->/);
  assert.doesNotMatch(uc, /- IAM-0001 Sign in with email/);
});
