// How the jois-story-propose skill suggests renaming, deleting or editing (definition, avoid, notes, part of) a lexicon term. Usage:
//   node <skill folder>/suggest-lexicon.mjs <backlog name> [--check]   (suggestions as JSON on stdin)
// Reads <name>/user-stories.csv (it must exist) and <name>/lexicon.csv, appends open rows to <name>/lexicon/lexicon-suggestions.csv and
// never touches the lexicon: the user applies a suggestion in the portal's Lexicon tab. The rules are lib/lexicon/lexicon-suggestions.js's
// (a copy of the planner's); one invalid item means nothing is written. With --check the same validation runs and the impact is
// reported; nothing is written. The data folder comes from the PLANNER_CONFIG variable or a planner.config.yaml.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { emptyLexicon, parseLexicon } from './lib/lexicon/lexicon.js';
import { composeSuggestions, emptySuggestions, FIELD_LABELS, impactOf, parseSuggestions, validateItems } from './lib/lexicon/lexicon-suggestions.js';
import { describeParseError, writeAtomic } from './lib/skill-support/write-atomic.mjs';
import { dataDirOrThrow } from './lib/skill-support/resolve-data-dir.mjs';

const require = createRequire(import.meta.url);
const { backlogDir, backlogFile } = require('./lib/storage/backlog-paths.cjs'); // same name rules as the file API
const { shown } = require('./lib/skill-support/paths.cjs');

const readIfThere = (dataDir, target, parse, empty) => {
  try {
    return { value: parse(fs.readFileSync(target, 'utf8')) };
  } catch (err) {
    if (err.code === 'ENOENT') return { value: empty() };
    return { error: `Could not read ${shown(dataDir, target)}: ${err.message}` };
  }
};

// What a suggestion changes around it, as lines for the person deciding.
function impactLines(row, impact) {
  const names = (list) => list.map((n) => `"${n}"`).join(', ');
  const lines = [];
  if (row.action === 'edit') {
    const show = (v) => (Array.isArray(v) ? (v.length ? v.join(', ') : '(none)') : (v || '(empty)'));
    return impact.fields.map((f) => `${FIELD_LABELS[f]}: ${show(row.edit[f].from)} -> ${show(row.edit[f].to)}`);
  }
  if (row.action === 'delete' && impact.blockedBy.length) lines.push(`Apply is refused while these are part of it: ${names(impact.blockedBy)}`);
  if (row.action === 'rename' && impact.children.length) lines.push(`Part of follows the new name for: ${names(impact.children)}`);
  if (impact.mentionedBy.length) lines.push(`Definition or notes of ${names(impact.mentionedBy)} contain "${row.term}"; their wording is not changed`);
  if (impact.avoidedBy.length) lines.push(`Avoid lists of ${names(impact.avoidedBy)} contain a name involved`);
  if (row.action === 'rename' && row.avoid.length) lines.push(`Avoid words added to "${row.newName}": ${row.avoid.join(', ')}`);
  return lines;
}

// Reads the backlog, the lexicon and the open suggestions and validates the items against them. Returns { ok: true, file,
// existing, checked, suggestionsPath, lexicon } or { ok: false, errors }. Writes nothing.
function prepare({ dataDir, name, items }) {
  let file;
  let backlogPath;
  let lexiconPath;
  let suggestionsPath;
  try {
    file = path.basename(backlogDir(dataDir, name));
    backlogPath = backlogFile(dataDir, name, 'backlog');
    lexiconPath = backlogFile(dataDir, name, 'lexicon');
    suggestionsPath = backlogFile(dataDir, name, 'lexicon-suggestions');
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  if (!fs.existsSync(backlogPath)) return { ok: false, errors: [`${shown(dataDir, backlogPath)} was not found.`] };

  const lexicon = readIfThere(dataDir, lexiconPath, parseLexicon, emptyLexicon);
  if (lexicon.error) return { ok: false, errors: [lexicon.error] };
  const existing = readIfThere(dataDir, suggestionsPath, parseSuggestions, emptySuggestions);
  if (existing.error) return { ok: false, errors: [existing.error] };

  const checked = validateItems(lexicon.value, existing.value, items);
  if (!checked.ok) return checked;
  return { ok: true, file, existing: existing.value, checked, suggestionsPath, lexicon: lexicon.value, dataDir };
}

const reportOf = (lexicon, checked) => checked.rows.map((row) => ({
  row, lines: impactLines(row, impactOf(lexicon, row.term, row.action, row.newName, row.edit)),
}));

// Same input and problems as suggestLexicon, and for valid items what it would add; no file is created or changed.
// Returns { ok: true, file, added, count, report } or { ok: false, errors }.
export function checkSuggestion({ dataDir = dataDirOrThrow(), name, items }) {
  const prepared = prepare({ dataDir, name, items });
  if (!prepared.ok) return prepared;
  const { file, existing, checked, lexicon } = prepared;
  return { ok: true, file, added: checked.rows.length, count: existing.rows.length + checked.rows.length, report: reportOf(lexicon, checked) };
}

// Returns { ok: true, file, count, added, report } or { ok: false, errors }. Writes nothing unless everything is valid.
export function suggestLexicon({ dataDir = dataDirOrThrow(), name, items }) {
  const prepared = prepare({ dataDir, name, items });
  if (!prepared.ok) return prepared;
  const { file, existing, checked, suggestionsPath, lexicon } = prepared;
  const suggestionsDir = path.dirname(suggestionsPath);
  const next = { ...existing, rows: [...existing.rows, ...checked.rows] };
  fs.mkdirSync(suggestionsDir, { recursive: true });
  const failed = writeAtomic(suggestionsDir, path.basename(suggestionsPath), composeSuggestions(next), 'suggest-lexicon.mjs', { dataDir, backlog: file, kind: 'lexicon-suggestions' });
  if (failed) return { ok: false, errors: [failed] };
  return { ok: true, file, added: checked.rows.length, count: next.rows.length, report: reportOf(lexicon, checked) };
}

// What the command line prints for each suggestion: the row and its impact lines.
export function reportText(report) {
  return report.map(({ row, lines }) => {
    const what = row.action === 'rename' ? `rename "${row.term}" to "${row.newName}"` : `${row.action} "${row.term}"`;
    return [`- ${what}: ${row.reason}`, ...lines.map((l) => `    ${l}`)].join('\n');
  }).join('\n');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const check = process.argv[3] === '--check';
  if (process.argv.length !== (check ? 4 : 3)) {
    console.error('Usage: node suggest-lexicon.mjs <backlog name> [--check]  (suggestions JSON on stdin)');
    process.exit(2);
  }
  let result;
  try {
    const input = fs.readFileSync(0, 'utf8');
    let items;
    try {
      items = JSON.parse(input);
    } catch (err) {
      console.error(`Nothing was written. ${describeParseError(err, input, 'suggestions')}`);
      process.exit(1);
    }
    result = (check ? checkSuggestion : suggestLexicon)({ dataDir: dataDirOrThrow(), name: process.argv[2], items });
  } catch (err) {
    console.error(`Nothing was written. ${err.message}`);
    process.exit(1);
  }
  if (!result.ok) {
    console.error(`Nothing was written. ${result.errors.length} problem${result.errors.length > 1 ? 's' : ''}:`);
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  const n = result.added;
  console.log(`${check ? `Check passed, nothing written. Would add ${n} suggestion${n === 1 ? '' : 's'}` : `Added ${n} suggestion${n === 1 ? '' : 's'}`} to the lexicon suggestions of ${result.file}; ${result.count} in the file${check ? ' then' : ' now'}.`);
  console.log(reportText(result.report));
}
