import test from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../../../.claude/skills/meeting-minutes/guard-bash.mjs';

const W = 'node .claude/skills/meeting-minutes/write-minutes.mjs';
const body = "<<'MINUTES'\n# Minutes\nMINUTES";

test('the two documented forms are allowed', () => {
  for (const c of [
    `${W} "Sprint Planning" 2026-10-17 ${body}`,
    `${W} "Q&A (weekly), v2" 2026-10-17 <<'MINUTES'\r\n# Minutes\r\nMINUTES\r\n`,
    `${W} --replace sprint-planning_2026-10-17_1.md ${body}`,
    `${W} --template`,
  ]) assert.equal(check(c), null, c);
});

test('anything else is denied', () => {
  for (const c of [
    undefined,
    'cat planner/data/meetings/x.md',
    `${W} "Title" 2026-10-17`,
    `${W} Title 2026-10-17 ${body}`,
    `${W} "$(whoami)" 2026-10-17 ${body}`,
    `${W} "a\`b" 2026-10-17 ${body}`,
    `${W} "Title" 2026-10-17 ${body} && rm -rf data`,
    `${W} "Title" 2026-10-17 ${body}\nrm -rf data`,
    `${W} "Title" 2026-10-17 <<'MINUTES'\n# Minutes\nMINUTES\nMINUTES`,
    `${W} "Title" 2026-10-17 | cat ${body}`,
    `${W} --replace ../x.md ${body}`,
    `${W} --replace x.md extra ${body}`,
    `${W} "Title" 2026-10-17 <<MINUTES\n# Minutes\nMINUTES`,
    `${W} --template > planner/data/x.md`,
    `${W} --template && rm -rf data`,
    `${W} --template\nrm -rf data`,
  ]) assert.notEqual(check(c), null, String(c));
});
