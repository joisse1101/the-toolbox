// Builds a data folder in the one-folder-per-backlog layout inside a temp folder, for the tests of the story skill
// scripts. Paths come from a skill's own copy of the path module, so a test never spells the layout itself.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const bp = require('../../../skills/jois-story-review/lib/storage/backlog-paths.cjs');

// A new empty data folder (the tests use no other).
export const tempData = (prefix = 'backlog-tree-') => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

// Writes one file of a backlog (kind: backlog, review, proposals, lexicon, lexicon-suggestions) and returns its path.
export function putFile(dataDir, name, kind, text) {
  const target = bp.backlogFile(dataDir, name, kind);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
  return target;
}

// The path of a file of a backlog (nothing is created).
export const pathOf = (dataDir, name, kind) => bp.backlogFile(dataDir, name, kind);
export const decidedPath = (dataDir, name) => bp.reviewDecidedFile(dataDir, name);

// ---- the plan skill's mock backlog, slice and context map: hand-written, kept in fixtures/habits/ (the story-to-code sample's
// recorded stages are not read here, so recording the sample again never changes these tests) ----
const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'habits');
const SAMPLE_BACKLOG_SETTINGS = path.join(FIXTURES, 'backlog.json');
export const FIXTURE_BACKLOG_CSV = path.join(FIXTURES, 'user-stories.csv');
export const SAMPLE_SLICE_NAME = 'streaks';
export const SAMPLE_SLICE = path.join(FIXTURES, 'slices', SAMPLE_SLICE_NAME);

// Gives a backlog the initials of the sample (H1), for a test that writes its own backlog text with `putFile`.
export function putSampleInitials(dataDir, name) {
  const dir = bp.backlogDir(dataDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(SAMPLE_BACKLOG_SETTINGS, path.join(dir, 'backlog.json'));
}

// A temp data folder holding the sample backlog `sample` and, on request, the mock slice and the mock context map.
export function sampleTree({ withSlice = false, withMap = false } = {}) {
  const root = tempData('sample-tree-');
  putFile(root, 'sample', 'backlog', fs.readFileSync(FIXTURE_BACKLOG_CSV, 'utf8'));
  const dir = bp.backlogDir(root, 'sample');
  putSampleInitials(root, 'sample');
  if (withSlice) fs.cpSync(SAMPLE_SLICE, path.join(bp.slicesDir(root, 'sample'), SAMPLE_SLICE_NAME), { recursive: true });
  if (withMap) {
    for (const f of ['context-map.json', 'context-map.md']) fs.copyFileSync(path.join(FIXTURES, f), path.join(dir, f));
  }
  return root;
}
export const slicesPath = (dataDir, name) => bp.slicesDir(dataDir, name);
export const backlogPath = (dataDir, name) => bp.backlogDir(dataDir, name);
