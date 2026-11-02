'use strict';
// Folder work for the project config: init, copy, the folder check and the rules that confine a folder named by the
// browser. Pure Node, no HTTP. Nothing here overwrites, modifies or deletes an existing file or folder
// (the one removal is a half-written copy of a file this call created itself).

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
// The folders of a data directory, relative to it.
const FOLDERS = ['backlogs', 'reviews', 'proposals', 'lexicons', 'lexicon-suggestions', 'diagrams', 'backups', 'logs'];

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
function confineDir(dir, { root = ROOT, env = process.env, home = os.homedir() } = {}) {
  if (typeof dir !== 'string' || !dir.trim()) return { ok: false, reason: 'The folder must not be empty.' };
  if (!path.isAbsolute(dir.trim())) return { ok: false, reason: 'The folder must be an absolute path.' };
  const real = realResolve(dir.trim());
  if (path.parse(real).root === real) return { ok: false, reason: 'A drive root cannot be the data folder.' };
  if (systemFolders(env).some((s) => path.relative(s, real) === '' || (s !== path.parse(s).root && inside(s, real)))) {
    return { ok: false, reason: 'A system folder cannot be the data folder.' };
  }
  if (path.relative(realResolve(home), real) === '') return { ok: false, reason: 'The home folder itself cannot be the data folder; pick a folder inside it.' };
  const realRoot = realResolve(root);
  if (inside(realRoot, real) && !inside(path.join(realRoot, 'planner', 'data'), real)) {
    return { ok: false, reason: 'A folder inside the repository cannot be the data folder, except planner/data.' };
  }
  try {
    if (!fs.statSync(real).isDirectory()) return { ok: false, reason: 'That path is a file, not a folder.' };
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') return { ok: false, reason: `Cannot read that path (${err.message}).` };
  }
  return { ok: true, dir: real };
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// One of: { status: 'refused', reason }, 'has-planner-files' (one of the eight folders, or a CSV file directly under
// backlogs/), 'empty', 'missing'.
function checkFolder(dir, options) {
  const c = confineDir(dir, options);
  if (!c.ok) return { status: 'refused', reason: c.reason };
  if (!isDir(c.dir)) return { status: 'missing', dir: c.dir };
  if (FOLDERS.some((f) => isDir(path.join(c.dir, f)))) return { status: 'has-planner-files', dir: c.dir };
  return { status: 'empty', dir: c.dir };
}

// Creates the data folder if missing and the eight folders in it. Returns { dir, createdDataDir, created, existing }.
function initFolders(dir) {
  const abs = path.resolve(dir);
  const createdDataDir = !fs.existsSync(abs);
  fs.mkdirSync(abs, { recursive: true });
  const created = [];
  const existing = [];
  for (const f of FOLDERS) {
    const p = path.join(abs, f);
    if (fs.existsSync(p)) {
      if (!isDir(p)) throw new Error(`${p}: exists and is not a folder`);
      existing.push(f);
    } else {
      fs.mkdirSync(p);
      created.push(f);
    }
  }
  return { dir: abs, createdDataDir, created, existing };
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

module.exports = { ROOT, FOLDERS, inside, realResolve, confineDir, checkFolder, initFolders, copyData };
