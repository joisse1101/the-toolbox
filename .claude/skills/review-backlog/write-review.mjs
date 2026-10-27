// The only way the review-backlog skill writes anything. Usage:
//   node .claude/skills/review-backlog/write-review.mjs <backlog file name>            (findings as JSON on stdin)
//   node .claude/skills/review-backlog/write-review.mjs <backlog file name> --append   (add a batch to the review)
// Reads backlogs/<name>, validates the findings against it and writes reviews/<name>. There is no output
// path argument: the target is fixed, and backlogs/ is only ever read. Without --append the run replaces the
// review; with it the batch is validated alone and its rows are added after the existing ones, so a long review
// can be written as several small commands. Statuses the user already decided (applied/dismissed) are kept in
// reviews/<name>.decided (not a .csv, so the file API never lists it) so later batches can restore them.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadBacklog } from '../../../planner/logic/backlog/model.js';
import {
  parseReview, serializeReview, validateFindings, fillCurrent, mergeStatus,
} from '../../../planner/logic/review/review.js';
import { describeParseError as describeJsonError, writeAtomic } from '../_shared/write-atomic.mjs';

const require = createRequire(import.meta.url);
const { validateName } = require('../../../planner/logic/storage/file-name.cjs'); // same name rules as the file API
const { DATA_DIR } = require('../../../planner/logic/storage/paths.cjs');

// Rows already decided by the user, keyed like mergeStatus does; later lists win.
function mergeDecided(...lists) {
  const byKey = new Map();
  for (const rows of lists) {
    for (const r of rows) byKey.set(JSON.stringify([r.storyId, r.field, r.action, r.suggested]), r);
  }
  return [...byKey.values()];
}

// { ok: true, rows } (empty when the file is not there yet) or the parseReview error.
function readRows(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return { ok: true, rows: [] };
  }
  return parseReview(text);
}

// Reads the backlog and the review and validates the findings against them. Returns { ok: true, file, batch, rows,
// decided } (batch: the new rows, rows: the whole file as it will be, decided: the decisions to keep aside) or
// { ok: false, errors }. Writes nothing.
function prepare({ dataDir, name, input, append, requireTitles }) {
  let file;
  try {
    file = validateName(name);
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  const backlogDir = path.join(dataDir, 'backlogs');
  const reviewDir = path.join(dataDir, 'reviews');
  const backlogPath = path.join(backlogDir, file);
  if (path.dirname(backlogPath) !== backlogDir) return { ok: false, errors: ['File name is not allowed'] };

  let backlogText;
  try {
    backlogText = fs.readFileSync(backlogPath, 'utf8');
  } catch {
    return { ok: false, errors: [`backlogs/${file} was not found.`] };
  }
  const backlog = loadBacklog(backlogText);

  let findings;
  try {
    findings = JSON.parse(input);
  } catch (err) {
    return { ok: false, errors: [describeJsonError(err, input, 'findings')] };
  }
  const old = readRows(path.join(reviewDir, file));
  const earlier = readRows(path.join(reviewDir, `${file}.decided`));
  // A field edit on a locked story needs an unlock row in the resulting file: the rows this batch is added to count.
  const existingRows = append && old.ok ? old.rows : [];
  const errors = validateFindings(findings, backlog, { existingRows, requireTitles }).map((e) => e.replace(/^Finding (\d+)/, 'Finding $1 in this batch'));

  if (append && !old.ok) errors.push(`reviews/${file} cannot be appended to: ${old.error}`);
  if (append && old.ok && Array.isArray(findings)) {
    const used = new Set(old.rows.map((r) => r.group).filter(Boolean));
    const reused = new Set(findings.map((f) => String(f?.group ?? '').trim()).filter((g) => used.has(g)));
    for (const g of reused) errors.push(`Group "${g}" is already in reviews/${file}: keep all rows of a group in one batch.`);
  }
  if (errors.length) return { ok: false, errors };

  // Decisions made before this run: those kept aside by the run that started this review, plus (for a run that
  // replaces the review) the decided rows the file holds now.
  const decided = mergeDecided(
    earlier.ok ? earlier.rows : [],
    !append && old.ok ? old.rows.filter((r) => r.status !== 'open') : [],
  );
  const batch = mergeStatus(fillCurrent(findings, backlog), decided);
  const rows = append && old.ok ? [...old.rows, ...batch] : batch;
  return { ok: true, file, batch, rows, decided };
}

// Same input and problems as writeReview, and for valid input the number of rows it would add; no file is created or
// changed. Returns { ok: true, file, added } or { ok: false, errors }.
export function checkReview({ dataDir = DATA_DIR, name, input, append = false, requireTitles = false }) {
  const prepared = prepare({ dataDir, name, input, append, requireTitles });
  if (!prepared.ok) return prepared;
  return { ok: true, file: prepared.file, added: prepared.batch.length };
}

// Returns { ok: true, file, added, count } or { ok: false, errors: [...] }. Writes nothing unless everything is valid. After
// the write the file is read again; `count` is the number of rows read back, and a file that does not hold the rows
// that were written is an error.
export function writeReview({ dataDir = DATA_DIR, name, input, append = false, requireTitles = false }) {
  const prepared = prepare({ dataDir, name, input, append, requireTitles });
  if (!prepared.ok) return prepared;
  const { file, batch, rows, decided } = prepared;
  const reviewDir = path.join(dataDir, 'reviews');

  fs.mkdirSync(reviewDir, { recursive: true });
  if (!append && decided.length) {
    const failed = writeAtomic(reviewDir, `${file}.decided`, serializeReview(decided), 'write_review');
    if (failed) return { ok: false, errors: [failed] };
  }
  const failed = writeAtomic(reviewDir, file, serializeReview(rows), 'write_review');
  if (failed) return { ok: false, errors: [failed] };

  const stored = readRows(path.join(reviewDir, file));
  if (!stored.ok || stored.rows.length !== rows.length) {
    const what = stored.ok ? `${stored.rows.length} rows on disk, ${rows.length} expected` : stored.error;
    return { ok: false, errors: [`Wrote reviews/${file} but the file read back is wrong: ${what}. Do not report these suggestions as written.`] };
  }
  return { ok: true, file, added: batch.length, count: stored.rows.length };
}

// Accepts `<name>` or `<name> --append`; anything else is null.
export function parseArgs(args) {
  const [name, flag] = args;
  if (!name || name === '--append' || args.length > 2) return null;
  if (args.length === 2 && flag !== '--append') return null;
  return { name, append: args.length === 2 };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error('Usage: node write-review.mjs <backlog file name> [--append]  (findings JSON on stdin)');
    process.exit(2);
  }
  const result = writeReview({ ...args, input: fs.readFileSync(0, 'utf8') });
  if (!result.ok) {
    console.error(`Nothing was written. ${result.errors.length} problem${result.errors.length > 1 ? 's' : ''}:`);
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(`Wrote ${result.added} suggestion${result.added === 1 ? '' : 's'} to reviews/${result.file}; ${result.count} in the file now.`);
}
