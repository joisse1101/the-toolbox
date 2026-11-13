// Creates a backlog's folder with its starting files. The content comes from the caller (see starting-files.ts).
// Paths come from shared/storage/backlog-paths.ts by kind.

import fs from 'node:fs';
import path from 'node:path';
import { HttpError, validateBacklogName } from '../../shared/storage/file-name.ts';
import { backlogDir, backlogFile } from '../../shared/storage/backlog-paths.ts';
import type { BacklogKind } from '../../shared/types.ts'; // the kinds of file a backlog holds

const MAX_NAME_TRIES = 1000;

const numbered = (name: string, n: number) => (n === 1 ? name : `${name}-${n}`);

// Writes a file that must not exist yet (flag `wx`), making its folder first.
async function writeNew(file: string, content: string) {
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
export async function writeBacklogFiles(dataDir: string, requested: unknown, files: { kind: BacklogKind; text: string }[]): Promise<string> {
  const wanted = validateBacklogName(requested);
  await fs.promises.mkdir(dataDir, { recursive: true });
  for (let n = 1; n < MAX_NAME_TRIES; n++) {
    const name = numbered(wanted, n);
    const dir = backlogDir(dataDir, name);
    try {
      await fs.promises.mkdir(dir); // not recursive: EEXIST means the name is taken
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
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
