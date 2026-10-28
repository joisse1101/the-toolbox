import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SERVER = path.join(ROOT, 'planner/claude/mcp/backlog-tools.mjs');
const HOOK = path.join(ROOT, 'planner/claude/mcp/wait-for-backlog-tools.mjs');

function temp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tools-ready-'));
  fs.mkdirSync(path.join(dir, 'backlogs'));
  return dir;
}

// Runs the UserPromptSubmit hook; resolves with its stdout and how long it held the prompt.
function runHook(env) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(process.execPath, [HOOK], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, out, ms: Date.now() - started }));
  });
}

test('the ready file appears only once the tool list has been sent, not at the handshake', async () => {
  const dir = temp();
  const readyFile = path.join(dir, 'backlog-tools.ready');
  const client = new Client({ name: 'test', version: '0' });
  try {
    await client.connect(new StdioClientTransport({
      command: process.execPath, args: [SERVER], env: { ...process.env, PLANNER_DATA_DIR: dir, PLANNER_MCP_READY_FILE: readyFile }, stderr: 'ignore',
    }));
    // connect() has completed the initialize handshake: a prompt released now would still find no tools.
    await new Promise((r) => setTimeout(r, 600));
    assert.equal(fs.existsSync(readyFile), false, 'ready before the client has the tools');
    await client.listTools();
    assert.equal(fs.existsSync(readyFile), true, 'not ready after the tool list was sent');
  } finally {
    await client.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('without PLANNER_MCP_READY_FILE the server writes nothing and still lists its tools', async () => {
  const dir = temp();
  const env = { ...process.env, PLANNER_DATA_DIR: dir };
  delete env.PLANNER_MCP_READY_FILE;
  const client = new Client({ name: 'test', version: '0' });
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER], env, stderr: 'ignore' }));
    assert.equal((await client.listTools()).tools.length, 8);
  } finally {
    await client.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the hook holds the prompt while the server is starting and releases it after the tools are listed', async () => {
  const dir = temp();
  const readyFile = path.join(dir, 'backlog-tools.ready');
  const env = { PLANNER_DATA_DIR: dir, PLANNER_MCP_READY_FILE: readyFile };
  let released = false;
  const hook = runHook({ ...env, PLANNER_MCP_WAIT_MS: '20000' }).then((r) => { released = true; return r; });
  const client = new Client({ name: 'test', version: '0' });
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER], env: { ...process.env, ...env }, stderr: 'ignore' }));
    await new Promise((r) => setTimeout(r, 600));
    assert.equal(released, false, 'the hook let the prompt through at the handshake');
    await client.listTools();
    const result = await hook;
    assert.equal(result.code, 0);
    assert.equal(result.out, '', 'a connected server prints no warning');
  } finally {
    await client.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the hook tells Claude when the server never connects, and does nothing outside a launcher session', async () => {
  const dir = temp();
  try {
    const late = await runHook({ PLANNER_MCP_READY_FILE: path.join(dir, 'never.ready'), PLANNER_MCP_WAIT_MS: '300' });
    assert.equal(late.code, 0);
    assert.match(late.out, /did not finish connecting/);
    assert.match(late.out, /MCP server did not/);
    const env = { ...process.env };
    delete env.PLANNER_MCP_READY_FILE;
    const plain = await new Promise((resolve) => {
      const child = spawn(process.execPath, [HOOK], { env, stdio: ['ignore', 'pipe', 'inherit'] });
      let out = '';
      child.stdout.on('data', (d) => { out += d; });
      child.on('close', (code) => resolve({ code, out }));
    });
    assert.deepEqual(plain, { code: 0, out: '' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('PLANNER_MCP_READY_FILES: the hook waits for every file, and names how many servers are missing on a timeout', async () => {
  const dir = temp();
  try {
    const a = path.join(dir, 'a.ready');
    const b = path.join(dir, 'b.ready');
    const files = [a, b].join(path.delimiter);
    fs.writeFileSync(a, 'ready');
    const partial = await runHook({ PLANNER_MCP_READY_FILES: files, PLANNER_MCP_WAIT_MS: '300' });
    assert.match(partial.out, /1 of the 2 MCP servers did not finish connecting/);
    let released = false;
    const hook = runHook({ PLANNER_MCP_READY_FILES: files, PLANNER_MCP_WAIT_MS: '20000' }).then((r) => { released = true; return r; });
    await new Promise((r) => setTimeout(r, 700));
    assert.equal(released, false, 'released with one server still missing');
    fs.writeFileSync(b, 'ready');
    const done = await hook;
    assert.deepEqual([done.code, done.out], [0, '']);
    fs.rmSync(a);
    fs.rmSync(b);
    assert.match((await runHook({ PLANNER_MCP_READY_FILES: files, PLANNER_MCP_WAIT_MS: '300' })).out, /2 of the 2 MCP servers did not/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the story launchers are wired to the hook: settings name an existing script, and each launcher builds the config it relies on', () => {
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude/skills/propose-stories/locked-settings.json'), 'utf8'));
  const commands = settings.hooks.UserPromptSubmit.flatMap((g) => g.hooks.map((h) => h.command));
  assert.deepEqual(commands, ['node planner/claude/mcp/wait-for-backlog-tools.mjs']);
  assert.ok(fs.existsSync(HOOK));
  // The sessions read the two files with read_file, so no hook guards Read and Grep any more.
  for (const skill of ['explore-stories', 'propose-stories']) {
    const s = JSON.parse(fs.readFileSync(path.join(ROOT, `.claude/skills/${skill}/locked-settings.json`), 'utf8'));
    assert.deepEqual(Object.keys(s.hooks), ['UserPromptSubmit'], skill);
  }
  assert.ok(!fs.existsSync(path.join(ROOT, 'planner/claude/mcp/guard-read.mjs')));

  const config = fs.readFileSync(path.join(ROOT, 'planner/claude/launchers/backlog-tools-config.ps1'), 'utf8');
  assert.match(config, /function New-BacklogToolsConfig/);
  assert.match(config, /planner\/claude\/mcp\/backlog-tools\.mjs/);
  assert.match(config, /PLANNER_MCP_READY_FILE/);
  for (const name of ['shape-stories.ps1', 'explore-stories.ps1']) {
    const launcher = fs.readFileSync(path.join(ROOT, 'planner/claude/launchers', name), 'utf8');
    assert.match(launcher, /backlog-tools-config\.ps1/, `${name} loads the config helper`);
    assert.match(launcher, /New-BacklogToolsConfig \$root/, `${name} writes the MCP config`);
    assert.match(launcher, /--strict-mcp-config/, `${name} uses only that config`);
    assert.match(launcher, /locked-settings\.json/, `${name} loads the settings that carry the hook`);
    assert.match(launcher, /--tools "Skill,AskUserQuestion" `/, `${name} gives the session neither Read nor Grep`);
    assert.doesNotMatch(launcher, /guard-read|Confirm-ReadLimit|Test-ReadGuard|Get-ReadFiles|append-system-prompt/, `${name} has no read gate left`);
  }
  // The plan-stories session has two servers: each its own ready file, all listed for the hook.
  assert.match(config, /function New-PlanStoriesConfig/);
  assert.match(config, /planner\/claude\/mcp\/diagram-tools\.mjs/);
  assert.match(config, /PLANNER_MCP_READY_FILES/);
  assert.doesNotMatch(config, /Confirm-ReadLimit|Test-ReadGuard|Get-ReadFiles/);
});
