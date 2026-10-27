'use strict';
// Where things live. The private data (backlogs, reviews, proposals) is set by TLT_DATA_DIR and defaults to
// <repo>/data.

const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DATA_DIR = process.env.TLT_DATA_DIR ? path.resolve(process.env.TLT_DATA_DIR) : path.join(ROOT, 'data');

module.exports = { ROOT, DATA_DIR };
