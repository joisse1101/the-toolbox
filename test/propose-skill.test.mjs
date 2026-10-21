import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProposals } from '../core/proposal-input.js';
import { loadBacklog } from '../core/model.js';
import { validateFindings } from '../core/review.js';
import { applyTermItems, parseLexicon } from '../core/lexicon.js';
import { emptySuggestions, validateItems } from '../core/lexicon-suggestions.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => fs.readFileSync(path.join(REPO, ...parts), 'utf8').replace(/\r\n/g, '\n');
const skill = (name) => read('.claude', 'skills', name, 'SKILL.md');
// The tool-call examples in propose-stories/SKILL.md: json blocks of { backlog, items }, in file order
// (new stories, a patch, a backlog edit, lexicon terms, lexicon suggestions).
const examples = () => [...skill('propose-stories').matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1]));

const HEAD = 'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes\r\n';
const BACKLOG =
  HEAD +
  'IAM-0001,Identity & Access Management,Auth,Log in with a password,"As a user, I want to log in, so that I can access the portal",5,High,,"AC1: Given a, when b, then c",\r\n';
const PROPOSALS = HEAD + 'NEW-3,Identity & Access Management,Auth,Send a welcome email,,,,,,\r\n';

test('the examples in propose-stories/SKILL.md are the five tool calls, each with a backlog and items', () => {
  const all = examples();
  assert.equal(all.length, 5, 'one example of new stories, one of a patch, one of a backlog edit, one of lexicon terms and one of lexicon suggestions');
  for (const call of all) {
    assert.equal(call.backlog, 'data-portal.csv');
    assert.ok(Array.isArray(call.items) && call.items.length);
  }
});

test('the new-stories example passes the writer\'s validation', () => {
  const r = buildProposals({
    input: examples()[0].items,
    backlog: loadBacklog(BACKLOG),
    proposals: loadBacklog(PROPOSALS, { placeholderIds: true }),
    requireTitles: true,
  });
  assert.deepEqual(r.errors, undefined);
  assert.equal(r.ok, true);
  assert.deepEqual(r.ids, ['NEW-4', 'NEW-5', 'NEW-6']);
  assert.deepEqual(r.stories.map((s) => s.dependsOn), [['IAM-0001'], ['NEW-4'], ['NEW-3']]);
});

test('explore-stories names no writer and neither skill copies the guidelines\' definitions', () => {
  const explore = skill('explore-stories');
  assert.doesNotMatch(explore, /write_proposals/);
  assert.match(explore.split('---')[1], /allowed-tools: mcp__story-tools__read_context, mcp__story-tools__search_stories\n$/);
  for (const text of [explore, skill('propose-stories')]) {
    assert.match(text, /guidelines\/product-backlog\.md/);
    assert.doesNotMatch(text, /INVEST (stands|means)|Independent, Negotiable/i);
  }
});

test('only the readers are pre-approved: check_drafts for the propose session, never a writer, and not in the read-only explore session', () => {
  const WRITERS = ['write_proposals', 'write_lexicon', 'write_review', 'suggest_lexicon_change'];
  const front = (text) => text.split('---')[1];
  for (const text of [skill('propose-stories'), read('.claude', 'commands', 'story', 'propose.md')]) {
    assert.match(front(text), /allowed-tools: mcp__story-tools__read_context, mcp__story-tools__search_stories, mcp__story-tools__check_drafts\n$/);
    for (const writer of WRITERS) assert.doesNotMatch(front(text), new RegExp(writer));
  }
  const allowed = (script) => read('ai', 'launchers', script).match(/--allowedTools ([^\n]*?)\s*`?\n/)[1];
  // read_file is a reader too; the sessions have no Read or Grep.
  assert.equal(allowed('shape-stories.ps1'), '"mcp__story-tools__read_context" "mcp__story-tools__search_stories" "mcp__story-tools__read_file" "mcp__story-tools__check_drafts"');
  assert.equal(allowed('explore-stories.ps1'), '"mcp__story-tools__read_context" "mcp__story-tools__search_stories" "mcp__story-tools__read_file"');
});

test('the propose skill and command check before asking, read every write back and recover from a mismatch', () => {
  const text = skill('propose-stories');
  const command = read('.claude', 'commands', 'story', 'propose.md');
  assert.match(text, /\*\*Check the drafts first\.\*\* Before you show anything for confirmation, call `check_drafts`/);
  assert.ok(text.indexOf('Check the drafts first') < text.indexOf('Ask one direct yes/no question'), 'the check comes before the question');
  assert.match(text, /## Verify every write/);
  const verify = text.split('## Verify every write')[1].split('## Report')[0];
  for (const reader of ['reviews', 'lexicon-suggestions']) assert.match(verify, new RegExp(`section \`${reader}\``));
  // The proposals and the lexicon are files now: read back with Grep (or Read), not a read_context section.
  for (const file of ['proposals', 'lexicon']) assert.match(verify, new RegExp(`\\| \`write_${file === 'proposals' ? 'proposals' : 'lexicon'}\` \\| the ${file} file, with \`Grep\``));
  assert.doesNotMatch(verify, /section `(proposals|lexicon)`/);
  assert.match(text, /only on the strength of a read made in the current turn/);
  assert.match(text, /send again \*\*only the missing part\*\*/);
  assert.match(text, /If the second read-back still does not match, stop and tell the user/);
  assert.match(text, /"As an approver, I want/);
  assert.doesNotMatch(text, /Run each call \*\*once\*\*/);
  assert.doesNotMatch(text, /new stories are added again|new stories would be added twice/);
  assert.match(command, /`check_drafts`/);
  assert.match(command, /read that file back in the same turn \(`read_context` for the review and the lexicon suggestions, `Read` or `Grep` for the proposals and the lexicon\)/);
  assert.match(command, /send again only the missing part/);
  assert.doesNotMatch(command, /run each call once/);
});

const FULL = (code, title) => `${code},Identity & Access Management,Auth,${title},"As a user, I want x, so that y",3,,,"AC1: Given a, when b, then c",\r\n`;

test('the patch example passes the writer\'s validation', () => {
  const input = examples()[1].items;
  assert.ok(input.every((item) => /^NEW-\d+$/.test(item.id)));
  const r = buildProposals({
    input,
    backlog: loadBacklog(BACKLOG),
    proposals: loadBacklog(HEAD + input.map((i) => FULL(i.id, i.storyTitle)).join(''), { placeholderIds: true }),
    requireTitles: true,
  });
  assert.deepEqual(r.errors, undefined);
  assert.deepEqual(r.patchedIds, input.map((i) => i.id));
});

test('the backlog edit example passes the review writer\'s validation, and the skill only appends', () => {
  const text = skill('propose-stories');
  const findings = examples()[2].items;
  assert.deepEqual(validateFindings(findings, loadBacklog(BACKLOG), { requireTitles: true }), []);
  assert.ok(findings.every((f) => f.action !== 'add-story' && !f.group), 'edits never create stories or groups');
  assert.match(text, /`write_review` always appends/);
  assert.match(text, /do not run an earlier call again once its read-back matched/);
  assert.doesNotMatch(text, /review-backlog\/SKILL\.md/, 'the row rules are in the tool description, not in a file the session cannot read');
});

test('the lexicon example passes the lexicon writer\'s validation, and the lexicon is written first', () => {
  const text = skill('propose-stories');
  const lexicon = parseLexicon('Term,Definition,Avoid\r\nRole,A set of privileges.,\r\n');
  const r = applyTermItems(lexicon, examples()[3].items);
  assert.deepEqual(r.errors, undefined);
  assert.deepEqual(r.added, ['Dataset', 'Dataset attribute', 'User']);
  const again = applyTermItems(r.lexicon, examples()[3].items);
  assert.match(again.errors[0], /is already a term: suggest a change to it with suggest_lexicon_change/, 'the example adds only');
  assert.match(text, /`write_lexicon` with the backlog file name/);
  assert.match(text, /run the lexicon writer first/);
  assert.doesNotMatch(text.split('---')[1], /write_/, 'the skill does not pre-approve the writers, so Claude Code asks');
});

test('both skills use the lexicon terms and flag gaps, and explore cannot write them', () => {
  for (const name of ['explore-stories', 'propose-stories']) {
    const text = skill(name);
    assert.match(text, /lexicon/i, name);
    assert.match(text, /`Avoid` column/, name);
    assert.match(text, /full name/, name);
  }
  assert.doesNotMatch(skill('explore-stories'), /write_lexicon/);
  assert.match(skill('explore-stories'), /Lexicon terms change only through `propose-stories`/);
});

test('propose-stories says to re-read first, to show old and new values, to prefer a patch and to size by the guideline', () => {
  const text = skill('propose-stories');
  assert.match(text, /At the start of every use, \*\*even if `explore-stories` already read the context/);
  for (const section of ['guidelines', 'index']) assert.match(text, new RegExp(`\`${section}\``), section);
  // The proposals and the lexicon are files read with Read and Grep; benched proposed stories are ignored, not filtered out by the reader.
  assert.match(text, /The proposals and the lexicon are not sections: they are files/);
  assert.match(text, /\*\*Ignore every proposed story whose `Benched` column is `Yes`\*\*/);
  assert.match(text, /old value/);
  assert.match(text, /Prefer a patch to a second story/);
  assert.match(text, /sprint-points-guideline\.md/);
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
  // The lexicon and proposals are read as files; benched proposed stories are ignored by instruction.
  assert.match(text, /The proposals and the lexicon are not sections: they are files you read with `Read` and `Grep`/);
  assert.match(text, /\*\*Ignore every proposed story whose `Benched` column is `Yes`\*\*/);
  assert.doesNotMatch(text, /`proposals` text|the `lexicon` section/);
});

test('the skills carry the process rules: shape question, term check, numbering, one complete text', () => {
  const explore = skill('explore-stories');
  const propose = skill('propose-stories');
  assert.match(explore, /Ask the shape-deciding question first/);
  assert.match(explore, /Check terms early/);
  assert.match(propose, /Check terms before drafting/);
  assert.match(propose, /Number the new stories in the order they will be written/);
  assert.match(propose, /one complete final text/);
  assert.match(propose, /Never refer to an earlier draft \("as before"/);
  assert.match(propose, /Print the drafts again, in the same turn and right before the call/);
  assert.match(propose, /split it by writer/);
});

test('the story skills and /story:propose mention no shell, heredoc, script or guard', () => {
  for (const text of [skill('explore-stories'), skill('propose-stories'), read('.claude', 'commands', 'story', 'propose.md')]) {
    assert.doesNotMatch(text, /Bash|heredoc|<<'JSON'|read-story-context\.mjs|write-\w+\.mjs|guard/i);
  }
});

test('the lexicon suggestion example passes the tool validation and the skill orders the writers', () => {
  const text = skill('propose-stories');
  const lexicon = parseLexicon('Term,Definition,Avoid\r\nRole,A set of privileges.,\r\nDataset,A table.,\r\nUser,A person with a login.,customer;member\r\n');
  const r = validateItems(lexicon, emptySuggestions(), examples()[4].items);
  assert.deepEqual(r.errors, undefined);
  assert.deepEqual(r.rows.map((x) => [x.action, x.avoid]), [['rename', ['Role', 'function']], ['delete', []], ['edit', []]]);
  assert.deepEqual(r.rows[2].edit.avoid.to, ['customer', 'member', 'account holder']);
  assert.match(text, /run the lexicon writer first \(so the stories can use the terms\), then `suggest_lexicon_change`, then the proposal writer, then the review writer/);
  assert.match(text, /only a suggestion the user applies in the Lexicon tab/);
  assert.doesNotMatch(text, /tell the user to use the Lexicon tab/);
  assert.doesNotMatch(text.split('---')[1], /suggest_lexicon_change/, 'the skill does not pre-approve the tool, so Claude Code asks');
  assert.match(read('.claude', 'commands', 'story', 'propose.md'), /suggest_lexicon_change/);
});

test('the story skills and the command name stories by Title, and say what to do on a mismatch', () => {
  const propose = skill('propose-stories');
  assert.match(propose, /## Name stories by Title/);
  const section = propose.split('## Name stories by Title')[1].split('## Draft the stories')[0];
  assert.match(section, /never the only name/);
  assert.match(section, /When a tool answers with a mismatch/);
  assert.match(section, /never send a pair the tool refused again/);
  for (const text of [skill('explore-stories'), propose]) assert.match(text, /storyTitle/);
  assert.match(skill('explore-stories'), /\*\*Name stories by Title\.\*\*/);
  assert.match(skill('explore-stories'), /Do not repeat a refused pair/);
  assert.match(read('.claude', 'commands', 'story', 'propose.md'), /`storyTitle`/);
  assert.match(skill('review-backlog'), /by Title/);
});
