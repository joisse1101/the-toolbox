import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProposals } from '../core/proposal-input.js';
import { loadBacklog } from '../core/model.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = (name) => fs.readFileSync(path.join(REPO, '.claude', 'skills', name, 'SKILL.md'), 'utf8');

const HEAD = 'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,Acceptance Criteria,Notes\r\n';
const BACKLOG =
  HEAD +
  'IAM-0001,Identity & Access Management,Auth,Login,"As a user, I want to log in, so that I can access the portal",5,High,,"AC1: Given a, when b, then c",\r\n';
const PROPOSALS = HEAD + 'NEW-3,Identity & Access Management,Auth,Earlier idea,,,,,,\r\n';

test('the example in propose-stories/SKILL.md passes the writer\'s validation', () => {
  const text = skill('propose-stories');
  const m = /<<'JSON'\n([\s\S]*?)\nJSON\n```/.exec(text);
  assert.ok(m, 'the example heredoc is in the file');
  const input = JSON.parse(m[1]);
  const r = buildProposals({
    input,
    backlog: loadBacklog(BACKLOG),
    proposals: loadBacklog(PROPOSALS, { placeholderIds: true }),
  });
  assert.deepEqual(r.errors, undefined);
  assert.equal(r.ok, true);
  assert.deepEqual(r.ids, ['NEW-4', 'NEW-5', 'NEW-6']);
  assert.deepEqual(r.stories.map((s) => s.dependsOn), [['IAM-0001'], ['NEW-4'], ['NEW-3']]);
});

test('explore-stories names no writer and neither skill copies the guidelines\' definitions', () => {
  const explore = skill('explore-stories');
  assert.doesNotMatch(explore, /write-proposal/);
  assert.match(explore.split('---')[1], /allowed-tools: Bash\(node \.claude\/skills\/explore-stories\/read-story-context\.mjs:\*\)\n$/);
  for (const text of [explore, skill('propose-stories')]) {
    assert.match(text, /guidelines\/product-backlog\.md/);
    assert.doesNotMatch(text, /INVEST (stands|means)|Independent, Negotiable/i);
  }
});
