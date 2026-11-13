# Proposal

## Why

After `/jois-code:archive`, a slice folder still holds every working file (`UC-<slice>.md`, `tasks.md`, `review.md`, `validation.md`) beside `ARCHIVED.md`, so `.plans/` keeps copies of what the wiki now says. No skill says which of the files it writes belong in git, so a user cannot set up `.gitignore` before the first run, and the folder was never committed in at least one project, which makes any later deletion final.

## What Changes

- **Archive reduces the slice folder.** After the wiki pages pass their check, archive copies the review and validation summary into `ARCHIVED.md`, shows the list of working files it will delete, warns when they are untracked by git (so the delete cannot be undone), and deletes them only after the user says yes. `ARCHIVED.md` and `source.json` stay.
- **Archive offers to carry review facts into the wiki.** The `## Known, not fixed` and `## Not fixed by design` lines of `review.md`, and the claims that `validation.md` marks `could not test`, are offered as one short section of the slice's block in `design.md`, or dropped, before the delete. Nothing the wiki already says is copied.
- **BREAKING:** archive no longer keeps every file of the slice. A tidied slice cannot be archived again: archive says it is archived and writes nothing.
- **Archive commits the slice record with the wiki.** Archiving a slice is one concern, so `ARCHIVED.md`, `source.json` and the deletions of tracked working files are staged with the wiki pages in one commit, through the commit rule's confirmation word. Archive no longer says the slice folder is never staged.
- **`/jois-git:write-pr` and `/jois-git:update-pr` read `ARCHIVED.md`** for a slice whose `validation.md` and `review.md` are gone.
- **`jois-story-plan` asks whether to commit the plan files** (`UC-<slice>.md`, `tasks.md`, `source.json`) once a slice is written and frozen, and commits them only on "Yes, commit". When they are tracked, `/jois-code:apply` commits the ticked `tasks.md` with each group's commit.
- **One file-lifecycle table** lists every file the story skills and `jois-code` commands write under the data folder: path, writer, lifetime, and whether it is committed. Every skill and command in scope links to it, and a script prints a ready-made `.gitignore` block from it.
- `/jois-code:apply` and `/jois-code:validate` say that archive removes `review.md`, `validation.md` and `validation.partial.md`.

## Capabilities

### New Capabilities

- `plans-file-lifecycle`: the table of every file under the data folder with its writer and lifecycle, the links to it, and the `.gitignore` block printed from it.

### Modified Capabilities

- `code-archive`: the slice is reduced to its record instead of kept whole; the record carries the review and validation summary; archive stages the slice record as its own commit; a tidied slice is not archived again.
- `code-validation`: the result file is a working file that archive removes.
- `plan-stories-skill`: plan asks whether to commit the slice's plan files after it is written.
- `toolkit-skills`: apply writes `review.md` as a working file and commits a tracked `tasks.md` with each group; the PR commands read `ARCHIVED.md` when the result files are gone.

## Impact

- Commands: `toolkit/commands/jois-code/archive.md`, `apply.md`, `validate.md`; `toolkit/commands/jois-git/write-pr.md`, `update-pr.md`.
- Skills: `toolkit/skills/jois-story-plan/SKILL.md` (commit question, `allowed-tools` for `git add` and `git commit` on the slice's files), and a link in each `jois-story-*` `SKILL.md`.
- New: `planner/guidelines/plans-files.md` (synced into each story skill's `references/`), `planner/logic/skill-support/plans-files.mjs` (the table as data), and `toolkit/skills/jois-story-plan/print-gitignore.mjs`.
- `planner/scripts/sync-skill-logic.mjs`: the new guideline and logic file are copied into the skills.
- Tests: `toolkit/tests/test_archive_command.py`, `test_task_applier.py`, `test_validate_command.py`, `test_pr_commands.py`, `toolkit/tests/story/plan-skill.test.mjs`, and new planner tests for the table and the printer.
- Docs: `wiki/Story-To-Code.md`, `wiki/toolkit/Command-Details.md`, `wiki/toolkit/Toolkit-Guide.md`, and the planner page that lists the data folder layout.
- Depends on `flexible-slice-argument`, which edits `archive.md` and `apply.md` first.
