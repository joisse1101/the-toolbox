// The only way the propose-stories skill writes anything. Usage:
//   node .claude/skills/propose-stories/write-proposal.mjs <backlog file name> [--check]   (stories as JSON on stdin)
// Reads user-stories/<name>, validates the input against it and writes proposals/<name>. The input is a JSON list whose
// items are either new stories (no "id"), which are ADDED with NEW-<n> IDs, or patches (an "id" such as NEW-8 plus
// only the fields to change), which change that proposed story in place. One invalid item means nothing is written.
// There is no output path argument: the target is fixed, and user-stories/ is only ever read. Rows the input does not
// name are kept as they are (the user edits the proposals file in the portal) and nothing is removed. A new story that
// repeats a stored proposal (same Epic, Feature and Title) is skipped, so running the same batch twice adds it once.
// With --check the same validation runs and reports what would happen, and nothing is written.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadBacklog, serializeBacklog, proposalHeaders } from '../../../planner/logic/backlog/model.js';
import { buildProposals } from './proposal-input.js';
import { describeParseError, writeAtomic } from '../_shared/write-atomic.mjs';

const require = createRequire(import.meta.url);
const { validateName } = require('../../../planner/logic/storage/file-name.cjs'); // same name rules as the file API
const { DATA_DIR } = require('../../../planner/logic/storage/paths.cjs');

// Reads the backlog and the proposals and validates the input against them. Returns { ok: true, file, backlog,
// proposals, built } (built: the buildProposals result) or { ok: false, errors }. Writes nothing.
function prepare({ dataDir, name, input, requireTitles }) {
  let file;
  try {
    file = validateName(name);
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  const backlogDir = path.join(dataDir, 'user-stories');
  const proposalDir = path.join(dataDir, 'proposals');
  const backlogPath = path.join(backlogDir, file);
  if (path.dirname(backlogPath) !== backlogDir) return { ok: false, errors: ['File name is not allowed'] };

  let backlogText;
  try {
    backlogText = fs.readFileSync(backlogPath, 'utf8');
  } catch {
    return { ok: false, errors: [`user-stories/${file} was not found.`] };
  }
  const backlog = loadBacklog(backlogText);

  let proposals = null;
  try {
    proposals = loadBacklog(fs.readFileSync(path.join(proposalDir, file), 'utf8'), { placeholderIds: true });
  } catch (err) {
    if (err.code !== 'ENOENT') return { ok: false, errors: [`Could not read proposals/${file}: ${err.message}`] };
  }

  let stories;
  try {
    stories = JSON.parse(input);
  } catch (err) {
    return { ok: false, errors: [describeParseError(err, input)] };
  }
  const built = buildProposals({ input: stories, backlog, proposals, requireTitles });
  if (!built.ok) return built;
  return { ok: true, file, backlog, proposals, built };
}

// Same input and problems as writeProposal, and for valid input what it would do; no file is created or changed.
// Returns { ok: true, file, ids, patchedIds, skipped } or { ok: false, errors }.
export function checkProposal({ dataDir = DATA_DIR, name, input, requireTitles = false }) {
  const prepared = prepare({ dataDir, name, input, requireTitles });
  if (!prepared.ok) return prepared;
  const { file, built } = prepared;
  return { ok: true, file, ids: built.ids, patchedIds: built.patchedIds, skipped: built.skipped };
}

// Returns { ok: true, file, ids, patchedIds, skipped, count } (ids: the stories added, patchedIds: the stories patched, skipped: the
// new stories that repeat a stored one) or { ok: false, errors: [...] }. Writes nothing unless everything is valid, and
// leaves the file alone when there is nothing to add or patch. After the write the file is read again: `count` and `found`
// (the added and patched IDs) are what was read from disk, and a file that does not hold them is an error.
export function writeProposal({ dataDir = DATA_DIR, name, input, requireTitles = false }) {
  const prepared = prepare({ dataDir, name, input, requireTitles });
  if (!prepared.ok) return prepared;
  const { file, backlog, proposals, built } = prepared;
  const proposalDir = path.join(dataDir, 'proposals');

  // A new file gets the backlog's columns and a BOM (Excel opens it as UTF-8), as the portal does.
  const target = proposals ?? { headers: proposalHeaders(backlog.headers), stories: [], hasBom: true };
  const all = { ...target, stories: [...built.proposed, ...built.stories] };
  const result = { ok: true, file, ids: built.ids, patchedIds: built.patchedIds, skipped: built.skipped, count: all.stories.length };
  if (proposals && !built.ids.length && !built.patchedIds.length) return result;
  fs.mkdirSync(proposalDir, { recursive: true });
  const failed = writeAtomic(proposalDir, file, serializeBacklog(all), 'write_proposals');
  if (failed) return { ok: false, errors: [failed] };

  // Read the file again: what is reported as written is what is on disk now.
  let stored;
  try {
    stored = loadBacklog(fs.readFileSync(path.join(proposalDir, file), 'utf8'), { placeholderIds: true });
  } catch (err) {
    return { ok: false, errors: [`Wrote proposals/${file} but could not read it back: ${err.message}`] };
  }
  const missing = missingAfterWrite(stored, [...built.ids, ...built.patchedIds], all.stories.length);
  if (missing) return { ok: false, errors: [`Wrote proposals/${file} but the file read back is wrong: ${missing}. Do not report these stories as written.`] };
  return { ...result, count: stored.stories.length, found: [...built.ids, ...built.patchedIds] };
}

// What is wrong with the file read back after a write, or null when every expected ID is in it and the row count is right.
export function missingAfterWrite(stored, expectedCodes, expectedCount) {
  const have = new Set(stored.stories.map((s) => s.code));
  const lost = expectedCodes.filter((code) => !have.has(code));
  if (lost.length) return `${lost.join(', ')} not found (${stored.stories.length} stories on disk, ${expectedCount} expected)`;
  if (stored.stories.length !== expectedCount) return `${stored.stories.length} stories on disk, ${expectedCount} expected`;
  return null;
}

// " On disk: NEW-1, NEW-2." for the IDs that were read back from the file, or "" when none were written.
export const foundText = (found = []) => (found.length ? ` On disk: ${found.join(', ')}.` : '');

const plural = (n) => `${n} proposed stor${n === 1 ? 'y' : 'ies'}`;

// "Skipped 2 already in the file (Story 1 = NEW-3, ...)" or null when nothing was skipped.
export function skippedText(skipped, prefix = 'Skipped') {
  if (!skipped.length) return null;
  return `${prefix} ${skipped.length} already in the file (${skipped.map((s) => `${s.name} = ${s.id}`).join(', ')})`;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const check = process.argv[3] === '--check';
  if (process.argv.length !== (check ? 4 : 3)) {
    console.error('Usage: node write-proposal.mjs <backlog file name> [--check]  (stories JSON on stdin)');
    process.exit(2);
  }
  const result = (check ? checkProposal : writeProposal)({ name: process.argv[2], input: fs.readFileSync(0, 'utf8') });
  if (!result.ok) {
    console.error(`Nothing was written. ${result.errors.length} problem${result.errors.length > 1 ? 's' : ''}:`);
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  const done = [];
  if (result.ids.length) done.push(`Added ${plural(result.ids.length)} to proposals/${result.file} (${result.ids.join(', ')})`);
  if (result.patchedIds.length) done.push(`${done.length ? 'patched' : 'Patched'} ${plural(result.patchedIds.length)}${done.length ? '' : ` in proposals/${result.file}`} (${result.patchedIds.join(', ')})`);
  const skipped = skippedText(result.skipped, done.length ? 'skipped' : 'Skipped');
  if (skipped) done.push(skipped);
  console.log(check ? `Check passed, nothing written. Would be: ${done.join('; ')}.` : `${done.join('; ')}; ${result.count} in the file now.${foundText(result.found)}`);
}
