import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// "Each skill and command links to the table": the five story skills and the four jois-code commands each have a
// "Files this skill/command writes" section with a link to the file table, and the link resolves to the shipped copy.
const TOOLKIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const SKILLS = ['explore', 'propose', 'review', 'plan', 'verify'].map((name) => ({
  label: `jois-story-${name}`,
  file: path.join(TOOLKIT, 'skills', `jois-story-${name}`, 'SKILL.md'),
  heading: '## Files this skill writes',
}));
const COMMANDS = ['apply', 'review', 'validate', 'archive'].map((name) => ({
  label: `jois-code:${name}`,
  file: path.join(TOOLKIT, 'commands', 'jois-code', `${name}.md`),
  heading: '## Files this command writes',
}));

// The text of the section: from its heading to the next heading.
function section(text, heading) {
  const start = text.indexOf(`\n${heading}\n`);
  assert.notEqual(start, -1, `no "${heading}" section`);
  const rest = text.slice(start + heading.length + 2);
  const end = rest.search(/\n## /);
  return end === -1 ? rest : rest.slice(0, end);
}

for (const { label, file, heading } of [...SKILLS, ...COMMANDS]) {
  test(`${label} has a files section that links the file table`, () => {
    const body = section(read(file), heading);
    const links = [...body.matchAll(/\]\(([^)]*plans-files\.md)\)/g)].map((m) => m[1]);
    assert.equal(links.length, 1, `expected one link to plans-files.md in the section of ${label}`);
    const target = path.resolve(path.dirname(file), links[0]);
    assert.ok(fs.existsSync(target), `${label} links ${links[0]}, which does not exist`);
  });
}

test('the skill that writes no file says so', () => {
  const body = section(read(SKILLS[0].file), SKILLS[0].heading);
  assert.match(body, /writes no file/);
});

test('the skills that create .plans tell the user to add the printed block to .gitignore themselves', () => {
  for (const { label, file, heading } of SKILLS.filter((s) => ['propose', 'review', 'plan'].some((n) => s.label.endsWith(n)))) {
    const body = section(read(file), heading);
    assert.match(body, /init-plans\.mjs/, label);
    assert.match(body, /"Created" line/, label);
    assert.match(body, /adds it to `\.gitignore` themselves/, label);
  }
});
