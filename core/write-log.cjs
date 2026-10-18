'use strict';
// One line of JSON per write to a data file, appended to <data dir>/logs/writes.jsonl by the portal's file API and by the
// writer scripts, so the order of writes from both can be read in one place. It holds no file contents, only the size and
// a short hash. `logs` is not a registered store, so the file API cannot reach it. A failure to log is reported on
// standard error and never fails the write it describes.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR } = require('./paths.cjs');

const LOG_FILE = 'writes.jsonl';

// writer: 'portal' or the name of the script or tool; store: the data folder's name; file: the file name; text: the new content.
function logWrite({ writer, store, file, text, dataDir = DATA_DIR }) {
  try {
    const dir = path.join(dataDir, 'logs');
    fs.mkdirSync(dir, { recursive: true });
    const line = {
      time: new Date().toISOString(),
      writer,
      store,
      file,
      bytes: Buffer.byteLength(text, 'utf8'),
      hash: crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 12),
    };
    fs.appendFileSync(path.join(dir, LOG_FILE), `${JSON.stringify(line)}\n`, 'utf8');
  } catch (err) {
    console.error(`write log: could not log the write of ${store}/${file}: ${err.message}`);
  }
}

module.exports = { logWrite, LOG_FILE };
