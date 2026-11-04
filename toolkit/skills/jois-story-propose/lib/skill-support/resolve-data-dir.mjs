// GENERATED. Do not edit this copy.
// Finds the backlog data folder for a skill that runs outside the planner, with no `yaml` package.
//
// Order: the file the PLANNER_CONFIG variable names, then a `.plans` folder in the current folder, then a
// planner.config.yaml in the current folder. It never reads a parent folder. Only the `codeBase` and `dataDir` keys are
// read, from a flat `key: value` file; a relative value is resolved against the config file's folder, as the planner
// does, and a `codeBase` stands for `<codeBase>/.plans`.
//
// resolveDataDir() answers one of
//   { status: 'found', dataDir, configFile }   the folder to use (configFile is null when it is the current folder's .plans)
//   { status: 'none', cwd }                    nothing in the current folder: say so, write nothing until the user answers
//   { status: 'error', configFile, problem }   the config or `.plans` cannot be used: report both, do not guess a folder

import fs from 'node:fs';
import path from 'node:path';

export const CONFIG_NAME = 'planner.config.yaml';
// The same name as PLANS_DIR in planner/logic/storage/backlog-paths.cjs. This file imports nothing from the planner,
// so the literal is repeated and a test checks the two match.
export const PLANS_DIR = '.plans';

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

function readConfig(configFile) {
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
  const base = path.dirname(configFile);
  if (keys.codeBase && keys.dataDir) return { status: 'error', configFile, problem: 'has both a `codeBase` and a `dataDir` key; keep one' };
  if (keys.codeBase) return { status: 'found', dataDir: path.join(path.resolve(base, keys.codeBase), PLANS_DIR), configFile };
  if (keys.dataDir) return { status: 'found', dataDir: path.resolve(base, keys.dataDir), configFile };
  return { status: 'error', configFile, problem: 'has neither a `codeBase` nor a `dataDir` key' };
}

export function resolveDataDir({ env = process.env, cwd = process.cwd() } = {}) {
  const here = path.resolve(cwd);
  if (env.PLANNER_CONFIG) return readConfig(path.resolve(here, env.PLANNER_CONFIG));

  const plans = path.join(here, PLANS_DIR);
  let stat = null;
  try {
    stat = fs.statSync(plans);
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') return { status: 'error', configFile: plans, problem: `cannot be read: ${err.message}` };
  }
  if (stat?.isDirectory()) return { status: 'found', dataDir: plans, configFile: null };
  if (stat) return { status: 'error', configFile: plans, problem: 'is a file, not a folder' };

  const config = path.join(here, CONFIG_NAME);
  if (fs.existsSync(config)) return readConfig(config);
  return { status: 'none', cwd: here };
}

// The data folder for a script, or throws an Error whose message a person can act on (never a guessed folder).
export function dataDirOrThrow(options) {
  const found = resolveDataDir(options);
  if (found.status === 'found') return found.dataDir;
  if (found.status === 'error') {
    throw new Error(`The data folder setting ${found.configFile} ${found.problem}. Fix or remove it, or set PLANNER_CONFIG to another config file.`);
  }
  throw new Error(`No data folder was found in ${found.cwd}: no PLANNER_CONFIG variable, no ${PLANS_DIR} folder and no ${CONFIG_NAME} here (parent folders are not searched). Tell the user, and ask whether to create ${PLANS_DIR} here, or to start the session in the code base folder or set PLANNER_CONFIG. Write nothing until they answer.`);
}
