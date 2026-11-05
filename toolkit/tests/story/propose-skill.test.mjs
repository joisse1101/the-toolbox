import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProposals } from '../../skills/jois-story-propose/proposal-input.js';
import { loadBacklog } from '../../skills/jois-story-propose/lib/backlog/model.js';
import { validateFindings } from '../../skills/jois-story-propose/lib/review/review.js';
import { applyTermItems, parseLexicon } from '../../skills/jois-story-propose/lib/lexicon/lexicon.js';
import { emptySuggestions, validateItems } from '../../skills/jois-story-propose/lib/lexicon/lexicon-suggestions.js';

const TOOLKIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILLS = path.join(TOOLKIT, 'skills');
const read = (...parts) => fs.readFileSync(path.join(SKILLS, ...parts), 'utf8').replace(/\r\n/g, '\n');
const text = read('jois-story-propose', 'SKILL.md');
const front = text.split('---')[1];
// The JSON examples in SKILL.md, in file order: new stories, a patch, a backlog edit, lexicon terms, lexicon suggestions.
// Each one is the list a writer takes on standard input.
const examples = () => [...text.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1]));

const HEAD = 'ID,Epic,Feature,Title,User Story,Sprint points,Priority,Depends On,User Acceptance Criteria,Notes\r\n';
const BACKLOG =
  HEAD +
  'B1-IAM-0001,Identity & Access Management,Auth,Log in with a password,"As a user, I want to log in, so that I can access the portal",5,High,,"AC1: Given a, when b, then c",\r\n';
const PROPOSALS = HEAD + 'NEW-3,Identity & Access Management,Auth,Send a welcome email,,,,,,\r\n';
const FULL = (code, title) => `${code},Identity & Access Management,Auth,${title},"As a user, I want x, so that y",3,,,"AC1: Given a, when b, then c",\r\n`;

test('the skill is named jois-story-propose, versioned, and may run only its five scripts and the init script', () => {
  assert.match(front, /^name: jois-story-propose$/m);
  assert.match(front, /version: "1\.1\.0"/);
  assert.match(front, /last_updated: "2026-11-05"/);
  assert.match(front, /^allowed-tools: Bash\(node \*read-story-context\.mjs\*\), Bash\(node \*write-proposal\.mjs\*\), Bash\(node \*write-lexicon\.mjs\*\), Bash\(node \*suggest-lexicon\.mjs\*\), Bash\(node \*write-review\.mjs\*\), Bash\(node \*init-plans\.mjs\*\)$/m);
  assert.doesNotMatch(front, /mcp__/);
});

test('every script the skill names ships in its folder, and every writer is run with --check', () => {
  for (const script of ['read-story-context.mjs', 'write-proposal.mjs', 'write-lexicon.mjs', 'suggest-lexicon.mjs', 'write-review.mjs']) {
    assert.ok(fs.existsSync(path.join(SKILLS, 'jois-story-propose', script)), script);
    assert.match(text, new RegExp(script.replace('.', '\\.')), script);
  }
  const check = text.split('## Confirm before writing')[1].split('1. Show everything')[0];
  for (const writer of ['write-lexicon.mjs <backlog> --check', 'suggest-lexicon.mjs <backlog> --check', 'write-proposal.mjs <backlog> --check', 'write-review.mjs <backlog> --append --check']) {
    assert.ok(check.includes(writer), writer);
  }
});

test('the skill names no retired tool, launcher or old skill name, and has a Data folder section', () => {
  assert.doesNotMatch(text, /mcp__|read_context|read_file|search_stories|check_drafts|write_proposals|write_lexicon|write_review|suggest_lexicon_change|shape-stories|plan-stories|explore-stories|propose-stories|\/story:|planner\/guidelines|planner\/data|lexicon-suggestions\/<backlog name>/);
  assert.match(text, /## Data folder/);
  assert.match(text, /PLANNER_CONFIG/);
  assert.match(text, /`<skill folder>`/);
});

test('the examples are the five lists of the writers', () => {
  const all = examples();
  assert.equal(all.length, 5, 'one example of new stories, one of a patch, one of a backlog edit, one of lexicon terms and one of lexicon suggestions');
  for (const list of all) assert.ok(Array.isArray(list) && list.length);
});

test('the new-stories example passes the writer\'s validation', () => {
  const r = buildProposals({
    input: examples()[0],
    backlog: loadBacklog(BACKLOG, { initials: 'B1' }),
    proposals: loadBacklog(PROPOSALS, { placeholderIds: true, initials: 'B1' }),
    requireTitles: true,
  });
  assert.deepEqual(r.errors, undefined);
  assert.equal(r.ok, true);
  assert.deepEqual(r.ids, ['NEW-4', 'NEW-5', 'NEW-6']);
  assert.deepEqual(r.stories.map((s) => s.dependsOn), [['B1-IAM-0001'], ['NEW-4'], ['NEW-3']]);
});

test('the patch example passes the writer\'s validation', () => {
  const input = examples()[1];
  assert.ok(input.every((item) => /^NEW-\d+$/.test(item.id)));
  const r = buildProposals({
    input,
    backlog: loadBacklog(BACKLOG, { initials: 'B1' }),
    proposals: loadBacklog(HEAD + input.map((i) => FULL(i.id, i.storyTitle)).join(''), { placeholderIds: true, initials: 'B1' }),
    requireTitles: true,
  });
  assert.deepEqual(r.errors, undefined);
  assert.deepEqual(r.patchedIds, input.map((i) => i.id));
});

test('the backlog edit example passes the review writer\'s validation, and the skill only appends', () => {
  const findings = examples()[2];
  assert.deepEqual(validateFindings(findings, loadBacklog(BACKLOG, { initials: 'B1' }), { requireTitles: true }), []);
  assert.ok(findings.every((f) => f.action !== 'add-story' && !f.group), 'edits never create stories or groups');
  assert.match(text, /Always `--append`/);
  assert.match(text, /do not run an earlier command again once its read-back matched/);
});

test('the lexicon example passes the lexicon writer\'s validation, and the lexicon is written first', () => {
  const lexicon = parseLexicon('Term,Definition,Avoid\r\nRole,A set of privileges.,\r\n');
  const r = applyTermItems(lexicon, examples()[3]);
  assert.deepEqual(r.errors, undefined);
  assert.deepEqual(r.added, ['Dataset', 'Dataset attribute', 'User']);
  const again = applyTermItems(r.lexicon, examples()[3]);
  assert.match(again.errors[0], /is already a term: suggest a change to it with suggest-lexicon.mjs/, 'the example adds only');
  assert.match(text, /run the lexicon writer first \(so the stories can use the terms\), then `suggest-lexicon\.mjs`, then the proposal writer, then the review writer/);
});

test('the lexicon suggestion example passes the validation and the skill says the user applies it', () => {
  const lexicon = parseLexicon('Term,Definition,Avoid\r\nRole,A set of privileges.,\r\nDataset,A table.,\r\nUser,A person with a login.,customer;member\r\n');
  const r = validateItems(lexicon, emptySuggestions(), examples()[4]);
  assert.deepEqual(r.errors, undefined);
  assert.deepEqual(r.rows.map((x) => [x.action, x.avoid]), [['rename', ['Role', 'function']], ['delete', []], ['edit', []]]);
  assert.deepEqual(r.rows[2].edit.avoid.to, ['customer', 'member', 'account holder']);
  assert.match(text, /only a suggestion the user applies in the Lexicon tab/);
  assert.match(text, /A delete is refused on Apply while another term is part of it/);
});

test('the skill checks before asking, asks one yes/no, reads every write back and recovers from a mismatch', () => {
  assert.match(text, /\*\*Check the drafts first\.\*\* Before you show anything for confirmation, run each writer you are about to use with `--check`/);
  assert.ok(text.indexOf('Check the drafts first') < text.indexOf('Ask one direct yes/no question'), 'the check comes before the question');
  assert.match(text, /Ask one direct yes\/no question that covers everything shown/);
  assert.match(text, /Write only after the user answers yes in a separate message/);
  assert.match(text, /## Verify every write/);
  const verify = text.split('## Verify every write')[1].split('## Report')[0];
  assert.match(verify, /`write-proposal\.mjs` \| the proposals, with `--file proposals --pattern <NEW-ID>`/);
  assert.match(verify, /`write-lexicon\.mjs` \| the lexicon, with `--file lexicon --pattern <term>`/);
  assert.match(verify, /`write-review\.mjs` \| `--section reviews <ID>=<Title> \.\.\.`/);
  assert.match(verify, /`suggest-lexicon\.mjs` \| `--section lexicon-suggestions`/);
  assert.match(verify, /only on the strength of a read made in the current turn/);
  assert.match(verify, /send again \*\*only the missing part\*\*/);
  assert.match(verify, /If the second read-back still does not match, stop and tell the user/);
  assert.match(text, /"As an approver, I want/);
});

test('the skill reads the context at the start, shows old and new values, prefers a patch and sizes by the guideline', () => {
  assert.match(text, /At the start of every use, \*\*even if `jois-story-explore` already read the context/);
  for (const section of ['guidelines', 'index', 'reviews', 'lexicon-suggestions']) assert.match(text, new RegExp(`--section ${section}`), section);
  assert.match(text, /The proposals and the lexicon are not sections: they are files/);
  assert.match(text, /\*\*Ignore every proposed story whose `Benched` column is `Yes`\*\*/);
  assert.match(text, /old value/);
  assert.match(text, /Prefer a patch to a second story/);
  assert.match(text, /references\/product-backlog\.md/);
  assert.match(text, /references\/sprint-points-guideline\.md/);
  assert.doesNotMatch(text, /INVEST (stands|means)|Independent, Negotiable/i);
  assert.match(text, /added and patched/);
});

test('the skill carries the process rules: term check, numbering, one complete text, split by writer', () => {
  assert.match(text, /Check terms before drafting/);
  assert.match(text, /Number the new stories in the order they will be written/);
  assert.match(text, /one complete final text/);
  assert.match(text, /Never refer to an earlier draft \("as before"/);
  assert.match(text, /Print the drafts again, in the same turn and right before the command/);
  assert.match(text, /split it by writer/);
  assert.match(text, /`<backlog>\/lexicon\.csv`/);
});

test('the skill names stories by Title, passes the Title with every ID and says what to do on a mismatch', () => {
  assert.match(text, /## Name stories by Title/);
  const section = text.split('## Name stories by Title')[1].split('## Draft the stories')[0];
  assert.match(section, /never the only name/);
  assert.match(section, /\*\*Pass the Title with every story ID\*\*/);
  assert.match(section, /--title "<Title>"/);
  assert.match(section, /When a script answers with a mismatch/);
  assert.match(section, /never send a pair the script refused again/);
  assert.match(text, /storyTitle/);
  assert.match(read('jois-story-review', 'SKILL.md'), /by Title/);
});

test('the bundled copies of the explore reader and the review writer are the originals, byte for byte', () => {
  assert.equal(read('jois-story-propose', 'read-story-context.mjs'), read('jois-story-explore', 'read-story-context.mjs'));
  assert.equal(read('jois-story-propose', 'write-review.mjs'), read('jois-story-review', 'write-review.mjs'));
});
