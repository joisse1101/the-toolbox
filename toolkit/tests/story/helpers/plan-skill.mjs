// The plan skill needs mermaid and jsdom in its own folder (package.json, package-lock.json). A test never installs into the
// repository: it makes a temp copy of the skill folder and gives the copy a node_modules folder built once by `npm ci` from
// the skill's own lock file and kept in the system temp folder, keyed by the lock file's hash.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PLAN_SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'skills', 'jois-story-plan');

function installedModules() {
  const hash = crypto.createHash('sha256');
  for (const f of ['package.json', 'package-lock.json']) hash.update(fs.readFileSync(path.join(PLAN_SKILL_DIR, f)));
  const final = path.join(os.tmpdir(), `jois-story-plan-modules-${hash.digest('hex').slice(0, 12)}`);
  if (fs.existsSync(path.join(final, 'node_modules', 'mermaid'))) return path.join(final, 'node_modules');

  const build = fs.mkdtempSync(path.join(os.tmpdir(), 'jois-story-plan-install-'));
  for (const f of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(PLAN_SKILL_DIR, f), path.join(build, f));
  const r = spawnSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: build, encoding: 'utf8', shell: true });
  if (r.status !== 0) throw new Error(`npm ci failed in ${build} (exit ${r.status}): ${r.stdout}${r.stderr}`);
  try {
    fs.renameSync(build, final); // atomic; another test process may have finished first, then its copy is used
  } catch {
    fs.rmSync(build, { recursive: true });
  }
  return path.join(final, 'node_modules');
}

// A temp copy of the skill folder, with the installed packages (default) or without them. -> { dir, load(file) }
export function planSkillCopy({ withPackages = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-skill-copy-'));
  fs.cpSync(PLAN_SKILL_DIR, dir, { recursive: true, filter: (src) => !src.split(path.sep).includes('node_modules') });
  if (withPackages) fs.symlinkSync(installedModules(), path.join(dir, 'node_modules'), 'junction');
  return { dir, load: (file) => import(pathToFileURL(path.join(dir, file)).href) };
}
