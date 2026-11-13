# Tasks

## 1. Archive finds the slice

- [x] 1.1 In `toolkit/commands/jois-code/archive.md`, replace the `## Forms` section with a `## Finding the slice` section that holds the lookup rule of design.md: the argument forms, the Glob table, the skipped folders (`.trees/`, `.scratch/`, `node_modules/`, `test/`, `tests/`, `sample/`), the `read-diagrams.mjs <backlog>` fallback when the search finds nothing, the more-than-four rule, the copies rule, and the end line "print this command's full form". The section never names its own command, and its only command-specific line starts with `Slices this command lists:` (archive: every task ticked and no `ARCHIVED.md`). Rewrite step 1 to follow it. Keep "Never guess". Update the `description` line and bump `version` and `last_updated`. Verify by reading the file: every scenario of `specs/code-archive/spec.md` maps to a sentence of the section.
- [x] 1.2 Make archive's last lines, at the confirmation word and at every earlier stop after the slice is settled, include `/jois-code:archive slice <backlog>/<slice>` with the real names. Verify by reading steps 3 and 8 and the Resuming section.
- [x] 1.3 In `toolkit/tests/test_archive_command.py`, replace `test_command_has_one_form_and_refuses_any_other_argument` and the version assertion with tests for the new section: each accepted form is named, AskUserQuestion is used when the slice is not settled, the skipped folders and the `read-diagrams.mjs` fallback are stated, the list filter line is present, and "Never guess" stays. Verify with `python -m pytest tests/test_archive_command.py` from `toolkit/`, through the project's `.venv` (create it if missing).
- [x] 1.4 Update `wiki/toolkit/Command-Details.md`, `wiki/toolkit/Toolkit-Guide.md`, `wiki/Story-To-Code.md` and `wiki/toolkit/Task-Recipes.md` where they say archive takes one form, so they name the accepted forms and the question. Verify with `python scripts/check_docs.py`.

## 2. Apply finds the slice

- [x] 2.1 In `toolkit/commands/jois-code/apply.md`, replace the `## Argument` section with the `## Finding the slice` section of archive, word for word except the `Slices this command lists:` line, which names slices with an unticked task. Rewrite step 1 to follow it, and add `AskUserQuestion` to `allowed-tools`. Bump the version if the file carries one. Verify by reading the file: every scenario of `specs/toolkit-skills/spec.md` for this requirement maps to a sentence.
- [x] 2.2 Keep apply's call to `/jois-code:review` with `slice <backlog>/<slice>`, and make its resume line and its "slice is built" line print the full forms of apply and archive. Verify by reading steps 1 and 9 and the resume line.
- [x] 2.3 In `toolkit/tests/test_task_applier.py`, rewrite `test_apply_command_takes_only_a_slice` to assert the new section and `AskUserQuestion` in `allowed-tools`, and add a test that the `## Finding the slice` sections of apply and archive are identical once the one line starting with `Slices this command lists:` is removed from each, and that neither section names `/jois-code:`. Verify with `python -m pytest tests/test_task_applier.py tests/test_archive_command.py` from `toolkit/`.
- [x] 2.4 Update the apply rows and lines in `wiki/toolkit/Command-Details.md`, `wiki/toolkit/Toolkit-Guide.md`, `wiki/toolkit/Task-Agent.md`, `wiki/Story-To-Code.md` and `wiki/toolkit/Task-Recipes.md`. Verify with `python scripts/check_docs.py`.

## 3. Try it live in the mock repo

- [x] 3.1 Build the sample's mock repo at the `planned` stage with `toolkit\sample\story-to-code\build-mock-repo.ps1 -Stage planned -Reset`, install the edited commands at project scope with `toolkit\install\Install-Toolkit.ps1 -Scope project -Path .scratch/mock-app -Command jois-code -Force`, and check that the session loads the project copy and not a global one (never touch `~/.claude`; ask the user if a global copy shadows it). Run `/jois-code:apply` with the bare slice name, the backlog name alone and no argument, answering the questions in the prompt and stopping before the first dispatch. Verify: each run names the right backlog and slice, or asks with the slices that have an unticked task.
- [x] 3.2 Rebuild the mock repo at the `validated` stage (`-Stage validated -Reset`), reinstall as in 3.1, and run `/jois-code:archive` the same three ways, stopping at the map approval. Verify: each run names the right backlog and slice, or asks with the slices that are built and not archived.

## 4. Check the whole change

- [x] 4.1 Run the project's own test commands for the whole change and fix what fails: from `toolkit/`, `python check_toolkit.py` and `python -m pytest` through the project's `.venv`; from the repo root, `python scripts/check_docs.py`. Verify: each command exits 0.

## Workflow follow-up

- Archive this change before the commit-skill-files change is applied, because both edit `archive.md`.
