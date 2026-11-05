# Proposal

## Why

`/jois-code:apply` ends its turn and waits for the user whenever a group's tests are red. Often the cause is a task in a later group: group 1 changes an interface and group 2 updates its callers. Nothing in the current group can fix that, so the stop only makes the user type "go on" before the work can continue.

## What Changes

- When a group's tests fail and every failure is traced to a task that is still pending in a later group, the command does not commit and does not stop. It takes the next group.
- After each later group the command reruns the tests. When every command exits 0, it commits everything held back, cut into commits by concern as the `jois-git-commit-hygiene` rule says.
- A failure counts as deferrable only when its `Failures` entry names the pending task that fixes it. "A later group will fix it" without a task is not enough.
- After the last group nothing is left to defer to. A red result then runs the fix loop over the whole change and, if still unexplained, asks the user as today.
- The other stop conditions are unchanged: protected branch, missing test runner, no test command, foreign changes, a hook or commit failure.

## Capabilities

### New Capabilities

### Modified Capabilities
- `toolkit-skills`: the `jois-code:apply` requirements that say failing tests stop for the confirmation word now allow deferring the commit when a pending task fixes the failure, and add the rule for committing the held-back groups once the tests are green.

## Impact

- `toolkit/commands/jois-code/apply.md`: steps 9, 10 and 11, plus the version and date in the front matter.
- `openspec/specs/toolkit-skills/spec.md`: updated at archive from the delta in this change.
- `toolkit/README.md`: the "Fixing failures" section of the apply documentation.
- `toolkit/tests/test_task_applier.py`: a check that the command text names the deferral rules.
- `opsx-task-applier` and the `jois-git-commit-hygiene` rule are unchanged. The agent's `Failures` part already carries the cause and whether it is fixed.
