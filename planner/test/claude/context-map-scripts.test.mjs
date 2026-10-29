import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readContextMap, formatContextMap } from '../../../.claude/skills/plan-stories/read-context-map.mjs';
import { checkContextMap, writeContextMap } from '../../../.claude/skills/plan-stories/write-context-map.mjs';
import { readDiagrams } from '../../../.claude/skills/plan-stories/read-diagrams.mjs';

const SAMPLE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'sample-data');
const FIXTURE_SLICE = path.join(SAMPLE, 'diagrams', 'sample', 'sign-in');

function setup({ withSlice = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'context-map-test-'));
  fs.mkdirSync(path.join(root, 'backlogs'));
  fs.copyFileSync(path.join(SAMPLE, 'backlogs', 'sample.csv'), path.join(root, 'backlogs', 'sample.csv'));
  if (withSlice) fs.cpSync(FIXTURE_SLICE, path.join(root, 'diagrams', 'sample', 'sign-in'), { recursive: true });
  return root;
}
const dirOf = (root) => path.join(root, 'diagrams', 'sample');
const MAP = {
  contexts: [
    { name: 'Accounts', purpose: 'Who a member is and how they sign in', owner: 'Platform team', epics: ['Identity and access'] },
    { name: 'Insight', purpose: 'What the analysts see', owner: 'TBC', epics: ['Reporting'] },
  ],
  relationships: [{ from: 'Accounts', to: 'Insight', type: 'published-events', crosses: 'Member signed in' }],
};
const input = (root, over = {}) => ({ dataDir: root, name: 'sample', ...MAP, ...over });
const logLines = (root) => (fs.existsSync(path.join(root, 'logs', 'writes.jsonl')) ? fs.readFileSync(path.join(root, 'logs', 'writes.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);

test('read: a backlog without a map reports none and is not an error', () => {
  const root = setup();
  const r = readContextMap({ dataDir: root, name: 'sample' });
  assert.deepEqual([r.ok, r.exists], [true, false]);
  assert.match(formatContextMap(r), /no context map/);
});

test('write then read: a valid map is up to date and shows the document and source', async () => {
  const root = setup();
  const w = await writeContextMap(input(root));
  assert.equal(w.ok, true, w.text);
  assert.deepEqual(w.written, ['context-map.md', 'context-map.json']);
  const r = readContextMap({ dataDir: root, name: 'sample' });
  assert.deepEqual([r.missing, r.unknown], [[], []]);
  const text = formatContextMap(r);
  assert.match(text, /2 contexts \| up to date/);
  assert.match(text, /--- context-map\.md ---[\s\S]*flowchart LR[\s\S]*--- context-map\.json ---/);
});

test('read: a stale map names the Epic it lacks and the Epic it no longer finds, and changes no file', async () => {
  const root = setup();
  await writeContextMap(input(root));
  const csv = path.join(root, 'backlogs', 'sample.csv');
  fs.writeFileSync(csv, fs.readFileSync(csv, 'utf8').replace(/Reporting/g, 'Insights'));
  const before = fs.readdirSync(dirOf(root)).map((f) => fs.readFileSync(path.join(dirOf(root), f), 'utf8'));
  const r = readContextMap({ dataDir: root, name: 'sample' });
  assert.deepEqual([r.missing, r.unknown], [['Insights'], ['Reporting']]);
  assert.match(formatContextMap(r), /STALE[\s\S]*missing: the Epic "Insights"[\s\S]*unknown: the map lists the Epic "Reporting"/);
  assert.deepEqual(fs.readdirSync(dirOf(root)).map((f) => fs.readFileSync(path.join(dirOf(root), f), 'utf8')), before);
});

test('read: a source that is not JSON or has no contexts is reported invalid', () => {
  const root = setup();
  fs.mkdirSync(dirOf(root), { recursive: true });
  fs.writeFileSync(path.join(dirOf(root), 'context-map.json'), '{ nope');
  assert.match(readContextMap({ dataDir: root, name: 'sample' }).invalid, /not valid JSON/);
  fs.writeFileSync(path.join(dirOf(root), 'context-map.json'), '{}');
  assert.match(formatContextMap(readContextMap({ dataDir: root, name: 'sample' })), /no contexts list/);
});

test('write: the same map twice changes no byte and says nothing changed', async () => {
  const root = setup();
  await writeContextMap(input(root));
  const snapshot = fs.readdirSync(dirOf(root)).map((f) => fs.statSync(path.join(dirOf(root), f)).mtimeMs);
  const again = await writeContextMap(input(root));
  assert.deepEqual([again.ok, again.changed], [true, false]);
  assert.match(again.text, /Nothing changed/);
  assert.deepEqual(fs.readdirSync(dirOf(root)).map((f) => fs.statSync(path.join(dirOf(root), f)).mtimeMs), snapshot);
  assert.equal(logLines(root).length, 1);
});

test('write: a refused map writes neither file and lists each problem', async () => {
  const root = setup();
  const r = await writeContextMap(input(root, { contexts: [MAP.contexts[0]] }));
  assert.equal(r.ok, false);
  assert.match(r.text, /Nothing was written\. 2 problems/);
  assert.match(r.text, /The Epic "Reporting" is in no context/);
  assert.match(r.text, /names the context "Insight"/);
  assert.equal(fs.existsSync(dirOf(root)), false);
  assert.deepEqual(logLines(root), []);
});

test('write: the write is logged without contents and never deletes a file', async () => {
  const root = setup({ withSlice: true });
  await writeContextMap(input(root));
  const [line] = logLines(root);
  assert.deepEqual([line.writer, line.store, line.file, line.backlog], ['write_context_map', 'diagrams', 'sample/context-map', 'sample']);
  assert.equal(JSON.stringify(line).includes('Platform team'), false);
  assert.equal(fs.existsSync(path.join(dirOf(root), 'sign-in', 'source.json')), true);
});

test('write: a name that would leave the diagrams folder is refused', async () => {
  const root = setup();
  const r = await writeContextMap(input(root, { name: '../sample' }));
  assert.equal(r.ok, false);
  assert.equal(fs.existsSync(path.join(root, '..', 'sample')), false);
  assert.equal(fs.existsSync(path.join(root, 'diagrams')), false);
});

test('check: passes without writing, and reports the same problems as the write', async () => {
  const root = setup();
  assert.equal((await checkContextMap(input(root))).ok, true);
  assert.equal(fs.existsSync(path.join(root, 'diagrams')), false);
  const bad = input(root, { relationships: [{ ...MAP.relationships[0], type: 'partnership' }] });
  const check = await checkContextMap(bad);
  const write = await writeContextMap(bad);
  assert.deepEqual(check.errors, write.errors);
});

test('read_diagrams does not list the map as a slice', async () => {
  const root = setup({ withSlice: true });
  await writeContextMap(input(root));
  const list = readDiagrams({ dataDir: root, name: 'sample' });
  assert.deepEqual(list.slices.map((s) => s.slice), ['sign-in']);
});

test('the committed sample map passes the checks and the parser, matches its composed document, and is up to date', async () => {
  const sampleDir = path.join(SAMPLE, 'diagrams', 'sample');
  const source = JSON.parse(fs.readFileSync(path.join(sampleDir, 'context-map.json'), 'utf8'));
  const checked = await checkContextMap({ dataDir: SAMPLE, name: 'sample', ...source });
  assert.equal(checked.ok, true, checked.errors?.join('\n'));
  const root = setup();
  assert.equal((await writeContextMap({ dataDir: root, name: 'sample', ...source })).ok, true);
  for (const file of ['context-map.json', 'context-map.md']) {
    assert.equal(fs.readFileSync(path.join(dirOf(root), file), 'utf8').replace(/\r\n/g, '\n'), fs.readFileSync(path.join(sampleDir, file), 'utf8').replace(/\r\n/g, '\n'), file);
  }
  const read = readContextMap({ dataDir: SAMPLE, name: 'sample' });
  assert.deepEqual([read.exists, read.missing, read.unknown], [true, [], []]);
});
