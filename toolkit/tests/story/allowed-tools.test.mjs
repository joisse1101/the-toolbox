import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Every command a skill or a command tells a session to run must match its own `allowed-tools`, or the session
// is stopped by a permission prompt nobody sees. A pattern such as `Bash(node *read-backlog.mjs*)` matches a
// command that starts with `node`; `*` stands for any text.

const TOOLKIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILLS = ['jois-story-explore', 'jois-story-propose', 'jois-story-review', 'jois-story-plan'];
const COMMANDS = ['propose', 're-read', 'review'];

const FILES = [
  ...SKILLS.map((s) => ({ label: `skill ${s}`, file: path.join(TOOLKIT, 'skills', s, 'SKILL.md') })),
  ...COMMANDS.map((c) => ({ label: `command ${c}`, file: path.join(TOOLKIT, 'commands', 'jois-story', `${c}.md`) })),
];

function parse(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const [, front, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  const allowed = /^allowed-tools: (.*)$/m.exec(front)[1];
  const patterns = [...allowed.matchAll(/Bash\(([^)]*)\)/g)].map((m) => m[1]);
  return { front, body, patterns };
}

// The `node ...` command lines a text documents: lines of fenced blocks and inline code spans that start with `node`
// and name a script (`.mjs`). A span that only describes the form (`node <skill folder>/<script>`) names no script and is skipped.
function documentedCommands(body) {
  const found = [];
  const unfenced = body.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, block) => {
    for (const line of block.split('\n')) if (/^node /.test(line)) found.push(line);
    return '';
  });
  for (const m of unfenced.matchAll(/`([^`\n]+)`/g)) if (/^node /.test(m[1])) found.push(m[1]);
  return found.filter((c) => c.includes('.mjs'));
}

const matches = (pattern, command) => {
  const re = new RegExp(`^${pattern.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  return re.test(command);
};

for (const { label, file } of FILES) {
  test(`${label}: every documented node command matches its allowed-tools`, () => {
    const { body, patterns } = parse(file);
    const commands = documentedCommands(body);
    assert.ok(patterns.length > 0, 'has Bash patterns');
    if (label.startsWith('skill')) assert.ok(commands.length > 0, 'documents at least one command');
    for (const command of commands) {
      assert.ok(patterns.some((p) => matches(p, command)), `no allowed-tools pattern matches: ${command}`);
    }
  });

  test(`${label}: no text tells the session to put PLANNER_CONFIG= in front of a command`, () => {
    const { body } = parse(file);
    assert.doesNotMatch(body, /PLANNER_CONFIG=/);
    assert.doesNotMatch(body, /in front/);
  });
}

test('explore and propose may read files with Read, Grep and Glob, and explore holds no tool that writes', () => {
  const tools = (skill) => /^allowed-tools: (.*)$/m.exec(parse(path.join(TOOLKIT, 'skills', skill, 'SKILL.md')).front)[1].split(/,\s*/);
  for (const skill of ['jois-story-explore', 'jois-story-propose']) {
    const list = tools(skill);
    for (const tool of ['Read', 'Grep', 'Glob']) assert.ok(list.includes(tool), `${skill} allows ${tool}`);
    assert.ok(!list.some((t) => t.startsWith('mcp__')), `${skill} holds no MCP tool`);
  }
  const explore = tools('jois-story-explore');
  assert.deepEqual(explore, ['Bash(node *read-story-context.mjs*)', 'Read', 'Grep', 'Glob']);
  assert.ok(!explore.some((t) => /^(Write|Edit|MultiEdit|NotebookEdit)$/.test(t) || /write-|init-plans/.test(t)), 'explore holds no tool that writes');
});

test('the matcher refuses a command that starts with the variable', () => {
  assert.equal(matches('node *read-backlog.mjs*', 'node /x/read-backlog.mjs sample'), true);
  assert.equal(matches('node *read-backlog.mjs*', 'PLANNER_CONFIG=/c.yaml node /x/read-backlog.mjs sample'), false);
});
