'use strict';
// The project config: a YAML file with `projectName` and `dataDir`. Load, validate and default rules only; pure Node.
// The file is planner/planner.config.yaml unless PLANNER_CONFIG names another one. A relative dataDir is resolved
// against the folder that holds the config file.

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { FOLDERS, confineDir, checkFolder, initFolders, copyData } = require('./project-folders.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_CONFIG_PATH = path.join(ROOT, 'planner', 'planner.config.yaml');
const DEFAULT_DATA_DIR = path.join(ROOT, 'planner', 'data');
const KEYS = ['projectName', 'dataDir'];

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
  return raw;
}

// Reads the config. A missing file gives the defaults; a bad one throws naming the key or the file.
// Returns { projectName, dataDir (absolute), configPath, exists }.
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
  const dataDir = raw.dataDir === undefined ? DEFAULT_DATA_DIR : path.resolve(path.dirname(abs), raw.dataDir.trim());
  return { projectName: raw.projectName ?? '', dataDir, configPath: abs, exists: text !== null };
}

// Saves `changes` ({ projectName?, dataDir? }) into the config file through the YAML document API, so comments the user
// wrote survive. Validates first and writes nothing when a value is refused. A new dataDir must be an absolute path that
// passes confineDir and already exists (init or the copy creates it). Returns the loaded config; throws an Error with the reason.
function saveConfig(changes, { file = configPath(), confine } = {}) {
  const abs = path.resolve(file);
  const next = {};
  if (changes.projectName !== undefined) next.projectName = typeof changes.projectName === 'string' ? changes.projectName.trim() : changes.projectName;
  if (changes.dataDir !== undefined) {
    validateConfig({ dataDir: changes.dataDir }, abs);
    const c = confineDir(changes.dataDir, confine);
    if (!c.ok) throw new Error(c.reason);
    if (!fs.existsSync(c.dir)) throw new Error('The folder does not exist: it must be created by init or the copy first.');
    next.dataDir = changes.dataDir.trim();
  }
  validateConfig(next, abs);
  let doc;
  try {
    doc = YAML.parseDocument(fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '');
  } catch (err) {
    throw new Error(`${abs}: cannot read the config file (${err.message})`);
  }
  if (doc.errors.length) throw new Error(`${abs}: not valid YAML (${String(doc.errors[0].message).split('\n')[0]})`);
  if (doc.contents === null) doc.contents = doc.createNode({});
  for (const [key, value] of Object.entries(next)) doc.set(key, value);
  validateConfig(doc.toJS(), abs);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, String(doc));
  fs.renameSync(tmp, abs);
  return loadConfig({ file: abs });
}

module.exports = {
  ROOT, DEFAULT_CONFIG_PATH, DEFAULT_DATA_DIR, KEYS, configPath, validateConfig, loadConfig, saveConfig,
  FOLDERS, confineDir, checkFolder, initFolders, copyData,
};
