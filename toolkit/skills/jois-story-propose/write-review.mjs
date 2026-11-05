// The only way the jois-story-review skill writes anything. Usage:
//   node write-review.mjs <backlog name>            (findings as JSON on stdin)
//   node write-review.mjs <backlog name> --append   (add a batch to the review)
//   node write-review.mjs <backlog name> [--append] --check   (validate only: report what would be added, write nothing)
// Reads <name>/user-stories.csv, validates the findings against it and writes <name>/user-stories/review.csv. There is no output
// path argument: the target is fixed, and user-stories.csv is only ever read. Without --append the run replaces the
// review; with it the batch is validated alone and its rows are added after the existing ones, so a long review
// can be written as several small commands. Statuses the user already decided (applied/dismissed) are kept in
// <name>/user-stories/review.csv.decided (not a .csv, so the file API never lists it) so later batches can restore them.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadBacklog } from './lib/backlog/model.js';
import {
  parseReview, serializeReview, validateFindings, fillCurrent, mergeStatus,
} from './lib/review/review.js';
import { describeParseError as describeJsonError, writeAtomic } from './lib/skill-support/write-atomic.mjs';
import { dataDirOrThrow } from './lib/skill-support/resolve-data-dir.mjs';
import { initialsOf } from './lib/skill-support/backlog-initials.mjs';

const require = createRequire(import.meta.url);
const { backlogDir, backlogFile, reviewDecidedFile } = require('./lib/storage/backlog-paths.cjs'); // same name rules as the file API
const { shown } = require('./lib/skill-support/paths.cjs');

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
  let backlogPath;
  let reviewPath;
  let decidedPath;
  try {
    file = path.basename(backlogDir(dataDir, name));
    backlogPath = backlogFile(dataDir, name, 'backlog');
    reviewPath = backlogFile(dataDir, name, 'review');
    decidedPath = reviewDecidedFile(dataDir, name);
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  const reviewShown = shown(dataDir, reviewPath);

  let backlogText;
  try {
    backlogText = fs.readFileSync(backlogPath, 'utf8');
  } catch {
    return { ok: false, errors: [`${shown(dataDir, backlogPath)} was not found.`] };
  }
  const backlog = loadBacklog(backlogText, { initials: initialsOf(dataDir, file) });

  let findings;
  try {
    findings = JSON.parse(input);
  } catch (err) {
    return { ok: false, errors: [describeJsonError(err, input, 'findings')] };
  }
  const old = readRows(reviewPath);
  const earlier = readRows(decidedPath);
  const errors = validateFindings(findings, backlog, { requireTitles }).map((e) => e.replace(/^Finding (\d+)/, 'Finding $1 in this batch'));

  if (append && !old.ok) errors.push(`${reviewShown} cannot be appended to: ${old.error}`);
  if (append && old.ok && Array.isArray(findings)) {
    const used = new Set(old.rows.map((r) => r.group).filter(Boolean));
    const reused = new Set(findings.map((f) => String(f?.group ?? '').trim()).filter((g) => used.has(g)));
    for (const g of reused) errors.push(`Group "${g}" is already in ${reviewShown}: keep all rows of a group in one batch.`);
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
  return { ok: true, file, batch, rows, decided, reviewPath, decidedPath, reviewShown };
}

// Same input and problems as writeReview, and for valid input the number of rows it would add; no file is created or
// changed. Returns { ok: true, file, added } or { ok: false, errors }.
export function checkReview({ dataDir = dataDirOrThrow(), name, input, append = false, requireTitles = false }) {
  const prepared = prepare({ dataDir, name, input, append, requireTitles });
  if (!prepared.ok) return prepared;
  return { ok: true, file: prepared.file, added: prepared.batch.length };
}

// Returns { ok: true, file, added, count } or { ok: false, errors: [...] }. Writes nothing unless everything is valid. After
// the write the file is read again; `count` is the number of rows read back, and a file that does not hold the rows
// that were written is an error.
export function writeReview({ dataDir = dataDirOrThrow(), name, input, append = false, requireTitles = false }) {
  const prepared = prepare({ dataDir, name, input, append, requireTitles });
  if (!prepared.ok) return prepared;
  const { file, batch, rows, decided, reviewPath, decidedPath, reviewShown } = prepared;
  const reviewDir = path.dirname(reviewPath);

  fs.mkdirSync(reviewDir, { recursive: true });
  if (!append && decided.length) {
    const failed = writeAtomic(reviewDir, path.basename(decidedPath), serializeReview(decided));
    if (failed) return { ok: false, errors: [failed] };
  }
  const failed = writeAtomic(reviewDir, path.basename(reviewPath), serializeReview(rows));
  if (failed) return { ok: false, errors: [failed] };

  const stored = readRows(reviewPath);
  if (!stored.ok || stored.rows.length !== rows.length) {
    const what = stored.ok ? `${stored.rows.length} rows on disk, ${rows.length} expected` : stored.error;
    return { ok: false, errors: [`Wrote ${reviewShown} but the file read back is wrong: ${what}. Do not report these suggestions as written.`] };
  }
  return { ok: true, file, added: batch.length, count: stored.rows.length };
}

// Accepts `<name>` with `--append` and `--check`, each at most once and in any order; anything else is null.
export function parseArgs(args) {
  const [name, ...flags] = args;
  if (!name || name.startsWith('--')) return null;
  if (flags.some((f) => f !== '--append' && f !== '--check') || new Set(flags).size !== flags.length) return null;
  return { name, append: flags.includes('--append'), check: flags.includes('--check') };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error('Usage: node write-review.mjs <backlog name> [--append] [--check]  (findings JSON on stdin)');
    process.exit(2);
  }
  let result;
  try {
    const { check, ...options } = args;
    result = (check ? checkReview : writeReview)({ ...options, dataDir: dataDirOrThrow(), input: fs.readFileSync(0, 'utf8') });
  } catch (err) {
    console.error(`Nothing was written. ${err.message}`);
    process.exit(1);
  }
  if (!result.ok) {
    console.error(`Nothing was written. ${result.errors.length} problem${result.errors.length > 1 ? 's' : ''}:`);
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  if (args.check) {
    console.log(`Check passed: would add ${result.added} suggestion${result.added === 1 ? '' : 's'} to the review of ${result.file}. Nothing was written.`);
  } else {
    console.log(`Wrote ${result.added} suggestion${result.added === 1 ? '' : 's'} to the review of ${result.file}; ${result.count} in the file now.`);
  }
}
