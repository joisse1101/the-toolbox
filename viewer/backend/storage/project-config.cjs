'use strict';
// The project config: a YAML file with `projectName` and one folder key, `codeBase` or `dataDir`. Load, validate and
// default rules only; pure Node. The file is planner/planner.config.yaml unless PLANNER_CONFIG names another one. A
// relative dataDir or codeBase is resolved against the folder that holds the config file. A codeBase's data folder is
// `<codeBase>/.plans`.

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { PLANS_DIR } = require('./backlog-paths.cjs');
const {
  confineDir, confineCodeBase, checkFolder, checkCodeBase, initFolders, initCodeBase, copyData, copyToCodeBase, planCopy, planCopyToCodeBase, migrateOlderLayout,
} = require('./project-folders.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_CONFIG_PATH = path.join(ROOT, 'planner', 'planner.config.yaml');
const DEFAULT_DATA_DIR = path.join(ROOT, 'planner', 'data');
const KEYS = ['projectName', 'codeBase', 'dataDir', 'projects'];
const ENTRY_KEYS = ['name', 'codeBase', 'dataDir'];

// The config file to read: PLANNER_CONFIG (relative to the working folder) or the default place.
function configPath(env = process.env) {
  return env.PLANNER_CONFIG ? path.resolve(env.PLANNER_CONFIG) : DEFAULT_CONFIG_PATH;
}

// Checks a parsed config object; throws an Error naming the bad key. `file` is only for the message.
function validateConfig(raw, file = 'config') {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${file}: expected keys ${KEYS.join(' and ')}, found something else`);
  for (const key of Object.keys(raw)) {
    if (!KEYS.includes(key)) throw new Error(`${file}: unknown key "${key}" (allowed: ${KEYS.join(', ')})`);
  }
  if ('projectName' in raw && typeof raw.projectName !== 'string') throw new Error(`${file}: "projectName" must be text`);
  if ('dataDir' in raw) {
    if (typeof raw.dataDir !== 'string') throw new Error(`${file}: "dataDir" must be text`);
    if (!raw.dataDir.trim()) throw new Error(`${file}: "dataDir" must not be empty`);
  }
  if ('codeBase' in raw) {
    if (typeof raw.codeBase !== 'string') throw new Error(`${file}: "codeBase" must be text`);
    if (!raw.codeBase.trim()) throw new Error(`${file}: "codeBase" must not be empty`);
  }
  if ('codeBase' in raw && 'dataDir' in raw) throw new Error(`${file}: set only one of "codeBase" and "dataDir", found both`);
  if ('projects' in raw) validateProjects(raw.projects, file);
  return raw;
}

// Checks the saved project list; every error names "projects" and the entry's position (counted from 0).
function validateProjects(list, file) {
  if (!Array.isArray(list)) throw new Error(`${file}: "projects" must be a list of entries`);
  list.forEach((entry, i) => {
    const at = `${file}: "projects" entry ${i} (projects[${i}])`;
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`${at} must be an object with "codeBase" or "dataDir" and an optional "name"`);
    for (const key of Object.keys(entry)) {
      if (!ENTRY_KEYS.includes(key)) throw new Error(`${at} has unknown key "${key}" (allowed: ${ENTRY_KEYS.join(', ')})`);
    }
    if ('name' in entry && typeof entry.name !== 'string') throw new Error(`${at}: "name" must be text`);
    const hasCode = 'codeBase' in entry;
    const hasData = 'dataDir' in entry;
    if (hasCode && hasData) throw new Error(`${at}: set only one of "codeBase" and "dataDir", found both`);
    if (!hasCode && !hasData) throw new Error(`${at}: needs "codeBase" or "dataDir", found neither`);
    const key = hasCode ? 'codeBase' : 'dataDir';
    if (typeof entry[key] !== 'string') throw new Error(`${at}: "${key}" must be text`);
    if (!entry[key].trim()) throw new Error(`${at}: "${key}" must not be empty`);
  });
}

// Reads the config. A missing file gives the defaults; a bad one throws naming the key or the file.
// Returns { projectName, codeBase (absolute, or null), dataDir (absolute), configPath, exists }.
function loadConfig({ file = configPath() } = {}) {
  const abs = path.resolve(file);
  let text = null;
  try {
    text = fs.readFileSync(abs, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw new Error(`${abs}: cannot read the config file (${err.message})`);
  }
  let raw = {};
  if (text !== null) {
    let parsed;
    try {
      parsed = YAML.parse(text);
    } catch (err) {
      throw new Error(`${abs}: not valid YAML (${String(err.message).split('\n')[0]})`);
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
function resolveEntry(entry, base) {
  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  if (entry.codeBase !== undefined) {
    const codeBase = path.resolve(base, entry.codeBase.trim());
    return { name, codeBase, dataDir: path.join(codeBase, PLANS_DIR) };
  }
  return { name, codeBase: null, dataDir: path.resolve(base, entry.dataDir.trim()) };
}

// Entries and the active project are matched by resolved absolute data folder (case-insensitive on Windows).
function sameFolder(a, b) {
  const x = path.resolve(a);
  const y = path.resolve(b);
  return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y;
}

// The new value of a folder key, checked as saveConfig has always checked it; returns the trimmed text.
function checkNewDataDir(value, abs, confine) {
  validateConfig({ dataDir: value }, abs);
  const c = confineDir(value, confine);
  if (!c.ok) throw new Error(c.reason);
  if (!fs.existsSync(c.dir)) throw new Error('The folder does not exist: it must be created by init or the copy first.');
  return value.trim();
}
function checkNewCodeBase(value, abs) {
  validateConfig({ codeBase: value }, abs);
  const dir = value.trim();
  if (!path.isAbsolute(dir)) throw new Error('The code base must be an absolute path.');
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error('The code base folder does not exist.');
  return dir;
}

// Saves `changes` ({ projectName?, dataDir?, codeBase? }) into the config file through the YAML document API, so comments the user
// wrote survive. Validates first and writes nothing when a value is refused. A new dataDir must be an absolute path that
// passes confineDir and already exists (init or the copy creates it). A new codeBase must be an absolute path to an
// existing folder (the server applies its own confinement first). Saving one folder key removes the other in the same
// write, so the file never holds both. Returns the loaded config; throws an Error with the reason.
function saveConfig(changes, { file = configPath(), confine } = {}) {
  const abs = path.resolve(file);
  const next = {};
  if (changes.projectName !== undefined) next.projectName = typeof changes.projectName === 'string' ? changes.projectName.trim() : changes.projectName;
  if (changes.dataDir !== undefined) next.dataDir = checkNewDataDir(changes.dataDir, abs, confine);
  if (changes.codeBase !== undefined) {
    if (changes.dataDir !== undefined) throw new Error('Save either a code base or a data folder, not both.');
    next.codeBase = checkNewCodeBase(changes.codeBase, abs);
  }
  validateConfig(next, abs);
  // addProject: { codeBase | dataDir, name? } appended to the list; replaceActive: the active project's list entry takes the new path.
  let add = null;
  if (changes.addProject !== undefined) {
    const p = changes.addProject;
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
  let doc;
  try {
    doc = YAML.parseDocument(fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '');
  } catch (err) {
    throw new Error(`${abs}: cannot read the config file (${err.message})`);
  }
  if (doc.errors.length) throw new Error(`${abs}: not valid YAML (${String(doc.errors[0].message).split('\n')[0]})`);
  if (doc.contents === null) doc.contents = doc.createNode({});
  const oldRaw = doc.toJS() || {};
  for (const [key, value] of Object.entries(next)) doc.set(key, value);
  if (next.codeBase !== undefined) doc.delete('dataDir');
  if (next.dataDir !== undefined) doc.delete('codeBase');
  if (add) {
    const entry = resolveEntry(add, path.dirname(abs));
    if (!before.projects.some((p) => !p.synthetic && sameFolder(p.dataDir, entry.dataDir))) {
      if (!doc.has('projects')) {
        // First add: the active path (as written, or the default data folder) becomes the first entry.
        const active = oldRaw.codeBase !== undefined ? { codeBase: oldRaw.codeBase } : { dataDir: oldRaw.dataDir !== undefined ? oldRaw.dataDir : DEFAULT_DATA_DIR };
        const seeded = before.projects.some((p) => sameFolder(p.dataDir, entry.dataDir)) ? [] : [active];
        doc.set('projects', doc.createNode(seeded));
      }
      doc.addIn(['projects'], doc.createNode(add));
    }
  }
  if (replace) {
    const old = before.projects[before.activeProject];
    if (old && !old.synthetic) {
      const key = next.codeBase !== undefined ? 'codeBase' : 'dataDir';
      const other = key === 'codeBase' ? 'dataDir' : 'codeBase';
      doc.setIn(['projects', before.activeProject, key], next[key]);
      doc.deleteIn(['projects', before.activeProject, other]);
    }
  }
  validateConfig(doc.toJS(), abs);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, String(doc));
  fs.renameSync(tmp, abs);
  return loadConfig({ file: abs });
}

module.exports = {
  ROOT, DEFAULT_CONFIG_PATH, DEFAULT_DATA_DIR, KEYS, configPath, validateConfig, loadConfig, saveConfig,
  confineDir, confineCodeBase, checkFolder, checkCodeBase, initFolders, initCodeBase, copyData, copyToCodeBase, planCopy, planCopyToCodeBase, migrateOlderLayout,
};
