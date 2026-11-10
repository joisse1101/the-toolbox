# Proposal

## Why

`/jois-code:apply` runs the test runner after every group of tasks and gates each group's commit on it. While a change is still being built, those runs fail for reasons the next group fixes, so they waste tokens and time and force the "deferrable failure" and held-back-commit machinery that exists only to cope with it. Tests belong at the end, once all the changes have landed.

## What Changes

- `apply.md` stops dispatching `opsx-test-runner` after each group. Step 10 commits a finished group when its tasks are done, the branch is unprotected, the group is one concern and nothing foreign is staged or edited.
- The exit-code judging, the one-rerun rule, the deferrable-failure rule and the held-back-commit rule are removed from `apply.md`.
- Testing becomes a task in the last group of `tasks.md`. The apply command runs that one task itself with `opsx-test-runner` (the task applier cannot start another agent), and the existing fix loop, which uses the task applier, completes any fixes.
- OpenSpec changes get that task from the tasks artifact rule for `opsx:propose`; slices get it from the `jois-story-plan` skill as the last task of the last flow group.
- Wiki pages, the `toolkit-skills` spec and the toolkit tests that pin the removed wording are updated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-skills`: the apply requirements on per-group tests, deferral and held-back commits change to "commit when the group's tasks are done" plus "test once in the last group".

## Impact

- `toolkit/commands/jois-code/apply.md`, `toolkit/agents/opsx-task-applier.md`, `toolkit/agents/opsx-test-runner.md`
- `toolkit/skills/jois-story-plan/` (SKILL.md, `diagram-conventions.md` section 10)
- `openspec/config.yaml` (a `rules.tasks` entry, outside the managed blocks)
- `wiki/toolkit/` pages: Command-Details, Task-Recipes, Task-Agent, Toolkit-Guide
- `toolkit/tests/test_task_applier.py` and story tests that pin the old text
