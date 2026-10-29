import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { DESCRIPTIONS } from '../../claude/mcp/diagram-tools.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(HERE, '../../claude/mcp/diagram-tools.mjs');
const SAMPLE = path.resolve(HERE, '../sample-data');
const SCOPE = { type: 'feature', epic: 'Identity and access', feature: 'Sign in' };
const STORIES = [{ id: 'IAM-0001', title: 'Sign in with email' }, { id: 'IAM-0002', title: 'Reset a password' }];

// A temp data folder holding the sample backlog and slice, and the sample repo that repo.json points at (outside diagrams/, so it is not a slice).
function temp({ repoJson } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-tools-test-'));
  fs.cpSync(path.join(SAMPLE, 'backlogs'), path.join(root, 'backlogs'), { recursive: true });
  fs.cpSync(path.join(SAMPLE, 'diagrams'), path.join(root, 'diagrams'), { recursive: true });
  fs.cpSync(path.join(SAMPLE, 'repos'), path.join(root, 'repos'), { recursive: true });
  if (repoJson !== undefined) fs.writeFileSync(path.join(root, 'diagrams', 'sample', 'repo.json'), repoJson);
  return root;
}

async function connect(root, args = []) {
  const client = new Client({ name: 'test', version: '0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER, ...args], env: { ...process.env, PLANNER_DATA_DIR: root }, stderr: 'ignore' }));
  return client;
}
const call = (client, name, args) => client.callTool({ name, arguments: args });
const textOf = (r) => r.content.map((c) => c.text).join('\n');
const sliceFiles = (root) => {
  const dir = path.join(root, 'diagrams', 'sample', 'sign-in');
  return fs.readdirSync(dir).filter((f) => f !== 'source.json').map((name) => ({ name, content: fs.readFileSync(path.join(dir, name), 'utf8') }));
};
const sliceArgs = (root, over = {}) => ({ backlog: 'sample.csv', slice: 'sign-in', scope: SCOPE, stories: STORIES, files: sliceFiles(root), ...over });

test('tool list: three diagram tools without a repo, six with one; only the writer is not read-only', async () => {
  const root = temp();
  const without = await connect(root);
  const withRepo = await connect(root, ['--backlog', 'sample.csv']);
  try {
    assert.deepEqual((await without.listTools()).tools.map((t) => t.name).sort(), ['check_diagram', 'read_diagrams', 'write_diagram']);
    const tools = (await withRepo.listTools()).tools;
    assert.deepEqual(tools.map((t) => t.name).sort(), ['check_diagram', 'read_diagrams', 'repo_grep', 'repo_read', 'repo_tree', 'write_diagram']);
    for (const t of tools) assert.equal(!!t.annotations?.readOnlyHint, t.name !== 'write_diagram', t.name);
    for (const t of tools) assert.equal(t.description, DESCRIPTIONS[t.name], `${t.name} carries its rules`);
  } finally {
    await without.close();
    await withRepo.close();
  }
});

test('the repo tools label what they return as data from the repo, the diagram tools as data from the diagrams folder', async () => {
  assert.match(DESCRIPTIONS.read_diagrams, /data from the diagrams folder/);
  for (const name of ['repo_tree', 'repo_grep', 'repo_read']) {
    assert.match(DESCRIPTIONS[name], /data from the repo/, name);
    assert.doesNotMatch(DESCRIPTIONS[name], /diagrams folder/, name);
  }
});

test('no repo tools when repo.json is missing, has a bad key or points at no folder, and read_diagrams says why', async () => {
  for (const [repoJson, why] of [['{ "path": "" }', /No repo is configured/], ['{ "path": "../../repos/sample", "exclude": "x" }', /"exclude" must be a list/], ['{ "path": "./missing" }', /"path" is not a folder/]]) {
    const client = await connect(temp({ repoJson }), ['--backlog', 'sample.csv']);
    try {
      assert.deepEqual((await client.listTools()).tools.map((t) => t.name).sort(), ['check_diagram', 'read_diagrams', 'write_diagram']);
      assert.match(textOf(await call(client, 'read_diagrams', { backlog: 'sample.csv' })), why);
    } finally {
      await client.close();
    }
  }
});

test('read_diagrams: the slices, one slice with its files, the conventions, bad input', async () => {
  const client = await connect(temp());
  try {
    const list = textOf(await call(client, 'read_diagrams', { backlog: 'sample.csv' }));
    assert.match(list, /1 slice ===/, 'the repo folder is not a slice');
    assert.match(list, /sign-in \| Feature: Identity and access > Sign in \| 2 stories \| up to date/);
    const one = textOf(await call(client, 'read_diagrams', { backlog: 'sample.csv', slice: 'sign-in' }));
    assert.match(one, /--- UC-sign-in\.md ---/);
    assert.match(one, /## Class diagram/);
    assert.match(textOf(await call(client, 'read_diagrams', { backlog: 'sample.csv', section: 'conventions' })), /^# Diagram conventions/);
    const both = await call(client, 'read_diagrams', { backlog: 'sample.csv', section: 'conventions', slice: 'sign-in' });
    assert.equal(both.isError, true);
    assert.equal((await call(client, 'read_diagrams', { backlog: 'sample.csv', slice: 'nope' })).isError, true);
  } finally {
    await client.close();
  }
});

test('check_diagram writes nothing; write_diagram of the same files changes nothing; a bad diagram writes nothing', async () => {
  const root = temp();
  const client = await connect(root);
  const dir = path.join(root, 'diagrams', 'sample');
  try {
    const before = fs.readdirSync(path.join(dir, 'sign-in')).sort();
    assert.match(textOf(await call(client, 'check_diagram', sliceArgs(root))), /Check passed; nothing was written/);
    assert.match(textOf(await call(client, 'write_diagram', sliceArgs(root))), /Nothing changed/);
    const files = sliceFiles(root).map((f) => ({ ...f, content: f.content.replace('classDiagram', 'pie') }));
    const bad = await call(client, 'write_diagram', sliceArgs(root, { files }));
    assert.equal(bad.isError, true);
    assert.match(textOf(bad), /^Nothing was written/);
    const checked = await call(client, 'check_diagram', sliceArgs(root, { files }));
    assert.equal(checked.isError, true);
    assert.deepEqual(fs.readdirSync(path.join(dir, 'sign-in')).sort(), before);
    const wrongTitle = await call(client, 'check_diagram', sliceArgs(root, { stories: [{ id: 'IAM-0001', title: 'Something else' }, STORIES[1]] }));
    assert.equal(wrongTitle.isError, true);
  } finally {
    await client.close();
  }
});

test('repo tools read the repo, refuse an excluded file, and repo_read records what traceability may name', async () => {
  const root = temp();
  const client = await connect(root, ['--backlog', 'sample.csv']);
  try {
    assert.match(textOf(await call(client, 'repo_tree', { path: 'src/auth' })), /login\.js/);
    assert.match(textOf(await call(client, 'repo_grep', { pattern: 'signin' })), /login\.js:\d+/);
    const excluded = await call(client, 'repo_read', { file: 'config/prod.yml', offset: 1 });
    assert.equal(excluded.isError, true);
    assert.match(textOf(excluded), /excluded by rule/);
    const outside = await call(client, 'repo_read', { file: '../../sample.csv', offset: 1 });
    assert.equal(outside.isError, true);
    assert.match(textOf(outside), /outside the repo/);
    // A traceability row naming a file the session never read is refused; once repo_read returned its lines it is accepted.
    const spec = sliceFiles(root).find((f) => f.name === 'UC-sign-in.md');
    const traced = spec.content.replace(/## Traceability[\s\S]*$/,'## Traceability\n\n| Step | What | Code |\n|---|---|---|\n| sign-in 1.1 | Checks the password | `src/auth/login.js::signIn` |\n');
    const files = sliceFiles(root).map((f) => (f.name === spec.name ? { ...f, content: traced } : f));
    const first = await call(client, 'check_diagram', sliceArgs(root, { files }));
    assert.match(textOf(first), /src\/auth\/login\.js.*did not return|repo_read did not return/);
    await call(client, 'repo_read', { file: 'src/auth/login.js' }); // size only: not a read of the lines
    assert.equal((await call(client, 'check_diagram', sliceArgs(root, { files }))).isError, true);
    await call(client, 'repo_read', { file: 'src/auth/login.js', offset: 1, limit: 20 });
    const after = textOf(await call(client, 'check_diagram', sliceArgs(root, { files })));
    assert.doesNotMatch(after, /repo_read did not return/);
  } finally {
    await client.close();
  }
});

test('the server refuses an unknown flag', async () => {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [SERVER, '--nope'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage/);
});
