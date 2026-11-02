'use strict';
// Local server for the team-lead tools: the built app from dist/ plus a CSV file API
// restricted to the folders registered in STORES. Node built-ins only.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { HttpError, validateName } = require('../../logic/storage/file-name.cjs');
// The config is read when paths.cjs loads. Run as the server, a bad config ends the process with the message that names the key.
let paths;
try {
  paths = require('../../logic/storage/paths.cjs');
} catch (err) {
  if (require.main !== module) throw err;
  console.error(`Cannot start: ${err.message}`);
  process.exit(1);
}
const { getDataDir, setDataDir, legacyDataHint } = paths;
const { backupFolderName, isBackupFolderName, backupFiles } = require('./backup.cjs');
const { logWrite } = require('../../logic/storage/write-log.cjs');
const { loadConfig, saveConfig, configPath, confineDir, checkFolder, initFolders, copyData } = require('../../logic/storage/project-config.cjs');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = path.join(__dirname, '..', 'dist'); // built by `npm run build`
const MAX_BODY = 10 * 1024 * 1024;

// Allow-list of data folders, built from the data folder being served. Adding a tool's data folder is one line.
// BACKUPS_DIR is not a store: only the backup routes reach it. Both are rebuilt by switchTo().
function buildStores(dataDir) {
  return {
    'backlogs': path.join(dataDir, 'backlogs'),
    reviews: path.join(dataDir, 'reviews'), // review suggestions, written by the review-backlog skill's script
    proposals: path.join(dataDir, 'proposals'), // proposed stories awaiting acceptance, one file per backlog
    lexicons: path.join(dataDir, 'lexicons'), // defined terms, one file per backlog
    'lexicon-suggestions': path.join(dataDir, 'lexicon-suggestions'), // suggested term renames and deletes, one file per backlog
  };
}
let STORES = buildStores(getDataDir());
let BACKUPS_DIR = path.join(getDataDir(), 'backups');

// Number of requests that write (file save, create, rename, backup, init, copy) and have not finished.
// A switch of data folder is refused while it is not zero.
let busy = 0;

// Points the server at `dir`. Synchronous, so no request sees a half-switched server.
function switchTo(dir) {
  const next = setDataDir(dir);
  STORES = buildStores(next);
  BACKUPS_DIR = path.join(next, 'backups');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Resolves a validated name inside a store folder; defends against anything escaping it.
function resolveInStore(folder, name) {
  const full = path.resolve(folder, name);
  if (path.dirname(full) !== path.resolve(folder)) {
    throw new HttpError(400, 'File name is not allowed', 'invalid-name');
  }
  return full;
}

// ---------- helpers ----------

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const data = type.startsWith('application/json') ? JSON.stringify(body) : body;
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const text = await readBody(req);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Body must be JSON');
  }
}

function mapFsError(err, name) {
  if (err instanceof HttpError) return err;
  if (err.code === 'ENOENT') return new HttpError(404, `${name} was not found`, 'not-found');
  if (['EBUSY', 'EPERM', 'EACCES'].includes(err.code)) {
    return new HttpError(423, `${name} is locked or not writable (is it open in Excel?)`, 'locked');
  }
  if (err.code === 'EEXIST') return new HttpError(409, `${name} already exists`, 'exists');
  return new HttpError(500, err.message || 'Server error');
}

function numbered(name, n) {
  return n === 1 ? name : name.replace(/\.csv$/i, `-${n}.csv`);
}

// ---------- file operations ----------

async function listFiles(folder) {
  let entries;
  try {
    entries = await fs.promises.readdir(folder, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  return entries
    .filter((e) => e.isFile() && /\.csv$/i.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
}

async function createFile(folder, requested, content) {
  const wanted = validateName(requested);
  await fs.promises.mkdir(folder, { recursive: true });
  for (let n = 1; n < 1000; n++) {
    const name = numbered(wanted, n);
    try {
      const fh = await fs.promises.open(resolveInStore(folder, name), 'wx');
      try {
        await fh.writeFile(content, 'utf8');
      } finally {
        await fh.close();
      }
      return name;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
  throw new HttpError(409, 'Could not find a free file name', 'exists');
}

async function renameFile(folder, from, toRaw) {
  const src = resolveInStore(folder, validateName(from));
  const toName = validateName(toRaw);
  const dst = resolveInStore(folder, toName);
  if (path.basename(src) === toName) return toName;
  try {
    await fs.promises.access(src);
  } catch {
    throw new HttpError(404, `${path.basename(src)} was not found`, 'not-found');
  }
  // Case-only rename targets the same file on Windows; otherwise refuse to clobber.
  if (src.toLowerCase() !== dst.toLowerCase()) {
    try {
      await fs.promises.access(dst);
      throw new HttpError(409, `${toName} already exists`, 'exists');
    } catch (err) {
      if (err instanceof HttpError) throw err;
    }
  }
  await fs.promises.rename(src, dst);
  return toName;
}

function openFolder(folder) {
  // Isolated so an `open` / `xdg-open` branch is trivial later. Arguments are an array: no shell.
  const child = spawn('explorer.exe', [folder], { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
}

// ---------- folder dialog ----------

// A browser cannot return a folder's full path, so the server opens the system folder dialog (Windows only).
// The start folder travels in an environment variable, never inside the script text.
const PICK_SCRIPT = [
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
  'Add-Type -AssemblyName System.Windows.Forms',
  '$owner = New-Object System.Windows.Forms.Form',
  '$owner.TopMost = $true',
  '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
  '$dialog.SelectedPath = $env:PLANNER_PICK_START',
  "if ($dialog.ShowDialog($owner) -eq 'OK') { [Console]::Out.Write($dialog.SelectedPath) }",
].join('; ');

// Resolves to the chosen folder, or null when the dialog is closed without a choice; rejects when it cannot open.
// One replaceable function (see setFolderDialog) so tests never open a real window.
let folderDialog = function windowsFolderDialog(startDir) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      reject(new Error('The folder dialog is only available on Windows.'));
      return;
    }
    const args = ['-NoProfile', '-NonInteractive', '-STA', '-Command', PICK_SCRIPT];
    const child = spawn('powershell.exe', args, { env: { ...process.env, PLANNER_PICK_START: startDir }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.setEncoding('utf8').on('data', (d) => { out += d; });
    child.stderr.setEncoding('utf8').on('data', (d) => { err += d; });
    child.on('error', (e) => reject(new Error(`Could not open the folder dialog: ${e.message}`)));
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`Could not open the folder dialog: ${err.trim() || `PowerShell exited with ${code}`}`));
      else resolve(out.trim() || null);
    });
  });
};

function setFolderDialog(fn) {
  folderDialog = fn;
}

// ---------- backups ----------

const CURRENT = 'current';

// Colors are set here so the diff does not depend on the user's git config.
const GIT_COLORS = {
  'color.diff.meta': 'bold',
  'color.diff.frag': 'magenta',
  'color.diff.old': 'red',
  'color.diff.new': 'green',
  'color.diff.oldMoved': 'blue',
  'color.diff.newMoved': 'cyan',
  'color.diff.oldMovedAlternative': 'blue',
  'color.diff.newMovedAlternative': 'cyan',
  'color.diff.oldMovedDimmed': 'blue',
  'color.diff.newMovedDimmed': 'cyan',
  'color.diff.oldMovedAlternativeDimmed': 'blue',
  'color.diff.newMovedAlternativeDimmed': 'cyan',
};

let flattenModule; // planner/portal/server/flatten.js is ESM; load it once, from this CommonJS file
function loadFlatten() {
  flattenModule = flattenModule || import('./flatten.js');
  return flattenModule;
}

async function fileExists(file) {
  try {
    await fs.promises.access(file);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

// Newest first; a numbered folder (-2) is newer than the plain one of the same second.
function compareFolders(a, b) {
  const split = (folder) => {
    const [, base, n] = /^(.{17})(?:-(\d+))?$/.exec(folder);
    return { base, n: Number(n || 1) };
  };
  const [x, y] = [split(a), split(b)];
  if (x.base !== y.base) return x.base < y.base ? 1 : -1;
  return y.n - x.n;
}

// Backups made before the store was renamed hold the backlog under `user-stories`; they are still read.
const LEGACY_BACKUP_DIRS = { backlogs: 'user-stories' };
async function backupFile(name, folder, store) {
  const file = path.join(BACKUPS_DIR, name, folder, store, name);
  const legacy = LEGACY_BACKUP_DIRS[store];
  if (legacy && !(await fileExists(file))) return path.join(BACKUPS_DIR, name, folder, legacy, name);
  return file;
}

async function createBackup(name) {
  const source = (store) => resolveInStore(STORES[store], name);
  if (!(await fileExists(source('backlogs')))) {
    throw new HttpError(404, `${name} was not found`, 'not-found');
  }
  const parent = path.join(BACKUPS_DIR, name);
  await fs.promises.mkdir(parent, { recursive: true });
  const base = backupFolderName(new Date());
  let folder;
  let target;
  for (let n = 1; n < 1000 && !target; n++) {
    folder = n === 1 ? base : `${base}-${n}`;
    try {
      await fs.promises.mkdir(path.join(parent, folder)); // not recursive: EEXIST means the name is taken
      target = path.join(parent, folder);
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
  if (!target) throw new HttpError(409, 'Could not find a free backup folder', 'exists');

  const copied = [];
  try {
    for (const { store } of backupFiles(name)) {
      await fs.promises.mkdir(path.join(target, store));
      try {
        await fs.promises.copyFile(source(store), path.join(target, store, name), fs.constants.COPYFILE_EXCL);
        copied.push(`${store}/${name}`);
      } catch (err) {
        if (err.code === 'ENOENT' && store !== 'backlogs') {
          await fs.promises.rmdir(path.join(target, store)); // the review or proposals file does not exist yet
          continue;
        }
        throw mapFsError(err, `${store}/${name}`);
      }
    }
  } catch (err) {
    await fs.promises.rm(target, { recursive: true, force: true }); // never leave a partial backup
    throw err;
  }
  return { folder, files: copied };
}

async function listBackups(name) {
  let entries;
  try {
    entries = await fs.promises.readdir(path.join(BACKUPS_DIR, name), { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const folders = entries.filter((e) => e.isDirectory() && isBackupFolderName(e.name)).map((e) => e.name);
  folders.sort(compareFolders);
  return Promise.all(
    folders.map(async (folder) => {
      const files = [];
      for (const { store } of backupFiles(name)) {
        if (await fileExists(await backupFile(name, folder, store))) files.push(`${store}/${name}`);
      }
      return { folder, files };
    }),
  );
}

// A state is a backup folder name that exists, or `current`. Anything else is rejected before a path is built.
async function checkState(name, state) {
  if (state === CURRENT) return;
  if (!isBackupFolderName(state)) throw new HttpError(400, 'Not a backup name', 'invalid-name');
  let stat;
  try {
    stat = await fs.promises.stat(path.join(BACKUPS_DIR, name, state));
  } catch (err) {
    throw mapFsError(err, `Backup ${state}`);
  }
  if (!stat.isDirectory()) throw new HttpError(404, `Backup ${state} was not found`, 'not-found');
}

// The flattened text of each of the backlog's files in one state; null where the file does not exist.
async function flattenedState(name, state, flattenCsv) {
  const result = {};
  for (const { store } of backupFiles(name)) {
    const file = state === CURRENT ? resolveInStore(STORES[store], name) : await backupFile(name, state, store);
    try {
      result[store] = flattenCsv(await fs.promises.readFile(file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw mapFsError(err, `${store}/${name}`);
      result[store] = null;
    }
  }
  return result;
}

function runGitDiff(cwd, left, right) {
  const args = Object.entries(GIT_COLORS).flatMap(([key, value]) => ['-c', `${key}=${value}`]);
  args.push('diff', '--no-index', '--color=always', '--color-moved=zebra', '--', left, right);
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }); // no shell
    const out = [];
    const err = [];
    child.stdout.on('data', (c) => out.push(c));
    child.stderr.on('data', (c) => err.push(c));
    child.on('error', (e) => {
      reject(new HttpError(500, `Comparing backups needs git on the PATH (${e.message})`, 'git-missing'));
    });
    child.on('close', (code) => {
      // git diff --no-index exits 1 when the sides differ: that is a result, not a failure
      if (code === 0 || code === 1) return resolve(Buffer.concat(out).toString('utf8'));
      reject(new HttpError(500, `git diff failed: ${Buffer.concat(err).toString('utf8').trim() || `exit ${code}`}`));
    });
  });
}

async function compareBackups(name, a, b) {
  if (a === b) throw new HttpError(400, 'Choose two different states to compare', 'same-state');
  await checkState(name, a);
  await checkState(name, b);
  const { flattenCsv } = await loadFlatten();
  const sides = { [a]: await flattenedState(name, a, flattenCsv), [b]: await flattenedState(name, b, flattenCsv) };

  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tlt-diff-'));
  try {
    for (const state of [a, b]) {
      await fs.promises.mkdir(path.join(tmp, state));
      for (const { store } of backupFiles(name)) {
        if (sides[a][store] === null && sides[b][store] === null) continue; // the file is on neither side
        await fs.promises.writeFile(path.join(tmp, state, `${store}.txt`), sides[state][store] ?? '', 'utf8');
      }
    }
    return await runGitDiff(tmp, a, b);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
}

// /api/backup/<file> (POST makes a backup, GET lists them) and /api/backup/<file>/diff?a=&b=
async function handleBackup(req, res, segments) {
  const [, , fileRaw, sub, ...rest] = segments;
  if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'the-toolbox') {
    throw new HttpError(403, 'Missing X-Requested-With header', 'forbidden');
  }
  if (fileRaw === undefined || rest.length || (sub !== undefined && sub !== 'diff')) {
    throw new HttpError(404, 'Not found', 'not-found');
  }
  let decoded;
  try {
    decoded = decodeURIComponent(fileRaw);
  } catch {
    throw new HttpError(400, 'Bad file name', 'invalid-name');
  }
  const name = validateName(decoded);

  if (sub === 'diff') {
    if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed');
    const query = new URL(req.url, 'http://localhost').searchParams;
    return send(res, 200, { diff: await compareBackups(name, query.get('a'), query.get('b')) });
  }
  if (req.method === 'POST') return send(res, 201, await createBackup(name));
  if (req.method === 'GET') return send(res, 200, { backups: await listBackups(name) });
  throw new HttpError(405, 'Method not allowed');
}

// ---------- project settings ----------

function requireHeader(req) {
  if (req.headers['x-requested-with'] !== 'the-toolbox') {
    throw new HttpError(403, 'Missing X-Requested-With header', 'forbidden');
  }
}

function settingsReply() {
  const config = loadConfig({ file: configPath() });
  return { projectName: config.projectName, dataDir: getDataDir(), configPath: config.configPath };
}

// A folder named by the browser: refused with 400 unless confineDir accepts it. Returns the real path.
function confined(dir) {
  const c = confineDir(dir);
  if (!c.ok) throw new HttpError(400, c.reason, 'refused');
  return c.dir;
}

// /api/project (GET reads, PUT saves and switches), /api/project/check, /api/project/init, /api/project/copy, /api/project/pick.
// They reach the config file and the folders init and the copy create, nothing else.
async function handleProject(req, res, segments) {
  const [, , sub, ...rest] = segments;
  if (rest.length) throw new HttpError(404, 'Not found', 'not-found');

  if (sub === undefined) {
    if (req.method === 'GET') {
      try {
        return send(res, 200, settingsReply());
      } catch (err) {
        throw new HttpError(500, err.message, 'config-invalid');
      }
    }
    if (req.method === 'PUT') {
      requireHeader(req);
      const body = await readJson(req);
      const changes = {};
      if (body.projectName !== undefined) changes.projectName = body.projectName;
      if (body.dataDir !== undefined) changes.dataDir = body.dataDir;
      // From here to the switch there is no await: no request can start between the check and the switch.
      if (changes.dataDir !== undefined && busy > 0) {
        throw new HttpError(409, 'A save or backup is running. Try again in a moment.', 'busy');
      }
      let saved;
      try {
        saved = saveConfig(changes, { file: configPath() });
      } catch (err) {
        throw new HttpError(400, err.message, 'refused');
      }
      if (changes.dataDir !== undefined) switchTo(saved.dataDir);
      return send(res, 200, { ...settingsReply(), switched: changes.dataDir !== undefined });
    }
    throw new HttpError(405, 'Method not allowed');
  }

  if (!['check', 'init', 'copy', 'pick'].includes(sub)) throw new HttpError(404, 'Not found', 'not-found');
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  requireHeader(req);

  // Only asks for a folder: nothing is saved, switched or created here; the path then goes through check.
  if (sub === 'pick') {
    let dir;
    try {
      dir = await folderDialog(getDataDir());
    } catch (err) {
      throw new HttpError(500, err.message, 'picker-unavailable');
    }
    return send(res, 200, dir ? { dir } : { cancelled: true });
  }

  const body = await readJson(req);

  if (sub === 'check') return send(res, 200, checkFolder(body.dir));

  busy++;
  try {
    const dir = confined(body.dir);
    if (sub === 'init') {
      try {
        return send(res, 200, initFolders(dir));
      } catch (err) {
        throw new HttpError(500, err.message, 'init-failed');
      }
    }
    const result = copyData(getDataDir(), dir);
    if (result.refused) throw new HttpError(400, result.refused, 'refused');
    if (result.stopped) {
      return send(res, 500, { error: `Copy stopped at ${result.stopped.file}: ${result.stopped.message}`, code: 'copy-stopped', ...result });
    }
    return send(res, 200, result);
  } finally {
    busy--;
  }
}

// ---------- API ----------

// Counts a write as busy for as long as it runs, so a switch of data folder cannot land in the middle of it.
async function handleApi(req, res, segments) {
  if (segments[1] === 'project') return handleProject(req, res, segments);
  const writes = req.method !== 'GET' && req.method !== 'HEAD';
  if (writes) busy++;
  try {
    return await handleStoreApi(req, res, segments);
  } finally {
    if (writes) busy--;
  }
}

async function handleStoreApi(req, res, segments) {
  const [, storeId, resource, fileRaw, ...rest] = segments;
  if (storeId === 'backup') return handleBackup(req, res, segments);
  const folder = Object.prototype.hasOwnProperty.call(STORES, storeId) ? STORES[storeId] : null;
  if (!folder) throw new HttpError(404, 'Unknown store', 'not-found');

  if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'the-toolbox') {
    throw new HttpError(403, 'Missing X-Requested-With header', 'forbidden');
  }
  if (rest.length) throw new HttpError(404, 'Not found', 'not-found');

  if (resource === 'open' && fileRaw === undefined) {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    openFolder(folder);
    return send(res, 200, { ok: true });
  }

  if (resource !== 'files') throw new HttpError(404, 'Not found', 'not-found');

  if (fileRaw === undefined) {
    if (req.method === 'GET') return send(res, 200, { files: await listFiles(folder) });
    if (req.method === 'POST') {
      const body = await readJson(req);
      const content = typeof body.content === 'string' ? body.content : '';
      const name = await createFile(folder, body.name, content);
      logWrite({ writer: 'portal', store: storeId, file: name, text: content });
      return send(res, 201, { name });
    }
    throw new HttpError(405, 'Method not allowed');
  }

  let decoded;
  try {
    decoded = decodeURIComponent(fileRaw);
  } catch {
    throw new HttpError(400, 'Bad file name', 'invalid-name');
  }
  const name = validateName(decoded);
  const full = resolveInStore(folder, name);

  try {
    if (req.method === 'GET') {
      const content = await fs.promises.readFile(full, 'utf8');
      return send(res, 200, { name, content });
    }
    if (req.method === 'PUT') {
      const content = await readBody(req);
      await fs.promises.access(full); // PUT never creates; 404 if missing
      await fs.promises.writeFile(full, content, 'utf8');
      logWrite({ writer: 'portal', store: storeId, file: name, text: content });
      return send(res, 200, { name });
    }
    if (req.method === 'PATCH') {
      const body = await readJson(req);
      const newName = await renameFile(folder, name, body.name);
      if (newName !== name) {
        // The file now exists under a new name: log its content so a later write can be traced to this one.
        logWrite({ writer: 'portal', store: storeId, file: newName, text: await fs.promises.readFile(resolveInStore(folder, newName), 'utf8') });
      }
      return send(res, 200, { name: newName });
    }
  } catch (err) {
    throw mapFsError(err, name);
  }
  throw new HttpError(405, 'Method not allowed');
}

// ---------- static files ----------

async function handleStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(404, 'Not found');
  }
  if (rel.endsWith('/')) rel += 'index.html';
  if (!fs.existsSync(DIST_DIR)) throw new HttpError(503, 'The app has not been built yet. Run `npm run build`, then reload.');
  const full = path.resolve(DIST_DIR, '.' + rel);
  if (full !== DIST_DIR && !full.startsWith(DIST_DIR + path.sep)) throw new HttpError(404, 'Not found');
  let target = full;
  try {
    const st = await fs.promises.stat(target);
    if (st.isDirectory()) {
      // Redirect so relative URLs on the page resolve against the folder.
      res.writeHead(301, { Location: pathname + '/' });
      return res.end();
    }
  } catch {
    throw new HttpError(404, 'Not found');
  }
  const data = await fs.promises.readFile(target);
  const type = MIME[path.extname(target).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(req.method === 'HEAD' ? undefined : data);
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  try {
    // Guard against DNS rebinding: only accept loopback host names.
    const host = (req.headers.host || '').replace(/:\d+$/, '');
    if (host !== 'localhost' && host !== '127.0.0.1') throw new HttpError(403, 'Forbidden');

    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, ['', ...pathname.split('/').filter(Boolean).slice(1)]);
    } else {
      await handleStatic(req, res, pathname);
    }
  } catch (err) {
    const e = mapFsError(err, 'File');
    if (res.headersSent) return res.end();
    send(res, e.status, { error: e.message, code: e.code });
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`Backlog planner running at http://localhost:${PORT}/`);
    const { projectName } = loadConfig({ file: configPath() });
    if (projectName) console.log(`Project: ${projectName}`);
    console.log(`Data folder: ${getDataDir()}`);
    if (!fs.existsSync(DIST_DIR)) console.log('The app has not been built yet. Run `npm run build` first.');
    const hint = legacyDataHint();
    if (hint) console.log(hint);
  });
}

module.exports = { server, setFolderDialog };
