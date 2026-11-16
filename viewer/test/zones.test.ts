import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The zones depend on each other in one direction only (see CLAUDE.md). This reads every source file's relative and
// `#` alias imports and checks where each one points. The aliases come from the `imports` field of viewer/package.json.
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE = /\.(c|m)?[jt]sx?$/;
const SKIP = new Set(['node_modules', 'dist', '.git', 'data', '.trees']);
const IMPORT = /(?:from|import|require\(|import\()\s*['"](\.{1,2}\/[^'"?]+|#[^'"?]+)/g;

const rel = (p: string) => path.relative(REPO, p).split(path.sep).join('/');

function sources(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sources(full));
    else if (SOURCE.test(entry.name)) found.push(full);
  }
  return found;
}

const starts = (file: string, folder: string) => file === folder || file.startsWith(`${folder}/`);

// Folders a file may import from, by the zone the file is in; null for files no rule covers.
function allowed(file: string) {
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
function frontendBreach(file: string, target: string) {
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

// The alias map, read from viewer/package.json so the test follows the config: "#shared/" -> "viewer/shared/".
function readAliases(): Map<string, string> {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'viewer', 'package.json'), 'utf8')) as { imports?: Record<string, string> };
  const aliases = new Map<string, string>();
  for (const [key, value] of Object.entries(pkg.imports ?? {})) {
    if (key.endsWith('/*') && value.endsWith('/*')) {
      aliases.set(key.slice(0, -1), path.posix.join('viewer', value.slice(0, -1)));
    }
  }
  return aliases;
}
const ALIASES = readAliases();

// Resolves one import specifier of `file` to a repo-relative path. Returns null for a `#` specifier no alias maps.
function resolveSpecifier(file: string, specifier: string, aliases = ALIASES): string | null {
  if (!specifier.startsWith('#')) return path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
  for (const [prefix, folder] of aliases) {
    if (specifier.startsWith(prefix)) return path.posix.normalize(folder + specifier.slice(prefix.length));
  }
  return null;
}

const specifiers = (text: string) => [...text.matchAll(IMPORT)].map((m) => m[1]);

// The zone breaches of a file's text: an import outside the folders its zone may use, or an unmapped `#` import.
function zoneBreaches(file: string, text: string, aliases = ALIASES): string[] {
  const breaches: string[] = [];
  for (const specifier of specifiers(text)) {
    const target = resolveSpecifier(file, specifier, aliases);
    if (target === null) breaches.push(`${file} -> ${specifier} (no alias maps it)`);
    else if (!allowed(file)!.some((folder) => starts(target, folder))) breaches.push(`${file} -> ${target}`);
  }
  return breaches;
}

// The frontend-rule breaches of a file's text. An unmapped `#` import is reported by zoneBreaches, so it is skipped here.
function frontendBreaches(file: string, text: string, aliases = ALIASES): string[] {
  const breaches: string[] = [];
  for (const specifier of specifiers(text)) {
    const target = resolveSpecifier(file, specifier, aliases);
    const rule = target === null ? null : frontendBreach(file, target);
    if (rule) breaches.push(`${file} -> ${target} (${rule})`);
  }
  return breaches;
}

const read = (file: string) => fs.readFileSync(path.join(REPO, file), 'utf8');

const files = [...sources(path.join(REPO, 'viewer')), ...sources(path.join(REPO, 'toolkit'))]
  .map(rel).filter((f) => allowed(f) && !starts(f, 'viewer/test'));

test('every source file imports only from the zones its own zone may depend on', () => {
  assert.ok(files.length > 50, `found ${files.length} source files; the scan is looking in the wrong place`);
  assert.deepEqual(files.flatMap((file) => zoneBreaches(file, read(file))), []);
});

test('inside the frontend, shared/ stays below the tools, and tools and features stay apart', () => {
  assert.ok(files.some((f) => starts(f, `${SRC}/tools/backlog/features`)), 'no feature files found');
  assert.deepEqual(files.flatMap((file) => frontendBreaches(file, read(file))), []);
});

test('the zone rules cover the layout: shared, backend, frontend, skills and toolkit all have source files', () => {
  for (const folder of ['viewer/shared', 'viewer/backend', 'viewer/frontend', 'viewer/shared/skill-support', 'toolkit/skills/jois-story-review', 'toolkit/skills/jois-story-plan']) {
    assert.ok(files.some((f) => starts(f, folder)), `no source files under ${folder}`);
  }
});

test('the rules reject what they are for', () => {
  const imports = (from: string, to: string) => allowed(from)!.some((f) => starts(to, f));
  assert.equal(imports('viewer/shared/backlog/ids.ts', 'viewer/backend/storage/paths.ts'), false);
  assert.equal(imports('viewer/shared/backlog/ids.ts', 'viewer/frontend/src/shared/lib/word-diff.ts'), false);
  assert.equal(imports('viewer/backend/server.ts', 'viewer/frontend/src/shared/lib/word-diff.ts'), false);
  assert.equal(imports('viewer/frontend/src/main.tsx', 'viewer/backend/storage/paths.ts'), false);
  assert.equal(imports('viewer/backend/server.ts', 'viewer/shared/backlog/model.ts'), true);
  assert.equal(imports('viewer/frontend/src/tools/backlog/BacklogTool.jsx', 'viewer/shared/guidelines/product-backlog.md'), true);
  assert.equal(imports('toolkit/skills/jois-story-plan/diagrams/checks.js', 'viewer/shared/backlog/model.ts'), false);
  assert.equal(imports('toolkit/skills/jois-story-review/read-backlog.mjs', 'viewer/shared/backlog/model.ts'), false);
  assert.equal(imports('toolkit/skills/jois-story-review/lib/backlog/model.js', 'viewer/shared/backlog/ids.js'), false);
  assert.equal(imports('toolkit/skills/jois-story-review/write-review.mjs', 'viewer/shared/guidelines/product-backlog.md'), false);
  assert.equal(imports('toolkit/skills/jois-story-review/write-review.mjs', 'viewer/backend/server.ts'), false);
  assert.equal(imports('toolkit/skills/jois-story-propose/write-proposal.mjs', 'viewer/shared/backlog/model.ts'), false);
  assert.equal(imports('viewer/frontend/src/main.tsx', 'toolkit/skills/jois-story-review/write-review.mjs'), false);
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

test('the alias map is read from package.json and covers the three zones', () => {
  assert.equal(ALIASES.get('#shared/'), 'viewer/shared/');
  assert.equal(ALIASES.get('#backend/'), 'viewer/backend/');
  assert.equal(ALIASES.get('#frontend/'), 'viewer/frontend/');
});

test('an aliased import is checked against the zone rules', () => {
  const from = (file: string, specifier: string) => zoneBreaches(file, `import x from '${specifier}';`);
  assert.equal(from('viewer/shared/backlog/ids.ts', '#backend/x.ts').length, 1);
  assert.equal(from('viewer/backend/server.ts', '#frontend/x.ts').length, 1);
  assert.equal(from('viewer/frontend/src/main.tsx', '#backend/x.ts').length, 1);
  assert.equal(from('viewer/backend/server.ts', '#shared/backlog/model.ts').length, 0);
  assert.equal(from('viewer/frontend/src/main.tsx', '#frontend/src/app/routes.tsx').length, 0);
});

test('a # import that no alias maps is a breach', () => {
  const breaches = zoneBreaches('viewer/backend/server.ts', `import x from '#nope/x.ts';`);
  assert.equal(breaches.length, 1);
  assert.match(breaches[0], /#nope\/x\.ts/);
});

test('an aliased import is checked against the frontend rules', () => {
  const T = `${SRC}/tools/backlog`;
  const breaches = frontendBreaches(`${T}/features/stories/StoriesTab.tsx`, `import g from '#frontend/src/tools/backlog/features/graph/graph.ts';`);
  assert.equal(breaches.length, 1);
  assert.match(breaches[0], /another feature/);
  assert.deepEqual(frontendBreaches(`${T}/features/stories/StoriesTab.tsx`, `import g from '#frontend/src/shared/ui/EmptyState.tsx';`), []);
});
