import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILLS, DEFAULT_SKILLS_DIR } from '../scripts/sync-skill-logic.mjs';

// The generated copies in toolkit/skills/<skill>/lib and references must equal what planner/scripts/sync-skill-logic.mjs
// produces from the planner's files. To fix a failure, run `node planner/scripts/sync-skill-logic.mjs` and commit the result.
const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'sync-skill-logic.mjs');
const GENERATED = ['lib', 'references'];

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'skill-sync-'));

function runSync(skillsDir, outDir) {
  const run = spawnSync(process.execPath, [SCRIPT, '--skills-dir', skillsDir, '--out', outDir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout;
}

function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)).split(path.sep).join('/'))
    .sort();
}

// What differs between a committed skill folder and the generated one: files named `skill/path`, with why.
function drift(committedDir, generatedDir) {
  const problems = [];
  for (const skill of Object.keys(SKILLS)) {
    if (!fs.existsSync(path.join(committedDir, skill))) continue;
    for (const part of GENERATED) {
      const want = filesUnder(path.join(generatedDir, skill, part));
      const have = filesUnder(path.join(committedDir, skill, part));
      for (const file of want) {
        const name = `${skill}/${part}/${file}`;
        if (!have.includes(file)) problems.push(`${name}: missing`);
        else if (fs.readFileSync(path.join(generatedDir, skill, part, file), 'utf8') !== fs.readFileSync(path.join(committedDir, skill, part, file), 'utf8')) problems.push(`${name}: differs`);
      }
      for (const file of have) if (!want.includes(file)) problems.push(`${skill}/${part}/${file}: not generated`);
    }
  }
  return problems;
}

test('the committed copies in toolkit/skills match what the sync script produces', () => {
  const out = temp();
  runSync(DEFAULT_SKILLS_DIR, out);
  assert.deepEqual(drift(DEFAULT_SKILLS_DIR, out), []);
});

test('every skill present gets its logic, support helpers and guidelines, each copy headed as generated', () => {
  const skills = temp();
  const out = temp();
  for (const skill of Object.keys(SKILLS)) fs.mkdirSync(path.join(skills, skill));
  runSync(skills, out);
  for (const skill of Object.keys(SKILLS)) {
    const files = filesUnder(path.join(out, skill));
    for (const expected of ['lib/backlog/model.js', 'lib/skill-support/resolve-data-dir.mjs', 'lib/skill-support/write-atomic.mjs', 'lib/storage/write-log.cjs', 'references/product-backlog.md']) {
      assert.ok(files.includes(expected), `${skill} lacks ${expected}`);
    }
    assert.equal(files.some((f) => f === 'lib/storage/paths.cjs' || f === 'lib/storage/project-config.cjs'), false, `${skill} copies the planner's config reader`);
    assert.equal(files.some((f) => f.startsWith('lib/diagrams/')), false, `${skill} copies diagram logic`);
    for (const f of files) {
      const first = fs.readFileSync(path.join(out, skill, f), 'utf8').split('\n')[0];
      assert.match(first, /GENERATED from planner\/.+ Do not edit/, `${skill}/${f} has no generated header`);
    }
  }
});

test('a skill without a folder is skipped', () => {
  const skills = temp();
  const out = temp();
  fs.mkdirSync(path.join(skills, 'jois-story-review'));
  const stdout = runSync(skills, out);
  assert.deepEqual(fs.readdirSync(out), ['jois-story-review']);
  assert.match(stdout, /skipped jois-story-explore/);
});

test('the check names a copy that has drifted, is missing or has no source', () => {
  const skills = temp();
  const out = temp();
  fs.mkdirSync(path.join(skills, 'jois-story-review'));
  runSync(skills, out);
  assert.deepEqual(drift(out, out), []);

  const committed = temp();
  fs.cpSync(out, committed, { recursive: true });
  const review = path.join(committed, 'jois-story-review');
  fs.appendFileSync(path.join(review, 'lib', 'backlog', 'model.js'), '// edited by hand\n');
  fs.rmSync(path.join(review, 'references', 'product-backlog.md'));
  fs.writeFileSync(path.join(review, 'lib', 'backlog', 'extra.js'), '');
  const problems = drift(committed, out);
  assert.ok(problems.includes('jois-story-review/lib/backlog/model.js: differs'));
  assert.ok(problems.includes('jois-story-review/lib/backlog/extra.js: not generated'));
  assert.ok(problems.includes('jois-story-review/references/product-backlog.md: missing'));
});
