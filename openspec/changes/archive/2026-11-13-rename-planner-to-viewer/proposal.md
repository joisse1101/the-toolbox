# Proposal

## Why

The `planner/` folder is the web app that shows and edits what the toolkit's story skills produce, so "viewer" names it better than "planner". Its layout also mixes the server, the browser code and the shared rules under `portal/` and `logic/`, so it is hard to tell which code runs where. This change gives it a clear name and a backend, frontend and shared split. It is the first of three changes; the single-page app and the move to TypeScript build on the new layout.

## What Changes

- **BREAKING**: `planner/` becomes `viewer/`, laid out as follows:
  - `viewer/backend/` holds the server (`server.cjs`) and the storage modules only the server uses (`backlog-files`, `project-config`, `project-folders`, `paths`, `starting-files`).
  - `viewer/frontend/` holds `index.html`, the Vite config, `src/` (today's `portal/web/`) and the build output `dist/`.
  - `viewer/shared/` holds the rules the server, the browser and the story skills share (today's `logic/` minus the server-only modules), and `shared/guidelines/` (today's `guidelines/`).
  - `viewer/scripts/` holds `start.mjs` and `sync-skill-logic.mjs`.
  - `viewer/test/` holds the tests, split into `shared/`, `backend/` and `frontend/`.
- One `package.json`, `package-lock.json` and `node_modules/` sit at `viewer/`.
- **BREAKING**: The config file becomes `viewer/viewer.config.yaml`, and the variable that names another file becomes `VIEWER_CONFIG`. The example file becomes `viewer/viewer.config.example.yaml`.
- **BREAKING**: The default data folder becomes `viewer/data/`. Existing git-ignored files under `planner/` (the config, the data, `node_modules`, `dist`) are not moved by git; the wiki says how to move them by hand.
- The zone rule becomes: `shared/` imports nothing outside itself; `backend/` and `frontend/` import `shared/` and never each other; `toolkit/` imports nothing outside itself.
- CLAUDE.md, README, the wiki (`wiki/planner/` becomes `wiki/viewer/`), `.gitignore`, `.gitattributes`, Dependabot and the specs name the new paths. Archived changes keep the old ones.
- No behaviour changes otherwise. The app still has two pages (launcher and backlog portal), and the code stays JavaScript.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-config`: the config file name, its variable, the default data folder, the protected repo folder and the test setup change. "Every consumer uses the config" also drops the claim that the story skills read the config, which the archived `skills-read-only-plans` made false.
- `project-switcher`: a new project is created under `viewer/data/`, and the no-config default shows `viewer/data`.
- `backlog-guidelines`: the guidelines live in `viewer/shared/guidelines/`.
- `project-wiki`: the example path in "Paths are written from the repo root" names the new location.
- `toolkit-story-skills`: the toolkit imports nothing from `viewer/`, diagram logic stays out of `viewer/`, and `viewer/shared/guidelines/` is the guidelines' source.

## Impact

- Code: every file under `planner/` moves. Imports, `require` paths, the server's `dist/` path, `start.mjs` paths, the Vite config, the sync script's source paths and the zones test change with the moves.
- Generated copies: the "source" line at the top of each copy in `toolkit/skills/*/lib/` and `references/` changes when the sync script runs.
- Toolkit: `toolkit/README.md`, the sample's README, three `SKILL.md` files and three tests name `planner/` paths.
- Repo files: `CLAUDE.md`, `README.md`, `.gitignore`, `.gitattributes`, `.github/dependabot.yml`, `wiki/` (pages, sidebar and links).
- Users: after pulling, move `planner/planner.config.yaml` to `viewer/viewer.config.yaml` and `planner/data/*` to `viewer/data/`, run `npm install` in `viewer/`, and delete the leftover `planner/` folder. A `PLANNER_CONFIG` variable in a shell profile must become `VIEWER_CONFIG`.
