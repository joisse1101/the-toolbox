# Tasks

## 1. Rename and generalize the agents

- [x] 1.1 `git mv` `toolkit/agents/opsx-task-applier.md` to `task-applier.md` and `opsx-test-runner.md` to `test-runner.md`. Verify `toolkit/agents/` lists the new names and no `opsx-*` file.
- [x] 1.2 In `task-applier.md` set `name: task-applier`, rewrite the description to say it is dispatched for one group of tasks of a change or a slice by `/jois-code:apply` or a session following the apply guidance (keeping the never-commits, never-pushes, never-edits-`tasks.md` limits), change both hook messages to the new name, and replace the slice vocabulary (`UC-<slice>.md`, `Satisfies:`, `AC-` rows) with "follow the brief for what each task satisfies and how to verify it". Keep model `sonnet`, 50 turns and the report shape. Raise `metadata.version` to 2.0.0 and `last_updated`. Verify with a grep that the file has no `opsx-`, `UC-` or `AC-` text and the two hooks still match the blocked commands.
- [x] 1.3 In `test-runner.md` set `name: test-runner`, drop the `/jois-code:apply` wording from the description, change the hook message to the new name, keep `haiku` and 30 turns, raise `metadata.version` to 2.0.0 and `last_updated`. Verify with a grep that the file has no `opsx-` text.
- [x] 1.4 Update `toolkit/tests/test_task_applier.py` and `test_validate_command.py` to the new names, paths and hook messages, and add a test that neither agent file mentions a slice or an `opsx-` name. Verify `python -m pytest toolkit/tests/test_task_applier.py toolkit/tests/test_validate_command.py` passes.

## 2. Point the commands and installer at the new names

- [x] 2.1 In `toolkit/commands/jois-code/apply.md` replace every `opsx-task-applier` and `opsx-test-runner` with the new names (description, steps 4, 7, 8, 9, 10a), treat an old-name-only install as not installed, name `-Agent task-applier.md` and `-Agent test-runner.md` in the install messages, and add to the dispatch step that the brief carries what each task satisfies, its `Verify:` line and the `UC-<slice>.md` path. Raise `metadata.version` and `last_updated`. Verify with a grep that the file has no `opsx-` agent name.
- [x] 2.2 In `validate.md` and `review.md` replace `opsx-test-runner` with `test-runner` in the install checks and the dispatch step, and raise their versions. Verify with a grep for `opsx-test-runner` in `toolkit/commands/`.
- [x] 2.3 In `toolkit/install/Install-Toolkit.ps1` and `toolkit/README.md` change the example agent names and the comment about the Haiku pin. Verify with a grep that no `opsx-task-applier` or `opsx-test-runner` remains under `toolkit/` and `python toolkit/check_toolkit.py` passes.

## 3. Write the apply guidance

- [x] 3.1 In `toolkit/commands/jois-init/opsx.md` extend the `operations.apply.guidance` block with one-line entries that hand each group to `task-applier`, hand the final test task to `test-runner` and judge it by exit codes, check both agents are installed (say so, name `Install-Toolkit.ps1`, never copy), say the agents commit nothing and the session records results and ticks boxes, and state the auto-commit conditions in full (branch other than `main` or `master`, concern's tasks done, nothing foreign staged or edited, test task the only check that gates a commit, never a push). Keep the archive block as it is and raise the command's version. Verify the block reads as one line per entry between the managed markers.
- [x] 3.2 Replace the managed block in this repository's `openspec/config.yaml` with the same text. Verify `openspec status --change rename-task-agents` still runs and the file keeps its `rules` and archive guidance.
- [x] 3.3 Add a test that reads the guidance block of `opsx.md` and checks it names both agents, the branch condition and the no-push condition, and that the block in `openspec/config.yaml` matches it. Verify `python -m pytest` on that test passes.

## 4. Update the wiki

- [x] 4.1 In `wiki/toolkit/Toolkit-Guide.md`, `Task-Agent.md`, `Task-Recipes.md`, `Install.md` and `Command-Details.md` use the new agent names, describe both apply paths (slice command and the `/opsx:apply` guidance) and say the guidance is advisory. In `Install.md` add the step that tells users to delete `opsx-task-applier.md` and `opsx-test-runner.md` by hand. Verify with a grep for the old names in `wiki/` and `python scripts/check_docs.py` passes.

## 5. Check the whole change

- [x] 5.1 Run the project's own checks for the whole change and fix any failure they show. Verify: `python scripts/check_docs.py`, then `cd toolkit; python check_toolkit.py; python -m pytest`, all exit code 0, and a grep for `opsx-task-applier|opsx-test-runner` outside `openspec/changes/archive/` and `openspec/changes/rename-task-agents/` finds nothing except the lines that name the old files for deletion.
