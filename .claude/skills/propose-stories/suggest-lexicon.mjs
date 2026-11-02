// How the propose-stories skill suggests renaming, deleting or editing (definition, avoid, notes, part of) a lexicon term (used by the backlog-tools MCP server's
// suggest_lexicon_change; there is no command line form). Reads <name>/user-stories.csv (it must exist) and <name>/lexicon.csv,
// appends open rows to <name>/lexicon/lexicon-suggestions.csv and never touches the lexicon: the user applies a suggestion in the
// portal's Lexicon tab. The rules are planner/logic/lexicon/lexicon-suggestions.js's; one invalid item means nothing is written.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { emptyLexicon, parseLexicon } from '../../../planner/logic/lexicon/lexicon.js';
import { composeSuggestions, emptySuggestions, FIELD_LABELS, impactOf, parseSuggestions, validateItems } from '../../../planner/logic/lexicon/lexicon-suggestions.js';
import { writeAtomic } from '../_shared/write-atomic.mjs';

const require = createRequire(import.meta.url);
const { backlogDir, backlogFile } = require('../../../planner/logic/storage/backlog-paths.cjs'); // same name rules as the file API
const { DATA_DIR } = require('../../../planner/logic/storage/paths.cjs');
const { shown } = require('../_shared/paths.cjs');

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

// Returns { ok: true, file, count, added, report } or { ok: false, errors }. Writes nothing unless everything is valid.
export function suggestLexicon({ dataDir = DATA_DIR, name, items }) {
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
  const suggestionsDir = path.dirname(suggestionsPath);
  const existing = readIfThere(dataDir, suggestionsPath, parseSuggestions, emptySuggestions);
  if (existing.error) return { ok: false, errors: [existing.error] };

  const checked = validateItems(lexicon.value, existing.value, items);
  if (!checked.ok) return checked;

  const next = { ...existing.value, rows: [...existing.value.rows, ...checked.rows] };
  fs.mkdirSync(suggestionsDir, { recursive: true });
  const failed = writeAtomic(suggestionsDir, path.basename(suggestionsPath), composeSuggestions(next), 'suggest_lexicon_change', { dataDir, backlog: file, kind: 'lexicon-suggestions' });
  if (failed) return { ok: false, errors: [failed] };
  const report = checked.rows.map((row) => ({
    row, lines: impactLines(row, impactOf(lexicon.value, row.term, row.action, row.newName, row.edit)),
  }));
  return { ok: true, file, added: checked.rows.length, count: next.rows.length, report };
}
