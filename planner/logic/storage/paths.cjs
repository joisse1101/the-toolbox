'use strict';
// Where things live. The private data (backlogs, reviews, proposals) is set by TLT_DATA_DIR and defaults to
// <repo>/planner/data.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DATA_DIR = process.env.TLT_DATA_DIR ? path.resolve(process.env.TLT_DATA_DIR) : path.join(ROOT, 'planner', 'data');

// One line saying how to move data that is still where an earlier version kept it (<repo>/data, and the backlogs in
// a `user-stories` folder), or null when nothing needs moving. A custom TLT_DATA_DIR is never moved, only renamed inside.
function legacyDataHint({ root = ROOT, dataDir = DATA_DIR, custom = Boolean(process.env.TLT_DATA_DIR) } = {}) {
  if (!custom && !fs.existsSync(dataDir) && fs.existsSync(path.join(root, 'data'))) {
    return 'Your data is still in data/. It now lives in planner/data/ and the backlogs folder is `backlogs`: run `Move-Item data planner/data`, then `Rename-Item planner/data/user-stories backlogs`.';
  }
  if (fs.existsSync(path.join(dataDir, 'user-stories')) && !fs.existsSync(path.join(dataDir, 'backlogs'))) {
    return `The backlogs folder is now \`backlogs\`: run \`Rename-Item "${path.join(dataDir, 'user-stories')}" backlogs\`.`;
  }
  return null;
}

module.exports = { ROOT, DATA_DIR, legacyDataHint };
