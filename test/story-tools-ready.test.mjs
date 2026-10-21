import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = path.join(ROOT, 'ai/mcp/story-tools.mjs');
const HOOK = path.join(ROOT, 'ai/mcp/wait-for-story-tools.mjs');

function temp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tools-ready-'));
  fs.mkdirSync(path.join(dir, 'user-stories'));
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
  const readyFile = path.join(dir, 'story-tools.ready');
  const client = new Client({ name: 'test', version: '0' });
  try {
    await client.connect(new StdioClientTransport({
      command: process.execPath, args: [SERVER], env: { ...process.env, TLT_DATA_DIR: dir, TLT_MCP_READY_FILE: readyFile }, stderr: 'ignore',
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

test('without TLT_MCP_READY_FILE the server writes nothing and still lists its tools', async () => {
  const dir = temp();
  const env = { ...process.env, TLT_DATA_DIR: dir };
  delete env.TLT_MCP_READY_FILE;
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
  const readyFile = path.join(dir, 'story-tools.ready');
  const env = { TLT_DATA_DIR: dir, TLT_MCP_READY_FILE: readyFile };
  let released = false;
  const hook = runHook({ ...env, TLT_MCP_WAIT_MS: '20000' }).then((r) => { released = true; return r; });
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
    const late = await runHook({ TLT_MCP_READY_FILE: path.join(dir, 'never.ready'), TLT_MCP_WAIT_MS: '300' });
    assert.equal(late.code, 0);
    assert.match(late.out, /did not finish connecting/);
    const env = { ...process.env };
    delete env.TLT_MCP_READY_FILE;
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

test('the story launchers are wired to the hook: settings name an existing script, and each launcher builds the config it relies on', () => {
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude/skills/propose-stories/locked-settings.json'), 'utf8'));
  const commands = settings.hooks.UserPromptSubmit.flatMap((g) => g.hooks.map((h) => h.command));
  assert.deepEqual(commands, ['node ai/mcp/wait-for-story-tools.mjs']);
  assert.ok(fs.existsSync(HOOK));
  // Both sessions guard Read and Grep with the same hook.
  for (const skill of ['explore-stories', 'propose-stories']) {
    const s = JSON.parse(fs.readFileSync(path.join(ROOT, `.claude/skills/${skill}/locked-settings.json`), 'utf8'));
    assert.deepEqual(s.hooks.PreToolUse.map((g) => [g.matcher, g.hooks.map((h) => h.command)]), [['Read|Grep', ['node ai/mcp/guard-read.mjs']]], skill);
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'ai/mcp/guard-read.mjs')));

  const config = fs.readFileSync(path.join(ROOT, 'ai/launchers/story-tools-config.ps1'), 'utf8');
  assert.match(config, /function New-StoryToolsConfig/);
  assert.match(config, /ai\/mcp\/story-tools\.mjs/);
  assert.match(config, /TLT_MCP_READY_FILE/);
  for (const name of ['shape-stories.ps1', 'explore-stories.ps1']) {
    const launcher = fs.readFileSync(path.join(ROOT, 'ai/launchers', name), 'utf8');
    assert.match(launcher, /story-tools-config\.ps1/, `${name} loads the config helper`);
    assert.match(launcher, /New-StoryToolsConfig \$root/, `${name} writes the MCP config`);
    assert.match(launcher, /--strict-mcp-config/, `${name} uses only that config`);
    assert.match(launcher, /locked-settings\.json/, `${name} loads the settings that carry the hook`);
    assert.match(launcher, /--tools "Skill,AskUserQuestion,Read,Grep"/, `${name} gives the session Read and Grep`);
    // The user sees the two files and presses Enter before Claude starts; the guard is checked first and the variable is cleared after.
    const at = (s) => launcher.indexOf(s);
    assert.ok(at('Confirm-ReadLimit') > 0 && at('Confirm-ReadLimit') < at('Test-ReadGuard') && at('Test-ReadGuard') < at('claude '), `${name} confirms, tests the guard, then starts Claude`);
    assert.match(launcher, /Remove-Item Env:\\TLT_READ_ALLOW/, `${name} clears TLT_READ_ALLOW`);
  }
});
