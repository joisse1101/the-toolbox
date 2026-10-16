// The only way the propose-stories skill writes anything. Usage:
//   node .claude/skills/propose-stories/write-proposal.mjs <backlog file name>   (stories as JSON on stdin)
// Reads user-stories/<name>, validates the input against it and writes proposals/<name>. The input is a JSON list whose
// items are either new stories (no "id"), which are ADDED with NEW-<n> IDs, or patches (an "id" such as NEW-8 plus
// only the fields to change), which change that proposed story in place. One invalid item means nothing is written.
// There is no output path argument: the target is fixed, and user-stories/ is only ever read. Rows the input does not
// name are kept as they are (the user edits the proposals file in the portal) and nothing is removed; running the
// same batch of new stories twice adds them twice.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadBacklog, serializeBacklog, proposalHeaders } from '../../../core/model.js';
import { buildProposals } from '../../../core/proposal-input.js';

const require = createRequire(import.meta.url);
const { validateName } = require('../../../core/file-name.cjs'); // same name rules as the file API
const { DATA_DIR } = require('../../../core/paths.cjs');

// A JSON.parse failure message plus line, column and a short excerpt, so a missing comma can be found.
export function describeParseError(err, text, what = 'stories') {
  const message = err.message.replace(/\s*\(line \d+ column \d+\)/, ''); // the position is reported below
  const at = /position (\d+)/.exec(message);
  if (!at) return `The ${what} on stdin are not valid JSON: ${message}`;
  const pos = Math.min(Number(at[1]), text.length);
  const lines = text.slice(0, pos).split('\n');
  const excerpt = text.slice(Math.max(0, pos - 30), pos + 30).replace(/\s+/g, ' ');
  return `The ${what} on stdin are not valid JSON: ${message} (line ${lines.length}, column ${lines[lines.length - 1].length + 1}, near "${excerpt}")`;
}

// Write beside the target, then rename over it, so a failure never leaves a partly written file. A .tmp file is
// not listed by the file API. Returns an error message, or null.
export function writeAtomic(dir, file, text) {
  const tmp = path.join(dir, `${file}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(tmp, text, 'utf8');
    fs.renameSync(tmp, path.join(dir, file));
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    return `Could not write ${path.basename(dir)}/${file}: ${err.message} (is it open in Excel?)`;
  }
  return null;
}

// Returns { ok: true, file, ids, patchedIds, count } (ids: the stories added, patchedIds: the stories patched) or { ok: false, errors: [...] }. Writes nothing unless everything is valid.
export function writeProposal({ dataDir = DATA_DIR, name, input }) {
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
  const built = buildProposals({ input: stories, backlog, proposals });
  if (!built.ok) return built;

  // A new file gets the backlog's columns and a BOM (Excel opens it as UTF-8), as the portal does.
  const target = proposals ?? { headers: proposalHeaders(backlog.headers), stories: [], hasBom: true };
  const all = { ...target, stories: [...built.proposed, ...built.stories] };
  fs.mkdirSync(proposalDir, { recursive: true });
  const failed = writeAtomic(proposalDir, file, serializeBacklog(all));
  if (failed) return { ok: false, errors: [failed] };
  return { ok: true, file, ids: built.ids, patchedIds: built.patchedIds, count: all.stories.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  if (process.argv.length !== 3) {
    console.error('Usage: node write-proposal.mjs <backlog file name>  (stories JSON on stdin)');
    process.exit(2);
  }
  const result = writeProposal({ name: process.argv[2], input: fs.readFileSync(0, 'utf8') });
  if (!result.ok) {
    console.error(`Nothing was written. ${result.errors.length} problem${result.errors.length > 1 ? 's' : ''}:`);
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  const plural = (n) => `${n} proposed stor${n === 1 ? 'y' : 'ies'}`;
  const done = [];
  if (result.ids.length) done.push(`Added ${plural(result.ids.length)} to proposals/${result.file} (${result.ids.join(', ')})`);
  if (result.patchedIds.length) done.push(`${done.length ? 'patched' : 'Patched'} ${plural(result.patchedIds.length)}${done.length ? '' : ` in proposals/${result.file}`} (${result.patchedIds.join(', ')})`);
  console.log(`${done.join('; ')}; ${result.count} in the file now.`);
}
