'use strict';
// Creates a backlog's folder with its starting files. The content comes from the caller (see backlog/starting-files.js,
// an ES module), so this CommonJS file imports nothing outside storage/. Paths come from backlog-paths.cjs by kind.

const fs = require('fs');
const path = require('path');
const { HttpError, validateBacklogName } = require('./file-name.cjs');
const { backlogDir, backlogFile } = require('./backlog-paths.cjs');

const MAX_NAME_TRIES = 1000;

const numbered = (name, n) => (n === 1 ? name : `${name}-${n}`);

// Writes a file that must not exist yet (flag `wx`), making its folder first.
async function writeNew(file, content) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const fh = await fs.promises.open(file, 'wx');
  try {
    await fh.writeFile(content, 'utf8');
  } finally {
    await fh.close();
  }
}

// Makes the backlog folder `requested` (the next free `name-2`, `name-3`, ... when taken) holding each of `files`
// ([{ kind, text }]), and returns the name used. Never overwrites. When a file cannot be written, removes the folder this
// call made and rethrows, so no partial backlog is left.
async function writeBacklogFiles(dataDir, requested, files) {
  const wanted = validateBacklogName(requested);
  await fs.promises.mkdir(dataDir, { recursive: true });
  for (let n = 1; n < MAX_NAME_TRIES; n++) {
    const name = numbered(wanted, n);
    const dir = backlogDir(dataDir, name);
    try {
      await fs.promises.mkdir(dir); // not recursive: EEXIST means the name is taken
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      continue;
    }
    try {
      for (const { kind, text } of files) await writeNew(backlogFile(dataDir, name, kind), text);
    } catch (err) {
      await fs.promises.rm(dir, { recursive: true, force: true });
      throw err;
    }
    return name;
  }
  throw new HttpError(409, 'Could not find a free backlog name', 'exists');
}

module.exports = { writeBacklogFiles };
