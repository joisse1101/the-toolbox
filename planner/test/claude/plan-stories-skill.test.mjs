import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../claude/mcp/diagram-tools.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SKILL_DIR = path.join(ROOT, '.claude/skills/plan-stories');
const skill = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
const frontmatter = (text) => Object.fromEntries(/^---\n([\s\S]*?)\n---/.exec(text)[1].split('\n').map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]));
const allowed = frontmatter(skill)['allowed-tools'].split(/,\s*/);

test('the skill is named plan-stories and allows only tools that write nothing', () => {
  assert.equal(frontmatter(skill).name, 'plan-stories');
  assert.deepEqual(allowed.sort(), [
    'mcp__backlog-tools__read_context', 'mcp__backlog-tools__read_file', 'mcp__backlog-tools__search_stories',
    'mcp__diagram-tools__check_diagram', 'mcp__diagram-tools__read_diagrams', 'mcp__diagram-tools__repo_grep', 'mcp__diagram-tools__repo_read', 'mcp__diagram-tools__repo_tree',
  ]);
  assert.ok(!allowed.some((t) => /write_/.test(t)), 'a writer is pre-approved by the skill');
});

test('the tools the skill names exist on the servers, and the writer it calls is the diagram writer only', () => {
  const named = new Set(skill.match(/`(read_diagrams|check_diagram|write_diagram|repo_tree|repo_grep|repo_read|read_context|search_stories|read_file|write_[a-z_]+|suggest_[a-z_]+)`/g).map((s) => s.slice(1, -1)));
  const writers = [...named].filter((n) => /^(write|suggest)_/.test(n));
  assert.deepEqual(writers, ['write_diagram']);
  const server = createServer({ backlog: 'sample.csv', dataDir: path.join(ROOT, 'planner/test/sample-data') });
  const registered = Object.keys(server._registeredTools);
  for (const name of named) {
    if (['read_context', 'search_stories', 'read_file'].includes(name)) continue; // backlog-tools
    assert.ok(registered.includes(name), `${name} is not a tool of diagram-tools`);
  }
});

test('the write_diagram example is a call with every key the tool takes, and sends no source.json', () => {
  const [example] = [...skill.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1]));
  assert.deepEqual(Object.keys(example), ['backlog', 'slice', 'scope', 'stories', 'files']);
  assert.ok(example.files.every((f) => f.name !== 'source.json'));
  assert.ok(example.stories.every((s) => s.id && s.title));
});

test('the skill points at the conventions and does not restate their limits', () => {
  assert.match(skill, /diagram-conventions\.md/);
  assert.doesNotMatch(skill, /maxClasses|#E6F0FB|12 classes/);
});

test('the launcher loads the skill\'s settings: they exist, hold the hook and exclude the project and user rules', () => {
  const launcher = fs.readFileSync(path.join(ROOT, 'planner/claude/launchers/plan-stories.ps1'), 'utf8');
  assert.match(launcher, /\$skill = '\.claude\/skills\/plan-stories'/);
  assert.match(launcher, /--settings "\$skill\/locked-settings\.json"/);
  const settings = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'locked-settings.json'), 'utf8'));
  assert.deepEqual(settings.claudeMdExcludes, ['**/CLAUDE.md', '**/.claude/rules/**']);
  assert.deepEqual(settings.hooks.UserPromptSubmit.flatMap((g) => g.hooks.map((h) => h.command)), ['node planner/claude/mcp/wait-for-backlog-tools.mjs']);
  assert.deepEqual(Object.keys(settings.hooks), ['UserPromptSubmit']);
});
