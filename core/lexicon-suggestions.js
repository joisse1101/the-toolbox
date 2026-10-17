// Suggested renames and deletes of lexicon terms, in a CSV file (lexicon-suggestions/<backlog file name>), one per row:
//   Term, Action, New name, Add to Avoid, Reason, Status
// The agent writes them (suggest_lexicon_change), the user applies or dismisses them in the Lexicon tab. Columns are
// matched by header name, ignoring case; `Add to Avoid` is `;`-separated; any other column round-trips in `cells`.
// A file is { headers, hasBom, rows: [{ term, action, newName, avoid: [], reason, status, cells }], skipped }.
// A row whose Action is not rename or delete is kept in the file but is not a suggestion (counted in `skipped`).
// Pure: no file access.

import { parseCsv, toCsv } from './csv.js';
import { childrenOf, findTerm, deleteTerm, saveTerm } from './lexicon.js';

export const COLUMNS = ['Term', 'Action', 'New name', 'Add to Avoid', 'Reason', 'Status'];
export const ACTIONS = ['rename', 'delete'];
export const STATUSES = ['open', 'applied', 'dismissed'];
const ITEM_KEYS = ['term', 'action', 'newName', 'avoid', 'avoidOldName', 'reason'];
const BOM = '﻿';

const key = (s) => String(s ?? '').trim().toLowerCase();
const splitList = (text) => text.split(';').map((w) => w.trim()).filter(Boolean);
const unique = (words) => [...new Set(words.map((w) => String(w).trim()).filter(Boolean))];

export const emptySuggestions = () => ({ headers: [...COLUMNS], hasBom: true, rows: [], skipped: 0 });

function columnIndex(headers) {
  const idx = {};
  COLUMNS.forEach((col) => {
    idx[col] = headers.findIndex((h) => key(h) === key(col));
  });
  return idx;
}

export function parseSuggestions(text) {
  const raw = String(text ?? '');
  const records = parseCsv(raw).filter((r) => r.some((c) => c.trim()));
  if (!records.length) return { ...emptySuggestions(), hasBom: raw.charCodeAt(0) === 0xfeff || !raw };
  const headers = records[0].slice();
  let idx = columnIndex(headers);
  for (const col of COLUMNS) if (idx[col] < 0) headers.push(col);
  idx = columnIndex(headers);
  let skipped = 0;
  const rows = records.slice(1).map((record) => {
    const cells = record.slice();
    while (cells.length < headers.length) cells.push('');
    const status = key(cells[idx.Status]);
    const row = {
      term: cells[idx.Term].trim(),
      action: key(cells[idx.Action]),
      newName: cells[idx['New name']].trim(),
      avoid: splitList(cells[idx['Add to Avoid']]),
      reason: cells[idx.Reason],
      status: STATUSES.includes(status) ? status : 'open',
      cells,
    };
    if (!ACTIONS.includes(row.action)) skipped += 1;
    return row;
  });
  return { headers, hasBom: raw.charCodeAt(0) === 0xfeff, rows, skipped };
}

export function composeSuggestions(file) {
  const idx = columnIndex(file.headers);
  const records = file.rows.map((r) => {
    const cells = file.headers.map((_, i) => r.cells[i] ?? '');
    cells[idx.Term] = r.term;
    cells[idx.Action] = r.action;
    cells[idx['New name']] = r.newName;
    cells[idx['Add to Avoid']] = r.avoid.join(';');
    cells[idx.Reason] = r.reason;
    cells[idx.Status] = r.status;
    return cells;
  });
  return (file.hasBom ? BOM : '') + toCsv([file.headers, ...records]);
}

// The rows that are real suggestions and still waiting for the user.
export const isOpen = (row) => ACTIONS.includes(row.action) && row.status === 'open';
export const openRows = (file) => file.rows.filter(isOpen);

// Whole-word, case-insensitive: "role" is in "the role of an owner" but not in "enrolled".
function mentions(text, name) {
  const escaped = String(name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}($|[^\\p{L}\\p{N}_])`, 'iu').test(String(text ?? ''));
}

// What the change does to the rest of the lexicon, as it is now. Advisory: nothing here is rewritten.
//   children      terms whose Part of names the term (a rename updates them, a delete is blocked by them)
//   mentionedBy   other terms whose Definition or Notes contain the term's name as a whole word
//   avoidedBy     terms whose Avoid list holds the term's name (or, for a rename, the new name)
//   newNameTaken  a rename's new name is already another term
//   blockedBy     a delete only: the children, which make Apply refuse
export function impactOf(lexicon, name, action, newName = '') {
  const term = findTerm(lexicon, name);
  if (!term) return { found: false };
  const others = lexicon.terms.filter((t) => t !== term);
  const words = [term.name, ...(action === 'rename' && newName ? [newName] : [])].map(key);
  const children = childrenOf(lexicon, term.name).map((t) => t.name);
  const impact = {
    found: true,
    children,
    mentionedBy: others.filter((t) => mentions(t.definition, term.name) || mentions(t.notes, term.name)).map((t) => t.name),
    avoidedBy: others.filter((t) => t.avoid.some((w) => words.includes(key(w)))).map((t) => t.name),
  };
  if (action === 'rename') impact.newNameTaken = Boolean(newName) && others.some((t) => key(t.name) === key(newName));
  if (action === 'delete') impact.blockedBy = children;
  return impact;
}

// Why a row cannot be applied now, or null.
export function staleReason(lexicon, row) {
  const term = findTerm(lexicon, row.term);
  if (!term) return 'term no longer exists';
  if (row.action === 'rename' && lexicon.terms.some((t) => t !== term && key(t.name) === key(row.newName))) {
    return `"${row.newName}" is now the name of another term`;
  }
  return null;
}

// Applies a row to the lexicon. A rename and the checked Avoid words are one save, so a word that names the term before
// the rename ("role") is accepted. `avoid` defaults to the row's words. Returns { ok, lexicon } or { ok: false, errors }.
export function applySuggestion(lexicon, row, { avoid = row.avoid } = {}) {
  const stale = staleReason(lexicon, row);
  if (stale) return { ok: false, errors: [`"${row.term}": ${stale}`] };
  if (row.action === 'delete') return deleteTerm(lexicon, row.term);
  const term = findTerm(lexicon, row.term);
  return saveTerm(lexicon, { ...term, name: row.newName, avoid: [...term.avoid, ...avoid] }, { replaces: term.name });
}

// The tool's input: a list of { term, action, newName?, avoid?, avoidOldName?, reason }, checked against the lexicon and
// the rows already in the file. Returns { ok, rows } (new open rows, in order) or { ok: false, errors }, each error
// naming its item (1-based). Nothing is written by this function.
export function validateItems(lexicon, file, items) {
  if (!Array.isArray(items)) return { ok: false, errors: ['The input must be a JSON list of suggestions'] };
  const errors = [];
  const rows = [];
  const taken = new Set(file.rows.filter(isOpen).map((r) => `${key(r.term)}|${r.action}`));
  items.forEach((item, i) => {
    const problem = (message) => errors.push(`item ${i + 1}: ${message}`);
    if (!item || typeof item !== 'object' || Array.isArray(item)) return problem('must be an object');
    const unknown = Object.keys(item).filter((k) => !ITEM_KEYS.includes(k));
    if (unknown.length) return problem(`unknown key${unknown.length > 1 ? 's' : ''} ${unknown.map((k) => `"${k}"`).join(', ')}`);
    if (typeof item.term !== 'string' || !item.term.trim()) return problem('needs a "term"');
    if (!ACTIONS.includes(item.action)) return problem(`"action" must be ${ACTIONS.join(' or ')}`);
    if (typeof item.reason !== 'string' || !item.reason.trim()) return problem('needs a "reason"');
    if ('newName' in item && typeof item.newName !== 'string') return problem('"newName" must be text');
    if ('avoid' in item && !(Array.isArray(item.avoid) && item.avoid.every((w) => typeof w === 'string'))) return problem('"avoid" must be a list of words');
    if ('avoidOldName' in item && typeof item.avoidOldName !== 'boolean') return problem('"avoidOldName" must be true or false');
    const term = findTerm(lexicon, item.term);
    if (!term) return problem(`"${item.term.trim()}" is not a term`);
    const newName = String(item.newName ?? '').trim();
    let avoid = [];
    if (item.action === 'delete') {
      if (newName) return problem('a delete takes no "newName"');
      if ((item.avoid ?? []).length || 'avoidOldName' in item) return problem('a delete takes no Avoid words');
    } else {
      if (!newName) return problem('a rename needs a "newName"');
      if (newName === term.name) return problem(`"newName" is the term's own name`);
      if (lexicon.terms.some((t) => t !== term && key(t.name) === key(newName))) return problem(`"${newName}" is already a term`);
      avoid = unique([...(item.avoidOldName === false ? [] : [term.name]), ...(item.avoid ?? [])]);
      const clash = avoid.find((w) => lexicon.terms.some((t) => t !== term && key(t.name) === key(w)) || key(w) === key(newName));
      if (clash) return problem(`"${clash}" cannot be avoided: it is a term`);
    }
    const dup = `${key(term.name)}|${item.action}`;
    if (taken.has(dup)) return problem(`an open ${item.action} of "${term.name}" already exists`);
    taken.add(dup);
    rows.push({
      term: term.name, action: item.action, newName, avoid, reason: item.reason.trim(), status: 'open', cells: [],
    });
  });
  return errors.length ? { ok: false, errors } : { ok: true, rows };
}
