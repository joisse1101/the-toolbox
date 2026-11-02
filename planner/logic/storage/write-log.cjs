'use strict';
// One line of JSON per write to a data file, appended to <data dir>/logs/writes.jsonl by the portal's file API and by the
// writer scripts, so the order of writes from both can be read in one place. It holds no file contents, only the size and
// a short hash. `logs` is not a kind of file, so the file API cannot reach it. A failure to log is reported on
// standard error and never fails the write it describes.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDataDir } = require('./paths.cjs');
const { logFile } = require('./backlog-paths.cjs');

const LOG_FILE = 'writes.jsonl';

// writer: 'portal' or the name of the script or tool; backlog: the backlog's name; kind: the kind of file written
// (`backlog`, `review`, `proposals`, `lexicon`, `lexicon-suggestions`); text: the new content;
// extra: more short fields for the line (the diagram writer adds slice), which never replace the fields above.
// `store` and `file` are the earlier form of backlog and kind: callers not yet moved to the backlog folder layout still
// pass them, and they are logged as given.
function logWrite({ writer, backlog, kind, store, file, text, extra = {}, dataDir = getDataDir() }) {
  try {
    const target = logFile(dataDir);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const line = { ...extra, time: new Date().toISOString(), writer };
    if (backlog !== undefined) line.backlog = backlog;
    if (kind !== undefined) line.kind = kind;
    if (store !== undefined) line.store = store;
    if (file !== undefined) line.file = file;
    line.bytes = Buffer.byteLength(text, 'utf8');
    line.hash = crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 12);
    fs.appendFileSync(target, `${JSON.stringify(line)}\n`, 'utf8');
  } catch (err) {
    console.error(`write log: could not log the write of ${backlog ?? store}/${kind ?? file}: ${err.message}`);
  }
}

module.exports = { logWrite, LOG_FILE };
