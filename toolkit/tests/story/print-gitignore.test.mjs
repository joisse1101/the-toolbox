import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// "A gitignore block is printed from the table": print-gitignore.mjs prints it and writes nothing, and every skill's
// init-plans.mjs prints it after its "Created" line. The scripts run from the skill folders themselves (no Mermaid needed).
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SKILLS = path.join(REPO, 'toolkit', 'skills');
const scratch = path.join(REPO, '.scratch');
fs.mkdirSync(scratch, { recursive: true });
const temp = () => fs.mkdtempSync(path.join(scratch, 'print-gitignore-'));
const run = (script, cwd, env = {}) => spawnSync(process.execPath, [script], { cwd, encoding: 'utf8', env: { ...process.env, PLANNER_CONFIG: '', ...env } });
const lf = (text) => text.replace(/\r\n/g, '\n');

const PRINT = path.join(SKILLS, 'jois-story-plan', 'print-gitignore.mjs');
const PLANS_BLOCK_START = '# planner data: committed files only (printed by jois-story-plan/print-gitignore.mjs)\n!.plans/\n.plans/*\n';

test('print-gitignore prints the block for .plans and writes nothing', () => {
  const cwd = temp();
  try {
    fs.mkdirSync(path.join(cwd, '.plans'));
    const result = run(PRINT, cwd);
    assert.equal(result.status, 0, result.stderr);
    const out = lf(result.stdout);
    assert.ok(out.startsWith(PLANS_BLOCK_START), out);
    assert.match(out, /^!\.plans\/\*\/slices\/\*\/ARCHIVED\.md$/m);
    assert.match(out, /^\.plans\/\*\/slices\/\*\/\*$/m);
    assert.deepEqual(fs.readdirSync(cwd), ['.plans']);
    assert.deepEqual(fs.readdirSync(path.join(cwd, '.plans')), []);
  } finally {
    fs.rmSync(cwd, { recursive: true });
  }
});

test('print-gitignore uses the folder a planner.config.yaml names inside the project', () => {
  const cwd = temp();
  try {
    fs.writeFileSync(path.join(cwd, 'planner.config.yaml'), 'dataDir: docs/plans\n');
    const result = run(PRINT, cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.match(lf(result.stdout), /^!docs\/plans\/$/m);
    assert.doesNotMatch(result.stdout, /\.plans/);
  } finally {
    fs.rmSync(cwd, { recursive: true });
  }
});

test('print-gitignore says no block is needed for a data folder outside the project', () => {
  const cwd = temp();
  const outside = temp();
  try {
    fs.writeFileSync(path.join(cwd, 'planner.config.yaml'), `dataDir: ${outside.replace(/\\/g, '/')}\n`);
    const result = run(PRINT, cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^No \.gitignore block is needed/);
    assert.doesNotMatch(result.stdout, /^!/m);
  } finally {
    fs.rmSync(cwd, { recursive: true });
    fs.rmSync(outside, { recursive: true });
  }
});

test('print-gitignore stops with a message when no data folder is found', () => {
  const cwd = temp();
  try {
    const result = run(PRINT, cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /No data folder was found/);
    assert.equal(result.stdout, '');
  } finally {
    fs.rmSync(cwd, { recursive: true });
  }
});

for (const skill of ['jois-story-plan', 'jois-story-propose', 'jois-story-review']) {
  test(`${skill}/init-plans.mjs prints the block after the Created line and writes no .gitignore`, () => {
    const cwd = temp();
    try {
      const result = run(path.join(SKILLS, skill, 'init-plans.mjs'), cwd);
      assert.equal(result.status, 0, result.stderr);
      const out = lf(result.stdout);
      assert.match(out, /^Created .*\.plans\.\n/);
      assert.ok(out.indexOf('Created') < out.indexOf(PLANS_BLOCK_START), 'the block follows the Created line');
      assert.match(out, /^!\.plans\/\*\/slices\/\*\/tasks\.md$/m);
      assert.deepEqual(fs.readdirSync(cwd), ['.plans']);

      const again = run(path.join(SKILLS, skill, 'init-plans.mjs'), cwd);
      assert.match(again.stdout, /already exists; nothing changed/);
      assert.doesNotMatch(again.stdout, /^!/m);
    } finally {
      fs.rmSync(cwd, { recursive: true });
    }
  });
}
