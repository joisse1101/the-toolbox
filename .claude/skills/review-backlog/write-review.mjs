// The only way the review-backlog skill writes anything. Usage:
//   node .claude/skills/review-backlog/write-review.mjs <backlog file name>   (findings as JSON on stdin)
// Reads user-stories/<name>, validates the findings against it and writes reviews/<name>. There is no output
// path argument: the target is fixed, and user-stories/ is only ever read.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadBacklog } from '../../../src/user-story-generator/model.js';
import {
  parseReview, serializeReview, validateFindings, fillCurrent, mergeStatus,
} from '../../../src/user-story-generator/review.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const { validateName } = createRequire(import.meta.url)(path.join(ROOT, 'server.js')); // same name rules as the file API

// Returns { ok: true, file, count } or { ok: false, errors: [...] }. Writes nothing unless everything is valid.
export function writeReview({ root = ROOT, name, input }) {
  let file;
  try {
    file = validateName(name);
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  const backlogDir = path.join(root, 'user-stories');
  const reviewDir = path.join(root, 'reviews');
  const backlogPath = path.join(backlogDir, file);
  if (path.dirname(backlogPath) !== backlogDir) return { ok: false, errors: ['File name is not allowed'] };

  let backlogText;
  try {
    backlogText = fs.readFileSync(backlogPath, 'utf8');
  } catch {
    return { ok: false, errors: [`user-stories/${file} was not found.`] };
  }
  const backlog = loadBacklog(backlogText);

  let findings;
  try {
    findings = JSON.parse(input);
  } catch {
    return { ok: false, errors: ['The findings on stdin are not valid JSON.'] };
  }
  const errors = validateFindings(findings, backlog);
  if (errors.length) return { ok: false, errors };

  const reviewPath = path.join(reviewDir, file);
  let existing = [];
  try {
    const old = parseReview(fs.readFileSync(reviewPath, 'utf8'));
    if (old.ok) existing = old.rows;
  } catch {
    // no earlier review
  }
  const rows = mergeStatus(fillCurrent(findings, backlog), existing);

  // Atomic: write beside the target, then rename over it. A .tmp file is not listed by the file API.
  fs.mkdirSync(reviewDir, { recursive: true });
  const tmp = path.join(reviewDir, `${file}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(tmp, serializeReview(rows), 'utf8');
    fs.renameSync(tmp, reviewPath);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    return { ok: false, errors: [`Could not write reviews/${file}: ${err.message} (is it open in Excel?)`] };
  }
  return { ok: true, file, count: rows.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const name = process.argv[2];
  if (!name || process.argv.length > 3) {
    console.error('Usage: node write-review.mjs <backlog file name>  (findings JSON on stdin)');
    process.exit(2);
  }
  const result = writeReview({ name, input: fs.readFileSync(0, 'utf8') });
  if (!result.ok) {
    console.error(`Nothing was written. ${result.errors.length} problem${result.errors.length > 1 ? 's' : ''}:`);
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(`Wrote reviews/${result.file} with ${result.count} suggestion${result.count === 1 ? '' : 's'}.`);
}
