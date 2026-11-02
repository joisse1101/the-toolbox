## Why

Today the planner groups data by kind of file (`backlogs/`, `reviews/`, `proposals/`, ...) and links the files of one backlog only by sharing a file name. A backlog is therefore never one thing on disk. It cannot be backed up, shared, moved or deleted as a unit without picking its files out of eight folders.

This change gives each backlog its own self-contained folder.

Status: ready for review. It was split out of issue #49 (`configure-project-and-data-dir`) and starts after #49 is archived. The open questions of the draft were answered by the user (see `design.md`).

## What Changes

- Each backlog gets one folder in the data directory, named by the backlog, holding fixed-name files: `user-stories.csv`, `user-stories/review.csv` (with its `.decided` sidecar), `user-stories/proposals.csv`, `lexicon.csv`, `lexicon/lexicon-suggestions.csv`, plus `slices/<slice>/`, `repo.json` and the context map files.
- A backlog is found as any subfolder of `dataDir` holding `user-stories.csv`. The config is unchanged.
- **BREAKING**: a backlog is named by its folder name, without `.csv`, in the portal file API, the launchers, the skill scripts and both tool servers. The file API addresses files by backlog name and kind of file.
- **BREAKING**: the older layout is no longer read. A one-time migration, run only on request from the Settings tab, copies it into the new layout and leaves the old files in place.
- The write log stays at `<dataDir>/logs/writes.jsonl` and names the backlog and kind of file.
- **BREAKING**: backups are removed: the Backup button, the Backups tab and the backup routes, with their code. Backups already on disk are left alone and no longer read.
- Init creates only the data directory and `logs/`. Creating a backlog creates its folder. Renaming a backlog renames its folder.

## Capabilities

### New Capabilities
- `backlog-folder-layout`: what a backlog folder holds, how a backlog is named, created, renamed and found, and how the older layout is copied across.

### Modified Capabilities
- `csv-file-store`: access, list, create, rename and write log follow the folder layout; the three backup requirements are removed.
- `backlog-lexicon`, `lexicon-suggestions`: file locations; the lexicon backup requirement is removed.
- `user-story-editor`: the Backup button and the Backups tab are removed.
- `story-proposals`: file location.
- `repo-reader`, `context-map`, `diagram-writer`: slices, `repo.json` and the map move into the backlog folder.
- `project-config`: init and the offer to migrate follow the new layout.

Other specs that name a `<store>/<backlog>.csv` path (the review, the writers and the tool server) are covered by the mapping rule in `backlog-folder-layout`. Their text is brought in line when the change is archived.

## Impact

- `planner/portal/server/server.cjs` (the `STORES` allow-list, create and rename, and the removal of the backup routes), `planner/logic/storage/*`. `planner/portal/server/backup.cjs` and `flatten.js` are deleted.
- All skill scripts under `.claude/skills/` that build `<store>/<backlog>.csv` paths, and `planner/claude/mcp/*`.
- The portal file client, the backlog picker and the Settings tab. The Backups tab, its diff helper and the file bar's Backup button are deleted.
- The launchers in `planner/claude/launchers/`.
- `CLAUDE.md`, `README.md`, `planner/test/sample-data/` and most tests.
