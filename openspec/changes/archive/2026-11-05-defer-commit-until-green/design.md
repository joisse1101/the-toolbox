# Design

## Context

`toolkit/commands/jois-code/apply.md` already runs a fix loop (step 9) and a commit step (step 10). The fix loop works only inside the current group, and step 10 falls back to the confirmation word whenever a test command is red. A failure that a later group is meant to fix therefore ends the turn. The motivation is in the proposal.

The change edits the command's text only. The agents, the hooks and the `jois-git-commit-hygiene` rule stay as they are.

## Decisions

### Defer the commit, not the tests

The command still dispatches `opsx-test-runner` after every group. A red result no longer stops the command when each failure is deferrable. The reason to keep running the tests is that the rerun is how the command learns the tests are green and the held-back commit can happen.

### What makes a failure deferrable

The applier's `Failures` part already gives the command, the exact output line, the cause and whether it is fixed. A failure is deferrable when it also names a pending task of a later group as the fix, and that task is still unticked in `tasks.md`. The command checks this itself against `tasks.md`, so the applier's word alone is not enough. Without a named task the failure is not deferrable and the fix loop runs as today. This keeps "a later group will fix it" from becoming a way to skip red tests.

### Commits stay by concern

Held-back groups are committed with the existing split step: one commit per concern over the combined files, using the one-concern list of `jois-git-commit-hygiene`. The command does not try to recreate one commit per group, because groups often touch the same file and `git add -p` does not work here. A file that two concerns share is already a fallback case in step 10, so that rule is unchanged.

### No separate limit on deferring

The only limit is the last group. Each deferral must name a pending task, so the number of deferrals is bounded by the tasks left. After the last group a red result runs the fix loop over the whole change and then asks the user, as the current command does.

### Unchanged stop conditions

A protected branch, a missing test runner, no test command, a suite that could not run, foreign changes, a rejected hook and a failed commit still stop the command. Only a red exit code with a named pending fix changes behavior.

## Risks

- A wrong deferral lets work pile up uncommitted over several groups. Mitigation: the named pending task is checked against `tasks.md`, and the command says which task it waits for.
- Later groups run on top of a red tree, so a new failure can hide behind the expected one. Mitigation: the rerun compares each failure's command and output line, and a failure that is not named by a pending task is not deferrable.
- If the session ends while commits are held back, the files stay in the working tree. `tasks.md` is ticked, so a re-run resumes at the pending tasks and commits when the tests are green.

## Open Questions

None.
