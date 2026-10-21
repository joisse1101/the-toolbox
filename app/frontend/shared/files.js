// Fetch wrapper for the CSV file API: /api/<store>/...
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

// Backups of one backlog: /api/backup/<name>. The server copies the backlog, its review and its proposals.
const backupUrl = (name) => `/api/backup/${encodeURIComponent(name)}`;

// Resolves to { folder, files } of the new backup.
export function backup(name) {
  return call('POST', backupUrl(name));
}

// Resolves to [{ folder, files }], newest first.
export async function listBackups(name) {
  return (await call('GET', backupUrl(name))).backups;
}

// `a` and `b` are backup folder names or 'current'. Resolves to git's colored diff ('' when nothing differs).
export async function compareBackups(name, a, b) {
  const query = `a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
  return (await call('GET', `${backupUrl(name)}/diff?${query}`)).diff;
}

export function createFileStore(store) {
  const base = `/api/${encodeURIComponent(store)}`;
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
    // Resolves to the new name (".csv" appended if missing).
    async rename(name, newName) {
      return (await call('PATCH', file(name), { json: { name: newName } })).name;
    },
    async openFolder() {
      await call('POST', `${base}/open`);
    },
  };
}
