import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLKIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMMANDS = path.join(TOOLKIT, 'commands', 'jois-story');
const NAMES = ['propose', 're-read', 'review'];
const read = (name) => fs.readFileSync(path.join(COMMANDS, `${name}.md`), 'utf8').replace(/\r\n/g, '\n');

test('the three story commands exist and nothing else is in the folder', () => {
  assert.deepEqual(fs.readdirSync(COMMANDS).sort(), NAMES.map((n) => `${n}.md`).sort());
});

test('each command is versioned and hidden from the model', () => {
  for (const name of NAMES) {
    const front = read(name).split('---')[1];
    assert.match(front, /^metadata:\n {2}version: "(1\.0\.0|1\.1\.0)"\n {2}last_updated: "(2026-11-03|2026-11-05)"$/m, name);
    assert.match(front, /^disable-model-invocation: true$/m, name);
    assert.doesNotMatch(front, /mcp__/, name);
  }
});

test('no command names a retired tool, launcher, old skill name or old command name', () => {
  for (const name of NAMES) {
    assert.doesNotMatch(
      read(name),
      /mcp__|read_context|read_file|search_stories|check_drafts|write_proposals|write_lexicon|write_review|suggest_lexicon_change|shape-stories|plan-stories|explore-stories|propose-stories|review-backlog|\/story:|\.ps1|backlog-tools|planner\/data|reviews\/<|lexicons\//,
      name,
    );
  }
});

test('commands call the new skills and scripts, and name each other by the new namespace', () => {
  assert.match(read('propose'), /jois-story-propose/);
  assert.match(read('propose'), /write-proposal\.mjs/);
  assert.match(read('re-read'), /read-story-context\.mjs/);
  assert.match(read('review'), /jois-story-review/);
  assert.match(read('review'), /\/jois-story:re-read/);
  assert.match(read('review'), /\/jois-story:propose/);
  assert.match(read('review'), /--check/);
});

test('propose skips the yes/no step and re-read and review write nothing', () => {
  assert.match(read('propose'), /skip its "Confirm before writing" yes\/no step/);
  assert.match(read('re-read'), /You only read; write nothing/);
  assert.match(read('review'), /run a writer only with `--check`/);
});

test('the old command folder is gone', () => {
  assert.equal(fs.existsSync(path.join(TOOLKIT, '..', '.claude', 'commands', 'story')), false);
});
