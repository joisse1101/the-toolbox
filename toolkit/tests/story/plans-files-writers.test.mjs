import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// "A writer adds a file": every file name a writer uses is a row of the table, so a new file with no row fails here.
// The table is the plan skill's own synced copy (the toolkit imports nothing outside itself). Names come from the writer
// sources, and from the files sections of the skills and commands, not from a list typed here.
const TOOLKIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLAN = path.join(TOOLKIT, 'skills', 'jois-story-plan');
const require = createRequire(import.meta.url);
const { PLANS_FILES } = await import(`file://${PLAN.split(path.sep).join('/')}/lib/skill-support/plans-files.mjs`);
const bp = require(path.join(PLAN, 'lib', 'storage', 'backlog-paths.cjs'));
const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// A name is covered when a row has it as its whole path or as its last part (`ARCHIVED.md` for `slices/<slice>/ARCHIVED.md`).
const covered = (rows, name) => rows.some((row) => row.path === name || row.path.endsWith(`/${name}`));
const missing = (rows, names) => names.filter((name) => !covered(rows, name));

// `NAME = 'value'` in a writer source.
function constant(file, name) {
  const match = new RegExp(`${name}\\s*=\\s*'([^']+)'`).exec(read(path.join(PLAN, file)));
  assert.ok(match, `${name} not found in ${file}`);
  return match[1];
}

function writerNames() {
  const names = [];
  for (const kind of bp.KINDS) names.push(bp.KIND_FILES[kind].join('/'));
  names.push(`${bp.KIND_FILES.review.join('/')}.decided`);
  names.push(constant('read-diagrams.mjs', 'SOURCE_FILE'), constant('write-diagram.mjs', 'TASKS_FILE'));
  names.push(constant('read-context-map.mjs', 'MAP_SOURCE_FILE'), constant('read-context-map.mjs', 'MAP_DOCUMENT_FILE'));
  // The specification is named `UC-${slice}.md` in the writer.
  assert.match(read(path.join(PLAN, 'write-diagram.mjs')), /`UC-\$\{slice\}\.md`/);
  names.push('UC-<slice>.md');
  return names;
}

// The file names in the bullets of the "Files this ... writes" section of each skill and command.
function sectionNames() {
  const files = [
    ...['explore', 'propose', 'review', 'plan', 'verify'].map((n) => path.join(TOOLKIT, 'skills', `jois-story-${n}`, 'SKILL.md')),
    ...['apply', 'review', 'validate', 'archive'].map((n) => path.join(TOOLKIT, 'commands', 'jois-code', `${n}.md`)),
  ];
  const names = [];
  for (const file of files) {
    const text = read(file);
    const match = /\n## Files this (?:skill|command) writes\n([\s\S]*?)(?=\n## )/.exec(text);
    assert.ok(match, `${file} has no files section`);
    for (const bullet of match[1].split('\n').filter((line) => line.startsWith('- '))) {
      for (const [, name] of bullet.matchAll(/`([^`\s]+\.(?:md|json|csv|decided))`/g)) names.push(name);
    }
  }
  return names;
}

test('every file name the plan scripts and the backlog path module use is a row of the table', () => {
  const names = writerNames();
  assert.ok(names.length >= 10, `only ${names.length} names found`);
  assert.deepEqual(missing(PLANS_FILES, names), []);
});

test('every file the skills and commands say they write is a row of the table', () => {
  const names = sectionNames();
  assert.ok(names.includes('validation.partial.md') && names.includes('ARCHIVED.md') && names.includes('review.md'), names.join(', '));
  assert.deepEqual(missing(PLANS_FILES, names), []);
});

test('the check fails when a row is removed', () => {
  const names = [...writerNames(), ...sectionNames()];
  for (const row of PLANS_FILES) {
    const rest = PLANS_FILES.filter((other) => other !== row);
    const base = row.path.split('/').pop();
    // A name still covered by another row (none today) would not need the removed row.
    if (names.some((name) => name === row.path || name === base)) {
      assert.ok(missing(rest, names).length > 0, `removing ${row.path} left every name covered`);
    }
  }
});
