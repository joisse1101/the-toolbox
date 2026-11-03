// Checks and writes one slice: <data folder>/<backlog>/slices/<slice>/ with the one document UC-<slice>.md (specification
// and Mermaid diagrams) and source.json. Usage, the slice as JSON on stdin:
//   node <skill folder>/write-diagram.mjs <backlog name> [--check] [--repo]
// The JSON is { slice, scope, stories: [{ id, title }], files: [{ name, content }] }. --check runs the same preparation, the same
// structural checks (diagrams/checks.js) and Mermaid's own parser on every diagram as the write, and writes nothing; --repo says
// the skill read the repo, which lifts the limits of a slice without one. The stories come as { id, title } pairs and the story
// hashes are computed here, never taken from the caller. Without the Mermaid packages (see parse-mermaid.mjs) it refuses.
// The data folder comes from the PLANNER_CONFIG variable or a planner.config.yaml (see lib/skill-support/resolve-data-dir.mjs).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolveStoryRef } from './lib/backlog/story-ref.js';
import { parseLimits } from './diagrams/limits.js';
import { buildSource, scopeStories, applyStoriesBlock } from './diagrams/source.js';
import { checkSlice, formatProblems } from './diagrams/checks.js';
import { describeParseError, writeAtomic } from './lib/skill-support/write-atomic.mjs';
import { loadStories, slicePath, readSliceFolder, readConventions, scopeText, SOURCE_FILE } from './read-diagrams.mjs';
import { parseMermaid, mermaidMissing } from './parse-mermaid.mjs';
import { dataDirOrThrow } from './lib/skill-support/resolve-data-dir.mjs';

const require = createRequire(import.meta.url);
const { logWrite } = require('./lib/storage/write-log.cjs');
const { GUIDELINES_DIR } = require('./lib/skill-support/paths.cjs');

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
//   input: { name, slice, scope, stories: [{ id, title }], files: [{ name, content }], repo?: {} (the skill read the repo) }
async function prepare({ dataDir = dataDirOrThrow(), guidelinesDir = GUIDELINES_DIR, name, slice, scope: rawScope, stories: pairs, files: fileList, repo = null, now = () => new Date().toISOString() }) {
  const missing = mermaidMissing();
  if (missing) return { ok: false, errors: [missing] };
  const loaded = loadStories({ dataDir, name });
  if (!loaded.ok) return loaded;
  const errors = [];
  const sliceDir = slicePath(loaded.dir, slice);
  if (!sliceDir || path.dirname(sliceDir) !== loaded.dir) return { ok: false, errors: [`The slice name "${slice}" must be a lowercase slug (letters, digits and hyphens); nothing outside ${loaded.base}/slices can be written.`] };

  const cleaned = cleanScope(rawScope);
  if (cleaned.error) return { ok: false, errors: [cleaned.error] };
  const scope = cleaned.scope;
  const inScope = scopeStories(loaded.stories, scope);
  if (inScope.length === 0) errors.push(`No story of ${loaded.file} is in the scope ${scopeText(scope)}.`);

  // The stories named by the caller are the stories of the scope, each with its current Title.
  const given = Array.isArray(pairs) ? pairs : [];
  const listed = new Set();
  for (const pair of given) {
    const ref = resolveStoryRef(loaded.stories, { id: pair?.id, title: pair?.title }, { required: true, key: 'title', hint: 'the backlog file user-stories.csv' });
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

  let limits;
  try {
    limits = parseLimits(readConventions({ guidelinesDir }));
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  const checked = checkSlice({ slice, files, stories: inScope, limits, repo });
  const specName = `UC-${slice}.md`;
  const parsed = await Promise.all(checked.diagrams.map(async (d) => ({ d, result: await parseMermaid(d.text) })));
  const parserProblems = parsed.filter(({ result }) => !result.ok).map(({ d, result }) => ({ file: specName, line: d.line + (result.line ?? 0), message: `${d.heading}: does not parse as Mermaid: ${result.message}` }));
  const all = [...checked.problems, ...parserProblems];
  if (all.length) return { ok: false, errors: formatProblems(all) };
  return { ok: true, loaded, sliceDir, slice, scope, inScope, files, existing, now };
}

const problemsText = (errors) => `Nothing was written. ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n${errors.map((e) => `- ${e}`).join('\n')}`;

// -> { ok: true, text } | { ok: false, errors }. Writes nothing.
export async function checkDiagram(input) {
  const p = await prepare(input);
  if (!p.ok) return p;
  return { ok: true, text: `Check passed; nothing was written. The document of the slice "${p.slice}" (${scopeText(p.scope)}, ${p.inScope.length} stor${p.inScope.length === 1 ? 'y' : 'ies'}) meets the conventions, and every diagram parses as Mermaid.` };
}

const sameStories = (a, b) => JSON.stringify(a?.stories ?? null) === JSON.stringify(b?.stories ?? null) && JSON.stringify(a?.scope ?? null) === JSON.stringify(b?.scope ?? null);

// Writes the slice. -> { ok: true, changed, written, leftover, slice, base, text } | { ok: false, errors, text }.
export async function writeDiagram(input) {
  const p = await prepare(input);
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
  logWrite({ writer: 'write-diagram.mjs', backlog: loaded.base, kind: 'slices', text: Object.values(files).join('') + sourceText, extra: { slice }, dataDir: input.dataDir ?? dataDirOrThrow() });
  const note = leftover.length ? ` Files in the folder that were not sent and were left as they are: ${leftover.join(', ')}.` : '';
  return { ok: true, changed: true, written, leftover, slice, base: loaded.base, text: `Wrote the slice "${slice}" to ${loaded.base}/slices/${slice}/ (${written.join(', ')}); ${Object.keys(files).length} files and ${SOURCE_FILE}.${note}` };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
  const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (names.length !== 1 || flags.some((f) => f !== '--check' && f !== '--repo')) {
    console.error('Usage: node write-diagram.mjs <backlog name> [--check] [--repo]  (slice JSON on stdin)');
    process.exit(2);
  }
  let result;
  try {
    const raw = fs.readFileSync(0, 'utf8');
    let body;
    try {
      body = JSON.parse(raw);
    } catch (err) {
      throw new Error(describeParseError(err, raw, 'slice'));
    }
    const input = { dataDir: dataDirOrThrow(), name: names[0], slice: body.slice, scope: body.scope, stories: body.stories, files: body.files, repo: flags.includes('--repo') ? {} : null };
    result = await (flags.includes('--check') ? checkDiagram : writeDiagram)(input);
  } catch (err) {
    console.error(`Nothing was written. ${err.message}`);
    process.exit(1);
  }
  if (!result.ok) {
    console.error(`Nothing was written. ${result.errors.length} problem${result.errors.length === 1 ? '' : 's'}:`);
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(result.text);
}
