# Workflow

How changes are made in this repo: OpenSpec for the change, conventional commits for history, and ESM for module format. The architecture the changes touch is described under [Logic Layer](viewer/architecture/Logic-Layer.md) and [Portal](viewer/architecture/Portal.md).

## Changes with OpenSpec

Changes are managed with OpenSpec in `openspec/`. `openspec/specs/` holds the current capability specs (`csv-file-store`, `user-story-editor`, `toolkit-skills` and others), and `openspec/changes/` holds proposals and archives. Use the `opsx:*` skills to propose, apply and archive a change. `openspec/` stays at the repo root because the OpenSpec CLI looks for it there.

## Commits

Commits use conventional-commit prefixes such as `feat:`, `style:` and `chore(openspec):`.

## Checks in CI

The workflow `.github/workflows/ci.yml` runs on every pull request and on every push to `main`, with read-only permissions. It has two jobs that run in parallel on `ubuntu-latest`, so a failure in one does not hide the other. The `viewer` job uses Node 24 and runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build` and `npm test` in `viewer/`. The `toolkit` job uses Python 3.12 and Node 24, installs `toolkit/requirements.txt`, then runs `python check_toolkit.py`, `python -m pytest` and `node --test` on the story tests. The separate `docs-check.yml` workflow still checks the docs.

`npm run lint` enforces the import zones (see [Logic Layer](viewer/architecture/Logic-Layer.md)) and general rules, so run it before you push. It needs the `typescript` alias in `viewer/package.json`, which points to TypeScript 6 because `typescript-eslint` does not support TypeScript 7 yet. The alias is temporary: remove it when TypeScript 7.1 ships a compiler API that `typescript-eslint` supports, and let `typecheck` use the plain `typescript` package again.

### Branch protection

A check blocks a merge only when branch protection requires it, and the workflow cannot turn that on. The repo owner must do this once in the GitHub settings (a manual step, not done by code): protect `main` and require the `viewer` and `toolkit` checks to pass before a pull request can merge. Until then the checks report a result but do not stop a merge.

## Module format

The repo is ESM (`"type": "module"` in `viewer/package.json`), and the viewer code is TypeScript that Node runs directly (the server, the scripts and the tests need no build). The `.cjs` extension is no longer used: the server and its storage modules are ES modules like the rest, and the story skills load plain `.mjs` copies of the shared files.

## Adding a new tool

Adding a tool takes four steps:

1. Create `viewer/frontend/src/tools/<tool-name>/` with a top component, `<ToolName>Tool.tsx` (like `viewer/frontend/src/tools/backlog/BacklogTool.tsx`), and add its route or routes in `viewer/frontend/src/app/routes.tsx`. There is no new HTML page and no Vite input: the app has one `viewer/frontend/index.html`. Import `viewer/frontend/src/shared/api/files.ts`, the shared components and hooks in `viewer/frontend/src/shared/`, and any pure logic from `viewer/shared/`. Keep to the zone rules: the tool imports no other tool, and a feature folder in it imports no other feature (see [CLAUDE.md](../CLAUDE.md)).
2. Register a new kind of file in `KIND_FILES` in `viewer/shared/storage/backlog-paths.ts`, with its name and its fixed path inside a backlog folder. The server's `STORES` is built from those kinds, so only registered kinds are reachable.
3. In the tool, use `createFileStore('<kind>')` for `list`, `read`, `create`, `write`, `rename` and `openFolder`, one file per backlog.
4. Add a link to the tool in `viewer/frontend/src/app/HomePage.tsx`, then run `npm run build`.
