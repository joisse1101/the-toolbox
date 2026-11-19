// Fetch wrapper for the CSV file API: /api/<kind>/...
// Errors are thrown as FileApiError with a readable message; `locked` is true when the file
// is held open by another program (for example Excel).

import type { BacklogKind, RelinkReply, SavedProject } from '#shared/types.ts';

export class FileApiError extends Error {
  status: number;
  code: string | undefined;
  locked: boolean;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.locked = code === 'locked';
  }
}

// The text of a caught value: an Error's message, else the value as text.
export const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

// A reply body is JSON the server built; each caller names the shape it reads. `Reply` is that parse edge.
// The generic is trusted, not checked: the server is the only sender.
type Reply = Record<string, unknown>;

// The reply of the project calls: the settings plus whatever the call adds.
export interface ProjectSettings {
  projectName: string;
  dataDir: string;
  configPath: string;
  codeBase?: string | null;
  projects?: Array<SavedProject & { label?: string; exists?: boolean }>;
  activeProject?: number;
  switched?: boolean;
  added?: boolean;
  needsInit?: boolean;
  init?: ProjectInit;
  relocated?: boolean;
  cancelled?: boolean;
  action?: string;
  copy?: ProjectCopy & { overwritten?: string[] };
  olderLayout?: string[];
  [key: string]: unknown;
}

export interface ProjectCheck {
  status: 'refused' | 'has-planner-files' | 'older-layout' | 'empty' | 'missing';
  reason?: string;
  dir?: string;
  codeBase?: string;
  [key: string]: unknown;
}

export interface ProjectInit {
  dir: string;
  createdDataDir: boolean;
  created: string[];
  existing: string[];
  createdBacklog?: string | null;
}

export interface ProjectCopy {
  copied: string[];
  skipped: string[];
}

export interface RelocationPlan {
  status: string;
  dir: string;
  action: 'copy' | 'choose' | 'switch';
  needsChoice: boolean;
  exists: string[];
}

export interface Migration {
  copied: string[];
  skipped: Array<{ file: string; reason: string }>;
  failed: Array<{ file: string; message: string }>;
}

export type FolderTarget = { dir: string } | { codeBase: string };

export interface FileStore {
  list(): Promise<string[]>;
  read(name: string): Promise<string>;
  readBacklog(name: string): Promise<{ content: string; initials: string }>;
  setInitials(name: string, initials: string): Promise<string>;
  create(name: string, content?: string): Promise<string>;
  write(name: string, text: string): Promise<void>;
  rename(name: string, newName: string): Promise<string>;
  openFolder(): Promise<void>;
}

async function call<T = Reply>(method: string, url: string, { json, text }: { json?: unknown; text?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { 'X-Requested-With': 'the-toolbox' };
  let body: string | undefined;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (text !== undefined) {
    headers['Content-Type'] = 'text/plain; charset=utf-8';
    body = text;
  }
  let res: Response;
  try {
    res = await fetch(url, { method, headers, body, cache: 'no-store' });
  } catch {
    throw new FileApiError('Cannot reach the local server. Is `node backend/server.ts` still running?', 0, 'network');
  }
  let data: { error?: string; code?: string } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    // non-JSON body; fall through to the status check
  }
  if (!res.ok) throw new FileApiError(data.error || `Request failed (${res.status})`, res.status, data.code);
  return data as T;
}

// Project settings: /api/project. A folder is sent as an absolute path; the server confines it.
// getProject resolves to { projectName, dataDir, configPath, codeBase? }; saveProject takes { projectName?, dataDir?, codeBase? } and
// resolves to the same plus `switched` (a refused value or a running save throws; code 'busy' means try again).
export function getProject() {
  return call<ProjectSettings>('GET', '/api/project');
}

export function saveProject(changes: { projectName?: string; dataDir?: string; codeBase?: string }) {
  return call<ProjectSettings>('PUT', '/api/project', { json: changes });
}

// Resolves to { status: 'refused' | 'has-planner-files' | 'older-layout' | 'empty' | 'missing', reason?, dir? }. Changes nothing.
export function checkProjectFolder(dir: string) {
  return call<ProjectCheck>('POST', '/api/project/check', { json: { dir } });
}

// Opens the server's folder dialog. Resolves to { dir } for the chosen folder or { cancelled: true }; changes nothing.
// Throws when the server cannot open the dialog.
export function pickProjectFolder() {
  return call<{ dir?: string; cancelled?: boolean }>('POST', '/api/project/pick');
}

// Resolves to { dir, createdDataDir, created, existing }.
export function initProjectFolder(dir: string) {
  return call<ProjectInit>('POST', '/api/project/init', { json: { dir } });
}

// Copies the current data folder into `dir`. Resolves to { copied, skipped }.
export function copyProjectData(dir: string) {
  return call<ProjectCopy>('POST', '/api/project/copy', { json: { dir } });
}

// The same three calls for a code base: the server works on `<codeBase>/.plans`. check resolves to the same statuses
// plus `codeBase` (the resolved path); init resolves like initProjectFolder; copy like copyProjectData.
// saveProject({ codeBase }) writes `codeBase` and removes `dataDir`; it is refused while `.plans` does not exist.
export function checkCodeBase(codeBase: string) {
  return call<ProjectCheck>('POST', '/api/project/check', { json: { codeBase } });
}

export function initCodeBase(codeBase: string) {
  return call<ProjectInit>('POST', '/api/project/init', { json: { codeBase } });
}

export function copyToCodeBase(codeBase: string) {
  return call<ProjectCopy>('POST', '/api/project/copy', { json: { codeBase } });
}

// The saved projects come with getProject: `projects` is [{ name, label, codeBase, dataDir, exists, synthetic? }] and
// `activeProject` the index of the active one. Choosing one is saveProject({ codeBase }) or saveProject({ dataDir }).

// Adds a project and makes it active. Pass { codeBase, name?, init? } to link a code base or { newName } to create
// viewer/data/<newName>. Resolves to the settings plus { added, switched, init? }; for a code base with no planner
// files it changes nothing and resolves with `needsInit: true` until it is called again with `init: true`.
// A refused name or folder throws (code 'refused' or 'exists'; 'busy' means try again).
export function addProject(body: { codeBase?: string; name?: string; init?: boolean; newName?: string }) {
  return call<ProjectSettings>('POST', '/api/project/add', { json: body });
}

// Read-only look at moving the active project's data into { dir } or { codeBase }.
// Resolves to { status, dir, action: 'copy' | 'choose' | 'switch', needsChoice, exists } (`exists`: files an overwrite would replace).
export function planProjectRelocation(target: FolderTarget) {
  return call<RelocationPlan>('POST', '/api/project/relocate-plan', { json: target });
}

// Runs a relocation: `target` is { dir } or { codeBase }, `choice` is 'overwrite', 'switch' or 'cancel' (needed when the plan says choose).
// Copies, reads back, then saves the new path; the config is unchanged when it throws. Resolves to the settings plus { relocated, switched, action, copy? }.
export function applyProjectRelocation(target: FolderTarget, choice?: 'overwrite' | 'switch' | 'cancel') {
  return call<ProjectSettings>('POST', '/api/project/relocate-apply', { json: choice === undefined ? target : { ...target, choice } });
}

// Copies the older layout of the served data folder into backlog folders; runs only when called.
// Resolves to { copied, skipped: [{file, reason}], failed: [{file, message}] }.
export function migrateOlderLayout() {
  return call<Migration>('POST', '/api/project/migrate');
}

// Follows changed story IDs into the other backlogs: `from` is the backlog whose IDs changed, `changes` maps old code -> new code
// ('' = deleted), and `only` limits the run to the named backlogs (a retry). The reply names the backlogs it wrote and one entry
// per file it could not rewrite; a refused call throws.
export function relink(from: string, changes: ReadonlyMap<string, string>, only?: readonly string[]) {
  return call<RelinkReply>('POST', '/api/relink', { json: { from, changes: Object.fromEntries(changes), only } }); // an undefined `only` is left out of the JSON
}

// `kind` is one of backlog, review, proposals, lexicon, lexicon-suggestions. Files are named by backlog, without ".csv".
export function createFileStore(kind: BacklogKind): FileStore {
  const base = `/api/${encodeURIComponent(kind)}`;
  const file = (name: string) => `${base}/files/${encodeURIComponent(name)}`;
  return {
    async list() {
      return (await call<{ files: string[] }>('GET', `${base}/files`)).files;
    },
    // Returns the raw file text (a leading BOM is kept so callers can preserve it).
    async read(name) {
      return (await call<{ content: string }>('GET', file(name))).content;
    },
    // Backlog store only: resolves to { content, initials } (the initials the server keeps in backlog.json).
    async readBacklog(name) {
      const { content, initials } = await call<{ content: string; initials: string }>('GET', file(name));
      return { content, initials };
    },
    // Backlog store only: resolves to the stored initials. A refused value throws (400, or 409 with code 'initials-taken').
    async setInitials(name, initials) {
      return (await call<{ initials: string }>('PATCH', file(name), { json: { initials } })).initials;
    },
    // Resolves to the name actually used (numbered if the requested one was taken).
    async create(name, content = '') {
      return (await call<{ name: string }>('POST', `${base}/files`, { json: { name, content } })).name;
    },
    async write(name, text) {
      await call('PUT', file(name), { text });
    },
    // Resolves to the new backlog name (the folder is renamed).
    async rename(name, newName) {
      return (await call<{ name: string }>('PATCH', file(name), { json: { name: newName } })).name;
    },
    async openFolder() {
      await call('POST', `${base}/open`);
    },
  };
}
