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
  if (starts(file, 'viewer/shared')) return ['viewer/shared'];
  if (starts(file, 'viewer/backend')) return ['viewer/backend', 'viewer/shared'];
  if (starts(file, 'viewer/frontend')) return ['viewer/frontend', 'viewer/shared'];
  // The story skills are toolkit items; the toolkit may import nothing outside itself.
  if (starts(file, 'toolkit')) return ['toolkit'];
  return null;
}

// Rules inside viewer/frontend/src: shared/ stays below the tools, a tool stays apart from other tools, and a feature
// stays apart from other features. app/ may import tools, because it mounts them. Returns the rule broken, or null.
const SRC = 'viewer/frontend/src';
function frontendBreach(file, target) {
  if (!starts(file, SRC)) return null;
  if (starts(file, `${SRC}/shared`) && (starts(target, `${SRC}/tools`) || starts(target, `${SRC}/app`))) {
    return 'shared/ imports tools/ or app/';
  }
  const tool = file.match(/^viewer\/frontend\/src\/tools\/([^/]+)\//);
  if (!tool) return null;
  const otherTool = target.match(/^viewer\/frontend\/src\/tools\/([^/]+)(\/|$)/);
  if (otherTool && otherTool[1] !== tool[1]) return 'a tool imports another tool';
  const feature = file.match(/^viewer\/frontend\/src\/tools\/[^/]+\/features\/([^/]+)\//);
  const otherFeature = target.match(/^viewer\/frontend\/src\/tools\/([^/]+)\/features\/([^/]+)(\/|$)/);
  if (feature && otherFeature && (otherFeature[1] !== tool[1] || otherFeature[2] !== feature[1])) {
    return 'a feature imports another feature';
  }
  return null;
}

function imports(file) {
  const text = fs.readFileSync(path.join(REPO, file), 'utf8');
  return [...text.matchAll(IMPORT)].map((m) => rel(path.resolve(path.dirname(path.join(REPO, file)), m[1])));
}

const files = [...sources(path.join(REPO, 'viewer')), ...sources(path.join(REPO, 'toolkit'))]
  .map(rel).filter((f) => allowed(f) && !starts(f, 'viewer/test'));

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

test('inside the frontend, shared/ stays below the tools, and tools and features stay apart', () => {
  assert.ok(files.some((f) => starts(f, `${SRC}/tools/backlog/features`)), 'no feature files found');
  const breaches = [];
  for (const file of files) {
    for (const target of imports(file)) {
      const rule = frontendBreach(file, target);
      if (rule) breaches.push(`${file} -> ${target} (${rule})`);
    }
  }
  assert.deepEqual(breaches, []);
});

test('the zone rules cover the layout: shared, backend, frontend, skills and toolkit all have source files', () => {
  for (const folder of ['viewer/shared', 'viewer/backend', 'viewer/frontend', 'viewer/shared/skill-support', 'toolkit/skills/jois-story-review', 'toolkit/skills/jois-story-plan']) {
    assert.ok(files.some((f) => starts(f, folder)), `no source files under ${folder}`);
  }
});

test('the rules reject what they are for', () => {
  const imports = (from, to) => allowed(from).some((f) => starts(to, f));
  assert.equal(imports('viewer/shared/backlog/ids.ts', 'viewer/backend/storage/paths.cjs'), false);
  assert.equal(imports('viewer/shared/backlog/ids.ts', 'viewer/frontend/src/shared/lib/word-diff.js'), false);
  assert.equal(imports('viewer/backend/server.cjs', 'viewer/frontend/src/shared/lib/word-diff.js'), false);
  assert.equal(imports('viewer/frontend/src/main.jsx', 'viewer/backend/storage/paths.cjs'), false);
  assert.equal(imports('viewer/backend/server.cjs', 'viewer/shared/backlog/model.ts'), true);
  assert.equal(imports('viewer/frontend/src/tools/backlog/BacklogTool.jsx', 'viewer/shared/guidelines/product-backlog.md'), true);
  assert.equal(imports('toolkit/skills/jois-story-plan/diagrams/checks.js', 'viewer/shared/backlog/model.js'), false);
  assert.equal(imports('toolkit/skills/jois-story-review/read-backlog.mjs', 'viewer/shared/backlog/model.js'), false);
  assert.equal(imports('toolkit/skills/jois-story-review/lib/backlog/model.js', 'viewer/shared/backlog/ids.js'), false);
  assert.equal(imports('toolkit/skills/jois-story-review/write-review.mjs', 'viewer/shared/guidelines/product-backlog.md'), false);
  assert.equal(imports('toolkit/skills/jois-story-review/write-review.mjs', 'viewer/backend/server.cjs'), false);
  assert.equal(imports('toolkit/skills/jois-story-propose/write-proposal.mjs', 'viewer/shared/backlog/model.js'), false);
  assert.equal(imports('viewer/frontend/src/main.jsx', 'toolkit/skills/jois-story-review/write-review.mjs'), false);
});

test('the frontend rules reject what they are for', () => {
  const T = `${SRC}/tools/backlog`;
  assert.ok(frontendBreach(`${SRC}/shared/ui/Info.jsx`, `${T}/shared/issues.js`));
  assert.ok(frontendBreach(`${SRC}/shared/ui/Info.jsx`, `${SRC}/app/routes.jsx`));
  assert.ok(frontendBreach(`${T}/shell/FileBar.jsx`, `${SRC}/tools/other/Thing.jsx`));
  assert.ok(frontendBreach(`${T}/features/stories/StoriesTab.jsx`, `${T}/features/graph/graph.js`));
  assert.equal(frontendBreach(`${T}/features/stories/StoriesTab.jsx`, `${T}/shared/issues.js`), null);
  assert.equal(frontendBreach(`${T}/features/stories/StoriesTab.jsx`, `${SRC}/shared/ui/EmptyState.jsx`), null);
  assert.equal(frontendBreach(`${SRC}/app/routes.jsx`, `${T}/BacklogTool.jsx`), null);
});
