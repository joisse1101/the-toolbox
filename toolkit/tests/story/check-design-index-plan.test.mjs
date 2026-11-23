import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sampleTree, pathOf } from './helpers/backlog-tree.mjs';
import { tempProject } from './helpers/temp-project.mjs';
import { checkDesignIndex, formatCheck } from '../../skills/jois-story-plan/check-design-index.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills/jois-story-plan/check-design-index.mjs');

test('plan has its own copy of the checker: the mock design is clean, and a reworded criterion is named by story ID', () => {
  const { dataDir } = tempProject();
  sampleTree({ into: dataDir, withDesign: true });
  const ok = checkDesignIndex({ dataDir, name: 'sample' });
  assert.equal(ok.ok, true);
  assert.match(formatCheck(ok), /^no findings/);
  const file = pathOf(dataDir, 'sample', 'backlog');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('then it shows a streak of 3.', 'then it shows 3 days.'));
  assert.match(formatCheck(checkDesignIndex({ dataDir, name: 'sample' })), /changed: H1-HT-0001 "See the current streak"/);
});

test('the two copies of the checker are the same file', () => {
  const skills = path.resolve(path.dirname(SCRIPT), '..');
  const read = (skill) => fs.readFileSync(path.join(skills, skill, 'check-design-index.mjs'), 'utf8');
  assert.equal(read('jois-story-plan'), read('jois-story-design'));
});

test('plan\'s checker command line exits 2 without a backlog name', () => {
  const { dataDir } = tempProject();
  const r = spawnSync(process.execPath, [SCRIPT], { input: '', cwd: path.dirname(dataDir), encoding: 'utf8' });
  assert.equal(r.status, 2);
});
