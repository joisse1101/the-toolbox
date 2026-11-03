// Finds the backlog data folder for a skill that runs outside the planner, with no `yaml` package.
//
// Order: the file the PLANNER_CONFIG variable names, then planner.config.yaml in the current folder or the nearest
// parent that has one, then ask the user. Only the `dataDir` key is read, from a flat `key: value` file; a relative
// value is resolved against the config file's folder, as the planner does.
//
// resolveDataDir() answers one of
//   { status: 'found', dataDir, configFile }   the folder to use
//   { status: 'ask' }                          no config anywhere: ask the user, write nothing until there is an answer
//   { status: 'error', configFile, problem }   the config cannot be used: report both, do not guess a folder

import fs from 'node:fs';
import path from 'node:path';

export const CONFIG_NAME = 'planner.config.yaml';

const KEY_LINE = /^([A-Za-z_][\w-]*)\s*:(?:\s+(.*))?$/;

function unquote(raw) {
  const value = (raw ?? '').trim();
  const quoted = /^(["'])(.*?)\1(?:\s+#.*)?$/.exec(value);
  if (quoted) return quoted[2];
  return value.replace(/\s+#.*$/, '').trim();
}

// The flat keys of a config as { key: value }, or throws an Error naming the first line that is not `key: value`.
export function parseFlatConfig(text) {
  const keys = {};
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || line.trimStart().startsWith('#')) return;
    const match = KEY_LINE.exec(line);
    if (!match) throw new Error(`line ${i + 1} is not a flat "key: value" line: ${line.trim()}`);
    keys[match[1]] = unquote(match[2]);
  });
  return keys;
}

// The config file to read: the variable's file, else the nearest planner.config.yaml upward from cwd, else null.
function findConfig(env, cwd) {
  if (env.PLANNER_CONFIG) return path.resolve(cwd, env.PLANNER_CONFIG);
  let dir = path.resolve(cwd);
  for (;;) {
    const candidate = path.join(dir, CONFIG_NAME);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function resolveDataDir({ env = process.env, cwd = process.cwd() } = {}) {
  const configFile = findConfig(env, cwd);
  if (!configFile) return { status: 'ask' };

  let text;
  try {
    text = fs.readFileSync(configFile, 'utf8');
  } catch (err) {
    return { status: 'error', configFile, problem: `cannot be read: ${err.message}` };
  }
  let keys;
  try {
    keys = parseFlatConfig(text);
  } catch (err) {
    return { status: 'error', configFile, problem: err.message };
  }
  if (!keys.dataDir) return { status: 'error', configFile, problem: 'has no `dataDir` key' };
  return { status: 'found', dataDir: path.resolve(path.dirname(configFile), keys.dataDir), configFile };
}

// The data folder for a script, or throws an Error whose message a person can act on (never a guessed folder).
export function dataDirOrThrow(options) {
  const found = resolveDataDir(options);
  if (found.status === 'found') return found.dataDir;
  if (found.status === 'error') {
    throw new Error(`The data folder config ${found.configFile} ${found.problem}. Fix that file, or set PLANNER_CONFIG to another config file.`);
  }
  throw new Error(`No data folder is set: no PLANNER_CONFIG variable and no ${CONFIG_NAME} in this folder or a parent. Ask the user for the path of their ${CONFIG_NAME}, then run the script again with PLANNER_CONFIG set to it.`);
}
