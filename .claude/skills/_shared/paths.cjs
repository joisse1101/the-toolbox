'use strict';
// The guidelines are shared content (the portal shows one of them too); only the Claude scripts read them from disk.
// The data paths of a backlog come from planner/logic/storage/backlog-paths.cjs; `shown` is how the scripts name one to a person.

const path = require('path');
const { ROOT } = require('../../../planner/logic/storage/paths.cjs');

const GUIDELINES_DIR = path.join(ROOT, 'planner', 'guidelines');

// A path inside the data folder as the scripts say it in messages: relative to the data folder, with forward slashes
// (`iam/user-stories.csv`).
function shown(dataDir, target) {
  return path.relative(dataDir, target).split(path.sep).join('/');
}

module.exports = { GUIDELINES_DIR, shown };
