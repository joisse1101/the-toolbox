import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { DESCRIPTIONS } from '../../claude/mcp/diagram-tools.mjs';
import { tempConfig } from '../helpers/temp-config.mjs';
import { sampleTree, slicesPath, backlogPath } from '../helpers/backlog-tree.mjs';
import { mermaidMissing } from '../../../toolkit/skills/jois-story-plan/parse-mermaid.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(HERE, '../../claude/mcp/diagram-tools.mjs');
const SCOPE = { type: 'feature', epic: 'Identity and access', feature: 'Sign in' };
const STORIES = [{ id: 'IAM-0001', title: 'Sign in with email' }, { id: 'IAM-0002', title: 'Reset a password' }];

const DIAGRAM_AND_MAP_TOOLS = ['check_context_map', 'check_diagram', 'read_context_map', 'read_diagrams', 'write_context_map', 'write_diagram'];
const MAP = {
  contexts: [
    { name: 'Accounts', purpose: 'Sign in', owner: 'TBC', epics: ['Identity and access'] },
    { name: 'Insight', purpose: 'Reports', owner: 'TBC', epics: ['Reporting'] },
  ],
  relationships: [{ from: 'Accounts', to: 'Insight', type: 'TBC', crosses: 'TBC' }],
};

// A temp data folder holding the sample backlog, slice and context map.
function temp() {
  return sampleTree({ withSlice: true, withMap: true });
}

// Mermaid's packages live in the plan skill's folder; the tools that parse diagrams refuse when they are not installed there.
const MERMAID_MISSING = mermaidMissing();

async function connect(root, args = []) {
  const client = new Client({ name: 'test', version: '0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER, ...args], env: { ...process.env, PLANNER_CONFIG: tempConfig(root) }, stderr: 'ignore' }));
  return client;
}
const call = (client, name, args) => client.callTool({ name, arguments: args });
const textOf = (r) => r.content.map((c) => c.text).join('\n');
const sliceFiles = (root) => {
  const dir = path.join(slicesPath(root, 'sample'), 'sign-in');
  return fs.readdirSync(dir).filter((f) => f !== 'source.json').map((name) => ({ name, content: fs.readFileSync(path.join(dir, name), 'utf8') }));
};
const sliceArgs = (root, over = {}) => ({ backlog: 'sample.csv', slice: 'sign-in', scope: SCOPE, stories: STORIES, files: sliceFiles(root), ...over });

test('tool list: six diagram tools; only the two writers are not read-only', async () => {
  const client = await connect(temp());
  try {
    const tools = (await client.listTools()).tools;
    assert.deepEqual(tools.map((t) => t.name).sort(), DIAGRAM_AND_MAP_TOOLS);
    for (const t of tools) assert.equal(!!t.annotations?.readOnlyHint, !['write_diagram', 'write_context_map'].includes(t.name), t.name);
    for (const t of tools) assert.equal(t.description, DESCRIPTIONS[t.name], `${t.name} carries its rules`);
  } finally {
    await client.close();
  }
});

test('the diagram tools label what they return as data from the diagrams folder', async () => {
  assert.match(DESCRIPTIONS.read_diagrams, /data from the diagrams folder/);
  assert.equal(DESCRIPTIONS.repo_tree, undefined, 'the repo tools are gone');
});

test('read_diagrams: the slices, one slice with its files, the conventions, bad input', async () => {
  const client = await connect(temp());
  try {
    const list = textOf(await call(client, 'read_diagrams', { backlog: 'sample.csv' }));
    assert.match(list, /1 slice ===/);
    assert.match(list, /sign-in \| Feature: Identity and access > Sign in \| 2 stories \| up to date/);
    const one = textOf(await call(client, 'read_diagrams', { backlog: 'sample.csv', slice: 'sign-in' }));
    assert.match(one, /--- UC-sign-in\.md ---/);
    assert.match(one, /## Class diagram/);
    assert.match(textOf(await call(client, 'read_diagrams', { backlog: 'sample.csv', section: 'conventions' })), /# Diagram conventions/);
    const both = await call(client, 'read_diagrams', { backlog: 'sample.csv', section: 'conventions', slice: 'sign-in' });
    assert.equal(both.isError, true);
    assert.equal((await call(client, 'read_diagrams', { backlog: 'sample.csv', slice: 'nope' })).isError, true);
  } finally {
    await client.close();
  }
});

test('check_diagram and check_context_map write nothing; without the Mermaid packages they refuse naming the folder and npm ci', async () => {
  const root = temp();
  const client = await connect(root);
  const dir = backlogPath(root, 'sample');
  try {
    const before = fs.readdirSync(path.join(dir, 'slices', 'sign-in')).sort();
    const checked = await call(client, 'check_diagram', sliceArgs(root));
    const mapChecked = await call(client, 'check_context_map', { backlog: 'sample.csv', ...MAP });
    if (MERMAID_MISSING) {
      for (const r of [checked, mapChecked]) {
        assert.equal(r.isError, true);
        assert.match(textOf(r), /npm ci/);
      }
    } else {
      assert.match(textOf(checked), /Check passed; nothing was written/);
      assert.match(textOf(mapChecked), /Check passed; nothing was written/);
    }
    const wrongTitle = await call(client, 'check_diagram', sliceArgs(root, { stories: [{ id: 'IAM-0001', title: 'Something else' }, STORIES[1]] }));
    assert.equal(wrongTitle.isError, true);
    assert.deepEqual(fs.readdirSync(path.join(dir, 'slices', 'sign-in')).sort(), before);
    assert.match(textOf(await call(client, 'read_context_map', { backlog: 'sample.csv' })), /2 contexts|up to date|STALE/);
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
