// The project config: a YAML file with `projectName` and one folder key, `codeBase` or `dataDir`. Load, validate and
// default rules only; pure Node. The file is viewer/viewer.config.yaml unless VIEWER_CONFIG names another one. A
// relative dataDir or codeBase is resolved against the folder that holds the config file. A codeBase's data folder is
// `<codeBase>/.plans`.

import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { PLANS_DIR } from '../../shared/storage/backlog-paths.ts';
import { confineDir } from './project-folders.ts';
import { codeOf, messageOf } from './errors.ts';
import type { ProjectConfig, SavedProject } from '../../shared/types.ts';

export {
  confineDir, confineCodeBase, checkFolder, checkCodeBase, initFolders, initCodeBase, copyData, copyToCodeBase, planCopy, planCopyToCodeBase, migrateOlderLayout,
} from './project-folders.ts';

// What a config file may hold once validateConfig has accepted it: every key is optional.
type RawEntry = { name?: string; codeBase?: string; dataDir?: string };
type RawConfig = { projectName?: string; codeBase?: string; dataDir?: string; projects?: RawEntry[] };
// What saveConfig takes; the values come from the browser, so they are checked before use.
export type ConfigChanges = { projectName?: unknown; dataDir?: unknown; codeBase?: unknown; addProject?: unknown; replaceActive?: unknown };

export const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
export const DEFAULT_CONFIG_PATH = path.join(ROOT, 'viewer', 'viewer.config.yaml');
export const DEFAULT_DATA_DIR = path.join(ROOT, 'viewer', 'data');
export const KEYS = ['projectName', 'codeBase', 'dataDir', 'projects'];
const ENTRY_KEYS = ['name', 'codeBase', 'dataDir'];

// The config file to read: VIEWER_CONFIG (relative to the working folder) or the default place.
export function configPath(env: NodeJS.ProcessEnv = process.env): string {
  return env.VIEWER_CONFIG ? path.resolve(env.VIEWER_CONFIG) : DEFAULT_CONFIG_PATH;
}

// Checks a parsed config object; throws an Error naming the bad key. `file` is only for the message.
export function validateConfig(raw: unknown, file = 'config'): RawConfig {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${file}: expected keys ${KEYS.join(' and ')}, found something else`);
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!KEYS.includes(key)) throw new Error(`${file}: unknown key "${key}" (allowed: ${KEYS.join(', ')})`);
  }
  if ('projectName' in obj && typeof obj.projectName !== 'string') throw new Error(`${file}: "projectName" must be text`);
  if ('dataDir' in obj) {
    if (typeof obj.dataDir !== 'string') throw new Error(`${file}: "dataDir" must be text`);
    if (!obj.dataDir.trim()) throw new Error(`${file}: "dataDir" must not be empty`);
  }
  if ('codeBase' in obj) {
    if (typeof obj.codeBase !== 'string') throw new Error(`${file}: "codeBase" must be text`);
    if (!obj.codeBase.trim()) throw new Error(`${file}: "codeBase" must not be empty`);
  }
  if ('codeBase' in obj && 'dataDir' in obj) throw new Error(`${file}: set only one of "codeBase" and "dataDir", found both`);
  if ('projects' in obj) validateProjects(obj.projects, file);
  return obj as RawConfig; // every key was checked above
}

// Checks the saved project list; every error names "projects" and the entry's position (counted from 0).
function validateProjects(list: unknown, file: string): void {
  if (!Array.isArray(list)) throw new Error(`${file}: "projects" must be a list of entries`);
  list.forEach((entry: unknown, i: number) => {
    const at = `${file}: "projects" entry ${i} (projects[${i}])`;
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`${at} must be an object with "codeBase" or "dataDir" and an optional "name"`);
    const fields = entry as Record<string, unknown>;
    for (const key of Object.keys(fields)) {
      if (!ENTRY_KEYS.includes(key)) throw new Error(`${at} has unknown key "${key}" (allowed: ${ENTRY_KEYS.join(', ')})`);
    }
    if ('name' in fields && typeof fields.name !== 'string') throw new Error(`${at}: "name" must be text`);
    const hasCode = 'codeBase' in fields;
    const hasData = 'dataDir' in fields;
    if (hasCode && hasData) throw new Error(`${at}: set only one of "codeBase" and "dataDir", found both`);
    if (!hasCode && !hasData) throw new Error(`${at}: needs "codeBase" or "dataDir", found neither`);
    const key = hasCode ? 'codeBase' : 'dataDir';
    const value = fields[key];
    if (typeof value !== 'string') throw new Error(`${at}: "${key}" must be text`);
    if (!value.trim()) throw new Error(`${at}: "${key}" must not be empty`);
  });
}

// Reads the config. A missing file gives the defaults; a bad one throws naming the key or the file.
// Returns { projectName, codeBase (absolute, or null), dataDir (absolute), configPath, exists }.
export function loadConfig({ file = configPath() }: { file?: string } = {}): ProjectConfig {
  const abs = path.resolve(file);
  let text: string | null = null;
  try {
    text = fs.readFileSync(abs, 'utf8');
  } catch (err) {
    if (codeOf(err) !== 'ENOENT') throw new Error(`${abs}: cannot read the config file (${messageOf(err)})`);
  }
  let raw: RawConfig = {};
  if (text !== null) {
    let parsed: unknown;
    try {
      parsed = YAML.parse(text);
    } catch (err) {
      throw new Error(`${abs}: not valid YAML (${messageOf(err).split('\n')[0]})`);
    }
    raw = validateConfig(parsed, abs);
  }
  const codeBase = raw.codeBase === undefined ? null : path.resolve(path.dirname(abs), raw.codeBase.trim());
  let dataDir = DEFAULT_DATA_DIR;
  if (codeBase !== null) dataDir = path.join(codeBase, PLANS_DIR);
  else if (raw.dataDir !== undefined) dataDir = path.resolve(path.dirname(abs), raw.dataDir.trim());
  const projects = (raw.projects || []).map((entry) => resolveEntry(entry, path.dirname(abs)));
  let activeProject = projects.findIndex((p) => sameFolder(p.dataDir, dataDir));
  if (activeProject < 0) {
    // No list, or the active path is not in it: show the active path as its own entry (nothing is written).
    projects.push({ name: '', codeBase, dataDir, synthetic: true });
    activeProject = projects.length - 1;
  }
  return { projectName: raw.projectName ?? '', codeBase, dataDir, projects, activeProject, configPath: abs, exists: text !== null };
}

// A saved entry as absolute paths: { name, codeBase (absolute or null), dataDir (the data folder: <codeBase>/.plans for a code base) }.
function resolveEntry(entry: RawEntry, base: string): SavedProject {
  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  if (entry.codeBase !== undefined) {
    const codeBase = path.resolve(base, entry.codeBase.trim());
    return { name, codeBase, dataDir: path.join(codeBase, PLANS_DIR) };
  }
  return { name, codeBase: null, dataDir: path.resolve(base, String(entry.dataDir).trim()) }; // validateProjects guarantees one of the two keys
}

// Entries and the active project are matched by resolved absolute data folder (case-insensitive on Windows).
function sameFolder(a: string, b: string): boolean {
  const x = path.resolve(a);
  const y = path.resolve(b);
  return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y;
}

// The new value of a folder key, checked as saveConfig has always checked it; returns the trimmed text.
function checkNewDataDir(value: unknown, abs: string, confine: Parameters<typeof confineDir>[1]): string {
  validateConfig({ dataDir: value }, abs);
  const c = confineDir(value, confine);
  if (!c.ok) throw new Error(c.reason);
  if (!fs.existsSync(c.dir)) throw new Error('The folder does not exist: it must be created by init or the copy first.');
  return (value as string).trim(); // validateConfig above refused anything but text
}
function checkNewCodeBase(value: unknown, abs: string): string {
  validateConfig({ codeBase: value }, abs);
  const dir = (value as string).trim(); // validateConfig above refused anything but text
  if (!path.isAbsolute(dir)) throw new Error('The code base must be an absolute path.');
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error('The code base folder does not exist.');
  return dir;
}

// Saves `changes` ({ projectName?, dataDir?, codeBase? }) into the config file through the YAML document API, so comments the user
// wrote survive. Validates first and writes nothing when a value is refused. A new dataDir must be an absolute path that
// passes confineDir and already exists (init or the copy creates it). A new codeBase must be an absolute path to an
// existing folder (the server applies its own confinement first). Saving one folder key removes the other in the same
// write, so the file never holds both. Returns the loaded config; throws an Error with the reason.
export function saveConfig(changes: ConfigChanges, { file = configPath(), confine }: { file?: string; confine?: Parameters<typeof confineDir>[1] } = {}): ProjectConfig {
  const abs = path.resolve(file);
  const next: { projectName?: unknown; dataDir?: string; codeBase?: string } = {};
  if (changes.projectName !== undefined) next.projectName = typeof changes.projectName === 'string' ? changes.projectName.trim() : changes.projectName;
  if (changes.dataDir !== undefined) next.dataDir = checkNewDataDir(changes.dataDir, abs, confine);
  if (changes.codeBase !== undefined) {
    if (changes.dataDir !== undefined) throw new Error('Save either a code base or a data folder, not both.');
    next.codeBase = checkNewCodeBase(changes.codeBase, abs);
  }
  validateConfig(next, abs);
  // addProject: { codeBase | dataDir, name? } appended to the list; replaceActive: the active project's list entry takes the new path.
  let add: RawEntry | null = null;
  if (changes.addProject !== undefined) {
    const p = changes.addProject as RawEntry | null;
    if (p === null || typeof p !== 'object' || Array.isArray(p)) throw new Error('addProject must be an object with a codeBase or a dataDir.');
    if ((p.codeBase === undefined) === (p.dataDir === undefined)) throw new Error('addProject needs exactly one of codeBase and dataDir.');
    add = p.codeBase !== undefined ? { codeBase: checkNewCodeBase(p.codeBase, abs) } : { dataDir: checkNewDataDir(p.dataDir, abs, confine) };
    if (p.name !== undefined) {
      if (typeof p.name !== 'string') throw new Error('The project name must be text.');
      if (p.name.trim()) add = { name: p.name.trim(), ...add };
    }
  }
  const replace = changes.replaceActive === true;
  if (replace && next.codeBase === undefined && next.dataDir === undefined) throw new Error('replaceActive needs a new codeBase or dataDir.');
  if (add && replace) throw new Error('Add a project or replace the active one, not both.');
  const before = (add || replace) ? loadConfig({ file: abs }) : null;
  let doc: YAML.Document;
  try {
    doc = YAML.parseDocument(fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '');
  } catch (err) {
    throw new Error(`${abs}: cannot read the config file (${messageOf(err)})`);
  }
  if (doc.errors.length) throw new Error(`${abs}: not valid YAML (${String(doc.errors[0]!.message).split('\n')[0]})`);
  if (doc.contents === null) doc.contents = doc.createNode({});
  const oldRaw: RawConfig = doc.toJS() || {};
  for (const [key, value] of Object.entries(next)) doc.set(key, value);
  if (next.codeBase !== undefined) doc.delete('dataDir');
  if (next.dataDir !== undefined) doc.delete('codeBase');
  if (add) {
    const entry = resolveEntry(add, path.dirname(abs));
    if (!before!.projects.some((p) => !p.synthetic && sameFolder(p.dataDir, entry.dataDir))) { // `before` is loaded whenever `add` is set
      if (!doc.has('projects')) {
        // First add: the active path (as written, or the default data folder) becomes the first entry.
        const active = oldRaw.codeBase !== undefined ? { codeBase: oldRaw.codeBase } : { dataDir: oldRaw.dataDir !== undefined ? oldRaw.dataDir : DEFAULT_DATA_DIR };
        const seeded = before!.projects.some((p) => sameFolder(p.dataDir, entry.dataDir)) ? [] : [active];
        doc.set('projects', doc.createNode(seeded));
      }
      doc.addIn(['projects'], doc.createNode(add));
    }
  }
  if (replace) {
    const old = before!.projects[before!.activeProject]; // `before` is loaded whenever `replace` is set
    if (old && !old.synthetic) {
      const key = next.codeBase !== undefined ? 'codeBase' : 'dataDir';
      const other = key === 'codeBase' ? 'dataDir' : 'codeBase';
      doc.setIn(['projects', before!.activeProject, key], next[key]);
      doc.deleteIn(['projects', before!.activeProject, other]);
    }
  }
  validateConfig(doc.toJS(), abs);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, String(doc));
  fs.renameSync(tmp, abs);
  return loadConfig({ file: abs });
}
