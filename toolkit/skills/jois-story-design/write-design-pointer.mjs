// Records where a design canvas lives: the only thing the jois-story-design skill writes into the backlog. Usage, one entry as
// JSON on stdin ({ "scope": { type, epic, feature?, title? }, "url": "<claude.ai artifact link>" }):
//   node <skill folder>/write-design-pointer.mjs <backlog name> [--check]
// It sets one scope entry of <data folder>/<backlog>/designs.json = { "designs": [ { "scope", "url" } ] }. The entry holds only the scope
// and the link: no design content goes in the repo. The same scope with the same link is left as it is (reported as unchanged); the
// same scope with another link is refused, with both links named, and nothing is written. --check runs the same preparation and writes
// nothing. The write is atomic and the file is read again afterwards. The backlog folder must already exist. The data folder is the
// .plans folder in the current folder (see lib/skill-support/resolve-data-dir.mjs).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describeParseError, writeAtomic } from './lib/skill-support/write-atomic.mjs';
import { dataDirOrThrow } from './lib/skill-support/resolve-data-dir.mjs';
import { backlogDir } from './lib/storage/backlog-paths.mjs';
import { shown } from './lib/skill-support/paths.mjs';

export const DESIGNS_FILE = 'designs.json';
const ARTIFACT_URL = /^https:\/\/claude\.ai\/(?:code\/)?artifact\/[A-Za-z0-9_-]+$/;
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim() !== '';

// The scope fields each type holds, in order.
const SCOPE_FIELDS = { epic: ['epic'], feature: ['epic', 'feature'], story: ['epic', 'feature', 'title'] };

// -> { scope } or { error } naming the field at fault.
function checkScope(value) {
  if (!isRecord(value)) return { error: 'scope must be an object' };
  const fields = SCOPE_FIELDS[value.type];
  if (!fields) return { error: 'scope.type must be "epic", "feature" or "story"' };
  const scope = { type: value.type };
  for (const f of fields) {
    if (!isText(value[f])) return { error: `scope.${f} must be a non-empty string` };
    scope[f] = value[f];
  }
  const extra = Object.keys(value).filter((k) => k !== 'type' && !fields.includes(k));
  if (extra.length) return { error: `scope.${extra[0]} is not a field of a ${value.type} scope` };
  return { scope };
}

const sameScope = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const scopeText = (s) => (s.type === 'epic' ? `Epic: ${s.epic}` : s.type === 'feature' ? `Feature: ${s.epic} > ${s.feature}` : `Story: ${s.epic} > ${s.feature} > ${s.title}`);

// Reads the request and designs.json. -> { ok: true, dir, file, designs, entry, action: 'add' | 'unchanged' } or { ok: false, errors }.
function prepare({ dataDir, name, input }) {
  let dir;
  try {
    dir = backlogDir(dataDir, name);
  } catch (err) {
    return { ok: false, errors: [err.message] };
  }
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return { ok: false, errors: [`There is no backlog ${path.basename(dir)}: ${shown(dataDir, dir)} was not found.`] };
  let request;
  try {
    request = JSON.parse(input);
  } catch (err) {
    return { ok: false, errors: [describeParseError(err, input, 'design pointer')] };
  }
  if (!isRecord(request)) return { ok: false, errors: ['Send one JSON object { "scope", "url" }.'] };
  const errors = [];
  const extra = Object.keys(request).filter((k) => k !== 'scope' && k !== 'url');
  if (extra.length) errors.push(`${extra.join(', ')} ${extra.length === 1 ? 'is' : 'are'} not allowed: the entry holds only "scope" and "url", and no design content goes in the repo.`);
  const checked = checkScope(request.scope);
  if (checked.error) errors.push(checked.error);
  if (!isText(request.url) || !ARTIFACT_URL.test(request.url)) errors.push('url must be a claude.ai artifact link: https://claude.ai/artifact/<id> or https://claude.ai/code/artifact/<id>, with no "#" fragment and nothing after the id.');
  if (errors.length) return { ok: false, errors };
  const entry = { scope: checked.scope, url: request.url };

  const file = path.join(dir, DESIGNS_FILE);
  let designs = [];
  if (fs.existsSync(file)) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      return { ok: false, errors: [`${shown(dataDir, file)} is not valid JSON: ${err.message}. Fix or remove it first.`] };
    }
    if (!isRecord(parsed) || !Array.isArray(parsed.designs)) return { ok: false, errors: [`${shown(dataDir, file)} must hold { "designs": [ ... ] }. Fix or remove it first.`] };
    designs = parsed.designs;
  }
  const held = designs.find((d) => isRecord(d) && sameScope(d.scope, entry.scope));
  if (held && held.url !== entry.url) {
    return { ok: false, errors: [`${scopeText(entry.scope)} already has a canvas: ${held.url}. Refusing a second one (${entry.url}). Keep the existing link, or remove its entry from ${shown(dataDir, file)} by hand first.`] };
  }
  return { ok: true, dir, file, designs, entry, action: held ? 'unchanged' : 'add' };
}

const wouldText = (p) => (p.action === 'unchanged' ? `${scopeText(p.entry.scope)} already points at ${p.entry.url}; unchanged` : `would add ${scopeText(p.entry.scope)} -> ${p.entry.url}`);

// Same input and problems as writeDesignPointer; no file is changed. -> { ok: true, action, text } | { ok: false, errors }.
export function checkDesignPointer({ dataDir = dataDirOrThrow(), name, input }) {
  const p = prepare({ dataDir, name, input });
  if (!p.ok) return p;
  return { ok: true, changed: false, action: p.action, text: `Check passed; nothing was written. ${wouldText(p)}.` };
}

// Sets the entry. -> { ok: true, changed, action, text } | { ok: false, errors }.
export function writeDesignPointer({ dataDir = dataDirOrThrow(), name, input }) {
  const p = prepare({ dataDir, name, input });
  if (!p.ok) return p;
  if (p.action === 'unchanged') return { ok: true, changed: false, action: 'unchanged', text: `Unchanged: ${scopeText(p.entry.scope)} already points at ${p.entry.url} in ${DESIGNS_FILE}.` };
  const expected = { designs: [...p.designs, p.entry] };
  const failure = writeAtomic(p.dir, DESIGNS_FILE, `${JSON.stringify(expected, null, 2)}\n`);
  if (failure) return { ok: false, errors: [failure] };
  let back;
  try {
    back = JSON.parse(fs.readFileSync(p.file, 'utf8'));
  } catch {
    back = null;
  }
  if (JSON.stringify(back) !== JSON.stringify(expected)) return { ok: false, errors: [`${DESIGNS_FILE} does not hold the entry after the write. Check the file before you go on.`] };
  return { ok: true, changed: true, action: 'add', text: `Wrote ${DESIGNS_FILE}: added ${scopeText(p.entry.scope)} -> ${p.entry.url}. Read back: the file holds exactly that entry.` };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const check = process.argv[3] === '--check';
  if (process.argv.length !== (check ? 4 : 3)) {
    console.error('Usage: node write-design-pointer.mjs <backlog name> [--check]  (JSON { scope, url } on stdin)');
    process.exit(2);
  }
  let result;
  try {
    result = (check ? checkDesignPointer : writeDesignPointer)({ dataDir: dataDirOrThrow(), name: process.argv[2], input: fs.readFileSync(0, 'utf8') });
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
