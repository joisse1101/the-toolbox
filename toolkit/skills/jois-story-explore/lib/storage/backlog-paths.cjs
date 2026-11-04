// GENERATED. Do not edit this copy.
'use strict';
// Where each file of a backlog lives. A backlog is one folder in the data folder, named by the backlog's name, and every
// file has a fixed name inside it. This is the one place that builds those paths; callers pass a name and a kind.
//
//   <dataDir>/<name>/user-stories.csv                       kind `backlog`
//   <dataDir>/<name>/user-stories/review.csv (+ .decided)   kind `review`
//   <dataDir>/<name>/user-stories/proposals.csv             kind `proposals`
//   <dataDir>/<name>/lexicon.csv                            kind `lexicon`
//   <dataDir>/<name>/lexicon/lexicon-suggestions.csv        kind `lexicon-suggestions`
//   <dataDir>/<name>/slices/<slice>/                        slices

const fs = require('fs');
const path = require('path');
const { HttpError, validateBacklogName } = require('./file-name.cjs');

const BACKLOG_FILE = 'user-stories.csv';

// Kind -> path inside the backlog folder.
const KIND_FILES = {
  backlog: [BACKLOG_FILE],
  review: ['user-stories', 'review.csv'],
  proposals: ['user-stories', 'proposals.csv'],
  lexicon: ['lexicon.csv'],
  'lexicon-suggestions': ['lexicon', 'lexicon-suggestions.csv'],
};
const KINDS = Object.keys(KIND_FILES);

// Folders of the layout earlier versions used: one folder per kind of file, one file per backlog in each.
const OLDER_LAYOUT_FOLDERS = ['backlogs', 'reviews', 'proposals', 'lexicons', 'lexicon-suggestions', 'diagrams'];

function checkKind(kind) {
  if (!Object.prototype.hasOwnProperty.call(KIND_FILES, kind)) {
    throw new HttpError(404, `Unknown kind "${kind}"`, 'unknown-store');
  }
}

// The backlog's folder. Validates the name (a trailing .csv is dropped), so a name with a separator never gets here.
function backlogDir(dataDir, name) {
  return path.join(dataDir, validateBacklogName(name));
}

// The fixed file of a kind in a backlog's folder.
function backlogFile(dataDir, name, kind) {
  checkKind(kind);
  return path.join(backlogDir(dataDir, name), ...KIND_FILES[kind]);
}

// The `.decided` sidecar the review skill keeps beside the review file.
function reviewDecidedFile(dataDir, name) {
  return backlogFile(dataDir, name, 'review') + '.decided';
}

function slicesDir(dataDir, name) {
  return path.join(backlogDir(dataDir, name), 'slices');
}

function contextMapFiles(dataDir, name) {
  const dir = backlogDir(dataDir, name);
  return { json: path.join(dir, 'context-map.json'), md: path.join(dir, 'context-map.md') };
}

// The backlogs: subfolders of the data folder that hold user-stories.csv, sorted by name, each by its folder name.
// A folder whose name is not a valid backlog name (`logs`, a name with a trailing dot) is not listed.
function listBacklogs(dataDir) {
  let entries;
  try {
    entries = fs.readdirSync(dataDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return [];
    throw e;
  }
  const names = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let name;
    try {
      name = validateBacklogName(entry.name);
    } catch {
      continue;
    }
    if (name !== entry.name) continue;
    try {
      if (fs.statSync(path.join(dataDir, entry.name, BACKLOG_FILE)).isFile()) names.push(entry.name);
    } catch {
      // no user-stories.csv: not a backlog
    }
  }
  return names.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// The folders of the older layout that exist in the data folder (empty when there are none). Detected only, never read.
function detectOlderLayout(dataDir) {
  return OLDER_LAYOUT_FOLDERS.filter((folder) => {
    try {
      return fs.statSync(path.join(dataDir, folder)).isDirectory();
    } catch {
      return false;
    }
  });
}

module.exports = {
  BACKLOG_FILE, KINDS, KIND_FILES, OLDER_LAYOUT_FOLDERS,
  validateBacklogName, backlogDir, backlogFile, reviewDecidedFile, slicesDir, contextMapFiles,
  listBacklogs, detectOlderLayout,
};
