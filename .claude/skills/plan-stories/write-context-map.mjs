// Checks and writes a backlog's context map for the diagram-tools server: planner/data/diagrams/<backlog>/context-map.json (the
// source) and context-map.md (composed from it). checkContextMap and writeContextMap run the same preparation, the same checks
// (planner/logic/diagrams/context-map.js) and Mermaid's own parser on the flowchart, so a map that passes one is accepted by the
// other; only writeContextMap writes. The document is generated here, never sent by the caller.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { parseLimits } from '../../../planner/logic/diagrams/limits.js';
import { checkContextMap as findProblems, composeContextMap, epicNames } from '../../../planner/logic/diagrams/context-map.js';
import { writeAtomic } from '../_shared/write-atomic.mjs';
import { loadStories, readConventions } from './read-diagrams.mjs';
import { readMapFiles, MAP_SOURCE_FILE, MAP_DOCUMENT_FILE } from './read-context-map.mjs';
import { parseMermaid } from './parse-mermaid.mjs';

const require = createRequire(import.meta.url);
const { logWrite } = require('../../../planner/logic/storage/write-log.cjs');
const { DATA_DIR } = require('../../../planner/logic/storage/paths.cjs');
const { GUIDELINES_DIR } = require('../_shared/paths.cjs');

const norm = (s) => String(s ?? '').trim().toLowerCase();
const trimmed = (s) => String(s ?? '').trim();

// The source as it is stored: only the known keys, trimmed, an Epic or context spelled as the backlog and the map spell it.
function cleanSource({ contexts, relationships }, epics) {
  const epicSpelling = new Map(epics.map((e) => [norm(e), e]));
  const cleanContexts = (Array.isArray(contexts) ? contexts : []).map((c) => ({
    name: trimmed(c?.name),
    purpose: trimmed(c?.purpose),
    owner: trimmed(c?.owner),
    epics: (Array.isArray(c?.epics) ? c.epics : []).map((e) => epicSpelling.get(norm(e)) ?? trimmed(e)),
    ...(trimmed(c?.reason) ? { reason: trimmed(c.reason) } : {}),
  }));
  const contextSpelling = new Map(cleanContexts.map((c) => [norm(c.name), c.name]));
  const cleanRelationships = (Array.isArray(relationships) ? relationships : []).map((r) => ({
    from: contextSpelling.get(norm(r?.from)) ?? trimmed(r?.from),
    to: contextSpelling.get(norm(r?.to)) ?? trimmed(r?.to),
    type: trimmed(r?.type),
    crosses: trimmed(r?.crosses),
  }));
  return { contexts: cleanContexts, relationships: cleanRelationships };
}

// input: { dataDir, guidelinesDir, name, contexts, relationships }
//   -> { ok: true, loaded, source, sourceText, documentText } | { ok: false, errors }
async function prepare({ dataDir = DATA_DIR, guidelinesDir = GUIDELINES_DIR, name, contexts, relationships }) {
  const loaded = loadStories({ dataDir, name });
  if (!loaded.ok) return loaded;
  let limits;
  try {
    limits = parseLimits(readConventions({ guidelinesDir }));
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  const epics = epicNames(loaded.stories);
  const source = cleanSource({ contexts, relationships }, epics);
  const problems = findProblems(source, { epics, relationshipTypes: limits.relationshipTypes });
  if (problems.length) return { ok: false, errors: problems };

  const documentText = composeContextMap(source);
  const flowchart = /```mermaid\n([\s\S]*?)```/.exec(documentText)[1];
  const parsed = await parseMermaid(flowchart);
  if (!parsed.ok) return { ok: false, errors: [`The flowchart does not parse as Mermaid: ${parsed.message}`] };
  return { ok: true, loaded, source, sourceText: `${JSON.stringify(source, null, 2)}\n`, documentText };
}

const problemsText = (errors) => `Nothing was written. ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n${errors.map((e) => `- ${e}`).join('\n')}`;

// -> { ok: true, text } | { ok: false, errors }. Writes nothing.
export async function checkContextMap(input) {
  const p = await prepare(input);
  if (!p.ok) return p;
  const { contexts, relationships } = p.source;
  return { ok: true, text: `Check passed; nothing was written. The map of ${p.loaded.file} (${contexts.length} contexts, ${relationships.length} relationships) puts every Epic in exactly one context, and its flowchart parses as Mermaid.` };
}

// Writes the map. -> { ok: true, changed, written, base, text } | { ok: false, errors, text }.
export async function writeContextMap(input) {
  const p = await prepare(input);
  if (!p.ok) return { ...p, text: problemsText(p.errors) };
  const { loaded, source, sourceText, documentText } = p;
  const existing = readMapFiles(loaded.dir);
  if (existing.source === sourceText && existing.document === documentText) {
    return { ok: true, changed: false, written: [], base: loaded.base, text: `Nothing changed: diagrams/${loaded.base} already holds exactly this map.` };
  }

  fs.mkdirSync(loaded.dir, { recursive: true });
  // The source last, so a failure never leaves it describing a document that was not written.
  const failures = [writeAtomic(loaded.dir, MAP_DOCUMENT_FILE, documentText), writeAtomic(loaded.dir, MAP_SOURCE_FILE, sourceText)].filter(Boolean);
  if (failures.length) return { ok: false, errors: failures, text: problemsText(failures) };

  const back = readMapFiles(loaded.dir);
  const missing = [back.document === documentText ? null : MAP_DOCUMENT_FILE, back.source === sourceText ? null : MAP_SOURCE_FILE].filter(Boolean);
  if (missing.length) {
    const errors = [`The folder does not hold what was sent after the write: ${missing.join(', ')}.`];
    return { ok: false, errors, text: problemsText(errors) };
  }
  const written = [existing.document === documentText ? null : MAP_DOCUMENT_FILE, existing.source === sourceText ? null : MAP_SOURCE_FILE].filter(Boolean);
  logWrite({ writer: 'write_context_map', store: 'diagrams', file: `${loaded.base}/context-map`, text: documentText + sourceText, extra: { backlog: loaded.base }, dataDir: input.dataDir ?? DATA_DIR });
  return { ok: true, changed: true, written, base: loaded.base, text: `Wrote the context map to diagrams/${loaded.base}/ (${written.join(', ')}).` };
}
