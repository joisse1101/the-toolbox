// Checks and writes one slice for the diagram-tools server: planner/data/diagrams/<backlog>/<slice>/ with the use-case
// specification, the class diagram, the sequence diagrams and source.json. checkDiagram and writeDiagram run the same
// preparation and the same checks (planner/logic/diagrams/checks.js), so a slice that passes one is accepted by the other;
// only writeDiagram writes. The stories come as { id, title } pairs, as for the backlog tools, and the story hashes are
// computed here, never taken from the caller.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { resolveStoryRef } from '../../../planner/logic/backlog/story-ref.js';
import { parseLimits } from '../../../planner/logic/diagrams/limits.js';
import { buildSource, scopeStories, applyStoriesBlock } from '../../../planner/logic/diagrams/source.js';
import { checkSlice, diagramNames, formatProblems } from '../../../planner/logic/diagrams/checks.js';
import { writeAtomic } from '../_shared/write-atomic.mjs';
import { loadStories, listSlices, slicePath, readSliceFolder, readConventions, scopeText, SOURCE_FILE } from './read-diagrams.mjs';

const require = createRequire(import.meta.url);
const { logWrite } = require('../../../planner/logic/storage/write-log.cjs');
const { DATA_DIR } = require('../../../planner/logic/storage/paths.cjs');
const { GUIDELINES_DIR } = require('../_shared/paths.cjs');

const MAX_FILE_CHARS = 200000;
const norm = (s) => String(s ?? '').trim().toLowerCase();
const sameScope = (a, b) => a.type === b.type && norm(a.epic) === norm(b.epic) && norm(a.feature) === norm(b.feature) && norm(a.title) === norm(b.title);

// The scope as the writer stores it: only the keys its type uses, trimmed.
function cleanScope(scope) {
  const type = scope?.type;
  if (!['epic', 'feature', 'story'].includes(type)) return { error: 'scope.type must be epic, feature or story.' };
  const trimmed = (k) => String(scope[k] ?? '').trim();
  const clean = { type, epic: trimmed('epic') };
  if (!clean.epic) return { error: 'scope.epic is required.' };
  if (type !== 'epic') {
    clean.feature = trimmed('feature');
    if (!clean.feature) return { error: `scope.feature is required for a ${type} scope.` };
  }
  if (type === 'story') {
    clean.title = trimmed('title');
    if (!clean.title) return { error: 'scope.title is required for a story scope.' };
  }
  return { scope: clean };
}

// Everything both tools need, or { ok: false, errors } naming every problem found.
//   input: { name, slice, scope, stories: [{ id, title }], files: [{ name, content }], repo?: { readPaths: Set } }
function prepare({ dataDir = DATA_DIR, guidelinesDir = GUIDELINES_DIR, name, slice, scope: rawScope, stories: pairs, files: fileList, repo = null, now = () => new Date().toISOString() }) {
  const loaded = loadStories({ dataDir, name });
  if (!loaded.ok) return loaded;
  const errors = [];
  const sliceDir = slicePath(loaded.dir, slice);
  if (!sliceDir || path.dirname(sliceDir) !== loaded.dir) return { ok: false, errors: [`The slice name "${slice}" must be a lowercase slug (letters, digits and hyphens); nothing outside diagrams/${loaded.base} can be written.`] };

  const cleaned = cleanScope(rawScope);
  if (cleaned.error) return { ok: false, errors: [cleaned.error] };
  const scope = cleaned.scope;
  const inScope = scopeStories(loaded.stories, scope);
  if (inScope.length === 0) errors.push(`No story of ${loaded.file} is in the scope ${scopeText(scope)}.`);

  // The stories named by the caller are the stories of the scope, each with its current Title.
  const given = Array.isArray(pairs) ? pairs : [];
  const listed = new Set();
  for (const pair of given) {
    const ref = resolveStoryRef(loaded.stories, { id: pair?.id, title: pair?.title }, { required: true, key: 'title', hint: 'read_context in the backlog tools' });
    if (!ref.ok) errors.push(ref.message);
    else if (!inScope.includes(ref.story)) errors.push(`"${ref.story.title.trim()}" is not in the scope ${scopeText(scope)}.`);
    else listed.add(ref.story);
  }
  for (const story of inScope) if (!listed.has(story)) errors.push(`The story "${story.title.trim()}" is in the scope but was not listed in stories.`);

  const files = {};
  for (const f of Array.isArray(fileList) ? fileList : []) {
    if (typeof f?.name !== 'string' || typeof f?.content !== 'string') errors.push('Every file needs a name and a content string.');
    else if (f.name in files) errors.push(`${f.name} is sent twice.`);
    else if (f.content.length > MAX_FILE_CHARS) errors.push(`${f.name} is longer than ${MAX_FILE_CHARS} characters.`);
    else files[f.name] = f.content.replace(/\r\n/g, '\n');
  }
  if (errors.length) return { ok: false, errors };

  const existing = fs.existsSync(sliceDir) ? readSliceFolder(sliceDir) : null;
  if (existing?.source?.scope && !sameScope(existing.source.scope, scope)) {
    return { ok: false, errors: [`The slice "${slice}" already exists for another scope (${scopeText(existing.source.scope)}); it is not overwritten. Choose another slice name.`] };
  }

  const otherNames = new Map();
  for (const other of listSlices(loaded.dir).filter((s) => s !== slice)) {
    const otherFiles = readSliceFolder(path.join(loaded.dir, other)).files;
    for (const [n, f] of diagramNames(otherFiles)) otherNames.set(n, `${other}/${f}`);
  }

  let limits;
  try {
    limits = parseLimits(readConventions({ guidelinesDir }));
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  const checked = checkSlice({ backlog: loaded.base, slice, files, stories: inScope, limits, otherNames, repo });
  if (!checked.ok) return { ok: false, errors: formatProblems(checked.problems) };
  return { ok: true, loaded, sliceDir, slice, scope, inScope, files, existing, now };
}

const problemsText = (errors) => `Nothing was written. ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n${errors.map((e) => `- ${e}`).join('\n')}`;

// -> { ok: true, text } | { ok: false, errors }. Writes nothing.
export function checkDiagram(input) {
  const p = prepare(input);
  if (!p.ok) return p;
  return { ok: true, text: `Check passed; nothing was written. ${Object.keys(p.files).length} file${Object.keys(p.files).length === 1 ? '' : 's'} of the slice "${p.slice}" (${scopeText(p.scope)}, ${p.inScope.length} stor${p.inScope.length === 1 ? 'y' : 'ies'}) meet the conventions.` };
}

const sameStories = (a, b) => JSON.stringify(a?.stories ?? null) === JSON.stringify(b?.stories ?? null) && JSON.stringify(a?.scope ?? null) === JSON.stringify(b?.scope ?? null);

// Writes the slice. -> { ok: true, changed, written, leftover, slice, base, text } | { ok: false, errors, text }.
export function writeDiagram(input) {
  const p = prepare(input);
  if (!p.ok) return { ...p, text: problemsText(p.errors) };
  const { loaded, sliceDir, slice, scope, inScope, existing } = p;
  const keepDrawnAt = existing?.source?.drawnAt;
  const source = buildSource(inScope, scope, keepDrawnAt ?? p.now());
  const files = { ...p.files };
  const specName = `UC-${slice}.md`;
  try {
    files[specName] = applyStoriesBlock(files[specName], source);
  } catch (err) {
    return { ok: false, errors: [err.message], text: problemsText([err.message]) };
  }
  const sourceText = `${JSON.stringify(source, null, 2)}\n`;

  const unchanged = existing && sameStories(existing.source, source) && Object.entries(files).every(([f, text]) => existing.files[f]?.replace(/\r\n/g, '\n') === text);
  const leftover = existing ? Object.keys(existing.files).filter((f) => !(f in files)) : [];
  if (unchanged) return { ok: true, changed: false, written: [], leftover, slice, base: loaded.base, text: `Nothing changed: the slice "${slice}" already holds exactly these files.` };

  fs.mkdirSync(sliceDir, { recursive: true });
  const order = [...Object.keys(files).filter((f) => f !== specName), specName]; // source.json last, so a failure never leaves it pointing at newer files
  const failures = [];
  for (const f of order) {
    const err = writeAtomic(sliceDir, f, files[f]);
    if (err) failures.push(err);
  }
  if (!failures.length) {
    const err = writeAtomic(sliceDir, SOURCE_FILE, sourceText);
    if (err) failures.push(err);
  }
  if (failures.length) return { ok: false, errors: failures, text: problemsText(failures) };

  // The read-back: the folder must hold exactly what was sent.
  const back = readSliceFolder(sliceDir);
  const missing = [...Object.keys(files).filter((f) => back.files[f] !== files[f]), ...(JSON.stringify(back.source) === JSON.stringify(source) ? [] : [SOURCE_FILE])];
  if (missing.length) {
    const errors = [`The folder does not hold what was sent after the write: ${missing.join(', ')}.`];
    return { ok: false, errors, text: problemsText(errors) };
  }
  const written = [...Object.keys(files).filter((f) => existing?.files[f] !== files[f]), ...(sameStories(existing?.source, source) ? [] : [SOURCE_FILE])];
  logWrite({ writer: 'write_diagram', store: 'diagrams', file: `${loaded.base}/${slice}`, text: Object.values(files).join('') + sourceText, extra: { backlog: loaded.base, slice }, dataDir: input.dataDir ?? DATA_DIR });
  const note = leftover.length ? ` Files in the folder that were not sent and were left as they are: ${leftover.join(', ')}.` : '';
  return { ok: true, changed: true, written, leftover, slice, base: loaded.base, text: `Wrote the slice "${slice}" to diagrams/${loaded.base}/${slice}/ (${written.join(', ')}); ${Object.keys(files).length} files and ${SOURCE_FILE}.${note}` };
}
