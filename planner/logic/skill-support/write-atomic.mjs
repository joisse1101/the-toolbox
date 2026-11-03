// Shared by the Claude writers (write-proposal, write-lexicon, suggest-lexicon, write-review).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { logWrite } = require('../storage/write-log.cjs');

// A JSON.parse failure message plus line, column and a short excerpt, so a missing comma can be found.
export function describeParseError(err, text, what = 'stories') {
  const message = err.message.replace(/\s*\(line \d+ column \d+\)/, ''); // the position is reported below
  const at = /position (\d+)/.exec(message);
  if (!at) return `The ${what} on stdin are not valid JSON: ${message}`;
  const pos = Math.min(Number(at[1]), text.length);
  const lines = text.slice(0, pos).split('\n');
  const excerpt = text.slice(Math.max(0, pos - 30), pos + 30).replace(/\s+/g, ' ');
  return `The ${what} on stdin are not valid JSON: ${message} (line ${lines.length}, column ${lines[lines.length - 1].length + 1}, near "${excerpt}")`;
}

// Write beside the target, then rename over it, so a failure never leaves a partly written file. A .tmp file is
// not listed by the file API. `writer` (the tool's name) is recorded in the write log when given, with
// `log` = { dataDir, backlog, kind, extra? }: the data folder, the backlog's name and the kind of file written. Returns an
// error message, or null.
export function writeAtomic(dir, file, text, writer, log) {
  const tmp = path.join(dir, `${file}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(tmp, text, 'utf8');
    fs.renameSync(tmp, path.join(dir, file));
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    return `Could not write ${path.basename(dir)}/${file}: ${err.message} (is it open in Excel?)`;
  }
  if (writer) {
    if (log) logWrite({ writer, backlog: log.backlog, kind: log.kind, text, extra: log.extra, dataDir: log.dataDir });
    else logWrite({ writer, store: path.basename(dir), file, text, dataDir: path.dirname(dir) });
  }
  return null;
}
