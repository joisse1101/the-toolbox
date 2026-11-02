## Why

Today the planner groups data by kind of file (`backlogs/`, `reviews/`, `proposals/`, ...) and links the files of one backlog only by sharing a file name. A backlog is therefore never one thing on disk. It cannot be backed up, shared, moved or deleted as a unit without picking its files out of eight folders.

This change gives each backlog its own self-contained folder.

**Status: DRAFT.** It was split out of issue #49 (`configure-project-and-data-dir`) during exploration. Specs and tasks are not written yet, because the open decisions in `design.md` change them. Owner of the next step: the user decides the open questions, then `/opsx:update` or `/opsx:propose` completes the artifacts.

## What Changes

Known (decided in the exploration of #49):
- Each backlog gets its own folder holding its backlog, review, proposals, lexicon, lexicon suggestions, diagrams and backups.
- It is a separate change from #49 and starts after #49 is archived. It builds on #49's project config and its copy logic.
- Existing data is migrated from the old layout, which reshapes files, so it is more than a copy.

Proposed, not yet confirmed (see `design.md`):
- **BREAKING**: store names and paths change, so the portal file API, the backup routes, the write log, the skill scripts and both Claude tool servers address a backlog by its folder, not by a file name in a store.
- A backlog is named by its folder name, without `.csv`.
- A one-time migration from the old layout, started from the Settings tab introduced in #49.

## Capabilities

Not final. This is the likely set, to be confirmed once the decisions are made.

### New Capabilities
- `backlog-folder-layout`: what a backlog folder holds, how a backlog is named, how the old layout is migrated.

### Modified Capabilities
- `csv-file-store`: stores become files inside a backlog folder, and the backup layout changes.
- `backlog-lexicon`, `lexicon-suggestions`, `lexicon-writer`: file locations.
- `story-proposals`, `story-proposal-writer`: file locations.
- `backlog-review-suggestions`: file locations, including the `.csv.decided` sidecar.
- `backlog-tools-mcp`, `diagram-writer`, `context-map`, `repo-reader`: how a backlog is addressed, and where diagrams, `repo.json` and the context map live.
- `project-config` (added by #49): only if the config gains a list of backlogs (see the first open question).

## Impact

Unchecked until the design is final, but expected to touch:
- `planner/portal/server/server.cjs` (`STORES`, backup routes, rename), `planner/portal/server/backup.cjs`, `planner/logic/storage/*`.
- All skill scripts under `.claude/skills/` that build `<store>/<backlog>.csv` paths, and `planner/claude/mcp/*`.
- The portal file client and the Backups and Settings tabs.
- `CLAUDE.md`, `README.md`, the sample data under `planner/test/sample-data/` and most tests.
- Specs listed above.
