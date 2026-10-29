import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDiagrams, formatDiagrams, listSlices } from '../../../.claude/skills/plan-stories/read-diagrams.mjs';
import { checkDiagram, writeDiagram } from '../../../.claude/skills/plan-stories/write-diagram.mjs';

const SAMPLE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'sample-data');
const FIXTURE_SLICE = path.join(SAMPLE, 'diagrams', 'sample', 'sign-in');

// A temp data folder holding the sample backlog and, with `withSlice`, the committed mock slice.
function setup({ withSlice = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-scripts-test-'));
  fs.mkdirSync(path.join(root, 'backlogs'));
  fs.copyFileSync(path.join(SAMPLE, 'backlogs', 'sample.csv'), path.join(root, 'backlogs', 'sample.csv'));
  if (withSlice) fs.cpSync(FIXTURE_SLICE, path.join(root, 'diagrams', 'sample', 'sign-in'), { recursive: true });
  return root;
}
const sliceDir = (root, slice = 'sign-in') => path.join(root, 'diagrams', 'sample', slice);
const snapshot = (dir) => Object.fromEntries(fs.readdirSync(dir).sort().map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
const fixtureFiles = () => fs.readdirSync(FIXTURE_SLICE).filter((f) => f !== 'source.json').map((name) => ({ name, content: fs.readFileSync(path.join(FIXTURE_SLICE, name), 'utf8') }));
const SCOPE = { type: 'feature', epic: 'Identity and access', feature: 'Sign in' };
const PAIRS = [{ id: 'IAM-0001', title: 'Sign in with email' }, { id: 'IAM-0002', title: 'Reset a password' }];
const input = (root, over = {}) => ({ dataDir: root, name: 'sample', slice: 'sign-in', scope: SCOPE, stories: PAIRS, files: fixtureFiles(), ...over });
const logLines = (root) => (fs.existsSync(path.join(root, 'logs', 'writes.jsonl')) ? fs.readFileSync(path.join(root, 'logs', 'writes.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);

const csvPath = (root) => path.join(root, 'backlogs', 'sample.csv');
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
  assert.deepEqual(listSlices(path.join(root, 'diagrams', 'sample')), ['sign-in']);
});

test('read: a renumber is healed in source.json and the specification list, and no diagram changes', () => {
  const root = setup({ withSlice: true });
  // A story added ahead of "Reset a password" shifts its derived ID; the locked story keeps its code.
  editCsv(root, (t) => t.replace('IAM-0002,Identity and access,Sign in,Reset a password', ',Identity and access,Sign in,Verify the email,"As a member, I want to verify my email, so that it is mine.",2,Low,,"AC1: Given a, when b, then c.",,,\nIAM-0002,Identity and access,Sign in,Reset a password'));
  const before = snapshot(sliceDir(root));
  const r = readDiagrams({ dataDir: root, name: 'sample', slice: 'sign-in' });
  const [slice] = r.slices;
  assert.deepEqual(slice.healed.map((h) => [h.title, h.from, h.to]), [['Reset a password', 'IAM-0002', 'IAM-0003']]);
  assert.deepEqual(slice.added.map((a) => a.title), ['Verify the email']);
  assert.equal(slice.stale, true);
  const after = snapshot(sliceDir(root));
  assert.equal(JSON.parse(after['source.json']).stories[1].id, 'IAM-0003');
  assert.match(after['UC-sign-in.md'], /- IAM-0003 Reset a password/);
  const blocks = (text) => text.match(/```mermaid[\s\S]*?```/g);
  assert.equal(blocks(before['UC-sign-in.md']).length, 3);
  assert.deepEqual(blocks(after['UC-sign-in.md']), blocks(before['UC-sign-in.md']), 'every mermaid block is byte-for-byte as before');
  assert.equal(after['UC-sign-in.md'].replace(/- IAM-0003/, '- IAM-0002'), before['UC-sign-in.md'], 'only the generated list changed in the specification');
  assert.match(formatDiagrams(r), /healed: "Reset a password" is now IAM-0003 \(was IAM-0002\)/);
  assert.equal(logLines(root).at(-1).writer, 'read_diagrams');
  assert.equal(logLines(root).at(-1).slice, 'sign-in');
});

test('read: a reworded story is changed and nothing is rewritten', () => {
  const root = setup({ withSlice: true });
  editCsv(root, (t) => t.replace('then they are sent a reset link', 'then they are told to check their mail'));
  const before = snapshot(sliceDir(root));
  const r = readDiagrams({ dataDir: root, name: 'sample', slice: 'sign-in' });
  assert.deepEqual(r.slices[0].stories.map((s) => s.status), ['ok', 'changed']);
  assert.match(formatDiagrams(r), /changed: "Reset a password" was reworded/);
  assert.deepEqual(snapshot(sliceDir(root)), before);
  assert.deepEqual(logLines(root), []);
});

test('read: a slice that does not exist, a bad backlog and a missing source.json are reported', () => {
  const root = setup({ withSlice: true });
  assert.match(readDiagrams({ dataDir: root, name: 'sample', slice: 'nope' }).errors[0], /no slice "nope"/);
  assert.match(readDiagrams({ dataDir: root, name: 'missing' }).errors[0], /no backlog missing\.csv/);
  fs.rmSync(path.join(sliceDir(root), 'source.json'));
  assert.match(formatDiagrams(readDiagrams({ dataDir: root, name: 'sample' })), /source\.json is missing/);
});

// ---- check_diagram and write_diagram ----

test('check passes on the mock and writes nothing', async () => {
  const root = setup();
  const r = await checkDiagram(input(root));
  assert.equal(r.ok, true, r.errors?.join('\n'));
  assert.match(r.text, /nothing was written/);
  assert.equal(fs.existsSync(path.join(root, 'diagrams')), false);
});

test('write: the slice is written, read back, logged without contents, and the hashes are the writer\'s', async () => {
  const root = setup();
  const r = await writeDiagram(input(root));
  assert.equal(r.ok, true, r.errors?.join('\n'));
  assert.equal(r.changed, true);
  const written = snapshot(sliceDir(root));
  const fixture = snapshot(FIXTURE_SLICE);
  for (const f of Object.keys(fixture).filter((n) => n !== 'source.json')) assert.equal(written[f], fixture[f].replace(/\r\n/g, '\n'), f);
  const source = JSON.parse(written['source.json']);
  assert.deepEqual(source.stories.map((s) => [s.id, s.hash]), [['IAM-0001', 'baf514d489ee'], ['IAM-0002', 'ddf31b439280']]);
  assert.match(formatDiagrams(readDiagrams({ dataDir: root, name: 'sample' })), /up to date/);
  const [line] = logLines(root);
  assert.deepEqual([line.writer, line.store, line.backlog, line.slice], ['write_diagram', 'diagrams', 'sample', 'sign-in']);
  assert.ok(line.bytes > 0 && /^[0-9a-f]{12}$/.test(line.hash));
  assert.ok(!fs.readFileSync(path.join(root, 'logs', 'writes.jsonl'), 'utf8').includes('Sign in with email'), 'no diagram text in the log');
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
  assert.equal(logLines(root).length, 1, 'only the first write is logged');
});

test('write: a Title that does not match is refused and says what the ID holds', async () => {
  const root = setup();
  const r = await writeDiagram(input(root, { stories: [{ id: 'IAM-0001', title: 'Reset a password' }, PAIRS[1]] }));
  assert.equal(r.ok, false);
  assert.match(r.text, /IAM-0001 is now "Sign in with email" \(Identity and access > Sign in\), not "Reset a password"/);
  assert.equal(fs.existsSync(path.join(root, 'diagrams')), false);
  assert.match((await writeDiagram(input(root, { stories: [{ id: 'IAM-0001' }, PAIRS[1]] }))).text, /needs the story's current Title/);
});

test('write: a story of the scope that was not listed, and a story outside the scope, are refused', async () => {
  const root = setup();
  assert.match((await writeDiagram(input(root, { stories: [PAIRS[0]] }))).text, /"Reset a password" is in the scope but was not listed/);
  assert.match((await writeDiagram(input(root, { stories: [...PAIRS, { id: 'R-0001', title: 'Export a list as CSV' }] }))).text, /"Export a list as CSV" is not in the scope/);
  assert.match((await writeDiagram(input(root, { scope: { type: 'feature', epic: 'Identity and access', feature: 'Nowhere' } }))).text, /No story of sample\.csv is in the scope/);
});

test('write: a slice name that would leave the backlog\'s diagrams folder writes nothing', async () => {
  const root = setup();
  for (const slice of ['../escape', '..\\escape', 'a/b', 'UPPER', '']) {
    const r = await writeDiagram(input(root, { slice }));
    assert.equal(r.ok, false, slice);
    assert.match(r.text, /must be a lowercase slug/);
  }
  assert.equal(fs.existsSync(path.join(root, 'diagrams')), false);
  assert.equal(fs.existsSync(path.join(root, 'escape')), false);
});

test('write: one failing diagram writes nothing and every problem is listed', async () => {
  const root = setup();
  const files = fixtureFiles().map((f) => ({ ...f, content: f.content.replace('FORM->>AUTH: 1.2', 'FORM->>GHOST: 1.2').replace('<<service>>\n    +authenticate', '+authenticate') }));
  const r = await writeDiagram(input(root, { files }));
  assert.equal(r.ok, false);
  assert.match(r.text, /2 problems/);
  assert.match(r.text, /GHOST/);
  assert.match(r.text, /## Class diagram: AuthService has no stereotype/);
  assert.equal(fs.existsSync(path.join(root, 'diagrams')), false);
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
  const files = fixtureFiles().map((f) => (f.name === 'UC-sign-in.md' ? { ...f, content: f.content.replace('- IAM-0001 Sign in with email', '- ZZZ-9999 invented') } : f));
  assert.equal((await writeDiagram(input(root, { files }))).ok, true);
  const spec = fs.readFileSync(path.join(sliceDir(root), 'UC-sign-in.md'), 'utf8');
  assert.match(spec, /- IAM-0001 Sign in with email/);
  assert.doesNotMatch(spec, /ZZZ-9999/);
});

test('write: a document with a diagram that does not parse writes nothing and lists the parser message and line', async () => {
  const root = setup();
  const files = fixtureFiles().map((f) => ({ ...f, content: f.content.replace('MAILER-->>U: 2.10 reset link received', 'MAILER-->>>U: 2.10 reset link received') }));
  const r = await writeDiagram(input(root, { files }));
  assert.equal(r.ok, false);
  assert.match(r.text, /UC-sign-in\.md:\d+: ### Sequence: reset: does not parse as Mermaid: Parse error on line \d+/);
  assert.equal(fs.existsSync(path.join(root, 'diagrams')), false);
});

test('write: a second document is refused, naming the rule', async () => {
  const root = setup();
  const r = await writeDiagram(input(root, { files: [...fixtureFiles(), { name: 'UC-sign-in-extra.md', content: '# extra' }] }));
  assert.equal(r.ok, false);
  assert.match(r.text, /UC-sign-in-extra\.md: is not part of a slice: a slice is one document/);
});
