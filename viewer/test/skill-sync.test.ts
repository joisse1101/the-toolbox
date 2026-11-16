import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILLS, DEFAULT_SKILLS_DIR } from '../scripts/sync-skill-logic.ts';

// The generated copies in toolkit/skills/<skill>/lib and references must equal what viewer/scripts/sync-skill-logic.ts
// produces from the viewer's shared files. To fix a failure, run `node viewer/scripts/sync-skill-logic.ts` and commit the result.
const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'sync-skill-logic.ts');
const GENERATED = ['lib', 'references'];

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'skill-sync-'));

function runSync(skillsDir: string, outDir: string) {
  const run = spawnSync(process.execPath, [SCRIPT, '--skills-dir', skillsDir, '--out', outDir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout;
}

function filesUnder(dir: string) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)).split(path.sep).join('/'))
    .sort();
}

// A Windows checkout with core.autocrlf turns a committed LF file into CRLF, so lines are compared, not bytes.
const readLf = (file: string) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// What differs between a committed skill folder and the generated one: files named `skill/path`, with why.
function drift(committedDir: string, generatedDir: string) {
  const problems: string[] = [];
  for (const skill of Object.keys(SKILLS)) {
    if (!fs.existsSync(path.join(committedDir, skill))) continue;
    for (const part of GENERATED) {
      const want = filesUnder(path.join(generatedDir, skill, part));
      const have = filesUnder(path.join(committedDir, skill, part));
      for (const file of want) {
        const name = `${skill}/${part}/${file}`;
        if (!have.includes(file)) problems.push(`${name}: missing`);
        else if (readLf(path.join(generatedDir, skill, part, file)) !== readLf(path.join(committedDir, skill, part, file))) problems.push(`${name}: differs`);
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
    for (const expected of ['lib/backlog/model.mjs', 'lib/skill-support/resolve-data-dir.mjs', 'lib/skill-support/write-atomic.mjs', 'lib/storage/backlog-paths.mjs', 'references/product-backlog.md']) {
      assert.ok(files.includes(expected), `${skill} lacks ${expected}`);
    }
    assert.equal(files.includes('lib/storage/write-log.mjs'), false, `${skill} copies the removed write log`);
    assert.equal(files.some((f) => f === 'lib/storage/paths.mjs' || f === 'lib/storage/project-config.mjs'), false, `${skill} copies the viewer's config reader`);
    assert.equal(files.some((f) => f.startsWith('lib/diagrams/')), false, `${skill} copies diagram logic`);
    assert.equal(files.some((f) => /^lib\/.*\.(ts|js|cjs)$/.test(f)), false, `${skill} has a copy that is not an .mjs file`);
    for (const f of files) {
      const first = fs.readFileSync(path.join(out, skill, f), 'utf8').split(/\r?\n/)[0];
      assert.match(first, /^(\/\/|<!--) GENERATED\. Do not edit this copy\.( -->)?$/, `${skill}/${f} has no generated header`);
      assert.doesNotMatch(first, /viewer\//, `${skill}/${f} header names a path of this repo`);
    }
  }
});

test('a copy is plain JavaScript: it names no .ts file and parses as an ES module', () => {
  const out = temp();
  const skills = temp();
  fs.mkdirSync(path.join(skills, 'jois-story-propose'));
  runSync(skills, out);
  const lib = path.join(out, 'jois-story-propose', 'lib');
  const copies = filesUnder(lib);
  assert.ok(copies.length > 0);
  for (const file of copies) {
    const target = path.join(lib, ...file.split('/'));
    assert.doesNotMatch(fs.readFileSync(target, 'utf8'), /from\s*['"]\.[^'"]*\.ts['"]/, `${file} imports a .ts file`);
    const check = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
    assert.equal(check.status, 0, `${file}: ${check.stderr}`);
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
  fs.appendFileSync(path.join(review, 'lib', 'backlog', 'model.mjs'), '// edited by hand\n');
  fs.rmSync(path.join(review, 'references', 'product-backlog.md'));
  fs.writeFileSync(path.join(review, 'lib', 'backlog', 'extra.mjs'), '');
  const problems = drift(committed, out);
  assert.ok(problems.includes('jois-story-review/lib/backlog/model.mjs: differs'));
  assert.ok(problems.includes('jois-story-review/lib/backlog/extra.mjs: not generated'));
  assert.ok(problems.includes('jois-story-review/references/product-backlog.md: missing'));
});

test('a copy has its source line ending throughout: CRLF sources give CRLF copies, LF sources give LF copies', () => {
  const VIEWER = path.resolve(path.dirname(SCRIPT), '..');
  const scratch = path.resolve(VIEWER, '..', '.scratch');
  fs.mkdirSync(scratch, { recursive: true });
  const root = fs.mkdtempSync(path.join(scratch, 'skill-sync-eol-'));
  try {
    // Two copies of the viewer folders the script reads: one as LF, one as CRLF.
    const outputs: Record<string, string> = {};
    for (const eol of ['lf', 'crlf']) {
      const viewer = path.join(root, eol, 'viewer');
      for (const dir of ['scripts', 'shared']) fs.cpSync(path.join(VIEWER, dir), path.join(viewer, dir), { recursive: true });
      for (const file of filesUnder(viewer)) {
        const target = path.join(viewer, ...file.split('/'));
        const text = fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
        fs.writeFileSync(target, eol === 'crlf' ? text.replace(/\n/g, '\r\n') : text, 'utf8');
      }
      const skills = path.join(root, eol, 'skills');
      for (const skill of Object.keys(SKILLS)) fs.mkdirSync(path.join(skills, skill), { recursive: true });
      const out = path.join(root, eol, 'out');
      const run = spawnSync(process.execPath, [path.join(viewer, 'scripts', 'sync-skill-logic.ts'), '--skills-dir', skills, '--out', out], { encoding: 'utf8' });
      assert.equal(run.status, 0, run.stderr);
      outputs[eol] = out;
    }
    const files = filesUnder(outputs.lf);
    assert.ok(files.length > 0);
    assert.deepEqual(filesUnder(outputs.crlf), files);
    for (const file of files) {
      const lf = fs.readFileSync(path.join(outputs.lf, file), 'utf8');
      const crlf = fs.readFileSync(path.join(outputs.crlf, file), 'utf8');
      assert.equal(lf.includes('\r'), false, `${file} of the LF run has a carriage return`);
      // Every line ends in CRLF: once each CRLF is taken out, no CR or LF is left.
      assert.doesNotMatch(crlf.replace(/\r\n/g, ''), /[\r\n]/, `${file} of the CRLF run has a line that does not end in CRLF`);
      assert.equal(crlf.replace(/\r\n/g, '\n'), lf, `${file} differs from the LF run`);
    }
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});
