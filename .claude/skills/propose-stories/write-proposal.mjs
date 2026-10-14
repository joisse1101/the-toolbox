// The only way the propose-stories skill writes anything. Usage:
//   node .claude/skills/propose-stories/write-proposal.mjs <backlog file name>   (stories as JSON on stdin)
// Reads user-stories/<name>, validates the stories against it and ADDS them to proposals/<name> with NEW-<n> IDs.
// There is no output path argument: the target is fixed, and user-stories/ is only ever read. The run only adds
// rows (the user edits the proposals file in the portal, so nothing is replaced or removed); running the same
// batch twice adds it twice.

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
function describeParseError(err, text) {
  const message = err.message.replace(/\s*\(line \d+ column \d+\)/, ''); // the position is reported below
  const at = /position (\d+)/.exec(message);
  if (!at) return `The stories on stdin are not valid JSON: ${message}`;
  const pos = Math.min(Number(at[1]), text.length);
  const lines = text.slice(0, pos).split('\n');
  const excerpt = text.slice(Math.max(0, pos - 30), pos + 30).replace(/\s+/g, ' ');
  return `The stories on stdin are not valid JSON: ${message} (line ${lines.length}, column ${lines[lines.length - 1].length + 1}, near "${excerpt}")`;
}

// Write beside the target, then rename over it, so a failure never leaves a partly written file. A .tmp file is
// not listed by the file API. Returns an error message, or null.
function writeAtomic(dir, file, text) {
  const tmp = path.join(dir, `${file}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(tmp, text, 'utf8');
    fs.renameSync(tmp, path.join(dir, file));
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    return `Could not write proposals/${file}: ${err.message} (is it open in Excel?)`;
  }
  return null;
}

// Returns { ok: true, file, ids, count } or { ok: false, errors: [...] }. Writes nothing unless everything is valid.
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
  const all = { ...target, stories: [...target.stories, ...built.stories] };
  fs.mkdirSync(proposalDir, { recursive: true });
  const failed = writeAtomic(proposalDir, file, serializeBacklog(all));
  if (failed) return { ok: false, errors: [failed] };
  return { ok: true, file, ids: built.ids, count: all.stories.length };
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
  console.log(`Added ${result.ids.length} proposed stor${result.ids.length === 1 ? 'y' : 'ies'} to proposals/${result.file} (${result.ids.join(', ')}); ${result.count} in the file now.`);
}
