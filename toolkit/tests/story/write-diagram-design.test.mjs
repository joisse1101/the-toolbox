import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sampleTree, slicesPath, backlogPath, SAMPLE_SLICE } from './helpers/backlog-tree.mjs';
import { tempProject } from './helpers/temp-project.mjs';
import { planSkillCopy } from './helpers/plan-skill.mjs';
import { criteriaTable } from '../../skills/jois-story-plan/diagrams/tasks.js';

// write-diagram.mjs and designs.json: a scope that designs.json links to a canvas needs the design field, and its Design lines are checked.
const plan = planSkillCopy();
const { checkDiagram, writeDiagram } = await plan.load('write-diagram.mjs');

const URL = 'https://claude.ai/artifact/abc123';
const CURRENT = 'T-streaks-current-count';
const SCOPE = { type: 'feature', epic: 'Habit tracking', feature: 'Streaks' };
const PAIRS = [{ id: 'H1-HT-0001', title: 'See the current streak' }, { id: 'H1-HT-0002', title: 'See the best streak' }];
const fixtureFiles = () => fs.readdirSync(SAMPLE_SLICE).filter((f) => f !== 'source.json').map((name) => ({ name, content: fs.readFileSync(path.join(SAMPLE_SLICE, name), 'utf8') }));
const withDesignLine = (links) => fixtureFiles().map((f) => (f.name === 'tasks.md' ? { ...f, content: f.content.replace(/\r\n/g, '\n').replace(/(Satisfies: AC-streaks-current .*\n)/, `$1  Design: ${links}\n`) } : f));

const document = fixtureFiles().find((f) => f.name === 'UC-streaks.md').content.replace(/\r\n/g, '\n');
const [currentRow, bestRow] = criteriaTable(document);
const indexObject = (scope = SCOPE) => ({
  version: 1,
  backlog: 'sample',
  scope,
  viewports: ['desktop'],
  stories: [
    { title: currentRow.story, criteria: [{ text: currentRow.text, kind: 'main', artboards: ['current-list-default-desktop'] }] },
    { title: bestRow.story, criteria: [{ text: bestRow.text, kind: 'main', artboards: [] }] },
  ],
});
const LINK = `${URL}#artboard-current-list-default-desktop`;

function setup({ pointer = { scope: SCOPE, url: URL } } = {}) {
  const root = sampleTree({ into: tempProject().dataDir });
  if (pointer) fs.writeFileSync(path.join(backlogPath(root, 'sample'), 'designs.json'), `${JSON.stringify({ designs: [pointer] })}\n`);
  return root;
}
const input = (root, over = {}) => ({ dataDir: root, name: 'sample', slice: 'streaks', scope: SCOPE, stories: PAIRS, files: fixtureFiles(), ...over });
const goodDesign = () => ({ url: URL, index: indexObject() });
const sliceDir = (root) => path.join(slicesPath(root, 'sample'), 'streaks');

test('a designed scope without the design field is refused by write and check, and no slice folder appears', async () => {
  const root = setup();
  const written = await writeDiagram(input(root));
  assert.equal(written.ok, false);
  assert.match(written.text, /designs\.json links the canvas https:\/\/claude\.ai\/artifact\/abc123 .*needs a design field/);
  assert.equal((await checkDiagram(input(root))).ok, false);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test('a screen task without a Design line is refused and an existing slice folder is left unchanged', async () => {
  const root = setup();
  fs.cpSync(SAMPLE_SLICE, sliceDir(root), { recursive: true });
  const listing = () => Object.fromEntries(fs.readdirSync(sliceDir(root)).sort().map((f) => [f, fs.readFileSync(path.join(sliceDir(root), f), 'utf8')]));
  const before = listing();
  const written = await writeDiagram(input(root, { design: goodDesign() }));
  assert.equal(written.ok, false);
  assert.match(written.text, new RegExp(`the task ${CURRENT} .*has no "Design:" line`));
  assert.deepEqual(listing(), before);
});

test('a designed scope with a valid Design line is written, and the index may be bare JSON text', async () => {
  const root = setup();
  const first = await writeDiagram(input(root, { design: goodDesign(), files: withDesignLine(LINK) }));
  assert.equal(first.ok, true, first.text);
  assert.match(fs.readFileSync(path.join(sliceDir(root), 'tasks.md'), 'utf8'), /Design: https:\/\/claude\.ai\/artifact\/abc123#artboard-current-list-default-desktop/);
  const again = await checkDiagram(input(root, { design: { url: URL, index: JSON.stringify(indexObject()) }, files: withDesignLine(LINK) }));
  assert.equal(again.ok, true, again.errors?.join('\n'));
});

test('a Design link to another canvas is refused and nothing is written', async () => {
  const root = setup();
  const link = 'https://claude.ai/artifact/other1#artboard-current-list-default-desktop';
  const written = await writeDiagram(input(root, { design: goodDesign(), files: withDesignLine(link) }));
  assert.equal(written.ok, false);
  assert.match(written.text, new RegExp(`the task ${CURRENT} .*Design link ${link.replace(/[.#]/g, '\\$&')}`));
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test('a design url that designs.json does not hold, an index for another scope, an out-of-date index and a malformed index are each refused', async () => {
  const root = setup();
  const files = withDesignLine(LINK);
  const stale = indexObject();
  stale.stories[0].criteria[0].text = 'Given something else, when x, then y.';
  const cases = [
    [{ url: 'https://claude.ai/artifact/other1', index: indexObject() }, /design\.url .* is not the canvas https:\/\/claude\.ai\/artifact\/abc123/],
    [{ url: URL, index: indexObject({ type: 'epic', epic: 'Habit tracking' }) }, /design\.index is for the scope/],
    [{ url: URL, index: stale }, /design\.index is out of date with the backlog \(changed: "See the current streak"\)/],
    [{ url: URL, index: { version: 2 } }, /design\.index is not a valid story index/],
  ];
  for (const [design, pattern] of cases) {
    const r = await writeDiagram(input(root, { design, files }));
    assert.equal(r.ok, false, String(pattern));
    assert.match(r.text, pattern);
  }
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});

test('without designs.json, or with no entry for the scope, the slice is written as before and a design field is ignored', async () => {
  for (const pointer of [null, { scope: { type: 'epic', epic: 'Other' }, url: URL }]) {
    const root = setup({ pointer });
    const r = await writeDiagram(input(root));
    assert.equal(r.ok, true, r.text);
    const second = await checkDiagram(input(root, { design: goodDesign() }));
    assert.equal(second.ok, true, second.errors?.join('\n'));
  }
});

test('a designs.json that is not valid JSON is refused and nothing is written', async () => {
  const root = setup({ pointer: null });
  fs.writeFileSync(path.join(backlogPath(root, 'sample'), 'designs.json'), '{ nope');
  const r = await writeDiagram(input(root));
  assert.equal(r.ok, false);
  assert.match(r.text, /designs\.json is not valid JSON/);
  assert.equal(fs.existsSync(slicesPath(root, 'sample')), false);
});
