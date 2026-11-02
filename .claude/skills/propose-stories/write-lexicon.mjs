// The only way the propose-stories skill changes a lexicon. Usage:
//   node .claude/skills/propose-stories/write-lexicon.mjs <backlog name>   (terms as JSON on stdin)
// Reads <name>/user-stories.csv (it must exist) and <name>/lexicon.csv, applies the input and writes <name>/lexicon.csv. The input
// is a JSON list of { term, definition, avoid?, notes?, partOf? }: every item ADDS a term (and needs a definition); a term
// that is already there is refused, because a change to it is a suggestion (suggest-lexicon.mjs). The rules are those
// of the portal's Lexicon tab (planner/logic/lexicon/lexicon.js), checked on the lexicon as it will be; one invalid item means nothing is
// written. There is no output path argument: the target is fixed, user-stories.csv is only checked, and no term is changed or removed.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { applyTermItems, composeLexicon, emptyLexicon, parseLexicon } from '../../../planner/logic/lexicon/lexicon.js';
import { describeParseError, writeAtomic } from '../_shared/write-atomic.mjs';

const require = createRequire(import.meta.url);
const { backlogDir, backlogFile } = require('../../../planner/logic/storage/backlog-paths.cjs'); // same name rules as the file API
const { DATA_DIR } = require('../../../planner/logic/storage/paths.cjs');
const { shown } = require('../_shared/paths.cjs');

// Reads the backlog and the lexicon and validates the input against them. Returns { ok: true, file, result } (result: the
// applyTermItems result, with the lexicon as it will be) or { ok: false, errors }. Writes nothing.
function prepare({ dataDir, name, input }) {
  let file;
  let backlogPath;
  let lexiconPath;
  try {
    file = path.basename(backlogDir(dataDir, name));
    backlogPath = backlogFile(dataDir, name, 'backlog');
    lexiconPath = backlogFile(dataDir, name, 'lexicon');
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  if (!fs.existsSync(backlogPath)) return { ok: false, errors: [`${shown(dataDir, backlogPath)} was not found.`] };

  let lexicon = emptyLexicon();
  try {
    lexicon = parseLexicon(fs.readFileSync(lexiconPath, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') return { ok: false, errors: [`Could not read ${shown(dataDir, lexiconPath)}: ${err.message}`] };
  }

  let items;
  try {
    items = JSON.parse(input);
  } catch (err) {
    return { ok: false, errors: [describeParseError(err, input, 'terms')] };
  }
  const result = applyTermItems(lexicon, items);
  if (!result.ok) return result;
  return { ok: true, file, result, lexiconPath };
}

// Same input and problems as writeLexicon, and for valid input the terms it would add; no file is created or changed.
// Returns { ok: true, file, added } or { ok: false, errors }.
export function checkLexicon({ dataDir = DATA_DIR, name, input }) {
  const prepared = prepare({ dataDir, name, input });
  if (!prepared.ok) return prepared;
  return { ok: true, file: prepared.file, added: prepared.result.added };
}

// Returns { ok: true, file, added, count } or { ok: false, errors: [...] }. Writes nothing unless everything is valid. After
// the write the file is read again and must hold every added term; `count` is the number of terms read back.
export function writeLexicon({ dataDir = DATA_DIR, name, input }) {
  const prepared = prepare({ dataDir, name, input });
  if (!prepared.ok) return prepared;
  const { file, result, lexiconPath } = prepared;
  const lexiconDir = path.dirname(lexiconPath);
  const lexiconShown = shown(dataDir, lexiconPath);

  fs.mkdirSync(lexiconDir, { recursive: true });
  const failed = writeAtomic(lexiconDir, path.basename(lexiconPath), composeLexicon(result.lexicon), 'write_lexicon', { dataDir, backlog: file, kind: 'lexicon' });
  if (failed) return { ok: false, errors: [failed] };

  let stored;
  try {
    stored = parseLexicon(fs.readFileSync(lexiconPath, 'utf8'));
  } catch (err) {
    return { ok: false, errors: [`Wrote ${lexiconShown} but could not read it back: ${err.message}`] };
  }
  const have = new Set(stored.terms.map((term) => term.name.toLowerCase()));
  const lost = result.added.filter((term) => !have.has(term.toLowerCase()));
  if (lost.length || stored.terms.length !== result.lexicon.terms.length) {
    const what = lost.length ? `${lost.join(', ')} not found` : `${stored.terms.length} terms on disk, ${result.lexicon.terms.length} expected`;
    return { ok: false, errors: [`Wrote ${lexiconShown} but the file read back is wrong: ${what}. Do not report these terms as written.`] };
  }
  return { ok: true, file, added: result.added, count: stored.terms.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  if (process.argv.length !== 3) {
    console.error('Usage: node write-lexicon.mjs <backlog name>  (terms JSON on stdin)');
    process.exit(2);
  }
  const result = writeLexicon({ name: process.argv[2], input: fs.readFileSync(0, 'utf8') });
  if (!result.ok) {
    console.error(`Nothing was written. ${result.errors.length} problem${result.errors.length > 1 ? 's' : ''}:`);
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  const n = result.added.length;
  console.log(`${n ? `Added ${n} term${n === 1 ? '' : 's'} to the lexicon of ${result.file} (${result.added.join(', ')})` : 'No change'}; ${result.count} in the lexicon now.`);
}
