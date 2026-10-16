// The only way the propose-stories skill changes a lexicon. Usage:
//   node .claude/skills/propose-stories/write-lexicon.mjs <backlog file name>   (terms as JSON on stdin)
// Reads user-stories/<name> (it must exist) and lexicons/<name>, applies the input and writes lexicons/<name>. The input
// is a JSON list of { term, definition?, avoid?, notes?, partOf? }: a term that is not in the lexicon is ADDED (and needs a
// definition), one that is there is PATCHED (only the keys given change; partOf "" and avoid [] clear). The rules are those
// of the portal's Lexicon tab (core/lexicon.js), checked on the lexicon as it will be; one invalid item means nothing is
// written. There is no output path argument: the target is fixed, user-stories/ is only checked, and no term is removed.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { applyTermItems, composeLexicon, emptyLexicon, parseLexicon } from '../../../core/lexicon.js';
import { describeParseError, writeAtomic } from './write-proposal.mjs';

const require = createRequire(import.meta.url);
const { validateName } = require('../../../core/file-name.cjs'); // same name rules as the file API
const { DATA_DIR } = require('../../../core/paths.cjs');

// Returns { ok: true, file, added, patched, count } or { ok: false, errors: [...] }. Writes nothing unless everything is valid.
export function writeLexicon({ dataDir = DATA_DIR, name, input }) {
  let file;
  try {
    file = validateName(name);
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  const backlogDir = path.join(dataDir, 'user-stories');
  const lexiconDir = path.join(dataDir, 'lexicons');
  const backlogPath = path.join(backlogDir, file);
  if (path.dirname(backlogPath) !== backlogDir) return { ok: false, errors: ['File name is not allowed'] };
  if (!fs.existsSync(backlogPath)) return { ok: false, errors: [`user-stories/${file} was not found.`] };

  let lexicon = emptyLexicon();
  try {
    lexicon = parseLexicon(fs.readFileSync(path.join(lexiconDir, file), 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') return { ok: false, errors: [`Could not read lexicons/${file}: ${err.message}`] };
  }

  let items;
  try {
    items = JSON.parse(input);
  } catch (err) {
    return { ok: false, errors: [describeParseError(err, input, 'terms')] };
  }
  const result = applyTermItems(lexicon, items);
  if (!result.ok) return result;

  fs.mkdirSync(lexiconDir, { recursive: true });
  const failed = writeAtomic(lexiconDir, file, composeLexicon(result.lexicon));
  if (failed) return { ok: false, errors: [failed] };
  return { ok: true, file, added: result.added, patched: result.patched, count: result.lexicon.terms.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  if (process.argv.length !== 3) {
    console.error('Usage: node write-lexicon.mjs <backlog file name>  (terms JSON on stdin)');
    process.exit(2);
  }
  const result = writeLexicon({ name: process.argv[2], input: fs.readFileSync(0, 'utf8') });
  if (!result.ok) {
    console.error(`Nothing was written. ${result.errors.length} problem${result.errors.length > 1 ? 's' : ''}:`);
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  const plural = (n) => `${n} term${n === 1 ? '' : 's'}`;
  const done = [];
  if (result.added.length) done.push(`Added ${plural(result.added.length)} to lexicons/${result.file} (${result.added.join(', ')})`);
  if (result.patched.length) done.push(`${done.length ? 'patched' : 'Patched'} ${plural(result.patched.length)}${done.length ? '' : ` in lexicons/${result.file}`} (${result.patched.join(', ')})`);
  console.log(`${done.length ? done.join('; ') : 'No change'}; ${result.count} in the lexicon now.`);
}
