## Why

The planner finds its data folder only from the `PLANNER_DATA_DIR` environment variable (`planner/logic/storage/paths.cjs`). The setting is hidden, easy to lose between sessions, and a project has no name. A folder that does not hold the planner's sub-folders cannot be used until someone creates them by hand. Issue #49.

## What Changes

- A YAML project config, `planner/planner.config.yaml` (git-ignored, with a committed `planner.config.example.yaml`), holds `projectName` and `dataDir`. It is validated when loaded; a bad or unknown key fails the load and names the key. A missing file or key falls back to `planner/data`, so existing setups keep working.
- **BREAKING**: `PLANNER_DATA_DIR` and the older `TLT_DATA_DIR` are removed, with the warning that mentions the old name. The config file is the only source of the data folder. One new variable, `PLANNER_CONFIG`, names the config file and exists so tests (and one-off runs) can point at another one.
- `paths.cjs` reads the config and stays the one place that answers "where is the data". The three PowerShell launchers stop copying the env-var logic and ask `paths.cjs`.
- An **init** action creates the missing store folders in the data directory (`backlogs`, `reviews`, `proposals`, `lexicons`, `lexicon-suggestions`, `diagrams`, `backups`, `logs`). It never overwrites or deletes a file and reports what it created and what it skipped.
- A **Settings** tab in the backlog portal shows and edits the project name and data directory and runs init. It is a tab of the portal, not a separate page.
- The portal **server switches to a new data directory live** (no restart): `STORES`, `BACKUPS_DIR` and the write log become lookups, and the Refresh button reloads from the new folder. The switch is refused while a save or backup is running. Skill scripts and already-open Claude sessions read the config when they start, and the tab says so.
- When the user chooses a new directory, the portal checks it before saving. If it holds no planner files (or does not exist) it offers to **copy the current data there** (the old folder is left untouched, existing files are never overwritten, same rule as init), or to run init instead. If it already holds planner files, the portal just switches to it.
- The server accepts a path from the browser, so it confines it: absolute paths only, links resolved, system folders and the repo's own source folders refused, folders created only by init or the copy.
- Tests use `PLANNER_CONFIG` pointing at a committed test config whose `dataDir` is `planner/test/sample-data/`; the guard test in `paths.test.mjs` checks it stays set.

Out of scope, planned as its own change (`one-folder-per-backlog`): giving each backlog its own folder instead of grouping files by kind. This change keeps today's layout.

## Capabilities

### New Capabilities
- `project-config`: the YAML project config, its validation and defaults, how the data directory is resolved, the init action, the copy of existing data into a new folder, and the Settings tab.

### Modified Capabilities
- `csv-file-store`: the data folder comes from the project config instead of `PLANNER_DATA_DIR`, the server can switch folders without restarting, and a folder path sent by the browser is confined and validated.

## Impact

- Code: `planner/logic/storage/paths.cjs` (+ new config reader/validator and init/copy logic beside it), `planner/portal/server/server.cjs`, `planner/logic/storage/write-log.cjs`, the skill scripts under `.claude/skills/` that import `DATA_DIR`, `planner/claude/mcp/diagram-tools.mjs`, the three launchers in `planner/claude/launchers/`, `planner/portal/start.mjs` (comment), a new Settings tab under `planner/portal/web/backlog-portal/`.
- Tests: `planner/test/setup.mjs`, `planner/test/logic/paths.test.mjs`, tests that set `PLANNER_DATA_DIR`, new tests for config, init, copy and the settings routes, all on sample data.
- Dependencies: a small YAML library in `planner/package.json`.
- Docs: `CLAUDE.md`, `README.md`.
- Specs: new `project-config`, delta on `csv-file-store`.
