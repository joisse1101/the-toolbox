'use strict';
// Where things live. The private data (backlogs, reviews, proposals) is set by `dataDir` in the project config
// (planner.config.yaml, or the file PLANNER_CONFIG names) and defaults to the planner's data/ folder. See project-config.cjs.
// DATA_DIR is the folder as read when this module loaded, for short-lived scripts; the server calls
// getDataDir() each time, so setDataDir() takes effect at once.

const fs = require('fs');
const path = require('path');
const { loadConfig, DEFAULT_DATA_DIR } = require('./project-config.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DATA_DIR = loadConfig().dataDir;
let current = DATA_DIR;

function getDataDir() {
  return current;
}

// Switches the folder for callers of getDataDir(). Does not touch the config file or DATA_DIR.
function setDataDir(dir) {
  current = path.resolve(dir);
  return current;
}

// One line saying how to move data that is still where an earlier version kept it (<repo>/data, and the backlogs in
// a `user-stories` folder), or null when nothing needs moving. A data folder named in the config is never moved, only renamed inside.
function legacyDataHint({ root = ROOT, dataDir = getDataDir(), custom = path.resolve(dataDir) !== DEFAULT_DATA_DIR } = {}) {
  if (!custom && !fs.existsSync(dataDir) && fs.existsSync(path.join(root, 'data'))) {
    return 'Your data is still in data/. It now lives in planner/data/ and the backlogs folder is `backlogs`: run `Move-Item data planner/data`, then `Rename-Item planner/data/user-stories backlogs`.';
  }
  if (fs.existsSync(path.join(dataDir, 'user-stories')) && !fs.existsSync(path.join(dataDir, 'backlogs'))) {
    return `The backlogs folder is now \`backlogs\`: run \`Rename-Item "${path.join(dataDir, 'user-stories')}" backlogs\`.`;
  }
  return null;
}

module.exports = { ROOT, DATA_DIR, getDataDir, setDataDir, legacyDataHint };
