#!/usr/bin/env node
// Removes the working files of an archived slice, so the folder keeps only ARCHIVED.md and source.json. Usage:
//   node <skill folder>/remove-working-files.mjs <backlog> <slice> [--check]
// It refuses unless the slice folder holds ARCHIVED.md, deletes only UC-<slice>.md, tasks.md, review.md, validation.md and
// validation.partial.md, and prints each of them with `tracked` or `untracked` (from `git ls-files`, so the reader knows
// which a delete can be undone from git) and every other file it kept. --check prints the same and deletes nothing.
// The data folder comes from the PLANNER_CONFIG variable, else .plans or a planner.config.yaml in the current folder (see lib/skill-support/resolve-data-dir.mjs).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { diagramsFolder, slicePath, SOURCE_FILE } from './read-diagrams.mjs';
import { dataDirOrThrow } from './lib/skill-support/resolve-data-dir.mjs';

const ARCHIVED_FILE = 'ARCHIVED.md';
const workingFiles = (slice) => [`UC-${slice}.md`, 'tasks.md', 'review.md', 'validation.md', 'validation.partial.md'];

// Whether git tracks the file. A folder outside any repository, or a failing git, counts as untracked.
function isTracked(sliceDir, name) {
  const r = spawnSync('git', ['ls-files', '--', name], { cwd: sliceDir, encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim() !== '';
}

const isFile = (file) => {
  try {
    return fs.lstatSync(file).isFile();
  } catch {
    return false;
  }
};

// -> { ok: true, remove: [{ name, tracked }], kept: [name], text } | { ok: false, errors }. Deletes the files unless `check`.
export function removeWorkingFiles({ dataDir = dataDirOrThrow(), name, slice, check = false }) {
  const f = diagramsFolder({ dataDir, name });
  if (!f.ok) return f;
  const sliceDir = slicePath(f.dir, slice);
  if (!sliceDir) return { ok: false, errors: [`The slice name "${slice}" must be a lowercase slug (letters, digits and hyphens).`] };
  if (!isFile(path.join(sliceDir, ARCHIVED_FILE))) {
    return { ok: false, errors: [`Nothing was deleted: ${sliceDir} holds no ${ARCHIVED_FILE}, so the slice is not archived.`] };
  }
  const working = workingFiles(slice);
  const present = fs.readdirSync(sliceDir, { withFileTypes: true }).filter((e) => !e.isDirectory()).map((e) => e.name).sort();
  const remove = working.filter((n) => present.includes(n) && isFile(path.join(sliceDir, n))).map((n) => ({ name: n, tracked: isTracked(sliceDir, n) }));
  const kept = present.filter((n) => !working.includes(n) && n !== ARCHIVED_FILE && n !== SOURCE_FILE);

  const failures = [];
  if (!check) {
    for (const file of remove) {
      try {
        fs.unlinkSync(path.join(sliceDir, file.name));
      } catch (err) {
        failures.push(`Could not delete ${file.name}: ${err.message}`);
      }
    }
  }
  if (failures.length) return { ok: false, errors: failures };

  const verb = check ? 'would delete' : 'deleted';
  const lines = remove.map((file) => `${verb}: ${file.name} (${file.tracked ? 'tracked' : 'untracked'})`);
  if (remove.length === 0) lines.push('no working files present');
  for (const n of kept) lines.push(`kept: ${n} (not a working file)`);
  return { ok: true, check, remove, kept, text: lines.join('\n') };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
  const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (names.length !== 2 || flags.some((x) => x !== '--check')) {
    console.error('Usage: node remove-working-files.mjs <backlog> <slice> [--check]');
    process.exit(2);
  }
  let result;
  try {
    result = removeWorkingFiles({ dataDir: dataDirOrThrow(), name: names[0], slice: names[1], check: flags.includes('--check') });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  if (!result.ok) {
    for (const e of result.errors) console.error(e);
    process.exit(1);
  }
  console.log(result.text);
}
