'use strict';
// The guidelines are shared content (the portal shows one of them too); only the Claude scripts read them from disk.

const path = require('path');
const { ROOT } = require('../../logic/paths.cjs');

const GUIDELINES_DIR = path.join(ROOT, 'planner', 'guidelines');

module.exports = { GUIDELINES_DIR };
