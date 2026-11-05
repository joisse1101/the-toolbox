'use strict';
// Local server for the team-lead tools: the built app from dist/ plus a CSV file API
// restricted to the five kinds of file of a backlog folder (backlog-paths.cjs). Node built-ins only.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { HttpError, validateBacklogName } = require('../../logic/storage/file-name.cjs');
const { writeBacklogFiles } = require('../../logic/storage/backlog-files.cjs');
const { PLANS_DIR, KINDS, BACKLOG_FILE, backlogDir, backlogFile, listBacklogs, detectOlderLayout } =require('../../logic/storage/backlog-paths.cjs');
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
const {
  ROOT, loadConfig, saveConfig, configPath, confineDir, confineCodeBase, checkFolder, checkCodeBase, initFolders, initCodeBase, copyData, copyToCodeBase, planCopy, migrateOlderLayout,
} = require('../../logic/storage/project-config.cjs');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = path.join(__dirname, '..', 'dist'); // built by `npm run build`
const MAX_BODY = 10 * 1024 * 1024;

// Allow-list of the kinds of file the API reaches: `backlog`, `review`, `proposals`, `lexicon` and `lexicon-suggestions`.
// A request names a backlog, and backlog-paths.cjs maps (backlog, kind) to the fixed file in the backlog's folder.
// `slices` and `logs` are not kinds, so the API cannot reach them.
const STORES = new Set(KINDS);

// Number of requests that write (file save, create, rename, init, copy) and have not finished.
// A switch of data folder is refused while it is not zero.
let busy = 0;

// Points the server at `dir`. Synchronous, so no request sees a half-switched server.
function switchTo(dir) {
  setDataDir(dir);
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

// ---------- file operations ----------

// The backlogs that have a file of `kind` (every backlog for kind `backlog`), by folder name, sorted.
async function listFiles(dataDir, kind) {
  return listBacklogs(dataDir).filter((name) => kind === 'backlog' || fs.existsSync(backlogFile(dataDir, name, kind)));
}

async function writeNew(file, content) {
  const fh = await fs.promises.open(file, 'wx');
  try {
    await fh.writeFile(content, 'utf8');
  } finally {
    await fh.close();
  }
}

// Creates a backlog: its folder holding the five starting files (header only). A taken name gets the next free number.
// Returns the name used. The starting files are an ES module, so they load with a dynamic import.
async function createBacklog(dataDir, requested) {
  const { startingFiles } = await import('../../logic/backlog/starting-files.js');
  return writeBacklogFiles(dataDir, requested, startingFiles());
}

// Creates the file of another kind in an existing backlog; it never overwrites.
async function createKindFile(dataDir, name, kind, content) {
  const backlog = validateBacklogName(name);
  if (!fs.existsSync(backlogFile(dataDir, backlog, 'backlog'))) {
    throw new HttpError(404, `${backlog} was not found`, 'not-found');
  }
  const file = backlogFile(dataDir, backlog, kind);
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await writeNew(file, content);
  return backlog;
}

// Renames a backlog by renaming its folder, so every file and slice moves with it.
async function renameBacklog(dataDir, from, toRaw) {
  const fromName = validateBacklogName(from);
  const toName = validateBacklogName(toRaw);
  const src = backlogDir(dataDir, fromName);
  const dst = backlogDir(dataDir, toName);
  if (!fs.existsSync(path.join(src, BACKLOG_FILE))) throw new HttpError(404, `${fromName} was not found`, 'not-found');
  if (fromName === toName) return toName;
  // A case-only rename targets the same folder on Windows; otherwise refuse to clobber.
  if (src.toLowerCase() !== dst.toLowerCase() && fs.existsSync(dst)) {
    throw new HttpError(409, `${toName} already exists`, 'exists');
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

// ---------- project settings ----------

function requireHeader(req) {
  if (req.headers['x-requested-with'] !== 'the-toolbox') {
    throw new HttpError(403, 'Missing X-Requested-With header', 'forbidden');
  }
}

function settingsReply() {
  const config = loadConfig({ file: configPath() });
  const dataDir = getDataDir();
  // `olderLayout`: the folders of the earlier layout still in the data folder; only detected, never read as data.
  const reply = { projectName: config.projectName, dataDir, configPath: config.configPath, olderLayout: detectOlderLayout(dataDir) };
  // `codeBase` appears only when the config names one; dataDir is then its `.plans` folder.
  if (config.codeBase) reply.codeBase = config.codeBase;
  // `projects`: the saved projects (the active path is listed too when the config has no list), each with `label` (its name,
  // or the last segment of its path) and `exists` (its data folder is there); `activeProject` is the index of the active one.
  reply.projects = config.projects.map((p) => ({
    name: p.name,
    label: p.name || path.basename(p.codeBase || p.dataDir),
    codeBase: p.codeBase,
    dataDir: p.dataDir,
    exists: isFolder(p.dataDir),
    ...(p.synthetic ? { synthetic: true } : {}),
  }));
  reply.activeProject = config.activeProject;
  return reply;
}

function isFolder(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// Two data folders are the same when their resolved paths match (ignoring case on Windows).
function sameFolder(a, b) {
  const x = path.resolve(a);
  const y = path.resolve(b);
  return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y;
}

// Folder names and project names are compared ignoring case, because Windows folders ignore case.
function sameName(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

// The folder that holds the folders of new projects: planner/data. Tests point it at a temp folder (setNewProjectParent).
let newProjectParent = path.join(ROOT, 'planner', 'data');
function setNewProjectParent(dir) {
  newProjectParent = dir;
}

// Options passed to every copy a relocation makes (`copyFile` / `readFile`); only tests set them (setCopyOptions).
let copyOptions = {};
function setCopyOptions(options) {
  copyOptions = options || {};
}

// A switch or relocation is refused while a write runs. `others` is how many running requests are not the caller's own.
function refuseWhenBusy(others = 0) {
  if (busy > others) throw new HttpError(409, 'A save is running. Try again in a moment.', 'busy');
}

// Saves a switch of the active project and points the served folder at it. No await: no request starts in between.
function saveAndSwitch(changes) {
  let saved;
  try {
    saved = saveConfig(changes, { file: configPath() });
  } catch (err) {
    throw new HttpError(400, err.message, 'refused');
  }
  switchTo(saved.dataDir);
  return saved;
}

// POST /api/project/add: { codeBase, name?, init? } links a code base, { newName } creates planner/data/<newName>.
// A project already in the list is switched to, not added twice. Replies the settings plus `added` and `switched`.
async function addProject(body) {
  refuseWhenBusy();
  const config = loadConfig({ file: configPath() });
  const known = (dir) => config.projects.findIndex((p) => !p.synthetic && sameFolder(p.dataDir, dir));
  const nameTaken = (name) => config.projects.some((p) => (p.name && sameName(p.name, name)));
  busy++;
  try {
    if (body.newName !== undefined) {
      if (body.codeBase !== undefined) throw new HttpError(400, 'Add either a code base or a new project, not both.', 'refused');
      const name = validateBacklogName(body.newName);
      let taken = nameTaken(name);
      try {
        taken = taken || fs.readdirSync(newProjectParent).some((f) => sameName(f, name));
      } catch { /* the parent folder is not there yet: no folder can clash */ }
      if (taken) throw new HttpError(409, `A project or folder named "${name}" already exists.`, 'exists');
      const target = confined(path.join(newProjectParent, name));
      let init;
      try {
        init = await initFolders(target);
      } catch (err) {
        throw new HttpError(500, err.message, 'init-failed');
      }
      refuseWhenBusy(1);
      saveAndSwitch({ dataDir: target, addProject: { dataDir: target, name } });
      return { ...settingsReply(), added: true, switched: true, init };
    }

    if (typeof body.codeBase !== 'string') throw new HttpError(400, 'Give a code base or a new project name.', 'refused');
    const c = confinedCodeBase(body.codeBase);
    const name = body.name === undefined ? '' : body.name;
    if (typeof name !== 'string') throw new HttpError(400, 'The project name must be text.', 'refused');
    const entry = known(path.join(c.dir, PLANS_DIR));
    if (entry >= 0) {
      // Already saved: no second entry; switch to the existing one.
      const p = config.projects[entry];
      if (sameFolder(p.dataDir, config.dataDir)) return { ...settingsReply(), added: false, switched: false };
      refuseWhenBusy(1);
      saveAndSwitch(p.codeBase ? { codeBase: p.codeBase } : { dataDir: p.dataDir });
      return { ...settingsReply(), added: false, switched: true };
    }
    if (sameFolder(path.join(c.dir, PLANS_DIR), config.dataDir)) {
      return { ...settingsReply(), added: false, switched: false };
    }
    if (name.trim() && nameTaken(name.trim())) throw new HttpError(409, `A project named "${name.trim()}" already exists.`, 'exists');
    const status = checkCodeBase(c.dir).status;
    let init = null;
    if (status === 'missing' || status === 'empty') {
      // No planner files there: nothing changes until the user agrees to create them (`init: true`).
      if (body.init !== true) return { ...settingsReply(), added: false, switched: false, needsInit: true, status };
      try {
        init = await initCodeBase(c.dir);
      } catch (err) {
        throw new HttpError(500, err.message, 'init-failed');
      }
      if (init.refused) throw new HttpError(400, init.refused, 'refused');
    }
    refuseWhenBusy(1);
    saveAndSwitch({ codeBase: c.dir, addProject: { codeBase: c.dir, name } });
    return { ...settingsReply(), added: true, switched: true, ...(init ? { init } : {}) };
  } finally {
    busy--;
  }
}

// The target of a relocation named by the browser: { dir (the data folder), status } from the folder check.
function relocationTarget(body) {
  if (body.codeBase !== undefined) {
    const c = confinedCodeBase(body.codeBase);
    return { codeBase: c.dir, dir: c.plansDir, status: checkCodeBase(c.dir).status };
  }
  const dir = confined(body.dir);
  return { dir, status: checkFolder(dir).status };
}

// What a relocation to this target needs: `copy` (empty or missing: copies without a prompt), `choose` (it holds a backlog
// folder: overwrite, switch or cancel) or `switch` (only the older layout: switch, then the migration can run).
const RELOCATION_ACTION = { missing: 'copy', empty: 'copy', 'has-planner-files': 'choose', 'older-layout': 'switch' };

// POST /api/project/relocate-plan: read-only. Replies { status, dir, action, needsChoice, exists } (`exists`: the files an overwrite would replace).
function planRelocation(body) {
  const t = relocationTarget(body);
  const plan = planCopy(getDataDir(), t.dir);
  if (plan.refused) throw new HttpError(400, plan.refused, 'refused');
  const action = RELOCATION_ACTION[t.status];
  return { status: t.status, dir: t.dir, action, needsChoice: action === 'choose', exists: action === 'choose' ? plan.exists : [] };
}

// POST /api/project/relocate-apply: { dir | codeBase, choice? } with choice `overwrite`, `switch` or `cancel`. In order: plan, copy,
// read-back (inside copyData), then the config save. The config is left alone when any step fails; the old folder is never touched.
function applyRelocation(body) {
  refuseWhenBusy();
  const t = relocationTarget(body);
  const choice = body.choice;
  if (choice !== undefined && !['overwrite', 'switch', 'cancel'].includes(choice)) {
    throw new HttpError(400, 'The choice must be overwrite, switch or cancel.', 'refused');
  }
  if (choice === 'cancel') return { ...settingsReply(), relocated: false, cancelled: true };
  const plan = planCopy(getDataDir(), t.dir);
  if (plan.refused) throw new HttpError(400, plan.refused, 'refused');
  const action = RELOCATION_ACTION[t.status];
  if (action === 'choose' && choice === undefined) {
    throw new HttpError(409, 'The folder already holds planner files: choose overwrite, switch or cancel.', 'choice-needed');
  }
  let result = null;
  if (action === 'copy' || (action === 'choose' && choice === 'overwrite')) {
    busy++;
    try {
      const overwrite = action === 'choose';
      result = t.codeBase !== undefined
        ? copyToCodeBase(getDataDir(), t.codeBase, { overwrite, ...copyOptions })
        : copyData(getDataDir(), t.dir, { overwrite, ...copyOptions });
    } finally {
      busy--;
    }
    if (result.refused) throw new HttpError(400, result.refused, 'refused');
    if (result.stopped) {
      const e = new HttpError(500, `Copy stopped at ${result.stopped.file}: ${result.stopped.message}`, 'copy-stopped');
      e.detail = result;
      throw e;
    }
    if (result.failed.length) {
      const e = new HttpError(500, `Copy failed for ${result.failed.map((f) => f.file).join(', ')}: ${result.failed[0].message}`, 'copy-failed');
      e.detail = result;
      throw e;
    }
  }
  saveAndSwitch(t.codeBase !== undefined ? { codeBase: t.codeBase, replaceActive: true } : { dataDir: t.dir, replaceActive: true });
  return { ...settingsReply(), relocated: true, switched: true, action, ...(result ? { copy: result } : {}) };
}

// A code base named by the browser: refused with 400 unless confineCodeBase accepts it. Returns { dir, plansDir }.
function confinedCodeBase(codeBase) {
  const c = confineCodeBase(codeBase);
  if (!c.ok) throw new HttpError(400, c.reason, 'refused');
  return c;
}

// A folder named by the browser: refused with 400 unless confineDir accepts it. Returns the real path.
function confined(dir) {
  const c = confineDir(dir);
  if (!c.ok) throw new HttpError(400, c.reason, 'refused');
  return c.dir;
}

// /api/project (GET reads the settings and the saved projects, PUT saves and switches, which is also how a saved project is chosen),
// /api/project/check, /api/project/init, /api/project/copy, /api/project/pick, /api/project/migrate,
// /api/project/add (link a code base or create a new project), /api/project/relocate-plan (read-only) and
// /api/project/relocate-apply (copy, read back, then save the new path of the active project).
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
      if (body.codeBase !== undefined) changes.codeBase = body.codeBase;
      const switches = changes.dataDir !== undefined || changes.codeBase !== undefined;
      if (switches && busy > 0) {
        throw new HttpError(409, 'A save is running. Try again in a moment.', 'busy');
      }
      if (changes.codeBase !== undefined) {
        if (changes.dataDir !== undefined) throw new HttpError(400, 'Save either a code base or a data folder, not both.', 'refused');
        if (typeof changes.codeBase !== 'string') throw new HttpError(400, 'The code base must be text.', 'refused');
        const c = confinedCodeBase(changes.codeBase);
        if (!fs.existsSync(c.plansDir)) {
          throw new HttpError(400, 'The code base has no .plans folder: it must be created by init or the copy first.', 'refused');
        }
        changes.codeBase = c.dir;
      }
      let saved;
      try {
        saved = saveConfig(changes, { file: configPath() });
      } catch (err) {
        throw new HttpError(400, err.message, 'refused');
      }
      if (switches) switchTo(saved.dataDir);
      return send(res, 200, { ...settingsReply(), switched: switches });
    }
    throw new HttpError(405, 'Method not allowed');
  }

  if (!['check', 'init', 'copy', 'pick', 'migrate', 'add', 'relocate-plan', 'relocate-apply'].includes(sub)) throw new HttpError(404, 'Not found', 'not-found');
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  requireHeader(req);

  if (sub === 'add') return send(res, 200, await addProject(await readJson(req)));
  if (sub === 'relocate-plan') return send(res, 200, planRelocation(await readJson(req)));
  if (sub === 'relocate-apply') return send(res, 200, applyRelocation(await readJson(req)));

  // Runs only when asked: copies the older layout of the served folder into backlog folders (no body).
  if (sub === 'migrate') {
    busy++;
    try {
      const result = migrateOlderLayout(getDataDir());
      if (result.refused) throw new HttpError(400, result.refused, 'refused');
      return send(res, 200, result);
    } finally {
      busy--;
    }
  }

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

  // A body with `codeBase` works on `<codeBase>/.plans`; a body with `dir` works on the folder itself.
  const forCodeBase = body.codeBase !== undefined;
  if (sub === 'check') return send(res, 200, forCodeBase ? checkCodeBase(body.codeBase) : checkFolder(body.dir));

  busy++;
  try {
    if (forCodeBase) {
      const c = confinedCodeBase(body.codeBase);
      if (sub === 'init') {
        try {
          return send(res, 200, await initCodeBase(c.dir));
        } catch (err) {
          throw new HttpError(500, err.message, 'init-failed');
        }
      }
      const result = copyToCodeBase(getDataDir(), c.dir);
      if (result.refused) throw new HttpError(400, result.refused, 'refused');
      if (result.stopped) {
        return send(res, 500, { error: `Copy stopped at ${result.stopped.file}: ${result.stopped.message}`, code: 'copy-stopped', ...result });
      }
      return send(res, 200, result);
    }
    const dir = confined(body.dir);
    if (sub === 'init') {
      try {
        return send(res, 200, await initFolders(dir));
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
  const [, kind, resource, fileRaw, ...rest] = segments;
  if (!STORES.has(kind)) throw new HttpError(404, `Unknown kind "${kind}"`, 'unknown-store');
  const dataDir = getDataDir();

  if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'the-toolbox') {
    throw new HttpError(403, 'Missing X-Requested-With header', 'forbidden');
  }
  if (rest.length) throw new HttpError(404, 'Not found', 'not-found');

  if (resource === 'open' && fileRaw === undefined) {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    openFolder(dataDir);
    return send(res, 200, { ok: true });
  }

  if (resource !== 'files') throw new HttpError(404, 'Not found', 'not-found');

  if (fileRaw === undefined) {
    if (req.method === 'GET') return send(res, 200, { files: await listFiles(dataDir, kind) });
    if (req.method === 'POST') {
      const body = await readJson(req);
      // A backlog's content is the server's: a `content` field is ignored for kind `backlog`.
      const content = typeof body.content === 'string' ? body.content : '';
      const name = kind === 'backlog'
        ? await createBacklog(dataDir, body.name)
        : await createKindFile(dataDir, body.name, kind, content);
      return send(res, 201, { name });
    }
    throw new HttpError(405, 'Method not allowed');
  }

  let decoded;
  try {
    decoded = decodeURIComponent(fileRaw);
  } catch {
    throw new HttpError(400, 'Bad backlog name', 'invalid-name');
  }
  const name = validateBacklogName(decoded);
  const full = backlogFile(dataDir, name, kind);

  try {
    if (req.method === 'GET') {
      const content = await fs.promises.readFile(full, 'utf8');
      return send(res, 200, { name, content });
    }
    if (req.method === 'PUT') {
      const content = await readBody(req);
      await fs.promises.access(full); // PUT never creates; 404 if missing
      await fs.promises.writeFile(full, content, 'utf8');
      return send(res, 200, { name });
    }
    if (req.method === 'PATCH' && kind === 'backlog') {
      const body = await readJson(req);
      const newName = await renameBacklog(dataDir, name, body.name);
      if (newName !== name) {
        // The backlog now has a new name: log its content so a later write can be traced to this one.
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
    send(res, e.status, { error: e.message, code: e.code, ...(e.detail || {}) });
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

module.exports = { server, setFolderDialog, setNewProjectParent, setCopyOptions };
