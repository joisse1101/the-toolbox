'use strict';
// Where things live. The private data (backlogs, reviews, proposals) is set by TLT_DATA_DIR and defaults to
// <repo>/data; the guidelines are part of the repo (planner/claude/guidelines).

const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = process.env.TLT_DATA_DIR ? path.resolve(process.env.TLT_DATA_DIR) : path.join(ROOT, 'data');
const GUIDELINES_DIR = path.join(ROOT, 'planner', 'claude', 'guidelines');

module.exports = { ROOT, DATA_DIR, GUIDELINES_DIR };
