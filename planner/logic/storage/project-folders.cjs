'use strict';
// Folder work for the project config: init, copy, the folder check and the rules that confine a folder named by the
// browser. Pure Node, no HTTP. Nothing here overwrites, modifies or deletes an existing file or folder
// (the one removal is a half-written copy of a file this call created itself).

const fs = require('fs');
const os = require('os');
const path = require('path');

const { writeBacklogFiles } = require('./backlog-files.cjs');
const { KIND_FILES, PLANS_DIR, listBacklogs, detectOlderLayout, validateBacklogName } = require('./backlog-paths.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..');

function inside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// The real path of `p` with links followed; for a folder that does not exist yet, the real path of its nearest
// existing parent plus the missing names.
function realResolve(p) {
  const abs = path.resolve(p);
  const rest = [];
  let cur = abs;
  for (;;) {
    try {
      return path.join(fs.realpathSync.native(cur), ...rest.reverse());
    } catch (err) {
      const up = path.dirname(cur);
      if (up === cur || (err.code !== 'ENOENT' && err.code !== 'ENOTDIR')) return abs;
      rest.push(path.basename(cur));
      cur = up;
    }
  }
}

function systemFolders(env = process.env) {
  const list = process.platform === 'win32'
    ? [env.SystemRoot, env.ProgramFiles, env['ProgramFiles(x86)'], env.ProgramData]
    : ['/', '/etc', '/usr', '/bin', '/var', '/sys', '/proc'];
  return list.filter(Boolean).map((p) => realResolve(p));
}

// Decides whether the browser may name `dir` as a data folder. Returns { ok: true, dir (real path) } or
// { ok: false, reason }. Absolute paths only; links are resolved before any check.
function confineDir(dir, options = {}) {
  return confinePath(dir, options, { noun: 'data folder', allowPlannerData: true });
}

// The shared rules; `noun` is the word the reasons use, `allowPlannerData` the one repository exception.
function confinePath(dir, { root = ROOT, env = process.env, home = os.homedir() }, { noun, allowPlannerData }) {
  if (typeof dir !== 'string' || !dir.trim()) return { ok: false, reason: 'The folder must not be empty.' };
  if (!path.isAbsolute(dir.trim())) return { ok: false, reason: 'The folder must be an absolute path.' };
  const real = realResolve(dir.trim());
  if (path.parse(real).root === real) return { ok: false, reason: `A drive root cannot be the ${noun}.` };
  if (systemFolders(env).some((s) => path.relative(s, real) === '' || (s !== path.parse(s).root && inside(s, real)))) {
    return { ok: false, reason: `A system folder cannot be the ${noun}.` };
  }
  if (path.relative(realResolve(home), real) === '') return { ok: false, reason: `The home folder itself cannot be the ${noun}; pick a folder inside it.` };
  const realRoot = realResolve(root);
  if (inside(realRoot, real) && !(allowPlannerData && inside(path.join(realRoot, 'planner', 'data'), real))) {
    return { ok: false, reason: allowPlannerData
      ? `A folder inside the repository cannot be the ${noun}, except planner/data.`
      : `A folder inside the repository cannot be the ${noun}.` };
  }
  try {
    if (!fs.statSync(real).isDirectory()) return { ok: false, reason: 'That path is a file, not a folder.' };
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') return { ok: false, reason: `Cannot read that path (${err.message}).` };
  }
  return { ok: true, dir: real };
}

// Decides whether the browser may name `dir` as a code base. Same rules as confineDir with no planner/data exception,
// and the folder must exist (it is never created) and must not hold a file named `.plans`. Returns
// { ok: true, dir (real path of the code base), plansDir } or { ok: false, reason }.
function confineCodeBase(dir, options = {}) {
  const c = confinePath(dir, options, { noun: 'code base', allowPlannerData: false });
  if (!c.ok) return c;
  if (!isDir(c.dir)) return { ok: false, reason: 'The code base folder does not exist.' };
  const plansDir = path.join(c.dir, PLANS_DIR);
  try {
    if (!fs.statSync(plansDir).isDirectory()) return { ok: false, reason: `The code base holds a file named ${PLANS_DIR}, not a folder.` };
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') return { ok: false, reason: `Cannot read ${PLANS_DIR} (${err.message}).` };
  }
  return { ok: true, dir: c.dir, plansDir };
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// One of: { status: 'refused', reason }, 'has-planner-files' (a backlog folder: a subfolder with user-stories.csv),
// 'older-layout' (no backlog folder, but a folder of the older layout, to migrate), 'empty', 'missing'.
function checkFolder(dir, options) {
  const c = confineDir(dir, options);
  if (!c.ok) return { status: 'refused', reason: c.reason };
  return classify(c.dir);
}

function classify(dir) {
  if (!isDir(dir)) return { status: 'missing', dir };
  if (listBacklogs(dir).length) return { status: 'has-planner-files', dir };
  if (detectOlderLayout(dir).length) return { status: 'older-layout', dir };
  return { status: 'empty', dir };
}

// The same check for a code base: the answer is about `<codeBase>/.plans` (`missing` when it is not there yet), with
// `codeBase` and `dir` (the .plans folder) in the reply. A refused code base answers { status: 'refused', reason }.
function checkCodeBase(codeBase, options) {
  const c = confineCodeBase(codeBase, options);
  if (!c.ok) return { status: 'refused', reason: c.reason };
  return { ...classify(c.plansDir), codeBase: c.dir };
}

// Init for a code base: creates `<codeBase>/.plans` and nothing else; the code base itself must exist. Returns the
// initFolders reply (created / existing lists) or { refused }.
async function initCodeBase(codeBase, options) {
  const c = confineCodeBase(codeBase, options);
  if (!c.ok) return { refused: c.reason };
  return initFolders(c.plansDir);
}

// Copy for a code base: copyData from `source` into `<codeBase>/.plans` (never overwrites, source untouched). Returns
// the copyData reply or { refused }.
function copyToCodeBase(source, codeBase, { confine, ...copyOptions } = {}) {
  const c = confineCodeBase(codeBase, confine);
  if (!c.ok) return { refused: c.reason };
  return copyData(source, c.plansDir, copyOptions);
}

const FIRST_BACKLOG = 'new-backlog';

// Creates the data folder if missing, and a first backlog named `new-backlog` (with its starting files) only when the
// folder holds no backlog. Never touches anything that exists, so a second run creates nothing. Returns
// { dir, createdDataDir, created, existing, createdBacklog }: each of the data folder and the backlog folders is listed as
// created or as existing; `createdBacklog` is the name of the backlog this call made, or null. Async because the starting
// files are an ES module, loaded with a dynamic import.
async function initFolders(dir) {
  const abs = path.resolve(dir);
  const createdDataDir = !fs.existsSync(abs);
  fs.mkdirSync(abs, { recursive: true });
  const name = path.basename(abs);
  const existingBacklogs = listBacklogs(abs);
  if (existingBacklogs.length) {
    return { dir: abs, createdDataDir, created: createdDataDir ? [name] : [], existing: createdDataDir ? existingBacklogs : [name, ...existingBacklogs], createdBacklog: null };
  }
  const { startingFiles } = await import('../backlog/starting-files.js');
  const made = await writeBacklogFiles(abs, FIRST_BACKLOG, startingFiles());
  return {
    dir: abs,
    createdDataDir,
    created: createdDataDir ? [name, made] : [made],
    existing: createdDataDir ? [] : [name],
    createdBacklog: made,
  };
}

// Copies every file of `source` to the same relative path in `target`. An existing file is skipped, a link is
// skipped, a `backups/` folder at any depth is left out (not even listed as skipped), nothing in the source changes. Returns { copied, skipped: [{file, reason}] } plus `stopped: {file, message}`
// when a file could not be read or written (the files already copied stay; run again to continue), or { refused }.
// `copyFile` is only for tests.
function copyData(source, target, { copyFile = fs.copyFileSync } = {}) {
  const src = realResolve(source);
  const dst = realResolve(target);
  if (!isDir(src)) return { refused: 'The current data folder does not exist.' };
  if (inside(src, dst)) return { refused: 'The target is the current data folder or lies inside it.' };
  if (inside(dst, src)) return { refused: 'The target contains the current data folder.' };
  if (fs.existsSync(dst) && !isDir(dst)) return { refused: 'The target is a file, not a folder.' };
  fs.mkdirSync(dst, { recursive: true });
  const copied = [];
  const skipped = [];
  const walk = (rel) => {
    fs.mkdirSync(path.join(dst, rel), { recursive: true });
    for (const name of fs.readdirSync(path.join(src, rel)).sort()) {
      const r = path.join(rel, name);
      const shown = r.split(path.sep).join('/');
      const st = fs.lstatSync(path.join(src, r));
      if (st.isSymbolicLink()) skipped.push({ file: shown, reason: 'link' });
      else if (st.isDirectory() && name.toLowerCase() === 'backups') continue; // backups are no longer used: left out, not reported
      else if (st.isDirectory()) { const stop = walk(r); if (stop) return stop; }
      else if (st.isFile()) {
        const to = path.join(dst, r);
        try {
          copyFile(path.join(src, r), to, fs.constants.COPYFILE_EXCL);
          copied.push(shown);
        } catch (err) {
          if (err.code === 'EEXIST') { skipped.push({ file: shown, reason: 'exists' }); continue; }
          try { fs.unlinkSync(to); } catch { /* not created */ }
          return { file: shown, message: err.message };
        }
      }
    }
    return null;
  };
  const stopped = walk('');
  return stopped ? { copied, skipped, stopped } : { copied, skipped };
}

// The files of the older layout that belong to a backlog, as [older path, path in the backlog folder] pairs (both relative).
function olderFilesOf(name) {
  const inFolder = (kind) => KIND_FILES[kind].join('/');
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
function filesUnder(dir, rel = '', out = { files: [], links: [] }) {
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
function migrateOlderLayout(dataDir, { copyFile = fs.copyFileSync, readFile = fs.readFileSync } = {}) {
  const dir = realResolve(dataDir);
  if (!isDir(dir)) return { refused: 'The data folder does not exist.' };
  const copied = [];
  const skipped = [];
  const failed = [];
  const claimed = new Set(); // older paths that went to a backlog; every other file of the older folders is reported

  const copyOne = (from, to) => {
    const target = path.join(dir, to);
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      copyFile(path.join(dir, from), target, fs.constants.COPYFILE_EXCL);
    } catch (err) {
      if (err.code === 'EEXIST') return skipped.push({ file: to, reason: 'exists' });
      try { fs.unlinkSync(target); } catch { /* not created */ }
      return failed.push({ file: from, message: err.message });
    }
    let same = false;
    let message = 'the copy does not read back the same as the original';
    try {
      same = Buffer.compare(readFile(path.join(dir, from)), readFile(target)) === 0;
    } catch (err) {
      message = `the copy could not be read back: ${err.message}`;
    }
    if (same) return copied.push(to);
    fs.unlinkSync(target); // the copy this call just made
    return failed.push({ file: from, message });
  };

  const backlogsDir = path.join(dir, 'backlogs');
  const names = isDir(backlogsDir) ? fs.readdirSync(backlogsDir).sort() : [];
  for (const entry of names) {
    if (!entry.toLowerCase().endsWith('.csv') || !fs.lstatSync(path.join(backlogsDir, entry)).isFile()) continue;
    let name;
    try {
      name = validateBacklogName(entry);
    } catch (err) {
      skipped.push({ file: `backlogs/${entry}`, reason: err.message });
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

module.exports = {
  ROOT, inside, realResolve, confineDir, confineCodeBase, checkFolder, checkCodeBase, initFolders, initCodeBase,
  copyData, copyToCodeBase, migrateOlderLayout,
};
