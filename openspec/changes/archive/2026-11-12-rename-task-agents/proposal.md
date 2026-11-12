# Proposal

## Why

The two helper agents are named and written for one caller. `opsx-task-applier` and `opsx-test-runner` carry "opsx" in their names and talk about `UC-<slice>.md`, `Satisfies:` rows and `/jois-code:apply`, yet two workflows need them: `/jois-code:apply` (slices) and `/opsx:apply` (OpenSpec changes). Today `/opsx:apply` never reaches them, because the toolkit may not edit that generated command, so it implements tasks in the main session.

`/opsx:apply` also asks for permission before each commit. The commit rule lets a flow that applies a plan's tasks commit without the word, but only on a branch other than `main` or `master` and when its checks pass. The guidance line `/jois-init:opsx` writes states neither condition, and the tests run only once, in the last group, so a session sees checks that have not run and falls back to "never commit on your own".

## What Changes

- Rename `opsx-task-applier` to `task-applier` and `opsx-test-runner` to `test-runner`, in the agent files, the installer text, the commands, the wiki, the tests and the live specs.
- Make both agents agnostic to the caller. Their text stops mentioning slices, `UC-<slice>.md`, `AC-` rows and `/jois-code:apply`. The caller's brief says what to read, what each task satisfies and how to verify it, and the agent reports against that.
- Keep `/jois-code:apply` working as it does now, under the new names.
- Extend the guidance block that `/jois-init:opsx` writes under `operations.apply.guidance`: hand each group of tasks to `task-applier`, hand the test task to `test-runner`, and commit each finished concern without asking, stating the conditions in full (a branch other than `main` or `master`, the group's checks passing, the test task the only check that gates a commit, never a push).
- Keep the models and limits: `task-applier` on `sonnet` with 50 turns, `test-runner` on `haiku`. Bump both versions.
- The installer deletes nothing. The docs tell a user who has the old `opsx-*` agent files installed to remove them by hand.
- **BREAKING**: the agent names change. A machine with the old files keeps working only until `jois-code:apply` is updated, and then needs `Install-Toolkit.ps1 -Agent task-applier.md` and `-Agent test-runner.md`.

The guidance reaches `/opsx:apply` only as advice, so a session can still ignore it. If it does, a later change adds a change form of `/jois-code:apply`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-skills`: the requirements about the task agent, the test runner agent, the apply command's agent checks, dispatch, judging and review, and the agent file examples use the new names; the task agent requirement is generalized to a group of tasks of any plan; the apply requirements that still describe the old change-name form (the command, reading the slice, announcing and briefing, and the review step) are rewritten for the slice-only command; a new requirement says the apply guidance hands groups to the agents and states the auto-commit conditions.
- `toolkit-subagent-model`: the pin requirement names `task-applier` and `test-runner`.

## Impact

- `toolkit/agents/opsx-task-applier.md` and `opsx-test-runner.md` become `task-applier.md` and `test-runner.md`, with hook messages, wording and versions updated.
- `toolkit/commands/jois-code/apply.md`, `validate.md` and `review.md` (names and the agent checks), `toolkit/commands/jois-init/opsx.md` (the guidance block), `toolkit/install/Install-Toolkit.ps1` (help text and comments), `toolkit/README.md`.
- `openspec/config.yaml` of this repository, whose managed guidance block is rewritten by `/jois-init:opsx`.
- `wiki/toolkit/` pages: Toolkit-Guide, Task-Agent, Task-Recipes, Install, Command-Details.
- Tests: `toolkit/tests/test_task_applier.py`, `test_validate_command.py` and any check that lists agent names.
- Archived changes keep the old names.
