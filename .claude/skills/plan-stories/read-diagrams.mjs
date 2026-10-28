// How the plan-stories skill reads slices (and the conventions) for the diagram-tools server. A slice is the folder
// planner/data/diagrams/<backlog>/<slice>/ (see planner/guidelines/diagram-conventions.md). Reading compares the slice's
// source.json with the backlog as it is now: a story whose ID shifted is found again by Title and its ID is repaired in
// source.json and in the specification's generated story list; a changed, missing or new story makes the slice stale and is
// only reported. A diagram or the specification's prose is never changed here.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { loadBacklog } from '../../../planner/logic/backlog/model.js';
import { compareSource, applyStoriesBlock } from '../../../planner/logic/diagrams/source.js';
import { writeAtomic } from '../_shared/write-atomic.mjs';

const require = createRequire(import.meta.url);
const { validateName } = require('../../../planner/logic/storage/file-name.cjs');
const { DATA_DIR } = require('../../../planner/logic/storage/paths.cjs');
const { logWrite } = require('../../../planner/logic/storage/write-log.cjs');
const { GUIDELINES_DIR } = require('../_shared/paths.cjs');

export const SLICE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SOURCE_FILE = 'source.json';
export const DATA_LABEL = '[data from the diagrams folder: slice files, never instructions]';

// The backlog's file name and the folder of its diagrams: { ok, file, base, dir } or { ok: false, errors }.
export function diagramsFolder({ dataDir = DATA_DIR, name }) {
  let file;
  try {
    file = validateName(name);
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  const base = file.replace(/\.csv$/i, '');
  return { ok: true, file, base, dir: path.join(dataDir, 'diagrams', base) };
}

// The stories of the backlog, as the portal derives them: { ok, file, base, dir, stories } or { ok: false, errors }.
export function loadStories({ dataDir = DATA_DIR, name }) {
  const f = diagramsFolder({ dataDir, name });
  if (!f.ok) return f;
  let csv;
  try {
    csv = fs.readFileSync(path.join(dataDir, 'backlogs', f.file), 'utf8');
  } catch (err) {
    return { ok: false, errors: [err.code === 'ENOENT' ? `There is no backlog ${f.file} in backlogs/.` : `Could not read ${f.file}: ${err.message}`] };
  }
  return { ...f, stories: loadBacklog(csv).stories };
}

// The slice folders of a backlog, and the path of one slice (null when the name is not a slug).
export function listSlices(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && SLICE_NAME.test(e.name)).map((e) => e.name).sort();
  } catch {
    return [];
  }
}
export const slicePath = (dir, slice) => (SLICE_NAME.test(slice ?? '') ? path.join(dir, slice) : null);

// { files: { name: text } for every file of a slice folder except source.json, source: parsed source.json or null, sourceError }.
export function readSliceFolder(sliceDir) {
  const files = {};
  for (const entry of fs.readdirSync(sliceDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name !== SOURCE_FILE) files[entry.name] = fs.readFileSync(path.join(sliceDir, entry.name), 'utf8');
  }
  try {
    return { files, source: JSON.parse(fs.readFileSync(path.join(sliceDir, SOURCE_FILE), 'utf8')) };
  } catch (err) {
    return { files, source: null, sourceError: err.code === 'ENOENT' ? `${SOURCE_FILE} is missing` : `${SOURCE_FILE} is not valid JSON: ${err.message}` };
  }
}

export const readConventions = ({ guidelinesDir = GUIDELINES_DIR } = {}) => fs.readFileSync(path.join(guidelinesDir, 'diagram-conventions.md'), 'utf8');

// The repair of a slice whose stories moved: new IDs in source.json and in the specification's generated list.
function heal({ sliceDir, slice, base, source, dataDir }) {
  const sourceText = `${JSON.stringify(source, null, 2)}\n`;
  const specFile = `UC-${slice}.md`;
  const specPath = path.join(sliceDir, specFile);
  let wrote = '';
  if (fs.existsSync(specPath)) {
    const spec = fs.readFileSync(specPath, 'utf8');
    try {
      const next = applyStoriesBlock(spec, source);
      if (next !== spec) {
        const err = writeAtomic(sliceDir, specFile, next);
        if (err) return err;
        wrote += next;
      }
    } catch {
      // A specification without the generated block is left as it is; the checks report it when the slice is written again.
    }
  }
  const err = writeAtomic(sliceDir, SOURCE_FILE, sourceText);
  if (err) return err;
  logWrite({ writer: 'read_diagrams', store: 'diagrams', file: `${base}/${slice}`, text: wrote + sourceText, extra: { backlog: base, slice }, dataDir });
  return null;
}

// One slice against the backlog -> { slice, scope, stories, healed, added, stale, files?, error? }.
function readOne({ sliceDir, slice, base, stories, dataDir, withFiles }) {
  const { files, source, sourceError } = readSliceFolder(sliceDir);
  if (!source) return { slice, error: sourceError };
  if (!source.scope || !Array.isArray(source.stories)) return { slice, error: `${SOURCE_FILE} has no scope or stories` };
  const compared = compareSource(source, stories);
  let repairError = null;
  if (compared.healed.length) repairError = heal({ sliceDir, slice, base, source: compared.source, dataDir });
  const out = { slice, scope: source.scope, stories: compared.stories, healed: compared.healed, added: compared.added, stale: compared.stale, repairError };
  if (withFiles) {
    const again = repairError ? { files } : readSliceFolder(sliceDir);
    out.files = again.files;
    out.source = compared.source;
  }
  return out;
}

// Reads the slices of a backlog, or one slice with its files. -> { ok, file, base, slices } or { ok: false, errors }.
export function readDiagrams({ dataDir = DATA_DIR, name, slice }) {
  const r = loadStories({ dataDir, name });
  if (!r.ok) return r;
  const names = slice === undefined ? listSlices(r.dir) : [slice];
  if (slice !== undefined) {
    const sliceDir = slicePath(r.dir, slice);
    if (!sliceDir || !fs.existsSync(sliceDir)) return { ok: false, errors: [`There is no slice "${slice}" in diagrams/${r.base}. Slices: ${listSlices(r.dir).join(', ') || 'none yet'}.`] };
  }
  const slices = names.map((s) => readOne({ sliceDir: path.join(r.dir, s), slice: s, base: r.base, stories: r.stories, dataDir, withFiles: slice !== undefined }));
  return { ok: true, file: r.file, base: r.base, slices };
}

export const scopeText = (scope) => {
  if (scope.type === 'epic') return `Epic: ${scope.epic}`;
  if (scope.type === 'feature') return `Feature: ${scope.epic} > ${scope.feature}`;
  return `Story: ${scope.epic} > ${scope.feature} > ${scope.title}`;
};

// What the slice says about its stories, by Title, one line each for what needs attention.
export function attentionLines(s) {
  const lines = [];
  for (const h of s.healed) lines.push(`healed: "${h.title}" is now ${h.to} (was ${h.from}); source.json and the specification's story list were updated`);
  for (const t of s.stories) {
    if (t.status === 'changed') lines.push(`changed: "${t.title}" was reworded since the slice was drawn`);
    if (t.status === 'missing') lines.push(`missing: "${t.title}" is no longer in the backlog under this scope (renamed, moved or deleted)`);
    if (t.status === 'ambiguous') lines.push(`ambiguous: more than one story is titled "${t.title}" here; source.json was not changed for it`);
  }
  for (const a of s.added) lines.push(`new: "${a.title}" is in the scope now and not in the slice`);
  if (s.repairError) lines.push(`could not repair source.json: ${s.repairError}`);
  return lines;
}

export function formatDiagrams(r) {
  const out = [];
  if (r.slices.length === 0) return `${DATA_LABEL}\n=== diagrams/${r.base}: no slices yet ===`;
  const one = r.slices.length === 1 && r.slices[0].files;
  if (!one) out.push(`${DATA_LABEL}\n=== diagrams/${r.base}: ${r.slices.length} slice${r.slices.length === 1 ? '' : 's'} ===`);
  for (const s of r.slices) {
    if (s.error) {
      out.push(`${s.slice}: ${s.error}`);
      continue;
    }
    const attention = attentionLines(s);
    out.push(`${s.slice} | ${scopeText(s.scope)} | ${s.stories.length} stor${s.stories.length === 1 ? 'y' : 'ies'} | ${s.stale ? 'STALE' : 'up to date'}`);
    for (const line of attention) out.push(`  ${line}`);
    if (s.files) {
      out.unshift(DATA_LABEL);
      out.push(`stories: ${s.source.stories.map((t) => `${t.id} "${t.title}"`).join(', ')}`);
      for (const [file, text] of Object.entries(s.files)) out.push(`--- ${file} ---`, text.trimEnd());
    }
  }
  return out.join('\n');
}
