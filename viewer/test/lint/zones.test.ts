import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

// Guards that the zone rules in viewer/eslint.config.mjs still fire (see CLAUDE.md, "Zones"). Each case lints one import
// as text under a real zone path, so no fixture file sits in the source tree. A breach must raise
// `boundaries/dependencies`; an allowed import must raise nothing. The plugin ignores an import it cannot resolve, so
// every target below is a file that exists. An importing file that does not exist is fine, because only its path counts.
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
// The plugin matches the element patterns against paths relative to the process folder, and `npm test` starts in
// viewer/, so the test moves to the repo root first (each test file runs in its own process).
process.chdir(REPO);
const eslint = new ESLint({ cwd: REPO, overrideConfigFile: path.join(REPO, 'viewer', 'eslint.config.mjs') });

const SRC = 'viewer/frontend/src';
const TOOL = `${SRC}/tools/backlog`;

// The messages for `import x from '<specifier>'` written in `file`, both repo-relative paths. A specifier that starts
// with `.` is given as a repo-relative target and turned into a path relative to the importing file.
async function lintImport(file: string, target: string, alias?: string): Promise<string[]> {
  let specifier = alias;
  if (specifier === undefined) {
    specifier = path.posix.relative(path.posix.dirname(file), target);
    if (!specifier.startsWith('.')) specifier = `./${specifier}`;
  }
  const [result] = await eslint.lintText(`import x from '${specifier}';\nexport default x;\n`, { filePath: path.join(REPO, file) });
  return result.messages.map((m) => `${m.ruleId ?? 'parse'}: ${m.message}`);
}

const breach = async (file: string, target: string, alias?: string) => {
  const messages = await lintImport(file, target, alias);
  assert.ok(messages.some((m) => m.startsWith('boundaries/dependencies')), `${file} -> ${alias ?? target} raised no breach: ${messages.join(' | ')}`);
};
const clean = async (file: string, target: string, alias?: string) => {
  assert.deepEqual(await lintImport(file, target, alias), [], `${file} -> ${alias ?? target} should be allowed`);
};

test('shared/ importing the backend or the frontend is a breach, by relative path and by alias', async () => {
  await breach('viewer/shared/backlog/ids.ts', 'viewer/backend/storage/paths.ts');
  await breach('viewer/shared/backlog/ids.ts', 'viewer/backend/storage/paths.ts', '#backend/storage/paths.ts');
  await breach('viewer/shared/backlog/ids.ts', `${SRC}/shared/lib/word-diff.ts`);
  await breach('viewer/shared/backlog/ids.ts', `${SRC}/shared/lib/word-diff.ts`, '#frontend/src/shared/lib/word-diff.ts');
});

test('the backend and the frontend never import each other', async () => {
  await breach('viewer/backend/server.ts', `${SRC}/shared/lib/word-diff.ts`);
  await breach('viewer/backend/server.ts', `${SRC}/shared/lib/word-diff.ts`, '#frontend/src/shared/lib/word-diff.ts');
  await breach(`${SRC}/main.tsx`, 'viewer/backend/storage/paths.ts');
  await breach(`${SRC}/main.tsx`, 'viewer/backend/storage/paths.ts', '#backend/storage/paths.ts');
});

test('the toolkit imports nothing outside itself', async () => {
  await breach('toolkit/skills/jois-story-plan/diagrams/checks.js', 'viewer/shared/backlog/model.ts');
  await breach('toolkit/skills/jois-story-review/read-backlog.mjs', 'viewer/shared/backlog/model.ts');
  await breach('toolkit/skills/jois-story-review/write-review.mjs', 'viewer/backend/server.ts');
  await breach(`${SRC}/main.tsx`, 'toolkit/skills/jois-story-review/write-review.mjs');
});

test('inside the frontend, shared/ stays below tools/ and app/', async () => {
  await breach(`${SRC}/shared/ui/Info.tsx`, `${TOOL}/shared/issues.ts`);
  await breach(`${SRC}/shared/ui/Info.tsx`, `${TOOL}/shared/issues.ts`, '#frontend/src/tools/backlog/shared/issues.ts');
  await breach(`${SRC}/shared/ui/Info.tsx`, `${SRC}/app/routes.tsx`);
  await breach(`${SRC}/shared/ui/Info.tsx`, `${SRC}/app/routes.tsx`, '#frontend/src/app/routes.tsx');
});

test('a tool imports no other tool', async () => {
  await breach(`${SRC}/tools/other/Thing.tsx`, `${TOOL}/BacklogTool.tsx`);
  await breach(`${SRC}/tools/other/Thing.tsx`, `${TOOL}/BacklogTool.tsx`, '#frontend/src/tools/backlog/BacklogTool.tsx');
});

test('a feature imports no other feature', async () => {
  await breach(`${TOOL}/features/stories/StoriesTab.tsx`, `${TOOL}/features/graph/graph.ts`);
  await breach(`${TOOL}/features/stories/StoriesTab.tsx`, `${TOOL}/features/graph/graph.ts`, '#frontend/src/tools/backlog/features/graph/graph.ts');
});

test('allowed imports raise nothing', async () => {
  await clean('viewer/shared/backlog/csv.ts', 'viewer/shared/backlog/model.ts');
  await clean('viewer/backend/server.ts', 'viewer/shared/backlog/model.ts');
  await clean('viewer/backend/server.ts', 'viewer/shared/backlog/model.ts', '#shared/backlog/model.ts');
  await clean('viewer/backend/server.ts', 'viewer/backend/storage/paths.ts', '#backend/storage/paths.ts');
  await clean(`${SRC}/main.tsx`, `${SRC}/app/routes.tsx`, '#frontend/src/app/routes.tsx');
  await clean(`${SRC}/main.tsx`, 'viewer/shared/backlog/model.ts', '#shared/backlog/model.ts');
  await clean(`${SRC}/app/routes.tsx`, `${TOOL}/BacklogTool.tsx`);
  await clean(`${TOOL}/features/stories/StoriesTab.tsx`, `${TOOL}/shared/issues.ts`);
  await clean(`${TOOL}/features/stories/StoriesTab.tsx`, `${SRC}/shared/ui/EmptyState.tsx`);
  await clean(`${TOOL}/features/stories/StoriesTab.tsx`, `${TOOL}/features/stories/story-table.ts`);
  await clean(`${SRC}/shared/ui/Info.tsx`, `${SRC}/shared/ui/EmptyState.tsx`);
  await clean('toolkit/skills/jois-story-review/write-review.mjs', 'toolkit/skills/jois-story-review/read-backlog.mjs');
});
