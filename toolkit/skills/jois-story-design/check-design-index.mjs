// Checks the story index of a design against the backlog and changes no file. Usage, with nothing on stdin:
//   node <skill folder>/check-design-index.mjs <backlog name> [--json]
// It reads <data folder>/<backlog>/design-index.csv, designs.json and user-stories.csv itself, and matches by story ID and exact
// criterion text. It prints the stale findings (changed, missing and new stories) and the coverage findings (a criterion with no
// artboard; a failure criterion with no error artboard). A story is `new` only when it is in the scope of a designs.json entry, so a
// migrated story whose canvas designs.json does not list is checked for changed and missing only. A missing design-index.csv counts
// as no rows when designs.json exists; with neither file there is no design to check.
// Exit codes, as read-diagrams.mjs has them: 0 when the check ran (findings or none, they are printed), 1 when it could not run
// (an unreadable file, no backlog, no design), 2 for a wrong command line. The data folder is the .plans folder in the current
// folder (see lib/skill-support/resolve-data-dir.mjs). The jois-story-plan copy of this script is the same file.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadBacklog } from './lib/backlog/model.mjs';
import { IndexError, parseDesignIndexCsv } from './lib/design/design-index-csv.mjs';
import { buildDesignIndex, checkCoverage, compareIndex, parseDesignsText } from './lib/skill-support/design-index.mjs';
import { dataDirOrThrow } from './lib/skill-support/resolve-data-dir.mjs';
import { initialsOf } from './lib/skill-support/backlog-initials.mjs';
import { backlogDir, backlogFile } from './lib/storage/backlog-paths.mjs';
import { shown } from './lib/skill-support/paths.mjs';

const INDEX_FILE = 'design-index.csv';
const DESIGNS_FILE = 'designs.json';
// -> { ok: true, backlog, stale, coverage } or { ok: false, errors }. Reads only.
export function checkDesignIndex({ dataDir = dataDirOrThrow(), name }) {
  let dir;
  let csvPath;
  try {
    dir = backlogDir(dataDir, name);
    csvPath = backlogFile(dataDir, name, 'backlog');
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  const backlog = path.basename(dir);
  if (!fs.existsSync(csvPath)) return { ok: false, errors: [`There is no backlog ${backlog}: ${shown(dataDir, csvPath)} was not found.`] };
  const indexPath = path.join(dir, INDEX_FILE);
  const designsPath = path.join(dir, DESIGNS_FILE);
  if (!fs.existsSync(indexPath) && !fs.existsSync(designsPath)) {
    return { ok: false, errors: [`There is no design for ${backlog}: neither ${shown(dataDir, indexPath)} nor ${shown(dataDir, designsPath)} exists. Run jois-story-design first.`] };
  }
  let rows = [];
  if (fs.existsSync(indexPath)) {
    try {
      rows = parseDesignIndexCsv(fs.readFileSync(indexPath, 'utf8'));
    } catch (err) {
      if (err instanceof IndexError) return { ok: false, errors: [`${shown(dataDir, indexPath)} cannot be read: ${err.message}`] };
      throw err;
    }
  }
  let designs = [];
  if (fs.existsSync(designsPath)) {
    try {
      designs = parseDesignsText(fs.readFileSync(designsPath, 'utf8'));
    } catch (err) {
      return { ok: false, errors: [`${shown(dataDir, designsPath)} cannot be read: ${err.message}`] };
    }
  }
  const { stories } = loadBacklog(fs.readFileSync(csvPath, 'utf8'), { initials: initialsOf(dataDir, backlog) });
  const index = buildDesignIndex(rows);
  return { ok: true, backlog, stale: compareIndex(index, stories, designs), coverage: checkCoverage(index) };
}

export function formatCheck(r) {
  const lines = [];
  for (const c of r.stale.changed) {
    lines.push(`changed: ${c.storyId} "${c.title}" was reworded since the index was written`);
    if (c.oldTitle !== null) lines.push(`  title was "${c.oldTitle}"`);
    for (const t of c.removed) lines.push(`  old (in the index, not in the backlog): ${t}`);
    for (const t of c.added) lines.push(`  new (in the backlog, not in the index): ${t}`);
  }
  for (const s of r.stale.missing) lines.push(`missing: ${s.storyId} "${s.title}" is no longer in the backlog (deleted, split or moved)`);
  for (const s of r.stale.new) lines.push(`new: ${s.storyId} "${s.title}" is in the designed scope and has no rows in the index`);
  for (const p of r.coverage.noArtboard) lines.push(`no artboard: ${p.storyId} "${p.story}": ${p.criterion}`);
  for (const p of r.coverage.noErrorArtboard) lines.push(`no error artboard: ${p.storyId} "${p.story}": ${p.criterion}`);
  const count = lines.filter((l) => !l.startsWith('  ')).length;
  return lines.length ? `${count} finding${count === 1 ? '' : 's'}:\n${lines.join('\n')}` : 'no findings: the index matches the backlog and every criterion has its artboards.';
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const rest = args.filter((a) => a !== '--json');
  if (rest.length !== 1) {
    console.error('Usage: node check-design-index.mjs <backlog name> [--json]  (reads design-index.csv, designs.json and the backlog itself)');
    process.exit(2);
  }
  let result;
  try {
    result = checkDesignIndex({ dataDir: dataDirOrThrow(), name: rest[0] });
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
