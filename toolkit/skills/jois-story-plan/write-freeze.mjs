// Freezes the stories a confirmed slice covers: the only thing the jois-story-plan skill writes into the backlog. Usage, the
// stories as JSON on stdin (an array of { id, title }, the ID and current Title of each story, as the slice names them):
//   node <skill folder>/write-freeze.mjs <backlog name> [--check]
// It changes only the `Frozen` cell of the stories it names, and no other cell, row, column or ID. A story with no ID, or with an ID that
// does not start with the backlog's initials (the portal has not rewritten it yet), is refused and left as it is; the others are
// frozen. A story that is already frozen is left as it is, so running the same freeze twice changes nothing. An ID that is not in
// the file, a Title that does not match its ID, or an ID that the file holds in another form than the portal would give it, stops the
// whole run before anything is written. --check runs the same preparation and writes nothing. The write is atomic and the file is
// read again afterwards. The data folder comes from the PLANNER_CONFIG variable, else .plans or a planner.config.yaml in the
// current folder (see lib/skill-support/resolve-data-dir.mjs).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { parseCsv, toCsv } from './lib/backlog/csv.js';
import { loadBacklog } from './lib/backlog/model.js';
import { resolveStoryRef } from './lib/backlog/story-ref.js';
import { describeParseError, writeAtomic } from './lib/skill-support/write-atomic.mjs';
import { dataDirOrThrow } from './lib/skill-support/resolve-data-dir.mjs';
import { initialsOf } from './lib/skill-support/backlog-initials.mjs';

const require = createRequire(import.meta.url);
const { backlogDir, backlogFile } = require('./lib/storage/backlog-paths.cjs'); // same name rules as the file API
const { shown } = require('./lib/skill-support/paths.cjs');

const FROZEN = 'Frozen';
const isYes = (v) => String(v ?? '').trim().toLowerCase() === 'yes';
const columnOf = (headers, name) => headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());

// The raw rows with the `Frozen` cell of the listed IDs set to Yes (the column is added at the end when the file has none).
function withFrozen(rows, codes) {
  const headers = rows[0].slice();
  const idCol = columnOf(headers, 'ID');
  let col = columnOf(headers, FROZEN);
  const added = col < 0;
  if (added) {
    col = headers.length;
    headers.push(FROZEN);
  }
  const body = rows.slice(1).map((r) => {
    const cells = r.slice();
    if (added) while (cells.length < col) cells.push('');
    if (added && cells.length === col) cells.push('');
    if (codes.has((cells[idCol] ?? '').trim())) cells[col] = 'Yes';
    return cells;
  });
  return [headers, ...body];
}

// Reads the backlog and validates the request. Returns { ok: true, file, csvPath, text, toFreeze, already, refused } or
// { ok: false, errors }. Writes nothing.
function prepare({ dataDir, name, input }) {
  let file;
  let csvPath;
  try {
    file = path.basename(backlogDir(dataDir, name));
    csvPath = backlogFile(dataDir, name, 'backlog');
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  let text;
  try {
    text = fs.readFileSync(csvPath, 'utf8');
  } catch {
    return { ok: false, errors: [`${shown(dataDir, csvPath)} was not found.`] };
  }
  let requested;
  try {
    requested = JSON.parse(input);
  } catch (err) {
    return { ok: false, errors: [describeParseError(err, input, 'stories to freeze')] };
  }
  if (!Array.isArray(requested) || requested.length === 0) {
    return { ok: false, errors: ['Send a non-empty JSON array of { "id", "title" }, one per story to freeze.'] };
  }

  const initials = initialsOf(dataDir, file);
  const { stories } = loadBacklog(text, { initials });
  const rows = parseCsv(text);
  const idCol = rows.length ? columnOf(rows[0], 'ID') : -1;
  const fileIds = idCol < 0 ? [] : rows.slice(1).map((r) => (r[idCol] ?? '').trim());

  const errors = [];
  const refused = [];
  const already = [];
  const toFreeze = [];
  const seen = new Set();
  requested.forEach((item, i) => {
    const id = String(item?.id ?? '').trim();
    const title = String(item?.title ?? '').trim();
    const label = id || (title ? `"${title}"` : `entry ${i + 1}`);
    if (!id) {
      refused.push({ id: '', title, reason: `${label} has no ID, so it cannot be frozen. Give it an ID in the portal first.` });
      return;
    }
    if (!id.startsWith(`${initials}-`)) {
      refused.push({ id, title, reason: `${id} does not start with the backlog's initials (${initials}), so the portal has not rewritten it yet. Open the backlog in the portal first so its IDs are rewritten, then freeze it.` });
      return;
    }
    if (fileIds.includes(id) && (fileIds.filter((c) => c === id).length !== 1 || !stories.some((s) => s.code === id))) {
      errors.push(`${id} is held in ${file} in a form the portal would change (it repeats, or the portal would give the story another ID). Open the backlog in the portal first so its IDs are rewritten.`);
      return;
    }
    const ref = resolveStoryRef(stories, { id, title }, { required: true });
    if (!ref.ok) {
      errors.push(ref.message);
      return;
    }
    if (!ref.story) {
      errors.push(`${id} is not in ${file}.`);
      return;
    }
    if (seen.has(id)) return;
    seen.add(id);
    (ref.story.frozen ? already : toFreeze).push(id);
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, file, csvPath, text, toFreeze, already, refused };
}

const summary = (p, verb) => {
  const parts = [`${verb} ${p.toFreeze.length} stor${p.toFreeze.length === 1 ? 'y' : 'ies'}${p.toFreeze.length ? ` (${p.toFreeze.join(', ')})` : ''}`];
  if (p.already.length) parts.push(`already frozen and left as they are: ${p.already.join(', ')}`);
  if (p.refused.length) parts.push(`refused and not frozen: ${p.refused.map((r) => r.reason).join(' ')}`);
  return parts.join('; ');
};

// Same input and problems as writeFreeze; no file is changed. -> { ok: true, toFreeze, already, refused, text } | { ok: false, errors }.
export function checkFreeze({ dataDir = dataDirOrThrow(), name, input }) {
  const p = prepare({ dataDir, name, input });
  if (!p.ok) return p;
  return { ...p, text: `Check passed; nothing was written. ${summary(p, 'Would freeze')}.` };
}

// Freezes the stories. -> { ok: true, changed, toFreeze, already, refused, text } | { ok: false, errors }.
export function writeFreeze({ dataDir = dataDirOrThrow(), name, input }) {
  const p = prepare({ dataDir, name, input });
  if (!p.ok) return p;
  const { file, csvPath, text, toFreeze, already, refused } = p;
  if (!toFreeze.length) return { ...p, changed: false, text: `Nothing changed in ${file}. ${summary(p, 'Froze')}.` };

  const expected = withFrozen(parseCsv(text), new Set(toFreeze));
  const bom = text.charCodeAt(0) === 0xfeff ? '﻿' : '';
  const csv = toCsv(expected);
  const out = bom + (text.includes('\r\n') ? csv : csv.replace(/\r\n/g, '\n'));
  const failure = writeAtomic(path.dirname(csvPath), path.basename(csvPath), out);
  if (failure) return { ok: false, errors: [failure] };

  // Read back: the file must hold exactly the expected cells, and every named story must read as frozen.
  const back = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const idCol = columnOf(back[0], 'ID');
  const frozenCol = columnOf(back[0], FROZEN);
  const frozenBack = new Set(back.slice(1).filter((r) => isYes(r[frozenCol])).map((r) => (r[idCol] ?? '').trim()));
  if (JSON.stringify(back) !== JSON.stringify(expected) || !toFreeze.every((id) => frozenBack.has(id))) {
    return { ok: false, errors: [`${file} does not hold the frozen stories after the write. Check the file before you go on.`] };
  }
  return { ok: true, changed: true, toFreeze, already, refused, text: `Wrote ${file}: ${summary(p, 'froze')}. Read back: the file holds exactly those changes.` };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const check = process.argv[3] === '--check';
  if (process.argv.length !== (check ? 4 : 3)) {
    console.error('Usage: node write-freeze.mjs <backlog name> [--check]  (JSON array of { id, title } on stdin)');
    process.exit(2);
  }
  let result;
  try {
    result = (check ? checkFreeze : writeFreeze)({ dataDir: dataDirOrThrow(), name: process.argv[2], input: fs.readFileSync(0, 'utf8') });
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
