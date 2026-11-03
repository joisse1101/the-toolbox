import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The zones depend on each other in one direction only (see CLAUDE.md). This reads every source file's relative
// imports and checks where each one points.
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE = /\.(c|m)?jsx?$/;
const SKIP = new Set(['node_modules', 'dist', '.git', 'data', '.trees']);
const IMPORT = /(?:from|import|require\(|import\()\s*['"](\.{1,2}\/[^'"?]+)/g;

const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');

function sources(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sources(full));
    else if (SOURCE.test(entry.name)) found.push(full);
  }
  return found;
}

const starts = (file, folder) => file === folder || file.startsWith(`${folder}/`);

// Folders a file may import from, by the zone the file is in; null for files no rule covers.
function allowed(file) {
  if (starts(file, 'planner/logic')) return ['planner/logic'];
  if (starts(file, 'planner/portal')) return ['planner/portal', 'planner/logic', 'planner/guidelines'];
  if (starts(file, 'planner/claude')) return ['planner/claude', 'planner/logic', '.claude/skills', 'toolkit/skills']; // toolkit/skills: until 8.1 deletes the MCP servers that still call the moved writers
  // The story skills are toolkit items, not planner zones. Until each one moves into toolkit/skills/, its copy under
  // .claude/skills/ may still import planner/logic (including skill-support/); the toolkit may import nothing outside itself.
  const skill = file.match(/^\.claude\/skills\/([^/]+)\//);
  if (skill) return [`.claude/skills/${skill[1]}`, 'planner/logic'];
  if (starts(file, 'toolkit')) return ['toolkit'];
  return null;
}

function imports(file) {
  const text = fs.readFileSync(path.join(REPO, file), 'utf8');
  return [...text.matchAll(IMPORT)].map((m) => rel(path.resolve(path.dirname(path.join(REPO, file)), m[1])));
}

const files = [...sources(path.join(REPO, 'planner')), ...sources(path.join(REPO, '.claude')), ...sources(path.join(REPO, 'toolkit'))]
  .map(rel).filter((f) => allowed(f) && !starts(f, 'planner/test'));

test('every source file imports only from the zones its own zone may depend on', () => {
  assert.ok(files.length > 50, `found ${files.length} source files; the scan is looking in the wrong place`);
  const breaches = [];
  for (const file of files) {
    for (const target of imports(file)) {
      if (!allowed(file).some((folder) => starts(target, folder))) breaches.push(`${file} -> ${target}`);
    }
  }
  assert.deepEqual(breaches, []);
});

test('the zone rules cover the layout: logic, portal, claude, skills and toolkit all have source files', () => {
  for (const folder of ['planner/logic', 'planner/portal', 'planner/logic/skill-support', 'planner/claude', 'toolkit/skills/jois-story-review', 'toolkit/skills/jois-story-plan']) {
    assert.ok(files.some((f) => starts(f, folder)), `no source files under ${folder}`);
  }
});

test('the rules reject what they are for', () => {
  assert.equal(allowed('planner/logic/backlog/ids.js').some((f) => starts('planner/portal/web/lib/word-diff.js', f)), false);
  assert.equal(allowed('toolkit/skills/jois-story-plan/diagrams/checks.js').some((f) => starts('planner/logic/backlog/model.js', f)), false);
  assert.equal(allowed('planner/portal/web/main.jsx').some((f) => starts('toolkit/skills/jois-story-review/write-review.mjs', f)), false);
  assert.equal(allowed('toolkit/skills/jois-story-review/read-backlog.mjs').some((f) => starts('planner/logic/backlog/model.js', f)), false);
  assert.equal(allowed('toolkit/skills/jois-story-review/lib/backlog/model.js').some((f) => starts('planner/logic/backlog/ids.js', f)), false);
  assert.equal(allowed('toolkit/skills/jois-story-review/write-review.mjs').some((f) => starts('planner/guidelines/product-backlog.md', f)), false);
  assert.equal(allowed('toolkit/skills/jois-story-review/write-review.mjs').some((f) => starts('planner/portal/server/flatten.js', f)), false);
  assert.equal(allowed('toolkit/skills/jois-story-propose/write-proposal.mjs').some((f) => starts('planner/logic/backlog/model.js', f)), false);
});
