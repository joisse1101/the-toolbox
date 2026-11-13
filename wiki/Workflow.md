# Workflow

How changes are made in this repo: OpenSpec for the change, conventional commits for history, and ESM for module format. The architecture the changes touch is described under [Logic Layer](viewer/architecture/Logic-Layer.md) and [Portal](viewer/architecture/Portal.md).

## Changes with OpenSpec

Changes are managed with OpenSpec in `openspec/`. `openspec/specs/` holds the current capability specs (`csv-file-store`, `user-story-editor`, `toolkit-skills` and others), and `openspec/changes/` holds proposals and archives. Use the `opsx:*` skills to propose, apply and archive a change. `openspec/` stays at the repo root because the OpenSpec CLI looks for it there.

## Commits

Commits use conventional-commit prefixes such as `feat:`, `style:` and `chore(openspec):`.

## Module format

The repo is ESM (`"type": "module"` in `viewer/package.json`). `viewer/backend/server.cjs` and `viewer/backend/storage/*.cjs` stay CommonJS (the `.cjs` extension) because they are the server, and so do `viewer/shared/storage/*.cjs` and `viewer/shared/skill-support/paths.cjs`, so the server and the ESM skill scripts can share them.

## Adding a new tool

Adding a tool takes four steps:

1. Create `viewer/frontend/<tool-name>/index.html` (a `#root` div and a script that loads the tool's `main.jsx`, like `viewer/frontend/backlog-portal/index.html`) and `viewer/frontend/src/<tool-name>/main.jsx`, which imports `viewer/frontend/src/shared/style.css` (by relative path). Import `viewer/frontend/src/shared/api/files.js` and any pure logic from `viewer/shared/`. Add the page to `build.rollupOptions.input` in `viewer/frontend/vite.config.mjs`.
2. Register a new kind of file in `KIND_FILES` in `viewer/shared/storage/backlog-paths.cjs`, with its name and its fixed path inside a backlog folder. The server's `STORES` is built from those kinds, so only registered kinds are reachable.
3. In the tool, use `createFileStore('<kind>')` for `list`, `read`, `create`, `write`, `rename` and `openFolder`, one file per backlog.
4. Add a link to the tool in `viewer/frontend/src/main.jsx`, then run `npm run build`.
