import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sampleTree, slicesPath, backlogPath, SAMPLE_SLICE } from './helpers/backlog-tree.mjs';
import { tempProject } from './helpers/temp-project.mjs';
import { planSkillCopy } from './helpers/plan-skill.mjs';

// write-diagram.mjs reads design-index.csv and designs.json itself: a designed scope needs rows for every story, the Design lines are
// built from the rows' Canvas and stems, and the old `design` input field is refused. The mock design files are the fixtures' (a made-up canvas).
const plan = planSkillCopy();
const { checkDiagram, writeDiagram } = await plan.load('write-diagram.mjs');

const URL = 'https://claude.ai/artifact/mockhabits0001';
const CURRENT = 'T-streaks-current-count';
const SCOPE = { type: 'feature', epic: 'Habit tracking', feature: 'Streaks' };
const PAIRS = [{ id: 'H1-HT-0001', title: 'See the current streak' }, { id: 'H1-HT-0002', title: 'See the best streak' }];
const fixtureFiles = () => fs.readdirSync(SAMPLE_SLICE).filter((f) => f !== 'source.json').map((name) => ({ name, content: fs.readFileSync(path.join(SAMPLE_SLICE, name), 'utf8') }));
const LINK = `${URL}#artboard-streaks-list-default-desktop`;
const BEST_LINK = `${URL}#artboard-streaks-best-error-desktop`;
// The fixture gives both criteria artboards, so each screen task needs its line: `links` for the current task, the error board for the best one.
const withDesignLine = (links, best = BEST_LINK) => fixtureFiles().map((f) => (f.name === 'tasks.md'
  ? { ...f, content: f.content.replace(/\r\n/g, '\n').replace(/(Satisfies: AC-streaks-current .*\n)/, `$1  Design: ${links}\n`).replace(/(Satisfies: AC-streaks-best .*\n)/, `$1  Design: ${best}\n`) }
  : f));
const INDEX = (root) => path.join(backlogPath(root, 'sample'), 'design-index.csv');
const DESIGNS = (root) => path.join(backlogPath(root, 'sample'), 'designs.json');

// The sample backlog with the fixture's design files; `keep` lists which of the two stay.
function setup({ keep = ['design-index.csv', 'designs.json'] } = {}) {
  const root = sampleTree({ into: tempProject().dataDir, withDesign: true });
  for (const f of ['design-index.csv', 'designs.json']) if (!keep.includes(f)) fs.rmSync(path.join(backlogPath(root, 'sample'), f));
  return root;
}
const input = (root, over = {}) => ({ dataDir: root, name: 'sample', slice: 'streaks', scope: SCOPE, stories: PAIRS, files: fixtureFiles(), ...over });
const sliceDir = (root) => path.join(slicesPath(root, 'sample'), 'streaks');
const listing = (dir) => Object.fromEntries(fs.readdirSync(dir).sort().map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
const editIndex = (root, edit) => fs.writeFileSync(INDEX(root), edit(fs.readFileSync(INDEX(root), 'utf8')));
const messageOf = (r) => r.text ?? r.errors.join('\n');

test('a screen task without a Design line is refused and an existing slice folder is left unchanged', async () => {
  const root = setup();
  fs.cpSync(SAMPLE_SLICE, sliceDir(root), { recursive: true });
  const before = listing(sliceDir(root));
  const written = await writeDiagram(input(root));
  assert.equal(written.ok, false);
  assert.match(written.text, new RegExp(`the task ${CURRENT} .*has no "Design:" line`));
  assert.deepEqual(listing(sliceDir(root)), before);
});

test('a designed scope with a valid Design line is written and checked, with no design field sent', async () => {
  const root = setup();
  const first = await writeDiagram(input(root, { files: withDesignLine(LINK) }));
  assert.equal(first.ok, true, first.text);
  assert.match(fs.readFileSync(path.join(sliceDir(root), 'tasks.md'), 'utf8'), /Design: https:\/\/claude\.ai\/artifact\/mockhabits0001#artboard-streaks-list-default-desktop/);
  const again = await checkDiagram(input(root, { files: withDesignLine(`${LINK}, ${URL}#artboard-streaks-list-default-mobile`) }));
  assert.equal(again.ok, true, again.errors?.join('\n'));
});

test('a Design link to another canvas is refused and nothing is written', async () => {
  const root = setup();
  const link = 'https://claude.ai/artifact/other1#artboard-streaks-list-default-desktop';
  const written = await writeDiagram(input(root, { files: withDesignLine(link) }));
  assert.equal(written.ok, false);
  assert.match(written.text, new RegExp(`the task ${CURRENT} .*Design link ${link.replace(/[.#]/g, '\\$&')}`));
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test('a Design link to an artboard of another criterion is refused naming the task and the link', async () => {
  const root = setup();
  const link = `${URL}#artboard-streaks-best-error-desktop`;
  const checked = await checkDiagram(input(root, { files: withDesignLine(link) }));
  assert.equal(checked.ok, false);
  assert.match(checked.errors.join('\n'), new RegExp(`the task ${CURRENT} .*Design link ${link}, which is not an artboard of a criterion the task satisfies`));
});

test('a story of a designed scope that has no rows is refused naming the story, and nothing is written', async () => {
  const root = setup();
  editIndex(root, (text) => text.split(/\r?\n/).filter((line) => !line.startsWith('H1-HT-0002')).join('\r\n'));
  for (const run of [writeDiagram, checkDiagram]) {
    const r = await run(input(root, { files: withDesignLine(LINK) }));
    assert.equal(r.ok, false);
    assert.match(messageOf(r), /The story "See the best streak" \(H1-HT-0002\) is in a scope that designs\.json links to a canvas, and design-index\.csv has no row for it/);
  }
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test('a designs.json with no design-index.csv refuses every story of the scope', async () => {
  const root = setup({ keep: ['designs.json'] });
  const r = await checkDiagram(input(root));
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /"See the current streak" \(H1-HT-0001\).*has no row for it/);
});

test('the old design field is refused with a message that names design-index.csv, and nothing is written', async () => {
  const root = setup();
  for (const run of [writeDiagram, checkDiagram]) {
    const r = await run(input(root, { files: withDesignLine(LINK), design: { url: URL, index: '{}' } }));
    assert.equal(r.ok, false);
    assert.match(messageOf(r), /design field, which is no longer read: the writer reads design-index\.csv and designs\.json/);
  }
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test("a row whose canvas designs.json does not list passes, and its Design line is built from the row's own Canvas", async () => {
  const root = setup({ keep: ['design-index.csv'] });
  const r = await writeDiagram(input(root, { files: withDesignLine(LINK) }));
  assert.equal(r.ok, true, r.text);
  assert.match(fs.readFileSync(path.join(sliceDir(root), 'tasks.md'), 'utf8'), /Design: https:\/\/claude\.ai\/artifact\/mockhabits0001#artboard-streaks-list-default-desktop/);
});

test('a designs.json entry for another scope leaves the slice written as before when no row names its stories', async () => {
  const root = setup({ keep: ['designs.json'] });
  fs.writeFileSync(DESIGNS(root), JSON.stringify({ designs: [{ scope: { type: 'epic', epic: 'Other' }, url: URL }] }));
  const r = await writeDiagram(input(root));
  assert.equal(r.ok, true, messageOf(r));
});

test('without design-index.csv and designs.json the slice is written as before', async () => {
  const root = setup({ keep: [] });
  const r = await writeDiagram(input(root));
  assert.equal(r.ok, true, messageOf(r));
});

test('rows that no longer match the backlog are refused and point to the update-index mode', async () => {
  const root = setup();
  editIndex(root, (text) => text.replace('then it shows a streak of 3.', 'then it shows a streak of 4.'));
  const r = await checkDiagram(input(root, { files: withDesignLine(LINK) }));
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /design-index\.csv is out of date for "See the current streak" \(H1-HT-0001\).*update-index mode of jois-story-design/);
});

test('an unreadable design-index.csv or designs.json is refused naming the file, and nothing is written', async () => {
  const root = setup();
  editIndex(root, (text) => text.replace(',main,', ',primary,'));
  const csv = await writeDiagram(input(root, { files: withDesignLine(LINK) }));
  assert.equal(csv.ok, false);
  assert.match(csv.text, /design-index\.csv cannot be read: row 2: column "Kind"/);
  fs.writeFileSync(DESIGNS(root), '{ nope');
  editIndex(root, (text) => text.replace(',primary,', ',main,'));
  const json = await writeDiagram(input(root));
  assert.equal(json.ok, false);
  assert.match(json.text, /designs\.json cannot be read: it is not valid JSON/);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});
