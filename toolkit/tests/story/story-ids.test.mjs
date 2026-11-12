import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sampleTree, putFile, FIXTURE_BACKLOG_CSV } from './helpers/backlog-tree.mjs';
import { loadBacklog } from '../../skills/jois-story-review/lib/backlog/model.js';
import { parseCsv } from '../../skills/jois-story-review/lib/backlog/csv.js';

// A backlog file may hold IDs that are not the ones the portal derives (epic initials + position): the sample backlog stores
// `H1-FOC-0001` for its Focus timer story, and the portal would renumber it `H1-FT-0001` on open. Every reader and every writer of the
// story skills must show and accept the same ID, the derived one, so a session never gets one form from a reader and a refusal
// of it from a writer. (Before this change the explore reader showed the stored ID and the writers wanted the derived one.)

const SKILLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills');
const script = (skill, name) => path.join(SKILLS, skill, name);

// The accepted backlog of the sample holds the derived IDs, so the test makes the drift itself: a stored ID the portal would renumber.
const csvText = fs.readFileSync(FIXTURE_BACKLOG_CSV, 'utf8').replace('H1-FT-0001', 'H1-FOC-0001');
const driftedTree = () => {
  const root = sampleTree();
  putFile(root, 'sample', 'backlog', csvText);
  return root;
};
const stored = parseCsv(csvText).slice(1).filter((r) => r.some(Boolean));
const derived = loadBacklog(csvText, { initials: 'H1' }).stories;
const reporting = derived.find((s) => s.title === 'Count focus sessions by category');
const STORED_ID = stored.find((r) => r[3] === 'Count focus sessions by category')[0];
const DERIVED_ID = reporting.code;

function run(root, skill, name, args, input) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'story-ids-config-'));
  const config = path.join(dir, 'planner.config.yaml');
  fs.writeFileSync(config, `dataDir: ${JSON.stringify(path.resolve(root))}\n`);
  return spawnSync(process.execPath, [script(skill, name), ...args], { encoding: 'utf8', input, env: { ...process.env, PLANNER_CONFIG: config } });
}

test('the fixture backlog stores an ID that differs from the derived one', () => {
  assert.equal(STORED_ID, 'H1-FOC-0001');
  assert.equal(DERIVED_ID, 'H1-FT-0001');
});

for (const skill of ['jois-story-explore', 'jois-story-propose']) {
  test(`${skill}: read-story-context shows and accepts the derived ID only`, () => {
    const root = driftedTree();
    const read = (...args) => run(root, skill, 'read-story-context.mjs', args);

    const index = read('sample', '--section', 'index');
    assert.equal(index.status, 0, index.stderr);
    assert.match(index.stdout, new RegExp(`^${DERIVED_ID},Focus timer,`, 'm'));
    assert.doesNotMatch(index.stdout, new RegExp(STORED_ID));

    const search = read('sample', '--search', 'sessions');
    assert.equal(search.status, 0, search.stderr);
    assert.match(search.stdout, new RegExp(`^${DERIVED_ID} \\| Count focus sessions by category`, 'm'));

    const story = read('sample', DERIVED_ID, '--title', 'Count focus sessions by category');
    assert.equal(story.status, 0, story.stderr);
    assert.match(story.stdout, new RegExp(`^${DERIVED_ID},Focus timer,`, 'm'));

    const old = read('sample', STORED_ID, '--title', 'Count focus sessions by category');
    assert.equal(old.status, 1, 'the stored form is not a story any more');

    const reviews = read('sample', '--section', 'reviews', `${DERIVED_ID}=Count focus sessions by category`);
    assert.equal(reviews.status, 0, reviews.stderr);
  });
}

test('jois-story-review: read-backlog shows the derived ID', () => {
  const root = driftedTree();
  const out = run(root, 'jois-story-review', 'read-backlog.mjs', ['sample', 'epic-2']);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, new RegExp(`^${DERIVED_ID},Focus timer,`, 'm'));
  assert.doesNotMatch(out.stdout, new RegExp(STORED_ID));
});

const REVIEW_ROW = (id) => JSON.stringify([{
  storyId: id, storyTitle: 'Count focus sessions by category', field: 'Notes', action: 'replace', suggested: 'Exports use UTF-8',
  reason: 'Agreed in the session.', area: 'INVEST', confidence: 'ready', group: '',
}]);

for (const skill of ['jois-story-review', 'jois-story-propose']) {
  test(`${skill}: write-review --check accepts the derived ID and refuses the stored one`, () => {
    const root = driftedTree();
    const ok = run(root, skill, 'write-review.mjs', ['sample', '--append', '--check'], REVIEW_ROW(DERIVED_ID));
    assert.equal(ok.status, 0, ok.stderr);
    const old = run(root, skill, 'write-review.mjs', ['sample', '--append', '--check'], REVIEW_ROW(STORED_ID));
    assert.equal(old.status, 1);
  });
}

const PROPOSAL = (dependsOnId) => JSON.stringify([{
  epic: 'Focus timer', feature: 'Categories', title: 'Show a weekly focus summary',
  userStory: 'As a person who focuses in sessions, I want a weekly summary, so that I see my week',
  points: 3, dependsOn: [{ id: dependsOnId, title: 'Count focus sessions by category' }],
  criteria: ['AC1: Given a week of sessions, when I open the summary, then it lists each day', 'AC2: Given no sessions, when I open the summary, then it says so'],
}]);

test('jois-story-propose: write-proposal --check accepts the derived ID in dependsOn and refuses the stored one', () => {
  const root = driftedTree();
  const ok = run(root, 'jois-story-propose', 'write-proposal.mjs', ['sample', '--check'], PROPOSAL(DERIVED_ID));
  assert.equal(ok.status, 0, ok.stderr);
  const old = run(root, 'jois-story-propose', 'write-proposal.mjs', ['sample', '--check'], PROPOSAL(STORED_ID));
  assert.equal(old.status, 1);
});
