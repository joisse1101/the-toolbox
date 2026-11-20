import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sampleTree } from './helpers/backlog-tree.mjs';
import { tempProject } from './helpers/temp-project.mjs';
import { checkDesignIndex, formatCheck } from '../../skills/jois-story-plan/check-design-index.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills/jois-story-plan/check-design-index.mjs');
const AC_1 = 'Given a habit checked off on each of the last 3 days, when I open the habit list, then it shows a streak of 3.';
const AC_2 = 'Given a habit whose longest run was 5 days and whose current streak is 2, when I open the habit list, then it shows a best streak of 5.';
const board = (text) => ({ text, kind: 'main', artboards: ['streak-main'] });
const index = (stories) => ({
  version: 1,
  backlog: 'sample',
  scope: { type: 'feature', epic: 'Habit tracking', feature: 'Streaks' },
  viewports: ['desktop'],
  stories,
});

test('plan has its own copy of the checker: a clean index has no findings, a stale one is named by Title', () => {
  const { dataDir } = tempProject();
  sampleTree({ into: dataDir });
  const clean = index([
    { title: 'See the current streak', criteria: [board(AC_1)] },
    { title: 'See the best streak', criteria: [board(AC_2)] },
  ]);
  const ok = checkDesignIndex({ dataDir, name: 'sample', input: JSON.stringify(clean) });
  assert.equal(ok.ok, true);
  assert.match(formatCheck(ok), /^no findings/);
  const stale = index([{ title: 'See the current streak', criteria: [board('Given an old wording, when x, then y.')] }, { title: 'See the best streak', criteria: [board(AC_2)] }]);
  const r = checkDesignIndex({ dataDir, name: 'sample', input: JSON.stringify(stale) });
  assert.match(formatCheck(r), /changed: "See the current streak"/);
});

test('plan\'s checker command line exits 2 without a backlog name', () => {
  const { dataDir } = tempProject();
  const r = spawnSync(process.execPath, [SCRIPT], { input: '', cwd: path.dirname(dataDir), encoding: 'utf8' });
  assert.equal(r.status, 2);
});
