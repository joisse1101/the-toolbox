'use strict';
// Local server for the team-lead tools: the built app from dist/ plus a CSV file API
// restricted to the folders registered in STORES. Node built-ins only.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = path.join(__dirname, 'dist'); // built by `npm run build`
const MAX_BODY = 10 * 1024 * 1024;

// Allow-list of data folders. Adding a tool's data folder is one line.
const STORES = {
  'user-stories': path.join(__dirname, 'user-stories'),
  reviews: path.join(__dirname, 'reviews'), // review suggestions, written by the review-backlog skill's script
  proposals: path.join(__dirname, 'proposals'), // proposed stories awaiting acceptance, one file per backlog
};

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

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ---------- filename validation (used by every file route) ----------

// Returns the safe file name (forced .csv) or throws HttpError(400).
function validateName(raw) {
  if (typeof raw !== 'string') throw new HttpError(400, 'File name is required', 'invalid-name');
  let name = raw.trim();
  if (!name) throw new HttpError(400, 'File name is required', 'invalid-name');
  if (!/\.csv$/i.test(name)) name += '.csv';
  const base = name.slice(0, -4);
  if (!base.trim()) throw new HttpError(400, 'File name is required', 'invalid-name');
  if (/[\\/:*?"<>|\x00-\x1f]/.test(name)) {
    throw new HttpError(400, 'File name cannot contain \\ / : * ? " < > |', 'invalid-name');
  }
  if (name.includes('..') || /[. ]$/.test(base)) {
    throw new HttpError(400, 'File name is not allowed', 'invalid-name');
  }
  if (RESERVED.test(base)) throw new HttpError(400, `"${base}" is a reserved Windows name`, 'invalid-name');
  if (name.length > 120) throw new HttpError(400, 'File name is too long', 'invalid-name');
  return name;
}

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

// ---------- API ----------

async function handleApi(req, res, segments) {
  const [, storeId, resource, fileRaw, ...rest] = segments;
  const folder = Object.prototype.hasOwnProperty.call(STORES, storeId) ? STORES[storeId] : null;
  if (!folder) throw new HttpError(404, 'Unknown store', 'not-found');

  if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'team-lead-tools') {
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
      const name = await createFile(folder, body.name, typeof body.content === 'string' ? body.content : '');
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
      return send(res, 200, { name });
    }
    if (req.method === 'PATCH') {
      const body = await readJson(req);
      const newName = await renameFile(folder, name, body.name);
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
    console.log(`Team lead tools running at http://localhost:${PORT}/`);
    if (!fs.existsSync(DIST_DIR)) console.log('The app has not been built yet. Run `npm run build` first.');
  });
}

module.exports = { validateName, server };
