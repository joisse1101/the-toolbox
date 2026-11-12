import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sampleTree, pathOf, slicesPath, backlogPath, SAMPLE_SLICE } from './helpers/backlog-tree.mjs';
import { tempConfig } from './helpers/temp-config.mjs';
import { planSkillCopy } from './helpers/plan-skill.mjs';

// The scripts run from a temp copy of the skill folder that has the Mermaid packages (see helpers/plan-skill.mjs).
const plan = planSkillCopy();
const { readContextMap, formatContextMap } = await plan.load('read-context-map.mjs');
const { checkContextMap, writeContextMap } = await plan.load('write-context-map.mjs');
const { readDiagrams } = await plan.load('read-diagrams.mjs');


function setup({ withSlice = false } = {}) {
  return sampleTree({ withSlice });
}
const dirOf = (root) => backlogPath(root, 'sample');
const sliceOf = (root, slice = 'streaks') => path.join(slicesPath(root, 'sample'), slice);
const MAP = {
  contexts: [
    { name: 'Habits', purpose: 'What a person tracks every day', owner: 'Platform team', epics: ['Habit tracking'] },
    { name: 'Focus', purpose: 'How a person runs and counts focus sessions', owner: 'TBC', epics: ['Focus timer'] },
  ],
  relationships: [{ from: 'Habits', to: 'Focus', type: 'published-events', crosses: 'Task category' }],
};
const input = (root, over = {}) => ({ dataDir: root, name: 'sample', ...MAP, ...over });

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
  const csv = pathOf(root, 'sample', 'backlog');
  fs.writeFileSync(csv, fs.readFileSync(csv, 'utf8').replace(/Focus timer/g, 'Weekly stats'));
  const before = fs.readdirSync(dirOf(root)).map((f) => fs.readFileSync(path.join(dirOf(root), f), 'utf8'));
  const r = readContextMap({ dataDir: root, name: 'sample' });
  assert.deepEqual([r.missing, r.unknown], [['Weekly stats'], ['Focus timer']]);
  assert.match(formatContextMap(r), /STALE[\s\S]*missing: the Epic "Weekly stats"[\s\S]*unknown: the map lists the Epic "Focus timer"/);
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
});

test('write: a refused map writes neither file and lists each problem', async () => {
  const root = setup();
  const r = await writeContextMap(input(root, { contexts: [MAP.contexts[0]] }));
  assert.equal(r.ok, false);
  assert.match(r.text, /Nothing was written\. 2 problems/);
  assert.match(r.text, /The Epic "Focus timer" is in no context/);
  assert.match(r.text, /names the context "Focus"/);
  assert.equal(fs.existsSync(path.join(dirOf(root), 'context-map.json')), false);
});

test('write: the write never deletes a file', async () => {
  const root = setup({ withSlice: true });
  await writeContextMap(input(root));
  assert.equal(fs.existsSync(path.join(sliceOf(root), 'source.json')), true);
});

test('write: a name that would leave the data folder is refused', async () => {
  const root = setup();
  const r = await writeContextMap(input(root, { name: '../sample' }));
  assert.equal(r.ok, false);
  assert.equal(fs.existsSync(path.join(root, '..', 'sample')), false);
  assert.equal(fs.existsSync(path.join(dirOf(root), 'context-map.json')), false);
});

test('check: passes without writing, and reports the same problems as the write', async () => {
  const root = setup();
  assert.equal((await checkContextMap(input(root))).ok, true);
  assert.equal(fs.existsSync(path.join(dirOf(root), 'context-map.json')), false);
  const bad = input(root, { relationships: [{ ...MAP.relationships[0], type: 'partnership' }] });
  const check = await checkContextMap(bad);
  const write = await writeContextMap(bad);
  assert.deepEqual(check.errors, write.errors);
});

test('read_diagrams does not list the map as a slice', async () => {
  const root = setup({ withSlice: true });
  await writeContextMap(input(root));
  const list = readDiagrams({ dataDir: root, name: 'sample' });
  assert.deepEqual(list.slices.map((s) => s.slice), ['streaks']);
});

test('the committed sample map passes the checks and the parser, matches its composed document, and is up to date', async () => {
  const withMap = sampleTree({ withMap: true });
  const sampleDir = dirOf(withMap);
  const source = JSON.parse(fs.readFileSync(path.join(sampleDir, 'context-map.json'), 'utf8'));
  const checked = await checkContextMap({ dataDir: withMap, name: 'sample', ...source });
  assert.equal(checked.ok, true, checked.errors?.join('\n'));
  const root = setup();
  assert.equal((await writeContextMap({ dataDir: root, name: 'sample', ...source })).ok, true);
  for (const file of ['context-map.json', 'context-map.md']) {
    assert.equal(fs.readFileSync(path.join(dirOf(root), file), 'utf8').replace(/\r\n/g, '\n'), fs.readFileSync(path.join(sampleDir, file), 'utf8').replace(/\r\n/g, '\n'), file);
  }
  const read = readContextMap({ dataDir: withMap, name: 'sample' });
  assert.deepEqual([read.exists, read.missing, read.unknown], [true, [], []]);
});

test('cli: write-context-map --check reports and writes nothing, the write then writes, and read-context-map shows the map', () => {
  const root = setup();
  const env = { ...process.env, PLANNER_CONFIG: tempConfig(root) };
  const run = (script, args, body) => spawnSync(process.execPath, [path.join(plan.dir, script), ...args], { input: body === undefined ? '' : JSON.stringify(body), encoding: 'utf8', env });
  const mapFiles = () => fs.readdirSync(dirOf(root)).filter((f) => f.startsWith('context-map'));
  const checked = run('write-context-map.mjs', ['sample', '--check'], MAP);
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /Check passed; nothing was written/);
  assert.deepEqual(mapFiles(), []);
  const wrote = run('write-context-map.mjs', ['sample'], MAP);
  assert.equal(wrote.status, 0, wrote.stderr);
  assert.match(wrote.stdout, /Wrote the context map/);
  const read = run('read-context-map.mjs', ['sample']);
  assert.equal(read.status, 0, read.stderr);
  assert.match(read.stdout, /2 contexts \| up to date/);
  const bad = run('write-context-map.mjs', ['sample'], { ...MAP, contexts: [MAP.contexts[0]] });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Nothing was written\./);
});
