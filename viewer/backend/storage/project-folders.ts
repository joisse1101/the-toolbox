// Folder work for the project config: init, copy, the folder check and the rules that confine a folder named by the
// browser. Pure Node, no HTTP. Nothing here overwrites, modifies or deletes an existing file or folder
// unless the caller asks copyData to overwrite (the one removal is a half-written copy of a file this call created itself).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { writeBacklogFiles } from './backlog-files.ts';
import { codeOf, messageOf } from './errors.ts';
import { startingFiles } from './starting-files.ts';
import { KIND_FILES, PLANS_DIR, listBacklogs, detectOlderLayout, validateBacklogName } from '../../shared/storage/backlog-paths.ts';

// What the confine functions take: the repository root, the environment and the home folder (tests set them).
type ConfineOptions = { root?: string; env?: NodeJS.ProcessEnv; home?: string };
type Confined = { ok: true; dir: string } | { ok: false; reason: string };
type CopyFile = (from: string, to: string, mode?: number) => void;
type ReadFile = (file: string) => Buffer;
type CopyOptions = { overwrite?: boolean; copyFile?: CopyFile; readFile?: ReadFile };
type Refused = { refused: string };
export type CopyResult = {
  copied: string[];
  overwritten: string[];
  skipped: { file: string; reason: string }[];
  failed: { file: string; message: string }[];
  stopped?: { file: string; message: string };
};

export const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');

export function inside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// The real path of `p` with links followed; for a folder that does not exist yet, the real path of its nearest
// existing parent plus the missing names.
export function realResolve(p: string): string {
  const abs = path.resolve(p);
  const rest: string[] = [];
  let cur = abs;
  for (;;) {
    try {
      return path.join(fs.realpathSync.native(cur), ...rest.reverse());
    } catch (err) {
      const up = path.dirname(cur);
      if (up === cur || (codeOf(err) !== 'ENOENT' && codeOf(err) !== 'ENOTDIR')) return abs;
      rest.push(path.basename(cur));
      cur = up;
    }
  }
}

function systemFolders(env: NodeJS.ProcessEnv = process.env): string[] {
  const list = process.platform === 'win32'
    ? [env.SystemRoot, env.ProgramFiles, env['ProgramFiles(x86)'], env.ProgramData]
    : ['/', '/etc', '/usr', '/bin', '/var', '/sys', '/proc'];
  return list.filter((p): p is string => Boolean(p)).map((p) => realResolve(p));
}

// Decides whether the browser may name `dir` as a data folder. Returns { ok: true, dir (real path) } or
// { ok: false, reason }. Absolute paths only; links are resolved before any check.
export function confineDir(dir: unknown, options: ConfineOptions = {}): Confined {
  return confinePath(dir, options, { noun: 'data folder', allowViewerData: true });
}

// The shared rules; `noun` is the word the reasons use, `allowViewerData` the one repository exception.
function confinePath(dir: unknown, { root = ROOT, env = process.env, home = os.homedir() }: ConfineOptions, { noun, allowViewerData }: { noun: string; allowViewerData: boolean }): Confined {
  if (typeof dir !== 'string' || !dir.trim()) return { ok: false, reason: 'The folder must not be empty.' };
  if (!path.isAbsolute(dir.trim())) return { ok: false, reason: 'The folder must be an absolute path.' };
  const real = realResolve(dir.trim());
  if (path.parse(real).root === real) return { ok: false, reason: `A drive root cannot be the ${noun}.` };
  if (systemFolders(env).some((s) => path.relative(s, real) === '' || (s !== path.parse(s).root && inside(s, real)))) {
    return { ok: false, reason: `A system folder cannot be the ${noun}.` };
  }
  if (path.relative(realResolve(home), real) === '') return { ok: false, reason: `The home folder itself cannot be the ${noun}; pick a folder inside it.` };
  const realRoot = realResolve(root);
  if (inside(realRoot, real) && !(allowViewerData && inside(path.join(realRoot, 'viewer', 'data'), real))) {
    return { ok: false, reason: allowViewerData
      ? `A folder inside the repository cannot be the ${noun}, except viewer/data.`
      : `A folder inside the repository cannot be the ${noun}.` };
  }
  try {
    if (!fs.statSync(real).isDirectory()) return { ok: false, reason: 'That path is a file, not a folder.' };
  } catch (err) {
    if (codeOf(err) !== 'ENOENT' && codeOf(err) !== 'ENOTDIR') return { ok: false, reason: `Cannot read that path (${messageOf(err)}).` };
  }
  return { ok: true, dir: real };
}

// Decides whether the browser may name `dir` as a code base. Same rules as confineDir with no viewer/data exception,
// and the folder must exist (it is never created) and must not hold a file named `.plans`. Returns
// { ok: true, dir (real path of the code base), plansDir } or { ok: false, reason }.
export function confineCodeBase(dir: unknown, options: ConfineOptions = {}): { ok: true; dir: string; plansDir: string } | { ok: false; reason: string } {
  const c = confinePath(dir, options, { noun: 'code base', allowViewerData: false });
  if (!c.ok) return c;
  if (!isDir(c.dir)) return { ok: false, reason: 'The code base folder does not exist.' };
  const plansDir = path.join(c.dir, PLANS_DIR);
  try {
    if (!fs.statSync(plansDir).isDirectory()) return { ok: false, reason: `The code base holds a file named ${PLANS_DIR}, not a folder.` };
  } catch (err) {
    if (codeOf(err) !== 'ENOENT' && codeOf(err) !== 'ENOTDIR') return { ok: false, reason: `Cannot read ${PLANS_DIR} (${messageOf(err)}).` };
  }
  return { ok: true, dir: c.dir, plansDir };
}

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// One of: { status: 'refused', reason }, 'has-planner-files' (a backlog folder: a subfolder with user-stories.csv),
// 'older-layout' (no backlog folder, but a folder of the older layout, to migrate), 'empty', 'missing'.
export function checkFolder(dir: unknown, options?: ConfineOptions) {
  const c = confineDir(dir, options);
  if (!c.ok) return { status: 'refused', reason: c.reason };
  return classify(c.dir);
}

function classify(dir: string) {
  if (!isDir(dir)) return { status: 'missing', dir };
  if (listBacklogs(dir).length) return { status: 'has-planner-files', dir };
  if (detectOlderLayout(dir).length) return { status: 'older-layout', dir };
  return { status: 'empty', dir };
}

// The same check for a code base: the answer is about `<codeBase>/.plans` (`missing` when it is not there yet), with
// `codeBase` and `dir` (the .plans folder) in the reply. A refused code base answers { status: 'refused', reason }.
export function checkCodeBase(codeBase: unknown, options?: ConfineOptions) {
  const c = confineCodeBase(codeBase, options);
  if (!c.ok) return { status: 'refused', reason: c.reason };
  return { ...classify(c.plansDir), codeBase: c.dir };
}

// Init for a code base: creates `<codeBase>/.plans` and nothing else; the code base itself must exist. Returns the
// initFolders reply (created / existing lists) or { refused }.
export async function initCodeBase(codeBase: unknown, options?: ConfineOptions) {
  const c = confineCodeBase(codeBase, options);
  if (!c.ok) return { refused: c.reason };
  return initFolders(c.plansDir);
}

// Copy for a code base: copyData from `source` into `<codeBase>/.plans` (overwrites only with the `overwrite` option,
// source untouched). Returns the copyData reply or { refused }.
export function copyToCodeBase(source: string, codeBase: unknown, { confine, ...copyOptions }: CopyOptions & { confine?: ConfineOptions } = {}) {
  const c = confineCodeBase(codeBase, confine);
  if (!c.ok) return { refused: c.reason };
  return copyData(source, c.plansDir, copyOptions);
}

const FIRST_BACKLOG = 'new-backlog';

// Creates the data folder if missing, and a first backlog named `new-backlog` (with its starting files) only when the
// folder holds no backlog. Never touches anything that exists, so a second run creates nothing. Returns
// { dir, createdDataDir, created, existing, createdBacklog }: each of the data folder and the backlog folders is listed as
// created or as existing; `createdBacklog` is the name of the backlog this call made, or null. Async because writing the
// starting files is.
export async function initFolders(dir: string) {
  const abs = path.resolve(dir);
  const createdDataDir = !fs.existsSync(abs);
  fs.mkdirSync(abs, { recursive: true });
  const name = path.basename(abs);
  const existingBacklogs = listBacklogs(abs);
  if (existingBacklogs.length) {
    return { dir: abs, createdDataDir, created: createdDataDir ? [name] : [], existing: createdDataDir ? existingBacklogs : [name, ...existingBacklogs], createdBacklog: null };
  }
  const made = await writeBacklogFiles(abs, FIRST_BACKLOG, startingFiles());
  return {
    dir: abs,
    createdDataDir,
    created: createdDataDir ? [name, made] : [made],
    existing: createdDataDir ? [] : [name],
    createdBacklog: made,
  };
}

// The checks and the walk that copyData and planCopy share, so links, `backups/` and the containment refusals live in
// one place. Returns { src, dst } (real paths) or { refused }.
function resolvePair(source: string, target: string): Refused | { src: string; dst: string; refused?: undefined } {
  const src = realResolve(source);
  const dst = realResolve(target);
  if (!isDir(src)) return { refused: 'The current data folder does not exist.' };
  if (inside(src, dst)) return { refused: 'The target is the current data folder or lies inside it.' };
  if (inside(dst, src)) return { refused: 'The target contains the current data folder.' };
  if (fs.existsSync(dst) && !isDir(dst)) return { refused: 'The target is a file, not a folder.' };
  return { src, dst };
}

// Walks `src` in name order and calls visit(kind, rel, shown) for each folder ('dir', including the root as ''), link
// ('link') and regular file ('file'); a `backups/` folder at any depth is left out, not visited. A truthy return from
// visit stops the walk and is returned.
type Visit = (kind: 'dir' | 'link' | 'file', rel: string, shown: string) => unknown;
function walkSource(src: string, visit: Visit): unknown {
  const walk = (rel: string): unknown => {
    const stop = visit('dir', rel, rel.split(path.sep).join('/'));
    if (stop) return stop;
    for (const name of fs.readdirSync(path.join(src, rel)).sort()) {
      const r = path.join(rel, name);
      const shown = r.split(path.sep).join('/');
      const st = fs.lstatSync(path.join(src, r));
      if (st.isSymbolicLink()) visit('link', r, shown);
      else if (st.isDirectory() && name.toLowerCase() === 'backups') continue; // backups are no longer used: left out, not reported
      else if (st.isDirectory()) { const s = walk(r); if (s) return s; }
      else if (st.isFile()) { const s = visit('file', r, shown); if (s) return s; }
    }
    return null;
  };
  return walk('');
}

// Read-only: the files of `source` that copyData would find already in `target`, as `exists` (paths relative with `/`).
// Creates nothing, not even a missing target (which has no clashes). Returns { exists } or { refused }, with the same
// refusals as copyData.
export function planCopy(source: string, target: string): Refused | { exists: string[] } {
  const pair = resolvePair(source, target);
  if (pair.refused !== undefined) return { refused: pair.refused };
  const exists: string[] = [];
  walkSource(pair.src, (kind, rel, shown) => {
    if (kind !== 'file') return null;
    try {
      fs.lstatSync(path.join(pair.dst, rel));
      exists.push(shown);
    } catch { /* not there: no clash */ }
    return null;
  });
  return { exists };
}

// The same plan for a code base: the target is `<codeBase>/.plans`. Returns { exists } or { refused }.
export function planCopyToCodeBase(source: string, codeBase: unknown, { confine }: { confine?: ConfineOptions } = {}) {
  const c = confineCodeBase(codeBase, confine);
  if (!c.ok) return { refused: c.reason };
  return planCopy(source, c.plansDir);
}

// Copies every file of `source` to the same relative path in `target`. By default an existing file is skipped. With
// `overwrite` a file present in both places is replaced and listed as overwritten; nothing else in the target is removed
// or changed. A link is skipped, a `backups/` folder at any depth is left out (not even listed as skipped), nothing in the
// source changes. Each copied or overwritten file is read back and compared with its source; one that differs is listed in
// `failed` as { file, message } (a bad new copy is removed so a rerun can retry it; a bad overwrite stays, because the
// file it replaced is gone). Returns { copied, overwritten, skipped: [{file, reason}], failed } plus
// `stopped: {file, message}` when a file could not be read or written (the files already copied stay; run again to
// continue), or { refused }. `copyFile` and `readFile` are only for tests.
export function copyData(source: string, target: string, { overwrite = false, copyFile = fs.copyFileSync, readFile = fs.readFileSync }: CopyOptions = {}): Refused | CopyResult {
  const pair = resolvePair(source, target);
  if (pair.refused !== undefined) return { refused: pair.refused };
  const { src, dst } = pair;
  fs.mkdirSync(dst, { recursive: true });
  const copied: string[] = [];
  const overwritten: string[] = [];
  const skipped: { file: string; reason: string }[] = [];
  const failed: { file: string; message: string }[] = [];
  let stopped: { file: string; message: string } | null = null;

  const readsBack = (from: string, to: string): string | null => {
    try {
      if (Buffer.compare(readFile(from), readFile(to)) === 0) return null;
      return 'the copy does not read back the same as the original';
    } catch (err) {
      return `the copy could not be read back: ${messageOf(err)}`;
    }
  };

  walkSource(src, (kind, rel, shown) => {
    if (kind === 'dir') { fs.mkdirSync(path.join(dst, rel), { recursive: true }); return null; }
    if (kind === 'link') { skipped.push({ file: shown, reason: 'link' }); return null; }
    const from = path.join(src, rel);
    const to = path.join(dst, rel);
    let present: fs.Stats | null = null; // lstat of an existing target file
    try { present = fs.lstatSync(to); } catch { /* not there */ }
    if (present && !overwrite) { skipped.push({ file: shown, reason: 'exists' }); return null; }
    if (present && present.isSymbolicLink()) { skipped.push({ file: shown, reason: 'link' }); return null; }
    try {
      copyFile(from, to, present ? 0 : fs.constants.COPYFILE_EXCL);
    } catch (err) {
      if (codeOf(err) === 'EEXIST') { skipped.push({ file: shown, reason: 'exists' }); return null; }
      if (!present) { try { fs.unlinkSync(to); } catch { /* not created */ } }
      stopped = { file: shown, message: messageOf(err) };
      return stopped;
    }
    const bad = readsBack(from, to);
    if (bad) {
      if (!present) fs.unlinkSync(to); // the copy this call just made
      failed.push({ file: shown, message: bad });
    } else (present ? overwritten : copied).push(shown);
    return null;
  });
  const reply: CopyResult = { copied, overwritten, skipped, failed };
  return stopped ? { ...reply, stopped } : reply;
}

// The files of the older layout that belong to a backlog, as [older path, path in the backlog folder] pairs (both relative).
function olderFilesOf(name: string): [string, string][] {
  const inFolder = (kind: keyof typeof KIND_FILES) => KIND_FILES[kind].join('/');
  return [
    [`backlogs/${name}.csv`, inFolder('backlog')],
    [`reviews/${name}.csv`, inFolder('review')],
    [`reviews/${name}.csv.decided`, `${inFolder('review')}.decided`],
    [`proposals/${name}.csv`, inFolder('proposals')],
    [`lexicons/${name}.csv`, inFolder('lexicon')],
    [`lexicon-suggestions/${name}.csv`, inFolder('lexicon-suggestions')],
  ];
}

// Files of the older diagrams/<name>/ folder kept at the backlog folder itself; every other folder there is a slice.
const BACKLOG_LEVEL_DIAGRAM_FILES = ['repo.json', 'context-map.json', 'context-map.md'];

// The regular files under `dir` (relative paths with `/`), skipping any `backups/` folder; links are reported apart.
function filesUnder(dir: string, rel = '', out: { files: string[]; links: string[] } = { files: [], links: [] }) {
  for (const name of fs.readdirSync(path.join(dir, rel)).sort()) {
    const r = rel ? `${rel}/${name}` : name;
    const st = fs.lstatSync(path.join(dir, r));
    if (st.isSymbolicLink()) out.links.push(r);
    else if (st.isDirectory()) { if (name.toLowerCase() !== 'backups') filesUnder(dir, r, out); }
    else if (st.isFile()) out.files.push(r);
  }
  return out;
}

// Copies the data of the older layout in `dataDir` (backlogs/, reviews/, proposals/, lexicons/, lexicon-suggestions/ and
// diagrams/) into one folder per backlog in the same data folder. Never overwrites a file, never changes or removes
// anything in the older layout (the one removal is a copy this call made that did not read back the same), skips any
// `backups/` folder without listing it. Each copied file is read back and compared with its source.
// Returns { copied: [new path], skipped: [{file, reason}], failed: [{file, message}] } (paths relative to `dataDir`),
// or { refused }. `copyFile` and `readFile` are only for tests.
export function migrateOlderLayout(dataDir: string, { copyFile = fs.copyFileSync, readFile = fs.readFileSync }: Omit<CopyOptions, 'overwrite'> = {}): Refused | Pick<CopyResult, 'copied' | 'skipped' | 'failed'> {
  const dir = realResolve(dataDir);
  if (!isDir(dir)) return { refused: 'The data folder does not exist.' };
  const copied: string[] = [];
  const skipped: { file: string; reason: string }[] = [];
  const failed: { file: string; message: string }[] = [];
  const claimed = new Set<string>(); // older paths that went to a backlog; every other file of the older folders is reported

  const copyOne = (from: string, to: string) => {
    const target = path.join(dir, to);
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      copyFile(path.join(dir, from), target, fs.constants.COPYFILE_EXCL);
    } catch (err) {
      if (codeOf(err) === 'EEXIST') return skipped.push({ file: to, reason: 'exists' });
      try { fs.unlinkSync(target); } catch { /* not created */ }
      return failed.push({ file: from, message: messageOf(err) });
    }
    let same = false;
    let message = 'the copy does not read back the same as the original';
    try {
      same = Buffer.compare(readFile(path.join(dir, from)), readFile(target)) === 0;
    } catch (err) {
      message = `the copy could not be read back: ${messageOf(err)}`;
    }
    if (same) return copied.push(to);
    fs.unlinkSync(target); // the copy this call just made
    return failed.push({ file: from, message });
  };

  const backlogsDir = path.join(dir, 'backlogs');
  const names = isDir(backlogsDir) ? fs.readdirSync(backlogsDir).sort() : [];
  for (const entry of names) {
    if (!entry.toLowerCase().endsWith('.csv') || !fs.lstatSync(path.join(backlogsDir, entry)).isFile()) continue;
    let name: string;
    try {
      name = validateBacklogName(entry);
    } catch (err) {
      skipped.push({ file: `backlogs/${entry}`, reason: messageOf(err) });
      claimed.add(`backlogs/${entry}`);
      continue;
    }
    if (name !== entry.slice(0, -4)) { skipped.push({ file: `backlogs/${entry}`, reason: 'not a valid backlog name' }); claimed.add(`backlogs/${entry}`); continue; }
    for (const [from, to] of olderFilesOf(name)) {
      if (!fs.existsSync(path.join(dir, from))) continue;
      claimed.add(from);
      copyOne(from, `${name}/${to}`);
    }
    const diagrams = path.join(dir, 'diagrams', name);
    if (isDir(diagrams) && !fs.lstatSync(diagrams).isSymbolicLink()) {
      const { files, links } = filesUnder(diagrams);
      for (const link of links) { skipped.push({ file: `diagrams/${name}/${link}`, reason: 'link' }); claimed.add(`diagrams/${name}/${link}`); }
      for (const file of files) {
        const from = `diagrams/${name}/${file}`;
        claimed.add(from);
        if (BACKLOG_LEVEL_DIAGRAM_FILES.includes(file)) copyOne(from, `${name}/${file}`);
        else if (file.includes('/')) copyOne(from, `${name}/slices/${file}`);
        else skipped.push({ file: from, reason: 'not in a slice folder' });
      }
    }
  }

  // Whatever is left in the older folders has no backlog: reported, never created.
  for (const folder of detectOlderLayout(dir)) {
    const { files, links } = filesUnder(dir, folder);
    for (const file of [...files, ...links]) {
      if (!claimed.has(file)) skipped.push({ file, reason: links.includes(file) ? 'link' : 'no backlog with this name in backlogs/' });
    }
  }
  return { copied, skipped, failed };
}
