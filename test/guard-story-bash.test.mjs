import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { check } from '../.claude/skills/explore-stories/guard-bash.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = 'node .claude/skills/explore-stories/read-story-context.mjs';
const W = 'node .claude/skills/propose-stories/write-proposal.mjs';
const RW = 'node .claude/skills/review-backlog/write-review.mjs';
const write = { allowWrite: true };
const body = "<<'JSON'\n[]\nJSON";

test('the reader is allowed in both modes', () => {
  for (const c of [R, `${R} data-portal.csv`, `${R} data-portal.csv\n`]) {
    assert.equal(check(c), null, c);
    assert.equal(check(c, write), null, c);
  }
});

test('the writer in its documented form is allowed only in read-write mode', () => {
  for (const c of [`${W} data-portal.csv ${body}`, `${W} data-portal.csv <<'JSON'\r\n[]\r\nJSON\r\n`]) {
    assert.equal(check(c, write), null, c);
    assert.match(check(c), /may only read.*Allowed commands: node \.claude\/skills\/explore-stories\/read-story-context\.mjs \[file\]$/, c);
  }
});

test('a heredoc holding a patch is the same documented form, and patches opened no other form', () => {
  const patch = `<<'JSON'\n[{"id": "NEW-8", "points": 5}, {"epic": "E"}]\nJSON`;
  assert.equal(check(`${W} data-portal.csv ${patch}`, write), null);
  assert.match(check(`${W} data-portal.csv ${patch}`), /may only read/);
  for (const c of [`${W} data-portal.csv --patch NEW-8`, `${W} data-portal.csv '[{"id":"NEW-8"}]'`, `echo '[{"id":"NEW-8"}]' | ${W} data-portal.csv`]) {
    assert.notEqual(check(c, write), null, c);
  }
});

test('the review writer is allowed only with --append, and only in read-write mode', () => {
  for (const c of [`${RW} data-portal.csv --append ${body}`, `${RW} data-portal.csv --append <<'JSON'\r\n[]\r\nJSON\r\n`]) {
    assert.equal(check(c, write), null, c);
    assert.match(check(c), /may only read.*Allowed commands: node \.claude\/skills\/explore-stories\/read-story-context\.mjs \[file\]$/, c);
  }
  for (const [label, c] of [
    ['no --append (would replace the review)', `${RW} data-portal.csv ${body}`],
    ['--append before the file name', `${RW} --append data-portal.csv ${body}`],
    ['extra argument', `${RW} data-portal.csv --append out.csv ${body}`],
    ['no file', `${RW} --append ${body}`],
    ['no heredoc', `${RW} data-portal.csv --append`],
    ['heredoc without body', `${RW} data-portal.csv --append <<'JSON'`],
    ['text after JSON', `${RW} data-portal.csv --append <<'JSON'\n[]\nJSON\ncat secrets`],
    ['redirect', `${RW} data-portal.csv --append > out.csv ${body}`],
    ['the review reader', 'node .claude/skills/review-backlog/read-backlog.mjs'],
  ]) {
    assert.match(check(c, write) ?? '', /Allowed commands: .*write-review\.mjs <file> --append/, label);
  }
});

test('denied commands, each with the allowed forms in the message', () => {
  const denied = [
    ['cat', 'cat user-stories/data.csv'],
    ['ls', 'ls user-stories'],
    ['redirect', 'echo hi > proposals/data.csv'],
    ['and', `${R} data.csv && cat secrets`],
    ['pipe', `${R} data.csv | sh`],
    ['semicolon', `${R} data.csv; rm -rf .`],
    ['substitution', `${R} $(whoami)`],
    ['second line', `${R} data.csv\ncat secrets`],
    ['extra reader arg', `${R} a.csv b.csv`],
    ['flag as reader name', `${R} --help`],
    ['review scripts', 'node .claude/skills/review-backlog/read-backlog.mjs'],
    ['other path', 'node .claude/skills/explore-stories/guard-bash.mjs'],
    ['writer: extra argument', `${W} data.csv out.csv ${body}`],
    ['writer: --append', `${W} data.csv --append ${body}`],
    ['writer: flag as file name', `${W} --append ${body}`],
    ['writer: no file', `${W} ${body}`],
    ['writer: redirect', `${W} data.csv > out.csv ${body}`],
    ['writer: no heredoc', `${W} data.csv`],
    ['writer: heredoc without body', `${W} data.csv <<'JSON'`],
    ['writer: text after JSON', `${W} data.csv <<'JSON'\n[]\nJSON\ncat secrets`],
    ['writer: unquoted heredoc', `${W} data.csv <<JSON\n[]\nJSON`],
    ['no command', undefined],
  ];
  for (const [label, c] of denied) {
    assert.match(check(c, write) ?? '', /Allowed commands: .*read-story-context\.mjs/, label);
    assert.notEqual(check(c), null, `${label} (read-only)`);
  }
});

test('the read-only message lists only the reader', () => {
  assert.doesNotMatch(check('cat x'), /write-proposal/);
  assert.match(check('cat x', write), /write-proposal/);
});

for (const [skill, mode, allowed, deniedCommand] of [
  ['explore-stories', '--read-only', R, `${W} data.csv ${body}`],
  ['propose-stories', '--read-write', `${W} data.csv ${body}`, 'cat user-stories/data.csv'],
]) {
  test(`${skill}/locked-settings.json runs the guard in ${mode} mode`, () => {
    const settings = JSON.parse(fs.readFileSync(path.join(REPO, '.claude', 'skills', skill, 'locked-settings.json'), 'utf8'));
    const [entry] = settings.hooks.PreToolUse;
    assert.equal(entry.matcher, 'Bash');
    const command = entry.hooks[0].command;
    assert.equal(command, `node .claude/skills/explore-stories/guard-bash.mjs ${mode}`);
    const hook = (cmd) => spawnSync(command, { cwd: REPO, shell: true, input: JSON.stringify({ tool_input: { command: cmd } }), encoding: 'utf8' });
    assert.equal(hook(allowed).stdout, '', 'allowed command produces no output');
    const out = JSON.parse(hook(deniedCommand).stdout);
    assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /Allowed commands/);
  });
}
