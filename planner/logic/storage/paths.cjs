'use strict';
// Where things live. The private data (backlogs, reviews, proposals) is set by PLANNER_DATA_DIR and defaults to
// <repo>/planner/data.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
// TLT_DATA_DIR, the name before the rename, is still accepted, with a warning.
const CUSTOM_DIR = process.env.PLANNER_DATA_DIR || process.env.TLT_DATA_DIR;
if (!process.env.PLANNER_DATA_DIR && process.env.TLT_DATA_DIR) console.error('TLT_DATA_DIR is now PLANNER_DATA_DIR; the old name still works for now.');
const DATA_DIR = CUSTOM_DIR ? path.resolve(CUSTOM_DIR) : path.join(ROOT, 'planner', 'data');

// One line saying how to move data that is still where an earlier version kept it (<repo>/data, and the backlogs in
// a `user-stories` folder), or null when nothing needs moving. A custom PLANNER_DATA_DIR is never moved, only renamed inside.
function legacyDataHint({ root = ROOT, dataDir = DATA_DIR, custom = Boolean(CUSTOM_DIR) } = {}) {
  if (!custom && !fs.existsSync(dataDir) && fs.existsSync(path.join(root, 'data'))) {
    return 'Your data is still in data/. It now lives in planner/data/ and the backlogs folder is `backlogs`: run `Move-Item data planner/data`, then `Rename-Item planner/data/user-stories backlogs`.';
  }
  if (fs.existsSync(path.join(dataDir, 'user-stories')) && !fs.existsSync(path.join(dataDir, 'backlogs'))) {
    return `The backlogs folder is now \`backlogs\`: run \`Rename-Item "${path.join(dataDir, 'user-stories')}" backlogs\`.`;
  }
  return null;
}

module.exports = { ROOT, DATA_DIR, legacyDataHint };
