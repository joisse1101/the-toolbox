// How the plan-stories skill reads a backlog's context map for the diagram-tools server: planner/data/diagrams/<backlog>/
// context-map.json (the checked source) and context-map.md (generated from it); see planner/guidelines/diagram-conventions.md
// section 9. Reading compares the map with the Epics of the backlog as they are now and only reports the difference; no file
// is changed here. A backlog without a map is normal, not an error.

import fs from 'node:fs';
import path from 'node:path';
import { epicNames, compareContextMap } from '../../../planner/logic/diagrams/context-map.js';
import { loadStories, DATA_LABEL } from './read-diagrams.mjs';

export const MAP_SOURCE_FILE = 'context-map.json';
export const MAP_DOCUMENT_FILE = 'context-map.md';

const readIfThere = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
};

// The two files of a backlog's diagrams folder as text (null when missing): { source, document }.
export const readMapFiles = (dir) => ({ source: readIfThere(path.join(dir, MAP_SOURCE_FILE)), document: readIfThere(path.join(dir, MAP_DOCUMENT_FILE)) });

// -> { ok: true, file, base, dir, exists: false } for a backlog with no map,
//    { ok: true, ..., exists: true, source, document, missing, unknown } for a readable one (missing: Epics in no context,
//    unknown: Epics the map lists and the backlog does not hold),
//    { ok: true, ..., exists: true, invalid } for a source that cannot be read, or { ok: false, errors }.
export function readContextMap({ dataDir, name }) {
  const loaded = loadStories({ dataDir, name });
  if (!loaded.ok) return loaded;
  const { file, base, dir, stories } = loaded;
  const files = readMapFiles(dir);
  if (files.source === null) return { ok: true, file, base, dir, exists: false };
  let source;
  try {
    source = JSON.parse(files.source);
  } catch (err) {
    return { ok: true, file, base, dir, exists: true, invalid: `${MAP_SOURCE_FILE} is not valid JSON: ${err.message}` };
  }
  if (!source || !Array.isArray(source.contexts)) return { ok: true, file, base, dir, exists: true, invalid: `${MAP_SOURCE_FILE} has no contexts list` };
  return { ok: true, file, base, dir, exists: true, source, document: files.document, ...compareContextMap(source, epicNames(stories)) };
}

export function formatContextMap(r) {
  if (!r.exists) return `${DATA_LABEL}\n=== diagrams/${r.base}: no context map ===`;
  if (r.invalid) return `${DATA_LABEL}\n=== diagrams/${r.base}: the context map cannot be read: ${r.invalid} ===`;
  const stale = r.missing.length > 0 || r.unknown.length > 0;
  const out = [DATA_LABEL, `=== diagrams/${r.base}: context map, ${r.source.contexts.length} contexts | ${stale ? 'STALE' : 'up to date'} ===`];
  for (const epic of r.missing) out.push(`missing: the Epic "${epic}" is in no context`);
  for (const epic of r.unknown) out.push(`unknown: the map lists the Epic "${epic}" and the backlog no longer holds it (renamed or deleted)`);
  if (r.document === null) out.push(`${MAP_DOCUMENT_FILE} is missing; writing the map again recreates it`);
  else out.push(`--- ${MAP_DOCUMENT_FILE} ---`, r.document.trimEnd());
  out.push(`--- ${MAP_SOURCE_FILE} ---`, JSON.stringify(r.source, null, 2));
  return out.join('\n');
}
