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

// The committed sample data is still in the older layout (the sample moves in task 7.1); this is the one place that reads it.
// It copies the sample into a new-layout temp data folder and returns that folder, so no test reads the older layout itself.
const SAMPLE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sample-data');
export const SAMPLE_REPO_DIR = path.join(SAMPLE, 'repos', 'sample');
export const SAMPLE_SLICE = path.join(SAMPLE, 'diagrams', 'sample', 'sign-in');
export function sampleTree({ withSlice = false, withMap = false, withRepo = false } = {}) {
  const root = tempData('sample-tree-');
  putFile(root, 'sample', 'backlog', fs.readFileSync(path.join(SAMPLE, 'backlogs', 'sample.csv'), 'utf8'));
  const dir = bp.backlogDir(root, 'sample');
  if (withSlice) fs.cpSync(SAMPLE_SLICE, path.join(bp.slicesDir(root, 'sample'), 'sign-in'), { recursive: true });
  if (withMap) {
    for (const f of ['context-map.json', 'context-map.md']) fs.copyFileSync(path.join(SAMPLE, 'diagrams', 'sample', f), path.join(dir, f));
  }
  if (withRepo) {
    // The sample repo sits beside the backlog folders; repo.json names it relative to itself.
    fs.cpSync(SAMPLE_REPO_DIR, path.join(root, 'repos', 'sample'), { recursive: true });
    fs.writeFileSync(bp.repoFile(root, 'sample'), JSON.stringify({ path: '../repos/sample', exclude: ['config/prod.*'] }));
  }
  return root;
}
