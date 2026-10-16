import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProposals } from '../core/proposal-input.js';
import { loadBacklog } from '../core/model.js';
import { validateFindings } from '../core/review.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = (name) => fs.readFileSync(path.join(REPO, '.claude', 'skills', name, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');

const HEAD = 'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes\r\n';
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

const FULL = (code) => `${code},Identity & Access Management,Auth,Earlier idea,"As a user, I want x, so that y",3,,,"AC1: Given a, when b, then c",\r\n`;

test('the patch example in propose-stories/SKILL.md passes the writer\'s validation', () => {
  const all = [...skill('propose-stories').matchAll(/<<'JSON'\n([\s\S]*?)\nJSON\n```/g)];
  assert.equal(all.length, 3, 'one example of new stories, one of a patch and one of a backlog edit');
  const input = JSON.parse(all[1][1]);
  assert.ok(input.every((item) => /^NEW-\d+$/.test(item.id)));
  const r = buildProposals({
    input,
    backlog: loadBacklog(BACKLOG),
    proposals: loadBacklog(HEAD + input.map((i) => FULL(i.id)).join(''), { placeholderIds: true }),
  });
  assert.deepEqual(r.errors, undefined);
  assert.deepEqual(r.patchedIds, input.map((i) => i.id));
});

test('the backlog edit example in propose-stories/SKILL.md passes the review writer\'s validation, and the skill uses --append only', () => {
  const text = skill('propose-stories');
  const all = [...text.matchAll(/<<'JSON'\n([\s\S]*?)\nJSON\n```/g)];
  const findings = JSON.parse(all[2][1]);
  assert.deepEqual(validateFindings(findings, loadBacklog(BACKLOG)), []);
  assert.ok(findings.every((f) => f.action !== 'add-story' && !f.group), 'edits never create stories or groups');
  assert.match(text, /write-review\.mjs data-portal\.csv --append <<'JSON'/);
  assert.doesNotMatch(text, /write-review\.mjs [^\n]*?\.csv <<'JSON'/);
  assert.match(text, /Always `--append`/);
  assert.match(text, /never run the first command again/);
});

test('propose-stories says to re-read first, to show old and new values, to prefer a patch and to size by the guideline', () => {
  const text = skill('propose-stories');
  assert.match(text, /at the start of every use, \*\*even if `explore-stories` already ran it/);
  assert.match(text, /old value/);
  assert.match(text, /Prefer a patch to a second story/);
  assert.match(text, /sprint-points-guideline\.md/);
  assert.doesNotMatch(text, /The writer only adds/);
  assert.match(text, /added and patched/);
});

test('explore-stories sizes by the printed guideline and says proposals change only through propose-stories', () => {
  const text = skill('explore-stories');
  assert.match(text, /sprint-points-guideline\.md/);
  assert.match(text, /change only through `propose-stories`/);
  assert.match(text, /do not suggest adding a second story/);
});

test('explore-stories asks only for what is missing and opens a proposed story on its current text', () => {
  const text = skill('explore-stories');
  assert.match(text, /Ask only for what is missing, backlog first/);
  assert.match(text, /AskUserQuestion/);
  assert.match(text, /Ask neither question/);
  assert.match(text, /start by showing it as it is now.*"What should change\?"/);
  assert.doesNotMatch(text, /decided first/);
});
