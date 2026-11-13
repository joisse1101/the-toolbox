import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLANS_FILES, gitignoreBlock } from '../../logic/skill-support/plans-files.mjs';

// "Status matches the table": a mock .plans tree with one file per row, the printed block as .gitignore, and real git.
// The mock repo is its own git repo under the project's .scratch/, so git applies its .gitignore and not the outer one.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const git = (cwd, ...args) => {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout;
};

test('git status lists exactly the committed and user decides files of a mock .plans tree', () => {
  const scratch = path.join(REPO_ROOT, '.scratch');
  fs.mkdirSync(scratch, { recursive: true });
  const repo = fs.mkdtempSync(path.join(scratch, 'plans-files-git-'));
  try {
    git(repo, 'init', '--quiet');
    fs.writeFileSync(path.join(repo, '.gitignore'), gitignoreBlock({ dataDir: path.join(repo, '.plans'), root: repo }));
    for (const row of PLANS_FILES) {
      const file = path.join(repo, '.plans', 'b1', ...row.path.replace(/<slice>/g, 's1').split('/'));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, 'x\n');
    }
    const listed = git(repo, 'status', '--porcelain', '--untracked-files=all').split('\n').filter(Boolean)
      .map((line) => line.slice(3)).filter((file) => file !== '.gitignore').sort();
    const expected = PLANS_FILES
      .filter((row) => row.lifecycle.includes('committed') || row.lifecycle.includes('user decides'))
      .map((row) => `.plans/b1/${row.path.replace(/<slice>/g, 's1')}`).sort();
    assert.deepEqual(listed, expected);
    assert.equal(expected.length, 9);
  } finally {
    fs.rmSync(repo, { recursive: true });
  }
});
