import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { putFile } from './helpers/backlog-tree.mjs';
import { tempProject } from './helpers/temp-project.mjs';

// A story script finds its data folder only as `.plans` in the current folder. PLANNER_CONFIG belongs to the planner portal, so a
// valid config naming another data folder must change nothing (spec scenario "The variable is ignored").
const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'jois-story-explore', 'read-story-context.mjs');

test('CLI: PLANNER_CONFIG naming another data folder is ignored; the script uses .plans in the current folder', () => {
  const project = tempProject();
  putFile(project.dataDir, 'inplans', 'backlog', 'ID,Epic\r\nB1-IAM-0001,IAM\r\n');
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'other-data-'));
  putFile(elsewhere, 'elsewhere', 'backlog', 'ID,Epic\r\nB1-IAM-0001,IAM\r\n');
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'other-config-'));
  const config = path.join(configDir, 'planner.config.yaml');
  fs.writeFileSync(config, `dataDir: ${JSON.stringify(path.resolve(elsewhere))}\n`);

  const r = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', cwd: project.cwd, env: { ...process.env, PLANNER_CONFIG: config } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /inplans/);
  assert.doesNotMatch(r.stdout, /elsewhere/);

  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'no-plans-'));
  const none = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', cwd: bare, env: { ...process.env, PLANNER_CONFIG: config } });
  assert.equal(none.status, 1);
  assert.match(none.stderr, /No data folder was found/);
});
