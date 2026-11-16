# Proposal

## Why

The viewer is plain JavaScript with no type checker. A wrong field name or a missing argument shows up only when that code path runs, and the shapes of a story, a backlog, a review row or an API reply exist only in comments. TypeScript catches those mistakes before anything runs, and it documents the shapes in code. Node 24, which this repo uses, runs `.ts` files directly by removing the type annotations as it loads them, so the server and the tests need no build step. This change follows `viewer-single-page-app` and assumes its layout.

## What Changes

- Every source file under `viewer/` becomes TypeScript: `.ts` for the backend, shared code, scripts and tests, and `.tsx` for React components. CommonJS files (`.cjs`) become ES modules.
- The code uses only TypeScript syntax that Node can remove without rewriting anything. That rules out `enum`, `namespace` and constructor parameter properties.
- `node backend/server.ts`, `node scripts/start.ts` and `node --test` run the `.ts` files directly. Vite builds the `.tsx` frontend as before.
- A new `npm run typecheck` runs the TypeScript compiler in check-only mode over the backend, shared code, scripts, tests and frontend, with strict checking on.
- Shared types for the data the viewer reads and writes (story, backlog, review row, proposal, lexicon term, project config, API replies) live in `viewer/shared/`.
- The sync script strips the types when it copies shared code into the story skills, and writes each copy as a plain `.mjs` ES module. The skill scripts import those copies directly and stop using `createRequire` for them. Installed skills stay plain JavaScript with no new requirements.
- New dev dependencies: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`.
- Unchanged: what the viewer and the skills do. The toolkit's own scripts stay JavaScript.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-wiki`: the example path in "Paths are written from the repo root" becomes the `.ts` file.

## Impact

- Code: every file under `viewer/` is renamed and typed. `viewer/package.json` scripts, the Vite config, the zones test (it scans `.ts` and `.tsx`) and the sync script change.
- Toolkit: the story skill scripts' imports of `./lib/...` change to the `.mjs` copies, and their `createRequire` lines for those copies go away. All generated `lib/` copies are regenerated.
- Docs: CLAUDE.md (commands, the type check, the end of the `.cjs` rule), the wiki's Logic Layer and Portal pages, and the Story Skills Internals page (the generated copy).
- Requirement: Node 24 or later to run the viewer, as today's `package.json` setup already assumes.
