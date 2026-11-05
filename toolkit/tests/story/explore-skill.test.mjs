import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'jois-story-explore');
const text = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
const front = text.split('---')[1];

test('the skill is named jois-story-explore, versioned, and may only run the reader script', () => {
  assert.match(front, /^name: jois-story-explore$/m);
  assert.match(front, /version: "1\.1\.0"/);
  assert.match(front, /^allowed-tools: Bash\(node \*read-story-context\.mjs\*\)$/m);
  assert.doesNotMatch(front, /write-|mcp__/);
});

test('the skill names no writer and no retired tool, and cites the bundled references', () => {
  assert.doesNotMatch(text, /write_\w+|write-\w+\.mjs|mcp__|read_context|read_file|search_stories|storyTitle|shape-stories|planner\/guidelines/);
  assert.match(text, /references\/product-backlog\.md/);
  assert.match(text, /references\/sprint-points-guideline\.md/);
  assert.doesNotMatch(text, /INVEST (stands|means)|Independent, Negotiable/i);
});

test('the skill asks only for what is missing, checks a named story exists and opens on its current text', () => {
  assert.match(text, /Ask only for what is missing, backlog first/);
  assert.match(text, /AskUserQuestion/);
  assert.match(text, /A story named at the start must exist before you open on it/);
  assert.match(text, /--file proposals --pattern NEW-<n>/);
  assert.match(text, /start by showing it as it is now.*"What should change\?"/);
  assert.match(text, /\*\*Ignore every proposed story whose `Benched` column is `Yes`\*\*/);
  assert.match(text, /The proposals and the lexicon are not sections: they are files you read with `--file`/);
});

test('the skill passes the Title with every story ID and does not repeat a refused pair', () => {
  assert.match(text, /\*\*Name stories by Title\.\*\*/);
  assert.match(text, /\*\*Pass the Title with every story ID\*\*/);
  assert.match(text, /--title "<Title>"/);
  assert.match(text, /Do not repeat a refused pair/);
});

test('the skill carries the process rules and cannot write: shape question, term check, hand over to jois-story-propose', () => {
  assert.match(text, /Ask the shape-deciding question first/);
  assert.match(text, /Check terms early/);
  assert.match(text, /Lexicon terms change only through `jois-story-propose`/);
  assert.match(text, /change only through `jois-story-propose`/);
  assert.match(text, /do not suggest adding a second story/);
  assert.match(text, /Never write, create, move or delete any file/);
});

test('every flag the skill tells the user to run is one the script knows', () => {
  const script = fs.readFileSync(path.join(SKILL_DIR, 'read-story-context.mjs'), 'utf8');
  for (const flag of new Set(text.match(/--[a-z]+/g))) assert.ok(script.includes(`'${flag}'`) || script.includes(`${flag} `), flag);
});
