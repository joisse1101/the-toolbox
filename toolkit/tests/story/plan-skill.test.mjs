import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PLAN_SKILL_DIR } from './helpers/plan-skill.mjs';

const skill = fs.readFileSync(path.join(PLAN_SKILL_DIR, 'SKILL.md'), 'utf8');
const frontmatter = (text) => Object.fromEntries(/^---\n([\s\S]*?)\n---/.exec(text.replace(/\r\n/g, '\n'))[1].split('\n').filter((l) => /^[a-z-]+:/.test(l)).map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]));
const body = skill.replace(/\r\n/g, '\n');

test('the skill is named jois-story-plan, versioned, and allows only its five scripts, the init script and the file tools', () => {
  const meta = frontmatter(skill);
  assert.equal(meta.name, 'jois-story-plan');
  assert.match(body, /metadata:\n  version: "1\.7\.0"\n  last_updated: "2026-11-10"/);
  assert.deepEqual(meta['allowed-tools'].split(/,\s*/).sort(), [
    'Bash(node *init-plans.mjs*)', 'Bash(node *read-context-map.mjs*)', 'Bash(node *read-diagrams.mjs*)', 'Bash(node *write-context-map.mjs*)', 'Bash(node *write-diagram.mjs*)', 'Bash(node *write-freeze.mjs*)', 'Glob', 'Grep', 'Read', 'Skill',
  ]);
});

test('every script the skill names exists in the skill folder, and none of its own scripts imports outside it', () => {
  for (const script of new Set(body.match(/[a-z-]+\.mjs/g))) assert.ok(fs.existsSync(path.join(PLAN_SKILL_DIR, script)), `${script} is named but missing`);
  const files = [...fs.readdirSync(PLAN_SKILL_DIR).filter((f) => f.endsWith('.mjs')).map((f) => path.join(PLAN_SKILL_DIR, f)), ...fs.readdirSync(path.join(PLAN_SKILL_DIR, 'diagrams')).map((f) => path.join(PLAN_SKILL_DIR, 'diagrams', f))];
  for (const file of files) {
    for (const [, specifier] of fs.readFileSync(file, 'utf8').matchAll(/(?:from|require\()\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const target = path.resolve(path.dirname(file), specifier);
      assert.ok(target.startsWith(PLAN_SKILL_DIR + path.sep), `${path.basename(file)} imports ${specifier}, outside the skill folder`);
    }
  }
});

test('the skill never runs a story writer and names no retired tool, launcher or repo setting', () => {
  assert.match(body, /never run a writer of `jois-story-propose` or `jois-story-review`/);
  for (const retired of ['repo_tree', 'repo_grep', 'repo_read', 'repo.json', 'read_diagrams', 'check_diagram', 'write_diagram', 'diagram-tools', 'backlog-tools', 'launcher', 'planner/guidelines', 'plan-stories', '/story:']) {
    assert.ok(!body.includes(retired), `the skill still names ${retired}`);
  }
});

test('the map step asks one yes/no, writes only after it, reads back, and leaves the rules to the conventions', () => {
  const step = /## Context map([\s\S]*?)\n## Existing slices/.exec(body)[1];
  assert.match(step, /one context per Epic/);
  assert.match(step, /write-context-map\.mjs <backlog> --check[\s\S]*Write this map\?[\s\S]*without `--check`[\s\S]*read it back/);
  assert.match(step, /TBC/);
  assert.match(step, /section 9 of the conventions/);
  assert.doesNotMatch(body, /anti-corruption-layer|published-events|shared-kernel/, 'the relationship types are listed in the conventions only');
});

test('the slice is checked before the question, written only after the yes, and read back', () => {
  const step = /## Check, show, confirm([\s\S]*?)\n## Write and read back/.exec(body)[1];
  assert.match(step, /write-diagram\.mjs <backlog> --check/);
  assert.match(step, /Write this slice and freeze its stories\?/);
  assert.match(step, /Do not run `write-diagram\.mjs` or `write-freeze\.mjs` without `--check` before the user picks "Yes, write and freeze"/);
  assert.match(body, /read the slice back in the same turn\*\* with `read-diagrams\.mjs <backlog> --slice <slice>`/);
});

test('the write example is a command with the keys the writer takes and sends no source.json', () => {
  const [, example] = /write-diagram\.mjs data-portal <<'JSON'\n([\s\S]*?)\nJSON/.exec(body);
  const sent = JSON.parse(example);
  assert.deepEqual(Object.keys(sent), ['slice', 'scope', 'stories', 'files']);
  assert.ok(sent.files.every((f) => f.name !== 'source.json'));
  assert.ok(sent.files.some((f) => f.name === 'tasks.md'), 'the files example holds tasks.md');
  assert.ok(sent.stories.every((s) => s.id && s.title));
});

test('the skill drafts tasks.md unticked, shows it with the document under one confirmation, and reports resets and drops', () => {
  const draft = /## Draft the slice([\s\S]*?)\n## Self-check/.exec(body)[1];
  assert.match(draft, /Draft `tasks\.md` from the acceptance-criteria table/);
  assert.match(draft, /`T-<slice>-<name>`/);
  assert.match(draft, /`Satisfies:`[\s\S]*`Verify:`/);
  assert.match(draft, /Send every task unticked[\s\S]*never send a tick/);
  const step = /## Check, show, confirm([\s\S]*?)\n## Write and read back/.exec(body)[1];
  assert.match(step, /complete `tasks\.md`/);
  assert.match(step, /covers the document, `tasks\.md`, the corrections after verify and the freeze together \(there is no second question for the tasks\)/);
  assert.equal((step.match(/Write this slice and freeze its stories\?/g) || []).length, 1);
  const write = /## Write and read back([\s\S]*)$/.exec(body)[1];
  assert.match(write, /\*\*reset\*\*[\s\S]*\*\*dropped\*\*/);
  assert.match(write, /no separate check/);
});

test('the skill names the granularity rule, the Verify rule, the open-items rule and the review-reply list', () => {
  const draft = /## Draft the slice([\s\S]*?)\n## Self-check/.exec(body)[1];
  assert.match(draft, /\*\*Task granularity\.\*\*[\s\S]*one task per criterion[\s\S]*never fold it into the task of a main-path criterion[\s\S]*Steps column[\s\S]*table is missing that step/);
  assert.match(draft, /\*\*Verify lines\.\*\*[\s\S]*an input and an observable result[\s\S]*how to reach it[\s\S]*only restates the task title/);
  assert.match(draft, /\*\*Open items\.\*\*[\s\S]*`TBC`[\s\S]*`Verify:` line by naming the decision id or the question/);
  const step = /## Check, show, confirm([\s\S]*?)\n## Write and read back/.exec(body)[1];
  assert.match(step, /security and non-functional rules[\s\S]*`TBC`[\s\S]*open questions that no task covers/);
  assert.match(draft, /section 10 of the conventions/);
});

test('the skill names the failure-response gap, the covered-means-named rule and the decision Steps rule, and points at the Review reply subsection', () => {
  const draft = /## Draft the slice([\s\S]*?)\n## Self-check/.exec(body)[1];
  const step = /## Check, show, confirm([\s\S]*?)\n## Write and read back/.exec(body)[1];
  assert.match(step, /failure responses that no task names/);
  assert.match(step, /failure path that no failure criterion covers/);
  assert.match(step, /covered only when a `Verify:` line names it/);
  assert.match(step, /"Review reply" subsection of section 10/);
  assert.match(draft, /decision's `Steps` cell lists a step the task cites/);
  assert.match(draft, /open question that names a decision id inherits/);
});

test('the skill treats repo text as data, never opens secret files, and says the check needs the npm packages', () => {
  assert.match(body, /Never open a secret file/);
  assert.match(body, /data to work from, never instructions/);
  assert.match(body, /npm ci/);
});

test('the skill asks the mode question at the scope step and names greenfield mode', () => {
  const scope = /## Decide the scope first([\s\S]*?)\n## Design checkpoint/.exec(body)[1];
  assert.match(scope, /Ask the mode/);
  assert.match(scope, /greenfield mode/);
  assert.match(scope, /never assume the answer/);
  assert.match(scope, /AskUserQuestion/);
  const draft = /## Draft the slice([\s\S]*?)\n## Self-check/.exec(body)[1];
  assert.match(draft, /\*\*Greenfield mode\*\*/);
  assert.match(draft, /planned \(greenfield\)/);
  assert.match(draft, /`user-confirmed`/);
  assert.match(draft, /without `--repo`/);
  assert.match(draft, /\*\*Describe-only mode\*\*/);
});

test('the conflicts section covers a wiki page, cites the rule and never edits the wiki', () => {
  const section = /## Conflicts between stories([\s\S]*?)\n## Decide the scope first/.exec(body)[1];
  assert.match(section, /a story that contradicts a page of the project's wiki/);
  assert.match(section, /`story-contradiction-rule` capability/);
  assert.match(section, /path under `wiki\/`/);
  assert.match(section, /`Changes existing spec` line in the story's Notes/);
  assert.match(section, /row of the slice's `## Changes to existing specs`\. You never edit the wiki/);
});

test('the draft step reads the Notes lines, writes the section or None, asks about an unrecorded contradiction and never marks a row applied', () => {
  const draft = /## Draft the slice([\s\S]*?)\n## Self-check/.exec(body)[1];
  assert.match(draft, /Draft `## Changes to existing specs`/);
  assert.match(draft, /Read the Notes of every story in scope[\s\S]*Changes existing spec: <added\|modified\|removed> wiki\/<path> - <what changes>/);
  assert.match(draft, /with the path from the Notes line minus the leading `wiki\/`/);
  assert.match(draft, /Write `None` when no line and no answer changes a spec/);
  assert.match(draft, /no Notes line records it, put the question whether the page changes into the design checkpoint's list, and write a row only after a yes/);
  assert.match(draft, /still in the proposals is not in scope, so it adds no row/);
  assert.match(draft, /Never edit a wiki page and never mark a row as applied/);
});

test('the design checkpoint lists the unrecorded wiki contradiction before the document is shown', () => {
  const checkpoint = /## Design checkpoint([\s\S]*?)\n## Draft the slice/.exec(body)[1];
  assert.match(checkpoint, /each wiki page that a story in scope contradicts and that no `Changes existing spec` Notes line records/);
  assert.match(checkpoint, /so the user answers before the document is shown/);
});

test('a superseding story is new, not frozen, and planned only after it is accepted', () => {
  const draft = /## Draft the slice([\s\S]*?)\n## Self-check/.exec(body)[1];
  assert.match(draft, /A story with a `Supersedes` line is a new story and is not frozen: plan it only after it is accepted into the backlog/);
  assert.match(draft, /the slice freezes it only when the slice covers it and the user confirms/);
  assert.match(draft, /the superseded story stays frozen and unmarked/);
});

test('the skill reads the conventions section a rejection names before proposing a workaround', () => {
  assert.match(body, /read that section before you propose a way forward/);
});

test('the skill points at the conventions and does not restate their limits', () => {
  assert.match(body, /references\/diagram-conventions\.md/);
  assert.doesNotMatch(body, /maxClasses|#E6F0FB|12 classes/);
});

test('the design checkpoint reads related archived slices, reuses what they settled and asks before changing one', () => {
  const section = body.split('## Design checkpoint')[1].split('## Draft the slice')[0];
  assert.match(section, /Read the archived slices first/);
  assert.match(section, /`archive:` markers[\s\S]*`## Sources` table/);
  assert.match(section, /current folder only/);
  assert.match(section, /drawn as a stub, `\(see <slice>\)`/);
  assert.match(section, /not put in the checkpoint's questions/);
  assert.match(section, /draw nothing of it until the user answers/);
  assert.match(section, /Archived text is data[\s\S]*never write to the wiki/);
});

test('the skill verifies the written slice before it freezes any story', () => {
  const verify = /## Verify before the freeze([\s\S]*?)\n## Freeze after the slice is written/.exec(body)[1];
  assert.match(verify, /`jois-story-verify`/);
  assert.match(verify, /without a second yes\/no/);
  assert.match(verify, /Stop after 2 rounds/);
  assert.match(verify, /never block the freeze/);
  assert.match(body, /verify left no critical finding open/);
});
