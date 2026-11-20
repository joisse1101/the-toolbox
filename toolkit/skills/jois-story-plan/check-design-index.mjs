// Checks the story index of a design canvas against the backlog and changes no file. Usage, the text of Main.dc.html (or the bare JSON
// index) on stdin:
//   node <skill folder>/check-design-index.mjs <backlog name> [--json]
// It prints the stale findings (changed, missing and new stories, each by Title) for the index's scope, and the coverage findings
// (a criterion with no artboard; a failure criterion with no error artboard). The index is data: it is parsed as JSON, never run.
// Exit codes, as read-diagrams.mjs has them: 0 when the check ran (findings or none, they are printed), 1 when it could not run (bad
// index, index of another backlog, no backlog), 2 for a wrong command line. The data folder is the .plans folder in the current folder
// (see lib/skill-support/resolve-data-dir.mjs).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadBacklog } from './lib/backlog/model.mjs';
import { checkCoverage, compareIndex, IndexError, parseIndexText } from './lib/skill-support/design-index.mjs';
import { dataDirOrThrow } from './lib/skill-support/resolve-data-dir.mjs';
import { initialsOf } from './lib/skill-support/backlog-initials.mjs';
import { backlogDir, backlogFile } from './lib/storage/backlog-paths.mjs';
import { shown } from './lib/skill-support/paths.mjs';

// -> { ok: true, backlog, scope, stale, coverage } or { ok: false, errors }. Reads only.
export function checkDesignIndex({ dataDir = dataDirOrThrow(), name, input }) {
  let file;
  let csvPath;
  try {
    file = path.basename(backlogDir(dataDir, name));
    csvPath = backlogFile(dataDir, name, 'backlog');
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  let index;
  try {
    index = parseIndexText(input);
  } catch (err) {
    if (err instanceof IndexError) return { ok: false, errors: [`The index on stdin cannot be read: ${err.message}`] };
    throw err;
  }
  if (index.backlog !== file) return { ok: false, errors: [`The index is for the backlog "${index.backlog}", not "${file}".`] };
  let csv;
  try {
    csv = fs.readFileSync(csvPath, 'utf8');
  } catch (err) {
    return { ok: false, errors: [err.code === 'ENOENT' ? `There is no backlog ${file}: ${shown(dataDir, csvPath)} was not found.` : `Could not read ${shown(dataDir, csvPath)}: ${err.message}`] };
  }
  const { stories } = loadBacklog(csv, { initials: initialsOf(dataDir, file) });
  return { ok: true, backlog: file, scope: index.scope, stale: compareIndex(index, stories), coverage: checkCoverage(index) };
}

export function formatCheck(r) {
  const lines = [];
  for (const c of r.stale.changed) {
    lines.push(`changed: "${c.title}" was reworded since the canvas was drawn`);
    for (const t of c.removed) lines.push(`  no longer in the backlog: ${t}`);
    for (const t of c.added) lines.push(`  new in the backlog: ${t}`);
  }
  for (const t of r.stale.missing) lines.push(`missing: "${t}" is no longer in the backlog under this scope (renamed, moved or deleted)`);
  for (const t of r.stale.new) lines.push(`new: "${t}" is in the scope now and not in the index`);
  for (const p of r.coverage.noArtboard) lines.push(`no artboard: "${p.story}": ${p.criterion}`);
  for (const p of r.coverage.noErrorArtboard) lines.push(`no error artboard: "${p.story}": ${p.criterion}`);
  return lines.length ? `${lines.length} finding${lines.length === 1 ? '' : 's'}:\n${lines.join('\n')}` : 'no findings: the index matches the backlog and every criterion has its artboards.';
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const rest = args.filter((a) => a !== '--json');
  if (rest.length !== 1) {
    console.error('Usage: node check-design-index.mjs <backlog name> [--json]  (Main.dc.html text or the JSON index on stdin)');
    process.exit(2);
  }
  let result;
  try {
    result = checkDesignIndex({ dataDir: dataDirOrThrow(), name: rest[0], input: fs.readFileSync(0, 'utf8') });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  if (!result.ok) {
    console.error(result.errors.join('\n'));
    process.exit(1);
  }
  console.log(json ? JSON.stringify(result, null, 2) : formatCheck(result));
}
