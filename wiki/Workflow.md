# Workflow

How changes are made in this repo: OpenSpec for the change, conventional commits for history, and ESM for module format. The architecture the changes touch is described under [Logic Layer](planner/architecture/Logic-Layer.md) and [Portal](planner/architecture/Portal.md).

## Changes with OpenSpec

Changes are managed with OpenSpec in `openspec/`. `openspec/specs/` holds the current capability specs (`csv-file-store`, `user-story-editor`, `toolkit-skills` and others), and `openspec/changes/` holds proposals and archives. Use the `opsx:*` skills to propose, apply and archive a change. `openspec/` stays at the repo root because the OpenSpec CLI looks for it there.

## Commits

Commits use conventional-commit prefixes such as `feat:`, `style:` and `chore(openspec):`.

## Module format

The repo is ESM (`"type": "module"` in `planner/package.json`). `planner/portal/server/server.cjs`, `planner/logic/storage/file-name.cjs` and `planner/logic/storage/paths.cjs` stay CommonJS (the `.cjs` extension), so the server and the ESM skill scripts can share them.

## Adding a new tool

Adding a tool takes four steps:

1. Create `planner/portal/web/<tool-name>/` with an `index.html` (a `#root` div and a `main.jsx` script, like `planner/portal/web/backlog-portal/index.html`) and a `main.jsx` that imports `planner/portal/web/shared/style.css` (by relative path). Import `planner/portal/web/shared/files.js` and any pure logic from `planner/logic/`. Add the page to `build.rollupOptions.input` in `planner/portal/web/vite.config.mjs`.
2. Register a new kind of file in `KIND_FILES` in `planner/logic/storage/backlog-paths.cjs`, with its name and its fixed path inside a backlog folder. The server's `STORES` is built from those kinds, so only registered kinds are reachable.
3. In the tool, use `createFileStore('<kind>')` for `list`, `read`, `create`, `write`, `rename` and `openFolder`, one file per backlog.
4. Add a link to the tool in `planner/portal/web/main.jsx`, then run `npm run build`.

The same steps are in the [Add a new tool](../README.md#add-a-new-tool) section of the root `README.md`.
