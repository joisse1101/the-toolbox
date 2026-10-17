import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { writeReview } from '../.claude/skills/review-backlog/write-review.mjs';
import { writeProposal } from '../.claude/skills/propose-stories/write-proposal.mjs';
import { ACTIONS, AREAS, CONFIDENCES, FIELDS } from '../core/review.js';

const SERVER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../ai/mcp/story-tools.mjs');

const CSV =
  'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes\r\n' +
  'IAM-0001,Identity & Access Management,Auth,Login,"As a user, I want to log in, so that I can access the portal",5,High,,"AC1: Given a, when b, then c",\r\n' +
  'IAM-0002,Identity & Access Management,SSO,SSO Login,"As a user, I want SSO, so that no credentials",55,,,,\r\n';

function temp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tools-test-'));
  fs.mkdirSync(path.join(root, 'user-stories'));
  fs.writeFileSync(path.join(root, 'user-stories', 'data.csv'), CSV);
  return root;
}

async function connect(root, args = []) {
  const client = new Client({ name: 'test', version: '0' });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [SERVER, ...args], env: { ...process.env, TLT_DATA_DIR: root }, stderr: 'ignore',
  }));
  return client;
}
const call = (client, name, args) => client.callTool({ name, arguments: args });
const textOf = (r) => r.content.map((c) => c.text).join('\n');

const row = (over = {}) => ({
  storyId: 'IAM-0001', field: 'Title', action: 'replace', suggested: 'Log in with a password', reason: 'Clearer',
  area: 'Hierarchy', confidence: 'ready', ...over,
});
const story = (over = {}) => ({
  epic: 'Identity & Access Management', feature: 'Auth', title: 'Reset password', points: 3,
  userStory: 'As a user, I want to reset my password, so that I can get back in', dependsOn: [],
  criteria: ['AC1: Given a, when b, then c'], ...over,
});

test('tool list: all four by default, read_context only with --read-only', async () => {
  const root = temp();
  const full = await connect(root);
  const readOnly = await connect(root, ['--read-only']);
  try {
    const all = (await full.listTools()).tools;
    assert.deepEqual(all.map((t) => t.name).sort(), ['read_context', 'write_lexicon', 'write_proposals', 'write_review']);
    assert.equal(all.find((t) => t.name === 'read_context').annotations.readOnlyHint, true);
    for (const t of all.filter((x) => x.name !== 'read_context')) assert.ok(!t.annotations?.readOnlyHint, `${t.name} is not read-only`);
    assert.deepEqual((await readOnly.listTools()).tools.map((t) => t.name), ['read_context']);
  } finally {
    await full.close();
    await readOnly.close();
  }
});

test('read_context: menu, one story, bad section, section with storyId', async () => {
  const client = await connect(temp());
  try {
    const menu = textOf(await call(client, 'read_context', { backlog: 'data.csv' }));
    for (const s of ['guidelines', 'index', 'proposals', 'lexicon']) assert.match(menu, new RegExp(`${s}: \\d+ characters`));
    assert.doesNotMatch(menu, /node \.claude/, 'the menu names no shell command');
    assert.match(textOf(await call(client, 'read_context', { backlog: 'data.csv', storyId: 'IAM-0001' })), /Login/);
    const missing = await call(client, 'read_context', { backlog: 'data.csv', storyId: 'IAM-9999' });
    assert.equal(missing.isError, true);
    assert.match(textOf(missing), /not found/);
    const both = await call(client, 'read_context', { backlog: 'data.csv', section: 'index', storyId: 'IAM-0001' });
    assert.equal(both.isError, true);
    assert.match(textOf(await call(client, 'read_context', { backlog: 'data.csv', section: 'other' })), /section/i);
    assert.match(textOf(await call(client, 'read_context', { backlog: 'data.csv', storyId: 'IAM-1; rm' })), /storyId/);
    assert.match(textOf(await call(client, 'read_context', { backlog: '../x.csv' })), /./);
  } finally {
    await client.close();
  }
});

test('write_proposals gives the script result', async () => {
  const root = temp();
  const other = temp();
  const client = await connect(root);
  try {
    const r = await call(client, 'write_proposals', { backlog: 'data.csv', items: [story()] });
    assert.ok(!r.isError, textOf(r));
    assert.match(textOf(r), /Added 1 proposed story to proposals\/data.csv \(NEW-1\); 1 in the file now\./);
    writeProposal({ dataDir: other, name: 'data.csv', input: JSON.stringify([story()]) });
    assert.equal(fs.readFileSync(path.join(root, 'proposals', 'data.csv'), 'utf8'), fs.readFileSync(path.join(other, 'proposals', 'data.csv'), 'utf8'));
  } finally {
    await client.close();
  }
});

test('a bad write call writes nothing and returns the writer messages', async () => {
  const root = temp();
  const client = await connect(root);
  try {
    const r = await call(client, 'write_proposals', { backlog: 'data.csv', items: [story(), story({ points: 21 })] });
    assert.equal(r.isError, true);
    assert.match(textOf(r), /Nothing was written\. 1 problem:\n- /);
    assert.ok(!fs.existsSync(path.join(root, 'proposals')));
    const lex = await call(client, 'write_lexicon', { backlog: 'data.csv', items: [{ term: 'Role' }] });
    assert.equal(lex.isError, true);
    assert.ok(!fs.existsSync(path.join(root, 'lexicons')));
  } finally {
    await client.close();
  }
});

test('write_lexicon adds a term', async () => {
  const root = temp();
  const client = await connect(root);
  try {
    const r = await call(client, 'write_lexicon', { backlog: 'data.csv', items: [{ term: 'Role', definition: 'A set of privileges', avoid: ['hat'] }] });
    assert.ok(!r.isError, textOf(r));
    assert.match(textOf(r), /Added 1 term to lexicons\/data.csv \(Role\); 1 in the lexicon now\./);
  } finally {
    await client.close();
  }
});

test('write_review always appends and keeps existing rows', async () => {
  const root = temp();
  writeReview({ dataDir: root, name: 'data.csv', input: JSON.stringify([row()]) });
  const before = fs.readFileSync(path.join(root, 'reviews', 'data.csv'), 'utf8');
  const client = await connect(root);
  try {
    const r = await call(client, 'write_review', {
      backlog: 'data.csv', items: [row({ field: 'User Acceptance Criteria', suggested: 'AC1: Given x, when y, then z' })],
    });
    assert.ok(!r.isError, textOf(r));
    assert.match(textOf(r), /Wrote 1 suggestion to reviews\/data.csv; 2 in the file now\./);
    const after = fs.readFileSync(path.join(root, 'reviews', 'data.csv'), 'utf8');
    assert.ok(after.startsWith(before.trimEnd()), 'the earlier row is kept');
  } finally {
    await client.close();
  }
});

test('write_review states the one-line AC rule in its error and its description', async () => {
  const root = temp();
  const client = await connect(root);
  try {
    const multi = await call(client, 'write_review', {
      backlog: 'data.csv', items: [row({ field: 'User Acceptance Criteria', suggested: 'AC1: Given a, when b, then c\nAC2: Given d, when e, then f' })],
    });
    assert.equal(multi.isError, true);
    assert.match(textOf(multi), /one line/);
    assert.ok(!fs.existsSync(path.join(root, 'reviews')));
    const desc = (await client.listTools()).tools.find((t) => t.name === 'write_review').description;
    for (const word of [...ACTIONS, ...FIELDS, ...AREAS, ...CONFIDENCES]) assert.ok(desc.includes(word), `description mentions ${word}`);
    assert.match(desc, /ONE criterion per row/);
    assert.match(desc, /MUST start with the label/);
    assert.match(desc, /label alone/);
    assert.match(desc, /unlock/);
  } finally {
    await client.close();
  }
});
