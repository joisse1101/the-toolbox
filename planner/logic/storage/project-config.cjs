'use strict';
// The project config: a YAML file with `projectName` and `dataDir`. Load, validate and default rules only; pure Node.
// The file is planner/planner.config.yaml unless PLANNER_CONFIG names another one. A relative dataDir is resolved
// against the folder that holds the config file.

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

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

module.exports = { ROOT, DEFAULT_CONFIG_PATH, DEFAULT_DATA_DIR, KEYS, configPath, validateConfig, loadConfig };
