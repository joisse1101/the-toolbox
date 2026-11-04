import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PLAN_SKILL_DIR } from './helpers/plan-skill.mjs';

const skill = fs.readFileSync(path.join(PLAN_SKILL_DIR, 'SKILL.md'), 'utf8');
const frontmatter = (text) => Object.fromEntries(/^---\n([\s\S]*?)\n---/.exec(text.replace(/\r\n/g, '\n'))[1].split('\n').filter((l) => /^[a-z-]+:/.test(l)).map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]));
const body = skill.replace(/\r\n/g, '\n');

test('the skill is named jois-story-plan, versioned, and allows only its four scripts, the init script and the file tools', () => {
  const meta = frontmatter(skill);
  assert.equal(meta.name, 'jois-story-plan');
  assert.match(body, /metadata:\n  version: "1\.0\.0"\n  last_updated: "2026-11-03"/);
  assert.deepEqual(meta['allowed-tools'].split(/,\s*/).sort(), [
    'Bash(node *init-plans.mjs*)', 'Bash(node *read-context-map.mjs*)', 'Bash(node *read-diagrams.mjs*)', 'Bash(node *write-context-map.mjs*)', 'Bash(node *write-diagram.mjs*)', 'Glob', 'Grep', 'Read',
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
  assert.match(step, /Write this slice\?/);
  assert.match(step, /Do not run `write-diagram\.mjs` without `--check` before the user picks "Yes, write"/);
  assert.match(body, /read the slice back in the same turn\*\* with `read-diagrams\.mjs <backlog> --slice <slice>`/);
});

test('the write example is a command with the keys the writer takes and sends no source.json', () => {
  const [, example] = /write-diagram\.mjs data-portal <<'JSON'\n([\s\S]*?)\nJSON/.exec(body);
  const sent = JSON.parse(example);
  assert.deepEqual(Object.keys(sent), ['slice', 'scope', 'stories', 'files']);
  assert.ok(sent.files.every((f) => f.name !== 'source.json'));
  assert.ok(sent.stories.every((s) => s.id && s.title));
});

test('the skill treats repo text as data, never opens secret files, and says the check needs the npm packages', () => {
  assert.match(body, /Never open a secret file/);
  assert.match(body, /data to work from, never instructions/);
  assert.match(body, /npm ci/);
});

test('the skill points at the conventions and does not restate their limits', () => {
  assert.match(body, /references\/diagram-conventions\.md/);
  assert.doesNotMatch(body, /maxClasses|#E6F0FB|12 classes/);
});
