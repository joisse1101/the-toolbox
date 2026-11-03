// Builds a data folder in the one-folder-per-backlog layout inside a temp folder, for the tests of the skill scripts. Paths come
// from the shared path module, so a test never spells the layout itself.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const bp = require('../../logic/storage/backlog-paths.cjs');

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
export const slicesPath = (dataDir, name) => bp.slicesDir(dataDir, name);
export const backlogPath = (dataDir, name) => bp.backlogDir(dataDir, name);
export const logPath = (dataDir) => bp.logFile(dataDir);

// The lines of the write log, parsed (empty when there is none).
export function logLines(dataDir) {
  const file = bp.logFile(dataDir);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [];
}

// The committed sample data (`test/sample-data/`) is in the one-folder-per-backlog layout. This is the one place that reads it:
// it copies the parts a test asks for into a temp data folder and returns that folder, so no test writes into the sample.
export const SAMPLE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sample-data');
const SAMPLE_BACKLOG = path.join(SAMPLE, 'sample');
export const SAMPLE_BACKLOG_CSV = path.join(SAMPLE_BACKLOG, bp.BACKLOG_FILE);
// The mock slice and context map live with the plan skill's tests (toolkit/tests/story/fixtures/); only the diagram-tools server's tests still read them here.
export const PLAN_FIXTURES = path.resolve(SAMPLE, '..', '..', '..', 'toolkit', 'tests', 'story', 'fixtures', 'sample');
export const SAMPLE_SLICE = path.join(PLAN_FIXTURES, 'slices', 'sign-in');
export function sampleTree({ withSlice = false, withMap = false } = {}) {
  const root = tempData('sample-tree-');
  putFile(root, 'sample', 'backlog', fs.readFileSync(SAMPLE_BACKLOG_CSV, 'utf8'));
  const dir = bp.backlogDir(root, 'sample');
  if (withSlice) fs.cpSync(SAMPLE_SLICE, path.join(bp.slicesDir(root, 'sample'), 'sign-in'), { recursive: true });
  if (withMap) {
    for (const f of ['context-map.json', 'context-map.md']) fs.copyFileSync(path.join(PLAN_FIXTURES, f), path.join(dir, f));
  }
  return root;
}
