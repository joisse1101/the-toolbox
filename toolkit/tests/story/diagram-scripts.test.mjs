import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sampleTree, pathOf, slicesPath, SAMPLE_SLICE } from './helpers/backlog-tree.mjs';
import { tempConfig } from './helpers/temp-config.mjs';
import { planSkillCopy } from './helpers/plan-skill.mjs';

// The scripts run from a temp copy of the skill folder that has the Mermaid packages (see helpers/plan-skill.mjs).
const plan = planSkillCopy();
const { readDiagrams, formatDiagrams, listSlices } = await plan.load('read-diagrams.mjs');
const { checkDiagram, writeDiagram } = await plan.load('write-diagram.mjs');

const FIXTURE_SLICE = SAMPLE_SLICE;

// A temp data folder holding the sample backlog and, with `withSlice`, the committed mock slice.
function setup({ withSlice = false } = {}) {
  return sampleTree({ withSlice });
}
const sliceDir = (root, slice = 'streaks') => path.join(slicesPath(root, 'sample'), slice);
const snapshot = (dir) => Object.fromEntries(fs.readdirSync(dir).sort().map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
const fixtureFiles = () => fs.readdirSync(FIXTURE_SLICE).filter((f) => f !== 'source.json').map((name) => ({ name, content: fs.readFileSync(path.join(FIXTURE_SLICE, name), 'utf8') }));
const SCOPE = { type: 'feature', epic: 'Habit tracking', feature: 'Streaks' };
const PAIRS = [{ id: 'H1-HT-0001', title: 'See the current streak' }, { id: 'H1-HT-0002', title: 'See the best streak' }];
const input = (root, over = {}) => ({ dataDir: root, name: 'sample', slice: 'streaks', scope: SCOPE, stories: PAIRS, files: fixtureFiles(), ...over });

const csvPath = (root) => pathOf(root, 'sample', 'backlog');
const editCsv = (root, edit) => fs.writeFileSync(csvPath(root), edit(fs.readFileSync(csvPath(root), 'utf8')));

// ---- read_diagrams ----

test('read: the committed mock is up to date and its files are returned', () => {
  const root = setup({ withSlice: true });
  const list = readDiagrams({ dataDir: root, name: 'sample' });
  assert.equal(list.ok, true);
  assert.deepEqual(list.slices.map((s) => [s.slice, s.stale]), [['streaks', false]]);
  assert.match(formatDiagrams(list), /streaks \| Feature: Habit tracking > Streaks \| 2 stories \| up to date/);
  const one = readDiagrams({ dataDir: root, name: 'sample', slice: 'streaks' });
  assert.match(formatDiagrams(one), /--- UC-streaks\.md ---[\s\S]*## Class diagram/);
  assert.match(formatDiagrams(one), /## Changes to existing specs/);
  assert.deepEqual(listSlices(slicesPath(root, 'sample')), ['streaks']);
});

test('read: a renumber is healed in source.json and the specification list, and no diagram changes', () => {
  const root = setup({ withSlice: true });
  // A story added ahead of "See the best streak" shifts its derived ID; the locked story keeps its code.
  editCsv(root, (t) => t.replace('H1-HT-0002,Habit tracking,Streaks,See the best streak', ',Habit tracking,Streaks,Name a habit,"As a person building habits, I want to name a habit, so that I know it.",2,Low,,"AC1: Given a, when b, then c.",,,\nH1-HT-0002,Habit tracking,Streaks,See the best streak'));
  const before = snapshot(sliceDir(root));
  const r = readDiagrams({ dataDir: root, name: 'sample', slice: 'streaks' });
  const [slice] = r.slices;
  assert.deepEqual(slice.healed.map((h) => [h.title, h.from, h.to]), [['See the best streak', 'H1-HT-0002', 'H1-HT-0003']]);
  assert.deepEqual(slice.added.map((a) => a.title), ['Name a habit']);
  assert.equal(slice.stale, true);
  const after = snapshot(sliceDir(root));
  assert.equal(JSON.parse(after['source.json']).stories[1].id, 'H1-HT-0003');
  assert.match(after['UC-streaks.md'], /- H1-HT-0003 See the best streak/);
  const blocks = (text) => text.match(/```mermaid[\s\S]*?```/g);
  assert.equal(blocks(before['UC-streaks.md']).length, 3);
  assert.deepEqual(blocks(after['UC-streaks.md']), blocks(before['UC-streaks.md']), 'every mermaid block is byte-for-byte as before');
  assert.equal(after['UC-streaks.md'].replace(/- H1-HT-0003/, '- H1-HT-0002'), before['UC-streaks.md'], 'only the generated list changed in the specification');
  assert.match(formatDiagrams(r), /healed: "See the best streak" is now H1-HT-0003 \(was H1-HT-0002\)/);
});

test('read: a reworded story is changed and nothing is rewritten', () => {
  const root = setup({ withSlice: true });
  editCsv(root, (t) => t.replace('then it shows a best streak of 5', 'then it shows a longest run of 5'));
  const before = snapshot(sliceDir(root));
  const r = readDiagrams({ dataDir: root, name: 'sample', slice: 'streaks' });
  assert.deepEqual(r.slices[0].stories.map((s) => s.status), ['ok', 'changed']);
  assert.match(formatDiagrams(r), /changed: "See the best streak" was reworded/);
  assert.deepEqual(snapshot(sliceDir(root)), before);
});

test('read: a slice that does not exist, a bad backlog and a missing source.json are reported', () => {
  const root = setup({ withSlice: true });
  assert.match(readDiagrams({ dataDir: root, name: 'sample', slice: 'nope' }).errors[0], /no slice "nope"/);
  assert.match(readDiagrams({ dataDir: root, name: 'missing' }).errors[0], /no backlog missing: missing\/user-stories\.csv was not found/);
  fs.rmSync(path.join(sliceDir(root), 'source.json'));
  assert.match(formatDiagrams(readDiagrams({ dataDir: root, name: 'sample' })), /source\.json is missing/);
});

// ---- check_diagram and write_diagram ----

test('check passes on the mock and writes nothing', async () => {
  const root = setup();
  const r = await checkDiagram(input(root));
  assert.equal(r.ok, true, r.errors?.join('\n'));
  assert.match(r.text, /nothing was written/);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test('write: the slice is written, read back, and the hashes are the writer\'s', async () => {
  const root = setup();
  const r = await writeDiagram(input(root));
  assert.equal(r.ok, true, r.errors?.join('\n'));
  assert.equal(r.changed, true);
  const written = snapshot(sliceDir(root));
  const fixture = snapshot(FIXTURE_SLICE);
  for (const f of Object.keys(fixture).filter((n) => n !== 'source.json')) assert.equal(written[f], fixture[f].replace(/\r\n/g, '\n'), f);
  const source = JSON.parse(written['source.json']);
  assert.deepEqual(source.stories.map((s) => [s.id, s.hash]), [['H1-HT-0001', 'afb3d4cdba1b'], ['H1-HT-0002', '3cbcd75e0d93']]);
  assert.match(formatDiagrams(readDiagrams({ dataDir: root, name: 'sample' })), /up to date/);
});

test('write: the same slice twice changes no byte and says nothing changed', async () => {
  const root = setup();
  await writeDiagram(input(root));
  const before = snapshot(sliceDir(root));
  const mtimes = Object.fromEntries(fs.readdirSync(sliceDir(root)).map((f) => [f, fs.statSync(path.join(sliceDir(root), f)).mtimeMs]));
  const again = await writeDiagram(input(root));
  assert.equal(again.ok, true);
  assert.equal(again.changed, false);
  assert.match(again.text, /Nothing changed/);
  assert.deepEqual(snapshot(sliceDir(root)), before);
  for (const f of Object.keys(mtimes)) assert.equal(fs.statSync(path.join(sliceDir(root), f)).mtimeMs, mtimes[f], `${f} not rewritten`);
});

test('write: a Title that does not match is refused and says what the ID holds', async () => {
  const root = setup();
  const r = await writeDiagram(input(root, { stories: [{ id: 'H1-HT-0001', title: 'See the best streak' }, PAIRS[1]] }));
  assert.equal(r.ok, false);
  assert.match(r.text, /H1-HT-0001 is now "See the current streak" \(Habit tracking > Streaks\), not "See the best streak"/);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
  assert.match((await writeDiagram(input(root, { stories: [{ id: 'H1-HT-0001' }, PAIRS[1]] }))).text, /needs the story's current Title/);
});

test('write: a story of the scope that was not listed, and a story outside the scope, are refused', async () => {
  const root = setup();
  assert.match((await writeDiagram(input(root, { stories: [PAIRS[0]] }))).text, /"See the best streak" is in the scope but was not listed/);
  assert.match((await writeDiagram(input(root, { stories: [...PAIRS, { id: 'H1-FT-0001', title: 'Count focus sessions by category' }] }))).text, /"Count focus sessions by category" is not in the scope/);
  assert.match((await writeDiagram(input(root, { scope: { type: 'feature', epic: 'Habit tracking', feature: 'Nowhere' } }))).text, /No story of sample is in the scope/);
});

test('write: a slice name that would leave the backlog\'s diagrams folder writes nothing', async () => {
  const root = setup();
  for (const slice of ['../escape', '..\\escape', 'a/b', 'UPPER', '']) {
    const r = await writeDiagram(input(root, { slice }));
    assert.equal(r.ok, false, slice);
    assert.match(r.text, /must be a lowercase slug/);
  }
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
  assert.equal(fs.existsSync(path.join(root, 'sample', 'escape')), false);
});

test('write: one failing diagram writes nothing and every problem is listed', async () => {
  const root = setup();
  const files = fixtureFiles().map((f) => ({ ...f, content: f.content.replace('LIST->>SVC: 1.2', 'LIST->>GHOST: 1.2').replace('<<service>>\n    +currentStreak', '+currentStreak') }));
  const r = await writeDiagram(input(root, { files }));
  assert.equal(r.ok, false);
  assert.match(r.text, /2 problems/);
  assert.match(r.text, /GHOST/);
  assert.match(r.text, /## Class diagram: StreakService has no stereotype/);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test('write: a slice under the same name for another scope is refused and names the existing scope', async () => {
  const root = setup({ withSlice: true });
  const before = snapshot(sliceDir(root));
  const r = await writeDiagram(input(root, { scope: { type: 'epic', epic: 'Habit tracking' } }));
  assert.equal(r.ok, false);
  assert.match(r.text, /already exists for another scope \(Feature: Habit tracking > Streaks\)/);
  assert.deepEqual(snapshot(sliceDir(root)), before);
});

test('write: a changed slice is rewritten, a file that was not sent is left alone and reported', async () => {
  const root = setup({ withSlice: true });
  fs.writeFileSync(path.join(sliceDir(root), 'notes.txt'), 'old notes\n');
  const files = fixtureFiles().map((f) => (f.name === 'UC-streaks.md' ? { ...f, content: f.content.replace('A person opens', 'A returning person opens') } : f));
  const r = await writeDiagram(input(root, { files }));
  assert.equal(r.ok, true, r.errors?.join('\n'));
  assert.equal(r.changed, true);
  assert.deepEqual(r.leftover, ['notes.txt']);
  assert.match(r.text, /left as they are: notes\.txt/);
  assert.match(fs.readFileSync(path.join(sliceDir(root), 'UC-streaks.md'), 'utf8'), /A returning person opens/);
  assert.ok(fs.existsSync(path.join(sliceDir(root), 'notes.txt')));
  assert.deepEqual(r.written, ['UC-streaks.md']);
});

test('write: the specification\'s generated list is written by the writer whatever the model put in it', async () => {
  const root = setup();
  const files = fixtureFiles().map((f) => (f.name === 'UC-streaks.md' ? { ...f, content: f.content.replace('- H1-HT-0001 See the current streak', '- ZZZ-9999 invented') } : f));
  assert.equal((await writeDiagram(input(root, { files }))).ok, true);
  const spec = fs.readFileSync(path.join(sliceDir(root), 'UC-streaks.md'), 'utf8');
  assert.match(spec, /- H1-HT-0001 See the current streak/);
  assert.doesNotMatch(spec, /ZZZ-9999/);
});

test('write: a document with a diagram that does not parse writes nothing and lists the parser message and line', async () => {
  const root = setup();
  const files = fixtureFiles().map((f) => ({ ...f, content: f.content.replace('STORE-->>SVC: 2.10 ok', 'STORE-->>>SVC: 2.10 ok') }));
  const r = await writeDiagram(input(root, { files }));
  assert.equal(r.ok, false);
  assert.match(r.text, /UC-streaks\.md:\d+: ### Sequence: best: does not parse as Mermaid: Parse error on line \d+/);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test('write: a second document is refused, naming the rule', async () => {
  const root = setup();
  const r = await writeDiagram(input(root, { files: [...fixtureFiles(), { name: 'UC-streaks-extra.md', content: '# extra' }] }));
  assert.equal(r.ok, false);
  assert.match(r.text, /UC-streaks-extra\.md: is not part of a slice: a slice is one document/);
});

// ---- the scripts as Bash runs them ----

const run = (copy, script, args, body, root) => spawnSync(process.execPath, [path.join(copy.dir, script), ...args], {
  input: body === undefined ? '' : JSON.stringify(body), encoding: 'utf8', env: { ...process.env, PLANNER_CONFIG: tempConfig(root) },
});
const sliceBody = (over = {}) => ({ slice: 'streaks', scope: SCOPE, stories: PAIRS, files: fixtureFiles(), ...over });

test('cli: write-diagram --check on the mock reports and writes nothing, the write then writes and a repeat changes nothing', () => {
  const root = setup();
  const checked = run(plan, 'write-diagram.mjs', ['sample', '--check'], sliceBody(), root);
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /Check passed; nothing was written/);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
  const wrote = run(plan, 'write-diagram.mjs', ['sample'], sliceBody(), root);
  assert.equal(wrote.status, 0, wrote.stderr);
  assert.match(wrote.stdout, /Wrote the slice "streaks"/);
  assert.match(run(plan, 'write-diagram.mjs', ['sample'], sliceBody(), root).stdout, /Nothing changed/);
  const read = run(plan, 'read-diagrams.mjs', ['sample', '--slice', 'streaks'], undefined, root);
  assert.equal(read.status, 0, read.stderr);
  assert.match(read.stdout, /streaks \| Feature: Habit tracking > Streaks \| 2 stories \| up to date/);
});

test('cli: an invalid diagram is refused with --check and without, with the parser message, and nothing is written', () => {
  const root = setup();
  const files = fixtureFiles().map((f) => ({ ...f, content: f.content.replace('STORE-->>SVC: 2.10 ok', 'STORE-->>>SVC: 2.10 ok') }));
  for (const args of [['sample', '--check'], ['sample']]) {
    const r = run(plan, 'write-diagram.mjs', args, sliceBody({ files }), root);
    assert.equal(r.status, 1, args.join(' '));
    assert.match(r.stderr, /Nothing was written\./);
    assert.match(r.stderr, /does not parse as Mermaid: Parse error on line \d+/);
  }
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test('cli: without the Mermaid packages the writers refuse, naming the skill folder and npm ci, and write nothing', () => {
  const bare = planSkillCopy({ withPackages: false });
  const root = setup();
  for (const args of [['sample', '--check'], ['sample']]) {
    const r = run(bare, 'write-diagram.mjs', args, sliceBody(), root);
    assert.equal(r.status, 1, args.join(' '));
    assert.ok(r.stderr.includes(bare.dir), r.stderr);
    assert.match(r.stderr, /npm ci/);
  }
  const map = run(bare, 'write-context-map.mjs', ['sample', '--check'], { contexts: [], relationships: [] }, root);
  assert.equal(map.status, 1);
  assert.match(map.stderr, /npm ci/);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test('cli: a script run with no data folder set says so and a bad stdin is named', () => {
  const root = setup();
  const noConfig = spawnSync(process.execPath, [path.join(plan.dir, 'read-diagrams.mjs'), 'sample'], { encoding: 'utf8', cwd: os.tmpdir(), env: { ...process.env, PLANNER_CONFIG: '' } });
  assert.equal(noConfig.status, 1);
  assert.match(noConfig.stderr, /No data folder was found/);
  const bad = spawnSync(process.execPath, [path.join(plan.dir, 'write-diagram.mjs'), 'sample', '--check'], { input: '{ nope', encoding: 'utf8', env: { ...process.env, PLANNER_CONFIG: tempConfig(root) } });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /not valid JSON/);
});

// ---- tasks.md: the writer's checks and tick carry-over, the reader's count ----

const TASKS = 'tasks.md';
const tasksPath = (root) => path.join(sliceDir(root), TASKS);
const withFile = (name, change) => fixtureFiles().map((f) => (f.name === name ? { ...f, content: change(f.content) } : f));
const withoutFile = (name) => fixtureFiles().filter((f) => f.name !== name);
const tick = (root, id) => fs.writeFileSync(tasksPath(root), fs.readFileSync(tasksPath(root), 'utf8').replace(`- [ ] ${id}`, `- [x] ${id}`));
const CURRENT = 'T-streaks-current-count';
const RESET = 'T-streaks-best-count';
const REWORD = (text) => text.replace('current streak is 2', 'current streak is two');

test('write: a missing tasks.md, an uncovered criterion and a task without Verify are each refused with and without --check, and nothing is written', async () => {
  const root = setup();
  const cases = [
    [withoutFile(TASKS), /tasks\.md: is missing/],
    [withFile(TASKS, (t) => t.replace(/\n## best[\s\S]*$/, '\n')), /the AC id AC-streaks-best \(story "See the best streak"\) has no task/],
    [withFile(TASKS, (t) => t.replace(/  Verify: check[^\n]*\n/, '')), new RegExp(`the task ${CURRENT} "Show the current streak of a habit" has no "Verify:" line`)],
  ];
  for (const [files, pattern] of cases) {
    const written = await writeDiagram(input(root, { files }));
    assert.equal(written.ok, false, String(pattern));
    assert.match(written.text, pattern);
    const checked = await checkDiagram(input(root, { files }));
    assert.equal(checked.ok, false, String(pattern));
    assert.match(checked.errors.join('\n'), pattern);
    assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
  }
});

test('write: a slice that exists without tasks.md is refused when written without it, and its folder is left as it is', async () => {
  const root = setup({ withSlice: true });
  fs.rmSync(tasksPath(root));
  const before = snapshot(sliceDir(root));
  const r = await writeDiagram(input(root, { files: withoutFile(TASKS) }));
  assert.equal(r.ok, false);
  assert.match(r.text, /tasks\.md: is missing/);
  assert.deepEqual(snapshot(sliceDir(root)), before);
});

test('write: tasks.md is written with every task unticked on the first write and is not reported as left over', async () => {
  const root = setup();
  const r = await writeDiagram(input(root, { files: withFile(TASKS, (t) => t.replace(/\[ \]/g, '[x]')) }));
  assert.equal(r.ok, true, r.errors?.join('\n'));
  assert.ok(r.written.includes(TASKS));
  assert.deepEqual(r.leftover, []);
  assert.equal(fs.readFileSync(tasksPath(root), 'utf8'), fs.readFileSync(path.join(FIXTURE_SLICE, TASKS), 'utf8').replace(/\r\n/g, '\n'));
  assert.doesNotMatch(r.text, /reset:|dropped:/);
});

test('write: ticks stay when the criteria are unchanged, even though the skill sends every task unticked', async () => {
  const root = setup();
  await writeDiagram(input(root));
  tick(root, CURRENT);
  const files = withFile('UC-streaks.md', (t) => t.replace('A person opens', 'A returning person opens'));
  const r = await writeDiagram(input(root, { files }));
  assert.equal(r.ok, true, r.errors?.join('\n'));
  assert.deepEqual(r.written, ['UC-streaks.md']);
  const text = fs.readFileSync(tasksPath(root), 'utf8');
  assert.ok(text.includes(`- [x] ${CURRENT}`), `- [x] ${CURRENT}`);
  assert.ok(text.includes(`- [ ] ${RESET}`), `- [ ] ${RESET}`);
});

test('write: a reworded criterion resets its task and the reply lists it by id and title; a removed task is listed as dropped', async () => {
  const root = setup();
  await writeDiagram(input(root));
  tick(root, CURRENT);
  tick(root, RESET);
  editCsv(root, REWORD);
  const reworded = await writeDiagram(input(root, { files: withFile('UC-streaks.md', REWORD) }));
  assert.equal(reworded.ok, true, reworded.errors?.join('\n'));
  assert.deepEqual(reworded.reset, [{ id: RESET, title: 'Show the best streak of a habit' }]);
  assert.match(reworded.text, new RegExp(`reset: task ${RESET} "Show the best streak of a habit"`));
  const text = fs.readFileSync(tasksPath(root), 'utf8');
  assert.ok(text.includes(`- [x] ${CURRENT}`), `- [x] ${CURRENT}`);
  assert.ok(text.includes(`- [ ] ${RESET}`), `- [ ] ${RESET}`);

  tick(root, RESET);
  const renamed = withFile(TASKS, (t) => t.replace(RESET, 'T-streaks-best-run').replace('Show the best streak of a habit', 'Find the best run'));
  const dropped = await writeDiagram(input(root, { files: renamed.map((f) => (f.name === 'UC-streaks.md' ? { ...f, content: REWORD(f.content) } : f)) }));
  assert.equal(dropped.ok, true, dropped.errors?.join('\n'));
  assert.deepEqual(dropped.dropped, [{ id: RESET, title: 'Show the best streak of a habit' }]);
  assert.match(dropped.text, new RegExp(`dropped: task ${RESET} "Show the best streak of a habit"`));
});

test('write: a tick made by hand between two writes survives, and a repeated write says nothing changed with both files byte for byte equal', async () => {
  const root = setup();
  await writeDiagram(input(root));
  tick(root, RESET);
  const before = snapshot(sliceDir(root));
  const again = await writeDiagram(input(root));
  assert.equal(again.ok, true);
  assert.equal(again.changed, false);
  assert.match(again.text, /Nothing changed/);
  const after = snapshot(sliceDir(root));
  assert.equal(after[TASKS], before[TASKS]);
  assert.equal(after['UC-streaks.md'], before['UC-streaks.md']);
  assert.ok(after[TASKS].includes(`- [x] ${RESET}`), `- [x] ${RESET}`);
  assert.deepEqual(after, before);
});

test('read: a slice with tasks.md shows how many tasks are done and no byte of tasks.md changes', () => {
  const root = setup({ withSlice: true });
  const six = Array.from({ length: 6 }, (_, i) => `- [${i < 2 ? 'x' : ' '}] T-streaks-t${i} Task ${i}\n  Satisfies: AC-streaks-current (steps 1.1)\n  Verify: look\n`).join('\n');
  fs.writeFileSync(tasksPath(root), `# Tasks\n\n## login\n\n${six}`);
  const before = fs.readFileSync(tasksPath(root));
  const list = formatDiagrams(readDiagrams({ dataDir: root, name: 'sample' }));
  assert.match(list, /tasks: 2 of 6 done/);
  assert.match(formatDiagrams(readDiagrams({ dataDir: root, name: 'sample', slice: 'streaks' })), /tasks: 2 of 6 done/);
  assert.deepEqual(fs.readFileSync(tasksPath(root)), before);
});

test('read: a slice without tasks.md shows no tasks line and reads as before', () => {
  const root = setup({ withSlice: true });
  fs.rmSync(tasksPath(root));
  const text = formatDiagrams(readDiagrams({ dataDir: root, name: 'sample' }));
  assert.match(text, /streaks \| Feature: Habit tracking > Streaks \| 2 stories \| up to date/);
  assert.doesNotMatch(text, /tasks:/);
});
