// GENERATED. Do not edit this copy.
'use strict';
// The guidelines are shared content (the portal shows one of them too); only the Claude scripts read them from disk.
// The data paths of a backlog come from storage/backlog-paths.cjs; `shown` is how the scripts name one to a person.
//
// This file is copied into each skill's lib/skill-support/ by planner/scripts/sync-skill-logic.mjs. There the skill's
// references/ folder (a sibling of lib/) holds the guidelines. In the planner they are in planner/guidelines/, so the
// second candidate is the one that exists when this file runs from planner/logic/skill-support/.

const fs = require('fs');
const path = require('path');

const BUNDLED = path.resolve(__dirname, '..', '..', 'references');
const GUIDELINES_DIR = fs.existsSync(BUNDLED) ? BUNDLED : path.resolve(__dirname, '..', '..', 'guidelines');

// A path inside the data folder as the scripts say it in messages: relative to the data folder, with forward slashes
// (`iam/user-stories.csv`).
function shown(dataDir, target) {
  return path.relative(dataDir, target).split(path.sep).join('/');
}

module.exports = { GUIDELINES_DIR, shown };
