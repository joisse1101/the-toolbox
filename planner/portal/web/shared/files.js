// Fetch wrapper for the CSV file API: /api/<kind>/...
// Errors are thrown as FileApiError with a readable message; `locked` is true when the file
// is held open by another program (for example Excel).

export class FileApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
    this.locked = code === 'locked';
  }
}

async function call(method, url, { json, text } = {}) {
  const headers = { 'X-Requested-With': 'the-toolbox' };
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (text !== undefined) {
    headers['Content-Type'] = 'text/plain; charset=utf-8';
    body = text;
  }
  let res;
  try {
    res = await fetch(url, { method, headers, body, cache: 'no-store' });
  } catch {
    throw new FileApiError('Cannot reach the local server. Is `node server.cjs` still running?', 0, 'network');
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    // non-JSON body; fall through to the status check
  }
  if (!res.ok) throw new FileApiError(data.error || `Request failed (${res.status})`, res.status, data.code);
  return data;
}

// Project settings: /api/project. A folder is sent as an absolute path; the server confines it.
// getProject resolves to { projectName, dataDir, configPath }; saveProject takes { projectName?, dataDir? } and
// resolves to the same plus `switched` (a refused value or a running save throws; code 'busy' means try again).
export function getProject() {
  return call('GET', '/api/project');
}

export function saveProject(changes) {
  return call('PUT', '/api/project', { json: changes });
}

// Resolves to { status: 'refused' | 'has-planner-files' | 'older-layout' | 'empty' | 'missing', reason?, dir? }. Changes nothing.
export function checkProjectFolder(dir) {
  return call('POST', '/api/project/check', { json: { dir } });
}

// Opens the server's folder dialog. Resolves to { dir } for the chosen folder or { cancelled: true }; changes nothing.
// Throws when the server cannot open the dialog.
export function pickProjectFolder() {
  return call('POST', '/api/project/pick');
}

// Resolves to { dir, createdDataDir, created, existing }.
export function initProjectFolder(dir) {
  return call('POST', '/api/project/init', { json: { dir } });
}

// Copies the current data folder into `dir`. Resolves to { copied, skipped }.
export function copyProjectData(dir) {
  return call('POST', '/api/project/copy', { json: { dir } });
}

// Copies the older layout of the served data folder into backlog folders; runs only when called.
// Resolves to { copied, skipped: [{file, reason}], failed: [{file, message}] }.
export function migrateOlderLayout() {
  return call('POST', '/api/project/migrate');
}

// `kind` is one of backlog, review, proposals, lexicon, lexicon-suggestions. Files are named by backlog, without ".csv".
export function createFileStore(kind) {
  const base = `/api/${encodeURIComponent(kind)}`;
  const file = (name) => `${base}/files/${encodeURIComponent(name)}`;
  return {
    async list() {
      return (await call('GET', `${base}/files`)).files;
    },
    // Returns the raw file text (a leading BOM is kept so callers can preserve it).
    async read(name) {
      return (await call('GET', file(name))).content;
    },
    // Resolves to the name actually used (numbered if the requested one was taken).
    async create(name, content = '') {
      return (await call('POST', `${base}/files`, { json: { name, content } })).name;
    },
    async write(name, text) {
      await call('PUT', file(name), { text });
    },
    // Resolves to the new backlog name (the folder is renamed).
    async rename(name, newName) {
      return (await call('PATCH', file(name), { json: { name: newName } })).name;
    },
    async openFolder() {
      await call('POST', `${base}/open`);
    },
  };
}
