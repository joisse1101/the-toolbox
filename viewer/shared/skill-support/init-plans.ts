// Creates `.plans` in the current folder, for a skill whose user said yes to it. It creates that one folder and nothing
// else, and refuses when the name is taken by a file. The skill runs it only after asking.
//
// initPlans({ cwd }) answers one of
//   { ok: true, created: true, dir }     the folder was made
//   { ok: true, created: false, dir }    it was already there, nothing changed
//   { ok: false, error }                 refused, nothing was made

import fs from 'node:fs';
import path from 'node:path';
import { PLANS_DIR } from './resolve-data-dir.ts';

export function initPlans({ cwd = process.cwd() }: { cwd?: string } = {}): { ok: true; created: boolean; dir: string } | { ok: false; error: string } {
  const here = path.resolve(cwd);
  const dir = path.join(here, PLANS_DIR);
  let stat: fs.Stats | null = null;
  try {
    stat = fs.statSync(dir);
  } catch (err) {
    const e = err as NodeJS.ErrnoException; // a failed stat is a system error
    if (e.code !== 'ENOENT' && e.code !== 'ENOTDIR') return { ok: false, error: `Cannot read ${dir}: ${e.message}` };
  }
  if (stat?.isDirectory()) return { ok: true, created: false, dir };
  if (stat) return { ok: false, error: `${dir} is a file, not a folder. Nothing was created.` };
  try {
    fs.mkdirSync(dir);
  } catch (err) {
    return { ok: false, error: `Cannot create ${dir}: ${(err as Error).message}` };
  }
  return { ok: true, created: true, dir };
}
