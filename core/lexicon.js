// The lexicon of one backlog: terms with definitions, in a markdown file (lexicons/<backlog>.md).
//   ## Dataset attribute
//   Part of: Dataset
//   Definition: A named, typed column of a dataset.
//   Avoid: field, column
//   Notes: Free text.
// A lexicon is { preamble, terms: [{ name, definition, avoid: [], notes, partOf, extra: [] }] }. Text that does not fit
// (before the first heading, or a `Label:` line with an unknown label) is kept in `preamble` / `extra` and written back.
// Names compare ignoring case and surrounding spaces. Pure: no file access.

const FIELDS = { definition: 'Definition', avoid: 'Avoid', notes: 'Notes', 'part of': 'Part of' };
const HEADING = /^##(?!#)[ \t]*(.*?)[ \t]*$/;
const LABEL_LINE = /^([A-Za-z][A-Za-z ]{0,19}):[ \t]?(.*)$/;
const TERM_KEYS = ['term', 'definition', 'avoid', 'notes', 'partOf'];

const key = (s) => String(s ?? '').trim().toLowerCase();
const splitList = (text) => text.split(',').map((w) => w.trim()).filter(Boolean);
const trimEnd = (lines) => {
  const out = [...lines];
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
};

export const emptyLexicon = () => ({ preamble: '', terms: [] });

// The lexicon file for a backlog: IAM.csv -> IAM.md.
export function lexiconFileName(backlogName) {
  return `${String(backlogName).replace(/\.csv$/i, '')}.md`;
}

export function parseLexicon(text) {
  const lines = String(text ?? '').replace(/^﻿/, '').split(/\r?\n/);
  const preamble = [];
  const terms = [];
  let term = null;
  let field = null; // the field a continuation line belongs to
  for (const line of lines) {
    const heading = HEADING.exec(line);
    if (heading) {
      term = { name: heading[1], definition: '', avoid: [], notes: '', partOf: '', extra: [], seen: new Set() };
      terms.push(term);
      field = null;
      continue;
    }
    if (!term) {
      preamble.push(line);
      continue;
    }
    const label = LABEL_LINE.exec(line);
    const known = label && FIELDS[key(label[1])] ? key(label[1]) : null;
    if (known && !term.seen.has(known)) {
      term.seen.add(known);
      field = known;
      const value = label[2];
      if (known === 'definition') term.definition = value;
      else if (known === 'avoid') term.avoid = splitList(value);
      else if (known === 'notes') term.notes = value;
      else term.partOf = value.trim();
      continue;
    }
    if (label) {
      term.extra.push(line); // an unknown label, or a field given twice
      field = null;
    } else if (field === 'definition' || field === 'notes') {
      term[field] += `\n${line}`;
    } else if (line.trim() || term.extra.length) {
      term.extra.push(line);
      field = null;
    }
  }
  for (const t of terms) {
    t.definition = t.definition.replace(/\s+$/, '');
    t.notes = t.notes.replace(/\s+$/, '');
    t.extra = trimEnd(t.extra);
    delete t.seen;
  }
  return { preamble: trimEnd(preamble).join('\n').replace(/^\n+/, ''), terms };
}

export function composeLexicon(lexicon) {
  const blocks = [];
  if (lexicon.preamble.trim()) blocks.push(lexicon.preamble);
  for (const t of lexicon.terms) {
    const lines = [`## ${t.name}`];
    if (t.partOf) lines.push(`Part of: ${t.partOf}`);
    if (t.definition) lines.push(`Definition: ${t.definition}`);
    if (t.avoid.length) lines.push(`Avoid: ${t.avoid.join(', ')}`);
    if (t.notes) lines.push(`Notes: ${t.notes}`);
    lines.push(...t.extra);
    blocks.push(lines.join('\n'));
  }
  return blocks.length ? `${blocks.join('\n\n')}\n` : '';
}

export const findTerm = (lexicon, name) => lexicon.terms.find((t) => key(t.name) === key(name)) ?? null;
export const childrenOf = (lexicon, name) => lexicon.terms.filter((t) => key(t.partOf) === key(name));

// Every rule the lexicon breaks, as { term, message }.
export function lexiconProblems(lexicon) {
  const problems = [];
  const add = (term, message) => problems.push({ term, message });
  const names = new Map();
  for (const t of lexicon.terms) names.set(key(t.name), (names.get(key(t.name)) ?? 0) + 1);
  const seen = new Set();
  for (const t of lexicon.terms) {
    if (!key(t.name)) add(t.name, 'A term needs a name');
    if (names.get(key(t.name)) > 1 && !seen.has(key(t.name))) add(t.name, `"${t.name}" is defined more than once`);
    seen.add(key(t.name));
    if (!t.definition.trim()) add(t.name, `"${t.name}" has no definition`);
    if (t.partOf) {
      if (key(t.partOf) === key(t.name)) add(t.name, `"${t.name}" cannot be part of itself`);
      else if (!names.has(key(t.partOf))) add(t.name, `"${t.name}" is part of "${t.partOf}", which is not a term`);
      else {
        const chain = new Set([key(t.name)]);
        for (let at = findTerm(lexicon, t.partOf); at; at = at.partOf ? findTerm(lexicon, at.partOf) : null) {
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
const newProblems = (before, after) => {
  const old = new Set(before.map((p) => p.message));
  return after.filter((p) => !old.has(p.message));
};

const clean = (term) => ({
  name: String(term.name ?? '').trim(),
  definition: String(term.definition ?? '').trim(),
  avoid: [...new Set((term.avoid ?? []).map((w) => String(w).trim()).filter(Boolean))],
  notes: String(term.notes ?? '').trim(),
  partOf: String(term.partOf ?? '').trim(),
  extra: term.extra ?? [],
});

// Adds a term, or with { replaces: <current name> } replaces that one in place (a changed name also updates the Part of
// of its children). Returns { ok: true, lexicon } or { ok: false, errors: [message] }; the input is never changed.
export function saveTerm(lexicon, term, { replaces = null } = {}) {
  const next = clean(term);
  const index = replaces === null ? -1 : lexicon.terms.findIndex((t) => key(t.name) === key(replaces));
  if (replaces !== null && index < 0) return { ok: false, errors: [`"${replaces}" is not a term`] };
  if (!next.name) return { ok: false, errors: ['A term needs a name'] };
  if (lexicon.terms.some((t, i) => i !== index && key(t.name) === key(next.name))) {
    return { ok: false, errors: [`"${next.name}" already exists`] };
  }
  const terms = lexicon.terms.map((t) => ({ ...t, avoid: [...t.avoid], extra: [...t.extra] }));
  if (index < 0) terms.push(next);
  else {
    const old = terms[index];
    next.extra = old.extra;
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

export function renameTerm(lexicon, name, newName) {
  const term = findTerm(lexicon, name);
  if (!term) return { ok: false, errors: [`"${name}" is not a term`] };
  return saveTerm(lexicon, { ...term, name: newName }, { replaces: name });
}

// Refused while another term is part of it.
export function deleteTerm(lexicon, name) {
  const term = findTerm(lexicon, name);
  if (!term) return { ok: false, errors: [`"${name}" is not a term`] };
  const kids = childrenOf(lexicon, name);
  if (kids.length) {
    return { ok: false, errors: [`"${term.name}" cannot be deleted: ${kids.map((k) => `"${k.name}"`).join(', ')} ${kids.length === 1 ? 'is' : 'are'} part of it`] };
  }
  return { ok: true, lexicon: { ...lexicon, terms: lexicon.terms.filter((t) => t !== term) } };
}

// The writer's input: a list of { term, definition?, avoid?, notes?, partOf? }. A term that exists is patched (only the
// keys given change; partOf "" and avoid [] clear), any other is added and needs a definition. Everything is checked
// on the lexicon as it will be, so a parent added earlier in the list is fine. Returns { ok, lexicon, added, patched }
// or { ok: false, errors }, each error naming its item (1-based).
export function applyTermItems(lexicon, items) {
  if (!Array.isArray(items)) return { ok: false, errors: ['The input must be a JSON list of terms'] };
  const errors = [];
  const added = [];
  const patched = [];
  const touched = new Map(); // term key -> position of the last item that set it
  let terms = lexicon.terms.map((t) => ({ ...t, avoid: [...t.avoid], extra: [...t.extra] }));
  items.forEach((item, i) => {
    const at = `item ${i + 1}`;
    const problem = (message) => errors.push(`${at}: ${message}`);
    if (!item || typeof item !== 'object' || Array.isArray(item)) return problem('must be an object');
    const unknown = Object.keys(item).filter((k) => !TERM_KEYS.includes(k));
    if (unknown.length) problem(`unknown key${unknown.length > 1 ? 's' : ''} ${unknown.map((k) => `"${k}"`).join(', ')}`);
    if (typeof item.term !== 'string' || !item.term.trim()) return problem('needs a "term"');
    for (const k of ['definition', 'notes', 'partOf']) if (k in item && typeof item[k] !== 'string') problem(`"${k}" must be text`);
    if ('avoid' in item && !(Array.isArray(item.avoid) && item.avoid.every((w) => typeof w === 'string'))) problem('"avoid" must be a list of words');
    if (unknown.length || errors.some((e) => e.startsWith(`${at}:`))) return;
    const existing = terms.find((t) => key(t.name) === key(item.term));
    if (existing) {
      if ('definition' in item) existing.definition = item.definition.trim();
      if ('avoid' in item) existing.avoid = [...new Set(item.avoid.map((w) => w.trim()).filter(Boolean))];
      if ('notes' in item) existing.notes = item.notes.trim();
      if ('partOf' in item) existing.partOf = item.partOf.trim();
      patched.push(existing.name);
    } else {
      if (!String(item.definition ?? '').trim()) return problem(`new term "${item.term.trim()}" needs a definition`);
      terms.push(clean({ ...item, name: item.term }));
      added.push(item.term.trim());
    }
    touched.set(key(item.term), i + 1);
  });
  const result = { ...lexicon, terms };
  for (const p of newProblems(lexiconProblems(lexicon), lexiconProblems(result))) {
    const n = touched.get(key(p.term));
    errors.push(n ? `item ${n}: ${p.message}` : p.message);
  }
  return errors.length ? { ok: false, errors } : { ok: true, lexicon: result, added, patched };
}
