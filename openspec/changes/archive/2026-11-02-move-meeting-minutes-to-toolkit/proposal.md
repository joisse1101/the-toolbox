## Why

Meeting minutes and the backlog planner are separate concerns, but the minutes skill lives inside the planner and saves to `planner/data/meetings/`. Moving it to the toolkit makes it reusable in any project and removes planner code that has nothing to do with backlogs. See GitHub issue #51.

## What Changes

- Add the command `/jois-docs:meeting-minutes` to `toolkit/commands/jois-docs/`.
  - It rewrites pasted notes, or notes in a referenced file, into the fixed minutes template.
  - It keeps the template inline, so the installer copies one markdown file.
  - It shows the minutes first, then offers to save them as `<title-slug>_<YYYY-MM-DD>.md`.
  - It saves next to a referenced notes file, or suggests a folder in the repo when nothing is referenced.
  - It updates a referenced minutes file in place when the notes refine it.
- Extend `check_toolkit.py` so `jois-docs` commands need `metadata.version` and `metadata.last_updated`.
- Document the command and the `docs` domain in `toolkit/README.md`.
- **BREAKING:** remove the planner's meeting-minutes feature.
  - `.claude/skills/meeting-minutes/` (skill, template, writer, guard, locked settings).
  - `planner/claude/launchers/meeting-minutes.ps1`.
  - `planner/test/claude/meeting-minutes.test.mjs` and `guard-minutes-bash.test.mjs`.
  - `meetings` from the planner's data folders in `CLAUDE.md` and `README.md`.
- Replace the spec `meeting-minutes-skill` with the toolkit spec `toolkit-meeting-minutes`.

## Capabilities

### New Capabilities

- `toolkit-meeting-minutes`: the `/jois-docs:meeting-minutes` command, which turns notes into minutes in the fixed template and saves them on request.

### Modified Capabilities

- `toolkit-skills`: the versioned-command requirement also covers `toolkit/commands/jois-docs/`.
- `meeting-minutes-skill`: all requirements are removed, because the planner no longer has the feature.

## Impact

- `toolkit/`: new command file, `check_toolkit.py`, its test, and `README.md`.
- `.claude/skills/`, `planner/claude/launchers/`, `planner/test/claude/`: files removed.
- `CLAUDE.md`, `README.md`: the planner no longer mentions meetings.
- `openspec/specs/`: one spec removed, one added, one modified.
- Existing files in `planner/data/meetings/` are the user's private data. The change leaves them alone and stops referencing them.
- Out of scope: backlog features and the data directory configuration (issue #49).
