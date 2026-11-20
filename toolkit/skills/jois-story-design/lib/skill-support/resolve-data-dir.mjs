// GENERATED. Do not edit this copy.
// Finds the backlog data folder for a skill that runs outside the planner.
//
// It looks only at the `.plans` folder in the current folder, and never at a parent folder, an environment variable or
// a config file.
//
// resolveDataDir() answers one of
//   { status: 'found', dataDir }            the `.plans` folder of the current folder
//   { status: 'none', cwd }                 no `.plans` in the current folder: say so, write nothing until the user answers
//   { status: 'error', path, problem }      `.plans` is a file or cannot be read: report it, do not guess a folder

import fs from 'node:fs';
import path from 'node:path';

// The same name as PLANS_DIR in viewer/shared/storage/backlog-paths.ts. This file imports nothing from the viewer,
// so the literal is repeated and a test checks the two match.
export const PLANS_DIR = '.plans';

                           
                                        
                                   
                                                       

export function resolveDataDir({ cwd = process.cwd() }                   = {})                {
  const here = path.resolve(cwd);
  const plans = path.join(here, PLANS_DIR);
  let stat                  = null;
  try {
    stat = fs.statSync(plans);
  } catch (err) {
    const e = err                         ; // a failed stat is a system error
    if (e.code !== 'ENOENT' && e.code !== 'ENOTDIR') return { status: 'error', path: plans, problem: `cannot be read: ${e.message}` };
  }
  if (stat?.isDirectory()) return { status: 'found', dataDir: plans };
  if (stat) return { status: 'error', path: plans, problem: 'is a file, not a folder' };
  return { status: 'none', cwd: here };
}

// The data folder for a script, or throws an Error whose message a person can act on (never a guessed folder).
export function dataDirOrThrow(options                   )         {
  const found = resolveDataDir(options);
  if (found.status === 'found') return found.dataDir;
  if (found.status === 'error') {
    throw new Error(`The ${PLANS_DIR} folder ${found.path} ${found.problem}. Fix or remove it, then run again.`);
  }
  throw new Error(`No data folder was found in ${found.cwd}: there is no ${PLANS_DIR} folder here (parent folders are not searched). Tell the user, and ask whether to create ${PLANS_DIR} here, or to start the session in the code base folder. Write nothing until they answer.`);
}
