## 1. Apply command

- [x] 1.1 In `toolkit/commands/jois-code/apply.md` step 10, remove the per-group `opsx-test-runner` dispatch, exit-code judging, one-rerun rule and deferral/held-back rules; commit when the group's tasks are done and the branch, foreign-change and split checks pass. Verify: the file has no "deferrable", "held-back" or "One rerun" text and still has the protected-branch and split rules.
- [x] 1.2 In steps 4, 9 and 11 of `apply.md`, drop the deferrable-failure definition and the "nothing is deferred" lines; move the missing-`opsx-test-runner` notice to before the last group; update the front-matter `description`, `metadata.version` and `last_updated`. Verify: `python toolkit/check_toolkit.py` passes and the description no longer says it checks each group with opsx-test-runner.
- [x] 1.3 In `toolkit/agents/opsx-test-runner.md` say the command dispatches it for the final test task (not after each group), and in `opsx-task-applier.md` say the command runs a test task itself; raise both `metadata.version` values. Verify: `python toolkit/check_toolkit.py` passes.

## 2. Test task in every task list

- [x] 2.1 Add a `rules.tasks` entry to `openspec/config.yaml`, outside managed blocks, asking for a last-group task that runs the project's tests and fixes failures. Verify: `openspec instructions tasks --change <name> --json` shows the rule.
- [x] 2.2 In `toolkit/skills/jois-story-plan/SKILL.md` and `references/diagram-conventions.md` section 10, add the last-task-of-last-group test task, citing the last flow's ACs and steps. Verify: the story tests that pin the section pass and a sample `tasks.md` with the test task passes the tasks check.

## 3. Spec, docs and tests

- [x] 3.1 Update `wiki/toolkit/Command-Details.md`, `Task-Recipes.md`, `Task-Agent.md` (including the "Deferring a commit" section) and `Toolkit-Guide.md` to the new flow. Verify: `python scripts/check_docs.py` passes.
- [x] 3.2 In `toolkit/tests/test_task_applier.py`, replace the deferral and held-back tests with tests that those texts are gone and that step 10 commits without a test run; update any story test that pins section 10. Verify: `python -m pytest toolkit/tests/test_task_applier.py` passes.

## 4. Test and fix

- [x] 4.1 Run `cd toolkit; python check_toolkit.py; python -m pytest`, then `node --test <abs>/toolkit/tests/story/*.test.mjs`, then `npm test` in `planner/`; fix every failure and rerun until each command exits 0. Verify: all four commands exit 0.
