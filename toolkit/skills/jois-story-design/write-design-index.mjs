// Writes the story index of a design: <data folder>/<backlog>/design-index.csv, one row per acceptance criterion of each designed
// story (see references/design-conventions.md, section 1). The only way the jois-story-design skill writes that file. Usage, one
// request as JSON on stdin:
//   node <skill folder>/write-design-index.mjs <backlog name> [--check]
//   { "canvas": "<claude.ai artifact link>", "viewports": ["desktop", "mobile"],
//     "stories": [ { "storyId": "H1-HT-0001", "criteria": [ { "text": "<criterion as written after AC1:>", "kind": "main",
//                    "artboards": ["streaks-list-default-desktop", ...], "viewports": ["desktop"] } ] } ] }
// It REPLACES the rows of the named stories and leaves every other story's rows as they are: a full design run names every story of
// the scope, update mode names only the changed ones. A story with an empty criteria list has its rows removed. A criterion's
// "viewports" is optional and defaults to the request's. "artboards" may be empty (update mode writes a row that still has no
// artboard; the checker reports it). The Story column is the story's Title in the backlog. A column the file holds that this script
// does not know is kept on the rows that stay, and on a row whose story and criterion text are written again.
// Refused, with nothing written and the problem named: a story ID that is not in the backlog or is named twice, a criterion that
// is empty or repeats within its story, a Kind that is not main or failure, a viewport that is not desktop or mobile, an artboard
// stem that is not lowercase kebab-case ending in one of its row's viewports, a canvas that is not a claude.ai artifact link, and
// an existing file that cannot be read. --check runs the same preparation and writes nothing. The write is atomic and the file is
// read again afterwards. The data folder is the .plans folder in the current folder (see lib/skill-support/resolve-data-dir.mjs).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadBacklog } from './lib/backlog/model.mjs';
import { IndexError, parseDesignIndexCsv, serializeDesignIndex } from './lib/design/design-index-csv.mjs';
import { describeParseError, writeAtomic } from './lib/skill-support/write-atomic.mjs';
import { dataDirOrThrow } from './lib/skill-support/resolve-data-dir.mjs';
import { initialsOf } from './lib/skill-support/backlog-initials.mjs';
import { backlogDir, backlogFile } from './lib/storage/backlog-paths.mjs';
import { shown } from './lib/skill-support/paths.mjs';

export const DESIGN_INDEX_FILE = 'design-index.csv';
const ARTIFACT_URL = /^https:\/\/claude\.ai\/(?:code\/)?artifact\/[A-Za-z0-9_-]+$/;
const STEM = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KINDS = ['main', 'failure'];
const VIEWPORTS = ['desktop', 'mobile'];
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim() !== '';

// -> { viewports } or { error } for a list of viewports.
function checkViewports(value, where) {
  if (!Array.isArray(value) || value.length === 0) return { error: `${where} must be a list holding desktop, mobile or both` };
  for (const v of value) {
    if (!VIEWPORTS.includes(v)) return { error: `${where} must hold only desktop and mobile (found ${JSON.stringify(v)})` };
  }
  if (new Set(value).size !== value.length) return { error: `${where} repeats a viewport` };
  return { viewports: value };
}

// The rows of one named story, or the problems found. `at` names the story in a message.
function storyRows({ entry, story, canvas, defaults, keepExtra }) {
  const at = `story ${entry.storyId}`;
  const errors = [];
  const rows = [];
  const seen = new Set();
  entry.criteria.forEach((c, i) => {
    const where = `${at}, criterion ${i + 1}`;
    if (!isRecord(c)) {
      errors.push(`${where}: must be an object { "text", "kind", "artboards" }`);
      return;
    }
    const text = typeof c.text === 'string' ? c.text.trim() : '';
    if (!text) errors.push(`${where}: "text" must not be empty`);
    else if (seen.has(text)) errors.push(`${where}: repeats a criterion of ${entry.storyId}: ${text}`);
    seen.add(text);
    if (!KINDS.includes(c.kind)) errors.push(`${where}: "kind" must be "main" or "failure" (found ${JSON.stringify(c.kind)})`);
    let viewports = defaults;
    if (c.viewports !== undefined) {
      const checked = checkViewports(c.viewports, `${where}: "viewports"`);
      if (checked.error) errors.push(checked.error);
      else viewports = checked.viewports;
    }
    const artboards = c.artboards ?? [];
    if (!Array.isArray(artboards)) {
      errors.push(`${where}: "artboards" must be a list of file stems`);
      return;
    }
    for (const stem of artboards) {
      if (typeof stem !== 'string' || !STEM.test(stem)) errors.push(`${where}: artboard ${JSON.stringify(stem)} must be a lowercase kebab-case file stem`);
      else if (!viewports.some((v) => stem.endsWith(`-${v}`))) errors.push(`${where}: artboard ${stem} must end in one of the row's viewports (${viewports.join(', ')})`);
    }
    if (new Set(artboards).size !== artboards.length) errors.push(`${where}: "artboards" repeats a stem`);
    rows.push({
      storyId: entry.storyId,
      story: story.title.trim(),
      criterion: text,
      kind: c.kind,
      artboards,
      viewports,
      canvas,
      extra: keepExtra(entry.storyId, text),
    });
  });
  return { rows, errors };
}

// Reads the request, the backlog and the file. -> { ok: true, dir, file, text, expected, summary, changed } or { ok: false, errors }.
function prepare({ dataDir, name, input }) {
  let dir;
  let csvPath;
  try {
    dir = backlogDir(dataDir, name);
    csvPath = backlogFile(dataDir, name, 'backlog');
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  if (!fs.existsSync(csvPath)) return { ok: false, errors: [`There is no backlog ${path.basename(dir)}: ${shown(dataDir, csvPath)} was not found.`] };
  let request;
  try {
    request = JSON.parse(input);
  } catch (err) {
    return { ok: false, errors: [describeParseError(err, input, 'design index request')] };
  }
  if (!isRecord(request)) return { ok: false, errors: ['Send one JSON object { "canvas", "viewports", "stories" }.'] };
  const errors = [];
  const extra = Object.keys(request).filter((k) => !['canvas', 'viewports', 'stories'].includes(k));
  if (extra.length) errors.push(`${extra.join(', ')} ${extra.length === 1 ? 'is' : 'are'} not allowed: send only "canvas", "viewports" and "stories".`);
  if (!isText(request.canvas) || !ARTIFACT_URL.test(request.canvas)) errors.push('canvas must be a claude.ai artifact link: https://claude.ai/artifact/<id> or https://claude.ai/code/artifact/<id>, with no "#" fragment and nothing after the id.');
  const defaults = checkViewports(request.viewports, 'viewports');
  if (defaults.error) errors.push(defaults.error);
  if (!Array.isArray(request.stories) || request.stories.length === 0) errors.push('stories must be a non-empty list of { "storyId", "criteria" }.');
  if (errors.length) return { ok: false, errors };

  const file = path.join(dir, DESIGN_INDEX_FILE);
  let oldRows = [];
  if (fs.existsSync(file)) {
    try {
      oldRows = parseDesignIndexCsv(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      if (err instanceof IndexError) return { ok: false, errors: [`${shown(dataDir, file)} cannot be read: ${err.message}. Fix or remove it first.`] };
      throw err;
    }
  }
  const { stories } = loadBacklog(fs.readFileSync(csvPath, 'utf8'), { initials: initialsOf(dataDir, path.basename(dir)) });
  const keepExtra = (storyId, text) => oldRows.find((r) => r.storyId === storyId && r.criterion === text)?.extra ?? {};

  const replacement = new Map(); // story ID -> the rows that replace its rows ([] removes the story)
  for (const [i, entry] of request.stories.entries()) {
    const where = `stories[${i}]`;
    if (!isRecord(entry) || !isText(entry.storyId) || !Array.isArray(entry.criteria)) {
      errors.push(`${where}: must be { "storyId": "<ID>", "criteria": [ ... ] }`);
      continue;
    }
    if (replacement.has(entry.storyId)) {
      errors.push(`${where}: story ${entry.storyId} is named twice`);
      continue;
    }
    const story = stories.find((s) => s.code === entry.storyId);
    if (!story) {
      errors.push(`${where}: story ${entry.storyId} is not in the backlog ${path.basename(dir)}`);
      continue;
    }
    const built = storyRows({ entry, story, canvas: request.canvas, defaults: defaults.viewports, keepExtra });
    errors.push(...built.errors);
    replacement.set(entry.storyId, built.rows);
  }
  if (errors.length) return { ok: false, errors };

  // The named stories take the place of their old rows (a new story goes last); every other row stays where it was.
  const written = new Set();
  const rows = [];
  for (const row of oldRows) {
    const rowsOfStory = replacement.get(row.storyId);
    if (!rowsOfStory) rows.push(row);
    else if (!written.has(row.storyId)) {
      rows.push(...rowsOfStory);
      written.add(row.storyId);
    }
  }
  for (const [storyId, rowsOfStory] of replacement) {
    if (!written.has(storyId)) rows.push(...rowsOfStory);
  }
  const expected = serializeDesignIndex(rows);
  const changed = expected !== serializeDesignIndex(oldRows);
  const summary = [...replacement].map(([storyId, rowsOfStory]) => {
    const before = oldRows.filter((r) => r.storyId === storyId).length;
    if (rowsOfStory.length === 0) return before ? `remove ${storyId}: ${before} row${before === 1 ? '' : 's'} dropped` : `remove ${storyId}: it has no rows, nothing to drop`;
    return `${before ? 'replace' : 'add'} ${storyId}: ${before} row${before === 1 ? '' : 's'} -> ${rowsOfStory.length} row${rowsOfStory.length === 1 ? '' : 's'}`;
  });
  return { ok: true, dir, file, expected, rows, changed, summary };
}

// Same input and problems as writeDesignIndex; no file is changed. -> { ok: true, changed: false, text } | { ok: false, errors }.
export function checkDesignIndexWrite({ dataDir = dataDirOrThrow(), name, input }) {
  const p = prepare({ dataDir, name, input });
  if (!p.ok) return p;
  const verdict = p.changed ? 'would write' : 'would leave unchanged';
  return { ok: true, changed: false, text: `Check passed; nothing was written. ${DESIGN_INDEX_FILE}: ${verdict} (${p.rows.length} row${p.rows.length === 1 ? '' : 's'} in all).\n${p.summary.join('\n')}` };
}

// Replaces the rows of the named stories. -> { ok: true, changed, text } | { ok: false, errors }.
export function writeDesignIndex({ dataDir = dataDirOrThrow(), name, input }) {
  const p = prepare({ dataDir, name, input });
  if (!p.ok) return p;
  if (!p.changed) return { ok: true, changed: false, text: `Unchanged: ${DESIGN_INDEX_FILE} already holds these rows.\n${p.summary.join('\n')}` };
  const failure = writeAtomic(p.dir, DESIGN_INDEX_FILE, p.expected);
  if (failure) return { ok: false, errors: [failure] };
  let back = null;
  try {
    back = serializeDesignIndex(parseDesignIndexCsv(fs.readFileSync(p.file, 'utf8')));
  } catch (err) {
    if (!(err instanceof IndexError) && err.code !== 'ENOENT') throw err;
  }
  if (back !== p.expected) return { ok: false, errors: [`${DESIGN_INDEX_FILE} does not hold the rows after the write. Check the file before you go on.`] };
  return { ok: true, changed: true, text: `Wrote ${DESIGN_INDEX_FILE}: ${p.rows.length} row${p.rows.length === 1 ? '' : 's'} in all. Read back: the file holds exactly those rows.\n${p.summary.join('\n')}` };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const check = process.argv[3] === '--check';
  if (process.argv.length !== (check ? 4 : 3)) {
    console.error('Usage: node write-design-index.mjs <backlog name> [--check]  (JSON { canvas, viewports, stories } on stdin)');
    process.exit(2);
  }
  let result;
  try {
    result = (check ? checkDesignIndexWrite : writeDesignIndex)({ dataDir: dataDirOrThrow(), name: process.argv[2], input: fs.readFileSync(0, 'utf8') });
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
