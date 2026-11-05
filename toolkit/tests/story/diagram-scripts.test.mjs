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
const sliceDir = (root, slice = 'sign-in') => path.join(slicesPath(root, 'sample'), slice);
const snapshot = (dir) => Object.fromEntries(fs.readdirSync(dir).sort().map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
const fixtureFiles = () => fs.readdirSync(FIXTURE_SLICE).filter((f) => f !== 'source.json').map((name) => ({ name, content: fs.readFileSync(path.join(FIXTURE_SLICE, name), 'utf8') }));
const SCOPE = { type: 'feature', epic: 'Identity and access', feature: 'Sign in' };
const PAIRS = [{ id: 'B1-IAM-0001', title: 'Sign in with email' }, { id: 'B1-IAM-0002', title: 'Reset a password' }];
const input = (root, over = {}) => ({ dataDir: root, name: 'sample', slice: 'sign-in', scope: SCOPE, stories: PAIRS, files: fixtureFiles(), ...over });

const csvPath = (root) => pathOf(root, 'sample', 'backlog');
const editCsv = (root, edit) => fs.writeFileSync(csvPath(root), edit(fs.readFileSync(csvPath(root), 'utf8')));

// ---- read_diagrams ----

test('read: the committed mock is up to date and its files are returned', () => {
  const root = setup({ withSlice: true });
  const list = readDiagrams({ dataDir: root, name: 'sample' });
  assert.equal(list.ok, true);
  assert.deepEqual(list.slices.map((s) => [s.slice, s.stale]), [['sign-in', false]]);
  assert.match(formatDiagrams(list), /sign-in \| Feature: Identity and access > Sign in \| 2 stories \| up to date/);
  const one = readDiagrams({ dataDir: root, name: 'sample', slice: 'sign-in' });
  assert.match(formatDiagrams(one), /--- UC-sign-in\.md ---[\s\S]*## Class diagram/);
  assert.deepEqual(listSlices(slicesPath(root, 'sample')), ['sign-in']);
});

test('read: a renumber is healed in source.json and the specification list, and no diagram changes', () => {
  const root = setup({ withSlice: true });
  // A story added ahead of "Reset a password" shifts its derived ID; the locked story keeps its code.
  editCsv(root, (t) => t.replace('B1-IAM-0002,Identity and access,Sign in,Reset a password', ',Identity and access,Sign in,Verify the email,"As a member, I want to verify my email, so that it is mine.",2,Low,,"AC1: Given a, when b, then c.",,,\nB1-IAM-0002,Identity and access,Sign in,Reset a password'));
  const before = snapshot(sliceDir(root));
  const r = readDiagrams({ dataDir: root, name: 'sample', slice: 'sign-in' });
  const [slice] = r.slices;
  assert.deepEqual(slice.healed.map((h) => [h.title, h.from, h.to]), [['Reset a password', 'B1-IAM-0002', 'B1-IAM-0003']]);
  assert.deepEqual(slice.added.map((a) => a.title), ['Verify the email']);
  assert.equal(slice.stale, true);
  const after = snapshot(sliceDir(root));
  assert.equal(JSON.parse(after['source.json']).stories[1].id, 'B1-IAM-0003');
  assert.match(after['UC-sign-in.md'], /- B1-IAM-0003 Reset a password/);
  const blocks = (text) => text.match(/```mermaid[\s\S]*?```/g);
  assert.equal(blocks(before['UC-sign-in.md']).length, 3);
  assert.deepEqual(blocks(after['UC-sign-in.md']), blocks(before['UC-sign-in.md']), 'every mermaid block is byte-for-byte as before');
  assert.equal(after['UC-sign-in.md'].replace(/- B1-IAM-0003/, '- B1-IAM-0002'), before['UC-sign-in.md'], 'only the generated list changed in the specification');
  assert.match(formatDiagrams(r), /healed: "Reset a password" is now B1-IAM-0003 \(was B1-IAM-0002\)/);
});

test('read: a reworded story is changed and nothing is rewritten', () => {
  const root = setup({ withSlice: true });
  editCsv(root, (t) => t.replace('then they are sent a reset link', 'then they are told to check their mail'));
  const before = snapshot(sliceDir(root));
  const r = readDiagrams({ dataDir: root, name: 'sample', slice: 'sign-in' });
  assert.deepEqual(r.slices[0].stories.map((s) => s.status), ['ok', 'changed']);
  assert.match(formatDiagrams(r), /changed: "Reset a password" was reworded/);
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
  assert.deepEqual(source.stories.map((s) => [s.id, s.hash]), [['B1-IAM-0001', 'baf514d489ee'], ['B1-IAM-0002', 'ddf31b439280']]);
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
  const r = await writeDiagram(input(root, { stories: [{ id: 'B1-IAM-0001', title: 'Reset a password' }, PAIRS[1]] }));
  assert.equal(r.ok, false);
  assert.match(r.text, /B1-IAM-0001 is now "Sign in with email" \(Identity and access > Sign in\), not "Reset a password"/);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
  assert.match((await writeDiagram(input(root, { stories: [{ id: 'B1-IAM-0001' }, PAIRS[1]] }))).text, /needs the story's current Title/);
});

test('write: a story of the scope that was not listed, and a story outside the scope, are refused', async () => {
  const root = setup();
  assert.match((await writeDiagram(input(root, { stories: [PAIRS[0]] }))).text, /"Reset a password" is in the scope but was not listed/);
  assert.match((await writeDiagram(input(root, { stories: [...PAIRS, { id: 'B1-R-0001', title: 'Export a list as CSV' }] }))).text, /"Export a list as CSV" is not in the scope/);
  assert.match((await writeDiagram(input(root, { scope: { type: 'feature', epic: 'Identity and access', feature: 'Nowhere' } }))).text, /No story of sample is in the scope/);
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
  const files = fixtureFiles().map((f) => ({ ...f, content: f.content.replace('FORM->>AUTH: 1.2', 'FORM->>GHOST: 1.2').replace('<<service>>\n    +authenticate', '+authenticate') }));
  const r = await writeDiagram(input(root, { files }));
  assert.equal(r.ok, false);
  assert.match(r.text, /2 problems/);
  assert.match(r.text, /GHOST/);
  assert.match(r.text, /## Class diagram: AuthService has no stereotype/);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test('write: a slice under the same name for another scope is refused and names the existing scope', async () => {
  const root = setup({ withSlice: true });
  const before = snapshot(sliceDir(root));
  const r = await writeDiagram(input(root, { scope: { type: 'epic', epic: 'Identity and access' } }));
  assert.equal(r.ok, false);
  assert.match(r.text, /already exists for another scope \(Feature: Identity and access > Sign in\)/);
  assert.deepEqual(snapshot(sliceDir(root)), before);
});

test('write: a changed slice is rewritten, a file that was not sent is left alone and reported', async () => {
  const root = setup({ withSlice: true });
  fs.writeFileSync(path.join(sliceDir(root), 'notes.txt'), 'old notes\n');
  const files = fixtureFiles().map((f) => (f.name === 'UC-sign-in.md' ? { ...f, content: f.content.replace('A member signs in', 'A registered member signs in') } : f));
  const r = await writeDiagram(input(root, { files }));
  assert.equal(r.ok, true, r.errors?.join('\n'));
  assert.equal(r.changed, true);
  assert.deepEqual(r.leftover, ['notes.txt']);
  assert.match(r.text, /left as they are: notes\.txt/);
  assert.match(fs.readFileSync(path.join(sliceDir(root), 'UC-sign-in.md'), 'utf8'), /A registered member signs in/);
  assert.ok(fs.existsSync(path.join(sliceDir(root), 'notes.txt')));
  assert.deepEqual(r.written, ['UC-sign-in.md']);
});

test('write: the specification\'s generated list is written by the writer whatever the model put in it', async () => {
  const root = setup();
  const files = fixtureFiles().map((f) => (f.name === 'UC-sign-in.md' ? { ...f, content: f.content.replace('- B1-IAM-0001 Sign in with email', '- ZZZ-9999 invented') } : f));
  assert.equal((await writeDiagram(input(root, { files }))).ok, true);
  const spec = fs.readFileSync(path.join(sliceDir(root), 'UC-sign-in.md'), 'utf8');
  assert.match(spec, /- B1-IAM-0001 Sign in with email/);
  assert.doesNotMatch(spec, /ZZZ-9999/);
});

test('write: a document with a diagram that does not parse writes nothing and lists the parser message and line', async () => {
  const root = setup();
  const files = fixtureFiles().map((f) => ({ ...f, content: f.content.replace('MAILER-->>U: 2.10 reset link received', 'MAILER-->>>U: 2.10 reset link received') }));
  const r = await writeDiagram(input(root, { files }));
  assert.equal(r.ok, false);
  assert.match(r.text, /UC-sign-in\.md:\d+: ### Sequence: reset: does not parse as Mermaid: Parse error on line \d+/);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test('write: a second document is refused, naming the rule', async () => {
  const root = setup();
  const r = await writeDiagram(input(root, { files: [...fixtureFiles(), { name: 'UC-sign-in-extra.md', content: '# extra' }] }));
  assert.equal(r.ok, false);
  assert.match(r.text, /UC-sign-in-extra\.md: is not part of a slice: a slice is one document/);
});

// ---- the scripts as Bash runs them ----

const run = (copy, script, args, body, root) => spawnSync(process.execPath, [path.join(copy.dir, script), ...args], {
  input: body === undefined ? '' : JSON.stringify(body), encoding: 'utf8', env: { ...process.env, PLANNER_CONFIG: tempConfig(root) },
});
const sliceBody = (over = {}) => ({ slice: 'sign-in', scope: SCOPE, stories: PAIRS, files: fixtureFiles(), ...over });

test('cli: write-diagram --check on the mock reports and writes nothing, the write then writes and a repeat changes nothing', () => {
  const root = setup();
  const checked = run(plan, 'write-diagram.mjs', ['sample', '--check'], sliceBody(), root);
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /Check passed; nothing was written/);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
  const wrote = run(plan, 'write-diagram.mjs', ['sample'], sliceBody(), root);
  assert.equal(wrote.status, 0, wrote.stderr);
  assert.match(wrote.stdout, /Wrote the slice "sign-in"/);
  assert.match(run(plan, 'write-diagram.mjs', ['sample'], sliceBody(), root).stdout, /Nothing changed/);
  const read = run(plan, 'read-diagrams.mjs', ['sample', '--slice', 'sign-in'], undefined, root);
  assert.equal(read.status, 0, read.stderr);
  assert.match(read.stdout, /sign-in \| Feature: Identity and access > Sign in \| 2 stories \| up to date/);
});

test('cli: an invalid diagram is refused with --check and without, with the parser message, and nothing is written', () => {
  const root = setup();
  const files = fixtureFiles().map((f) => ({ ...f, content: f.content.replace('MAILER-->>U: 2.10 reset link received', 'MAILER-->>>U: 2.10 reset link received') }));
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
