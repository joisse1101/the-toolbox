// The lexicon of one backlog: terms with definitions, in a CSV file (lexicons/<backlog file name>), one term per row.
//   Term, Part of, Definition, Avoid, Notes
// Columns are matched by header name, ignoring case. `Avoid` is a `;`-separated list (like Depends On). Any other column
// round-trips untouched in `cells`, and a known column missing from the file is added when it is saved.
// A lexicon is { headers, hasBom, terms: [{ name, partOf, definition, avoid: [], notes, cells: [] }] }.
// Names compare ignoring case and surrounding spaces. Pure: no file access.

import type { Lexicon, LexiconTerm } from '../types.ts';
import { parseCsv, toCsv } from '../backlog/csv.ts';

// The outcome of a change to the lexicon: the new lexicon, or every message that says why it was refused.
export type LexiconResult = { ok: true; lexicon: Lexicon } | { ok: false; errors: string[] };

// A term as the callers give it: any field may be missing or loose, `clean` makes a LexiconTerm of it.
interface TermInput {
  name?: unknown;
  definition?: unknown;
  avoid?: readonly unknown[];
  notes?: unknown;
  partOf?: unknown;
  cells?: string[];
}

export const COLUMNS = ['Term', 'Part of', 'Definition', 'Avoid', 'Notes'];
const TERM_KEYS = ['term', 'definition', 'avoid', 'notes', 'partOf'];
const BOM = '﻿';

const key = (s: unknown): string => String(s ?? '').trim().toLowerCase();
const splitList = (text: string): string[] => text.split(';').map((w) => w.trim()).filter(Boolean);

export const emptyLexicon = (): Lexicon => ({ headers: [...COLUMNS], hasBom: true, terms: [] });

// Where each known column is (the first one of that name); a name no header has is missing.
function columnIndex(headers: readonly string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  COLUMNS.forEach((col) => {
    idx[col] = headers.findIndex((h) => key(h) === key(col));
  });
  return idx;
}

export function parseLexicon(text: unknown): Lexicon {
  const raw = String(text ?? '');
  const rows = parseCsv(raw).filter((r) => r.some((c) => c.trim()));
  if (!rows.length) return { ...emptyLexicon(), hasBom: raw.charCodeAt(0) === 0xfeff || !raw };
  const headers = rows[0].slice();
  let idx = columnIndex(headers);
  for (const col of COLUMNS) if (idx[col] < 0) headers.push(col);
  idx = columnIndex(headers);
  const terms = rows.slice(1).map((row) => {
    const cells = row.slice();
    while (cells.length < headers.length) cells.push('');
    return {
      name: cells[idx.Term].trim(),
      partOf: cells[idx['Part of']].trim(),
      definition: cells[idx.Definition],
      avoid: splitList(cells[idx.Avoid]),
      notes: cells[idx.Notes],
      cells,
    };
  });
  return { headers, hasBom: raw.charCodeAt(0) === 0xfeff, terms };
}

export function composeLexicon(lexicon: Lexicon): string {
  const idx = columnIndex(lexicon.headers);
  const rows = lexicon.terms.map((t) => {
    const cells = lexicon.headers.map((_, i) => t.cells[i] ?? '');
    cells[idx.Term] = t.name;
    cells[idx['Part of']] = t.partOf;
    cells[idx.Definition] = t.definition;
    cells[idx.Avoid] = t.avoid.join(';');
    cells[idx.Notes] = t.notes;
    return cells;
  });
  return (lexicon.hasBom ? BOM : '') + toCsv([lexicon.headers, ...rows]);
}

export const findTerm = (lexicon: Lexicon, name: unknown): LexiconTerm | null => lexicon.terms.find((t) => key(t.name) === key(name)) ?? null;
export const childrenOf = (lexicon: Lexicon, name: unknown): LexiconTerm[] => lexicon.terms.filter((t) => key(t.partOf) === key(name));

// Every rule the lexicon breaks, as { term, message }.
export function lexiconProblems(lexicon: Lexicon): { term: string; message: string }[] {
  const problems: { term: string; message: string }[] = [];
  const add = (term: string, message: string): number => problems.push({ term, message });
  const names = new Map<string, number>();
  for (const t of lexicon.terms) names.set(key(t.name), (names.get(key(t.name)) ?? 0) + 1);
  const seen = new Set<string>();
  for (const t of lexicon.terms) {
    if (!key(t.name)) add(t.name, 'A term needs a name');
    if ((names.get(key(t.name)) ?? 0) > 1 && !seen.has(key(t.name))) add(t.name, `"${t.name}" is defined more than once`);
    seen.add(key(t.name));
    if (!t.definition.trim()) add(t.name, `"${t.name}" has no definition`);
    if (t.partOf) {
      if (key(t.partOf) === key(t.name)) add(t.name, `"${t.name}" cannot be part of itself`);
      else if (!names.has(key(t.partOf))) add(t.name, `"${t.name}" is part of "${t.partOf}", which is not a term`);
      else {
        const chain = new Set([key(t.name)]);
        for (let at: LexiconTerm | null = findTerm(lexicon, t.partOf); at; at = at.partOf ? findTerm(lexicon, at.partOf) : null) {
          if (chain.has(key(at.name))) {
            add(t.name, `"${t.name}" is part of itself through "${t.partOf}" (a cycle)`);
            break;
          }
          chain.add(key(at.name));
        }
      }
    }
    for (const word of t.avoid) {
      if (names.has(key(word))) add(t.name, `"${t.name}" avoids "${word}", which is a defined term`);
    }
  }
  return problems;
}

// Problems that `after` has and `before` did not: a hand-written file with an old problem must not block unrelated saves.
const newProblems = <P extends { message: string }>(before: readonly P[], after: readonly P[]): P[] => {
  const old = new Set(before.map((p) => p.message));
  return after.filter((p) => !old.has(p.message));
};

const clean = (term: TermInput): LexiconTerm => ({
  name: String(term.name ?? '').trim(),
  definition: String(term.definition ?? '').trim(),
  avoid: [...new Set((term.avoid ?? []).map((w) => String(w).trim()).filter(Boolean))],
  notes: String(term.notes ?? '').trim(),
  partOf: String(term.partOf ?? '').trim(),
  cells: term.cells ?? [],
});

// Adds a term, or with { replaces: <current name> } replaces that one in place (a changed name also updates the Part of
// of its children). Returns { ok: true, lexicon } or { ok: false, errors: [message] }; the input is never changed.
export function saveTerm(lexicon: Lexicon, term: TermInput, { replaces = null }: { replaces?: string | null } = {}): LexiconResult {
  const next = clean(term);
  const index = replaces === null ? -1 : lexicon.terms.findIndex((t) => key(t.name) === key(replaces));
  if (replaces !== null && index < 0) return { ok: false, errors: [`"${replaces}" is not a term`] };
  if (!next.name) return { ok: false, errors: ['A term needs a name'] };
  if (lexicon.terms.some((t, i) => i !== index && key(t.name) === key(next.name))) {
    return { ok: false, errors: [`"${next.name}" already exists`] };
  }
  const terms = lexicon.terms.map((t) => ({ ...t, avoid: [...t.avoid], cells: [...t.cells] }));
  if (index < 0) terms.push(next);
  else {
    const old = terms[index];
    next.cells = old.cells;
    terms[index] = next;
    if (key(old.name) !== key(next.name) || old.name !== next.name) {
      for (const t of terms) if (key(t.partOf) === key(old.name)) t.partOf = next.name;
      if (key(next.partOf) === key(old.name)) next.partOf = next.name; // it named itself: still a problem to report
    }
  }
  const result = { ...lexicon, terms };
  const errors = newProblems(lexiconProblems(lexicon), lexiconProblems(result)).map((p) => p.message);
  return errors.length ? { ok: false, errors } : { ok: true, lexicon: result };
}

export function renameTerm(lexicon: Lexicon, name: string, newName: string): LexiconResult {
  const term = findTerm(lexicon, name);
  if (!term) return { ok: false, errors: [`"${name}" is not a term`] };
  return saveTerm(lexicon, { ...term, name: newName }, { replaces: name });
}

// Refused while another term is part of it.
export function deleteTerm(lexicon: Lexicon, name: string): LexiconResult {
  const term = findTerm(lexicon, name);
  if (!term) return { ok: false, errors: [`"${name}" is not a term`] };
  const kids = childrenOf(lexicon, name);
  if (kids.length) {
    return { ok: false, errors: [`"${term.name}" cannot be deleted: ${kids.map((k) => `"${k.name}"`).join(', ')} ${kids.length === 1 ? 'is' : 'are'} part of it`] };
  }
  return { ok: true, lexicon: { ...lexicon, terms: lexicon.terms.filter((t) => t !== term) } };
}

// The writer's input: a list of { term, definition, avoid?, notes?, partOf? }. Every item adds a term and needs a
// definition; a term that already exists is refused (a change to it is a suggestion, see lexicon-suggestions.js in this folder).
// Everything is checked on the lexicon as it will be, so a parent added earlier in the list is fine. Returns
// { ok, lexicon, added } or { ok: false, errors }, each error naming its item (1-based).
export function applyTermItems(lexicon: Lexicon, items: unknown): { ok: true; lexicon: Lexicon; added: string[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(items)) return { ok: false, errors: ['The input must be a JSON list of terms'] };
  const errors: string[] = [];
  const added: string[] = [];
  const touched = new Map<string, number>(); // term key -> position of the last item that set it
  let terms = lexicon.terms.map((t) => ({ ...t, avoid: [...t.avoid], cells: [...t.cells] }));
  items.forEach((raw: unknown, i) => {
    const at = `item ${i + 1}`;
    const problem = (message: string): number => errors.push(`${at}: ${message}`);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return problem('must be an object');
    const item = raw as Record<string, unknown>; // an object of unchecked values: each is checked below
    const unknown = Object.keys(item).filter((k) => !TERM_KEYS.includes(k));
    if (unknown.length) problem(`unknown key${unknown.length > 1 ? 's' : ''} ${unknown.map((k) => `"${k}"`).join(', ')}`);
    const term = item.term;
    if (typeof term !== 'string' || !term.trim()) return problem('needs a "term"');
    for (const k of ['definition', 'notes', 'partOf']) if (k in item && typeof item[k] !== 'string') problem(`"${k}" must be text`);
    if ('avoid' in item && !(Array.isArray(item.avoid) && item.avoid.every((w: unknown) => typeof w === 'string'))) problem('"avoid" must be a list of words');
    if (unknown.length || errors.some((e) => e.startsWith(`${at}:`))) return;
    if (terms.some((t) => key(t.name) === key(term))) {
      return problem(`"${term.trim()}" is already a term: suggest a change to it with suggest-lexicon.mjs (action "edit")`);
    }
    if (!String(item.definition ?? '').trim()) return problem(`new term "${term.trim()}" needs a definition`);
    terms.push(clean({ ...(item as TermInput), name: term }));
    added.push(term.trim());
    touched.set(key(term), i + 1);
  });
  const result = { ...lexicon, terms };
  for (const p of newProblems(lexiconProblems(lexicon), lexiconProblems(result))) {
    const n = touched.get(key(p.term));
    errors.push(n ? `item ${n}: ${p.message}` : p.message);
  }
  return errors.length ? { ok: false, errors } : { ok: true, lexicon: result, added };
}
