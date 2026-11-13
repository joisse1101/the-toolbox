# Workflow

How changes are made in this repo: OpenSpec for the change, conventional commits for history, and ESM for module format. The architecture the changes touch is described under [Logic Layer](viewer/architecture/Logic-Layer.md) and [Portal](viewer/architecture/Portal.md).

## Changes with OpenSpec

Changes are managed with OpenSpec in `openspec/`. `openspec/specs/` holds the current capability specs (`csv-file-store`, `user-story-editor`, `toolkit-skills` and others), and `openspec/changes/` holds proposals and archives. Use the `opsx:*` skills to propose, apply and archive a change. `openspec/` stays at the repo root because the OpenSpec CLI looks for it there.

## Commits

Commits use conventional-commit prefixes such as `feat:`, `style:` and `chore(openspec):`.

## Module format

The repo is ESM (`"type": "module"` in `viewer/package.json`), and the viewer code is TypeScript that Node runs directly (the server, the scripts and the tests need no build). The `.cjs` extension is no longer used: the server and its storage modules are ES modules like the rest, and the story skills load plain `.mjs` copies of the shared files.

## Adding a new tool

Adding a tool takes four steps:

1. Create `viewer/frontend/src/tools/<tool-name>/` with a top component, `<ToolName>Tool.jsx` (like `viewer/frontend/src/tools/backlog/BacklogTool.jsx`), and add its route or routes in `viewer/frontend/src/app/routes.jsx`. There is no new HTML page and no Vite input: the app has one `viewer/frontend/index.html`. Import `viewer/frontend/src/shared/api/files.js`, the shared components and hooks in `viewer/frontend/src/shared/`, and any pure logic from `viewer/shared/`. Keep to the zone rules: the tool imports no other tool, and a feature folder in it imports no other feature (see [CLAUDE.md](../CLAUDE.md)).
2. Register a new kind of file in `KIND_FILES` in `viewer/shared/storage/backlog-paths.ts`, with its name and its fixed path inside a backlog folder. The server's `STORES` is built from those kinds, so only registered kinds are reachable.
3. In the tool, use `createFileStore('<kind>')` for `list`, `read`, `create`, `write`, `rename` and `openFolder`, one file per backlog.
4. Add a link to the tool in `viewer/frontend/src/app/HomePage.jsx`, then run `npm run build`.
