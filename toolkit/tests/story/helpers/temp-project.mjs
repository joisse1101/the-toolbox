// A temp project folder for a test of a spawned story script: it holds an empty `.plans`, the only place a script looks for data.
// Returns { cwd, dataDir }. Build the backlog inside dataDir and spawn the script with `cwd` set to the project folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function tempProject() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'planner-project-'));
  const dataDir = path.join(cwd, '.plans');
  fs.mkdirSync(dataDir);
  return { cwd, dataDir };
}
