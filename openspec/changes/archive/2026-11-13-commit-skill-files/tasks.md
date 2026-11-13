# Tasks

## 1. File table and gitignore block

- [x] 1.1 Add `planner/logic/skill-support/plans-files.mjs` exporting the rows of design.md's table as data (path pattern, writers, lifecycle list), and a function that builds the `.gitignore` block for a data-folder path relative to the project root. Add `planner/test/logic/plans-files.test.mjs` asserting the rows, that the block for `.plans` equals design.md's block, that no line ignores a folder without its `/*`, and that a data folder outside the project yields no block. Verify with `node --test planner/test/logic/plans-files.test.mjs` from the repo root, with `PLANNER_CONFIG` set as `CLAUDE.md` describes.
- [x] 1.2 Add `planner/guidelines/plans-files.md`: the readable table, the meaning of each lifecycle, and how to print the block. Add a planner test that every path and lifecycle in the guideline matches `plans-files.mjs`. Verify with `npm test` from `planner/`.
- [x] 1.3 Add a mock-tree test: build a temp git repo under `.scratch/`, write the block as its `.gitignore`, create one file per row under `.plans/b1/` and `.plans/b1/slices/s1/`, and assert `git status --porcelain --untracked-files=all` lists exactly the `committed` and `user decides` files. Leave this test on the OS temp folder if it asks git about ignored paths under `.scratch/`, since git ignores `.scratch/`. Verify with `npm test` from `planner/`.
- [x] 1.4 Extend `planner/scripts/sync-skill-logic.mjs`: copy `plans-files.md` into every story skill's `references/`, and `plans-files.mjs` into `jois-story-plan`'s `lib/` and every skill that has `init-plans.mjs`. Run the sync. Verify that a second run reports no change and `git status` shows only the new copies.
- [x] 1.5 Add `toolkit/skills/jois-story-plan/print-gitignore.mjs`, which resolves the data folder as the other scripts do and prints the block (or says none is needed). Make `init-plans.mjs` print the block after its "Created" line, through the shared logic. Add tests in `toolkit/tests/story/` for both. Verify with `node --test <abs>/toolkit/tests/story/*.test.mjs`.
- [x] 1.6 Add `wiki/planner/architecture/Data-Folder.md` rows or a section for the lifecycle of each file, linking the guideline, and name `print-gitignore.mjs` in `wiki/planner/Story-Skills.md`. Verify with `python scripts/check_docs.py`.

## 2. Each skill and command declares its files

- [x] 2.1 In the `SKILL.md` of `jois-story-explore`, `jois-story-propose`, `jois-story-review`, `jois-story-plan` and `jois-story-verify`, add a short "Files this skill writes" section naming each file (or "none") and linking `references/plans-files.md`. Where a skill creates `.plans`, tell it to show the printed block and say the user adds it to `.gitignore` themselves. Verify with a toolkit test that each `SKILL.md` links the reference.
- [x] 2.2 In `toolkit/commands/jois-code/apply.md`, `review.md`, `validate.md` and `archive.md`, add the same section, linking the plan skill's `references/plans-files.md`. In validate, say `validation.md` and `validation.partial.md` are working files that archive copies and removes; replace "The slice folder is not tracked by git here. Never stage it." with "Never stage a result file." Verify with `python -m pytest tests/test_validate_command.py` from `toolkit/` through the project's `.venv` (create it if missing).
- [x] 2.3 Add a toolkit test that every file name the writers use (`backlog-paths.cjs` kinds and the `.decided` sidecar, the plan scripts' `source.json`, `tasks.md`, `UC-<slice>.md`, `context-map.json`, `context-map.md`, and the result files the commands name) is a row of `plans-files.mjs`. Verify it fails when one row is removed, then passes.

## 3. Plan asks to commit its files

- [x] 3.1 In `toolkit/skills/jois-story-plan/SKILL.md`, after the freeze, add the commit question of design.md: check `git rev-parse --is-inside-work-tree` and `git check-ignore` on `tasks.md`, ask "Yes, commit" or "Not now", and on yes stage `UC-<slice>.md`, `tasks.md` and `source.json` by path and commit `docs(plans): plan <backlog>/<slice>`. Add `AskUserQuestion`, `Bash(git rev-parse:*)`, `Bash(git check-ignore:*)`, `Bash(git add *slices*)` and `Bash(git commit:*)` to `allowed-tools`. Bump the skill's version.
- [x] 3.2 Update `toolkit/tests/story/plan-skill.test.mjs` and `toolkit/tests/story/allowed-tools.test.mjs` for the question, its options, the skip cases and the new tools. Verify with `node --test <abs>/toolkit/tests/story/plan-skill.test.mjs <abs>/toolkit/tests/story/allowed-tools.test.mjs`.
- [x] 3.3 Describe the question in `wiki/planner/Story-Skills.md` and `wiki/Story-To-Code.md`. Verify with `python scripts/check_docs.py`.

## 4. Apply handles tracked task lists

- [x] 4.1 In `toolkit/commands/jois-code/apply.md`, stage `tasks.md` with each group's commit when `git ls-files` lists it, never stage `review.md`, say `review.md` is a working file archive copies and removes, and replace the "untracked slice folder" lines. Add `Bash(git ls-files:*)` to `allowed-tools`. Update `toolkit/tests/test_task_applier.py`. Verify with `python -m pytest tests/test_task_applier.py` from `toolkit/`.
- [x] 4.2 Update `wiki/toolkit/Task-Agent.md` and `wiki/toolkit/Command-Details.md` for the tracked `tasks.md`. Verify with `python scripts/check_docs.py`.

## 5. Archive reduces the slice

- [x] 5.1 Add `toolkit/skills/jois-story-plan/remove-working-files.mjs <backlog> <slice> [--check]`: it refuses unless the slice folder holds `ARCHIVED.md`, deletes only `UC-<slice>.md`, `tasks.md`, `review.md`, `validation.md` and `validation.partial.md`, and prints each file with `tracked` or `untracked` (from `git ls-files`) and any other file it kept. `--check` prints the same and deletes nothing. Add `toolkit/tests/story/remove-working-files.test.mjs` on a temp copy of the fixture slice. Verify with `node --test` on that file.
- [x] 5.2 In `toolkit/commands/jois-code/archive.md`, rewrite step 8 in the order of design.md: the known limits offer, `ARCHIVED.md` with the validation and review summary, the delete question with the untracked warning, then one commit at one confirmation word holding the wiki pages, `ARCHIVED.md`, `source.json` and the deleted tracked files (skipping ignored files), message `docs(wiki): archive <backlog>/<slice>`. Replace "Never delete the slice or any file of it" and "Never stage the slice folder" with the new rules, add the script and `Bash(git ls-files:*)`, `Bash(git check-ignore:*)`, `Bash(git add *slices*)` to `allowed-tools`, and update the `description` line and version.
- [x] 5.3 In archive, make step 2 stop on a reduced slice (`ARCHIVED.md` and no `tasks.md`) with the date from `ARCHIVED.md`, and move the slice lookup of `## Finding the slice` from `tasks.md` to `source.json`. In validate, stop on a reduced slice in the same way.
- [x] 5.4 Update `toolkit/tests/test_archive_command.py` and `toolkit/tests/test_validate_command.py` for every scenario of `specs/code-archive/spec.md` and the new `code-validation` scenario. Verify with `python -m pytest tests/test_archive_command.py tests/test_validate_command.py` from `toolkit/`.
- [x] 5.5 Update `wiki/Story-To-Code.md`, `wiki/toolkit/Command-Details.md`, `wiki/toolkit/Toolkit-Guide.md` and `wiki/planner/User-Flows.md` for the reduced slice and the one archive commit. Verify with `python scripts/check_docs.py`.

## 6. PR commands read the archive record

- [x] 6.1 In the shared result-file section of `toolkit/commands/jois-git/write-pr.md` and `update-pr.md`, add `ARCHIVED.md` as a source after a current `validation.md` or `review.md`, with its row in the source table and the link rule for known lines. Keep the two sections identical. Update `toolkit/tests/test_pr_commands.py`. Verify with `python -m pytest tests/test_pr_commands.py` from `toolkit/`.

## 7. Try it live in the mock repo

- [x] 7.1 Build the sample's mock repo at the `validated` stage (`toolkit\sample\story-to-code\build-mock-repo.ps1 -Stage validated -Reset`), install the edited items at project scope (`Install-Toolkit.ps1 -Scope project -Path .scratch/mock-app -Skill jois-story-plan -Force` and `-Command jois-code -Force`), and check that the session loads the project copies, not global ones (never touch `~/.claude`; ask the user if a global copy shadows them). Run `/jois-code:archive` on the slice, answering "Delete them". Verify: only `ARCHIVED.md` and `source.json` remain, `ARCHIVED.md` holds the summary, and no fact appears both in `ARCHIVED.md` and in the wiki.
- [x] 7.2 In the same mock repo, print the block with `print-gitignore.mjs`, write it to the mock repo's `.gitignore` in place of its `.plans/` line, and check `git status` shows exactly the committed and user-decides files. Run `node --test <abs>/toolkit/tests/story/sample-stages.test.mjs` and report whether the saved stages still pass; if they fail because of the new `ARCHIVED.md` format, stop and ask the user before any re-recording.

## 8. Check the whole change

- [x] 8.1 Run the project's own test commands for the whole change and fix what fails: from `planner/`, `npm test`; from `toolkit/`, `python check_toolkit.py` and `python -m pytest` through the project's `.venv`; `node --test <abs>/toolkit/tests/story/*.test.mjs`; from the repo root, `python scripts/check_docs.py`. Verify: each command exits 0.

## Workflow follow-up

- Apply and archive `flexible-slice-argument` first; this change builds on its `## Finding the slice` section.
- The user reviews the table in `planner/guidelines/plans-files.md` and updates their own projects' `.gitignore` from the printed block.
