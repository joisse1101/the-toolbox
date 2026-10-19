import test from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../.claude/skills/review-backlog/guard-bash.mjs';

const W = 'node .claude/skills/review-backlog/write-review.mjs';
const R = 'node .claude/skills/review-backlog/read-backlog.mjs';

test('allowed forms', () => {
  const allowed = [
    R,
    `${R} data-portal.csv`,
    `${R} data-portal.csv checks`,
    `${R} data-portal.csv epic-12`,
    `${W} data-portal.csv <<'JSON'\n[]\nJSON`,
    `${W} data-portal.csv --append <<'JSON'\n[{"a":1}]\nJSON`,
    `${W} data-portal.csv --append <<'JSON'\r\n[]\r\nJSON\r\n`,
  ];
  for (const c of allowed) assert.equal(check(c), null, c);
});

test('denied commands, each with the allowed forms in the message', () => {
  const denied = [
    ['extra argument', `${W} data.csv out.csv <<'JSON'\n[]\nJSON`],
    ['output path after append', `${W} data.csv --append out.csv <<'JSON'\n[]\nJSON`],
    ['append before the name', `${W} --append data.csv <<'JSON'\n[]\nJSON`],
    ['append alone', `${W} --append <<'JSON'\n[]\nJSON`],
    ['append with prefix', `${W} data.csv --appendx <<'JSON'\n[]\nJSON`],
    ['redirect', `${W} data.csv > out.csv <<'JSON'\n[]\nJSON`],
    ['no heredoc', `${W} data.csv`],
    ['text after JSON', `${W} data.csv <<'JSON'\n[]\nJSON\ncat secrets`],
    ['append on read-backlog', `${R} data.csv --append`],
    ['flag as read-backlog name', `${R} --append`],
    ['section with a path', `${R} data.csv ../secrets`],
    ['section with a slash', `${R} data.csv epic-1/x`],
    ['section with a semicolon', `${R} data.csv checks;cat`],
    ['section with substitution', `${R} data.csv $(cat)`],
    ['upper case section', `${R} data.csv Checks`],
    ['third argument', `${R} data.csv checks epic-1`],
    ['chained', `${R} data.csv && cat x`],
    ['piped', `${R} data.csv | cat`],
    ['other command', 'cat user-stories/data.csv'],
    ['other script', 'node .claude/skills/review-backlog/evil.mjs'],
    ['no command', undefined],
  ];
  for (const [label, c] of denied) {
    const err = check(c);
    assert.ok(err, label);
    assert.match(err, /read-backlog\.mjs \[file \[section\]\]/, label);
    assert.match(err, /write-review\.mjs <file> <<'JSON'/, label);
    assert.match(err, /write-review\.mjs <file> --append <<'JSON'/, label);
  }
});
