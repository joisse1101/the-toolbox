import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sampleTree, FIXTURE_BACKLOG_CSV } from './helpers/backlog-tree.mjs';
import { loadBacklog } from '../../skills/jois-story-review/lib/backlog/model.js';
import { parseCsv } from '../../skills/jois-story-review/lib/backlog/csv.js';

// A backlog file may hold IDs that are not the ones the portal derives (epic initials + position): the sample backlog stores
// `B1-RPT-0001` for its Reporting story, and the portal would renumber it `B1-R-0001` on open. Every reader and every writer of the
// story skills must show and accept the same ID, the derived one, so a session never gets one form from a reader and a refusal
// of it from a writer. (Before this change the explore reader showed the stored ID and the writers wanted the derived one.)

const SKILLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills');
const script = (skill, name) => path.join(SKILLS, skill, name);

const csvText = fs.readFileSync(FIXTURE_BACKLOG_CSV, 'utf8');
const stored = parseCsv(csvText).slice(1).filter((r) => r.some(Boolean));
const derived = loadBacklog(csvText, { initials: 'B1' }).stories;
const reporting = derived.find((s) => s.title === 'Export a list as CSV');
const STORED_ID = stored.find((r) => r[3] === 'Export a list as CSV')[0];
const DERIVED_ID = reporting.code;

function run(root, skill, name, args, input) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'story-ids-config-'));
  const config = path.join(dir, 'planner.config.yaml');
  fs.writeFileSync(config, `dataDir: ${JSON.stringify(path.resolve(root))}\n`);
  return spawnSync(process.execPath, [script(skill, name), ...args], { encoding: 'utf8', input, env: { ...process.env, PLANNER_CONFIG: config } });
}

test('the fixture backlog stores an ID that differs from the derived one', () => {
  assert.equal(STORED_ID, 'B1-RPT-0001');
  assert.equal(DERIVED_ID, 'B1-R-0001');
});

for (const skill of ['jois-story-explore', 'jois-story-propose']) {
  test(`${skill}: read-story-context shows and accepts the derived ID only`, () => {
    const root = sampleTree();
    const read = (...args) => run(root, skill, 'read-story-context.mjs', args);

    const index = read('sample', '--section', 'index');
    assert.equal(index.status, 0, index.stderr);
    assert.match(index.stdout, new RegExp(`^${DERIVED_ID},Reporting,`, 'm'));
    assert.doesNotMatch(index.stdout, new RegExp(STORED_ID));

    const search = read('sample', '--search', 'export');
    assert.equal(search.status, 0, search.stderr);
    assert.match(search.stdout, new RegExp(`^${DERIVED_ID} \\| Export a list as CSV`, 'm'));

    const story = read('sample', DERIVED_ID, '--title', 'Export a list as CSV');
    assert.equal(story.status, 0, story.stderr);
    assert.match(story.stdout, new RegExp(`^${DERIVED_ID},Reporting,`, 'm'));

    const old = read('sample', STORED_ID, '--title', 'Export a list as CSV');
    assert.equal(old.status, 1, 'the stored form is not a story any more');

    const reviews = read('sample', '--section', 'reviews', `${DERIVED_ID}=Export a list as CSV`);
    assert.equal(reviews.status, 0, reviews.stderr);
  });
}

test('jois-story-review: read-backlog shows the derived ID', () => {
  const root = sampleTree();
  const out = run(root, 'jois-story-review', 'read-backlog.mjs', ['sample', 'epic-2']);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, new RegExp(`^${DERIVED_ID},Reporting,`, 'm'));
  assert.doesNotMatch(out.stdout, new RegExp(STORED_ID));
});

const REVIEW_ROW = (id) => JSON.stringify([{
  storyId: id, storyTitle: 'Export a list as CSV', field: 'Notes', action: 'replace', suggested: 'Exports use UTF-8',
  reason: 'Agreed in the session.', area: 'INVEST', confidence: 'ready', group: '',
}]);

for (const skill of ['jois-story-review', 'jois-story-propose']) {
  test(`${skill}: write-review --check accepts the derived ID and refuses the stored one`, () => {
    const root = sampleTree();
    const ok = run(root, skill, 'write-review.mjs', ['sample', '--append', '--check'], REVIEW_ROW(DERIVED_ID));
    assert.equal(ok.status, 0, ok.stderr);
    const old = run(root, skill, 'write-review.mjs', ['sample', '--append', '--check'], REVIEW_ROW(STORED_ID));
    assert.equal(old.status, 1);
  });
}

const PROPOSAL = (dependsOnId) => JSON.stringify([{
  epic: 'Reporting', feature: 'Exports', title: 'Schedule a CSV export',
  userStory: 'As an analyst, I want to schedule a CSV export, so that I get it every Monday',
  points: 3, dependsOn: [{ id: dependsOnId, title: 'Export a list as CSV' }],
  criteria: ['AC1: Given a schedule, when Monday comes, then the export is sent', 'AC2: Given the export fails, when Monday comes, then the failure is recorded'],
}]);

test('jois-story-propose: write-proposal --check accepts the derived ID in dependsOn and refuses the stored one', () => {
  const root = sampleTree();
  const ok = run(root, 'jois-story-propose', 'write-proposal.mjs', ['sample', '--check'], PROPOSAL(DERIVED_ID));
  assert.equal(ok.status, 0, ok.stderr);
  const old = run(root, 'jois-story-propose', 'write-proposal.mjs', ['sample', '--check'], PROPOSAL(STORED_ID));
  assert.equal(old.status, 1);
});
